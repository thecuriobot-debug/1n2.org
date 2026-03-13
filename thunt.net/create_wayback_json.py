#!/usr/bin/env python3
import json
from pathlib import Path

base_dir = Path(__file__).parent / "net_interest"

# Load broken links
with open(base_dir / "broken_links.json") as f:
    broken = json.load(f)

# Check which ones have wayback folders
wayback_found = []
still_missing = []

for link in broken:
    wayback_dir = base_dir / "saved_webpages" / f"wayback_{link['id']}"
    if wayback_dir.exists() and (wayback_dir / "index.html").exists():
        meta_file = wayback_dir / "metadata.json"
        if meta_file.exists():
            with open(meta_file) as f:
                meta = json.load(f)
            link['wayback_url'] = meta.get('wayback_url', '')
            link['wayback_timestamp'] = meta.get('wayback_url', '').split('/')[4] if '/' in meta.get('wayback_url', '') else ''
            link['local_path'] = f"net_interest/saved_webpages/wayback_{link['id']}/index.html"
            link['images'] = meta.get('images', 0)
            link['size'] = meta.get('size', 0)
        else:
            link['local_path'] = f"net_interest/saved_webpages/wayback_{link['id']}/index.html"
            link['images'] = 0
            link['size'] = 0
        wayback_found.append(link)
    else:
        still_missing.append(link)

# Save
with open(base_dir / "wayback_links.json", 'w') as f:
    json.dump(wayback_found, f, indent=2)
with open(base_dir / "missing_links.json", 'w') as f:
    json.dump(still_missing, f, indent=2)

# Update stats
with open(base_dir / "archive_results.json") as f:
    stats = json.load(f)
stats['wayback'] = len(wayback_found)
stats['missing'] = len(still_missing)
stats['wayback_images'] = sum(l.get('images', 0) for l in wayback_found)
stats['wayback_bytes'] = sum(l.get('size', 0) for l in wayback_found)
with open(base_dir / "archive_results.json", 'w') as f:
    json.dump(stats, f, indent=2)

print(f"✅ Wayback: {len(wayback_found)}")
print(f"❌ Missing: {len(still_missing)}")
