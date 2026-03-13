#!/usr/bin/env python3.12
"""
RSS Article Fetcher — Fetches articles directly from source RSS feeds.
Uses trafilatura for feed parsing + article extraction.
Bypasses Google News URL obfuscation entirely.

Usage:
    python3.12 fetch_rss_articles.py           # Fetch all feeds
    python3.12 fetch_rss_articles.py --limit 5  # Limit articles per feed
"""
import sqlite3, json, hashlib, time, sys, argparse
import trafilatura
from trafilatura import feeds
from datetime import datetime

DB = '/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db'
TODAY = datetime.now().strftime("%Y-%m-%d")

# Curated RSS feeds organized by topic
FEEDS = {
    "bitcoin": [
        ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
        ("Bitcoin Magazine", "https://bitcoinmagazine.com/feed"),
        ("Bitcoin.com", "https://news.bitcoin.com/feed/"),
    ],
    "crypto": [
        ("CoinTelegraph", "https://cointelegraph.com/rss"),
        ("The Block", "https://www.theblock.co/rss.xml"),
        ("CryptoSlate", "https://cryptoslate.com/feed/"),
        ("Decrypt", "https://decrypt.co/feed"),
    ],
    "ai": [
        ("MIT Tech Review", "https://www.technologyreview.com/feed/"),
        ("Wired", "https://www.wired.com/feed/rss"),
    ],
    "tech": [
        ("TechCrunch", "https://techcrunch.com/feed/"),
        ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
        ("The Verge", "https://www.theverge.com/rss/index.xml"),
    ],
    "world": [
        ("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
        ("Guardian World", "https://www.theguardian.com/world/rss"),
        ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
        ("NYT World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"),
    ],
    "us": [
        ("BBC News", "https://feeds.bbci.co.uk/news/rss.xml"),
        ("Guardian US", "https://www.theguardian.com/us-news/rss"),
        ("NYT US", "https://rss.nytimes.com/services/xml/rss/nyt/US.xml"),
    ],
    "business": [
        ("NYT Business", "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"),
        ("CNBC", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
        ("Bloomberg", "https://feeds.bloomberg.com/markets/news.rss"),
        ("Fortune", "https://fortune.com/feed/"),
        ("Business Insider", "https://feeds.businessinsider.com/custom/all"),
    ],
    "health": [
        ("WHO News", "https://www.who.int/rss-feeds/news-english.xml"),
    ],
    "science": [
        ("Science Daily", "https://www.sciencedaily.com/rss/all.xml"),
        ("New Scientist", "https://www.newscientist.com/feed/home"),
        ("NYT Technology", "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"),
    ],
    "sports": [
        ("ESPN", "https://www.espn.com/espn/rss/news"),
        ("CBS Sports", "https://www.cbssports.com/rss/headlines/"),
    ],
    "politics": [
        ("NYT Politics", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"),
    ],
    "culture": [
        ("Variety", "https://variety.com/feed/"),
        ("Hollywood Reporter", "https://www.hollywoodreporter.com/feed/"),
        ("Rolling Stone", "https://www.rollingstone.com/feed/"),
    ],
}

def fetch_all(limit_per_feed=10):
    conn = sqlite3.connect(DB, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    total_new = 0
    total_text = 0
    
    for topic, feed_list in FEEDS.items():
        for source_name, feed_url in feed_list:
            try:
                # Get article URLs from RSS feed
                article_urls = feeds.find_feed_urls(feed_url) or []
                if not article_urls:
                    continue
                
                new_count = 0
                text_count = 0
                
                for url in article_urls[:limit_per_feed]:
                    aid = hashlib.md5(url.encode()).hexdigest()[:12]
                    
                    # Skip if already has text content
                    existing = conn.execute("SELECT word_count FROM articles WHERE id=? AND word_count > 0", (aid,)).fetchone()
                    if existing:
                        continue
                    # Also check by URL
                    existing2 = conn.execute("SELECT word_count FROM articles WHERE url=? AND word_count > 0", (url,)).fetchone()
                    if existing2:
                        continue
                    
                    # Fetch and extract article
                    try:
                        html = trafilatura.fetch_url(url)
                        if not html:
                            continue
                        
                        result = trafilatura.extract(html, include_images=True, 
                                                      output_format='json', favor_precision=True)
                        if not result:
                            continue
                        
                        data = json.loads(result)
                        text = data.get('text', '')
                        title = data.get('title', '')
                        
                        # Fallback: extract title from URL slug if trafilatura missed it
                        if not title and url:
                            slug = url.rstrip('/').split('/')[-1]
                            title = slug.replace('-', ' ').replace('_', ' ').title()[:200]
                        
                        if len(text) < 100:
                            continue
                        
                        image = data.get('image') or ''
                        summary = (data.get('description') or text[:250])[:300]
                        author = (data.get('author') or '')[:200]
                        word_count = len(text.split())
                        
                        # Insert or update article
                        conn.execute("""INSERT OR REPLACE INTO articles 
                            (id, title, clean_title, url, source, topic, date,
                             text_content, summary, author, image_url, word_count, 
                             source_url, fetched_at)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                            (aid, title[:200], title[:200], url, source_name,
                             f"news-{topic}", TODAY, text[:10000], summary, author,
                             image, word_count, feed_url))
                        
                        # Save image reference
                        if image:
                            img_id = hashlib.md5(image.encode()).hexdigest()[:12]
                            conn.execute("""INSERT OR IGNORE INTO article_images 
                                (id, article_id, src, alt, source, date)
                                VALUES (?,?,?,?,?,?)""",
                                (img_id, aid, image, title[:100], source_name, TODAY))
                        
                        new_count += 1
                        text_count += 1
                        total_new += 1
                        total_text += 1
                    except:
                        pass
                    time.sleep(0.2)  # Rate limit
                
                conn.commit()
                if new_count > 0:
                    print(f"  ✅ {source_name}: +{new_count} articles ({text_count} with text)")
                    sys.stdout.flush()
            except Exception as e:
                print(f"  ❌ {source_name}: {str(e)[:50]}")
    
    # Final stats
    total = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    with_text = conn.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
    words = conn.execute("SELECT COALESCE(SUM(word_count),0) FROM articles WHERE word_count > 0").fetchone()[0]
    imgs = conn.execute("SELECT COUNT(*) FROM articles WHERE image_url IS NOT NULL AND image_url != ''").fetchone()[0]
    conn.close()
    
    print(f"\n{'='*50}")
    print(f"  New articles: {total_new} ({total_text} with text)")
    print(f"  Total in DB: {total} ({with_text} with text)")
    print(f"  Total words: {words:,}")
    print(f"  Total images: {imgs}")
    print(f"{'='*50}")
    return total_new

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=10, help='Articles per feed')
    args = parser.parse_args()
    
    print(f"📰 RSS Article Fetcher — {TODAY}")
    print(f"Feeds: {sum(len(v) for v in FEEDS.values())} across {len(FEEDS)} topics")
    print(f"Limit: {args.limit} per feed\n")
    fetch_all(limit_per_feed=args.limit)
