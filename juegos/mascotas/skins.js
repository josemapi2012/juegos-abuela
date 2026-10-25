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
// Estilos gráficos de Rescate Animal (todo dibujado con el canvas, sin imágenes del juego original).
// 'original': imita Pet Rescue Saga (bloques blanditos con dibujo hundido, interfaz azul con borde dorado, jardín).
GAME.skins = {};

(function () {
  const BLUE = '#1f5fc8', BLUE_D = '#0f3a85', GOLD = '#f2c230';
  const O = (GAME.skins.original = {});
  O.theme = { accent: '#e8322b', ribbon: '#d62a2a', hudText: '#0f3a85', bar: BLUE, panel: { top: '#eaf4ff', bottom: '#c4defa' } };
  // dibujos de Pet Rescue: corazón, huella, hueso, sol y rombo redondeado
  function sym(g, color, cx, cy, s) {
    g.beginPath();
    if (color === 0) { g.moveTo(cx, cy + s * 0.85); g.bezierCurveTo(cx - s * 1.35, cy - s * 0.05, cx - s * 0.6, cy - s * 1.15, cx, cy - s * 0.42); g.bezierCurveTo(cx + s * 0.6, cy - s * 1.15, cx + s * 1.35, cy - s * 0.05, cx, cy + s * 0.85); }
    else if (color === 1) { g.ellipse(cx, cy + s * 0.35, s * 0.55, s * 0.45, 0, 0, 7); for (const [dx, dy] of [[-0.68, -0.25], [-0.26, -0.72], [0.26, -0.72], [0.68, -0.25]]) { g.moveTo(cx + dx * s + s * 0.23, cy + dy * s); g.arc(cx + dx * s, cy + dy * s, s * 0.23, 0, 7); } }
    else if (color === 2) { const a = -0.6, c = Math.cos(a), sn = Math.sin(a); const P = (x, y) => [cx + (x * c - y * sn) * s, cy + (x * sn + y * c) * s]; g.moveTo(...P(-0.7, -0.17)); g.lineTo(...P(0.7, -0.17)); g.lineTo(...P(0.7, 0.17)); g.lineTo(...P(-0.7, 0.17)); g.closePath(); for (const [x, y] of [[-0.78, -0.22], [-0.78, 0.22], [0.78, -0.22], [0.78, 0.22]]) { const [px, py] = P(x, y); g.moveTo(px + s * 0.26, py); g.arc(px, py, s * 0.26, 0, 7); } }
    else if (color === 3) { g.arc(cx, cy, s * 0.48, 0, 7); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.moveTo(cx + Math.cos(a - 0.22) * s * 0.62, cy + Math.sin(a - 0.22) * s * 0.62); g.lineTo(cx + Math.cos(a) * s * 0.98, cy + Math.sin(a) * s * 0.98); g.lineTo(cx + Math.cos(a + 0.22) * s * 0.62, cy + Math.sin(a + 0.22) * s * 0.62); g.closePath(); } }
    else { g.moveTo(cx, cy - s * 0.95); g.quadraticCurveTo(cx + s * 0.1, cy - s * 0.1, cx + s * 0.85, cy); g.quadraticCurveTo(cx + s * 0.1, cy + s * 0.1, cx, cy + s * 0.95); g.quadraticCurveTo(cx - s * 0.1, cy + s * 0.1, cx - s * 0.85, cy); g.quadraticCurveTo(cx - s * 0.1, cy - s * 0.1, cx, cy - s * 0.95); }
  }
  const BASE = ['#f0262d', '#1f78ee', '#4fcf1f', '#ffd21a', '#b43ae8'];
  function block(g, w, h, color) {
    const base = BASE[color], r = w * 0.24;
    E.rr(g, w * 0.03, h * 0.05, w * 0.94, h * 0.92, r); g.fillStyle = E.shade(base, -0.45); g.fill();
    E.rr(g, w * 0.03, h * 0.03, w * 0.94, h * 0.88, r);
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, E.shade(base, 0.35)); gr.addColorStop(0.5, base); gr.addColorStop(1, E.shade(base, -0.15));
    g.fillStyle = gr; g.fill();
    // brillo de gominola arriba
    E.rr(g, w * 0.12, h * 0.07, w * 0.76, h * 0.22, h * 0.1); gr = g.createLinearGradient(0, h * 0.07, 0, h * 0.29); gr.addColorStop(0, 'rgba(255,255,255,0.65)'); gr.addColorStop(1, 'rgba(255,255,255,0.05)'); g.fillStyle = gr; g.fill();
    // dibujo hundido: luz abajo y sombra
    const s = w * 0.24, cy = h * 0.5;
    sym(g, color, w / 2, cy + w * 0.025, s); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    sym(g, color, w / 2, cy, s); g.fillStyle = E.shade(base, -0.3); g.fill();
  }
  const carrierCols = ['#e8322b', '#1f78ee', '#4fcf1f', '#ffd21a', '#b43ae8'];
  O.tile = function (t, ts) {
    if (t.kind === 'block') return E.sprite('pb' + t.color, ts, ts, (g, w, h) => block(g, w, h, t.color));
    return null;
  };
  // tablero: marco azul con borde dorado y fondo de cristal
  O.board = function (g, x, y, w, h) {
    E.rr(g, x - 12, y - 12, w + 24, h + 24, 20); g.fillStyle = GOLD; g.fill();
    E.rr(g, x - 7, y - 7, w + 14, h + 14, 16); g.fillStyle = BLUE_D; g.fill();
    E.rr(g, x - 3, y - 3, w + 6, h + 6, 12); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(150,200,255,0.35)'); gr.addColorStop(1, 'rgba(40,90,170,0.45)'); g.fillStyle = gr; g.fill();
  };
  O.playBg = function (g, w, h) {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fcbff'); gr.addColorStop(0.6, '#c8ecff'); gr.addColorStop(1, '#7fd36a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, s] of [[0.2, 0.1, 1.1], [0.75, 0.16, 1.3]]) for (const [dx, dy, r] of [[0, 0, 26], [28, -12, 32], [58, 0, 24]]) { g.beginPath(); g.arc(w * x + dx * s, h * y + dy * s, r * s, 0, 7); g.fill(); }
    const hill = (y0, col, amp, ph) => { g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 10) g.lineTo(x, h * y0 + Math.sin(x / w * 5 + ph) * amp); g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill(); };
    hill(0.66, '#8fd96a', 22, 1); hill(0.78, '#5fbf3f', 26, 3);
    // casita de los animales
    g.fillStyle = '#c96a3a'; g.fillRect(w * 0.06, h * 0.56, 90, 70); g.beginPath(); g.moveTo(w * 0.06 - 10, h * 0.56); g.lineTo(w * 0.06 + 45, h * 0.5); g.lineTo(w * 0.06 + 100, h * 0.56); g.fill();
    g.fillStyle = '#5a2a12'; E.rr(g, w * 0.06 + 30, h * 0.56 + 25, 30, 45, 14); g.fill();
  };
  O.panel = function (g, x, y, w, h, opt) {
    const r = opt.r || 26;
    E.rr(g, x + 2, y + 8, w, h, r); g.fillStyle = 'rgba(0,0,40,0.3)'; g.fill();
    E.rr(g, x, y, w, h, r); g.fillStyle = GOLD; g.fill();
    E.rr(g, x + 5, y + 5, w - 10, h - 10, r - 3); let gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3f8ff0'); gr.addColorStop(1, BLUE_D); g.fillStyle = gr; g.fill();
    E.rr(g, x + 16, y + 16, w - 32, h - 32, Math.max(8, r - 10)); gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, (opt && opt.top) || '#eaf4ff'); gr.addColorStop(1, (opt && opt.bottom) || '#c4defa'); g.fillStyle = gr; g.fill();
  };
  O.button = function (g, x, y, w, h, color, down, r) {
    const oy = down ? 4 : 0;
    if (!down) { E.rr(g, x, y + 9, w, h - 6, r); g.fillStyle = 'rgba(0,0,40,0.3)'; g.fill(); }
    E.rr(g, x - 2, y + oy - 2, w + 4, h - 3, r + 2); g.fillStyle = GOLD; g.fill();
    E.rr(g, x + 1, y + oy + 1, w - 2, h - 10, r);
    const gr = g.createLinearGradient(0, y + oy, 0, y + oy + h - 9); gr.addColorStop(0, E.shade(color, 0.35)); gr.addColorStop(1, E.shade(color, -0.2)); g.fillStyle = gr; g.fill();
    E.rr(g, x + w * 0.08, y + oy + 5, w * 0.84, (h - 9) * 0.3, Math.max(4, r * 0.6)); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  };
  O.hud = function (g, W, H) {
    E.rr(g, 4, -20, W - 8, H + 14, 26); g.fillStyle = GOLD; g.fill();
    E.rr(g, 8, -18, W - 16, H + 8, 24); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3f8ff0'); gr.addColorStop(1, BLUE_D); g.fillStyle = gr; g.fill();
    const box = (x, w) => { E.rr(g, x, 46, w, H - 62, 16); g.fillStyle = '#eaf4ff'; g.fill(); g.lineWidth = 3; g.strokeStyle = GOLD; g.stroke(); };
    box(18, 308); box(W - 176, 158);
    const ax = W / 2 + 40, ay = H / 2 - 4;
    g.beginPath(); g.arc(ax, ay, 54, 0, 7); g.fillStyle = GOLD; g.fill(); g.beginPath(); g.arc(ax, ay, 49, 0, 7); g.fillStyle = '#bfe3ff'; g.fill();
  };
  O.bar = function (g, y, W, H) {
    const gr = g.createLinearGradient(0, y, 0, y + H); gr.addColorStop(0, '#3f8ff0'); gr.addColorStop(1, BLUE_D);
    g.fillStyle = gr; g.fillRect(0, y, W, H); g.fillStyle = GOLD; g.fillRect(0, y, W, 5);
  };
  O.boosterIcon = function (g, b, x, y, w, h, have) {
    E.emoji(g, b.icon, x + w / 2, y + h / 2 - 2, w * 0.6);
    const tx = x + w - 15, ty = y + h - 13;
    g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fillStyle = have ? '#d62a2a' : '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = GOLD; g.stroke();
    E.text(g, have === Infinity ? '∞' : have > 0 ? String(have) : '+', tx, ty + 1, 21, '#fff', { stroke: false });
  };
  // mapa: campo verde con camino de tierra y árboles
  Object.assign(O, SKIN_MAPA({
    zones: [['#9be37b', '#4fae3a'], ['#c8f0a8', '#7fc85a'], ['#ffe9a8', '#f2c75a'], ['#bfe6ff', '#7cc0f5'], ['#e8f8ff', '#bfe0f5']],
    path: ['#f2d49a', '#b88a4a'], node: '#1f5fc8', cur: '#e8322b', rim: '#f2c230', header: ['#3f8ff0', '#0f3a85'], line: '#f2c230',
    decor(g, x, y, i) { // árbol redondo o casita de perro
      if (i % 2) { g.fillStyle = '#7a4a1e'; g.fillRect(x - 6, y + 10, 12, 50); g.beginPath(); g.arc(x, y, 38, 0, 7); g.fillStyle = '#3f9a2a'; g.fill(); g.beginPath(); g.arc(x - 12, y - 10, 16, 0, 7); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(); }
      else { g.fillStyle = '#c96a3a'; g.fillRect(x - 36, y, 72, 52); g.beginPath(); g.moveTo(x - 46, y + 4); g.lineTo(x, y - 34); g.lineTo(x + 46, y + 4); g.closePath(); g.fillStyle = '#8a3a1a'; g.fill(); E.rr(g, x - 14, y + 18, 28, 34, 12); g.fillStyle = '#3a1a0a'; g.fill(); E.emoji(g, ['🐶', '🐱', '🐰', '🐷'][((i % 4) + 4) % 4], x + 50, y + 40, 40); }
    },
  }));
})();

