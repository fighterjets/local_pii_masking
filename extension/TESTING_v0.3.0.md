# Testing Guide for v0.3.0 - Chinese BERT NER Model

**Version:** 0.3.0
**Test Date:** 2026-02-15
**Feature:** Dual NER models (English + Chinese) with smart language detection

---

## Pre-Testing Setup

### Step 1: Download Chinese NER Model

```bash
cd /Users/jackson/code/local_pii_masking/extension
./download-chinese-ner.sh
```

**Expected Output:**

```
============================================
Downloading Chinese BERT NER Model
============================================

Model: Xenova/bert-base-chinese-ner
Source: HuggingFace
Size: ~400-450 MB
Purpose: Named Entity Recognition for Chinese text

Downloading config files...
Downloading ONNX model file (~400 MB)...
This may take a few minutes depending on your connection...

============================================
Verification
============================================

✅ All files downloaded successfully!

Files:
total 853K
-rw-r--r--  config.json (~2 KB)
-rw-r--r--  tokenizer.json (~850 KB)
-rw-r--r--  tokenizer_config.json (~1 KB)
-rw-r--r--  special_tokens_map.json (~1 KB)

total 400M
-rw-r--r--  model_quantized.onnx (~400 MB)

Total size:
400M    models/bert-base-chinese-ner/

============================================
✅ Chinese NER Model Setup Complete!
============================================
```

**If download fails:**

- Check internet connection
- Check if HuggingFace is accessible: `ping huggingface.co`
- Try again: Model download can be interrupted
- Check disk space: Need ~450 MB free

### Step 2: Verify Model Files

```bash
ls -lh models/bert-base-chinese-ner/
ls -lh models/bert-base-chinese-ner/onnx/
```

**Expected Files:**

```
models/bert-base-chinese-ner/
├── config.json                    (1-3 KB)
├── tokenizer.json                 (800-900 KB)
├── tokenizer_config.json          (~1 KB)
├── special_tokens_map.json        (~1 KB)
└── onnx/
    └── model_quantized.onnx       (380-410 MB)
```

### Step 3: Reload Extension

1. Open Chrome/Edge/Brave browser
2. Navigate to `chrome://extensions/`
3. Find **"Local PII Masking - PII Detector"**
4. Click the **"Reload"** button (circular arrow icon)
5. Wait for reload to complete

### Step 4: Open Extension and Check Model Status

1. Click the extension icon in toolbar
2. Look for model status indicators:

**Expected UI:**

```
Configuration
─────────────
Auto-loading bundled ML models...

English Model: ✅ Loaded (104 MB)
Chinese Model: ✅ Loaded (400 MB)
```

1. Open browser console (F12)
2. Look for loading messages:

**Expected Console Output:**

```
[ML] Loading dual NER models (English + Chinese)...
[ML] Loading English NER model from: chrome-extension://...
[ML] ✅ English NER model loaded successfully
[ML] Loading Chinese NER model from: chrome-extension://...
[ML] ✅ Chinese NER model loaded successfully
[ML] ✅ Both NER models (English + Chinese) initialized
[ML] NER pipeline ready!
```

**If models don't load:**

- Check console for error messages
- Verify model files exist (Step 2)
- Try reloading extension again
- Check if files are corrupted (re-download)

---

## Test Cases

### Test Case 1: Chinese-Only Document

**Purpose:** Verify Chinese NER model detects unlabeled Chinese entities

**Test File:** `test_chinese_pii.txt` (sections with Chinese characters)

**Procedure:**

1. Open extension popup
2. Click "Choose File"
3. Select `test_chinese_pii.txt`
4. Click "Detect PII"
5. Wait for processing (~1-2 seconds)

**Expected Console Output:**

```
[Language Detection] {
  hasChinese: true,
  hasEnglish: false,
  hasRomanizedChinese: false
}
[NER] Running Chinese NER...
[NER] Skipped English model (no English content)
```

**Expected Detections:**

From Test Case 1 (Chinese Company Names):

