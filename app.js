/**
 * Main Application
 *
 * Ties together all components and handles UI interactions.
 */

import { CONFIG, validateEnvironment } from './config.js';
import { PIIDetector } from './core/pii-detector.js';
import { parseDocument } from './parsers/document-parser.js';
import { validateFile, fileUploadLimiter } from './utils/security.js';
import { downloadReport } from './core/report-generator.js';
import logger from './core/audit-logger.js';

// Global state
let detector = null;
let currentDocument = null;
let currentDetections = null;
let currentMaskedDocument = null;
let currentReport = null;

/**
 * Initialize application
 */
async function init() {
  logger.info('APP', 'Application starting');

  // Validate environment
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    showError(`Environment check failed: ${envCheck.errors.join(', ')}`);
    return;
  }

  logger.info('APP', 'Environment validated', {
    browser: navigator.userAgent,
    ...envCheck
  });

  // Initialize detector
  detector = new PIIDetector(CONFIG);

  // Setup UI event listeners
  setupEventListeners();

  logger.info('APP', 'Application initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const preloadBtn = document.getElementById('preloadBtn');

  // Upload zone click
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  // File selection
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');

    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Preload button
  preloadBtn.addEventListener('click', async () => {
    preloadBtn.disabled = true;
    document.getElementById('preloadStatus').style.display = 'none';

    // Show loading UI
    const loadingDiv = document.getElementById('modelLoading');
    loadingDiv.classList.add('active');

    hideStatus();

    const startTime = Date.now();
    let timeInterval;

    try {
      // Update timer every second
      timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('loadingTime').textContent = `${elapsed}s`;
      }, 1000);

      // Progress callback
      const onProgress = (stage, progress, message) => {
        updateLoadingStage(stage, progress, message);
      };

      await detector.preloadModel(onProgress);

      clearInterval(timeInterval);
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      document.getElementById('loadingTime').textContent = `${totalTime}s`;

      // Mark all stages complete
      setStageComplete('stage-init');
      setStageComplete('stage-download');
      setStageComplete('stage-load');
      setStageComplete('stage-ready');

      // Update progress to 100%
      document.getElementById('progressIndicator').classList.remove('indeterminate');
      document.getElementById('progressIndicator').style.width = '100%';
      document.getElementById('progressText').textContent = 'Complete!';
      document.getElementById('progressPercent').textContent = '100%';

      setTimeout(() => {
        loadingDiv.classList.remove('active');
        showSuccess(`ML model loaded successfully in ${totalTime}s!`);
        preloadBtn.textContent = 'Model Loaded ✓';
      }, 1500);

    } catch (error) {
      clearInterval(timeInterval);

      logger.error('APP', 'Model preload failed', {
        error: error.message,
        duration: Date.now() - startTime
      });

      // Show error state
      const currentStage = getCurrentActiveStage();
      if (currentStage) {
        setStageError(currentStage);
      }

      document.getElementById('progressText').textContent = 'Error occurred';
      document.getElementById('progressIndicator').classList.remove('indeterminate');
      document.getElementById('progressIndicator').style.background = 'var(--danger)';

      // Detailed error message
      let errorMessage = `Failed to load model: ${error.message}`;

      if (error.message.includes('timeout')) {
        errorMessage = 'Model download timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and firewall settings.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CDN access blocked. Please check Content Security Policy or use HTTPS.';
      }

      showError(errorMessage);

      setTimeout(() => {
        loadingDiv.classList.remove('active');
        preloadBtn.disabled = false;
        // Reset UI
        document.getElementById('progressIndicator').style.background = '';
        document.getElementById('progressIndicator').classList.add('indeterminate');
        resetStages();
      }, 3000);
    }
  });

  // Download buttons
  document.getElementById('downloadMasked').addEventListener('click', downloadMaskedDocument);
  document.getElementById('downloadReportJson').addEventListener('click', () => downloadReport(currentReport, 'json'));
  document.getElementById('downloadReportMd').addEventListener('click', () => downloadReport(currentReport, 'markdown'));
  document.getElementById('downloadLogs').addEventListener('click', () => logger.downloadLogs());
}

/**
 * Handle file upload
 */
async function handleFile(file) {
  logger.info('APP', 'File selected', {
    name: file.name,
    size: file.size,
    type: file.type
  });

  // Rate limiting check
  const rateLimitCheck = fileUploadLimiter.tryOperation();
  if (!rateLimitCheck.allowed) {
    showError(`Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter / 1000)} seconds.`);
    return;
  }

  // Validate file
  showInfo('Validating file...');
  const validation = await validateFile(file);

  if (!validation.valid) {
    showError(`File validation failed: ${validation.errors.join(', ')}`);
    logger.logSecurityEvent('File validation failed', 'medium', {
      filename: file.name,
      errors: validation.errors
    });
    return;
  }

  if (validation.warnings.length > 0) {
    logger.warn('APP', 'File validation warnings', {
      warnings: validation.warnings
    });
  }

  // Process file
  await processFile(file);
}

/**
 * Process uploaded file
 */
