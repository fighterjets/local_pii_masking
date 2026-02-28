# Testing Word Document (DOCX) Support

**Version:** 0.2.0
**Feature:** Complete offline DOCX processing

---

## Quick Test

### 1. Download DOCX Libraries

```bash
cd /Users/jackson/code/local_pii_masking/extension
./download-docx-libs.sh
```

**Expected output:**
```
✅ Download complete!
Total size: 709K
```

### 2. Reload Extension

1. Go to `chrome://extensions/`
2. Find "Local PII Masking"
3. Click reload (↻)

### 3. Create Test DOCX File

Create a Word document with:
```
John Smith
Email: john.smith@company.com
Phone: +65 91234567
NRIC: S1234567D
Credit Card: 4532-1234-5678-9010
```

Save as `test.docx`

### 4. Upload and Test

1. Click extension icon
2. Click upload area
3. Select `test.docx`
4. Wait for processing

**Expected:**
- Progress shows: "Parsing document..."
- Then: "Detecting PII... (X.XXs)"
- Success: "✅ Detected 5 PII items in X.XXs"
- Download button shows: "Download Masked DOCX"

### 5. Download Masked DOCX

1. Select masking strategy (try "Redaction")
2. Click "Download Masked DOCX"
3. Open downloaded file in Word

**Expected:**
- File downloads as `redacted_test.docx`
- Opens in Microsoft Word
- PII replaced with black boxes (████)
- Black background highlighting visible
- **NO original PII data** - completely removed

---

## Console Checks

Open browser console (F12) and look for:

**Loading:**
```
[DOCX] DOCX Handler loaded successfully
```

**Parsing:**
```
[DOCX] Parsing DOCX file: test.docx
[DOCX] Successfully extracted text: 123 characters
```

**Creating:**
```
[DOCX] Creating redacted DOCX with 5 redactions
[DOCX] Created redacted DOCX file: test.docx
[DOCX] ℹ️  Created redacted DOCX with black boxes - NO original PII data included
[DOCX] ℹ️  PII locations are covered with █ characters and black background
```

---

## Test Cases

### ✅ Test 1: Small DOCX File
- **File**: <100 KB, 5-10 PII items
- **Expected time**: <500ms
- **Expected**: All PII detected and masked

### ✅ Test 2: Medium DOCX File
- **File**: 1-5 MB, 20-50 PII items
- **Expected time**: 1-3s
- **Expected**: Fast processing, all detections correct

### ✅ Test 3: Large DOCX File
- **File**: 10-30 MB
- **Expected time**: 3-10s
- **Expected**: Successful processing (may take longer)

### ✅ Test 4: Redaction with Black Boxes

**All detections get true redaction:**
```
John Smith → ██████████
john@email.com → ██████████████████████
+65 91234567 → ██████████████
S1234567D → █████████
```

**Visual appearance in Word:**
- Black boxes over PII text
- Black background highlighting
- Completely unreadable
- No original data recoverable

**Verify:**
- ✅ No PII visible in the document
- ✅ Black boxes appear where PII was detected
- ✅ Document can't be edited to reveal original PII

### ✅ Test 5: Special Characters

Test DOCX with:
- Unicode characters (é, ñ, 中文)
- Special symbols (&, <, >)
- Line breaks and paragraphs

**Expected**: All characters preserved correctly

### ✅ Test 6: Change File

1. Upload `test1.docx`
2. See detections
3. Click "Change File"
4. Upload `test2.docx`
5. See new detections

**Expected**: Old detections cleared, new ones shown

---

## Error Testing

### ❌ Test: No Libraries

1. Delete `libs/docx/` folder
2. Reload extension
3. Try to upload .docx

**Expected error:** "DOCX Handler not loaded"

### ❌ Test: Corrupted DOCX

1. Create a .txt file
2. Rename it to .docx
3. Upload

**Expected error:** "Failed to parse DOCX file"

### ❌ Test: Password-Protected DOCX

1. Create password-protected Word document
2. Upload

**Expected:** Parsing error (Mammoth can't read encrypted files)

---

## Performance Benchmarks

| File Size | PII Count | Expected Time |
|-----------|-----------|---------------|
| 10 KB | 5 | <200ms |
| 100 KB | 15 | 300-600ms |
| 1 MB | 50 | 1-2s |
| 5 MB | 150 | 3-5s |
| 10 MB | 300 | 5-8s |

*Times include parsing + detection + masking + DOCX creation*

---

## UI Checks

### Upload Area
- Shows: "TXT, PDF, DOCX files (Max 30MB)"

### File Input
- Accepts `.docx` files

### Download Button
- After DOCX upload, shows: "Download Redacted DOCX"
- After TXT upload, shows: "Download Masked"
- After PDF upload, shows: "Download Redacted PDF"

### Status Messages
- Success: "✅ Detected X PII items in Y.YYs"
- Download: "✅ Redacted Word document downloaded with black boxes over PII"

---

## Browser Compatibility

Test in:
- ✅ Chrome (v90+)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ⚠️ Firefox (requires different manifest)

---

## Success Criteria

✅ **All libraries load without errors**
✅ **DOCX files upload successfully**
✅ **Text extraction works**
✅ **PII detection runs on DOCX text**
✅ **Redacted DOCX files download**
✅ **Downloaded DOCX opens in Word**
✅ **Black boxes visible over PII locations**
✅ **NO original PII data in output file**
✅ **No network requests during processing**
✅ **Performance is acceptable (<5s for typical files)**

---

## Troubleshooting

### Libraries don't load

**Check:**
```bash
ls -lh libs/docx/
# Should show:
# mammoth.browser.min.js (628K)
# pizzip.min.js (78K)
# docx-handler.js (3K)
```

**Fix:** Run `./download-docx-libs.sh` again

### DOCX won't upload

**Check file input:**
```html
<input ... accept=".txt,.pdf,.docx,..." />
```

**Check console** for errors

### Output DOCX is corrupt

**Check:** Browser console for ZIP errors

**Try:**
- Different masking strategy
- Smaller test file
- Reload extension

### Download is blocked

**Check:** Browser download settings

**Allow:** Downloads from extension

---

## Report Template

```
## DOCX Support Test Results

Date: [DATE]
Browser: [Chrome/Edge/Brave] [VERSION]
Extension Version: 0.2.0

### Library Loading
- [ ] Mammoth.js loaded
- [ ] PizZip loaded
- [ ] DOCX Handler loaded

### File Upload
- [ ] Small DOCX (<100KB)
- [ ] Medium DOCX (1-5MB)
- [ ] Large DOCX (>10MB)

### Detection
- [ ] Regex patterns work
- [ ] ML/NER works (if enabled)
- [ ] All PII types detected

### Redacted Output
- [ ] DOCX file downloads as `redacted_*.docx`
- [ ] File opens in Microsoft Word
- [ ] Black boxes visible over PII
- [ ] Black background highlighting applied
- [ ] **NO original PII data** in the file

### Performance
- Average processing time: [X.XX]s
- Acceptable: [YES/NO]

### Issues Found:
1. [Description]

### Overall: [PASS/FAIL]
```

---

**Status:** Ready for testing
**Expected Result:** All tests pass, DOCX support works perfectly offline
