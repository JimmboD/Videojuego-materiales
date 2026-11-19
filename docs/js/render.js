/* Crystal Dash — renderizado en Canvas 2D */
(function () {
  const K = CD.K, DB = CD.DB;
  const R = {};
  const TAU = Math.PI * 2;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  R.rr = rr;
  const fmt = (v, d = 0) => (v === null || v === undefined) ? '—' : (+v).toFixed(d);

  // ---------------- escenario ----------------
  function background(ctx, run, t) {
    const g = ctx.createLinearGradient(0, 0, 0, K.FIELD_H);
    g.addColorStop(0, '#0b1424'); g.addColorStop(1, '#101c2e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, K.W, K.FIELD_H);
    const d = run ? run.dist : t * 200;
    // paneles de laboratorio (parallax)
    ctx.strokeStyle = 'rgba(80,130,180,0.08)'; ctx.lineWidth = 1;
    const off1 = -(d * 0.15) % 80;
    ctx.beginPath();
    for (let x = off1; x < K.W; x += 80) { ctx.moveTo(x, K.CEIL); ctx.lineTo(x, K.GROUND); }
    for (let y = K.CEIL + 40; y < K.GROUND; y += 56) { ctx.moveTo(0, y); ctx.lineTo(K.W, y); }
    ctx.stroke();
    // tuberías del acelerador
    const off2 = -(d * 0.4) % 320;
    for (let x = off2; x < K.W + 320; x += 320) {
      ctx.fillStyle = 'rgba(40,70,100,0.35)';
      ctx.fillRect(x, K.CEIL + 30, 220, 10);
      ctx.fillStyle = 'rgba(95,242,255,0.18)';
      ctx.fillRect(x + 20, K.CEIL + 33, 12, 4); ctx.fillRect(x + 150, K.CEIL + 33, 12, 4);
      ctx.fillStyle = 'rgba(30,50,75,0.5)';
      ctx.fillRect(x + 260, K.CEIL, 8, K.GROUND - K.CEIL);
    }
    // techo
    ctx.fillStyle = '#0a0f18'; ctx.fillRect(0, 0, K.W, K.CEIL);
    ctx.fillStyle = '#1d3047'; ctx.fillRect(0, K.CEIL - 4, K.W, 4);
    const off3 = -(d) % 120;
    ctx.fillStyle = 'rgba(255,220,140,0.5)';
    for (let x = off3; x < K.W; x += 120) ctx.fillRect(x, K.CEIL - 4, 30, 2);
  }

  function zones(ctx, run, t) {
    for (const z of run.zones) {
      const x0 = z.x0 - run.dist + K.PX, x1 = z.x1 - run.dist + K.PX;
      if (x1 < 0 || x0 > K.W) continue;
      const w = x1 - x0;
      if (z.kind === 'hot') {
        const hot = Math.min(1, z.T / 5200);
        const g = ctx.createLinearGradient(0, K.CEIL, 0, K.GROUND);
        g.addColorStop(0, `rgba(255,${120 - hot * 80},40,${0.10 + hot * 0.12})`);
        g.addColorStop(1, `rgba(255,${80 - hot * 60},20,${0.28 + hot * 0.2})`);
        ctx.fillStyle = g; ctx.fillRect(x0, K.CEIL, w, K.GROUND - K.CEIL);
        ctx.strokeStyle = `rgba(255,170,80,${0.25 + hot * 0.2})`;
        ctx.beginPath();
        for (let x = x0 + ((t * 60) % 40); x < x1; x += 40) {
          for (let k = 0; k < 3; k++) {
            const y = K.GROUND - ((t * 120 + x * 3 + k * 90) % (K.GROUND - K.CEIL));
            ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y - 10, x, y - 20);
          }
        }
        ctx.stroke();
      } else if (z.kind === 'cryo') {
        ctx.fillStyle = z.T < 10 ? 'rgba(170,140,255,0.16)' : 'rgba(120,220,255,0.15)';
        ctx.fillRect(x0, K.CEIL, w, K.GROUND - K.CEIL);
        ctx.fillStyle = 'rgba(220,245,255,0.6)';
        for (let i = 0; i < w / 14; i++) {
          const sx = x0 + ((i * 53.7) % w), sy = K.CEIL + ((i * 97.3 + t * 40) % (K.GROUND - K.CEIL));
          ctx.fillRect(sx, sy, 2, 2);
        }
        const fg = ctx.createLinearGradient(0, K.GROUND - 50, 0, K.GROUND);
        fg.addColorStop(0, 'rgba(200,240,255,0)'); fg.addColorStop(1, 'rgba(200,240,255,0.35)');
        ctx.fillStyle = fg; ctx.fillRect(x0, K.GROUND - 50, w, 50);
      } else if (z.kind === 'magnet') {
        ctx.fillStyle = 'rgba(170,80,255,0.10)'; ctx.fillRect(x0, K.CEIL, w, K.GROUND - K.CEIL);
        // bobinas
        for (let x = x0; x < x1; x += 34) {
          ctx.fillStyle = '#3b2457'; ctx.fillRect(x, K.CEIL - 2, 30, 10);
          ctx.fillStyle = '#c47bff'; ctx.fillRect(x + 2, K.CEIL + 1, 26, 2);
        }
        ctx.strokeStyle = 'rgba(200,140,255,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath();
        const ph = (t * 80) % 60;
        for (let x = x0 + ph; x < x1; x += 60) {
          ctx.moveTo(x, K.CEIL + 8); ctx.bezierCurveTo(x - 20, K.CEIL + 120, x + 20, K.CEIL + 200, x, K.GROUND - 20);
        }
        ctx.stroke();
      }
      // etiqueta
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.fillStyle = z.kind === 'hot' ? '#ffb070' : z.kind === 'cryo' ? '#9ef' : '#d9a6ff';
      const lx = Math.max(x0 + 8, Math.min(8, x1 - 160));
      ctx.fillText((z.kind === 'hot' ? '🔥 ' : z.kind === 'cryo' ? '❄ ' : '🧲 ') + z.label, Math.max(lx, x0 + 8), K.CEIL + 20);
    }
  }

  function ground(ctx, run, t) {
    const d = run ? run.dist : t * 200;
    ctx.fillStyle = '#16222f'; ctx.fillRect(0, K.GROUND, K.W, K.FIELD_H - K.GROUND);
    ctx.fillStyle = '#2b4a63'; ctx.fillRect(0, K.GROUND, K.W, 3);
    ctx.fillStyle = '#1e3448';
    const off = -(d % 48);
    for (let x = off; x < K.W; x += 48) ctx.fillRect(x, K.GROUND + 10, 30, 4);
    // rieles
    ctx.fillStyle = 'rgba(95,242,255,0.2)'; ctx.fillRect(0, K.GROUND + 22, K.W, 2);
    if (!run) return;
    for (const p of run.pits) {
      const x0 = p.x0 - run.dist + K.PX, x1 = p.x1 - run.dist + K.PX;
      if (x1 < 0 || x0 > K.W) continue;
      ctx.fillStyle = '#05080c'; ctx.fillRect(x0, K.GROUND, x1 - x0, K.FIELD_H - K.GROUND);
      const g = ctx.createLinearGradient(0, K.GROUND + 6, 0, K.FIELD_H);
      g.addColorStop(0, '#7dff4f'); g.addColorStop(1, '#1b5a12');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0, K.FIELD_H);
      for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, K.GROUND + 12 + Math.sin(x * 0.08 + t * 5) * 3);
      ctx.lineTo(x1, K.FIELD_H); ctx.closePath(); ctx.fill();
      ctx.shadowColor = '#7dff4f'; ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(160,255,120,0.6)';
      for (let x = x0 + 10; x < x1 - 6; x += 23) {
        const b = (t * 1.5 + x * 0.13) % 1;
        ctx.beginPath(); ctx.arc(x, K.GROUND + 14 - b * 16, 2 + b * 2, 0, TAU); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2b4a63'; ctx.fillRect(x0 - 3, K.GROUND, 3, 30); ctx.fillRect(x1, K.GROUND, 3, 30);
    }
  }

  function objects(ctx, run, t) {
    const m = run.mat, e = m.engine;
    for (const o of run.objects) {
      const x = o.x - run.dist + K.PX;
      if (x > K.W + 50 || x + o.w < -50) continue;
      switch (o.type) {
        case 'block': {
          const ok = e.break_threshold > o.B;
          const g = ctx.createLinearGradient(x, 0, x + o.w, 0);
          g.addColorStop(0, '#3a4757'); g.addColorStop(1, '#232d3a');
          ctx.fillStyle = g; ctx.fillRect(x, o.y, o.w, o.h);
          ctx.strokeStyle = 'rgba(255,255,255,0.06)';
          ctx.beginPath();
          for (let yy = o.y + 14; yy < o.y + o.h; yy += 14) { ctx.moveTo(x, yy); ctx.lineTo(x + o.w, yy); }
          ctx.stroke();
          ctx.lineWidth = 2; ctx.strokeStyle = ok ? '#5dff9b' : '#ff5d6c';
          ctx.strokeRect(x + 1, o.y + 1, o.w - 2, o.h - 2); ctx.lineWidth = 1;
          ctx.save();
          ctx.font = 'bold 10px Segoe UI, sans-serif'; ctx.fillStyle = '#e8f0f8'; ctx.textAlign = 'center';
          if (o.full) {
            ctx.translate(x + o.w / 2, (o.y + K.GROUND) / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${o.label.toUpperCase()} · B = ${o.B} GPa`, 0, 4);
          } else {
            ctx.fillText(o.label, x + o.w / 2, o.y - 14);
            ctx.fillStyle = ok ? '#5dff9b' : '#ff8a95';
            ctx.fillText(`B ${o.B}`, x + o.w / 2, o.y - 3);
          }
          ctx.restore();
          break;
        }
        case 'saw': {
          const ok = e.shear_threshold > o.G, cx = x + o.w / 2, cy = o.y + o.h / 2, r = o.w / 2;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 12);
          ctx.fillStyle = '#8b97a6';
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = i * TAU / 16;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            ctx.lineTo(Math.cos(a + 0.2) * (r - 6), Math.sin(a + 0.2) * (r - 6));
          }
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2b3542'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = ok ? '#5dff9b' : '#ff5d6c'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
          ctx.font = 'bold 10px Segoe UI, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#e8f0f8'; ctx.fillText(o.label, cx, o.y - 14);
          ctx.fillStyle = ok ? '#5dff9b' : '#ff8a95'; ctx.fillText(`G ${o.G}`, cx, o.y - 3);
          ctx.textAlign = 'left';
          break;
        }
        case 'spikes': {
          ctx.fillStyle = '#c9d4e0';
          ctx.beginPath();
          const n = Math.max(2, Math.round(o.w / 14)), sw = o.w / n;
          for (let i = 0; i < n; i++) {
            if (o.ceiling) { ctx.moveTo(x + i * sw, o.y); ctx.lineTo(x + i * sw + sw / 2, o.y + o.h); ctx.lineTo(x + (i + 1) * sw, o.y); }
            else { ctx.moveTo(x + i * sw, o.y + o.h); ctx.lineTo(x + i * sw + sw / 2, o.y); ctx.lineTo(x + (i + 1) * sw, o.y + o.h); }
          }
          ctx.fill();
          break;
        }
        case 'laser': {
          const fl = 0.7 + Math.sin(t * 40) * 0.3;
          ctx.fillStyle = '#444f5e';
          ctx.fillRect(x - 10, o.y - 8, 10, 22); ctx.fillRect(x + o.w, o.y - 8, 10, 22);
          ctx.shadowColor = '#ff2a4a'; ctx.shadowBlur = 18;
          ctx.fillStyle = `rgba(255,40,70,${fl})`; ctx.fillRect(x, o.y, o.w, o.h);
          ctx.fillStyle = '#fff'; ctx.fillRect(x, o.y + 2, o.w, 2);
          ctx.shadowBlur = 0;
          break;
        }
        case 'arc': {
          const cls = e.elec_class;
          ctx.fillStyle = '#3a4a5c'; ctx.fillRect(x - 4, K.CEIL, o.w + 8, 10); ctx.fillRect(x - 4, K.GROUND - 10, o.w + 8, 10);
          ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 20;
          ctx.strokeStyle = o.hit ? 'rgba(160,220,255,0.3)' : '#d8f4ff'; ctx.lineWidth = 2;
          for (let k = 0; k < 2; k++) {
            ctx.beginPath(); ctx.moveTo(x + o.w / 2, K.CEIL + 10);
            for (let y = K.CEIL + 10; y < K.GROUND - 10; y += 16) ctx.lineTo(x + o.w / 2 + (Math.random() - 0.5) * o.w * 1.4, y);
            ctx.lineTo(x + o.w / 2, K.GROUND - 10); ctx.stroke();
          }
          ctx.shadowBlur = 0; ctx.lineWidth = 1;
          ctx.font = 'bold 10px Segoe UI, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#bfe8ff'; ctx.fillText('⚡ ARCO', x + o.w / 2, K.CEIL + 24);
          ctx.textAlign = 'left';
          break;
        }
        case 'dopant': {
          const dm = DB.get(o.mat), cx = x + o.w / 2, cy = o.y + o.h / 2 + Math.sin(t * 3 + o.x) * 5;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 1.5);
          ctx.shadowColor = dm.color; ctx.shadowBlur = 18;
          ctx.fillStyle = dm.color; ctx.strokeStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(12, 0); ctx.lineTo(0, 16); ctx.lineTo(-12, 0); ctx.closePath();
          ctx.fill(); ctx.stroke(); ctx.restore(); ctx.shadowBlur = 0;
          ctx.font = 'bold 11px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8';
          ctx.fillText(dm.formula, cx, cy - 22); ctx.textAlign = 'left';
          break;
        }
        case 'platform': {
          ctx.fillStyle = '#2f4d66'; ctx.fillRect(x, o.y, o.w, 10);
          ctx.fillStyle = '#5ff2ff'; ctx.fillRect(x, o.y, o.w, 2);
          ctx.fillStyle = '#1b2c3c'; ctx.fillRect(x + 10, o.y + 10, 6, 20); ctx.fillRect(x + o.w - 16, o.y + 10, 6, 20);
          break;
        }
      }
    }
  }

  function player(ctx, run, t) {
    const p = run.p, m = run.mat, s = K.PS;
    const cx = K.PX + s / 2, cy = p.y + s / 2;
    if (run.dead) return;
    // aura Meissner: líneas de campo expulsadas
    if (run.meissner) {
      ctx.save();
      ctx.shadowColor = '#5ff2ff'; ctx.shadowBlur = 24;
      ctx.strokeStyle = 'rgba(95,242,255,0.7)'; ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) {
        const off = i * 9, bulge = 30 - Math.abs(i) * 3;
        ctx.beginPath();
        ctx.moveTo(cx - 60, cy + off);
        ctx.bezierCurveTo(cx - 25, cy + off, cx - 20, cy + Math.sign(off || 1) * bulge, cx, cy + Math.sign(off || 1) * bulge);
        ctx.bezierCurveTo(cx + 20, cy + Math.sign(off || 1) * bulge, cx + 25, cy + off, cx + 60, cy + off);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(95,242,255,0.15)';
      ctx.fillRect(cx - 24, K.GROUND - 4, 48, 4);
    }
    if (p.ceil) {
      ctx.strokeStyle = 'rgba(220,150,255,0.8)';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.moveTo(cx - 12 + i * 8, p.y); ctx.lineTo(cx - 12 + i * 8 + (Math.random() - 0.5) * 6, K.CEIL - 6); }
      ctx.stroke();
    }
    const blink = run.invuln > 0 && Math.floor(t * 20) % 2 === 0;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(p.rot);
    ctx.globalAlpha = blink ? 0.35 : 1;
    const heat = Math.max(0, Math.min(1, (run.T - 400) / Math.max(1, m.melting_point - 400)));
    ctx.shadowColor = heat > 0.2 ? `rgba(255,${120 - heat * 100},40,1)` : m.color;
    ctx.shadowBlur = 10 + heat * 20;
    ctx.fillStyle = m.color;
    rr(ctx, -s / 2, -s / 2, s, s, 5); ctx.fill();
    ctx.shadowBlur = 0;
    if (heat > 0.05) { ctx.fillStyle = `rgba(255,${140 - heat * 110},30,${heat * 0.7})`; rr(ctx, -s / 2, -s / 2, s, s, 5); ctx.fill(); }
    // motivo de red
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const lat = m.lattice, q = s / 4;
    const dots = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    if (lat === 'bcc' || lat === 'tetragonal') dots.push([0, 0]);
    if (lat === 'fcc' || lat === 'diamond' || lat === 'zincblende') dots.push([0, -1], [0, 1], [-1, 0], [1, 0]);
    if (lat === 'hcp' || lat === 'hex') dots.push([0, 0], [-0.5, 0], [0.5, 0]);
    dots.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * q * 1.4, b * q * 1.4, 3, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    rr(ctx, -s / 2, -s / 2, s, s, 5); ctx.stroke();
    ctx.rotate(-p.rot);
    ctx.font = 'bold 11px Segoe UI, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000a'; ctx.fillText(m.formula.length > 6 ? m.formula.slice(0, 5) + '…' : m.formula, 1, 5);
    ctx.fillStyle = '#fff'; ctx.fillText(m.formula.length > 6 ? m.formula.slice(0, 5) + '…' : m.formula, 0, 4);
    ctx.restore();
    if (run.absorbed) {
      ctx.strokeStyle = '#ffd27a'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, 26, t * 3, t * 3 + TAU * run.absorbTimer / 8); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function fx(ctx, run) {
    for (const q of run.particles) {
      ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 13px Segoe UI, sans-serif'; ctx.textAlign = 'center';
    for (const q of run.popups) {
      ctx.globalAlpha = Math.max(0, 1 - q.t / 1.3);
      ctx.fillStyle = '#000'; ctx.fillText(q.text, q.x + 1, q.y + 1);
      ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  function wrapText(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  R.wrapText = wrapText;

  // ---------------- HUD ----------------
  function roleTag(m) {
    if (m.tc_supercon >= 10) return { t: `SUPER · Tc ${m.tc_supercon}K`, c: '#5ff2ff' };
    if (m.magmom >= 1.5) return { t: 'IMÁN · TECHO', c: '#d9a6ff' };
    if (m.bulk_modulus >= 280) return { t: `DURO · B ${m.bulk_modulus}`, c: '#5dff9b' };
    if (m.density <= 2.4) return { t: 'LIGERO · PLANEA', c: '#a6ff8f' };
    if (m.density >= 10.5) return { t: 'PESADO · PICADA', c: '#a9c0d9' };
    if (m.thermal_conductivity <= 15 && m.melting_point >= 1600) return { t: 'AISL. TÉRMICO', c: '#ffd27a' };
    if (m.engine.elec_class === 'insulator') return { t: 'AISL. ELÉCTRICO', c: '#bfe0ff' };
    if (m.engine.elec_class === 'semiconductor') return { t: 'SEMICONDUCTOR', c: '#ffb070' };
    if (m.thermal_conductivity >= 200) return { t: 'COND. · FLUSH', c: '#ffe066' };
    return { t: `B ${m.bulk_modulus} · ρ ${m.density}`, c: '#9db5cc' };
  }

  /* Indicación táctica breve según la zona actual o el próximo obstáculo */
  function liveTip(run) {
    const m = run.mat, e = m.engine, px = run.dist + K.PS / 2;
    if (run.T > m.melting_point * 0.72) return { t: '⚠ ¡Te estás fundiendo! Cambia a un aislante térmico o mayor Tm', c: '#ff5d6c' };
    if (run.meissner) return { t: '❄ Estado Meissner activo: levitas sobre pinchos y ácido', c: '#5ff2ff' };
    const z = run.zonesAt(px)[0];
    if (z) {
      if (z.kind === 'magnet') return { t: '🧲 Electroimán: usa Fe/ferromagnético para pegarte al techo', c: '#d9a6ff' };
      if (z.kind === 'hot') return { t: '🔥 Zona caliente: materiales con baja κ se calientan más lento', c: '#ffb070' };
      if (z.kind === 'cryo') return { t: '❄ Criogenia: superconductores levitan · conductores disipan calor', c: '#8ff' };
    }
    // Buscar el siguiente obstáculo cercano (entre 0 y 420 px adelante)
    let near = null, bestD = 420;
    for (const o of run.objects) {
      if (o.dead || o.type === 'platform') continue;
      const dx = (o.x - run.dist);
      if (dx > -10 && dx < bestD) { bestD = dx; near = o; }
    }
    if (near) {
      if (near.type === 'block') {
        return e.break_threshold > near.B
          ? { t: `✔ Borde VERDE: atraviesa el bloque (${near.label}) para ganar combo`, c: '#5dff9b' }
          : { t: `🧱 Borde ROJO (B ${near.B}): sáltalo o cambia a un material más duro`, c: '#ff8a95' };
      }
      if (near.type === 'saw') {
        return e.shear_threshold > near.G
          ? { t: `✔ Borde VERDE: tu corte (G ${m.shear_modulus}) rompe la sierra`, c: '#5dff9b' }
          : { t: `⚙ Sierra (G ${near.G}): sáltala o usa un material con mayor G`, c: '#ff8a95' };
      }
      if (near.type === 'arc') return { t: '⚡ Arco: Metal carga escudo · Aislante pasa sin daño', c: '#ffe066' };
      if (near.type === 'laser') return { t: '🔴 Láser alto: ve por abajo (o cae en picada con material pesado)', c: '#ff8a95' };
      if (near.type === 'dopant') return { t: `💎 Dopante ${DB.get(near.mat).formula}: tócalo para probarlo 8 s`, c: '#ffd27a' };
    }
    return { t: '[Espacio] Saltar / Planear  ·  [Shift / 1-4] Cambiar material  ·  [P] Pausa', c: '#8fb0cc' };
  }

  function bar(ctx, x, y, w, h, frac, color, label, value, marks) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rr(ctx, x, y, w, h, 3); ctx.fill();
    ctx.fillStyle = color; rr(ctx, x, y, Math.max(0, Math.min(1, frac)) * w, h, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; rr(ctx, x, y, w, h, 3); ctx.stroke();
    (marks || []).forEach(([f, c]) => {
      if (f < 0 || f > 1) return;
      ctx.fillStyle = c; ctx.fillRect(x + f * w - 1, y - 2, 2, h + 4);
    });
    ctx.font = 'bold 10px Segoe UI, sans-serif'; ctx.fillStyle = '#cfe3f5';
    ctx.fillText(label, x, y - 4);
    ctx.textAlign = 'right'; ctx.fillText(value, x + w, y - 4); ctx.textAlign = 'left';
  }

  function topHud(ctx, run) {
    const m = run.mat;
    // Puntos y récord
    ctx.fillStyle = 'rgba(5,10,18,0.6)'; rr(ctx, 8, 6, 198, 46, 8); ctx.fill();
    ctx.font = 'bold 21px Segoe UI, sans-serif'; ctx.fillStyle = '#e9fbff';
    ctx.fillText(String(run.score).padStart(6, '0'), 18, 30);
    ctx.font = '11px Segoe UI, sans-serif'; ctx.fillStyle = '#8fb0cc';
    ctx.fillText(`RÉCORD ${DB.progress.best}`, 18, 45);
    if (run.combo > 1) { ctx.fillStyle = '#5dff9b'; ctx.font = 'bold 13px Segoe UI'; ctx.fillText(`x${run.combo}`, 145, 29); }

    // 2 barras esenciales: Temperatura y Escudo (Capacitor)
    const bx = 224, bw = 165;
    const tFrac = Math.min(1, run.T / m.melting_point);
    const tCol = run.T > m.melting_point * 0.78 ? '#ff5d6c' : run.T < 200 ? '#5ff2ff' : '#ffb070';
    bar(ctx, bx, 22, bw, 10, tFrac, tCol, 'TEMPERATURA', `${Math.round(run.T)} / ${m.melting_point} K`);

    const capCol = run.meissner ? '#5ff2ff' : run.energy >= 99.5 ? '#ff9d3a' : run.energy >= 50 ? '#5dff9b' : '#ffe066';
    bar(ctx, bx + bw + 24, 22, 145, 10, run.energy / 100, capCol,
      run.energy >= 50 || run.meissner ? 'ESCUDO LISTO' : 'CAPACITOR',
      run.meissner ? '∞' : `${Math.round(run.energy)}%`, [[0.5, 'rgba(255,255,255,0.7)']]);

    // Integridad (3 cristales)
    const ix = bx + bw + 194;
    ctx.font = 'bold 10px Segoe UI'; ctx.fillStyle = '#cfe3f5'; ctx.fillText('INTEGRIDAD', ix, 18);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < run.integrity ? '#5dff9b' : 'rgba(255,255,255,0.12)';
      const hx = ix + i * 24 + 8, hy = 30;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; ctx.lineTo(hx + Math.cos(a) * 8, hy + Math.sin(a) * 8); }
      ctx.closePath(); ctx.fill();
    }

    // Metaestabilidad (solo cuando aplica)
    const slotM = run.loadout[run.slot];
    if (!run.absorbed && slotM.engine.metastable && run.slotDecay[run.slot] <= 0) {
      bar(ctx, ix + 92, 22, 110, 10, 1 - run.slotStress[run.slot] / slotM.engine.decay_time, '#ffb347',
        'ESTABILIDAD', `${(slotM.engine.decay_time - run.slotStress[run.slot]).toFixed(1)}s`);
    }

    // Estado activo (máx. 1 badge claro a la derecha)
    let st = null;
    if (run.meissner) st = ['❄ MEISSNER', '#5ff2ff'];
    else if (run.p.ceil) st = ['🧲 ADHERIDO', '#d9a6ff'];
    else if (run.absorbed) st = [`💎 DOPADO ${run.absorbTimer.toFixed(0)}s`, '#ffd27a'];
    if (st) {
      ctx.font = 'bold 11px Segoe UI';
      const w = ctx.measureText(st[0]).width + 16;
      const sx = K.W - w - 12;
      ctx.fillStyle = 'rgba(5,10,18,0.75)'; rr(ctx, sx, 14, w, 24, 6); ctx.fill();
      ctx.strokeStyle = st[1]; rr(ctx, sx, 14, w, 24, 6); ctx.stroke();
      ctx.fillStyle = st[1]; ctx.fillText(st[0], sx + 8, 30);
    }
  }

  function bottomHud(ctx, run, t) {
    const y0 = K.FIELD_H;
    ctx.fillStyle = '#08101b'; ctx.fillRect(0, y0, K.W, K.H - y0);
    ctx.fillStyle = '#1d3047'; ctx.fillRect(0, y0, K.W, 2);

    // Carrusel de 4 materiales (más ancho y claro)
    const n = run.loadout.length;
    for (let i = 0; i < n; i++) {
      const bx = 10 + i * 114, by = y0 + 10, sel = i === run.slot && !run.absorbed;
      const m = run.baseMat(i);
      const role = roleTag(m);
      ctx.fillStyle = sel ? 'rgba(95,242,255,0.14)' : 'rgba(255,255,255,0.04)';
      rr(ctx, bx, by, 108, 88, 8); ctx.fill();
      ctx.strokeStyle = sel ? '#5ff2ff' : 'rgba(255,255,255,0.12)'; ctx.lineWidth = sel ? 2 : 1;
      rr(ctx, bx, by, 108, 88, 8); ctx.stroke(); ctx.lineWidth = 1;

      ctx.fillStyle = m.color; rr(ctx, bx + 8, by + 10, 22, 22, 4); ctx.fill();
      ctx.font = 'bold 10px Segoe UI'; ctx.fillStyle = sel ? '#5ff2ff' : '#6f8aa5';
      ctx.fillText(`[${i + 1}]`, bx + 86, by + 16);
      ctx.font = 'bold 15px Segoe UI'; ctx.fillStyle = '#fff';
      ctx.fillText(m.formula.length > 6 ? m.formula.slice(0, 5) + '…' : m.formula, bx + 36, by + 27);
      ctx.font = '10px Segoe UI'; ctx.fillStyle = '#8fb0cc';
      ctx.fillText(m.name.length > 16 ? m.name.slice(0, 15) + '…' : m.name, bx + 8, by + 48);
      ctx.font = 'bold 10px Segoe UI'; ctx.fillStyle = role.c;
      ctx.fillText(role.t, bx + 8, by + 66);

      if (run.slotDecay[i] > 0) {
        ctx.fillStyle = '#ffb347'; ctx.fillText(`decaído ${run.slotDecay[i].toFixed(0)}s`, bx + 8, by + 81);
      } else if (run.loadout[i].engine.metastable) {
        ctx.fillStyle = 'rgba(255,179,71,0.28)'; ctx.fillRect(bx + 8, by + 76, 92, 5);
        ctx.fillStyle = '#ffb347'; ctx.fillRect(bx + 8, by + 76, 92 * (1 - run.slotStress[i] / run.loadout[i].engine.decay_time), 5);
      }
    }

    // Panel central: resumen esencial del material activo + indicación en vivo
    const m = run.mat, e = m.engine;
    const px = 472, pw = 344;
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; rr(ctx, px, y0 + 10, pw, 88, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(95,242,255,0.16)'; rr(ctx, px, y0 + 10, pw, 88, 8); ctx.stroke();

    ctx.font = 'bold 14px Segoe UI';
    ctx.fillStyle = (m.color === '#2b2b3a' || m.color === '#1f2a30') ? '#b8c8d8' : m.color;
    ctx.fillText(`${m.name} (${m.formula})`, px + 12, y0 + 29);

    ctx.font = '11px Segoe UI'; ctx.fillStyle = '#cfe3f5';
    const traits = [
      e.ductile ? 'Dúctil' : 'Frágil al caer',
      e.elec_class === 'metal' ? 'Metal' : e.elec_class === 'insulator' ? 'Aislante' : 'Semiconductor',
      `B ${fmt(m.bulk_modulus)}`,
      `G ${fmt(m.shear_modulus)}`,
      `ρ ${fmt(m.density, 1)}`,
    ];
    ctx.fillText(traits.join('  ·  '), px + 12, y0 + 48);

    // Indicación táctica en tiempo real
    const tip = liveTip(run);
    ctx.fillStyle = 'rgba(5,10,18,0.65)'; rr(ctx, px + 8, y0 + 58, pw - 16, 32, 6); ctx.fill();
    ctx.font = 'bold 11px Segoe UI'; ctx.fillStyle = tip.c;
    const tipLines = wrapText(ctx, tip.t, pw - 32);
    ctx.fillText(tipLines[0] || '', px + 16, y0 + 73);
    if (tipLines[1]) ctx.fillText(tipLines[1], px + 16, y0 + 86);

    // Cristal 3D
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, 826, y0 + 10, 124, 88, 8); ctx.fill();
    CD.Crystal.draw(ctx, 888, y0 + 56, 58, m.lattice, t, m.color === '#2b2b3a' || m.color === '#1f2a30' ? '#8899aa' : m.color);
    ctx.font = '9px Segoe UI'; ctx.fillStyle = '#8fb0cc'; ctx.fillText(m.lattice.toUpperCase(), 834, y0 + 23);
    ctx.textAlign = 'right'; ctx.fillStyle = '#e9fbff'; ctx.fillText(m.spg_symbol, 942, y0 + 23); ctx.textAlign = 'left';
  }

  function toast(ctx, run) {
    if (!run.toast) return;
    const a = Math.min(1, run.toast.t * 4, (6 - run.toast.t) * 2);
    ctx.globalAlpha = a;
    ctx.font = '13px Segoe UI, sans-serif';
    const lines = wrapText(ctx, run.toast.text, 520);
    const h = 16 + lines.length * 17, x = K.W / 2 - 280, y = 68;
    ctx.fillStyle = 'rgba(8,16,28,0.88)'; rr(ctx, x, y, 560, h, 8); ctx.fill();
    ctx.strokeStyle = '#5ff2ff'; rr(ctx, x, y, 560, h, 8); ctx.stroke();
    ctx.fillStyle = '#e9fbff';
    lines.forEach((l, i) => ctx.fillText(l, x + 20, y + 20 + i * 17));
    ctx.globalAlpha = 1;
  }

  R.slotAt = function (cx, cy, count) {
    if (cy < K.FIELD_H) return -1;
    const idx = Math.floor((cx - 10) / 114);
    if (idx < 0 || idx >= count) return -1;
    return (cx - (10 + idx * 114)) <= 108 ? idx : -1;
  };

  R.frame = function (ctx, run, t) {
    ctx.save();
    if (run && run.shake > 0) ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
    background(ctx, run, t);
    if (run) {
      zones(ctx, run, t);
      ground(ctx, run, t);
      objects(ctx, run, t);
      player(ctx, run, t);
      fx(ctx, run);
    } else ground(ctx, null, t);
    ctx.restore();
    if (run) {
      if (run.flash) { ctx.globalAlpha = run.flash.t * 1.5; ctx.fillStyle = run.flash.color; ctx.fillRect(0, 0, K.W, K.FIELD_H); ctx.globalAlpha = 1; }
      topHud(ctx, run);
      toast(ctx, run);
      bottomHud(ctx, run, t);
    }
  };

  CD.Render = R;
})();
