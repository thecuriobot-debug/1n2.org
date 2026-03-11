(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const PHASES = [
    { name: "storm", label: "Riding the Volatility", duration: 38 },
    { name: "zoom_out", label: "The Great Wave", duration: 14 },
    { name: "calm_hunt", label: "Finding Calm Water", duration: 9 },
    { name: "zoom_in", label: "Settling In", duration: 11 },
    { name: "calm", label: "Calm Float", duration: Infinity },
  ];

  const view = { width: 1280, height: 720, dpr: 1 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function easeInOutCubic(t) { const x = clamp(t, 0, 1); return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3)/2; }

  let BTC_PRICES = [], SURFACE = [], CALM_INDEX = 0;
  let PRICE_MIN = 0, PRICE_MAX = 0, PRICE_MEAN = 0;

  // ─── PRICE → WAVE SURFACE ───
  function pricesToSurface(prices) {
    const vals = prices.map(p => p.price);
    PRICE_MIN = Math.min(...vals); PRICE_MAX = Math.max(...vals);
    PRICE_MEAN = vals.reduce((a,b) => a+b, 0) / vals.length;
    const range = PRICE_MAX - PRICE_MIN;
    return smoothSeries(vals.map(v => ((v - PRICE_MEAN) / (range * 0.5)) * 280), 2, 1);
  }
  function smoothSeries(input, radius, passes) {
    let src = input.slice(); const out = new Array(src.length);
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < src.length; i++) {
        let wt = 0, ws = 0;
        for (let k = -radius; k <= radius; k++) {
          const idx = clamp(i+k, 0, src.length-1), w = radius+1-Math.abs(k);
          wt += w; ws += src[idx] * w;
        } out[i] = ws / wt;
      } src = out.slice();
    } return src;
  }
  function sampleSurface(index) {
    if (index <= 0) return SURFACE[0];
    const max = SURFACE.length - 1;
    if (index >= max) return SURFACE[max];
    const left = Math.floor(index), t = index - left;
    return lerp(SURFACE[left], SURFACE[left+1], t);
  }
  function priceAtIndex(index) { return BTC_PRICES[clamp(Math.round(index), 0, BTC_PRICES.length-1)]; }
  function findCalmZone() {
    const n = SURFACE.length, win = Math.min(200, Math.floor(n*0.04));
    let best = Math.floor(n*0.8), bestS = Infinity;
    for (let s = Math.floor(n*0.5); s <= n-win-1; s += 4) {
      let sum=0, sq=0;
      for (let j=s; j<s+win; j++) { sum+=SURFACE[j]; sq+=SURFACE[j]*SURFACE[j]; }
      const m=sum/win, v=sq/win-m*m, std=Math.sqrt(Math.max(v,0));
      const score = std + Math.abs((s+win/2)-n*0.82)*0.002;
      if (score < bestS) { bestS = score; best = Math.round(s+win/2); }
    } return best;
  }

  // ─── SHIP EVOLUTION (based on market cap / price) ───
  // Returns ship tier 0-4: raft → rowboat → sailboat → clipper → galleon
  function shipTier(price) {
    if (price < 500) return 0;      // raft
    if (price < 5000) return 1;     // rowboat
    if (price < 20000) return 2;    // sailboat
    if (price < 60000) return 3;    // clipper
    return 4;                        // galleon
  }
  function shipName(tier) { return ['Raft','Rowboat','Sailboat','Clipper','Galleon'][tier]; }

  // ─── STATE ───
  function createState() {
    const start = Math.floor(SURFACE.length * 0.12);
    const seaLevel = view.height * 0.54;
    return {
      mode: "playing", sequenceTime: 0, phaseIndex: 0, phaseTime: 0,
      timelineX: start, cameraCenterX: start,
      cameraZoom: 1, targetZoom: 1, seaLevel,
      turbulence: 1.2,
      boatY: seaLevel, boatVY: 0, boatRoll: 0, boatTargetRoll: 0,
      horizonDrift: 0, showChart: false, chartOpacity: 0,
      waveTime: 0,  // for animated wave layers
      splashParticles: [],
    };
  }
  let state = null;
  function getPhase() { return PHASES[Math.min(state.phaseIndex, PHASES.length-1)]; }
  function waveZoomFactor() { return Math.pow(state.cameraZoom, 0.66); }

  // ─── PHASE UPDATE ───
  function updatePhase(dt) {
    state.sequenceTime += dt; state.phaseTime += dt; state.waveTime += dt;
    const cur = getPhase();
    if (Number.isFinite(cur.duration) && state.phaseTime >= cur.duration) {
      state.phaseTime -= cur.duration;
      state.phaseIndex = Math.min(state.phaseIndex+1, PHASES.length-1);
    }
    const ph = getPhase();
    let speed = 20, dZoom = 1.18, turbT = 0.82;
    if (ph.name === "storm") {
      speed = 72; dZoom = 1; turbT = 1.35;
    } else if (ph.name === "zoom_out") {
      speed = 50; const t = state.phaseTime / ph.duration;
      dZoom = lerp(1, 0.055, easeInOutCubic(t)); turbT = 1.0;
      state.chartOpacity = clamp(state.chartOpacity + dt*0.25, 0, 0.55);
      state.showChart = true;
    } else if (ph.name === "calm_hunt") {
      speed = 6; dZoom = 0.055; turbT = 0.85;
      state.chartOpacity = 0.55;
      const s = 1 - Math.exp(-dt*1.4);
      state.timelineX = lerp(state.timelineX, CALM_INDEX-80, s);
    } else if (ph.name === "zoom_in") {
      speed = 18; const t = state.phaseTime / ph.duration;
      dZoom = lerp(0.055, 1.18, easeInOutCubic(t)); turbT = 0.7;
      state.chartOpacity = clamp(state.chartOpacity - dt*0.18, 0, 0.55);
      if (state.timelineX < CALM_INDEX-60)
        state.timelineX += (CALM_INDEX-60-state.timelineX) * Math.min(1, dt*1.3);
    } else if (ph.name === "calm") {
      speed = 10; dZoom = 1.18; turbT = 0.55;
      state.chartOpacity = clamp(state.chartOpacity - dt*0.12, 0, 0.55);
    }
    state.timelineX += speed * dt;
    state.targetZoom = dZoom;
    state.turbulence += (turbT - state.turbulence) * Math.min(1, dt*0.9);
    state.cameraZoom += (state.targetZoom - state.cameraZoom) * Math.min(1, dt*2.2);
    state.timelineX = clamp(state.timelineX, 1, SURFACE.length-2);
    state.cameraCenterX = state.timelineX;
  }

  // ─── BOAT PHYSICS — follows waves, tips with slope ───
  function updateBoat(dt) {
    const vz = waveZoomFactor();
    const waveVal = sampleSurface(state.timelineX) * state.turbulence;
    const surfY = state.seaLevel - waveVal * vz;

    // Boat sits ON the surface with spring-damper
    const desiredY = surfY - 10 * clamp(state.cameraZoom, 0.3, 1.2);
    const spring = (desiredY - state.boatY) * 14;   // stiffer spring = follows waves tighter
    const damp = -state.boatVY * 4.8;
    state.boatVY += (spring + damp) * dt;
    state.boatY += state.boatVY * dt;

    // Roll follows the wave SLOPE — tips up on rises, down on falls
    const slopeSample = 6;
    const slopeAhead = sampleSurface(state.timelineX + slopeSample);
    const slopeBehind = sampleSurface(state.timelineX - slopeSample);
    const slope = (slopeAhead - slopeBehind) / (slopeSample * 2);
    state.boatTargetRoll = clamp(-slope * 0.12 * vz, -0.52, 0.52);
    state.boatRoll += (state.boatTargetRoll - state.boatRoll) * Math.min(1, dt * 6);

    state.horizonDrift += dt * (8 + state.cameraZoom * 5);

    // Splash particles on big wave hits
    if (Math.abs(state.boatVY) > 80 && Math.random() < 0.3) {
      for (let i = 0; i < 4; i++) {
        state.splashParticles.push({
          x: view.width*0.5 + (Math.random()-0.5)*60,
          y: state.boatY + 10,
          vx: (Math.random()-0.5)*120,
          vy: -Math.random()*160 - 40,
          life: 1.0,
        });
      }
    }
    // Update particles
    state.splashParticles = state.splashParticles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt * 1.8;
      return p.life > 0;
    });
  }

  function step(dt) {
    if (state.mode !== "playing") return;
    updatePhase(dt); updateBoat(dt);
  }

  function worldXFromScreen(sx) { return state.cameraCenterX + (sx - view.width*0.5) / state.cameraZoom; }
  function surfaceYForWorldX(wx) { return state.seaLevel - sampleSurface(wx) * state.turbulence * waveZoomFactor(); }

  // ─── DRAWING: SKY ───
  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, view.height);
    sky.addColorStop(0, "#0a1828"); sky.addColorStop(0.3, "#0f2640");
    sky.addColorStop(0.6, "#1a4a6e"); sky.addColorStop(1, "#2a6a8e");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, view.width, view.height);
    // Stars
    const sa = clamp(state.cameraZoom * 0.7, 0, 1);
    if (sa > 0.05) {
      ctx.fillStyle = `rgba(200,230,255,${(sa*0.5).toFixed(3)})`;
      for (let i = 0; i < 90; i++) {
        const x = ((12345*(i+1)*7919) % view.width);
        const y = ((12345*(i+1)*6271) % (view.height*0.4));
        ctx.beginPath(); ctx.arc(x, y, 0.4+((i*17)%3)*0.5, 0, Math.PI*2); ctx.fill();
      }
    }
    // Moon
    const mx = view.width*0.15, my = view.height*0.12;
    const mg = ctx.createRadialGradient(mx, my, 6, mx, my, 70);
    mg.addColorStop(0, "rgba(220,240,255,0.65)"); mg.addColorStop(0.5, "rgba(150,200,240,0.1)"); mg.addColorStop(1, "rgba(150,200,240,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 70, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(225,240,255,0.85)"; ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI*2); ctx.fill();
  }

  // ─── DRAWING: JAPANESE WOODCUT-STYLE OCEAN ───
  function drawOcean() {
    const wt = state.waveTime;
    const vz = waveZoomFactor();

    // LAYER 1: Deep background swell (furthest)
    for (let layer = 0; layer < 3; layer++) {
      const depth = layer * 0.18;
      const alpha = 0.12 + layer * 0.06;
      const speed = (layer + 1) * 0.08;
      ctx.beginPath();
      for (let x = 0; x <= view.width + 4; x += 3) {
        const wx = worldXFromScreen(x + state.horizonDrift * speed * (layer+1));
        const baseY = state.seaLevel - sampleSurface(wx) * vz * (0.15 + layer * 0.1) + layer * 35 - 50;
        const ripple = Math.sin((x * 0.008 + wt * (0.6 + layer * 0.3)) * (2 + layer)) * (4 + layer * 2);
        const y = baseY + ripple;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(80, 180, 220, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1; ctx.stroke();
    }

    // LAYER 2: Main wave surface — the "Great Wave"
    ctx.beginPath();
    for (let x = 0; x <= view.width + 2; x += 2) {
      const wx = worldXFromScreen(x);
      const baseY = surfaceYForWorldX(wx);
      // Add sloshing — waves that move back and forth over the surface
      const slosh = Math.sin(x * 0.012 + wt * 2.5) * (3 + state.turbulence * 4)
                  + Math.sin(x * 0.025 + wt * 4.1) * (1.5 + state.turbulence * 2);
      const y = baseY + slosh;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(view.width, view.height); ctx.lineTo(0, view.height); ctx.closePath();

    const water = ctx.createLinearGradient(0, state.seaLevel - 100, 0, view.height);
    water.addColorStop(0, "rgba(15, 70, 120, 0.94)");
    water.addColorStop(0.3, "rgba(8, 48, 95, 0.96)");
    water.addColorStop(0.7, "rgba(4, 28, 62, 0.98)");
    water.addColorStop(1, "rgba(2, 14, 35, 0.99)");
    ctx.fillStyle = water; ctx.fill();

    // FOAM CREST LINE — Hokusai-style curling white caps
    ctx.beginPath();
    for (let x = 0; x <= view.width + 2; x += 2) {
      const wx = worldXFromScreen(x);
      const baseY = surfaceYForWorldX(wx);
      const slosh = Math.sin(x*0.012 + wt*2.5) * (3 + state.turbulence*4)
                  + Math.sin(x*0.025 + wt*4.1) * (1.5 + state.turbulence*2);
      const curl = Math.max(0, Math.sin(x*0.018 + wt*3.2)) * state.turbulence * 3;
      x === 0 ? ctx.moveTo(x, baseY + slosh - curl) : ctx.lineTo(x, baseY + slosh - curl);
    }
    ctx.strokeStyle = "rgba(220, 245, 255, 0.82)"; ctx.lineWidth = 2.5; ctx.stroke();

    // SECONDARY FOAM — thinner, offset
    ctx.beginPath();
    for (let x = 0; x <= view.width + 3; x += 3) {
      const wx = worldXFromScreen(x);
      const baseY = surfaceYForWorldX(wx);
      const slosh2 = Math.sin(x*0.015 + wt*1.8 + 1.5) * (2 + state.turbulence*3);
      x === 0 ? ctx.moveTo(x, baseY + slosh2 + 8) : ctx.lineTo(x, baseY + slosh2 + 8);
    }
    ctx.strokeStyle = "rgba(140, 210, 240, 0.4)"; ctx.lineWidth = 1.5; ctx.stroke();

    // WAVE CURLS — small decorative curl marks (Hokusai-style)
    const curlCount = Math.floor(6 + state.turbulence * 8);
    for (let i = 0; i < curlCount; i++) {
      const sx = ((i * 137 + Math.floor(wt * 40)) % (view.width + 100)) - 50;
      const wx = worldXFromScreen(sx);
      const sy = surfaceYForWorldX(wx) + Math.sin(sx*0.01+wt*2)*3;
      const slope = sampleSurface(wx+3) - sampleSurface(wx-3);
      if (slope > 1.5 * state.turbulence) { // only on rising edges
        ctx.save();
        ctx.translate(sx, sy - 2);
        ctx.rotate(-0.3);
        ctx.beginPath();
        ctx.arc(0, 0, 5 + state.turbulence * 3, Math.PI * 0.8, Math.PI * 2.2);
        ctx.strokeStyle = `rgba(255,255,255,${(0.3 + state.turbulence*0.15).toFixed(2)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // DEPTH LINES — horizontal shimmer below surface
    for (let d = 0; d < 4; d++) {
      ctx.beginPath();
      const depthY = 20 + d * 18;
      for (let x = 0; x <= view.width + 4; x += 4) {
        const wx = worldXFromScreen(x);
        const baseY = surfaceYForWorldX(wx) + depthY;
        const shimmer = Math.sin(x*0.006 + wt*(0.8+d*0.2) + d*2) * (3 - d*0.5);
        x === 0 ? ctx.moveTo(x, baseY + shimmer) : ctx.lineTo(x, baseY + shimmer);
      }
      ctx.strokeStyle = `rgba(40, 140, 190, ${(0.18 - d*0.03).toFixed(3)})`;
      ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // ─── DRAWING: EVOLVING SHIP ───
  function drawBoat() {
    const cx = view.width * 0.5, cy = state.boatY;
    const price = priceAtIndex(state.timelineX).price;
    const tier = shipTier(price);
    const sc = clamp(0.5 + state.cameraZoom * 0.5, 0.5, 1.15);
    // Ship grows with tier
    const tierScale = 0.7 + tier * 0.15;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.boatRoll);
    ctx.scale(sc * tierScale, sc * tierScale);

    if (tier === 0) drawRaft();
    else if (tier === 1) drawRowboat();
    else if (tier === 2) drawSailboat();
    else if (tier === 3) drawClipper();
    else drawGalleon();

    ctx.restore();

    // Splash particles
    ctx.fillStyle = "rgba(200, 240, 255, 0.7)";
    for (const p of state.splashParticles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 + p.life*2, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRaft() {
    // Simple logs
    ctx.fillStyle = "#8B6914";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i*14, 8, 30, 5, 0, 0, Math.PI*2);
      ctx.fill();
    }
    // Stick mast
    ctx.strokeStyle = "#a08040"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -40); ctx.stroke();
    // Ragged cloth
    ctx.fillStyle = "rgba(180,160,120,0.7)";
    ctx.beginPath(); ctx.moveTo(2,-36); ctx.lineTo(2,-12); ctx.lineTo(22,-18); ctx.closePath(); ctx.fill();
    // Tiny ₿
    ctx.fillStyle = "rgba(200,160,40,0.5)"; ctx.font = "bold 12px sans-serif"; ctx.fillText("₿", 5, -20);
  }

  function drawRowboat() {
    // Simple wooden boat
    ctx.beginPath(); ctx.moveTo(-40, 4); ctx.quadraticCurveTo(0, 24, 44, 4);
    ctx.lineTo(30, 16); ctx.quadraticCurveTo(0, 28, -28, 16); ctx.closePath();
    ctx.fillStyle = "#7a4a18"; ctx.fill();
    ctx.strokeStyle = "rgba(40,20,5,0.4)"; ctx.lineWidth = 1.5; ctx.stroke();
    // Mast
    ctx.strokeStyle = "#c0a878"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -55); ctx.stroke();
    // Small sail
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath(); ctx.moveTo(1,-50); ctx.lineTo(1,-10); ctx.lineTo(32,-16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(220,170,40,0.5)"; ctx.font = "bold 16px sans-serif"; ctx.fillText("₿", 7, -24);
  }

  function drawSailboat() {
    // Classic sailboat — connected mast
    ctx.beginPath(); ctx.moveTo(-60, 2); ctx.quadraticCurveTo(0, 30, 64, 2);
    ctx.lineTo(44, 20); ctx.quadraticCurveTo(0, 36, -42, 20); ctx.closePath();
    ctx.fillStyle = "#6b3a15"; ctx.fill();
    ctx.strokeStyle = "rgba(30,15,5,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    // Deck line
    ctx.strokeStyle = "#8a5a2a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-42, 10); ctx.lineTo(44, 10); ctx.stroke();
    // Mast — planted in hull
    ctx.strokeStyle = "#d4c4a8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -80); ctx.stroke();
    // Main sail
    ctx.fillStyle = "#f0f4f8";
    ctx.beginPath(); ctx.moveTo(1,-74); ctx.lineTo(1,-8); ctx.lineTo(50,-16); ctx.closePath(); ctx.fill();
    // Jib
    ctx.fillStyle = "#f7d89c";
    ctx.beginPath(); ctx.moveTo(-1,-60); ctx.lineTo(-1,-6); ctx.lineTo(-38,-12); ctx.closePath(); ctx.fill();
    // ₿ on sail
    ctx.fillStyle = "rgba(240,180,40,0.6)"; ctx.font = "bold 24px sans-serif"; ctx.fillText("₿", 10, -30);
    // Cabin
    ctx.fillStyle = "#0c2238"; ctx.fillRect(-12, -4, 18, 10);
    ctx.fillStyle = "#ffd44f"; ctx.fillRect(-7, -2, 3, 3);
  }

  function drawClipper() {
    // Elegant clipper ship
    ctx.beginPath(); ctx.moveTo(-75, 0); ctx.quadraticCurveTo(-20, 32, 80, -2);
    ctx.lineTo(60, 20); ctx.quadraticCurveTo(0, 38, -55, 18); ctx.closePath();
    ctx.fillStyle = "#5a3010"; ctx.fill();
    ctx.strokeStyle = "rgba(25,12,4,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    // Bowsprit
    ctx.strokeStyle = "#c0a060"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(80, 0); ctx.lineTo(100, -12); ctx.stroke();
    // Two masts
    ctx.strokeStyle = "#d4c4a8"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-15, 14); ctx.lineTo(-15, -90); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(30, -82); ctx.stroke();
    // Sails — fore
    ctx.fillStyle = "#f0f4f8";
    ctx.beginPath(); ctx.moveTo(-14,-84); ctx.lineTo(-14,-10); ctx.lineTo(28,-14); ctx.closePath(); ctx.fill();
    // Sails — main
    ctx.fillStyle = "#e8ecf0";
    ctx.beginPath(); ctx.moveTo(31,-76); ctx.lineTo(31,-6); ctx.lineTo(68,-12); ctx.closePath(); ctx.fill();
    // Jib
    ctx.fillStyle = "#fae0a0";
    ctx.beginPath(); ctx.moveTo(-16,-70); ctx.lineTo(-16,-4); ctx.lineTo(-50,-10); ctx.closePath(); ctx.fill();
    // ₿
    ctx.fillStyle = "rgba(240,180,40,0.65)"; ctx.font = "bold 28px sans-serif"; ctx.fillText("₿", -6, -34);
    // Cabin structure
    ctx.fillStyle = "#0c2238";
    ctx.beginPath(); ctx.roundRect(-30, -2, 28, 12, 2); ctx.fill();
    ctx.fillStyle = "#ffd44f";
    ctx.fillRect(-25, 1, 3, 3); ctx.fillRect(-18, 1, 3, 3); ctx.fillRect(-11, 1, 3, 3);
    // Flag
    ctx.fillStyle = "#f7931a"; ctx.fillRect(-15, -92, 14, 8);
  }

  function drawGalleon() {
    // Grand galleon — the ultimate Bitcoin ship
    ctx.beginPath(); ctx.moveTo(-90, -4); ctx.quadraticCurveTo(-30, 35, 95, -6);
    ctx.lineTo(72, 22); ctx.quadraticCurveTo(0, 42, -68, 20); ctx.closePath();
    ctx.fillStyle = "#4a2808"; ctx.fill();
    ctx.strokeStyle = "rgba(20,10,2,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    // Stern castle
    ctx.fillStyle = "#5a3210";
    ctx.beginPath(); ctx.roundRect(-80, -18, 30, 22, 3); ctx.fill();
    ctx.fillStyle = "#ffd44f";
    ctx.fillRect(-75, -14, 3, 3); ctx.fillRect(-68, -14, 3, 3); ctx.fillRect(-75, -8, 3, 3); ctx.fillRect(-68, -8, 3, 3);
    // Bowsprit
    ctx.strokeStyle = "#c0a060"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(95, -6); ctx.lineTo(118, -20); ctx.stroke();
    // Three masts
    ctx.strokeStyle = "#d4c4a8"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(-30, -100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 12); ctx.lineTo(15, -105); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(55, 14); ctx.lineTo(55, -90); ctx.stroke();
    // Cross spars
    ctx.lineWidth = 2;
    for (const mx of [-30, 15, 55]) {
      const h = mx === 15 ? -105 : -90;
      ctx.beginPath(); ctx.moveTo(mx-22, h+20); ctx.lineTo(mx+22, h+20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx-18, h+45); ctx.lineTo(mx+18, h+45); ctx.stroke();
    }
    // Square sails
    ctx.fillStyle = "#f0f2f5";
    for (const mx of [-30, 15, 55]) {
      const h = mx === 15 ? -105 : -90;
      ctx.fillRect(mx-20, h+21, 40, 22);
      ctx.fillRect(mx-16, h+46, 32, 18);
    }
    // Golden ₿ on main sail
    ctx.fillStyle = "rgba(247,147,26,0.75)"; ctx.font = "bold 32px sans-serif"; ctx.fillText("₿", 2, -58);
    // Flag
    ctx.fillStyle = "#f7931a"; ctx.fillRect(15, -107, 18, 10);
    // Deck cannons (tiny)
    ctx.fillStyle = "#333";
    for (let i = 0; i < 5; i++) ctx.fillRect(-50 + i*22, 8, 6, 4);
  }

  // ─── CHART OVERLAY ───
  function drawChartOverlay() {
    if (state.chartOpacity < 0.02) return;
    ctx.save(); ctx.globalAlpha = state.chartOpacity;
    const n = SURFACE.length, m = 40, cW = view.width-m*2, cH = view.height*0.58, cY = view.height*0.19;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(n / cW));
    for (let i = 0; i < n; i += step) {
      const x = m + (i/n)*cW;
      const p = BTC_PRICES[clamp(i,0,BTC_PRICES.length-1)].price;
      const y = cY + cH - ((p-PRICE_MIN)/(PRICE_MAX-PRICE_MIN))*cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(247,147,26,0.75)"; ctx.lineWidth = 1.5; ctx.stroke();
    // Position dot
    const curX = m + (state.timelineX/n)*cW;
    const cp = priceAtIndex(state.timelineX);
    const curY = cY + cH - ((cp.price-PRICE_MIN)/(PRICE_MAX-PRICE_MIN))*cH;
    ctx.fillStyle = "#ff4444"; ctx.beginPath(); ctx.arc(curX, curY, 5, 0, Math.PI*2); ctx.fill();
    // Labels
    ctx.fillStyle = "rgba(220,240,255,0.75)"; ctx.font = "600 12px 'Avenir Next',sans-serif";
    ctx.fillText(`$${PRICE_MAX.toLocaleString()}`, m, cY-4);
    ctx.fillText(`$${PRICE_MIN.toLocaleString()}`, m, cY+cH+14);
    let lastYr = "";
    for (let i = 0; i < BTC_PRICES.length; i += Math.floor(BTC_PRICES.length/12)) {
      const yr = BTC_PRICES[i].date.substring(0,4);
      if (yr !== lastYr) { ctx.fillText(yr, m+(i/n)*cW, cY+cH+28); lastYr = yr; }
    }
    ctx.restore();
  }

  // ─── HUD ───
  function formatUsd(v) { return '$' + Math.round(v).toLocaleString(); }
  function drawHud() {
    const ph = getPhase(), pd = priceAtIndex(state.timelineX);
    const tier = shipTier(pd.price);
    ctx.fillStyle = "rgba(4,15,28,0.6)";
    ctx.beginPath(); ctx.roundRect(20, 20, 380, 120, 8); ctx.fill();
    ctx.fillStyle = "#7cc8e8"; ctx.font = "700 22px 'Avenir Next',sans-serif"; ctx.fillText("Bitcoin Ships 3", 36, 48);
    ctx.font = "600 13px 'Avenir Next',sans-serif"; ctx.fillStyle = "#8ab8d0";
    ctx.fillText(`${ph.label}  ·  ${shipName(tier)}`, 36, 68);
    ctx.fillStyle = "#f7931a"; ctx.font = "700 18px 'JetBrains Mono',monospace,sans-serif";
    ctx.fillText(`BTC: ${formatUsd(pd.price)}`, 36, 94);
    ctx.fillStyle = "#5a8aa8"; ctx.font = "600 12px 'Avenir Next',sans-serif";
    ctx.fillText(pd.date, 36, 114);
    // Change indicator
    if (state.timelineX > 10) {
      const prev = priceAtIndex(state.timelineX - 7).price;
      const ch = ((pd.price - prev) / prev * 100);
      ctx.fillStyle = ch >= 0 ? "#34d399" : "#f87171";
      ctx.fillText(`${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(1)}% (7d)`, 200, 94);
    }
    // Controls
    ctx.fillStyle = "rgba(4,15,28,0.45)"; ctx.beginPath(); ctx.roundRect(20, view.height-44, 480, 24, 5); ctx.fill();
    ctx.fillStyle = "#5a8aa8"; ctx.font = "600 11px 'Avenir Next',sans-serif";
    ctx.fillText("Space: pause  ←→: scrub  ↑↓: waves  A: skip  R: reset  F: fullscreen", 30, view.height-28);
    if (state.mode === "paused") {
      ctx.fillStyle = "rgba(4,15,28,0.72)"; ctx.beginPath(); ctx.roundRect(view.width/2-120, view.height/2-36, 240, 72, 10); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 24px 'Avenir Next',sans-serif"; ctx.fillText("PAUSED", view.width/2-46, view.height/2-4);
      ctx.font = "600 13px 'Avenir Next',sans-serif"; ctx.fillText("Press Space", view.width/2-40, view.height/2+18);
    }
  }

  // ─── RENDER + INIT ───
  function render() {
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0, 0, view.width, view.height);
    drawSky(); drawOcean(); drawBoat(); drawChartOverlay(); drawHud();
  }
  function resize() {
    view.width = Math.max(680, Math.floor(window.innerWidth));
    view.height = Math.max(400, Math.floor(window.innerHeight));
    view.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(view.width * view.dpr);
    canvas.height = Math.floor(view.height * view.dpr);
    canvas.style.width = `${view.width}px`; canvas.style.height = `${view.height}px`;
    if (state) { state.seaLevel = view.height * 0.54; state.boatY = clamp(state.boatY, 0, view.height+120); }
  }
  async function toggleFS() {
    if (!document.fullscreenElement) { if (canvas.requestFullscreen) await canvas.requestFullscreen(); }
    else if (document.exitFullscreen) await document.exitFullscreen();
  }
  window.addEventListener("keydown", (e) => {
    if (["Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)) e.preventDefault();
    if (!state) return;
    if (e.code==="Space") { state.mode = state.mode==="playing"?"paused":"playing"; return; }
    if (e.code==="ArrowLeft") { state.timelineX = clamp(state.timelineX-70, 1, SURFACE.length-2); return; }
    if (e.code==="ArrowRight") { state.timelineX = clamp(state.timelineX+70, 1, SURFACE.length-2); return; }
    if (e.code==="ArrowUp") { state.turbulence = clamp(state.turbulence+0.08, 0.3, 1.8); return; }
    if (e.code==="ArrowDown") { state.turbulence = clamp(state.turbulence-0.08, 0.3, 1.8); return; }
    if (e.code==="KeyA") { state.phaseIndex = Math.min(state.phaseIndex+1, PHASES.length-1); state.phaseTime=0; return; }
    if (e.code==="KeyR"||e.code==="KeyB") { state = createState(); return; }
    if (e.code==="KeyF") { toggleFS().catch(()=>{}); }
  }, { passive: false });
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);
  async function loadPrices() {
    try {
      const r = await fetch("/tbg-mirrors/btc-prices.json");
      const d = await r.json();
      return Object.entries(d).map(([date,price])=>({date,price})).sort((a,b)=>a.date.localeCompare(b.date));
    } catch(e) {
      console.error("Fallback prices:", e);
      const entries = []; let p = 800;
      for (let i=0; i<4000; i++) { p += (Math.random()-0.48)*p*0.03; p = Math.max(50, p);
        const d = new Date(2013,0,1); d.setDate(d.getDate()+i);
        entries.push({date:d.toISOString().slice(0,10), price:Math.round(p)});
      } return entries;
    }
  }
  async function init() {
    resize();
    BTC_PRICES = await loadPrices(); SURFACE = pricesToSurface(BTC_PRICES);
    CALM_INDEX = findCalmZone(); state = createState();
    document.getElementById("loading").style.display = "none";
    let prev = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now-prev)/1000)); prev = now;
      step(dt); render(); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  init();
})();
