# UI Redesign Plan - Updated

## Constraints (Confirmed)
- ✅ Keep panel resizer (main panel stays resizable, ~600px default)
- ✅ History view = existing processing history sub-panel
- ✅ Keep low/medium/high confidence (no percentage scores)
- ✅ Dynamic header: default title ↔ file info
- ✅ Only CSS/HTML changes, zero JavaScript logic changes
- ✅ No new features, pure visual refresh

---

## Visual Changes Summary

### 1. Header (Dynamic)

**State A: Default (No File)**
```
┌─────────────────────────────┐
│ 🔒 Local PII Masking        │  ← Gradient background
│ v2.3.5 — 100% Client-side   │  ← Dark slate gradient
└─────────────────────────────┘
```

**State B: File Loaded**
```
┌─────────────────────────────┐
│ 📄 File_Name.docx           │  ← Same gradient background
│ 24 KB • 2 pages             │  ← File icon + details
└─────────────────────────────┘
```

**CSS Changes:**
- Remove `header_background.jpg`
- Add gradient: `linear-gradient(135deg, #1e293b 0%, #334155 100%)`
- Create two header layout variants
- Keep existing header element, swap content via CSS classes

---

### 2. Upload State

**Current:**
- Upload zone inside collapsible card
- Small, compact design

**Target:**
- Upload zone prominent (no card wrapper)
- Feature checklist below

```
┌─────────────────────────────┐
│ 🔒 Local PII Masking        │  ← Header
│ v2.3.5 — 100% Client-side   │
├─────────────────────────────┤
│                             │
│      ┌─────────────┐        │
│      │    📁       │        │  ← Larger upload zone
│      │ Drop files  │        │
│      │ PDF,DOCX,TXT│        │
│      └─────────────┘        │
│                             │
│  ✓ 60+ Asian ID patterns    │  ← Feature list (NEW)
│  ✓ English & Chinese AI     │
│  ✓ Format-preserving DOCX   │
│  ✓ Zero data transmission   │
│  ✓ Works 100% offline       │
│                             │
└─────────────────────────────┘
```

**CSS Changes:**
- Remove card wrapper from upload section
- Increase upload zone padding
- Add `.features` list component
- Keep existing upload functionality

---

### 3. Detection Results State

**Current:**
- Horizontal summary cards
- Blue left-border detection items

**Target:**
- Stats row (big numbers)
- Bordered detection cards with icons

```
┌─────────────────────────────┐
│ 📄 Employee_Data.docx       │  ← File info header
│ 24 KB • 2 pages             │
├─────────────────────────────┤
│ ⚠️ 8 PII Items Detected     │  ← Warning banner
│                             │
│  3    2    2    1           │  ← Stats row
│ NAMES NRIC EMAIL PHONE      │
│                             │
├─────────────────────────────┤
│ 👤 PERSON          [HIGH]   │  ← Detection item
│ Tan Wei Ming                │
├─────────────────────────────┤
│ 🆔 NRIC/FIN        [HIGH]   │
│ S1234567D                   │
├─────────────────────────────┤
│ ✉️ EMAIL           [HIGH]   │
│ weiming@email.com           │
├─────────────────────────────┤
│ [Skip]  [Redact All]        │  ← Action buttons
└─────────────────────────────┘
```

**CSS Changes:**
- New `.detection-summary` banner (yellow/amber)
- New `.stats-row` component (big numbers)
- Update `.detection-item` to bordered card style
- Add emoji icons per detection type
- Update confidence badges to pill style (green/orange/gray)

**Confidence Badge Updates:**
```css
.confidence-badge.high {
  background: #dcfce7;      /* Light green bg */
  color: #166534;           /* Dark green text */
  border-radius: 10px;      /* Pill shape */
  padding: 2px 10px;
}
.confidence-badge.medium {
  background: #fef3c7;      /* Light amber bg */
  color: #92400e;           /* Dark amber text */
}
.confidence-badge.low {
  background: #f3f4f6;      /* Light gray bg */
  color: #4b5563;           /* Dark gray text */
}
```

---

### 4. Redaction Success State

**Current:**
- Green status message
- Simple download button

**Target:**
- Green success banner
- Itemized redaction list
- File preview card

```
┌─────────────────────────────┐
│ ✓ Redaction Complete        │  ← Green header
│ 8 items masked              │
├─────────────────────────────┤
│ ✅ Redacted Items           │  ← Itemized list
│ 👤 3 Person Names           │
│ 🆔 2 NRIC Numbers           │
│ ✉️ 2 Email Addresses        │
│ 📞 1 Phone Number           │
├─────────────────────────────┤
│ Download Redacted File      │
│ ┌─────────────────────┐     │
│ │ 📄 File_REDACTED.doc│     │  ← File preview card
│ │ 22 KB • Formatted   │     │
│ └─────────────────────┘     │
│                             │
│ [⬇ Download Document]      │  ← Primary button
│                             │
│ 🔒 Original never uploaded  │  ← Security note
└─────────────────────────────┘
```

