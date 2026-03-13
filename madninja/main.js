import { createBossController } from "./scripts/boss_ai.js";
import { cleanupEnemies, createEnemies, drawEnemies, updateEnemies } from "./scripts/enemy.js";
import { drawStageForeground, getPatternForStage } from "./scripts/nes_art.js";
import { rectsOverlap } from "./scripts/physics.js";
import { Player } from "./scripts/player.js";
import { CutscenePlayer, getStageIntroCutscene } from "./scripts/cutscenes.js";
import { drawPixelText, measurePixelText } from "./scripts/pixel_text.js";
import { createWeaponSystem } from "./scripts/weapons.js";

const GAME_WIDTH = 256;
const GAME_HEIGHT = 240;
const MAX_STAGE = 10;

const canvas = document.getElementById("game");
const screenCtx = canvas.getContext("2d", { alpha: false });
const renderCanvas = document.createElement("canvas");
renderCanvas.width = GAME_WIDTH;
renderCanvas.height = GAME_HEIGHT;
const ctx = renderCanvas.getContext("2d", { alpha: false });
screenCtx.imageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;

function setupDisplayScaling() {
  const frame = canvas.parentElement;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const frameRect = frame.getBoundingClientRect();
    const maxWidth = Math.max(1, Math.floor(frameRect.width - 8) * dpr);
    const maxHeight = Math.max(1, Math.floor(window.innerHeight * 0.7) * dpr);

    const scaleX = Math.floor(maxWidth / GAME_WIDTH);
    const scaleY = Math.floor(maxHeight / GAME_HEIGHT);
    const scale = Math.max(1, Math.min(8, scaleX, scaleY));

    canvas.width = GAME_WIDTH * scale;
    canvas.height = GAME_HEIGHT * scale;

    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    screenCtx.imageSmoothingEnabled = false;
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
}

setupDisplayScaling();

class Input {
  constructor() {
    this.down = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();

    this.map = {
      left: ["ArrowLeft", "KeyA"],
      right: ["ArrowRight", "KeyD"],
      up: ["ArrowUp", "KeyW"],
      down: ["ArrowDown", "KeyS"],
      run: ["ShiftLeft", "ShiftRight"],
      jump: ["Space", "KeyZ"],
      attack: ["KeyX"],
      heavy: ["KeyV"],
      sub: ["KeyC"],
      cycle: ["KeyQ"],
      next: ["KeyN"],
      cutscene: ["Enter"],
    };

    window.addEventListener("keydown", (event) => {
      if (event.repeat) {
        return;
      }

      const action = this.actionFor(event.code);
      if (!action) {
        return;
      }

      event.preventDefault();
      if (!this.down.has(action)) {
        this.justPressed.add(action);
      }
      this.down.add(action);
    });

    window.addEventListener("keyup", (event) => {
      const action = this.actionFor(event.code);
      if (!action) {
        return;
      }

      event.preventDefault();
      this.down.delete(action);
      this.justReleased.add(action);
    });
  }

  actionFor(code) {
    for (const [action, codes] of Object.entries(this.map)) {
      if (codes.includes(code)) {
        return action;
      }
    }
    return null;
  }

  isDown(action) {
    return this.down.has(action);
  }

  pressed(action) {
    return this.justPressed.has(action);
  }

  released(action) {
    return this.justReleased.has(action);
  }

  endFrame() {
    this.justPressed.clear();
    this.justReleased.clear();
  }
}

async function loadStage(stageNumber) {
  const response = await fetch(`./levels/stage${stageNumber}.json`);
  if (!response.ok) {
    throw new Error(`Could not load stage${stageNumber}.json`);
  }
  return response.json();
}

