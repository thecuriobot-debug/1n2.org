# CurioCharts 🎴🦝

> CoinMarketCap-style market tracker for the **Curio Cards** NFT collection — the OG NFTs from 2017.

![Dark Mode](https://img.shields.io/badge/theme-dark%20mode-0d0d1a)
![Cards](https://img.shields.io/badge/cards-31-22c55e)
![React](https://img.shields.io/badge/react-18-61dafb)

## Features

- **Market Overview** — Track all 31 cards with price, 24h/7d change, volume, market cap, and sparkline charts
- **Card Detail Pages** — Interactive price/volume/sales/market cap charts with 7d–90d time ranges
- **Trending** — Top gainers, losers, and volume leaders
- **Analytics** — Market cap distribution, rarity breakdown, collection-wide averages
- **Search & Sort** — Filter by name, artist, or card number; sort by any column
- **Update Data** — Manual refresh button (ready for cron job integration)
- **Dark Mode** — Deep dark theme inspired by terminal aesthetics

## Quick Start

```bash
cd Sites/curiocharts
npm install
npm run dev
```

Opens at http://localhost:3000

## Build for Production

```bash
npm run build
```

Static files output to `dist/` — deploy anywhere (Nginx, Caddy, Netlify, Vercel, GitHub Pages, DigitalOcean droplet).

## Deploy to Droplet

```bash
npm run build
scp -r dist/* user@your-droplet:/var/www/curiocharts/
```

## Tech Stack

- **Vite** — Fast dev server + production builds
- **React 18** — UI framework
- **Recharts** — Interactive charts (Area, Bar, Composed)
- **Inline SVG** — Custom raccoon mascot + sparklines

## Roadmap

- [ ] OpenSea API integration for live data
- [ ] Cron job for hourly data updates
- [ ] Backend data persistence (SQLite/Postgres)
- [ ] Individual card image thumbnails
- [ ] Wallet connect + portfolio tracking
- [ ] Price alerts

## License

MIT
