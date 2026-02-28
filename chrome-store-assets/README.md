# Chrome Web Store Assets

This folder contains HTML templates for generating screenshots and promotional tiles for the Chrome Web Store.

## 📸 Screenshots (1280 x 800)

Open each HTML file in a browser at the specified dimensions and take a screenshot:

| File | Description |
|------|-------------|
| `screenshot-1-main.html` | Main upload interface with feature highlights |
| `screenshot-2-detection.html` | PII detection results with highlighted text |
| `screenshot-3-redacted.html` | Redacted document preview with download |
| `screenshot-4-history.html` | Processing history and audit trail |

### How to capture:

1. **Open the HTML file** in Chrome:
   ```bash
   # Using Python http.server
   cd chrome-store-assets
   python3 -m http.server 8000
   
   # Then open:
   # http://localhost:8000/screenshot-1-main.html
   ```

2. **Set browser dimensions** to 1280x800:
   - Open DevTools (F12)
   - Click Toggle Device Toolbar (⌘+Shift+M)
   - Set resolution to 1280 x 800
   - Set zoom to 100%

3. **Capture screenshot**:
   - Use Chrome DevTools: ⋮ menu → More tools → Capture screenshot
   - Or use system screenshot tool

4. **Save as**: PNG or JPEG (24-bit, no alpha)

## 🎨 Promotional Tiles

### Small Promo Tile (440 x 280)
- **File**: `promo-small.html`
- **Used for**: Chrome Web Store search results, category listings

### Marquee Promo Tile (1400 x 560)
- **File**: `promo-marquee.html`
- **Used for**: Chrome Web Store featured placement

### Capture instructions:
Same as screenshots, but use these dimensions:
- Small: 440 x 280
- Marquee: 1400 x 560

## ✅ Chrome Web Store Requirements

### Screenshots
- [ ] 1-5 screenshots
- [ ] 1280 x 800 or 640 x 400
- [ ] JPEG or 24-bit PNG (no alpha transparency)
- [ ] At least 1 screenshot required

### Promotional Tiles
- [ ] Small: 440 x 280 (optional but recommended)
- [ ] Marquee: 1400 x 560 (optional, for featured placement)
- [ ] JPEG or 24-bit PNG (no alpha)

## 🎯 Screenshot Content Strategy

### Screenshot 1: Main Interface
**Message**: Zero-server, privacy-first approach
- Clean upload interface
- Feature checklist
- Trust badge ("Zero Server Communication")

### Screenshot 2: Detection Results
**Message**: Powerful AI detection with confidence scores
- Side-by-side detection list and document preview
- Color-coded PII highlights
- Confidence indicators

### Screenshot 3: Redacted Output
**Message**: Professional redaction with formatting preserved
- Before/after comparison
- Black redaction boxes
- Download ready state

### Screenshot 4: History/Audit
**Message**: Compliance and accountability
- Processing statistics
- History list with actions
- Compliance banner

## 🚀 Quick Capture Script

If you have Node.js and Puppeteer installed:

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');

const screenshots = [
  { file: 'screenshot-1-main.html', name: 'screenshot-1.png', width: 1280, height: 800 },
  { file: 'screenshot-2-detection.html', name: 'screenshot-2.png', width: 1280, height: 800 },
  { file: 'screenshot-3-redacted.html', name: 'screenshot-3.png', width: 1280, height: 800 },
  { file: 'screenshot-4-history.html', name: 'screenshot-4.png', width: 1280, height: 800 },
  { file: 'promo-small.html', name: 'promo-small.png', width: 440, height: 280 },
  { file: 'promo-marquee.html', name: 'promo-marquee.png', width: 1400, height: 560 },
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  for (const shot of screenshots) {
    await page.setViewport({ width: shot.width, height: shot.height });
    await page.goto(`file://${__dirname}/${shot.file}`);
    await page.screenshot({ path: shot.name, type: 'png' });
    console.log(`✓ Captured ${shot.name}`);
  }
  
  await browser.close();
})();
```

## 📝 File Naming Convention

When uploading to Chrome Web Store:
- Screenshots: `screenshot-1.png`, `screenshot-2.png`, etc.
- Small promo: `promo-small.png` or `promo-tile-small.png`
- Marquee promo: `promo-marquee.png` or `promo-tile-large.png`
