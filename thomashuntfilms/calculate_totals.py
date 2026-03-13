#!/usr/bin/env python3
"""
Calculate total views and comments for each category
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

def parse_number(value_str):
    """Convert YouTube format numbers (88K, 1.6M, etc.) to integers"""
    if not value_str or value_str == 'N/A':
        return 0
    
    value_str = str(value_str).strip().upper()
    
    # Handle K (thousands)
    if 'K' in value_str:
        return int(float(value_str.replace('K', '')) * 1000)
    # Handle M (millions)
    elif 'M' in value_str:
        return int(float(value_str.replace('M', '')) * 1000000)
    # Regular number
    else:
        try:
            return int(value_str.replace(',', ''))
        except:
            return 0

def format_number(num):
    """Format number back to YouTube style (88K, 1.6M, etc.)"""
    if num >= 1000000:
        return f"{num/1000000:.1f}M".replace('.0M', 'M')
    elif num >= 1000:
        return f"{num/1000:.1f}K".replace('.0K', 'K')
    else:
        return str(num)

# Calculate totals for each category
category_stats = {}

for cat_name, videos in categories.items():
    total_views = 0
    total_comments = 0
    
    for video in videos:
        total_views += parse_number(video.get('views', '0'))
        total_comments += parse_number(video.get('comments', '0'))
    
    category_stats[cat_name] = {
        'total_views': total_views,
        'total_comments': total_comments,
        'total_views_formatted': format_number(total_views),
        'total_comments_formatted': format_number(total_comments),
        'video_count': len(videos)
    }

# Calculate grand totals
grand_total_views = sum(stats['total_views'] for stats in category_stats.values())
grand_total_comments = sum(stats['total_comments'] for stats in category_stats.values())

print("✅ Calculated totals for all categories!")
print("\n📊 CATEGORY TOTALS:")
print("\n⭐ Star Trek Ships Only:")
print(f"   Videos: {category_stats['Star Trek Ships Only']['video_count']}")
print(f"   Total Views: {category_stats['Star Trek Ships Only']['total_views_formatted']}")
print(f"   Total Comments: {category_stats['Star Trek Ships Only']['total_comments_formatted']}")

print("\n🚀 Star Wars Ships Only:")
print(f"   Videos: {category_stats['Star Wars Ships Only']['video_count']}")
print(f"   Total Views: {category_stats['Star Wars Ships Only']['total_views_formatted']}")
print(f"   Total Comments: {category_stats['Star Wars Ships Only']['total_comments_formatted']}")

print("\n🥋 John Wick Gun-Fu:")
print(f"   Videos: {category_stats['John Wick Gun-Fu']['video_count']}")
print(f"   Total Views: {category_stats['John Wick Gun-Fu']['total_views_formatted']}")
print(f"   Total Comments: {category_stats['John Wick Gun-Fu']['total_comments_formatted']}")

print("\n🎬 Movie Remixes:")
print(f"   Videos: {category_stats['Movie Remixes']['video_count']}")
print(f"   Total Views: {category_stats['Movie Remixes']['total_views_formatted']}")
print(f"   Total Comments: {category_stats['Movie Remixes']['total_comments_formatted']}")

print("\n🦇 Batman '66 Edits:")
batman_stats = category_stats["Batman '66 Edits"]
print(f"   Videos: {batman_stats['video_count']}")
print(f"   Total Views: {batman_stats['total_views_formatted']}")
print(f"   Total Comments: {batman_stats['total_comments_formatted']}")

print("\n📽️ Other Edits:")
print(f"   Videos: {category_stats['Other Edits']['video_count']}")
print(f"   Total Views: {category_stats['Other Edits']['total_views_formatted']}")
print(f"   Total Comments: {category_stats['Other Edits']['total_comments_formatted']}")

print("\n" + "="*60)
print("🎊 GRAND TOTALS ACROSS ALL VIDEOS:")
print(f"   Total Videos: 37")
print(f"   Total Views: {format_number(grand_total_views)}")
print(f"   Total Comments: {format_number(grand_total_comments)}")
print("="*60)

# Save stats for use in homepage generator
stats_output = {
    'categories': category_stats,
    'grand_totals': {
        'videos': 37,
        'views': grand_total_views,
        'comments': grand_total_comments,
        'views_formatted': format_number(grand_total_views),
        'comments_formatted': format_number(grand_total_comments)
    }
}

with open(base / 'category_stats.json', 'w') as f:
    json.dump(stats_output, f, indent=2)

print("\n💾 Saved stats to category_stats.json")
