(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ─── PHASES ───
  // Storm: wild price swings, boat gets tossed
  // Zoom Out: camera pulls back, price chart emerges
  // Calm Hunt: find the stable zone
  // Zoom In: dive into calm water
  // Calm Float: peaceful bobbing, small waves
  const PHASES = [
    { name: "storm", label: "Riding the Volatility", duration: 35 },
    { name: "zoom_out", label: "Zooming Out...", duration: 12 },
    { name: "calm_hunt", label: "Finding Calm Water", duration: 8 },
    { name: "zoom_in", label: "Settling In", duration: 10 },
    { name: "calm", label: "Calm Float", duration: Infinity },
  ];

  const view = { width: 1280, height: 720, dpr: 1 };

  // ─── UTILITY ───
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function easeInOutCubic(t) {
    const x = clamp(t, 0, 1);
    return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
  }

  // ─── BTC PRICE → WAVE SURFACE ───
  let BTC_PRICES = [];      // [{date, price}]
  let SURFACE = [];          // wave displacement array
  let CALM_INDEX = 0;        // index of calm zone
  let PRICE_MIN = 0;
  let PRICE_MAX = 0;
  let PRICE_MEAN = 0;

  function pricesToSurface(prices) {
    // Normalize prices to wave displacements (-1..1) then scale
    const vals = prices.map(p => p.price);
    PRICE_MIN = Math.min(...vals);
    PRICE_MAX = Math.max(...vals);
    PRICE_MEAN = vals.reduce((a,b) => a+b, 0) / vals.length;

    // Convert to displacement: center around mean, scale to -260..260
    const range = PRICE_MAX - PRICE_MIN;
    const surface = vals.map(v => ((v - PRICE_MEAN) / (range * 0.5)) * 260);

    // Smooth slightly for visual quality
    return smoothSeries(surface, 2, 1);
  }

  function smoothSeries(input, radius, passes) {
    let src = input.slice();
    const out = new Array(src.length);
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < src.length; i++) {
        let wt = 0, ws = 0;
        for (let k = -radius; k <= radius; k++) {
          const idx = clamp(i + k, 0, src.length - 1);
          const w = radius + 1 - Math.abs(k);
          wt += w; ws += src[idx] * w;
        }
        out[i] = ws / wt;
      }
      src = out.slice();
    }
    return src;
  }

  function sampleSurface(index) {
    if (index <= 0) return SURFACE[0];
    const max = SURFACE.length - 1;
    if (index >= max) return SURFACE[max];
    const left = Math.floor(index);
    const t = index - left;
    return lerp(SURFACE[left], SURFACE[left + 1], t);
  }

  function priceAtIndex(index) {
    const i = clamp(Math.round(index), 0, BTC_PRICES.length - 1);
    return BTC_PRICES[i];
  }

  function findCalmZone() {
    // Find the zone with lowest volatility (std dev) in second half
    const n = SURFACE.length;
    const winSize = Math.min(200, Math.floor(n * 0.04));
    let bestIdx = Math.floor(n * 0.8);
    let bestScore = Infinity;

    for (let start = Math.floor(n * 0.5); start <= n - winSize - 1; start += 4) {
      let sum = 0, sumSq = 0;
      for (let j = start; j < start + winSize; j++) {
        sum += SURFACE[j]; sumSq += SURFACE[j] * SURFACE[j];
      }
      const mean = sum / winSize;
      const variance = sumSq / winSize - mean * mean;
      const std = Math.sqrt(Math.max(variance, 0));
      const posPenalty = Math.abs((start + winSize/2) - n * 0.82) * 0.002;
      const score = std + posPenalty;
      if (score < bestScore) { bestScore = score; bestIdx = Math.round(start + winSize/2); }
    }
    return bestIdx;
  }

  // ─── STATE ───
  function createState() {
    const startIndex = Math.floor(SURFACE.length * 0.15);
    const seaLevel = view.height * 0.54;
    const wave = sampleSurface(startIndex);
    return {
      mode: "playing",
      sequenceTime: 0, phaseIndex: 0, phaseTime: 0,
      timelineX: startIndex,
      cameraCenterX: startIndex,
      cameraZoom: 1, targetZoom: 1,
      seaLevel,
      turbulence: 1.2,
      boatY: seaLevel - wave * 0.6 - 14,
      boatVY: 0, boatRoll: 0,
      horizonDrift: 0,
      showChart: false,        // overlay chart on zoom-out
      chartOpacity: 0,
    };
  }
  let state = null;

  function getPhase() { return PHASES[Math.min(state.phaseIndex, PHASES.length - 1)]; }
  function waveZoomFactor() { return Math.pow(state.cameraZoom, 0.66); }

  // ─── PHASE UPDATE ───
  function updatePhase(dt) {
    state.sequenceTime += dt;
    state.phaseTime += dt;
    const current = getPhase();
    if (Number.isFinite(current.duration) && state.phaseTime >= current.duration) {
      state.phaseTime -= current.duration;
      state.phaseIndex = Math.min(state.phaseIndex + 1, PHASES.length - 1);
    }
    const phase = getPhase();
    let speed = 20, desiredZoom = 1.18, turbTarget = 0.82;

    if (phase.name === "storm") {
      speed = 80; desiredZoom = 1; turbTarget = 1.3;
    } else if (phase.name === "zoom_out") {
      speed = 55;
      const t = state.phaseTime / phase.duration;
      desiredZoom = lerp(1, 0.06, easeInOutCubic(t));
      turbTarget = 1.0;
      state.chartOpacity = clamp(state.chartOpacity + dt * 0.3, 0, 0.6);
      state.showChart = true;
    } else if (phase.name === "calm_hunt") {
      speed = 8; desiredZoom = 0.06; turbTarget = 0.9;
      state.chartOpacity = 0.6;
      const settle = 1 - Math.exp(-dt * 1.5);
      state.timelineX = lerp(state.timelineX, CALM_INDEX - 100, settle);
    } else if (phase.name === "zoom_in") {
      speed = 22;
      const t = state.phaseTime / phase.duration;
      desiredZoom = lerp(0.06, 1.18, easeInOutCubic(t));
      turbTarget = 0.75;
      state.chartOpacity = clamp(state.chartOpacity - dt * 0.2, 0, 0.6);
      if (state.timelineX < CALM_INDEX - 80) {
        state.timelineX += (CALM_INDEX - 80 - state.timelineX) * Math.min(1, dt * 1.4);
      }
    } else if (phase.name === "calm") {
      speed = 12; desiredZoom = 1.18; turbTarget = 0.65;
      state.chartOpacity = clamp(state.chartOpacity - dt * 0.15, 0, 0.6);
    }

    state.timelineX += speed * dt;
    state.targetZoom = desiredZoom;
    state.turbulence += (turbTarget - state.turbulence) * Math.min(1, dt * 0.9);
    state.cameraZoom += (state.targetZoom - state.cameraZoom) * Math.min(1, dt * 2.2);
    state.timelineX = clamp(state.timelineX, 1, SURFACE.length - 2);
    state.cameraCenterX = state.timelineX;
  }

  // ─── BOAT PHYSICS ───
  function updateBoat(dt) {
    const vz = waveZoomFactor();
    const wave = sampleSurface(state.timelineX) * state.turbulence;
    const surfY = state.seaLevel - wave * vz;
    const desiredY = lerp(state.seaLevel - 20, surfY - 12, 0.66);
    const spring = (desiredY - state.boatY) * 9.5;
    const damp = -state.boatVY * 5.7;
    state.boatVY += (spring + damp) * dt;
    state.boatY += state.boatVY * dt;

    const slope = sampleSurface(state.timelineX + 8) - sampleSurface(state.timelineX - 8);
    const targetRoll = clamp(-slope * 0.003 * vz, -0.44, 0.44);
    state.boatRoll += (targetRoll - state.boatRoll) * Math.min(1, dt * 4.2);
    state.horizonDrift += dt * (10 + state.cameraZoom * 6);
  }

  function step(dt) {
    if (state.mode !== "playing") return;
    updatePhase(dt); updateBoat(dt);
  }

  // ─── WORLD COORDS ───
  function worldXFromScreen(sx) { return state.cameraCenterX + (sx - view.width * 0.5) / state.cameraZoom; }
  function surfaceYForWorldX(wx) { return state.seaLevel - sampleSurface(wx) * state.turbulence * waveZoomFactor(); }

  // ─── DRAWING ───
  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, view.height);
    sky.addColorStop(0, "#0a1e2e");
    sky.addColorStop(0.35, "#0d2a42");
    sky.addColorStop(0.65, "#1a4a6e");
    sky.addColorStop(1, "#2a6a8e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.width, view.height);

    // Stars (dim when zoomed out)
    const starAlpha = clamp(state.cameraZoom * 0.8, 0, 1);
    if (starAlpha > 0.05) {
      ctx.fillStyle = `rgba(200, 230, 255, ${(starAlpha * 0.6).toFixed(3)})`;
      const seed = 12345;
      for (let i = 0; i < 80; i++) {
        const x = ((seed * (i + 1) * 7919) % view.width);
        const y = ((seed * (i + 1) * 6271) % (view.height * 0.45));
        const r = 0.5 + ((i * 13) % 3) * 0.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      }
    }

    // Moon
    const moonX = view.width * 0.18, moonY = view.height * 0.14;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 80);
    moonGlow.addColorStop(0, "rgba(220, 240, 255, 0.7)");
    moonGlow.addColorStop(0.5, "rgba(150, 200, 240, 0.15)");
    moonGlow.addColorStop(1, "rgba(150, 200, 240, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath(); ctx.arc(moonX, moonY, 80, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(220, 235, 255, 0.9)";
    ctx.beginPath(); ctx.arc(moonX, moonY, 14, 0, Math.PI*2); ctx.fill();
  }

  function drawOcean() {
    // Main water surface
    ctx.beginPath();
    for (let x = 0; x <= view.width + 2; x += 2) {
      const y = surfaceYForWorldX(worldXFromScreen(x));
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(view.width, view.height);
    ctx.lineTo(0, view.height);
    ctx.closePath();
    const water = ctx.createLinearGradient(0, state.seaLevel - 80, 0, view.height);
    water.addColorStop(0, "rgba(10, 80, 130, 0.92)");
    water.addColorStop(0.4, "rgba(6, 50, 100, 0.96)");
    water.addColorStop(1, "rgba(3, 22, 50, 0.99)");
    ctx.fillStyle = water; ctx.fill();

    // Foam line
    ctx.beginPath();
    for (let x = 0; x <= view.width + 2; x += 2) {
      const base = surfaceYForWorldX(worldXFromScreen(x));
      const foam = Math.sin((x + state.sequenceTime * 100) * 0.025) * 2;
      x === 0 ? ctx.moveTo(x, base + foam) : ctx.lineTo(x, base + foam);
    }
    ctx.strokeStyle = "rgba(180, 230, 255, 0.7)"; ctx.lineWidth = 2; ctx.stroke();

    // Depth shimmer
    ctx.beginPath();
    for (let x = 0; x <= view.width + 4; x += 4) {
      const wx = worldXFromScreen(x);
      const y = state.seaLevel - sampleSurface(wx) * waveZoomFactor() * 0.4 + 40;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(60, 180, 220, 0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawBoat() {
    const cx = view.width * 0.5, cy = state.boatY;
    const sc = clamp(0.56 + state.cameraZoom * 0.44, 0.56, 1.12);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.boatRoll);
    ctx.scale(sc, sc);

    // Hull
    ctx.beginPath();
    ctx.moveTo(-70, 2); ctx.quadraticCurveTo(0, 34, 74, 2);
    ctx.lineTo(52, 22); ctx.quadraticCurveTo(0, 40, -50, 22);
    ctx.closePath();
    ctx.fillStyle = "#6b3a15"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-70, 2); ctx.quadraticCurveTo(0, 34, 74, 2);
    ctx.strokeStyle = "rgba(30,15,5,0.5)"; ctx.lineWidth = 2; ctx.stroke();

    // Mast
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -96);
    ctx.strokeStyle = "#d4c4a8"; ctx.lineWidth = 3.5; ctx.stroke();

    // Main sail
    ctx.beginPath(); ctx.moveTo(1, -88); ctx.lineTo(1, -18); ctx.lineTo(58, -24); ctx.closePath();
    ctx.fillStyle = "#e8f0f8"; ctx.fill();

    // Jib
    ctx.beginPath(); ctx.moveTo(-1, -72); ctx.lineTo(-1, -16); ctx.lineTo(-44, -20); ctx.closePath();
    ctx.fillStyle = "#f7d89c"; ctx.fill();

    // ₿ on sail
    ctx.fillStyle = "rgba(240, 180, 40, 0.6)";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("₿", 12, -38);

    // Cabin
    ctx.fillStyle = "#0c2238"; ctx.fillRect(-14, -12, 20, 9);
    ctx.fillStyle = "#ffd44f"; ctx.fillRect(-8, -10, 4, 4); // window glow

    ctx.restore();
  }

  // ─── PRICE CHART OVERLAY (during zoom-out) ───
  function drawChartOverlay() {
    if (state.chartOpacity < 0.02) return;
    const alpha = state.chartOpacity;

    // Draw full price chart as a line
    ctx.save();
    ctx.globalAlpha = alpha;

    const n = SURFACE.length;
    const margin = 40;
    const chartW = view.width - margin * 2;
    const chartH = view.height * 0.6;
    const chartY = view.height * 0.18;

    // Price line
    ctx.beginPath();
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / chartW))) {
      const x = margin + (i / n) * chartW;
      const p = BTC_PRICES[clamp(i, 0, BTC_PRICES.length-1)].price;
      const y = chartY + chartH - ((p - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(240, 180, 40, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current position marker
    const curX = margin + (state.timelineX / n) * chartW;
    const curP = priceAtIndex(state.timelineX);
    const curY = chartY + chartH - ((curP.price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * chartH;
    ctx.fillStyle = "#ff4444";
    ctx.beginPath(); ctx.arc(curX, curY, 5, 0, Math.PI*2); ctx.fill();

    // Price labels
    ctx.fillStyle = "rgba(220, 240, 255, 0.8)";
    ctx.font = "600 13px 'Avenir Next', sans-serif";
    ctx.fillText(`$${PRICE_MAX.toLocaleString()}`, margin, chartY - 4);
    ctx.fillText(`$${PRICE_MIN.toLocaleString()}`, margin, chartY + chartH + 16);

    // Year labels along bottom
    let lastYear = "";
    for (let i = 0; i < BTC_PRICES.length; i += Math.floor(BTC_PRICES.length / 12)) {
      const yr = BTC_PRICES[i].date.substring(0, 4);
      if (yr !== lastYear) {
        const x = margin + (i / n) * chartW;
        ctx.fillText(yr, x, chartY + chartH + 30);
        lastYear = yr;
      }
    }

    ctx.restore();
  }

  // ─── HUD ───
  function formatUsd(v) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }

  function drawHud() {
    const phase = getPhase();
    const priceData = priceAtIndex(state.timelineX);

    // Top-left panel
    ctx.fillStyle = "rgba(4, 15, 28, 0.65)";
    const panelH = 110;
    ctx.beginPath();
    ctx.roundRect(20, 20, 360, panelH, 8);
    ctx.fill();

    ctx.fillStyle = "#7cc8e8";
    ctx.font = "700 22px 'Avenir Next', 'Gill Sans', sans-serif";
    ctx.fillText("Bitcoin Ships 3", 36, 50);

    ctx.font = "600 14px 'Avenir Next', sans-serif";
    ctx.fillStyle = "#a0d8f0";
    ctx.fillText(`Phase: ${phase.label}`, 36, 74);

    ctx.fillStyle = "#ffd44f";
    ctx.font = "700 16px 'JetBrains Mono', monospace, sans-serif";
    ctx.fillText(`BTC: ${formatUsd(priceData.price)}`, 36, 98);

    ctx.fillStyle = "#6a9ab8";
    ctx.font = "600 12px 'Avenir Next', sans-serif";
    ctx.fillText(`${priceData.date}`, 36, 118);

    // Bottom controls
    ctx.fillStyle = "rgba(4, 15, 28, 0.5)";
    ctx.beginPath();
    ctx.roundRect(20, view.height - 48, 520, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#6a9ab8";
    ctx.font = "600 12px 'Avenir Next', sans-serif";
    ctx.fillText("Space: pause  ←→: scrub  ↑↓: waves  A: skip phase  R: reset  F: fullscreen", 30, view.height - 30);

    if (state.mode === "paused") {
      ctx.fillStyle = "rgba(4, 15, 28, 0.7)";
      ctx.beginPath(); ctx.roundRect(view.width/2-140, view.height/2-40, 280, 80, 10); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 26px 'Avenir Next', sans-serif";
      ctx.fillText("PAUSED", view.width/2-52, view.height/2-4);
      ctx.font = "600 14px 'Avenir Next', sans-serif";
      ctx.fillText("Press Space to continue", view.width/2-88, view.height/2+22);
    }
  }

  // ─── RENDER ───
  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    drawSky();
    drawOcean();
    drawBoat();
    drawChartOverlay();
    drawHud();
  }

  // ─── RESIZE ───
  function resize() {
    view.width = Math.max(680, Math.floor(window.innerWidth));
    view.height = Math.max(400, Math.floor(window.innerHeight));
    view.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(view.width * view.dpr);
    canvas.height = Math.floor(view.height * view.dpr);
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
    if (state) {
      state.seaLevel = view.height * 0.54;
      state.boatY = clamp(state.boatY, 0, view.height + 120);
    }
  }

  // ─── CONTROLS ───
  async function toggleFS() {
    if (!document.fullscreenElement) { if (canvas.requestFullscreen) await canvas.requestFullscreen(); }
    else if (document.exitFullscreen) await document.exitFullscreen();
  }

  window.addEventListener("keydown", (e) => {
    if (["Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)) e.preventDefault();
    if (!state) return;
    if (e.code === "Space") { state.mode = state.mode === "playing" ? "paused" : "playing"; return; }
    if (e.code === "ArrowLeft") { state.timelineX = clamp(state.timelineX - 80, 1, SURFACE.length-2); return; }
    if (e.code === "ArrowRight") { state.timelineX = clamp(state.timelineX + 80, 1, SURFACE.length-2); return; }
    if (e.code === "ArrowUp") { state.turbulence = clamp(state.turbulence + 0.08, 0.4, 1.8); return; }
    if (e.code === "ArrowDown") { state.turbulence = clamp(state.turbulence - 0.08, 0.4, 1.8); return; }
    if (e.code === "KeyA") { state.phaseIndex = Math.min(state.phaseIndex + 1, PHASES.length-1); state.phaseTime = 0; return; }
    if (e.code === "KeyR" || e.code === "KeyB") { state = createState(); return; }
    if (e.code === "KeyF") { toggleFS().catch(()=>{}); }
  }, { passive: false });

  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);

  // ─── LOAD + START ───
  async function loadPrices() {
    try {
      const resp = await fetch("/tbg-mirrors/btc-prices.json");
      const data = await resp.json();
      // data is {date: price, ...}
      const entries = Object.entries(data)
        .map(([date, price]) => ({ date, price }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return entries;
    } catch (err) {
      console.error("Failed to load BTC prices:", err);
      // Generate synthetic fallback
      const entries = [];
      let price = 1000;
      for (let i = 0; i < 4000; i++) {
        price += (Math.random() - 0.48) * price * 0.03;
        price = Math.max(100, price);
        const d = new Date(2013, 0, 1); d.setDate(d.getDate() + i);
        entries.push({ date: d.toISOString().slice(0,10), price: Math.round(price) });
      }
      return entries;
    }
  }

  async function init() {
    resize();
    BTC_PRICES = await loadPrices();
    SURFACE = pricesToSurface(BTC_PRICES);
    CALM_INDEX = findCalmZone();
    state = createState();

    document.getElementById("loading").style.display = "none";

    let prev = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      step(dt);
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  init();
})();
