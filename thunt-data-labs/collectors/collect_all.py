#!/usr/bin/env python3.12
"""
THunt Data Labs — collect_all.py
Single script that collects ALL data directly into the central SQLite DB.
Run daily via cron. Replaces separate JSON scrapers.
"""
import sys, os, json, time, hashlib, argparse, requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse, quote

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'db'))
from database import get_conn, init_db, log_collection, get_stats

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except: pass

ALCHEMY_KEY = "vfF4rHBY1zsGgI3kqEg9v"
YOUTUBE_KEY = os.environ.get("YOUTUBE_API_KEY", "AIzaSyCr7_c99ha2Z0SeJDqC31OlM1WOuK4iy_w")
CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
TODAY = datetime.now().strftime("%Y-%m-%d")
BOT = "8260454959:AAFrHFnltK6fih2dvSsjkX9t_Ea0T5PtCHw"
CHAT = "244802318"
YT_CHANNELS = {
    "UCQgjyXLLMtG99Dkh8Yvw-3g": "MadBitcoins",
    "UCyWXUSxzJ5vVcH2-WjQdeOA": "Thomas Hunt Films",
    "UCp7Gqpl9Kqiggr_Rs03X5pA": "World Crypto Network (old)",
    "UCR9gdpWisRwnk_k23GsHfcA": "World Crypto Network",
}

NITTER = ["https://nitter.net", "https://nitter.privacydev.net", "https://nitter.poast.org"]

# ═══════════════════════════════════════
# CURIO — Alchemy API
# ═══════════════════════════════════════
def collect_curio():
    print("\n🃏 CURIO DATA")
    conn = get_conn(); start = time.time(); added = 0
    try:
        r = requests.get(f"https://eth-mainnet.g.alchemy.com/nft/v3/{ALCHEMY_KEY}/getFloorPrice?contractAddress={CONTRACT}", timeout=10)
        floor = r.json().get("openSea",{}).get("floorPrice",0) or 0
        conn.execute("INSERT INTO curio_prices (date,floor_price_eth) VALUES (?,?)", (TODAY,float(floor)))
        added += 1; print(f"  Floor: {floor} ETH")
    except Exception as e: print(f"  ❌ Floor: {e}")
    try:
        r = requests.get(f"https://eth-mainnet.g.alchemy.com/nft/v3/{ALCHEMY_KEY}/getNFTsForCollection?contractAddress={CONTRACT}&limit=100&withMetadata=true", timeout=15)
        for nft in r.json().get("nfts",[]):
            tid = int(nft.get("tokenId",0)); name = nft.get("name","")
            img = nft.get("image",{}).get("cachedUrl","")
            conn.execute("INSERT OR REPLACE INTO curio_cards (card_id,name,image_url) VALUES (?,?,?)", (tid,name,img))
            added += 1
        print(f"  {added-1} cards")
    except Exception as e: print(f"  ❌ Cards: {e}")
    try:
        r = requests.get(f"https://eth-mainnet.g.alchemy.com/nft/v3/{ALCHEMY_KEY}/getNFTSales?contractAddress={CONTRACT}&limit=100&order=desc", timeout=15)
        sc = 0
        for s in r.json().get("nftSales",[]):
            tx = s.get("transactionHash",""); 
            if not tx: continue
            pw = int(s.get("sellerFee",{}).get("amount",0)); pe = pw/1e18 if pw else 0
            conn.execute("INSERT OR IGNORE INTO curio_sales (tx_hash,card_id,price_eth,buyer,seller,sale_date,marketplace) VALUES (?,?,?,?,?,?,?)",
                (tx,int(s.get("tokenId",0)),pe,s.get("buyerAddress",""),s.get("sellerAddress",""),s.get("blockTimestamp","")[:10],s.get("marketplace","")))
            sc += 1
        added += sc; print(f"  {sc} sales")
    except Exception as e: print(f"  ❌ Sales: {e}")
    try:
        r = requests.get(f"https://eth-mainnet.g.alchemy.com/nft/v3/{ALCHEMY_KEY}/getOwnersForContract?contractAddress={CONTRACT}&withTokenBalances=true", timeout=20)
        oc = 0
        for o in r.json().get("owners",[]):
            addr = o.get("ownerAddress","")
            for tb in o.get("tokenBalances",[]):
                conn.execute("INSERT OR REPLACE INTO curio_owners (card_id,owner_address,quantity,fetched_at) VALUES (?,?,?,datetime('now'))",
                    (int(tb.get("tokenId",0)),addr,int(tb.get("balance",0))))
                oc += 1
        added += oc; print(f"  {oc} owner records")
    except Exception as e: print(f"  ❌ Owners: {e}")
    # 6. Transfer history (ERC-1155 via alchemy_getAssetTransfers)
    try:
        page_key = None; tc = 0
        for _ in range(10):
            params_rpc = [{"fromBlock":"0x0","toBlock":"latest","contractAddresses":[CONTRACT],
                           "category":["erc1155"],"order":"desc","maxCount":"0x64","withMetadata":True}]
            if page_key: params_rpc[0]["pageKey"] = page_key
            r = requests.post(f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}",
                json={"jsonrpc":"2.0","id":1,"method":"alchemy_getAssetTransfers","params":params_rpc}, timeout=20)
            d = r.json().get("result",{})
            for t in d.get("transfers",[]):
                tx = t.get("hash",""); 
                if not tx: continue
                for em in t.get("erc1155Metadata",[]):
                    tid = int(em.get("tokenId","0x0"),16)
                    conn.execute("""INSERT OR IGNORE INTO curio_transfers (tx_hash,block_num,from_addr,to_addr,card_id,quantity,transfer_date,fetched_at)
                        VALUES (?,?,?,?,?,?,?,datetime('now'))""",
                        (tx,int(t.get("blockNum","0x0"),16),t.get("from",""),t.get("to",""),
                         tid,int(em.get("value","0x1"),16),
                         t.get("metadata",{}).get("blockTimestamp","")[:10]))
                    tc += 1
            page_key = d.get("pageKey")
            if not page_key: break
            time.sleep(0.2)
        added += tc; print(f"  {tc} transfers")
    except Exception as e: print(f"  ❌ Transfers: {e}")
    conn.commit(); dur = time.time()-start
    log_collection("curio","collect",added,0,dur); conn.close()
    print(f"  ✅ {added} total ({dur:.1f}s)"); return added

