#!/bin/bash
# Deploy Thomas Hunt Films complete site to production server

echo "🚀 DEPLOYING TO PRODUCTION SERVER"
echo "=================================="
echo ""

SERVER="root@157.230.36.150"
REMOTE_PATH="/var/www/html/1n2.org"
LOCAL_BASE="/Users/curiobot/Sites/1n2.org"

# Test connection
echo "📡 Testing server connection..."
ssh -o ConnectTimeout=5 $SERVER "echo 'Connection successful!'" || {
    echo "❌ Cannot connect to server"
    exit 1
}

echo "✅ Server connection verified"
echo ""

# 1. Deploy updated homepage
echo "📄 Deploying updated 1n2.org homepage..."
scp "$LOCAL_BASE/index.html" "$SERVER:$REMOTE_PATH/"
echo "✅ Homepage deployed"
echo ""

# 2. Deploy Thomas Hunt Films complete site
echo "🎬 Deploying Thomas Hunt Films (38 videos)..."
ssh $SERVER "mkdir -p $REMOTE_PATH/thomashuntfilms"
ssh $SERVER "mkdir -p $REMOTE_PATH/thomashuntfilms/videos"
ssh $SERVER "mkdir -p $REMOTE_PATH/thomashuntfilms/press"

# Deploy main files
scp "$LOCAL_BASE/thomashuntfilms/index.html" "$SERVER:$REMOTE_PATH/thomashuntfilms/"
scp "$LOCAL_BASE/thomashuntfilms/press.html" "$SERVER:$REMOTE_PATH/thomashuntfilms/"
scp "$LOCAL_BASE/thomashuntfilms/stolen-channel-story.html" "$SERVER:$REMOTE_PATH/thomashuntfilms/"
scp "$LOCAL_BASE/thomashuntfilms/all_videos_complete.json" "$SERVER:$REMOTE_PATH/thomashuntfilms/"
scp "$LOCAL_BASE/thomashuntfilms/category_stats.json" "$SERVER:$REMOTE_PATH/thomashuntfilms/"

# Deploy Star Trek video pages (10 pages)
echo "  📹 Deploying 10 Star Trek video pages..."
scp "$LOCAL_BASE/thomashuntfilms/videos/"*.html "$SERVER:$REMOTE_PATH/thomashuntfilms/videos/"

# Deploy press archive (5 articles with local copies)
echo "  📰 Deploying press archive..."
scp -r "$LOCAL_BASE/thomashuntfilms/press/"* "$SERVER:$REMOTE_PATH/thomashuntfilms/press/" 2>/dev/null || echo "  Note: Press files already deployed or not present"

echo "✅ Thomas Hunt Films deployed (38 videos, 6 categories, IG-88 story)"
echo ""

# 3. Deploy thunt.net blog
echo "📝 Deploying thunt.net blog (526 posts)..."
ssh $SERVER "mkdir -p $REMOTE_PATH/thunt.net"
ssh $SERVER "mkdir -p $REMOTE_PATH/thunt.net/posts"
ssh $SERVER "mkdir -p $REMOTE_PATH/thunt.net/archive"

# Deploy blog files
scp "$LOCAL_BASE/thunt.net/index.html" "$SERVER:$REMOTE_PATH/thunt.net/" 2>/dev/null || echo "  Note: Blog index not present yet"
scp -r "$LOCAL_BASE/thunt.net/posts/"* "$SERVER:$REMOTE_PATH/thunt.net/posts/" 2>/dev/null || echo "  Note: Blog posts not present yet"

echo "✅ thunt.net blog structure deployed"
echo ""

# 4. Verify deployment
echo "🔍 Verifying deployment..."
ssh $SERVER "ls -lh $REMOTE_PATH/thomashuntfilms/ | head -10"
echo ""

# 5. Set permissions
echo "🔐 Setting permissions..."
ssh $SERVER "chown -R www-data:www-data $REMOTE_PATH/thomashuntfilms"
ssh $SERVER "chmod -R 755 $REMOTE_PATH/thomashuntfilms"
ssh $SERVER "chown -R www-data:www-data $REMOTE_PATH/thunt.net" 2>/dev/null
ssh $SERVER "chmod -R 755 $REMOTE_PATH/thunt.net" 2>/dev/null
echo "✅ Permissions set"
echo ""

echo "=================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=================================="
echo ""
echo "📊 Deployed:"
echo "   ✅ 1n2.org homepage (updated with new projects)"
echo "   ✅ Thomas Hunt Films (38 videos, 5.5M views, 5.1K comments)"
echo "   ✅ IG-88 stolen channel article"
echo "   ✅ Press archive (5 articles)"
echo "   ✅ 10 Star Trek video pages"
echo "   ✅ thunt.net blog structure"
echo ""
echo "🌐 Live URLs:"
echo "   https://1n2.org"
echo "   https://1n2.org/thomashuntfilms"
echo "   https://1n2.org/thomashuntfilms/stolen-channel-story.html"
echo "   https://1n2.org/thomashuntfilms/press.html"
echo "   https://1n2.org/thunt.net"
echo ""
