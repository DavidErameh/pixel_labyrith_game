// ============================================================
// entities.js — Player, Enemy, and Item classes
// ============================================================

// ── PLAYER ─────────────────────────────────────────────────
class Player {
  constructor(r, c, playerClass = 'knight') {
    this.r = r; this.c = c;
    this.visX = c * C.TILE;
    this.visY = r * C.TILE;
    this.walkPhase = 0;
    this.isMoving = false;
    this.playerClass = playerClass;

    // HP — class dependent
    if (playerClass === 'wizard') {
      this.maxHp = C.WIZARD_MAX_HP;
      this.hp    = C.WIZARD_MAX_HP;
    } else {
      this.maxHp = C.KNIGHT_MAX_HP;
      this.hp    = C.KNIGHT_MAX_HP;
    }

    this.keys = 0;
    this.score = 0;
    this.kills = { slime: 0, black_knight: 0, ghost: 0, dark_champion: 0, spider: 0, boss: 0 };
    this.frame = 0;
    this.animTimer = 0;
    this.moveDelay = C.PLAYER_MOVE_DELAY;
    this.lastMove = 0;
    this.dir = 'down';
    this.alive = true;
    this.invincible = false;
    this.invincibleTimer = 0;

    // ── Knight: physical shield (hold-to-block) ───────────────
    this.shieldActive = false;
    this.shieldHits   = C.KNIGHT_SHIELD_HITS;
    this.shieldCooldown = 0;
    this.shieldHeld   = false; // true while Shift is held down

    // ── Wizard: MP + arcane barrier ──────────────────────────
    this.mp    = playerClass === 'wizard' ? C.WIZARD_MAX_MP : 0;
    this.maxMp = playerClass === 'wizard' ? C.WIZARD_MAX_MP : 0;
    this.mpRegenAccum = 0;

    // Wizard barrier
    this.barrierActive   = false;
    this.barrierHits     = C.WIZARD_BARRIER_HITS;
    this.barrierCooldown = 0;
    this.barrierHeld     = false; // true while Shift is held

    this.rootedTimer = 0;

    this.gemsThisFloor = 0;
    this.killsThisFloor = 0;
    this.effects   = [];   // { type, r, c, frame, text, color }
    this.slashes   = [];   // { r, c, dir, timer, duration, isPower, isFire }
    this.clashes   = [];   // { r, c, timer, duration, isPower, isFire }
    this.particles = []; // { x, y, vx, vy, color, size, life, maxLife }
    this.attackTimer   = 0;
    this.attackCooldown = 0;
    this.attackDash = null; // { dr, dc, timer, duration }

    // Fire Burst cooldown (wizard only)
    this.fireBurstCooldown = 0;

    // Chest Power-ups
    this.flameSwordHits = 0;   // Knight: 6 instant-kill flame hits
    this.manaBoostTimer = 0;   // Wizard: double MP for 60s
    this.spellCharges   = 0;   // Wizard: 5-7 instant-kill lightning/light charges
    this.spellType      = null; // 'lightning' | 'light'
  }

  get dmg() {
    return this.playerClass === 'wizard' ? C.WIZARD_DMG : C.KNIGHT_DMG;
  }

