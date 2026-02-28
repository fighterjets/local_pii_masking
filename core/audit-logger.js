/**
 * Audit Logger
 *
 * Comprehensive logging system for compliance and debugging.
 * Maintains in-memory audit trail of all PII detection and masking operations.
 */

import { CONFIG } from '../config.js';
import { generateUUID } from '../utils/security.js';

class AuditLogger {
  constructor() {
    this.logs = [];
    this.sessionId = generateUUID();
    this.sessionStart = new Date().toISOString();
  }

  /**
   * Log a message with level and metadata
   */
  log(level, category, message, metadata = {}) {
    if (!this.shouldLog(level)) return;

    const entry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level,
      category,
      message,
      metadata: this.sanitizeMetadata(metadata)
    };

    // Add stack trace for errors
    if (level === 'ERROR' && CONFIG.audit.includeStackTraces) {
      entry.stack = new Error().stack;
    }

    this.logs.push(entry);

    // Prevent memory overflow
    if (this.logs.length > CONFIG.audit.maxLogEntries) {
      this.logs.shift();
    }

    // Console output for development
    this.consoleOutput(entry);

    return entry.id;
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const configLevel = CONFIG.audit.logLevel;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  /**
   * Sanitize metadata to prevent PII leakage in logs
   */
  sanitizeMetadata(metadata) {
    const sanitized = { ...metadata };

    // Never log raw PII values - only hashes
    if (sanitized.value) {
      delete sanitized.value;
    }

    if (sanitized.originalText) {
      delete sanitized.originalText;
    }

    return sanitized;
  }

  /**
   * Console output for debugging
   */
  consoleOutput(entry) {
    const prefix = `[${entry.level}] ${entry.category}:`;
    const message = entry.message;

    switch (entry.level) {
      case 'DEBUG':
        console.debug(prefix, message, entry.metadata);
        break;
      case 'INFO':
        console.info(prefix, message, entry.metadata);
        break;
      case 'WARN':
        console.warn(prefix, message, entry.metadata);
        break;
      case 'ERROR':
        console.error(prefix, message, entry.metadata, entry.stack);
        break;
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(category, message, metadata) {
    return this.log('DEBUG', category, message, metadata);
  }

  info(category, message, metadata) {
    return this.log('INFO', category, message, metadata);
  }

  warn(category, message, metadata) {
    return this.log('WARN', category, message, metadata);
  }

  error(category, message, metadata) {
    return this.log('ERROR', category, message, metadata);
  }

  /**
   * Log file processing start
   */
  logFileProcessingStart(filename, size, type) {
    return this.info('FILE_PROCESSING', 'File processing started', {
      filename,
      size,
      type
    });
  }

  /**
   * Log file processing completion
   */
  logFileProcessingComplete(filename, durationMs, detectionCount) {
    return this.info('FILE_PROCESSING', 'File processing completed', {
      filename,
      durationMs,
      detectionCount
    });
  }

  /**
   * Log PII detection
   */
  logDetection(type, method, confidence, position, hash) {
    return this.info('DETECTION', `PII detected: ${type}`, {
      type,
      method,
      confidence,
      position,
      valueHash: hash
    });
  }

  /**
   * Log masking operation
   */
  logMasking(type, strategy, position, originalHash, maskedHash) {
    return this.info('MASKING', `PII masked: ${type}`, {
      type,
      strategy,
      position,
      originalHash,
      maskedHash
    });
  }

  /**
   * Log model loading
   */
  logModelLoad(modelId, success, loadTimeMs) {
    if (success) {
      return this.info('MODEL', `Model loaded: ${modelId}`, { loadTimeMs });
    } else {
      return this.error('MODEL', `Model failed to load: ${modelId}`, { loadTimeMs });
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event, severity, details) {
    const level = severity === 'high' ? 'ERROR' : 'WARN';
    return this.log(level, 'SECURITY', event, details);
  }

  /**
   * Log performance metric
   */
  logPerformance(operation, durationMs, metadata = {}) {
    return this.debug('PERFORMANCE', `${operation}: ${durationMs}ms`, {
      durationMs,
      ...metadata
    });
  }

  /**
   * Get all logs
   */
  getAllLogs() {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category) {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs for time range
   */
  getLogsInTimeRange(startTime, endTime) {
    return this.logs.filter(log => {
      const timestamp = new Date(log.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStart,
      sessionEnd: new Date().toISOString(),
      totalEntries: this.logs.length,
      logs: this.logs,
      summary: this.generateSummary()
    };
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const summary = {
      byLevel: {},
      byCategory: {},
      errors: this.logs.filter(l => l.level === 'ERROR').length,
      warnings: this.logs.filter(l => l.level === 'WARN').length
    };

    this.logs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
    });

    return summary;
  }

  /**
   * Clear all logs
   */
  clear() {
    const oldSessionId = this.sessionId;
    this.logs = [];
    this.sessionId = generateUUID();
    this.sessionStart = new Date().toISOString();

    this.info('SYSTEM', 'Logs cleared', { previousSessionId: oldSessionId });
  }

  /**
   * Download logs as file
   */
  downloadLogs(filename = 'audit-logs.json') {
    const data = JSON.stringify(this.exportLogs(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    this.info('EXPORT', 'Audit logs downloaded', { filename });
  }
}

// Singleton instance
const logger = new AuditLogger();

export default logger;
export { AuditLogger };
