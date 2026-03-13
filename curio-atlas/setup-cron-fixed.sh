#!/bin/bash
# setup-cron-fixed.sh - Install cron jobs for Curio Atlas

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ⏰ CURIO ATLAS - CRON JOB SETUP (FIXED)                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# First, install requests library (needed for cron automation)
echo "📦 Installing Python requests library..."
echo ""

# Try user install first
pip3 install requests --user 2>/dev/null

if [ $? -ne 0 ]; then
    echo "⚠️  User install failed, trying with --break-system-packages..."
    pip3 install requests --break-system-packages
fi

if [ $? -eq 0 ]; then
    echo "✅ requests library installed"
else
    echo "❌ Could not install requests"
    echo "   Cron jobs will use stdlib version instead"
fi

echo ""

# Make scripts executable
chmod +x ~/Sites/1n2.org/curio-atlas/backend/*.sh 2>/dev/null
chmod +x ~/Sites/1n2.org/curio-atlas/backend/*.py 2>/dev/null

echo "✅ Scripts made executable"
echo ""

# Create cron jobs
CRON_FILE=$(mktemp)

# Export existing crontab
crontab -l > "$CRON_FILE" 2>/dev/null || true

# Remove any existing Curio Atlas jobs
sed -i.bak '/curio-atlas/d' "$CRON_FILE" 2>/dev/null || sed -i '' '/curio-atlas/d' "$CRON_FILE"

echo "📝 Adding cron jobs..."
echo ""

# Add new jobs with API key in environment
cat >> "$CRON_FILE" << 'EOF'

# Curio Atlas - Automated Updates
# Update blockchain data every 6 hours (uses stdlib version, no dependencies)
0 */6 * * * export ALCHEMY_API_KEY="vfF4rHBY1zsGgI3kqEg9v" && cd ~/Sites/1n2.org/curio-atlas/backend && python3 blockchain-fetcher-stdlib.py >> ~/curio-atlas-cron.log 2>&1 && scp ~/Sites/1n2.org/curio-atlas/data/network.json root@1n2.org:/var/www/html/curio-atlas/data/ >> ~/curio-atlas-cron.log 2>&1

# Curio Atlas - Weekly full sync (every Sunday at 3 AM)
0 3 * * 0 export ALCHEMY_API_KEY="vfF4rHBY1zsGgI3kqEg9v" && cd ~/Sites/1n2.org/curio-atlas/backend && python3 blockchain-fetcher-stdlib.py >> ~/curio-atlas-cron.log 2>&1

EOF

# Install new crontab
crontab "$CRON_FILE"
rm "$CRON_FILE"

echo "✅ Cron jobs installed!"
echo ""
echo "📋 Scheduled jobs:"
echo "   • Every 6 hours: Fetch blockchain data + auto-deploy"
echo "   • Weekly (Sunday 3 AM): Full network recomputation"
echo ""
echo "📊 View logs:"
echo "   tail -f ~/curio-atlas-cron.log"
echo ""
echo "🔧 Manage cron:"
echo "   crontab -l  (view all jobs)"
echo "   crontab -e  (edit jobs)"
echo ""

# Show current crontab
echo "Current Curio Atlas jobs:"
echo "────────────────────────────────────────────────────────"
crontab -l | grep -A 5 "Curio Atlas" || echo "No jobs found"
echo "────────────────────────────────────────────────────────"
echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 What happens now:"
echo "   • Every 6 hours: Curio Atlas updates automatically"
echo "   • Fresh blockchain data fetched from Alchemy"
echo "   • Network.json regenerated with latest holders"
echo "   • Automatically deployed to 1n2.org"
echo ""
