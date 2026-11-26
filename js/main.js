// ============================================================
// main.js — Entry point: wires screens, input, and game instance
// ============================================================

(function () {
  'use strict';

  let game = null;
  let selectedClass = 'knight'; // set by class select screen
  let startFloorTarget = 1;     // 1 = normal run, C.FLOORS = direct Boss Floor

  // ── Screen Manager ──────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    if (id === 'screen-title') {
      updateContinueBtn();
      Music.play('title');
    } else if (id === 'screen-classselect') {
      Music.play('classSelect');
      UI.animateClassSelectPreviews();
    }
  }

  function updateContinueBtn() {
    const btn = document.getElementById('btn-continue');
    const info = document.getElementById('continue-info');
    if (!btn) return;
    const saved = UI.loadProgress();
    if (saved && saved.player) {
      btn.classList.remove('hidden');
      const cls = saved.playerClass || 'knight';
      const icon = cls === 'wizard' ? '🔮' : '⚔️';
      if (info) info.textContent = `(F${saved.floor} • 💎${saved.player.score} ${icon})`;
    } else {
      btn.classList.add('hidden');
    }
  }

  // ── Title Screen ────────────────────────────────────────────
  UI.animateTitleBg();
  updateContinueBtn();
  Music.play('title');

  document.getElementById('btn-continue').addEventListener('click', () => {
    const saved = UI.loadProgress();
    if (saved) {
      selectedClass = saved.playerClass || 'knight';
      startNewGame(saved);
    }
  });

  document.getElementById('btn-newgame').addEventListener('click', () => {
    startFloorTarget = 1;
    showScreen('screen-classselect');
  });

  document.getElementById('btn-boss-floor').addEventListener('click', () => {
    startFloorTarget = C.FLOORS;
    showScreen('screen-classselect');
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

  // ── How To Play Tabs ────────────────────────────────────────
  document.getElementById('tab-knight-btn').addEventListener('click', () => {
    document.getElementById('tab-knight').classList.add('active');
    document.getElementById('tab-wizard').classList.remove('active');
    document.getElementById('tab-knight-btn').classList.add('active');
    document.getElementById('tab-wizard-btn').classList.remove('active');
  });
  document.getElementById('tab-wizard-btn').addEventListener('click', () => {
    document.getElementById('tab-wizard').classList.add('active');
    document.getElementById('tab-knight').classList.remove('active');
    document.getElementById('tab-wizard-btn').classList.add('active');
    document.getElementById('tab-knight-btn').classList.remove('active');
  });

  // ── Class Select Screen ─────────────────────────────────────
  function pickClass(cls) {
    selectedClass = cls;
    startNewGame(null);
  }

  document.getElementById('card-knight').addEventListener('click', () => pickClass('knight'));
  document.getElementById('card-wizard').addEventListener('click', () => pickClass('wizard'));
  document.querySelector('.knight-btn').addEventListener('click', (e) => { e.stopPropagation(); pickClass('knight'); });
  document.querySelector('.wizard-btn').addEventListener('click', (e) => { e.stopPropagation(); pickClass('wizard'); });

  // Key shortcuts 1/2 on class select
  window.addEventListener('keydown', e => {
    const screen = document.getElementById('screen-classselect');
    if (!screen || !screen.classList.contains('active')) return;
    if (e.key === '1') pickClass('knight');
    if (e.key === '2') pickClass('wizard');
    if (e.key === 'Escape') showScreen('screen-title');
  });

  // ── Game Start ──────────────────────────────────────────────
  function startNewGame(saveData = null) {
    if (game) { game.destroy(); game = null; }

    const canvas = document.getElementById('game-canvas');
    const minimap = document.getElementById('minimap-canvas');
    const cls = saveData ? (saveData.playerClass || selectedClass) : selectedClass;
    game = new Game(canvas, minimap, cls);

    // HUD setup for class
    if (cls === 'wizard') {
      document.getElementById('hud-mp').classList.remove('hidden');
      const fireBtn = document.getElementById('dpad-fire');
      const shieldBtn = document.getElementById('dpad-shield');
      if (fireBtn) { fireBtn.classList.remove('hidden'); fireBtn.textContent = '🔥'; }
      if (shieldBtn) { shieldBtn.textContent = '✨'; shieldBtn.style.borderColor = '#a78bfa'; }
      document.getElementById('focus-prompt').textContent =
        '🖱️ Click to play | Space=Fireball · E=Burst · Shift/Q=Barrier · M=Map';
    } else {
      document.getElementById('hud-mp').classList.add('hidden');
      const fireBtn = document.getElementById('dpad-fire');
      const shieldBtn = document.getElementById('dpad-shield');
      if (fireBtn) fireBtn.classList.add('hidden');
      if (shieldBtn) { shieldBtn.textContent = '🛡️'; shieldBtn.style.borderColor = ''; }
      document.getElementById('focus-prompt').textContent =
        '🖱️ Click to play | Space=Sword · Shift/Q=Shield · M=Map';
    }
    UI.setClassBadge(cls);

    // HUD callbacks
    game.onHpUpdate = (hp, max) => UI.updateHp(hp, max);
    game.onScoreUpdate = (score) => UI.updateScore(score);
    game.onFloorUpdate = (floor) => UI.updateFloor(floor);
    game.onKeysUpdate = (keys) => UI.updateKeys(keys);
    game.onShieldUpdate = (active, hits, cd, isWizard) => {
      UI.updateShield(active, hits, cd, isWizard);
      const sb = document.getElementById('dpad-shield');
      if (sb) sb.classList.toggle('pressed', !!active);
    };
    game.onMpUpdate = (mp, maxMp) => UI.updateMp(mp, maxMp);
    game.onFloorBanner = (floor) => UI.showFloorBanner(floor);
    game.onSave = (data) => UI.saveProgress(data);
    game.onLore = (text) => {
      game.pause();
      UI.showLore(text);
    };

    game.onGameOver = (floor, score) => {
      Music.stop();
      UI.showGameOver(floor, score, !!UI.loadProgress());
    };
    game.onLevelComplete = (nextFloor, kills, gems) => {
      UI.showLevelUp(nextFloor, kills, gems);
    };
    game.onVictory = (score) => {
      Music.stop();
      UI.clearProgress();
      UI.showVictory(score);
    };

    if (saveData) {
      game.loadSaveData(saveData);
      UI.showToast(`🔮 Resumed Floor ${saveData.floor}!`);
    } else {
      game.startFloor(startFloorTarget);
      if (startFloorTarget === C.FLOORS) {
        UI.showToast('👑 Entered Boss Floor — Crimson Rider awaits!');
      }
      startFloorTarget = 1;
    }

    showScreen('screen-game');
    Music.play('dungeon');

    const focusPrompt = document.getElementById('focus-prompt');
    if (focusPrompt) focusPrompt.classList.remove('hidden');

    requestAnimationFrame(() => {
      game._handleResize();
      game._updateCamera && game._updateCamera();
      game.start();
      canvas.focus();
    });

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
      const screenGame = document.getElementById('screen-game');
      if (!screenGame || !screenGame.classList.contains('active')) return;

      hidePrompt();

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) game.attack();
        return;
      }
      // Toggle block: Shift or Q keydown
      if ((e.key === 'Shift' || e.key === 'q' || e.key === 'Q') && !e.repeat) {
        game.toggleShield && game.toggleShield();
        return;
      }
      // Fire Burst: E key (wizard only)
      if ((e.key === 'e' || e.key === 'E') && !e.repeat) {
        if (game) game.fireBurst && game.fireBurst();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        if (!e.repeat) toggleExpandedMap();
        return;
      }
      game.keyDown(e.key);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      if (!game) return;
      game.keyUp(e.key);
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const screenGame = document.getElementById('screen-game');
        if (screenGame && screenGame.classList.contains('active')) togglePause();
      }
    });
  }

  // ── D-Pad ───────────────────────────────────────────────────
  let dpadBound = false;
  function bindDpad() {
    if (dpadBound) return;
    dpadBound = true;

    const dpadMap = {
      'dpad-up':    'ArrowUp',
      'dpad-down':  'ArrowDown',
      'dpad-left':  'ArrowLeft',
      'dpad-right': 'ArrowRight',
    };

    Object.entries(dpadMap).forEach(([id, keyName]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      function pressStart() {
        if (!game) return;
        game.keyDown(keyName);
        btn.classList.add('pressed');
      }
      function pressEnd() {
        btn.classList.remove('pressed');
        if (game) game.keyUp(keyName);
      }
      btn.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); pressStart(); }, { passive: false });
      btn.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); pressEnd(); }, { passive: false });
      btn.addEventListener('touchcancel', pressEnd);
      btn.addEventListener('mousedown', pressStart);
      btn.addEventListener('mouseup', pressEnd);
      btn.addEventListener('mouseleave', pressEnd);
    });

    // Attack button
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

    // Shield / Barrier button (tap to toggle)
    const shieldBtn = document.getElementById('dpad-shield');
    if (shieldBtn) {
      const doToggleShield = e => {
        if (e && e.cancelable) e.preventDefault();
        if (!game) return;
        game.toggleShield && game.toggleShield();
        const active = game.player && (game.player.shieldHeld || game.player.barrierHeld);
        shieldBtn.classList.toggle('pressed', !!active);
      };
      shieldBtn.addEventListener('touchstart', doToggleShield, { passive: false });
      shieldBtn.addEventListener('mousedown', doToggleShield);
    }

    // Fire Burst button (wizard)
    const fireBtn = document.getElementById('dpad-fire');
    if (fireBtn) {
      const doFire = e => {
        if (e.cancelable) e.preventDefault();
        if (!game) return;
        fireBtn.classList.add('pressed');
        game.fireBurst && game.fireBurst();
        setTimeout(() => fireBtn.classList.remove('pressed'), 120);
      };
      fireBtn.addEventListener('touchstart', doFire, { passive: false });
      fireBtn.addEventListener('mousedown', doFire);
    }
  }

  // ── Expanded Map Toggle ─────────────────────────────────────
  function toggleExpandedMap() {
    if (!game) return;
    const ov = document.getElementById('overlay-map');
    const expCanvas = document.getElementById('expanded-map-canvas');
    if (!ov || !expCanvas) return;
    const isHidden = ov.classList.contains('hidden');
    if (isHidden) {
      game.pause();
      const isPortraitMobile = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
      if (isPortraitMobile) {
        expCanvas.width = Math.floor(window.innerWidth * 0.94);
        expCanvas.height = Math.floor(Math.min(window.innerHeight * 0.72, window.innerWidth * 0.94));
      } else {
        expCanvas.width = Math.min(Math.floor(window.innerWidth * 0.92), 1300);
        expCanvas.height = Math.min(Math.floor(window.innerHeight * 0.82), 560);
      }
      game.renderExpandedMap(expCanvas);
      ov.classList.remove('hidden');
    } else {
      ov.classList.add('hidden');
      game.resume();
    }
  }

  const mapBtn = document.getElementById('btn-map');
  if (mapBtn) mapBtn.addEventListener('click', toggleExpandedMap);
  const minimapEl = document.getElementById('minimap-canvas');
  if (minimapEl) minimapEl.addEventListener('click', toggleExpandedMap);
  const closeMapBtn = document.getElementById('btn-close-map');
  if (closeMapBtn) closeMapBtn.addEventListener('click', toggleExpandedMap);

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
      Music.setMuted(isMuted);
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  document.getElementById('btn-pause').addEventListener('click', togglePause);

  // ── Fullscreen & Orientation (Mobile & Desktop) ─────────────
  const fsBtn = document.getElementById('btn-fullscreen');
  function toggleFullscreen() {
    const docEl = document.documentElement;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFs) {
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(docEl)).catch(() => {
          UI.showToast('📱 Tip: Add to Home Screen for fullscreen!');
        });
      } else {
        UI.showToast('📱 Tip: Add to Home Screen for fullscreen!');
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(() => {});
    }
  }
  if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);

  function handleViewportChange() {
    if (!game) return;
    requestAnimationFrame(() => {
      game._handleResize();
      game._updateCamera && game._updateCamera();
    });
  }
  window.addEventListener('orientationchange', () => setTimeout(handleViewportChange, 150));
  document.addEventListener('fullscreenchange', handleViewportChange);
  document.addEventListener('webkitfullscreenchange', handleViewportChange);

  // ── PWA Service Worker ──────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
  document.getElementById('btn-resume').addEventListener('click', () => {
    game && game.paused && togglePause();
  });
  document.getElementById('btn-pause-save').addEventListener('click', () => {
    if (!game) return;
    UI.saveProgress(game.serialize());
    Sound.save();
    UI.showToast('💾 Progress Saved!');
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    UI.hideAllOverlays();
    if (game) { game.destroy(); game = null; }
    Music.stop();
    showScreen('screen-title');
  });

  // ── Game Over ───────────────────────────────────────────────
  document.getElementById('btn-load-save').addEventListener('click', () => {
    const saved = UI.loadProgress();
    if (!saved) return;
    UI.hideAllOverlays();
    selectedClass = saved.playerClass || 'knight';
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
    showScreen('screen-classselect');
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

  let lastTap = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });

})();
