/**
 * PiiranhaLoader — ONNX inference loader for iiiorg/piiranha-v1-detect-personal-information
 * (via onnx-community/piiranha-v1-detect-personal-information-ONNX)
 *
 * Differences from CustomNERLoader (BERT/WordPiece):
 *  - Tokenizer: mDeBERTa-v3 uses SentencePiece BPE with ▁ (U+2581) word markers
 *  - Labels: only I- prefix (no B-), 17 entity types
 *  - ONNX inputs: may not include token_type_ids (DeBERTa-v3 doesn't use them)
 *  - Normalization: no ALL-CAPS→Title conversion (mDeBERTa handles cased text natively)
 */

class PiiranhaLoader extends CustomNERLoader {

  // ── Tokenizer loading ───────────────────────────────────────────────────────

  async loadTokenizer(modelPath) {
    const [tokenizerData, tokenizerConfig] = await Promise.all([
      fetch(`${modelPath}/tokenizer.json`).then(r => r.json()),
      fetch(`${modelPath}/tokenizer_config.json`).then(r => r.json()),
    ]);
    this._initSPMTokenizer(tokenizerData, tokenizerConfig);
    console.log('[Piiranha] Tokenizer loaded, vocab size:', Object.keys(this.tokenizer.vocab).length);
  }

