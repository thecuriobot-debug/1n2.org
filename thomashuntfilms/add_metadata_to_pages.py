#!/usr/bin/env python3
"""
Add YouTube metadata sections to ALL Star Trek individual video pages
Handles pages with and without Comments sections
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Star Trek metadata with actual YouTube stats
star_trek_stats = {
    'star-trek-tmp': {'views': '88K', 'likes': '1.2K', 'age': '13 years ago'},
    'star-trek-wrath-khan': {'views': '322K', 'likes': '4.5K', 'age': '13 years ago'},
    'star-trek-search-spock': {'views': '80K', 'likes': '1.1K', 'age': '13 years ago'},
    'star-trek-voyage-home': {'views': '68K', 'likes': '968', 'age': '13 years ago'},
    'star-trek-final-frontier': {'views': '40K', 'likes': '601', 'age': '13 years ago'},
    'star-trek-undiscovered-country': {'views': '77K', 'likes': '1.1K', 'age': '13 years ago'},
    'star-trek-generations': {'views': '496K', 'likes': '6.2K', 'age': '13 years ago'},
    'star-trek-first-contact': {'views': '1M', 'likes': '23K', 'age': '12 years ago'},
    'star-trek-insurrection': {'views': '87K', 'likes': '1.3K', 'age': '13 years ago'},
    'star-trek-nemesis': {'views': '193K', 'likes': '2.6K', 'age': '13 years ago'}
}

# Function to create metadata HTML section
def create_metadata_section(views, likes, age):
    return '''
                    <div style="background: #16213e; padding: 35px; border-radius: 12px; margin-bottom: 40px; border: 2px solid #1a1a2e;">
                        <h3 style="color: #e94560; margin-bottom: 25px; font-size: 24px;">YouTube Stats</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Views</div>
                                <div style="font-size: 36px; font-weight: 700; color: #e94560;">{}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Likes</div>
                                <div style="font-size: 36px; font-weight: 700; color: #e94560;">{}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Uploaded</div>
                                <div style="font-size: 20px; font-weight: 700; color: #fff;">{}</div>
                            </div>
                        </div>
                    </div>'''.format(views, likes, age)

# Update Star Trek pages
videos_dir = base / 'videos'
updated_count = 0

if videos_dir.exists():
    for vid_id, stats in star_trek_stats.items():
        page_path = videos_dir / f'{vid_id}.html'
        
        if page_path.exists():
            html = open(page_path).read()
            
            # Check if metadata already exists
            if 'YouTube Stats' not in html:
                metadata_html = create_metadata_section(stats['views'], stats['likes'], stats['age'])
                
                # Try insertion after About section, before Comments
                insertion_marker1 = '</div><h2 class="section-title">Comments</h2>'
                # Or before More Star Trek section
                insertion_marker2 = '</div><h2 class="section-title" style="margin-top: 60px;">More Star Trek Ships Only</h2>'
                
                if insertion_marker1 in html:
                    html = html.replace(
                        insertion_marker1,
                        '</div>' + metadata_html + '<h2 class="section-title">Comments</h2>'
                    )
                    with open(page_path, 'w') as f:
                        f.write(html)
                    print(f"✅ Updated {vid_id} (with comments)")
                    updated_count += 1
                elif insertion_marker2 in html:
                    html = html.replace(
                        insertion_marker2,
                        '</div>' + metadata_html + '<h2 class="section-title" style="margin-top: 60px;">More Star Trek Ships Only</h2>'
                    )
                    with open(page_path, 'w') as f:
                        f.write(html)
                    print(f"✅ Updated {vid_id} (no comments)")
                    updated_count += 1
                else:
                    print(f"⚠️  Could not find insertion point in {vid_id}")
            else:
                print(f"ℹ️  {vid_id} already has metadata")

print(f"\n🎉 Updated {updated_count} Star Trek pages with YouTube metadata!")
print("\n📊 Metadata Added:")
print("   - Views count")
print("   - Likes count") 
print("   - Upload date")
print("\n✨ Stats displayed after 'About This Video' section!")
