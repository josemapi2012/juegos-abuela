'use strict';
// Burbujas Panda: lanza burbujas para juntar 3 o más del mismo color y liberar a las crías.
// Mecánicas calcadas de Panda Pop (ver analisis/panda_pop.md): farolillos que se cargan
// +0,34 por disparo acertado de su color y +0,07 por cada burbuja de su color que cae.

const GAME = {
  id: 'burbujas',
  title: 'Burbujas Panda',
  theme: {
    mascot: '🐼',
    accent: '#ff5c8a',
    node: '#5a6cf0',
    bg: ['#ffb3c8', '#7a6cf0'],
    zones: [['#b8e0ff', '#7ab8f5'], ['#ffd6e6', '#f59ac0'], ['#c8f5d0', '#7ed694'], ['#fff0b3', '#f5cf5a'], ['#e0d0ff', '#a98af0']],
    worlds: ['Bosque de Bambú', 'Templo de Jade', 'Jardín de Cerezos', 'Río de los Farolillos', 'Montaña Nevada', 'Pueblo Panda', 'Lago de los Lotos', 'Valle de la Niebla', 'Cueva del Dragón', 'Palacio del Emperador'],
    decor: ['🎋', '🌸', '🎈', '🍃', '🏮', '🌺', '☁️', '🌈', '🐾'],
    panel: { border: '#5a4bd1', top: '#f7f5ff', bottom: '#e0dcff' },
    hudBorder: '#5a4bd1',
    hudTop: '#f8f6ff',
    hudBottom: '#e3deff',
    hudText: '#4a3aa8',
    bar: 'rgba(70,50,150,0.92)',
    movesLabel: 'Burbujas',
    outOfMoves: 'Se acabaron las burbujas',
    moreMoves: '+5 burbujas',
    bgDeco(g, w, h) {
      g.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 173) % w, (i * 311) % h, 14 + (i % 4) * 10, 0, 7); g.fill(); }
    },
  },
};

