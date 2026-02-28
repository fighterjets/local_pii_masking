# Performance Timing Feature

**Added:** 2026-02-15
**Version:** 0.1.0+

---

## Overview

The extension now displays real-time performance metrics to show users how fast PII detection is running.

## Features

### 1. Real-Time Elapsed Time (During Detection)

While processing a document, the progress bar shows elapsed time:

```
Detecting PII... (0.5s)
Processing chunk 3/10 (30%)... (2.1s)
```

**How it works:**
- Timer starts when detection begins
- Updates automatically with each progress message
- Shows milliseconds for <1 second, seconds for ≥1 second

### 2. Final Total Time (After Detection)

When detection completes, a success message shows the total time:

```
✅ Detected 15 PII items in 1.23s
```

**Format:**
- Shows milliseconds (ms) for times under 1 second
- Shows seconds (s) with 2 decimal places for times ≥1 second
- Includes detection count for context

## Implementation Details

### New Global Variables

```javascript
let detectionStartTime = null;  // Timestamp when detection starts
let detectionEndTime = null;    // Timestamp when detection completes
```

### Helper Functions

```javascript
formatElapsedTime(milliseconds)
// Formats time for display
// < 1000ms: "500ms"
// ≥ 1000ms: "1.23s"

getElapsedTime()
// Returns milliseconds since detectionStartTime
// Returns null if detection hasn't started
```

### Updated Functions

**showProgress()**
- Automatically appends elapsed time to progress messages
- Format: `${message} (${elapsed})`
- Only adds time if detection is in progress

**File Upload Handler**
- Sets `detectionStartTime` before calling `detectAllPII()`
- Sets `detectionEndTime` after detection completes
- Calculates `totalTime = detectionEndTime - detectionStartTime`
- Displays success message with total time

## User Benefits

1. **Transparency**: Users see exactly how fast the extension works
2. **Debugging**: Helps identify slow documents or performance issues
3. **Trust**: Demonstrates the extension's speed and efficiency
4. **Feedback**: Visual confirmation that processing is happening

## Examples

### Fast Detection (Small Document)
```
Detecting PII... (125ms)
✅ Detected 5 PII items in 185ms
```

### Medium Detection (With ML)
```
Detecting PII... (0.5s)
Processing chunk 1/5 (20%)... (1.2s)
Processing chunk 2/5 (40%)... (2.3s)
Processing chunk 3/5 (60%)... (3.5s)
Processing chunk 4/5 (80%)... (4.6s)
Processing chunk 5/5 (100%)... (5.7s)
✅ Detected 42 PII items in 5.82s
```

### Large Document
```
Detecting PII... (1.45s)
Processing chunk 5/10 (50%)... (3.21s)
✅ Detected 128 PII items in 6.54s
```

## Performance Overhead

The timing feature adds minimal overhead:
- `Date.now()` calls: ~1 microsecond each
- String formatting: negligible
- Total overhead: <1ms per detection

## Code Location

**File:** `extension/popup.js`

**Key Sections:**
- Lines ~408-410: Global timing variables
- Lines ~417-436: Helper functions (`formatElapsedTime`, `getElapsedTime`)
- Lines ~873-878: Updated `showProgress()` to show elapsed time
- Lines ~1044-1067: File upload handler with timing tracking

## Testing

To verify the feature works:

1. Upload a small TXT file (should show <1s)
2. Upload a large document with ML enabled (should show chunking progress)
3. Check console for timing values
4. Verify success message shows total time

## Future Enhancements

Potential improvements:
- Add timing breakdown (parsing vs detection vs masking)
- Show average detection speed (PII items per second)
- Performance history chart
- Comparison with previous runs

---

**Status:** ✅ Implemented and tested
**Performance Impact:** <1ms overhead
**User Experience:** Improved transparency
