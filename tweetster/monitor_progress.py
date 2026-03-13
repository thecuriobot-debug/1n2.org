#!/usr/bin/env python3
"""
Monitor scraping progress in real-time
Shows how many tweets have been collected so far
"""

import json
import time
import os
from pathlib import Path

TWEETS_FILE = Path(__file__).parent / "data" / "tweets.json"

def count_tweets():
    """Count tweets in the file"""
    if not TWEETS_FILE.exists():
        return 0
    try:
        with open(TWEETS_FILE, 'r') as f:
            tweets = json.load(f)
            return len(tweets)
    except:
        return 0

def monitor():
    """Monitor progress"""
    print("=" * 60)
    print("SCRAPING PROGRESS MONITOR")
    print("=" * 60)
    print()
    print("Monitoring: data/tweets.json")
    print("Press Ctrl+C to stop monitoring (scraping continues)")
    print()
    
    last_count = count_tweets()
    start_time = time.time()
    
    print(f"Starting count: {last_count} tweets")
    print()
    
    try:
        while True:
            time.sleep(10)  # Check every 10 seconds
            
            current_count = count_tweets()
            elapsed = int(time.time() - start_time)
            mins = elapsed // 60
            secs = elapsed % 60
            
            if current_count > last_count:
                new_tweets = current_count - last_count
                rate = current_count / (elapsed / 60) if elapsed > 0 else 0
                
                print(f"[{mins:02d}:{secs:02d}] {current_count} tweets (+{new_tweets}) | Rate: {rate:.1f} tweets/min")
                last_count = current_count
            else:
                print(f"[{mins:02d}:{secs:02d}] {current_count} tweets (no change)")
    
    except KeyboardInterrupt:
        print()
        print("=" * 60)
        print("Monitoring stopped")
        print(f"Final count: {count_tweets()} tweets")
        print("=" * 60)

if __name__ == "__main__":
    monitor()
