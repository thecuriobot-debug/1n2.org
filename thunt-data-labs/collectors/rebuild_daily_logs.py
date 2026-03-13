#!/usr/bin/env python3.12
"""
Daily Logs Full Rebuilder
Reconstructs all logs from Feb 7 through today using:
- Real session data from prompts.json
- Git commit history per day
- DB stats snapshots
- Known project timeline
"""
import sys, os, json, sqlite3, subprocess
from datetime import datetime, timedelta, date
from pathlib import Path
from collections import defaultdict

LOGS_DIR  = Path("/Users/curiobot/Sites/1n2.org/daily-logs/logs")
INDEX     = Path("/Users/curiobot/Sites/1n2.org/daily-logs/index.html")
DB_PATH   = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db")
REPO      = Path("/Users/curiobot/Sites/1n2.org")
PROMPTS   = Path("/Users/curiobot/Sites/1n2.org/ai-usage/claude-usage/prompts.json")
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# ── Known session summaries per date ──────────────────────────────────────
SESSION_NOTES = {
    "2026-02-07": {
        "headline": "Mac Mini M4 setup — Local AI with LMStudio",
        "summary": "Got the Mac Mini M4 running. Set up LMStudio with GLM-4 model. Explored local AI inference via Metal GPU. First steps into the human+AI development workflow.",
        "projects": ["LMStudio", "Local AI setup", "Mac Mini M4 config"],
        "tags": ["setup", "local-AI"],
    },
    "2026-02-09": {
        "headline": "MediaLog — Personal media tracker built",
        "summary": "Built MediaLog from scratch: PHP + MySQL full-stack media tracker. Books and movies, ratings, streaks, stats pages. The first real 1n2.org project.",
        "projects": ["MediaLog (PHP + MySQL)"],
        "tags": ["medialog", "php", "new-project"],
    },
    "2026-02-10": {
        "headline": "Tweetster + Mad Patrol — Twitter reader and Bitcoin arcade game",
        "summary": "Built Tweetster — ad-free Twitter reader scraping Nitter across Bitcoin accounts. Then built Mad Patrol: Moon Patrol tribute, Bitcoin rover, 8 levels, pure Canvas JS.",
        "projects": ["Tweetster", "Mad Patrol (8 levels)"],
        "tags": ["tweetster", "games", "bitcoin"],
    },
    "2026-02-11": {
        "headline": "Domain + Droplet — 1n2.org goes live",
        "summary": "Registered 1n2.org. Set up DigitalOcean droplet. Configured nginx + SSL. The project hub went live for the first time.",
        "projects": ["1n2.org domain", "DigitalOcean droplet", "nginx + SSL"],
        "tags": ["infrastructure", "launch"],
    },
    "2026-02-13": {
        "headline": "CurioCharts — Live Curio Cards floor price tracker",
        "summary": "Built CurioCharts in React. Pulls real-time floor prices from OpenSea API for all 31 Curio Cards. Price history charts with Recharts. First Curio ecosystem project.",
        "projects": ["CurioCharts (React + OpenSea)"],
        "tags": ["curio", "react", "nft"],
    },
    "2026-02-14": {
        "headline": "Curio Wiki — Encyclopedia of the first Ethereum art NFTs",
        "summary": "Built a full encyclopedia for Curio Cards — the first art NFTs on Ethereum (May 9, 2017). Card history, artist profiles, timeline, market context.",
        "projects": ["Curio Wiki"],
        "tags": ["curio", "wiki", "nft"],
    },
    "2026-02-15": {
        "headline": "1n2.org homepage redesign — Professional project hub",
        "summary": "Redesigned the 1n2.org homepage. Dark theme, card grid, stats bar, JetBrains Mono. Now looks like a real project portfolio.",
        "projects": ["1n2.org homepage redesign"],
        "tags": ["homepage", "design"],
    },
    "2026-02-17": {
        "headline": "Thomas Hunt Films — Video portfolio site (4.6M views)",
        "summary": "Built the Thomas Hunt Films website. Auto-generated from YouTube API data. 37 videos, 4.6M views, 9.29K subscribers. Series pages, press section.",
        "projects": ["Thomas Hunt Films website"],
        "tags": ["youtube", "portfolio"],
    },
    "2026-02-18": {
        "headline": "Curio Ecosystem day — Terminal, Atlas, Review, Hub all built",
        "summary": "Legendary session. Built the full Curio ecosystem: CurioTerminal (live market dashboard), CurioAtlas (on-chain network visualizer), CurioReview (automated essay system with AI writing), CurioHub. First AI-generated 4,333-word essay deployed. All 6 projects auto-updating.",
        "projects": ["CurioTerminal", "CurioAtlas", "CurioReview", "CurioHub", "CurioOracle", "Curio ecosystem automation"],
        "tags": ["curio", "milestone", "automation"],
    },
    "2026-02-19": {
        "headline": "CurioQuant + Daily Logs — Market intelligence and logging system",
        "summary": "Built CurioQuant: AI market intelligence for Curio Cards, buy/sell signals, fantasy portfolio simulation. Set up the Daily Logs system. Expanded automation to 7 projects.",
        "projects": ["CurioQuant (market intelligence)", "Daily Logs system"],
        "tags": ["curio", "data", "logs"],
    },
    "2026-03-05": {
        "headline": "OpenClaw + Retro Game Lab + Google News + MadWikipedia",
        "summary": "Set up OpenClaw with Ollama for local AI pipeline. Built Retro Game Lab for arcade game collection. Scraped Google News into a personal reader. Started MadWikipedia (The Bitcoin Group knowledge base).",
        "projects": ["OpenClaw + Ollama", "Retro Game Lab", "Google News scraper", "MadWikipedia"],
        "tags": ["openclaw", "local-ai", "games", "news"],
    },
    "2026-03-06": {
        "headline": "Data Labs + Bitcoin Trains — Central warehouse and BTC price train",
        "summary": "Built the central Data Labs SQLite warehouse pulling from YouTube API, Alchemy blockchain, Google News, Nitter tweets. Built Bitcoin Trains: BTC price chart as animated railroad with train riding the chart.",
        "projects": ["THunt Data Labs (SQLite warehouse)", "Bitcoin Trains"],
        "tags": ["datalabs", "bitcoin", "games", "infrastructure"],
    },
    "2026-03-07": {
        "headline": "Dashboarder rebuild + London Theater tracker",
        "summary": "Rebuilt Dashboarder with dark mode, tabbed layout, archive system. Added London Theater tracker (Globe Theatre shows, West End). Added museum exhibitions tracker.",
        "projects": ["Dashboarder (dark mode + tabs)", "London Theater tracker", "Museum exhibitions"],
        "tags": ["dashboarder", "content"],
    },
    "2026-03-08": {
        "headline": "Bitcoin Ships 3 — Cinematic BTC price ocean voyage",
        "summary": "Built Bitcoin Ships 3: the entire history of Bitcoin as an ocean voyage. LOG scale prices, Japanese Ghibli/Hokusai art style, animated crew with sugegasa hats, lemmings-style behavior. Mad Bitcoins as conductor after Apr 21 2013. Gathered full project stats: 36 sessions, ~8.5M tokens.",
        "projects": ["Bitcoin Ships 3 (Ghibli+Hokusai)", "Project stats gathering"],
        "tags": ["bitcoin", "games", "milestone"],
    },
    "2026-03-09": {
        "headline": "Dashboarder AI summaries + TBG Mirrors launch",
        "summary": "Added Claude AI summaries to Dashboarder sections (Entertainment, City News). Set up CNAME for custom domain routing. Major TBG Mirrors work: full transcript index (482 episodes), web search, archive system. Telegram notifications added to cron.",
        "projects": ["Dashboarder AI summaries", "TBG Mirrors transcript system", "Telegram cron notifications"],
        "tags": ["dashboarder", "tbg", "ai", "automation"],
    },
    "2026-03-10": {
        "headline": "TBG Mirrors mega-session — 30+ features in one day",
        "summary": "Massive TBG Mirrors build day. Added: Guest DB (263 guests, 92 profile pages), Narratives (28 storylines), Quotes (200 notable), Predictions tracker (567 predictions, leaderboard), Magic 8-Ball (49.2% accuracy), Word Cloud, Timeline, Network graph. Standardized nav across all pages. Price verification with YouTube API.",
        "projects": ["TBG Guest DB (263 guests)", "TBG Narratives (28 storylines)", "TBG Quotes (200)", "TBG Predictions + 8-Ball", "TBG Word Cloud + Timeline"],
        "tags": ["tbg", "mega-session", "milestone"],
    },
    "2026-03-11": {
        "headline": "Bitcoin Ships 3 polish + TBG Quotes/Timeline/Network",
        "summary": "Polished Bitcoin Ships 3 through 8 versions: added animated lemmings crew, LOG scale, Japanese aesthetics. Added TBG Quotes (250), Timeline (BTC chart + 19 events), Network (co-appearance graph). Fixed cron stale lockfile detection.",
        "projects": ["Bitcoin Ships 3 (v2-v8)", "TBG Quotes 250", "TBG Timeline", "TBG Network graph"],
        "tags": ["bitcoin", "tbg", "polish"],
    },
    "2026-03-12": {
        "headline": "1n2.org homepage reorganization + CurioQuant v9 overhaul",
        "summary": "Major homepage reorganization: renamed Daily Reader → Primary Projects, added MediaLog + TH Films, moved MB Games/Mad Ninja/Cases/Workflows to old-projects. Merged Commentzor into My YouTube. Renamed MadWikipedia → Curio Wiki. CurioQuant v9: 3x bigger signals, trade markers on charts, dynamic leaderboards.",
        "projects": ["Homepage reorganization", "CurioQuant v9", "Curio Wiki rebrand", "My YouTube + Commentzor merge"],
        "tags": ["homepage", "curio", "redesign"],
    },
    "2026-03-13": {
        "headline": "Ecosystem automation + GitHub overhaul + Health check",
        "summary": "Full ecosystem automation: 22-job cron pipeline covering MediaLog RSS, ThomasHuntFilms, WCN/TBG podcasts, Curio suite, articles, daily logs, AI usage. GitHub: README for all 14 repos, profile page, deploy workflow. Health check rebuilt with 40 sites. All Curio sites cross-linked.",
        "projects": ["Unified cron (22 jobs)", "GitHub docs overhaul", "Health check page", "All Curio sites cross-linked", "Database.py rebuilt"],
        "tags": ["automation", "github", "infrastructure", "milestone"],
    },
}