# ═══════════════════════════════════════
# YOUTUBE — API v3
# ═══════════════════════════════════════
def yt_api(endpoint, params):
    params["key"] = YOUTUBE_KEY
    r = requests.get(f"https://www.googleapis.com/youtube/v3/{endpoint}", params=params, timeout=15)
    if r.status_code == 403: print(f"  ⚠️ Quota exceeded"); return None
    return r.json()

def collect_youtube():
    print("\n📺 YOUTUBE DATA")
    conn = get_conn(); start = time.time(); added = 0
    for ch_id, ch_name in YT_CHANNELS.items():
        print(f"  {ch_name}...")
        # Channel info
        d = yt_api("channels", {"id":ch_id, "part":"snippet,statistics,contentDetails"})
        if not d or not d.get("items"): continue
        item = d["items"][0]; stats = item.get("statistics",{})
        conn.execute("INSERT OR REPLACE INTO yt_channels (channel_id,name,url,subscribers,video_count,thumbnail,last_scraped) VALUES (?,?,?,?,?,?,datetime('now'))",
            (ch_id, ch_name, f"https://youtube.com/channel/{ch_id}",
             int(stats.get("subscriberCount",0)), int(stats.get("videoCount",0)),
             item.get("snippet",{}).get("thumbnails",{}).get("default",{}).get("url","")))
        added += 1
        # Get uploads playlist
        uploads = item.get("contentDetails",{}).get("relatedPlaylists",{}).get("uploads","")
        if not uploads: continue
        # Fetch recent videos (last 50)
        vd = yt_api("playlistItems", {"playlistId":uploads,"part":"snippet","maxResults":50})
        if not vd: continue
        vid_ids = [i["snippet"]["resourceId"].get("videoId") for i in vd.get("items",[]) if i["snippet"]["resourceId"].get("videoId")]
        # Get video details
        for i in range(0, len(vid_ids), 50):
            batch = vid_ids[i:i+50]
            vdata = yt_api("videos", {"id":",".join(batch), "part":"snippet,statistics"})
            if not vdata: continue
            for v in vdata.get("items",[]):
                vs = v.get("statistics",{}); sn = v.get("snippet",{})
                conn.execute("""INSERT OR REPLACE INTO yt_videos
                    (video_id,channel_id,title,description,published_at,view_count,like_count,comment_count,thumbnail,last_scraped)
                    VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))""",
                    (v["id"],ch_id,sn.get("title",""),sn.get("description","")[:500],
                     sn.get("publishedAt",""),int(vs.get("viewCount",0)),int(vs.get("likeCount",0)),
                     int(vs.get("commentCount",0)),sn.get("thumbnails",{}).get("medium",{}).get("url","")))
                added += 1
        print(f"    {len(vid_ids)} videos updated")

        # Fetch comments for recent videos with comments
        recent = conn.execute("SELECT video_id,title,comment_count FROM yt_videos WHERE channel_id=? AND comment_count>0 ORDER BY published_at DESC LIMIT 20", (ch_id,)).fetchall()
        cc = 0
        for rv in recent:
            vid = rv["video_id"]
            existing = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE video_id=?", (vid,)).fetchone()[0]
            if existing >= rv["comment_count"]: continue
            cd = yt_api("commentThreads", {"videoId":vid,"part":"snippet","maxResults":100,"textFormat":"plainText"})
            if not cd: continue
            for t in cd.get("items",[]):
                tc = t["snippet"]["topLevelComment"]["snippet"]
                aid = tc.get("authorChannelId",{}).get("value","anon")
                conn.execute("""INSERT OR IGNORE INTO yt_comments
                    (comment_id,video_id,channel_id,author_name,author_id,author_avatar,text_content,like_count,published_at,is_reply)
                    VALUES (?,?,?,?,?,?,?,?,?,0)""",
                    (t["snippet"]["topLevelComment"]["id"],vid,ch_id,
                     tc.get("authorDisplayName",""),aid,tc.get("authorProfileImageUrl",""),
                     tc.get("textOriginal",""),int(tc.get("likeCount",0)),tc.get("publishedAt","")))
                cc += 1
        added += cc; print(f"    {cc} new comments")
    conn.commit(); dur = time.time()-start
    log_collection("youtube","collect",added,0,dur); conn.close()
    print(f"  ✅ {added} total ({dur:.1f}s)"); return added

