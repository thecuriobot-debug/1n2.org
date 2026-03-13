import { GRAVITY, rectsOverlap, resolveActorWorld } from "./physics.js";
import { drawEnemySprite } from "./nes_art.js";

const ENEMY_DATA = {
  banker_goon: {
    w: 13,
    h: 18,
    health: 4,
    speed: 25,
    damage: 3,
    color: "#79b7ff",
    mode: "ground",
    aggroRange: 96,
    attackMin: 1.7,
    attackMax: 2.5,
  },
  regulator_drone: {
    w: 12,
    h: 10,
    health: 3,
    speed: 31,
    damage: 2,
    color: "#ff7086",
    mode: "fly",
    amplitude: 8,
    range: 40,
    aggroRange: 116,
    attackMin: 1.5,
    attackMax: 2.3,
  },
  hacker_ninja: {
    w: 12,
    h: 18,
    health: 5,
    speed: 38,
    damage: 3,
    color: "#8cf7da",
    mode: "ground",
    aggroRange: 108,
    attackMin: 1.25,
    attackMax: 2.0,
  },
  exchange_bot: {
    w: 14,
    h: 14,
    health: 6,
    speed: 0,
    damage: 3,
    color: "#ffd4a8",
    mode: "turret",
    aggroRange: 130,
    attackMin: 1.5,
    attackMax: 2.2,
  },
  altcoin_slime: {
    w: 13,
    h: 11,
    health: 3,
    speed: 21,
    damage: 2,
    color: "#96ff6e",
    mode: "hopper",
    aggroRange: 88,
    attackMin: 1.8,
    attackMax: 2.8,
  },
  fud_ghost: {
    w: 10,
    h: 14,
    health: 2,
    speed: 21,
    damage: 2,
    color: "#bfa7ff",
    mode: "ghost",
    aggroRange: 134,
    attackMin: 1.5,
    attackMax: 2.4,
  },
};

let enemyProjectiles = [];
let enemyBursts = [];

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function getEnemyConfig(type) {
  return ENEMY_DATA[type] || ENEMY_DATA.banker_goon;
}

function spawnProjectile(projectile) {
  enemyProjectiles.push({ ...projectile });
}

function spawnBurst(x, y, color) {
  enemyBursts.push({ x, y, life: 0.16, color });
}

function shouldFire(enemy, rangeToPlayer, verticalGap) {
  return enemy.attackTimer <= 0 && rangeToPlayer <= enemy.aggroRange && verticalGap < 38;
}

function fireByType(enemy, player) {
  const centerX = enemy.x + enemy.w * 0.5;
  const centerY = enemy.y + enemy.h * 0.5;
  const playerX = player.x + player.w * 0.5;
  const playerY = player.y + player.h * 0.5;

  const dx = playerX - centerX;
  const dy = playerY - centerY;
  const dirX = Math.sign(dx) || enemy.direction || 1;

  if (enemy.type === "banker_goon") {
    spawnProjectile({
      type: "paperwork",
      x: centerX,
      y: enemy.y + 4,
      w: 5,
      h: 4,
      vx: dirX * 60,
      vy: -84,
      gravity: GRAVITY * 0.5,
      life: 1.8,
      damage: 2,
      color: "#edf4ff",
    });
    spawnBurst(centerX, centerY, "#edf4ff");
    return;
  }

  if (enemy.type === "regulator_drone") {
    const speed = 88;
    const len = Math.hypot(dx, dy) || 1;
    spawnProjectile({
      type: "red_tape",
      x: centerX,
      y: centerY,
      w: 7,
      h: 3,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      life: 1.1,
      damage: 2,
      color: "#ff596f",
      noGravity: true,
    });
    spawnBurst(centerX, centerY, "#ff596f");
    return;
  }

  if (enemy.type === "hacker_ninja") {
    spawnProjectile({
      type: "usb_shuriken",
      x: centerX,
      y: enemy.y + 6,
      w: 5,
      h: 5,
      vx: dirX * 110,
      vy: -10,
      life: 1.0,
      damage: 2,
      color: "#8cf7da",
      noGravity: true,
      spin: 0,
    });
    spawnBurst(centerX, centerY, "#8cf7da");
    return;
  }

  if (enemy.type === "exchange_bot") {
    const speed = 82;
    const len = Math.hypot(dx, dy) || 1;
    spawnProjectile({
      type: "price_chart",
      x: centerX,
      y: centerY,
      w: 6,
      h: 5,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      life: 1.4,
      damage: 2,
      color: "#ffd4a8",
      noGravity: true,
    });
    spawnBurst(centerX, centerY, "#ffd4a8");
    return;
  }

  if (enemy.type === "altcoin_slime") {
    spawnProjectile({
      type: "buzz_blob",
      x: centerX,
      y: enemy.y,
      w: 6,
      h: 6,
      vx: dirX * 52,
      vy: -74,
      gravity: GRAVITY * 0.45,
      life: 1.6,
      damage: 2,
      color: "#96ff6e",
    });
    spawnBurst(centerX, centerY, "#96ff6e");
    return;
  }

  if (enemy.type === "fud_ghost") {
    const speed = 74;
    const len = Math.hypot(dx, dy) || 1;
    spawnProjectile({
      type: "fear_orb",
      x: centerX,
      y: centerY,
      w: 6,
      h: 6,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      life: 1.7,
      damage: 1,
      fear: 1.6,
      color: "#d3b6ff",
      noGravity: true,
      passThroughSolids: true,
    });
    spawnBurst(centerX, centerY, "#d3b6ff");
  }
}

