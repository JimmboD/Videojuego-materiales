/* Crystal Dash — interfaz de menús, Laboratorio (Árbol Periódico) y pantallas */
(function () {
  const DB = CD.DB, A = CD.Audio;
  const $ = id => document.getElementById(id);

  const overlays = {
    menu: $('menu'),
    lab: $('lab'),
    guide: $('guide'),
    over: $('over'),
    pause: $('pause'),
  };

  let selectedId = DB.progress.loadout[0] || DB.playable[0].id;
  let labActive = false;
  let labPreviewCanvas = null;

  const UI = {
    activeOverlay: 'menu',

    show(name) {
      this.activeOverlay = name || null;
      labActive = name === 'lab';
      for (const k in overlays) {
        overlays[k].classList.toggle('hidden', k !== name);
      }
      if (name === 'menu') this.refreshMenu();
      if (name === 'lab') this.renderLab();
    },

    refreshMenu() {
      const p = DB.progress;
      $('menuBest').textContent = `Récord: ${p.best} pts`;
      $('menuCredits').textContent = `Puntos de síntesis: ${p.credits} · Materiales: ${p.unlocked.length}/${DB.playable.length}`;
    },

    showOver(run, earned, isRecord) {
      $('overTitle').textContent = run.deathTitle || 'Fractura catastrófica';
      $('overReason').textContent = run.deathReason || '';
      $('overScore').textContent = run.score;
      const parts = [`+${earned} pts de síntesis`, `Distancia: ${Math.round(run.dist / 10)} m`];
      if (run.maxCombo > 1) parts.push(`Combo máx: x${run.maxCombo}`);
      if (isRecord) parts.push('★ NUEVO RÉCORD');
      $('overInfo').textContent = parts.join('  ·  ');
      this.show('over');
    },

    renderLab() {
      const p = DB.progress;
      $('labCredits').textContent = p.credits;
      this.renderLoadout();
      this.renderGrid();
      this.renderDetail();
    },

    renderLoadout() {
      const p = DB.progress;
      const box = $('loadout');
      box.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const id = p.loadout[i];
        const m = id ? DB.get(id) : null;
        const el = document.createElement('div');
        el.className = 'slot' + (m ? ' filled' : '');
        if (m) {
          el.style.borderColor = m.color;
          el.style.background = 'rgba(20, 38, 60, 0.9)';
          el.innerHTML = `<b>${m.formula}</b><span>${i + 1} · ${m.name.split(' ')[0]}</span>`;
          el.title = 'Clic para quitar del carrusel';
          el.onclick = () => {
            if (p.loadout.length <= 1) return;
            p.loadout.splice(i, 1);
            DB.save();
            A.play('switch');
            this.renderLab();
          };
        } else {
          el.innerHTML = `<span>Ranura ${i + 1}</span><small>vacía</small>`;
        }
        box.appendChild(el);
      }
    },

    renderGrid() {
      const p = DB.progress;
      const grid = $('matGrid');
      grid.innerHTML = '';
      const sorted = DB.playable.slice().sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
      for (const m of sorted) {
        const unlocked = p.unlocked.includes(m.id);
        const equipped = p.loadout.includes(m.id);
        const card = document.createElement('div');
        card.className = 'card' + (unlocked ? '' : ' locked') + (m.id === selectedId ? ' sel' : '');
        const tags = [];
        if (m.tc_supercon > 0) tags.push('<span class="tagc sc">SC</span>');
        if (m.magmom > 0.5) tags.push('<span class="tagc mag">MAG</span>');
        if (m.engine.metastable) tags.push('<span class="tagc meta">META</span>');
        if (m.two_d) tags.push('<span class="tagc d2">2D</span>');
        if (m.engine.elec_class === 'insulator') tags.push('<span class="tagc">AISL</span>');
        else if (m.engine.elec_class === 'semiconductor') tags.push('<span class="tagc">SEMI</span>');

        card.innerHTML = `
          <div class="sw" style="background:${m.color}"></div>
          <div class="f">${m.formula}</div>
          <div class="n">${m.name}</div>
          <div class="tags">${tags.join('')}</div>
          ${unlocked ? '' : `<div class="cost">⚗ ${m.cost} pts</div>`}
          ${equipped ? '<div class="eq">✓ Equipado</div>' : ''}
        `;
        card.onclick = () => {
          selectedId = m.id;
          this.renderGrid();
          this.renderDetail();
        };
        grid.appendChild(card);
      }
    },

    renderDetail() {
      const p = DB.progress;
      const m = DB.get(selectedId) || DB.playable[0];
      const e = m.engine;
      const unlocked = p.unlocked.includes(m.id);
      const eqIdx = p.loadout.indexOf(m.id);
      const box = $('matDetail');

      const elecLabel = e.elec_class === 'metal' ? 'Metal (conductor)'
        : e.elec_class === 'insulator' ? 'Aislante eléctrico'
        : `Semiconductor (conduce > ${e.arc_activation_T} K)`;

      box.innerHTML = `
        <canvas id="labCrystal" width="160" height="120"></canvas>
        <h3>${m.formula} <small style="font-size:13px;color:var(--dim)">${m.spg_symbol}</small></h3>
        <div class="sub">${m.name}${m.jid ? ' · ' + m.jid : ''}</div>
        <div class="actions" id="labActions"></div>
        <table>
          <tr><td>Densidad (ρ)</td><td>${m.density} g/cm³ (g×${e.gravity_scale.toFixed(2)})</td></tr>
          <tr><td>Mód. volumétrico (B)</td><td>${m.bulk_modulus} GPa</td></tr>
          <tr><td>Mód. de corte (G)</td><td>${m.shear_modulus} GPa</td></tr>
          <tr><td>Mód. de Young (E)</td><td>${e.young_modulus} GPa</td></tr>
          <tr><td>Cociente de Pugh (B/G)</td><td>${e.pugh_ratio} (${e.ductile ? 'dúctil' : 'frágil'})</td></tr>
          <tr><td>Bandgap (E<sub>g</sub>)</td><td>${m.bandgap} eV</td></tr>
          <tr><td>Clase eléctrica</td><td>${elecLabel}</td></tr>
          <tr><td>Cond. térmica (κ)</td><td>${m.thermal_conductivity} W/m·K</td></tr>
          <tr><td>Punto de fusión (T<sub>m</sub>)</td><td>${m.melting_point} K</td></tr>
          <tr><td>Momento mag. (μ<sub>B</sub>)</td><td>${m.magmom} μ<sub>B</sub>${m.curie_T ? ` (T<sub>C</sub> ${m.curie_T} K)` : ''}</td></tr>
          <tr><td>Superconductor (T<sub>c</sub>)</td><td>${m.tc_supercon > 0 ? m.tc_supercon + ' K' : 'No'}</td></tr>
          <tr><td>Estabilidad (e<sub>hull</sub>)</td><td>${m.ehull} eV/át${e.metastable ? ` (decaimiento ${e.decay_time} s)` : ' (estable)'}</td></tr>
        </table>
        ${m.note ? `<div class="src" style="color:#ffd27a">Nota: ${m.note}</div>` : ''}
        <div class="src">Fuente: ${m.source}</div>
      `;

      labPreviewCanvas = $('labCrystal');

      const act = $('labActions');
      if (!unlocked) {
        const btn = document.createElement('button');
        btn.className = 'primary';
        btn.textContent = `⚗ Sintetizar (${m.cost} pts)`;
        btn.disabled = p.credits < m.cost;
        btn.onclick = () => {
          if (p.credits < m.cost) return;
          p.credits -= m.cost;
          p.unlocked.push(m.id);
          if (p.loadout.length < 4) p.loadout.push(m.id);
          DB.save();
          A.play('absorb');
          this.renderLab();
        };
        act.appendChild(btn);
      } else if (eqIdx >= 0) {
        const btn = document.createElement('button');
        btn.textContent = 'Quitar del carrusel';
        btn.disabled = p.loadout.length <= 1;
        btn.onclick = () => {
          if (p.loadout.length <= 1) return;
          p.loadout.splice(eqIdx, 1);
          DB.save();
          A.play('switch');
          this.renderLab();
        };
        act.appendChild(btn);
      } else {
        const btn = document.createElement('button');
        btn.className = 'primary';
        btn.textContent = p.loadout.length < 4 ? '+ Equipar en carrusel' : 'Carrusel lleno (4/4)';
        btn.disabled = p.loadout.length >= 4;
        btn.onclick = () => {
          if (p.loadout.length >= 4) return;
          p.loadout.push(m.id);
          DB.save();
          A.play('switch');
          this.renderLab();
        };
        act.appendChild(btn);
      }
    },

    tickPreview(t) {
      if (!labActive || !labPreviewCanvas) return;
      const m = DB.get(selectedId);
      if (!m) return;
      const ctx = labPreviewCanvas.getContext('2d');
      ctx.clearRect(0, 0, labPreviewCanvas.width, labPreviewCanvas.height);
      const col = (m.color === '#2b2b3a' || m.color === '#1f2a30') ? '#8899aa' : m.color;
      CD.Crystal.draw(ctx, 80, 60, 74, m.lattice, t, col);
    },
  };

  CD.UI = UI;
})();
