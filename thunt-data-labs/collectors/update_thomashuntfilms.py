#!/usr/bin/env python3.12
"""
ThomasHuntFilms Daily Updater
Checks YouTube API for new videos, updates videos.json, regenerates site
"""
import sys, os, json, requests
from datetime import datetime
from pathlib import Path

KEY      = os.environ.get("YOUTUBE_API_KEY","AIzaSyCr7_c99ha2Z0SeJDqC31OlM1WOuK4iy_w")
THF_ID   = "UCyWXUSxzJ5vVcH2-WjQdeOA"
THF_DIR  = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")
BASE     = "https://www.googleapis.com/youtube/v3"

def yt(endpoint, params):
    params["key"] = KEY
    r = requests.get(f"{BASE}/{endpoint}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def fmt_num(n):
    n = int(n)
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000:     return f"{n/1_000:.1f}K"
    return str(n)

def update_thomashuntfilms():
    print(f"\n🎬 ThomasHuntFilms Update — {datetime.now().strftime('%Y-%m-%d')}")

    # Load existing data
    vid_file = THF_DIR / "videos.json"
    videos = json.loads(vid_file.read_text()) if vid_file.exists() else []
    existing_ids = {v["id"] for v in videos}

    # Get channel stats
    ch = yt("channels", {"id": THF_ID, "part": "statistics,snippet"})
    ch_stats = ch["items"][0]["statistics"]
    subs   = int(ch_stats.get("subscriberCount", 0))
    total_views = int(ch_stats.get("viewCount", 0))
    vid_count   = int(ch_stats.get("videoCount", 0))
    print(f"  Channel: {fmt_num(subs)} subs, {fmt_num(total_views)} views, {vid_count} videos")

    # Get uploads playlist
    uploads = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"] if "contentDetails" in ch["items"][0] else None
    if not uploads:
        ch2 = yt("channels", {"id": THF_ID, "part": "contentDetails"})
        uploads = ch2["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    # Fetch all playlist items
    playlist_items = []
    page_token = None
    while True:
        params = {"playlistId": uploads, "part": "snippet", "maxResults": 50}
        if page_token: params["pageToken"] = page_token
        data = yt("playlistItems", params)
        playlist_items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token: break

    new_ids = [i["snippet"]["resourceId"]["videoId"] for i in playlist_items
               if i["snippet"]["resourceId"]["videoId"] not in existing_ids]
    print(f"  Found {len(new_ids)} new video IDs")

    # Fetch stats for new videos in batches of 50
    new_videos = []
    for i in range(0, len(new_ids), 50):
        batch = new_ids[i:i+50]
        vdata = yt("videos", {"id": ",".join(batch), "part": "snippet,statistics,contentDetails"})
        for v in vdata.get("items", []):
            s = v["statistics"]
            sn = v["snippet"]
            new_videos.append({
                "id":          v["id"],
                "title":       sn["title"],
                "description": sn.get("description","")[:500],
                "published":   sn["publishedAt"][:10],
                "thumbnail":   sn.get("thumbnails",{}).get("high",{}).get("url",""),
                "views":       int(s.get("viewCount",0)),
                "likes":       int(s.get("likeCount",0)),
                "comments":    int(s.get("commentCount",0)),
                "duration":    v.get("contentDetails",{}).get("duration",""),
                "url":         f"https://www.youtube.com/watch?v={v['id']}",
            })

    if new_videos:
        videos = new_videos + videos  # newest first
        vid_file.write_text(json.dumps(videos, indent=2))
        print(f"  ✅ Added {len(new_videos)} new videos")
    else:
        print(f"  ℹ️  No new videos")

    # Update existing video stats (views, likes, comments) for top 20
    print("  Refreshing stats for recent videos...")
    recent_ids = [v["id"] for v in videos[:20]]
    for i in range(0, len(recent_ids), 50):
        batch = recent_ids[i:i+50]
        vdata = yt("videos", {"id": ",".join(batch), "part": "statistics"})
        stats_map = {v["id"]: v["statistics"] for v in vdata.get("items",[])}
        for vid in videos:
            if vid["id"] in stats_map:
                s = stats_map[vid["id"]]
                vid["views"]    = int(s.get("viewCount",0))
                vid["likes"]    = int(s.get("likeCount",0))
                vid["comments"] = int(s.get("commentCount",0))

    # Save updated data
    vid_file.write_text(json.dumps(videos, indent=2))

    # Update channel summary
    summary = {
        "channel_id":   THF_ID,
        "subscribers":  subs,
        "total_views":  total_views,
        "video_count":  len(videos),
        "last_updated": datetime.now().isoformat(),
        "total_views_formatted": fmt_num(total_views),
        "subscribers_formatted": fmt_num(subs),
    }
    (THF_DIR / "channel.json").write_text(json.dumps(summary, indent=2))

    # Regenerate site
    gen = THF_DIR / "generate_site.py"
    if gen.exists():
        import subprocess
        result = subprocess.run(["python3.12", str(gen)], capture_output=True, text=True, cwd=str(THF_DIR))
        if result.returncode == 0:
            print("  ✅ Site regenerated")
        else:
            print(f"  ⚠️  Site gen: {result.stderr[:100]}")

    print(f"  📊 Total: {len(videos)} videos, {fmt_num(total_views)} views")
    return len(new_videos)

if __name__ == "__main__":
    update_thomashuntfilms()
