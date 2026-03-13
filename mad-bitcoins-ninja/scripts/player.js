import { GRAVITY, isActorInClimbZone, makeHitbox, resolveActorWorld } from "./physics.js";
import { drawPlayerSprite } from "./nes_art.js";

const MAX_FALL_SPEED = 250;

function approach(value, target, maxDelta) {
  if (value < target) {
    return Math.min(value + maxDelta, target);
  }
  if (value > target) {
    return Math.max(value - maxDelta, target);
  }
  return target;
}

export class Player {
  constructor(spawn) {
    this.spawn = { ...spawn };

    this.x = spawn.x;
    this.y = spawn.y;
    this.w = 12;
    this.h = 20;

    this.vx = 0;
    this.vy = 0;

    this.baseWalkSpeed = 74;
    this.baseRunSpeed = 112;
    this.walkSpeed = this.baseWalkSpeed;
    this.runSpeed = this.baseRunSpeed;
    this.groundAccel = 650;
    this.airAccel = 380;
    this.groundFriction = 720;

    this.jumpSpeed = 178;
    this.wallJumpX = 128;
    this.wallJumpY = 176;
    this.wallSlideSpeed = 48;
    this.climbSpeed = 54;
    this.climbLateral = 38;

    this.onGround = false;
    this.touchingLeft = false;
    this.touchingRight = false;
    this.hitCeiling = false;

    this.facing = 1;
    this.state = "idle";

    this.coyoteTimeMax = 0.1;
    this.coyoteTime = 0;
    this.wallSlideSide = 0;
    this.wallJumpLock = 0;

    this.maxHealth = 24;
    this.health = this.maxHealth;
    this.invulnTimer = 0;
    this.lives = 3;

    this.sats = 320;
    this.extraLifeThreshold = 1000;
    this.totalSatsCollected = 0;

    this.subWeapon = "throwing_bitcoins";

    this.attackToken = 0;
    this.attackTimer = 0;
    this.attackQueued = false;
    this.comboStep = 0;
    this.comboWindow = 0;
    this.comboWindowMax = 0.22;
    this.attackRecovery = 0;
    this.currentAttack = null;

    this.heavyAttacking = false;
    this.heavyCooldown = 0;

    this.attackChain = [
      { duration: 0.12, w: 14, h: 10, y: 6, damage: 2, knockback: 88 },
      { duration: 0.15, w: 18, h: 10, y: 6, damage: 2.8, knockback: 102 },
      { duration: 0.18, w: 22, h: 11, y: 5, damage: 4.2, knockback: 122 },
    ];

    this.heavyAttack = {
      duration: 0.28,
      w: 26,
      h: 14,
      y: 4,
      damage: 6.5,
      knockback: 150,
    };

    this.subCooldown = 0;
    this.swapCooldown = 0;
    this.externalInvulnerable = false;
    this.damageMultiplier = 1;

    this.fearTimer = 0;
    this.isClimbing = false;
    this.fellOut = false;
    this.gameOver = false;

    this.damagePulse = false;
  }

