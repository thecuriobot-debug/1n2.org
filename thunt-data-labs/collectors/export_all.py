#!/usr/bin/env python3.12
"""
THunt Data Labs — Export Layer (Phase 2)
Reads from central SQLite DB and generates ALL JSON files
that existing display apps expect. Drop-in replacement for
the old scrapers' output.

Usage:
    python3.12 export_all.py           # Export everything
    python3.12 export_all.py --reader  # Reader JSON only
"""
import sys, os, json, hashlib
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'db'))
from database import get_conn

HOME = Path.home()
TODAY = datetime.now().strftime("%Y-%m-%d")
BASE = HOME / ".openclaw" / "scrapling-apps"
READER = HOME / "Sites" / "1n2.org" / "dashboarder"

# ═══════════════════════════════════════
# GOOGLE NEWS → google-news/data/YYYY-MM-DD.json
# ═══════════════════════════════════════
def export_google_news():
    conn = get_conn()
    out = {}
    for row in conn.execute("SELECT * FROM articles WHERE date=? AND topic LIKE 'news-%'", (TODAY,)):
        topic = row["topic"].replace("news-","")
        if topic not in out: out[topic] = []
        out[topic].append({
            "title": row["title"],
            "url": row["url"],
            "source": row["source"],
            "date": row["date"]
        })
    conn.close()
    dest = BASE / "google-news" / "data" / f"{TODAY}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    total = sum(len(v) for v in out.values())
    print(f"  📰 google-news: {total} articles → {dest.name}")
    return total

# ═══════════════════════════════════════
# YOUTUBE → youtube-tracker/data/YYYY-MM-DD.json
# ═══════════════════════════════════════
def export_youtube():
    conn = get_conn()
    out = {}
    for ch in conn.execute("SELECT * FROM yt_channels"):
        cid = ch["channel_id"]
        vids = []
        for v in conn.execute("SELECT * FROM yt_videos WHERE channel_id=? ORDER BY published_at DESC LIMIT 15", (cid,)):
            vids.append({"id":v["video_id"],"title":v["title"],"published":v["published_at"],
                         "views":v["view_count"],"likes":v["like_count"],"comments":v["comment_count"]})
        out[cid] = {"name":ch["name"],"channel_id":cid,"videos":vids}
    conn.close()
    dest = BASE / "youtube-tracker" / "data" / f"{TODAY}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"  📺 youtube: {sum(len(c['videos']) for c in out.values())} videos → {dest.name}")
    return len(out)

# ═══════════════════════════════════════
# TWEETS → tweetster/data/YYYY-MM-DD.json
# ═══════════════════════════════════════
def export_tweets():
    conn = get_conn()
    out = {}
    for acct in conn.execute("SELECT username FROM tweet_accounts"):
        u = acct["username"]
        tweets = {}
        for tw in conn.execute("SELECT * FROM tweets WHERE username=? ORDER BY date DESC LIMIT 30", (u,)):
            tweets[tw["tweet_id"]] = {"text":tw["text_content"],"date":tw["date"],
                                       "likes":tw["likes"],"retweets":tw["retweets"]}
        out[u] = {"tweets":tweets}
    conn.close()
    dest = BASE / "tweetster" / "data" / f"{TODAY}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    total = sum(len(v["tweets"]) for v in out.values())
    print(f"  🐦 tweets: {total} tweets → {dest.name}")
    return total

# ═══════════════════════════════════════
# COMMENTS → reader/data/comments.json
# ═══════════════════════════════════════
def export_comments():
    conn = get_conn()
    comments = []
    for c in conn.execute("""SELECT c.*, v.title as video_title FROM yt_comments c
        LEFT JOIN yt_videos v ON c.video_id=v.video_id
        ORDER BY c.like_count DESC, c.published_at DESC"""):
        comments.append({
            "id":c["comment_id"],"text":c["text_content"],"likes":c["like_count"],
            "date":c["published_at"] or "","author":c["author_name"],
            "avatar":c["author_avatar"] or "",
            "video_id":c["video_id"],"video_title":c["video_title"] or "",
            "video_url":f"https://www.youtube.com/watch?v={c['video_id']}",
            "is_reply":bool(c["is_reply"])
        })
    conn.close()
    dest = READER / "data" / "comments.json"
    dest.write_text(json.dumps(comments, indent=2, ensure_ascii=False))
    print(f"  💬 comments: {len(comments)} → {dest.name}")
    return len(comments)

# ═══════════════════════════════════════
# GALLERY → reader/data/gallery.json
# ═══════════════════════════════════════
def export_gallery():
    conn = get_conn()
    items = []
    for a in conn.execute("SELECT * FROM articles WHERE word_count>0 OR image_url!='' ORDER BY date DESC LIMIT 50"):
        items.append({
            "id":a["id"],"title":a["clean_title"] or a["title"],
            "url":a["url"],"source":a["source"],"date":a["date"],
            "image":a["image_url"] or "","local_image":"",
            "word_count":a["word_count"]
        })
    conn.close()
    dest = READER / "data" / "gallery.json"
    dest.write_text(json.dumps(items, indent=2, ensure_ascii=False))
    print(f"  🖼 gallery: {len(items)} → {dest.name}")
    return len(items)

