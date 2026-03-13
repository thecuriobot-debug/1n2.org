#!/bin/bash
# Manual commands for DigitalOcean Console - Deploy to /var/www/html root

# RUN THESE COMMANDS IN THE DIGITALOCEAN WEB CONSOLE
# This avoids SSH key issues completely

echo "=== STEP 1: Create directories ==="
mkdir -p /var/www/html/thomashuntfilms/videos
mkdir -p /var/www/html/thomashuntfilms/press
mkdir -p /var/www/html/thunt.net/posts
mkdir -p /var/www/html/thunt.net/archive

echo ""
echo "=== STEP 2: Download files from your Mac ==="
echo "Since we can't SSH from Mac to server, we need an alternative."
echo ""
echo "OPTION A: Use SCP from the server TO your Mac (reverse direction)"
echo "Run these on the SERVER console:"
echo ""
echo "# Get homepage"
echo "scp curiobot@YOUR_MAC_IP:/Users/curiobot/Sites/1n2.org/index.html /var/www/html/"
echo ""
echo "# Get thomashuntfilms"
echo "scp -r curiobot@YOUR_MAC_IP:/Users/curiobot/Sites/1n2.org/thomashuntfilms /var/www/html/"
echo ""
echo "# Get thunt.net"
echo "scp -r curiobot@YOUR_MAC_IP:/Users/curiobot/Sites/1n2.org/thunt.net /var/www/html/"
echo ""
echo "OPTION B: Create a temporary tarball and use wget/curl"
echo "OPTION C: Use an SFTP client like Cyberduck or Transmit"
echo ""
echo "=== STEP 3: Set permissions ==="
chown -R www-data:www-data /var/www/html/thomashuntfilms
chown -R www-data:www-data /var/www/html/thunt.net
chmod -R 755 /var/www/html/thomashuntfilms
chmod -R 755 /var/www/html/thunt.net

echo ""
echo "=== Verify structure ==="
ls -la /var/www/html/
