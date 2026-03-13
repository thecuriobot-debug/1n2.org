#!/usr/bin/env python3.12
"""
THunt Data Labs — WCN Full Gather (Phase 4)
Background job that gathers ALL videos + comments for World Crypto Network.
Designed to run across multiple days due to YouTube API 10K daily quota.
Saves progress — safe to interrupt and resume.

Usage:
    python3.12 gather_wcn.py              # Gather videos + comments
    python3.12 gather_wcn.py --videos     # Videos only
    python3.12 gather_wcn.py --comments   # Comments only
    python3.12 gather_wcn.py --status     # Show progress
"""
import sys, os, json, time, requests, argparse
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'db'))
from database import get_conn, init_db, log_collection

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except: pass

KEY = os.environ.get("YOUTUBE_API_KEY", "AIzaSyCr7_c99ha2Z0SeJDqC31OlM1WOuK4iy_w")
WCN_ID = "UCR9gdpWisRwnk_k23GsHfcA"

def yt(endpoint, params):
    params["key"] = KEY
    r = requests.get(f"https://www.googleapis.com/youtube/v3/{endpoint}", params=params, timeout=15)
    if r.status_code == 403:
        print("⚠️  QUOTA EXCEEDED — resume tomorrow")
        return None
    if r.status_code != 200:
        print(f"⚠️  API error {r.status_code}")
        return None
    return r.json()

def gather_videos():
    """Gather ALL WCN videos. Pages through entire uploads playlist."""
    print(f"\n📺 WCN VIDEO GATHER — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    conn = get_conn(); init_db(); start = time.time()
    
    # Ensure channel exists
    d = yt("channels", {"id":WCN_ID, "part":"snippet,statistics,contentDetails"})
    if not d or not d.get("items"):
        print("  ❌ Could not fetch WCN channel"); return
    item = d["items"][0]; stats = item.get("statistics",{})
    conn.execute("""INSERT OR REPLACE INTO yt_channels (channel_id,name,url,subscribers,video_count,thumbnail,last_scraped)
        VALUES (?,?,?,?,?,?,datetime('now'))""",
        (WCN_ID, "World Crypto Network", f"https://youtube.com/channel/{WCN_ID}",
         int(stats.get("subscriberCount",0)), int(stats.get("videoCount",0)),
         item.get("snippet",{}).get("thumbnails",{}).get("default",{}).get("url","")))
    
    uploads = item["contentDetails"]["relatedPlaylists"]["uploads"]
    total_expected = int(stats.get("videoCount",0))
    existing = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (WCN_ID,)).fetchone()[0]
    print(f"  Expected: {total_expected} | Already have: {existing}")
    if existing >= total_expected:
        print("  Already up to date"); conn.close(); return
    
    # Page through ALL uploads
    vid_ids = []; next_page = None; page = 0
    while True:
        page += 1
        params = {"playlistId":uploads,"part":"snippet","maxResults":50}
        if next_page: params["pageToken"] = next_page
        d = yt("playlistItems", params)
        if not d: break  # quota hit
        for item in d.get("items",[]):
            vid = item["snippet"]["resourceId"].get("videoId")
            if vid: vid_ids.append(vid)
        print(f"  Page {page}: {len(d.get('items',[]))} items (total: {len(vid_ids)})")
        next_page = d.get("nextPageToken")
        if not next_page: break
        time.sleep(0.1)
    
    # Fetch details in batches of 50
    added = 0
    for i in range(0, len(vid_ids), 50):
        batch = vid_ids[i:i+50]
        d = yt("videos", {"id":",".join(batch), "part":"snippet,statistics"})
        if not d: break  # quota hit
        for v in d.get("items",[]):
            vs = v.get("statistics",{}); sn = v.get("snippet",{})
            conn.execute("""INSERT OR REPLACE INTO yt_videos
                (video_id,channel_id,title,description,published_at,view_count,like_count,comment_count,thumbnail,last_scraped)
                VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))""",
                (v["id"],WCN_ID,sn.get("title",""),sn.get("description","")[:500],
                 sn.get("publishedAt",""),int(vs.get("viewCount",0)),int(vs.get("likeCount",0)),
                 int(vs.get("commentCount",0)),sn.get("thumbnails",{}).get("medium",{}).get("url","")))
            added += 1
        print(f"  Details batch {i//50+1}: {len(d.get('items',[]))} videos")
    
    conn.commit()
    dur = time.time()-start
    log_collection("wcn_videos","gather",added,0,dur)
    total = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (WCN_ID,)).fetchone()[0]
    print(f"  ✅ {added} new videos ({total} total WCN) in {dur:.1f}s")
    conn.close()
    return added

