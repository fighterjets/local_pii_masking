/**
 * PDF Parser
 *
 * Extracts text from PDF files using PDF.js (Mozilla)
 * Industry-standard library, used by Firefox browser.
 */

import logger from '../core/audit-logger.js';

// PDF.js will be loaded via CDN
let pdfjsLib = null;

/**
 * Initialize PDF.js library
 */
async function initPDFJS() {
  if (pdfjsLib) return pdfjsLib;

  try {
    // Load PDF.js from CDN
    pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');

    // Configure worker
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

    logger.info('PARSER', 'PDF.js initialized');
    return pdfjsLib;

  } catch (error) {
    logger.error('PARSER', 'Failed to load PDF.js', {
      error: error.message
    });
    throw new Error('PDF.js library failed to load');
  }
}

/**
 * Parse PDF file and extract text
 */
export async function parsePDF(file) {
  const startTime = performance.now();

  try {
    const pdfjs = await initPDFJS();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    logger.info('PARSER', 'Loading PDF document', {
      filename: file.name,
      size: file.size
    });

    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    logger.info('PARSER', `PDF loaded: ${pdf.numPages} pages`);

    // Extract text from all pages
    const textPages = [];
    let totalText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      textPages.push({
        pageNumber: pageNum,
        text: pageText
      });

      totalText += pageText + '\n';
    }

    const duration = performance.now() - startTime;
    logger.logPerformance('PDF parsing', duration, {
      filename: file.name,
      pages: pdf.numPages,
      textLength: totalText.length
    });

    return {
      content: totalText,
      metadata: {
        pageCount: pdf.numPages,
        pages: textPages,
        producer: pdf._pdfInfo?.producer || 'Unknown',
        version: pdf._pdfInfo?.version || 'Unknown'
      }
    };

  } catch (error) {
    logger.error('PARSER', 'PDF parsing failed', {
      filename: file.name,
      error: error.message
    });
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

export default { parsePDF };
