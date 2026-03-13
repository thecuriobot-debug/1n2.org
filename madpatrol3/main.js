(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const VIEW = {
    width: 960,
    height: 540,
    dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  const COLORS = {
    hudBg: "rgba(7, 10, 18, 0.8)",
    hudBorder: "rgba(212, 214, 255, 0.25)",
    text: "#f3f5ff",
    gold: "#f7c44d",
    warning: "#ff735f",
    accent: "#8f72ff",
    green: "#75ffbc",
  };

  const LEVEL_COUNT = 5;
  const FIXED_DT = 1 / 60;
  const GRAVITY = 1550;
  const PLAYER_BASE_W = 38;
  const PLAYER_BASE_H = 58;
  const PLAYER_CROUCH_H = 38;
  const PLAYER_MAX_HP = 14;
  const GAME_VERSION = "v0.3.16";
  const ENEMY_PROJECTILE_SPEED_MULTIPLIER = 0.78;
  const BOSS_DAMAGE_MULTIPLIER = 2.6;
  const BOSS_PROJECTILE_DAMAGE = 0.65;
  const SPRITE_SCALE = 1.22;
  const POWERUP_W = 58;
  const POWERUP_H = 50;
  const POWERDROP_W = 52;
  const POWERDROP_H = 46;

  const QUANT_QUOTES = [
    "Mad Quant: 2010 pizza trade proved scarcity can become money.",
    "Mad Quant: Volatility is the fee we pay for early adoption.",
    "Mad Quant: Halvings compress supply, patience expands conviction.",
    "Mad Quant: Every panic candle leaves behind stronger holders.",
    "Mad Quant: Bear markets write the code for bull markets.",
    "Mad Quant: The signal is long-term issuance, not short-term noise.",
    "Mad Quant: Macro fear makes great entry points for prepared minds.",
    "Mad Quant: Energy, hash-rate, and conviction are tied together.",
    "Mad Quant: Markets overreact, then rediscover fundamentals.",
    "Mad Quant: Risk first, upside second, survive to stack tomorrow.",
    "Mad Quant: The best edge is consistency when headlines get loud.",
    "Mad Quant: Strong hands are built one boring week at a time.",
    "Mad Quant: History rhymes; leverage blows up on schedule.",
    "Mad Quant: Price is mood, adoption is momentum.",
    "Mad Quant: If the thesis is intact, drawdowns are tuition.",
    "Mad Quant: Liquidity hunts weak structure before trend resumes.",
    "Mad Quant: Large moves start where confidence feels impossible.",
    "Mad Quant: Fundamentals whisper long before charts scream.",
    "Mad Quant: The market rewards discipline more than prediction.",
    "Mad Quant: Bull runs are built during nobody-cares zones.",
  ];

  const input = {
    down: new Set(),
    pressed: new Set(),
  };

  let autoSimulating = true;
  let lastFrame = performance.now();
  let accumulator = 0;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function magnitude(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function normalize(x, y, fallbackX = 1, fallbackY = 0) {
    const m = magnitude(x, y);
    if (m <= 0.0001) {
      return { x: fallbackX, y: fallbackY };
    }
    return { x: x / m, y: y / m };
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

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function pickQuote(tick = 0) {
    const index = Math.floor(tick / 900) % QUANT_QUOTES.length;
    return QUANT_QUOTES[index];
  }

  function worldToScreenX(worldX) {
    return worldX - state.cameraX;
  }

  function keyDown(event) {
    const code = event.code;

    if (code === "ArrowUp" || code === "ArrowDown" || code === "ArrowLeft" || code === "ArrowRight" || code === "Space") {
      event.preventDefault();
    }

    if (!input.down.has(code)) {
      input.pressed.add(code);
    }

    input.down.add(code);
  }

  function keyUp(event) {
    input.down.delete(event.code);
  }

  function isDown(code) {
    return input.down.has(code);
  }

  function consumePress(code) {
    if (input.pressed.has(code)) {
      input.pressed.delete(code);
      return true;
    }
    return false;
  }

  function clearPressed() {
    input.pressed.clear();
  }

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    canvas.width = Math.floor(vw * VIEW.dpr);
    canvas.height = Math.floor(vh * VIEW.dpr);

    const scale = Math.min(vw / VIEW.width, vh / VIEW.height);
    VIEW.scale = scale;
    VIEW.offsetX = (vw - VIEW.width * scale) * 0.5;
    VIEW.offsetY = (vh - VIEW.height * scale) * 0.5;

    ctx.setTransform(VIEW.dpr, 0, 0, VIEW.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function createPlayer() {
    return {
      x: 120,
      y: 320,
      w: PLAYER_BASE_W,
      h: PLAYER_BASE_H,
      vx: 0,
      vy: 0,
      facing: 1,
      aimX: 1,
      aimY: 0,
      onGround: false,
      crouching: false,
      fireCooldown: 0,
      invuln: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      weapon: "pea",
      weaponTimer: 0,
      rapidTimer: 0,
      overclockTimer: 0,
      shield: 1,
      checkpointX: 120,
      vehicle: false,
      anim: 0,
      grapple: {
        active: false,
        anchorX: 0,
        anchorY: 0,
        length: 0,
        angle: 0,
        omega: 0,
        cooldown: 0,
      },
    };
  }

  function createState() {
    return {
      mode: "menu",
      pause: false,
      tick: 0,
      score: 0,
      lives: 8,
      levelIndex: 0,
      level: null,
      cameraX: 0,
      message: "",
      messageTimer: 0,
      intermissionTimer: 0,
      levelClearName: "",
      gameOverReason: "",
      quote: QUANT_QUOTES[0],
      bullets: [],
      enemyBullets: [],
      enemies: [],
      particles: [],
      powerDrops: [],
      player: createPlayer(),
      boss: null,
      winStats: {
        totalEnemies: 0,
        totalPowerups: 0,
      },
    };
  }

  let state = createState();

  function showMessage(text, seconds = 2.5) {
    state.message = text;
    state.messageTimer = Math.max(state.messageTimer, seconds);
  }

  function createLevel(index) {
    const seed = 0x9f4a + index * 777;
    const rng = mulberry32(seed);

    const common = {
      index,
      name: "",
      subtitle: "",
      length: 5200,
      baseGround: 430,
      waveAmp: 14,
      waveFreq: 0.006,
      haze: "#9bc4ff",
      skyTop: "#3b4d91",
      skyBottom: "#12142b",
      mountain: "#202d56",
      city: "#15203d",
      dust: "#f4e1ac",
      vehicleMode: false,
      shipMode: false,
      submarineMode: false,
      underwaterMode: false,
      grappleEnabled: false,
      pits: [],
      platforms: [],
      anchors: [],
      spawns: [],
      capsules: [],
      hazards: [],
      nextSpawn: 0,
      bossSpawnX: 0,
      bossType: "wall-core",
    };

    if (index === 0) {
      common.name = "Jungle Signal Run";
      common.subtitle = "Contra cadence with Mega timing";
      common.length = 5200;
      common.baseGround = 426;
      common.waveAmp = 18;
      common.waveFreq = 0.007;
      common.skyTop = "#446d76";
      common.skyBottom = "#0f1d26";
      common.mountain = "#27454d";
      common.city = "#152e34";
      common.dust = "#ddbb72";
      common.bossType = "wall-core";

      const pitTemplates = [];
      for (const [x, w] of pitTemplates) {
        common.pits.push({ x, w });
      }

      for (let x = 520; x < 4300; x += 480) {
        const y = 305 + Math.floor(rng() * 80);
        common.platforms.push({ x, y, w: 130, h: 16 });
      }

      let idx = 0;
      for (let x = 460; x < 4550; x += 235) {
        const lane = idx % 5;
        let type = "grunt";
        if (lane === 1 || lane === 3) type = "flyer";
        if (lane === 2) type = "turret";
        common.spawns.push({ x, type });
        idx += 1;
      }

      const powers = ["spread", "rapid", "shield", "laser", "overclock"];
      for (let i = 0; i < powers.length; i += 1) {
        common.capsules.push({
          x: 780 + i * 760,
          y: 210 + (i % 2) * 70,
          w: POWERUP_W,
          h: POWERUP_H,
          power: powers[i],
          phase: i * 0.95,
          taken: false,
        });
      }
    }

    if (index === 1) {
      common.name = "Moon Mine Convoy";
      common.subtitle = "Moon Patrol speed with Blaster hazards";
      common.length = 5650;
      common.baseGround = 442;
      common.waveAmp = 7;
      common.waveFreq = 0.013;
      common.skyTop = "#2d344f";
      common.skyBottom = "#090a14";
      common.mountain = "#4a546d";
      common.city = "#1c2233";
      common.dust = "#ebe6d2";
      common.vehicleMode = true;
      common.bossType = "lunar-howler";

      for (let x = 700; x < 4700; x += 320) {
        const width = 100 + Math.floor(rng() * 40);
        common.pits.push({ x, w: width });
      }

      for (let x = 620; x < 5000; x += 240) {
        common.hazards.push({ x, yOffset: 0, w: 34, h: 22, type: "mine", live: true });
      }

      let idx = 0;
      for (let x = 500; x < 5000; x += 175) {
        const lane = idx % 4;
        let type = "hopper";
        if (lane === 1) type = "flyer";
        if (lane === 2) type = "bomber";
        if (lane === 3) type = "turret";
        common.spawns.push({ x, type });
        idx += 1;
      }

      const powers = ["rapid", "spread", "shield", "laser", "overclock"];
      for (let i = 0; i < powers.length; i += 1) {
        common.capsules.push({
          x: 880 + i * 790,
          y: 180 + ((i + 1) % 2) * 54,
          w: POWERUP_W,
          h: POWERUP_H,
          power: powers[i],
          phase: 0.6 + i,
          taken: false,
        });
      }
    }

    if (index === 2) {
      common.name = "Skyhook Citadel";
      common.subtitle = "Bionic swing through the fiat fortress";
      common.length = 6200;
      common.baseGround = 423;
      common.waveAmp = 22;
      common.waveFreq = 0.008;
      common.skyTop = "#5b3d6f";
      common.skyBottom = "#0d1022";
      common.mountain = "#382346";
      common.city = "#21152d";
      common.dust = "#f0ba75";
      common.grappleEnabled = true;
      common.bossType = "fiat-titan";

      const pitTemplates = [
        [980, 220],
        [1600, 260],
        [2480, 240],
        [3340, 280],
        [4300, 260],
        [5120, 220],
      ];
      for (const [x, w] of pitTemplates) {
        common.pits.push({ x, w });
      }

      const anchorTemplates = [
        [1090, 128],
        [1760, 120],
        [2630, 124],
        [3490, 112],
        [4450, 118],
        [5220, 125],
      ];
      for (const [x, y] of anchorTemplates) {
        common.anchors.push({ x, y, r: 14 });
      }

      for (let x = 680; x < 5600; x += 430) {
        const y = 250 + Math.floor(rng() * 110);
        common.platforms.push({ x, y, w: 145, h: 16 });
      }

      let idx = 0;
      for (let x = 560; x < 5660; x += 155) {
        const lane = idx % 5;
        let type = "commando";
        if (lane === 0 || lane === 2) type = "flyer";
        if (lane === 1) type = "turret";
        if (lane === 3) type = "drone";
        common.spawns.push({ x, type });
        idx += 1;
      }

      const powers = ["shield", "spread", "laser", "rapid", "overclock", "shield"];
      for (let i = 0; i < powers.length; i += 1) {
        common.capsules.push({
          x: 900 + i * 850,
          y: 168 + (i % 3) * 56,
          w: POWERUP_W,
          h: POWERUP_H,
          power: powers[i],
          phase: i * 0.74,
          taken: false,
        });
      }
    }

    if (index === 3) {
      common.name = "Orbital R-Type Run";
      common.subtitle = "Biomech corridor assault";
      common.length = 6100;
      common.baseGround = 510;
      common.waveAmp = 6;
      common.waveFreq = 0.012;
      common.skyTop = "#0c1030";
      common.skyBottom = "#040711";
      common.mountain = "#13264a";
      common.city = "#0b1831";
      common.dust = "#7ab8ff";
      common.shipMode = true;
      common.bossType = "wall-core";

      let idx = 0;
      for (let x = 520; x < 5600; x += 165) {
        const lane = idx % 5;
        let type = "flyer";
        if (lane === 1 || lane === 3) type = "drone";
        if (lane === 4) type = "bomber";
        common.spawns.push({ x, type });
        idx += 1;
      }

      const powers = ["laser", "rapid", "spread", "shield", "overclock", "laser"];
      for (let i = 0; i < powers.length; i += 1) {
        common.capsules.push({
          x: 780 + i * 860,
          y: 150 + (i % 4) * 58,
          w: POWERUP_W,
          h: POWERUP_H,
          power: powers[i],
          phase: i * 0.62,
          taken: false,
        });
      }
    }

    if (index === 4) {
      common.name = "Abyssal Bitcoin Trench";
      common.subtitle = "Submarine convoy under pressure";
      common.length = 6200;
      common.baseGround = 475;
      common.waveAmp = 12;
      common.waveFreq = 0.01;
      common.skyTop = "#0f4861";
      common.skyBottom = "#032532";
      common.mountain = "#11586f";
      common.city = "#0a3d50";
      common.dust = "#82e2dc";
      common.submarineMode = true;
      common.underwaterMode = true;
      common.bossType = "lunar-howler";

      for (let x = 760; x < 5400; x += 420) {
        common.hazards.push({ x, yOffset: 0, w: 34, h: 22, type: "mine", live: true });
      }

      let idx = 0;
      for (let x = 520; x < 5700; x += 170) {
        const lane = idx % 5;
        let type = "drone";
        if (lane === 1 || lane === 3) type = "flyer";
        if (lane === 2) type = "bomber";
        if (lane === 4) type = "turret";
        common.spawns.push({ x, type });
        idx += 1;
      }

      const powers = ["shield", "rapid", "spread", "laser", "overclock", "shield"];
      for (let i = 0; i < powers.length; i += 1) {
        common.capsules.push({
          x: 860 + i * 840,
          y: 180 + (i % 3) * 64,
          w: POWERUP_W,
          h: POWERUP_H,
          power: powers[i],
          phase: i * 0.71,
          taken: false,
        });
      }
    }

    common.spawns.sort((a, b) => a.x - b.x);
    common.bossSpawnX = common.length - 740;

    return common;
  }

  function startGame() {
    state = createState();
    state.mode = "playing";
    state.levelIndex = 0;
    loadLevel(0);
    showMessage("Mad Patrol 3 - Broadcast begins", 2.2);
  }

  function loadLevel(index) {
    const level = createLevel(index);
    state.level = level;
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.powerDrops = [];
    state.particles = [];
    state.boss = null;
    state.cameraX = 0;
    state.intermissionTimer = 0;
    state.levelClearName = "";
    state.quote = pickQuote(state.tick + index * 400);

    const player = state.player;
    const spawnX = 120;
    player.w = PLAYER_BASE_W;
    player.h = PLAYER_BASE_H;
    player.crouching = false;
    player.x = spawnX;
    const spawnGround = groundAt(level, spawnX) ?? level.baseGround;
    if (level.shipMode) {
      player.y = VIEW.height * 0.45;
    } else if (level.submarineMode) {
      player.y = VIEW.height * 0.58;
    } else {
      player.y = spawnGround - player.h;
    }
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.facing = 1;
    player.aimX = 1;
    player.aimY = 0;
    player.checkpointX = spawnX;
    player.vehicle = level.vehicleMode;
    player.grapple.active = false;
    player.hp = player.maxHp;
    player.shield = Math.max(player.shield, 1);

    showMessage(`Level ${index + 1}: ${level.name}`, 3);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (canvas.requestFullscreen) {
        canvas.requestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function inPit(level, x) {
    for (const pit of level.pits) {
      if (x >= pit.x && x <= pit.x + pit.w) {
        return true;
      }
    }
    return false;
  }

  function groundAt(level, x) {
    if (x < 0 || x > level.length) {
      return level.baseGround;
    }

    if (inPit(level, x)) {
      return null;
    }

    const undulate = Math.sin(x * level.waveFreq) * level.waveAmp;
    const detail = Math.sin(x * level.waveFreq * 2.7 + level.index * 1.7) * (level.waveAmp * 0.35);
    return level.baseGround + undulate + detail;
  }

  function highestPlatformCollision(level, prevBottom, nextBottom, left, right) {
    let best = null;
    for (const p of level.platforms) {
      if (right < p.x + 8 || left > p.x + p.w - 8) {
        continue;
      }
      if (prevBottom <= p.y && nextBottom >= p.y) {
        if (!best || p.y < best.y) {
          best = p;
        }
      }
    }
    return best;
  }

  function canStandUp(level, player) {
    const bottom = player.y + player.h;
    const test = {
      x: player.x + 5,
      y: bottom - PLAYER_BASE_H,
      w: Math.max(6, player.w - 10),
      h: PLAYER_BASE_H,
    };

    for (const p of level.platforms) {
      if (overlaps(test, p)) {
        return false;
      }
    }
    return true;
  }

  function setPlayerCrouch(wantCrouch) {
    const player = state.player;
    const level = state.level;

    let crouch = Boolean(wantCrouch);
    if (player.vehicle || level.shipMode || level.submarineMode || player.grapple.active || !player.onGround) {
      crouch = false;
    }

    if (!crouch && player.crouching && !canStandUp(level, player)) {
      crouch = true;
    }

    const targetH = crouch ? PLAYER_CROUCH_H : PLAYER_BASE_H;
    if (player.h !== targetH) {
      const bottom = player.y + player.h;
      player.h = targetH;
      player.y = bottom - targetH;
    }

    player.crouching = crouch;
  }

  function spawnEnemy(type, x) {
    const level = state.level;
    const yGround = groundAt(level, x) ?? (level.baseGround + 40);
    const sz = (value) => Math.round(value * SPRITE_SCALE);

    const base = {
      type,
      x,
      y: yGround - sz(38),
      w: sz(36),
      h: sz(36),
      vx: -40,
      vy: 0,
      hp: 1,
      cooldown: 0.7,
      phase: (x * 0.017) % (Math.PI * 2),
      onGround: false,
      value: 100,
      variant: Math.floor(((x * 0.041) % 1 + 1) * 1000) % 3,
    };

    if (type === "grunt") {
      base.hp = 1;
      base.value = 120;
      base.vx = -80;
      base.cooldown = 1.2;
    }

    if (type === "turret") {
      base.w = sz(34);
      base.h = sz(44);
      base.hp = 2;
      base.value = 150;
      base.vx = 0;
      base.cooldown = 0.85;
      base.y = yGround - base.h;
    }

    if (type === "flyer") {
      base.w = sz(36);
      base.h = sz(30);
      base.hp = 1;
      base.value = 130;
      base.vx = -140;
      base.cooldown = 1.4;
      base.y = yGround - sz(175) - Math.sin(x * 0.08) * sz(36);
    }

    if (type === "hopper") {
      base.w = sz(35);
      base.h = sz(36);
      base.hp = 1;
      base.value = 140;
      base.vx = -100;
      base.cooldown = 1;
      base.jumpCooldown = 0.9;
      base.y = yGround - base.h;
    }

    if (type === "bomber") {
      base.w = sz(44);
      base.h = sz(34);
      base.hp = 1;
      base.value = 150;
      base.vx = -160;
      base.cooldown = 1.1;
      base.y = yGround - sz(220) - Math.cos(x * 0.04) * sz(48);
    }

    if (type === "commando") {
      base.w = sz(40);
      base.h = sz(52);
      base.hp = 2;
      base.value = 180;
      base.vx = -85;
      base.cooldown = 0.72;
      base.jumpCooldown = 1.4;
      base.y = yGround - base.h;
    }

    if (type === "drone") {
      base.w = sz(44);
      base.h = sz(32);
      base.hp = 2;
      base.value = 200;
      base.vx = -110;
      base.cooldown = 0.9;
      base.y = yGround - sz(250);
    }

    state.enemies.push(base);
    state.winStats.totalEnemies += 1;
  }

  function spawnPendingEnemies() {
    const level = state.level;
    while (level.nextSpawn < level.spawns.length) {
      const spawn = level.spawns[level.nextSpawn];
      if (spawn.x > state.cameraX + VIEW.width + 120) {
        break;
      }
      spawnEnemy(spawn.type, spawn.x);
      level.nextSpawn += 1;
    }
  }

  function spawnBoss() {
    if (state.boss) {
      return;
    }

    const level = state.level;
    const arenaStart = level.length - 930;
    const arenaEnd = level.length - 40;

    if (level.bossType === "wall-core") {
      state.boss = {
        type: "wall-core",
        name: "Wall Core Omega",
        x: level.length - 260,
        y: 130,
        w: 240,
        h: 300,
        hp: 10,
        maxHp: 10,
        timer: 0,
        shotCooldown: 2.2,
        summonCooldown: 8.5,
        coreOpen: false,
        defeated: false,
        defeatTimer: 2.6,
        arenaStart,
        arenaEnd,
      };
    } else if (level.bossType === "lunar-howler") {
      state.boss = {
        type: "lunar-howler",
        name: "Lunar Howler MK-II",
        x: level.length - 390,
        y: 262,
        w: 285,
        h: 160,
        hp: 14,
        maxHp: 14,
        timer: 0,
        vx: -30,
        shotCooldown: 2,
        mineCooldown: 4.6,
        defeated: false,
        defeatTimer: 2.8,
        arenaStart,
        arenaEnd,
      };
    } else {
      state.boss = {
        type: "fiat-titan",
        name: "Fiat Titan",
        x: level.length - 300,
        y: 90,
        w: 280,
        h: 340,
        hp: 18,
        maxHp: 18,
        timer: 0,
        shotCooldown: 2.1,
        waveCooldown: 6.2,
        coreOpen: false,
        defeated: false,
        defeatTimer: 3.1,
        arenaStart,
        arenaEnd,
      };
    }

    showMessage(`Boss: ${state.boss.name}`, 2.6);
    state.player.checkpointX = clamp(arenaStart + 50, 140, level.length - 900);
  }

  function enemyShoot(enemy, targetX, targetY, speed = 300, damage = 1) {
    const sourceX = enemy.x + enemy.w * 0.5;
    const sourceY = enemy.y + enemy.h * 0.45;
    const dir = normalize(targetX - sourceX, targetY - sourceY, -1, 0);
    state.enemyBullets.push({
      x: sourceX,
      y: sourceY,
      vx: dir.x * speed * ENEMY_PROJECTILE_SPEED_MULTIPLIER,
      vy: dir.y * speed * ENEMY_PROJECTILE_SPEED_MULTIPLIER,
      r: 5,
      damage,
      ttl: 4,
      color: "#ff8a62",
    });
  }

  function bossShootAngle(x, y, angle, speed, damage, options = {}) {
    const chunk = options.shape === "bank_chunk";
    state.enemyBullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed * ENEMY_PROJECTILE_SPEED_MULTIPLIER,
      vy: Math.sin(angle) * speed * ENEMY_PROJECTILE_SPEED_MULTIPLIER,
      r: options.radius ?? (chunk ? 9 : 6),
      damage,
      ttl: 5,
      color: options.color ?? (chunk ? "#aab3c7" : "#ff594f"),
      shape: options.shape ?? "orb",
      spin: options.spin ?? ((Math.random() - 0.5) * 0.34),
    });
  }

  function spawnExplosion(x, y, count = 10, color = "#ffc061") {
    for (let i = 0; i < count; i += 1) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 50 + Math.random() * 180;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        ttl: 0.45 + Math.random() * 0.5,
        maxTtl: 0.8,
        color,
      });
    }
  }

  function applyPowerup(power) {
    const player = state.player;
    state.winStats.totalPowerups += 1;

    if (power === "spread") {
      player.weapon = "spread";
      player.weaponTimer = 22;
      showMessage("Spread coins online", 1.5);
      return;
    }

    if (power === "laser") {
      player.weapon = "laser";
      player.weaponTimer = 18;
      showMessage("Laser uplink active", 1.5);
      return;
    }

    if (power === "rapid") {
      player.rapidTimer = Math.max(player.rapidTimer, 16);
      showMessage("Rapid fire boosted", 1.2);
      return;
    }

    if (power === "shield") {
      player.shield = Math.min(2, player.shield + 1);
      showMessage("Shield node deployed", 1.3);
      return;
    }

    if (power === "overclock") {
      player.weapon = "spread";
      player.weaponTimer = Math.max(player.weaponTimer, 12);
      player.rapidTimer = Math.max(player.rapidTimer, 12);
      player.overclockTimer = Math.max(player.overclockTimer, 12);
      showMessage("Overclock mode", 1.4);
    }
  }

  function maybeDropPower(enemy) {
    const chance = 0.12;
    if (Math.random() > chance) {
      return;
    }

    const options = ["rapid", "shield", "spread", "laser"];
    const power = options[Math.floor(Math.random() * options.length)];
    state.powerDrops.push({
      x: enemy.x + enemy.w * 0.5,
      y: enemy.y + enemy.h * 0.45,
      vx: (Math.random() - 0.5) * 40,
      vy: -90,
      w: POWERDROP_W,
      h: POWERDROP_H,
      power,
      ttl: 12,
    });
  }

  function firePlayerWeapon() {
    const player = state.player;
    const rapidBoost = player.rapidTimer > 0 ? 0.45 : 1;

    let cooldown = 0.27 * rapidBoost;
    if (player.weapon === "spread") cooldown = 0.36 * rapidBoost;
    if (player.weapon === "laser") cooldown = 0.42 * rapidBoost;

    if (player.overclockTimer > 0) cooldown *= 0.75;

    if (player.fireCooldown > 0) {
      return;
    }

    const sourceX = player.x + player.w * 0.5 + player.facing * 10;
    const sourceY = player.y + player.h * 0.38;
    const aim = normalize(player.aimX, player.aimY, player.facing, 0);

    const damageMul = player.overclockTimer > 0 ? 1.4 : 1;

    function addBullet(directionX, directionY, speed, damage, options = {}) {
      state.bullets.push({
        x: sourceX,
        y: sourceY,
        vx: directionX * speed,
        vy: directionY * speed,
        r: options.radius ?? 4,
        ttl: options.ttl ?? 1.9,
        damage: damage * damageMul,
        pierce: options.pierce ?? 0,
        color: options.color ?? "#ffd86d",
      });
    }

    if (player.weapon === "pea") {
      addBullet(aim.x, aim.y, 560, 1.2);
    }

    if (player.weapon === "spread") {
      const base = Math.atan2(aim.y, aim.x);
      for (const deg of [-26, -13, 0, 13, 26]) {
        const a = base + (deg * Math.PI) / 180;
        addBullet(Math.cos(a), Math.sin(a), 540, 0.85, { radius: 4 });
      }
    }

    if (player.weapon === "laser") {
      addBullet(aim.x, aim.y, 820, 2.9, {
        radius: 5,
        ttl: 1.3,
        pierce: 2,
        color: "#7ae8ff",
      });
    }

    player.fireCooldown = cooldown;
  }

  function damagePlayer(reason = "Enemy fire", damage = 1) {
    const player = state.player;
    if (player.invuln > 0 || state.mode !== "playing") {
      return;
    }

    if (player.shield > 0) {
      player.shield -= 1;
      player.invuln = 1.1;
      showMessage("Shield absorbed impact", 1.1);
      return;
    }

    player.hp = Math.max(0, player.hp - damage);
    player.invuln = 0.95;
    spawnExplosion(player.x + player.w * 0.5, player.y + player.h * 0.5, 10, "#ff9d78");

    if (player.hp > 0) {
      return;
    }

    state.lives -= 1;
    spawnExplosion(player.x + player.w * 0.5, player.y + player.h * 0.5, 24, "#ff6c56");

    if (state.lives <= 0) {
      state.mode = "gameover";
      state.gameOverReason = reason;
      return;
    }

    respawnPlayer();
  }

  function respawnPlayer() {
    const level = state.level;
    const player = state.player;
    const x = clamp(player.checkpointX, 80, level.length - 900);
    const ground = groundAt(level, x) ?? level.baseGround;

    player.x = x;
    if (level.shipMode) {
      player.y = VIEW.height * 0.45;
    } else if (level.submarineMode) {
      player.y = VIEW.height * 0.58;
    } else {
      player.y = ground - player.h;
    }
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.grapple.active = false;
    player.hp = player.maxHp;
    player.invuln = 2;
    player.shield = Math.max(player.shield, 1);
    state.enemyBullets = [];
    showMessage("Respawned at checkpoint", 1.3);
  }

  function updatePlayerAimAndInput(dt) {
    const player = state.player;
    const level = state.level;

    const moveLeft = isDown("ArrowLeft") ? 1 : 0;
    const moveRight = isDown("ArrowRight") ? 1 : 0;
    const moveInput = moveRight - moveLeft;

    const upPressed = isDown("ArrowUp");
    const downPressed = isDown("ArrowDown");
    const flightMode = level.shipMode || level.submarineMode;
    setPlayerCrouch(!flightMode && downPressed && !upPressed && moveInput === 0);

    if (flightMode) {
      const verticalInput = (downPressed ? 1 : 0) - (upPressed ? 1 : 0);
      const cruiseX = level.shipMode ? 170 : 140;
      const driftX = level.shipMode ? 105 : 85;
      const driftY = level.shipMode ? 210 : 165;

      const targetVx = cruiseX + moveInput * driftX;
      const targetVy = verticalInput * driftY;
      player.vx += (targetVx - player.vx) * Math.min(1, dt * 6);
      player.vy += (targetVy - player.vy) * Math.min(1, dt * 6);

      if (level.shipMode) {
        // R-Type style: straight forward cannon only.
        player.facing = 1;
        player.aimX = 1;
        player.aimY = 0;
      } else {
        if (moveInput !== 0) {
          player.facing = Math.sign(moveInput);
        }
        const aim = normalize(player.facing || 1, verticalInput, player.facing || 1, 0);
        player.aimX = aim.x;
        player.aimY = aim.y;
      }

      firePlayerWeapon();
      return;
    }

    let move = moveInput;
    if (player.crouching) {
      move *= 0.42;
      if (moveInput !== 0) {
        player.facing = Math.sign(moveInput);
      }
    } else if (moveInput !== 0) {
      player.facing = Math.sign(moveInput);
    }

    let aimX = player.facing;
    let aimY = 0;

    if (level.vehicleMode) {
      // Moon Patrol style: choose sky gun (UP) or straight gun (forward/backward).
      if (upPressed) {
        aimX = 0;
        aimY = -1;
      } else if (moveInput !== 0) {
        aimX = Math.sign(moveInput);
        aimY = 0;
      } else {
        aimX = player.facing;
        aimY = 0;
      }
    } else if (player.crouching) {
      aimX = moveInput !== 0 ? Math.sign(moveInput) : player.facing;
      aimY = 0;
    } else if (upPressed && moveInput !== 0) {
      // Allow explicit forward/backward diagonal shots.
      aimX = Math.sign(moveInput);
      aimY = -1;
    } else if (upPressed) {
      // Contra-style straight up shot.
      aimX = 0;
      aimY = -1;
    } else if (downPressed && moveInput !== 0) {
      aimX = Math.sign(moveInput);
      aimY = 1;
    } else if (!player.onGround && downPressed) {
      aimX = 0;
      aimY = 1;
    } else if (moveInput !== 0) {
      aimX = Math.sign(moveInput);
      aimY = 0;
    }

    const aim = normalize(aimX, aimY, player.facing, 0);
    player.aimX = aim.x;
    player.aimY = aim.y;

    if (consumePress("KeyG") && level.grappleEnabled && !player.vehicle && player.grapple.cooldown <= 0) {
      if (player.grapple.active) {
        releaseGrapple();
      } else {
        tryStartGrapple();
      }
    }

    const jumpPressed = consumePress("Space");

    if (jumpPressed) {
      if (player.grapple.active) {
        releaseGrapple();
      } else if (player.onGround) {
        setPlayerCrouch(false);
        player.vy = player.vehicle ? -680 : -560;
        player.onGround = false;
      }
    }

    firePlayerWeapon();

    if (player.grapple.active) {
      updateGrapple(dt, move);
      return;
    }

    if (player.vehicle) {
      const target = 210 + move * 90;
      player.vx += (target - player.vx) * Math.min(1, dt * 5.2);
    } else {
      const target = move * 250;
      player.vx += (target - player.vx) * Math.min(1, dt * 14);
      if (move === 0) {
        player.vx *= 0.82;
      }
    }
  }

  function tryStartGrapple() {
    const player = state.player;
    const level = state.level;
    const originX = player.x + player.w * 0.5;
    const originY = player.y + 8;

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const anchor of level.anchors) {
      const dx = anchor.x - originX;
      const dy = anchor.y - originY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 340) {
        continue;
      }
      if (dy > 24) {
        continue;
      }
      const score = dist + Math.abs(dx) * 0.16;
      if (score < bestScore) {
        bestScore = score;
        best = anchor;
      }
    }

    if (!best) {
      return;
    }

    const dx = originX - best.x;
    const dy = originY - best.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    player.grapple.active = true;
    player.grapple.anchorX = best.x;
    player.grapple.anchorY = best.y;
    player.grapple.length = clamp(length, 60, 320);
    player.grapple.angle = Math.atan2(dx, dy);
    player.grapple.omega = 0;

    const tangent = player.vx / Math.max(40, player.grapple.length);
    player.grapple.omega += tangent * 0.45;
    showMessage("Grapple attached", 0.8);
  }

  function releaseGrapple() {
    const g = state.player.grapple;
    if (!g.active) {
      return;
    }

    const player = state.player;
    const vx = g.omega * g.length * Math.cos(g.angle);
    const vy = -g.omega * g.length * Math.sin(g.angle);

    player.vx = vx;
    player.vy = vy;
    g.active = false;
    g.cooldown = 0.15;
  }

  function updateGrapple(dt, move) {
    const player = state.player;
    const g = player.grapple;

    const gravityTorque = -(GRAVITY / Math.max(80, g.length)) * Math.sin(g.angle);
    const inputTorque = move * 3.2;
    g.omega += (gravityTorque + inputTorque) * dt;
    g.omega *= 0.995;
    g.angle += g.omega * dt;

    const x = g.anchorX + Math.sin(g.angle) * g.length;
    const y = g.anchorY + Math.cos(g.angle) * g.length;

    player.x = x - player.w * 0.5;
    player.y = y - 8;
    player.vx = g.omega * g.length * Math.cos(g.angle);
    player.vy = -g.omega * g.length * Math.sin(g.angle);
    player.onGround = false;
  }

  function updatePlayerPhysics(dt) {
    const player = state.player;
    const level = state.level;

    player.anim += dt;

    if (player.grapple.cooldown > 0) {
      player.grapple.cooldown = Math.max(0, player.grapple.cooldown - dt);
    }

    if (player.invuln > 0) {
      player.invuln = Math.max(0, player.invuln - dt);
    }

    if (player.weaponTimer > 0) {
      player.weaponTimer = Math.max(0, player.weaponTimer - dt);
      if (player.weaponTimer <= 0) {
        player.weapon = "pea";
      }
    }

    if (player.rapidTimer > 0) {
      player.rapidTimer = Math.max(0, player.rapidTimer - dt);
    }

    if (player.overclockTimer > 0) {
      player.overclockTimer = Math.max(0, player.overclockTimer - dt);
    }

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);

    if (!player.grapple.active && (level.shipMode || level.submarineMode)) {
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.onGround = false;

      const topBound = level.shipMode ? 56 : 80;
      const bottomBound = VIEW.height - player.h - (level.shipMode ? 52 : 44);
      if (player.y < topBound) {
        player.y = topBound;
        player.vy = Math.max(player.vy, 0);
      }
      if (player.y > bottomBound) {
        player.y = bottomBound;
        player.vy = Math.min(player.vy, 0);
      }
    } else if (!player.grapple.active) {
      player.vy += GRAVITY * dt;
      player.vy = Math.min(player.vy, 1040);

      const prevBottom = player.y + player.h;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.onGround = false;

      const centerX = player.x + player.w * 0.5;
      const ground = groundAt(level, centerX);

      const platformHit = highestPlatformCollision(
        level,
        prevBottom,
        player.y + player.h,
        player.x + 4,
        player.x + player.w - 4
      );

      if (platformHit && player.vy >= 0) {
        player.y = platformHit.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }

      if (!player.onGround && ground !== null && player.y + player.h >= ground && player.vy >= 0) {
        player.y = ground - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    if (player.x < 10) {
      player.x = 10;
      player.vx = Math.max(player.vx, 0);
    }

    if (player.x > level.length - player.w - 10) {
      player.x = level.length - player.w - 10;
      player.vx = Math.min(player.vx, 0);
    }

    if (player.y > VIEW.height + 220) {
      damagePlayer("Fell into hazard");
      return;
    }

    const checkpointStride = 820;
    const cp = Math.floor(player.x / checkpointStride) * checkpointStride + 120;
    if (cp > player.checkpointX) {
      player.checkpointX = cp;
    }
  }

  function updateBullets(dt) {
    const level = state.level;

    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.ttl -= dt;

      if (b.ttl <= 0 || b.x < state.cameraX - 120 || b.x > state.cameraX + VIEW.width + 220 || b.y < -80 || b.y > VIEW.height + 90) {
        state.bullets.splice(i, 1);
        continue;
      }

      const ground = groundAt(level, b.x);
      if (ground !== null && b.y >= ground) {
        state.bullets.splice(i, 1);
        continue;
      }

      let consumed = false;

      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const e = state.enemies[j];
        if (pointInRect(b.x, b.y, e)) {
          e.hp -= b.damage;
          spawnExplosion(b.x, b.y, 4, "#ffd978");
          if (e.hp <= 0) {
            state.score += e.value;
            maybeDropPower(e);
            spawnExplosion(e.x + e.w * 0.5, e.y + e.h * 0.5, 10, "#ffb85a");
            state.enemies.splice(j, 1);
          }

          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            consumed = true;
          }
          break;
        }
      }

      if (consumed) {
        state.bullets.splice(i, 1);
        continue;
      }

      for (const cap of level.capsules) {
        if (cap.taken) continue;
        if (pointInRect(b.x, b.y, { x: cap.x, y: cap.y, w: cap.w, h: cap.h })) {
          cap.taken = true;
          state.powerDrops.push({
            x: cap.x + cap.w * 0.5,
            y: cap.y,
            vx: 0,
            vy: -70,
            w: POWERDROP_W,
            h: POWERDROP_H,
            power: cap.power,
            ttl: 14,
          });
          state.bullets.splice(i, 1);
          consumed = true;
          showMessage(`Capsule opened: ${cap.power.toUpperCase()}`, 1.2);
          break;
        }
      }

      if (consumed) {
        continue;
      }

      if (state.boss && !state.boss.defeated) {
        const bossRect = {
          x: state.boss.x,
          y: state.boss.y,
          w: state.boss.w,
          h: state.boss.h,
        };

        if (pointInRect(b.x, b.y, bossRect)) {
          let canDamage = true;
          if (state.boss.type === "wall-core") {
            const weakLeft = state.boss.x + state.boss.w * 0.33;
            const weakRight = state.boss.x + state.boss.w * 0.67;
            const weakTop = state.boss.y + state.boss.h * 0.56;
            const weakBottom = state.boss.y + state.boss.h * 0.86;
            const weakSpotHit = b.x > weakLeft && b.x < weakRight && b.y > weakTop && b.y < weakBottom;
            canDamage = weakSpotHit || state.boss.coreOpen;
          }
          if (state.boss.type === "fiat-titan") {
            canDamage = true;
          }

          if (canDamage) {
            state.boss.hp -= b.damage * BOSS_DAMAGE_MULTIPLIER;
            spawnExplosion(b.x, b.y, 5, "#ffe08c");
          }

          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            state.bullets.splice(i, 1);
          }

          if (state.boss.hp <= 0) {
            state.boss.hp = 0;
            state.boss.defeated = true;
            state.score += 2200;
            showMessage(`${state.boss.name} down`, 2.2);
            spawnExplosion(state.boss.x + state.boss.w * 0.5, state.boss.y + state.boss.h * 0.5, 26, "#ffb36b");
          }
        }
      }
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = state.enemyBullets[i];
      if (!b) {
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.ttl -= dt;

      if (b.ttl <= 0 || b.x < state.cameraX - 120 || b.x > state.cameraX + VIEW.width + 140 || b.y < -80 || b.y > VIEW.height + 120) {
        state.enemyBullets.splice(i, 1);
        continue;
      }

      const ground = groundAt(level, b.x);
      if (ground !== null && b.y >= ground) {
        state.enemyBullets.splice(i, 1);
        continue;
      }

      const player = state.player;
      const hitbox = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (pointInRect(b.x, b.y, hitbox)) {
        state.enemyBullets.splice(i, 1);
        damagePlayer("Hit by enemy fire", b.damage ?? 1);
      }
    }
  }

  function updateEnemies(dt) {
    const level = state.level;
    const player = state.player;

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      e.cooldown -= dt;

      if (e.type === "grunt") {
        const dir = Math.sign(player.x - e.x);
        e.vx += (dir * 90 - e.vx) * Math.min(1, dt * 4.6);
        e.vy += GRAVITY * dt;
      }

      if (e.type === "turret") {
        e.vx = 0;
        e.vy = 0;
      }

      if (e.type === "flyer") {
        e.x += e.vx * dt;
        e.y += Math.sin(state.tick * 0.09 + e.phase) * 42 * dt;
      }

      if (e.type === "hopper") {
        e.vy += GRAVITY * dt;
        e.jumpCooldown -= dt;
        if (e.onGround && e.jumpCooldown <= 0) {
          e.vy = -500;
          e.jumpCooldown = 1 + Math.random() * 0.7;
          e.onGround = false;
        }
      }

      if (e.type === "bomber") {
        e.x += e.vx * dt;
        e.y += Math.sin(state.tick * 0.07 + e.phase) * 50 * dt;
      }

      if (e.type === "commando") {
        const dir = Math.sign(player.x - e.x);
        e.vx += (dir * 110 - e.vx) * Math.min(1, dt * 5.5);
        e.vy += GRAVITY * dt;
        e.jumpCooldown -= dt;
        if (e.onGround && e.jumpCooldown <= 0 && Math.abs(player.x - e.x) > 80) {
          e.vy = -540;
          e.jumpCooldown = 1.3;
          e.onGround = false;
        }
      }

      if (e.type === "drone") {
        e.vx += (-60 - e.vx) * Math.min(1, dt * 2);
        e.x += e.vx * dt;
        e.y += Math.sin(state.tick * 0.11 + e.phase) * 62 * dt;
      }

      if (e.type !== "flyer" && e.type !== "bomber" && e.type !== "drone") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        const centerX = e.x + e.w * 0.5;
        const ground = groundAt(level, centerX);

        if (ground !== null && e.y + e.h >= ground) {
          e.y = ground - e.h;
          e.vy = 0;
          e.onGround = true;
        } else {
          e.onGround = false;
        }
      }

      const inRange = Math.abs(player.x - e.x) < 500;
      if (inRange && e.cooldown <= 0) {
        if (e.type === "turret") {
          enemyShoot(e, player.x + player.w * 0.5, player.y + player.h * 0.5, 320, 1);
          e.cooldown = 0.95;
        } else if (e.type === "bomber") {
          bossShootAngle(e.x + e.w * 0.5, e.y + e.h, Math.PI * 0.5 + (Math.random() - 0.5) * 0.2, 220, 1);
          e.cooldown = 1.2;
        } else {
          enemyShoot(e, player.x + player.w * 0.5, player.y + player.h * 0.5, 300, 1);
          e.cooldown = e.type === "commando" ? 0.65 : 1.25;
        }
      }

      if (
        e.x < state.cameraX - 220 ||
        e.x > state.cameraX + VIEW.width + 260 ||
        e.y > VIEW.height + 260
      ) {
        state.enemies.splice(i, 1);
        continue;
      }

      if (overlaps(e, player)) {
        damagePlayer("Collided with enemy");
      }
    }
  }

  function updateBoss(dt) {
    const boss = state.boss;
    const player = state.player;
    const level = state.level;
    if (!boss) {
      return;
    }

    if (boss.defeated) {
      boss.defeatTimer -= dt;
      if (Math.random() < 0.35) {
        const rx = boss.x + Math.random() * boss.w;
        const ry = boss.y + Math.random() * boss.h;
        spawnExplosion(rx, ry, 4, "#ff8f68");
      }
      if (boss.defeatTimer <= 0) {
        state.mode = "intermission";
        state.intermissionTimer = 3.4;
        state.levelClearName = level.name;
      }
      return;
    }

    boss.timer += dt;

    if (boss.type === "wall-core") {
      boss.coreOpen = Math.floor(boss.timer * 0.65) % 4 !== 0;
      boss.shotCooldown -= dt;
      boss.summonCooldown -= dt;

      if (boss.shotCooldown <= 0) {
        const leftX = boss.x + boss.w * 0.12;
        const rightX = boss.x + boss.w * 0.88;
        const yA = boss.y + boss.h * 0.23;
        const yB = boss.y + boss.h * 0.76;
        const targetX = player.x + player.w * 0.5;
        const targetY = player.y + player.h * 0.5;
        const a1 = Math.atan2(targetY - yA, targetX - leftX);
        const a2 = Math.atan2(targetY - yB, targetX - rightX);
        bossShootAngle(leftX, yA, a1, 220, BOSS_PROJECTILE_DAMAGE, { shape: "bank_chunk", radius: 10, color: "#b8c1d4" });
        bossShootAngle(rightX, yB, a2, 220, BOSS_PROJECTILE_DAMAGE, { shape: "bank_chunk", radius: 10, color: "#b8c1d4" });
        boss.shotCooldown = 2.1;
      }

      if (boss.summonCooldown <= 0) {
        spawnEnemy("flyer", boss.x - 70);
        boss.summonCooldown = 8;
      }
    }

    if (boss.type === "lunar-howler") {
      boss.x += boss.vx * dt;
      const minX = boss.arenaStart + 80;
      const maxX = boss.arenaEnd - boss.w - 20;
      if (boss.x < minX || boss.x > maxX) {
        boss.vx *= -1;
      }

      boss.y = 304 + Math.sin(boss.timer * 1.9) * 16;
      boss.shotCooldown -= dt;
      boss.mineCooldown -= dt;

      if (boss.shotCooldown <= 0) {
        const sourceX = boss.x + boss.w * 0.22;
        const sourceY = boss.y + boss.h * 0.38;
        const targetX = player.x + player.w * 0.5;
        const targetY = player.y + player.h * 0.5;
        const base = Math.atan2(targetY - sourceY, targetX - sourceX);
        bossShootAngle(sourceX, sourceY, base, 250, BOSS_PROJECTILE_DAMAGE, { shape: "bank_chunk", radius: 9, color: "#a9b4ca" });
        boss.shotCooldown = 1.95;
      }

      if (boss.mineCooldown <= 0) {
        bossShootAngle(boss.x + boss.w * 0.28, boss.y + boss.h * 0.52, Math.PI * 0.78, 190, BOSS_PROJECTILE_DAMAGE, { shape: "bank_chunk", radius: 9, color: "#9da8be" });
        boss.mineCooldown = 4.2;
      }
    }

    if (boss.type === "fiat-titan") {
      boss.coreOpen = Math.floor(boss.timer * 1.1) % 3 !== 0;
      boss.shotCooldown -= dt;
      boss.waveCooldown -= dt;
      boss.y = 170 + Math.sin(boss.timer * 1.25) * 24;

      if (boss.shotCooldown <= 0) {
        const sourceX = boss.x + boss.w * 0.5;
        const sourceY = boss.y + boss.h * 0.37;
        const base = Math.atan2(player.y + player.h * 0.5 - sourceY, player.x + player.w * 0.5 - sourceX);
        for (const spread of [-0.1, 0.1]) {
          bossShootAngle(sourceX, sourceY, base + spread, 260, BOSS_PROJECTILE_DAMAGE, { shape: "bank_chunk", radius: 10, color: "#b5bfd3" });
        }
        boss.shotCooldown = 1.95;
      }

      if (boss.waveCooldown <= 0) {
        for (let i = 0; i < 4; i += 1) {
          const angle = (Math.PI * 2 * i) / 4;
          bossShootAngle(boss.x + boss.w * 0.5, boss.y + boss.h * 0.44, angle, 175, BOSS_PROJECTILE_DAMAGE, { shape: "bank_chunk", radius: 10, color: "#c3cada" });
        }
        spawnEnemy("flyer", boss.x - 40);
        boss.waveCooldown = 6;
      }
    }

    if (overlaps(boss, player)) {
      damagePlayer("Collided with boss");
    }
  }

  function updateCapsulesAndDrops(dt) {
    const level = state.level;
    const player = state.player;

    for (const cap of level.capsules) {
      if (cap.taken) continue;
      cap.y += Math.sin(state.tick * 0.04 + cap.phase) * 0.55;

      const rect = { x: cap.x, y: cap.y, w: cap.w, h: cap.h };
      if (overlaps(rect, player)) {
        cap.taken = true;
        applyPowerup(cap.power);
        state.score += 120;
      }
    }

    for (let i = state.powerDrops.length - 1; i >= 0; i -= 1) {
      const p = state.powerDrops[i];
      p.ttl -= dt;
      p.vy += 360 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const ground = groundAt(level, p.x + p.w * 0.5);
      if (ground !== null && p.y + p.h >= ground) {
        p.y = ground - p.h;
        p.vy *= -0.2;
      }

      if (p.ttl <= 0) {
        state.powerDrops.splice(i, 1);
        continue;
      }

      if (overlaps(p, player)) {
        applyPowerup(p.power);
        state.score += 200;
        state.powerDrops.splice(i, 1);
      }
    }
  }

  function updateHazards() {
    const level = state.level;
    if (!level.hazards.length) {
      return;
    }

    const player = state.player;
    for (const hz of level.hazards) {
      if (!hz.live) continue;
      const ground = groundAt(level, hz.x + hz.w * 0.5);
      if (ground === null) continue;
      const rect = { x: hz.x, y: ground - hz.h, w: hz.w, h: hz.h };
      if (overlaps(rect, player)) {
        damagePlayer("Hit a mine");
      }

      for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
        const b = state.bullets[i];
        if (pointInRect(b.x, b.y, rect)) {
          hz.live = false;
          state.bullets.splice(i, 1);
          state.score += 80;
          spawnExplosion(rect.x + rect.w * 0.5, rect.y + rect.h * 0.5, 8, "#ffcb75");
          break;
        }
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.ttl -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy += 180 * dt;
      if (p.ttl <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  function updateCamera(dt) {
    const level = state.level;
    const player = state.player;

    let targetX = player.x - VIEW.width * 0.34;

    if (state.boss) {
      targetX = clamp(targetX, state.boss.arenaStart, state.boss.arenaEnd - VIEW.width);
    }

    targetX = clamp(targetX, 0, level.length - VIEW.width);
    state.cameraX += (targetX - state.cameraX) * Math.min(1, dt * 5.5);
  }

  function completeIntermission(dt) {
    state.intermissionTimer -= dt;
    if (state.intermissionTimer > 0) {
      return;
    }

    const next = state.levelIndex + 1;
    if (next < LEVEL_COUNT) {
      state.levelIndex = next;
      state.mode = "playing";
      loadLevel(next);
      return;
    }

    state.mode = "victory";
    showMessage("Broadcast complete. Mad Patrol 3 cleared.", 5);
  }

  function updatePlaying(dt) {
    state.tick += 1;
    state.quote = pickQuote(state.tick);

    if (state.messageTimer > 0) {
      state.messageTimer = Math.max(0, state.messageTimer - dt);
    }

    if (consumePress("Enter")) {
      state.pause = !state.pause;
      showMessage(state.pause ? "Paused" : "Resumed", 0.7);
    }

    if (state.pause) {
      return;
    }

    if (consumePress("KeyY")) {
      toggleFullscreen();
    }

    spawnPendingEnemies();

    if (!state.boss && state.player.x >= state.level.bossSpawnX) {
      spawnBoss();
    }

    updatePlayerAimAndInput(dt);
    updatePlayerPhysics(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updateCapsulesAndDrops(dt);
    updateHazards();
    updateParticles(dt);
    updateCamera(dt);
  }

  function step(dt) {
    if (state.mode === "menu") {
      if (consumePress("Enter") || consumePress("Space")) {
        startGame();
      }
      if (consumePress("KeyY")) {
        toggleFullscreen();
      }
      state.tick += 1;
      state.quote = pickQuote(state.tick);
      return;
    }

    if (state.mode === "playing") {
      updatePlaying(dt);
      return;
    }

    if (state.mode === "intermission") {
      state.tick += 1;
      completeIntermission(dt);
      return;
    }

    if (state.mode === "gameover") {
      if (consumePress("Enter") || consumePress("Space")) {
        startGame();
      }
      if (consumePress("KeyY")) {
        toggleFullscreen();
      }
      state.tick += 1;
      return;
    }

    if (state.mode === "victory") {
      if (consumePress("Enter") || consumePress("Space")) {
        state.mode = "menu";
      }
      if (consumePress("KeyY")) {
        toggleFullscreen();
      }
      state.tick += 1;
    }
  }

  function drawBackground(level) {
    if (level.shipMode) {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      g.addColorStop(0, "#090f2b");
      g.addColorStop(1, "#030611");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);

      const nebula = ctx.createRadialGradient(VIEW.width * 0.35, VIEW.height * 0.2, 20, VIEW.width * 0.35, VIEW.height * 0.2, 280);
      nebula.addColorStop(0, "rgba(140,106,255,0.22)");
      nebula.addColorStop(1, "rgba(140,106,255,0)");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);

      for (let i = 0; i < 90; i += 1) {
        const x = ((i * 137 + state.tick * 1.1) % (VIEW.width + 120)) - 60;
        const y = (i * 97) % 440;
        const s = 1 + (i % 3 === 0 ? 1 : 0);
        ctx.fillStyle = i % 5 === 0 ? "rgba(136,213,255,0.8)" : "rgba(255,255,255,0.75)";
        ctx.fillRect(x, y, s, s);
      }
      return;
    }

    if (level.underwaterMode) {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      g.addColorStop(0, "#1a6f88");
      g.addColorStop(0.55, "#0d4f67");
      g.addColorStop(1, "#043345");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);

      ctx.fillStyle = "rgba(113, 238, 235, 0.08)";
      for (let i = -1; i < 5; i += 1) {
        const baseX = i * 240 - ((state.cameraX * 0.2) % 240);
        ctx.beginPath();
        ctx.moveTo(baseX, VIEW.height - 110);
        ctx.lineTo(baseX + 120, VIEW.height - 250);
        ctx.lineTo(baseX + 240, VIEW.height - 110);
        ctx.closePath();
        ctx.fill();
      }

      for (let i = 0; i < 52; i += 1) {
        const x = ((i * 143 + state.tick * 0.85) % (VIEW.width + 80)) - 40;
        const y = VIEW.height - ((i * 71 + state.tick * 1.3) % (VIEW.height - 30));
        const r = 1 + (i % 3);
        ctx.strokeStyle = "rgba(196, 251, 255, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, level.skyTop);
    g.addColorStop(1, level.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const farShift = (state.cameraX * 0.18) % VIEW.width;
    ctx.fillStyle = level.mountain;
    for (let i = -1; i < 4; i += 1) {
      const baseX = i * 360 - farShift;
      ctx.beginPath();
      ctx.moveTo(baseX - 80, VIEW.height - 120);
      ctx.lineTo(baseX + 80, VIEW.height - 260);
      ctx.lineTo(baseX + 250, VIEW.height - 120);
      ctx.closePath();
      ctx.fill();
    }

    const midShift = (state.cameraX * 0.32) % VIEW.width;
    ctx.fillStyle = level.city;
    for (let i = -1; i < 5; i += 1) {
      const baseX = i * 220 - midShift;
      const h = 70 + ((i * 37) % 70);
      ctx.fillRect(baseX, VIEW.height - 120 - h, 80, h);
      ctx.fillRect(baseX + 86, VIEW.height - 120 - h * 0.8, 50, h * 0.8);
    }

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 48; i += 1) {
      const x = ((i * 191 + state.tick * 0.7) % 1100) - 70;
      const y = ((i * 131 + state.tick * 0.2) % 280) + 12;
      const s = 1 + (i % 2);
      ctx.fillRect(x, y, s, s);
    }
  }

  function drawGround(level) {
    const stepX = 18;
    const groundFill = level.shipMode ? "#0f1526" : level.underwaterMode ? "#103947" : "#25190f";
    const dustStroke = level.shipMode ? "#8cc9ff" : level.underwaterMode ? "#89e5df" : level.dust;
    const pitTop = level.underwaterMode ? "rgba(8, 56, 72, 0.95)" : "rgba(8, 26, 42, 0.95)";
    const pitBottom = level.underwaterMode ? "rgba(2, 26, 38, 0.98)" : "rgba(4, 11, 18, 0.98)";

    ctx.beginPath();
    ctx.moveTo(0, VIEW.height + 10);

    for (let sx = 0; sx <= VIEW.width + stepX; sx += stepX) {
      const wx = state.cameraX + sx;
      const gy = groundAt(level, wx);
      if (gy === null) {
        ctx.lineTo(sx, VIEW.height + 10);
      } else {
        ctx.lineTo(sx, gy);
      }
    }

    ctx.lineTo(VIEW.width, VIEW.height + 10);
    ctx.closePath();
    ctx.fillStyle = groundFill;
    ctx.fill();

    ctx.beginPath();
    for (let sx = 0; sx <= VIEW.width + stepX; sx += stepX) {
      const wx = state.cameraX + sx;
      const gy = groundAt(level, wx);
      if (gy === null) {
        continue;
      }
      if (sx === 0) {
        ctx.moveTo(sx, gy);
      } else {
        ctx.lineTo(sx, gy);
      }
    }
    ctx.strokeStyle = dustStroke;
    ctx.lineWidth = 4;
    ctx.stroke();

    for (const pit of level.pits) {
      const left = worldToScreenX(pit.x);
      const right = worldToScreenX(pit.x + pit.w);
      if (right < -30 || left > VIEW.width + 30) continue;

      const leftLipY = groundAt(level, pit.x - 2) ?? level.baseGround;
      const rightLipY = groundAt(level, pit.x + pit.w + 2) ?? level.baseGround;

      const pitFill = ctx.createLinearGradient(0, Math.min(leftLipY, rightLipY), 0, VIEW.height);
      pitFill.addColorStop(0, pitTop);
      pitFill.addColorStop(1, pitBottom);
      ctx.fillStyle = pitFill;
      ctx.beginPath();
      ctx.moveTo(left, leftLipY);
      ctx.lineTo(right, rightLipY);
      ctx.lineTo(right + 14, VIEW.height + 12);
      ctx.lineTo(left - 14, VIEW.height + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = level.underwaterMode ? "#96ece4" : "#f2d783";
      ctx.fillRect(left - 5, leftLipY - 22, 10, 22);
      ctx.fillRect(right - 5, rightLipY - 22, 10, 22);

      ctx.fillStyle = level.underwaterMode ? "#6ee7ff" : "#ff7e61";
      for (let i = 0; i < 3; i += 1) {
        const yA = leftLipY - 18 + i * 7;
        const yB = rightLipY - 18 + i * 7;
        ctx.fillRect(left - 10, yA, 14, 3);
        ctx.fillRect(right - 4, yB, 14, 3);
      }
    }

    ctx.fillStyle = level.underwaterMode ? "#2b7288" : "#7c5f30";
    for (const p of level.platforms) {
      const x = worldToScreenX(p.x);
      if (x < -p.w || x > VIEW.width + 10) continue;
      ctx.fillRect(x, p.y, p.w, p.h);
      ctx.fillStyle = level.underwaterMode ? "#8fd4e3" : "#d7b06a";
      ctx.fillRect(x, p.y, p.w, 4);
      ctx.fillStyle = level.underwaterMode ? "#2b7288" : "#7c5f30";
    }

    if (level.grappleEnabled) {
      for (const a of level.anchors) {
        const x = worldToScreenX(a.x);
        if (x < -30 || x > VIEW.width + 30) continue;
        ctx.strokeStyle = "#f1f4ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, a.y, a.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#6f7ca8";
        ctx.beginPath();
        ctx.arc(x, a.y, a.r - 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const hz of level.hazards) {
      if (!hz.live) continue;
      const x = worldToScreenX(hz.x);
      if (x < -hz.w || x > VIEW.width + hz.w) continue;
      const gy = groundAt(level, hz.x + hz.w * 0.5);
      if (gy === null) continue;
      const y = gy - hz.h;

      ctx.fillStyle = "#353b49";
      ctx.fillRect(x, y, hz.w, hz.h);
      ctx.fillStyle = "#ff8467";
      ctx.fillRect(x + 4, y + 4, hz.w - 8, 4);
      ctx.fillRect(x + 4, y + 10, hz.w - 8, 3);
    }
  }

  function drawPowerName(power) {
    if (power === "rapid") return "R";
    if (power === "spread") return "S";
    if (power === "laser") return "L";
    if (power === "shield") return "H";
    if (power === "overclock") return "O";
    return "?";
  }

  function roundedRectPath(x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w * 0.5, h * 0.5));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBitcoinSymbol(cx, cy, size = 8, color = "#7a5a15") {
    const lineHalf = size * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.15);
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.16, cy - lineHalf);
    ctx.lineTo(cx - size * 0.16, cy + lineHalf);
    ctx.moveTo(cx + size * 0.16, cy - lineHalf);
    ctx.lineTo(cx + size * 0.16, cy + lineHalf);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(7, Math.round(size * 1.02))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("B", cx, cy + size * 0.32);
  }

  function drawBitcoinMarioBox(x, y, w, h, power, phase = 0) {
    const pulse = 0.5 + Math.sin(state.tick * 0.13 + phase) * 0.5;
    const r = Math.max(7, Math.min(w, h) * 0.2);
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;

    roundedRectPath(x - 4, y - 4, w + 8, h + 8, r + 2);
    ctx.fillStyle = `rgba(255,173,84,${0.25 + pulse * 0.2})`;
    ctx.fill();

    roundedRectPath(x, y, w, h, r);
    ctx.fillStyle = "#ef7d2e";
    ctx.fill();
    ctx.strokeStyle = "#fff7df";
    ctx.lineWidth = 3;
    ctx.stroke();

    roundedRectPath(x + 3, y + 3, w - 6, h - 6, Math.max(5, r - 2));
    ctx.fillStyle = "#ffb05d";
    ctx.fill();

    const studR = Math.max(2.4, Math.min(w, h) * 0.07);
    const studs = [
      [x + 9, y + 9],
      [x + w - 9, y + 9],
      [x + 9, y + h - 9],
      [x + w - 9, y + h - 9],
    ];
    ctx.fillStyle = "#fffdf4";
    for (const [sx, sy] of studs) {
      ctx.beginPath();
      ctx.arc(sx, sy, studR, 0, Math.PI * 2);
      ctx.fill();
    }

    const badgeW = w * 0.5;
    const badgeH = h * 0.52;
    const badgeX = cx - badgeW * 0.5;
    const badgeY = cy - badgeH * 0.5;
    roundedRectPath(badgeX, badgeY, badgeW, badgeH, Math.max(5, badgeH * 0.22));
    ctx.fillStyle = "#fffef9";
    ctx.fill();
    ctx.strokeStyle = "#ffd095";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawBitcoinSymbol(cx, badgeY + badgeH * 0.63, badgeH * 0.64, "#d06a1d");

    ctx.fillStyle = "#fff6d0";
    ctx.font = `bold ${Math.max(10, Math.floor(h * 0.22))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(drawPowerName(power), cx, y + h - 7);
  }

  function drawPowerIcon(power, x, y, w, h) {
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;

    ctx.fillStyle = "#eaf7ff";
    roundedRectPath(x, y, w, h, Math.max(4, Math.min(w, h) * 0.16));
    ctx.fill();
    ctx.strokeStyle = "#5da8d9";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (power === "rapid") {
      ctx.fillStyle = "#2f6f99";
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillRect(cx - 9 + i * 6, cy - 5 + i * 1.5, 13, 3);
      }
      return;
    }

    if (power === "spread") {
      ctx.fillStyle = "#2f6f99";
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.arc(cx - 9, cy + 5, 3, 0, Math.PI * 2);
      ctx.arc(cx + 9, cy + 5, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (power === "laser") {
      ctx.fillStyle = "#2f6f99";
      ctx.fillRect(cx - 11, cy - 2, 22, 4);
      ctx.fillStyle = "#63d5ff";
      ctx.fillRect(cx - 7, cy - 1, 18, 2);
      return;
    }

    if (power === "shield") {
      ctx.fillStyle = "#2f6f99";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 8, cy - 5);
      ctx.lineTo(cx + 6, cy + 7);
      ctx.lineTo(cx, cy + 12);
      ctx.lineTo(cx - 6, cy + 7);
      ctx.lineTo(cx - 8, cy - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8fd5ff";
      ctx.fillRect(cx - 2, cy - 2, 4, 8);
      return;
    }

    if (power === "overclock") {
      ctx.fillStyle = "#2f6f99";
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 11);
      ctx.lineTo(cx + 1, cy - 11);
      ctx.lineTo(cx - 2, cy - 2);
      ctx.lineTo(cx + 7, cy - 2);
      ctx.lineTo(cx - 4, cy + 11);
      ctx.lineTo(cx - 1, cy + 2);
      ctx.lineTo(cx - 9, cy + 2);
      ctx.closePath();
      ctx.fill();
      return;
    }

    ctx.fillStyle = "#2f6f99";
    ctx.fillRect(cx - 6, cy - 2, 12, 4);
  }

  function drawDroppedWeaponBox(x, y, w, h, power, phase = 0) {
    const pulse = 0.5 + Math.sin(state.tick * 0.16 + phase) * 0.5;
    const r = Math.max(6, Math.min(w, h) * 0.18);

    roundedRectPath(x - 3, y - 3, w + 6, h + 6, r + 2);
    ctx.fillStyle = `rgba(117,207,255,${0.3 + pulse * 0.25})`;
    ctx.fill();

    roundedRectPath(x, y, w, h, r);
    ctx.fillStyle = "#8ed9ff";
    ctx.fill();
    ctx.strokeStyle = "#fff6dc";
    ctx.lineWidth = 2;
    ctx.stroke();

    roundedRectPath(x + 3, y + 3, w - 6, h - 6, Math.max(4, r - 2));
    ctx.fillStyle = "#caefff";
    ctx.fill();

    const panelW = w - 16;
    const panelH = h - 18;
    const panelX = x + 8;
    const panelY = y + 7;
    drawPowerIcon(power, panelX, panelY, panelW, panelH);
  }

  function drawCapsules(level) {
    for (const cap of level.capsules) {
      if (cap.taken) continue;
      const x = worldToScreenX(cap.x);
      if (x < -cap.w || x > VIEW.width + cap.w) continue;
      drawBitcoinMarioBox(x, cap.y, cap.w, cap.h, cap.power, cap.phase);
    }

    for (const p of state.powerDrops) {
      const x = worldToScreenX(p.x);
      if (x < -20 || x > VIEW.width + 20) continue;
      drawDroppedWeaponBox(x, p.y, p.w, p.h, p.power, state.tick * 0.03 + x * 0.01);
    }
  }

  function drawEnemy(e) {
    const x = worldToScreenX(e.x);
    const y = e.y + Math.sin(state.tick * 0.07 + e.phase) * 0.8;
    if (x < -80 || x > VIEW.width + 80) return;

    if (e.type === "flyer") {
      const rollX = x + 3;
      const rollY = y + e.h * 0.2;
      const rollW = e.w - 6;
      const rollH = e.h * 0.56;
      const wingLift = (e.variant % 2 === 0 ? 1 : -1) * 1.5;

      ctx.fillStyle = "#4a865f";
      ctx.fillRect(rollX, rollY, rollW, rollH);
      ctx.fillStyle = "#9dddb2";
      ctx.fillRect(rollX + 3, rollY + 3, rollW - 6, rollH - 6);
      ctx.fillStyle = "#335f44";
      ctx.beginPath();
      ctx.arc(rollX, rollY + rollH * 0.5, rollH * 0.5, 0, Math.PI * 2);
      ctx.arc(rollX + rollW, rollY + rollH * 0.5, rollH * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f0e8c1";
      ctx.fillRect(rollX + rollW * 0.36, rollY + 2, rollW * 0.28, rollH - 4);
      ctx.fillStyle = "#305941";
      ctx.font = `bold ${Math.max(11, Math.round(e.h * 0.34))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("$", rollX + rollW * 0.5, rollY + rollH * 0.67);

      ctx.fillStyle = "#ff8f54";
      ctx.beginPath();
      ctx.moveTo(rollX + 4, rollY + rollH * 0.5);
      ctx.lineTo(rollX - 8, rollY + 4 + wingLift);
      ctx.lineTo(rollX - 8, rollY + rollH - 4 + wingLift);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rollX + rollW - 4, rollY + rollH * 0.5);
      ctx.lineTo(rollX + rollW + 8, rollY + 4 - wingLift);
      ctx.lineTo(rollX + rollW + 8, rollY + rollH - 4 - wingLift);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#d73843";
      ctx.fillRect(rollX + rollW * 0.74, rollY + rollH * 0.23, 6, 6);
      return;
    }

    if (e.type === "drone") {
      const bodyX = x + 2;
      const bodyY = y + e.h * 0.2;
      const bodyW = e.w - 4;
      const bodyH = e.h * 0.62;

      roundedRectPath(bodyX, bodyY, bodyW, bodyH, 8);
      ctx.fillStyle = "#4c6488";
      ctx.fill();
      roundedRectPath(bodyX + 2, bodyY + 2, bodyW - 4, bodyH - 4, 7);
      ctx.fillStyle = "#7088a8";
      ctx.fill();

      ctx.fillStyle = "#dbe8ff";
      ctx.fillRect(bodyX + 8, bodyY + bodyH * 0.2, bodyW - 16, 5);
      ctx.fillStyle = "#ecf2ce";
      ctx.fillRect(bodyX + bodyW * 0.2, bodyY + bodyH * 0.48, bodyW * 0.6, bodyH * 0.34);
      ctx.fillStyle = "#345d45";
      ctx.font = `bold ${Math.max(10, Math.round(e.h * 0.28))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("$", bodyX + bodyW * 0.5, bodyY + bodyH * 0.73);

      ctx.fillStyle = "#161a2a";
      ctx.beginPath();
      ctx.arc(bodyX + 8, bodyY + 2, 4, 0, Math.PI * 2);
      ctx.arc(bodyX + bodyW - 8, bodyY + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9db4d8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bodyX + 8, bodyY - 6);
      ctx.lineTo(bodyX + 8, bodyY + 2);
      ctx.moveTo(bodyX + bodyW - 8, bodyY - 6);
      ctx.lineTo(bodyX + bodyW - 8, bodyY + 2);
      ctx.stroke();

      ctx.fillStyle = "#e03f49";
      ctx.fillRect(bodyX + bodyW * 0.5 - 4, bodyY + bodyH * 0.36, 8, 4);
      return;
    }

    if (e.type === "turret" || e.type === "hopper") {
      const bodyW = Math.max(12, e.w * 0.38);
      const bodyX = x + e.w * 0.5 - bodyW * 0.5;
      const bodyY = y + 5;
      const bodyH = e.h - 10;

      roundedRectPath(bodyX, bodyY, bodyW, bodyH, 6);
      ctx.fillStyle = "#7c0f22";
      ctx.fill();
      roundedRectPath(bodyX + 2, bodyY + 2, bodyW - 4, bodyH - 4, 5);
      ctx.fillStyle = "#ff3047";
      ctx.fill();
      ctx.fillStyle = "#ff8d67";
      ctx.fillRect(bodyX + 2, bodyY + bodyH * 0.34, bodyW - 4, 3);
      ctx.fillRect(bodyX + 2, bodyY + bodyH * 0.62, bodyW - 4, 2);
      ctx.fillStyle = "#201111";
      ctx.fillRect(bodyX + bodyW * 0.5 - 1, bodyY - 6, 2, 5);
      ctx.fillStyle = "#ffd06b";
      ctx.beginPath();
      ctx.arc(bodyX + bodyW * 0.5, bodyY - 7, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffe3c4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bodyX + 4, bodyY + bodyH * 0.2);
      ctx.lineTo(bodyX + bodyW - 4, bodyY + bodyH * 0.2);
      ctx.moveTo(bodyX + bodyW * 0.5, bodyY + bodyH * 0.2);
      ctx.lineTo(bodyX + bodyW * 0.5, bodyY + bodyH * 0.78);
      ctx.stroke();

      if (e.type === "hopper") {
        ctx.strokeStyle = "#c8d3e8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bodyX + 4, bodyY + bodyH);
        ctx.lineTo(bodyX + 1, bodyY + bodyH + 6);
        ctx.moveTo(bodyX + bodyW - 4, bodyY + bodyH);
        ctx.lineTo(bodyX + bodyW + 1, bodyY + bodyH + 6);
        ctx.stroke();
      }
      return;
    }

    const suitX = x + 4;
    const suitY = y + 6;
    const suitW = e.w - 8;
    const suitH = e.h - 8;
    const shoulderPad = e.type === "commando" ? 5 : 2;
    const suitColor = e.type === "commando" ? "#112740" : "#10141f";

    roundedRectPath(suitX - shoulderPad, suitY + 2, suitW + shoulderPad * 2, suitH - 2, 6);
    ctx.fillStyle = suitColor;
    ctx.fill();
    roundedRectPath(suitX - shoulderPad + 2, suitY + 4, suitW + shoulderPad * 2 - 4, suitH - 6, 5);
    ctx.fillStyle = "#253047";
    ctx.fill();

    ctx.fillStyle = "#f4f7ff";
    ctx.fillRect(suitX + suitW * 0.43, suitY + 7, suitW * 0.14, suitH - 14);
    ctx.fillStyle = "#121a28";
    ctx.fillRect(suitX + suitW * 0.46, suitY + 10, suitW * 0.08, suitH - 18);
    ctx.fillStyle = "#cb3540";
    ctx.fillRect(suitX + suitW * 0.46, suitY + 12, suitW * 0.08, suitH * 0.42);

    ctx.fillStyle = "#8d623c";
    ctx.fillRect(suitX + 1, suitY + suitH * 0.34, 2, suitH * 0.54);
    ctx.fillRect(suitX + suitW - 3, suitY + suitH * 0.34, 2, suitH * 0.54);

    if (e.type === "bomber") {
      ctx.fillStyle = "#8f7356";
      roundedRectPath(suitX - 9, suitY + 10, 9, 12, 2);
      ctx.fill();
      ctx.fillStyle = "#5f4b38";
      ctx.fillRect(suitX - 7, suitY + 14, 5, 4);
      ctx.fillStyle = "#f2c35d";
      ctx.fillRect(suitX - 6, suitY + 8, 3, 2);
    } else if (e.type === "commando") {
      ctx.fillStyle = "#7ac1ff";
      ctx.beginPath();
      ctx.ellipse(suitX + suitW * 0.5, suitY + suitH * 0.36, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0e2f4d";
      ctx.fillRect(suitX + suitW * 0.55, suitY + suitH * 0.35, 2, 2);
    } else {
      ctx.fillStyle = "#f6ead0";
      ctx.fillRect(suitX + suitW * 0.2, suitY + suitH * 0.42, suitW * 0.16, 8);
      ctx.fillRect(suitX + suitW * 0.26, suitY + suitH * 0.4, 3, 11);
    }
  }

  function drawBoss() {
    const boss = state.boss;
    if (!boss) return;

    const x = worldToScreenX(boss.x);
    const y = boss.y;

    const palette =
      boss.type === "lunar-howler"
        ? { shell: "#4f5c78", trim: "#8ca0c8", floor: "#273248", window: "#dbe5ff" }
        : boss.type === "fiat-titan"
        ? { shell: "#5a4966", trim: "#9a84b0", floor: "#352744", window: "#f4d8be" }
        : { shell: "#4a4e67", trim: "#8994b6", floor: "#2b3348", window: "#d7e7ff" };

    ctx.fillStyle = palette.shell;
    ctx.fillRect(x, y, boss.w, boss.h);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(x + 10, y + 12, boss.w - 20, boss.h - 20);

    const floorStep = Math.max(22, Math.floor(boss.h * 0.085));
    const windowW = Math.max(10, Math.floor(boss.w * 0.05));
    const windowH = Math.max(9, Math.floor(boss.h * 0.03));
    for (let fy = y + 32; fy < y + boss.h - 34; fy += floorStep) {
      ctx.fillStyle = palette.floor;
      ctx.fillRect(x + 16, fy, boss.w - 32, 4);
      for (let wx = x + 24; wx < x + boss.w - 28; wx += windowW + 10) {
        ctx.fillStyle = palette.window;
        ctx.fillRect(wx, fy + 7, windowW, windowH);
      }
    }

    const signW = Math.min(156, boss.w - 52);
    const signH = Math.max(24, Math.floor(boss.h * 0.08));
    const signX = x + boss.w * 0.5 - signW * 0.5;
    const signY = y + 16;
    ctx.fillStyle = "#e4edf9";
    ctx.fillRect(signX, signY, signW, signH);
    ctx.fillStyle = "#182236";
    ctx.font = `bold ${Math.max(18, Math.floor(signH * 0.72))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("BANK", signX + signW * 0.5, signY + signH * 0.72);

    ctx.fillStyle = "#cf3a45";
    const eyeY = y + boss.h * 0.26;
    const eyeW = Math.max(28, boss.w * 0.12);
    const eyeH = Math.max(12, boss.h * 0.036);
    ctx.fillRect(x + boss.w * 0.32 - eyeW * 0.5, eyeY, eyeW, eyeH);
    ctx.fillRect(x + boss.w * 0.68 - eyeW * 0.5, eyeY, eyeW, eyeH);
    ctx.fillStyle = "#151a28";
    ctx.fillRect(x + boss.w * 0.32 - eyeW * 0.35, eyeY + 3, eyeW * 0.7, Math.max(7, eyeH - 4));
    ctx.fillRect(x + boss.w * 0.68 - eyeW * 0.35, eyeY + 3, eyeW * 0.7, Math.max(7, eyeH - 4));
    ctx.strokeStyle = "#a82f3b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + boss.w * 0.5, y + boss.h * 0.39, Math.max(22, boss.w * 0.11), Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    const vaultW = Math.min(120, boss.w - 84);
    const vaultH = Math.max(72, boss.h * 0.2);
    const vaultX = x + boss.w * 0.5 - vaultW * 0.5;
    const vaultY = y + boss.h * 0.56;
    ctx.fillStyle = boss.coreOpen ? "#ff8f63" : "#5d384d";
    ctx.fillRect(vaultX, vaultY, vaultW, vaultH);
    ctx.fillStyle = "#f4d997";
    if (boss.coreOpen) {
      ctx.fillRect(vaultX + 18, vaultY + 20, vaultW - 36, vaultH - 34);
    }

    ctx.fillStyle = "#303a54";
    ctx.fillRect(x + 20, y + boss.h - 22, boss.w - 40, 14);

    const hpRatio = boss.hp / boss.maxHp;
    const barW = 340;
    const barX = VIEW.width * 0.5 - barW * 0.5;
    const barY = 56;
    ctx.fillStyle = "rgba(7, 9, 16, 0.82)";
    ctx.fillRect(barX - 2, barY - 2, barW + 4, 18);
    ctx.fillStyle = "#2e3548";
    ctx.fillRect(barX, barY, barW, 14);
    ctx.fillStyle = "#ff7d5c";
    ctx.fillRect(barX, barY, Math.max(0, barW * hpRatio), 14);
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`BOSS ${boss.name.toUpperCase()}`, VIEW.width * 0.5, 48);
  }

  function drawBitcoinBadge(cx, cy, radius = 6) {
    ctx.fillStyle = "#f7ce5f";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    const lineHalf = radius * 0.72;
    ctx.strokeStyle = "#7a5a15";
    ctx.lineWidth = Math.max(1, radius * 0.17);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.2, cy - lineHalf);
    ctx.lineTo(cx - radius * 0.2, cy + lineHalf);
    ctx.moveTo(cx + radius * 0.2, cy - lineHalf);
    ctx.lineTo(cx + radius * 0.2, cy + lineHalf);
    ctx.stroke();

    ctx.fillStyle = "#7a5a15";
    ctx.font = `bold ${Math.max(7, Math.round(radius * 1.45))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("B", cx, cy + radius * 0.34);
  }

  function drawMadBitcoins(player) {
    const x = worldToScreenX(player.x);
    const y = player.y;
    const level = state.level;
    const shipMode = Boolean(level?.shipMode);
    const submarineMode = Boolean(level?.submarineMode);

    if (x < -100 || x > VIEW.width + 100) return;

    const flash = player.invuln > 0 && Math.floor(state.tick * 0.4) % 2 === 0;
    if (flash) {
      ctx.globalAlpha = 0.45;
    }

    if (player.grapple.active) {
      ctx.strokeStyle = "#f3f6ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(worldToScreenX(player.grapple.anchorX), player.grapple.anchorY);
      ctx.lineTo(x + player.w * 0.5, y + 8);
      ctx.stroke();
    }

    if (player.vehicle) {
      ctx.fillStyle = "#2b374c";
      ctx.fillRect(x - 8, y + player.h - 16, player.w + 24, 16);
      ctx.fillStyle = "#8aa4ce";
      ctx.fillRect(x + 2, y + player.h - 14, player.w + 4, 10);
      ctx.fillStyle = "#1f2235";
      ctx.beginPath();
      ctx.arc(x + 4, y + player.h + 2, 8, 0, Math.PI * 2);
      ctx.arc(x + player.w + 10, y + player.h + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#485470";
      ctx.fillRect(x + 10, y + player.h - 24, 10, 12);
    }

    if (shipMode) {
      ctx.fillStyle = "#18294a";
      ctx.fillRect(x - 20, y + 20, player.w + 42, 22);
      ctx.fillStyle = "#5ea8ff";
      ctx.fillRect(x - 16, y + 24, player.w + 10, 14);
      ctx.fillStyle = "#a8dcff";
      ctx.fillRect(x + 2, y + 18, player.w - 8, 10);
      ctx.fillStyle = "#ff9b5f";
      ctx.fillRect(x - 26, y + 27, 6, 8);
    }

    if (submarineMode) {
      ctx.fillStyle = "#1c5167";
      ctx.fillRect(x - 18, y + 22, player.w + 36, 20);
      ctx.fillStyle = "#5fb4c7";
      ctx.fillRect(x - 14, y + 25, player.w + 20, 14);
      ctx.fillStyle = "#b3eef8";
      ctx.fillRect(x + 4, y + 20, player.w - 8, 8);
      ctx.fillStyle = "#f9b663";
      ctx.fillRect(x + player.w + 14, y + 28, 6, 8);
    }

    const crouch = player.crouching && !player.vehicle;
    const torsoTop = y + (crouch ? 24 : 16);
    const torsoH = Math.max(16, player.h - (crouch ? 20 : 14));
    const headTop = y + (crouch ? 14 : 8);
    const headH = crouch ? 12 : 16;
    const hatBrimY = y + (crouch ? 8 : -4);
    const hatTopY = y + (crouch ? 2 : -10);
    const coatX = x + 8;
    const coatY = torsoTop;
    const coatW = player.w - 10;
    const coatH = torsoH;

    ctx.fillStyle = "#111319";
    ctx.fillRect(coatX, coatY, coatW, coatH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(coatX, coatY, coatW, coatH);
    ctx.clip();
    ctx.strokeStyle = "#7f5032";
    ctx.lineWidth = 1;
    for (let o = -coatH; o < coatW + coatH; o += 8) {
      ctx.beginPath();
      ctx.moveTo(coatX + o, coatY);
      ctx.lineTo(coatX + o + coatH, coatY + coatH);
      ctx.stroke();
    }
    for (let o = 0; o < coatW + coatH; o += 8) {
      ctx.beginPath();
      ctx.moveTo(coatX + o, coatY);
      ctx.lineTo(coatX + o - coatH, coatY + coatH);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#1b1e26";
    ctx.fillRect(x + 11, torsoTop + 3, 8, Math.max(8, torsoH - 8));
    ctx.fillRect(x + 20, torsoTop + 3, 8, Math.max(8, torsoH - 8));

    ctx.fillStyle = "#f1f5ff";
    ctx.fillRect(x + 16, torsoTop + 5, 7, Math.max(8, torsoH - 12));
    ctx.fillStyle = "#07090d";
    ctx.fillRect(x + 17, torsoTop + 8, 5, Math.max(6, torsoH - 18));

    ctx.fillStyle = "#f2c9a8";
    ctx.fillRect(x + 10, headTop, player.w - 14, headH);

    ctx.fillStyle = "#6d442f";
    ctx.fillRect(x + 9, headTop + headH - 2, player.w - 12, 8);

    const crownY = hatTopY - (crouch ? 6 : 10);
    const crownH = crouch ? 14 : 22;
    ctx.fillStyle = "#06080f";
    ctx.fillRect(x + 9, crownY, player.w - 12, crownH);
    ctx.fillStyle = "#141927";
    ctx.fillRect(x + 8, crownY + 1, player.w - 10, crownH - 3);
    ctx.fillStyle = "#cc3f4a";
    ctx.fillRect(x + 8, crownY + Math.max(4, Math.floor(crownH * 0.56)), player.w - 10, 3);
    ctx.fillStyle = "#070a12";
    ctx.fillRect(x + 4, hatBrimY, player.w - 1, 7);

    drawBitcoinBadge(x + player.w - 12, hatBrimY + 4, 5.2);
    drawBitcoinBadge(x + player.w - 9, torsoTop + Math.min(14, torsoH * 0.52), 7);

    ctx.fillStyle = "#2f1e13";
    ctx.fillRect(x + 11, headTop + headH - 2, player.w - 18, 6);

    const goggleY = headTop + 2;
    ctx.fillStyle = "#0a0b10";
    ctx.fillRect(x + 8, goggleY + 3, player.w - 10, 3);
    ctx.fillRect(x + 8, goggleY - 1, 2, 11);
    ctx.fillRect(x + player.w - 2, goggleY - 1, 2, 11);
    ctx.fillStyle = "#07080d";
    ctx.fillRect(x + 9, goggleY, 11, 9);
    ctx.fillRect(x + 20, goggleY, 11, 9);
    ctx.fillStyle = "#cb2e3b";
    ctx.fillRect(x + 11, goggleY + 2, 7, 5);
    ctx.fillRect(x + 22, goggleY + 2, 7, 5);

    ctx.strokeStyle = "#d84853";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 19, headTop + headH - 1, 3.7, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    ctx.fillStyle = "#1d2030";
    if (crouch) {
      ctx.fillRect(x + 8, y + player.h - 6, 10, 4);
      ctx.fillRect(x + player.w - 14, y + player.h - 6, 10, 4);
    } else {
      ctx.fillRect(x + 8, y + player.h - 4, 8, 4);
      ctx.fillRect(x + player.w - 12, y + player.h - 4, 8, 4);
    }

    ctx.strokeStyle = "#f6d7a0";
    ctx.lineWidth = 2;
    const armOriginY = torsoTop + (crouch ? 10 : 8);
    const gunX = x + player.w * 0.5 + player.aimX * (crouch ? 14 : 18);
    const gunY = armOriginY + player.aimY * (crouch ? 10 : 14);
    ctx.beginPath();
    ctx.moveTo(x + player.w * 0.5, armOriginY);
    ctx.lineTo(gunX, gunY);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  function drawProjectiles() {
    for (const b of state.bullets) {
      const x = worldToScreenX(b.x);
      if (x < -20 || x > VIEW.width + 20) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of state.enemyBullets) {
      const x = worldToScreenX(b.x);
      if (x < -20 || x > VIEW.width + 20) continue;
      if (b.shape === "bank_chunk") {
        const size = b.r * 1.7;
        const angle = (b.spin ?? 0) * state.tick + b.x * 0.012;
        ctx.save();
        ctx.translate(x, b.y);
        ctx.rotate(angle);
        ctx.fillStyle = b.color;
        ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
        ctx.strokeStyle = "#6e768d";
        ctx.lineWidth = 1;
        ctx.strokeRect(-size * 0.5, -size * 0.5, size, size);
        ctx.restore();
        continue;
      }
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      const x = worldToScreenX(p.x);
      if (x < -20 || x > VIEW.width + 20) continue;
      const alpha = clamp(p.ttl / p.maxTtl, 0, 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, p.y, 3, 3);
      ctx.globalAlpha = 1;
    }
  }

  function drawHUD() {
    const player = state.player;

    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(10, 10, VIEW.width - 20, 34);
    ctx.strokeStyle = COLORS.hudBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, VIEW.width - 20, 34);

    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";

    const weaponLabel = player.weapon.toUpperCase();
    ctx.fillText(
      `Score ${state.score}   Lives ${Math.max(0, state.lives)}   HP ${Math.ceil(player.hp)}/${player.maxHp}   Weapon ${weaponLabel}   Shield ${player.shield}`,
      20,
      32
    );

    ctx.textAlign = "right";
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#c3d2ff";
    ctx.fillText(GAME_VERSION, VIEW.width - 18, 32);

    if (state.level?.grappleEnabled) {
      const hintX = 20;
      const hintY = 50;
      const hintW = 152;
      const hintH = 20;
      ctx.fillStyle = "rgba(7, 14, 24, 0.88)";
      ctx.fillRect(hintX, hintY, hintW, hintH);
      ctx.strokeStyle = "rgba(144, 236, 255, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(hintX, hintY, hintW, hintH);
      ctx.fillStyle = "#9ef6ff";
      ctx.textAlign = "left";
      ctx.font = "bold 12px monospace";
      ctx.fillText("GRAPPLE HOOK: G", hintX + 8, hintY + 14);
    }

    if (state.pause) {
      ctx.fillStyle = "rgba(3,5,10,0.62)";
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", VIEW.width * 0.5, VIEW.height * 0.5);
    }
  }

  function drawMenuHero(x, y, scale = 4.6) {
    const hero = {
      x: 0,
      y: 0,
      w: PLAYER_BASE_W,
      h: PLAYER_BASE_H,
      invuln: 0,
      grapple: { active: false, anchorX: 0, anchorY: 0 },
      vehicle: false,
      crouching: false,
      aimX: 1,
      aimY: -0.32,
    };

    const oldCameraX = state.cameraX;
    state.cameraX = 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawMadBitcoins(hero);

    ctx.restore();
    state.cameraX = oldCameraX;
  }

  function drawMenu() {
    const level = createLevel(0);
    drawBackground(level);
    drawGround(level);

    const screenShade = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    screenShade.addColorStop(0, "rgba(8, 12, 22, 0.72)");
    screenShade.addColorStop(1, "rgba(3, 7, 14, 0.88)");
    ctx.fillStyle = screenShade;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const heroX = 70;
    const heroY = 44;
    const heroW = 700;
    const heroH = 368;
    const heroGrad = ctx.createLinearGradient(heroX, heroY, heroX, heroY + heroH);
    heroGrad.addColorStop(0, "rgba(40, 27, 62, 0.9)");
    heroGrad.addColorStop(1, "rgba(9, 15, 30, 0.92)");
    ctx.fillStyle = heroGrad;
    ctx.fillRect(heroX, heroY, heroW, heroH);
    ctx.strokeStyle = "rgba(248, 206, 122, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(heroX, heroY, heroW, heroH);

    ctx.fillStyle = "#ffe5a8";
    ctx.font = "bold 70px monospace";
    ctx.textAlign = "left";
    ctx.fillText("MAD", heroX + 30, heroY + 92);
    ctx.fillText("PATROL 3", heroX + 30, heroY + 164);

    ctx.fillStyle = "#d5e6ff";
    ctx.font = "bold 20px monospace";
    ctx.fillText("RETRO RUN-N-GUN // MAD BITCOINS HERO BUILD", heroX + 32, heroY + 206);

    const skyline = ctx.createLinearGradient(heroX, heroY + heroH - 112, heroX, heroY + heroH);
    skyline.addColorStop(0, "rgba(23, 39, 60, 0)");
    skyline.addColorStop(1, "rgba(23, 39, 60, 0.9)");
    ctx.fillStyle = skyline;
    ctx.fillRect(heroX, heroY + heroH - 118, heroW, 118);

    drawMenuHero(heroX + 420, heroY + 96, 4.9);

    ctx.fillStyle = "#f7d58b";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`VERSION ${GAME_VERSION}`, heroX + 34, heroY + heroH - 20);

    const legendX = VIEW.width - 252;
    const legendY = 52;
    const legendW = 204;
    const legendH = 224;
    ctx.fillStyle = "rgba(12, 16, 26, 0.9)";
    ctx.fillRect(legendX, legendY, legendW, legendH);
    ctx.strokeStyle = "rgba(162, 227, 255, 0.62)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(legendX, legendY, legendW, legendH);

    ctx.fillStyle = "#8fe9ff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "left";
    ctx.fillText("LEGEND", legendX + 14, legendY + 24);

    const lines = [
      "LEFT/RIGHT : move",
      "UP : shoot up",
      "UP+LEFT/RIGHT : diag",
      "DOWN : duck",
      "DOWN+LEFT/RIGHT : down shot",
      "SPACE : jump",
      "G : grapple (L3)",
      "AUTO-FIRE : ON",
      "Y : fullscreen",
    ];
    ctx.fillStyle = "#d6e2ff";
    ctx.font = "bold 12px monospace";
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], legendX + 14, legendY + 48 + i * 18);
    }

    const pulse = 0.62 + Math.sin(state.tick * 0.18) * 0.38;
    ctx.fillStyle = `rgba(133, 255, 202, ${clamp(pulse, 0.4, 1)})`;
    ctx.font = "bold 54px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PRESS ENTER TO START", VIEW.width * 0.5, VIEW.height - 34);
  }

  function drawEndScreen(victory) {
    const level = state.level || createLevel(2);
    drawBackground(level);

    ctx.fillStyle = "rgba(7, 10, 18, 0.8)";
    ctx.fillRect(110, 82, VIEW.width - 220, VIEW.height - 164);
    ctx.strokeStyle = victory ? "rgba(117,255,188,0.7)" : "rgba(255,110,96,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(110, 82, VIEW.width - 220, VIEW.height - 164);

    ctx.fillStyle = victory ? "#9fffd0" : "#ff9f92";
    ctx.font = "bold 52px monospace";
    ctx.textAlign = "center";
    ctx.fillText(victory ? "VICTORY" : "BROADCAST LOST", VIEW.width * 0.5, 160);

    ctx.fillStyle = "#f4f6ff";
    ctx.font = "bold 22px monospace";
    if (victory) {
      ctx.fillText("Mad Patrol 3 complete. Citadel collapsed.", VIEW.width * 0.5, 216);
    } else {
      ctx.fillText(`Cause: ${state.gameOverReason || "Signal lost"}`, VIEW.width * 0.5, 216);
    }

    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#f7d88d";
    ctx.fillText(`Final score: ${state.score}`, VIEW.width * 0.5, 268);
    ctx.fillText(`Powerups used: ${state.winStats.totalPowerups}`, VIEW.width * 0.5, 304);
    ctx.fillText(`Enemies cleared: ${state.winStats.totalEnemies}`, VIEW.width * 0.5, 340);

    ctx.fillStyle = "#cde2ff";
    ctx.font = "bold 18px monospace";
    ctx.fillText("Press ENTER to restart", VIEW.width * 0.5, VIEW.height - 94);

    ctx.fillStyle = "rgba(12,16,32,0.75)";
    ctx.fillRect(VIEW.width * 0.5 - 290, VIEW.height - 58, 580, 28);
    ctx.fillStyle = "#f8e4a0";
    ctx.font = "bold 14px monospace";
    ctx.fillText(state.quote, VIEW.width * 0.5, VIEW.height - 39);
  }

  function drawIntermission() {
    const level = state.level;
    drawBackground(level);
    drawGround(level);

    ctx.fillStyle = "rgba(5, 8, 16, 0.76)";
    ctx.fillRect(170, 180, VIEW.width - 340, 170);
    ctx.strokeStyle = "rgba(245, 214, 129, 0.78)";
    ctx.lineWidth = 2;
    ctx.strokeRect(170, 180, VIEW.width - 340, 170);

    ctx.fillStyle = "#ffe7a8";
    ctx.font = "bold 34px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`LEVEL CLEAR`, VIEW.width * 0.5, 236);

    ctx.fillStyle = "#dce7ff";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`${state.levelClearName}`, VIEW.width * 0.5, 272);

    const nextName = state.levelIndex + 1 < LEVEL_COUNT ? createLevel(state.levelIndex + 1).name : "Broadcast Complete";
    ctx.fillStyle = "#95ffc4";
    ctx.fillText(`Next: ${nextName}`, VIEW.width * 0.5, 307);
  }

  function renderGameScene() {
    const level = state.level;
    drawBackground(level);
    drawGround(level);
    drawCapsules(level);

    for (const e of state.enemies) {
      drawEnemy(e);
    }

    drawBoss();
    drawMadBitcoins(state.player);
    drawProjectiles();
    drawParticles();
    drawHUD();
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(VIEW.offsetX, VIEW.offsetY);
    ctx.scale(VIEW.scale, VIEW.scale);

    if (state.mode === "menu") {
      drawMenu();
    } else if (state.mode === "playing") {
      renderGameScene();
    } else if (state.mode === "intermission") {
      drawIntermission();
    } else if (state.mode === "gameover") {
      drawEndScreen(false);
    } else if (state.mode === "victory") {
      drawEndScreen(true);
    }

    ctx.restore();
  }

  function gameLoop(now) {
    if (autoSimulating) {
      const frameDt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      accumulator += frameDt;
      while (accumulator >= FIXED_DT) {
        step(FIXED_DT);
        accumulator -= FIXED_DT;
        clearPressed();
      }
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  function serializeGameState() {
    const level = state.level;
    const player = state.player;
    const payload = {
      coordinate_system: "origin top-left; +x right; +y down; world units in pixels",
      mode: state.mode,
      paused: state.pause,
      level: level
        ? {
            index: state.levelIndex,
            name: level.name,
            vehicle_mode: level.vehicleMode,
            ship_mode: level.shipMode,
            submarine_mode: level.submarineMode,
            underwater_mode: level.underwaterMode,
            grapple_enabled: level.grappleEnabled,
            length: level.length,
          }
        : null,
      camera_x: Number(state.cameraX.toFixed(2)),
      score: state.score,
      lives: Math.max(0, state.lives),
      player: {
        x: Number(player.x.toFixed(2)),
        y: Number(player.y.toFixed(2)),
        vx: Number(player.vx.toFixed(2)),
        vy: Number(player.vy.toFixed(2)),
        on_ground: player.onGround,
        crouching: player.crouching,
        facing: player.facing,
        aim: [Number(player.aimX.toFixed(2)), Number(player.aimY.toFixed(2))],
        weapon: player.weapon,
        weapon_timer: Number(player.weaponTimer.toFixed(2)),
        rapid_timer: Number(player.rapidTimer.toFixed(2)),
        hp: Number(player.hp.toFixed(2)),
        max_hp: player.maxHp,
        shield: player.shield,
        grapple_active: player.grapple.active,
      },
      boss: state.boss
        ? {
            type: state.boss.type,
            hp: Number(state.boss.hp.toFixed(2)),
            max_hp: state.boss.maxHp,
            core_open: Boolean(state.boss.coreOpen),
            defeated: Boolean(state.boss.defeated),
            x: Number(state.boss.x.toFixed(1)),
            y: Number(state.boss.y.toFixed(1)),
          }
        : null,
      enemies: state.enemies.slice(0, 10).map((e) => ({
        type: e.type,
        hp: Number(e.hp.toFixed(2)),
        x: Number(e.x.toFixed(1)),
        y: Number(e.y.toFixed(1)),
      })),
      enemy_count: state.enemies.length,
      player_bullet_count: state.bullets.length,
      enemy_bullet_count: state.enemyBullets.length,
      visible_powerups: state.powerDrops.slice(0, 8).map((p) => ({
        power: p.power,
        x: Number(p.x.toFixed(1)),
        y: Number(p.y.toFixed(1)),
      })),
      message: state.messageTimer > 0 ? state.message : "",
      quote: state.quote,
    };
    return JSON.stringify(payload);
  }

  function advanceTime(ms) {
    autoSimulating = false;
    const steps = Math.max(1, Math.round((ms / 1000) * 60));
    for (let i = 0; i < steps; i += 1) {
      step(FIXED_DT);
      clearPressed();
    }
    render();
    return serializeGameState();
  }

  function bootFromQuery() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("level") && params.get("autostart") !== "1") {
      return;
    }

    startGame();
    if (params.has("level")) {
      const next = clamp(parseInt(params.get("level"), 10) || 0, 0, LEVEL_COUNT - 1);
      state.levelIndex = next;
      loadLevel(next);
    }

    if (params.has("spawnx") && state.level) {
      const spawnX = clamp(parseFloat(params.get("spawnx")) || 120, 20, state.level.length - 40);
      const gy = groundAt(state.level, spawnX) ?? state.level.baseGround;
      state.player.x = spawnX;
      state.player.y = gy - state.player.h;
      state.player.checkpointX = Math.max(120, spawnX - 100);
    }
  }

  window.__madPatrolDebug = {
    forceLevel(levelIndex = 0) {
      const next = clamp(levelIndex | 0, 0, LEVEL_COUNT - 1);
      if (state.mode === "menu") {
        startGame();
      }
      state.mode = "playing";
      state.levelIndex = next;
      loadLevel(next);
      render();
      return JSON.parse(serializeGameState());
    },
    getState() {
      return JSON.parse(serializeGameState());
    },
  };

  window.render_game_to_text = serializeGameState;
  window.advanceTime = advanceTime;

  window.addEventListener("keydown", keyDown, { passive: false });
  window.addEventListener("keyup", keyUp);
  window.addEventListener("resize", resize);

  resize();
  bootFromQuery();
  requestAnimationFrame(gameLoop);
})();
