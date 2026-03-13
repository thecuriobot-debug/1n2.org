function compileSprite(rows, palette) {
  const height = rows.length;
  const width = rows.reduce((maxWidth, row) => Math.max(maxWidth, row.length), 0);
  const normalizedRows = rows.map((row) => row.padEnd(width, "."));
  const pixels = [];

  for (let y = 0; y < height; y += 1) {
    const row = normalizedRows[y];
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

function drawSpriteOutline(ctx, sprite, x, y, color, flipX = false) {
  const occupied = new Set();
  for (const px of sprite.pixels) {
    const ox = flipX ? sprite.width - 1 - px.x : px.x;
    occupied.add(`${ox},${px.y}`);
  }

  const plotted = new Set();
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  ctx.fillStyle = color;
  for (const px of sprite.pixels) {
    const ox = flipX ? sprite.width - 1 - px.x : px.x;
    for (const [dx, dy] of offsets) {
      const nx = ox + dx;
      const ny = px.y + dy;
      const key = `${nx},${ny}`;
      if (occupied.has(key) || plotted.has(key)) {
        continue;
      }
      plotted.add(key);
      ctx.fillRect(x + nx, y + ny, 1, 1);
    }
  }
}

function drawCaneBlade(ctx, x, y, length, flipX, heavy) {
  const dir = flipX ? -1 : 1;
  const startX = Math.round(x);
  const startY = Math.round(y);

  ctx.fillStyle = "#0a0d16";
  ctx.fillRect(startX + dir, startY - 1, dir * (length + 2), 4);

  ctx.fillStyle = "#f1f5ff";
  ctx.fillRect(startX, startY, dir * length, 2);

  ctx.fillStyle = "#b6c7d8";
  ctx.fillRect(startX + dir * 2, startY + 1, dir * (length - 2), 1);

  ctx.fillStyle = "#d6a826";
  ctx.fillRect(startX - dir * 2, startY, dir * 2, 2);

  if (heavy) {
    ctx.fillStyle = "#ff9f5c";
    ctx.fillRect(startX + dir * (length - 3), startY - 1, dir * 4, 1);
  }
}

const PLAYER_PALETTE = {
  k: "#06070a",
  t: "#0f1017",
  h: "#1a1d27",
  r: "#c53042",
  b: "#e2b42f",
  s: "#e4c8a0",
  g: "#14161f",
  p: "#a81f31",
  v: "#ff7282",
  m: "#73482f",
  f: "#f6f4ef",
  c: "#13203f",
  d: "#243967",
  w: "#e8edf5",
  n: "#9b2632",
  y: "#d7a71e",
  l: "#10141f",
  u: "#404961",
  q: "#f2f6ff",
};

const PLAYER_SIDE_BASE = [
  ".........ttttt..........",
  "........tthhhhtt........",
  "........ttrrrrtt........",
  ".........ttbtt..........",
  ".......kkkkkkkkk........",
  "......kssssssssk........",
  ".....kssggvvvsskk.......",
  ".....kssggpppsssk.......",
  "......kssmmmmssk........",
  "......kssffffssk........",
  ".......ksssssssk........",
  "......kccddwwcck........",
  ".....kccccwwccck........",
  ".....kccccnnccck........",
  ".....kccccyyccck........",
  ".....kccccccccck........",
  ".....kccccccccck........",
  "......kccccccllk........",
  "......kccccccllk........",
];

function buildPlayerRows(legs) {
  return [...PLAYER_SIDE_BASE, ...legs];
}

const PLAYER_IDLE = compileSprite(
  buildPlayerRows([
    ".......klll..llk.........",
    "......kllll..lllk........",
    ".....klllll..llllk.......",
    ".....klll....lllk........",
    ".....kuu.....uuk.........",
    "......kuu...uuk..........",
    ".......kuu.uuk...........",
    "........kkkkkk...........",
    ".........kkkk............",
    "..........................",
    "..........................",
  ]),
  PLAYER_PALETTE,
);

const PLAYER_RUN_A = compileSprite(
  buildPlayerRows([
    "......kllll..lllk........",
    ".....klllll...lllk.......",
    "....kllll.....llllk......",
    "...klll........lllk.......",
    "...kuu..........uuk.......",
    "....kuu........uuk........",
    ".....kuu......uuk.........",
    "......kkkk....kkkk........",
    ".......kk......kk.........",
    "..........................",
    "..........................",
  ]),
  PLAYER_PALETTE,
);

const PLAYER_RUN_B = compileSprite(
  buildPlayerRows([
    ".......klll..llllk........",
    "......klllk..llllk........",
    ".....klllll..llllk........",
    ".....klll......lllk.......",
    "......kuu.......uuk.......",
    ".......kuu.....uuk........",
    "........kuu...uuk.........",
    ".........kkkkkkk..........",
    "..........kkkk............",
    "..........................",
    "..........................",
  ]),
  PLAYER_PALETTE,
);

const PLAYER_JUMP = compileSprite(
  buildPlayerRows([
    "......klll....lllk........",
    "......klll....lllk........",
    "......kllll..llllk........",
    ".......kllk..kllk.........",
    "........kku..ukk..........",
    ".........kk..kk...........",
    "..........k..k............",
    "..........................",
    "..........................",
    "..........................",
    "..........................",
  ]),
  PLAYER_PALETTE,
);

const PLAYER_ATTACK = compileSprite(
  buildPlayerRows([
    ".......klll..llk.........",
    "......kllll..lllk........",
    ".....klllll..llllk.......",
    ".....klll....lllk........",
    ".....kuu.....uuk.........",
    "......kuu...uuk..........",
    ".......kuu.uuk...........",
    "........kkkkkk...........",
    ".........kkkk............",
    "..........................",
    "..........................",
  ]),
  PLAYER_PALETTE,
);

const PLAYER_HEAVY = compileSprite(
  buildPlayerRows([
    "......kllll..lllk........",
    ".....klllll...lllk.......",
    "....kllll.....llllk......",
    "...klll........lllk.......",
    "...kuu..........uuk.......",
    "....kuu........uuk........",
    ".....kuu......uuk.........",
    "......kkkk....kkkk........",
    ".......kk......kk.........",
    "..........................",
    "..........................",
  ]),
  PLAYER_PALETTE,
);

const ENEMY_PALETTES = {
  banker_goon: {
    k: "#0a0c12",
    s: "#e2c7a1",
    g: "#1c1e28",
    m: "#6e4a35",
    b: "#244072",
    w: "#e8ecf3",
    n: "#a92d3f",
    t: "#3e4c6b",
    l: "#2d344a",
    u: "#535f7a",
  },
  regulator_drone: {
    k: "#141c2b",
    r: "#f15f70",
    m: "#8b98ab",
    c: "#5f6f88",
    y: "#f7cb79",
  },
  hacker_ninja: {
    k: "#0c1118",
    c: "#2d5d72",
    s: "#c5d9d9",
    g: "#1a222e",
    m: "#6a4a35",
    w: "#ebf6f4",
    n: "#9a3342",
    r: "#68dbc8",
    l: "#171c2a",
    u: "#3a445d",
  },
  exchange_bot: {
    k: "#191423",
    o: "#f2bc8e",
    m: "#7f7390",
    w: "#f5efea",
    n: "#d4626f",
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
    "....kkkkkk....",
    "...kssssssk...",
    "...ksggggsk...",
    "...kssmmssk...",
    "...kssssssk...",
    "..kbbwwnnwbbk.",
    "..kbbbbbbbbbk.",
    "..kbbbbbbbbbk.",
    "..kbbbttttbbk.",
    "..kbbbkkkkbbk.",
    "..kbbbk..kbbk.",
    "..klllk..kllk.",
    "..klllk..kllk.",
    "..kuuuk..kuuk.",
    "..............",
  ],
  regulator_drone: [
    "...mmmmmmmm...",
    "..mrrrrrrrrm..",
    ".mrrrmyyrrrm..",
    ".mrrccccccrrm.",
    ".mrrccccccrrm.",
    "..mccccccccm..",
    "...mcc..ccm...",
    "...m..kk..m...",
  ],
  hacker_ninja: [
    "....kkkkkk....",
    "...kssssssk...",
    "...ksggggsk...",
    "...kssmmssk...",
    "..kccwwnncck..",
    "..kcccccccck..",
    "..kcccccccck..",
    "..kcccrrrcck..",
    "..kcccccccck..",
    "..kccc....ck..",
    "..klll....lk..",
    "..klll....lk..",
    "..kuu....uuk..",
    "..............",
  ],
  exchange_bot: [
    "...mmmmmmmm...",
    "..mmoooooomm..",
    ".mmoowwwwoomm.",
    ".mmoonnnnoomm.",
    ".mmoooooooomm.",
    "..mookkkkoom..",
    "...morrrrom...",
    "...mo....om...",
    "...mo....om...",
  ],
  altcoin_slime: [
    "...kkkkkkkk...",
    "..kggggggggk..",
    ".kggglllldggk.",
    ".kgglldddllgk.",
    ".kgggddddgggk.",
    "..kggggggggk..",
    "...kggggggk...",
    "...k..kk..k...",
  ],
  fud_ghost: [
    "...kkkkkkkk...",
    "..kggggggggk..",
    ".kgggllllgggk.",
    ".kggllddllggk.",
    ".kggggggggggk.",
    ".kgg..gg..ggk.",
    ".kg..gggg..gk.",
    ".k....gg....k.",
  ],
};

const ENEMY_SPRITES = Object.fromEntries(
  Object.entries(ENEMY_ROWS).map(([name, rows]) => [name, compileSprite(rows, ENEMY_PALETTES[name])]),
);

export function drawPlayerSprite(ctx, player, clock) {
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

  const px = Math.round(player.x - (sprite.width - player.w) * 0.5);
  const py = Math.round(player.y - (sprite.height - player.h));

  drawSpriteOutline(ctx, sprite, px + 1, py + 1, "#05060d", flipX);
  drawSpriteOutline(ctx, sprite, px, py, "#dff0ff", flipX);
  drawPixelSprite(ctx, sprite, px, py, { flipX });

  if (player.attackTimer > 0) {
    const weaponLength = player.heavyAttacking ? 28 : 20 + player.comboStep * 5;
    const bladeX = flipX ? px + 7 : px + sprite.width - 7;
    const bladeY = py + 13;
    drawCaneBlade(ctx, bladeX, bladeY, weaponLength, flipX, player.heavyAttacking);
  }
}

export function drawEnemySprite(ctx, enemy, clock) {
  const sprite = ENEMY_SPRITES[enemy.type];
  if (!sprite) {
    return;
  }

  const bob = enemy.mode === "fly" ? Math.round(Math.sin(clock * 18) * 1) : 0;
  const ex = Math.round(enemy.x - (sprite.width - enemy.w) * 0.5);
  const ey = Math.round(enemy.y - (sprite.height - enemy.h)) + bob;
  const flipX = enemy.direction < 0;

  drawSpriteOutline(ctx, sprite, ex + 1, ey + 1, "#04050a", flipX);
  drawSpriteOutline(ctx, sprite, ex, ey, "#d3e5ff", flipX);
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
  harbor: [
    "11111111",
    "12222221",
    "12333221",
    "12344321",
    "12344321",
    "12333221",
    "12222221",
    "11111111",
  ],
  metro: [
    "11111111",
    "12232321",
    "12343431",
    "12232321",
    "12343431",
    "12232321",
    "12343431",
    "11111111",
  ],
  citadel: [
    "11111111",
    "12222221",
    "12444421",
    "12488421",
    "12488421",
    "12444421",
    "12222221",
    "11111111",
  ],
  sky: [
    "11111111",
    "12222221",
    "12333321",
    "12322321",
    "12333321",
    "12222221",
    "12333321",
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
  harbor: {
    1: "#1a2430",
    2: "#38516a",
    3: "#5d7b95",
    4: "#8db1c8",
  },
  metro: {
    1: "#1f1f2b",
    2: "#464a63",
    3: "#69708d",
    4: "#9ca8c5",
  },
  citadel: {
    1: "#271f28",
    2: "#5b4762",
    4: "#9075a1",
    8: "#cbb4d8",
  },
  sky: {
    1: "#182634",
    2: "#36506a",
    3: "#5880a2",
  },
};

const stagePatternMap = {
  stage1: "city_brick",
  stage2: "steel",
  stage3: "jungle",
  stage4: "chart",
  stage5: "glitch",
  stage6: "core",
  stage7: "harbor",
  stage8: "metro",
  stage9: "citadel",
  stage10: "sky",
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

  if (stageId === "stage7") {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#0f1b2d";
    for (let i = 0; i < 14; i += 1) {
      const x = Math.floor((i * 30 - cameraX * 0.95) % (GAME_LOOP_WRAP + 60)) - 25;
      ctx.fillRect(x, GAME_HEIGHT - 22, 14, 22);
      ctx.fillRect(x + 3, GAME_HEIGHT - 36, 8, 13);
    }
    ctx.restore();
  }

  if (stageId === "stage8") {
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#142132";
    for (let i = 0; i < 11; i += 1) {
      const x = Math.floor((i * 36 - cameraX * 1.1) % (GAME_LOOP_WRAP + 84)) - 30;
      ctx.fillRect(x, GAME_HEIGHT - 34, 18, 34);
      ctx.fillStyle = "#21344a";
      ctx.fillRect(x + 2, GAME_HEIGHT - 30, 3, 3);
      ctx.fillRect(x + 8, GAME_HEIGHT - 26, 3, 3);
      ctx.fillStyle = "#142132";
    }
    ctx.restore();
  }

  if (stageId === "stage9") {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#1b1521";
    for (let i = 0; i < 15; i += 1) {
      const x = Math.floor((i * 26 - cameraX * 1.02) % (GAME_LOOP_WRAP + 56)) - 20;
      const h = 18 + (i % 4) * 5;
      ctx.fillRect(x, GAME_HEIGHT - h, 10, h);
      ctx.fillRect(x + 2, GAME_HEIGHT - h - 4, 6, 4);
    }
    ctx.restore();
  }

  if (stageId === "stage10") {
    ctx.save();
    ctx.globalAlpha = 0.24;
    for (let i = 0; i < 20; i += 1) {
      const x = (i * 19 + Math.floor(clock * 30) - Math.floor(cameraX * 0.6)) % (GAME_WIDTH + 40);
      const y = (i * 13 + Math.floor(clock * 16)) % GAME_HEIGHT;
      ctx.fillStyle = i % 2 ? "#91d1ff" : "#cbe9ff";
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
    ctx.restore();
  }
}

const GAME_LOOP_WRAP = 400;
const GAME_HEIGHT = 240;
const GAME_WIDTH = 256;
