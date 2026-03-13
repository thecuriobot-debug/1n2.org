#!/usr/bin/env python3
"""
Create John Wick series tab - move from Movie Edits
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Find and remove John Wick videos from Movie Edits
john_wick_videos = []
movie_edits_keep = []

for video in categories['Movie Remixes']:
    if 'john-wick' in video['id'].lower() or 'john wick' in video['title'].lower():
        john_wick_videos.append(video)
        print(f"   Moving: {video['title']}")
    else:
        movie_edits_keep.append(video)

# Update categories
categories['John Wick Gun-Fu'] = john_wick_videos
categories['Movie Remixes'] = movie_edits_keep

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print(f"\n✅ Created John Wick series!")
print(f"   - John Wick: {len(john_wick_videos)} videos")
print(f"   - Movie Edits: {len(movie_edits_keep)} videos (remaining)")
print(f"\n📊 New counts:")
print(f"   🥋 John Wick: {len(john_wick_videos)} videos")
print(f"   🎬 Movie Edits: {len(movie_edits_keep)} videos")
