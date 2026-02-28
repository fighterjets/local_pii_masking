/**
 * Document Parser Coordinator
 *
 * Routes documents to appropriate parser based on file type.
 */

import { parseText } from './text-parser.js';
import { parsePDF } from './pdf-parser.js';
import { parseDOCX } from './docx-parser.js';
import logger from '../core/audit-logger.js';

/**
 * Parse document based on type
 */
export async function parseDocument(file) {
  logger.info('PARSER', 'Starting document parsing', {
    filename: file.name,
    type: file.type,
    size: file.size
  });

  try {
    let result;

    switch (file.type) {
      case 'application/pdf':
        result = await parsePDF(file);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        result = await parseDOCX(file);
        break;

      case 'text/plain':
        result = await parseText(file);
        break;

      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }

    // Add common document metadata
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
      ...result
    };

  } catch (error) {
    logger.error('PARSER', 'Document parsing failed', {
      filename: file.name,
      type: file.type,
      error: error.message
    });
    throw error;
  }
}

export default { parseDocument };
