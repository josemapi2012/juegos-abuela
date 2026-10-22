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
// Estilos gráficos de Burbujas Panda (todo dibujado con el canvas, sin imágenes del juego original).
// 'original': imita Panda Pop (burbujas brillantes con su elemento, bosque de bambú, interfaz de bambú y madera).
GAME.skins = {};

// dibujos de los elementos de cada color: llama, gota, hoja, sol, cristal y flor
function burbujaSimbolo(g, color, cx, cy, s) {
  g.beginPath();
  switch (color) {
    case 0: g.moveTo(cx, cy - s); g.bezierCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.7, cy + s * 0.9, cx, cy + s * 0.9); g.bezierCurveTo(cx - s * 0.7, cy + s * 0.9, cx - s * 0.9, cy - s * 0.1, cx - s * 0.25, cy - s * 0.45); g.bezierCurveTo(cx - s * 0.2, cy, cx, cy + s * 0.05, cx, cy - s); break;
    case 1: g.moveTo(cx, cy - s); g.bezierCurveTo(cx + s * 0.4, cy - s * 0.4, cx + s * 0.75, cy + s * 0.05, cx + s * 0.7, cy + s * 0.35); g.arc(cx, cy + s * 0.32, s * 0.7, 0, Math.PI); g.bezierCurveTo(cx - s * 0.75, cy + s * 0.05, cx - s * 0.4, cy - s * 0.4, cx, cy - s); break;
    case 2: g.moveTo(cx - s * 0.8, cy + s * 0.8); g.bezierCurveTo(cx - s * 0.9, cy - s * 0.4, cx + s * 0.2, cy - s, cx + s * 0.9, cy - s * 0.9); g.bezierCurveTo(cx + s * 0.9, cy + s * 0.1, cx + s * 0.3, cy + s * 0.9, cx - s * 0.8, cy + s * 0.8); break;
    case 3: g.arc(cx, cy, s * 0.48, 0, 7); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.moveTo(cx + Math.cos(a - 0.2) * s * 0.62, cy + Math.sin(a - 0.2) * s * 0.62); g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); g.lineTo(cx + Math.cos(a + 0.2) * s * 0.62, cy + Math.sin(a + 0.2) * s * 0.62); g.closePath(); } break;
    case 4: g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.75, cy - s * 0.2); g.lineTo(cx + s * 0.45, cy + s * 0.9); g.lineTo(cx - s * 0.45, cy + s * 0.9); g.lineTo(cx - s * 0.75, cy - s * 0.2); g.closePath(); break;
    default: for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; g.moveTo(cx + Math.cos(a) * s * 0.5 + s * 0.42, cy + Math.sin(a) * s * 0.5); g.arc(cx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5, s * 0.42, 0, 7); }
  }
}

