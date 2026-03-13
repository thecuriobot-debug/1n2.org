#!/usr/bin/env python3
"""
Phase 2: Update homepage with all 22 videos + series filtering
"""
import json, random
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load data
with open(base / 'videos_complete.json') as f:
    all_videos = json.load(f)
with open(base / 'press.json') as f:
    press = json.load(f)
with open(base / 'comments.json') as f:
    comments = json.load(f)

# Stats
star_trek_count = len([v for v in all_videos if v['series'] == 'Star Trek'])
star_wars_count = len([v for v in all_videos if v['series'] == 'Star Wars'])
total_views = sum(int(v['views'].replace('K+', '000').replace('M+', '000000')) for v in all_videos)

css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

# Add filter styles
css += """
.filter-tabs { 
    display: flex; 
    justify-content: center; 
    gap: 15px; 
    margin: 40px 0; 
    flex-wrap: wrap;
}
.filter-btn { 
    background: #16213e; 
    color: #fff; 
    border: 2px solid #16213e;
    padding: 12px 30px; 
    border-radius: 25px; 
    cursor: pointer; 
    font-weight: 600;
    transition: all 0.3s;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.filter-btn:hover { 
    background: #1a1a2e; 
    border-color: #e94560;
}
.filter-btn.active { 
    background: #e94560; 
    border-color: #e94560;
}
.video-card[data-series] { display: block; }
.video-card.hidden { display: none; }
"""

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
            <p>Every Star Trek and Star Wars film, edited down to only the spaceship sequences. Pure visual effects, no dialogue.</p>
        </div>
    </div>
    
    <div class="container">
        <div class="content">
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">{len(all_videos)}</div>
                    <div class="stat-label">Total Videos</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">{star_trek_count}</div>
                    <div class="stat-label">Star Trek Films</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">{star_wars_count}</div>
                    <div class="stat-label">Star Wars Films</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">10M+</div>
                    <div class="stat-label">Total Views</div>
                </div>
            </div>
            
            <h2 class="section-title">Video Library</h2>
            
            <div class="filter-tabs">
                <button class="filter-btn active" onclick="filterVideos('all')">All Videos</button>
                <button class="filter-btn" onclick="filterVideos('Star Trek')">Star Trek</button>
                <button class="filter-btn" onclick="filterVideos('Star Wars')">Star Wars</button>
            </div>
            
            <div class="video-grid" id="videoGrid">
'''

for video in all_videos:
    thumb_url = f"https://img.youtube.com/vi/{video['youtube_id']}/maxresdefault.jpg"
    html += f'''
                <a href="videos/{video['id']}.html" style="text-decoration: none; color: inherit;">
                    <div class="video-card" data-series="{video['series']}">
                        <div class="video-thumbnail">
                            <img src="{thumb_url}" alt="{video['title']}" loading="lazy">
                            <div class="play-button">▶</div>
                        </div>
                        <div class="video-info">
                            <div class="video-title">{video['title']}</div>
                            <div class="video-meta">{video['year']} • {video['runtime']}</div>
                            <div class="video-stats">
                                <span>{video['views']} views</span>
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
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560;">YouTube Channel</a>
        </p>
    </footer>
    
    <script>
    function filterVideos(series) {
        const cards = document.querySelectorAll('.video-card');
        const buttons = document.querySelectorAll('.filter-btn');
        
        // Update button states
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Filter cards
        cards.forEach(card => {
            if (series === 'all' || card.dataset.series === series) {
                card.parentElement.style.display = 'block';
            } else {
                card.parentElement.style.display = 'none';
            }
        });
        
        // Scroll to grid
        document.getElementById('videoGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    </script>
</body>
</html>
'''

with open(base / 'index.html', 'w') as f:
    f.write(html)

print("✅ Updated homepage with 22 videos")
print(f"   - {star_trek_count} Star Trek films")
print(f"   - {star_wars_count} Star Wars films")
print("   - Series filtering enabled")
print("   - Updated statistics")
