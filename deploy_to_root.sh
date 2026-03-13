#!/bin/bash
# Updated deployment for /var/www/html (root level)

SERVER="root@157.230.36.150"
REMOTE_PATH="/var/www/html"
LOCAL_BASE="/Users/curiobot/Sites/1n2.org"

echo "🚀 DEPLOYING TO /var/www/html (ROOT LEVEL)"
echo "=========================================="
echo ""

# 1. Deploy homepage to root
echo "📄 Deploying homepage to /var/www/html/..."
scp "$LOCAL_BASE/index.html" "$SERVER:$REMOTE_PATH/"

# 2. Deploy Thomas Hunt Films to /var/www/html/thomashuntfilms
echo ""
echo "🎬 Deploying Thomas Hunt Films to /var/www/html/thomashuntfilms/..."
ssh "$SERVER" "mkdir -p $REMOTE_PATH/thomashuntfilms/videos $REMOTE_PATH/thomashuntfilms/press"
scp -r "$LOCAL_BASE/thomashuntfilms/"* "$SERVER:$REMOTE_PATH/thomashuntfilms/"

# 3. Deploy thunt.net to /var/www/html/thunt.net
echo ""
echo "📝 Deploying thunt.net to /var/www/html/thunt.net/..."
ssh "$SERVER" "mkdir -p $REMOTE_PATH/thunt.net/posts $REMOTE_PATH/thunt.net/archive"
scp -r "$LOCAL_BASE/thunt.net/"* "$SERVER:$REMOTE_PATH/thunt.net/"

# 4. Set permissions
echo ""
echo "🔐 Setting permissions..."
ssh "$SERVER" "chown -R www-data:www-data $REMOTE_PATH/thomashuntfilms $REMOTE_PATH/thunt.net && chmod -R 755 $REMOTE_PATH/thomashuntfilms $REMOTE_PATH/thunt.net"

echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 URLs:"
echo "   https://1n2.org/"
echo "   https://1n2.org/thomashuntfilms/"
echo "   https://1n2.org/thunt.net/"
