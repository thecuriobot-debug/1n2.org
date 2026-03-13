const scene = document.getElementById("scene");
const priceValue = document.getElementById("priceValue");
const priceDelta = document.getElementById("priceDelta");
const trendLabel = document.getElementById("trendLabel");
const lastUpdated = document.getElementById("lastUpdated");

const happyCoin = document.getElementById("happyCoin");
const madCoin = document.getElementById("madCoin");
const neutralCoin = document.getElementById("neutralCoin");

const POLL_MS = 15000;
const EPSILON = 0.009;

const formatPrice = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let lastPrice = null;

function setMood(direction) {
  happyCoin.classList.toggle("active", direction === "up");
  madCoin.classList.toggle("active", direction === "down");
  neutralCoin.classList.toggle("active", direction === "flat");
}

function setMarketState(direction) {
  scene.classList.remove("market-up", "market-down", "market-flat");

  if (direction === "up") {
    scene.classList.add("market-up");
    trendLabel.textContent = "Track status: CLIMBING";
    setMood("up");
    return;
  }

  if (direction === "down") {
    scene.classList.add("market-down");
    trendLabel.textContent = "Track status: DESCENDING";
    setMood("down");
    return;
  }

  scene.classList.add("market-flat");
  trendLabel.textContent = "Track status: FLAT";
  setMood("flat");
}

function updateView(nextPrice, fetchedAt) {
  priceValue.textContent = formatPrice.format(nextPrice);

  if (lastPrice === null) {
    priceDelta.textContent = "First checkpoint locked. Train is rolling.";
    setMarketState("flat");
    lastPrice = nextPrice;
    lastUpdated.textContent = `Last update: ${fetchedAt.toLocaleTimeString()}`;
    return;
  }

  const diff = nextPrice - lastPrice;
  const absDiff = Math.abs(diff);
  const direction = absDiff <= EPSILON ? "flat" : diff > 0 ? "up" : "down";
  const ratio = diff / lastPrice;
  const sign = diff > 0 ? "+" : "";

  if (direction === "flat") {
    priceDelta.textContent = "No meaningful move since last tick.";
  } else {
    priceDelta.textContent = `${sign}${formatPrice.format(diff)} (${formatPct.format(ratio)}) since last tick`;
  }

  setMarketState(direction);
  lastPrice = nextPrice;
  lastUpdated.textContent = `Last update: ${fetchedAt.toLocaleTimeString()}`;
}

async function fetchFromCoinGecko() {
  const endpoint =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true";
  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CoinGecko error: ${res.status}`);
  }

  const json = await res.json();
  const price = json?.bitcoin?.usd;
  const stamp = json?.bitcoin?.last_updated_at;

  if (typeof price !== "number") {
    throw new Error("CoinGecko payload missing bitcoin.usd");
  }

  const fetchedAt = typeof stamp === "number" ? new Date(stamp * 1000) : new Date();
  return { price, fetchedAt, source: "CoinGecko" };
}

async function fetchFromCoinbase() {
  const endpoint = "https://api.coinbase.com/v2/prices/spot?currency=USD";
  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Coinbase error: ${res.status}`);
  }

  const json = await res.json();
  const price = Number.parseFloat(json?.data?.amount);

  if (!Number.isFinite(price)) {
    throw new Error("Coinbase payload missing data.amount");
  }

  return { price, fetchedAt: new Date(), source: "Coinbase" };
}

async function fetchBtcPrice() {
  const sources = [fetchFromCoinGecko, fetchFromCoinbase];
  let lastError = null;

  for (const source of sources) {
    try {
      return await source();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No data sources available.");
}

async function refreshPrice() {
  try {
    const { price, fetchedAt, source } = await fetchBtcPrice();
    updateView(price, fetchedAt);
    lastUpdated.textContent += ` via ${source}`;
  } catch (error) {
    const now = new Date().toLocaleTimeString();
    priceDelta.textContent = "Price feed offline. Keeping train in cruise mode.";
    lastUpdated.textContent = `Last error check: ${now}`;
    setMarketState("flat");
    trendLabel.textContent = "Track status: SIGNAL LOST";
    console.error(error);
  }
}

setMood("flat");
refreshPrice();
setInterval(refreshPrice, POLL_MS);
