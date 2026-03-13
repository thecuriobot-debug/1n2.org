(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const PHASES = [
    { name: "storm", label: "Storm Ride", duration: 32 },
    { name: "zoom_out", label: "Zooming Out", duration: 10 },
    { name: "calm_hunt", label: "Finding Calm Water", duration: 8 },
    { name: "zoom_in", label: "Diving Into Calm", duration: 10 },
    { name: "calm", label: "Calm Float", duration: Infinity },
  ];

  const view = {
    width: 1280,
    height: 720,
    dpr: 1,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function easeInOutCubic(t) {
    const x = clamp(t, 0, 1);
    if (x < 0.5) {
      return 4 * x * x * x;
    }
    return 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function smoothSeries(input, radius, passes) {
    let src = input.slice();
    const out = new Array(src.length);

    for (let p = 0; p < passes; p += 1) {
      for (let i = 0; i < src.length; i += 1) {
        let weightTotal = 0;
        let weightedSum = 0;

        for (let k = -radius; k <= radius; k += 1) {
          const idx = clamp(i + k, 0, src.length - 1);
          const w = radius + 1 - Math.abs(k);
          weightTotal += w;
          weightedSum += src[idx] * w;
        }

        out[i] = weightedSum / weightTotal;
      }

      src = out.slice();
    }

    return src;
  }

  function generateSurface(length, seed) {
    const rng = mulberry32(seed);
    const raw = new Array(length);

    let displacement = 0;
    let velocity = 0;

    for (let i = 0; i < length; i += 1) {
      const t = i / (length - 1);
      const calmBlend = smoothstep(0.58, 0.9, t);

      const volatility = lerp(7.1, 1.65, calmBlend);
      const pullToCenter = lerp(0.018, 0.06, calmBlend);
      const drag = lerp(0.9, 0.945, calmBlend);
      const spikeChance = lerp(0.018, 0.006, calmBlend);
      const spikeAmp = lerp(9.6, 4.2, calmBlend);

      velocity += (-displacement * pullToCenter + (rng() * 2 - 1) * volatility) * 0.56;
      velocity *= drag;

      if (rng() < spikeChance) {
        velocity += (rng() * 2 - 1) * volatility * spikeAmp;
      }

      displacement += velocity;
      displacement = clamp(displacement, -260, 260);
      raw[i] = displacement;
    }

    return smoothSeries(raw, 3, 2);
  }

  function sampleSurface(surface, index) {
    if (index <= 0) {
      return surface[0];
    }

    const max = surface.length - 1;
    if (index >= max) {
      return surface[max];
    }

    const left = Math.floor(index);
    const t = index - left;
    return lerp(surface[left], surface[left + 1], t);
  }

  function findCalmZone(surface) {
    const n = surface.length;
    const windowSize = 260;

    const prefix = new Array(n + 1).fill(0);
    const prefixSq = new Array(n + 1).fill(0);

    for (let i = 0; i < n; i += 1) {
      prefix[i + 1] = prefix[i] + surface[i];
      prefixSq[i + 1] = prefixSq[i] + surface[i] * surface[i];
    }

    const overallMean = prefix[n] / n;
    let bestIndex = Math.floor(n * 0.82);
    let bestScore = Number.POSITIVE_INFINITY;

    for (let start = Math.floor(n * 0.45); start <= n - windowSize - 1; start += 4) {
      const end = start + windowSize;
      const mean = (prefix[end] - prefix[start]) / windowSize;
      const variance = (prefixSq[end] - prefixSq[start]) / windowSize - mean * mean;
      const std = Math.sqrt(Math.max(variance, 0));

      const center = start + windowSize * 0.5;
      const meanPenalty = Math.abs(mean - overallMean) * 0.55;
      const positionPenalty = Math.abs(center - n * 0.82) * 0.003;
      const score = std + meanPenalty + positionPenalty;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = Math.round(center);
      }
    }

    return bestIndex;
  }

  function formatUsd(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function syntheticPrice(index, waveValue) {
    const baseline = 68500;
    const macroA = Math.sin(index * 0.00185) * 2200;
    const macroB = Math.sin(index * 0.00023 + 1.3) * 4300;
    const trend = index * 0.08;
    return baseline + macroA + macroB + trend + waveValue * 120;
  }

  function createState() {
    const surface = generateSurface(16000, 0xb17c0de);
    const calmIndex = findCalmZone(surface);
    const startIndex = Math.floor(surface.length * 0.17);

    const seaLevel = view.height * 0.56;
    const wave = sampleSurface(surface, startIndex);

    return {
      mode: "playing",
      sequenceTime: 0,
      phaseIndex: 0,
      phaseTime: 0,
      surface,
      calmIndex,
      timelineX: startIndex,
      cameraCenterX: startIndex,
      cameraZoom: 1,
      targetZoom: 1,
      seaLevel,
      turbulence: 1.2,
      boatY: seaLevel - wave * 0.62 - 14,
      boatVY: 0,
      boatRoll: 0,
      currentPrice: 0,
      horizonDrift: 0,
    };
  }

  let state = createState();

  function resetSimulation() {
    state = createState();
  }

  function getPhase() {
    return PHASES[Math.min(state.phaseIndex, PHASES.length - 1)];
  }

  function updatePhase(dt) {
    state.sequenceTime += dt;
    state.phaseTime += dt;

    const current = getPhase();
    if (Number.isFinite(current.duration) && state.phaseTime >= current.duration) {
      state.phaseTime -= current.duration;
      state.phaseIndex = Math.min(state.phaseIndex + 1, PHASES.length - 1);
    }

    const phase = getPhase();

    let speed = 20;
    let desiredZoom = 1.18;
    let turbulenceTarget = 0.82;

    if (phase.name === "storm") {
      speed = 96;
      desiredZoom = 1;
      turbulenceTarget = 1.24;
    } else if (phase.name === "zoom_out") {
      speed = 72;
      const t = state.phaseTime / phase.duration;
      desiredZoom = lerp(1, 0.07, easeInOutCubic(t));
      turbulenceTarget = 1.08;
    } else if (phase.name === "calm_hunt") {
      speed = 10;
      desiredZoom = 0.07;
      turbulenceTarget = 0.95;
      const settle = 1 - Math.exp(-dt * 1.6);
      state.timelineX = lerp(state.timelineX, state.calmIndex - 140, settle);
    } else if (phase.name === "zoom_in") {
      speed = 28;
      const t = state.phaseTime / phase.duration;
      desiredZoom = lerp(0.07, 1.18, easeInOutCubic(t));
      turbulenceTarget = 0.86;

      if (state.timelineX < state.calmIndex - 120) {
        state.timelineX += (state.calmIndex - 120 - state.timelineX) * Math.min(1, dt * 1.4);
      }
    } else if (phase.name === "calm") {
      speed = 18;
      desiredZoom = 1.18;
      turbulenceTarget = 0.8;
    }

    state.timelineX += speed * dt;
    state.targetZoom = desiredZoom;
    state.turbulence += (turbulenceTarget - state.turbulence) * Math.min(1, dt * 0.9);

    state.cameraZoom += (state.targetZoom - state.cameraZoom) * Math.min(1, dt * 2.2);

    const maxTimeline = state.surface.length - 2;
    state.timelineX = clamp(state.timelineX, 1, maxTimeline);
    state.cameraCenterX = state.timelineX;
  }

  function updateBoat(dt) {
    const visualZoom = waveZoomFactor();
    const wave = sampleSurface(state.surface, state.timelineX) * state.turbulence;
    const surfaceY = state.seaLevel - wave * visualZoom;

    const desiredBoatY = lerp(state.seaLevel - 20, surfaceY - 12, 0.66);
    const springForce = (desiredBoatY - state.boatY) * 9.5;
    const dampingForce = -state.boatVY * 5.7;

    state.boatVY += (springForce + dampingForce) * dt;
    state.boatY += state.boatVY * dt;

    const slope = sampleSurface(state.surface, state.timelineX + 8) - sampleSurface(state.surface, state.timelineX - 8);
    const targetRoll = clamp(-slope * 0.0032 * visualZoom, -0.44, 0.44);
    state.boatRoll += (targetRoll - state.boatRoll) * Math.min(1, dt * 4.2);

    state.currentPrice = syntheticPrice(state.timelineX, wave);
    state.horizonDrift += dt * (10 + state.cameraZoom * 6);
  }

  function step(dt) {
    if (state.mode !== "playing") {
      return;
    }

    updatePhase(dt);
    updateBoat(dt);
  }

  function waveZoomFactor() {
    return Math.pow(state.cameraZoom, 0.66);
  }

  function worldXFromScreen(screenX) {
    return state.cameraCenterX + (screenX - view.width * 0.5) / state.cameraZoom;
  }

  function surfaceYForWorldX(worldX) {
    const visualZoom = waveZoomFactor();
    const wave = sampleSurface(state.surface, worldX) * state.turbulence;
    return state.seaLevel - wave * visualZoom;
  }

  function drawBackdrop() {
    const sky = ctx.createLinearGradient(0, 0, 0, view.height);
    sky.addColorStop(0, "#73c2f7");
    sky.addColorStop(0.52, "#b2e5ff");
    sky.addColorStop(1, "#e1f7ff");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.width, view.height);

    const sunX = view.width * 0.82;
    const sunY = view.height * 0.2;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 180);
    sunGlow.addColorStop(0, "rgba(255, 240, 180, 0.95)");
    sunGlow.addColorStop(1, "rgba(255, 240, 180, 0)");

    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
    ctx.fill();

    const horizonY = state.seaLevel - 150;
    for (let i = 0; i < 5; i += 1) {
      const layerY = horizonY + i * 32;
      const alpha = 0.08 + i * 0.03;
      ctx.strokeStyle = `rgba(11, 70, 104, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= view.width + 4; x += 4) {
        const worldX = worldXFromScreen(x + state.horizonDrift * (i + 1) * 0.14 + i * 90);
        const y = layerY - sampleSurface(state.surface, worldX * (1 + i * 0.1)) * waveZoomFactor() * (0.22 + i * 0.07);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  function drawOcean() {
    ctx.beginPath();
    for (let x = 0; x <= view.width + 2; x += 2) {
      const y = surfaceYForWorldX(worldXFromScreen(x));
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(view.width, view.height);
    ctx.lineTo(0, view.height);
    ctx.closePath();

    const water = ctx.createLinearGradient(0, state.seaLevel - 80, 0, view.height);
    water.addColorStop(0, "rgba(23, 142, 190, 0.87)");
    water.addColorStop(0.45, "rgba(12, 97, 154, 0.94)");
    water.addColorStop(1, "rgba(5, 44, 88, 0.98)");

    ctx.fillStyle = water;
    ctx.fill();

    ctx.beginPath();
    for (let x = 0; x <= view.width + 2; x += 2) {
      const base = surfaceYForWorldX(worldXFromScreen(x));
      const foam = Math.sin((x + state.sequenceTime * 120) * 0.025) * 2.2;
      const y = base + foam;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = "rgba(227, 252, 255, 0.86)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.beginPath();
    for (let x = 0; x <= view.width + 4; x += 4) {
      const worldX = worldXFromScreen(x);
      const y = state.seaLevel - sampleSurface(state.surface, worldX) * waveZoomFactor() * 0.45 + 36;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = "rgba(96, 205, 234, 0.34)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawBoat() {
    const centerX = view.width * 0.5;
    const centerY = state.boatY;
    const scale = clamp(0.56 + state.cameraZoom * 0.44, 0.56, 1.12);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(state.boatRoll);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.moveTo(-70, 2);
    ctx.quadraticCurveTo(0, 34, 74, 2);
    ctx.lineTo(52, 22);
    ctx.quadraticCurveTo(0, 40, -50, 22);
    ctx.closePath();
    ctx.fillStyle = "#8d4b20";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-70, 2);
    ctx.quadraticCurveTo(0, 34, 74, 2);
    ctx.strokeStyle = "rgba(37, 18, 8, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -92);
    ctx.strokeStyle = "#fff7e8";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(1, -84);
    ctx.lineTo(1, -18);
    ctx.lineTo(60, -24);
    ctx.closePath();
    ctx.fillStyle = "#f9fcff";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-1, -68);
    ctx.lineTo(-1, -16);
    ctx.lineTo(-48, -21);
    ctx.closePath();
    ctx.fillStyle = "#ffe3bc";
    ctx.fill();

    ctx.fillStyle = "#10293d";
    ctx.fillRect(-16, -14, 24, 10);

    ctx.restore();
  }

  function drawHud() {
    const phase = getPhase();

    ctx.fillStyle = "rgba(4, 22, 34, 0.58)";
    ctx.fillRect(20, 20, 340, 102);

    ctx.fillStyle = "#f4fcff";
    ctx.font = "700 20px 'Avenir Next', 'Gill Sans', 'Trebuchet MS', sans-serif";
    ctx.fillText("Bitcoin Ships 2", 36, 50);

    ctx.font = "600 15px 'Avenir Next', 'Gill Sans', 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#e9f8ff";
    ctx.fillText(`Phase: ${phase.label}`, 36, 76);

    ctx.fillStyle = "#d7f8ff";
    ctx.fillText(`BTC: ${formatUsd(state.currentPrice)} (simulated)`, 36, 100);

    ctx.fillStyle = "rgba(4, 22, 34, 0.52)";
    ctx.fillRect(20, view.height - 52, 460, 32);

    ctx.fillStyle = "#dbf7ff";
    ctx.font = "600 14px 'Avenir Next', 'Gill Sans', 'Trebuchet MS', sans-serif";
    ctx.fillText("Controls: Space pause | Left/Right scrub | Up/Down wave stress | A skip phase | B reset | F fullscreen", 30, view.height - 30);

    if (state.mode === "paused") {
      ctx.fillStyle = "rgba(7, 26, 39, 0.58)";
      ctx.fillRect(view.width * 0.5 - 180, view.height * 0.5 - 52, 360, 104);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 28px 'Avenir Next', 'Gill Sans', 'Trebuchet MS', sans-serif";
      ctx.fillText("Paused", view.width * 0.5 - 50, view.height * 0.5 - 6);

      ctx.font = "600 15px 'Avenir Next', 'Gill Sans', 'Trebuchet MS', sans-serif";
      ctx.fillText("Press Space to continue", view.width * 0.5 - 93, view.height * 0.5 + 24);
    }
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);

    drawBackdrop();
    drawOcean();
    drawBoat();
    drawHud();
  }

  function resize() {
    view.width = Math.max(680, Math.floor(window.innerWidth));
    view.height = Math.max(400, Math.floor(window.innerHeight));
    view.dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(view.width * view.dpr);
    canvas.height = Math.floor(view.height * view.dpr);
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;

    state.seaLevel = view.height * 0.56;
    state.boatY = clamp(state.boatY, 0, view.height + 120);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (canvas.requestFullscreen) {
        await canvas.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  function onKeyDown(event) {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
      event.preventDefault();
    }

    if (event.code === "Space") {
      state.mode = state.mode === "playing" ? "paused" : "playing";
      return;
    }

    if (event.code === "ArrowLeft") {
      state.timelineX = clamp(state.timelineX - 90, 1, state.surface.length - 2);
      state.cameraCenterX = state.timelineX;
      return;
    }

    if (event.code === "ArrowRight") {
      state.timelineX = clamp(state.timelineX + 90, 1, state.surface.length - 2);
      state.cameraCenterX = state.timelineX;
      return;
    }

    if (event.code === "ArrowUp") {
      state.turbulence = clamp(state.turbulence + 0.09, 0.5, 1.8);
      return;
    }

    if (event.code === "ArrowDown") {
      state.turbulence = clamp(state.turbulence - 0.09, 0.5, 1.8);
      return;
    }

    if (event.code === "KeyA") {
      state.phaseIndex = Math.min(state.phaseIndex + 1, PHASES.length - 1);
      state.phaseTime = 0;
      return;
    }

    if (event.code === "KeyB" || event.code === "KeyR") {
      resetSimulation();
      return;
    }

    if (event.code === "KeyF") {
      toggleFullscreen().catch(() => {});
    }
  }

  window.render_game_to_text = () => {
    const visualZoom = waveZoomFactor();
    const phase = getPhase();
    const wave = sampleSurface(state.surface, state.timelineX) * state.turbulence;
    const surfaceY = state.seaLevel - wave * visualZoom;

    const payload = {
      coordinate_system: "origin=(top-left), x increases right, y increases down",
      mode: state.mode,
      phase: phase.name,
      phase_label: phase.label,
      phase_seconds: Number(state.phaseTime.toFixed(2)),
      camera: {
        center_wave_index: Number(state.cameraCenterX.toFixed(2)),
        zoom: Number(state.cameraZoom.toFixed(3)),
      },
      boat: {
        screen_x: Number((view.width * 0.5).toFixed(2)),
        screen_y: Number(state.boatY.toFixed(2)),
        vertical_velocity: Number(state.boatVY.toFixed(3)),
        roll_degrees: Number((state.boatRoll * 57.2958).toFixed(2)),
      },
      ocean: {
        sea_level_y: Number(state.seaLevel.toFixed(2)),
        surface_y_under_boat: Number(surfaceY.toFixed(2)),
        wave_displacement: Number(wave.toFixed(3)),
        calm_zone_index: state.calmIndex,
      },
      bitcoin: {
        synthetic_price_usd: Math.round(state.currentPrice),
      },
      controls: "Space pause/resume, arrows scrub/stress, A skip phase, B reset, F fullscreen",
    };

    return JSON.stringify(payload);
  };

  window.advanceTime = (ms) => {
    const deltaMs = Number.isFinite(ms) ? Math.max(0, ms) : 16.6667;
    const steps = Math.max(1, Math.round(deltaMs / (1000 / 60)));
    const dt = deltaMs / 1000 / steps;

    for (let i = 0; i < steps; i += 1) {
      step(dt);
    }

    render();
  };

  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);
  window.addEventListener("keydown", onKeyDown, { passive: false });

  resize();

  let previousTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - previousTime) / 1000));
    previousTime = now;

    step(dt);
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
