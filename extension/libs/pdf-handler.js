/**
 * PDF Handler for Local PII Masking Extension
 * Handles PDF parsing and redaction
 */

class PDFHandler {
  constructor() {
    this.pdfjsLib = null;
    this.PDFLib = null;
    this.initialized = false;
  }

  /**
   * Initialize PDF libraries
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load PDF.js
      if (!window.pdfjsLib) {
        const pdfjsUrl = chrome.runtime.getURL('libs/pdfjs/pdf.min.js');
        await this.loadScript(pdfjsUrl);

        // Configure worker
        if (window.pdfjsLib) {
          const workerUrl = chrome.runtime.getURL('libs/pdfjs/pdf.worker.min.js');
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        }
      }

      // Load pdf-lib
      if (!window.PDFLib) {
        const pdflibUrl = chrome.runtime.getURL('libs/pdflib/pdf-lib.min.js');
        await this.loadScript(pdflibUrl);
      }

      this.pdfjsLib = window.pdfjsLib;
      this.PDFLib = window.PDFLib;

      if (!this.pdfjsLib || !this.PDFLib) {
        throw new Error('PDF libraries not loaded. Run: ./download-pdf-libs.sh');
      }

      this.initialized = true;
      console.log('[PDF] Libraries initialized successfully');
    } catch (error) {
      console.error('[PDF] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Load external script
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Parse PDF and extract text with positions
   */
  async parsePDF(file) {
    await this.initialize();

    try {
      const originalArrayBuffer = await file.arrayBuffer();

      // Clone the ArrayBuffer because PDF.js will consume/detach it
      // We need to keep a copy for later redaction
      const arrayBufferForParsing = originalArrayBuffer.slice(0);

      const loadingTask = this.pdfjsLib.getDocument({ data: arrayBufferForParsing });
      const pdf = await loadingTask.promise;

      let fullText = '';
      const textItems = []; // Store text items with positions

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        for (const item of textContent.items) {
          if (item.str) {
            fullText += item.str + ' ';

            // Store position information
            // CRITICAL: PDF.js uses BOTTOM-LEFT origin, same as pdf-lib!
            // item.transform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
            // transform[5] = Y position of text baseline from BOTTOM of page
            const fontSize = Math.abs(item.transform[3]) || 12; // scaleY = font size

            textItems.push({
              text: item.str,
              page: pageNum,
              x: item.transform[4],
              y: item.transform[5], // Keep original Y (baseline position)
              width: item.width,
              height: fontSize || item.height || 12, // Use calculated font size
              pageHeight: viewport.height, // Store page height for conversion
              globalOffset: fullText.length - item.str.length - 1
            });
          }
        }

        fullText += '\n'; // Page break
      }

      return {
        text: fullText,
        textItems: textItems,
        numPages: pdf.numPages,
        arrayBuffer: originalArrayBuffer  // Return the untouched copy
      };
    } catch (error) {
      console.error('[PDF] Parse error:', error);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Create truly redacted PDF by flattening to images
   * This removes all underlying text by converting pages to images
   */
  async createRedactedPDF(originalArrayBuffer, detections, textItems, maskingStrategy) {
    await this.initialize();

    try {
      console.log('[PDF] Starting TRUE redaction (flatten to images)...');

      // Load the original PDF with PDF.js
      const loadingTask = this.pdfjsLib.getDocument({ data: originalArrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;

      // Map detections to positions
      const redactionBoxes = this.mapDetectionsToPDFPositions(detections, textItems);

      console.log(`[PDF] Creating ${redactionBoxes.length} redactions for ${detections.length} detections`);

      // Group redactions by page
      const redactionsByPage = {};
      for (const box of redactionBoxes) {
        if (!redactionsByPage[box.page]) {
          redactionsByPage[box.page] = [];
        }
        redactionsByPage[box.page].push(box);
      }

      // Create a new PDF document
      const newPdfDoc = await this.PDFLib.PDFDocument.create();

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`[PDF] Flattening page ${pageNum}/${pdf.numPages}...`);

        // Render page to canvas at high resolution
        const page = await pdf.getPage(pageNum);
        const scale = 2.0; // 2x resolution for quality
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Draw masking boxes on canvas
        const boxes = redactionsByPage[pageNum] || [];
        for (const box of boxes) {
          const padding = 3;

          // Convert coordinates from PDF (bottom-left origin) to Canvas (top-left origin)
          const x = (box.x - padding) * scale;
          const y = viewport.height - (box.y + box.height + padding) * scale;
          const w = (box.width + padding * 2) * scale;
          const h = (box.height + padding * 2) * scale;

          if (maskingStrategy === 'REDACTION') {
            // Black box — complete visual removal
            context.fillStyle = '#000000';
            context.fillRect(x, y, w, h);
          } else {
            // Yellow highlight + replacement text
            context.fillStyle = '#FFE066';
            context.fillRect(x, y, w, h);

            if (box.replacement) {
              context.fillStyle = '#000000';
              const fontSize = Math.min(h * 0.72, 13 * scale);
              context.font = `${fontSize}px Arial`;
              context.textBaseline = 'middle';
              // maxWidth clips text that is longer than the highlight box
              context.fillText(box.replacement, x + 2 * scale, y + h / 2, w - 4 * scale);
            }
          }
        }

        // Convert canvas to image
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());

        // Embed image in new PDF
        const image = await newPdfDoc.embedJpg(imageBytes);
        const newPage = newPdfDoc.addPage([viewport.width / scale, viewport.height / scale]);

        newPage.drawImage(image, {
          x: 0,
          y: 0,
          width: viewport.width / scale,
          height: viewport.height / scale,
        });
      }

      // Save the flattened PDF
      const pdfBytes = await newPdfDoc.save();

      console.log('[PDF] ✅ TRUE redaction complete - PDF flattened to images');
      console.log('[PDF] 🔒 Underlying text COMPLETELY REMOVED');

      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('[PDF] Redaction error:', error);
      throw new Error(`PDF redaction failed: ${error.message}`);
    }
  }

