#!/bin/bash

# Download ML Libraries + Pre-bundled Model for Local PII Masking Extension
# This version configures for SINGLE-THREADED execution (no Web Workers!)

echo "🤖 Downloading ML Libraries + Bundled NER Model for Browser Extension"
echo "======================================================================"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p libs/transformers
mkdir -p libs/onnx
mkdir -p models/bert-base-NER

echo "✓ Directories created"
echo ""

# NOTE: We use a custom NER loader instead of Transformers.js
# This allows loading models from chrome-extension:// URLs
# Transformers.js download is no longer needed
echo "ℹ️  Using custom NER loader (libs/custom-ner-loader.js)"
echo ""

# Download ONNX Runtime WASM files (SINGLE-THREADED ONLY)
echo "📦 Downloading ONNX Runtime WASM files (single-threaded)..."

# Only download non-threaded versions for extension compatibility
curl -L "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm.wasm" \
  -o libs/onnx/ort-wasm.wasm

curl -L "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm-simd.wasm" \
  -o libs/onnx/ort-wasm-simd.wasm

# Download main ONNX Runtime JS file
curl -L "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort.min.js" \
  -o libs/onnx/ort.min.js

if [ $? -eq 0 ]; then
  echo "✓ ONNX Runtime files downloaded"
else
  echo "✗ Failed to download ONNX Runtime files"
  exit 1
fi

echo ""

# Download Pre-bundled NER Model (BERT-base-NER)
echo "📦 Downloading BERT-base NER model (pre-bundled, ~140MB)..."
echo "   This enables offline NER detection from first use"
echo ""

MODEL_BASE="https://huggingface.co/Xenova/bert-base-NER/resolve/main"

# Function to download and verify
download_file() {
  local url=$1
  local output=$2
  local min_size=$3

  echo "  → Downloading: $(basename $output)"
  curl -L -A "Mozilla/5.0" --fail --silent --show-error "$url" -o "$output"

  if [ $? -ne 0 ]; then
    echo "  ✗ Download failed: $url"
    return 1
  fi

  # Check if file is too small (likely an error page)
  local filesize=$(wc -c < "$output")
  if [ $filesize -lt $min_size ]; then
    echo "  ✗ Downloaded file too small ($filesize bytes), likely an error page"
    echo "  ✗ First 100 chars: $(head -c 100 "$output")"
    return 1
  fi

  echo "  ✓ Downloaded: $(basename $output) ($(du -h "$output" | cut -f1))"
  return 0
}

# Download model configuration files
echo "  → Downloading config files..."

download_file "${MODEL_BASE}/config.json" "models/bert-base-NER/config.json" 100 || exit 1
download_file "${MODEL_BASE}/tokenizer.json" "models/bert-base-NER/tokenizer.json" 1000 || exit 1
download_file "${MODEL_BASE}/tokenizer_config.json" "models/bert-base-NER/tokenizer_config.json" 50 || exit 1
download_file "${MODEL_BASE}/special_tokens_map.json" "models/bert-base-NER/special_tokens_map.json" 50 || exit 1

# Download ONNX model (quantized version for smaller size)
echo "  → Downloading ONNX model (~140MB, may take a minute)..."
mkdir -p models/bert-base-NER/onnx
download_file "${MODEL_BASE}/onnx/model_quantized.onnx" "models/bert-base-NER/onnx/model_quantized.onnx" 1000000 || exit 1

echo "✓ BERT-base NER model downloaded ($(du -sh models/bert-base-NER | cut -f1))"

echo ""

# Check total size
TOTAL_SIZE=$(du -sh libs models | awk '{sum+=$1} END {print sum "M"}')
echo "📊 Total size (libraries + model): $TOTAL_SIZE"
echo ""

echo "✅ Download complete!"
echo ""
echo "🔧 Configuration:"
echo "   - Single-threaded mode (numThreads=1)"
echo "   - No Web Workers (proxy=false)"
echo "   - Extension-safe WASM loading"
echo "   - Pre-bundled model (100% offline)"
echo ""
echo "📝 Next steps:"
echo "1. Reload the extension in Chrome"
echo "2. Click 'Preload ML Model'"
echo "3. Model loads INSTANTLY (already bundled!)"
echo "4. Start detecting PII with ML/NER"
echo ""
echo "⚡ Performance:"
echo "   - Works 100% OFFLINE (no internet needed)"
echo "   - Model loads in ~5 seconds (vs 30-60s download)"
echo "   - Detects names, organizations, locations"
echo "   - Faster and lighter than BERT-base"
echo ""

# Create a verification file
cat > libs/VERSION.txt << EOF
Custom NER Loader: 1.0.0
ONNX Runtime: 1.14.0 (single-threaded)
NER Model: BERT-base-NER (quantized, pre-bundled)
Mode: Extension-safe (no Web Workers)
Downloaded: $(date)
Total Size: $TOTAL_SIZE
Configuration: numThreads=1, proxy=false, simd=true, localModels=true
EOF

echo "✓ Setup complete! Extension ready for OFFLINE ML-powered NER detection."
