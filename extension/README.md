# Local PII Masking Browser Extension

**v2.3.5** — Enterprise-grade PII detection and redaction. 100% client-side, zero data transmission.

---

## Features

- **TXT, PDF, and DOCX support** — Process all common document formats locally
- **Format-preserving DOCX redaction** — Tables, bold/italic, images, and styles are kept intact; only PII text is replaced with black boxes
- **Dual NER models** — English BERT and Chinese BERT for multilingual entity detection (names, organisations, locations)
- **Smart language detection** — Automatically selects which NER model(s) to run; skips unnecessary models for faster processing
- **60+ Asian ID patterns** — NRIC/FIN (Singapore), MyKad (Malaysia), Aadhaar (India), HKID, and many more
- **Universal patterns** — Email, credit card (Luhn-validated), phone numbers, addresses
- **Multiple masking strategies** — Redaction (black box), tokenisation, partial masking
- **Processing history** — Audit trail of all processed files with re-download from cache
- **100% offline** — All ML models are bundled; no network calls during processing
- **Zero persistence** — No data written to disk between sessions (history uses local browser storage only)

---

## Quick Start

### Install

1. Open `chrome://extensions/` in Chrome and enable **Developer mode**
2. Click **Load unpacked** and select the `extension/` folder
3. The extension icon appears in your toolbar

### First Use

1. Click the extension icon
2. The AI models load automatically in the background (~30–60 s on first run, cached after)
3. Upload a TXT, PDF, or DOCX file
4. Review detected PII, choose a masking strategy, and download the redacted file

---

## File Format Support

| Format | Read | Redact | Formatting preserved |
|--------|------|--------|----------------------|
| TXT    | ✅   | ✅     | N/A                  |
| PDF    | ✅   | ✅     | PDF flattened to remove text layer |
| DOCX   | ✅   | ✅     | ✅ Tables, bold, images, styles all intact |

---

## Detection Methods

### Regex (always active)
- Fast, deterministic, 100% offline
- Singapore NRIC/FIN, Malaysian MyKad, Indian Aadhaar, HKID, Philippine SSS, and 55+ more Asian IDs
- Email, credit card, phone, postal codes, addresses (SG/HK/CN)
- Confidence: 100% for structured IDs; algorithmic validation (Luhn, NRIC checksum) where applicable

### NER — English (optional, bundled ~30 MB)
- BERT-base-NER via ONNX Runtime WebAssembly
- Detects PERSON, ORGANIZATION, LOCATION, MISC in English text
- Confidence: 85–95%

### NER — Chinese (optional, bundled ~400 MB)
- bert-base-chinese-ner via ONNX Runtime WebAssembly
- Detects PERSON_CN, ORGANIZATION_CN, LOCATION_CN in Chinese and romanised Chinese text
- Smart language detection: runs only when Chinese characters or known Chinese surnames are present
- Confidence: 85–95%

---

## Processing History

Every processed file is logged locally (no PII values stored — only metadata and SHA-256 hashes):

- **Upload time** and **download time**
- **Detection summary** (types and counts)
- **Models used / skipped**
- **Processing time**
- **Re-download** — redacted files cached in IndexedDB (up to 10 files, 10 MB each)

Export the full history as JSON for audit or compliance purposes.

---

## Architecture

```
extension/
├── manifest.json          # Manifest V3 — strict CSP, no eval()
├── popup.html             # Extension UI
├── popup.js               # Detection orchestration, history, masking
├── background.js          # Service worker — model preloading
├── icons/                 # 16 × 16, 48 × 48, 128 × 128 PNG
├── libs/
│   ├── transformers/      # Transformers.js (ONNX inference)
│   ├── onnx/              # ONNX Runtime WASM backend
│   ├── pdfjs/             # PDF.js (PDF parsing + rendering)
│   ├── pdflib/            # PDF-lib (PDF redaction + flattening)
│   └── docx/
│       ├── mammoth.browser.min.js   # DOCX text extraction
│       ├── pizzip.min.js            # ZIP read/write (DOCX = ZIP)
│       └── docx-handler.js         # Round-trip XML redaction
└── models/
    ├── bert-base-NER/     # English NER (DistilBERT quantised)
    └── bert-base-chinese-ner/  # Chinese NER (BERT quantised)
```

### DOCX Round-Trip Redaction

Redaction opens the original ZIP, edits `word/document.xml` (and any header/footer XML parts) using `DOMParser`, replaces only the `<w:t>` text nodes that contain PII, then repacks the ZIP. All other ZIP entries (images, styles, relationships, numbering) are copied unchanged, preserving full document fidelity.

---

## Security

- **Manifest V3 CSP**: `script-src 'self' 'wasm-unsafe-eval'` — no `eval()`, no inline handlers
- **Event delegation**: All UI events use `addEventListener`, never inline `onclick`
- **No PII in logs**: Audit trail uses SHA-256 hashes only
- **Input validation**: Files checked by magic bytes, not extension
- **Luhn / NRIC checksum**: Algorithmic validation reduces false positives

---

## Documentation Index

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Version history and release notes |
| `DOCX_SUPPORT.md` | DOCX round-trip redaction details |
| `PDF_SUPPORT.md` | PDF redaction and flattening |
| `ASIAN_ID_DETECTION.md` | Full list of Asian ID patterns |
| `ADDRESS_DETECTION.md` | Address detection (SG/HK/CN) |
| `CHINESE_NER_MODEL.md` | Chinese BERT NER model details |
| `HISTORY_FEATURE.md` | Processing history and file cache |
| `CSP_FIX.md` | Content Security Policy compliance notes |

---

## Troubleshooting

**Extension doesn't load** — Check that `icons/` folder exists with all three PNG files. See `generate-icons.html` to generate them.

**Models not loading** — First load takes 30–60 s. Check the model status indicator. Click "Retry" if it shows an error. Ensure the `models/` folder is present and complete.

**DOCX formatting lost** — Ensure the file is a valid `.docx` (not `.doc`). The round-trip path requires `word/document.xml` to be parseable XML. Check the browser console for `[DOCX]` log lines.

**No PII detected** — Verify the document contains supported PII formats. Check the confidence threshold setting. Try enabling NER detection for names and organisations.

**File too large** — Maximum supported size is 50 MB. For very large files, split them before processing.

---

## License

See the main repository LICENSE file.
