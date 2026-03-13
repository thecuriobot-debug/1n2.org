function compileSprite(rows, palette) {
  const height = rows.length;
  const width = rows[0].length;
  const pixels = [];

  for (let y = 0; y < height; y += 1) {
    const row = rows[y];
    for (let x = 0; x < width; x += 1) {
      const key = row[x];
      if (key === ".") {
        continue;
      }
      const color = palette[key] || "#ff00ff";
      pixels.push({ x, y, color });
    }
  }

  return { width, height, pixels };
}

export function drawPixelSprite(ctx, sprite, x, y, options = {}) {
  if (!sprite) {
    return;
  }

  const { flipX = false } = options;

  if (!flipX) {
    for (const px of sprite.pixels) {
      ctx.fillStyle = px.color;
      ctx.fillRect(x + px.x, y + px.y, 1, 1);
    }
    return;
  }

  for (const px of sprite.pixels) {
    ctx.fillStyle = px.color;
    const mirroredX = sprite.width - 1 - px.x;
    ctx.fillRect(x + mirroredX, y + px.y, 1, 1);
  }
}

const PLAYER_PALETTE = {
  k: "#120f1d",
  h: "#08080a",
  s: "#d6c3a0",
  g: "#6eb9ff",
  m: "#5d3a28",
  c: "#1f2f57",
  w: "#e6edf5",
  l: "#12131c",
  y: "#d6a826",
  n: "#8a6748",
  q: "#dbe9f7",
  r: "#ac3f51",
  u: "#303448",
};

const PLAYER_IDLE = compileSprite(
  [
    "......kkkkk.......",
    ".....khhhhhk......",
    ".....khhhhhk......",
    "......kkkkk.......",
    ".....ksssssk......",
    "....kssgggssk.....",
    "....kssmmsssk.....",
    "....ksswwsssk.....",
    ".....ksssssk......",
    ".....kccrcck......",
    "....kccccccck.....",
    "....kccccccck.....",
    "....kcccyccck.....",
    "....kcccyccck.....",
    "....kccccccck.....",
    "....kccccccck.....",
    ".....klll lk......",
    ".....klll lk......",
    "....klllllllk.....",
    "....kll..lllk.....",
    "....kuu..uuuk.....",
    "....kuu..uuuk.....",
  ],
  PLAYER_PALETTE,
);

const PLAYER_RUN_A = compileSprite(
  [
    "......kkkkk.......",
    ".....khhhhhk......",
    ".....khhhhhk......",
    "......kkkkk.......",
    ".....ksssssk......",
    "....kssgggssk.....",
    "....kssmmsssk.....",
    "....ksswwsssk.....",
    ".....ksssssk......",
    ".....kccrcck......",
    "....kccccccck.....",
    "....kccccccck.....",
    "....kcccyccck.....",
    "....kcccyccck.....",
    "....kccccccck.....",
    "....kccccccck.....",
    ".....klll.lk......",
    "....kllll.lkk.....",
    "...klll...llk.....",
    "...kuu....uuk.....",
    "..kuu.....uuk.....",
    "...k......kk......",
  ],
  PLAYER_PALETTE,
);

const PLAYER_RUN_B = compileSprite(
  [
    "......kkkkk.......",
    ".....khhhhhk......",
    ".....khhhhhk......",
    "......kkkkk.......",
    ".....ksssssk......",
    "....kssgggssk.....",
    "....kssmmsssk.....",
    "....ksswwsssk.....",
    ".....ksssssk......",
    ".....kccrcck......",
    "....kccccccck.....",
    "....kccccccck.....",
    "....kcccyccck.....",
    "....kcccyccck.....",
    "....kccccccck.....",
    "....kccccccck.....",
    ".....klll.lk......",
    "....kllllllkk.....",
    "....kll..lllk.....",
    "....kuu..uukk.....",
    ".....k..uuk.......",
    "....kk..kk........",
  ],
  PLAYER_PALETTE,
);

const PLAYER_JUMP = compileSprite(
  [
    "......kkkkk.......",
    ".....khhhhhk......",
    ".....khhhhhk......",
    "......kkkkk.......",
    ".....ksssssk......",
    "....kssgggssk.....",
    "....kssmmsssk.....",
    "....ksswwsssk.....",
    ".....ksssssk......",
    ".....kccrcck......",
    "....kccccccck.....",
    "....kccccccck.....",
    "....kcccyccck.....",
    "....kcccyccck.....",
    "....kccccccck.....",
    "...kccccccckk.....",
    "..klll..lllk......",
    "..klll..lllk......",
    "...kuu..uuk.......",
    "....kk..kk........",
    "..................",
    "..................",
  ],
  PLAYER_PALETTE,
);

