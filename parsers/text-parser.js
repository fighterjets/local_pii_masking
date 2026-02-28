/**
 * Plain Text Parser
 *
 * Simple parser for plain text files.
 */

import logger from '../core/audit-logger.js';

/**
 * Parse plain text file
 */
export async function parseText(file) {
  const startTime = performance.now();

  try {
    const text = await file.text();

    const duration = performance.now() - startTime;
    logger.logPerformance('Text parsing', duration, {
      fileSize: file.size,
      textLength: text.length
    });

    return {
      content: text,
      metadata: {
        encoding: 'UTF-8',
        lineCount: text.split('\n').length
      }
    };

  } catch (error) {
    logger.error('PARSER', 'Text parsing failed', {
      filename: file.name,
      error: error.message
    });
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
}

export default { parseText };