# ═══════════════════════════════════════
# ARTICLES — Google News RSS
# ═══════════════════════════════════════
NEWS_QUERIES = {
    "bitcoin": "bitcoin today",
    "crypto": "cryptocurrency altcoin today",
    "ethereum": "ethereum ETH today",
    "ai": "artificial intelligence AI today",
    "tech": "technology today",
    "science": "science discovery today",
    "world": "world international news today",
    "us": "US national news today",
    "business": "business finance economy today",
    "health": "health medical news today",
    "sports": "sports news today",
    "politics": "US politics government today",
    "culture": "movies music entertainment today",
}

def collect_articles():
    print("\n📰 ARTICLES (RSS Pipeline)")
    # Delegate to rss_pipeline.py which has 35+ working feeds
    import subprocess, sys
    script = os.path.join(os.path.dirname(__file__), 'rss_pipeline.py')
    start = time.time()
    try:
        result = subprocess.run(
            [sys.executable, script, '--all'],
            capture_output=True, text=True, timeout=180
        )
        for line in result.stdout.splitlines():
            print(f"  {line}")
        if result.returncode != 0 and result.stderr:
            print(f"  ⚠️  {result.stderr[:200]}")
        # Count what was added
        conn = get_conn()
        count = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        conn.close()
        dur = time.time() - start
        log_collection("articles", "rss_pipeline", count, 0, dur)
        print(f"  ✅ {count} total articles in DB ({dur:.1f}s)")
        return count
    except subprocess.TimeoutExpired:
        print("  ⚠️  RSS pipeline timed out after 180s")
        return 0
    except Exception as e:
        print(f"  ❌ RSS pipeline: {e}")
        return 0
    conn.commit(); dur = time.time()-start
    log_collection("articles","collect",added,0,dur); conn.close()
    print(f"  ✅ {added} articles ({dur:.1f}s)"); return added