  /**
   * Map text detections to PDF coordinates
   */
  mapDetectionsToPDFPositions(detections, textItems) {
    const boxes = [];

    for (const detection of detections) {
      // Find text items that match this detection
      const matchingItems = this.findMatchingTextItems(
        detection.start,
        detection.end,
        textItems
      );

      // Only the first box of a multi-item detection gets the replacement text;
      // subsequent boxes just get the yellow background with no label.
      let isFirst = true;
      for (const item of matchingItems) {
        boxes.push({
          page: item.page,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          pageHeight: item.pageHeight,
          type: detection.type,
          replacement: isFirst ? (detection.replacement != null ? detection.replacement : '') : ''
        });
        isFirst = false;
      }
    }

    return boxes;
  }

  /**
   * Find text items that overlap with detection
   */
  findMatchingTextItems(start, end, textItems) {
    const matching = [];

    for (const item of textItems) {
      const itemStart = item.globalOffset;
      const itemEnd = item.globalOffset + item.text.length;

      // Check if there's any overlap
      if (itemStart < end && itemEnd > start) {
        matching.push(item);
      }
    }

    return matching;
  }

  /**
   * Get PDF metadata
   */
  async getPDFInfo(file) {
    await this.initialize();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const metadata = await pdf.getMetadata();

      return {
        numPages: pdf.numPages,
        title: metadata.info.Title || 'Untitled',
        author: metadata.info.Author || 'Unknown',
        creator: metadata.info.Creator || 'Unknown',
        producer: metadata.info.Producer || 'Unknown',
        creationDate: metadata.info.CreationDate || 'Unknown',
      };
    } catch (error) {
      console.error('[PDF] Info error:', error);
      return {
        numPages: 0,
        title: 'Unknown',
        error: error.message
      };
    }
  }
}

// Export for use in popup.js
window.PDFHandler = PDFHandler;
