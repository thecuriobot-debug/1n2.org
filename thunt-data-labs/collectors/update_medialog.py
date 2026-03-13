#!/usr/bin/env python3.12
"""
MediaLog Daily Updater
Fetches Letterboxd RSS + Goodreads RSS, imports new entries into MediaLog via PHP CLI
"""
import sys, os, json, requests, subprocess
from datetime import datetime
from xml.etree import ElementTree as ET

LETTERBOXD_RSS = "https://letterboxd.com/thomashunt/rss/"
GOODREADS_RSS  = "https://www.goodreads.com/review/list_rss/thomashunt"
MEDIALOG_DIR   = "/Users/curiobot/Sites/1n2.org/medialog"
STATE_FILE     = "/Users/curiobot/.openclaw/medialog-state.json"

def load_state():
    try:    return json.load(open(STATE_FILE))
    except: return {"seen_lb": [], "seen_gr": []}

def save_state(s):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    json.dump(s, open(STATE_FILE,"w"), indent=2)

def fetch_letterboxd(state):
    print("\n🎬 Letterboxd RSS")
    try:
        r = requests.get(LETTERBOXD_RSS, timeout=15)
        root = ET.fromstring(r.text)
        ns = {"lb":"https://letterboxd.com", "dc":"http://purl.org/dc/elements/1.1/"}
        new = 0
        for item in root.findall(".//item"):
            guid = item.findtext("guid","")
            if guid in state["seen_lb"]: continue
            title   = item.findtext("title","")
            link    = item.findtext("link","")
            date    = item.findtext("{https://letterboxd.com}watchedDate","")
            rating  = item.findtext("{https://letterboxd.com}memberRating","")
            film    = item.findtext("{https://letterboxd.com}filmTitle","")
            year    = item.findtext("{https://letterboxd.com}filmYear","")
            # Write PHP import call
            php = f"""<?php
require_once '/Users/curiobot/Sites/1n2.org/medialog/config.php';
$pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",$db_user,$db_pass);
$title = {json.dumps(film)};
$year  = {json.dumps(year)};
$date  = {json.dumps(date)};
$rating= {json.dumps(rating)};
$link  = {json.dumps(link)};
// Check if exists
$ex = $pdo->prepare("SELECT id FROM movies WHERE title=? AND year=?");
$ex->execute([$title,$year]);
if(!$ex->fetch()) {{
    $st = $pdo->prepare("INSERT INTO movies (title,year,watched_date,rating,letterboxd_url,source,created_at) VALUES (?,?,?,?,?,'letterboxd',NOW())");
    $st->execute([$title,$year,$date,$rating?$rating:null,$link]);
    echo "ADDED: $title ($year)\\n";
}} else {{ echo "EXISTS: $title\\n"; }}
"""
            result = subprocess.run(["php","-r", php], capture_output=True, text=True, timeout=10)
            print(f"  {result.stdout.strip()}")
            state["seen_lb"].append(guid)
            new += 1
        print(f"  ✅ {new} new Letterboxd entries processed")
    except Exception as e:
        print(f"  ❌ {e}")

def fetch_goodreads(state):
    print("\n📚 Goodreads RSS")
    try:
        r = requests.get(GOODREADS_RSS, timeout=15)
        root = ET.fromstring(r.text)
        new = 0
        for item in root.findall(".//item"):
            guid = item.findtext("guid","")
            if guid in state["seen_gr"]: continue
            title    = item.findtext("title","")
            link     = item.findtext("link","")
            desc     = item.findtext("description","")
            pub_date = item.findtext("pubDate","")
            # Parse rating from description
            rating = ""
            if "rating:" in desc.lower():
                import re
                m = re.search(r'rating:\s*(\d)', desc, re.I)
                if m: rating = m.group(1)
            php = f"""<?php
require_once '/Users/curiobot/Sites/1n2.org/medialog/config.php';
$pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",$db_user,$db_pass);
$title = {json.dumps(title)};
$link  = {json.dumps(link)};
$rating= {json.dumps(rating)};
$ex = $pdo->prepare("SELECT id FROM books WHERE title=?");
$ex->execute([$title]);
if(!$ex->fetch()) {{
    $st = $pdo->prepare("INSERT INTO books (title,rating,goodreads_url,source,created_at) VALUES (?,?,?,'goodreads',NOW())");
    $st->execute([$title,$rating?$rating:null,$link]);
    echo "ADDED: $title\\n";
}} else {{ echo "EXISTS: $title\\n"; }}
"""
            result = subprocess.run(["php","-r", php], capture_output=True, text=True, timeout=10)
            print(f"  {result.stdout.strip()}")
            state["seen_gr"].append(guid)
            new += 1
        print(f"  ✅ {new} new Goodreads entries processed")
    except Exception as e:
        print(f"  ❌ {e}")

if __name__ == "__main__":
    print(f"📓 MediaLog Update — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    state = load_state()
    # Keep only last 500 seen guids to prevent unbounded growth
    state["seen_lb"] = state["seen_lb"][-500:]
    state["seen_gr"] = state["seen_gr"][-500:]
    fetch_letterboxd(state)
    fetch_goodreads(state)
    save_state(state)
    print("\n✅ MediaLog update complete")
