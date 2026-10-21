'use strict';
// Dulces: intercambiar caramelos para hacer líneas de 3 o más (estilo "crush").

const GAME = {
  id: 'dulces',
  title: 'Dulces',
  theme: {
    mascot: '🧁',
    accent: '#e8459a',
    node: '#8a5cd6',
    bg: ['#f7a8d0', '#9b6fd6'],
    zones: [['#ffc6e0', '#f08cbc'], ['#c6e8ff', '#7cbcf0'], ['#d8ffc6', '#94d77a'], ['#fff1b8', '#f2c75a'], ['#e3ccff', '#b088ec']],
    worlds: ['Valle de las Golosinas', 'Bosque de Chocolate', 'Lago de Caramelo', 'Montaña de Nata', 'Pueblo de Galletas', 'Río de Gelatina', 'Castillo de Azúcar', 'Jardín de Piruletas', 'Feria del Algodón', 'Palacio de las Tartas'],
    decor: ['🍭', '🍬', '🧁', '🍩', '🍫', '🍪', '🎂', '🍰', '🌈'],
    panel: { border: '#c2387e', top: '#fff0f7', bottom: '#ffd3e8' },
    hudBorder: '#c2387e',
    hudTop: '#fff3fa',
    hudBottom: '#ffd7ea',
    hudText: '#8a2a5c',
    bar: 'rgba(120,40,110,0.9)',
    bgDeco(g, w, h) {
      g.fillStyle = 'rgba(255,255,255,0.1)';
      for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 137) % w, (i * 251) % h, 10 + (i % 5) * 8, 0, 7); g.fill(); }
    },
  },
};