  update(dt, input, world, weaponSystem) {
    if (this.gameOver) {
      this.state = "death animation";
      return;
    }

    const wasAttacking = this.attackTimer > 0;

    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackRecovery = Math.max(0, this.attackRecovery - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.heavyCooldown = Math.max(0, this.heavyCooldown - dt);
    this.subCooldown = Math.max(0, this.subCooldown - dt);
    this.swapCooldown = Math.max(0, this.swapCooldown - dt);
    this.wallJumpLock = Math.max(0, this.wallJumpLock - dt);
    this.fearTimer = Math.max(0, this.fearTimer - dt);

    if (wasAttacking && this.attackTimer <= 0) {
      this.onAttackEnded();
    }

    if (this.comboWindow <= 0 && this.attackTimer <= 0 && !this.attackQueued) {
      this.comboStep = 0;
    }

    if (this.onGround) {
      this.coyoteTime = this.coyoteTimeMax;
    } else {
      this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    }

    const left = input.isDown("left");
    const right = input.isDown("right");
    const up = input.isDown("up");
    const down = input.isDown("down");
    const jumpPressed = input.pressed("jump");
    const jumpReleased = input.released("jump");

    const fearActive = this.fearTimer > 0;
    const controlFlip = fearActive ? -1 : 1;
    const controlPenalty = fearActive ? 0.76 : 1;

    const axisX = ((right ? 1 : 0) - (left ? 1 : 0)) * controlFlip;
    const axisY = (down ? 1 : 0) - (up ? 1 : 0);

    if (axisX !== 0) {
      this.facing = axisX > 0 ? 1 : -1;
    }

    const inClimbZone = isActorInClimbZone(this, world.climbZones);
    if (!inClimbZone) {
      this.isClimbing = false;
    }

    if (inClimbZone && (up || down) && !this.onGround && this.attackTimer <= 0) {
      this.isClimbing = true;
    }

    if (jumpPressed && this.isClimbing) {
      this.isClimbing = false;
      this.vy = -this.jumpSpeed;
    }

    if (input.pressed("heavy") && this.canStartAttack()) {
      this.startHeavyAttack();
    }

    if (input.pressed("attack")) {
      this.handleAttackInput();
    }

    if (input.pressed("sub") && this.subCooldown <= 0 && this.attackTimer <= 0) {
      weaponSystem.fireSubWeapon(this, this.damageMultiplier);
      this.subCooldown = 0.18;
    }

    if (input.pressed("cycle") && this.swapCooldown <= 0) {
      weaponSystem.cycleSubWeapon(this);
      this.swapCooldown = 0.2;
    }

    if (this.isClimbing) {
      this.vx = axisX * this.climbLateral * controlPenalty;
      this.vy = axisY * this.climbSpeed;
    } else {
      if (this.wallJumpLock <= 0) {
        const topSpeed = (input.isDown("run") ? this.runSpeed : this.walkSpeed) * controlPenalty;
        const targetVx = axisX * topSpeed;
        const accel = this.onGround ? this.groundAccel : this.airAccel;
        this.vx = approach(this.vx, targetVx, accel * dt);
      }

      if (axisX === 0 && this.onGround) {
        this.vx = approach(this.vx, 0, this.groundFriction * dt);
      }

      if (this.attackTimer > 0 && this.onGround) {
        this.vx *= 0.86;
      }

      this.vy += GRAVITY * dt;
      this.vy = Math.min(this.vy, MAX_FALL_SPEED);

      if (jumpPressed) {
        if (this.onGround || this.coyoteTime > 0) {
          this.vy = -this.jumpSpeed;
          this.onGround = false;
          this.coyoteTime = 0;
        } else if (this.wallSlideSide !== 0) {
          this.vy = -this.wallJumpY;
          this.vx = -this.wallSlideSide * this.wallJumpX;
          this.wallJumpLock = 0.12;
          this.wallSlideSide = 0;
        }
      }

      if (jumpReleased && this.vy < -72) {
        this.vy *= 0.55;
      }
    }

    resolveActorWorld(this, world, dt);

    const slidingLeft = this.touchingLeft && left;
    const slidingRight = this.touchingRight && right;
    const shouldWallSlide =
      !this.onGround &&
      !this.isClimbing &&
      this.vy > 0 &&
      (slidingLeft || slidingRight) &&
      this.attackTimer <= 0;

    this.wallSlideSide = 0;
    if (shouldWallSlide) {
      this.wallSlideSide = slidingLeft ? -1 : 1;
      this.vy = Math.min(this.vy, this.wallSlideSpeed);
    }

    if (this.fellOut) {
      this.health = 0;
      this.loseLife();
      this.fellOut = false;
    }

    this.updateAnimationState();
  }

  canStartAttack() {
    return this.attackTimer <= 0 && this.attackRecovery <= 0 && !this.isClimbing;
  }

  handleAttackInput() {
    if (this.heavyAttacking) {
      return;
    }

    if (this.attackTimer > 0) {
      if (this.comboStep < this.attackChain.length) {
        this.attackQueued = true;
      }
      return;
    }

    if (this.attackRecovery > 0) {
      return;
    }

    const nextStep = this.comboWindow > 0 ? Math.min(this.comboStep + 1, this.attackChain.length) : 1;
    this.startComboAttack(nextStep);
  }

  startComboAttack(step) {
    this.comboStep = step;
    const frame = this.attackChain[step - 1] || this.attackChain[0];
    this.currentAttack = frame;
    this.attackTimer = frame.duration;
    this.attackToken += 1;
    this.attackQueued = false;
    this.comboWindow = 0;
    this.heavyAttacking = false;
  }

  startHeavyAttack() {
    if (this.heavyCooldown > 0) {
      return;
    }

    this.heavyAttacking = true;
    this.currentAttack = this.heavyAttack;
    this.attackTimer = this.heavyAttack.duration;
    this.attackToken += 1;
    this.attackQueued = false;
    this.comboStep = 0;
    this.comboWindow = 0;
    this.heavyCooldown = 0.8;
    this.vx *= 0.5;
  }

  onAttackEnded() {
    if (this.heavyAttacking) {
      this.heavyAttacking = false;
      this.currentAttack = null;
      this.attackRecovery = 0.08;
      return;
    }

    if (this.attackQueued && this.comboStep < this.attackChain.length) {
      this.attackQueued = false;
      this.startComboAttack(this.comboStep + 1);
      return;
    }

    this.currentAttack = null;
    this.attackQueued = false;
    this.attackRecovery = 0.05;

    if (this.comboStep >= this.attackChain.length) {
      this.comboStep = 0;
      this.comboWindow = 0;
    } else {
      this.comboWindow = this.comboWindowMax;
    }
  }

  getAttackHitbox() {
    if (this.attackTimer <= 0 || !this.currentAttack) {
      return null;
    }

    const data = this.currentAttack;
    const width = data.w;
    const height = data.h;
    const x = this.facing > 0 ? this.x + this.w - 2 : this.x - width + 2;
    const y = this.y + data.y;

    return {
      ...makeHitbox(x, y, width, height),
      damage: data.damage * this.damageMultiplier,
      knockback: data.knockback,
    };
  }

  applyFear(duration) {
    this.fearTimer = Math.max(this.fearTimer, duration);
  }

  consumeDamagePulse() {
    if (!this.damagePulse) {
      return false;
    }
    this.damagePulse = false;
    return true;
  }

  takeDamage(amount, sourceX) {
    if (this.invulnTimer > 0 || this.gameOver || this.externalInvulnerable) {
      return;
    }

    this.health -= amount;
    this.invulnTimer = 0.65;
    this.damagePulse = true;

    const knockDirection = sourceX > this.x ? -1 : 1;
    this.vx = knockDirection * 110;
    this.vy = -126;

    if (this.health <= 0) {
      this.loseLife();
    }
  }

  addSats(amount) {
    this.sats += amount;
    this.totalSatsCollected += amount;

    if (this.totalSatsCollected >= this.extraLifeThreshold) {
      this.totalSatsCollected -= this.extraLifeThreshold;
      this.lives += 1;
    }
  }

  loseLife() {
    this.lives -= 1;

    if (this.lives < 1) {
      this.gameOver = true;
      this.lives = 0;
      return;
    }

    this.health = this.maxHealth;
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.attackTimer = 0;
    this.attackQueued = false;
    this.comboStep = 0;
    this.comboWindow = 0;
    this.currentAttack = null;
    this.heavyAttacking = false;
    this.fearTimer = 0;
    this.isClimbing = false;
    this.wallSlideSide = 0;
    this.invulnTimer = 1;
  }

  updateAnimationState() {
    if (this.gameOver) {
      this.state = "death animation";
      return;
    }

    if (this.invulnTimer > 0 && this.health > 0) {
      this.state = "damage reaction";
      return;
    }

    if (this.attackTimer > 0) {
      this.state = this.onGround ? "attack ground" : "attack air";
      return;
    }

    if (this.isClimbing) {
      this.state = "climb certain surfaces";
      return;
    }

    if (this.wallSlideSide !== 0) {
      this.state = "wall cling";
      return;
    }

    if (!this.onGround) {
      this.state = this.vy < 0 ? "jump" : "fall";
      return;
    }

    const speed = Math.abs(this.vx);
    if (speed > this.walkSpeed * 0.75) {
      this.state = "run";
    } else if (speed > 8) {
      this.state = "walk";
    } else {
      this.state = "idle";
    }
  }

  draw(ctx) {
    if (this.gameOver) {
      ctx.fillStyle = "#6f6f6f";
      ctx.fillRect(this.x, this.y + this.h - 4, this.w, 4);
      return;
    }

    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) {
      return;
    }

    if (this.fearTimer > 0) {
      ctx.fillStyle = "rgba(199,157,255,0.35)";
      ctx.fillRect(Math.round(this.x) - 3, Math.round(this.y) - 4, this.w + 6, this.h + 8);
    }

    drawPlayerSprite(ctx, this, performance.now() / 1000);
  }
}