(function () {
  // 0 rojo (fuego) · 1 azul (agua) · 2 verde (parra) · 3 amarillo (sol) · 4 morado · 5 rosa
  const COLORS = ['#f23b4a', '#2f8df0', '#3fc84a', '#ffc21a', '#a24fe8', '#ff5fb8'];
  const SYMBOL = ['🔥', '💧', '🍃', '☀️', '🔮', '🌸'];
  const LANTERNS = [
    { name: 'Fuego', color: 0, icon: '🔥' },
    { name: 'Agua', color: 1, icon: '💧' },
    { name: 'Parra', color: 2, icon: '🍃' },
    { name: 'Sol', color: 3, icon: '☀️' },
  ];
  const FILL_SHOT = 0.34; // por disparo que explota burbujas (GamePlayModel.AddToJarBonus)
  const FILL_DROP = 0.07; // por burbuja de su color que cae (AddToJarBonusFromDrop)
  const COLS = 12;
  const BW = 580, BH = 622; // tamaño de referencia del tablero (unidades lógicas)
  const VIEW_ROWS = 9; // filas que se ven por encima del lanzador
  let uid = 1;

  // ------------------------------------------------------------ geometría (en unidades del tablero)
  const D = BW / COLS;
  const RH = D * 0.866;
  const colsIn = (r) => (r % 2 === 0 ? COLS : COLS - 1);
  const bxy = (r, c) => [c * D + D / 2 + (r % 2 ? D / 2 : 0), r * RH + D / 2];
  function neighbors(r, c) {
    const odd = r % 2 === 1;
    const n = [[r, c - 1], [r, c + 1]];
    if (odd) n.push([r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]);
    else n.push([r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]);
    return n.filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < colsIn(rr));
  }
  const get = (S, r, c) => (r >= 0 && r < S.grid.length && c >= 0 && c < colsIn(r) ? S.grid[r][c] : null);
  function ensureRows(S, n) { while (S.grid.length < n) S.grid.push(new Array(colsIn(S.grid.length)).fill(null)); }
  function lowestRow(S) { for (let r = S.grid.length - 1; r >= 0; r--) if (S.grid[r].some(Boolean)) return r; return -1; }
  function scrollFor(S) { return Math.max(0, (lowestRow(S) - VIEW_ROWS) * RH); }
  const shooterY = (S, viewH) => scrollFor(S) + viewH - 52;

  // ------------------------------------------------------------ dibujo
  function bubbleSprite(color, size) {
    return E.sprite('bub' + color, size, size, (g, w, h) => {
      const special = typeof color !== 'number';
      const base = color === 'rainbow' ? '#ffffff' : special ? '#ffe7a8' : COLORS[color];
      if (color === 'glass' || color === 'metal' || color === 'spike') {
        // obstáculos de Panda Pop: cristal, metal (sin color) y pinchos
        const cols = { glass: ['rgba(225,245,255,0.95)', 'rgba(150,200,235,0.75)'], metal: ['#e1e6ec', '#7d8894'], spike: ['#ffe3e3', '#c0392b'] }[color];
        const gr = g.createRadialGradient(w * 0.36, h * 0.32, w * 0.04, w / 2, h / 2, w * 0.5);
        gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
        g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7); g.fillStyle = gr; g.fill();
        g.lineWidth = w * 0.04; g.strokeStyle = color === 'glass' ? '#ffffff' : '#555e68'; g.stroke();
        if (color === 'glass') { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = w * 0.05; g.beginPath(); g.moveTo(w * 0.3, h * 0.7); g.lineTo(w * 0.7, h * 0.3); g.moveTo(w * 0.45, h * 0.78); g.lineTo(w * 0.78, h * 0.45); g.stroke(); }
        if (color === 'metal') { g.fillStyle = '#5d6772'; [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, w * 0.06, 0, 7); g.fill(); }); }
        if (color === 'spike') { g.fillStyle = '#7b1d14'; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * w * 0.5, h / 2 + Math.sin(a) * h * 0.5); g.lineTo(w / 2 + Math.cos(a + 0.25) * w * 0.33, h / 2 + Math.sin(a + 0.25) * h * 0.33); g.lineTo(w / 2 + Math.cos(a - 0.25) * w * 0.33, h / 2 + Math.sin(a - 0.25) * h * 0.33); g.fill(); } }
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(w * 0.33, h * 0.26, w * 0.12, h * 0.07, -0.6, 0, 7); g.fill();
        return;
      }
      if (color === 'rainbow') {
        const lg = g.createLinearGradient(0, 0, w, h);
        COLORS.forEach((c, i) => lg.addColorStop(i / 5, c));
        g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7); g.fillStyle = lg; g.fill();
      } else {
        const gr = g.createRadialGradient(w * 0.36, h * 0.32, w * 0.04, w / 2, h / 2, w * 0.5);
        gr.addColorStop(0, E.shade(base, 0.6)); gr.addColorStop(0.55, base); gr.addColorStop(1, E.shade(base, -0.35));
        g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7); g.fillStyle = gr; g.fill();
      }
      g.lineWidth = w * 0.035; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke();
      // dibujo de cada color (como en Panda Pop: llama, agua, hoja, sol…)
      let ch = null;
      if (typeof color === 'number') ch = SYMBOL[color];
      else if (color === 'bomb') ch = '💣';
      else if (color === 'dragon') ch = '🐉';
      else if (LANTERN_POWER[color]) ch = LANTERN_POWER[color];
      if (ch) {
        const s = w * (special ? 0.66 : 0.52);
        g.globalAlpha = special ? 1 : 0.88;
        g.drawImage(E.emojiSprite(ch, s), (w - s) / 2, (h - s) / 2 + h * 0.02, s, s);
        g.globalAlpha = 1;
      }
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.ellipse(w * 0.33, h * 0.26, w * 0.12, h * 0.07, -0.6, 0, 7); g.fill();
    });
  }
  const LANTERN_POWER = { fire: '🔥', water: '💧', vine: '🍃', sun: '☀️' };
  // obstáculos de Panda Pop que no son de color: runa, nube, hiedra (y su madre), bambú y revólver
  const OBS = { rune: ['#8a8fa8', '🔯'], runeOn: ['#ffcf3f', '🔯'], cloud: ['#ffffff', '☁️'], ivy: ['#2f7d32', '🌿'], ivymom: ['#1b5e20', '🪴'], bamboo: ['#c9e59a', '🎋'], rev: ['#ffb3d9', '🌀'], rocketo: ['#dfe6ee', ''],
    iceb: ['#e8f7ff', '❄️'], gift: ['#ffcf8a', '🎁'], volcano: ['#a0705a', '🌋'], drain: ['#4a4a5a', '🚫'], foam: ['#ffffff', ''],
    sfire: ['#ff8a3d', '🔥'], swater: ['#59b8ff', '🌊'], svine: ['#5fd16a', '🌿'], ssun: ['#ffd23f', '☀️'],
    gspike: ['#ffd23f', '✴️'], gspikeOff: ['#d8cfae', '✴️'],
    smoke: ['#6b6b78', '💨'], fan: ['#c9a06b', ''], bumper: ['#e8e8f0', '🛞'], fairy: ['#ffe9fb', '🧚'], rock: ['#8d7b68', '🪨'], cannon: ['#7a7f8a', ''] };
  function obsSprite(kind, size) {
    return E.sprite('obs' + kind, size, size, (g, w, h) => {
      const [base, ch] = OBS[kind];
      const gr = g.createRadialGradient(w * 0.36, h * 0.32, w * 0.04, w / 2, h / 2, w * 0.5);
      gr.addColorStop(0, E.shade(base, 0.5)); gr.addColorStop(1, E.shade(base, -0.25));
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7); g.fillStyle = gr; g.fill();
      g.lineWidth = w * 0.04; g.strokeStyle = kind === 'runeOn' ? '#fff6a0' : 'rgba(60,60,80,0.55)'; g.stroke();
      const s = w * 0.62; if (ch) g.drawImage(E.emojiSprite(ch, s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  // cohete-obstáculo: apunta a una de las 6 direcciones del hexágono
  const ROCKET_ANG = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
  const isObs = (b) => b && OBS[b.color] != null || (b && b.color === 'rune');
  // burbujas que sujetan a las demás (no caen nunca): fijas, encadenadas, nubes, madre de la hiedra, bambú y revólver
  const anchor = (b) => b && (b.fixed || b.chain || b.rope || b.color === 'cloud' || b.color === 'ivymom' || b.color === 'bamboo' || b.color === 'rev');
  function iceCap(size) {
    return E.sprite('icecap', size, size, (g, w, h) => {
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.49, 0, 7); g.fillStyle = 'rgba(210,240,255,0.55)'; g.fill();
      g.lineWidth = w * 0.06; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = w * 0.04;
      g.beginPath(); g.moveTo(w * 0.2, h * 0.4); g.lineTo(w * 0.45, h * 0.55); g.lineTo(w * 0.4, h * 0.8); g.moveTo(w * 0.45, h * 0.55); g.lineTo(w * 0.75, h * 0.45); g.stroke();
    });
  }
  function drawBubble(g, b, x, y, size) {
    const s = size * (b.sc == null ? 1 : b.sc);
    g.save();
    if (b.alpha != null && b.alpha < 1) g.globalAlpha = Math.max(0, b.alpha);
    if (b.color === 'foam') { // espuma: bolitas blancas
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [dx, dy, rr] of [[-0.18, -0.15, 0.22], [0.2, -0.12, 0.2], [0, 0.18, 0.24], [-0.22, 0.16, 0.14], [0.24, 0.2, 0.13]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, rr * s, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(150,190,220,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, s * 0.44, 0, 7); g.stroke();
    } else if (isObs(b)) g.drawImage(obsSprite(b.color === 'rune' && b.on ? 'runeOn' : b.color === 'gspike' && !b.on ? 'gspikeOff' : b.color, size), x - s / 2, y - s / 2, s, s);
    else g.drawImage(bubbleSprite(b.color, size), x - s / 2, y - s / 2, s, s);
    if (b.fixed) { g.lineWidth = s * 0.07; g.strokeStyle = '#6b4a2b'; g.beginPath(); g.arc(x, y, s * 0.44, 0, 7); g.stroke(); g.fillStyle = '#6b4a2b'; g.fillRect(x - s * 0.04, y - s * 0.62, s * 0.08, s * 0.2); }
    if (b.chain) { const cs = s * 0.6; g.drawImage(E.emojiSprite('⛓️', cs), x - cs / 2, y - cs / 2, cs, cs); }
    if (b.lock) { const cs = s * 0.5; g.drawImage(E.emojiSprite('🔒', cs), x - cs / 2, y - cs / 2, cs, cs); }
    if (b.morph) { const cs = s * 0.42; g.drawImage(E.emojiSprite('✨', cs), x + s * 0.12, y - s * 0.5, cs, cs); }
    if (b.color === 'fan' || b.color === 'cannon') { // ventilador y cañón: dibujo que apunta
      const rs = s * 0.6; g.save(); g.translate(x, y);
      if (b.color === 'fan') { if (b.on !== false) g.rotate(E.t * 8); g.drawImage(E.emojiSprite('🪭', rs), -rs / 2, -rs / 2, rs, rs); }
      else { g.rotate(ROCKET_ANG[b.dir || 0]); g.fillStyle = '#2b2d33'; g.fillRect(0, -s * 0.1, s * 0.42, s * 0.2); g.beginPath(); g.arc(0, 0, s * 0.2, 0, 7); g.fill(); }
      g.restore();
    }
    if (b.leaf) { const ls = s * 0.9; g.drawImage(E.emojiSprite('🍃', ls), x - ls / 2, y - ls / 2, ls, ls); }
    if (b.rope) { g.strokeStyle = b.rope > 1 ? '#6b4a2b' : '#b08a5a'; g.lineWidth = s * (b.rope > 1 ? 0.09 : 0.05); g.beginPath(); g.moveTo(x - s * 0.45, y - s * 0.45); g.lineTo(x + s * 0.45, y + s * 0.45); g.moveTo(x + s * 0.45, y - s * 0.45); g.lineTo(x - s * 0.45, y + s * 0.45); g.stroke(); }
    if (b.mask) { const ms = s * 0.55; g.drawImage(E.emojiSprite('🎭', ms), x - ms / 2, y - ms / 2, ms, ms); }
    if (b.charger) { g.strokeStyle = '#fff'; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(x - s * 0.22, y - s * 0.22); g.lineTo(x + s * 0.22, y + s * 0.22); g.moveTo(x + s * 0.22, y - s * 0.22); g.lineTo(x - s * 0.22, y + s * 0.22); g.stroke(); }
    if (b.crystal) { g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = s * 0.05; g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineTo(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42); } g.closePath(); g.stroke(); }
    if (b.rot) { const rs = s * 0.36; g.drawImage(E.emojiSprite('🔄', rs), x - s * 0.5, y - s * 0.5, rs, rs); }
    if (b.shield != null) { // escudo giratorio con un hueco abierto
      g.strokeStyle = '#c0c6d0'; g.lineWidth = s * 0.1; const a0 = [-2 * Math.PI / 3, -Math.PI / 3, 0, Math.PI / 3, 2 * Math.PI / 3, Math.PI]; // mismo orden que ringOf
      const ang = Math.atan2(Math.sin(a0[b.shield] || 0), Math.cos(a0[b.shield] || 0));
      g.beginPath(); g.arc(x, y, s * 0.5, ang + 0.6, ang + 2 * Math.PI - 0.6); g.stroke();
    }
    if (b.color === 'rocketo') { const rs = s * 0.6; g.save(); g.translate(x, y); g.rotate(ROCKET_ANG[b.dir || 0] + Math.PI / 4); g.drawImage(E.emojiSprite('🚀', rs), -rs / 2, -rs / 2, rs, rs); g.restore(); }
    if (b.ghost) { const gs = s * 0.4; g.drawImage(E.emojiSprite('👻', gs), x + s * 0.1, y - s * 0.52, gs, gs); }
    if (b.swapR) { const ws = s * 0.4; g.drawImage(E.emojiSprite('🔁', ws), x + s * 0.3, y - ws / 2, ws, ws); }
    if (b.dice) { g.strokeStyle = '#fff'; g.lineWidth = s * 0.06; g.strokeRect(x - s * 0.3, y - s * 0.3, s * 0.6, s * 0.6); }
    if (b.color === 'bamboo' && b.hp > 1) { g.fillStyle = '#4b6b1e'; g.beginPath(); g.arc(x + s * 0.3, y - s * 0.3, s * 0.17, 0, 7); g.fill(); E.text(g, String(b.hp), x + s * 0.3, y - s * 0.29, s * 0.22, '#fff', { stroke: false }); }
    if (b.cd != null) { g.beginPath(); g.arc(x, y, s * 0.26, 0, 7); g.fillStyle = b.cd <= 2 ? '#d62828' : '#2b2b33'; g.fill(); g.lineWidth = s * 0.05; g.strokeStyle = '#fff'; g.stroke(); E.text(g, String(b.cd), x, y + 1, s * 0.3, '#fff', { stroke: false }); }
    if (b.ice) { // burbuja congelada: capa de hielo encima
      g.globalAlpha *= 0.85;
      g.drawImage(iceCap(size), x - s / 2, y - s / 2, s, s);
      g.globalAlpha = b.alpha != null && b.alpha < 1 ? Math.max(0, b.alpha) : 1;
    }
    if (b.plus || b.baboon || b.death) { const ms = s * 0.62; g.drawImage(E.emojiSprite(b.plus ? '➕' : b.baboon ? '🐒' : '☠️', ms), x - ms / 2, y - ms / 2, ms, ms); }
    if (b.panda) {
      // la cría tapa el dibujo del color, pero deja ver el color alrededor
      const ps = s * 0.74;
      g.drawImage(E.emojiSprite('🐼', ps), x - ps / 2, y - ps / 2 + Math.sin(E.t * 3 + b.id) * 1.5, ps, ps);
    }
    g.restore();
  }
  GAME.drawGoalIcon = function (g, gl, x, y, s) {
    if (gl.type === 'panda') g.drawImage(E.emojiSprite('🐼', s), x - s / 2, y - s / 2, s, s);
    else g.drawImage(bubbleSprite(gl.key, s), x - s / 2, y - s / 2, s, s);
  };

  // ------------------------------------------------------------ lógica
  function trace(S, x0, y0, ang, passThrough) {
    let x = x0, y = y0, dx = Math.cos(ang), dy = Math.sin(ang);
    const pts = [[x, y]], foam = [], hitObs = [];
    let bounces = 0, lastDefl = null;
    const step = D / 5;
    for (let i = 0; i < 3000; i++) {
      x += dx * step; y += dy * step;
      if (x < D / 2) { x = D - x; dx = -dx; pts.push([x, y]); }
      if (x > BW - D / 2) { x = 2 * (BW - D / 2) - x; dx = -dx; pts.push([x, y]); }
      if (y <= D / 2) { y = D / 2; pts.push([x, y]); return { pts, x, y, foam }; }
      if (passThrough) continue;
      const rr = Math.round((y - D / 2) / RH);
      for (let r = rr - 1; r <= rr + 1; r++) {
        if (r < 0 || r >= S.grid.length) continue;
        for (let c = 0; c < colsIn(r); c++) {
          if (!S.grid[r][c]) continue;
          const [bx, by] = bxy(r, c);
          if ((bx - x) * (bx - x) + (by - y) * (by - y) < (D * 0.82) * (D * 0.82)) {
            const o = S.grid[r][c];
            if (o.color === 'foam') { if (!foam.some(([fr, fc]) => fr === r && fc === c)) foam.push([r, c]); continue; } // la espuma se atraviesa
            if (o.color === 'bumper' && bounces < 4 && lastDefl !== o) { // parachoques: la burbuja rebota
              const nx = (x - bx) / Math.hypot(x - bx, y - by), ny = (y - by) / Math.hypot(x - bx, y - by), dot = dx * nx + dy * ny;
              dx -= 2 * dot * nx; dy -= 2 * dot * ny; bounces++; lastDefl = o; pts.push([x, y]); hitObs.push([r, c]); continue;
            }
            if (o.color === 'fan' && o.on !== false && lastDefl !== o) { // ventilador: sopla la burbuja de lado
              dx = (o.dir || 1) * 0.99; dy = -0.14; lastDefl = o; pts.push([x, y]); hitObs.push([r, c]); continue;
            }
            pts.push([x, y]); return { pts, x, y, hit: [r, c], foam };
          }
        }
      }
    }
    pts.push([x, y]);
    return { pts, x, y };
  }
  function attached(S, r, c) { if (r === 0) return true; return neighbors(r, c).some(([rr, cc]) => get(S, rr, cc)); }
  function snap(S, x, y) {
    const rr = Math.max(0, Math.round((y - D / 2) / RH));
    ensureRows(S, rr + 3);
    let best = null, bd = 1e9;
    for (let r = Math.max(0, rr - 1); r <= rr + 1; r++) for (let c = 0; c < colsIn(r); c++) {
      if (S.grid[r][c] || !attached(S, r, c)) continue;
      const [bx, by] = bxy(r, c);
      const dd = (bx - x) * (bx - x) + (by - y) * (by - y);
      if (dd < bd) { bd = dd; best = [r, c]; }
    }
    return best;
  }
  function cluster(S, r, c) {
    const start = S.grid[r][c];
    const seen = new Set([r * 64 + c]);
    const out = [[r, c]];
    for (let i = 0; i < out.length; i++) {
      for (const [nr, nc] of neighbors(out[i][0], out[i][1])) {
        const k = nr * 64 + nc;
        if (seen.has(k)) continue;
        const o = get(S, nr, nc);
        if (o && o.color === start.color && !o.ice && !o.chain && !o.leaf && o.shield == null) { seen.add(k); out.push([nr, nc]); }
      }
    }
    return out;
  }
  function floating(S) {
    const seen = new Set();
    const stack = [];
    for (let c = 0; c < colsIn(0); c++) if (S.grid[0] && S.grid[0][c]) { seen.add(c); stack.push([0, c]); }
    for (let r = 1; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) if (anchor(S.grid[r][c])) { seen.add(r * 64 + c); stack.push([r, c]); }
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [nr, nc] of neighbors(r, c)) {
        const k = nr * 64 + nc;
        if (seen.has(k) || !get(S, nr, nc)) continue;
        seen.add(k); stack.push([nr, nc]);
      }
    }
    const out = [];
    for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) if (S.grid[r][c] && !seen.has(r * 64 + c)) out.push([r, c]);
    return out;
  }
  function addLantern(S, color, amount) {
    if (!S.lan || color > 3 || typeof color !== 'number') return;
    S.lan[color] = Math.min(1, S.lan[color] + amount);
  }
  const o0shield = (b) => b && b.shield != null;
  // anillo de vecinos ordenado por ángulo (para el revólver y el escudo giratorio)
  function ringOf(r, c) {
    const [x0, y0] = bxy(r, c);
    return [[r, c - 1], [r, c + 1], ...(r % 2 ? [[r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]] : [[r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]])]
      .map(([rr, cc]) => { const [x, y] = bxy(rr, cc); return [rr, cc, Math.atan2(y - y0, x - x0)]; }).sort((a, b2) => a[2] - b2[2]);
  }
  // copia la burbuja antes de cambiarla (el bot simula sobre copias del tablero que comparten burbujas)
  function mut(S, r, c) { const q = Object.assign({}, S.grid[r][c]); S.grid[r][c] = q; return q; }
  // Al final de cada disparo: sorpresas que cambian de color, cuenta atrás, hiedra que crece y revólveres que giran
  function endShot(S, K) {
    // cañones a los que se ha disparado: lanzan una burbuja de color en su dirección
    for (const [cr, cc, dir] of S.cannonQ || []) {
      const [x0, y0] = bxy(cr, cc), a = ROCKET_ANG[dir];
      const tr = trace(S, x0 + Math.cos(a) * D * 0.9, y0 + Math.sin(a) * D * 0.9, a);
      const cell = snap(S, tr.x, tr.y);
      if (cell) { K.cannon(cr, cc, tr.pts); land(S, { color: nextColor(S) }, cell, K, null, tr.hit); }
    }
    S.cannonQ = null;
    const cols = presentColors(S);
    const boom = [];
    for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) {
      const b = S.grid[r][c];
      if (!b) continue;
      if (b.morph && cols.length > 1) { let nc = b.color; while (nc === b.color) nc = S.rand.pick(cols); b.color = nc; }
      if (b.cd != null) { b.cd--; if (b.cd <= 0) boom.push([r, c]); }
      if (b.color === 'gspike') b.on = !b.on; // pinchos dorados: se encienden y se apagan en cada disparo
      if (b.color === 'smoke') b.on = !b.on; // humo: tapa los colores de alrededor un disparo sí y otro no
      if (b.color === 'fan' && !b.perma) b.on = !b.on; // ventilador encendido / apagado
      if (b.shield != null) b.shield = (b.shield + 1) % 6; // el escudo gira
    }
    // cuenta atrás a 0: el barril suelta humo que apaga los farolillos (TutorialTimerDrain) y desaparece
    for (const [r, c] of boom) { S.grid[r][c] = null; S.lan = [0, 0, 0, 0]; K.drain(r, c); }
    // burbujas que se intercambian con la de su derecha en cada disparo
    for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r) - 1; c++) {
      const a = S.grid[r][c], b2 = S.grid[r][c + 1];
      if (a && a.swapR && b2 && typeof a.color === 'number' && typeof b2.color === 'number') { const t = a.color; a.color = b2.color; b2.color = t; }
    }
    // hiedra venenosa: si en el disparo no se ha roto hiedra, crece desde su madre a una burbuja de al lado
    if (!S.ivyHit) {
      const opts = [];
      for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) {
        const b = S.grid[r][c];
        if (!b || (b.color !== 'ivy' && b.color !== 'ivymom')) continue;
        for (const [nr, nc] of neighbors(r, c)) { const o = get(S, nr, nc); if (o && typeof o.color === 'number' && !o.panda && !o.chain && !o.lock) opts.push([nr, nc]); }
      }
      if (opts.length) { const [r, c] = S.rand.pick(opts); S.grid[r][c] = { id: uid++, color: 'ivy' }; K.thaw(S.grid[r][c], r, c); }
    }
    S.ivyHit = false;
    // fantasmas: dos grupos que se turnan en cada disparo; los transparentes se atraviesan
    S.shotN = (S.shotN || 0) + 1;
    const hide = [];
    for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) { const b = S.grid[r][c]; if (b && b.ghost && b.phase !== S.shotN % 2) hide.push([r, c, b]); }
    const back = [];
    for (const gh of S.ghosts || []) { if (gh.b.phase === S.shotN % 2 && !get(S, gh.r, gh.c)) { ensureRows(S, gh.r + 1); S.grid[gh.r][gh.c] = gh.b; K.thaw(gh.b, gh.r, gh.c); } else back.push(gh); }
    S.ghosts = back;
    for (const [r, c, b] of hide) { S.grid[r][c] = null; S.ghosts.push({ r, c, b }); }
    // revólver: gira una posición el anillo de 6 burbujas que lo rodea
    for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) {
      const b = S.grid[r][c];
      if (!b || (b.color !== 'rev' && !b.rot)) continue; // revólver y rotador simple
      ensureRows(S, r + 2);
      const [x0, y0] = bxy(r, c);
      const ring = neighbors(r, c).map(([rr, cc]) => { const [x, y] = bxy(rr, cc); return [rr, cc, Math.atan2(y - y0, x - x0)]; }).sort((a, b2) => a[2] - b2[2]);
      if (ring.length < 6) continue;
      const vals = ring.map(([rr, cc]) => S.grid[rr][cc]);
      ring.forEach(([rr, cc], i) => { S.grid[rr][cc] = vals[(i + vals.length - 1) % vals.length]; });
      K.spin(r, c);
    }
  }
  function circleCells(S, r, c, radius) {
    const [x1, y1] = bxy(r, c); const out = [];
    for (let rr = r - Math.ceil(radius) - 1; rr <= r + Math.ceil(radius) + 1; rr++) for (let cc = 0; cc < COLS; cc++) {
      const o = get(S, rr, cc); if (!o) continue;
      const [x2, y2] = bxy(rr, cc);
      if (Math.hypot(x1 - x2, y1 - y2) <= D * radius + 1) out.push([rr, cc]);
    }
    return out;
  }
  // Coloca la burbuja disparada y resuelve. Devuelve lo que pasó. K recibe los eventos.
  function land(S, shot, cellRC, K, extra, hitRC) {
    const [r, c] = cellRC;
    ensureRows(S, r + 2);
    const toPop = new Map();
    const add = (list) => list.forEach(([rr, cc]) => { if (get(S, rr, cc)) toPop.set(rr * 64 + cc, [rr, cc]); });
    const powers = shot.powers || [];
    // la burbuja golpeó a otra: pinchos y cristal (textos oficiales de Panda Pop)
    const hitB = hitRC ? get(S, hitRC[0], hitRC[1]) : null;
    const plain = !powers.length && shot.color !== 'bomb';
    if (hitB && (hitB.color === 'spike' || (hitB.color === 'gspike' && hitB.on)) && plain) {
      // "cualquier burbuja que lances explotará si toca los pinchos"
      K.spiked(r, c);
      return { popped: 0, dropped: 0, pandas: 0, spiked: true };
    }
    if (hitB && hitB.color === 'glass') {
      // "golpea el cristal con cualquier burbuja para romperlo; si golpeas una fila de cristales, caerán todos"
      const seen = new Set([hitRC[0] * 64 + hitRC[1]]); const st = [hitRC];
      while (st.length) { const [gr, gc] = st.pop(); toPop.set(gr * 64 + gc, [gr, gc]); for (const [nr, nc] of neighbors(gr, gc)) { const o = get(S, nr, nc); if (o && o.color === 'glass' && !seen.has(nr * 64 + nc)) { seen.add(nr * 64 + nc); st.push([nr, nc]); } } }
    }
    if (shot.color === 'bomb') { K.boom(r, c, 1.7); add(circleCells(S, r, c, 1.7)); }
    // Alcances exactos de Panda Pop (BubblePopLogicService, ver analisis/panda_pop.md §8)
    const has = (p) => powers.includes(p);
    const rowAt = (rr) => { if (rr < 0) return; K.wave(rr); for (let cc = 0; cc < colsIn(rr); cc++) if (get(S, rr, cc)) toPop.set(rr * 64 + cc, [rr, cc]); };
    const colAt = (dc) => { // parra extra recta por una columna vecina, hasta el techo
      const [x0] = bxy(r, c);
      for (let rr = 0; rr <= r + 1; rr++) for (let cc = 0; cc < colsIn(rr); cc++) {
        const o = get(S, rr, cc); if (!o) continue;
        if (Math.abs(bxy(rr, cc)[0] - (x0 + dc * D)) < D * 0.55) toPop.set(rr * 64 + cc, [rr, cc]);
      }
    };
    const rays = (width) => { // rayos de sol largos por las dos diagonales del hexágono
      const [x0, y0] = bxy(r, c);
      for (const a of [Math.PI / 3, (2 * Math.PI) / 3]) {
        const dx = Math.cos(a), dy = Math.sin(a), pts = [];
        for (const sgn of [-1, 1]) for (let t = 0; t < 40 * D; t += D / 4) {
          const x = x0 + sgn * dx * t, y = y0 + sgn * dy * t;
          if (x < 0 || x > BW || y < 0) break;
          pts.push([x, y]);
          const rr = Math.round((y - D / 2) / RH);
          for (let q = rr - 1; q <= rr + 1; q++) for (let cc = 0; cc < colsIn(q); cc++) {
            if (!get(S, q, cc)) continue;
            const [bx, by] = bxy(q, cc);
            if (Math.hypot(bx - x, by - y) < D * 0.55 * width) toPop.set(q * 64 + cc, [q, cc]);
          }
        }
        K.beam(pts);
      }
    };
    const n = ['fire', 'water', 'vine', 'sun'].filter(has).length;
    if (has('fire') && has('water') && n === 2) { for (let k = -2; k <= 2; k++) rowAt(r + k); } // "lava": 5 filas
    else {
      if (has('fire')) { K.boom(r, c, 2); add(circleCells(S, r, c, 2.05)); } // hexágono de radio 2 (19)
      if (has('water')) {
        // solo la fila del impacto, como el original ("El agua despeja una fila entera de burbujas")
        rowAt(r); if (n >= 2) rowAt(r - 1); if (has('vine')) rowAt(r + 1);
      }
      if (has('sun')) { K.boom(r, c, 1); add(circleCells(S, r, c, 1.05)); if (n >= 2) rays(n >= 3 ? 3 : has('fire') ? 2 : 1); }
      if (has('vine') && (has('water') || has('fire') || n >= 3)) { colAt(-1); colAt(1); }
    }
    if (extra && extra.length) add(extra); // casillas tocadas por la parra
    if (powers.includes('dragon')) {
      const low = lowestRow(S);
      K.dragon();
      for (let rr = Math.max(0, low - 10); rr <= low; rr++) for (let cc = 0; cc < colsIn(rr); cc++) if (get(S, rr, cc)) toPop.set(rr * 64 + cc, [rr, cc]);
    }
    let shotColor = null;
    const normal = typeof shot.color === 'number' || shot.color === 'rainbow';
    if (normal && !powers.length) {
      let color = shot.color;
      if (color === 'rainbow') {
        const cnt = {};
        neighbors(r, c).forEach(([rr, cc]) => { const o = get(S, rr, cc); if (o) cnt[o.color] = (cnt[o.color] || 0) + 1; });
        let bestC = null; for (const k in cnt) if (bestC === null || cnt[k] > cnt[bestC]) bestC = +k;
        color = bestC === null ? 0 : bestC;
      }
      const b = { id: uid++, color };
      S.grid[r][c] = b;
      K.placed(b, r, c);
      const cl = cluster(S, r, c);
      if (cl.length >= 3) { add(cl); shotColor = color; }
    }
    // Reacciones (reglas de Panda Pop, ver analisis/panda_pop.md): lo que estalla al lado o recibe un disparo directo
    const TOUCH = ['cloud', 'ivy', 'bamboo', 'gift', 'rocketo', 'rune', 'volcano', 'sfire', 'swater', 'svine', 'ssun', 'drain', 'smoke', 'fairy'];
    // disparo directo a una roca (se vuelve de color) o a un cañón (dispara una burbuja en su dirección)
    if (hitB && plain && hitB.color === 'rock') { const q = { id: uid++, color: nextColor(S) }; S.grid[hitRC[0]][hitRC[1]] = q; K.thaw(q, hitRC[0], hitRC[1]); }
    if (hitB && plain && hitB.color === 'cannon') (S.cannonQ = S.cannonQ || []).push([hitRC[0], hitRC[1], hitB.dir || 0]);
    const key = (rr, cc) => rr * 64 + cc;
    const handled = new Set(), spread = new Set();
    const queue = [];
    if (hitB && plain && TOUCH.includes(hitB.color)) queue.push(hitRC);
    const colAll = (x0) => { for (let rr = 0; rr < S.grid.length; rr++) for (let cc = 0; cc < colsIn(rr); cc++) if (get(S, rr, cc) && Math.abs(bxy(rr, cc)[0] - x0) < D * 0.55) toPop.set(key(rr, cc), [rr, cc]); };
    for (let guard = 0; guard < 50; guard++) {
      // vecinos de lo que va a estallar (solo una vez por casilla)
      for (const [pr, pc] of [...toPop.values()]) {
        if (spread.has(key(pr, pc))) continue;
        spread.add(key(pr, pc));
        for (const [nr, nc] of neighbors(pr, pc)) { const o = get(S, nr, nc); if (o && !toPop.has(key(nr, nc)) && TOUCH.includes(o.color)) queue.push([nr, nc]); }
      }
      if (!queue.length) break;
      while (queue.length) {
        const [tr, tc] = queue.shift();
        const k = key(tr, tc), o = get(S, tr, tc);
        if (!o || handled.has(k) || toPop.has(k)) continue;
        handled.add(k);
        if (o.color === 'bamboo' && o.hp > 1) { const q = mut(S, tr, tc); q.hp--; K.thaw(q, tr, tc); continue; }
        // regalo: se abre y deja una superburbuja en su sitio
        if (o.color === 'gift') { S.grid[tr][tc] = { id: uid++, color: S.rand.pick(['sfire', 'swater', 'svine', 'ssun']) }; K.thaw(S.grid[tr][tc], tr, tc); continue; }
        toPop.set(k, [tr, tc]);
        const [x0, y0] = bxy(tr, tc);
        if (o.color === 'rune') { K.boom(tr, tc, 1); add(circleCells(S, tr, tc, 1.05)); } // reacción en cadena
        else if (o.color === 'sfire') { K.boom(tr, tc, 2); add(circleCells(S, tr, tc, 2.05)); }
        else if (o.color === 'ssun') { K.boom(tr, tc, 1); add(circleCells(S, tr, tc, 1.05)); }
        else if (o.color === 'swater') { K.wave(tr); for (let cc = 0; cc < colsIn(tr); cc++) if (get(S, tr, cc)) toPop.set(key(tr, cc), [tr, cc]); }
        else if (o.color === 'svine') colAll(x0);
        else if (o.color === 'drain') { S.lan = [0, 0, 0, 0]; K.drain(tr, tc); }
        else if (o.color === 'fairy') { // el hada sale volando y libera hasta 3 crías
          K.boom(tr, tc, 0.6);
          let k2 = 0;
          for (let rr = 0; rr < S.grid.length && k2 < 3; rr++) for (let cc = 0; cc < colsIn(rr) && k2 < 3; cc++) { const q = S.grid[rr][cc]; if (q && q.panda && !toPop.has(key(rr, cc))) { toPop.set(key(rr, cc), [rr, cc]); k2++; } }
        }
        else if (o.color === 'volcano') { // erupción hacia arriba: un cono que se abre
          K.boom(tr, tc, 1.5);
          for (let kk = 1; kk <= 4; kk++) for (let cc = 0; cc < colsIn(tr - kk); cc++) { if (tr - kk < 0) break; if (get(S, tr - kk, cc) && Math.abs(bxy(tr - kk, cc)[0] - x0) <= D * (0.6 + kk * 0.5)) toPop.set(key(tr - kk, cc), [tr - kk, cc]); }
        } else if (o.color === 'rocketo') { // vuela en su dirección hasta chocar y explota
          const a2 = ROCKET_ANG[o.dir || 0], pts = [[x0, y0]];
          let boomAt = null;
          for (let t = D / 4; t < 40 * D && !boomAt; t += D / 4) {
            const x = x0 + Math.cos(a2) * t, y = y0 + Math.sin(a2) * t;
            if (x < 0 || x > BW || y < 0 || y > S.grid.length * RH + D) break;
            pts.push([x, y]);
            const rr = Math.round((y - D / 2) / RH);
            for (let q = rr - 1; q <= rr + 1 && !boomAt; q++) for (let cc = 0; cc < colsIn(q); cc++) { if (!get(S, q, cc) || (q === tr && cc === tc)) continue; const [bx, by] = bxy(q, cc); if (Math.hypot(bx - x, by - y) < D * 0.6) { boomAt = [q, cc]; break; } }
          }
          K.beam(pts);
          if (boomAt) { K.boom(boomAt[0], boomAt[1], 1); add(circleCells(S, boomAt[0], boomAt[1], 1.05)); }
        }
      }
    }
    // la cerradura: un disparo directo o hacerla estallar rompe todas las cadenas
    if ((hitB && plain && hitB.lock) || [...toPop.values()].some(([rr, cc]) => S.grid[rr][cc].lock)) {
      if (hitB && hitB.lock) toPop.set(key(hitRC[0], hitRC[1]), hitRC);
      for (let rr = 0; rr < S.grid.length; rr++) for (let cc = 0; cc < colsIn(rr); cc++) { const o = S.grid[rr][cc]; if (o && o.chain && !toPop.has(key(rr, cc))) { const q = mut(S, rr, cc); q.chain = false; K.thaw(q, rr, cc); } }
    }
    // hojas: se caen cuando estalla algo a su lado; escudo giratorio: se quita si estalla algo por su lado abierto
    for (const [pr, pc] of [...toPop.values()]) for (const [nr, nc] of neighbors(pr, pc)) {
      const o = get(S, nr, nc);
      if (!o || toPop.has(key(nr, nc))) continue;
      if (o.leaf) { const q = mut(S, nr, nc); q.leaf = false; K.thaw(q, nr, nc); }
      if (o.shield != null && ringOf(nr, nc)[o.shield] && ringOf(nr, nc)[o.shield][0] === pr && ringOf(nr, nc)[o.shield][1] === pc) { const q = mut(S, nr, nc); q.shield = null; K.thaw(q, nr, nc); }
    }
    if (o0shield(hitB) && ringOf(hitRC[0], hitRC[1])[hitB.shield] && ringOf(hitRC[0], hitRC[1])[hitB.shield][0] === r && ringOf(hitRC[0], hitRC[1])[hitB.shield][1] === c) { const q = mut(S, hitRC[0], hitRC[1]); q.shield = null; K.thaw(q, hitRC[0], hitRC[1]); }
    // máscara: la primera vez que iba a estallar solo pierde la máscara
    for (const [pr, pc] of [...toPop.values()]) { const o = S.grid[pr][pc]; if (o.mask) { toPop.delete(key(pr, pc)); const q = mut(S, pr, pc); q.mask = false; K.thaw(q, pr, pc); } }
    // cuerdas: si estalla una burbuja atada, las cuerdas unidas se aflojan (las fuertes pasan a débiles)
    if ([...toPop.values()].some(([pr, pc]) => S.grid[pr][pc].rope)) {
      const st = [...toPop.values()].filter(([pr, pc]) => S.grid[pr][pc].rope), seenR = new Set(st.map(([a2, b2]) => key(a2, b2)));
      while (st.length) {
        const [qr, qc] = st.pop();
        const o = S.grid[qr][qc];
        if (!toPop.has(key(qr, qc))) { const q = mut(S, qr, qc); q.rope = o.rope - 1; K.thaw(q, qr, qc); }
        for (const [nr, nc] of neighbors(qr, qc)) { const n2 = get(S, nr, nc); if (n2 && n2.rope && !seenR.has(key(nr, nc))) { seenR.add(key(nr, nc)); st.push([nr, nc]); } }
      }
    }
    // cristal: cambia de color si le da una burbuja de otro color; al estallar, lo de alrededor se vuelve cristal
    if (hitB && hitB.crystal && plain && !toPop.has(key(hitRC[0], hitRC[1])) && typeof shot.color === 'number' && hitB.color !== shot.color) { const q = mut(S, hitRC[0], hitRC[1]); q.color = shot.color; K.thaw(q, hitRC[0], hitRC[1]); }
    for (const [pr, pc] of [...toPop.values()]) {
      const o = S.grid[pr][pc];
      if (o.charger && typeof o.color === 'number' && o.color < 4) S.lan[o.color] = 1; // supercargador: llena su farolillo
      if (!o.crystal) continue;
      for (const [nr, nc] of neighbors(pr, pc)) { const n2 = get(S, nr, nc); if (n2 && !n2.panda && !toPop.has(key(nr, nc)) && n2.color !== 'glass') { S.grid[nr][nc] = { id: uid++, color: 'glass' }; K.thaw(S.grid[nr][nc], nr, nc); } }
    }
    // hielo (multigolpe): no estalla; toma el color de lo que revienta a su lado
    const iceConv = [];
    for (const [pr, pc] of [...toPop.values()]) {
      const src = S.grid[pr][pc];
      if (src.color === 'iceb') { toPop.delete(key(pr, pc)); iceConv.push([pr, pc, null]); continue; }
      for (const [nr, nc] of neighbors(pr, pc)) { const o = get(S, nr, nc); if (o && o.color === 'iceb' && !toPop.has(key(nr, nc))) iceConv.push([nr, nc, typeof src.color === 'number' ? src.color : null]); }
    }
    // dado: si le da una burbuja de otro color y no estalla, cambia de color
    if (hitB && hitB.dice && plain && !toPop.has(key(hitRC[0], hitRC[1])) && typeof shot.color === 'number') { const q = mut(S, hitRC[0], hitRC[1]); q.color = S.rand.int(S.colors); K.thaw(q, hitRC[0], hitRC[1]); }
    let pandas = 0, extraShots = 0, death = false;
    const popped = [...toPop.values()];
    popped.sort((a, b) => Math.hypot(a[0] - r, a[1] - c) - Math.hypot(b[0] - r, b[1] - c));
    popped.forEach(([rr, cc], i) => {
      const o = S.grid[rr][cc];
      S.grid[rr][cc] = null;
      if (o.panda) pandas++;
      if (o.color === 'ivy' || o.color === 'ivymom') S.ivyHit = true;
      // burbuja "+" (2 de reserva), mandril (te roba 2) y mortífera (se acaba la ronda)
      if (o.plus) extraShots += 2;
      if (o.baboon) extraShots -= 2;
      if (o.death) death = true;
      K.pop(o, rr, cc, Math.min(0.6, i * 0.03));
    });
    const seenIce = new Set();
    for (const [ir, ic, col] of iceConv) {
      if (seenIce.has(key(ir, ic)) || !get(S, ir, ic) || get(S, ir, ic).color !== 'iceb') continue;
      seenIce.add(key(ir, ic));
      const nb = { id: uid++, color: col != null ? col : nextColor(S) };
      S.grid[ir][ic] = nb; K.thaw(nb, ir, ic);
    }
    let dropped = [];
    if (popped.length) {
      dropped = floating(S);
      dropped.forEach(([rr, cc]) => {
        const o = S.grid[rr][cc];
        S.grid[rr][cc] = null;
        if (o.panda) pandas++;
        if (o.plus) extraShots += 2;
        addLantern(S, o.color, FILL_DROP);
        K.drop(o, rr, cc);
      });
    }
    if (shotColor !== null) addLantern(S, shotColor, FILL_SHOT);
    return { popped: popped.length, dropped: dropped.length, pandas, extraShots, death };
  }
  // Recorrido de la parra: atraviesa burbujas abriendo camino hasta el techo
  function vinePath(S, x0, y0, ang) {
    const tr = trace(S, x0, y0, ang, true);
    const hits = new Map();
    let dist = 0;
    for (let i = 1; i < tr.pts.length; i++) {
      const [ax, ay] = tr.pts[i - 1], [bx, by] = tr.pts[i];
      const len = Math.hypot(bx - ax, by - ay);
      for (let t = 0; t <= len; t += D / 4) {
        const x = ax + ((bx - ax) * t) / len, y = ay + ((by - ay) * t) / len;
        const rr = Math.round((y - D / 2) / RH);
        for (let r = rr - 1; r <= rr + 1; r++) for (let c = 0; c < COLS; c++) {
          if (!get(S, r, c)) continue;
          const [cx, cy] = bxy(r, c);
          if (Math.hypot(cx - x, cy - y) < D * 0.75) hits.set(r * 64 + c, [r, c]);
        }
      }
      dist += len;
    }
    return { pts: tr.pts, cells: [...hits.values()] };
  }
  function presentColors(S) {
    const set = new Set();
    for (const row of S.grid) for (const b of row) if (b && typeof b.color === 'number') set.add(b.color);
    return [...set];
  }
  function nextColor(S) {
    const cols = presentColors(S);
    if (!cols.length) return S.rand.int(S.colors);
    return S.rand.pick(cols);
  }

  // ------------------------------------------------------------ generador y bot
  function buildState(spec, seed) {
    const S = { colors: spec.colors, rand: E.rng(seed), lan: [0, 0, 0, 0], ghosts: [], shotN: 0 };
    S.grid = spec.cells.map((row) => row.map((d) => (d ? Object.assign({ id: uid++ }, d) : null)));
    S.grid.forEach((row, r) => row.forEach((b, c) => { if (b && b.ghost && b.phase === 1) { S.ghosts.push({ r, c, b }); row[c] = null; } }));
    return S;
  }
  const nullK = { placed() {}, pop() {}, drop() {}, boom() {}, wave() {}, dragon() {}, beam() {}, spiked() {}, thaw() {}, spin() {}, drain() {}, cannon() {} };
  function botBest(S, viewH) {
    const sx = BW / 2, sy = shooterY(S, viewH);
    const color = S.cur;
    let best = null, bs = -1e9;
    for (let i = 0; i < 32; i++) {
      const ang = -Math.PI + 0.18 + (i / 31) * (Math.PI - 0.36);
      const tr = trace(S, sx, sy, ang);
      const cellRC = snap(S, tr.x, tr.y);
      if (!cellRC) continue;
      const T = { grid: S.grid.map((row) => row.slice()), colors: S.colors, rand: E.rng(1234 + i), lan: S.lan.slice() }; // azar propio: simular no debe cambiar el de la partida
      const res = land(T, { color }, cellRC, nullK, tr.foam, tr.hit);
      if (res.spiked) continue;
      let score = res.popped * 1 + res.dropped * 1.6 + res.pandas * 25 + (res.extraShots || 0) * 4 - (res.death ? 1000 : 0);
      if (!res.popped) {
        const same = neighbors(cellRC[0], cellRC[1]).filter(([rr, cc]) => { const o = get(S, rr, cc); return o && o.color === color; }).length;
        score = same * 0.6 - 1;
      }
      score -= cellRC[0] * 0.02;
      if (score > bs) { bs = score; best = { ang, cellRC, tr }; }
    }
    return best;
  }
  // El bot también usa los farolillos (dispara el fuego cuando lo tiene lleno)
  function* botRunG(spec, seed) {
    const S = buildState(spec, seed);
    S.cur = nextColor(S);
    let need = spec.goals[0].count, shots = 0;
    while (need > 0 && shots < 64) { // más de 64 ya no vale: el nivel se descarta
      yield;
      const b = botBest(S, BH);
      shots++;
      if (!b) { S.cur = nextColor(S); continue; }
      const full = [0, 1, 2, 3].filter((i) => S.lan[i] >= 1);
      let res;
      if (full.length) {
        full.forEach((i) => { S.lan[i] = 0; });
        res = land(S, { color: 'power', powers: ['fire'] }, b.cellRC, nullK, b.tr.foam, b.tr.hit);
      } else res = land(S, { color: S.cur }, b.cellRC, nullK, b.tr.foam, b.tr.hit);
      need -= res.pandas;
      endShot(S, nullK);
      S.cur = nextColor(S);
    }
    return shots;
  }

  const cache = new Map();
  // generador por pasos: el motor lo avanza poco a poco en segundo plano (ver E.prefetch)
  function* levelG(n) {
    if (cache.has(n)) return cache.get(n);
    let spec = null;
    // si el bot se atasca, se prueba otra variante más suave y nos quedamos con la mejor
    for (let attempt = 0; attempt < 5; attempt++) {
      const sp = yield* genLevelG(n, attempt);
      if (!spec || sp.botMoves < spec.botMoves) spec = sp;
      if (spec.botMoves <= 34) break;
    }
    // en el original hay ~21 burbujas por nivel: margen justo para que suponga un reto
    const factor = 1 - spec.d * 0.1; // el bot de calibración solo usa el fuego, juega peor que una persona
    spec.moves = E.clamp(Math.ceil(spec.botMoves * factor) + (n < 5 ? 5 : 1), 12, 55);
    cache.set(n, spec);
    return spec;
  }
  GAME.makeLevel = (n) => (cache.has(n) ? cache.get(n) : E.runGen(levelG(n)));
  GAME.levelSteps = (n) => (cache.has(n) ? null : levelG(n));
  function* genLevelG(n, attempt) {
    const rng = E.rng(n * 1597334677 + 9 + attempt * 3571);
    const d = E.difficulty(n) * Math.pow(0.8, attempt);
    // tableros altos como en Panda Pop (mediana 24 filas): crecen con el nivel
    const rows = n < 4 ? 9 : Math.round(11 + d * 12 + rng() * 3);
    const colors = n < 4 ? 4 : n < 30 ? 4 : d > 0.55 && rng() < 0.45 ? 6 : 5;
    const cells = [];
    const pat = n < 5 ? 0 : rng.int(5);
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < colsIn(r); c++) {
        let on = true;
        const m = Math.min(c, colsIn(r) - 1 - c);
        if (pat === 1) on = !(r > 2 && m === 3 && r % 3 === 0);
        else if (pat === 2) on = r < 3 || m >= 1;
        else if (pat === 3) on = r < rows - 3 || m >= 3;
        else if (pat === 4) on = !(r > 3 && r % 4 === 2 && m % 3 === 1);
        if (!on) { row.push(null); continue; }
        let col = rng.int(colors);
        const left = row[c - 1];
        const up = r > 0 ? cells[r - 1][Math.min(c, colsIn(r - 1) - 1)] : null;
        const k = rng();
        if (left && k < 0.42) col = left.color;
        else if (up && k < 0.68) col = up.color;
        row.push({ color: col });
      }
      cells.push(row);
    }
    // crías: en el original ~15 por nivel, repartidas por el tablero
    const want = n < 3 ? 4 : n < 8 ? 7 : Math.round(9 + d * 9 + rng() * 3);
    const spots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < colsIn(r); c++) if (cells[r][c]) spots.push([r, c]);
    rng.shuffle(spots);
    // más crías arriba (hay que abrirse camino hasta ellas)
    spots.sort((a, b) => a[0] - b[0] + (rng() - 0.5) * rows * 0.8);
    let placed = 0;
    for (const [r, c] of spots) {
      if (placed >= want) break;
      if (neighbors(r, c).some(([rr, cc]) => cells[rr] && cells[rr][cc] && cells[rr][cc].panda)) continue;
      cells[r][c].panda = true; placed++;
    }
    // obstáculos de Panda Pop (cristal, metal, congeladas y pinchos)
    const free = () => { const out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < colsIn(r); c++) { const b = cells[r][c]; if (b && !b.panda && typeof b.color === 'number' && !b.ice) out.push([r, c]); } return rng.shuffle(out); };
    let obsText = '';
    if (n === 12 || (n > 12 && rng() < 0.4)) { // tiras de cristal
      const strips = 1 + Math.round(d * 2);
      for (let i = 0; i < strips; i++) {
        const r = rng.range(2, rows - 3), c0 = rng.int(Math.max(1, colsIn(r) - 4)), len = 3 + rng.int(4);
        for (let c = c0; c < Math.min(colsIn(r), c0 + len); c++) if (cells[r][c] && !cells[r][c].panda) cells[r][c] = { color: 'glass' };
      }
      if (n === 12) obsText = 'Golpea el cristal con cualquier burbuja para romperlo';
    }
    if (n === 18 || (n > 18 && rng() < 0.35)) { // metal: no se combina, hay que hacerlo caer
      free().slice(0, 2 + Math.round(d * 4)).forEach(([r, c]) => { cells[r][c] = { color: 'metal' }; });
      if (n === 18) obsText = 'Las burbujas de metal no se combinan: revienta las de alrededor para que caigan';
    }
    // Frecuencias medidas en su tramo de Panda Pop (niveles 550–800 de la versión 15.7, numerados con LevelDecouplingTable):
    // hielo 19% (mediana 59 por nivel), cristal 17%, sorpresa 11%, espuma 10%, fijas 9%, pinchos 8%, bambú 7%, runas 6%,
    // sin color 6%, revólver 5%, superburbujas 5%, pinchos dorados 4%, volcanes 3%, intercambio 3%, cohetes 1%
    const intro = (from, prob) => n === from || (n > from && rng() < prob);
    const at = ([r, c]) => cells[r][c];
    const late = n > 120; // a partir de aquí, mezcla como la de su tramo
    const band = (h) => { const r0 = rng.range(1, Math.max(2, rows - h - 2)); return free().filter(([r]) => r >= r0 && r < r0 + h); };
    if (intro(24, late ? 0.22 : 0.3)) { // hielo (multigolpe): toma el color de lo que revienta a su lado
      const want = Math.round(free().length * (0.08 + d * 0.15));
      band(6 + Math.round(d * 4)).concat(free()).slice(0, want).forEach(([r, c]) => { if (typeof cells[r][c].color === 'number' && !cells[r][c].panda) cells[r][c] = { color: 'iceb' }; });
      if (n === 24) obsText = 'Revienta burbujas junto al hielo y tomará su color';
    }
    if (intro(30, late ? 0.08 : 0.25)) { // pinchos en la parte de arriba
      free().filter(([r]) => r < rows * 0.6).slice(0, 2 + Math.round(d * 3)).forEach(([r, c]) => { cells[r][c] = { color: 'spike' }; });
      if (n === 30) obsText = '¡Cuidado con los pinchos! La burbuja que los toca explota';
    }
    // burbujas "+" (36), mandril (42) y mortífera (48): en su tramo casi no salen
    for (const [flag, from, prob, num] of [['plus', 36, late ? 0.03 : 0.3, 2], ['baboon', 42, late ? 0.03 : 0.25, 2], ['death', 48, late ? 0.02 : 0.2, 1 + Math.round(d * 2)]]) {
      if (n === from || (n > from && rng() < prob)) {
        free().slice(0, num).forEach(([r, c]) => { cells[r][c][flag] = true; });
        const tx = { 36: 'Revienta la burbuja "+" para conseguir 2 burbujas más', 42: 'No revientes las burbujas del mandril o te robará 2 burbujas', 48: '¡Cuidado! Si revientas la burbuja mortífera se acaba la ronda' };
        if (n === from) obsText = tx[n];
      }
    }
    if (intro(54, late ? 0.1 : 0.25)) { free().filter(([r]) => r > 2).slice(0, 3 + Math.round(d * 10)).forEach((p) => { at(p).fixed = true; }); if (n === 54) obsText = 'Las burbujas fijas no caen nunca: sujetan a las de su alrededor'; }
    if (intro(60, late ? 0.03 : 0.15)) { free().filter(([r]) => r > 3 && r < rows - 2).slice(0, 2 + Math.round(d * 2)).forEach(([r, c]) => { cells[r][c] = { color: 'cloud' }; }); if (n === 60) obsText = 'Las nubes sujetan burbujas: revienta algo a su lado y caerán las que toca'; }
    if (intro(66, late ? 0.12 : 0.18)) { free().slice(0, 4 + Math.round(d * (late ? 25 : 6))).forEach((p) => { at(p).morph = true; }); if (n === 66) obsText = 'Las burbujas sorpresa ✨ cambian de color con cada disparo'; }
    if (intro(72, late ? 0.03 : 0.15)) {
      const f = free().filter(([r]) => r > 1);
      const lockAt = f.find(([r]) => r > rows * 0.4);
      if (lockAt) { at(lockAt).lock = true; f.filter((p) => p !== lockAt && p[0] < lockAt[0]).slice(0, 4 + Math.round(d * 4)).forEach((p) => { at(p).chain = true; }); }
      if (n === 72) obsText = 'Dale a la cerradura o hazla estallar para romper las cadenas';
    }
    if (intro(78, late ? 0.07 : 0.15)) { free().filter(([r]) => r > 2).slice(0, 3 + Math.round(d * 12)).forEach(([r, c]) => { cells[r][c] = { color: 'rune' }; }); if (n === 78) obsText = 'Haz una combinación junto a una runa para crear una reacción en cadena'; }
    if (intro(84, late ? 0.02 : 0.08)) { free().filter(([r]) => r > rows * 0.4).slice(0, 1 + (d > 0.6 ? 1 : 0)).forEach((p) => { at(p).cd = 3 + rng.int(4); }); if (n === 84) obsText = 'Revienta el barril antes de que llegue a 0: si no, su humo apagará los farolillos'; }
    if (intro(90, late ? 0.08 : 0.12)) {
      const r = rng.range(3, rows - 3);
      for (let c = 0; c < colsIn(r); c++) if (cells[r][c] && !cells[r][c].panda && (c % 3 !== 1)) cells[r][c] = { color: 'bamboo', hp: d > 0.5 ? 3 : 2 };
      if (n === 90) obsText = 'El bambú aguanta varios golpes: revienta burbujas a su lado';
    }
    if (intro(96, late ? 0.06 : 0.1)) { const p = free().find(([r, c]) => r > 2 && r < rows - 2 && c > 0 && c < colsIn(r) - 1); if (p) cells[p[0]][p[1]] = { color: 'rev' }; if (n === 96) obsText = 'El revólver 🌀 gira las burbujas de su alrededor en cada disparo'; }
    if (intro(102, late ? 0.02 : 0.1)) { const p = free().find(([r]) => r > 2 && r < rows * 0.5); if (p) cells[p[0]][p[1]] = { color: 'ivymom' }; if (n === 102) obsText = 'La hiedra venenosa crece en cada disparo si no la rompes'; }
    if (intro(108, late ? 0.03 : 0.1)) { free().filter(([r]) => r > 2).slice(0, 1 + (d > 0.5 ? 1 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'gift' }; }); if (n === 108) obsText = 'Revienta algo junto al regalo y dentro aparecerá una superburbuja'; }
    if (intro(114, late ? 0.02 : 0.1)) { free().filter(([r]) => r > 2 && r < rows - 2).slice(0, 2).forEach(([r, c]) => { cells[r][c] = { color: 'rocketo', dir: rng.pick([0, 3, 4, 5]) }; }); if (n === 114) obsText = 'Dale al cohete y saldrá volando hasta explotar contra las burbujas'; }
    if (intro(120, late ? 0.03 : 0.1)) { // fantasmas: dos grupos que se turnan
      free().slice(0, 4 + Math.round(d * 6)).forEach((p, i) => { at(p).ghost = true; at(p).phase = i % 2; });
      if (n === 120) obsText = 'Las burbujas fantasma 👻 se turnan: las transparentes se pueden atravesar';
    }
    if (intro(126, 0.1)) { // espuma: la burbuja la atraviesa abriéndose camino
      band(3 + Math.round(d * 3)).forEach(([r, c]) => { cells[r][c] = { color: 'foam' }; });
      if (n === 126) obsText = 'Las burbujas atraviesan la espuma y la van quitando a su paso';
    }
    if (intro(132, 0.05)) { // pinchos dorados: se encienden y se apagan en cada disparo
      free().filter(([r]) => r < rows * 0.7).slice(0, 4 + Math.round(d * 10)).forEach(([r, c], i) => { cells[r][c] = { color: 'gspike', on: i % 2 === 0 }; });
      if (n === 132) obsText = 'Los pinchos dorados solo pinchan cuando están encendidos: se turnan en cada disparo';
    }
    if (intro(138, 0.06)) { // superburbujas ya colocadas: se activan al dispararles o al reventar algo a su lado
      free().slice(0, 2 + Math.round(d * 3)).forEach(([r, c]) => { cells[r][c] = { color: rng.pick(['sfire', 'sfire', 'swater', 'svine', 'ssun']) }; });
      if (n === 138) obsText = 'Las superburbujas explotan cuando les das: 🔥 en círculo, 🌊 su fila, 🌿 su columna y ☀️ alrededor';
    }
    if (intro(144, 0.04)) { free().filter(([r]) => r > rows * 0.5).slice(0, 2 + (d > 0.5 ? 2 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'volcano' }; }); if (n === 144) obsText = 'Revienta algo junto al volcán y entrará en erupción hacia arriba'; }
    if (intro(150, 0.04)) { // intercambiadoras: se cambian el color con la de su derecha en cada disparo
      let k = 0;
      for (const [r, c] of free()) { if (k >= 2 + Math.round(d * 2)) break; const o = cells[r][c + 1]; if (c + 1 < colsIn(r) && o && typeof o.color === 'number' && !o.panda && !cells[r][c].swapR) { cells[r][c].swapR = true; k++; } }
      if (n === 150) obsText = 'Las burbujas con flechas 🔁 se intercambian con la de al lado en cada disparo';
    }
    if (intro(156, 0.02)) { free().slice(0, 1 + (d > 0.6 ? 1 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'drain' }; }); if (n === 156) obsText = 'Si revientas una burbuja apagadora 🚫, se apagan los farolillos'; }
    // los que en su tramo salen en ≤1% de los niveles
    const rare = (from, prob, fn, tx) => { if (intro(from, late ? prob : 0.12)) { fn(); if (n === from) obsText = tx; } };
    rare(168, 0.02, () => band(2 + Math.round(d * 2)).forEach((p) => { at(p).leaf = true; }), 'Las hojas tapan las burbujas: revienta algo a su lado para que se caigan');
    rare(174, 0.015, () => band(2 + Math.round(d * 2)).filter((p) => !at(p).panda).forEach((p, i) => { at(p).rope = i % 3 === 0 ? 2 : 1; }), 'Las cuerdas sujetan burbujas: haz estallar una atada para aflojarlas');
    rare(180, 0.01, () => free().filter(([r, c]) => r > 1 && r < rows - 2 && c > 0 && c < colsIn(r) - 1).slice(0, 1 + (d > 0.5 ? 1 : 0)).forEach((p) => { at(p).rot = true; }), 'La burbuja con flechas 🔄 hace girar a las de su alrededor en cada disparo');
    rare(186, 0.02, () => free().filter(([r]) => r > 2).slice(0, 1 + (d > 0.5 ? 1 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'smoke', on: true, big: d > 0.6 }; }), 'El humo 💨 tapa los colores un disparo sí y otro no');
    rare(192, 0.01, () => free().filter(([r]) => r > 3).slice(0, 2).forEach(([r, c]) => { cells[r][c] = { color: 'fan', dir: c < colsIn(r) / 2 ? 1 : -1, on: true, perma: rng() < 0.5 }; }), 'El ventilador sopla de lado la burbuja que le da');
    rare(198, 0.01, () => free().filter(([r]) => r > 3).slice(0, 2 + (d > 0.5 ? 1 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'bumper' }; }), 'Las burbujas parachoques hacen rebotar cualquier burbuja que les lances');
    rare(204, 0.01, () => free().slice(0, 2 + (d > 0.5 ? 2 : 0)).forEach((p) => { at(p).shield = rng.int(6); }), 'El escudo gira: revienta o lanza por su hueco abierto para quitarlo');
    rare(210, 0.01, () => free().filter(([r]) => r > rows * 0.4).slice(0, 1).forEach(([r, c]) => { cells[r][c] = { color: 'fairy' }; }), 'Dale al hada 🧚 y volará a liberar crías');
    rare(216, 0.01, () => free().slice(0, 3 + Math.round(d * 4)).forEach((p) => { at(p).mask = true; }), 'Las burbujas con máscara 🎭 necesitan estallar dos veces');
    rare(222, 0.01, () => free().filter(([r, c]) => cells[r][c].color < 4).slice(0, 2).forEach((p) => { at(p).charger = true; }), 'Revienta la burbuja con la ✕ y su farolillo se llenará del todo');
    rare(228, 0.01, () => free().slice(0, 2 + (d > 0.5 ? 2 : 0)).forEach((p) => { at(p).crystal = true; }), 'Al combinar los cristales, lo de alrededor se vuelve cristal; cambian de color si les da otra burbuja');
    rare(234, 0.01, () => free().filter(([r]) => r > 3 && r < rows - 2).slice(0, 1 + (d > 0.5 ? 1 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'cannon', dir: rng.pick([0, 3, 4, 5]) }; }), 'Dale al cañón y disparará una burbuja en su dirección');
    rare(240, 0.01, () => free().slice(0, 2 + (d > 0.5 ? 2 : 0)).forEach(([r, c]) => { cells[r][c] = { color: 'rock' }; }), 'Dale a la roca 🪨 con una burbuja y se volverá de color');
    if (intro(162, 0.03)) { free().slice(0, 2 + (d > 0.5 ? 1 : 0)).forEach((p) => { at(p).dice = true; }); if (n === 162) obsText = 'El dado cambia de color si le da una burbuja de otro color'; }
    const goals = [{ type: 'panda', count: placed }];
    let text = obsText;
    if (n === 1) text = 'Arrastra el dedo para apuntar y suéltalo para lanzar';
    if (n === 2) text = 'Junta 3 burbujas del mismo color para liberar a las crías';
    if (n === 3) text = 'Acierta 3 veces con un color y su farolillo se enciende. ¡Tócalo!';
    if (n === 4) text = 'Toca la burbuja pequeña para cambiarla';
    const spec = { cells, colors, goals, text, d };
    // tres partidas del bot (con fijas, nubes o bambú la suerte pesa mucho) y nos quedamos con la peor
    spec.botMoves = Math.max(yield* botRunG(spec, n * 7 + 1), yield* botRunG(spec, n * 7 + 2), yield* botRunG(spec, n * 7 + 3));
    return spec;
  }

  // potenciadores de inicio (Panda Pop) y premio de la racha de victorias
  // colección propia del juego (logros y álbum)
  GAME.collection = { type: 'panda', label: 'Crías liberadas', icon: '🐼' };
  GAME.startBoosters = [{ id: 'lantern', icon: '🏮', name: 'Farolillo lleno' }, { id: 'plus3', icon: '➕', name: '+3 burbujas' }, { id: 'rainbow', icon: '🌈', name: 'Burbuja arcoíris' }];
  GAME.streakBonus = [['lantern'], ['lantern', 'plus3'], ['lantern', 'plus3', 'rainbow']];
  GAME.boosters = [
    { id: 'bomb', icon: '💣', target: false },
    { id: 'rainbow', icon: '🌈', target: false },
    { id: 'swapc', icon: '🔄', target: false },
  ];

  // ------------------------------------------------------------ partida
  GAME.newPlay = function (spec) {
    const S = buildState(spec, E.playSeed != null ? E.playSeed : (Math.random() * 1e9) | 0);
    const P = { S, busy: false };
    let area = { x: 10, y: 180, w: BW, h: BH };
    let k = 1, ox = 0, oy = 0;
    let scroll = 0, scrollTarget = 0;
    S.cur = nextColor(S);
    S.next = nextColor(S);
    S.power = null; // farolillos activados para el próximo disparo
    let shot = null;
    let aim = null;
    let hint = null;
    const effects = [];
    const falling = [];
    const parachutes = [];
    const beams = [];
    const lanAnim = [0, 0, 0, 0];

    const sx = (x) => ox + x * k;
    const sy = (y) => oy + (y - scroll) * k;
    const viewH = () => area.h / k;
    const shooterXY = () => [BW / 2, scroll + viewH() - 52];

    P.layout = function (a) {
      area = a;
      k = Math.min(a.w / BW, 1.2);
      ox = a.x + (a.w - BW * k) / 2;
      oy = a.y;
      scrollTarget = scroll = scrollFor(S);
    };

    function curBubble() {
      if (S.power) return { color: S.power.length >= 4 ? 'dragon' : S.power.length > 1 ? 'fire' : S.power[0], powers: S.power.length >= 4 ? ['dragon'] : S.power.slice() };
      return { color: S.curSpecial || S.cur };
    }
    function nextXY() { const [x, y] = shooterXY(); return [x - D * 2.4, y + D * 0.3]; }
    // posiciones de los farolillos en pantalla (como en Panda Pop: fuego y parra a la izquierda, sol y agua a la derecha)
    function lanternXY(i) {
      const [x0, y0] = shooterXY();
      const sxs = { 0: [D * 0.9, y0 - D * 1.15], 2: [D * 0.9, y0 + D * 0.35], 3: [BW - D * 0.9, y0 - D * 1.15], 1: [BW - D * 0.9, y0 + D * 0.35] };
      const [x, y] = sxs[i];
      return [sx(x), sy(y)];
    }
    function toggleLantern(i) {
      if (S.lan[i] < 1) { E.sfx('bad'); E.floatText(lanternXY(i)[0], lanternXY(i)[1] - 40, 'Aún no está lleno', '#fff', 22); return; }
      const full = [0, 1, 2, 3].filter((j) => S.lan[j] >= 1).map((j) => ['fire', 'water', 'vine', 'sun'][j]);
      if (S.power) { S.power = null; E.sfx('click'); return; }
      // si hay varios llenos se combinan todos (con los 4: ¡dragón!)
      S.power = full;
      E.sfx(full.length >= 4 ? 'magic' : 'special');
      if (full.length >= 2) E.floatText(E.W / 2, area.y + area.h * 0.45, full.length >= 4 ? '¡Dragón!' : '¡Combo de farolillos!', '#ffe14d', 42);
    }

    P.down = function (x, y) {
      if (P.busy || P.finaleOn) return;
      hint = null;
      for (let i = 0; i < 4; i++) {
        const [lx, ly] = lanternXY(i);
        if (Math.hypot(x - lx, y - ly) < D * k * 0.85) { toggleLantern(i); return; }
      }
      const [nx, ny] = nextXY();
      if (Math.hypot(x - sx(nx), y - sy(ny)) < D * k * 0.9) {
        const t = S.cur; S.cur = S.next; S.next = t; S.curSpecial = null;
        E.sfx('swap');
        return;
      }
      aim = { x, y };
    };
    P.move = function (x, y) { if (aim) { aim.x = x; aim.y = y; } };
    P.up = function (x, y) {
      if (!aim) return;
      aim.x = x; aim.y = y;
      const ang = aimAngle();
      aim = null;
      if (ang == null) return;
      fire(ang);
    };
    function aimAngle() {
      if (!aim) return null;
      const [x0, y0] = shooterXY();
      const dx = aim.x - sx(x0), dy = aim.y - sy(y0);
      if (dy > -10 * k) return null;
      return E.clamp(Math.atan2(dy, dx), -Math.PI + 0.12, -0.12);
    }
    function fire(ang) {
      const [x0, y0] = shooterXY();
      const b = curBubble();
      const powers = b.powers || [];
      let extra = [];
      let pts, cellRC;
      if (powers.includes('vine')) {
        const v = vinePath(S, x0, y0, ang);
        extra = extra.concat(v.cells);
      }
      const tr = trace(S, x0, y0, ang);
      cellRC = snap(S, tr.x, tr.y);
      if (!cellRC) return;
      pts = tr.pts.slice();
      const [ex, ey] = bxy(cellRC[0], cellRC[1]);
      pts.push([ex, ey]);
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      shot = { b, pts, len, d: 0, cellRC, extra: extra.concat(tr.foam || []), vine: powers.includes('vine'), hit: tr.hit };
      P.moves--;
      if (S.power) { S.power.forEach((p) => { S.lan[['fire', 'water', 'vine', 'sun'].indexOf(p)] = 0; }); S.power = null; }
      else { S.cur = S.next; S.next = nextColor(S); S.curSpecial = null; }
      E.sfx(powers.length ? 'rocket' : 'shoot');
    }
    const K = {
      placed(b) { b.sc = 1.15; E.tween(b, { sc: 1 }, 0.2); },
      spiked(r, c) { const [x, y] = bxy(r, c); E.burst(sx(x), sy(y), ['#c0392b', '#fff', '#7b1d14'], 12, { size: 9 }); E.sfx('bad'); E.floatText(sx(x), sy(y) - 30, '¡Pinchos!', '#fff', 26); },
      thaw(b, r, c) { const [x, y] = bxy(r, c); E.after(0.1, () => { E.burst(sx(x), sy(y), ['#ffffff', '#cfefff'], 8, { size: 8 }); E.sfx('pop', 2); }); },
      pop(b, r, c, delay) {
        const [x, y] = bxy(r, c);
        effects.push({ b, x, y, t: -delay, kind: 'pop' });
        E.after(delay, () => {
          E.burst(sx(x), sy(y), [COLORS[b.color] || '#fff', '#fff'], 6, { size: 9 });
          E.sfx('pop', 1 + Math.random() * 0.3);
          if (b.panda) freePanda(x, y);
        });
      },
      drop(b, r, c) {
        const [x, y] = bxy(r, c);
        falling.push({ b, x, y, vy: -150 - Math.random() * 150, vx: (Math.random() - 0.5) * 120, t: 0 });
        if (b.panda) freePanda(x, y);
      },
      boom(r, c, rad) { const [x, y] = bxy(r, c); effects.push({ x, y, t: 0, kind: 'boom', rad }); E.sfx('bomb'); E.shake(0.3); },
      wave(r) { const [, y] = bxy(r, 0); effects.push({ x: BW / 2, y, t: 0, kind: 'wave' }); },
      beam(pts) { beams.push({ pts, t: 0 }); },
      dragon() { effects.push({ x: BW / 2, y: 0, t: 0, kind: 'dragon' }); E.sfx('magic'); E.shake(0.6); },
      cannon(r, c, pts) { beams.push({ pts, t: 0 }); E.sfx('rocket'); },
      drain(r, c) { const [x, y] = bxy(r, c); E.burst(sx(x), sy(y), ['#333', '#666', '#999'], 16, { size: 12 }); E.floatText(sx(x), sy(y) - 30, '¡Farolillos apagados!', '#fff', 26); E.sfx('bad'); },
      spin(r, c) { const [x, y] = bxy(r, c); E.burst(sx(x), sy(y), ['#ffb3d9', '#fff'], 8, { size: 8 }); E.sfx('swap'); },
    };
    // la cría baja en paracaídas y vuela al contador
    function freePanda(x, y) {
      parachutes.push({ x, y, t: 0, sway: Math.random() * 6 });
      E.sfx('rescue');
      E.after(0.9, () => {
        const p = parachutes.shift();
        const px = p ? sx(p.x + Math.sin(p.t * 3 + p.sway) * 10) : sx(x);
        const py = p ? sy(p.y) : sy(y);
        E.goal('panda', undefined, 1, px, py);
      });
    }

    P.booster = function (id) {
      if (shot) return;
      if (id === 'bomb') { S.curSpecial = 'bomb'; S.power = null; E.sfx('special'); }
      else if (id === 'rainbow') { S.curSpecial = 'rainbow'; S.power = null; E.sfx('magic'); }
      else if (id === 'swapc') {
        const cols = presentColors(S);
        if (cols.length) { const i = cols.indexOf(S.cur); S.cur = cols[(i + 1) % cols.length]; }
        S.curSpecial = null; S.power = null;
        E.sfx('swap');
      }
    };
    // "¿Qué es esto?": explicación de la burbuja tocada
    P.describe = function (x, y) {
      const bx2 = (x - ox) / k, by2 = (y - oy) / k + scroll;
      let best = null, bd = D * 0.6;
      for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) { const b = S.grid[r][c]; if (!b) continue; const [cx, cy] = bxy(r, c); const dd = Math.hypot(cx - bx2, cy - by2); if (dd < bd) { bd = dd; best = b; } }
      const b = best;
      if (!b) return null;
      if (b.panda) return 'Cría de panda: revienta o tira su burbuja para rescatarla';
      if (b.chain) return 'Cadena: dale a la cerradura o hazla estallar para romperla';
      if (b.lock) return 'Cerradura: dale o hazla estallar y se romperán las cadenas';
      if (b.fixed) return 'Burbuja fija: no cae nunca y sujeta a las de su alrededor';
      if (b.morph) return 'Burbuja sorpresa: cambia de color con cada disparo';
      if (b.cd != null) return 'Barril: revientalo antes de que llegue a 0 o apagará los farolillos';
      if (b.plus) return 'Burbuja +: revientala y tendrás 2 burbujas más';
      if (b.baboon) return 'Mandril: si la revientas, te roba 2 burbujas';
      if (b.death) return 'Burbuja mortífera: si la revientas se acaba la ronda';
      if (b.ghost) return 'Fantasma: se turnan; los transparentes se atraviesan';
      if (b.leaf) return 'Hojas: revienta algo a su lado para que se caigan';
      if (b.rope) return 'Cuerda: haz estallar una burbuja atada para aflojarla';
      if (b.mask) return 'Máscara: la burbuja tiene que estallar dos veces';
      if (b.shield != null) return 'Escudo: revienta o lanza por su hueco para quitarlo';
      if (b.crystal) return 'Cristal: cambia de color si le da otra burbuja';
      if (b.charger) return 'Revientala y su farolillo se llenará del todo';
      if (b.dice) return 'Dado: cambia de color si le da una burbuja de otro color';
      if (b.swapR) return 'Se intercambia con la de al lado en cada disparo';
      if (b.rot) return 'Rotador: gira las burbujas de su alrededor en cada disparo';
      const K2 = { glass: 'Cristal: se rompe con cualquier burbuja', metal: 'Metal: no se combina; revienta las de alrededor para que caiga', spike: 'Pinchos: la burbuja que los toca explota',
        iceb: 'Hielo: revienta burbujas a su lado y tomará su color', cloud: 'Nube: sujeta burbujas; revienta algo a su lado y caerán', rune: 'Runa: combina a su lado y estallará en cadena',
        bamboo: 'Bambú: aguanta varios golpes', rev: 'Revólver: gira las burbujas de su alrededor', ivy: 'Hiedra venenosa: crece si no la rompes', ivymom: 'Madre de la hiedra: de ella crece la hiedra',
        gift: 'Regalo: revienta algo a su lado y saldrá una superburbuja', rocketo: 'Cohete: dale y saldrá volando hasta explotar', volcano: 'Volcán: revienta algo a su lado y entrará en erupción',
        drain: 'Apagadora: si la revientas, se apagan los farolillos', foam: 'Espuma: las burbujas la atraviesan y la van quitando', gspike: 'Pinchos dorados: solo pinchan cuando están encendidos',
        sfire: 'Superburbuja de fuego: explota en círculo', swater: 'Superburbuja de agua: limpia su fila', svine: 'Superburbuja de parra: limpia su columna', ssun: 'Superburbuja de sol: revienta las de alrededor',
        smoke: 'Humo: tapa los colores un disparo sí y otro no', fan: 'Ventilador: sopla de lado la burbuja que le da', bumper: 'Parachoques: hace rebotar las burbujas',
        fairy: 'Hada: dale y liberará crías', rock: 'Roca: dale y se volverá de color', cannon: 'Cañón: dale y disparará una burbuja' };
      if (K2[b.color]) return K2[b.color];
      return typeof b.color === 'number' ? 'Junta 3 o más del mismo color para reventarlas' : null;
    };
    // potenciadores de inicio: un farolillo lleno y la primera burbuja arcoíris (+3 burbujas lo pone el motor)
    P.startBonus = function (list, rnd) {
      for (const id of list) {
        if (id === 'lantern') { const empty = [0, 1, 2, 3].filter((i) => S.lan[i] < 1); if (empty.length) S.lan[empty[rnd.int(empty.length)]] = 1; }
        if (id === 'rainbow') S.curSpecial = 'rainbow';
      }
    };
    P.hint = function () {
      if (S.power) return;
      const T = Object.assign({}, S, { cur: S.curSpecial || S.cur, grid: S.grid.map((r) => r.slice()), lan: S.lan.slice(), rand: E.rng(99) });
      const b = botBest(T, viewH());
      if (b) hint = { ang: b.ang, t: 0 };
    };

    P.update = function (dt) {
      let busy = false;
      if (shot) {
        busy = true;
        shot.d += dt * 1500;
        if (shot.d >= shot.len) {
          const res = land(S, shot.b, shot.cellRC, K, shot.extra, shot.hit);
          if (res.extraShots) { P.moves = Math.max(0, P.moves + res.extraShots); E.floatText(E.W / 2, area.y + area.h * 0.6, (res.extraShots > 0 ? '+' : '') + res.extraShots + ' burbujas', res.extraShots > 0 ? '#7CFC00' : '#ff5050', 40); }
          if (res.death) { P.dead = true; P.deadMsg = '¡Has reventado la burbuja mortífera!'; }
          if (!res.popped && typeof shot.b.color === 'number') E.sfx('land', 1.4);
          if (res.dropped >= 4) E.floatText(E.W / 2, area.y + area.h * 0.5, res.dropped >= 10 ? '¡Increíble!' : '¡Muy bien!', '#fff', 46);
          shot = null;
          endShot(S, K);
          const cols = presentColors(S);
          if (cols.length && !cols.includes(S.cur)) S.cur = S.rand.pick(cols);
          if (cols.length && !cols.includes(S.next)) S.next = S.rand.pick(cols);
        }
      }
      for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].t += dt;
        const lim = effects[i].kind === 'dragon' ? 1.2 : 0.4;
        if (effects[i].t > lim) effects.splice(i, 1); else busy = true;
      }
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        f.t += dt; f.vy += 1400 * dt; f.y += f.vy * dt; f.x += f.vx * dt;
        if (f.t > 1.2) falling.splice(i, 1); else busy = true;
      }
      for (const p of parachutes) { p.t += dt; p.y += 90 * dt; }
      for (let i = beams.length - 1; i >= 0; i--) { beams[i].t += dt; if (beams[i].t > 0.5) beams.splice(i, 1); }
      for (let i = 0; i < 4; i++) lanAnim[i] += (S.lan[i] - lanAnim[i]) * Math.min(1, dt * 5);
      scrollTarget = scrollFor(S);
      if (Math.abs(scroll - scrollTarget) > 0.5) { scroll += (scrollTarget - scroll) * Math.min(1, dt * 3); busy = true; }
      else scroll = scrollTarget;
      if (hint) hint.t += dt;
      P.busy = busy || parachutes.length > 0 || !!P.finaleOn;
    };

    function pathPoint(pts, dist) {
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (dist <= l) { const t = l ? dist / l : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; }
        dist -= l;
      }
      return pts[pts.length - 1];
    }
    function drawAim(g, ang, alpha) {
      const [x0, y0] = shooterXY();
      const tr = trace(S, x0, y0, ang);
      let len = 0; for (let i = 1; i < tr.pts.length; i++) len += Math.hypot(tr.pts[i][0] - tr.pts[i - 1][0], tr.pts[i][1] - tr.pts[i - 1][1]);
      g.save();
      g.globalAlpha = alpha;
      const col = typeof curBubble().color === 'number' ? COLORS[curBubble().color] : '#ffd23f';
      for (let dd = D * 0.9 + ((E.t * 120) % 22); dd < len; dd += 22) {
        const [x, y] = pathPoint(tr.pts, dd);
        g.beginPath(); g.arc(sx(x), sy(y), 5 * k, 0, 7);
        g.fillStyle = '#fff'; g.fill();
        g.lineWidth = 2; g.strokeStyle = col; g.stroke();
      }
      const cellRC = snap(Object.assign({}, S, { grid: S.grid.map((r) => r.slice()) }), tr.x, tr.y);
      if (cellRC) {
        const [cx, cy] = bxy(cellRC[0], cellRC[1]);
        g.beginPath(); g.arc(sx(cx), sy(cy), D * k * 0.45, 0, 7);
        g.lineWidth = 3; g.setLineDash([6, 6]); g.strokeStyle = '#fff'; g.stroke(); g.setLineDash([]);
      }
      g.restore();
    }
    function drawLantern(g, i) {
      const L = LANTERNS[i];
      const [x, y] = lanternXY(i);
      const w = D * k * 1.15, h = D * k * 1.35;
      const full = S.lan[i] >= 1;
      const active = S.power && S.power.includes(['fire', 'water', 'vine', 'sun'][i]);
      g.save();
      if (full) {
        const p = 1 + Math.sin(E.t * 6) * 0.06;
        g.translate(x, y); g.scale(p, p); g.translate(-x, -y);
        g.beginPath(); g.arc(x, y, w * 0.85, 0, 7);
        g.fillStyle = 'rgba(255,240,150,0.45)'; g.fill();
      }
      // cuerda
      g.strokeStyle = '#6b4a2b'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y - h / 2 - 10); g.lineTo(x, y - h / 2); g.stroke();
      // cuerpo
      E.rr(g, x - w / 2, y - h / 2, w, h, w * 0.4);
      g.fillStyle = 'rgba(40,30,60,0.55)'; g.fill();
      g.save();
      E.rr(g, x - w / 2, y - h / 2, w, h, w * 0.4); g.clip();
      const lvl = lanAnim[i];
      g.fillStyle = COLORS[L.color];
      g.fillRect(x - w / 2, y + h / 2 - h * lvl, w, h * lvl);
      g.restore();
      E.rr(g, x - w / 2, y - h / 2, w, h, w * 0.4);
      g.lineWidth = active ? 6 : 3; g.strokeStyle = active ? '#fff' : E.shade(COLORS[L.color], -0.3); g.stroke();
      g.fillStyle = '#6b4a2b';
      g.fillRect(x - w * 0.3, y - h / 2 - 4, w * 0.6, 6); g.fillRect(x - w * 0.3, y + h / 2 - 2, w * 0.6, 6);
      E.emoji(g, L.icon, x, y, w * 0.6);
      g.restore();
      if (full && !active) E.text(g, '¡Toca!', x, y - h / 2 - 20, 18, '#fff', { stroke: E.shade(COLORS[L.color], -0.4), sw: 5 });
    }

    P.draw = function (g) {
      const size = D * k;
      g.save();
      E.rr(g, area.x - 2, area.y - 6, area.w + 4, area.h + 8, 18);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
      g.beginPath(); g.rect(area.x - 2, area.y - 6, area.w + 4, area.h + 8); g.clip();
      if (scroll < 2) { g.fillStyle = 'rgba(90,70,200,0.5)'; g.fillRect(area.x, sy(0) - 6, area.w, 6); }
      for (let r = 0; r < S.grid.length; r++) {
        const yy = sy(bxy(r, 0)[1]);
        if (yy < area.y - size || yy > area.y + area.h + size) continue;
        for (let c = 0; c < colsIn(r); c++) {
          const b = S.grid[r][c];
          if (!b) continue;
          const [x, y] = bxy(r, c);
          drawBubble(g, b, sx(x), sy(y), size);
        }
      }
      // humo encendido: nube oscura que tapa los colores de alrededor
      for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) {
        const b = S.grid[r][c];
        if (!b || b.color !== 'smoke' || !b.on) continue;
        for (const [rr, cc] of circleCells(S, r, c, b.big ? 2.05 : 1.05)) { const [x, y] = bxy(rr, cc); g.fillStyle = 'rgba(60,60,70,0.88)'; g.beginPath(); g.arc(sx(x), sy(y), size * 0.56, 0, 7); g.fill(); }
      }
      for (const e of effects) {
        if (e.t < 0) { if (e.b) drawBubble(g, e.b, sx(e.x), sy(e.y), size); continue; }
        const kk = Math.min(1, e.t / 0.35);
        if (e.kind === 'pop') { const o = e.b.sc; e.b.sc = 1 + kk * 0.4; e.b.alpha = 1 - kk; drawBubble(g, e.b, sx(e.x), sy(e.y), size); e.b.sc = o; e.b.alpha = 1; }
        else if (e.kind === 'boom') { g.beginPath(); g.arc(sx(e.x), sy(e.y), size * (0.5 + kk * (e.rad || 2)), 0, 7); g.fillStyle = 'rgba(255,140,60,' + (0.7 - kk * 0.7) + ')'; g.fill(); }
        else if (e.kind === 'wave') { g.fillStyle = 'rgba(80,170,255,' + (0.7 - kk * 0.7) + ')'; g.fillRect(area.x, sy(e.y) - size * 0.6, area.w * kk, size * 1.2); }
        else if (e.kind === 'dragon') {
          const kd = e.t / 1.2;
          const s = size * 4;
          E.emoji(g, '🐉', area.x - s + (area.w + 2 * s) * kd, area.y + area.h * 0.55 - Math.sin(kd * Math.PI) * area.h * 0.3, s);
        }
      }
      for (const bm of beams) {
        g.save(); g.globalAlpha = 1 - bm.t / 0.5; g.strokeStyle = '#fff6a0'; g.lineWidth = 10 * k; g.shadowColor = '#ffd23f'; g.shadowBlur = 16;
        g.beginPath(); bm.pts.forEach(([x, y], i) => (i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); g.stroke(); g.restore();
      }
      for (const f of falling) { f.b.alpha = Math.max(0, 1 - f.t / 1.2); drawBubble(g, f.b, sx(f.x), sy(f.y), size); f.b.alpha = 1; }
      for (const p of parachutes) {
        const x = sx(p.x + Math.sin(p.t * 3 + p.sway) * 10), y = sy(p.y);
        E.emoji(g, '🪂', x, y - size * 0.7, size * 0.9);
        E.emoji(g, '🐼', x, y, size * 0.8);
      }
      if (aim && !shot) { const ang = aimAngle(); if (ang != null) drawAim(g, ang, 0.95); }
      else if (hint && !shot && hint.t < 3) drawAim(g, hint.ang, 0.5 + Math.sin(hint.t * 6) * 0.3);
      // lanzador: mamá panda con la burbuja
      const [x0, y0] = shooterXY();
      E.emoji(g, '🐼', sx(x0), sy(y0) + size * 0.95, size * 1.6);
      g.beginPath(); g.arc(sx(x0), sy(y0), size * 0.72, 0, 7);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = S.power ? '#ffd23f' : '#5a4bd1'; g.stroke();
      if (!shot) drawBubble(g, curBubble(), sx(x0), sy(y0), size * 1.05);
      // cesta con la siguiente y número de burbujas
      const [nx, ny] = nextXY();
      E.rr(g, sx(nx) - size * 0.8, sy(ny) - size * 0.55, size * 1.6, size * 1.1, 12);
      g.fillStyle = 'rgba(150,100,50,0.85)'; g.fill();
      drawBubble(g, { color: S.next }, sx(nx) - size * 0.3, sy(ny), size * 0.75);
      E.text(g, String(Math.max(0, P.moves)), sx(nx) + size * 0.42, sy(ny) + 2, size * 0.5, '#fff');
      E.emoji(g, '🔄', sx(nx) - size * 0.3, sy(ny) - size * 0.62, size * 0.38);
      for (let i = 0; i < 4; i++) drawLantern(g, i);
      if (shot) {
        const [x, y] = pathPoint(shot.pts, shot.d);
        drawBubble(g, shot.b, sx(x), sy(y), size * (shot.b.powers && shot.b.powers.length ? 1.2 : 1));
        if (shot.vine) { g.strokeStyle = '#3fc84a'; g.lineWidth = 8 * k; g.beginPath(); for (let dd = 0; dd < shot.d; dd += 10) { const [vx, vy] = pathPoint(shot.pts, dd); dd ? g.lineTo(sx(vx), sy(vy)) : g.moveTo(sx(vx), sy(vy)); } g.stroke(); }
      }
      g.restore();
    };

    P.lanternXY = (i) => lanternXY(i);
    P.autoShot = function () { P.hint(); if (hint) { fire(hint.ang); hint = null; } };
    P.finale = function (done) {
      P.finaleOn = true;
      E.floatText(E.W / 2, area.y + area.h * 0.4, '¡Crías a salvo!', '#ffe14d', 46);
      for (let r = 0; r < S.grid.length; r++) for (let c = 0; c < colsIn(r); c++) {
        const b = S.grid[r][c];
        if (b) { S.grid[r][c] = null; K.drop(b, r, c); }
      }
      E.after(1.4, () => { P.finaleOn = false; done(); });
    };
    return P;
  };
})();
