#!/usr/bin/env python3
"""
Update homepage with ONLY verified real videos
"""
import json, random
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load verified videos
with open(base / 'videos_verified.json') as f:
    all_videos = json.load(f)
with open(base / 'press.json') as f:
    press = json.load(f)
with open(base / 'comments.json') as f:
    comments = json.load(f)

css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thomas Hunt Films - Ships Only Edits</title>
    <style>{css}</style>
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">Spaceship Supercuts • Pure Visual Storytelling</div>
    </header>
    
    <nav>
        <a href="index.html">Home</a>
        <a href="press.html">Press</a>
        <a href="#about">About</a>
    </nav>
    
    <div class="hero">
        <div class="hero-content">
            <h2>Just The Spaceships</h2>
            <p>Star Trek films, edited down to only the spaceship sequences. Pure visual effects, no dialogue.</p>
        </div>
    </div>
    
    <div class="container">
        <div class="content">
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">{len(all_videos)}</div>
                    <div class="stat-label">Star Trek Films</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">Verified</div>
                    <div class="stat-label">Real Videos</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">5</div>
                    <div class="stat-label">Press Features</div>
                </div>
            </div>
            
            <h2 class="section-title">Complete Star Trek Collection</h2>
            <p style="text-align: center; color: #888; margin-bottom: 30px;">
                All 10 Star Trek films (1979-2002) edited to show only spaceship sequences
            </p>
            
            <div class="video-grid" id="videoGrid">
'''

for video in all_videos:
    thumb_url = f"https://img.youtube.com/vi/{video['youtube_id']}/maxresdefault.jpg"
    html += f'''
                <a href="videos/{video['id']}.html" style="text-decoration: none; color: inherit;">
                    <div class="video-card">
                        <div class="video-thumbnail">
                            <img src="{thumb_url}" alt="{video['title']}" loading="lazy">
                            <div class="play-button">▶</div>
                        </div>
                        <div class="video-info">
                            <div class="video-title">{video['title']}</div>
                            <div class="video-meta">{video['year']} • {video['runtime']}</div>
                            <div class="video-stats">
                                <span>Verified</span>
                                <span>{video['series']}</span>
                            </div>
                        </div>
                    </div>
                </a>
'''

html += '''
            </div>
            
            <h2 class="section-title" style="margin-top: 60px;">Press Coverage</h2>
            <div class="press-grid">
'''

for article in press[:3]:
    html += f'''
                <div class="press-card">
                    <div class="press-publication">{article['publication']}</div>
                    <div class="press-title">{article['title']}</div>
                    <div class="press-excerpt">{article['excerpt']}</div>
                    <a href="press.html" class="press-link">Read More →</a>
                </div>
'''

html += '''
            </div>
            
            <h2 class="section-title">Community Feedback</h2>
'''

random_comments = random.sample(comments, min(3, len(comments)))
for comment in random_comments:
    html += f'''
            <div class="comment-box">
                <div class="comment-text">"{comment['text']}"</div>
                <div class="comment-meta">
                    <span class="comment-author">— {comment['author']}</span>
                    <span class="comment-likes">👍 {comment['likes']}</span>
                </div>
            </div>
'''

html += '''
        </div>
    </div>
    
    <footer>
        <p>Thomas Hunt Films © 2015-2026</p>
        <p style="margin-top: 10px;">
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560;">YouTube Channel</a> •
            All videos verified from actual channel content
        </p>
    </footer>
</body>
</html>
'''

with open(base / 'index.html', 'w') as f:
    f.write(html)

print("✅ Updated homepage with 10 verified videos")
print("   - All Star Trek films (1979-2002)")
print("   - Real YouTube IDs from press coverage")
print("   - No fictional content")
