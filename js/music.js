// ============================================================
// music.js — Instant-start background music player
// Preloads all 3 tracks upfront and switches with zero fade delay.
// ============================================================

const Music = (() => {
  const TRACKS = {
    title:       'music/The Bridge of Khazad Dum - Howard Shore.mp3',
    classSelect: 'music/Arrival - Hans Zimmer.mp3',
    dungeon:     'music/Dragon Age Inquisition Theme - Trevor Morris.mp3',
  };

  const TARGET_VOL = 0.19;  // 50% quieter background music
  const audioCache = {};
  let currentAudio = null;
  let currentKey   = null;
  let muted        = false;
  let pendingKey   = null;

  // Preload all tracks immediately so switching has zero buffering delay
  Object.keys(TRACKS).forEach(key => {
    const audio = new Audio();
    audio.src = TRACKS[key];
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = TARGET_VOL;
    try { audio.load(); } catch(e) {}
    audioCache[key] = audio;
  });

  function play(key) {
    const audio = audioCache[key];
    if (!audio) return;

    if (currentKey === key && currentAudio && !currentAudio.paused) return;

    // Stop previous track immediately (no fade-out delay)
    if (currentAudio && currentAudio !== audio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch(e) {}
    }

    currentAudio = audio;
    currentKey   = key;
    audio.currentTime = 0;
    audio.volume = muted ? 0 : TARGET_VOL;

    audio.play().then(() => {
      pendingKey = null;
    }).catch(() => {
      // Autoplay blocked on initial load — start immediately on first input
      pendingKey = key;
    });
  }

  function stop() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch(e) {}
    }
    currentAudio = null;
    currentKey   = null;
    pendingKey   = null;
  }

  function setMuted(isMuted) {
    muted = isMuted;
    if (currentAudio) {
      currentAudio.volume = muted ? 0 : TARGET_VOL;
    }
  }

  function getMuted() { return muted; }
  function getKey()   { return currentKey; }

  function _onUserGesture() {
    if (pendingKey) {
      const k = pendingKey;
      pendingKey = null;
      const audio = audioCache[k];
      if (audio && currentKey === k) {
        audio.volume = muted ? 0 : TARGET_VOL;
        audio.play().catch(() => {});
      } else {
        play(k);
      }
    } else if (currentAudio && currentAudio.paused && currentKey) {
      currentAudio.volume = muted ? 0 : TARGET_VOL;
      currentAudio.play().catch(() => {});
    }
  }

  // pointerdown fires immediately on press (earlier than click)
  document.addEventListener('pointerdown', _onUserGesture, { passive: true });
  document.addEventListener('keydown',     _onUserGesture, { passive: true });
  document.addEventListener('touchstart',  _onUserGesture, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentAudio && currentAudio.paused && currentKey) {
      currentAudio.volume = muted ? 0 : TARGET_VOL;
      currentAudio.play().catch(() => {});
    }
  });

  return { play, stop, setMuted, getMuted, getKey };
})();