function normalizeWorld(stageData) {
  const groundLine = stageData.height - 20;

  return {
    bounds: {
      x: 0,
      y: 0,
      w: stageData.width,
      h: stageData.height,
    },
    solids: (stageData.solids || []).map((solid) => {
      const normalized = { ...solid };
      if (typeof normalized.oneWay !== "boolean") {
        const thinLedge = normalized.h <= 10 && normalized.y < groundLine;
        normalized.oneWay = thinLedge;
      }
      if (normalized.oneWay && typeof normalized.oneWayMargin !== "number") {
        normalized.oneWayMargin = 2;
      }
      return normalized;
    }),
    climbZones: (stageData.climbZones || []).map((zone) => ({ ...zone })),
  };
}

function createPickups(spawns) {
  return (spawns || []).map((spawn) => ({ ...spawn, collected: false }));
}

function drawBackground(ctx, stageData, cameraX, clock) {
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  gradient.addColorStop(0, stageData.background.top);
  gradient.addColorStop(1, stageData.background.bottom);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const horizon = 124;
  const moonX = 198 - Math.floor(cameraX * 0.08);
  const moonY = 34;

  ctx.fillStyle = "rgba(232, 240, 255, 0.45)";
  ctx.fillRect(moonX - 10, moonY - 10, 20, 20);
  ctx.fillStyle = "rgba(232, 240, 255, 0.8)";
  ctx.fillRect(moonX - 7, moonY - 7, 14, 14);
  ctx.fillStyle = stageData.background.top;
  ctx.fillRect(moonX - 2, moonY - 6, 8, 8);

  ctx.fillStyle = "#111a2d";
  for (let i = 0; i < 12; i += 1) {
    const w = 14 + (i % 4) * 3;
    const h = 30 + (i % 5) * 9;
    const x = Math.floor((i * 39 - (cameraX * 0.22) % 512 + 512) % 512) - 26;
    const y = horizon - h;
    ctx.fillRect(x, y, w, h);

    if (i % 2 === 0) {
      ctx.fillStyle = "#223556";
      ctx.fillRect(x + 2, y + 4, 2, 2);
      ctx.fillRect(x + 6, y + 9, 2, 2);
      ctx.fillRect(x + 2, y + 14, 2, 2);
      ctx.fillStyle = "#111a2d";
    }
  }

  ctx.fillStyle = "#16233f";
  for (let i = 0; i < 18; i += 1) {
    const x = Math.floor((i * 23 - (cameraX * 0.35) % 420 + 420) % 420) - 12;
    const y = horizon + 14 + (i % 4) * 4;
    const w = 18 + (i % 3) * 3;
    const h = 54;
    ctx.fillRect(x, y - h, w, h);
  }

  ctx.fillStyle = stageData.background.stars;
  for (let i = 0; i < stageData.background.starCount; i += 1) {
    const twinkle = ((clock * 7 + i * 11) % 9) < 1 ? 2 : 1;
    const x = (i * 29 + Math.floor(cameraX * 0.28)) % GAME_WIDTH;
    const y = (i * 19 + ((i * 13) % 7)) % 108;
    ctx.fillRect(x, y, twinkle, 1);
  }

  ctx.fillStyle = "rgba(113, 181, 255, 0.26)";
  for (let i = 0; i < 36; i += 1) {
    const x = Math.floor((i * 17 + cameraX * 0.14 + clock * 46) % (GAME_WIDTH + 14)) - 6;
    const y = Math.floor((i * 41 + clock * 120) % (GAME_HEIGHT + 20)) - 10;
    ctx.fillRect(x, y, 1, 4);
    ctx.fillRect(x - 1, y + 2, 1, 2);
  }

  ctx.fillStyle = "rgba(14, 28, 52, 0.35)";
  for (let y = horizon; y < GAME_HEIGHT; y += 6) {
    ctx.fillRect(0, y, GAME_WIDTH, 1);
  }
}

