# THOMAS HUNT FILMS - PHASE 2 PLAN
# Comprehensive Video Page Expansion

## Overview
Expand from 5 videos to complete collection of all Thomas Hunt Films content

---

## PHASE 2 GOALS

### Primary Objective
Create individual pages for ALL videos on the @ThomasHuntFilms YouTube channel

### Target Video Count
- Star Trek Ships Only: 13 films
- Star Wars Ships Only: 9+ films  
- Other content: Various
- **Total: 25-30+ video pages**

---

## VIDEO COLLECTIONS TO ADD

### Star Trek Ships Only (Add 8 more films)
Currently have: 5 (TMP, II, III, IV, V)
Need to add:
1. ✅ Star Trek: The Motion Picture
2. ✅ Star Trek II: The Wrath of Khan
3. ✅ Star Trek III: The Search for Spock
4. ✅ Star Trek IV: The Voyage Home
5. ✅ Star Trek V: The Final Frontier
6. ⏳ Star Trek VI: The Undiscovered Country
7. ⏳ Star Trek Generations
8. ⏳ Star Trek: First Contact
9. ⏳ Star Trek: Insurrection
10. ⏳ Star Trek: Nemesis
11. ⏳ Star Trek (2009)
12. ⏳ Star Trek Into Darkness
13. ⏳ Star Trek Beyond

### Star Wars Ships Only (Add all)
1. ⏳ Star Wars: A New Hope (Ships Only)
2. ⏳ Star Wars: The Empire Strikes Back (Ships Only)
3. ⏳ Star Wars: Return of the Jedi (Ships Only)
4. ⏳ Star Wars: The Phantom Menace (Ships Only)
5. ⏳ Star Wars: Attack of the Clones (Ships Only)
6. ⏳ Star Wars: Revenge of the Sith (Ships Only)
7. ⏳ Star Wars: The Force Awakens (Ships Only)
8. ⏳ Star Wars: The Last Jedi (Ships Only)
9. ⏳ Star Wars: The Rise of Skywalker (Ships Only)

### Other Content
- Bonus edits
- Special compilations
- Behind-the-scenes content
- Compilation videos

---

## DATA COLLECTION TASKS

### Task 1: YouTube Channel Scraping
**Method:** Manual or YouTube API
**Data needed for each video:**
- Video ID
- Title
- Duration
- Upload date
- View count
- Description
- Thumbnail URL

**API Approach:**
```python
# YouTube Data API v3
# Endpoint: /channels/{channel_id}/videos
# Required: API key
```

**Manual Approach:**
- Visit channel page
- Extract video data from page source
- Build JSON data file

### Task 2: Video Metadata Enrichment
For each video, collect:
- Film year (original movie)
- Runtime (ships only edit)
- Original director
- Special effects team
- Notable ships featured
- Key battle sequences

### Task 3: Thumbnail Acquisition
- YouTube auto-generates: `https://img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg`
- Alternative qualities: hqdefault, mqdefault, sddefault
- Store locally (optional) or use YouTube CDN

---

## TECHNICAL IMPLEMENTATION

### File Structure
```
thomashuntfilms/
├── videos/
│   ├── star-trek-tmp.html ✅
│   ├── star-trek-wrath-khan.html ✅
│   ├── star-trek-search-spock.html ✅
│   ├── star-trek-voyage-home.html ✅
│   ├── star-trek-final-frontier.html ✅
│   ├── star-trek-undiscovered-country.html ⏳
│   ├── star-trek-generations.html ⏳
│   ├── star-trek-first-contact.html ⏳
│   ├── star-trek-insurrection.html ⏳
│   ├── star-trek-nemesis.html ⏳
│   ├── star-trek-2009.html ⏳
│   ├── star-trek-into-darkness.html ⏳
│   ├── star-trek-beyond.html ⏳
│   ├── star-wars-new-hope.html ⏳
│   ├── star-wars-empire.html ⏳
│   └── ... (20+ more)
├── data/
│   ├── videos_complete.json (full video database)
│   ├── star_trek_videos.json
│   └── star_wars_videos.json
```

### Template System
Standardize video page generation:
```python
def generate_video_page(video_data):
    - YouTube embed
    - Title and metadata
    - Description
    - Related videos sidebar
    - Comments section
    - Navigation
```

### Enhanced Features for New Pages
1. **Related Videos** - Show other films in same series
2. **Navigation** - Previous/Next film buttons
3. **Series Timeline** - Visual timeline of films
4. **Stats Comparison** - Compare runtimes, view counts
5. **Behind the Scenes** - Editing notes (if available)

---

## HOMEPAGE UPDATES

### Video Gallery Expansion
- Change from "Featured Videos" to "All Videos"
- Add series filtering:
  - All Videos
  - Star Trek Only
  - Star Wars Only
  - Other Content
