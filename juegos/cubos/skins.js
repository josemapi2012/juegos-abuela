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
// Estilos gráficos de Cubos Locos. Todo está dibujado a mano con el canvas (no hay imágenes del juego original).
// 'original': imita el aspecto de Toy Blast (cubos de juguete en relieve, interfaz turquesa, habitaciones).
// 'nueva': estilo propio.
GAME.skins = {};

(function () {
  const TEAL = '#2f7f8f', TEAL_D = '#1b4f5a', TEAL_L = '#5fb3bf', CREAM = '#fff4d8', GOLD = '#e8c26a';

  // ---------------------------------------------------------------- piezas
  // cubo de juguete como los de Toy Blast: cara con vetas, canto inferior y un dibujo grabado.
  // Cada color lleva su dibujo (aro, estrella, luna, cuadrado, hexágono, triángulo); cuando el grupo va a dar
  // un especial, el dibujo cambia al de ese especial (cohete, detonador o cubo de puzle).
  function iconPath(g, kind, cx, cy, s) {
    g.beginPath();
    switch (kind) {
      case 0: g.arc(cx, cy, s * 0.82, 0, 7); g.moveTo(cx + s * 0.42, cy); g.arc(cx, cy, s * 0.42, 0, 7, true); break; // aro
      case 1: for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.5 : s * 1.02; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); break; // estrella
      case 2: g.arc(cx, cy, s * 0.85, 0.35 * Math.PI, 1.75 * Math.PI); g.arc(cx + s * 0.42, cy - s * 0.25, s * 0.7, 1.55 * Math.PI, 0.55 * Math.PI, true); g.closePath(); break; // luna
      default: break;
    }
  }
  function strokeIcon(g, kind, cx, cy, s) {
    g.beginPath();
    if (kind === 3) E.rr(g, cx - s * 0.72, cy - s * 0.72, s * 1.44, s * 1.44, s * 0.18);
    else if (kind === 4) for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; g.lineTo(cx + Math.cos(a) * s * 0.85, cy + Math.sin(a) * s * 0.85); }
    else if (kind === 5) { g.moveTo(cx, cy - s * 0.82); g.lineTo(cx + s * 0.85, cy + s * 0.68); g.lineTo(cx - s * 0.85, cy + s * 0.68); g.closePath(); }
    else if (kind === 'rocket') { // cohete inclinado: cuerpo, ventanita y dos aletas
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
      g.ellipse(0, -s * 0.1, s * 0.34, s * 0.78, 0, 0, 7);
      g.moveTo(s * 0.14, -s * 0.2); g.arc(0, -s * 0.2, s * 0.14, 0, 7);
      g.moveTo(-s * 0.3, s * 0.3); g.lineTo(-s * 0.62, s * 0.8); g.lineTo(-s * 0.2, s * 0.6);
      g.moveTo(s * 0.3, s * 0.3); g.lineTo(s * 0.62, s * 0.8); g.lineTo(s * 0.2, s * 0.6);
      g.restore();
    }
    else if (kind === 'bomb') { E.rr(g, cx - s * 0.75, cy - s * 0.25, s * 1.5, s * 0.95, s * 0.12); g.moveTo(cx, cy - s * 0.25); g.lineTo(cx, cy - s * 0.65); g.moveTo(cx - s * 0.4, cy - s * 0.65); g.lineTo(cx + s * 0.4, cy - s * 0.65); g.rect(cx - s * 0.42, cy + s * 0.02, s * 0.84, s * 0.4); }
    else if (kind === 'disco') { const k = s * 0.8; g.moveTo(cx, cy - k); g.lineTo(cx + k, cy - k * 0.5); g.lineTo(cx + k, cy + k * 0.55); g.lineTo(cx, cy + k); g.lineTo(cx - k, cy + k * 0.55); g.lineTo(cx - k, cy - k * 0.5); g.closePath(); g.moveTo(cx - k, cy - k * 0.5); g.lineTo(cx, cy); g.lineTo(cx + k, cy - k * 0.5); g.moveTo(cx, cy); g.lineTo(cx, cy + k); }
  }
  function toyCube(g, w, h, base, kind) {
    const r = w * 0.2, side = h * 0.1;
    // canto inferior y laterales más oscuros
    E.rr(g, w * 0.02, h * 0.03, w * 0.96, h * 0.95, r); g.fillStyle = E.shade(base, -0.55); g.fill();
    E.rr(g, w * 0.03, h * 0.03, w * 0.94, h * 0.93 - side * 0.4, r);
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, E.shade(base, -0.05)); gr.addColorStop(1, E.shade(base, -0.38));
    g.fillStyle = gr; g.fill();
    // cara de arriba
    E.rr(g, w * 0.06, h * 0.035, w * 0.88, h * 0.82 - side * 0.3, r * 0.85);
    gr = g.createRadialGradient(w * 0.42, h * 0.3, w * 0.05, w * 0.5, h * 0.45, w * 0.62);
    gr.addColorStop(0, E.shade(base, 0.3)); gr.addColorStop(0.65, E.shade(base, 0.05)); gr.addColorStop(1, E.shade(base, -0.15));
    g.fillStyle = gr; g.fill();
    // vetas suaves
    g.save(); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = w * 0.025;
    for (let i = 0; i < 4; i++) { const y = h * (0.18 + i * 0.17); g.beginPath(); g.moveTo(w * 0.05, y); g.bezierCurveTo(w * 0.35, y - h * 0.07, w * 0.6, y + h * 0.08, w * 0.95, y - h * 0.02); g.stroke(); }
    g.restore();
    // borde de luz arriba
    E.rr(g, w * 0.14, h * 0.05, w * 0.72, h * 0.05, h * 0.025); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    // dibujo grabado: luz abajo, hueco oscuro encima
    const cx = w / 2, cy = h * 0.44, s = w * 0.27, lw = w * 0.07;
    if (typeof kind === 'number' && kind <= 2) {
      iconPath(g, kind, cx, cy + w * 0.022, s); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill('evenodd');
      iconPath(g, kind, cx, cy, s); g.fillStyle = E.shade(base, -0.33); g.fill('evenodd');
      iconPath(g, kind, cx, cy + w * 0.012, s * 0.9); g.fillStyle = E.shade(base, -0.12); g.fill('evenodd');
    } else {
      g.lineJoin = 'round'; g.lineCap = 'round';
      strokeIcon(g, kind, cx, cy + w * 0.022, s); g.lineWidth = lw; g.strokeStyle = 'rgba(255,255,255,0.32)'; g.stroke();
      strokeIcon(g, kind, cx, cy, s); g.lineWidth = lw; g.strokeStyle = E.shade(base, -0.38); g.stroke();
    }
  }
  // cohete doble plateado de punta roja (horizontal), centrado en (0,0) y de largo s
  function rocketPair(g, s) {
    const L = s * 0.5, R = s * 0.25;
    for (const sg of [-1, 1]) {
      g.save(); g.scale(sg, 1);
      // aletas rojas
      g.fillStyle = '#d9342b';
      g.beginPath(); g.moveTo(L * 0.25, -R * 0.7); g.quadraticCurveTo(L * 0.5, -R * 1.9, L * 0.75, -R * 1.6); g.lineTo(L * 0.6, -R * 0.6); g.fill();
      g.beginPath(); g.moveTo(L * 0.25, R * 0.7); g.quadraticCurveTo(L * 0.5, R * 1.9, L * 0.75, R * 1.6); g.lineTo(L * 0.6, R * 0.6); g.fill();
      // cuerpo plateado
      g.beginPath(); g.moveTo(0, -R); g.lineTo(L * 0.62, -R); g.quadraticCurveTo(L * 1.02, -R * 0.75, L, 0); g.quadraticCurveTo(L * 1.02, R * 0.75, L * 0.62, R); g.lineTo(0, R); g.closePath();
      const gr = g.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, '#e9f4ff'); gr.addColorStop(0.35, '#9fc3e6'); gr.addColorStop(1, '#4f74a0');
      g.fillStyle = gr; g.fill(); g.lineWidth = s * 0.02; g.strokeStyle = '#2f4a6e'; g.stroke();
      // punta roja
      g.save(); g.clip();
      g.fillStyle = '#e8322b'; g.fillRect(L * 0.78, -R, L * 0.3, R * 2);
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(L * 0.8, -R * 0.75, L * 0.12, R * 0.3);
      g.restore();
      g.restore();
    }
    // anillo central rojo
    E.rr(g, -s * 0.05, -R * 1.08, s * 0.1, R * 2.16, s * 0.03); g.fillStyle = '#d9342b'; g.fill(); g.lineWidth = s * 0.015; g.strokeStyle = '#7a1410'; g.stroke();
  }
  // caja de TNT con detonador (la "bomba" de Toy Blast)
  function tntBox(g, w, h) {
    const x = w * 0.1, y = h * 0.34, bw = w * 0.8, bh = h * 0.58;
    g.beginPath(); g.ellipse(w / 2, h * 0.94, w * 0.38, h * 0.05, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
    // detonador
    g.fillStyle = '#6b7178'; g.fillRect(w * 0.47, h * 0.12, w * 0.06, h * 0.25);
    E.rr(g, w * 0.2, h * 0.08, w * 0.6, h * 0.09, h * 0.04); g.fillStyle = '#ffb21a'; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#8a5a00'; g.stroke();
    E.rr(g, w * 0.16, h * 0.06, w * 0.1, h * 0.13, h * 0.03); g.fillStyle = '#e8322b'; g.fill();
    E.rr(g, w * 0.74, h * 0.06, w * 0.1, h * 0.13, h * 0.03); g.fillStyle = '#e8322b'; g.fill();
    // caja metálica
    E.rr(g, x, y, bw, bh, w * 0.1); g.fillStyle = '#3d434b'; g.fill();
    E.rr(g, x + w * 0.03, y + h * 0.02, bw - w * 0.06, bh - h * 0.07, w * 0.08);
    let gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, '#b9c1ca'); gr.addColorStop(1, '#6f7882'); g.fillStyle = gr; g.fill();
    // luces
    g.beginPath(); g.arc(x + bw * 0.18, y + bh * 0.16, w * 0.045, 0, 7); g.fillStyle = '#ff3b30'; g.fill();
    g.beginPath(); g.arc(x + bw * 0.82, y + bh * 0.16, w * 0.045, 0, 7); g.fillStyle = '#4cd964'; g.fill();
    // etiqueta
    E.rr(g, x + bw * 0.12, y + bh * 0.32, bw * 0.76, bh * 0.5, w * 0.04); g.fillStyle = '#fff'; g.fill();
    E.text(g, 'TNT', w / 2, y + bh * 0.58, w * 0.27, '#d9342b', { stroke: false, weight: '900' });
  }
  // cubo de puzle: frente de 3x3 del color del grupo y laterales de colores
  function puzzleCube(g, w, h, base, COLORS) {
    const s = w * 0.9, x0 = (w - s) / 2, y0 = (h - s) / 2, d = s * 0.1;
    E.rr(g, x0, y0, s, s, s * 0.2); g.fillStyle = '#3a2333'; g.fill();
    // laterales de colores asomando arriba y a la derecha
    const cs = (s - d * 1.6) / 3;
    for (let i = 0; i < 3; i++) {
      E.rr(g, x0 + d * 0.8 + i * cs, y0 + d * 0.15, cs - 2, d * 0.5, 2); g.fillStyle = E.shade(COLORS[(i * 2 + 1) % 6], 0.1); g.fill();
      E.rr(g, x0 + s - d * 0.65, y0 + d * 0.8 + i * cs, d * 0.5, cs - 2, 2); g.fillStyle = E.shade(COLORS[(i * 2 + 4) % 6], -0.1); g.fill();
    }
    // frente
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = x0 + d * 0.5 + i * cs, y = y0 + d * 0.8 + j * cs;
      E.rr(g, x + 1, y + 1, cs - 3, cs - 3, cs * 0.24);
      const c = (i + j) % 4 === 3 ? COLORS[(i + j * 2) % 6] : base;
      const gr = g.createLinearGradient(0, y, 0, y + cs); gr.addColorStop(0, E.shade(c, 0.35)); gr.addColorStop(1, E.shade(c, -0.15));
      g.fillStyle = gr; g.fill();
      E.rr(g, x + cs * 0.15, y + cs * 0.1, cs * 0.5, cs * 0.16, cs * 0.08); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    }
  }
  function crateShape(g, w, h, hp) {
    const p = w * 0.05;
    E.rr(g, p, p, w - 2 * p, h - 2 * p, w * 0.08); g.fillStyle = '#7a4a1e'; g.fill();
    E.rr(g, p * 1.8, p * 1.8, w - 3.6 * p, h - 3.6 * p, w * 0.05);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e7b06a'); gr.addColorStop(1, '#b57a3c');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(110,64,24,0.55)'; g.lineWidth = w * 0.02;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(p * 2, p * 2 + i * (h - 4 * p) / 4); g.lineTo(w - p * 2, p * 2 + i * (h - 4 * p) / 4); g.stroke(); }
    // tablas en cruz
    g.lineWidth = w * 0.13; g.strokeStyle = '#8d5626'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.2, h * 0.2); g.lineTo(w * 0.8, h * 0.8); g.stroke();
    if (hp > 1) { g.beginPath(); g.moveTo(w * 0.8, h * 0.2); g.lineTo(w * 0.2, h * 0.8); g.stroke(); }
    g.fillStyle = '#d8d0c0';
    for (const [x, y] of [[0.17, 0.17], [0.83, 0.17], [0.17, 0.83], [0.83, 0.83]]) { g.beginPath(); g.arc(w * x, h * y, w * 0.04, 0, 7); g.fill(); }
  }
  function balloonShape(g, w, h) {
    g.beginPath(); g.moveTo(w * 0.5, h * 0.74); g.quadraticCurveTo(w * 0.42, h * 0.86, w * 0.52, h * 0.97); g.lineWidth = w * 0.025; g.strokeStyle = '#6a6a6a'; g.stroke();
    g.beginPath(); g.ellipse(w * 0.5, h * 0.42, w * 0.32, h * 0.36, 0, 0, 7);
    const gr = g.createRadialGradient(w * 0.38, h * 0.28, w * 0.04, w * 0.5, h * 0.42, w * 0.36);
    gr.addColorStop(0, '#ff9a9a'); gr.addColorStop(0.5, '#ec2f2f'); gr.addColorStop(1, '#9c0c14');
    g.fillStyle = gr; g.fill();
    g.beginPath(); g.moveTo(w * 0.45, h * 0.79); g.lineTo(w * 0.55, h * 0.79); g.lineTo(w * 0.5, h * 0.74); g.fillStyle = '#b5121a'; g.fill();
    g.beginPath(); g.ellipse(w * 0.38, h * 0.26, w * 0.07, h * 0.11, -0.5, 0, 7); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
  }

  // ---------------------------------------------------------------- obstáculos al estilo de Toy Blast
  const shine = (g, x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, rx, ry, a || -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); };
  // caja de madera: 1 golpe tabla en diagonal, 2 con llamita grabada, 3 con cantoneras de metal
  function woodBox(g, w, h, hp) {
    E.rr(g, w * 0.04, w * 0.05, w * 0.92, h * 0.92, w * 0.1); g.fillStyle = '#6b3d14'; g.fill();
    E.rr(g, w * 0.08, w * 0.07, w * 0.84, h * 0.84, w * 0.07);
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4c56f'); gr.addColorStop(1, '#c7832f'); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(120,64,16,0.6)'; g.lineWidth = w * 0.025;
    for (let i = 1; i < 4; i++) { const y = h * (0.07 + i * 0.21); g.beginPath(); g.moveTo(w * 0.09, y); g.lineTo(w * 0.91, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = w * 0.015;
    for (let i = 0; i < 4; i++) { const y = h * (0.12 + i * 0.21); g.beginPath(); g.moveTo(w * 0.15, y); g.bezierCurveTo(w * 0.4, y - h * 0.03, w * 0.6, y + h * 0.03, w * 0.85, y); g.stroke(); }
    // marco
    g.lineWidth = w * 0.06; g.strokeStyle = '#a8621f'; E.rr(g, w * 0.11, w * 0.1, w * 0.78, h * 0.78, w * 0.05); g.stroke();
    if (hp === 1) { g.lineWidth = w * 0.14; g.strokeStyle = '#b06a24'; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.22, h * 0.78); g.lineTo(w * 0.78, h * 0.22); g.stroke(); g.lineWidth = w * 0.03; g.strokeStyle = 'rgba(255,230,180,0.5)'; g.beginPath(); g.moveTo(w * 0.24, h * 0.72); g.lineTo(w * 0.72, h * 0.24); g.stroke(); }
    if (hp >= 2) { // llamita grabada
      g.beginPath(); g.moveTo(w * 0.5, h * 0.25); g.bezierCurveTo(w * 0.7, h * 0.45, w * 0.68, h * 0.72, w * 0.5, h * 0.74); g.bezierCurveTo(w * 0.3, h * 0.72, w * 0.3, h * 0.5, w * 0.42, h * 0.42); g.bezierCurveTo(w * 0.42, h * 0.52, w * 0.48, h * 0.55, w * 0.5, h * 0.5); g.closePath();
      g.fillStyle = 'rgba(120,60,10,0.55)'; g.fill();
    }
    if (hp >= 3) { g.fillStyle = '#9aa6b2'; for (const [x, y] of [[0.06, 0.06], [0.7, 0.06], [0.06, 0.7], [0.7, 0.7]]) { E.rr(g, w * x, h * y, w * 0.24, h * 0.24, w * 0.05); g.fill(); } g.fillStyle = '#5f6b77'; for (const [x, y] of [[0.16, 0.16], [0.84, 0.16], [0.16, 0.84], [0.84, 0.84]]) { g.beginPath(); g.arc(w * x, h * y, w * 0.035, 0, 7); g.fill(); } }
  }
  function easterEgg(g, w, h, hp) {
    g.beginPath(); g.ellipse(w / 2, h * 0.92, w * 0.26, h * 0.05, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    g.beginPath(); g.moveTo(w / 2, h * 0.08); g.bezierCurveTo(w * 0.9, h * 0.1, w * 0.88, h * 0.9, w / 2, h * 0.9); g.bezierCurveTo(w * 0.12, h * 0.9, w * 0.1, h * 0.1, w / 2, h * 0.08); g.closePath();
    const choc = hp <= 1;
    const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.5);
    if (choc) { gr.addColorStop(0, '#c07a4a'); gr.addColorStop(1, '#5a2a12'); } else { gr.addColorStop(0, '#ffd6e8'); gr.addColorStop(0.6, '#f27ab0'); gr.addColorStop(1, '#c03a7a'); }
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    if (!choc) { g.fillStyle = '#ffffff'; for (const y of [0.32, 0.68]) { g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(w * (i / 8), h * y + (i % 2 ? -h * 0.04 : h * 0.04)); g.lineTo(w, h * y + h * 0.06); g.lineTo(0, h * y + h * 0.06); g.fill(); } }
    // conejito
    g.fillStyle = choc ? 'rgba(40,15,5,0.55)' : 'rgba(190,40,110,0.55)';
    g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.1, 0, 7); g.fill();
    g.beginPath(); g.ellipse(w * 0.46, h * 0.4, w * 0.035, h * 0.09, -0.2, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * 0.55, h * 0.4, w * 0.035, h * 0.09, 0.2, 0, 7); g.fill();
    g.restore();
    shine(g, w * 0.38, h * 0.27, w * 0.07, h * 0.12, 0.3);
  }
  function beachBall(g, w, h, cols, COLORS) {
    const R = w * 0.42, cx = w / 2, cy = h / 2;
    g.beginPath(); g.ellipse(cx, h * 0.93, R * 0.7, h * 0.05, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2 + i * Math.PI / 2 + 0.2, i * Math.PI / 2 + 0.2); g.closePath();
      g.fillStyle = cols[i] != null && cols[i] >= 0 ? COLORS[cols[i]] : '#f6f6f6'; g.fill();
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2 + i * Math.PI / 2 + 0.2, -Math.PI / 2 + i * Math.PI / 2 + 0.55); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    }
    g.beginPath(); g.arc(cx, cy, R, 0, 7);
    const gr = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = gr; g.fill();
    g.beginPath(); g.arc(cx, cy, w * 0.08, 0, 7); g.fillStyle = '#2fb6d8'; g.fill();
    shine(g, cx - R * 0.45, cy - R * 0.45, w * 0.09, h * 0.05);
  }
  function pumpkin(g, w, h) {
    g.beginPath(); g.ellipse(w / 2, h * 0.92, w * 0.32, h * 0.05, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    for (const [x, rx] of [[0.28, 0.2], [0.72, 0.2], [0.5, 0.24]]) {
      g.beginPath(); g.ellipse(w * x, h * 0.58, w * rx, h * 0.32, 0, 0, 7);
      const gr = g.createLinearGradient(w * (x - rx), 0, w * (x + rx), 0); gr.addColorStop(0, '#c45a06'); gr.addColorStop(0.5, '#ffa21c'); gr.addColorStop(1, '#c45a06');
      g.fillStyle = gr; g.fill();
    }
    g.fillStyle = '#4a7a1f'; E.rr(g, w * 0.45, h * 0.14, w * 0.1, h * 0.16, w * 0.03); g.fill();
    g.beginPath(); g.ellipse(w * 0.62, h * 0.22, w * 0.12, h * 0.05, -0.4, 0, 7); g.fillStyle = '#5f9a2a'; g.fill();
    shine(g, w * 0.4, h * 0.42, w * 0.06, h * 0.1, 0.2);
  }
  function gum(g, w, h, stuck) {
    E.rr(g, w * 0.07, h * 0.1, w * 0.86, h * 0.82, w * 0.25);
    const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.55); gr.addColorStop(0, '#ffd0e6'); gr.addColorStop(1, stuck ? '#d9468f' : '#f27ab8');
    g.fillStyle = gr; g.fill();
    if (stuck) { g.fillStyle = '#d9468f'; for (const x of [0.25, 0.5, 0.75]) { g.beginPath(); g.ellipse(w * x, h * 0.92, w * 0.05, h * 0.07, 0, 0, 7); g.fill(); } }
    shine(g, w * 0.32, h * 0.28, w * 0.13, h * 0.06);
  }
  function ufo(g, w, h) {
    g.beginPath(); g.ellipse(w / 2, h * 0.42, w * 0.24, h * 0.24, 0, Math.PI, 0); g.closePath();
    let gr = g.createRadialGradient(w * 0.45, h * 0.3, w * 0.02, w / 2, h * 0.38, w * 0.26); gr.addColorStop(0, '#fffde0'); gr.addColorStop(1, '#ffd23f'); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.55, w * 0.44, h * 0.17, 0, 0, 7);
    gr = g.createLinearGradient(0, h * 0.4, 0, h * 0.72); gr.addColorStop(0, '#ff9bd2'); gr.addColorStop(1, '#c2307e'); g.fillStyle = gr; g.fill();
    g.fillStyle = '#ffe36a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w * (0.18 + i * 0.16), h * 0.56, w * 0.035, 0, 7); g.fill(); }
    g.beginPath(); g.ellipse(w / 2, h * 0.72, w * 0.22, h * 0.06, 0, 0, Math.PI); g.fillStyle = '#7a1f52'; g.fill();
    shine(g, w * 0.4, h * 0.3, w * 0.06, h * 0.04);
  }
  function soap(g, w, h) {
    E.rr(g, w * 0.08, h * 0.1, w * 0.84, h * 0.8, w * 0.28);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fe8c8'); gr.addColorStop(1, '#1f9e86'); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(10,90,70,0.55)'; g.lineWidth = w * 0.04; g.lineCap = 'round';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(w / 2, h * 0.7); g.lineTo(w / 2 + i * w * 0.12, h * 0.32); g.stroke(); }
    g.beginPath(); g.arc(w / 2, h * 0.5, w * 0.26, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    shine(g, w * 0.3, h * 0.24, w * 0.12, h * 0.05);
  }
  function hive(g, w, h) {
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const y = h * (0.2 + i * 0.14), rx = w * (0.22 + Math.sin(((i + 0.5) / rows) * Math.PI) * 0.2);
      g.beginPath(); g.ellipse(w / 2, y, rx, h * 0.09, 0, 0, 7);
      const gr = g.createLinearGradient(0, y - h * 0.09, 0, y + h * 0.09); gr.addColorStop(0, '#ffcc4d'); gr.addColorStop(1, '#d98a0e'); g.fillStyle = gr; g.fill();
    }
    g.beginPath(); g.ellipse(w / 2, h * 0.66, w * 0.08, h * 0.07, 0, 0, 7); g.fillStyle = '#5a3200'; g.fill();
    // abeja
    g.beginPath(); g.ellipse(w * 0.76, h * 0.2, w * 0.1, h * 0.08, 0, 0, 7); g.fillStyle = '#ffd23f'; g.fill(); g.fillStyle = '#222'; g.fillRect(w * 0.73, h * 0.13, w * 0.03, h * 0.14); g.fillRect(w * 0.79, h * 0.13, w * 0.03, h * 0.14);
    g.beginPath(); g.ellipse(w * 0.74, h * 0.1, w * 0.06, h * 0.04, -0.5, 0, 7); g.fillStyle = 'rgba(220,240,255,0.9)'; g.fill();
  }
  function piggy(g, w, h, hp) {
    g.beginPath(); g.ellipse(w / 2, h * 0.9, w * 0.34, h * 0.05, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.56, w * 0.4, h * 0.32, 0, 0, 7);
    const gr = g.createRadialGradient(w * 0.4, h * 0.42, w * 0.05, w / 2, h * 0.56, w * 0.42); gr.addColorStop(0, '#ffd4e0'); gr.addColorStop(1, hp >= 2 ? '#d97a9a' : '#e89ab0');
    g.fillStyle = gr; g.fill();
    g.fillStyle = '#e88aa6'; g.beginPath(); g.moveTo(w * 0.25, h * 0.32); g.lineTo(w * 0.3, h * 0.14); g.lineTo(w * 0.42, h * 0.28); g.fill(); g.beginPath(); g.moveTo(w * 0.75, h * 0.32); g.lineTo(w * 0.7, h * 0.14); g.lineTo(w * 0.58, h * 0.28); g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.14, h * 0.09, 0, 0, 7); g.fillStyle = '#f2a0b8'; g.fill();
    g.fillStyle = '#8a3a52'; g.beginPath(); g.arc(w * 0.45, h * 0.62, w * 0.025, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.55, h * 0.62, w * 0.025, 0, 7); g.fill();
    g.fillStyle = '#3a1a22'; g.beginPath(); g.arc(w * 0.36, h * 0.48, w * 0.03, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.64, h * 0.48, w * 0.03, 0, 7); g.fill();
    g.fillStyle = '#7a3a4a'; g.fillRect(w * 0.42, h * 0.27, w * 0.16, h * 0.035);
    if (hp >= 2) { E.rr(g, w * 0.1, h * 0.36, w * 0.8, h * 0.08, h * 0.03); g.fillStyle = 'rgba(150,160,175,0.95)'; g.fill(); }
    shine(g, w * 0.32, h * 0.38, w * 0.07, h * 0.04);
  }
  function washer(g, w, h, stage) {
    E.rr(g, w * 0.08, h * 0.05, w * 0.84, h * 0.9, w * 0.14);
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffb0e0'); gr.addColorStop(1, '#d94aa8'); g.fillStyle = gr; g.fill();
    E.rr(g, w * 0.12, h * 0.09, w * 0.76, h * 0.17, w * 0.06); g.fillStyle = '#2fb6c8'; g.fill();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w * (0.3 + i * 0.14), h * 0.175, w * 0.04, 0, 7); g.fillStyle = i < stage ? '#7dff6a' : '#1d6f7a'; g.fill(); }
    g.beginPath(); g.arc(w / 2, h * 0.6, w * 0.27, 0, 7); g.fillStyle = '#f4f4f8'; g.fill();
    g.beginPath(); g.arc(w / 2, h * 0.6, w * 0.21, 0, 7); gr = g.createRadialGradient(w * 0.44, h * 0.54, w * 0.02, w / 2, h * 0.6, w * 0.21); gr.addColorStop(0, '#d8f4ff'); gr.addColorStop(1, '#3a9ad9'); g.fillStyle = gr; g.fill();
    shine(g, w * 0.43, h * 0.53, w * 0.06, h * 0.03);
  }
  function toaster(g, w, h) {
    g.fillStyle = '#d99a52'; E.rr(g, w * 0.24, h * 0.1, w * 0.22, h * 0.3, w * 0.05); g.fill(); E.rr(g, w * 0.54, h * 0.1, w * 0.22, h * 0.3, w * 0.05); g.fill();
    E.rr(g, w * 0.08, h * 0.28, w * 0.84, h * 0.64, w * 0.18);
    const gr = g.createLinearGradient(0, h * 0.28, 0, h * 0.92); gr.addColorStop(0, '#9fe6f2'); gr.addColorStop(1, '#2f9fb8'); g.fillStyle = gr; g.fill();
    g.fillStyle = '#1d5f70'; E.rr(g, w * 0.2, h * 0.3, w * 0.28, h * 0.05, h * 0.02); g.fill(); E.rr(g, w * 0.52, h * 0.3, w * 0.28, h * 0.05, h * 0.02); g.fill();
    E.rr(g, w * 0.16, h * 0.5, w * 0.68, h * 0.14, h * 0.05); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
    g.fillStyle = '#ff6a2b'; g.beginPath(); g.arc(w * 0.78, h * 0.78, w * 0.05, 0, 7); g.fill();
  }
  function cuckoo(g, w, h) {
    g.beginPath(); g.moveTo(w * 0.5, h * 0.05); g.lineTo(w * 0.94, h * 0.36); g.lineTo(w * 0.06, h * 0.36); g.closePath(); g.fillStyle = '#7a3d14'; g.fill();
    E.rr(g, w * 0.14, h * 0.32, w * 0.72, h * 0.6, w * 0.06); const gr = g.createLinearGradient(0, h * 0.32, 0, h); gr.addColorStop(0, '#c98545'); gr.addColorStop(1, '#8a4d1c'); g.fillStyle = gr; g.fill();
    g.beginPath(); g.arc(w / 2, h * 0.6, w * 0.2, 0, 7); g.fillStyle = '#fff8e6'; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#5a2d0c'; g.stroke();
    g.beginPath(); g.moveTo(w / 2, h * 0.6); g.lineTo(w / 2, h * 0.47); g.moveTo(w / 2, h * 0.6); g.lineTo(w * 0.6, h * 0.64); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(w / 2, h * 0.24, w * 0.06, 0, 7); g.fill();
  }
  function bubbleOv(g, w, h) {
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7);
    const gr = g.createRadialGradient(w * 0.42, h * 0.38, w * 0.1, w / 2, h / 2, w * 0.48);
    gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.8, 'rgba(200,235,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0.8)');
    g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.025; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.38, Math.PI * 1.1, Math.PI * 1.45); g.lineWidth = w * 0.05; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.arc(w * 0.72, h * 0.72, w * 0.04, 0, 7); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
  }
  const OBS_ORIG = {
    box: (t) => ['box' + t.hp, (g, w, h) => woodBox(g, w, h, t.hp)],
    egg: (t) => ['egg' + t.hp, (g, w, h) => easterEgg(g, w, h, t.hp)],
    pumpkin: () => ['pumpkin', pumpkin],
    gum: (t) => ['gum' + (t.stuck ? 1 : 0), (g, w, h) => gum(g, w, h, t.stuck)],
    ufo: () => ['ufo', ufo],
    soap: () => ['soap', soap],
    hive: () => ['hive', hive],
    piggy: (t) => ['piggy' + t.hp, (g, w, h) => piggy(g, w, h, t.hp)],
    washer: (t) => ['washer' + (t.stage || 0), (g, w, h) => washer(g, w, h, t.stage || 0)],
    toaster: () => ['toaster', toaster],
    cuckoo: () => ['cuckoo', cuckoo],
  };
  // ---------------------------------------------------------------- herramientas de la barra (estilo Toy Blast)
  function gear(g, w, h) {
    const cx = w / 2, cy = h / 2, R = w * 0.36;
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? R * 0.78 : R; g.lineTo(cx + Math.cos(a - 0.1) * r, cy + Math.sin(a - 0.1) * r); g.lineTo(cx + Math.cos(a + 0.1) * r, cy + Math.sin(a + 0.1) * r); } g.closePath();
    g.fillStyle = '#2f7f8f'; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#1b4f5a'; g.stroke();
    g.beginPath(); g.arc(cx, cy, R * 0.38, 0, 7); g.fillStyle = '#f3e2b8'; g.fill(); g.stroke();
  }
  function toolHammer(g, w, h) {
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.6);
    E.rr(g, -w * 0.06, -h * 0.05, w * 0.12, h * 0.48, w * 0.05); let gr = g.createLinearGradient(-w * 0.06, 0, w * 0.06, 0); gr.addColorStop(0, '#e0a35a'); gr.addColorStop(1, '#9a5a22'); g.fillStyle = gr; g.fill();
    E.rr(g, -w * 0.3, -h * 0.32, w * 0.6, h * 0.24, w * 0.06); gr = g.createLinearGradient(0, -h * 0.32, 0, -h * 0.08); gr.addColorStop(0, '#ff7a6a'); gr.addColorStop(1, '#b8201a'); g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.025; g.strokeStyle = '#6e0f0f'; g.stroke();
    E.rr(g, -w * 0.26, -h * 0.3, w * 0.52, h * 0.06, h * 0.03); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    g.restore();
  }
  function toolTrain(g, w, h) {
    E.rr(g, w * 0.12, h * 0.36, w * 0.56, h * 0.32, w * 0.05); g.fillStyle = '#e8322b'; g.fill();
    E.rr(g, w * 0.48, h * 0.18, w * 0.26, h * 0.3, w * 0.04); g.fillStyle = '#2f8de4'; g.fill();
    E.rr(g, w * 0.53, h * 0.24, w * 0.16, h * 0.12, w * 0.02); g.fillStyle = '#bfe8ff'; g.fill();
    g.fillStyle = '#ffc21a'; g.fillRect(w * 0.18, h * 0.24, w * 0.1, h * 0.14); E.rr(g, w * 0.14, h * 0.2, w * 0.18, h * 0.06, h * 0.02); g.fill();
    g.beginPath(); g.moveTo(w * 0.68, h * 0.62); g.lineTo(w * 0.86, h * 0.68); g.lineTo(w * 0.68, h * 0.68); g.fillStyle = '#ffc21a'; g.fill();
    ['#e8322b', '#ffc21a', '#4fc12a', '#a24ed8'].forEach((c, i) => { g.beginPath(); g.arc(w * (0.2 + i * 0.15), h * 0.72, w * 0.08, 0, 7); g.fillStyle = c; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#333'; g.stroke(); g.beginPath(); g.arc(w * (0.2 + i * 0.15), h * 0.72, w * 0.025, 0, 7); g.fillStyle = '#fff'; g.fill(); });
  }
  function toolVacuum(g, w, h) {
    g.save(); g.translate(w / 2, h / 2); g.rotate(0.5);
    E.rr(g, -w * 0.05, -h * 0.4, w * 0.1, h * 0.6, w * 0.04); g.fillStyle = '#9aa6b2'; g.fill();
    E.rr(g, -w * 0.32, h * 0.15, w * 0.64, h * 0.16, w * 0.06); const gr = g.createLinearGradient(0, h * 0.15, 0, h * 0.31); gr.addColorStop(0, '#5fd3c0'); gr.addColorStop(1, '#1f8f80'); g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#0f5a50'; g.stroke();
    E.rr(g, -w * 0.12, -h * 0.46, w * 0.24, h * 0.1, w * 0.04); g.fillStyle = '#e8322b'; g.fill();
    g.restore();
  }
  function toolBucket(g, w, h) {
    g.beginPath(); g.moveTo(w * 0.2, h * 0.32); g.lineTo(w * 0.8, h * 0.32); g.lineTo(w * 0.72, h * 0.86); g.lineTo(w * 0.28, h * 0.86); g.closePath();
    let gr = g.createLinearGradient(w * 0.2, 0, w * 0.8, 0); gr.addColorStop(0, '#b8201a'); gr.addColorStop(0.4, '#ff6a5a'); gr.addColorStop(1, '#b8201a'); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.32, w * 0.3, h * 0.08, 0, 0, 7); g.fillStyle = '#7a1010'; g.fill();
    g.save(); g.beginPath(); g.ellipse(w / 2, h * 0.33, w * 0.26, h * 0.06, 0, 0, 7); g.clip();
    ['#e8322b', '#ffc21a', '#4fc12a', '#2f8de4', '#a24ed8'].forEach((c, i) => { g.fillStyle = c; g.fillRect(w * (0.24 + i * 0.105), h * 0.25, w * 0.11, h * 0.15); }); g.restore();
    g.beginPath(); g.arc(w / 2, h * 0.32, w * 0.33, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = w * 0.03; g.strokeStyle = '#6b7178'; g.stroke();
  }
  function toolBrush(g, w, h) {
    g.save(); g.translate(w / 2, h / 2); g.rotate(0.7);
    E.rr(g, -w * 0.06, -h * 0.05, w * 0.12, h * 0.48, w * 0.05); g.fillStyle = '#c98545'; g.fill();
    E.rr(g, -w * 0.12, -h * 0.14, w * 0.24, h * 0.12, w * 0.02); g.fillStyle = '#b9c1ca'; g.fill();
    ['#e8322b', '#ffc21a', '#4fc12a', '#2f8de4', '#a24ed8'].forEach((c, i) => { g.beginPath(); g.moveTo(-w * 0.12 + i * w * 0.048, -h * 0.14); g.lineTo(-w * 0.1 + i * w * 0.048, -h * 0.42); g.lineTo(-w * 0.07 + i * w * 0.048, -h * 0.14); g.fillStyle = c; g.fill(); });
    g.restore();
  }
  // ---------------------------------------------------------------- obstáculos con reglas propias (XOBS)
  function safeBox(g, w, h, open) {
    if (open) { g.beginPath(); g.ellipse(w / 2, h * 0.6, w * 0.32, h * 0.3, 0, 0, 7); g.fillStyle = '#c99a5a'; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#7a5226'; g.stroke(); g.fillStyle = '#7a5226'; g.fillRect(w * 0.38, h * 0.24, w * 0.24, h * 0.08); E.text(g, '$', w / 2, h * 0.62, w * 0.34, '#5a3a14', { stroke: false, weight: '900' }); return; }
    E.rr(g, w * 0.08, h * 0.08, w * 0.84, h * 0.84, w * 0.1); let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9d2dc'); gr.addColorStop(1, '#6f7a86'); g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#3d454e'; g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.22, 0, 7); g.fillStyle = '#3fae9a'; g.fill(); g.lineWidth = w * 0.04; g.strokeStyle = '#2a3036'; g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * w * 0.12, h / 2 + Math.sin(a) * w * 0.12); g.lineTo(w / 2 + Math.cos(a) * w * 0.2, h / 2 + Math.sin(a) * w * 0.2); g.lineWidth = w * 0.02; g.stroke(); }
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.06, 0, 7); g.fillStyle = '#d8dee6'; g.fill();
  }
  function snowPile(g, w, h, hp) {
    const k = Math.max(0, 4 - (hp || 4)); // 0 montón … 3 muñeco casi hecho
    g.beginPath(); g.ellipse(w / 2, h * 0.75, w * 0.4, h * 0.2, 0, 0, 7); g.fillStyle = '#f4fbff'; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#9ec8e8'; g.stroke();
    if (k >= 1) { g.beginPath(); g.arc(w / 2, h * 0.52, w * 0.2, 0, 7); g.fillStyle = '#fff'; g.fill(); g.stroke(); }
    if (k >= 2) { g.beginPath(); g.arc(w / 2, h * 0.3, w * 0.14, 0, 7); g.fillStyle = '#fff'; g.fill(); g.stroke(); g.fillStyle = '#222'; g.beginPath(); g.arc(w * 0.46, h * 0.28, w * 0.02, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.54, h * 0.28, w * 0.02, 0, 7); g.fill(); g.beginPath(); g.moveTo(w / 2, h * 0.31); g.lineTo(w * 0.62, h * 0.33); g.lineTo(w / 2, h * 0.34); g.fillStyle = '#ff8a1f'; g.fill(); }
    if (k >= 3) { E.rr(g, w * 0.38, h * 0.08, w * 0.24, h * 0.1, w * 0.02); g.fillStyle = '#e8322b'; g.fill(); g.fillRect(w * 0.32, h * 0.16, w * 0.36, h * 0.03); }
  }
  function chickEgg(g, w, h, hp) {
    g.beginPath(); g.ellipse(w / 2, h * 0.92, w * 0.24, h * 0.05, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    g.beginPath(); g.moveTo(w / 2, h * 0.08); g.bezierCurveTo(w * 0.88, h * 0.1, w * 0.86, h * 0.9, w / 2, h * 0.9); g.bezierCurveTo(w * 0.14, h * 0.9, w * 0.12, h * 0.1, w / 2, h * 0.08); g.closePath();
    const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.5); gr.addColorStop(0, '#ffc6f0'); gr.addColorStop(1, '#e83ab8'); g.fillStyle = gr; g.fill();
    g.strokeStyle = '#7a1460'; g.lineWidth = w * 0.03; const cracks = 4 - (hp || 4);
    for (let i = 0; i < cracks; i++) { g.beginPath(); const y = h * (0.35 + i * 0.12); g.moveTo(w * 0.3, y); g.lineTo(w * 0.4, y - h * 0.05); g.lineTo(w * 0.5, y + h * 0.02); g.lineTo(w * 0.6, y - h * 0.05); g.lineTo(w * 0.7, y); g.stroke(); }
    g.beginPath(); g.ellipse(w * 0.38, h * 0.3, w * 0.06, h * 0.1, 0.3, 0, 7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
  }
  function jamCabinet(g, w, h) {
    E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.08); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c98545'); gr.addColorStop(1, '#7a4520'); g.fillStyle = gr; g.fill();
    g.fillStyle = '#5a3216'; g.fillRect(w * 0.1, h * 0.48, w * 0.8, h * 0.04);
    for (const [x, y, c] of [[0.3, 0.3, '#e8322b'], [0.7, 0.3, '#a24ed8'], [0.3, 0.72, '#ffc21a'], [0.7, 0.72, '#ff8a1f']]) { E.rr(g, w * (x - 0.12), h * (y - 0.14), w * 0.24, h * 0.26, w * 0.04); g.fillStyle = c; g.fill(); g.fillStyle = '#f3e2b8'; g.fillRect(w * (x - 0.13), h * (y - 0.17), w * 0.26, h * 0.06); }
  }
  function crystalOrb(g, w, h, base) {
    g.beginPath(); g.ellipse(w / 2, h * 0.82, w * 0.28, h * 0.1, 0, 0, 7); g.fillStyle = '#c98a3a'; g.fill();
    g.beginPath(); g.arc(w / 2, h * 0.45, w * 0.34, 0, 7);
    const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.04, w / 2, h * 0.45, w * 0.34); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, E.shade(base, 0.3)); gr.addColorStop(1, E.shade(base, -0.3)); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [x, y] of [[0.42, 0.4], [0.6, 0.5], [0.5, 0.58]]) E.star(g, w * x, h * y, w * 0.04, '#fff');
  }
  function potion(g, w, h, base) {
    E.rr(g, w * 0.42, h * 0.08, w * 0.16, h * 0.2, w * 0.03); g.fillStyle = '#c9e6f2'; g.fill(); E.rr(g, w * 0.4, h * 0.05, w * 0.2, h * 0.07, w * 0.03); g.fillStyle = '#a0643c'; g.fill();
    g.beginPath(); g.arc(w / 2, h * 0.6, w * 0.32, 0, 7); g.fillStyle = 'rgba(220,240,255,0.7)'; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#7aa6c0'; g.stroke();
    g.save(); g.beginPath(); g.arc(w / 2, h * 0.6, w * 0.3, 0, 7); g.clip(); g.fillStyle = base || '#d8dee6'; g.fillRect(0, h * 0.55, w, h); g.restore();
    g.beginPath(); g.ellipse(w * 0.4, h * 0.5, w * 0.06, h * 0.1, 0.3, 0, 7); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
  }
  function bowling(g, w, h, hp) {
    const n = hp >= 2 ? 3 : 2;
    for (let i = 0; i < n; i++) { const x = w * (n === 3 ? 0.28 + i * 0.22 : 0.38 + i * 0.24), y = h * 0.5;
      g.beginPath(); g.moveTo(x, y - h * 0.38); g.bezierCurveTo(x + w * 0.1, y - h * 0.38, x + w * 0.04, y - h * 0.15, x + w * 0.1, y + h * 0.15); g.bezierCurveTo(x + w * 0.12, y + h * 0.38, x - w * 0.12, y + h * 0.38, x - w * 0.1, y + h * 0.15); g.bezierCurveTo(x - w * 0.04, y - h * 0.15, x - w * 0.1, y - h * 0.38, x, y - h * 0.38);
      g.fillStyle = '#fbfbff'; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#9aa3ad'; g.stroke(); g.fillStyle = '#e8322b'; g.fillRect(x - w * 0.06, y - h * 0.18, w * 0.12, h * 0.04); g.fillRect(x - w * 0.065, y - h * 0.12, w * 0.13, h * 0.03); }
  }
  function blinds(g, w, h) {
    E.rr(g, w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.08); g.fillStyle = '#2f7f8f'; g.fill();
    for (let i = 0; i < 6; i++) { E.rr(g, w * 0.1, h * (0.1 + i * 0.135), w * 0.8, h * 0.11, h * 0.04); g.fillStyle = i % 2 ? '#bfe8f0' : '#a8dce8'; g.fill(); }
    g.fillStyle = '#ffffff'; for (const [x, y] of [[0.3, 0.3], [0.65, 0.55], [0.35, 0.75]]) { g.beginPath(); g.arc(w * x, h * y, w * 0.06, 0, 7); g.arc(w * x + w * 0.07, h * y, w * 0.05, 0, 7); g.fill(); }
  }
  function pinwheel(g, w, h, cols, COLORS) {
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.3; g.beginPath(); g.moveTo(w / 2, h / 2); g.quadraticCurveTo(w / 2 + Math.cos(a) * w * 0.5, h / 2 + Math.sin(a) * h * 0.5, w / 2 + Math.cos(a + 1.2) * w * 0.4, h / 2 + Math.sin(a + 1.2) * h * 0.4); g.closePath(); g.fillStyle = cols[i] >= 0 ? COLORS[cols[i]] : '#e8eef4'; g.fill(); g.lineWidth = w * 0.025; g.strokeStyle = '#fff'; g.stroke(); }
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.07, 0, 7); g.fillStyle = '#ffc21a'; g.fill();
  }
  function iceBlock(g, w, h) {
    E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.14); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8faff'); gr.addColorStop(1, '#7fd0f0'); g.fillStyle = gr; g.fill();
    g.lineWidth = w * 0.03; g.strokeStyle = '#ffffff'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = w * 0.05; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.22, h * 0.3); g.lineTo(w * 0.36, h * 0.18); g.moveTo(w * 0.2, h * 0.5); g.lineTo(w * 0.5, h * 0.2); g.stroke();
  }
  // ---------------------------------------------------------------- obstáculos poco frecuentes
  const plate3d = (g, w, h, top, bot, edge) => { E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.12); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = edge; g.stroke(); };
  const RARE = {
    stone: (t) => (g, w, h) => { g.beginPath(); g.moveTo(w * 0.12, h * 0.62); g.lineTo(w * 0.22, h * 0.2); g.lineTo(w * 0.7, h * 0.1); g.lineTo(w * 0.92, h * 0.45); g.lineTo(w * 0.8, h * 0.9); g.lineTo(w * 0.28, h * 0.92); g.closePath(); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e2e6ea'); gr.addColorStop(1, '#8a939c'); g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#5a6168'; g.stroke();
      if (!t.shell) { g.beginPath(); g.moveTo(w / 2, h * 0.3); g.lineTo(w * 0.68, h * 0.5); g.lineTo(w / 2, h * 0.72); g.lineTo(w * 0.32, h * 0.5); g.closePath(); g.fillStyle = '#ff4fa8'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(w / 2, h * 0.33); g.lineTo(w * 0.6, h * 0.48); g.lineTo(w / 2, h * 0.48); g.fill(); } },
    rduck: () => (g, w, h) => { g.beginPath(); g.ellipse(w * 0.52, h * 0.66, w * 0.34, h * 0.2, 0, 0, 7); g.fillStyle = '#ffd21a'; g.fill(); g.beginPath(); g.arc(w * 0.38, h * 0.38, w * 0.18, 0, 7); g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#c98a0a'; g.stroke(); g.beginPath(); g.ellipse(w * 0.18, h * 0.42, w * 0.1, h * 0.05, 0, 0, 7); g.fillStyle = '#ff7a1a'; g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(w * 0.36, h * 0.34, w * 0.03, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * 0.62, h * 0.6, w * 0.12, h * 0.06, -0.3, 0, 7); g.fillStyle = '#ffe36a'; g.fill(); },
    igloo: () => (g, w, h) => { g.beginPath(); g.arc(w / 2, h * 0.8, w * 0.42, Math.PI, 0); g.closePath(); g.fillStyle = '#eef8ff'; g.fill(); g.lineWidth = w * 0.025; g.strokeStyle = '#8ab8d8'; g.stroke(); for (const y of [0.55, 0.68]) { g.beginPath(); g.moveTo(w * 0.12, h * y); g.lineTo(w * 0.88, h * y); g.stroke(); } g.beginPath(); g.arc(w / 2, h * 0.8, w * 0.14, Math.PI, 0); g.fillStyle = '#4a7a9a'; g.fill(); },
    cannon: () => (g, w, h) => { g.beginPath(); g.arc(w * 0.38, h * 0.68, w * 0.18, 0, 7); g.fillStyle = '#7a4a1e'; g.fill(); g.save(); g.translate(w * 0.45, h * 0.55); g.rotate(-0.7); E.rr(g, -w * 0.12, -h * 0.13, w * 0.5, h * 0.26, h * 0.1); g.fillStyle = '#3d434b'; g.fill(); g.restore(); g.beginPath(); g.arc(w * 0.75, h * 0.25, w * 0.12, 0, 7); g.fillStyle = '#ff6a8a'; g.fill(); },
    eggpot: () => (g, w, h) => { g.beginPath(); g.moveTo(w * 0.16, h * 0.3); g.lineTo(w * 0.84, h * 0.3); g.lineTo(w * 0.74, h * 0.9); g.lineTo(w * 0.26, h * 0.9); g.closePath(); g.fillStyle = '#7a3d14'; g.fill(); g.fillStyle = '#ffd6e8'; for (const x of [0.32, 0.5, 0.68]) { g.beginPath(); g.ellipse(w * x, h * 0.28, w * 0.09, h * 0.12, 0, 0, 7); g.fill(); } g.fillStyle = '#5a2a0c'; g.fillRect(w * 0.16, h * 0.3, w * 0.68, h * 0.06); },
    locker: (t) => (g, w, h) => { plate3d(g, w, h, t.shell ? '#9aa6b2' : '#5fb3e8', t.shell ? '#5f6b77' : '#2f6fa8', '#2a3036'); for (const y of [0.25, 0.35]) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(w * 0.3, h * y, w * 0.4, h * 0.04); } g.beginPath(); g.arc(w * 0.72, h * 0.6, w * 0.05, 0, 7); g.fillStyle = '#ffd23f'; g.fill(); },
    metal: () => (g, w, h) => { plate3d(g, w, h, '#d8dee6', '#7d8894', '#3d454e'); g.fillStyle = '#5d6772'; for (const [x, y] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]]) { g.beginPath(); g.arc(w * x, h * y, w * 0.05, 0, 7); g.fill(); } },
    cbrick: (t, C) => (g, w, h) => { const b = C[t.color] || '#999'; plate3d(g, w, h, E.shade(b, 0.3), E.shade(b, -0.2), E.shade(b, -0.5)); g.fillStyle = E.shade(b, 0.15); for (const [x, y] of [[0.32, 0.32], [0.68, 0.32], [0.32, 0.68], [0.68, 0.68]]) { g.beginPath(); g.arc(w * x, h * y, w * 0.11, 0, 7); g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = E.shade(b, -0.35); g.stroke(); } },
    vase: (t) => (g, w, h) => { g.beginPath(); g.moveTo(w * 0.36, h * 0.12); g.lineTo(w * 0.64, h * 0.12); g.bezierCurveTo(w * 0.6, h * 0.3, w * 0.92, h * 0.4, w * 0.8, h * 0.7); g.quadraticCurveTo(w * 0.7, h * 0.92, w / 2, h * 0.92); g.quadraticCurveTo(w * 0.3, h * 0.92, w * 0.2, h * 0.7); g.bezierCurveTo(w * 0.08, h * 0.4, w * 0.4, h * 0.3, w * 0.36, h * 0.12); const gr = g.createLinearGradient(w * 0.1, 0, w * 0.9, 0); gr.addColorStop(0, '#9a4a1e'); gr.addColorStop(0.5, '#e08a4a'); gr.addColorStop(1, '#9a4a1e'); g.fillStyle = gr; g.fill(); g.fillStyle = '#3a1a0a'; g.fillRect(w * 0.18, h * 0.58, w * 0.64, h * 0.07); const cracks = 3 - (t.hp || 3); g.strokeStyle = '#3a1a0a'; g.lineWidth = w * 0.025; for (let i = 0; i < cracks; i++) { g.beginPath(); g.moveTo(w * (0.35 + i * 0.15), h * 0.3); g.lineTo(w * (0.42 + i * 0.15), h * 0.45); g.lineTo(w * (0.36 + i * 0.15), h * 0.55); g.stroke(); } },
    statue: (t) => (g, w, h) => { E.rr(g, w * 0.1, h * 0.75, w * 0.8, h * 0.18, w * 0.04); g.fillStyle = '#b9b0a0'; g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.45, w * 0.3, h * 0.32, 0, 0, 7); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#efe6d6'); gr.addColorStop(1, '#a89c86'); g.fillStyle = gr; g.fill(); g.fillStyle = '#7a705e'; g.beginPath(); g.arc(w * 0.42, h * 0.4, w * 0.03, 0, 7); g.arc(w * 0.58, h * 0.4, w * 0.03, 0, 7); g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.52, w * 0.1, h * 0.06, 0, 0, 7); g.fill(); E.text(g, String(t.hp || 3), w * 0.85, h * 0.15, w * 0.14, '#fff', { stroke: '#5a5040', sw: 4 }); },
    firework: (t, C) => (g, w, h) => { const cols = t.cols || [0, 1, 2]; cols.forEach((c, i) => { const x = w * (0.28 + i * 0.22); E.rr(g, x - w * 0.08, h * 0.3, w * 0.16, h * 0.5, w * 0.04); g.fillStyle = c >= 0 ? C[c] : '#9aa3ad'; g.fill(); g.beginPath(); g.moveTo(x - w * 0.09, h * 0.3); g.lineTo(x, h * 0.12); g.lineTo(x + w * 0.09, h * 0.3); g.fillStyle = '#ffd23f'; g.fill(); }); g.fillStyle = '#7a4a1e'; g.fillRect(w * 0.12, h * 0.8, w * 0.76, h * 0.08); },
    hanoi: (t, C) => (g, w, h) => { const cols = t.cols || [0, 1, 2]; g.fillStyle = '#c98545'; g.fillRect(w * 0.47, h * 0.12, w * 0.06, h * 0.75); g.fillRect(w * 0.15, h * 0.82, w * 0.7, h * 0.08); cols.forEach((c, i) => { if (c < 0) return; const rw = w * (0.62 - i * 0.14); E.rr(g, w / 2 - rw / 2, h * (0.66 - i * 0.18), rw, h * 0.15, h * 0.07); g.fillStyle = C[c]; g.fill(); }); },
    cjar: (t, C) => (g, w, h) => { E.rr(g, w * 0.18, h * 0.22, w * 0.64, h * 0.7, w * 0.14); g.fillStyle = 'rgba(220,240,255,0.75)'; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#8ab0c8'; g.stroke(); const b = t.color != null ? C[t.color] : '#e8322b'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(w * (0.3 + (i % 3) * 0.2), h * (0.78 - Math.floor(i / 3) * 0.16), w * 0.08, 0, 7); g.fillStyle = b; g.fill(); } E.rr(g, w * 0.22, h * 0.1, w * 0.56, h * 0.13, w * 0.04); g.fillStyle = '#ffd23f'; g.fill(); },
    spiggy: () => (g, w, h) => { g.beginPath(); g.ellipse(w / 2, h * 0.58, w * 0.38, h * 0.3, 0, 0, 7); g.fillStyle = '#f2a0b8'; g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.64, w * 0.13, h * 0.08, 0, 0, 7); g.fillStyle = '#e88aa6'; g.fill(); g.fillStyle = '#3a1a22'; g.beginPath(); g.arc(w * 0.37, h * 0.5, w * 0.03, 0, 7); g.arc(w * 0.63, h * 0.5, w * 0.03, 0, 7); g.fill(); E.rr(g, w * 0.22, h * 0.24, w * 0.56, h * 0.08, h * 0.03); g.fillStyle = '#2f8de4'; g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.24, w * 0.18, h * 0.1, 0, Math.PI, 0); g.fill(); },
    rplat: () => (g, w, h) => { E.rr(g, w * 0.1, h * 0.7, w * 0.8, h * 0.2, w * 0.05); g.fillStyle = '#5f6b77'; g.fill(); g.save(); g.translate(w / 2, h * 0.42); g.rotate(-Math.PI / 2); g.beginPath(); g.ellipse(0, 0, w * 0.3, h * 0.13, 0, 0, 7); g.fillStyle = '#d8e6f2'; g.fill(); g.restore(); g.beginPath(); g.moveTo(w * 0.4, h * 0.12); g.lineTo(w / 2, h * 0.04); g.lineTo(w * 0.6, h * 0.12); g.fillStyle = '#e8322b'; g.fill(); },
    monster: (t) => (g, w, h) => { g.beginPath(); g.ellipse(w / 2, h * 0.55, w * 0.42, h * 0.4, 0, 0, 7); const gr = g.createRadialGradient(w * 0.4, h * 0.4, w * 0.05, w / 2, h * 0.55, w * 0.45); gr.addColorStop(0, '#9fe86a'); gr.addColorStop(1, '#3f9a2a'); g.fillStyle = gr; g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.38, h * 0.42, w * 0.1, 0, 7); g.arc(w * 0.62, h * 0.42, w * 0.1, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(w * 0.39, h * 0.44, w * 0.045, 0, 7); g.arc(w * 0.61, h * 0.44, w * 0.045, 0, 7); g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.68, w * 0.2, h * 0.1, 0, 0, Math.PI); g.fillStyle = '#7a1a2a'; g.fill(); E.text(g, String(t.hp || 6), w * 0.85, h * 0.12, w * 0.12, '#fff', { stroke: '#2a6a1a', sw: 4 }); },
    cocktail: (t) => (g, w, h) => { g.beginPath(); g.moveTo(w * 0.18, h * 0.2); g.lineTo(w * 0.82, h * 0.2); g.lineTo(w / 2, h * 0.58); g.closePath(); g.fillStyle = 'rgba(220,240,255,0.8)'; g.fill(); g.lineWidth = w * 0.025; g.strokeStyle = '#7aa6c0'; g.stroke(); const lvl = 1 - (t.hp != null ? t.hp : 3) / 3; if (lvl > 0) { g.save(); g.beginPath(); g.moveTo(w * 0.18, h * 0.2); g.lineTo(w * 0.82, h * 0.2); g.lineTo(w / 2, h * 0.58); g.clip(); g.fillStyle = '#ff6a8a'; g.fillRect(0, h * (0.58 - 0.38 * lvl), w, h); g.restore(); } g.fillStyle = '#7aa6c0'; g.fillRect(w * 0.48, h * 0.58, w * 0.04, h * 0.25); g.fillRect(w * 0.32, h * 0.82, w * 0.36, h * 0.04); g.beginPath(); g.arc(w * 0.75, h * 0.2, w * 0.08, 0, 7); g.fillStyle = '#7fd36a'; g.fill(); },
    plate: (t) => (g, w, h) => { plate3d(g, w, h, t.shell ? '#9aa6b2' : '#eef4f8', t.shell ? '#5f6b77' : '#bfd0dc', '#4a5560'); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(w * (0.3 + i * 0.2), h * 0.55, w * 0.06, h * 0.25, 0, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#8aa0b0'; g.stroke(); } },
    compass: (t) => (g, w, h) => { g.beginPath(); g.arc(w / 2, h / 2, w * 0.42, 0, 7); g.fillStyle = '#c99a3a'; g.fill(); g.beginPath(); g.arc(w / 2, h / 2, w * 0.35, 0, 7); g.fillStyle = '#fff8e6'; g.fill(); const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][t.dir || 0]; g.beginPath(); g.arc(w / 2 + d[0] * w * 0.28, h / 2 + d[1] * h * 0.28, w * 0.12, 0, 7); g.fillStyle = 'rgba(255,214,40,0.95)'; g.fill(); g.save(); g.translate(w / 2, h / 2); g.rotate((t.dir || 0) * Math.PI / 2); g.beginPath(); g.moveTo(0, -h * 0.3); g.lineTo(w * 0.07, 0); g.lineTo(-w * 0.07, 0); g.fillStyle = '#e8322b'; g.fill(); g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w * 0.07, 0); g.lineTo(-w * 0.07, 0); g.fillStyle = '#5f6b77'; g.fill(); g.restore(); },
    koala: (t) => (g, w, h) => { for (const [x, y, r] of [[0.3, 0.55, 0.26], [0.7, 0.55, 0.26], [0.5, 0.38, 0.3], [0.5, 0.7, 0.26]]) { g.beginPath(); g.arc(w * x, h * y, w * r, 0, 7); g.fillStyle = '#4faf2a'; g.fill(); } g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(w * 0.4, h * 0.3, w * 0.12, 0, 7); g.fill(); if ((t.hp || 2) < 2) E.emoji(g, '🐨', w / 2, h * 0.5, w * 0.5); },
    hat: (t, C) => (g, w, h) => { g.beginPath(); g.ellipse(w / 2, h * 0.78, w * 0.42, h * 0.1, 0, 0, 7); g.fillStyle = '#222'; g.fill(); E.rr(g, w * 0.24, h * 0.22, w * 0.52, h * 0.56, w * 0.06); g.fillStyle = '#2a2a33'; g.fill(); g.fillStyle = t.color != null ? C[t.color] : '#e8322b'; g.fillRect(w * 0.24, h * 0.58, w * 0.52, h * 0.1); E.star(g, w * 0.7, h * 0.18, w * 0.08, '#ffd23f'); },
    dragon: () => (g, w, h) => { g.beginPath(); g.ellipse(w / 2, h * 0.6, w * 0.36, h * 0.28, 0, 0, 7); g.fillStyle = '#e8322b'; g.fill(); g.beginPath(); g.arc(w * 0.68, h * 0.36, w * 0.18, 0, 7); g.fill(); g.fillStyle = '#ffd23f'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w * (0.3 + i * 0.1), h * 0.34); g.lineTo(w * (0.35 + i * 0.1), h * 0.24); g.lineTo(w * (0.4 + i * 0.1), h * 0.34); g.fill(); } g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.72, h * 0.32, w * 0.05, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(w * 0.73, h * 0.33, w * 0.025, 0, 7); g.fill(); },
  };
  // juguetes que hay que bajar (osito, tren, yoyó, trompeta, cometa)
  const TOYS = [
    (g, w, h) => { const c = '#c98545'; for (const [x, y, r] of [[0.3, 0.25, 0.1], [0.7, 0.25, 0.1], [0.5, 0.38, 0.2], [0.5, 0.7, 0.24], [0.28, 0.62, 0.08], [0.72, 0.62, 0.08]]) { g.beginPath(); g.arc(w * x, h * y, w * r, 0, 7); g.fillStyle = c; g.fill(); } g.beginPath(); g.ellipse(w / 2, h * 0.44, w * 0.08, h * 0.06, 0, 0, 7); g.fillStyle = '#f3dcb8'; g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(w * 0.43, h * 0.34, w * 0.025, 0, 7); g.arc(w * 0.57, h * 0.34, w * 0.025, 0, 7); g.fill(); g.beginPath(); g.moveTo(w * 0.42, h * 0.52); g.lineTo(w * 0.58, h * 0.52); g.lineTo(w / 2, h * 0.58); g.fillStyle = '#e8322b'; g.fill(); },
    toolTrain,
    (g, w, h) => { g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.32, 0, 7); g.fillStyle = '#e8322b'; g.fill(); g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.12, 0, 7); g.fillStyle = '#ffd23f'; g.fill(); g.beginPath(); g.moveTo(w / 2, h * 0.55); g.quadraticCurveTo(w * 0.7, h * 0.2, w * 0.6, h * 0.05); g.lineWidth = w * 0.03; g.strokeStyle = '#555'; g.stroke(); },
    (g, w, h) => { g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.fillStyle = '#ffc21a'; g.fillRect(-w * 0.35, -h * 0.05, w * 0.45, h * 0.1); g.beginPath(); g.moveTo(w * 0.1, -h * 0.05); g.lineTo(w * 0.38, -h * 0.25); g.lineTo(w * 0.38, h * 0.25); g.lineTo(w * 0.1, h * 0.05); g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = '#a07a0a'; g.stroke(); g.restore(); },
    (g, w, h) => { g.beginPath(); g.moveTo(w / 2, h * 0.08); g.lineTo(w * 0.82, h * 0.4); g.lineTo(w / 2, h * 0.72); g.lineTo(w * 0.18, h * 0.4); g.closePath(); g.fillStyle = '#2f8de4'; g.fill(); g.beginPath(); g.moveTo(w / 2, h * 0.08); g.lineTo(w / 2, h * 0.72); g.moveTo(w * 0.18, h * 0.4); g.lineTo(w * 0.82, h * 0.4); g.lineWidth = w * 0.025; g.strokeStyle = '#ffd23f'; g.stroke(); g.beginPath(); g.moveTo(w / 2, h * 0.72); g.quadraticCurveTo(w * 0.35, h * 0.85, w * 0.55, h * 0.95); g.strokeStyle = '#e8322b'; g.stroke(); },
  ];
  const O = (GAME.skins.original = {});
  O.theme = {
    accent: '#ff8a1f', node: TEAL, hudText: TEAL_D, bar: TEAL,
    panel: { border: TEAL_D, top: '#f3fbf8', bottom: '#d6efe9' },
    path: 'rgba(255,240,210,0.5)', ribbon: TEAL_D, pauseColor: '#f3e2b8',
  };
  O.tile = function (t, ts, COLORS) {
    switch (t.kind) {
      case 'cube': { const k = t.hintK || t.color; return E.sprite('cube' + t.color + k, ts, ts, (g, w, h) => toyCube(g, w, h, COLORS[t.color], t.hintK || t.color)); }
      case 'rocket': return E.sprite('rocket' + t.dir, ts, ts, (g, w, h) => { g.translate(w / 2, h / 2); if (t.dir === 'v') g.rotate(Math.PI / 2); rocketPair(g, w * 0.92); });
      case 'bomb': return E.sprite('bomb', ts, ts, tntBox);
      case 'disco': return E.sprite('disco' + t.color, ts, ts, (g, w, h) => puzzleCube(g, w, h, COLORS[t.color], COLORS));
      case 'ball': { const cols = t.cols || [0, 1, 2, 3]; return E.sprite('ball' + cols.join(''), ts, ts, (g, w, h) => beachBall(g, w, h, cols, COLORS)); }
      case 'crate': return E.sprite('crate' + t.hp, ts, ts, (g, w, h) => { woodBox(g, w, h, 1); const s = w * 0.5; g.drawImage(E.emojiSprite('💣', s), w * 0.25, h * 0.25, s, s); g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.15, 0, 7); g.fillStyle = '#fff'; g.fill(); E.text(g, String(t.hp), w * 0.8, h * 0.21, w * 0.22, '#7a3b00', { stroke: false }); });
      case 'balloon': return E.sprite('balloon', ts, ts, balloonShape);
    }
    const xk = t.kind, st = (t.hp != null ? t.hp : '') + (t.open ? 'o' : '') + (t.color != null ? 'c' + t.color : '') + (t.cols ? t.cols.join('') : '');
    const X = { safe: (g, w, h) => safeBox(g, w, h, t.open), snowman: (g, w, h) => snowPile(g, w, h, t.hp), chick: (g, w, h) => chickEgg(g, w, h, t.hp), jam: jamCabinet,
      orb: (g, w, h) => crystalOrb(g, w, h, t.color != null ? COLORS[t.color] : '#a24ed8'), potion: (g, w, h) => potion(g, w, h, t.color != null ? COLORS[t.color] : null),
      bowling: (g, w, h) => bowling(g, w, h, t.hp), curtain: blinds, ice: iceBlock, pinwheel: (g, w, h) => pinwheel(g, w, h, t.cols || [0, 1, 2, 3], COLORS) }[xk];
    if (X) return E.sprite('x' + xk + st, ts, ts, X);
    if (RARE[xk]) return E.sprite('r' + xk + st + (t.shell ? 's' : '') + (t.dir != null ? 'd' + t.dir : ''), ts, ts, RARE[xk](t, COLORS));
    if (xk === 'duck') return E.sprite('toy' + (t.id % 5), ts, ts, TOYS[t.id % 5]);
    const ob = OBS_ORIG[t.kind];
    if (ob) { const [k, fn] = ob(t); return E.sprite(k, ts, ts, fn); }
    return null;
  };
  // los especiales de inicio (cofre, ruleta, rachas…) con el mismo dibujo que en el tablero
  O.pauseIcon = (g, x, y, w, h) => { const s = w * 0.62; g.drawImage(E.sprite('gear', s, s, gear), x + (w - s) / 2, y + (h - s) / 2, s, s); };
  O.emoji = {
    '🔨': toolHammer, '🚂': toolTrain, '🌪️': toolVacuum, '🪣': toolBucket, '🖌️': toolBrush,
    '🚀': (g, w, h) => { g.translate(w / 2, h / 2); g.rotate(-Math.PI / 4); rocketPair(g, w * 0.95); },
    '💣': tntBox,
    '🔮': (g, w, h) => puzzleCube(g, w, h, '#e8322b', ['#e8322b', '#ffc21a', '#2f8de4', '#4fc12a', '#a24ed8', '#ff8a1f']),
  };
  // tablero oscuro translúcido con borde dorado, siguiendo la forma de las columnas
  O.board = function (g, S, bx, by, ts) {
    const cols = [];
    for (let c = 0; c < S.C; c++) if (S.top[c] < S.R) cols.push(c);
    const rect = (c, e, r) => { E.rr(g, bx + c * ts - e, by + S.top[c] * ts - e, ts + 2 * e, (S.R - S.top[c]) * ts + 2 * e, r); g.fill(); };
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (const c of cols) { g.save(); g.translate(0, 5); rect(c, 9, 16); g.restore(); }
    g.fillStyle = '#8a6420'; for (const c of cols) rect(c, 9, 16);
    g.fillStyle = GOLD; for (const c of cols) rect(c, 7, 14);
    g.fillStyle = 'rgba(16,30,48,0.88)'; for (const c of cols) rect(c, 2, 10);
    g.fillStyle = 'rgba(255,255,255,0.035)';
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (r >= S.top[c] && (r + c) % 2) g.fillRect(bx + c * ts, by + r * ts, ts, ts);
  };
  // al romperse: trocitos del cubo y un destello
  O.pop = function (t, x, y, ts, COLORS) {
    if (t.kind !== 'cube') return false;
    const c = COLORS[t.color];
    E.burst(x, y, [c, E.shade(c, 0.35), E.shade(c, -0.25)], 6, { size: ts * 0.2, speed: 300 });
    E.burst(x, y, ['#ffffff', '#fff6c0'], 2, { size: ts * 0.18, shape: 'star', speed: 120, life: 0.4 });
    return true;
  };
  O.fx = function (g, f, k, x0, y0, ts, S, cx, cy, COLORS) {
    if (f.type === 'rocket') {
      const dist = k * Math.max(S.R, S.C) * ts * 1.2, s = ts * 0.9;
      g.save();
      g.globalAlpha = Math.max(0, 1 - k * 0.6);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 1; i < 6; i++) { const d = dist - i * ts * 0.45; if (d <= 0) break; const rr = ts * (0.12 + i * 0.03);
        for (const sg of [-1, 1]) { g.beginPath(); if (f.dir === 'h') g.arc(x0 + sg * d, y0, rr, 0, 7); else g.arc(x0, y0 + sg * d, rr, 0, 7); g.fill(); } }
      g.globalAlpha = 1;
      for (const sg of [-1, 1]) {
        g.save();
        if (f.dir === 'h') { g.translate(x0 + sg * dist, y0); if (sg < 0) g.rotate(Math.PI); }
        else { g.translate(x0, y0 + sg * dist); g.rotate(sg > 0 ? Math.PI / 2 : -Math.PI / 2); }
        g.beginPath(); g.rect(0, -s, s, 2 * s); g.clip(); rocketPair(g, s); g.restore();
      }
      g.restore();
      return true;
    }
    if (f.type === 'disco') {
      const kk = Math.min(1, k * 2.5), col = COLORS ? COLORS[f.color] : '#fff';
      g.save(); g.globalAlpha = 1 - k * 0.8; g.lineCap = 'round';
      for (const [rr, cc] of f.targets) {
        const tx = x0 + (cx(cc) - x0) * kk, ty = y0 + (cy(rr) - y0) * kk;
        const seg = 5, pts = [[x0, y0]];
        for (let i = 1; i < seg; i++) { const q = i / seg; pts.push([x0 + (tx - x0) * q + ((rr * 7 + cc * 3 + i) % 5 - 2) * ts * 0.06, y0 + (ty - y0) * q + ((rr * 3 + cc * 5 + i) % 5 - 2) * ts * 0.06]); }
        pts.push([tx, ty]);
        for (const [lw, cl] of [[ts * 0.14, col], [ts * 0.05, '#ffffff']]) { g.lineWidth = lw; g.strokeStyle = cl; for (let i = 1; i < pts.length; i++) { g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); } }
        if (kk >= 1) E.star(g, tx, ty, ts * 0.22 * (1 - k * 0.5), '#ffffff');
      }
      g.restore();
      return true;
    }
    if (f.type === 'bomb') {
      g.save();
      const R = ts * (0.6 + k * (f.rad + 0.6));
      g.globalAlpha = 1 - k;
      g.beginPath(); g.arc(x0, y0, R, 0, 7); g.fillStyle = 'rgba(255,200,80,0.45)'; g.fill();
      g.beginPath(); g.arc(x0, y0, R * 0.6, 0, 7); g.fillStyle = 'rgba(255,255,230,0.7)'; g.fill();
      g.lineWidth = ts * 0.18 * (1 - k); g.strokeStyle = '#fff'; g.beginPath(); g.arc(x0, y0, R, 0, 7); g.stroke();
      g.restore();
      return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- interfaz turquesa
  O.panel = function (g, x, y, w, h, opt) {
    const r = opt.r || 26;
    E.rr(g, x + 2, y + 8, w, h, r); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    E.rr(g, x, y, w, h, r); g.fillStyle = TEAL_D; g.fill();
    E.rr(g, x + 4, y + 4, w - 8, h - 8, r - 3);
    let gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#4fa3b0'); gr.addColorStop(1, TEAL); g.fillStyle = gr; g.fill();
    E.rr(g, x + 16, y + 16, w - 32, h - 32, Math.max(8, r - 10)); g.fillStyle = 'rgba(10,50,60,0.35)'; g.fill();
    E.rr(g, x + 18, y + 19, w - 36, h - 37, Math.max(8, r - 11));
    gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, (opt && opt.top) || '#f3fbf8'); gr.addColorStop(1, (opt && opt.bottom) || '#d6efe9'); g.fillStyle = gr; g.fill();
  };
  O.button = function (g, x, y, w, h, color, down, r) {
    const oy = down ? 4 : 0;
    if (!down) { E.rr(g, x, y + 9, w, h - 6, r); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill(); }
    E.rr(g, x - 2, y + oy - 2, w + 4, h - 2, r + 2); g.fillStyle = E.shade(color, -0.6); g.fill();
    E.rr(g, x, y + 5, w, h - 6, r); g.fillStyle = E.shade(color, -0.32); g.fill();
    E.rr(g, x, y + oy, w, h - 9, r);
    const gr = g.createLinearGradient(0, y + oy, 0, y + oy + h - 9); gr.addColorStop(0, E.shade(color, 0.32)); gr.addColorStop(1, E.shade(color, -0.04));
    g.fillStyle = gr; g.fill();
    E.rr(g, x + Math.min(10, w * 0.08), y + oy + 4, w - 2 * Math.min(10, w * 0.08), (h - 9) * 0.34, Math.max(4, r * 0.6)); g.fillStyle = 'rgba(255,255,255,0.32)'; g.fill();
  };
  O.hud = function (g, W, H) {
    const y = 0;
    g.fillStyle = TEAL_D; g.fillRect(0, y, W, H - 2);
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3f97a5'); gr.addColorStop(1, '#246674');
    E.rr(g, 4, -20, W - 8, H + 14, 26); g.fillStyle = gr; g.fill();
    // cajas crema de objetivo y movimientos con su pestaña
    const box = (x, w, label) => {
      E.rr(g, x, 46, w, H - 62, 18); g.fillStyle = TEAL_D; g.fill();
      E.rr(g, x + 4, 49, w - 8, H - 69, 15);
      gr = g.createLinearGradient(0, 46, 0, H - 16); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#f4e3bc'); g.fillStyle = gr; g.fill();
      E.rr(g, x + w / 2 - label / 2, 16, label, 34, 14); g.fillStyle = TEAL_D; g.fill();
      E.rr(g, x + w / 2 - label / 2 + 3, 19, label - 6, 28, 11); g.fillStyle = '#d7efe9'; g.fill();
    };
    box(16, 312, 150);
    box(W - 178, 162, 160);
    // marco redondo de la mascota
    const ax = W / 2 + 40, ay = H / 2 - 4;
    g.beginPath(); g.arc(ax, ay, 56, 0, 7); g.fillStyle = TEAL_D; g.fill();
    g.beginPath(); g.arc(ax, ay, 51, 0, 7);
    gr = g.createRadialGradient(ax, ay - 20, 6, ax, ay, 51); gr.addColorStop(0, '#9fe0e8'); gr.addColorStop(1, '#3f97a5'); g.fillStyle = gr; g.fill();
  };
  O.bar = function (g, y, W, H) {
    let gr = g.createLinearGradient(0, y, 0, y + H); gr.addColorStop(0, '#3f97a5'); gr.addColorStop(1, '#1f5966');
    g.fillStyle = gr; g.fillRect(0, y, W, H);
    g.fillStyle = TEAL_D; g.fillRect(0, y, W, 5);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, y + 5, W, 2);
  };
  O.boosterIcon = function (g, b, x, y, w, h, have, active) {
    E.emoji(g, b.icon, x + w / 2, y + h / 2 - 2, w * 0.6);
    const tx = x + w - 16, ty = y + h - 14;
    if (have === Infinity) E.text(g, '∞', tx, ty, 30, '#fff', { stroke: '#1b4f5a', sw: 6 });
    else if (have > 0) E.text(g, String(have), tx, ty, 28, '#fff', { stroke: '#1b4f5a', sw: 6 });
    else { g.beginPath(); g.arc(tx, ty, 15, 0, 7); g.fillStyle = '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); E.text(g, '+', tx, ty + 1, 26, '#fff', { stroke: false }); }
  };

  // ---------------------------------------------------------------- fondo de la partida: una habitación de juguetes
  O.playBg = function (g, w, h) {
    // pared con papel pintado
    let gr = g.createLinearGradient(0, 0, 0, h * 0.72); gr.addColorStop(0, '#8e3d33'); gr.addColorStop(1, '#6a2a24');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,220,170,0.08)';
    for (let x = 0; x < w; x += 46) g.fillRect(x, 0, 18, h * 0.72);
    g.fillStyle = 'rgba(255,220,170,0.12)';
    for (let y = 30; y < h * 0.7; y += 70) for (let x = 32; x < w; x += 92) { g.beginPath(); g.arc(x + ((y / 70) % 2) * 46, y, 6, 0, 7); g.fill(); }
    // ventana
    const wx = w * 0.62, wy = h * 0.2, ww = w * 0.3, wh = h * 0.26;
    E.rr(g, wx - 10, wy - 10, ww + 20, wh + 20, 10); g.fillStyle = '#5a3218'; g.fill();
    gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(1, '#e8f6ff'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#5a3218'; g.fillRect(wx + ww / 2 - 4, wy, 8, wh); g.fillRect(wx, wy + wh / 2 - 4, ww, 8);
    g.fillStyle = '#2a4f8a'; g.fillRect(wx - 26, wy - 18, 30, wh + 40); g.fillRect(wx + ww - 4, wy - 18, 30, wh + 40);
    // cuadro
    E.rr(g, w * 0.1, h * 0.22, w * 0.24, h * 0.16, 6); g.fillStyle = '#c9952e'; g.fill();
    g.fillStyle = '#f2e3b8'; g.fillRect(w * 0.12, h * 0.235, w * 0.2, h * 0.13);
    g.fillStyle = '#e86a4a'; g.beginPath(); g.arc(w * 0.22, h * 0.29, w * 0.045, 0, 7); g.fill();
    // zócalo de madera
    gr = g.createLinearGradient(0, h * 0.66, 0, h * 0.76); gr.addColorStop(0, '#7a4524'); gr.addColorStop(1, '#4e2a14');
    g.fillStyle = gr; g.fillRect(0, h * 0.66, w, h * 0.1);
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < w; x += 120) g.fillRect(x, h * 0.67, 4, h * 0.08);
    // suelo de tablas
    gr = g.createLinearGradient(0, h * 0.76, 0, h); gr.addColorStop(0, '#a8663a'); gr.addColorStop(1, '#6e3d1f');
    g.fillStyle = gr; g.fillRect(0, h * 0.76, w, h * 0.24);
    g.strokeStyle = 'rgba(60,30,10,0.35)'; g.lineWidth = 3;
    for (let y = h * 0.8; y < h; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // alfombra
    g.beginPath(); g.ellipse(w / 2, h * 0.9, w * 0.42, h * 0.06, 0, 0, 7); g.fillStyle = '#2f6f9a'; g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.9, w * 0.36, h * 0.045, 0, 0, 7); g.lineWidth = 6; g.strokeStyle = '#f2c94c'; g.stroke();
  };

  // ---------------------------------------------------------------- mapa: habitaciones que cambian cada 20 niveles
  const ROOMS = [['#8e3d33', '#6a2a24'], ['#3d6f8e', '#284f6a'], ['#5f8e3d', '#40692a'], ['#8e6a3d', '#6a4c28'], ['#6a3d8e', '#4c286a']];
  O.mapBg = function (g, top, zoneH) {
    const z0 = Math.floor(top / zoneH);
    for (let z = z0 - 1; z <= z0 + 1; z++) {
      const zy = -z * zoneH - zoneH + top + E.H, zi = Math.max(0, z), pal = ROOMS[zi % ROOMS.length];
      const gr = g.createLinearGradient(0, zy, 0, zy + zoneH); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
      g.fillStyle = gr; g.fillRect(0, zy, E.W, zoneH + 1);
      g.fillStyle = 'rgba(255,230,190,0.07)';
      for (let x = 0; x < E.W; x += 46) g.fillRect(x, Math.max(zy, -10), 18, Math.min(zoneH, E.H + 20));
      // separación entre habitaciones: suelo de madera
      const fy = zy + zoneH - 40;
      if (fy > -60 && fy < E.H + 60) {
        g.fillStyle = '#6e3d1f'; g.fillRect(0, fy, E.W, 40);
        g.fillStyle = '#a8663a'; g.fillRect(0, fy, E.W, 10);
      }
    }
    // muebles y ventanas sencillos, fijos a cada tramo del mapa
    const step = 236, i0 = Math.floor(top / step) - 1;
    for (let i = i0; i <= i0 + Math.ceil(E.H / step) + 2; i++) {
      const y = -i * step + top + E.H - 120, left = i % 2 === 0, x = left ? 30 : E.W - 140;
      if (i % 3 === 0) { // ventana
        E.rr(g, x - 6, y - 6, 122, 112, 8); g.fillStyle = '#5a3218'; g.fill();
        g.fillStyle = '#bfe6ff'; g.fillRect(x, y, 110, 100); g.fillStyle = '#5a3218'; g.fillRect(x + 52, y, 6, 100); g.fillRect(x, y + 47, 110, 6);
      } else if (i % 3 === 1) { // estantería con juguetes
        g.fillStyle = '#7a4524'; g.fillRect(x, y + 60, 110, 12);
        E.emoji(g, ['🧸', '🚂', '🪀', '🎺', '🪁'][((i % 5) + 5) % 5], x + 30, y + 36, 46);
        E.emoji(g, ['🎲', '🪆', '🧩', '🚗', '🎨'][((i % 5) + 5) % 5], x + 80, y + 38, 40);
      } else { // cuadro
        E.rr(g, x, y + 10, 100, 80, 6); g.fillStyle = '#c9952e'; g.fill(); g.fillStyle = '#f2e3b8'; g.fillRect(x + 8, y + 18, 84, 64);
        E.emoji(g, ['🌻', '⛵', '🏰', '🎈', '🌈'][((i % 5) + 5) % 5], x + 50, y + 50, 40);
      }
    }
  };
  O.mapNoDecor = true;
  O.bubble = bubbleOv;
  O.mapPath = function (g, a, b, pos) {
    for (let i = a; i < b; i++) {
      const p = pos(i), q = pos(i + 1);
      for (let k = 1; k < 5; k++) {
        const t = k / 5, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
        g.beginPath(); g.ellipse(x, y, 9, 6, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
        g.beginPath(); g.ellipse(x, y - 2, 9, 6, 0, 0, 7); g.fillStyle = '#f3e2b8'; g.fill();
      }
    }
  };
  O.mapNode = function (g, i, x, y, r, cur, done, hd, stars) {
    const base = cur ? '#ff8a1f' : hd === 2 ? '#6a2f9a' : hd === 1 ? '#d8352f' : done ? TEAL : '#5d6a72';
    g.beginPath(); g.ellipse(x, y + r * 0.85, r * 0.95, r * 0.3, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
    if (cur) { g.beginPath(); g.arc(x, y, r + 10 + Math.sin(E.t * 4) * 3, 0, 7); g.fillStyle = 'rgba(255,220,120,0.35)'; g.fill(); }
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#f3e2b8'; g.fill();
    g.beginPath(); g.arc(x, y, r - 5, 0, 7); g.fillStyle = E.shade(base, -0.4); g.fill();
    g.beginPath(); g.arc(x, y - 2, r - 7, 0, 7);
    const gr = g.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, E.shade(base, 0.3)); gr.addColorStop(1, base); g.fillStyle = gr; g.fill();
    E.text(g, String(i), x, y, i > 999 ? 22 : 27, '#fff', { stroke: E.shade(base, -0.55), sw: 5 });
    if (hd && !done) { E.emoji(g, '💀', x + r * 0.8, y - r * 0.8, 28); if (hd === 2) E.emoji(g, '💀', x - r * 0.8, y - r * 0.8, 28); }
    if (done) for (let s = 0; s < 3; s++) E.star(g, x + (s - 1) * 22, y - r - 4 + (s === 1 ? -6 : 0), 11, s < stars ? '#ffd23f' : '#9aa3ad', '#7a4b00');
    if (cur) E.emoji(g, GAME.theme.mascot, x - r - 26, y - 6, 54);
  };
  O.mapHeader = function (g, W, H) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3f97a5'); gr.addColorStop(1, '#246674');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = TEAL_D; g.fillRect(0, H - 5, W, 5);
  };
})();

