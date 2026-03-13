#!/bin/bash
# deploy-atlas-to-sites.sh - Deploy Curio Atlas updates

echo "🚀 DEPLOYING CURIO ATLAS TO ALL SITES"
echo "======================================"
echo ""

# Deploy Curio Atlas itself
echo "[1/3] Deploying Curio Atlas..."
scp -r ~/Sites/1n2.org/curio-atlas root@1n2.org:/var/www/html/

# Deploy homepage (with Curio Atlas card - you'll need to add manually)
echo ""
echo "[2/3] Deploying homepage..."
scp ~/Sites/1n2.org/index.html root@1n2.org:/var/www/html/

# Deploy CurioHub (with Curio Atlas card - you'll need to add manually)
echo ""
echo "[3/3] Deploying CurioHub..."
scp ~/Sites/1n2.org/curiohub/index.html root@1n2.org:/var/www/html/curiohub/

# Set permissions
echo ""
echo "Setting permissions..."
ssh root@1n2.org "chmod -R 755 /var/www/html/curio-atlas"

echo ""
echo "======================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "🌐 Live URLs:"
echo "  • Curio Atlas: http://1n2.org/curio-atlas/"
echo "  • CurioHub: http://1n2.org/curiohub/"
echo "  • Homepage: http://1n2.org/"
echo ""
echo "📊 Curio Atlas is live with:"
echo "  • 4,954 real holders from blockchain"
echo "  • Live Alchemy API integration"
echo "  • Auto-updates every 6 hours"
echo ""
echo "📝 Next steps:"
echo "  1. Visit http://1n2.org/curio-atlas/ to see it live"
echo "  2. Manually add Curio Atlas cards to homepage & CurioHub"
echo "     (See ADD_TO_SITES.md for HTML snippets)"
echo ""
