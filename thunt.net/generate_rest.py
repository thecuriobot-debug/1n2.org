#!/usr/bin/env python3
"""
Generate DVD and Review pages
"""
import re, json
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

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
    elif 'tarantino' in dl or 'scorsese' in dl or 'crime' in nl or 'heat' in nl or 'goodfellas' in nl or 'casino' in nl:
        return 'Crime'
    elif 'austin' in nl or 'lebowski' in nl or 'animal house' in nl or 'ghostbusters' in nl or 'clerks' in nl or 'mallrats' in nl:
        return 'Comedy'
    elif 'allen' in dl:
        return 'Woody Allen'
    elif any(w in nl for w in ['hunt', 'mission', 'rock', 'top gun', 'apocalypse']):
        return 'Action'
    else:
        return 'Drama'

for dvd in dvds:
    dvd['genre'] = guess_genre(dvd['name'], dvd['dir'])

dvds.sort(key=lambda x: x['name'])
revs.sort(key=lambda x: x['date'], reverse=True)

top_revs = [r for r in revs if r['rating'] in ['4', '5']][:9]

css = open(Path(__file__).parent / 'generate_html.py').read().split('css = """')[1].split('"""')[0]

# DVD page
genres = {}
for dvd in dvds:
    genres.setdefault(dvd['genre'], []).append(dvd)

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
<p style="font-size: 15px; color: #666; margin-bottom: 20px;">My complete collection from 2001</p>'''

for genre in sorted(genres.keys()):
    html += f'<h3 style="font-size: 24px; color: #800020; margin: 40px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #d2b48c;">{genre} ({len(genres[genre])})</h3><div class="dvd-grid">'
    for dvd in genres[genre]:
        html += f'''<div class="dvd-card">
<div class="dvd-poster">{dvd['name']}</div>
<div class="dvd-info">
<div class="dvd-title">{dvd['name']}</div>
<div class="dvd-meta">Director: {dvd['dir']}</div>
<div class="dvd-meta">Writer: {dvd['writer']}</div>
<span class="genre-badge">{dvd['genre']}</span>
</div></div>'''
    html += '</div>'

html += '''</div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">{len(dvds)} DVDs in collection</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'dvds.html', 'w') as f:
    f.write(html)

print("✅ dvds.html")

# Reviews page
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
    date_str, _ = fmt_ts(rev['date'])
    html += f'''<div class="review-card highlight">
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
    html += f'''<div class="review-card">
<div class="review-title">{rev['title']} ({rev['year']})</div>
<div class="review-meta">Directed by {rev['creator']} • Reviewed {date_str}</div>
<div class="stars">{stars}</div>
<div class="review-text"><strong>Plot:</strong> {plot_preview}</div>
</div>'''

html += '''</div></div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">{len(revs)} movie reviews</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'reviews.html', 'w') as f:
    f.write(html)

print("✅ reviews.html")

# Random page
html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Random - Thunt.net</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab active">Random</a>
</div><div class="content">
<h2 class="section-title">Random Content</h2>

<div class="random-box">
<div id="random-content" class="random-content">Click the button below to see random content from Thunt.net</div>
<button class="random-btn" onclick="showRandom()">🎲 Show Random Content</button>
</div>

</div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p></footer>
</div>
<script>
let allContent = null;
fetch('content.json')
.then(r => r.json())
.then(data => {{ allContent = data; }});

function showRandom() {{
if (!allContent) return;
const item = allContent[Math.floor(Math.random() * allContent.length)];
const box = document.getElementById('random-content');
let html = '';
if (item.type === 'post') {{
html = `<h3 style="color: #800020; margin-bottom: 15px;">${{item.data.headline}}</h3>
<p style="font-style: italic; color: #666;">${{item.data.summary}}</p>`;
}} else if (item.type === 'msg') {{
html = `<p style="font-size: 20px; font-style: italic;">"${{item.data.msg}}"</p>`;
}} else if (item.type === 'rev') {{
const stars = '★'.repeat(parseInt(item.data.rating) || 3);
html = `<h3 style="color: #800020;">${{item.data.title}} (${{item.data.year}})</h3>
<div style="color: #ffd700; font-size: 24px; margin: 10px 0;">${{stars}}</div>
<p style="font-style: italic;">${{item.data.plot.substring(0, 200)}}...</p>`;
}} else if (item.type === 'quote') {{
html = `<p style="font-size: 22px; font-style: italic; color: #800020;">"${{item.data.quote}}"</p>`;
}}
box.innerHTML = html;
}}
</script>
</body></html>'''

with open(Path(__file__).parent / 'random.html', 'w') as f:
    f.write(html)

print("✅ random.html")
print("\n🎉 All pages generated!")