(function () {
  const O = (GAME.skins.original = {});
  const BAMBOO = '#7fbf3a', BAMBOO_D = '#3f7a1a', WOOD = '#8a5a2b';
  O.theme = { accent: '#ff5c8a', ribbon: '#3f7a1a', hudText: '#3f5a1a', bar: '#5a8a2a', panel: { top: '#fbfff0', bottom: '#e4f2c8' } };
  O.bubble = function (g, w, h, color, COLORS) {
    const cx = w / 2, cy = h / 2, R = w * 0.47;
    if (color === 'bomb') {
      g.beginPath(); g.arc(cx, cy, R, 0, 7); const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R); gr.addColorStop(0, '#6a6a7a'); gr.addColorStop(1, '#16161e'); g.fillStyle = gr; g.fill();
      g.beginPath(); g.moveTo(cx + R * 0.3, cy - R * 0.7); g.quadraticCurveTo(cx + R * 0.6, cy - R * 1.1, cx + R * 0.85, cy - R * 0.85); g.lineWidth = w * 0.05; g.strokeStyle = '#a07a4a'; g.stroke(); E.star(g, cx + R * 0.85, cy - R * 0.85, w * 0.1, '#ffd23f');
      g.beginPath(); g.ellipse(cx - R * 0.4, cy - R * 0.4, R * 0.2, R * 0.1, -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); return;
    }
    g.beginPath(); g.arc(cx, cy, R, 0, 7);
    if (color === 'rainbow') { const lg = g.createLinearGradient(0, 0, w, h); COLORS.forEach((c, i) => lg.addColorStop(i / 5, c)); g.fillStyle = lg; }
    else { const base = COLORS[color], gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R); gr.addColorStop(0, E.shade(base, 0.65)); gr.addColorStop(0.5, base); gr.addColorStop(0.92, E.shade(base, -0.3)); gr.addColorStop(1, E.shade(base, 0.15)); g.fillStyle = gr; }
    g.fill();
    if (typeof color === 'number') { burbujaSimbolo(g, color, cx, cy + h * 0.03, w * 0.22); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
    // brillo de pompa: arco claro arriba a la izquierda y punto
    g.beginPath(); g.arc(cx, cy, R * 0.78, Math.PI * 1.08, Math.PI * 1.5); g.lineWidth = w * 0.07; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
    g.beginPath(); g.arc(cx + R * 0.45, cy + R * 0.45, w * 0.04, 0, 7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
  };
  // zona de juego: marco de bambú
  O.board = function (g, a) {
    E.rr(g, a.x - 8, a.y - 10, a.w + 16, a.h + 16, 18); g.fillStyle = 'rgba(20,60,20,0.25)'; g.fill();
    g.fillStyle = BAMBOO; g.fillRect(a.x - 10, a.y - 12, a.w + 20, 10);
    g.fillStyle = BAMBOO_D; for (let x = a.x; x < a.x + a.w; x += 70) g.fillRect(x, a.y - 12, 4, 10);
  };
  O.playBg = function (g, w, h) {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfe8a0'); gr.addColorStop(1, '#5fae3a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // cañas de bambú al fondo
    for (let i = 0; i < 9; i++) {
      const x = (i * 83 + 20) % w, wd = 18 + (i % 3) * 6;
      g.fillStyle = i % 2 ? 'rgba(90,150,50,0.55)' : 'rgba(120,180,70,0.55)'; g.fillRect(x, 0, wd, h);
      g.fillStyle = 'rgba(40,90,20,0.45)'; for (let y = (i * 37) % 120; y < h; y += 120) g.fillRect(x - 2, y, wd + 4, 6);
      g.beginPath(); g.ellipse(x + wd + 18, ((i * 211) % h), 22, 7, -0.5, 0, 7); g.fillStyle = 'rgba(70,140,40,0.6)'; g.fill();
    }
  };
  O.panel = function (g, x, y, w, h, opt) {
    const r = opt.r || 24;
    E.rr(g, x + 2, y + 8, w, h, r); g.fillStyle = 'rgba(30,40,10,0.3)'; g.fill();
    E.rr(g, x, y, w, h, r); g.fillStyle = WOOD; g.fill();
    E.rr(g, x + 6, y + 6, w - 12, h - 12, r - 4); g.fillStyle = BAMBOO; g.fill();
    g.fillStyle = BAMBOO_D; for (let yy = y + 30; yy < y + h - 10; yy += 60) { g.fillRect(x + 6, yy, 10, 4); g.fillRect(x + w - 16, yy, 10, 4); }
    E.rr(g, x + 16, y + 16, w - 32, h - 32, Math.max(8, r - 10));
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, (opt && opt.top) || '#fbfff0'); gr.addColorStop(1, (opt && opt.bottom) || '#e4f2c8'); g.fillStyle = gr; g.fill();
  };
  O.button = function (g, x, y, w, h, color, down, r) {
    const oy = down ? 4 : 0;
    if (!down) { E.rr(g, x, y + 9, w, h - 6, r); g.fillStyle = 'rgba(30,40,10,0.3)'; g.fill(); }
    E.rr(g, x - 2, y + oy - 2, w + 4, h - 3, r + 2); g.fillStyle = WOOD; g.fill();
    E.rr(g, x + 1, y + oy + 1, w - 2, h - 10, r);
    const gr = g.createLinearGradient(0, y + oy, 0, y + oy + h - 9); gr.addColorStop(0, E.shade(color, 0.35)); gr.addColorStop(1, E.shade(color, -0.2)); g.fillStyle = gr; g.fill();
    E.rr(g, x + w * 0.08, y + oy + 5, w * 0.84, (h - 9) * 0.3, Math.max(4, r * 0.6)); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  };
  O.hud = function (g, W, H) {
    E.rr(g, 4, -20, W - 8, H + 14, 24); g.fillStyle = WOOD; g.fill();
    E.rr(g, 9, -16, W - 18, H + 6, 20); g.fillStyle = BAMBOO; g.fill();
    g.fillStyle = BAMBOO_D; for (let x = 60; x < W; x += 120) g.fillRect(x, 0, 5, H - 12);
    const box = (x, w) => { E.rr(g, x, 46, w, H - 62, 16); g.fillStyle = '#fbfff0'; g.fill(); g.lineWidth = 3; g.strokeStyle = WOOD; g.stroke(); };
    box(18, 308); box(W - 176, 158);
    const ax = W / 2 + 40, ay = H / 2 - 4;
    g.beginPath(); g.arc(ax, ay, 54, 0, 7); g.fillStyle = WOOD; g.fill(); g.beginPath(); g.arc(ax, ay, 49, 0, 7); g.fillStyle = '#e8f6d8'; g.fill();
  };
  O.bar = function (g, y, W, H) {
    g.fillStyle = WOOD; g.fillRect(0, y, W, H);
    g.fillStyle = 'rgba(60,30,10,0.35)'; for (let yy = y + 20; yy < y + H; yy += 26) g.fillRect(0, yy, W, 3);
    g.fillStyle = BAMBOO; g.fillRect(0, y, W, 10); g.fillStyle = BAMBOO_D; for (let x = 40; x < W; x += 90) g.fillRect(x, y, 4, 10);
  };
  O.boosterIcon = function (g, b, x, y, w, h, have) {
    E.emoji(g, b.icon, x + w / 2, y + h / 2 - 2, w * 0.6);
    const tx = x + w - 15, ty = y + h - 13;
    g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fillStyle = have ? '#ff5c8a' : '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    E.text(g, have === Infinity ? '∞' : have > 0 ? String(have) : '+', tx, ty + 1, 21, '#fff', { stroke: false });
  };
  // mapa: bosque de bambú con farolillos
  Object.assign(O, SKIN_MAPA({
    zones: [['#bfe8a0', '#6fbf4a'], ['#ffd6e6', '#f59ac0'], ['#c8f5d0', '#7ed694'], ['#fff0b3', '#f5cf5a'], ['#e0d0ff', '#a98af0']],
    path: ['#f6e7c0', '#a07a4a'], node: '#3f7a1a', cur: '#ff5c8a', rim: '#8a5a2b', header: ['#7fbf3a', '#3f7a1a'], line: '#8a5a2b',
    decor(g, x, y, i) { // cañas de bambú o farolillo
      if (i % 2) { for (let k = -1; k <= 1; k++) { g.fillStyle = '#6fae3a'; g.fillRect(x + k * 20 - 7, y - 60, 14, 130); g.fillStyle = '#3f7a1a'; for (let yy = y - 40; yy < y + 70; yy += 40) g.fillRect(x + k * 20 - 9, yy, 18, 5); } }
      else { g.strokeStyle = '#5a3a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 50); g.lineTo(x, y - 30); g.stroke(); E.rr(g, x - 24, y - 30, 48, 62, 22); g.fillStyle = '#e8322b'; g.fill(); g.fillStyle = '#ffd23f'; g.fillRect(x - 18, y - 32, 36, 6); g.fillRect(x - 18, y + 28, 36, 6); }
    },
  }));
})();

