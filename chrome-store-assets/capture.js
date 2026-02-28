const puppeteer = require('puppeteer');
const path = require('path');

const screenshots = [
  { file: 'screenshot-1-main.html', name: 'screenshot-1.png', width: 1280, height: 800 },
  { file: 'screenshot-2-detection.html', name: 'screenshot-2.png', width: 1280, height: 800 },
  { file: 'screenshot-3-redacted.html', name: 'screenshot-3.png', width: 1280, height: 800 },
  { file: 'screenshot-4-history.html', name: 'screenshot-4.png', width: 1280, height: 800 },
  { file: 'promo-small.html', name: 'promo-small.png', width: 440, height: 280 },
  { file: 'promo-marquee.html', name: 'promo-marquee.png', width: 1400, height: 560 },
];

(async () => {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  for (const shot of screenshots) {
    const filePath = path.join(__dirname, shot.file);
    const outputPath = path.join(__dirname, shot.name);
    
    console.log(`\n📸 Capturing ${shot.file}...`);
    console.log(`   Dimensions: ${shot.width}x${shot.height}`);
    
    await page.setViewport({ 
      width: shot.width, 
      height: shot.height,
      deviceScaleFactor: 1
    });
    
    await page.goto(`file://${filePath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for fonts to load
    await new Promise(r => setTimeout(r, 500));
    
    await page.screenshot({ 
      path: outputPath, 
      type: 'png',
      fullPage: false
    });
    
    console.log(`   ✓ Saved: ${shot.name}`);
  }
  
  await browser.close();
  
  console.log('\n✅ All screenshots captured successfully!');
  console.log('\nFiles generated:');
  screenshots.forEach(s => console.log(`  - ${s.name} (${s.width}x${s.height})`));
})();
