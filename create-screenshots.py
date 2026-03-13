#!/usr/bin/env python3
"""
Create screenshots for 1n2.org apps
"""
import os
import subprocess
import time

# Apps that need screenshots
apps = [
    {
        'name': 'curiohub',
        'url': 'http://1n2.org/curiohub/',
        'output': 'curiohub/screenshot.png'
    },
    {
        'name': 'curioreview',
        'url': 'http://1n2.org/curioreview/',
        'output': 'curioreview/screenshot.png'
    },
    {
        'name': 'curio-terminal',
        'url': 'http://1n2.org/curio-terminal/',
        'output': 'curio-terminal/screenshot.png'
    },
    {
        'name': 'curio-oracle',
        'url': 'http://1n2.org/curio-oracle/',
        'output': 'curio-oracle/screenshot.png'
    },
    {
        'name': 'curio-atlas',
        'url': 'http://1n2.org/curio-atlas/',
        'output': 'curio-atlas/screenshot.png'
    },
    {
        'name': 'daily-logs',
        'url': 'http://1n2.org/daily-logs/',
        'output': 'daily-logs/screenshot.png'
    },
    {
        'name': 'daily-thunt',
        'url': 'http://1n2.org/daily-thunt/',
        'output': 'daily-thunt/screenshot.png'
    },
    {
        'name': 'curio-quant',
        'url': 'http://1n2.org/curio-quant/',
        'output': 'curio-quant/screenshot.png'
    },
    {
        'name': 'thomashuntfilms',
        'url': 'http://1n2.org/thomashuntfilms/',
        'output': 'thomashuntfilms/screenshot.png'
    }
]

# Use screencapture (macOS built-in)
for app in apps:
    print(f"📸 Capturing screenshot for {app['name']}...")
    
    # Open in browser
    subprocess.run(['open', app['url']], check=False)
    time.sleep(3)  # Wait for page to load
    
    # Create directory if needed
    output_dir = os.path.dirname(app['output'])
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print(f"   Please take screenshot manually and save to: {app['output']}")
    print(f"   Press Enter when done...")
    input()

print("✅ All screenshots captured!")
