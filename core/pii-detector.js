/**
 * PII Detector Orchestrator
 *
 * Main detection engine that coordinates regex and NER-based detection,
 * deduplicates results, and generates comprehensive reports.
 */

import { CONFIG } from '../config.js';
import RegexDetector from './regex-detector.js';
import NERDetector from './ner-detector.js';
import logger from './audit-logger.js';
import { generateReport } from './report-generator.js';
import { hashPII } from '../utils/security.js';

/**
 * Main PII Detector class
 */
export class PIIDetector {
  constructor(config = CONFIG) {
    this.config = config;
    this.regexDetector = new RegexDetector(config);
    this.nerDetector = new NERDetector(config);
  }

  /**
   * Detect PII in text using all enabled methods
   */
  async detect(text, options = {}) {
    const startTime = performance.now();
    logger.info('DETECTOR', 'Starting PII detection', {
      textLength: text.length,
      methods: {
        regex: this.config.detection.methods.regex,
        ner: this.config.detection.methods.ner
      }
    });

    const detections = [];

    try {
      // Run regex detection
      if (this.config.detection.methods.regex) {
        logger.debug('DETECTOR', 'Running regex detection');
        const regexResults = await this.regexDetector.detect(text);
        detections.push(...regexResults);
        logger.info('DETECTOR', `Regex found ${regexResults.length} detections`);
      }

      // Run NER detection
      if (this.config.detection.methods.ner) {
        logger.debug('DETECTOR', 'Running NER detection');
        try {
          const nerResults = await this.nerDetector.detect(text);
          detections.push(...nerResults);
          logger.info('DETECTOR', `NER found ${nerResults.length} detections`);
        } catch (error) {
          logger.error('DETECTOR', 'NER detection failed', {
            error: error.message
          });
          // Continue with regex results even if NER fails
        }
      }

      // Deduplicate overlapping detections
      const deduplicated = this.deduplicateDetections(detections);

      // Sort by position
      deduplicated.sort((a, b) => a.start - b.start);

      const duration = performance.now() - startTime;
      logger.logPerformance('Total PII detection', duration, {
        totalDetections: deduplicated.length,
        beforeDedup: detections.length
      });

      return deduplicated;

    } catch (error) {
      logger.error('DETECTOR', 'Detection failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Deduplicate overlapping detections (prefer higher confidence)
   */
  deduplicateDetections(detections) {
    if (detections.length === 0) return [];

    // Sort by position and confidence
    const sorted = [...detections].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.confidence - a.confidence;
    });

    const unique = [];
    let lastEnd = -1;

    for (const detection of sorted) {
      // Check if this detection overlaps with previous
      const overlaps = unique.some(existing =>
        this.detectionsOverlap(existing, detection)
      );

      if (!overlaps) {
        unique.push(detection);
        lastEnd = detection.end;
      } else {
        // Keep the one with higher confidence
        const overlapIndex = unique.findIndex(existing =>
          this.detectionsOverlap(existing, detection)
        );

        if (overlapIndex !== -1) {
          const existing = unique[overlapIndex];
          if (detection.confidence > existing.confidence) {
            logger.debug('DEDUP', 'Replacing lower confidence detection', {
              old: existing.type,
              new: detection.type,
              position: detection.start
            });
            unique[overlapIndex] = detection;
          }
        }
      }
    }

    logger.info('DEDUP', `Deduplicated ${detections.length} to ${unique.length}`, {
      removed: detections.length - unique.length
    });

    return unique;
  }

  /**
   * Check if two detections overlap
   */
  detectionsOverlap(a, b) {
    return !(a.end <= b.start || b.end <= a.start);
  }

  /**
   * Mask detected PII in text
   */
  async mask(text, detections, strategy = 'REDACTION') {
    const startTime = performance.now();
    logger.info('MASKING', `Applying ${strategy} masking`, {
      detectionCount: detections.length
    });

    const operations = [];
    let maskedText = text;
    let offset = 0; // Track offset changes from replacements

    // Sort detections by position (start from beginning)
    const sortedDetections = [...detections].sort((a, b) => a.start - b.start);

    for (const detection of sortedDetections) {
      const originalValue = text.substring(detection.start, detection.end);
      const masked = await this.applyMaskingStrategy(
        originalValue,
        detection.type,
        strategy,
        operations.length
      );

      // Calculate adjusted position based on previous replacements
      const adjustedStart = detection.start + offset;
      const adjustedEnd = detection.end + offset;

      // Replace in masked text
      maskedText = maskedText.substring(0, adjustedStart) +
                   masked +
                   maskedText.substring(adjustedEnd);

      // Update offset
      offset += (masked.length - originalValue.length);

      // Log operation
      const operation = {
        type: detection.type,
        position: { start: detection.start, end: detection.end },
        originalHash: await hashPII(originalValue),
        maskedHash: await hashPII(masked),
        strategy
      };

      operations.push(operation);

      logger.logMasking(
        detection.type,
        strategy,
        detection.start,
        operation.originalHash,
        operation.maskedHash
      );
    }

    const duration = performance.now() - startTime;
    logger.logPerformance('Masking', duration, {
      operationCount: operations.length
    });

    return {
      content: maskedText,
      operations,
      strategy
    };
  }

  /**
   * Apply specific masking strategy
   */
  async applyMaskingStrategy(value, type, strategy, index) {
    const strategies = this.config.masking.strategies;

    if (!strategies[strategy]) {
      logger.warn('MASKING', `Unknown strategy: ${strategy}, using default`);
      strategy = this.config.masking.defaultStrategy;
    }

    const strategyConfig = strategies[strategy];

    // Apply format function
    if (typeof strategyConfig.format === 'function') {
      return await strategyConfig.format(value, type, index);
    }

    return strategyConfig.format;
  }

  /**
   * Process document: detect and optionally mask
   */
  async processDocument(document, options = {}) {
    const {
      maskingStrategy = null,
      generateReportAfter = true
    } = options;

    const processingStart = new Date().toISOString();
    const startTime = performance.now();

    logger.logFileProcessingStart(
      document.name,
      document.size,
      document.type
    );

    try {
      // Detect PII
      const detections = await this.detect(document.content);

      // Mask if requested
      let maskedDocument = null;
      if (maskingStrategy && detections.length > 0) {
        maskedDocument = await this.mask(
          document.content,
          detections,
          maskingStrategy
        );
      }

      const duration = performance.now() - startTime;

      logger.logFileProcessingComplete(
        document.name,
        duration,
        detections.length
      );

      // Generate report if requested
      let report = null;
      if (generateReportAfter) {
        report = await generateReport(
          detections,
          document,
          maskedDocument,
          {
            startTime: processingStart,
            endTime: new Date().toISOString(),
            durationMs: Math.round(duration),
            methods: [
              this.config.detection.methods.regex ? 'regex' : null,
              this.config.detection.methods.ner ? 'ner' : null
            ].filter(Boolean),
            modelInfo: this.nerDetector.getModelInfo()
          }
        );
      }

      return {
        detections,
        maskedDocument,
        report,
        metadata: {
          processingTimeMs: Math.round(duration),
          detectionCount: detections.length,
          masked: maskedDocument !== null
        }
      };

    } catch (error) {
      logger.error('DETECTOR', 'Document processing failed', {
        document: document.name,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      regex: this.regexDetector.getPatternStats(),
      ner: this.nerDetector.getModelInfo(),
      config: {
        thresholds: this.config.detection.thresholds,
        methods: this.config.detection.methods
      }
    };
  }

  /**
   * Preload NER model with progress callback
   * @param {Function} onProgress - Optional progress callback (stage, progress, message)
   */
  async preloadModel(onProgress = null) {
    if (this.config.detection.methods.ner) {
      logger.info('DETECTOR', 'Preloading NER model');
      await this.nerDetector.loadModel(onProgress);
    }
  }

  /**
   * Unload NER model to free memory
   */
  async unloadModel() {
    await this.nerDetector.unloadModel();
  }
}

export default PIIDetector;
