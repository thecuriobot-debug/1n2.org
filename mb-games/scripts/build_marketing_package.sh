#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/package/mad-bitcoins-full-marketing-package.zip"

rm -f "$OUT"

cd "$ROOT"
zip -r "$OUT" \
  README.md \
  robots.txt \
  sitemap.xml \
  index.html \
  styles.css \
  app.js \
  marketing-package.html \
  studio-design-meeting.html \
  play \
  games \
  assets \
  docs \
  retro-dev \
  marketing \
  package/full_marketing_package.md \
  -x "*.DS_Store"

echo "Created: $OUT"
