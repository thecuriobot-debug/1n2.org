# ✅ CURIOCHARTS DEPLOYED TO 1N2.ORG

## Deployment Complete!

**Date:** February 15, 2026  
**Source:** `/Users/curiobot/Sites/1n2.org/curiocharts/`  
**Destination:** `root@1n2.org:/var/www/html/curiocharts/`  
**Status:** ✅ Live and working!

---

## 🌐 Live Site

**URL:** https://1n2.org/curiocharts/

**Features Deployed:**
- ✅ React app with real OpenSea data
- ✅ All 31 Curio Cards
- ✅ Real floor prices (not simulated)
- ✅ Individual card floors
- ✅ Last sale prices
- ✅ Beautiful UI with animations
- ✅ Responsive design
- ✅ Favicon

---

## 📊 Data Status

**Current data.json:**
- Source: OpenSea (Playwright scraper)
- Fetched: Feb 15, 2026 18:48 UTC
- Collection floor: 0.051 ETH
- 31 cards with individual floors
- Real prices from OpenSea

**Sample prices:**
- Apples (#1): 0.214 ETH floor
- Nuts (#2): 0.0529 ETH floor
- Berries (#3): 0.0542 ETH floor

---

## 📁 Files Deployed

**Main files:**
- `index.html` - Entry point (React app loader)
- `data.json` - Real OpenSea floor prices
- `assets/` - React JS/CSS bundles
- `favicon.svg` - Site icon

**Utility files:**
- `demo.html` - Standalone demo
- `opensea_scraper.html` - Manual scraper tool
- `update.sh` - Update script
- Various Python scrapers

**Total files:** 19 files, 1.8MB

---

## 🔄 How to Update

### From Local Machine

```bash
cd /Users/curiobot/Sites/1n2.org/curiocharts

# Build React app (if you made changes)
npm run build
cp -r dist/* ./

# Deploy to droplet
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.md' \
  ./ root@1n2.org:/var/www/html/curiocharts/

# Fix permissions
ssh root@1n2.org "chown -R www-data:www-data /var/www/html/curiocharts"
```

### Quick Deploy Script

Save this as `deploy.sh` in `/Users/curiobot/Sites/1n2.org/curiocharts/`:

```bash
#!/bin/bash
cd "$(dirname "$0")"

echo "Deploying CurioCharts to 1n2.org..."

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.md' \
  --exclude '*.log' \
  --exclude 'scrape*.py' \
  --exclude 'fetch*.py' \
  ./ root@1n2.org:/var/www/html/curiocharts/

ssh root@1n2.org "chown -R www-data:www-data /var/www/html/curiocharts"

echo "✅ Deployed! Check: https://1n2.org/curiocharts/"
```

---

## 🔄 Updating Data

### Option 1: Update on Droplet

SSH into droplet and run scraper there:

```bash
ssh root@1n2.org
cd /var/www/html/curiocharts
# Upload scraper and run it
```

### Option 2: Update Locally, Then Deploy

```bash
# On local machine
cd /Users/curiobot/Sites/1n2.org/curiocharts
python3 scrape_playwright.py

# Deploy updated data.json
scp data.json root@1n2.org:/var/www/html/curiocharts/
```

### Option 3: Automated Daily Updates

Set up cron on droplet:

```bash
# On droplet
crontab -e

# Add line (update daily at 9am):
0 9 * * * cd /var/www/html/curiocharts && python3 scrape_playwright.py
```

---

## 🛠️ Troubleshooting

### Site not loading?

```bash
# Check nginx status
ssh root@1n2.org "systemctl status nginx"

# Check permissions
ssh root@1n2.org "ls -la /var/www/html/curiocharts/"

# Check error logs
ssh root@1n2.org "tail -50 /var/log/nginx/error.log"
```

### Data not updating?

```bash
# Check data.json timestamp
ssh root@1n2.org "ls -lh /var/www/html/curiocharts/data.json"

# View data
ssh root@1n2.org "cat /var/www/html/curiocharts/data.json | head -20"
```

### Need to rebuild React app?

```bash
cd /Users/curiobot/curiocharts
npm run build
cp -r dist/* /Users/curiobot/Sites/1n2.org/curiocharts/
# Then deploy as above
```

---

## 📝 Deployment Checklist

**Before deploying:**
- [ ] Test locally: `http://localhost:8000/curiocharts/`
- [ ] Build React app: `npm run build`
- [ ] Copy dist to deployment folder
- [ ] Update data.json if needed

**Deploy:**
- [ ] Run rsync command
- [ ] Fix permissions
- [ ] Test live site

**After deploying:**
- [ ] Visit https://1n2.org/curiocharts/
- [ ] Check all cards display
- [ ] Verify prices are correct
- [ ] Test on mobile

---

## 🎯 Current Status

**Deployment:** ✅ Complete  
**Live URL:** https://1n2.org/curiocharts/  
**Data:** ✅ Real OpenSea prices  
**Last Updated:** Feb 15, 2026 18:48 UTC  

**Health Check:**
```bash
curl -I https://1n2.org/curiocharts/
# Should return: HTTP/1.1 200 OK
```

---

## 🚀 Next Steps

1. **Visit the live site:** https://1n2.org/curiocharts/
2. **Set up automated updates** (optional)
3. **Share the URL** with Curio Cards community
4. **Monitor for data updates** (daily/weekly)

---

## 📊 Comparison: Local vs Live

| Aspect | Local | Live (1n2.org) |
|--------|-------|----------------|
| URL | localhost:8000 | 1n2.org/curiocharts |
| Data | Same | Same (synced) |
| Updates | Manual | Manual/Automated |
| Access | Only you | Public |
| SSL | No | Yes (HTTPS) |

---

**✅ CurioCharts is now live at https://1n2.org/curiocharts/**

Enjoy! 🎉