const PLAYER_ATTACK = compileSprite(
  [
    "......kkkkk.......",
    ".....khhhhhk......",
    ".....khhhhhk......",
    "......kkkkk.......",
    ".....ksssssk......",
    "....kssgggssk.....",
    "....kssmmssskkkkkk",
    "....ksswwssskqqqqk",
    ".....kssssskqqqqk.",
    ".....kccrcckqqqqk.",
    "....kccccccckqqk..",
    "....kccccccck.k...",
    "....kcccyccck.....",
    "....kcccyccck.....",
    "....kccccccck.....",
    "....kccccccck.....",
    ".....klll.lk......",
    "....kllllllkk.....",
    "....kll..lllk.....",
    "....kuu..uukk.....",
    ".....k..uuk.......",
    "....kk..kk........",
  ],
  PLAYER_PALETTE,
);

const PLAYER_HEAVY = compileSprite(
  [
    "......kkkkk.......",
    ".....khhhhhk......",
    ".....khhhhhkkkkkkk",
    "......kkkkkqqqqqqk",
    ".....kssssskqqqqqk",
    "....kssgggsskqqqqk",
    "....kssmmssskkqqk.",
    "....ksswwsssk..k..",
    ".....ksssssk......",
    ".....kccrcck......",
    "....kccccccck.....",
    "....kccccccck.....",
    "....kcccyccck.....",
    "....kcccyccck.....",
    "....kccccccck.....",
    "....kccccccck.....",
    ".....klll lk......",
    ".....klll lk......",
    "....klllllllk.....",
    "....kll..lllk.....",
    "....kuu..uuuk.....",
    "....kuu..uuuk.....",
  ],
  PLAYER_PALETTE,
);

const ENEMY_PALETTES = {
  banker_goon: {
    k: "#0f111a",
    s: "#d8c5a5",
    b: "#5f86c7",
    w: "#e9eff6",
    t: "#6d4d39",
  },
  regulator_drone: {
    k: "#111826",
    r: "#f26a7c",
    m: "#909ba8",
    g: "#ffd8a6",
    c: "#8fa5be",
  },
  hacker_ninja: {
    k: "#0d1318",
    c: "#63d9c8",
    s: "#b9d7d3",
    r: "#1d4f54",
    w: "#e8f5f2",
  },
  exchange_bot: {
    k: "#1b1825",
    o: "#f1bb90",
    m: "#8a7a8d",
    w: "#f5f0eb",
    r: "#ff7f51",
  },
  altcoin_slime: {
    k: "#132211",
    g: "#7de85c",
    l: "#b5ff92",
    d: "#4fa740",
  },
  fud_ghost: {
    k: "#231c33",
    g: "#c4a8f0",
    l: "#e7d9ff",
    d: "#9b78d3",
  },
};

const ENEMY_ROWS = {
  banker_goon: [
    "..kkkk..",
    ".kssssk.",
    ".kswwsk.",
    "..kttk..",
    ".kbbbbk.",
    ".kbbbbk.",
    ".kbbbbk.",
    ".kk..kk.",
    ".kk..kk.",
    ".kk..kk.",
  ],
  regulator_drone: [
    "..mmmm..",
    ".mrrrrm.",
    "mrrggrrm",
    "mrrmrrrm",
    "mccccccm",
    ".mccccm.",
    "..m..m..",
  ],
  hacker_ninja: [
    "..kkkk..",
    ".kssssk.",
    ".kswwsk.",
    "..krrk..",
    ".kcccck.",
    ".kcccck.",
    ".kcccck.",
    ".kk..kk.",
    ".kk..kk.",
    ".kk..kk.",
  ],
  exchange_bot: [
    "..mmmm..",
    ".moooom.",
    "moowwoom",
    "moomooom",
    "mmoooomm",
    ".mkkkkm.",
    "..mrrm..",
    "..m..m..",
  ],
  altcoin_slime: [
    "..kkkk..",
    ".kggggk.",
    "kggllggk",
    "kggddggk",
    ".kggggk.",
    "..k..k..",
  ],
  fud_ghost: [
    "..kkkk..",
    ".kggggk.",
    "kggllggk",
    "kggddggk",
    "kggggggk",
    "kg..g..k",
    "k..g..gk",
  ],
};

const ENEMY_SPRITES = Object.fromEntries(
  Object.entries(ENEMY_ROWS).map(([name, rows]) => [name, compileSprite(rows, ENEMY_PALETTES[name])]),
);

export function drawPlayerSprite(ctx, player, clock) {
  const px = Math.round(player.x) - 3;
  const py = Math.round(player.y) - 6;
  const flipX = player.facing < 0;

  let sprite = PLAYER_IDLE;

  if (player.heavyAttacking) {
    sprite = PLAYER_HEAVY;
  } else if (player.attackTimer > 0) {
    sprite = PLAYER_ATTACK;
  } else if (!player.onGround) {
    sprite = PLAYER_JUMP;
  } else if (Math.abs(player.vx) > player.walkSpeed * 0.7) {
    sprite = Math.sin(clock * 24) > 0 ? PLAYER_RUN_A : PLAYER_RUN_B;
  } else if (Math.abs(player.vx) > 8) {
    sprite = Math.sin(clock * 16) > 0 ? PLAYER_RUN_A : PLAYER_IDLE;
  }

  drawPixelSprite(ctx, sprite, px, py, { flipX });
}

