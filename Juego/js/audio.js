/* Crystal Dash — efectos de sonido sintetizados (WebAudio, sin archivos) */
(function () {
  let ctx = null, master = null;
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
  const S = {
    jump: () => tone(320, 640, 0.12, 'square', 0.25),
    switch: () => { tone(880, 1320, 0.06, 'triangle', 0.3); },
    smash: () => { noise(0.25, 0.5, 400); tone(180, 60, 0.2, 'sawtooth', 0.3); },
    zap: () => { noise(0.18, 0.35, 2500); tone(1200, 300, 0.15, 'sawtooth', 0.2); },
    absorb: () => { tone(400, 1600, 0.25, 'sine', 0.4); },
    shield: () => { tone(1600, 200, 0.3, 'triangle', 0.4); },
    chip: () => { noise(0.12, 0.5, 3000); tone(2400, 900, 0.1, 'square', 0.2); },
    die: () => { noise(0.6, 0.6, 200); tone(300, 40, 0.6, 'sawtooth', 0.4); },
    meissner: () => { tone(500, 1000, 0.4, 'sine', 0.3); tone(750, 1500, 0.4, 'sine', 0.2, 0.05); },
    flush: () => { noise(0.4, 0.3, 1500); tone(1500, 3000, 0.3, 'sine', 0.2); },
    phase: () => { tone(600, 150, 0.5, 'triangle', 0.35); },
    fastfall: () => tone(500, 120, 0.12, 'square', 0.2),
    magnet: () => tone(90, 140, 0.25, 'sawtooth', 0.2),
  };
  A.play = name => { try { S[name] && S[name](); } catch (e) { /* ignore */ } };
  CD.Audio = A;
})();
