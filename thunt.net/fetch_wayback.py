#!/usr/bin/env python3
"""
Fetch broken links from Internet Archive Wayback Machine
Find best snapshot from 2000-2001 era
Save to saved_webpages and create "Wayback Machine" tab
"""
import json, time, urllib.request, urllib.parse, urllib.error
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser

base_dir = Path(__file__).parent / "net_interest"
saved_dir = base_dir / "saved_webpages"

# Load broken links
with open(base_dir / "broken_links.json") as f:
    broken = json.load(f)

print(f"🔍 Checking {len(broken)} broken links in Wayback Machine...")
print("=" * 70)

def get_wayback_url(url, year=2001):
    """
    Get Wayback Machine snapshot URL
    Returns: (snapshot_url, timestamp) or (None, None)
    """
    try:
        # Clean URL
        if not url.startswith('http'):
            url = 'http://' + url
        
        # Wayback API endpoint
        api_url = f"http://archive.org/wayback/available?url={urllib.parse.quote(url)}"
        
        with urllib.request.urlopen(api_url, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        # Check if snapshot available
        if data.get('archived_snapshots') and data['archived_snapshots'].get('closest'):
            snapshot = data['archived_snapshots']['closest']
            if snapshot.get('available'):
                return snapshot['url'], snapshot['timestamp']
        
        return None, None
    except Exception as e:
        return None, None

class SimpleHTMLParser(HTMLParser):
    """Extract images from HTML"""
    def __init__(self):
        super().__init__()
        self.images = []
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'img' and 'src' in attrs_dict:
            self.images.append(attrs_dict['src'])

def download_wayback_page(wayback_url, original_url, link_id):
    """Download page from Wayback Machine"""
    try:
        # Create directory
        page_dir = saved_dir / f"wayback_{link_id}"
        page_dir.mkdir(exist_ok=True)
        
        # Download HTML
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        req = urllib.request.Request(wayback_url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=20) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
        
        # Remove Wayback Machine toolbar
        html_content = html_content.replace('<!-- BEGIN WAYBACK TOOLBAR INSERT -->', '')
        
        # Save HTML
        html_file = page_dir / "index.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Parse for images
        parser = SimpleHTMLParser()
        parser.feed(html_content)
        
        # Download images (limit to first 5 from Wayback)
        images_saved = 0
        for img_url in parser.images[:5]:
            try:
                # Make Wayback URL for image
                if 'web.archive.org' not in img_url:
                    # Image URL needs to be converted to Wayback format
                    continue
                
                img_name = f"image_{images_saved}.jpg"
                img_path = page_dir / img_name
                
                urllib.request.urlretrieve(img_url, img_path)
                images_saved += 1
            except:
                pass
        
        # Save metadata
        meta = {
            'original_url': original_url,
            'wayback_url': wayback_url,
            'downloaded': datetime.now().isoformat(),
            'images': images_saved,
            'size': len(html_content),
            'source': 'wayback_machine'
        }
        with open(page_dir / "metadata.json", 'w') as f:
            json.dump(meta, f, indent=2)
        
        return True, images_saved, len(html_content), wayback_url
        
    except Exception as e:
        print(f"    ⚠️  Download failed: {e}")
        return False, 0, 0, None

# Check each broken link in Wayback Machine
wayback_found = []
still_missing = []
total_images = 0
total_bytes = 0

for i, link in enumerate(broken):
    if not link['link']:
        still_missing.append(link)
        continue
    
    print(f"\n{i+1}/{len(broken)}: {link['link'][:60]}")
    print(f"  Headline: {link['headline'][:60]}")
    
    # Check Wayback Machine
    print(f"  🔍 Checking Wayback Machine...")
    wayback_url, timestamp = get_wayback_url(link['link'])
    
    if wayback_url:
        print(f"  ✅ Found snapshot: {timestamp[:8]}")
        
        # Download from Wayback
        success, images, size, final_url = download_wayback_page(wayback_url, link['link'], link['id'])
        
        if success:
            print(f"  📥 Downloaded ({size:,} bytes, {images} images)")
            link['wayback_url'] = final_url
            link['wayback_timestamp'] = timestamp
            link['local_path'] = f"net_interest/saved_webpages/wayback_{link['id']}/index.html"
            link['images'] = images
            link['size'] = size
            wayback_found.append(link)
            total_images += images
            total_bytes += size
        else:
            print(f"  ❌ Failed to download")
            still_missing.append(link)
    else:
        print(f"  ❌ Not in Wayback Machine")
        still_missing.append(link)
    
    # Rate limiting
    time.sleep(2)

print("\n" + "=" * 70)
print(f"\n📊 Wayback Machine Results:")
print(f"   Broken links checked: {len(broken)}")
print(f"   ✅ Found in Wayback: {len(wayback_found)} ({len(wayback_found)/len(broken)*100:.1f}%)")
print(f"   ❌ Still missing: {len(still_missing)} ({len(still_missing)/len(broken)*100:.1f}%)")
print(f"   📸 Images saved: {total_images}")
print(f"   💾 Total size: {total_bytes:,} bytes ({total_bytes/1024/1024:.2f} MB)")

# Save results
with open(base_dir / "wayback_links.json", 'w') as f:
    json.dump(wayback_found, f, indent=2)

with open(base_dir / "missing_links.json", 'w') as f:
    json.dump(still_missing, f, indent=2)

# Update archive results
with open(base_dir / "archive_results.json") as f:
    stats = json.load(f)

stats['wayback'] = len(wayback_found)
stats['missing'] = len(still_missing)
stats['wayback_images'] = total_images
stats['wayback_bytes'] = total_bytes

with open(base_dir / "archive_results.json", 'w') as f:
    json.dump(stats, f, indent=2)

print(f"\n💾 Results saved:")
print(f"   wayback_links.json - {len(wayback_found)} recovered links")
print(f"   missing_links.json - {len(still_missing)} permanently lost")
print(f"   archive_results.json - updated stats")

print(f"\n🎉 Wayback Machine recovery complete!")
print(f"\nNext: Run update_links_page.py to add Wayback Machine tab")
