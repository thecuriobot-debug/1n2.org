#!/usr/bin/env python3
"""
Create 5-tab comprehensive series page
Star Trek | Star Wars | Movie Edits | Batman '66 | Other
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load categorized data
with open(base / 'all_videos_categorized.json') as f:
    categories = json.load(f)

# Load CSS
css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

# Enhanced tab styles
tab_css = """
.series-tabs {
    display: flex;
    justify-content: center;
    gap: 0;
    margin: 40px auto;
    max-width: 1000px;
    border-bottom: 3px solid #e94560;
    flex-wrap: wrap;
}
.series-tab {
    flex: 1;
    min-width: 150px;
    padding: 15px 20px;
    background: #16213e;
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.3s;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-right: 1px solid #0a0a0a;
}
.series-tab:last-child {
    border-right: none;
}
.series-tab:hover {
    background: #1a1a2e;
}
.series-tab.active {
    background: #e94560;
    transform: translateY(-3px);
}
.series-content {
    display: none;
    animation: fadeIn 0.5s;
}
.series-content.active {
    display: block;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.category-badge {
    display: inline-block;
    background: #e94560;
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 10px;
}
"""

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Series - Thomas Hunt Films</title>
    <style>{css + tab_css}</style>
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">Complete Video Collection • Organized by Series</div>
    </header>
    
    <nav>
        <a href="index.html">Home</a>
        <a href="series.html">Browse by Series</a>
        <a href="press.html">Press</a>
    </nav>
    
    <div class="container">
        <div class="content">
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #e94560; font-size: 48px; margin-bottom: 15px;">Complete Collection</h1>
                <p style="color: #888; font-size: 18px;">37 Videos • 5 Categories • All Edits</p>
            </div>
            
            <div class="series-tabs">
                <button class="series-tab active" onclick="showSeries('star-trek')">
                    ⭐ Star Trek<br><span style="font-size: 11px; opacity: 0.8;">10 Films</span>
                </button>
                <button class="series-tab" onclick="showSeries('star-wars')">
                    🚀 Star Wars<br><span style="font-size: 11px; opacity: 0.8;">4 Films</span>
                </button>
                <button class="series-tab" onclick="showSeries('movies')">
                    🎬 Movie Edits<br><span style="font-size: 11px; opacity: 0.8;">8 Videos</span>
                </button>
                <button class="series-tab" onclick="showSeries('batman')">
                    🦇 Batman '66<br><span style="font-size: 11px; opacity: 0.8;">5 Videos</span>
                </button>
                <button class="series-tab" onclick="showSeries('other')">
                    📽️ Other<br><span style="font-size: 11px; opacity: 0.8;">10 Videos</span>
                </button>
            </div>
'''

# Star Trek Tab
html += '''
            <div id="star-trek-content" class="series-content active">
                <h2 class="section-title">Star Trek Ships Only (10 Films)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Complete Star Trek film series • 1979-2002 • Ships Only edits
                </p>
                <div class="video-grid">
'''

for video in categories['Star Trek Ships Only']:
    thumb = f"https://img.youtube.com/vi/{video['youtube_id']}/maxresdefault.jpg"
    html += f'''
                    <a href="videos/{video['id']}.html" style="text-decoration: none; color: inherit;">
                        <div class="video-card">
                            <div class="video-thumbnail">
                                <img src="{thumb}" alt="{video['title']}" loading="lazy">
                                <div class="play-button">▶</div>
                            </div>
                            <div class="video-info">
                                <div class="video-title">{video['title']}</div>
                                <div class="video-meta">{video['year']} • {video['runtime']}</div>
                            </div>
                        </div>
                    </a>
'''

html += '</div></div>'

# Star Wars Tab
html += '''
            <div id="star-wars-content" class="series-content">
                <h2 class="section-title">Star Wars Ships Only (4 Films)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Classic Star Wars trilogy + Spaceballs • Ships Only edits
                </p>
                <div class="video-grid">
'''

for video in categories['Star Wars Ships Only']:
    html += f'''
                    <div class="video-card">
                        <div style="background: #1a1a2e; padding: 80px 20px; text-align: center; border-radius: 8px;">
                            <h3 style="color: #e94560; margin-bottom: 10px;">{video['title']}</h3>
                            <p style="color: #888;">{video['runtime']} • {video['views']} views</p>
                            <p style="color: #666; margin-top: 15px; font-size: 13px;">Video page coming soon</p>
                        </div>
                    </div>
'''

html += '</div></div>'

# Movie Edits Tab
html += '''
            <div id="movies-content" class="series-content">
                <h2 class="section-title">Movie Remix Edits (8 Videos)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Themed edits from popular films • Gun-Fu, Ships Only, Silent Versions
                </p>
                <div class="video-grid">
'''

for video in categories['Movie Remixes']:
    html += f'''
                    <div class="video-card">
                        <div style="background: #1a1a2e; padding: 60px 20px; text-align: center; border-radius: 8px;">
                            <span class="category-badge">{video['category']}</span>
                            <h3 style="color: #fff; margin-bottom: 10px; font-size: 16px;">{video['title']}</h3>
                            <p style="color: #888;">{video['views']} views</p>
                        </div>
                    </div>
'''

html += '</div></div>'

# Batman '66 Tab
html += '''
            <div id="batman-content" class="series-content">
                <h2 class="section-title">Batman '66 Edits (5 Videos)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Classic 1960s Batman TV series remixes
                </p>
                <div class="video-grid">
'''

for video in categories["Batman '66 Edits"]:
    html += f'''
                    <div class="video-card">
                        <div style="background: #1a1a2e; padding: 60px 20px; text-align: center; border-radius: 8px;">
                            <span class="category-badge">Batman '66</span>
                            <h3 style="color: #fff; margin-bottom: 10px; font-size: 16px;">{video['title']}</h3>
                            <p style="color: #888;">{video['views']} views</p>
                        </div>
                    </div>
'''

html += '</div></div>'

# Other Edits Tab
html += '''
            <div id="other-content" class="series-content">
                <h2 class="section-title">Other Edits (10 Videos)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Tributes, Music Remixes, Sports Edits & More
                </p>
                <div class="video-grid">
'''

for video in categories['Other Edits']:
    html += f'''
                    <div class="video-card">
                        <div style="background: #1a1a2e; padding: 60px 20px; text-align: center; border-radius: 8px;">
                            <span class="category-badge">{video['category']}</span>
                            <h3 style="color: #fff; margin-bottom: 10px; font-size: 16px;">{video['title']}</h3>
                            <p style="color: #888;">{video['views']} views</p>
                        </div>
                    </div>
'''

html += '''
                </div>
            </div>
        </div>
    </div>
    
    <footer>
        <p>Thomas Hunt Films © 2015-2026</p>
        <p style="margin-top: 10px;">
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560;">YouTube Channel</a> • 
            52 Total Videos
        </p>
    </footer>
    
    <script>
    function showSeries(series) {
        document.querySelectorAll('.series-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.series-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(series + '-content').classList.add('active');
        event.target.closest('.series-tab').classList.add('active');
    }
    </script>
</body>
</html>
'''

# Save
with open(base / 'series.html', 'w') as f:
    f.write(html)

print("✅ Created 5-tab comprehensive series page!")
print("   ⭐ Star Trek (10 films - with links)")
print("   🚀 Star Wars (4 films - placeholders)")
print("   🎬 Movie Edits (8 videos - placeholders)")
print("   🦇 Batman '66 (5 videos - placeholders)")
print("   📽️ Other (10 videos - placeholders)")
print("\n💾 Saved to: series.html")