function drawSolidTile(ctx, solid, stageId) {
  ctx.fillStyle = "#090d16";
  ctx.fillRect(solid.x - 1, solid.y - 1, solid.w + 2, solid.h + 2);

  const texture = getPatternForStage(ctx, stageId);
  ctx.fillStyle = texture;
  ctx.fillRect(solid.x, solid.y, solid.w, solid.h);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(solid.x, solid.y, solid.w, 1);
  ctx.fillRect(solid.x, solid.y, 1, solid.h);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(solid.x, solid.y + solid.h - 1, solid.w, 1);
  ctx.fillRect(solid.x + solid.w - 1, solid.y, 1, solid.h);

  if (solid.oneWay) {
    ctx.fillStyle = "rgba(255, 241, 176, 0.9)";
    ctx.fillRect(solid.x, solid.y, solid.w, 1);
    ctx.fillStyle = "rgba(42, 28, 12, 0.75)";
    for (let x = solid.x + 1; x < solid.x + solid.w - 1; x += 3) {
      ctx.fillRect(x, solid.y + 1, 1, 1);
    }
    ctx.fillStyle = "rgba(172, 194, 214, 0.45)";
    for (let x = solid.x + 2; x < solid.x + solid.w - 2; x += 8) {
      ctx.fillRect(x, solid.y + 2, 1, 3);
      ctx.fillRect(x + 1, solid.y + 3, 1, 2);
    }
  }
}

function drawWorld(ctx, stageData, world, pickups, cameraX, clock) {
  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const solid of world.solids) {
    drawSolidTile(ctx, solid, stageData.id);
  }

  for (const zone of world.climbZones) {
    ctx.fillStyle = "#0a0f1b";
    ctx.fillRect(zone.x - 1, zone.y - 1, zone.w + 2, zone.h + 2);

    ctx.fillStyle = stageData.tiles.climb;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

    for (let y = zone.y; y < zone.y + zone.h; y += 4) {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(zone.x, y, zone.w, 1);
    }
  }

  for (const pickup of pickups) {
    if (pickup.collected) {
      continue;
    }

    const pulse = Math.sin(clock * 8 + pickup.x * 0.05) > 0 ? 1 : 0;

    if (pickup.type === "satoshi") {
      ctx.fillStyle = "#0a0f1b";
      ctx.fillRect(pickup.x - 1, pickup.y - 1, 7, 7);
      ctx.fillStyle = "#f7c64a";
      ctx.fillRect(pickup.x, pickup.y, 5, 5);
      ctx.fillStyle = "#ffe7a1";
      ctx.fillRect(pickup.x + 1, pickup.y + 1, 2, 1);
      continue;
    }

    if (pickup.type === "hardware_wallet") {
      ctx.fillStyle = "#0a0f1b";
      ctx.fillRect(pickup.x - 1, pickup.y - 1, 9, 8);
      ctx.fillStyle = "#8cf7da";
      ctx.fillRect(pickup.x, pickup.y, 7, 6);
      ctx.fillStyle = "#e8fffa";
      ctx.fillRect(pickup.x + 2, pickup.y + 2, 3, 1);
      continue;
    }

    if (pickup.type === "hodl_mode") {
      ctx.fillStyle = "#0a0f1b";
      ctx.fillRect(pickup.x - 1, pickup.y - 1, 9, 8);
      ctx.fillStyle = "#ffe083";
      ctx.fillRect(pickup.x, pickup.y, 7, 6);
      ctx.fillStyle = "#fff8da";
      ctx.fillRect(pickup.x + pulse, pickup.y + 1, 2, 2);
      continue;
    }

    if (pickup.type === "satoshi_spirit") {
      ctx.fillStyle = "#0a0f1b";
      ctx.fillRect(pickup.x - 1, pickup.y - 1, 8, 8);
      ctx.fillStyle = "#ff9dcf";
      ctx.fillRect(pickup.x, pickup.y, 6, 6);
      ctx.fillStyle = "#ffe8f4";
      ctx.fillRect(pickup.x + 2, pickup.y + 1 + pulse, 1, 2);
      continue;
    }

    if (pickup.type === "lightning_mode") {
      ctx.fillStyle = "#0a0f1b";
      ctx.fillRect(pickup.x - 1, pickup.y - 1, 8, 8);
      ctx.fillStyle = "#9be1ff";
      ctx.fillRect(pickup.x, pickup.y, 6, 6);
      ctx.fillStyle = "#e8f8ff";
      ctx.fillRect(pickup.x + 2, pickup.y + 1, 1, 3);
      continue;
    }
  }

  ctx.restore();

  drawStageForeground(ctx, stageData.id, cameraX, clock);
}

