'use strict';
// Reproductor mínimo de esqueletos Spine 4.0 (formato JSON), hecho para este proyecto.
// Soporta huesos (giro, posición, escala, cizalla), imágenes de región, cambio de imagen y color de las ranuras,
// y animaciones por claves (lineales o escalonadas). Las mallas deformables no se dibujan.
const SpineLite = (function () {
  const D2R = Math.PI / 180;
  function Skeleton(data, skinName, images) {
    this.data = data; this.images = images;
    this.bones = data.bones.map((b) => ({ d: b, parent: null, x: 0, y: 0, rot: 0, sx: 1, sy: 1, shx: 0, shy: 0, a: 1, b: 0, c: 0, dd: 1, wx: 0, wy: 0 }));
    const byName = {}; this.bones.forEach((b) => { byName[b.d.name] = b; });
    this.bones.forEach((b) => { if (b.d.parent) b.parent = byName[b.d.parent]; });
    this.boneByName = byName;
    // imágenes: la piel elegida encima de la de por defecto
    this.att = {};
    for (const sk of data.skins) if (sk.name === 'default' || sk.name === skinName) for (const [slot, atts] of Object.entries(sk.attachments || {})) {
      this.att[slot] = Object.assign(this.att[slot] || {}, atts);
    }
    this.slots = data.slots.map((s) => ({ d: s, bone: byName[s.bone], att: s.attachment || null, col: hex(s.color) }));
    this.slotByName = {}; this.slots.forEach((s) => { this.slotByName[s.d.name] = s; });
    this.order = this.slots.slice();
    this.setup();
  }
  function hex(h) { if (!h) return [1, 1, 1, 1]; return [0, 2, 4, 6].map((i) => parseInt(h.substr(i, 2) || 'ff', 16) / 255); }
  Skeleton.prototype.setup = function () {
    for (const b of this.bones) { const d = b.d; b.x = d.x || 0; b.y = d.y || 0; b.rot = d.rotation || 0; b.sx = d.scaleX == null ? 1 : d.scaleX; b.sy = d.scaleY == null ? 1 : d.scaleY; b.shx = d.shearX || 0; b.shy = d.shearY || 0; }
    for (const s of this.slots) { s.att = s.d.attachment || null; s.col = hex(s.d.color); }
  };
  // valor de una pista en el tiempo t (claves con time; sin time = 0)
  function sample(keys, t, fields, defs) {
    let i = 0; while (i < keys.length - 1 && (keys[i + 1].time || 0) <= t) i++;
    const k0 = keys[i], t0 = k0.time || 0;
    const val = (k, f, j) => (k[f] == null ? defs[j] : k[f]);
    if (i === keys.length - 1 || t < t0 || k0.curve === 'stepped') return fields.map((f, j) => val(k0, f, j));
    const k1 = keys[i + 1], t1 = k1.time || 0, q = (t - t0) / Math.max(1e-6, t1 - t0);
    return fields.map((f, j) => val(k0, f, j) + (val(k1, f, j) - val(k0, f, j)) * q);
  }
  Skeleton.prototype.apply = function (anim, t) {
    const A = this.data.animations[anim]; if (!A) return;
    this.setup();
    for (const [bn, tl] of Object.entries(A.bones || {})) {
      const b = this.boneByName[bn]; if (!b) continue; const d = b.d;
      if (tl.rotate) b.rot = (d.rotation || 0) + sample(tl.rotate, t, ['value'], [0])[0];
      if (tl.translate) { const v = sample(tl.translate, t, ['x', 'y'], [0, 0]); b.x = (d.x || 0) + v[0]; b.y = (d.y || 0) + v[1]; }
      if (tl.scale) { const v = sample(tl.scale, t, ['x', 'y'], [1, 1]); b.sx = (d.scaleX == null ? 1 : d.scaleX) * v[0]; b.sy = (d.scaleY == null ? 1 : d.scaleY) * v[1]; }
      if (tl.shear) { const v = sample(tl.shear, t, ['x', 'y'], [0, 0]); b.shx = (d.shearX || 0) + v[0]; b.shy = (d.shearY || 0) + v[1]; }
    }
    for (const [sn, tl] of Object.entries(A.slots || {})) {
      const s = this.slotByName[sn]; if (!s) continue;
      if (tl.attachment) { let k = null; for (const kf of tl.attachment) if ((kf.time || 0) <= t) k = kf; if (k) s.att = k.name || null; }
      if (tl.rgba) { let i = 0; while (i < tl.rgba.length - 1 && (tl.rgba[i + 1].time || 0) <= t) i++; s.col = hex(tl.rgba[i].color); }
    }
  };
  Skeleton.prototype.duration = function (anim) {
    const A = this.data.animations[anim]; let m = 0; if (!A) return 0;
    const scan = (o) => { if (Array.isArray(o)) o.forEach((k) => { if (k && k.time > m) m = k.time; }); else if (o && typeof o === 'object') Object.values(o).forEach(scan); };
    scan(A); return m;
  };
  Skeleton.prototype.update = function () {
    for (const b of this.bones) {
      const ra = (b.rot + b.shx) * D2R, rb = (b.rot + 90 + b.shy) * D2R;
      const la = Math.cos(ra) * b.sx, lb = Math.cos(rb) * b.sy, lc = Math.sin(ra) * b.sx, ld = Math.sin(rb) * b.sy;
      const p = b.parent;
      if (!p) { b.a = la; b.b = lb; b.c = lc; b.dd = ld; b.wx = b.x; b.wy = b.y; continue; }
      b.a = p.a * la + p.b * lc; b.b = p.a * lb + p.b * ld; b.c = p.c * la + p.dd * lc; b.dd = p.c * lb + p.dd * ld;
      b.wx = p.a * b.x + p.b * b.y + p.wx; b.wy = p.c * b.x + p.dd * b.y + p.wy;
    }
  };
  // dibuja con el origen del esqueleto en (x,y) y la escala dada (Spine tiene el eje Y hacia arriba)
  Skeleton.prototype.draw = function (g, x, y, scale) {
    this.update();
    const m0 = g.getTransform();
    for (const s of this.order) {
      if (!s.att) continue;
      const at = (this.att[s.d.name] || {})[s.att]; if (!at || (at.type && at.type !== 'region')) continue;
      const im = this.images(at.path || at.name || s.att); if (!im) continue;
      const b = s.bone;
      g.save();
      g.globalAlpha = s.col[3];
      g.setTransform(m0);
      g.translate(x, y); g.scale(scale, -scale);
      g.transform(b.a, b.c, b.b, b.dd, b.wx, b.wy);
      g.translate(at.x || 0, at.y || 0); g.rotate((at.rotation || 0) * D2R); g.scale(at.scaleX == null ? 1 : at.scaleX, at.scaleY == null ? 1 : at.scaleY);
      const w = at.width || im.width, h = at.height || im.height;
      g.scale(1, -1);
      g.drawImage(im, -w / 2, -h / 2, w, h);
      g.restore();
    }
  };
  return { Skeleton };
})();
'use strict';
// Partes comunes del estilo 'nueva' (patio andaluz): interfaz de cerámica blanca con cenefa azul,
// fondo de patio con macetas y mapa por un pueblo blanco. Cada juego añade sus piezas en su skins.js.
const NUEVA = (function () {
  const COB = '#1f4fa8', COB_D = '#143472', TERR = '#c8643a', WHITE = '#fbf7ee';
  const N = {};
  N.theme = { accent: TERR, node: COB, hudText: COB_D, bar: TERR, ribbon: COB, panel: { top: '#fffdf6', bottom: '#f3ead8' }, mascot: '👵' };
  // panel de azulejos azules con cenefa
  function cenefa(g, x, y, w, h, s) { // fila de rombitos azules sobre blanco
    for (let i = 0; i * s < w; i++) { const cx = x + i * s + s / 2, cy = y + h / 2; g.beginPath(); g.moveTo(cx, cy - h * 0.38); g.lineTo(cx + s * 0.38, cy); g.lineTo(cx, cy + h * 0.38); g.lineTo(cx - s * 0.38, cy); g.closePath(); g.fillStyle = COB; g.fill(); g.beginPath(); g.arc(cx, cy, h * 0.1, 0, 7); g.fillStyle = '#ffd23f'; g.fill(); }
  }
  N.cenefa = cenefa;
  // ---- interfaz de cerámica
  N.panel = function (g, x, y, w, h, opt) {
    const r = opt.r || 24;
    E.rr(g, x + 3, y + 8, w, h, r); g.fillStyle = 'rgba(60,30,10,0.28)'; g.fill();
    E.rr(g, x, y, w, h, r); g.fillStyle = COB; g.fill();
    E.rr(g, x + 5, y + 5, w - 10, h - 10, r - 3); g.fillStyle = WHITE; g.fill();
    g.save(); E.rr(g, x + 5, y + 5, w - 10, h - 10, r - 3); g.clip();
    cenefa(g, x + 5, y + 5, w - 10, 18, 22); cenefa(g, x + 5, y + h - 23, w - 10, 18, 22);
    g.restore();
    E.rr(g, x + 12, y + 28, w - 24, h - 56, Math.max(6, r - 10));
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, (opt && opt.top) || '#fffdf6'); gr.addColorStop(1, (opt && opt.bottom) || '#f3ead8'); g.fillStyle = gr; g.fill();
  };
  N.button = function (g, x, y, w, h, color, down, r) {
    const oy = down ? 4 : 0;
    if (!down) { E.rr(g, x + 2, y + 9, w, h - 6, r); g.fillStyle = 'rgba(60,30,10,0.25)'; g.fill(); }
    E.rr(g, x, y + 5, w, h - 6, r); g.fillStyle = E.shade(color, -0.4); g.fill();
    E.rr(g, x, y + oy, w, h - 9, r); g.fillStyle = WHITE; g.fill();
    E.rr(g, x + 4, y + oy + 4, w - 8, h - 17, Math.max(3, r - 3));
    const gr = g.createRadialGradient(x + w * 0.35, y + oy + h * 0.2, 4, x + w / 2, y + oy + h / 2, Math.max(w, h) * 0.7);
    gr.addColorStop(0, E.shade(color, 0.35)); gr.addColorStop(1, E.shade(color, -0.1)); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(x + w * 0.3, y + oy + h * 0.22, Math.min(w * 0.2, 60), h * 0.08, -0.2, 0, 7); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
  };
  N.hud = function (g, W, H) {
    g.fillStyle = WHITE; g.fillRect(0, 0, W, H - 4);
    cenefa(g, 0, H - 26, W, 22, 26);
    g.fillStyle = COB; g.fillRect(0, H - 6, W, 6); g.fillRect(0, H - 30, W, 4);
    const box = (x, w) => { E.rr(g, x, 46, w, H - 82, 16); g.fillStyle = '#eef2fa'; g.fill(); g.lineWidth = 3; g.strokeStyle = COB; g.stroke(); };
    box(16, 312); box(W - 178, 162);
    const ax = W / 2 + 40, ay = H / 2 - 4;
    g.beginPath(); g.arc(ax, ay, 54, 0, 7); g.fillStyle = COB; g.fill();
    g.beginPath(); g.arc(ax, ay, 48, 0, 7); g.fillStyle = '#ffe9c4'; g.fill();
  };
  N.bar = function (g, y, W, H) {
    g.fillStyle = TERR; g.fillRect(0, y, W, H);
    g.strokeStyle = 'rgba(90,35,10,0.35)'; g.lineWidth = 3;
    for (let x = 0; x < W; x += 90) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + H); g.stroke(); }
    g.beginPath(); g.moveTo(0, y + H / 2); g.lineTo(W, y + H / 2); g.stroke();
    g.fillStyle = WHITE; g.fillRect(0, y, W, 8); g.fillStyle = COB; g.fillRect(0, y + 8, W, 3);
  };
  N.boosterIcon = function (g, b, x, y, w, h, have) {
    E.emoji(g, b.icon, x + w / 2, y + h / 2 - 2, w * 0.58);
    const tx = x + w - 14, ty = y + h - 12;
    g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fillStyle = WHITE; g.fill(); g.lineWidth = 3; g.strokeStyle = COB; g.stroke();
    E.text(g, have === Infinity ? '∞' : have > 0 ? String(have) : '+', tx, ty + 1, 22, have > 0 ? COB_D : '#2a8a2a', { stroke: false });
  };
  // ---- fondo: patio con arcos, macetas y suelo de barro
  N.playBg = function (g, w, h) {
    let gr = g.createLinearGradient(0, 0, 0, h * 0.3); gr.addColorStop(0, '#6fb8ec'); gr.addColorStop(1, '#bfe3fa');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // pared encalada con arcos
    g.fillStyle = '#fbf6ea'; g.fillRect(0, h * 0.18, w, h * 0.6);
    for (let i = 0; i < 3; i++) { const ax = w * (0.17 + i * 0.33); g.beginPath(); g.moveTo(ax - w * 0.12, h * 0.62); g.lineTo(ax - w * 0.12, h * 0.36); g.arc(ax, h * 0.36, w * 0.12, Math.PI, 0); g.lineTo(ax + w * 0.12, h * 0.62); g.closePath(); g.fillStyle = '#e8dcc4'; g.fill(); }
    g.fillStyle = TERR; g.fillRect(0, h * 0.16, w, h * 0.025);
    // macetas con geranios colgadas
    for (let i = 0; i < 6; i++) {
      const px = w * (0.08 + i * 0.17), py = h * (0.24 + (i % 2) * 0.05);
      g.beginPath(); g.moveTo(px - 18, py); g.lineTo(px + 18, py); g.lineTo(px + 13, py + 26); g.lineTo(px - 13, py + 26); g.closePath(); g.fillStyle = i % 2 ? COB : TERR; g.fill();
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(px - 14 + k * 7, py - 6 - (k % 2) * 6, 7, 0, 7); g.fillStyle = k % 2 ? '#e8322b' : '#ff5a7a'; g.fill(); }
      g.beginPath(); g.ellipse(px - 16, py - 2, 9, 4, -0.4, 0, 7); g.fillStyle = '#4fa83a'; g.fill();
    }
    // zócalo de azulejos
    g.fillStyle = WHITE; g.fillRect(0, h * 0.66, w, h * 0.08); cenefa(g, 0, h * 0.67, w, h * 0.06, h * 0.06);
    // suelo de barro
    gr = g.createLinearGradient(0, h * 0.74, 0, h); gr.addColorStop(0, '#d98a5a'); gr.addColorStop(1, '#a85a32');
    g.fillStyle = gr; g.fillRect(0, h * 0.74, w, h * 0.26);
    g.strokeStyle = 'rgba(110,50,20,0.35)'; g.lineWidth = 3;
    for (let y = h * 0.74; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let y = h * 0.74, k = 0; y < h; y += 40, k++) for (let x = (k % 2) * 40; x < w; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke(); }
  };
  // ---- mapa: camino de baldosas de barro por un pueblo blanco
  const ZONES = [['#bfe3fa', '#fbf6ea'], ['#ffe2b8', '#fff4e0'], ['#d4f0d0', '#f6fbf0'], ['#f6d4e4', '#fff2f8'], ['#d8d4f6', '#f4f2ff']];
  N.mapBg = function (g, top, zoneH) {
    const z0 = Math.floor(top / zoneH);
    for (let z = z0 - 1; z <= z0 + 1; z++) {
      const zy = -z * zoneH - zoneH + top + E.H, pal = ZONES[Math.max(0, z) % ZONES.length];
      const gr = g.createLinearGradient(0, zy, 0, zy + zoneH); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
      g.fillStyle = gr; g.fillRect(0, zy, E.W, zoneH + 1);
    }
    const step = 200, i0 = Math.floor(top / step) - 1;
    for (let i = i0; i <= i0 + Math.ceil(E.H / step) + 2; i++) {
      const y = -i * step + top + E.H - 100, left = ((i % 2) + 2) % 2 === 0, x = left ? 16 : E.W - 126;
      // casita blanca con tejado y ventana azul
      g.fillStyle = '#fffaf0'; g.fillRect(x, y + 30, 110, 80);
      g.beginPath(); g.moveTo(x - 8, y + 34); g.lineTo(x + 55, y); g.lineTo(x + 118, y + 34); g.closePath(); g.fillStyle = TERR; g.fill();
      E.rr(g, x + 40, y + 52, 30, 34, 14); g.fillStyle = COB; g.fill();
      g.fillStyle = '#e8322b'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + 36 + k * 13, y + 92, 6, 0, 7); g.fill(); }
      g.fillStyle = '#4fa83a'; g.fillRect(x + 32, y + 96, 46, 5);
    }
  };
  N.mapNoDecor = true;
  N.mapPath = function (g, a, b, pos) {
    for (let i = a; i < b; i++) {
      const p = pos(i), q = pos(i + 1);
      for (let k = 1; k < 6; k++) {
        const t = k / 6, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
        E.rr(g, x - 13, y - 9, 26, 18, 4); g.fillStyle = '#c8643a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#8e3f1f'; g.stroke();
      }
    }
  };
  N.mapNode = function (g, i, x, y, r, cur, done, hd, stars) {
    // plato de cerámica: blanco con borde azul (difíciles en rojo y morado)
    const rim = cur ? TERR : hd === 2 ? '#6a2f9a' : hd === 1 ? '#d8352f' : done ? COB : '#8a96a3';
    g.beginPath(); g.ellipse(x + 2, y + r * 0.2 + 4, r, r * 0.95, 0, 0, 7); g.fillStyle = 'rgba(60,30,10,0.25)'; g.fill();
    if (cur) { g.beginPath(); g.arc(x, y, r + 9 + Math.sin(E.t * 4) * 3, 0, 7); g.fillStyle = 'rgba(255,210,63,0.45)'; g.fill(); }
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = rim; g.fill();
    g.beginPath(); g.arc(x, y, r - 6, 0, 7); g.fillStyle = WHITE; g.fill();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10), 3, 0, 7); g.fillStyle = rim; g.fill(); }
    E.text(g, String(i), x, y + 1, i > 999 ? 22 : 27, rim, { stroke: false, weight: '900' });
    if (hd && !done) { E.emoji(g, '💀', x + r * 0.8, y - r * 0.8, 28); if (hd === 2) E.emoji(g, '💀', x - r * 0.8, y - r * 0.8, 28); }
    if (done) for (let s = 0; s < 3; s++) E.star(g, x + (s - 1) * 22, y - r - 4 + (s === 1 ? -6 : 0), 11, s < stars ? '#ffd23f' : '#c9ced6', '#8a5a00');
    if (cur) E.emoji(g, GAME.theme.mascot, x - r - 28, y - 6, 56);
  };
  N.mapHeader = function (g, W, H) {
    g.fillStyle = COB; g.fillRect(0, 0, W, H);
    g.fillStyle = WHITE; g.fillRect(0, H - 14, W, 14); cenefa(g, 0, H - 14, W, 14, 18);
  };
  N.emoji = {
    '👵': (g, w, h) => { // la abuela: cara sonriente con moño y gafas
      const cx = w / 2, cy = h * 0.55, r = w * 0.32;
      g.beginPath(); g.arc(cx, cy - r * 0.95, r * 0.42, 0, 7); g.fillStyle = '#e8e4ec'; g.fill();
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = '#ffd9b8'; g.fill();
      g.beginPath(); g.arc(cx, cy - r * 0.2, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = r * 0.35; g.strokeStyle = '#e8e4ec'; g.stroke();
      g.lineWidth = r * 0.08; g.strokeStyle = '#7a4a2a';
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * r * 0.38, cy + r * 0.05, r * 0.24, 0, 7); g.stroke(); }
      g.beginPath(); g.moveTo(cx - r * 0.14, cy + r * 0.05); g.lineTo(cx + r * 0.14, cy + r * 0.05); g.stroke();
      g.fillStyle = '#3a2a1a'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * r * 0.38, cy + r * 0.05, r * 0.07, 0, 7); g.fill(); }
      g.beginPath(); g.arc(cx, cy + r * 0.38, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = r * 0.09; g.strokeStyle = '#b5523a'; g.stroke();
      g.fillStyle = 'rgba(255,120,120,0.35)'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * r * 0.62, cy + r * 0.38, r * 0.16, 0, 7); g.fill(); }
    },
  };
  return N;
})();

