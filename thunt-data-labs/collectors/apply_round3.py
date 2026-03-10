#!/usr/bin/env python3.12
"""Apply batch UI changes to dashboarder index.html - Round 3"""
import re

f = '/Users/curiobot/Sites/1n2.org/dashboarder/index.html'
html = open(f).read()
orig = len(html)
changes = []

# 1. BIGGER FONTS - increase base font size and briefing font
html = html.replace('body{font-family:\'DM Sans\',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:15px}',
                     'body{font-family:\'DM Sans\',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:16px}')
changes.append('base font 15->16')

# Increase .ns briefing text size
html = html.replace('.ns{padding:10px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1rem;',
                     '.ns{padding:12px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.05rem;')
changes.append('briefing font bigger')

# Increase .it item font
html = html.replace('.it{padding:4px 0;font-size:.88rem;',
                     '.it{padding:5px 0;font-size:.95rem;')
changes.append('item font bigger')

# Bigger section headers
html = html.replace('.sh{padding:10px 14px;font-weight:600;font-size:.95rem;',
                     '.sh{padding:12px 14px;font-weight:600;font-size:1.05rem;')
changes.append('section header bigger')

# Better mobile responsive
html = html.replace("@media(max-width:900px){.cols2,.cols3{grid-template-columns:1fr}}",
                     "@media(max-width:900px){.cols2,.cols3{grid-template-columns:1fr}.gcard-row{gap:6px}.gcard{min-width:70px;padding:6px 8px}.gcard-val{font-size:1rem}}")
changes.append('mobile responsive')


# 2. REMOVE COMMENTS TAB, move comments to Personal
html = html.replace('<div class="tab" onclick="sw(\'comments\',this)">💬 Comments</div>\n', '')
html = html.replace('<div class="tab" onclick="sw(\'comments\',this)">💬 Comments</div>', '')
changes.append('remove comments tab')

# 3. SUMMARIZE ENTERTAINMENT - already done in previous patch, verify
if 'Entertainment' not in html:
    changes.append('entertainment: SKIP already missing')
else:
    changes.append('entertainment: present')

# 4. SUMMARIZE CITY NEWS - already done, verify
if 'cbriefs' in html:
    changes.append('city news summary: present')
else:
    changes.append('city news summary: MISSING')

# 5. THEATER - sort by distance (already sorted, just verify base coords)
if '51.5120' in html and '0.1210' in html:
    changes.append('theater distance: ok')

# 6. ADD COMMENTS TO PERSONAL - insert after Reading section
# Find where pers2 items get pushed
old_pers = "if(title.includes('Reading')||title.includes('YouTube')){pers2.push(s.outerHTML);return;}"
new_pers = """if(title.includes('Reading')||title.includes('YouTube')){pers2.push(s.outerHTML);return;}
      // Comments moved to Personal tab
      if(title.includes('Comments')){return;}"""
# Note: we need to add inline comments loading to personal panel
# We'll add it after the personal panel renders
html = html.replace(old_pers, new_pers)
changes.append('skip comments section in briefing')

# Add comments section to personal panel rendering
old_personal_render = """document.getElementById('pc').innerHTML='<div class="cols2"><div>'+pers1.join('')+'</div><div>'+pers2.join('')+'</div></div>';"""
new_personal_render = """document.getElementById('pc').innerHTML='<div class="cols2"><div>'+pers1.join('')+'</div><div>'+pers2.join('')+'<div class="sec"><div class="sh" onclick="t(this)">💬 Recent Comments</div><div class="sb"><div id="pc-comments">Loading...</div></div></div></div></div>';
    // Load comments into personal tab
    loadPersonalComments();"""
html = html.replace(old_personal_render, new_personal_render)
changes.append('comments in personal tab')


# 7. Add loadPersonalComments function before loadMedia
old_load_media = "// MEDIA"
new_load_media = """// Personal Comments (9 most recent)
async function loadPersonalComments(){
  try{const r=await fetch('data/comments.json');let c=await r.json();
    c.sort((a,b)=>(b.published_at||b.date||'').localeCompare(a.published_at||a.date||''));
    c=c.slice(0,9);let h='';
    c.forEach(x=>{const url='https://youtube.com/watch?v='+(x.video_id||'');
      const txt=(x.text||'').substring(0,180);
      h+='<div style="padding:6px 0;border-bottom:1px solid rgba(30,41,59,.25);font-size:.9rem">';
      h+='<b style="color:var(--accent)">'+((x.author||'Anon'))+'</b> ';
      h+=txt;
      h+='<div style="font-size:.72rem;color:var(--muted)">'+(x.published_at?x.published_at.substring(0,10)+' · ':'')+
        '<a href="'+url+'" target="_blank">'+(x.video_title||'').substring(0,35)+'</a></div>';
      h+='</div>';});
    const el=document.getElementById('pc-comments');if(el)el.innerHTML=h;
  }catch(e){const el=document.getElementById('pc-comments');if(el)el.textContent='Could not load';}
}
// MEDIA"""
html = html.replace(old_load_media, new_load_media)
changes.append('personal comments function')

# 8. BOOK TITLES - fix width for long titles in Media
# Add CSS for book title wrapping
html = html.replace('.mi span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
                     '.mi span{overflow:hidden;text-overflow:ellipsis;white-space:normal;max-width:calc(100% - 60px)}')
changes.append('book title wrapping')

# 9. PREVIOUS BRIEFINGS LINK - add to footer
old_footer = "30 articles"
if old_footer in html:
    html = html.replace(old_footer, '<a href="/dashboarder/archive/">Previous Briefings</a> · 30 articles')
    changes.append('previous briefings link')


# 10. MUSEUMS - move Paris after New Museums Opening
# This is in the loadMuseums function - reorder cities so Paris comes after new museums
# We can do this by changing the city order in the rendering
old_cities_loop = "for(const[city,shows] of Object.entries(cities).sort()){"
new_cities_loop = """const cityOrder=['London','Amsterdam','Paris'];
    const sortedCities=Object.entries(cities).sort((a,b)=>{
      const ai=cityOrder.indexOf(a[0]),bi=cityOrder.indexOf(b[0]);
      return (ai===-1?99:ai)-(bi===-1?99:bi);
    });
    for(const[city,shows] of sortedCities){"""
html = html.replace(old_cities_loop, new_cities_loop)
changes.append('museum city order: London, Amsterdam, Paris')

# SAVE
open(f, 'w').write(html)
print(f'Saved: {len(html)} chars (was {orig})')
print(f'Changes ({len(changes)}):')
for c in changes:
    print(f'  ✅ {c}')
