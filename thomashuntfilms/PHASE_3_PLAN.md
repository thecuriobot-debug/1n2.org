# THOMAS HUNT FILMS - PHASE 3 PLAN
# Press Section Expansion

## Overview
Transform press section from basic card layout into comprehensive press archive with full article content, images, and quotes.

---

## PHASE 3 GOALS

### Primary Objective
Parse and archive all press coverage HTML files into standalone pages with full content preservation

### Target Coverage
- Parse 5+ press HTML files
- Extract full articles
- Preserve images and formatting
- Create individual press pages
- Build press archive index
- Add quote highlights

---

## SOURCE FILES AVAILABLE

Located: `/Users/curiobot/Sites/1n2.org/star_trek_ships_only/Star Trek Ships Only Press`

### Press Coverage Files:
1. **A.V. Club**
   - File: `All the Star Trek movies cut down to just spaceships · Great Job, Internet! · The A.V. Club.html`
   - Multiple article versions
   - Images and assets folder
   - Comments embedded

2. **Boing Boing**
   - File: `Star Trek movie supercuts  just the spaceships - Boing Boing.html`
   - Screenshots included
   - Multiple reference images
   - Community discussion

3. **Popular Mechanics**
   - File: `This Genius Slices 'Star Trek' Movies Down to Just the Ships.html`
   - Technical analysis
   - Multiple images
   - Related articles

4. **MetaFilter**
   - File: `Star Trek movies (ships only)   MetaFilter.html`
   - Community discussion
   - User comments
   - Thread analysis

5. **jwz.org**
   - File: `jwz  Star Trek movies (ships only).html`
   - Blog post format
   - Personal commentary
   - Embedded videos

### Additional Screenshots/Images:
- `Boing Boing ships only.png`
- `Boing Boing star trek.png`
- `john bruneau appreciates star trek ships only.png`
- `Star Trek movies  ships only    MetaFilter.png`
- Various other screenshots

---

## TECHNICAL IMPLEMENTATION

### File Structure
```
thomashuntfilms/
├── press/
│   ├── index.html (archive index)
│   ├── avclub-star-trek-ships-only.html
│   ├── boingboing-supercuts.html
│   ├── popular-mechanics-genius.html
│   ├── metafilter-discussion.html
│   ├── jwz-blog-post.html
│   ├── images/ (extracted images)
│   │   ├── avclub-1.jpg
│   │   ├── boingboing-1.png
│   │   └── ... (all press images)
│   └── quotes/ (extracted quotes)
├── data/
│   ├── press_complete.json (full press database)
│   └── press_quotes.json (extracted quotes)
```

### Data to Extract from Each Article

#### Article Metadata:
- Publication name
- Article title
- Author (if available)
- Publication date
- URL (original)
- Article category/section

#### Content:
- Full article text
- Headlines and subheads
- Pull quotes
- Embedded images
- Image captions
- Related links

#### Community Content:
- Top comments
- Discussion highlights
- User reactions
- Social shares

---

## PARSING STRATEGY

### 1. HTML Parsing Script
```python
# parse_press_html.py
from bs4 import BeautifulSoup
import re, json
from pathlib import Path

def parse_avclub_article(html_file):
    # Extract article structure
    # Find main content div
    # Extract headline, body, images
    # Save to structured JSON
    
def parse_boingboing_article(html_file):
    # Different structure than AV Club
    # Extract blog post format
    # Get embedded content
    
def parse_popularmechanics_article(html_file):
    # Magazine-style layout
    # Extract technical content
    # Preserve image galleries
```

### 2. Content Extraction
For each article:
1. Parse HTML with BeautifulSoup
2. Extract main article content
3. Find and download/copy images
4. Extract pull quotes
5. Get publication metadata
6. Save to structured format

### 3. Quote Mining
Extract notable quotes about Thomas Hunt Films:
- Critical praise
- Technical analysis
- Community reactions
- Viral comments
- Social media highlights

---

## PRESS ARCHIVE DESIGN

### Index Page (press/index.html)

**Hero Section:**
- "Press Coverage" headline
- "Thomas Hunt Films in the Media"
- Stats: 5+ publications, X articles, Y quotes

**Featured Coverage:**
- Large cards for major articles
- Publication logos
- Article headlines
- Excerpts
- "Read Full Article" links

**Quote Carousel:**
- Rotating notable quotes
- Publication attribution
- Beautiful typography

**Complete Archive:**
- Timeline view of all coverage
- Filter by publication
- Search functionality
- Sort by date/relevance

**Press Kit Section:**
- High-res logos
- Screenshots
- Promotional images
- Contact info (if applicable)

---

## INDIVIDUAL ARTICLE PAGES

### Article Page Template:

**Header:**
- Publication logo
- Article title
- Author, date
- Social sharing buttons

**Hero Image:**
- Featured screenshot or graphic
- Caption

**Article Body:**
- Full text content
- Embedded images
- Pull quotes styled beautifully
- Preserved formatting
- Links to videos mentioned

**Sidebar:**
- Publication info
- Related press
- Jump to sections
- Share buttons

**Footer:**
- Link back to press archive
- Related articles
- Return to homepage

---

## QUOTE SYSTEM

### Quote Database (press_quotes.json)
```json
[
  {
    "id": "avclub-001",
    "text": "This is brilliant editing work...",
    "source": "The A.V. Club",
    "article": "avclub-star-trek-ships-only",
    "author": "Author Name",
    "date": "2015-03-15",
    "featured": true
  }
]
```

### Quote Display
- Random quote on homepage
- Quote carousel on press page
- Featured quotes in articles
- Social media quote cards
- Pull quote styling

