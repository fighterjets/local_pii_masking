#!/bin/bash

# All-in-One Setup for Local PII Masking Extension
# Downloads PDF libraries + ML libraries + generates icons

echo "🚀 Local PII Masking Extension - Complete Setup"
echo "============================================="
echo ""
echo "This will download:"
echo "  📄 PDF.js + pdf-lib (~800KB)"
echo "  🤖 Transformers.js + ONNX Runtime (~2MB)"
echo "  🎨 Generate extension icons"
echo ""
echo "Total download: ~3MB"
echo "Setup time: ~2 minutes"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Setup cancelled."
  exit 0
fi

# Make scripts executable
chmod +x download-pdf-libs.sh 2>/dev/null
chmod +x download-ml-libs.sh 2>/dev/null
chmod +x setup.sh 2>/dev/null

# Step 1: PDF Libraries
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/3: Downloading PDF Libraries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./download-pdf-libs.sh
if [ $? -ne 0 ]; then
  echo "✗ PDF library download failed"
  exit 1
fi

# Step 2: ML Libraries
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/3: Downloading ML Libraries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./download-ml-libs.sh
if [ $? -ne 0 ]; then
  echo "✗ ML library download failed"
  exit 1
fi

# Step 3: Generate Icons
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/3: Generating Icons"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./setup.sh
if [ $? -ne 0 ]; then
  echo "⚠️  Icon generation may require manual steps"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Extension Capabilities:"
echo "  ✅ TXT file support (native)"
echo "  ✅ PDF file support (parse + redact)"
echo "  ✅ Regex PII detection (emails, IDs, cards, phones)"
echo "  ✅ ML/NER detection (names, orgs, locations)"
echo "  ✅ 100% offline processing"
echo ""
echo "📦 Extension Size: ~3MB"
echo ""
echo "🔧 Next Steps:"
echo "  1. Go to chrome://extensions/"
echo "  2. Enable 'Developer mode'"
echo "  3. Click 'Load unpacked'"
echo "  4. Select this folder: $(pwd)"
echo "  5. Click extension icon"
echo "  6. Click 'Preload ML Model' (optional, ~30-60s)"
echo "  7. Upload a file and test!"
echo ""
echo "📚 Documentation:"
echo "  - PDF Support: PDF_SUPPORT.md"
echo "  - ML Detection: ML_SOLUTION.md"
echo "  - Quick Start: START_HERE.md"
echo ""
echo "🎉 You're ready to detect and redact PII!"
