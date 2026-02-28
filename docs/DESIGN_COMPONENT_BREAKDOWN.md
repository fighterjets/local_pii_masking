# Component-by-Component Design Breakdown

## Component 1: Header

### Current Implementation
```css
.header {
  background: url('header_background.jpg') center / cover no-repeat;
  color: white;
  padding: 1rem;
  text-align: center;
}

.header h1 {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.header p {
  font-size: 0.85rem;
  opacity: 0.9;
}
```

### Target Design (from screenshots)
```css
.header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  padding: 20px 24px;
}

/* Two variants needed: */

/* Variant A: Default state (Screenshot 1) */
.header-default h1 {
  font-size: 20px;
  font-weight: 600;
}

.header-default p {
  font-size: 12px;
  opacity: 0.8;
}

/* Variant B: File loaded state (Screenshot 2, 3) */
.header-file {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.file-details h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.file-details p {
  font-size: 12px;
  opacity: 0.7;
}
```

### Changes Required
- [ ] Remove background image dependency
- [ ] Add gradient background
- [ ] Create two header variants (default vs file-loaded)
- [ ] Reduce text sizes
- [ ] Remove badges from header (move elsewhere)

---

## Component 2: Upload Zone

### Current Implementation
```css
.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  padding: 2rem;
  text-align: center;
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
```

### Target Design
```css
.upload-zone {
  margin: 24px;
  padding: 48px 32px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  text-align: center;
  background: #f8fafc;
}

.upload-zone .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-zone h3 {
  font-size: 16px;
  color: #1e293b;
  margin-bottom: 8px;
}

.upload-zone p {
  font-size: 13px;
  color: #64748b;
}
```

### Feature Checklist (NEW)
```css
.features {
  padding: 0 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.feature-item .check {
  width: 20px;
  height: 20px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.feature-item span {
  font-size: 14px;
  color: #334155;
}
```

### Changes Required
- [ ] Increase padding (2rem → 48px)
- [ ] Larger icon (2rem → 48px)
- [ ] Larger border radius (6px → 12px)
- [ ] Add feature checklist below upload zone
- [ ] Remove from collapsible card

---

## Component 3: Detection Summary (Stats Row)

### Current Implementation
```css
.summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.summary-card {
  padding: 0.3rem 0.6rem;
  background: #f8fafc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.summary-value {
  font-size: 0.85rem;
  font-weight: 700;
}

.summary-label {
  font-size: 0.75rem;
}
```

### Target Design
```css
.detection-summary {
  padding: 20px 24px;
  background: #fef3c7;  /* Warning/Info yellow */
  border-bottom: 1px solid #fde68a;
}

.detection-summary h4 {
  font-size: 13px;
  color: #92400e;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats {
  display: flex;
  gap: 16px;
}

.stat {
  text-align: center;
}

.stat .number {
  font-size: 24px;
  font-weight: 700;
  color: #b45309;
}

.stat .label {
  font-size: 11px;
  color: #a16207;
  text-transform: uppercase;
}
```

### Changes Required
- [ ] Replace horizontal cards with vertical stats
- [ ] Larger numbers (0.85rem → 24px)
- [ ] Add colored background banner
- [ ] Show warning icon with count

---

## Component 4: Detection Items List

### Current Implementation
```css
.detection-item {
  padding: 0.75rem;
  border-left: 3px solid #2563eb;
  background: rgba(37, 99, 235, 0.05);
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.detection-type {
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 0.25rem;
}

.detection-meta {
  color: #64748b;
  font-size: 0.8rem;
}
```

### Target Design
```css
.detections-list {
  padding: 16px;
}

.detection-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.detection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.detection-type {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detection-type .icon {
  font-size: 14px;
}

.confidence {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.confidence.high {
  background: #dcfce7;
  color: #166534;
}

.confidence.medium {
  background: #fef3c7;
  color: #92400e;
}

.masked-value {
  font-family: 'SF Mono', monospace;
  font-size: 13px;
  color: #64748b;
  background: #f1f5f9;
  padding: 6px 10px;
  border-radius: 4px;
}
```