---

## IMAGE HANDLING

### Strategy:
1. **Copy from press folders** to press/images/
2. **Organize by source**: avclub/, boingboing/, etc.
3. **Optimize**: Compress large images
4. **Generate thumbnails**: For galleries
5. **Alt text**: Descriptive accessibility text

### Image Types:
- Article headers
- Screenshots from videos
- Publication logos
- Social media graphics
- Quote cards
- Community reactions

---

## SCRIPTS TO CREATE

### 1. `parse_all_press.py`
Main parser that:
- Reads all HTML files
- Extracts article content
- Saves to press_complete.json
- Copies images to press/images/
- Generates press_quotes.json

### 2. `generate_press_pages.py`
Page generator that:
- Reads press_complete.json
- Creates individual article pages
- Builds press archive index
- Implements quote carousel
- Adds filtering/search

### 3. `extract_press_quotes.py`
Quote extractor that:
- Parses articles for notable quotes
- Identifies pull quotes
- Extracts community reactions
- Rates quotes by impact
- Saves to press_quotes.json

### 4. `update_homepage_press.py`
Homepage updater that:
- Adds featured press quotes
- Updates press stats
- Links to press archive
- Displays recent coverage

---

## ENHANCED FEATURES

### 1. Press Timeline
Visual timeline of coverage:
- 2015: Initial viral coverage (AV Club, Boing Boing)
- 2015: Tech press pickup (Popular Mechanics)
- 2015: Community discussion (MetaFilter, jwz)
- Later: Ongoing mentions

### 2. Impact Metrics
Show reach and engagement:
- Social shares
- Comments/discussion
- Views generated
- Media impressions

### 3. Press Kit Download
Offer downloadable assets:
- Logo pack
- Screenshots (high-res)
- Video thumbnails
- Press release text
- Contact information

### 4. Search Functionality
Enable press search:
- Search by keyword
- Filter by publication
- Sort by date
- Tag system

---

## PRIORITY TASKS

### High Priority (Must Complete):
1. Parse 5 main press HTML files
2. Extract article content to JSON
3. Copy/organize press images
4. Generate individual article pages
5. Create press archive index
6. Extract notable quotes

### Medium Priority:
7. Build quote carousel
8. Add press timeline
9. Implement filtering
10. Update homepage integration

### Low Priority:
11. Press kit section
12. Search functionality
13. Social sharing
14. Analytics tracking

---

## DATA STRUCTURE

### press_complete.json
```json
[
  {
    "id": "avclub-star-trek-ships-only",
    "publication": "The A.V. Club",
    "section": "Great Job, Internet!",
    "title": "All the Star Trek movies cut down to just spaceships",
    "url": "https://avclub.com/...",
    "date": "2015-03-15",
    "author": "Author Name",
    "excerpt": "First paragraph or summary...",
    "body": "Full article text...",
    "images": [
      {
        "src": "press/images/avclub/header.jpg",
        "caption": "Screenshot from video",
        "alt": "Enterprise in motion"
      }
    ],
    "quotes": ["quote1", "quote2"],
    "comments_count": 45,
    "featured": true,
    "tags": ["Star Trek", "editing", "viral"]
  }
]
```

---

## PARSING CHALLENGES

### Different HTML Structures:
Each site has unique structure:
- **A.V. Club**: Kinja platform, nested divs
- **Boing Boing**: WordPress, different markup
- **Popular Mechanics**: Hearst CMS
- **MetaFilter**: Custom forum structure
- **jwz**: Personal blog, simple HTML

### Solutions:
- Site-specific parsers
- Fallback extraction methods
- Manual verification
- Clean up artifacts
- Preserve intent vs. exact HTML

---

## TESTING CHECKLIST

- [ ] All 5 articles parsed correctly
- [ ] Images display properly
- [ ] Quotes extracted accurately
- [ ] Links work (internal and external)
- [ ] Mobile responsive
- [ ] Fast page loads
- [ ] No broken images
- [ ] Formatting preserved
- [ ] Navigation functional
- [ ] Search works (if implemented)

---

## SUCCESS CRITERIA

Phase 3 is complete when:
- ✅ All 5 press articles fully archived
- ✅ Individual pages for each article
- ✅ Press archive index created
- ✅ Images properly organized
- ✅ Quotes extracted and displayed
- ✅ Homepage integrated
- ✅ All links functional
- ✅ Mobile responsive
- ✅ Professional presentation

---

## TIME ESTIMATES

- **HTML parsing:** 1-2 hours
- **Article page generation:** 1 hour
- **Image organization:** 30 minutes
- **Quote extraction:** 30 minutes
- **Press archive index:** 1 hour
- **Homepage integration:** 30 minutes
- **Testing:** 30 minutes
- **Total:** 4-6 hours

---

## NEXT SESSION PREP

### Before Starting Phase 3:
1. **Review press files** - Examine HTML structure
2. **Test parsers** - BeautifulSoup, lxml
3. **Plan image strategy** - Local vs. external
4. **Design article template** - Sketch layout
5. **Prepare quote system** - Carousel design

### Resources Needed:
- BeautifulSoup4 library
- Press HTML files (already available)
- Image editing tools (optional)
- Template designs

---

## READY FOR PHASE 3!

**Current Status:**
- ✅ Phase 1: MVP (5 videos)
- ✅ Phase 2: Full video library (22 videos)
- ⏳ Phase 3: Press archive (5+ articles)

**Phase 3 Goals:**
- Parse 5 press articles
- Create archive pages
- Extract quotes
- Build press index
- Homepage integration

**From basic cards to full press archive!** 📰✨
