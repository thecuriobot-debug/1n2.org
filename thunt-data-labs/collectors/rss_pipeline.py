#!/usr/bin/env python3.12
"""
RSS-First Article Pipeline for Dashboarder
Uses Google News as a MAP, then fetches articles directly from source RSS feeds.
Falls back to trafilatura for sources without RSS.

Usage: python3.12 rss_pipeline.py [--discover] [--fetch] [--all]
"""
import sqlite3, json, hashlib, time, sys, re
import trafilatura
from trafilatura import feeds as traf_feeds
from datetime import datetime
from pathlib import Path

DB = Path.home() / 'Sites' / '1n2.org' / 'thunt-data-labs' / 'db' / 'thunt-data-labs.db'
FEEDS_FILE = Path(__file__).parent / 'rss-feeds.json'
TODAY = datetime.now().strftime('%Y-%m-%d')

# Curated RSS feeds for major news sources
CURATED_FEEDS = {
    # Crypto
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "CoinTelegraph": "https://cointelegraph.com/rss",
    "Bitcoin Magazine": "https://bitcoinmagazine.com/.rss/full/",
    "The Block": "https://www.theblock.co/rss.xml",
    "CryptoSlate": "https://cryptoslate.com/feed/",
    "Bitcoin.com": "https://news.bitcoin.com/feed/",
    "Decrypt": "https://decrypt.co/feed",
    # Tech / AI
    "Ars Technica": "https://feeds.arstechnica.com/arstechnica/index",
    "TechCrunch": "https://techcrunch.com/feed/",
    "The Verge": "https://www.theverge.com/rss/index.xml",
    "Wired": "https://www.wired.com/feed/rss",
    "MIT Technology Review": "https://www.technologyreview.com/feed/",
    # World / US / Politics
    "BBC News": "https://feeds.bbci.co.uk/news/rss.xml",
    "BBC World": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "Reuters": "https://www.reutersagency.com/feed/",
    "AP News": "https://apnews.com/index.rss",
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "The Guardian": "https://www.theguardian.com/world/rss",
    "The Guardian US": "https://www.theguardian.com/us-news/rss",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
    "PBS NewsHour": "https://www.pbs.org/newshour/feeds/rss/headlines",
    # Business / Finance
    "Fortune": "https://fortune.com/feed/",
    "Bloomberg": "https://feeds.bloomberg.com/markets/news.rss",
    "CNBC": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "MarketWatch": "https://feeds.marketwatch.com/marketwatch/topstories/",
    # Science / Health
    "Science Daily": "https://www.sciencedaily.com/rss/all.xml",
    "Nature": "https://www.nature.com/nature.rss",
    "New Scientist": "https://www.newscientist.com/feed/home/",
    "Medical News Today": "https://www.medicalnewstoday.com/newsfeeds/rss",
    # Culture / Entertainment
    "The A.V. Club": "https://www.avclub.com/rss",
    "Pitchfork": "https://pitchfork.com/feed/feed-news/rss",
    "Variety": "https://variety.com/feed/",
}

# Topic mapping for sources
SOURCE_TOPICS = {
    "CoinDesk": "news-bitcoin", "CoinTelegraph": "news-crypto", "Bitcoin Magazine": "news-bitcoin",
    "The Block": "news-crypto", "CryptoSlate": "news-crypto", "Bitcoin.com": "news-bitcoin",
    "Decrypt": "news-crypto",
    "Ars Technica": "news-tech", "TechCrunch": "news-tech", "The Verge": "news-tech",
    "Wired": "news-tech", "MIT Technology Review": "news-ai",
    "BBC News": "news-world", "BBC World": "news-world", "Reuters": "news-world",
    "AP News": "news-us", "NPR": "news-us", "PBS NewsHour": "news-us",
    "The Guardian": "news-world", "The Guardian US": "news-politics", "Al Jazeera": "news-world",
    "Fortune": "news-business", "Bloomberg": "news-business", "CNBC": "news-business",
    "MarketWatch": "news-business",
    "Science Daily": "news-science", "Nature": "news-science", "New Scientist": "news-science",
    "Medical News Today": "news-health",
    "The A.V. Club": "news-culture", "Pitchfork": "news-culture", "Variety": "news-culture",
}