(function () {
  const COLORS = ['#ef2b3a', '#ff8c1a', '#ffd21f', '#3fc236', '#2e8ff0', '#a046e0'];
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let uid = 1;

  // ------------------------------------------------------------ dibujo
  function candyPath(g, color, w, h) {
    const cx = w / 2, cy = h / 2;
    g.beginPath();
    switch (color) {
      case 0: g.ellipse(cx, cy, w * 0.42, h * 0.3, -0.35, 0, 7); break; // gominola
      case 1: { // pastilla redonda
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; g.lineTo(cx + Math.cos(a) * w * 0.4, cy + Math.sin(a) * h * 0.4); }
        g.closePath(); break;
      }
      case 2: { // gota
        g.moveTo(cx, cy - h * 0.42);
        g.bezierCurveTo(cx + w * 0.18, cy - h * 0.2, cx + w * 0.4, cy + h * 0.05, cx + w * 0.3, cy + h * 0.25);
        g.bezierCurveTo(cx + w * 0.18, cy + h * 0.45, cx - w * 0.18, cy + h * 0.45, cx - w * 0.3, cy + h * 0.25);
        g.bezierCurveTo(cx - w * 0.4, cy + h * 0.05, cx - w * 0.18, cy - h * 0.2, cx, cy - h * 0.42);
        break;
      }
      case 3: E.rr(g, w * 0.13, h * 0.13, w * 0.74, h * 0.74, w * 0.16); break; // cuadrado
      case 4: g.arc(cx, cy, w * 0.39, 0, 7); break; // bola
      default: { // hexágono
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * w * 0.41, cy + Math.sin(a) * h * 0.41); }
        g.closePath();
      }
    }
  }
  function candySprite(color, sp, ts) {
    return E.sprite('candy' + color + (sp || ''), ts, ts, (g, w, h) => {
      const base = COLORS[color];
      if (sp === 'w') {
        // envoltorio
        g.fillStyle = E.shade(base, 0.2);
        g.beginPath(); g.moveTo(w * 0.02, h * 0.2); g.lineTo(w * 0.3, h * 0.5); g.lineTo(w * 0.02, h * 0.8); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(w * 0.98, h * 0.2); g.lineTo(w * 0.7, h * 0.5); g.lineTo(w * 0.98, h * 0.8); g.closePath(); g.fill();
        E.rr(g, w * 0.17, h * 0.17, w * 0.66, h * 0.66, w * 0.18);
        const gr = g.createLinearGradient(0, h * 0.17, 0, h * 0.83);
        gr.addColorStop(0, E.shade(base, 0.5)); gr.addColorStop(1, E.shade(base, -0.2));
        g.fillStyle = gr; g.fill();
        g.lineWidth = w * 0.04; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        E.rr(g, w * 0.24, h * 0.22, w * 0.36, h * 0.12, h * 0.06); g.fill();
        return;
      }
      if (sp === 'f') {
        // pez de gominola (sale de un cuadrado de 2x2)
        const gr = g.createLinearGradient(0, h * 0.25, 0, h * 0.75);
        gr.addColorStop(0, E.shade(base, 0.5)); gr.addColorStop(1, E.shade(base, -0.25));
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(w * 0.44, h / 2, w * 0.3, h * 0.24, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(w * 0.68, h / 2); g.lineTo(w * 0.94, h * 0.28); g.lineTo(w * 0.94, h * 0.72); g.closePath(); g.fill();
        g.lineWidth = w * 0.03; g.strokeStyle = E.shade(base, -0.45);
        g.beginPath(); g.ellipse(w * 0.44, h / 2, w * 0.3, h * 0.24, 0, 0, 7); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.3, h * 0.45, w * 0.07, 0, 7); g.fill();
        g.fillStyle = '#222'; g.beginPath(); g.arc(w * 0.31, h * 0.46, w * 0.035, 0, 7); g.fill();
        return;
      }
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = w * 0.06; g.shadowOffsetY = w * 0.03;
      candyPath(g, color, w, h);
      const gr = g.createRadialGradient(w * 0.38, h * 0.32, w * 0.05, w / 2, h / 2, w * 0.5);
      gr.addColorStop(0, E.shade(base, 0.55)); gr.addColorStop(0.5, base); gr.addColorStop(1, E.shade(base, -0.35));
      g.fillStyle = gr; g.fill();
      g.restore();
      candyPath(g, color, w, h);
      g.lineWidth = w * 0.025; g.strokeStyle = E.shade(base, -0.45); g.stroke();
      if (sp === 'h' || sp === 'v') {
        g.save(); candyPath(g, color, w, h); g.clip();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = -3; i <= 3; i++) {
          if (sp === 'h') g.fillRect(0, h / 2 + i * h * 0.14 - h * 0.035, w, h * 0.07);
          else g.fillRect(w / 2 + i * w * 0.14 - w * 0.035, 0, w * 0.07, h);
        }
        g.restore();
      }
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.ellipse(w * 0.38, h * 0.3, w * 0.11, h * 0.06, -0.5, 0, 7); g.fill();
    });
  }
  function bombSprite(ts) {
    return E.sprite('cbomb', ts, ts, (g, w, h) => {
      const gr = g.createRadialGradient(w * 0.38, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.45);
      gr.addColorStop(0, '#a0643c'); gr.addColorStop(1, '#3d2210');
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 7); g.fillStyle = gr; g.fill();
      const r = E.rng(5);
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * w * 0.33;
        g.fillStyle = COLORS[i % 6];
        g.save(); g.translate(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d); g.rotate(r() * 3);
        g.fillRect(-w * 0.04, -w * 0.015, w * 0.08, w * 0.03); g.restore();
      }
    });
  }
  function iceSprite(hp, ts) {
    return E.sprite('ice' + hp, ts, ts, (g, w, h) => {
      const base = hp >= 4 ? '#7fb4e6' : hp >= 3 ? '#9cc9ef' : hp === 2 ? '#c4e2f7' : '#eaf6ff';
      E.rr(g, w * 0.03, h * 0.03, w * 0.94, h * 0.94, w * 0.14);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, base);
      g.fillStyle = gr; g.fill();
      g.lineWidth = w * 0.04; g.strokeStyle = E.shade(base, -0.25); g.stroke();
      // una franja por capa (hasta 5 capas, como el glaseado de Candy Crush)
      const step = 0.62 / Math.max(3, hp);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < hp; i++) { E.rr(g, w * 0.15, h * (0.18 + i * step), w * 0.7, h * step * 0.45, h * 0.04); g.fill(); }
      g.fillStyle = 'rgba(80,140,200,0.35)';
      for (let i = 0; i < hp; i++) { E.rr(g, w * 0.15, h * (0.18 + i * step + step * 0.45), w * 0.7, h * step * 0.18, h * 0.02); g.fill(); }
    });
  }
  function chocSprite(ts, hp) {
    return E.sprite('choc' + (hp >= 2 ? 2 : 1), ts, ts, (g, w, h) => {
      E.rr(g, w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.12);
      // chocolate negro (2 capas) más oscuro
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hp >= 2 ? '#4d2c18' : '#8a5530'); gr.addColorStop(1, hp >= 2 ? '#1f0f06' : '#4a2a14');
      g.fillStyle = gr; g.fill();
      g.strokeStyle = '#3a200e'; g.lineWidth = w * 0.04;
      g.beginPath(); g.moveTo(w / 2, h * 0.08); g.lineTo(w / 2, h * 0.92); g.moveTo(w * 0.08, h / 2); g.lineTo(w * 0.92, h / 2); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.18)';
      [[0.1, 0.1], [0.54, 0.1], [0.1, 0.54], [0.54, 0.54]].forEach(([x, y]) => { E.rr(g, w * x, h * y, w * 0.34, h * 0.08, h * 0.04); g.fill(); });
    });
  }
  function licSprite(ts) {
    return E.sprite('lic', ts, ts, (g, w, h) => {
      g.strokeStyle = '#1d1d24'; g.lineWidth = w * 0.13; g.lineCap = 'round';
      g.beginPath();
      for (let a = 0; a < Math.PI * 5.2; a += 0.2) { const r = w * 0.04 + a * w * 0.022; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = w * 0.03; g.stroke();
    });
  }
  function jellySprite(level, ts) {
    return E.sprite('jelly' + level, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.03, h * 0.03, w * 0.94, h * 0.94, w * 0.12);
      g.fillStyle = level >= 2 ? 'rgba(200,60,200,0.75)' : 'rgba(255,130,230,0.55)';
      g.fill();
      g.lineWidth = w * 0.04; g.strokeStyle = level >= 2 ? '#fff' : 'rgba(255,255,255,0.7)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      E.rr(g, w * 0.12, h * 0.1, w * 0.4, h * 0.12, h * 0.06); g.fill();
    });
  }
  function drawTile(g, t, x, y, ts) {
    let spr, k = 1;
    if (t.kind === 'candy') spr = candySprite(t.color, t.sp, ts);
    else if (t.kind === 'bomb') spr = bombSprite(ts);
    else if (t.kind === 'ice') spr = t.choc ? chocSprite(ts, t.vhp != null ? t.vhp : t.hp) : t.waffle ? waffleSprite(t.vhp != null ? t.vhp : t.hp, ts) : iceSprite(t.vhp != null ? t.vhp : t.hp, ts);
    else if (t.kind === 'lic') spr = licSprite(ts);
    else if (t.kind === 'mixer' || t.kind === 'popcorn' || t.kind === 'skull') spr = blockerSprite(t.kind, t.vhp != null ? t.vhp : t.hp, ts);
    else if (t.kind === 'ing') { spr = E.emojiSprite(t.ing === 1 ? '🌰' : '🍒', ts); k = 0.95; }
    else if (t.kind === 'slock') spr = sugarLockSprite(t.vhp != null ? t.vhp : t.hp, ts);
    const s = ts * (t.sc == null ? 1 : t.sc) * k;
    if (!(s >= 2)) return;
    g.save();
    if (t.alpha != null && t.alpha < 1) g.globalAlpha = Math.max(0, t.alpha);
    g.translate(x, y);
    if (t.rot) g.rotate(t.rot);
    if (t.sel) { const p = 1 + Math.sin(E.t * 10) * 0.06; g.scale(p, p); }
    g.drawImage(spr, -s / 2, -s / 2, s, s);
    if (t.lock && t.vlock !== false) g.drawImage(lockSprite(ts), -s / 2, -s / 2, s, s);
    if (t.timer > 0) { // bomba de cuenta atrás
      g.beginPath(); g.arc(0, 0, s * 0.27, 0, 7); g.fillStyle = t.timer <= 3 ? '#d62828' : '#2b2b33'; g.fill();
      g.lineWidth = s * 0.05; g.strokeStyle = '#fff'; g.stroke();
      E.text(g, String(t.timer), 0, 1, s * 0.32, '#fff', { stroke: false });
    }
    if (t.cham != null) { // camaleón: el aro es el color al que cambiará
      g.lineWidth = s * 0.09; g.strokeStyle = COLORS[t.cham]; g.beginPath(); g.arc(0, 0, s * 0.43, 0, 7); g.stroke();
    }
    if (t.myst) g.drawImage(E.emojiSprite('❓', s * 0.5), -s * 0.25, -s * 0.25, s * 0.5, s * 0.5);
    if (t.key) g.drawImage(E.emojiSprite('🔑', s * 0.48), -s * 0.24, -s * 0.24, s * 0.48, s * 0.48);
    if (t.plus5) { g.beginPath(); g.arc(0, 0, s * 0.26, 0, 7); g.fillStyle = '#2bb24c'; g.fill(); E.text(g, '+5', 0, 1, s * 0.27, '#fff', { stroke: false }); }
    if (t.clock) { const cs = s * 0.5; g.drawImage(E.emojiSprite('⏱️', cs), -cs / 2, -cs / 2, cs, cs); }
    if (t.frog) { // rana: se come los caramelos de su color; llena, se lanza donde toques
      const fs = s * 0.66;
      if (t.fillK >= 1) { const p = 1 + Math.sin(E.t * 8) * 0.08; g.scale(p, p); }
      g.drawImage(E.emojiSprite('🐸', fs), -fs / 2, -fs * 0.58, fs, fs);
      const k2 = Math.min(1, t.fillK || 0);
      g.fillStyle = 'rgba(0,0,0,0.45)'; E.rr(g, -s * 0.36, s * 0.26, s * 0.72, s * 0.13, s * 0.06); g.fill();
      g.fillStyle = k2 >= 1 ? '#ffe14d' : '#7be36b'; E.rr(g, -s * 0.36, s * 0.26, s * 0.72 * k2, s * 0.13, s * 0.06); g.fill();
    }
    g.restore();
  }
  // batidora mágica, palomitas y calavera ácida
  function blockerSprite(kind, hp, ts) {
    return E.sprite('blk' + kind + hp, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.16);
      g.fillStyle = kind === 'mixer' ? '#5a3d8a' : kind === 'popcorn' ? '#f6e7c1' : '#9fd36a'; g.fill();
      g.lineWidth = w * 0.05; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
      const s = w * 0.6; g.drawImage(E.emojiSprite(kind === 'mixer' ? '🌀' : kind === 'popcorn' ? '🍿' : '💀', s), (w - s) / 2, (h - s) / 2, s, s);
      if (hp > 1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.14, 0, 7); g.fill(); E.text(g, String(hp), w * 0.8, h * 0.21, w * 0.2, '#333', { stroke: false }); }
    });
  }
  // tofellino (gofre): capas que se quitan combinando al lado; cae si combinas debajo
  function waffleSprite(hp, ts) {
    return E.sprite('waffle' + hp, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.16);
      g.fillStyle = ['#f6d7a0', '#eebd6e', '#d99a3e', '#b9782a'][Math.min(hp, 3)]; g.fill();
      g.lineWidth = w * 0.05; g.strokeStyle = '#8a5418'; g.stroke();
      g.strokeStyle = 'rgba(138,84,24,0.55)'; g.lineWidth = w * 0.04;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(w * (0.06 + i * 0.22), h * 0.1); g.lineTo(w * (0.06 + i * 0.22), h * 0.9); g.moveTo(w * 0.1, h * (0.06 + i * 0.22)); g.lineTo(w * 0.9, h * (0.06 + i * 0.22)); g.stroke(); }
      if (hp > 1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.14, 0, 7); g.fill(); E.text(g, String(hp), w * 0.8, h * 0.21, w * 0.2, '#8a5418', { stroke: false }); }
    });
  }
  // candado de azúcar: se abre solo con las llaves de azúcar (cada llave quita una capa a todos)
  function sugarLockSprite(hp, ts) {
    return E.sprite('slock' + hp, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.14);
      g.fillStyle = ['#fff7e0', '#ffe9b0', '#ffd27a', '#f2b545'][Math.min(hp, 3)]; g.fill();
      g.lineWidth = w * 0.06; g.strokeStyle = '#c98a1e'; g.stroke();
      const s = w * 0.5; g.drawImage(E.emojiSprite('🔒', s), (w - s) / 2, (h - s) / 2 - h * 0.04, s, s);
      if (hp > 1) { g.fillStyle = '#c98a1e'; g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.14, 0, 7); g.fill(); E.text(g, String(hp), w * 0.8, h * 0.21, w * 0.2, '#fff', { stroke: false }); }
    });
  }
  // candado de regaliz (va encima de un caramelo; en su tramo sale en el 55% de los niveles)
  function lockSprite(ts) {
    return E.sprite('lock', ts, ts, (g, w, h) => {
      g.strokeStyle = '#26262e'; g.lineWidth = w * 0.11; g.lineCap = 'round';
      g.beginPath(); g.moveTo(w * 0.12, h * 0.12); g.lineTo(w * 0.88, h * 0.88); g.moveTo(w * 0.88, h * 0.12); g.lineTo(w * 0.12, h * 0.88); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = w * 0.03; g.stroke();
      g.fillStyle = '#26262e'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.13, 0, 7); g.fill();
    });
  }
  GAME.drawGoalIcon = function (g, gl, x, y, s) {
    let spr;
    if (gl.type === 'color') spr = candySprite(gl.key, null, s);
    else if (gl.type === 'jelly') spr = jellySprite(2, s);
    else if (gl.type === 'ice') spr = iceSprite(1, s);
    else if (gl.type === 'ing') spr = E.emojiSprite('🍒', s);
    else if (gl.type === 'mixer' || gl.type === 'skull') spr = blockerSprite(gl.type, 1, s);
    else if (gl.type === 'slock') spr = sugarLockSprite(1, s);
    else spr = candySprite(4, 'v', s);
    g.drawImage(spr, x - s / 2, y - s / 2, s, s);
  };

  // ------------------------------------------------------------ lógica
  const inB = (S, r, c) => r >= 0 && c >= 0 && r < S.R && c < S.C && r >= S.top[c] && !(S.hole && S.hole[r][c]);
  const at = (S, r, c) => (inB(S, r, c) ? S.grid[r][c] : null);
  // el tofellino y el glaseado que cae son glaseado que sí cae (t.fall), pero no se puede intercambiar
  const movable = (t) => t && (t.kind !== 'ice' || t.fall) && !t.lock && !['mixer', 'popcorn', 'skull', 'slock'].includes(t.kind);
  const matchable = (t) => t && t.kind === 'candy';
  const swappable = (t) => movable(t) && t.kind !== 'lic' && t.kind !== 'ice';
  const matchableAt = (t) => t && t.kind === 'candy';
  function newCandy(S) { return { id: uid++, kind: 'candy', color: S.rand.int(S.colors), sp: null }; }

  function findGroups(S) {
    const runs = [];
    for (let r = 0; r < S.R; r++) {
      let c = 0;
      while (c < S.C) {
        const t = at(S, r, c);
        if (!matchable(t)) { c++; continue; }
        let e = c + 1;
        while (e < S.C) { const o = at(S, r, e); if (matchable(o) && o.color === t.color) e++; else break; }
        if (e - c >= 3) { const cells = []; for (let k = c; k < e; k++) cells.push([r, k]); runs.push({ dir: 'h', cells, color: t.color }); }
        c = e;
      }
    }
    for (let c = 0; c < S.C; c++) {
      let r = 0;
      while (r < S.R) {
        const t = at(S, r, c);
        if (!matchable(t)) { r++; continue; }
        let e = r + 1;
        while (e < S.R) { const o = at(S, e, c); if (matchable(o) && o.color === t.color) e++; else break; }
        if (e - r >= 3) { const cells = []; for (let k = r; k < e; k++) cells.push([k, c]); runs.push({ dir: 'v', cells, color: t.color }); }
        r = e;
      }
    }
    // cuadrados de 2x2 (dan un pez)
    for (let r = 0; r + 1 < S.R; r++) for (let c = 0; c + 1 < S.C; c++) {
      const t = at(S, r, c);
      if (!matchable(t)) continue;
      const q = [[r, c + 1], [r + 1, c], [r + 1, c + 1]];
      if (q.every(([rr, cc]) => { const o = at(S, rr, cc); return matchable(o) && o.color === t.color; })) runs.push({ dir: 'sq', cells: [[r, c], ...q], color: t.color });
    }
    if (!runs.length) return [];
    // unir carreras que comparten casillas
    const groups = [];
    const owner = new Map();
    for (const run of runs) {
      let gidx = -1;
      for (const [r, c] of run.cells) { const k = r * 64 + c; if (owner.has(k)) { gidx = owner.get(k); break; } }
      if (gidx < 0) { gidx = groups.length; groups.push({ runs: [], cells: new Map(), color: run.color }); }
      const G = groups[gidx];
      G.runs.push(run);
      for (const [r, c] of run.cells) { const k = r * 64 + c; G.cells.set(k, [r, c]); owner.set(k, gidx); }
    }
    return groups;
  }
  function hasMatchAt(S, r, c) {
    const t = at(S, r, c);
    if (!matchable(t)) return false;
    let n = 1;
    for (let k = c - 1; k >= 0; k--) { const o = at(S, r, k); if (matchable(o) && o.color === t.color) n++; else break; }
    for (let k = c + 1; k < S.C; k++) { const o = at(S, r, k); if (matchable(o) && o.color === t.color) n++; else break; }
    if (n >= 3) return true;
    n = 1;
    for (let k = r - 1; k >= 0; k--) { const o = at(S, k, c); if (matchable(o) && o.color === t.color) n++; else break; }
    for (let k = r + 1; k < S.R; k++) { const o = at(S, k, c); if (matchable(o) && o.color === t.color) n++; else break; }
    if (n >= 3) return true;
    for (const [dr, dc] of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
      const r0 = r + dr, c0 = c + dc;
      let ok = true;
      for (const [qr, qc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) { const o = at(S, r0 + qr, c0 + qc); if (!matchable(o) || o.color !== t.color) { ok = false; break; } }
      if (ok) return true;
    }
    return false;
  }
  // valla de regaliz: pared fija en el borde derecho de la casilla (no deja intercambiar a través y corta los rayados)
  const wallBetween = (S, a, b) => !!S.wall && a[0] === b[0] && Math.abs(a[1] - b[1]) === 1 && !!S.wall[a[0]][Math.min(a[1], b[1])];
  function rowSpan(S, r, c) {
    let c0 = c, c1 = c;
    if (S.wall) { while (c0 > 0 && !S.wall[r][c0 - 1]) c0--; while (c1 < S.C - 1 && !S.wall[r][c1]) c1++; } else { c0 = 0; c1 = S.C - 1; }
    return [c0, c1];
  }
  function swapValid(S, a, b) {
    if (wallBetween(S, a, b)) return false;
    const ta = at(S, a[0], a[1]), tb = at(S, b[0], b[1]);
    if (!swappable(ta) || !swappable(tb)) return false;
    if (ta.kind === 'bomb' || tb.kind === 'bomb') return ta.kind !== 'ing' && tb.kind !== 'ing';
    if (ta.sp && tb.sp) return true;
    S.grid[a[0]][a[1]] = tb; S.grid[b[0]][b[1]] = ta;
    const ok = hasMatchAt(S, a[0], a[1]) || hasMatchAt(S, b[0], b[1]);
    S.grid[a[0]][a[1]] = ta; S.grid[b[0]][b[1]] = tb;
    return ok;
  }
  function validSwaps(S) {
    const out = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      if (!inB(S, r, c)) continue;
      if (inB(S, r, c + 1) && swapValid(S, [r, c], [r, c + 1])) out.push([[r, c], [r, c + 1]]);
      if (inB(S, r + 1, c) && swapValid(S, [r, c], [r + 1, c])) out.push([[r, c], [r + 1, c]]);
    }
    return out;
  }

  GAME.validSwaps = validSwaps;

  // Golpe a una casilla (por explosión o por estar en una línea)
  function hit(S, r, c, delay, K, fromMatch) {
    if (!inB(S, r, c)) return;
    const t = S.grid[r][c];
    if (!t) { hitJelly(S, r, c, delay, K); return; }
    if (t.kind === 'ice') {
      t.hp--;
      if (t.hp <= 0) { S.grid[r][c] = null; K.remove(t, r, c, delay); if (t.choc) S.chocHit = true; else K.collect('ice', undefined, r, c, delay); }
      else K.hurt(t, delay, t.hp);
      return;
    }
    if (t.kind === 'ing' || t.kind === 'slock') return;
    // batidora (3 golpes) y calavera ácida (1): combinaciones al lado o especiales
    if (t.kind === 'mixer' || t.kind === 'skull') {
      t.hp--;
      if (t.hp <= 0) { S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect(t.kind, undefined, r, c, delay); } else K.hurt(t, delay, t.hp);
      return;
    }
    // palomitas: solo especiales; a los 3 golpes revientan y dejan una bomba de color
    if (t.kind === 'popcorn') {
      if (fromMatch === 'adj') return;
      t.hp--;
      if (t.hp <= 0) { const b = { id: uid++, kind: 'bomb' }; S.grid[r][c] = b; K.remove(t, r, c, delay); K.created(b, r, c, delay + 0.1); } else K.hurt(t, delay, t.hp);
      return;
    }
    if (t.kind === 'lic') { S.grid[r][c] = null; K.remove(t, r, c, delay); return; }
    // candado de regaliz: el golpe rompe el candado y el caramelo se queda
    if (t.lock) { t.lock = false; K.hurt(t, delay, 'unlock'); K.collect('lock', undefined, r, c, delay); return; }
    // la rana no se rompe: se queda en su sitio y sigue comiendo
    if (t.frog) { hitJelly(S, r, c, delay, K); return; }
    S.grid[r][c] = null;
    hitJelly(S, r, c, delay, K);
    if (t.kind === 'bomb') { activate(S, t, r, c, delay + 0.1, K); return; }
    K.remove(t, r, c, delay, fromMatch ? 'match' : null);
    K.collect('color', t.color, r, c, delay);
    if (S.frogFull && t.color === S.frogColor) S.frogBelly++;
    if (t.plus5) K.extraMoves(5, r, c, delay);
    if (t.clock) K.extraTime(5, r, c, delay);
    if (t.key) sugarKey(S, K, delay);
    if (t.myst) { const m = mysteryOf(S); S.grid[r][c] = m; K.created(m, r, c, delay + 0.15); if (m.timer) K.fx({ type: 'boom', r, c, rad: 0.6, delay }); }
    if (t.sp) activate(S, t, r, c, delay + 0.1, K);
  }
  // llave de azúcar: cada una quita una capa a todos los candados de azúcar
  function sugarKey(S, K, delay) {
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const o = at(S, r, c);
      if (!o || o.kind !== 'slock') continue;
      o.hp--;
      if (o.hp <= 0) { S.grid[r][c] = null; K.remove(o, r, c, delay + 0.1); K.collect('slock', undefined, r, c, delay + 0.1); } else K.hurt(o, delay + 0.1, o.hp);
    }
  }
  // caramelo misterioso: puede salir algo bueno (especiales) o malo (chocolate, regaliz o una bomba)
  function mysteryOf(S) {
    const q = S.rand();
    const col = S.rand.int(S.colors);
    if (q < 0.25) return { id: uid++, kind: 'candy', color: col, sp: S.rand() < 0.5 ? 'h' : 'v' };
    if (q < 0.42) return { id: uid++, kind: 'candy', color: col, sp: 'w' };
    if (q < 0.55) return { id: uid++, kind: 'candy', color: col, sp: 'f' };
    if (q < 0.62) return { id: uid++, kind: 'bomb' };
    if (q < 0.75) return { id: uid++, kind: 'ice', choc: true, hp: 1 };
    if (q < 0.88) return { id: uid++, kind: 'lic' };
    return { id: uid++, kind: 'candy', color: col, sp: null, timer: 8 };
  }
  function hitJelly(S, r, c, delay, K) {
    if (S.jelly[r][c] > 0) {
      S.jelly[r][c]--;
      K.jelly(r, c, S.jelly[r][c], delay);
      if (S.jelly[r][c] === 0) K.collect('jelly', undefined, r, c, delay);
    }
  }
  function mostColor(S) {
    const cnt = new Array(6).fill(0);
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (matchable(t)) cnt[t.color]++; }
    let best = 0; for (let i = 1; i < 6; i++) if (cnt[i] > cnt[best]) best = i;
    return best;
  }
  function activate(S, t, r, c, delay, K) {
    if (t.kind === 'bomb') {
      if (t.kind === 'bomb' && S.grid[r][c] === t) S.grid[r][c] = null;
      K.remove(t, r, c, delay);
      clearColor(S, mostColor(S), r, c, delay, K);
      return;
    }
    if (t.sp === 'h') { K.fx({ type: 'line', dir: 'h', r, c, delay }); const [c0, c1] = rowSpan(S, r, c); for (let cc = c0; cc <= c1; cc++) if (cc !== c) hit(S, r, cc, delay + Math.abs(cc - c) * 0.035, K); }
    else if (t.sp === 'v') { K.fx({ type: 'line', dir: 'v', r, c, delay }); for (let rr = 0; rr < S.R; rr++) if (rr !== r) hit(S, rr, c, delay + Math.abs(rr - r) * 0.035, K); }
    else if (t.sp === 'f') {
      // el pez nada hasta una casilla que haga falta: gelatina, glaseado, chocolate o un caramelo del objetivo
      const cand = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) {
        if (!inB(S, rr, cc) || (rr === r && cc === c)) continue;
        const o = S.grid[rr][cc];
        let w = 0;
        if (S.jelly[rr][cc] > 0) w += 3;
        if (o && o.kind === 'ice') w += 3;
        if (o && o.kind === 'lic') w += 2;
        if (o && matchable(o)) w += 0.2;
        if (w > 0) cand.push([w + S.rand() * 0.5, rr, cc]);
      }
      cand.sort((x, y) => y[0] - x[0]);
      if (cand.length) { const [, tr, tc] = cand[0]; K.fx({ type: 'zap', r, c, targets: [[tr, tc]], delay, color: t.color }); hit(S, tr, tc, delay + 0.35, K); }
    }
    else if (t.sp === 'w') {
      K.fx({ type: 'boom', r, c, rad: 1.5, delay });
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        if ((dr || dc) && (Math.abs(dr) + Math.abs(dc) <= 2 || (Math.abs(dr) <= 1 && Math.abs(dc) <= 1))) hit(S, r + dr, c + dc, delay + 0.06, K);
      }
    }
  }
  function clearColor(S, color, r, c, delay, K) {
    const targets = [];
    for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const t = at(S, rr, cc); if (matchable(t) && t.color === color) targets.push([rr, cc]); }
    K.fx({ type: 'zap', r, c, targets, delay, color });
    targets.forEach(([rr, cc], i) => hit(S, rr, cc, delay + 0.3 + i * 0.02, K));
  }

  // Intercambio con caramelos especiales o bomba de color
  function combo(S, a, b, K) {
    const ta = S.grid[a[0]][a[1]], tb = S.grid[b[0]][b[1]];
    const [r, c] = b;
    S.grid[a[0]][a[1]] = null; S.grid[b[0]][b[1]] = null;
    K.remove(ta, a[0], a[1], 0.05, 'merge', b); K.remove(tb, r, c, 0.05);
    hitJelly(S, a[0], a[1], 0, K); hitJelly(S, r, c, 0, K);
    const d = 0.15;
    if (ta.kind === 'bomb' && tb.kind === 'bomb') {
      K.fx({ type: 'boom', r, c, rad: 9, delay: d });
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) hit(S, rr, cc, d + 0.04 * (Math.abs(rr - r) + Math.abs(cc - c)), K);
      return;
    }
    if (ta.kind === 'bomb' || tb.kind === 'bomb') {
      const other = ta.kind === 'bomb' ? tb : ta;
      if (!other.sp) { K.collect('color', other.color, r, c, 0); clearColor(S, other.color, r, c, d, K); return; }
      K.collect('color', other.color, r, c, 0);
      const targets = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const t = at(S, rr, cc); if (matchable(t) && t.color === other.color) targets.push([rr, cc]); }
      K.fx({ type: 'zap', r, c, targets, delay: d, color: other.color });
      targets.forEach(([rr, cc]) => {
        const old = S.grid[rr][cc];
        const nt = { id: uid++, kind: 'candy', color: old.color, sp: other.sp === 'w' ? 'w' : S.rand() < 0.5 ? 'h' : 'v' };
        S.grid[rr][cc] = nt;
        K.remove(old, rr, cc, d + 0.3); K.created(nt, rr, cc, d + 0.3);
      });
      targets.forEach(([rr, cc], i) => hit(S, rr, cc, d + 0.7 + i * 0.08, K));
      return;
    }
    const sps = [ta.sp, tb.sp];
    K.collect('color', ta.color, r, c, 0); K.collect('color', tb.color, r, c, 0);
    const lines = (rows, cols) => {
      for (const rr of rows) { if (rr < 0 || rr >= S.R) continue; K.fx({ type: 'line', dir: 'h', r: rr, c, delay: d }); const [c0, c1] = rowSpan(S, rr, c); for (let cc = c0; cc <= c1; cc++) hit(S, rr, cc, d + Math.abs(cc - c) * 0.035, K); }
      for (const cc of cols) { K.fx({ type: 'line', dir: 'v', r, c: cc, delay: d }); for (let rr = 0; rr < S.R; rr++) hit(S, rr, cc, d + Math.abs(rr - r) * 0.035, K); }
    };
    if (sps[0] === 'w' && sps[1] === 'w') {
      K.fx({ type: 'boom', r, c, rad: 2.5, delay: d });
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) hit(S, r + dr, c + dc, d + 0.05 * Math.max(Math.abs(dr), Math.abs(dc)), K);
    } else if (sps.includes('w')) {
      lines([r - 1, r, r + 1], [c - 1, c, c + 1]);
    } else {
      lines([r], [c]);
    }
  }

  // Rellenar huecos: caída vertical, nuevos caramelos arriba y deslizamiento en diagonal.
  function fill(S, K) {
    const spawnCount = new Array(S.C).fill(0);
    for (let guard = 0; guard < 200; guard++) {
      let moved = false;
      for (let c = 0; c < S.C; c++) {
        for (let r = S.R - 1; r >= S.top[c]; r--) {
          if (!inB(S, r, c) || S.grid[r][c]) continue;
          // buscar arriba la primera pieza (los caramelos NO atraviesan los huecos, como en Candy Crush)
          let k = r - 1;
          while (k >= S.top[c] && inB(S, k, c) && !S.grid[k][c]) k--;
          if (k >= S.top[c] && inB(S, k, c)) { if (movable(S.grid[k][c])) { S.grid[r][c] = S.grid[k][c]; S.grid[k][c] = null; moved = true; } }
          else if (k >= S.top[c] && S.portal && S.portal[k + 1][c]) {
            // portal: el caramelo de encima del hueco aparece debajo
            let q = k; while (q >= S.top[c] && !inB(S, q, c)) q--;
            if (q >= S.top[c] && S.grid[q][c] && movable(S.grid[q][c])) { S.grid[r][c] = S.grid[q][c]; S.grid[q][c] = null; moved = true; }
          }
          else if (k < S.top[c] || (S.spawn && S.spawn[k + 1][c])) {
            // arriba del todo o bajo un hueco con generador propio; si no hay generador se rellena en diagonal
            const t = spawnPiece(S, k < S.top[c] ? c : -1);
            S.grid[r][c] = t; K.spawn(t, c, spawnCount[c]++, k + 1); moved = true;
          }
        }
      }
      if (moved) continue;
      // diagonal
      let diag = false;
      for (let r = S.R - 1; r >= 0 && !diag; r--) {
        for (let c = 0; c < S.C && !diag; c++) {
          if (!inB(S, r, c) || S.grid[r][c]) continue;
          for (const dc of [-1, 1]) {
            const o = at(S, r - 1, c + dc);
            if (movable(o) && !below(S, r - 1, c + dc)) { S.grid[r][c] = o; S.grid[r - 1][c + dc] = null; diag = true; break; }
          }
        }
      }
      if (!diag) break;
    }
  }
  // ¿la pieza en (r,c) podría caer recto hacia abajo?
  function below(S, r, c) { return inB(S, r + 1, c) && !S.grid[r + 1][c]; }
  function spawnPiece(S, c) {
    const ingOn = countIng(S);
    // cañones: casillas de arriba que sueltan siempre lo mismo (regaliz, ingredientes, peces, rayados o bombas)
    const cn = S.cannon && c >= 0 ? S.cannon[c] : null;
    if (cn && S.rand() < 0.16) {
      if (cn === 'ing') { if (S.ingLeft > ingOn && ingOn < 3) return { id: uid++, kind: 'ing', ing: S.rand.int(2) }; }
      else if (cn === 'lic') return { id: uid++, kind: 'lic' };
      else if (cn === 'timer') { const t = newCandy(S); t.timer = 15 + S.rand.int(6); return t; }
      else { const t = newCandy(S); t.sp = cn === 'stripe' ? (S.rand() < 0.5 ? 'h' : 'v') : 'f'; return t; }
    }
    if (S.ingLeft > ingOn && ingOn < 2 && S.rand() < 0.12) return { id: uid++, kind: 'ing', ing: S.rand.int(2) };
    // llaves de azúcar mientras queden candados
    if (S.keyRate && S.rand() < S.keyRate && countKind(S, 'slock') && countKey(S) < 2) { const t = newCandy(S); t.key = true; return t; }
    if (S.chamRate && S.rand() < S.chamRate) { const t = newCandy(S); t.cham = (t.color + 1 + S.rand.int(S.colors - 1)) % S.colors; return t; }
    if (S.mystRate && S.rand() < S.mystRate) { const t = newCandy(S); t.myst = true; return t; }
    if (S.clockRate && S.rand() < S.clockRate && countFlag(S, 'clock') < 2) { const t = newCandy(S); t.clock = true; return t; } // contrarreloj
    if (S.plusRate && S.rand() < S.plusRate && !countFlag(S, 'plus5')) { const t = newCandy(S); t.plus5 = true; return t; }
    if (S.licRate && S.rand() < S.licRate) return { id: uid++, kind: 'lic' };
    if (S.fallIceRate && S.rand() < S.fallIceRate) return { id: uid++, kind: 'ice', hp: 1, fall: true }; // glaseado que cae
    if (S.spRate && S.rand() < S.spRate) {
      const k = S.spKind;
      if (k === 'bomb') return { id: uid++, kind: 'bomb' };
      const c = newCandy(S); c.sp = k === 'stripe' ? (S.rand() < 0.5 ? 'h' : 'v') : 'f'; return c;
    }
    return newCandy(S);
  }
  function countIng(S) {
    let n = 0;
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = S.grid[r][c]; if (t && t.kind === 'ing') n++; }
    return n;
  }
  function countKind(S, kind) {
    let n = 0;
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = S.grid[r][c]; if (t && t.kind === kind) n++; }
    return n;
  }
  function countFlag(S, f) {
    let n = 0;
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = S.grid[r][c]; if (t && t[f]) n++; }
    return n;
  }
  const countKey = (S) => countFlag(S, 'key');
  function bottomOf(S, c) { return S.R - 1; }

  function resolve(S, K, swapCells) {
    for (let loop = 0; loop < 40; loop++) {
      const groups = findGroups(S);
      const ings = [];
      for (let c = 0; c < S.C; c++) { const t = S.grid[bottomOf(S, c)][c]; if (t && t.kind === 'ing') ings.push([bottomOf(S, c), c]); }
      if (!groups.length && !ings.length) break;
      if (loop > 0 || !K.inPhase) K.begin();
      K.inPhase = false;
      for (const [r, c] of ings) {
        const t = S.grid[r][c]; S.grid[r][c] = null; S.ingLeft--;
        K.remove(t, r, c, 0, 'ing'); K.collect('ing', undefined, r, c, 0);
      }
      const creates = [];
      const iceHit = new Set();
      K.combo(loop);
      for (const G of groups) {
        const cells = [...G.cells.values()];
        let maxLen = 0, hasH = false, hasV = false, four = null, square = null;
        for (const run of G.runs) {
          if (run.dir === 'sq') { square = run; continue; }
          maxLen = Math.max(maxLen, run.cells.length);
          if (run.dir === 'h') hasH = true; else hasV = true;
          if (run.cells.length === 4) four = run;
        }
        let make = null;
        if (maxLen >= 5) make = { kind: 'bomb' };
        else if (hasH && hasV) make = { kind: 'candy', sp: 'w' };
        else if (four) make = { kind: 'candy', sp: four.dir === 'h' ? 'v' : 'h' };
        else if (square) make = { kind: 'candy', sp: 'f' };
        let pos = null;
        if (make) {
          if (swapCells) for (const sc of swapCells) if (G.cells.has(sc[0] * 64 + sc[1])) pos = sc;
          if (!pos) {
            if (hasH && hasV) {
              // la esquina compartida
              const cnt = new Map();
              G.runs.forEach((run) => run.cells.forEach(([r, c]) => cnt.set(r * 64 + c, (cnt.get(r * 64 + c) || 0) + 1)));
              for (const [k, v] of cnt) if (v > 1) pos = G.cells.get(k);
            }
            if (!pos && square && !hasH && !hasV) pos = square.cells[3];
            if (!pos) { const longest = G.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a)); pos = longest.cells[Math.floor(longest.cells.length / 2)]; }
          }
          creates.push({ make, pos, color: G.color });
        }
        for (const [r, c] of cells) {
          hit(S, r, c, 0, K, true);
          for (const [dr, dc] of D4) {
            const o = at(S, r + dr, c + dc);
            if (o && (o.kind === 'ice' || o.kind === 'lic' || o.kind === 'mixer' || o.kind === 'skull') && !iceHit.has(o)) { iceHit.add(o); hit(S, r + dr, c + dc, 0.05, K, 'adj'); }
          }
        }
        K.sound(cells.length, loop);
      }
      for (const cr of creates) {
        const [r, c] = cr.pos;
        if (S.grid[r][c]) continue;
        const t = cr.make.kind === 'bomb' ? { id: uid++, kind: 'bomb' } : { id: uid++, kind: 'candy', color: cr.color, sp: cr.make.sp };
        S.grid[r][c] = t;
        K.created(t, r, c, 0.15);
        if (t.sp === 'h' || t.sp === 'v') K.collect('striped', undefined, r, c, 0.15);
      }
      fill(S, K);
      K.end(S);
      swapCells = null;
    }
    if (!validSwaps(S).length) { shuffle(S); K.shuffle(S); }
  }
  // si en la jugada no se rompió chocolate, el chocolate se extiende a un caramelo vecino
  function spreadChoc(S, K) {
    if (S.chocHit) return;
    const opts = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const t = at(S, r, c);
      if (!t || !t.choc) continue;
      for (const [dr, dc] of D4) { const o = at(S, r + dr, c + dc); if (matchable(o) && !o.sp && !o.frog) opts.push([r + dr, c + dc]); }
    }
    if (!opts.length) return;
    const [r, c] = opts[S.rand.int(opts.length)];
    const old = S.grid[r][c];
    const ch = { id: uid++, kind: 'ice', choc: true, hp: 1 };
    K.begin();
    S.grid[r][c] = ch;
    K.remove(old, r, c, 0, 'choc');
    K.created(ch, r, c, 0.1);
    K.end(S);
    if (!validSwaps(S).length) { shuffle(S); K.shuffle(S); }
  }
  // bombas de cuenta atrás: bajan 1 por jugada; si alguna llega a 0 se pierde el nivel (como en Candy Crush)
  // batidora mágica: cada 3 jugadas convierte un caramelo de al lado en glaseado
  function mixerTurn(S, K) {
    S.turn = (S.turn || 0) + 1;
    if (S.turn % 3) return;
    const ch = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const m = at(S, r, c);
      if (!m || m.kind !== 'mixer') continue;
      const opts = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const o = at(S, r + dr, c + dc); if (matchable(o) && !o.sp && !o.lock && !o.timer && !o.frog) opts.push([r + dr, c + dc]); }
      if (opts.length) ch.push(opts[S.rand.int(opts.length)]);
    }
    if (!ch.length) return;
    K.begin();
    for (const [r, c] of ch) { const old = S.grid[r][c]; if (!old || old.kind !== 'candy') continue; const ice = { id: uid++, kind: 'ice', hp: 1 }; S.grid[r][c] = ice; K.remove(old, r, c, 0, 'choc'); K.created(ice, r, c, 0.1); }
    K.end(S);
    if (!validSwaps(S).length) { shuffle(S); K.shuffle(S); }
  }
  // cintas transportadoras (cada jugada mueven su fila una casilla, dando la vuelta) y caramelos camaleón
  function beltTurn(S, K) {
    let changed = false;
    const fr = S.frogFull ? findFrog(S) : null;
    if (S.belt && S.belt.length) {
      K.begin();
      for (const b of S.belt) {
        const cols = [];
        for (let c = 0; c < S.C; c++) if (inB(S, b.r, c)) cols.push(c);
        if (b.dir < 0) cols.reverse();
        const pcs = cols.map((c) => S.grid[b.r][c]);
        const jl = cols.map((c) => S.jelly[b.r][c]);
        cols.forEach((c, i) => { const j = (i - 1 + cols.length) % cols.length; S.grid[b.r][c] = pcs[j]; S.jelly[b.r][c] = jl[j]; K.jelly(b.r, c, jl[j], 0); });
      }
      K.end(S);
      changed = true;
    }
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const t = at(S, r, c);
      if (t && t.cham != null) { const o = t.color; t.color = t.cham; t.cham = o; changed = true; }
    }
    if (fr && S.frogBelly >= S.frogFull) { /* la rana llena espera a que la lances */ }
    if (changed) { K.inPhase = false; resolve(S, K, null); }
  }
  function findFrog(S) {
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (t && t.frog) return [r, c]; }
    return null;
  }
  // la rana llena salta a la casilla elegida y revienta un 3x3 al caer; luego cambia de color
  function frogJump(S, r, c, K) {
    const f = findFrog(S);
    if (!f || S.frogBelly < S.frogFull || !inB(S, r, c)) return false;
    const fr = S.grid[f[0]][f[1]];
    S.chocHit = false;
    K.begin(); K.inPhase = true;
    S.grid[f[0]][f[1]] = null;
    K.fx({ type: 'boom', r, c, rad: 1.5, delay: 0.25 });
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) hit(S, r + dr, c + dc, 0.25 + 0.03 * (Math.abs(dr) + Math.abs(dc)), K);
    // la rana se posa en la casilla libre más cercana al centro del salto
    let land = null;
    for (const [dr, dc] of [[0, 0], [1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { if (inB(S, r + dr, c + dc) && !S.grid[r + dr][c + dc]) { land = [r + dr, c + dc]; break; } }
    if (!land) land = f;
    S.frogBelly = 0;
    let col = S.frogColor; while (S.colors > 1 && col === S.frogColor) col = S.rand.int(S.colors);
    S.frogColor = col; fr.color = col;
    S.grid[land[0]][land[1]] = fr;
    K.frogMove(fr, land[0], land[1]);
    fill(S, K);
    K.end(S);
    K.inPhase = false;
    resolve(S, K, null);
    spreadChoc(S, K);
    return true;
  }
  // el bot lanza la rana al 3x3 que más le sirve
  function frogTarget(S, need) {
    let best = null, bs = -1;
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      if (!inB(S, r, c)) continue;
      let sc = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (!inB(S, rr, cc)) continue;
        const o = S.grid[rr][cc];
        if (need.jelly > 0 && S.jelly[rr][cc] > 0) sc += 2;
        if (o && o.kind === 'ice') sc += need.ice > 0 || o.choc ? 2 : 0.5;
        if (o && (o.kind === 'mixer' || o.kind === 'skull' || o.kind === 'lic' || o.timer || o.lock)) sc += 1.5;
        if (o && o.kind === 'candy' && need.color && need.color[o.color] > 0) sc += 1;
        sc += 0.1;
      }
      if (sc > bs) { bs = sc; best = [r, c]; }
    }
    return best;
  }
  function tickBombs(S, K) {
    beltTurn(S, K);
    mixerTurn(S, K);
    const boom = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (t && t.timer > 0) { t.timer--; if (t.timer === 0) boom.push([r, c, t]); } }
    if (!boom.length) return;
    S.bombOut = true;
    K.begin();
    for (const [r, c] of boom) { K.fx({ type: 'boom', r, c, rad: 1.5, delay: 0 }); K.bombOut(r, c); }
    K.end(S);
  }
  // Una jugada: intercambiar a y b. Devuelve false si no vale.
  function act(S, a, b, K) {
    if (!swapValid(S, a, b)) return false;
    const ta = S.grid[a[0]][a[1]], tb = S.grid[b[0]][b[1]];
    S.chocHit = false;
    K.begin(); K.inPhase = true;
    if (ta.kind === 'bomb' || tb.kind === 'bomb' || (ta.sp && tb.sp)) {
      combo(S, a, b, K);
      fill(S, K);
      K.end(S);
      K.inPhase = false;
      resolve(S, K, null);
    } else {
      S.grid[a[0]][a[1]] = tb; S.grid[b[0]][b[1]] = ta;
      resolve(S, K, [a, b]);
    }
    spreadChoc(S, K);
    tickBombs(S, K);
    return true;
  }
  // Tocar un caramelo especial lo activa al instante (Candy Crush actual: "Toca cualquier caramelo especial para usarlo")
  function actTap(S, r, c, K) {
    const t = at(S, r, c);
    if (!t || !(t.kind === 'bomb' || t.sp)) return false;
    S.chocHit = false;
    K.begin(); K.inPhase = true;
    S.grid[r][c] = null;
    hitJelly(S, r, c, 0, K);
    if (t.kind === 'bomb') activate(S, t, r, c, 0, K);
    else { K.remove(t, r, c, 0); K.collect('color', t.color, r, c, 0); activate(S, t, r, c, 0.05, K); }
    fill(S, K);
    K.end(S);
    K.inPhase = false;
    resolve(S, K, null);
    spreadChoc(S, K);
    tickBombs(S, K);
    return true;
  }
  function shuffle(S) {
    const pos = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (t && t.kind === 'candy' && !t.lock) pos.push([r, c]); }
    const pieces = pos.map(([r, c]) => S.grid[r][c]);
    for (let tries = 0; tries < 60; tries++) {
      S.rand.shuffle(pieces);
      pos.forEach(([r, c], i) => { S.grid[r][c] = pieces[i]; });
      if (!findGroups(S).length && validSwaps(S).length) return;
    }
    // última opción: recolorear
    for (let tries = 0; tries < 50; tries++) {
      for (const [r, c] of pos) if (!S.grid[r][c].sp && !S.grid[r][c].frog) S.grid[r][c].color = S.rand.int(S.colors);
      if (!findGroups(S).length && validSwaps(S).length) return;
    }
  }

  // ------------------------------------------------------------ estado y bot
  function buildState(spec, seed) {
    const S = { R: spec.R, C: spec.C, top: spec.top.slice(), colors: spec.colors, rand: E.rng(seed), ingLeft: spec.ings, licRate: spec.licRate || 0, hole: spec.hole, spawn: spec.spawn, portal: spec.portal, spRate: spec.spRate || 0, spKind: spec.spKind, turn: 0,
      cannon: spec.cannon, belt: spec.belt, keyRate: spec.keyRate || 0, chamRate: spec.chamRate || 0, mystRate: spec.mystRate || 0, plusRate: spec.plusRate || 0,
      frogFull: spec.frogFull || 0, frogBelly: 0, frogColor: spec.frogColor, wall: spec.wall, fallIceRate: spec.fallIceRate || 0, clockRate: spec.time ? 0.03 : 0 };
    S.grid = spec.cells.map((row) => row.map((d) => (d ? Object.assign({ id: uid++ }, d) : null)));
    S.jelly = spec.jelly.map((row) => row.slice());
    return S;
  }
  function clone(S) {
    const T = Object.assign({}, S);
    T.grid = S.grid.map((row) => row.map((t) => (t ? Object.assign({}, t) : null)));
    T.jelly = S.jelly.map((row) => row.slice());
    T.top = S.top;
    return T;
  }
  const nullK = { begin() {}, end() {}, remove() {}, created() {}, fx() {}, hurt() {}, spawn() {}, jelly() {}, shuffle() {}, sound() {}, combo() {}, collect() {}, bombOut() {}, extraMoves() {}, extraTime() {}, frogMove() {} };
  function needCounter(spec) {
    const need = { color: {}, jelly: 0, ice: 0, ing: 0, striped: 0, slock: 0 };
    spec.goals.forEach((gl) => { if (gl.type === 'color') need.color[gl.key] = gl.count; else need[gl.type] = gl.count; });
    return need;
  }
  function* botRunG(spec, seed) {
    const S = buildState(spec, seed);
    const need = needCounter(spec);
    const K = Object.assign({}, nullK, {
      collect(type, key) { if (type === 'color') { if (need.color[key] > 0) need.color[key]--; } else if (need[type] > 0) need[type]--; },
    });
    const done = () => Object.entries(need).every(([k, v]) => (k === 'color' ? Object.values(v).every((x) => x <= 0) : v <= 0));
    let moves = 0;
    while (!done() && moves < 60) { // más allá el nivel se descarta igualmente (así se genera rápido en la tablet)
      yield;
      if (S.frogFull && S.frogBelly >= S.frogFull) { const ft = frogTarget(S, need); if (ft && frogJump(S, ft[0], ft[1], K)) continue; }
      const m = botPick(S, need);
      if (!m) { shuffle(S); moves++; continue; }
      act(S, m[0], m[1], K);
      if (S.bombOut) return 999;
      moves++;
    }
    return moves;
  }
  GAME.botPick = (S, need) => botPick(S, need);
  GAME.frogTarget = (S, need) => frogTarget(S, need);
  GAME.findFrog = (S) => findFrog(S);
  function botPick(S, need) {
    let swaps = validSwaps(S);
    if (!swaps.length) return null;
    if (swaps.length > 8) swaps = S.rand.shuffle(swaps).slice(0, 8);
    let best = null, bestScore = -1;
    for (const sw of swaps) {
      const T = clone(S);
      T.rand = E.rng((S.rand() * 1e9) | 0);
      let score = 0;
      const nd = JSON.parse(JSON.stringify(need));
      const K = Object.assign({}, nullK, {
        collect(type, key) {
          if (type === 'color') { if (nd.color[key] > 0) { nd.color[key]--; score += 1; } }
          else if (nd[type] > 0) { nd[type]--; score += type === 'ing' ? 12 : 2.5; }
          score += 0.05;
        },
      });
      act(T, sw[0], sw[1], K);
      if (need.ing > 0) {
        for (let r = 0; r < T.R; r++) for (let c = 0; c < T.C; c++) { const t = T.grid[r][c]; if (t && t.kind === 'ing') score += r * 0.6; }
      }
      if (score > bestScore) { bestScore = score; best = sw; }
    }
    return best;
  }

  // ------------------------------------------------------------ generador
  const cache = new Map();
  // generador por pasos: el motor lo avanza poco a poco en segundo plano (ver E.prefetch)
  function* levelG(n) {
    if (cache.has(n)) return cache.get(n);
    let spec = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      spec = yield* genLevelG(n, attempt);
      if (spec.botMoves <= 40) break;
    }
    // Movimientos como en su tramo de Candy Crush (de 15 a 36, mediana 25) y objetivos a la medida:
    // si el bot va sobrado, los objetivos de cantidad (color, ingredientes, rayados) crecen hasta llenar ese margen
    const r2 = E.rng(n * 92821 + 7);
    const target = n < 6 ? 0 : Math.round(17 + spec.d * 10 + r2() * 7);
    if (target && spec.botMoves * 1.3 < target) {
      const ratio = Math.min(2.5, target / (spec.botMoves * 1.3));
      let grew = false;
      for (const gl of spec.goals) {
        if (gl.type === 'color' || gl.type === 'striped') { gl.count = Math.round(gl.count * ratio); grew = true; }
        if (gl.type === 'ing') { const nc = Math.min(8, Math.round(gl.count * ratio)); spec.ings += nc - gl.count; gl.count = nc; grew = true; }
      }
      if (grew) {
        const runs = [yield* botRunG(spec, n * 17 + 5), yield* botRunG(spec, n * 17 + 6)].sort((x, y) => x - y);
        spec.botMoves = runs[1];
      }
    }
    // si aun así el bot va muy sobrado (p. ej. gelatina, que no se puede ampliar), se recortan movimientos para que siga siendo un reto
    const cap = target ? Math.ceil(spec.botMoves * 1.35) + 2 : 99;
    spec.moves = E.clamp(Math.max(Math.min(target, cap), Math.ceil(spec.botMoves * 1.15) + 1), n < 5 ? 10 : 15, 50);
    // contrarreloj (Candy Crush, "Timed"): de vez en cuando, tiempo en vez de movimientos; ~7 s por movimiento que da el nivel
    if (n >= 39 && n % 13 === 0 && n % 10 !== 0) {
      spec.time = E.clamp(Math.round((spec.moves * 7) / 10) * 10, 90, 360);
      spec.text = (n === 39 ? '¡Contrarreloj! Cumple los objetivos antes de que se acabe el tiempo. Los caramelos con reloj ⏱️ dan 5 segundos más.' : spec.text);
    }
    cache.set(n, spec);
    return spec;
  }
  GAME.makeLevel = (n) => (cache.has(n) ? cache.get(n) : E.runGen(levelG(n)));
  GAME.levelSteps = (n) => (cache.has(n) ? null : levelG(n));
  function* genLevelG(n, attempt) {
    const rng = E.rng(n * 2246822519 + 31 + attempt * 7777);
    const d = E.difficulty(n) * Math.pow(0.75, attempt);
    const C = n < 4 ? 7 : rng.pick([8, 9, 9]);
    const R = n < 4 ? 7 : rng.pick([8, 9, 9]);
    // en su tramo de Candy Crush: 4 colores en el 75% de los niveles, 5 en el 19%, 3 en el 6%
    const colors = n < 4 ? 4 : rng() < 0.75 ? 4 : d > 0.4 && rng() < 0.5 ? 5 : rng() < 0.25 ? 3 : 5;
    const top = new Array(C).fill(0);
    const shape = n < 6 ? 0 : rng.int(6);
    for (let c = 0; c < C; c++) {
      const m = Math.min(c, C - 1 - c);
      if (shape === 1) top[c] = m === 0 ? 2 : m === 1 ? 1 : 0;
      else if (shape === 2) top[c] = m === 0 ? 1 : 0;
      else if (shape === 3) top[c] = Math.floor(C / 2) === c || (C % 2 === 0 && C / 2 - 1 === c) ? 2 : 0;
      else if (shape === 4) top[c] = m === 0 ? 3 : m === 1 ? 1 : 0;
      else if (shape === 5) top[c] = m % 3 === 1 ? 1 : 0;
    }
    const cells = [], jelly = [];
    for (let r = 0; r < R; r++) { cells.push(new Array(C).fill(null)); jelly.push(new Array(C).fill(0)); }
    // huecos en mitad del tablero (el 60% de los niveles de Candy Crush los tiene). Debajo de cada hueco:
    // generador propio en ~2/3 de los casos; si no, se rellena deslizando en diagonal
    const hole = cells.map((row) => row.map(() => 0)), spawn = cells.map((row) => row.map(() => 0)), portal = cells.map((row) => row.map(() => 0));
    if (n >= 6 && rng() < 0.9) { // huecos en el 98% de los niveles de su tramo
      const mid = Math.floor(R / 2), cm = Math.floor((C - 1) / 2), pat = rng.int(3);
      const mk = (r, c) => { if (r > top[c] && r < R - 1) hole[r][c] = 1; };
      if (pat === 0) { mk(mid - 1, cm); mk(mid, cm); if (C % 2 === 0) { mk(mid - 1, cm + 1); mk(mid, cm + 1); } }
      else if (pat === 1) { mk(mid, 1); mk(mid, C - 2); mk(mid - 1, 1); mk(mid - 1, C - 2); }
      else { for (let c = 0; c < C; c++) if (c % 3 === 1) mk(mid, c); }
      // debajo de cada hueco: generador (49%), portal (24%) o nada y se rellena en diagonal (27%)
      for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if (hole[r][c] && !hole[r + 1][c]) { const q = rng(); if (q < 0.49) spawn[r + 1][c] = 1; else if (q < 0.73) portal[r + 1][c] = 1; }
    }
    const okc = (r, c) => r >= top[c] && !hole[r][c];

    const types = ['color'];
    if (n >= 3) types.push('jelly');
    if (n >= 6) types.push('ice');
    if (n >= 9) types.push('ing');
    if (n >= 14) types.push('striped');
    const intro = { 3: 'jelly', 6: 'ice', 9: 'ing', 14: 'striped' }[n];
    let ng = n < 6 ? 1 : rng.pick([1, 2, 2, 3]);
    ng = Math.min(ng, types.length);
    const chosen = intro ? [intro] : [];
    for (const t of rng.shuffle(types.slice())) { if (chosen.length >= ng) break; if (!chosen.includes(t)) chosen.push(t); }
    if (chosen.includes('striped') && chosen.length > 2 && intro !== 'striped') chosen.splice(chosen.indexOf('striped'), 1);

    const goals = [];
    let ings = 0, text = '';
    for (const t of chosen) {
      if (t === 'ice') {
        // glaseado de 1 a 5 capas
        const hp = d < 0.3 ? 1 : rng.pick(d < 0.5 ? [1, 2] : d < 0.7 ? [1, 2, 3] : [2, 3, 4, 5]);
        const pat = rng.int(3);
        const r0 = Math.floor(R / 2) - 1 + rng.int(2);
        let count = 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          if (!okc(r, c)) continue;
          const m = Math.min(c, C - 1 - c);
          let on = false;
          if (pat === 0) on = (r === r0 || r === r0 + 1) && m % 3 !== 1;
          else if (pat === 1) on = r >= R - 2 && m % 2 === 0;
          else on = r >= r0 && r <= r0 + 2 && m >= 1 && m <= 2;
          if (on) { cells[r][c] = { kind: 'ice', hp }; count++; }
        }
        if (count) goals.push({ type: 'ice', count });
        if (n === 6) text = 'Rompe el glaseado haciendo líneas a su lado';
      }
    }
    for (const t of chosen) {
      if (t === 'jelly') {
        const pat = n >= 8 && rng() < 0.45 ? 0 : rng.int(4), lv = n >= 10 && rng() < 0.6 ? 2 : 1;
        let count = 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          if (!okc(r, c) || cells[r][c]) continue;
          const m = Math.min(c, C - 1 - c), cr = Math.abs(r - (R - 1) / 2), cc = Math.abs(c - (C - 1) / 2);
          let on = pat === 0 || (pat === 1 && cr + cc <= 3.5) || (pat === 2 && r >= R - 3) || (pat === 3 && (m <= 1 || r >= R - 2));
          if (n < 8 && pat === 0) on = r >= R - 4;
          if (on) { jelly[r][c] = lv; count++; }
        }
        goals.push({ type: 'jelly', count });
        if (n === 3) text = 'Haz líneas encima de la gelatina para quitarla';
      } else if (t === 'ing') {
        ings = 3 + Math.round(d * 2);
        const init = Math.min(ings, 2);
        for (let i = 0; i < init; i++) { const c = Math.floor(((i + 1) * C) / (init + 1)); cells[top[c]][c] = { kind: 'ing', ing: i % 2 }; }
        goals.push({ type: 'ing', count: ings });
        if (n === 9) text = 'Baja las cerezas y avellanas hasta abajo del todo';
      } else if (t === 'color') {
        const k = chosen.length > 1 ? 0.7 : 1;
        const ncol = n > 15 && rng() < 0.35 ? 2 : 1;
        rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, ncol).forEach((col) => goals.push({ type: 'color', key: col, count: Math.round(((30 + d * 50) * k * (0.85 + rng() * 0.3)) / ncol) }));
      } else if (t === 'striped') {
        goals.push({ type: 'striped', count: 3 + Math.round(d * 3) });
        if (n === 14) text = 'Haz caramelos rayados juntando 4 iguales';
      }
    }
    // chocolate (se extiende si no lo rompes) desde el 20 y regaliz desde el 26
    if (n === 20 || (n > 20 && rng() < 0.25)) {
      const want = 2 + Math.round(d * 3);
      let placed = 0;
      for (let i = 0; i < 80 && placed < want; i++) {
        const r = rng.range(Math.floor(R / 2), R - 1), c = rng.int(C);
        if (okc(r, c) && !cells[r][c]) { cells[r][c] = { kind: 'ice', choc: true, hp: n >= 40 && rng() < 0.4 ? 2 : 1 }; placed++; } // chocolate negro: 2 capas
      }
      if (n === 20) text = 'Rompe el chocolate o se irá extendiendo';
    }
    let licRate = 0;
    if (n === 26 || (n > 26 && rng() < 0.22)) {
      licRate = 0.03;
      for (let i = 0; i < 4; i++) { const r = rng.range(1, R - 2), c = rng.int(C); if (okc(r, c) && !cells[r][c]) cells[r][c] = { kind: 'lic' }; }
      if (n === 26) text = 'El regaliz se rompe haciendo líneas a su lado';
    }
    if (n === 5) text = 'Con 4 en cuadrado ganas un pez que va a por lo que falta';
    if (n === 1) text = 'Desliza un caramelo para hacer una fila de 3 iguales';
    if (n === 2) text = 'Con 4 en fila ganas un caramelo rayado. ¡Con 5, una bomba de color!';
    // rellenar sin líneas hechas
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!okc(r, c) || cells[r][c]) continue;
      let col, tries = 0;
      do {
        col = rng.int(colors); tries++;
      } while (tries < 20 && ((c >= 2 && cells[r][c - 1] && cells[r][c - 2] && cells[r][c - 1].color === col && cells[r][c - 2].color === col) || (r >= 2 && cells[r - 1][c] && cells[r - 2][c] && cells[r - 1][c].color === col && cells[r - 2][c].color === col)));
      cells[r][c] = { kind: 'candy', color: col, sp: null };
    }
    // candados de regaliz sobre caramelos (desde el 16)
    if (n === 16 || (n > 16 && rng() < 0.5)) {
      const want = 3 + Math.round(d * 6);
      let placed = 0;
      for (let i = 0; i < 100 && placed < want; i++) {
        const r = rng.range(2, R - 2), c = rng.int(C);
        const t = cells[r][c];
        if (t && t.kind === 'candy' && !t.lock) { t.lock = true; placed++; const mc = C - 1 - c; const u = cells[r][mc]; if (placed < want && u && u.kind === 'candy' && !u.lock) { u.lock = true; placed++; } }
      }
      if (n === 16) text = 'Los caramelos con regaliz no se mueven: haz línea con ellos para soltarlos';
    }
    // bombas de cuenta atrás (desde el 40): caramelos con un número que baja en cada jugada
    if (n === 40 || (n > 40 && rng() < 0.3)) {
      const nb = 1 + (d > 0.5 ? 1 : 0);
      for (let i = 0, k = 0; i < 60 && k < nb; i++) {
        const r = rng.range(1, R - 3), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.lock && !t.timer) { t.timer = 15 + rng.int(6); k++; }
      }
      if (n === 40) text = 'Quita la bomba antes de que llegue a 0 o perderás el nivel';
    }
    // batidora mágica (45), palomitas (50) y calavera ácida (55)
    for (const [kind, from, prob, hp] of [['mixer', 45, 0.12, 3], ['popcorn', 50, 0.15, 3], ['skull', 55, 0.12, 1]]) {
      if (n === from || (n > from && rng() < prob)) {
        const want = kind === 'mixer' ? 1 + (d > 0.5 ? 1 : 0) : 2 + Math.round(d * 2);
        let placed = 0;
        for (let i = 0; i < 80 && placed < want; i++) {
          const r = rng.range(2, R - 2), c = rng.int(C), t = cells[r][c];
          if (t && t.kind === 'candy' && !t.lock && !t.timer && okc(r, c)) { cells[r][c] = { kind, hp }; placed++; }
        }
        if (placed && kind !== 'popcorn') goals.push({ type: kind, count: placed });
        const tx = { 45: 'La batidora mágica llena el tablero de glaseado: rómpela haciendo líneas a su lado', 50: 'Usa caramelos especiales para reventar las palomitas', 55: 'Rompe la calavera ácida combinando caramelos a su lado' };
        if (n === from) text = tx[n];
      }
    }
    const freeCandy = (r0, r1) => {
      for (let i = 0; i < 80; i++) {
        const r = rng.range(r0, r1), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.lock && !t.timer && !t.frog && !t.cham && !t.myst && !t.key && okc(r, c)) return t;
      }
      return null;
    };
    // cañones (58): casillas de arriba que sueltan siempre lo mismo
    let cannon = null;
    if (n === 58 || (n > 58 && rng() < 0.25)) {
      cannon = new Array(C).fill(null);
      const kinds = ings ? ['ing'] : n === 58 ? ['fish'] : ['lic', 'fish', 'stripe', 'lic'].concat(n > 70 ? ['timer'] : []);
      const kd = rng.pick(kinds), nc = 1 + (C > 8 && rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < nc; i++) cannon[i === 0 ? 1 + rng.int(2) : C - 2 - rng.int(2)] = kd;
      if (n === 58) text = 'Los cañones de arriba sueltan regalos de vez en cuando';
    }
    // cintas transportadoras (62): cada jugada mueven su fila una casilla
    let belt = null;
    if (n === 62 || (n > 62 && rng() < 0.18)) {
      const r0 = Math.floor(R / 2) - 1 + rng.int(2);
      belt = [{ r: r0, dir: 1 }];
      if (n > 62 && rng() < 0.5 && r0 + 2 < R - 1) belt.push({ r: r0 + 2, dir: -1 });
      if (n === 62) text = 'La cinta transportadora mueve su fila en cada jugada';
    }
    // caramelos camaleón (66): cambian de color en cada jugada
    let chamRate = 0;
    if (n === 66 || (n > 66 && rng() < 0.2)) {
      chamRate = 0.04;
      for (let i = 0; i < 4; i++) { const t = freeCandy(1, R - 1); if (t) t.cham = (t.color + 1 + rng.int(colors - 1)) % colors; }
      if (n === 66) text = 'El caramelo camaleón cambia al color de su aro en cada jugada';
    }
    // caramelo misterioso (70): puede traer algo bueno... o malo
    let mystRate = 0;
    if (n === 70 || (n > 70 && rng() < 0.2)) {
      mystRate = 0.025;
      for (let i = 0; i < 3; i++) { const t = freeCandy(1, R - 1); if (t) t.myst = true; }
      if (n === 70) text = 'El caramelo misterioso puede traer una sorpresa buena... o mala';
    }
    // rana (74): se come los caramelos de su color; llena, tócala y elige dónde salta
    let frogFull = 0, frogColor = 0;
    if (n === 74 || (n > 74 && rng() < 0.15)) {
      const t = freeCandy(2, R - 2);
      if (t) { t.frog = true; frogFull = 15 + Math.round(d * 8); frogColor = t.color; }
      if (n === 74) text = 'La rana se come los caramelos de su color. Cuando esté llena, tócala y elige dónde salta';
    }
    // candados de azúcar (78): solo los abren las llaves de azúcar; cada llave quita una capa a todos
    let keyRate = 0;
    if (n === 78 || (n > 78 && rng() < 0.18)) {
      const want = 2 + Math.round(d * 2), hp = n === 78 ? 1 : rng.pick(d < 0.5 ? [1, 2] : [2, 3]);
      let placed = 0;
      for (let i = 0; i < 80 && placed < want; i++) {
        const r = rng.range(1, R - 2), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.lock && !t.timer && !t.frog && okc(r, c)) { cells[r][c] = { kind: 'slock', hp }; placed++; }
      }
      if (placed) {
        keyRate = 0.05;
        const k = freeCandy(0, R - 1); if (k) k.key = true;
        goals.push({ type: 'slock', count: placed });
      }
      if (n === 78) text = 'Combina las llaves de azúcar para abrir los candados';
    }
    // caramelo +5 movimientos (82)
    let plusRate = 0;
    if (n === 82 || (n > 82 && rng() < 0.12)) { plusRate = 0.002; const t = freeCandy(1, R - 1); if (t) t.plus5 = true; if (n === 82) text = 'Combina el caramelo +5 para ganar movimientos'; }
    // vallas de regaliz (86): pared fija entre dos columnas
    let wall = null;
    if (n === 86 || (n > 86 && rng() < 0.15)) {
      wall = cells.map((row) => row.map(() => 0));
      const cb = Math.floor(C / 2) - 1 + rng.int(2), r0 = rng.range(2, R - 5);
      for (let r = r0; r < r0 + 4; r++) if (okc(r, cb) && okc(r, cb + 1)) wall[r][cb] = 1;
      if (n === 86) text = 'Las vallas de regaliz no dejan pasar: no se puede intercambiar a través de ellas';
    }
    // tofellinos (92): bloques de glaseado con capas que caen si combinas debajo
    if (n === 92 || (n > 92 && rng() < 0.15)) {
      const want = 4 + Math.round(d * 4), hp = n === 92 ? 2 : rng.pick([1, 2, 3]);
      let placed = 0;
      for (let i = 0; i < 80 && placed < want; i++) {
        const r = rng.range(0, Math.floor(R / 2)), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.lock && !t.timer && !t.frog && okc(r, c)) { cells[r][c] = { kind: 'ice', hp, fall: true, waffle: true }; placed++; }
      }
      if (placed) { const gi = goals.find((gl) => gl.type === 'ice'); if (gi) gi.count += placed; else goals.push({ type: 'ice', count: placed }); }
      if (n === 92) text = 'Combina caramelos junto a los tofellinos para quitarles capas. ¡Si combinas debajo, se caerán!';
    }
    // glaseado que cae (96): cae desde arriba con los caramelos nuevos
    let fallIceRate = 0;
    if (n === 96 || (n > 96 && rng() < 0.12)) { fallIceRate = 0.04; if (n === 96) text = 'Desde arriba cae glaseado: rómpelo haciendo líneas a su lado'; }
    // como mucho 4 objetivos
    while (goals.length > 4) goals.splice(goals.findIndex((g) => g.type === 'color') >= 0 ? goals.findIndex((g) => g.type === 'color') : goals.length - 1, 1);
    // especiales que caen desde arriba durante el nivel (peces, rayados o bombas de color)
    let spRate = 0, spKind = null;
    if (n >= 35 && rng() < 0.3) { spRate = 0.02; spKind = rng.pick(['fish', 'stripe', 'stripe', 'bomb']); }
    const spec = { R, C, top, colors, cells, jelly, goals, ings, text, d, licRate, hole, spawn, portal, spRate, spKind, cannon, belt, chamRate, mystRate, frogFull, frogColor, keyRate, plusRate, wall, fallIceRate };
    const S0 = buildState(spec, 1);
    if (!validSwaps(S0).length) { shuffle(S0); spec.cells = S0.grid.map((row) => row.map((t) => { if (!t) return null; const o = Object.assign({}, t); delete o.id; return o; })); }
    const runs = [yield* botRunG(spec, n * 17 + 1), yield* botRunG(spec, n * 17 + 2)].sort((a, b) => a - b);
    spec.botMoves = Math.round((runs[0] + runs[1]) / 2);
    return spec;
  }

  GAME.dynamicDifficulty = true; // como Candy Crush
  GAME.usesDrag = true;
  // potenciadores de inicio (Candy Crush: rayado, envuelto y bomba de color) y premio de la racha de victorias
  // colección propia del juego (logros y álbum)
  GAME.collection = { type: 'ing', label: 'Ingredientes bajados', icon: '🍒' };
  GAME.startBoosters = [{ id: 'stripe', icon: '〰️', name: 'Rayado' }, { id: 'wrap', icon: '🍬', name: 'Envuelto' }, { id: 'cbomb', icon: '🌈', name: 'Bomba de color' }];
  GAME.streakBonus = [['stripe'], ['stripe', 'wrap'], ['stripe', 'wrap', 'cbomb']];
  GAME.boosters = [
    { id: 'hammer', icon: '🍭', target: true, prompt: 'Toca el caramelo que quieras romper' },
    { id: 'row', icon: '🧹', target: true, prompt: 'Toca una fila para barrerla' },
    { id: 'rainbow', icon: '🌈', target: true, prompt: 'Toca un color para quitarlo todo' },
    { id: 'switch', icon: '🔄', target: true, prompt: 'Interruptor libre: toca un caramelo y luego el de al lado' },
    { id: 'shuffle', icon: '🎲', target: false },
  ];

  // ------------------------------------------------------------ partida
  GAME.newPlay = function (spec) {
    const S = buildState(spec, E.playSeed != null ? E.playSeed : (Math.random() * 1e9) | 0);
    const P = { S, busy: false };
    let ts = 60, bx = 0, by = 0;
    const vis = new Set();
    const vj = S.jelly.map((row) => row.slice());
    const dying = [];
    const fxs = [];
    const queue = [];
    let cur = null; // fase en reproducción
    let phaseT = 0;
    let sel = null, drag = null;
    let hint = null;
    let swapAnim = null;

    const cx = (c) => bx + c * ts + ts / 2;
    const cy = (r) => by + r * ts + ts / 2;

    // receptor que construye las fases de animación
    let building = null;
    const K = {
      inPhase: false,
      begin() { building = { removes: [], fx: [], created: [], hurts: [], jelly: [], spawns: new Map(), dur: 0.25, collects: [] }; },
      end(SS) {
        building.snap = [];
        for (let r = 0; r < SS.R; r++) for (let c = 0; c < SS.C; c++) { const t = SS.grid[r][c]; if (t) building.snap.push([t, r, c]); }
        queue.push(building); building = null;
      },
      remove(t, r, c, delay, mode, to) { building.removes.push({ t, r, c, delay, mode, to }); building.dur = Math.max(building.dur, delay + 0.25); },
      created(t, r, c, delay) { building.created.push({ t, r, c, delay }); building.dur = Math.max(building.dur, delay + 0.2); },
      fx(f) { building.fx.push(f); building.dur = Math.max(building.dur, f.delay + 0.35); },
      hurt(t, delay, hp) { building.hurts.push({ t, delay, hp }); },
      jelly(r, c, v, delay) { building.jelly.push({ r, c, v, delay }); },
      spawn(t, c, k, row) { building.spawns.set(t, { k, row: row || 0 }); },
      collect(type, key, r, c, delay) { building.collects.push({ type, key, r, c, delay }); },
      sound(size, loop) { building.sound = { size, loop }; },
      combo(loop) { building.loop = loop; },
      shuffle(SS) { K.begin(); building.shuffle = true; K.end(SS); },
      extraTime(sec, r, c, delay) { E.after(delay + 0.1, () => E.addTime(sec, cx(c), cy(r) - 20)); },
      extraMoves(n, r, c, delay) { E.after(delay + 0.1, () => { P.moves += n; E.floatText(cx(c), cy(r) - 20, '+' + n + ' movimientos', '#2bb24c', 38); E.sfx('special'); }); },
      frogMove(t, r, c) { building.frog = { t, r, c }; building.dur = Math.max(building.dur, 0.45); },
      bombOut(r, c) { E.after(0.1, () => { E.floatText(cx(c), cy(r) - 30, '¡BUM!', '#ff5050', 40); E.sfx('bomb'); E.shake(0.5); }); },
    };

    P.layout = function (area) {
      ts = Math.min(area.w / S.C, area.h / S.R, 76);
      bx = area.x + (area.w - ts * S.C) / 2;
      by = area.y + (area.h - ts * S.R) / 2;
      if (!P.placed) {
        P.placed = true;
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
          const t = S.grid[r][c];
          if (!t) continue;
          t.tr = r; t.tc = c; t.x = cx(c); t.y = cy(r) - (S.R + 1) * ts; t.vy = 0; t.wait = 0.25 + (S.R - r) * 0.03 + c * 0.015;
          if (t.kind === 'ice' || t.kind === 'mixer' || t.kind === 'popcorn' || t.kind === 'skull' || t.kind === 'slock') { t.y = cy(r); t.wait = 0; }
          vis.add(t);
        }
      } else for (const t of vis) { t.x = cx(t.tc); t.y = cy(t.tr); }
    };

    function cellAt(x, y) {
      const c = Math.floor((x - bx) / ts), r = Math.floor((y - by) / ts);
      return inB(S, r, c) ? [r, c] : null;
    }
    function trySwap(a, b) {
      sel = null;
      const ta = S.grid[a[0]][a[1]], tb = S.grid[b[0]][b[1]];
      if (!swappable(ta) || !swappable(tb)) return;
      hint = null;
      const ok = act(S, a, b, K);
      E.sfx('swap');
      const ax = ta.x, ay = ta.y, bx2 = tb.x, by2 = tb.y;
      swapAnim = { t: 0 };
      E.tween(ta, { x: bx2, y: by2 }, 0.17, { ease: E.ease.inOut });
      E.tween(tb, { x: ax, y: ay }, 0.17, {
        ease: E.ease.inOut,
        done: () => {
          if (ok) { swapAnim = null; P.moves--; if (S.bombOut) { P.dead = true; P.deadMsg = '¡La bomba ha explotado!'; } return; }
          E.sfx('bad');
          E.tween(ta, { x: ax, y: ay }, 0.17, { ease: E.ease.inOut });
          E.tween(tb, { x: bx2, y: by2 }, 0.17, { ease: E.ease.inOut, done: () => { swapAnim = null; } });
        },
      });
      if (ok) { ta.tr = b[0]; ta.tc = b[1]; tb.tr = a[0]; tb.tc = a[1]; }
    }
    P.down = function (x, y) {
      if (P.busy || P.finaleOn) return;
      const rc = cellAt(x, y);
      if (!rc) { if (sel) { sel.t.sel = false; sel = null; } return; }
      if (frogAim) {
        // segundo toque: la rana salta aquí (no gasta movimiento)
        frogAim = false;
        hint = null;
        if (frogJump(S, rc[0], rc[1], K)) E.sfx('rocket');
        return;
      }
      if (switchFrom) {
        // segundo toque del interruptor libre: intercambia sin gastar movimiento aunque no haya línea
        const [ar, ac] = switchFrom, ta = S.grid[ar][ac], tb = S.grid[rc[0]][rc[1]];
        switchFrom = null; if (ta) ta.sel = false;
        if (ta && swappable(tb) && Math.abs(ar - rc[0]) + Math.abs(ac - rc[1]) === 1 && !wallBetween(S, [ar, ac], rc)) {
          S.grid[ar][ac] = tb; S.grid[rc[0]][rc[1]] = ta;
          ta.tr = rc[0]; ta.tc = rc[1]; tb.tr = ar; tb.tc = ac;
          E.tween(ta, { x: cx(rc[1]), y: cy(rc[0]) }, 0.2); E.tween(tb, { x: cx(ac), y: cy(ar) }, 0.2);
          E.sfx('swap');
          E.after(0.22, () => { K.begin(); K.inPhase = true; resolve(S, K, [[ar, ac], rc]); });
        }
        return;
      }
      const bst = E.activeBooster();
      if (bst) { E.takeBooster(); useBooster(bst, rc[0], rc[1]); return; }
      const t = S.grid[rc[0]][rc[1]];
      if (!swappable(t)) return;
      if (sel) {
        const [sr, sc] = sel.rc;
        sel.t.sel = false;
        if (Math.abs(sr - rc[0]) + Math.abs(sc - rc[1]) === 1) { const a = sel.rc; sel = null; trySwap(a, rc); return; }
        sel = null;
      }
      drag = { rc, x, y };
      sel = { rc, t }; t.sel = true;
    };
    P.move = function (x, y) {
      if (!drag || P.busy) return;
      const dx = x - drag.x, dy = y - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > ts * E.dragK()) { // cuánto hay que deslizar (Ajustes)
        const [r, c] = drag.rc;
        const b = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
        drag = null;
        if (sel) { sel.t.sel = false; sel = null; }
        if (inB(S, b[0], b[1])) trySwap([r, c], b);
      }
    };
    P.up = function () {
      // un toque (sin arrastrar) sobre un caramelo especial lo activa al momento
      if (drag && !P.busy && !P.finaleOn) {
        const [r, c] = drag.rc, t = S.grid[r][c];
        if (t && t.frog && S.frogBelly >= S.frogFull && sel && sel.t === t) {
          t.sel = false; sel = null; frogAim = true;
          E.floatText(E.W / 2, by + (S.R * ts) / 2, 'Toca dónde quieres que salte la rana', '#fff', 34);
          E.sfx('magic');
        } else if (t && (t.kind === 'bomb' || t.sp) && sel && sel.t === t && !drag.reselect) {
          t.sel = false; sel = null; hint = null;
          if (actTap(S, r, c, K)) { P.moves--; if (S.bombOut) { P.dead = true; P.deadMsg = '¡La bomba ha explotado!'; } E.sfx('swap'); }
        }
      }
      drag = null;
    };

    let switchFrom = null, frogAim = false;
    function useBooster(id, r, c) {
      if (id === 'switch') { const t = S.grid[r][c]; if (swappable(t)) { switchFrom = [r, c]; t.sel = true; } return; }
      K.begin();
      if (id === 'hammer') {
        const t = S.grid[r][c];
        if (!t || t.kind === 'ing') { building = null; return; }
        if (t.kind === 'ice') t.hp = 1;
        hit(S, r, c, 0, K);
        if (t.choc) S.chocHit = true;
        E.sfx('bomb'); E.shake(0.2);
      } else if (id === 'row') {
        K.fx({ type: 'line', dir: 'h', r, c, delay: 0 });
        for (let cc = 0; cc < S.C; cc++) hit(S, r, cc, Math.abs(cc - c) * 0.035, K);
      } else if (id === 'rainbow') {
        const t = S.grid[r][c];
        if (!matchable(t)) { building = null; return; }
        clearColor(S, t.color, r, c, 0, K);
        E.sfx('magic');
      }
      fill(S, K);
      K.end(S);
      resolve(S, K, null);
    }
    P.booster = function (id) {
      if (id === 'shuffle') { shuffle(S); K.shuffle(S); E.sfx('magic'); }
    };
    // "¿Qué es esto?": explicación de la pieza tocada
    P.describe = function (x, y) {
      const rc = cellAt(x, y);
      if (!rc) return null;
      const [r, c] = rc, t = S.grid[r][c];
      if (t && t.frog) return 'Rana: se come los caramelos de su color. Llena, tócala y elige dónde salta';
      if (t && t.lock) return 'Regaliz: el caramelo no se mueve hasta que hagas línea con él';
      if (t && t.timer) return 'Bomba: quítala antes de que llegue a 0 o perderás';
      if (t && t.cham != null) return 'Caramelo camaleón: cambia al color de su aro en cada jugada';
      if (t && t.myst) return 'Caramelo misterioso: puede traer algo bueno... o malo';
      if (t && t.key) return 'Llave de azúcar: combínala para abrir los candados de azúcar';
      if (t && t.plus5) return 'Combínalo y ganarás 5 movimientos';
      if (t && t.clock) return 'Caramelo de reloj: combínalo y tendrás 5 segundos más';
      if (t && t.kind === 'candy' && t.sp) return t.sp === 'w' ? 'Envuelto: explota dos veces a su alrededor' : t.sp === 'f' ? 'Pez: va a por lo que te falta' : 'Rayado: limpia su fila o su columna';
      const K2 = { bomb: 'Bomba de color: quita todos los caramelos de un color', lic: 'Regaliz: se rompe haciendo líneas a su lado', ing: 'Ingrediente: bájalo hasta abajo del todo',
        mixer: 'Batidora mágica: llena el tablero de glaseado; rómpela haciendo líneas a su lado', popcorn: 'Palomitas: revientan con caramelos especiales', skull: 'Calavera ácida: rómpela combinando a su lado',
        slock: 'Candado de azúcar: lo abren las llaves de azúcar' };
      if (t && t.kind === 'ice') return t.choc ? 'Chocolate: rómpelo o se irá extendiendo' : t.waffle ? 'Tofellino: combina a su lado para quitarle capas; si combinas debajo, se cae' : 'Glaseado: rómpelo haciendo líneas a su lado';
      if (t && K2[t.kind]) return K2[t.kind];
      if (S.wall && (S.wall[r][c] || (c > 0 && S.wall[r][c - 1]))) return 'Valla de regaliz: no se puede intercambiar a través de ella';
      if (S.belt && S.belt.some((b) => b.r === r)) return 'Cinta transportadora: mueve su fila en cada jugada';
      if (S.jelly[r][c] > 0) return 'Gelatina: haz líneas encima para quitarla';
      return t && t.kind === 'candy' ? 'Desliza un caramelo para hacer una fila de 3 iguales' : null;
    };
    // potenciadores de inicio: caramelos especiales al azar antes de empezar
    P.startBonus = function (list, rnd) {
      for (const id of list) {
        const opts = [];
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (t && t.kind === 'candy' && !t.sp && !t.lock && !t.timer && !t.frog) opts.push([r, c]); }
        if (!opts.length) return;
        const [r, c] = opts[rnd.int(opts.length)];
        if (id === 'cbomb') S.grid[r][c] = { id: uid++, kind: 'bomb' };
        else S.grid[r][c].sp = id === 'wrap' ? 'w' : rnd() < 0.5 ? 'h' : 'v';
      }
    };
    P.hint = function () {
      const sw = validSwaps(S);
      if (!sw.length) return;
      // preferir la que hace algo especial
      hint = { a: S.grid[sw[0][0][0]][sw[0][0][1]], b: S.grid[sw[0][1][0]][sw[0][1][1]], t: 0, dir: [sw[0][1][0] - sw[0][0][0], sw[0][1][1] - sw[0][0][1]] };
    };

    function startPhase(ph) {
      cur = ph; phaseT = 0;
      if (ph.shuffle) {
        E.floatText(E.W / 2, by + (S.R * ts) / 2, '¡Mezclando!', '#fff', 44);
        for (const [t, r, c] of ph.snap) { t.tr = r; t.tc = c; E.tween(t, { x: cx(c), y: cy(r) }, 0.5, { ease: E.ease.inOut }); }
        ph.dur = 0.55; ph.started = true;
        return;
      }
      if (ph.sound) E.sfx('pop', 1 + Math.min(ph.loop || 0, 5) * 0.12);
      if (ph.loop >= 2) {
        const words = ['', '', '¡Dulce!', '¡Delicioso!', '¡Divino!', '¡Sabroso!'];
        E.floatText(E.W / 2, by + (S.R * ts) / 2, words[Math.min(ph.loop, 5)], '#ff5fb0', 50);
      }
      for (const f of ph.fx) f.age = -f.delay;
      for (const f of ph.fx) fxs.push(f);
      for (const rm of ph.removes) { rm.age = -rm.delay; dying.push(rm); }
      for (const h of ph.hurts) E.after(h.delay, () => { if (h.hp === 'unlock') { h.t.vlock = false; E.burst(h.t.x, h.t.y, ['#26262e', '#55555f'], 8, { size: 9 }); E.sfx('land', 1.4); } else { h.t.vhp = h.hp; E.burst(h.t.x, h.t.y, ['#fff', '#cfe8ff'], 8, { size: 9 }); } });
      for (const j of ph.jelly) E.after(j.delay, () => { vj[j.r][j.c] = j.v; E.burst(cx(j.c), cy(j.r), ['#ff7ad9', '#fff'], 6, { size: 8 }); });
      for (const cr of ph.created) {
        cr.t.x = cx(cr.c); cr.t.y = cy(cr.r); cr.t.tr = cr.r; cr.t.tc = cr.c; cr.t.sc = 0; cr.t.vy = 0;
        E.after(cr.delay, () => { vis.add(cr.t); E.tween(cr.t, { sc: 1 }, 0.3, { ease: E.ease.outBack }); E.sfx('special'); });
      }
      if (ph.frog) { const f = ph.frog; f.t.sc = 1; f.t.tr = f.r; f.t.tc = f.c; E.tween(f.t, { x: cx(f.c), y: cy(f.r) }, 0.3, { ease: E.ease.inOut }); E.tween(f.t, { sc: 1.5 }, 0.15, { done: () => E.tween(f.t, { sc: 1 }, 0.15) }); }
      for (const co of ph.collects) {
        E.after(co.delay + 0.05, () => { if (E.goal(co.type, co.key, 1, cx(co.c), cy(co.r))) E.sfx('collect', 1 + Math.random() * 0.2); });
      }
    }
    function startFall(ph) {
      ph.falling = true;
      const spawnY = {};
      for (const [t, r, c] of ph.snap) {
        // cinta transportadora: la pieza que da la vuelta entra por el otro lado
        if (vis.has(t) && t.tr === r && t.tc != null && Math.abs(t.tc - c) > 1) t.x = cx(c) + (c < t.tc ? -ts : ts);
        t.tr = r; t.tc = c;
        if (!vis.has(t) && !ph.created.some((cr) => cr.t === t)) {
          const sp = ph.spawns.get(t) || { k: 0, row: S.top[c] };
          t.x = cx(c); t.y = by + Math.max(S.top[c], sp.row) * ts - ts / 2 - sp.k * ts; t.vy = 0; t.sc = 1; t.wait = 0;
          vis.add(t);
        }
      }
    }

    P.update = function (dt) {
      // reproducir fases
      if (!swapAnim) {
        if (!cur && queue.length) startPhase(queue.shift());
        if (cur) {
          phaseT += dt;
          if (!cur.falling && phaseT >= cur.dur) {
            if (cur.shuffle) cur = null;
            else startFall(cur);
          }
        }
      }
      let moving = false;
      for (const t of vis) {
        if (t.tr == null) continue;
        if (t.wait > 0) { t.wait -= dt; moving = true; continue; }
        if (!cur || !cur.falling) { if (t.y < cy(t.tr) - 1 && !swapAnim && P.placed && !cur) { /* caída inicial */ } else continue; }
        const tx = cx(t.tc), ty = cy(t.tr);
        if (Math.abs(t.x - tx) > 0.5) { t.x += Math.sign(tx - t.x) * Math.min(Math.abs(tx - t.x), 700 * dt); moving = true; }
        if (t.y < ty - 0.5) {
          t.vy = (t.vy || 0) + 3000 * dt;
          t.y += t.vy * dt;
          moving = true;
          if (t.y >= ty) { t.y = ty; t.vy = 0; }
        } else if (t.y > ty + 0.5) { t.y = ty; }
      }
      if (cur && cur.falling && !moving) cur = null;
      for (let i = dying.length - 1; i >= 0; i--) {
        const d = dying[i];
        d.age += dt;
        if (d.age >= 0 && !d.started) {
          d.started = true;
          vis.delete(d.t);
          const t = d.t;
          if (t.x == null) { t.x = cx(d.c); t.y = cy(d.r); }
          d.x = t.x; d.y = t.y;
          if (d.mode === 'merge' && d.to) E.tween(d, { x: cx(d.to[1]), y: cy(d.to[0]) }, 0.15);
          if (t.kind === 'candy') E.burst(d.x, d.y, [COLORS[t.color], '#fff'], 6, { size: 9 });
          else if (t.kind === 'ice' && t.choc) { E.burst(d.x, d.y, ['#8a5530', '#4a2a14', '#c58a5a'], 12, { size: 11 }); E.sfx('land', 1.2); }
          else if (t.kind === 'ice') { E.burst(d.x, d.y, ['#fff', '#cfe8ff', '#9cc9ef'], 12, { size: 11 }); }
          else if (t.kind === 'lic') { E.burst(d.x, d.y, ['#1d1d24', '#55555f'], 10, { size: 10 }); }
          else if (t.kind === 'ing') { E.floatText(d.x, d.y - 20, '¡Bien!', '#ffe14d', 36); E.sfx('rescue'); }
          else if (t.kind === 'bomb') E.sfx('magic');
          if (t.sp === 'w') { E.sfx('bomb'); E.shake(0.25); }
          else if (t.sp) E.sfx('rocket');
        }
        if (d.age > 0.28) dying.splice(i, 1);
      }
      for (let i = fxs.length - 1; i >= 0; i--) { fxs[i].age += dt; if (fxs[i].age > 0.5) fxs.splice(i, 1); }
      if (hint) hint.t += dt;
      P.busy = !!swapAnim || !!cur || queue.length > 0 || moving || dying.length > 0 || !!P.finaleOn;
    };

    P.draw = function (g) {
      // tablero
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c)) { E.rr(g, bx + c * ts - 6, by + r * ts - 6, ts + 12, ts + 12, 14); g.fill(); }
      g.fillStyle = 'rgba(40,30,90,0.72)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c)) g.fillRect(bx + c * ts - 1, by + r * ts - 1, ts + 2, ts + 2);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c) && (r + c) % 2) g.fillRect(bx + c * ts, by + r * ts, ts, ts);
      // generadores bajo los huecos
      if (S.portal) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.portal[r][c]) {
        // portal: anillo de entrada encima del hueco y de salida debajo
        let q = r - 1; while (q >= 0 && S.hole[q][c]) q--;
        for (const [rr, col] of [[q + 1, '#3fa9f5'], [r, '#ff8c1a']]) { g.save(); g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.ellipse(bx + c * ts + ts / 2, by + rr * ts, ts * 0.4, 6, 0, 0, 7); g.stroke(); g.restore(); }
        g.fillStyle = 'rgba(255,255,255,0.07)';
      }
      if (S.spawn) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.spawn[r][c]) { g.fillStyle = 'rgba(255,220,120,0.9)'; E.rr(g, bx + c * ts + ts * 0.2, by + r * ts - 4, ts * 0.6, 8, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,0.07)'; }
      if (S.cannon) for (let c = 0; c < S.C; c++) if (S.cannon[c]) {
        const ic = { lic: '🖤', ing: '🍒', fish: '🐟', stripe: '🍬', timer: '💣' }[S.cannon[c]];
        g.fillStyle = '#5a3d8a'; E.rr(g, bx + c * ts + ts * 0.15, by + S.top[c] * ts - ts * 0.42, ts * 0.7, ts * 0.38, ts * 0.1); g.fill();
        E.emoji(g, ic, cx(c), by + S.top[c] * ts - ts * 0.23, ts * 0.28);
      }
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (vj[r][c] > 0) g.drawImage(jellySprite(vj[r][c], ts), bx + c * ts, by + r * ts, ts, ts);
      if (S.belt) for (const b of S.belt) for (let c = 0; c < S.C; c++) if (inB(S, b.r, c)) {
        // cinta: franjas que avanzan en su sentido
        const x0 = bx + c * ts, y0 = by + b.r * ts;
        g.fillStyle = 'rgba(60,60,80,0.45)'; g.fillRect(x0, y0, ts, ts);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 3; i++) { const ax = x0 + ts * (0.2 + i * 0.3); g.beginPath(); g.moveTo(ax - b.dir * ts * 0.08, y0 + ts * 0.3); g.lineTo(ax + b.dir * ts * 0.08, y0 + ts * 0.5); g.lineTo(ax - b.dir * ts * 0.08, y0 + ts * 0.7); g.fill(); }
      }
      // salida de ingredientes
      if (S.ingLeft > 0 || spec.ings) {
        for (let c = 0; c < S.C; c++) E.emoji(g, '⬇️', cx(c), by + S.R * ts + 14, 18);
      }
      g.save();
      g.beginPath();
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c)) g.rect(bx + c * ts - 1, by + r * ts - 1, ts + 2, ts + 2);
      g.clip();
      for (const t of vis) {
        if (t.x == null) continue;
        if (t.frog) t.fillK = S.frogBelly / S.frogFull;
        let x = t.x, y = t.y;
        if (hint && hint.t > 0 && (t === hint.a || t === hint.b)) {
          const k = Math.sin(hint.t * 8) * ts * 0.08 * (t === hint.a ? 1 : -1);
          x += hint.dir[1] * k; y += hint.dir[0] * k;
        }
        drawTile(g, t, x, y, ts);
      }
      g.restore();
      if (S.wall) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.wall[r][c]) {
        const x0 = bx + (c + 1) * ts, y0 = by + r * ts;
        E.rr(g, x0 - ts * 0.1, y0 - 3, ts * 0.2, ts + 6, ts * 0.08); g.fillStyle = '#2a1a22'; g.fill();
        g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
        g.fillStyle = 'rgba(255,90,150,0.6)'; for (let k = 0; k < 3; k++) g.fillRect(x0 - ts * 0.1, y0 + ts * (0.2 + k * 0.3), ts * 0.2, ts * 0.06);
      }
      if (S.belt) for (const b of S.belt) for (let c = 0; c <= S.C; c++) {
        // flechitas entre las casillas de la cinta, en el sentido en que avanza
        if (!inB(S, b.r, c) && !inB(S, b.r, c - 1)) continue;
        const x0 = bx + c * ts, y0 = cy(b.r), k = ts * 0.1;
        g.fillStyle = '#fff'; g.strokeStyle = '#3a3a55'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x0 - b.dir * k, y0 - k * 1.3); g.lineTo(x0 + b.dir * k, y0); g.lineTo(x0 - b.dir * k, y0 + k * 1.3); g.closePath(); g.fill(); g.stroke();
      }
      for (const d of dying) {
        if (!d.started) continue;
        const k = Math.min(1, d.age / 0.25);
        const t = d.t, o = t.sc;
        if (d.mode === 'ing') { t.alpha = 1 - k; t.sc = 1 + k * 0.5; drawTile(g, t, d.x, d.y - k * 50, ts); }
        else { t.sc = (o == null ? 1 : o) * (d.mode === 'merge' ? 1 - k * 0.6 : 1 + k * 0.25); t.alpha = 1 - k; drawTile(g, t, d.x, d.y, ts); }
        t.sc = o; t.alpha = 1;
      }
      for (const f of fxs) {
        if (f.age < 0) continue;
        const k = Math.min(1, f.age / 0.45);
        const x0 = cx(f.c), y0 = cy(f.r);
        g.save();
        g.globalAlpha = 1 - k;
        if (f.type === 'line') {
          g.fillStyle = '#fff';
          g.shadowColor = '#ffe66b'; g.shadowBlur = 18;
          const len = k * Math.max(S.R, S.C) * ts;
          if (f.dir === 'h') g.fillRect(x0 - len, y0 - ts * 0.12, len * 2, ts * 0.24);
          else g.fillRect(x0 - ts * 0.12, y0 - len, ts * 0.24, len * 2);
        } else if (f.type === 'boom') {
          g.beginPath(); g.arc(x0, y0, ts * (0.5 + k * f.rad), 0, 7);
          g.fillStyle = 'rgba(255,230,140,0.6)'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
        } else if (f.type === 'zap') {
          g.strokeStyle = '#fff'; g.lineWidth = 4; g.shadowColor = COLORS[f.color]; g.shadowBlur = 14;
          const kk = Math.min(1, k * 2.5);
          for (const [rr, cc] of f.targets) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (cx(cc) - x0) * kk, y0 + (cy(rr) - y0) * kk); g.stroke(); }
        }
        g.restore();
      }
    };

    P.finale = function (done) {
      const left = Math.min(P.moves, 15);
      if (left <= 0) { done(); return; }
      P.finaleOn = true;
      E.floatText(E.W / 2, by + ts * 2, '¡Sugar Crush!', '#ffe14d', 50);
      let i = 0;
      const step = () => {
        if (P.busyFinale()) { E.after(0.1, step); return; }
        if (i >= left) { E.after(0.5, () => { P.finaleOn = false; done(); }); return; }
        i++;
        const cand = [];
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (matchable(t) && !t.sp) cand.push([r, c]); }
        if (!cand.length) { i = left; step(); return; }
        const [r, c] = cand[(Math.random() * cand.length) | 0];
        const t = S.grid[r][c];
        K.begin();
        t.sp = Math.random() < 0.5 ? 'h' : 'v';
        hit(S, r, c, 0.1, K);
        fill(S, K);
        K.end(S);
        resolve(S, K, null);
        E.after(0.35, step);
      };
      step();
    };
    P.busyFinale = () => !!cur || queue.length > 0;
    return P;
  };
})();
