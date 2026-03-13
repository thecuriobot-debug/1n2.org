# 1N2.ORG DEPLOYMENT GUIDE
**Date:** February 17, 2026  
**Server:** 157.230.36.150 (root@157.230.36.150)  
**Local Files:** /Users/curiobot/Sites/1n2.org

---

## OPTION 1: Setup SSH Key (RECOMMENDED - One-time setup)

### Step 1: Copy this SSH public key
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFI08RyEtEhjeKXQXIIDsN7v+NrZoz6p8L/fyIfVJT64 thecuriobot@github.com
```

### Step 2: Add it to the server
Login to your server and run:
```bash
ssh root@157.230.36.150
# Enter your password

# Add the key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFI08RyEtEhjeKXQXIIDsN7v+NrZoz6p8L/fyIfVJT64 thecuriobot@github.com" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Exit
exit
```

### Step 3: Test the connection
```bash
ssh root@157.230.36.150
# Should connect without password!
```

### Step 4: Run automated deployment
```bash
cd /Users/curiobot/Sites/1n2.org
bash rsync_deploy.sh
```

---

## OPTION 2: Manual SCP Deployment (Works right now)

Use this if you want to deploy immediately without SSH key setup.  
**Note:** You'll need to enter your password multiple times.

### Quick Deploy Commands:

```bash
cd /Users/curiobot/Sites/1n2.org

# 1. Deploy homepage
scp index.html root@157.230.36.150:/var/www/html/1n2.org/

# 2. Deploy Thomas Hunt Films (complete)
scp -r thomashuntfilms root@157.230.36.150:/var/www/html/1n2.org/

# 3. Deploy thunt.net (complete)
scp -r thunt.net root@157.230.36.150:/var/www/html/1n2.org/

# 4. Set permissions
ssh root@157.230.36.150 "chown -R www-data:www-data /var/www/html/1n2.org && chmod -R 755 /var/www/html/1n2.org"
```

---

## OPTION 3: Use SFTP GUI (Easiest for beginners)

Use an SFTP client like **Cyberduck**, **FileZilla**, or **Transmit**:

**Connection Details:**
- Protocol: SFTP
- Host: 157.230.36.150
- Username: root
- Password: [your server password]
- Remote Path: /var/www/html/1n2.org

**Files to upload:**
1. `index.html` → `/var/www/html/1n2.org/`
2. `thomashuntfilms/` folder → `/var/www/html/1n2.org/`
3. `thunt.net/` folder → `/var/www/html/1n2.org/`

---

## FILES TO DEPLOY

### Homepage
- `/Users/curiobot/Sites/1n2.org/index.html`

### Thomas Hunt Films (Complete)
- `/Users/curiobot/Sites/1n2.org/thomashuntfilms/`
  - index.html (main page)
  - press.html (press archive)
  - stolen-channel-story.html (IG-88 article)
  - videos/*.html (10 Star Trek pages)
  - press/* (article archives with images)

### thunt.net Blog
- `/Users/curiobot/Sites/1n2.org/thunt.net/`
  - index.html (blog homepage)
  - posts/ (526 blog posts)
  - archive/ (archived content)

---

## VERIFICATION

After deployment, visit these URLs:
- ✅ https://1n2.org (homepage)
- ✅ https://1n2.org/thomashuntfilms (film portfolio)
- ✅ https://1n2.org/thomashuntfilms/stolen-channel-story.html (IG-88 article)
- ✅ https://1n2.org/thomashuntfilms/press.html (press archive)
- ✅ https://1n2.org/thunt.net (blog)

---

## TROUBLESHOOTING

**"Permission denied (publickey)"**
- Use Option 1 to setup SSH key, OR
- Use Option 2 with password authentication, OR
- Use Option 3 with SFTP GUI

**"Permission denied" on server**
- Run: `ssh root@157.230.36.150 "chmod -R 755 /var/www/html/1n2.org"`

**Files not showing up**
- Check Nginx config: `ssh root@157.230.36.150 "cat /etc/nginx/sites-available/1n2.org"`
- Restart Nginx: `ssh root@157.230.36.150 "systemctl restart nginx"`

---

**Created by:** Claude  
**Last Updated:** February 17, 2026
