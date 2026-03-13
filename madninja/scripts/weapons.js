import { GRAVITY, rectsOverlap } from "./physics.js";

const SUB_WEAPONS = [
  "throwing_bitcoins",
  "blockchain_bomb",
  "lightning_wallet",
  "ledger_laser",
];

const WEAPON_CONFIG = {
  throwing_bitcoins: {
    cost: 20,
    damage: 2,
  },
  blockchain_bomb: {
    cost: 35,
    damage: 4,
    fuse: 0.65,
    radius: 22,
  },
  lightning_wallet: {
    cost: 50,
    damage: 3,
  },
  ledger_laser: {
    cost: 28,
    damage: 2,
  },
};

function solidCollision(projectile, solids) {
  return solids.some((solid) => rectsOverlap(projectile, solid));
}

function hitEnemies(area, enemies, damage, knockbackX, hitsRemaining = 1) {
  let hits = 0;
  for (const enemy of enemies) {
    if (enemy.dead) {
      continue;
    }
    if (rectsOverlap(area, enemy)) {
      enemy.takeDamage(damage, knockbackX);
      hits += 1;
      if (hits >= hitsRemaining) {
        break;
      }
    }
  }
  return hits;
}

export function createWeaponSystem() {
  const state = {
    projectiles: [],
    effects: [],
    enemiesRef: [],
  };

  function cycleSubWeapon(player) {
    const currentIndex = SUB_WEAPONS.indexOf(player.subWeapon);
    const nextIndex = (currentIndex + 1) % SUB_WEAPONS.length;
    player.subWeapon = SUB_WEAPONS[nextIndex];
  }

  function fireSubWeapon(player, damageMultiplier = 1) {
    const config = WEAPON_CONFIG[player.subWeapon];
    if (!config || player.sats < config.cost) {
      return false;
    }

    player.sats -= config.cost;
    const finalDamage = config.damage * damageMultiplier;

    if (player.subWeapon === "throwing_bitcoins") {
      state.projectiles.push({
        type: "coin",
        x: player.x + player.w * 0.5,
        y: player.y + 7,
        w: 6,
        h: 6,
        vx: player.facing * 168,
        vy: -20,
        life: 1.2,
        damage: finalDamage,
        knockback: player.facing * 80,
      });
      return true;
    }

    if (player.subWeapon === "blockchain_bomb") {
      state.projectiles.push({
        type: "bomb",
        x: player.x + player.w * 0.5,
        y: player.y + 8,
        w: 6,
        h: 6,
        vx: player.facing * 90,
        vy: -110,
        life: config.fuse,
        damage: finalDamage,
        radius: config.radius,
        grounded: false,
      });
      return true;
    }

    if (player.subWeapon === "lightning_wallet") {
      const beamWidth = 70;
      const beamX = player.facing > 0 ? player.x + player.w : player.x - beamWidth;
      const beam = {
        x: beamX,
        y: player.y + 5,
        w: beamWidth,
        h: 8,
      };

      state.effects.push({
        type: "beam",
        x: beam.x,
        y: beam.y,
        w: beam.w,
        h: beam.h,
        life: 0.09,
        color: "#fff09e",
      });

      hitEnemies(beam, state.enemiesRef || [], finalDamage, player.facing * 95, 2);
      return true;
    }

    if (player.subWeapon === "ledger_laser") {
      state.projectiles.push({
        type: "laser",
        x: player.facing > 0 ? player.x + player.w : player.x - 12,
        y: player.y + 7,
        w: 12,
        h: 3,
        vx: player.facing * 220,
        vy: 0,
        life: 0.7,
        damage: finalDamage,
        knockback: player.facing * 70,
        pierce: 2,
      });
      return true;
    }

    return false;
  }

  function setEnemyContext(enemies) {
    state.enemiesRef = enemies;
  }

  function update(dt, world, enemies) {
    state.enemiesRef = enemies;

    for (const effect of state.effects) {
      effect.life -= dt;
    }
    state.effects = state.effects.filter((effect) => effect.life > 0);

    const nextProjectiles = [];

    for (const projectile of state.projectiles) {
      projectile.life -= dt;
      if (projectile.life <= 0) {
        if (projectile.type === "bomb") {
          const blast = {
            x: projectile.x - projectile.radius * 0.5,
            y: projectile.y - projectile.radius * 0.5,
            w: projectile.radius,
            h: projectile.radius,
          };
          hitEnemies(blast, enemies, projectile.damage, projectile.vx * 0.7, 99);
          state.effects.push({
            type: "explosion",
            x: blast.x,
            y: blast.y,
            w: blast.w,
            h: blast.h,
            life: 0.15,
            color: "#ff9f5c",
          });
        }
        continue;
      }

      if (projectile.type === "bomb") {
        projectile.vy += GRAVITY * dt * 0.65;
        projectile.vx *= 0.985;
      }

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      if (solidCollision(projectile, world.solids)) {
        if (projectile.type === "bomb") {
          projectile.vx *= -0.2;
          projectile.vy *= -0.25;
          projectile.life = Math.min(projectile.life, 0.12);
          nextProjectiles.push(projectile);
        }
        continue;
      }

      if (
        projectile.x < -32 ||
        projectile.x > world.bounds.w + 32 ||
        projectile.y < -40 ||
        projectile.y > world.bounds.h + 40
      ) {
        continue;
      }

      const hitCount = hitEnemies(
        projectile,
        enemies,
        projectile.damage,
        projectile.knockback || projectile.vx * 0.4,
        projectile.pierce || 1,
      );

      if (hitCount > 0) {
        if (projectile.type === "laser" && projectile.pierce > 1) {
          projectile.pierce -= hitCount;
          if (projectile.pierce > 0) {
            nextProjectiles.push(projectile);
          }
        }
        continue;
      }

      nextProjectiles.push(projectile);
    }

    state.projectiles = nextProjectiles;
  }

  function draw(ctx) {
    for (const projectile of state.projectiles) {
      const px = Math.round(projectile.x);
      const py = Math.round(projectile.y);

      if (projectile.type === "coin") {
        ctx.fillStyle = "#f7c64a";
      } else if (projectile.type === "bomb") {
        ctx.fillStyle = "#ffa152";
      } else {
        ctx.fillStyle = "#9be1ff";
      }
      ctx.fillRect(px, py, projectile.w, projectile.h);
    }

    for (const effect of state.effects) {
      const alpha = Math.max(0.2, effect.life * 4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.fillRect(Math.round(effect.x), Math.round(effect.y), effect.w, effect.h);
      ctx.restore();
    }
  }

  return {
    cycleSubWeapon,
    fireSubWeapon,
    setEnemyContext,
    update,
    draw,
  };
}

export function getSubWeaponList() {
  return [...SUB_WEAPONS];
}
