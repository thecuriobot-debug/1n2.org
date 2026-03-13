#!/bin/bash
# DEPLOYMENT COMMANDS - Copy and paste these into your terminal
# You'll need to authenticate manually

echo "🚀 DEPLOYING TO PRODUCTION - 1N2.ORG"
echo "====================================="
echo ""
echo "Server: 157.230.36.150"
echo "You will be prompted for password/authentication"
echo ""
echo "Press ENTER to continue..."
read

# Test connection first
echo "Testing connection..."
ssh -o PreferredAuthentications=password root@157.230.36.150 "echo 'Connection successful!'" || {
    echo "❌ Connection failed. Please check credentials."
    exit 1
}

echo ""
echo "✅ Connected! Starting deployment..."
echo ""

# Create directories
echo "1️⃣ Creating directories..."
ssh -o PreferredAuthentications=password root@157.230.36.150 "mkdir -p /var/www/html/1n2.org/thomashuntfilms/videos /var/www/html/1n2.org/thomashuntfilms/press /var/www/html/1n2.org/thunt.net"
echo "✅ Directories created"
echo ""

# Deploy homepage
echo "2️⃣ Deploying updated homepage..."
scp -o PreferredAuthentications=password /Users/curiobot/Sites/1n2.org/index.html root@157.230.36.150:/var/www/html/1n2.org/
echo "✅ Homepage deployed"
echo ""

# Deploy Thomas Hunt Films main files
echo "3️⃣ Deploying Thomas Hunt Films main files..."
scp -o PreferredAuthentications=password /Users/curiobot/Sites/1n2.org/thomashuntfilms/index.html root@157.230.36.150:/var/www/html/1n2.org/thomashuntfilms/
scp -o PreferredAuthentications=password /Users/curiobot/Sites/1n2.org/thomashuntfilms/press.html root@157.230.36.150:/var/www/html/1n2.org/thomashuntfilms/
scp -o PreferredAuthentications=password /Users/curiobot/Sites/1n2.org/thomashuntfilms/stolen-channel-story.html root@157.230.36.150:/var/www/html/1n2.org/thomashuntfilms/
echo "✅ Main files deployed"
echo ""

# Deploy Star Trek video pages
echo "4️⃣ Deploying 10 Star Trek video pages..."
scp -o PreferredAuthentications=password /Users/curiobot/Sites/1n2.org/thomashuntfilms/videos/*.html root@157.230.36.150:/var/www/html/1n2.org/thomashuntfilms/videos/
echo "✅ Video pages deployed"
echo ""

# Deploy press archive
echo "5️⃣ Deploying press archive..."
scp -o PreferredAuthentications=password -r /Users/curiobot/Sites/1n2.org/thomashuntfilms/press/* root@157.230.36.150:/var/www/html/1n2.org/thomashuntfilms/press/
echo "✅ Press archive deployed"
echo ""

# Set permissions
echo "6️⃣ Setting permissions..."
ssh -o PreferredAuthentications=password root@157.230.36.150 "chown -R www-data:www-data /var/www/html/1n2.org/thomashuntfilms && chmod -R 755 /var/www/html/1n2.org/thomashuntfilms"
echo "✅ Permissions set"
echo ""

echo "====================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "====================================="
echo ""
echo "🌐 Live URLs:"
echo "   https://1n2.org"
echo "   https://1n2.org/thomashuntfilms"
echo "   https://1n2.org/thomashuntfilms/stolen-channel-story.html"
echo "   https://1n2.org/thomashuntfilms/press.html"
echo ""
echo "📊 Deployed:"
echo "   ✅ Updated homepage"
echo "   ✅ Thomas Hunt Films (38 videos)"
echo "   ✅ IG-88 stolen channel article"
echo "   ✅ Press archive (5 articles)"
echo "   ✅ 10 Star Trek video pages"
echo ""
