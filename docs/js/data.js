/* Crystal Dash — base de datos de materiales y progreso persistente */
(function () {
  const raw = window.MATERIALS_DB;
  if (!raw) { alert('No se encontró data/materials_db.js. Ejecuta Extracción/build_materials_db.py'); return; }

  const DB = { list: raw.materials, byId: {}, constants: raw.constants };
  DB.list.forEach(m => { DB.byId[m.id] = m; });
  DB.get = id => DB.byId[id];
  DB.playable = DB.list.filter(m => !m.hidden);
  DB.starters = DB.playable.filter(m => m.tier === 0).map(m => m.id);

  /* Fase degradada genérica (si el material no define decay_to) */
  const degCache = {};
  DB.decayOf = function (m) {
    if (m.decay_to && DB.byId[m.decay_to]) return DB.byId[m.decay_to];
    if (degCache[m.id]) return degCache[m.id];
    const d = JSON.parse(JSON.stringify(m));
    d.id = m.id + '-deg';
    d.name = m.name + ' (reapilado)';
    d.bulk_modulus = +(m.bulk_modulus * 0.3).toFixed(1);
    d.shear_modulus = +(m.shear_modulus * 0.3).toFixed(1);
    d.melting_point = Math.round(m.melting_point * 0.7);
    d.ehull = 0;
    const B = d.bulk_modulus, G = d.shear_modulus;
    Object.assign(d.engine, {
      break_threshold: B, shear_threshold: G, metastable: false, decay_time: null,
      young_modulus: +(9 * B * G / (3 * B + G)).toFixed(1),
    });
    d.color = '#555c66';
    d.hidden = true;
    degCache[m.id] = d;
    return d;
  };

  /* Utilidades físicas compartidas */
  DB.magAt = function (m, T) {           // magnetización relativa M(T)/Ms ~ sqrt(1-(T/Tc)^2)
    const c = m.curie_T || 0;
    if (!m.engine.mag_strength || !c || T >= c) return 0;
    return m.engine.mag_strength * Math.sqrt(1 - (T / c) * (T / c));
  };

  /* Progreso (localStorage) */
  const KEY = 'crystaldash.v1';
  const def = () => ({
    credits: 0, best: 0, runs: 0, muted: false, seen: {},
    unlocked: DB.starters.slice(),
    loadout: DB.starters.slice(0, 4),
  });
  let p;
  try { p = JSON.parse(localStorage.getItem(KEY)) || def(); } catch (e) { p = def(); }
  const d = def();
  for (const k in d) if (p[k] === undefined) p[k] = d[k];
  p.unlocked = p.unlocked.filter(id => DB.byId[id]);
  p.loadout = p.loadout.filter(id => p.unlocked.includes(id));
  if (!p.loadout.length) p.loadout = DB.starters.slice(0, 4);
  DB.progress = p;
  DB.save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* modo privado */ } };

  window.CD = window.CD || {};
  CD.DB = DB;
})();