export class Enemy {
  constructor({ type, x, y }) {
    const config = getEnemyConfig(type);

    this.type = type;
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;

    this.w = config.w;
    this.h = config.h;
    this.vx = config.speed;
    this.vy = 0;

    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    this.color = config.color;
    this.mode = config.mode;
    this.aggroRange = config.aggroRange || 100;

    this.direction = 1;
    this.dead = false;
    this.hurtTimer = 0;
    this.touchDamageCooldown = 0;
    this.lastMeleeToken = -1;
    this.clock = 0;

    this.attackMin = config.attackMin || 1.1;
    this.attackMax = config.attackMax || 1.8;
    this.attackTimer = randomRange(this.attackMin * 0.5, this.attackMax);

    this.range = config.range || 26;
    this.amplitude = config.amplitude || 6;

    this.phaseVisible = true;
    this.phaseTimer = randomRange(1.2, 2.0);
    this.dashCooldown = randomRange(1.3, 1.9);

    this.onGround = false;
    this.touchingLeft = false;
    this.touchingRight = false;
    this.hitCeiling = false;

    this.fellOut = false;
    this.deathBurstSpawned = false;
  }

  update(dt, world, player) {
    if (this.dead) {
      if (!this.deathBurstSpawned) {
        this.deathBurstSpawned = true;
        spawnBurst(this.x + this.w * 0.5, this.y + this.h * 0.5, this.color);
      }
      return;
    }

    this.clock += dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.touchDamageCooldown = Math.max(0, this.touchDamageCooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    const dx = (player.x + player.w * 0.5) - (this.x + this.w * 0.5);
    const dy = (player.y + player.h * 0.5) - (this.y + this.h * 0.5);
    const rangeToPlayer = Math.abs(dx);

    if (this.mode === "fly") {
      this.updateFlying(dt, dx, dy);
    } else if (this.mode === "ghost") {
      this.updateGhost(dt, dx, dy);
    } else if (this.mode === "turret") {
      this.vx = 0;
      this.direction = Math.sign(dx) || this.direction;
    } else if (this.mode === "hopper") {
      this.updateHopper(dx);
      this.vy += GRAVITY * dt;
      this.vy = Math.min(this.vy, 260);
      resolveActorWorld(this, world, dt);
      if (this.touchingLeft || this.touchingRight) {
        this.direction *= -1;
      }
    } else {
      this.updateGroundChase(dx);
      this.vy += GRAVITY * dt;
      this.vy = Math.min(this.vy, 260);
      resolveActorWorld(this, world, dt);
      if (this.touchingLeft || this.touchingRight) {
        this.direction *= -1;
      }
    }

    if (this.mode === "ground" || this.mode === "hopper") {
      if (this.onGround) {
        const probeX = this.direction > 0 ? this.x + this.w + 2 : this.x - 2;
        const probe = { x: probeX, y: this.y + this.h + 1, w: 1, h: 1 };
        const hasFloorAhead = world.solids.some((solid) => rectsOverlap(probe, solid));
        if (!hasFloorAhead) {
          this.direction *= -1;
        }
      }
    }

    if (this.fellOut) {
      this.dead = true;
    }

    const verticalGap = Math.abs(dy);
    if (shouldFire(this, rangeToPlayer, verticalGap)) {
      if (this.mode !== "ghost" || this.phaseVisible) {
        fireByType(this, player);
      }
      this.attackTimer = randomRange(this.attackMin, this.attackMax);
    }
  }

  updateGroundChase(dx) {
    if (Math.abs(dx) < this.aggroRange) {
      this.direction = Math.sign(dx) || this.direction;
    }

    if (this.type === "hacker_ninja" && this.onGround && Math.abs(dx) < 54 && this.dashCooldown <= 0) {
      this.vx = this.direction * (this.speed + 36);
      this.dashCooldown = randomRange(1.5, 2.3);
      return;
    }

    this.vx = this.speed * this.direction;
    if (Math.abs(dx) > this.aggroRange * 1.4) {
      this.vx *= 0.6;
    }

    if (this.hurtTimer > 0) {
      this.vx *= 0.45;
    }

  }

  updateFlying(dt, dx, dy) {
    this.direction = Math.sign(dx) || this.direction;
    this.x += this.speed * this.direction * dt;
    if (this.x > this.baseX + this.range) {
      this.direction = -1;
    }
    if (this.x < this.baseX - this.range) {
      this.direction = 1;
    }

    this.y = this.baseY + Math.sin(this.clock * 5.2) * this.amplitude + Math.sin(dy * 0.02) * 2;
  }

  updateGhost(dt, dx, dy) {
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) {
      this.phaseVisible = !this.phaseVisible;
      this.phaseTimer = this.phaseVisible ? randomRange(1.0, 1.4) : randomRange(0.55, 0.95);
    }

    if (!this.phaseVisible) {
      this.y = this.baseY + Math.sin(this.clock * 4.2) * (this.amplitude + 3);
      return;
    }

    const len = Math.hypot(dx, dy) || 1;
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * 0.35 * dt;
    this.y = this.baseY + Math.sin(this.clock * 3.7) * this.amplitude;
  }