export function drawEnemySprite(ctx, enemy, clock) {
  const sprite = ENEMY_SPRITES[enemy.type];
  if (!sprite) {
    return;
  }

  const bob = enemy.mode === "fly" ? Math.round(Math.sin(clock * 18) * 1) : 0;
  const ex = Math.round(enemy.x) - 1;
  const ey = Math.round(enemy.y) - 1 + bob;
  const flipX = enemy.direction < 0;

  drawPixelSprite(ctx, sprite, ex, ey, { flipX });
}

const PATTERN_LAYOUTS = {
  city_brick: [
    "11111111",
    "12222221",
    "12212221",
    "12222221",
    "11111111",
    "13333331",
    "13313331",
    "13333331",
  ],
  steel: [
    "11111111",
    "12222221",
    "12333321",
    "12344321",
    "12344321",
    "12333321",
    "12222221",
    "11111111",
  ],
  jungle: [
    "11111111",
    "12223221",
    "12334321",
    "12223221",
    "12111221",
    "12334321",
    "12223221",
    "11111111",
  ],
  chart: [
    "11111111",
    "12222221",
    "12233221",
    "12223321",
    "12222321",
    "12332221",
    "12222221",
    "11111111",
  ],
  glitch: [
    "12131213",
    "31313131",
    "13131313",
    "31213121",
    "12131213",
    "31313131",
    "13131313",
    "31213121",
  ],
  core: [
    "11111111",
    "12244221",
    "12488421",
    "12488421",
    "12488421",
    "12488421",
    "12244221",
    "11111111",
  ],
};

const PATTERN_COLORS = {
  city_brick: {
    1: "#211d26",
    2: "#82451f",
    3: "#6b3718",
  },
  steel: {
    1: "#1b2738",
    2: "#4f5f74",
    3: "#74859a",
    4: "#a6b6c8",
  },
  jungle: {
    1: "#1b2d1f",
    2: "#3f6a3f",
    3: "#7fb467",
    4: "#2e4f31",
  },
  chart: {
    1: "#24192c",
    2: "#5d3d6d",
    3: "#8a6da4",
  },
  glitch: {
    1: "#26162f",
    2: "#503267",
    3: "#905ab0",
  },
  core: {
    1: "#16323f",
    2: "#2f657a",
    4: "#61a8c6",
    8: "#a9e6ff",
  },
};

const stagePatternMap = {
  stage1: "city_brick",
  stage2: "steel",
  stage3: "jungle",
  stage4: "chart",
  stage5: "glitch",
  stage6: "core",
};

const patternCache = new Map();

function buildPattern(patternName) {
  const pattern = PATTERN_LAYOUTS[patternName] || PATTERN_LAYOUTS.city_brick;
  const colors = PATTERN_COLORS[patternName] || PATTERN_COLORS.city_brick;

  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const pctx = c.getContext("2d", { alpha: false });
  pctx.imageSmoothingEnabled = false;

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const key = pattern[y][x];
      pctx.fillStyle = colors[key] || "#ff00ff";
      pctx.fillRect(x, y, 1, 1);
    }
  }

  return c;
}

export function getPatternForStage(ctx, stageId) {
  const patternName = stagePatternMap[stageId] || "city_brick";

  if (!patternCache.has(patternName)) {
    patternCache.set(patternName, buildPattern(patternName));
  }

  const canvas = patternCache.get(patternName);
  return ctx.createPattern(canvas, "repeat");
}

export function drawStageForeground(ctx, stageId, cameraX, clock) {
  if (stageId === "stage1" || stageId === "stage4") {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#0b0f1c";
    for (let i = 0; i < 16; i += 1) {
      const x = Math.floor((i * 24 - cameraX * 1.05) % (GAME_LOOP_WRAP + 48)) - 20;
      const h = 16 + (i % 5) * 6;
      ctx.fillRect(x, GAME_HEIGHT - h, 10, h);
    }
    ctx.restore();
  }

  if (stageId === "stage5") {
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 20; i += 1) {
      const x = (i * 17 + Math.floor(clock * 45) - Math.floor(cameraX)) % (GAME_WIDTH + 30);
      const y = (i * 11 + Math.floor(clock * 20)) % GAME_HEIGHT;
      ctx.fillStyle = i % 2 ? "#73ddff" : "#ff66c2";
      ctx.fillRect(x, y, 2, 1);
    }
    ctx.restore();
  }
}

const GAME_LOOP_WRAP = 400;
const GAME_HEIGHT = 240;
const GAME_WIDTH = 256;