def get_conn():
    conn = sqlite3.connect(str(DB))
    conn.row_factory = sqlite3.Row
    return conn

def fetch_rss_articles():
    """Fetch articles from all curated RSS feeds using trafilatura."""
    print(f"\n📡 RSS PIPELINE — Fetching from {len(CURATED_FEEDS)} feeds")
    conn = get_conn()
    fetched = 0
    errors = 0
    
    for source_name, feed_url in CURATED_FEEDS.items():
        topic = SOURCE_TOPICS.get(source_name, 'news-general')
        try:
            # Use trafilatura to get article URLs from the feed
            article_urls = traf_feeds.find_feed_urls(feed_url) or []
            if not article_urls:
                # Try feedparser as fallback
                try:
                    import feedparser
                    feed = feedparser.parse(feed_url)
                    article_urls = [e.link for e in feed.entries if hasattr(e, 'link')][:15]
                except:
                    pass
            
            if not article_urls:
                errors += 1
                continue
            
            source_fetched = 0
            for url in article_urls[:10]:  # Max 10 per source per run
                try:
                    aid = hashlib.md5(url.encode()).hexdigest()[:12]
                    
                    # Skip if already in DB with text
                    existing = conn.execute("SELECT word_count FROM articles WHERE id=?", (aid,)).fetchone()
                    if existing and existing['word_count'] and existing['word_count'] > 0:
                        continue
                    
                    # Fetch and extract with trafilatura
                    html = trafilatura.fetch_url(url)
                    if not html:
                        continue
                    
                    result = trafilatura.extract(html, include_images=True, 
                                                 output_format='json', favor_precision=True)
                    if not result:
                        continue
                    
                    data = json.loads(result)
                    text = data.get('text', '')
                    if len(text) < 100:
                        continue
                    
                    title = (data.get('title') or '')[:200]
                    author = (data.get('author') or '')[:200]
                    summary = (data.get('description') or data.get('excerpt') or text[:250])[:300]
                    image = data.get('image') or ''
                    pub_date = data.get('date') or TODAY
                    word_count = len(text.split())
                    
                    # Clean title
                    clean_title = title
                    if source_name and title.endswith(f' - {source_name}'):
                        clean_title = title[:-(len(source_name)+3)]
                    
                    conn.execute("""INSERT OR REPLACE INTO articles 
                        (id, title, clean_title, url, source, topic, date, 
                         text_content, summary, author, image_url, word_count, source_url, fetched_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                        (aid, title, clean_title, url, source_name, topic, pub_date,
                         text[:10000], summary, author, image, word_count, 
                         feed_url.split('/')[0]+'//'+feed_url.split('/')[2] if '/' in feed_url else ''))
                    
                    # Save image
                    if image:
                        img_id = hashlib.md5(image.encode()).hexdigest()[:12]
                        conn.execute("INSERT OR IGNORE INTO article_images (id,article_id,src,alt,source,date) VALUES (?,?,?,?,?,?)",
                            (img_id, aid, image, title[:100], source_name, TODAY))
                    
                    source_fetched += 1
                    fetched += 1
                except:
                    pass
            
            conn.commit()
            if source_fetched > 0:
                total = conn.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
                print(f"  ✅ {source_name:25} +{source_fetched} (total: {total})")
            
        except Exception as e:
            errors += 1
    
    conn.close()
    return fetched, errors


def fetch_from_source_sites():
    """For articles already in DB without text, try fetching directly from source_url."""
    print(f"\n🔗 DIRECT SOURCE FETCH")
    conn = get_conn()
    
    # Get unique sources with unfetched articles
    sources = conn.execute("""
        SELECT source_url, source, COUNT(*) as cnt FROM articles 
        WHERE (text_content IS NULL OR text_content = '') 
        AND source_url IS NOT NULL AND source_url != ''
        GROUP BY source_url ORDER BY cnt DESC LIMIT 30
    """).fetchall()
    
    fetched = 0
    for source_url, source_name, count in sources:
        try:
            # Discover RSS feeds on this source
            feed_urls = traf_feeds.find_feed_urls(source_url) or []
            
            if not feed_urls:
                continue
            
            # Get article URLs from feeds
            article_urls = []
            for fu in feed_urls[:2]:
                try:
                    more = traf_feeds.find_feed_urls(fu) or []
                    article_urls.extend(more)
                except:
                    pass
            
            if not article_urls:
                continue
            
            # Get unfetched article titles for matching
            unfetched = conn.execute("""SELECT id, title, source FROM articles 
                WHERE source=? AND (text_content IS NULL OR text_content='')""",
                (source_name,)).fetchall()
            
            title_map = {}
            for row in unfetched:
                clean = row['title'].replace(f" - {row['source']}", "") if row['source'] else row['title']
                title_map[clean[:30].lower()] = row['id']
            
            source_fetched = 0
            for url in article_urls[:15]:
                try:
                    html = trafilatura.fetch_url(url)
                    if not html: continue
                    result = trafilatura.extract(html, include_images=True, output_format='json', favor_precision=True)
                    if not result: continue
                    data = json.loads(result)
                    text = data.get('text', '')
                    if len(text) < 100: continue
                    
                    ext_title = (data.get('title') or '')[:30].lower()
                    
                    # Try to match to existing unfetched article
                    matched_id = None
                    for tkey, tid in list(title_map.items()):
                        if ext_title and (tkey[:20] in ext_title or ext_title[:20] in tkey):
                            matched_id = tid
                            del title_map[tkey]
                            break
                    
                    if matched_id:
                        conn.execute("""UPDATE articles SET text_content=?, summary=?, author=?,
                            image_url=?, word_count=?, fetched_at=datetime('now') WHERE id=?""",
                            (text[:10000], (data.get('description') or text[:250])[:300],
                             (data.get('author') or '')[:200], data.get('image') or '',
                             len(text.split()), matched_id))
                    else:
                        # New article from this source
                        aid = hashlib.md5(url.encode()).hexdigest()[:12]
                        topic = conn.execute("SELECT topic FROM articles WHERE source=? LIMIT 1", 
                            (source_name,)).fetchone()
                        conn.execute("""INSERT OR IGNORE INTO articles 
                            (id,title,clean_title,url,source,topic,date,text_content,summary,author,
                             image_url,word_count,source_url,fetched_at) 
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                            (aid, data.get('title','')[:200], data.get('title','')[:200], url,
                             source_name, topic[0] if topic else 'news-general', TODAY,
                             text[:10000], (data.get('description') or text[:250])[:300],
                             (data.get('author') or '')[:200], data.get('image') or '',
                             len(text.split()), source_url))
                    
                    source_fetched += 1
                    fetched += 1
                except:
                    pass
            
            if source_fetched > 0:
                conn.commit()
                total = conn.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
                print(f"  ✅ {source_name:25} +{source_fetched} (total: {total})")
        except:
            pass
    
    conn.close()
    return fetched


