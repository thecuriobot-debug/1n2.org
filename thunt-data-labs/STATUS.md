# THunt Data Labs — Project Status & Transition

## Created: March 6, 2026
## Location: /Users/curiobot/Sites/1n2.org/thunt-data-labs/

## What's Built
- **Central SQLite Database** at `db/thunt-data-labs.db` (546 records)
- **Database schema** with 13 tables covering all datasets
- **Import collector** that pulls from all existing data sources

## Database Contents (after first import)
| Table | Records | Source |
|---|---|---|
| curio_prices | 1 | Curio Data Hub |
| curio_cards | 30 | Alchemy NFT API |
| curio_sales | 0 | Sales JSON (empty) |
| curio_owners | 0 | Not yet gathered |
| yt_channels | 3 | Commentzor + YouTube Tracker |
| yt_videos | 30 | Commentzor + YouTube Tracker |
| yt_comments | 16 | Commentzor (Playwright scraped) |
| articles | 168 | Google News + City News + Entertainment |
| article_images | 25 | Article indexer |
| tweet_accounts | 6 | Tweetster archive |
| tweets | 263 | Tweetster archive |
| fb_posts | 0 | Future |
| collection_log | 4 | Auto-generated |
| **TOTAL** | **546** | |

## Files
```
thunt-data-labs/
├── db/
│   ├── database.py          # Schema, init, stats, logging
│   └── thunt-data-labs.db   # SQLite database (546 records)
├── collectors/
│   └── import_existing.py   # Imports from all existing sources
├── web/                     # Dashboard (TODO)
└── README.md (TODO)
```

## Still Needs (for new chat)
1. **Web dashboard** — Tabbed view showing each dataset status, row counts, update frequency, data richness
2. **Daily collectors** — Individual scripts for each dataset:
   - `collect_curio.py` — Alchemy API for prices, owners, sales, on-chain data
   - `collect_youtube.py` — Playwright-based video + comment scraper
   - `collect_articles.py` — StealthyFetcher article indexer
   - `collect_tweets.py` — Nitter-based tweet scraper
3. **Cron integration** — Add to master-run.sh
4. **Deploy to droplet** — Static dashboard export
5. **1n2.org homepage** — Add card for THunt Data Labs
6. **Curio owners/holders** — Use Alchemy `getOwnersForContract` API
7. **YouTube API key** — For full comment gathering (Playwright fallback works but slow)

## Key APIs Available
- **Alchemy:** `vfF4rHBY1zsGgI3kqEg9v` (Curio NFT data)
- **YouTube:** No API key yet (using Playwright fallback)
- **Scrapling 0.4.1** + Playwright browsers
- **Nitter:** For tweet scraping (rate limited)

## Architecture Notes
- Single SQLite DB for ALL data (WAL mode, foreign keys)
- `collection_log` table tracks every scrape run
- Each collector is a standalone CLI script
- Data Hub integration: existing curio-data-hub scripts feed into this
- All collectors should be idempotent (safe to re-run)