  async loadFromData(data) {
    this.config = data.config;
    this.id2label = data.config.id2label;
    this._initSPMTokenizer(data.tokenizerData, data.tokenizerConfig);
    this.session = await window.ort.InferenceSession.create(data.modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    this._hasTokenTypeIds = this.session.inputNames.includes('token_type_ids');
    console.log('[Piiranha] Loaded from DB. inputNames:', this.session.inputNames);
  }

  /**
   * Build internal tokenizer state from HuggingFace tokenizer.json (fast tokenizer format).
   * Handles both BPE {token→id} and Unigram [[token, score], ...] vocab formats.
   */
  _initSPMTokenizer(tokenizerData, tokenizerConfig) {
    // Build vocab map
    let vocab = {};
    const modelVocab = tokenizerData.model?.vocab;

    if (Array.isArray(modelVocab)) {
      // Unigram: [[token, score], ...] — id is index
      modelVocab.forEach(([token], id) => { vocab[token] = id; });
    } else if (modelVocab && typeof modelVocab === 'object') {
      // BPE: {token: id}
      vocab = { ...modelVocab };
    }

    // Overlay added_tokens (special tokens with explicit fixed IDs)
    for (const t of (tokenizerData.added_tokens || [])) {
      vocab[t.content] = t.id;
    }

    // Build reverse lookup
    const id2token = {};
    for (const [tok, id] of Object.entries(vocab)) id2token[id] = tok;

    this.tokenizer = {
      vocab,
      id2token,
      clsToken: tokenizerConfig.cls_token || '[CLS]',
      sepToken: tokenizerConfig.sep_token || '[SEP]',
      padToken: tokenizerConfig.pad_token || '[PAD]',
      unkToken: tokenizerConfig.unk_token || '[UNK]',
    };
  }

  // ── ONNX model loading ──────────────────────────────────────────────────────

  async loadONNXModel(modelPath) {
    const modelUrl = `${modelPath}/onnx/model_quantized.onnx`;
    console.log('[Piiranha] Loading ONNX model from:', modelUrl);

    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ONNX model from ${modelUrl}: ${response.status}`);
    }

    const modelBuffer = await response.arrayBuffer();
    this.session = await window.ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    // DeBERTa-v3 may not have token_type_ids as an input
    this._hasTokenTypeIds = this.session.inputNames.includes('token_type_ids');
    console.log('[Piiranha] ONNX model loaded. inputNames:', this.session.inputNames,
      'hasTokenTypeIds:', this._hasTokenTypeIds);
  }

  // ── Tokenization ────────────────────────────────────────────────────────────

  /**
   * Do NOT normalize text for piiranha — mDeBERTa-v3 handles mixed case natively.
   * (BERT-base-NER needed ALL_CAPS→Title normalization, piiranha does not.)
   */
  normalizeText(text) {
    return text;
  }

  /**
   * SentencePiece-style tokenization using ▁ (U+2581) as word-boundary marker.
   * Greedy longest-match against the BPE vocab; falls back to [UNK] per character.
   */
  tokenize(text) {
    const { vocab, clsToken, sepToken, unkToken } = this.tokenizer;
    const getOrUnk = (tok) => vocab[tok] !== undefined ? vocab[tok] : (vocab[unkToken] ?? 1);

    const tokens = [];
    const tokenIds = [];
    const wordIds = [];

    // [CLS]
    tokens.push(clsToken);
    tokenIds.push(getOrUnk(clsToken));
    wordIds.push(null);

    // Split on whitespace — keep punctuation attached (SentencePiece handles it)
    const words = text.match(/\S+/g) || [];

    for (let wi = 0; wi < words.length; wi++) {
      // Prepend ▁ to the first piece of each word (Metaspace convention)
      const prefixed = '\u2581' + words[wi];
      const subTokens = this._greedyTokenize(prefixed, vocab, unkToken);

      for (const tok of subTokens) {
        tokens.push(tok);
        tokenIds.push(getOrUnk(tok));
        wordIds.push(wi);
      }
    }

    // [SEP]
    tokens.push(sepToken);
    tokenIds.push(getOrUnk(sepToken));
    wordIds.push(null);

    return { tokens, input_ids: tokenIds, word_ids: wordIds };
  }

  /**
   * Greedy longest-match tokenization in the BPE vocabulary.
   * For SentencePiece vocab, subword continuations have no ▁ prefix.
   */
  _greedyTokenize(text, vocab, unkToken) {
    const MAX_PIECE = 32;
    const subTokens = [];
    let pos = 0;

    while (pos < text.length) {
      const maxEnd = Math.min(pos + MAX_PIECE, text.length);
      let matchEnd = -1;

      for (let end = maxEnd; end > pos; end--) {
        if (vocab[text.slice(pos, end)] !== undefined) {
          matchEnd = end;
          break;
        }
      }

      if (matchEnd !== -1) {
        subTokens.push(text.slice(pos, matchEnd));
        pos = matchEnd;
      } else {
        subTokens.push(unkToken);
        pos++;
      }
    }

    return subTokens;
  }

  // ── Inference ───────────────────────────────────────────────────────────────

  /**
   * Build ONNX feed dict — conditionally omit token_type_ids for DeBERTa-v3.
   */
  _buildFeeds(inputIds, attentionMask) {
    const toTensor = (arr) =>
      new window.ort.Tensor('int64', BigInt64Array.from(arr.map(v => BigInt(v))), [1, arr.length]);

    const feeds = {
      input_ids: toTensor(inputIds),
      attention_mask: toTensor(attentionMask),
    };

    if (this._hasTokenTypeIds) {
      feeds.token_type_ids = toTensor(new Array(inputIds.length).fill(0));
    }

    return feeds;
  }

  async predictSingleChunk(originalText, normalizedText, tokenized, progressCallback = null) {
    const inputIds = tokenized.input_ids;
    const attentionMask = new Array(inputIds.length).fill(1);
    const feeds = this._buildFeeds(inputIds, attentionMask);

    if (progressCallback) progressCallback('Running inference... (50%)');
    const results = await this.session.run(feeds);
    if (progressCallback) progressCallback('Processing complete (100%)');

    return this.postProcess(originalText, tokenized, results.logits);
  }

  async processChunk(originalText, normalizedText, fullTokenized, chunk) {
    const { startTokenIdx, endTokenIdx } = chunk;

    const chunkInputIds = fullTokenized.input_ids.slice(startTokenIdx, endTokenIdx);
    const chunkTokens   = fullTokenized.tokens.slice(startTokenIdx, endTokenIdx);
    const chunkWordIds  = fullTokenized.word_ids.slice(startTokenIdx, endTokenIdx);

    const { vocab, clsToken, sepToken } = this.tokenizer;
    const clsId = vocab[clsToken] ?? 2;
    const sepId = vocab[sepToken] ?? 3;

    chunkInputIds.unshift(clsId);   chunkTokens.unshift(clsToken);   chunkWordIds.unshift(null);
    chunkInputIds.push(sepId);      chunkTokens.push(sepToken);       chunkWordIds.push(null);

    const attentionMask = new Array(chunkInputIds.length).fill(1);
    const feeds = this._buildFeeds(chunkInputIds, attentionMask);

    const results = await this.session.run(feeds);

    return this.postProcess(originalText,
      { tokens: chunkTokens, input_ids: chunkInputIds, word_ids: chunkWordIds },
      results.logits);
  }
}

window.PiiranhaLoader = PiiranhaLoader;
