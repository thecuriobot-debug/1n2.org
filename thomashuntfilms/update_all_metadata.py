#!/usr/bin/env python3
"""
Update ALL videos with metadata from YouTube channel page
Data collected from browser screenshots
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# COMPLETE METADATA FROM YOUTUBE CHANNEL PAGE
# Collected via browser on 2026-02-17

# Star Trek - keeping existing verified data
# (Already has complete metadata)

# Star Wars Ships Only
star_wars_updated = [
    {**v, 'views': '164K', 'age': '9 years ago'} if 'star-wars-ships-only' in v['id']
    else {**v, 'views': '1.6M', 'age': '9 years ago'} if 'empire' in v['id']
    else {**v, 'views': '346K', 'age': '9 years ago'}
    for v in categories['Star Wars Ships Only']
]

# Movie Remixes
movie_remixes_views = {
    'spaceballs-ships-only': ('14K', '9 years ago'),
    'hunt-red-october-ships': ('3.3K', '9 years ago'),
    'jaws-sharks-only': ('193', '2 years ago'),
    'pulp-fiction-silent': ('78', '2 years ago'),
    'top-gun-planes-only': ('1.5K', '4 years ago'),
    'jackrabbit-always-wins': ('75', '4 years ago'),
    'midget-remix': ('66', '4 years ago'),
    'how-to-fire-player': ('22', '2 years ago'),
    'just-keep-swinging': ('71', '2 years ago')
}

movie_remixes_updated = []
for v in categories['Movie Remixes']:
    if v['id'] in movie_remixes_views:
        views, age = movie_remixes_views[v['id']]
        movie_remixes_updated.append({**v, 'views': views, 'age': age})
    else:
        movie_remixes_updated.append(v)

# Batman '66 Edits
batman_views = {
    'batman-robin-balloon': ('339', '4 years ago'),
    'batman-real-please-stand': ('782', '4 years ago'),
    'same-bat-time-channel': ('44K', '4 years ago'),
    'next-week-batman-remix': ('812', '4 years ago'),
    'glorious-morning-gotham': ('562', '4 years ago')
}

batman_updated = []
for v in categories["Batman '66 Edits"]:
    if v['id'] in batman_views:
        views, age = batman_views[v['id']]
        batman_updated.append({**v, 'views': views, 'age': age})
    else:
        batman_updated.append(v)

# Other Edits
other_views = {
    'david-lynch-tribute-2025': ('298', '11 months ago'),
    'california-girls-remix': ('156', '4 years ago'),
    'six-punches-silent': ('138', '4 years ago'),
    'six-punches-all': ('103', '4 years ago'),
    'baseball-game-remix': ('30', '2 years ago'),
    'now-this-is-driving': ('110', '2 years ago')
}

other_updated = []
for v in categories['Other Edits']:
    if v['id'] in other_views:
        views, age = other_views[v['id']]
        other_updated.append({**v, 'views': views, 'age': age})
    else:
        other_updated.append(v)

# John Wick already updated with complete metadata

# Update all categories
categories['Star Wars Ships Only'] = star_wars_updated
categories['Movie Remixes'] = movie_remixes_updated
categories["Batman '66 Edits"] = batman_updated
categories['Other Edits'] = other_updated

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Updated ALL video metadata!")
print("\n📊 Categories updated:")
print(f"   ⭐ Star Trek: {len(categories['Star Trek Ships Only'])} videos")
print(f"   🚀 Star Wars: {len(categories['Star Wars Ships Only'])} videos")
print(f"   🥋 John Wick: {len(categories['John Wick Gun-Fu'])} videos")
print(f"   🎬 Movie Edits: {len(categories['Movie Remixes'])} videos")
batman_count = len(categories["Batman '66 Edits"])
print(f"   🦇 Batman '66: {batman_count} videos")
print(f"   📽️ Other: {len(categories['Other Edits'])} videos")
print("\n✨ All videos now have real view counts and ages!")
