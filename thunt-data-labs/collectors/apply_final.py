#!/usr/bin/env python3.12
"""Apply final round of UI changes to dashboarder index.html"""

f = '/Users/curiobot/Sites/1n2.org/dashboarder/index.html'
html = open(f).read()
orig = len(html)
ok = []

# 1. BIGGER FONTS everywhere
html = html.replace('font-size:16px}', 'font-size:17px}')
html = html.replace(
    ".ns{padding:12px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.05rem;line-height:1.65",
    ".ns{padding:14px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.1rem;line-height:1.7"
)
html = html.replace('.it{padding:5px 0;font-size:.95rem;', '.it{padding:6px 0;font-size:1rem;')
html = html.replace('.sh{padding:12px 14px;font-weight:600;font-size:1.05rem;', '.sh{padding:14px 16px;font-weight:600;font-size:1.1rem;')
html = html.replace('.sb{padding:0 14px 10px}', '.sb{padding:4px 16px 12px}')
html = html.replace('.nl{color:var(--accent);font-weight:700;font-size:.85rem;', '.nl{color:var(--accent);font-weight:700;font-size:.9rem;')
ok.append('bigger fonts')

# 2. Better mobile - bigger touch targets and text
old_mobile = "@media(max-width:900px){.cols2,.cols3{grid-template-columns:1fr}.gcard-row{gap:6px}.gcard{min-width:70px;padding:6px 8px}.gcard-val{font-size:1rem}}"
new_mobile = "@media(max-width:900px){.cols2,.cols3{grid-template-columns:1fr}.gcard-row{gap:6px}.gcard{min-width:70px;padding:8px 10px}.gcard-val{font-size:1.1rem}.ns{font-size:1.05rem;line-height:1.6}.sh{font-size:1.1rem;padding:14px}.it{font-size:1rem}.sb{padding:4px 12px 10px}}"
html = html.replace(old_mobile, new_mobile)
ok.append('mobile fonts')

# 3. Add "Read more" to Entertainment summary
old_ent = "briefs.join('. ')+'.</div>';col2.push(s.outerHTML);return;}"
# There are two instances - entertainment and city news. Handle both.
# First occurrence is Entertainment
html = html.replace(
    """briefs.join('. ')+'.</div>';col2.push(s.outerHTML);return;}""",
    """briefs.join('. ')+'. <a href="#" class="nm" onclick="return false">Read more \\u2192</a></div>';col2.push(s.outerHTML);return;}""",
    1  # only first occurrence (Entertainment)
)
ok.append('entertainment read more')

# Now City News - it uses cbriefs
html = html.replace(
    "cbriefs.join('. ')+'.</div>'",
    "cbriefs.join('. ')+'. <a href=\"#\" class=\"nm\" onclick=\"return false\">Read more \\u2192</a></div>'"
)
ok.append('city news read more')

# 4. Add Previous Briefings button at bottom of page
# Find the footer div
old_ft = '<div class="ft">'
new_ft = '<div style="text-align:center;padding:12px 0 6px"><a href="/dashboarder/archive/" style="display:inline-block;padding:8px 20px;background:rgba(34,211,238,.1);border:1px solid var(--accent);border-radius:6px;color:var(--accent);font-weight:600;font-size:.9rem;text-decoration:none">Previous Briefings</a></div>\n<div class="ft">'
html = html.replace(old_ft, new_ft, 1)
ok.append('previous briefings button')

# SAVE
open(f, 'w').write(html)
print(f'Saved: {len(html)} chars (was {orig})')
for c in ok:
    print(f'  OK: {c}')