// Mapa genérico para un estilo: franjas de fondo por mundo, camino de baldosas, nodos redondos y adornos.
// o = { zones: [[arriba, abajo], ...], path: [relleno, borde], node: color hecho, cur: color actual, rim: borde,
//       header: [arriba, abajo], line: color de la raya de la cabecera, decor(g, x, y, i) dibuja un adorno }
function SKIN_MAPA(o) {
  const M = {};
  M.mapNoDecor = true;
  M.mapBg = function (g, top, zoneH) {
    const z0 = Math.floor(top / zoneH);
    for (let z = z0 - 1; z <= z0 + 1; z++) {
      const zy = -z * zoneH - zoneH + top + E.H, pal = o.zones[Math.max(0, z) % o.zones.length];
      const gr = g.createLinearGradient(0, zy, 0, zy + zoneH); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
      g.fillStyle = gr; g.fillRect(0, zy, E.W, zoneH + 1);
    }
    if (o.decor) {
      const step = 170, i0 = Math.floor(top / step) - 1;
      for (let i = i0; i <= i0 + Math.ceil(E.H / step) + 2; i++) {
        const y = -i * step + top + E.H - 80, left = ((i % 2) + 2) % 2 === 0;
        o.decor(g, left ? 70 : E.W - 70, y, i);
      }
    }
  };
  M.mapPath = function (g, a, b, pos) {
    for (let i = a; i < b; i++) {
      const p = pos(i), q = pos(i + 1);
      for (let k = 1; k < 5; k++) {
        const t = k / 5, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
        g.beginPath(); g.ellipse(x, y, 12, 8, 0, 0, 7); g.fillStyle = o.path[0]; g.fill(); g.lineWidth = 2.5; g.strokeStyle = o.path[1]; g.stroke();
      }
    }
  };
  M.mapNode = function (g, i, x, y, r, cur, done, hd, stars) {
    const base = cur ? o.cur : hd === 2 ? '#6a2f9a' : hd === 1 ? '#d8352f' : done ? o.node : '#8a96a3';
    g.beginPath(); g.ellipse(x + 2, y + r * 0.8, r * 0.95, r * 0.3, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    if (cur) { g.beginPath(); g.arc(x, y, r + 10 + Math.sin(E.t * 4) * 3, 0, 7); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill(); }
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = o.rim; g.fill();
    g.beginPath(); g.arc(x, y, r - 5, 0, 7);
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, E.shade(base, 0.4)); gr.addColorStop(1, E.shade(base, -0.15)); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.45, r * 0.32, r * 0.14, -0.4, 0, 7); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    E.text(g, String(i), x, y + 1, i > 999 ? 22 : 27, '#fff', { stroke: E.shade(base, -0.55), sw: 5 });
    if (hd && !done) { E.emoji(g, '💀', x + r * 0.8, y - r * 0.8, 28); if (hd === 2) E.emoji(g, '💀', x - r * 0.8, y - r * 0.8, 28); }
    if (done) for (let s = 0; s < 3; s++) E.star(g, x + (s - 1) * 22, y - r - 4 + (s === 1 ? -6 : 0), 11, s < stars ? '#ffd23f' : '#c9ced6', '#8a5a00');
    if (cur) E.emoji(g, GAME.theme.mascot, x - r - 26, y - 6, 54);
  };
  M.mapHeader = function (g, W, H) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, o.header[0]); gr.addColorStop(1, o.header[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = o.line; g.fillRect(0, H - 5, W, 5);
  };
  return M;
}
'use strict';
// Estilos gráficos de Dulces. Todo dibujado con el canvas (sin imágenes del juego original).
// 'original': imita Candy Crush Saga (caramelos brillantes, tablero azul translúcido, paisaje de golosinas).
GAME.skins = {};