  get speed() { return this.moveDelay; }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 150) { this.frame++; this.animTimer = 0; }

    // Smooth visual interpolation between tiles
    const targetX = this.c * C.TILE;
    const targetY = this.r * C.TILE;
    const lerp = 1 - Math.exp(-20 * dt / 1000);
    this.visX += (targetX - this.visX) * lerp;
    this.visY += (targetY - this.visY) * lerp;
    if (Math.abs(targetX - this.visX) < 0.3) this.visX = targetX;
    if (Math.abs(targetY - this.visY) < 0.3) this.visY = targetY;

    const movingNow = Math.abs(targetX - this.visX) > 0.5 || Math.abs(targetY - this.visY) > 0.5;
    if (movingNow) {
      this.isMoving = true;
      this.walkPhase += (dt / 1000) * 16;
    } else {
      this.isMoving = false;
      this.walkPhase = 0;
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // Knight: shield cd
    if (this.shieldCooldown > 0) {
      this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    }

    // Knight: hold-to-block — shieldActive driven by shieldHeld
    if (this.playerClass === 'knight') {
      if (this.shieldHeld && this.shieldCooldown <= 0 && this.shieldHits > 0) {
        this.shieldActive = true;
      } else if (!this.shieldHeld) {
        this.shieldActive = false;
      }
    }

    // Wizard: barrier cd + hold
    if (this.playerClass === 'wizard') {
      if (this.barrierCooldown > 0) {
        this.barrierCooldown = Math.max(0, this.barrierCooldown - dt);
      }
      if (this.barrierHeld && this.barrierCooldown <= 0 && this.barrierHits > 0 && this.mp >= C.WIZARD_BARRIER_COST) {
        if (!this.barrierActive) {
          this.mp -= C.WIZARD_BARRIER_COST;
          this.barrierActive = true;
        }
      } else if (!this.barrierHeld) {
        this.barrierActive = false;
      }
      if (this.fireBurstCooldown > 0) {
        this.fireBurstCooldown = Math.max(0, this.fireBurstCooldown - dt);
      }

      // MP passive regen
      this.mpRegenAccum += dt;
      const regenMs = 1000 / C.WIZARD_MP_REGEN;
      while (this.mpRegenAccum >= regenMs) {
        this.mpRegenAccum -= regenMs;
        if (this.mp < this.maxMp) this.mp = Math.min(this.maxMp, this.mp + 1);
      }

      // Mana boost countdown
      if (this.manaBoostTimer > 0) {
        this.manaBoostTimer = Math.max(0, this.manaBoostTimer - dt);
        if (this.manaBoostTimer <= 0) {
          this.maxMp = C.WIZARD_MAX_MP;
          this.mp = Math.min(this.mp, this.maxMp);
        }
      }
    }

    if (this.rootedTimer > 0) {
      this.rootedTimer = Math.max(0, this.rootedTimer - dt);
    }

    if (this.attackDash) {
      this.attackDash.timer += dt;
      if (this.attackDash.timer >= this.attackDash.duration) {
        this.attackDash = null;
      }
    }

    if (this.attackTimer > 0) this.attackTimer = Math.max(0, this.attackTimer - dt);
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Update slashes & clashes
    this.slashes.forEach(s => { s.timer += dt; });
    this.slashes = this.slashes.filter(s => s.timer < s.duration);
    this.clashes.forEach(cl => { cl.timer += dt; });
    this.clashes = this.clashes.filter(cl => cl.timer < cl.duration);

    // Update particles
    this.particles.forEach(pt => {
      pt.x += pt.vx * (dt / 16);
      pt.y += pt.vy * (dt / 16);
      pt.life += dt;
    });
    this.particles = this.particles.filter(pt => pt.life < pt.maxLife);

    // Update effects
    this.effects = this.effects.filter(e => e.frame < 14);
    this.effects.forEach(e => e.frame++);
  }

  takeDamage(dmg) {
    if (this.invincible) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invincible = true;
    this.invincibleTimer = 650;
    if (this.hp <= 0) this.alive = false;
    return true;
  }

  // Knight hold-to-block helpers
  startHoldShield() {
    if (this.playerClass !== 'knight') {
      // Wizard: Arcane Barrier hold
      this.barrierHeld = true;
      return;
    }
    this.shieldHeld = true;
  }

  stopHoldShield() {
    this.shieldHeld = false;
    this.barrierHeld = false;
  }

  // Legacy toggle for keyboard-only flow (space)
  toggleShield() {
    if (this.playerClass === 'wizard') {
      this.barrierHeld = !this.barrierHeld;
      return true;
    }
    if (this.shieldCooldown > 0) return false;
    this.shieldHeld = !this.shieldHeld;
    return true;
  }

  absorbShieldHit() {
    // Knight
    if (this.playerClass === 'knight' && this.shieldActive) {
      this.shieldHits--;
      if (this.shieldHits <= 0) {
        this.shieldActive = false;
        this.shieldHeld   = false;
        this.shieldCooldown = C.SHIELD_COOLDOWN;
        this.shieldHits = C.KNIGHT_SHIELD_HITS;
        return 'broken';
      }
      return 'blocked';
    }
    // Wizard barrier
    if (this.playerClass === 'wizard' && this.barrierActive) {
      this.barrierHits--;
      if (this.barrierHits <= 0) {
        this.barrierActive = false;
        this.barrierHeld   = false;
        this.barrierCooldown = C.WIZARD_BARRIER_COOLDOWN;
        this.barrierHits = C.WIZARD_BARRIER_HITS;
        return 'broken';
      }
      return 'blocked';
    }
    return false;
  }

  isBlocking() {
    return (this.playerClass === 'knight' && this.shieldActive) ||
           (this.playerClass === 'wizard' && this.barrierActive);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  gainMp(amount) {
    if (this.playerClass !== 'wizard') return;
    this.mp = Math.min(this.maxMp, this.mp + amount);
  }

  addEffect(type, r, c, text = '', color = '#ffd700') {
    this.effects.push({ type, r, c, frame: 0, text, color });
  }

  spawnParticles(wx, wy, color, count = 8, speed = 2.5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.8) * speed;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 2 + Math.floor(Math.random() * 3),
        life: 0,
        maxLife: 220 + Math.random() * 180,
      });
    }
  }
}