```
#1: ORGANIZATION_CN 🟠 MEDIUM
上海顶峰精密制造有限公司
Position: X-Y | NER + Regex | 85-95% confidence
Method: ner-chinese, regex

#2: ORGANIZATION_CN 🟠 MEDIUM
北京华为技术有限公司
Position: X-Y | NER + Regex | 85-95% confidence
Method: ner-chinese, regex

#3: ORGANIZATION_CN 🟢 HIGH
阿里巴巴集团
Position: X-Y | NER | 85-95% confidence
Method: ner-chinese

#4: ORGANIZATION_CN 🟠 MEDIUM
中国工商银行
Position: X-Y | NER + Regex | 85-95% confidence
Method: ner-chinese, regex

#5: ORGANIZATION_CN 🟠 MEDIUM
深圳腾讯科技有限公司
Position: X-Y | NER + Regex | 85-95% confidence
Method: ner-chinese, regex
```

**Verification:**

- ✅ All 5 company names detected
- ✅ Confidence scores 85-95%
- ✅ Method shows "ner-chinese" or "ner-chinese, regex"
- ✅ Type is ORGANIZATION_CN (not ORGANIZATION)
- ✅ Console shows Chinese model ran
- ✅ Console shows English model skipped
- ✅ Processing time < 1.5 seconds

---

### Test Case 2: Romanized Chinese Names

**Purpose:** Verify detection of romanized Chinese names (Hanyu Pinyin)

**Test File:** `test_chinese_pii.txt` (Test Cases 2-4)

**Procedure:**

1. Create a new test file with romanized names:

```
Contact Information:
- Mr. ZHANG Wei
- Ms. LI Hua
- Dr. WANG Xiaoming
- ZHANG Wei
- Wang Xiaoming
```

2. Upload to extension
2. Detect PII

**Expected Console Output:**

```
[Language Detection] {
  hasChinese: false,
  hasEnglish: true,
  hasRomanizedChinese: true
}
[NER] Running English NER...
[NER] Romanized Chinese detected - also running Chinese model
[NER] Running Chinese NER...
```

**Expected Detections:**

```
#1: PERSON_CN 🟢 HIGH
Mr. ZHANG Wei
Position: X-Y | Regex | 90% confidence
Method: regex

#2: PERSON_CN 🟢 HIGH
Ms. LI Hua
Position: X-Y | Regex | 90% confidence
Method: regex

#3: PERSON_CN 🟢 HIGH
Dr. WANG Xiaoming
Position: X-Y | Regex | 90% confidence
Method: regex

#4: PERSON_CN 🟠 MEDIUM
ZHANG Wei
Position: X-Y | NER-English | 65-85% confidence
Method: ner-english

#5: PERSON_CN ⚪ LOW
Wang Xiaoming
Position: X-Y | NER-English | 40-65% confidence
Method: ner-english
```

**Verification:**

- ✅ Names with titles (Mr., Ms., Dr.) detected with HIGH confidence
- ✅ All caps names (ZHANG Wei) detected with MEDIUM confidence
- ✅ Title case names (Wang Xiaoming) detected with LOW confidence
- ✅ Both English AND Chinese models ran (romanized names detected)
- ✅ Confidence badges match expected levels

---

### Test Case 3: English-Only Document

**Purpose:** Verify Chinese model is skipped for English-only text

**Test File:** Create `test_english_only.txt`:

```
Employee Record

Name: John Smith
Department: Engineering
Company: Microsoft Corporation
Location: Seattle, WA
Email: john.smith@microsoft.com
Phone: +1 206 555 0123
```

**Procedure:**

1. Upload English-only test file
2. Detect PII
3. Monitor console output

**Expected Console Output:**

```
[Language Detection] {
  hasChinese: false,
  hasEnglish: true,
  hasRomanizedChinese: false
}
[NER] Running English NER...
[NER] Skipped Chinese model (no Chinese content)
```

**Expected Detections:**

```
#1: PERSON 🟢 HIGH
John Smith
Position: X-Y | NER-English | 90-95% confidence
Method: ner-english

#2: ORGANIZATION 🟢 HIGH
Microsoft Corporation
Position: X-Y | NER-English | 90-95% confidence
Method: ner-english

#3: LOCATION 🟢 HIGH
Seattle
Position: X-Y | NER-English | 85-90% confidence
Method: ner-english

#4: EMAIL 🟢 HIGH
john.smith@microsoft.com
Position: X-Y | Regex | 100% confidence
Method: regex

#5: PHONE 🟢 HIGH
+1 206 555 0123
Position: X-Y | Regex | 100% confidence
Method: regex
```

**Verification:**

