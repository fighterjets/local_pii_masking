# ⚡ Quick Start Guide

## Quick Setup (TXT Files Only)

### 1. Generate Icons
```bash
cd extension
./setup.sh
```
Or manually open `generate-icons.html` and save the 3 icons to `icons/` folder.

### 2. Load Extension in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select this `extension` folder
5. Done! Extension loaded ✅

### 3. Test It
1. Click the extension icon in Chrome toolbar
2. Upload `test-sample.txt`
3. See 15+ PII detections
4. Try different masking strategies
5. Download masked file + report

## ⚡ What You Need to Know

### ✅ Works Great
- TXT files only
- Regex-based PII detection
- Email, credit cards, NRIC, phones, postal codes
- 3 masking strategies
- JSON reports
- 100% offline

### ❌ Doesn't Work
- PDF files (Chrome security prevents loading PDF.js from CDN)
- DOCX files (Chrome security prevents loading mammoth.js from CDN)
- ML models (Chrome security prevents loading Transformers.js from CDN)

### 🔧 Easy Fix
**For PDF/DOCX**: Convert to TXT first, then upload
**For ML**: Use standalone version (`../index.html`)

## 📝 Converting Files

### PDF → TXT
```bash
pdftotext input.pdf output.txt
```

### DOCX → TXT (macOS)
```bash
textutil -convert txt input.docx
```

### Or Use Online Tools
- Google Docs (upload → download as TXT)
- Adobe Acrobat Online
- CloudConvert

## 🎯 Common Use Cases

### Scanning Email Content
1. Copy email text
2. Paste into TXT file
3. Upload to extension
4. Get PII report

### Checking Documents Before Sharing
1. Convert PDF/DOCX to TXT
2. Upload to extension
3. Review detected PII
4. Download masked version

### Code Review for Leaked Secrets
1. Upload source file (if .txt)
2. Check for emails, keys, etc.
3. Clean before commit

## ❓ FAQ

**Q: Why only TXT?**
A: Chrome extensions can't load external libraries from CDN (security policy).

**Q: Can I add PDF support?**
A: Yes! Download PDF.js and bundle it locally. See `FILE_FORMAT_SUPPORT.md`.

**Q: Is regex detection enough?**
A: Yes! It's what enterprises use. Very accurate with validation.

**Q: What about ML/NER?**
A: Use the standalone version (`../index.html`) for ML features.

**Q: Can I publish this to Chrome Web Store?**
A: Yes! Once icons are generated and tested.

## 🤖 ML Detection Not Available

**ML detection cannot work in Chrome extensions** due to Web Worker security restrictions.

For ML-powered detection (person names, organizations, locations):
- ✅ Use the **standalone version**: `../index.html`
- ✅ Supports TXT, PDF, and DOCX files
- ✅ Full ML/NER capabilities
- ✅ All features work

**See `WHY_NO_ML.md` for technical explanation.**

## 📚 More Info

- **Full docs**: `README.md`
- **Extension status**: `EXTENSION_STATUS.md` ⭐ Start here
- **File formats**: `FILE_FORMAT_SUPPORT.md`
- **Why no ML**: `WHY_NO_ML.md`

## 🎉 You're Done!

The extension is working. Just:
1. Generate icons
2. Load in Chrome
3. Test with `test-sample.txt`

**Optional**: Run `./download-ml-libs.sh` for ML-powered detection

For PDF/DOCX, use standalone version or convert to TXT.

**Both approaches work great!** 🚀
