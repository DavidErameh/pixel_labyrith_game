// ============================================================
// main.js — Entry point: wires screens, input, and game instance
// ============================================================

(function () {
  'use strict';

  let game = null;

  // ── Screen Manager ──────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    if (id === 'screen-title') updateContinueBtn();
  }

  function updateContinueBtn() {
    const btn = document.getElementById('btn-continue');
    const info = document.getElementById('continue-info');
    if (!btn) return;
    const saved = UI.loadProgress();
    if (saved && saved.player) {
      btn.classList.remove('hidden');
      if (info) info.textContent = `(F${saved.floor} • 💎${saved.player.score})`;
    } else {
      btn.classList.add('hidden');
    }
  }

  // ── Title Screen ────────────────────────────────────────────
  UI.animateTitleBg();
  updateContinueBtn();

  document.getElementById('btn-continue').addEventListener('click', () => {
    const saved = UI.loadProgress();
    if (saved) startNewGame(saved);
  });

  document.getElementById('btn-newgame').addEventListener('click', () => {
    startNewGame(null);
  });

  document.getElementById('btn-howtoplay').addEventListener('click', () => {
    showScreen('screen-howtoplay');
  });

  document.getElementById('btn-back-howto').addEventListener('click', () => {
    showScreen('screen-title');
  });

  document.getElementById('btn-leaderboard').addEventListener('click', () => {
    UI.renderLeaderboard();
    showScreen('screen-leaderboard');
  });

  document.getElementById('btn-back-lb').addEventListener('click', () => {
    showScreen('screen-title');
  });

  // ── Game Start ──────────────────────────────────────────────
  function startNewGame(saveData = null) {
    if (game) { game.destroy(); game = null; }

    const canvas = document.getElementById('game-canvas');
    const minimap = document.getElementById('minimap-canvas');
    game = new Game(canvas, minimap);

    // HUD callbacks
    game.onHpUpdate = (hp, max) => UI.updateHp(hp, max);
    game.onScoreUpdate = (score) => UI.updateScore(score);
    game.onFloorUpdate = (floor) => UI.updateFloor(floor);
    game.onKeysUpdate = (keys) => UI.updateKeys(keys);
    game.onPowerupUpdate = (type, ratio) => UI.updatePowerup(type, ratio);
    game.onFloorBanner = (floor) => UI.showFloorBanner(floor);
    game.onSave = (data) => UI.saveProgress(data);
    game.onLore = (text) => {
      game.pause();
      UI.showLore(text);
    };

    // Game events
    game.onGameOver = (floor, score) => {
      UI.showGameOver(floor, score, !!UI.loadProgress());
    };

    game.onLevelComplete = (nextFloor, kills, gems) => {
      UI.showLevelUp(nextFloor, kills, gems);
    };

    game.onVictory = (score) => {
      UI.clearProgress();
      UI.showVictory(score);
    };

    if (saveData) {
      game.loadSaveData(saveData);
      UI.showToast(`🔮 Resumed Floor ${saveData.floor}!`);
    } else {
      game.startFloor(1);
    }
    showScreen('screen-game');
    const focusPrompt = document.getElementById('focus-prompt');
    if (focusPrompt) focusPrompt.classList.remove('hidden');

    // Force resize AFTER screen is visible so getBoundingClientRect returns real dimensions
    requestAnimationFrame(() => {
      game._handleResize();
      game._updateCamera && game._updateCamera();
      game.start();
      canvas.focus();
    });

    // Kick off input
    bindKeyboard();
    bindDpad();
  }

  // ── Keyboard Input ──────────────────────────────────────────
  let keyboardBound = false;
  function bindKeyboard() {
    if (keyboardBound) return;
    keyboardBound = true;

    const hidePrompt = () => {
      const fp = document.getElementById('focus-prompt');
      if (fp) fp.classList.add('hidden');
    };

    const gameWrap = document.getElementById('game-wrap');
    if (gameWrap) {
      gameWrap.addEventListener('pointerdown', () => {
        hidePrompt();
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.focus();
      });
    }

    window.addEventListener('keydown', e => {
      if (!game) return;
      hidePrompt();
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) game.attack();
        return;
      }
      game.keyDown(e.key);
      // Prevent scroll
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      if (!game) return;
      game.keyUp(e.key);
    });

    // Escape = pause
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') togglePause();
    });
  }

  // ── D-Pad ───────────────────────────────────────────────────
  let dpadBound = false;
  function bindDpad() {
    if (dpadBound) return;
    dpadBound = true;

    const dpadMap = {
      'dpad-up':    { r: -1, c: 0 },
      'dpad-down':  { r:  1, c: 0 },
      'dpad-left':  { r:  0, c: -1 },
      'dpad-right': { r:  0, c:  1 },
    };

    Object.entries(dpadMap).forEach(([id, dir]) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      let holdInterval = null;

      function pressStart() {
        if (!game) return;
        game.dpadPress(dir.r, dir.c);
        btn.classList.add('pressed');
        holdInterval = setInterval(() => {
          if (game) game.dpadPress(dir.r, dir.c);
        }, 160);
      }
      function pressEnd() {
        btn.classList.remove('pressed');
        clearInterval(holdInterval);
      }

      btn.addEventListener('touchstart', e => { e.preventDefault(); pressStart(); }, { passive: false });
      btn.addEventListener('touchend', e => { e.preventDefault(); pressEnd(); }, { passive: false });
      btn.addEventListener('mousedown', pressStart);
      btn.addEventListener('mouseup', pressEnd);
      btn.addEventListener('mouseleave', pressEnd);
    });

    // Action button (center dpad — active sword attack)
    const actionBtn = document.getElementById('dpad-action');
    if (actionBtn) {
      const doAttack = e => {
        if (e.cancelable) e.preventDefault();
        if (!game) return;
        actionBtn.classList.add('pressed');
        game.attack();
        setTimeout(() => actionBtn.classList.remove('pressed'), 120);
      };
      actionBtn.addEventListener('touchstart', doAttack, { passive: false });
      actionBtn.addEventListener('mousedown', doAttack);
    }
  }

  // ── Swipe Controls (mobile) ─────────────────────────────────
  (function bindSwipe() {
    const gameWrap = document.getElementById('game-wrap');
    if (!gameWrap) return;
    let sx, sy;
    gameWrap.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    gameWrap.addEventListener('touchend', e => {
      if (!game) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        game.dpadPress(0, dx > 0 ? 1 : -1);
      } else {
        game.dpadPress(dy > 0 ? 1 : -1, 0);
      }
    }, { passive: true });
  })();

  // ── Pause / Resume ──────────────────────────────────────────
  function togglePause() {
    if (!game) return;
    if (game.paused) {
      game.paused = false;
      game.resume();
      document.getElementById('overlay-pause').classList.add('hidden');
    } else {
      game.pause();
      document.getElementById('overlay-pause').classList.remove('hidden');
    }
  }

  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = Sound.toggleMute();
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-resume').addEventListener('click', () => {
    game && game.paused && togglePause();
  });
  document.getElementById('btn-pause-save').addEventListener('click', () => {
    if (!game) return;
    UI.saveProgress(game.serialize());
    Sound.save();
    UI.showToast('💾 Progress Saved!');
  });
  document.getElementById('btn-close-lore').addEventListener('click', () => {
    document.getElementById('overlay-lore').classList.add('hidden');
    if (game && game.paused) game.resume();
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    UI.hideAllOverlays();
    if (game) { game.destroy(); game = null; }
    showScreen('screen-title');
  });

  // ── Game Over ───────────────────────────────────────────────
  document.getElementById('btn-load-save').addEventListener('click', () => {
    const saved = UI.loadProgress();
    if (!saved) return;
    UI.hideAllOverlays();
    startNewGame(saved);
  });
  document.getElementById('btn-save-score').addEventListener('click', () => {
    const name = document.getElementById('go-name-input').value.trim();
    const score = parseInt(document.getElementById('go-score').textContent) || 0;
    const floor = parseInt(document.getElementById('go-floor').textContent) || 1;
    UI.saveScore(name, score, floor);
    UI.showToast('✅ Score saved!');
    document.getElementById('btn-save-score').disabled = true;
    document.getElementById('btn-save-score').textContent = '✅ Saved';
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    UI.hideAllOverlays();
    startNewGame();
  });

  document.getElementById('btn-go-menu').addEventListener('click', () => {
    UI.hideAllOverlays();
    if (game) { game.destroy(); game = null; }
    showScreen('screen-title');
  });

  // ── Level Up / Next Floor ───────────────────────────────────
  document.getElementById('btn-nextlevel').addEventListener('click', () => {
    UI.hideAllOverlays();
    const nextFloor = parseInt(document.getElementById('lu-floor').textContent) || 2;

    if (!game) return;
    game.startFloor(nextFloor);
    UI.saveProgress(game.serialize());
    requestAnimationFrame(() => {
      game._handleResize();
      game.start();
      UI.showToast(`⬇️ Welcome to Floor ${nextFloor}! (Auto-saved)`);
    });
  });

  // ── Victory ─────────────────────────────────────────────────
  document.getElementById('btn-save-vic-score').addEventListener('click', () => {
    const name = document.getElementById('vic-name-input').value.trim();
    const score = parseInt(document.getElementById('vic-score').textContent) || 0;
    UI.saveScore(name, score, C.FLOORS);
    UI.showToast('👑 Victory score saved!');
    document.getElementById('btn-save-vic-score').disabled = true;
    document.getElementById('btn-save-vic-score').textContent = '✅ Saved';
  });

  document.getElementById('btn-vic-menu').addEventListener('click', () => {
    UI.hideAllOverlays();
    if (game) { game.destroy(); game = null; }
    showScreen('screen-title');
  });

  // ── Prevent mobile zoom ─────────────────────────────────────
  document.addEventListener('touchmove', e => {
    if (e.scale !== 1) e.preventDefault();
  }, { passive: false });

  // Double-tap prevention
  let lastTap = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });

})();