# ── Git commits per day ───────────────────────────────────────────────────
def get_git_commits_by_day():
    """Get all git commits grouped by date."""
    result = subprocess.run(
        ["git", "log", "--format=%ad|%s", "--date=format:%Y-%m-%d"],
        capture_output=True, text=True, cwd=str(REPO)
    )
    by_day = defaultdict(list)
    for line in result.stdout.splitlines():
        parts = line.split("|", 1)
        if len(parts) == 2:
            by_day[parts[0]].append(parts[1].strip())
    return by_day

# ── DB stats for a given date ─────────────────────────────────────────────
def get_db_stats():
    """Get current DB stats."""
    if not DB_PATH.exists():
        return {}
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        def q(sql): return conn.execute(sql).fetchone()[0]
        stats = {
            "total_records": q("SELECT COUNT(*) FROM (SELECT 1 FROM curio_prices UNION ALL SELECT 1 FROM curio_sales UNION ALL SELECT 1 FROM yt_videos UNION ALL SELECT 1 FROM yt_comments UNION ALL SELECT 1 FROM articles UNION ALL SELECT 1 FROM tweets UNION ALL SELECT 1 FROM movies UNION ALL SELECT 1 FROM books)"),
            "videos":    q("SELECT COUNT(*) FROM yt_videos"),
            "comments":  q("SELECT COUNT(*) FROM yt_comments"),
            "articles":  q("SELECT COUNT(*) FROM articles"),
            "movies":    q("SELECT COUNT(*) FROM movies"),
            "books":     q("SELECT COUNT(*) FROM books"),
            "curio_sales": q("SELECT COUNT(*) FROM curio_sales"),
        }
        floor = conn.execute("SELECT floor_price_eth FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()
        if floor: stats["curio_floor_eth"] = round(floor[0], 4)
        conn.close()
        return stats
    except:
        return {}

# ── Build one rich log HTML ───────────────────────────────────────────────
def build_log_html(d_str, git_commits, db_stats, session=None, is_today=False):
    d = datetime.strptime(d_str, "%Y-%m-%d")
    label = d.strftime("%A, %B %-d, %Y")
    commits = git_commits.get(d_str, [])
    s = session or {}

    headline = s.get("headline", f"1n2.org — {label}")
    summary  = s.get("summary", "Development session.")
    projects = s.get("projects", [])
    tags     = s.get("tags", [])

    commits_html = ""
    if commits:
        items = "\n".join(f"<li>{c}</li>" for c in commits[:20])
        commits_html = f"""
<h2>📝 Git Commits ({len(commits)})</h2>
<ul>{items}</ul>"""

    projects_html = ""
    if projects:
        items = "\n".join(f"<li>🔨 {p}</li>" for p in projects)
        projects_html = f"""
<h2>🚀 Projects Built / Updated</h2>
<ul>{items}</ul>"""

    tags_html = ""
    if tags:
        tag_spans = " ".join(f'<span class="tag">{t}</span>' for t in tags)
        tags_html = f'<div class="tags">{tag_spans}</div>'

    stats_html = ""
    if db_stats and is_today:
        stats_html = f"""
<h2>📊 Live Data Snapshot</h2>
<ul>
<li>Total DB records: <b>{db_stats.get('total_records',0):,}</b></li>
<li>Curio Cards floor: <b>{db_stats.get('curio_floor_eth','?')} ETH</b></li>
<li>YouTube videos: <b>{db_stats.get('videos',0):,}</b></li>
<li>YouTube comments: <b>{db_stats.get('comments',0):,}</b></li>
<li>Articles: <b>{db_stats.get('articles',0):,}</b></li>
<li>Movies tracked: <b>{db_stats.get('movies',0):,}</b></li>
<li>Books tracked: <b>{db_stats.get('books',0):,}</b></li>
</ul>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Log — {d_str}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,system-ui,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:40px 20px}}
.container{{max-width:800px;margin:0 auto;background:white;border-radius:20px;padding:50px;box-shadow:0 20px 60px rgba(0,0,0,.3)}}
.back-link{{display:inline-block;margin-bottom:24px;color:#667eea;text-decoration:none;font-weight:500;font-size:.9rem}}
.date-label{{font-size:.8rem;color:#888;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px}}
h1{{font-size:1.9rem;color:#333;margin-bottom:12px;line-height:1.3}}
.summary{{font-size:1.05rem;color:#555;line-height:1.7;margin-bottom:28px;padding:16px;background:#f8f9ff;border-radius:8px;border-left:4px solid #667eea}}
h2{{font-size:1.1rem;color:#764ba2;margin:24px 0 10px;}}
ul{{margin-left:20px}}
li{{margin:.4rem 0;color:#444;line-height:1.5}}
.tags{{margin:20px 0;display:flex;gap:8px;flex-wrap:wrap}}
.tag{{padding:3px 10px;border-radius:12px;background:#f0ecff;color:#764ba2;font-size:.75rem;font-weight:600}}
.links{{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;padding-top:16px;border-top:1px solid #eee}}
.links a{{color:#667eea;text-decoration:none;font-size:.85rem}}
.meta{{font-size:.75rem;color:#aaa;margin-top:20px}}
</style>
</head>
<body>
<div class="container">
<a href="../index.html" class="back-link">← All Daily Logs</a>
<div class="date-label">{label}</div>
<h1>{headline}</h1>
<div class="summary">{summary}</div>
{tags_html}
{projects_html}
{commits_html}
{stats_html}
<div class="links">
<a href="https://1n2.org">🏠 1n2.org</a>
<a href="https://1n2.org/thunt-data-labs/web/">🔬 Data Labs</a>
<a href="https://1n2.org/dashboarder/">📰 Dashboarder</a>
<a href="https://1n2.org/curiocharts/">🃏 CurioCharts</a>
<a href="https://1n2.org/health/">💚 Health</a>
</div>
<div class="meta">Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} · 1n2.org Daily Log</div>
</div>
</body>
</html>"""

# ── Rebuild index ─────────────────────────────────────────────────────────
def rebuild_index(all_dates):
    sorted_dates = sorted(all_dates, reverse=True)
    rows = ""
    for d_str in sorted_dates:
        d = datetime.strptime(d_str, "%Y-%m-%d")
        label = d.strftime("%b %-d, %Y — %A")
        session = SESSION_NOTES.get(d_str, {})
        headline = session.get("headline", "")
        rows += f'<div class="row"><a href="logs/{d_str}-daily-log.html"><span class="date">{label}</span>{f"<span class=headline>{headline}</span>" if headline else ""}</a></div>\n'

    INDEX.write_text(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Logs — 1n2.org</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,system-ui,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:40px 20px}}
