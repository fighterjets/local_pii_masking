/**
 * QwenClassifier — Qwen2.5-0.5B-Instruct PII validation via ONNX Runtime
 *
 * After BERT NER detects entity spans, this classifier runs a single causal-LM
 * forward pass on each span + its document context and compares the YES vs NO
 * logits at the next-token position to decide whether the detection is genuine PII.
 *
 * Runs entirely in the main thread (no Web Workers) to comply with
 * Chrome Extension Manifest V3 CSP: script-src 'self' 'wasm-unsafe-eval'.
 */

// ============================================================================
// GPT-2 byte-level BPE tokenizer
// ============================================================================

/**
 * Minimal GPT-2-style byte-level BPE tokenizer.
 * Reads vocab and merges from tokenizer.json (standard HuggingFace format).
 * Supports Qwen's ChatML special tokens (<|im_start|>, <|im_end|>).
 */
class QwenBPETokenizer {
  constructor(tokenizerData) {
    const model = tokenizerData.model;

    // token_str → id  (the core BPE vocabulary)
    this.vocab = model.vocab ?? {};

    // BPE merge priority: "a b" → rank (lower rank = applied first)
    this.mergeRanks = new Map();
    (model.merges ?? []).forEach((merge, rank) => {
      this.mergeRanks.set(merge, rank);
    });

    // Special tokens (ChatML format)
    const added = tokenizerData.added_tokens ?? [];
    const specials = new Map(added.map(t => [t.content, t.id]));
    this.imStart = specials.get('<|im_start|>') ?? 151644;
    this.imEnd   = specials.get('<|im_end|>')   ?? 151645;

    // GPT-2 byte → unicode char bijection
    this.byteEncoder = this._buildByteEncoder();
  }

  /** Build the GPT-2 mapping: byte value → a unique unicode codepoint. */
  _buildByteEncoder() {
    // Bytes with direct codepoint representations: printable ASCII + latin-1 subset
    const bs = [];
    for (let i = 0x21; i <= 0x7e; i++) bs.push(i); // ! … ~
    for (let i = 0xa1; i <= 0xac; i++) bs.push(i); // ¡ … ¬
    for (let i = 0xae; i <= 0xff; i++) bs.push(i); // ® … ÿ
    const cs = bs.slice();

    // Remaining bytes get overflow codepoints starting at 256
    let n = 0;
    for (let b = 0; b < 256; b++) {
      if (!bs.includes(b)) { bs.push(b); cs.push(256 + n++); }
    }

    const map = new Map();
    for (let i = 0; i < bs.length; i++) {
      map.set(bs[i], String.fromCodePoint(cs[i]));
    }
    return map;
  }

