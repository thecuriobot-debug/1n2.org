#!/usr/bin/env python3
"""
Update DVD page with real movie posters
"""
import json
from pathlib import Path

# Load DVD data with poster paths
with open(Path(__file__).parent / "dvd_posters.json") as f:
    dvds = json.load(f)

# Load CSS
css_file = Path(__file__).parent / "generate_html.py"
css = open(css_file).read().split('css = """')[1].split('"""')[0]

# Enhanced poster styles
css += """
.dvd-poster img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
    display: block; 
    border-radius: 4px 4px 0 0;
}
.dvd-poster { 
    position: relative; 
    background: linear-gradient(135deg, #800020 0%, #600010 100%); 
    overflow: hidden;
}
.dvd-card { 
    transition: transform 0.3s, box-shadow 0.3s; 
}
.dvd-card:hover { 
    transform: translateY(-8px); 
    box-shadow: 0 12px 24px rgba(128,0,32,0.4); 
}
"""

# Group by genre
genres = {}
for dvd in dvds:
    genres.setdefault(dvd['genre'], []).append(dvd)

# Generate DVD page
html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>DVD Collection - Thunt.net</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab active">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab">Random</a>
</div><div class="content">
<h2 class="section-title">DVD Collection ({len(dvds)} DVDs)</h2>
<p style="font-size: 15px; color: #666; margin-bottom: 20px;">
Complete collection from 2001 with movie posters from The Movie Database
</p>

<div style="background: #fff8dc; padding: 20px; margin-bottom: 30px; border-left: 5px solid #800020;">
<div style="display: flex; justify-content: space-around; text-align: center;">
<div>
<div style="font-size: 32px; font-weight: bold; color: #800020;">{len(dvds)}</div>
<div style="font-size: 13px; color: #666;">Total DVDs</div>
</div>
<div>
<div style="font-size: 32px; font-weight: bold; color: #28a745;">{sum(1 for d in dvds if d.get('poster'))}</div>
<div style="font-size: 13px; color: #666;">With Posters</div>
</div>
<div>
<div style="font-size: 32px; font-weight: bold; color: #800020;">{len(genres)}</div>
<div style="font-size: 13px; color: #666;">Genres</div>
</div>
</div>
</div>
'''

for genre in sorted(genres.keys()):
    html += f'<h3 style="font-size: 24px; color: #800020; margin: 40px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #d2b48c;">{genre} ({len(genres[genre])})</h3><div class="dvd-grid">'
    
    for dvd in genres[genre]:
        if dvd.get('poster'):
            poster_html = f'<img src="{dvd["poster"]}" alt="{dvd["name"]}" loading="lazy">'
        else:
            # Fallback to text
            poster_html = f'<div style="padding: 20px; color: #f5deb3; text-align: center; font-size: 14px; line-height: 1.4;">{dvd["name"]}</div>'
        
        html += f'''<div class="dvd-card">
<div class="dvd-poster">{poster_html}</div>
<div class="dvd-info">
<div class="dvd-title">{dvd['name']}</div>
<div class="dvd-meta">Director: {dvd['dir']}</div>
<span class="genre-badge">{dvd['genre']}</span>
</div></div>'''
    
    html += '</div>'

html += f'''</div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">{len(dvds)} DVDs • Posters from The Movie Database (TMDb)</p>
</footer>
</div></body></html>'''

# Save
output_file = Path(__file__).parent / "dvds.html"
with open(output_file, 'w') as f:
    f.write(html)

posters_count = sum(1 for d in dvds if d.get('poster'))

print(f"✅ Generated: {output_file}")
print(f"\n📊 DVD page includes:")
print(f"   - {len(dvds)} total DVDs")
print(f"   - {posters_count} real movie posters ({posters_count/len(dvds)*100:.1f}%)")
print(f"   - {len(dvds) - posters_count} text fallbacks")
print(f"   - Organized into {len(genres)} genres")
print(f"\n🎉 DVD page updated with real movie posters!")
