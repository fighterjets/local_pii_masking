/**
 * Regex-based PII Detector
 *
 * Fast, deterministic pattern matching for structured PII.
 * Includes validation logic (e.g., Luhn algorithm for credit cards).
 */

import { CONFIG } from '../config.js';
import logger from './audit-logger.js';
import { hashPII } from '../utils/security.js';

/**
 * Luhn algorithm for credit card validation
 */
function validateLuhn(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate NRIC checksum (Singapore)
 */
function validateNRIC(nric) {
  const weights = [2, 7, 6, 5, 4, 3, 2];
  const stCheckChars = 'JZIHGFEDCBA';
  const fgCheckChars = 'XWUTRQPNMLK';

  const prefix = nric[0];
  const digits = nric.substring(1, 8);
  const checkChar = nric[8];

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }

  // Add offset for foreign IDs
  if (prefix === 'F' || prefix === 'G') {
    sum += 4;
  } else if (prefix === 'M') {
    sum += 3;
  }

  const remainder = sum % 11;
  const expectedChar = (prefix === 'S' || prefix === 'T' || prefix === 'M')
    ? stCheckChars[remainder]
    : fgCheckChars[remainder];

  return expectedChar === checkChar;
}

/**
 * Main regex detector class
 */
export class RegexDetector {
  constructor(config = CONFIG) {
    this.config = config;
    this.patterns = this.compilePatterns();
  }

  /**
   * Compile all regex patterns from config
   */
  compilePatterns() {
    const patterns = [];

    // Singapore patterns
    if (this.config.detection.singaporePatterns) {
      Object.entries(this.config.detection.singaporePatterns).forEach(([key, pattern]) => {
        patterns.push({
          ...pattern,
          id: key,
          region: 'singapore'
        });
      });
    }

    // Universal patterns
    if (this.config.detection.universalPatterns) {
      Object.entries(this.config.detection.universalPatterns).forEach(([key, pattern]) => {
        patterns.push({
          ...pattern,
          id: key,
          region: 'universal'
        });
      });
    }

    return patterns;
  }

  /**
   * Detect PII in text using regex patterns
   */
  async detect(text) {
    const startTime = performance.now();
    const detections = [];

    for (const pattern of this.patterns) {
      const matches = this.findMatches(text, pattern);

      for (const match of matches) {
        // Validate match if validator exists
        if (await this.validateMatch(match.value, pattern)) {
          const detection = {
            type: pattern.type,
            value: match.value,
            start: match.start,
            end: match.end,
            confidence: CONFIG.detection.thresholds.regex,
            method: 'regex',
            pattern: pattern.id,
            description: pattern.description,
            hash: await hashPII(match.value)
          };

          detections.push(detection);

          logger.logDetection(
            detection.type,
            'regex',
            detection.confidence,
            { start: detection.start, end: detection.end },
            detection.hash
          );
        }
      }
    }

    const duration = performance.now() - startTime;
    logger.logPerformance('Regex detection', duration, {
      detectionCount: detections.length,
      patternCount: this.patterns.length
    });

    return detections;
  }

  /**
   * Find all matches for a pattern in text
   */
  findMatches(text, pattern) {
    const matches = [];
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        value: match[0],
        start: match.index,
        end: match.index + match[0].length
      });

      // Prevent infinite loop for zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Validate a match using pattern-specific validation
   */
  async validateMatch(value, pattern) {
    // Credit card validation
    if (pattern.validation === 'luhn') {
      return validateLuhn(value);
    }

    // NRIC validation
    if (pattern.type === 'NRIC') {
      return validateNRIC(value);
    }

    // Email basic validation
    if (pattern.type === 'EMAIL') {
      return value.includes('@') && value.includes('.');
    }

    // Singapore phone validation
    if (pattern.type === 'PHONE_SG') {
      const digits = value.replace(/\D/g, '');
      // Must be 8 digits and start with 6, 8, or 9
      return digits.length === 8 && /^[689]/.test(digits);
    }

    // Default: accept match
    return true;
  }

  /**
   * Get pattern statistics
   */
  getPatternStats() {
    return {
      totalPatterns: this.patterns.length,
      byRegion: {
        singapore: this.patterns.filter(p => p.region === 'singapore').length,
        universal: this.patterns.filter(p => p.region === 'universal').length
      },
      types: this.patterns.map(p => p.type)
    };
  }

  /**
   * Add custom pattern at runtime
   */
  addPattern(id, pattern, type, description, validation = null) {
    this.patterns.push({
      id,
      pattern,
      type,
      description,
      validation,
      region: 'custom'
    });

    logger.info('DETECTOR', `Custom pattern added: ${id}`, { type });
  }

  /**
   * Remove pattern by ID
   */
  removePattern(id) {
    const index = this.patterns.findIndex(p => p.id === id);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      logger.info('DETECTOR', `Pattern removed: ${id}`);
      return true;
    }
    return false;
  }
}

export default RegexDetector;
