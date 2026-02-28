# Design Migration Plan: Current → Screenshot Design

## Executive Summary

This document outlines the migration from the current extension UI to the polished screenshot designs. The screenshots represent a cleaner, more professional interface with better visual hierarchy and consistent design patterns.

---

## Current vs. Target: Key Differences

### 1. Layout Structure

| Aspect | Current | Target (Screenshots) |
|--------|---------|---------------------|
| **Panel widths** | Main: 600px, Editor: flexible | Main: ~420px, Editor: flexible |
| **Container style** | Cards with shadows | Flat panels with subtle borders |
| **Spacing** | Compact (0.5-1rem) | Generous (1.5-2rem) |
| **Layout rhythm** | Stacked cards | Two-panel with clear separation |

### 2. Color System

| Element | Current | Target |
|---------|---------|--------|
| **Header background** | `header_background.jpg` image | Solid gradient: `#1e293b` → `#334155` |
| **Primary action** | `#2563eb` (blue-600) | `#3b82f6` (blue-500) |
| **Success states** | `#10b981` (emerald) | `#10b981` (keep) |
| **Warning/Info** | `#f59e0b` (amber) | `#3b82f6` (blue) for info |
| **Background** | `#f8fafc` (slate-50) | White panels on light gray bg |
| **Borders** | `#cbd5e1` (slate-300) | `#e2e8f0` (slate-200) |

### 3. Typography

| Element | Current | Target |
|---------|---------|--------|
| **Header title** | 1.25rem (20px) | 20px, weight 600 |
| **Card titles** | 1rem (16px), blue color | 14px, uppercase, slate-500 |
| **Body text** | 0.85-0.9rem | 14px |
| **Stats numbers** | 0.85rem | 28px, weight 700 |
| **Stats labels** | 0.75rem | 12px, uppercase |
| **Detection type** | Blue, weight 600 | 13px, dark, with icon |

### 4. Component Differences

#### Header
```
Current:
- Background image (header_background.jpg)
- Title + subtitle + badges (Offline, Local Models, Free)
- Centered text

Target:
- Gradient background (slate dark)
- File info icon + name + size
- Left-aligned, compact
```

#### Upload Zone
```
Current:
- Dashed border, centered
- "Click to select a file" text
- Max 30MB note
- Inside collapsible card

Target:
- Larger, more prominent
- Icon + "Drop your document here" + file types
- Feature list below
- No card wrapper
```

#### Detection Results
```
Current:
- Summary cards (horizontal, compact)
- Detection items (left border accent)
- Simple text display

Target:
- Stats row (big numbers, clear labels)
- Detection items with icons + confidence badges
- Pills showing confidence (95%, 100%)
- Red highlighted text in preview
```

#### Success/Redaction State
```
Current:
- Green status message
- Download button
- No itemized list

Target:
- Green header bar
- Itemized redaction list with icons
- File preview with download button
- Security note banner
```

#### History
```
Current:
- Not implemented as main view
- Would be a new feature

Target:
- Full-width table
- Stats cards at top
- Export JSON button
- Compliance banner
```

---

## Migration Strategy

### Phase 1: Foundation (Structural Changes)

1. **Update CSS Variables/Design Tokens**
   ```css
   :root {
     --color-primary: #3b82f6;
     --color-success: #10b981;
     --color-warning: #f59e0b;
     --color-header-bg: linear-gradient(135deg, #1e293b 0%, #334155 100%);
     --color-bg: #f8fafc;
     --color-panel: #ffffff;
     --color-border: #e2e8f0;
     --font-size-title: 20px;
     --font-size-body: 14px;
     --font-size-small: 12px;
     --spacing-lg: 24px;
     --spacing-md: 16px;
     --spacing-sm: 12px;
   }
   ```

2. **Restructure Layout**
   - Change `.main-panel` width from 600px to 420px
   - Remove card shadows, use flat design
   - Increase padding throughout
   - Standardize two-panel layout

3. **Update Header**
   - Remove background image, use gradient
   - Change layout for file info display
   - Update badge styles

### Phase 2: Component Updates

1. **Upload State (Screenshot 1)**
   - Redesign upload zone (larger, more prominent)
   - Add feature checklist below upload
   - Create empty state panel

2. **Detection State (Screenshot 2)**
   - New stats component (large numbers)
   - Detection items with icons
   - Confidence badges (pill style)
   - Document preview with red highlights

3. **Redaction State (Screenshot 3)**
   - Green success header bar
   - Itemized redaction list
   - Download file preview card
   - Security note banner

4. **History View (Screenshot 4)**
   - New table component
   - Stats cards row
   - Export functionality
   - Compliance banner

### Phase 3: Polish & Interactions

1. **Button Standardization**
   - Primary: Blue fill, white text
   - Secondary: White fill, gray border
   - Consistent padding and radius

2. **Icon System**
   - Add emoji icons to detection types
   - File type icons
   - Action icons (download, view)

3. **Animation/Transitions**
   - Smooth panel transitions
   - Hover states
   - Loading states

---

## Files to Modify

### Primary File: `extension/popup.html`

**CSS Sections to Update:**
1. `:root` variables (add design tokens)
2. `.main-panel` - change width, remove card styles
3. `.header` - gradient background, new layout
4. `.upload-zone` - larger, feature list
5. `.summary-card` / stats - new design
6. `.detection-item` - icons, confidence badges
7. New: `.redaction-summary` component
8. New: `.history-table` component

**HTML Structure Changes:**
1. Header: Add file info display variant
2. Upload: Move out of card, add feature list
3. Detection: New stats row layout
4. Redaction: New success state panel
5. Add: History view panel (hidden by default)

### Secondary File: `extension/popup.js`

**Updates Needed:**
1. Update element selectors if class names change
2. Add history view toggle functionality
3. Update detection rendering to include icons
4. Add confidence score display

---

## Implementation Priority

### P0 (Must Have for Visual Parity)
- [ ] Header gradient background
- [ ] Panel width change (600px → 420px)
- [ ] Upload zone redesign
- [ ] Detection stats row
- [ ] Detection items with icons/confidence
- [ ] Button style standardization

### P1 (High Value)
- [ ] Document preview highlighting
- [ ] Redaction success state
- [ ] File preview cards
- [ ] Security/compliance banners

### P2 (Nice to Have)
- [ ] History view implementation
- [ ] Advanced animations
- [ ] Empty state illustrations

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Keep selectors stable, test thoroughly |
| Extension popup size constraints | Medium | Test at 420px width on various screens |
| Performance with new styles | Low | New styles are simpler, should improve |
| User confusion from UI change | Medium | Maintain familiar workflow patterns |

---

## Success Criteria

1. ✅ All 4 screenshot designs can be replicated with the updated code
2. ✅ Existing functionality remains intact
3. ✅ No console errors
4. ✅ Responsive within extension popup constraints
5. ✅ Consistent styling across all states

---

## Appendix: Visual References

See `/chrome-store-assets/` for the target screenshot designs:
- `screenshot-1.png` - Upload state
- `screenshot-2.png` - Detection results
- `screenshot-3.png` - Redaction complete
- `screenshot-4.png` - History view