- ✅ Only English NER ran
- ✅ Chinese NER was SKIPPED
- ✅ Processing time < 1 second (fast)
- ✅ Types are PERSON, ORGANIZATION, LOCATION (not _CN variants)
- ✅ No Chinese model overhead

---

### Test Case 4: Mixed Chinese-English Document

**Purpose:** Verify both models run and detections are merged correctly

**Test File:** Create `test_mixed.txt`:

```
Contract Agreement

Party A: 上海顶峰精密制造有限公司
Representative: Mr. ZHANG Wei (张伟)
Email: zhang.wei@dingfeng.com
Phone: +86 21 1234 5678
Address: 北京市朝阳区

Party B: Microsoft Corporation
Representative: John Smith
Email: john.smith@microsoft.com
Phone: +1 206 555 0123
Address: Seattle, WA
```

**Procedure:**

1. Upload mixed language test file
2. Detect PII
3. Verify both models run
4. Check deduplication works

**Expected Console Output:**

```
[Language Detection] {
  hasChinese: true,
  hasEnglish: true,
  hasRomanizedChinese: true
}
[NER] Running English NER...
[NER] Running Chinese NER...
```

**Expected Detections:**

```
#1: ORGANIZATION_CN 🟢 HIGH
上海顶峰精密制造有限公司
Position: X-Y | NER-Chinese + Regex | 95% confidence

#2: PERSON_CN 🟢 HIGH
ZHANG Wei
Position: X-Y | NER-English | 90% confidence

#3: PERSON_CN 🟢 HIGH
张伟
Position: X-Y | NER-Chinese | 88% confidence

#4: EMAIL 🟢 HIGH
zhang.wei@dingfeng.com
Position: X-Y | Regex | 100% confidence

#5: PHONE_CN 🟢 HIGH
+86 21 1234 5678
Position: X-Y | Regex | 100% confidence

#6: LOCATION_CN 🟢 HIGH
北京市朝阳区
Position: X-Y | NER-Chinese | 90% confidence

#7: ORGANIZATION 🟢 HIGH
Microsoft Corporation
Position: X-Y | NER-English | 90% confidence

#8: PERSON 🟢 HIGH
John Smith
Position: X-Y | NER-English | 92% confidence

#9: EMAIL 🟢 HIGH
john.smith@microsoft.com
Position: X-Y | Regex | 100% confidence

#10: PHONE 🟢 HIGH
+1 206 555 0123
Position: X-Y | Regex | 100% confidence

#11: LOCATION 🟢 HIGH
Seattle
Position: X-Y | NER-English | 88% confidence
```

**Verification:**

- ✅ BOTH models ran (English + Chinese)
- ✅ Chinese entities have _CN suffix (PERSON_CN, ORGANIZATION_CN, LOCATION_CN)
- ✅ English entities don't have _CN suffix (PERSON, ORGANIZATION, LOCATION)
- ✅ "张伟" and "ZHANG Wei" detected separately (both are PII)
- ✅ No duplicate detections (deduplication worked)
- ✅ Processing time 2-3 seconds (acceptable)
- ✅ All entity types detected correctly

---

### Test Case 5: Performance Benchmark

**Purpose:** Verify performance is optimized by smart language detection

**Procedure:**

**5a. Measure English-only processing:**

1. Upload English-only document (500-1000 words)
2. Note processing time in status message
3. Check console for model skip messages

**Expected:**

- Processing time: < 1.5 seconds
- Console shows: "[NER] Skipped Chinese model"

**5b. Measure Chinese-only processing:**

1. Upload Chinese-only document (500-1000 characters)
2. Note processing time
3. Check console

**Expected:**

- Processing time: < 1.5 seconds
- Console shows: "[NER] Skipped English model"

**5c. Measure mixed processing:**

1. Upload mixed Chinese-English document
2. Note processing time
3. Check console

**Expected:**

- Processing time: 2-4 seconds
- Console shows: Both models ran

**Verification:**

- ✅ English-only: < 1.5s (no Chinese overhead)
- ✅ Chinese-only: < 1.5s (no English overhead)
- ✅ Mixed: 2-4s (acceptable per plan)
- ✅ Smart detection prevents unnecessary model runs

---

### Test Case 6: Memory Usage

**Purpose:** Verify memory usage is within acceptable limits

