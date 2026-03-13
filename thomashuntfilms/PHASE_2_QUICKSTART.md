# THOMAS HUNT FILMS - QUICK START GUIDE FOR PHASE 2

## Current Status
✅ MVP Complete (5 videos)
⏳ Ready for Phase 2 expansion

## Phase 2 Goal
Expand from 5 videos to 25-30+ complete video pages

---

## QUICK START STEPS

### 1. Gather YouTube Data
```bash
# Visit: https://www.youtube.com/@ThomasHuntFilms
# List all videos with:
# - Video IDs
# - Titles
# - View counts
# - Durations
```

### 2. Update videos.json
```bash
cd /Users/curiobot/Sites/1n2.org/thomashuntfilms
# Edit videos.json to add new videos
```

### 3. Run Generator
```bash
python3 build_pages.py
# Generates all video pages automatically
```

### 4. Update Homepage
```bash
python3 generate_site.py
# Regenerates homepage with all videos
```

### 5. Test
```bash
open index.html
# Check all links work
```

---

## VIDEO ID FORMAT

Example entry for videos.json:
```json
{
  "id": "star-trek-undiscovered-country",
  "youtube_id": "YOUTUBE_VIDEO_ID_HERE",
  "title": "Star Trek VI: The Undiscovered Country (Ships Only)",
  "year": 1991,
  "runtime": "X:XX",
  "description": "Ship sequences from...",
  "series": "Star Trek",
  "views": "XXX+"
}
```

---

## FILES TO MODIFY

1. **videos.json** - Add new video data
2. **build_pages.py** - Run to generate pages
3. **generate_site.py** - Update homepage
4. **PHASE_2_PLAN.md** - Track progress

---

## PRIORITY LIST

### Must Complete
- [ ] Star Trek VI-XIII (8 films)
- [ ] Update homepage
- [ ] Test all pages

### Should Complete
- [ ] Star Wars I-IX (9 films)
- [ ] Series filtering
- [ ] Search feature

### Nice to Have
- [ ] Other content
- [ ] Statistics
- [ ] Advanced features

---

## CURRENT STRUCTURE

```
thomashuntfilms/
├── index.html (homepage)
├── press.html (press coverage)
├── videos/ (5 video pages)
├── videos.json (5 videos)
├── press.json (5 articles)
├── comments.json (5 comments)
├── PHASE_2_PLAN.md (detailed plan)
└── MVP_COMPLETE.md (phase 1 summary)
```

---

## READY TO GO!

When starting Phase 2:
1. Open PHASE_2_PLAN.md for full details
2. Gather YouTube data
3. Update videos.json
4. Run scripts
5. Test and deploy

**Let's expand to 25-30 videos!** 🚀