- Implement search functionality
- Add sorting (date, views, runtime)

### New Sections
1. **Video Statistics**
   - Total videos
   - Total views across all videos
   - Most viewed video
   - Longest edit
   - Shortest edit

2. **Series Completion**
   - Progress bars for each series
   - Star Trek: 13/13 complete
   - Star Wars: 9/9 complete

3. **Latest Additions**
   - Show newest 3-5 videos
   - "New" badges on recent uploads

---

## SCRIPTS TO CREATE

### 1. `fetch_youtube_data.py`
```python
# Scrapes @ThomasHuntFilms channel
# Outputs: videos_complete.json
# Contains: All video IDs, titles, metadata
```

### 2. `generate_all_videos.py`
```python
# Reads videos_complete.json
# Generates HTML page for each video
# Creates video index page
```

### 3. `update_homepage.py`
```python
# Updates index.html with all videos
# Adds filtering/search
# Updates stats
```

### 4. `create_series_pages.py`
```python
# Creates dedicated pages:
# - star-trek-series.html
# - star-wars-series.html
```

---

## DATA STRUCTURE

### videos_complete.json
```json
[
  {
    "id": "star-trek-tmp",
    "youtube_id": "0gywz1PgM_I",
    "title": "Star Trek: The Motion Picture (Ships Only)",
    "series": "Star Trek",
    "film_year": 1979,
    "runtime": "11:30",
    "views": "500000",
    "upload_date": "2015-03-15",
    "description": "...",
    "tags": ["Star Trek", "Ships", "TOS"],
    "featured_ships": ["USS Enterprise", "V'Ger"],
    "thumbnail": "https://img.youtube.com/vi/0gywz1PgM_I/maxresdefault.jpg"
  },
  ...
]
```

---

## DESIGN ENHANCEMENTS

### Video Page Improvements
1. **Hero Image** - Large thumbnail at top
2. **Series Badge** - Star Trek / Star Wars indicator
3. **Film Info Card** - Original film details
4. **Ships Featured** - List of notable ships
5. **Technical Details** - VFX crew, production notes
6. **Social Sharing** - Twitter, Facebook buttons

### Navigation Improvements
1. **Series Breadcrumbs** - Home > Star Trek > Film Name
2. **Prev/Next Buttons** - Navigate within series
3. **Series Index** - Quick jump to any film
4. **Back to Top** - For long pages

---

## TESTING CHECKLIST

- [ ] All video embeds work
- [ ] Thumbnails load correctly
- [ ] Navigation functions properly
- [ ] Mobile responsive
- [ ] Links are correct
- [ ] Metadata is accurate
- [ ] Search works (if implemented)
- [ ] Filtering works (if implemented)
- [ ] No broken links
- [ ] Page load times acceptable

---

## PRIORITY ORDER

### High Priority (Do First)
1. Complete Star Trek series (8 more films)
2. Update homepage with all Star Trek videos
3. Add series filtering

### Medium Priority
4. Add Star Wars series (9 films)
5. Create dedicated series pages
6. Implement search

### Low Priority
7. Add other/bonus content
8. Advanced features (stats, comparisons)
9. Social sharing buttons

---

## TIME ESTIMATES

- **YouTube data collection:** 30-60 minutes
- **Generate 20 video pages:** 15-30 minutes
- **Homepage updates:** 15-30 minutes
- **Series pages:** 30 minutes
- **Testing:** 30 minutes
- **Total:** 2-3 hours for complete Phase 2

---

## AUTOMATION OPPORTUNITIES

### Scripts to Build
1. **Auto-generate pages** from JSON
2. **Batch thumbnail download**
3. **Metadata validation**
4. **Link checker**
5. **Sitemap generator**

---

## SUCCESS CRITERIA

Phase 2 is complete when:
- ✅ All Star Trek films have pages (13 total)
- ✅ All Star Wars films have pages (9+ total)
- ✅ Homepage shows all videos
- ✅ Series filtering works
- ✅ All embeds functional
- ✅ Navigation works
- ✅ Mobile responsive
- ✅ No broken links

---

## NEXT SESSION PREP

### Before starting Phase 2:
1. **Confirm YouTube channel access**
   - Can we scrape the channel?
   - Do we need API key?

2. **Decide on approach**
   - Manual data entry vs. automated scraping
   - Quality over speed vs. speed over quality

3. **Gather resources**
   - Video IDs list
   - Film metadata
   - Any additional content

4. **Set goals**
   - Complete Star Trek only?
   - Complete both series?
   - Include bonus content?

---

## READY FOR PHASE 2!

**Current Status:** 5 videos ✅
**Phase 2 Target:** 25-30 videos ✅
**Expansion:** 5x-6x more content

**Let's build it!** 🚀