def fetch_article_content():
    """Fetch full text + images using StealthyFetcher (resolves Google News URLs) + trafilatura."""
    print("\n📰 ARTICLE CONTENT FETCHER (scrapling + trafilatura)")
    conn = get_conn(); start = time.time(); fetched = 0; failed = 0
    import trafilatura, json as _json
    
    rows = conn.execute("""SELECT id, url, title, source FROM articles 
        WHERE (text_content IS NULL OR text_content = '') AND url != '' 
        ORDER BY date DESC LIMIT 25""").fetchall()
    if not rows:
        print("  All articles already have content"); conn.close(); return 0
    
    # Use StealthyFetcher for Google News URLs (resolves redirects with real browser)
    use_stealth = any('news.google.com' in r[1] for r in rows)
    StealthyFetch = None
    if use_stealth:
        try:
            from scrapling.fetchers import StealthyFetcher
            StealthyFetch = StealthyFetcher
        except: print("  ⚠️ StealthyFetcher unavailable, falling back to trafilatura only")
    
    for aid, url, title, source in rows:
        try:
            html_content = None
            
            if 'news.google.com' in url and StealthyFetch:
                # StealthyFetcher follows Google News 302 redirects
                page = StealthyFetch.fetch(url, headless=True, timeout=15000, network_idle=True)
                if page:
                    # Get resolved URL's HTML via trafilatura (more reliable text extraction)
                    resolved = str(page.url) if hasattr(page, 'url') else ''
                    if resolved and 'google' not in resolved:
                        html_content = trafilatura.fetch_url(resolved)
                    if not html_content:
                        # Fallback: use page HTML directly
                        html_content = page.body.html if hasattr(page, 'body') and hasattr(page.body, 'html') else None
            else:
                # Direct URL - use trafilatura's fast fetcher
                html_content = trafilatura.fetch_url(url)
            
            if not html_content or len(html_content) < 500:
                failed += 1; continue
            
            # Extract article content with trafilatura
            result = trafilatura.extract(html_content, include_images=True, 
                                         output_format='json', favor_precision=True)
            if not result:
                failed += 1; continue
            
            data = _json.loads(result)
            text = data.get('text', '')
            if len(text) < 100:
                failed += 1; continue
            
            word_count = len(text.split())
            summary = (data.get('description') or data.get('excerpt') or text[:250])[:300]
            author = (data.get('author') or '')[:200]
            image = data.get('image') or ''
            
            conn.execute("""UPDATE articles SET text_content=?, summary=?, author=?, 
                image_url=?, word_count=?, fetched_at=datetime('now') WHERE id=?""",
                (text[:10000], summary, author, image, word_count, aid))
            
            if image:
                img_id = hashlib.md5(image.encode()).hexdigest()[:12]
                conn.execute("""INSERT OR IGNORE INTO article_images 
                    (id, article_id, src, alt, source, date) 
                    VALUES (?,?,?,?,?,?)""", (img_id, aid, image, title[:100], source or '', TODAY))
            
            fetched += 1
            if fetched % 5 == 0: print(f"    {fetched} articles fetched...")
        except Exception as e:
            failed += 1
        
        time.sleep(0.5)
    
    conn.commit(); dur = time.time()-start; conn.close()
    print(f"  ✅ {fetched} articles content fetched, {failed} skipped ({dur:.1f}s)")
    return fetched


# ═══════════════════════════════════════
# TWEETS — Nitter scraping via curl-cffi
# ═══════════════════════════════════════
TWEET_ACCOUNTS = ["madbitcoins","Bitcoin","VitalikButerin","CurioNFT","aantonop","curaborern"]