def print_status():
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    with_text = conn.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
    words = conn.execute("SELECT COALESCE(SUM(word_count),0) FROM articles WHERE word_count > 0").fetchone()[0]
    imgs = conn.execute("SELECT COUNT(*) FROM articles WHERE image_url IS NOT NULL AND image_url != ''").fetchone()[0]
    conn.close()
    print(f"\n{'='*50}")
    print(f"  Articles: {with_text}/{total} with text ({words:,} words)")
    print(f"  Images: {imgs}")
    print(f"  Coverage: {with_text*100//max(total,1)}%")
    print(f"{'='*50}")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--discover', action='store_true', help='Discover RSS feeds from existing sources')
    parser.add_argument('--fetch', action='store_true', help='Fetch from curated RSS feeds')
    parser.add_argument('--backfill', action='store_true', help='Backfill existing articles from source sites')
    parser.add_argument('--all', action='store_true', help='Run everything')
    args = parser.parse_args()
    
    if args.all or args.fetch or (not args.discover and not args.backfill):
        rss_fetched, rss_errors = fetch_rss_articles()
        print(f"\n  RSS: {rss_fetched} articles fetched, {rss_errors} feed errors")
    
    if args.all or args.backfill:
        backfill = fetch_from_source_sites()
        print(f"\n  Backfill: {backfill} articles fetched")
    
    print_status()
