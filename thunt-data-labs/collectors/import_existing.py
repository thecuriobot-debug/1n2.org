#!/usr/bin/env python3.12
"""
THunt Data Labs — Import Collector
Imports all existing data from Curio Data Hub, Commentzor, Article Archive, and Tweetster
into the central SQLite database.
"""
import sys, os, json, time, sqlite3
from pathlib import Path
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'db'))
from database import get_conn, log_collection, init_db

HOME = Path.home()

def import_curio_data():
    """Import from Curio Data Hub."""
    print("\n=== CURIO DATA ===")
    conn = get_conn()
    start = time.time()
    added = 0

    # Import latest market data
    latest = HOME / ".curio-data-hub" / "latest.json"
    if latest.exists():
        d = json.loads(latest.read_text())
        m = d.get("market", {})
        conn.execute("""INSERT OR IGNORE INTO curio_prices (date, floor_price_eth, holders, sales_count)
            VALUES (?, ?, ?, ?)""",
            (datetime.now().strftime("%Y-%m-%d"), float(m.get("floor_price", 0)),
             int(m.get("holders", 0)), int(m.get("sales_24h", 0))))
        added += 1

    # Import historical price data
    raw_dir = HOME / ".curio-data-hub" / "raw"
    if raw_dir.exists():
        for f in sorted(raw_dir.glob("market-*.json")):
            try:
                d = json.loads(f.read_text())
                date = f.stem.replace("market-", "")
                floor = d.get("openSea", {}).get("floorPrice", 0) or 0
                conn.execute("""INSERT OR IGNORE INTO curio_prices (date, floor_price_eth)
                    VALUES (?, ?)""", (date, float(floor)))
                added += 1
            except: pass

    # Import NFT card data
    nft_files = sorted(raw_dir.glob("nfts-*.json")) if raw_dir.exists() else []
    if nft_files:
        d = json.loads(nft_files[-1].read_text())
        for nft in d.get("nfts", []):
            tid = int(nft.get("tokenId", 0))
            name = nft.get("name", "")
            img = nft.get("image", {})
            conn.execute("""INSERT OR REPLACE INTO curio_cards (card_id, name, image_url)
                VALUES (?, ?, ?)""", (tid, name, img.get("cachedUrl", "")))
            added += 1

    # Import sales data
    for f in sorted(raw_dir.glob("sales-*.json")) if raw_dir.exists() else []:
        try:
            d = json.loads(f.read_text())
            for sale in d.get("sales", []):
                tx = sale.get("transactionHash", "")
                if not tx: continue
                conn.execute("""INSERT OR IGNORE INTO curio_sales
                    (tx_hash, card_id, price_eth, buyer, seller, sale_date, marketplace)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (tx, int(sale.get("tokenId", 0)),
                     float(sale.get("price", 0)),
                     sale.get("buyer", ""), sale.get("seller", ""),
                     sale.get("blockTimestamp", "")[:10],
                     sale.get("marketplace", "")))
                added += 1
        except: pass

    conn.commit()
    dur = time.time() - start
    log_collection("curio", "import", added, 0, dur)
    conn.close()
    print(f"  Imported {added} records ({dur:.1f}s)")

def import_youtube_data():
    """Import from Commentzor DB + YouTube Tracker."""
    print("\n=== YOUTUBE DATA ===")
    conn = get_conn()
    start = time.time()
    added = 0

    # Import from Commentzor SQLite
    czdb = HOME / "Sites" / "1n2.org" / "commentzor" / "data" / "commentzor.db"
    if czdb.exists():
        cz = sqlite3.connect(str(czdb))
        cz.row_factory = sqlite3.Row
        
        for ch in cz.execute("SELECT * FROM channels").fetchall():
            conn.execute("""INSERT OR REPLACE INTO yt_channels
                (channel_id, name, url, subscribers, video_count, thumbnail, last_scraped)
                VALUES (?,?,?,?,?,?,?)""",
                (ch["channel_id"], ch["channel_name"], ch["channel_url"],
                 ch["subscriber_count"], ch["video_count"], ch["thumbnail_url"], ch["last_scraped"]))
            added += 1

        for v in cz.execute("SELECT * FROM videos").fetchall():
            conn.execute("""INSERT OR REPLACE INTO yt_videos
                (video_id, channel_id, title, description, published_at, view_count, like_count, comment_count, duration, thumbnail)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (v["video_id"], v["channel_id"], v["title"], v["description"],
                 v["published_at"], v["view_count"], v["like_count"], v["comment_count"],
                 v["duration"], v["thumbnail_url"]))
            added += 1

        for c in cz.execute("SELECT c.*, a.author_name, a.author_avatar FROM comments c JOIN authors a ON c.author_id=a.author_id").fetchall():
            conn.execute("""INSERT OR IGNORE INTO yt_comments
                (comment_id, video_id, channel_id, author_name, author_id, author_avatar,
                 text_content, like_count, published_at, parent_id, is_reply)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (c["comment_id"], c["video_id"], c["channel_id"],
                 c["author_name"], c["author_id"], c["author_avatar"],
                 c["text_original"], c["like_count"], c["published_at"],
                 c["parent_id"], c["is_reply"]))
            added += 1
        cz.close()

    # Import from YouTube tracker JSON
    yt_dir = HOME / ".openclaw" / "scrapling-apps" / "youtube-tracker" / "data"
    for f in sorted(yt_dir.glob("*.json")) if yt_dir.exists() else []:
        d = json.loads(f.read_text())
        for ch_id, ch_data in d.items():
            for v in ch_data.get("videos", []):
                conn.execute("""INSERT OR REPLACE INTO yt_videos
                    (video_id, channel_id, title, published_at, view_count, thumbnail)
                    VALUES (?,?,?,?,?,?)""",
                    (v["id"], ch_data.get("channel_id",""), v["title"],
                     v.get("published",""), v.get("views",0),
                     f"https://img.youtube.com/vi/{v['id']}/hqdefault.jpg"))
                added += 1

    conn.commit()
    dur = time.time() - start
    log_collection("youtube", "import", added, 0, dur)
    conn.close()
    print(f"  Imported {added} records ({dur:.1f}s)")

def import_articles():
    """Import from article archive db.json."""
    print("\n=== ARTICLES ===")
    conn = get_conn()
    start = time.time()
    added = 0

    db_file = HOME / ".openclaw" / "scrapling-apps" / "archive" / "db.json"
    if db_file.exists():
        db = json.loads(db_file.read_text())
        for aid, a in db.get("articles", {}).items():
            conn.execute("""INSERT OR REPLACE INTO articles
                (id, title, clean_title, url, source, topic, author, summary, text_content, word_count, image_url, local_image, date)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (a.get("id",""), a.get("title",""), a.get("clean_title",""),
                 a.get("url",""), a.get("source",""), a.get("topic",""),
                 a.get("author",""), a.get("summary",""), a.get("text",""),
                 a.get("word_count",0), a.get("image",""), a.get("local_image",""),
                 a.get("date","")))
            added += 1

        for iid, img in db.get("images", {}).items():
            conn.execute("""INSERT OR IGNORE INTO article_images
                (id, article_id, src, local_path, alt, source, date)
                VALUES (?,?,?,?,?,?,?)""",
                (iid, img.get("article_id",""), img.get("src",""),
                 img.get("local",""), img.get("alt",""), img.get("source",""), img.get("date","")))
            added += 1

    # Also import from daily JSON files
    for data_dir, topic_prefix in [
        (HOME / ".openclaw" / "scrapling-apps" / "google-news" / "data", "news"),
        (HOME / ".openclaw" / "scrapling-apps" / "city-news" / "data", "city"),
        (HOME / ".openclaw" / "scrapling-apps" / "entertainment" / "data", "ent"),
    ]:
        for f in sorted(data_dir.glob("*.json")) if data_dir.exists() else []:
            import hashlib
            d = json.loads(f.read_text())
            date = f.stem  # YYYY-MM-DD
            for topic, arts in d.items():
                for a in (arts or []):
                    url = a.get("url", "")
                    if not url: continue
                    aid = hashlib.md5(url.encode()).hexdigest()[:12]
                    src = a.get("source", "")
                    title = a.get("title", "")
                    if src and title.endswith(f" - {src}"): title = title[:-(len(src)+3)]
                    conn.execute("""INSERT OR IGNORE INTO articles
                        (id, title, clean_title, url, source, topic, date)
                        VALUES (?,?,?,?,?,?,?)""",
                        (aid, a.get("title",""), title, url, src, f"{topic_prefix}-{topic}", date))
                    added += 1

    conn.commit()
    dur = time.time() - start
    log_collection("articles", "import", added, 0, dur)
    conn.close()
    print(f"  Imported {added} records ({dur:.1f}s)")

