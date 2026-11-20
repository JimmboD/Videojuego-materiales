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
  const smoothstep = x => { const v = Math.max(0, Math.min(1, x)); return v * v * (3 - 2 * v); };
  function colorMix(a, b, amount) {
    const t = Math.max(0, Math.min(1, amount));
    const parse = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const ca = parse(a), cb = parse(b);
    return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * t)).join(',')})`;
  }
  R.rr = rr;
  const fmt = (v, d = 0) => (v === null || v === undefined) ? '—' : (+v).toFixed(d);

  // ---------------- escenario ----------------
  function background(ctx, run, t) {
    const g = ctx.createLinearGradient(0, 0, 0, K.FIELD_H);
    g.addColorStop(0, '#101c2c'); g.addColorStop(.5, '#182b3e'); g.addColorStop(1, '#0a1523');
    // El fondo cubre también el área que después ocupa el HUD, sin píxeles sin pintar.
    ctx.fillStyle = g; ctx.fillRect(0, 0, K.W, K.H);
    const d = run ? run.dist : t * 200;
    // Laboratorio modular al fondo: ventanales, analizadores y conducciones.
    const glow = ctx.createRadialGradient(K.W * .52, K.CEIL + 75, 10, K.W * .52, K.CEIL + 100, 520);
    glow.addColorStop(0, 'rgba(77,160,191,.18)'); glow.addColorStop(1, 'rgba(8,20,34,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, K.CEIL, K.W, K.GROUND - K.CEIL);
    const parallax = -(d * .16) % 300;
    for (let x = parallax - 300; x < K.W + 300; x += 300) {
      // Panel mural con marco industrial.
      ctx.fillStyle = '#142538'; ctx.fillRect(x + 18, K.CEIL + 32, 258, K.GROUND - K.CEIL - 58);
      ctx.fillStyle = '#263d51'; ctx.fillRect(x + 18, K.CEIL + 32, 258, 5);
      ctx.fillStyle = '#0b1825'; ctx.fillRect(x + 28, K.CEIL + 47, 238, K.GROUND - K.CEIL - 91);
      const glass = ctx.createLinearGradient(x + 30, K.CEIL + 50, x + 260, K.GROUND - 20);
      glass.addColorStop(0, 'rgba(45,106,127,.52)'); glass.addColorStop(.55, 'rgba(20,58,79,.46)'); glass.addColorStop(1, 'rgba(17,35,57,.72)');
      ctx.fillStyle = glass; ctx.fillRect(x + 31, K.CEIL + 50, 232, K.GROUND - K.CEIL - 99);
      ctx.strokeStyle = 'rgba(128,206,218,.2)'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 31, K.CEIL + 50, 232, K.GROUND - K.CEIL - 99);
      // Reflejos de cristal y divisiones de las vitrinas.
      ctx.fillStyle = 'rgba(167,226,232,.07)';
      ctx.beginPath(); ctx.moveTo(x + 42, K.CEIL + 55); ctx.lineTo(x + 105, K.CEIL + 55); ctx.lineTo(x + 65, K.GROUND - 52); ctx.lineTo(x + 42, K.GROUND - 52); ctx.fill();
      ctx.fillStyle = 'rgba(149,195,202,.2)'; ctx.fillRect(x + 144, K.CEIL + 50, 3, K.GROUND - K.CEIL - 99);
      // Siluetas de equipos de laboratorio detrás del vidrio.
      ctx.fillStyle = '#1d4054'; ctx.fillRect(x + 54, K.GROUND - 115, 66, 48);
      ctx.fillStyle = 'rgba(83,213,224,.26)'; ctx.fillRect(x + 62, K.GROUND - 106, 50, 3); ctx.fillRect(x + 62, K.GROUND - 98, 32, 3);
      ctx.fillStyle = '#24475a'; ctx.fillRect(x + 169, K.GROUND - 150, 54, 83);
      ctx.fillStyle = 'rgba(99,224,229,.56)'; ctx.fillRect(x + 177, K.GROUND - 138, 38, 4);
      ctx.fillStyle = 'rgba(116,226,210,.18)'; ctx.fillRect(x + 177, K.GROUND - 125, 38, 43);
      // Barra de estado del módulo.
      const pulse = .45 + .25 * Math.sin(t * 2 + x);
      ctx.fillStyle = '#263d51'; ctx.fillRect(x + 18, K.CEIL + 17, 258, 7);
      ctx.fillStyle = `rgba(89,224,196,${pulse})`; ctx.fillRect(x + 28, K.CEIL + 19, 36, 3);
      ctx.fillStyle = 'rgba(126,190,206,.4)'; ctx.fillRect(x + 70, K.CEIL + 19, 18, 3); ctx.fillRect(x + 94, K.CEIL + 19, 8, 3);
      // Cableado y columnas estructurales.
      ctx.fillStyle = '#26394b'; ctx.fillRect(x, K.CEIL, 10, K.GROUND - K.CEIL);
      ctx.fillStyle = 'rgba(91,194,206,.45)'; ctx.fillRect(x + 3, K.CEIL + 12, 3, 20);
    }
    // Techo técnico y lámparas de panel.
    const ceiling = ctx.createLinearGradient(0, 0, 0, K.CEIL);
    ceiling.addColorStop(0, '#0a121e'); ceiling.addColorStop(1, '#172738');
    ctx.fillStyle = ceiling; ctx.fillRect(0, 0, K.W, K.CEIL);
    const lightOffset = -(d * .42) % 220;
    for (let x = lightOffset - 220; x < K.W + 220; x += 220) {
      ctx.fillStyle = '#26394b'; rr(ctx, x + 30, 14, 142, 18, 5); ctx.fill();
      ctx.fillStyle = 'rgba(129,231,231,.72)'; rr(ctx, x + 40, 20, 122, 4, 2); ctx.fill();
      ctx.fillStyle = 'rgba(106,220,222,.08)'; ctx.fillRect(x + 40, 24, 122, K.CEIL - 24);
      ctx.fillStyle = '#304459'; ctx.fillRect(x, K.CEIL - 7, 190, 7);
    }
    ctx.fillStyle = 'rgba(92,203,213,.55)'; ctx.fillRect(0, K.CEIL - 3, K.W, 2);
  }

  function zones(ctx, run, t) {
    for (const z of run.zones) {
      const x0 = z.x0 - run.dist + K.PX, x1 = z.x1 - run.dist + K.PX;
      if (x1 < 0 || x0 > K.W) continue;
      const w = x1 - x0;
      const playerWorldX = run.dist + K.PS / 2;
      const playerInside = playerWorldX >= z.x0 && playerWorldX <= z.x1;
      const fadeIn = smoothstep((playerWorldX - (z.x0 - 130)) / 130);
      const fadeOut = 1 - smoothstep((playerWorldX - z.x1) / 130);
      const zoneFade = fadeIn * fadeOut;
      ctx.save(); ctx.globalAlpha *= zoneFade;
      // Cada sector especial se siente como una cámara independiente del laboratorio.
      const chamber = z.kind === 'hot' ? ['rgba(255,105,42,.19)', '#e9823f', 'rgba(255,129,48,.32)']
        : z.kind === 'cryo' ? ['rgba(75,178,255,.18)', '#79dfff', 'rgba(89,195,255,.3)']
        : ['rgba(171,89,255,.17)', '#c48cff', 'rgba(185,109,255,.3)'];
      const chamberWash = ctx.createLinearGradient(0, K.CEIL, 0, K.GROUND);
      chamberWash.addColorStop(0, chamber[0]); chamberWash.addColorStop(.55, 'rgba(5,12,22,.02)'); chamberWash.addColorStop(1, chamber[0]);
      ctx.fillStyle = chamberWash; ctx.fillRect(x0, K.CEIL, w, K.GROUND - K.CEIL);
      // Uniones de cámara y marco superior/inferior dan sensación de recinto sellado.
      ctx.fillStyle = 'rgba(5,11,20,.58)'; ctx.fillRect(x0, K.CEIL + 8, w, 8); ctx.fillRect(x0, K.GROUND - 8, w, 8);
      ctx.fillStyle = chamber[1]; ctx.globalAlpha = .68; ctx.fillRect(x0, K.CEIL + 14, w, 2); ctx.fillRect(x0, K.GROUND - 14, w, 2); ctx.globalAlpha = 1;
      for (const seam of [x0 + 5, x1 - 7]) {
        ctx.fillStyle = 'rgba(8,16,27,.75)'; ctx.fillRect(seam, K.CEIL + 15, 3, K.GROUND - K.CEIL - 30);
        ctx.fillStyle = chamber[1]; ctx.globalAlpha = .62; ctx.fillRect(seam + 1, K.CEIL + 18, 1, K.GROUND - K.CEIL - 36); ctx.globalAlpha = 1;
      }
      // Paneles internos repetidos como pared de horno, congelador o cámara magnética.
      for (let px = x0 + 26; px < x1 - 12; px += 72) {
        ctx.fillStyle = 'rgba(6,13,23,.32)'; rr(ctx, px, K.CEIL + 28, 58, K.GROUND - K.CEIL - 56, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(180,218,230,.12)'; ctx.lineWidth = 1; rr(ctx, px, K.CEIL + 28, 58, K.GROUND - K.CEIL - 56, 4); ctx.stroke();
        ctx.fillStyle = chamber[2]; ctx.globalAlpha = .55 + Math.sin(t * 2 + px) * .12; ctx.fillRect(px + 8, K.CEIL + 36, 18, 2); ctx.globalAlpha = 1;
      }
      // Señales ambientales visibles desde fuera y más intensas dentro de cada cámara.
      const margin = 100, span = Math.max(1, w + margin * 2);
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - margin, K.CEIL, span, K.GROUND - K.CEIL); ctx.clip();
      if (z.kind === 'hot') {
        for (let i = 0; i < 22; i++) {
          const px = x0 - margin + ((i * 53 + t * (22 + i % 5 * 4)) % span);
          const py = K.GROUND - 16 - ((i * 37 + t * (34 + i % 4 * 9)) % (K.GROUND - K.CEIL - 24));
          const inside = px >= x0 && px <= x1;
          ctx.globalAlpha = (inside ? .72 : .22) * zoneFade;
          ctx.fillStyle = i % 3 ? '#ffad49' : '#fff09a';
          ctx.shadowColor = '#ff722d'; ctx.shadowBlur = inside ? 10 : 3;
          ctx.beginPath(); ctx.ellipse(px, py, inside ? 2.2 : 1.3, inside ? 4.2 : 2.2, -.3, 0, TAU); ctx.fill();
        }
      } else if (z.kind === 'cryo') {
        for (let i = 0; i < 25; i++) {
          const px = x0 - margin + ((i * 47 + Math.sin(t * .6 + i) * 13 + span) % span);
          const py = K.CEIL + ((i * 31 + t * (12 + i % 4 * 4)) % (K.GROUND - K.CEIL));
          const inside = px >= x0 && px <= x1, size = inside ? 2.4 : 1.3;
          ctx.globalAlpha = (inside ? .78 : .2) * zoneFade; ctx.strokeStyle = inside ? '#c8f4ff' : '#8acde8'; ctx.lineWidth = inside ? 1.15 : .8;
          ctx.beginPath(); ctx.moveTo(px - size, py); ctx.lineTo(px + size, py); ctx.moveTo(px, py - size); ctx.lineTo(px, py + size);
          if (inside) { ctx.moveTo(px - size * .7, py - size * .7); ctx.lineTo(px + size * .7, py + size * .7); ctx.moveTo(px - size * .7, py + size * .7); ctx.lineTo(px + size * .7, py - size * .7); }
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          const px = x0 - margin + i * (span / 8), inside = px >= x0 && px <= x1;
          ctx.globalAlpha = (inside ? .48 : .13) * zoneFade; ctx.strokeStyle = inside ? '#c48cff' : '#9667d1';
          ctx.shadowColor = '#a85cff'; ctx.shadowBlur = inside ? 8 : 2;
          const bend = 26 + 12 * Math.sin(t * 1.3 + i);
          ctx.beginPath(); ctx.moveTo(px - bend, K.CEIL + 5);
          ctx.bezierCurveTo(px + bend, K.CEIL + 90, px - bend, K.GROUND - 90, px + bend, K.GROUND - 5); ctx.stroke();
        }
      }
      ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
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
      // Portal industrial decorativo: marca el cambio de cámara sin colisionar.
      for (const edgeX of [x0, x1]) {
        if (edgeX < -28 || edgeX > K.W + 28) continue;
        ctx.save();
        ctx.fillStyle = 'rgba(8,15,25,.82)'; rr(ctx, edgeX - 8, K.CEIL + 8, 16, K.GROUND - K.CEIL - 8, 4); ctx.fill();
        ctx.strokeStyle = chamber[1]; ctx.globalAlpha = .78; ctx.lineWidth = 2;
        ctx.shadowColor = chamber[1]; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(edgeX, K.CEIL + 10); ctx.lineTo(edgeX, K.GROUND - 2); ctx.stroke();
        ctx.globalAlpha = .45; ctx.lineWidth = 1;
        for (let y = K.CEIL + 28; y < K.GROUND - 8; y += 26) {
          ctx.beginPath(); ctx.moveTo(edgeX - 5, y); ctx.lineTo(edgeX + 5, y); ctx.stroke();
        }
        ctx.restore();
      }
      // Al entrar, las partículas del ambiente ocupan todo el laboratorio.
      // Fuera de la cámara quedan solo algunas partículas suaves cerca de sus límites.
      if (zoneFade > .015) {
        ctx.save();
        ctx.globalAlpha *= zoneFade;
        if (z.kind === 'hot') {
          for (let i = 0; i < 118; i++) {
            const px = (i * 137.5 + Math.sin(t * .9 + i) * 18 + K.W) % K.W;
            const py = K.CEIL + ((i * 71 + t * (38 + i % 6 * 13)) % (K.GROUND - K.CEIL));
            const size = 1.7 + i % 4 * .6;
            ctx.globalAlpha = (.62 + (i % 5) * .075) * zoneFade; ctx.fillStyle = i % 4 ? '#ff8b35' : '#fff6ad';
            ctx.shadowColor = '#ff5424'; ctx.shadowBlur = 12 + i % 4 * 3;
            ctx.beginPath(); ctx.ellipse(px, py, size, size * 1.8, -.35, 0, TAU); ctx.fill();
          }
        } else if (z.kind === 'cryo') {
          for (let i = 0; i < 94; i++) {
            const drift = Math.sin(t * .8 + i * 1.7) * 32;
            const px = (i * 97.7 + drift + K.W) % K.W;
            const py = K.CEIL + ((i * 53 + t * (18 + i % 5 * 9)) % (K.GROUND - K.CEIL));
            const size = 2.6 + i % 3 * 1;
            ctx.globalAlpha = (.68 + (i % 4) * .075) * zoneFade; ctx.strokeStyle = i % 5 ? '#a8e9ff' : '#fff'; ctx.lineWidth = 1.55;
            ctx.shadowColor = '#54caff'; ctx.shadowBlur = 11;
            ctx.beginPath(); ctx.moveTo(px - size, py); ctx.lineTo(px + size, py); ctx.moveTo(px, py - size); ctx.lineTo(px, py + size);
            ctx.moveTo(px - size * .7, py - size * .7); ctx.lineTo(px + size * .7, py + size * .7);
            ctx.moveTo(px - size * .7, py + size * .7); ctx.lineTo(px + size * .7, py - size * .7); ctx.stroke();
          }
        } else {
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 31; i++) {
            const px = i * (K.W / 30), phase = t * 1.4 + i * .52, bend = 40 + 26 * Math.sin(phase);
            ctx.globalAlpha = (.55 + .26 * (.5 + .5 * Math.sin(phase))) * zoneFade; ctx.strokeStyle = i % 3 ? '#a96bed' : '#edc6ff'; ctx.lineWidth = i % 4 === 0 ? 1.8 : 1.2;
            ctx.shadowColor = '#9a45ed'; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.moveTo(px - bend, K.CEIL); ctx.bezierCurveTo(px + bend, K.CEIL + 105, px - bend, K.GROUND - 105, px + bend, K.GROUND); ctx.stroke();
          }
        }
        ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
      // etiqueta
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.fillStyle = z.kind === 'hot' ? '#ffb070' : z.kind === 'cryo' ? '#9ef' : '#d9a6ff';
      const lx = Math.max(x0 + 8, Math.min(8, x1 - 160));
      ctx.fillText(z.label, Math.max(lx, x0 + 8), K.CEIL + 20);
      ctx.restore();
    }
  }

  function ground(ctx, run, t) {
    const d = run ? run.dist : t * 200;
    const deck = ctx.createLinearGradient(0, K.GROUND, 0, K.FIELD_H);
    deck.addColorStop(0, '#344452'); deck.addColorStop(.16, '#253441'); deck.addColorStop(1, '#111b27');
    ctx.fillStyle = deck; ctx.fillRect(0, K.GROUND, K.W, K.FIELD_H - K.GROUND);
    // Borde iluminado y paneles de una pasarela de servicio.
    ctx.fillStyle = '#8ab7b6'; ctx.fillRect(0, K.GROUND, K.W, 2);
    ctx.fillStyle = 'rgba(86,224,218,.22)'; ctx.fillRect(0, K.GROUND + 2, K.W, 3);
    const panelOffset = -(d % 160);
    for (let x = panelOffset - 160; x < K.W + 160; x += 160) {
      ctx.fillStyle = 'rgba(7,15,23,.22)'; rr(ctx, x + 8, K.GROUND + 9, 144, K.FIELD_H - K.GROUND - 16, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(146,177,188,.19)'; ctx.lineWidth = 1; rr(ctx, x + 8, K.GROUND + 9, 144, K.FIELD_H - K.GROUND - 16, 3); ctx.stroke();
      ctx.fillStyle = 'rgba(157,183,191,.23)';
      ctx.fillRect(x + 17, K.GROUND + 16, 24, 2); ctx.fillRect(x + 17, K.GROUND + 22, 12, 2);
      ctx.fillStyle = 'rgba(76,205,207,.45)'; ctx.fillRect(x + 132, K.GROUND + 15, 8, 3);
      // Tornillos en las esquinas de las placas.
      ctx.fillStyle = 'rgba(194,211,211,.4)';
      for (const sx of [x + 13, x + 146]) for (const sy of [K.GROUND + 14, K.FIELD_H - 13]) { ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, TAU); ctx.fill(); }
    }
    // Guías de seguridad amarillas y canal técnico central.
    ctx.fillStyle = '#a5823e'; ctx.fillRect(0, K.GROUND + 5, K.W, 2);
    const hazardOffset = -(d % 44);
    for (let x = hazardOffset - 44; x < K.W + 44; x += 44) {
      ctx.fillStyle = 'rgba(242,188,82,.82)';
      ctx.beginPath(); ctx.moveTo(x, K.GROUND + 5); ctx.lineTo(x + 17, K.GROUND + 5); ctx.lineTo(x + 10, K.GROUND + 7); ctx.lineTo(x - 7, K.GROUND + 7); ctx.fill();
    }
    ctx.fillStyle = '#0d1a25'; rr(ctx, 0, K.GROUND + 31, K.W, 11, 2); ctx.fill();
    ctx.fillStyle = 'rgba(91,210,213,.45)'; ctx.fillRect(0, K.GROUND + 35, K.W, 2);
    ctx.fillStyle = 'rgba(162,196,202,.22)'; ctx.fillRect(0, K.GROUND + 47, K.W, 1);
    if (!run) return;
    for (const p of run.pits) {
      const x0 = p.x0 - run.dist + K.PX, x1 = p.x1 - run.dist + K.PX;
      if (x1 < 0 || x0 > K.W) continue;
      // Base sólida hasta debajo del borde HUD evita una costura antialiasada.
      ctx.fillStyle = '#05080c'; ctx.fillRect(x0, K.GROUND, x1 - x0, K.H - K.GROUND + 2);
      const acidTop = K.GROUND + 10;
      const g = ctx.createLinearGradient(0, acidTop, 0, K.H + 2);
      g.addColorStop(0, '#b6ff58'); g.addColorStop(.12, '#62df36'); g.addColorStop(.58, '#2b9e27'); g.addColorStop(1, '#123d24');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0 - 1, K.H + 2);
      for (let x = x0 - 1; x <= x1 + 1; x += 5) {
        const wave = Math.sin(x * .045 + t * 3.4) * 2.2 + Math.sin(x * .11 - t * 2.1) * 1.1;
        ctx.lineTo(x, acidTop + wave);
      }
      ctx.lineTo(x1 + 1, K.H + 2); ctx.closePath(); ctx.fill();
      // Borde luminoso de la superficie y pequeñas burbujas animadas.
      ctx.save(); ctx.shadowColor = '#9dff48'; ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(211,255,120,.9)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = x0 - 1; x <= x1 + 1; x += 5) {
        const wave = Math.sin(x * .045 + t * 3.4) * 2.2 + Math.sin(x * .11 - t * 2.1) * 1.1;
        if (x === x0 - 1) ctx.moveTo(x, acidTop + wave); else ctx.lineTo(x, acidTop + wave);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(219,255,130,.78)';
      for (let i = 0; i < 11; i++) {
        const span = Math.max(1, x1 - x0 - 16), bx = x0 + 8 + ((i * 67 + t * (16 + i % 4 * 5)) % span);
        const phase = (t * .72 + i * .137) % 1, by = K.H - phase * (K.H - K.GROUND - 20);
        ctx.globalAlpha = .25 + Math.sin(phase * Math.PI) * .6;
        ctx.beginPath(); ctx.ellipse(bx, by, 1.5 + (i % 3) * .6, 2 + (i % 2), 0, 0, TAU); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      // Bordes cortados de la plataforma sobre el ácido.
      ctx.fillStyle = '#526773'; ctx.fillRect(x0 - 4, K.GROUND, 4, 8); ctx.fillRect(x1, K.GROUND, 4, 8);
      ctx.fillStyle = '#d8b66d'; ctx.fillRect(x0 - 4, K.GROUND + 7, 4, 2); ctx.fillRect(x1, K.GROUND + 7, 4, 2);
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
          const brittle = o.B < 55, hard = o.B > 260;
          const palette = brittle ? ['#59636b', '#313c45', '#778087'] : hard ? ['#71818a', '#344750', '#9aadb2'] : ['#697781', '#303d49', '#9aa8ad'];
          const g = ctx.createLinearGradient(x, 0, x + o.w, 0);
          g.addColorStop(0, palette[0]); g.addColorStop(.14, palette[1]); g.addColorStop(.82, '#263541'); g.addColorStop(1, palette[2]);
          ctx.fillStyle = g; rr(ctx, x, o.y, o.w, o.h, o.full ? 2 : 5); ctx.fill();
          ctx.save(); rr(ctx, x + 2, o.y + 2, o.w - 4, o.h - 4, 3); ctx.clip();
          // Caras biseladas y bandas según el material indicado por el obstáculo.
          ctx.fillStyle = 'rgba(220,238,239,.16)'; ctx.fillRect(x + 3, o.y + 3, Math.max(2, o.w * .12), o.h - 6);
          ctx.fillStyle = 'rgba(0,8,15,.22)'; ctx.fillRect(x + o.w * .78, o.y + 2, o.w * .19, o.h - 4);
          if (brittle) {
            ctx.strokeStyle = 'rgba(225,236,231,.26)'; ctx.lineWidth = 1.2;
            for (let yy = o.y + 18; yy < o.y + o.h; yy += 37) {
              const cx = x + o.w * (.3 + ((Math.floor(yy) % 3) * .12));
              ctx.beginPath(); ctx.moveTo(cx, yy); ctx.lineTo(cx - 5, yy + 8); ctx.lineTo(cx + 2, yy + 15); ctx.lineTo(cx - 2, yy + 22); ctx.stroke();
            }
          } else {
            ctx.fillStyle = 'rgba(190,220,224,.11)';
            const spacing = o.full ? 34 : 18;
            for (let yy = o.y + spacing; yy < o.y + o.h; yy += spacing) ctx.fillRect(x + 3, yy, o.w - 6, 2);
            if (hard) {
              ctx.fillStyle = 'rgba(103,222,219,.22)'; ctx.fillRect(x + o.w * .42, o.y + 4, Math.max(3, o.w * .12), o.h - 8);
              ctx.fillStyle = 'rgba(220,250,255,.36)';
              for (let yy = o.y + 12; yy < o.y + o.h - 5; yy += 28) { ctx.beginPath(); ctx.arc(x + o.w * .48, yy, 1.7, 0, TAU); ctx.fill(); }
            }
          }
          ctx.restore();
          // Pernos visibles en las esquinas para dar escala a los bloques.
          ctx.fillStyle = 'rgba(216,231,230,.72)';
          for (const bx of [x + 6, x + o.w - 6]) for (const by of [o.y + 6, o.y + o.h - 6]) {
            if (by <= o.y + o.h - 3 && bx >= x + 3 && bx <= x + o.w - 3) { ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, TAU); ctx.fill(); }
          }
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
          const ok = e.shear_threshold > o.G, cx = x + o.w / 2, cy = K.GROUND, r = o.w / 2;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, K.W, K.GROUND); ctx.clip();
          ctx.translate(cx, cy); ctx.rotate(-t * 12);
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
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, K.W, K.GROUND); ctx.clip();
          ctx.strokeStyle = ok ? '#5dff9b' : '#ff5d6c'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
          ctx.font = 'bold 10px Segoe UI, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#e8f0f8'; ctx.fillText(o.label, cx, K.GROUND - r - 14);
          ctx.fillStyle = ok ? '#5dff9b' : '#ff8a95'; ctx.fillText(`G ${o.G}`, cx, K.GROUND - r - 3);
          ctx.restore();
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
          ctx.shadowColor = dm.color; ctx.shadowBlur = 18; ctx.strokeStyle = dm.color; ctx.lineWidth = 1.5;
          for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
            ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, TAU); ctx.stroke(); ctx.restore();
          }
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
          ctx.fillStyle = dm.color; ctx.beginPath(); ctx.arc(14, 0, 2.4, 0, TAU); ctx.fill();
          ctx.restore(); ctx.shadowBlur = 0;
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
    // Sombra elíptica y estela direccional para dar lectura al salto y la caída.
    const height = Math.max(0, K.GROUND - (p.y + s));
    const shadowScale = Math.max(.28, 1 - height / 250);
    ctx.save();
    ctx.globalAlpha = .2 * shadowScale;
    ctx.fillStyle = '#02070c'; ctx.beginPath();
    ctx.ellipse(cx, K.GROUND + 2, s * .62 * shadowScale, 4 * shadowScale, 0, 0, TAU); ctx.fill();
    ctx.restore();
    const shieldActive = run.meissner || run.energy >= 50;
    if (shieldActive) {
      const shieldColor = run.meissner ? '#9b8aff' : '#48cfff';
      const pulse = .5 + .5 * Math.sin(t * 6.5), radius = 34 + pulse * 4;
      const bubble = ctx.createRadialGradient(cx - 8, cy - 10, 3, cx, cy, radius);
      bubble.addColorStop(0, 'rgba(117,220,255,.035)'); bubble.addColorStop(.72, run.meissner ? 'rgba(151,125,255,.15)' : 'rgba(67,192,255,.16)');
      bubble.addColorStop(1, run.meissner ? 'rgba(175,150,255,.32)' : 'rgba(106,220,255,.32)');
      ctx.save(); ctx.fillStyle = bubble; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = shieldColor; ctx.globalAlpha = .78 + pulse * .2; ctx.lineWidth = 2 + pulse * 1.3;
      ctx.shadowColor = shieldColor; ctx.shadowBlur = 22 + pulse * 17;
      ctx.beginPath(); ctx.arc(cx, cy, radius, t * 1.1, t * 1.1 + TAU * .82); ctx.stroke();
      ctx.globalAlpha = .75; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, radius - 4, -t * .7, -t * .7 + TAU * .28); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = t * 1.4 + i * TAU / 5, r = radius - 2 + Math.sin(t * 5 + i) * 2;
        ctx.globalAlpha = .42 + .48 * (.5 + .5 * Math.sin(t * 8 + i));
        ctx.fillStyle = '#efffff'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.3 + pulse, 0, TAU); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    if (!p.ground && !p.ceil) {
      const descending = p.vy > 180;
      const trail = Math.min(4, Math.abs(p.vy) / 330);
      ctx.save(); ctx.globalAlpha = .13 + trail * .035; ctx.strokeStyle = m.color;
      ctx.lineWidth = 2 + trail; ctx.lineCap = 'round'; ctx.shadowColor = m.color; ctx.shadowBlur = 12;
      for (let i = 0; i < 3; i++) {
        const tx = cx - 13 - i * 7, ty = cy + (descending ? -4 : 4) * i;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 14 - trail * 3, ty + (descending ? -4 : 4)); ctx.stroke();
      }
      ctx.restore();
    }
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
    const squash = p.ground ? 1 + Math.sin(t * 9) * .018 : 1;
    const stretch = !p.ground ? Math.min(1.12, 1 + Math.abs(p.vy) / 4500) : 1;
    ctx.scale(squash / stretch, stretch / squash);
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
    if (run.T > m.melting_point * 0.72) return { t: '[!] Te estás fundiendo: cambia a un aislante térmico o material con mayor Tm', c: '#ff5d6c' };
    if (run.meissner) return { t: 'Estado Meissner activo: levitas sobre pinchos y ácido', c: '#5ff2ff' };
    const z = run.zonesAt(px)[0];
    if (z) {
      if (z.kind === 'magnet') return { t: 'Electroimán: usa Fe/ferromagnético para pegarte al techo', c: '#d9a6ff' };
      if (z.kind === 'hot') return { t: 'Zona caliente: materiales con baja κ se calientan más lento', c: '#ffb070' };
      if (z.kind === 'cryo') return { t: 'Criogenia: superconductores levitan · conductores disipan calor', c: '#8ff' };
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
          ? { t: `Borde VERDE: atraviesa el bloque (${near.label}) para ganar combo`, c: '#5dff9b' }
          : { t: `Borde ROJO (B ${near.B}): sáltalo o cambia a un material más duro`, c: '#ff8a95' };
      }
      if (near.type === 'saw') {
        return e.shear_threshold > near.G
          ? { t: `Borde VERDE: tu corte (G ${m.shear_modulus}) rompe la sierra`, c: '#5dff9b' }
          : { t: `Sierra (G ${near.G}): sáltala o usa un material con mayor G`, c: '#ff8a95' };
      }
      if (near.type === 'arc') return { t: 'Arco: Metal carga escudo · Aislante pasa sin daño', c: '#ffe066' };
      if (near.type === 'laser') return { t: 'Láser alto: ve por abajo (o cae en picada con material pesado)', c: '#ff8a95' };
      if (near.type === 'dopant') return { t: `Dopante ${DB.get(near.mat).formula}: tócalo para probarlo 8 s`, c: '#ffd27a' };
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

  function topHud(ctx, run, t) {
    const m = run.mat;
    // Columna lateral: medidores verticales para dejar libre el centro del escenario.
    const railX = 2, railY = 62, railW = 62, railH = 358;
    ctx.fillStyle = 'rgba(4,11,20,.78)'; rr(ctx, railX, railY, railW, railH, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(129,195,221,.25)'; rr(ctx, railX, railY, railW, railH, 10); ctx.stroke();
    const drawVertical = (cy, kind, label, frac, color, value, marker, pulse = 0, symbolColor = color) => {
      const ix = railX + railW / 2, iy = cy - 4;
      ctx.save(); ctx.translate(ix, iy); ctx.strokeStyle = symbolColor; ctx.fillStyle = symbolColor;
      ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = color; ctx.shadowBlur = 3 + pulse * 7 + pulse * 6 * (.5 + .5 * Math.sin(t * 8));
      const iconPulse = 1 + pulse * .07 * Math.sin(t * 8);
      ctx.scale(iconPulse, iconPulse);
      if (kind === 'fire') {
        ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-11, 1, -5, -5, -2, -12); ctx.bezierCurveTo(0, -8, 7, -5, 5, 1); ctx.bezierCurveTo(11, -2, 10, 8, 2, 11); ctx.bezierCurveTo(-3, 13, -8, 10, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.beginPath(); ctx.moveTo(1, 6); ctx.bezierCurveTo(-3, 2, 2, -1, 2, -4); ctx.bezierCurveTo(7, 1, 6, 5, 1, 6); ctx.fill();
      } else if (kind === 'bolt') {
        ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(-7, 1); ctx.lineTo(-1, 1); ctx.lineTo(-3, 12); ctx.lineTo(7, -3); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = .8; ctx.stroke();
      }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.font = 'bold 8px Segoe UI'; ctx.fillStyle = '#8da7ba'; ctx.fillText(label, railX + railW / 2, cy + 12);
      const x = railX + 24, y = cy + 20, w = 14, h = 82, f = Math.max(0, Math.min(1, frac));
      ctx.fillStyle = 'rgba(0,0,0,.65)'; rr(ctx, x, y, w, h, 6); ctx.fill();
      if (f > 0) { ctx.fillStyle = color; rr(ctx, x, y + h * (1 - f), w, h * f, 6); ctx.fill(); }
      ctx.strokeStyle = 'rgba(220,240,255,.28)'; rr(ctx, x, y, w, h, 6); ctx.stroke();
      if (marker !== undefined) { const my = y + h * (1 - marker); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, my, w + 6, 2); }
      ctx.textAlign = 'center'; ctx.font = 'bold 8px Segoe UI'; ctx.fillStyle = '#d8e8f3'; ctx.fillText(value, railX + railW / 2, y + h + 13);
    };
    const tFrac = Math.min(1, run.T / m.melting_point);
    const heatLevel = tFrac;
    const tCol = heatLevel > .78 ? '#ff4f42' : heatLevel > .45 ? '#ff9f3e' : '#ffd05e';
    const fireIconColor = colorMix('#ffffff', tCol, heatLevel);
    drawVertical(railY + 25, 'fire', '', tFrac, tCol, `${Math.round(run.T)}K`, undefined, heatLevel, fireIconColor);
    const capColor = run.meissner ? '#8a78ff' : '#36aaff';
    const capCol = colorMix('#ffffff', capColor, run.meissner ? 1 : run.energy / 100);
    const shieldReady = run.energy >= 50 || run.meissner;
    drawVertical(railY + 164, 'bolt', '', run.energy / 100, capCol, run.meissner ? '∞' : `${Math.round(run.energy)}%`, .5, run.energy / 100);
    if (shieldReady) {
      const pulse = .5 + .5 * Math.sin(t * 7);
      ctx.save(); ctx.strokeStyle = capCol; ctx.globalAlpha = .32 + pulse * .42; ctx.lineWidth = 1.4;
      ctx.shadowColor = capCol; ctx.shadowBlur = 10 + pulse * 9;
      ctx.beginPath(); ctx.arc(railX + railW / 2, railY + 164 - 4, 15 + pulse * 2, 0, TAU); ctx.stroke(); ctx.restore();
    }
    ctx.font = 'bold 8px Segoe UI'; ctx.fillStyle = '#8da7ba'; ctx.textAlign = 'center'; ctx.fillText('HP', railX + railW / 2, railY + 306);
    for (let i = 0; i < 3; i++) {
      const hx = railX + 17 + i * 14, hy = railY + 326;
      if (run._hudIntegrity === undefined) run._hudIntegrity = run.integrity;
      if (run.integrity < run._hudIntegrity) { run._hudLifeLostAt = t; run._hudLifeLostIndex = run.integrity; }
      const lostAge = t - (run._hudLifeLostAt || -10), animLost = i === run._hudLifeLostIndex && lostAge >= 0 && lostAge < .65;
      ctx.save();
      if (animLost) { ctx.globalAlpha = Math.max(0, 1 - lostAge / .65); ctx.translate(Math.sin(lostAge * 55) * 2.5, -lostAge * 8); ctx.scale(1 + lostAge * 1.2, 1 + lostAge * 1.2); }
      ctx.fillStyle = i < run.integrity ? '#72f0b2' : 'rgba(255,255,255,.15)';
      ctx.strokeStyle = i < run.integrity ? '#b8ffde' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx, hy - 6); ctx.lineTo(hx + 6, hy); ctx.lineTo(hx, hy + 6); ctx.lineTo(hx - 6, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    run._hudIntegrity = run.integrity;
    // Marcador de récord y puntuación se ubican en la esquina superior derecha.
    const scoreX = K.W - 164;
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(4,11,20,.82)'; rr(ctx, scoreX, 8, 156, 46, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(100,210,255,.3)'; rr(ctx, scoreX, 8, 156, 46, 8); ctx.stroke();
    ctx.font = 'bold 20px Segoe UI, sans-serif'; ctx.fillStyle = '#e9fbff'; ctx.fillText(String(run.score).padStart(6, '0'), scoreX + 10, 29);
    ctx.font = '10px Segoe UI, sans-serif'; ctx.fillStyle = '#8fb0cc'; ctx.fillText(`RÉCORD ${DB.progress.best}`, scoreX + 10, 45);
    if (run.combo > 1) { ctx.fillStyle = '#5dff9b'; ctx.font = 'bold 12px Segoe UI'; ctx.fillText(`×${run.combo}`, scoreX + 116, 28); }

    const slotM = run.loadout[run.slot];
    if (!run.absorbed && slotM.engine.metastable && run.slotDecay[run.slot] <= 0) {
      const frac = 1 - run.slotStress[run.slot] / slotM.engine.decay_time;
      ctx.fillStyle = 'rgba(4,11,20,.82)'; rr(ctx, scoreX - 112, 13, 104, 34, 7); ctx.fill();
      ctx.font = 'bold 8px Segoe UI'; ctx.fillStyle = '#ffbd61'; ctx.textAlign = 'left'; ctx.fillText('ESTABILIDAD', scoreX - 103, 25);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, scoreX - 103, 31, 86, 5, 2); ctx.fill();
      ctx.fillStyle = '#ffb347'; rr(ctx, scoreX - 103, 31, 86 * Math.max(0, frac), 5, 2); ctx.fill();
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffe0ad'; ctx.fillText(`${(slotM.engine.decay_time - run.slotStress[run.slot]).toFixed(1)}s`, scoreX - 13, 25);
    }

    // Estado especial junto a la puntuación.
    let st = null;
    if (run.meissner) st = ['MEISSNER', '#5ff2ff'];
    else if (run.p.ceil) st = ['ADHERIDO', '#d9a6ff'];
    else if (run.absorbed) st = [`DOPADO ${run.absorbTimer.toFixed(0)}s`, '#ffd27a'];
    if (st) {
      ctx.font = 'bold 11px Segoe UI';
      const w = ctx.measureText(st[0]).width + 16;
      const sx = scoreX - w - 12;
      ctx.fillStyle = 'rgba(5,10,18,0.78)'; rr(ctx, sx, 14, w, 24, 6); ctx.fill();
      ctx.strokeStyle = st[1]; rr(ctx, sx, 14, w, 24, 6); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = st[1]; ctx.fillText(st[0], sx + 8, 30);
    }
    ctx.textAlign = 'left';
  }

  function bottomHud(ctx, run, t) {
    const y0 = K.FIELD_H;
    const panel = ctx.createLinearGradient(0, y0, 0, K.H);
    panel.addColorStop(0, '#0c1628'); panel.addColorStop(1, '#070d19');
    ctx.fillStyle = panel; ctx.fillRect(0, y0, K.W, K.H - y0);
    ctx.fillStyle = 'rgba(99,216,255,.56)'; ctx.fillRect(0, y0, K.W, 1);
    ctx.fillStyle = 'rgba(99,216,255,.1)'; ctx.fillRect(0, y0 + 1, K.W, 4);

    // Carrusel de 4 materiales (más ancho y claro)
    const n = run.loadout.length;
    for (let i = 0; i < n; i++) {
      const bx = 10 + i * 114, by = y0 + 10, sel = i === run.slot && !run.absorbed;
      const m = run.baseMat(i);
      const role = roleTag(m);
      ctx.fillStyle = sel ? 'rgba(40,190,230,0.17)' : 'rgba(255,255,255,0.035)';
      rr(ctx, bx, by, 108, 88, 8); ctx.fill();
      if (sel) { ctx.shadowColor = '#25c9f2'; ctx.shadowBlur = 15; }
      ctx.strokeStyle = sel ? '#5ff2ff' : 'rgba(155,190,230,0.19)'; ctx.lineWidth = sel ? 2 : 1;
      rr(ctx, bx, by, 108, 88, 8); ctx.stroke(); ctx.lineWidth = 1;
      ctx.shadowBlur = 0;

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

    // Ficha del material activo: identidad, módulos y comportamiento.
    const m = run.mat, e = m.engine;
    const px = 472, pw = 344;
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; rr(ctx, px, y0 + 10, pw, 88, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(95,242,255,0.16)'; rr(ctx, px, y0 + 10, pw, 88, 8); ctx.stroke();

    ctx.font = 'bold 14px Segoe UI';
    ctx.fillStyle = (m.color === '#2b2b3a' || m.color === '#1f2a30') ? '#b8c8d8' : m.color;
    ctx.fillText(`${m.name} (${m.formula})`, px + 12, y0 + 29);

    ctx.fillStyle = 'rgba(146,190,211,.16)'; ctx.fillRect(px + 12, y0 + 36, pw - 24, 1);
    const electrical = e.elec_class === 'metal' ? 'Metal' : e.elec_class === 'insulator' ? 'Aislante' : 'Semiconductor';
    const magnetic = `${fmt(m.magmom, 2)} μB${m.curie_T ? ` · Tc ${fmt(m.curie_T)}K` : ''}`;
    const thermal = `κ ${fmt(m.thermal_conductivity)} W/m·K · Tm ${fmt(m.melting_point)}K`;
    const electric = `${electrical} · Eg ${fmt(m.bandgap, 2)} eV`;
    const hardness = `B ${fmt(m.bulk_modulus)} · G ${fmt(m.shear_modulus)} GPa · ${e.ductile ? 'dúctil' : 'frágil'}`;
    const metrics = [
      ['TÉRMICA', thermal, '#ffb36c'],
      ['ELÉCTRICA', electric, '#79dfff'],
      ['MAGNÉTICA', magnetic, '#c49aff'],
      ['DUREZA', hardness, '#83e4b2'],
    ];
    const cellW = 156, cellH = 22, gapX = 8, gapY = 3;
    metrics.forEach((item, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = px + 12 + col * (cellW + gapX), cy = y0 + 41 + row * (cellH + gapY);
      ctx.fillStyle = 'rgba(4,12,22,.58)'; rr(ctx, cx, cy, cellW, cellH, 4); ctx.fill();
      ctx.fillStyle = item[2]; ctx.fillRect(cx + 5, cy + 5, 2, cellH - 10);
      ctx.textAlign = 'left'; ctx.font = 'bold 7px Segoe UI'; ctx.fillStyle = '#91a9ba'; ctx.fillText(item[0], cx + 11, cy + 9);
      ctx.font = 'bold 9px Segoe UI'; ctx.fillStyle = '#e6f2f7'; ctx.fillText(item[1], cx + 11, cy + 19, cellW - 16);
    });

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
      topHud(ctx, run, t);
      toast(ctx, run);
      bottomHud(ctx, run, t);
    }
  };

  CD.Render = R;
})();