// ── BASE ENEMY ─────────────────────────────────────────────
class Enemy {
  constructor(type, r, c, floor) {
    this.type = type;
    this.r = r; this.c = c;
    this.visX = c * C.TILE;
    this.visY = r * C.TILE;
    this.walkPhase = 0;
    this.isMoving = false;
    this.alive = true;
    this.frame = 0;
    this.animTimer = 0;
    this.moveTimer = 0;

    const base = C.ENEMIES[type];
    const floorMult = 1 + (floor - 1) * 0.3;
    this.maxHp = Math.round(base.hp * floorMult);
    this.hp = this.maxHp;
    this.dmg = Math.round(base.dmg * (1 + (floor - 1) * 0.2));
    this.baseMoveInterval = Math.round(1000 / base.speed);
    this.moveInterval = this.baseMoveInterval;
    this.xp = base.xp;
    this.color = base.color;
    this.aggroRange = type === 'ghost' ? 8 : 5;
    this.isAggro = false;
    this.lastPlayerPos = null;
    this.stunTimer = 0;
    this.burnTimer = 0;
    this.hitFlashTimer = 0;
    this.attackDash = null;
    this.attackCooldown = 0;
    this.boltCooldown = 1200 + Math.floor(Math.random() * 1000);
    this.hasKey = false;
  }

  update(dt, player, grid, rows, cols, onHitPlayer, onShootBolt) {
    if (!this.alive) return;
    this.animTimer += dt;
    if (this.animTimer > 120) { this.frame++; this.animTimer = 0; }

    // Smooth visual interpolation between tiles
    const targetX = this.c * C.TILE;
    const targetY = this.r * C.TILE;
    const lerp = 1 - Math.exp(-18 * dt / 1000);
    this.visX += (targetX - this.visX) * lerp;
    this.visY += (targetY - this.visY) * lerp;
    if (Math.abs(targetX - this.visX) < 0.3) this.visX = targetX;
    if (Math.abs(targetY - this.visY) < 0.3) this.visY = targetY;

    const movingNow = Math.abs(targetX - this.visX) > 0.5 || Math.abs(targetY - this.visY) > 0.5;
    if (movingNow) {
      this.isMoving = true;
      this.walkPhase = (this.walkPhase || 0) + (dt / 1000) * 14;
    } else {
      this.isMoving = false;
      this.walkPhase = 0;
    }

    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.boltCooldown > 0) this.boltCooldown = Math.max(0, this.boltCooldown - dt);
    if (this.attackDash) {
      this.attackDash.timer += dt;
      if (this.attackDash.timer >= this.attackDash.duration) this.attackDash = null;
    }

