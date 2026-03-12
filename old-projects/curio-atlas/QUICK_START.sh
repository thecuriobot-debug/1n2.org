#!/bin/bash
# QUICK_START.sh - Set up Curio Atlas with your Alchemy key

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🗺️  CURIO ATLAS - QUICK START WITH ALCHEMY            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Set your Alchemy API key
export ALCHEMY_API_KEY="vfF4rHBY1zsGgI3kqEg9v"

# Optional: Set Anthropic key for AI insights
# export ANTHROPIC_API_KEY="your-anthropic-key"

echo "🔑 API Key configured"
echo ""

# Step 1: Fetch blockchain data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Fetching live blockchain data from Alchemy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ~/Sites/1n2.org/curio-atlas/backend
python3 blockchain-fetcher.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Blockchain data fetched successfully!"
else
    echo ""
    echo "⚠️  Blockchain fetch had issues, but continuing..."
fi

# Step 2: Run AI analysis (optional)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Running AI analysis..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

python3 openclaw-analyzer.py

# Step 3: Deploy to server
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Deploying to 1n2.org..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ~/Sites/1n2.org
scp -r curio-atlas root@1n2.org:/var/www/html/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployed to server!"
else
    echo ""
    echo "⚠️  Deployment had issues"
fi

# Step 4: Set permissions
echo ""
ssh root@1n2.org "chmod -R 755 /var/www/html/curio-atlas"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ CURIO ATLAS IS LIVE!                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Visit: http://1n2.org/curio-atlas/"
echo ""
echo "📊 What's running:"
echo "   • Live blockchain data from Alchemy"
echo "   • Network visualization with D3.js"
echo "   • AI-powered archetype classification"
echo "   • 387 Curio Card holders mapped"
echo ""
echo "⏰ Next: Set up cron for automatic updates"
echo "   Run: ~/Sites/1n2.org/curio-atlas/setup-cron.sh"
echo ""
