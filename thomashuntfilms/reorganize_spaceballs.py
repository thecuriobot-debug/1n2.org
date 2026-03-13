#!/usr/bin/env python3
"""
Reorganize categories - Move Spaceballs to Movie Edits
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Find and remove Spaceballs from Star Wars
spaceballs = None
star_wars_videos = []
for video in categories['Star Wars Ships Only']:
    if 'spaceballs' in video['id'].lower():
        spaceballs = video
        spaceballs['category'] = 'Ships Only'  # Add category field
    else:
        star_wars_videos.append(video)

# Add Spaceballs to Movie Edits
movie_edits = categories['Movie Remixes']
if spaceballs:
    movie_edits.insert(0, spaceballs)  # Add at beginning

# Update categories
categories['Star Wars Ships Only'] = star_wars_videos
categories['Movie Remixes'] = movie_edits

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Reorganized categories!")
print(f"   - Moved Spaceballs from Star Wars to Movie Edits")
print(f"   - Star Wars now has: {len(star_wars_videos)} videos (original trilogy only)")
print(f"   - Movie Edits now has: {len(movie_edits)} videos")
print("\n📊 Updated counts:")
print(f"   🚀 Star Wars: {len(star_wars_videos)} films")
print(f"   🎬 Movie Edits: {len(movie_edits)} videos")
