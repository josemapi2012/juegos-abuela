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
    const skw = E.skin('wire'); if (skw) return E.sprite('wire' + n, ts, ts, (g, w, h) => skw(g, w, h, n));
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
    const skc = E.skin('cage'); if (skc) return E.sprite('cage' + hp, ts, ts, (g, w, h) => skc(g, w, h, hp));
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
      const ps = s * (t.kind === 'cage' ? 0.86 : 1.08);
      const skA = E.skin('petAnim'); // el estilo puede animar la mascota (reposo o cayendo)
      if (!(skA && skA(g, t, ps))) { g.rotate(Math.sin(E.t * 3 + t.id) * 0.06); g.drawImage(E.emojiSprite(t.pet, ps), -ps / 2, -ps / 2, ps, ps); }
      const skCar = E.skin('carrierBox'); // el estilo puede dibujar el transportín entero
      if (t.kind === 'cage' && t.carrier && skCar && skCar(g, s)) { /* dibujado */ }
      else if (t.kind === 'cage' && t.carrier) { const cs = s * 0.5; g.drawImage(E.emojiSprite('🧳', cs), s * 0.5 - cs, s * 0.5 - cs, cs, cs); }
      else if (t.kind === 'cage') g.drawImage(cageSprite(t.vhp != null ? t.vhp : t.hp, ts), -s / 2, -s / 2, s, s);
    } else {
      const skt = E.skin('tile');
      const spr = (skt && skt(t, ts, COLORS)) || (t.kind === 'block' ? blockSprite(t.color, ts) : t.kind === 'black' ? blackSprite(ts) : t.kind === 'cbomb' ? colorBombSprite(t.color, ts)
        : t.kind === 'lblast' ? lineBlastSprite(t.color, ts) : t.kind === 'roto' || t.kind === 'dblast' ? rotoSprite(t.color, t.dir, ts) : t.kind === 'gdiam' ? glassDiamSprite(ts) : t.kind === 'paint' ? paintSprite(t.color, ts) : t.kind === 'freezer' ? freezerSprite(ts) : t.kind === 'lock' ? lockSprite(ts) : t.kind === 'gkey' ? glassKeySprite(ts) : t.kind === 'fbox' || t.kind === 'ibox' ? boxSprite(t.kind, ts) : t.kind === 'vflower' ? flowerSprite(t.dir, ts) : t.kind === 'wall' ? wallSprite(ts) : glassBombSprite(ts));
      g.drawImage(spr, -s / 2, -s / 2, s, s);
      const skm = E.skin('blockMarks'); // el estilo puede dibujar arcoíris, multiplicador y virus a su manera
      const marks = skm && skm(g, t, s);
      if (t.rainbow && !marks) { const rs = s * 0.9; g.drawImage(E.emojiSprite('🌈', rs * 0.55), -rs * 0.28, -rs * 0.28, rs * 0.55, rs * 0.55); }
      if (t.mult && !marks) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(s * 0.3, -s * 0.3, s * 0.18, 0, 7); g.fill(); E.text(g, 'x' + t.mult, s * 0.3, -s * 0.29, s * 0.2, '#7a3b00', { stroke: false }); }
      if (t.wire && t.vine && marks && skm(g, Object.assign({}, t, { kind: 'vineCover' }), s)) { /* enredadera del estilo */ }
      else if (t.wire && t.vine) { const vs = s * 0.8; g.globalAlpha *= 0.9; g.drawImage(E.emojiSprite('🌿', vs), -vs / 2, -vs / 2, vs, vs); g.globalAlpha = t.alpha != null && t.alpha < 1 ? Math.max(0, t.alpha) : 1; }
      else if (t.wire) { const ws = s; g.drawImage(wireSprite(t.wire, ts), -ws / 2, -ws / 2, ws, ws); }
      if (t.bfly && !marks) { const bs = s * 0.5; g.save(); g.rotate(Math.sin(E.t * 5 + t.id) * 0.25); g.drawImage(E.emojiSprite('🦋', bs), -bs / 2, -bs / 2, bs, bs); g.restore(); }
      if (t.det != null && !marks) { // detonador: cuenta atrás; a 0 explota
        g.beginPath(); g.arc(-s * 0.26, -s * 0.26, s * 0.2, 0, 7); g.fillStyle = t.det <= 1 ? '#d62828' : '#2b2b33'; g.fill();
        g.lineWidth = s * 0.04; g.strokeStyle = '#fff'; g.stroke();
        E.text(g, String(t.det), -s * 0.26, -s * 0.25, s * 0.24, '#fff', { stroke: false });
      }
      if (t.virus && !marks) { const vs = s * 0.42; g.drawImage(E.emojiSprite('🦠', vs), s * 0.5 - vs, -s * 0.5, vs, vs); }
    }
    g.restore();
  }
  GAME.drawGoalIcon = function (g, gl, x, y, s) {
    if (gl.type === 'pet') g.drawImage(E.emojiSprite(gl.icon || '🐶', s), x - s / 2, y - s / 2, s, s);
    else if (gl.type === 'blocks') g.drawImage(E.emojiSprite('🧱', s), x - s / 2, y - s / 2, s, s);
    else { const skt = E.skin('tile'); g.drawImage((skt && skt({ kind: 'block', color: gl.key }, s, COLORS)) || blockSprite(gl.key, s), x - s / 2, y - s / 2, s, s); }
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
        S.grid[r][c] = null; rem(S, K, o, 0.2, { mode: 'pet', r: S.R - 1, c }); K.collect('pet', undefined, o, 0.2); S.score = (S.score || 0) + 1000;
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
    K.fx({ type: 'bomb', r, c, rad: 1.5, delay, ev: ['BombBlast', 'BombShockwave'] });
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) damage(S, r + dr, c + dc, delay + 0.05, K);
  }
  // bomba de color: todos los bloques de su color; rompelíneas: su fila entera
  function fireSpecial(S, r, c, o, delay, K) {
    rem(S, K, o, delay);
    if (o.kind === 'cbomb') {
      K.fx({ type: 'bomb', r, c, rad: 1, delay, ev: ['ColorpopRed', 'ColorpopGreen', 'ColorpopBlue', 'ColorpopYellow', 'ColorpopPurple'][o.color || 0] });
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const q = S.grid[rr][cc]; if (q && q.kind === 'block' && q.color === o.color) damage(S, rr, cc, delay + 0.2 + 0.02 * (Math.abs(rr - r) + Math.abs(cc - c)), K); }
    } else if (o.kind === 'roto' || o.kind === 'dblast') {
      // rotobomba: dispara en la dirección a la que apunta
      const [dr, dc] = DIRS[o.dir];
      K.fx({ type: 'rocket', dir: dr ? 'v' : 'h', r, c, delay, ev: ['RotoblasterUp', 'RotoblasterRight', 'RotoblasterDown', 'RotoblasterLeft'][o.dir] });
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
      K.fx({ type: 'rocket', dir: 'h', r, c, delay, ev: 'block_lineblast_force' });
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
    K.fx({ type: 'rocket', dir: 'v', r, c, delay: 0, ev: ['ColumnBlast', 'epicColumnLaunch'] });
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
    // Pet Rescue (CPRRuleMatch, FUN_0151c0dc): 10 × n² × la suma de los multiplicadores del grupo (al menos 1)
    const mult = Math.max(1, grp.reduce((m, [rr, cc]) => m + (S.grid[rr][cc].mult || 0), 0));
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
    S.score = (S.score || 0) + 10 * grp.length * grp.length * mult;
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
        if (o && o.kind === 'pet') { S.grid[S.R - 1][c] = null; rem(S, K, o, 0, { mode: 'pet', r: S.R - 1, c }); K.collect('pet', undefined, o, 0); S.score = (S.score || 0) + 1000; any = true; }
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

  // tiempos de la partida; el estilo puede cambiarlos (E.skin('timing'))
  const TM = () => Object.assign({ gravity: 50, bounce: 0, brighten: 0 }, E.skin('timing') || {});
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
    // como en Pet Rescue: solo los niveles de puntos tienen movimientos (los de su tramo, TRAMOS.mov);
    // rescate y clásico no tienen límite. En todos hace falta la 1ª estrella de puntos para ganar.
    if (spec.mode === 'score') {
      const r2 = E.rng(n * 7741 + 3);
      const target = Math.round(quant(tramo(n).mov, r2()));
      // las mascotas caen al azar: medimos con más partidas y nos quedamos con la peor
      const extra = [yield* botRunG(spec, n * 31 + 7), yield* botRunG(spec, n * 31 + 8)].map((x) => x.moves);
      const worst = Math.max(spec.botMoves, ...extra.filter((m) => m < 999));
      // si el bot va muy sobrado se recortan movimientos para que siga siendo un reto
      // (calibrado 23-10-2026: con 1.4/1.2 el robot ganaba el 96% de los de puntos; con 1.15/1.02 se busca el 75-80%)
      spec.moves = E.clamp(Math.max(Math.min(target, Math.ceil(worst * 1.15) + 2), Math.ceil(worst * 1.02) + 1), 15, 80);
    } else spec.moves = Infinity;
    const r500 = (v) => Math.max(500, Math.round(v / 500) * 500);
    // (calibrado 23-10-2026: con la 1ª estrella al 50% de lo que saca el bot se ganaba el 94% de los de puntos)
    spec.starScores = [r500(spec.botScore * 0.8), r500(spec.botScore * 0.92), r500(spec.botScore * 1.05)];
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
  // Tramos medidos en los 10 437 niveles reales de Pet Rescue Saga (tools/pr_niveles.py; ver analisis/petrescue_niveles.md):
  // modos, niveles que reponen bloques, movimientos (p10 p25 p50 p75 p90), colores (3/4/5), columnas (7/8/9),
  // filas del tablero (p25 p50 p75), mascotas a salvar (p25 p50 p75) y probabilidad de cada pieza
  const TRAMOS = [
    {to:20,mode:{rescue:0.65,score:0.35},refill:0.35,mov:[25,30,50,70,75],col:[0.35,0.25,0.15],cols:[0.1,0.2,0.6],rows:[9,9,20],pets:[4,5,6],el:{cbomb:0.4,gbomb:0.25}},
    {to:50,mode:{score:0.47,rescue:0.37,classic:0.17},refill:0.47,mov:[28,35,45,55,70],col:[0.17,0.23,0.2],cols:[0.13,0.07,0.73],rows:[9,9,18],pets:[5,7,9],el:{cbomb:0.6,gbomb:0.6,lock:0.47,gdiam:0.33,black:0.33,lblast:0.13}},
    {to:100,mode:{rescue:0.5,score:0.32,classic:0.14,hybrid:0.04},refill:0.36,mov:[25,32,40,55,66],col:[0.14,0.24,0.04],cols:[0.02,0.12,0.82],rows:[9,9,28],pets:[4,5,6],el:{gdiam:0.54,black:0.5,cbomb:0.44,lock:0.38,lblast:0.36,gbomb:0.24,cage:0.24,wire:0.02}},
    {to:200,mode:{rescue:0.32,classic:0.26,score:0.26,hybrid:0.16},refill:0.42,mov:[20,35,40,50,50],col:[0.17,0.17,0.12],cols:[0.06,0.14,0.77],rows:[9,16,24],pets:[3,4,6],el:{cbomb:0.61,gdiam:0.55,black:0.49,lblast:0.48,lock:0.4,gbomb:0.3,virus:0.19,cage:0.14,paint:0.07}},
    {to:500,mode:{score:0.39,rescue:0.25,hybrid:0.2,classic:0.17},refill:0.59,mov:[27,30,40,50,50],col:[0.15,0.28,0.15],cols:[0.04,0.06,0.88],rows:[9,9,20],pets:[4,5,8],el:{black:0.42,gdiam:0.38,gbomb:0.33,cbomb:0.32,lock:0.29,wire:0.27,lblast:0.23,paint:0.21,roto:0.19,det:0.17,cage:0.16,rainbow:0.07,freezer:0.06,ibox:0.04,virus:0.04}},
    {to:1000,mode:{score:0.45,rescue:0.24,classic:0.18,hybrid:0.13},refill:0.59,mov:[30,40,45,50,50],col:[0.09,0.42,0.13],cols:[0.03,0.11,0.84],rows:[9,9,16],pets:[4,6,10],el:{gdiam:0.45,black:0.35,wire:0.34,lock:0.27,gbomb:0.27,cbomb:0.24,roto:0.21,lblast:0.16,paint:0.12,cage:0.12,det:0.08,virus:0.07,ibox:0.07,rainbow:0.07,freezer:0.06,bfly:0.06}},
    {to:2000,mode:{score:0.47,classic:0.27,rescue:0.18,hybrid:0.09},refill:0.56,mov:[30,35,45,50,50],col:[0.09,0.5,0.15],cols:[0.05,0.24,0.7],rows:[9,9,16],pets:[4,5,8],el:{gdiam:0.32,black:0.28,roto:0.28,vflower:0.27,gbomb:0.24,wire:0.24,lock:0.17,det:0.13,cbomb:0.12,virus:0.11,bfly:0.1,freezer:0.1,paint:0.1,cage:0.09,lblast:0.06,ibox:0.05,rainbow:0.05}},
    {to:5000,mode:{score:0.42,classic:0.25,rescue:0.19,hybrid:0.14},refill:0.56,mov:[24,28,32,39,40],col:[0.17,0.21,0.12],cols:[0.04,0.05,0.89],rows:[9,9,18],pets:[3,5,8],el:{wire:0.47,gdiam:0.46,black:0.3,det:0.23,vflower:0.19,roto:0.18,lock:0.16,gbomb:0.15,ibox:0.14,freezer:0.13,bfly:0.13,virus:0.12,cage:0.1,paint:0.09,rainbow:0.06,cbomb:0.04,lblast:0.02}},
    {to:1e9,mode:{score:0.55,rescue:0.23,classic:0.18,hybrid:0.04},refill:0.59,mov:[21,24,28,30,35],col:[0.24,0.13,0.08],cols:[0.07,0.04,0.87],rows:[9,9,14],pets:[4,6,10],el:{gdiam:0.55,det:0.42,black:0.35,wire:0.31,roto:0.19,lock:0.18,bfly:0.14,virus:0.14,ibox:0.14,vflower:0.12,cage:0.11,freezer:0.07,paint:0.07,gbomb:0.06,rainbow:0.06,cbomb:0.04,lblast:0.02}},
  ];
  const tramo = (n) => TRAMOS.find((t) => n <= t.to);
  // nivel en que Pet Rescue estrena cada cosa (primera aparición en sus niveles). Las que no salen en sus niveles
  // (empujabloques, multiplicadores, transportines y suelo de piedra con agujeros) se dejan para más adelante
  const INTRO = { refill: 6, score: 6, cbomb: 13, gbomb: 14, gdiam: 28, lock: 28, classic: 30, black: 33, lblast: 46, wire: 51, hybrid: 69, cage: 74,
    virus: 103, paint: 193, det: 238, roto: 283, freezer: 313, rainbow: 358, ibox: 448, dblast: 500, mult: 600, carrier: 700, wall: 800, bfly: 883, vflower: 1093 };
  const pickW = (rng, ws) => { const s = ws.reduce((a, b) => a + b, 0); let x = rng() * s; for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x < 0) return i; } return ws.length - 1; };
  const quant = (q, u) => { const x = u * (q.length - 1), i = Math.min(q.length - 2, Math.floor(x)); return q[i] + (q[i + 1] - q[i]) * (x - i); };
  function* genLevelG(n, attempt) {
    const rng = E.rng(n * 3266489917 + 101 + attempt * 4243);
    const d = E.difficulty(n) * Math.pow(0.8, attempt);
    const T = tramo(n);
    // cada pieza sale a partir del nivel en que la estrena Pet Rescue (ese nivel seguro) y luego con su frecuencia en el tramo
    const on = (k) => n === INTRO[k] || (n > INTRO[k] && rng() < (T.el[k] != null ? T.el[k] : 0.05));
    const C = n < 5 ? 7 : 7 + pickW(rng, T.cols);
    const V = Math.floor(530 / Math.min(580 / C, 76)); // filas que caben (dejando sitio al cohete)
    // modo con la frecuencia de su tramo: rescate (sin límite), puntos (reponen bloques y hay movimientos),
    // clásico (despeja todos los bloques) e híbrido (salva las mascotas y despeja los bloques)
    const modes = Object.keys(T.mode).filter((m) => n >= (INTRO[m] || 1));
    let mode = n === INTRO.score ? 'score' : n === INTRO.classic ? 'classic' : n === INTRO.hybrid ? 'hybrid' : modes[pickW(rng, modes.map((m) => T.mode[m]))];
    if (n < INTRO.score) mode = 'rescue';
    const refill = mode === 'score';
    const classic = mode === 'classic';
    // la mayoría de los tableros caben en una pantalla; algunos son altos (filas p25 p50 p75 de su tramo)
    const extra = refill || n < 6 ? 0 : Math.max(0, Math.round(quant(T.rows, rng())) - V);
    const R = V + extra;
    const colors = n < 4 ? 3 : 3 + pickW(rng, T.col);
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
    const petsWant = Math.round(quant(T.pets, rng()));
    const npets = classic ? 0 : n < 3 ? 2 : Math.min(C - 1, refill ? 2 + rng.int(2) : petsWant);
    const step = C / Math.max(1, npets);
    let placedPets = 0;
    for (let i = 0; i < npets; i++) {
      const c = Math.min(C - 1, Math.floor(i * step + step / 2));
      const r = R - 1 - heights[c];
      if (r >= 0) { cells[r][c] = { kind: 'pet', pet: rng() < 0.6 ? petType : rng.pick(PETS) }; placedPets++; }
    }
    // jaulas con animalito dentro (desde el nivel 12)
    let cages = 0;
    if (!classic && on('cage')) {
      const want = 1 + Math.round(d * 2);
      for (let i = 0; i < 40 && cages < want; i++) {
        const r = rng.range(Math.floor(R * 0.35), R - 3), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'cage', pet: rng.pick(petTypes), hp: d > 0.5 && rng() < 0.4 ? 2 : 1 }; cages++; }
      }
    }
    // bloques negros (solo se rompen con bombas, cohete o ayudas) desde el nivel 18
    if (on('black')) {
      const nb = attempt > 4 ? 1 : 2 + Math.round(d * 4);
      for (let i = 0, k = 0; i < 60 && k < nb; i++) {
        const r = rng.range(Math.floor(R * 0.5), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'black' }; k++; }
      }
    }
    // bombas en cristal desde el nivel 8
    let bombRate = 0;
    if (on('gbomb')) {
      const nb = 1 + Math.round(d * 2 + rng());
      for (let i = 0; i < nb; i++) {
        const r = rng.range(Math.floor(R * 0.2), Math.floor(R * 0.6)), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') cells[r][c] = { kind: 'gbomb' };
      }
      if (refill) bombRate = 0.02;
    }
    // bloques especiales sueltos (bomba de color 88% y rompelíneas 69% en su tramo) desde el 14
    for (const kind of ['cbomb', 'lblast']) {
      if (!on(kind)) continue;
      const ns = 1 + (rng() < 0.4 ? 1 : 0);
      for (let i = 0, k = 0; i < 40 && k < ns; i++) {
        const r = rng.range(Math.floor(R * 0.3), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind, color: cells[r][c].color }; k++; }
      }
    }
    // candados y llave en cristal (84% en su tramo) desde el 20
    if (on('lock')) {
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
    for (const kind of ['roto', 'paint']) {
      if (on(kind)) {
        for (let i = 0; i < 40; i++) {
          const r = rng.range(Math.floor(R * 0.3), R - 2), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].virus) { cells[r][c] = kind === 'roto' ? { kind, color: cells[r][c].color, dir: rng.int(4) } : { kind, color: cells[r][c].color }; break; }
        }
      }
    }
    // alambrador (31%) desde el 40, con algunos bloques ya alambrados
    if (on('freezer')) {
      for (let i = 0; i < 40; i++) {
        const r = rng.range(Math.floor(R * 0.5), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block') {
          cells[r][c] = { kind: 'freezer' };
          for (const [dr, dc] of D4) { const o = cells[r + dr] && cells[r + dr][c + dc]; if (o && o.kind === 'block') o.wire = 1; }
          break;
        }
      }
    }
    // bloques alambrados sueltos (en Pet Rescue salen desde el 51, antes que el alambrador)
    if (n < INTRO.freezer && on('wire')) for (let i = 0, k = 0; i < 60 && k < 3 + Math.round(d * 3); i++) { const r = rng.range(Math.floor(R * 0.4), R - 1), c = rng.int(C), o = cells[r][c]; if (o && o.kind === 'block' && !o.wire) { o.wire = 1; k++; } }
    // empujabloques direccional (44), diamantes en cristal (48), bloques multiplicadores (52), arcoíris (56) y transportines (60)
    if (on('dblast')) for (let i = 0; i < 40; i++) { const r = rng.range(Math.floor(R * 0.3), R - 2), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'dblast', color: cells[r][c].color, dir: rng.pick([1, 3, 0]) }; break; } }
    if (on('gdiam')) for (let i = 0, k = 0; i < 40 && k < 1 + (d > 0.5 ? 1 : 0); i++) { const r = rng.range(Math.floor(R * 0.15), Math.floor(R * 0.5)), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'gdiam' }; k++; } }
    if (on('mult')) for (let i = 0, k = 0; i < 40 && k < 2; i++) { const r = rng.range(Math.floor(R * 0.3), R - 1), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].mult) { cells[r][c].mult = 2; k++; } }
    if (on('rainbow')) for (let i = 0, k = 0; i < 40 && k < 2; i++) { const r = rng.range(Math.floor(R * 0.3), R - 1), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].mult) { cells[r][c].rainbow = true; k++; } }
    if (!classic && on('carrier')) for (let i = 0; i < 40; i++) { const r = rng.range(Math.floor(R * 0.35), R - 3), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'block') { cells[r][c] = { kind: 'cage', carrier: true, pet: rng.pick(petTypes), hp: 1 }; cages++; break; } }
    // virus (47% en su tramo) desde el 26
    if (on('virus')) {
      const nv = 1 + Math.round(d * 2);
      for (let i = 0, k = 0; i < 40 && k < nv; i++) {
        const r = rng.range(Math.floor(R * 0.4), R - 2), c = rng.int(C);
        if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].virus) { cells[r][c].virus = true; k++; }
      }
    }
    // cajas de hielo y fuego (64): como en sus niveles, el hielo arriba y el fuego abajo, con bloques en medio
    if (on('ibox')) {
      const k = 2 + Math.round(d * 2);
      for (const [kind, r0, r1] of [['ibox', Math.floor(R * 0.3), Math.floor(R * 0.5)], ['fbox', Math.floor(R * 0.7), R - 1]]) {
        for (let i = 0, put = 0; i < 60 && put < k; i++) {
          const r = rng.range(r0, r1), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'block' && !cells[r][c].virus) { cells[r][c] = { kind }; put++; }
        }
      }
    }
    // mariposas (68): en un bloque; al combinarlo vuela y lleva una mascota al suelo
    if (!classic && on('bfly')) for (let i = 0, k = 0; i < 60 && k < 1 + (rng() < 0.4 ? 1 : 0); i++) {
      const r = rng.range(Math.floor(R * 0.5), R - 1), c = rng.int(C), o = cells[r][c];
      if (o && o.kind === 'block' && !o.virus && !o.mult && !o.rainbow && !o.wire) { o.bfly = true; k++; }
    }
    // detonador (72): cuenta atrás de 3 a 5 jugadas; al llegar a 0 explota y ayuda
    if (on('det')) for (let i = 0, k = 0; i < 60 && k < 2; i++) {
      const r = rng.range(Math.floor(R * 0.4), R - 1), c = rng.int(C), o = cells[r][c];
      if (o && o.kind === 'block' && !o.virus && !o.bfly && o.det == null) { o.det = 3 + rng.int(3); k++; }
    }
    // flor de enredadera (76): cubre de enredadera un bloque por jugada; se rompe combinando a su lado
    if (on('vflower')) for (let i = 0, k = 0; i < 60 && k < 1 + (d > 0.5 ? 1 : 0); i++) {
      const r = rng.range(Math.floor(R * 0.4), R - 1), c = rng.int(C), o = cells[r][c];
      if (o && o.kind === 'block' && !o.virus && !o.bfly && o.det == null) { cells[r][c] = { kind: 'vflower', dir: c < C / 2 ? 1 : 3 }; k++; }
    }
    // suelo de piedra con agujeros (80): "¡Las mascotas y los bloques se caen por los agujeros del mapa sin sufrir daño alguno!"
    if (!refill && on('wall')) {
      const rs = R - 1 - Math.floor(V * 0.45);
      const holes = new Set();
      for (let r = 0; r < rs; r++) for (let c = 0; c < C; c++) { const o = cells[r][c]; if (o && (o.kind === 'pet' || o.kind === 'cage' || o.kind === 'gdiam' || o.kind === 'gkey' || o.kind === 'gbomb')) holes.add(c); }
      holes.add(rng.int(C));
      if (holes.size < C - 1) for (let c = 0; c < C; c++) if (!holes.has(c)) cells[rs][c] = { kind: 'wall' };
    }
    const petsToDrop = refill ? Math.max(2, petsWant - placedPets - cages) : 0; // en modo puntos el resto cae desde arriba
    const goals = classic ? [] : [{ type: 'pet', count: placedPets + cages + petsToDrop, icon: petType }];
    // clásico e híbrido: despejar todos los bloques (Pet Rescue no tiene objetivos de "recoge X de un color")
    if (classic || mode === 'hybrid') { let nb = 0; for (const row of cells) for (const o of row) if (o && o.kind !== 'pet' && o.kind !== 'cage' && o.kind !== 'wall') nb++; goals.push({ type: 'blocks', count: nb }); }
    let text = '';
    if (n === 1) text = 'Toca bloques iguales para bajar a los animalitos al suelo';
    if (n === 2) text = 'Los grupos grandes cargan el cohete 🚀. Cuando esté lleno, tócalo';
    const TX = { refill: 'En este nivel van cayendo bloques nuevos desde arriba', cbomb: 'Toca la bomba de color 💥: quita todos los bloques de su color', gbomb: 'Baja la bomba de cristal hasta el suelo para que explote',
      gdiam: '¡Los diamantes te dan 1000 puntos! Bájalos hasta el suelo', lock: 'Baja la llave hasta el suelo para abrir los candados 🔒', black: 'Los bloques negros solo se rompen con bombas y cohetes',
      lblast: 'Toca el rompelíneas ↔️: quita su fila entera', wire: 'Los bloques con alambre no se rompen: quita bloques a su lado para cortarlo', hybrid: 'Salva a los animalitos y despeja todos los bloques',
      cage: 'Rompe las jaulas explotando bloques a su lado', virus: 'Cuidado con el virus 🦠: si no lo quitas, se contagia a otro bloque', paint: 'Toca el cubo de pintura 🪣 para pintar de su color los bloques de al lado',
      det: 'El detonador cuenta las jugadas: al llegar a 0 explota', roto: 'La rotobomba gira en cada jugada. Tócala cuando apunte donde quieras', freezer: 'El alambrador pone alambre a sus vecinos: quita bloques al lado para cortarlo',
      rainbow: 'El bloque arcoíris combina con cualquier color', ibox: 'Junta las cajas de hielo con las de fuego para descubrir las bombas que llevan dentro', dblast: 'El empujabloques elimina bloques en una dirección: tócalo',
      mult: 'Los bloques multiplicadores doblan tus puntos', carrier: 'Haz combinaciones junto a los transportines para liberar a las mascotas', wall: 'Las mascotas y los bloques caen por los agujeros del suelo de piedra sin hacerse daño',
      bfly: 'Combina el bloque de la mariposa: volará a llevar una mascota al suelo', vflower: 'La flor llena de enredadera los bloques: quita bloques al lado para cortarla' };
    for (const k in TX) if (INTRO[k] === n && !text) text = TX[k];
    if (classic && !text) text = '¡Despeja todos los bloques!';
    const spec = { R, C, V, colors, cells, goals, text, d, refill, petsToDrop, petTypes, bombRate, mode };
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
  // textos de la franja de objetivos, con las claves de Pet Rescue: task_rescue_one_pet / task_rescue_several_pets,
  // task_block_percent y task_target_score (la primera estrella)
  function introLines(spec) {
    const L = [];
    for (const gl of spec.goals || []) {
      if (gl.type === 'pet') L.push(gl.count === 1 ? 'Rescata 1 mascota.' : 'Rescata ' + gl.count + ' mascotas.');
      else if (gl.type === 'blocks') L.push('Quita un 100% de los bloques');
    }
    if (spec.starScores) L.push('Gana ' + spec.starScores[0] + ' puntos');
    return L;
  }
  GAME.newPlay = function (spec) {
    GAME.mode = spec.mode; // para la música de cada modo
    const S = buildState(spec, E.playSeed != null ? E.playSeed : (Math.random() * 1e9) | 0);
    const P = { S, busy: false };
    let ts = 60, tsy = 60, bx = 0, by = 0, V = spec.V, rackY = 0, rocketX = null; // tsy: alto de fila (en Pet Rescue las casillas son algo más anchas que altas)
    let cam = 0, camTarget = 0;
    const dying = [];
    const fxs = [];
    let hold = 0;
    let hintTiles = null;
    let rocketAim = false, aimCol = 0, rocketShot = null; // aimCol y rocketShot: apuntado y vuelo del cohete en el dibujo WebGL (como Pet Rescue)
    let chargeShown = 0;
    // al empezar, la franja con los objetivos (cutscenes/target_scene de Pet Rescue; la dibuja gl.js); mientras está, no se juega
    const INTRO_T = 2.9;
    let intro = window.__pasada ? null : { t0: E.t, lines: introLines(spec) };
    const introOn = () => intro && (E.t - intro.t0 < INTRO_T || (intro = null));
    const cx = (c) => bx + c * ts + ts / 2;
    const cy = (r) => by + (r - cam) * tsy + tsy / 2;
    const all = () => { const a = []; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.grid[r][c]) a.push([S.grid[r][c], r, c]); return a; };
    function updateCam() { camTarget = camFor(S, V); }

    P.layout = function (area) {
      const gl = window.GL && GL.boardLayout && GL.boardLayout(S.C, Math.min(S.R, spec.V || S.R), area); // filas que tiene que enseñar el nivel
      if (gl) { // con WebGL, las medidas del Pet Rescue real (casilla de 114×104 px en 1080 de ancho, tablero centrado al 49 % del alto)
        ts = gl.tsx; tsy = gl.tsy; V = gl.V; bx = gl.x; by = gl.y; rackY = gl.rackY; rocketX = gl.rocketX; // el cohete lleno va en el centro, bajo el tablero
      } else {
        ts = tsy = Math.min(area.w / S.C, 76);
        V = Math.min(S.R, Math.floor((area.h - 110) / ts));
        bx = area.x + (area.w - ts * S.C) / 2;
        by = area.y + (area.h - 110 - ts * V) / 2;
        rackY = by + V * ts + 60;
      }
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
        E.after(delay, () => E.sfx('collect', 1.3)); // sin texto, como Pet Rescue
      },
      collect(type, key, t, delay) {
        if (type === 'pet') delay = hold;
        E.after(delay + 0.05, () => { if (E.goal(type, key, 1, cx(t.gx), cy(t.gy))) { E.sfx(type === 'pet' ? 'rescue' : 'collect', 1 + Math.random() * 0.2); if (type === 'pet' && t.pet) E.sfx('pet:' + t.pet); } });
      },
      sound(size) { E.sfx('pop', 0.8 + Math.min(size, 10) * 0.05); },
      bonus(t, pts) { E.after(0.2, () => { if (!(window.GL && GL.scorePop && GL.scorePop(cx(t.gx), cy(t.gy), '+' + pts))) E.floatText(cx(t.gx), cy(t.gy) - 30, '+' + pts, '#ffe14d', 34); E.sfx('collect', 1.4); }); },
      recolor(t) {
        if (!t) return; // el cohete lleno ya se ve en su círculo dorado (Pet Rescue no pone texto)
        t.sc = 0.5; E.tween(t, { sc: 1 }, 0.4, { ease: E.ease.outBack }); E.burst(cx(t.gx), cy(t.gy), '#fff', 6, { size: 8 });
      },
      spawn(t, r, c, k) { t.gx = c; t.gy = camFor(S, V) - 1 - k; t.vy = 0; t.delay = 0; },
      bfly(r, c) { E.after(0.1, () => { E.burst(cx(c), cy(r), ['#7ad7ff', '#ff9ff3', '#fff'], 14, { size: 12, shape: 'star' }); }); }, // sin texto, como Pet Rescue
    };

    function cellAt(x, y) {
      const c = Math.floor((x - bx) / ts), r = Math.floor((y - by) / tsy + cam);
      if (c < 0 || c >= S.C || r < 0 || r >= S.R) return null;
      if (y < by || y > by + V * tsy) return null;
      return [r, c];
    }
    function afterAction() {
      hintTiles = null;
      for (const [t] of all()) if (!(t.delay > hold)) t.delay = hold;
      if (!hasMove(S, V)) P.needHelp = true;
    }
    function rocketHit(x, y) { return Math.hypot(x - (rocketX != null ? rocketX : bx + S.C * ts - 40), y - rackY) < (rocketX != null ? 60 : 46); }
    P.down = function (x, y) {
      if (P.busy || P.finaleOn) return;
      if (rocketHit(x, y) && !(rocketX != null && rocketAim)) {
        if (S.charge >= CHARGE_FULL) {
          // WebGL (como Pet Rescue): el cohete aparece de pie en la columna del centro; se cambia tocando el tablero y se dispara con ✓
          if (rocketX != null) { rocketAim = true; aimCol = Math.floor(S.C / 2); E.sfx('click'); return; }
          rocketAim = !rocketAim; E.sfx('click');
        }
        else E.sfx('bad'); // Pet Rescue no pone texto: el cohete se carga haciendo grupos grandes
        return;
      }
      const rc = cellAt(x, y);
      if (!rc) return;
      const [r, c] = rc;
      if (rocketAim && rocketX != null) { if (c !== aimCol) { aimCol = c; E.sfx('click'); } return; }
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
        E.sfx(sfxOr('hammer', 'bomb')); E.shake(0.2); fxEv('BlockRemover', cx(c), cy(r)); fxEv('Hammer', cx(c), cy(r));
      } else if (id === 'column') { blastColumn(S, c, r, K); E.sfx('rocket'); }
      else if (id === 'row') {
        K.fx({ type: 'rocket', dir: 'h', r, c, delay: 0, ev: 'booster_lineblast_force' });
        for (let cc = 0; cc < S.C; cc++) damage(S, r, cc, Math.abs(cc - c) * 0.03, K);
        E.sfx(sfxOr('line', 'rocket'));
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
    // sonido propio del estilo si lo tiene (p. ej. el muelle del rompelíneas de Pet Rescue); si no, el general
    function sfxOr(name, alt) { const sm = E.skin('sfx'); return sm && sm[name] ? name : alt; }
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
          t.vy = (t.vy || 0) + TM().gravity * dt;
          t.gy += t.vy * dt;
          moving = true;
          if (t.gy >= r) { t.gy = r; t.vy = 0; if (TM().bounce) t.bt = 0.13; }
        } else if (t.gy > r) { t.gy = r; t.vy = 0; }
        // rebote al llegar (Pet Rescue: se pasa un 10% de casilla y vuelve)
        if (t.bt > 0) { t.bt -= dt; t.oy = t.bt > 0 ? TM().bounce * Math.sin(Math.PI * (1 - t.bt / 0.13)) : 0; }
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
        if (!f.age && f.ev) { for (const n of [].concat(f.ev)) fxEv(n, cx(f.c), cy(f.r)); f.skin = !!E.skin('fxEvent'); } // el efecto de Pet Rescue de esa pieza
        f.age += dt;
        if (f.age > 0.6) fxs.splice(i, 1);
      }
      chargeShown += (Math.min(1, S.charge / CHARGE_FULL) - chargeShown) * Math.min(1, dt * 4);
      if (!moving && hold <= 0) updateCam();
      if (Math.abs(cam - camTarget) > 0.001) { cam += (camTarget - cam) * Math.min(1, dt * 4); if (Math.abs(cam - camTarget) < 0.01) cam = camTarget; moving = true; }
      P.busy = moving || dying.length > 0 || hold > 0 || !!P.finaleOn || !!introOn();
      if (!P.busy && P.needHelp) {
        P.needHelp = false;
        if (P.goals && P.goals.some((gl) => gl.left > 0)) {
          E.floatText(E.W / 2, by + V * tsy * 0.4, '¡No quedan jugadas!', '#fff', 40);
          E.shake(0.3); E.sfx('bomb');
          const cr = crushTop(S, K);
          if (cr.pets) { P.dead = true; P.deadMsg = '¡Se ha perdido una mascota!'; }
          else if (!hasMove(S, V)) P.needHelp = true;
          P.busy = true;
        }
      }
      if (hintTiles) hintTiles.t += dt;
    };
    // efecto del juego original con su nombre (estilo "Original"); si no lo hay, las chispas de siempre
    function fxEv(name, x, y, color) { const f = E.skin('fxEvent'); return !!(f && name && f(name, x, y, ts, color)); }
    const CN = ['Red', 'Blue', 'Green', 'Yellow', 'Purple'];
    function startDeath(d) {
      const t = d.t;
      d.x = cx(t.gx != null ? t.gx : 0); d.y = cy(t.gy != null ? t.gy : 0);
      d.age = 0.0001;
      if (d.m && d.m.mode === 'crush') { E.burst(d.x, d.y, ['#555', '#999', '#ccc'], 10, { size: 12 }); return; }
      if (t.kind === 'block') { if (!fxEv((t.virus ? 'destroyed_infected_block' : 'BlockSmoke' + CN[t.color]), d.x, d.y)) E.burst(d.x, d.y, [COLORS[t.color], E.shade(COLORS[t.color], 0.4)], 7, { size: 11 }); }
      else if (t.kind === 'black') { if (!fxEv('BlockSmokeBlack', d.x, d.y)) E.burst(d.x, d.y, ['#444', '#888'], 10, { size: 12 }); }
      else if (t.kind === 'cage') { if (!fxEv(t.hp > 1 ? 'SteelCageBreak' : 'CageBreak', d.x, d.y)) E.burst(d.x, d.y, ['#8a5a2b', '#c98b48', '#e0b07a'], 12, { size: 12 }); }
      else if (t.kind === 'pet') { if (!(window.GL && GL.scorePop && GL.scorePop(d.x, d.y, '+1000'))) E.floatText(d.x, d.y - 30, '¡Rescatado!', '#ffe14d', 34); if (!fxEv('PetGlitter', d.x, d.y)) E.burst(d.x, d.y, ['#ff6fae', '#ffe14d', '#fff'], 14, { shape: 'star', size: 14 }); }
      else if (t.kind === 'gbomb') { if (!fxEv('BombBlast', d.x, d.y)) E.burst(d.x, d.y, ['#ff9f1c', '#ffd23f', '#cfefff'], 18, { size: 14, speed: 400 }); E.shake(0.3); E.sfx('bomb'); }
      else if (t.kind === 'lock') fxEv('lockedblock_unlock', d.x, d.y);
      else if (t.kind === 'ibox' || t.kind === 'fbox') fxEv('FireIceEffect', d.x, d.y);
      else if (t.kind === 'vflower') fxEv('flowerblock_death', d.x, d.y);
      else if (t.kind === 'cbomb' || t.kind === 'lblast' || t.kind === 'paint' || t.kind === 'roto') fxEv('BlockSmoke' + CN[t.color || 0], d.x, d.y);
    }

    P.draw = function (g) {
      const top = by, bottom = by + V * ts;
      g.save();
      const skb = E.skin('board');
      if (skb) skb(g, bx, top, S.C * ts, V * ts, ts);
      else {
        E.rr(g, bx - 8, top - 8, S.C * ts + 16, V * ts + 16, 18);
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
        E.rr(g, bx - 2, top - 2, S.C * ts + 4, V * ts + 4, 14);
        g.fillStyle = 'rgba(60,110,70,0.35)'; g.fill();
      }
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
        const x = cx(t.gx), y = cy(t.gy + (t.oy || 0));
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
        if (TM().brighten && !(d.m && d.m.mode === 'pet') && !(d.m && d.m.mode === 'crush')) {
          // como Pet Rescue: el bloque se ilumina un momento y luego desaparece de golpe (queda el humo)
          const b = TM().brighten;
          if (d.age < b) { drawTile(g, t, d.x, d.y, ts); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * (d.age / b); drawTile(g, t, d.x, d.y, ts); g.restore(); }
          continue;
        }
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
    // botones ✓ y ✗ del apuntado (WebGL)
    P.fireRocket = function () {
      if (!rocketAim || P.busy) return;
      const r = Math.max(0, Math.min(S.R - 1, Math.floor(cam) + V - 1)); // desde abajo de lo que se ve
      rocketAim = false; S.charge = 0; rocketShot = { c: aimCol, t0: E.t };
      blastColumn(S, aimCol, r, K); E.sfx('rocket'); E.shake(0.2);
      settle(S, K); afterAction();
    };
    P.cancelRocket = function () { if (rocketAim) { rocketAim = false; E.sfx('click'); } };
    // lo que necesita el dibujo con WebGL (games/mascotas/gl.js) para pintar el tablero
    P.glState = () => ({ S, ts, tsy, bx, by, V, cam, rackY, dying, fxs, hintTiles, rocketAim, aimCol, rocketShot, chargeShown, endSeq, intro: introOn() ? intro : null, full: S.charge >= CHARGE_FULL, cx, cy, drawTile, TM: TM() });
    P.rocketXY = () => [rocketX != null ? rocketX : bx + S.C * ts - 40, rackY];
    // Al ganar, como Pet Rescue (grabado en el emulador): el tablero se queda como está, sin premio por los bloques que
    // quedan. Primero "¡Mascotas rescatadas!" con su nube (CPRTargetMetSequence: escena cutscenes/pets_rescued_scene,
    // efecto "fancy" al 47 % del alto), una pausa con el tablero quieto y luego la secuencia final
    // (CGameTaskEndSequenceV2MainAnimation: escena end_level_sequence y su línea de tiempo de 2,2 s; la dibuja gl.js).
    // Los efectos de esa línea de tiempo van en unidades de su AnimationLayout (1018×669, a escala uniforme que cubre la
    // pantalla: en vertical manda el alto).
    let endSeq = null;
    const END = { rescued: 2.5, pause: 1.5, seq: 2.6 }; // la escena de "¡Mascotas rescatadas!" dura 2,5 s; la pausa, medida en el vídeo
    const LU = () => Math.max(E.W / 1018, E.H / 669); // unidad del AnimationLayout en unidades del juego
    function fxAt(name, x, y, k) { const f = E.skin('fxEvent'); return !!(f && f(name, x, y, LU() * 70 * k)); } // k: escala sobre la unidad del AnimationLayout
    P.finale = function (done) {
      P.finaleOn = true;
      const seq = (endSeq = { t0: 0 });
      let finished = false;
      const finish = () => { if (finished) return; finished = true; P.finaleOn = false; endSeq = null; done(); };
      P.skipFinale = finish;
      if (window.__pasada) { finish(); return; } // los robots no esperan la animación
      const start = () => {
        if (finished) return;
        if (hold > 0 || dying.length) { E.after(0.1, start); return; }
        seq.t0 = E.t; E.sfx('rescue');
        fxAt('pets_smoke', E.W / 2, E.H * 0.47, 1); // el efecto con el sonido "pets_rescued": humo azul, estrellas y onda
        E.after(END.rescued + END.pause, () => {
          if (finished) return;
          seq.t1 = E.t; const u = LU(), cx0 = E.W / 2, cy0 = E.H / 2;
          fxAt('endLevelExplosion', cx0, cy0, 1);
          fxAt('petopia_FTUE_confetti_1', cx0, 0, 1);
          // EffectTrigger de end_level_sequence_timeline: [momento, efecto, x, y] (y hacia arriba)
          for (const [t, n, x, y] of [[0.023, 'Fireworks_1', 300, 200], [0.145, 'Fireworks_4', -200, 400], [0.371, 'Fireworks_1', -150, -350], [0.795, 'Fireworks_5', 200, -400], [1.227, 'Fireworks_5', 50, 350]])
            E.after(t, () => { if (!finished) fxAt(n, cx0 + x * u, cy0 - y * u, 1); });
          E.after(END.seq, finish);
        });
      };
      E.after(0.3, start);
    };
    return P;
  };
})();
