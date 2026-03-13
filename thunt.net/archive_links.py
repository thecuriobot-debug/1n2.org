#!/usr/bin/env python3
"""
Archive Net Interest links - download HTML, images, CSS
Save to local directory structure
Detect broken links
"""
import re, json, time, urllib.request, urllib.parse, urllib.error
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser
import socket

# Configure timeout
socket.setdefaulttimeout(10)

sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql = f.read()

def esc(t):
    return t.replace("\\'", "'").replace("\\r\\n", "\n").replace("\\n", "\n") if t else ""

def fmt_ts(ts):
    if not ts or len(str(ts)) < 8: return ("Unknown", 2000)
    s = str(ts)
    try:
        y, m, d = s[0:4], s[4:6], s[6:8]
        dt = datetime(int(y), int(m), int(d))
        return (dt.strftime("%b %d, %Y"), int(y))
    except: return (s, 2000)

# Parse net interest links
links = []
for m in re.finditer(r"INSERT INTO thuntnet_archive VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+), '(.*?)', '(.*?)'\);", sql, re.DOTALL):
    if m[8] == 'net_interest':  # section
        links.append({
            'id': m[1],
            'headline': esc(m[2]),
            'summary': esc(m[6]),
            'date': m[7],
            'link': m[9]
        })

links.sort(key=lambda x: x['date'])

print(f"📋 Found {len(links)} Net Interest links")

# Create directory structure
base_dir = Path(__file__).parent / "net_interest"
saved_dir = base_dir / "saved_webpages"
saved_dir.mkdir(parents=True, exist_ok=True)

print(f"📁 Created: {saved_dir}")

class SimpleHTMLParser(HTMLParser):
    """Extract images and links from HTML"""
    def __init__(self):
        super().__init__()
        self.images = []
        self.stylesheets = []
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'img' and 'src' in attrs_dict:
            self.images.append(attrs_dict['src'])
        elif tag == 'link' and attrs_dict.get('rel') == 'stylesheet':
            if 'href' in attrs_dict:
                self.stylesheets.append(attrs_dict['href'])

def make_absolute_url(base_url, url):
    """Convert relative URL to absolute"""
    if url.startswith('http://') or url.startswith('https://'):
        return url
    elif url.startswith('//'):
        return 'http:' + url
    elif url.startswith('/'):
        parsed = urllib.parse.urlparse(base_url)
        return f"{parsed.scheme}://{parsed.netloc}{url}"
    else:
        return urllib.parse.urljoin(base_url, url)

def sanitize_filename(name):
    """Make safe filename"""
    return "".join(c if c.isalnum() or c in ('-', '_', '.') else '_' for c in name)[:100]

def download_page(url, link_id):
    """Download webpage and its assets"""
    try:
        # Add http:// if missing
        if not url.startswith('http'):
            url = 'http://' + url
        
        # Create directory for this page
        page_dir = saved_dir / f"link_{link_id}"
        page_dir.mkdir(exist_ok=True)
        
        # Download HTML
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=15) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
            
        # Save HTML
        html_file = page_dir / "index.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Parse HTML for assets
        parser = SimpleHTMLParser()
        parser.feed(html_content)
        
        # Download images (limit to first 10)
        images_saved = 0
        for img_url in parser.images[:10]:
            try:
                abs_url = make_absolute_url(url, img_url)
                img_name = sanitize_filename(Path(abs_url).name) or f"image_{images_saved}.jpg"
                img_path = page_dir / img_name
                
                urllib.request.urlretrieve(abs_url, img_path)
                images_saved += 1
                
                # Replace in HTML
                html_content = html_content.replace(img_url, img_name)
            except:
                pass
        
        # Save updated HTML
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Save metadata
        meta = {
            'url': url,
            'downloaded': datetime.now().isoformat(),
            'images': images_saved,
            'size': len(html_content)
        }
        with open(page_dir / "metadata.json", 'w') as f:
            json.dump(meta, f, indent=2)
        
        return True, images_saved, len(html_content)
        
    except urllib.error.HTTPError as e:
        return False, 0, 0
    except urllib.error.URLError as e:
        return False, 0, 0
    except socket.timeout:
        return False, 0, 0
    except Exception as e:
        return False, 0, 0

# Download all links
print(f"\n🌐 Downloading {len(links)} webpages...")
print("=" * 60)

successful = []
broken = []
total_images = 0
total_bytes = 0

for i, link in enumerate(links):
    if not link['link']:
        print(f"{i+1}/{len(links)}: [SKIP] No URL - {link['headline']}")
        broken.append(link)
        continue
    
    print(f"{i+1}/{len(links)}: {link['link'][:50]}")
    
    success, images, size = download_page(link['link'], link['id'])
    
    if success:
        print(f"  ✅ Downloaded ({size:,} bytes, {images} images)")
        link['local_path'] = f"net_interest/saved_webpages/link_{link['id']}/index.html"
        link['images'] = images
        link['size'] = size
        successful.append(link)
        total_images += images
        total_bytes += size
    else:
        print(f"  ❌ Failed")
        broken.append(link)
    
    # Rate limiting
    time.sleep(1)

print("\n" + "=" * 60)
print(f"\n📊 Results:")
print(f"   Total links: {len(links)}")
print(f"   ✅ Successful: {len(successful)} ({len(successful)/len(links)*100:.1f}%)")
print(f"   ❌ Broken: {len(broken)} ({len(broken)/len(links)*100:.1f}%)")
print(f"   📸 Images saved: {total_images}")
print(f"   💾 Total size: {total_bytes:,} bytes ({total_bytes/1024/1024:.2f} MB)")

# Save results
results = {
    'total': len(links),
    'successful': len(successful),
    'broken': len(broken),
    'images': total_images,
    'bytes': total_bytes,
    'timestamp': datetime.now().isoformat()
}

with open(base_dir / "archive_results.json", 'w') as f:
    json.dump(results, f, indent=2)

with open(base_dir / "successful_links.json", 'w') as f:
    json.dump(successful, f, indent=2)

with open(base_dir / "broken_links.json", 'w') as f:
    json.dump(broken, f, indent=2)

print(f"\n💾 Saved results to:")
print(f"   {base_dir / 'archive_results.json'}")
print(f"   {base_dir / 'successful_links.json'}")
print(f"   {base_dir / 'broken_links.json'}")

print(f"\n🎉 Archiving complete!")
print(f"\nNext: Run generate_links_page.py to create updated Net Interest page")
