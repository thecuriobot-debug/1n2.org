#!/usr/bin/env python3.12
"""
Robust RSS Article Fetcher v2
- Uses feedparser (not trafilatura.feeds) to actually parse RSS XML
- Per-request timeouts so nothing hangs
- Concurrent fetching with ThreadPoolExecutor
- Proper error reporting (no silent swallowing)
- Retries on transient failures

Usage:
    python3.12 fetch_rss_robust.py                    # Fetch all feeds, 15/feed
    python3.12 fetch_rss_robust.py --limit 30          # 30 articles per feed
    python3.12 fetch_rss_robust.py --topic crypto      # Only crypto feeds
    python3.12 fetch_rss_robust.py --backfill          # Re-try articles missing text
    python3.12 fetch_rss_robust.py --workers 3         # Parallel article fetches
"""
import sqlite3, json, hashlib, time, sys, argparse, traceback
import feedparser
import trafilatura
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

try:
    from googlenewsdecoder import new_decoderv1
    HAS_DECODER = True
except ImportError:
    HAS_DECODER = False

DB = Path.home() / 'Sites' / '1n2.org' / 'thunt-data-labs' / 'db' / 'thunt-data-labs.db'
TODAY = datetime.now().strftime("%Y-%m-%d")

# ── Timeout settings ──
FEED_TIMEOUT   = 12   # seconds to fetch an RSS feed
ARTICLE_TIMEOUT = 10   # seconds to fetch one article page
RATE_LIMIT     = 0.3   # seconds between requests to same source

