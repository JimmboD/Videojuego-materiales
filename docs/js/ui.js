/* Crystal Dash — interfaz de menús y laboratorio */
(function () {
  const DB = CD.DB, A = CD.Audio, $ = id => document.getElementById(id);
  const overlays = { menu: $('menu'), lab: $('lab'), guide: $('guide'), settings: $('settings'), over: $('over'), pause: $('pause') };
  const soundtracks = [
    { id: 'menu', name: 'Crystal Dash', description: 'Tema principal · disponible', cost: 0 },
    { id: 'materials', name: 'Materiales', description: 'Chiptune de síntesis y exploración', cost: 120 },
    { id: 'orbit', name: 'Órbita', description: 'Secuencia electrónica de alta energía', cost: 180 },
    { id: 'reactor', name: 'Pulso de reactores', description: 'Ritmo de 8 bits para la carrera', cost: 220, mode: 'game' },
    { id: 'resonance', name: 'Resonancia cuántica', description: 'Melodía extendida para la partida', cost: 260, mode: 'game' },
    { id: 'ionstorm', name: 'Aurora de iones', description: 'Paisaje rítmico extendido para correr', cost: 300, mode: 'game' },
  ];
  let selectedId = DB.progress.loadout[0] || DB.playable[0].id;
  let selectedSlot = 0, labActive = false, labPreviewCanvas = null, activeLabTab = 'materials';
  const UI = {
    activeOverlay: 'menu',
    show(name) {
      this.activeOverlay = name || null; labActive = name === 'lab';
      for (const key in overlays) overlays[key].classList.toggle('hidden', key !== name);
      if (name === 'menu') this.refreshMenu();
      if (name === 'lab') { activeLabTab = 'materials'; this.renderLab(); this.setLabTab(activeLabTab); }
    },
    refreshMenu() {
      const p = DB.progress;
      $('menuBest').textContent = `Récord: ${p.best} pts`;
      $('menuCredits').textContent = `${p.credits} Artecoins`;
      $('menuMaterials').textContent = `${p.unlocked.length} / ${DB.playable.length}`;
    },
    showOver(run, earned, isRecord) {
      $('overTitle').textContent = run.deathTitle || 'Fractura catastrófica';
      $('overReason').textContent = run.deathReason || ''; $('overScore').textContent = run.score;
      const parts = [`+${earned} Artecoins`, `Distancia: ${Math.round(run.dist / 10)} m`];
      if (run.maxCombo > 1) parts.push(`Combo máx: x${run.maxCombo}`);
      if (isRecord) parts.push('★ NUEVO RÉCORD');
      $('overInfo').textContent = parts.join('  ·  '); this.show('over');
    },
    renderLab(effect) {
      if (effect === 'synthesis') {
        const panel = $('lab').querySelector('.panel');
        panel.classList.remove('synthesis-burst'); void panel.offsetWidth; panel.classList.add('synthesis-burst');
        window.setTimeout(() => panel.classList.remove('synthesis-burst'), 850);
      }
      $('labCredits').textContent = DB.progress.credits;
      this.renderSoundtracks();
      this.renderLoadout(effect); this.renderGrid(); this.renderDetail();
    },
    renderSoundtracks() {
      const p = DB.progress, menuList = $('menuSoundtrackList'), gameList = $('gameSoundtrackList');
      $('soundtrackCredits').textContent = p.credits; menuList.innerHTML = ''; gameList.innerHTML = '';
      for (const track of soundtracks) {
        const owned = p.soundtrackOwned.includes(track.id), inGame = track.mode === 'game', selected = !inGame && p.selectedSoundtrack === track.id;
        const card = document.createElement('article'); card.className = `track-card${track.mode === 'game' ? ' in-game' : ''}${selected ? ' selected' : ''}${owned ? ' owned' : ''}`;
        const disabled = inGame ? (owned || p.credits < track.cost) : (selected || (!owned && p.credits < track.cost));
        card.innerHTML = `<div class="track-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="track-copy"><b>${track.name}</b><small>${track.description}</small></div><div class="track-actions"><button class="track-preview" type="button">Escuchar</button><button class="track-action" type="button" ${disabled ? 'disabled' : ''}>${inGame ? owned ? 'En rotación' : `Comprar · ${track.cost} Artecoins` : selected ? 'En uso' : owned ? 'Usar en menú' : `Comprar · ${track.cost} Artecoins`}</button></div>`;
        card.querySelector('.track-preview').onclick = () => A.previewMusic(track.id, 'shop');
        card.querySelector('.track-action').onclick = () => {
          if (!owned) { if (p.credits < track.cost) return; p.credits -= track.cost; p.soundtrackOwned.push(track.id); p.musicPurchased = p.soundtrackOwned.includes('materials'); }
          if (!inGame) p.selectedSoundtrack = track.id;
          DB.save(); A.play(owned ? 'select' : 'absorb'); this.renderSoundtracks();
        };
        (inGame ? gameList : menuList).appendChild(card);
      }
    },
    setLabTab(tab) {
      activeLabTab = tab === 'soundtrack' ? 'soundtrack' : 'materials';
      const materials = activeLabTab === 'materials';
      $('labMaterialsView').classList.toggle('hidden', !materials);
      $('labSoundtrackView').classList.toggle('hidden', materials);
      $('labMaterialsTab').classList.toggle('active', materials); $('labMaterialsTab').setAttribute('aria-selected', String(materials));
      $('labSoundtrackTab').classList.toggle('active', !materials); $('labSoundtrackTab').setAttribute('aria-selected', String(!materials));
      A.startMusic(materials ? 'lab' : 'shop');
    },
    renderLoadout(effect) {
      const p = DB.progress, box = $('loadout'); box.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const mat = p.loadout[i] ? DB.get(p.loadout[i]) : null;
        const slot = document.createElement('div');
        slot.className = `slot${mat ? ' filled' : ''}${i === selectedSlot ? ' target' : ''}${effect && i === selectedSlot ? ` ${effect}` : ''}`;
        if (mat) {
          slot.style.borderColor = mat.color; slot.innerHTML = `<b>${mat.formula}</b><span>${i + 1} · ${mat.name.split(' ')[0]}</span>`;
          slot.title = 'Clic para elegir ranura · doble clic para quitar';
          slot.onclick = () => { selectedSlot = i; this.renderLoadout(); };
          slot.draggable = true;
          slot.ondragstart = event => { event.dataTransfer.setData('text/loadout-index', String(i)); event.dataTransfer.effectAllowed = 'move'; slot.classList.add('dragging'); };
          slot.ondragend = () => slot.classList.remove('dragging');
          slot.ondragover = event => { event.preventDefault(); slot.classList.add('drop-target'); };
          slot.ondragleave = () => slot.classList.remove('drop-target');
          slot.ondrop = event => {
            event.preventDefault(); slot.classList.remove('drop-target');
            const from = Number(event.dataTransfer.getData('text/loadout-index'));
            if (Number.isInteger(from) && from >= 0 && from < p.loadout.length && from !== i) {
              [p.loadout[from], p.loadout[i]] = [p.loadout[i], p.loadout[from]];
              selectedSlot = i; DB.save(); A.play('switch'); this.renderLab('equip'); return;
            }
            const materialId = event.dataTransfer.getData('text/material-id');
            if (materialId && p.unlocked.includes(materialId)) {
              const existing = p.loadout.indexOf(materialId);
              if (existing >= 0 && existing !== i) [p.loadout[existing], p.loadout[i]] = [p.loadout[i], p.loadout[existing]];
              else if (existing < 0) p.loadout[i] = materialId;
              selectedSlot = i; DB.save(); A.play('switch'); this.renderLab('equip');
            }
          };
          slot.ondblclick = () => {
            if (p.loadout.length <= 1) return;
            p.loadout.splice(i, 1); selectedSlot = Math.min(i, p.loadout.length - 1);
            DB.save(); A.play('switch'); this.renderLab('remove');
          };
        } else {
          slot.innerHTML = `<span>Ranura ${i + 1}</span><small>vacía</small>`;
          slot.onclick = () => { selectedSlot = i; this.renderLoadout(); };
          slot.ondragover = event => { event.preventDefault(); slot.classList.add('drop-target'); };
          slot.ondragleave = () => slot.classList.remove('drop-target');
          slot.ondrop = event => {
            event.preventDefault(); slot.classList.remove('drop-target');
            const materialId = event.dataTransfer.getData('text/material-id');
            if (!materialId || !p.unlocked.includes(materialId)) return;
            const existing = p.loadout.indexOf(materialId);
            if (existing >= 0) [p.loadout[existing], p.loadout[i]] = [p.loadout[i], p.loadout[existing]];
            else p.loadout[i] = materialId;
            selectedSlot = i; DB.save(); A.play('switch'); this.renderLab('equip');
          };
        }
        box.appendChild(slot);
      }
    },
    renderGrid() {
      const p = DB.progress, grid = $('matGrid'); grid.innerHTML = '';
      const tiers = ['Iniciales', 'Comunes', 'Avanzados', 'Exóticos', 'Ultra raros'];
      const sorted = DB.playable.slice().sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
      let lastTier = -1;
      for (const mat of sorted) {
        if (mat.tier !== lastTier) {
          lastTier = mat.tier; const title = document.createElement('h3');
          title.className = 'tier-heading';
          title.textContent = tiers[mat.tier] || `Nivel ${mat.tier}`;
          title.dataset.tier = mat.tier;
          title.setAttribute('role', 'button'); title.setAttribute('tabindex', '0'); title.setAttribute('aria-expanded', 'true');
          const toggleTier = () => {
            const collapsed = title.getAttribute('aria-expanded') === 'true';
            title.setAttribute('aria-expanded', String(!collapsed));
            let sibling = title.nextElementSibling;
            while (sibling && !sibling.classList.contains('tier-heading')) {
              sibling.classList.toggle('tier-item-hidden', collapsed); sibling = sibling.nextElementSibling;
            }
          };
          title.onclick = toggleTier;
          title.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleTier(); } };
          title.style.gridColumn = '1 / -1'; grid.appendChild(title);
        }
        const unlocked = p.unlocked.includes(mat.id), equipped = p.loadout.includes(mat.id);
        const card = document.createElement('div');
        card.className = `card${unlocked ? '' : ' locked'}${mat.id === selectedId ? ' sel' : ''}`;
        card.draggable = unlocked;
        card.ondragstart = event => {
          if (!unlocked) { event.preventDefault(); return; }
          event.dataTransfer.setData('text/material-id', mat.id); event.dataTransfer.effectAllowed = 'copy';
          card.classList.add('dragging');
        };
        card.ondragend = () => card.classList.remove('dragging');
        const tags = [];
        if (mat.tc_supercon > 0) tags.push('<span class="tagc sc">SC</span>');
        if (mat.magmom > .5) tags.push('<span class="tagc mag">MAG</span>');
        if (mat.engine.metastable) tags.push('<span class="tagc meta">META</span>');
        if (mat.two_d) tags.push('<span class="tagc d2">2D</span>');
        if (mat.engine.elec_class === 'insulator') tags.push('<span class="tagc">AISL</span>');
        else if (mat.engine.elec_class === 'semiconductor') tags.push('<span class="tagc">SEMI</span>');
        card.innerHTML = `${unlocked ? '' : '<svg class="lock-mark" viewBox="0 0 24 24" aria-label="Bloqueado"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></svg>'}<div class="sw" style="background:${mat.color}"></div><div class="f">${mat.formula}</div>
          <div class="n">${mat.name}</div><div class="card-meta"><span>${mat.two_d ? '2D' : '3D'} · ${mat.engine.elec_class}</span>${equipped ? '<b class="eq">✓ Equipado</b>' : ''}</div>
          <div class="tags">${tags.join('')}</div>`;
        card.onclick = () => {
          selectedId = mat.id;
          A.play('select');
          grid.querySelectorAll('.card').forEach(el => el.classList.toggle('sel', el === card));
          this.renderDetail(true);
        };
        card.ondblclick = () => { selectedId = mat.id; if (unlocked) this.equip(mat.id); else this.renderDetail(true); };
        grid.appendChild(card);
      }
    },
    equip(id) {
      const p = DB.progress, existing = p.loadout.indexOf(id);
      if (existing >= 0) { selectedSlot = existing; this.renderLoadout(); return; }
      if (selectedSlot < p.loadout.length) p.loadout[selectedSlot] = id;
      else if (p.loadout.length < 4) p.loadout.push(id); else return;
      DB.save(); A.play('switch'); this.renderLab('equip');
    },
    renderDetail(animate) {
      const p = DB.progress, mat = DB.get(selectedId) || DB.playable[0], e = mat.engine;
      const unlocked = p.unlocked.includes(mat.id), eqIdx = p.loadout.indexOf(mat.id), box = $('matDetail');
      if (animate) { box.classList.remove('detail-change'); void box.offsetWidth; box.classList.add('detail-change'); }
      const electrical = e.elec_class === 'metal' ? 'Metal · conductor' : e.elec_class === 'insulator' ? 'Aislante eléctrico' : `Semiconductor · >${e.arc_activation_T} K`;
      box.innerHTML = `<div class="detail-hero"><canvas id="labCrystal" width="160" height="120"></canvas><div class="detail-title">
        <span class="detail-kicker">${mat.two_d ? 'MATERIAL 2D' : 'MATERIAL CRISTALINO'}</span><h3>${mat.formula} <small>${mat.spg_symbol}</small></h3>
        <div class="sub">${mat.name}${mat.jid ? ` · ${mat.jid}` : ''}</div></div></div><div class="actions" id="labActions"></div>
        <div class="property-heading">Propiedades del material</div><table>
        <tr><td>Densidad ρ</td><td>${mat.density} <small>g/cm³ · gravedad ×${e.gravity_scale.toFixed(2)}</small></td></tr>
        <tr><td>Módulo volumétrico B</td><td>${mat.bulk_modulus} <small>GPa</small></td></tr><tr><td>Módulo de corte G</td><td>${mat.shear_modulus} <small>GPa</small></td></tr>
        <tr><td>Módulo de Young E</td><td>${e.young_modulus} <small>GPa</small></td></tr><tr><td>Comportamiento</td><td>${e.ductile ? 'Dúctil' : 'Frágil'} <small>· B/G ${e.pugh_ratio}</small></td></tr>
        <tr><td>Clase eléctrica</td><td>${electrical}</td></tr><tr><td>Bandgap Eg</td><td>${mat.bandgap} <small>eV</small></td></tr>
        <tr><td>Conductividad térmica κ</td><td>${mat.thermal_conductivity} <small>W/m·K</small></td></tr><tr><td>Punto de fusión</td><td>${mat.melting_point} <small>K</small></td></tr>
        <tr><td>Magnetismo μB</td><td>${mat.magmom}${mat.curie_T ? ` <small>· Tc ${mat.curie_T} K</small>` : ''}</td></tr>
        <tr><td>Superconductor</td><td>${mat.tc_supercon > 0 ? `${mat.tc_supercon} K` : 'No'}</td></tr>
        <tr><td>Estabilidad ehull</td><td>${mat.ehull} <small>eV/át · ${e.metastable ? `decaimiento ${e.decay_time} s` : 'estable'}</small></td></tr></table>
        ${mat.note ? `<div class="src note">${mat.note}</div>` : ''}<div class="src">Fuente: ${mat.source}</div>`;
      labPreviewCanvas = $('labCrystal'); const actions = $('labActions');
      const button = document.createElement('button');
      if (!unlocked) {
        button.className = 'primary synthesize-button'; button.textContent = `✦ Sintetizar · ${mat.cost} Artecoins`; button.disabled = p.credits < mat.cost;
        button.onclick = () => { if (p.credits < mat.cost) return; p.credits -= mat.cost; p.unlocked.push(mat.id);
          if (selectedSlot < p.loadout.length) p.loadout[selectedSlot] = mat.id; else if (p.loadout.length < 4) p.loadout.push(mat.id);
          DB.save(); A.play('absorb'); this.renderLab('synthesis'); };
      } else if (eqIdx >= 0) {
        button.textContent = 'Quitar del carrusel'; button.disabled = p.loadout.length <= 1;
        button.onclick = () => { if (p.loadout.length <= 1) return; p.loadout.splice(eqIdx, 1); selectedSlot = Math.min(selectedSlot, p.loadout.length - 1); DB.save(); A.play('switch'); this.renderLab('remove'); };
      } else {
        button.className = 'primary'; button.textContent = '⇄ Intercambiar en carrusel'; button.disabled = p.loadout.length >= 4 && selectedSlot >= p.loadout.length;
        button.onclick = () => this.equip(mat.id);
      }
      actions.appendChild(button);
    },
    tickPreview(t) {
      if (!labActive || !labPreviewCanvas) return; const mat = DB.get(selectedId); if (!mat) return;
      const ctx = labPreviewCanvas.getContext('2d'); ctx.clearRect(0, 0, labPreviewCanvas.width, labPreviewCanvas.height);
      const color = (mat.color === '#2b2b3a' || mat.color === '#1f2a30') ? '#8899aa' : mat.color;
      CD.Crystal.draw(ctx, 80, 60, 74, mat.lattice, t, color);
    },
  };
  CD.UI = UI;
})();
