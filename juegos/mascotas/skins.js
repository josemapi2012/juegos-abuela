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
// Los animalitos de Pet Rescue son texturas 3D y no sirven: siguen como en 'original'.
(function () {
  const O = GAME.skins.original;
  const N = [];
  for (let i = 0; i < 5; i++) N.push('b' + i, 'cb' + i, 'paint' + i);
  N.push('carrier1', 'carrier2', 'carrier3', 'ibox', 'fbox', 'black', 'lock', 'mesh1', 'mesh2', 'cage');
  const fit = (name, k) => (g, w, h) => {
    const im = E.img(name); if (!im) return;
    const s = Math.min((w * k) / im.width, (h * k) / im.height);
    g.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s);
  };
  const spr = (n, ts, k) => E.sprite('img' + n, ts, ts, fit(n, k));
  const Rl = (GAME.skins.real = Object.assign({}, O, { images: N }));
  Rl.tile = function (t, ts, COLORS) {
    switch (t.kind) {
      case 'block': return spr('b' + t.color, ts, 1.0);
      case 'cbomb': return spr('cb' + t.color, ts, 0.92);
      case 'paint': return spr('paint' + t.color, ts, 0.95);
      case 'fbox': case 'ibox': return spr(t.kind, ts, 1.0);
      case 'black': return spr('black', ts, 1.0);
      case 'lock': return spr('lock', ts, 0.95);
    }
    return O.tile(t, ts, COLORS);
  };
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
