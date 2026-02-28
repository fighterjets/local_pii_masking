/**
 * Error Handling Module
 * Custom error classes and error handling utilities
 * Local PII Masking v2.3.5
 */

/**
 * File upload error
 */
export class FileUploadError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'FileUploadError';
    this.originalError = originalError;
  }
}

/**
 * ML model loading error
 */
export class ModelLoadError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'ModelLoadError';
    this.originalError = originalError;
  }
}

/**
 * PII detection error
 */
export class DetectionError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DetectionError';
    this.originalError = originalError;
  }
}

/**
 * PDF processing error
 */
export class PDFError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'PDFError';
    this.originalError = originalError;
  }
}

/**
 * Handle errors and display user-friendly messages
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {Function} showStatus - Function to display status message
 */
export function handleError(error, context, showStatus) {
  console.error(`[${context}]`, error);

  let userMessage = 'An unexpected error occurred.';

  if (error instanceof FileUploadError) {
    userMessage = error.message;
  } else if (error instanceof ModelLoadError) {
    userMessage = 'Failed to load ML model. Using regex patterns only.';
  } else if (error instanceof DetectionError) {
    userMessage = 'PII detection failed. Please try again.';
  } else if (error instanceof PDFError) {
    userMessage = error.message;
  } else if (error.message) {
    userMessage = error.message;
  }

  if (showStatus) {
    showStatus(userMessage, 'error');
  }

  return userMessage;
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Error context
 * @param {Function} showStatus - Status display function
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context, showStatus) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(error, context, showStatus);
      throw error;
    }
  };
}
