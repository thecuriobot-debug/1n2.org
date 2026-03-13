#!/bin/bash
# =============================================================================
# 1n2.org Master Deploy Script
# Order: localhost → GitHub → Droplet
#
# WORKFLOW:
#   1. Verify local git is clean (or commit staged changes)
#   2. Push to GitHub (source of truth)
#   3. rsync to DigitalOcean droplet (production)
#
# USAGE:
#   ./deploy.sh                    # deploy everything
#   ./deploy.sh --skip-github      # rsync only (local → droplet)
#   ./deploy.sh --github-only      # push to GitHub only
#   ./deploy.sh -m "commit msg"    # auto-commit with message then full deploy
# =============================================================================

set -e

SERVER="root@157.245.186.58"
REMOTE="/var/www/html"
LOCAL="/Users/curiobot/Sites/1n2.org"
SKIP_GITHUB=false
GITHUB_ONLY=false
COMMIT_MSG=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-github) SKIP_GITHUB=true; shift ;;
    --github-only) GITHUB_ONLY=true; shift ;;
    -m) COMMIT_MSG="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

cd "$LOCAL"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     1n2.org Deploy  🚀               ║"
echo "╚══════════════════════════════════════╝"
echo ""

# -----------------------------------------------------------------------------
# STEP 1: Git — commit if needed, then push to GitHub
# -----------------------------------------------------------------------------
if [ "$SKIP_GITHUB" = false ]; then
  echo "▶ Step 1: GitHub sync"

  # Auto-commit if -m flag provided
  if [ -n "$COMMIT_MSG" ]; then
    echo "  Staging all changes..."
    git add -A
    STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
    if [ "$STAGED" -gt 0 ]; then
      git commit -m "$COMMIT_MSG"
      echo "  ✅ Committed $STAGED files: $COMMIT_MSG"
    else
      echo "  ℹ️  Nothing to commit"
    fi
  fi

  # Check for uncommitted changes (warn but don't block)
  DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
  if [ "$DIRTY" -gt 0 ]; then
    echo "  ⚠️  Warning: $DIRTY uncommitted files — deploying last commit only"
    echo "     (run with -m \"message\" to commit first)"
  fi

  # Push to GitHub
  echo "  Pushing to GitHub..."
  git push origin main
  echo "  ✅ GitHub up to date"
  echo ""
fi

# -----------------------------------------------------------------------------
# STEP 2: rsync to droplet
# -----------------------------------------------------------------------------
if [ "$GITHUB_ONLY" = false ]; then
  echo "▶ Step 2: Deploy to droplet (157.245.186.58)"
  echo ""

  RSYNC_OPTS="-avz --delete \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='*.md' \
    --exclude='node_modules' \
    --exclude='*.py' \
    --exclude='*.sh' \
    --exclude='deploy.sh' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='old-projects/' \
    --exclude='LargeData/' \
    --exclude='medialog/config.php' \
    --exclude='medialog/*.csv' \
    --exclude='medialog/goodreads_*' \
    --exclude='*/__pycache__/'"

  # Core site
  echo "  📄 Homepage + static files..."
  rsync -avz --exclude='.git' \
    $LOCAL/index.html \
    $LOCAL/logo.png \
    $LOCAL/1n2_org_logo.png \
    $SERVER:$REMOTE/ 2>&1 | grep -E "^(sending|sent|total)" | head -5
  echo "  ✅ Homepage"

  # Deploy each project directory
  PROJECTS=(
    "ai-usage" "all-media-tracker" "bitcoin-trains" "bitcoin-vision"
    "bitcoingroup-audio" "bitcoinships" "bitcoinships2" "bitcoinships3"
    "briefsmith" "case-studies" "checklister" "clip-arcade"
    "codex-nightshift" "commentzor" "curio-atlas" "curio-data"
    "curio-did" "curio-map" "curio-oracle" "curio-quant"
    "curio-terminal" "curio-wiki" "curioarchive" "curiocharts"
    "curiohub" "curioreview" "daily-logs" "daily-thunt"
    "dashboarder" "facebooker" "google-news" "health"
    "mad-bitcoins-ninja" "madninja" "madpatrol" "madpatrol2"
    "madpatrol3" "mb-games" "medialog" "my-youtube"
    "reader" "signal-studio" "star_trek_ships_only" "tbg-mirrors"
    "thomashuntfilms" "thunt-data-labs" "thunt-wiki" "thunt.net"
    "trend-weaver" "tweetster" "wcn-podcast" "workflows"
    "agent-hangar" "bitcoin-vision" "bitcoingroup-audio"
  )

  for proj in "${PROJECTS[@]}"; do
    if [ -d "$LOCAL/$proj" ]; then
      echo "  📦 $proj..."
      ssh $SERVER "mkdir -p $REMOTE/$proj"
      rsync -az --delete \
        --exclude='.git' --exclude='node_modules' --exclude='*.py' \
        --exclude='*.sh' --exclude='.DS_Store' --exclude='__pycache__' \
        --exclude='*.csv' --exclude='config.php' \
        "$LOCAL/$proj/" "$SERVER:$REMOTE/$proj/" 2>/dev/null
    fi
  done

  echo ""
  echo "  🔒 Setting permissions..."
  ssh $SERVER "find $REMOTE -type f -exec chmod 644 {} \; && find $REMOTE -type d -exec chmod 755 {} \; && chown -R www-data:www-data $REMOTE/ 2>/dev/null || true"
  echo "  ✅ Permissions set"
fi

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Deploy complete!                             ║"
if [ "$SKIP_GITHUB" = false ]; then
echo "║  📦 GitHub: github.com/thecuriobot-debug/1n2.org ║"
fi
if [ "$GITHUB_ONLY" = false ]; then
echo "║  🌐 Live:   https://1n2.org                      ║"
fi
echo "╚══════════════════════════════════════════════════╝"
echo ""
