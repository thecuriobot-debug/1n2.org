export const GRAVITY = 520;

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function isActorInClimbZone(actor, climbZones) {
  const probe = {
    x: actor.x + actor.w * 0.5,
    y: actor.y + actor.h * 0.5,
    w: 1,
    h: 1,
  };
  return climbZones.some((zone) => rectsOverlap(probe, zone));
}

export function resolveActorWorld(actor, world, dt) {
  const solids = world.solids;
  const bounds = world.bounds;

  actor.onGround = false;
  actor.touchingLeft = false;
  actor.touchingRight = false;
  actor.hitCeiling = false;

  actor.x += actor.vx * dt;

  for (const solid of solids) {
    if (solid.oneWay) {
      continue;
    }

    if (!rectsOverlap(actor, solid)) {
      continue;
    }

    if (actor.vx > 0) {
      actor.x = solid.x - actor.w;
      actor.touchingRight = true;
    } else if (actor.vx < 0) {
      actor.x = solid.x + solid.w;
      actor.touchingLeft = true;
    }
    actor.vx = 0;
  }

  const previousBottom = actor.y + actor.h;
  actor.y += actor.vy * dt;

  for (const solid of solids) {
    const horizontalOverlap = actor.x + actor.w > solid.x && actor.x < solid.x + solid.w;
    if (!horizontalOverlap) {
      continue;
    }

    if (solid.oneWay) {
      const crossingTop = previousBottom <= solid.y + (solid.oneWayMargin || 0);
      const touchingTop = actor.y + actor.h >= solid.y;
      if (actor.vy > 0 && crossingTop && touchingTop) {
        actor.y = solid.y - actor.h;
        actor.onGround = true;
        actor.vy = 0;
      }
      continue;
    }

    if (!rectsOverlap(actor, solid)) {
      continue;
    }

    if (actor.vy > 0) {
      actor.y = solid.y - actor.h;
      actor.onGround = true;
    } else if (actor.vy < 0) {
      actor.y = solid.y + solid.h;
      actor.hitCeiling = true;
    }
    actor.vy = 0;
  }

  if (bounds) {
    if (actor.x < bounds.x) {
      actor.x = bounds.x;
      actor.touchingLeft = true;
      actor.vx = 0;
    }

    if (actor.x + actor.w > bounds.x + bounds.w) {
      actor.x = bounds.x + bounds.w - actor.w;
      actor.touchingRight = true;
      actor.vx = 0;
    }

    if (actor.y < bounds.y) {
      actor.y = bounds.y;
      actor.hitCeiling = true;
      actor.vy = 0;
    }

    if (actor.y > bounds.y + bounds.h + 24) {
      actor.fellOut = true;
    }
  }
}

export function makeHitbox(x, y, w, h) {
  return { x, y, w, h };
}
