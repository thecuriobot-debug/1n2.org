(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H - 88;

  const keys = new Set();
  let audioCtx = null;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const choice = (arr) => arr[(Math.random() * arr.length) | 0];
  const roadHeightAt = (worldX, mode) => {
    if (mode === 'topdown' || mode === 'flying' || mode === 'underwater') return 0;
    const amp = mode === 'tower' ? 20 : mode === 'bubble' ? 16 : 13;
    return Math.sin(worldX * 0.015) * amp + Math.sin(worldX * 0.035) * (amp * 0.48);
  };

  const levelDefs = [
    { name: 'Miami Moon Run', type: 'side', theme: 'miami', length: 3800, speed: 2.3, enemyRate: 0.022, obstacleRate: 0.018 },
    { name: 'Vegas Volatility', type: 'side', theme: 'vegas', length: 4100, speed: 2.6, enemyRate: 0.026, obstacleRate: 0.02 },
    { name: 'Underwater Wallet Rescue', type: 'underwater', theme: 'ocean', length: 3400, speed: 1.9, enemyRate: 0.02, obstacleRate: 0.014 },
    { name: 'Sky Hash Rally', type: 'flying', theme: 'sky', length: 3300, speed: 2.2, enemyRate: 0.03, obstacleRate: 0.01 },
    { name: 'Top View HODL Storm', type: 'topdown', theme: 'grid', length: 3200, speed: 2.4, enemyRate: 0.032, obstacleRate: 0 },
    { name: 'Bubble Chain Caverns', type: 'bubble', theme: 'cave', length: 3900, speed: 2.1, enemyRate: 0.028, obstacleRate: 0.012 },
    { name: 'Blaster Moon Towers', type: 'tower', theme: 'towers', length: 4300, speed: 2.7, enemyRate: 0.03, obstacleRate: 0.024 },
    { name: 'Final Block: Satoshi', type: 'boss', theme: 'citadel', length: 9999, speed: 2.1, enemyRate: 0.015, obstacleRate: 0.01 }
  ];

  const game = {
    state: 'title',
    levelIndex: 0,
    score: 0,
    lives: 4,
    hiScore: Number(localStorage.getItem('btcMoonPatrolHigh') || '0'),
    stageTimer: 0,
    levelTimer: 0,
    textFlash: 0,
    particles: [],
    bullets: [],
    enemies: [],
    pickups: [],
    obstacles: [],
    boss: null,
    cameraX: 0,
    shake: 0,
    paused: false,
    titlePage: 0,
    titleTimer: 0,
    titleMusicTick: 0,
    titleMusicStep: 0,
    player: null,
    sfxCooldown: 0,
    enemyCooldown: 0,
    obstacleCooldown: 0,
    nukeBankKills: 0
  };

  function initPlayer(def) {
    const isTop = def.type === 'topdown';
    const isFly = def.type === 'flying';
    const isUnder = def.type === 'underwater';
    game.player = {
      x: 150,
      y: isTop || isFly ? H * 0.65 : GROUND_Y - 20,
      vx: 0,
      vy: 0,
      w: 56,
      h: 28,
      health: 5,
      fireCdF: 0,
      fireCdU: 0,
      inv: 0,
      facing: 1,
      onGround: true,
      rapid: 0,
      shield: 0,
      weapon: 'basic',
      weaponTimer: 0,
      mode: def.type,
      fireFxF: 0,
      fireFxU: 0,
      onBank: false,
      invincibleTimer: 0,
      coyote: 0,
      jumpBuffer: 0
    };
    game.cameraX = 0;
  }

  function resetLevel(index) {
    const def = levelDefs[index];
    game.levelIndex = index;
    game.levelTimer = 0;
    game.stageTimer = 180;
    game.textFlash = 1;
    game.particles.length = 0;
    game.bullets.length = 0;
    game.enemies.length = 0;
    game.pickups.length = 0;
    game.obstacles.length = 0;
    game.boss = null;
    game.enemyCooldown = 0;
    game.obstacleCooldown = 0;
    initPlayer(def);
    if (def.type === 'boss') {
      game.boss = {
        x: W + 180,
        y: 170,
        w: 180,
        h: 180,
        hp: 260,
        maxHp: 260,
        fireCd: 80,
        phase: 0,
        t: 0
      };
    }
  }

  function startGame() {
    game.state = 'playing';
    game.score = 0;
    game.lives = 4;
    game.paused = false;
    game.nukeBankKills = 0;
    game.titleMusicTick = 0;
    game.titleMusicStep = 0;
    resetLevel(0);
  }

  function beep(freq = 440, dur = 0.06, type = 'square', volume = 0.05, slide = 0) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, now + dur);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  function audioReady() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTitleSong() {
    if (!audioCtx || game.state !== 'title') return;
    if (game.titleMusicTick > 0) {
      game.titleMusicTick--;
      return;
    }
    const seq = [
      [523, 659, 0.14], [587, 740, 0.14], [659, 784, 0.16], [784, 988, 0.2],
      [659, 880, 0.14], [587, 740, 0.14], [523, 659, 0.16], [440, 554, 0.2],
      [523, 659, 0.14], [587, 740, 0.14], [659, 880, 0.16], [698, 932, 0.18],
      [784, 1046, 0.14], [880, 1174, 0.2], [784, 988, 0.16], [659, 880, 0.2]
    ];
    const n = seq[game.titleMusicStep % seq.length];
    beep(n[0], n[2], 'square', 0.05, 30);
    beep(n[1], n[2] * 0.9, 'triangle', 0.03, -10);
    game.titleMusicStep++;
    game.titleMusicTick = 7;
  }

  function addParticle(x, y, color, life = 24, vx = rand(-2, 2), vy = rand(-2, 0)) {
    game.particles.push({ x, y, color, life, max: life, vx, vy, r: rand(1.5, 3.6) });
  }

  function explodeBank(o, scale = 1) {
    if (!o || o.dead) return;
    o.dead = true;
    const n1 = Math.max(14, (28 * scale) | 0);
    const n2 = Math.max(10, (18 * scale) | 0);
    for (let i = 0; i < n1; i++) addParticle(o.x + rand(-o.w * 0.5, o.w * 0.5), o.y + rand(0, o.h), '#f06060', 22 + scale * 6, rand(-2.8 * scale, 2.8 * scale), rand(-2.7 * scale, 1.2 * scale));
    for (let i = 0; i < n2; i++) addParticle(o.x + rand(-o.w * 0.5, o.w * 0.5), o.y + rand(0, o.h), '#5f7399', 20 + scale * 5, rand(-2.2 * scale, 2.2 * scale), rand(-2.1 * scale, 1.0 * scale));
    for (let i = 0; i < n2; i++) addParticle(o.x + rand(-o.w * 0.45, o.w * 0.45), o.y + rand(-6, o.h), '#2a2a2a', 28 + scale * 7, rand(-1.6 * scale, 1.6 * scale), rand(-1.8 * scale, -0.3));
    game.score += 260 + ((scale - 1) * 80) | 0;
    if (Math.random() < 0.7) {
      spawnPickup(levelDefs[game.levelIndex], o.x, o.y - Math.min(56, o.h * 0.45));
    }
    beep(160, 0.1, 'sawtooth', 0.06, -120);
  }

  function spawnEnemy(def) {
    const mode = def.type;
    let y = GROUND_Y - 16;
    let kind = 'red_candle';
    let hp = 1;
    let speed = rand(1.4, 3.2) + def.speed * 0.25;
    if (mode === 'flying') {
      y = rand(90, H - 140);
      kind = Math.random() < 0.72 ? 'evil_suit' : 'red_candle';
      hp = 1;
      speed += 1;
    } else if (mode === 'underwater') {
      y = rand(160, H - 110);
      kind = 'red_candle';
      hp = 1;
      speed *= 0.7;
    } else if (mode === 'topdown') {
      y = -30;
      kind = 'red_candle';
      hp = 1;
      speed = rand(1.6, 2.9);
    } else if (mode === 'bubble') {
      y = rand(120, GROUND_Y - 80);
      kind = 'red_candle';
      hp = 1;
      speed *= 0.85;
    } else if (mode === 'tower') {
      y = GROUND_Y - rand(20, 180);
      kind = 'red_candle';
      hp = 1;
      speed *= 1.05;
    } else if (mode === 'boss') {
      y = rand(100, GROUND_Y - 120);
      kind = 'red_candle';
      hp = 1;
      speed = rand(1.8, 2.8);
    } else {
      // Side stages now feature more flying suit-and-tie enemies.
      kind = Math.random() < 0.52 ? 'evil_suit' : 'red_candle';
      y = kind === 'evil_suit' ? rand(120, GROUND_Y - 90) : GROUND_Y - rand(15, 60);
    }

    const w = kind === 'evil_suit' ? 48 : 30;
    const h = kind === 'evil_suit' ? 56 : 42;

    game.enemies.push({
      x: mode === 'topdown' ? rand(40, W - 40) : W + 60,
      y,
      vx: mode === 'topdown' ? rand(-0.8, 0.8) : -speed,
      vy: mode === 'topdown' ? speed : rand(-0.1, 0.1),
      w,
      h,
      hp,
      kind,
      fireCd: rand(45, 130)
    });
  }

  function spawnObstacle(def) {
    if (def.type === 'topdown' || def.type === 'flying') return;
    const cluster = Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < cluster; i++) {
      const kind = 'bank_block';
      const h = rand(58, 92);
      const w = rand(72, 112);
      const worldX = game.cameraX + W + 100 + i * rand(140, 220);
      const baseWave = roadHeightAt(worldX, def.type);
      game.obstacles.push({
        worldX,
        x: worldX - game.cameraX,
        y: GROUND_Y - h + 2 + baseWave,
        w,
      h,
      kind,
      hp: 5,
      maxHp: 5,
      hitFx: 0,
      sink: 0,
      sinkTarget: 0,
      stompCount: 0,
      stompCooldown: 0,
      dead: false
      });
    }
  }

  function spawnPickup(def = levelDefs[game.levelIndex], x = W + 30, y = null) {
    const py = y == null
      ? (def.type === 'flying' ? rand(H * 0.55, H - 120) : rand(100, GROUND_Y - 90))
      : y;
    const type = choice([
      'btc', 'btc', 'btc', 'btc', 'btc', 'btc',
      'weapon_spread', 'weapon_laser', 'weapon_wave', 'weapon_burst',
      'weapon_giant', 'weapon_nuke', 'invincible',
      'shield', 'med'
    ]);
    game.pickups.push({ x, y: py, w: 60, h: 60, type, vx: -2.4, t: rand(0, 1000), y0: py });
  }

  function shoot(player, dirY = 0) {
    const rapidMul = player.rapid > 0 ? 0.65 : 1;
    if (dirY === -1) {
      if (player.fireCdU > 0) return;
      player.fireCdU = 24 * rapidMul;
      player.fireFxU = 5;
    } else {
      if (player.fireCdF > 0) return;
      player.fireCdF = 18 * rapidMul;
      player.fireFxF = 5;
    }

    const pushBullet = (bx, by, vx, vy, w, h, power, wave = false, extra = null) => {
      game.bullets.push({
        x: bx,
        y: by,
        vx,
        vy,
        from: 'player',
        w,
        h,
        power,
        wave,
        phase: rand(0, Math.PI * 2),
        ...(extra || {})
      });
    };

    const power = player.weapon === 'weapon_laser' ? 3
      : player.weapon === 'weapon_burst' ? 2
        : player.weapon === 'weapon_wave' ? 4
          : player.weapon === 'weapon_giant' ? 10
            : player.weapon === 'weapon_nuke' ? 9
              : player.rapid > 0 ? 2 : 1;
    const fwdW = player.weapon === 'weapon_laser' ? 18 : player.weapon === 'weapon_burst' ? 14 : player.weapon === 'weapon_giant' ? 70 : player.weapon === 'weapon_nuke' ? 40 : 12;
    const fwdH = player.weapon === 'weapon_laser' ? 5 : player.weapon === 'weapon_giant' ? 36 : player.weapon === 'weapon_nuke' ? 40 : 6;

    if (player.weapon === 'weapon_wave' && dirY === 0) {
      // Metroid-style wave blast: instantly clears red candles and is extra strong vs flyers.
      for (const e of game.enemies) {
        if (e.kind === 'red_candle') {
          e.hp = 0;
          for (let i = 0; i < 10; i++) addParticle(e.x + rand(-8, 8), e.y + rand(-8, 8), '#9f7bff', 20, rand(-2.1, 2.1), rand(-2.2, 1.1));
          game.score += 180;
        } else {
          const waveDmg = e.kind === 'evil_suit' || player.mode === 'flying' || player.mode === 'topdown' ? 6 : 4;
          e.hp -= waveDmg;
          for (let i = 0; i < 7; i++) addParticle(e.x + rand(-6, 6), e.y + rand(-6, 6), '#7fc3ff', 16, rand(-1.8, 1.8), rand(-1.8, 0.8));
        }
      }
    }

    if (dirY === -1) {
      if (player.weapon === 'weapon_spread') {
        pushBullet(player.x + 24, player.y - 12, 0, -9.2, 10, 5, power);
        pushBullet(player.x + 24, player.y - 12, 2.1, -8.4, 10, 5, power);
        pushBullet(player.x + 24, player.y - 12, -2.1, -8.4, 10, 5, power);
      } else if (player.weapon === 'weapon_burst') {
        pushBullet(player.x + 24, player.y - 12, 0, -9.4, 11, 6, power);
        pushBullet(player.x + 24, player.y - 12, 1.2, -9.1, 11, 6, power);
        pushBullet(player.x + 24, player.y - 12, -1.2, -9.1, 11, 6, power);
      } else if (player.weapon === 'weapon_wave') {
        pushBullet(player.x + 24, player.y - 12, 0, -8.8, 28, 14, power, true, { waveMetroid: true, pierce: 999, noBank: true });
      } else if (player.weapon === 'weapon_nuke') {
        const nukeSize = Math.min(92, 36 + game.nukeBankKills * 2.2);
        pushBullet(player.x + 20, player.y - 13, 0, -6.4, nukeSize, nukeSize, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer });
      } else {
        pushBullet(player.x + 24, player.y - 12, 0, -8.8, 10, 5, power);
      }
    } else {
      if (player.weapon === 'weapon_spread') {
        pushBullet(player.x + 26, player.y - 8, 8.2, 0, 10, 5, power);
        pushBullet(player.x + 26, player.y - 8, 7.6, -2.1, 10, 5, power);
        pushBullet(player.x + 26, player.y - 8, 7.6, 2.1, 10, 5, power);
        pushBullet(player.x - 22, player.y - 7, -7.2, 0, 10, 5, power);
      } else if (player.weapon === 'weapon_burst') {
        pushBullet(player.x + 26, player.y - 8, 8.8, 0, 12, 6, power);
        pushBullet(player.x + 26, player.y - 8, 8.2, -1.9, 12, 6, power);
        pushBullet(player.x + 26, player.y - 8, 8.2, 1.9, 12, 6, power);
        pushBullet(player.x + 26, player.y - 8, 7.2, -3.1, 10, 5, power);
        pushBullet(player.x + 26, player.y - 8, 7.2, 3.1, 10, 5, power);
        pushBullet(player.x - 22, player.y - 7, -8.0, 0, 11, 6, power);
      } else if (player.weapon === 'weapon_wave') {
        pushBullet(player.x + 26, player.y - 8, 7.9, 0, 30, 16, power, true, { waveMetroid: true, pierce: 999, noBank: true, altTick: game.levelTimer });
        pushBullet(player.x - 22, player.y - 7, -7.0, 0, 28, 14, power, true, { waveMetroid: true, pierce: 999, noBank: true, altTick: game.levelTimer + 4 });
      } else if (player.weapon === 'weapon_giant') {
        pushBullet(player.x + 26, player.y - 8, 8.0, 0, 70, 36, power, false, { giant: true, pierce: 2 });
        pushBullet(player.x - 22, player.y - 7, -6.8, 0, 58, 30, power, false, { giant: true, pierce: 2 });
      } else if (player.weapon === 'weapon_nuke') {
        const nukeSize = Math.min(92, 36 + game.nukeBankKills * 2.2);
        pushBullet(player.x + 26, player.y - 8, 6.6, 0, nukeSize, nukeSize, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer });
        if (game.nukeBankKills >= 2) {
          pushBullet(player.x - 22, player.y - 7, -6.2, 0, nukeSize * 0.8, nukeSize * 0.8, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 5 });
        }
        if (game.nukeBankKills >= 5) {
          pushBullet(player.x + 24, player.y - 14, 0, -6.2, nukeSize * 0.72, nukeSize * 0.72, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 9 });
        }
        if (game.nukeBankKills >= 8) {
          pushBullet(player.x + 8, player.y - 2, 5.4, -3.4, nukeSize * 0.6, nukeSize * 0.6, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 12 });
          pushBullet(player.x + 8, player.y - 2, 5.4, 3.4, nukeSize * 0.6, nukeSize * 0.6, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 16 });
        }
        if (game.nukeBankKills >= 12) {
          pushBullet(player.x + 8, player.y - 2, -5.2, -3.2, nukeSize * 0.56, nukeSize * 0.56, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 18 });
          pushBullet(player.x + 8, player.y - 2, -5.2, 3.2, nukeSize * 0.56, nukeSize * 0.56, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 22 });
          pushBullet(player.x + 24, player.y - 8, 0, 6.0, nukeSize * 0.46, nukeSize * 0.46, power, false, { nuke: true, grow: true, noBank: false, altTick: game.levelTimer + 25 });
        }
      } else {
        pushBullet(player.x + 26, player.y - 8, 8.2, 0, fwdW, fwdH, power);
        pushBullet(player.x - 22, player.y - 7, -7.4, 0, 12, 6, power);
      }
    }

    beep(700, 0.04, 'square', 0.04, 140);
  }

  function enemyShoot(e) {
    if (e.fireCd > 0) return;
    e.fireCd = rand(70, 150);
    let vx = -3.5;
    let vy = 0;
    if (game.player.mode === 'topdown') {
      const dx = game.player.x - e.x;
      const dy = game.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      vx = (dx / d) * 3.2;
      vy = (dy / d) * 3.2;
    } else {
      vy = clamp((game.player.y - e.y) * 0.02, -2.1, 2.1);
    }
    game.bullets.push({ x: e.x, y: e.y, vx, vy, from: 'enemy', w: 10, h: 6, power: 1 });
  }

  function hitRect(a, b) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
  }

  function damagePlayer(amount) {
    const p = game.player;
    if (p.invincibleTimer > 0) return;
    if (p.inv > 0) return;
    if (p.shield > 0) {
      p.shield = Math.max(0, p.shield - 120);
      beep(230, 0.06, 'triangle', 0.05, -40);
      return;
    }
    p.health -= amount;
    p.inv = 55;
    game.shake = 8;
    beep(180, 0.12, 'sawtooth', 0.06, -120);
    for (let i = 0; i < 12; i++) addParticle(p.x + rand(-20, 20), p.y + rand(-10, 10), '#ff6a6a', 20);
    if (p.health <= 0) {
      game.lives -= 1;
      if (game.lives < 0) {
        game.state = 'gameover';
        if (game.score > game.hiScore) {
          game.hiScore = game.score;
          localStorage.setItem('btcMoonPatrolHigh', String(game.hiScore));
        }
      } else {
        resetLevel(game.levelIndex);
      }
    }
  }

  function collectPickup(type) {
    if (type === 'btc') {
      game.score += 750;
      beep(900, 0.04, 'triangle', 0.05, 120);
      beep(1200, 0.04, 'triangle', 0.04, 100);
      return;
    }
    if (type === 'weapon_spread') {
      game.player.weapon = 'weapon_spread';
      game.player.weaponTimer = 820;
      game.score += 350;
      beep(640, 0.09, 'square', 0.04, 100);
      return;
    }
    if (type === 'weapon_laser') {
      game.player.weapon = 'weapon_laser';
      game.player.weaponTimer = 780;
      game.score += 350;
      beep(760, 0.09, 'triangle', 0.04, 120);
      return;
    }
    if (type === 'weapon_wave') {
      game.player.weapon = 'weapon_wave';
      game.player.weaponTimer = 1000;
      game.score += 350;
      beep(560, 0.09, 'sawtooth', 0.04, 90);
      return;
    }
    if (type === 'weapon_burst') {
      game.player.weapon = 'weapon_burst';
      game.player.weaponTimer = 760;
      game.score += 400;
      beep(520, 0.1, 'square', 0.04, 160);
      return;
    }
    if (type === 'shield') {
      game.player.shield = 700;
      game.score += 300;
      beep(360, 0.1, 'triangle', 0.05, 40);
      return;
    }
    if (type === 'weapon_giant') {
      game.player.weapon = 'weapon_giant';
      game.player.weaponTimer = 860;
      game.score += 420;
      beep(300, 0.1, 'square', 0.05, 110);
      return;
    }
    if (type === 'weapon_nuke') {
      game.player.weapon = 'weapon_nuke';
      game.player.weaponTimer = 960;
      game.score += 520;
      beep(220, 0.14, 'sawtooth', 0.06, -30);
      return;
    }
    if (type === 'invincible') {
      game.player.invincibleTimer = 520;
      game.player.inv = 0;
      game.score += 700;
      beep(860, 0.12, 'square', 0.06, 180);
      return;
    }
    if (type === 'med') {
      game.player.health = Math.min(6, game.player.health + 1);
      game.score += 350;
      beep(820, 0.07, 'sawtooth', 0.04, 200);
    }
  }

  function nextLevel() {
    game.levelIndex += 1;
    if (game.levelIndex >= levelDefs.length) {
      game.state = 'win';
      if (game.score > game.hiScore) {
        game.hiScore = game.score;
        localStorage.setItem('btcMoonPatrolHigh', String(game.hiScore));
      }
      return;
    }
    resetLevel(game.levelIndex);
  }

  function updatePlaying() {
    if (game.paused) return;

    const def = levelDefs[game.levelIndex];
    const p = game.player;
    const prevY = p.y;
    game.levelTimer += 1;
    game.cameraX += def.speed;
    game.shake *= 0.88;
    if (game.sfxCooldown > 0) game.sfxCooldown--;
    if (game.enemyCooldown > 0) game.enemyCooldown--;
    if (game.obstacleCooldown > 0) game.obstacleCooldown--;

    p.fireCdF = Math.max(0, p.fireCdF - 1);
    p.fireCdU = Math.max(0, p.fireCdU - 1);
    p.fireFxF = Math.max(0, p.fireFxF - 1);
    p.fireFxU = Math.max(0, p.fireFxU - 1);
    p.inv = Math.max(0, p.inv - 1);
    p.rapid = Math.max(0, p.rapid - 1);
    p.shield = Math.max(0, p.shield - 1);
    p.invincibleTimer = Math.max(0, p.invincibleTimer - 1);
    p.weaponTimer = Math.max(0, p.weaponTimer - 1);
    if (p.weaponTimer <= 0) p.weapon = 'basic';
    p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);
    p.coyote = Math.max(0, p.coyote - 1);

    const left = keys.has('arrowleft');
    const right = keys.has('arrowright');
    const up = keys.has('arrowup');
    const down = keys.has('arrowdown');
    if (up) p.jumpBuffer = 8;

    if (def.type === 'topdown' || def.type === 'flying') {
      const accelY = def.type === 'flying' ? 0.46 : 0.4;
      if (up) p.vy -= accelY;
      if (down) p.vy += accelY;
      const lrAccel = def.type === 'flying' ? 0.34 : 0.3;
      if (left) p.vx -= lrAccel;
      if (right) p.vx += lrAccel * 0.95;
      p.vx += def.type === 'flying' ? 0.08 : 0.06;
      p.vx *= 0.84;
      p.vy *= 0.84;
      p.x = clamp(p.x + p.vx, 56, 450);
      p.y = clamp(p.y + p.vy, 68, H - 76);
      p.onGround = false;
    } else if (def.type === 'underwater') {
      if (left) p.vx -= 0.2;
      if (right) p.vx += 0.2;
      if (up) p.vy -= 0.2;
      if (down) p.vy += 0.2;
      p.vx += 0.04;
      p.vy += 0.12;
      if (!up && !down) p.vy -= 0.04;
      p.vx *= 0.9;
      p.vy *= 0.93;
      p.x = clamp(p.x + p.vx, 50, W - 80);
      p.y += p.vy;
      p.y += Math.sin(game.levelTimer * 0.12) * 0.35;
      if (p.y > GROUND_Y - 20) {
        p.y = GROUND_Y - 20;
        p.vy = -1.2;
        p.onGround = true;
        p.coyote = 8;
      } else {
        p.onGround = false;
      }
      if (p.y < 92) p.y = 92;
    } else {
      if (left) p.vx -= 0.52;
      if (right) p.vx += 0.48;
      // Keep some camera-friendly pullback, but allow deeper forward position.
      p.vx += (260 - p.x) * 0.005;
      p.vx += 0.04;
      p.vx *= 0.84;
      p.x = clamp(p.x + p.vx, 90, 520);
      const roadWave = roadHeightAt(game.cameraX + p.x, def.type);
      const gravity = def.type === 'bubble' ? 0.45 : 0.52;
      p.vy += gravity;
      p.y += p.vy;
      const floor = GROUND_Y - 20 + roadWave;
      if (p.y >= floor) {
        p.y = floor;
        p.vy = 0;
        p.onGround = true;
        p.coyote = 8;
      } else {
        p.onGround = false;
      }
      if (p.jumpBuffer > 0 && p.coyote > 0) {
        let jumpVy = def.type === 'bubble' ? -11.2 : -14.4;
        p.vy = jumpVy;
        p.onGround = false;
        p.onBank = false;
        p.jumpBuffer = 0;
        p.coyote = 0;
        beep(330, 0.06, 'square', 0.05, -90);
      }
      if (def.type === 'tower' && up && game.levelTimer % 8 === 0) {
        p.vy -= 0.35;
      }
    }

    const fireBoth = keys.has(' ');
    if (fireBoth) {
      shoot(p, 0);
      shoot(p, -1);
    }

    const progress = def.type === 'boss' ? 1 : clamp(game.cameraX / Math.max(1, def.length), 0, 1);
    const levelBoost = 1 + game.levelIndex * 0.1;
    const flyBoost = def.type === 'flying' ? 1.55 : 1;
    const enemyChance = def.enemyRate * (0.28 + progress * 1.05) * levelBoost * flyBoost;
    const obstacleChance = def.obstacleRate * (0.85 + progress * 0.7);
    if (game.enemyCooldown <= 0 && Math.random() < enemyChance) {
      spawnEnemy(def);
      if (def.type === 'flying') {
        game.enemyCooldown = rand(Math.max(10, 26 - game.levelIndex), Math.max(18, 44 - game.levelIndex));
      } else {
        game.enemyCooldown = rand(Math.max(22, 56 - game.levelIndex * 2), Math.max(36, 96 - game.levelIndex * 2));
      }
    }
    if (game.obstacleCooldown <= 0 && Math.random() < obstacleChance) {
      spawnObstacle(def);
      game.obstacleCooldown = rand(24, 54);
    }
    if (Math.random() < 0.0025 + progress * 0.0012) spawnPickup(def);

    for (const b of game.bullets) {
      b.x += b.vx;
      if (b.grow) {
        b.w = Math.min(180, b.w + 0.38 + game.nukeBankKills * 0.02);
        b.h = Math.min(180, b.h + 0.38 + game.nukeBankKills * 0.02);
      }
      if (b.wave) {
        b.phase += 0.28;
        b.y += b.vy + Math.sin(b.phase) * 1.7;
      } else {
        b.y += b.vy;
      }
    }
    game.bullets = game.bullets.filter((b) => b.x > -40 && b.x < W + 40 && b.y > -40 && b.y < H + 40);

    for (const e of game.enemies) {
      if (def.type === 'topdown') {
        e.x += e.vx;
        e.y += e.vy;
        if (e.x < 20 || e.x > W - 20) e.vx *= -1;
      } else {
        e.x += e.vx;
        if (e.kind === 'red_candle') {
          const enemyWave = roadHeightAt(game.cameraX + e.x, def.type);
          const floorE = GROUND_Y - 18 + enemyWave;
          e.vy += 0.26;
          e.y += e.vy;
          if (e.y >= floorE) {
            e.y = floorE;
            e.vy = -rand(3.2, 6.1);
          }
          e.vx -= 0.01;
          e.vx = Math.max(e.vx, -5.4);
        } else {
          e.y += e.vy;
        }
      }
      e.fireCd -= 1;
      if (e.kind !== 'red_candle' || def.type === 'topdown') {
        if (Math.random() < 0.01 || (def.type === 'topdown' && Math.random() < 0.02)) enemyShoot(e);
      }
    }

    for (const o of game.obstacles) {
      // World-anchored banks: fixed to moon terrain, camera scroll handles motion.
      o.x = o.worldX - game.cameraX;
      const wave = roadHeightAt(o.worldX, def.type);
      o.stompCooldown = Math.max(0, (o.stompCooldown || 0) - 1);
      if ((o.sink || 0) < (o.sinkTarget || 0)) {
        o.sink = Math.min(o.sinkTarget, o.sink + 2.2);
      }
      o.hitFx = Math.max(0, (o.hitFx || 0) - 1);
      o.y = GROUND_Y - o.h + 2 + wave + (o.sink || 0);
      // If bank has sunk deeply enough, it collapses and explodes.
      if (!o.dead && (o.sink || 0) >= Math.min(o.h * 0.7, 46)) {
        explodeBank(o, 1.1);
      }
    }

    for (const pck of game.pickups) {
      pck.x += pck.vx;
      pck.t += 0.08;
      pck.y = pck.y0 + Math.sin(pck.t) * 8;
    }

    if (def.type === 'boss' && game.boss) {
      const b = game.boss;
      b.t += 1;
      b.x += (W - 220 - b.x) * 0.03;
      b.y = 170 + Math.sin(b.t * 0.03) * 90;
      b.fireCd--;
      if (b.fireCd <= 0) {
        b.fireCd = b.phase === 0 ? 44 : 28;
        const dx = game.player.x - b.x;
        const dy = game.player.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const spread = b.phase ? 0.25 : 0.08;
        for (let i = -1; i <= 1; i++) {
          game.bullets.push({
            x: b.x - 70,
            y: b.y + i * 18,
            vx: (dx / d) * 3.2 - 2.2,
            vy: (dy / d) * 3.2 + i * spread * 8,
            from: 'enemy',
            w: 9,
            h: 5,
            power: 1
          });
        }
        beep(170, 0.1, 'sawtooth', 0.05, -20);
      }
      if (b.hp < b.maxHp * 0.45) b.phase = 1;
      if (b.hp <= 0) {
        for (let i = 0; i < 80; i++) addParticle(b.x + rand(-70, 70), b.y + rand(-70, 70), '#f7931a', 45, rand(-4, 4), rand(-4, 4));
        game.score += 25000;
        beep(320, 0.2, 'square', 0.08, 200);
        nextLevel();
      }
    }

    for (const b of game.bullets) {
      if (b.from === 'player') {
        for (const e of game.enemies) {
          if (hitRect({ x: b.x, y: b.y, w: b.w, h: b.h }, e)) {
            e.hp -= b.power;
            if (!b.pierce) b.x = W + 99;
            if (b.pierce) b.pierce--;
            addParticle(e.x, e.y, '#ffcf66', 16);
            if (e.hp <= 0) {
              game.score += 220;
              for (let i = 0; i < 18; i++) addParticle(e.x + rand(-8, 8), e.y + rand(-8, 8), '#ff5a5a', 24, rand(-2.6, 2.6), rand(-2.8, 1.6));
              for (let i = 0; i < 10; i++) addParticle(e.x + rand(-6, 6), e.y + rand(-6, 6), '#ffd27a', 20, rand(-2, 2), rand(-2.2, 1.2));
              if (Math.random() < 0.05) spawnPickup(def, e.x, e.y);
              beep(220, 0.09, 'sawtooth', 0.06, -120);
            }
          }
        }
        if (game.boss) {
          const bossRect = { x: game.boss.x, y: game.boss.y, w: game.boss.w, h: game.boss.h };
          if (hitRect({ x: b.x, y: b.y, w: b.w, h: b.h }, bossRect)) {
            game.boss.hp -= b.power;
            b.x = W + 99;
            game.score += 35;
            addParticle(bossRect.x - 60, bossRect.y + rand(-50, 50), '#ffd480', 14);
          }
        }
        for (const o of game.obstacles) {
          if (o.dead) continue;
          if (b.noBank) continue;
          if (hitRect({ x: b.x, y: b.y, w: b.w, h: b.h }, { x: o.x, y: o.y + o.h * 0.5, w: o.w - 6, h: o.h })) {
            if (!b.pierce) b.x = W + 99;
            if (b.pierce) b.pierce--;
            o.hp -= b.nuke ? 999 : b.power;
            o.hitFx = 8;
            if (o.hp <= 0) {
              const scale = b.nuke ? Math.min(7.2, 1.2 + game.nukeBankKills * 0.22) : 1;
              explodeBank(o, scale);
              if (b.nuke) game.nukeBankKills += 1;
            } else {
              for (let i = 0; i < 8; i++) addParticle(o.x + rand(-o.w * 0.3, o.w * 0.3), o.y + rand(4, o.h - 4), '#a3b5d3', 14, rand(-1.4, 1.4), rand(-1.6, 0.3));
              beep(240, 0.04, 'square', 0.03, -50);
            }
          }
        }
      } else {
        const playerRect = { x: game.player.x, y: game.player.y, w: game.player.w, h: game.player.h };
        if (hitRect({ x: b.x, y: b.y, w: b.w, h: b.h }, playerRect)) {
          b.x = -999;
          damagePlayer(1);
        }
      }
    }

    game.enemies = game.enemies.filter((e) => e.hp > 0 && e.x > -100 && e.x < W + 120 && e.y > -120 && e.y < H + 120);
    game.obstacles = game.obstacles.filter((o) => !o.dead && o.x > -120);
    game.pickups = game.pickups.filter((pck) => pck.x > -50 && pck.y > -50 && pck.y < H + 50);

    const playerRect = { x: p.x, y: p.y, w: p.w, h: p.h };
    p.onBank = false;

    for (const e of game.enemies) {
      if (hitRect(playerRect, e)) {
        if (p.invincibleTimer > 0) {
          e.hp = 0;
          for (let i = 0; i < 16; i++) addParticle(e.x + rand(-8, 8), e.y + rand(-8, 8), '#ff9a66', 20, rand(-2.4, 2.4), rand(-2.5, 1.0));
          game.score += 140;
        } else {
          damagePlayer(1);
          e.hp -= 2;
        }
      }
    }

    for (const o of game.obstacles) {
      const obstacleRect = { x: o.x, y: o.y + o.h * 0.5, w: o.w - 14, h: o.h };
      if (hitRect(playerRect, obstacleRect)) {
        const playerHalfH = p.h * 0.5;
        const playerHalfW = p.w * 0.5;
        const playerBottomPrev = prevY + playerHalfH;
        const playerBottomNow = p.y + playerHalfH;
        const bankTop = o.y;
        const horizontalOverlap = Math.abs(p.x - o.x) < playerHalfW + (o.w - 14) * 0.5;
        const landedFromAbove = horizontalOverlap && p.vy >= 0 && playerBottomPrev <= bankTop + 6 && playerBottomNow >= bankTop - 2;
        if (landedFromAbove && def.type !== 'underwater') {
          const impactVy = p.vy;
          // Snap to exact bank top to avoid clipping/falling-through jitter.
          p.y = bankTop - playerHalfH;
          p.vy = 0;
          p.onGround = true;
          p.onBank = true;
          p.coyote = Math.max(p.coyote, 10);
          // One stomp now forces a quick collapse/explosion.
          const collapseTarget = Math.min(o.h * 0.74, 50) + 2;
          if (!(o.stompCount > 0)) {
            o.stompCount = 1;
            o.sinkTarget = collapseTarget;
          } else {
            o.sinkTarget = Math.max(o.sinkTarget || 0, collapseTarget);
          }
          if (impactVy > 1.1 && (o.stompCooldown || 0) <= 0) {
            o.stompCooldown = 12;
            for (let i = 0; i < 12; i++) addParticle(o.x + rand(-o.w * 0.3, o.w * 0.3), o.y + o.h - 2, '#95a8cb', 18, rand(-1.1, 1.1), rand(-2.1, -0.5));
            beep(170, 0.06, 'square', 0.04, -35);
          }
        }
      }
    }

    if (game.boss && hitRect(playerRect, { x: game.boss.x, y: game.boss.y, w: game.boss.w, h: game.boss.h })) {
      if (p.invincibleTimer <= 0) damagePlayer(2);
    }

    if (p.invincibleTimer > 0) {
      // Smash aura destroys nearby enemies/banks while invincible.
      const r = 135 + Math.sin(game.levelTimer * 0.2) * 16;
      for (const e of game.enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= r) {
          e.hp = 0;
          for (let i = 0; i < 12; i++) addParticle(e.x + rand(-8, 8), e.y + rand(-8, 8), '#ff9464', 18, rand(-2.2, 2.2), rand(-2.4, 1));
          game.score += 120;
        }
      }
      for (const o of game.obstacles) {
        if (o.dead) continue;
        if (Math.hypot(o.x - p.x, (o.y + o.h * 0.5) - p.y) <= r) {
          explodeBank(o, 1.9);
        }
      }
      // Fill with explosions, then smoke near end.
      if (p.invincibleTimer > 130) {
        for (let i = 0; i < 7; i++) addParticle(rand(0, W), rand(50, H - 40), choice(['#ff7e52', '#ffd173', '#ff5f5f']), 16, rand(-1.5, 1.5), rand(-1.8, 0.6));
      } else {
        for (let i = 0; i < 8; i++) addParticle(rand(0, W), rand(40, H - 30), choice(['#555', '#666', '#777', '#888']), 20, rand(-0.8, 0.8), rand(-1.2, -0.2));
      }
    }

    for (const pck of game.pickups) {
      if (hitRect(playerRect, pck)) {
        collectPickup(pck.type);
        pck.x = -999;
      }
    }

    for (const part of game.particles) {
      part.x += part.vx;
      part.y += part.vy;
      part.vy += 0.05;
      part.life -= 1;
    }
    game.particles = game.particles.filter((p2) => p2.life > 0);

    if (def.type !== 'boss' && game.cameraX >= def.length) {
      game.score += 4000;
      beep(240, 0.2, 'triangle', 0.07, 130);
      nextLevel();
    }
  }

  function drawPixelText(txt, x, y, size = 34, color = '#fff', shadow = '#000') {
    ctx.save();
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = shadow;
    ctx.fillText(txt, x + Math.max(2, size * 0.07), y + Math.max(2, size * 0.07));
    ctx.fillStyle = color;
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function drawBitcoinGlyph(x, y, s = 2, color = '#f0c642', outline = '#6b3d00') {
    const r = (dx, dy, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + dx * s, y + dy * s, w * s, h * s);
    };
    r(0, 0, 6, 1, outline);
    r(0, 1, 1, 7, outline);
    r(0, 8, 6, 1, outline);
    r(5, 2, 1, 2, outline);
    r(5, 5, 1, 2, outline);
    r(1, 1, 4, 1, color);
    r(1, 7, 4, 1, color);
    r(1, 4, 4, 1, color);
    r(1, 2, 1, 2, color);
    r(1, 5, 1, 2, color);
    r(4, 2, 1, 2, color);
    r(4, 5, 1, 2, color);
    r(2, -1, 1, 11, color); // center line
  }

  function drawBackground(def) {
    const t = game.levelTimer;
    const tile = 8;
    const themes = {
      miami: { sky: '#6a8cff', sky2: '#8fb0ff', hill1: '#3e5fc7', hill2: '#2e4ba1', ground1: '#6a6f86', ground2: '#8a90a8' },
      vegas: { sky: '#7f63c7', sky2: '#a289e0', hill1: '#5f46a8', hill2: '#44367f', ground1: '#655b7c', ground2: '#8679a6' },
      ocean: { sky: '#2b7bb5', sky2: '#4ea3d5', hill1: '#1f5c8b', hill2: '#17476d', ground1: '#146083', ground2: '#1f7ba5' },
      sky: { sky: '#63a1ff', sky2: '#9bc8ff', hill1: '#4472d1', hill2: '#3155aa', ground1: '#647ca3', ground2: '#86a0c7' },
      grid: { sky: '#54508b', sky2: '#7a74b0', hill1: '#403b75', hill2: '#302d5a', ground1: '#595775', ground2: '#7a7697' },
      cave: { sky: '#5f3f2b', sky2: '#7d583f', hill1: '#4c3425', hill2: '#352219', ground1: '#6f5039', ground2: '#927056' },
      towers: { sky: '#507d9f', sky2: '#79a5c3', hill1: '#375b76', hill2: '#29455a', ground1: '#5a6e84', ground2: '#7d93aa' },
      citadel: { sky: '#4d4d4d', sky2: '#6a6a6a', hill1: '#363636', hill2: '#252525', ground1: '#585858', ground2: '#7a7a7a' }
    };
    const c = themes[def.theme] || themes.miami;

    // More natural sky gradient + horizon haze.
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    skyGrad.addColorStop(0, c.sky2);
    skyGrad.addColorStop(0.52, c.sky);
    skyGrad.addColorStop(1, c.hill2);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.72);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, H * 0.46, W, H * 0.12);

    // Pixel clouds.
    const cloudColor = '#f7fbff';
    for (let i = 0; i < 6; i++) {
      const cx = W - ((t * (0.5 + i * 0.08) + i * 190) % (W + 120)) - 60;
      const cy = 22 + (i % 3) * 22;
      ctx.fillStyle = cloudColor;
      ctx.fillRect(cx, cy, tile * 4, tile * 2);
      ctx.fillRect(cx + tile * 2, cy - tile, tile * 5, tile * 2);
      ctx.fillRect(cx + tile * 6, cy, tile * 3, tile * 2);
    }

    // Distant atmospheric mountain layer.
    ctx.fillStyle = 'rgba(35,48,78,0.35)';
    for (let i = -1; i < 7; i++) {
      const mx = W - ((t * 0.22 + i * 210) % (W + 220)) - 180;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y - 86);
      ctx.lineTo(mx + 80, GROUND_Y - 156);
      ctx.lineTo(mx + 170, GROUND_Y - 92);
      ctx.lineTo(mx + 250, GROUND_Y - 146);
      ctx.lineTo(mx + 340, GROUND_Y - 86);
      ctx.closePath();
      ctx.fill();
    }

    // Parallax hills (Mario-ish block silhouettes).
    for (let layer = 0; layer < 2; layer++) {
      const depth = 0.45 + layer * 0.35;
      const baseY = GROUND_Y - 70 + layer * 20;
      ctx.fillStyle = layer === 0 ? c.hill1 : c.hill2;
      for (let i = -1; i < 8; i++) {
        const hx = W - ((t * depth + i * 160) % (W + 160)) - 160;
        ctx.fillRect(hx + 8, baseY - 48, 20, 48);
        ctx.fillRect(hx + 28, baseY - 72, 24, 72);
        ctx.fillRect(hx + 52, baseY - 88, 26, 88);
        ctx.fillRect(hx + 78, baseY - 72, 24, 72);
        ctx.fillRect(hx + 102, baseY - 52, 24, 52);
        ctx.fillRect(hx + 126, baseY - 30, 26, 30);
      }
    }

    // Theme accents so locations feel distinct.
    if (def.theme === 'vegas') {
      for (let i = 0; i < 5; i++) {
        const x = W - ((t * 0.9 + i * 210) % (W + 160));
        ctx.fillStyle = '#2d2147';
        ctx.fillRect(x, GROUND_Y - 150, 52, 120);
        ctx.fillStyle = '#f4b94a';
        ctx.fillRect(x + 6, GROUND_Y - 142, 40, 6);
        ctx.fillStyle = '#ff6f9b';
        ctx.fillRect(x + 10, GROUND_Y - 92, 8, 56);
        ctx.fillRect(x + 24, GROUND_Y - 124, 8, 88);
      }
    } else if (def.theme === 'miami') {
      for (let i = 0; i < 6; i++) {
        const x = W - ((t * 1.1 + i * 180) % (W + 120));
        ctx.fillStyle = '#6b4f2f';
        ctx.fillRect(x + 18, GROUND_Y - 90, 6, 60);
        ctx.fillStyle = '#2dbf7f';
        ctx.fillRect(x + 2, GROUND_Y - 110, 40, 10);
        ctx.fillRect(x + 6, GROUND_Y - 122, 32, 8);
      }
    } else if (def.theme === 'ocean') {
      for (let i = 0; i < 5; i++) {
        const x = W - ((t * 0.7 + i * 210) % (W + 170));
        ctx.fillStyle = '#1e749b';
        ctx.fillRect(x, GROUND_Y - 56, 54, 6);
        ctx.fillStyle = '#74d7ff';
        ctx.fillRect(x + 8, GROUND_Y - 58, 30, 2);
      }
    } else if (def.theme === 'towers') {
      for (let i = 0; i < 5; i++) {
        const x = W - ((t * 0.85 + i * 185) % (W + 150));
        ctx.fillStyle = '#26384f';
        ctx.fillRect(x, GROUND_Y - 140, 22, 110);
        ctx.fillRect(x + 24, GROUND_Y - 170, 28, 140);
        ctx.fillStyle = '#8fb2d6';
        ctx.fillRect(x + 28, GROUND_Y - 166, 20, 4);
      }
    }

    if (def.type !== 'topdown') {
      const groundTop = def.type === 'underwater' ? '#1d8db8' : c.ground2;
      const groundBottom = def.type === 'underwater' ? '#0f5e82' : c.ground1;
      for (let x = 0; x < W; x += 8) {
        const wave = roadHeightAt(game.cameraX + x, def.type);
        const topY = GROUND_Y + 6 + wave;
        ctx.fillStyle = groundTop;
        ctx.fillRect(x, topY, 8, 18);
        ctx.fillStyle = groundBottom;
        ctx.fillRect(x, topY + 18, 8, H - topY);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, topY, 8, 2);
      }

      // Scrolling brick/checker ground tiles.
      for (let i = 0; i < Math.ceil(W / tile) + 2; i++) {
        const x = W - ((t * def.speed + i * tile) % (W + tile));
        const wave = roadHeightAt(game.cameraX + x, def.type);
        ctx.fillStyle = i % 2 ? '#9ea4bc' : '#7a829b';
        ctx.fillRect(x, GROUND_Y + 10 + wave, tile, 6);
        ctx.fillStyle = i % 2 ? '#5a6074' : '#666f86';
        ctx.fillRect(x, GROUND_Y + 24 + ((i % 3) * 2) + wave, tile, 8);
      }
    }

    // NES scanline finish.
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < H; y += 2) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  function drawPlayer() {
    const p = game.player;
    if (!p) return;

    if (p.inv > 0 && ((p.inv / 4) | 0) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    const invScale = p.invincibleTimer > 0 ? 1.42 + Math.sin(game.levelTimer * 0.25) * 0.1 : 1.08;
    ctx.scale(invScale, invScale);
    if (p.invincibleTimer > 0) {
      ctx.strokeStyle = `rgba(255,${180 + ((game.levelTimer * 6) % 60)},120,0.8)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -8, 42, 30, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (p.mode === 'topdown') {
      // Top view hero: black round top hat with Bitcoin B.
      ctx.fillStyle = '#070707';
      ctx.beginPath();
      ctx.arc(0, -7, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141414';
      ctx.beginPath();
      ctx.arc(0, -7, 20, 0, Math.PI * 2);
      ctx.fill();
      drawBitcoinGlyph(-5, -22, 1.6, '#f0c642', '#7a4f00');
      ctx.fillStyle = '#ffdca8';
      ctx.beginPath();
      ctx.arc(0, 5, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(-12, 12, 24, 20);
      ctx.fillStyle = '#2c63b9';
      ctx.fillRect(-11, 14, 22, 14);
      ctx.fillStyle = '#87d2ff';
      ctx.fillRect(-8, 16, 16, 4);
      ctx.fillStyle = '#87d2ff';
      ctx.fillRect(-20, 17, 8, 3);
      ctx.fillRect(12, 17, 8, 3);
      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(80,220,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 8, 24 + Math.sin(game.levelTimer * 0.3) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (p.mode === 'flying') {
      // Flying level alt vehicle: moon-buggy airplane hybrid.
      const px = (x, y, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect((x | 0) * 2, (y | 0) * 2, (w | 0) * 2, (h | 0) * 2);
      };
      px(-22, -6, 46, 10, '#13284f');      // fuselage outline
      px(-20, -5, 42, 8, '#2e63b6');       // fuselage
      px(-6, -14, 14, 7, '#7eb4ea');       // canopy
      px(-28, -4, 10, 4, '#1f3f73');       // tail body
      px(-32, -7, 6, 3, '#9db9df');        // tail fin
      px(22, -4, 8, 4, '#5c789f');         // nose
      px(28, -3, 4, 2, '#d9e9ff');         // nose tip
      px(-10, 1, 26, 3, '#1a3b6c');        // wing center
      px(-26, 0, 16, 4, '#325f9a');        // left wing
      px(14, 0, 16, 4, '#325f9a');         // right wing
      px(-4, -19, 10, 5, '#090c14');       // top hat
      drawBitcoinGlyph(-1, -38, 1.2, '#f0c642', '#7a4f00');
      px(-2, -14, 6, 4, '#f4d4a8');        // face
      px(-1, -13, 4, 2, '#bb3b3b');        // smile
      px(-9, -12, 6, 2, '#7f95bb');        // left gun
      px(5, -12, 7, 2, '#7f95bb');         // right gun
      if (p.fireFxF > 0) {
        px(31, -4, 4, 2, '#ff8f1f');
        px(34, -4, 4, 1, '#ffe28a');
      }
      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(80,220,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(2, -2, 44, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect((x | 0) * 2, (y | 0) * 2, (w | 0) * 2, (h | 0) * 2);
    };

    // Moon buggy/tank body (more edges/panel detail + richer color accents).
    px(-24, -5, 52, 18, '#0b1733');      // outline hull
    px(-22, -4, 48, 16, '#1f4b95');      // main body
    px(-20, -2, 44, 13, '#2f66bf');      // upper body tone
    px(-16, -11, 32, 10, '#89b6ea');     // canopy/upper plate
    px(-14, -9, 28, 4, '#d5e7fb');       // highlight strip
    px(-22, -3, 10, 3, '#355fa4');       // side color block
    px(-8, -3, 9, 3, '#486fcc');         // side color block
    px(3, -3, 10, 3, '#3a5ca0');         // side color block
    px(16, -3, 8, 3, '#4978c7');         // side color block
    px(-24, 10, 52, 3, '#0a1020');       // undercarriage
    px(-19, 4, 11, 2, '#3a76c9');        // panel lines
    px(-6, 4, 9, 2, '#3a76c9');
    px(6, 4, 10, 2, '#3a76c9');
    px(-17, 7, 35, 1, '#142a55');        // seam
    px(-22, 1, 5, 2, '#91b5e2');         // bolts/highlights
    px(-11, 1, 5, 2, '#91b5e2');
    px(2, 1, 5, 2, '#91b5e2');
    px(13, 1, 5, 2, '#91b5e2');

    // Front visor and nose.
    px(16, -6, 8, 7, '#1b385f');
    px(17, -5, 6, 5, '#79d3ff');
    px(18, -4, 4, 2, '#d6f8ff');
    px(14, -1, 2, 4, '#7f95bb');         // nose bracket
    px(24, -1, 2, 4, '#7f95bb');

    // Rear gun pods + top cannon rail.
    px(-26, -12, 8, 4, '#304564');
    px(-32, -11, 6, 2, '#8aa4cd');
    px(-26, -7, 8, 3, '#263a57');
    px(-32, -6, 6, 2, '#8aa4cd');
    px(-20, -14, 14, 2, '#6f86ae');
    px(-21, -13, 2, 3, '#9db9df');
    // Backwards gun on buggy.
    px(-24, -16, 10, 3, '#4d678f');      // turret mount
    px(-33, -15, 9, 2, '#7f95bb');       // rear barrel
    px(-36, -15, 3, 1, '#c7d7ef');       // rear tip

    // Wheels (3 wheels with bobble action).
    const wheelXs = [-14, 0, 14];
    for (const wx of wheelXs) {
      const bob = Math.sin(game.levelTimer * 0.25 + wx) > 0 ? 0 : 1;
      px(wx, 9 + bob, 7, 7, '#0c0c0c');
      px(wx + 1, 10 + bob, 5, 5, '#4d78b0');
      px(wx + 2, 11 + bob, 3, 3, '#7fb1ea');
      px(wx + 3, 12 + bob, 1, 1, '#d8ecff');
    }

    // Turret housing.
    px(-14, -8, 12, 6, '#5d79a8');
    px(-13, -7, 10, 4, '#9db9df');
    px(-17, -7, 4, 2, '#2f4e7f');
    px(-19, -7, 2, 1, '#d82828');

    // Arms and pistols (now full suit sleeves).
    px(-16, -18, 9, 3, '#121823');       // left sleeve
    px(4, -16, 13, 3, '#121823');        // right sleeve
    px(-15, -18, 2, 3, '#dde7f9');       // cuff
    px(12, -16, 2, 3, '#dde7f9');        // cuff
    px(15, -17, 10, 3, '#7f95bb');       // bigger forward gun body
    px(25, -16, 5, 1, '#c7d7ef');        // forward barrel tip
    px(-18, -33, 3, 12, '#7f95bb');      // bigger up gun body (left of face)
    px(-19, -35, 5, 2, '#c7d7ef');       // up gun muzzle
    px(-13, -18, 2, 2, '#f4d4a8');       // left hand
    px(14, -16, 2, 2, '#f4d4a8');        // right hand

    // Body: clear suit and tie silhouette.
    px(-4, -18, 16, 13, '#060b14');      // jacket core
    px(-4, -18, 4, 8, '#121823');        // left lapel
    px(8, -18, 4, 8, '#121823');         // right lapel
    px(1, -17, 6, 6, '#e4ebfa');         // shirt block
    px(3, -16, 2, 2, '#0d1422');         // collar left
    px(5, -16, 2, 2, '#0d1422');         // collar right
    px(4, -15, 2, 8, '#bd2f2f');         // tie
    px(3, -8, 4, 2, '#8f2323');          // tie knot tail

    // Rebalanced face: tall, readable, and cleaner under the hat.
    px(-6, -43, 25, 24, '#f4d4a8');
    px(-8, -42, 4, 13, '#f0b64f');       // hair left
    px(19, -42, 4, 13, '#f0b64f');       // hair right
    px(0, -24, 14, 6, '#dfaa52');        // beard base
    px(2, -23, 10, 2, '#f1c980');        // beard highlight
    px(3, -20, 10, 2, '#bb3b3b');        // smile mouth
    px(4, -21, 8, 1, '#ffd9b3');         // smile shine
    px(3, -19, 1, 1, '#ffd9b3');         // smile corner left
    px(12, -19, 1, 1, '#ffd9b3');        // smile corner right
    // Bigger, rounder goggles over eye line: brown rims + red lenses.
    px(0, -36, 5, 1, '#5a3415');         // left brow
    px(10, -36, 5, 1, '#5a3415');        // right brow
    const drawFaceGoggle = (cx, cy, r) => {
      ctx.fillStyle = '#5a3415';
      ctx.beginPath();
      ctx.arc(cx * 2, cy * 2, r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8e1111';
      ctx.beginPath();
      ctx.arc(cx * 2, cy * 2, (r - 1.0) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d36262';
      ctx.beginPath();
      ctx.arc((cx - 1.3) * 2, (cy - 1.1) * 2, 0.9 * 2, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFaceGoggle(2.0, -32.5, 4.4);
    drawFaceGoggle(13.0, -32.5, 4.4);
    px(5, -33, 5, 1, '#3c220f');         // strap/bridge

    // Top hat kept high for clear face readability.
    px(-7, -60, 28, 17, '#090c14');      // crown
    px(-11, -43, 36, 5, '#090c14');      // brim
    px(-5, -58, 23, 2, '#1a2130');       // highlight edge
    drawBitcoinGlyph(9, -94, 2.2, '#f0c642', '#7a4f00');

    // Sunroof frame.
    px(-3, -12, 2, 6, '#7a90b8');
    px(10, -12, 2, 6, '#7a90b8');

    if (p.fireFxF > 0) {
      px(28, -17, 4, 3, '#ff8f1f');
      px(30, -16, 7, 1, '#ffe28a');
      // Backwards gun flash.
      px(-38, -16, 4, 2, '#ff8f1f');
      px(-41, -16, 3, 1, '#ffe28a');
    }
    if (p.fireFxU > 0) {
      px(-19, -37, 5, 3, '#ff8f1f');
      px(-18, -41, 2, 4, '#ffe28a');
    }

    if (p.rapid > 0) {
      ctx.fillStyle = '#f7931a';
      ctx.fillRect(-8, -8, 6, 6);
    }

    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(80,220,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -4, 36, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawEnemies() {
    for (const e of game.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.kind === 'evil_suit') {
        const s = Math.max(1, e.w / 34);
        ctx.scale(s, s);
        // Flying enemy variant: evil suit + tie.
        ctx.fillStyle = '#0e1118';
        ctx.fillRect(-12, -14, 24, 26);
        ctx.fillStyle = '#202734';
        ctx.fillRect(-10, -12, 20, 20);
        ctx.fillStyle = '#f2d6b2';
        ctx.fillRect(-6, -20, 12, 8);
        ctx.fillStyle = '#d22a2a';
        ctx.fillRect(-1, -6, 2, 10);   // tie
        ctx.fillStyle = '#8fa6d4';
        ctx.fillRect(-17, -6, 5, 3);   // left wing/arm
        ctx.fillRect(12, -6, 5, 3);    // right wing/arm
        ctx.fillStyle = '#ff6a6a';
        ctx.fillRect(-4, -17, 2, 2);   // eye left
        ctx.fillRect(2, -17, 2, 2);    // eye right
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-10, 12, 20, 3);  // shadow
        ctx.restore();
        continue;
      }
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-12, 16, 24, 4); // shadow
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -20, 4, 40); // wick
      ctx.fillStyle = '#8e1f1f';
      ctx.fillRect(-11, -8, 22, 26); // body
      ctx.fillStyle = '#d33d3d';
      ctx.fillRect(-9, -6, 18, 9); // highlight band
      ctx.fillStyle = '#701515';
      ctx.fillRect(-9, 14, 18, 3);
      ctx.fillStyle = '#ffb3b3';
      ctx.fillRect(-3, -2, 6, 8);
      ctx.fillStyle = '#ffcf6a';
      ctx.fillRect(-1, -24, 2, 3); // flame
      ctx.restore();
    }
  }

  function drawBoss() {
    if (!game.boss) return;
    const b = game.boss;
    ctx.save();
    ctx.translate(b.x, b.y);
    const px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x * 2, y * 2, w * 2, h * 2);
    };
    px(-34, -30, 68, 50, '#2d2d2d');
    px(-30, -26, 60, 42, '#4a4a4a');
    px(-24, -24, 48, 24, '#f0d2aa');
    px(-20, -23, 16, 8, '#1a1a1a');
    px(4, -23, 16, 8, '#1a1a1a');
    px(-7, -10, 14, 4, '#f7931a');
    px(-10, 4, 20, 10, '#0f0f0f');
    px(-40, 10, 10, 4, '#5f5f5f');
    px(30, 10, 10, 4, '#5f5f5f');
    ctx.restore();

    const bw = 320;
    const bh = 16;
    const x = W * 0.5 - bw * 0.5;
    const y = 24;
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(x, y, bw * (b.hp / b.maxHp), bh);
    drawPixelText('SATOSHI CORE', W * 0.5, y - 8, 11, '#fff', '#000');
  }

  function drawPickups() {
    for (const p of game.pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + Math.sin(game.levelTimer * 0.2 + p.t) * 0.06;
      ctx.scale(pulse, pulse);
      const outerR = p.w * 0.52;
      const innerR = p.w * 0.45;
      const ringR = p.w * 0.32;
      // Big round bitcoin coin.
      ctx.fillStyle = '#6b3d00';
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7931a';
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd583';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
      if (p.type === 'btc') {
        drawBitcoinGlyph(-7, -13, 2.2, '#fff1c9', '#b26e12');
      } else {
        const letters = {
          weapon_spread: 'S',
          weapon_laser: 'L',
          weapon_wave: 'W',
          weapon_burst: 'B',
          weapon_giant: 'G',
          weapon_nuke: 'N',
          invincible: 'I',
          shield: 'D',
          med: '+'
        };
        const ring = {
          weapon_spread: '#9fe6ff',
          weapon_laser: '#ff9a66',
          weapon_wave: '#7a4dff',
          weapon_burst: '#ffd27a',
          weapon_giant: '#ff5a5a',
          weapon_nuke: '#2a2a2a',
          invincible: '#ffe994',
          shield: '#8ac7ff',
          med: '#9af6a0'
        };
        ctx.strokeStyle = ring[p.type] || '#fff1c9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff1c9';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(letters[p.type] || '?', 0, 7);
      }
      ctx.restore();
    }
  }

  function drawBankBuilding(xCenter, y, w, h, hp = 5, maxHp = 5, hitFx = 0) {
    const drawH = h;
    const drawY = y;
    const x = xCenter - w * 0.5;
    ctx.fillStyle = hitFx > 0 ? '#2f1a1a' : '#10172a';
    ctx.fillRect(x - 2, drawY - 2, w + 4, drawH + 2);
    ctx.fillStyle = hitFx > 0 ? '#7f5f5f' : '#5f7399';
    ctx.fillRect(x, drawY, w, drawH);
    ctx.fillStyle = '#b6c6df';
    ctx.fillRect(x + 2, drawY + 2, w - 4, 8);
    ctx.fillStyle = '#2a395b';
    ctx.fillRect(x + 4, drawY + 12, w - 8, drawH - 16);
    ctx.fillStyle = '#90a8cb';
    for (let wy = drawY + 16; wy < drawY + drawH - 6; wy += 10) {
      for (let wx = x + 6; wx < x + w - 10; wx += 10) {
        ctx.fillRect(wx, wy, 5, 5);
      }
    }
    ctx.fillStyle = '#ecf2ff';
    ctx.fillRect(x + 5, drawY + 4, w - 10, 6);
    ctx.fillStyle = '#223250';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BANK', x + w * 0.5, drawY + 14);
    ctx.fillStyle = '#cf2b2b';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('$$$', x + w * 0.5, drawY + Math.min(38, drawH - 10));
    if (hp < maxHp) {
      ctx.fillStyle = '#1b2741';
      ctx.fillRect(x + 8, drawY + drawH - 6, Math.max(8, w - 16), 2);
      ctx.fillRect(x + 12, drawY + 22, Math.max(6, w * (1 - hp / maxHp) * 0.35), 2);
    }
  }

  function drawObstacles() {
    for (const o of game.obstacles) {
      drawBankBuilding(o.x, o.y, o.w, o.h, o.hp || 5, o.maxHp || 5, o.hitFx || 0);
    }
  }

  function drawBullets() {
    for (const b of game.bullets) {
      const x = b.x - b.w * 0.5;
      const y = b.y - b.h * 0.5;
      if (b.nuke) {
        const c = (((game.levelTimer + (b.altTick || 0)) / 3) | 0) % 2;
        const c2 = (((game.levelTimer + (b.altTick || 0) + 2) / 3) | 0) % 2;
        const r = Math.max(4, Math.min(b.w, b.h) * 0.5);
        ctx.fillStyle = c === 0 ? '#d82424' : '#161616';
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c2 === 0 ? '#161616' : '#d82424';
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 0.62, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (b.waveMetroid) {
        const c = (((game.levelTimer + (b.altTick || 0)) / 4) | 0) % 3;
        ctx.fillStyle = c === 0 ? '#7a4dff' : c === 1 ? '#ffffff' : '#4aa6ff';
      } else if (b.giant) {
        ctx.fillStyle = '#ff6b6b';
      } else {
        ctx.fillStyle = b.from === 'player' ? '#ffb347' : '#d93636';
      }
      ctx.fillRect(x, y, b.w, b.h);
      if (b.waveMetroid) {
        const c2 = (((game.levelTimer + (b.altTick || 0) + 2) / 4) | 0) % 3;
        ctx.fillStyle = c2 === 0 ? '#7a4dff' : c2 === 1 ? '#ffffff' : '#4aa6ff';
      } else if (b.giant) {
        ctx.fillStyle = '#ffe0e0';
      } else {
        ctx.fillStyle = b.from === 'player' ? '#fff3b0' : '#ff9a9a';
      }
      ctx.fillRect(x + 2, y + 1, Math.max(1, b.w - 4), Math.max(1, b.h - 2));
    }
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.r, p.r);
      ctx.globalAlpha = 1;
    }
  }

  function drawHUD(def) {
    ctx.fillStyle = '#11192a';
    ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = '#8ca1c5';
    ctx.fillRect(0, 40, W, 4);
    ctx.fillStyle = '#d8f1ff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${String(game.score).padStart(7, '0')}`, 12, 28);
    ctx.fillText(`HI ${String(game.hiScore).padStart(7, '0')}`, 260, 28);
    ctx.fillText(`LIVES ${Math.max(0, game.lives)}`, 455, 28);
    ctx.fillText(`HP ${game.player.health}`, 570, 28);
    ctx.fillText(`LEVEL ${game.levelIndex + 1}/8`, 650, 28);

    if (def.type !== 'boss') {
      const progress = clamp(game.cameraX / def.length, 0, 1);
      ctx.fillStyle = '#29374e';
      ctx.fillRect(786, 13, 150, 12);
      ctx.fillStyle = '#f7931a';
      ctx.fillRect(786, 13, 150 * progress, 12);
      ctx.fillStyle = '#9fd4ff';
      ctx.fillRect(786, 11, 150, 2);
      ctx.fillRect(786, 25, 150, 2);
    }

    if (game.player.rapid > 0) {
      ctx.fillStyle = '#f7931a';
      ctx.fillText('RAPID', 12, H - 20);
    }
    if (game.player.shield > 0) {
      ctx.fillStyle = '#6effba';
      ctx.fillText('SHIELD', 100, H - 20);
    }
    if (game.player.weapon !== 'basic') {
      const name = {
        weapon_spread: 'SPREAD',
        weapon_laser: 'LASER',
        weapon_wave: 'WAVE',
        weapon_burst: 'BURST',
        weapon_giant: 'GIANT',
        weapon_nuke: 'NUKE'
      }[game.player.weapon] || 'POWER';
      ctx.fillStyle = '#ffd27a';
      ctx.fillText(`WEAPON ${name}`, 210, H - 20);
    }
    if (game.player.invincibleTimer > 0) {
      ctx.fillStyle = '#ffe994';
      ctx.fillText(`INVINCIBLE ${((game.player.invincibleTimer / 60) | 0) + 1}`, 360, H - 20);
    }

    if (game.stageTimer > 0) {
      game.stageTimer -= 1;
      const alpha = clamp(game.stageTimer / 160, 0, 1);
      ctx.globalAlpha = alpha;
      drawPixelText(`LEVEL ${game.levelIndex + 1}`, W / 2, H / 2 - 20, 58, '#ffd86b', '#000');
      drawPixelText(`${def.name.toUpperCase()} - FIGHT!`, W / 2, H / 2 + 40, 34, '#9ee0ff', '#000');
      ctx.globalAlpha = 1;
    }

    if (game.paused) {
      drawPixelText('PAUSED', W / 2, H / 2, 60, '#fff', '#000');
    }
  }

  function drawTitle() {
    const fakeDef = { type: 'side', theme: 'miami', speed: 2 };
    drawBackground(fakeDef);
    const t = game.titleTimer;

    // Demo game movement in background (SMB3-style attract feel).
    for (let i = 0; i < 8; i++) {
      const worldX = t * 6 + i * 240;
      const ox = W - (worldX % (W + 220));
      const oh = 58 + ((i % 3) * 12);
      // Keep intro banks locked flat to the ground plane.
      drawBankBuilding(ox + 27, GROUND_Y - oh + 2, 54, oh, 5, 5, 0);
    }
    for (let i = 0; i < 5; i++) {
      const ex = W - ((t * 3.4 + i * 260) % (W + 90));
      const ey = GROUND_Y - 18 + Math.sin((t + i * 14) * 0.12) * 9;
      ctx.fillStyle = '#8e1f1f';
      ctx.fillRect(ex - 10, ey - 22, 20, 26);
      ctx.fillStyle = '#d33d3d';
      ctx.fillRect(ex - 8, ey - 20, 16, 10);
    }

    const weaponShowcase = [
      { weapon: 'weapon_spread', name: 'SPREAD', desc: 'Shot fan for crowd control.', color: '#9fe6ff' },
      { weapon: 'weapon_wave', name: 'WAVE', desc: 'Wave clears red candles fast.', color: '#9b7dff' },
      { weapon: 'weapon_giant', name: 'GIANT', desc: 'Huge heavy bullets with punch.', color: '#ff9b7a' },
      { weapon: 'weapon_nuke', name: 'NUKE', desc: 'Round nuke blast destroys banks.', color: '#ff6a6a' }
    ];
    const cardStep = 170;
    const cardIndex = ((t / cardStep) | 0) % weaponShowcase.length;
    const featuredWeapon = weaponShowcase[cardIndex];

    // Hero drops in from top, then idles with slight bob.
    const drop = clamp(t / 130, 0, 1);
    const ease = 1 - (1 - drop) * (1 - drop);
    const heroY = -220 + ease * (GROUND_Y - 18 + 220) + (drop >= 1 ? Math.sin(t * 0.08) * 2 : 0);
    const prevPlayer = game.player;
    game.player = {
      x: 220,
      y: heroY,
      mode: 'side',
      inv: 0,
      rapid: 0,
      shield: 0,
      weapon: featuredWeapon.weapon,
      fireFxF: (t % 16) < 7 ? 3 : 0,
      fireFxU: featuredWeapon.weapon === 'weapon_nuke' || featuredWeapon.weapon === 'weapon_wave' ? ((t % 30) < 6 ? 2 : 0) : 0
    };
    drawPlayer();
    const shotX = game.player.x + 62;
    const shotY = game.player.y - 14;
    if (featuredWeapon.weapon === 'weapon_nuke') {
      const r = 16 + Math.sin(t * 0.22) * 2;
      const c = ((t / 6) | 0) % 2;
      ctx.fillStyle = c ? '#d82424' : '#161616';
      ctx.beginPath();
      ctx.arc(shotX, shotY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c ? '#161616' : '#d82424';
      ctx.beginPath();
      ctx.arc(shotX, shotY, r * 0.58, 0, Math.PI * 2);
      ctx.fill();
    } else if (featuredWeapon.weapon === 'weapon_giant') {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(shotX - 26, shotY - 10, 52, 20);
      ctx.fillStyle = '#ffe0e0';
      ctx.fillRect(shotX - 22, shotY - 7, 44, 14);
    } else if (featuredWeapon.weapon === 'weapon_wave') {
      const wave = Math.sin(t * 0.22) * 7;
      ctx.fillStyle = '#7a4dff';
      ctx.fillRect(shotX - 22, shotY - 7 + wave * 0.28, 44, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(shotX - 17, shotY - 3 + wave * 0.18, 34, 6);
      ctx.fillStyle = '#4aa6ff';
      ctx.fillRect(shotX - 10, shotY - 1 + wave * 0.08, 20, 2);
    } else {
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(shotX - 22, shotY - 3, 14, 6);
      ctx.fillRect(shotX - 4, shotY - 6, 14, 6);
      ctx.fillRect(shotX + 14, shotY - 3, 14, 6);
    }
    game.player = prevPlayer;

    const drawArcTitle = (text, cx, cy, radius, spread, color, shadow) => {
      ctx.save();
      ctx.font = 'bold 56px "Courier New", monospace';
      ctx.textAlign = 'center';
      const chars = [...text];
      const start = -spread * 0.5;
      for (let i = 0; i < chars.length; i++) {
        const a = start + (chars.length <= 1 ? 0 : (spread * i) / (chars.length - 1));
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI * 0.5);
        ctx.fillStyle = shadow;
        ctx.fillText(chars[i], 3, 3);
        ctx.fillStyle = color;
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    };

    const drawWideTitle = (text, y, color, shadow) => {
      ctx.save();
      const chars = [...text];
      const xStart = 72;
      const xEnd = W - 72;
      ctx.font = 'bold 86px "Courier New", monospace';
      ctx.textAlign = 'center';
      const palette = ['#ffb347', '#ffd66a', '#ff8a5a', '#fff0a6', '#f7a35d'];
      for (let i = 0; i < chars.length; i++) {
        const tt = chars.length <= 1 ? 0 : i / (chars.length - 1);
        const x = xStart + (xEnd - xStart) * tt;
        const arcY = y + Math.sin((tt - 0.5) * Math.PI) * 30 + Math.sin(game.titleTimer * 0.08 + i * 0.9) * 4;
        const rot = Math.sin(game.titleTimer * 0.04 + i * 0.6) * 0.06;
        ctx.fillStyle = shadow;
        ctx.save();
        ctx.translate(x + 3, arcY + 3);
        ctx.rotate(rot);
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
        ctx.fillStyle = palette[(i + ((game.titleTimer / 18) | 0)) % palette.length] || color;
        ctx.save();
        ctx.translate(x, arcY);
        ctx.rotate(rot);
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    };

    const titleAlpha = clamp((t - 80) / 70, 0, 1);
    const pressAlpha = clamp((t - 170) / 80, 0, 1) * (0.7 + Math.sin(t * 0.12) * 0.3);
    const creditAlpha = clamp((t - 230) / 100, 0, 1);
    const infoAlpha = clamp((t - 150) / 90, 0, 1);

    ctx.globalAlpha = titleAlpha;
    drawWideTitle('MAD PATROL', 154, '#ffb347', '#1c1102');
    ctx.globalAlpha = pressAlpha;
    drawPixelText('PRESS SPACE TO START', W * 0.69, 406, 34, '#ffe08f', '#000');
    ctx.globalAlpha = clamp((t - 190) / 90, 0, 0.95);
    drawPixelText('UP JUMPS  |  SPACE SHOOTS', W * 0.69, 438, 20, '#d7ebff', '#12223a');

    const drawShowcaseBox = (item, x, y, w, h) => {
      ctx.save();
      const pulse = 0.95 + Math.sin(t * 0.08) * 0.05;
      const bx = x + (w * (1 - pulse)) * 0.5;
      const by = y + (h * (1 - pulse)) * 0.5;
      const bw = w * pulse;
      const bh = h * pulse;
      ctx.fillStyle = '#111c30';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = item.color;
      ctx.fillRect(bx, by, bw, 4);
      ctx.strokeStyle = '#d2e6ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

      ctx.fillStyle = '#0a1020';
      ctx.fillRect(bx + 14, by + 14, 56, 56);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 14, by + 14, 56, 56);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#d7e8ff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText('FEATURED WEAPON', bx + 86, by + 26);
      ctx.fillStyle = '#ffe2a1';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillText(item.name, bx + 86, by + 56);
      ctx.fillStyle = '#e4f3ff';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(item.desc, bx + 86, by + 78);
      ctx.fillStyle = '#9fdcff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText('Enemies: red candles + flying suits', bx + 86, by + 100);
      ctx.fillText('Powerups: coin, shield, invincible', bx + 86, by + 118);

      const iconX = bx + 42;
      const iconY = by + 42;
      if (item.weapon === 'weapon_nuke') {
        const c = ((t / 6) | 0) % 2;
        ctx.fillStyle = c ? '#d82424' : '#161616';
        ctx.beginPath();
        ctx.arc(iconX, iconY, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c ? '#161616' : '#d82424';
        ctx.beginPath();
        ctx.arc(iconX, iconY, 9.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.weapon === 'weapon_giant') {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(iconX - 18, iconY - 8, 36, 16);
        ctx.fillStyle = '#ffe0e0';
        ctx.fillRect(iconX - 14, iconY - 5, 28, 10);
      } else if (item.weapon === 'weapon_wave') {
        const wave = Math.sin(t * 0.2) * 5;
        ctx.fillStyle = '#7a4dff';
        ctx.fillRect(iconX - 18, iconY - 8 + wave * 0.24, 36, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(iconX - 14, iconY - 4 + wave * 0.14, 28, 8);
        ctx.fillStyle = '#4aa6ff';
        ctx.fillRect(iconX - 10, iconY - 1 + wave * 0.08, 20, 2);
      } else {
        ctx.fillStyle = '#ffb347';
        ctx.fillRect(iconX - 16, iconY - 8, 11, 6);
        ctx.fillRect(iconX - 2, iconY - 5, 11, 6);
        ctx.fillRect(iconX + 12, iconY - 8, 11, 6);
      }
      ctx.restore();
    };
    ctx.globalAlpha = infoAlpha;
    drawShowcaseBox(featuredWeapon, 230, 432, 500, 132);
    ctx.fillStyle = '#d7e8ff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Weapon demo cycles automatically in attract mode', W * 0.5, 578);
    ctx.globalAlpha = creditAlpha;
    ctx.fillStyle = '#9fdcff';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Created by 1n2.org -- Thomas Hunt & ChatGPT Codex', W / 2, 594);
    ctx.globalAlpha = 1;
  }

  function drawGameOver() {
    drawBackground(levelDefs[game.levelIndex] || levelDefs[0]);
    drawPixelText('GAME OVER', W / 2, 210, 76, '#ff8a8a', '#000');
    drawPixelText(`SCORE ${String(game.score).padStart(7, '0')}`, W / 2, 292, 34, '#fff', '#000');
    drawPixelText('PRESS ENTER TO RETRY', W / 2, 380, 28, '#ffd57d', '#000');
  }

  function drawWin() {
    drawBackground(levelDefs[7]);
    drawPixelText('YOU CLEARED ALL 8 LEVELS', W / 2, 170, 46, '#ffe08b', '#000');
    drawPixelText('SATOSHI DEFEATED', W / 2, 236, 52, '#9fdcff', '#000');
    drawPixelText(`FINAL SCORE ${String(game.score).padStart(7, '0')}`, W / 2, 304, 34, '#fff', '#000');
    drawPixelText('PRESS ENTER TO PLAY AGAIN', W / 2, 388, 28, '#f7b34e', '#000');
    drawPixelText('Created by 1n2.org -- Thomas Hunt & ChatGPT Codex', W / 2, 504, 18, '#9fdcff', '#000');
  }

  function loop() {
    requestAnimationFrame(loop);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const shakeX = 0;
    const shakeY = 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (game.state === 'title') {
      game.levelTimer += 1;
      game.titleTimer += 1;
      if (game.titleTimer === 1) audioReady();
      playTitleSong();
      drawTitle();
      ctx.restore();
      return;
    }

    if (game.state === 'playing') {
      const def = levelDefs[game.levelIndex];
      updatePlaying();
      drawBackground(def);
      drawObstacles();
      drawPickups();
      drawEnemies();
      drawBoss();
      drawBullets();
      drawPlayer();
      drawParticles();
      drawHUD(def);
      ctx.restore();
      return;
    }

    if (game.state === 'gameover') {
      drawGameOver();
      ctx.restore();
      return;
    }

    if (game.state === 'win') {
      drawWin();
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape'].includes(ev.key.toLowerCase())) ev.preventDefault();
    keys.add(k);

    if (k === 'enter' || k === ' ') {
      audioReady();
      if (game.state === 'title') {
        game.titleMusicTick = 0;
        playTitleSong();
      }
    }
    if (game.state === 'title' && k !== ' ') {
      audioReady();
      game.titleMusicTick = 0;
      playTitleSong();
    }

    if (game.state === 'title' && k === ' ') {
      startGame();
      beep(330, 0.1, 'triangle', 0.05, 140);
      return;
    }

    if (game.state === 'playing' && k === 'escape') {
      game.paused = !game.paused;
      beep(game.paused ? 190 : 400, 0.08, 'square', 0.04, 20);
      return;
    }

    if ((game.state === 'gameover' || game.state === 'win') && k === 'enter') {
      game.state = 'title';
      game.titlePage = 0;
      game.titleTimer = 0;
      game.titleMusicTick = 0;
      game.titleMusicStep = 0;
    }
  });

  window.addEventListener('keyup', (ev) => {
    keys.delete(ev.key.toLowerCase());
  });

  loop();
})();
