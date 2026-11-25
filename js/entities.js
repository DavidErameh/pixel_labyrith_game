// ============================================================
// entities.js — Player, Enemy, and Item classes
// ============================================================

// ── PLAYER ─────────────────────────────────────────────────
class Player {
  constructor(r, c) {
    this.r = r; this.c = c;
    this.hp = C.PLAYER_MAX_HP;
    this.maxHp = C.PLAYER_MAX_HP;
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
    this.powerup = null;
    this.powerupTimer = 0;
    this.powerupDuration = C.POWERUP_DURATION;
    this.gemsThisFloor = 0;
    this.killsThisFloor = 0;
    this.effects = [];   // { type, r, c, frame, text, color }
    this.slashes = [];   // { r, c, dir, timer, duration, isPower }
    this.clashes = [];   // { r, c, timer, duration, isPower }
    this.particles = []; // { x, y, vx, vy, color, size, life, maxLife }
    this.attackTimer = 0;
    this.attackCooldown = 0;
  }

  get dmg() {
    return this.powerup === 'sword' ? C.PLAYER_DMG * 2 : C.PLAYER_DMG;
  }

  get speed() {
    return this.powerup === 'speed' ? this.moveDelay * 0.5 : this.moveDelay;
  }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 150) { this.frame++; this.animTimer = 0; }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    if (this.powerup) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.powerup = null;
        this.powerupTimer = 0;
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
    if (this.powerup === 'shield') { dmg = Math.max(0, dmg - 1); }
    this.hp = Math.max(0, this.hp - dmg);
    this.invincible = true;
    this.invincibleTimer = 800;
    if (this.hp <= 0) this.alive = false;
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  activatePowerup(type) {
    this.powerup = type;
    this.powerupTimer = this.powerupDuration;
  }

  addEffect(type, r, c, text = '', color = '#ffd700') {
    this.effects.push({ type, r, c, frame: 0, text, color });
  }

  spawnParticles(wx, wy, color, count = 8, speed = 2.5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.8) * speed;
      this.particles.push({
        x: wx,
        y: wy,
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
  }

  update(dt, player, grid, rows, cols) {
    if (!this.alive) return;
    this.animTimer += dt;
    if (this.animTimer > 120) { this.frame++; this.animTimer = 0; }

    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

    this.moveTimer += dt;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    const dist = Math.abs(this.r - player.r) + Math.abs(this.c - player.c);

    // Aggro
    if (dist <= this.aggroRange) this.isAggro = true;
    if (dist > this.aggroRange * 2) this.isAggro = false;

    if (!this.isAggro) {
      // Wander randomly
      if (Math.random() < 0.4) this._moveRandom(grid, rows, cols);
      return;
    }

    this.lastPlayerPos = { r: player.r, c: player.c };

    // Attack if adjacent
    if (dist === 1) {
      player.takeDamage(this.dmg);
      return;
    }

    // Chase player (simple)
    this._chasePlayer(player, grid, rows, cols);
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
    this.stunTimer = 200;
    this.hitFlashTimer = 150;
    if (this.hp <= 0) { this.alive = false; return true; }
    return false;
  }
}

// ── BOSS (special behavior) ─────────────────────────────────
class Boss extends Enemy {
  constructor(r, c, floor) {
    super('boss', r, c, floor);
    this.phase = 1;
    this.specialCooldown = 0;
    this.aggroRange = 999; // Always aggro
    this.isAggro = true;
    this.moveInterval = 700;
  }

  update(dt, player, grid, rows, cols, spawnCallback) {
    if (!this.alive) return;

    // Phase 2 at 40% hp
    if (this.phase === 1 && this.hp / this.maxHp < 0.4) {
      this.phase = 2;
      this.moveInterval = 450;
      this.dmg += 1;
    }

    this.specialCooldown -= dt;
    if (this.specialCooldown <= 0 && this.phase === 2) {
      // Spawn minion
      this.specialCooldown = 5000;
      if (spawnCallback) spawnCallback(this.r, this.c);
    }

    super.update(dt, player, grid, rows, cols);
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
    const count = C.MIN_ENEMIES_BASE + Math.floor(Math.random() * (C.MAX_ENEMIES_BASE - C.MIN_ENEMIES_BASE + 1)) + (floor - 1) * 2;
    const enemies = [];

    if (bossFloor) {
      // Place boss in center-ish of maze
      const bossPos = positions[Math.floor(positions.length / 2)];
      enemies.push(new Boss(bossPos.r, bossPos.c, floor));
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

    // Always place a key
    const keyPos = shuffled.shift();
    if (keyPos) items.push(new Item(C.I_KEY, keyPos.r, keyPos.c));

    // Coins and gems
    const loot = shuffled.slice(0, 8 + floor * 2);
    loot.forEach(pos => {
      const roll = Math.random();
      let type;
      if (roll < 0.4) type = C.I_COIN;
      else if (roll < 0.65) type = C.I_GEM;
      else if (roll < 0.78) type = C.I_HEART;
      else if (roll < 0.87) type = C.I_SPEED;
      else if (roll < 0.93) type = C.I_SHIELD;
      else type = C.I_SWORD;
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
