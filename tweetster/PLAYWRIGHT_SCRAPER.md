# 🐦 TWEETSTER PLAYWRIGHT SCRAPER

## Overview
Browser-based Twitter scraper using Playwright to fetch tweets from accounts you follow.
Similar to the CurioCharts OpenSea scraper.

## Why Playwright?
- **Bypasses API restrictions** - No Twitter API key needed
- **Sees what you see** - Scrapes actual rendered tweets
- **Handles auth** - Use your own Twitter login
- **Reliable** - Works despite Twitter API changes

---

## 🚀 Quick Start

### 1. Install Playwright
```bash
pip3 install playwright --break-system-packages
playwright install chromium
```

### 2. Setup Following List
Create or edit `data/following.json`:

```json
{
  "accounts": [
    {"handle": "@elonmusk", "topics": ["tech"]},
    {"handle": "@naval", "topics": ["bitcoin"]},
    {"handle": "@balajis", "topics": ["tech", "bitcoin"]},
    {"handle": "@pmarca", "topics": ["tech"]},
    {"handle": "@sama", "topics": ["tech"]}
  ]
}
```

### 3. Run the Scraper
```bash
cd /Users/curiobot/Sites/1n2.org/tweetster
python3 scrape_twitter_advanced.py
```

### 4. Login to Twitter
- Browser opens automatically
- Login with your Twitter account
- Press ENTER in terminal when ready
- Scraper fetches tweets from your list

### 5. Done!
- Tweets saved to `data/tweets.json`
- Refresh your Tweetster page
- See new tweets!

---

## 📊 What It Scrapes

For each tweet:
- ✅ Tweet text
- ✅ User info (handle, name)
- ✅ Media (photos, videos)
- ✅ Engagement (likes, retweets, replies)
- ✅ Timestamp
- ✅ Auto-classified topics

---

## 🎯 Features

### Smart Deduplication
- Checks existing tweets
- Only adds new ones
- No duplicates

### Topic Classification
Automatically tags tweets:
- **Bitcoin** - crypto, blockchain, BTC, ETH
- **Tech** - AI, coding, startups, software
- **Politics** - elections, government, policy
- **Sports** - NBA, NFL, soccer, etc.
- **Unsorted** - everything else

### Media Extraction
- Photo URLs from tweets
- Video placeholders
- Ready for display

---

## 📁 File Structure

```
tweetster/
├── scrape_twitter_advanced.py    ← Main scraper
├── scrape_twitter_playwright.py  ← Basic version
├── data/
│   ├── tweets.json                ← Output (scraped tweets)
│   └── following.json             ← Input (accounts to track)
├── index.html                     ← Your Tweetster UI
└── api/
    └── twikit-fetch.py            ← Old API-based scraper
```

---

## 🔄 Update Workflow

### Daily Updates
```bash
cd /Users/curiobot/Sites/1n2.org/tweetster
python3 scrape_twitter_advanced.py
# Login if needed, press ENTER
# Refresh browser - done!
```

### Automated (Optional)
Add to cron for daily scraping:
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 9am)
0 9 * * * cd /Users/curiobot/Sites/1n2.org/tweetster && python3 scrape_twitter_advanced.py
```

---

## ⚙️ Configuration

### Scraping Settings

Edit `scrape_twitter_advanced.py`:

```python
# Number of tweets per account
for article in articles[:10]:  # Change 10 to any number

# Scroll depth (more scrolls = more tweets)
for scroll in range(5):  # Change 5 to 10 for more tweets

# Rate limiting (delay between accounts)
time.sleep(2)  # Change 2 to 3 for slower scraping
```

### Headless Mode

For background scraping (no browser window):
```python
browser = p.chromium.launch(headless=True)  # Change False to True
```

---

## 🐛 Troubleshooting

### "playwright not found"
```bash
pip3 install playwright --break-system-packages
playwright install chromium
```

### "No following list"
Create `data/following.json`:
```json
{"accounts": [{"handle": "@elonmusk", "topics": ["tech"]}]}
```

### Twitter blocks scraping
- Slow down: increase `time.sleep(3)`
- Use headless mode
- Login with real account
- Don't scrape too frequently

### No tweets extracted
- Twitter changed their DOM structure
- Update selectors in `extract_tweet_data()`
- Check browser console for errors

### Rate limited
- Decrease accounts in following.json
- Increase delays between requests
- Use only during off-peak hours

---

## 🆚 Comparison: Playwright vs API

| Feature | Playwright Scraper | Twitter API | Twikit API |
|---------|-------------------|-------------|------------|
| **Cost** | Free | $100-$5000/month | Free but unstable |
| **Auth** | Your login | API key + OAuth | Login required |
| **Rate limits** | Soft (human-like) | Strict | Soft |
| **Reliability** | ✅ High | ❌ Expensive | ⚠️ Medium |
| **Setup** | 5 minutes | Hours | 10 minutes |
| **Media** | ✅ Yes | ✅ Yes | ⚠️ Limited |

**Winner:** Playwright for personal use! ✅

---

## 📈 Performance

**Typical run:**
- 10 accounts
- 10 tweets each
- ~3 minutes total
- ~100 tweets fetched

**Scale:**
- ✅ 1-20 accounts: Perfect
- ⚠️ 20-50 accounts: Slower but works
- ❌ 50+ accounts: Use API instead

---

## 🔐 Privacy & Security

**Your Twitter login:**
- Only stored in browser session
- Not saved to disk
- Used only for scraping

**Data storage:**
- All tweets stored locally
- No external servers
- You own your data

**Best practices:**
- Use a dedicated scraping account
- Don't share cookies/sessions
- Respect rate limits

---

## 🎓 Advanced Usage

### Scrape Specific Lists
```python
# Instead of individual accounts, scrape Twitter lists
page.goto("https://twitter.com/i/lists/123456789")
```

### Export to CSV
```python
import csv

with open('tweets.csv', 'w') as f:
    writer = csv.DictWriter(f, fieldnames=['id', 'text', 'user_handle', 'created_at'])
    writer.writeheader()
    writer.writerows(tweets)
```

### Filter by Engagement
```python
# Only save popular tweets
if tweet_data['favorite_count'] > 100:
    new_tweets.append(tweet_data)
```

---

## 📝 Next Steps

1. **Run the scraper** - Get your first batch of tweets
2. **Customize following** - Add your favorite accounts
3. **Adjust settings** - Tweak for your needs
4. **Automate** - Set up cron for daily updates

---

## ✅ Summary

**You now have:**
- ✅ Working Twitter scraper
- ✅ No API keys needed
- ✅ Full tweet data
- ✅ Auto-classification
- ✅ Local storage
- ✅ Similar to CurioCharts scraper

**Just run:**
```bash
python3 scrape_twitter_advanced.py
```

🎉 **That's it!**
