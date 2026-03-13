# Deployment Guide

## Workflow

```
[Edit files locally]
        ↓
[git add + commit]
        ↓
[git push → GitHub]   ← permanent source of truth
        ↓
[rsync → Droplet]     ← production server
        ↓
[live at https://1n2.org]
```

**The golden rule:** GitHub is always ahead of or equal to the droplet. Never edit files directly on the server.

## Quick Commands

```bash
# Standard deploy (most common)
./deploy.sh -m "describe what changed"

# Push to GitHub only (no server yet)
./deploy.sh -m "WIP: changes" --github-only

# Server only (already pushed to GitHub)
./deploy.sh --skip-github

# Check what would be deployed
git status && git diff --stat
```

## Server Info

| Item | Value |
|------|-------|
| Provider | DigitalOcean |
| IP | 157.245.186.58 |
| SSH | `ssh root@157.245.186.58` |
| Web root | `/var/www/html/` |
| Domain | https://1n2.org |

## What Gets Deployed

The `deploy.sh` script rsyncs all project directories **except**:
- `.git/` and `.gitignore`
- `*.md` documentation files  
- `node_modules/`
- Python scripts (`*.py`) and shell scripts (`*.sh`)
- Old projects (`old-projects/`)
- Large media (`LargeData/`)
- Sensitive files (`config.php`, `*.csv`, `goodreads_*`)

## Emergency Recovery

If the droplet gets corrupted or wiped:

```bash
# Re-provision from GitHub (the source of truth)
ssh root@157.245.186.58
apt install nginx git rsync -y
# Then from local:
./deploy.sh --skip-github
```

## Large Files

Audio/video files are **never on GitHub or the droplet**. They live locally only:
```
~/LargeData/bitcoingroup-audio/audio/   # 29GB, 487 .m4a files
```
The `/bitcoingroup-audio/audio/` path in the repo is a symlink to this location.
The app degrades gracefully when local audio isn't present (falls back to YouTube links).