  updateHopper(dx) {
    this.direction = Math.sign(dx) || this.direction;

    if (this.onGround && Math.sin(this.clock * 4.4) > 0.88) {
      this.vy = -136;
      this.vx = this.direction * this.speed * 0.95;
    }

    if (!this.onGround) {
      this.vx = this.direction * this.speed;
    } else {
      this.vx *= 0.85;
    }

  }

  tryMeleeHit(attack, attackToken, facingDirection) {
    if (this.dead || this.hurtTimer > 0 || !attack) {
      return false;
    }

    if (this.mode === "ghost" && !this.phaseVisible) {
      return false;
    }

    if (attackToken === this.lastMeleeToken) {
      return false;
    }

    if (!rectsOverlap(attack, this)) {
      return false;
    }

    this.lastMeleeToken = attackToken;
    this.takeDamage(attack.damage || 2, (attack.knockback || 90) * facingDirection);
    return true;
  }

  takeDamage(amount, knockbackX) {
    this.health -= amount;
    this.hurtTimer = 0.22;
    this.vx = knockbackX;
    this.vy = -84;

    if (this.health <= 0) {
      this.dead = true;
    }
  }

  collidesWithPlayer(player) {
    if (this.dead) {
      return false;
    }
    if (this.mode === "ghost" && !this.phaseVisible) {
      return false;
    }
    return rectsOverlap(this, player);
  }

  draw(ctx) {
    if (this.dead) {
      return;
    }

    const isBlinking = this.hurtTimer > 0 && Math.floor(this.hurtTimer * 32) % 2 === 0;
    if (isBlinking) {
      return;
    }

    if (this.mode === "ghost") {
      ctx.save();
      const baseAlpha = this.phaseVisible ? 0.65 : 0.28;
      ctx.globalAlpha = baseAlpha + Math.sin(this.clock * 6) * 0.12;
      drawEnemySprite(ctx, this, this.clock);
      ctx.restore();
      return;
    }

    drawEnemySprite(ctx, this, this.clock);
  }
}

