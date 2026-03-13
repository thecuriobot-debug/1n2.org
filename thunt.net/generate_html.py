#!/usr/bin/env python3
"""
Generate complete Thunt.net HTML site
"""
import re, json
from pathlib import Path
from datetime import datetime

# Load content
content_file = Path(__file__).parent / "content.json"
with open(content_file) as f:
    all_content = json.load(f)

# Reload parsed data
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

# Quick reparse
posts, msgs, dvds, revs, quotes = [], [], [], [], []
for m in re.finditer(r"INSERT INTO thuntnet_archive VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+), '(.*?)', '(.*?)'\);", sql, re.DOTALL):
    posts.append({'id': m[1], 'headline': esc(m[2]), 'author': esc(m[3]), 'story': esc(m[5]), 'summary': esc(m[6]), 'date': m[7], 'section': m[8], 'link': m[9]})
for m in re.finditer(r"INSERT INTO thuntmessage VALUES \((\d+), '(.*?)', (\d+)\);", sql):
    msgs.append({'id': m[1], 'msg': esc(m[2]), 'date': m[3]})
for m in re.finditer(r"INSERT INTO dvd VALUES \('(.*?)', '(.*?)', '(.*?)', '.*?', '.*?', '.*?', (\d+)\);", sql):
    dvds.append({'name': esc(m[1]), 'dir': esc(m[2]), 'writer': esc(m[3])})
for m in re.finditer(r"INSERT INTO thuntnet_reviews VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+)\);", sql, re.DOTALL):
    revs.append({'id': m[1], 'title': esc(m[2]), 'year': m[3], 'plot': esc(m[4]), 'opinion': esc(m[5]), 'rating': m[6], 'creator': m[7], 'date': m[9]})
for m in re.finditer(r"INSERT INTO random VALUES \((\d+), '(.*?)'\);", sql):
    quotes.append({'quote': esc(m[2])})

blog = [p for p in posts if p['section'] == 'normal']
links = [p for p in posts if p['section'] == 'net_interest']
blog.sort(key=lambda x: x['date'])
links.sort(key=lambda x: x['date'])
dvds.sort(key=lambda x: x['name'])
revs.sort(key=lambda x: x['date'], reverse=True)

by_year = {}
for l in links:
    _, y = fmt_ts(l['date'])
    by_year.setdefault(y, []).append(l)

def guess_genre(name, director):
    nl, dl = name.lower(), director.lower()
    if 'star trek' in nl or 'star wars' in nl or 'space' in nl or 'matrix' in nl or 'fifth element' in nl:
        return 'Sci-Fi'
    elif 'kubrick' in dl:
        return 'Kubrick'
    elif 'tarantino' in dl or 'scorsese' in dl or 'crime' in nl or 'heat' in nl:
        return 'Crime'
    elif 'austin' in nl or 'lebowski' in nl or 'animal house' in nl or 'ghostbusters' in nl:
        return 'Comedy'
    elif 'allen' in dl:
        return 'Drama'
    elif any(w in nl for w in ['hunt', 'mission', 'rock', 'top gun']):
        return 'Action'
    else:
        return 'Drama'

for dvd in dvds:
    dvd['genre'] = guess_genre(dvd['name'], dvd['dir'])

top_revs = [r for r in revs if r['rating'] in ['4', '5']][:6]

