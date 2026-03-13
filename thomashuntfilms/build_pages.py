#!/usr/bin/env python3
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")
videos_dir = base / "videos"
videos_dir.mkdir(exist_ok=True)

with open(base / 'videos.json') as f:
    videos = json.load(f)
with open(base / 'press.json') as f:
    press = json.load(f)
with open(base / 'comments.json') as f:
    comments = json.load(f)

css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

# Video pages
for video in videos:
    video_comments = [c for c in comments if c.get('video') == video['id']]
    
    html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{video['title']} - Thomas Hunt Films</title>
<style>{css}</style></head><body>
<header><h1>THOMAS HUNT FILMS</h1><div class="tagline">Spaceship Supercuts</div></header>
<nav><a href="../index.html">Home</a><a href="../press.html">Press</a></nav>
<div class="container"><div class="content">
<h1 style="color: #e94560; margin-bottom: 20px;">{video['title']}</h1>
<div style="max-width: 900px; margin: 0 auto 40px;">
<div style="position: relative; padding-bottom: 56.25%; height: 0;">
<iframe src="https://www.youtube.com/embed/{video['youtube_id']}" 
style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
frameborder="0" allowfullscreen></iframe>
</div></div>
<div style="max-width: 900px; margin: 0 auto;">
<div style="background: #1a1a2e; padding: 30px; border-radius: 12px; margin-bottom: 40px;">
<h3 style="color: #e94560; margin-bottom: 15px;">About This Video</h3>
<p style="line-height: 1.8; margin-bottom: 15px;">{video['description']}</p>
<div style="display: flex; gap: 30px; margin-top: 20px;">
<div><strong>Year:</strong> {video['year']}</div>
<div><strong>Runtime:</strong> {video['runtime']}</div>
<div><strong>Views:</strong> {video['views']}</div>
</div></div>'''
    
    if video_comments:
        html += '<h2 class="section-title">Comments</h2>'
        for c in video_comments:
            html += f'''<div class="comment-box"><div class="comment-text">"{c['text']}"</div>
<div class="comment-meta"><span class="comment-author">— {c['author']}</span>
<span class="comment-likes">👍 {c['likes']}</span></div></div>'''
    
    html += '</div></div></div><footer><p>Thomas Hunt Films © 2015-2026</p></footer></body></html>'
    
    with open(videos_dir / f"{video['id']}.html", 'w') as f:
        f.write(html)

print(f"✅ Generated {len(videos)} video pages")

# Press page
html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Press - Thomas Hunt Films</title>
<style>{css}</style></head><body>
<header><h1>THOMAS HUNT FILMS</h1><div class="tagline">Spaceship Supercuts</div></header>
<nav><a href="index.html">Home</a><a href="press.html">Press</a></nav>
<div class="container"><div class="content">
<h1 class="section-title">Press Coverage</h1>
<p style="font-size: 18px; color: #aaa; margin-bottom: 40px; max-width: 800px;">
Thomas Hunt Films has been featured in major publications for pioneering the "ships only" editing style.
</p><div class="press-grid">'''

for article in press:
    html += f'''<div class="press-card">
<div class="press-publication">{article['publication']}</div>
<div class="press-title">{article['title']}</div>
<div class="press-excerpt">{article['excerpt']}</div>
<div style="margin-top: 15px; font-size: 12px; color: #666;">{article['date']}</div>
</div>'''

html += '''</div></div></div><footer><p>Thomas Hunt Films © 2015-2026</p></footer></body></html>'''

with open(base / 'press.html', 'w') as f:
    f.write(html)

print("✅ Generated press.html")
print("\n🎉 MVP Complete!")
