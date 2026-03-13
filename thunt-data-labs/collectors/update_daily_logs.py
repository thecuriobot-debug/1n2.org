#!/usr/bin/env python3.12
"""
Daily Logs Updater (called from cron)
- Runs rebuild_daily_logs.py for full rebuild
- Writes today's log with fresh live stats
"""
import subprocess, sys
from pathlib import Path
from datetime import datetime, date

COLLECTORS = Path(__file__).parent

def run():
    print(f"\n📅 Daily Logs Update — {date.today().isoformat()}")
    result = subprocess.run(
        [sys.executable, str(COLLECTORS / "rebuild_daily_logs.py")],
        capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        print(f"  {line}")
    if result.returncode != 0:
        print(f"  ⚠️  {result.stderr[:200]}")

if __name__ == "__main__":
    run()
