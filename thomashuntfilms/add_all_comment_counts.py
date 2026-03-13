#!/usr/bin/env python3
"""
Add comment counts to ALL remaining video categories
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Star Wars metadata with comment counts
star_wars_comments = {
    'star-wars-ships-only': '156',
    'empire-strikes-back-ships-only': '1.2K',
    'return-jedi-ships-only': '389'
}

# Update Star Wars
star_wars_updated = []
for video in categories['Star Wars Ships Only']:
    vid_id = video['id']
    if vid_id in star_wars_comments:
        video['comments'] = star_wars_comments[vid_id]
    star_wars_updated.append(video)

# John Wick metadata with comment counts
john_wick_comments = {
    'john-wick-gun-fu': '12',
    'john-wick-2-gun-fu': '8',
    'john-wick-3-gun-fu': '15',
    'john-wick-2-thrown-out': '3'
}

# Update John Wick
john_wick_updated = []
for video in categories['John Wick Gun-Fu']:
    vid_id = video['id']
    if vid_id in john_wick_comments:
        video['comments'] = john_wick_comments[vid_id]
    john_wick_updated.append(video)

# Movie Remixes metadata with comment counts
movie_comments = {
    'spaceballs-ships-only': '98',
    'hunt-red-october-ships': '34',
    'jaws-sharks-only': '7',
    'pulp-fiction-silent': '5',
    'top-gun-planes-only': '28',
    'jackrabbit-always-wins': '4',
    'midget-remix': '2',
    'how-to-fire-player': '1',
    'just-keep-swinging': '3'
}

# Update Movie Remixes
movie_updated = []
for video in categories['Movie Remixes']:
    vid_id = video['id']
    if vid_id in movie_comments:
        video['comments'] = movie_comments[vid_id]
    movie_updated.append(video)

# Batman '66 metadata with comment counts
batman_comments = {
    'batman-robin-balloon': '18',
    'batman-real-please-stand': '45',
    'same-bat-time-channel': '312',
    'next-week-batman-remix': '52',
    'glorious-morning-gotham': '38'
}

# Update Batman
batman_updated = []
for video in categories["Batman '66 Edits"]:
    vid_id = video['id']
    if vid_id in batman_comments:
        video['comments'] = batman_comments[vid_id]
    batman_updated.append(video)

# Other Edits metadata with comment counts
other_comments = {
    'david-lynch-tribute-2025': '24',
    'california-girls-remix': '8',
    'six-punches-silent': '6',
    'six-punches-all': '5',
    'baseball-game-remix': '2',
    'now-this-is-driving': '4'
}

# Update Other
other_updated = []
for video in categories['Other Edits']:
    vid_id = video['id']
    if vid_id in other_comments:
        video['comments'] = other_comments[vid_id]
    other_updated.append(video)

# Update all categories
categories['Star Wars Ships Only'] = star_wars_updated
categories['John Wick Gun-Fu'] = john_wick_updated
categories['Movie Remixes'] = movie_updated
categories["Batman '66 Edits"] = batman_updated
categories['Other Edits'] = other_updated

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Added comment counts to ALL videos!")
print("\n📊 Updated categories:")
print(f"   🚀 Star Wars: {len(star_wars_updated)} videos")
print(f"   🥋 John Wick: {len(john_wick_updated)} videos")
print(f"   🎬 Movie Edits: {len(movie_updated)} videos")
print(f"   🦇 Batman '66: {len(batman_updated)} videos")
print(f"   📽️ Other: {len(other_updated)} videos")
print("\n✨ All videos now show: VIEWS • AGE • COMMENTS")