// ================================================================ 'real' (en Ajustes: "Original")
// Usa las imágenes del juego original, que solo están en la tablet (privado/, dentro del APK; nunca se publican).
// Lo que no tiene imagen se dibuja como en 'original'.
(function () {
  const O = GAME.skins.original;
  const NAMES = [];
  for (let i = 0; i < 6; i++) for (const k of ['', 'rocket', 'bomb', 'disco']) NAMES.push('cube' + i + k);
  for (let i = 0; i < 6; i++) NAMES.push('puzzle' + i);
  NAMES.push('rocket', 'tnt', 'box1', 'box2', 'box3', 'crate', 'stone0', 'stone1', 'egg1', 'egg2', 'balloon', 'bubble', 'gum', 'ufo', 'soap', 'hive', 'rduck', 'ice', 'pumpkin');
  // dibuja la imagen dentro de la casilla sin deformarla (k = margen)
  const fit = (name, k, rot) => (g, w, h) => {
    const im = E.img(name); if (!im) return;
    g.save(); g.translate(w / 2, h / 2); if (rot) g.rotate(rot);
    const s = Math.min((w * k) / im.width, (h * k) / im.height);
    g.drawImage(im, (-im.width * s) / 2, (-im.height * s) / 2, im.width * s, im.height * s);
    g.restore();
  };
  const spr = (key, ts, draw) => E.sprite('img' + key, ts, ts, draw);
  const Rl = (GAME.skins.real = Object.assign({}, O, { images: NAMES, emoji: Object.assign({}, O.emoji) }));
  Rl.tile = function (t, ts, COLORS) {
    switch (t.kind) {
      case 'cube': { const n = 'cube' + t.color + (t.hintK || ''); return spr(n, ts, fit(n, 1.0)); }
      case 'rocket': return spr('rocket' + t.dir, ts, fit('rocket', 0.95, t.dir === 'h' ? Math.PI / 2 : 0));
      case 'bomb': return spr('tnt', ts, fit('tnt', 0.95));
      case 'disco': return spr('puzzle' + t.color, ts, fit('puzzle' + t.color, 0.95));
      case 'box': return spr('box' + Math.min(3, t.hp), ts, fit('box' + Math.min(3, t.hp), 0.98));
      case 'crate': return E.sprite('imgcrate' + t.hp, ts, ts, (g, w, h) => { fit('crate', 0.98)(g, w, h); g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.15, 0, 7); g.fillStyle = '#fff'; g.fill(); E.text(g, String(t.hp), w * 0.8, h * 0.21, w * 0.22, '#7a3b00', { stroke: false }); });
      case 'stone': { const n = 'stone' + (t.shell ? 1 : 0); return spr(n, ts, fit(n, 0.98)); }
      case 'egg': { const n = 'egg' + (t.hp >= 2 ? 2 : 1); return spr(n, ts, fit(n, 0.9)); }
      case 'balloon': case 'gum': case 'ufo': case 'soap': case 'hive': case 'rduck': case 'ice': case 'pumpkin': return spr(t.kind, ts, fit(t.kind, 0.92));
    }
    return O.tile(t, ts, COLORS);
  };
  Rl.bubble = fit('bubble', 1.0);
  Object.assign(Rl.emoji, { '🚀': fit('rocket', 0.95, Math.PI / 4), '💣': fit('tnt', 0.95), '🔮': fit('puzzle0', 0.95) });
})();