def gather_comments():
    """Gather comments for WCN videos that don't have them yet."""
    print(f"\n💬 WCN COMMENT GATHER — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    conn = get_conn(); start = time.time(); total_added = 0
    
    # Get videos with comments that we haven't scraped yet
    videos = conn.execute("""SELECT v.video_id, v.title, v.comment_count,
        (SELECT COUNT(*) FROM yt_comments WHERE video_id=v.video_id) as have
        FROM yt_videos v WHERE v.channel_id=? AND v.comment_count>0
        ORDER BY v.comment_count DESC""", (WCN_ID,)).fetchall()
    
    need = [(v["video_id"],v["title"],v["comment_count"],v["have"]) for v in videos if v["have"] < v["comment_count"]]
    print(f"  {len(need)} videos need comments ({sum(v[2] for v in need):,} expected)")
    
    for i, (vid, title, expected, have) in enumerate(need):
        print(f"  [{i+1}/{len(need)}] {title[:45]}... ({expected} expected, {have} have)")
        next_page = None; vc = 0
        while True:
            params = {"videoId":vid,"part":"snippet,replies","maxResults":100,"textFormat":"plainText","order":"time"}
            if next_page: params["pageToken"] = next_page
            d = yt("commentThreads", params)
            if not d: 
                print("  ⚠️  Quota hit — stopping. Resume tomorrow.")
                conn.commit()
                log_collection("wcn_comments","gather",total_added,0,time.time()-start)
                conn.close()
                return total_added
            
            for t in d.get("items",[]):
                tc = t["snippet"]["topLevelComment"]["snippet"]
                aid = tc.get("authorChannelId",{}).get("value","anon")
                conn.execute("""INSERT OR IGNORE INTO yt_comments
                    (comment_id,video_id,channel_id,author_name,author_id,author_avatar,text_content,like_count,published_at,is_reply)
                    VALUES (?,?,?,?,?,?,?,?,?,0)""",
                    (t["snippet"]["topLevelComment"]["id"],vid,WCN_ID,
                     tc.get("authorDisplayName",""),aid,tc.get("authorProfileImageUrl",""),
                     tc.get("textOriginal",""),int(tc.get("likeCount",0)),tc.get("publishedAt","")))
                vc += 1
                # Also get replies
                for r in t.get("replies",{}).get("comments",[]):
                    rc = r["snippet"]
                    conn.execute("""INSERT OR IGNORE INTO yt_comments
                        (comment_id,video_id,channel_id,author_name,author_id,author_avatar,text_content,like_count,published_at,parent_id,is_reply)
                        VALUES (?,?,?,?,?,?,?,?,?,?,1)""",
                        (r["id"],vid,WCN_ID,
                         rc.get("authorDisplayName",""),rc.get("authorChannelId",{}).get("value","anon"),
                         rc.get("authorProfileImageUrl",""),rc.get("textOriginal",""),
                         int(rc.get("likeCount",0)),rc.get("publishedAt",""),
                         t["snippet"]["topLevelComment"]["id"]))
                    vc += 1
            
            next_page = d.get("nextPageToken")
            if not next_page: break
            time.sleep(0.1)
        
        total_added += vc; conn.commit()
        print(f"    → {vc} comments")
    
    dur = time.time()-start
    log_collection("wcn_comments","gather",total_added,0,dur)
    total = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE channel_id=?", (WCN_ID,)).fetchone()[0]
    print(f"  ✅ {total_added} new comments ({total} total WCN) in {dur:.1f}s")
    conn.close()
    return total_added

def show_status():
    conn = get_conn()
    vids = conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (WCN_ID,)).fetchone()[0]
    cmts = conn.execute("SELECT COUNT(*) FROM yt_comments WHERE channel_id=?", (WCN_ID,)).fetchone()[0]
    need_cmts = conn.execute("""SELECT COUNT(*) FROM yt_videos WHERE channel_id=? AND comment_count>0 
        AND video_id NOT IN (SELECT DISTINCT video_id FROM yt_comments WHERE channel_id=?)""", (WCN_ID,WCN_ID)).fetchone()[0]
    total_expected = conn.execute("SELECT COALESCE(SUM(comment_count),0) FROM yt_videos WHERE channel_id=?", (WCN_ID,)).fetchone()[0]
    ch = conn.execute("SELECT * FROM yt_channels WHERE channel_id=?", (WCN_ID,)).fetchone()
    conn.close()
    print(f"\n📊 WCN GATHER STATUS")
    print(f"  Channel: {ch['name'] if ch else 'Not found'}")
    print(f"  Videos: {vids} / {ch['video_count'] if ch else '?'}")
    print(f"  Comments: {cmts} / ~{total_expected}")
    print(f"  Videos needing comments: {need_cmts}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--videos", action="store_true")
    parser.add_argument("--comments", action="store_true")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args()
    init_db()
    if args.status: show_status()
    elif args.videos: gather_videos()
    elif args.comments: gather_comments()
    else: gather_videos(); gather_comments()
