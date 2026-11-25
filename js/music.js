// ============================================================
// music.js — Background music player (HTMLAudioElement-based)
// Three tracks mapped to: title / classSelect / dungeon screens
// Handles browser autoplay policy gracefully — retries on first
// user interaction and also resumes after tab visibility changes.
// ============================================================

const Music = (() => {
  const TRACKS = {
    title:       'music/The Bridge of Khazad Dum - Howard Shore.mp3',
    classSelect: 'music/Dragon Age Inquisition Theme - Trevor Morris.mp3',
    dungeon:     'music/Arrival - Hans Zimmer.mp3',
  };

  let currentAudio = null;
  let currentKey   = null;
  let muted        = false;
  let pendingKey   = null;   // key requested while autoplay was blocked
  const TARGET_VOL = 0.38;  // quieter than SFX so they cut through

  let fadeTimer = null;

  function _clearFade() {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  }

  // ── Attempt playback; queue retry on autoplay block ────────
  function _tryPlay(audio, key) {
    audio.play().then(() => {
      pendingKey = null;
      _fadeIn(audio);
    }).catch(() => {
      // Autoplay blocked — park it and retry on first gesture
      pendingKey = key;
    });
  }

  function _fadeIn(audio) {
    _clearFade();
    let vol = 0;
    const target = muted ? 0 : TARGET_VOL;
    audio.volume = 0;
    fadeTimer = setInterval(() => {
      vol = Math.min(target, vol + 0.025);
      try { audio.volume = vol; } catch(e) {}
      if (vol >= target) _clearFade();
    }, 30);
  }

  function _fadeOutThen(audio, cb) {
    _clearFade();
    let vol = audio.volume;
    fadeTimer = setInterval(() => {
      vol = Math.max(0, vol - 0.05);
      try { audio.volume = vol; } catch(e) {}
      if (vol <= 0) {
        _clearFade();
        try { audio.pause(); audio.currentTime = 0; } catch(e) {}
        if (cb) cb();
      }
    }, 25);
  }

  function _startTrack(key) {
    _clearFade();
    const audio = new Audio(TRACKS[key]);
    audio.loop = true;
    audio.volume = 0;
    currentAudio = audio;
    currentKey   = key;
    _tryPlay(audio, key);
  }

  // ── Public API ─────────────────────────────────────────────
  function play(key) {
    if (!TRACKS[key]) return;
    // Already playing this track?
    if (currentKey === key && currentAudio && !currentAudio.paused) return;

    if (currentAudio && !currentAudio.paused) {
      _fadeOutThen(currentAudio, () => _startTrack(key));
    } else {
      if (currentAudio) { try { currentAudio.pause(); currentAudio.currentTime = 0; } catch(e) {} }
      _startTrack(key);
    }
  }

  function stop() {
    if (!currentAudio) return;
    _fadeOutThen(currentAudio, null);
    currentAudio = null;
    currentKey   = null;
    pendingKey   = null;
  }

  function setMuted(isMuted) {
    muted = isMuted;
    if (currentAudio) {
      _clearFade();
      currentAudio.volume = muted ? 0 : TARGET_VOL;
    }
  }

  function getMuted() { return muted; }
  function getKey()   { return currentKey; }

  // ── Retry on first user gesture (handles autoplay block) ──
  function _onUserGesture() {
    if (pendingKey) {
      const k = pendingKey;
      pendingKey = null;
      // If we still want to play that track, re-attempt
      if (currentKey === k && currentAudio) {
        currentAudio.play().then(() => _fadeIn(currentAudio)).catch(() => {});
      } else {
        play(k);
      }
    } else if (currentAudio && currentAudio.paused && currentKey) {
      // Resume any paused track (e.g. tab switch)
      currentAudio.play().then(() => _fadeIn(currentAudio)).catch(() => {});
    }
  }

  document.addEventListener('click',   _onUserGesture, { passive: true });
  document.addEventListener('keydown', _onUserGesture, { passive: true });
  document.addEventListener('touchstart', _onUserGesture, { passive: true });

  // ── Resume on tab visibility restore ───────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentAudio && currentAudio.paused && currentKey) {
      currentAudio.play().catch(() => {});
    }
  });

  return { play, stop, setMuted, getMuted, getKey };
})();
