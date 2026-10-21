'use strict';
// Rescate Animal: toca grupos de bloques para bajar a los animalitos hasta el suelo.
// Mecánicas calcadas de Pet Rescue Saga (ver analisis/pet_rescue_saga.md):
// columnas que se cierran hacia la IZQUIERDA, cohete recargable (se llena a 200 de carga),
// bloques que caen desde arriba en la mitad de los niveles, bombas en cristal, jaulas y bloques negros.

const GAME = {
  id: 'mascotas',
  title: 'Rescate Animal',
  theme: {
    mascot: '🐶',
    accent: '#ff7a1a',
    node: '#3aa65a',
    bg: ['#9fe0ff', '#c8f0b0'],
    zones: [['#a6e39a', '#6cc06a'], ['#ffe29a', '#f5b85a'], ['#b5e6ff', '#74c0ef'], ['#ffd0e0', '#f59ab8'], ['#d6c8ff', '#a690ea']],
    worlds: ['La Granja', 'El Bosque', 'La Playa', 'La Montaña', 'El Pueblo', 'La Selva', 'La Nieve', 'El Jardín', 'El Río', 'La Pradera'],
    decor: ['🌳', '🌼', '🏡', '🐾', '🌻', '🦴', '🐝', '🍀', '🌲', '🦋'],
    panel: { border: '#2f8a4a', top: '#fbfff4', bottom: '#dff3c8' },
    hudBorder: '#2f8a4a',
    hudTop: '#fbfff4',
    hudBottom: '#e2f5cf',
    hudText: '#2d6b3a',
    bar: 'rgba(40,100,60,0.92)',
    bgDeco(g, w, h) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      [[80, 120], [420, 90], [260, 200]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 30, 0, 7); g.arc(x + 30, y - 10, 36, 0, 7); g.arc(x + 62, y, 28, 0, 7); g.fill(); });
      g.fillStyle = '#7cc46a';
      g.beginPath(); g.moveTo(0, h * 0.75); g.quadraticCurveTo(w * 0.3, h * 0.68, w * 0.6, h * 0.75); g.quadraticCurveTo(w * 0.85, h * 0.8, w, h * 0.72); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    },
  },
};