**Procedure:**

1. Open Chrome Task Manager (Shift+Esc)
2. Find "Extension: Local PII Masking"
3. Note memory usage before loading models
4. Reload extension (models will load)
5. Note memory usage after models loaded
6. Upload a large mixed document
7. Note peak memory usage during inference

**Expected Memory Usage:**

```
Before model load:  ~50-100 MB
After model load:   ~600-800 MB (idle)
During inference:   ~900 MB - 1.2 GB (peak)
After inference:    ~600-800 MB (returns to idle)
```

**Verification:**

- ✅ Idle memory < 900 MB
- ✅ Peak memory < 1.3 GB
- ✅ Memory returns to idle after processing
- ✅ No memory leaks (stays stable after multiple documents)

**If memory too high:**

- Reload extension to clear memory
- Process smaller documents
- Close other browser tabs
- Consider increasing system RAM

---

### Test Case 7: Deduplication

**Purpose:** Verify overlapping detections are deduplicated correctly

**Test File:** Create test with intentional overlaps:

```
Contact: Zhang Wei works at 北京华为技术有限公司
Manager: 李华 (Li Hua) from 上海
```

**Expected Behavior:**

- If both models detect "Zhang Wei" at same position:
  - Keep detection with higher confidence
  - Remove lower confidence duplicate
- Company "北京华为技术有限公司":
  - May be detected by both regex AND NER
  - Should show combined method: "ner-chinese, regex"
  - Higher confidence (95%) from combined detection

**Verification:**

- ✅ No duplicate detections at same position
- ✅ Overlaps resolved by keeping higher confidence
- ✅ Combined detections show multiple methods
- ✅ Detection count is accurate (no inflation from overlaps)

---

## Verification Checklist

### Code Implementation

- ✅ `download-chinese-ner.sh` script created
- ✅ `detectLanguageFeatures()` function added to popup.js
- ✅ `detectPIIWithNER()` updated with dual model support
- ✅ `processNERResults()` function added
- ✅ `deduplicateNERDetections()` function added
- ✅ Model loading updated to dual pipelines
- ✅ popup.html has status indicators for both models
- ✅ manifest.json version bumped to 0.3.0

### Documentation

- ✅ CHANGELOG.md updated with v0.3.0 entry
- ✅ CHINESE_PII_DETECTION.md updated with NER section
- ✅ CHINESE_NER_MODEL.md created (comprehensive guide)
- ✅ All documentation mentions offline processing

### Functional Tests

- [ ] Chinese-only document detects unlabeled entities
- [ ] English-only document skips Chinese model (fast)
- [ ] Mixed document runs both models correctly
- [ ] Romanized Chinese names detected
- [ ] Smart language detection works
- [ ] Deduplication removes overlaps
- [ ] Memory usage < 1.3 GB peak
- [ ] No memory leaks after multiple documents
- [ ] Confidence badges show correct levels
- [ ] Entity types have correct _CN suffix

### Performance Tests

- [ ] English-only: < 1.5s processing
- [ ] Chinese-only: < 1.5s processing
- [ ] Mixed: 2-4s processing (acceptable)
- [ ] Large documents (3000+ tokens): 4-6s
- [ ] Console logs show which models ran/skipped
- [ ] No unnecessary model runs

### Edge Cases

- [ ] Empty document (no entities)
- [ ] Document with only numbers
- [ ] Very large document (10,000+ characters)
- [ ] Document with special characters
- [ ] Mixed Traditional + Simplified Chinese
- [ ] Code-switched text (中文English混合)

---

## Known Issues to Watch For

### Issue 1: Model Loading Failures

**Symptoms:**

- Model status shows "Not loaded"
- Console errors about missing files

**Causes:**

- Model files not downloaded
- Incorrect file permissions
- Corrupted downloads

**Solution:**

- Re-run `./download-chinese-ner.sh`
- Check file sizes are correct
- Reload extension

### Issue 2: Both Models Run on English-Only

**Symptoms:**

- English document takes 2-3 seconds
- Console shows both models ran

**Causes:**

- False positive in romanized name detection
- Text contains common Chinese surnames

**Impact:**

- Slight performance overhead
- Still acceptable (<3s)

**Not a bug if:**

- Text contains "WANG", "ZHANG", "LI" etc. as English words
- Smart detection intentionally runs both models

