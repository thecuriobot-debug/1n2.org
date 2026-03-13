# Commentzor

**YouTube Comment Database & Viewer**

Commentzor downloads ALL comments from your YouTube channels into a local SQLite database, then displays them on a beautiful web interface with random comment grids, statistics, leaderboards, and search.

---

## Quick Start

### 1. Get a YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the **YouTube Data API v3**
4. Create an API key under Credentials
5. Set it as an environment variable:

```bash
export YOUTUBE_API_KEY="AIza..."
```

Or create a `.env` file in the project root:
```
YOUTUBE_API_KEY=AIza...
```

### 2. Add Your YouTube Channels

```bash
cd tools/

# Add channels by URL, handle, or ID
python3 gather.py --add-channel https://youtube.com/@YourChannel
python3 gather.py --add-channel @AnotherChannel
python3 gather.py --add-channel UCxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Gather All Comments

```bash
# Full gather — downloads every comment from every video
# WARNING: This can take hours for large channels!
python3 gather.py --gather-all

# Or gather one channel at a time
python3 gather.py --gather-channel UCxxxxxxxxxxxxxxxxxxxxxxxx

# Check status anytime
python3 gather.py --status
```

### 4. View the Web Interface

```bash
python3 tools/server.py
# Open http://localhost:5000
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `--add-channel URL` | Add a YouTube channel to track |
| `--remove-channel ID` | Remove a channel and all its data |
| `--gather-all` | Download ALL comments for ALL channels |
| `--gather-channel ID` | Download all comments for one channel |
| `--update` | Update only recent videos (last 7 days) |
| `--status` | Show database statistics |
| `--scrape-video URL` | Fallback: scrape via Playwright |

---

## Daily Updates (Cron)

Set up automatic daily updates:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path):
0 3 * * * cd /path/to/commentzor && YOUTUBE_API_KEY="your_key" /usr/bin/python3 tools/update_daily.py >> data/cron.log 2>&1
```

---

## Web Interface Features

- **Channel Tabs** — One tab per tracked YouTube channel
- **9×9 Comment Grid** — Random real comments displayed in a beautiful grid
- **Shuffle Button** — Randomize comments each time
- **Statistics Dashboard**:
  - Total comments, videos, authors
  - Top commenters leaderboard
  - Most commented videos
  - Most liked comments
  - Comments over time (timeline chart)
  - Comments by day of week
  - Average comment length
- **Search** — Full-text search across all comments
- **Video Browser** — Browse videos sorted by comments, views, likes, or date

---

## Architecture

```
commentzor/
├── tools/
│   ├── db.py              # Database schema & helpers
│   ├── gather.py          # CLI comment gatherer (YouTube API + Playwright fallback)
│   ├── update_daily.py    # Cron-friendly daily updater
│   └── server.py          # Flask API server
├── web/
│   └── index.html         # Single-page web interface
├── data/
│   └── commentzor.db      # SQLite database (created on first run)
└── README.md
```

---

## API Quota Notes

The YouTube Data API v3 has a daily quota of **10,000 units**. Rough costs:
- `channels.list` = 1 unit
- `playlistItems.list` = 1 unit  
- `videos.list` = 1 unit
- `commentThreads.list` = 1 unit
- `comments.list` = 1 unit
- `search.list` = 100 units (avoid!)

A channel with 500 videos and ~50,000 comments will use roughly 1,000-2,000 quota units. Plan accordingly for large channels.

**Tip:** For very large channels, gather over multiple days — the tool saves progress and won't re-download existing comments.

---

## Fallback: Playwright Scraper

If you hit API quota limits or don't have an API key:

```bash
python3 gather.py --scrape-video https://youtube.com/watch?v=VIDEO_ID
```

This uses headless Chromium to scroll through and extract comments. Slower but no API key needed. Requires Playwright:

```bash
pip install playwright
playwright install chromium
```
