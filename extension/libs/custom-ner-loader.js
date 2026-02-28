/**
 * Custom NER Model Loader for Browser Extensions
 * Loads pre-bundled DistilBERT NER model from local files
 * Bypasses Transformers.js to avoid chrome-extension:// URL issues
 */

class CustomNERLoader {
  constructor() {
    this.tokenizer = null;
    this.session = null;
    this.config = null;
    this.id2label = null;
  }

  /**
   * Load all model files and initialize
   */
  async load(modelPath) {
    console.log('[CustomNER] Loading model from:', modelPath);

    // Load configuration files
    await this.loadConfig(modelPath);
    await this.loadTokenizer(modelPath);
    await this.loadONNXModel(modelPath);

    console.log('[CustomNER] Model loaded successfully');
  }

  /**
   * Load model from pre-fetched data (e.g. from IndexedDB cache).
   * Accepts the same structure returned by loadModelFromDB() in popup.js.
   * @param {{ config: object, tokenizerData: object, tokenizerConfig: object, modelBuffer: ArrayBuffer }} data
   */
  async loadFromData(data) {
    this.config = data.config;
    this.id2label = data.config.id2label;

    this.tokenizer = {
      vocab: data.tokenizerData.model.vocab,
      unk_token_id: data.tokenizerConfig.unk_token || '[UNK]',
      cls_token_id: data.tokenizerConfig.cls_token || '[CLS]',
      sep_token_id: data.tokenizerConfig.sep_token || '[SEP]',
      pad_token_id: data.tokenizerConfig.pad_token || '[PAD]',
      wordpiece_prefix: data.tokenizerConfig.wordpiece_prefix || '##',
    };

    this.tokenizer.id2token = {};
    for (const [token, id] of Object.entries(this.tokenizer.vocab)) {
      this.tokenizer.id2token[id] = token;
    }

    this.session = await window.ort.InferenceSession.create(data.modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    console.log('[CustomNER] Model loaded from cached data');
  }

  /**
   * Load model configuration
   */
  async loadConfig(modelPath) {
    const configUrl = `${modelPath}/config.json`;
    console.log('[CustomNER] Fetching config from:', configUrl);

    const response = await fetch(configUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomNER] Config fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        url: configUrl,
        responseText: errorText.substring(0, 200)
      });
      throw new Error(`Failed to load config from ${configUrl}: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const text = await response.text();
    console.log('[CustomNER] Config response (first 100 chars):', text.substring(0, 100));

    try {
      this.config = JSON.parse(text);
    } catch (e) {
      console.error('[CustomNER] JSON parse error:', e);
      console.error('[CustomNER] Response text:', text.substring(0, 500));
      throw new Error(`Failed to parse config.json: ${e.message}`);
    }

    this.id2label = this.config.id2label;

    console.log('[CustomNER] Config loaded:', {
      model_type: this.config.model_type,
      num_labels: Object.keys(this.id2label).length
    });
  }

  /**
   * Load and initialize tokenizer
   */
  async loadTokenizer(modelPath) {
    // Load tokenizer.json
    const tokenizerUrl = `${modelPath}/tokenizer.json`;
    const response = await fetch(tokenizerUrl);

    if (!response.ok) {
      throw new Error(`Failed to load tokenizer from ${tokenizerUrl}`);
    }

    const tokenizerData = await response.json();

    // Load tokenizer config
    const configUrl = `${modelPath}/tokenizer_config.json`;
    const configResponse = await fetch(configUrl);
    const tokenizerConfig = await configResponse.json();

    // Build simple tokenizer
    this.tokenizer = {
      vocab: tokenizerData.model.vocab,
      unk_token_id: tokenizerConfig.unk_token || '[UNK]',
      cls_token_id: tokenizerConfig.cls_token || '[CLS]',
      sep_token_id: tokenizerConfig.sep_token || '[SEP]',
      pad_token_id: tokenizerConfig.pad_token || '[PAD]',
      wordpiece_prefix: tokenizerConfig.wordpiece_prefix || '##',
    };

    // Create reverse vocab lookup (id -> token)
    this.tokenizer.id2token = {};
    for (const [token, id] of Object.entries(this.tokenizer.vocab)) {
      this.tokenizer.id2token[id] = token;
    }

    console.log('[CustomNER] Tokenizer loaded:', {
      vocab_size: Object.keys(this.tokenizer.vocab).length
    });
  }

  /**
   * Load ONNX model
   */
  async loadONNXModel(modelPath) {
    const modelUrl = `${modelPath}/onnx/model_quantized.onnx`;

    console.log('[CustomNER] Loading ONNX model from:', modelUrl);

    // Fetch model as ArrayBuffer
    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ONNX model from ${modelUrl}`);
    }

    const modelBuffer = await response.arrayBuffer();

    // Create ONNX session
    this.session = await window.ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    console.log('[CustomNER] ONNX model loaded:', {
      inputNames: this.session.inputNames,
      outputNames: this.session.outputNames
    });
  }

  /**
   * Tokenize text (BERT WordPiece tokenization)
   */
  tokenize(text) {
    // CRITICAL: BERT-base-NER is CASED (do_lower_case: false)
    // DO NOT lowercase the input!

    // Split on whitespace (preserve case)
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const tokens = [];
    const tokenIds = [];
    const wordIds = [];

    // Add [CLS] token
    const clsToken = this.tokenizer.cls_token_id || '[CLS]';
    tokens.push(clsToken);
    tokenIds.push(this.tokenizer.vocab[clsToken]);
    wordIds.push(null);

    // Tokenize words
    for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
      const word = words[wordIdx];

      // Try to find exact word in vocab (case-sensitive)
      let tokenId = this.tokenizer.vocab[word];

      if (tokenId !== undefined) {
        // Word found in vocab
        tokens.push(word);
        tokenIds.push(tokenId);
        wordIds.push(wordIdx);
      } else {
        // Try WordPiece splitting
        const subwords = this.splitIntoSubwords(word);

        if (subwords.length === 0) {
          // Couldn't tokenize, use [UNK]
          const unkToken = this.tokenizer.unk_token_id || '[UNK]';
          tokens.push(unkToken);
          tokenIds.push(this.tokenizer.vocab[unkToken]);
          wordIds.push(wordIdx);
        } else {
          for (const subword of subwords) {
            tokenId = this.tokenizer.vocab[subword];
            if (tokenId === undefined) {
              // Subword not in vocab, use [UNK]
              const unkToken = this.tokenizer.unk_token_id || '[UNK]';
              tokenId = this.tokenizer.vocab[unkToken];
              tokens.push(unkToken);
            } else {
              tokens.push(subword);
            }
            tokenIds.push(tokenId);
            wordIds.push(wordIdx);
          }
        }
      }
    }

    // Add [SEP] token
    const sepToken = this.tokenizer.sep_token_id || '[SEP]';
    tokens.push(sepToken);
    tokenIds.push(this.tokenizer.vocab[sepToken]);
    wordIds.push(null);

    console.log('[CustomNER] Tokenization sample:', {
      originalWords: words.slice(0, 5),
      tokens: tokens.slice(0, 10),
      tokenIds: tokenIds.slice(0, 10)
    });

    return {
      tokens,
      input_ids: tokenIds,
      word_ids: wordIds
    };
  }

  /**
   * WordPiece subword splitting
   * Tries to split unknown words into subword tokens using ## prefix
   */
  splitIntoSubwords(word) {
    const subwords = [];
    let remaining = word;
    const maxSubwordLen = 100;  // Safety limit

    // First token doesn't have ## prefix
    let isFirst = true;

    while (remaining.length > 0 && subwords.length < maxSubwordLen) {
      let found = false;

      // Try progressively shorter prefixes
      for (let i = remaining.length; i > 0; i--) {
        const subword = remaining.substring(0, i);
        const token = isFirst ? subword : '##' + subword;

        if (this.tokenizer.vocab[token] !== undefined) {
          subwords.push(token);
          remaining = remaining.substring(i);
          found = true;
          isFirst = false;
          break;
        }
      }

      if (!found) {
        // Couldn't split this word, give up
        // Return empty array to signal failure (caller will use [UNK])
        return [];
      }
    }

    return subwords;
  }

  /**
   * Normalize text for better NER detection
   * Converts all-caps words to title case (BOOPALAN → Boopalan)
   * BERT-base-NER was trained on title case names, not all caps
   */
  normalizeText(text) {
    // Convert all-caps words (3+ letters) to title case
    // This helps BERT recognize names like "BOOPALAN NATESAN" → "Boopalan Natesan"
    // Preserves short acronyms like "US", "UK", "AI"
    return text.replace(/\b[A-Z]{3,}\b/g, (word) => {
      // Only convert if entire word is uppercase (3+ letters)
      // This preserves 2-letter acronyms (US, UK, AI) which BERT handles well
      return word.charAt(0) + word.slice(1).toLowerCase();
    });
  }

  /**
   * Run NER inference on text
   * Uses sliding window for documents > 512 tokens
   * @param {string} text - Input text to analyze
   * @param {function} progressCallback - Optional callback for progress updates (message) => void
   */
  async predict(text, progressCallback = null) {
    if (!this.session) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // STEP 1: Normalize text for better detection
    const originalText = text;
    const normalizedText = this.normalizeText(text);

    console.log('[CustomNER] Text normalization:', {
      original: originalText.substring(0, 100),
      normalized: normalizedText.substring(0, 100),
      changed: originalText !== normalizedText
    });

    // STEP 2: Tokenize normalized input
    const tokenized = this.tokenize(normalizedText);
    const inputIds = tokenized.input_ids;

    // Validate token IDs
    for (let i = 0; i < inputIds.length; i++) {
      if (inputIds[i] === undefined || inputIds[i] === null || isNaN(inputIds[i])) {
        console.error('[CustomNER] Invalid token ID at position', i, ':', inputIds[i]);
        console.error('[CustomNER] Token:', tokenized.tokens[i]);
        throw new Error(`Invalid token ID at position ${i}: ${inputIds[i]}`);
      }
    }

    console.log('[CustomNER] Tokenized:', {
      numTokens: inputIds.length,
      tokens: tokenized.tokens.slice(0, 10),
      ids: inputIds.slice(0, 10)
    });

    const MAX_LENGTH = 512;

    // If document fits in one chunk, use single-pass processing
    if (inputIds.length <= MAX_LENGTH) {
      console.log('[CustomNER] Processing single chunk...');
      if (progressCallback) {
        progressCallback('Processing document...');
      }
      return this.predictSingleChunk(originalText, normalizedText, tokenized, progressCallback);
    }

    // Otherwise, use sliding window approach
    console.log(`[CustomNER] 📄 Document has ${inputIds.length} tokens (exceeds ${MAX_LENGTH} limit)`);
    console.log('[CustomNER] 🔄 Using sliding window approach for complete coverage');
    return this.predictWithSlidingWindow(originalText, normalizedText, tokenized, progressCallback);
  }

  /**
   * Process a single chunk (document fits in 512 tokens)
   */
  async predictSingleChunk(originalText, normalizedText, tokenized, progressCallback = null) {
    const inputIds = tokenized.input_ids;

    // Create attention mask (all 1s)
    const attentionMask = new Array(inputIds.length).fill(1);

    // Create token type IDs (all 0s for single sentence NER)
    const tokenTypeIds = new Array(inputIds.length).fill(0);

    // Create tensors
    const inputIdsTensor = new window.ort.Tensor('int64', BigInt64Array.from(inputIds.map(id => BigInt(id))), [1, inputIds.length]);
    const attentionMaskTensor = new window.ort.Tensor('int64', BigInt64Array.from(attentionMask.map(m => BigInt(m))), [1, attentionMask.length]);
    const tokenTypeIdsTensor = new window.ort.Tensor('int64', BigInt64Array.from(tokenTypeIds.map(t => BigInt(t))), [1, tokenTypeIds.length]);

    console.log('[CustomNER] Tensor shapes:', {
      input_ids: inputIdsTensor.dims,
      attention_mask: attentionMaskTensor.dims,
      token_type_ids: tokenTypeIdsTensor.dims
    });

    // Run inference
    const feeds = {
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
      token_type_ids: tokenTypeIdsTensor
    };

    console.log('[CustomNER] Running inference...');
    if (progressCallback) progressCallback('Running inference... (50%)');
    const results = await this.session.run(feeds);
    console.log('[CustomNER] Inference complete');

    const logits = results.logits;
    this.lastLogits = logits;

    // Post-process results
    if (progressCallback) progressCallback('Processing complete (100%)');
    return this.postProcess(originalText, tokenized, logits);
  }

  /**
   * Process large documents using sliding window approach
   */
  async predictWithSlidingWindow(originalText, normalizedText, fullTokenized, progressCallback = null) {
    const CHUNK_SIZE = 450;      // Tokens per chunk (content)
    const OVERLAP = 62;          // Overlap between chunks
    const MAX_SEQ_LEN = 512;     // BERT maximum

    // Create chunks
    const chunks = this.createChunks(fullTokenized, CHUNK_SIZE, OVERLAP);

    console.log('[CustomNER] ═══════════════════════════════════════');
    console.log('[CustomNER] 📊 Sliding Window Configuration:');
    console.log(`[CustomNER]    • Total tokens: ${fullTokenized.input_ids.length}`);
    console.log(`[CustomNER]    • Chunks: ${chunks.length}`);
    console.log(`[CustomNER]    • Chunk size: ${CHUNK_SIZE} tokens`);
    console.log(`[CustomNER]    • Overlap: ${OVERLAP} tokens`);
    console.log(`[CustomNER]    • Estimated time: ~${Math.round(chunks.length * 0.5)} seconds`);
    console.log('[CustomNER] ═══════════════════════════════════════');

    // Initial progress message
    if (progressCallback) {
      console.log('[CustomNER] 📢 Updating UI with progress information');
      progressCallback(`Processing large document: ${chunks.length} chunks (${fullTokenized.input_ids.length} tokens)`);
      // Force browser repaint
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const allEntities = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[CustomNER] Processing chunk ${i + 1}/${chunks.length} (tokens ${chunk.startTokenIdx}-${chunk.endTokenIdx})...`);

      // Update progress in UI
      if (progressCallback) {
        const percentage = Math.round(((i + 1) / chunks.length) * 100);
        const message = `Processing chunk ${i + 1}/${chunks.length} (${percentage}%)...`;
        console.log('[CustomNER] Invoking progress callback:', message);
        progressCallback(message);

        // Force browser to repaint by yielding control briefly
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const entities = await this.processChunk(originalText, normalizedText, fullTokenized, chunk);
      allEntities.push(...entities);

      // Progress feedback every 10 chunks
      if ((i + 1) % 10 === 0) {
        console.log(`[CustomNER] Progress: ${i + 1}/${chunks.length} chunks (${Math.round((i + 1) / chunks.length * 100)}%)`);
      }
    }

    console.log('[CustomNER] ═══════════════════════════════════════');
    console.log(`[CustomNER] ✅ All ${chunks.length} chunks processed successfully`);
    console.log(`[CustomNER] 📝 Found ${allEntities.length} entities (before deduplication)`);

    // Update progress for merge step
    if (progressCallback) {
      progressCallback(`Merging results (found ${allEntities.length} entities)... (100%)`);
      // Force browser repaint
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Merge and deduplicate entities
    const mergedEntities = this.mergeEntities(allEntities);

    console.log(`[CustomNER] 🔍 After deduplication: ${mergedEntities.length} unique entities`);
    console.log('[CustomNER] ═══════════════════════════════════════');

    if (progressCallback) {
      progressCallback(`Completed: ${mergedEntities.length} unique entities detected (100%)`);
      // Force browser repaint
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return mergedEntities;
  }

  /**
   * Create overlapping chunks from tokenized input
   */
  createChunks(tokenized, chunkSize, overlap) {
    const chunks = [];
    const totalTokens = tokenized.input_ids.length - 2; // Exclude [CLS] and [SEP]
    let startPos = 1; // Skip [CLS]

    while (startPos < totalTokens) {
      const endPos = Math.min(startPos + chunkSize, totalTokens);

      // Get word indices for this chunk
      const startWordIdx = tokenized.word_ids[startPos];
      const endWordIdx = tokenized.word_ids[endPos - 1];

      chunks.push({
        startTokenIdx: startPos,
        endTokenIdx: endPos,
        startWordIdx: startWordIdx,
        endWordIdx: endWordIdx
      });

      // Move forward by (chunkSize - overlap) for next chunk
      startPos += (chunkSize - overlap);
    }

    return chunks;
  }

  /**
   * Process a single chunk of the document
   */
  async processChunk(originalText, normalizedText, fullTokenized, chunk) {
    const { startTokenIdx, endTokenIdx } = chunk;

    // Extract chunk tokens (without [CLS] and [SEP] from full tokenization)
    const chunkInputIds = fullTokenized.input_ids.slice(startTokenIdx, endTokenIdx);
    const chunkTokens = fullTokenized.tokens.slice(startTokenIdx, endTokenIdx);
    const chunkWordIds = fullTokenized.word_ids.slice(startTokenIdx, endTokenIdx);

    // Add [CLS] at beginning
    const clsToken = this.tokenizer.cls_token_id || '[CLS]';
    const clsId = this.tokenizer.vocab[clsToken];
    chunkInputIds.unshift(clsId);
    chunkTokens.unshift(clsToken);
    chunkWordIds.unshift(null);

    // Add [SEP] at end
    const sepToken = this.tokenizer.sep_token_id || '[SEP]';
    const sepId = this.tokenizer.vocab[sepToken];
    chunkInputIds.push(sepId);
    chunkTokens.push(sepToken);
    chunkWordIds.push(null);

    // Create attention mask and token type IDs
    const attentionMask = new Array(chunkInputIds.length).fill(1);
    const tokenTypeIds = new Array(chunkInputIds.length).fill(0);

    // Create tensors
    const inputIdsTensor = new window.ort.Tensor('int64',
      BigInt64Array.from(chunkInputIds.map(id => BigInt(id))),
      [1, chunkInputIds.length]);
    const attentionMaskTensor = new window.ort.Tensor('int64',
      BigInt64Array.from(attentionMask.map(m => BigInt(m))),
      [1, attentionMask.length]);
    const tokenTypeIdsTensor = new window.ort.Tensor('int64',
      BigInt64Array.from(tokenTypeIds.map(t => BigInt(t))),
      [1, tokenTypeIds.length]);

    // Run inference
    const feeds = {
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
      token_type_ids: tokenTypeIdsTensor
    };

    const results = await this.session.run(feeds);
    const logits = results.logits;

    // Create chunk tokenized object
    const chunkTokenized = {
      tokens: chunkTokens,
      input_ids: chunkInputIds,
      word_ids: chunkWordIds
    };

    // Post-process this chunk
    return this.postProcess(originalText, chunkTokenized, logits);
  }

  /**
   * Merge entities from multiple chunks and remove duplicates
   */
  mergeEntities(allEntities) {
    if (allEntities.length === 0) return [];

    // Sort by start position
    allEntities.sort((a, b) => a.start - b.start);

    const merged = [];

    for (let i = 0; i < allEntities.length; i++) {
      const current = allEntities[i];

      // Check if overlaps with any previously merged entity
      let isDuplicate = false;

      for (let j = merged.length - 1; j >= 0; j--) {
        const previous = merged[j];

        // If we've gone too far back (no more potential overlaps), break
        if (previous.end < current.start - 10) {
          break;
        }

        // Check if entities overlap
        if (this.entitiesOverlap(current, previous)) {
          isDuplicate = true;

          // If current has higher confidence, replace the previous one
          if (current.score > previous.score) {
            merged[j] = current;
          }
          break;
        }
      }

      if (!isDuplicate) {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Check if two entities overlap
   */
  entitiesOverlap(entity1, entity2) {
    // Two entities overlap if their character ranges intersect
    // OR if they refer to the same text span (even if positions differ slightly)

    const overlap = (entity1.start >= entity2.start && entity1.start <= entity2.end) ||
                    (entity2.start >= entity1.start && entity2.start <= entity1.end) ||
                    (entity1.end >= entity2.start && entity1.end <= entity2.end) ||
                    (entity2.end >= entity1.start && entity2.end <= entity1.end);

    return overlap;
  }

  /**
   * Post-process model outputs to NER format
   * @param text - Original text (NOT normalized, preserves original case)
   * @param tokenized - Tokenization from normalized text
   * @param logits - Model predictions
   */
  postProcess(text, tokenized, logits) {
    // Extract words from ORIGINAL text to preserve case
    // e.g., "BOOPALAN NATESAN" not "Boopalan Natesan"
    const words = text.split(/\s+/);
    const entities = [];

    // Get predictions for each token
    const numTokens = tokenized.tokens.length;
    const numLabels = Object.keys(this.id2label).length;

    console.log('[CustomNER] Post-processing:', {
      numTokens,
      numLabels,
      numWords: words.length,
      logitsShape: logits.dims
    });

    // Precompute the line number for each word so we can detect cross-newline spans.
    // wordLineNums[wordIdx] = which \n-separated line the word starts on.
    const wordLineNums = [];
    {
      let curLine = 0, inWord = false;
      for (const ch of text) {
        if (ch === '\n') { curLine++; inWord = false; continue; }
        if (/\S/.test(ch)) {
          if (!inWord) { wordLineNums.push(curLine); inWord = true; }
        } else {
          inWord = false;
        }
      }
    }

    // Find entity spans
    let currentEntity = null;
    let entityCount = 0;

    for (let i = 1; i < numTokens - 1; i++) {  // Skip [CLS] and [SEP]
      const wordId = tokenized.word_ids[i];
      if (wordId === null) continue;

      // Get label with highest score
      let maxScore = -Infinity;
      let maxLabel = 0;

      for (let labelId = 0; labelId < numLabels; labelId++) {
        const score = logits.data[i * numLabels + labelId];
        if (score > maxScore) {
          maxScore = score;
          maxLabel = labelId;
        }
      }

      const labelName = this.id2label[maxLabel];
      const score = Math.exp(maxScore) / (1 + Math.exp(maxScore));  // Sigmoid

      // Debug first 10 tokens
      if (i < 10) {
        console.log(`[CustomNER] Token ${i}: "${tokenized.tokens[i]}" → ${labelName} (score: ${score.toFixed(3)})`);
      }

      // Skip 'O' (non-entity) labels
      // Threshold at 0.55 (above sigmoid midpoint) to filter weak classifications
      if (labelName === 'O' || score < 0.55) {
        if (currentEntity) {
          entities.push(currentEntity);
          currentEntity = null;
        }
        continue;
      }

      // Parse label (B-PER, I-PER, etc.)
      const [prefix, entityType] = labelName.split('-');

      if (prefix === 'B' || !currentEntity || currentEntity.entity_group !== entityType) {
        // Start new entity
        if (currentEntity) {
          entities.push(currentEntity);
        }

        currentEntity = {
          entity_group: entityType,
          word: words[wordId],
          _lastWordId: wordId,          // track last word to skip same-word sub-tokens
          _startLine: wordLineNums[wordId] ?? 0,  // track line for cross-newline detection
          start: text.split(/\s+/).slice(0, wordId).join(' ').length + (wordId > 0 ? 1 : 0),
          end: text.split(/\s+/).slice(0, wordId + 1).join(' ').length,
          score: score
        };
      } else if (prefix === 'I' && currentEntity && currentEntity.entity_group === entityType) {
        // Only extend the entity if this is a NEW word (different wordId = new sub-word group)
        if (wordId !== currentEntity._lastWordId) {
          // Stop at a newline boundary — cross-line entities are NER hallucinations
          if ((wordLineNums[wordId] ?? 0) !== currentEntity._startLine) {
            entities.push(currentEntity);
            currentEntity = null;
            continue;
          }
          currentEntity.word += ' ' + words[wordId];
          currentEntity._lastWordId = wordId;
        }
        currentEntity.end = text.split(/\s+/).slice(0, wordId + 1).join(' ').length;
        currentEntity.score = (currentEntity.score + score) / 2;  // Average score
      }
    }

    // Add last entity
    if (currentEntity) {
      entities.push(currentEntity);
    }

    console.log('[CustomNER] Post-processing complete:', {
      entitiesFound: entities.length,
      entities: entities.slice(0, 5)
    });

    return entities;
  }

  /**
   * Pipeline-like interface (matches Transformers.js API)
   * @param {string} text - Input text to analyze
   * @param {function} progressCallback - Optional callback for progress updates
   */
  async __call__(text, progressCallback = null) {
    return await this.predict(text, progressCallback);
  }
}

// Export for use in popup.js
window.CustomNERLoader = CustomNERLoader;
