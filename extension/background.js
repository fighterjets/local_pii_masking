/**
 * Local PII Masking - Background Service Worker
 * Handles model caching and offline functionality
 */

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// ============================================================================
// MODEL CACHING MANAGEMENT
// ============================================================================

/**
 * Check if ML model is cached
 */
async function isModelCached() {
  try {
    const result = await chrome.storage.local.get(['modelCached', 'modelVersion']);
    return result.modelCached === true && result.modelVersion === '1.0';
  } catch (error) {
    console.error('[Background] Error checking model cache:', error);
    return false;
  }
}

/**
 * Cache ML model metadata
 */
async function cacheModelMetadata() {
  try {
    await chrome.storage.local.set({
      modelCached: true,
      modelVersion: '1.0',
      cachedAt: Date.now()
    });
    console.log('[Background] Model metadata cached');
  } catch (error) {
    console.error('[Background] Error caching model metadata:', error);
  }
}

/**
 * Clear cached model
 */
async function clearModelCache() {
  try {
    await chrome.storage.local.remove(['modelCached', 'modelVersion', 'cachedAt']);
    console.log('[Background] Model cache cleared');
  } catch (error) {
    console.error('[Background] Error clearing model cache:', error);
  }
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

// ============================================================================
// PERSISTENT WINDOW (replaces default_popup so it stays open on blur)
// ============================================================================

let piiMaskingTabId = null;

chrome.action.onClicked.addListener(async () => {
  // If our tab is still open, just focus it
  if (piiMaskingTabId !== null) {
    try {
      await chrome.tabs.update(piiMaskingTabId, { active: true });
      return;
    } catch {
      // Tab was closed externally; fall through to create a new one
      piiMaskingTabId = null;
    }
  }

  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html'),
    active: true
  });
  piiMaskingTabId = tab.id;
});

// Clear tracked ID when the user closes the tab
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === piiMaskingTabId) {
    piiMaskingTabId = null;
  }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkModelCache') {
    isModelCached().then(cached => {
      sendResponse({ cached });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'cacheModel') {
    cacheModelMetadata().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'clearModelCache') {
    clearModelCache().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'getStorageInfo') {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      sendResponse({
        bytesInUse: bytes,
        bytesInUseMB: (bytes / (1024 * 1024)).toFixed(2)
      });
    });
    return true;
  }
});

// ============================================================================
// CONTEXT MENU (Optional - for future webpage scanning feature)
// ============================================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');

  // Optional: Add context menu for scanning webpage text
  // Uncomment to enable:
  /*
  chrome.contextMenus.create({
    id: 'scanForPII',
    title: 'Scan for PII',
    contexts: ['selection']
  });
  */
});

// Optional: Handle context menu clicks
/*
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scanForPII') {
    // Send selected text to popup for scanning
    const selectedText = info.selectionText;
    chrome.storage.local.set({ scanText: selectedText });
  }
});
*/

console.log('[Service Worker] Background script loaded');