  /** Convert a UTF-8 text string to an array of byte-encoded symbol characters. */
  _textToSymbols(text) {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes, b => this.byteEncoder.get(b) ?? '');
  }

  /**
   * Apply BPE merges to a symbol array, from highest priority (lowest rank)
   * to lowest, until no more merges apply.
   */
  _bpeMerge(symbols) {
    let tokens = symbols.slice();
    while (tokens.length > 1) {
      let bestRank = Infinity;
      let bestI = -1;
      for (let i = 0; i < tokens.length - 1; i++) {
        const rank = this.mergeRanks.get(`${tokens[i]} ${tokens[i + 1]}`);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestI = i;
        }
      }
      if (bestI === -1) break;
      // Merge pair at bestI
      tokens.splice(bestI, 2, tokens[bestI] + tokens[bestI + 1]);
    }
    return tokens;
  }

  /**
   * Encode plain text (no special tokens) → array of token IDs.
   * Uses Qwen's pre-tokeniser split pattern (Unicode-aware).
   */
  encode(text) {
    if (!text) return [];

    // Qwen / GPT-2 pre-tokenisation: split on word/number/punctuation boundaries
    const RE = /[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
    const words = text.match(RE) ?? [text];

    const ids = [];
    for (const word of words) {
      const symbols = this._textToSymbols(word);
      const merged  = this._bpeMerge(symbols);
      for (const tok of merged) {
        const id = this.vocab[tok];
        if (id !== undefined) ids.push(id);
        // Unknown byte sequences are skipped (rare with byte-level BPE)
      }
    }
    return ids;
  }

  /**
   * Encode a prompt that contains <|im_start|> and <|im_end|> delimiters.
   * Splits on those tokens, encodes plain segments normally.
   */
  encodeWithSpecial(text) {
    const DELIM_RE = /(<\|im_start\|>|<\|im_end\|>)/g;
    const parts = text.split(DELIM_RE);
    const ids = [];
    for (const part of parts) {
      if      (part === '<|im_start|>') ids.push(this.imStart);
      else if (part === '<|im_end|>')   ids.push(this.imEnd);
      else if (part)                    ids.push(...this.encode(part));
    }
    return ids;
  }

  /**
   * Return the first token ID produced by encoding a surface-form string.
   * Used to collect YES / NO candidate token IDs.
   */
  tokenId(str) {
    const ids = this.encode(str);
    return ids.length > 0 ? ids[0] : null;
  }

  /**
   * Decode an array of token IDs back to a UTF-8 string.
   * Reverses the byte-level BPE encoding applied by encode().
   */
  decode(tokenIds) {
    if (!this._idToToken) {
      this._idToToken = new Map(
        Object.entries(this.vocab).map(([tok, id]) => [id, tok])
      );
      this._byteDecoder = new Map(
        [...this.byteEncoder.entries()].map(([b, c]) => [c, b])
      );
    }
    const tokenStr = tokenIds
      .map(id => this._idToToken.get(id) ?? '')
      .join('');
    const bytes = new Uint8Array(
      [...tokenStr].map(c => this._byteDecoder.get(c) ?? 0x3f)
    );
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

// ============================================================================
// ONNX-based classifier
// ============================================================================

/**
 * Qwen2.5-0.5B-Instruct secondary PII classifier.
 *
 * Call `loadFromData()` once after model files are retrieved from IndexedDB,
 * then call `classify()` for each NER detection to confirm or discard it.
 */
class QwenClassifier {
  constructor() {
    this.session    = null;
    this.tokenizer  = null;
    this.yesIds     = []; // candidate token IDs for affirmative answers
    this.noIds      = []; // candidate token IDs for negative answers
    // KV-cache dimensions (populated from config.json in loadFromData)
    this.numLayers  = 28;  // Qwen2.5-1.5B default
    this.numKVHeads = 2;   // num_key_value_heads
    this.headDim    = 128; // hidden_size(1536) / num_attention_heads(12)
    this.loaded     = false;
  }

  /**
   * Initialise the tokenizer and ONNX InferenceSession.
   *
   * @param {object}      param0
   * @param {object}      param0.tokenizerData  Parsed tokenizer.json
   * @param {ArrayBuffer} param0.modelBuffer    Qwen2.5 ONNX model bytes
   * @param {object}      [param0.modelConfig]  Parsed config.json (for KV dims)
   */
  async loadFromData({ tokenizerData, modelBuffer, modelConfig }) {
    // --- Derive KV cache dimensions from model config ---
    if (modelConfig) {
      this.numLayers  = modelConfig.num_hidden_layers ?? this.numLayers;
      this.numKVHeads = modelConfig.num_key_value_heads ?? this.numKVHeads;
      this.headDim    = modelConfig.head_dim
        ?? Math.floor((modelConfig.hidden_size ?? 1536) / (modelConfig.num_attention_heads ?? 12));
    }

    // --- Build tokenizer ---
    this.tokenizer = new QwenBPETokenizer(tokenizerData);

    // Collect YES / NO token IDs from multiple surface forms
    // (with/without leading space — model may generate either at the start of a turn)
    for (const s of ['YES', ' YES', 'Yes', ' Yes']) {
      const id = this.tokenizer.tokenId(s);
      if (id != null && !this.yesIds.includes(id)) this.yesIds.push(id);
    }
    for (const s of ['NO', ' NO', 'No', ' No']) {
      const id = this.tokenizer.tokenId(s);
      if (id != null && !this.noIds.includes(id)) this.noIds.push(id);
    }

    // --- Create ONNX session: WebGPU only ---
    // Qwen2.5-1.5B is too large (~400 MB+ quantized) to run in ORT WASM inside a
    // Chrome extension popup — the WASM heap cannot grow large enough and aborts.
    // WebGPU is the only viable execution path.
    //
    // preferredOutputLocation:'cpu' ensures logits come back as a Float32Array
    // rather than staying on the GPU buffer where JS can't read them.
    this.usingWebGPU = false;

    // Step 1: Confirm a GPU adapter is actually reachable from this context.
    // Chrome extension popup pages have stricter sandbox constraints than normal
    // web pages — navigator.gpu may exist but requestAdapter() can still return
    // null.  Test with 'high-performance' so dual-GPU machines (e.g. MacBooks
    // with Intel IGP + discrete GPU) use the capable GPU.
    let adapter = null;
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      try {
        adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) {
          // Try again without preference (single-GPU machines)
          adapter = await navigator.gpu.requestAdapter();
        }
        console.log('[Qwen] GPU adapter:', adapter
          ? `found — vendor: ${adapter.info?.vendor ?? 'unknown'}`
          : 'requestAdapter() returned null');
      } catch (adapterErr) {
        console.warn('[Qwen] requestAdapter() threw:', adapterErr.message);
      }
    } else {
      console.warn('[Qwen] navigator.gpu not available in this context.');
    }

    if (adapter) {
      // Step 2: Check shader-f16 feature (needed for model_q4f16.onnx FP16 activations).
      // ORT's JSEP backend may request this as a required device feature; if the
      // adapter doesn't expose it, requestDevice() rejects → JSEP aborts immediately.
      const hasF16 = adapter.features.has('shader-f16');
      console.log('[Qwen] shader-f16:', hasF16 ? 'supported' : 'NOT supported');
      console.log('[Qwen] Adapter features:', [...adapter.features].join(', '));

      // Step 3: Verify the GPU device can actually be created before handing off to ORT.
      let device = null;
      try {
        device = await adapter.requestDevice(
          hasF16 ? { requiredFeatures: ['shader-f16'] } : {}
        );
        console.log('[Qwen] GPU device created OK — limits maxBufferSize:', device.limits.maxBufferSize);
        device.lost.then(info => console.warn('[Qwen] GPU device lost:', info.reason, info.message));
      } catch (deviceErr) {
        console.warn('[Qwen] requestDevice() failed:', deviceErr.message);
      }

      if (device) {
        // Release our test device — ORT will create its own internally.
        device.destroy();

        // Use a Blob URL instead of the raw ArrayBuffer so ORT can stream the
        // model directly without first copying 900 MB into the WASM heap.
        const blob    = new Blob([modelBuffer], { type: 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(blob);

        try {
          // graphOptimizationLevel: 'disabled' — ORT's 'all' level creates large
          // intermediate fused tensors during optimisation; on Apple Silicon the
          // Metal WebGPU limit is 256 MB per buffer, which those tensors exceed.
          // Disabling optimisation keeps every tensor within the 256 MB limit.
          this.session = await window.ort.InferenceSession.create(blobUrl, {
            executionProviders: [
              { name: 'webgpu', preferredOutputLocation: 'cpu' },
            ],
            graphOptimizationLevel: 'disabled',
            enableCpuMemArena: false,
          });
          this.usingWebGPU = true;
          console.log('[Qwen] ✅ WebGPU session created — GPU inference active.');
        } catch (gpuErr) {
          console.warn('[Qwen] WebGPU session failed:', gpuErr.message);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      } else {
        console.warn('[Qwen] Skipping ORT session — device creation failed.');
      }
    }

    if (!this.session) {
      // WASM fallback is intentionally not attempted — it crashes for models this
      // size.  Throw so loadQwenClassifier() can show a clear status.
      const reason = !adapter
        ? 'GPU adapter not available in the extension popup context. ' +
          'Try opening the extension in a tab (chrome-extension://[id]/popup.html) or check chrome://gpu.'
        : 'WebGPU session creation failed despite adapter being present. Check chrome://gpu for driver issues.';
      throw new Error('Qwen requires WebGPU: ' + reason);
    }

    this.loaded = true;
    console.log(
      '[Qwen] ✅ Loaded.  EP:', this.usingWebGPU ? 'WebGPU' : 'WASM',
      '  YES ids:', this.yesIds, '  NO ids:', this.noIds,
      '  layers:', this.numLayers, '  KV heads:', this.numKVHeads, '  head dim:', this.headDim
    );
    console.log('[Qwen] Model inputs:', this.session.inputNames);
  }

  /**
   * Ask the model whether a detected entity is genuine PII.
   *
   * Builds a ChatML prompt, runs one forward pass, and compares the
   * YES vs NO logit at the last (next-token) position.
   *
   * @param {string}  entityValue   The detected text (e.g. "John Smith")
   * @param {string}  entityType    Detected PII type (e.g. "PERSON", "ORGANIZATION")
   * @param {string}  contextText   Surrounding document text
   * @returns {Promise<boolean>}    true = keep detection, false = discard
   */
  async classify(entityValue, entityType, contextText, confidence = null) {
    if (!this.loaded) return true; // fail-open if model is not ready

    // Context arrives pre-windowed (prev sentence + entity sentence + next sentence)
    // with the entity bracketed as <<<value>>>.
    const ctx = contextText.replace(/\s+/g, ' ').trim();

    // Type-specific hints steer the model toward the most common false-positive
    // patterns for each entity class.
    const TYPE_HINTS = {
      PERSON:        'Watch for false positives: job titles, role names, public figures.',
      ORGANIZATION:  'Watch for false positives: department names, team names, generic org references.',
      LOCATION:      'Watch for false positives: city/country names, building names, general places.',
      DATE_OF_BIRTH: 'Watch for false positives: generic dates, publication dates, event dates.',
      DATE:          'Watch for false positives: generic dates, publication dates, event dates.',
    };
    const hint = TYPE_HINTS[entityType] ?? '';

    // NER confidence label — helps the model calibrate how uncertain the detection is.
    let confLine = '';
    if (confidence !== null && confidence !== undefined) {
      const pct   = Math.round(confidence * 100);
      const level = confidence < 0.65 ? 'LOW' : 'MEDIUM';
      confLine = `NER confidence: ${level} (${pct}%)\n`;
    }

    const prompt =
      `<|im_start|>system\n` +
      `PII classifier. The entity marked <<<like this>>> was flagged by a neural NER model with uncertain confidence. ` +
      `Determine if it is genuine personal information that should be redacted. Reply YES or NO only.\n<|im_end|>\n` +
      `<|im_start|>user\n` +
      `Excerpt:\n"""\n${ctx}\n"""\n` +
      `Entity type: ${entityType}\n` +
      confLine +
      (hint ? `${hint}\n` : '') +
      `Is <<<${entityValue}>>> genuine PII to redact?\n<|im_end|>\n` +
      `<|im_start|>assistant\n`;

    const inputIds = this.tokenizer.encodeWithSpecial(prompt);
    const seqLen   = inputIds.length;

    // Helper: build an int64 ORT tensor
    const int64Tensor = (vals, dims) =>
      new window.ort.Tensor('int64', BigInt64Array.from(vals.map(BigInt)), dims);

    const feeds = {
      input_ids:      int64Tensor(inputIds,                          [1, seqLen]),
      attention_mask: int64Tensor(new Array(seqLen).fill(1),         [1, seqLen]),
    };

    // Provide position_ids if the exported model includes that input
    if (this.session.inputNames.includes('position_ids')) {
      feeds.position_ids = int64Tensor(
        Array.from({ length: seqLen }, (_, i) => i), [1, seqLen]
      );
    }

    // Supply empty past KV cache for all past_key_values.N.{key,value} inputs.
    // Shape [1, numKVHeads, 0, headDim] means "no prior context" (first forward pass).
    const kvShape = [1, this.numKVHeads, 0, this.headDim];
    for (const name of this.session.inputNames) {
      if (name.startsWith('past_key_values.')) {
        feeds[name] = new window.ort.Tensor('float32', new Float32Array(0), kvShape);
      }
    }

    let output;
    try {
      output = await this.session.run(feeds);
    } catch (err) {
      console.warn('[Qwen] Inference error, failing open:', err.message);
      return true;
    }

    // logits shape: [1, seqLen, vocabSize]
    const logits    = output.logits.data;   // Float32Array
    const vocabSize = output.logits.dims[2];
    const lastBase  = (seqLen - 1) * vocabSize; // offset of last-token slice

    const maxLogit = ids =>
      ids.reduce((best, id) => Math.max(best, logits[lastBase + id] ?? -Infinity), -Infinity);

    const yesScore = maxLogit(this.yesIds);
    const noScore  = maxLogit(this.noIds);
    const margin   = yesScore - noScore;

    // The model has a systematic YES bias — bare majority (margin > 0) is not
    // enough signal. Require a minimum logit margin so only genuinely confident
    // YES predictions are treated as PII.
    // margin=1.5 ≈ P(YES)=82%;  margin=0.5 ≈ P(YES)=62% (near random).
    const MARGIN_THRESHOLD = 1.5;
    const keep = margin >= MARGIN_THRESHOLD;

    // Log as probability (sigmoid of margin) — far more readable than raw logits.
    const pYes = Math.exp(margin) / (1 + Math.exp(margin));
    console.log(
      `[Qwen] "${entityValue}" (${entityType}): ` +
      `P(YES)=${(pYes * 100).toFixed(1)}%  margin=${margin.toFixed(3)} → ${keep ? 'KEEP' : 'DISCARD'}`
    );
    return keep;
  }

  /**
   * Autoregressive text generation using the Qwen causal LM.
   *
   * Uses greedy decoding with KV-cache reuse across steps.
   * Returns '' if the model does not expose present.* KV outputs (graceful degradation).
   *
   * @param {string} prompt         Full ChatML-formatted prompt
   * @param {number} [maxNewTokens] Maximum tokens to generate (default 80)
   * @returns {Promise<string>}     Generated text (not including the prompt)
   */
  async generate(prompt, maxNewTokens = 80) {
    if (!this.loaded) return '';

    const int64T = (vals, dims) =>
      new window.ort.Tensor('int64', BigInt64Array.from(vals.map(BigInt)), dims);

    const promptIds = Array.from(this.tokenizer.encodeWithSpecial(prompt));
    let allIds      = promptIds.slice();   // grows with each generated token
    const generated = [];
    let pastKV      = null;                // null → first pass (empty cache)

    for (let step = 0; step <= maxNewTokens; step++) {
      const isFirst = step === 0;
      const stepIds = isFirst ? allIds : [allIds[allIds.length - 1]]; // full vs. 1 token
      const seqLen  = stepIds.length;
      const fullLen = allIds.length;

      const feeds = {
        input_ids:      int64T(stepIds,                              [1, seqLen]),
        attention_mask: int64T(new Array(fullLen).fill(1),           [1, fullLen]),
      };
      if (this.session.inputNames.includes('position_ids')) {
        feeds.position_ids = int64T(
          Array.from({ length: seqLen }, (_, i) => fullLen - seqLen + i), [1, seqLen]
        );
      }
      for (const name of this.session.inputNames) {
        if (!name.startsWith('past_key_values.')) continue;
        feeds[name] = (isFirst || !pastKV)
          ? new window.ort.Tensor('float32', new Float32Array(0), [1, this.numKVHeads, 0, this.headDim])
          : pastKV[name];
      }

      let output;
      try { output = await this.session.run(feeds); }
      catch (e) { console.warn('[Qwen:generate] inference error:', e.message); break; }

      // First pass: verify KV outputs exist
      if (isFirst && !Object.keys(output).some(k => k.startsWith('present.'))) {
        console.warn('[Qwen:generate] Model has no present.* KV outputs — generation not supported');
        return '';
      }

      // Greedy argmax at last position
      const logits  = output.logits.data;
      const vSize   = output.logits.dims[2];
      const base    = (seqLen - 1) * vSize;
      let nextId = 0, nextVal = -Infinity;
      for (let i = 0; i < vSize; i++) {
        if (logits[base + i] > nextVal) { nextVal = logits[base + i]; nextId = i; }
      }

      if (nextId === this.tokenizer.imEnd) break;
      generated.push(nextId);
      allIds.push(nextId);

      // Carry forward KV cache (rename present.* → past_key_values.*)
      pastKV = {};
      for (const [k, v] of Object.entries(output)) {
        if (k.startsWith('present.'))
          pastKV[k.replace('present.', 'past_key_values.')] = v;
      }
    }

    return this.tokenizer.decode(generated);
  }
}

// Export as window globals (same pattern as custom-ner-loader.js)
window.QwenClassifier    = QwenClassifier;
window.QwenBPETokenizer  = QwenBPETokenizer;
