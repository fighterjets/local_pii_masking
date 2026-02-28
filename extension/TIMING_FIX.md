# Processing Time Fix

**Date:** 2026-02-17
**Issue:** Total processing time incorrectly formatted
**Status:** ✅ Fixed

---

## Problem

The final success message showed incorrect processing time because:
1. `totalTime` was converted to seconds (divided by 1000)
2. Then passed to `formatElapsedTime()` which expects milliseconds
3. Result: Time displayed as milliseconds when it was actually seconds

**Example Bug:**
- Actual processing time: 2.5 seconds
- Displayed as: `"2.5ms"` ❌ (should be `"2.50s"`)

---

## Solution

Separate the timing into two variables:
- `totalTimeMs` - In milliseconds for display formatting
- `totalTimeSec` - In seconds for history storage

---

## Code Changes

### Before (Incorrect)

```javascript
// End timing detection
detectionEndTime = Date.now();
const totalTime = (detectionEndTime - detectionStartTime) / 1000; // Seconds

// Update history with detection results
updateHistoryWithDetections(currentDetections, totalTime, modelsInfo);

// Show success message
const timeStr = formatElapsedTime(totalTime); // ❌ Passing seconds to function expecting milliseconds
showStatus(`✅ Detected ${detectionCount} PII items in ${timeStr}`, 'success');
```

**Bug:** `formatElapsedTime()` expects milliseconds but receives seconds

---

### After (Correct)

```javascript
// End timing detection
detectionEndTime = Date.now();
const totalTimeMs = detectionEndTime - detectionStartTime; // Milliseconds
const totalTimeSec = totalTimeMs / 1000; // Seconds

// Update history with detection results (uses seconds)
updateHistoryWithDetections(currentDetections, totalTimeSec, modelsInfo);

// Show success message (uses milliseconds)
const timeStr = formatElapsedTime(totalTimeMs);
showStatus(`✅ Detected ${detectionCount} PII items in ${timeStr}`, 'success');
```

**Fixed:**
- ✅ `totalTimeMs` (milliseconds) → `formatElapsedTime()`
- ✅ `totalTimeSec` (seconds) → history storage

---

## Timing Includes Both Models

The timing correctly includes both English and Chinese models because:

```javascript
// Line 1965: Start timing
detectionStartTime = Date.now();

// Line 1969: Run ALL detection (includes both NER models if applicable)
const detectionResult = await detectAllPII(currentOriginalText);

// Line 1974: End timing
detectionEndTime = Date.now();

// Line 1975: Calculate total time
const totalTimeMs = detectionEndTime - detectionStartTime;
```

**Inside `detectAllPII()`:**
1. Regex pattern detection
2. English NER model (if language detected)
3. Chinese NER model (if language detected)

**Result:** Total time includes all detection methods!

---

## Examples

### Scenario 1: English-Only Document

**Processing:**
- Regex: 50ms
- English NER: 1200ms
- Total: 1250ms

**Display:** `✅ Detected 15 PII items in 1.25s` ✅

---

### Scenario 2: Mixed Language Document (Both Models)

**Processing:**
- Regex: 50ms
- English NER: 1200ms
- Chinese NER: 1400ms
- Total: 2650ms

**Display:** `✅ Detected 25 PII items in 2.65s` ✅

**This correctly shows the combined time!**

---

### Scenario 3: Small Document (Fast Processing)

**Processing:**
- Regex: 10ms
- English NER: 450ms
- Total: 460ms

**Display:** `✅ Detected 5 PII items in 460ms` ✅

**Note:** Shows milliseconds for times under 1 second

---

## formatElapsedTime() Function

```javascript
function formatElapsedTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;  // e.g., "450ms"
  }
  const seconds = (milliseconds / 1000).toFixed(2);
  return `${seconds}s`;  // e.g., "2.65s"
}
```

**Logic:**
- Input < 1000ms → Display as milliseconds (e.g., `"450ms"`)
- Input ≥ 1000ms → Convert to seconds (e.g., `"2.65s"`)

**Now receives correct input:** Milliseconds ✅

---

## History Storage

History metadata stores processing time in **seconds** (with decimal precision):

```javascript
{
  "processingTime": 2.65,  // Seconds (not milliseconds)
  "modelsUsed": ["regex", "ner-english", "ner-chinese"]
}
```

**Display in history:**
```html
<span>${item.processingTime.toFixed(2)}s</span>
<!-- Displays: "2.65s" -->
```

---

## Verification

**Test Cases:**

| Total Time (ms) | totalTimeMs | totalTimeSec | Display | History |
|-----------------|-------------|--------------|---------|---------|
| 450 | 450 | 0.45 | `"450ms"` | `0.45` |
| 1250 | 1250 | 1.25 | `"1.25s"` | `1.25` |
| 2650 | 2650 | 2.65 | `"2.65s"` | `2.65` |

**All correct!** ✅

---

## Related Files

- **popup.js** (Lines 1973-1993) - Fixed timing calculation
- **popup.js** (Line 482) - `formatElapsedTime()` function (unchanged)
- **popup.js** (Line 1030) - History time display (unchanged)

---

## Testing

**Test with mixed language document:**

1. Upload document with both English and Chinese text
2. Both NER models should run
3. Final message should show combined time (e.g., `"2.65s"`)
4. Check history → `processingTime: 2.65`
5. Verify time is reasonable for both models running

**Expected behavior:**
- English only: ~1-2s
- Chinese only: ~1-2s
- Both models: ~2-4s (sum of both)

---

**Status:** ✅ Fixed
**Verification:** JavaScript syntax valid
**Impact:** Correct time display for all scenarios, especially dual-model processing

