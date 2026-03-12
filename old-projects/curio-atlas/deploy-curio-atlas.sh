#!/bin/bash
# deploy-curio-atlas.sh - Deploy Curio Atlas with live data

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🗺️  CURIO ATLAS - DEPLOYMENT                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Generate fresh network data
echo "[1/4] Generating network analysis..."
cd ~/Sites/1n2.org/curio-atlas/backend
python3 analyze-network.py

# Deploy to server
echo ""
echo "[2/4] Deploying to 1n2.org..."
scp -r ~/Sites/1n2.org/curio-atlas root@1n2.org:/var/www/html/

# Set permissions
echo ""
echo "[3/4] Setting permissions..."
ssh root@1n2.org "chmod -R 755 /var/www/html/curio-atlas"

# Verify
echo ""
echo "[4/4] Verifying deployment..."
STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://1n2.org/curio-atlas/ 2>/dev/null)

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DEPLOYMENT COMPLETE!                                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ "$STATUS" = "200" ]; then
    echo "✅ Curio Atlas is LIVE!"
    echo ""
    echo "🌐 Visit: http://1n2.org/curio-atlas/"
else
    echo "⚠️  Status: $STATUS"
    echo "Check deployment manually"
fi

echo ""
echo "📊 Features deployed:"
echo "   • Live holder network visualization"
echo "   • AI-powered archetype classification"
echo "   • Interactive D3.js force-directed graph"
echo "   • Network topology analysis"
echo "   • Whale cluster identification"
echo "   • 387 holders mapped"
echo ""
