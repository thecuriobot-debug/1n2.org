#!/usr/bin/env python3.12
"""
Bitcoin Group Offline Archive Builder
Scans audio/ and video/ directories, builds an index page with playback
"""
import json, os, re
from pathlib import Path

BASE = Path('/Users/curiobot/Sites/1n2.org/bitcoingroup-audio')
AUDIO_DIR = BASE / 'audio'
VIDEO_DIR = BASE / 'video'
EPISODES = json.load(open(BASE / 'episode-list.json'))

# Build lookup
ep_lookup = {e['ep']: e for e in EPISODES}

# Scan what's downloaded
archive = []
for ep_data in EPISODES:
    num = ep_data['ep']
    padded = f"{num:03d}"
    audio_file = AUDIO_DIR / f"TBG-{padded}.m4a"
    video_file = VIDEO_DIR / f"TBG-{padded}.mp4"
    
    entry = {
        'num': num,
        'title': ep_data['title'],
        'date': ep_data['date'],
        'vid': ep_data['vid'],
        'has_audio': audio_file.exists(),
        'has_video': video_file.exists(),
        'audio_size': audio_file.stat().st_size if audio_file.exists() else 0,
        'video_size': video_file.stat().st_size if video_file.exists() else 0,
        'audio_path': f"audio/TBG-{padded}.m4a",
        'video_path': f"video/TBG-{padded}.mp4",
    }
    archive.append(entry)

# Stats
total = len(archive)
with_audio = sum(1 for a in archive if a['has_audio'])
with_video = sum(1 for a in archive if a['has_video'])
total_audio_size = sum(a['audio_size'] for a in archive)
total_video_size = sum(a['video_size'] for a in archive)

with open(BASE / 'archive-data.json', 'w') as f:
    json.dump({
        'episodes': archive,
        'stats': {
            'total': total,
            'with_audio': with_audio,
            'with_video': with_video,
            'audio_size_gb': round(total_audio_size / 1e9, 1),
            'video_size_gb': round(total_video_size / 1e9, 1),
        }
    }, f)

print(f"Archive index built: {total} episodes")
print(f"  Audio: {with_audio}/{total} ({round(total_audio_size/1e9,1)} GB)")
print(f"  Video: {with_video}/{total} ({round(total_video_size/1e9,1)} GB)")
