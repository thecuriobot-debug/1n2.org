#!/usr/bin/env python3
"""
Generate updated Net Interest page with:
- Stats at top
- Archived links tab (with local links)
- Broken links tab
"""
import json
from pathlib import Path
from datetime import datetime

base_dir = Path(__file__).parent / "net_interest"

# Load results
with open(base_dir / "archive_results.json") as f:
    stats = json.load(f)

with open(base_dir / "successful_links.json") as f:
    successful = json.load(f)

with open(base_dir / "broken_links.json") as f:
    broken = json.load(f)

def fmt_ts(ts):
    if not ts or len(str(ts)) < 8: return ("Unknown", 2000)
    s = str(ts)
    try:
        y, m, d = s[0:4], s[4:6], s[6:8]
        dt = datetime(int(y), int(m), int(d))
        return (dt.strftime("%b %d, %Y"), int(y))
    except: return (s, 2000)

# Group by year
succ_by_year = {}
for link in successful:
    _, year = fmt_ts(link['date'])
    succ_by_year.setdefault(year, []).append(link)

broken_by_year = {}
for link in broken:
    _, year = fmt_ts(link['date'])
    broken_by_year.setdefault(year, []).append(link)

# Load CSS
css_file = Path(__file__).parent / "generate_html.py"
css = open(css_file).read().split('css = """')[1].split('"""')[0]

# Add subtab styles
css += """
.subtabs { background: #600010; padding: 0; display: flex; border-bottom: 2px solid #800020; }
.subtab { flex: 1; padding: 12px 15px; background: #600010; color: #f5deb3; text-align: center; cursor: pointer; border-right: 1px solid #800020; font-size: 14px; transition: all 0.3s; }
.subtab:hover { background: #800020; }
.subtab.active { background: #f5deb3; color: #800020; font-weight: bold; }
.subtab-content { display: none; }
.subtab-content.active { display: block; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 30px 0; }
.stat-box { background: #fff8dc; border-left: 5px solid #800020; padding: 20px; text-align: center; }
.stat-number { font-size: 36px; font-weight: bold; color: #800020; margin-bottom: 5px; }
.stat-label { font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
.archived-badge { display: inline-block; background: #28a745; color: white; padding: 4px 10px; font-size: 11px; border-radius: 3px; margin-left: 10px; font-weight: bold; }
.broken-badge { display: inline-block; background: #dc3545; color: white; padding: 4px 10px; font-size: 11px; border-radius: 3px; margin-left: 10px; font-weight: bold; }
"""

html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Net Interest - Thunt.net</title>
<style>{css}</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab active">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab">Random</a>
</div>

<div class="content">
<h2 class="section-title">Net Interest ({stats['total']} links)</h2>

<div class="stats-grid">
<div class="stat-box">
<div class="stat-number">{stats['successful']}</div>
<div class="stat-label">Archived</div>
<div style="font-size: 11px; color: #28a745; margin-top: 5px;">{stats['successful']/stats['total']*100:.1f}%</div>
</div>

<div class="stat-box">
<div class="stat-number">{stats['broken']}</div>
<div class="stat-label">Broken Links</div>
<div style="font-size: 11px; color: #dc3545; margin-top: 5px;">{stats['broken']/stats['total']*100:.1f}%</div>
</div>

<div class="stat-box">
<div class="stat-number">{stats['images']}</div>
<div class="stat-label">Images Saved</div>
</div>

<div class="stat-box">
<div class="stat-number">{stats['bytes']/1024/1024:.1f}MB</div>
<div class="stat-label">Total Size</div>
</div>
</div>

<div class="subtabs">
<div class="subtab active" onclick="showSubtab('archived')">
Archived Links ({stats['successful']})
</div>
<div class="subtab" onclick="showSubtab('broken')">
Broken Links ({stats['broken']})
</div>
</div>

<!-- Archived Links -->
<div id="archived" class="subtab-content active">
<p style="margin: 20px 0; font-size: 15px; color: #666;">Successfully archived webpages with local copies</p>
'''

for year in sorted(succ_by_year.keys()):
    html += f'<div class="year-sep">{year}</div>'
    for link in succ_by_year[year]:
        date_str, _ = fmt_ts(link['date'])
        local_url = link['local_path']
        
        html += f'''<div class="link-item">
<div class="link-title">
{link['headline']}
<span class="archived-badge">✓ ARCHIVED</span>
</div>
<div style="font-size: 13px; color: #666; margin: 5px 0;">{date_str}</div>
<div style="font-size: 14px; margin: 8px 0;">{link['summary']}</div>
<div style="margin-top: 10px;">
<a href="{local_url}" class="link-url" style="background: #28a745; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
📄 View Archived Copy
</a>
<span style="font-size: 12px; color: #999; margin-left: 15px;">
Original: <a href="http://{link['link']}" target="_blank" style="color: #666;">{link['link']}</a>
</span>
<span style="font-size: 11px; color: #999; margin-left: 15px;">
{link['images']} images • {link['size']:,} bytes
</span>
</div>
</div>'''

html += '</div>'

# Broken Links
html += f'''
<!-- Broken Links -->
<div id="broken" class="subtab-content">
<p style="margin: 20px 0; font-size: 15px; color: #dc3545;">These links are no longer accessible (404, timeout, or DNS failure)</p>
'''

for year in sorted(broken_by_year.keys()):
    html += f'<div class="year-sep">{year} - Broken Links</div>'
    for link in broken_by_year[year]:
        date_str, _ = fmt_ts(link['date'])
        
        html += f'''<div class="link-item" style="background: #ffe6e6; opacity: 0.7;">
<div class="link-title" style="color: #666;">
{link['headline']}
<span class="broken-badge">✗ BROKEN</span>
</div>
<div style="font-size: 13px; color: #666; margin: 5px 0;">{date_str}</div>
<div style="font-size: 14px; margin: 8px 0; color: #666;">{link['summary']}</div>
<div style="margin-top: 10px;">
<span style="font-size: 12px; color: #999;">
Original URL (broken): <span style="text-decoration: line-through;">{link['link']}</span>
</span>
</div>
</div>'''

html += '''</div>

</div>

<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">Links archived: ''' + datetime.now().strftime("%B %d, %Y") + '''</p>
</footer>
</div>

<script>
function showSubtab(tabName) {
    // Hide all subtab contents
    document.querySelectorAll('.subtab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.subtab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected subtab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

</body></html>'''

# Save
output_file = Path(__file__).parent / "links.html"
with open(output_file, 'w') as f:
    f.write(html)

print(f"✅ Generated: {output_file}")
print(f"\n📊 Page includes:")
print(f"   - Stats: {stats['successful']} archived, {stats['broken']} broken")
print(f"   - Archived tab: {stats['successful']} links with local copies")
print(f"   - Broken tab: {stats['broken']} inaccessible links")
print(f"   - {stats['images']} images saved")
print(f"   - {stats['bytes']/1024/1024:.1f}MB total")
print(f"\n🎉 Net Interest page updated!")