**CSS Changes:**
- New `.success-header` component (green gradient)
- New `.redaction-list` component
- New `.file-preview-card` component
- New `.security-note` banner (yellow)

---

### 5. Processing History State (Existing)

**Current:**
- Card-based list
- Compact design

**Target:**
- Full-width table style
- Stats cards at top

```
┌─────────────────────────────┐
│ 📋 Processing History    [Export] [Clear]  ← Header with actions
├─────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐       │
│ │ 24 │ │156 │ │2.3s│       │  ← Stats cards
│ │Files│ │PII │ │Avg │       │
│ └────┘ └────┘ └────┘       │
├─────────────────────────────┤
│ FILE      DETECT  MODEL TIME│  ← Table header
│ 📄 Doc1   8 items Regex 1.8s│
│ 📑 Doc2  12 items Regex 2.4s│
│ 📝 Doc3  15 items CN NER 3.1s│
├─────────────────────────────┤
│ ✓ Compliance: SHA-256 hashes│  ← Compliance banner
└─────────────────────────────┘
```

**CSS Changes:**
- Keep existing history card structure
- Update `.history-item` to table-row layout
- Add `.stats-cards` row at top
- New `.compliance-banner` component

---

## CSS Architecture

### New/Updated Components

```css
/* === HEADER VARIANTS === */
.header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 16px 20px;
}

.header-default { }
.header-file {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* === FEATURES LIST === */
.features-list {
  padding: 0 20px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}
.feature-check {
  width: 18px;
  height: 18px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
}

/* === DETECTION SUMMARY BANNER === */
.detection-banner {
  padding: 16px 20px;
  background: #fef3c7;
  border-bottom: 1px solid #fde68a;
}
.detection-banner-title {
  font-size: 13px;
  color: #92400e;
  margin-bottom: 10px;
}

/* === STATS ROW === */
.stats-row {
  display: flex;
  gap: 16px;
}
.stat-item {
  text-align: center;
}
.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #b45309;
}
.stat-label {
  font-size: 11px;
  color: #a16207;
  text-transform: uppercase;
}

/* === DETECTION ITEM CARD === */
.detection-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
}
.detection-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.detection-type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.detection-value {
  font-family: monospace;
  font-size: 13px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
}

/* === CONFIDENCE BADGES (Update existing) === */
.confidence-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  text-transform: uppercase;
}
.confidence-badge.high {
  background: #dcfce7;
  color: #166534;
}
.confidence-badge.medium {
  background: #fef3c7;
  color: #92400e;
}
.confidence-badge.low {
  background: #f3f4f6;
  color: #4b5563;
}

/* === SUCCESS HEADER === */
.success-header {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  padding: 16px 20px;
}

/* === FILE PREVIEW CARD === */
.file-preview-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* === SECURITY NOTE === */
.security-note {
  background: #fef3c7;
  color: #92400e;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
}

/* === HISTORY TABLE STYLE === */
.history-table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 80px;
  padding: 12px 16px;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}
.history-table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 80px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
}

/* === COMPLIANCE BANNER === */
.compliance-banner {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #1e40af;
}
```

---

## Implementation Order

### Phase 1: Header & Foundation
1. Update header gradient (remove image)
2. Create header variants CSS
3. Update base typography/spacing

### Phase 2: Upload State
1. Remove card wrapper from upload
2. Style upload zone
3. Add features list HTML/CSS

### Phase 3: Detection State
1. Create detection banner
2. Create stats row
3. Update detection items to card style
4. Add detection type icons
5. Update confidence badge styles

### Phase 4: Redaction State
1. Create success header
2. Create redaction list
3. Create file preview card
4. Create security note

### Phase 5: History State
1. Update history items to table style
2. Add stats cards
3. Create compliance banner

---

## Files to Modify

1. **`extension/popup.html`**
   - CSS: Lines ~1-1560
   - HTML: Lines ~1564-1885

2. **No JavaScript changes** (per constraint)
   - All dynamic content must work with existing JS selectors
   - Use CSS classes that already exist or add new ones without breaking selectors

---

## Key Selector Preservation

These selectors must continue to work:
- `#uploadZone`
- `#fileInput`
- `#fileName`
- `#fileSize`
- `.detection-item`
- `.summary-card`
- `.history-item`
- `#historyList`
- `#exportHistory`
- `#clearHistory`
- All button IDs
- All form element IDs

Any new CSS classes should be additive only.