    // Flame Sword burn panic stun — cannot move or attack, panics in agony
    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - dt);
      return;
    }

    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

    this.moveTimer += dt;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    const dist = Math.abs(this.r - player.r) + Math.abs(this.c - player.c);

    if (dist <= this.aggroRange) this.isAggro = true;
    if (dist > this.aggroRange * 2) this.isAggro = false;

    if (!this.isAggro) {
      if (Math.random() < 0.4) this._moveRandom(grid, rows, cols);
      return;
    }

    this.lastPlayerPos = { r: player.r, c: player.c };

    // Enemy Wizard: ranged lightning bolt when in line of sight (2..6 tiles)
    if (this.type === 'enemy_wizard' && dist >= 2 && dist <= 6 && this.boltCooldown <= 0) {
      const dr = player.r - this.r;
      const dc = player.c - this.c;
      if (dr === 0 || dc === 0) {
        this.boltCooldown = 2300;
        if (onShootBolt) onShootBolt(this, Math.sign(dr), Math.sign(dc));
        return;
      }
    }

    if (dist === 1) {
      this.strikePlayer(player, onHitPlayer);
      return;
    }

    this._chasePlayer(player, grid, rows, cols);
  }

  strikePlayer(player, onHitPlayer) {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 650;
    this.attackDash = {
      dr: Math.sign(player.r - this.r),
      dc: Math.sign(player.c - this.c),
      timer: 0,
      duration: 180,
    };
    if (onHitPlayer) onHitPlayer(this, this.dmg);
    else player.takeDamage(this.dmg);
  }

  _chasePlayer(player, grid, rows, cols) {
    const dr = player.r - this.r;
    const dc = player.c - this.c;
    const dirs = [];

    if (Math.abs(dr) >= Math.abs(dc)) {
      dirs.push([Math.sign(dr), 0], [0, Math.sign(dc)], [0, -Math.sign(dc)], [-Math.sign(dr), 0]);
    } else {
      dirs.push([0, Math.sign(dc)], [Math.sign(dr), 0], [-Math.sign(dr), 0], [0, -Math.sign(dc)]);
    }

    for (const [moveR, moveC] of dirs) {
      const nr = this.r + moveR;
      const nc = this.c + moveC;
      if (MazeGen.isWalkable(grid, rows, cols, nr, nc)) {
        this.r = nr; this.c = nc;
        return;
      }
    }
  }

  _moveRandom(grid, rows, cols) {
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    const d = dirs[Math.floor(Math.random() * 4)];
    const nr = this.r + d[0], nc = this.c + d[1];
    if (MazeGen.isWalkable(grid, rows, cols, nr, nc)) {
      this.r = nr; this.c = nc;
    }
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.stunTimer = 90;
    this.hitFlashTimer = 150;
    if (this.hp <= 0) { this.alive = false; return true; }
    return false;
  }
}

// ── GIANT SPIDER MINI-BOSS ──────────────────────────────────
class Spider extends Enemy {
  constructor(r, c, floor) {
    super('spider', r, c, floor);
    this.shootCooldown = 1600;
    this.nextProj = 'web';
    this.aggroRange = 8;
  }

  update(dt, player, grid, rows, cols, onHitPlayer, onShoot) {
    if (!this.alive) return;
    const wasStunned = this.stunTimer > 0;
    super.update(dt, player, grid, rows, cols, onHitPlayer);
    if (wasStunned || !this.isAggro) return;

    this.shootCooldown -= dt;
    const dist = Math.abs(this.r - player.r) + Math.abs(this.c - player.c);
    if (this.shootCooldown <= 0 && dist <= 7 && dist >= 2) {
      this.shootCooldown = 2500;
      if (onShoot) {
        onShoot(this, this.nextProj);
        this.nextProj = this.nextProj === 'web' ? 'poison' : 'web';
      }
    }
  }
}

