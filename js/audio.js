// ============================================================
// audio.js — Retro 8-bit Web Audio synthesizer (no external files)
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
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, endFreq, duration, type = 'square', volume = 0.12) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function swing() {
    playTone(360, 140, 0.09, 'triangle', 0.1);
  }

  function hit() {
    playTone(220, 70, 0.11, 'sawtooth', 0.14);
  }

  function kill() {
    playTone(300, 90, 0.12, 'square', 0.12);
    setTimeout(() => playTone(480, 180, 0.12, 'square', 0.1), 60);
  }

  function hurt() {
    playTone(150, 55, 0.18, 'sawtooth', 0.16);
  }

  function pickup() {
    playTone(520, 880, 0.1, 'square', 0.09);
  }

  function key() {
    playTone(587, 587, 0.08, 'square', 0.1);
    setTimeout(() => playTone(880, 1174, 0.14, 'square', 0.1), 80);
  }

  function unlock() {
    playTone(440, 660, 0.1, 'triangle', 0.12);
    setTimeout(() => playTone(660, 880, 0.18, 'triangle', 0.12), 100);
  }

  function clash() {
    playTone(620, 180, 0.08, 'sawtooth', 0.14);
    setTimeout(() => playTone(880, 320, 0.07, 'square', 0.1), 30);
  }

  function save() {
    playTone(392, 523, 0.12, 'triangle', 0.12);
    setTimeout(() => playTone(523, 659, 0.12, 'triangle', 0.12), 100);
    setTimeout(() => playTone(659, 784, 0.22, 'triangle', 0.14), 200);
  }

  function block() {
    playTone(480, 260, 0.08, 'square', 0.13);
  }

  function parry() {
    playTone(780, 1240, 0.12, 'triangle', 0.15);
  }

  function web() {
    playTone(280, 520, 0.09, 'sine', 0.09);
  }

  function squish() {
    playTone(340, 110, 0.1, 'sine', 0.14);
    setTimeout(() => playTone(180, 260, 0.07, 'triangle', 0.1), 50);
  }

  function enemySlash() {
    playTone(540, 130, 0.09, 'sawtooth', 0.13);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return { swing, hit, kill, hurt, pickup, key, unlock, clash, save, block, parry, web, squish, enemySlash, toggleMute, isMuted };
})();