# CSS
css = """
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, serif; font-size: 14px; background: #f5deb3; color: #000; }
.container { max-width: 1000px; margin: 0 auto; background: #fff; box-shadow: 0 0 30px rgba(0,0,0,0.3); }
header { background: linear-gradient(180deg, #800020 0%, #600010 100%); color: #f5deb3; padding: 40px 20px; text-align: center; border-bottom: 5px solid #f5deb3; }
header h1 { font-size: 56px; font-weight: bold; text-shadow: 3px 3px 6px rgba(0,0,0,0.7); margin-bottom: 10px; letter-spacing: 3px; }
header .tagline { font-size: 22px; font-style: italic; color: #f5deb3; }
.tabs { background: #800020; padding: 0; display: flex; border-bottom: 3px solid #600010; }
.tab { flex: 1; padding: 18px 20px; background: #600010; color: #f5deb3; text-align: center; cursor: pointer; border-right: 2px solid #800020; font-size: 16px; font-weight: bold; transition: all 0.3s; text-decoration: none; display: block; }
.tab:hover { background: #800020; }
.tab.active { background: #f5deb3; color: #800020; }
.content { padding: 40px; }
.post-list { list-style: none; }
.post-item { padding: 12px 0; border-bottom: 1px solid #d2b48c; display: flex; justify-content: space-between; align-items: baseline; }
.post-item:hover { background: #fff8dc; padding-left: 10px; }
.post-title { font-size: 16px; color: #800020; font-weight: bold; flex: 1; }
.post-date { font-size: 13px; color: #666; min-width: 120px; text-align: right; font-family: Verdana, sans-serif; }
.year-sep { background: #800020; color: #f5deb3; padding: 15px 20px; margin: 30px 0 20px 0; font-size: 24px; font-weight: bold; text-align: center; }
.dvd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; margin-top: 30px; }
.dvd-card { background: #fff; border: 3px solid #800020; padding: 0; text-align: center; transition: transform 0.3s; cursor: pointer; }
.dvd-card:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(128,0,32,0.3); }
.dvd-poster { width: 100%; height: 250px; background: linear-gradient(135deg, #800020 0%, #600010 100%); display: flex; align-items: center; justify-content: center; color: #f5deb3; font-size: 14px; padding: 20px; text-align: center; font-weight: bold; }
.dvd-info { padding: 15px; background: #f5deb3; }
.dvd-title { font-size: 14px; font-weight: bold; color: #800020; margin-bottom: 8px; min-height: 40px; }
.dvd-meta { font-size: 11px; color: #666; margin: 4px 0; }
.genre-badge { display: inline-block; background: #800020; color: #f5deb3; padding: 3px 8px; font-size: 10px; border-radius: 3px; margin-top: 5px; }
.review-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
.review-card { background: #f5deb3; border-left: 8px solid #800020; padding: 20px; }
.review-card.highlight { border: 4px solid #800020; background: #fff8dc; }
.review-title { font-size: 20px; font-weight: bold; color: #800020; margin-bottom: 5px; }
.review-meta { font-size: 13px; color: #666; margin-bottom: 10px; }
.stars { color: #ffd700; font-size: 20px; margin: 10px 0; }
.review-text { font-size: 14px; line-height: 1.6; margin-top: 10px; }
.random-box { background: #fff8dc; border: 5px solid #800020; padding: 40px; margin: 40px 0; text-align: center; }
.random-content { font-size: 18px; line-height: 1.8; margin: 20px 0; min-height: 150px; }
.random-btn { background: #800020; color: #f5deb3; border: none; padding: 15px 40px; font-size: 18px; font-weight: bold; cursor: pointer; border-radius: 5px; font-family: Georgia, serif; }
.random-btn:hover { background: #600010; }
.link-item { padding: 15px; margin: 10px 0; background: #fff8dc; border-left: 5px solid #800020; }
.link-title { font-size: 16px; font-weight: bold; color: #800020; margin-bottom: 5px; }
.link-url { color: #600010; text-decoration: none; font-size: 14px; }
.link-url:hover { text-decoration: underline; }
.section-title { font-size: 32px; color: #800020; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 4px solid #800020; }
footer { background: #800020; color: #f5deb3; text-align: center; padding: 25px; font-size: 14px; }
.highlight-section { background: #fff8dc; padding: 30px; margin: 30px 0; border: 3px solid #800020; }
"""

# Generate index.html
html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Thunt.net - Inform the masses</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab active">Blog Posts</a>
<a href="links.html" class="tab">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab">Random</a>
</div><div class="content">
<h2 class="section-title">Blog Posts ({len(blog)} total)</h2>
<p style="font-size: 15px; color: #666; margin-bottom: 30px;">Chronological from the beginning</p>
<ul class="post-list">'''

for post in blog:
    date_str, _ = fmt_ts(post['date'])
    html += f'''<li class="post-item">
<span class="post-title">{post['headline']}</span>
<span class="post-date">{date_str}</span></li>'''

html += '''</ul></div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">Reconstructed from SQL database - 2026</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'index.html', 'w') as f:
    f.write(html)

print("✅ index.html")

# Generate links.html
html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Net Interest - Thunt.net</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab active">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab">Random</a>
</div><div class="content">
<h2 class="section-title">Net Interest ({len(links)} links)</h2>'''

for year in sorted(by_year.keys()):
    html += f'<div class="year-sep">{year}</div>'
    for link in by_year[year]:
        date_str, _ = fmt_ts(link['date'])
        link_url = f"http://{link['link']}" if link['link'] and not link['link'].startswith('http') else link['link']
        html += f'''<div class="link-item">
<div class="link-title">{link['headline']}</div>
<div style="font-size: 13px; color: #666; margin: 5px 0;">{date_str}</div>
<div style="font-size: 14px; margin: 8px 0;">{link['summary']}</div>
{f'<a href="{link_url}" class="link-url" target="_blank">→ {link["link"]}</a>' if link['link'] else ''}</div>'''

html += '''</div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'links.html', 'w') as f:
    f.write(html)

print("✅ links.html")

# Generate messages.html
html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Messages - Thunt.net</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab">Net Interest</a>
<a href="messages.html" class="tab active">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab">Random</a>
</div><div class="content">
<h2 class="section-title">Messages ({len(msgs)} total)</h2>'''

msgs.sort(key=lambda x: x['date'], reverse=True)
for msg in msgs:
    date_str, _ = fmt_ts(msg['date'])
    html += f'''<div class="link-item" style="background: #fff8dc;">
<div style="font-size: 16px; line-height: 1.6;">{msg['msg']}</div>
<div style="font-size: 12px; color: #666; margin-top: 10px;">{date_str}</div></div>'''

html += '''</div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p></footer>
</div></body></html>'''

with open(Path(__file__).parent / 'messages.html', 'w') as f:
    f.write(html)

print("✅ messages.html")

# Continue in next part...
print("⏳ Generating DVD and review pages...")
