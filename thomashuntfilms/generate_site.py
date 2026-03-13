#!/usr/bin/env python3
"""
Generate Thomas Hunt Films website
"""
import json
from pathlib import Path
import random

base_dir = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load data
with open(base_dir / 'videos.json') as f:
    videos = json.load(f)

with open(base_dir / 'press.json') as f:
    press = json.load(f)

with open(base_dir / 'comments.json') as f:
    comments = json.load(f)

# CSS
css = """
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
    font-family: 'Helvetica Neue', Arial, sans-serif; 
    background: #0a0a0a; 
    color: #fff; 
}
.container { max-width: 1400px; margin: 0 auto; }
header { 
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
    padding: 60px 40px; 
    text-align: center; 
    border-bottom: 3px solid #e94560;
}
header h1 { 
    font-size: 56px; 
    font-weight: 700; 
    margin-bottom: 15px; 
    background: linear-gradient(45deg, #e94560, #0f3460);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
header .tagline { 
    font-size: 20px; 
    color: #ccc; 
    font-weight: 300; 
}
nav { 
    background: #16213e; 
    padding: 0; 
    display: flex; 
    justify-content: center;
    border-bottom: 1px solid #333;
}
nav a { 
    color: #fff; 
    padding: 20px 40px; 
    text-decoration: none; 
    font-weight: 600; 
    transition: all 0.3s; 
    border-right: 1px solid #333;
}
nav a:hover { background: #e94560; }
.hero { 
    background: url('https://via.placeholder.com/1400x400/1a1a2e/e94560?text=Thomas+Hunt+Films') center/cover; 
    height: 400px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    text-align: center;
    position: relative;
}
.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
}
.hero-content {
    position: relative;
    z-index: 1;
}
.hero h2 { 
    font-size: 48px; 
    margin-bottom: 20px; 
}
.hero p { 
    font-size: 20px; 
    max-width: 800px; 
    margin: 0 auto;
}
.content { padding: 60px 40px; }
.section-title { 
    font-size: 36px; 
    margin-bottom: 40px; 
    color: #e94560; 
    border-bottom: 3px solid #e94560; 
    padding-bottom: 15px;
}
.video-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
    gap: 30px; 
    margin-bottom: 60px;
}
.video-card { 
    background: #1a1a2e; 
    border-radius: 12px; 
    overflow: hidden; 
    transition: transform 0.3s, box-shadow 0.3s;
    border: 2px solid #16213e;
}
.video-card:hover { 
    transform: translateY(-10px); 
    box-shadow: 0 15px 40px rgba(233, 69, 96, 0.3);
    border-color: #e94560;
}
.video-thumbnail { 
    width: 100%; 
    height: 200px; 
    background: #000; 
    position: relative; 
    overflow: hidden;
}
.video-thumbnail img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
}
.play-button { 
    position: absolute; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%); 
    width: 60px; 
    height: 60px; 
    background: rgba(233, 69, 96, 0.9); 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    font-size: 24px;
}
.video-info { padding: 20px; }
.video-title { 
    font-size: 18px; 
    font-weight: 600; 
    margin-bottom: 10px; 
    color: #fff;
}
.video-meta { 
    font-size: 13px; 
    color: #888; 
    margin-bottom: 10px;
}
.video-stats { 
    display: flex; 
    justify-content: space-between; 
    font-size: 12px; 
    color: #666;
}
.press-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); 
    gap: 25px; 
    margin-bottom: 60px;
}
.press-card { 
    background: #1a1a2e; 
    padding: 25px; 
    border-radius: 8px; 
    border-left: 4px solid #e94560;
    transition: all 0.3s;
}
.press-card:hover { 
    background: #16213e; 
    border-left-width: 8px;
}
.press-publication { 
    color: #e94560; 
    font-weight: 700; 
    font-size: 14px; 
    margin-bottom: 10px;
}
.press-title { 
    font-size: 20px; 
    font-weight: 600; 
    margin-bottom: 12px;
}
.press-excerpt { 
    color: #aaa; 
    line-height: 1.6; 
    margin-bottom: 15px;
}
.press-link { 
    color: #e94560; 
    text-decoration: none; 
    font-weight: 600;
}
.press-link:hover { text-decoration: underline; }
.comment-box { 
    background: #16213e; 
    padding: 20px; 
    border-radius: 8px; 
    margin-bottom: 20px;
    border-left: 3px solid #e94560;
}
.comment-text { 
    font-size: 16px; 
    line-height: 1.6; 
    margin-bottom: 12px;
}
.comment-meta { 
    display: flex; 
    justify-content: space-between; 
    font-size: 13px; 
    color: #888;
}
.comment-author { font-weight: 600; color: #e94560; }
.comment-likes { color: #666; }
footer { 
    background: #0f0f0f; 
    padding: 40px; 
    text-align: center; 
    color: #666; 
    border-top: 1px solid #333;
}
.stats { 
    display: flex; 
    justify-content: center; 
    gap: 60px; 
    margin: 40px 0;
    padding: 40px;
    background: #16213e;
    border-radius: 12px;
}
.stat-box { text-align: center; }
.stat-number { 
    font-size: 48px; 
    font-weight: 700; 
    color: #e94560; 
    margin-bottom: 8px;
}
.stat-label { 
    font-size: 14px; 
    color: #aaa; 
    text-transform: uppercase; 
    letter-spacing: 1px;
}
"""

# Homepage HTML
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
        <a href="videos.html">All Videos</a>
        <a href="press.html">Press</a>
        <a href="about.html">About</a>
    </nav>
    
    <div class="hero">
        <div class="hero-content">
            <h2>Just The Spaceships</h2>
            <p>Every Star Trek and Star Wars film, edited down to only the spaceship sequences. Pure visual effects, no dialogue.</p>
        </div>
    </div>
    
    <div class="container">
        <div class="content">
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">13</div>
                    <div class="stat-label">Star Trek Films</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">10M+</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">5</div>
                    <div class="stat-label">Press Features</div>
                </div>
            </div>
            
            <h2 class="section-title">Featured Videos</h2>
            <div class="video-grid">
'''

for video in videos:
    thumb_url = f"https://img.youtube.com/vi/{video.get('youtube_id', video.get('id',''))}/maxresdefault.jpg"
    html += f'''
                <a href="videos/{video['id']}.html" style="text-decoration: none; color: inherit;">
                    <div class="video-card">
                        <div class="video-thumbnail">
                            <img src="{thumb_url}" alt="{video['title']}">
                            <div class="play-button">▶</div>
                        </div>
                        <div class="video-info">
                            <div class="video-title">{video['title']}</div>
                            <div class="video-meta">{video['year']} • {video['runtime']}</div>
                            <div class="video-stats">
                                <span>{video['views']} views</span>
                                <span>Ships Only</span>
                            </div>
                        </div>
                    </div>
                </a>
'''

html += '''
            </div>
            
            <h2 class="section-title">Recent Press</h2>
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

# Random comments
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
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560;">YouTube Channel</a>
        </p>
    </footer>
</body>
</html>
'''

# Save homepage
with open(base_dir / 'index.html', 'w') as f:
    f.write(html)

print(f"✅ Generated index.html")

# Continue with video pages...
print(f"📝 Generating individual video pages...")
