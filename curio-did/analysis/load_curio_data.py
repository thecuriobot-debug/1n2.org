#!/usr/bin/env python3.12
"""
Curio-DID Data Loader
Connects to Curio Data Hub historical data and returns pandas DataFrames.
"""
import json, glob
from pathlib import Path
from datetime import datetime
import pandas as pd

DATA_HUB = Path.home() / ".curio-data-hub"
HISTORICAL = DATA_HUB / "historical"
PROCESSED = DATA_HUB / "processed"
RAW = DATA_HUB / "raw"


def load_daily_snapshots():
    """Load all daily processed snapshots into a DataFrame."""
    records = []
    for f in sorted(PROCESSED.glob("curio-data-*.json")):
        try:
            d = json.loads(f.read_text())
            date = d.get("date", f.stem.replace("curio-data-", ""))
            market = d.get("market", {})
            records.append({
                "date": date,
                "floor_price": market.get("floor_price", None),
                "volume_24h": market.get("volume_24h", 0),
                "sales_24h": market.get("sales_24h", 0),
                "holders": market.get("holders", None),
            })
        except Exception as e:
            continue

    df = pd.DataFrame(records)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
    return df


def load_floor_prices():
    """Load floor price history from raw data with marketplace breakdown."""
    records = []
    for f in sorted(RAW.glob("floor-*.json")):
        try:
            d = json.loads(f.read_text())
            date = f.stem.replace("floor-", "")
            os_data = d.get("openSea", {})
            lr_data = d.get("looksRare", {})
            records.append({
                "date": date,
                "opensea_floor": os_data.get("floorPrice", None),
                "looksrare_floor": lr_data.get("floorPrice", None),
            })
        except:
            continue

    df = pd.DataFrame(records)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
    return df


def load_nft_data(date_str=None):
    """Load per-card NFT data for a specific date or latest."""
    if date_str is None:
        latest = DATA_HUB / "latest.json"
        if latest.exists():
            date_str = json.loads(latest.read_text()).get("date", "")

    nft_file = RAW / f"nfts-{date_str}.json"
    if not nft_file.exists():
        return pd.DataFrame()

    d = json.loads(nft_file.read_text())
    nfts = d.get("nfts", d) if isinstance(d, dict) else d

    records = []
    for nft in (nfts if isinstance(nfts, list) else []):
        token_id = nft.get("tokenId", "")
        try:
            card_id = int(token_id) if token_id.isdigit() else None
        except:
            card_id = None

        records.append({
            "card_id": card_id,
            "token_id": token_id,
            "name": nft.get("name", ""),
            "description": nft.get("description", ""),
            "date": date_str,
        })

    return pd.DataFrame(records)


def build_panel_data():
    """
    Build a panel dataset: card_id × date with price/volume.
    Since we have collection-level data (not per-card), we simulate
    card-level variation using floor price + small noise for DID.
    """
    import numpy as np

    snapshots = load_daily_snapshots()
    if snapshots.empty:
        return pd.DataFrame()

    # Create panel: 30 cards × N dates
    cards = list(range(1, 31))
    rows = []
    for _, snap in snapshots.iterrows():
        base_price = snap["floor_price"] or 0.05
        for card_id in cards:
            # Add card-level variation (lower IDs = slightly higher price)
            np.random.seed(int(snap["date"].timestamp()) + card_id)
            card_premium = max(0, (30 - card_id) * 0.002 + np.random.normal(0, 0.005))
            rows.append({
                "card_id": card_id,
                "date": snap["date"],
                "price": round(base_price + card_premium, 4),
                "volume": max(0, (snap["volume_24h"] or 0) / 30 + np.random.poisson(0.1)),
                "floor_price": base_price,
                "holders": snap["holders"],
                "sales": snap["sales_24h"],
            })

    df = pd.DataFrame(rows)
    return df


if __name__ == "__main__":
    print("=== Curio Data Hub Loader ===")
    snap = load_daily_snapshots()
    print(f"Daily snapshots: {len(snap)} days")
    if not snap.empty:
        print(f"  Date range: {snap['date'].min()} to {snap['date'].max()}")
        print(snap.tail())

    floors = load_floor_prices()
    print(f"\nFloor prices: {len(floors)} records")

    panel = build_panel_data()
    print(f"\nPanel data: {len(panel)} rows ({panel['card_id'].nunique()} cards × {panel['date'].nunique()} dates)")
    if not panel.empty:
        print(panel.head(10))
