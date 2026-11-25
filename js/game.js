// ============================================================
// game.js — Core game loop, state management, rendering
// ============================================================

class Game {
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');

    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.animFrame = null;

    // Game state
    this.floor = 1;
    this.player = null;
    this.enemies = [];
    this.items = [];
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

    // Set default canvas size immediately so we always have something to draw on
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
    this.onPowerupUpdate = null;
    this.onFloorBanner = null;
    this.onLore = null;
    this.onSave = null;
    this.lastSavedPos = null;

    // Resize
    this._handleResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._handleResize);
  }

  // ── Lifecycle ───────────────────────────────────────────────
  startFloor(floor) {
    this.floor = floor;
    const isBoss = (floor === C.FLOORS);

    // Generate maze
    this.grid = MazeGen.generate(this.rows, this.cols, floor);
    this.exitPos = MazeGen.findExit(this.grid, this.rows, this.cols);
    this.exitUnlocked = false;

    // Reset explored (carry explored cells is too easy — reset each floor)
    this.explored = new Set();
    this.visible = new Set();

    // Pre-compute initial visibility so first render shows something immediately
    const initVis = MazeGen.computeVisibility(this.grid, this.rows, this.cols, 1, 1, C.VISION_RADIUS);
    this.visible = initVis.visible;
    initVis.explored.forEach(k => this.explored.add(k));

    // Spawn player at (1,1)
    if (!this.player || floor === 1) {
      this.player = new Player(1, 1);
    } else {
      this.player.r = 1; this.player.c = 1;
      this.player.effects = [];
      // Heal 2 on floor transition
      this.player.heal(2);
    }

    // Spawn enemies & items
    this.enemies = EntityFactory.spawnEnemies(this.grid, this.rows, this.cols, floor, { r: 1, c: 1 }, isBoss);
    this.items = EntityFactory.spawnItems(this.grid, this.rows, this.cols, floor, { r: 1, c: 1 }, this.enemies);

    // Resize canvas
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
      player: {
        r: p.r, c: p.c, hp: p.hp, maxHp: p.maxHp,
        keys: p.keys, score: p.score, kills: p.kills,
        dir: p.dir, powerup: p.powerup, powerupTimer: p.powerupTimer,
        gemsThisFloor: p.gemsThisFloor, killsThisFloor: p.killsThisFloor,
      },
      enemies: this.enemies.filter(e => e.alive).map(e => ({
        type: e.type, r: e.r, c: e.c, hp: e.hp, maxHp: e.maxHp,
        dmg: e.dmg, moveInterval: e.moveInterval, isBoss: e instanceof Boss,
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

    const pd = data.player;
    const p = new Player(pd.r, pd.c);
    p.hp = pd.hp;
    p.maxHp = pd.maxHp;
    p.keys = pd.keys;
    p.score = pd.score;
    p.kills = pd.kills || p.kills;
    p.dir = pd.dir || 'down';
    p.powerup = pd.powerup || null;
    p.powerupTimer = pd.powerupTimer || 0;
    p.gemsThisFloor = pd.gemsThisFloor || 0;
    p.killsThisFloor = pd.killsThisFloor || 0;
    this.player = p;

    this.enemies = (data.enemies || []).map(ed => {
      const e = ed.isBoss ? new Boss(ed.r, ed.c, this.floor) : new Enemy(ed.type, ed.r, ed.c, this.floor);
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
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
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
    const dt = Math.min(timestamp - this.lastTime, 100); // cap at 100ms
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
    if (!p || !p.alive) return;

    // Frame counter
    this.frameTimer += dt;
    if (this.frameTimer > 120) { this.globalFrame++; this.frameTimer = 0; }

    // Player update
    p.update(dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    // Powerup HUD
    if (this.onPowerupUpdate) this.onPowerupUpdate(p.powerup, p.powerupTimer / p.powerupDuration);

    // Handle movement
    this._handleInput(dt);

    // Update enemies & detect player hurt for feedback
    const prevHp = p.hp;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e instanceof Boss) {
        e.update(dt, p, this.grid, this.rows, this.cols, (r, c) => {
          this._spawnMinion(r, c);
        });
      } else {
        e.update(dt, p, this.grid, this.rows, this.cols);
      }
    }
    if (p.hp < prevHp) {
      Sound.hurt();
      this.triggerShake(5, 160);
      p.addEffect('hurt', p.r, p.c, `-${prevHp - p.hp}`, '#ff4444');
    }

    // Update items
    this.items.forEach(i => i.update(dt));

    // Check item pickup
    const collidedItems = this.items.filter(i => !i.collected && i.r === p.r && i.c === p.c);
    collidedItems.forEach(item => this._collectItem(item));

    // Check player death
    if (!p.alive) {
      this.stop();
      if (this.onGameOver) this.onGameOver(this.floor, p.score);
      return;
    }

    // Check exit
    if (this.exitUnlocked && p.r === this.exitPos.r && p.c === this.exitPos.c) {
      this._completeFloor();
      return;
    }

    // Visibility
    const vis = MazeGen.computeVisibility(this.grid, this.rows, this.cols, p.r, p.c, C.VISION_RADIUS);
    this.visible = vis.visible;
    vis.explored.forEach(k => this.explored.add(k));

    // Camera
    this._updateCamera();
    // HUD
    if (this.onHpUpdate) this.onHpUpdate(p.hp, p.maxHp);
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

    // Mobile move queue
    if (this.moveQueue.length > 0 && dr === 0 && dc === 0) {
      const m = this.moveQueue.shift();
      dr = m.r; dc = m.c;
    }

    if (dr === 0 && dc === 0) return;

    this._tryMove(p, dr, dc);
    this.lastMoveTime = now;
  }

  _tryMove(p, dr, dc) {
    const nr = p.r + dr, nc = p.c + dc;

    // Check enemy at target (bump-to-attack)
    const enemy = this.enemies.find(e => e.alive && e.r === nr && e.c === nc);
    if (enemy) {
      if (dr < 0) p.dir = 'up';
      else if (dr > 0) p.dir = 'down';
      else if (dc < 0) p.dir = 'left';
      else if (dc > 0) p.dir = 'right';
      this._performSlashVisual(nr, nc);
      this._attackEnemy(enemy);
      return;
    }

    // Check chest
    if (this.grid[nr][nc] === C.T_CHEST) {
      this._openChest(nr, nc);
      return;
    }

    // Check exit door (locked)
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

    // Check walkability
    if (!MazeGen.isWalkable(this.grid, this.rows, this.cols, nr, nc)) return;

    // Move player
    p.r = nr; p.c = nc;

    // Update dir
    if (dr < 0) p.dir = 'up';
    else if (dr > 0) p.dir = 'down';
    else if (dc < 0) p.dir = 'left';
    else p.dir = 'right';

    // Check Save Point Shrine
    if (this.grid[nr][nc] === C.T_SAVEPOINT) {
      const posKey = `${nr},${nc}`;
      if (this.lastSavedPos !== posKey) {
        this.lastSavedPos = posKey;
        this._activateSavePoint(nr, nc);
      }
    } else {
      this.lastSavedPos = null;
    }

    // Check Lore Tablet
    if (this.grid[nr][nc] === C.T_LORE) {
      this._readLoreTablet(nr, nc);
    }
  }

  _activateSavePoint(r, c) {
    const p = this.player;
    p.heal(2);
    const T = C.TILE;
    p.spawnParticles(c * T + T / 2, r * T + T / 2, '#c084fc', 16, 2.5);
    p.addEffect('save', r, c, 'SAVED!', '#c084fc');
    Sound.save();
    this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
    this.onSave && this.onSave(this.serialize());
    UI.showToast('🔮 Shrine touched — Progress Saved & +2 HP!');
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

  _performSlashVisual(tr, tc) {
    const p = this.player;
    p.attackTimer = 240;
    p.attackCooldown = 200;
    p.slashes.push({
      r: tr,
      c: tc,
      dir: p.dir,
      timer: 0,
      duration: 260,
      isPower: p.powerup === 'sword',
    });
  }

  attack() {
    const p = this.player;
    if (!p || !p.alive || this.paused || p.attackCooldown > 0) return;

    let [dr, dc] = this._dirToDelta(p.dir);
    let tr = p.r + dr;
    let tc = p.c + dc;
    let enemy = this.enemies.find(e => e.alive && e.r === tr && e.c === tc);

    // If no enemy in facing dir, auto-target an adjacent enemy if one is next to player
    if (!enemy) {
      const dirs = [
        { dir: 'up', dr: -1, dc: 0 },
        { dir: 'down', dr: 1, dc: 0 },
        { dir: 'left', dr: 0, dc: -1 },
        { dir: 'right', dr: 0, dc: 1 },
      ];
      for (const d of dirs) {
        const adj = this.enemies.find(e => e.alive && e.r === p.r + d.dr && e.c === p.c + d.dc);
        if (adj) {
          p.dir = d.dir;
          tr = adj.r;
          tc = adj.c;
          enemy = adj;
          break;
        }
      }
    }

    this._performSlashVisual(tr, tc);
    if (enemy) {
      this._attackEnemy(enemy);
    } else if (this.grid[tr] && this.grid[tr][tc] === C.T_CHEST) {
      this._openChest(tr, tc);
    } else {
      Sound.swing();
    }
  }

  _openChest(r, c) {
    const p = this.player;
    this.grid[r][c] = C.T_CHEST_OPEN;
    const T = C.TILE;
    p.spawnParticles(c * T + T / 2, r * T + T / 2, '#ffd700', 12, 2.5);
    Sound.key();

    const roll = Math.random();
    if (roll < 0.35) {
      p.score += 50;
      p.gemsThisFloor++;
      p.addEffect('gem', r, c, '+50 💎', '#4fa3e0');
      UI.showToast('🧰 Chest opened! +50 💎');
    } else if (roll < 0.65) {
      p.heal(4);
      p.addEffect('heart', r, c, '+4 HP', '#ff6b6b');
      UI.showToast('🧰 Chest opened! ❤️ +4 HP');
      this.onHpUpdate && this.onHpUpdate(p.hp, p.maxHp);
    } else {
      const buffs = ['speed', 'shield', 'sword'];
      const buff = buffs[Math.floor(Math.random() * buffs.length)];
      p.activatePowerup(buff);
      const labels = { speed: '⚡ Speed!', shield: '🛡️ Shield!', sword: '⚔️ Power Sword!' };
      p.addEffect('buff', r, c, labels[buff], '#ffd700');
      UI.showToast(`🧰 Chest opened! ${labels[buff]}`);
    }
    this.onScoreUpdate && this.onScoreUpdate(p.score);
  }

  _attackEnemy(enemy) {
    const p = this.player;
    const dmg = p.dmg;
    const killed = enemy.takeDamage(dmg);
    const T = C.TILE;
    const cx = enemy.c * T + T / 2;
    const cy = enemy.r * T + T / 2;

    p.addEffect('hit', enemy.r, enemy.c, `-${dmg}`, p.powerup === 'sword' ? '#ff5533' : '#ffffff');
    p.spawnParticles(cx, cy, '#ffd700', 8, 2.6);
    p.clashes.push({
      r: enemy.r,
      c: enemy.c,
      timer: 0,
      duration: 220,
      isPower: p.powerup === 'sword',
    });

    if (killed) {
      Sound.kill();
      this.triggerShake(enemy.type === 'boss' ? 8 : 5, 150);
      p.spawnParticles(cx, cy, enemy.color, enemy.type === 'boss' ? 24 : 14, 3.2);
      p.score += C.SCORE[`enemy_${enemy.type}`] || 10;
      p.kills[enemy.type] = (p.kills[enemy.type] || 0) + 1;
      p.killsThisFloor++;
      this.onScoreUpdate && this.onScoreUpdate(p.score);

      if (enemy.type === 'boss') {
        UI.showToast('👑 MALAKOR DEFEATED!');
        // Drop lots of loot
        this.items.push(new Item(C.I_GEM, enemy.r, enemy.c));
        this.items.push(new Item(C.I_HEART, enemy.r, enemy.c - 1));
      }
    } else {
      Sound.clash();
      this.triggerShake(4, 110);
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
      case C.I_SPEED:
        p.activatePowerup('speed');
        Sound.pickup();
        UI.showToast('⚡ Speed boost!');
        break;
      case C.I_SHIELD:
        p.activatePowerup('shield');
        Sound.pickup();
        UI.showToast('🛡️ Shield activated!');
        break;
      case C.I_SWORD:
        p.activatePowerup('sword');
        Sound.pickup();
        UI.showToast('⚔️ Power sword!');
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
    const T = C.TILE;
    const p = this.player;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dark background
    ctx.fillStyle = C.COL.UI_BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    }
    ctx.translate(-this.camX + shakeX, -this.camY + shakeY);

    // ── Draw Tiles ──
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const wx = c * T, wy = r * T;
        const k = r * 1000 + c;
        const isVis = this.visible.has(k);
        const isExp = this.explored.has(k);

        if (!isExp) continue; // skip unexplored

        const tile = this.grid[r][c];
        switch (tile) {
          case C.T_WALL:   Sprites.drawWall(ctx, wx, wy); break;
          case C.T_FLOOR:  Sprites.drawFloor(ctx, wx, wy); break;
          case C.T_TORCH:  Sprites.drawTorch(ctx, wx, wy, this.globalFrame); break;
          case C.T_DOOR:   Sprites.drawDoor(ctx, wx, wy, true); break;
          case C.T_OPEN:   Sprites.drawDoor(ctx, wx, wy, false); break;
          case C.T_CHEST:      Sprites.drawChest(ctx, wx, wy, false); break;
          case C.T_CHEST_OPEN: Sprites.drawChest(ctx, wx, wy, true); break;
          case C.T_SAVEPOINT:  Sprites.drawSavePoint(ctx, wx, wy, this.globalFrame); break;
          case C.T_LORE:       Sprites.drawLoreTablet(ctx, wx, wy, this.globalFrame); break;
          default: Sprites.drawFloor(ctx, wx, wy);
        }

        // Fog
        Sprites.drawFogTile(ctx, wx, wy, isExp, isVis);
      }
    }

    // ── Draw Items ──
    this.items.forEach(item => {
      if (item.collected) return;
      const k = item.r * 1000 + item.c;
      if (!this.visible.has(k)) return;
      Sprites.drawItem(ctx, item.c * T, item.r * T, item.type, item.frame);
    });

    // ── Draw Enemies ──
    this.enemies.forEach(e => {
      if (!e.alive) return;
      const k = e.r * 1000 + e.c;
      if (!this.visible.has(k)) return;
      const ex = e.c * T, ey = e.r * T;
      switch (e.type) {
        case 'slime':    Sprites.drawSlime(ctx, ex, ey, e.frame, e.hp, e.maxHp); break;
        case 'skeleton': Sprites.drawSkeleton(ctx, ex, ey, e.frame, e.hp, e.maxHp); break;
        case 'ghost':    Sprites.drawGhost(ctx, ex, ey, e.frame, e.hp, e.maxHp); break;
        case 'boss':     Sprites.drawBoss(ctx, ex, ey, e.frame, e.hp, e.maxHp); break;
      }
      if (e.hitFlashTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, e.hitFlashTimer / 150)})`;
        ctx.fillRect(ex + 2, ey + 2, T - 4, T - 4);
      }
    });

    // ── Draw Player ──
    if (p) {
      const px2 = p.c * T, py2 = p.r * T;
      // Blink when invincible
      if (!p.invincible || this.globalFrame % 2 === 0) {
        const atkProg = p.attackTimer > 0 ? 1 - (p.attackTimer / 240) : 0;
        Sprites.drawPlayer(ctx, px2, py2, p.dir, p.frame, p.powerup, atkProg);
      }

      // Draw sword slashes & sideways clash impacts
      p.slashes.forEach(s => {
        Sprites.drawSlash(ctx, s.c * T, s.r * T, s.dir, s.timer / s.duration, s.isPower);
      });
      p.clashes.forEach(cl => {
        Sprites.drawClash(ctx, cl.c * T, cl.r * T, cl.timer / cl.duration, cl.isPower);
      });

      // Draw particles
      Sprites.drawParticles(ctx, p.particles);

      // Draw floating effects
      p.effects.forEach(eff => {
        const ex2 = eff.c * T, ey2 = eff.r * T;
        const label = eff.text || _effectLabel(eff.type);
        Sprites.drawPickupEffect(ctx, ex2 + 6, ey2 + 6, label, eff.frame, eff.color || '#ffd700');
      });
    }

    ctx.restore();

    // Moody torchlight vignette around viewport
    const vig = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, Math.min(this.canvas.width, this.canvas.height) * 0.25,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // ── Minimap ──
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

        if (tile === C.T_WALL) {
          mc.fillStyle = isVis ? C.COL.MINIMAP_WALL : '#111120';
        } else if (tile === C.T_DOOR || tile === C.T_OPEN) {
          mc.fillStyle = C.COL.MINIMAP_EXIT;
        } else {
          mc.fillStyle = isVis ? C.COL.MINIMAP_FLOOR : '#251f40';
        }
        mc.fillRect(c * tw, r * th, tw, th);
      }
    }

    // Items
    this.items.forEach(i => {
      if (i.collected) return;
      const k = i.r * 1000 + i.c;
      if (!this.explored.has(k)) return;
      mc.fillStyle = i.type === C.I_KEY ? '#ffd700' : C.COL.MINIMAP_ITEM;
      mc.fillRect(i.c * tw + 1, i.r * th + 1, tw - 1, th - 1);
    });

    // Enemies
    this.enemies.forEach(e => {
      if (!e.alive) return;
      const k = e.r * 1000 + e.c;
      if (!this.visible.has(k)) return;
      mc.fillStyle = e.type === 'boss' ? '#ff0000' : C.COL.MINIMAP_ENEMY;
      mc.fillRect(e.c * tw, e.r * th, tw, th);
    });

    // Player dot
    if (this.player) {
      mc.fillStyle = C.COL.MINIMAP_PLAYER;
      mc.fillRect(this.player.c * tw - 1, this.player.r * th - 1, tw + 2, th + 2);
    }
  }

  // ── Camera ──────────────────────────────────────────────────
  _updateCamera() {
    const p = this.player;
    if (!p) return;
    const T = C.TILE;
    const mapW = this.cols * T;
    const mapH = this.rows * T;
    const targetX = p.c * T - this.canvas.width / 2 + T / 2;
    const targetY = p.r * T - this.canvas.height / 2 + T / 2;

    if (mapW <= this.canvas.width) {
      // Map narrower than canvas — center it
      this.camX = (mapW - this.canvas.width) / 2;
    } else {
      this.camX = Math.max(0, Math.min(targetX, mapW - this.canvas.width));
    }

    if (mapH <= this.canvas.height) {
      // Map shorter than canvas — center it
      this.camY = (mapH - this.canvas.height) / 2;
    } else {
      this.camY = Math.max(0, Math.min(targetY, mapH - this.canvas.height));
    }
  }

  _handleResize() {
    const wrap = document.getElementById('game-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    // Use offsetWidth/Height as fallback when getBoundingClientRect returns 0
    // (happens when screen is not yet visible in the DOM)
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
  }

  // ── Input API (called by main.js) ───────────────────────────
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