// ================================================================ 'real' (en Ajustes: "Original")
// Burbujas de Panda Pop que solo están en la tablet (privado/, dentro del APK; nunca se publican).
(function () {
  const O = GAME.skins.original;
  const MAP = { 0: 'b0', 1: 'b1', 2: 'b2', 3: 'b3', 4: 'b4', 5: 'b5', rainbow: 'rainbow', metal: 'metal', spike: 'spike', smoke: 'smoke', gift: 'gift' };
  const Rl = (GAME.skins.real = Object.assign({}, O, { images: ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'rainbow', 'metal', 'spike', 'smoke', 'gift', 'crystal'] }));
  Rl.bubbleImg = (color) => MAP[color] || null;
})();

// ================================================================ 'nueva': patio andaluz (bolas de cerámica pintadas)
(function () {
  const N = (GAME.skins.nueva = Object.assign({}, NUEVA, { emoji: Object.assign({}, NUEVA.emoji) }));
  N.theme = Object.assign({}, NUEVA.theme, { mascot: '👵' });
  N.bubble = function (g, w, h, color, COLORS) {
    const cx = w / 2, cy = h / 2, R = w * 0.46;
    g.beginPath(); g.arc(cx, cy + h * 0.02, R, 0, 7); g.fillStyle = '#d9b48a'; g.fill();
    g.beginPath(); g.arc(cx, cy, R, 0, 7);
    if (color === 'rainbow') { const lg = g.createLinearGradient(0, 0, w, h); COLORS.forEach((c, i) => lg.addColorStop(i / 5, c)); g.fillStyle = lg; }
    else if (color === 'bomb') g.fillStyle = '#c0281f';
    else { const base = COLORS[color], gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R); gr.addColorStop(0, E.shade(base, 0.4)); gr.addColorStop(0.6, base); gr.addColorStop(1, E.shade(base, -0.3)); g.fillStyle = gr; }
    g.fill();
    g.beginPath(); g.arc(cx, cy, R * 0.82, 0, 7); g.lineWidth = w * 0.025; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke();
    if (typeof color === 'number') { burbujaSimbolo(g, color, cx, cy + h * 0.02, w * 0.22); g.lineWidth = w * 0.035; g.lineJoin = 'round'; g.strokeStyle = E.shade(COLORS[color], -0.55); g.stroke(); g.fillStyle = '#fbf7ee'; g.fill(); }
    if (color === 'bomb') { g.fillStyle = '#ffd23f'; for (let i = -1; i <= 1; i++) g.fillRect(cx + i * R * 0.45 - w * 0.03, cy - R * 0.85, w * 0.06, R * 1.7); }
    g.beginPath(); g.ellipse(cx - R * 0.4, cy - R * 0.45, R * 0.22, R * 0.1, -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
  };
  N.board = function (g, a) {
    E.rr(g, a.x - 8, a.y - 10, a.w + 16, a.h + 16, 16); g.fillStyle = 'rgba(251,247,238,0.75)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = '#1f4fa8'; g.stroke();
  };
})();
