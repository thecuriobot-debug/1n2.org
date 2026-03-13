#!/usr/bin/env python3
"""
Reorder John Wick videos and add movie posters
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Reorder John Wick videos
john_wick_reordered = []

# Find each video in order
for video in categories['John Wick Gun-Fu']:
    if 'john-wick-gun-fu' == video['id']:
        video['poster'] = 'https://m.media-amazon.com/images/M/MV5BMTU2NjA1ODgzMF5BMl5BanBnXkFtZTgwMTM2MTI4MjE@._V1_FMjpg_UX1000_.jpg'
        john_wick_reordered.append(video)

for video in categories['John Wick Gun-Fu']:
    if 'john-wick-2-gun-fu' == video['id']:
        video['poster'] = 'https://m.media-amazon.com/images/M/MV5BMjE2NDkxNTY2M15BMl5BanBnXkFtZTgwMDc2NzE0MTI@._V1_FMjpg_UX1000_.jpg'
        john_wick_reordered.append(video)

for video in categories['John Wick Gun-Fu']:
    if 'john-wick-3-gun-fu' == video['id']:
        video['poster'] = 'https://m.media-amazon.com/images/M/MV5BMDg2YzI0ODctYjliMy00NTU0LTkxODYtYTNkNjQwMzVmOTcxXkEyXkFqcGdeQXVyNjg2NjQwMDQ@._V1_FMjpg_UX1000_.jpg'
        john_wick_reordered.append(video)

# Add "thrown out" at the end
for video in categories['John Wick Gun-Fu']:
    if 'thrown-out' in video['id']:
        john_wick_reordered.append(video)

# Update database
categories['John Wick Gun-Fu'] = john_wick_reordered

# Save
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Reordered John Wick videos!")
print("   1. John Wick (Gun-Fu) - with poster")
print("   2. John Wick 2 (Gun-Fu) - with poster")
print("   3. John Wick 3 (Gun-Fu) - with poster")
print("   4. John Wick 2 (thrown out) - at end")
print("\n🎬 Movie posters added for films 1-3!")
