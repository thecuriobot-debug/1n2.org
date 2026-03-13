#!/usr/bin/env python3
"""
Create Batman '68-style tabbed series interface
Organize the 10 Star Trek films into logical series tabs
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load verified videos
with open(base / 'videos_verified.json') as f:
    all_videos = json.load(f)

# Organize into series
series_data = {
    'TOS Films (1979-1991)': {
        'description': 'The Original Series crew films',
        'films': [
            'Star Trek: The Motion Picture',
            'Star Trek II: The Wrath of Khan',
            'Star Trek III: The Search for Spock',
            'Star Trek IV: The Voyage Home',
            'Star Trek V: The Final Frontier',
            'Star Trek VI: The Undiscovered Country'
        ],
        'videos': [v for v in all_videos if v['year'] <= 1991]
    },
    'TNG Films (1994-2002)': {
        'description': 'The Next Generation crew films',
        'films': [
            'Star Trek Generations',
            'Star Trek: First Contact',
            'Star Trek: Insurrection',
            'Star Trek: Nemesis'
        ],
        'videos': [v for v in all_videos if 1994 <= v['year'] <= 2002]
    }
}

# Create tabbed series page
css = open(base / 'index.html').read().split('<style>')[1].split('</style>')[0]

# Add tab styles
tab_css = """
.series-tabs {
    display: flex;
    justify-content: center;
    gap: 0;
    margin: 40px auto;
    max-width: 800px;
    border-bottom: 3px solid #e94560;
}
.series-tab {
    flex: 1;
    padding: 15px 25px;
    background: #16213e;
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 16px;
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
.series-header {
    text-align: center;
    margin-bottom: 40px;
}
.series-subtitle {
    color: #888;
    font-size: 18px;
    margin-top: 10px;
}
"""

full_css = css + tab_css

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Star Trek Films - Ships Only Series</title>
    <style>{full_css}</style>
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">Star Trek Ships Only • Complete Collection</div>
    </header>
    
    <nav>
        <a href="index.html">Home</a>
        <a href="series.html">Browse by Series</a>
        <a href="press.html">Press</a>
    </nav>
    
    <div class="container">
        <div class="content">
            <div class="series-header">
                <h1 style="color: #e94560; font-size: 48px; margin-bottom: 15px;">Complete Star Trek Collection</h1>
                <p class="series-subtitle">10 Films • 2 Series • Ships Only Edits</p>
            </div>
            
            <div class="series-tabs">
                <button class="series-tab active" onclick="showSeries('tos')">
                    TOS Era<br><span style="font-size: 12px; opacity: 0.8;">(1979-1991)</span>
                </button>
                <button class="series-tab" onclick="showSeries('tng')">
                    TNG Era<br><span style="font-size: 12px; opacity: 0.8;">(1994-2002)</span>
                </button>
            </div>
'''

# TOS Series Content
html += '''
            <div id="tos-content" class="series-content active">
                <h2 class="section-title">The Original Series Films (6 films)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Kirk, Spock, and the Enterprise crew • 1979-1991
                </p>
                <div class="video-grid">
'''

for video in series_data['TOS Films (1979-1991)']['videos']:
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
                                    <span>TOS Era</span>
                                    <span>Verified</span>
                                </div>
                            </div>
                        </div>
                    </a>
'''

html += '''
                </div>
            </div>
'''

# TNG Series Content
html += '''
            <div id="tng-content" class="series-content">
                <h2 class="section-title">The Next Generation Films (4 films)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    Picard, Data, and the Enterprise-D/E crew • 1994-2002
                </p>
                <div class="video-grid">
'''

for video in series_data['TNG Films (1994-2002)']['videos']:
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
                                    <span>TNG Era</span>
                                    <span>Verified</span>
                                </div>
                            </div>
                        </div>
                    </a>
'''

html += '''
                </div>
            </div>
        </div>
    </div>
    
    <footer>
        <p>Thomas Hunt Films © 2015-2026</p>
        <p style="margin-top: 10px;">
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560;">YouTube Channel</a>
        </p>
    </footer>
    
    <script>
    function showSeries(series) {
        // Hide all content
        document.querySelectorAll('.series-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active from all tabs
        document.querySelectorAll('.series-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected content
        document.getElementById(series + '-content').classList.add('active');
        event.target.closest('.series-tab').classList.add('active');
    }
    </script>
</body>
</html>
'''

# Save series page
with open(base / 'series.html', 'w') as f:
    f.write(html)

print("✅ Created Batman '68-style series page!")
print(f"   - TOS Era: {len(series_data['TOS Films (1979-1991)']['videos'])} films")
print(f"   - TNG Era: {len(series_data['TNG Films (1994-2002)']['videos'])} films")
print(f"   - Tabbed navigation")
print(f"   - Saved to: series.html")
