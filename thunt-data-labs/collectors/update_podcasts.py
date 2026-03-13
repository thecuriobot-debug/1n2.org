#!/usr/bin/env python3.12
"""
WCN + TBG Podcast Updater
Checks YouTube for new episodes, updates data.json for both.
Handles existing data structures in wcn-podcast/data.json and tbg-mirrors/data.json.
"""
import os, json, requests
from datetime import datetime, date
from pathlib import Path

KEY   = os.environ.get("YOUTUBE_API_KEY","AIzaSyCr7_c99ha2Z0SeJDqC31OlM1WOuK4iy_w")
BASE  = "https://www.googleapis.com/youtube/v3"
TODAY = date.today().isoformat()

WCN_CHANNELS = {
    "UCR9gdpWisRwnk_k23GsHfcA": "World Crypto Network",
    # UCp7Gqpl9Kqiggr_Rs03X5pA removed — channel 404'd
}
TBG_CHANNEL = "UCQgjyXLLMtG99Dkh8Yvw-3g"  # MadBitcoins

WCN_DIR = Path("/Users/curiobot/Sites/1n2.org/wcn-podcast")
TBG_DIR = Path("/Users/curiobot/Sites/1n2.org/tbg-mirrors")

def yt(endpoint, params):
    params["key"] = KEY
    r = requests.get(f"{BASE}/{endpoint}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def get_recent_videos(channel_id, max_results=15):
    try:
        ch = yt("channels", {"id": channel_id, "part": "contentDetails,statistics"})
        if not ch.get("items"): return [], {}
        uploads = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        stats   = ch["items"][0]["statistics"]
        pl = yt("playlistItems", {"playlistId": uploads, "part": "snippet", "maxResults": max_results})
        ids = [i["snippet"]["resourceId"]["videoId"] for i in pl.get("items",[])]
        if not ids: return [], stats
        vd = yt("videos", {"id": ",".join(ids), "part": "snippet,statistics"})
        videos = []
        for v in vd.get("items",[]):
            videos.append({
                "id":        v["id"],
                "title":     v["snippet"]["title"],
                "published": v["snippet"]["publishedAt"][:10],
                "views":     int(v["statistics"].get("viewCount",0)),
                "thumbnail": v["snippet"].get("thumbnails",{}).get("medium",{}).get("url",""),
                "url":       f"https://www.youtube.com/watch?v={v['id']}",
            })
        return videos, stats
    except Exception as e:
        print(f"  ⚠️  {channel_id}: {e}")
        return [], {}

def update_wcn():
    print(f"\n📻 WCN Update — {TODAY}")
    wcn_file = WCN_DIR / "data.json"
    data = {}
    if wcn_file.exists():
        try: data = json.loads(wcn_file.read_text())
        except: pass

    # WCN has its own structure — just update 'last_updated' and append new_episodes
    # Preserve existing episodes list unchanged, add new ones at top
    existing_eps = data.get("episodes", [])
    # Build set of existing YT video IDs from the yt field (which can be dict or str)
    existing_yt_ids = set()
    for e in existing_eps:
        yt_field = e.get("yt", {})
        if isinstance(yt_field, str):
            existing_yt_ids.add(yt_field)
        elif isinstance(yt_field, dict):
            for ch_data in yt_field.values():
                if isinstance(ch_data, dict):
                    vid = ch_data.get("vid","")
                    if vid: existing_yt_ids.add(vid)

    new_count = 0
    new_videos = []
    for ch_id, ch_name in WCN_CHANNELS.items():
        videos, stats = get_recent_videos(ch_id, max_results=15)
        for v in videos:
            if v["id"] not in existing_yt_ids:
                new_videos.append({
                    "title": v["title"],
                    "show":  "wcn",
                    "date":  v["published"],
                    "yt":    v["id"],
                    "views": v["views"],
                    "url":   v["url"],
                })
                existing_yt_ids.add(v["id"])
                new_count += 1

    if new_videos:
        existing_eps = new_videos + existing_eps

    data["episodes"]     = existing_eps
    data["total"]        = len(existing_eps)
    data["last_updated"] = TODAY
    wcn_file.write_text(json.dumps(data, indent=2))
    print(f"  ✅ WCN: {new_count} new episodes, {len(existing_eps)} total")

def update_tbg():
    print(f"\n📺 TBG Mirrors Update — {TODAY}")
    tbg_file = TBG_DIR / "data.json"
    data = {}
    if tbg_file.exists():
        try: data = json.loads(tbg_file.read_text())
        except: pass

    existing_eps = data.get("episodes", [])
    # TBG structure: {'num':1,'title':'...','date':'...','yt':'VIDEO_ID','local_audio':...}
    existing_yt_ids = {e.get("yt","") for e in existing_eps if isinstance(e.get("yt",""), str)}

    new_count = 0
    videos, stats = get_recent_videos(TBG_CHANNEL, max_results=15)
    for v in videos:
        if v["id"] not in existing_yt_ids:
            next_num = max((e.get("num",0) for e in existing_eps if isinstance(e.get("num",0), int)), default=0) + 1
            existing_eps.insert(0, {
                "num":    next_num,
                "title":  v["title"],
                "date":   v["published"],
                "yt":     v["id"],
                "views":  v["views"],
                "url":    v["url"],
            })
            existing_yt_ids.add(v["id"])
            new_count += 1

    data["episodes"]     = existing_eps
    data["last_updated"] = TODAY
    if stats:
        data["stats"] = {
            "subscribers":  int(stats.get("subscriberCount",0)),
            "total_views":  int(stats.get("viewCount",0)),
            "video_count":  int(stats.get("videoCount",0)),
            "last_updated": TODAY,
        }
    tbg_file.write_text(json.dumps(data, indent=2))
    print(f"  ✅ TBG: {new_count} new episodes, {len(existing_eps)} total")

if __name__ == "__main__":
    update_wcn()
    update_tbg()