### Issue 3: Chinese Entities Not Detected

**Symptoms:**

- Chinese text in document
- No PERSON_CN/ORGANIZATION_CN/LOCATION_CN detections

**Causes:**

- Model not loaded properly
- Language detection failed
- Entity not in training data

**Debug:**

1. Check if model loaded: Console should show "✅ Chinese NER model loaded"
2. Check language detection: Console should show `hasChinese: true`
3. Verify Chinese characters: `/[\u4E00-\u9FFF]/.test(text)`

### Issue 4: Memory Warnings

**Symptoms:**

- Browser shows "Out of memory"
- Extension becomes slow

**Causes:**

- System RAM too low
- Too many browser tabs open
- Memory leak (rare)

**Solution:**

- Close other tabs
- Reload extension
- Process smaller documents
- Upgrade system RAM if needed

---

## Success Criteria

### Must Pass (Critical)

- ✅ Both models load successfully without errors
- ✅ English-only documents process in < 1.5s
- ✅ Chinese-only documents process in < 1.5s
- ✅ Mixed documents detect entities from both languages
- ✅ Smart language detection skips unnecessary models
- ✅ Memory usage stays < 1.3 GB peak
- ✅ No crashes or errors during normal use

### Should Pass (Important)

- ✅ Chinese entities detected with 85%+ confidence
- ✅ Romanized Chinese names detected correctly
- ✅ Deduplication works (no duplicate detections)
- ✅ Confidence badges show correct levels
- ✅ Console logs provide useful debugging info
- ✅ Entity types have correct _CN suffix

### Nice to Have (Optional)

- ✅ Processing time consistently under estimates
- ✅ Memory usage lower than expected
- ✅ High accuracy on edge cases
- ✅ No false positives on test documents

---

## Reporting Issues

If any test fails, report the following:

**Test Information:**

- Test case number and name
- Input document content (or path)
- Expected result
- Actual result

**System Information:**

- Browser: Chrome/Edge/Brave + version
- OS: macOS/Windows/Linux + version
- Extension version: 0.3.0
- RAM: Total system memory

**Console Output:**

- Copy all console messages
- Include any error messages
- Note which models ran/skipped

**Screenshots:**

- Extension UI showing model status
- Detection results
- Browser Task Manager showing memory

**Steps to Reproduce:**

1. Specific steps taken
2. Document content used
3. Settings/configuration

---

## Test Report Template

```
# Test Report: Chinese BERT NER Model (v0.3.0)

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Browser:** Chrome X.X.X
**OS:** macOS/Windows/Linux
**System RAM:** XGB

## Model Loading
- [ ] English NER: Loaded successfully
- [ ] Chinese NER: Loaded successfully
- [ ] Loading time: X.X seconds
- [ ] Memory after load: XXX MB

## Test Case 1: Chinese-Only
- [ ] Pass / Fail
- Detections: X entities found
- Processing time: X.X seconds
- Notes: [Any issues]

## Test Case 2: Romanized Names
- [ ] Pass / Fail
- Detections: X entities found
- Confidence levels: Correct / Incorrect
- Notes: [Any issues]

## Test Case 3: English-Only
- [ ] Pass / Fail
- Chinese model skipped: Yes / No
- Processing time: X.X seconds
- Notes: [Any issues]

## Test Case 4: Mixed Language
- [ ] Pass / Fail
- Both models ran: Yes / No
- Detections: X Chinese, Y English entities
- Processing time: X.X seconds
- Deduplication: Working / Issues
- Notes: [Any issues]

## Test Case 5: Performance
- English-only: X.Xs (< 1.5s target)
- Chinese-only: X.Xs (< 1.5s target)
- Mixed: X.Xs (2-4s target)
- [ ] Pass / Fail

## Test Case 6: Memory Usage
- Idle: XXX MB (< 900 MB target)
- Peak: XXX MB (< 1.3 GB target)
- After processing: XXX MB
- [ ] Pass / Fail

## Overall Assessment
- [ ] All critical tests passed
- [ ] All important tests passed
- [ ] Ready for production: Yes / No

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

**Testing Status:** Ready to begin
**Estimated Testing Time:** 30-45 minutes
**Required:** Chinese NER model downloaded (~400 MB)

For questions about testing, see CHINESE_NER_MODEL.md or main README.md