(function () {
  const O = (GAME.skins.original = {});
  O.theme = { accent: '#e8459a', ribbon: '#2f6fd1', hudText: '#2a3f8a', panel: { top: '#eaf6ff', bottom: '#c9e6ff' }, bar: '#2f4fa8' };
  const shine = (g, x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, rx, ry, a == null ? -0.6 : a, 0, 7); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(); };
  // silueta de cada caramelo: gominola roja, pastilla naranja, gota de limón, cuadrado verde, bola azul y flor morada
  function shape(g, color, w, h) {
    const cx = w / 2, cy = h / 2;
    g.beginPath();
    switch (color) {
      case 0: // gominola (judía) inclinada
        g.save(); g.translate(cx, cy); g.rotate(-0.55);
        g.moveTo(-w * 0.4, 0); g.bezierCurveTo(-w * 0.42, -h * 0.26, -w * 0.05, -h * 0.3, w * 0.05, -h * 0.12); g.bezierCurveTo(w * 0.15, h * 0.02, w * 0.42, -h * 0.2, w * 0.42, h * 0.04);
        g.bezierCurveTo(w * 0.42, h * 0.3, -w * 0.38, h * 0.32, -w * 0.4, 0); g.restore(); break;
      case 1: g.ellipse(cx, cy, w * 0.41, h * 0.33, 0, 0, 7); break; // pastilla naranja
      case 2: // gota de limón
        g.moveTo(cx, cy - h * 0.43); g.bezierCurveTo(cx + w * 0.22, cy - h * 0.18, cx + w * 0.4, cy + h * 0.05, cx + w * 0.34, cy + h * 0.24);
        g.bezierCurveTo(cx + w * 0.25, cy + h * 0.44, cx - w * 0.25, cy + h * 0.44, cx - w * 0.34, cy + h * 0.24); g.bezierCurveTo(cx - w * 0.4, cy + h * 0.05, cx - w * 0.22, cy - h * 0.18, cx, cy - h * 0.43); break;
      case 3: E.rr(g, w * 0.12, h * 0.14, w * 0.76, h * 0.72, w * 0.2); break; // cuadrado blandito
      case 4: g.arc(cx, cy, w * 0.39, 0, 7); break; // bola
      default: // flor de seis bultos
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.moveTo(cx + Math.cos(a) * w * 0.22 + w * 0.2, cy + Math.sin(a) * h * 0.22); g.arc(cx + Math.cos(a) * w * 0.22, cy + Math.sin(a) * h * 0.22, w * 0.2, 0, 7); }
        g.moveTo(cx + w * 0.22, cy); g.arc(cx, cy, w * 0.22, 0, 7);
    }
  }
  const BASE = ['#f2242f', '#ff8a12', '#ffd21a', '#2fc02a', '#1f86f0', '#a13ae0'];
  function candy(g, w, h, color, sp) {
    const base = BASE[color];
    // sombra suave
    g.save(); g.translate(0, h * 0.04); shape(g, color, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill('nonzero'); g.restore();
    shape(g, color, w, h);
    const gr = g.createRadialGradient(w * 0.38, h * 0.32, w * 0.04, w / 2, h / 2, w * 0.48);
    gr.addColorStop(0, E.shade(base, 0.6)); gr.addColorStop(0.45, base); gr.addColorStop(1, E.shade(base, -0.45));
    g.fillStyle = gr; g.fill('nonzero');
    if (sp === 'h' || sp === 'v') { // rayas blancas
      g.save(); shape(g, color, w, h); g.clip('nonzero');
      g.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = -3; i <= 3; i++) { if (sp === 'h') g.fillRect(0, h / 2 + i * h * 0.15 - h * 0.04, w, h * 0.08); else g.fillRect(w / 2 + i * w * 0.15 - w * 0.04, 0, w * 0.08, h); }
      g.restore();
    }
    // brillos
    if (color === 4) { shine(g, w * 0.36, h * 0.3, w * 0.12, h * 0.07); g.beginPath(); g.arc(w * 0.5, h * 0.5, w * 0.39, 0.2, 1.3); g.lineWidth = w * 0.03; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke(); }
    else if (color === 0) shine(g, w * 0.36, h * 0.38, w * 0.14, h * 0.05, -0.55);
    else if (color === 3) { E.rr(g, w * 0.2, h * 0.2, w * 0.35, h * 0.1, h * 0.05); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }
    else shine(g, w * 0.38, h * 0.3, w * 0.11, h * 0.06);
  }
  function wrapped(g, w, h, color) {
    const base = BASE[color];
    // envoltorio de celofán con los extremos retorcidos
    for (const sg of [-1, 1]) {
      g.beginPath(); const x0 = w / 2 + sg * w * 0.28;
      g.moveTo(x0, h * 0.42); g.lineTo(w / 2 + sg * w * 0.48, h * 0.2); g.lineTo(w / 2 + sg * w * 0.44, h / 2); g.lineTo(w / 2 + sg * w * 0.48, h * 0.8); g.lineTo(x0, h * 0.58); g.closePath();
      g.fillStyle = E.shade(base, 0.25); g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = E.shade(base, -0.4); g.stroke();
    }
    E.rr(g, w * 0.2, h * 0.2, w * 0.6, h * 0.6, w * 0.16);
    const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.04, w / 2, h / 2, w * 0.4); gr.addColorStop(0, E.shade(base, 0.6)); gr.addColorStop(1, E.shade(base, -0.3));
    g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.025; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
    g.save(); E.rr(g, w * 0.2, h * 0.2, w * 0.6, h * 0.6, w * 0.16); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = w * 0.05;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(w * 0.2 + i * w * 0.18, h * 0.8); g.lineTo(w * 0.5 + i * w * 0.18, h * 0.2); g.stroke(); }
    g.restore();
    shine(g, w * 0.36, h * 0.3, w * 0.1, h * 0.05);
  }
  function colorBomb(g, w, h) {
    const cx = w / 2, cy = h / 2, r = w * 0.4;
    g.beginPath(); g.arc(cx, cy + h * 0.03, r, 0, 7); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
    g.beginPath(); g.arc(cx, cy, r, 0, 7);
    const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r); gr.addColorStop(0, '#9a5a32'); gr.addColorStop(0.6, '#5a2e14'); gr.addColorStop(1, '#2a1206');
    g.fillStyle = gr; g.fill();
    const rr = E.rng(7);
    for (let i = 0; i < 34; i++) {
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.85;
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * 0.035, 0, 7); g.fillStyle = BASE[i % 6]; g.fill();
    }
    shine(g, cx - r * 0.4, cy - r * 0.45, r * 0.22, r * 0.1);
  }
  O.tile = function (t, ts) {
    if (t.kind === 'candy') {
      if (t.sp === 'w') return E.sprite('wr' + t.color, ts, ts, (g, w, h) => wrapped(g, w, h, t.color));
      if (t.sp === 'f') return null; // el pez de gominola sigue con su dibujo
      return E.sprite('cd' + t.color + (t.sp || ''), ts, ts, (g, w, h) => candy(g, w, h, t.color, t.sp));
    }
    if (t.kind === 'bomb') return E.sprite('cbomb', ts, ts, colorBomb);
    return null;
  };
  // tablero azul translúcido con casillas alternas, borde blanco suave
  O.board = function (g, S, bx, by, ts, inB) {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(r, c)) { E.rr(g, bx + c * ts - 5, by + r * ts - 5, ts + 10, ts + 10, 12); g.fill(); }
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(r, c)) {
      g.fillStyle = (r + c) % 2 ? 'rgba(52,86,170,0.82)' : 'rgba(70,108,196,0.82)';
      g.fillRect(bx + c * ts - 0.5, by + r * ts - 0.5, ts + 1, ts + 1);
    }
  };
  // fondo: colinas de golosinas bajo un cielo claro
  O.playBg = function (g, w, h) {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fd3ff'); gr.addColorStop(0.55, '#ffd9f0'); gr.addColorStop(1, '#ffb3d9');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, s] of [[0.15, 0.08, 1], [0.7, 0.12, 1.3], [0.45, 0.04, 0.8]]) { for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [58, 0, 24]]) { g.beginPath(); g.arc(w * x + dx * s, h * y + dy * s, r * s, 0, 7); g.fill(); } }
    const hill = (y0, col, amp, ph) => { g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 10) g.lineTo(x, h * y0 + Math.sin(x / w * 6 + ph) * amp); g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill(); };
    hill(0.62, '#ff9fd0', 24, 0); hill(0.72, '#ffc2e2', 30, 2); hill(0.84, '#a4e88a', 20, 4);
    // piruletas
    for (const [x, y, c] of [[0.08, 0.6, '#ff5a7a'], [0.92, 0.62, '#5ab0ff'], [0.5, 0.66, '#ffd23f']]) {
      g.fillStyle = '#fff'; g.fillRect(w * x - 4, h * y, 8, h * 0.12);
      g.beginPath(); g.arc(w * x, h * y, 30, 0, 7); g.fillStyle = c; g.fill();
      g.beginPath(); g.arc(w * x, h * y, 18, 0, 5); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
    }
  };
  O.panel = function (g, x, y, w, h, opt) {
    const r = opt.r || 26;
    E.rr(g, x + 2, y + 8, w, h, r); g.fillStyle = 'rgba(0,0,40,0.3)'; g.fill();
    E.rr(g, x, y, w, h, r); let gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#6fb6ff'); gr.addColorStop(1, '#2f5fc8'); g.fillStyle = gr; g.fill();
    E.rr(g, x + 3, y + 3, w - 6, h - 6, r - 2); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke();
    E.rr(g, x + 14, y + 14, w - 28, h - 28, Math.max(8, r - 10));
    gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, (opt && opt.top) || '#eaf6ff'); gr.addColorStop(1, (opt && opt.bottom) || '#c9e6ff'); g.fillStyle = gr; g.fill();
  };
  O.button = function (g, x, y, w, h, color, down, r) {
    const oy = down ? 4 : 0;
    if (!down) { E.rr(g, x, y + 9, w, h - 6, r); g.fillStyle = 'rgba(0,0,40,0.3)'; g.fill(); }
    E.rr(g, x - 2, y + oy - 2, w + 4, h - 3, r + 2); g.fillStyle = '#fff'; g.fill();
    E.rr(g, x + 1, y + oy + 1, w - 2, h - 10, r);
    const gr = g.createLinearGradient(0, y + oy, 0, y + oy + h - 9); gr.addColorStop(0, E.shade(color, 0.4)); gr.addColorStop(0.5, color); gr.addColorStop(1, E.shade(color, -0.25));
    g.fillStyle = gr; g.fill();
    E.rr(g, x + w * 0.08, y + oy + 5, w * 0.84, (h - 9) * 0.3, Math.max(4, r * 0.6)); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
  };
  O.hud = function (g, W, H) {
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4f8fe8'); gr.addColorStop(1, '#2a56b8');
    E.rr(g, 6, -20, W - 12, H + 12, 28); g.fillStyle = gr; g.fill();
    E.rr(g, 9, -17, W - 18, H + 6, 26); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
    const box = (x, w) => { E.rr(g, x, 46, w, H - 62, 18); g.fillStyle = 'rgba(255,255,255,0.92)'; g.fill(); };
    box(18, 308); box(W - 176, 158);
    const ax = W / 2 + 40, ay = H / 2 - 4;
    g.beginPath(); g.arc(ax, ay, 52, 0, 7); g.fillStyle = '#ffe9f4'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
  };
  O.bar = function (g, y, W, H) {
    const gr = g.createLinearGradient(0, y, 0, y + H); gr.addColorStop(0, '#4f8fe8'); gr.addColorStop(1, '#1f3f98');
    g.fillStyle = gr; g.fillRect(0, y, W, H); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, y, W, 3);
  };
  O.boosterIcon = function (g, b, x, y, w, h, have) {
    E.emoji(g, b.icon, x + w / 2, y + h / 2 - 2, w * 0.6);
    const tx = x + w - 15, ty = y + h - 13;
    g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fillStyle = have ? '#ff3a7a' : '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    E.text(g, have === Infinity ? '∞' : have > 0 ? String(have) : '+', tx, ty + 1, 21, '#fff', { stroke: false });
  };
  O.emoji = {
    '〰️': (g, w, h) => candy(g, w, h, 4, 'h'),
    '🍬': (g, w, h) => wrapped(g, w, h, 5),
    '🌈': colorBomb,
  };
  // mapa: tierra de golosinas con camino de caramelo
  Object.assign(O, SKIN_MAPA({
    zones: [['#9be37b', '#5fbf4a'], ['#ffd0e8', '#ff9ccf'], ['#bfe6ff', '#7cc0f5'], ['#fff1b8', '#f2c75a'], ['#e3ccff', '#b088ec']],
    path: ['#ffffff', '#ff7ab8'], node: '#2f6fd1', cur: '#e8459a', rim: '#ffffff', header: ['#4f8fe8', '#2a56b8'], line: '#ffffff',
    decor(g, x, y, i) { // piruleta o magdalena
      if (i % 2) { g.fillStyle = '#fff'; g.fillRect(x - 4, y, 8, 60); g.beginPath(); g.arc(x, y, 32, 0, 7); g.fillStyle = ['#ff5a7a', '#5ab0ff', '#ffd23f'][((i % 3) + 3) % 3]; g.fill(); g.beginPath(); g.arc(x, y, 20, 0, 5); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke(); }
      else E.emoji(g, ['🧁', '🍭', '🍩', '🍫'][((i % 4) + 4) % 4], x, y + 20, 64);
    },
  }));
})();

