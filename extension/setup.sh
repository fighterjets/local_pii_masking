#!/bin/bash

echo "🔒 Local PII Masking Extension Setup"
echo "=================================="
echo ""

# Create icons directory
echo "📁 Creating icons directory..."
mkdir -p icons

# Check if icons directory was created
if [ -d "icons" ]; then
  echo "✓ Icons directory created"
else
  echo "✗ Failed to create icons directory"
  exit 1
fi

# Open the icon generator in browser
echo ""
echo "🎨 Opening icon generator..."
echo ""
echo "INSTRUCTIONS:"
echo "1. The icon generator will open in your browser"
echo "2. Icons will be automatically generated"
echo "3. Download or right-click save each icon:"
echo "   - icon16.png"
echo "   - icon48.png"
echo "   - icon128.png"
echo "4. Save all icons to the 'icons' folder"
echo ""

# Detect OS and open browser accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open generate-icons.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  xdg-open generate-icons.html 2>/dev/null || sensible-browser generate-icons.html 2>/dev/null
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  # Windows
  start generate-icons.html
else
  echo "Please manually open generate-icons.html in your browser"
fi

# Wait for user confirmation
echo ""
read -p "Press Enter once you've saved all three icons to the icons/ folder..."

# Check if all icons exist
ICONS_EXIST=true

if [ ! -f "icons/icon16.png" ]; then
  echo "✗ Missing: icons/icon16.png"
  ICONS_EXIST=false
fi

if [ ! -f "icons/icon48.png" ]; then
  echo "✗ Missing: icons/icon48.png"
  ICONS_EXIST=false
fi

if [ ! -f "icons/icon128.png" ]; then
  echo "✗ Missing: icons/icon128.png"
  ICONS_EXIST=false
fi

if [ "$ICONS_EXIST" = true ]; then
  echo ""
  echo "✓ All icons found!"
  echo ""
  echo "🚀 Extension is ready!"
  echo ""
  echo "Next steps:"
  echo "1. Open Chrome and go to: chrome://extensions/"
  echo "2. Enable 'Developer mode' (toggle in top-right)"
  echo "3. Click 'Load unpacked'"
  echo "4. Select this folder: $(pwd)"
  echo ""
  echo "📚 See README.md for full testing and publishing instructions"
else
  echo ""
  echo "⚠️  Some icons are missing. Please ensure all three icons are saved to the icons/ folder"
  echo "Then run this script again or manually verify the files"
fi

echo ""
