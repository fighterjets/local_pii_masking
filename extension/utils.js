/**
 * Utility Functions Module
 * Reusable helper functions
 * Local PII Masking v2.3.5
 */

/**
 * Download a file to the user's device
 * @param {Blob} blob - The file data
 * @param {string} filename - The filename to save as
 */
export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Update progress with callback and yield to browser
 * @param {Function} progressCallback - Callback function
 * @param {string} message - Progress message
 */
export async function updateProgress(progressCallback, message) {
  if (progressCallback) {
    progressCallback(message);
    // Force browser to repaint by yielding control
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Get line number from character position in text
 * @param {string} text - The full text
 * @param {number} position - Character position
 * @returns {number|null} Line number or null if invalid
 */
export function getLineNumber(text, position) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  const beforePosition = text.substring(0, position);
  return beforePosition.split('\n').length;
}

/**
 * Get page number from character position in PDF
 * @param {number} position - Character position
 * @param {Object} pdfData - PDF metadata with textItems
 * @returns {number|null} Page number or null if not found
 */
export function getPageNumber(position, pdfData) {
  if (!pdfData || !pdfData.textItems) {
    return null;
  }

  let currentPos = 0;
  for (const item of pdfData.textItems) {
    if (!item || !item.str) continue;
    const itemEnd = currentPos + item.str.length;
    if (position >= currentPos && position < itemEnd) {
      return item.page;
    }
    currentPos = itemEnd + 1; // +1 for space/newline between items
  }

  return pdfData.numPages; // Default to last page if not found
}

/**
 * Get location string (page number or line number)
 * @param {number} position - Character position
 * @param {string} originalText - The original text
 * @param {Object} pdfData - PDF metadata (optional)
 * @param {string} fileType - MIME type of the file
 * @param {string} filename - Name of the file
 * @returns {string} Formatted location string
 */
export function getLocationString(position, originalText, pdfData, fileType, filename) {
  const isPDF = fileType === 'application/pdf' ||
                (filename && filename.endsWith('.pdf'));

  if (isPDF && pdfData) {
    const pageNum = getPageNumber(position, pdfData);
    return pageNum ? `Page ${pageNum}` : `Position ${position}`;
  } else {
    const lineNum = getLineNumber(originalText, position);
    return lineNum ? `Line ${lineNum}` : `Position ${position}`;
  }
}

/**
 * Get human-readable method label
 * @param {string} method - Detection method ('ner' or 'regex')
 * @returns {string} Human-readable label
 */
export function getMethodLabel(method) {
  if (method === 'ner') {
    return 'Model matched';
  } else if (method === 'regex') {
    return 'Pattern matched';
  }
  return method;
}