### Changes Required
- [ ] Remove left border accent
- [ ] Add box border
- [ ] Add emoji icon per detection type
- [ ] Add confidence badge (pill style)
- [ ] Show detected value in monospace box

### Icon Mapping Needed
```javascript
const detectionIcons = {
  'PERSON': '👤',
  'NRIC': '🆔',
  'EMAIL': '✉️',
  'PHONE': '📞',
  'ORGANIZATION': '🏢',
  'LOCATION': '📍',
  'CREDIT_CARD': '💳',
  'ADDRESS': '🏠'
};
```

---

## Component 5: Document Preview Panel

### Current Implementation
Not fully implemented - uses editor placeholder

### Target Design
```css
.right-panel {
  flex: 1;
  padding: 32px;
  background: white;
  overflow-y: auto;
}

.doc-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.doc-header h2 {
  font-size: 20px;
  color: #1e293b;
  margin-bottom: 8px;
}

.doc-header p {
  font-size: 13px;
  color: #64748b;
}

.document-content {
  font-size: 15px;
  line-height: 1.8;
  color: #334155;
}

.pii-highlight {
  background: #fecaca;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  border-bottom: 2px solid #ef4444;
}

.paragraph {
  margin-bottom: 16px;
}
```

### Changes Required
- [ ] Add document header with title
- [ ] Add PII highlighting (red background)
- [ ] Better typography (15px, 1.8 line-height)
- [ ] Paragraph spacing

---

## Component 6: Redaction Success State

### Target Design (NEW COMPONENT)
```css
.redaction-summary {
  padding: 20px 24px;
  background: #ecfdf5;  /* Success green */
  border-bottom: 1px solid #a7f3d0;
}

.redaction-summary h4 {
  font-size: 13px;
  color: #065f46;
  margin-bottom: 12px;
}

.redaction-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.redaction-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #065f46;
}

.redaction-item .icon {
  font-size: 14px;
}

.download-section {
  padding: 24px;
}

.file-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.btn-download {
  width: 100%;
  padding: 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.security-note {
  margin-top: 16px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
  text-align: center;
}
```

### Changes Required
- [ ] New green header bar
- [ ] Itemized redaction list
- [ ] File preview card
- [ ] Download button with icon
- [ ] Security note banner

---

## Component 7: History View

### Target Design (NEW VIEW)
```css
.history-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 100px;
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.history-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 100px;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
}

.compliance-banner {
  margin-top: 24px;
  padding: 16px 24px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### Changes Required
- [ ] New table component
- [ ] Stats cards row (Files, PII Items, Avg Time)
- [ ] Export JSON button
- [ ] Compliance banner

---

## Button Standardization

### Current Buttons
```css
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-primary { background: #2563eb; }
.btn-success { background: #10b981; }
.btn-secondary { background: #64748b; }
```

### Target Buttons
```css
.btn {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}
```

### Changes Required
- [ ] Increase border radius (4px → 8px)
- [ ] Update colors
- [ ] Remove btn-success, use btn-primary
- [ ] Secondary becomes white/gray not gray fill

---

## Implementation Checklist Summary

### HTML Structure Changes
- [ ] Add feature list to upload state
- [ ] Create detection stats row
- [ ] Add confidence badges to detection items
- [ ] Create redaction success panel
- [ ] Create history view panel
- [ ] Update header for file-loaded state

### CSS Changes
- [ ] Update color variables
- [ ] Change panel width to 420px
- [ ] Add gradient header
- [ ] Redesign upload zone
- [ ] Create detection item cards
- [ ] Add document preview styling
- [ ] Create redaction summary component
- [ ] Create history table
- [ ] Standardize buttons

### JavaScript Changes
- [ ] Add detection type icon mapping
- [ ] Calculate and display confidence scores
- [ ] Toggle between header variants
- [ ] Render history table
- [ ] Handle view switching (upload/detect/redact/history)
