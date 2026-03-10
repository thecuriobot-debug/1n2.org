#!/usr/bin/env python3.12
"""Apply UI changes to dashboarder index.html"""
import re

f = '/Users/curiobot/Sites/1n2.org/dashboarder/index.html'
html = open(f).read()
orig_len = len(html)

# 1. Add gcard CSS before .ft{
gcard_css = """
/* Graphical info cards */
.gcard-row{display:flex;gap:8px;flex-wrap:wrap;padding:4px 0}
.gcard{flex:1;min-width:80px;background:rgba(30,41,59,.4);border-radius:8px;padding:8px 12px;text-align:center}
.gcard-label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600}
.gcard-val{font-family:'JetBrains Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--text);margin:2px 0}
.gcard-chg{font-size:.72rem;font-weight:600}
.gcard-chg.dn{color:var(--red)}.gcard-chg.up{color:var(--green)}
"""
html = html.replace('.ft{', gcard_css + '.ft{')
print(f'1. CSS: {"ok" if "gcard-row" in html else "FAIL"}')

# 2. Replace Crypto with graphical cards
html = html.replace(
    "let h='<div class=\"crypto-row\">';",
    "let h='<div class=\"gcard-row\">';"
)
html = html.replace(
    "if(btc)h+='<div class=\"crypto-item\"><b>BTC</b> $'+btc[1]+' <span class=\"chg '+(btc[2].startsWith('-')?'dn':'up')+'\">'+btc[2]+'</span></div>';",
    "if(btc)h+='<div class=\"gcard\"><div class=\"gcard-label\">BTC</div><div class=\"gcard-val\">$'+btc[1]+'</div><div class=\"gcard-chg '+(btc[2].startsWith('-')?'dn':'up')+'\">'+btc[2]+'</div></div>';"
)
html = html.replace(
    "if(eth)h+='<div class=\"crypto-item\"><b>ETH</b> $'+eth[1]+' <span class=\"chg '+(eth[2].startsWith('-')?'dn':'up')+'\">'+eth[2]+'</span></div>';",
    "if(eth)h+='<div class=\"gcard\"><div class=\"gcard-label\">ETH</div><div class=\"gcard-val\">$'+eth[1]+'</div><div class=\"gcard-chg '+(eth[2].startsWith('-')?'dn':'up')+'\">'+eth[2]+'</div></div>';"
)
html = html.replace(
    "if(cc)h+='<div class=\"crypto-item\"><b>Curio</b> '+parseFloat(cc[1]).toFixed(3)+' ETH</div>';",
    "if(cc)h+='<div class=\"gcard\"><div class=\"gcard-label\">CURIO</div><div class=\"gcard-val\">'+parseFloat(cc[1]).toFixed(3)+'</div><div class=\"gcard-chg\" style=\"color:var(--muted)\">ETH</div></div>';"
)
print(f'2. Crypto: {"ok" if "gcard-label\">BTC" in html else "FAIL"}')

# 3. Replace Weather with graphical cards
old_wx = "if(title.includes('Weather')){const wxs=s.querySelectorAll('.wx');let h='<div class=\"wx-row\">';wxs.forEach(w=>{h+='<div class=\"wx-item\"><b>'+(w.querySelector('.wx-city')?.textContent||'')+'</b> '+(w.querySelector('.wx-now')?.textContent||'')+'</div>';});h+='</div>';const sb=s.querySelector('.sb');if(sb)sb.innerHTML=h;col2.push(s.outerHTML);return;}"
new_wx = """if(title.includes('Weather')){const wxs=s.querySelectorAll('.wx');let h='<div class="gcard-row">';wxs.forEach(w=>{const city=w.querySelector('.wx-city')?.textContent||'';const now=w.querySelector('.wx-now')?.textContent||'';const temp=now.match(/(\\d+)\u00b0F/);const cond=now.replace(/\\d+\u00b0F\\s*/,'').trim();const icon=cond.includes('Sunny')||cond.includes('sunny')?'\u2600':cond.includes('Cloud')?'\u2601':cond.includes('Partly')?'\u26c5':'\u2600';h+='<div class="gcard"><div class="gcard-label">'+city+'</div><div class="gcard-val">'+(temp?temp[1]+'\u00b0':'')+'</div><div class="gcard-chg" style="color:var(--muted)">'+icon+' '+cond+'</div></div>';});h+='</div>';const sb=s.querySelector('.sb');if(sb)sb.innerHTML=h;col2.push(s.outerHTML);return;}
      // Entertainment: summarize as briefing
      if(title.includes('Entertainment')){const items=s.querySelectorAll('.it');let briefs=[];items.forEach(it=>{const a=it.querySelector('a');if(a){let t=a.textContent.trim();if(t.length>70)t=t.slice(0,70)+'\\u2026';briefs.push(t);}});const sb=s.querySelector('.sb');if(sb&&briefs.length)sb.innerHTML='<div class="ns" style="font-size:.88rem">'+briefs.join('. ')+'.</div>';col2.push(s.outerHTML);return;}"""
html = html.replace(old_wx, new_wx)
print(f'3. Weather: {"ok" if "gcard-row" in html and "Entertainment" in html else "FAIL"}')

# 4. Hide sports if all offseason — replace the condition
html = html.replace(
    "if(!hasRecent&&off.length===0){return;}",
    "if(!hasRecent){return;}"
)
html = html.replace(
    "const sb=s.querySelector('.sb');if(sb)sb.innerHTML=(hasRecent?active:'')+(off.length?'<div class=\"sport-group\">'+off.join('')+'</div>':'');col2.push(s.outerHTML);return;}",
    "const sb=s.querySelector('.sb');if(sb)sb.innerHTML=active;col2.push(s.outerHTML);return;}"
)
print(f'4. Sports: {"ok" if "if(!hasRecent){return;}" in html else "FAIL"}')

# 5. Summarize City News
html = html.replace(
    "else if(title.includes('City News')){cityNews=s.outerHTML;}",
    """else if(title.includes('City News')){const citems=s.querySelectorAll('.it');let cbriefs=[];citems.forEach(it=>{const a=it.querySelector('a')||it.querySelector('.il');if(a){let t=a.textContent.trim();if(t.length>70)t=t.slice(0,70)+'\\u2026';cbriefs.push(t);}});if(cbriefs.length){const csb=s.querySelector('.sb');if(csb)csb.innerHTML='<div class="ns" style="font-size:.88rem">'+cbriefs.join('. ')+'.</div>';}cityNews=s.outerHTML;}"""
)
print(f'5. City News: {"ok" if "cbriefs" in html else "FAIL"}')

# 6. Filter out tiny news briefing sections  
html = html.replace(
    "col1.push(s.outerHTML);\n      }",
    "s.querySelectorAll('.ns').forEach(ns=>{if(ns.textContent.replace(/Read more.*/,'').trim().length<15)ns.remove();});\n        col1.push(s.outerHTML);\n      }"
)
print(f'6. Filter: {"ok" if "ns.remove()" in html else "FAIL"}')

open(f, 'w').write(html)
print(f'\nSaved: {len(html)} chars (was {orig_len})')
