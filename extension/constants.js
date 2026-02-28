/**
 * Constants Module
 * Centralizes all magic numbers and configuration values
 * Local PII Masking v2.3.5
 */

// Machine Learning Configuration
export const ML_CONFIG = {
  NER_MIN_CONFIDENCE: 0.85,
  ENTITY_MIN_CONFIDENCE: 0.35,
  BERT_MAX_LENGTH: 512,
  CHUNK_SIZE: 450,
  OVERLAP: 62
};

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_SIZE_MB: 30,
  MAX_SIZE_BYTES: 30 * 1024 * 1024
};

// PDF Processing Configuration
export const PDF_CONFIG = {
  RENDER_SCALE: 2.0,
  REDACTION_PADDING: 3
};

// UI Configuration
export const UI_CONFIG = {
  PROGRESS_UPDATE_DELAY: 0 // milliseconds
};
