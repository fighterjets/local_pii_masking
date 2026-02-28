/**
 * NER-based PII Detector
 *
 * Machine learning-based Named Entity Recognition using Transformers.js
 * Runs entirely in-browser via WebAssembly for security.
 */

import { CONFIG } from '../config.js';
import logger from './audit-logger.js';
import { hashPII } from '../utils/security.js';

/**
 * NER Detector using Hugging Face Transformers.js
 */
export class NERDetector {
  constructor(config = CONFIG) {
    this.config = config;
    this.pipeline = null;
    this.modelLoaded = false;
    this.loadingPromise = null;
  }

  /**
   * Lazy load the NER model with progress callback
   * @param {Function} onProgress - Callback (stage, progress, message)
   * @param {number} timeout - Timeout in ms (default: 90000ms = 90s)
   */
  async loadModel(onProgress = null, timeout = 90000) {
    if (this.modelLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    const startTime = performance.now();
    logger.info('MODEL', `Loading NER model: ${this.config.models.ner.modelId}`);

    this.loadingPromise = (async () => {
      try {
        // Stage 1: Initialize Transformers.js
        if (onProgress) onProgress('init', 0, 'Initializing Transformers.js...');

        const importPromise = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
        const { pipeline } = await this.withTimeout(importPromise, timeout, 'Transformers.js import timed out');

        if (onProgress) onProgress('download', 20, 'Loading Transformers.js library...');

        logger.info('MODEL', 'Transformers.js loaded, downloading model...');

        // Stage 2: Download and load model
        if (onProgress) onProgress('download', 30, 'Downloading model (~50MB)...');

        // Create pipeline with progress tracking
        const pipelinePromise = pipeline(
          'token-classification',
          this.config.models.ner.modelId,
          {
            quantized: this.config.models.ner.quantized,
            device: this.config.models.ner.device,
            progress_callback: (progress) => {
              if (onProgress && progress.status === 'progress') {
                const percent = 30 + (progress.progress || 0) * 40; // 30-70%
                onProgress('download', percent, `Downloading: ${progress.file || 'model files'}...`);
              }
            }
          }
        );

        this.pipeline = await this.withTimeout(pipelinePromise, timeout, 'Model download timed out');

        if (onProgress) onProgress('load', 80, 'Loading into WebAssembly...');

        this.modelLoaded = true;
        const loadTime = performance.now() - startTime;

        if (onProgress) onProgress('ready', 100, 'Model ready!');

        logger.logModelLoad(this.config.models.ner.modelId, true, loadTime);
        logger.info('MODEL', 'NER model ready for inference');

      } catch (error) {
        const loadTime = performance.now() - startTime;
        logger.logModelLoad(this.config.models.ner.modelId, false, loadTime);
        logger.error('MODEL', `Failed to load NER model: ${error.message}`, {
          error: error.toString(),
          duration: loadTime
        });

        // Reset loading state on error
        this.loadingPromise = null;

        throw error;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Wrap promise with timeout
   */
  async withTimeout(promise, timeoutMs, timeoutMessage) {
    let timeoutHandle;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle);
      throw error;
    }
  }

  /**
   * Detect named entities in text
   */
  async detect(text) {
    if (!this.config.detection.methods.ner) {
      logger.debug('NER', 'NER detection disabled in config');
      return [];
    }

    try {
      await this.loadModel();
    } catch (error) {
      logger.error('NER', 'Cannot perform NER detection - model load failed');
      return [];
    }

    const startTime = performance.now();
    const detections = [];

    try {
      // Split text into chunks if needed (model has token limits)
      const chunks = this.chunkText(text, this.config.models.ner.maxLength);

      for (const chunk of chunks) {
        const entities = await this.pipeline(chunk.text, {
          aggregation_strategy: 'simple'
        });

        for (const entity of entities) {
          // Filter by confidence threshold
          if (entity.score >= this.config.detection.thresholds.ner) {
            const detection = {
              type: this.normalizeEntityType(entity.entity_group),
              value: entity.word.trim(),
              start: chunk.offset + entity.start,
              end: chunk.offset + entity.end,
              confidence: entity.score,
              method: 'ner',
              model: this.config.models.ner.modelId,
              hash: await hashPII(entity.word.trim())
            };

            detections.push(detection);

            logger.logDetection(
              detection.type,
              'ner',
              detection.confidence,
              { start: detection.start, end: detection.end },
              detection.hash
            );
          }
        }
      }

      const duration = performance.now() - startTime;
      logger.logPerformance('NER detection', duration, {
        detectionCount: detections.length,
        chunkCount: chunks.length
      });

      return detections;

    } catch (error) {
      logger.error('NER', `Detection failed: ${error.message}`, {
        error: error.toString()
      });
      return [];
    }
  }

  /**
   * Chunk text into smaller pieces for model processing
   */
  chunkText(text, maxChunkSize = 500) {
    const chunks = [];
    const words = text.split(/\s+/);
    let currentChunk = '';
    let offset = 0;

    for (const word of words) {
      if (currentChunk.length + word.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          offset: offset
        });
        offset += currentChunk.length;
        currentChunk = '';
      }
      currentChunk += word + ' ';
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        offset: offset
      });
    }

    return chunks;
  }

  /**
   * Normalize entity types from model to our standard types
   */
  normalizeEntityType(entityGroup) {
    const mapping = {
      'PER': 'PERSON',
      'PERSON': 'PERSON',
      'ORG': 'ORGANIZATION',
      'ORGANIZATION': 'ORGANIZATION',
      'LOC': 'LOCATION',
      'LOCATION': 'LOCATION',
      'MISC': 'MISCELLANEOUS'
    };

    return mapping[entityGroup.toUpperCase()] || entityGroup.toUpperCase();
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded() {
    return this.modelLoaded;
  }

  /**
   * Unload model to free memory
   */
  async unloadModel() {
    if (this.pipeline) {
      this.pipeline = null;
      this.modelLoaded = false;
      this.loadingPromise = null;
      logger.info('MODEL', 'NER model unloaded');
    }
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      modelId: this.config.models.ner.modelId,
      loaded: this.modelLoaded,
      quantized: this.config.models.ner.quantized,
      device: this.config.models.ner.device,
      maxLength: this.config.models.ner.maxLength
    };
  }
}

export default NERDetector;
