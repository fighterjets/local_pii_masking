# v0.1.0 Testing Checklist

## Pre-Flight Checks ✅

- ✅ **Syntax validation**: All 7 modules pass Node.js syntax check
- ✅ **Import/Export matching**: All imports correctly match exports
- ✅ **Manifest CSP**: Allows ES6 modules ('self' script-src)
- ✅ **HTML updated**: Using `<script type="module">`
- ✅ **Line count**: popup.js reduced from 1,340 → 653 lines (51%)

---

## Manual Testing Steps

### Step 1: Reload Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Find "Local PII Masking"
4. Click the **reload icon** (circular arrow)
5. **Check for errors** in the extension card

**Expected:** No errors shown

---

### Step 2: Open Extension Popup

1. Click the Local PII Masking extension icon in toolbar
2. **Check browser console** (F12 → Console tab)

**Expected Console Output:**
```
[Local PII Masking] Extension loaded (v2.3.5)
[PDF] PDF.js initialized
[Worker] Web Workers disabled globally
[ONNX] Configuring ONNX Runtime...
[ONNX] ONNX Runtime configured with local WASM files
[CustomNER] Loading custom NER loader...
[CustomNER] Model path: chrome-extension://...
[CustomNER] Custom NER model loaded successfully
[ML Model] ✅ All ML components loaded successfully
```

**Expected UI:**
- Upload section visible
- Configuration section visible
- No error messages
- No "ML model failed" message

**If you see errors:**
- Take a screenshot
- Copy console error messages
- Check which import failed

---

### Step 3: Test Text File Upload

1. Create a test file `test.txt` with content:
```
John Smith
Email: john.smith@example.com
Phone: +65 91234567
NRIC: S1234567D
```

2. Click "Upload Document" zone
3. Select `test.txt`

**Expected:**
- File name and size displayed
- Progress bar animates
- Detections appear
- Console shows: `[UI] Progress callback received: Processing document...`

**Check Results:**
- Email detected
- Phone detected
- NRIC detected (if valid checksum)
- Name detected (if ML loaded)

---

### Step 4: Test PDF File Upload (if PDF libs installed)

1. Upload a PDF file with PII
2. Watch progress bar

**Expected:**
- PDF parses successfully
- Page numbers shown (not line numbers)
- Detections list shows "Page X" not "Line X"

---

### Step 5: Test Download Masked File

1. After uploading file with detections
2. Click "Download Masked"

**Expected:**
- File downloads
- Filename starts with `masked_`
- PII is replaced (check opened file)

---

### Step 6: Test Download Report

1. Click "Download Report"

**Expected:**
- JSON file downloads
- Filename: `pii-report-[timestamp].json`
- Contains:
  - metadata (timestamp, filename, totalDetections)
  - detections array with location, type, confidence

---

### Step 7: Test File Size Validation

1. Try uploading file > 30MB

**Expected:**
- Error message: "File too large (X MB). Maximum file size is 30MB."
- Status shown in red box

---

### Step 8: Test Progress Bar

1. Upload a large text file (>512 tokens if possible)
2. Watch progress bar

**Expected:**
- Progress bar fills left-to-right (not backwards!)
- Percentage updates in message
- Console shows chunk processing if >512 tokens

---

### Step 9: Test State Management

1. Upload file A
2. See detections
3. Click "Change File"
4. Upload file B
5. See detections for file B

**Expected:**
- Old detections cleared
- New detections shown
- No mixing of data

---

### Step 10: Test Error Handling

1. Try uploading unsupported file type (e.g., .docx)

**Expected:**
- Error message shown
- No crash
- Can recover and upload valid file

---

## Console Checks

### No Errors Expected

❌ **Should NOT see:**
- `Uncaught TypeError`
- `Module not found`
- `import statement outside module`
- `Unexpected token 'export'`
- `Cannot find module`

✅ **Should see:**
- `[Local PII Masking] Extension loaded (v2.3.5)`
- `[NER] Skipping UNKNOWN entity type` (normal)
- `[UI] Progress callback received`

---

## Module Loading Verification

### Check in Console:

```javascript
// Open console (F12) in extension popup
// Type these commands:

// 1. Check constants loaded
ML_CONFIG
// Should show error (not global - correct!)

// 2. Check app state not global
appState
// Should show error (not global - correct!)

// 3. Check imports worked
// If no errors on page load, imports worked!
```

---

## Regression Testing

Test that **nothing broke**:

### Functionality Checklist

- [ ] File upload works
- [ ] Regex detection works (email, phone, credit card)
- [ ] NER detection works (if ML loaded)
- [ ] Masking works (redaction, tokenization, partial)
- [ ] Download masked file works
- [ ] Download report works
- [ ] Progress bar shows correctly
- [ ] File size validation works (30MB limit)
- [ ] PDF parsing works (if PDF libs installed)
- [ ] Page numbers show for PDFs
- [ ] Line numbers show for TXT files
- [ ] Change file button works
- [ ] ML model auto-loads

---

## Performance Checks

1. **Extension Load Time**: Should be <1 second
2. **ML Model Load Time**: Should be ~5 seconds
3. **File Upload Response**: Should show file info immediately
4. **Detection Speed**: Similar to before refactoring
5. **Memory Usage**: Check Chrome Task Manager (Shift+Esc)

**Expected Memory:**
- Without ML: ~20-30 MB
- With ML: ~100-150 MB

---

## Rollback Instructions

If **anything is broken**:

```bash
cd /Users/jackson/code/local_pii_masking/extension

# Restore original popup.js
mv popup.js.backup popup.js

# Restore HTML (if you committed changes)
git checkout popup.html

# Reload extension in Chrome
```

Then report what broke!

---

## Success Criteria

✅ **All tests pass** → v0.1.0 is ready!
❌ **Any test fails** → Need debugging

---

## Debugging Common Issues

### Issue: "Uncaught SyntaxError: Cannot use import statement outside a module"

**Cause:** popup.html missing `type="module"`

**Fix:**
```html
<script type="module" src="popup.js"></script>
```

### Issue: "Failed to load module script: Expected JavaScript module"

**Cause:** Module has syntax error or wrong export/import

**Check:** Run `node -c [module].js` to verify syntax

### Issue: "Uncaught TypeError: Cannot read properties of undefined"

**Cause:** Import path wrong or module not exporting correctly

**Check:** Verify import paths are `./filename.js` (not missing `./` or `.js`)

### Issue: "ML model not loading"

**Cause:** Likely unrelated to refactoring

**Check:** Console for specific error message

---

## Test Report Template

After testing, fill this out:

```
## Test Results

Date: [DATE]
Chrome Version: [VERSION]
Extension Version: 2.3.5

### Tests Passed: X/10

- [ ] Extension loads without errors
- [ ] Popup opens
- [ ] TXT file upload
- [ ] PDF file upload
- [ ] Download masked
- [ ] Download report
- [ ] File size validation
- [ ] Progress bar
- [ ] State management
- [ ] Error handling

### Issues Found:

1. [Description]
   - Steps to reproduce
   - Console errors
   - Expected vs actual

### Overall Status: [PASS / FAIL]
```

---

**Ready to test!** 🧪

Let me know which tests pass/fail!