async function processFile(file) {
  try {
    // Show progress
    showProgress('Parsing document...');

    // Parse document
    const document = await parseDocument(file);
    currentDocument = document;

    logger.info('APP', 'Document parsed', {
      name: document.name,
      contentLength: document.content.length
    });

    // Update progress
    updateProgress('Detecting PII...');

    // Get masking strategy
    const maskingStrategy = document.getElementById('maskingStrategy').value;

    // Process document (detect + mask)
    const result = await detector.processDocument(document, {
      maskingStrategy,
      generateReportAfter: true
    });

    // Store results
    currentDetections = result.detections;
    currentMaskedDocument = result.maskedDocument;
    currentReport = result.report;

    // Hide progress
    hideProgress();

    // Display results
    displayResults(result);

    logger.info('APP', 'Processing complete', {
      detectionCount: result.detections.length,
      processingTime: result.metadata.processingTimeMs
    });

  } catch (error) {
    hideProgress();
    showError(`Processing failed: ${error.message}`);
    logger.error('APP', 'File processing error', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Display detection results
 */
function displayResults(result) {
  const { detections, report } = result;

  if (detections.length === 0) {
    showSuccess('No PII detected in this document!');
    return;
  }

  showSuccess(`Detected ${detections.length} PII item(s) in ${report.processing.durationMs}ms`);

  // Show results card
  document.getElementById('resultsCard').style.display = 'block';

  // Display summary
  displaySummary(report.summary);

  // Display detections
  displayDetections(detections);
}

/**
 * Display summary statistics
 */
function displaySummary(summary) {
  const summaryEl = document.getElementById('summary');
  summaryEl.innerHTML = '';

  // Total detections
  summaryEl.innerHTML += `
    <div class="summary-card">
      <div class="summary-value">${summary.totalDetections}</div>
      <div class="summary-label">Total Detections</div>
    </div>
  `;

  // By type
  Object.entries(summary.byType).forEach(([type, count]) => {
    summaryEl.innerHTML += `
      <div class="summary-card">
        <div class="summary-value">${count}</div>
        <div class="summary-label">${type}</div>
      </div>
    `;
  });

  // Confidence distribution
  summaryEl.innerHTML += `
    <div class="summary-card">
      <div class="summary-value">${summary.byConfidence.high}</div>
      <div class="summary-label">High Confidence</div>
    </div>
  `;
}

/**
 * Display individual detections
 */
function displayDetections(detections) {
  const listEl = document.getElementById('detectionsList');
  listEl.innerHTML = '';

  detections.forEach((detection, index) => {
    const confidenceClass = detection.confidence > 0.95 ? 'high' :
                           detection.confidence >= 0.85 ? 'medium' : 'low';

    const item = document.createElement('div');
    item.className = 'detection-item';
    item.innerHTML = `
      <div class="detection-type">#${index + 1}: ${detection.type}</div>
      <div class="detection-meta">
        Method: ${detection.method} |
        Position: ${detection.start}-${detection.end} |
        <span class="confidence ${confidenceClass}">
          ${(detection.confidence * 100).toFixed(1)}% confidence
        </span>
      </div>
    `;

    listEl.appendChild(item);
  });
}

/**
 * Download masked document
 */
function downloadMaskedDocument() {
  if (!currentMaskedDocument || !currentDocument) {
    showError('No masked document available');
    return;
  }

  const content = currentMaskedDocument.content;
  const filename = `masked_${currentDocument.name.replace(/\.[^/.]+$/, '')}.txt`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);

  logger.info('APP', 'Masked document downloaded', { filename });
}

/**
 * UI Helper Functions
 */
function showProgress(message) {
  const progress = document.getElementById('progress');
  const text = document.getElementById('progressText');
  progress.style.display = 'block';
  text.textContent = message;
  hideStatus();
}

function updateProgress(message) {
  document.getElementById('progressText').textContent = message;
}

function hideProgress() {
  document.getElementById('progress').style.display = 'none';
}

function showStatus(message, type) {
  const status = document.getElementById('statusMessage');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  hideProgress();
}

function showInfo(message) {
  showStatus(message, 'info');
}

function showSuccess(message) {
  showStatus(message, 'success');
}

function showError(message) {
  showStatus(message, 'error');
}

function hideStatus() {
  document.getElementById('statusMessage').style.display = 'none';
}

/**
 * Model Loading UI Helper Functions
 */
function updateLoadingStage(stage, progress, message) {
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  const progressIndicator = document.getElementById('progressIndicator');

  progressText.textContent = message || stage;

  // Update progress bar if we have a number
  if (typeof progress === 'number') {
    progressIndicator.classList.remove('indeterminate');
    progressIndicator.style.width = `${progress}%`;
    progressPercent.textContent = `${Math.round(progress)}%`;
  }

  // Update stage indicators
  if (stage === 'init') {
    setStageActive('stage-init');
  } else if (stage === 'download') {
    setStageComplete('stage-init');
    setStageActive('stage-download');
  } else if (stage === 'load') {
    setStageComplete('stage-download');
    setStageActive('stage-load');
  } else if (stage === 'ready') {
    setStageComplete('stage-load');
    setStageActive('stage-ready');
  }
}

function setStageActive(stageId) {
  const stage = document.getElementById(stageId);
  if (!stage) return;

  stage.className = 'stage-item active';
  stage.querySelector('.stage-icon').innerHTML = '<div class="spinner"></div>';
}

function setStageComplete(stageId) {
  const stage = document.getElementById(stageId);
  if (!stage) return;

  stage.className = 'stage-item complete';
  stage.querySelector('.stage-icon').textContent = '✓';
}

function setStageError(stageId) {
  const stage = document.getElementById(stageId);
  if (!stage) return;

  stage.className = 'stage-item error';
  stage.querySelector('.stage-icon').textContent = '✗';
}

function getCurrentActiveStage() {
  const stages = ['stage-init', 'stage-download', 'stage-load', 'stage-ready'];
  for (const stageId of stages) {
    const stage = document.getElementById(stageId);
    if (stage && stage.classList.contains('active')) {
      return stageId;
    }
  }
  return null;
}

function resetStages() {
  const stages = ['stage-init', 'stage-download', 'stage-load', 'stage-ready'];
  stages.forEach(stageId => {
    const stage = document.getElementById(stageId);
    if (stage) {
      stage.className = 'stage-item pending';
      stage.querySelector('.stage-icon').textContent = '○';
    }
  });
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