.container{{max-width:700px;margin:0 auto;background:white;border-radius:20px;padding:50px;box-shadow:0 20px 60px rgba(0,0,0,.3)}}
.back-link{{display:inline-block;margin-bottom:24px;color:#667eea;text-decoration:none;font-weight:500;font-size:.9rem}}
h1{{font-size:2rem;color:#333;margin-bottom:6px}}
.sub{{color:#888;font-size:.9rem;margin-bottom:28px}}
.row{{border-bottom:1px solid #f0f0f0;padding:2px 0}}
.row a{{display:flex;flex-direction:column;padding:12px 8px;text-decoration:none;border-radius:8px;transition:background .15s}}
.row a:hover{{background:#f8f9ff}}
.date{{font-size:.8rem;color:#888;font-weight:600;letter-spacing:.03em;text-transform:uppercase}}
.headline{{font-size:.95rem;color:#444;margin-top:3px}}
</style>
</head>
<body>
<div class="container">
<a href="/" class="back-link">← 1n2.org</a>
<h1>📅 Daily Logs</h1>
<p class="sub">{len(sorted_dates)} logs · Updated daily · Human+AI collaboration journal</p>
{rows}
</div>
</body>
</html>""")

# ── Main ──────────────────────────────────────────────────────────────────
def run():
    print(f"\n📅 Daily Logs Rebuild — {date.today().isoformat()}")
    git_commits = get_git_commits_by_day()
    db_stats    = get_db_stats()

    # Date range: Feb 7 (first session) through today
    start  = date(2026, 2, 7)
    today  = date.today()
    all_dates = set()

    d = start
    while d <= today:
        d_str    = d.isoformat()
        session  = SESSION_NOTES.get(d_str)
        is_today = (d == today)

        # Build log for every date (session notes, git commits, or just today's stats)
        has_content = session or git_commits.get(d_str) or is_today
        if has_content:
            html = build_log_html(d_str, git_commits, db_stats if is_today else {}, session, is_today)
            (LOGS_DIR / f"{d_str}-daily-log.html").write_text(html)
            all_dates.add(d_str)
        d += timedelta(days=1)

    rebuild_index(all_dates)
    print(f"  ✅ {len(all_dates)} logs built ({start} → {today})")
    print(f"  📝 {len(SESSION_NOTES)} with rich session notes")
    print(f"  📝 {len(git_commits)} days with git commits")

if __name__ == "__main__":
    run()
