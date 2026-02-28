#!/bin/bash

# Download TensorFlow.js for Local PII Masking Extension
# TensorFlow.js works in extensions without Web Worker issues

echo "🤖 Downloading TensorFlow.js for Browser Extension"
echo "=================================================="
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p libs/tfjs
mkdir -p models/ner

echo "✓ Directories created"
echo ""

# Download TensorFlow.js core
echo "📦 Downloading TensorFlow.js core..."
curl -L "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js" \
  -o libs/tfjs/tf.min.js

if [ $? -eq 0 ]; then
  echo "✓ TensorFlow.js downloaded ($(du -h libs/tfjs/tf.min.js | cut -f1))"
else
  echo "✗ Failed to download TensorFlow.js"
  exit 1
fi

echo ""

# Download TensorFlow.js converter (for loading models)
echo "📦 Downloading TensorFlow.js converter..."
curl -L "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@4.15.0/dist/tf-converter.min.js" \
  -o libs/tfjs/tf-converter.min.js

if [ $? -eq 0 ]; then
  echo "✓ Converter downloaded"
else
  echo "✗ Failed to download converter"
  exit 1
fi

echo ""

# Check total size
TOTAL_SIZE=$(du -sh libs | cut -f1)
echo "📊 Total library size: $TOTAL_SIZE"
echo ""

echo "✅ Download complete!"
echo ""
echo "📝 Next steps:"
echo "1. The NER model will be downloaded separately (we'll use a lightweight model)"
echo "2. Reload the extension in Chrome"
echo "3. Click 'Preload ML Model' to initialize"
echo ""
echo "💡 Note: TensorFlow.js works in extensions without Web Worker issues!"
echo "   It uses CPU/WebGL backends that are extension-compatible."
echo ""

# Create a verification file
cat > libs/VERSION.txt << EOF
TensorFlow.js: 4.15.0
Backend: CPU (extension-safe)
Downloaded: $(date)
Total Size: $TOTAL_SIZE
EOF

echo "✓ Setup complete! Extension ready for ML-powered PII detection."
