#!/usr/bin/env python3
"""
Create 5-tab series page with REAL video previews for ALL categories
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load complete database with all YouTube IDs
with open(base / 'all_videos_complete.json') as f:
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
        <div class="tagline">Complete Video Collection • Real Previews</div>
    </header>
    
    <nav>
        <a href="index.html">Home</a>
        <a href="series.html">Series</a>
        <a href="press.html">Press</a>
    </nav>
    
    <div class="container">
        <div class="content">
            <div class="series-tabs">
                <button class="series-tab active" onclick="showSeries('star-trek')">
                    ⭐ Star Trek<br><span style="font-size: 11px; opacity: 0.8;">10 Films</span>
                </button>
                <button class="series-tab" onclick="showSeries('star-wars')">
                    🚀 Star Wars<br><span style="font-size: 11px; opacity: 0.8;">3 Films</span>
                </button>
                <button class="series-tab" onclick="showSeries('movies')">
                    🎬 Movie Edits<br><span style="font-size: 11px; opacity: 0.8;">13 Videos</span>
                </button>
                <button class="series-tab" onclick="showSeries('batman')">
                    🦇 Batman '66<br><span style="font-size: 11px; opacity: 0.8;">5 Videos</span>
                </button>
                <button class="series-tab" onclick="showSeries('other')">
                    📽️ Other<br><span style="font-size: 11px; opacity: 0.8;">6 Videos</span>
                </button>
            </div>
'''

# Helper function to create video card
def create_video_card(video, link_prefix='videos/'):
    thumb = f"https://img.youtube.com/vi/{video['youtube_id']}/maxresdefault.jpg"
    has_page = 'star-trek' in video.get('id', '')
    
    if has_page:
        return f'''
                    <a href="{link_prefix}{video['id']}.html" style="text-decoration: none; color: inherit;">
                        <div class="video-card">
                            <div class="video-thumbnail">
                                <img src="{thumb}" alt="{video['title']}" loading="lazy">
                                <div class="play-button">▶</div>
                            </div>
                            <div class="video-info">
                                <div class="video-title">{video['title']}</div>
                                <div class="video-meta">{video.get('year', '')} • {video['runtime']}</div>
                                <div class="video-stats">
                                    <span>{video.get('views', 'N/A')} views</span>
                                </div>
                            </div>
                        </div>
                    </a>
'''
    else:
        return f'''
                    <a href="https://www.youtube.com/watch?v={video['youtube_id']}" target="_blank" style="text-decoration: none; color: inherit;">
                        <div class="video-card">
                            <div class="video-thumbnail">
                                <img src="{thumb}" alt="{video['title']}" loading="lazy">
                                <div class="play-button">▶</div>
                            </div>
                            <div class="video-info">
                                <div class="video-title">{video['title']}</div>
                                <div class="video-meta">{video.get('year', '')} • {video['runtime']}</div>
                                <div class="video-stats">
                                    <span>{video.get('views', 'N/A')} views</span>
                                </div>
                            </div>
                        </div>
                    </a>
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
    html += create_video_card(video)

html += '</div></div>'

# Star Wars Tab
html += '''
            <div id="star-wars-content" class="series-content">
                <h2 class="section-title">Star Wars Ships Only (3 Films)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Original trilogy only • Ships Only edits
                </p>
                <div class="video-grid">
'''

for video in categories['Star Wars Ships Only']:
    html += create_video_card(video, '')

html += '</div></div>'

# Movie Edits Tab
html += '''
            <div id="movies-content" class="series-content">
                <h2 class="section-title">Movie Remix Edits (13 Videos)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Themed edits • Gun-Fu, Ships Only, Silent, Parodies, Sports, Remixes
                </p>
                <div class="video-grid">
'''

for video in categories['Movie Remixes']:
    html += create_video_card(video, '')

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
    html += create_video_card(video, '')

html += '</div></div>'

# Other Edits Tab
html += '''
            <div id="other-content" class="series-content">
                <h2 class="section-title">Other Edits (6 Videos)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Tributes, Music Remixes & More
                </p>
                <div class="video-grid">
'''

for video in categories['Other Edits']:
    html += create_video_card(video, '')

html += '''
                </div>
            </div>
        </div>
    </div>
    
    <footer>
        <p>Thomas Hunt Films © 2015-2026</p>
        <p style="margin-top: 10px;">
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560;">YouTube Channel</a> • 
            37 Videos with Real Previews!
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

print("✅ Created 5-tab series page with REAL video previews!")
print("   ⭐ Star Trek (10 films - linked to pages)")
print("   🚀 Star Wars (3 films - YouTube thumbnails)")
print("   🎬 Movie Edits (13 videos - YouTube thumbnails)")
print("   🦇 Batman '66 (5 videos - YouTube thumbnails)")
print("   📽️ Other (6 videos - YouTube thumbnails)")
print("\n🎨 All tabs show real YouTube video thumbnails!")
print("💾 Saved to: series.html")
