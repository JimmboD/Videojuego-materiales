/* Crystal Dash — generador procedural de tramos.
   Cada tramo se valida contra el carrusel equipado para que siempre exista
   al menos un material capaz de resolverlo (o se ofrece un cristal dopante). */
(function () {
  const K = {
    W: 960, H: 540, FIELD_H: 430,
    GROUND: 392, CEIL: 58, PX: 180, PS: 34,
    G0: 2600, V_JUMP: 880, K_MAG: 2600,
    HOVER: 26,           // altura de levitación Meissner sobre el suelo
    K_AMB: 0.5, K_HOT: 1.2, K_CRYO: 3.0,
  };
  CD.K = K;

  const BLOCKS = [
    { label: 'Hielo', B: 9 }, { label: 'Hormigón', B: 30 }, { label: 'Vidrio', B: 40 },
    { label: 'Granito', B: 50 }, { label: 'Aluminio', B: 76 }, { label: 'Titanio', B: 110 },
    { label: 'Acero', B: 160 }, { label: 'Alúmina', B: 252 }, { label: 'Tungsteno', B: 310 },
    { label: 'Carburo WC', B: 439 },
  ];
  const SAWS = [
    { label: 'Disco Al', G: 26 }, { label: 'Disco Ti', G: 44 }, { label: 'Disco acero', G: 80 },
    { label: 'Disco Al₂O₃', G: 163 }, { label: 'Disco WC', G: 274 }, { label: 'Disco PCD', G: 480 },
  ];
  const CRYO = [
    { T: 195, label: 'HIELO SECO 195 K' }, { T: 77, label: 'NITRÓGENO LÍQUIDO 77 K' },
    { T: 4.2, label: 'HELIO LÍQUIDO 4.2 K' }, { T: 1.8, label: 'HELIO SUPERFLUIDO 1.8 K' },
  ];
  const HOT = [
    { T: 1500, label: 'HORNO 1500 K', d: 0 }, { T: 3000, label: 'INDUCCIÓN 3000 K', d: 0.12 },
    { T: 5200, label: 'PLASMA 5200 K', d: 0.3 },
  ];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function marginAt(d) {
    // Margen exponencial negativo: comienza en 15% (0.15) y decrece con la dificultad
    return 0.15 * Math.exp(-1.5 * Math.max(0, Math.min(1, d)));
  }

  function survival(m, Tz, k, T0 = 320, margin = 0.15) {
    const Tsafe = m.melting_point * (1 - margin);
    if (Tz <= Tsafe) return Infinity;
    if (T0 >= Tsafe) return 0;
    return Math.log((Tz - T0) / (Tz - Tsafe)) / (k * m.engine.heat_rate);
  }

  function lifts(m, T = 300) {
    return CD.DB.magAt(m, T) * K.K_MAG > K.G0 * m.engine.gravity_scale;
  }

  class Level {
    constructor(run) {
      this.run = run;
      this.x = 1100;
      this.last = '';
      this.count = 0;
    }
    get mats() { return this.run.loadout; }
    analyze() {
      const ms = this.mats;
      return {
        maxB: Math.max(...ms.map(m => m.bulk_modulus)),
        maxG: Math.max(...ms.map(m => m.shear_modulus)),
        minGs: Math.min(...ms.map(m => m.engine.gravity_scale)),
        maxGs: Math.max(...ms.map(m => m.engine.gravity_scale)),
        insulator: ms.some(m => m.engine.elec_class === 'insulator'),
        metal: ms.some(m => m.engine.elec_class === 'metal'),
        lifter: ms.find(m => lifts(m)),
        tcs: ms.map(m => m.tc_supercon).filter(t => t > 0),
      };
    }
    update() {
      const r = this.run;
      while (this.x < r.dist + K.W + 600) this.spawn();
    }
    airtime(gs) { return 2 * K.V_JUMP / (K.G0 * gs); }

    spawn() {
      const r = this.run, d = r.difficulty, a = this.analyze();
      const table = [
        ['flat', 1.0, 0], ['block', 2.2, 0], ['spikes', 2.0, 0], ['pit', 1.6, 0],
        ['wall', 1.4, 0.03], ['arc', 1.4, 0.05], ['hot', 1.2, 0.06], ['saw', 1.1, 0.08],
        ['cryo', 1.1, 0.1], ['laserDuck', 1.1, 0.15], ['magnet', 1.0, 0.15], ['dopant', 0.5, 0.05],
        ['platformPit', 0.9, 0.2], ['flush', 0.8, 0.3], ['combo', 1.2, 0.4],
      ].filter(t => d >= t[2] && t[0] !== this.last);
      let tot = table.reduce((s, t) => s + t[1], 0), roll = Math.random() * tot, name = 'flat';
      for (const t of table) { roll -= t[1]; if (roll <= 0) { name = t[0]; break; } }
      if (this.count < 2) name = this.count === 0 ? 'block' : 'spikes';
      this.count++;
      this.last = name;
      const len = this[name](this.x, a, d);
      this.x += len + 200 + r.speed * 0.4 * (1.1 - d * 0.35);
    }

    // ---- tramos ----
    flat() { return 120; }
    block(x, a) {
      const h = rnd(34, 62);
      const b = pick(BLOCKS);
      this.run.add({ type: 'block', x, w: 44, y: K.GROUND - h, h, B: b.B, label: b.label });
      return 44;
    }
    wall(x, a, d) {
      const margin = marginAt(d);
      const maxAllowedB = a.maxB * (1 - margin);
      const ok = BLOCKS.filter(b => b.B <= maxAllowedB);
      if (!ok.length) return this.block(x, a);
      const idx = Math.min(ok.length - 1, Math.floor(Math.random() * ok.length * (0.5 + d)));
      const b = ok[Math.max(0, idx)];
      this.run.add({ type: 'block', full: true, x, w: 40, y: K.CEIL, h: K.GROUND - K.CEIL, B: b.B, label: b.label });
      return 40;
    }
    spikes(x, a, d) {
      const margin = marginAt(d);
      const maxW = this.run.speed * this.airtime(a.minGs) * 0.6 * (1 - margin);
      const w = Math.min(maxW, rnd(36, 60 + 60 * d));
      this.run.add({ type: 'spikes', x, w, y: K.GROUND - 18, h: 18 });
      return w;
    }
    pit(x, a, d) {
      const margin = marginAt(d);
      const maxW = 0.65 * this.run.speed * this.airtime(a.minGs) * (1 - margin);
      const w = Math.max(65, Math.min(maxW, rnd(80, 110 + 160 * d)));
      this.run.pits.push({ x0: x, x1: x + w });
      return w;
    }
    saw(x, a) {
      const s = pick(SAWS), r = 24;
      this.run.add({ type: 'saw', x, w: r * 2, y: K.GROUND - r * 2, h: r * 2, G: s.G, label: s.label });
      return r * 2;
    }
    laserDuck(x, a, d) {
      this.run.add({ type: 'spikes', x, w: 50, y: K.GROUND - 18, h: 18 });
      const gap = Math.max(110, this.run.speed * 0.4);
      const w = rnd(200, 320 + 200 * d);
      this.run.add({ type: 'laser', x: x + 50 + gap, w, y: K.GROUND - K.PS - 16, h: 6 });
      return 50 + gap + w;
    }
    arc(x, a) {
      let off = 0;
      if (!a.insulator && !a.metal) {
        // Si no tiene aislante ni metal, ofrecer dopante antes del arco para garantizar paso seguro
        const safeDopant = CD.DB.playable.find(m => m.engine.elec_class === 'insulator' || m.engine.elec_class === 'metal');
        if (safeDopant) {
          this.run.add({ type: 'dopant', x, y: K.GROUND - 70, w: 28, h: 28, mat: safeDopant.id });
          off = 220;
        }
      }
      this.run.add({ type: 'arc', x: x + off, w: 26, y: K.CEIL, h: K.GROUND - K.CEIL });
      return off + 26;
    }
    hot(x, a, d) {
      const margin = marginAt(d);
      const spd = Math.max(200, this.run.speed);

      // Calcular para cada material del jugador la temperatura máxima que puede absorber en tránsito
      // garantizando T_final <= Tm * (1 - margin)
      const targetL = Math.max(240, Math.min(850, rnd(380, 580 + 300 * d)));
      const dt = targetL / spd;

      let bestAbsorbT = 0;
      let bestMat = this.mats[0];

      for (const m of this.mats) {
        const Tsafe = m.melting_point * (1 - margin);
        const decay = Math.exp(-K.K_HOT * m.engine.heat_rate * dt);
        // Si el material prácticamente no se calienta en este tiempo, su límite térmico es muy alto
        const maxT = decay >= 0.99 ? Tsafe * 2.5 : (Tsafe - 300 * decay) / Math.max(0.01, 1 - decay);
        if (maxT > bestAbsorbT) {
          bestAbsorbT = maxT;
          bestMat = m;
        }
      }

      // Temperatura segura a generar: jamás puede exceder bestAbsorbT
      // Selección de candidatos según dificultad, acotados por la capacidad de absorción del loadout
      const nominalT = [700, 1200, 1800, 2600, 4200][Math.min(4, Math.floor(d * 4.5))];
      const finalT = Math.round(Math.min(nominalT, bestAbsorbT));

      // Verificación estricta: asegurar que con finalT el mejor material no supera Tm * (1 - margin)
      const maxSurv = survival(bestMat, finalT, K.K_HOT, 300, margin);
      let safeL = targetL;
      if (maxSurv !== Infinity) {
        const maxDist = maxSurv * spd * (1 - margin);
        if (maxDist < 200) {
          // Si ni con longitud mínima sobrevive a finalT, limitar finalT a lo que absorbe continuamente
          const continuousT = Math.round(bestMat.melting_point * (1 - margin));
          this.run.zones.push({ kind: 'hot', x0: x, x1: x + 260, T: continuousT, k: K.K_HOT, label: `HORNO ${continuousT} K` });
          return 260;
        }
        safeL = Math.max(200, Math.min(targetL, maxDist));
      }

      const label = finalT >= 3500 ? `PLASMA ${finalT} K` : finalT >= 2000 ? `INDUCCIÓN ${finalT} K` : `HORNO ${finalT} K`;
      this.run.zones.push({ kind: 'hot', x0: x, x1: x + safeL, T: finalT, k: K.K_HOT, label });
      if (safeL > 550 && Math.random() < 0.5) {
        this.run.add({ type: 'spikes', x: x + safeL * 0.5, w: 44, y: K.GROUND - 18, h: 18 });
      }
      return safeL;
    }
    cryo(x, a, d, forcedT) {
      let c;
      if (forcedT) c = CRYO.find(q => q.T === forcedT);
      else if (a.tcs.length && Math.random() < 0.7) {
        const ok = CRYO.filter(q => a.tcs.some(tc => q.T < tc));
        c = ok.length ? pick(ok) : pick(CRYO);
      } else c = pick(CRYO);
      const L = rnd(800, 1100 + 500 * d);
      this.run.zones.push({ kind: 'cryo', x0: x, x1: x + L, T: c.T, k: K.K_CRYO, label: c.label });
      let px = x + 160;
      while (px < x + L - 160) {
        if (Math.random() < 0.6) {
          const w = rnd(40, 90);
          this.run.add({ type: 'spikes', x: px, w, y: K.GROUND - 18, h: 18 });
          px += w;
        } else {
          const w = Math.min(rnd(70, 140), 0.6 * this.run.speed * this.airtime(a.minGs));
          this.run.pits.push({ x0: px, x1: px + w });
          px += w;
        }
        px += rnd(170, 260) + this.run.speed * 0.15;
      }
      return L;
    }
    flush(x, a, d) {
      const L1 = this.hot(x, a, d);
      return L1 + this.cryo(x + L1, a, d, 77);
    }
    magnet(x, a) {
      let off = 0;
      let lifter = a.lifter;
      if (!lifter) {                                // ofrecer Fe/Co/Gd como dopante
        const cand = CD.DB.playable.filter(m => lifts(m));
        lifter = cand.find(m => m.id === 'Fe') || cand[0];
        if (!lifter) return this.flat();
        this.run.add({ type: 'dopant', x, y: K.GROUND - 70, w: 28, h: 28, mat: lifter.id });
        off = 260;
      }
      const x0 = x + off, L = rnd(650, 950);
      this.run.zones.push({ kind: 'magnet', x0, x1: x0 + L, label: 'ELECTROIMÁN' });
      this.run.pits.push({ x0: x0 + 90, x1: x0 + L + 130 });
      this.run.add({ type: 'spikes', ceiling: true, x: x0 + L - 70, w: 280, y: K.CEIL, h: 18 });
      this.run.add({ type: 'platform', x: x0 + L - 150, w: 290, y: K.GROUND - 130 });
      return off + L + 140;
    }
    dopant(x) {
      const p = CD.DB.progress;
      const locked = CD.DB.playable.filter(m => !p.unlocked.includes(m.id));
      const m = locked.length && Math.random() < 0.7 ? pick(locked) : pick(CD.DB.playable);
      this.run.add({ type: 'dopant', x, y: K.GROUND - rnd(50, 110), w: 28, h: 28, mat: m.id });
      return 40;
    }
    platformPit(x, a) {
      const air = 0.6 * this.run.speed * this.airtime(a.minGs);
      const seg = Math.max(80, Math.min(air, 200));
      const pw = 150;
      const w = seg * 2 + pw;
      this.run.pits.push({ x0: x, x1: x + w });
      this.run.add({ type: 'platform', x: x + seg, w: pw, y: K.GROUND - 80 });
      if (Math.random() < 0.5) this.run.add({ type: 'dopant', x: x + seg + pw / 2 - 14, y: K.GROUND - 150, w: 28, h: 28, mat: pick(CD.DB.playable).id });
      return w;
    }
    combo(x, a, d) {
      const opts = ['block', 'spikes', 'saw', 'arc', 'pit'];
      let L = 0;
      for (let i = 0; i < 3; i++) {
        const n = pick(opts);
        L += this[n](x + L, a, d) + Math.max(150, this.run.speed * 0.42);
      }
      return L;
    }
  }

  CD.Level = Level;
  CD.Level.survival = survival;
  CD.Level.lifts = lifts;
})();
