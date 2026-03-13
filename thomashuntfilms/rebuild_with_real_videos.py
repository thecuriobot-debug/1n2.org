#!/usr/bin/env python3
"""
Rebuild Thomas Hunt Films with ONLY verified real videos
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")
videos_dir = base / "videos"

# Load verified videos
with open(base / 'videos_verified.json') as f:
    videos = json.load(f)

# Clear old video pages
for old_page in videos_dir.glob("*.html"):
    old_page.unlink()
    print(f"🗑️  Removed: {old_page.name}")

# Load existing data
with open(base / 'comments.json') as f:
    comments = json.load(f)

css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

print(f"\n🎬 Regenerating {len(videos)} verified video pages...")

# Generate each video page
for i, video in enumerate(videos):
    print(f"{i+1}/{len(videos)}: {video['title']}")
    
    video_comments = [c for c in comments if c.get('video') == video['id']]
    related = [v for v in videos if v['id'] != video['id']][:4]
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{video['title']} - Thomas Hunt Films</title>
    <style>{css}</style>
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">Spaceship Supercuts</div>
    </header>
    
    <nav>
        <a href="../index.html">Home</a>
        <a href="../press.html">Press</a>
        <a href="javascript:history.back()">← Back</a>
    </nav>
    
    <div class="container">
        <div class="content">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="margin-bottom: 20px;">
                    <span style="background: #e94560; color: #fff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                        {video['series']} • Verified
                    </span>
                </div>
                
                <h1 style="color: #e94560; margin-bottom: 30px; font-size: 42px;">
                    {video['title']}
                </h1>
                
                <div style="max-width: 900px; margin: 0 auto 40px;">
                    <div style="position: relative; padding-bottom: 56.25%; height: 0; background: #000; border-radius: 12px; overflow: hidden;">
                        <iframe 
                            src="https://www.youtube.com/embed/{video['youtube_id']}" 
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                            frameborder="0" 
                            allowfullscreen
                        ></iframe>
                    </div>
                </div>
                
                <div style="max-width: 900px; margin: 0 auto;">
                    <div style="background: #1a1a2e; padding: 35px; border-radius: 12px; margin-bottom: 40px; border: 2px solid #16213e;">
                        <h3 style="color: #e94560; margin-bottom: 20px; font-size: 24px;">About This Video</h3>
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            {video['description']}
                        </p>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 25px; margin-top: 25px; padding-top: 25px; border-top: 1px solid #16213e;">
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Original Film</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">{video['year']}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Runtime</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">{video['runtime']}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Video ID</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">{video['youtube_id']}</div>
                            </div>
                        </div>
                    </div>'''
    
    if video_comments:
        html += '<h2 class="section-title">Comments</h2>'
        for c in video_comments:
            html += f'''<div class="comment-box"><div class="comment-text">"{c['text']}"</div>
<div class="comment-meta"><span class="comment-author">— {c['author']}</span>
<span class="comment-likes">👍 {c['likes']}</span></div></div>'''
    
    if related:
        html += f'''<h2 class="section-title" style="margin-top: 60px;">More Star Trek Ships Only</h2>
<div class="video-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">'''
        
        for rel in related:
            thumb_url = f"https://img.youtube.com/vi/{rel['youtube_id']}/mqdefault.jpg"
            html += f'''<a href="{rel['id']}.html" style="text-decoration: none; color: inherit;">
<div class="video-card">
<div class="video-thumbnail" style="height: 160px;">
<img src="{thumb_url}" alt="{rel['title']}">
<div class="play-button" style="width: 50px; height: 50px; font-size: 20px;">▶</div>
</div>
<div class="video-info">
<div class="video-title" style="font-size: 15px;">{rel['title']}</div>
<div class="video-meta">{rel['year']} • {rel['runtime']}</div>
</div>
</div>
</a>'''
        
        html += '</div>'
    
    html += '''</div></div></div></div>
<footer><p>Thomas Hunt Films © 2015-2026</p>
<p style="margin-top: 10px;">
<a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560; text-decoration: none;">YouTube Channel</a>
</p></footer>
</body>
</html>'''
    
    with open(videos_dir / f"{video['id']}.html", 'w') as f:
        f.write(html)

print(f"\n✅ Generated {len(videos)} verified video pages!")