(function () {
  // rojo corazón · azul huella · verde hueso · amarillo estrella · morado rombo (como en Pet Rescue)
  const COLORS = ['#ee3b3b', '#2f8de4', '#48c234', '#ffc61a', '#a64fe0'];
  const PETS = ['🐶', '🐱', '🐰', '🐷', '🐼', '🐹', '🐸', '🐵', '🐨', '🦊'];
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const CHARGE_FULL = 200; // PRRuleBoosterRecharger: el cohete está listo al llegar a 200
  const chargeFor = (n) => n * n; // carga exacta de Pet Rescue: n² por grupo de n bloques (tope 200)
  let uid = 1;

  // ------------------------------------------------------------ dibujo
  function symbol(g, color, cx, cy, s) {
    g.beginPath();
    if (color === 0) { // corazón
      g.moveTo(cx, cy + s * 0.9);
      g.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.6, cy - s * 1.2, cx, cy - s * 0.45);
      g.bezierCurveTo(cx + s * 0.6, cy - s * 1.2, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9);
      g.fill();
    } else if (color === 1) { // huella
      g.ellipse(cx, cy + s * 0.35, s * 0.55, s * 0.45, 0, 0, 7); g.fill();
      [[-0.65, -0.25], [-0.25, -0.7], [0.25, -0.7], [0.65, -0.25]].forEach(([dx, dy]) => { g.beginPath(); g.arc(cx + dx * s, cy + dy * s, s * 0.22, 0, 7); g.fill(); });
    } else if (color === 2) { // hueso
      g.save(); g.translate(cx, cy); g.rotate(-0.6);
      g.fillRect(-s * 0.7, -s * 0.18, s * 1.4, s * 0.36);
      [[-0.75, -0.22], [-0.75, 0.22], [0.75, -0.22], [0.75, 0.22]].forEach(([dx, dy]) => { g.beginPath(); g.arc(dx * s, dy * s, s * 0.25, 0, 7); g.fill(); });
      g.restore();
    } else if (color === 3) { // estrella
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fill();
    } else { // rombo
      g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.8, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.8, cy); g.closePath(); g.fill();
    }
  }
  function blockSprite(color, ts) {
    return E.sprite('blk' + color, ts, ts, (g, w, h) => {
      const base = COLORS[color];
      const p = w * 0.03;
      E.rr(g, p, p, w - 2 * p, h - 2 * p, w * 0.16);
      g.fillStyle = E.shade(base, -0.3); g.fill();
      E.rr(g, p + w * 0.04, p + w * 0.03, w - 2 * p - w * 0.08, h - 2 * p - w * 0.1, w * 0.14);
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, E.shade(base, 0.35)); gr.addColorStop(1, base);
      g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.ellipse(w * 0.3, h * 0.22, w * 0.15, h * 0.07, -0.6, 0, 7); g.fill();
      g.fillStyle = E.shade(base, -0.28);
      symbol(g, color, w / 2 + w * 0.02, h * 0.5 + w * 0.03, w * 0.24);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      symbol(g, color, w / 2, h * 0.5, w * 0.24);
    });
  }
  // bloques especiales de Pet Rescue: bomba de color (quita su color) y rompelíneas (quita su fila)
  function colorBombSprite(color, ts) {
    return E.sprite('cbomb' + color, ts, ts, (g, w, h) => {
      g.drawImage(blockSprite(color, ts), 0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, 7); g.fill();
      const s = w * 0.5; g.drawImage(E.emojiSprite('💥', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  function lineBlastSprite(color, ts) {
    return E.sprite('lblast' + color, ts, ts, (g, w, h) => {
      g.drawImage(blockSprite(color, ts), 0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.75)'; E.rr(g, w * 0.12, h * 0.36, w * 0.76, h * 0.28, h * 0.1); g.fill();
      const s = w * 0.5; g.drawImage(E.emojiSprite('↔️', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  function rotoSprite(color, dir, ts) {
    return E.sprite('roto' + color + '_' + dir, ts, ts, (g, w, h) => {
      g.drawImage(blockSprite(color, ts), 0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, 7); g.fill();
      g.save(); g.translate(w / 2, h / 2); g.rotate((dir * Math.PI) / 2);
      g.fillStyle = '#d62828'; g.beginPath(); g.moveTo(0, -h * 0.25); g.lineTo(w * 0.15, -h * 0.02); g.lineTo(w * 0.05, -h * 0.02); g.lineTo(w * 0.05, h * 0.2); g.lineTo(-w * 0.05, h * 0.2); g.lineTo(-w * 0.05, -h * 0.02); g.lineTo(-w * 0.15, -h * 0.02); g.closePath(); g.fill();
      g.restore();
    });
  }
  function paintSprite(color, ts) {
    return E.sprite('paint' + color, ts, ts, (g, w, h) => {
      g.drawImage(blockSprite(color, ts), 0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, 7); g.fill();
      const s = w * 0.48; g.drawImage(E.emojiSprite('🪣', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  function freezerSprite(ts) {
    return E.sprite('freezer', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.16); g.fillStyle = '#5d6f82'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = '#2f3b47'; g.stroke();
      g.drawImage(wireSprite(2, ts), 0, 0, w, h);
      const s = w * 0.46; g.drawImage(E.emojiSprite('⚙️', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  function wireSprite(n, ts) {
    return E.sprite('wire' + n, ts, ts, (g, w, h) => {
      g.strokeStyle = 'rgba(70,80,90,0.9)'; g.lineWidth = w * 0.045;
      const step = n >= 2 ? 0.2 : 0.3;
      g.beginPath();
      for (let k = -1; k <= 1.01; k += step) { g.moveTo(w * k, 0); g.lineTo(w * (k + 1), h); g.moveTo(w * (k + 1), 0); g.lineTo(w * k, h); }
      g.stroke();
    });
  }
  function lockSprite(ts) {
    return E.sprite('lock', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.16); g.fillStyle = '#7d8a97'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = '#4b5661'; g.stroke();
      const s = w * 0.6; g.drawImage(E.emojiSprite('🔒', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  function glassDiamSprite(ts) {
    return E.sprite('gdiam', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.22); g.fillStyle = 'rgba(200,235,255,0.75)'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = '#fff'; g.stroke();
      const s = w * 0.6; g.drawImage(E.emojiSprite('💎', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  function glassKeySprite(ts) {
    return E.sprite('gkey', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.22); g.fillStyle = 'rgba(200,235,255,0.75)'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = '#fff'; g.stroke();
      const s = w * 0.6; g.drawImage(E.emojiSprite('🔑', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  function blackSprite(ts) {
    return E.sprite('black', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.16);
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5a5a66'); gr.addColorStop(1, '#22222a');
      g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = w * 0.05;
      g.beginPath(); g.moveTo(w * 0.3, h * 0.3); g.lineTo(w * 0.7, h * 0.7); g.moveTo(w * 0.7, h * 0.3); g.lineTo(w * 0.3, h * 0.7); g.stroke();
    });
  }
  function glassBombSprite(ts) {
    return E.sprite('gbomb', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.22);
      g.fillStyle = 'rgba(200,235,255,0.75)'; g.fill();
      g.lineWidth = w * 0.05; g.strokeStyle = '#ffffff'; g.stroke();
      const s = w * 0.62;
      g.drawImage(E.emojiSprite('💣', s), (w - s) / 2, (h - s) / 2, s, s);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      E.rr(g, w * 0.16, h * 0.13, w * 0.3, h * 0.1, h * 0.05); g.fill();
    });
  }
  // cajas de hielo y de fuego: al romperlas aparece una bomba
  function boxSprite(kind, ts) {
    return E.sprite('box' + kind, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.14);
      const gr = g.createLinearGradient(0, 0, 0, h);
      if (kind === 'fbox') { gr.addColorStop(0, '#ffb347'); gr.addColorStop(1, '#e2401c'); } else { gr.addColorStop(0, '#e6f7ff'); gr.addColorStop(1, '#7cc4ef'); }
      g.fillStyle = gr; g.fill();
      g.lineWidth = w * 0.06; g.strokeStyle = kind === 'fbox' ? '#9a2a0c' : '#3f86b8'; g.stroke();
      const s = w * 0.56; g.drawImage(E.emojiSprite(kind === 'fbox' ? '🔥' : '❄️', s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  // suelo de piedra con hierba (no se mueve)
  function wallSprite(ts) {
    return E.sprite('wallstone', ts, ts, (g, w, h) => {
      g.fillStyle = '#8b8378'; g.fillRect(0, h * 0.12, w, h * 0.88);
      g.fillStyle = '#a39a8c'; for (const [x, y, r2] of [[0.25, 0.45, 0.16], [0.7, 0.55, 0.18], [0.45, 0.8, 0.14]]) { g.beginPath(); g.arc(w * x, h * y, w * r2, 0, 7); g.fill(); }
      g.fillStyle = '#5fae3c'; g.fillRect(0, 0, w, h * 0.2);
      g.fillStyle = '#7ccf52'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w * (i / 6), h * 0.2); g.lineTo(w * (i / 6 + 0.08), h * 0.02); g.lineTo(w * (i / 6 + 0.16), h * 0.2); g.fill(); }
    });
  }
  // flor de enredadera: en cada jugada cubre de enredadera el siguiente bloque hacia donde apunta
  function flowerSprite(dir, ts) {
    return E.sprite('vflower' + dir, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.16); g.fillStyle = '#4f9a3a'; g.fill();
      g.lineWidth = w * 0.05; g.strokeStyle = '#2e6b22'; g.stroke();
      const s = w * 0.55; g.drawImage(E.emojiSprite('🌺', s), (w - s) / 2, (h - s) / 2, s, s);
      g.fillStyle = '#fff'; g.beginPath();
      const [dr, dc] = DIRS[dir], cx = w / 2 + dc * w * 0.36, cy = h / 2 + dr * h * 0.36;
      g.arc(cx, cy, w * 0.08, 0, 7); g.fill();
    });
  }
  function cageSprite(hp, ts) {
    return E.sprite('cage' + hp, ts, ts, (g, w, h) => {
      const base = hp >= 2 ? '#8a5a2e' : '#b7793f';
      g.strokeStyle = base; g.lineWidth = w * 0.09; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const x = w * (0.18 + i * 0.213); g.beginPath(); g.moveTo(x, h * 0.12); g.lineTo(x, h * 0.88); g.stroke(); }
      g.lineWidth = w * 0.11;
      g.beginPath(); g.moveTo(w * 0.08, h * 0.12); g.lineTo(w * 0.92, h * 0.12); g.moveTo(w * 0.08, h * 0.88); g.lineTo(w * 0.92, h * 0.88); g.stroke();
      if (hp >= 2) { g.fillStyle = '#9aa7b3'; [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, w * 0.08, 0, 7); g.fill(); }); }
    });
  }
  function drawTile(g, t, x, y, ts) {
    const s = ts * (t.sc == null ? 1 : t.sc);
    g.save();
    if (t.alpha != null && t.alpha < 1) g.globalAlpha = Math.max(0, t.alpha);
    g.translate(x, y);
    if (t.rot) g.rotate(t.rot);
    if (t.kind === 'pet' || t.kind === 'cage') {
      g.rotate(Math.sin(E.t * 3 + t.id) * 0.06);
      const ps = s * (t.kind === 'cage' ? 0.86 : 1.08);
      g.drawImage(E.emojiSprite(t.pet, ps), -ps / 2, -ps / 2, ps, ps);
      if (t.kind === 'cage' && t.carrier) { const cs = s * 0.5; g.drawImage(E.emojiSprite('🧳', cs), s * 0.5 - cs, s * 0.5 - cs, cs, cs); }
      else if (t.kind === 'cage') g.drawImage(cageSprite(t.vhp != null ? t.vhp : t.hp, ts), -s / 2, -s / 2, s, s);
    } else {
      const spr = t.kind === 'block' ? blockSprite(t.color, ts) : t.kind === 'black' ? blackSprite(ts) : t.kind === 'cbomb' ? colorBombSprite(t.color, ts)
        : t.kind === 'lblast' ? lineBlastSprite(t.color, ts) : t.kind === 'roto' || t.kind === 'dblast' ? rotoSprite(t.color, t.dir, ts) : t.kind === 'gdiam' ? glassDiamSprite(ts) : t.kind === 'paint' ? paintSprite(t.color, ts) : t.kind === 'freezer' ? freezerSprite(ts) : t.kind === 'lock' ? lockSprite(ts) : t.kind === 'gkey' ? glassKeySprite(ts) : t.kind === 'fbox' || t.kind === 'ibox' ? boxSprite(t.kind, ts) : t.kind === 'vflower' ? flowerSprite(t.dir, ts) : t.kind === 'wall' ? wallSprite(ts) : glassBombSprite(ts);
      g.drawImage(spr, -s / 2, -s / 2, s, s);
      if (t.rainbow) { const rs = s * 0.9; g.drawImage(E.emojiSprite('🌈', rs * 0.55), -rs * 0.28, -rs * 0.28, rs * 0.55, rs * 0.55); }
      if (t.mult) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(s * 0.3, -s * 0.3, s * 0.18, 0, 7); g.fill(); E.text(g, 'x' + t.mult, s * 0.3, -s * 0.29, s * 0.2, '#7a3b00', { stroke: false }); }
      if (t.wire && t.vine) { const vs = s * 0.8; g.globalAlpha *= 0.9; g.drawImage(E.emojiSprite('🌿', vs), -vs / 2, -vs / 2, vs, vs); g.globalAlpha = t.alpha != null && t.alpha < 1 ? Math.max(0, t.alpha) : 1; }
      else if (t.wire) { const ws = s; g.drawImage(wireSprite(t.wire, ts), -ws / 2, -ws / 2, ws, ws); }
      if (t.bfly) { const bs = s * 0.5; g.save(); g.rotate(Math.sin(E.t * 5 + t.id) * 0.25); g.drawImage(E.emojiSprite('🦋', bs), -bs / 2, -bs / 2, bs, bs); g.restore(); }
      if (t.det != null) { // detonador: cuenta atrás; a 0 explota
        g.beginPath(); g.arc(-s * 0.26, -s * 0.26, s * 0.2, 0, 7); g.fillStyle = t.det <= 1 ? '#d62828' : '#2b2b33'; g.fill();
        g.lineWidth = s * 0.04; g.strokeStyle = '#fff'; g.stroke();
        E.text(g, String(t.det), -s * 0.26, -s * 0.25, s * 0.24, '#fff', { stroke: false });
      }
      if (t.virus) { const vs = s * 0.42; g.drawImage(E.emojiSprite('🦠', vs), s * 0.5 - vs, -s * 0.5, vs, vs); }
    }
    g.restore();
  }
  GAME.drawGoalIcon = function (g, gl, x, y, s) {
    if (gl.type === 'pet') g.drawImage(E.emojiSprite(gl.icon || '🐶', s), x - s / 2, y - s / 2, s, s);
    else if (gl.type === 'blocks') g.drawImage(E.emojiSprite('🧱', s), x - s / 2, y - s / 2, s, s);
    else g.drawImage(blockSprite(gl.key, s), x - s / 2, y - s / 2, s, s);
  };

  // ------------------------------------------------------------ lógica
  // toda pieza que se va pasa por aquí: cuenta para "despeja los bloques" y para los puntos
  function rem(S, K, o, delay, m) {
    if (o.kind !== 'pet' && o.kind !== 'cage' && !(m && m.mode === 'pet')) { K.collect('blocks', undefined, o, delay || 0); S.score = (S.score || 0) + 60; }
    K.remove(o, delay, m);
  }
  const cell = (S, r, c) => (r >= 0 && c >= 0 && r < S.R && c < S.C ? S.grid[r][c] : undefined);
  function group(S, r, c) {
    const t = cell(S, r, c);
    if (!t || t.kind !== 'block' || t.wire || t.rainbow) return [];
    const seen = new Set([r * 64 + c]);
    const out = [[r, c]];
    for (let i = 0; i < out.length; i++) {
      const [rr, cc] = out[i];
      for (const [dr, dc] of D4) {
        const nr = rr + dr, nc = cc + dc, k = nr * 64 + nc;
        if (seen.has(k)) continue;
        const o = cell(S, nr, nc);
        if (o && o.kind === 'block' && (o.color === t.color || o.rainbow) && !o.wire) { seen.add(k); out.push([nr, nc]); }
      }
    }
    return out;
  }
  // Daño en una casilla (explosiones, cohetes, ayudas). Los animalitos nunca sufren.
  function damage(S, r, c, delay, K) {
    const o = cell(S, r, c);
    if (!o || o.kind === 'pet') return;
    if (o.kind === 'block') { S.grid[r][c] = null; rem(S, K, o, delay); K.collect('color', o.color, o, delay); if (o.virus) S.virusHit = true; if (o.bfly) S.bfq = (S.bfq || 0) + 1; }
    else if (o.kind === 'fbox' || o.kind === 'ibox') openBox(S, r, c, o, delay, K);
    else if (o.kind === 'cbomb' || o.kind === 'lblast' || o.kind === 'roto' || o.kind === 'paint' || o.kind === 'dblast') { S.grid[r][c] = null; fireSpecial(S, r, c, o, delay + 0.1, K); }
    else if (o.kind === 'freezer') { S.grid[r][c] = null; rem(S, K, o, delay); }
    else if (o.kind === 'black' || o.kind === 'vflower') { S.grid[r][c] = null; rem(S, K, o, delay); }
    else if (o.kind === 'cage') hitCage(S, r, c, o, delay, K);
    else if (o.kind === 'gbomb') { S.grid[r][c] = null; explode(S, r, c, delay + 0.12, K, o); }
  }
  // "¡Combina cajas de hielo y de fuego para revelar las bombas que se ocultan dentro!" (prsm_tutorial_tooltip_description1_fire_ice):
  // en los niveles el hielo empieza arriba y el fuego abajo; al quedar juntas, el fuego derrite el hielo y salen bombas
  function openBox(S, r, c, o, delay, K) {
    const b = { id: uid++, kind: 'gbomb' };
    S.grid[r][c] = b;
    rem(S, K, o, delay);
    K.created(b, r, c, delay + 0.1);
  }
  function meltBoxes(S, K) {
    const pairs = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (!o || o.kind !== 'ibox') continue;
      for (const [dr, dc] of D4) { const q = cell(S, r + dr, c + dc); if (q && q.kind === 'fbox') pairs.push([r, c], [r + dr, c + dc]); }
    }
    if (!pairs.length) return false;
    const seen = new Set();
    for (const [r, c] of pairs) { const o = S.grid[r][c]; if (!o || seen.has(o) || (o.kind !== 'ibox' && o.kind !== 'fbox')) continue; seen.add(o); openBox(S, r, c, o, 0.15, K); }
    K.melt && K.melt();
    return true;
  }
  // mariposa: al liberarla vuela hasta una mascota y la lleva al suelo; si no hay, rompe 3 bloques
  function butterflies(S, K) {
    while (S.bfq > 0) {
      S.bfq--;
      let pet = null;
      for (let r = 0; r < S.R && !pet; r++) for (let c = 0; c < S.C; c++) { const o = S.grid[r][c]; if (o && o.kind === 'pet') { pet = [r, c, o]; break; } }
      if (pet) {
        const [r, c, o] = pet;
        S.grid[r][c] = null; rem(S, K, o, 0.2, { mode: 'pet', r: S.R - 1, c }); K.collect('pet', undefined, o, 0.2); S.score = (S.score || 0) + 2000;
        K.bfly(r, c);
      } else {
        const bl = [];
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = S.grid[r][c]; if (o && o.kind === 'block') bl.push([r, c]); }
        S.rand.shuffle(bl);
        for (const [r, c] of bl.slice(0, 3)) damage(S, r, c, 0.2, K);
      }
    }
  }
  // detonador: baja uno por jugada y al llegar a 0 explota con el bloque que lleva
  function detTurn(S, K) {
    const boom = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = S.grid[r][c]; if (o && o.det != null) { o.det--; K.recolor(o); if (o.det <= 0) boom.push([r, c, o]); } }
    for (const [r, c, o] of boom) { if (S.grid[r][c] !== o) continue; S.grid[r][c] = null; explode(S, r, c, 0.1, K, o); }
    if (boom.length) settle(S, K);
  }
  function hitCage(S, r, c, o, delay, K) {
    o.hp--;
    if (o.hp <= 0) { const pet = { id: uid++, kind: 'pet', pet: o.pet }; S.grid[r][c] = pet; K.transform(o, pet, delay); }
    else K.hurt(o, delay);
  }
  function explode(S, r, c, delay, K, t) {
    rem(S, K, t, delay);
    K.fx({ type: 'bomb', r, c, rad: 1.5, delay });
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) damage(S, r + dr, c + dc, delay + 0.05, K);
  }
  // bomba de color: todos los bloques de su color; rompelíneas: su fila entera
  function fireSpecial(S, r, c, o, delay, K) {
    rem(S, K, o, delay);
    if (o.kind === 'cbomb') {
      K.fx({ type: 'bomb', r, c, rad: 1, delay });
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const q = S.grid[rr][cc]; if (q && q.kind === 'block' && q.color === o.color) damage(S, rr, cc, delay + 0.2 + 0.02 * (Math.abs(rr - r) + Math.abs(cc - c)), K); }
    } else if (o.kind === 'roto' || o.kind === 'dblast') {
      // rotobomba: dispara en la dirección a la que apunta
      const [dr, dc] = DIRS[o.dir];
      K.fx({ type: 'rocket', dir: dr ? 'v' : 'h', r, c, delay });
      for (let k = 1; k < Math.max(S.R, S.C); k++) damage(S, r + dr * k, c + dc * k, delay + k * 0.03, K);
    } else if (o.kind === 'paint') {
      // cubo de pintura: pinta de su color hasta 4 bloques contiguos y él vuelve a ser un bloque
      const nb = { id: uid++, kind: 'block', color: o.color };
      S.grid[r][c] = nb; K.created(nb, r, c, delay);
      const q = [[r, c]], seen = new Set([r * 64 + c]); let painted = 0;
      while (q.length && painted < 4) {
        const [qr, qc] = q.shift();
        for (const [dr, dc] of D4) {
          const t2 = cell(S, qr + dr, qc + dc), k = (qr + dr) * 64 + qc + dc;
          if (!t2 || seen.has(k) || t2.kind !== 'block') continue;
          seen.add(k); q.push([qr + dr, qc + dc]);
          if (t2.color !== o.color && painted < 4) { t2.color = o.color; painted++; K.recolor(t2); }
        }
      }
    } else {
      K.fx({ type: 'rocket', dir: 'h', r, c, delay });
      for (let cc = 0; cc < S.C; cc++) damage(S, r, cc, delay + Math.abs(cc - c) * 0.03, K);
    }
  }
  // alambre: se corta eliminando bloques al lado; el alambrador pone alambre a un vecino en cada jugada
  function cutWires(S, cellsRemoved, K) {
    const hit = new Set();
    for (const [rr, cc] of cellsRemoved) for (const [dr, dc] of D4) {
      const o = cell(S, rr + dr, cc + dc);
      if (o && o.wire && !hit.has(o)) { hit.add(o); o.wire--; if (!o.wire) o.vine = false; K.recolor(o); }
    }
  }
  function freezerTurn(S, K) {
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const f = S.grid[r][c];
      if (!f || f.kind !== 'freezer') continue;
      const opts = D4.map(([dr, dc]) => cell(S, r + dr, c + dc)).filter((o) => o && o.kind === 'block' && (o.wire || 0) < 2);
      if (opts.length) { const o = opts[S.rand.int(opts.length)]; o.wire = (o.wire || 0) + 1; K.recolor(o); }
    }
  }
  // enredadera: cada flor cubre el siguiente bloque libre en su dirección
  function vineTurn(S, K) {
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const f = S.grid[r][c];
      if (!f || f.kind !== 'vflower') continue;
      const [dr, dc] = DIRS[f.dir];
      for (let k = 1; k < Math.max(S.R, S.C); k++) {
        const o = cell(S, r + dr * k, c + dc * k);
        if (!o) break;
        if (o.kind === 'block' && !o.wire) { o.wire = 1; o.vine = true; K.recolor(o); break; }
      }
    }
  }
  // la rotobomba gira en cada jugada
  function turnRotos(S) { for (const row of S.grid) for (const o of row) if (o && o.kind === 'roto') o.dir = (o.dir + 1) % 4; }
  // virus: si en el turno no se elimina ningún bloque infectado, infecta a un vecino
  function spreadVirus(S, K) {
    if (S.virusHit) return;
    const opts = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (!o || !o.virus) continue;
      for (const [dr, dc] of D4) { const q = cell(S, r + dr, c + dc); if (q && q.kind === 'block' && !q.virus) opts.push(q); }
    }
    if (!opts.length) return;
    const q = opts[S.rand.int(opts.length)];
    q.virus = true; K.recolor(q);
  }
  function blastColumn(S, c, r, K) {
    K.fx({ type: 'rocket', dir: 'v', r, c, delay: 0 });
    for (let rr = 0; rr < S.R; rr++) damage(S, rr, c, Math.abs(rr - r) * 0.03, K);
  }
  function act(S, r, c, K) {
    const t = cell(S, r, c);
    if (!t) return false;
    S.virusHit = false;
    if (t.kind === 'cbomb' || t.kind === 'lblast' || t.kind === 'roto' || t.kind === 'paint' || t.kind === 'dblast') {
      S.grid[r][c] = null; fireSpecial(S, r, c, t, 0, K); K.sound(8);
      settle(S, K); spreadVirus(S, K); freezerTurn(S, K); vineTurn(S, K); turnRotos(S); detTurn(S, K);
      return true;
    }
    if (t.kind !== 'block') return false;
    const grp = group(S, r, c);
    if (grp.length < 2) return false;
    const mult = grp.reduce((m, [rr, cc]) => m * (S.grid[rr][cc].mult || 1), 1); // bloques multiplicadores
    const hitSet = new Set();
    for (const [rr, cc] of grp) {
      const tt = S.grid[rr][cc]; S.grid[rr][cc] = null;
      rem(S, K, tt, 0);
      K.collect('color', tt.color, tt, 0);
      if (tt.virus) S.virusHit = true;
      if (tt.bfly) S.bfq = (S.bfq || 0) + 1;
    }
    cutWires(S, grp, K);
    // las jaulas de al lado se rompen
    for (const [rr, cc] of grp) for (const [dr, dc] of D4) {
      const o = cell(S, rr + dr, cc + dc);
      if (o && o.kind === 'cage' && !hitSet.has(o)) { hitSet.add(o); hitCage(S, rr + dr, cc + dc, o, 0.05, K); }
      if (o && o.kind === 'vflower' && !hitSet.has(o)) { hitSet.add(o); S.grid[rr + dr][cc + dc] = null; rem(S, K, o, 0.05); }
    }
    S.score = (S.score || 0) + 20 * grp.length * grp.length * mult; // grupos grandes dan muchos más puntos; los multiplicadores los doblan
    S.charge = Math.min(CHARGE_FULL, (S.charge || 0) + chargeFor(grp.length));
    K.sound(grp.length);
    settle(S, K);
    spreadVirus(S, K);
    freezerTurn(S, K);
    vineTurn(S, K);
    turnRotos(S);
    detTurn(S, K);
    return true;
  }
  // suelo de piedra (fijo): lo de encima se apoya en él; por sus agujeros se cae sin hacerse daño
  const isWall = (o) => !!o && o.kind === 'wall';
  function gravity(S) {
    for (let c = 0; c < S.C; c++) {
      let w = S.R - 1;
      for (let r = S.R - 1; r >= 0; r--) {
        const o = S.grid[r][c];
        if (isWall(o)) { w = r - 1; continue; }
        if (o) { if (w !== r) { S.grid[w][c] = o; S.grid[r][c] = null; } w--; }
      }
    }
  }
  const colEmpty = (S, c) => { for (let r = 0; r < S.R; r++) if (S.grid[r][c]) return false; return true; };
  const hasWalls = (S) => S.walls || (S.walls = S.grid.some((row) => row.some(isWall)) ? 1 : -1) > 0;
  // "Los bloques y las mascotas bajan hacia abajo y hacia la izquierda" (tutorial oficial)
  function collapseLeft(S) {
    if (S.walls > 0 || (S.walls == null && hasWalls(S))) return; // con suelo de piedra las columnas no se desplazan
    let w = 0;
    for (let c = 0; c < S.C; c++) {
      if (colEmpty(S, c)) continue;
      if (c !== w) for (let r = 0; r < S.R; r++) { S.grid[r][w] = S.grid[r][c]; S.grid[r][c] = null; }
      w++;
    }
  }
  function refill(S, K) {
    for (let c = 0; c < S.C; c++) {
      let k = 0;
      for (let r = S.R - 1; r >= 0; r--) {
        if (S.grid[r][c]) continue;
        let t;
        const petsOn = countKind(S, 'pet') + countKind(S, 'cage');
        if (S.petsToDrop > 0 && petsOn < 3 && S.rand() < 0.12) { t = { id: uid++, kind: 'pet', pet: S.rand.pick(S.petTypes) }; S.petsToDrop--; }
        else if (S.bombRate && S.rand() < S.bombRate) t = { id: uid++, kind: 'gbomb' };
        else t = { id: uid++, kind: 'block', color: S.rand.int(S.colors) };
        S.grid[r][c] = t; K.spawn(t, r, c, k++);
      }
    }
  }
  function countKind(S, kind) { let n = 0; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.grid[r][c] && S.grid[r][c].kind === kind) n++; return n; }
  function settle(S, K) {
    for (let guard = 0; guard < 30; guard++) {
      if (S.bfq > 0) butterflies(S, K);
      gravity(S);
      if (!S.refill) collapseLeft(S);
      let any = false;
      for (let c = 0; c < S.C; c++) {
        const o = S.grid[S.R - 1][c];
        if (o && o.kind === 'pet') { S.grid[S.R - 1][c] = null; rem(S, K, o, 0, { mode: 'pet', r: S.R - 1, c }); K.collect('pet', undefined, o, 0); S.score = (S.score || 0) + 2000; any = true; }
        // la bomba en cristal estalla al llegar al suelo
        if (o && o.kind === 'gbomb') { S.grid[S.R - 1][c] = null; explode(S, S.R - 1, c, 0.15, K, o); any = true; }
        if (o && o.kind === 'gdiam') { S.grid[S.R - 1][c] = null; rem(S, K, o, 0.1); S.score = (S.score || 0) + 1000; K.bonus(o, 1000); any = true; }
        // la llave en cristal, al llegar al suelo, abre todos los candados
        if (o && o.kind === 'gkey') {
          S.grid[S.R - 1][c] = null; rem(S, K, o, 0.1); any = true;
          for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const q = S.grid[rr][cc]; if (q && q.kind === 'lock') { S.grid[rr][cc] = null; rem(S, K, q, 0.3 + 0.03 * rr); } }
        }
      }
      if (S.refill) refill(S, K);
      if (meltBoxes(S, K)) any = true;
      if (!any) break;
    }
  }
  // filas que se ven en pantalla (el tablero puede ser más alto que la pantalla)
  function contentTop(S) {
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.grid[r][c] && !isWall(S.grid[r][c])) return r;
    return S.R;
  }
  function camFor(S, V) { return E.clamp(contentTop(S) - 1, 0, Math.max(0, S.R - V)); }
  function visRows(S, V) { const c0 = camFor(S, V); return [c0, Math.min(S.R - 1, c0 + V - 1)]; }
  function hasMove(S, V) {
    if ((S.charge || 0) >= CHARGE_FULL) return true;
    const [r0, r1] = visRows(S, V);
    for (let r = r0; r <= r1; r++) for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (o && (o.kind === 'cbomb' || o.kind === 'lblast' || o.kind === 'roto' || o.kind === 'paint' || o.kind === 'dblast')) return true;
      if (!o || o.kind !== 'block' || o.wire) continue;
      const a = r + 1 <= r1 ? cell(S, r + 1, c) : null, b = cell(S, r, c + 1);
      if ((a && a.kind === 'block' && !a.wire && a.color === o.color) || (b && b.kind === 'block' && !b.wire && b.color === o.color)) return true;
    }
    return false;
  }
  // Sin jugadas: como en Pet Rescue (PRRuleCrushStuckBlocks) se aplasta la fila de arriba.
  // "Perderás los bloques/mascotas de la parte superior cuando no haya combinaciones posibles"
  function crushTop(S, K) {
    const r = contentTop(S);
    if (r >= S.R) return { pets: 0 };
    let pets = 0;
    for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (!o || isWall(o)) continue;
      if (o.kind === 'pet' || o.kind === 'cage') pets++;
      S.grid[r][c] = null; rem(S, K, o, c * 0.04, { mode: 'crush' });
    }
    settle(S, K);
    return { pets };
  }
  // Ayuda cuando no quedan jugadas: pinta bloques para crear parejas; si no hay, pone una bomba
  function helpOut(S, K, V) {
    const [r0, r1] = visRows(S, V);
    const blocks = [];
    for (let r = r0; r <= r1; r++) for (let c = 0; c < S.C; c++) if (S.grid[r][c] && S.grid[r][c].kind === 'block') blocks.push([r, c]);
    S.rand.shuffle(blocks);
    let made = 0;
    for (const [r, c] of blocks) {
      if (made >= 4) break;
      for (const [dr, dc] of D4) {
        if (r + dr < r0 || r + dr > r1) continue;
        const o = cell(S, r + dr, c + dc);
        if (o && o.kind === 'block') { o.color = S.grid[r][c].color; K.recolor(o); made++; break; }
      }
    }
    if (!made) { S.charge = CHARGE_FULL; made = 1; K.recolor(null); }
    return made > 0;
  }
  // columna donde conviene disparar el cohete: la que tiene un animalito más alto con más cosas debajo
  function bestColumn(S, V) {
    let best = 0, bs = -1;
    const [r0] = visRows(S, V);
    for (let c = 0; c < S.C; c++) {
      let score = 0, petAbove = false;
      for (let r = r0; r < S.R; r++) {
        const o = S.grid[r][c];
        if (!o) continue;
        if (o.kind === 'pet' || o.kind === 'cage') petAbove = true;
        else if (petAbove) score += 3;
        else score += 0.5;
      }
      if (score > bs) { bs = score; best = c; }
    }
    return best;
  }

  // ------------------------------------------------------------ generador y bot
  function buildState(spec, seed) {
    const S = { R: spec.R, C: spec.C, rand: E.rng(seed), colors: spec.colors, refill: spec.refill, petsToDrop: spec.petsToDrop || 0, petTypes: spec.petTypes, bombRate: spec.bombRate || 0, charge: 0 };
    S.grid = spec.cells.map((row) => row.map((d) => (d ? Object.assign({ id: uid++ }, d) : null)));
    return S;
  }
  const nullK = { remove() {}, created() {}, fx() {}, hurt() {}, collect() {}, sound() {}, recolor() {}, spawn() {}, transform() {}, bonus() {}, bfly() {} };
  function* botRunG(spec, seed) {
    const S = buildState(spec, seed);
    const need = { color: {}, pet: 0, blocks: 0 };
    spec.goals.forEach((gl) => { if (gl.type === 'color') need.color[gl.key] = gl.count; else need[gl.type] = gl.count; });
    const K = Object.assign({}, nullK, { collect(type, key) { if (type === 'color') { if (need.color[key] > 0) need.color[key]--; } else if (need[type] > 0) need[type]--; } });
    const done = () => need.pet <= 0 && need.blocks <= 0 && Object.values(need.color).every((v) => v <= 0);
    let moves = 0, helps = 0;
    while (!done() && moves < 70) { // más allá el nivel se descarta igualmente (así se genera rápido en la tablet)
      yield;
      if (S.charge >= CHARGE_FULL) { // el cohete no gasta movimiento
        S.charge = 0; const c = bestColumn(S, spec.V); blastColumn(S, c, visRows(S, spec.V)[0], K); settle(S, K); continue;
      }
      if (!hasMove(S, spec.V)) { const cr = crushTop(S, K); if (cr.pets) return { moves: 999, helps }; helps++; if (done()) break; if (contentTop(S) >= S.R) return { moves: 999, helps }; continue; }
      const m = botPick(S, need, spec.V);
      act(S, m[0], m[1], K);
      moves++;
    }
    return { moves, helps, score: S.score || 0 };
  }
  function botPick(S, need, V) {
    const seen = new Set();
    let best = null, bestScore = -1;
    const [r0, r1] = visRows(S, V);
    for (let r = r0; r <= r1; r++) for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (!o || seen.has(o) || o.kind !== 'block') continue;
      const g = group(S, r, c).filter(([rr]) => rr <= r1);
      g.forEach(([rr, cc]) => seen.add(S.grid[rr][cc]));
      if (g.length < 2) continue;
      let score = g.length * 0.6;
      if (need.color[o.color] > 0) score += g.length;
      for (const [rr, cc] of g) for (let k = rr - 1; k >= 0; k--) { const q = S.grid[k][cc]; if (q && (q.kind === 'pet' || q.kind === 'cage')) score += 4; }
      for (const [rr, cc] of g) for (const [dr, dc] of D4) { const q = cell(S, rr + dr, cc + dc); if (q && q.kind === 'cage') score += 3; if (q && (q.kind === 'fbox' || q.kind === 'ibox')) score += 1.5; }
      for (const [rr, cc] of g) { const q = S.grid[rr][cc]; if (q.bfly) score += 5; if (q.det != null) score -= 1; }
      score += (r / S.R) * 0.5;
      if (score > bestScore) { bestScore = score; best = [r, c]; }
    }
    // bloques especiales: valen lo que quitan
    for (let r = r0; r <= r1; r++) for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (!o || !['cbomb', 'lblast', 'roto', 'paint', 'dblast'].includes(o.kind)) continue;
      let n = 0;
      if (o.kind === 'cbomb') { for (const row of S.grid) for (const q of row) if (q && q.kind === 'block' && q.color === o.color) n++; }
      else if (o.kind === 'lblast') { for (let cc = 0; cc < S.C; cc++) { const q = S.grid[r][cc]; if (q && q.kind !== 'pet') n++; } }
      else n = o.kind === 'paint' ? 4 : 5;
      const score = n * 0.8 + 2;
      if (score > bestScore) { bestScore = score; best = [r, c]; }
    }
    return best;
  }

  const cache = new Map();
  // generador por pasos: el motor lo avanza poco a poco en segundo plano (ver E.prefetch)
  function* levelG(n) {
    if (cache.has(n)) return cache.get(n);
    let spec = null;
    // nos quedamos con la variante más limpia: que el bot la gane sin perder mascotas aplastadas
    const cost = (sp) => (sp.botMoves >= 999 ? 1e6 : sp.botMoves + sp.botHelps * 3);
    for (let attempt = 0; attempt < 14; attempt++) {
      const sp = yield* genLevelG(n, attempt);
      if (!spec || cost(sp) < cost(spec)) spec = sp;
      if (spec.botMoves <= 36 && spec.botHelps === 0) break;
    }
    // como en Pet Rescue: solo los niveles de puntos tienen movimientos (de 40 a 80 en su tramo);
    // rescate y clásico no tienen límite. En todos hace falta la 1ª estrella de puntos para ganar.
    if (spec.mode === 'score') {
      const r2 = E.rng(n * 7741 + 3);
      const target = Math.round(30 + spec.d * 20 + r2() * 14);
      // las mascotas caen al azar: medimos con más partidas y nos quedamos con la peor
      const extra = [yield* botRunG(spec, n * 31 + 7), yield* botRunG(spec, n * 31 + 8)].map((x) => x.moves);
      const worst = Math.max(spec.botMoves, ...extra.filter((m) => m < 999));
      // si el bot va muy sobrado se recortan movimientos para que siga siendo un reto
      spec.moves = E.clamp(Math.max(Math.min(target, Math.ceil(worst * 1.4) + 3), Math.ceil(worst * 1.2) + 2), 15, 80);
    } else spec.moves = Infinity;
    const r500 = (v) => Math.max(500, Math.round(v / 500) * 500);
    spec.starScores = [r500(spec.botScore * 0.5), r500(spec.botScore * 0.75), r500(spec.botScore * 0.95)];
    if (spec.starScores[1] <= spec.starScores[0]) spec.starScores[1] = spec.starScores[0] + 500;
    if (spec.starScores[2] <= spec.starScores[1]) spec.starScores[2] = spec.starScores[1] + 500;
    cache.set(n, spec);
    return spec;
  }
  GAME.makeLevel = (n) => (cache.has(n) ? cache.get(n) : E.runGen(levelG(n)));
  GAME.levelSteps = (n) => (cache.has(n) ? null : levelG(n));
  GAME.genLevel = (n, a) => E.runGen(genLevelG(n, a));
  GAME.botPick = (S, need, V) => botPick(S, need, V);
  GAME.bestColumn = (S, V) => bestColumn(S, V);
  function* genLevelG(n, attempt) {
    const rng = E.rng(n * 3266489917 + 101 + attempt * 4243);
    const d = E.difficulty(n) * Math.pow(0.8, attempt);
    const C = n < 5 ? 7 : rng.pick([8, 9, 9]);
    const V = Math.floor(530 / Math.min(580 / C, 76)); // filas que caben (dejando sitio al cohete)
    // como en Pet Rescue: algo más de la mitad de los niveles reponen bloques desde arriba
    const refill = n === 6 || (n > 6 && n !== 8 && n !== 12 && n !== 18 && rng() < 0.6);
    // modos de Pet Rescue en su tramo: puntos (se rellena, movimientos limitados) 45%,
    // rescate (tablero alto, sin límite) 41% y clásico (despeja todos los bloques, sin límite) 14%
    const classic = !refill && n >= 30 && rng() < 0.4;
    const extra = refill || n < 6 ? 0 : Math.round(3 + d * 8 + rng() * 4);
    const R = V + extra;
    const colors = n < 4 ? 3 : n < 25 ? 4 : d > 0.55 && rng() < 0.5 ? 5 : 4;
    const heights = [];
    const prof = refill ? 0 : rng.int(4);
    for (let c = 0; c < C; c++) {
      const m = Math.min(c, C - 1 - c), center = (C - 1) / 2;
      let hgt = R - 1;
      if (prof === 1) hgt = R - 1 - Math.round(Math.abs(c - center) * 0.7);
      else if (prof === 2) hgt = R - 2 + (m % 2);
      else if (prof === 3) hgt = R - 1 - (m === 0 ? 2 : 0);
      heights.push(Math.max(4, refill ? R - 1 : hgt));
    }
    const cells = [];
    for (let r = 0; r < R; r++) cells.push(new Array(C).fill(null));
    for (let c = 0; c < C; c++) for (let k = 0; k < heights[c]; k++) cells[R - 1 - k][c] = { kind: 'block', color: rng.int(colors) };
    const petType = PETS[n % PETS.length];
    const petTypes = [petType, PETS[(n + 3) % PETS.length], PETS[(n + 6) % PETS.length]];
    const npets = classic ? 0 : n < 3 ? 2 : Math.min(C - 1, 2 + Math.round(d * 3 + rng()));
    const step = C / Math.max(1, npets);
    let placedPets = 0;
    for (let i = 0; i < npets; i++) {
      const c = Math.min(C - 1, Math.floor(i * step + step / 2));
      const r = R - 1 - heights[c];
      if (r >= 0) { cells[r][c] = { kind: 'pet', pet: rng() < 0.6 ? petType : rng.pick(PETS) }; placedPets++; }
    }
    // jaulas con animalito dentro (desde el nivel 12)
    let cages = 0;
    if (!classic && (n === 12 || (n > 12 && rng() < 0.45))) {
      const want = 1 + Math.round(d * 2);
      for (let i = 0; i < 40 && cages < want; i++) {
        const r = rng.range(Math.floor(R * 0.35), R - 3), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'cage', pet: rng.pick(petTypes), hp: d > 0.5 && rng() < 0.4 ? 2 : 1 }; cages++; }
      }
    }
    // bloques negros (solo se rompen con bombas, cohete o ayudas) desde el nivel 18
    if (n === 18 || (n > 18 && rng() < 0.35)) {
      const nb = attempt > 4 ? 1 : 2 + Math.round(d * 4);
      for (let i = 0, k = 0; i < 60 && k < nb; i++) {
        const r = rng.range(Math.floor(R * 0.5), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'black' }; k++; }
      }
    }
    // bombas en cristal desde el nivel 8
    let bombRate = 0;
    if (n === 8 || (n > 8 && rng() < 0.5)) {
      const nb = 1 + Math.round(d * 2 + rng());
      for (let i = 0; i < nb; i++) {
        const r = rng.range(Math.floor(R * 0.2), Math.floor(R * 0.6)), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') cells[r][c] = { kind: 'gbomb' };
      }
      if (refill) bombRate = 0.02;
    }
    // bloques especiales sueltos (bomba de color 88% y rompelíneas 69% en su tramo) desde el 14
    if (n === 14 || (n > 14 && rng() < 0.75)) {
      const ns = 1 + (rng() < 0.5 ? 1 : 0);
      for (let i = 0, k = 0; i < 40 && k < ns; i++) {
        const r = rng.range(Math.floor(R * 0.3), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: rng() < 0.55 ? 'cbomb' : 'lblast', color: cells[r][c].color }; k++; }
      }
    }
    // candados y llave en cristal (84% en su tramo) desde el 20
    if (n === 20 || (n > 20 && rng() < 0.45)) {
      const nl = 2 + Math.round(d * 3);
      for (let i = 0, k = 0; i < 60 && k < nl; i++) {
        const r = rng.range(Math.floor(R * 0.4), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'lock' }; k++; }
      }
      for (let i = 0; i < 40; i++) {
        const r = rng.range(Math.floor(R * 0.15), Math.floor(R * 0.45)), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') {
          cells[r][c] = { kind: 'gkey' };
          // ningún candado debajo de la llave, o no podría llegar al suelo
          for (let rr = r + 1; rr < R; rr++) if (cells[rr][c] && cells[rr][c].kind === 'lock') cells[rr][c] = { kind: 'block', color: rng.int(colors) };
          break;
        }
      }
    }
    // rotobomba (37%) desde el 32 y cubo de pintura (43%) desde el 36
    for (const [kind, from, prob] of [['roto', 32, 0.35], ['paint', 36, 0.4]]) {
      if (n === from || (n > from && rng() < prob)) {
        for (let i = 0; i < 40; i++) {
          const r = rng.range(Math.floor(R * 0.3), R - 2), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].virus) { cells[r][c] = kind === 'roto' ? { kind, color: cells[r][c].color, dir: rng.int(4) } : { kind, color: cells[r][c].color }; break; }
        }
      }
    }
    // alambrador (31%) desde el 40, con algunos bloques ya alambrados
    if (n === 40 || (n > 40 && rng() < 0.3)) {
      for (let i = 0; i < 40; i++) {
        const r = rng.range(Math.floor(R * 0.5), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') {
          cells[r][c] = { kind: 'freezer' };
          for (const [dr, dc] of D4) { const o = cells[r + dr] && cells[r + dr][c + dc]; if (o && o.kind === 'block') o.wire = 1; }
          break;
        }
      }
    }
    // empujabloques direccional (44), diamantes en cristal (48), bloques multiplicadores (52), arcoíris (56) y transportines (60)
    if (n === 44 || (n > 44 && rng() < 0.3)) for (let i = 0; i < 40; i++) { const r = rng.range(Math.floor(R * 0.3), R - 2), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'dblast', color: cells[r][c].color, dir: rng.pick([1, 3, 0]) }; break; } }
    if (n === 48 || (n > 48 && rng() < 0.4)) for (let i = 0, k = 0; i < 40 && k < 1 + (d > 0.5 ? 1 : 0); i++) { const r = rng.range(Math.floor(R * 0.15), Math.floor(R * 0.5)), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'gdiam' }; k++; } }
    if (n === 52 || (n > 52 && rng() < 0.25)) for (let i = 0, k = 0; i < 40 && k < 2; i++) { const r = rng.range(Math.floor(R * 0.3), R - 1), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].mult) { cells[r][c].mult = 2; k++; } }
    if (n === 56 || (n > 56 && rng() < 0.27)) for (let i = 0, k = 0; i < 40 && k < 2; i++) { const r = rng.range(Math.floor(R * 0.3), R - 1), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].mult) { cells[r][c].rainbow = true; k++; } }
    if (!classic && (n === 60 || (n > 60 && rng() < 0.3))) for (let i = 0; i < 40; i++) { const r = rng.range(Math.floor(R * 0.35), R - 3), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'cage', carrier: true, pet: rng.pick(petTypes), hp: 1 }; cages++; break; } }
    // virus (47% en su tramo) desde el 26
    if (n === 26 || (n > 26 && rng() < 0.4)) {
      const nv = 1 + Math.round(d * 2);
      for (let i = 0, k = 0; i < 40 && k < nv; i++) {
        const r = rng.range(Math.floor(R * 0.4), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].virus) { cells[r][c].virus = true; k++; }
      }
    }
    // cajas de hielo y fuego (64): como en sus niveles, el hielo arriba y el fuego abajo, con bloques en medio
    if (n === 64 || (n > 64 && rng() < 0.2)) {
      const k = 2 + Math.round(d * 2);
      for (const [kind, r0, r1] of [['ibox', Math.floor(R * 0.3), Math.floor(R * 0.5)], ['fbox', Math.floor(R * 0.7), R - 1]]) {
        for (let i = 0, put = 0; i < 60 && put < k; i++) {
          const r = rng.range(r0, r1), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].virus) { cells[r][c] = { kind }; put++; }
        }
      }
    }
    // mariposas (68): en un bloque; al combinarlo vuela y lleva una mascota al suelo
    if (!classic && (n === 68 || (n > 68 && rng() < 0.15))) for (let i = 0, k = 0; i < 60 && k < 1 + (rng() < 0.4 ? 1 : 0); i++) {
      const r = rng.range(Math.floor(R * 0.5), R - 1), c = rng.int(C), o = cells[r][c];
      if (o && o.kind === 'block' && !o.virus && !o.mult && !o.rainbow && !o.wire) { o.bfly = true; k++; }
    }
    // detonador (72): cuenta atrás de 3 a 5 jugadas; al llegar a 0 explota y ayuda
    if (n === 72 || (n > 72 && rng() < 0.12)) for (let i = 0, k = 0; i < 60 && k < 2; i++) {
      const r = rng.range(Math.floor(R * 0.4), R - 1), c = rng.int(C), o = cells[r][c];
      if (o && o.kind === 'block' && !o.virus && !o.bfly && o.det == null) { o.det = 3 + rng.int(3); k++; }
    }
    // flor de enredadera (76): cubre de enredadera un bloque por jugada; se rompe combinando a su lado
    if (n === 76 || (n > 76 && rng() < 0.15)) for (let i = 0, k = 0; i < 60 && k < 1 + (d > 0.5 ? 1 : 0); i++) {
      const r = rng.range(Math.floor(R * 0.4), R - 1), c = rng.int(C), o = cells[r][c];
      if (o && o.kind === 'block' && !o.virus && !o.bfly && o.det == null) { cells[r][c] = { kind: 'vflower', dir: c < C / 2 ? 1 : 3 }; k++; }
    }
    // suelo de piedra con agujeros (80): "¡Las mascotas y los bloques se caen por los agujeros del mapa sin sufrir daño alguno!"
    if (!refill && (n === 80 || (n > 80 && rng() < 0.15))) {
      const rs = R - 1 - Math.floor(V * 0.45);
      const holes = new Set();
      for (let r = 0; r < rs; r++) for (let c = 0; c < C; c++) { const o = cells[r][c]; if (o && (o.kind === 'pet' || o.kind === 'cage' || o.kind === 'gdiam' || o.kind === 'gkey' || o.kind === 'gbomb')) holes.add(c); }
      holes.add(rng.int(C));
      if (holes.size < C - 1) for (let c = 0; c < C; c++) if (!holes.has(c)) cells[rs][c] = { kind: 'wall' };
    }
    const petsToDrop = refill ? Math.round(3 + d * 6 + rng() * 3) : 0; // en modo puntos hay 6–16 mascotas
    const goals = classic ? [] : [{ type: 'pet', count: placedPets + cages + petsToDrop, icon: petType }];
    if (classic) { let nb = 0; for (const row of cells) for (const o of row) if (o && o.kind !== 'pet' && o.kind !== 'wall') nb++; goals.push({ type: 'blocks', count: nb }); }
    if (!classic && n >= 5 && rng() < 0.3) {
      const col = rng.int(colors);
      goals.push({ type: 'color', key: col, count: Math.round((refill ? 18 : 10) + d * 18) });
    }
    let text = '';
    if (n === 1) text = 'Toca bloques iguales para bajar a los animalitos al suelo';
    if (n === 2) text = 'Los grupos grandes cargan el cohete 🚀. Cuando esté lleno, tócalo';
    if (n === 6 && refill) text = 'En este nivel van cayendo bloques nuevos desde arriba';
    if (n === 8) text = 'Baja la bomba de cristal hasta el suelo para que explote';
    if (n === 12) text = 'Rompe las jaulas explotando bloques a su lado';
    if (n === 18) text = 'Los bloques negros solo se rompen con bombas y cohetes';
    if (n === 14) text = 'Toca los bloques especiales: 💥 quita todos los de su color y ↔️ su fila';
    if (n === 20) text = 'Baja la llave hasta el suelo para abrir los candados 🔒';
    if (n === 26) text = 'Cuidado con el virus 🦠: si no lo quitas, se contagia a otro bloque';
    if (n === 32) text = 'La rotobomba gira en cada jugada. Tócala cuando apunte donde quieras';
    if (n === 36) text = 'Toca el cubo de pintura 🪣 para pintar de su color los bloques de al lado';
    if (n === 40) text = 'El alambrador pone alambre a sus vecinos: quita bloques al lado para cortarlo';
    const tx = { 44: 'El empujabloques elimina bloques en una dirección: tócalo', 48: '¡Los diamantes te dan 1000 puntos! Bájalos hasta el suelo', 52: 'Los bloques multiplicadores doblan tus puntos', 56: 'El bloque arcoíris combina con cualquier color', 60: 'Haz combinaciones junto a los transportines para liberar a las mascotas', 64: 'Junta las cajas de hielo con las de fuego para descubrir las bombas que llevan dentro', 68: 'Combina el bloque de la mariposa: volará a llevar una mascota al suelo', 72: 'El detonador cuenta las jugadas: al llegar a 0 explota', 76: 'La flor llena de enredadera los bloques: quita bloques al lado para cortarla', 80: 'Las mascotas y los bloques caen por los agujeros del suelo de piedra sin hacerse daño' };
    if (tx[n]) text = tx[n];
    if (classic && !text) text = '¡Despeja todos los bloques!';
    const spec = { R, C, V, colors, cells, goals, text, d, refill, petsToDrop, petTypes, bombRate, mode: refill ? 'score' : classic ? 'classic' : 'rescue' };
    const a = yield* botRunG(spec, n * 13 + 1), b = yield* botRunG(spec, n * 13 + 2);
    spec.botMoves = Math.max(a.moves, b.moves);
    spec.botScore = Math.min(a.score, b.score);
    spec.botHelps = a.helps + b.helps;
    return spec;
  }

  // potenciadores de inicio (Pet Rescue) y premio de la racha de victorias
  // colección propia del juego (logros y álbum)
  GAME.collection = { type: 'pet', label: 'Mascotas rescatadas', icon: '🐶' };
  GAME.startBoosters = [{ id: 'lblast', icon: '↔️', name: 'Rompelíneas' }, { id: 'cbomb', icon: '💥', name: 'Bomba de color' }, { id: 'charge', icon: '🚀', name: 'Cohete cargado' }];
  GAME.streakBonus = [['lblast'], ['lblast', 'cbomb'], ['lblast', 'cbomb', 'charge']];
  GAME.boosters = [
    { id: 'hammer', icon: '🔨', target: true, prompt: 'Cascabloques: toca el bloque que quieras romper' },
    { id: 'column', icon: '🚀', target: true, prompt: 'Rompecolumnas: toca una columna' },
    { id: 'row', icon: '↔️', target: true, prompt: 'Rompelíneas: toca una fila' },
    { id: 'colorpop', icon: '🎈', target: true, prompt: 'Explotacolores: toca un color' },
  ];

  // ------------------------------------------------------------ partida
  GAME.newPlay = function (spec) {
    const S = buildState(spec, E.playSeed != null ? E.playSeed : (Math.random() * 1e9) | 0);
    const P = { S, busy: false };
    let ts = 60, bx = 0, by = 0, V = spec.V, rackY = 0;
    let cam = 0, camTarget = 0;
    const dying = [];
    const fxs = [];
    let hold = 0;
    let hintTiles = null;
    let rocketAim = false;
    let chargeShown = 0;
    const cx = (c) => bx + c * ts + ts / 2;
    const cy = (r) => by + (r - cam) * ts + ts / 2;
    const all = () => { const a = []; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.grid[r][c]) a.push([S.grid[r][c], r, c]); return a; };
    function updateCam() { camTarget = camFor(S, V); }

    P.layout = function (area) {
      ts = Math.min(area.w / S.C, 76);
      V = Math.min(S.R, Math.floor((area.h - 110) / ts));
      bx = area.x + (area.w - ts * S.C) / 2;
      by = area.y + (area.h - 110 - ts * V) / 2;
      rackY = by + V * ts + 60;
      updateCam();
      if (!P.placed) {
        P.placed = true;
        cam = camTarget;
        for (const [t, r] of all()) { t.gy = isWall(t) ? r : r - S.R; t.vy = 0; t.delay = isWall(t) ? 0 : 0.3 + (S.R - r) * 0.02; }
      }
    };
    const K = {
      remove(t, delay, m) {
        if (m && m.mode === 'pet') delay = hold + 0.35;
        dying.push({ t, delay: delay || 0, m, age: 0 });
        hold = Math.max(hold, (delay || 0) + 0.18);
      },
      created(t, r, c, delay) { t.gx = c; t.gy = r; t.sc = 0; t.vy = 0; E.tween(t, { sc: 1 }, 0.35, { delay, ease: E.ease.outBack }); },
      fx(f) { fxs.push(Object.assign({ age: 0 }, f)); hold = Math.max(hold, f.delay + 0.3); },
      hurt(t, delay) { E.after(delay, () => { t.vhp = t.hp; t.sc = 0.8; E.tween(t, { sc: 1 }, 0.2, { ease: E.ease.outBack }); E.burst(cx(t.gx), cy(t.gy), ['#8a5a2b', '#c98b48'], 6, { size: 8 }); E.sfx('land', 1.5); }); },
      transform(old, pet, delay) {
        pet.gx = old.gx; pet.gy = old.gy; pet.vy = 0; pet.hidden = delay;
        dying.push({ t: old, delay, age: 0, m: { mode: 'cage' } });
        E.after(delay, () => { E.floatText(cx(pet.gx), cy(pet.gy) - 20, '¡Libre!', '#ffe14d', 30); E.sfx('collect', 1.3); });
      },
      collect(type, key, t, delay) {
        if (type === 'pet') delay = hold;
        E.after(delay + 0.05, () => { if (E.goal(type, key, 1, cx(t.gx), cy(t.gy))) E.sfx(type === 'pet' ? 'rescue' : 'collect', 1 + Math.random() * 0.2); });
      },
      sound(size) { E.sfx('pop', 0.8 + Math.min(size, 10) * 0.05); },
      bonus(t, pts) { E.after(0.2, () => { E.floatText(cx(t.gx), cy(t.gy) - 30, '+' + pts, '#ffe14d', 34); E.sfx('collect', 1.4); }); },
      recolor(t) {
        if (!t) { E.floatText(E.W / 2, by + V * ts * 0.4, '¡Cohete cargado!', '#fff', 36); return; }
        t.sc = 0.5; E.tween(t, { sc: 1 }, 0.4, { ease: E.ease.outBack }); E.burst(cx(t.gx), cy(t.gy), '#fff', 6, { size: 8 });
      },
      spawn(t, r, c, k) { t.gx = c; t.gy = camFor(S, V) - 1 - k; t.vy = 0; t.delay = 0; },
      bfly(r, c) { E.after(0.1, () => { E.burst(cx(c), cy(r), ['#7ad7ff', '#ff9ff3', '#fff'], 14, { size: 12, shape: 'star' }); E.floatText(cx(c), cy(r) - 30, '🦋 ¡Al rescate!', '#fff', 30); }); },
    };

    function cellAt(x, y) {
      const c = Math.floor((x - bx) / ts), r = Math.floor((y - by) / ts + cam);
      if (c < 0 || c >= S.C || r < 0 || r >= S.R) return null;
      if (y < by || y > by + V * ts) return null;
      return [r, c];
    }
    function afterAction() {
      hintTiles = null;
      for (const [t] of all()) if (!(t.delay > hold)) t.delay = hold;
      if (!hasMove(S, V)) P.needHelp = true;
    }
    function rocketHit(x, y) { return Math.hypot(x - (bx + S.C * ts - 40), y - rackY) < 46; }
    P.down = function (x, y) {
      if (P.busy || P.finaleOn) return;
      if (rocketHit(x, y)) {
        if (S.charge >= CHARGE_FULL) { rocketAim = !rocketAim; E.sfx('click'); }
        else { E.sfx('bad'); E.floatText(x - 60, y - 40, 'Haz grupos grandes para cargarlo', '#fff', 22); }
        return;
      }
      const rc = cellAt(x, y);
      if (!rc) return;
      const [r, c] = rc;
      if (rocketAim) {
        rocketAim = false; S.charge = 0;
        blastColumn(S, c, r, K); E.sfx('rocket'); E.shake(0.2);
        settle(S, K); afterAction();
        return;
      }
      const bst = E.activeBooster();
      if (bst) { E.takeBooster(); useBooster(bst, r, c); return; }
      const t = S.grid[r][c];
      if (act(S, r, c, K)) { P.moves--; afterAction(); }
      else if (t) {
        E.sfx('bad');
        t.rot = 0;
        E.tween(t, { rot: 0.25 }, 0.06, { done: () => E.tween(t, { rot: -0.25 }, 0.1, { done: () => E.tween(t, { rot: 0 }, 0.06) }) });
      }
    };
    function useBooster(id, r, c) {
      if (id === 'hammer') {
        const t = S.grid[r][c];
        if (!t || t.kind === 'pet') return;
        if (t.kind === 'cage') t.hp = 1;
        damage(S, r, c, 0, K);
        E.sfx('bomb'); E.shake(0.2);
      } else if (id === 'column') { blastColumn(S, c, r, K); E.sfx('rocket'); }
      else if (id === 'row') {
        K.fx({ type: 'rocket', dir: 'h', r, c, delay: 0 });
        for (let cc = 0; cc < S.C; cc++) damage(S, r, cc, Math.abs(cc - c) * 0.03, K);
        E.sfx('rocket');
      } else if (id === 'colorpop') {
        const t = S.grid[r][c];
        if (!t || t.kind !== 'block') return;
        const [r0, r1] = visRows(S, V);
        for (let rr = r0; rr <= r1; rr++) for (let cc = 0; cc < S.C; cc++) { const o = S.grid[rr][cc]; if (o && o.kind === 'block' && o.color === t.color) damage(S, rr, cc, 0.02 * (Math.abs(rr - r) + Math.abs(cc - c)), K); }
        E.sfx('magic');
      }
      settle(S, K);
      afterAction();
    }
    P.booster = function () {};
    P.rescue = function () { helpOut(S, K, V); E.sfx('magic'); P.dead = false; };
    // "¿Qué es esto?": explicación de la pieza tocada
    P.describe = function (x, y) {
      const rc = cellAt(x, y);
      if (!rc) return null;
      const o = S.grid[rc[0]][rc[1]];
      if (!o) return null;
      if (o.wire) return o.vine ? 'Enredadera: quita bloques a su lado para cortarla' : 'Alambre: quita bloques a su lado para cortarlo';
      if (o.virus) return 'Virus: si no lo quitas, se contagia a otro bloque';
      if (o.bfly) return 'Mariposa: combina su bloque y llevará una mascota al suelo';
      if (o.det != null) return 'Detonador: cuenta las jugadas y al llegar a 0 explota';
      if (o.mult) return 'Bloque multiplicador: dobla tus puntos';
      if (o.rainbow) return 'Bloque arcoíris: combina con cualquier color';
      const K2 = { pet: 'Mascota: bájala hasta el suelo para rescatarla', cage: o.carrier ? 'Transportín: combina a su lado para liberar a la mascota' : 'Jaula: rómpela explotando bloques a su lado',
        block: 'Toca 2 o más bloques iguales juntos', black: 'Bloque negro: solo se rompe con bombas y cohetes', cbomb: 'Bomba de color: tócala y quita los bloques de su color',
        lblast: 'Rompelíneas: tócalo y quita su fila', roto: 'Rotobomba: gira en cada jugada; tócala cuando apunte donde quieras', dblast: 'Empujabloques: tócalo y quita bloques en su dirección',
        paint: 'Cubo de pintura: tócalo para pintar de su color los bloques de al lado', freezer: 'Alambrador: pone alambre a sus vecinos', gbomb: 'Bomba en cristal: bájala hasta el suelo y explotará',
        gdiam: 'Diamante: bájalo hasta el suelo y te dará 1000 puntos', gkey: 'Llave: bájala hasta el suelo para abrir los candados', lock: 'Candado: lo abre la llave',
        fbox: 'Caja de fuego: júntala con una de hielo para descubrir las bombas', ibox: 'Caja de hielo: júntala con una de fuego para descubrir las bombas',
        vflower: 'Flor de enredadera: quita bloques a su lado para romperla', wall: 'Suelo de piedra: las mascotas y los bloques caen por sus agujeros' };
      return K2[o.kind] || null;
    };
    // potenciadores de inicio: bloques especiales en la parte de abajo y cohete cargado
    P.startBonus = function (list, rnd) {
      for (const id of list) {
        if (id === 'charge') { S.charge = CHARGE_FULL; continue; }
        const opts = [];
        for (let r = Math.floor(S.R / 2); r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = S.grid[r][c]; if (o && o.kind === 'block' && !o.wire && !o.virus && !o.bfly && o.det == null) opts.push([r, c]); }
        if (!opts.length) return;
        const [r, c] = opts[rnd.int(opts.length)];
        S.grid[r][c] = { id: uid++, kind: id, color: S.grid[r][c].color };
      }
    };
    P.hint = function () {
      if (S.charge >= CHARGE_FULL) { rocketAim = false; return; }
      let best = null;
      const seen = new Set();
      const [r0, r1] = visRows(S, V);
      for (let r = r0; r <= r1; r++) for (let c = 0; c < S.C; c++) {
        const o = S.grid[r][c];
        if (!o || seen.has(o) || o.kind !== 'block') continue;
        const g = group(S, r, c);
        g.forEach(([rr, cc]) => seen.add(S.grid[rr][cc]));
        if (g.length >= 2 && (!best || g.length > best.length)) best = g;
      }
      if (best) hintTiles = { tiles: best.map(([r, c]) => S.grid[r][c]), t: 0 };
    };

    P.update = function (dt) {
      P.score = S.score || 0;
      if (hold > 0) hold -= dt;
      let moving = false;
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const t = S.grid[r][c];
        if (!t) continue;
        if (t.gx == null) { t.gx = c; t.gy = r; }
        if (t.hidden > 0) { t.hidden -= dt; continue; }
        if (t.delay > 0) { t.delay -= dt; moving = true; continue; }
        if (Math.abs(t.gx - c) > 0.01) { t.gx += Math.sign(c - t.gx) * Math.min(Math.abs(c - t.gx), 9 * dt); moving = true; } else t.gx = c;
        if (t.gy < r - 0.01) {
          t.vy = (t.vy || 0) + 50 * dt;
          t.gy += t.vy * dt;
          moving = true;
          if (t.gy >= r) { t.gy = r; t.vy = 0; }
        } else if (t.gy > r) { t.gy = r; t.vy = 0; }
      }
      for (let i = dying.length - 1; i >= 0; i--) {
        const d = dying[i];
        if (d.m && d.m.mode === 'pet' && d.age === 0) {
          const t = d.t;
          if (t.gy < d.m.r) { t.vy = (t.vy || 0) + 50 * dt; t.gy = Math.min(d.m.r, t.gy + t.vy * dt); }
          if (Math.abs(t.gx - d.m.c) > 0.01) t.gx += Math.sign(d.m.c - t.gx) * Math.min(Math.abs(d.m.c - t.gx), 9 * dt);
        }
        if (d.delay > 0) { d.delay -= dt; continue; }
        if (d.age === 0) startDeath(d);
        d.age += dt;
        if (d.age > (d.m && d.m.mode === 'pet' ? 0.7 : 0.3)) dying.splice(i, 1);
      }
      for (let i = fxs.length - 1; i >= 0; i--) {
        const f = fxs[i];
        if (f.delay > 0) { f.delay -= dt; continue; }
        f.age += dt;
        if (f.age > 0.6) fxs.splice(i, 1);
      }
      chargeShown += (Math.min(1, S.charge / CHARGE_FULL) - chargeShown) * Math.min(1, dt * 4);
      if (!moving && hold <= 0) updateCam();
      if (Math.abs(cam - camTarget) > 0.001) { cam += (camTarget - cam) * Math.min(1, dt * 4); if (Math.abs(cam - camTarget) < 0.01) cam = camTarget; moving = true; }
      P.busy = moving || dying.length > 0 || hold > 0 || !!P.finaleOn;
      if (!P.busy && P.needHelp) {
        P.needHelp = false;
        if (P.goals && P.goals.some((gl) => gl.left > 0)) {
          E.floatText(E.W / 2, by + V * ts * 0.4, '¡No quedan jugadas!', '#fff', 40);
          E.shake(0.3); E.sfx('bomb');
          const cr = crushTop(S, K);
          if (cr.pets) { P.dead = true; P.deadMsg = '¡Se ha perdido una mascota!'; }
          else if (!hasMove(S, V)) P.needHelp = true;
          P.busy = true;
        }
      }
      if (hintTiles) hintTiles.t += dt;
    };
    function startDeath(d) {
      const t = d.t;
      d.x = cx(t.gx != null ? t.gx : 0); d.y = cy(t.gy != null ? t.gy : 0);
      d.age = 0.0001;
      if (d.m && d.m.mode === 'crush') { E.burst(d.x, d.y, ['#555', '#999', '#ccc'], 10, { size: 12 }); if (t.kind === 'pet' || t.kind === 'cage') E.floatText(d.x, d.y - 30, '¡Oh, no!', '#ff5050', 30); return; }
      if (t.kind === 'block') E.burst(d.x, d.y, [COLORS[t.color], E.shade(COLORS[t.color], 0.4)], 7, { size: 11 });
      else if (t.kind === 'black') E.burst(d.x, d.y, ['#444', '#888'], 10, { size: 12 });
      else if (t.kind === 'cage') E.burst(d.x, d.y, ['#8a5a2b', '#c98b48', '#e0b07a'], 12, { size: 12 });
      else if (t.kind === 'pet') { E.floatText(d.x, d.y - 30, '¡Rescatado!', '#ffe14d', 34); E.burst(d.x, d.y, ['#ff6fae', '#ffe14d', '#fff'], 14, { shape: 'star', size: 14 }); }
      else if (t.kind === 'gbomb') { E.burst(d.x, d.y, ['#ff9f1c', '#ffd23f', '#cfefff'], 18, { size: 14, speed: 400 }); E.shake(0.3); E.sfx('bomb'); }
    }

    P.draw = function (g) {
      const top = by, bottom = by + V * ts;
      g.save();
      E.rr(g, bx - 8, top - 8, S.C * ts + 16, V * ts + 16, 18);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
      E.rr(g, bx - 2, top - 2, S.C * ts + 4, V * ts + 4, 14);
      g.fillStyle = 'rgba(60,110,70,0.35)'; g.fill();
      const groundY = cy(S.R - 1) + ts / 2;
      if (groundY <= bottom + 2) {
        g.fillStyle = '#5fb84a';
        E.rr(g, bx - 8, groundY, S.C * ts + 16, 26, 10); g.fill();
        g.fillStyle = '#7fd36a'; g.fillRect(bx - 8, groundY, S.C * ts + 16, 8);
        E.text(g, '¡Bájalos hasta aquí!', E.W / 2, groundY + 15, 16, '#fff', { stroke: '#2d6b3a', sw: 4 });
      }
      g.beginPath(); g.rect(bx - 4, top - 4, S.C * ts + 8, V * ts + 8); g.clip();
      const hset = hintTiles && hintTiles.t > 0 ? new Set(hintTiles.tiles) : null;
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const t = S.grid[r][c];
        if (!t || t.gx == null || t.hidden > 0) continue;
        const x = cx(t.gx), y = cy(t.gy);
        if (y < top - ts || y > bottom + ts) continue;
        if (hset && hset.has(t)) { const k = 1 + Math.abs(Math.sin(hintTiles.t * 5)) * 0.12; const o = t.sc; t.sc = (o == null ? 1 : o) * k; drawTile(g, t, x, y, ts); t.sc = o; }
        else drawTile(g, t, x, y, ts);
      }
      if (rocketAim) { g.fillStyle = 'rgba(255,240,150,0.18)'; g.fillRect(bx, top, S.C * ts, V * ts); }
      for (const d of dying) {
        const t = d.t;
        if (d.age <= 0) { if (t.gx != null) drawTile(g, t, cx(t.gx), cy(t.gy), ts); continue; }
        const k = Math.min(1, d.age / 0.25);
        const o = t.sc;
        if (d.m && d.m.mode === 'pet') { const kk = Math.min(1, d.age / 0.7); t.sc = 1 + kk * 0.6; t.alpha = 1 - kk; drawTile(g, t, d.x, d.y - kk * 90, ts); }
        else { t.sc = 1 + k * 0.3; t.alpha = 1 - k; drawTile(g, t, d.x, d.y, ts); }
        t.sc = o; t.alpha = 1;
      }
      g.restore();
      // filas que quedan por debajo (contador como en Pet Rescue)
      const below = Math.max(0, Math.round(S.R - V - cam));
      if (below > 0) { E.emoji(g, '⬇️', bx + S.C * ts - 18, bottom - 18, 28); E.text(g, String(below), bx + S.C * ts - 46, bottom - 18, 24, '#fff', { stroke: '#2d6b3a', sw: 5 }); }
      for (const f of fxs) {
        if (f.delay > 0) continue;
        const k = Math.min(1, f.age / 0.5);
        const x0 = cx(f.c), y0 = cy(f.r);
        g.save();
        g.globalAlpha = 1 - k;
        if (f.type === 'rocket') {
          g.fillStyle = 'rgba(255,240,180,0.85)';
          const dist = k * S.R * ts;
          if (f.dir === 'h') g.fillRect(x0 - dist, y0 - ts * 0.18, dist * 2, ts * 0.36);
          else g.fillRect(x0 - ts * 0.18, y0 - dist, ts * 0.36, dist * 2);
        } else {
          g.beginPath(); g.arc(x0, y0, ts * (0.5 + k * f.rad), 0, 7);
          g.fillStyle = 'rgba(255,220,120,0.6)'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke();
        }
        g.restore();
      }
      // el cohete recargable con el gatito ayudante
      const full = S.charge >= CHARGE_FULL;
      const barX = bx + 70, barW = Math.max(40, S.C * ts - 150);
      E.emoji(g, '🐱', bx + 32, rackY, 54);
      E.rr(g, barX, rackY - 14, barW, 28, 14); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
      E.rr(g, barX + 4, rackY - 10, (barW - 8) * chargeShown, 20, 10); g.fillStyle = full ? '#ffb020' : '#ff7a1a'; g.fill();
      const rx = bx + S.C * ts - 40, rs = full ? 64 + Math.sin(E.t * 8) * 5 : 56;
      g.beginPath(); g.arc(rx, rackY, 38, 0, 7); g.fillStyle = full ? '#fff1b0' : 'rgba(255,255,255,0.6)'; g.fill();
      g.lineWidth = rocketAim ? 6 : 3; g.strokeStyle = rocketAim ? '#ff7a1a' : '#2f8a4a'; g.stroke();
      g.save(); g.translate(rx, rackY); g.rotate(-Math.PI / 4); g.drawImage(E.emojiSprite('🚀', rs), -rs / 2, -rs / 2, rs, rs); g.restore();
      if (full && !rocketAim) E.text(g, '¡Tócalo!', rx, rackY - 50, 20, '#fff', { stroke: '#c75a00', sw: 5 });
      if (rocketAim) E.text(g, 'Toca la columna que quieres limpiar', E.W / 2, top + 26, 24, '#fff', { stroke: '#c75a00', sw: 6 });
    };
    P.cellXY = (r, c) => [cx(c), cy(r)];
    P.rocketXY = () => [bx + S.C * ts - 40, rackY];
    // Al ganar, los grupos que quedan explotan solos y dan 10·n² puntos cada uno
    P.finale = function (done) {
      E.floatText(E.W / 2, by + ts * 2, '¡Todos a salvo!', '#ffe14d', 46);
      E.sfx('rescue');
      P.finaleOn = true;
      let k = 0;
      const step = () => {
        if (hold > 0 || dying.length) { E.after(0.1, step); return; }
        let best = null;
        const seen = new Set();
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
          const o = S.grid[r][c];
          if (!o || o.kind !== 'block' || seen.has(o)) continue;
          const g = group(S, r, c); g.forEach(([rr, cc]) => seen.add(S.grid[rr][cc]));
          if (g.length >= 2 && (!best || g.length > best.length)) best = g;
        }
        if (!best || k >= 12) { E.after(0.4, () => { P.finaleOn = false; done(); }); return; }
        k++;
        const pts = 10 * best.length * best.length;
        const [r0, c0] = best[0];
        best.forEach(([rr, cc], i) => { const t = S.grid[rr][cc]; S.grid[rr][cc] = null; K.remove(t, i * 0.02); });
        S.score = (S.score || 0) + pts;
        E.floatText(cx(c0), cy(r0) - 20, '+' + pts, '#ffe14d', 32);
        E.sfx('pop', 1 + k * 0.04);
        settle(S, K);
        E.after(0.3, step);
      };
      E.after(0.8, step);
    };
    return P;
  };
})();
