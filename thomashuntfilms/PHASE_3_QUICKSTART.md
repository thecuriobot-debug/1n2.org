# PHASE 3 QUICK START - PRESS ARCHIVE

## Goal
Transform basic press section into comprehensive archive with full articles

---

## Quick Overview

**What we have:**
- 5 press HTML files with full articles
- Multiple screenshots and images
- Basic press cards on website

**What we'll build:**
- Individual pages for each article
- Press archive index with filtering
- Quote extraction and carousel
- Image galleries
- Homepage integration

---

## Source Files

Located at:
```
/Users/curiobot/Sites/1n2.org/star_trek_ships_only/Star Trek Ships Only Press/
```

**Files to parse:**
1. A.V. Club article (HTML + images)
2. Boing Boing article (HTML + images)
3. Popular Mechanics article (HTML + images)
4. MetaFilter discussion (HTML)
5. jwz blog post (HTML)

---

## Implementation Steps

### Step 1: Parse Press HTML
```bash
cd /Users/curiobot/Sites/1n2.org/thomashuntfilms
python3 parse_all_press.py
# Outputs: press_complete.json, press_quotes.json
# Copies: images to press/images/
```

### Step 2: Generate Article Pages
```bash
python3 generate_press_pages.py
# Creates: press/avclub-*.html, press/boingboing-*.html, etc.
# Creates: press/index.html (archive)
```

### Step 3: Update Homepage
```bash
python3 update_homepage_press.py
# Adds: Featured quotes
# Updates: Press section
# Links: To new press archive
```

### Step 4: Test
```bash
open press/index.html
# Verify all links work
# Check images load
# Test filtering
```

---

## Key Tasks

### Must Complete:
- [ ] Parse 5 HTML files
- [ ] Extract article text
- [ ] Copy images
- [ ] Generate article pages
- [ ] Create press index
- [ ] Extract quotes

### Should Complete:
- [ ] Quote carousel
- [ ] Press timeline
- [ ] Filtering system
- [ ] Homepage integration

### Nice to Have:
- [ ] Search functionality
- [ ] Press kit section
- [ ] Social sharing
- [ ] Analytics

---

## Expected Output

**New Pages:**
- press/index.html (main archive)
- press/avclub-article.html
- press/boingboing-article.html
- press/popularmechanics-article.html
- press/metafilter-discussion.html
- press/jwz-blog.html

**New Data:**
- press_complete.json (full articles)
- press_quotes.json (extracted quotes)

**New Assets:**
- press/images/ (organized images)

---

## Tools Needed

**Python Libraries:**
- BeautifulSoup4 (HTML parsing)
- lxml (XML/HTML parsing)
- json (data storage)
- pathlib (file handling)

**Install if needed:**
```bash
pip3 install beautifulsoup4 lxml --break-system-packages
```

---

## File Structure After Phase 3

```
thomashuntfilms/
├── index.html (updated with quotes)
├── press.html (updated with link to archive)
├── press/
│   ├── index.html (NEW - archive index)
│   ├── avclub-article.html (NEW)
│   ├── boingboing-article.html (NEW)
│   ├── popularmechanics-article.html (NEW)
│   ├── metafilter-discussion.html (NEW)
│   ├── jwz-blog.html (NEW)
│   └── images/
│       ├── avclub/
│       ├── boingboing/
│       └── ... (organized by source)
├── data/
│   ├── press_complete.json (NEW)
│   └── press_quotes.json (NEW)
└── PHASE_3_COMPLETE.md (after completion)
```

---

## Success Criteria

Phase 3 complete when:
- ✅ 5 articles fully parsed
- ✅ 5 individual article pages
- ✅ Press archive index
- ✅ Quotes extracted
- ✅ Images organized
- ✅ All links working

---

## Time Estimate

**4-6 hours total:**
- Parsing: 1-2 hours
- Page generation: 1 hour
- Quote system: 1 hour
- Testing: 1 hour
- Polish: 1 hour

---

## Reference

For detailed information, see:
- `PHASE_3_PLAN.md` - Complete detailed plan
- Press source files in star_trek_ships_only folder

---

**Ready to build comprehensive press archive!** 📰
