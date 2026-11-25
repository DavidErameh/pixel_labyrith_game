// ============================================================
// music.js — Background music player (HTMLAudioElement-based)
// Uses real .mp3 files from the /music/ folder
// ============================================================

const Music = (() => {
  const TRACKS = {
    title:       'music/The Bridge of Khazad Dum - Howard Shore.mp3',
    classSelect: 'music/Dragon Age Inquisition Theme - Trevor Morris.mp3',
    dungeon:     'music/Arrival - Hans Zimmer.mp3',
  };

  let currentTrack = null;
  let currentKey   = null;
  let muted        = false;
  let volume       = 0.38; // music quieter than SFX

  let fadeTimer = null;

  function _clearFade() {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  }

  function play(key) {
    if (!TRACKS[key]) return;
    if (currentKey === key && currentTrack && !currentTrack.paused) return; // already playing

    _clearFade();

    if (currentTrack) {
      // Fade out old track then play new one
      const old = currentTrack;
      let vol = old.volume;
      fadeTimer = setInterval(() => {
        vol = Math.max(0, vol - 0.05);
        try { old.volume = vol; } catch(e) {}
        if (vol <= 0) {
          _clearFade();
          old.pause();
          old.currentTime = 0;
          _startTrack(key);
        }
      }, 25);
    } else {
      _startTrack(key);
    }
  }

  function _startTrack(key) {
    const audio = new Audio(TRACKS[key]);
    audio.loop = true;
    audio.volume = muted ? 0 : volume;
    currentTrack = audio;
    currentKey = key;

    // Fade in
    audio.volume = 0;
    const targetVol = muted ? 0 : volume;
    audio.play().catch(() => {
      // Autoplay blocked — will start on next user interaction
      document.addEventListener('click', () => {
        audio.play().catch(() => {});
      }, { once: true });
      document.addEventListener('keydown', () => {
        audio.play().catch(() => {});
      }, { once: true });
    });

    _clearFade();
    let vol = 0;
    fadeTimer = setInterval(() => {
      vol = Math.min(targetVol, vol + 0.03);
      try { audio.volume = vol; } catch(e) {}
      if (vol >= targetVol) _clearFade();
    }, 30);
  }

  function stop() {
    _clearFade();
    if (!currentTrack) return;
    const old = currentTrack;
    let vol = old.volume;
    fadeTimer = setInterval(() => {
      vol = Math.max(0, vol - 0.06);
      try { old.volume = vol; } catch(e) {}
      if (vol <= 0) {
        _clearFade();
        old.pause();
        old.currentTime = 0;
      }
    }, 25);
    currentTrack = null;
    currentKey = null;
  }

  function setMuted(isMuted) {
    muted = isMuted;
    if (currentTrack) {
      currentTrack.volume = muted ? 0 : volume;
    }
  }

  function getMuted() { return muted; }
  function getKey() { return currentKey; }

  return { play, stop, setMuted, getMuted, getKey };
})();
