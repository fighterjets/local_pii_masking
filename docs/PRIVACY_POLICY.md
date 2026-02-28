# Privacy Policy

**Last Updated:** February 28, 2026

**Applies to:** Local PII Masking Browser Extension v2.3.5

---

## Overview

Local PII Masking is **100% client-side software**. Your data never leaves your computer. This privacy policy explains what data is processed, where it goes, and what you should know.

---

## 1. Data Processing - Everything Stays Local

### What We Do NOT Collect

| Data Type | Collected? | Explanation |
|-----------|------------|-------------|
| Your documents | **NO** | Documents are processed entirely in your browser |
| Document content | **NO** | No text, no images, no metadata is transmitted |
| PII detections | **NO** | Names, IDs, emails - all processed locally |
| Redacted outputs | **NO** | Output files stay on your device |
| Usage statistics | **NO** | No analytics, no tracking |
| Personal information | **NO** | No account required, no signup |

### What IS Stored Locally

| Data | Location | Purpose | Duration |
|------|----------|---------|----------|
| ML Models | Browser Storage (IndexedDB) | Run AI detection offline | Until you clear it |
| Processing History | Browser Storage (IndexedDB) | Track your redactions | Until you clear it |
| File Cache | Browser Storage (IndexedDB) | Re-download redacted files | Last 10 files only |

**Important:** Only **metadata** (file name, size, detection counts, timestamps) is stored in history. **NO document content or PII values are stored.**

---

## 2. Network Communication

### When Does the Extension Connect to the Internet?

The extension only connects to external servers in these specific scenarios:

#### A. Model Downloads (One-time or Manual)

| Scenario | Destination | Data Sent | Purpose |
|----------|-------------|-----------|---------|
| First install | huggingface.co | None (HTTP GET) | Download AI models |
| Manual "Install Models" | huggingface.co | None (HTTP GET) | Download/update models |
| Model updates | huggingface.co | None (HTTP GET) | Fetch model updates |

**What happens:**
- Extension downloads pre-trained AI models (~50-400MB each)
- Models are saved to your browser's local storage
- After download, models run **completely offline**
- No document data is sent during download

#### B. CDN Resources (During Use)

| Resource | Source | Purpose |
|----------|--------|---------|
| PDF.js library | cdn.jsdelivr.net | Parse PDF files locally |
| Mammoth.js library | cdn.jsdelivr.net | Parse DOCX files locally |

**Note:** These are JavaScript libraries loaded to your browser. Your documents are parsed **locally** using these libraries.

### What Does NOT Happen

❌ **Documents are never uploaded**  
❌ **PII is never transmitted**  
❌ **No telemetry or analytics**  
❌ **No error reporting with document data**  
❌ **No cloud processing**  
❌ **No server-side storage**

---

## 3. Third-Party Services

### HuggingFace (huggingface.co)

- **Service:** Model repository
- **Data shared:** None (anonymous downloads)
- **Data they log:** Standard server logs (IP, timestamp, file requested)
- **Privacy policy:** https://huggingface.co/privacy
- **Opt-out:** Models can be bundled offline; contact your IT admin

### jsDelivr CDN (cdn.jsdelivr.net)

- **Service:** JavaScript library hosting
- **Data shared:** None (standard HTTP request)
- **Data they log:** Standard CDN logs
- **Privacy policy:** https://www.jsdelivr.com/privacy-policy-jsdelivr-com

---

## 4. Your Controls

### What You Can Do

| Action | How | Effect |
|--------|-----|--------|
| Clear history | "Clear All" button in History | Deletes all processing metadata |
| Delete models | "Clear All" button or uninstall | Removes downloaded AI models |
| Block network | Use offline after model install | Extension works without internet |
| View stored data | Chrome DevTools → Application → IndexedDB | Inspect local storage |
| Export history | "Export" button in History | Download JSON of your metadata |

### Offline Usage

After initial model download, the extension works **completely offline**:
- ✅ Document processing
- ✅ PII detection
- ✅ Redaction
- ✅ History tracking
- ❌ Model updates
- ❌ CDN library updates

---

## 5. Security Measures

### Technical Safeguards

| Measure | Implementation |
|---------|----------------|
| No data transmission | All processing in Web Workers / main thread |
| Secure storage | IndexedDB with origin isolation |
| No external APIs | No REST APIs called with document data |
| Memory-only processing | Documents processed in RAM, not disk |
| CSP enforcement | Content Security Policy prevents external execution |

### What This Means

Even if your browser is compromised:
- Document content was never on a server to be breached
- Only processed locally in your browser's memory
- No persistent logs on external systems

---

## 6. Disclaimer & Limitations

### Free Software Disclaimer

**THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.**

- No guarantee of detection accuracy
- No guarantee of complete PII removal
- User is responsible for verifying redactions
- Not a substitute for legal/compliance review

### Accuracy Limitations

| Limitation | Explanation |
|------------|-------------|
| AI models can miss PII | False negatives occur |
| AI models can flag non-PII | False positives occur |
| Context matters | "John Smith" could be a person or a restaurant |
| Format variations | Unusual document formats may not parse correctly |

**Always review redacted documents before sharing.**

---

## 7. Changes to This Policy

We will update this privacy policy if:
- Functionality changes affect data handling
- New regulations require disclosure updates
- Third-party services change their policies

**You will be notified of changes via:**
- Extension update notes
- This document's "Last Updated" date

---

## 8. Contact & Questions

### For Privacy Questions

If you have questions about this privacy policy or data handling:

1. **Review the code:** This is open-source software - inspect the source
2. **Check network traffic:** Use Chrome DevTools → Network tab to verify no document data is sent
3. **Contact your organization:** If deployed by IT, contact your administrator

### For Security Issues

If you discover a security vulnerability:
- Do not file a public issue
- Contact your organization's security team
- Or contact the maintainer privately

---

## 9. Compliance Notes

### GDPR (EU Users)

| Requirement | Status |
|-------------|--------|
| Data minimization | ✅ Only metadata stored |
| Storage limitation | ✅ User can clear anytime |
| Purpose limitation | ✅ Local processing only |
| Transparency | ✅ This policy + open source |
| Right to erasure | ✅ "Clear All" functionality |

### PDPA (Singapore Users)

Consistent with GDPR principles above.

### HIPAA (Healthcare - US)

**This software is NOT HIPAA-certified.** However:
- ✅ No PHI transmitted to servers
- ✅ Local processing reduces exposure
- ⚠️ You must verify redaction completeness
- ⚠️ Consult compliance officer before use

---

## Summary

| Question | Answer |
|----------|--------|
| Is my data sent to servers? | **NO** |
| Is processing done locally? | **YES** |
| What data is stored? | Only metadata (names, counts, timestamps) |
| Where is data stored? | Your browser only |
| Can I use offline? | **YES**, after model download |
| Is there tracking? | **NO** |
| Is it free? | **YES**, no guarantees |

---

**By using Local PII Masking, you acknowledge that you understand this privacy policy and the limitations of the software.**
