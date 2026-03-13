(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const FRAME_MS = 1000 / 60;
  const UI_FONT = '"Verdana", "Trebuchet MS", sans-serif';
  const TITLE_FONT = '"Arial Black", "Trebuchet MS", sans-serif';

  const keysDown = new Set();
  const keysPressed = new Set();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let rngSeed = 1;
  const srand = (seed) => {
    rngSeed = (seed >>> 0) || 1;
  };
  const rand = () => {
    rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
    return rngSeed / 0x100000000;
  };
  const randRange = (a, b) => a + rand() * (b - a);
  const randInt = (a, b) => Math.floor(randRange(a, b + 1));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  let audioCtx = null;

  function beep(freq = 440, dur = 0.05, type = 'square', vol = 0.035, slide = 0) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  const MUSIC_TRACKS = [
    'audio/afterburner.mp3',
    'audio/afterburner-1.mp3',
    'audio/afterburner-2.mp3',
    'audio/afterburner-3.mp3'
  ];

  const music = {
    enabled: true,
    unlocked: false,
    activeIndex: -1,
    players: []
  };

  function initMusicPlayers() {
    if (music.players.length > 0) return;
    for (const src of MUSIC_TRACKS) {
      const player = new Audio(src);
      player.preload = 'auto';
      player.loop = true;
      player.volume = 0.35;
      music.players.push(player);
    }
  }

  function resolveMusicTrackIndex() {
    if (game.state === 'startup' || game.state === 'title' || game.state === 'gameover' || game.state === 'win') {
      return 3;
    }
    if (game.stageIndex >= 0 && game.stageIndex < STAGES.length && STAGES[game.stageIndex]) {
      const stageTrack = STAGES[game.stageIndex].musicTrack;
      if (Number.isFinite(stageTrack)) {
        return clamp(Math.floor(stageTrack), 0, MUSIC_TRACKS.length - 1);
      }
      return game.stageIndex % MUSIC_TRACKS.length;
    }
    return 0;
  }

  function resolveMusicRate() {
    if (game.stageIndex >= 0 && game.stageIndex < STAGES.length && STAGES[game.stageIndex]) {
      return clamp(STAGES[game.stageIndex].musicRate || 1, 0.72, 1.45);
    }
    return 1;
  }

  function stopActiveMusic(resetTime = false) {
    if (music.activeIndex < 0) return;
    const active = music.players[music.activeIndex];
    if (!active) {
      music.activeIndex = -1;
      return;
    }
    active.pause();
    if (resetTime) active.currentTime = 0;
    if (resetTime) music.activeIndex = -1;
  }

  function syncMusicPlayback(forceRestart = false) {
    initMusicPlayers();
    if (!music.unlocked || !music.enabled) {
      stopActiveMusic(false);
      return;
    }
    if (game.state === 'playing' && game.paused) {
      stopActiveMusic(false);
      return;
    }

    const wantedIndex = resolveMusicTrackIndex();
    if (!forceRestart && music.activeIndex === wantedIndex) {
      const current = music.players[wantedIndex];
      if (current && current.paused) {
        const resumed = current.play();
        if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
      }
      return;
    }

    stopActiveMusic(true);
    const next = music.players[wantedIndex];
    if (!next) return;

    music.activeIndex = wantedIndex;
    next.playbackRate = resolveMusicRate();
    if (forceRestart || next.currentTime > 0) next.currentTime = 0;
    const started = next.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  }

  function unlockMusicPlayback() {
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    music.unlocked = true;
    syncMusicPlayback(false);
  }

  const STAGES = [
    {
      id: 'moon',
      name: 'Moon Patrol Revival',
      kind: 'vehicle',
      theme: 'moon',
      length: 5600,
      baseSpeed: 4.1,
      minSpeed: 2.2,
      maxSpeed: 6.8,
      pitCount: 13,
      allowPits: true,
      allowPlatforms: false,
      allowMario: false,
      enemyInterval: [22, 40],
      pickupInterval: [96, 180],
      checkpointStep: 920,
      musicTrack: 0,
      musicRate: 1.0,
      controls: 'LEFT/RIGHT throttle  UP jump  SPACE fire (forward + up)'
    },
    {
      id: 'blaster',
      name: 'Ground Assault Run',
      kind: 'blaster',
      theme: 'metro',
      length: 5000,
      baseSpeed: 0,
      minSpeed: 0,
      maxSpeed: 0,
      pitCount: 0,
      allowPits: false,
      allowPlatforms: true,
      allowMario: false,
      lockForwardFacing: true,
      visualMode: 'ninja',
      enemyInterval: [24, 42],
      pickupInterval: [180, 320],
      checkpointStep: 880,
      musicTrack: 1,
      musicRate: 1.16,
      controls: 'LEFT/RIGHT move  DOWN duck  UP jump  SPACE shoot'
    },
    {
      id: 'sword',
      name: 'Ninja Bitcoin Citadel',
      kind: 'sword',
      theme: 'dojo',
      length: 4600,
      baseSpeed: 0,
      minSpeed: 0,
      maxSpeed: 0,
      pitCount: 0,
      allowPits: false,
      allowPlatforms: true,
      allowMario: false,
      enemyInterval: [30, 62],
      pickupInterval: [320, 580],
      checkpointStep: 860,
      musicTrack: 2,
      musicRate: 0.88,
      controls: 'LEFT/RIGHT move  DOWN duck  UP jump  SPACE sword'
    },
    {
      id: 'rtype',
      name: 'R-Type Void Front',
      kind: 'shooter',
      theme: 'space_r',
      length: 5200,
      baseSpeed: 4.6,
      minSpeed: 0,
      maxSpeed: 0,
      pitCount: 0,
      allowPits: false,
      allowPlatforms: false,
      allowMario: false,
      enemyInterval: [18, 34],
      pickupInterval: [92, 182],
      checkpointStep: 860,
      musicTrack: 0,
      musicRate: 1.22,
      controls: 'ARROWS fly  SPACE fire (hold UP for vertical shots)'
    },
    {
      id: 'gradius',
      name: 'Gradius Neon Corridor',
      kind: 'shooter',
      theme: 'space_g',
      length: 5600,
      baseSpeed: 4.9,
      minSpeed: 0,
      maxSpeed: 0,
      pitCount: 0,
      allowPits: false,
      allowPlatforms: false,
      allowMario: false,
      enemyInterval: [16, 32],
      pickupInterval: [88, 168],
      checkpointStep: 900,
      musicTrack: 1,
      musicRate: 1.34,
      controls: 'ARROWS fly  SPACE fire (hold UP for vertical shots)'
    },
    {
      id: 'bionic-1',
      name: 'Bionic Outpost Run',
      kind: 'bionic',
      theme: 'metro',
      length: 5200,
      baseSpeed: 0,
      minSpeed: 0,
      maxSpeed: 0,
      pitCount: 0,
      allowPits: false,
      allowPlatforms: true,
      allowMario: false,
      enemyInterval: [28, 52],
      pickupInterval: [250, 450],
      checkpointStep: 880,
      musicTrack: 2,
      musicRate: 1.04,
      controls: 'LEFT/RIGHT move  DOWN duck  UP jump  SPACE fire  G grapple (forward/back with arrows)'
    },
    {
      id: 'underwater',
      name: 'Underwater Bitcoin Trench',
      kind: 'shooter',
      theme: 'underwater',
      length: 5500,
      baseSpeed: 4.2,
      minSpeed: 0,
      maxSpeed: 0,
      pitCount: 0,
      allowPits: false,
      allowPlatforms: false,
      allowMario: false,
      enemyInterval: [17, 34],
      pickupInterval: [90, 175],
      checkpointStep: 900,
      musicTrack: 3,
      musicRate: 0.9,
      controls: 'ARROWS swim  SPACE fire (hold UP for vertical shots)'
    }
  ];

  const RETRO_EXPERTS = [
    {
      name: 'Rex Quarter',
      title: 'Moon Patrol Historian',
      compare: 'Compared against MOON PATROL arcade timing and lane readability.',
      advice: 'Keep first stage punchy: denser drops, sector variety, and smarter threats.'
    },
    {
      name: 'Vee Vector',
      title: 'Blaster Master + Mega Man Analyst',
      compare: 'Compared against BLASTER MASTER vehicle-to-foot transitions and MEGA MAN run-and-gun pacing.',
      advice: 'Keep Stage 2 fast: clean jump-shoot rhythm and stacked combat lanes.'
    },
    {
      name: 'Kaito Steel',
      title: 'Ninja Gaiden Combat Coach',
      compare: 'Compared against NINJA GAIDEN speed, jump arcs, and sword commitment.',
      advice: 'Sword stage should have higher jumps, denser ninja pressure, and combo slashes.'
    }
  ];

  const RETRO_MEETING = [
    {
      speaker: 'Rex Quarter',
      focus: 'Moon Patrol combat pass',
      decisions: [
        'Increased stage-1 drop frequency and weapon variety.',
        'Added extra road sectors and stronger enemy roster.',
        'Kept pit readability with signs and assistive flow.'
      ]
    },
    {
      speaker: 'Vee Vector',
      focus: 'Platformer movement pass',
      decisions: [
        'Pushed Stage 2 faster with stronger dirt elevation flow.',
        'Added stacked ledges for jump-chain lanes and crossfire angles.',
        'Added DOWN duck so Mad can shoot low and slip under fire.'
      ]
    },
    {
      speaker: 'Kaito Steel',
      focus: 'Sword fun pass',
      decisions: [
        'Boosted sword-stage jump height and movement speed.',
        'Refined sword swings with sharper arc trails and impact flow.',
        'Moved bionic grapple to dedicated G directional control.'
      ]
    }
  ];

  function expertForStage(index = game.stageIndex) {
    const safe = ((index % RETRO_EXPERTS.length) + RETRO_EXPERTS.length) % RETRO_EXPERTS.length;
    return RETRO_EXPERTS[safe];
  }

  function meetingForStage(index = game.stageIndex) {
    const safe = ((index % RETRO_MEETING.length) + RETRO_MEETING.length) % RETRO_MEETING.length;
    return RETRO_MEETING[safe];
  }

  const decor = {
    stars: [],
    skyline: [],
    lanterns: []
  };

  function buildDecor() {
    srand(0x4d5032);
    decor.stars.length = 0;
    for (let i = 0; i < 110; i++) {
      decor.stars.push({
        x: randRange(0, 9800),
        y: randRange(18, 280),
        s: randRange(1, 2.8)
      });
    }

    decor.skyline.length = 0;
    for (let i = 0; i < 120; i++) {
      decor.skyline.push({
        x: i * 104 + randRange(-18, 18),
        w: randRange(48, 92),
        h: randRange(80, 210)
      });
    }

    decor.lanterns.length = 0;
    for (let i = 0; i < 100; i++) {
      decor.lanterns.push({
        x: i * 126 + randRange(-20, 20),
        y: randRange(86, 190),
        sway: randRange(0, Math.PI * 2)
      });
    }
  }

  const game = {
    state: 'startup',
    stageIndex: 0,
    stage: STAGES[0],
    score: 0,
    lives: 4,
    hiScore: Number(localStorage.getItem('madPatrol2HighScore') || '0'),
    frame: 0,
    paused: false,
    cameraX: 0,
    checkpointX: 0,
    stageTime: 0,
    messageTimer: 0,
    expertTicker: 0,
    spawnEnemyTimer: 60,
    spawnPickupTimer: 450,
    nextEnemyId: 1,
    player: null,
    pits: [],
    platforms: [],
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    slashes: [],
    particles: [],
    marioBlocks: [],
    pipes: [],
    anchors: [],
    banks: []
  };

  function vehicleSectorAt(worldX) {
    // Stage 1 visual rhythm: cycle through themed sectors to avoid flat repetition.
    return Math.floor(worldX / 720) % 4;
  }

  function vehicleBaseGroundYAt(worldX) {
    const base = H - 122;
    return base + Math.sin(worldX * 0.009) * 10 + Math.sin(worldX * 0.024) * 4;
  }

  function vehicleBankHeightAt(worldX) {
    let best = 0;
    for (const bank of game.banks) {
      if (worldX < bank.x || worldX > bank.x + bank.w) continue;
      const t = (worldX - bank.x) / bank.w;
      let h = 0;
      if (bank.kind === 'mesa') {
        const ramp = clamp(Math.min(t / 0.24, (1 - t) / 0.24), 0, 1);
        h = bank.h * ramp;
      } else if (bank.kind === 'spike') {
        h = bank.h * Math.pow(Math.sin(Math.PI * t), 1.25);
      } else {
        h = bank.h * Math.pow(Math.sin(Math.PI * t), 1.85);
      }
      if (h > best) best = h;
    }
    return best;
  }

  function groundYAt(worldX, stage = game.stage) {
    if (stage.kind === 'vehicle') {
      const baseY = vehicleBaseGroundYAt(worldX);
      return baseY - vehicleBankHeightAt(worldX);
    }
    if (stage.kind === 'blaster') {
      const base = H - 118;
      const ridge = Math.sin(worldX * 0.0026 + Math.sin(worldX * 0.0009) * 1.8) * 14;
      return base + Math.sin(worldX * 0.0065) * 20 + Math.sin(worldX * 0.021) * 7 + Math.sin(worldX * 0.0019) * 13 + ridge;
    }
    if (stage.theme === 'underwater') {
      const base = H - 94;
      return base + Math.sin(worldX * 0.0062) * 12 + Math.sin(worldX * 0.018) * 6;
    }
    const base = H - 122;
    return base + Math.sin(worldX * 0.0085) * 12 + Math.sin(worldX * 0.022) * 4;
  }

  function pitAt(worldX) {
    for (const pit of game.pits) {
      if (worldX > pit.x && worldX < pit.x + pit.w) return pit;
    }
    return null;
  }

  function platformTopAt(worldX, prevBottom, nowBottom) {
    let top = Infinity;
    for (const p of game.platforms) {
      if (worldX > p.x + 8 && worldX < p.x + p.w - 8) {
        if (prevBottom <= p.y + 1 && nowBottom >= p.y - 1) {
          top = Math.min(top, p.y);
        }
      }
    }
    return top;
  }

  function marioTopAt(worldX, prevBottom, nowBottom) {
    let top = Infinity;
    for (const b of game.marioBlocks) {
      const offsetY = b.bump || 0;
      const blockY = b.y + offsetY;
      if (worldX > b.x - b.w * 0.5 + 3 && worldX < b.x + b.w * 0.5 - 3) {
        if (prevBottom <= blockY + 1 && nowBottom >= blockY - 1) {
          top = Math.min(top, blockY);
        }
      }
    }
    for (const p of game.pipes) {
      const pipeTop = groundYAt(p.x + p.w * 0.5, game.stage) - p.h;
      if (worldX > p.x + 4 && worldX < p.x + p.w - 4) {
        if (prevBottom <= pipeTop + 1 && nowBottom >= pipeTop - 1) {
          top = Math.min(top, pipeTop);
        }
      }
    }
    return top;
  }

  function tryBumpMarioBlock(player, prevTop, nowTop) {
    if (player.vy >= 0) return false;
    for (const b of game.marioBlocks) {
      const offsetY = b.bump || 0;
      const blockY = b.y + offsetY;
      const left = b.x - b.w * 0.5 + 3;
      const right = b.x + b.w * 0.5 - 3;
      const bottom = blockY + b.h;
      if (player.wx > left && player.wx < right && prevTop >= bottom - 1 && nowTop <= bottom + 1) {
        b.bump = -7;
        player.vy = Math.max(1.8, Math.abs(player.vy) * 0.25);
        if (!b.used) {
          b.used = true;
          const stage = game.stage;
          if (b.kind === 'qblock') {
            const pool = stage.kind === 'sword'
              ? ['btc', 'btc', 'med', 'shield']
              : ['btc', 'btc', 'spread', 'wave', 'med', 'shield', 'giant'];
            spawnPickup(b.x, blockY - 30, pick(pool));
          } else {
            spawnPickup(b.x, blockY - 24, 'btc');
          }
          burst(b.x, blockY, '#ffd37d', 8, 0.8);
          beep(460, 0.05, 'square', 0.04, 80);
        } else {
          burst(b.x, blockY, '#95a7cf', 6, 0.6);
          beep(260, 0.04, 'square', 0.03, -20);
        }
        return true;
      }
    }
    return false;
  }

  function isPitOverlap(x, w) {
    for (const pit of game.pits) {
      if (x < pit.x + pit.w + 28 && x + w > pit.x - 28) return true;
    }
    return false;
  }

  function findSafeX(startX) {
    const lo = 90;
    const hi = game.stage.length - 120;
    let x = clamp(startX, lo, hi);
    if (!pitAt(x)) return x;
    for (let i = 1; i < 160; i++) {
      const r = clamp(x + i * 8, lo, hi);
      if (!pitAt(r)) return r;
      const l = clamp(x - i * 8, lo, hi);
      if (!pitAt(l)) return l;
    }
    return lo;
  }

  function buildStageTerrain(stage) {
    game.pits.length = 0;
    game.platforms.length = 0;
    game.marioBlocks.length = 0;
    game.pipes.length = 0;
    game.anchors.length = 0;
    game.banks.length = 0;

    if (stage.allowPits !== false && stage.pitCount > 0) {
      let cursor = stage.kind === 'vehicle' ? 780 : 740;
      for (let i = 0; i < stage.pitCount; i++) {
        const gap = stage.kind === 'vehicle'
          ? randInt(220, 390)
          : stage.kind === 'blaster'
            ? randInt(168, 300)
            : randInt(158, 286);
        cursor += gap;
        const width = stage.kind === 'vehicle'
          ? randInt(62, 98)
          : stage.kind === 'blaster'
            ? randInt(70, 116)
            : randInt(66, 108);
        if (cursor + width > stage.length - 420) break;
        game.pits.push({ x: cursor, w: width });
        cursor += width;
      }
    }

    if (stage.kind === 'vehicle') {
      let bx = 500;
      while (bx < stage.length - 280) {
        bx += randInt(90, 182);
        const clusterRoll = rand();
        const bankCount = clusterRoll < 0.24 ? 2 : clusterRoll < 0.32 ? 3 : 1;
        let localX = bx;

        for (let i = 0; i < bankCount; i++) {
          const w = i === 0 ? randInt(104, 242) : randInt(86, 182);
          if (isPitOverlap(localX + 10, Math.max(38, w - 20))) {
            localX += w + randInt(34, 88);
            continue;
          }

          let h = randInt(24, 58);
          if (clusterRoll > 0.76 && i === bankCount - 1) {
            h = randInt(56, 86);
          }
          const typeRoll = rand();
          const kind = typeRoll < 0.34 ? 'mesa' : typeRoll < 0.68 ? 'mound' : 'spike';
          game.banks.push({ x: localX, w, h, kind });

          const cx = localX + w * 0.5;
          if (rand() < 0.68 || h >= 56) {
            spawnPickup(cx, groundYAt(cx, stage) - randInt(22, 42), pick(['btc', 'spread', 'burst', 'wave', 'laser', 'shield', 'med', 'plasma', 'giant']));
          }
          if (h >= 56 && rand() < 0.28) {
            spawnPickup(cx + randRange(-10, 10), groundYAt(cx, stage) - randInt(46, 68), pick(['btc', 'laser', 'plasma']));
          }

          localX += w + randInt(28, 82);
        }
        bx = localX + randInt(62, 136);
      }
      return;
    }

    if (stage.kind === 'shooter') return;
    if (stage.allowPlatforms === false) return;

    if (stage.kind === 'blaster') {
      let px = 300;
      while (px < stage.length - 220) {
        const w = randInt(80, 154);
        const x = px + randInt(-12, 34);
        const tierRoll = rand();
        const lift = tierRoll < 0.5
          ? randInt(32, 62)
          : tierRoll < 0.84
            ? randInt(70, 118)
            : randInt(126, 176);
        const y = groundYAt(x + w * 0.5, stage) - lift;
        if (!isPitOverlap(x, w)) {
          game.platforms.push({ x, y, w, h: 13 });
        }
        px += randInt(116, 194);
      }

      for (let x = 420; x < stage.length - 160; x += randInt(240, 350)) {
        const gy = groundYAt(x, stage);
        const w = randInt(40, 64);
        const y = gy - randInt(20, 36);
        game.platforms.push({ x: x + randInt(-18, 10), y, w, h: 12 });
      }

      // Contra-style stacked ledges for multi-lane firefights.
      for (let x = 620; x < stage.length - 260; x += randInt(270, 360)) {
        if (rand() < 0.4) continue;
        const baseY = groundYAt(x, stage);
        const lowerW = randInt(54, 96);
        const upperW = randInt(48, 88);
        const lowerX = x + randInt(-24, 24);
        const upperX = lowerX + randInt(26, 68);
        const lowerY = baseY - randInt(36, 62);
        const upperY = lowerY - randInt(44, 76);
        if (!isPitOverlap(lowerX, lowerW)) game.platforms.push({ x: lowerX, y: lowerY, w: lowerW, h: 12 });
        if (!isPitOverlap(upperX, upperW)) game.platforms.push({ x: upperX, y: upperY, w: upperW, h: 11 });
      }
      return;
    }

    if (stage.kind === 'bionic') {
      let px = 340;
      while (px < stage.length - 220) {
        if (rand() < 0.24) {
          px += randInt(280, 420);
          continue;
        }

        const chainSteps = randInt(1, 2);
        let x = px + randInt(-20, 26);
        let y = groundYAt(px, stage) - randInt(132, 218);
        for (let i = 0; i < chainSteps; i++) {
          const w = randInt(84, 132);
          if (!isPitOverlap(x, w) && x < stage.length - 120) {
            game.platforms.push({ x, y, w, h: 14 });
            game.anchors.push({ x: x + w * 0.5, y: y - randInt(124, 204) });
          }
          x += randInt(238, 352);
          y += randInt(-54, 30);
        }
        px += randInt(560, 820);
      }

      for (let x = 420; x < stage.length - 140; x += randInt(380, 560)) {
        const y = groundYAt(x, stage) - randInt(232, 356);
        game.anchors.push({ x, y });
      }
      return;
    }

    let px = stage.kind === 'blaster' ? 340 : 320;
    while (px < stage.length - 260) {
      const w = stage.kind === 'blaster' ? randInt(88, 182) : randInt(90, 198);
      const x = px + randInt(-24, 66);
      if (!isPitOverlap(x, w)) {
        const lift = stage.kind === 'blaster' ? randInt(40, 92) : randInt(58, 136);
        const y = groundYAt(x + w * 0.5, stage) - lift;
        game.platforms.push({ x, y, w, h: 14 });
      }
      px += stage.kind === 'blaster' ? randInt(126, 240) : randInt(116, 220);
    }

    // Extra staircase chains increase Mario-like flow and jump rhythm.
    for (let s = 0; s < (stage.kind === 'blaster' ? 7 : 9); s++) {
      const baseX = 580 + s * (stage.kind === 'blaster' ? 620 : 520) + randInt(-40, 70);
      const stepN = stage.kind === 'blaster' ? randInt(2, 4) : randInt(3, 5);
      let x = baseX;
      let y = groundYAt(baseX, stage) - (stage.kind === 'blaster' ? 44 : 56);
      for (let i = 0; i < stepN; i++) {
        const w = randInt(70, 120);
        if (x < stage.length - 150 && !isPitOverlap(x, w)) {
          game.platforms.push({ x, y, w, h: 14 });
        }
        x += randInt(74, 108);
        y -= randInt(12, 22);
      }
    }

    if (stage.allowMario !== false) buildMarioFeatures(stage);
  }

  function buildMarioFeatures(stage) {
    const blockCount = stage.kind === 'blaster' ? 30 : 42;
    for (let i = 0; i < blockCount; i++) {
      const worldX = 340 + i * randInt(98, 156) + randInt(-28, 24);
      if (worldX > stage.length - 100) break;
      const baseY = groundYAt(worldX, stage) - randInt(stage.kind === 'blaster' ? 62 : 72, stage.kind === 'blaster' ? 130 : 170);
      const typeRoll = rand();
      const type = typeRoll < 0.62 ? 'brick' : typeRoll < 0.84 ? 'qblock' : 'coinline';

      if (type === 'coinline') {
        for (let c = 0; c < randInt(3, 5); c++) {
          const coinX = worldX + c * 22;
          if (!isPitOverlap(coinX - 8, 16) && coinX < stage.length - 60) {
            spawnPickup(coinX, baseY - 8, 'btc');
          }
        }
        continue;
      }

      game.marioBlocks.push({
        x: worldX,
        y: baseY,
        w: 26,
        h: 22,
        kind: type,
        used: false,
        bump: 0
      });
    }

    const pipeCount = stage.kind === 'blaster' ? 12 : 16;
    for (let i = 0; i < pipeCount; i++) {
      const x = 420 + i * randInt(300, 420) + randInt(-36, 36);
      const w = randInt(42, 54);
      if (x > stage.length - 120 || isPitOverlap(x, w)) continue;
      game.pipes.push({
        x,
        w,
        h: randInt(48, stage.kind === 'blaster' ? 76 : 92)
      });
    }
  }

  function createPlayer(kind) {
    const p = {
      mode: kind,
      x: kind === 'vehicle' ? 220 : kind === 'shooter' ? 210 : 160,
      wx: kind === 'vehicle' ? 220 : kind === 'shooter' ? 210 : 160,
      y: kind === 'shooter' ? H * 0.46 : 200,
      vx: 0,
      vy: 0,
      w: kind === 'vehicle' ? 58 : kind === 'shooter' ? 42 : 34,
      h: kind === 'vehicle' ? 30 : kind === 'shooter' ? 24 : 50,
      onGround: kind !== 'shooter' ? false : true,
      coyote: 0,
      jumpBuffer: 0,
      speed: (kind === 'vehicle' || kind === 'shooter') ? game.stage.baseSpeed : 0,
      targetSpeed: (kind === 'vehicle' || kind === 'shooter') ? game.stage.baseSpeed : 0,
      facing: 1,
      fireCd: 0,
      upFireCd: 0,
      hookCd: 0,
      hookLine: 0,
      grappleTarget: null,
      swordCd: 0,
      swordFx: 0,
      swordCombo: 0,
      swordComboTimer: 0,
      hp: 6,
      maxHp: 6,
      inv: 0,
      shield: 0,
      weapon: kind === 'sword' ? 'sword' : 'basic',
      weaponTimer: 0,
      fireFx: 0,
      fireFxUp: 0,
      runBoost: 0,
      duck: false
    };
    if (kind === 'shooter') {
      p.wx = p.x;
      p.y = H * 0.46;
      p.onGround = true;
    } else {
      p.wx = findSafeX(p.wx);
      const floor = groundYAt(p.wx) - p.h * 0.5;
      p.y = floor;
      p.onGround = true;
    }
    return p;
  }

  function resetTransientState() {
    game.enemies.length = 0;
    game.bullets.length = 0;
    game.enemyBullets.length = 0;
    game.pickups.length = 0;
    game.slashes.length = 0;
    game.particles.length = 0;
  }

  function initStage(index) {
    game.stageIndex = index;
    game.stage = STAGES[index];
    game.paused = false;
    game.cameraX = 0;
    game.checkpointX = 0;
    game.stageTime = 0;
    game.messageTimer = 230;
    game.spawnEnemyTimer = randInt(game.stage.enemyInterval[0], game.stage.enemyInterval[1]);
    game.spawnPickupTimer = randInt(game.stage.pickupInterval[0], game.stage.pickupInterval[1]);
    resetTransientState();

    srand(0x91f22 + index * 0x2231);
    buildStageTerrain(game.stage);
    game.player = createPlayer(game.stage.kind);
    game.state = 'briefing';
  }

  function startRun() {
    game.score = 0;
    game.lives = 4;
    initStage(0);
    game.state = 'briefing';
  }

  function saveHiScore() {
    if (game.score > game.hiScore) {
      game.hiScore = game.score;
      localStorage.setItem('madPatrol2HighScore', String(game.hiScore));
    }
  }

  function particle(x, y, color = '#ffd27a', life = 20, vx = randRange(-1.8, 1.8), vy = randRange(-2.1, 0.6), size = randRange(1.8, 3.8)) {
    game.particles.push({ x, y, color, life, maxLife: life, vx, vy, size });
  }

  function burst(x, y, color = '#ffbf7d', count = 10, power = 1) {
    for (let i = 0; i < count; i++) {
      particle(x + randRange(-8, 8), y + randRange(-8, 8), color, randInt(14, 26), randRange(-2.3, 2.3) * power, randRange(-2.5, 1.1) * power, randRange(1.8, 3.8));
    }
  }

  function respawnAtCheckpoint() {
    const stage = game.stage;
    resetTransientState();
    game.player = createPlayer(stage.kind);

    if (stage.kind === 'vehicle') {
      game.cameraX = clamp(game.checkpointX, 0, stage.length - W);
      game.player.x = 220;
      game.player.wx = game.cameraX + game.player.x;
      game.player.targetSpeed = stage.baseSpeed;
      game.player.speed = stage.baseSpeed;
    } else if (stage.kind === 'shooter') {
      game.cameraX = clamp(game.checkpointX, 0, stage.length - W);
      game.player.x = 210;
      game.player.y = H * 0.46;
      game.player.wx = game.cameraX + game.player.x;
      game.player.vx = 0;
      game.player.vy = 0;
      game.player.targetSpeed = stage.baseSpeed;
      game.player.speed = stage.baseSpeed;
    } else {
      const safe = findSafeX(game.checkpointX + 120);
      game.player.wx = safe;
      const focus = stage.kind === 'sword' ? W * 0.42 : W * 0.38;
      game.cameraX = clamp(safe - focus, 0, stage.length - W);
      game.player.y = groundYAt(safe) - game.player.h * 0.5;
      game.player.onGround = true;
      game.player.vx = 0;
      game.player.vy = 0;
    }
    game.messageTimer = 100;
  }

  function loseLife(reason = 'danger') {
    game.lives -= 1;
    beep(160, 0.14, 'sawtooth', 0.06, -130);
    burst(game.player.wx, game.player.y, '#ff6a6a', 18, 1.2);
    if (game.lives < 0) {
      game.state = 'gameover';
      saveHiScore();
      return;
    }
    respawnAtCheckpoint();
    if (reason === 'pit') {
      game.score = Math.max(0, game.score - 250);
    }
  }

  function damagePlayer(amount = 1) {
    const p = game.player;
    if (p.inv > 0) return;
    if (p.shield > 0) {
      p.shield = Math.max(0, p.shield - 110 * amount);
      beep(250, 0.06, 'triangle', 0.05, -50);
      burst(p.wx, p.y - 10, '#7fe3ff', 7, 0.8);
      return;
    }

    p.hp -= amount;
    p.inv = 70;
    beep(180, 0.12, 'square', 0.06, -100);
    burst(p.wx, p.y - 8, '#ff7a7a', 12, 1);

    if (p.hp <= 0) {
      loseLife('hit');
    }
  }

  function maybeCheckpoint() {
    if (game.stage.kind === 'vehicle') {
      if (game.cameraX > game.checkpointX + game.stage.checkpointStep) {
        game.checkpointX = game.cameraX;
      }
    } else if (game.player.wx > game.checkpointX + game.stage.checkpointStep) {
      game.checkpointX = game.player.wx;
    }
  }

  function rescueVehicleFromPit() {
    const p = game.player;
    const stage = game.stage;
    const safeX = findSafeX(p.wx + 96);
    p.wx = safeX;
    game.cameraX = clamp(safeX - p.x, 0, stage.length - W);
    p.y = groundYAt(safeX) - p.h * 0.5;
    p.vy = 0;
    p.onGround = true;
    p.speed = Math.max(stage.minSpeed, stage.baseSpeed * 0.9);
    p.targetSpeed = p.speed;
    p.inv = 80;
    p.hp = Math.max(1, p.hp - 1);
    game.score = Math.max(0, game.score - 120);
    burst(p.wx, p.y, '#ffd07a', 10, 0.9);
    beep(210, 0.08, 'triangle', 0.05, -70);
  }

  function rescueOnFootFromPit() {
    const p = game.player;
    const stage = game.stage;
    if (p.hp <= 1) {
      loseLife('pit');
      return;
    }
    const safeX = findSafeX(p.wx + 72);
    p.hp -= 1;
    p.wx = safeX;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
    p.inv = 70;
    p.y = groundYAt(safeX) - p.h * 0.5;
    const focus = stage.kind === 'sword' ? W * 0.42 : W * 0.38;
    game.cameraX = clamp(p.wx - focus, 0, stage.length - W);
    game.score = Math.max(0, game.score - 100);
    burst(p.wx, p.y, '#9fd4ff', 10, 0.9);
    beep(240, 0.07, 'triangle', 0.045, -60);
  }

  function spawnPickup(worldX, worldY = null, forcedType = null) {
    let type = forcedType;
    const stage = game.stage;

    if (!type) {
      const pool = stage.kind === 'sword'
        ? ['btc', 'btc', 'btc', 'med', 'shield', 'btc']
        : stage.kind === 'vehicle'
          ? ['btc', 'btc', 'btc', 'btc', 'spread', 'burst', 'wave', 'laser', 'giant', 'nuke', 'shield', 'med', 'plasma', 'spread', 'wave']
          : stage.kind === 'shooter'
            ? ['btc', 'btc', 'spread', 'burst', 'laser', 'wave', 'giant', 'shield', 'med', 'nuke', 'laser', 'burst', 'plasma', 'plasma']
            : stage.kind === 'bionic'
              ? ['btc', 'btc', 'spread', 'burst', 'wave', 'shield', 'med', 'laser', 'btc']
              : ['btc', 'btc', 'btc', 'btc', 'spread', 'wave', 'giant', 'nuke', 'shield', 'med', 'btc'];
      type = pick(pool);
    }

    const y = worldY == null
      ? (stage.kind === 'vehicle'
          ? randRange(130, 246)
          : stage.kind === 'shooter'
            ? randRange(104, H - 190)
            : randRange(126, 260))
      : worldY;

    game.pickups.push({
      type,
      x: worldX,
      y,
      vy: 0,
      float: randRange(0, Math.PI * 2),
      w: 34,
      h: 34,
      life: 1200
    });
  }

  function spawnEnemy() {
    const stage = game.stage;
    const spawnX = game.cameraX + W + randInt(40, 200);

    if (stage.kind === 'vehicle') {
      const roll = rand();
      if (roll < 0.3) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'drone',
          x: spawnX,
          y: randRange(112, 240),
          vx: -(2.2 + randRange(0, 1.4)),
          vy: randRange(-0.2, 0.2),
          w: 34,
          h: 24,
          hp: 2,
          shootCd: randInt(58, 110),
          dead: false
        });
      } else if (roll < 0.52) {
        const floor = groundYAt(spawnX) - 16;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'hopper',
          x: spawnX,
          y: floor,
          vx: -(2.2 + randRange(0, 1.1)),
          vy: 0,
          w: 28,
          h: 30,
          hp: 2,
          jumpCd: randInt(32, 88),
          onGround: true,
          dead: false
        });
      } else if (roll < 0.72) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'saucer',
          x: spawnX,
          y: randRange(96, 190),
          vx: -(2.8 + randRange(0.6, 1.6)),
          vy: randRange(-0.2, 0.2),
          w: 42,
          h: 24,
          hp: 3,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(44, 86),
          dead: false
        });
      } else if (roll < 0.9) {
        const floor = groundYAt(spawnX) - 18;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'raider',
          x: spawnX,
          y: floor,
          vx: -(2.6 + randRange(0.6, 1.2)),
          vy: 0,
          w: 40,
          h: 28,
          hp: 3,
          shootCd: randInt(54, 110),
          dead: false
        });
      } else {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'orbiter',
          x: spawnX,
          y: randRange(88, 164),
          vx: -(2.5 + randRange(0.8, 1.5)),
          vy: randRange(-0.16, 0.16),
          w: 34,
          h: 24,
          hp: 3,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(36, 74),
          dead: false
        });
      }
      return;
    }

    if (stage.kind === 'shooter') {
      if (stage.theme === 'underwater') {
        const roll = rand();
        if (roll < 0.26) {
          game.enemies.push({
            id: game.nextEnemyId++,
            kind: 'jelly_mine',
            x: spawnX,
            y: randRange(116, H - 200),
            vx: -(2.0 + randRange(0.3, 0.9)),
            vy: randRange(-0.18, 0.18),
            w: 30,
            h: 30,
            hp: 3,
            phase: randRange(0, Math.PI * 2),
            shootCd: randInt(44, 90),
            dead: false
          });
        } else if (roll < 0.54) {
          game.enemies.push({
            id: game.nextEnemyId++,
            kind: 'torpedo_eel',
            x: spawnX,
            y: randRange(108, H - 198),
            vx: -(3.0 + randRange(0.7, 1.2)),
            vy: randRange(-0.22, 0.22),
            w: 38,
            h: 20,
            hp: 3,
            phase: randRange(0, Math.PI * 2),
            shootCd: randInt(36, 72),
            dashCd: randInt(30, 68),
            dead: false
          });
        } else if (roll < 0.79) {
          game.enemies.push({
            id: game.nextEnemyId++,
            kind: 'squid_striker',
            x: spawnX,
            y: randRange(104, H - 214),
            vx: -(2.4 + randRange(0.4, 1.0)),
            vy: randRange(-0.3, 0.3),
            w: 34,
            h: 34,
            hp: 4,
            phase: randRange(0, Math.PI * 2),
            shootCd: randInt(32, 64),
            dead: false
          });
        } else {
          game.enemies.push({
            id: game.nextEnemyId++,
            kind: 'submarine',
            x: spawnX,
            y: randRange(118, H - 210),
            vx: -(1.8 + randRange(0.3, 0.8)),
            vy: randRange(-0.15, 0.15),
            w: 46,
            h: 22,
            hp: 5,
            phase: randRange(0, Math.PI * 2),
            shootCd: randInt(28, 58),
            dead: false
          });
        }
        return;
      }

      const roll = rand();
      if (roll < 0.23) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'rtype_pod',
          x: spawnX,
          y: randRange(110, H - 210),
          vx: -(2.9 + randRange(0.5, 1.3)),
          vy: randRange(-0.2, 0.2),
          w: 38,
          h: 26,
          hp: 2,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(48, 92),
          dead: false
        });
      } else if (roll < 0.42) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'gradius_core',
          x: spawnX,
          y: randRange(104, H - 198),
          vx: -(2.6 + randRange(0.4, 1.0)),
          vy: randRange(-0.35, 0.35),
          w: 34,
          h: 34,
          hp: 3,
          shootCd: randInt(38, 72),
          dead: false
        });
      } else if (roll < 0.6) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'moai_turret',
          x: spawnX,
          y: randRange(116, H - 190),
          vx: -(2.2 + randRange(0.1, 0.8)),
          vy: 0,
          w: 42,
          h: 46,
          hp: 4,
          shootCd: randInt(54, 98),
          dead: false
        });
      } else if (roll < 0.79) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'ace_fighter',
          x: spawnX,
          y: randRange(92, H - 220),
          vx: -(3.2 + randRange(0.8, 1.6)),
          vy: randRange(-0.45, 0.45),
          w: 34,
          h: 20,
          hp: 3,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(30, 64),
          dashCd: randInt(26, 62),
          dead: false
        });
      } else if (roll < 0.94) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'hunter_drone',
          x: spawnX,
          y: randRange(90, H - 220),
          vx: -(2.7 + randRange(0.8, 1.4)),
          vy: randRange(-0.3, 0.3),
          w: 32,
          h: 24,
          hp: 4,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(32, 70),
          dashCd: randInt(34, 74),
          dead: false
        });
      } else {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'blade_spinner',
          x: spawnX,
          y: randRange(100, H - 210),
          vx: -(2.4 + randRange(0.5, 1.2)),
          vy: randRange(-0.24, 0.24),
          w: 34,
          h: 34,
          hp: 5,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(28, 60),
          dashCd: randInt(30, 68),
          dead: false
        });
      }
      return;
    }

    if (stage.kind === 'bionic') {
      const roll = rand();
      if (roll < 0.22) {
        const floor = groundYAt(spawnX) - 21;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'walker',
          x: spawnX,
          y: floor,
          vx: -(1.4 + randRange(0.2, 0.9)),
          vy: 0,
          w: 30,
          h: 42,
          hp: 2,
          shootCd: randInt(64, 124),
          onGround: true,
          dead: false
        });
      } else if (roll < 0.4) {
        const floor = groundYAt(spawnX) - 22;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'jumper',
          x: spawnX,
          y: floor,
          vx: -(1.6 + randRange(0.6, 1.3)),
          vy: 0,
          w: 30,
          h: 34,
          hp: 2,
          jumpCd: randInt(24, 68),
          onGround: true,
          dead: false
        });
      } else if (roll < 0.56) {
        let tx = spawnX;
        let ty = groundYAt(spawnX) - 74;
        if (game.platforms.length > 0) {
          const candidates = game.platforms.filter((p) => p.x > spawnX - 120 && p.x < spawnX + 140);
          if (candidates.length > 0) {
            const pf = pick(candidates);
            tx = pf.x + pf.w * 0.5;
            ty = pf.y - 16;
          }
        }
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'turret',
          x: tx,
          y: ty,
          vx: -0.14,
          vy: 0,
          w: 30,
          h: 30,
          hp: 3,
          shootCd: randInt(42, 86),
          dead: false
        });
      } else if (roll < 0.9) {
        const floor = groundYAt(spawnX) - 24;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'bionic_ninja',
          x: spawnX,
          y: floor,
          vx: -(1.7 + randRange(0.7, 1.5)),
          vy: 0,
          w: 30,
          h: 46,
          hp: 4,
          jumpCd: randInt(24, 58),
          shootCd: randInt(40, 88),
          hookCd: randInt(28, 66),
          dashCd: randInt(32, 76),
          hookLife: 0,
          hookAnchor: null,
          onGround: true,
          dead: false
        });
      } else {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'commando_drone',
          x: spawnX,
          y: randRange(120, 240),
          vx: -(2.1 + randRange(0.6, 1.1)),
          vy: randRange(-0.28, 0.28),
          w: 30,
          h: 22,
          hp: 2,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(48, 100),
          dead: false
        });
      }
      return;
    }

    if (stage.kind === 'blaster') {
      const roll = rand();
      if (roll < 0.28) {
        const floor = groundYAt(spawnX) - 21;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'walker',
          x: spawnX,
          y: floor,
          vx: -(1.2 + randRange(0, 0.9)),
          vy: 0,
          w: 30,
          h: 42,
          hp: 2,
          shootCd: randInt(70, 150),
          onGround: true,
          dead: false
        });
      } else if (roll < 0.5) {
        const floor = groundYAt(spawnX) - 22;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'jumper',
          x: spawnX,
          y: floor,
          vx: -(1.4 + randRange(0.8, 1.3)),
          vy: 0,
          w: 30,
          h: 34,
          hp: 2,
          jumpCd: randInt(28, 72),
          onGround: true,
          dead: false
        });
      } else if (roll < 0.68) {
        let tx = spawnX;
        let ty = groundYAt(spawnX) - 20;
        if (game.platforms.length > 0 && rand() < 0.72) {
          const candidates = game.platforms.filter((p) => p.x > spawnX - 80 && p.x < spawnX + 160);
          if (candidates.length > 0) {
            const pf = pick(candidates);
            tx = pf.x + pf.w * 0.5;
            ty = pf.y - 16;
          }
        }
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'turret',
          x: tx,
          y: ty,
          vx: -0.2,
          vy: 0,
          w: 30,
          h: 30,
          hp: 3,
          shootCd: randInt(44, 92),
          dead: false
        });
      } else if (roll < 0.82) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'commando_drone',
          x: spawnX,
          y: randRange(112, 230),
          vx: -(2.0 + randRange(0.4, 1.2)),
          vy: randRange(-0.2, 0.2),
          w: 30,
          h: 22,
          hp: 2,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(48, 96),
          dead: false
        });
      } else if (roll < 0.92) {
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'orbiter',
          x: spawnX,
          y: randRange(98, 190),
          vx: -(2.3 + randRange(0.5, 1.1)),
          vy: randRange(-0.15, 0.15),
          w: 34,
          h: 24,
          hp: 3,
          phase: randRange(0, Math.PI * 2),
          shootCd: randInt(42, 86),
          dead: false
        });
      } else if (roll < 0.97) {
        const floor = groundYAt(spawnX) - 18;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'raider',
          x: spawnX,
          y: floor,
          vx: -(2.7 + randRange(0.8, 1.4)),
          vy: 0,
          w: 40,
          h: 28,
          hp: 3,
          shootCd: randInt(48, 92),
          dead: false
        });
      } else {
        const floor = groundYAt(spawnX) - 22;
        game.enemies.push({
          id: game.nextEnemyId++,
          kind: 'ninja',
          x: spawnX,
          y: floor,
          vx: -(2.0 + randRange(0.8, 1.5)),
          vy: 0,
          w: 28,
          h: 44,
          hp: 2,
          jumpCd: randInt(30, 78),
          onGround: true,
          dead: false
        });
      }
      return;
    }

    if (rand() < 0.6) {
      const floor = groundYAt(spawnX) - 22;
      game.enemies.push({
        id: game.nextEnemyId++,
        kind: 'ninja',
        x: spawnX,
        y: floor,
        vx: -(1.6 + randRange(0, 0.9)),
        vy: 0,
        w: 28,
        h: 44,
        hp: 2,
        jumpCd: randInt(36, 100),
        onGround: true,
        dead: false
      });
    } else if (rand() < 0.85) {
      const floor = groundYAt(spawnX) - 24;
      game.enemies.push({
        id: game.nextEnemyId++,
        kind: 'elite_ninja',
        x: spawnX,
        y: floor,
        vx: -(2.1 + randRange(0.7, 1.4)),
        vy: 0,
        w: 30,
        h: 46,
        hp: 4,
        jumpCd: randInt(24, 66),
        shootCd: randInt(42, 96),
        onGround: true,
        dead: false
      });
    } else {
      game.enemies.push({
        id: game.nextEnemyId++,
        kind: 'bat',
        x: spawnX,
        y: randRange(118, 240),
        vx: -(2.2 + randRange(0.4, 1.4)),
        vy: randRange(-0.4, 0.4),
        w: 30,
        h: 20,
        hp: 1,
        phase: randRange(0, Math.PI * 2),
        dead: false
      });
    }
  }

  function rectHit(a, b) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
  }

  function enemyRect(enemy) {
    return { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
  }

  function playerRect() {
    const p = game.player;
    if (!p) return { x: 0, y: 0, w: 0, h: 0 };
    const onFoot = p.mode !== 'vehicle' && p.mode !== 'shooter';
    if (onFoot && p.duck) {
      const crouchH = Math.round(p.h * 0.58);
      const crouchY = p.y + (p.h - crouchH) * 0.5;
      return { x: p.wx, y: crouchY, w: p.w, h: crouchH };
    }
    return { x: p.wx, y: p.y, w: p.w, h: p.h };
  }

  function addPlayerBullet(x, y, vx, vy, w, h, damage, opts = {}) {
    game.bullets.push({
      x,
      y,
      vx,
      vy,
      w,
      h,
      damage,
      life: opts.life || 170,
      wave: !!opts.wave,
      phase: randRange(0, Math.PI * 2),
      pierce: opts.pierce || 0,
      nuke: !!opts.nuke,
      plasma: !!opts.plasma,
      rear: !!opts.rear,
      altTick: game.frame
    });
  }

  function addEnemyBullet(x, y, vx, vy, w = 10, h = 6, life = 190) {
    game.enemyBullets.push({ x, y, vx, vy, w, h, life });
  }

  function fireEnemyAtPlayer(enemy, speed = 3.2, spread = 0) {
    const p = game.player;
    const dx = p.wx - enemy.x;
    const dy = p.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    const baseVx = (dx / d) * speed;
    const baseVy = (dy / d) * speed;
    addEnemyBullet(enemy.x, enemy.y, baseVx - 0.6, baseVy + spread);
  }

  function shootPlayer(direction = 'forward') {
    const p = game.player;
    if (!p || game.stage.kind === 'sword') return;

    const dirX = direction === 'up' ? 0 : (game.stage.kind === 'vehicle' || game.stage.kind === 'shooter' ? 1 : p.facing);
    const dirY = direction === 'up' ? -1 : 0;

    const duckForwardShot = direction === 'forward'
      && p.duck
      && game.stage.kind !== 'vehicle'
      && game.stage.kind !== 'shooter';
    const bx = p.wx + (direction === 'up' ? 0 : p.facing * (duckForwardShot ? 18 : 20));
    const by = p.y - (direction === 'up' ? 24 : (duckForwardShot ? -1 : 10));

    const weapon = p.weapon;

    if (weapon === 'spread') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -8.7, 10, 5, 1);
        addPlayerBullet(bx, by, 2.1, -8.2, 10, 5, 1);
        addPlayerBullet(bx, by, -2.1, -8.2, 10, 5, 1);
      } else {
        addPlayerBullet(bx, by, dirX * 8.6, 0, 11, 5, 1);
        addPlayerBullet(bx, by, dirX * 8.1, -2.1, 10, 5, 1);
        addPlayerBullet(bx, by, dirX * 8.1, 2.1, 10, 5, 1);
      }
    } else if (weapon === 'burst') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -9.1, 10, 5, 1);
        addPlayerBullet(bx, by, 1.6, -8.9, 10, 5, 1);
        addPlayerBullet(bx, by, -1.6, -8.9, 10, 5, 1);
        addPlayerBullet(bx, by, 2.8, -8.1, 10, 5, 1);
        addPlayerBullet(bx, by, -2.8, -8.1, 10, 5, 1);
      } else {
        addPlayerBullet(bx, by, dirX * 9.2, 0, 11, 5, 1);
        addPlayerBullet(bx, by, dirX * 8.8, -2.4, 10, 5, 1);
        addPlayerBullet(bx, by, dirX * 8.8, 2.4, 10, 5, 1);
        addPlayerBullet(bx, by, dirX * 8.2, -3.4, 9, 4, 1);
        addPlayerBullet(bx, by, dirX * 8.2, 3.4, 9, 4, 1);
      }
    } else if (weapon === 'laser') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -11.4, 42, 4, 2, { pierce: 6, life: 90 });
      } else {
        addPlayerBullet(bx, by, dirX * 11.8, 0, 48, 4, 2, { pierce: 6, life: 100 });
      }
    } else if (weapon === 'plasma') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -10.2, 16, 8, 3, { pierce: 2, life: 120, plasma: true });
        addPlayerBullet(bx, by, 1.6, -9.7, 10, 5, 1, { plasma: true });
        addPlayerBullet(bx, by, -1.6, -9.7, 10, 5, 1, { plasma: true });
      } else {
        addPlayerBullet(bx, by, dirX * 10.2, 0, 20, 8, 3, { pierce: 2, life: 120, plasma: true });
        addPlayerBullet(bx, by, dirX * 9.2, -1.9, 10, 5, 1, { plasma: true });
        addPlayerBullet(bx, by, dirX * 9.2, 1.9, 10, 5, 1, { plasma: true });
        if (game.stage.kind === 'shooter') {
          addPlayerBullet(bx, by, dirX * 8.7, -3.3, 9, 4, 1, { plasma: true });
          addPlayerBullet(bx, by, dirX * 8.7, 3.3, 9, 4, 1, { plasma: true });
        }
      }
    } else if (weapon === 'wave') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -8.2, 30, 14, 2, { wave: true, pierce: 3, life: 120 });
      } else {
        addPlayerBullet(bx, by, dirX * 7.6, 0, 30, 14, 2, { wave: true, pierce: 3, life: 130 });
      }
    } else if (weapon === 'giant') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -7.4, 46, 22, 4, { life: 130, pierce: 1 });
      } else {
        addPlayerBullet(bx, by, dirX * 7.3, 0, 54, 24, 4, { life: 130, pierce: 1 });
      }
    } else if (weapon === 'nuke') {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -6.5, 30, 30, 5, { nuke: true, life: 128 });
      } else {
        addPlayerBullet(bx, by, dirX * 6.3, 0, 30, 30, 5, { nuke: true, life: 128 });
      }
    } else {
      if (direction === 'up') {
        addPlayerBullet(bx, by, 0, -8.8, 10, 5, 1);
      } else {
        addPlayerBullet(bx, by, dirX * 8.8, 0, 12, 6, 1);
      }
    }

    // Mad Patrol legacy rear shot in car mode.
    if (game.stage.kind === 'vehicle' && direction === 'forward') {
      addPlayerBullet(p.wx - 22, p.y - 9, -7.1, 0, 10, 5, 1, { rear: true });
    }

    p.fireFx = direction === 'forward' ? 5 : p.fireFx;
    p.fireFxUp = direction === 'up' ? 5 : p.fireFxUp;

    beep(700, 0.04, 'square', 0.04, 120);
  }

  function swordSlash() {
    const p = game.player;
    if (!p || game.stage.kind !== 'sword') return;
    if (p.swordCd > 0) return;
    const comboActive = p.swordComboTimer > 0;
    p.swordCombo = comboActive ? Math.min(3, p.swordCombo + 1) : 1;
    p.swordComboTimer = 28;
    p.swordCd = Math.max(8, 16 - p.swordCombo * 2);
    p.swordFx = 12 + p.swordCombo * 4;

    const slashRadius = 34 + p.swordCombo * 8;
    const slashDamage = 2 + p.swordCombo;
    const swingOffset = 20 + p.swordCombo * 4;

    const slash = {
      x: p.wx + p.facing * swingOffset,
      y: p.y - 8 - p.swordCombo * 2,
      r: slashRadius,
      life: 9 + p.swordCombo,
      maxLife: 9 + p.swordCombo,
      damage: slashDamage,
      facing: p.facing,
      combo: p.swordCombo,
      spin: p.swordCombo % 2 === 0 ? -1 : 1,
      hitIds: new Set()
    };
    game.slashes.push(slash);
    if (p.swordCombo >= 2) {
      game.slashes.push({
        x: p.wx + p.facing * (swingOffset + 8),
        y: p.y - 12,
        r: slashRadius * 0.78,
        life: 7,
        maxLife: 7,
        damage: slashDamage - 1,
        facing: p.facing,
        combo: p.swordCombo,
        spin: p.swordCombo % 2 === 0 ? -1 : 1,
        hitIds: new Set()
      });
    }

    // Light forward lunge gives combat energy without making jumps unsafe.
    p.vx += p.facing * (0.9 + p.swordCombo * 0.38);

    beep(500 + p.swordCombo * 80, 0.05, 'triangle', 0.05, -50 + p.swordCombo * 10);
  }

  function explodeNuke(x, y, baseDamage = 4) {
    const radius = 92;
    for (const e of game.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= radius) {
        e.hp -= Math.max(1, baseDamage - Math.floor(d / 28));
      }
    }
    burst(x, y, '#ff8d5a', 24, 1.45);
    burst(x, y, '#ffd07a', 14, 1.25);
    beep(220, 0.13, 'sawtooth', 0.06, -120);
  }

  function handlePickup(type) {
    const p = game.player;

    if (type === 'btc') {
      game.score += 650;
      beep(900, 0.04, 'triangle', 0.05, 130);
      return;
    }

    if (type === 'med') {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      game.score += 300;
      beep(810, 0.08, 'square', 0.04, 160);
      return;
    }

    if (type === 'shield') {
      p.shield = 760;
      game.score += 360;
      beep(360, 0.1, 'triangle', 0.05, 50);
      return;
    }

    if (game.stage.kind === 'sword') {
      game.score += 200;
      return;
    }

    if (type === 'spread') {
      p.weapon = 'spread';
      p.weaponTimer = 780;
      game.score += 360;
      beep(620, 0.08, 'square', 0.04, 120);
      return;
    }

    if (type === 'burst') {
      p.weapon = 'burst';
      p.weaponTimer = 700;
      game.score += 390;
      beep(660, 0.06, 'triangle', 0.05, 140);
      return;
    }

    if (type === 'wave') {
      p.weapon = 'wave';
      p.weaponTimer = 860;
      game.score += 380;
      beep(540, 0.08, 'sawtooth', 0.04, 90);
      return;
    }

    if (type === 'laser') {
      p.weapon = 'laser';
      p.weaponTimer = 740;
      game.score += 430;
      beep(760, 0.06, 'square', 0.05, 220);
      return;
    }

    if (type === 'plasma') {
      p.weapon = 'plasma';
      p.weaponTimer = 780;
      game.score += 470;
      beep(700, 0.07, 'sawtooth', 0.05, 180);
      return;
    }

    if (type === 'giant') {
      p.weapon = 'giant';
      p.weaponTimer = 730;
      game.score += 420;
      beep(280, 0.08, 'square', 0.05, 100);
      return;
    }

    if (type === 'nuke') {
      p.weapon = 'nuke';
      p.weaponTimer = 640;
      game.score += 500;
      beep(220, 0.12, 'sawtooth', 0.06, -40);
    }
  }

  function processStageClear() {
    game.score += 3200 + game.stageIndex * 600;
    game.state = 'stage_clear';
    game.messageTimer = 210;
    resetTransientState();
    beep(280, 0.18, 'triangle', 0.07, 180);
    maybeCheckpoint();
  }

  function nextStageOrWin() {
    if (game.stageIndex >= STAGES.length - 1) {
      game.state = 'win';
      saveHiScore();
      return;
    }
    initStage(game.stageIndex + 1);
  }

  function updateVehiclePlayer() {
    const p = game.player;
    const stage = game.stage;

    const left = keysDown.has('arrowleft');
    const right = keysDown.has('arrowright');
    const highJump = keysPressed.has('arrowup');

    if (left) p.targetSpeed -= 0.1;
    if (right) p.targetSpeed += 0.1;
    if (!left && !right) {
      p.targetSpeed += (stage.baseSpeed - p.targetSpeed) * 0.1;
    }
    p.targetSpeed = clamp(p.targetSpeed, stage.minSpeed, stage.maxSpeed);
    p.speed += (p.targetSpeed - p.speed) * 0.16;

    p.x += (220 - p.x) * 0.09;
    if (left) p.x -= 1.3;
    if (right) p.x += 1.2;
    p.x = clamp(p.x, 150, 320);

    // Assistive auto-hop keeps stage 1 approachable while preserving pit gameplay.
    const pitAhead = pitAt(p.wx + 56);
    if (pitAhead && p.onGround && p.vy >= 0) {
      const pitBoost = clamp((pitAhead.w - 62) * 0.05, 0, 1.8);
      p.vy = -(10.4 + pitBoost);
      p.onGround = false;
      p.fireFxUp = 2;
    }

    if (highJump && p.onGround) {
      const slopeAhead = groundYAt(p.wx + 20) - groundYAt(p.wx - 20);
      const slopeBoost = clamp(-slopeAhead * 0.035, -0.8, 1.6);
      const speedBoost = clamp((p.speed - stage.baseSpeed) * 0.8, 0, 1.6);
      p.vy = -(11.7 + slopeBoost + speedBoost + randRange(0.1, 0.7));
      p.onGround = false;
      beep(330, 0.05, 'square', 0.05, -80);
    }
    game.cameraX += p.speed;
    game.cameraX = clamp(game.cameraX, 0, stage.length - W);

    const prevBottom = p.y + p.h * 0.5;
    p.vy += 0.54;
    p.y += p.vy;
    p.wx = game.cameraX + p.x;

    p.onGround = false;
    if (!pitAt(p.wx)) {
      const floorY = groundYAt(p.wx);
      const nowBottom = p.y + p.h * 0.5;
      if (prevBottom <= floorY + 8 && nowBottom >= floorY && p.vy >= 0) {
        p.y = floorY - p.h * 0.5;
        p.vy = 0;
        p.onGround = true;
      }
    }

    if (p.y > H + 120) {
      rescueVehicleFromPit();
      return;
    }

    const fireMain = keysDown.has(' ');

    if (fireMain) {
      if (p.fireCd <= 0) {
        shootPlayer('forward');
        p.fireCd = p.weapon === 'spread' ? 12
          : p.weapon === 'burst' ? 17
            : p.weapon === 'laser' ? 7
              : p.weapon === 'plasma' ? 9
              : p.weapon === 'nuke' ? 24
                : 10;
      }
      if (p.upFireCd <= 0) {
        shootPlayer('up');
        p.upFireCd = p.weapon === 'spread' ? 14
          : p.weapon === 'burst' ? 18
            : p.weapon === 'laser' ? 8
              : p.weapon === 'plasma' ? 11
              : 12;
      }
    }

    if (game.cameraX >= stage.length - W - 6) {
      processStageClear();
    }
  }

  function findGrappleAnchor(px, py, range = 320, direction = 1) {
    let best = null;
    let bestScore = Infinity;
    for (const a of game.anchors) {
      const dx = a.x - px;
      if (direction >= 0) {
        if (dx < 24 || dx > range) continue;
      } else if (dx > -24 || dx < -range) {
        continue;
      }
      if (a.y > py + 22) continue;
      const d = Math.hypot(dx, a.y - py);
      if (d > range) continue;
      const score = d + Math.abs(a.y - py) * 0.08;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }

  function findEnemyAnchor(ex, ey, range = 340) {
    let best = null;
    let bestDist = Infinity;
    for (const a of game.anchors) {
      if (a.x < ex - range || a.x > ex + range) continue;
      if (a.y > ey - 16) continue;
      const d = Math.hypot(a.x - ex, a.y - ey);
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return bestDist <= range ? best : null;
  }

  function updateShooterPlayer() {
    const p = game.player;
    const stage = game.stage;
    const underwater = stage.theme === 'underwater';

    const left = keysDown.has('arrowleft');
    const right = keysDown.has('arrowright');
    const up = keysDown.has('arrowup');
    const down = keysDown.has('arrowdown');
    const boost = false;

    const scrollSpeed = stage.baseSpeed + (boost ? 1.2 : 0) + (underwater ? -0.48 : 0);
    game.cameraX = clamp(game.cameraX + scrollSpeed, 0, stage.length - W);
    p.speed = scrollSpeed;

    if (left) p.vx -= underwater ? 0.42 : 0.54;
    if (right) p.vx += underwater ? 0.46 : 0.58;
    if (up) p.vy -= underwater ? 0.52 : 0.62;
    if (down) p.vy += underwater ? 0.52 : 0.62;

    p.vx *= underwater ? 0.9 : 0.83;
    p.vy *= underwater ? 0.9 : 0.83;
    if (underwater) {
      p.vy += Math.sin((game.frame + p.x) * 0.06) * 0.03;
    }
    p.x = clamp(p.x + p.vx, 120, 360);
    p.y = clamp(p.y + p.vy, 96, underwater ? H - 154 : H - 178);
    p.wx = game.cameraX + p.x;
    p.facing = 1;

    const fireMain = keysDown.has(' ');
    const fireUp = fireMain && up;
    if (fireMain && p.fireCd <= 0) {
      shootPlayer('forward');
      p.fireCd = p.weapon === 'spread' ? 10
        : p.weapon === 'burst' ? 15
          : p.weapon === 'laser' ? 6
            : p.weapon === 'plasma' ? 8
            : p.weapon === 'nuke' ? 22
              : 8;
    }
    if (fireUp && p.upFireCd <= 0) {
      shootPlayer('up');
      p.upFireCd = p.weapon === 'spread' ? 12
        : p.weapon === 'burst' ? 16
          : p.weapon === 'laser' ? 7
            : p.weapon === 'plasma' ? 10
            : 9;
    }

    if (game.cameraX >= stage.length - W - 6) {
      processStageClear();
    }
  }

  function updateOnFootPlayer() {
    const p = game.player;
    const stage = game.stage;

    const left = keysDown.has('arrowleft');
    const right = keysDown.has('arrowright');
    const runHeld = false;
    const jumpTap = keysPressed.has('arrowup');
    const fireMain = keysDown.has(' ');
    const grappleTap = keysPressed.has('g');
    const upHeld = keysDown.has('arrowup');
    const downHeld = keysDown.has('arrowdown');
    p.runBoost = runHeld ? 1 : 0;

    if (jumpTap) p.jumpBuffer = 8;
    p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);
    p.coyote = Math.max(0, p.coyote - 1);
    p.duck = stage.kind !== 'shooter' && stage.kind !== 'vehicle' && p.onGround && downHeld;

    const accel = stage.kind === 'blaster'
      ? 0.74
      : stage.kind === 'sword'
        ? 0.5
        : 0.45;
    if (left) {
      p.vx -= accel;
      if (!stage.lockForwardFacing) p.facing = -1;
    }
    if (right) {
      p.vx += accel;
      p.facing = 1;
    }
    if (stage.lockForwardFacing) {
      p.facing = 1;
    }

    const maxRun = stage.kind === 'blaster'
      ? 7.6
      : stage.kind === 'sword'
        ? 5.2
        : 4.5;
    p.vx = clamp(p.vx, -maxRun, maxRun);
    p.vx *= p.onGround ? (p.duck ? 0.55 : 0.8) : 0.92;
    if (p.duck && !left && !right) {
      p.vx *= 0.6;
    }

    if (!p.duck && p.jumpBuffer > 0 && p.coyote > 0) {
      const jumpBase = stage.kind === 'sword' ? -12.8 : stage.kind === 'blaster' ? -12.7 : -11.4;
      const runBonus = runHeld ? (stage.kind === 'sword' ? -1.8 : -1.4) : 0;
      p.vy = jumpBase + runBonus;
      p.jumpBuffer = 0;
      p.coyote = 0;
      p.onGround = false;
      beep(340, 0.05, 'square', 0.05, -90);
    }

    const prevBottom = p.y + p.h * 0.5;
    const prevTop = p.y - p.h * 0.5;

    if (stage.kind === 'bionic' && grappleTap && p.hookCd <= 0) {
      const forwardHeld = (p.facing > 0 && right) || (p.facing < 0 && left);
      const backwardHeld = (p.facing > 0 && left) || (p.facing < 0 && right);
      const grappleDir = backwardHeld && !forwardHeld ? -p.facing : p.facing;
      let anchor = findGrappleAnchor(p.wx, p.y, 320, grappleDir || 1);
      if (!anchor) {
        anchor = findGrappleAnchor(p.wx, p.y, 430, grappleDir || 1);
      }
      if (anchor) {
        p.grappleTarget = { x: anchor.x, y: anchor.y, life: 24, dir: grappleDir || 1 };
        p.hookLine = 18;
        p.hookCd = 24;
        p.vy = Math.min(p.vy, -3.2);
        beep(460, 0.05, 'triangle', 0.045, 80);
      } else {
        p.hookCd = 8;
      }
    }

    if (stage.kind === 'bionic' && p.grappleTarget) {
      const target = p.grappleTarget;
      const dx = target.x - p.wx;
      const dy = target.y - p.y;
      p.vx += dx * 0.016;
      p.vy += dy * 0.021 - 0.18;
      target.life -= 1;
      if (Math.hypot(dx, dy) < 22 || target.life <= 0) {
        p.grappleTarget = null;
      }
    }

    p.vy += stage.kind === 'sword' ? 0.52 : stage.kind === 'bionic' ? 0.47 : 0.5;
    p.wx += p.vx;
    p.wx = clamp(p.wx, 30, stage.length - 20);
    p.y += p.vy;

    const nowBottom = p.y + p.h * 0.5;
    const nowTop = p.y - p.h * 0.5;
    let landingY = Infinity;

    if (!pitAt(p.wx)) {
      const floorY = groundYAt(p.wx);
      if (prevBottom <= floorY + 8 && nowBottom >= floorY && p.vy >= 0) {
        landingY = Math.min(landingY, floorY - p.h * 0.5);
      }
    }

    const platformY = platformTopAt(p.wx, prevBottom, nowBottom);
    if (platformY < Infinity && p.vy >= 0) {
      landingY = Math.min(landingY, platformY - p.h * 0.5);
    }
    const marioSolidY = marioTopAt(p.wx, prevBottom, nowBottom);
    if (marioSolidY < Infinity && p.vy >= 0) {
      landingY = Math.min(landingY, marioSolidY - p.h * 0.5);
    }

    p.onGround = false;
    if (landingY < Infinity) {
      p.y = landingY;
      p.vy = 0;
      p.onGround = true;
      p.coyote = 8;
    }

    if (tryBumpMarioBlock(p, prevTop, nowTop)) {
      p.jumpBuffer = 0;
    }

    if (p.y > H + 120) {
      rescueOnFootFromPit();
      return;
    }

    const focus = stage.kind === 'sword' ? W * 0.42 : stage.kind === 'blaster' ? W * 0.33 : W * 0.38;
    game.cameraX = clamp(p.wx - focus, 0, stage.length - W);

    if (stage.kind === 'blaster') {
      const fireUp = fireMain && upHeld;

      if (fireMain && p.fireCd <= 0) {
        shootPlayer('forward');
        p.fireCd = p.weapon === 'spread' ? 11
          : p.weapon === 'burst' ? 16
            : p.weapon === 'laser' ? 7
              : p.weapon === 'plasma' ? 9
              : p.weapon === 'nuke' ? 23
                : 9;
      }
      if (fireUp && p.upFireCd <= 0) {
        shootPlayer('up');
        p.upFireCd = p.weapon === 'spread' ? 14
          : p.weapon === 'burst' ? 18
            : p.weapon === 'laser' ? 8
              : p.weapon === 'plasma' ? 11
              : 11;
      }
    } else if (stage.kind === 'bionic') {
      if (fireMain && p.fireCd <= 0) {
        shootPlayer('forward');
        p.fireCd = p.weapon === 'spread' ? 12
          : p.weapon === 'burst' ? 16
            : p.weapon === 'laser' ? 7
              : p.weapon === 'plasma' ? 9
              : p.weapon === 'nuke' ? 24
                : 9;
      }
    } else {
      const slashTap = keysDown.has(' ');
      if (slashTap) swordSlash();
    }

    if (p.wx >= stage.length - 64) {
      processStageClear();
    }
  }

  function updateEnemies() {
    const p = game.player;
    const stage = game.stage;

    for (const e of game.enemies) {
      if (e.dead) continue;

      if (e.kind === 'drone') {
        e.x += e.vx;
        e.y += e.vy + Math.sin((game.frame + e.id) * 0.11) * 0.65;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 380) {
          fireEnemyAtPlayer(e, 3.05, randRange(-0.28, 0.28));
          e.shootCd = randInt(70, 130);
        }
      } else if (e.kind === 'orbiter') {
        e.phase += 0.23;
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 2.6;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 420) {
          addEnemyBullet(e.x - 2, e.y + 8, -0.2, 3.9, 7, 10, 104);
          fireEnemyAtPlayer(e, 3.15, randRange(-0.2, 0.2));
          e.shootCd = randInt(34, 72);
        }
      } else if (e.kind === 'rtype_pod') {
        e.phase += 0.18;
        e.x += e.vx;
        e.y += Math.sin(e.phase) * 2.9 + e.vy;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 400) {
          fireEnemyAtPlayer(e, 3.5, randRange(-0.16, 0.16));
          fireEnemyAtPlayer(e, 3.2, randRange(-0.32, 0.32));
          e.shootCd = randInt(42, 80);
        }
      } else if (e.kind === 'gradius_core') {
        e.x += e.vx;
        e.y += e.vy;
        if (e.y < 88 || e.y > H - 166) e.vy *= -1;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 430) {
          fireEnemyAtPlayer(e, 3.6, randRange(-0.18, 0.18));
          fireEnemyAtPlayer(e, 3.15, randRange(-0.36, 0.36));
          e.shootCd = randInt(32, 62);
        }
      } else if (e.kind === 'moai_turret') {
        e.x += e.vx;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 360) {
          fireEnemyAtPlayer(e, 2.85, randRange(-0.08, 0.08));
          addEnemyBullet(e.x - 8, e.y + 4, -2.4, 1.2, 9, 7, 110);
          e.shootCd = randInt(44, 86);
        }
      } else if (e.kind === 'ace_fighter') {
        e.phase += 0.19;
        if (e.dashCd == null) e.dashCd = randInt(28, 62);
        const targetY = p.y + Math.sin((game.frame + e.id) * 0.08) * 42;
        e.vy += clamp((targetY - e.y) * 0.006, -0.18, 0.18);
        e.dashCd -= 1;
        if (e.dashCd <= 0 && Math.abs(e.x - p.wx) < 320) {
          e.vx -= 1.05;
          e.dashCd = randInt(28, 62);
        }
        e.x += e.vx;
        e.y += Math.sin(e.phase) * 3.4 + e.vy;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 470) {
          fireEnemyAtPlayer(e, 3.8, randRange(-0.12, 0.12));
          addEnemyBullet(e.x - 12, e.y + 8, -4.0, 1.2, 8, 6, 120);
          addEnemyBullet(e.x - 12, e.y - 8, -4.0, -1.2, 8, 6, 120);
          e.shootCd = randInt(28, 58);
        }
      } else if (e.kind === 'hunter_drone') {
        e.phase += 0.24;
        if (e.dashCd == null) e.dashCd = randInt(34, 74);
        const diveTarget = p.y + Math.sin((game.frame + e.id) * 0.1) * 56;
        e.vy += clamp((diveTarget - e.y) * 0.0075, -0.24, 0.24);
        e.dashCd -= 1;
        if (e.dashCd <= 0 && Math.abs(e.x - p.wx) < 360) {
          e.vx -= 1.2;
          e.vy += randRange(-0.6, 0.6);
          e.dashCd = randInt(30, 64);
        }
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 2.8;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 460) {
          fireEnemyAtPlayer(e, 4.0, randRange(-0.16, 0.16));
          addEnemyBullet(e.x - 10, e.y + 7, -3.7, 1.4, 8, 6, 120);
          addEnemyBullet(e.x - 10, e.y - 7, -3.7, -1.4, 8, 6, 120);
          e.shootCd = randInt(26, 54);
        }
      } else if (e.kind === 'jelly_mine') {
        e.phase += 0.12;
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 1.4;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 420) {
          addEnemyBullet(e.x - 6, e.y, -2.8, 0, 8, 6, 116);
          addEnemyBullet(e.x - 4, e.y, -2.4, 1.7, 8, 6, 116);
          addEnemyBullet(e.x - 4, e.y, -2.4, -1.7, 8, 6, 116);
          e.shootCd = randInt(42, 90);
        }
      } else if (e.kind === 'torpedo_eel') {
        e.phase += 0.18;
        if (e.dashCd == null) e.dashCd = randInt(30, 68);
        const targetY = p.y + Math.sin((game.frame + e.id) * 0.07) * 32;
        e.vy += clamp((targetY - e.y) * 0.009, -0.25, 0.25);
        e.dashCd -= 1;
        if (e.dashCd <= 0 && Math.abs(e.x - p.wx) < 330) {
          e.vx -= 1.0;
          e.dashCd = randInt(26, 58);
        }
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 1.5;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 440) {
          fireEnemyAtPlayer(e, 3.8, randRange(-0.1, 0.1));
          e.shootCd = randInt(36, 70);
        }
      } else if (e.kind === 'squid_striker') {
        e.phase += 0.22;
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 2.3;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 440) {
          fireEnemyAtPlayer(e, 3.7, randRange(-0.12, 0.12));
          addEnemyBullet(e.x - 10, e.y + 10, -3.1, 1.4, 8, 6, 108);
          addEnemyBullet(e.x - 10, e.y - 10, -3.1, -1.4, 8, 6, 108);
          e.shootCd = randInt(30, 64);
        }
      } else if (e.kind === 'submarine') {
        e.phase += 0.1;
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 0.9;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 480) {
          addEnemyBullet(e.x - 12, e.y, -3.5, 0, 10, 7, 124);
          fireEnemyAtPlayer(e, 3.4, randRange(-0.08, 0.08));
          e.shootCd = randInt(26, 56);
        }
      } else if (e.kind === 'blade_spinner') {
        e.phase += 0.34;
        if (e.dashCd == null) e.dashCd = randInt(30, 68);
        const holdY = p.y + Math.sin((game.frame + e.id) * 0.09) * 36;
        e.vy += clamp((holdY - e.y) * 0.0082, -0.24, 0.24);
        e.dashCd -= 1;
        if (e.dashCd <= 0 && Math.abs(e.x - p.wx) < 360) {
          e.vx -= 1.35;
          e.vy += randRange(-0.45, 0.45);
          e.dashCd = randInt(28, 62);
        }
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 1.9;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 470) {
          fireEnemyAtPlayer(e, 4.1, randRange(-0.14, 0.14));
          addEnemyBullet(e.x - 10, e.y, -3.6, 0, 8, 6, 116);
          addEnemyBullet(e.x - 8, e.y, -3.2, 1.6, 8, 6, 116);
          addEnemyBullet(e.x - 8, e.y, -3.2, -1.6, 8, 6, 116);
          e.shootCd = randInt(24, 50);
        }
      } else if (e.kind === 'commando_drone') {
        e.phase += 0.12;
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 1.6;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 360) {
          fireEnemyAtPlayer(e, 3.1, randRange(-0.22, 0.22));
          e.shootCd = randInt(52, 96);
        }
      } else if (e.kind === 'saucer') {
        e.phase += 0.2;
        e.x += e.vx;
        e.y += Math.sin(e.phase) * 1.9 + e.vy;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 420) {
          fireEnemyAtPlayer(e, 3.4, randRange(-0.14, 0.14));
          fireEnemyAtPlayer(e, 3.1, randRange(-0.32, 0.32));
          e.shootCd = randInt(52, 90);
        }
      } else if (e.kind === 'hopper') {
        e.x += e.vx;
        e.jumpCd -= 1;
        e.vy += 0.45;
        e.y += e.vy;

        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          if (e.y + e.h * 0.5 >= floorY && e.vy >= 0) {
            e.y = floorY - e.h * 0.5;
            e.vy = 0;
            e.onGround = true;
            if (e.jumpCd <= 0) {
              e.vy = -randRange(5.2, 7.1);
              e.jumpCd = randInt(34, 82);
            }
          }
        }
      } else if (e.kind === 'raider') {
        e.x += e.vx;
        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          e.y = floorY - e.h * 0.5;
        }
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 320) {
          addEnemyBullet(e.x - 10, e.y - 10, -4.0, -0.3, 11, 6, 120);
          e.shootCd = randInt(64, 116);
        }
      } else if (e.kind === 'walker') {
        const chase = Math.sign(p.wx - e.x) || -1;
        e.vx += chase * 0.03;
        e.vx = clamp(e.vx, -2.0, 2.0);
        e.x += e.vx;
        e.vy += 0.52;
        e.y += e.vy;

        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          if (e.y + e.h * 0.5 >= floorY && e.vy >= 0) {
            e.y = floorY - e.h * 0.5;
            e.vy = 0;
            e.onGround = true;
          }
        }

        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 360 && Math.abs(e.y - p.y) < 80) {
          fireEnemyAtPlayer(e, 3.0, 0);
          e.shootCd = randInt(86, 148);
        }
      } else if (e.kind === 'jumper') {
        const dir = Math.sign(p.wx - e.x) || -1;
        e.vx += dir * 0.05;
        e.vx = clamp(e.vx, -2.5, 2.5);
        e.x += e.vx;
        e.jumpCd -= 1;
        if (e.onGround && e.jumpCd <= 0) {
          e.vy = -randRange(7.2, 9.8);
          e.onGround = false;
          e.jumpCd = randInt(26, 72);
        }
        e.vy += 0.52;
        e.y += e.vy;
        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          if (e.y + e.h * 0.5 >= floorY && e.vy >= 0) {
            e.y = floorY - e.h * 0.5;
            e.vy = 0;
            e.onGround = true;
          }
        }
      } else if (e.kind === 'turret') {
        e.x += e.vx;
        e.y += Math.sin((game.frame + e.id) * 0.06) * 0.2;
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 410) {
          fireEnemyAtPlayer(e, 3.1, -0.18);
          fireEnemyAtPlayer(e, 3.1, 0.18);
          e.shootCd = randInt(72, 124);
        }
      } else if (e.kind === 'ninja') {
        const dir = Math.sign(p.wx - e.x) || -1;
        e.vx += dir * 0.09;
        e.vx = clamp(e.vx, -2.9, 2.9);
        e.x += e.vx;

        if (e.onGround && (Math.abs(p.wx - e.x) < 130 || pitAt(e.x + dir * 36))) {
          if (e.jumpCd <= 0) {
            e.vy = -8.1;
            e.onGround = false;
            e.jumpCd = randInt(46, 104);
          }
        }
        e.jumpCd -= 1;

        e.vy += 0.55;
        e.y += e.vy;

        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          if (e.y + e.h * 0.5 >= floorY && e.vy >= 0) {
            e.y = floorY - e.h * 0.5;
            e.vy = 0;
            e.onGround = true;
          }
        }
      } else if (e.kind === 'elite_ninja') {
        const dir = Math.sign(p.wx - e.x) || -1;
        e.vx += dir * 0.13;
        e.vx = clamp(e.vx, -3.8, 3.8);
        e.x += e.vx;
        e.jumpCd -= 1;
        if (e.onGround && e.jumpCd <= 0) {
          e.vy = -randRange(9.0, 11.4);
          e.onGround = false;
          e.jumpCd = randInt(22, 58);
        }
        e.vy += 0.58;
        e.y += e.vy;

        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          if (e.y + e.h * 0.5 >= floorY && e.vy >= 0) {
            e.y = floorY - e.h * 0.5;
            e.vy = 0;
            e.onGround = true;
          }
        }
        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 300) {
          fireEnemyAtPlayer(e, 3.6, randRange(-0.1, 0.1));
          e.shootCd = randInt(38, 88);
        }
      } else if (e.kind === 'bionic_ninja') {
        const dir = Math.sign(p.wx - e.x) || -1;
        if (e.dashCd == null) e.dashCd = randInt(30, 70);
        e.hookCd -= 1;
        e.jumpCd -= 1;
        e.dashCd -= 1;

        if ((!e.hookAnchor || e.hookLife <= 0) && e.hookCd <= 0) {
          const anchor = findEnemyAnchor(e.x, e.y, 320);
          if (anchor) {
            e.hookAnchor = anchor;
            e.hookLife = randInt(20, 38);
            e.onGround = false;
            e.vy = Math.min(e.vy, -4.8);
            e.hookCd = randInt(54, 110);
            e.dashCd = randInt(26, 58);
          } else {
            e.hookCd = randInt(22, 50);
          }
        }

        if (e.hookAnchor && e.hookLife > 0) {
          const dx = e.hookAnchor.x - e.x;
          const dy = e.hookAnchor.y - e.y;
          e.vx += dx * 0.02 + Math.sin((game.frame + e.id) * 0.18) * 0.18;
          e.vy += dy * 0.028 - 0.24;
          e.hookLife -= 1;
          if (e.hookLife <= 0) {
            e.hookAnchor = null;
            e.vx += dir * 2.3;
            e.vy -= 1.9;
          }
        } else {
          e.vx += dir * 0.11;
          if (Math.abs(p.wx - e.x) < 220 && e.dashCd <= 0) {
            e.vx += dir * 2.6;
            e.vy = Math.min(e.vy, -4.2);
            e.dashCd = randInt(30, 70);
          }
          if (e.onGround && e.jumpCd <= 0) {
            e.vy = -randRange(8.8, 11.2);
            e.onGround = false;
            e.jumpCd = randInt(22, 56);
          }
          e.vy += 0.56;
        }

        e.vx = clamp(e.vx, -4.3, 4.3);
        e.x += e.vx;
        e.y += e.vy;

        if (!pitAt(e.x)) {
          const floorY = groundYAt(e.x);
          if (e.y + e.h * 0.5 >= floorY && e.vy >= 0) {
            e.y = floorY - e.h * 0.5;
            e.vy = 0;
            e.onGround = true;
          }
        }

        e.shootCd -= 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.wx) < 340) {
          fireEnemyAtPlayer(e, 3.8, randRange(-0.08, 0.08));
          e.shootCd = randInt(34, 72);
        }
      } else if (e.kind === 'bat') {
        e.phase += 0.2;
        e.x += e.vx;
        e.y += e.vy + Math.sin(e.phase) * 1.3;
      }

      if (e.y > H + 150) e.hp = 0;
      if (e.x < game.cameraX - 200 || e.x > game.cameraX + W + 260) e.hp = 0;

      const hitEnemy = rectHit(playerRect(), enemyRect(e));
      if (hitEnemy) {
        const pBottom = game.player.y + game.player.h * 0.5;
        const stompHit = stage.kind !== 'vehicle'
          && stage.kind !== 'shooter'
          && game.player.vy > 1.2
          && pBottom <= e.y - e.h * 0.16;
        if (stompHit) {
          e.hp -= stage.kind === 'sword' ? 2 : 1;
          game.player.vy = stage.kind === 'sword' ? -9.6 : -8.4;
          game.player.onGround = false;
          game.score += stage.kind === 'sword' ? 120 : 80;
          burst(e.x, e.y - 8, '#ffe7a8', 8, 0.8);
          beep(440, 0.04, 'square', 0.04, -120);
          continue;
        }
        if (game.stage.kind === 'sword' && game.player.swordFx > 0) {
          e.hp -= 2;
        } else {
          damagePlayer(1);
          e.hp -= 1;
        }
      }
    }
  }

  function updateProjectiles() {
    const p = game.player;

    for (const b of game.bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;

      if (b.nuke) {
        b.w = Math.min(56, b.w + 0.18);
        b.h = Math.min(56, b.h + 0.18);
      }

      if (b.wave) {
        b.phase += 0.24;
        b.y += Math.sin(b.phase) * 1.6;
      }

      if (b.life <= 0) continue;

      if (!pitAt(b.x) && b.y + b.h * 0.5 >= groundYAt(b.x)) {
        if (b.nuke) {
          explodeNuke(b.x, b.y, b.damage);
        }
        b.life = 0;
        continue;
      }

      for (const e of game.enemies) {
        if (e.dead || e.hp <= 0) continue;
        if (rectHit({ x: b.x, y: b.y, w: b.w, h: b.h }, enemyRect(e))) {
          e.hp -= b.damage;
          burst(b.x, b.y, '#ffd07d', 6, 0.8);

          if (b.nuke) {
            explodeNuke(b.x, b.y, b.damage + 1);
            b.life = 0;
          } else if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.life = 0;
          }
          break;
        }
      }
    }

    for (const b of game.enemyBullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;

      if (b.life <= 0) continue;

      if (!pitAt(b.x) && b.y + b.h * 0.5 >= groundYAt(b.x)) {
        b.life = 0;
        continue;
      }

      if (rectHit({ x: b.x, y: b.y, w: b.w, h: b.h }, playerRect())) {
        b.life = 0;
        damagePlayer(1);
      }
    }

    game.bullets = game.bullets.filter((b) => b.life > 0 && b.x > game.cameraX - 200 && b.x < game.cameraX + W + 200 && b.y > -120 && b.y < H + 180);
    game.enemyBullets = game.enemyBullets.filter((b) => b.life > 0 && b.x > game.cameraX - 220 && b.x < game.cameraX + W + 220 && b.y > -140 && b.y < H + 180);
  }

  function updateSlashes() {
    for (const s of game.slashes) {
      s.life -= 1;
      s.x += s.facing * (0.9 + (s.combo || 1) * 0.18);
      s.y += Math.sin((game.frame + s.x) * 0.14) * 0.2;
      for (const e of game.enemies) {
        if (e.dead || e.hp <= 0) continue;
        if (s.hitIds.has(e.id)) continue;
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        if (d <= s.r + Math.max(e.w, e.h) * 0.35) {
          e.hp -= s.damage;
          s.hitIds.add(e.id);
          burst(e.x, e.y, '#9fd4ff', 6, 0.85);
        }
      }
    }
    game.slashes = game.slashes.filter((s) => s.life > 0);
  }

  function handleEnemyDeaths() {
    for (const e of game.enemies) {
      if (e.hp > 0 || e.dead) continue;
      e.dead = true;
      const pts = e.kind === 'moai_turret' ? 380
        : e.kind === 'ace_fighter' ? 340
        : e.kind === 'hunter_drone' ? 360
        : e.kind === 'blade_spinner' ? 420
        : e.kind === 'submarine' ? 400
        : e.kind === 'squid_striker' ? 340
        : e.kind === 'torpedo_eel' ? 300
        : e.kind === 'jelly_mine' ? 280
        : e.kind === 'gradius_core' ? 320
          : e.kind === 'rtype_pod' ? 280
            : e.kind === 'orbiter' ? 300
              : e.kind === 'bionic_ninja' ? 420
            : e.kind === 'commando_drone' ? 260
              : e.kind === 'turret' ? 260
        : e.kind === 'elite_ninja' ? 360
          : e.kind === 'saucer' || e.kind === 'raider' ? 280
            : e.kind === 'ninja' ? 220
              : 180;
      game.score += pts;
      burst(e.x, e.y, (e.kind === 'ninja' || e.kind === 'elite_ninja' || e.kind === 'bionic_ninja') ? '#9fd4ff' : '#ff9c6d', 14, 1.15);
      beep(210, 0.08, 'sawtooth', 0.045, -90);
      const dropChance = game.stage.kind === 'vehicle'
        ? 0.3
        : game.stage.kind === 'shooter'
          ? 0.46
          : game.stage.kind === 'bionic'
            ? 0.2
            : 0.13;
      if (rand() < dropChance) {
        if (game.stage.kind === 'shooter') {
          const shooterCore = ['spread', 'burst', 'laser', 'wave', 'shield', 'med', 'btc', 'giant', 'plasma', 'plasma'];
          const eliteShooter = ['laser', 'burst', 'wave', 'giant', 'shield', 'nuke', 'plasma', 'plasma', 'plasma'];
          const pool = (e.kind === 'ace_fighter' || e.kind === 'hunter_drone' || e.kind === 'blade_spinner' || e.kind === 'submarine' || e.kind === 'squid_striker' || e.kind === 'gradius_core' || e.kind === 'moai_turret')
            ? eliteShooter
            : shooterCore;
          spawnPickup(e.x, e.y - 14, pick(pool));
        } else if (game.stage.kind === 'bionic') {
          spawnPickup(e.x, e.y - 14, pick(['burst', 'laser', 'shield', 'med', 'btc', 'spread']));
        } else if (game.stage.kind === 'vehicle') {
          spawnPickup(e.x, e.y - 14, pick(['btc', 'spread', 'burst', 'wave', 'laser', 'shield', 'med', 'plasma']));
        } else {
          spawnPickup(e.x, e.y - 14);
        }
      }
    }

    game.enemies = game.enemies.filter((e) => !e.dead && e.hp > 0);
  }

  function updatePickups() {
    const pRect = playerRect();
    for (const pck of game.pickups) {
      pck.life -= 1;
      pck.float += 0.08;
      pck.y += Math.sin(pck.float) * 0.28;
      if (rectHit({ x: pck.x, y: pck.y, w: pck.w, h: pck.h }, pRect)) {
        handlePickup(pck.type);
        pck.life = 0;
        burst(pck.x, pck.y, '#ffd07d', 8, 0.9);
      }
    }
    game.pickups = game.pickups.filter((pck) => pck.life > 0 && pck.x > game.cameraX - 130 && pck.x < game.cameraX + W + 130);
  }

  function updateParticles() {
    for (const p of game.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life -= 1;
    }
    game.particles = game.particles.filter((p) => p.life > 0);
  }

  function updatePlaying() {
    if (game.paused) return;

    game.stageTime += 1;

    const p = game.player;
    p.fireCd = Math.max(0, p.fireCd - 1);
    p.upFireCd = Math.max(0, p.upFireCd - 1);
    p.hookCd = Math.max(0, p.hookCd - 1);
    p.hookLine = Math.max(0, p.hookLine - 1);
    p.swordCd = Math.max(0, p.swordCd - 1);
    p.swordFx = Math.max(0, p.swordFx - 1);
    p.swordComboTimer = Math.max(0, p.swordComboTimer - 1);
    if (p.swordComboTimer <= 0) p.swordCombo = 0;
    p.fireFx = Math.max(0, p.fireFx - 1);
    p.fireFxUp = Math.max(0, p.fireFxUp - 1);
    p.inv = Math.max(0, p.inv - 1);
    p.shield = Math.max(0, p.shield - 1);
    if (p.weaponTimer > 0) {
      p.weaponTimer -= 1;
      if (p.weaponTimer <= 0 && game.stage.kind !== 'sword') {
        p.weapon = 'basic';
      }
    }

    if (game.stage.kind === 'vehicle') {
      updateVehiclePlayer();
    } else if (game.stage.kind === 'shooter') {
      updateShooterPlayer();
    } else {
      updateOnFootPlayer();
    }

    if (game.state !== 'playing') return;

    maybeCheckpoint();

    const enemyCap = game.stage.kind === 'shooter'
      ? 21
      : game.stage.kind === 'sword'
        ? 16
        : game.stage.kind === 'vehicle'
          ? 18
          : game.stage.kind === 'bionic'
            ? 16
            : game.stage.kind === 'blaster'
              ? 18
              : 13;
    game.spawnEnemyTimer -= 1;
    if (game.spawnEnemyTimer <= 0 && game.enemies.length < enemyCap) {
      spawnEnemy();
      game.spawnEnemyTimer = randInt(game.stage.enemyInterval[0], game.stage.enemyInterval[1]);
    }

    game.spawnPickupTimer -= 1;
    if (game.spawnPickupTimer <= 0) {
      const nearX = game.cameraX + W + randInt(40, 180);
      spawnPickup(nearX);
      if (game.stage.kind === 'vehicle' && rand() < 0.84) {
        spawnPickup(nearX + randInt(20, 64), randRange(116, 214), rand() < 0.34 ? 'btc' : pick(['spread', 'burst', 'wave', 'laser', 'med', 'shield', 'plasma']));
      }
      if (game.stage.kind === 'shooter' && rand() < 0.9) {
        const shooterPool = ['spread', 'burst', 'laser', 'wave', 'giant', 'shield', 'med', 'btc', 'nuke', 'plasma', 'plasma', 'plasma'];
        spawnPickup(nearX + randInt(24, 92), randRange(96, H - 206), pick(shooterPool));
      }
      if (game.stage.kind !== 'vehicle' && game.stage.kind !== 'shooter' && rand() < 0.3) {
        spawnPickup(nearX + randInt(20, 70), randRange(132, 230), 'btc');
      }
      game.spawnPickupTimer = randInt(game.stage.pickupInterval[0], game.stage.pickupInterval[1]);
    }

    updateEnemies();
    updateProjectiles();
    updateSlashes();
    handleEnemyDeaths();
    updatePickups();
    updateParticles();

    for (const b of game.marioBlocks) {
      b.bump = (b.bump || 0) * 0.72;
      if (Math.abs(b.bump) < 0.08) b.bump = 0;
    }
  }

  function updateBriefing() {
    game.messageTimer -= 1;
    if (game.messageTimer <= 0 || keysPressed.has(' ') || keysPressed.has('enter')) {
      game.state = 'playing';
      game.messageTimer = 0;
      beep(340, 0.1, 'triangle', 0.06, 140);
    }
  }

  function updateStageClear() {
    game.messageTimer -= 1;
    if (game.messageTimer <= 0 || keysPressed.has(' ') || keysPressed.has('enter')) {
      nextStageOrWin();
    }
  }

  function updateTitle() {
    game.expertTicker = (game.expertTicker + 1) % 600000;
  }

  function updateStartup() {
    game.expertTicker = (game.expertTicker + 1) % 600000;
  }

  function updateWinOrGameOver() {
    if (keysPressed.has('enter')) {
      game.state = 'title';
      game.messageTimer = 0;
      game.expertTicker = 0;
    }
  }

  function stepFrame() {
    game.frame += 1;

    if (game.state === 'startup') {
      updateStartup();
    } else if (game.state === 'title') {
      updateTitle();
    } else if (game.state === 'briefing') {
      updateBriefing();
    } else if (game.state === 'playing') {
      updatePlaying();
    } else if (game.state === 'stage_clear') {
      updateStageClear();
    } else if (game.state === 'win' || game.state === 'gameover') {
      updateWinOrGameOver();
    }

    syncMusicPlayback(false);
    keysPressed.clear();
  }

  function drawBitcoinSymbol(x, y, s = 1.5, fill = '#ffe9b4', outline = '#7d4e08') {
    const r = (dx, dy, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + dx * s, y + dy * s, w * s, h * s);
    };
    r(0, 0, 6, 1, outline);
    r(0, 1, 1, 7, outline);
    r(5, 1, 1, 7, outline);
    r(0, 8, 6, 1, outline);
    r(1, 1, 4, 1, fill);
    r(1, 4, 4, 1, fill);
    r(1, 7, 4, 1, fill);
    r(1, 2, 1, 2, fill);
    r(1, 5, 1, 2, fill);
    r(4, 2, 1, 2, fill);
    r(4, 5, 1, 2, fill);
    r(2.4, -1.2, 1, 11, fill);
  }

  function drawBackground(stage) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (stage.theme === 'moon') {
      sky.addColorStop(0, '#3f5ea7');
      sky.addColorStop(0.52, '#5877be');
      sky.addColorStop(1, '#1f2d54');
    } else if (stage.theme === 'space_r') {
      sky.addColorStop(0, '#1a1633');
      sky.addColorStop(0.52, '#120e24');
      sky.addColorStop(1, '#0a0916');
    } else if (stage.theme === 'space_g') {
      sky.addColorStop(0, '#132a3b');
      sky.addColorStop(0.5, '#102336');
      sky.addColorStop(1, '#081824');
    } else if (stage.theme === 'underwater') {
      sky.addColorStop(0, '#0d3f66');
      sky.addColorStop(0.48, '#0a2f56');
      sky.addColorStop(1, '#081f3b');
    } else if (stage.theme === 'metro') {
      sky.addColorStop(0, '#ffba7a');
      sky.addColorStop(0.45, '#f0736b');
      sky.addColorStop(1, '#3b2d5d');
    } else {
      sky.addColorStop(0, '#50456f');
      sky.addColorStop(0.5, '#2d2f56');
      sky.addColorStop(1, '#191b2f');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    if (stage.theme === 'moon') {
      const sector = vehicleSectorAt(game.cameraX + W * 0.5);
      const tint = ['rgba(90,120,210,0.08)', 'rgba(76,148,215,0.1)', 'rgba(185,120,88,0.09)', 'rgba(120,196,165,0.1)'][sector];
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H * 0.66);
      for (const s of decor.stars) {
        const sx = ((s.x - game.cameraX * 0.2) % (W + 50) + (W + 50)) % (W + 50);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(sx, s.y, s.s, s.s);
      }

      for (let i = -1; i < 8; i++) {
        const x = W - ((game.cameraX * 0.36 + i * 210) % (W + 220)) - 180;
        ctx.fillStyle = 'rgba(40,56,96,0.55)';
        ctx.beginPath();
        ctx.moveTo(x, H - 152);
        ctx.lineTo(x + 78, H - 214);
        ctx.lineTo(x + 158, H - 160);
        ctx.lineTo(x + 248, H - 205);
        ctx.lineTo(x + 338, H - 152);
        ctx.closePath();
        ctx.fill();
      }
    } else if (stage.theme === 'space_r' || stage.theme === 'space_g') {
      const nebula = stage.theme === 'space_r' ? 'rgba(120,80,220,0.16)' : 'rgba(70,170,220,0.14)';
      ctx.fillStyle = nebula;
      ctx.beginPath();
      ctx.arc(W * 0.72, H * 0.28, 180, 0, Math.PI * 2);
      ctx.fill();
      for (const s of decor.stars) {
        const speed = stage.theme === 'space_r' ? 0.58 : 0.72;
        const sx = ((s.x - game.cameraX * speed) % (W + 50) + (W + 50)) % (W + 50);
        const sy = ((s.y + (s.x * 0.03)) % (H * 0.72));
        const twinkle = 0.65 + Math.sin((game.frame + s.x) * 0.03) * 0.25;
        ctx.fillStyle = `rgba(255,255,255,${clamp(twinkle, 0.25, 0.95)})`;
        ctx.fillRect(sx, sy, s.s, s.s);
      }

      for (let i = -1; i < 6; i++) {
        const beltX = W - ((game.cameraX * (stage.theme === 'space_r' ? 0.42 : 0.5) + i * 280) % (W + 320)) - 140;
        const beltY = stage.theme === 'space_r' ? H - 180 : H - 210;
        ctx.fillStyle = stage.theme === 'space_r' ? 'rgba(88,68,130,0.42)' : 'rgba(44,92,120,0.45)';
        ctx.beginPath();
        ctx.ellipse(beltX, beltY, 130, 36, 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (stage.theme === 'underwater') {
      const bloom = ctx.createRadialGradient(W * 0.7, H * 0.18, 20, W * 0.7, H * 0.18, 210);
      bloom.addColorStop(0, 'rgba(120,230,255,0.16)');
      bloom.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, W, H * 0.68);

      for (const s of decor.stars) {
        const sx = ((s.x - game.cameraX * 0.3) % (W + 70) + (W + 70)) % (W + 70) - 24;
        const sy = ((s.y * 1.25 + game.frame * 0.22 + s.x * 0.01) % (H - 90)) + 20;
        const r = 1.4 + (s.s % 2.2);
        ctx.strokeStyle = 'rgba(182,236,255,0.34)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = -1; i < 7; i++) {
        const ridgeX = W - ((game.cameraX * 0.45 + i * 260) % (W + 300)) - 150;
        ctx.fillStyle = 'rgba(28,89,115,0.5)';
        ctx.beginPath();
        ctx.ellipse(ridgeX, H - 98, 120, 42, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (stage.theme === 'metro') {
      // Mario-ish chunky city skyline with playful clouds.
      for (let i = -1; i < 8; i++) {
        const cx = W - ((game.cameraX * 0.28 + i * 190) % (W + 220)) - 80;
        const cy = 70 + (i % 3) * 22;
        ctx.fillStyle = 'rgba(255,241,225,0.8)';
        ctx.fillRect(cx, cy, 28, 12);
        ctx.fillRect(cx + 16, cy - 8, 24, 12);
        ctx.fillRect(cx + 34, cy, 20, 12);
      }
      for (const b of decor.skyline) {
        const x = ((b.x - game.cameraX * 0.44) % (W + 140) + (W + 140)) % (W + 140) - 60;
        const y = H - 112 - b.h;
        ctx.fillStyle = '#2a1f45';
        ctx.fillRect(x, y, b.w, b.h);
        ctx.fillStyle = 'rgba(255,216,139,0.6)';
        for (let wy = y + 12; wy < y + b.h - 10; wy += 16) {
          for (let wx = x + 8; wx < x + b.w - 8; wx += 12) {
            if (((wx + wy + b.h) / 11) % 2 < 1) ctx.fillRect(wx, wy, 4, 6);
          }
        }
      }
      for (let i = -1; i < 7; i++) {
        const hx = W - ((game.cameraX * 0.46 + i * 260) % (W + 280)) - 120;
        ctx.fillStyle = 'rgba(101,72,134,0.72)';
        ctx.beginPath();
        ctx.arc(hx, H - 82, 90, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(250,240,210,0.14)';
      ctx.beginPath();
      ctx.arc(W - 120, 98, 56, 0, Math.PI * 2);
      ctx.fill();

      for (let i = -1; i < 7; i++) {
        const x = W - ((game.cameraX * 0.34 + i * 220) % (W + 260)) - 190;
        ctx.fillStyle = '#1d203b';
        ctx.fillRect(x + 70, H - 280, 26, 150);
        ctx.fillRect(x + 52, H - 152, 62, 36);
        ctx.fillRect(x + 58, H - 196, 50, 44);
      }

      for (const l of decor.lanterns) {
        const x = ((l.x - game.cameraX * 0.58) % (W + 80) + (W + 80)) % (W + 80) - 30;
        const y = l.y + Math.sin(game.frame * 0.03 + l.sway) * 4;
        ctx.fillStyle = 'rgba(240,130,80,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb170';
        ctx.fillRect(x - 3, y - 8, 6, 10);
      }
      for (let i = -1; i < 6; i++) {
        const hillX = W - ((game.cameraX * 0.41 + i * 290) % (W + 320)) - 140;
        ctx.fillStyle = 'rgba(62,79,122,0.65)';
        ctx.beginPath();
        ctx.arc(hillX, H - 70, 110, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, H * 0.5, W, 40);
  }

  function drawTerrain(stage) {
    if (stage.kind === 'shooter') {
      if (stage.theme === 'underwater') {
        for (let i = 0; i < 26; i++) {
          const speed = (i % 2 === 0) ? 1.18 : 0.92;
          const x = W - ((game.cameraX * speed + i * 66) % (W + 90));
          const y = 70 + (i * 20) % (H - 170);
          ctx.fillStyle = i % 3 === 0 ? 'rgba(173,236,255,0.22)' : 'rgba(127,213,242,0.18)';
          ctx.fillRect(x, y, 12 + (i % 4) * 6, 2);
        }
        for (let i = 0; i < 20; i++) {
          const x = W - ((game.cameraX * 0.62 + i * 86) % (W + 120));
          const h = 28 + (i % 3) * 12;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(34,122,101,0.42)' : 'rgba(40,144,122,0.3)';
          ctx.fillRect(x, H - h - 18, 4, h);
        }

        const seabed = ctx.createLinearGradient(0, H - 112, 0, H);
        seabed.addColorStop(0, 'rgba(54,89,118,0.76)');
        seabed.addColorStop(1, 'rgba(24,47,71,0.9)');
        ctx.fillStyle = seabed;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 6) {
          const wx = game.cameraX + x;
          ctx.lineTo(x, groundYAt(wx, stage));
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        return;
      }

      for (let i = 0; i < 24; i++) {
        const speed = (i % 2 === 0) ? 1.7 : 1.25;
        const x = W - ((game.cameraX * speed + i * 52) % (W + 80));
        const y = 84 + (i * 18) % (H - 250);
        ctx.fillStyle = stage.theme === 'space_r' ? 'rgba(166,138,255,0.24)' : 'rgba(120,220,255,0.22)';
        ctx.fillRect(x, y, 14 + (i % 3) * 8, 2);
      }
      for (let i = 0; i < 16; i++) {
        const x = W - ((game.cameraX * 0.9 + i * 72) % (W + 120));
        const y = 120 + (i * 27) % (H - 230);
        ctx.fillStyle = stage.theme === 'space_r' ? 'rgba(255,177,120,0.18)' : 'rgba(255,240,150,0.18)';
        ctx.fillRect(x, y, 6, 1);
      }
      return;
    }

    for (let x = 0; x <= W; x += 4) {
      const wx = game.cameraX + x;
      const pit = pitAt(wx + 1);
      if (pit) continue;
      const y = groundYAt(wx, stage);

      if (stage.theme === 'moon') {
        const sector = vehicleSectorAt(wx);
        const topPalette = ['#7a8399', '#7b8ea6', '#7f8d93', '#7684a8'];
        const lowPalette = ['#5a6278', '#5b647e', '#545f74', '#52607b'];
        ctx.fillStyle = topPalette[sector];
        ctx.fillRect(x, y, 4, 16);
        ctx.fillStyle = lowPalette[sector];
        ctx.fillRect(x, y + 16, 4, H - y);
      } else if (stage.theme === 'metro') {
        ctx.fillStyle = '#61556f';
        ctx.fillRect(x, y, 4, 16);
        ctx.fillStyle = '#3f3549';
        ctx.fillRect(x, y + 16, 4, H - y);
      } else {
        ctx.fillStyle = '#51617a';
        ctx.fillRect(x, y, 4, 16);
        ctx.fillStyle = '#30364d';
        ctx.fillRect(x, y + 16, 4, H - y);
      }
    }

    for (const pit of game.pits) {
      const sx = pit.x - game.cameraX;
      if (sx > W + 80 || sx + pit.w < -80) continue;
      const yL = groundYAt(pit.x + 2, stage);
      const yR = groundYAt(pit.x + pit.w - 2, stage);
      const topY = Math.min(yL, yR);

      ctx.fillStyle = '#141218';
      ctx.fillRect(sx, topY + 3, pit.w, H - (topY + 3));
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(sx + 6, topY + 24, Math.max(6, pit.w - 12), H - (topY + 24));

      ctx.fillStyle = '#8d96ac';
      ctx.fillRect(sx - 4, yL - 2, 5, 24);
      ctx.fillRect(sx + pit.w - 1, yR - 2, 5, 24);

      if (stage.kind === 'vehicle') {
        const signX = sx - 26;
        if (signX > -30 && signX < W + 30) {
          ctx.fillStyle = '#ffda72';
          ctx.beginPath();
          ctx.moveTo(signX, yL - 46);
          ctx.lineTo(signX + 16, yL - 12);
          ctx.lineTo(signX - 16, yL - 12);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(signX - 1, yL - 12, 2, 16);
        }
      }
    }

    if (stage.kind === 'vehicle') {
      for (const bank of game.banks) {
        const left = bank.x - game.cameraX;
        const right = left + bank.w;
        if (right < -70 || left > W + 70) continue;

        const ridge = ctx.createLinearGradient(0, 0, 0, H);
        if (bank.kind === 'mesa') {
          ridge.addColorStop(0, 'rgba(210,180,120,0.78)');
          ridge.addColorStop(1, 'rgba(92,86,82,0.74)');
        } else if (bank.kind === 'spike') {
          ridge.addColorStop(0, 'rgba(168,176,206,0.8)');
          ridge.addColorStop(1, 'rgba(90,100,130,0.75)');
        } else {
          ridge.addColorStop(0, 'rgba(192,175,150,0.78)');
          ridge.addColorStop(1, 'rgba(104,103,114,0.74)');
        }
        ctx.fillStyle = ridge;
        ctx.beginPath();
        const sampleN = 14;
        for (let i = 0; i <= sampleN; i++) {
          const wx = bank.x + bank.w * (i / sampleN);
          const sx = wx - game.cameraX;
          const sy = groundYAt(wx, stage);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        for (let i = sampleN; i >= 0; i--) {
          const wx = bank.x + bank.w * (i / sampleN);
          const sx = wx - game.cameraX;
          const sy = vehicleBaseGroundYAt(wx) + 18;
          ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(242,229,191,0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= sampleN; i++) {
          const wx = bank.x + bank.w * (i / sampleN);
          const sx = wx - game.cameraX;
          const sy = groundYAt(wx, stage) + 1;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      for (let i = 0; i < 36; i++) {
        const x = (i * 34 - (game.cameraX * 1.8) % 34);
        const wx = game.cameraX + x;
        if (pitAt(wx + 17)) continue;
        const y = groundYAt(wx, stage) + 10;
        ctx.fillStyle = '#d9e4ff';
        ctx.fillRect(x + 6, y, 16, 2);
      }
      // Road sector billboards and towers for stronger “different spaces” identity.
      for (let i = -1; i < 8; i++) {
        const worldX = game.cameraX + i * 260 + 80;
        const sx = worldX - game.cameraX;
        if (sx < -40 || sx > W + 40) continue;
        if (pitAt(worldX)) continue;
        const sector = vehicleSectorAt(worldX);
        const gy = groundYAt(worldX, stage);
        if (sector === 1) {
          ctx.fillStyle = '#394c7c';
          ctx.fillRect(sx - 9, gy - 80, 18, 64);
          ctx.fillStyle = '#9ac2ff';
          ctx.fillRect(sx - 6, gy - 72, 12, 8);
        } else if (sector === 2) {
          ctx.fillStyle = '#5b3a4c';
          ctx.fillRect(sx - 14, gy - 54, 28, 34);
          ctx.fillStyle = '#ffd27a';
          ctx.fillRect(sx - 10, gy - 50, 20, 6);
        } else if (sector === 3) {
          ctx.fillStyle = '#36525f';
          ctx.fillRect(sx - 11, gy - 66, 22, 46);
          ctx.fillStyle = '#8df0db';
          ctx.fillRect(sx - 8, gy - 60, 16, 4);
        }
      }
    }
  }

  function drawPlatforms() {
    for (const pf of game.platforms) {
      const x = pf.x - game.cameraX;
      if (x > W + 70 || x + pf.w < -70) continue;
      ctx.fillStyle = '#1a253d';
      ctx.fillRect(x, pf.y, pf.w, pf.h);
      ctx.fillStyle = '#94a7cc';
      ctx.fillRect(x, pf.y, pf.w, 4);
      ctx.fillStyle = '#34486e';
      for (let i = 0; i < pf.w; i += 16) {
        ctx.fillRect(x + i + 2, pf.y + 6, 8, 3);
      }
    }

    for (const a of game.anchors) {
      const x = a.x - game.cameraX;
      if (x < -40 || x > W + 40) continue;
      ctx.strokeStyle = 'rgba(140,180,230,0.36)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, a.y);
      ctx.lineTo(x, a.y + 40);
      ctx.stroke();
      ctx.fillStyle = '#d5e6ff';
      ctx.beginPath();
      ctx.arc(x, a.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f99bc';
      ctx.fillRect(x - 2, a.y + 5, 4, 8);
    }
  }

  function drawMarioFeatures() {
    for (const p of game.pipes) {
      const x = p.x - game.cameraX;
      if (x > W + 80 || x + p.w < -80) continue;
      const gy = groundYAt(p.x + p.w * 0.5, game.stage);
      const top = gy - p.h;
      ctx.fillStyle = '#2b6c44';
      ctx.fillRect(x, top, p.w, p.h);
      ctx.fillStyle = '#3fa968';
      ctx.fillRect(x + 3, top + 4, p.w - 6, p.h - 6);
      ctx.fillStyle = '#56c47e';
      ctx.fillRect(x - 4, top - 8, p.w + 8, 10);
      ctx.fillStyle = '#1d4e31';
      ctx.fillRect(x + 2, top + p.h - 8, p.w - 4, 4);
    }

    for (const b of game.marioBlocks) {
      const x = b.x - game.cameraX;
      const y = b.y + (b.bump || 0);
      if (x > W + 80 || x + b.w < -80) continue;
      if (b.kind === 'qblock') {
        ctx.fillStyle = b.used ? '#7f6743' : '#e2ad4e';
        ctx.fillRect(x - b.w * 0.5, y, b.w, b.h);
        ctx.fillStyle = b.used ? '#9e8d74' : '#ffe07a';
        ctx.fillRect(x - b.w * 0.5 + 3, y + 3, b.w - 6, b.h - 6);
        if (!b.used) {
          ctx.fillStyle = '#fff5cc';
          ctx.font = `bold 12px ${UI_FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText('?', x, y + 15);
        }
      } else {
        ctx.fillStyle = '#8f4e38';
        ctx.fillRect(x - b.w * 0.5, y, b.w, b.h);
        ctx.fillStyle = '#bb7150';
        ctx.fillRect(x - b.w * 0.5 + 2, y + 2, b.w - 4, 5);
        ctx.fillStyle = '#d29a6b';
        ctx.fillRect(x - b.w * 0.5 + 4, y + 11, b.w - 8, 3);
      }
    }
  }

  function drawMadHead(offsetX, offsetY, scale = 1) {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#f5d4b2';
    ctx.fillRect(-10, -16, 20, 16);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(-12, -26, 24, 10); // hat brim
    ctx.fillRect(-8, -40, 16, 14);  // hat crown
    drawBitcoinSymbol(2, -37, 0.9, '#ffd37a', '#7d4f09');

    ctx.fillStyle = '#111';
    ctx.fillRect(-8, -13, 7, 6);
    ctx.fillRect(1, -13, 7, 6);
    ctx.fillStyle = '#b81818';
    ctx.fillRect(-7, -12, 5, 4);
    ctx.fillRect(2, -12, 5, 4);

    ctx.fillStyle = '#3c2212';
    ctx.fillRect(-1, -12, 2, 1);

    ctx.fillStyle = '#bb3a3a';
    ctx.fillRect(-3, -4, 6, 2);

    ctx.restore();
  }

  function drawMadSuitBody(offsetX, offsetY, mode = 'blaster', facing = 1, movePhase = 0, swordFx = 0, fireFxValue = 0, shieldStrength = 0, duck = false) {
    ctx.save();
    ctx.translate(offsetX, offsetY + (duck ? 12 : 0));

    if (facing < 0) ctx.scale(-1, 1);

    const legSwing = duck ? 0 : Math.sin(movePhase) * 2.4;

    if (duck) {
      ctx.fillStyle = '#0a101b';
      ctx.fillRect(-9, -16, 18, 13);
      ctx.fillStyle = '#e7eefc';
      ctx.fillRect(-3, -15, 6, 6);
      ctx.fillStyle = '#8532b9';
      ctx.fillRect(-9, -9, 18, 3);
      ctx.fillStyle = '#0f1522';
      ctx.fillRect(-10, -1, 8, 6);
      ctx.fillRect(2, -1, 8, 6);
      ctx.fillStyle = '#1d2636';
      ctx.fillRect(-12, 4, 22, 5);
      ctx.fillStyle = '#f5d4b2';
      ctx.fillRect(-13, -13, 4, 4);
      ctx.fillRect(9, -13, 4, 4);
    } else {
      ctx.fillStyle = '#0a101b';
      ctx.fillRect(-8, -26, 16, 24); // jacket
      ctx.fillStyle = '#e7eefc';
      ctx.fillRect(-3, -24, 6, 10); // shirt
      ctx.fillStyle = '#8532b9';
      ctx.fillRect(-8, -14, 16, 4); // purple sash
      ctx.fillStyle = '#0f1522';
      ctx.fillRect(-7, -10, 6, 12); // left leg
      ctx.fillRect(1, -10, 6, 12);  // right leg
      ctx.fillStyle = '#1d2636';
      ctx.fillRect(-7 + legSwing * 0.35, 0, 6, 10);
      ctx.fillRect(1 - legSwing * 0.35, 0, 6, 10);

      ctx.fillStyle = '#f5d4b2';
      ctx.fillRect(-12, -23, 4, 6);
      ctx.fillRect(8, -23, 4, 6);
    }

    if (mode === 'blaster') {
      ctx.fillStyle = '#7d91b6';
      ctx.fillRect(12, duck ? -15 : -22, 10, 3);
      if (fireFxValue > 0) {
        ctx.fillStyle = '#ffb45a';
        ctx.fillRect(22, duck ? -15 : -22, 4, 2);
      }
    }

    if (mode === 'sword') {
      const combo = game.player?.swordCombo || 0;
      const swingSpan = 12 + combo * 4;
      const swingNorm = swordFx > 0 ? clamp(1 - swordFx / swingSpan, 0, 1) : 0;
      const swingCurve = Math.sin(swingNorm * Math.PI);
      const arcDir = combo % 2 === 0 ? -1 : 1;
      const swingAngle = swordFx > 0 ? (-1.1 + swingNorm * 2.15) * arcDir : 0.08;
      const bladeLen = 14 + (swordFx > 0 ? 8 : 0) + combo * 3;
      const wristX = duck ? 10 : 12;
      const wristY = duck ? -15 : -21;

      ctx.fillStyle = '#8aa5cf';
      ctx.fillRect(wristX - 2, wristY - 1, 8, 2);
      ctx.fillStyle = '#6a7e9f';
      ctx.fillRect(wristX - 3, wristY - 3, 4, 5);

      ctx.save();
      ctx.translate(wristX + 4, wristY);
      ctx.rotate(swingAngle);
      ctx.fillStyle = '#d8ecff';
      ctx.fillRect(0, -1, bladeLen, 2);
      ctx.fillStyle = '#eef7ff';
      ctx.fillRect(0, -2, Math.max(6, bladeLen - 5), 1);
      ctx.fillStyle = '#8aa5cf';
      ctx.fillRect(-4, -2, 6, 4);
      if (swordFx > 0) {
        for (let i = 0; i < 3; i++) {
          const trailAlpha = 0.1 + combo * 0.04 - i * 0.03;
          if (trailAlpha <= 0) continue;
          ctx.strokeStyle = `rgba(170,220,255,${trailAlpha})`;
          ctx.lineWidth = 2 + i;
          ctx.beginPath();
          ctx.moveTo(-2 - i * 2, -2 - i);
          ctx.lineTo(bladeLen + 4 + i * 2, -6 - i * 2 - swingCurve * 4);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (shieldStrength > 0) {
      ctx.strokeStyle = 'rgba(90,225,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -15, 24, 34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlayer() {
    const p = game.player;
    if (!p) return;
    if (p.inv > 0 && ((p.inv / 4) | 0) % 2 === 0) return;

    if (game.stage.kind === 'vehicle') {
      const x = p.x;
      const y = p.y;
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = '#1a2236';
      ctx.fillRect(-30, -10, 60, 20);
      ctx.fillStyle = '#2f61b8';
      ctx.fillRect(-28, -9, 56, 16);
      ctx.fillStyle = '#7daeea';
      ctx.fillRect(-10, -16, 26, 8);
      ctx.fillStyle = '#d7ebff';
      ctx.fillRect(-6, -14, 18, 4);

      ctx.fillStyle = '#101522';
      ctx.fillRect(-36, -18, 12, 5); // rear gun body
      ctx.fillStyle = '#7f95bb';
      ctx.fillRect(-44, -17, 8, 3); // rear barrel

      ctx.fillStyle = '#7f95bb';
      ctx.fillRect(28, -12, 10, 4); // front barrel

      if (p.fireFx > 0) {
        ctx.fillStyle = '#ffb45a';
        ctx.fillRect(38, -11, 4, 2);
        ctx.fillRect(-47, -16, 3, 1);
      }
      if (p.fireFxUp > 0) {
        ctx.fillStyle = '#ffb45a';
        ctx.fillRect(4, -34, 3, 4);
      }

      const wheelBob = Math.sin(game.frame * 0.25) > 0 ? 0 : 1;
      const wheels = [-18, 0, 18];
      for (const wx of wheels) {
        ctx.fillStyle = '#0d1018';
        ctx.fillRect(wx - 5, 10 + wheelBob, 10, 10);
        ctx.fillStyle = '#5a80b5';
        ctx.fillRect(wx - 3, 12 + wheelBob, 6, 6);
      }

      drawMadHead(-2, -8, 0.82);

      ctx.fillStyle = '#0a101b';
      ctx.fillRect(-10, -8, 18, 9);
      ctx.fillStyle = '#8532b9';
      ctx.fillRect(-10, -2, 18, 3);

      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(90,225,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -4, 46, 30, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (game.stage.kind === 'shooter') {
      const x = p.x;
      const y = p.y;
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = game.stage.theme === 'space_r' ? '#4c3e8d' : '#2d6a92';
      ctx.fillRect(-20, -10, 40, 20);
      ctx.fillStyle = '#b8d4ff';
      ctx.fillRect(-4, -14, 14, 8);
      ctx.fillStyle = '#eff7ff';
      ctx.fillRect(-2, -12, 8, 4);
      ctx.fillStyle = '#21324a';
      ctx.fillRect(-24, -3, 8, 6);
      ctx.fillStyle = '#9db9e4';
      ctx.fillRect(20, -4, 12, 4);
      ctx.fillStyle = '#8540b9';
      ctx.fillRect(-8, -2, 8, 4);

      if (p.fireFx > 0) {
        ctx.fillStyle = '#ffb45a';
        ctx.fillRect(32, -3, 6, 2);
      }
      if (p.fireFxUp > 0) {
        ctx.fillStyle = '#ffb45a';
        ctx.fillRect(2, -24, 3, 8);
      }

      drawMadHead(-2, -3, 0.68);

      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(90,225,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    const sx = p.wx - game.cameraX;
    if (sx < -80 || sx > W + 80) return;

    if (p.grappleTarget && p.hookLine > 0) {
      ctx.strokeStyle = 'rgba(170,210,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 8, p.y - (p.duck ? 16 : 24));
      ctx.lineTo(p.grappleTarget.x - game.cameraX, p.grappleTarget.y);
      ctx.stroke();
    }

    const visualMode = game.stage.visualMode || (game.stage.kind === 'bionic' ? 'blaster' : game.stage.kind);
    drawMadSuitBody(sx, p.y, visualMode, p.facing, game.frame * 0.28 + p.wx * 0.02, p.swordFx, p.fireFx, p.shield, !!p.duck);
    drawMadHead(sx, p.y - (p.duck ? 11 : 27), p.duck ? 0.84 : 1);
  }

  function drawEnemies() {
    for (const e of game.enemies) {
      const x = e.x - game.cameraX;
      if (x < -100 || x > W + 100) continue;

      if (e.kind === 'bionic_ninja' && e.hookAnchor && e.hookLife > 0) {
        ctx.strokeStyle = 'rgba(165,206,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, e.y - 12);
        ctx.lineTo(e.hookAnchor.x - game.cameraX, e.hookAnchor.y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(x, e.y);

      if (e.kind === 'drone') {
        ctx.fillStyle = '#1a2338';
        ctx.fillRect(-16, -10, 32, 20);
        ctx.fillStyle = '#7da9e6';
        ctx.fillRect(-14, -8, 28, 12);
        ctx.fillStyle = '#3b4e72';
        ctx.fillRect(-20, -2, 40, 4);
        ctx.fillStyle = '#d42929';
        ctx.fillRect(-4, -3, 8, 6);
      } else if (e.kind === 'orbiter') {
        ctx.fillStyle = '#2a2f51';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = '#8ca6ea';
        ctx.fillRect(-13, -8, 26, 16);
        ctx.fillStyle = '#ffb06f';
        ctx.fillRect(-3, -4, 6, 8);
        ctx.fillStyle = '#171e32';
        ctx.fillRect(-18, -2, 36, 4);
      } else if (e.kind === 'rtype_pod') {
        ctx.fillStyle = '#2c2551';
        ctx.fillRect(-18, -10, 36, 20);
        ctx.fillStyle = '#a58ef4';
        ctx.fillRect(-14, -8, 28, 16);
        ctx.fillStyle = '#ffd38a';
        ctx.fillRect(10, -2, 10, 4);
        ctx.fillStyle = '#151129';
        ctx.fillRect(-8, -3, 8, 6);
      } else if (e.kind === 'gradius_core') {
        ctx.fillStyle = '#2a3a58';
        ctx.fillRect(-16, -16, 32, 32);
        ctx.fillStyle = '#6ab8d8';
        ctx.fillRect(-13, -13, 26, 26);
        ctx.fillStyle = '#e7f6ff';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = '#123046';
        ctx.fillRect(12, -2, 10, 4);
      } else if (e.kind === 'moai_turret') {
        ctx.fillStyle = '#4e566c';
        ctx.fillRect(-19, -22, 38, 44);
        ctx.fillStyle = '#9ba4be';
        ctx.fillRect(-16, -19, 32, 38);
        ctx.fillStyle = '#273047';
        ctx.fillRect(-8, -10, 6, 6);
        ctx.fillRect(2, -10, 6, 6);
        ctx.fillStyle = '#2f1f18';
        ctx.fillRect(-6, 2, 12, 4);
      } else if (e.kind === 'ace_fighter') {
        ctx.fillStyle = '#314f7a';
        ctx.fillRect(-17, -8, 34, 16);
        ctx.fillStyle = '#95d4ff';
        ctx.fillRect(-15, -6, 30, 12);
        ctx.fillStyle = '#eff7ff';
        ctx.fillRect(8, -2, 12, 4);
        ctx.fillStyle = '#1e2f4b';
        ctx.fillRect(-21, -2, 12, 4);
      } else if (e.kind === 'hunter_drone') {
        ctx.fillStyle = '#22385e';
        ctx.fillRect(-16, -10, 32, 20);
        ctx.fillStyle = '#75bff1';
        ctx.fillRect(-14, -8, 28, 16);
        ctx.fillStyle = '#f0f7ff';
        ctx.fillRect(-2, -4, 9, 8);
        ctx.fillStyle = '#1a2947';
        ctx.fillRect(-22, -2, 10, 4);
        ctx.fillRect(12, -2, 10, 4);
      } else if (e.kind === 'jelly_mine') {
        ctx.fillStyle = '#2e5d87';
        ctx.fillRect(-14, -13, 28, 26);
        ctx.fillStyle = '#8ad4f6';
        ctx.fillRect(-11, -10, 22, 18);
        ctx.fillStyle = '#e4fbff';
        ctx.fillRect(-3, -7, 6, 6);
        ctx.fillStyle = '#5ac0e2';
        ctx.fillRect(-10, 8, 3, 8);
        ctx.fillRect(-4, 9, 3, 7);
        ctx.fillRect(2, 8, 3, 8);
        ctx.fillRect(8, 9, 3, 7);
      } else if (e.kind === 'torpedo_eel') {
        ctx.fillStyle = '#1c4d70';
        ctx.fillRect(-20, -8, 40, 16);
        ctx.fillStyle = '#7dd3f7';
        ctx.fillRect(-16, -6, 30, 12);
        ctx.fillStyle = '#effbff';
        ctx.fillRect(8, -3, 8, 6);
        ctx.fillStyle = '#0f324a';
        ctx.fillRect(-24, -2, 8, 4);
      } else if (e.kind === 'squid_striker') {
        ctx.fillStyle = '#28456f';
        ctx.fillRect(-14, -16, 28, 32);
        ctx.fillStyle = '#9bc8f3';
        ctx.fillRect(-11, -13, 22, 22);
        ctx.fillStyle = '#f5fcff';
        ctx.fillRect(-6, -8, 4, 4);
        ctx.fillRect(2, -8, 4, 4);
        ctx.fillStyle = '#14324f';
        ctx.fillRect(-10, 10, 4, 8);
        ctx.fillRect(-2, 11, 4, 8);
        ctx.fillRect(6, 10, 4, 8);
      } else if (e.kind === 'submarine') {
        ctx.fillStyle = '#23496d';
        ctx.fillRect(-22, -9, 44, 18);
        ctx.fillStyle = '#84c0ec';
        ctx.fillRect(-18, -7, 34, 14);
        ctx.fillStyle = '#e7f7ff';
        ctx.fillRect(10, -3, 10, 6);
        ctx.fillStyle = '#17344f';
        ctx.fillRect(-26, -2, 10, 4);
        ctx.fillStyle = '#a8defc';
        ctx.fillRect(-2, -14, 10, 6);
      } else if (e.kind === 'blade_spinner') {
        const spin = Math.sin((game.frame + e.id) * 0.45);
        ctx.fillStyle = '#1f3157';
        ctx.fillRect(-14, -14, 28, 28);
        ctx.fillStyle = '#7db9ef';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#f7fbff';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = '#1a2745';
        ctx.fillRect(-20, -2 + spin * 3, 12, 4);
        ctx.fillRect(8, -2 - spin * 3, 12, 4);
      } else if (e.kind === 'commando_drone') {
        ctx.fillStyle = '#29344f';
        ctx.fillRect(-14, -8, 28, 16);
        ctx.fillStyle = '#8bc2f0';
        ctx.fillRect(-12, -6, 24, 12);
        ctx.fillStyle = '#0f1627';
        ctx.fillRect(-18, -2, 36, 4);
        ctx.fillStyle = '#ff9f6f';
        ctx.fillRect(-2, -2, 4, 4);
      } else if (e.kind === 'saucer') {
        ctx.fillStyle = '#2c203f';
        ctx.fillRect(-20, -8, 40, 16);
        ctx.fillStyle = '#8ca4ea';
        ctx.fillRect(-18, -6, 36, 10);
        ctx.fillStyle = '#4d6ec1';
        ctx.fillRect(-8, -12, 16, 6);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(-4, -10, 8, 3);
      } else if (e.kind === 'hopper') {
        ctx.fillStyle = '#5a1f1f';
        ctx.fillRect(-12, -18, 24, 24);
        ctx.fillStyle = '#d44646';
        ctx.fillRect(-10, -16, 20, 10);
        ctx.fillStyle = '#ffb9b9';
        ctx.fillRect(-4, -9, 8, 8);
      } else if (e.kind === 'raider') {
        ctx.fillStyle = '#2b2430';
        ctx.fillRect(-18, -11, 36, 18);
        ctx.fillStyle = '#88504d';
        ctx.fillRect(-16, -9, 32, 14);
        ctx.fillStyle = '#111';
        ctx.fillRect(-14, 7, 10, 8);
        ctx.fillRect(4, 7, 10, 8);
        ctx.fillStyle = '#9fb1d8';
        ctx.fillRect(-22, -8, 8, 3);
      } else if (e.kind === 'walker') {
        ctx.fillStyle = '#161b2a';
        ctx.fillRect(-13, -20, 26, 28);
        ctx.fillStyle = '#303b52';
        ctx.fillRect(-11, -18, 22, 20);
        ctx.fillStyle = '#d12f2f';
        ctx.fillRect(-2, -12, 4, 14);
        ctx.fillStyle = '#ff7a7a';
        ctx.fillRect(-6, -16, 4, 4);
        ctx.fillRect(2, -16, 4, 4);
      } else if (e.kind === 'jumper') {
        ctx.fillStyle = '#2a1e37';
        ctx.fillRect(-12, -18, 24, 22);
        ctx.fillStyle = '#7f78cc';
        ctx.fillRect(-10, -16, 20, 16);
        ctx.fillStyle = '#ffd28b';
        ctx.fillRect(-3, -10, 6, 6);
        ctx.fillStyle = '#100f19';
        ctx.fillRect(-11, 4, 8, 7);
        ctx.fillRect(3, 4, 8, 7);
      } else if (e.kind === 'turret') {
        ctx.fillStyle = '#2c3249';
        ctx.fillRect(-15, -14, 30, 28);
        ctx.fillStyle = '#516082';
        ctx.fillRect(-13, -12, 26, 24);
        ctx.fillStyle = '#a1b4de';
        ctx.fillRect(5, -6, 14, 3);
        ctx.fillStyle = '#ff6f6f';
        ctx.fillRect(-4, -6, 8, 6);
      } else if (e.kind === 'ninja') {
        ctx.fillStyle = '#10141f';
        ctx.fillRect(-11, -22, 22, 30);
        ctx.fillStyle = '#2b3550';
        ctx.fillRect(-9, -20, 18, 24);
        ctx.fillStyle = '#f0d1af';
        ctx.fillRect(-5, -20, 10, 8);
        ctx.fillStyle = '#7f1f1f';
        ctx.fillRect(-2, -10, 4, 10);
        ctx.fillStyle = '#82a1d4';
        ctx.fillRect(10, -16, 8, 2);
      } else if (e.kind === 'elite_ninja') {
        ctx.fillStyle = '#0c0f18';
        ctx.fillRect(-12, -24, 24, 34);
        ctx.fillStyle = '#4a2d63';
        ctx.fillRect(-10, -22, 20, 28);
        ctx.fillStyle = '#f2d8b8';
        ctx.fillRect(-5, -21, 10, 8);
        ctx.fillStyle = '#bf2742';
        ctx.fillRect(-2, -12, 4, 14);
        ctx.fillStyle = '#c9d9ff';
        ctx.fillRect(10, -19, 10, 2);
        ctx.fillRect(-20, -6, 8, 2);
      } else if (e.kind === 'bionic_ninja') {
        ctx.fillStyle = '#0e1220';
        ctx.fillRect(-12, -24, 24, 34);
        ctx.fillStyle = '#345e9b';
        ctx.fillRect(-10, -22, 20, 28);
        ctx.fillStyle = '#f2d8b8';
        ctx.fillRect(-5, -21, 10, 8);
        ctx.fillStyle = '#9fc9ff';
        ctx.fillRect(10, -17, 10, 2);
        ctx.fillRect(-20, -9, 9, 2);
        ctx.fillStyle = '#132542';
        ctx.fillRect(-2, -12, 4, 14);
      } else if (e.kind === 'bat') {
        const flap = (Math.sin(game.frame * 0.4 + e.phase) > 0 ? 1 : -1) * 4;
        ctx.fillStyle = '#101526';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.fillRect(-20, -4 + flap, 12, 4);
        ctx.fillRect(8, -4 - flap, 12, 4);
        ctx.fillStyle = '#d53a3a';
        ctx.fillRect(-3, -2, 2, 2);
        ctx.fillRect(1, -2, 2, 2);
      }

      ctx.restore();
    }
  }

  function drawPickups() {
    for (const p of game.pickups) {
      const x = p.x - game.cameraX;
      if (x < -60 || x > W + 60) continue;

      const pulse = 1 + Math.sin(game.frame * 0.2 + p.float) * 0.08;
      ctx.save();
      ctx.translate(x, p.y);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = '#6b3d00';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7931a';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      if (p.type === 'btc') {
        drawBitcoinSymbol(-5, -8, 1.5, '#fff1c9', '#9f6512');
      } else {
        const map = {
          spread: 'S',
          burst: 'B',
          laser: 'L',
          plasma: 'P',
          wave: 'W',
          giant: 'G',
          nuke: 'N',
          shield: 'D',
          med: '+'
        };
        ctx.fillStyle = '#fff0ce';
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(map[p.type] || '?', 0, 5);
      }
      ctx.restore();
    }
  }

  function drawBullets() {
    for (const b of game.bullets) {
      const x = b.x - game.cameraX;
      if (x < -120 || x > W + 120) continue;
      const left = x - b.w * 0.5;
      const top = b.y - b.h * 0.5;

      if (b.nuke) {
        const c = (((game.frame + b.altTick) / 3) | 0) % 2;
        ctx.fillStyle = c ? '#d82b2b' : '#1b1b1b';
        ctx.beginPath();
        ctx.arc(x, b.y, Math.max(5, Math.min(b.w, b.h) * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c ? '#1b1b1b' : '#d82b2b';
        ctx.beginPath();
        ctx.arc(x, b.y, Math.max(3, Math.min(b.w, b.h) * 0.28), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (b.wave) {
        const c = (((game.frame + b.altTick) / 4) | 0) % 3;
        ctx.fillStyle = c === 0 ? '#7a4dff' : c === 1 ? '#ffffff' : '#4aa6ff';
      } else if (b.plasma) {
        const c = (((game.frame + b.altTick) / 3) | 0) % 3;
        ctx.fillStyle = c === 0 ? '#8cfffb' : c === 1 ? '#67b7ff' : '#ffffff';
      } else if (b.rear) {
        ctx.fillStyle = '#8cd9ff';
      } else {
        ctx.fillStyle = '#ffb347';
      }
      ctx.fillRect(left, top, b.w, b.h);

      ctx.fillStyle = '#fff4bf';
      ctx.fillRect(left + 2, top + 1, Math.max(1, b.w - 4), Math.max(1, b.h - 2));
    }

    for (const b of game.enemyBullets) {
      const x = b.x - game.cameraX;
      if (x < -80 || x > W + 80) continue;
      ctx.fillStyle = '#d53434';
      ctx.fillRect(x - b.w * 0.5, b.y - b.h * 0.5, b.w, b.h);
      ctx.fillStyle = '#ffadad';
      ctx.fillRect(x - b.w * 0.5 + 2, b.y - b.h * 0.5 + 1, Math.max(1, b.w - 4), Math.max(1, b.h - 2));
    }
  }

  function drawSlashes() {
    for (const s of game.slashes) {
      const x = s.x - game.cameraX;
      const combo = s.combo || 1;
      const maxLife = s.maxLife || Math.max(1, s.life + 1);
      const t = clamp(1 - s.life / maxLife, 0, 1);
      const alpha = 0.16 + (1 - t) * 0.78;
      const spin = s.spin || 1;

      for (let layer = 0; layer < combo; layer++) {
        const layerScale = 0.54 + layer * 0.13;
        const layerLift = layer * 2.7;
        const layerShift = (t * 0.7 + layer * 0.08) * spin;
        ctx.strokeStyle = layer % 2 === 0
          ? `rgba(150,225,255,${alpha - layer * 0.06})`
          : `rgba(230,250,255,${(alpha * 0.82) - layer * 0.04})`;
        ctx.lineWidth = 3 + combo + layer;
        ctx.save();
        ctx.translate(x, s.y - 2 - layerLift);
        if (s.facing < 0) ctx.scale(-1, 1);
        ctx.beginPath();
        ctx.arc(-4 - layer * 0.8, 0, s.r * layerScale, -1.1 + layerShift, 0.98 + layerShift);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < combo + 1; i++) {
        const trailAlpha = alpha * (0.32 - i * 0.05);
        if (trailAlpha <= 0) continue;
        const tx = x - s.facing * (10 + i * 10) + spin * (t * 8);
        const ty = s.y - 8 - i * 2;
        ctx.fillStyle = `rgba(165,230,255,${trailAlpha})`;
        ctx.fillRect(tx - 4, ty - 1, 9, 2);
      }

      ctx.fillStyle = `rgba(255,240,180,${0.2 + alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(x + s.facing * (13 + t * 6), s.y - 8 - t * 3, 4 + combo, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of game.particles) {
      const x = p.x - game.cameraX;
      if (x < -20 || x > W + 20) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  function drawHud() {
    const stage = game.stage;
    const p = game.player;
    const progress = stage.kind === 'vehicle'
      ? clamp(game.cameraX / Math.max(1, stage.length - W), 0, 1)
      : clamp(p.wx / stage.length, 0, 1);

    ctx.fillStyle = '#10182a';
    ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = '#90a9d8';
    ctx.fillRect(0, 42, W, 4);

    ctx.fillStyle = '#d9ecff';
    ctx.font = `bold 16px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#091426';
    ctx.lineWidth = 3;
    const hudText = (text, x, y, color = '#d9ecff') => {
      ctx.fillStyle = color;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    };
    hudText('MAD PATROL 2', 12, 30);
    hudText(`STAGE ${game.stageIndex + 1}/${STAGES.length}`, 196, 30);
    hudText(`SCORE ${String(game.score).padStart(7, '0')}`, 340, 30);
    hudText(`HI ${String(game.hiScore).padStart(7, '0')}`, 560, 30);
    hudText(`LIVES ${Math.max(0, game.lives)}`, 680, 30);
    hudText(`HP ${p.hp}`, 786, 30);

    const weaponName = p.weapon === 'sword' ? 'SWORD' : p.weapon.toUpperCase();
    ctx.font = `bold 22px ${TITLE_FONT}`;
    ctx.strokeStyle = '#3b2812';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ffe08a';
    ctx.strokeText(`WEAPON ${weaponName}`, 12, H - 16);
    ctx.fillText(`WEAPON ${weaponName}`, 12, H - 16);
    if (p.shield > 0) {
      ctx.font = `bold 16px ${UI_FONT}`;
      ctx.fillStyle = '#8ce8ff';
      ctx.fillText('SHIELD', 210, H - 16);
    }
    ctx.font = `bold 16px ${UI_FONT}`;
    ctx.fillStyle = music.enabled ? '#8ff0a9' : '#ffabab';
    ctx.fillText(`MUSIC ${music.enabled ? 'ON' : 'OFF'} (M)`, 300, H - 16);
    if (p.runBoost > 0 && stage.kind !== 'vehicle') {
      ctx.fillStyle = '#ffd8a8';
      ctx.fillText('RUN', 520, H - 16);
    }
    if (p.duck && stage.kind !== 'vehicle' && stage.kind !== 'shooter') {
      ctx.fillStyle = '#b8e4ff';
      ctx.fillText('DUCK', 590, H - 16);
    }

    ctx.fillStyle = '#2d3f63';
    ctx.fillRect(854, 14, 86, 12);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(854, 14, 86 * progress, 12);
    ctx.fillStyle = '#bee0ff';
    ctx.fillRect(854, 12, 86, 2);

    if (game.messageTimer > 0 && game.state === 'playing') {
      const alpha = clamp(game.messageTimer / 100, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(14, 24, 42, 0.84)';
      ctx.fillRect(96, 52, W - 192, 24);
      ctx.strokeStyle = 'rgba(142, 177, 230, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(96, 52, W - 192, 24);
      ctx.fillStyle = '#e5f1ff';
      ctx.font = `bold 13px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(stage.controls, W * 0.5, 69);
      ctx.globalAlpha = 1;
      game.messageTimer -= 1;
    }

    if (game.paused) {
      ctx.fillStyle = 'rgba(8,10,18,0.62)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = `900 66px ${TITLE_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W * 0.5, H * 0.5);
    }
  }

  function drawStartup() {
    drawBackground(STAGES[0]);

    ctx.fillStyle = 'rgba(10, 16, 30, 0.82)';
    ctx.fillRect(56, 44, W - 112, H - 88);
    ctx.strokeStyle = '#95b8ef';
    ctx.lineWidth = 3;
    ctx.strokeRect(56, 44, W - 112, H - 88);

    ctx.fillStyle = '#ffd183';
    ctx.font = `900 74px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('MAD PATROL 2', W * 0.5, 124);

    ctx.fillStyle = '#cfe4ff';
    ctx.font = `bold 22px ${UI_FONT}`;
    ctx.fillText('STARTUP BRIEFING', W * 0.5, 160);

    ctx.fillStyle = '#16243e';
    ctx.fillRect(98, 182, 356, 244);
    ctx.strokeStyle = '#6e8fc0';
    ctx.strokeRect(98, 182, 356, 244);

    // Hero portrait panel.
    const heroX = 272;
    const heroY = 340;
    drawMadSuitBody(heroX, heroY, 'ninja', 1, game.frame * 0.2, 0, 0, 0);
    drawMadHead(heroX, heroY - 30, 1.55);
    ctx.fillStyle = '#7d91b6';
    ctx.fillRect(heroX + 38, heroY - 26, 26, 5);
    ctx.fillStyle = '#d8ecff';
    ctx.fillRect(heroX + 64, heroY - 27, 20, 2);

    ctx.fillStyle = '#243759';
    ctx.fillRect(286, 370, 138, 44);
    ctx.fillStyle = '#89a8d7';
    ctx.fillRect(292, 376, 126, 30);
    drawBitcoinSymbol(302, 382, 1.6, '#ffe9b4', '#7d4e08');
    ctx.fillStyle = '#111b2c';
    ctx.font = `bold 15px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('MADBITCOINS HERO', 334, 397);

    ctx.fillStyle = '#172744';
    ctx.fillRect(486, 182, 394, 244);
    ctx.strokeStyle = '#6e8fc0';
    ctx.strokeRect(486, 182, 394, 244);

    ctx.fillStyle = '#d8e8ff';
    ctx.font = `bold 19px ${UI_FONT}`;
    ctx.fillText('MISSION UPGRADE', 683, 218);

    ctx.font = `bold 15px ${UI_FONT}`;
    ctx.textAlign = 'left';
    const startupLines = [
      'Moon Patrol now uses one FIRE button',
      'for both forward and upward shots.',
      'Stage 1 now has mountain bank clusters with',
      'more jump variety and denser powerup lanes.',
      'Mad Bitcoins can now duck on foot stages',
      'to shoot low and evade incoming fire.',
      'Bionic grapple now supports direction select:',
      'G + forward/back picks the anchor side.'
    ];
    let sy = 252;
    for (const line of startupLines) {
      ctx.fillText(line, 506, sy);
      sy += 28;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe6a0';
    ctx.font = `900 30px ${TITLE_FONT}`;
    if (((game.frame / 20) | 0) % 2 === 0) {
      ctx.fillText('PRESS SPACE TO ENTER BRIEFING', W * 0.5, H - 42);
    }
  }

  function drawTitle() {
    drawBackground(STAGES[0]);

    ctx.fillStyle = '#0f1526';
    ctx.fillRect(50, 48, W - 100, 440);
    ctx.strokeStyle = '#8faed8';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 48, W - 100, 440);

    const pulse = 1 + Math.sin(game.expertTicker * 0.08) * 0.03;
    ctx.save();
    ctx.translate(W * 0.5, 112);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffca66';
    ctx.font = `900 72px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('MAD PATROL 2', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#d7e7ff';
    ctx.font = `bold 18px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('MOON PATROL  x  NINJA GAIDEN  x  R-TYPE/GRADIUS  x  BIONIC  x  UNDERWATER', W * 0.5, 152);

    ctx.fillStyle = '#9ec4ff';
    ctx.font = `bold 16px ${UI_FONT}`;
    ctx.fillText('Mad Bitcoins Hero: top hat, purple sash, Bitcoin crest, black-rim goggles, red fly lenses.', W * 0.5, 182);

    const cardW = 268;
    const cardH = 220;
    const startX = 62;
    const y = 206;

    for (let i = 0; i < RETRO_EXPERTS.length; i++) {
      const ex = RETRO_EXPERTS[i];
      const x = startX + i * (cardW + 16);
      ctx.fillStyle = '#18233b';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = '#7da0d5';
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.fillStyle = '#ffdf93';
      ctx.font = `900 31px ${TITLE_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(ex.name, x + 12, y + 34);
      ctx.fillStyle = '#8ec7ff';
      ctx.font = `bold 17px ${UI_FONT}`;
      ctx.fillText(ex.title, x + 12, y + 58);

      ctx.fillStyle = '#d8e8ff';
      ctx.font = `bold 15px ${UI_FONT}`;
      const lines = [ex.compare, ex.advice];
      let lineY = y + 90;
      for (const block of lines) {
        const wrapped = wrapText(block, 32);
        for (const line of wrapped) {
          ctx.fillText(line, x + 12, lineY);
          lineY += 18;
        }
        lineY += 6;
      }
    }

    const meeting = RETRO_MEETING[((game.expertTicker / 170) | 0) % RETRO_MEETING.length];
    const decisionIdx = ((game.expertTicker / 95) | 0) % meeting.decisions.length;
    ctx.fillStyle = 'rgba(16, 30, 55, 0.86)';
    ctx.fillRect(68, H - 122, W - 136, 56);
    ctx.strokeStyle = '#92b5e8';
    ctx.strokeRect(68, H - 122, W - 136, 56);
    ctx.fillStyle = '#cfe5ff';
    ctx.font = `bold 13px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`BIG RETRO MEETING: ${meeting.speaker} - ${meeting.focus}`, 82, H - 98);
    ctx.fillStyle = '#ffe8a3';
    ctx.fillText(`Applied now: ${meeting.decisions[decisionIdx]}`, 82, H - 80);

    ctx.fillStyle = '#ffe399';
    ctx.font = `900 28px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    if (((game.frame / 22) | 0) % 2 === 0) {
      ctx.fillText('PRESS SPACE TO START', W * 0.5, H - 26);
    }
    ctx.fillStyle = '#9ec4ff';
    ctx.font = `bold 14px ${UI_FONT}`;
    ctx.fillText('M toggles music', W * 0.5, H - 56);
  }

  function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (test.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawBriefing() {
    const stage = game.stage;
    const expert = expertForStage(game.stageIndex);
    const meeting = meetingForStage(game.stageIndex);

    drawBackground(stage);
    drawTerrain(stage);
    if (stage.kind !== 'vehicle' && stage.kind !== 'shooter') {
      if (stage.allowMario !== false) drawMarioFeatures();
      drawPlatforms();
    }

    ctx.fillStyle = 'rgba(8,10,18,0.75)';
    ctx.fillRect(86, 72, W - 172, H - 144);
    ctx.strokeStyle = '#9bc0f6';
    ctx.lineWidth = 3;
    ctx.strokeRect(86, 72, W - 172, H - 144);

    ctx.fillStyle = '#ffd57f';
    ctx.font = `900 42px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE ${game.stageIndex + 1}: ${stage.name.toUpperCase()}`, W * 0.5, 138);

    ctx.fillStyle = '#d7e8ff';
    ctx.font = `bold 20px ${UI_FONT}`;
    ctx.fillText(stage.kind === 'vehicle'
      ? 'Classic Moon Patrol style: pits, moon banks, and jump-over mountains.'
      : stage.kind === 'blaster'
        ? 'Contra-style dirt run: fast pacing, layered platforms, multi-level enemies.'
      : stage.kind === 'sword'
          ? 'Mad Bitcoins exits the car with sword only: Ninja Gaiden style.'
          : stage.kind === 'shooter' && stage.theme === 'underwater'
            ? 'Underwater finale: current-drift shooter combat in the deep trench.'
            : stage.kind === 'shooter'
              ? 'R-Type / Gradius style flight corridor with speed-variant soundtrack.'
            : 'Bionic Commando traversal: directional G grapples across multi-level platforms.', W * 0.5, 182);

    ctx.fillStyle = '#9fd2ff';
    ctx.font = `bold 17px ${UI_FONT}`;
    ctx.fillText(`RETRO EXPERT: ${expert.name} - ${expert.title}`, W * 0.5, 228);

    const compareLines = wrapText(expert.compare, 68);
    const adviceLines = wrapText(expert.advice, 68);

    ctx.fillStyle = '#dcecff';
    ctx.font = `bold 15px ${UI_FONT}`;
    let y = 262;
    for (const line of compareLines) {
      ctx.fillText(line, W * 0.5, y);
      y += 22;
    }
    y += 6;
    for (const line of adviceLines) {
      ctx.fillText(line, W * 0.5, y);
      y += 22;
    }

    ctx.fillStyle = '#ffe6a3';
    ctx.font = `bold 14px ${UI_FONT}`;
    const d0 = meeting.decisions[(game.stageIndex + 0) % meeting.decisions.length];
    const d1 = meeting.decisions[(game.stageIndex + 1) % meeting.decisions.length];
    ctx.fillText(`MEETING DECISION: ${d0}`, W * 0.5, y + 8);
    ctx.fillText(d1, W * 0.5, y + 30);

    ctx.fillStyle = '#ffe09a';
    ctx.font = `bold 16px ${UI_FONT}`;
    ctx.fillText(`CONTROLS: ${stage.controls}`, W * 0.5, H - 116);

    ctx.fillStyle = '#fff0b9';
    ctx.font = `900 24px ${TITLE_FONT}`;
    if (((game.frame / 20) | 0) % 2 === 0) {
      ctx.fillText('PRESS SPACE TO DEPLOY', W * 0.5, H - 72);
    }
  }

  function drawStageClear() {
    drawBackground(game.stage);

    ctx.fillStyle = 'rgba(12,14,24,0.78)';
    ctx.fillRect(130, 120, W - 260, H - 240);
    ctx.strokeStyle = '#9bc0f6';
    ctx.lineWidth = 3;
    ctx.strokeRect(130, 120, W - 260, H - 240);

    ctx.fillStyle = '#ffde88';
    ctx.font = `900 52px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE ${game.stageIndex + 1} CLEARED`, W * 0.5, 200);

    ctx.fillStyle = '#d8ebff';
    ctx.font = `bold 22px ${UI_FONT}`;
    ctx.fillText(`SCORE ${String(game.score).padStart(7, '0')}`, W * 0.5, 250);

    if (game.stageIndex < STAGES.length - 1) {
      const next = STAGES[game.stageIndex + 1];
      const expert = expertForStage(game.stageIndex + 1);
      ctx.fillStyle = '#8ec8ff';
      ctx.font = `900 24px ${TITLE_FONT}`;
      ctx.fillText(`NEXT: ${next.name.toUpperCase()}`, W * 0.5, 304);
      ctx.font = `bold 17px ${UI_FONT}`;
      ctx.fillStyle = '#dcecff';
      ctx.fillText(`${expert.name}: ${expert.advice}`, W * 0.5, 338);
    } else {
      ctx.fillStyle = '#9effbf';
      ctx.font = `900 24px ${TITLE_FONT}`;
      ctx.fillText('ALL RETRO EXPERT TARGETS MET', W * 0.5, 312);
    }

    ctx.fillStyle = '#fff0b9';
    ctx.font = `900 26px ${TITLE_FONT}`;
    if (((game.frame / 20) | 0) % 2 === 0) {
      ctx.fillText('PRESS SPACE TO CONTINUE', W * 0.5, H - 90);
    }
  }

  function drawGameOver() {
    drawBackground(STAGES[0]);
    ctx.fillStyle = 'rgba(8,10,18,0.74)';
    ctx.fillRect(150, 120, W - 300, H - 240);
    ctx.strokeStyle = '#7f99c6';
    ctx.strokeRect(150, 120, W - 300, H - 240);

    ctx.fillStyle = '#ff9797';
    ctx.font = `900 70px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W * 0.5, 220);

    ctx.fillStyle = '#e1f0ff';
    ctx.font = `900 30px ${TITLE_FONT}`;
    ctx.fillText(`FINAL SCORE ${String(game.score).padStart(7, '0')}`, W * 0.5, 290);

    ctx.fillStyle = '#ffd98a';
    ctx.font = `900 24px ${TITLE_FONT}`;
    ctx.fillText('PRESS ENTER FOR TITLE', W * 0.5, 350);
  }

  function drawWin() {
    drawBackground(STAGES[STAGES.length - 1]);
    ctx.fillStyle = 'rgba(8,10,18,0.74)';
    ctx.fillRect(100, 74, W - 200, H - 148);
    ctx.strokeStyle = '#9bc0f6';
    ctx.strokeRect(100, 74, W - 200, H - 148);

    ctx.fillStyle = '#ffe292';
    ctx.font = `900 58px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('MAD PATROL 2 CLEARED', W * 0.5, 148);

    ctx.fillStyle = '#dcecff';
    ctx.font = `bold 23px ${UI_FONT}`;
    ctx.fillText('Moon Patrol + ground ninja run + R-Type/Gradius + bionic + underwater finale complete.', W * 0.5, 196);

    ctx.font = `900 28px ${TITLE_FONT}`;
    ctx.fillText(`FINAL SCORE ${String(game.score).padStart(7, '0')}`, W * 0.5, 246);

    ctx.fillStyle = '#9fd2ff';
    ctx.font = `bold 15px ${UI_FONT}`;
    let y = 286;
    for (let i = 0; i < RETRO_MEETING.length; i++) {
      const meeting = RETRO_MEETING[i];
      ctx.fillText(`${meeting.speaker}: ${meeting.decisions[0]}`, W * 0.5, y);
      y += 24;
      ctx.fillStyle = '#d9e9ff';
      ctx.fillText(meeting.decisions[1], W * 0.5, y);
      y += 18;
      ctx.fillStyle = '#9fd2ff';
    }

    ctx.fillStyle = '#ffe0a0';
    ctx.font = `900 26px ${TITLE_FONT}`;
    ctx.fillText('PRESS ENTER FOR TITLE', W * 0.5, H - 64);
  }

  function drawPlaying() {
    drawBackground(game.stage);
    drawTerrain(game.stage);
    if (game.stage.kind !== 'vehicle' && game.stage.kind !== 'shooter') {
      if (game.stage.allowMario !== false) drawMarioFeatures();
      drawPlatforms();
    }
    drawPickups();
    drawEnemies();
    drawBullets();
    drawSlashes();
    drawPlayer();
    drawParticles();
    drawHud();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    if (game.state === 'startup') {
      drawStartup();
      return;
    }

    if (game.state === 'title') {
      drawTitle();
      return;
    }

    if (game.state === 'briefing') {
      drawBriefing();
      return;
    }

    if (game.state === 'playing') {
      drawPlaying();
      return;
    }

    if (game.state === 'stage_clear') {
      drawStageClear();
      return;
    }

    if (game.state === 'gameover') {
      drawGameOver();
      return;
    }

    if (game.state === 'win') {
      drawWin();
    }
  }

  function gameTextState() {
    const stage = game.stage;
    const p = game.player || {
      wx: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      hp: 0,
      weapon: 'none'
    };

    const visiblePits = game.pits
      .filter((pit) => pit.x + pit.w > game.cameraX - 40 && pit.x < game.cameraX + W + 40)
      .slice(0, 8)
      .map((pit) => ({ x: Math.round(pit.x), w: Math.round(pit.w) }));

    const visibleEnemies = game.enemies
      .filter((e) => e.x > game.cameraX - 50 && e.x < game.cameraX + W + 50)
      .slice(0, 10)
      .map((e) => ({ type: e.kind, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp }));

    const visiblePickups = game.pickups
      .filter((i) => i.x > game.cameraX - 40 && i.x < game.cameraX + W + 40)
      .slice(0, 8)
      .map((i) => ({ type: i.type, x: Math.round(i.x), y: Math.round(i.y) }));

    const visibleBlocks = game.marioBlocks
      .filter((b) => b.x > game.cameraX - 60 && b.x < game.cameraX + W + 60)
      .slice(0, 10)
      .map((b) => ({ kind: b.kind, x: Math.round(b.x), y: Math.round(b.y + (b.bump || 0)), used: !!b.used }));

    const visiblePipes = game.pipes
      .filter((p2) => p2.x + p2.w > game.cameraX - 60 && p2.x < game.cameraX + W + 60)
      .slice(0, 8)
      .map((p2) => ({ x: Math.round(p2.x), w: Math.round(p2.w), h: Math.round(p2.h) }));

    const visibleAnchors = game.anchors
      .filter((a) => a.x > game.cameraX - 80 && a.x < game.cameraX + W + 80)
      .slice(0, 10)
      .map((a) => ({ x: Math.round(a.x), y: Math.round(a.y) }));

    const visibleBanks = game.banks
      .filter((b) => b.x + b.w > game.cameraX - 60 && b.x < game.cameraX + W + 60)
      .slice(0, 8)
      .map((b) => ({ kind: b.kind, x: Math.round(b.x), w: Math.round(b.w), h: Math.round(b.h) }));

    const payload = {
      coordinate_system: 'world: origin at far-left top, +x right, +y down; screen_x = world_x - cameraX',
      mode: game.state,
      stage: {
        index: game.stageIndex,
        total: STAGES.length,
        id: stage.id,
        kind: stage.kind,
        name: stage.name,
        cameraX: Math.round(game.cameraX),
        length: stage.length
      },
      player: {
        x: Math.round(p.wx),
        y: Math.round(p.y),
        vx: Number(p.vx?.toFixed(2) || 0),
        vy: Number(p.vy?.toFixed(2) || 0),
        speed: Number(p.speed?.toFixed(2) || 0),
        hp: p.hp,
        lives: game.lives,
        weapon: p.weapon,
        inv: p.inv,
        duck: !!p.duck,
        collision_h: p.duck ? Math.round(p.h * 0.58) : p.h,
        grapple_active: !!p.grappleTarget,
        hook_cd: p.hookCd || 0,
        grapple_target_x: p.grappleTarget ? Math.round(p.grappleTarget.x) : null
      },
      score: game.score,
      enemies: visibleEnemies,
      pits: visiblePits,
      banks: visibleBanks,
      blocks: visibleBlocks,
      pipes: visiblePipes,
      anchors: visibleAnchors,
      pickups: visiblePickups,
      bullets: {
        player: game.bullets.length,
        enemy: game.enemyBullets.length,
        slashes: game.slashes.length
      }
    };

    return JSON.stringify(payload);
  }

  window.render_game_to_text = gameTextState;
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / FRAME_MS));
    for (let i = 0; i < steps; i++) stepFrame();
    render();
  };
  window.debug_set_stage = (index, mode = 'playing') => {
    const target = clamp(Math.floor(index || 0), 0, STAGES.length - 1);
    initStage(target);
    game.messageTimer = 0;
    game.state = mode;
    render();
    return gameTextState();
  };

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (canvas.requestFullscreen) {
      await canvas.requestFullscreen();
    }
  }

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f', 'm', 'g', 'escape', 'enter'].includes(k)) {
      ev.preventDefault();
    }

    if (!keysDown.has(k)) keysPressed.add(k);
    keysDown.add(k);

    if ([' ', 'enter', 'm', 'g', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      unlockMusicPlayback();
    }

    if (k === 'f') {
      toggleFullscreen().catch(() => {});
      return;
    }

    if (k === 'm') {
      music.enabled = !music.enabled;
      syncMusicPlayback(false);
      beep(music.enabled ? 520 : 200, 0.06, 'triangle', 0.04, music.enabled ? 50 : -50);
      return;
    }

    if (k === 'escape' && game.state === 'playing') {
      game.paused = !game.paused;
      beep(game.paused ? 190 : 420, 0.07, 'square', 0.04, 20);
      return;
    }

    if ((k === ' ' || k === 'enter') && game.state === 'startup') {
      game.state = 'title';
      game.expertTicker = 0;
      beep(300, 0.08, 'triangle', 0.05, 120);
      return;
    }

    if ((k === ' ' || k === 'enter') && game.state === 'title') {
      ensureAudio();
      startRun();
      beep(340, 0.1, 'triangle', 0.06, 140);
      return;
    }

    if ((k === ' ' || k === 'enter') && game.state === 'briefing') {
      game.state = 'playing';
      game.messageTimer = 90;
      beep(380, 0.09, 'triangle', 0.05, 100);
      return;
    }

    if ((k === ' ' || k === 'enter') && game.state === 'stage_clear') {
      nextStageOrWin();
      return;
    }

    if (k === 'enter' && (game.state === 'gameover' || game.state === 'win')) {
      game.state = 'title';
      game.expertTicker = 0;
      game.messageTimer = 0;
    }
  });

  window.addEventListener('keyup', (ev) => {
    keysDown.delete(ev.key.toLowerCase());
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopActiveMusic(false);
      return;
    }
    syncMusicPlayback(false);
  });

  let rafId = 0;
  let lastTime = performance.now();
  let accMs = 0;

  function frame(now) {
    const dt = Math.min(100, now - lastTime);
    lastTime = now;
    accMs += dt;

    while (accMs >= FRAME_MS) {
      stepFrame();
      accMs -= FRAME_MS;
    }

    render();
    rafId = requestAnimationFrame(frame);
  }

  buildDecor();
  render();
  rafId = requestAnimationFrame(frame);

  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
