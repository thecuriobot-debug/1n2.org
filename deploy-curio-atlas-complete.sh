#!/bin/bash
# deploy-curio-atlas-complete.sh - Deploy Curio Atlas + Updated Homepage

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🚀 DEPLOYING CURIO ATLAS + HOMEPAGE UPDATES           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "[1/3] Deploying Curio Atlas..."
scp -r ~/Sites/1n2.org/curio-atlas root@1n2.org:/var/www/html/

echo ""
echo "[2/3] Deploying updated homepage..."
scp ~/Sites/1n2.org/index.html root@1n2.org:/var/www/html/

echo ""
echo "[3/3] Setting permissions..."
ssh root@1n2.org "chmod -R 755 /var/www/html/curio-atlas"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE!                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Live URLs:"
echo "  • Homepage: http://1n2.org/"
echo "  • Curio Atlas: http://1n2.org/curio-atlas/"
echo ""
echo "📊 What's Updated:"
echo "  ✅ Hero stats: 280K+ code, 160+ hours, 22K+ prompts, 16 apps"
echo "  ✅ Curio Atlas card added to product grid"
echo "  ✅ Feb 19 timeline entry added"
echo "  ✅ CurioHub updated to 7 projects"
echo ""
echo "🗺️ Curio Atlas Features:"
echo "  • 4,954 real holders from blockchain"
echo "  • Live Alchemy API integration"
echo "  • D3.js force-directed network graph"
echo "  • AI archetype classification"
echo "  • SQLite database with 5 tables"
echo "  • Auto-updates every 6 hours"
echo ""
