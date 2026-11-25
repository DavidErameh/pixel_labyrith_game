// ============================================================
// game.js — Core game loop, state management, rendering
// ============================================================

class Game {
  constructor(canvas, minimapCanvas, playerClass = 'knight') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');
    this.playerClass = playerClass;

    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.animFrame = null;

    // Game state
    this.floor = 1;
    this.player = null;
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.grid = null;
    this.rows = C.MAP_ROWS;
    this.cols = C.MAP_COLS;
    this.exitPos = null;
    this.exitUnlocked = false;
    this.globalFrame = 0;
    this.frameTimer = 0;
    this.explored = new Set();
    this.visible = new Set();

    // Camera & screen shake
    this.camX = 0; this.camY = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 60;

    // Input
    this.keys = new Set();
    this.tapKeys = new Set();
    this.moveQueue = [];
    this.lastMoveTime = 0;

    // Callbacks
    this.onGameOver = null;
    this.onLevelComplete = null;
    this.onVictory = null;
    this.onScoreUpdate = null;
    this.onHpUpdate = null;
    this.onFloorUpdate = null;
    this.onKeysUpdate = null;
    this.onShieldUpdate = null;
    this.onMpUpdate = null;
    this.onFloorBanner = null;
    this.onLore = null;
    this.onSave = null;
    this.lastSavedPos = null;

