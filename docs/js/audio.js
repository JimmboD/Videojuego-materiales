/* Crystal Dash — efectos de sonido sintetizados (WebAudio, sin archivos) */
(function () {
  let ctx = null, master = null, zoneSound = null, zoneSoundGain = null, musicTimer = null, musicStep = 0, musicGain = null;
  const A = {};
  A.muted = () => CD.DB.progress.muted;
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
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
    o.connect(g); g.connect(master);
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
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  function playMusicStep() {
    if (!ctx || !musicGain || A.muted()) return;
    const melody = [659, 784, 988, 784, 587, 659, 784, 659, 523, 659, 784, 659, 494, 587, 659, 587];
    const bass = [131, 131, 196, 196, 110, 110, 165, 165];
    const t = ctx.currentTime + .015, note = melody[musicStep % melody.length], root = bass[Math.floor(musicStep / 2) % bass.length];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(note, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .105);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + .12);
    if (musicStep % 2 === 0) {
      const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = 'triangle'; b.frequency.setValueAtTime(root, t);
      bg.gain.setValueAtTime(.0001, t); bg.gain.exponentialRampToValueAtTime(.16, t + .01); bg.gain.exponentialRampToValueAtTime(.0001, t + .19);
      b.connect(bg); bg.connect(musicGain); b.start(t); b.stop(t + .2);
    }
    musicStep++;
  }
  A.startMusic = function () {
    A.init(); if (!ctx || !DBMusicOwned()) return;
    A.stopMusic(); musicStep = 0; musicGain = ctx.createGain(); musicGain.gain.value = .32; musicGain.connect(master);
    playMusicStep(); musicTimer = setInterval(playMusicStep, 125);
  };
  A.stopMusic = function () {
    if (musicTimer) clearInterval(musicTimer); musicTimer = null;
    if (musicGain && ctx) { const old = musicGain; old.gain.setTargetAtTime(0, ctx.currentTime, .04); setTimeout(() => { try { old.disconnect(); } catch (_) {} }, 220); }
    musicGain = null;
  };
  A.musicPlaying = () => !!musicTimer;
  function DBMusicOwned() { return CD.DB.progress.musicPurchased; }
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
    gain.connect(master); zoneSound = sounds; zoneSoundGain = gain;
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