function updateEnemyProjectiles(dt, world, player) {
  const next = [];

  for (const projectile of enemyProjectiles) {
    projectile.life -= dt;
    if (projectile.life <= 0) {
      continue;
    }

    if (!projectile.noGravity) {
      projectile.vy += (projectile.gravity || 0) * dt;
    }

    if (projectile.type === "usb_shuriken") {
      projectile.spin = (projectile.spin || 0) + dt * 20;
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (!projectile.passThroughSolids) {
      const hitSolid = world.solids.some((solid) => rectsOverlap(projectile, solid));
      if (hitSolid) {
        spawnBurst(projectile.x, projectile.y, projectile.color);
        continue;
      }
    }

    if (rectsOverlap(projectile, player)) {
      player.takeDamage(projectile.damage || 2, projectile.x);
      if (projectile.fear && typeof player.applyFear === "function") {
        player.applyFear(projectile.fear);
      }
      spawnBurst(projectile.x, projectile.y, projectile.color);
      continue;
    }

    if (
      projectile.x < -20 ||
      projectile.x > world.bounds.w + 20 ||
      projectile.y < -30 ||
      projectile.y > world.bounds.h + 30
    ) {
      continue;
    }

    next.push(projectile);
  }

  enemyProjectiles = next;
}

function updateBursts(dt) {
  for (const burst of enemyBursts) {
    burst.life -= dt;
  }
  enemyBursts = enemyBursts.filter((burst) => burst.life > 0);
}

export function createEnemies(spawns) {
  enemyProjectiles = [];
  enemyBursts = [];
  return (spawns || []).map((spawn) => new Enemy(spawn));
}

export function updateEnemies(enemies, dt, world, player) {
  for (const enemy of enemies) {
    enemy.update(dt, world, player);

    if (enemy.collidesWithPlayer(player) && enemy.touchDamageCooldown <= 0) {
      enemy.touchDamageCooldown = 0.75;
      player.takeDamage(enemy.damage, enemy.x + enemy.w * 0.5);
    }
  }

  updateEnemyProjectiles(dt, world, player);
  updateBursts(dt);
}

function drawEnemyProjectiles(ctx) {
  for (const projectile of enemyProjectiles) {
    const px = Math.round(projectile.x);
    const py = Math.round(projectile.y);

    ctx.fillStyle = "#111";
    ctx.fillRect(px - 1, py - 1, projectile.w + 2, projectile.h + 2);

    ctx.fillStyle = projectile.color;

    if (projectile.type === "price_chart") {
      ctx.fillRect(px, py + 2, projectile.w, projectile.h - 2);
      ctx.fillRect(px + 1, py, projectile.w - 2, 2);
      continue;
    }

    if (projectile.type === "fear_orb") {
      ctx.save();
      ctx.globalAlpha = 0.75 + Math.sin(projectile.life * 20) * 0.2;
      ctx.fillRect(px, py, projectile.w, projectile.h);
      ctx.restore();
      continue;
    }

    if (projectile.type === "usb_shuriken") {
      ctx.fillRect(px + 2, py, 1, projectile.h);
      ctx.fillRect(px, py + 2, projectile.w, 1);
      continue;
    }

    ctx.fillRect(px, py, projectile.w, projectile.h);
  }
}

function drawBursts(ctx) {
  for (const burst of enemyBursts) {
    const size = Math.max(1, Math.ceil(burst.life * 8));
    ctx.fillStyle = burst.color;
    const bx = Math.round(burst.x - size * 0.5);
    const by = Math.round(burst.y - size * 0.5);
    ctx.fillRect(bx, by, size, size);
  }
}

export function drawEnemies(enemies, ctx) {
  for (const enemy of enemies) {
    enemy.draw(ctx);
  }
  drawEnemyProjectiles(ctx);
  drawBursts(ctx);
}

export function cleanupEnemies(enemies) {
  return enemies.filter((enemy) => !enemy.dead);
}
