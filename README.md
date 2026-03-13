# 1n2.org — One Human + One AI

> **One Human. One AI. Building tools that actually ship.**

[![Live Site](https://img.shields.io/badge/live-1n2.org-brightgreen?style=flat-square&logo=firefox)](https://1n2.org)
[![GitHub](https://img.shields.io/badge/github-thecuriobot--debug-black?style=flat-square&logo=github)](https://github.com/thecuriobot-debug)

This repo is the source for **[1n2.org](https://1n2.org)** — 30+ tools, dashboards, and experiments built through human+AI collaboration by Thomas Hunt working with Claude (Anthropic).

---

## 🗂️ Structure

```
1n2.org/
├── index.html               # Homepage / hub
├── deploy.sh                # Master deploy: commit → GitHub → droplet
│
├── 📊 Analytics & Data
│   ├── curiocharts/         # Live Curio Cards floor price tracker (React)
│   ├── curio-quant/         # AI market intelligence for Curio Cards
│   ├── curio-map/           # Geographic holder distribution map
│   └── thunt-data-labs/     # Personal data science experiments
│
├── 📰 News & Content
│   ├── dashboarder/         # Personal news dashboard + 1400+ article archive
│   ├── tweetster/           # Ad-free Twitter reader (996 accounts)
│   ├── facebooker/          # Facebook feed reader
│   └── briefsmith/          # AI-generated daily briefings
│
├── 🎮 Games
│   ├── madpatrol/           # Moon Patrol tribute — Bitcoin rover, 8 levels
│   ├── bitcoin-vision/      # Live BTC transactions as space battles
│   ├── bitcoin-trains/      # BTC price as animated train
│   └── mb-games/            # Mad Bitcoins game collection
│
├── 🃏 Curio Cards (first Ethereum art NFTs, 2017)
│   ├── curio-wiki/          # Full encyclopedia
│   ├── curiocharts/         # Floor prices for all 31 cards
│   └── curio-quant/         # Market intelligence
│
├── 📚 Archives
│   ├── thunt.net/           # 526-post blog archive (2003–present)
│   ├── thomashuntfilms/     # Video portfolio (4.6M views, 37 videos)
│   ├── tbg-mirrors/         # Bitcoin Group podcast archive (482 eps)
│   └── bitcoingroup-audio/  # TBG audio player + episode browser
│
└── old-projects/            # v1 projects in separate repos (see below)
```

---

## 🚢 Deployment

**Order: localhost → GitHub → Droplet**

```bash
./deploy.sh -m "message"       # commit + push GitHub + rsync droplet
./deploy.sh --github-only      # GitHub only
./deploy.sh --skip-github      # rsync to droplet only
```

- **Server:** DigitalOcean `157.245.186.58` → `https://1n2.org`
- **SSH:** `ssh root@157.245.186.58`

> ⚠️ Audio files (29GB) live in `~/LargeData/` — symlinked, never committed.

---

## 📦 Archived Projects (separate repos)

| Project | Repo |
|---------|------|
| Checklister | [1n2-checklister-archive](https://github.com/thecuriobot-debug/1n2-checklister-archive) |
| Curio Atlas | [1n2-curio-atlas-archive](https://github.com/thecuriobot-debug/1n2-curio-atlas-archive) |
| Curio Terminal | [1n2-curio-terminal-archive](https://github.com/thecuriobot-debug/1n2-curio-terminal-archive) |
| Curio Oracle | [1n2-curio-oracle-archive](https://github.com/thecuriobot-debug/1n2-curio-oracle-archive) |
| Reader | [1n2-reader-archive](https://github.com/thecuriobot-debug/1n2-reader-archive) |
| Tweetster | [1n2-tweetster-archive](https://github.com/thecuriobot-debug/1n2-tweetster-archive) |
| + 6 more | [All repos →](https://github.com/thecuriobot-debug?tab=repositories) |

---

## 🧠 Philosophy

One human (vision, taste, domain knowledge) + one AI (code, docs, debugging) = shipping in hours what used to take weeks.

**March 2026 stats:** 30+ projects · ~50,000 lines · ~125 human hours · ~15,000 AI prompts

---

<sub>Thomas Hunt + Claude | DigitalOcean | <a href="https://1n2.org">1n2.org</a></sub>
