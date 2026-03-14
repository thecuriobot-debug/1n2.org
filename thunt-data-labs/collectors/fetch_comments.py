#!/usr/bin/env python3.12
"""
Comment Fetcher for All My YouTube Channels
Adds missing channels to Data Labs, fetches videos + comments via YouTube API.
Updates Commentzor data.json after.
"""
import sqlite3, json, os, sys, urllib.request, urllib.parse, time

DB = '/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db'
YOUTUBE_KEY = os.environ.get("YOUTUBE_API_KEY", "AIzaSyCr7_c99ha2Z0SeJDqC31OlM1WOuK4iy_w")

# All channels from My YouTube (including new ones not yet in Data Labs)
MY_CHANNELS = {
    'UCQgjyXLLMtG99Dkh8Yvw-3g': 'MadBitcoins',
    'UCyWXUSxzJ5vVcH2-WjQdeOA': 'Thomas Hunt Films',
    'UCp7Gqpl9Kqiggr_Rs03X5pA': 'World Crypto Network (old)',
    'UCR9gdpWisRwnk_k23GsHfcA': 'World Crypto Network',
    'UC4vqoYkvid3wm9Equ7ClwPw': 'IG-88 / MC Fanb0y (STOLEN)',
    'UCo6p8YD65JejkRSKBMRnr8A': 'bbctruth',
    'UC87XIolsog_ySkpvKhuPnXQ': 'thezeronewz',
    'UCPpcUOJeThhpPWLrcGuOo-A': 'Thomas Hunt (Personal)',
    'UCKt8s7Mg60Q41rs-xNWwf3A': 'The Bitcoin Group (Original)',
}

def yt_api(endpoint, params):
    params['key'] = YOUTUBE_KEY
    url = f"https://www.googleapis.com/youtube/v3/{endpoint}?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  API error: {e}")
        return None

def ensure_channel(conn, ch_id, name):
    """Add channel to DB if not exists"""
    existing = conn.execute("SELECT channel_id FROM yt_channels WHERE channel_id=?", (ch_id,)).fetchone()
    if existing:
        return
    print(f"\n  Adding new channel: {name} ({ch_id})")
    data = yt_api("channels", {"id": ch_id, "part": "snippet,statistics"})
    if not data or not data.get("items"):
        conn.execute("INSERT OR IGNORE INTO yt_channels (channel_id,name,url,subscribers,video_count,thumbnail,last_scraped) VALUES (?,?,?,0,0,'',datetime('now'))",
            (ch_id, name, f"https://youtube.com/channel/{ch_id}"))
        return
    ch = data["items"][0]
    sn, st = ch.get("snippet",{}), ch.get("statistics",{})
    conn.execute("INSERT OR REPLACE INTO yt_channels (channel_id,name,url,subscribers,video_count,thumbnail,last_scraped) VALUES (?,?,?,?,?,?,datetime('now'))",
        (ch_id, name, f"https://youtube.com/channel/{ch_id}",
         int(st.get("subscriberCount",0)), int(st.get("videoCount",0)),
         sn.get("thumbnails",{}).get("default",{}).get("url","")))
    print(f"    Added: {name} ({st.get('subscriberCount',0)} subs, {st.get('videoCount',0)} videos)")

def fetch_videos(conn, ch_id, name):
    """Fetch all videos for a channel"""
    existing_count = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (ch_id,)).fetchone()[0]
    print(f"\n  Fetching videos for {name} (existing: {existing_count})...")
    
    page_token = None
    added = 0
    while True:
        params = {"channelId": ch_id, "part": "snippet", "maxResults": 50, "order": "date", "type": "video"}
        if page_token:
            params["pageToken"] = page_token
        data = yt_api("search", params)
        if not data or not data.get("items"):
            break
        
        video_ids = [item["id"]["videoId"] for item in data["items"] if item.get("id",{}).get("videoId")]
        if not video_ids:
            break
            
        # Get full video details
        vdata = yt_api("videos", {"id": ",".join(video_ids), "part": "snippet,statistics"})
        if vdata and vdata.get("items"):
            for v in vdata["items"]:
                vid = v["id"]
                sn, st = v.get("snippet",{}), v.get("statistics",{})
                conn.execute("""INSERT OR REPLACE INTO yt_videos 
                    (video_id,channel_id,title,description,published_at,view_count,like_count,comment_count,thumbnail,last_scraped)
                    VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))""",
                    (vid, ch_id, sn.get("title",""), sn.get("description","")[:500],
                     sn.get("publishedAt",""), int(st.get("viewCount",0)),
                     int(st.get("likeCount",0)), int(st.get("commentCount",0)),
                     sn.get("thumbnails",{}).get("medium",{}).get("url","")))
                added += 1
        
        page_token = data.get("nextPageToken")
        if not page_token:
            break
        time.sleep(0.5)
    
    print(f"    {added} videos processed")
    return added