# ═══════════════════════════════════════
# CURIO → curio-data-hub/latest.json
# ═══════════════════════════════════════
def export_curio():
    conn = get_conn()
    price = conn.execute("SELECT * FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()
    sales_count = conn.execute("SELECT COUNT(*) FROM curio_sales").fetchone()[0]
    holders = conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE quantity>0").fetchone()[0]
    cards = [dict(r) for r in conn.execute("SELECT card_id,name,image_url FROM curio_cards ORDER BY card_id")]
    out = {
        "market":{"floor_price":price["floor_price_eth"] if price else 0,
                  "holders":holders,"sales_24h":sales_count},
        "cards":cards,
        "updated":datetime.now().isoformat()
    }
    conn.close()
    dest = HOME / ".curio-data-hub" / "latest.json"
    dest.write_text(json.dumps(out, indent=2))
    print(f"  🃏 curio: floor={out['market']['floor_price']} holders={holders} → latest.json")
    return 1

# ═══════════════════════════════════════
# DATA LABS DASHBOARD → web/stats.json
# ═══════════════════════════════════════
def export_stats():
    """Re-use the export from collect_all.py"""
    from collect_all import export_stats as _export
    return _export()

# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════
def export_media():
    conn = get_conn()
    recent_movies = [{"title":r["title"],"year":r["year"],"director":r["director"],"rating":r["rating"],"date":r["watched_date"]}
        for r in conn.execute("SELECT DISTINCT title,year,director,rating,watched_date FROM movies WHERE rating IS NOT NULL ORDER BY watched_date DESC LIMIT 20")]
    recent_books = [{"title":r["title"],"author":r["author"],"rating":r["rating"],"date":r["read_date"]}
        for r in conn.execute("SELECT DISTINCT title,author,rating,read_date FROM books ORDER BY read_date DESC LIMIT 20")]
    top_movies = [{"title":r["title"],"year":r["year"],"director":r["director"],"rating":r["rating"]}
        for r in conn.execute("SELECT DISTINCT title,year,director,rating FROM movies WHERE rating IS NOT NULL ORDER BY rating DESC, watched_date DESC LIMIT 10")]
    top_books = [{"title":r["title"],"author":r["author"],"rating":r["rating"]}
        for r in conn.execute("SELECT DISTINCT title,author,rating FROM books WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 10")]
    top_directors = [{"name":r[0],"count":r[1]}
        for r in conn.execute("SELECT director,COUNT(DISTINCT title) as c FROM movies WHERE director IS NOT NULL AND director!='' GROUP BY director ORDER BY c DESC LIMIT 10")]
    top_authors = [{"name":r[0],"count":r[1]}
        for r in conn.execute("SELECT author,COUNT(DISTINCT title) as c FROM books WHERE author IS NOT NULL AND author!='' GROUP BY author ORDER BY c DESC LIMIT 10")]
    stats = {
        "total_movies": conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0],
        "total_books": conn.execute("SELECT COUNT(*) FROM books").fetchone()[0],
        "avg_rating": conn.execute("SELECT ROUND(AVG(rating),1) FROM movies WHERE rating IS NOT NULL").fetchone()[0],
    }
    out = {"recent_movies":recent_movies,"recent_books":recent_books,"top_movies":top_movies,"top_books":top_books,"top_directors":top_directors,"top_authors":top_authors,"stats":stats}
    conn.close()
    dest = READER / "data" / "media.json"
    dest.write_text(json.dumps(out, indent=2, default=str))
    print(f"  🎬 media: {len(recent_movies)} movies + {len(recent_books)} books → {dest.name}")
    return len(recent_movies) + len(recent_books)

def run_all():
    print(f"\n📤 EXPORT ALL — {TODAY}")
    print("=" * 40)
    results = {}
    results["google_news"] = export_google_news()
    results["youtube"] = export_youtube()
    results["tweets"] = export_tweets()
    results["comments"] = export_comments()
    results["gallery"] = export_gallery()
    results["curio"] = export_curio()
    results["media"] = export_media()
    try: results["stats"] = export_stats()
    except: results["stats"] = 0
    print("=" * 40)
    print(f"  Exported {sum(results.values()):,} items to {len(results)} targets")
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--reader", action="store_true")
    args = parser.parse_args()
    if args.reader:
        export_comments()
        export_gallery()
    else:
        run_all()

# ═══════════════════════════════════════
# MEDIA → reader/data/media.json
# ═══════════════════════════════════════
