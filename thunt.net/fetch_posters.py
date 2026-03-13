#!/usr/bin/env python3
"""
Add movie posters to DVD and Review pages using OMDb API
Uses urllib instead of requests (built-in)
"""
import re, json, time, urllib.request, urllib.parse
from pathlib import Path
from datetime import datetime

# OMDb API key
OMDB_API_KEY = "e8a19cd7"

sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql = f.read()

def esc(t):
    return t.replace("\\'", "'").replace("\\r\\n", "\n").replace("\\n", "\n") if t else ""

def fmt_ts(ts):
    if not ts or len(str(ts)) < 8: return ("Unknown", 2000)
    s = str(ts)
    try:
        y, m, d = s[0:4], s[4:6], s[6:8]
        dt = datetime(int(y), int(m), int(d))
        return (dt.strftime("%b %d, %Y"), int(y))
    except: return (s, 2000)

def get_poster(title, year=""):
    """Get movie poster from OMDb API"""
    try:
        # Clean up title - remove "The" at end, apostrophes
        title_clean = title.replace(", The", "").replace("'", "").strip()
        
        url = f"http://www.omdbapi.com/?t={urllib.parse.quote(title_clean)}&y={year}&apikey={OMDB_API_KEY}"
        
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            
        if data.get('Response') == 'True' and data.get('Poster') != 'N/A':
            return data['Poster']
    except Exception as e:
        print(f"    ⚠️  Could not fetch: {title} - {e}")
        pass
    
    return None

# Parse data
dvds, revs = [], []
for m in re.finditer(r"INSERT INTO dvd VALUES \('(.*?)', '(.*?)', '(.*?)', '.*?', '.*?', '.*?', (\d+)\);", sql):
    dvds.append({'name': esc(m[1]), 'dir': esc(m[2]), 'writer': esc(m[3])})
for m in re.finditer(r"INSERT INTO thuntnet_reviews VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+)\);", sql, re.DOTALL):
    revs.append({'id': m[1], 'title': esc(m[2]), 'year': m[3], 'plot': esc(m[4]), 'opinion': esc(m[5]), 'rating': m[6], 'creator': m[7], 'date': m[9]})

def guess_genre(name, director):
    nl, dl = name.lower(), director.lower()
    if 'star trek' in nl or 'star wars' in nl or 'space' in nl or 'matrix' in nl or 'fifth element' in nl or 'stargate' in nl:
        return 'Sci-Fi'
    elif 'kubrick' in dl:
        return 'Kubrick'
    elif 'tarantino' in dl or 'scorsese' in dl or 'heat' in nl or 'goodfellas' in nl or 'casino' in nl:
        return 'Crime'
    elif 'austin' in nl or 'lebowski' in nl or 'animal house' in nl or 'ghostbusters' in nl or 'clerks' in nl:
        return 'Comedy'
    elif 'allen' in dl:
        return 'Woody Allen'
    elif any(w in nl for w in ['hunt', 'mission', 'rock', 'top gun']):
        return 'Action'
    else:
        return 'Drama'

for dvd in dvds:
    dvd['genre'] = guess_genre(dvd['name'], dvd['dir'])

dvds.sort(key=lambda x: x['name'])
revs.sort(key=lambda x: x['date'], reverse=True)

# Fetch posters for DVDs (first 50 to avoid rate limits)
print(f"🎬 Fetching posters for {min(50, len(dvds))} DVDs...")
for i, dvd in enumerate(dvds[:50]):
    print(f"  {i+1}/50: {dvd['name']}")
    dvd['poster'] = get_poster(dvd['name'])
    if dvd['poster']:
        print(f"    ✅ Got poster")
    time.sleep(0.3)

for dvd in dvds[50:]:
    dvd['poster'] = None

# Fetch posters for reviews (first 50)
print(f"\n⭐ Fetching posters for {min(50, len(revs))} reviews...")
for i, rev in enumerate(revs[:50]):
    print(f"  {i+1}/50: {rev['title']} ({rev['year']})")
    rev['poster'] = get_poster(rev['title'], rev['year'])
    if rev['poster']:
        print(f"    ✅ Got poster")
    time.sleep(0.3)

for rev in revs[50:]:
    rev['poster'] = None

top_revs = [r for r in revs if r['rating'] in ['4', '5']][:9]

# Load CSS
css_file = Path(__file__).parent / "generate_html.py"
css = open(css_file).read().split('css = """')[1].split('"""')[0]

# Add poster styles
css += """
.dvd-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.review-poster { width: 100%; height: 200px; overflow: hidden; margin-bottom: 15px; border-radius: 8px; }
.review-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
"""

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
<p style="font-size: 15px; color: #666; margin-bottom: 20px;">Complete collection from 2001 with movie posters</p>'''

for genre in sorted(genres.keys()):
    html += f'<h3 style="font-size: 24px; color: #800020; margin: 40px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #d2b48c;">{genre} ({len(genres[genre])})</h3><div class="dvd-grid">'
    for dvd in genres[genre]:
        if dvd.get('poster'):
            poster_html = f'<img src="{dvd["poster"]}" alt="{dvd["name"]}" loading="lazy">'
        else:
            poster_html = dvd['name']
        
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
<p style="margin-top: 10px;">{len(dvds)} DVDs • Posters from OMDb</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'dvds.html', 'w') as f:
    f.write(html)

print("\n✅ dvds.html generated")

# Generate Reviews page
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

<div class="highlight-section">
<h3 style="font-size: 28px; color: #800020; margin-bottom: 20px;">⭐ Highly Rated ({len(top_revs)})</h3>
<div class="review-grid">'''

for rev in top_revs:
    stars = '★' * int(rev['rating']) if rev['rating'].isdigit() else rev['rating']
    
    poster_html = ''
    if rev.get('poster'):
        poster_html = f'<div class="review-poster"><img src="{rev["poster"]}" alt="{rev["title"]}" loading="lazy"></div>'
    
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
    
    poster_html = ''
    if rev.get('poster'):
        poster_html = f'<div class="review-poster"><img src="{rev["poster"]}" alt="{rev["title"]}" loading="lazy"></div>'
    
    html += f'''<div class="review-card">
{poster_html}
<div class="review-title">{rev['title']} ({rev['year']})</div>
<div class="review-meta">Directed by {rev['creator']} • {date_str}</div>
<div class="stars">{stars}</div>
<div class="review-text"><strong>Plot:</strong> {plot_preview}</div>
</div>'''

html += f'''</div></div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">{len(revs)} reviews • Posters from OMDb</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'reviews.html', 'w') as f:
    f.write(html)

print("✅ reviews.html generated")

# Count posters
dvd_posters = sum(1 for d in dvds if d.get('poster'))
rev_posters = sum(1 for r in revs if r.get('poster'))

print(f"\n📊 Results:")
print(f"   DVD posters: {dvd_posters}/{len(dvds)}")
print(f"   Review posters: {rev_posters}/{len(revs)}")
print(f"\n🎉 Pages updated with real movie posters from OMDb API!")