# ── Curated RSS feeds ──
FEEDS = {
    "bitcoin": [
        ("CoinDesk",          "https://www.coindesk.com/arc/outboundfeeds/rss/"),
        ("Bitcoin Magazine",  "https://bitcoinmagazine.com/feed"),
        ("Bitcoin.com",       "https://news.bitcoin.com/feed/"),
    ],
    "crypto": [
        ("CoinTelegraph",  "https://cointelegraph.com/rss"),
        ("The Block",      "https://www.theblock.co/rss.xml"),
        ("CryptoSlate",    "https://cryptoslate.com/feed/"),
        ("Decrypt",        "https://decrypt.co/feed"),
    ],
    "ai": [
        ("MIT Tech Review", "https://www.technologyreview.com/feed/"),
        ("Wired",           "https://www.wired.com/feed/rss"),
        ("Google News AI",  "https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en"),
        ("VentureBeat",     "https://venturebeat.com/feed/"),
        ("The Register AI", "https://www.theregister.com/headlines.atom"),
    ],
    "tech": [
        ("TechCrunch",   "https://techcrunch.com/feed/"),
        ("Ars Technica",  "https://feeds.arstechnica.com/arstechnica/index"),
        ("The Verge",     "https://www.theverge.com/rss/index.xml"),
        ("Google News Tech", "https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en"),
        ("Hacker News",   "https://hnrss.org/frontpage"),
    ],
    "world": [
        ("BBC World",     "https://feeds.bbci.co.uk/news/world/rss.xml"),
        ("Guardian World", "https://www.theguardian.com/world/rss"),
        ("Al Jazeera",    "https://www.aljazeera.com/xml/rss/all.xml"),
        ("Dawn",          "https://www.dawn.com/feeds/home"),
        ("Google News World", "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXigAQE?hl=en-US&gl=US&ceid=US:en"),
        ("France24",      "https://www.france24.com/en/rss"),
        ("DW News",       "https://rss.dw.com/rdf/rss-en-all"),
    ],
    "us": [
        ("BBC News",    "https://feeds.bbci.co.uk/news/rss.xml"),
        ("Guardian US", "https://www.theguardian.com/us-news/rss"),
        ("NPR",         "https://feeds.npr.org/1001/rss.xml"),
        ("Google News US", "https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRGxqTjNjd0VnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US:en"),
        ("USA Today",   "http://rssfeeds.usatoday.com/UsatodaycomNation-TopStories"),
    ],
    "politics": [
        ("Google News Politics", "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4ZERBU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en"),
        ("The Hill",     "https://thehill.com/feed/"),
        ("Politico",     "https://rss.politico.com/politics-news.xml"),
        ("The Atlantic",  "https://www.theatlantic.com/feed/all/"),
    ],
    "business": [
        ("CNBC",        "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
        ("Fortune",     "https://fortune.com/feed/"),
        ("The Economic Times", "https://economictimes.indiatimes.com/rssfeedstopstories.cms"),
        ("Google News Business", "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXigAQE?hl=en-US&gl=US&ceid=US:en"),
        ("MarketWatch",  "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    ],
    "science": [
        ("Science Daily", "https://www.sciencedaily.com/rss/all.xml"),
        ("Google News Science", "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXigAQE?hl=en-US&gl=US&ceid=US:en"),
        ("Phys.org",      "https://phys.org/rss-feed/"),
        ("Nature News",   "https://www.nature.com/nature.rss"),
        ("Space.com",     "https://www.space.com/feeds/all"),
    ],
    "health": [
        ("Google News Health", "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en"),
        ("WebMD",          "https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC"),
        ("Stat News",      "https://www.statnews.com/feed/"),
    ],
    "sports": [
        ("ESPN",           "https://www.espn.com/espn/rss/news"),
        ("Google News Sports", "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXigAQE?hl=en-US&gl=US&ceid=US:en"),
    ],
    "culture": [
        ("Variety",    "https://variety.com/feed/"),
        ("A.V. Club",  "https://www.avclub.com/rss"),
    ],
}


def get_conn():
    conn = sqlite3.connect(str(DB), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # better concurrent access
    return conn


def article_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]


def parse_feed(source_name: str, feed_url: str, limit: int) -> list[dict]:
    """Parse an RSS feed and return list of {url, title, date, summary} dicts."""
    try:
        import requests as _req
        resp = _req.get(feed_url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }, timeout=(5, FEED_TIMEOUT))  # (connect_timeout, read_timeout)
        raw = resp.content
        feed = feedparser.parse(raw)
        
        if feed.bozo and not feed.entries:
            print(f"  ⚠️  {source_name:25} Feed parse error: {str(feed.bozo_exception)[:60]}")
            return []
        
        entries = []
        for entry in feed.entries[:limit]:
            url = getattr(entry, 'link', None)
            if not url:
                continue
            
            # Clean Google News redirect URLs if any
            if 'news.google.com' in url:
                continue
            
            title = getattr(entry, 'title', '') or ''
            date = ''
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    date = time.strftime('%Y-%m-%d', entry.published_parsed)
                except:
                    date = TODAY
            else:
                date = TODAY
            
            summary = getattr(entry, 'summary', '') or ''
            # Strip HTML from summary
            if '<' in summary:
                import re
                summary = re.sub(r'<[^>]+>', '', summary)
            summary = summary[:300]
            
            entries.append({
                'url': url.strip(),
                'title': title[:200],
                'date': date,
                'summary': summary,
            })
        
        return entries
    except Exception as e:
        print(f"  ❌ {source_name:25} Feed fetch failed: {str(e)[:60]}")
        return []


def fetch_article_text(url: str) -> dict | None:
    """Fetch and extract article text. Returns dict or None."""
    try:
        import requests as _req
        resp = _req.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }, timeout=(5, ARTICLE_TIMEOUT))
        resp.raise_for_status()
        html = resp.text
        if not html or len(html) < 200:
            return None
        
        result = trafilatura.extract(
            html,
            include_images=True,
            output_format='json',
            favor_precision=True
        )
        if not result:
            return None
        
        data = json.loads(result)
        text = data.get('text', '')
        if len(text) < 80:
            return None
        
        return {
            'text': text[:10000],
            'title': (data.get('title') or '')[:200],
            'author': (data.get('author') or '')[:200],
            'image': data.get('image') or '',
            'summary': (data.get('description') or data.get('excerpt') or text[:250])[:300],
            'word_count': len(text.split()),
        }
    except Exception as e:
        return None


