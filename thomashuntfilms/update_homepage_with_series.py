#!/usr/bin/env python3
"""
Update homepage to show all series with tabs
Remove series page - put everything on index.html
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load complete database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Load calculated stats
with open(base / 'category_stats.json') as f:
    stats = json.load(f)

# Load CSS from current index
current_index = open(base / 'index.html').read()
css = current_index.split('<style>')[1].split('</style>')[0]

# Enhanced navigation with series tabs
tab_css = """
nav {
    background: #1a1a2e;
    padding: 0;
    text-align: center;
    border-bottom: 3px solid #e94560;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
}
nav a, nav button {
    color: #fff;
    text-decoration: none;
    padding: 18px 24px;
    display: inline-block;
    transition: all 0.3s;
    font-weight: 600;
    font-size: 15px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-right: 1px solid #0a0a0a;
}
nav a:last-child, nav button:last-child {
    border-right: none;
}
nav a:hover, nav button:hover {
    background: #16213e;
}
nav a.active, nav button.active {
    background: #e94560;
    color: #fff;
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
    <title>Thomas Hunt Films - Ships Only Edits & Movie Remixes</title>
    <style>{css + tab_css}</style>
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">Ships Only Edits • Movie Remixes • Themed Supercuts</div>
        <div style="margin-top: 15px; font-size: 14px; color: #888;">
            <span style="color: #e94560; font-weight: 600;">''' + stats['grand_totals']['views_formatted'] + ''' total views</span> • 
            <span style="color: #e94560; font-weight: 600;">''' + stats['grand_totals']['comments_formatted'] + ''' comments</span> • 
            38 videos
        </div>
    </header>
    
    <nav>
        <a href="index.html">🏠 Home</a>
        <a href="#star-trek">⭐ Star Trek</a>
        <a href="#star-wars">🚀 Star Wars</a>
        <a href="#john-wick">🥋 John Wick</a>
        <a href="#movies">🎬 Movie Edits</a>
        <a href="#batman">🦇 Batman '66</a>
        <a href="#other">📽️ Other</a>
        <a href="stolen-channel-story.html">🤖 IG-88</a>
        <a href="press.html">📰 Press</a>
    </nav>
    
    <div class="container">
        <div class="content">
'''

# Helper function to create video card
def create_video_card(video):
    # Use movie poster if available, otherwise YouTube thumbnail
    if 'poster' in video:
        thumb = video['poster']
    else:
        thumb = f"https://img.youtube.com/vi/{video['youtube_id']}/maxresdefault.jpg"
    
    has_page = 'star-trek' in video.get('id', '')
    
    # Get metadata
    views = video.get('views', 'N/A')
    age = video.get('age', '')
    comments = video.get('comments', '')
    year = video.get('year', '')
    runtime = video.get('runtime', '')
    
    # Build stats line
    stats_parts = []
    if views:
        stats_parts.append(f'{views} views')
    if age:
        stats_parts.append(age)
    if comments:
        stats_parts.append(f'{comments} comments')
    
    stats_line = ' • '.join(stats_parts)
    
    if has_page:
        return f'''
                    <a href="videos/{video['id']}.html" style="text-decoration: none; color: inherit;">
                        <div class="video-card">
                            <div class="video-thumbnail">
                                <img src="{thumb}" alt="{video['title']}" loading="lazy">
                                <div class="play-button">▶</div>
                            </div>
                            <div class="video-info">
                                <div class="video-title">{video['title']}</div>
                                <div class="video-meta">{year} • {runtime}</div>
                                <div class="video-stats">{stats_line}</div>
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
                                <div class="video-meta">{year} • {runtime}</div>
                                <div class="video-stats">{stats_line}</div>
                            </div>
                        </div>
                    </a>
'''

# Star Trek Tab
html += '''
            <div id="star-trek" class="series-content">
                <h2 class="section-title">Star Trek (ships only)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    10 films • 1979-2002 • Complete film series<br>
                    <span style="color: #e94560; font-weight: 600;">''' + stats['categories']['Star Trek Ships Only']['total_views_formatted'] + ''' views • ''' + stats['categories']['Star Trek Ships Only']['total_comments_formatted'] + ''' comments</span>
                </p>
                <div class="video-grid">
'''

for video in categories['Star Trek Ships Only']:
    html += create_video_card(video)

html += '</div></div>'

# Star Wars Tab
html += '''
            <div id="star-wars" class="series-content">
                <h2 class="section-title">Star Wars (ships only)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    3 films • Original trilogy<br>
                    <span style="color: #e94560; font-weight: 600;">''' + stats['categories']['Star Wars Ships Only']['total_views_formatted'] + ''' views • ''' + stats['categories']['Star Wars Ships Only']['total_comments_formatted'] + ''' comments</span>
                </p>
                <div class="video-grid">
'''

for video in categories['Star Wars Ships Only']:
    html += create_video_card(video)

html += '</div></div>'

# John Wick Tab
html += '''
            <div id="john-wick" class="series-content">
                <h2 class="section-title">John Wick (Gun-Fu)</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    4 videos • Action sequences from the John Wick trilogy<br>
                    <span style="color: #e94560; font-weight: 600;">''' + stats['categories']['John Wick Gun-Fu']['total_views_formatted'] + ''' views • ''' + stats['categories']['John Wick Gun-Fu']['total_comments_formatted'] + ''' comments</span>
                </p>
                <div class="video-grid">
'''

for video in categories['John Wick Gun-Fu']:
    html += create_video_card(video)

html += '</div></div>'

# Movie Edits Tab
html += '''
            <div id="movies" class="series-content">
                <h2 class="section-title">Movie Edits</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    9 videos • Ships Only, Silent, Parodies, Sports, Remixes<br>
                    <span style="color: #e94560; font-weight: 600;">''' + stats['categories']['Movie Remixes']['total_views_formatted'] + ''' views • ''' + stats['categories']['Movie Remixes']['total_comments_formatted'] + ''' comments</span>
                </p>
                <div class="video-grid">
'''

for video in categories['Movie Remixes']:
    html += create_video_card(video)

html += '</div></div>'

# Batman '66 Tab
batman_stats = stats['categories']["Batman '66 Edits"]
html += '''
            <div id="batman" class="series-content">
                <h2 class="section-title">Batman '66</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    5 videos • Classic TV series remixes<br>
                    <span style="color: #e94560; font-weight: 600;">''' + batman_stats['total_views_formatted'] + ''' views • ''' + batman_stats['total_comments_formatted'] + ''' comments</span>
                </p>
                <div class="video-grid">
'''

for video in categories["Batman '66 Edits"]:
    html += create_video_card(video)

html += '</div></div>'

# Other Edits Tab
html += '''
            <div id="other" class="series-content">
                <h2 class="section-title">Other Edits</h2>
                <p style="text-align: center; color: #888; margin-bottom: 30px;">
                    6 videos • Tributes, Music Remixes & More<br>
                    <span style="color: #e94560; font-weight: 600;">''' + stats['categories']['Other Edits']['total_views_formatted'] + ''' views • ''' + stats['categories']['Other Edits']['total_comments_formatted'] + ''' comments</span>
                </p>
                <div class="video-grid">
'''

for video in categories['Other Edits']:
    html += create_video_card(video)

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
        // Handle hash navigation
        function showSection() {
            const hash = window.location.hash || '#star-trek';
            const sectionId = hash.substring(1);
            
            // Hide all sections
            document.querySelectorAll('.series-content').forEach(section => {
                section.classList.remove('active');
            });
            
            // Show target section
            const target = document.getElementById(sectionId);
            if (target) {
                target.classList.add('active');
            }
            
            // Update nav active state
            document.querySelectorAll('nav a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === hash) {
                    link.classList.add('active');
                }
            });
        }
        
        // Show correct section on load
        showSection();
        
        // Show correct section on hash change
        window.addEventListener('hashchange', showSection);
    </script>
</body>
</html>
'''

# Save new index
with open(base / 'index.html', 'w') as f:
    f.write(html)

# Delete old series page
series_page = base / 'series.html'
if series_page.exists():
    series_page.unlink()
    print("🗑️  Deleted series.html")

print("✅ Updated homepage with series tabs!")
print("   - All 5 series tabs on homepage")
print("   - Removed separate series page")
print("   - Navigation simplified")
print("\n💾 Saved to: index.html")
