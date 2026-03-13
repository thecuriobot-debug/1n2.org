# ADD SSH KEY VIA DIGITALOCEAN CONSOLE

Your server (157.230.36.150) is configured to ONLY accept SSH keys and won't prompt for passwords.

## OPTION 1: Use DigitalOcean Console (RECOMMENDED)

1. **Go to DigitalOcean Dashboard:**
   - Visit: https://cloud.digitalocean.com/droplets
   - Find your droplet (157.230.36.150)

2. **Open Console:**
   - Click on your droplet
   - Click "Console" or "Access" → "Launch Droplet Console"
   - This opens a web-based terminal (no SSH key needed!)

3. **Add your SSH key in the console:**
   ```bash
   mkdir -p ~/.ssh
   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFI08RyEtEhjeKXQXIIDsN7v+NrZoz6p8L/fyIfVJT64 thecuriobot@github.com" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

4. **Test from your Mac:**
   ```bash
   ssh root@157.230.36.150
   ```
   Should connect without password!

5. **Then deploy:**
   ```bash
   cd /Users/curiobot/Sites/1n2.org
   bash deploy_simple.sh
   ```

---

## OPTION 2: Add SSH Key via DigitalOcean Settings

1. Go to: https://cloud.digitalocean.com/account/security
2. Click "Add SSH Key"
3. Paste this key:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFI08RyEtEhjeKXQXIIDsN7v+NrZoz6p8L/fyIfVJT64 thecuriobot@github.com
   ```
4. Name it "curiobot-mac-mini"
5. Save

Then rebuild or update your droplet to use this key.

---

## OPTION 3: Reset Root Password (if enabled)

If DigitalOcean password reset is enabled:
1. Go to droplet settings
2. Reset root password
3. Check your email for the password
4. Then run:
   ```bash
   ssh-copy-id root@157.230.36.150
   ```

---

## YOUR SSH PUBLIC KEY

Copy this exactly:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFI08RyEtEhjeKXQXIIDsN7v+NrZoz6p8L/fyIfVJT64 thecuriobot@github.com
```

---

## AFTER KEY IS ADDED

Once your SSH key is on the server, deployment is automatic:

```bash
cd /Users/curiobot/Sites/1n2.org
bash rsync_deploy.sh
```

No passwords needed! 🎉