    this._handleResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._handleResize);
  }

  // ── Lifecycle ───────────────────────────────────────────────
  startFloor(floor) {
    this.floor = floor;
    const isBoss = (floor === C.FLOORS);

    this.grid = MazeGen.generate(this.rows, this.cols, floor);
    this.exitPos = MazeGen.findExit(this.grid, this.rows, this.cols);
    this.exitUnlocked = false;

    this.explored = new Set();
    this.visible = new Set();

    const initVis = MazeGen.computeVisibility(this.grid, this.rows, this.cols, 1, 1, C.VISION_RADIUS);
    this.visible = initVis.visible;
    initVis.explored.forEach(k => this.explored.add(k));

    if (!this.player || floor === 1) {
      this.player = new Player(1, 1, this.playerClass);
    } else {
      this.player.r = 1; this.player.c = 1;
      this.player.effects = [];
      this.player.heal(2);
      if (this.player.playerClass === 'wizard') this.player.gainMp(10);
    }

    this.enemies = EntityFactory.spawnEnemies(this.grid, this.rows, this.cols, floor, { r: 1, c: 1 }, isBoss);
    this.items = EntityFactory.spawnItems(this.grid, this.rows, this.cols, floor, { r: 1, c: 1 }, this.enemies);
    this.projectiles = [];

    this._handleResize();
    this._updateCamera();
    this._updateHUD();
    this.lastSavedPos = null;
    this.onFloorBanner && this.onFloorBanner(floor);
  }

  serialize() {
    const p = this.player;
    return {
      floor: this.floor,
      rows: this.rows,
      cols: this.cols,
      grid: this.grid,
      exitPos: this.exitPos,
      exitUnlocked: this.exitUnlocked,
      explored: Array.from(this.explored),
      playerClass: this.playerClass,
      player: {
        r: p.r, c: p.c, hp: p.hp, maxHp: p.maxHp,
        mp: p.mp, maxMp: p.maxMp,
        keys: p.keys, score: p.score, kills: p.kills,
        dir: p.dir, shieldActive: p.shieldActive, shieldHits: p.shieldHits,
        barrierActive: p.barrierActive, barrierHits: p.barrierHits,
        gemsThisFloor: p.gemsThisFloor, killsThisFloor: p.killsThisFloor,
        playerClass: p.playerClass,
      },
      enemies: this.enemies.filter(e => e.alive).map(e => ({
        type: e.type, r: e.r, c: e.c, hp: e.hp, maxHp: e.maxHp,
        dmg: e.dmg, moveInterval: e.moveInterval,
        isBoss: e instanceof Boss, isSpider: e instanceof Spider,
      })),
      items: this.items.filter(i => !i.collected).map(i => ({
        type: i.type, r: i.r, c: i.c,
      })),
    };
  }

  loadSaveData(data) {
    this.floor = data.floor;
    this.rows = data.rows || C.MAP_ROWS;
    this.cols = data.cols || C.MAP_COLS;
    this.grid = data.grid;
    this.exitPos = data.exitPos;
    this.exitUnlocked = data.exitUnlocked;
    this.explored = new Set(data.explored || []);
    this.playerClass = data.playerClass || 'knight';

    const pd = data.player;
    const cls = pd.playerClass || data.playerClass || 'knight';
    const p = new Player(pd.r, pd.c, cls);
    p.hp = pd.hp;
    p.maxHp = pd.maxHp;
    p.mp = pd.mp != null ? pd.mp : (cls === 'wizard' ? C.WIZARD_MAX_MP : 0);
    p.maxMp = pd.maxMp != null ? pd.maxMp : (cls === 'wizard' ? C.WIZARD_MAX_MP : 0);
    p.keys = pd.keys;
    p.score = pd.score;
    p.kills = pd.kills || p.kills;
    p.dir = pd.dir || 'down';
    p.shieldActive = !!pd.shieldActive;
    p.shieldHits = pd.shieldHits != null ? pd.shieldHits : C.KNIGHT_SHIELD_HITS;
    p.barrierHits = pd.barrierHits != null ? pd.barrierHits : C.WIZARD_BARRIER_HITS;
    p.gemsThisFloor = pd.gemsThisFloor || 0;
    p.killsThisFloor = pd.killsThisFloor || 0;
    this.player = p;
    this.projectiles = [];

    this.enemies = (data.enemies || []).map(ed => {
      const e = ed.isBoss ? new Boss(ed.r, ed.c, this.floor)
        : ed.isSpider ? new Spider(ed.r, ed.c, this.floor)
        : new Enemy(ed.type, ed.r, ed.c, this.floor);
      e.hp = ed.hp;
      e.maxHp = ed.maxHp;
      e.dmg = ed.dmg;
      e.moveInterval = ed.moveInterval;
      return e;
    });

    this.items = (data.items || []).map(id => new Item(id.type, id.r, id.c));

    const vis = MazeGen.computeVisibility(this.grid, this.rows, this.cols, p.r, p.c, C.VISION_RADIUS);
    this.visible = vis.visible;
    vis.explored.forEach(k => this.explored.add(k));

    this._handleResize();
    this._updateCamera();
    this._updateHUD();
    this.lastSavedPos = `${p.r},${p.c}`;
  }

  start() {
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this._loop(this.lastTime);
  }

  stop() {
    this.running = false;
    this.shakeTimer = 0;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  _handlePlayerDeath() {
    const p = this.player;
    this.stop();
    if (p && this.onHpUpdate) this.onHpUpdate(0, p.maxHp);
    if (p && this.onGameOver) this.onGameOver(this.floor, p.score);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.lastTime = performance.now(); this._loop(this.lastTime); }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._handleResize);
  }

  // ── Game Loop ───────────────────────────────────────────────
  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;

    if (!this.paused) {
      try {
        this._update(dt);
        this._render();
      } catch (err) {
        console.error('Game loop error:', err);
      }
    }

    this.animFrame = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    const p = this.player;
    if (!p) return;
    if (!p.alive) {
      this._handlePlayerDeath();
      return;
    }

    this.frameTimer += dt;
    if (this.frameTimer > 120) { this.globalFrame++; this.frameTimer = 0; }

    p.update(dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    // HUD updates
    if (this.onShieldUpdate) {
      if (p.playerClass === 'wizard') {
        this.onShieldUpdate(p.barrierActive, p.barrierHits, p.barrierCooldown, true);
      } else {
        this.onShieldUpdate(p.shieldActive, p.shieldHits, p.shieldCooldown, false);
      }
    }
    if (this.onMpUpdate && p.playerClass === 'wizard') {
      this.onMpUpdate(p.mp, p.maxMp);
    }

    this._handleInput(dt);

    // Enemy hit handler
    const onHitPlayer = (enemy, dmg) => {
      if (p.invincible) return;
      if (enemy.type === 'slime' || enemy.type === 'spider') Sound.squish();
      else Sound.enemySlash();

      if (p.isBlocking()) {
        const res = p.absorbShieldHit();
        Sound.block();
        this.triggerShake(3, 90);
        const TT = C.TILE;
        p.spawnParticles(p.c * TT + TT / 2, p.r * TT + TT / 2, p.playerClass === 'wizard' ? '#93c5fd' : '#60a5fa', 10, 2.5);
        const label = p.playerClass === 'wizard' ? 'BARRIER' : 'SHIELD';
        if (res === 'broken') {
          p.addEffect('shield', p.r, p.c, `${label} BROKE!`, p.playerClass === 'wizard' ? '#93c5fd' : '#60a5fa');
          UI.showToast(p.playerClass === 'wizard' ? '✨ Barrier broke! 6s cooldown...' : '🛡️ Shield broke! 5s cooldown...');
        } else {
          p.addEffect('shield', p.r, p.c, `BLOCKED (${p.playerClass === 'wizard' ? p.barrierHits : p.shieldHits})`, '#60a5fa');
        }
        return;
      }
      if (p.takeDamage(dmg)) {
        Sound.hurt();
        this.triggerShake(5, 160);
        p.addEffect('hurt', p.r, p.c, `-${dmg}`, '#ff4444');
      }
    };

    // Spider shoot handler
    const onSpiderShoot = (spider, projType) => {
      const TT = C.TILE;
      const sx = spider.c * TT + TT / 2;
      const sy = spider.r * TT + TT / 2;
      const ppx = p.c * TT + TT / 2;
      const ppy = p.r * TT + TT / 2;
      const dist = Math.hypot(ppx - sx, ppy - sy) || 1;
      const speed = projType === 'web' ? 125 : 145;
      Sound.web();
      this.projectiles.push(new Projectile(
        projType, spider.r, spider.c,
        ((ppx - sx) / dist) * speed,
        ((ppy - sy) / dist) * speed,
        projType === 'poison' ? 3 : 0,
        spider
      ));
    };

    // Update enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e instanceof Boss) {
        e.update(dt, p, this.grid, this.rows, this.cols, (r, c) => {
          this._spawnMinion(r, c);
        }, onHitPlayer);
      } else if (e instanceof Spider) {
        e.update(dt, p, this.grid, this.rows, this.cols, onHitPlayer, onSpiderShoot);
      } else {
        e.update(dt, p, this.grid, this.rows, this.cols, onHitPlayer);
      }
    }

    this._updateProjectiles(dt, p);

    this.items.forEach(i => i.update(dt));

    const collidedItems = this.items.filter(i => !i.collected && i.r === p.r && i.c === p.c);
    collidedItems.forEach(item => this._collectItem(item));

    if (!p.alive) {
      this._handlePlayerDeath();
      return;
    }

    if (this.exitUnlocked && p.r === this.exitPos.r && p.c === this.exitPos.c) {
      this._completeFloor();
      return;
    }

    const vis = MazeGen.computeVisibility(this.grid, this.rows, this.cols, p.r, p.c, C.VISION_RADIUS);
    this.visible = vis.visible;
    vis.explored.forEach(k => this.explored.add(k));

    this._updateCamera();
    if (this.onHpUpdate) this.onHpUpdate(p.hp, p.maxHp);
  }

  _updateProjectiles(dt, p) {
    const TT = C.TILE;
    const ppx = p.c * TT + TT / 2;
    const ppy = p.r * TT + TT / 2;

    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.update(dt);

      const pr = proj.r, pc = proj.c;

      // Wall collision
      if (pr < 0 || pr >= this.rows || pc < 0 || pc >= this.cols || this.grid[pr][pc] === C.T_WALL) {
        proj.alive = false;
        continue;
      }

      // Fireball hits enemy
      if (proj.type === 'fireball') {
        let hitEnemy = false;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const ex = e.c * TT + TT / 2, ey = e.r * TT + TT / 2;
          if (Math.hypot(proj.x - ex, proj.y - ey) < 18) {
            proj.alive = false;
            hitEnemy = true;
            const killed = e.takeDamage(proj.dmg);
            p.spawnParticles(ex, ey, '#ff8c00', 10, 2.8);
            p.clashes.push({ r: e.r, c: e.c, timer: 0, duration: 300, isPower: false, isFire: true });
            Sound.clash();
            this.triggerShake(3, 80);
            if (killed) {
              Sound.kill();
              p.score += C.SCORE[`enemy_${e.type}`] || 10;
              p.kills[e.type] = (p.kills[e.type] || 0) + 1;
              p.killsThisFloor++;
              p.gainMp(C.WIZARD_MP_REGEN_KILL);
              this.onScoreUpdate && this.onScoreUpdate(p.score);
              p.spawnParticles(ex, ey, e.color, 14, 3.2);
            }
            break;
          }
        }
        if (hitEnemy) continue;
      }

      // Reflected web hits enemy
      if (proj.reflected) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const ex = e.c * TT + TT / 2, ey = e.r * TT + TT / 2;
          if (Math.hypot(proj.x - ex, proj.y - ey) < 18) {
            proj.alive = false;
            e.stunTimer = 2500;
            e.hitFlashTimer = 250;
            e.takeDamage(2);
            Sound.clash();
            p.spawnParticles(ex, ey, '#ffffff', 12, 2.8);
            p.addEffect('parry', e.r, e.c, 'STUNNED!', '#facc15');
            UI.showToast('🕸️ Parried web stunned the Spider!');
            break;
          }
        }
      } else if (Math.hypot(proj.x - ppx, proj.y - ppy) < 14) {
        proj.alive = false;
        if (proj.type === 'web') {
          p.rootedTimer = 2200;
          Sound.web();
          p.addEffect('web', p.r, p.c, 'WEBBED!', '#ffffff');
          UI.showToast('🕸️ Caught in sticky web! (Press Space to parry!)');
        } else if (proj.type === 'poison') {
          if (p.isBlocking()) {
            const res = p.absorbShieldHit();
            Sound.block();
            p.spawnParticles(ppx, ppy, '#4ade80', 10, 2.5);
            p.addEffect('shield', p.r, p.c, res === 'broken' ? 'BROKE!' : 'BLOCKED!', '#60a5fa');
            if (res === 'broken') UI.showToast('🛡️ Shield broke!');
          } else if (p.takeDamage(proj.dmg)) {
            Sound.hurt();
            this.triggerShake(5, 160);
            p.addEffect('hurt', p.r, p.c, `-${proj.dmg}`, '#22c55e');
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter(pr => pr.alive);
  }

  _spawnMinion(nearR, nearC) {
    const dirs = [[0,2],[0,-2],[2,0],[-2,0],[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dr, dc] of dirs) {
      const r = nearR + dr, c = nearC + dc;
      if (MazeGen.isWalkable(this.grid, this.rows, this.cols, r, c)) {
        this.enemies.push(new Enemy('skeleton', r, c, this.floor));
        UI.showToast('💀 Boss summoned reinforcements!');
        return;
      }
    }
  }

  // ── Input ───────────────────────────────────────────────────
  _handleInput(dt) {
    const p = this.player;
    const now = performance.now();
    if (now - this.lastMoveTime < p.speed) return;

    const hasKey = (...ks) => ks.some(k => this.keys.has(k) || this.tapKeys.has(k));
    let dr = 0, dc = 0;
    if (hasKey('ArrowUp', 'w', 'W')) dr = -1;
    else if (hasKey('ArrowDown', 's', 'S')) dr = 1;
    else if (hasKey('ArrowLeft', 'a', 'A')) dc = -1;
    else if (hasKey('ArrowRight', 'd', 'D')) dc = 1;
    this.tapKeys.clear();

    if (this.moveQueue.length > 0 && dr === 0 && dc === 0) {
      const m = this.moveQueue.shift();
      dr = m.r; dc = m.c;
    }

    if (dr === 0 && dc === 0) return;

    this._tryMove(p, dr, dc);
    this.lastMoveTime = now;
  }

  _tryMove(p, dr, dc) {
    if (p.rootedTimer > 0) {
      if (dr < 0) p.dir = 'up';
      else if (dr > 0) p.dir = 'down';
      else if (dc < 0) p.dir = 'left';
      else if (dc > 0) p.dir = 'right';
      return;
    }

    const nr = p.r + dr, nc = p.c + dc;

    const enemy = this.enemies.find(e => e.alive && e.r === nr && e.c === nc);
    if (enemy) {
      if (dr < 0) p.dir = 'up';
      else if (dr > 0) p.dir = 'down';
      else if (dc < 0) p.dir = 'left';
      else if (dc > 0) p.dir = 'right';
      return;
    }

    if (this.grid[nr][nc] === C.T_CHEST) {
      this._openChest(nr, nc);
      return;
    }

    if (this.grid[nr][nc] === C.T_DOOR && !this.exitUnlocked) {
      if (p.keys > 0) {
        p.keys--;
        this.exitUnlocked = true;
        this.grid[nr][nc] = C.T_OPEN;
        Sound.unlock();
        UI.showToast('🗝️ Door unlocked! Exit revealed!');
        this.onKeysUpdate && this.onKeysUpdate(p.keys);
      } else {
        UI.showToast('🔒 You need a key to open this door!');
      }
      return;
    }

    if (!MazeGen.isWalkable(this.grid, this.rows, this.cols, nr, nc)) return;

    p.r = nr; p.c = nc;

    if (dr < 0) p.dir = 'up';
    else if (dr > 0) p.dir = 'down';
    else if (dc < 0) p.dir = 'left';
    else p.dir = 'right';

    if (this.grid[nr][nc] === C.T_SAVEPOINT) {
      const posKey = `${nr},${nc}`;
      if (this.lastSavedPos !== posKey) {
        this.lastSavedPos = posKey;
        this._activateSavePoint(nr, nc);
      }
    } else {
      this.lastSavedPos = null;
    }

    if (this.grid[nr][nc] === C.T_LORE) {
      this._readLoreTablet(nr, nc);
    }
  }

  _activateSavePoint(r, c) {
    const p = this.player;
    p.heal(2);
    if (p.playerClass === 'wizard') p.gainMp(15);
    const TT = C.TILE;
    p.spawnParticles(c * TT + TT / 2, r * TT + TT / 2, '#c084fc', 16, 2.5);
    p.addEffect('save', r, c, 'SAVED!', '#c084fc');
    Sound.save();
    this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
    this.onSave && this.onSave(this.serialize());
    UI.showToast(p.playerClass === 'wizard'
      ? '🔮 Shrine touched — Saved & +2 HP +15 MP!'
      : '🔮 Shrine touched — Saved & +2 HP!');
  }

  _readLoreTablet(r, c) {
    const p = this.player;
    this.grid[r][c] = C.T_FLOOR;
    p.score += 15;
    this.onScoreUpdate && this.onScoreUpdate(p.score);
    Sound.unlock();
    const frags = C.LORE_FRAGMENTS;
    const text = frags[Math.floor(Math.random() * frags.length)];
    this.onLore && this.onLore(text);
  }

  triggerShake(intensity = 4, duration = 140) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  _dirToDelta(dir) {
    if (dir === 'up') return [-1, 0];
    if (dir === 'down') return [1, 0];
    if (dir === 'left') return [0, -1];
    return [0, 1];
  }

  // Hold-to-block: called by keydown/up in main.js
  startHoldShield() {
    const p = this.player;
    if (!p || !p.alive || this.paused) return;
    if (p.playerClass === 'knight') {
      if (p.shieldCooldown > 0) {
        UI.showToast(`🛡️ Shield recharging (${(p.shieldCooldown / 1000).toFixed(1)}s)`);
        return;
      }
      p.shieldHeld = true;
      Sound.block();
    } else {
      // Wizard: Arcane Barrier
      if (p.barrierCooldown > 0) {
        UI.showToast(`✨ Barrier recharging (${(p.barrierCooldown / 1000).toFixed(1)}s)`);
        return;
      }
      if (p.mp < C.WIZARD_BARRIER_COST) {
        UI.showToast(`✨ Not enough MP! (need ${C.WIZARD_BARRIER_COST})`);
        return;
      }
      p.barrierHeld = true;
      Sound.block();
    }
  }

  stopHoldShield() {
    const p = this.player;
    if (!p) return;
    p.shieldHeld = false;
    p.barrierHeld = false;
    // Stop barrier — give back half cost if not hit
    if (p.playerClass === 'wizard' && p.barrierActive) {
      p.barrierActive = false;
    }
  }

  // Legacy toggle for mobile button
  toggleShield() {
    const p = this.player;
    if (!p || !p.alive || this.paused) return;
    if (p.playerClass === 'knight') {
      if (p.shieldCooldown > 0) {
        UI.showToast(`🛡️ Shield recharging (${(p.shieldCooldown / 1000).toFixed(1)}s)`);
        return;
      }
      p.shieldHeld = !p.shieldHeld;
      Sound.block();
      UI.showToast(p.shieldHeld ? `🛡️ Shield raised (${p.shieldHits}/${C.KNIGHT_SHIELD_HITS})` : '🛡️ Shield lowered');
    } else {
      if (p.barrierCooldown > 0) {
        UI.showToast(`✨ Barrier recharging (${(p.barrierCooldown / 1000).toFixed(1)}s)`);
        return;
      }
      if (p.mp < C.WIZARD_BARRIER_COST) {
        UI.showToast('✨ Not enough MP for Barrier!');
        return;
      }
      p.barrierHeld = !p.barrierHeld;
      Sound.block();
      UI.showToast(p.barrierHeld ? `✨ Barrier up (${p.barrierHits}/${C.WIZARD_BARRIER_HITS})` : '✨ Barrier down');
    }
  }

  _performSlashVisual(tr, tc, dr = 0, dc = 0, isFire = false) {
    const p = this.player;
    p.attackTimer = 240;
    p.attackCooldown = 200;
    p.attackDash = { dr, dc, timer: 0, duration: 180 };
    p.slashes.push({
      r: tr, c: tc, dir: p.dir,
      timer: 0, duration: 260,
      isPower: false, isFire,
    });
  }

  attack() {
    const p = this.player;
    if (!p || !p.alive || this.paused || p.attackCooldown > 0) return;

    // Wizard: cast fireball if has MP; else weak staff tap
    if (p.playerClass === 'wizard') {
      this._wizardAttack(p);
      return;
    }

    // Knight attack (sword)
    this._knightAttack(p);
  }

  _knightAttack(p) {
    const TT = C.TILE;
    const ppx = p.c * TT + TT / 2, ppy = p.r * TT + TT / 2;

    // Parry check for incoming web
    const parryTarget = this.projectiles.find(
      pr => pr.alive && !pr.reflected && pr.type === 'web' && Math.hypot(pr.x - ppx, pr.y - ppy) < 42
    );
    if (parryTarget) {
      parryTarget.reflected = true;
      parryTarget.vx = -parryTarget.vx * 1.8;
      parryTarget.vy = -parryTarget.vy * 1.8;
      Sound.parry();
      const [dr, dc] = this._dirToDelta(p.dir);
      this._performSlashVisual(p.r + dr, p.c + dc, dr, dc);
      p.addEffect('parry', p.r, p.c, 'PARRY!', '#ffffff');
      UI.showToast('⚔️ Perfect Parry!');
      return;
    }

    let [dr, dc] = this._dirToDelta(p.dir);
    let tr = p.r + dr, tc = p.c + dc;
    let enemy = this.enemies.find(e => e.alive && e.r === tr && e.c === tc);

    if (!enemy) {
      const dirs = [
        { dir: 'up', dr: -1, dc: 0 }, { dir: 'down', dr: 1, dc: 0 },
        { dir: 'left', dr: 0, dc: -1 }, { dir: 'right', dr: 0, dc: 1 },
      ];
      for (const d of dirs) {
        const adj = this.enemies.find(e => e.alive && e.r === p.r + d.dr && e.c === p.c + d.dc);
        if (adj) { p.dir = d.dir; dr = d.dr; dc = d.dc; tr = adj.r; tc = adj.c; enemy = adj; break; }
      }
    }

    this._performSlashVisual(tr, tc, dr, dc);
    if (enemy) {
      this._attackEnemy(enemy, p.dmg, false);
    } else if (this.grid[tr] && this.grid[tr][tc] === C.T_CHEST) {
      this._openChest(tr, tc);
    } else {
      Sound.swing();
    }
  }

  _wizardAttack(p) {
    if (p.mp >= C.WIZARD_FIREBALL_COST) {
      // Cast fireball
      p.mp -= C.WIZARD_FIREBALL_COST;
      const [dr, dc] = this._dirToDelta(p.dir);
      const TT = C.TILE;
      const speed = C.WIZARD_FIREBALL_SPEED;
      const speedX = dc * speed, speedY = dr * speed;
      const fbDmg = 4; // wizard fireball does 4 dmg
      this.projectiles.push(new Projectile('fireball', p.r + dr, p.c + dc, speedX, speedY, fbDmg, p));
      this._performSlashVisual(p.r + dr, p.c + dc, dr, dc, true);
      Sound.fireball(); // fireball whoosh cast
      p.addEffect('cast', p.r, p.c, '🔥', '#ffa500');
    } else {
      // Weak staff melee
      let [dr, dc] = this._dirToDelta(p.dir);
      let tr = p.r + dr, tc = p.c + dc;
      let enemy = this.enemies.find(e => e.alive && e.r === tr && e.c === tc);
      this._performSlashVisual(tr, tc, dr, dc, false);
      if (enemy) {
        this._attackEnemy(enemy, p.dmg, false);
        p.addEffect('cast', p.r, p.c, 'NO MP!', '#ff4444');
      } else {
        Sound.swing();
        p.addEffect('cast', p.r, p.c, 'LOW MP!', '#ff8800');
      }
    }
  }

  // Fire Burst (wizard E key / secondary mobile btn)
  fireBurst() {
    const p = this.player;
    if (!p || !p.alive || this.paused || p.playerClass !== 'wizard') return;
    if (p.fireBurstCooldown > 0) {
      UI.showToast(`🔥 Burst cooling (${(p.fireBurstCooldown / 1000).toFixed(1)}s)`);
      return;
    }
    if (p.mp < C.WIZARD_FIREBURST_COST) {
      UI.showToast(`🔥 Need ${C.WIZARD_FIREBURST_COST} MP for Fire Burst!`);
      return;
    }
    p.mp -= C.WIZARD_FIREBURST_COST;
    p.fireBurstCooldown = 4000;

    const TT = C.TILE;
    const cx = p.c * TT + TT / 2;
    const cy = p.r * TT + TT / 2;

    // AOE: damage all enemies within 2 tiles
    let hits = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dist = Math.abs(e.r - p.r) + Math.abs(e.c - p.c);
      if (dist <= 2) {
        const killed = e.takeDamage(5);
        p.spawnParticles(e.c * TT + TT / 2, e.r * TT + TT / 2, '#ff8c00', 10, 3);
        p.clashes.push({ r: e.r, c: e.c, timer: 0, duration: 400, isPower: true, isFire: true });
        hits++;
        if (killed) {
          Sound.kill();
          p.score += C.SCORE[`enemy_${e.type}`] || 10;
          p.kills[e.type] = (p.kills[e.type] || 0) + 1;
          p.killsThisFloor++;
          p.gainMp(C.WIZARD_MP_REGEN_KILL);
          this.onScoreUpdate && this.onScoreUpdate(p.score);
        }
      }
    }
    this.triggerShake(5, 200);
    Sound.clash();
    // Fire burst ring visual: big slash around player
    p.slashes.push({ r: p.r, c: p.c, dir: p.dir, timer: 0, duration: 450, isPower: true, isFire: true });
    p.spawnParticles(cx, cy, '#ff6600', 20, 4);
    p.addEffect('cast', p.r, p.c, `🔥 BURST! ${hits > 0 ? `(${hits})` : ''}`, '#ff8c00');
    UI.showToast(hits > 0 ? `🔥 Fire Burst hit ${hits} enemies!` : '🔥 Fire Burst!');
  }

  _openChest(r, c) {
    const p = this.player;
    this.grid[r][c] = C.T_CHEST_OPEN;
    const TT = C.TILE;
    p.spawnParticles(c * TT + TT / 2, r * TT + TT / 2, '#ffd700', 12, 2.5);
    Sound.key();

    const roll = Math.random();
    if (roll < 0.5) {
      p.score += 50;
      p.gemsThisFloor++;
      p.addEffect('gem', r, c, '+50 💎', '#4fa3e0');
      UI.showToast('🧰 Chest opened! +50 💎');
    } else {
      p.heal(4);
      p.addEffect('heart', r, c, '+4 HP', '#ff6b6b');
      UI.showToast('🧰 Chest opened! ❤️ +4 HP');
      this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
    }
    this.onScoreUpdate && this.onScoreUpdate(p.score);
  }

  _attackEnemy(enemy, dmg, isFire) {
    const p = this.player;
    const killed = enemy.takeDamage(dmg);
    const TT = C.TILE;
    const cx = enemy.c * TT + TT / 2;
    const cy = enemy.r * TT + TT / 2;

    // Sword whoosh / cast sound on every attack (before impact)
    if (!isFire) Sound.swing();

    p.addEffect('hit', enemy.r, enemy.c, `-${dmg}`, '#ffffff');
    p.spawnParticles(cx, cy, isFire ? '#ff8c00' : '#ffd700', 8, 2.6);
    p.clashes.push({
      r: enemy.r, c: enemy.c,
      timer: 0, duration: 220,
      isPower: false, isFire,
    });

    if (killed) {
      Sound.kill();
      this.triggerShake(enemy.type === 'boss' ? 8 : 5, 150);
      p.spawnParticles(cx, cy, enemy.color, enemy.type === 'boss' ? 24 : 14, 3.2);
      p.score += C.SCORE[`enemy_${enemy.type}`] || 10;
      p.kills[enemy.type] = (p.kills[enemy.type] || 0) + 1;
      p.killsThisFloor++;
      // Wizard: MP on kill
      p.gainMp(C.WIZARD_MP_REGEN_KILL);
      this.onScoreUpdate && this.onScoreUpdate(p.score);

      // ── Potion drops ────────────────────────────────────────
      if (enemy.type === 'boss') {
        // Final boss: guaranteed large potion + gem + heart
        this.items.push(new Item(C.I_POTION_LARGE, enemy.r, enemy.c));
        this.items.push(new Item(C.I_GEM, enemy.r, enemy.c));
        this.items.push(new Item(C.I_HEART, enemy.r, enemy.c - 1));
      } else if (enemy.type === 'armored_skeleton' || enemy.type === 'spider') {
        // Mini-bosses: always drop large potion (+5 HP)
        this.items.push(new Item(C.I_POTION_LARGE, enemy.r, enemy.c));
        UI.showToast('💊 Large Potion dropped! (+5 HP)');
      } else {
        // Regular enemies: 28% chance of small potion (+1 or +2 HP)
        if (Math.random() < 0.28) {
          this.items.push(new Item(C.I_POTION, enemy.r, enemy.c));
        }
      }
    } else {
      Sound.clash();
      this.triggerShake(4, 110);
      const dist = Math.abs(enemy.r - p.r) + Math.abs(enemy.c - p.c);
      if (dist === 1 && enemy.attackCooldown <= 0) {
        setTimeout(() => {
          if (enemy.alive && p.alive && !this.paused && Math.abs(enemy.r - p.r) + Math.abs(enemy.c - p.c) === 1) {
            enemy.strikePlayer(p, (en, d) => {
              if (en.type === 'slime' || en.type === 'spider') Sound.squish();
              else Sound.enemySlash();
              const TT2 = C.TILE;
              if (p.isBlocking()) {
                const res = p.absorbShieldHit();
                Sound.block();
                p.spawnParticles(p.c * TT2 + TT2 / 2, p.r * TT2 + TT2 / 2, '#60a5fa', 10, 2.5);
                p.addEffect('shield', p.r, p.c, res === 'broken' ? 'BROKE!' : `BLOCKED (${p.playerClass === 'wizard' ? p.barrierHits : p.shieldHits})`, '#60a5fa');
                if (res === 'broken') UI.showToast(p.playerClass === 'wizard' ? '✨ Barrier broke!' : '🛡️ Shield broke!');
              } else if (p.takeDamage(d)) {
                Sound.hurt();
                this.triggerShake(5, 160);
                p.addEffect('hurt', p.r, p.c, `-${d}`, '#ff4444');
                if (!p.alive) this._handlePlayerDeath();
              }
            });
          }
        }, 140);
      }
    }
  }

  _collectItem(item) {
    const p = this.player;
    item.collected = true;

    switch (item.type) {
      case C.I_COIN:
        p.score += C.SCORE.coin;
        p.addEffect('coin', item.r, item.c);
        Sound.pickup();
        UI.showToast(`+${C.SCORE.coin} 💰`);
        break;
      case C.I_GEM:
        p.score += C.SCORE.gem;
        p.gemsThisFloor++;
        p.addEffect('gem', item.r, item.c);
        Sound.pickup();
        UI.showToast(`+${C.SCORE.gem} 💎`);
        break;
      case C.I_HEART:
        p.heal(3);
        p.addEffect('heart', item.r, item.c);
        Sound.pickup();
        UI.showToast('❤️ +3 HP');
        this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
        break;
      case C.I_KEY:
        p.keys++;
        Sound.key();
        UI.showToast('🗝️ Key obtained!');
        this.onKeysUpdate && this.onKeysUpdate(p.keys);
        break;
      case C.I_POTION:
        p.heal(2);
        p.addEffect('heart', item.r, item.c, '+2 HP', '#ff9b6b');
        Sound.potion();
        UI.showToast('💊 Potion! +2 HP');
        this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
        break;
      case C.I_POTION_LARGE:
        p.heal(5);
        p.addEffect('heart', item.r, item.c, '+5 HP', '#ff6b6b');
        Sound.potion();
        UI.showToast('🍶 Large Potion! +5 HP');
        this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
        break;
    }
    this.onScoreUpdate && this.onScoreUpdate(p.score);
  }

  _completeFloor() {
    const p = this.player;
    p.score += C.SCORE.floor_clear;
    this.stop();

    if (this.floor >= C.FLOORS) {
      if (this.onVictory) this.onVictory(p.score);
    } else {
      if (this.onLevelComplete) {
        this.onLevelComplete(this.floor + 1, p.killsThisFloor, p.gemsThisFloor);
      }
      p.gemsThisFloor = 0;
      p.killsThisFloor = 0;
    }
  }

  // ── Rendering ───────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const TT = C.TILE;
    const p = this.player;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = C.COL.UI_BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    const zoom = C.CAMERA_ZOOM || 1;
    ctx.scale(zoom, zoom);
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    }
    ctx.translate(-this.camX + shakeX, -this.camY + shakeY);

    // ── Draw Tiles ──
    // Full dungeon always visible — no hidden fog in main view.
    // Minimap keeps its own discovery fog separately.
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const wx = c * TT, wy = r * TT;
        const k = r * 1000 + c;
        const isVis = this.visible.has(k);
        const isExp = this.explored.has(k);

        const tile = this.grid[r][c];
        switch (tile) {
          case C.T_WALL:       Sprites.drawWall(ctx, wx, wy); break;
          case C.T_FLOOR:      Sprites.drawFloor(ctx, wx, wy); break;
          case C.T_TORCH:      Sprites.drawTorch(ctx, wx, wy, isVis ? this.globalFrame : 0); break;
          case C.T_DOOR:       Sprites.drawDoor(ctx, wx, wy, true); break;
          case C.T_OPEN:       Sprites.drawDoor(ctx, wx, wy, false); break;
          case C.T_CHEST:      Sprites.drawChest(ctx, wx, wy, false); break;
          case C.T_CHEST_OPEN: Sprites.drawChest(ctx, wx, wy, true); break;
          case C.T_SAVEPOINT:  Sprites.drawSavePoint(ctx, wx, wy, isVis ? this.globalFrame : 0); break;
          case C.T_LORE:       Sprites.drawLoreTablet(ctx, wx, wy, isVis ? this.globalFrame : 0); break;
          default: Sprites.drawFloor(ctx, wx, wy);
        }

        // Soft darkness on areas not currently in line-of-sight
        // (not fully black — dungeon structure always readable)
        if (!isVis) {
          ctx.fillStyle = isExp
            ? 'rgba(0,0,0,0.42)'   // explored but not in current vision: subtle dim
            : 'rgba(0,0,0,0.70)';  // never visited: darker, but dungeon still visible
          ctx.fillRect(wx, wy, TT, TT);
        }
      }
    }

    // ── Draw Items ──
    this.items.forEach(item => {
      if (item.collected) return;
      const k = item.r * 1000 + item.c;
      // Show items in explored areas so player can spot drops from afar
      if (!this.explored.has(k)) return;
      Sprites.drawItem(ctx, item.c * TT, item.r * TT, item.type, item.frame);
    });

    // ── Draw Enemies ──
    this.enemies.forEach(e => {
      if (!e.alive) return;
      const k = e.r * 1000 + e.c;
      if (!this.visible.has(k)) return;
      const ex = e.c * TT, ey = e.r * TT;
      let edx = 0, edy = 0;
      if (e.attackDash) {
        const dp = Math.sin((e.attackDash.timer / e.attackDash.duration) * Math.PI);
        edx = e.attackDash.dc * dp * 14;
        edy = e.attackDash.dr * dp * 14;
      }
      switch (e.type) {
        case 'slime':            Sprites.drawSlime(ctx, ex, ey, e.frame, e.hp, e.maxHp, edx, edy); break;
        case 'skeleton':         Sprites.drawSkeleton(ctx, ex, ey, e.frame, e.hp, e.maxHp, edx, edy); break;
        case 'armored_skeleton': Sprites.drawArmoredSkeleton(ctx, ex, ey, e.frame, e.hp, e.maxHp, edx, edy); break;
        case 'spider':           Sprites.drawSpider(ctx, ex, ey, e.frame, e.hp, e.maxHp, e.stunTimer > 500, edx, edy); break;
        case 'ghost':            Sprites.drawGhost(ctx, ex + edx, ey + edy, e.frame, e.hp, e.maxHp); break;
        case 'boss':             Sprites.drawBoss(ctx, ex + edx, ey + edy, e.frame, e.hp, e.maxHp); break;
      }
      if (e.hitFlashTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, e.hitFlashTimer / 150)})`;
        ctx.fillRect(ex + edx + 2, ey + edy + 2, TT - 4, TT - 4);
      }
    });

    // ── Draw Projectiles ──
    this.projectiles.forEach(proj => {
      if (!proj.alive) return;
      Sprites.drawProjectile(ctx, proj.x, proj.y, proj.type, proj.frame);
    });

    // ── Draw Player ──
    if (p) {
      const px2 = p.c * TT, py2 = p.r * TT;
      let pdx = 0, pdy = 0;
      if (p.attackDash) {
        const dp = Math.sin((p.attackDash.timer / p.attackDash.duration) * Math.PI);
        pdx = p.attackDash.dc * dp * 16;
        pdy = p.attackDash.dr * dp * 16;
      }
      if (!p.invincible || this.globalFrame % 2 === 0) {
        const atkProg = p.attackTimer > 0 ? 1 - (p.attackTimer / 240) : 0;
        if (p.playerClass === 'wizard') {
          Sprites.drawWizard(ctx, px2, py2, p.dir, p.frame, p.barrierActive, atkProg, pdx, pdy, p.rootedTimer > 0, p.mp, p.maxMp);
        } else {
          Sprites.drawKnight(ctx, px2, py2, p.dir, p.frame, p.shieldActive, atkProg, pdx, pdy, p.rootedTimer > 0);
        }
      }

      p.slashes.forEach(s => {
        Sprites.drawSlash(ctx, s.c * TT, s.r * TT, s.dir, s.timer / s.duration, s.isPower, s.isFire);
      });
      p.clashes.forEach(cl => {
        Sprites.drawClash(ctx, cl.c * TT, cl.r * TT, cl.timer / cl.duration, cl.isPower, cl.isFire);
      });

      Sprites.drawParticles(ctx, p.particles);

      p.effects.forEach(eff => {
        const ex2 = eff.c * TT, ey2 = eff.r * TT;
        const label = eff.text || _effectLabel(eff.type);
        Sprites.drawPickupEffect(ctx, ex2 + 6, ey2 + 6, label, eff.frame, eff.color || '#ffd700');
      });
    }

    ctx.restore();

    // Vignette
    const vig = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, Math.min(this.canvas.width, this.canvas.height) * 0.25,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this._renderMinimap();
  }

  _renderMinimap() {
    const mc = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    const tw = mw / this.cols;
    const th = mh / this.rows;

    mc.clearRect(0, 0, mw, mh);
    mc.fillStyle = '#05050a';
    mc.fillRect(0, 0, mw, mh);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const k = r * 1000 + c;
        if (!this.explored.has(k)) continue;
        const tile = this.grid[r][c];
        const isVis = this.visible.has(k);
        if (tile === C.T_WALL) mc.fillStyle = isVis ? C.COL.MINIMAP_WALL : '#111120';
        else if (tile === C.T_DOOR || tile === C.T_OPEN) mc.fillStyle = C.COL.MINIMAP_EXIT;
        else mc.fillStyle = isVis ? C.COL.MINIMAP_FLOOR : '#251f40';
        mc.fillRect(c * tw, r * th, tw, th);
      }
    }

    this.items.forEach(i => {
      if (i.collected) return;
      const k = i.r * 1000 + i.c;
      if (!this.explored.has(k)) return;
      mc.fillStyle = i.type === C.I_KEY ? '#ffd700'
                   : (i.type === C.I_POTION ? '#ff6b8a' : i.type === C.I_POTION_LARGE ? '#c084fc' : C.COL.MINIMAP_ITEM);
      mc.fillRect(i.c * tw + 1, i.r * th + 1, tw - 1, th - 1);
    });

    this.enemies.forEach(e => {
      if (!e.alive) return;
      const k = e.r * 1000 + e.c;
      if (!this.visible.has(k)) return;
      mc.fillStyle = e.type === 'boss' ? '#ff0000' : C.COL.MINIMAP_ENEMY;
      mc.fillRect(e.c * tw, e.r * th, tw, th);
    });

    if (this.player) {
      mc.fillStyle = this.playerClass === 'wizard' ? '#c084fc' : C.COL.MINIMAP_PLAYER;
      mc.fillRect(this.player.c * tw - 1, this.player.r * th - 1, tw + 2, th + 2);
    }
  }

  renderExpandedMap(targetCanvas) {
    if (!targetCanvas || !this.grid) return;
    const mc = targetCanvas.getContext('2d');
    const mw = targetCanvas.width, mh = targetCanvas.height;
    const tw = mw / this.cols, th = mh / this.rows;

    mc.clearRect(0, 0, mw, mh);
    mc.fillStyle = '#07070e';
    mc.fillRect(0, 0, mw, mh);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const k = r * 1000 + c;
        if (!this.explored.has(k)) continue;
        const tile = this.grid[r][c];
        const isVis = this.visible.has(k);
        if (tile === C.T_WALL) mc.fillStyle = isVis ? '#1e1e32' : '#121222';
        else if (tile === C.T_DOOR || tile === C.T_OPEN) mc.fillStyle = '#2dc653';
        else if (tile === C.T_SAVEPOINT) mc.fillStyle = '#c084fc';
        else if (tile === C.T_LORE) mc.fillStyle = '#facc15';
        else if (tile === C.T_CHEST) mc.fillStyle = '#b45309';
        else mc.fillStyle = isVis ? '#433b63' : '#2a2442';
        mc.fillRect(c * tw, r * th, Math.ceil(tw), Math.ceil(th));
      }
    }

    this.items.forEach(i => {
      if (i.collected) return;
      const k = i.r * 1000 + i.c;
      if (!this.explored.has(k)) return;
      mc.fillStyle = i.type === C.I_HEART ? '#ef4444'
                   : i.type === C.I_POTION ? '#ff6b8a'
                   : i.type === C.I_POTION_LARGE ? '#c084fc'
                   : '#ffd700';
      mc.fillRect(i.c * tw + tw * 0.25, i.r * th + th * 0.25, tw * 0.5, th * 0.5);
    });

    this.enemies.forEach(e => {
      if (!e.alive) return;
      const k = e.r * 1000 + e.c;
      if (!this.visible.has(k)) return;
      mc.fillStyle = (e.type === 'boss' || e.type === 'armored_skeleton' || e.type === 'spider') ? '#ff2244' : '#fb7185';
      mc.fillRect(e.c * tw + tw * 0.15, e.r * th + th * 0.15, tw * 0.7, th * 0.7);
    });

    if (this.player) {
      mc.fillStyle = this.playerClass === 'wizard' ? '#c084fc' : '#38bdf8';
      mc.fillRect(this.player.c * tw, this.player.r * th, tw, th);
      mc.strokeStyle = '#ffffff';
      mc.lineWidth = 1.5;
      mc.strokeRect(this.player.c * tw, this.player.r * th, tw, th);
    }
  }

  _updateCamera() {
    const p = this.player;
    if (!p) return;
    const TT = C.TILE;
    const zoom = C.CAMERA_ZOOM || 1;
    const viewW = this.canvas.width / zoom;
    const viewH = this.canvas.height / zoom;
    const mapW = this.cols * TT;
    const mapH = this.rows * TT;
    const targetX = p.c * TT - viewW / 2 + TT / 2;
    const targetY = p.r * TT - viewH / 2 + TT / 2;

    this.camX = mapW <= viewW ? (mapW - viewW) / 2 : Math.max(0, Math.min(targetX, mapW - viewW));
    this.camY = mapH <= viewH ? (mapH - viewH) / 2 : Math.max(0, Math.min(targetY, mapH - viewH));
  }

  _handleResize() {
    const wrap = document.getElementById('game-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const w = rect.width || wrap.offsetWidth || window.innerWidth;
    const h = rect.height || wrap.offsetHeight || (window.innerHeight - 60);
    if (w > 0) this.canvas.width = w;
    if (h > 0) this.canvas.height = h;
    this.minimapCanvas.width = this.minimapCanvas.offsetWidth || 100;
    this.minimapCanvas.height = this.minimapCanvas.offsetHeight || 100;
  }

  _updateHUD() {
    const p = this.player;
    if (!p) return;
    this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
    this.onScoreUpdate && this.onScoreUpdate(p.score);
    this.onFloorUpdate && this.onFloorUpdate(this.floor);
    this.onKeysUpdate && this.onKeysUpdate(p.keys);
    if (this.onMpUpdate && p.playerClass === 'wizard') this.onMpUpdate(p.mp, p.maxMp);
  }

  keyDown(key) {
    if (!this.keys.has(key)) this.tapKeys.add(key);
    this.keys.add(key);
  }
  keyUp(key) { this.keys.delete(key); }
  dpadPress(dr, dc) { this.moveQueue.push({ r: dr, c: dc }); }
}

function _effectLabel(type) {
  switch(type) {
    case 'coin': return '+10';
    case 'gem': return '+50';
    case 'heart': return '+HP';
    case 'hit': return '💥';
    default: return '';
  }
}
