# Testing the Performance Timing Feature

**Version:** 0.1.1
**Feature:** Real-time performance timing display

---

## Quick Test

1. **Reload the extension**
   ```
   1. Go to chrome://extensions/
   2. Find "Local PII Masking"
   3. Click reload (↻)
   ```

2. **Test with a small file**
   - Create `test.txt` with:
     ```
     John Smith
     Email: john.smith@example.com
     Phone: +65 91234567
     ```
   - Upload to extension
   - **Expected:** Progress shows timing like "Detecting PII... (150ms)"
   - **Expected:** Success message shows "✅ Detected 3 PII items in 0.21s"

3. **Test with a larger file**
   - Use a document with 1,000+ words
   - Upload to extension
   - **Expected:** Progress updates show increasing time
   - **Expected:** Final message shows total time (e.g., "✅ Detected 45 PII items in 1.87s")

---

## What to Look For

### During Processing (Progress Bar)

**Real-time elapsed time:**
```
Detecting PII... (0.5s)
```

**With ML model (chunked processing):**
```
Processing chunk 1/5 (20%)... (1.2s)
Processing chunk 2/5 (40%)... (2.3s)
Processing chunk 3/5 (60%)... (3.5s)
```

### After Processing (Status Message)

**Success message format:**
```
✅ Detected 15 PII items in 2.34s
```

**Single item (grammar check):**
```
✅ Detected 1 PII item in 0.15s
```

**Fast detection:**
```
✅ Detected 5 PII items in 125ms
```

---

## Timing Expectations

### Without ML Model (Regex Only)

| File Size | Expected Time | Example |
|-----------|---------------|---------|
| Small (1-10 KB) | 50-200ms | "185ms" |
| Medium (10-100 KB) | 200-800ms | "0.52s" |
| Large (100KB-1MB) | 1-3s | "1.87s" |

### With ML Model (Regex + NER)

| File Size | Expected Time | Example |
|-----------|---------------|---------|
| Small (1-10 KB) | 0.5-2s | "1.23s" |
| Medium (10-100 KB) | 2-8s | "5.47s" |
| Large (100KB-1MB) | 8-30s | "15.92s" |

*Note: Times vary based on CPU speed and document complexity*

---

## Console Output

Check browser console (F12) for timing logs:

```javascript
[UI] showProgress called: { show: true, message: 'Detecting PII...' }
[UI] Progress text updated to: Detecting PII... (0.5s)
[UI] Progress text updated to: Processing chunk 3/10 (30%)... (2.1s)
```

---

## Edge Cases to Test

### 1. Very Fast Detection (<100ms)
- **Test:** Upload tiny file with 1-2 PII items
- **Expected:** Shows milliseconds, e.g., "65ms"

### 2. Slow Detection (>10s)
- **Test:** Upload large document with ML enabled
- **Expected:** Shows seconds with decimals, e.g., "15.47s"
- **Expected:** Progress updates every chunk

### 3. No PII Detected
- **Test:** Upload file with no PII (e.g., Lorem ipsum)
- **Expected:** "✅ Detected 0 PII items in X.XXs"

### 4. Single PII Item
- **Test:** File with exactly one email
- **Expected:** "✅ Detected 1 PII item in X.XXs" (singular "item")

### 5. Change File and Upload Again
- **Test:** Upload file, then change and upload new file
- **Expected:** Timer resets, shows new timing for second file

---

## Troubleshooting

### Problem: No timing shown in progress

**Check:**
```javascript
// In browser console:
console.log(window.detectionStartTime); // Should show timestamp when detecting
console.log(window.getElapsedTime);     // Should be a function
```

**Solution:** Reload extension

### Problem: Timing shows "null" or "undefined"

**Cause:** Detection hasn't started yet

**Solution:** Normal if no file uploaded yet

### Problem: Final message missing time

**Check console for errors**

**Verify:** `formatElapsedTime()` function exists:
```javascript
console.log(typeof formatElapsedTime); // Should be "function"
```

---

## Success Criteria

✅ **Progress bar shows elapsed time during detection**
✅ **Success message shows total time after detection**
✅ **Time format is readable (ms or s)**
✅ **Grammar is correct (item vs items)**
✅ **Timing resets between file uploads**
✅ **Works with both TXT and PDF files**
✅ **Works with and without ML model**

---

## Performance Impact

The timing feature adds:
- **~1 microsecond** per `Date.now()` call (negligible)
- **<1ms** total overhead per detection
- **No user-visible performance impact**

---

**Status:** Ready for testing
**Expected Result:** All tests pass, timing displays correctly
