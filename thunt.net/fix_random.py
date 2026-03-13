#!/usr/bin/env python3
"""
Generate improved random page with working button
"""
import json
from pathlib import Path

# Load content
content_file = Path(__file__).parent / "content.json"
with open(content_file) as f:
    all_content = json.load(f)

css_file = Path(__file__).parent / "generate_html.py"
css = open(css_file).read().split('css = """')[1].split('"""')[0]

html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Random - Thunt.net</title>
<style>{css}
.random-type {{
    font-size: 14px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 15px;
}}
</style></head><body><div class="container">
<header><h1>Thunt.net</h1><div class="tagline">Inform the masses</div></header>
<div class="tabs">
<a href="index.html" class="tab">Blog Posts</a>
<a href="links.html" class="tab">Net Interest</a>
<a href="messages.html" class="tab">Messages</a>
<a href="dvds.html" class="tab">DVD Collection</a>
<a href="reviews.html" class="tab">Reviews</a>
<a href="random.html" class="tab active">Random</a>
</div><div class="content">
<h2 class="section-title">Random Content</h2>

<div class="random-box">
<div id="random-type" class="random-type"></div>
<div id="random-content" class="random-content">
<p style="font-size: 18px; color: #666;">Click the button below to see random content from Thunt.net archives</p>
<p style="font-size: 14px; color: #999; margin-top: 15px;">Blog posts • Messages • Reviews • Quotes</p>
</div>
<button class="random-btn" onclick="showRandom()">🎲 Show Random Content</button>
</div>

</div>
<footer><p>Thunt.net - Thomas Hunt (2000-2001)</p>
<p style="margin-top: 10px;">Random from 335 items</p></footer>
</div>
<script>
const allContent = {json.dumps(all_content)};

function showRandom() {{
    if (!allContent || allContent.length === 0) {{
        alert('No content loaded!');
        return;
    }}
    
    const item = allContent[Math.floor(Math.random() * allContent.length)];
    const typeBox = document.getElementById('random-type');
    const box = document.getElementById('random-content');
    let html = '';
    let type = '';
    
    if (item.type === 'post') {{
        type = '📝 Blog Post';
        const summary = item.data.summary || 'No summary available';
        const story = item.data.story ? item.data.story.substring(0, 300) : summary;
        html = `<h3 style="color: #800020; margin-bottom: 15px; font-size: 26px;">${{item.data.headline}}</h3>
        <p style="font-style: italic; color: #666; background: #fff8dc; padding: 15px; border-left: 4px solid #800020; margin: 15px 0;">${{summary}}</p>
        <p style="line-height: 1.7; font-size: 15px;">${{story.replace(/\\n/g, '<br>')}}</p>`;
    }} else if (item.type === 'msg') {{
        type = '💬 Quick Message';
        html = `<p style="font-size: 24px; font-style: italic; line-height: 1.6; color: #800020;">"${{item.data.msg}}"</p>`;
    }} else if (item.type === 'rev') {{
        type = '⭐ Movie Review';
        const rating = parseInt(item.data.rating) || 3;
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        html = `<h3 style="color: #800020; font-size: 28px; margin-bottom: 10px;">${{item.data.title}} (${{item.data.year}})</h3>
        <div style="color: #ffd700; font-size: 28px; margin: 15px 0;">${{stars}}</div>
        <div style="font-size: 14px; color: #666; margin-bottom: 15px;">Directed by ${{item.data.creator}}</div>
        <div style="background: #fff8dc; padding: 15px; border-left: 4px solid #800020; margin: 15px 0;">
            <strong>Plot:</strong> ${{item.data.plot}}
        </div>
        <div style="margin-top: 15px; line-height: 1.7;">
            <strong>Opinion:</strong> ${{item.data.opinion.substring(0, 250)}}...
        </div>`;
    }} else if (item.type === 'quote') {{
        type = '💭 Random Quote';
        html = `<p style="font-size: 26px; font-style: italic; color: #800020; line-height: 1.6;">"${{item.data.quote}}"</p>`;
    }}
    
    typeBox.innerHTML = type;
    box.innerHTML = html;
}}

// Show random content on page load
window.addEventListener('load', showRandom);
</script>
</body></html>'''

with open(Path(__file__).parent / 'random.html', 'w') as f:
    f.write(html)

print("✅ random.html updated with working button!")
print(f"✅ Embedded {len(all_content)} content items in page")
