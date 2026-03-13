#!/bin/bash
# One-command deployment with password
# You'll be prompted for password a few times

echo "🚀 Deploying 1n2.org to server..."
echo ""

cd /Users/curiobot/Sites/1n2.org

# Single rsync command for each directory
echo "📄 Uploading homepage..."
scp index.html root@157.230.36.150:/var/www/html/1n2.org/

echo ""
echo "🎬 Uploading Thomas Hunt Films..."
scp -r thomashuntfilms root@157.230.36.150:/var/www/html/1n2.org/

echo ""
echo "📝 Uploading thunt.net..."
scp -r thunt.net root@157.230.36.150:/var/www/html/1n2.org/

echo ""
echo "🔐 Setting permissions..."
ssh root@157.230.36.150 "chown -R www-data:www-data /var/www/html/1n2.org && chmod -R 755 /var/www/html/1n2.org"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Visit: https://1n2.org"