// ================================================================ 'nueva': patio andaluz
// Las piezas son azulejos vidriados pintados a mano, el tablero un panel de azulejos azules y la interfaz
// de cerámica blanca con cenefa azul. Cada color lleva un motivo distinto (flor, sol, gota, hoja, uvas, naranja)
// para que se distingan también por la forma.
(function () {
  const COB = '#1f4fa8', COB_D = '#143472', TERR = '#c8643a', TERR_D = '#8e3f1f', WHITE = '#fbf7ee';
  // interfaz, fondo y mapa comunes (engine/skins_comun.js); aquí van las piezas
  const N = (GAME.skins.nueva = Object.assign({}, NUEVA, { emoji: Object.assign({}, NUEVA.emoji) }));
  const cenefa = NUEVA.cenefa;

  // motivo pintado (crema con contorno oscuro), centrado en (cx,cy) con tamaño s
  function motif(g, idx, cx, cy, s, ink) {
    g.save(); g.translate(cx, cy);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const paint = (fill) => { g.lineWidth = s * 0.16; g.strokeStyle = ink; g.stroke(); g.fillStyle = fill; g.fill(); };
    switch (idx) {
      case 0: // flor de cinco pétalos
        g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; g.moveTo(Math.cos(a) * s * 0.55 + s * 0.38, Math.sin(a) * s * 0.55); g.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.38, 0, 7); }
        paint(WHITE); g.beginPath(); g.arc(0, 0, s * 0.3, 0, 7); paint('#ffd23f'); break;
      case 1: // sol
        g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? s * 0.72 : s * 1.02; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); paint(WHITE);
        g.beginPath(); g.arc(0, 0, s * 0.45, 0, 7); paint('#ffe78a'); break;
      case 2: // gota
        g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.5, -s * 0.35, s * 0.8, s * 0.1, s * 0.75, s * 0.4); g.arc(0, s * 0.4, s * 0.75, 0, Math.PI); g.bezierCurveTo(-s * 0.8, s * 0.1, -s * 0.5, -s * 0.35, 0, -s); g.closePath(); paint(WHITE);
        g.beginPath(); g.ellipse(-s * 0.25, s * 0.35, s * 0.12, s * 0.22, 0.4, 0, 7); g.fillStyle = 'rgba(31,79,168,0.35)'; g.fill(); break;
      case 3: // hoja
        g.beginPath(); g.moveTo(-s * 0.85, s * 0.85); g.bezierCurveTo(-s * 0.9, -s * 0.4, s * 0.2, -s * 1.0, s * 0.9, -s * 0.9); g.bezierCurveTo(s * 0.9, s * 0.1, s * 0.3, s * 0.9, -s * 0.85, s * 0.85); g.closePath(); paint(WHITE);
        g.beginPath(); g.moveTo(-s * 0.7, s * 0.7); g.quadraticCurveTo(0, 0, s * 0.7, -s * 0.7); g.lineWidth = s * 0.1; g.strokeStyle = ink; g.stroke(); break;
      case 4: // racimo de uvas
        g.beginPath(); for (const [x, y] of [[-0.45, -0.35], [0.05, -0.4], [0.5, -0.3], [-0.2, 0.1], [0.3, 0.1], [0.05, 0.55]]) { g.moveTo(x * s + s * 0.33, y * s); g.arc(x * s, y * s, s * 0.33, 0, 7); }
        paint(WHITE); g.beginPath(); g.moveTo(0, -s * 0.7); g.lineTo(s * 0.2, -s * 1.0); g.lineWidth = s * 0.14; g.strokeStyle = ink; g.stroke(); break;
      default: // naranja con hoja
        g.beginPath(); g.arc(0, s * 0.12, s * 0.78, 0, 7); paint(WHITE);
        g.beginPath(); g.ellipse(s * 0.35, -s * 0.75, s * 0.35, s * 0.16, -0.5, 0, 7); paint('#8fd16a');
        g.beginPath(); g.arc(-s * 0.25, -s * 0.12, s * 0.12, 0, 7); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
    }
    g.restore();
  }
  // azulejo vidriado: canto de barro, esmalte de color con brillo y el motivo pintado
  function tile(g, w, h, base, idx) {
    const r = w * 0.16;
    E.rr(g, w * 0.03, h * 0.05, w * 0.94, h * 0.93, r); g.fillStyle = '#d9b48a'; g.fill(); // barro
    E.rr(g, w * 0.03, h * 0.03, w * 0.94, h * 0.9, r);
    const gr = g.createRadialGradient(w * 0.35, h * 0.3, w * 0.05, w * 0.5, h * 0.5, w * 0.75);
    gr.addColorStop(0, E.shade(base, 0.35)); gr.addColorStop(0.55, base); gr.addColorStop(1, E.shade(base, -0.3));
    g.fillStyle = gr; g.fill();
    // filete blanco del azulejo
    E.rr(g, w * 0.1, h * 0.09, w * 0.8, h * 0.78, r * 0.6); g.lineWidth = w * 0.03; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
    motif(g, idx, w / 2, h * 0.48, w * 0.25, E.shade(base, -0.55));
    // reflejo del vidriado
    g.beginPath(); g.ellipse(w * 0.3, h * 0.2, w * 0.18, h * 0.06, -0.5, 0, 7); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
  }
  // cohete de feria (con varilla) en horizontal, centrado
  function feriaRocket(g, s) {
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * 0.5, 0); g.lineTo(-s * 0.05, 0); g.lineWidth = s * 0.05; g.strokeStyle = '#a8763c'; g.stroke();
    E.rr(g, -s * 0.12, -s * 0.19, s * 0.5, s * 0.38, s * 0.1);
    const gr = g.createLinearGradient(0, -s * 0.19, 0, s * 0.19); gr.addColorStop(0, '#ff8a6a'); gr.addColorStop(1, '#c0281f'); g.fillStyle = gr; g.fill(); g.lineWidth = s * 0.025; g.strokeStyle = '#6e0f0f'; g.stroke();
    g.fillStyle = '#ffd23f'; g.fillRect(-s * 0.02, -s * 0.19, s * 0.07, s * 0.38); g.fillRect(s * 0.17, -s * 0.19, s * 0.07, s * 0.38);
    g.beginPath(); g.moveTo(s * 0.38, -s * 0.21); g.lineTo(s * 0.6, 0); g.lineTo(s * 0.38, s * 0.21); g.closePath(); g.fillStyle = COB; g.fill();
    // chispas
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-s * (0.18 + i * 0.09), (i % 2 ? 1 : -1) * s * 0.06, s * 0.035, 0, 7); g.fillStyle = i % 2 ? '#ffd23f' : '#ff8a1f'; g.fill(); }
  }
  function cracker(g, w, h) { // carcasa de fuegos artificiales
    const cx = w / 2, cy = h * 0.56, r = w * 0.32;
    g.beginPath(); g.arc(cx, cy, r, 0, 7);
    const gr = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r); gr.addColorStop(0, '#ffb0a0'); gr.addColorStop(0.6, '#d9302a'); gr.addColorStop(1, '#7a1010');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.fillStyle = '#ffd23f'; for (let i = -2; i <= 2; i++) g.fillRect(cx - r + (i + 2) * r * 0.5 - r * 0.06, cy - r, r * 0.12, r * 2); g.restore();
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.lineWidth = w * 0.03; g.strokeStyle = '#5a0a0a'; g.stroke();
    g.beginPath(); g.moveTo(cx, cy - r); g.quadraticCurveTo(cx + r * 0.3, cy - r * 1.5, cx + r * 0.6, cy - r * 1.35); g.lineWidth = w * 0.045; g.strokeStyle = '#7a5a3a'; g.stroke();
    E.star(g, cx + r * 0.65, cy - r * 1.35, w * 0.09, '#ffd23f');
    g.beginPath(); g.ellipse(cx - r * 0.4, cy - r * 0.45, r * 0.2, r * 0.1, -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
  }
  function fan(g, w, h, base) { // abanico del color
    const cx = w / 2, cy = h * 0.82, R = w * 0.46;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, Math.PI * 1.08, Math.PI * 1.92); g.closePath();
    const gr = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R); gr.addColorStop(0, E.shade(base, 0.5)); gr.addColorStop(1, base); g.fillStyle = gr; g.fill();
    g.lineWidth = w * 0.03; g.strokeStyle = E.shade(base, -0.5); g.stroke();
    for (let i = 1; i < 8; i++) { const a = Math.PI * (1.08 + i * 0.105); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineWidth = w * 0.015; g.stroke(); }
    g.beginPath(); g.arc(cx, cy, R * 0.82, Math.PI * 1.12, Math.PI * 1.88); g.lineWidth = w * 0.04; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
    motif(g, 0, cx, cy - R * 0.55, w * 0.1, E.shade(base, -0.5));
    g.beginPath(); g.arc(cx, cy, w * 0.06, 0, 7); g.fillStyle = '#7a4a1e'; g.fill();
  }
  N.tile = function (t, ts, COLORS) {
    switch (t.kind) {
      case 'cube': return E.sprite('az' + t.color + (t.hintK || ''), ts, ts, (g, w, h) => {
        tile(g, w, h, COLORS[t.color], t.color);
        if (t.hintK) { const s = w * 0.42; g.drawImage(E.emojiSprite(t.hintK === 'rocket' ? '🚀' : t.hintK === 'bomb' ? '💣' : '🔮', s), w - s * 0.95, h - s * 1.05, s, s); }
      });
      case 'rocket': return E.sprite('rk' + t.dir, ts, ts, (g, w, h) => { g.translate(w / 2, h / 2); if (t.dir === 'v') g.rotate(-Math.PI / 2); g.save(); g.translate(w * 0.2, 0); feriaRocket(g, w * 0.66); g.restore(); g.save(); g.translate(-w * 0.2, 0); g.rotate(Math.PI); feriaRocket(g, w * 0.66); g.restore(); });
      case 'bomb': return E.sprite('bomb', ts, ts, cracker);
      case 'disco': return E.sprite('fan' + t.color, ts, ts, (g, w, h) => fan(g, w, h, COLORS[t.color]));
    }
    return null;
  };
  Object.assign(N.emoji, {
    '🚀': (g, w, h) => { g.translate(w / 2, h / 2); g.rotate(-Math.PI / 4); feriaRocket(g, w * 0.9); },
    '💣': cracker,
    '🔮': (g, w, h) => fan(g, w, h, '#e8322b'),
  });

  N.board = function (g, S, bx, by, ts) {
    const cols = []; for (let c = 0; c < S.C; c++) if (S.top[c] < S.R) cols.push(c);
    const rect = (c, e, r) => { E.rr(g, bx + c * ts - e, by + S.top[c] * ts - e, ts + 2 * e, (S.R - S.top[c]) * ts + 2 * e, r); g.fill(); };
    g.fillStyle = 'rgba(80,40,10,0.3)'; for (const c of cols) { g.save(); g.translate(3, 7); rect(c, 12, 16); g.restore(); }
    g.fillStyle = WHITE; for (const c of cols) rect(c, 12, 16);
    g.fillStyle = COB; for (const c of cols) rect(c, 7, 12);
    g.fillStyle = '#e9eef8'; for (const c of cols) rect(c, 3, 9);
    // fondo de azulejo con dibujo suave
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (r >= S.top[c]) {
      const x = bx + c * ts, y = by + r * ts;
      g.fillStyle = (r + c) % 2 ? '#dfe7f6' : '#eef2fa'; g.fillRect(x, y, ts, ts);
      g.beginPath(); g.moveTo(x + ts / 2, y + ts * 0.2); g.lineTo(x + ts * 0.8, y + ts / 2); g.lineTo(x + ts / 2, y + ts * 0.8); g.lineTo(x + ts * 0.2, y + ts / 2); g.closePath(); g.fillStyle = 'rgba(31,79,168,0.08)'; g.fill();
    }
  };
  N.pop = function (t, x, y, ts, COLORS) {
    if (t.kind !== 'cube') return false;
    const c = COLORS[t.color];
    E.burst(x, y, [c, E.shade(c, 0.4), '#d9b48a', WHITE], 8, { size: ts * 0.17, speed: 320 });
    E.burst(x, y, ['#fff6c0', '#ffffff'], 3, { size: ts * 0.14, shape: 'star', speed: 160, life: 0.5 });
    return true;
  };
  N.fx = function (g, f, k, x0, y0, ts, S) {
    if (f.type === 'rocket') {
      const dist = k * Math.max(S.R, S.C) * ts * 1.2, s = ts * 0.9;
      g.save();
      for (const sg of [-1, 1]) {
        for (let i = 1; i < 8; i++) { const d = dist - i * ts * 0.35; if (d <= 0) break; g.globalAlpha = Math.max(0, 1 - i / 8 - k * 0.3); g.beginPath(); const px = f.dir === 'h' ? x0 + sg * d : x0, py = f.dir === 'h' ? y0 : y0 + sg * d; g.arc(px + (i % 2 ? 4 : -4), py + (i % 2 ? -4 : 4), ts * 0.08, 0, 7); g.fillStyle = i % 2 ? '#ffd23f' : '#ff8a1f'; g.fill(); }
        g.globalAlpha = 1; g.save();
        if (f.dir === 'h') { g.translate(x0 + sg * dist, y0); if (sg < 0) g.rotate(Math.PI); } else { g.translate(x0, y0 + sg * dist); g.rotate(sg > 0 ? Math.PI / 2 : -Math.PI / 2); }
        feriaRocket(g, s); g.restore();
      }
      g.restore(); return true;
    }
    if (f.type === 'bomb') { // palmera de fuegos artificiales
      g.save(); const R = ts * (0.5 + k * (f.rad + 0.7)); g.globalAlpha = 1 - k;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.beginPath(); g.moveTo(x0 + Math.cos(a) * R * 0.3, y0 + Math.sin(a) * R * 0.3); g.lineTo(x0 + Math.cos(a) * R, y0 + Math.sin(a) * R); g.lineWidth = ts * 0.1; g.lineCap = 'round'; g.strokeStyle = ['#ffd23f', '#ff5a5a', '#5ab0ff'][i % 3]; g.stroke(); }
      g.restore(); return true;
    }
    return false;
  };
})();
