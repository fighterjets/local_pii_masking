# 🚀 Local PII Masking Browser Extension - START HERE

**Version 2.3.5** - Refactored for clean code architecture

## Quick Decision Tree

### What features do you need?

1. **PDF Support?** → Run `./download-pdf-libs.sh` (adds ~800KB)
2. **ML Detection?** → Run `./download-ml-libs.sh` (adds ~32MB, includes pre-bundled model!)
3. **Both?** → Run both scripts
4. **TXT only, Regex only?** → Skip to Basic Setup (50KB)

---

## 📄 PDF + ML Setup (Maximum Features)

### What You Get
- ✅ Detects emails, credit cards, IDs, phones (regex)
- ✅ Detects person names, organizations, locations (ML)
- ✅ Parses TXT and PDF files
- ✅ Creates redacted PDFs with PII blacked out
- ✅ Works 100% offline (after initial setup)
- ✅ Extension size: ~3MB

### Setup Steps

1. **Download all libraries:**
   ```bash
   cd extension
   chmod +x download-pdf-libs.sh download-ml-libs.sh
   ./download-pdf-libs.sh
   ./download-ml-libs.sh
   ```

2. **Generate icons:**
   ```bash
   ./setup.sh
   ```

3. **Load extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this `extension` folder

4. **ML model auto-loads:**
   - Click extension icon
   - ML model loads automatically (~5 seconds)
   - See: "✓ ML model ready!" in status area
   - No button click needed!

5. **Test it:**
   - Upload a PDF with PII
   - See detections
   - Download redacted PDF

**Done!** 🎉

**See `PDF_SUPPORT.md` and `ML_SOLUTION.md` for details.**

---

## 🤖 ML Setup (TXT files with ML)

### What You Get
- ✅ Detects emails, credit cards, IDs, phones (regex)
- ✅ Detects person names, organizations, locations (ML)
- ✅ Works 100% offline (after initial setup)
- ✅ Extension size: ~2MB

### Setup Steps

1. **Download ML libraries:**
   ```bash
   cd extension
   chmod +x download-ml-libs.sh
   ./download-ml-libs.sh
   ```

2. **Generate icons:**
   ```bash
   ./setup.sh
   # or open generate-icons.html and save icons manually
   ```

3. **Load extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this `extension` folder

4. **Load bundled ML model:**
   - Click extension icon
   - Click "Load Bundled ML Model (100% Offline)"
   - Wait ~5 seconds (loads from bundled files!) (first time only)
   - See: "✓ ML model loaded!"

5. **Test it:**
   - Upload `test-sample.txt`
   - Verify ~15-20 detections (regex + ML)

**Done!** 🎉

**See `ML_SOLUTION.md` for details and troubleshooting.**

---

## ⚡ Basic Setup (Regex Only)

### What You Get
- ✅ Detects emails, credit cards, IDs, phones (regex)
- ❌ Does NOT detect names, organizations, locations
- ✅ Works 100% offline
- ✅ Extension size: ~50KB

### Setup Steps

1. **Generate icons:**
   ```bash
   cd extension
   ./setup.sh
   # or open generate-icons.html and save icons manually
   ```

2. **Load extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this `extension` folder

3. **Test it:**
   - Upload `test-sample.txt`
   - Verify ~10-15 detections (regex only)

**Done!** ⚡

---

## 📊 Feature Comparison

| Feature | Basic | ML-Enabled |
|---------|-------|-----------|
| Email detection | ✅ | ✅ |
| Credit card detection | ✅ | ✅ |
| NRIC/FIN detection | ✅ | ✅ |
| Phone detection | ✅ | ✅ |
| **Name detection** | ❌ | ✅ |
| **Organization detection** | ❌ | ✅ |
| **Location detection** | ❌ | ✅ |
| Extension size | 50KB | ~33MB |
| Setup time | 2 min | 5 min |
| First load | Instant | ~5s |
| Works offline | ✅ | ✅ (100%, model bundled) |

---

## 🎯 Recommendation

### Use Basic Setup If:
- You only need structured PII (emails, cards, IDs)
- You want smallest extension size
- You want fastest setup

### Use ML Setup If:
- You need to detect person names
- You need to detect companies/organizations
- You need comprehensive PII coverage
- You don't mind 2MB extension size

**Both versions work great!** Choose based on your needs.

---

## 📚 Documentation

- **ML Setup Details**: `ML_SOLUTION.md`
- **Full README**: `README.md`
- **Why it works**: Technical explanation in `ML_SOLUTION.md`
- **File formats**: `FILE_FORMAT_SUPPORT.md` (TXT only)
- **Extension status**: `EXTENSION_STATUS.md`

---

## ❓ Quick FAQ

**Q: Can I switch from Basic to ML later?**
A: Yes! Just run `./download-ml-libs.sh` (downloads ~32MB including model) and reload the extension. The model auto-loads!

**Q: Does ML work offline?**
A: Yes! The model is pre-bundled (~30MB) and auto-loads when you open the extension. Works 100% offline from first use.

**Q: Do I need to click a button to load the model?**
A: No! The model loads automatically when you open the extension. Just wait ~5 seconds and it's ready.

**Q: Is single-threaded ML fast enough?**
A: Yes! Most documents process in <500ms. Totally usable.

**Q: Can I use PDF/DOCX files?**
A: Not in the extension. Use `../index.html` for PDF/DOCX support, or convert to TXT.

**Q: How does ML work in an extension?**
A: We configure ONNX Runtime to run single-threaded (no Web Workers). See `ML_SOLUTION.md`.

---

## 🆘 Troubleshooting

### Extension won't load
→ Make sure icons are generated (`./setup.sh`)

### "ML libraries not found"
→ Run `./download-ml-libs.sh`

### "Web Worker error"
→ This shouldn't happen with the new solution. Check `ML_SOLUTION.md`

### Still stuck?
→ See `README.md` troubleshooting section

---

## ✅ Success Checklist

- [ ] Downloaded ML libraries (if using ML)
- [ ] Generated icons (3 PNG files in `icons/` folder)
- [ ] Loaded extension in Chrome
- [ ] Extension icon appears in toolbar
- [ ] Can upload test file
- [ ] Sees PII detections
- [ ] Can download masked file
- [ ] Can download report

**All checked?** You're ready to use Local PII Masking! 🎉

---

**Choose your path above and get started!** ⬆️
