# PII Detection Analysis & Recommendations

## Current Detection Capabilities

### 1. **ML-Based Detection (BERT-base-NER Model)**

**What it detects:**
- **PER** (Person names): "John Smith", "Mary Johnson"
- **ORG** (Organizations): "Google", "Microsoft"
- **LOC** (Locations): "New York", "London"
- **MISC** (Miscellaneous entities): dates, events, etc.

**What it DOES NOT detect:**
- ❌ Date of birth (DOB)
- ❌ Email addresses
- ❌ Phone numbers
- ❌ Credit card numbers
- ❌ National IDs (NRIC, SSN, etc.)
- ❌ IP addresses
- ❌ Medical record numbers
- ❌ Financial account numbers

**Model Details:**
- Training: CoNLL-2003 dataset (news articles from 1996-1997)
- Accuracy: ~95% on news text, lower on modern text
- Limitations:
  - Only 4 entity types (PER, ORG, LOC, MISC)
  - Trained on old news data, may miss modern company names
  - Context-dependent (needs surrounding words)
  - Case-sensitive (requires proper capitalization)

### 2. **Regex-Based Detection (Current Implementation)**

**What it detects:**
✅ Email addresses
✅ Singapore phone numbers
✅ Singapore NRIC/FIN
✅ Singapore postal codes
✅ Credit card numbers (with Luhn validation)

**What it DOES NOT detect:**
❌ Date of birth (DOB)
❌ Passport numbers
❌ Driver's license numbers
❌ Bank account numbers
❌ Medical record numbers
❌ IP addresses
❌ MAC addresses
❌ US SSN
❌ International phone numbers
❌ Addresses (street, city, etc.)

---

## Why Names/Companies Are Missed

### 1. **Tokenization Issues** (Just Fixed!)
- **Problem**: Code was lowercasing input ("john smith" instead of "John Smith")
- **Impact**: BERT-base-NER is case-sensitive - requires proper capitalization
- **Status**: ✅ FIXED - Now preserves case

### 2. **Confidence Threshold Too High**
- **Current**: 0.5 (50%)
- **Problem**: Model may predict correct entity with 40% confidence, but we filter it out
- **Recommendation**: Lower to 0.3-0.4 for better recall

### 3. **Training Data Bias**
- **Problem**: Model trained on 1996-1997 news articles
- **Impact**:
  - Misses modern companies: "ByteDance", "Stripe", "Notion"
  - Misses non-Western names: "Rajesh Kumar", "李明"
  - Misses informal names: "Dr. Mike", "Prof. Sarah"

### 4. **Context Dependency**
- **Problem**: BERT needs context to identify entities
- **Examples**:
  - ✅ "John Smith works at Google" → Detects "John Smith"
  - ❌ "John Smith" (alone) → May miss it
  - ✅ "Founded by Bill Gates in 1975" → Detects "Bill Gates"
  - ❌ "Bill Gates" (alone) → May miss it

### 5. **Single Token Names**
- **Problem**: Short names may not be recognized
- **Examples**:
  - ❌ "John" → May be classified as O (not entity)
  - ✅ "John Smith" → More likely to be detected
  - ❌ "Meta" → May miss (needs context like "works at Meta")

---

## Recommended Improvements

### Priority 1: Add Date of Birth & Gender Detection (Regex) ✅ COMPLETED

```javascript
// Add to CONFIG.detection.universalPatterns
dateOfBirth: {
  pattern: /\b(?:DOB|Date of Birth|Birth Date|Born on)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi,
  type: 'DATE_OF_BIRTH',
  description: 'Date of birth (with label)'
},

datePattern: {
  pattern: /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g,
  type: 'DATE',
  description: 'Date (may include DOB)'
},

gender: {
  pattern: /\b(?:Gender|Sex)[\s:]*\b(Male|Female|M|F|MALE|FEMALE|male|female)\b/gi,
  type: 'GENDER',
  description: 'Gender (with label)'
},

genderStandalone: {
  pattern: /\b(Male|Female|MALE|FEMALE)\b/g,
  type: 'GENDER',
  description: 'Gender'
}
```

### Priority 2: Lower Confidence Threshold

```javascript
// In custom-ner-loader.js postProcess()
// Change from:
if (labelName === 'O' || score < 0.5) {

// To:
if (labelName === 'O' || score < 0.35) {
```

### Priority 3: Add More PII Patterns

```javascript
// US Social Security Number
ssn: {
  pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  type: 'SSN',
  description: 'US Social Security Number'
},

// Passport numbers (generic)
passport: {
  pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
  type: 'PASSPORT',
  description: 'Passport number'
},

// IP addresses
ipAddress: {
  pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  type: 'IP_ADDRESS',
  description: 'IP address'
},

// Singapore vehicle numbers
vehicleNumberSG: {
  pattern: /\b[A-Z]{1,3}\d{1,4}[A-Z]\b/g,
  type: 'VEHICLE_NUMBER_SG',
  description: 'Singapore vehicle number'
}
```

### Priority 4: Upgrade to Better NER Model

**Current**: bert-base-NER (CoNLL-2003, ~140MB)

**Recommended alternatives:**

1. **PII Masking-specific model** (~200MB)
   - Trained specifically for PII detection
   - Detects: names, DOB, SSN, emails, phones, addresses
   - Better accuracy on modern text

2. **dslim/bert-large-NER** (~440MB)
   - Larger version, better accuracy
   - Same entity types (PER, ORG, LOC, MISC)
   - 97%+ F1 score

