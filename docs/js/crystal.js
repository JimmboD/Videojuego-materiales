/* Crystal Dash — celda unitaria 3D en wireframe según la red (derivada del grupo espacial) */
(function () {
  const cache = {};
  const corners = [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]];
  const boxEdges = [[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]];

  function box(sx, sy, sz, extra, bondCut, two) {
    const atoms = corners.map(c => [c[0]*sx, c[1]*sy, c[2]*sz, 0]);
    (extra || []).forEach(a => atoms.push([a[0]*sx, a[1]*sy, a[2]*sz, a[3] || 0]));
    const verts = corners.map(c => [c[0]*sx, c[1]*sy, c[2]*sz]);
    return { atoms, verts, edges: boxEdges, bondCut, two, center: [sx/2, sy/2, sz/2] };
  }

  function build(lat) {
    const fc = [[.5,.5,0],[.5,0,.5],[0,.5,.5],[.5,.5,1],[.5,1,.5],[1,.5,.5]];
    const tet = [[.25,.25,.25,1],[.75,.75,.25,1],[.75,.25,.75,1],[.25,.75,.75,1]];
    switch (lat) {
      case 'sc': return box(1,1,1,[]);
      case 'bcc': return box(1,1,1,[[.5,.5,.5]]);
      case 'fcc': return box(1,1,1,fc);
      case 'diamond': return box(1,1,1,fc.concat(tet.map(t => [t[0],t[1],t[2],0])),0.45);
      case 'zincblende': return box(1,1,1,fc.concat(tet),0.45,true);
      case 'tetragonal': return box(1,1,1.45,[[.5,.5,.5,1]]);
      case 'orthorhombic': return box(1.2,0.85,1.5,[[.5,.5,0,1],[.5,.5,1,1],[.5,0,.5],[.5,.85/.85,.5]]);
      case 'trigonal': {
        // celda romboédrica (ángulo ~ 70°)
        const a = [1,0,0], b = [0.34,0.94,0], c = [0.34,0.25,0.9];
        const P = (i,j,k) => [a[0]*i+b[0]*j+c[0]*k, a[1]*i+b[1]*j+c[1]*k, a[2]*i+b[2]*j+c[2]*k];
        const verts = corners.map(q => P(q[0],q[1],q[2]));
        const atoms = verts.map(v => [v[0],v[1],v[2],0]);
        const m = P(.5,.5,.5); atoms.push([m[0],m[1],m[2],1]);
        return { atoms, verts, edges: boxEdges, center: P(.5,.5,.5) };
      }
      case 'hcp':
      case 'hex':
      default: {
        const verts = [], atoms = [], edges = [], h = 1.6;
        for (let z = 0; z < 2; z++) for (let i = 0; i < 6; i++) {
          const an = i * Math.PI / 3;
          verts.push([Math.cos(an), Math.sin(an), z * h]);
        }
        for (let i = 0; i < 6; i++) {
          edges.push([i, (i+1)%6], [6+i, 6+(i+1)%6], [i, 6+i]);
        }
        verts.forEach(v => atoms.push([v[0], v[1], v[2], 0]));
        atoms.push([0,0,0,0], [0,0,h,0]);
        if (lat === 'hcp') {
          for (let i = 0; i < 3; i++) {
            const an = i * 2 * Math.PI / 3 + Math.PI / 6;
            atoms.push([0.577*Math.cos(an), 0.577*Math.sin(an), h/2, 1]);
          }
        } else {
          atoms.push([0.5,0.29,h/2,1],[-0.5,0.29,h/2,1],[0,-0.58,h/2,1]);
        }
        return { atoms, verts, edges, center: [0,0,h/2] };
      }
    }
  }

  function get(lat) { return cache[lat] || (cache[lat] = build(lat)); }

  /* Dibuja la celda rotando. size = radio aprox. en px */
  function draw(ctx, cx, cy, size, lat, t, color, alpha = 1) {
    const g = get(lat);
    const ry = t * 0.8, rx = 0.45 + Math.sin(t * 0.3) * 0.15;
    const cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx);
    const [ox, oy, oz] = g.center;
    const proj = p => {
      let x = p[0]-ox, y = p[2]-oz, z = p[1]-oy;     // z-up -> y-up
      let x1 = x*cyR + z*syR, z1 = -x*syR + z*cyR;
      let y1 = y*cxR - z1*sxR, z2 = y*sxR + z1*cxR;
      const s = size / (1.9 + z2 * 0.25);
      return [cx + x1*s, cy - y1*s, z2];
    };
    ctx.save();
    ctx.globalAlpha = alpha;
    const V = g.verts.map(proj);
    ctx.strokeStyle = 'rgba(140,200,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    g.edges.forEach(([a,b]) => { ctx.moveTo(V[a][0],V[a][1]); ctx.lineTo(V[b][0],V[b][1]); });
    ctx.stroke();
    const P = g.atoms.map(a => { const q = proj(a); q.push(a[3]); return q; });
    if (g.bondCut) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < g.atoms.length; i++) for (let j = i+1; j < g.atoms.length; j++) {
        const a = g.atoms[i], b = g.atoms[j];
        const d = Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
        if (d < g.bondCut && isTet(a) !== isTet(b)) {
          ctx.moveTo(P[i][0],P[i][1]); ctx.lineTo(P[j][0],P[j][1]);
        }
      }
      ctx.stroke();
    }
    P.sort((a,b) => a[2]-b[2]);
    P.forEach(q => {
      const r = Math.max(1.5, size * 0.09 * (1.2 - q[2]*0.15));
      ctx.fillStyle = q[3] ? '#ffd27a' : color;
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
    });
    ctx.restore();
  }
  function isTet(a) { const f = v => Math.abs(v*4 - Math.round(v*4)) < 1e-6 && Math.round(v*4) % 2 === 1; return f(a[0]) && f(a[1]) && f(a[2]); }

  CD.Crystal = { draw };
})();