// ================================================================ 'real' (en Ajustes: "Original")
// Imágenes de Candy Crush que solo están en la tablet (privado/, dentro del APK; nunca se publican).
(function () {
  const O = GAME.skins.original;
  const N = [];
  for (let i = 0; i < 6; i++) N.push('c' + i, 'c' + i + 'h', 'c' + i + 'v');
  for (let k = 1; k <= 5; k++) N.push('ice' + k, 'waffle' + k, 'slock' + k);
  N.push('cbomb', 'choc', 'lock', 'key', 'cherry', 'jelly', 'mixer', 'myst', 'coco', 'ufo', 'twist');
  for (let i = 0; i < 6; i++) N.push('c' + i + 'w', 'fish' + i);
  for (let k = 1; k <= 5; k++) N.push('skull' + k);
  for (let k = 1; k <= 5; k++) N.push('gum' + k);
  N.push('marm_front', 'marm_back', 'licsw');
  const fit = (name, k) => (g, w, h) => {
    const im = E.img(name); if (!im) return;
    const s = Math.min((w * k) / im.width, (h * k) / im.height);
    g.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s);
  };
  const spr = (n, ts, k) => E.sprite('img' + n, ts, ts, fit(n, k));
  const Rl = (GAME.skins.real = Object.assign({}, O, { images: N, emoji: Object.assign({}, O.emoji) }));
  Rl.scripts = ['fx.js', 'mapa.js'];
  Rl.font = 'font.otf';
  Rl.scripts = Rl.scripts.concat(['cut.js', 'anim.js', 'tiffi.js']);
  Rl.popupKanim = true;
  // tiempos medidos grabando el Candy Crush real a 60 fps (ver analisis/candycrush_motor.md):
  // intercambio 8 fotogramas, la que avanza pasa delante un 8 % más grande; al combinar se ilumina,
  // encoge al 30 % en ~0,15 s y estalla; la caída acelera a 53,4 casillas/s² desde parada
  Rl.timing = { swap: 0.133, swapFront: 1.08, remove: 0.15, shrink: true, gravity: 53.4, maxFall: 24 };
  // el envuelto "respira" como en Candy Crush (wrapped_idle_candy: 63 fotogramas a 40 por segundo)
  Rl.tileAnim = (t) => {
    if (t.kind !== 'candy' || t.sp !== 'w') return null;
    const a = E.kanim('wrapped_idle_candy', (E.t + (t.id % 7) * 0.13) % (63 / 40), true);
    return a && { sx: a.sx, sy: a.sy, ty: -a.ty };
  };
  const CN = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  // efectos con nombre del juego original al empezar cada efecto del tablero (tools/dulces_fx.py): los de alta gama
  // de Candy Crush, de dos tiempos en el envuelto ("first" y "second") y propios de cada combinación
  Rl.fxStart = (f, x, y, ts, pos) => {
    const u = ts / 80, cn = CN[f.color] || 'blue', K = (n, xx, yy, k) => E.kfx(n, xx == null ? x : xx, yy == null ? y : yy, u * (k || 1));
    if (f.type === 'line') { const ok = E.kcut('line_' + f.dir + (f.color != null ? f.color : 4), x, y, u); K('lineblast_particles_revamp'); return ok; }
    if (f.type === 'zap') {
      if (f.fish) { // el pez: estela hasta su casilla y chapuzón del color
        const [tx, ty] = pos(f.targets[0][0], f.targets[0][1]);
        for (let i = 0; i <= 8; i++) E.after(i * 0.06, () => K('vfx_fish_swim_travel', x + ((tx - x) * i) / 8, y + ((ty - y) * i) / 8));
        E.after(0.5, () => K('vfx_fish_swim_' + cn + '_destroy', tx, ty));
        return true;
      }
      // bomba de color: se carga, cada caramelo alcanzado recibe su chispazo (el de rayado, envuelto o pez si se
      // convierten) y al final estalla
      K('vfx_colorbomb_charge'); K('SwitcherExplodeColorBomb');
      const hit = 'vfx_colorbomb_target_hit' + (f.hit ? '_' + f.hit : '');
      f.targets.forEach(([r, c], i) => { const [tx, ty] = pos(r, c); E.after(0.08 + i * 0.012, () => K(hit, tx, ty)); });
      E.after(0.45 + f.targets.length * 0.02, () => K('vfx_colorbomb_explosion'));
      return true;
    }
    if (f.type === 'ufo') { f.targets.forEach(([r, c], i) => { const [tx, ty] = pos(r, c); E.after(0.45 + i * 0.12, () => { K('UfoBlast', tx, ty); E.sfx('ufoShot'); }); }); E.sfx('ufoUp'); return true; }
    if (f.type === 'roll') { E.sfx('cocoRoll'); for (let k = 1; k <= f.n; k++) { const [tx, ty] = pos(f.r + f.dr * k, f.c + f.dc * k); E.after(0.2 * k, () => K('CoconutWheelExplode', tx, ty)); } return true; }
    if (f.type === 'boom') {
      if (f.combo === 'cake') { const [cx2, cy2] = pos(f.r + 0.5, f.c + 0.5); K('SwitcherClearCakeBombPlate', cx2, cy2, 1.5); E.after(0.15, () => K('effect_color_bomb_combo_nuke', cx2, cy2, 1.6)); E.sfx('bomb'); E.shake(0.6); return true; }
      if (f.combo === 'bb') { K('effect_color_bomb_combo_nuke_first_hit'); E.after(0.2, () => K('effect_color_bomb_combo_nuke', null, null, 1.6)); return true; }
      if (f.combo === 'ww') { K('vfx_wrapped_candy_combo_explosion_revamp_first'); E.after(0.25, () => K('vfx_wrapped_candy_combo_explosion_revamp_second')); return true; }
      if (f.combo === 'sw') { K('vfx_line_wrapped_candy_combo_explosion_01'); K('vfx_line_wrapped_candy_combo_horizontal_01'); return true; }
      K('vfx_wrapped_candy_revamp_first_' + cn); E.after(0.18, () => K('vfx_wrapped_candy_revamp_second_' + cn));
      return true;
    }
    return false;
  };
  // exclamaciones: tres capas de texto con los colores de Candy Crush y su línea de tiempo (t_exclamation_*)
  const EXC = {
    2: { t: '¡Dulce!', l: [['#461700', 10], ['#702501', 7]], top: ['#ffd053', '#e09421', '#fbeba4'] },
    3: { t: '¡Sabroso!', l: [['#c36f46', 10], ['#ba5828', 7]], top: ['#fff1cd', '#d88405', '#fbeba4'] },
    4: { t: '¡Delicioso!', l: [['#5a1a6a', 10], ['#8a2a9a', 7]], top: ['#ffffff', '#ff9ad8', '#faeaa2'] },
    5: { t: '¡Divino!', l: [['#0a3a7a', 10], ['#1a5aba', 7]], top: ['#ffffff', '#8ad8ff', '#faeaa2'] },
    9: { t: '¡Sugar Crush!', l: [['#5a0a3a', 12], ['#a01a6a', 8]], top: ['#ffffff', '#ff6ab8', '#ffe0f0'] },
  };
  const lerpKeys = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return va + (vb - va) * (t - a) / (b - a); } return keys[keys.length - 1][1]; };
  const SCALE = [[0, 0.8], [0.333, 0.8], [0.533, 1.1], [1.133, 0.98], [1.25, 1]];
  const MOVE = [[0, 50], [1.333, 7], [1.983, -56]];
  const excCache = {};
  const excImg = (word, e) => {
    if (excCache[word]) return excCache[word];
    const size = 78, c = document.createElement('canvas'), g0 = c.getContext('2d');
    g0.font = E.font(size); const w = g0.measureText(e.t).width + 80, h = size * 1.9;
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2);
    g.font = E.font(size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (const [col, o] of e.l) { g.lineWidth = o * 2.2; g.strokeStyle = col; g.strokeText(e.t, 0, 0); g.fillStyle = col; g.fillText(e.t, 0, 0); }
    const gr = g.createLinearGradient(0, -size * 0.45, 0, size * 0.45); gr.addColorStop(0, e.top[0]); gr.addColorStop(1, e.top[1]);
    g.lineWidth = 3; g.strokeStyle = e.top[2]; g.strokeText(e.t, 0, 0); g.fillStyle = gr; g.fillText(e.t, 0, 0);
    if (document.fonts && !document.fonts.check(E.font(size))) return c; // sin la fuente aún: no se guarda
    return (excCache[word] = c);
  };
  Rl.exclaim = (g, word, x, y, t) => {
    const e = EXC[word]; if (!e) return true;
    if (t > 1.4) return true; // más breve: no se queda tapando el juego
    const sc = lerpKeys(SCALE, t) * 1.0, dy = (50 - lerpKeys(MOVE, t)) * 1.2;
    const a = t < 0.25 ? t / 0.25 : t > 1.1 ? Math.max(0, 1 - (t - 1.1) / 0.3) : 1;
    // el letrero se dibuja una vez en una imagen (sus contornos gruesos de texto en cada fotograma daban tirones en la tablet)
    const im = excImg(word, e); if (!im) return true;
    g.save(); g.globalAlpha = a; g.translate(x, y + dy * 0.4); g.scale(sc * 0.7, sc * 0.7); // más pequeña y casi sin desplazarse
    g.drawImage(im, -im.width / 2, -im.height / 2);
    g.restore();
    return false;
  };
  // sonidos, voces y música de Candy Crush
  const v = (n, k) => Array.from({ length: k }, (_, i) => n + (i + 1));
  Rl.sfx = {
    swap: v('candy_switch_', 3), bad: ['candy_switch_fail'], land: v('candy_land_', 4),
    pop: (p) => ['candy_match_' + Math.max(1, Math.min(5, Math.round((p - 1) / 0.12) + 1))],
    special: v('candy_special_create_a', 3), rocket: v('lineblast_', 3), bomb: ['general_explosion_rustlingpaper_1', 'general_explosion_rustlingpaper_2'],
    magic: v('colorbomb_target_hit_', 4), collect: v('general_impact_paper_soft_', 4), star: ['reward_star'], rescue: ['collect_ingredient_start'],
    win: ['music_stinger_jingle_win'], lose: ['music_stinger_jingle_lose'], click: ['button_press'], shuffle: ['shuffling_in'],
    vo2: ['sweet'], vo3: ['tasty'], vo4: ['delicious'], vo5: ['divine'], sugarcrush: ['sugar_crush'],
  };  Object.assign(Rl.sfx, { popIn: ['inventory_popup_in'], popOut: ['inventory_popup_out'] }); // ventanas de Candy Crush
  Object.assign(Rl.sfx, { celebrate: ['celebration'], confetti: ['els_confetti'], cbCharge: ['colorbomb_charge'], cbEnd: ['colorbomb_end'], cbMade: ['colour_bomb_created'], barStar1: ['progress_bar_revamp_star_1'], barStar2: ['progress_bar_revamp_star_2'], barStar3: ['progress_bar_revamp_star_3'], fishMade: ['swimming_fish_enter'], fishSwim: ['swimming_fish_loop'], hammerCharge: ['booster_lollypophammer_charge'], cocoRoll: ['coconut_wheel_activate'], ufoUp: ['ufo_lift_off'], ufoShot: ['ufo_lazer'], hammerHit: ['booster_lollypophammer_impact'], brushUse: ['striped_brush_activate'], handUse: ['booster_freeswitch_use'], fishHit: ['swimming_fish_hit_1', 'swimming_fish_hit_2', 'swimming_fish_hit_3', 'swimming_fish_hit_4', 'swimming_fish_hit_5'] }); // final, bomba de color y estrellas de la barra (WebGL)

  Rl.music = { game: 'music_gameplay_swimming_with_the_fishes', map: 'music_menumap_lollipop_meadow_road_trip' };
  // interfaz con las piezas originales de Candy Crush (muchas son blancas o rosas y el juego las tiñe)
  Rl.images = Rl.images.concat(['ui_goals_panel', 'ui_moves_tab', 'ui_booster_amount_panel', 'ui_bar_bg', 'ui_booster_button_blue', 'ui_booster_lollipop', 'ui_booster_strippedbrush',
    'ui_booster_colorbomb', 'ui_booster_freeswitch', 'ui_booster_shuffle', 'ui_settings_button_menu', 'ui_btn_pink', 'ui_btn_green', 'ui_btn_blue', 'ui_btn_purple', 'ui_btn_red',
    'ui_pnl_pink_base', 'ui_popup_standard_frame', 'ui_cell'], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => 'bg' + i + '.jpg'));
  Rl.theme = Object.assign({}, O.theme, { accent: '#e8459a', ribbon: '#c2387e', hudText: '#7a2a6a', hudLabel: '#ffffff', movesColor: '#ffffff', movesStroke: '#5a1f7a', pauseColor: '#ff5fa8', popText: '#ffffff' });
  const world = (n) => (Math.floor(((n || 1) - 1) / 20) % 10) + 1;
  Rl.bgKey = (n) => 'w' + world(n);
  Rl.bgImage = (n) => E.img('bg' + world(n) + '.jpg'); // para el fondo WebGL (Dulces HD)
  Rl.playBg = (g, w, h) => { // fondo difuminado del mundo, cubriendo la pantalla
    const im = E.img('bg' + world(E.play.n) + '.jpg'); if (!im) return O.playBg(g, w, h);
    const s = Math.max(w / im.width, h / im.height); g.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s);
  };
  Rl.board = (g, S, bx, by, ts, inB) => {
    const cell = E.img('ui_cell');
    g.save(); g.globalAlpha = 0.88;
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(r, c)) { if (cell) g.drawImage(cell, bx + c * ts - 0.5, by + r * ts - 0.5, ts + 1, ts + 1); else { g.fillStyle = 'rgba(40,70,130,0.8)'; g.fillRect(bx + c * ts, by + r * ts, ts, ts); } }
    g.restore();
  };
  Rl.hud = (g, W, H) => {
    E.nine(g, E.tinted('ui_pnl_pink_base', '#8a3fc0'), 4, -30, W - 8, H + 22, 40, 30);
    g.save(); g.globalAlpha = 0.18; g.strokeStyle = '#ffffff'; g.lineWidth = 14;
    g.beginPath(); for (let x = -H; x < W; x += 46) { g.moveTo(x, H); g.lineTo(x + H, 0); } g.stroke(); g.restore();
    const box = (x, w) => E.nine(g, E.tinted('ui_goals_panel', '#5a1f7a'), x, 46, w, H - 62, 30, 22);
    box(16, 312); box(W - 178, 162);
    const ax = W / 2 + 40, ay = H / 2 - 4, im = E.img('ui_booster_amount_panel');
    if (im) g.drawImage(im, ax - 56, ay - 56, 112, 112);
  };
  // cabecera como la de Candy Crush: franja morada con rayas, movimientos grandes, barra de estrellas,
  // caja oscura con los objetivos y el retrato a la derecha
  // Tiffi animada (esqueleto Spine del juego): parada, contenta con los combos, baila al ganar y se pone triste al perder
  let tiffi = null, tAnim = 'idle_main', tT = 0, tLast = 0, tNext = null;
  Rl.tiffiMood = (m) => { tNext = m; };
  function tiffiDraw(g, x, y, sc) {
    if (!window.SPINE_TIFFI || typeof SpineLite === 'undefined') return false;
    if (!tiffi) tiffi = new SpineLite.Skeleton(window.SPINE_TIFFI, 'Tiffi_Regular', (n) => E.imgL('tiffi/' + n.split('/').pop()));
    const now = E.t, dt = Math.min(0.1, now - tLast); tLast = now; tT += dt;
    const dur = tiffi.duration(tAnim) || 1;
    if (tNext) { tAnim = tNext; tNext = null; tT = 0; }
    else if (tT > dur) { tT = 0; if (!/loop/.test(tAnim)) tAnim = ['idle_main', 'idle_main', 'idle', 'idle02', 'idle03'][(Math.random() * 5) | 0]; }
    tiffi.apply(tAnim, tT);
    tiffi.draw(g, x, y + 56, sc);
    return true;
  }
  Rl.hudAll = (g, W, H, h) => {
    const P = h.P;
    // paleta: rosa en los niveles normales y morada en los difíciles (como Candy Crush)
    const hard = E.isHard(h.n);
    const C = hard ? { panel: '#8b3bc4', text: '#4a1670', label: '#f3d6ff', moves: '#ffffff', goal: '#3a1250', goalText: '#2a0a3a', bar: '#3a1250', barOn: '#ff7ad0', star: '#9a6ac0' }
      : { panel: '#ffb3d1', text: '#c2185b', label: '#b0306a', moves: '#ff4f9a', goal: '#fbe7ea', goalText: '#5a1a3a', bar: '#6e2448', barOn: '#ff8ac0', star: '#f39ac3' };
    E.nine(g, E.tinted('ui_pnl_pink_base', C.panel), -20, -40, W + 40, H + 30, 40, 34);
    g.save(); E.rr(g, -20, -40, W + 40, H + 30, 34); g.clip();
    g.globalAlpha = 0.16; g.strokeStyle = '#ffffff'; g.lineWidth = 16;
    g.beginPath(); for (let x = -H; x < W + H; x += 44) { g.moveTo(x, H); g.lineTo(x + H, -10); } g.stroke(); g.restore();
    // nivel y movimientos
    E.text(g, 'Nivel ' + (h.n > 8000 ? '★' : h.n), 92, 24, 22, hard ? '#ffffff' : C.text, { stroke: hard ? C.text : '#ffffff', sw: 5 });
    if (h.timeTotal) {
      const t = Math.max(0, Math.ceil(h.timeLeft())); const low = t <= 10;
      E.text(g, Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), 92, 80, low ? 54 + Math.sin(E.t * 8) * 4 : 54, low ? '#ff6060' : C.moves, { stroke: hard ? C.text : '#ffffff', sw: 7 });
      E.text(g, 'tiempo', 92, 120, 20, C.label, { stroke: false });
    } else {
      const low = P.moves <= 5;
      E.text(g, P.moves === Infinity ? '∞' : String(Math.max(0, P.moves)), 92, 78, low ? 66 + Math.sin(E.t * 8) * 4 : 66, low ? '#ff6060' : C.moves, { stroke: hard ? C.text : '#ffffff', sw: 8 });
      E.text(g, 'movimientos', 92, 120, 20, C.label, { stroke: false });
    }
    // caja de objetivos
    const gx = 182, gw = W - 182 - 150, gy = 46, gh = H - 62;
    if (hard) E.nine(g, E.tinted('ui_goals_panel', C.goal), gx, gy, gw, gh, 30, 22); else { E.rr(g, gx, gy, gw, gh, 16); g.fillStyle = C.goal; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(194,24,91,0.15)'; g.stroke(); }
    const n = h.goals.length, cw = gw / Math.max(1, n), sz = Math.min(cw * 0.5, gh * 0.62, 58);
    let done = 0, total = 0;
    h.goals.forEach((gl, i) => {
      total += gl.count; done += gl.count - Math.max(0, gl.left);
      const cx = gx + cw * i + cw * 0.38, cy = gy + gh / 2;
      gl.pos = { x: cx, y: cy };
      GAME.drawGoalIcon(g, gl, cx, cy, sz * (1 + (gl.bump || 0) * 0.3));
      if (gl.left <= 0) { const ck = E.img('ui_check'); g.beginPath(); g.arc(cx + sz * 0.6, cy + sz * 0.2, sz * 0.3, 0, 7); g.fillStyle = '#3cb93c'; g.fill(); E.text(g, '✓', cx + sz * 0.6, cy + sz * 0.22, sz * 0.4, '#fff', { stroke: false }); }
      else E.text(g, String(gl.left), cx + sz * 0.72, cy + sz * 0.05, Math.max(22, sz * 0.5), hard ? '#ffffff' : C.goalText, { stroke: hard ? C.goalText : '#ffffff', sw: 5 });
    });
    // barra de estrellas (avance de los objetivos)
    const bx = gx + 14, bw = gw - 28, by2 = 20, k = total ? Math.min(1, done / total) : 0;
    E.rr(g, bx, by2 - 7, bw, 14, 7); g.fillStyle = C.bar; g.fill();
    if (k > 0) { E.rr(g, bx, by2 - 7, Math.max(14, bw * k), 14, 7); g.fillStyle = C.barOn; g.fill(); }
    [0.4, 0.7, 1].forEach((v) => E.star(g, bx + bw * v - (v === 1 ? 8 : 0), by2, 13, k >= v ? '#ffd23f' : C.star, C.bar));
    // retrato (al tocarlo explica la pieza que toques después)
    const ax = W - 76, ay = H / 2 - 6, ring = E.img('ui_booster_amount_panel');
    if (h.askOn) { g.beginPath(); g.arc(ax, ay, 62, 0, 7); g.fillStyle = 'rgba(255,210,80,0.6)'; g.fill(); }
    if (!tiffiDraw(g, ax, ay, 0.36)) { if (ring) g.drawImage(ring, ax - 58, ay - 58, 116, 116); E.emoji(g, GAME.theme.mascot, ax, ay - 4, 72); }
    g.beginPath(); g.arc(ax + 36, ay + 34, 17, 0, 7); g.fillStyle = '#3f8fd9'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    E.text(g, '?', ax + 36, ay + 35, 23, '#fff', { stroke: false });
    h.ask(ax - 58, ay - 58, 116, 116);
  };
  // ---- mapa: tierra verde con la carretera rosa, decoraciones de cada mundo de Candy Crush y discos rosas
  const decos = (w) => { const L = window.MAPA_DECOS || {}, keys = Object.keys(L); return keys.length ? L[keys[w % keys.length]] : []; };
  Rl.mapNoDecor = true;
  Rl.mapBg = (g, top, zoneH) => {
    const z0 = Math.floor(top / zoneH);
    for (let z = z0 - 1; z <= z0 + 1; z++) {
      const zy = -z * zoneH - zoneH + top + E.H;
      const gr = g.createLinearGradient(0, zy, 0, zy + zoneH); gr.addColorStop(0, '#9fe0b0'); gr.addColorStop(1, '#6cc68a');
      g.fillStyle = gr; g.fillRect(0, zy, E.W, zoneH + 1);
    }
    const step = 150, i0 = Math.floor(top / step) - 1;
    for (let i = i0; i <= i0 + Math.ceil(E.H / step) + 2; i++) {
      const y = -i * step + top + E.H, w = Math.max(0, Math.floor((i * step) / zoneH)), L = decos(w);
      if (!L.length) continue;
      const r = E.rng(i * 7919 + 3), left = ((i % 2) + 2) % 2 === 0;
      const nm = L[Math.floor(r() * L.length)], im = E.imgL(nm); if (!im) continue;
      const big = nm.includes('_l_') ? 230 : nm.includes('_m_') ? 170 : 120, s = Math.min(big / im.width, big / im.height);
      const x = left ? 8 + r() * 30 : E.W - 8 - im.width * s - r() * 30;
      g.drawImage(im, x, y - im.height * s, im.width * s, im.height * s);
    }
  };
  Rl.mapPath = (g, a, b, pos) => {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); for (let i = a; i <= b; i++) { const p = pos(i); if (i === a) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
    g.lineWidth = 150; g.strokeStyle = '#f7c1d9'; g.stroke();
    g.lineWidth = 132; g.strokeStyle = '#fbd3e6'; g.stroke();
    g.lineWidth = 14; g.strokeStyle = '#ffffff'; g.stroke();
    g.setLineDash([18, 18]); g.lineWidth = 14; g.strokeStyle = '#ff6fa8'; g.stroke(); g.setLineDash([]);
    g.restore();
  };
  Rl.mapNode = (g, i, x, y, r, cur, done, hd, stars) => {
    const base = hd === 2 ? '#6a2aa0' : hd === 1 ? '#a03ad0' : cur ? '#ff3f8f' : done ? '#ff5fa0' : '#f7a8c8';
    g.beginPath(); g.ellipse(x, y + r * 0.55, r * 1.05, r * 0.5, 0, 0, 7); g.fillStyle = 'rgba(160,60,100,0.35)'; g.fill();
    if (cur) { g.beginPath(); g.arc(x, y, r + 12 + Math.sin(E.t * 4) * 3, 0, 7); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.arc(x, y - 1, r - 4, 0, 7);
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, E.shade(base, 0.4)); gr.addColorStop(1, base); g.fillStyle = gr; g.fill();
    E.text(g, String(i), x, y + 1, i > 999 ? 22 : 28, '#ffffff', { stroke: E.shade(base, -0.5), sw: 5 });
    if (hd && !done) E.emoji(g, '💀', x, y - r - 12, 30);
    if (done) for (let s2 = 0; s2 < 3; s2++) E.star(g, x + (s2 - 1) * 22, y + r + 6 + (s2 === 1 ? 4 : 0), 11, s2 < stars ? '#ffd23f' : '#e8c8d8', '#a0607a');
    if (cur) { const ti = E.imgL('map_tiffi'); if (ti) { const s = 120 / ti.height; g.drawImage(ti, x - r - ti.width * s + 6, y - 100, ti.width * s, ti.height * s); } else E.emoji(g, GAME.theme.mascot, x - r - 26, y - 6, 54); }
  };
  Rl.mapHeader = (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#ffd6ea');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#ff9cc8'; g.fillRect(0, H - 4, W, 4);
  };
  Rl.bar = (g, y, W, H) => {
    if (E.isHard(E.play.n)) E.nine(g, E.tinted('ui_goals_panel', '#6a2a9a'), 96, y + 10, W - 104, H - 20, 30, 40);
    else { E.rr(g, 96, y + 10, W - 104, H - 20, 40); g.fillStyle = '#fde3ec'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#f5b8cf'; g.stroke(); }
  };
  Rl.pauseIcon = (g, x, y, w, h) => { const im = E.img('ui_settings_button_menu'); if (im) g.drawImage(im, x - w * 0.05, y - h * 0.05, w * 1.1, h * 1.1); };
  // ventanas como las de Candy Crush: marco morado de rayas, cinta rosa del título y caja oscura de objetivos
  Rl.ribbon = (g, x, y, w, h) => { const im = E.img('ui_btn_pink'); if (im) E.nine(g, im, x + 20, y + 8, w - 40, h - 16, im.width / 2 - 1, (h - 16) / 2); };
  Rl.goalBox = (g, x, y, w, h) => { if (E.popup && E.popup.hard) E.nine(g, E.tinted('ui_goals_panel', '#3a1250'), x, y, w, h, 30, 26); else { E.rr(g, x, y, w, h, 20); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); } };
  const DARK = { ui_btn_pink: '#a0105a', ui_btn_green: '#1a6a1a', ui_btn_red: '#8a1010', ui_btn_purple: '#4a1070', ui_btn_blue: '#103a8a' };
  const BTN = { '#3cb93c': 'ui_btn_pink', '#e8453c': 'ui_btn_red', '#e8459a': 'ui_btn_pink', '#8a5cd6': 'ui_btn_purple', '#ff8a1f': 'ui_btn_pink', '#ff5fa8': null };
  Rl.btnStroke = (color) => DARK[BTN[color] || 'ui_btn_blue'] || '#103a8a';
  Rl.button = (g, x, y, w, h, color, down, r) => {
    const oy = down ? 4 : 0, round = Math.abs(w - h) < 4 || (w <= 120 && h <= 100);
    if (round && color === '#ff5fa8') return; // el botón de pausa ya es una imagen
    const name = round && w < 130 && !BTN[color] ? 'ui_booster_button_blue' : BTN[color] || (color === '#9aa3ad' || color === '#8a96a3' || color === '#b9c0c8' ? 'ui_btn_blue' : 'ui_btn_blue');
    let im = E.img(name); if (!im) return O.button(g, x, y, w, h, color, down, r);
    if (color === '#9aa3ad' || color === '#8a96a3' || color === '#b9c0c8') im = E.tinted(name, '#c8c8d0');
    if (round) { const d = Math.min(w, h) * (down ? 0.87 : 1); g.drawImage(im, x + (w - d) / 2, y + (h - d) / 2, d, d); }
    else E.nine(g, im, x, y + oy, w, h - 4, im.width / 2 - 1, Math.min((h - 4) / 2, 60));
  };
  const BICON = { hammer: 'ui_booster_lollipop', row: 'ui_booster_strippedbrush', rainbow: 'ui_booster_colorbomb', switch: 'ui_booster_freeswitch', shuffle: 'ui_booster_shuffle' };
  Rl.boosterIcon = (g, b, x, y, w, h, have) => {
    const im = E.img(BICON[b.id]);
    if (im) { const s = w * 0.78; g.drawImage(im, x + (w - s) / 2, y + (h - s) / 2 - 2, s, s); } else E.emoji(g, b.icon, x + w / 2, y + h / 2, w * 0.6);
    const ap = E.img('ui_booster_amount_panel'), tx = x + w - 14, ty = y + h - 12;
    if (ap) g.drawImage(ap, tx - 17, ty - 17, 34, 34);
    E.text(g, have === Infinity ? '∞' : have > 0 ? String(have) : '+', tx, ty + 1, 20, '#7a2a1a', { stroke: false });
  };
  Rl.panel = (g, x, y, w, h, opt) => {
    // marco de rayas rosa con interior claro; en los niveles difíciles, morado con interior oscuro (como Candy Crush)
    const hard = !!(E.popup && E.popup.hard);
    const im = hard ? E.tinted('ui_popup_standard_frame', '#c27af0') : E.img('ui_popup_standard_frame'); if (!im) return O.panel(g, x, y, w, h, opt);
    E.nine(g, im, x, y, w, h, 40, 36);
    E.rr(g, x + 22, y + 22, w - 44, h - 44, 22); g.fillStyle = hard ? '#7a2fb0' : '#ffe6ee'; g.fill();
    GAME.theme.popText = hard ? '#ffffff' : '#8a2a5a';
  };
  // colores de los caramelos de Candy Crush para teñir los efectos (rojo, naranja, amarillo, verde, azul, morado)
  const TINT = [[255, 60, 60], [255, 150, 30], [255, 225, 40], [80, 220, 60], [40, 150, 255], [190, 80, 255]];
  Rl.fxEvent = (name, x, y, ts, color) => E.kfx(name, x, y, ts / 80, color != null ? TINT[color] : null);
  Rl.tile = function (t, ts, COLORS) {
    const hp = (v) => Math.max(1, Math.min(5, v));
    if (t.kind === 'candy' && t.myst && !t.sp) return spr('myst' + t.color, ts, 0.9);
    if (t.kind === 'candy' && t.timer > 0 && !t.sp) return spr('pep' + t.color, ts, 0.95);
    if (t.kind === 'candy' && t.sp === 'f') return spr('fish' + t.color, ts, 0.92);
    if (t.kind === 'candy' && t.sp === 'w') return spr('c' + t.color + 'w', ts, 1.0);
    if (t.kind === 'candy') return spr('c' + t.color + (t.sp || ''), ts, 0.9);
    if (t.kind === 'mixer') return spr('mixer', ts, 1.0);
    if (t.kind === 'skull') return spr('skull' + hp(t.vhp != null ? t.vhp : t.hp), ts, 1.0);
    if (t.kind === 'shell') return spr('shell', ts, 0.95);
    if (t.kind === 'cobra') return spr('cobra', ts, 0.95);
    if (t.kind === 'twist') return spr('twist', ts, 1.0); // cordón de colores (chain_layer1_c)
    if (t.kind === 'ing') return spr(t.ing === 1 ? 'hazel' : 'cherry', ts, 0.95);
    if (t.kind === 'bomb') return spr('cbomb', ts, 0.92);
    if (t.kind === 'coco') return spr('coco', ts, 0.9);
    if (t.kind === 'ufo') return spr('ufo', ts, 0.95);
    if (t.kind === 'ice' && t.gum) return spr('gum' + hp(t.vhp != null ? t.vhp : t.hp), ts, 0.98);
    if (t.kind === 'lic') return spr('licsw', ts, 0.95);
    if (t.kind === 'ice') { const v = hp(t.vhp != null ? t.vhp : t.hp); if (t.choc) return spr('choc', ts, 0.98); return spr((t.waffle ? 'waffle' : 'ice') + v, ts, 0.98); }
    if (t.kind === 'slock') return spr('slock' + hp(t.vhp != null ? t.vhp : t.hp), ts, 0.98);
    return O.tile(t, ts, COLORS);
  };
  Rl.jelly = (g, w, h, level) => { g.globalAlpha = level >= 2 ? 1 : 0.65; fit('jelly', 1.04)(g, w, h); g.globalAlpha = 1; };
  Rl.lock = fit('lock', 1.0);
  // mermelada como en marmalade_lock_scene: fondo amarillo translúcido y encima el brillo
  Rl.marm = (g, w, h) => { g.globalAlpha = 0.4; fit('marm_back', 1.0)(g, w, h); g.globalAlpha = 1; fit('marm_front', 1.0)(g, w, h); };
  Rl.mystImg = true;
  // máquina de chicles de Candy Crush (gumball_scene.xml) vaciándose, y el chicle del pedido
  Rl.images.push('gumm0', 'gumm6', 'gumm12', 'gumm17', 'gumm22', 'gumball');
  Rl.gumballMachine = (g, w, h, q) => fit('gumm' + [0, 6, 12, 17, 22][q], 1.05)(g, w, h);
  Rl.gumballIcon = fit('gumball', 0.9);
  // piezas que el Candy Crush actual ya no trae, con sus imágenes del APK 1.119 (2018)
  Rl.images.push('hazel', 'plus5', 'clock', 'hud_hazel', 'order_myst', 'order_bomb');
  // portal y flecha de salida de ingredientes de Candy Crush
  Rl.images.push('portal', 'exit');
  Rl.wheel = { colors: ['#ff3b3b', '#ff9a1e', '#ffd21e', '#4cd137', '#2e9bff', '#b35cff'], rim: '#e8459a', hub: '#ffffff', arrowColor: '#e8459a' }; // ruleta con los colores de los caramelos
  for (const k of ['lic', 'fish', 'stripe', 'timer', 'ing']) Rl.images.push('cannon_' + k);
  Rl.cannonImg = (kind) => E.img('cannon_' + kind);
  Object.defineProperty(Rl, 'portal', { get: () => E.img('portal') });
  // portal de la gama alta de Candy Crush (regular_portal): túnel ovalado con la tira portal_hole puesta en redondo,
  // brillo cálido aditivo (soft_glow con su color 255,222,163) y destellos que giran por el borde
  Rl.images.push('pt_portal_hole', 'pt_portal_twinkles', 'pt_soft_glow');
  let ptHole = null;
  const holeImg = () => {
    if (ptHole) return ptHole; const t = E.img('pt_portal_hole'); if (!t) return null;
    const tc = document.createElement('canvas'); tc.width = t.width; tc.height = t.height; const tg = tc.getContext('2d'); tg.drawImage(t, 0, 0);
    let src; try { src = tg.getImageData(0, 0, t.width, t.height).data; } catch (e) { return null; } // imagen sin permiso de lectura: el portal sencillo
    const S = 128, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), out = g.createImageData(S, S), mx = Math.floor(t.width / 2);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const rr = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2); if (rr > 1) continue;
      const row = Math.min(t.height - 1, Math.floor(rr * t.height)), i = (row * t.width + mx) * 4, o = (y * S + x) * 4;
      out.data[o] = src[i]; out.data[o + 1] = src[i + 1]; out.data[o + 2] = src[i + 2]; out.data[o + 3] = src[i + 3] * Math.min(1, (1 - rr) * 8);
    }
    g.putImageData(out, 0, 0); return (ptHole = c);
  };
  Rl.portalDraw = (g, x, y, ts) => {
    const hole = holeImg(), glow = E.tinted('pt_soft_glow', '#ffdea3'), tw = E.img('pt_portal_twinkles'); if (!hole) return false;
    const w = ts * 0.96, h = ts * 0.28;
    g.save();
    g.globalCompositeOperation = 'lighter';
    if (glow) { g.globalAlpha = 0.8; g.drawImage(glow, x - w * 0.85, y - h * 0.9, w * 1.7, h * 1.8); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.drawImage(hole, x - w / 2, y - h / 2, w, h);
    if (tw) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const a = E.t * 1.6 + i * 2.09, s = ts * 0.2 * (0.6 + 0.4 * Math.sin(E.t * 5 + i * 1.7)); g.globalAlpha = 0.85; g.drawImage(tw, x + Math.cos(a) * w * 0.45 - s / 2, y + Math.sin(a) * h * 0.45 - s / 2, s, s); }
    }
    g.restore();
    return true;
  };
  Object.defineProperty(Rl, 'ingExit', { get: () => E.img('exit') });
  for (let i = 0; i < 6; i++) Rl.images.push('myst' + i, 'pep' + i);
  Rl.candyMarks = (g, t, s, COLORS) => {
    if (t.timer > 0) { // número en la esfera de la bomba
      const red = t.timer <= 3;
      E.text(g, String(t.timer), -s * 0.12, s * 0.12, s * 0.3, red ? '#d62828' : '#333', { stroke: false });
    }
    if (t.cham != null) { // camaleón: el caramelo partido en dos, el otro lado es el color al que cambiará
      const im = E.img('c' + t.cham); const h = (Math.sin(E.t * 2.5) + 1) / 2;
      if (im) { g.save(); g.beginPath(); g.moveTo(s, -s); g.lineTo(s, s); g.lineTo(-s, s); g.closePath(); g.clip(); g.globalAlpha *= 0.75 + h * 0.25; const k = s * 0.9; g.drawImage(im, -k / 2, -k / 2, k, k); g.restore(); }
    }
    if (t.myst && t.sp) { const mi = E.img('myst' + t.color); if (mi) g.drawImage(mi, -s * 0.3, -s * 0.3, s * 0.6, s * 0.6); }
    if (t.plus5) { // flechas de movimientos y "+5" con el estilo del "+3" del juego
      const im = E.img('plus5');
      if (im) { const w = im.width * 0.55, h = im.height * 0.48; g.drawImage(im, im.width - w, im.height - h, w, h, -s * 0.05, s * 0.02, s * 0.45, s * 0.45 * h / w); }
      E.text(g, '+5', -s * 0.08, -s * 0.12, s * 0.36, '#fff', { stroke: '#8a1a2a', sw: s * 0.07 });
    }
    if (t.clock) { const im = E.img('clock'); if (im) g.drawImage(im, -s * 0.05, -s * 0.05, s * 0.5, s * 0.5); }
    return true;
  };
  Object.assign(Rl.emoji, { '🌰': fit('hud_hazel', 0.95) });
  // capa de azúcar de Candy Crush (sugarcoat_1..3) y caparazón de regaliz
  Rl.images.push('coat1', 'coat2', 'coat3', 'shell');
  Rl.images.push('glass1', 'glass2', 'glass3', 'ww_wrap', 'cobra'); for (let i = 0; i < 6; i++) Rl.images.push('ww_rib' + i);
  Rl.glassTile = (g, s, n) => { const im = E.img('glass' + Math.max(1, Math.min(3, n))); if (!im) return false; g.drawImage(im, -s / 2, -s / 2, s, s); return true; };
  // paquetito precioso: la caja y encima las cintas que quedan, de abajo arriba
  Rl.wonderWrapper = (g, w, h, cols) => {
    const box = E.img('ww_wrap'); if (!box) return false;
    const k = Math.min(w / box.width, h / box.height) * 0.95; g.drawImage(box, (w - box.width * k) / 2, (h - box.height * k) / 2, box.width * k, box.height * k);
    const bh = box.height * k, by = (h - bh) / 2;
    cols.forEach((c, i) => { const r = E.img('ww_rib' + c); if (!r) return; const kr = (bh * 1.25) / r.height, x = w / 2 + (i - (cols.length - 1) / 2) * w * 0.22; g.drawImage(r, x - (r.width * kr) / 2, by - bh * 0.125, r.width * kr, r.height * kr); });
    return true;
  };
  Rl.selPulse = 0.015; // Candy Crush no anima la pieza tocada (emulador, 23-10-2026): solo un aviso mínimo
  Rl.sugarCoat = (g, s, n) => { const im = E.img('coat' + Math.max(1, Math.min(3, n))); if (!im) return false; g.drawImage(im, -s / 2, -s / 2, s, s); return true; };
  // rana de Candy Crush 1.119, teñida del color que se come
  for (let i = 0; i < 6; i++) Rl.images.push('frog' + i);
  Rl.frogImg = (c) => 'frog' + ((c || 0) % 6);
  for (let i = 0; i < 6; i++) Rl.images.push('froga' + i + '.webp');
  Rl.scripts = (Rl.scripts || []).concat(['frog.js']);
  Rl.frogAnim = (g, t, fs) => {
    const M = window.FROG, sh = M && E.img('froga' + ((t.color || 0) % 6) + '.webp'); if (!sh) return false;
    const k = t.fillK || 0, an = M.anims[k >= 1 ? 's5' : k >= 0.4 ? 's3' : 's1'];
    const f = an[Math.floor(E.t * M.fps) % an.length], d = fs * 1.5;
    g.drawImage(sh, (f % M.cols) * M.w, Math.floor(f / M.cols) * M.h, M.w, M.h, -d / 2, -d * 0.55, d, d); return true;
  };
  Rl.emoji['🐸'] = fit('frog3', 1.0);
  // lo que aún se dibuja con un emoji (iconos de objetivos y piezas sin imagen WebGL), con su imagen original
  Object.assign(Rl.emoji, { '🔒': fit('slock1', 0.95), '🌀': fit('mixer', 0.95), '💀': fit('skull1', 0.95), '🐚': fit('shell', 0.95), '🐍': fit('cobra', 0.95), '🥥': fit('coco', 0.95), '🛸': fit('ufo', 0.95), '🔗': fit('twist', 0.95) });
  Object.assign(Rl.emoji, { '🌈': fit('cbomb', 0.95), '🔑': fit('key', 0.95), '🍒': fit('cherry', 0.95), '〰️': fit('c4h', 0.95), '🍬': fit('c0w', 0.95) }); // también los potenciadores de partida
})();

