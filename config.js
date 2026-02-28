/**
 * Enterprise Configuration for Local PII Masking
 *
 * Security-first configuration with sensible defaults for enterprise use.
 * All settings can be overridden at runtime for different deployment scenarios.
 */

export const CONFIG = {
  // File Upload Security
  security: {
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB limit
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword' // Legacy .doc
    ],
    // Magic bytes for file type verification (prevents extension spoofing)
    magicBytes: {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      docx: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP format)
      doc: [0xD0, 0xCF, 0x11, 0xE0] // Legacy DOC
    },
    enableFileHashVerification: true
  },

  // PII Detection Configuration
  detection: {
    // Confidence thresholds (0.0 to 1.0)
    thresholds: {
      regex: 1.0,  // Regex matches are deterministic
      ner: 0.85    // NER model confidence threshold
    },

    // Detection methods to enable
    methods: {
      regex: true,
      ner: true
    },

    // Singapore-specific patterns
    singaporePatterns: {
      nric: {
        pattern: /[STFGM]\d{7}[A-Z]/g,
        type: 'NRIC',
        description: 'Singapore NRIC/FIN'
      },
      phone: {
        pattern: /(?:\+65)?[689]\d{7}/g,
        type: 'PHONE_SG',
        description: 'Singapore phone number'
      },
      postalCode: {
        pattern: /\b\d{6}\b/g,
        type: 'POSTAL_CODE_SG',
        description: 'Singapore postal code'
      }
    },

    // Universal patterns
    universalPatterns: {
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'EMAIL',
        description: 'Email address'
      },
      creditCard: {
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        type: 'CREDIT_CARD',
        description: 'Credit card number',
        validation: 'luhn' // Luhn algorithm check
      }
    }
  },

  // ML Model Configuration
  models: {
    ner: {
      // Using Xenova's optimized BERT model for browser inference
      modelId: 'Xenova/bert-base-NER',
      quantized: true, // Smaller model size
      maxLength: 512,  // Token limit per inference
      device: 'wasm',  // WebAssembly for security
      cache: true
    }
  },

  // Masking Strategies
  masking: {
    strategies: {
      REDACTION: {
        name: 'Redaction',
        description: 'Replace with [REDACTED] placeholder',
        format: (type) => `[REDACTED_${type}]`
      },
      TOKENIZATION: {
        name: 'Tokenization',
        description: 'Replace with consistent tokens (e.g., [NAME_1])',
        format: (type, index) => `[${type}_${index}]`
      },
      HASH: {
        name: 'Hash',
        description: 'Replace with SHA-256 hash (first 8 chars)',
        format: async (value) => {
          const hash = await crypto.subtle.digest('SHA-256',
            new TextEncoder().encode(value));
          return Array.from(new Uint8Array(hash))
            .slice(0, 4)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
      },
      PARTIAL: {
        name: 'Partial Masking',
        description: 'Show first/last chars (e.g., j***@***l.com)',
        format: (value, type) => {
          if (type === 'EMAIL') {
            const parts = value.split('@');
            return `${parts[0][0]}***@***${parts[1].slice(-5)}`;
          }
          if (type === 'PHONE_SG') {
            return `****${value.slice(-4)}`;
          }
          return `${value[0]}${'*'.repeat(value.length - 2)}${value.slice(-1)}`;
        }
      }
    },
    defaultStrategy: 'REDACTION'
  },

  // Audit & Logging
  audit: {
    enabled: true,
    logLevel: 'INFO', // DEBUG, INFO, WARN, ERROR
    includeStackTraces: true,
    storeLogs: true, // Keep in memory for download
    maxLogEntries: 1000
  },

  // Performance
  performance: {
    enableBenchmarking: true,
    chunkSize: 10000, // Process text in chunks for large documents
    maxConcurrentOperations: 3,
    useWebWorkers: true // Offload heavy processing
  },

  // UI Configuration
  ui: {
    theme: 'professional',
    showConfidenceScores: true,
    highlightColors: {
      high: '#ff4444',    // High confidence (>0.95)
      medium: '#ffaa00',  // Medium confidence (0.85-0.95)
      low: '#ffff00'      // Low confidence (<0.85)
    }
  },

  // Content Security Policy
  csp: {
    scriptSrc: ["'self'", "'wasm-unsafe-eval'"], // For WebAssembly
    styleSrc: ["'self'", "'unsafe-inline'"], // Minimal inline CSS
    connectSrc: ["'self'"],
    imgSrc: ["'self'", "data:"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"]
  }
};

// Environment detection
export const ENVIRONMENT = {
  isDevelopment: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
  isProduction: location.protocol === 'https:',
  browserName: navigator.userAgent.includes('Chrome') ? 'Chrome' :
               navigator.userAgent.includes('Firefox') ? 'Firefox' :
               navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
  supportsWebAssembly: typeof WebAssembly !== 'undefined',
  supportsWebWorkers: typeof Worker !== 'undefined',
  supportsCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
};

// Validate environment capabilities
export function validateEnvironment() {
  const errors = [];

  if (!ENVIRONMENT.supportsWebAssembly) {
    errors.push('WebAssembly not supported - NER detection unavailable');
  }

  if (!ENVIRONMENT.supportsCrypto) {
    errors.push('Web Crypto API not supported - hashing unavailable');
  }

  if (!ENVIRONMENT.isProduction && location.protocol === 'file:') {
    console.warn('Running from file:// protocol - some features may be restricted');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}

export default CONFIG;
