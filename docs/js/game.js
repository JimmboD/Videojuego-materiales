/* Crystal Dash — física del jugador, zonas, colisiones y estados especiales */
(function () {
  const K = CD.K, DB = CD.DB, A = CD.Audio;

  const HINTS = {
    block: 'BLOQUE: si tu módulo volumétrico B supera el del bloque, lo pulverizas (contorno verde). Si no, sáltalo.',
    wall: 'MURO REFORZADO: no se puede saltar. Cambia a un material con B mayor que el indicado.',
    saw: 'CIZALLA: atraviesas el disco si tu módulo de corte G es mayor. Si no, salta.',
    laser: 'LÁSER SUPERIOR: debes ir pegado al suelo. Salto corto, o material denso + salto en el aire = picada.',
    arc: 'ARCO VOLTAICO: metales cargan el capacitor (sobrecarga al 100 %), aislantes Eg>3 eV inmunes, semiconductores conducen solo calientes.',
    hot: 'ZONA CALIENTE: dT/dt = k·κ·(T_zona − T). Baja κ (ZrO₂, Inconel) aísla. No superes tu punto de fusión.',
    cryo: 'CRIOGENIA: si T_zona < T_c de tu material → Estado Meissner: levitas sobre pinchos y ácido.',
    magnet: 'ELECTROIMÁN: ferromagnéticos (Fe, Co, Gd frío) se pegan al techo. Cambia a no magnético para soltarte.',
    dopant: 'CRISTAL DOPANTE: tócalo para mutar 8 s a ese compuesto.',
    pit: 'ÁCIDO: los materiales ligeros recorren más distancia en el aire. Mantén salto para planear (ρ baja).',
    meta: 'METAESTABLE (ehull > 0.05 eV/át): usarlo seguido provoca transición de fase. Rota de material para dejarlo "descansar".',
  };

  class Run {
    constructor(loadoutIds) {
      this.loadout = loadoutIds.map(id => DB.get(id)).filter(Boolean);
      this.slot = 0;
      this.slotStress = this.loadout.map(() => 0);
      this.slotDecay = this.loadout.map(() => 0);
      this.absorbed = null; this.absorbTimer = 0;
      this.p = { y: K.GROUND - K.PS, vy: 0, ground: true, ceil: false, peakY: K.GROUND - K.PS, rot: 0, coyote: 0, cut: false, onPlat: null };
      this.T = 300; this.energy = 0; this.integrity = 3; this.invuln = 0;
      this.dist = 0; this.speed = 380; this.time = 0; this.bonus = 0;
      this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
      this.objects = []; this.zones = []; this.pits = [];
      this.particles = []; this.popups = []; this.toast = null;
      this.meissner = false; this.wasMeissner = false; this.flushPending = false; this.lastZone = null;
      this.jumpHeld = false; this.jumpBuffer = 0;
      this.shake = 0; this.flash = null;
      this.dead = false; this.deathTitle = ''; this.deathReason = '';
      this.level = new CD.Level(this);
      this.level.update();
    }

    // ---------- accesos ----------
    get difficulty() { return Math.min(1, this.dist / 32000); }
    get score() { return Math.floor(this.dist / 10 + this.bonus); }
    baseMat(i) { const m = this.loadout[i]; return this.slotDecay[i] > 0 ? DB.decayOf(m) : m; }
    get mat() { return this.absorbed || this.baseMat(this.slot); }
    add(o) { this.objects.push(o); }
    zonesAt(x) { return this.zones.filter(z => x >= z.x0 && x <= z.x1); }
    overPit(x) { return this.pits.some(p => x > p.x0 && x < p.x1); }

    // ---------- entrada ----------
    pressJump() {
      this.jumpHeld = true;
      if (this.dead) return;
      const p = this.p, e = this.mat.engine;
      if (p.ceil) { p.ceil = false; p.vy = 420; return; }
      if (p.ground || p.coyote > 0 || this.meissner && p.y >= this.hoverY() - 2) { this.doJump(); return; }
      if (e.gravity_scale >= 1.25 && p.vy < 900) {          // picada
        p.vy = 1350; this.pop('PICADA', '#9fb4ff'); A.play('fastfall');
        return;
      }
      this.jumpBuffer = 0.12;
    }
    releaseJump() {
      this.jumpHeld = false;
      const p = this.p;
      if (p.vy < 0 && !p.cut && !p.ceil) { p.vy *= 0.5; p.cut = true; }
    }
    doJump() {
      const p = this.p;
      p.vy = -K.V_JUMP; p.ground = false; p.coyote = 0; p.cut = false; p.onPlat = null;
      p.peakY = p.y; this.jumpBuffer = 0;
      A.play('jump');
    }
    switchMat(dir = 1, direct = null) {
      if (this.dead) return;
      const n = this.loadout.length;
      if (this.absorbed) { this.absorbed = null; this.absorbTimer = 0; }
      else if (direct !== null) { if (direct >= n || direct === this.slot) return; this.slot = direct; }
      else this.slot = (this.slot + dir + n) % n;
      const p = this.p, m = this.mat;
      A.play('switch');
      this.burst(K.PX + K.PS / 2, p.y + K.PS / 2, m.color, 8, 120);
      if (!p.ground && !p.ceil && m.engine.gravity_scale >= 1.25 && p.vy < 600) {
        p.vy = Math.max(p.vy, 700); this.pop('AIR-CANCEL', '#9fb4ff');
      }
    }

    // ---------- efectos ----------
    pop(text, color = '#fff', x = K.PX + K.PS / 2, y = this.p.y - 10) {
      this.popups.push({ text, color, x, y, t: 0 });
    }
    burst(x, y, color, n, spd, life = 0.6, grav = 600) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life, t: 0, color, size: 2 + Math.random() * 3, grav });
      }
    }
    hint(type) {
      const seen = DB.progress.seen;
      if (seen[type] || !HINTS[type]) return;
      seen[type] = true; DB.save();
      this.toast = { text: HINTS[type], t: 0 };
    }
    die(title, reason) {
      if (this.dead) return;
      this.dead = true; this.deathTitle = title; this.deathReason = reason;
      this.shake = 18; A.play('die');
      this.burst(K.PX + K.PS / 2, this.p.y + K.PS / 2, this.mat.color, 40, 380, 1.2);
    }
    /* golpe mortal: el capacitor actúa como escudo */
    lethal(title, reason, obj) {
      if (this.invuln > 0) return true;
      if (this.meissner || this.energy >= 50) {
        if (!this.meissner) this.energy -= 50;
        this.invuln = 0.6; this.flash = { color: '#5ff2ff', t: 0.25 };
        if (obj) obj.dead = true;
        this.pop('ESCUDO', '#5ff2ff'); A.play('shield');
        return true;
      }
      this.die(title, reason);
      return false;
    }
    chip(reason) {
      if (this.invuln > 0) return;
      this.integrity--; this.invuln = 0.8; this.shake = 8;
      this.flash = { color: '#ff5d6c', t: 0.2 };
      this.pop(reason, '#ff8a95'); A.play('chip');
      this.burst(K.PX + K.PS / 2, this.p.y + K.PS, '#ffffff', 14, 220);
      if (this.integrity <= 0) this.die('Integridad estructural agotada', 'Las microfracturas acumuladas (' + reason.toLowerCase() + ') propagaron una grieta crítica.');
    }

    hoverY() { return K.GROUND - K.PS - K.HOVER; }

    // ---------- bucle ----------
    update(dt) {
      if (this.dead) { this.updateFx(dt); return; }
      this.time += dt;
      this.speed = Math.min(960, 380 + this.time * 7.5);
      this.dist += this.speed * dt;
      this.invuln = Math.max(0, this.invuln - dt);
      this.level.update();

      this.updateThermal(dt);
      if (this.dead) return;
      this.updateMaterialTimers(dt);
      this.updatePlayer(dt);
      if (this.dead) return;
      this.collide();
      this.cleanup();
      this.updateFx(dt);
      if (this.comboTimer > 0 && (this.comboTimer -= dt) <= 0) this.combo = 0;
    }

    updateThermal(dt) {
      const m = this.mat, e = m.engine, px = this.dist + K.PS / 2;
      const zs = this.zonesAt(px);
      const tz = zs.find(z => z.kind === 'hot' || z.kind === 'cryo');
      zs.forEach(z => this.hint(z.kind));
      const audioZone = zs.find(z => z.kind === 'hot' || z.kind === 'cryo' || z.kind === 'magnet');
      const audioKind = audioZone ? audioZone.kind : null;
      if (audioKind !== this.lastAudioZone) {
        A.setZoneSound(audioKind);
        this.lastAudioZone = audioKind;
      }
      const Tz = tz ? tz.T : 300, k = tz ? tz.k : K.K_AMB;
      // dT/dt = k·κ·(Tz − T)  → solución exacta del paso
      this.T = Tz + (this.T - Tz) * Math.exp(-k * e.heat_rate * dt);

      // entrada a zona
      if (tz !== this.lastZone) {
        if (tz && tz.kind === 'cryo') {
          if (this.T > 900) {
            if (!e.ductile && m.thermal_conductivity < 100) this.chip('CHOQUE TÉRMICO');
            else this.flushPending = true;
          }
        } else this.flushPending = false;
        this.lastZone = tz;
      }
      if (this.flushPending && tz && tz.kind === 'cryo' && this.T < 400) {
        this.flushPending = false;
        if (e.heat_rate >= 0.6) { this.bonus += 300; this.pop('THERMAL FLUSH +300', '#8ff'); A.play('flush'); this.burst(K.PX + 17, this.p.y, '#ddf', 25, 200, 1, -200); }
      }

      // Meissner
      const tc = m.tc_supercon || 0;
      this.meissner = tc > 0 && (this.T < tc || (tz && tz.kind === 'cryo' && tz.T < tc));
      if (this.meissner && !this.wasMeissner) { this.pop('ESTADO MEISSNER', '#5ff2ff'); A.play('meissner'); this.bonus += 100; }
      this.wasMeissner = this.meissner;
      if (this.meissner) this.energy = 100;

      if (this.T >= m.melting_point) {
        this.die('Fusión', `${m.name} alcanzó ${Math.round(this.T)} K y superó su punto de fusión (${m.melting_point} K). Con κ = ${m.thermal_conductivity} W/m·K absorbió el calor de la zona demasiado rápido.`);
      }
    }

    updateMaterialTimers(dt) {
      for (let i = 0; i < this.loadout.length; i++) {
        if (this.slotDecay[i] > 0) {
          this.slotDecay[i] -= dt;
          if (this.slotDecay[i] <= 0) { this.slotDecay[i] = 0; if (i === this.slot && !this.absorbed) this.pop('RECRISTALIZADO', '#9f9'); }
          continue;
        }
        const m = this.loadout[i];
        if (!m.engine.metastable) continue;
        const active = i === this.slot && !this.absorbed;
        if (active) {
          this.slotStress[i] += dt;
          if (this.slotStress[i] >= m.engine.decay_time) {
            this.slotStress[i] = 0; this.slotDecay[i] = 10;
            const d = DB.decayOf(m);
            this.pop(`TRANSICIÓN: ${m.formula} → ${d.formula}`, '#ffb347');
            A.play('phase'); this.hint('meta');
            this.burst(K.PX + 17, this.p.y + 17, '#ffb347', 20, 200);
          }
        } else this.slotStress[i] = Math.max(0, this.slotStress[i] - dt * 0.5);
      }
      if (this.absorbed && (this.absorbTimer -= dt) <= 0) { this.absorbed = null; this.pop('FIN DOPAJE', '#ccc'); }
    }

    updatePlayer(dt) {
      const p = this.p, m = this.mat, e = m.engine;
      const px = this.dist + K.PS / 2;
      const g = K.G0 * e.gravity_scale;
      const inMagnet = this.zonesAt(px).some(z => z.kind === 'magnet');
      const aMag = inMagnet ? DB.magAt(m, this.T) * K.K_MAG : 0;
      if (inMagnet) this.hint('magnet');
      const prevBottom = p.y + K.PS;

      p.coyote = Math.max(0, p.coyote - dt);
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

      if (aMag > g) {                              // atracción al techo
        p.ground = false; p.onPlat = null;
        if (!p.ceil) { p.vy -= (aMag - g + 1800) * dt; }
      } else {
        if (p.ceil) { p.ceil = false; p.vy = 0; p.peakY = p.y; }
        if (!p.ground) {
          let acc = g - aMag;
          p.vy += acc * dt;
          if (this.jumpHeld && p.vy > 0 && e.gravity_scale < 0.9) {      // planeo
            const cap = 70 + 260 * e.gravity_scale;
            if (p.vy > cap) p.vy = cap;
          }
        }
      }
      p.y += p.vy * dt;
      if (p.y < p.peakY) p.peakY = p.y;

      // techo
      if (p.y <= K.CEIL) {
        p.y = K.CEIL;
        if (aMag > g) { if (!p.ceil) { p.ceil = true; A.play('magnet'); this.pop('ADHERIDO', '#e9a8ff'); } p.vy = 0; }
        else if (p.vy < 0) p.vy = 0;
      }

      // suelo / plataformas / levitación
      const overPit = this.overPit(px);
      let floor = Infinity, plat = null;
      if (this.meissner) floor = this.hoverY();
      else if (!overPit) floor = K.GROUND - K.PS;
      for (const o of this.objects) {
        if (o.type !== 'platform') continue;
        const sx = o.x - this.dist + K.PX;
        if (K.PX + K.PS > sx + 4 && K.PX < sx + o.w - 4) {
          const top = o.y - K.PS;
          if (prevBottom <= o.y + 1 && p.y >= top - 0.5 && p.vy >= 0 && top < floor) { floor = top; plat = o; }
        }
      }
      if (!p.ceil) {
        if (p.ground) {
          let sup;
          if (p.onPlat) {
            const sx = p.onPlat.x - this.dist + K.PX;
            sup = K.PX + K.PS > sx + 4 && K.PX < sx + p.onPlat.w - 4;
          } else sup = floor !== Infinity;
          if (!sup) { p.ground = false; p.onPlat = null; p.coyote = 0.08; p.peakY = p.y; p.vy = Math.max(p.vy, 0); }
          else if (!p.onPlat) p.y += (floor - p.y) * Math.min(1, dt * 12);
        }
        if (!p.ground && p.y >= floor) {
          p.y = floor;
          this.land(plat);
        }
      }

      // ácido
      if (overPit && !this.meissner && p.y > K.GROUND - K.PS + 14) {
        this.hint('pit');
        this.lethal('Disuelto en ácido', `${m.name} no tuvo suficiente tiempo de vuelo: con ρ = ${m.density} g/cm³ su gravedad efectiva es ${e.gravity_scale.toFixed(2)}·g₀.`);
        if (!this.dead) { p.y = K.GROUND - K.PS - 1; p.vy = -K.V_JUMP * 0.9; p.ground = false; p.peakY = p.y; }
        return;
      }

      if (this.jumpBuffer > 0 && p.ground) this.doJump();
      const Q = Math.PI / 2;
      if (p.ground || p.ceil) p.rot += (Math.round(p.rot / Q) * Q - p.rot) * Math.min(1, dt * 18);
      else p.rot += dt * 4.5 / e.gravity_scale;
    }

    land(plat) {
      const p = this.p, m = this.mat, e = m.engine;
      const h = p.y - p.peakY;
      p.ground = true; p.vy = 0; p.cut = false; p.onPlat = plat;
      if (h > 40) this.burst(K.PX + K.PS / 2, p.y + K.PS, '#8aa', 5, 80, 0.4);
      if (!this.meissner && !e.ductile && h > 150) {
        this.chip('ASTILLADO (B/G<1.75)');
      }
      p.peakY = p.y;
    }

    collide() {
      const p = this.p, m = this.mat, e = m.engine;
      const L = K.PX + 4, R = K.PX + K.PS - 4, T = p.y + 4, B = p.y + K.PS - 3;
      for (const o of this.objects) {
        if (o.dead || o.type === 'platform') continue;
        const sx = o.x - this.dist + K.PX;
        if (sx < K.W + 40 && !o.seen) { o.seen = true; this.hint(o.type === 'block' && o.full ? 'wall' : o.type); }
        if (R < sx || L > sx + o.w || B < o.y || T > o.y + o.h) continue;
        switch (o.type) {
          case 'block':
            if (e.break_threshold > o.B) {
              o.dead = true;
              this.combo++; this.comboTimer = 3; this.maxCombo = Math.max(this.maxCombo, this.combo);
              const pts = 40 * this.combo;
              this.bonus += pts; this.shake = 6;
              this.pop(`FRACTURA FRÁGIL x${this.combo} +${pts}`, '#5dff9b');
              this.burst(sx + o.w / 2, p.y + 17, '#cfd8e3', 22, 320);
              A.play('smash');
            } else this.lethal('Fractura catastrófica', `B de ${m.name} = ${m.bulk_modulus} GPa ≤ B del ${o.label} = ${o.B} GPa. Necesitabas un material con mayor módulo volumétrico.`, o);
            break;
          case 'saw':
            if (e.shear_threshold > o.G) {
              o.dead = true; this.bonus += 60; this.pop('DISCO ROTO +60', '#5dff9b');
              this.burst(sx + o.w / 2, o.y + o.h / 2, '#ffd27a', 18, 300); A.play('smash');
            } else this.lethal('Cizallado', `G de ${m.name} = ${m.shear_modulus} GPa ≤ G del ${o.label} = ${o.G} GPa.`, o);
            break;
          case 'spikes':
            if (this.meissner && !o.ceiling) break;
            this.lethal('Perforado', o.ceiling ? 'Pinchos del techo: suéltate del electroimán cambiando a un material no ferromagnético.' : 'Pinchos del suelo. Un superconductor en estado Meissner habría levitado encima.', o);
            break;
          case 'laser':
            this.lethal('Ablación láser', 'Saltaste dentro del haz. Usa un salto corto o un material denso para caer en picada.', o);
            break;
          case 'arc': if (!o.hit) { o.hit = true; this.arcHit(o); } break;
          case 'dopant': {
            o.dead = true;
            const dm = DB.get(o.mat);
            this.absorbed = dm; this.absorbTimer = 8;
            this.bonus += 50;
          this.flash = { color: dm.color, t: 0.48 };
            this.pop(`DOPAJE → ${dm.formula}`, '#ffd27a'); A.play('absorb');
            this.burst(K.PX + 17, p.y + 17, dm.color, 20, 200);
            break;
          }
        }
        if (this.dead) return;
      }
    }

    arcHit(o) {
      const m = this.mat, e = m.engine;
      A.play('zap');
      this.burst(K.PX + 17, this.p.y + 17, '#9df', 16, 260);
      if (this.meissner) { this.bonus += 80; this.pop('RESISTENCIA CERO +80', '#5ff2ff'); return; }
      const conducts = e.elec_class === 'metal' || (e.elec_class === 'semiconductor' && this.T >= e.arc_activation_T);
      if (e.elec_class === 'insulator') { this.bonus += 30; this.pop(`AISLANTE (Eg ${m.bandgap} eV)`, '#ccf'); return; }
      if (conducts) {
        if (this.energy >= 99.5) { this.chip('SOBRECARGA JOULE'); this.T += 450; return; }
        this.energy = Math.min(100, this.energy + 40);
        this.bonus += 50;
        this.pop(e.elec_class === 'metal' ? 'CARGA +40%' : 'PORTADORES TÉRMICOS +40%', '#ffe066');
        return;
      }
      this.chip(`RUPTURA DIELÉCTRICA (T<${e.arc_activation_T} K)`);
    }

    cleanup() {
      const lim = this.dist - 400;
      this.objects = this.objects.filter(o => o.x + o.w > lim && !o.dead);
      this.zones = this.zones.filter(z => z.x1 > lim);
      this.pits = this.pits.filter(q => q.x1 > lim);
    }

    updateFx(dt) {
      for (const q of this.particles) { q.t += dt; q.vy += q.grav * dt; q.x += q.vx * dt - (this.dead ? 0 : this.speed * dt * 0.3); q.y += q.vy * dt; }
      this.particles = this.particles.filter(q => q.t < q.life);
      for (const q of this.popups) { q.t += dt; q.y -= 40 * dt; }
      this.popups = this.popups.filter(q => q.t < 1.3);
      if (this.toast && (this.toast.t += dt) > 6) this.toast = null;
      this.shake = Math.max(0, this.shake - dt * 40);
      if (this.flash && (this.flash.t -= dt) <= 0) this.flash = null;
    }
  }

  CD.Run = Run;
})();
