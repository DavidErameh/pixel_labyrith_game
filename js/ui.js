// ============================================================
// ui.js — UI helpers: HUD updates, overlays, leaderboard, toast
// ============================================================

const UI = (() => {
  let toastTimer = null;

  function showToast(msg, duration = 2200) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
  }

  function updateHp(hp, maxHp) {
    const bar = document.getElementById('health-bar');
    const txt = document.getElementById('hp-text');
    if (!bar || !txt) return;
    const pct = Math.max(0, hp / maxHp * 100);
    bar.style.width = pct + '%';
    bar.style.background = pct > 50 ? 'linear-gradient(90deg,#2dc653,#a0ffa0)'
      : pct > 25 ? 'linear-gradient(90deg,#ffd700,#ffea70)'
      : 'linear-gradient(90deg,#e63946,#ff6b6b)';
    txt.textContent = `${hp}/${maxHp}`;
  }

  function updateMp(mp, maxMp) {
    const bar  = document.getElementById('mp-bar');
    const txt  = document.getElementById('mp-text');
    const wrap = document.getElementById('hud-mp');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    if (!bar || !txt) return;
    const pct = Math.max(0, mp / maxMp * 100);
    bar.style.width = pct + '%';
    bar.style.background = pct > 30
      ? 'linear-gradient(90deg,#6d28d9,#a78bfa)'
      : 'linear-gradient(90deg,#dc2626,#f87171)';
    txt.textContent = `${Math.floor(mp)}/${maxMp}`;
    // Flash when critically low
    wrap.classList.toggle('mp-low', pct < 20);
  }

  function updateScore(score) {
    const el = document.getElementById('score-val');
    if (el) el.textContent = score;
  }

  function updateFloor(floor) {
    const el = document.getElementById('hud-level');
    if (el) el.textContent = floor;
  }

  function updateKeys(keys) {
    const el = document.getElementById('keys-val');
    if (el) el.textContent = keys;
  }

  function refreshIcons(root) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons(root ? { root } : undefined);
    }
  }

  let _lastShieldIcon = '';
  // isWizard = show barrier display instead of knight shield
  function updateShield(active, hits, cooldown, isWizard = false) {
    const wrap   = document.getElementById('hud-shield');
    const icon   = document.getElementById('shield-icon');
    const status = document.getElementById('shield-status');
    if (!wrap || !status) return;

    wrap.classList.remove('active', 'cooldown', 'wizard-shield');

    const wantIcon = isWizard ? 'sparkles' : 'shield';
    if (icon && _lastShieldIcon !== wantIcon) {
      _lastShieldIcon = wantIcon;
      icon.innerHTML = `<i data-lucide="${wantIcon}"></i>`;
      refreshIcons(icon);
    }

    if (isWizard) {
      wrap.classList.add('wizard-shield');
      const maxH = C.WIZARD_BARRIER_HITS;
      if (cooldown > 0) {
        wrap.classList.add('cooldown');
        status.textContent = `CD ${(cooldown / 1000).toFixed(1)}s`;
      } else if (active) {
        wrap.classList.add('active');
        status.textContent = `BARRIER (${hits}/${maxH})`;
      } else {
        status.textContent = `ARCANE (${hits}/${maxH})`;
      }
    } else {
      const maxH = C.KNIGHT_SHIELD_HITS;
      if (cooldown > 0) {
        wrap.classList.add('cooldown');
        status.textContent = `CD ${(cooldown / 1000).toFixed(1)}s`;
      } else if (active) {
        wrap.classList.add('active');
        status.textContent = `ACTIVE (${hits}/${maxH})`;
      } else {
        status.textContent = `READY (${hits}/${maxH})`;
      }
    }
  }

  // Show/hide class badge in HUD center
  function setClassBadge(playerClass) {
    const badge = document.getElementById('hud-class-badge');
    if (!badge) return;
    const iconName = playerClass === 'wizard' ? 'wand-2' : 'swords';
    badge.innerHTML = `<i data-lucide="${iconName}"></i>`;
    badge.title = playerClass === 'wizard' ? 'Wizard' : 'Knight';
    refreshIcons(badge);
  }

  // Hide MP bar when playing as knight
  function hideMpBar() {
    const wrap = document.getElementById('hud-mp');
    if (wrap) wrap.classList.add('hidden');
  }

  function showGameOver(floor, score, hasSave = false) {
    document.getElementById('go-floor').textContent = floor;
    document.getElementById('go-score').textContent = score;
    const loadBtn = document.getElementById('btn-load-save');
    if (loadBtn) loadBtn.classList.toggle('hidden', !hasSave);
    document.getElementById('overlay-gameover').classList.remove('hidden');
  }

  function showFloorBanner() {
    // Generic floor pop-ups removed in V2
  }

  const CLEARED_KEY = 'pixelLabyrinth_cleared';
  function getClearedLabyrinths() {
    try { return JSON.parse(localStorage.getItem(CLEARED_KEY)) || []; }
    catch { return []; }
  }
  function markLabyrinthCleared(id) {
    const list = getClearedLabyrinths();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(CLEARED_KEY, JSON.stringify(list));
    }
  }
  function renderWorldMap(onSelectLabyrinth) {
    const container = document.getElementById('worldmap-list');
    if (!container) return;
    const cleared = getClearedLabyrinths();
    container.innerHTML = '';
    (C.LABYRINTHS || []).forEach(lab => {
      const isCleared = cleared.includes(lab.id);
      const div = document.createElement('div');
      div.className = `worldmap-node ${lab.unlocked ? 'unlocked' : 'locked'}${isCleared ? ' cleared' : ''}`;
      const badgeText = !lab.unlocked
        ? '<i data-lucide="lock"></i> LOCKED'
        : (isCleared ? '<i data-lucide="check"></i> CLEARED' : '<i data-lucide="play"></i> ENTER');
      div.innerHTML = `
        <div class="worldmap-node-left">
          <div class="worldmap-node-name">${lab.id}. ${lab.name}</div>
          <div class="worldmap-node-sub">${lab.subtitle}</div>
        </div>
        <div class="worldmap-node-badge">${badgeText}</div>
      `;
      if (lab.unlocked && onSelectLabyrinth) {
        div.addEventListener('click', () => onSelectLabyrinth(lab));
      }
      container.appendChild(div);
    });
    refreshIcons(container);
  }

  function showLore(text) {
    const el = document.getElementById('lore-text');
    const ov = document.getElementById('overlay-lore');
    if (el && ov) { el.textContent = text; ov.classList.remove('hidden'); }
  }

  // ── Save / Load Progress ──────────────────────────────────
  const SAVE_KEY = 'pixelLabyrinth_save';

  function saveProgress(data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  }

  function loadProgress() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }

  function clearProgress() { localStorage.removeItem(SAVE_KEY); }

  function showLevelUp(nextFloor, kills, gems) {
    document.getElementById('lu-floor').textContent = nextFloor;
    document.getElementById('lu-kills').textContent = kills;
    document.getElementById('lu-gems').textContent = gems;
    document.getElementById('overlay-levelup').classList.remove('hidden');
  }

  function showVictory(score) {
    document.getElementById('vic-score').textContent = score;
    document.getElementById('overlay-victory').classList.remove('hidden');
  }

  function hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  }

  // ── Leaderboard ───────────────────────────────────────────
  const LB_KEY = 'pixelLabyrinth_scores';

  function getScores() {
    try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
    catch { return []; }
  }

  function saveScore(name, score, floor) {
    const scores = getScores();
    scores.push({ name: name || 'Anonymous', score, floor, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores.splice(10);
    localStorage.setItem(LB_KEY, JSON.stringify(scores));
  }

  function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    const scores = getScores();
    if (scores.length === 0) {
      list.innerHTML = '<div class="lb-empty">No scores yet. Be the first!</div>';
      return;
    }
    list.innerHTML = scores.map((s, i) => `
      <div class="lb-entry">
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${s.name}</span>
        <span class="lb-floor">F${s.floor}</span>
        <span class="lb-score">${s.score}</span>
      </div>
    `).join('');
  }

  // ── Title background animation ────────────────────────────
  function animateTitleBg() {
    const canvas = document.getElementById('title-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.0003 + 0.0001,
      alpha: Math.random(),
    }));

    const cols = 40;
    const heat = new Float32Array(cols * 3).fill(0);

    function loop() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const W = canvas.width, H = canvas.height;

      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, W, H);

      stars.forEach(s => {
        s.alpha += (Math.random() - 0.5) * 0.05;
        s.alpha = Math.max(0.1, Math.min(1, s.alpha));
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = '#e0d8c8';
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const silH = H * 0.35;
      ctx.fillStyle = '#0d0d1a';
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H - silH * 0.4);
      for (let i = 0; i < 8; i++) {
        const bx = (i / 8) * W;
        const bw = W / 8;
        const bh = silH * (0.4 + (i % 3) * 0.2 + Math.sin(frame * 0.001 + i) * 0.05);
        ctx.lineTo(bx, H - bh);
        ctx.lineTo(bx + bw * 0.3, H - bh);
        ctx.lineTo(bx + bw * 0.3, H - bh * 1.4);
        ctx.lineTo(bx + bw * 0.7, H - bh * 1.4);
        ctx.lineTo(bx + bw * 0.7, H - bh);
        ctx.lineTo(bx + bw, H - bh);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      for (let i = 1; i < 8; i++) {
        const tx = (i / 8) * W + W / 16;
        const ty = H - silH * (0.5 + (i % 3) * 0.2);
        const flicker = 1 + Math.sin(frame * 0.08 + i * 2.3) * 0.3;
        const grd = ctx.createRadialGradient(tx, ty, 1, tx, ty, 60 * flicker);
        grd.addColorStop(0, 'rgba(255,160,0,0.5)');
        grd.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(tx - 60, ty - 60, 120, 120);
      }

      frame++;
      requestAnimationFrame(loop);
    }
    loop();
  }

  // ── Class Select animated preview canvas ─────────────────
  let previewAnimId = null;
  function animateClassSelectPreviews() {
    if (previewAnimId) {
      cancelAnimationFrame(previewAnimId);
      previewAnimId = null;
    }
    const knightCanvas = document.getElementById('knight-preview-canvas');
    const wizardCanvas = document.getElementById('wizard-preview-canvas');
    if (!knightCanvas || !wizardCanvas) return;

    const kw = knightCanvas.offsetWidth || 80;
    const kh = knightCanvas.offsetHeight || 80;
    knightCanvas.width = kw;
    knightCanvas.height = kh;
    const ww = wizardCanvas.offsetWidth || 80;
    const wh = wizardCanvas.offsetHeight || 80;
    wizardCanvas.width = ww;
    wizardCanvas.height = wh;

    let tick = 0;
    function loop() {
      const screen = document.getElementById('screen-classselect');
      if (!screen || !screen.classList.contains('active')) {
        previewAnimId = null;
        return;
      }

      // Gentle breathing animation (~1.5 cycles/sec instead of 15Hz shaking)
      const slowFrame = Math.floor(tick / 22);

      const kctx = knightCanvas.getContext('2d');
      kctx.clearRect(0, 0, kw, kh);
      kctx.save();
      kctx.scale(kw / 32, kw / 32);
      Sprites.drawKnightPreview(kctx, 0, 0, slowFrame);
      kctx.restore();

      const wctx = wizardCanvas.getContext('2d');
      wctx.clearRect(0, 0, ww, wh);
      wctx.save();
      wctx.scale(ww / 32, ww / 32);
      Sprites.drawWizardPreview(wctx, 0, 0, slowFrame);
      wctx.restore();

      tick++;
      previewAnimId = requestAnimationFrame(loop);
    }
    loop();
  }

  return {
    refreshIcons, showToast, updateHp, updateMp, updateScore, updateFloor, updateKeys,
    updateShield, setClassBadge, hideMpBar,
    showGameOver, showLevelUp, showVictory, hideAllOverlays,
    showFloorBanner, showLore, saveProgress, loadProgress, clearProgress,
    renderWorldMap, markLabyrinthCleared,
    getScores, saveScore, renderLeaderboard, animateTitleBg, animateClassSelectPreviews,
  };
})();
