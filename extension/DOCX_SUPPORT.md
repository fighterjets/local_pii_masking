# Word Document (DOCX) Support

**Version:** 0.3.0
**Updated:** 2026-02-18
**Status:** ✅ Fully Functional — Format-Preserving Round-Trip Redaction

---

## Overview

Local PII Masking processes `.docx` files with **full formatting preservation**:

- ✅ Tables, bold, italic, images, styles, headers, and footers are all kept intact
- ✅ Only the `<w:t>` text nodes containing PII are modified — everything else is untouched
- ✅ 100% offline — no network calls at any stage
- ✅ Zero data transmission — complete privacy

---

## How It Works

### Phase 1 — Text Extraction (for PII detection)

Mammoth.js extracts plain text from the DOCX. This text is passed to the detection engine (regex + NER). Mammoth is used here because it reliably handles edge cases (hyperlinks, merged cells, field codes, etc.).

### Phase 2 — Round-Trip XML Redaction (for output)

The original DOCX file is treated as a ZIP archive (the OOXML format). PizZip opens it without decompressing anything that doesn't need changing:

1. Read `word/document.xml` (and any `word/header*.xml` / `word/footer*.xml` parts present)
2. Parse each XML part with the browser's built-in `DOMParser`
3. Walk every `<w:t>` (text) node and search for detected PII values
4. Replace matching characters with `█` (Unicode block U+2588) and add a black `<w:shd>` shading element to the parent `<w:r>` run
5. Serialise the modified DOM back to XML with `XMLSerializer`
6. Write the modified XML back into the ZIP — all other ZIP entries (images, styles, relationships, numbering, theme) are **completely untouched**
7. Generate a new DOCX blob and trigger a browser download

Because only the XML text nodes are modified and the rest of the ZIP is copied as-is, the output file preserves everything Word stored — table grid, cell borders, font definitions, embedded images, page margins, etc.

### Fallback

If `DOMParser` fails on a particular XML part (e.g. malformed DOCX), that part is skipped and left unmodified. If the original buffer is unavailable, a minimal plain-text DOCX is built from scratch (the v0.2 behaviour).

---

## What Is Preserved

| Element | Preserved | Notes |
|---------|-----------|-------|
| Tables | ✅ | Table XML structure untouched |
| Bold / Italic / Underline | ✅ | `<w:rPr>` formatting runs intact |
| Font family / size / colour | ✅ | Preserved in original `<w:rPr>` |
| Images and diagrams | ✅ | Stored in `word/media/` — ZIP entry unchanged |
| Styles and themes | ✅ | `word/styles.xml` — ZIP entry unchanged |
| Lists and numbering | ✅ | `word/numbering.xml` — ZIP entry unchanged |
| Headers and footers | ✅ | Processed as separate XML parts; PII redacted |
| Page layout / margins | ✅ | `<w:sectPr>` section properties untouched |
| Comments / tracked changes | ✅ | `word/comments.xml` — ZIP entry unchanged |
| Relationships / hyperlinks | ✅ | `word/_rels/` — ZIP entries unchanged |

---

## Redaction Appearance

PII in the redacted document appears as solid black boxes:

```
Original:  John Smith's email is john@example.com
Redacted:  ██████████'s email is ████████████████
```

In Word, the `<w:shd w:fill="000000"/>` shading makes the cell background black, and `<w:color w:val="000000"/>` makes the `█` characters black — producing an opaque, unreadable block.

The surrounding text, formatting, and document structure are visually unchanged.

---

## Libraries Used

### Mammoth.js (628 KB) — Text extraction only
- Extracts plain text for PII detection
- Does **not** produce the output DOCX

### PizZip (78 KB) — ZIP read/write
- Opens the original DOCX (a ZIP archive) in-memory
- Writes back only the modified XML parts

### docx-handler.js (custom, ~8 KB)
- Orchestrates the round-trip pipeline
- Implements `parseDOCX()` and `createRedactedDOCX()`
- Contains `_roundTripRedact()`, `_redactParagraph()`, `_applyBlackShading()`, and the plain-DOCX fallback builder

**Total library size:** ~714 KB

---

## API Reference

```javascript
// Parse a DOCX file — returns plain text for detection
// Also stores the original ArrayBuffer for round-trip redaction
const text = await window.DOCXHandler.parseDOCX(file);

// Create a redacted DOCX
// detections: array of { value, type, start, end }
// originalFilename: used only for console logging
// fallbackText: plain text used only if round-trip unavailable
const blob = window.DOCXHandler.createRedactedDOCX(
  detections,
  originalFilename,
  fallbackText  // optional
);
```

---

## Limitations

- **`.doc` (old binary format) not supported** — save as `.docx` in Word first
- **Password-protected files** — remove password before uploading
- **Very large files** — files > 50 MB may be slow or fail due to browser memory limits
- **PII detection scope** — detection runs on Mammoth's plain-text output; if Mammoth omits text (e.g. from drawing canvas objects), that text won't be detected or redacted

---

## Troubleshooting

**"Mammoth library not loaded"** — The `libs/docx/` folder is missing or incomplete. Check that `mammoth.browser.min.js` and `pizzip.min.js` are present.

**Downloaded DOCX won't open in Word** — Check the browser console for `[DOCX]` error lines. A `parseerror` from DOMParser indicates the original file has non-standard XML; the fallback plain-DOCX is used instead.

**Formatting still missing after redaction** — Confirm the extension version is 0.3.0 or later. Earlier versions built a new plain-DOCX from scratch rather than round-tripping the original.

---

## Privacy & Security

- All processing happens in the browser — no data sent to any server
- The original file is never modified — only the downloaded copy is redacted
- PII characters are replaced (not hidden); the `█` characters contain no recoverable data
- Output files are newly generated blobs — no metadata from the original file system is leaked
