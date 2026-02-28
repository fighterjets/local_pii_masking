#!/bin/bash

# Download Word document processing libraries for Local PII Masking Extension

echo "Downloading Word document processing libraries..."

# Create libs directory if it doesn't exist
mkdir -p libs/docx

# Download mammoth.js (DOCX to text extraction)
echo "Downloading mammoth.js..."
curl -L "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js" \
  -o libs/docx/mammoth.browser.min.js

# Download pizzip (for ZIP handling - DOCX files are ZIP archives)
echo "Downloading pizzip (JSZip fork)..."
curl -L "https://cdn.jsdelivr.net/npm/pizzip@3.1.7/dist/pizzip.min.js" \
  -o libs/docx/pizzip.min.js

# Download docx library (for creating DOCX files)
echo "Downloading docx.js..."
curl -L "https://unpkg.com/docx@8.5.0/build/index.js" \
  -o libs/docx/docx.min.js

echo ""
echo "✅ Download complete!"
echo ""
echo "Files downloaded:"
ls -lh libs/docx/
echo ""
echo "Total size:"
du -sh libs/docx/
echo ""
echo "Next: Add these scripts to popup.html"