def collect_tweets():
    """Collect tweets via twikit (authenticated) or tweetster data file fallback."""
    print("\n🐦 TWEETS")
    conn = get_conn(); start = time.time(); added = 0

    # Method 1: Try twikit (authenticated Twitter API)
    CREDS = Path.home() / "Sites/1n2.org/tweetster/api/twitter-creds.json"
    COOKIES = Path.home() / "Sites/1n2.org/tweetster/api/twitter-cookies.json"
    if COOKIES.exists() and CREDS.exists():
        try:
            import asyncio
            from twikit import Client
            async def fetch_twikit():
                client = Client("en-US")
                client.load_cookies(str(COOKIES))
                local_added = 0
                for username in TWEET_ACCOUNTS:
                    try:
                        user = await client.get_user_by_screen_name(username)
                        tweets = await client.get_user_tweets(user.id, "Tweets", count=20)
                        conn.execute("INSERT OR REPLACE INTO tweet_accounts (username,last_scraped) VALUES (?,datetime('now'))", (username,))
                        for t in tweets:
                            conn.execute("""INSERT OR IGNORE INTO tweets (tweet_id,username,text_content,date,likes,retweets,replies)
                                VALUES (?,?,?,?,?,?,?)""",
                                (t.id, username, t.text, t.created_at or "", t.favorite_count or 0,
                                 t.retweet_count or 0, t.reply_count or 0))
                            local_added += 1
                        print(f"  @{username}: {len(tweets)} tweets via twikit")
                    except Exception as e:
                        print(f"  ⚠️ @{username}: {e}")
                return local_added
            added = asyncio.run(fetch_twikit())
            conn.commit()
            dur = time.time() - start
            log_collection("tweets", "twikit", added, 0, dur)
            print(f"  ✅ {added} tweets ({dur:.1f}s)")
            conn.close()
            return added
        except Exception as e:
            print(f"  ⚠️ twikit failed: {e} — trying file fallback")

    # Method 2: Read from tweetster data file (pre-scraped)
    tweets_file = Path.home() / "Sites/1n2.org/tweetster/data/tweets.json"
    if tweets_file.exists():
        try:
            data = json.loads(tweets_file.read_text())
            accounts = data if isinstance(data, dict) else {}
            for username, udata in accounts.items():
                tweets = udata.get("tweets", {}) if isinstance(udata, dict) else {}
                conn.execute("INSERT OR REPLACE INTO tweet_accounts (username,last_scraped) VALUES (?,datetime('now'))", (username,))
                for tid, t in (tweets.items() if isinstance(tweets, dict) else []):
                    conn.execute("""INSERT OR IGNORE INTO tweets (tweet_id,username,text_content,date,likes,retweets)
                        VALUES (?,?,?,?,?,?)""",
                        (tid, username, t.get("text",""), t.get("date",""), t.get("likes",0), t.get("retweets",0)))
                    added += 1
            conn.commit()
            print(f"  ✅ {added} tweets from tweetster file ({time.time()-start:.1f}s)")
        except Exception as e:
            print(f"  ⚠️ file fallback: {e}")
    else:
        print(f"  ℹ️  No twitter cookies and no tweetster data file — skipping tweets")
        print(f"     Run: cd tweetster/api && python3.12 twikit-fetch.py --login")

    dur = time.time() - start
    log_collection("tweets", "collect", added, 0, dur)
    conn.close()
    print(f"  ✅ {added} tweets ({dur:.1f}s)")
    return added

