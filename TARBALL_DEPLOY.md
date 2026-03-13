# DEPLOY VIA TARBALL - Easy Upload Method
**Updated for /var/www/html root deployment**

## Files Prepared
✅ Created: ~/Desktop/1n2org-deploy.tar.gz
   Contains: index.html, thomashuntfilms/, thunt.net/

---

## OPTION 1: Upload via DigitalOcean Web Interface (EASIEST)

1. **In DigitalOcean Console**, create a temporary directory:
   ```bash
   mkdir -p /tmp/deploy
   cd /tmp/deploy
   ```

2. **Upload the tarball:**
   - DigitalOcean console has a file upload feature
   - OR use: https://transfer.sh or wetransfer.com to get a download link

3. **If using transfer service:**
   ```bash
   # From your Mac Terminal:
   curl --upload-file ~/Desktop/1n2org-deploy.tar.gz https://transfer.sh/1n2org-deploy.tar.gz
   ```
   This gives you a URL like: https://transfer.sh/xxxxx/1n2org-deploy.tar.gz

4. **Download on server (in DigitalOcean console):**
   ```bash
   cd /tmp/deploy
   wget https://transfer.sh/xxxxx/1n2org-deploy.tar.gz
   # OR
   curl -O https://transfer.sh/xxxxx/1n2org-deploy.tar.gz
   ```

5. **Extract and deploy:**
   ```bash
   cd /tmp/deploy
   tar -xzf 1n2org-deploy.tar.gz
   
   # Deploy files
   cp index.html /var/www/html/
   cp -r thomashuntfilms /var/www/html/
   cp -r thunt.net /var/www/html/
   
   # Set permissions
   chown -R www-data:www-data /var/www/html/thomashuntfilms
   chown -R www-data:www-data /var/www/html/thunt.net
   chmod -R 755 /var/www/html/thomashuntfilms
   chmod -R 755 /var/www/html/thunt.net
   
   # Cleanup
   cd ~
   rm -rf /tmp/deploy
   ```

6. **Verify:**
   ```bash
   ls -la /var/www/html/
   ```

---

## OPTION 2: Use Python HTTP Server (Quick & Easy)

1. **On your Mac**, start a simple HTTP server:
   ```bash
   cd ~/Desktop
   python3 -m http.server 8000
   ```

2. **Find your Mac's IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Look for something like: 192.168.1.x or 10.0.0.x

3. **In DigitalOcean Console**, download from your Mac:
   ```bash
   cd /tmp
   wget http://YOUR_MAC_IP:8000/1n2org-deploy.tar.gz
   tar -xzf 1n2org-deploy.tar.gz
   
   # Deploy
   cp index.html /var/www/html/
   cp -r thomashuntfilms /var/www/html/
   cp -r thunt.net /var/www/html/
   
   # Set permissions
   chown -R www-data:www-data /var/www/html/thomashuntfilms /var/www/html/thunt.net
   chmod -R 755 /var/www/html/thomashuntfilms /var/www/html/thunt.net
   ```

---

## OPTION 3: Use SFTP Client (Most Reliable)

Use **Cyberduck**, **Transmit**, or **FileZilla**:

**Connection:**
- Host: sftp://157.230.36.150
- User: root
- Password: [your password]
- Path: /var/www/html

**Upload:**
1. index.html → /var/www/html/
2. thomashuntfilms/ → /var/www/html/
3. thunt.net/ → /var/www/html/

Then set permissions in console:
```bash
chown -R www-data:www-data /var/www/html/thomashuntfilms /var/www/html/thunt.net
chmod -R 755 /var/www/html/thomashuntfilms /var/www/html/thunt.net
```

---

## Final URLs
- https://1n2.org/ (homepage)
- https://1n2.org/thomashuntfilms/ (films)
- https://1n2.org/thunt.net/ (blog)
