#!/bin/bash
# =============================================================================
# GitHub Auto-Commit
# Commits all changed files to GitHub at end of each cron run
# =============================================================================
set -e

REPO="/Users/curiobot/Sites/1n2.org"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

cd "$REPO"

# Check for changes (data files, generated HTML, JSONs — not secrets)
CHANGED=$(git status --porcelain | grep -v "config\.php\|\.env\|prompts\.json\|goodreads_.*\.csv" | wc -l | tr -d ' ')

if [ "$CHANGED" -gt "0" ]; then
    git add -A
    # Unstage secrets just in case
    git restore --staged medialog/config.php 2>/dev/null || true
    git restore --staged "*.env" 2>/dev/null || true
    git restore --staged "thunt-data-labs/.env" 2>/dev/null || true

    STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
    if [ "$STAGED" -gt "0" ]; then
        git commit -m "auto: daily data update $DATE $TIME ($STAGED files)"
        git push origin main
        echo "✅ GitHub: committed + pushed $STAGED files"
    else
        echo "ℹ️  GitHub: nothing to commit after filtering"
    fi
else
    echo "ℹ️  GitHub: no changes"
fi
