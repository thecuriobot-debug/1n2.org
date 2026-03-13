#!/bin/bash
#
# DEPLOY CURIOCHARTS TO 1N2.ORG
# Quick deployment script
#

cd "$(dirname "$0")"

echo "=========================================="
echo "DEPLOYING CURIOCHARTS TO 1N2.ORG"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found"
    echo "   Run this script from the curiocharts directory"
    exit 1
fi

echo "📦 Files to deploy:"
ls -lh index.html data.json 2>/dev/null | tail -2

echo ""
read -p "Deploy to https://1n2.org/curiocharts/? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🚀 Deploying..."
echo ""

# Deploy via rsync
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.md' \
  --exclude '*.log' \
  --exclude 'scrape_playwright.py' \
  --exclude 'scrape_opensea_browser.py' \
  --exclude 'fetch_multisource.py' \
  --exclude 'opensea_manual.py' \
  --exclude 'update.sh' \
  --exclude 'deploy.sh' \
  ./ root@1n2.org:/var/www/html/curiocharts/

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "🔒 Fixing permissions..."
ssh root@1n2.org "chown -R www-data:www-data /var/www/html/curiocharts && chmod -R 755 /var/www/html/curiocharts"

echo ""
echo "✅ Verifying deployment..."
curl -I https://1n2.org/curiocharts/ 2>&1 | grep "HTTP"

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Live site: https://1n2.org/curiocharts/"
echo ""
echo "Next steps:"
echo "  1. Visit the site and verify it works"
echo "  2. Check that prices are displaying"
echo "  3. Test on mobile"
echo ""
