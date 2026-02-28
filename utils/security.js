/**
 * Security Utilities
 *
 * Enterprise-grade security functions for file validation,
 * sanitization, and cryptographic operations.
 */

import { CONFIG } from '../config.js';

/**
 * Validates file using magic bytes (prevents extension spoofing)
 */
export async function validateFile(file) {
  const errors = [];
  const warnings = [];

  // Check file size
  if (file.size > CONFIG.security.maxFileSizeBytes) {
    errors.push(`File size ${formatBytes(file.size)} exceeds limit of ${formatBytes(CONFIG.security.maxFileSizeBytes)}`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Check MIME type
  if (!CONFIG.security.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  // Verify magic bytes
  try {
    const magicBytesValid = await verifyMagicBytes(file);
    if (!magicBytesValid) {
      errors.push('File header does not match declared type (possible spoofing)');
    }
  } catch (err) {
    warnings.push(`Could not verify file header: ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      name: sanitizeFilename(file.name),
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    }
  };
}

/**
 * Verify file magic bytes match declared type
 */
async function verifyMagicBytes(file) {
  const blob = file.slice(0, 4);
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PDF check
  if (file.type === 'application/pdf') {
    return arraysEqual(bytes, CONFIG.security.magicBytes.pdf);
  }

  // DOCX check (ZIP signature)
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return arraysEqual(bytes, CONFIG.security.magicBytes.docx);
  }

  // Legacy DOC check
  if (file.type === 'application/msword') {
    return arraysEqual(bytes, CONFIG.security.magicBytes.doc);
  }

  // Plain text - no magic bytes required
  if (file.type === 'text/plain') {
    return true;
  }

  return false;
}

/**
 * Compare byte arrays
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special chars
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .substring(0, 255); // Limit length
}

/**
 * Sanitize text content to prevent XSS
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Generate SHA-256 hash of content
 */
export async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate SHA-256 hash with salt (for PII values in audit trail)
 */
export async function hashPII(value, salt = '') {
  const content = `${salt}${value}${salt}`;
  return hashContent(content);
}

/**
 * Generate cryptographically secure random ID
 */
export function generateSecureId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate UUID v4
 */
export function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

/**
 * Validate and sanitize detection configuration
 */
export function validateDetectionConfig(config) {
  const sanitized = { ...config };

  // Ensure thresholds are in valid range
  if (sanitized.detection?.thresholds?.ner) {
    sanitized.detection.thresholds.ner = Math.max(0, Math.min(1,
      sanitized.detection.thresholds.ner));
  }

  // Ensure boolean flags are actually booleans
  if (sanitized.detection?.methods) {
    sanitized.detection.methods.regex = Boolean(sanitized.detection.methods.regex);
    sanitized.detection.methods.ner = Boolean(sanitized.detection.methods.ner);
  }

  return sanitized;
}

/**
 * Format bytes for human reading
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sanitize HTML for safe display
 */
export function sanitizeHTML(html) {
  const temp = document.createElement('div');
  temp.textContent = html; // Uses textContent, not innerHTML
  return temp.innerHTML;
}

/**
 * Validate URL (for future API integrations)
 */
export function validateURL(url) {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS in production
    if (CONFIG.ENVIRONMENT?.isProduction && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs allowed in production' };
    }
    return { valid: true, url: parsed.href };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Rate limiting for operations (prevents DoS)
 */
class RateLimiter {
  constructor(maxOps, windowMs) {
    this.maxOps = maxOps;
    this.windowMs = windowMs;
    this.operations = [];
  }

  tryOperation() {
    const now = Date.now();
    this.operations = this.operations.filter(time => now - time < this.windowMs);

    if (this.operations.length >= this.maxOps) {
      return {
        allowed: false,
        retryAfter: this.windowMs - (now - this.operations[0])
      };
    }

    this.operations.push(now);
    return { allowed: true };
  }
}

// Export rate limiter for file uploads (max 10 files per minute)
export const fileUploadLimiter = new RateLimiter(10, 60000);

export default {
  validateFile,
  sanitizeFilename,
  sanitizeText,
  sanitizeHTML,
  hashContent,
  hashPII,
  generateSecureId,
  generateUUID,
  validateDetectionConfig,
  formatBytes,
  validateURL,
  fileUploadLimiter
};
