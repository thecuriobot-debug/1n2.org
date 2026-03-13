#!/usr/bin/env python3
"""
Update reviews page with real posters
"""
import json
from pathlib import Path
from datetime import datetime

# Load review data
with open(Path(__file__).parent / "review_posters.json") as f:
    revs = json.load(f)

def fmt_ts(ts):
    if not ts or len(str(ts)) < 8: return ("Unknown", 2000)
    s = str(ts)
    try:
        y, m, d = s[0:4], s[4:6], s[6:8]
        dt = datetime(int(y), int(m), int(d))
        return (dt.strftime("%b %d, %Y"), int(y))
    except: return (s, 2000)

revs.sort(key=lambda x: x['date'], reverse=True)
top_revs = [r for r in revs if r['rating'] in ['4', '5']][:9]

# Load CSS
css_file = Path(__file__).parent / "generate_html.py"
css = open(css_file).read().split('css = """')[1].split('"""')[0]

css += """
.review-poster { 
    width: 100%; 
    height: 220px; 
    overflow: hidden; 
    margin-bottom: 15px; 
    border-radius: 8px; 
    background: linear-gradient(135deg, #800020 0%, #600010 100%); 
}
.review-poster img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
    display: block; 
}
.review-card { 
    transition: transform 0.3s, box-shadow 0.3s; 
}
.review-card:hover { 
    transform: translateY(-5px); 
    box-shadow: 0 8px 16px rgba(128,0,32,0.3); 
}
"""

html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reviews - Thunt.net</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab active">Reviews</a>
<a href="random.html" class="tab">Random</a>
</div><div class="content">
<h2 class="section-title">Movie Reviews ({len(revs)} total)</h2>

<div style="background: #fff8dc; padding: 20px; margin-bottom: 30px; border-left: 5px solid #800020;">
<div style="display: flex; justify-content: space-around; text-align: center;">
<div>
<div style="font-size: 32px; font-weight: bold; color: #800020;">{len(revs)}</div>
<div style="font-size: 13px; color: #666;">Total Reviews</div>
</div>
<div>
<div style="font-size: 32px; font-weight: bold; color: #28a745;">{sum(1 for r in revs if r.get('poster'))}</div>
<div style="font-size: 13px; color: #666;">With Posters</div>
</div>
<div>
<div style="font-size: 32px; font-weight: bold; color: #ffd700;">{len(top_revs)}</div>
<div style="font-size: 13px; color: #666;">Highly Rated</div>
</div>
</div>
</div>

<div class="highlight-section">
<h3 style="font-size: 28px; color: #800020; margin-bottom: 20px;">⭐ Highly Rated ({len(top_revs)})</h3>
<div class="review-grid">'''

for rev in top_revs:
    stars = '★' * int(rev['rating']) if rev['rating'].isdigit() else rev['rating']
    
    if rev.get('poster'):
        poster_html = f'<div class="review-poster"><img src="{rev["poster"]}" alt="{rev["title"]}" loading="lazy"></div>'
    else:
        poster_html = ''
    
    html += f'''<div class="review-card highlight">
{poster_html}
<div class="review-title">{rev['title']} ({rev['year']})</div>
<div class="review-meta">Directed by {rev['creator']}</div>
<div class="stars">{stars}</div>
<div class="review-text" style="font-weight: bold; font-style: italic;">"{rev['plot'][:150]}..."</div>
</div>'''

html += '''</div></div>

<h3 style="font-size: 28px; color: #800020; margin: 40px 0 20px 0;">All Reviews</h3>
<div class="review-grid">'''

for rev in revs:
    stars = '★' * int(rev['rating']) if rev['rating'].isdigit() else rev['rating']
    date_str, _ = fmt_ts(rev['date'])
    plot_preview = rev['plot'][:200] + '...' if len(rev['plot']) > 200 else rev['plot']
    
    if rev.get('poster'):
        poster_html = f'<div class="review-poster"><img src="{rev["poster"]}" alt="{rev["title"]}" loading="lazy"></div>'
    else:
        poster_html = ''
    
    html += f'''<div class="review-card">
{poster_html}
<div class="review-title">{rev['title']} ({rev['year']})</div>
<div class="review-meta">Directed by {rev['creator']} • {date_str}</div>
<div class="stars">{stars}</div>
<div class="review-text"><strong>Plot:</strong> {plot_preview}</div>
</div>'''

posters_count = sum(1 for r in revs if r.get('poster'))

html += f'''</div></div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">{len(revs)} reviews • Posters from The Movie Database (TMDb)</p>
</footer>
</div></body></html>'''

output_file = Path(__file__).parent / "reviews.html"
with open(output_file, 'w') as f:
    f.write(html)

print(f"✅ Generated: {output_file}")
print(f"\n📊 Reviews page includes:")
print(f"   - {len(revs)} total reviews")
print(f"   - {posters_count} real movie posters ({posters_count/len(revs)*100:.1f}%)")
print(f"   - {len(top_revs)} highly rated reviews")
print(f"\n🎉 Reviews page updated with real movie posters!")
