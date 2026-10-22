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
  N.push('cbomb', 'choc', 'lock', 'key', 'cherry', 'jelly');
  const fit = (name, k) => (g, w, h) => {
    const im = E.img(name); if (!im) return;
    const s = Math.min((w * k) / im.width, (h * k) / im.height);
    g.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s);
  };
  const spr = (n, ts, k) => E.sprite('img' + n, ts, ts, fit(n, k));
  const Rl = (GAME.skins.real = Object.assign({}, O, { images: N, emoji: Object.assign({}, O.emoji) }));
  Rl.tile = function (t, ts, COLORS) {
    const hp = (v) => Math.max(1, Math.min(5, v));
    if (t.kind === 'candy' && t.sp !== 'w' && t.sp !== 'f') return spr('c' + t.color + (t.sp || ''), ts, 0.9);
    if (t.kind === 'bomb') return spr('cbomb', ts, 0.92);
    if (t.kind === 'ice') { const v = hp(t.vhp != null ? t.vhp : t.hp); if (t.choc) return spr('choc', ts, 0.98); return spr((t.waffle ? 'waffle' : 'ice') + v, ts, 0.98); }
    if (t.kind === 'slock') return spr('slock' + hp(t.vhp != null ? t.vhp : t.hp), ts, 0.98);
    return O.tile(t, ts, COLORS);
  };
  Rl.jelly = (g, w, h, level) => { g.globalAlpha = level >= 2 ? 1 : 0.65; fit('jelly', 1.04)(g, w, h); g.globalAlpha = 1; };
  Rl.lock = fit('lock', 1.0);
  Object.assign(Rl.emoji, { '🌈': fit('cbomb', 0.95), '🔑': fit('key', 0.95), '🍒': fit('cherry', 0.95), '〰️': fit('c4h', 0.95) });
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