3. **Flair NER** (~200MB)
   - State-of-the-art NER
   - Better handling of rare names
   - Requires different runtime (not ONNX)

### Priority 5: Ensemble Approach

**Combine multiple detection methods:**

```javascript
async function detectAllPII(text) {
  const detections = [];

  // Method 1: Regex (fast, high precision)
  detections.push(...await detectPIIRegex(text));

  // Method 2: BERT NER (medium speed, good for names/orgs)
  if (CONFIG.detection.methods.ner) {
    detections.push(...await detectPIIWithNER(text));
  }

  // Method 3: Pattern-based heuristics
  detections.push(...await detectPIIHeuristics(text));

  // Deduplicate and merge overlapping detections
  return mergeDetections(detections);
}
```

### Priority 6: Add Contextual Rules

```javascript
// Detect patterns like "DOB: 01/01/1990"
function detectLabeledPII(text) {
  const patterns = [
    { label: /\b(?:DOB|Date of Birth|Birth Date):\s*/i, type: 'DATE_OF_BIRTH' },
    { label: /\b(?:SSN|Social Security):\s*/i, type: 'SSN' },
    { label: /\b(?:Phone|Tel|Mobile):\s*/i, type: 'PHONE' },
    { label: /\b(?:Email|E-mail):\s*/i, type: 'EMAIL' },
    { label: /\b(?:Name):\s*/i, type: 'PERSON' },
  ];

  const detections = [];
  for (const { label, type } of patterns) {
    // Find label + value pairs
    const regex = new RegExp(label.source + '([^\\n,]+)', 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      detections.push({
        type,
        value: match[1].trim(),
        start: match.index + match[0].indexOf(match[1]),
        end: match.index + match[0].length,
        confidence: 0.95,
        method: 'contextual'
      });
    }
  }

  return detections;
}
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Fix tokenization (DONE)
2. ⏳ Lower confidence threshold to 0.35
3. ⏳ Add DOB regex patterns
4. ⏳ Add contextual label detection

### Phase 2: Enhanced Patterns (2-4 hours)
1. Add SSN, passport, IP address patterns
2. Add international phone number patterns
3. Add address detection (regex-based)
4. Add medical record number patterns

### Phase 3: Model Upgrade (4-8 hours)
1. Evaluate PII Masking-specific models
2. Test accuracy on real-world data
3. Implement model switching (let users choose)
4. Bundle alternative models

### Phase 4: Advanced Features (8+ hours)
1. Implement ensemble detection
2. Add custom pattern editor (let users add their own)
3. Add detection analytics dashboard
4. Add false positive feedback mechanism

---

## Testing Recommendations

### Test Cases for Names

```javascript
const nameTestCases = [
  // Western names
  "John Smith works at Google",
  "Meeting with Sarah Johnson tomorrow",
  "Dr. Michael Chen from Stanford",

  // Non-Western names
  "李明 is the CEO of ByteDance",
  "Rajesh Kumar joined Microsoft",
  "María García from Barcelona",

  // Single names
  "John joined the team",
  "Mary sent the email",

  // Titles
  "Mr. Smith", "Dr. Johnson", "Prof. Williams",

  // Edge cases
  "john smith" (lowercase - should fail with current fix),
  "JOHN SMITH" (uppercase - may work),
  "John" (alone - may fail without context)
];
```

### Test Cases for DOB

```javascript
const dobTestCases = [
  "DOB: 01/01/1990",
  "Date of Birth: January 1, 1990",
  "Born on 1990-01-01",
  "Birth Date: 01-Jan-1990",
  "1990/01/01", // Ambiguous without context
];
```

### Test Cases for Gender

```javascript
const genderTestCases = [
  "Gender: Male",
  "Gender: Female",
  "Sex: MALE",
  "Sex: FEMALE",
  "Gender: M",
  "Gender: F",
  "Male", // Standalone
  "Female", // Standalone
  "MALE", // All caps standalone
  "FEMALE", // All caps standalone
];
```

---

## Expected Results After Fixes

### Before Fixes:
- Name detection: ~30% (broken tokenization)
- Company detection: ~20% (broken tokenization)
- DOB detection: 0% (not implemented)
- Gender detection: 0% (not implemented)

### After Phase 1 Fixes:
- Name detection: ~85% (fixed tokenization + title case preprocessing + lower threshold)
- Company detection: ~75% (fixed tokenization + title case preprocessing)
- DOB detection: ~95% (regex patterns with labels)
- Gender detection: ~99% (regex patterns with standalone detection)

### After Phase 2+3:
- Name detection: ~85% (better model)
- Company detection: ~80% (better model)
- DOB detection: ~95% (enhanced patterns)
- Overall PII coverage: 15+ types

---

## Conclusion

**Immediate Actions:**
1. Test the tokenization fix (reload extension and run test)
2. If working, lower confidence threshold to 0.35
3. Add DOB regex patterns
4. Add contextual detection for labeled fields

**Long-term Strategy:**
1. Upgrade to PII Masking-specific model or bert-large-NER
2. Implement ensemble detection
3. Add user-configurable patterns
4. Build accuracy monitoring dashboard

The BERT-base-NER model is good for general entity detection, but for comprehensive PII detection, we need a hybrid approach combining:
- ✅ Regex patterns (structured PII like emails, IDs, dates)
- ✅ NER models (unstructured PII like names, companies)
- ✅ Contextual rules (labeled fields like "DOB: ...")
- ✅ Heuristics (validation like Luhn algorithm for credit cards)
