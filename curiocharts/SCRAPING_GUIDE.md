# ROBUST WEB SCRAPING GUIDE
## Solutions for API Blocks & Network Restrictions

### 🎯 THE PROBLEM
- APIs get blocked or deprecated
- Network restrictions prevent direct API access
- Need reliable data despite infrastructure changes

### ✅ THE SOLUTION: Multi-Source Strategy

## 1. PRIMARY: Use External API Scrapers

Run scripts on YOUR MACHINE (not in containers) to bypass network blocks.

### Example: CoinGecko NFT API (FREE, NO KEY REQUIRED)
```bash
python3 fetch_multisource.py
```

**Why it works:**
- Runs outside Docker/container network restrictions
- CoinGecko free tier = 30 calls/min
- No API key needed for basic endpoints
- Aggregates data from multiple marketplaces

**Current working endpoint:**
```
https://api.coingecko.com/api/v3/nfts/ethereum/contract/{CONTRACT_ADDRESS}
```

## 2. FALLBACK: Browser Automation

When APIs fail, use Claude in Chrome to scrape websites directly.

**Advantages:**
- Bypasses API restrictions
- Acts like a real user
- Can handle JavaScript-heavy sites
- Reads actual rendered content

**Limitations:**
- Some sites blocked by safety restrictions (OpenSea)
- Slower than API calls
- Requires more complex logic

## 3. BACKUP: Static Data + Manual Updates

Keep a template with known data, update periodically.

```json
{
  "collection": {
    "floor": 0.051,
    "total_volume": 0.495
  }
}
```

## 📋 CURRENT WORKING SCRAPERS

### ✅ CoinGecko Multi-Source
**File:** `/Users/curiobot/Sites/1n2.org/curiocharts/fetch_multisource.py`
**Status:** ✅ WORKING (as of 2026-02-15)
**Features:**
- CoinGecko API (primary)
- NFT Price Floor scraping (fallback)
- Manual data (last resort)

**Output:**
- Collection floor price: ✅
- 24h volume: ✅
- Individual token floors: ❌ (needs enhancement)

### Run it:
```bash
cd /Users/curiobot/Sites/1n2.org/curiocharts
python3 fetch_multisource.py
```

## 🔧 HOW TO ADD MORE SOURCES

### Template for New API:
```python
def try_new_api():
    """Try NewAPI"""
    print("Attempting NewAPI...")
    
    try:
        url = "https://api.example.com/nft/data"
        headers = {"Accept": "application/json"}
        
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return {
                "source": "newapi",
                "floor": data.get("floor_price"),
                "volume": data.get("volume")
            }
    except Exception as e:
        print(f"  ❌ Failed: {e}")
    
    return None
```

## 🌐 ALTERNATIVE FREE NFT DATA APIS

### 1. Alchemy NFT API
- **Free tier:** 300M compute units/month
- **Endpoint:** `https://eth-mainnet.g.alchemy.com/nft/v3/{API_KEY}/...`
- **Get key:** alchemy.com

### 2. Moralis NFT API
- **Free tier:** 40,000 requests/month
- **Fast & comprehensive**
- **Get key:** moralis.io

### 3. NFT Price Floor (Web Scraping)
- **URL:** `https://nftpricefloor.com/curio-cards`
- **Method:** HTML parsing
- **Reliability:** Medium (DOM changes break it)

### 4. CoinGecko (Currently Active)
- **Free tier:** 30 calls/min, no key needed
- **Best for:** Collection-level data
- **Limitation:** No individual token floors

## 🚀 FUTURE-PROOF STRATEGY

1. **Always use multiple sources**
   - Primary: API with best data
   - Secondary: Backup API
   - Tertiary: Web scraping
   - Final: Static fallback

2. **Run outside containers**
   - Container networks often blocked
   - Your machine has normal internet access

3. **Cache data locally**
   - Don't re-fetch every page load
   - Update hourly/daily as needed

4. **Monitor API changes**
   - Test regularly
   - Have alerts for failures
   - Keep fallbacks ready

## 📝 MAINTENANCE CHECKLIST

Weekly:
- [ ] Run `fetch_multisource.py`
- [ ] Check if floor price updated
- [ ] Verify data.json is valid

Monthly:
- [ ] Test each API source
- [ ] Check for API deprecation notices
- [ ] Update scraper if needed

Quarterly:
- [ ] Research new API options
- [ ] Add new sources to scraper
- [ ] Remove deprecated sources

## 🎓 KEY LESSONS

1. **APIs die, websites change** → Always have 3+ sources
2. **Network matters** → Run outside containers
3. **Free tiers exist** → CoinGecko, Alchemy, Moralis all free
4. **Scraping is backup** → Use it when APIs fail
5. **Cache everything** → Don't abuse rate limits

## 📊 CURRENT STATUS

**Working:**
- ✅ CoinGecko API (collection floor & volume)
- ✅ Multi-source fallback system
- ✅ Automated data fetching
- ✅ JSON output generation

**Needs Work:**
- ❌ Individual token floors (requires per-token lookup or OpenSea scraping)
- ❌ Real-time updates (currently manual run)
- ❌ Browser automation integration (for sites that block APIs)

## 🔮 NEXT STEPS

1. **Add Alchemy or Moralis** for individual token data
2. **Create cron job** to auto-update daily
3. **Add browser scraping** for OpenSea item floors
4. **Build monitoring** to alert on API failures

---

**Remember:** The goal is RELIABILITY over perfection. Having working data from 2 sources beats having perfect data from 0 sources.