function drawHud(ctx, state) {
  const { player, stageData, stageComplete, buffs, stageNumber } = state;

  ctx.fillStyle = "rgba(4, 7, 15, 0.9)";
  ctx.fillRect(0, 0, GAME_WIDTH, 25);
  ctx.fillStyle = "rgba(5, 10, 20, 0.86)";
  ctx.fillRect(0, GAME_HEIGHT - 13, GAME_WIDTH, 13);

  drawPixelText(ctx, `STAGE ${stageNumber}: ${stageData.label}`, 4, 3, {
    color: "#f5f7ff",
    shadow: true,
  });
  drawPixelText(ctx, `LIVES ${player.lives}`, 4, 10, {
    color: "#f5f7ff",
    shadow: true,
  });

  const healthRatio = Math.max(0, player.health) / player.maxHealth;
  const barWidth = 84;
  ctx.fillStyle = "#1b0f14";
  ctx.fillRect(82, 5, barWidth, 7);
  ctx.fillStyle = "#ff5f6d";
  ctx.fillRect(82, 5, Math.floor(barWidth * healthRatio), 7);
  ctx.strokeStyle = "#f5f7ff";
  ctx.strokeRect(82, 5, barWidth, 7);

  drawPixelText(ctx, `SATS ${player.sats}`, 170, 4, {
    color: "#ffcc33",
    shadow: true,
  });
  drawPixelText(ctx, `SUB ${player.subWeapon}`, 170, 11, {
    color: "#9be1ff",
    shadow: true,
  });

  if (player.comboStep > 0 && player.attackTimer > 0) {
    drawPixelText(ctx, `COMBO ${player.comboStep}`, 4, GAME_HEIGHT - 10, {
      color: "#ffe083",
      shadow: true,
    });
  } else {
    drawPixelText(ctx, `STATE ${player.state}`, 4, GAME_HEIGHT - 10, {
      color: "#c9d6ff",
      shadow: true,
    });
  }

  let buffX = 110;
  if (buffs.hodl > 0) {
    drawPixelText(ctx, `HODL ${buffs.hodl.toFixed(1)}S`, buffX, GAME_HEIGHT - 10, {
      color: "#ffe083",
      shadow: true,
    });
    buffX += 48;
  }
  if (buffs.spirit > 0) {
    drawPixelText(ctx, `SPIRIT ${buffs.spirit.toFixed(1)}S`, buffX, GAME_HEIGHT - 10, {
      color: "#ff9dcf",
      shadow: true,
    });
    buffX += 58;
  }
  if (buffs.lightning > 0) {
    drawPixelText(ctx, `BOOST ${buffs.lightning.toFixed(1)}S`, buffX, GAME_HEIGHT - 10, {
      color: "#9be1ff",
      shadow: true,
    });
  }

  if (player.fearTimer > 0) {
    drawPixelText(ctx, `FEAR ${player.fearTimer.toFixed(1)}S`, 184, GAME_HEIGHT - 10, {
      color: "#d3b6ff",
      shadow: true,
    });
  }

  if (stageComplete) {
    ctx.fillStyle = "rgba(8,10,20,0.84)";
    ctx.fillRect(42, 82, 172, 48);
    ctx.strokeStyle = "#ffcc33";
    ctx.strokeRect(42, 82, 172, 48);

    const clearText = "STAGE CLEAR";
    drawPixelText(ctx, clearText, Math.floor((GAME_WIDTH - measurePixelText(clearText)) * 0.5), 93, {
      color: "#ffcc33",
      shadow: true,
    });

    drawPixelText(ctx, "THE BLOCKCHAIN IS SAFE...", 63, 106, {
      color: "#f5f7ff",
      shadow: true,
    });
    drawPixelText(ctx, "FOR NOW.", 108, 114, {
      color: "#f5f7ff",
      shadow: true,
    });
    drawPixelText(ctx, "PRESS N FOR NEXT STAGE", 72, 122, {
      color: "#9be1ff",
      shadow: true,
    });
  }

  if (player.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(42, 82, 172, 50);
    ctx.strokeStyle = "#ff5f6d";
    ctx.strokeRect(42, 82, 172, 50);

    const gameOver = "GAME OVER";
    drawPixelText(ctx, gameOver, Math.floor((GAME_WIDTH - measurePixelText(gameOver)) * 0.5), 93, {
      color: "#ff5f6d",
      shadow: true,
    });
    drawPixelText(ctx, "REFRESH PAGE TO RETRY", 72, 108, {
      color: "#f5f7ff",
      shadow: true,
    });
  }
}

