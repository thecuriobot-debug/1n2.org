#!/bin/bash
# Manual deployment script for 1n2.org
# This script will prompt for password for each scp command
# Run this from your local machine

SERVER="root@157.230.36.150"
REMOTE_PATH="/var/www/html/1n2.org"
LOCAL_BASE="/Users/curiobot/Sites/1n2.org"

echo "🚀 DEPLOYING 1N2.ORG TO DROPLET"
echo "================================"
echo ""
echo "Server: $SERVER"
echo "This will require your server password for each file transfer."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# 1. Deploy homepage
echo "📄 Deploying 1n2.org homepage..."
scp "$LOCAL_BASE/index.html" "$SERVER:$REMOTE_PATH/" || exit 1
echo "✅ Homepage deployed"
echo ""

# 2. Deploy Thomas Hunt Films
echo "🎬 Deploying Thomas Hunt Films..."
echo "  Creating directories on server..."
ssh "$SERVER" "mkdir -p $REMOTE_PATH/thomashuntfilms/videos $REMOTE_PATH/thomashuntfilms/press" || exit 1

echo "  Uploading main files..."
scp "$LOCAL_BASE/thomashuntfilms/index.html" "$SERVER:$REMOTE_PATH/thomashuntfilms/" || exit 1
scp "$LOCAL_BASE/thomashuntfilms/press.html" "$SERVER:$REMOTE_PATH/thomashuntfilms/" || exit 1
scp "$LOCAL_BASE/thomashuntfilms/stolen-channel-story.html" "$SERVER:$REMOTE_PATH/thomashuntfilms/" || exit 1

echo "  Uploading Star Trek video pages..."
scp "$LOCAL_BASE/thomashuntfilms/videos/"*.html "$SERVER:$REMOTE_PATH/thomashuntfilms/videos/" || exit 1

echo "  Uploading press archive..."
scp -r "$LOCAL_BASE/thomashuntfilms/press/"* "$SERVER:$REMOTE_PATH/thomashuntfilms/press/" 2>/dev/null

echo "✅ Thomas Hunt Films deployed"
echo ""

# 3. Deploy thunt.net
echo "📝 Deploying thunt.net..."
echo "  Creating directories on server..."
ssh "$SERVER" "mkdir -p $REMOTE_PATH/thunt.net/posts $REMOTE_PATH/thunt.net/archive" || exit 1

echo "  Uploading blog files..."
scp "$LOCAL_BASE/thunt.net/index.html" "$SERVER:$REMOTE_PATH/thunt.net/" 2>/dev/null || echo "  (Blog index not found locally, skipping)"
scp -r "$LOCAL_BASE/thunt.net/posts/"* "$SERVER:$REMOTE_PATH/thunt.net/posts/" 2>/dev/null || echo "  (Blog posts not found locally, skipping)"
scp -r "$LOCAL_BASE/thunt.net/archive/"* "$SERVER:$REMOTE_PATH/thunt.net/archive/" 2>/dev/null || echo "  (Blog archive not found locally, skipping)"

echo "✅ thunt.net structure deployed"
echo ""

# 4. Set permissions
echo "🔐 Setting permissions on server..."
ssh "$SERVER" "chown -R www-data:www-data $REMOTE_PATH/thomashuntfilms $REMOTE_PATH/thunt.net 2>/dev/null; chmod -R 755 $REMOTE_PATH/thomashuntfilms $REMOTE_PATH/thunt.net" || exit 1
echo "✅ Permissions set"
echo ""

echo "================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "================================"
echo ""
echo "🌐 Live URLs:"
echo "   https://1n2.org"
echo "   https://1n2.org/thomashuntfilms"
echo "   https://1n2.org/thomashuntfilms/stolen-channel-story.html"
echo "   https://1n2.org/thomashuntfilms/press.html"
echo "   https://1n2.org/thunt.net"
echo ""