def fetch_source(source_name: str, feed_url: str, topic: str, limit: int, workers: int) -> tuple[int, int, list[str]]:
    """Fetch all articles from one source. Returns (new_count, skip_count, errors)."""
    entries = parse_feed(source_name, feed_url, limit)
    if not entries:
        return 0, 0, [f"No entries from feed"]
    
    conn = get_conn()
    new_count = 0
    skip_count = 0
    errors = []
    
    # Filter out articles already in DB with text
    to_fetch = []
    for entry in entries:
        aid = article_id(entry['url'])
        existing = conn.execute(
            "SELECT word_count FROM articles WHERE id=? OR url=?", 
            (aid, entry['url'])
        ).fetchone()
        if existing and existing['word_count'] and existing['word_count'] > 0:
            skip_count += 1
            continue
        to_fetch.append(entry)
    
    if not to_fetch:
        conn.close()
        return 0, skip_count, []
    
    # Fetch articles (concurrent within a source)
    def _fetch_one(entry):
        time.sleep(RATE_LIMIT)  # rate limit
        result = fetch_article_text(entry['url'])
        return entry, result
    
    actual_workers = min(workers, len(to_fetch))
    with ThreadPoolExecutor(max_workers=actual_workers) as pool:
        futures = [pool.submit(_fetch_one, e) for e in to_fetch]
        
        for future in as_completed(futures):
            try:
                entry, result = future.result(timeout=ARTICLE_TIMEOUT + 5)
            except Exception as e:
                errors.append(f"Timeout/error: {str(e)[:40]}")
                continue
            
            if not result:
                errors.append(f"No text: {entry['url'][:50]}")
                continue
            
            aid = article_id(entry['url'])
            title = result['title'] or entry['title']
            summary = result['summary'] or entry['summary']
            date = entry['date'] or TODAY
            
            try:
                conn.execute("""INSERT OR REPLACE INTO articles 
                    (id, title, clean_title, url, source, topic, date,
                     text_content, summary, author, image_url, word_count, 
                     source_url, fetched_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                    (aid, title, title, entry['url'], source_name,
                     f"news-{topic}", date, result['text'], summary,
                     result['author'], result['image'], result['word_count'],
                     feed_url))
                
                if result['image']:
                    img_id = hashlib.md5(result['image'].encode()).hexdigest()[:12]
                    conn.execute("""INSERT OR IGNORE INTO article_images 
                        (id, article_id, src, alt, source, date)
                        VALUES (?,?,?,?,?,?)""",
                        (img_id, aid, result['image'], title[:100], source_name, TODAY))
                
                new_count += 1
            except Exception as e:
                errors.append(f"DB error: {str(e)[:40]}")
    
    conn.commit()
    conn.close()
    return new_count, skip_count, errors


def resolve_google_news_url(url: str) -> str | None:
    """Decode a Google News redirect URL to the actual article URL."""
    if 'news.google.com' not in url:
        return url
    if not HAS_DECODER:
        return None
    try:
        result = new_decoderv1(url, interval=1)
        if result.get('status'):
            return result['decoded_url']
    except:
        pass
    return None


def backfill_missing_text(workers: int = 2, batch_size: int = 200):
    """Re-try fetching text for articles that have URL but no text_content.
    Resolves Google News URLs first, then fetches article text."""
    conn = get_conn()
    missing = conn.execute("""
        SELECT id, url, source, topic FROM articles 
        WHERE (text_content IS NULL OR text_content = '' OR word_count IS NULL OR word_count = 0)
        AND url IS NOT NULL AND url != ''
        ORDER BY date DESC
        LIMIT ?
    """, (batch_size,)).fetchall()
    conn.close()
    
    if not missing:
        print("  No articles need backfilling.")
        return 0
    
    google_count = sum(1 for r in missing if 'news.google.com' in r['url'])
    direct_count = len(missing) - google_count
    print(f"  Found {len(missing)} articles missing text ({google_count} Google News, {direct_count} direct).")
    
    if google_count > 0 and not HAS_DECODER:
        print("  ⚠️  googlenewsdecoder not installed — skipping Google News URLs")
    
    filled = 0
    resolved = 0
    
    def _backfill_one(row):
        url = row['url']
        real_url = url
        was_google = False
        
        # Resolve Google News URL
        if 'news.google.com' in url:
            was_google = True
            real_url = resolve_google_news_url(url)
            if not real_url:
                return row, None, False
        
        time.sleep(RATE_LIMIT)
        result = fetch_article_text(real_url)
        return row, result, was_google
    
    conn = get_conn()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_backfill_one, dict(r)) for r in missing]
        
        for i, future in enumerate(as_completed(futures)):
            try:
                row, result, was_google = future.result(timeout=ARTICLE_TIMEOUT + 15)
            except:
                continue
            
            if not result:
                continue
            
            if was_google:
                resolved += 1
            
            try:
                conn.execute("""UPDATE articles SET 
                    text_content=?, summary=?, author=?, image_url=?, 
                    word_count=?, fetched_at=datetime('now')
                    WHERE id=?""",
                    (result['text'], result['summary'], result['author'],
                     result['image'], result['word_count'], row['id']))
                filled += 1
                
                if filled % 10 == 0:
                    conn.commit()
                    print(f"    ... backfilled {filled} so far ({resolved} from Google News)")
            except:
                pass
    
    conn.commit()
    conn.close()
    if resolved > 0:
        print(f"  Resolved {resolved} Google News URLs")
    return filled


def run(topic_filter: str = None, limit: int = 15, workers: int = 2, do_backfill: bool = False, backfill_batch: int = 200):
    start = time.time()
    total_new = 0
    total_skip = 0
    total_errors = 0
    
    print(f"📰 Robust RSS Fetcher — {TODAY}")
    print(f"   Limit: {limit}/feed | Workers: {workers} | Topic: {topic_filter or 'all'}\n")
    
    for topic, feed_list in FEEDS.items():
        if topic_filter and topic != topic_filter:
            continue
        
        print(f"── {topic.upper()} ──")
        for source_name, feed_url in feed_list:
            new, skip, errs = fetch_source(source_name, feed_url, topic, limit, workers)
            total_new += new
            total_skip += skip
            total_errors += len(errs)
            
            if new > 0:
                print(f"  ✅ {source_name:25} +{new} new  ({skip} skipped)")
            elif skip > 0:
                print(f"  ⏭️  {source_name:25} all {skip} already in DB")
            else:
                reason = errs[0][:50] if errs else "no articles found"
                print(f"  ⚠️  {source_name:25} {reason}")
        print()
    
    if do_backfill:
        print("── BACKFILL ──")
        filled = backfill_missing_text(workers, batch_size=backfill_batch)
        total_new += filled
        print(f"  Backfilled: {filled} articles\n")
    
    # Final stats
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    with_text = conn.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
    words = conn.execute("SELECT COALESCE(SUM(word_count),0) FROM articles WHERE word_count > 0").fetchone()[0]
    imgs = conn.execute("SELECT COUNT(*) FROM articles WHERE image_url IS NOT NULL AND image_url != ''").fetchone()[0]
    conn.close()
    
    elapsed = time.time() - start
    print(f"{'='*55}")
    print(f"  New this run:  {total_new} articles  ({total_skip} skipped, {total_errors} errors)")
    print(f"  DB totals:     {with_text}/{total} with text  ({words:,} words)")
    print(f"  Images:        {imgs}")
    print(f"  Time:          {elapsed:.0f}s")
    print(f"{'='*55}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Robust RSS Article Fetcher')
    parser.add_argument('--limit', type=int, default=15, help='Max articles per feed (default: 15)')
    parser.add_argument('--topic', type=str, default=None, help='Only fetch this topic')
    parser.add_argument('--workers', type=int, default=2, help='Parallel article fetchers (default: 2)')
    parser.add_argument('--backfill', action='store_true', help='Also retry articles missing text')
    parser.add_argument('--batch', type=int, default=200, help='Backfill batch size (default: 200)')
    args = parser.parse_args()
    
    run(topic_filter=args.topic, limit=args.limit, workers=args.workers, do_backfill=args.backfill, backfill_batch=args.batch)
