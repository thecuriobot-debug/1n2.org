const API_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
const POLL_INTERVAL_MS = 30_000;

const BOATS = {
  shipwreck: {
    id: "shipwreck",
    asset: "shipwreck.png",
    emoji: "💥🛳️",
    message: "Bitcoin sank! Shipwreck!",
    bobSeconds: 2.8,
  },
  submarine: {
    id: "submarine",
    asset: "submarine.png",
    emoji: "🚢",
    message: "Bitcoin diving underwater.",
    bobSeconds: 3.8,
  },
  sailboat: {
    id: "sailboat",
    asset: "sailboat.png",
    emoji: "⛵",
    message: "Calm seas. Market sideways.",
    bobSeconds: 3.4,
  },
  speedboat: {
    id: "speedboat",
    asset: "speedboat.png",
    emoji: "🚤",
    message: "Speedboat rally!",
    bobSeconds: 2.4,
  },
  yacht: {
    id: "yacht",
    asset: "yacht.png",
    emoji: "🛥️",
    message: "Luxury bull market! Bitcoin yacht.",
    bobSeconds: 1.9,
  },
};

const tracker = document.getElementById("tracker");
const boatWrapper = document.getElementById("boatWrapper");
const boatImage = document.getElementById("boatImage");
const boatEmoji = document.getElementById("boatEmoji");
const priceValue = document.getElementById("priceValue");
const statusMessage = document.getElementById("statusMessage");
const changeValue = document.getElementById("changeValue");
const updatedAt = document.getElementById("updatedAt");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

let previousPrice = null;
let requestInFlight = false;

function getBoatByChange(changePercent) {
  if (changePercent < -3) {
    return BOATS.shipwreck;
  }
  if (changePercent >= -3 && changePercent < -1) {
    return BOATS.submarine;
  }
  if (changePercent >= -1 && changePercent <= 1) {
    return BOATS.sailboat;
  }
  if (changePercent > 1 && changePercent <= 3) {
    return BOATS.speedboat;
  }
  return BOATS.yacht;
}

function formatSignedPercent(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function updateDirection(changePercent) {
  boatWrapper.classList.remove("direction-up", "direction-down", "direction-flat");

  if (changePercent > 0.05) {
    boatWrapper.classList.add("direction-up");
  } else if (changePercent < -0.05) {
    boatWrapper.classList.add("direction-down");
  } else {
    boatWrapper.classList.add("direction-flat");
  }
}

function updateStormMode(changePercent) {
  document.body.classList.toggle("storm-mode", Math.abs(changePercent) > 5);
}

function applyBoatVisual(boat) {
  tracker.dataset.boat = boat.id;
  boatEmoji.textContent = boat.emoji;
  boatImage.alt = boat.id;
  boatImage.dataset.fallback = "true";
  boatImage.src = `assets/${boat.asset}`;
  document.documentElement.style.setProperty("--boat-bob-duration", `${boat.bobSeconds}s`);
}

async function fetchBitcoinPrice() {
  const response = await fetch(API_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Price request failed with ${response.status}`);
  }

  const payload = await response.json();
  const price = payload?.bitcoin?.usd;

  if (typeof price !== "number") {
    throw new Error("Price payload missing bitcoin.usd");
  }

  return price;
}

function updateTimestamp(label = "Updated") {
  updatedAt.textContent = `${label}: ${new Date().toLocaleTimeString()}`;
}

function applySnapshot(currentPrice) {
  const changePercent =
    previousPrice === null ? 0 : ((currentPrice - previousPrice) / previousPrice) * 100;
  const boat = getBoatByChange(changePercent);

  applyBoatVisual(boat);
  updateDirection(changePercent);
  updateStormMode(changePercent);

  priceValue.textContent = currencyFormatter.format(currentPrice);
  changeValue.textContent = `Change: ${formatSignedPercent(changePercent)}`;
  statusMessage.textContent = boat.message;
  updateTimestamp();

  previousPrice = currentPrice;
}

async function refreshPrice() {
  if (requestInFlight) {
    return;
  }

  requestInFlight = true;

  try {
    const price = await fetchBitcoinPrice();
    applySnapshot(price);
  } catch (error) {
    statusMessage.textContent = "Price feed unavailable. Retrying...";
    changeValue.textContent = "Change: --";
    updateTimestamp("Last attempt");
    console.error(error);
  } finally {
    requestInFlight = false;
  }
}

boatImage.addEventListener("load", () => {
  const isTinyPlaceholder = boatImage.naturalWidth < 8 || boatImage.naturalHeight < 8;
  boatImage.dataset.fallback = isTinyPlaceholder ? "true" : "false";
});

boatImage.addEventListener("error", () => {
  boatImage.dataset.fallback = "true";
});

refreshPrice();
setInterval(refreshPrice, POLL_INTERVAL_MS);
