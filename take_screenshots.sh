#!/bin/bash
#
# TAKE SCREENSHOTS OF ALL APPS
# Saves to each app directory
#

echo "=========================================="
echo "TAKING APP SCREENSHOTS"
echo "=========================================="
echo ""
echo "This will open each app and save screenshots"
echo "You'll need to:"
echo "  1. Make sure local server is running (port 8000)"
echo "  2. Take manual screenshots of each app"
echo "  3. Save them to the paths shown below"
echo ""
echo "Press ENTER to see the screenshot checklist..."
read

echo ""
echo "📸 SCREENSHOT CHECKLIST"
echo "=========================================="
echo ""

echo "1️⃣  MediaLog"
echo "   URL: http://localhost:8000/medialog/"
echo "   Save to: /Users/curiobot/Sites/1n2.org/medialog/screenshot.png"
echo "   Capture: Main dashboard with stats/posters"
echo ""
read -p "Press ENTER when screenshot saved..."

echo ""
echo "2️⃣  AI Workflows"
echo "   URL: http://localhost:8000/workflows/"
echo "   Save to: /Users/curiobot/Sites/1n2.org/workflows/screenshot.png"
echo "   Capture: Workflow pattern cards"
echo ""
read -p "Press ENTER when screenshot saved..."

echo ""
echo "3️⃣  Tweetster"
echo "   URL: http://localhost:8000/tweetster/"
echo "   Save to: /Users/curiobot/Sites/1n2.org/tweetster/screenshot.png"
echo "   Capture: Tweet feed with topics visible"
echo ""
read -p "Press ENTER when screenshot saved..."

echo ""
echo "4️⃣  CurioCharts"
echo "   URL: http://localhost:8000/curiocharts/"
echo "   Save to: /Users/curiobot/Sites/1n2.org/curiocharts/screenshot.png"
echo "   Capture: Card grid with floor prices"
echo ""
read -p "Press ENTER when screenshot saved..."

echo ""
echo "5️⃣  Curio Archive"
echo "   URL: http://localhost:8000/curioarchive/"
echo "   Save to: /Users/curiobot/Sites/1n2.org/curioarchive/screenshot.png"
echo "   Capture: Main gallery or featured card"
echo ""
read -p "Press ENTER when screenshot saved..."

echo ""
echo "=========================================="
echo "✅ ALL SCREENSHOTS SAVED!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run: ./update_screenshots.sh"
echo "  2. This will update the HTML with new images"
echo "  3. Deploy to production"
echo ""
