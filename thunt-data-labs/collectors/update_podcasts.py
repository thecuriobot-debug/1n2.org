#!/usr/bin/env python3.12
"""
WCN + TBG Podcast Updater
Checks YouTube for new episodes, updates data.json for both
"""
import os, json, requests, sqlite3
from datetime import datetime, date
from pathlib import Path

KEY      = os.environ.get("YOUTUBE_API_KEY","AIzaSyCr7_c99ha2Z0SeJDqC31OlM1WOuK4iy_w")
BASE     = "https://www.googleapis.com/youtube/v3"
TODAY    = date.today().isoformat()

WCN_CHANNELS = {
    "UCR9gdpWisRwnk_k23GsHfcA": "World Crypto Network",
    "UCp7Gqpl9Kqiggr_Rs03X5pA": "WCN Old",
}
TBG_CHANNEL = "UCQgjyXLLMtG99Dkh8Yvw-3g"  # MadBitcoins / The Bitcoin Group

WCN_DIR  = Path("/Users/curiobot/Sites/1n2.org/wcn-podcast")
TBG_DIR  = Path("/Users/curiobot/Sites/1n2.org/tbg-mirrors")

def yt(endpoint, params):
    params["key"] = KEY
    r = requests.get(f"{BASE}/{endpoint}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def get_recent_videos(channel_id, max_results=10):
    """Get most recent videos for a channel"""
    try:
        # Get uploads playlist
        ch = yt("channels", {"id": channel_id, "part": "contentDetails,statistics"})
        if not ch.get("items"): return [], {}
        uploads = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        stats   = ch["items"][0]["statistics"]

        # Get recent playlist items
        pl = yt("playlistItems", {"playlistId": uploads, "part": "snippet", "maxResults": max_results})
        ids = [i["snippet"]["resourceId"]["videoId"] for i in pl.get("items",[])]
        if not ids: return [], stats

        # Get full video data
        vd = yt("videos", {"id": ",".join(ids), "part": "snippet,statistics,contentDetails"})
        videos = []
        for v in vd.get("items",[]):
            videos.append({
                "id":        v["id"],
                "title":     v["snippet"]["title"],
                "published": v["snippet"]["publishedAt"][:10],
                "views":     int(v["statistics"].get("viewCount",0)),
                "thumbnail": v["snippet"].get("thumbnails",{}).get("medium",{}).get("url",""),
                "url":       f"https://www.youtube.com/watch?v={v['id']}",
                "duration":  v.get("contentDetails",{}).get("duration",""),
            })
        return videos, stats
    except Exception as e:
        print(f"  ⚠️  {channel_id}: {e}")
        return [], {}

def update_wcn():
    print(f"\n📻 WCN Update — {TODAY}")
    # Load existing
    wcn_file = WCN_DIR / "data.json"
    data = {}
    if wcn_file.exists():
        try: data = json.loads(wcn_file.read_text())
        except: pass

    existing_eps = data.get("episodes", [])
    existing_ids = {e["id"] for e in existing_eps}
    new_count = 0

    for ch_id, ch_name in WCN_CHANNELS.items():
        videos, stats = get_recent_videos(ch_id, max_results=20)
        for v in videos:
            if v["id"] not in existing_ids:
                existing_eps.insert(0, v)
                existing_ids.add(v["id"])
                new_count += 1

    # Sort by date
    existing_eps.sort(key=lambda x: x.get("published",""), reverse=True)

    data["episodes"]     = existing_eps
    data["total"]        = len(existing_eps)
    data["last_updated"] = TODAY
    data["shows"] = data.get("shows", [{"name": "World Crypto Network", "channel_id": "UCR9gdpWisRwnk_k23GsHfcA"}])
    wcn_file.write_text(json.dumps(data, indent=2))
    print(f"  ✅ WCN: {new_count} new, {len(existing_eps)} total")

def update_tbg():
    print(f"\n📺 TBG Mirrors Update — {TODAY}")
    tbg_file = TBG_DIR / "data.json"
    data = {}
    if tbg_file.exists():
        try: data = json.loads(tbg_file.read_text())
        except: pass

    existing_eps = data.get("episodes", [])
    existing_ids = {e.get("id","") for e in existing_eps}
    new_count = 0

    videos, stats = get_recent_videos(TBG_CHANNEL, max_results=20)
    for v in videos:
        if v["id"] not in existing_ids:
            existing_eps.insert(0, v)
            existing_ids.add(v["id"])
            new_count += 1

    existing_eps.sort(key=lambda x: x.get("published",""), reverse=True)

    data["episodes"]     = existing_eps
    data["last_updated"] = TODAY
    # Update stats if available
    if stats:
        data["stats"] = {
            "subscribers": int(stats.get("subscriberCount",0)),
            "total_views": int(stats.get("viewCount",0)),
            "video_count": int(stats.get("videoCount",0)),
            "last_updated": TODAY
        }
    tbg_file.write_text(json.dumps(data, indent=2))
    print(f"  ✅ TBG: {new_count} new, {len(existing_eps)} total")

if __name__ == "__main__":
    update_wcn()
    update_tbg()