function drawCrtOverlay(ctx, clock) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#d7e6ff";
  const shimmer = Math.floor((clock * 40) % 3);
  for (let y = shimmer; y < GAME_HEIGHT; y += 3) {
    ctx.fillRect(0, y, GAME_WIDTH, 1);
  }
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(0, 0, GAME_WIDTH, 2);
  ctx.fillRect(0, GAME_HEIGHT - 2, GAME_WIDTH, 2);
}

function presentFrame() {
  screenCtx.setTransform(1, 0, 0, 1, 0, 0);
  screenCtx.clearRect(0, 0, canvas.width, canvas.height);
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);
}

function consumePickups(player, pickups, buffs) {
  for (const pickup of pickups) {
    if (pickup.collected) {
      continue;
    }

    const box = { x: pickup.x, y: pickup.y, w: pickup.w || 6, h: pickup.h || 6 };
    if (!rectsOverlap(player, box)) {
      continue;
    }

    pickup.collected = true;

    if (pickup.type === "satoshi") {
      player.addSats(pickup.amount || 100);
      continue;
    }

    if (pickup.type === "hardware_wallet") {
      player.health = Math.min(player.maxHealth, player.health + 8);
      continue;
    }

    if (pickup.type === "hodl_mode") {
      buffs.hodl = 5;
      continue;
    }

    if (pickup.type === "satoshi_spirit") {
      buffs.spirit = 6;
      continue;
    }

    if (pickup.type === "lightning_mode") {
      buffs.lightning = 5;
      continue;
    }

    if (pickup.type === "private_key_scroll") {
      buffs.key = Math.max(buffs.key, 1);
    }
  }
}

function updateBuffs(dt, player, buffs) {
  buffs.hodl = Math.max(0, buffs.hodl - dt);
  buffs.spirit = Math.max(0, buffs.spirit - dt);
  buffs.lightning = Math.max(0, buffs.lightning - dt);

  player.externalInvulnerable = buffs.hodl > 0;
  player.damageMultiplier = buffs.spirit > 0 ? 2 : 1;
  player.walkSpeed = buffs.lightning > 0 ? player.baseWalkSpeed * 1.4 : player.baseWalkSpeed;
  player.runSpeed = buffs.lightning > 0 ? player.baseRunSpeed * 1.4 : player.baseRunSpeed;
}

function stageIdFromNumber(stageNumber) {
  return `stage${Math.min(MAX_STAGE, Math.max(1, stageNumber))}`;
}

