#!/usr/bin/env python3
"""
Generate complete Thomas Hunt Films HTML sections with accurate data
"""
import json

# Load the data
with open('/tmp/thomashunt_videos_with_views.json', 'r') as f:
    data = json.load(f)

def format_views(views):
    """Format view count"""
    if views >= 1000000:
        return f"{views/1000000:.1f}M".replace('.0M', 'M')
    elif views >= 1000:
        return f"{views/1000:.1f}K".replace('.0K', 'K')
    else:
        return str(views)

def format_duration_placeholder(year):
    """Placeholder - would need real durations"""
    return "0:00"  # We'll keep existing durations from site

# Calculate section totals
section_totals = {}
for section, videos in data.items():
    total = sum(v[3] for v in videos)
    section_totals[section] = {
        'count': len(videos),
        'views': total,
        'views_formatted': format_views(total)
    }

print("📊 Section Statistics:")
print(f"⭐ Star Trek: {section_totals['star_trek']['count']} videos, {section_totals['star_trek']['views_formatted']} views")
print(f"🚀 Star Wars: {section_totals['star_wars']['count']} videos, {section_totals['star_wars']['views_formatted']} views")
print(f"🥋 John Wick: {section_totals['john_wick']['count']} videos, {section_totals['john_wick']['views_formatted']} views")  
print(f"🦇 Batman: {section_totals['batman']['count']} videos, {section_totals['batman']['views_formatted']} views")
print(f"🎬 Movies: {section_totals['movies']['count']} videos, {section_totals['movies']['views_formatted']} views")
print(f"📽️ Other: {section_totals['other']['count']} videos, {section_totals['other']['views_formatted']} views")

total_videos = sum(s['count'] for s in section_totals.values())
total_views = sum(s['views'] for s in section_totals.values())
print(f"\n✅ Total: {total_videos} videos, {format_views(total_views)} views")

# Save totals for nav update
nav_data = {
    'star_trek': f"{section_totals['star_trek']['count']} videos • {section_totals['star_trek']['views_formatted']} views",
    'star_wars': f"{section_totals['star_wars']['count']} videos • {section_totals['star_wars']['views_formatted']} views",
    'john_wick': f"{section_totals['john_wick']['count']} videos • {section_totals['john_wick']['views_formatted']} views",
    'batman': f"{section_totals['batman']['count']} videos • {section_totals['batman']['views_formatted']} views",
    'movies': f"{section_totals['movies']['count']} videos • {section_totals['movies']['views_formatted']} views",
    'other': f"{section_totals['other']['count']} videos • {section_totals['other']['views_formatted']} views",
    'total_videos': total_videos,
    'total_views': format_views(total_views)
}

with open('/tmp/thomashunt_nav_data.json', 'w') as f:
    json.dump(nav_data, f, indent=2)

print(f"\n💾 Nav data saved to /tmp/thomashunt_nav_data.json")
print(f"\n📋 Summary for nav bar:")
print(f"   {total_videos} videos across 6 categories")
print(f"   {format_views(total_views)} total views")
