# 🦝 CurioCharts Data Update Guide

## Current Data Status
- **Last Updated:** Feb 15, 2026
- **Source:** OpenSea (manual verification)
- **Collection Floor:** 0.044 ETH
- **Cards:** 31 cards with floor prices

## Why Manual Updates?

OpenSea uses JavaScript rendering, which means:
- ❌ Simple HTTP scrapers can't access the data
- ❌ Their API requires a key (which they're not issuing consistently)
- ❌ API alternatives (Reservoir) are shutting down
- ✅ **Manual updates are actually the most reliable method**

## How to Update Data

### Quick Update (Collection Floor Only)
1. Visit https://opensea.io/collection/curiocardswrapper
2. Note the collection floor price
3. Edit `data.json` and update `collection.floor`

### Full Update (Individual Card Floors)
1. Visit each card's OpenSea page:
   - https://opensea.io/item/ethereum/0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313/1
   - https://opensea.io/item/ethereum/0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313/2
   - etc.

2. Note the "Item Floor" price for each card

3. Edit `data.json` and update the `floor` value for each card

### Automated Helper (if OpenSea changes)
If you want to try automated updates in the future:

**Option 1: Get OpenSea API Key**
- Go to https://opensea.io → Settings → Developer
- Request API key (if available)
- Use `fetch_data.py` with your key

**Option 2: Use Selenium/Playwright**
- Install: `pip install selenium` or `pip install playwright`
- Requires Chrome/Firefox browser
- Can render JavaScript pages
- I can help you set this up if needed

## Data File Structure

```json
{
  "collection": {
    "floor": 0.044  ← Update this
  },
  "cards": [
    {
      "id": "1",
      "name": "Apples",
      "floor": 0.389  ← Update this
    }
  ]
}
```

## Update Frequency Recommendations

- **High volatility:** Update daily
- **Normal market:** Update weekly  
- **Stable market:** Update monthly

Curio Cards are relatively stable, so **monthly updates are probably fine**.

## Future: Better Scraping Options

If you want to invest in better scraping:

1. **Selenium** - Full browser automation
   ```bash
   pip install selenium
   # Requires ChromeDriver
   ```

2. **Playwright** - Modern browser automation
   ```bash
   pip install playwright
   playwright install chromium
   ```

3. **Paid Services** - SimpleHash, NFT Price Floor APIs

Let me know if you want help setting any of these up!