// ── PROJECTILE ─────────────────────────────────────────────
class Projectile {
  constructor(type, r, c, vx, vy, dmg, owner) {
    this.type = type; // 'web' | 'poison' | 'fireball' | 'fireburst_ring'
    const T = C.TILE;
    this.x = c * T + T / 2;
    this.y = r * T + T / 2;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.owner = owner;
    this.reflected = false;
    this.alive = true;
    this.frame = 0;
    this.animTimer = 0;
    // Fireball range limiter
    this.distanceTravelled = 0;
    this.maxDistance = (type === 'fireball') ? C.WIZARD_FIREBALL_RANGE * C.TILE : 9999;
  }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 80) { this.frame++; this.animTimer = 0; }
    const dx = this.vx * (dt / 1000);
    const dy = this.vy * (dt / 1000);
    this.x += dx;
    this.y += dy;
    this.distanceTravelled += Math.hypot(dx, dy);
    if (this.distanceTravelled >= this.maxDistance) this.alive = false;
  }

  get r() { return Math.floor(this.y / C.TILE); }
  get c() { return Math.floor(this.x / C.TILE); }
}

// ── CRIMSON RIDER BOSS (Floor 5) ───────────────────────────
class CrimsonRider extends Enemy {
  constructor(r, c, floor) {
    super('boss', r, c, floor);
    this.maxHp = C.ENEMIES.boss.hp;
    this.hp = this.maxHp;
    this.dmg = C.ENEMIES.boss.dmg;
    this.phase = 1;
    this.aggroRange = 999;
    this.isAggro = true;
    this.moveInterval = 800;

    this.isCharging = false;
    this.chargeDir = 'right';
    this.chargeTimer = 0;
    this.chargeWindup = 0;
    this.chargeCooldown = 2500;
    this.chargeHitDone = false;

    this.isKicking = false;
    this.kickTimer = 0;
    this.kickWindup = 0;
    this.kickCooldown = 3000;

    this.attackAnimTimer = 0;
    this.specialCooldown = 2500;
    this.minionsSummoned = false;
    this.sizeInTiles = 5;
  }

  update(dt, player, grid, rows, cols, spawnCallback, onHitPlayer) {
    if (!this.alive) return;
    this.animTimer += dt;
    if (this.animTimer > 120) { this.frame++; this.animTimer = 0; }
    // Smooth visual interpolation
    const targetX = this.c * C.TILE;
    const targetY = this.r * C.TILE;
    const lerp = 1 - Math.exp(-18 * dt / 1000);
    this.visX += (targetX - this.visX) * lerp;
    this.visY += (targetY - this.visY) * lerp;
    if (Math.abs(targetX - this.visX) < 0.3) this.visX = targetX;
    if (Math.abs(targetY - this.visY) < 0.3) this.visY = targetY;

    const movingNow = this.isCharging || Math.abs(targetX - this.visX) > 0.5 || Math.abs(targetY - this.visY) > 0.5;
    if (movingNow) {
      this.isMoving = true;
      this.walkPhase = (this.walkPhase || 0) + (dt / 1000) * (this.isCharging ? 20 : 12);
    } else {
      this.isMoving = false;
      this.walkPhase = 0;
    }

    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    if (this.attackDash) {
      this.attackDash.timer += dt;
      if (this.attackDash.timer >= this.attackDash.duration) this.attackDash = null;
    }
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

    if (this.phase === 1 && this.hp / this.maxHp < 0.4) {
      this.phase = 2;
      this.moveInterval = 550;
      this.dmg += 2;
      if (!this.minionsSummoned && spawnCallback) {
        spawnCallback(this.r, this.c);
        spawnCallback(this.r, this.c);
        this.minionsSummoned = true;
      }
    }

    if (this.chargeCooldown > 0) this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    if (this.kickCooldown > 0) this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);

    // Charge windup
    if (this.chargeWindup > 0) {
      this.chargeWindup -= dt;
      if (this.chargeWindup <= 0) {
        this.isCharging = true;
        this.chargeTimer = 1100;
        this.chargeHitDone = false;
      }
      return;
    }

