#!/bin/bash
# Deploy new content to 1n2.org droplet
# Includes: THunt Reader, MB Games, Google News, Tweetster, Facebooker, updated homepage
set -e

SERVER="root@157.245.186.58"
REMOTE="/var/www/html"
LOCAL="/Users/curiobot/Sites/1n2.org"

echo "=== Deploying to 1n2.org ==="
echo ""

# 1. Create directories on server
echo "Creating directories..."
ssh $SERVER "mkdir -p $REMOTE/reader $REMOTE/mb-games $REMOTE/google-news $REMOTE/tweetster $REMOTE/facebooker" && echo "  OK"

# 2. Upload updated homepage
echo "Uploading homepage..."
scp $LOCAL/index.html $SERVER:$REMOTE/index.html && echo "  OK"

# 3. Upload THunt Reader
echo "Uploading THunt Reader..."
scp $LOCAL/reader/index.html $SERVER:$REMOTE/reader/index.html && echo "  OK"

# 4. Upload MB Games
echo "Uploading MB Games..."
rsync -av --exclude='node_modules' --exclude='.git' $LOCAL/mb-games/ $SERVER:$REMOTE/mb-games/ && echo "  OK"

# 5. Upload Google News
echo "Uploading Google News..."
scp $LOCAL/google-news/index.html $SERVER:$REMOTE/google-news/index.html 2>/dev/null && echo "  OK" || echo "  No index.html yet"
ls $LOCAL/google-news/*.html 2>/dev/null | while read f; do
    scp "$f" $SERVER:$REMOTE/google-news/ 2>/dev/null
done

# 6. Upload Tweetster
echo "Uploading Tweetster..."
scp $LOCAL/tweetster/index.html $SERVER:$REMOTE/tweetster/index.html 2>/dev/null && echo "  OK" || echo "  No index.html yet"
ls $LOCAL/tweetster/*.html 2>/dev/null | while read f; do
    scp "$f" $SERVER:$REMOTE/tweetster/ 2>/dev/null
done

# 7. Fix permissions
echo "Setting permissions..."
ssh $SERVER "chown -R www-data:www-data $REMOTE/reader $REMOTE/mb-games $REMOTE/google-news $REMOTE/tweetster 2>/dev/null; chmod -R 755 $REMOTE/reader $REMOTE/mb-games $REMOTE/google-news $REMOTE/tweetster 2>/dev/null" && echo "  OK"

echo ""
echo "=== Deploy complete ==="
echo "  https://1n2.org/            (homepage with new cards)"
echo "  https://1n2.org/reader/     (THunt Reader dashboard)"
echo "  https://1n2.org/mb-games/   (MB Games)"
echo "  https://1n2.org/google-news/"
echo "  https://1n2.org/tweetster/"