def fetch_comments(conn, ch_id, name, limit=50):
    """Fetch comments for recent videos"""
    recent = conn.execute("""SELECT video_id, title, comment_count FROM yt_videos 
        WHERE channel_id=? AND comment_count>0 ORDER BY published_at DESC LIMIT ?""", (ch_id, limit)).fetchall()
    
    total_new = 0
    for rv in recent:
        vid = rv[0]
        existing = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE video_id=?", (vid,)).fetchone()[0]
        if existing >= rv[2]:
            continue
        
        data = yt_api("commentThreads", {"videoId": vid, "part": "snippet", "maxResults": 100, "textFormat": "plainText"})
        if not data or not data.get("items"):
            continue
        
        cc = 0
        for item in data["items"]:
            c = item["snippet"]["topLevelComment"]["snippet"]
            conn.execute("""INSERT OR IGNORE INTO yt_comments
                (comment_id,video_id,channel_id,author_name,author_id,author_avatar,text_content,like_count,published_at,is_reply,scraped_at)
                VALUES (?,?,?,?,?,?,?,?,?,0,datetime('now'))""",
                (item["id"], vid, ch_id, c.get("authorDisplayName",""),
                 c.get("authorChannelId",{}).get("value",""), c.get("authorProfileImageUrl",""),
                 c.get("textDisplay",""), c.get("likeCount",0), c.get("publishedAt","")))
            cc += 1
        if cc:
            total_new += cc
        time.sleep(0.3)
    
    return total_new

def update_commentzor():
    """Rebuild Commentzor data.json"""
    print("\n=== Updating Commentzor ===")
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    
    data = {'channels': [], 'top_commenters': [], 'top_liked': [], 'by_channel': {}, 'recent': [], 'total': 0}
    for ch in conn.execute("SELECT * FROM yt_channels"):
        d = dict(ch)
        d['comment_count'] = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE channel_id=?", (ch['channel_id'],)).fetchone()[0]
        d['video_count_with_comments'] = conn.execute("SELECT COUNT(DISTINCT video_id) FROM yt_comments WHERE channel_id=?", (ch['channel_id'],)).fetchone()[0]
        data['channels'].append(d)
    
    data['total'] = conn.execute("SELECT COUNT(*) FROM yt_comments").fetchone()[0]
    for r in conn.execute("SELECT author_name, author_avatar, COUNT(*) as c, SUM(like_count) as likes FROM yt_comments GROUP BY author_name ORDER BY c DESC LIMIT 25"):
        data['top_commenters'].append(dict(r))
    for r in conn.execute("SELECT author_name, text_content, like_count, channel_id, video_id FROM yt_comments WHERE like_count > 0 ORDER BY like_count DESC LIMIT 20"):
        data['top_liked'].append(dict(r))
    
    for ch in data['channels']:
        cid = ch['channel_id']
        ch_data = {'top_commenters': [], 'recent': [], 'comment_count': ch['comment_count']}
        for r in conn.execute("SELECT author_name, COUNT(*) as c, SUM(like_count) as likes FROM yt_comments WHERE channel_id=? GROUP BY author_name ORDER BY c DESC LIMIT 15", (cid,)):
            ch_data['top_commenters'].append(dict(r))
        for r in conn.execute("SELECT author_name, text_content, like_count, video_id, published_at FROM yt_comments WHERE channel_id=? ORDER BY scraped_at DESC LIMIT 10", (cid,)):
            ch_data['recent'].append(dict(r))
        data['by_channel'][cid] = ch_data
    
    for r in conn.execute("SELECT author_name, text_content, like_count, channel_id, video_id FROM yt_comments ORDER BY scraped_at DESC LIMIT 20"):
        data['recent'].append(dict(r))
    
    with open('/Users/curiobot/Sites/1n2.org/commentzor/data.json', 'w') as f:
        json.dump(data, f)
    print(f"  Commentzor updated: {data['total']:,} comments")
    conn.close()

def main():
    print("=" * 60)
    print("  YouTube Comment Fetcher — All My Channels")
    print("=" * 60)
    
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    
    # 1. Ensure all channels exist
    print("\n=== Ensuring all channels in DB ===")
    for ch_id, name in MY_CHANNELS.items():
        ensure_channel(conn, ch_id, name)
    conn.commit()
    
    # 2. Fetch videos for new channels (ones with 0 videos)
    print("\n=== Fetching videos for channels ===")
    for ch_id, name in MY_CHANNELS.items():
        vid_count = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (ch_id,)).fetchone()[0]
        if vid_count == 0:
            try:
                fetch_videos(conn, ch_id, name)
                conn.commit()
            except Exception as e:
                print(f"    Error fetching videos for {name}: {e}")
    
    # 3. Fetch comments for ALL channels
    print("\n=== Fetching comments ===")
    total_new = 0
    for ch_id, name in MY_CHANNELS.items():
        print(f"\n  {name}...")
        try:
            new = fetch_comments(conn, ch_id, name)
            total_new += new
            if new:
                print(f"    +{new} new comments")
            else:
                print(f"    Up to date")
            conn.commit()
        except Exception as e:
            print(f"    Error: {e}")
    
    # 4. Summary
    print("\n" + "=" * 60)
    print(f"  Total new comments: {total_new}")
    total = conn.execute("SELECT COUNT(*) FROM yt_comments").fetchone()[0]
    print(f"  Total comments in DB: {total:,}")
    for ch_id, name in MY_CHANNELS.items():
        c = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE channel_id=?", (ch_id,)).fetchone()[0]
        v = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (ch_id,)).fetchone()[0]
        if c > 0 or v > 0:
            print(f"    {name}: {v} videos, {c:,} comments")
    print("=" * 60)
    conn.close()
    
    # 5. Update Commentzor
    update_commentzor()
    print("\nDone!")

if __name__ == "__main__":
    main()