    // Active charge (horizontal along the narrow hall)
    if (this.isCharging) {
      this.chargeTimer -= dt;
      this.moveTimer += dt;
      if (this.moveTimer >= 68) {
        this.moveTimer = 0;
        const [dr, dc] = this._chargeDelta();
        const nr = this.r + dr, nc = this.c + dc;
        if (MazeGen.isWalkable(grid, rows, cols, nr, nc) && nc >= 3 && nc <= cols - 4) {
          this.r = nr; this.c = nc;
          // Player is safe if tucked into top/bottom 1-tile alcove (|this.r - player.r| >= 2)
          if (Math.abs(this.r - player.r) <= 1 && Math.abs(this.c - player.c) <= 1 && !this.chargeHitDone && onHitPlayer) {
            this.chargeHitDone = true;
            this.attackAnimTimer = 380;
            onHitPlayer(this, this.dmg, true, false); // isCharge = true
          }
        } else {
          this.isCharging = false;
          this.chargeCooldown = this.phase === 2 ? 2200 : 3400;
        }
      }
      if (this.chargeTimer <= 0) {
        this.isCharging = false;
        this.chargeCooldown = this.phase === 2 ? 2200 : 3400;
      }
      return;
    }

    // Kick windup (1s telegraph)
    if (this.kickWindup > 0) {
      this.kickWindup -= dt;
      if (this.kickWindup <= 0) {
        this.isKicking = true;
        this.kickTimer = 360;
        if (Math.abs(this.r - player.r) <= 1 && Math.abs(this.c - player.c) <= 2 && onHitPlayer) {
          onHitPlayer(this, 4, false, true); // isKick = true
        }
      }
      return;
    }

    if (this.isKicking) {
      this.kickTimer -= dt;
      if (this.kickTimer <= 0) {
        this.isKicking = false;
        this.kickCooldown = 5000;
      }
      return;
    }

    // Face player horizontally when not charging
    if (player.c !== this.c) {
      this.chargeDir = player.c < this.c ? 'left' : 'right';
    }

    const distC = Math.abs(this.c - player.c);
    const distR = Math.abs(this.r - player.r);

    // Charge left/right along the narrow hall when player is 3+ tiles away horizontally
    if (this.chargeCooldown <= 0 && distC >= 3 && this.specialCooldown <= 0) {
      this.chargeDir = player.c < this.c ? 'left' : 'right';
      this.chargeWindup = 750;
      this.specialCooldown = 1800;
      return;
    }

    // Telegraphed horse kick when player is close in the hall
    if (this.kickCooldown <= 0 && distR <= 1 && distC <= 2 && Math.random() < 0.35) {
      this.kickWindup = 900;
      return;
    }

    // Normal walk & lance strike along center hall (never enter 1-tile safe alcoves)
    this.moveTimer += dt;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    if (distR <= 1 && distC <= 2) {
      this.attackAnimTimer = 380;
      this.strikePlayer(player, onHitPlayer);
      return;
    }

    const centerR = Math.floor(rows / 2);
    const stepC = Math.sign(player.c - this.c);
    const nc = this.c + stepC;
    if (stepC !== 0 && MazeGen.isWalkable(grid, rows, cols, centerR, nc) && nc >= 3 && nc <= cols - 4) {
      this.r = centerR;
      this.c = nc;
    }
  }

  _chargeDelta() {
    switch (this.chargeDir) {
      case 'up': return [-1, 0];
      case 'down': return [1, 0];
      case 'left': return [0, -1];
      case 'right': return [0, 1];
      default: return [0, 1];
    }
  }
}

// ── BOSS (legacy alias) ────────────────────────────────────
class Boss extends CrimsonRider {}

// ── ITEM ───────────────────────────────────────────────────
class Item {
  constructor(type, r, c) {
    this.type = type;
    this.r = r; this.c = c;
    this.collected = false;
    this.frame = 0;
    this.animTimer = 0;
  }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 100) { this.frame++; this.animTimer = 0; }
  }
}