# ═══════════════════════════════════════
# EXPORT — Generate stats.json for dashboard
# ═══════════════════════════════════════
def export_stats():
    print("\n📊 EXPORTING STATS")
    conn = get_conn()
    stats = {"generated_at":datetime.now().isoformat(),"total_records":0,"datasets":{}}

    # Curio
    c = {"name":"Curio Cards","icon":"🃏","tables":{}}
    c["tables"]["prices"] = conn.execute("SELECT COUNT(*) FROM curio_prices").fetchone()[0]
    c["tables"]["cards"] = conn.execute("SELECT COUNT(*) FROM curio_cards").fetchone()[0]
    c["tables"]["owners"] = conn.execute("SELECT COUNT(*) FROM curio_owners").fetchone()[0]
    c["tables"]["sales"] = conn.execute("SELECT COUNT(*) FROM curio_sales").fetchone()[0]
    c["total"] = sum(c["tables"].values())
    row = conn.execute("SELECT * FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()
    if row: c["latest"] = {"floor":row["floor_price_eth"],"holders":0,"date":row["date"]}
    c["cards"] = [dict(r) for r in conn.execute("SELECT card_id,name,image_url FROM curio_cards ORDER BY card_id")]
    stats["datasets"]["curio"] = c

    # YouTube
    yt = {"name":"YouTube","icon":"📺","tables":{}}
    yt["tables"]["channels"] = conn.execute("SELECT COUNT(*) FROM yt_channels").fetchone()[0]
    yt["tables"]["videos"] = conn.execute("SELECT COUNT(*) FROM yt_videos").fetchone()[0]
    yt["tables"]["comments"] = conn.execute("SELECT COUNT(*) FROM yt_comments").fetchone()[0]
    yt["total"] = sum(yt["tables"].values())
    yt["channels"] = []
    for ch in conn.execute("SELECT * FROM yt_channels"):
        vids = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (ch["channel_id"],)).fetchone()[0]
        cmts = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE channel_id=?", (ch["channel_id"],)).fetchone()[0]
        yt["channels"].append({"name":ch["name"],"id":ch["channel_id"],"videos":vids,"comments":cmts,"subs":ch["subscribers"]})
    yt["top_commenters"] = [{"name":r[0],"count":r[1]} for r in conn.execute("SELECT author_name,COUNT(*) as c FROM yt_comments GROUP BY author_name ORDER BY c DESC LIMIT 10")]
    yt["top_videos"] = [{"title":r["title"][:50],"id":r["video_id"],"comments":conn.execute("SELECT COUNT(*) FROM yt_comments WHERE video_id=?", (r["video_id"],)).fetchone()[0],"views":r["view_count"]} for r in conn.execute("SELECT * FROM yt_videos ORDER BY comment_count DESC LIMIT 10")]
    stats["datasets"]["youtube"] = yt

    # Articles
    a = {"name":"Articles","icon":"📰","tables":{}}
    a["tables"]["articles"] = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    a["tables"]["images"] = conn.execute("SELECT COUNT(*) FROM article_images").fetchone()[0]
    a["total"] = sum(a["tables"].values())
    a["with_text"] = conn.execute("SELECT COUNT(*) FROM articles WHERE word_count>0").fetchone()[0]
    a["total_words"] = conn.execute("SELECT COALESCE(SUM(word_count),0) FROM articles").fetchone()[0]
    a["by_topic"] = [{"topic":r[0],"count":r[1]} for r in conn.execute("SELECT topic,COUNT(*) FROM articles GROUP BY topic ORDER BY COUNT(*) DESC LIMIT 10")]
    a["by_source"] = [{"source":r[0],"count":r[1]} for r in conn.execute("SELECT source,COUNT(*) FROM articles WHERE source!='' GROUP BY source ORDER BY COUNT(*) DESC LIMIT 10")]
    stats["datasets"]["articles"] = a

    # Tweets
    tw = {"name":"Tweets","icon":"🐦","tables":{}}
    tw["tables"]["accounts"] = conn.execute("SELECT COUNT(*) FROM tweet_accounts").fetchone()[0]
    tw["tables"]["tweets"] = conn.execute("SELECT COUNT(*) FROM tweets").fetchone()[0]
    tw["total"] = sum(tw["tables"].values())
    tw["accounts"] = [{"username":r[0],"tweets":conn.execute("SELECT COUNT(*) FROM tweets WHERE username=?", (r[0],)).fetchone()[0]} for r in conn.execute("SELECT username FROM tweet_accounts")]
    stats["datasets"]["tweets"] = tw
    # Facebook placeholder
    stats["datasets"]["facebook"] = {"name":"Facebook","icon":"📘","tables":{"posts":0},"total":0,"status":"Coming soon"}

    # Media
    md = {"name":"Media","icon":"🎬","tables":{}}
    md["tables"]["movies"] = conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0]
    md["tables"]["books"] = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    md["total"] = sum(md["tables"].values())
    md["avg_movie_rating"] = conn.execute("SELECT ROUND(AVG(rating),1) FROM movies WHERE rating IS NOT NULL").fetchone()[0]
    md["top_directors"] = [{"name":r[0],"count":r[1]} for r in conn.execute("SELECT director,COUNT(*) as c FROM movies WHERE director IS NOT NULL AND director!='' GROUP BY director ORDER BY c DESC LIMIT 10")]
    stats["datasets"]["media"] = md

    # Log + totals
    stats["collection_log"] = [dict(r) for r in conn.execute("SELECT * FROM collection_log ORDER BY run_at DESC LIMIT 20")]
    stats["total_records"] = sum(d["total"] for d in stats["datasets"].values())
    stats["db_size_mb"] = round(os.path.getsize(os.path.join(os.path.dirname(__file__),'..','db','thunt-data-labs.db'))/(1024*1024),2)
    conn.close()

    out = os.path.join(os.path.dirname(__file__), '..', 'web', 'stats.json')
    with open(out,"w") as f: json.dump(stats, f, indent=2, default=str)
    print(f"  ✅ stats.json: {stats['total_records']:,} records, {stats['db_size_mb']}MB")
    return stats["total_records"]

# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="THunt Data Labs — Collect All")
    parser.add_argument("--curio", action="store_true", help="Curio data only")
    parser.add_argument("--youtube", action="store_true", help="YouTube only")
    parser.add_argument("--articles", action="store_true", help="Articles only")
    parser.add_argument("--tweets", action="store_true", help="Tweets only")
    parser.add_argument("--export", action="store_true", help="Export stats only")
    parser.add_argument("--status", action="store_true", help="Show DB stats")
    args = parser.parse_args()

    init_db()
    run_all = not any([args.curio,args.youtube,args.articles,args.tweets,args.export,args.status])

    if args.status:
        s = get_stats()
        print("\nTHunt Data Labs — Database Status")
        print("=" * 40)
        total = 0
        for t,c in s.items():
            if c > 0: print(f"  {t:20s} {c:>8,}"); total += c
        print(f"  {'TOTAL':20s} {total:>8,}")
        return

    print("=" * 50)
    print(f"  THunt Data Labs — Collect All — {TODAY}")
    print("=" * 50)
    results = {}
    if run_all or args.curio:    results["curio"] = collect_curio()
    if run_all or args.youtube:  results["youtube"] = collect_youtube()
    if run_all or args.articles: results["articles"] = collect_articles()
    if run_all or args.articles: results["article_content"] = fetch_article_content()
    if run_all or args.tweets:   results["tweets"] = collect_tweets()

    # Media import (Letterboxd + Goodreads)
    if run_all:
        try:
            from collect_media import run_all as import_media
            results["media"] = import_media()
        except Exception as e:
            print(f"  ⚠️ Media import: {e}")
    export_stats()  # always regenerate dashboard

    # Phase 2: Export to all display app JSON files
    try:
        from export_all import run_all as export_all
        export_all()
    except Exception as e:
        print(f"  ⚠️ Export failed: {e}")

    # Phase 2b: Export to Curio Archive, Atlas, Hub, Wiki, Oracle
    try:
        from export_apps import run_all as export_apps
        export_apps()
    except Exception as e:
        print(f"  ⚠️ App export failed: {e}")

    print("\n" + "=" * 50)
    total = sum(v for v in results.values())
    print(f"  DONE: {total:,} records collected")
    for k,v in results.items(): print(f"    {k}: {v:,}")
    print("=" * 50)

    # Telegram summary
    msg = f"🔬 Data Labs — {TODAY}\n"
    for k,v in results.items(): msg += f"  {k}: {v:,}\n"
    msg += f"Total: {total:,}"
    try:
        import urllib.request, urllib.parse
        data = urllib.parse.urlencode({"chat_id":CHAT,"text":msg}).encode()
        urllib.request.urlopen(f"https://api.telegram.org/bot{BOT}/sendMessage", data, timeout=10)
    except: pass

if __name__ == "__main__":
    main()
