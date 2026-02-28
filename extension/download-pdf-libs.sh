#!/bin/bash

# Download PDF.js and pdf-lib for Local PII Masking Extension
# Enables PDF parsing and PDF redaction/masking

echo "📄 Downloading PDF Libraries for Browser Extension"
echo "=================================================="
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p libs/pdfjs
mkdir -p libs/pdflib

echo "✓ Directories created"
echo ""

# Download PDF.js (for reading PDFs)
echo "📦 Downloading PDF.js (Mozilla) for PDF parsing..."

# Use version 3.11.174 which has stable legacy build
# PDF.js core library (legacy/global build)
curl -L "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js" \
  -o libs/pdfjs/pdf.min.js

# PDF.js worker
curl -L "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js" \
  -o libs/pdfjs/pdf.worker.min.js

if [ $? -eq 0 ]; then
  echo "✓ PDF.js downloaded ($(du -sh libs/pdfjs | cut -f1))"
else
  echo "✗ Failed to download PDF.js"
  exit 1
fi

echo ""

# Download pdf-lib (for creating/modifying PDFs)
echo "📦 Downloading pdf-lib for PDF redaction..."

curl -L "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js" \
  -o libs/pdflib/pdf-lib.min.js

if [ $? -eq 0 ]; then
  echo "✓ pdf-lib downloaded ($(du -h libs/pdflib/pdf-lib.min.js | cut -f1))"
else
  echo "✗ Failed to download pdf-lib"
  exit 1
fi

echo ""

# Check total size
TOTAL_SIZE=$(du -sh libs/pdfjs libs/pdflib 2>/dev/null | awk '{sum+=$1} END {print sum}')
echo "📊 Total PDF library size: $(du -sh libs/pdfjs libs/pdflib | awk '{s+=$1} END {print s}')M (approx)"
echo ""

echo "✅ Download complete!"
echo ""
echo "📋 What was downloaded:"
echo "   PDF.js (Mozilla):     For parsing and extracting text from PDFs"
echo "   pdf-lib:              For creating redacted/masked PDFs"
echo ""
echo "📝 Next steps:"
echo "1. Reload the extension in Chrome"
echo "2. Upload a PDF file"
echo "3. PII will be detected in the PDF text"
echo "4. Download masked PDF with PII redacted"
echo ""
echo "🎨 Masking options for PDFs:"
echo "   - Black boxes (redaction)"
echo "   - Replacement text ([REDACTED])"
echo "   - Partial masking (j***@***.com)"
echo ""

# Create a verification file
cat > libs/PDF_VERSION.txt << EOF
PDF.js: 3.11.174 (Mozilla - legacy build for extensions)
pdf-lib: 1.17.1
Downloaded: $(date)
Purpose:
  - PDF.js: Extract text and positions from PDF
  - pdf-lib: Create new PDF with redactions
EOF

echo "✓ PDF support ready! Extension can now handle PDF files."
