#!/usr/bin/env python3
"""
Move 4 videos from Other Edits to Movie Edits
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Videos to move
videos_to_move = ['jackrabbit', 'midget', 'fire-player', 'swinging']

# Separate Other Edits into keep and move
other_keep = []
videos_moving = []

for video in categories['Other Edits']:
    video_id = video['id'].lower()
    should_move = any(keyword in video_id for keyword in videos_to_move)
    
    if should_move:
        # Update category for moved videos
        if 'jackrabbit' in video_id or 'midget' in video_id:
            video['category'] = 'Remixes'
        else:
            video['category'] = 'Sports Edits'
        videos_moving.append(video)
        print(f"   Moving: {video['title']}")
    else:
        other_keep.append(video)

# Add moved videos to Movie Edits
movie_edits = categories['Movie Remixes']
movie_edits.extend(videos_moving)

# Update categories
categories['Other Edits'] = other_keep
categories['Movie Remixes'] = movie_edits

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("\n✅ Reorganized categories!")
print(f"   - Moved 4 videos from Other to Movie Edits")
print(f"   - Movie Edits now has: {len(movie_edits)} videos")
print(f"   - Other Edits now has: {len(other_keep)} videos")
print("\n📊 Updated counts:")
print(f"   🎬 Movie Edits: {len(movie_edits)} videos")
print(f"   📽️ Other Edits: {len(other_keep)} videos")
