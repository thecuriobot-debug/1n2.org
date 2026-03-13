#!/bin/bash
# deploy-live-integration.sh - Deploy Curio Terminal with live data integration

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DEPLOYING CURIO TERMINAL - LIVE DATA INTEGRATION        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Deploy updated HTML
echo "[1/5] Deploying updated terminal UI..."
scp ~/Sites/1n2.org/curio-terminal/index.html root@1n2.org:/var/www/html/curio-terminal/
echo "✅ HTML deployed"

# Deploy live data script
echo ""
echo "[2/5] Deploying live data JavaScript..."
scp ~/Sites/1n2.org/curio-terminal/live-data.js root@1n2.org:/var/www/html/curio-terminal/
echo "✅ JavaScript deployed"

# Create data directory on server
echo ""
echo "[3/5] Creating data directory on server..."
ssh root@1n2.org "mkdir -p /var/www/html/curio-terminal/data"
echo "✅ Data directory created"

# Deploy initial data
echo ""
echo "[4/5] Deploying initial data..."
scp ~/Sites/1n2.org/curio-terminal/data/summary.json root@1n2.org:/var/www/html/curio-terminal/data/
echo "✅ Data deployed"

# Deploy backend scripts
echo ""
echo "[5/5] Deploying backend scripts..."
scp ~/Sites/1n2.org/curio-terminal/backend/*.sh root@1n2.org:/var/www/html/curio-terminal/backend/
ssh root@1n2.org "chmod +x /var/www/html/curio-terminal/backend/*.sh"
echo "✅ Backend scripts deployed"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DEPLOYMENT COMPLETE!                                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Curio Terminal is now connected to LIVE data!"
echo ""
echo "Visit: http://1n2.org/curio-terminal/"
echo ""
echo "The terminal will:"
echo "• Fetch live data from summary.json"
echo "• Auto-refresh every 60 seconds"
echo "• Show real-time market metrics"
echo ""
echo "To update data, run on server:"
echo "  ssh root@1n2.org"
echo "  /var/www/html/curio-terminal/backend/update-terminal-data.sh"
echo ""
