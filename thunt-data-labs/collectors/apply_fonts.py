#!/usr/bin/env python3.12
"""Apply font + readability changes to dashboarder index.html"""

f = '/Users/curiobot/Sites/1n2.org/dashboarder/index.html'
html = open(f).read()
orig = len(html)
c = []

# 1. BIGGER base font: 16 -> 17px
html = html.replace('font-size:16px}', 'font-size:17px}')
c.append('base 16->17')

# 2. BIGGER briefing text
html = html.replace(
    '.ns{padding:12px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.05rem;line-height:1.65',
    '.ns{padding:14px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.1rem;line-height:1.7'
)
c.append('briefing 1.05->1.1rem')

# 3. BIGGER section content
html = html.replace('.sb{padding:0 14px 10px}', '.sb{padding:4px 14px 12px}')
c.append('section padding')

# 4. BIGGER graphical card values
html = html.replace(
    '.gcard-val{font-family:\'JetBrains Mono\',monospace;font-size:1.15rem;',
    '.gcard-val{font-family:\'JetBrains Mono\',monospace;font-size:1.3rem;'
)
c.append('card val 1.15->1.3rem')

# 5. Better mobile: bigger tap targets, text
old_mobile = "@media(max-width:900px){.cols2,.cols3{grid-template-columns:1fr}.gcard-row{gap:6px}.gcard{min-width:70px;padding:6px 8px}.gcard-val{font-size:1rem}}"
new_mobile = "@media(max-width:900px){.cols2,.cols3{grid-template-columns:1fr}.gcard-row{gap:6px}.gcard{min-width:70px;padding:10px 8px}.gcard-val{font-size:1.15rem}.ns{font-size:1.05rem;line-height:1.6}.sh{font-size:1.1rem;padding:14px}.it{font-size:1rem}}"
html = html.replace(old_mobile, new_mobile)
c.append('mobile fonts bigger')

# 6. Bigger tab text
html = html.replace(
    '.tab{padding:9px 18px;font-size:.85rem;',
    '.tab{padding:11px 18px;font-size:.9rem;'
)
c.append('tab font .85->.9')

open(f, 'w').write(html)
print(f'Saved: {len(html)} chars (was {orig})')
for x in c: print(f'  ok: {x}')
