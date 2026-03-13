#!/bin/bash
#
# TWIKIT SETUP - The Working Solution
# Sets up Twikit API scraper (no browser, no blocks!)
#

cd "$(dirname "$0")/api"

echo "=========================================="
echo "TWIKIT SETUP"
echo "=========================================="
echo ""
echo "This is the WORKING solution for Twitter!"
echo ""
echo "Twikit uses Twitter's API (not browser):"
echo "  ✅ No browser blocks"
echo "  ✅ No login issues"
echo "  ✅ Fast and reliable"
echo "  ✅ Already installed in your old scrapers"
echo ""
echo "We'll:"
echo "  1. Install/update Twikit"
echo "  2. Set up credentials"
echo "  3. Login once"
echo "  4. Fetch tweets"
echo ""
echo "Press ENTER to continue..."
read

# Check if twikit is installed
echo ""
echo "📦 Checking Twikit installation..."
if python3 -c "import twikit" 2>/dev/null; then
    echo "✅ Twikit already installed"
else
    echo "Installing Twikit..."
    pip3 install twikit --break-system-packages
fi

echo ""
echo "=========================================="
echo "STEP 1: Twitter Credentials"
echo "=========================================="
echo ""
echo "We need your Twitter login info."
echo "This is stored locally and ONLY used for login."
echo ""
echo "Recommended: Use a dedicated Twitter account"
echo "(not your main account)"
echo ""

# Check if creds exist
if [ -f "twitter-creds.json" ]; then
    echo "✅ Credentials file already exists: twitter-creds.json"
    echo ""
    read -p "Use existing credentials? (y/n): " use_existing
    if [ "$use_existing" != "y" ]; then
        rm twitter-creds.json
    fi
fi

# Create creds if needed
if [ ! -f "twitter-creds.json" ]; then
    read -p "Twitter username (without @): " username
    read -p "Twitter email: " email
    read -s -p "Twitter password: " password
    echo ""
    
    cat > twitter-creds.json << EOF
{
  "username": "$username",
  "email": "$email",
  "password": "$password"
}
EOF
    echo "✅ Credentials saved to twitter-creds.json"
fi

echo ""
echo "=========================================="
echo "STEP 2: Login to Twitter"
echo "=========================================="
echo ""
echo "Logging in and saving cookies..."
echo "(This only needs to be done once)"
echo ""

python3 twikit-fetch.py --login

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Login failed!"
    echo ""
    echo "Common issues:"
    echo "  - Wrong password"
    echo "  - 2FA enabled (disable or use app password)"
    echo "  - Account locked"
    echo ""
    echo "Fix the issue and run this script again."
    exit 1
fi

echo ""
echo "=========================================="
echo "STEP 3: Fetch Tweets"
echo "=========================================="
echo ""
read -p "How many accounts to scrape? (default: 50): " num_accounts
num_accounts=${num_accounts:-50}

echo ""
echo "Fetching tweets from top $num_accounts accounts..."
python3 twikit-fetch.py --fetch $num_accounts

echo ""
echo "=========================================="
echo "✅ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Twikit is now set up and working!"
echo ""
echo "Daily usage:"
echo "  cd api"
echo "  python3 twikit-fetch.py --fetch 50"
echo ""
echo "Or from root:"
echo "  ./update_twikit.sh"
echo ""
echo "Check tweets in: ../data/tweets.json"
echo "Refresh Tweetster to see them!"
echo ""
