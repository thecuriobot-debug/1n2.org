#!/usr/bin/env python3
"""
Automatically capture screenshots of 1n2.org apps using Playwright
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

# Apps to screenshot
apps = [
    ('http://1n2.org/curiohub/', f'{base_dir}/curiohub/screenshot.png'),
    ('http://1n2.org/curioreview/', f'{base_dir}/curioreview/screenshot.png'),
    ('http://1n2.org/curio-terminal/', f'{base_dir}/curio-terminal/screenshot.png'),
    ('http://1n2.org/curio-oracle/', f'{base_dir}/curio-oracle/screenshot.png'),
    ('http://1n2.org/curio-atlas/', f'{base_dir}/curio-atlas/screenshot.png'),
    ('http://1n2.org/daily-logs/', f'{base_dir}/daily-logs/screenshot.png'),
    ('http://1n2.org/daily-thunt/', f'{base_dir}/daily-thunt/screenshot.png'),
    ('http://1n2.org/curio-quant/', f'{base_dir}/curio-quant/screenshot.png'),
    ('http://1n2.org/thomashuntfilms/', f'{base_dir}/thomashuntfilms/screenshot.png'),
]

if __name__ == '__main__':
    print("🚀 Starting screenshot capture...")
    print(f"📁 Output directory: {base_dir}")
    print()
    
    for url, output in apps:
        capture_screenshot(url, output)
        print()
    
    print("✅ All screenshots captured!")
    print(f"\n📋 Created {len(apps)} screenshots")
