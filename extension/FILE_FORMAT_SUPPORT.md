# File Format Support in Browser Extension

## TL;DR

**The extension version supports TXT files only.** For PDF and DOCX support, use the standalone version (`../index.html`).

## Why Only TXT Files?

Browser extensions (Manifest V3) have strict **Content Security Policies (CSP)** that prevent loading external JavaScript libraries from CDNs. This is a security feature to protect users.

### What This Means:

- ✅ **TXT files**: Work perfectly (native browser support)
- ❌ **PDF files**: Require PDF.js library (~500KB)
- ❌ **DOCX files**: Require mammoth.js library (~200KB)
- ❌ **ML models**: Require Transformers.js (~50MB)

## Solutions for Different File Types

### Option 1: Use TXT Files (Recommended for Extension)

**This works perfectly right now!**

1. If you have PDF/DOCX files, convert them to TXT first:
   - **Online**: Use tools like Adobe, Google Docs, or CloudConvert
   - **macOS**: `textutil -convert txt document.docx`
   - **Windows**: Open in Word → Save As → Plain Text
   - **Linux**: `pdftotext document.pdf` or `docx2txt`

2. Upload the TXT file to the extension
3. Get full PII detection and masking

### Option 2: Use Standalone Version (Full Features)

The main `index.html` file in the parent directory supports ALL file types:

1. Open `../index.html` in your browser (not as an extension)
2. Upload TXT, PDF, or DOCX files
3. Get full ML model support too
4. All features work without CSP restrictions

**Location**: `/Users/jackson/code/local_pii_masking/index.html`

### Option 3: Bundle Libraries Locally (Advanced)

If you really need PDF/DOCX in the extension, you can bundle the libraries:

#### Steps to Add PDF Support:

1. **Download PDF.js**:
   ```bash
   cd extension
   mkdir libs
   cd libs
   wget https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.js
   wget https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js
   ```

2. **Update manifest.json**:
   ```json
   "web_accessible_resources": [
     {
       "resources": ["libs/*.js"],
       "matches": ["<all_urls>"]
     }
   ]
   ```

3. **Update popup.js**:
   - Uncomment the local loading code in `parsePDF()`
   - Change CDN URLs to `chrome.runtime.getURL('libs/pdf.min.js')`

4. **Reload extension**

#### Steps to Add DOCX Support:

Similar process, but download `mammoth.browser.min.js` instead.

**Note**: This increases extension size significantly:
- PDF.js: ~500KB
- mammoth.js: ~200KB
- Total extension: ~1MB vs ~50KB

## Comparison

| Feature | Extension (TXT only) | Extension (Bundled) | Standalone |
|---------|---------------------|---------------------|------------|
| File Size | 50KB | 1MB | N/A |
| TXT Support | ✅ | ✅ | ✅ |
| PDF Support | ❌ | ✅ | ✅ |
| DOCX Support | ❌ | ✅ | ✅ |
| ML Models | ❌ | ❌ | ✅ |
| Setup | Easy | Complex | Easy |
| Auto-Update | ✅ (Web Store) | ✅ | Manual |
| Offline | ✅ | ✅ | ✅ |

## Recommendations by Use Case

### 🔹 Quick PII Checks
→ **Use Extension with TXT files**
- Fast and lightweight
- Always available in browser
- Perfect for quick scans

### 🔹 Document Analysis
→ **Use Standalone Version**
- Supports all file types
- ML model available
- More features

### 🔹 Automated Workflows
→ **Convert to TXT first, then use Extension**
- Integrate conversion in your workflow
- Keep extension lightweight
- Best of both worlds

### 🔹 Maximum Features
→ **Use Standalone Version**
- Everything works
- No limitations
- Full power

## Converting Files to TXT

### From PDF:

**Online Tools**:
- Adobe Acrobat Online
- ILovePDF
- PDF2TXT

**Command Line**:
```bash
# macOS/Linux
pdftotext input.pdf output.txt

# Windows (with Python)
pip install pdfplumber
python -c "import pdfplumber; pdf = pdfplumber.open('input.pdf'); print('\n'.join(page.extract_text() for page in pdf.pages))" > output.txt
```

### From DOCX:

**Online Tools**:
- Google Docs (upload → download as TXT)
- CloudConvert
- Online-Convert

**Command Line**:
```bash
# macOS
textutil -convert txt input.docx

# Linux
docx2txt input.docx output.txt

# Windows (with Python)
pip install python-docx
python -c "from docx import Document; print('\n'.join(p.text for p in Document('input.docx').paragraphs))" > output.txt
```

## Current Extension Capabilities

Even with just TXT support, the extension is **production-ready** for:

✅ **Email scanning**: Paste email content into TXT
✅ **Code review**: Most code is plain text
✅ **Configuration files**: Usually TXT/JSON
✅ **Log files**: Already plain text
✅ **Chat transcripts**: Copy-paste to TXT
✅ **Notes and documents**: Convert or type
✅ **CSV files**: Already plain text

## Future Enhancements

Possible improvements for future versions:

1. **Bundle PDF.js** - Add ~500KB for PDF support
2. **Bundle mammoth.js** - Add ~200KB for DOCX support
3. **Lightweight OCR** - Extract text from images
4. **Copy-Paste Mode** - Scan clipboard content
5. **Webpage Scanner** - Scan any webpage for PII

## Questions?

- **Why not just bundle everything?**
  - Extension size matters for Web Store
  - Loading time increases
  - Most users only need TXT

- **Will PDF/DOCX be added later?**
  - Maybe, if there's demand
  - Bundling adds complexity
  - Standalone version already supports it

- **Is TXT support limiting?**
  - No! Most text can be converted to TXT
  - TXT files are universal
  - Conversion is quick and easy

## Summary

The extension is **designed for speed and simplicity**:
- 50KB size
- Instant loading
- No external dependencies
- Perfect for quick PII checks

For advanced features, use the standalone version. For most use cases, TXT files work great!

---

**Recommended Workflow**:
1. Quick checks → Use extension with TXT
2. Full analysis → Use standalone version
3. Production use → Convert to TXT + use extension