def import_tweets():
    """Import from Tweetster archive."""
    print("\n=== TWEETS ===")
    conn = get_conn()
    start = time.time()
    added = 0

    archive_dir = HOME / ".openclaw" / "scrapling-apps" / "tweetster" / "archive"
    if archive_dir.exists():
        for f in archive_dir.glob("*.json"):
            username = f.stem
            try:
                d = json.loads(f.read_text())
                tweets = d.get("tweets", {})
                if isinstance(tweets, dict):
                    # Insert account
                    conn.execute("""INSERT OR REPLACE INTO tweet_accounts (username) VALUES (?)""", (username,))
                    for tid, tw in tweets.items():
                        text = tw.get("text", "")
                        date = tw.get("date", "")
                        likes = tw.get("likes", 0)
                        rts = tw.get("retweets", 0)
                        is_rt = 1 if tw.get("is_retweet") else 0
                        conn.execute("""INSERT OR IGNORE INTO tweets
                            (tweet_id, username, text_content, date, likes, retweets, is_retweet)
                            VALUES (?,?,?,?,?,?,?)""",
                            (tid, username, text, date, likes, rts, is_rt))
                        added += 1
            except: pass

    conn.commit()
    dur = time.time() - start
    log_collection("tweets", "import", added, 0, dur)
    conn.close()
    print(f"  Imported {added} records ({dur:.1f}s)")


def run_all():
    init_db()
    import_curio_data()
    import_youtube_data()
    import_articles()
    import_tweets()
    
    # Print final stats
    from database import get_stats
    stats = get_stats()
    print("\n" + "=" * 50)
    print("THunt Data Labs — Import Complete")
    print("=" * 50)
    total = 0
    for table, count in stats.items():
        if count > 0:
            print(f"  {table:20s} {count:>8,}")
            total += count
    print(f"  {'TOTAL':20s} {total:>8,}")


if __name__ == "__main__":
    run_all()