// ── SPAWNER HELPER ─────────────────────────────────────────
const EntityFactory = {
  spawnEnemies(grid, rows, cols, floor, playerStart, bossFloor) {
    const positions = MazeGen.getFloorPositions(grid, rows, cols, playerStart);
    const blocksPerEnemy = C.SPAWN_BLOCKS_MIN + Math.floor(Math.random() * (C.SPAWN_BLOCKS_MAX - C.SPAWN_BLOCKS_MIN + 1));
    const count = Math.max(11, Math.floor(positions.length / blocksPerEnemy) + (floor - 1) * 2 + 3);
    const enemies = [];

    if (bossFloor) {
      const centerR = Math.floor(rows / 2);
      const bossC = Math.floor(cols * 0.72);
      const boss = new CrimsonRider(centerR, bossC, floor);
      boss.chargeDir = 'left';
      enemies.push(boss);
      return enemies; // Floor 6 is The Dark Knight's narrow hall
    }

    // Shrine guard
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r][c] === C.T_SAVEPOINT) {
          const near = positions
            .filter(p => Math.abs(p.r - r) + Math.abs(p.c - c) >= 2 && Math.abs(p.r - r) + Math.abs(p.c - c) <= 5)
            .filter(p => !enemies.some(e => e.r === p.r && e.c === p.c));
          if (near.length > 0) {
            const mp = near[Math.floor(Math.random() * near.length)];
            const guardType = floor >= 3 ? 'red_knight' : 'castle_knight';
            enemies.push(new Enemy(guardType, mp.r, mp.c, floor));
          }
        }
      }
    }

    // Labyrinth 1 (Duke Wiston's Castle) — No slimes!
    let types;
    if (floor === 1) {
      types = ['castle_knight'];
    } else if (floor === 2) {
      types = ['castle_knight', 'castle_knight', 'enemy_wizard'];
    } else {
      types = ['castle_knight', 'castle_knight', 'enemy_wizard', 'red_knight'];
    }

    const shuffled = shuffle([...positions]).slice(0, count);
    shuffled.forEach(pos => {
      if (!enemies.some(e => e.r === pos.r && e.c === pos.c)) {
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push(new Enemy(type, pos.r, pos.c, floor));
      }
    });

    // Floor 5: Ensure a marked Key-Bearing Red Knight exists to drop the Big Gate Key
    if (floor === 5) {
      let keyKnight = enemies.find(e => e.type === 'red_knight');
      if (!keyKnight) {
        const pos = positions.find(p => !enemies.some(e => e.r === p.r && e.c === p.c)) || positions[0];
        if (pos) {
          keyKnight = new Enemy('red_knight', pos.r, pos.c, floor);
          enemies.push(keyKnight);
        }
      }
      if (keyKnight) keyKnight.hasKey = true;
    }

    return enemies;
  },

  spawnTraps(grid, rows, cols, floor, playerStart) {
    if (floor !== 4) return [];
    const positions = MazeGen.getFloorPositions(grid, rows, cols, playerStart)
      .filter(p => Math.abs(p.r - playerStart.r) + Math.abs(p.c - playerStart.c) > 4);
    const shuffled = shuffle([...positions]).slice(0, 12);
    return shuffled.map((pos, idx) => ({
      r: pos.r,
      c: pos.c,
      kind: idx % 2 === 0 ? 'bomb' : 'arrow',
      armed: false,
      fuse: 0,
      cooldown: 0,
    }));
  },

  spawnItems(grid, rows, cols, floor, playerStart, enemies) {
    const occupied = new Set(enemies.map(e => `${e.r},${e.c}`));
    occupied.add(`${playerStart.r},${playerStart.c}`);

    const positions = MazeGen.getFloorPositions(grid, rows, cols, playerStart)
      .filter(p => !occupied.has(`${p.r},${p.c}`));

    const items = [];
    const shuffled = shuffle([...positions]);

    // Floor 5 key drops from Key-Bearing Red Knight; Floor 6 Emblem drops from Dark Knight Boss
    if (floor < 5) {
      const keyPos = shuffled.shift();
      if (keyPos) items.push(new Item(C.I_KEY, keyPos.r, keyPos.c));
    }

    // Slightly increased HP drops (hearts + small potions)
    const lootCount = floor === C.FLOORS ? 4 : (6 + floor);
    const loot = shuffled.slice(0, lootCount);
    loot.forEach((pos, idx) => {
      items.push(new Item(idx % 3 === 0 ? C.I_POTION : C.I_HEART, pos.r, pos.c));
    });

    return items;
  }
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
