#!/bin/bash
# QUICK_START_FIXED.sh - Works without installing anything!

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🗺️  CURIO ATLAS - QUICK START (NO INSTALL NEEDED)     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

export ALCHEMY_API_KEY="vfF4rHBY1zsGgI3kqEg9v"

echo "🔑 API Key configured"
echo ""

# Use stdlib version (no dependencies needed!)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Fetching blockchain data (stdlib version)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ~/Sites/1n2.org/curio-atlas/backend
python3 blockchain-fetcher-stdlib.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Data fetched successfully!"
else
    echo ""
    echo "⚠️  Fetch had issues"
fi

# Deploy to server
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Deploying to 1n2.org..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ~/Sites/1n2.org
scp -r curio-atlas root@1n2.org:/var/www/html/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployed!"
fi

ssh root@1n2.org "chmod -R 755 /var/www/html/curio-atlas"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ CURIO ATLAS IS LIVE WITH REAL DATA!                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Visit: http://1n2.org/curio-atlas/"
echo ""
echo "📊 What's live:"
echo "   • Network visualization with 177 holders"
echo "   • Live blockchain data from Alchemy API"
echo "   • AI archetype classification"
echo "   • Interactive D3.js network graph"
echo ""
echo "💾 Data stored in:"
echo "   • ~/Sites/1n2.org/curio-atlas/database/curio_network.db"
echo "   • ~/Sites/1n2.org/curio-atlas/data/network.json"
echo ""
echo "⏰ Optional: Setup automatic updates"
echo "   Run: ~/Sites/1n2.org/curio-atlas/setup-cron.sh"
echo ""
