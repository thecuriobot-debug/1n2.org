#!/usr/bin/env python3
"""
Create press index page with thumbnails and dual links
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load press data
with open(base / 'press_complete.json') as f:
    press_articles = json.load(f)

# Load CSS
css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

# Additional press styles
press_css = """
.press-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
    margin-bottom: 40px;
}
@media (max-width: 968px) {
    .press-grid {
        grid-template-columns: 1fr;
    }
}
.press-article {
    background: #1a1a2e;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #16213e;
    transition: all 0.3s;
}
.press-article:hover {
    border-color: #e94560;
    transform: translateY(-5px);
}
.press-thumbnail {
    width: 100%;
    height: 400px;
    overflow: hidden;
    background: #0a0a0a;
}
.press-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: top;
}
.press-content {
    padding: 30px;
}
.press-publication {
    color: #e94560;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
}
.press-title {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 10px;
    line-height: 1.3;
}
.press-date {
    color: #888;
    font-size: 13px;
    margin-bottom: 15px;
}
.press-excerpt {
    color: #ccc;
    line-height: 1.7;
    margin-bottom: 20px;
}
.press-links {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}
.press-link {
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s;
    display: inline-block;
}
.press-link.local {
    background: #e94560;
    color: #fff;
}
.press-link.local:hover {
    background: #ff5571;
}
.press-link.original {
    background: #16213e;
    color: #fff;
    border: 2px solid #e94560;
}
.press-link.original:hover {
    background: #1a1a2e;
}
"""

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Press Coverage - Thomas Hunt Films</title>
    <style>{css + press_css}</style>
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">Press Coverage • March 2015</div>
    </header>
    
    <nav>
        <a href="index.html">Home</a>
        <a href="series.html">Series</a>
        <a href="press.html">Press</a>
    </nav>
    
    <div class="container">
        <div class="content">
            <h1 class="section-title">Press Coverage</h1>
            <p style="text-align: center; color: #888; margin-bottom: 50px; font-size: 18px;">
                Featured across major tech and culture sites • March 2015
            </p>
            
            <div class="press-grid">
'''

# Create article cards
for article in press_articles:
    html += f'''
                <div class="press-article">
                <div class="press-thumbnail">
                    <img src="press/{article['id']}_thumb.png" alt="{article['title']}" loading="lazy">
                </div>
                <div class="press-content">
                    <div class="press-publication">{article['publication']}</div>
                    <h2 class="press-title">{article['title']}</h2>
                    <div class="press-date">{article['date']}</div>
                    <p class="press-excerpt">{article['excerpt']}</p>
                    <div class="press-links">
                        <a href="{article['local_url']}" class="press-link local">
                            📄 Read Local Copy
                        </a>
                        <a href="{article['url']}" target="_blank" class="press-link original">
                            🔗 View Original
                        </a>
                    </div>
                </div>
            </div>
'''

html += '''
            </div>
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

# Save press page
with open(base / 'press.html', 'w') as f:
    f.write(html)

print("✅ Created press page with thumbnails and dual links!")
print(f"   - {len(press_articles)} articles with thumbnails")
print(f"   - Local copies + Original URLs")
print(f"   - Saved to: press.html")
