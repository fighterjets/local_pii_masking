/**
 * Application State Module
 * Encapsulates all application state with validation
 * Local PII Masking v2.3.5
 */

class AppState {
  constructor() {
    this.reset();
  }

  /**
   * Reset all state to initial values
   */
  reset() {
    this.detections = [];
    this.maskedText = '';
    this.originalText = '';
    this.filename = '';
    this.file = null;
    this.fileType = null;
    this.pdfData = null;
  }

  /**
   * Set the uploaded file
   * @param {File} file - The uploaded file object
   */
  setFile(file) {
    if (!file) {
      throw new Error('File cannot be null');
    }
    this.file = file;
    this.filename = file.name;
    this.fileType = file.type;
  }

  /**
   * Set the original text content
   * @param {string} text - The original text
   */
  setOriginalText(text) {
    this.originalText = text;
  }

  /**
   * Set the PII detections
   * @param {Array} detections - Array of detection objects
   */
  setDetections(detections) {
    this.detections = detections;
  }

  /**
   * Set the masked text
   * @param {string} text - The masked text
   */
  setMaskedText(text) {
    this.maskedText = text;
  }

  /**
   * Set PDF metadata
   * @param {Object} pdfData - PDF metadata object
   */
  setPDFData(pdfData) {
    this.pdfData = pdfData;
  }

  /**
   * Check if detections exist
   * @returns {boolean} True if detections exist
   */
  hasDetections() {
    return this.detections.length > 0;
  }

  /**
   * Check if masked text exists
   * @returns {boolean} True if masked text exists
   */
  hasMaskedText() {
    return this.maskedText.length > 0;
  }

  /**
   * Get file information
   * @returns {Object} File info object
   */
  getFileInfo() {
    return {
      filename: this.filename,
      fileType: this.fileType,
      hasFile: this.file !== null
    };
  }
}

// Export singleton instance
export const appState = new AppState();