// ================================================================ 'real' (en Ajustes: "Original")
// Imágenes de Pet Rescue que solo están en la tablet (privado/, dentro del APK; nunca se publican).
// Los animalitos de Pet Rescue son modelos 3D: tools/privado.py los renderiza a imagen (tools/king_ffm.py).
(function () {
  const O = GAME.skins.original;
  const N = [];
  for (let i = 0; i < 5; i++) N.push('b' + i, 'cb' + i, 'paint' + i);
  N.push('carrier1', 'carrier2', 'carrier3', 'ibox', 'fbox', 'black', 'lock', 'mesh1', 'mesh2', 'cage');
  // cada emoji de animalito de Rescate Animal con su mascota de Pet Rescue
  const PET = { '🐶': 'puppy', '🐱': 'kitten', '🐰': 'blackcat', '🐷': 'piglet', '🐼': 'panda', '🐹': 'hedgehog', '🐸': 'turtle', '🐵': 'squirrel', '🐨': 'seal', '🦊': 'ferret' };
  for (const k in PET) N.push('pet_' + PET[k]);
  const fit = (name, k) => (g, w, h) => {
    const im = E.img(name); if (!im) return;
    const s = Math.min((w * k) / im.width, (h * k) / im.height);
    g.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s);
  };
  const spr = (n, ts, k) => E.sprite('img' + n, ts, ts, fit(n, k));
  const Rl = (GAME.skins.real = Object.assign({}, O, { images: N, emoji: Object.assign({}, O.emoji) }));

  const MAPIMG = (z) => 'map_' + (z % 3) + '.jpg';
  Rl.images = Rl.images.concat(['map_0.jpg', 'map_1.jpg', 'map_2.jpg'].filter((n) => !Rl.images.includes(n)));
  // mapa: cada mundo con su fondo del juego original, a lo ancho de la pantalla (sin los adornos de emoji)
  Rl.mapNoDecor = true;
  Rl.mapBg = (g, top, zoneH) => {
    const z0 = Math.floor(top / zoneH);
    for (let z = z0 - 1; z <= z0 + 1; z++) {
      if (z < 0) continue;
      const zy = -z * zoneH - zoneH + top + E.H, im = E.img(MAPIMG(z)); if (!im) return O.mapBg ? O.mapBg(g, top, zoneH) : null;
      const s = Math.max(E.W / im.width, zoneH / im.height); g.drawImage(im, (E.W - im.width * s) / 2, zy + (zoneH - im.height * s) / 2, im.width * s, im.height * s);
    }
  };
  for (const k in PET) Rl.emoji[k] = fit('pet_' + PET[k], 1.0);
  // potenciadores de partida con sus piezas de Pet Rescue
  Rl.images.push('ui_ico_arrow');
  Object.assign(Rl.emoji, { '⬇️': fit('ui_ico_arrow', 0.95), '🧱': fit('b0', 0.95), '⚙️': fit('ui_settings', 0.85), '↔️': fit('lblast', 0.95), '💥': fit('cb0', 0.95), '🚀': fit('ui_booster_round_rocket', 0.95), '🎈': fit('ui_booster_round_colourpop', 0.95), '🔨': fit('ui_booster_round_hammer', 0.95) });
  // mascotas animadas con sus animaciones de Pet Rescue (tools/king_ffa.py): reposo y, si caen, la de caída
  Rl.images = Rl.images.concat(Object.values(PET).map((k) => 'pet_' + k + '.webp'));
  Rl.scripts = (Rl.scripts || []).concat(Object.values(PET).map((k) => 'pet_' + k + '.js'));
  Rl.petAnim = (g, t, ps) => {
    const k = PET[t.pet]; const M = k && window['PET_' + k.toUpperCase()], sh = M && E.img('pet_' + k + '.webp'); if (!sh) return false;
    const an = (t.vy > 3 && M.anims.fall) || M.anims.idle; if (!an) return false;
    const f = an[Math.floor((E.t + ((t.id || 0) % 7) * 0.31) * M.fps) % an.length];
    const d = ps * 1.45; g.drawImage(sh, (f % M.cols) * M.w, Math.floor(f / M.cols) * M.h, M.w, M.h, -d / 2, -d / 2, d, d);
    return true;
  };
  // sonidos de Pet Rescue con los nombres de su tabla (sound_containers.xml → sounds.xml): HappyChime al quitar un grupo,
  // BlockLand al caer, ColumnBlast el cohete, ColorPop la bomba de color, PetReleased al salvar una mascota...
  Rl.sfx = {
    pop: ['square_removed1'], land: ['block_land_a', 'block_land_b', 'block_land_c'], bad: ['click_wrong'], click: ['button_press'],
    bomb: ['bomb'], rocket: ['column_blast'], magic: ['color_bomb'], collect: (p) => ['ding' + Math.max(1, Math.min(8, Math.round((p - 1) * 10) + 1))],
    rescue: ['pet_released'], star: ['stars_one'], win: ['stinger_win'], lose: ['stinger_fail'], shuffle: ['whosh_1'],
  };  // ventanas, estrellas y regalo con los sonidos de Pet Rescue
  Object.assign(Rl.sfx, { popIn: ['Generic_Swoosh_PopUp_In'], popOut: ['Generic_Swoosh_PopUp_Out'], star: (p) => [['stars_one', 'stars_two', 'stars_three'][Math.max(0, Math.min(2, Math.round((p - 1) / 0.2)))]], wheelWin: ['Daily_Gift_Gift_Added'] });

  Rl.wheel = { colors: ['#e8322b', '#2f7ee0', '#3cb93c', '#ffcc1a', '#9a4fd6', '#ff8a1f'], rim: '#21a3f0', hub: '#ffffff', arrowColor: '#e8459a' }; // ruleta con los colores de los bloques
  // la voz de cada mascota al rescatarla (DogHappy, CatHappy... de Pet Rescue)
  const VOZ = { '🐶': 'dog', '🐱': 'cat', '🐰': 'rabbit', '🐷': 'pig', '🐼': 'panda', '🐹': 'hedgehog', '🐸': 'turtle', '🐵': 'squirrel', '🐨': 'seal', '🦊': 'ferret' };
  for (const [e, v] of Object.entries(VOZ)) Rl.sfx['pet:' + e] = [v + '_happy'];
  // volúmenes de su tabla de sonidos (sound_containers.xml, en dB): el golpe de cada bloque al caer va 15 dB por debajo
  // efectos → sonidos según su effects.xml: el rompelíneas suena a muelle (LineBlast = spring), el cascabloques es BlockRemover,
  // los botones TapDown; volúmenes de audio_containers.xml
  Object.assign(Rl.sfx, { line: ['spring'], hammer: ['block_remover'], click: ['button_down'] });
  Rl.sfxVol = { block_land_a: -15, block_land_b: -15, block_land_c: -15, click_wrong: -15, bomb: -4, column_blast: -4, color_bomb: -2, pet_released: -5, spring: -5,
    block_remover: -2, steel_cage_break: -4, wood_cage_break: -4, key_chain: -5, glass_breaking: -6, unfrozen: -2, pets_rescued: -2 };
  // ---- interfaz con las piezas de Pet Rescue (tools/privado.py → ui_*.png) y su fuente CurseCasual
  const UI = ['game_hud_banner', 'game_hud_banner_top', 'game_hud_moves', 'booster_round_back', 'booster_frame', 'booster_round_hammer', 'booster_round_rocket',
    'booster_round_blaster', 'booster_round_colourpop', 'btn_green', 'btn_grey', 'btn_gold', 'btn_hard', 'btn_superhard', 'btn_secondary', 'btn_primary', 'btn_red',
    'menu_blue_button', 'popup_normal_background_white', 'ribbon_long', 'settings', 'default_start_bg', 'default_start_cloud', 'game_hud_star_full', 'game_hud_star_empty'];
  Rl.images = Rl.images.concat(UI.map((n) => 'ui_' + n));
  Rl.font = 'font.ttf';
  Rl.theme = Object.assign({}, O.theme, { accent: '#21a3f0', ribbon: '#e8459a', hudText: '#1d3d7a', hudLabel: '#1d3d7a', movesColor: '#ffffff', movesStroke: '#0f3a85', popText: '#1d3d7a' });
  const img = (n) => E.img('ui_' + n);
  // fondo: el prado de la pantalla de inicio de Pet Rescue con su cielo
  Rl.playBg = (g, w, h) => {
    const im = img('default_start_bg'); if (!im) return O.playBg(g, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h * 0.4); gr.addColorStop(0, '#5fc4ff'); gr.addColorStop(1, '#c9ecff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const s = Math.max(w / im.width, (h * 0.75) / im.height); g.drawImage(im, (w - im.width * s) / 2, h - im.height * s, im.width * s, im.height * s);
    const cl = img('default_start_cloud'); if (cl) for (const [x, y, k] of [[0.12, 0.05, 1.2], [0.7, 0.1, 1.5]]) g.drawImage(cl, w * x, h * y, cl.width * k, cl.height * k);
  };
  // cabecera: banda crema de Pet Rescue con la franja azul arriba, caja de movimientos azul y aro dorado del retrato
  Rl.hud = (g, W, H) => {
    const bn = img('game_hud_banner'), top = img('game_hud_banner_top');
    if (!bn) return O.hud(g, W, H);
    E.nine(g, bn, 2, -24, W - 4, H + 18, 50, 50);
    if (top) for (let x = 20; x < W - 20; x += top.width) g.drawImage(top, x, -24, top.width, 30);
    E.rr(g, 18, 46, 308, H - 62, 16); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
    // caja de movimientos azul con borde celeste (los colores de game_hud_moves)
    E.rr(g, W - 178, 44, 162, H - 58, 18); g.fillStyle = '#3fd0f5'; g.fill();
    E.rr(g, W - 172, 50, 150, H - 70, 14); const gm = g.createLinearGradient(0, 50, 0, H - 20); gm.addColorStop(0, '#2f7ee0'); gm.addColorStop(1, '#1b4fa8'); g.fillStyle = gm; g.fill();
    const ring = img('booster_round_back'), ax = W / 2 + 40, ay = H / 2 - 4; if (ring) g.drawImage(ring, ax - 60, ay - 60, 120, 120);
  };
  // tablero sin marco, como en Pet Rescue: un velo claro detrás de los bloques
  Rl.board = (g, x, y, w, h) => { E.rr(g, x - 6, y - 6, w + 12, h + 12, 18); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill(); };
  Rl.bar = (g, y, W, H) => { const bn = img('game_hud_banner'); if (!bn) return O.bar(g, y, W, H); E.nine(g, bn, -6, y, W + 12, H + 30, 50, 50); };
  // ventanas blancas de borde azul con la cinta rosa del título
  Rl.panel = (g, x, y, w, h, opt) => { const im = img('popup_normal_background_white'); if (!im) return O.panel(g, x, y, w, h, opt); E.rr(g, x - 6, y - 6, w + 12, h + 12, 40); g.fillStyle = '#21a3f0'; g.fill(); E.nine(g, im, x, y, w, h, 44, 44); };
  Rl.ribbon = (g, x, y, w, h) => { const im = img('ribbon_long'); if (im) E.nine(g, im, x - 10, y - 4, w + 20, h + 14, 150, 80); };
  // botones de Pet Rescue: verde, rojo, dorado, gris y morado (los difíciles); los redondos, azules
  const BTN = { '#3cb93c': 'btn_green', '#e8453c': 'btn_superhard', '#e8322b': 'btn_superhard', '#d62a2a': 'btn_superhard', '#ff8a1f': 'btn_gold', '#8a5cd6': 'btn_hard', '#9aa3ad': 'btn_grey', '#8a96a3': 'btn_grey', '#b9c0c8': 'btn_grey' };
  Rl.btnStroke = (color) => ({ btn_green: '#1a6a1a', btn_superhard: '#7a1010', btn_gold: '#8a4a00', btn_hard: '#4a1070', btn_grey: '#4a4f58' })[BTN[color]] || '#0f3a85';
  Rl.button = (g, x, y, w, h, color, down, r) => {
    const round = Math.abs(w - h) < 4 || (w <= 120 && h <= 100);
    // los demás colores: el botón gris de Pet Rescue teñido de azul
    const im = round ? img('btn_secondary') : BTN[color] ? img(BTN[color]) : img('btn_grey') && E.tinted('ui_btn_grey', '#3a8ff0'); if (!im) return O.button(g, x, y, w, h, color, down, r);
    if (round) { const d = Math.min(w, h) * (down ? 0.9 : 1); g.drawImage(im, x + (w - d) / 2, y + (h - d) / 2, d, d); }
    else E.nine(g, im, x, y + (down ? 4 : 0), w, h - 4, Math.min(im.width / 2 - 1, 46), Math.min((h - 4) / 2, 46));
  };
  Rl.pauseIcon = (g, x, y, w, h) => { const b = img('btn_secondary'), s = img('settings'); if (b) g.drawImage(b, x, y, w, h); if (s) g.drawImage(s, x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6); };
  // potenciadores en su disco dorado con el dibujo de Pet Rescue
  const BICON = { hammer: 'booster_round_hammer', column: 'booster_round_rocket', row: 'booster_round_blaster', colorpop: 'booster_round_colourpop' };
  Rl.boosterIcon = (g, b, x, y, w, h, have) => {
    const back = img('booster_round_back'), ic = img(BICON[b.id]);
    if (back) g.drawImage(back, x - 2, y - 2, w + 4, h + 4);
    if (ic) { const s = Math.min((w * 0.66) / ic.width, (h * 0.66) / ic.height); g.drawImage(ic, x + (w - ic.width * s) / 2, y + (h - ic.height * s) / 2, ic.width * s, ic.height * s); } else E.emoji(g, b.icon, x + w / 2, y + h / 2, w * 0.6);
    const tx = x + w - 15, ty = y + h - 13;
    g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fillStyle = have ? '#e8322b' : '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    E.text(g, have === Infinity ? '∞' : have > 0 ? String(have) : '+', tx, ty + 1, 21, '#fff', { stroke: false });
  };
  // tiempos medidos en el Pet Rescue real (emulador, 2026-10-22): se iluminan 0,12 s y desaparecen, los de encima caen
  // a 66 casillas/s² y al llegar se pasan un 10% de casilla y vuelven
  Rl.timing = { gravity: 66, bounce: 0.1, brighten: 0.12 };
  // partículas de Pet Rescue (privado/mascotas/fx.js, exportado de effects.xml con tools/king_fx.py)
  Rl.scripts = (Rl.scripts || []).concat(['fx.js']);
  Rl.fxEvent = (name, x, y, ts) => E.kfx(name, x, y, ts / 70);
  // una música para cada modo, como en Pet Rescue
  Rl.music = { game: () => ({ score: 'music_score', classic: 'music_classic', hybrid: 'music_hybrid' })[GAME.mode] || 'music_rescue', map: 'map_music' };
  Rl.tile = function (t, ts, COLORS) {
    switch (t.kind) {
      case 'block': return t.rainbow ? spr('rainbow', ts, 1.0) : spr('b' + t.color, ts, 1.0);
      case 'roto': case 'dblast': return spr(t.kind + ((t.dir || 0) % 4), ts, 1.0);
      case 'lblast': case 'freezer': return spr(t.kind, ts, 1.0);
      case 'vflower': return spr('vflower' + ((t.dir || 0) % 4), ts, 1.0);
      case 'wall': return spr('wall', ts, 1.0);
      case 'cbomb': return spr('cb' + t.color, ts, 0.92);
      case 'paint': return spr('paint' + t.color, ts, 0.95);
      case 'fbox': case 'ibox': return spr(t.kind, ts, 1.0);
      case 'black': return spr('black', ts, 1.0);
      case 'lock': return spr('lock', ts, 0.95);
      case 'gdiam': case 'gbomb': case 'gkey': return spr(t.kind, ts, 1.0);
    }
    return O.tile(t, ts, COLORS);
  };
  Rl.images.push('timer', 'vine', 'carrierbox', 'wall'); for (let i = 0; i < 5; i++) Rl.images.push('bfly' + i); for (let d = 0; d < 4; d++) Rl.images.push('vflower' + d);
  Rl.images.push('gdiam', 'gbomb', 'gkey', 'virus', 'lblast', 'rainbow', 'freezer', 'freezer_lever'); for (let d = 0; d < 4; d++) Rl.images.push('roto' + d, 'dblast' + d); for (let i = 0; i < 5; i++) Rl.images.push('mult' + i);
  // estrella x2 del color del bloque y bola de pinchos del virus, como en Pet Rescue
  Rl.blockMarks = (g, t, s) => {
    if (t.mult) { const im = E.img('mult' + (t.color || 0)); if (im) { const k = s * 0.5; g.drawImage(im, s * 0.5 - k, -s * 0.5, k, k); if (t.mult > 2) E.text(g, 'x' + t.mult, s * 0.25, -s * 0.24, s * 0.16, '#fff', { stroke: '#1d3d7a', sw: 3 }); } }
    if (t.kind === 'freezer') { // palanca del congelador desde el centro hacia arriba a la derecha, como en el tutorial
      const im = E.img('freezer_lever'); if (im) { const h = s * 1.15, w = (h * im.width) / im.height; g.save(); g.rotate(0.66); g.drawImage(im, -w / 2, -h * 0.95, w, h); g.restore(); }
    }
    if (t.kind === 'vineCover') { const im = E.img('vine'); if (im) g.drawImage(im, -s / 2, -s / 2, s, s); return true; }
    if (t.bfly) { // mariposa de Pet Rescue batiendo las alas
      const im = E.img('bfly' + (t.color === 0 ? 3 : 0)); // roja, o amarilla sobre bloque rojo, para que destaque if (im) { const w = s * 0.82, h = (w * im.height) / im.width, k = 0.75 + Math.abs(Math.sin(E.t * 5 + (t.id || 0))) * 0.25; g.save(); g.scale(k, 1); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }
    }
    if (t.det != null) { // cronómetro del detonador con las jugadas que le quedan
      const im = E.img('timer'), r = s * 0.3, cx = -s * 0.2, cy = -s * 0.2; if (im) g.drawImage(im, cx - r, cy - r, r * 2, r * 2);
      E.text(g, String(t.det), cx, cy + 1, s * 0.32, t.det <= 1 ? '#d62828' : '#1d3d7a', { stroke: false });
    }
    if (t.virus) { const im = E.img('virus'); if (im) { const k = s * 0.48; g.drawImage(im, s * 0.5 - k, -s * 0.5, k, k); } }
    return true;
  };
  Rl.carrierBox = (g, s) => { const im = E.img('carrierbox'); if (!im) return false; const h = s * 1.0, w = (h * im.width) / im.height; g.drawImage(im, -w / 2, -h / 2, w, h); return true; };
  Rl.cage = (g, w, h, hp) => fit('cage', 1.0)(g, w, h);
  Rl.wire = (g, w, h, n) => fit(n >= 2 ? 'mesh2' : 'mesh1', 1.02)(g, w, h);
})();

