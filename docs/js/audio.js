/* Crystal Dash — efectos de sonido sintetizados (WebAudio, sin archivos) */
(function () {
  let ctx = null, master = null, effectsBus = null, musicBus = null, zoneSound = null, zoneSoundGain = null, musicTimer = null, musicStep = 0, musicGain = null, currentTrack = null, percussionBuffer = null, musicStartAt = 0;
  let previewTimer = null, previewActive = false, musicRequest = 0;
  const A = {};
  A.muted = () => CD.DB.progress.muted;
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    percussionBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .16), ctx.sampleRate);
    const percussionData = percussionBuffer.getChannelData(0);
    for (let i = 0; i < percussionData.length; i++) percussionData[i] = Math.random() * 2 - 1;
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
    effectsBus = ctx.createGain(); musicBus = ctx.createGain();
    effectsBus.connect(master); musicBus.connect(master); A.refreshVolumes();
  };
  A.refreshVolumes = function () {
    if (!ctx) return;
    const p = CD.DB.progress, muted = p.muted ? 0 : 1;
    effectsBus.gain.setTargetAtTime(muted * (p.effectsVolume / 100), ctx.currentTime, .035);
    musicBus.gain.setTargetAtTime(muted * (p.musicVolume / 100), ctx.currentTime, .035);
  };
  A.setVolume = function (type, value) {
    const p = CD.DB.progress, key = type === 'music' ? 'musicVolume' : 'effectsVolume';
    p[key] = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    CD.DB.save(); A.refreshVolumes();
  };
  function tone(f0, f1, dur, type = 'square', vol = 0.5, delay = 0) {
    if (!ctx || A.muted()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(effectsBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.4, hp = 800) {
    if (!ctx || A.muted()) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    s.buffer = buf; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(effectsBus); s.start();
  }
  const tracks = window.CD_SOUNDTRACKS || {};
  function drumNoise(time, cutoff, duration, volume) {
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = percussionBuffer; filter.type = 'highpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(volume, time + .004); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(musicGain); source.start(time); source.stop(time + duration + .005);
  }
  function drumKick(time) {
    const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(128, time); osc.frequency.exponentialRampToValueAtTime(48, time + .12);
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(.19, time + .005); gain.gain.exponentialRampToValueAtTime(.0001, time + .13);
    osc.connect(gain); gain.connect(musicGain); osc.start(time); osc.stop(time + .14);
  }
  function playMusicStep() {
    if (!ctx || !musicGain || A.muted()) return;
    const track = tracks[currentTrack] || tracks.menu;
    if (musicStep >= track.melody.length) {
      if (track.mode === 'game' && !previewActive) {
        const available = Object.keys(tracks).filter(id => tracks[id].mode === 'game' && CD.DB.progress.soundtrackOwned.includes(id));
        const next = available.filter(id => id !== currentTrack);
        if (next.length) { A.startMusic(next[Math.floor(Math.random() * next.length)]); return; }
      }
      musicStep = 0;
    }
    const t = ctx.currentTime + .015, note = track.melody[musicStep], root = track.bass[Math.floor(musicStep / 2) % track.bass.length];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = track.wave; o.frequency.setValueAtTime(note, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .11);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + .12);
    if (musicStep % 2 === 0) {
      const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = 'triangle'; b.frequency.setValueAtTime(root, t);
      bg.gain.setValueAtTime(.0001, t); bg.gain.exponentialRampToValueAtTime(.2, t + .01); bg.gain.exponentialRampToValueAtTime(.0001, t + .19);
      b.connect(bg); bg.connect(musicGain); b.start(t); b.stop(t + .2);
    }
    if (musicStep % 4 === 0) {
      const harmonyNote = track.harmony[Math.floor(musicStep / 4) % track.harmony.length];
      const h = ctx.createOscillator(), hg = ctx.createGain(); h.type = 'triangle'; h.frequency.setValueAtTime(harmonyNote, t);
      hg.gain.setValueAtTime(.0001, t); hg.gain.exponentialRampToValueAtTime(.075, t + .018); hg.gain.exponentialRampToValueAtTime(.0001, t + .29);
      h.connect(hg); hg.connect(musicGain); h.start(t); h.stop(t + .3);
    }
    if (musicStep % 4 === 0) drumKick(t);
    else if (musicStep % 4 === 2) drumNoise(t, 1100, .09, .09);
    else drumNoise(t, 5200, .025, .035);
    musicStep++;
  }
  function startMusicNow(trackId, options) {
    const preview = !!options.preview;
    if (!preview) { clearTimeout(previewTimer); previewTimer = null; previewActive = false; }
    if (musicTimer && currentTrack === trackId && !options.force) return;
    A.stopMusic(.72, preview); currentTrack = trackId; musicStep = 0; musicGain = ctx.createGain(); musicStartAt = ctx.currentTime;
    musicGain.gain.setValueAtTime(0, ctx.currentTime); musicGain.gain.linearRampToValueAtTime(.68, ctx.currentTime + .72); musicGain.connect(musicBus);
    playMusicStep(); musicTimer = setInterval(playMusicStep, tracks[trackId].interval);
  }
  A.startMusic = function (trackId = 'menu', options = {}) {
    A.init(); const track = tracks[trackId], preview = !!options.preview;
    if (!ctx || !track || (!preview && track.mode !== 'system' && !CD.DB.progress.soundtrackOwned.includes(trackId))) return;
    if (ctx.state === 'suspended') {
      const request = ++musicRequest;
      ctx.resume().then(() => { if (request === musicRequest && ctx.state === 'running') startMusicNow(trackId, options); }).catch(() => {});
      return;
    }
    startMusicNow(trackId, options);
  };
  A.previewMusic = function (trackId, returnTrack = 'shop') {
    clearTimeout(previewTimer); previewTimer = null; previewActive = true;
    A.startMusic(trackId, { preview: true, force: true });
    const previewId = trackId;
    previewTimer = setTimeout(() => {
      if (!previewActive || currentTrack !== previewId) return;
      previewTimer = null; previewActive = false; A.startMusic(returnTrack, { force: true });
    }, 10000);
  };
  A.startRandomGameMusic = function () {
    const choices = Object.keys(tracks).filter(id => tracks[id].mode === 'game' && CD.DB.progress.soundtrackOwned.includes(id));
    if (!choices.length) { A.stopMusic(); return; }
    A.startMusic(choices[Math.floor(Math.random() * choices.length)]);
  };
  A.stopMusic = function (fade = .72, preservePreview = false) {
    musicRequest++;
    if (!preservePreview) { clearTimeout(previewTimer); previewTimer = null; previewActive = false; }
    if (musicTimer) clearInterval(musicTimer); musicTimer = null;
    if (musicGain && ctx) {
      const old = musicGain, now = ctx.currentTime;
      if (typeof old.gain.cancelAndHoldAtTime === 'function') old.gain.cancelAndHoldAtTime(now);
      else { const held = .68 * Math.max(0, Math.min(1, (now - musicStartAt) / .72)); old.gain.cancelScheduledValues(now); old.gain.setValueAtTime(held, now); }
      old.gain.linearRampToValueAtTime(0, now + fade);
      setTimeout(() => { try { old.disconnect(); } catch (_) {} }, fade * 1000 + 50);
    }
    musicGain = null;
    currentTrack = null;
  };
  A.musicPlaying = () => !!musicTimer;
  A.currentMusic = () => currentTrack;
  function setZoneSound(kind) {
    if (!ctx) return;
    if (A.muted()) kind = null;
    if (zoneSoundGain) {
      const oldGain = zoneSoundGain, oldSounds = zoneSound;
      oldGain.gain.cancelScheduledValues(ctx.currentTime);
      oldGain.gain.setValueAtTime(oldGain.gain.value, ctx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + .65);
      setTimeout(() => { for (const node of oldSounds) { try { node.stop(); node.disconnect(); } catch (_) {} } try { oldGain.disconnect(); } catch (_) {} }, 720);
    }
    zoneSound = null; zoneSoundGain = null;
    if (!kind) return;
    const gain = ctx.createGain();
    const profile = kind === 'hot' ? { type: 'sawtooth', freq: 48, cutoff: 230, volume: .22, noise: .19, noiseCut: 620 }
      : kind === 'cryo' ? { type: 'triangle', freq: 680, cutoff: 1550, volume: .18, noise: .16, noiseCut: 2400 }
      : { type: 'sawtooth', freq: 58, cutoff: 1100, volume: .12, noise: 0, noiseCut: 1000 };
    const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), sounds = [osc];
    osc.type = profile.type; osc.frequency.value = profile.freq;
    filter.type = kind === 'cryo' ? 'bandpass' : 'lowpass'; filter.frequency.value = profile.cutoff; filter.Q.value = kind === 'magnet' ? 5 : .8;
    osc.connect(filter); filter.connect(gain);
    if (profile.noise > 0) {
      const length = ctx.sampleRate, buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (kind === 'hot' ? .72 : .38);
      const source = ctx.createBufferSource(), noiseFilter = ctx.createBiquadFilter(), noiseGain = ctx.createGain();
      source.buffer = buffer; source.loop = true; noiseFilter.type = kind === 'hot' ? 'lowpass' : 'highpass';
      noiseFilter.frequency.value = profile.noiseCut; noiseGain.gain.value = profile.noise;
      source.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(gain); source.start(); sounds.push(source);
      if (kind === 'hot') { const crackle = ctx.createOscillator(); crackle.type = 'triangle'; crackle.frequency.value = 117; crackle.connect(gain); crackle.start(); sounds.push(crackle); }
      if (kind === 'cryo') { const overtone = ctx.createOscillator(); overtone.type = 'sine'; overtone.frequency.value = 1360; const og = ctx.createGain(); og.gain.value = .28; overtone.connect(og); og.connect(gain); overtone.start(); sounds.push(overtone); }
    }
    gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(profile.volume, ctx.currentTime + .45);
    gain.connect(effectsBus); zoneSound = sounds; zoneSoundGain = gain;
  }
  const S = {
    jump: () => tone(320, 640, 0.12, 'square', 0.25),
    select: () => { tone(720, 1040, 0.075, 'sine', 0.16); },
    switch: () => { tone(880, 1320, 0.06, 'triangle', 0.3); },
    smash: () => { noise(0.25, 0.5, 400); tone(180, 60, 0.2, 'sawtooth', 0.3); },
    zap: () => { noise(0.18, 0.35, 2500); tone(1200, 300, 0.15, 'sawtooth', 0.2); },
    absorb: () => {
      // Acorde ascendente de síntesis con brillo de logro
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
    furnace: () => { noise(0.22, 0.2, 650); tone(170, 92, 0.3, 'sawtooth', 0.16); tone(260, 110, 0.22, 'sine', 0.1, .08); },
    ice: () => { noise(0.14, 0.24, 1800); tone(1800, 420, 0.2, 'triangle', 0.2); tone(880, 220, 0.16, 'sine', 0.1, .08); },
    field: () => { noise(0.1, 0.14, 2200); tone(520, 140, 0.27, 'sawtooth', 0.12); tone(110, 440, 0.24, 'triangle', 0.12, .06); },
  };
  A.play = name => { try { S[name] && S[name](); } catch (e) { /* ignore */ } };
  A.setZoneSound = kind => { try { setZoneSound(kind); } catch (e) { /* ignore */ } };
  CD.Audio = A;
})();
