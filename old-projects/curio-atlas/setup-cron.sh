#!/bin/bash
# setup-cron.sh - Install cron jobs for Curio Atlas automation

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ⏰ CURIO ATLAS - CRON JOB SETUP                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Make scripts executable
chmod +x ~/Sites/1n2.org/curio-atlas/backend/*.sh
chmod +x ~/Sites/1n2.org/curio-atlas/backend/*.py

echo "✅ Scripts made executable"
echo ""

# Create cron jobs
CRON_FILE=$(mktemp)

# Export existing crontab
crontab -l > "$CRON_FILE" 2>/dev/null || true

# Remove any existing Curio Atlas jobs
sed -i.bak '/curio-atlas/d' "$CRON_FILE"

echo "📝 Adding cron jobs..."
echo ""

# Add new jobs
cat >> "$CRON_FILE" << 'EOF'

# Curio Atlas - Network Updates
# Update blockchain data every 6 hours
0 */6 * * * ~/Sites/1n2.org/curio-atlas/backend/cron-update-atlas.sh

# Curio Atlas - AI Analysis  
# Run OpenClaw analysis daily at 2 AM
0 2 * * * cd ~/Sites/1n2.org/curio-atlas/backend && python3 openclaw-analyzer.py >> ~/curio-atlas-cron.log 2>&1

# Curio Atlas - Weekly deep analysis
# Full network recomputation every Sunday at 3 AM
0 3 * * 0 cd ~/Sites/1n2.org/curio-atlas/backend && python3 blockchain-fetcher.py --full-sync >> ~/curio-atlas-cron.log 2>&1

EOF

# Install new crontab
crontab "$CRON_FILE"
rm "$CRON_FILE"

echo "✅ Cron jobs installed!"
echo ""
echo "📋 Scheduled jobs:"
echo "   • Every 6 hours: Fetch blockchain data + deploy"
echo "   • Daily at 2 AM: OpenClaw AI analysis"
echo "   • Weekly (Sunday 3 AM): Full network recomputation"
echo ""
echo "📊 View logs:"
echo "   tail -f ~/curio-atlas-cron.log"
echo ""
echo "🔧 Manage cron:"
echo "   crontab -l  (view)"
echo "   crontab -e  (edit)"
echo ""

# Show current crontab
echo "Current crontab:"
echo "────────────────────────────────────────────────────────"
crontab -l | grep -A 10 "Curio Atlas" || echo "No Curio Atlas jobs found"
echo "────────────────────────────────────────────────────────"
echo ""
echo "✅ Setup complete!"
