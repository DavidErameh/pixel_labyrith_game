// ============================================================
// entities.js — Player, Enemy, and Item classes
// ============================================================

// ── PLAYER ─────────────────────────────────────────────────
class Player {
  constructor(r, c, playerClass = 'knight') {
    this.r = r; this.c = c;
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
    this.kills = { slime: 0, skeleton: 0, ghost: 0, boss: 0 };
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
  }

  get dmg() {
    return this.playerClass === 'wizard' ? C.WIZARD_DMG : C.KNIGHT_DMG;
  }

  get speed() { return this.moveDelay; }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 150) { this.frame++; this.animTimer = 0; }

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
    this.hitFlashTimer = 0;
    this.attackDash = null;
    this.attackCooldown = 0;
  }

  update(dt, player, grid, rows, cols, onHitPlayer) {
    if (!this.alive) return;
    this.animTimer += dt;
    if (this.animTimer > 120) { this.frame++; this.animTimer = 0; }

    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.attackDash) {
      this.attackDash.timer += dt;
      if (this.attackDash.timer >= this.attackDash.duration) this.attackDash = null;
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

// ── BOSS (special behavior) ─────────────────────────────────
class Boss extends Enemy {
  constructor(r, c, floor) {
    super('boss', r, c, floor);
    this.phase = 1;
    this.specialCooldown = 0;
    this.aggroRange = 999;
    this.isAggro = true;
    this.moveInterval = 650;
  }

  update(dt, player, grid, rows, cols, spawnCallback, onHitPlayer) {
    if (!this.alive) return;

    if (this.phase === 1 && this.hp / this.maxHp < 0.4) {
      this.phase = 2;
      this.moveInterval = 420;
      this.dmg += 1;
    }

    this.specialCooldown -= dt;
    if (this.specialCooldown <= 0 && this.phase === 2) {
      this.specialCooldown = 5000;
      if (spawnCallback) spawnCallback(this.r, this.c);
    }

    super.update(dt, player, grid, rows, cols, onHitPlayer);
  }
}

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
    const count = Math.max(8, Math.floor(positions.length / blocksPerEnemy) + (floor - 1) * 2);
    const enemies = [];

    if (bossFloor) {
      const bossPos = positions[Math.floor(positions.length / 2)];
      enemies.push(new Boss(bossPos.r, bossPos.c, floor));
    }

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r][c] === C.T_SAVEPOINT) {
          const near = positions
            .filter(p => Math.abs(p.r - r) + Math.abs(p.c - c) >= 2 && Math.abs(p.r - r) + Math.abs(p.c - c) <= 5)
            .filter(p => !enemies.some(e => e.r === p.r && e.c === p.c));
          if (near.length > 0) {
            const mp = near[Math.floor(Math.random() * near.length)];
            const miniType = (floor % 2 === 1) ? 'armored_skeleton' : 'spider';
            if (miniType === 'spider') enemies.push(new Spider(mp.r, mp.c, floor));
            else enemies.push(new Enemy('armored_skeleton', mp.r, mp.c, floor));
          }
        }
      }
    }

    const types = floor < 3
      ? ['slime','slime','skeleton']
      : ['slime','skeleton','ghost','skeleton'];

    const shuffled = shuffle([...positions]).slice(0, count);
    shuffled.forEach(pos => {
      if (!enemies.some(e => e.r === pos.r && e.c === pos.c)) {
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push(new Enemy(type, pos.r, pos.c, floor));
      }
    });

    return enemies;
  },

  spawnItems(grid, rows, cols, floor, playerStart, enemies) {
    const occupied = new Set(enemies.map(e => `${e.r},${e.c}`));
    occupied.add(`${playerStart.r},${playerStart.c}`);

    const positions = MazeGen.getFloorPositions(grid, rows, cols, playerStart)
      .filter(p => !occupied.has(`${p.r},${p.c}`));

    const items = [];
    const shuffled = shuffle([...positions]);

    const keyPos = shuffled.shift();
    if (keyPos) items.push(new Item(C.I_KEY, keyPos.r, keyPos.c));

    const loot = shuffled.slice(0, 10 + floor * 2);
    loot.forEach(pos => {
      const roll = Math.random();
      let type;
      if (roll < 0.45) type = C.I_COIN;
      else if (roll < 0.72) type = C.I_GEM;
      else type = C.I_HEART;
      items.push(new Item(type, pos.r, pos.c));
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
