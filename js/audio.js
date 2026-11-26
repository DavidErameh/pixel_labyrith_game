// ============================================================
// audio.js — Web Audio SFX synthesizer (realistic sounds)
// ============================================================

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // ── Primitive: oscillator tone ──────────────────────────────
  function _tone(freq, endFreq, duration, type = 'sine', vol = 0.12, delayMs = 0) {
    const c = ensureCtx(); if (!c) return;
    const now = c.currentTime + delayMs / 1000;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  // ── Primitive: white noise buffer ──────────────────────────
  function _noise(duration, vol, hpFreq = 0, lpFreq = 0, delayMs = 0) {
    const c = ensureCtx(); if (!c) return;
    const sr = c.sampleRate;
    const bufLen = Math.ceil(sr * duration);
    const buf = c.createBuffer(1, bufLen, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;

    let chain = src;

    if (hpFreq > 0) {
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = hpFreq; hp.Q.value = 1.4;
      chain.connect(hp); chain = hp;
    }
    if (lpFreq > 0) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = lpFreq; lp.Q.value = 2.2;
      chain.connect(lp); chain = lp;
    }

    const gain = c.createGain();
    const now = c.currentTime + delayMs / 1000;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    chain.connect(gain);
    gain.connect(c.destination);
    src.start(now);
    src.stop(now + duration);
  }

  // ── SFX: Knight sword whoosh + metallic ring ───────────────
  function swing() {
    // Sharp blade whoosh (highpass noise)
    _noise(0.10, 0.20, 850, 0);
    // Metallic blade ring (two harmonics)
    _tone(1380, 540, 0.16, 'sine', 0.10, 15);
    _tone(2200, 880, 0.10, 'sine', 0.055, 20);
  }

  // ── SFX: Sword hitting flesh / bone ───────────────────────
  function hit() {
    _noise(0.09, 0.26, 180, 700);     // meaty thwack
    _tone(190, 65, 0.13, 'sawtooth', 0.13, 8);
  }

  // ── SFX: Enemy killed ─────────────────────────────────────
  function kill() {
    _noise(0.11, 0.28, 120, 600);
    _tone(280, 75, 0.15, 'square', 0.11);
    _tone(480, 180, 0.11, 'sawtooth', 0.08, 55);
  }

  // ── SFX: Player hurt ──────────────────────────────────────
  function hurt() {
    _tone(140, 50, 0.24, 'sawtooth', 0.19);
    _noise(0.11, 0.14, 90, 350, 10);
  }

  // ── SFX: Coin / gem pickup ────────────────────────────────
  function pickup() {
    _tone(520, 880, 0.10, 'square', 0.09);
    _tone(880, 1200, 0.08, 'triangle', 0.07, 70);
  }

  // ── SFX: Key pickup ───────────────────────────────────────
  function key() {
    _tone(587, 587, 0.08, 'square', 0.10);
    _tone(880, 1174, 0.14, 'square', 0.10, 80);
  }

  // ── SFX: Door unlock ──────────────────────────────────────
  function unlock() {
    _tone(440, 660, 0.10, 'triangle', 0.12);
    _tone(660, 880, 0.18, 'triangle', 0.12, 100);
  }

  // ── SFX: Sword clashing on armor / shield ────────────────
  function clash() {
    _noise(0.08, 0.22, 1100, 0);     // metallic ring burst
    _tone(640, 190, 0.09, 'sawtooth', 0.15);
    _tone(1050, 380, 0.07, 'square', 0.09, 18);
  }

  // ── SFX: Save point chime ─────────────────────────────────
  function save() {
    _tone(392, 523, 0.12, 'triangle', 0.12);
    _tone(523, 659, 0.12, 'triangle', 0.12, 100);
    _tone(659, 784, 0.22, 'triangle', 0.14, 200);
  }

  // ── SFX: Shield absorb ────────────────────────────────────
  function block() {
    _noise(0.07, 0.20, 700, 0);
    _tone(480, 260, 0.09, 'square', 0.13);
  }

  // ── SFX: Parry counter ────────────────────────────────────
  function parry() {
    _tone(780, 1240, 0.12, 'triangle', 0.16);
    _noise(0.08, 0.12, 1500, 0, 10);
  }

  // ── SFX: Spider web shot ──────────────────────────────────
  function web() {
    _tone(280, 520, 0.09, 'sine', 0.09);
  }

  // ── SFX: Slime WET SQUISH ─────────────────────────────────
  // Used when slimes/spiders hit the player or die
  function squish() {
    // Wet splat: lowpass noise burst
    _noise(0.14, 0.32, 0, 420);
    // Gooey pitch drop
    _tone(260, 70, 0.17, 'sine', 0.15, 10);
    _tone(190, 320, 0.08, 'triangle', 0.08, 55);
  }

  // ── SFX: Skeleton / armored enemy sword SLASH ─────────────
  // Sharper, bony, metallic hit sound
  function enemySlash() {
    _noise(0.09, 0.19, 650, 0);
    _tone(520, 130, 0.12, 'sawtooth', 0.15);
    _tone(820, 280, 0.07, 'square', 0.07, 25);
  }

  // ── SFX: Potion pickup (bubbling glass) ───────────────────
  function potion() {
    _tone(600, 900, 0.08, 'sine', 0.10);
    _tone(900, 1250, 0.09, 'triangle', 0.08, 80);
    _tone(1250, 820, 0.12, 'sine', 0.07, 155);
  }

  // ── SFX: Fireball whoosh (wizard cast) ────────────────────
  function fireball() {
    _noise(0.13, 0.18, 300, 0);
    _tone(380, 160, 0.14, 'sawtooth', 0.12);
    _tone(600, 240, 0.10, 'sine', 0.08, 30);
  }

  function toggleMute() { muted = !muted; return muted; }
  function isMuted() { return muted; }

  // Unlock Web Audio AudioContext on first mobile touch / gesture
  function _unlockAudio() {
    ensureCtx();
  }
  document.addEventListener('touchstart', _unlockAudio, { once: true, passive: true });
  document.addEventListener('pointerdown', _unlockAudio, { once: true, passive: true });

  return {
    swing, hit, kill, hurt, pickup, key, unlock, clash, save,
    block, parry, web, squish, enemySlash, potion, fireball,
    toggleMute, isMuted
  };
})();
