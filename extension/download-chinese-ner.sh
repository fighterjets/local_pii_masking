#!/bin/bash

echo "============================================"
echo "Downloading Chinese BERT NER Model"
echo "============================================"
echo ""
echo "Model: Xenova/bert-base-chinese-ner"
echo "Source: HuggingFace"
echo "Size: ~400-450 MB"
echo "Purpose: Named Entity Recognition for Chinese text"
echo ""

# Create directory structure
mkdir -p models/bert-base-chinese-ner/onnx

# Base URL
BASE_URL="https://huggingface.co/Xenova/bert-base-chinese-ner/resolve/main"

# Download config files
echo "Downloading config files..."
curl -L "${BASE_URL}/config.json" \
  -o models/bert-base-chinese-ner/config.json

curl -L "${BASE_URL}/tokenizer.json" \
  -o models/bert-base-chinese-ner/tokenizer.json

curl -L "${BASE_URL}/tokenizer_config.json" \
  -o models/bert-base-chinese-ner/tokenizer_config.json

curl -L "${BASE_URL}/special_tokens_map.json" \
  -o models/bert-base-chinese-ner/special_tokens_map.json

echo ""
echo "Downloading ONNX model file (~400 MB)..."
echo "This may take a few minutes depending on your connection..."
curl -L "${BASE_URL}/onnx/model_quantized.onnx" \
  -o models/bert-base-chinese-ner/onnx/model_quantized.onnx

echo ""
echo "============================================"
echo "Verification"
echo "============================================"

# Verify all files exist
if [ ! -f "models/bert-base-chinese-ner/config.json" ]; then
  echo "❌ config.json download failed!"
  exit 1
fi

if [ ! -f "models/bert-base-chinese-ner/tokenizer.json" ]; then
  echo "❌ tokenizer.json download failed!"
  exit 1
fi

if [ ! -f "models/bert-base-chinese-ner/tokenizer_config.json" ]; then
  echo "❌ tokenizer_config.json download failed!"
  exit 1
fi

if [ ! -f "models/bert-base-chinese-ner/special_tokens_map.json" ]; then
  echo "❌ special_tokens_map.json download failed!"
  exit 1
fi

if [ ! -f "models/bert-base-chinese-ner/onnx/model_quantized.onnx" ]; then
  echo "❌ model_quantized.onnx download failed!"
  exit 1
fi

# Verify model file size (should be >1MB, typically ~400MB)
MODEL_SIZE=$(wc -c < "models/bert-base-chinese-ner/onnx/model_quantized.onnx")
if [ "$MODEL_SIZE" -lt 1000000 ]; then
  echo "❌ Model file too small ($MODEL_SIZE bytes) - may be error page"
  echo "Please check the file manually"
  exit 1
fi

echo ""
echo "✅ All files downloaded successfully!"
echo ""
echo "Files:"
ls -lh models/bert-base-chinese-ner/
echo ""
ls -lh models/bert-base-chinese-ner/onnx/
echo ""

# Calculate total size
echo "Total size:"
du -sh models/bert-base-chinese-ner/

echo ""
echo "============================================"
echo "✅ Chinese NER Model Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Reload the browser extension"
echo "2. The model will load automatically on startup"
echo "3. Test with a document containing Chinese text"
echo ""
echo "Entity types detected:"
echo "  - PERSON_CN (Chinese person names)"
echo "  - ORGANIZATION_CN (Chinese organizations)"
echo "  - LOCATION_CN (Chinese locations)"
echo ""
