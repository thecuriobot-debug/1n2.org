#!/usr/bin/env python3
"""Quick login script for twikit. Creates cookies file for local-fetch.py"""
import asyncio, json, os, sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(SCRIPT_DIR, 'twitter-cookies.json')
CREDS_FILE = os.path.join(SCRIPT_DIR, 'twitter-creds.json')

async def main():
    from twikit import Client
    client = Client('en-US')
    
    # Load creds from file or args
    if os.path.exists(CREDS_FILE):
        with open(CREDS_FILE, 'r') as f:
            creds = json.load(f)
        username = creds['username']
        email = creds.get('email', '')
        password = creds['password']
    elif len(sys.argv) >= 4:
        username, email, password = sys.argv[1], sys.argv[2], sys.argv[3]
    else:
        print(f"Usage: python3 {sys.argv[0]} <username> <email> <password>")
        print(f"   Or: create {CREDS_FILE} with {{username, email, password}}")
        return
    
    print(f"🔑 Logging in as @{username}...")
    try:
        await client.login(
            auth_info_1=username,
            auth_info_2=email,
            password=password,
        )
        client.save_cookies(COOKIES_FILE)
        print(f"✅ Success! Cookies saved to {COOKIES_FILE}")
        print(f"   Now run: python3 local-fetch.py --auto")
    except Exception as e:
        print(f"❌ Login failed: {e}")

asyncio.run(main())