async function boot() {
  const params = new URLSearchParams(window.location.search);
  const requestedStage = Number(params.get("stage") || 1);
  const stageNumber = Number.isFinite(requestedStage) ? Math.max(1, Math.min(MAX_STAGE, requestedStage)) : 1;

  const stageData = await loadStage(stageNumber);
  const world = normalizeWorld(stageData);
  const player = new Player(stageData.spawn);
  let enemies = createEnemies(stageData.enemySpawns);
  const pickups = createPickups(stageData.pickupSpawns || []);
  const input = new Input();
  const weaponSystem = createWeaponSystem();
  const cutscenePlayer = new CutscenePlayer();
  const boss = createBossController(stageIdFromNumber(stageNumber));

  const buffs = {
    hodl: 0,
    spirit: 0,
    lightning: 0,
    key: 0,
  };

  let stageComplete = false;
  let cameraX = 0;
  let screenShake = 0;
  let lastTime = performance.now();

  function update(dt) {
    if (input.pressed("cutscene")) {
      if (cutscenePlayer.active) {
        cutscenePlayer.stop();
      } else {
        cutscenePlayer.start(getStageIntroCutscene());
      }
    }

    if (!cutscenePlayer.active && !stageComplete && !player.gameOver) {
      updateBuffs(dt, player, buffs);

      weaponSystem.setEnemyContext(enemies);
      player.update(dt, input, world, weaponSystem);

      if (player.consumeDamagePulse()) {
        screenShake = Math.max(screenShake, 3.2);
      }

      const attack = player.getAttackHitbox();
      if (attack) {
        for (const enemy of enemies) {
          enemy.tryMeleeHit(attack, player.attackToken, player.facing);
        }
      }

      updateEnemies(enemies, dt, world, player);
      weaponSystem.update(dt, world, enemies);
      enemies = cleanupEnemies(enemies);

      consumePickups(player, pickups, buffs);
      boss.update(player);

      if (player.x > world.bounds.w - 24) {
        stageComplete = true;
      }
    } else if (!cutscenePlayer.active && stageComplete && !player.gameOver) {
      if (input.pressed("next") || input.pressed("attack") || input.pressed("jump")) {
        const nextStage = stageNumber >= MAX_STAGE ? 1 : stageNumber + 1;
        window.location.search = `?stage=${nextStage}`;
      }
    } else {
      cutscenePlayer.update(dt, input);
    }

    screenShake = Math.max(0, screenShake - dt * 8.5);

    const cameraTarget = Math.max(0, Math.min(player.x - GAME_WIDTH * 0.45, world.bounds.w - GAME_WIDTH));
    cameraX += (cameraTarget - cameraX) * Math.min(1, dt * 8);
  }

  function draw(clock) {
    const shakeMagnitude = Math.max(0, Math.floor(screenShake));
    const shakeX = shakeMagnitude > 0 ? Math.floor((Math.random() * 2 - 1) * shakeMagnitude) : 0;
    const shakeY = shakeMagnitude > 0 ? Math.floor((Math.random() * 2 - 1) * shakeMagnitude) : 0;
    const cameraRenderX = Math.floor(cameraX);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground(ctx, stageData, cameraRenderX, clock);
    drawWorld(ctx, stageData, world, pickups, cameraRenderX, clock);

    ctx.save();
    ctx.translate(-cameraRenderX, 0);
    drawEnemies(enemies, ctx);
    weaponSystem.draw(ctx);
    player.draw(ctx);
    ctx.restore();

    ctx.restore();

    drawHud(ctx, { player, stageData, stageComplete, buffs, stageNumber });
    boss.draw(ctx);
    cutscenePlayer.draw(ctx, GAME_WIDTH, GAME_HEIGHT);
    drawCrtOverlay(ctx, clock);

    presentFrame();
  }

  function frame(time) {
    const dt = Math.min((time - lastTime) / 1000, 1 / 30);
    lastTime = time;

    update(dt);
    draw(time / 1000);
    input.endFrame();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

boot().catch((error) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#04060f";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawPixelText(ctx, "BOOT ERROR", 12, 30, { color: "#ff6d7e", shadow: true });
  drawPixelText(ctx, String(error.message || error), 12, 42, { color: "#f5f7ff", shadow: true });
  presentFrame();
});
