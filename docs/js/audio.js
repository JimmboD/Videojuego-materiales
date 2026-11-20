/* Crystal Dash — motor de audio sintetizado con rigor físico y reproducción bit a bit idéntica a NumPy / sounddevice */
(function () {
  let ctx = null, master = null, effectsBus = null, musicBus = null, limiter = null;
  let zoneSound = null, zoneSoundGain = null;
  let currentSource = null, currentGain = null, currentTrack = null;
  let previewTimer = null, previewActive = false, musicRequest = 0;

  const A = {};
  A.muted = () => !!(CD.DB && CD.DB.progress && CD.DB.progress.muted);

  A.init = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 1.0;

    /* Limitador transparente de picos (-0.5 dB) para evitar distorsión digital entre SFX y música */
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-0.5, ctx.currentTime);
    limiter.knee.setValueAtTime(0, ctx.currentTime);
    limiter.ratio.setValueAtTime(20, ctx.currentTime);
    limiter.attack.setValueAtTime(0.001, ctx.currentTime);
    limiter.release.setValueAtTime(0.05, ctx.currentTime);

    master.connect(limiter);
    limiter.connect(ctx.destination);

    effectsBus = ctx.createGain();
    musicBus = ctx.createGain();
    effectsBus.connect(master);
    musicBus.connect(master);

    A.refreshVolumes();
  };

  A.refreshVolumes = function () {
    if (!ctx) return;
    const p = CD.DB ? CD.DB.progress : { muted: false, effectsVolume: 75, musicVolume: 70 };
    const muted = p.muted ? 0 : 1;
    const now = ctx.currentTime;
    effectsBus.gain.setTargetAtTime(muted * (p.effectsVolume / 100) * 0.75, now, 0.035);
    /* Nivel de música ajustado exactamente a la mitad (50%) para una escucha equilibrada y cómoda */
    musicBus.gain.setTargetAtTime(muted * (p.musicVolume / 100) * 0.50, now, 0.035);
  };

  A.setVolume = function (type, value) {
    if (!CD.DB || !CD.DB.progress) return;
    const p = CD.DB.progress;
    const key = type === 'music' ? 'musicVolume' : 'effectsVolume';
    p[key] = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    CD.DB.save();
    A.refreshVolumes();
  };

  /* =========================================================================
     Síntesis de Soundtrack idéntica al renderizador analítico (NumPy / sounddevice)
     ========================================================================= */

  function extractVoices(track) {
    const preferred = ['melody', 'harmony', 'bass'];
    const voices = [];
    for (let i = 0; i < preferred.length; i++) {
      const k = preferred[i];
      if (Array.isArray(track[k]) && track[k].length > 0) voices.push(track[k]);
    }
    const keys = Object.keys(track);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!preferred.includes(k) && Array.isArray(track[k]) && track[k].length > 0 && typeof track[k][0] === 'number') {
        voices.push(track[k]);
      }
    }
    return voices;
  }

  function renderTrackAudioBuffer(audioCtx, track, minSeconds = 0) {
    if (!audioCtx || !track) return null;
    const voices = extractVoices(track);
    if (!voices.length) return null;

    const sr = audioCtx.sampleRate;
    const intervalMs = Number(track.interval_ms || track.interval) || 120.0;
    const stepSec = intervalMs / 1000.0;
    const waveType = (track.wave || 'sawtooth').toLowerCase().trim();
    const nSamplesStep = Math.max(1, Math.round(sr * stepSec));

    const maxLen = Math.max(...voices.map(v => v.length));
    const singleCycleSec = maxLen * stepSec;
    const loops = minSeconds > 0 ? Math.max(1, Math.ceil(minSeconds / singleCycleSec)) : 1;
    const totalSteps = maxLen * loops;
    const totalSamples = totalSteps * nSamplesStep;

    const buffer = audioCtx.createBuffer(1, totalSamples, sr);
    const data = buffer.getChannelData(0);

    /* Base de tiempo idéntica a np.linspace(0.0, stepSec, nSamplesStep, endpoint=False) */
    const dt = stepSec / nSamplesStep;
    const t = new Float64Array(nSamplesStep);
    for (let i = 0; i < nSamplesStep; i++) t[i] = i * dt;

    /* Envolvente de borde de 6 ms idéntica al script Python */
    const env = new Float32Array(nSamplesStep);
    env.fill(1.0);
    const fadeLen = Math.min(Math.floor(0.006 * sr), Math.floor(nSamplesStep / 4));
    if (fadeLen > 1) {
      const denom = fadeLen - 1;
      for (let k = 0; k < fadeLen; k++) {
        const ramp = k / denom;
        env[k] = ramp;
        env[nSamplesStep - 1 - k] = ramp;
      }
    }

    const voiceGain = 0.75 / voices.length;
    const stepMix = new Float32Array(nSamplesStep);
    const PI2 = 2.0 * Math.PI;

    for (let step = 0; step < totalSteps; step++) {
      stepMix.fill(0.0);

      for (let v = 0; v < voices.length; v++) {
        const arr = voices[v];
        const freq = arr[step % arr.length];
        if (freq <= 0 || isNaN(freq)) continue;

        if (waveType === 'sawtooth') {
          for (let i = 0; i < nSamplesStep; i++) {
            const ft = freq * t[i];
            const raw = 2.0 * (ft - Math.floor(0.5 + ft));
            stepMix[i] += voiceGain * raw * env[i];
          }
        } else if (waveType === 'square') {
          for (let i = 0; i < nSamplesStep; i++) {
            const s = Math.sin(PI2 * freq * t[i]);
            const raw = s > 0 ? 1.0 : (s < 0 ? -1.0 : 0.0);
            stepMix[i] += voiceGain * raw * env[i];
          }
        } else if (waveType === 'triangle') {
          for (let i = 0; i < nSamplesStep; i++) {
            const ft = freq * t[i];
            const raw = 2.0 * Math.abs(2.0 * (ft - Math.floor(ft + 0.5))) - 1.0;
            stepMix[i] += voiceGain * raw * env[i];
          }
        } else {
          /* sine */
          for (let i = 0; i < nSamplesStep; i++) {
            const raw = Math.sin(PI2 * freq * t[i]);
            stepMix[i] += voiceGain * raw * env[i];
          }
        }
      }

      /* Saturación suave mediante tanh idéntica a np.tanh(mix) */
      const offset = step * nSamplesStep;
      for (let i = 0; i < nSamplesStep; i++) {
        data[offset + i] = Math.tanh(stepMix[i]);
      }
    }

    return buffer;
  }

  function getTrackBuffer(track, minSeconds = 0) {
    if (!ctx || !track) return null;
    if (track._cachedBuffer && (!minSeconds || track._cachedBuffer.duration >= minSeconds * 0.95)) {
      return track._cachedBuffer;
    }
    const buf = renderTrackAudioBuffer(ctx, track, minSeconds);
    if (!minSeconds || (buf && buf.duration >= minSeconds * 0.95)) {
      track._cachedBuffer = buf;
    }
    return buf;
  }

  const tracks = window.CD_SOUNDTRACKS || {};

  function startMusicNow(trackId, options = {}) {
    if (!ctx) return;
    const track = tracks[trackId] || tracks.menu;
    if (!track) return;

    const preview = !!options.preview;
    if (!preview) {
      clearTimeout(previewTimer);
      previewTimer = null;
      previewActive = false;
    }

    if (currentSource && currentTrack === trackId && !options.force) return;

    /* Transición y desvanecimiento suave de la pista previa */
    if (currentGain && currentSource) {
      const oldGain = currentGain, oldSource = currentSource;
      const now = ctx.currentTime;
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + 0.35);
      } catch (_) {}
      setTimeout(() => {
        try { oldSource.stop(); oldSource.disconnect(); } catch (_) {}
        try { oldGain.disconnect(); } catch (_) {}
      }, 380);
    }
    currentGain = null;
    currentSource = null;
    currentTrack = trackId;

    /* Para pistas cortas in-game, se extienden a ~50s para rotación musical coherente */
    const isGameTrack = track.mode === 'game' && !preview;
    const minSec = isGameTrack ? 50 : 0;
    const buffer = getTrackBuffer(track, minSec);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    /* En menú o preview se reproduce en bucle continuo */
    if (!isGameTrack) {
      source.loop = true;
    } else {
      source.loop = false;
      source.onended = () => {
        if (source === currentSource && !A.muted()) {
          A.startRandomGameMusic();
        }
      };
    }

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.35);

    source.connect(gain);
    gain.connect(musicBus);
    source.start(now);

    currentSource = source;
    currentGain = gain;
  }

  A.startMusic = function (trackId = 'menu', options = {}) {
    A.init();
    const track = tracks[trackId];
    const preview = !!options.preview;
    if (!ctx || !track) return;
    if (!preview && track.mode !== 'system' && CD.DB && CD.DB.progress && CD.DB.progress.soundtrackOwned) {
      if (!CD.DB.progress.soundtrackOwned.includes(trackId)) return;
    }

    if (ctx.state === 'suspended') {
      const request = ++musicRequest;
      ctx.resume().then(() => {
        if (request === musicRequest && ctx.state === 'running') startMusicNow(trackId, options);
      }).catch(() => {});
      return;
    }

    startMusicNow(trackId, options);
  };

  A.previewMusic = function (trackId, returnTrack = 'lab') {
    clearTimeout(previewTimer);
    previewTimer = null;
    previewActive = true;
    A.startMusic(trackId, { preview: true, force: true });
    const previewId = trackId;
    previewTimer = setTimeout(() => {
      if (!previewActive || currentTrack !== previewId) return;
      previewTimer = null;
      previewActive = false;
      A.startMusic(returnTrack, { force: true });
      if (window.CD && CD.UI && typeof CD.UI.renderSoundtracks === 'function') {
        CD.UI.renderSoundtracks();
      }
    }, 10000);
  };

  A.startRandomGameMusic = function () {
    const gameTracks = Object.keys(tracks).filter(id => tracks[id] && tracks[id].mode === 'game');
    const owned = (CD.DB && CD.DB.progress && CD.DB.progress.soundtrackOwned)
      ? gameTracks.filter(id => CD.DB.progress.soundtrackOwned.includes(id))
      : gameTracks;
    const pool = owned.length ? owned : gameTracks;
    if (!pool.length) {
      if (tracks.menu) A.startMusic('menu');
      return;
    }
    const nextPool = pool.filter(id => id !== currentTrack);
    const chosen = nextPool.length ? nextPool[Math.floor(Math.random() * nextPool.length)] : pool[0];
    A.startMusic(chosen, { force: true });
  };

  A.stopMusic = function (fade = 0.45, preservePreview = false) {
    musicRequest++;
    setZoneSound(null);
    if (!preservePreview) {
      clearTimeout(previewTimer);
      previewTimer = null;
      previewActive = false;
    }
    if (currentGain && currentSource && ctx) {
      const oldGain = currentGain, oldSource = currentSource;
      const now = ctx.currentTime;
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + fade);
      } catch (_) {}
      setTimeout(() => {
        try { oldSource.stop(); oldSource.disconnect(); } catch (_) {}
        try { oldGain.disconnect(); } catch (_) {}
      }, fade * 1000 + 50);
    }
    currentGain = null;
    currentSource = null;
    currentTrack = null;
  };

  A.musicPlaying = () => !!currentSource;
  A.currentMusic = () => currentTrack;

  /* =========================================================================
     Efectos de sonido (SFX) y Ambientación de Zonas
     ========================================================================= */

  function tone(f0, f1, dur, type = 'square', vol = 0.5, delay = 0) {
    if (!ctx || A.muted()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(effectsBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.4, hp = 800) {
    if (!ctx || A.muted()) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    s.buffer = buf;
    g.gain.value = vol;
    s.connect(f);
    f.connect(g);
    g.connect(effectsBus);
    s.start();
  }

  function setZoneSound(kind) {
    if (!ctx) return;
    if (A.muted()) kind = null;
    if (zoneSoundGain) {
      const oldGain = zoneSoundGain, oldSounds = zoneSound;
      const now = ctx.currentTime;
      const fadeDur = kind ? 0.45 : 0.12;
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + fadeDur);
      } catch (_) {}
      setTimeout(() => {
        if (oldSounds) {
          for (let i = 0; i < oldSounds.length; i++) {
            try { oldSounds[i].stop(); oldSounds[i].disconnect(); } catch (_) {}
          }
        }
        try { oldGain.disconnect(); } catch (_) {}
      }, Math.round(fadeDur * 1000 + 40));
    }
    zoneSound = null;
    zoneSoundGain = null;
    if (!kind) return;

    const gain = ctx.createGain();
    const profile = kind === 'hot'
      ? { type: 'sawtooth', freq: 48, cutoff: 230, volume: 0.22, noise: 0.19, noiseCut: 620 }
      : kind === 'cryo'
        ? { type: 'triangle', freq: 680, cutoff: 1550, volume: 0.18, noise: 0.16, noiseCut: 2400 }
        : { type: 'sawtooth', freq: 58, cutoff: 1100, volume: 0.12, noise: 0, noiseCut: 1000 };

    const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), sounds = [osc];
    osc.type = profile.type;
    osc.frequency.value = profile.freq;
    filter.type = kind === 'cryo' ? 'bandpass' : 'lowpass';
    filter.frequency.value = profile.cutoff;
    filter.Q.value = kind === 'magnet' ? 5 : 0.8;
    osc.connect(filter);
    filter.connect(gain);

    if (profile.noise > 0) {
      const length = ctx.sampleRate, buffer = ctx.createBuffer(1, length, ctx.sampleRate), d = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * (kind === 'hot' ? 0.72 : 0.38);
      const s = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      s.buffer = buffer;
      s.loop = true;
      nf.type = kind === 'hot' ? 'lowpass' : 'highpass';
      nf.frequency.value = profile.noiseCut;
      ng.gain.value = profile.noise;
      s.connect(nf);
      nf.connect(ng);
      ng.connect(gain);
      s.start();
      sounds.push(s);

      if (kind === 'hot') {
        const crackle = ctx.createOscillator();
        crackle.type = 'triangle';
        crackle.frequency.value = 117;
        crackle.connect(gain);
        crackle.start();
        sounds.push(crackle);
      }
      if (kind === 'cryo') {
        const overtone = ctx.createOscillator();
        overtone.type = 'sine';
        overtone.frequency.value = 1360;
        const og = ctx.createGain();
        og.gain.value = 0.28;
        overtone.connect(og);
        og.connect(gain);
        overtone.start();
        sounds.push(overtone);
      }
    }

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(profile.volume, ctx.currentTime + 0.45);
    gain.connect(effectsBus);
    zoneSound = sounds;
    zoneSoundGain = gain;
  }

  const S = {
    jump: () => tone(320, 640, 0.12, 'square', 0.25),
    select: () => { tone(720, 1040, 0.075, 'sine', 0.16); },
    switch: () => { tone(880, 1320, 0.06, 'triangle', 0.3); },
    smash: () => { noise(0.25, 0.5, 400); tone(180, 60, 0.2, 'sawtooth', 0.3); },
    zap: () => { noise(0.18, 0.35, 2500); tone(1200, 300, 0.15, 'sawtooth', 0.2); },
    absorb: () => {
      tone(440, 660, 0.34, 'sine', 0.32);
      tone(554, 831, 0.38, 'sine', 0.28, 0.08);
      tone(659, 988, 0.46, 'triangle', 0.25, 0.16);
      tone(1320, 1760, 0.22, 'sine', 0.12, 0.24);
    },
    shield: () => { tone(1600, 200, 0.3, 'triangle', 0.4); },
    chip: () => { noise(0.12, 0.5, 3000); tone(2400, 900, 0.1, 'square', 0.2); },
    die: () => { noise(0.6, 0.6, 200); tone(300, 40, 0.6, 'sawtooth', 0.4); },
    meissner: () => { tone(500, 1000, 0.4, 'sine', 0.3); tone(750, 1500, 0.4, 'sine', 0.2, 0.05); },
    flush: () => { noise(0.4, 0.3, 1500); tone(1500, 3000, 0.3, 'sine', 0.2); },
    phase: () => { tone(600, 150, 0.5, 'triangle', 0.35); },
    fastfall: () => tone(500, 120, 0.12, 'square', 0.2),
    magnet: () => tone(90, 140, 0.25, 'sawtooth', 0.2),
    furnace: () => { noise(0.22, 0.2, 650); tone(170, 92, 0.3, 'sawtooth', 0.16); tone(260, 110, 0.22, 'sine', 0.1, 0.08); },
    ice: () => { noise(0.14, 0.24, 1800); tone(1800, 420, 0.2, 'triangle', 0.2); tone(880, 220, 0.16, 'sine', 0.1, 0.08); },
    field: () => { noise(0.1, 0.14, 2200); tone(520, 140, 0.27, 'sawtooth', 0.12); tone(110, 440, 0.24, 'triangle', 0.12, 0.06); },
  };

  A.play = name => { try { S[name] && S[name](); } catch (e) { /* ignore */ } };
  A.setZoneSound = kind => { try { setZoneSound(kind); } catch (e) { /* ignore */ } };

  window.CD = window.CD || {};
  CD.Audio = A;
})();
