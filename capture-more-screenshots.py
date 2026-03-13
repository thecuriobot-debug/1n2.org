#!/usr/bin/env python3
"""
Capture additional screenshots for remaining apps
"""
from playwright.sync_api import sync_playwright
import os
import time

def capture_screenshot(url, output_path, width=1200, height=800):
    """Capture a screenshot of a URL"""
    print(f"📸 Capturing {url}...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': width, 'height': height})
        
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            time.sleep(2)  # Extra wait for animations
            
            # Create directory if needed
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Take screenshot
            page.screenshot(path=output_path, full_page=False)
            print(f"   ✅ Saved to {output_path}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
        finally:
            browser.close()

# Base directory
base_dir = "/Users/curiobot/Sites/1n2.org"

# Additional apps to screenshot
apps = [
    ('http://1n2.org/medialog/', f'{base_dir}/medialog/screenshot.png'),
    ('http://1n2.org/tweetster/', f'{base_dir}/tweetster/screenshot.png'),
    ('http://1n2.org/curiocharts/', f'{base_dir}/curiocharts/screenshot.png'),
    ('http://1n2.org/curioarchive/', f'{base_dir}/curioarchive/screenshot.png'),
    ('http://thunt.net/', f'{base_dir}/thunt-net-screenshot.png'),
]

if __name__ == '__main__':
    print("🚀 Starting additional screenshot capture...")
    print(f"📁 Output directory: {base_dir}")
    print()
    
    for url, output in apps:
        capture_screenshot(url, output)
        print()
    
    print("✅ All additional screenshots captured!")
    print(f"\n📋 Created {len(apps)} screenshots")
