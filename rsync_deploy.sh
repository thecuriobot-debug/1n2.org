#!/bin/bash
# Rsync-based deployment for 1n2.org
# Uses rsync for efficient mirroring (only uploads changed files)

SERVER="root@157.230.36.150"
REMOTE_PATH="/var/www/html/1n2.org"
LOCAL_BASE="/Users/curiobot/Sites/1n2.org"

echo "🚀 SYNCING 1N2.ORG TO DROPLET (rsync)"
echo "====================================="
echo ""
echo "Server: $SERVER"
echo "Method: rsync (efficient, only transfers changes)"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Function to run rsync with progress
sync_dir() {
    local src=$1
    local dest=$2
    local desc=$3
    
    echo "📦 Syncing $desc..."
    rsync -avz --progress "$src" "$SERVER:$dest" || {
        echo "❌ Failed to sync $desc"
        return 1
    }
    echo "✅ $desc synced"
    echo ""
}

# 1. Sync homepage
sync_dir "$LOCAL_BASE/index.html" "$REMOTE_PATH/" "homepage"

# 2. Sync Thomas Hunt Films complete directory
sync_dir "$LOCAL_BASE/thomashuntfilms/" "$REMOTE_PATH/thomashuntfilms/" "Thomas Hunt Films"

# 3. Sync thunt.net complete directory
if [ -d "$LOCAL_BASE/thunt.net" ]; then
    sync_dir "$LOCAL_BASE/thunt.net/" "$REMOTE_PATH/thunt.net/" "thunt.net blog"
else
    echo "ℹ️  thunt.net directory not found locally, skipping"
    echo ""
fi

# 4. Set permissions
echo "🔐 Setting permissions on server..."
ssh "$SERVER" << 'ENDSSH'
chown -R www-data:www-data /var/www/html/1n2.org/thomashuntfilms
chmod -R 755 /var/www/html/1n2.org/thomashuntfilms
chown -R www-data:www-data /var/www/html/1n2.org/thunt.net 2>/dev/null
chmod -R 755 /var/www/html/1n2.org/thunt.net 2>/dev/null
ENDSSH

echo "✅ Permissions set"
echo ""

echo "====================================="
echo "🎉 SYNC COMPLETE!"
echo "====================================="
echo ""
echo "🌐 Live URLs:"
echo "   https://1n2.org"
echo "   https://1n2.org/thomashuntfilms"
echo "   https://1n2.org/thunt.net"
echo ""
