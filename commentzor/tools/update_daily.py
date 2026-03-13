#!/usr/bin/env python3
"""
Commentzor Daily Updater
========================

Designed to be run by cron to keep the comment database fresh.
Only fetches comments from recent videos (last 7 days).

CRON SETUP:
  # Run daily at 3 AM
  0 3 * * * cd /path/to/commentzor && /usr/bin/python3 tools/update_daily.py >> data/cron.log 2>&1

  # Or use the provided crontab entry:
  # crontab -e
  # 0 3 * * * /path/to/commentzor/tools/update_daily.py >> /path/to/commentzor/data/cron.log 2>&1
"""

import os
import sys
from datetime import datetime

# Setup path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    print(f"\n{'='*60}")
    print(f"COMMENTZOR DAILY UPDATE - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    # Import after path setup
    from gather import update_recent, show_status

    try:
        update_recent()
        print("\n--- Post-update Status ---")
        show_status()
        print(f"\nDaily update completed successfully at {datetime.now().strftime('%H:%M:%S')}")
    except Exception as e:
        print(f"\nERROR during daily update: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
