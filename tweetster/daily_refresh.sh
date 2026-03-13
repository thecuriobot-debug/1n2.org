#!/bin/bash
#
# DAILY TWEET REFRESH — Powered by Scrapling
# Scrapes tweets via Nitter, no login required
# Takes about 30 seconds!
#

cd "$(dirname "$0")"

echo "=========================================="
echo "TWEETSTER — DAILY REFRESH (Scrapling)"
echo "=========================================="
echo ""

python3.12 api/scrapling_fetch.py

echo ""
echo "Done! Refresh Tweetster to see new tweets."
echo ""