// ================================================================ 'nueva': patio andaluz (azulejos con dibujos de animales)
(function () {
  const N = (GAME.skins.nueva = Object.assign({}, NUEVA, { emoji: Object.assign({}, NUEVA.emoji) }));
  const BASE = ['#e23b3b', '#2f7fe0', '#3fb35a', '#f2b51a', '#9b4fd6'];
  const INK = '#fbf7ee';
  function paintSym(g, color, cx, cy, s, dark) {
    g.save(); g.lineJoin = 'round';
    g.beginPath();
    if (color === 0) { g.moveTo(cx, cy + s * 0.85); g.bezierCurveTo(cx - s * 1.35, cy - s * 0.05, cx - s * 0.6, cy - s * 1.15, cx, cy - s * 0.42); g.bezierCurveTo(cx + s * 0.6, cy - s * 1.15, cx + s * 1.35, cy - s * 0.05, cx, cy + s * 0.85); }
    else if (color === 1) { g.ellipse(cx, cy + s * 0.35, s * 0.55, s * 0.45, 0, 0, 7); for (const [dx, dy] of [[-0.68, -0.25], [-0.26, -0.72], [0.26, -0.72], [0.68, -0.25]]) { g.moveTo(cx + dx * s + s * 0.23, cy + dy * s); g.arc(cx + dx * s, cy + dy * s, s * 0.23, 0, 7); } }
    else if (color === 2) { g.ellipse(cx, cy, s * 0.8, s * 0.32, -0.6, 0, 7); for (const [x, y] of [[-0.6, 0.55], [-0.85, 0.25], [0.6, -0.55], [0.85, -0.25]]) { g.moveTo(cx + x * s + s * 0.24, cy + y * s); g.arc(cx + x * s, cy + y * s, s * 0.24, 0, 7); } }
    else if (color === 3) { for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? s * 0.7 : s; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
    else { g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.8, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.8, cy); g.closePath(); }
    g.lineWidth = s * 0.16; g.strokeStyle = dark; g.stroke(); g.fillStyle = INK; g.fill('nonzero');
    g.restore();
  }
  function tile(g, w, h, color) {
    const base = BASE[color], r = w * 0.16;
    E.rr(g, w * 0.03, h * 0.05, w * 0.94, h * 0.93, r); g.fillStyle = '#d9b48a'; g.fill();
    E.rr(g, w * 0.03, h * 0.03, w * 0.94, h * 0.9, r);
    const gr = g.createRadialGradient(w * 0.35, h * 0.3, w * 0.05, w / 2, h / 2, w * 0.75); gr.addColorStop(0, E.shade(base, 0.35)); gr.addColorStop(0.55, base); gr.addColorStop(1, E.shade(base, -0.3));
    g.fillStyle = gr; g.fill();
    E.rr(g, w * 0.1, h * 0.09, w * 0.8, h * 0.78, r * 0.6); g.lineWidth = w * 0.03; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
    paintSym(g, color, w / 2, h * 0.48, w * 0.24, E.shade(base, -0.55));
    g.beginPath(); g.ellipse(w * 0.3, h * 0.2, w * 0.18, h * 0.06, -0.5, 0, 7); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
  }
  N.tile = function (t, ts) {
    if (t.kind === 'block') return E.sprite('nb' + t.color, ts, ts, (g, w, h) => tile(g, w, h, t.color));
    return null;
  };
  N.board = function (g, x, y, w, h) {
    E.rr(g, x - 12, y - 12, w + 24, h + 24, 16); g.fillStyle = '#fbf7ee'; g.fill();
    E.rr(g, x - 7, y - 7, w + 14, h + 14, 12); g.fillStyle = '#1f4fa8'; g.fill();
    E.rr(g, x - 3, y - 3, w + 6, h + 6, 9); g.fillStyle = '#eef2fa'; g.fill();
  };
})();
