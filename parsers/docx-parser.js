/**
 * DOCX Parser
 *
 * Extracts text from Word documents using mammoth.js
 * Well-established library with 11k+ stars on GitHub.
 */

import logger from '../core/audit-logger.js';

// mammoth.js will be loaded via CDN
let mammoth = null;

/**
 * Initialize mammoth.js library
 */
async function initMammoth() {
  if (mammoth) return mammoth;

  try {
    // Load mammoth.js from CDN
    const module = await import('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
    mammoth = module.default || module;

    logger.info('PARSER', 'mammoth.js initialized');
    return mammoth;

  } catch (error) {
    logger.error('PARSER', 'Failed to load mammoth.js', {
      error: error.message
    });
    throw new Error('mammoth.js library failed to load');
  }
}

/**
 * Parse DOCX file and extract text
 */
export async function parseDOCX(file) {
  const startTime = performance.now();

  try {
    const mammothLib = await initMammoth();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    logger.info('PARSER', 'Parsing DOCX document', {
      filename: file.name,
      size: file.size
    });

    // Extract text from DOCX
    const result = await mammothLib.extractRawText({ arrayBuffer });

    const text = result.value;
    const messages = result.messages;

    // Log any warnings or errors from mammoth
    messages.forEach(message => {
      if (message.type === 'error') {
        logger.error('PARSER', `Mammoth error: ${message.message}`);
      } else if (message.type === 'warning') {
        logger.warn('PARSER', `Mammoth warning: ${message.message}`);
      }
    });

    const duration = performance.now() - startTime;
    logger.logPerformance('DOCX parsing', duration, {
      filename: file.name,
      textLength: text.length,
      warnings: messages.filter(m => m.type === 'warning').length,
      errors: messages.filter(m => m.type === 'error').length
    });

    return {
      content: text,
      metadata: {
        parserMessages: messages,
        wordCount: text.split(/\s+/).length
      }
    };

  } catch (error) {
    logger.error('PARSER', 'DOCX parsing failed', {
      filename: file.name,
      error: error.message
    });
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

export default { parseDOCX };