// ================================================================ 'nueva': patio andaluz con dulces de siempre
// Fresa, naranja confitada, yema, caramelo de menta, caramelo de agua y caramelo de violeta (cada uno con su forma).
(function () {
  const N = (GAME.skins.nueva = Object.assign({}, NUEVA, { emoji: Object.assign({}, NUEVA.emoji) }));
  const COLS = ['#e8323a', '#ff8a1f', '#ffc928', '#3fbf6a', '#3a8ef0', '#9b4fd6'];
  const shine = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); };
  function sweetPath(g, i, w, h) {
    const cx = w / 2, cy = h / 2;
    g.beginPath();
    if (i === 0) { g.moveTo(cx, cy + h * 0.4); g.bezierCurveTo(cx - w * 0.5, cy, cx - w * 0.35, cy - h * 0.38, cx, cy - h * 0.28); g.bezierCurveTo(cx + w * 0.35, cy - h * 0.38, cx + w * 0.5, cy, cx, cy + h * 0.4); }
    else if (i === 1) { g.moveTo(cx - w * 0.42, cy + h * 0.12); g.arc(cx, cy + h * 0.12, w * 0.42, Math.PI, 0); g.closePath(); }
    else if (i === 2) g.arc(cx, cy, w * 0.36, 0, 7);
    else if (i === 3) { g.moveTo(cx - w * 0.38, cy + h * 0.32); g.bezierCurveTo(cx - w * 0.42, cy - h * 0.2, cx + w * 0.1, cy - h * 0.42, cx + w * 0.4, cy - h * 0.36); g.bezierCurveTo(cx + w * 0.4, cy + h * 0.1, cx, cy + h * 0.38, cx - w * 0.38, cy + h * 0.32); }
    else if (i === 4) { g.moveTo(cx, cy - h * 0.42); g.bezierCurveTo(cx + w * 0.25, cy - h * 0.1, cx + w * 0.36, cy + h * 0.05, cx + w * 0.33, cy + h * 0.18); g.arc(cx, cy + h * 0.16, w * 0.33, 0, Math.PI); g.bezierCurveTo(cx - w * 0.36, cy + h * 0.05, cx - w * 0.25, cy - h * 0.1, cx, cy - h * 0.42); }
    else for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.moveTo(cx + Math.cos(a) * w * 0.2 + w * 0.2, cy + Math.sin(a) * h * 0.2); g.arc(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * h * 0.2, w * 0.2, 0, 7); }
  }
  function sweet(g, w, h, i, sp) {
    const base = COLS[i];
    g.save(); g.translate(0, h * 0.04); sweetPath(g, i, w, h); g.fillStyle = 'rgba(80,40,10,0.25)'; g.fill(); g.restore();
    sweetPath(g, i, w, h);
    const gr = g.createRadialGradient(w * 0.38, h * 0.32, w * 0.04, w / 2, h / 2, w * 0.5); gr.addColorStop(0, E.shade(base, 0.55)); gr.addColorStop(0.5, base); gr.addColorStop(1, E.shade(base, -0.35));
    g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = E.shade(base, -0.5); g.stroke();
    // detalles de cada dulce
    if (i === 0) { g.fillStyle = '#ffe9a0'; for (const [x, y] of [[0.4, 0.45], [0.58, 0.42], [0.5, 0.6], [0.38, 0.62], [0.62, 0.6], [0.5, 0.75]]) { g.beginPath(); g.ellipse(w * x, h * y, w * 0.022, h * 0.035, 0, 0, 7); g.fill(); } g.beginPath(); g.moveTo(w * 0.36, h * 0.2); g.lineTo(w * 0.5, h * 0.3); g.lineTo(w * 0.64, h * 0.2); g.lineTo(w * 0.5, h * 0.12); g.closePath(); g.fillStyle = '#3f9a3a'; g.fill(); }
    if (i === 1) { g.strokeStyle = 'rgba(255,240,200,0.8)'; g.lineWidth = w * 0.025; for (let k = 1; k < 6; k++) { const a = Math.PI + (k * Math.PI) / 6; g.beginPath(); g.moveTo(w / 2, h * 0.62); g.lineTo(w / 2 + Math.cos(a) * w * 0.34, h * 0.62 + Math.sin(a) * w * 0.34); g.stroke(); } g.beginPath(); g.arc(w / 2, h * 0.62, w * 0.36, Math.PI, 0); g.stroke(); }
    if (i === 2) { g.fillStyle = 'rgba(255,255,255,0.85)'; const r = E.rng(3); for (let k = 0; k < 14; k++) { const a = r() * 6.3, d = Math.sqrt(r()) * w * 0.3; g.fillRect(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, w * 0.025, w * 0.025); } }
    if (i === 3) { g.beginPath(); g.moveTo(w * 0.15, h * 0.8); g.quadraticCurveTo(w * 0.5, h * 0.45, w * 0.86, h * 0.16); g.lineWidth = w * 0.03; g.strokeStyle = E.shade(base, -0.4); g.stroke(); }
    if (i === 5) { g.beginPath(); g.arc(w / 2, h / 2, w * 0.1, 0, 7); g.fillStyle = '#ffe36a'; g.fill(); }
    if (sp === 'h' || sp === 'v') {
      g.save(); sweetPath(g, i, w, h); g.clip(); g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = -3; k <= 3; k++) { if (sp === 'h') g.fillRect(0, h / 2 + k * h * 0.15 - h * 0.035, w, h * 0.07); else g.fillRect(w / 2 + k * w * 0.15 - w * 0.035, 0, w * 0.07, h); }
      g.restore();
    }
    shine(g, w * 0.38, h * 0.32, w * 0.09, h * 0.05);
  }
  function paperWrap(g, w, h, i) { // envuelto en papel de seda con lazos
    const base = COLS[i];
    for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + sg * w * 0.25, h / 2); g.lineTo(w / 2 + sg * w * 0.48, h * 0.25); g.lineTo(w / 2 + sg * w * 0.48, h * 0.75); g.closePath(); g.fillStyle = '#fbf7ee'; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = base; g.stroke(); }
    g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.3, h * 0.3, 0, 0, 7); g.fillStyle = '#fbf7ee'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = base; g.stroke();
    g.save(); g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.25, h * 0.25, 0, 0, 7); g.clip();
    g.fillStyle = base; for (let k = -3; k <= 3; k++) g.fillRect(w / 2 + k * w * 0.12 - w * 0.03, 0, w * 0.06, h); g.restore();
    shine(g, w * 0.4, h * 0.36, w * 0.08, h * 0.04);
  }
  function rosquilla(g, w, h) { // rosquilla con virutas de colores (bomba de color)
    const cx = w / 2, cy = h / 2, R = w * 0.4;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.arc(cx, cy, R * 0.38, 0, 7, true);
    const gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R); gr.addColorStop(0, '#ffd7a8'); gr.addColorStop(1, '#c4793a');
    g.fillStyle = gr; g.fill('evenodd');
    g.beginPath(); g.arc(cx, cy, R * 0.9, 0, 7); g.arc(cx, cy, R * 0.45, 0, 7, true); g.fillStyle = '#ff9ccf'; g.fill('evenodd');
    const r = E.rng(11); for (let k = 0; k < 22; k++) { const a = r() * 6.3, d = R * (0.5 + r() * 0.36); g.save(); g.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); g.rotate(r() * 3); g.fillStyle = COLS[k % 6]; g.fillRect(-w * 0.03, -w * 0.01, w * 0.06, w * 0.02); g.restore(); }
  }
  N.tile = function (t, ts) {
    if (t.kind === 'candy') {
      if (t.sp === 'w') return E.sprite('pw' + t.color, ts, ts, (g, w, h) => paperWrap(g, w, h, t.color));
      if (t.sp === 'f') return null;
      return E.sprite('sw' + t.color + (t.sp || ''), ts, ts, (g, w, h) => sweet(g, w, h, t.color, t.sp));
    }
    if (t.kind === 'bomb') return E.sprite('rosq', ts, ts, rosquilla);
    return null;
  };
  N.board = function (g, S, bx, by, ts, inB) {
    const { COB } = { COB: '#1f4fa8' };
    g.fillStyle = '#fbf7ee'; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(r, c)) { E.rr(g, bx + c * ts - 9, by + r * ts - 9, ts + 18, ts + 18, 12); g.fill(); }
    g.fillStyle = COB; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(r, c)) { E.rr(g, bx + c * ts - 4, by + r * ts - 4, ts + 8, ts + 8, 8); g.fill(); }
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(r, c)) {
      const x = bx + c * ts, y = by + r * ts;
      g.fillStyle = (r + c) % 2 ? '#dfe7f6' : '#eef2fa'; g.fillRect(x, y, ts, ts);
      g.beginPath(); g.arc(x + ts / 2, y + ts / 2, ts * 0.3, 0, 7); g.fillStyle = 'rgba(31,79,168,0.06)'; g.fill();
    }
  };
  Object.assign(N.emoji, { '〰️': (g, w, h) => sweet(g, w, h, 4, 'h'), '🍬': (g, w, h) => paperWrap(g, w, h, 5), '🌈': rosquilla });
})();
