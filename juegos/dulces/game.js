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
    const skj = E.skin('jelly');
    return E.sprite('jelly' + level, ts, ts, skj ? (g, w, h) => skj(g, w, h, level) : (g, w, h) => {
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
    const skt = E.skin('tile');
    if (skt) spr = skt(t, ts, COLORS);
    if (spr) { /* dibujo del estilo elegido */ } else if (t.kind === 'candy') spr = candySprite(t.color, t.sp, ts);
    else if (t.kind === 'bomb') spr = bombSprite(ts);
    else if (t.kind === 'ice') spr = t.choc ? chocSprite(ts, t.vhp != null ? t.vhp : t.hp) : t.gum ? gumSprite(t.vhp != null ? t.vhp : t.hp, ts) : t.waffle ? waffleSprite(t.vhp != null ? t.vhp : t.hp, ts) : iceSprite(t.vhp != null ? t.vhp : t.hp, ts);
    else if (t.kind === 'lic') spr = licSprite(ts);
    else if (t.kind === 'mixer' || t.kind === 'popcorn' || t.kind === 'skull' || t.kind === 'shell' || t.kind === 'citrus' || t.kind === 'twist' || t.kind === 'cobra') spr = blockerSprite(t.kind, t.vhp != null ? t.vhp : t.hp, ts);
    else if (t.kind === 'wrapper') spr = wrapperSprite(t.cols, ts);
    else if (t.kind === 'cake') { if (t.q) return; spr = E.emojiSprite('🎂', ts * 2); x += ts / 2; y += ts / 2; k = 1.8; } // la tarta entera, desde su cuarto de arriba a la izquierda
    else if (t.kind === 'coco') spr = E.emojiSprite('🥥', ts);
    else if (t.kind === 'ufo') spr = E.emojiSprite('🛸', ts);
    else if (t.kind === 'ing') { spr = E.emojiSprite(t.ing === 1 ? '🌰' : '🍒', ts); k = 0.95; }
    else if (t.kind === 'slock') spr = sugarLockSprite(t.vhp != null ? t.vhp : t.hp, ts);
    else if (t.kind === 'gumball') spr = gumballSprite(Math.min(4, Math.ceil(((t.vhp != null ? t.vhp : t.hp) / (t.hp0 || 1)) * 4)), ts);
    const s = ts * (t.sc == null ? 1 : t.sc) * k;
    if (!(s >= 2)) return;
    g.save();
    if (t.alpha != null && t.alpha < 1) g.globalAlpha = Math.max(0, t.alpha);
    g.translate(x, y);
    if (t.rot) g.rotate(t.rot);
    if (t.sel) { const sp = E.skin('selPulse'), p = 1 + Math.sin(E.t * 10) * (sp != null ? sp : 0.06); g.scale(p, p); } // en Candy Crush la pieza tocada no late (medido en el emulador)
    const ska = E.skin('tileAnim'), an = ska && ska(t);
    if (an) { g.translate(0, (an.ty || 0) * s / 80); g.scale(an.sx, an.sy); }
    if (!(t.frog && E.skin('frogAnim'))) g.drawImage(spr, -s / 2, -s / 2, s, s); // la rana animada ocupa la casilla ella sola, como en Candy Crush
    if (t.lock && t.vlock !== false) g.drawImage(t.marm ? marmSprite(ts) : lockSprite(ts), -s / 2, -s / 2, s, s);
    if (t.glass) { // caramelo cristalizado: el estilo puede traer el suyo; si no, cristal azulado con las capas que quedan
      const skg = E.skin('glassTile');
      if (!(skg && skg(g, s, t.glass))) {
        g.globalAlpha *= 0.45 + t.glass * 0.12; E.rr(g, -s * 0.47, -s * 0.47, s * 0.94, s * 0.94, s * 0.12); g.fillStyle = '#cfefff'; g.fill(); g.globalAlpha = 1;
        g.lineWidth = s * 0.05; g.strokeStyle = '#7fc8f0'; g.stroke();
        E.text(g, String(t.glass), s * 0.28, -s * 0.28, s * 0.26, '#1d6fa8', { stroke: '#fff', sw: 3 });
      }
    }
    if (t.coat) { // capa de azúcar: el estilo puede traer la suya; si no, una capa blanca con las que quedan
      const skc = E.skin('sugarCoat');
      if (!(skc && skc(g, s, t.coat))) {
        g.globalAlpha *= 0.55 + t.coat * 0.12; E.rr(g, -s * 0.46, -s * 0.46, s * 0.92, s * 0.92, s * 0.2); g.fillStyle = '#fff6fb'; g.fill(); g.globalAlpha = 1;
        g.lineWidth = s * 0.05; g.strokeStyle = '#f2a7c8'; g.stroke();
        E.text(g, String(t.coat), s * 0.28, -s * 0.28, s * 0.26, '#c2266c', { stroke: '#fff', sw: 3 });
      }
    }
    const sko = E.skin('candyMarks'); // el estilo puede dibujar bomba, camaleón, misterioso, +5 y reloj a su manera
    if (!(sko && sko(g, t, s, COLORS))) {
      if (t.timer > 0) { // bomba de cuenta atrás
        g.beginPath(); g.arc(0, 0, s * 0.27, 0, 7); g.fillStyle = t.timer <= 3 ? '#d62828' : '#2b2b33'; g.fill();
        g.lineWidth = s * 0.05; g.strokeStyle = '#fff'; g.stroke();
        E.text(g, String(t.timer), 0, 1, s * 0.32, '#fff', { stroke: false });
      }
      if (t.cham != null) { // camaleón: el aro es el color al que cambiará
        g.lineWidth = s * 0.09; g.strokeStyle = COLORS[t.cham]; g.beginPath(); g.arc(0, 0, s * 0.43, 0, 7); g.stroke();
      }
      if (t.myst) { const mi = E.skin('mystImg') && E.img('myst'); if (mi) g.drawImage(mi, -s * 0.45, -s * 0.45, s * 0.9, s * 0.9); else g.drawImage(E.emojiSprite('❓', s * 0.5), -s * 0.25, -s * 0.25, s * 0.5, s * 0.5); }
      if (t.plus5) { g.beginPath(); g.arc(0, 0, s * 0.26, 0, 7); g.fillStyle = '#2bb24c'; g.fill(); E.text(g, '+5', 0, 1, s * 0.27, '#fff', { stroke: false }); }
      if (t.clock) { const cs = s * 0.5; g.drawImage(E.emojiSprite('⏱️', cs), -cs / 2, -cs / 2, cs, cs); }
    }
    if (t.key) g.drawImage(E.emojiSprite('🔑', s * 0.48), -s * 0.24, -s * 0.24, s * 0.48, s * 0.48);
    if (t.frog) { // rana: se come los caramelos de su color; llena, se lanza donde toques
      const fs = s * 0.66;
      if (t.fillK >= 1) { const p = 1 + Math.sin(E.t * 8) * 0.08; g.scale(p, p); }
      const fra = E.skin('frogAnim'); // el estilo puede animar la rana (engorda según lo que ha comido)
      const fri = E.skin('frogImg') && E.img(E.skin('frogImg')(t.color)); // la rana del estilo, del color que se come
      if (fra && fra(g, t, fs)) { /* hecho */ } else if (fri) { const w = fs * 1.35, h = (w * fri.height) / fri.width; g.drawImage(fri, -w / 2, -h * 0.6, w, h); }
      else g.drawImage(E.emojiSprite('🐸', fs), -fs / 2, -fs * 0.58, fs, fs);
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
      g.fillStyle = { mixer: '#5a3d8a', popcorn: '#f6e7c1', shell: '#2b2b33', citrus: '#ffb347', twist: '#ffffff', cobra: '#7bd36a' }[kind] || '#9fd36a'; g.fill();
      if (kind === 'twist') { const gr = g.createLinearGradient(0, 0, w, h); ['#ff5050', '#ffb030', '#ffe040', '#60d060', '#50a0ff', '#b070ff'].forEach((c, i) => gr.addColorStop(i / 5, c)); g.fillStyle = gr; E.rr(g, w * 0.14, h * 0.14, w * 0.72, h * 0.72, w * 0.3); g.fill(); }
      g.lineWidth = w * 0.05; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
      const s = w * 0.6; g.drawImage(E.emojiSprite(kind === 'mixer' ? '🌀' : kind === 'popcorn' ? '🍿' : kind === 'shell' ? '🐚' : kind === 'citrus' ? '🍊' : kind === 'twist' ? '🔗' : kind === 'cobra' ? '🐍' : '💀', s), (w - s) / 2, (h - s) / 2, s, s);
      if (hp > 1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.14, 0, 7); g.fill(); E.text(g, String(hp), w * 0.8, h * 0.21, w * 0.2, '#333', { stroke: false }); }
    });
  }
  // paquetito precioso: caja con una cinta de cada color que falta por quitar
  function wrapperSprite(cols, ts) {
    const skw = E.skin('wonderWrapper');
    return E.sprite('wrap' + cols.join(''), ts, ts, (g, w, h) => {
      if (skw && skw(g, w, h, cols)) return;
      E.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.14); g.fillStyle = '#fff3e0'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = '#c98a4a'; g.stroke();
      cols.forEach((col, i) => { g.fillStyle = COLORS[col]; const k = (i + 1) / (cols.length + 1); g.fillRect(w * k - w * 0.06, h * 0.06, w * 0.12, h * 0.88); });
      const s = w * 0.42; g.drawImage(E.emojiSprite('🎁', s), (w - s) / 2, (h - s) / 2, s, s);
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
  // chicle (bubblegum pop): de 1 a 5 capas; al romperse explota alrededor
  function gumSprite(hp, ts) {
    const skg = E.skin('gum');
    return E.sprite('gum' + hp, ts, ts, skg ? (g, w, h) => skg(g, w, h, hp) : (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.2);
      g.fillStyle = ['#ffc2dc', '#ff9cc6', '#ff79b0', '#f2559a', '#e03c86'][Math.min(hp, 5) - 1]; g.fill();
      g.lineWidth = w * 0.05; g.strokeStyle = '#c2266c'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(w * 0.5, h * 0.52, w * 0.22, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; E.rr(g, w * 0.16, h * 0.12, w * 0.36, h * 0.1, h * 0.05); g.fill();
      if (hp > 1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.14, 0, 7); g.fill(); E.text(g, String(hp), w * 0.8, h * 0.21, w * 0.2, '#c2266c', { stroke: false }); }
    });
  }
  // máquina de chicles: cúpula de cristal con chicles (0 a 4 cuartos llenos) sobre su base azul
  function gumballSprite(q, ts) {
    const skg = E.skin('gumballMachine');
    return E.sprite('gumm' + q, ts, ts, skg ? (g, w, h) => skg(g, w, h, q) : (g, w, h) => {
      g.fillStyle = '#2fb6e8'; E.rr(g, w * 0.1, h * 0.62, w * 0.8, h * 0.28, h * 0.08); g.fill();
      g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.36, 0, 7); g.fillStyle = 'rgba(220,235,255,0.45)'; g.fill(); g.lineWidth = w * 0.04; g.strokeStyle = '#fff'; g.stroke();
      const cols = ['#ff9ad5', '#c9a0ff', '#ffc2e0', '#e07ad0'];
      for (let i = 0; i < q * 4; i++) { const a = i * 2.4, rr = w * 0.08 + (i % 4) * w * 0.05; g.beginPath(); g.arc(w / 2 + Math.cos(a) * rr, h * 0.52 - (i / 16) * h * 0.2 + Math.sin(a) * rr * 0.4, w * 0.07, 0, 7); g.fillStyle = cols[i % 4]; g.fill(); }
      g.fillStyle = '#c070e0'; g.beginPath(); g.arc(w / 2, h * 0.76, w * 0.08, 0, 7); g.fill();
    });
  }
  // mermelada: cubre un caramelo; se rompe al combinarlo o con combinaciones al lado
  function marmSprite(ts) {
    const skm = E.skin('marm');
    return E.sprite('marm', ts, ts, skm || ((g, w, h) => {
      E.rr(g, w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.18);
      g.fillStyle = 'rgba(245,160,30,0.45)'; g.fill();
      g.lineWidth = w * 0.06; g.strokeStyle = 'rgba(200,110,10,0.9)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)'; E.rr(g, w * 0.14, h * 0.12, w * 0.5, h * 0.1, h * 0.05); g.fill();
    }));
  }
  // candado de regaliz (va encima de un caramelo; en su tramo sale en el 55% de los niveles)
  function lockSprite(ts) {
    const skl = E.skin('lock');
    return E.sprite('lock', ts, ts, skl || ((g, w, h) => {
      g.strokeStyle = '#26262e'; g.lineWidth = w * 0.11; g.lineCap = 'round';
      g.beginPath(); g.moveTo(w * 0.12, h * 0.12); g.lineTo(w * 0.88, h * 0.88); g.moveTo(w * 0.88, h * 0.12); g.lineTo(w * 0.12, h * 0.88); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = w * 0.03; g.stroke();
      g.fillStyle = '#26262e'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.13, 0, 7); g.fill();
    }));
  }
  GAME.drawGoalIcon = function (g, gl, x, y, s) {
    let spr;
    const skt = E.skin('tile');
    if (skt && gl.type === 'color') spr = skt({ kind: 'candy', color: gl.key }, s, COLORS);
    if (!spr && skt && gl.type === 'ice') spr = skt({ kind: 'ice', hp: 1 }, s, COLORS);
    if (!spr && skt && gl.type === 'gum') spr = skt({ kind: 'ice', gum: true, hp: 1 }, s, COLORS);
    if (!spr && skt && gl.type === 'waffle') spr = skt({ kind: 'ice', waffle: true, hp: 1 }, s, COLORS);
    if (!spr && skt && gl.type === 'lic') spr = skt({ kind: 'lic' }, s, COLORS);
    if (!spr && skt && gl.type === 'shell') spr = skt({ kind: 'shell', hp: 1 }, s, COLORS);
    const skcg = E.skin('sugarCoat');
    if (!spr && skcg && gl.type === 'coat') spr = E.sprite('coatgoalimg', s, s, (g2, w, h) => { g2.translate(w / 2, h / 2); skcg(g2, w * 0.95, 1); });
    if (spr) { /* estilo elegido */ } else if (gl.type === 'color') spr = candySprite(gl.key, null, s);
    else if (gl.type === 'jelly') spr = jellySprite(2, s);
    else if (gl.type === 'ice') spr = iceSprite(1, s);
    else if (gl.type === 'ing') spr = E.emojiSprite('🍒', s);
    else if (gl.type === 'mixer' || gl.type === 'skull' || gl.type === 'shell') spr = blockerSprite(gl.type, 1, s);
    else if (gl.type === 'citrus' || gl.type === 'twist' || gl.type === 'cobra') spr = blockerSprite(gl.type, 1, s);
    else if (gl.type === 'wrapper') spr = wrapperSprite([0, 2, 4], s);
    else if (gl.type === 'cake') spr = E.emojiSprite('🎂', s);
    else if (gl.type === 'rapid') spr = E.sprite('rapidgoal', s, s, (g2, w, h) => { ['#ff5050', '#ffb030', '#ffe040', '#60d060', '#50a0ff', '#b070ff'].forEach((c, i) => { g2.strokeStyle = c; g2.lineWidth = w * 0.07; g2.beginPath(); g2.arc(w / 2, h * 0.78, w * (0.42 - i * 0.065), Math.PI, 0); g2.stroke(); }); });
    else if (gl.type === 'cane') spr = E.sprite('canegoal', s, s, (g2, w, h) => { g2.fillStyle = '#fff'; E.rr(g2, w * 0.38, h * 0.05, w * 0.24, h * 0.9, w * 0.08); g2.fill(); g2.fillStyle = '#e8203f'; for (let k = 0; k < 5; k++) g2.fillRect(w * 0.38, h * (0.08 + k * 0.18), w * 0.24, h * 0.07); });
    else if (gl.type === 'glass') spr = E.sprite('glassgoal', s, s, (g2, w, h) => { E.rr(g2, w * 0.08, h * 0.08, w * 0.84, h * 0.84, w * 0.12); g2.fillStyle = '#cfefff'; g2.fill(); g2.lineWidth = w * 0.06; g2.strokeStyle = '#7fc8f0'; g2.stroke(); });
    else if (gl.type === 'coat') spr = E.sprite('coatgoal', s, s, (g2, w, h) => { E.rr(g2, w * 0.08, h * 0.08, w * 0.84, h * 0.84, w * 0.2); g2.fillStyle = '#fff6fb'; g2.fill(); g2.lineWidth = w * 0.06; g2.strokeStyle = '#f2a7c8'; g2.stroke(); });
    else if (gl.type === 'slock') spr = sugarLockSprite(1, s);
    else if (gl.type === 'gum') spr = gumSprite(1, s);
    else if (gl.type === 'waffle') spr = waffleSprite(1, s);
    else if (gl.type === 'lic') spr = licSprite(s);
    else if (gl.type === 'gumball') spr = E.sprite('gumballIcon', s, s, E.skin('gumballIcon') || ((g, w, h) => { g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 7); g.fillStyle = '#ff8ad0'; g.fill(); g.beginPath(); g.arc(w * 0.38, h * 0.38, w * 0.12, 0, 7); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }));
    else spr = candySprite(4, 'v', s);
    g.drawImage(spr, x - s / 2, y - s / 2, s, s);
  };

  // ------------------------------------------------------------ lógica
  const inB = (S, r, c) => r >= 0 && c >= 0 && r < S.R && c < S.C && r >= S.top[c] && !(S.hole && S.hole[r][c]);
  const at = (S, r, c) => (inB(S, r, c) ? S.grid[r][c] : null);
  // el tofellino y el glaseado que cae son glaseado que sí cae (t.fall), pero no se puede intercambiar
  const movable = (t) => t && !t.orl && (t.kind !== 'ice' || t.fall) && !t.lock && !t.coat && !t.glass && !['mixer', 'popcorn', 'skull', 'slock', 'gumball', 'shell', 'wrapper', 'citrus', 'twist', 'cobra', 'cake', 'rope', 'nest', 'sprink', 'mold'].includes(t.kind);
  const matchable = (t) => t && t.kind === 'candy' && !t.orl;
  const swappable = (t) => movable(t) && t.kind !== 'lic' && t.kind !== 'ice';
  const matchableAt = (t) => t && t.kind === 'candy' && !t.orl;
  const isCU = (t) => !!t && (t.kind === 'coco' || t.kind === 'ufo'); // rueda de coco y ovni: se usan intercambiándolos
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
    if (ta.kind === 'bomb' || tb.kind === 'bomb' || isCU(ta) || isCU(tb)) return ta.kind !== 'ing' && tb.kind !== 'ing';
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

  // rápidos del arcoíris (desde el 7119): el arcoíris avanza por su camino cuando se rompe la siguiente casilla; al llegar al molde, se cumple
  function rapidStep(S, r, c, delay, K) {
    for (const p of S.rapid) {
      if (p.p >= p.cells.length) continue;
      const [nr, nc] = p.cells[p.p];
      if (nr !== r || nc !== c) continue;
      p.p++; K.collect('rapidStep', undefined, r, c, delay);
      if (p.p >= p.cells.length) K.collect('rapid', undefined, p.mold ? p.mold[0] : r, p.mold ? p.mold[1] : c, delay + 0.6); // sale del molde
    }
  }
  // paquetito precioso abierto: deja un caramelo especial de sorpresa
  function openWrapper(S, r, c, t, delay, K) {
    const b = { id: uid++, kind: 'candy', color: S.rand.int(S.colors), sp: ['w', 'h', 'v'][S.rand.int(3)] };
    S.grid[r][c] = b; K.remove(t, r, c, delay); K.collect('wrapper', undefined, r, c, delay); K.created(b, r, c, delay + 0.1);
  }
  // Golpe a una casilla (por explosión o por estar en una línea)
  // flotador de pesca (Candy Crush 'bobber', código 066, desde el 2408; CBobberAttacker): flota en una casilla sin suelo junto
  // al tablero; cuando se golpea una casilla de su lado, pica (BobberRipple) y suelta un pez de gominola, o tres si el
  // golpe es de un especial (BobberSplash), uno tras otro. Una vez por jugada
  function bobberNear(S, r, c, delay, K, fromMatch) {
    for (const b of S.bob) {
      if (Math.abs(b.r - r) + Math.abs(b.c - c) !== 1 || b.turn === S.turnNo) continue;
      b.turn = S.turnNo;
      const n = fromMatch ? 1 : 3, skip = new Set();
      K.fx({ type: 'bobber', r: b.r, c: b.c, n, delay });
      for (let i = 0; i < n; i++) fishAttack(S, b.r, b.c, delay + 0.3 + (16 / 60) * i, K, S.rand.int(S.colors), skip);
    }
  }
  function hit(S, r, c, delay, K, fromMatch) {
    if (!inB(S, r, c)) return;
    if (S.bob) bobberNear(S, r, c, delay, K, fromMatch);
    if (S.rapid) rapidStep(S, r, c, delay, K);
    const t = S.grid[r][c];
    if (!t) { hitJelly(S, r, c, delay, K); return; }
    if (t.orl) return; // bajo un cerrojo de pedido no llega nada
    if (t.kind === 'rope') { shredRope(S, t.rope, delay, K); return; }
    if (t.kind === 'nest') { hitNest(S, t.nest, delay, K); return; }
    if (t.kind === 'sprink') { S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect('sprink', undefined, r, c, delay); return; }
    if (t.kind === 'ice') {
      t.hp--;
      if (t.hp <= 0) {
        S.grid[r][c] = null; K.remove(t, r, c, delay);
        if (t.choc) S.chocHit = true; else K.collect(t.waffle ? 'waffle' : t.gum ? 'gum' : 'ice', undefined, r, c, delay);
        // chicle (bubblegum pop): al quitarle la última capa explota como un envuelto (3x3)
        if (t.gum) { K.fx({ type: 'boom', r, c, rad: 1.2, delay: delay + 0.05 }); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) hit(S, r + dr, c + dc, delay + 0.1, K); }
      }
      else K.hurt(t, delay, t.hp);
      return;
    }
    if (t.kind === 'ing' || t.kind === 'slock' || t.kind === 'mold') return;
    // máquina de chicles: cada golpe (combinación al lado o especial) suelta un chicle para el pedido;
    // con el pedido completo desaparecen todas las máquinas (como en Candy Crush)
    if (t.kind === 'gumball') {
      if (S.gumLeft > 0) {
        S.gumLeft--; t.hp = Math.max(0, t.hp - 1); K.hurt(t, delay, t.hp); K.collect('gumball', undefined, r, c, delay);
        if (S.gumLeft === 0) for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = at(S, rr, cc); if (o && o.kind === 'gumball') { S.grid[rr][cc] = null; K.remove(o, rr, cc, delay + 0.25); } }
      }
      return;
    }
    // tarta bomba (Candy Crush, desde el 441): 2×2 casillas con 8 porciones; cada golpe (combinación al lado o especial)
    // le quita una y, sin porciones, estalla y barre todo el tablero
    if (t.kind === 'cake') {
      const G = t.cake; if (G.done) return;
      G.hp--; K.hurt(G.tiles.find(Boolean) || t, delay, G.hp);
      if (G.hp > 0) return;
      G.done = true;
      for (const o of G.tiles) if (o && S.grid[o.tr0][o.tc0] === o) { S.grid[o.tr0][o.tc0] = null; K.remove(o, o.tr0, o.tc0, delay + 0.1, 'cake'); }
      K.collect('cake', undefined, G.r, G.c, delay);
      K.fx({ type: 'boom', r: G.r, c: G.c, rad: 9, delay: delay + 0.15, combo: 'cake' });
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) if (!(at(S, rr, cc) && at(S, rr, cc).kind === 'cake')) hit(S, rr, cc, delay + 0.3 + 0.035 * (Math.abs(rr - G.r) + Math.abs(cc - G.c)), K);
      return;
    }
    // batidora (3 golpes) y calavera ácida (1): combinaciones al lado o especiales
    if (t.kind === 'mixer' || t.kind === 'skull') {
      t.hp--;
      if (t.hp <= 0) { S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect(t.kind, undefined, r, c, delay); } else K.hurt(t, delay, t.hp);
      return;
    }
    // caparazón de regaliz (Candy Crush, desde el 1492): solo lo rompen los especiales, capa a capa
    if (t.kind === 'shell') {
      if (fromMatch === 'adj') return;
      t.hp--;
      if (t.hp <= 0) { S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect('shell', undefined, r, c, delay); } else K.hurt(t, delay, t.hp);
      return;
    }
    // palomitas: solo especiales; a los 3 golpes revientan y dejan una bomba de color
    if (t.kind === 'popcorn') {
      if (fromMatch === 'adj') return;
      t.hp--;
      if (t.hp <= 0) { const b = { id: uid++, kind: 'bomb' }; S.grid[r][c] = b; K.remove(t, r, c, delay); K.created(b, r, c, delay + 0.1); } else K.hurt(t, delay, t.hp);
      return;
    }
    if (t.kind === 'lic') { S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect('lic', undefined, r, c, delay); return; }
    // paquetito precioso (desde el 11421): cada cinta se quita combinando su color al lado (en resolve); un especial quita una cualquiera
    if (t.kind === 'wrapper') { if (fromMatch !== 'adj') { t.cols.shift(); K.hurt(t, delay, t.cols.length); if (!t.cols.length) openWrapper(S, r, c, t, delay, K); } return; }
    // chuche cítrica (Citrus Chew): caja de 3 capas que se abre combinando al lado o con especiales
    if (t.kind === 'citrus') { t.hp--; if (t.hp <= 0) { S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect('citrus', undefined, r, c, delay); } else K.hurt(t, delay, t.hp); return; }
    // cordón de colores (desde el 711): si se rompe una pieza, cae toda la cadena
    if (t.kind === 'twist') {
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = at(S, rr, cc); if (o && o.kind === 'twist' && o.tw === t.tw) { S.grid[rr][cc] = null; K.remove(o, rr, cc, delay + 0.05 * (Math.abs(rr - r) + Math.abs(cc - c))); K.collect('twist', undefined, rr, cc, delay); } }
      return;
    }
    // cobra gelatinosa (desde el 5527): se carga con combinaciones al lado o especiales; cargada, sale hacia su cesta en una
    // sola dirección rompiendo lo que encuentra, una casilla cada 5 tics (Candy Crush: CDestructionPlanCandyCobra). Su cesta
    // está en el borde del lado con más casillas
    if (t.kind === 'cobra') {
      t.hp--; K.hurt(t, delay, t.hp);
      if (t.hp <= 0) {
        S.grid[r][c] = null; K.remove(t, r, c, delay); K.collect('cobra', undefined, r, c, delay);
        const dir = S.C - 1 - c >= c ? 1 : -1;
        for (let cc = c + dir, k = 1; cc >= 0 && cc < S.C; cc += dir, k++) hit(S, r, cc, delay + (5 / 60) * k, K);
      }
      return;
    }
    // caramelo cristalizado (desde el 2042): no se puede deslizar; cada combinación encima le quita una capa
    if (t.glass) { t.glass--; K.hurt(t, delay, 'coat'); if (!t.glass) K.collect('glass', undefined, r, c, delay); return; }
    // capa de azúcar (Candy Crush, desde el 4255): el caramelo no se mueve; cada golpe le quita una capa y con la última queda libre
    if (t.coat) { t.coat--; K.hurt(t, delay, 'coat'); if (!t.coat) K.collect('coat', undefined, r, c, delay); return; }
    // candado de regaliz o mermelada: el golpe rompe el candado y el caramelo se queda
    if (t.lock) { t.lock = false; K.hurt(t, delay, 'unlock'); K.collect('lock', undefined, r, c, delay); return; }
    if (isCU(t)) { // un especial o una explosión también los pone en marcha (la rueda rueda hacia donde haya más caramelos)
      if (t.kind === 'ufo') { ufoFire(S, r, c, delay, K); return; }
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dr, dc]) => { let n = 0; for (let k = 1; k < 9; k++) if (matchable(at(S, r + dr * k, c + dc * k))) n++; return [n, dr, dc]; }).sort((x, y) => y[0] - x[0]);
      rollCoco(S, r, c, dirs[0][1], dirs[0][2], delay, K); return;
    }
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
  // rueda de coco (Candy Crush, desde el 65): "pasa por encima de los caramelos en línea y convierte los 3 primeros en
  // caramelos a rayas", que luego estallan
  const COCO_T = 0.2; // lo que tarda la rueda en cruzar una casilla
  function rollCoco(S, r, c, dr, dc, delay, K) {
    const t = S.grid[r][c]; if (t && t.kind === 'coco') { S.grid[r][c] = null; K.remove(t, r, c, delay, 'roll'); }
    hitJelly(S, r, c, delay, K);
    const got = [];
    for (let k = 1, rr = r + dr, cc = c + dc; got.length < 3 && rr >= 0 && rr < S.R && cc >= 0 && cc < S.C; k++, rr += dr, cc += dc) {
      const o = at(S, rr, cc); if (matchable(o) && !o.sp && !o.lock && !o.coat && !o.glass) got.push([rr, cc, k]);
    }
    K.fx({ type: 'roll', r, c, dr, dc, delay, n: got.length ? got[got.length - 1][2] : 3 });
    got.forEach(([rr, cc, k], i) => {
      const old = S.grid[rr][cc], nt = { id: uid++, kind: 'candy', color: old.color, sp: dr ? 'h' : 'v' }; // rodando de lado: rayas que cruzan su columna
      S.grid[rr][cc] = nt; K.remove(old, rr, cc, delay + COCO_T * k); K.created(nt, rr, cc, delay + COCO_T * k);
    });
    got.forEach(([rr, cc], i) => hit(S, rr, cc, delay + COCO_T * (got.length ? got[got.length - 1][2] : 0) + 0.3 + i * 0.15, K));
    K.sound(3, 0);
  }
  // ovni (desde el 133): "dispara al tablero y crea 3 caramelos con envoltorio que explotan"
  function ufoFire(S, r, c, delay, K) {
    const t = S.grid[r][c]; if (t && t.kind === 'ufo') { S.grid[r][c] = null; K.remove(t, r, c, delay, 'ufo'); }
    hitJelly(S, r, c, delay, K);
    const cand = []; for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = at(S, rr, cc); if (matchable(o) && !o.sp && !o.lock && !o.coat && !o.glass) cand.push([rr, cc]); }
    const targets = []; while (targets.length < 3 && cand.length) targets.push(cand.splice(S.rand.int(cand.length), 1)[0]);
    K.fx({ type: 'ufo', r, c, targets, delay });
    targets.forEach(([rr, cc], i) => {
      const old = S.grid[rr][cc], nt = { id: uid++, kind: 'candy', color: old.color, sp: 'w' };
      S.grid[rr][cc] = nt; K.remove(old, rr, cc, delay + 0.5 + i * 0.12); K.created(nt, rr, cc, delay + 0.5 + i * 0.12);
    });
    targets.forEach(([rr, cc], i) => hit(S, rr, cc, delay + 1.1 + i * 0.2, K));
  }
  function mostColor(S) {
    const cnt = new Array(6).fill(0);
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (matchable(t)) cnt[t.color]++; }
    let best = 0; for (let i = 1; i < 6; i++) if (cnt[i] > cnt[best]) best = i;
    return best;
  }
  const FISH_T = 0.5; // lo que tarda el pez en llegar nadando (con WebGL se le ve nadar, como en Candy Crush)
  function activate(S, t, r, c, delay, K) {
    if (t.kind === 'bomb') {
      if (t.kind === 'bomb' && S.grid[r][c] === t) S.grid[r][c] = null;
      K.remove(t, r, c, delay);
      clearColor(S, mostColor(S), r, c, delay, K);
      return;
    }
    if (t.sp === 'h') { K.fx({ type: 'line', dir: 'h', r, c, delay, color: t.color }); const [c0, c1] = rowSpan(S, r, c); for (let cc = c0; cc <= c1; cc++) if (cc !== c) hit(S, r, cc, delay + Math.abs(cc - c) * 0.035, K); }
    else if (t.sp === 'v') { K.fx({ type: 'line', dir: 'v', r, c, delay, color: t.color }); for (let rr = 0; rr < S.R; rr++) if (rr !== r) hit(S, rr, c, delay + Math.abs(rr - r) * 0.035, K); }
    else if (t.sp === 'f') fishAttack(S, r, c, delay, K, t.color);
    else if (t.sp === 'w') {
      K.fx({ type: 'boom', r, c, rad: 1.5, delay, color: t.color });
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        if ((dr || dc) && (Math.abs(dr) + Math.abs(dc) <= 2 || (Math.abs(dr) <= 1 && Math.abs(dc) <= 1))) hit(S, r + dr, c + dc, delay + 0.06, K);
      }
    }
  }
  // pez de gominola: nada hasta una casilla que haga falta (gelatina, glaseado, chocolate o un caramelo del objetivo)
  function fishAttack(S, r, c, delay, K, color, skip) {
    {
      const cand = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) {
        if (!inB(S, rr, cc) || (rr === r && cc === c)) continue;
        const o = S.grid[rr][cc];
        let w = 0;
        if (S.jelly[rr][cc] > 0) w += 3;
        if (o && o.kind === 'ice') w += 3;
        if (o && o.kind === 'lic') w += 2;
        if (o && matchable(o)) w += 0.2;
        if (w > 0 && !(skip && skip.has(rr * 64 + cc))) cand.push([w + S.rand() * 0.5, rr, cc]);
      }
      cand.sort((x, y) => y[0] - x[0]);
      if (cand.length) { const [, tr, tc] = cand[0]; if (skip) skip.add(tr * 64 + tc); K.fx({ type: 'zap', r, c, targets: [[tr, tc]], delay, color, fish: true }); hit(S, tr, tc, delay + FISH_T, K); }
    }
  }
  function clearColor(S, color, r, c, delay, K) {
    const targets = [];
    for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const t = at(S, rr, cc); if (matchable(t) && t.color === color) targets.push([rr, cc]); }
    K.fx({ type: 'zap', r, c, targets, delay, color });
    // Candy Crush (CDestructionPlanColorBomb y sus ajustes): 10 tics de base y uno cada 3 tics (a 60 por segundo)
    targets.forEach(([rr, cc], i) => hit(S, rr, cc, delay + 10 / 60 + i * (3 / 60), K));
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
      K.fx({ type: 'boom', r, c, rad: 9, delay: d, combo: 'bb' });
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) hit(S, rr, cc, d + 0.04 * (Math.abs(rr - r) + Math.abs(cc - c)), K);
      return;
    }
    if (ta.kind === 'bomb' || tb.kind === 'bomb') {
      const other = ta.kind === 'bomb' ? tb : ta;
      if (!other.sp) { K.collect('color', other.color, r, c, 0); clearColor(S, other.color, r, c, d, K); return; }
      K.collect('color', other.color, r, c, 0);
      const targets = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const t = at(S, rr, cc); if (matchable(t) && t.color === other.color) targets.push([rr, cc]); }
      K.fx({ type: 'zap', r, c, targets, delay: d, color: other.color, hit: other.sp === 'w' ? 'Wrap' : other.sp === 'f' ? 'fish' : 'stripe' });
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
      K.fx({ type: 'boom', r, c, rad: 2.5, delay: d, combo: 'ww', color: ta.color });
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) hit(S, r + dr, c + dc, d + 0.05 * Math.max(Math.abs(dr), Math.abs(dc)), K);
    } else if (sps.includes('w')) {
      K.fx({ type: 'boom', r, c, rad: 0, delay: d, combo: 'sw', color: (ta.sp === 'w' ? tb : ta).color });
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
            // (teletransporte con pareja fija: el portal guarda la casilla de entrada, que puede estar en otra columna)
            const pe = S.portal[k + 1][c];
            let q = k, qc = c; if (typeof pe === 'object') { q = pe.r; qc = pe.c; } else while (q >= S.top[c] && !inB(S, q, c)) q--;
            if (q >= S.top[qc] && S.grid[q][qc] && movable(S.grid[q][qc])) { S.grid[r][c] = S.grid[q][qc]; S.grid[q][qc] = null; moved = true; }
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
            if (o && o.kind === 'rope' && !iceHit.has('rope' + o.rope)) { iceHit.add('rope' + o.rope); shredRope(S, o.rope, 0.05, K); continue; }
            if (o && o.kind === 'nest' && !iceHit.has('nest' + o.nest)) { iceHit.add('nest' + o.nest); hitNest(S, o.nest, 0.05, K); continue; }
            if (o && o.kind === 'sprink' && !iceHit.has(o)) { iceHit.add(o); hit(S, r + dr, c + dc, 0.05, K, 'adj'); continue; }
            if (o && (o.kind === 'ice' || o.kind === 'lic' || o.kind === 'mixer' || o.kind === 'skull' || o.kind === 'cake' || o.kind === 'gumball' || o.kind === 'citrus' || o.kind === 'twist' || o.kind === 'cobra' || (o.lock && o.marm)) && !iceHit.has(o)) { iceHit.add(o); hit(S, r + dr, c + dc, 0.05, K, 'adj'); }
            // paquetito precioso: la cinta del color de la combinación
            if (o && o.kind === 'wrapper' && o.cols.includes(G.color) && !iceHit.has(o)) {
              iceHit.add(o); o.cols.splice(o.cols.indexOf(G.color), 1); K.hurt(o, 0.05, o.cols.length);
              if (!o.cols.length) openWrapper(S, r + dr, c + dc, o, 0.05, K);
            }
          }
          // bastones de caramelo: las combinaciones a su lado les quitan una capa (una por grupo)
          if (S.wall) for (const cc of [c - 1, c]) {
            const k = r * 64 + cc;
            if (cc >= 0 && S.wall[r][cc] >= 2 && !iceHit.has('w' + k)) { iceHit.add('w' + k); S.wall[r][cc] = S.wall[r][cc] === 2 ? 0 : S.wall[r][cc] - 1; if (!S.wall[r][cc]) K.collect('cane', undefined, r, cc, 0.05); }
          }
        }
        K.sound(cells.length, loop);
        // puntos de Candy Crush: 60 por 3, 120 por 4, 200 por 5 o por una L/T (y la cascada multiplica)
        if (K.points) { const n = cells.length, base = n >= 5 || (hasH && hasV) ? 200 : n === 4 ? 120 : 60; K.points(G.color, cells, base * (loop + 1)); }
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
  // triturachuches (Candy Crush 'gummyRope', código 231, desde el 692; CGummyRopeGroupLogic::DoHit): una cuerda de
  // malvavisco que sale de la trituradora; cada golpe (una combinación al lado o algo que la alcance) se traga un trozo
  // desde el final, y cuando solo queda la trituradora, el último golpe la recoge
  function shredRope(S, id, delay, K) {
    const R = S.ropes && S.ropes[id]; if (!R || !R.cells.length) return;
    const [r, c] = R.cells.pop(), t = S.grid[r][c];
    if (t && t.kind === 'rope') { S.grid[r][c] = null; K.remove(t, r, c, delay); }
    K.collect('ropeStep', undefined, r, c, delay);
    if (!R.cells.length) K.collect('rope', undefined, r, c, delay);
  }
  // nido de chispitas (Candy Crush 'nest', código 232, desde el 21186; Spine dragon_nest): 2×2 con sus huevos; cada golpe
  // (combinación al lado o algo que lo alcance) lo acerca a eclosionar y, a la resistencia del nido, sale una chispita al
  // tablero. Las chispitas se quitan con un golpe ("Quita a las chispitas del tablero"); sin huevos, el nido se va
  function hitNest(S, id, delay, K) {
    const N = S.nests && S.nests[id]; if (!N || N.eggs <= 0) return;
    N.step++; K.collect('nestHit', id, N.r, N.c, delay);
    if (N.step < N.str) return;
    N.step = 0; N.eggs--;
    const cand = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = at(S, r, c); if (o && o.kind === 'candy' && !o.sp && !o.orl && !o.lock) cand.push([Math.abs(r - N.r) + Math.abs(c - N.c), r, c]); }
    cand.sort((a, b) => a[0] - b[0]);
    if (cand.length) { const [, r, c] = cand[Math.min(cand.length - 1, S.rand.int(4))], o = S.grid[r][c], sp = { id: uid++, kind: 'sprink' }; S.grid[r][c] = sp; K.remove(o, r, c, delay); K.created(sp, r, c, delay + 0.2); }
    if (N.eggs <= 0) for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) { const o = at(S, N.r + dr, N.c + dc); if (o && o.kind === 'nest') { S.grid[N.r + dr][N.c + dc] = null; K.remove(o, N.r + dr, N.c + dc, delay + 0.3); } }
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
  // cerrojo de pedido (Candy Crush 'orlocks', desde el 2045: [col, fila, ancho, alto, objeto, cantidad]): tapa su zona
  // (los caramelos de dentro se ven pero no se mueven, no combinan y no les llega nada) hasta que se recoge esa cantidad
  // de su objeto en cualquier parte del tablero; entonces se rompe y la zona vuelve a jugar
  function orlK(S, K) {
    if (!S.orl || !S.orl.some((o) => o.left > 0)) return K;
    const K2 = Object.create(K);
    K2.collect = function (type, key, r, c, delay) {
      for (const o of S.orl) if (o.left > 0 && o.type === type && (type !== 'color' || o.key === key)) {
        o.left--;
        if (!o.left) for (let rr = o.r; rr < o.r + o.h; rr++) for (let cc = o.c; cc < o.c + o.w; cc++) { const q = at(S, rr, cc); if (q && q.orl === o.id) delete q.orl; }
      }
      return K.collect.apply(K, arguments);
    };
    return K2;
  }
  function act(S, a, b, K) {
    if (!swapValid(S, a, b)) return false;
    K = orlK(S, K); S.turnNo = (S.turnNo || 0) + 1;
    const ta = S.grid[a[0]][a[1]], tb = S.grid[b[0]][b[1]];
    S.chocHit = false;
    K.begin(); K.inPhase = true;
    if (isCU(ta) || isCU(tb)) {
      const [pc, oc] = isCU(ta) ? [a, b] : [b, a], t = S.grid[pc[0]][pc[1]];
      if (t.kind === 'coco') rollCoco(S, pc[0], pc[1], oc[0] - pc[0], oc[1] - pc[1], 0, K); else ufoFire(S, pc[0], pc[1], 0, K);
      fill(S, K); K.end(S); K.inPhase = false; resolve(S, K, null);
    } else if (ta.kind === 'bomb' || tb.kind === 'bomb' || (ta.sp && tb.sp)) {
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
  function shuffle(S) {
    const pos = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (t && t.kind === 'candy' && !t.lock && !t.orl) pos.push([r, c]); }
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
      frogFull: spec.frogFull || 0, frogBelly: 0, frogColor: spec.frogColor, wall: spec.wall && spec.wall.map((row) => row.slice()), fallIceRate: spec.fallIceRate || 0, clockRate: spec.time ? 0.03 : 0 };
    S.grid = spec.cells.map((row) => row.map((d) => (d ? Object.assign({ id: uid++ }, d) : null)));
    S.jelly = spec.jelly.map((row) => row.slice());
    S.gumLeft = ((spec.goals || []).find((g) => g.type === 'gumball') || {}).count || 0; // chicles que faltan por soltar
    if (spec.rapid) S.rapid = spec.rapid.map((p) => ({ cells: p.cells, mold: p.mold, p: 1 }));
    if (spec.orlocks) S.orl = spec.orlocks.map((o) => Object.assign({}, o, { left: o.count }));
    if (spec.ropes) S.ropes = spec.ropes.map((R) => ({ cells: R.cells.map((p) => p.slice()), dir: R.dir }));
    if (spec.bobbers) S.bob = spec.bobbers.map(([r, c]) => ({ r, c }));
    if (spec.nests) S.nests = spec.nests.map((N) => Object.assign({}, N));
    relinkCakes(S);
    return S;
  }
  // cada tarta bomba es un grupo de 4 casillas con sus porciones: al crear o copiar el tablero, un grupo nuevo por tarta
  function relinkCakes(S) {
    const m = new Map();
    for (const row of S.grid) for (const t of row) if (t && t.kind === 'cake') {
      let G = m.get(t.cake); if (!G) { G = { hp: t.cake.hp, done: t.cake.done, r: t.cake.r, c: t.cake.c, tiles: [] }; m.set(t.cake, G); }
      t.cake = G; G.tiles[t.q] = t;
    }
  }
  function clone(S) {
    const T = Object.assign({}, S);
    T.grid = S.grid.map((row) => row.map((t) => (t ? Object.assign({}, t) : null)));
    T.jelly = S.jelly.map((row) => row.slice());
    if (S.wall) T.wall = S.wall.map((row) => row.slice());
    if (S.rapid) T.rapid = S.rapid.map((p) => ({ cells: p.cells, mold: p.mold, p: p.p }));
    if (S.orl) T.orl = S.orl.map((o) => Object.assign({}, o));
    if (S.ropes) T.ropes = S.ropes.map((R) => ({ cells: R.cells.map((p) => p.slice()), dir: R.dir }));
    if (S.bob) T.bob = S.bob.map((b) => Object.assign({}, b));
    if (S.nests) T.nests = S.nests.map((N) => Object.assign({}, N));
    T.top = S.top;
    relinkCakes(T);
    return T;
  }
  const nullK = { begin() {}, end() {}, remove() {}, created() {}, fx() {}, hurt() {}, spawn() {}, jelly() {}, shuffle() {}, sound() {}, combo() {}, collect() {}, bombOut() {}, extraMoves() {}, extraTime() {}, frogMove() {} };
  function needCounter(spec) {
    const need = { color: {}, jelly: 0, ice: 0, ing: 0, striped: 0, slock: 0, waffle: 0, gum: 0, lic: 0, gumball: 0 };
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
          if (type === 'rapidStep' || (type === 'ropeStep' && nd.rope > 0) || (type === 'nestHit' && nd.sprink > 0)) score += 1.5; // empujar el arcoíris o acortar la cuerda también cuenta
          else if (type === 'color') { if (nd.color[key] > 0) { nd.color[key]--; score += 1; } }
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
    // Movimientos como en su tramo de Candy Crush (TRAMOS.mov) y objetivos a la medida:
    // si el bot va sobrado, los objetivos de cantidad (color, ingredientes, rayados) crecen hasta llenar ese margen
    const r2 = E.rng(n * 92821 + 7);
    const target = n < 6 ? 0 : Math.round(quant(tramo(n).mov, r2()));
    // (calibrado 23-10-2026: con 1.3 el robot ganaba el 88%; con 1.1 los pedidos crecen más)
    if (target && spec.botMoves * 1.1 < target) {
      const ratio = Math.min(2.5, target / (spec.botMoves * 1.1));
      let grew = false;
      for (const gl of spec.goals) {
        if (gl.type === 'color' || gl.type === 'striped' || gl.type === 'lic' || gl.type === 'gumball') { gl.count = Math.round(gl.count * ratio); grew = true; }
        if (gl.type === 'ing') { const nc = Math.min(8, Math.round(gl.count * ratio)); spec.ings += nc - gl.count; gl.count = nc; grew = true; }
      }
      if (grew) {
        const runs = [yield* botRunG(spec, n * 17 + 5), yield* botRunG(spec, n * 17 + 6)].sort((x, y) => x - y);
        spec.botMoves = runs[1];
      }
    }
    // si aun así el bot va muy sobrado (p. ej. gelatina, que no se puede ampliar), se recortan movimientos para que siga siendo un reto
    // (calibrado 23-10-2026: con 1.35/1.15 el robot ganaba ~88%; con 1.28/1.1 seguía en el 88%; con 1.12/1.0 se busca el 75-80%)
    const cap = target ? Math.ceil(spec.botMoves * 1.12) + 1 : 99;
    spec.moves = E.clamp(Math.max(Math.min(target, cap), Math.ceil(spec.botMoves * 1.0) + 1), n < 5 ? 10 : 15, 50);
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
  // Tramos medidos en los 23 765 niveles reales de Candy Crush (tools/cc_niveles.py; ver analisis/candycrush_niveles.md):
  // movimientos (p10 p25 p50 p75 p90), colores (3/4/5), nº de objetivos (1/2/3), probabilidad de cada objetivo y de cada pieza,
  // capas del glaseado (1..5), ingredientes (p25 p50 p75), huecos del tablero (p25 p50 p75), tableros 9x9 y simétricos
  const TRAMOS = [
    {to:20,mov:[25,25,25,28,30],col:[0,0.3,0.7],nob:[0.6,0.35,0.05],goal:{jelly:0.5,ice:0.55,gum:0.2,color:0.2},el:{ice:0.7,gum:0.35,sp:0.35,pre:0.3},iceHp:[0.48,0.4,0.05,0.02,0.04],ing:[],holes:[3,12,18],size9:0.4,sym:0.8},
    {to:50,mov:[20,25,25,29,30],col:[0,0.47,0.53],nob:[0.53,0.3,0.1],goal:{gumball:0.23,jelly:0.47,ing:0.33,ice:0.37,gum:0.2,color:0.07},el:{ice:0.63,marm:0.37,gum:0.33,sp:0.57,pre:0.47},iceHp:[0.45,0.29,0.18,0.03,0.06],ing:[3,4,12],holes:[7,10,20],size9:0.47,sym:0.67},
    {to:100,mov:[19,20,24,28,31],col:[0.06,0.78,0.16],nob:[0.82,0.16,0.02],goal:{gumball:0.02,jelly:0.38,ing:0.32,ice:0.32,lic:0.16,color:0.02},el:{ice:0.86,lock:0.36,marm:0.48,lic:0.6,licRate:0.12,portal:0.16,cannon:0.6,sp:0.6,pre:0.48},iceHp:[0.34,0.46,0.17,0.03,0.01],ing:[3,3,5],holes:[8,14,20],size9:0.72,sym:0.76},
    {to:200,mov:[19,22,24,28,31],col:[0.09,0.79,0.12],nob:[0.78,0.15,0.03],goal:{gumball:0.05,jelly:0.38,ing:0.28,ice:0.21,waffle:0.01,lic:0.2,color:0.09},el:{ice:0.87,lock:0.47,marm:0.52,lic:0.58,licRate:0.11,waffle:0.02,portal:0.4,cannon:0.22,sp:0.68,pre:0.6},iceHp:[0.28,0.31,0.22,0.12,0.08],ing:[3,5,10],holes:[10,16,23],size9:0.87,sym:0.66},
    {to:500,mov:[15,15,18,21,23],col:[0.06,0.53,0.41],nob:[0.62,0.33,0.04],goal:{gumball:0.15,jelly:0.55,ing:0.29,ice:0.19,waffle:0.11,lic:0.11,gum:0.12,color:0.03},el:{ice:0.59,lock:0.32,marm:0.34,gum:0.32,lic:0.3,licRate:0.03,waffle:0.23,portal:0.24,cannon:0.4,belt:0.15,sp:0.62,pre:0.27,slock:0.03,fallIce:0.02},iceHp:[0.32,0.29,0.13,0.1,0.15],ing:[4,6,10],holes:[6,11,17],size9:0.69,sym:0.83},
    {to:1000,mov:[15,16,20,22,26],col:[0.02,0.43,0.55],nob:[0.62,0.33,0.05],goal:{gumball:0.13,jelly:0.54,ing:0.35,ice:0.14,waffle:0.17,lic:0.08,gum:0.09,color:0.06},el:{ice:0.53,lock:0.37,marm:0.3,gum:0.27,lic:0.28,licRate:0.01,waffle:0.41,portal:0.28,cannon:0.28,belt:0.12,sp:0.6,pre:0.28,slock:0.26,fallIce:0.03},iceHp:[0.29,0.26,0.21,0.12,0.11],ing:[3,4,8],holes:[4,9,15],size9:0.78,sym:0.81},
    {to:2000,mov:[15,15,17,21,25],col:[0.02,0.48,0.5],nob:[0.74,0.23,0.02],goal:{gumball:0.03,jelly:0.54,ing:0.31,ice:0.16,waffle:0.09,lic:0.08,gum:0.05,color:0.04},el:{ice:0.67,lock:0.28,marm:0.31,gum:0.16,lic:0.3,licRate:0.06,waffle:0.24,portal:0.28,cannon:0.15,belt:0.13,sp:0.48,pre:0.26,slock:0.17,mixer:0.04,fallIce:0.02},iceHp:[0.28,0.3,0.21,0.11,0.1],ing:[2,3,5],holes:[5,10,16],size9:0.85,sym:0.77},
    {to:5000,mov:[15,15,16,20,23],col:[0.05,0.6,0.35],nob:[0.63,0.33,0.03],goal:{gumball:0.02,jelly:0.55,ing:0.35,ice:0.17,waffle:0.12,lic:0.09,gum:0.03,color:0.06},el:{ice:0.68,lock:0.3,marm:0.24,gum:0.1,lic:0.43,licRate:0.07,waffle:0.3,portal:0.36,cannon:0.36,belt:0.28,sp:0.6,pre:0.2,slock:0.22,mixer:0.07,wall:0.22,fallIce:0.03},iceHp:[0.26,0.27,0.22,0.12,0.13],ing:[2,3,5],holes:[7,12,18],size9:0.82,sym:0.67},
    {to:1e9,mov:[15,17,21,24,27],col:[0.04,0.39,0.57],nob:[0.44,0.43,0.09],goal:{gumball:0.05,jelly:0.53,ing:0.37,ice:0.21,waffle:0.22,lic:0.08,gum:0.07,color:0.04},el:{ice:0.5,lock:0.21,marm:0.2,gum:0.27,lic:0.29,licRate:0.05,waffle:0.47,portal:0.3,cannon:0.27,belt:0.26,sp:0.75,pre:0.18,slock:0.22,mixer:0.08,skull:0.09,frog:0.03,choc:0.07,wall:0.28,fallIce:0.04},iceHp:[0.2,0.22,0.23,0.2,0.15],ing:[2,3,5],holes:[3,8,14],size9:0.92,sym:0.74},
  ];
  const tramo = (n) => TRAMOS.find((t) => n <= t.to);
  // nivel en que Candy Crush estrena cada cosa (primera aparición en sus niveles). Las que ya no salen en el juego actual
  // (camaleón, misterioso, +5 y palomitas) se dejan para más adelante, de vez en cuando, para que no se pierdan
  const INTRO = { color: 1, ice: 2, sp: 2, pre: 3, jelly: 5, gum: 11, ing: 21, marm: 29, lock: 52, cannon: 53, portal: 53, lic: 55, licRate: 66, waffle: 124,
    gumball: 36, coco: 65, ufo: 133, cake: 441, striped: 269, belt: 307, fallIce: 371, slock: 375, cham: 1100, myst: 1200, plus5: 1300, twist: 715, citrus: 1448, mixer: 1492, shell: 1492, popcorn: 1600, glass: 2042, cane: 3248, coat: 4255, cobra: 6355, rapid: 7119, orlock: 2045, rope: 692, bobber: 2408, nest: 21186, wrapper: 11421, wall: 2666, bomb: 4542, frog: 6531, choc: 7005, skull: 8034 };
  // elige un índice según sus pesos
  const pickW = (rng, ws) => { const s = ws.reduce((a, b) => a + b, 0); let x = rng() * s; for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x < 0) return i; } return ws.length - 1; };
  // valor entre cuantiles repartidos por igual (p. ej. p10..p90) con u de 0 a 1
  const quant = (q, u) => { const x = u * (q.length - 1), i = Math.min(q.length - 2, Math.floor(x)); return q[i] + (q[i + 1] - q[i]) * (x - i); };
  function* genLevelG(n, attempt) {
    const rng = E.rng(n * 2246822519 + 31 + attempt * 7777);
    const d = E.difficulty(n) * Math.pow(0.75, attempt);
    const T = tramo(n);
    // cada pieza sale a partir del nivel en que la estrena Candy Crush (ese nivel seguro) y luego con su frecuencia en el tramo
    const PROB = { cake: 0.06, coco: 0.028, ufo: 0.025, orlock: 0.18, rope: 0.025, bobber: 0.058, nest: 0.04 }; // piezas que no están en TRAMOS: su frecuencia en los niveles reales (desde su estreno)
    const on = (k) => n === INTRO[k] || (n > INTRO[k] && rng() < (T.el[k] != null ? T.el[k] : PROB[k] != null ? PROB[k] : 0.03));
    let text = '';
    const say = (s) => { if (!text) text = s; };
    if (n === 1) say('Desliza un caramelo para hacer una fila de 3 iguales');
    if (n === 2) say('Con 4 en fila ganas un caramelo rayado. ¡Con 5, una bomba de color!');
    if (n === 4) say('Con 4 en cuadrado ganas un pez que va a por lo que falta');

    // tablero: casi siempre 9x9, con huecos y a menudo simétrico
    const big = n > 1 && rng() < T.size9;
    const C = big ? 9 : n === 1 ? 8 : rng.pick([7, 8, 9]);
    const R = big ? 9 : n === 1 ? 8 : rng.pick([7, 8, 9]);
    const colors = n === 1 ? 4 : 3 + pickW(rng, T.col);
    const top = new Array(C).fill(0);
    const shape = n < 3 ? 0 : rng.int(6);
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
    const hole = cells.map((row) => row.map(() => 0)), spawn = cells.map((row) => row.map(() => 0)), portal = cells.map((row) => row.map(() => 0));
    // huecos hasta llegar a los de su tramo (contando lo que falta arriba y el tablero más pequeño que 9x9)
    let missing = top.reduce((a, b) => a + b, 0) + 81 - R * C;
    const want = n < 3 ? 0 : Math.round(quant(T.holes, rng()));
    const sym = rng() < T.sym;
    const cut = (r, c) => { if (c >= 0 && c < C && r > top[c] && r < R - 1 && !hole[r][c]) { hole[r][c] = 1; missing++; } };
    const cutS = (r, c) => { cut(r, c); if (sym) cut(r, C - 1 - c); };
    for (let k = 0; k < 14 && missing < want; k++) {
      const pat = rng.int(5), r = rng.range(1, R - 3), c = rng.int(Math.ceil(C / 2));
      if (pat === 0) cutS(r, c);
      else if (pat === 1) { cutS(r, c); cutS(r + 1, c); }
      else if (pat === 2) { cutS(r, c); cutS(r, c + 1); }
      else if (pat === 3) { for (let rr = r; rr < r + 3; rr++) cutS(rr, 0); }
      else { cutS(r, c); cutS(r + 1, c); cutS(r, c + 1); cutS(r + 1, c + 1); }
    }
    // debajo de cada hueco: grifo propio (en el 30% de los niveles reales), portal (desde el 53) o se rellena en diagonal
    const midSpawn = rng() < 0.3, usePortal = on('portal');
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if (hole[r][c] && !hole[r + 1][c]) { if (usePortal && rng() < 0.6) portal[r + 1][c] = 1; else if (midSpawn) spawn[r + 1][c] = 1; }
    // teletransportes con pareja fija: algunas salidas reciben de la entrada de otra columna (la casilla de encima de otro hueco)
    if (usePortal && rng() < 0.4) {
      const exits = [], ents = [];
      for (let r = 1; r < R; r++) for (let c = 0; c < C; c++) if (portal[r][c] === 1) exits.push([r, c]);
      for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if (!hole[r][c] && cells[r][c] !== undefined && hole[r + 1][c]) ents.push([r, c]);
      for (const [er, ec] of rng.shuffle(exits)) {
        const i = ents.findIndex(([r, c]) => c !== ec && r < er); if (i < 0) continue;
        const [r, c] = ents.splice(i, 1)[0]; portal[er][ec] = { r, c };
      }
    }
    const okc = (r, c) => r >= top[c] && !hole[r][c];
    const iceHp = () => 1 + pickW(rng, T.iceHp);
    // ninguna fila (salvo la de abajo) puede quedar entera de bloques que no caen: taparían todo lo de debajo.
    // Si pasa, se quita el del medio (y su simétrico); devuelve cuántos de ese tipo se han quitado
    const fixed = (o) => o && o.kind === 'ice' && !o.fall;
    const openRows = (isKind) => {
      let removed = 0;
      for (let r = 0; r < R - 1; r++) {
        const row = [];
        for (let c = 0; c < C; c++) if (okc(r, c)) row.push(c);
        if (!row.length || !row.every((c) => fixed(cells[r][c]))) continue;
        const mid = row.filter((c) => isKind(cells[r][c])).sort((a, b) => Math.abs(a - (C - 1) / 2) - Math.abs(b - (C - 1) / 2))[0];
        if (mid == null) continue;
        for (const c of new Set([mid, C - 1 - mid])) if (okc(r, c) && isKind(cells[r][c])) { cells[r][c] = null; removed++; }
      }
      return removed;
    };

    // objetivos: cuántos y cuáles, con la frecuencia de su tramo; el estreno de un tipo va solo
    const kinds = ['jelly', 'ing', 'ice', 'gum', 'lic', 'waffle', 'gumball', 'color', 'striped'].filter((k) => n >= INTRO[k]);
    const intro = kinds.find((k) => INTRO[k] === n && k !== 'color');
    let chosen = [];
    if (n === 1) chosen = ['color'];
    else if (intro) chosen = [intro];
    else {
      const ng = Math.min(kinds.length, 1 + pickW(rng, T.nob));
      const pool = kinds.slice();
      while (chosen.length < ng && pool.length) {
        const i = pickW(rng, pool.map((k) => T.goal[k] || 0.02));
        chosen.push(pool.splice(i, 1)[0]);
      }
    }
    const goals = [];
    let ings = 0, licRate = 0;
    // una pieza que no es objetivo también sale de obstáculo (en Candy Crush hay más niveles con glaseado que niveles que lo piden)
    const extra = (k) => !chosen.includes(k) && n > INTRO[k] && rng() < Math.max(0, ((T.el[k] || 0) - (T.goal[k] || 0)) / (1 - (T.goal[k] || 0)));

    if (chosen.includes('ice') || extra('ice')) {
      const hp = n < INTRO.ice + 3 ? 1 : iceHp();
      // en Candy Crush el glaseado ocupa zonas grandes (el pedido mediano es de ~3 capas por movimiento): de 1 a 2 zonas
      const r0 = Math.floor(R / 2) - 1 + rng.int(2), zones = n < INTRO.ice + 3 ? [rng.int(3)] : rng.shuffle([0, 1, 2, 3, 4]).slice(0, 1 + rng.int(2));
      let count = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (!okc(r, c)) continue;
        const m = Math.min(c, C - 1 - c);
        let ok = false;
        for (const pat of zones) {
          if (pat === 0) ok = ok || ((r === r0 || r === r0 + 1) && m % 3 !== 1);
          else if (pat === 1) ok = ok || r >= R - 2;
          else if (pat === 2) ok = ok || (r >= r0 && r <= r0 + 2 && m >= 1 && m <= 2);
          else if (pat === 3) ok = ok || (r >= r0 && m === 0);
          else ok = ok || (r >= r0 - 1 && r <= r0 + 1 && m !== 1); // con dos pasillos: el glaseado no cae y taparía lo de debajo
        }
        if (ok) { cells[r][c] = { kind: 'ice', hp }; count++; }
      }
      count -= openRows((o) => o && o.kind === 'ice' && !o.gum && !o.choc && !o.fall);
      if (count && chosen.includes('ice')) goals.push({ type: 'ice', count });
      if (n === INTRO.ice) say('Rompe el glaseado haciendo líneas a su lado');
    }
    // chicle: hasta 2 capas al principio, 4 desde el 276 y 5 desde el 291 (como en Candy Crush)
    if (chosen.includes('gum') || extra('gum')) {
      // como el glaseado, en zonas (en Candy Crush piden de 1 a 3 capas de chicle por movimiento)
      const hp = Math.min(iceHp(), n < 276 ? 2 : n < 291 ? 4 : 5), r0 = rng.range(2, R - 4), zones = rng.shuffle([0, 1, 2, 3]).slice(0, 1 + rng.int(2));
      let count = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (!okc(r, c) || cells[r][c]) continue;
        const m = Math.min(c, C - 1 - c);
        let ok = false;
        for (const pat of zones) {
          if (pat === 0) ok = ok || ((r === r0 || r === r0 + 2) && m % 2 === 0);
          else if (pat === 1) ok = ok || (r >= r0 && r <= r0 + 2 && m >= 1 && m <= 2);
          else if (pat === 2) ok = ok || (r >= R - 3 && m === 0);
          else ok = ok || (r >= r0 - 1 && r <= r0 + 1 && m >= Math.floor((C - 1) / 2) - 1);
        }
        if (ok) { cells[r][c] = { kind: 'ice', gum: true, hp }; count++; }
      }
      count -= openRows((o) => o && o.gum);
      if (count && chosen.includes('gum')) goals.push({ type: 'gum', count });
      if (n === INTRO.gum) say('El chicle se rompe haciendo líneas a su lado. ¡Al reventar explota alrededor!');
    }
    // regaliz en espiral: como obstáculo o como objetivo (también cae desde arriba)
    if (chosen.includes('lic') || on('lic')) {
      const want2 = 3 + rng.int(4);
      let placed = 0;
      for (let i = 0; i < 60 && placed < want2; i++) {
        const r = rng.range(1, R - 2), c = rng.int(C);
        if (okc(r, c) && !cells[r][c]) { cells[r][c] = { kind: 'lic' }; placed++; const mc = C - 1 - c; if (sym && placed < want2 && okc(r, mc) && !cells[r][mc]) { cells[r][mc] = { kind: 'lic' }; placed++; } }
      }
      if (chosen.includes('lic')) { licRate = 0.04; goals.push({ type: 'lic', count: placed + 4 }); }
      if (n === INTRO.lic) say('El regaliz se rompe haciendo líneas a su lado');
    }
    if (!licRate && on('licRate')) licRate = 0.03;
    for (const t of chosen) {
      if (t === 'jelly') {
        const pat = n >= 8 && rng() < 0.45 ? 0 : rng.int(4), lv = n >= 6 && rng() < 0.55 ? 2 : 1;
        let count = 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          if (!okc(r, c) || (cells[r][c] && cells[r][c].kind === 'lic')) continue;
          const m = Math.min(c, C - 1 - c), cr = Math.abs(r - (R - 1) / 2), cc = Math.abs(c - (C - 1) / 2);
          let ok = pat === 0 || (pat === 1 && cr + cc <= 3.5) || (pat === 2 && r >= R - 3) || (pat === 3 && (m <= 1 || r >= R - 2));
          if (n < 8 && pat === 0) ok = r >= R - 4;
          if (ok) { jelly[r][c] = lv; count++; }
        }
        goals.push({ type: 'jelly', count });
        if (n === INTRO.jelly) say('Haz líneas encima de la gelatina para quitarla');
      } else if (t === 'ing') {
        ings = E.clamp(Math.round(quant(T.ing.length ? T.ing : [3, 4, 5], rng())), 2, 8);
        const init = Math.min(ings, 2);
        for (let i = 0; i < init; i++) { const c = Math.floor(((i + 1) * C) / (init + 1)); cells[top[c]][c] = { kind: 'ing', ing: 0 }; }
        goals.push({ type: 'ing', count: ings });
        // los ingredientes no atraviesan los huecos: como en Candy Crush, debajo de cada hueco va un portal
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if (hole[r][c] && !hole[r + 1][c]) { portal[r + 1][c] = 1; spawn[r + 1][c] = 0; }
        if (n === INTRO.ing) say('Baja las cerezas hasta abajo del todo');
      } else if (t === 'color') {
        const k = chosen.length > 1 ? 0.7 : 1;
        const ncol = n > 15 && rng() < 0.2 ? 2 : 1;
        rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, ncol).forEach((col) => goals.push({ type: 'color', key: col, count: Math.round(((30 + d * 50) * k * (0.85 + rng() * 0.3)) / ncol) }));
      } else if (t === 'striped') {
        goals.push({ type: 'striped', count: 3 + Math.round(d * 3) });
        if (n === INTRO.striped) say('Haz caramelos rayados juntando 4 iguales');
      }
    }
    // máquinas de chicles: de 6 a 14, simétricas; piden ~2,5 chicles por máquina (más si el bot va sobrado)
    if (chosen.includes('gumball')) {
      const want2 = 6 + rng.int(9), r0 = rng.range(2, R - 4), pat = rng.int(3);
      const spots = [];
      for (let r = 1; r < R - 1; r++) for (let c = 0; c < Math.ceil(C / 2); c++) {
        const m = c;
        const ok = pat === 0 ? (r === r0 || r === r0 + 1) && m % 2 === 0 : pat === 1 ? m === 0 && r >= r0 - 1 : (r === r0 && m <= 2) || (r === r0 + 2 && m === 1);
        if (ok) spots.push([r, c]);
      }
      let placed = 0;
      for (const [r, c] of spots) for (const cc of new Set([c, C - 1 - c])) if (placed < want2 && okc(r, cc) && !cells[r][cc]) { cells[r][cc] = { kind: 'gumball', hp: 0 }; placed++; }
      if (placed) {
        const count = Math.round(placed * 2.5);
        for (const row of cells) for (const o of row) if (o && o.kind === 'gumball') { o.hp = Math.ceil(count / placed); o.hp0 = o.hp; }
        goals.push({ type: 'gumball', count });
      }
      if (n === INTRO.gumball) say('Combina caramelos junto a las máquinas de chicles para que suelten chicles');
    }
    // tofellinos (toffee swirl): bloques con capas que caen si combinas debajo
    if (chosen.includes('waffle') || on('waffle')) {
      const want2 = 4 + Math.round(d * 4), hp = n === INTRO.waffle ? 2 : iceHp();
      let placed = 0;
      for (let i = 0; i < 80 && placed < want2; i++) {
        const r = rng.range(0, Math.floor(R / 2)), c = rng.int(C);
        if (okc(r, c) && !cells[r][c]) { cells[r][c] = { kind: 'ice', hp, fall: true, waffle: true }; placed++; }
      }
      if (placed && chosen.includes('waffle')) goals.push({ type: 'waffle', count: placed });
      if (n === INTRO.waffle) say('Combina caramelos junto a los tofellinos para quitarles capas. ¡Si combinas debajo, se caerán!');
    }
    // chocolate (se extiende si no lo rompes)
    if (on('choc')) {
      const want2 = 2 + Math.round(d * 3);
      let placed = 0;
      for (let i = 0; i < 80 && placed < want2; i++) {
        const r = rng.range(Math.floor(R / 2), R - 1), c = rng.int(C);
        if (okc(r, c) && !cells[r][c]) { cells[r][c] = { kind: 'ice', choc: true, hp: rng() < 0.4 ? 2 : 1 }; placed++; } // chocolate negro: 2 capas
      }
      if (n === INTRO.choc) say('Rompe el chocolate o se irá extendiendo');
    }
    // rellenar sin líneas hechas
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!okc(r, c) || cells[r][c]) continue;
      let col, tries = 0;
      do {
        col = rng.int(colors); tries++;
      } while (tries < 20 && ((c >= 2 && cells[r][c - 1] && cells[r][c - 2] && cells[r][c - 1].color === col && cells[r][c - 2].color === col) || (r >= 2 && cells[r - 1][c] && cells[r - 2][c] && cells[r - 1][c].color === col && cells[r - 2][c].color === col)));
      cells[r][c] = { kind: 'candy', color: col, sp: null };
    }
    const freeCandy = (r0, r1) => {
      for (let i = 0; i < 80; i++) {
        const r = rng.range(r0, r1), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.sp && !t.lock && !t.timer && !t.frog && !t.cham && !t.myst && !t.key && okc(r, c)) return t;
      }
      return null;
    };
    // candados sobre caramelos: mermelada (desde el 29; también se rompe al lado) y regaliz (desde el 52)
    for (const [k, marm] of [['marm', true], ['lock', false]]) {
      if (!on(k)) continue;
      const want2 = 3 + Math.round(d * 5);
      let placed = 0;
      for (let i = 0; i < 100 && placed < want2; i++) {
        const r = rng.range(2, R - 2), c = rng.int(C);
        const t = cells[r][c];
        if (t && t.kind === 'candy' && !t.lock) { t.lock = true; t.marm = marm; placed++; const u = cells[r][C - 1 - c]; if (placed < want2 && u && u.kind === 'candy' && !u.lock) { u.lock = true; u.marm = marm; placed++; } }
      }
      if (n === INTRO[k]) say(marm ? 'La mermelada sujeta el caramelo: rómpela combinándolo o haciendo líneas a su lado' : 'Los caramelos con regaliz no se mueven: haz línea con ellos para soltarlos');
    }
    // caramelos especiales ya puestos al empezar (rayados, envueltos, peces o bomba de color)
    if (on('pre')) {
      const np = 1 + rng.int(n < 50 ? 2 : 3);
      for (let i = 0; i < np; i++) {
        const t = freeCandy(1, R - 1);
        if (!t) continue;
        const q = rng.pick(['h', 'v', 'w', 'w', 'f', 'b']);
        if (q === 'b') Object.assign(t, { kind: 'bomb', color: undefined, sp: undefined }); else t.sp = q;
      }
    }
    // bombas de cuenta atrás: caramelos con un número que baja en cada jugada
    if (on('bomb')) {
      const nb = 1 + (d > 0.5 ? 1 : 0);
      for (let i = 0, k = 0; i < 60 && k < nb; i++) {
        const t = freeCandy(1, R - 3);
        if (t) { t.timer = 15 + rng.int(6); k++; }
      }
      if (n === INTRO.bomb) say('Quita la bomba antes de que llegue a 0 o perderás el nivel');
    }
    // rueda de coco y ovni: piezas que se usan intercambiándolas
    for (const kind of ['coco', 'ufo']) {
      if (!on(kind)) continue;
      const want2 = 1 + (rng() < 0.4 ? 1 : 0);
      for (let i = 0, k = 0; i < 60 && k < want2; i++) { const t = freeCandy(1, R - 2); if (t) { Object.assign(t, { kind, color: undefined, sp: undefined }); k++; } }
      if (n === INTRO[kind]) say(kind === 'coco' ? 'Intercambia la rueda de coco: rodará y convertirá 3 caramelos en rayados' : 'Intercambia el ovni: pondrá 3 caramelos envueltos que explotan');
    }
    // batidora mágica, palomitas y calavera ácida
    for (const [kind, hp] of [['mixer', 3], ['popcorn', 3], ['skull', 1], ['shell', 1 + rng.int(3)]]) {
      if (!on(kind)) continue;
      const want2 = kind === 'mixer' ? 1 + (d > 0.5 ? 1 : 0) : 2 + Math.round(d * 2);
      let placed = 0;
      for (let i = 0; i < 80 && placed < want2; i++) {
        const r = rng.range(2, R - 2), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.sp && !t.lock && !t.timer && okc(r, c)) { cells[r][c] = { kind, hp }; placed++; }
      }
      if (placed && kind !== 'popcorn') goals.push({ type: kind, count: placed });
      const tx = { mixer: 'La batidora mágica llena el tablero de glaseado: rómpela haciendo líneas a su lado', popcorn: 'Usa caramelos especiales para reventar las palomitas', skull: 'Rompe la calavera ácida combinando caramelos a su lado', shell: 'El caparazón de regaliz solo se rompe con caramelos especiales' };
      if (n === INTRO[kind]) say(tx[kind]);
    }
    // capa de azúcar: caramelos cubiertos de 1 a 3 capas que no se mueven; cada combinación con ellos o especial les quita una
    if (on('coat')) {
      const want2 = 4 + Math.round(d * 6); let placed = 0;
      for (let i = 0; i < 120 && placed < want2; i++) {
        const r = rng.range(2, R), c = rng.int(C), t = cells[r] && cells[r][c];
        if (t && t.kind === 'candy' && !t.sp && !t.lock && !t.timer && !t.frog && !t.coat && okc(r, c)) { t.coat = 1 + rng.int(3); placed++; }
      }
      if (placed) goals.push({ type: 'coat', count: placed });
      if (n === INTRO.coat) say('Combina los caramelos con capa de azúcar para quitársela: no se pueden mover');
    }
    // estreno real en Candy Crush: cordón de colores 715, chuche cítrica 1448, cristalizado 2042, bastones 3248, cobra 6355, paquetito precioso 11421
    const freeAt = (pred) => { for (let i = 0; i < 120; i++) { const r = rng.range(2, R), c = rng.int(C), t = cells[r] && cells[r][c]; if (t && t.kind === 'candy' && !t.sp && !t.lock && !t.timer && !t.frog && !t.coat && !t.glass && okc(r, c) && (!pred || pred(r, c))) return [r, c]; } return null; };
    if (on('glass')) { // caramelos cristalizados: capas en la casilla; atrapan el caramelo
      const want2 = 5 + Math.round(d * 6); let placed = 0;
      for (let i = 0; i < want2; i++) { const p = freeAt(); if (p) { cells[p[0]][p[1]].glass = 1 + rng.int(3); placed++; } }
      if (placed) goals.push({ type: 'glass', count: placed });
      if (n === INTRO.glass) say('Haz combinaciones con los caramelos cristalizados para romper sus capas: no se pueden deslizar');
    }
    if (on('twist')) { // cordón de colores: una cadena en fila; si rompes una pieza cae entera
      let placed = 0;
      for (let k = 0; k < 1 + (d > 0.5 ? 1 : 0); k++) {
        const p = freeAt((r, c) => c + 3 < C); if (!p) continue;
        const len = 3 + rng.int(2), tw = 1 + k;
        for (let j = 0; j < len && p[1] + j < C; j++) { const t = cells[p[0]][p[1] + j]; if (t && t.kind === 'candy' && okc(p[0], p[1] + j)) { cells[p[0]][p[1] + j] = { kind: 'twist', tw, hp: 1 }; placed++; } }
      }
      if (placed) goals.push({ type: 'twist', count: placed });
      if (n === INTRO.twist) say('Cordón de colores: rompe una pieza combinando a su lado y caerá toda la cadena');
    }
    for (const [kind, hp, tx] of [['citrus', 3, 'Chuche cítrica: combina a su lado tres veces para abrir la caja'], ['cobra', 3, 'Cobra gelatinosa: cárgala combinando a su lado; cargada, cruza su fila rompiéndolo todo']]) {
      if (!on(kind)) continue;
      let placed = 0;
      for (let i = 0; i < 1 + (d > 0.5 ? 1 : 0); i++) { const p = freeAt(); if (p) { cells[p[0]][p[1]] = { kind, hp }; placed++; } }
      if (placed) goals.push({ type: kind, count: placed });
      if (n === INTRO[kind]) say(tx);
    }
    let rapid = null;
    if (on('rapid')) { // rápidos del arcoíris: caminos que bajan desde arriba hasta un molde
      rapid = [];
      const run = (c) => { let r = top[c] || 0, k = 0; while (r < R && !hole[r][c]) { r++; k++; } return k; }; // casillas seguidas sin hueco desde arriba
      const cols0 = rng.shuffle([...Array(C).keys()]).sort((a, b) => run(b) - run(a)).slice(0, 1 + (d > 0.5 ? 1 : 0));
      for (const c0 of cols0) {
        let c = c0, r = top[c0] || 0; const path = [];
        const len = 5 + rng.int(3);
        while (path.length < len && r < R && !hole[r][c]) {
          path.push([r, c]);
          if (path.length === 3 && rng() < 0.5) { const nc = c + (rng() < 0.5 ? -1 : 1); if (nc >= 0 && nc < C && !hole[r][nc]) { c = nc; path.push([r, c]); } }
          r++;
        }
        if (path.length >= 5 && !rapid.some((p) => p.cells.concat([p.mold]).some(([a, b]) => path.some(([x, y]) => x === a && y === b)))) {
          const mold = path.pop(); cells[mold[0]][mold[1]] = { kind: 'mold' }; // como en sus niveles (156): casilla propia, sin caramelo
          rapid.push({ cells: path, mold });
        }
      }
      if (rapid.length) goals.push({ type: 'rapid', count: rapid.length }); else rapid = null;
      if (n === INTRO.rapid) say('Rápidos del arcoíris: haz combinaciones por su camino para que el arcoíris llegue al molde');
    }
    let nests = null;
    if (on('nest')) { // nidos de chispitas: de 1 a 3, de 2×2, resistencia 2 o 3 (sus niveles)
      nests = [];
      for (let i = 0; i < 40 && nests.length < 1 + rng.int(3); i++) {
        const r0 = rng.range(2, R - 2), c0 = rng.int(C - 1);
        let ok = true;
        for (let dr = 0; dr < 2 && ok; dr++) for (let dc = 0; dc < 2 && ok; dc++) { const t = cells[r0 + dr] && cells[r0 + dr][c0 + dc]; ok = !!t && t.kind === 'candy' && !t.orl && !t.sp && !t.lock && !hole[r0 + dr][c0 + dc]; }
        if (!ok) continue;
        const id = nests.length;
        for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) cells[r0 + dr][c0 + dc] = { kind: 'nest', nest: id };
        nests.push({ r: r0, c: c0, eggs: 4, str: 2 + rng.int(2), step: 0 });
      }
      if (nests.length) { goals.push({ type: 'sprink', count: nests.length * 4 }); if (n === INTRO.nest) say('Nido de chispitas: combina caramelos junto al nido hasta que los huevos eclosionen y quita a las chispitas del tablero'); } else nests = null;
    }
    let bobbers = null;
    if (on('bobber')) { // flotadores en casillas sin suelo pegadas al tablero (de 1 a 4)
      const cand = [];
      for (let r = 1; r < R; r++) for (let c = 0; c < C; c++) if (hole[r][c] && r >= (top[c] || 0) && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => r + dr >= 0 && r + dr < R && c + dc >= 0 && c + dc < C && !hole[r + dr][c + dc] && r + dr >= (top[c + dc] || 0))) cand.push([r, c]);
      if (cand.length) { bobbers = rng.shuffle(cand).slice(0, 1 + rng.int(Math.min(4, cand.length))); if (n === INTRO.bobber) say('Flotador de pesca: combina a su lado y soltará peces de gominola'); }
    }
    let ropes = null;
    if (on('rope')) { // triturachuches: de 1 a 2 cuerdas desde abajo, de 3 a 6 casillas (como en sus niveles)
      ropes = [];
      for (let i = 0; i < 30 && ropes.length < 1 + (d > 0.6 ? 1 : 0); i++) {
        const vert = rng() < 0.6, len = 3 + rng.int(4);
        let r0, c0, dr = 0, dc = 0;
        // desde abajo, como en sus niveles (así no deja casillas sin rellenar debajo): vertical hacia arriba u horizontal por la última fila
        if (vert) { c0 = rng.pick([0, C - 1, rng.int(C)]); r0 = R - 1; dr = -1; } else { r0 = R - 1; c0 = rng() < 0.5 ? 0 : C - 1; dc = c0 === 0 ? 1 : -1; }
        const path = [];
        for (let k = 0; k < len; k++) { const r = r0 + dr * k, c = c0 + dc * k; const t = cells[r] && cells[r][c]; if (!t || t.kind !== 'candy' || t.orl || hole[r][c] || r < 2) break; path.push([r, c]); }
        if (path.length < 3) continue;
        const id = ropes.length;
        path.forEach(([r, c], k) => { cells[r][c] = { kind: 'rope', rope: id, k, head: k === 0 }; });
        ropes.push({ cells: path, dir: [dr, dc] });
      }
      if (ropes.length) { goals.push({ type: 'rope', count: ropes.length }); if (n === INTRO.rope) say('Triturachuches: combina caramelos junto a la cuerda para acortarla y recoger la máquina'); } else ropes = null;
    }
    let orlocks = null;
    if (on('orlock')) { // cerrojos de pedido: de 1 a 4, casi siempre de una casilla; piden glaseado si lo hay, si no un color
      orlocks = [];
      const hasIce = cells.some((row) => row.some((t) => t && t.kind === 'ice'));
      const sizes = [[1, 1], [1, 1], [1, 1], [1, 1], [3, 1], [1, 2], [1, 3], [2, 2], [2, 1]];
      const want = 1 + rng.int(3 + (d > 0.5 ? 1 : 0));
      for (let i = 0; i < 40 && orlocks.length < want; i++) {
        const [w, h] = rng.pick(sizes), r0 = rng.range(2, R - h + 1), c0 = rng.int(C - w + 1);
        let ok = true;
        for (let r = r0; r < r0 + h && ok; r++) for (let c = c0; c < c0 + w && ok; c++) { const t = cells[r] && cells[r][c]; ok = !!t && t.kind === 'candy' && !t.sp && !t.lock && !t.orl && !t.glass && !t.coat && !hole[r][c]; }
        if (!ok) continue;
        const id = orlocks.length + 1, ice = hasIce && rng() < 0.5;
        for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) cells[r][c].orl = id;
        orlocks.push({ id, r: r0, c: c0, w, h, type: ice ? 'ice' : 'color', key: ice ? undefined : rng.int(colors), count: ice ? 5 + rng.int(6) : 10 + 5 * rng.int(4) });
      }
      if (!orlocks.length) orlocks = null;
      if (orlocks && n === INTRO.orlock) say('Cerrojo de pedido: recoge lo que pide para abrirlo');
    }
    if (on('wrapper')) { // paquetito precioso: tres cintas de colores
      let placed = 0;
      for (let i = 0; i < 1 + (d > 0.5 ? 1 : 0); i++) { const p = freeAt(); if (p) { cells[p[0]][p[1]] = { kind: 'wrapper', cols: rng.shuffle([...Array(colors).keys()]).slice(0, 3) }; placed++; } }
      if (placed) goals.push({ type: 'wrapper', count: placed });
      if (n === INTRO.wrapper) say('Paquetito precioso: quita cada cinta combinando su color al lado (o con un especial)');
    }
    // cañones: casillas de arriba que sueltan siempre lo mismo
    let cannon = null;
    if (on('cannon')) {
      cannon = new Array(C).fill(null);
      const opts = ings ? ['ing'] : ['lic', 'fish', 'stripe', 'lic'].concat(n > INTRO.bomb ? ['timer'] : []);
      const kd = rng.pick(opts), nc = 1 + (C > 8 && rng() < 0.5 ? 1 : 0);
      const rapCols = new Set((rapid || []).map((p) => p.cells[0][1])); // encima de los rápidos va su cañón de arcoíris
      for (let i = 0; i < nc; i++) { const col = i === 0 ? 1 + rng.int(2) : C - 2 - rng.int(2); if (!rapCols.has(col)) cannon[col] = kd; }
      if (n === INTRO.cannon) say('Los cañones de arriba sueltan regalos de vez en cuando');
    }
    // cintas transportadoras: cada jugada mueven su fila una casilla
    let belt = null;
    if (on('belt')) {
      const r0 = Math.floor(R / 2) - 1 + rng.int(2);
      belt = [{ r: r0, dir: 1 }];
      if (rng() < 0.5 && r0 + 2 < R - 1) belt.push({ r: r0 + 2, dir: -1 });
      if (n === INTRO.belt) say('La cinta transportadora mueve su fila en cada jugada');
    }
    // caramelos camaleón: cambian de color en cada jugada
    let chamRate = 0;
    if (on('cham')) {
      chamRate = 0.04;
      for (let i = 0; i < 4; i++) { const t = freeCandy(1, R - 1); if (t) t.cham = (t.color + 1 + rng.int(colors - 1)) % colors; }
      if (n === INTRO.cham) say('El caramelo camaleón cambia al color de su aro en cada jugada');
    }
    // caramelo misterioso: puede traer algo bueno... o malo
    let mystRate = 0;
    if (on('myst')) {
      mystRate = 0.025;
      for (let i = 0; i < 3; i++) { const t = freeCandy(1, R - 1); if (t) t.myst = true; }
      if (n === INTRO.myst) say('El caramelo misterioso puede traer una sorpresa buena... o mala');
    }
    // rana: se come los caramelos de su color; llena, tócala y elige dónde salta
    let frogFull = 0, frogColor = 0;
    if (on('frog')) {
      const t = freeCandy(2, R - 2);
      if (t) { t.frog = true; frogFull = 15 + Math.round(d * 8); frogColor = t.color; }
      if (n === INTRO.frog) say('La rana se come los caramelos de su color. Cuando esté llena, tócala y elige dónde salta');
    }
    // candados de azúcar (cofres): solo los abren las llaves de azúcar; cada llave quita una capa a todos
    let keyRate = 0;
    if (on('slock')) {
      const want2 = 2 + Math.round(d * 2), hp = n === INTRO.slock ? 1 : rng.pick(d < 0.5 ? [1, 2] : [2, 3]);
      let placed = 0;
      for (let i = 0; i < 80 && placed < want2; i++) {
        const r = rng.range(1, R - 2), c = rng.int(C), t = cells[r][c];
        if (t && t.kind === 'candy' && !t.sp && !t.lock && !t.timer && !t.frog && okc(r, c)) { cells[r][c] = { kind: 'slock', hp }; placed++; }
      }
      if (placed) {
        keyRate = 0.05;
        const k = freeCandy(0, R - 1); if (k) k.key = true;
        goals.push({ type: 'slock', count: placed });
      }
      if (n === INTRO.slock) say('Combina las llaves de azúcar para abrir los candados');
    }
    // caramelo +5 movimientos
    let plusRate = 0;
    if (on('plus5')) { plusRate = 0.002; const t = freeCandy(1, R - 1); if (t) t.plus5 = true; if (n === INTRO.plus5) say('Combina el caramelo +5 para ganar movimientos'); }
    // vallas: pared fija entre dos columnas
    let wall = null;
    if (on('wall')) {
      wall = cells.map((row) => row.map(() => 0));
      const cb = Math.floor(C / 2) - 1 + rng.int(2), r0 = rng.range(2, R - 5);
      for (let r = r0; r < r0 + 4; r++) if (okc(r, cb) && okc(r, cb + 1)) wall[r][cb] = 1;
      if (n === INTRO.wall) say('Las vallas no dejan pasar: no se puede intercambiar a través de ellas');
    }
    if (on('cane')) { // bastones de caramelo: vallas de 1 a 3 capas que quitan las combinaciones de al lado
      wall = wall || cells.map((row) => row.map(() => 0));
      const cb = rng.range(1, C - 2), r0 = rng.range(2, R - 4); let placed = 0;
      for (let r = r0; r < r0 + 3; r++) if (okc(r, cb) && okc(r, cb + 1) && !wall[r][cb]) { wall[r][cb] = 2 + rng.int(3); placed++; }
      if (placed) goals.push({ type: 'cane', count: placed });
      if (n === INTRO.cane) say('Combina caramelos junto a los bastones de caramelo para quitarles capas');
    }
    // glaseado que cae desde arriba con los caramelos nuevos
    let fallIceRate = 0;
    if (on('fallIce')) { fallIceRate = 0.04; if (n === INTRO.fallIce) say('Desde arriba cae glaseado: rómpelo haciendo líneas a su lado'); }
    // como mucho 4 objetivos
    // (sin quitar nunca el de la pieza que se estrena en este nivel)
    while (goals.length > 4) {
      let i = goals.findIndex((g) => g.type === 'color');
      if (i < 0) for (let j = goals.length - 1; j >= 0; j--) if (INTRO[goals[j].type] !== n) { i = j; break; }
      goals.splice(i < 0 ? goals.length - 1 : i, 1);
    }
    // especiales que caen desde arriba durante el nivel (peces, rayados o bombas de color)
    let spRate = 0, spKind = null;
    if (on('sp')) { spRate = 0.02; spKind = rng.pick(['fish', 'stripe', 'stripe', 'bomb']); }
    const spec = { R, C, top, colors, cells, jelly, goals, ings, text, d, licRate, hole, spawn, portal, spRate, spKind, cannon, belt, chamRate, mystRate, frogFull, frogColor, keyRate, plusRate, wall, fallIceRate, rapid, orlocks, ropes, bobbers, nests };
    // cada casilla tiene que poder rellenarse: se rellena un tablero de prueba con solo las piezas que no caen
    // (glaseado, chicle, candados, cofres, batidoras...). Si alguna casilla se queda sin caramelo: si la tapa una de esas
    // piezas, se quita (y se descuenta de su objetivo); si está debajo de un hueco (p. ej. ancho, donde no llega la
    // diagonal), se le pone un grifo en lo alto de su tramo
    const stays = (o) => o && !movable(o) && o.kind !== 'ing';
    const dropGoal = (o) => {
      const ty = o.kind === 'ice' ? (o.gum ? 'gum' : o.choc || o.fall ? null : 'ice') : ['slock', 'mixer', 'skull', 'cake'].includes(o.kind) ? o.kind : null;
      const i = ty ? goals.findIndex((g) => g.type === ty) : -1;
      if (i >= 0 && --goals[i].count <= 0) goals.splice(i, 1);
    };
    // tarta bomba (desde el 441): 2×2 casillas de caramelos (o de glaseado o tofellino, que se descuentan de su pedido), la última pieza que se pone; solo donde todo el tablero se
    // sigue pudiendo rellenar con ella (lo de debajo se rellena en diagonal), y su pedido (en Candy Crush, objetivo 22)
    const unfilled = () => {
      const Se = buildState(Object.assign({}, spec, { cells: cells.map((row) => row.map((o) => (stays(o) ? o : null))), cannon: null }), 7);
      fill(Se, nullK);
      const out = new Set(); for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) if (okc(r, c) && !Se.grid[r][c]) out.add(r * 64 + c);
      return out;
    };
    if (on('cake')) {
      let placed = 0; const want2 = 1 + (d > 0.6 ? 1 : 0), base = unfilled();
      const pos = []; for (let r = 2; r <= R - 2; r++) for (let c = 0; c < C - 1; c++) pos.push([r, c]);
      for (let i = pos.length - 1; i > 0; i--) { const j = rng.int(i + 1); [pos[i], pos[j]] = [pos[j], pos[i]]; } // todas las posiciones, en orden al azar
      for (const [r, c] of pos) {
        if (placed >= want2) break;
        const q = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
        const free = (o) => o && ((o.kind === 'candy' && !o.sp && !o.lock && !o.timer && !o.frog && !o.coat && !o.glass && !o.key) || (o.kind === 'ice' && !o.choc && !o.fall));
        if (!q.every(([rr, cc]) => okc(rr, cc) && free(cells[rr][cc]))) continue;
        const old = q.map(([rr, cc]) => cells[rr][cc]), G = { hp: 8, r, c, tiles: [] };
        q.forEach(([rr, cc], k) => { const tt = { kind: 'cake', q: k, cake: G, tr0: rr, tc0: cc }; G.tiles.push(tt); cells[rr][cc] = tt; });
        // no puede dejar sin rellenar ninguna casilla de debajo que antes sí se rellenaba (las de al lado las arregla el paso
        // siguiente quitando la pieza fija de encima; las de debajo de la tarta no)
        const u = unfilled();
        if ([...u].every((k) => base.has(k) || ((k & 63) !== c && (k & 63) !== c + 1) || (k >> 6) <= r + 1)) { placed++; old.forEach((o) => { if (o.kind === 'ice') dropGoal(o); }); } else q.forEach(([rr, cc], k) => { cells[rr][cc] = old[k]; });
      }
      if (placed) goals.push({ type: 'cake', count: placed });
      if (n === INTRO.cake && placed && !spec.text) spec.text = 'Combina caramelos junto a la tarta bomba para quitarle las porciones: ¡sin porciones barre el tablero!'; // spec ya está hecho: say() no llegaría
    }
    for (let k = 0; k < 24; k++) {
      const Se = buildState(Object.assign({}, spec, { cells: cells.map((row) => row.map((o) => (stays(o) ? o : null))), cannon: null }), 7);
      fill(Se, nullK);
      let done = true;
      for (let c = 0; c < C && done; c++) for (let r = 0; r < R && done; r++) if (okc(r, c) && !Se.grid[r][c]) {
        done = false;
        let q = r; while (q > top[c] && okc(q - 1, c) && !stays(cells[q - 1][c])) q--;
        const o = q > top[c] && okc(q - 1, c) ? cells[q - 1][c] : null;
        if (o && o.kind === 'cake') { // primero se libera la pieza fija de al lado (lo de debajo de la tarta se rellena en diagonal); si no hay, fuera la tarta entera
          const G = o.cake, rb = G.r + 1, sides = [[rb, G.c - 1], [rb, G.c + 2]].filter(([rr, cc]) => cc >= 0 && cc < C && okc(rr, cc) && stays(cells[rr][cc]) && cells[rr][cc].kind !== 'cake');
          if (sides.length) for (const [rr, cc] of sides) { dropGoal(cells[rr][cc]); cells[rr][cc] = { kind: 'candy', color: rng.int(colors), sp: null }; }
          else { dropGoal(o); for (const tt of G.tiles) cells[tt.tr0][tt.tc0] = { kind: 'candy', color: rng.int(colors), sp: null }; }
        }
        else if (o && o.kind === 'mold') { spawn[q][c] = 1; portal[q][c] = 0; } // el molde de los rápidos se queda: debajo, un grifo
        else if (o) { if (o.lock) { o.lock = false; o.marm = undefined; } else { dropGoal(o); cells[q - 1][c] = { kind: 'candy', color: rng.int(colors), sp: null }; } }
        else { spawn[q][c] = 1; portal[q][c] = 0; }
      }
      if (done) break;
    }
    if (!goals.length) goals.push({ type: 'color', key: rng.int(colors), count: 30 });
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
    const vis = new Set(), born = E.t; // born: cuándo empezó la partida (para el dibujo WebGL)
    const vj = S.jelly.map((row) => row.slice());
    const dying = [];
    const fxs = [];
    const queue = [];
    let cur = null; // fase en reproducción
    let excLoop = 0; // la cascada más larga de la jugada en curso (para su exclamación)
    let phaseT = 0;
    let sel = null, drag = null;
    let hint = null;
    let swapAnim = null;
    // tiempos del estilo elegido (en 'Original', medidos en el Candy Crush real a 60 fps)
    const TM = () => Object.assign({ swap: 0.17, remove: 0.25, gravity: 3000 / 72, shrink: false, swapFront: 1 }, E.skin('timing') || {});

    const cx = (c) => bx + c * ts + ts / 2;
    const cy = (r) => by + r * ts + ts / 2;

    // receptor que construye las fases de animación
    let building = null;
    const K = {
      inPhase: false,
      begin() { building = { removes: [], fx: [], created: [], hurts: [], jelly: [], spawns: new Map(), dur: TM().remove, collects: [] }; },
      end(SS) {
        building.snap = [];
        for (let r = 0; r < SS.R; r++) for (let c = 0; c < SS.C; c++) { const t = SS.grid[r][c]; if (t) building.snap.push([t, r, c]); }
        queue.push(building); building = null;
      },
      remove(t, r, c, delay, mode, to) { building.removes.push({ t, r, c, delay, mode, to }); building.dur = Math.max(building.dur, delay + TM().remove); },
      created(t, r, c, delay) { building.created.push({ t, r, c, delay }); building.dur = Math.max(building.dur, delay + 0.2); },
      fx(f) { building.fx.push(f); building.dur = Math.max(building.dur, f.delay + 0.35); },
      hurt(t, delay, hp) { building.hurts.push({ t, delay, hp }); },
      jelly(r, c, v, delay) { building.jelly.push({ r, c, v, delay }); },
      spawn(t, c, k, row) { building.spawns.set(t, { k, row: row || 0 }); },
      collect(type, key, r, c, delay) { building.collects.push({ type, key, r, c, delay }); },
      sound(size, loop) { building.sound = { size, loop }; },
      points(color, cells, pts) { (building.points = building.points || []).push({ color, cells, pts }); },
      combo(loop) { building.loop = loop; },
      shuffle(SS) { K.begin(); building.shuffle = true; K.end(SS); },
      extraTime(sec, r, c, delay) { E.after(delay + 0.1, () => E.addTime(sec, cx(c), cy(r) - 20)); },
      extraMoves(n, r, c, delay) { E.after(delay + 0.1, () => { P.moves += n; E.floatText(cx(c), cy(r) - 20, '+' + n + ' movimientos', '#2bb24c', 38); E.sfx('special'); }); },
      frogMove(t, r, c) { building.frog = { t, r, c }; building.dur = Math.max(building.dur, 0.45); },
      bombOut(r, c) { E.after(0.1, () => { E.floatText(cx(c), cy(r) - 30, '¡BUM!', '#ff5050', 40); E.sfx('bomb'); E.shake(0.5); }); },
    };

    P.layout = function (area) {
      const gl = window.GL && GL.boardLayout && GL.boardLayout(S.C, S.R, area); // con WebGL, las medidas del Candy Crush real
      ts = gl ? gl.ts : Math.min(area.w / S.C, area.h / S.R, 76);
      bx = gl ? gl.x : area.x + (area.w - ts * S.C) / 2;
      by = gl ? gl.y : area.y + (area.h - ts * S.R) / 2;
      if (!P.placed) {
        P.placed = true;
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
          const t = S.grid[r][c];
          if (!t) continue;
          t.tr = r; t.tc = c; t.x = cx(c); t.y = cy(r); t.vy = 0; t.wait = 0; // como en Candy Crush (medido en el emulador): el tablero aparece ya lleno, sin caída inicial
          if (t.kind === 'ice' || t.kind === 'mixer' || t.kind === 'popcorn' || t.kind === 'skull' || t.kind === 'slock' || t.kind === 'shell' || ['wrapper', 'citrus', 'twist', 'cobra', 'cake'].includes(t.kind)) { t.y = cy(r); t.wait = 0; }
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
      fxEv('SwitcherSwitch', ax, ay); fxEv('SwitcherSwitch', bx2, by2); // el aro de luz de las dos casillas
      swapAnim = { t: 0 };
      const tsw = TM().swap, fr = TM().swapFront;
      if (fr !== 1) { tb.sc = 1; E.tween(tb, { sc: fr }, tsw / 2, { done: () => E.tween(tb, { sc: 1 }, tsw / 2) }); tb.front = true; }
      E.tween(ta, { x: bx2, y: by2 }, tsw, { ease: E.ease.inOut });
      E.tween(tb, { x: ax, y: ay }, tsw, {
        ease: E.ease.inOut,
        done: () => {
          tb.front = false;
          if (ok) { swapAnim = null; P.moves--; if (S.bombOut) { P.dead = true; P.deadMsg = '¡La bomba ha explotado!'; } return; }
          E.sfx('bad'); fxEv(a[0] === b[0] ? 'SwitcherIllegalMoveHorizontal' : 'SwitcherIllegalMoveVertical', (ax + bx2) / 2, (ay + by2) / 2);
          E.tween(ta, { x: ax, y: ay }, tsw, { ease: E.ease.inOut });
          E.tween(tb, { x: bx2, y: by2 }, tsw, { ease: E.ease.inOut, done: () => { swapAnim = null; tb.front = false; } });
        },
      });
      if (ok) { ta.tr = b[0]; ta.tc = b[1]; tb.tr = a[0]; tb.tc = a[1]; }
    }
    P.down = function (x, y) {
      if (P.finaleOn) { P.skipFinale(); return; } // "Toca para saltar"
      if (P.busy) return;
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
          const go = () => {
            S.grid[ar][ac] = tb; S.grid[rc[0]][rc[1]] = ta;
            ta.tr = rc[0]; ta.tc = rc[1]; tb.tr = ar; tb.tc = ac;
            E.tween(ta, { x: cx(rc[1]), y: cy(rc[0]) }, 0.2); E.tween(tb, { x: cx(ac), y: cy(ar) }, 0.2);
            E.sfx('swap');
            E.after(0.22, () => { K.begin(); K.inPhase = true; resolve(S, K, [[ar, ac], rc]); });
          };
          // la mano de Candy Crush da una palmada y empuja hacia el otro caramelo; el cambio, al empujar
          const d = anim3d('hand', ar, ac, rc[0] < ar ? 'up' : rc[0] > ar ? 'down' : rc[1] < ac ? 'left' : 'right');
          if (d) { E.sfx('handUse'); P.waitBooster = true; E.after(d, () => { P.waitBooster = false; go(); }); } else go();
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
      // un toque sin arrastrar solo selecciona: como en Candy Crush, los especiales se usan combinándolos (rana aparte)
      if (drag && !P.busy && !P.finaleOn) {
        const [r, c] = drag.rc, t = S.grid[r][c];
        if (t && t.frog && S.frogBelly >= S.frogFull && sel && sel.t === t) {
          t.sel = false; sel = null; frogAim = true;
          E.floatText(E.W / 2, by + (S.R * ts) / 2, 'Toca dónde quieres que salte la rana', '#fff', 34);
          E.sfx('magic');
        }
      }
      drag = null;
    };

    let switchFrom = null, frogAim = false;
    // con WebGL, la animación 3D de Candy Crush del potenciador (martillo, pincel, mano) y el golpe cuando toca
    const anim3d = (kind, r, c, dir) => (window.GL && GL.booster3d && E.glBoard ? GL.booster3d(kind, cx(c), cy(r), dir) : 0) || 0;
    function useBooster(id, r, c, now) {
      if (id === 'switch') { const t = S.grid[r][c]; if (swappable(t)) { switchFrom = [r, c]; t.sel = true; } return; }
      if (!now && (id === 'hammer' || id === 'row')) {
        const t = S.grid[r][c];
        if (id === 'hammer' && (!t || t.kind === 'ing')) return;
        const d = anim3d(id === 'hammer' ? 'hammer' : 'brushh', r, c);
        if (d) { E.sfx(id === 'hammer' ? 'hammerCharge' : 'brushUse'); P.waitBooster = true; E.after(d, () => { P.waitBooster = false; if (id === 'hammer') E.sfx('hammerHit'); useBooster(id, r, c, true); }); return; }
      }
      K.begin();
      if (id === 'hammer') {
        const t = S.grid[r][c];
        if (!t || t.kind === 'ing') { building = null; return; }
        if (t.kind === 'ice') t.hp = 1;
        hit(S, r, c, 0, K);
        if (t.choc) S.chocHit = true;
        E.sfx('bomb'); E.shake(0.2); fxEv('Hammer', cx(c), cy(r));
      } else if (id === 'row') {
        fxEv('UseBrushHorizontal', cx(c), cy(r));
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
      if (t && t.glass) return 'Caramelo cristalizado: no se puede deslizar; combínalo para romper sus capas';
      if (t && t.kind === 'wrapper') return 'Paquetito precioso: quita cada cinta combinando su color al lado';
      if (t && t.kind === 'citrus') return 'Chuche cítrica: combina a su lado para abrir la caja';
      if (t && t.kind === 'twist') return 'Cordón de colores: rompe una pieza y caerá toda la cadena';
      if (t && t.kind === 'cobra') return 'Cobra gelatinosa: cárgala combinando a su lado; cargada, cruza su fila';
      if (t && t.coat) return 'Capa de azúcar: el caramelo no se mueve; combínalo para quitarle las capas';
      if (t && t.lock) return t.marm ? 'Mermelada: el caramelo no se mueve; se rompe al combinarlo o haciendo líneas a su lado' : 'Regaliz: el caramelo no se mueve hasta que hagas línea con él';
      if (t && t.timer) return 'Bomba: quítala antes de que llegue a 0 o perderás';
      if (t && t.cham != null) return 'Caramelo camaleón: cambia al color de su aro en cada jugada';
      if (t && t.myst) return 'Caramelo misterioso: puede traer algo bueno... o malo';
      if (t && t.key) return 'Llave de azúcar: combínala para abrir los candados de azúcar';
      if (t && t.plus5) return 'Combínalo y ganarás 5 movimientos';
      if (t && t.clock) return 'Caramelo de reloj: combínalo y tendrás 5 segundos más';
      if (t && t.kind === 'candy' && t.sp) return t.sp === 'w' ? 'Envuelto: explota dos veces a su alrededor' : t.sp === 'f' ? 'Pez: va a por lo que te falta' : 'Rayado: limpia su fila o su columna';
      const K2 = { bomb: 'Bomba de color: quita todos los caramelos de un color', lic: 'Regaliz: se rompe haciendo líneas a su lado', ing: 'Ingrediente: bájalo hasta abajo del todo',
        mixer: 'Batidora mágica: llena el tablero de glaseado; rómpela haciendo líneas a su lado', popcorn: 'Palomitas: revientan con caramelos especiales', skull: 'Calavera ácida: rómpela combinando a su lado', shell: 'Caparazón de regaliz: solo lo rompen los caramelos especiales',
        slock: 'Candado de azúcar: lo abren las llaves de azúcar' };
      if (t && t.kind === 'cake') return 'Tarta bomba: combina a su lado para quitarle porciones; sin porciones, ¡barre todo el tablero!';
      if (t && t.kind === 'coco') return 'Rueda de coco: intercámbiala y rodará convirtiendo 3 caramelos en rayados';
      if (t && t.kind === 'ufo') return 'Ovni: intercámbialo y pondrá 3 caramelos envueltos que explotan';
      if (t && t.kind === 'gumball') return 'Máquina de chicles: combina a su lado o dale con un especial para que suelte chicles';
      if (t && t.kind === 'ice' && t.gum) return 'Chicle: combina a su lado para quitarle capas; al romperse explota alrededor';
      if (t && t.kind === 'ice') return t.choc ? 'Chocolate: rómpelo o se irá extendiendo' : t.waffle ? 'Tofellino: combina a su lado para quitarle capas; si combinas debajo, se cae' : 'Glaseado: rómpelo haciendo líneas a su lado';
      if (t && K2[t.kind]) return K2[t.kind];
      if (S.wall && (S.wall[r][c] >= 2 || (c > 0 && S.wall[r][c - 1] >= 2))) return 'Bastón de caramelo: combina a su lado para quitarle capas';
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
      // los caramelos que harían la línea (Candy Crush los ilumina a todos)
      const [a, b] = sw[0]; S.grid[a[0]][a[1]] = hint.b; S.grid[b[0]][b[1]] = hint.a;
      const gs = findGroups(S), cells = new Set([hint.a, hint.b]);
      for (const G of gs) { const ks = [...G.cells.values()]; if (ks.some(([r, c]) => (r === a[0] && c === a[1]) || (r === b[0] && c === b[1]))) for (const [r, c] of ks) cells.add(S.grid[r][c]); }
      S.grid[a[0]][a[1]] = hint.a; S.grid[b[0]][b[1]] = hint.b;
      hint.tiles = [...cells].filter(Boolean);
    };

    function startPhase(ph) {
      cur = ph; phaseT = 0;
      if (ph.shuffle) {
        E.floatText(E.W / 2, by + (S.R * ts) / 2, '¡Mezclando!', '#fff', 44);
        for (const [t, r, c] of ph.snap) { fxEv('ShuffleHideCandy', t.x, t.y); t.tr = r; t.tc = c; E.tween(t, { x: cx(c), y: cy(r) }, 0.5, { ease: E.ease.inOut, done: () => fxEv('ShuffleShowCandy', t.x, t.y) }); }
        ph.dur = 0.55; ph.started = true;
        return;
      }
      if (ph.sound) E.sfx('pop', 1 + Math.min(ph.loop || 0, 5) * 0.12);
      if (ph.points && window.GL && GL.scorePop) for (const q of ph.points) { // los números de puntos de Candy Crush, en el centro del grupo
        let x = 0, y = 0; for (const [r, c] of q.cells) { x += cx(c); y += cy(r); }
        GL.scorePop(x / q.cells.length, y / q.cells.length, String(q.pts), q.color);
      }
      // como en Candy Crush (Sweet, Tasty, Delicious, Divine): una sola exclamación por jugada, al acabar la cascada (ver más abajo)
      if (ph.loop >= 2) excLoop = Math.max(excLoop, ph.loop);
      for (const f of ph.fx) f.age = -f.delay;
      for (const f of ph.fx) fxs.push(f);
      for (const rm of ph.removes) { rm.age = -rm.delay; dying.push(rm); }
      for (const h of ph.hurts) E.after(h.delay, () => { if (h.t.kind === 'cake') { h.t.vhp = h.hp; fxEv('SwitcherClearCakeBombLayer', h.t.x + ts / 2, h.t.y + ts / 2); E.sfx('land', 0.8); return; } if (h.t.kind === 'gumball') { h.t.vhp = h.hp; h.t.sc = 0.9; E.tween(h.t, { sc: 1 }, 0.25, { ease: E.ease.outBack }); E.burst(h.t.x, h.t.y - 10, ['#ff9ad5', '#c9a0ff', '#fff'], 6, { size: 10 }); return; } if (fxEv(h.hp === 'unlock' ? 'SwitcherClearLicorice' : 'multi_frosting_damage', h.t.x, h.t.y)) { if (h.hp === 'unlock') { h.t.vlock = false; E.sfx('land', 1.4); } else h.t.vhp = h.hp; return; } if (h.hp === 'unlock') { h.t.vlock = false; E.burst(h.t.x, h.t.y, ['#26262e', '#55555f'], 8, { size: 9 }); E.sfx('land', 1.4); } else { h.t.vhp = h.hp; E.burst(h.t.x, h.t.y, ['#fff', '#cfe8ff'], 8, { size: 9 }); } });
      for (const j of ph.jelly) E.after(j.delay, () => { vj[j.r][j.c] = j.v; if (fxEv(j.v > 0 ? 'SwitcherJellyDamaged' : 'SwitcherJellyRemoved', cx(j.c), cy(j.r))) return; E.burst(cx(j.c), cy(j.r), ['#ff7ad9', '#fff'], 6, { size: 8 }); });
      for (const cr of ph.created) {
        cr.t.x = cx(cr.c); cr.t.y = cy(cr.r); cr.t.tr = cr.r; cr.t.tc = cr.c; cr.t.sc = 0; cr.t.vy = 0;
        E.after(cr.delay, () => { vis.add(cr.t); E.tween(cr.t, { sc: 1 }, 0.3, { ease: E.ease.outBack }); E.sfx('special');
          const t2 = cr.t; fxEv(t2.kind === 'bomb' ? 'SwitcherCreateColorBomb' : t2.sp === 'w' ? 'SwitcherCreateWrapped' : t2.sp === 'h' || t2.sp === 'v' ? 'SwitcherCreateStriped' : '', t2.x, t2.y, t2.color); });
      }
      if (ph.frog) { const f = ph.frog; f.t.sc = 1; f.t.tr = f.r; f.t.tc = f.c; E.tween(f.t, { x: cx(f.c), y: cy(f.r) }, 0.3, { ease: E.ease.inOut }); E.tween(f.t, { sc: 1.5 }, 0.15, { done: () => E.tween(f.t, { sc: 1 }, 0.15) }); }
      for (const co of ph.collects) {
        E.after(co.delay + 0.05, () => { if (E.goal(co.type, co.key, 1, cx(co.c), cy(co.r))) E.sfx('collect', 1 + Math.random() * 0.2); });
      }
    }
    // efecto del estilo elegido (las partículas originales de Candy Crush en el estilo 'Original')
    function fxEv(name, x, y, color) { const f = E.skin('fxEvent'); return !!(f && name && f(name, x, y, ts, color)); }
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
          t.vy = (t.vy || 0) + TM().gravity * ts * dt;
          if (TM().maxFall) t.vy = Math.min(t.vy, TM().maxFall * ts);
          t.y += t.vy * dt;
          moving = true;
          if (t.y >= ty) { t.y = ty; if (t.vy > ts * 4) E.sfx('land', 1 + Math.random() * 0.1); t.vy = 0; } // como Candy Crush (candy_land_1..4): suena al llegar
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
          const ev = t.kind === 'candy' ? 'SwitcherExplodeNormalCandy' : t.kind === 'ice' ? (t.choc ? 'SwitcherClearChocolate' : t.waffle ? 'SwitcherExplodeIceCream1' : 'SwitcherClearMultiLayerFrosting2') : t.kind === 'lic' ? 'SwitcherExplodeLicoriceSquare' : t.kind === 'bomb' ? 'SwitcherExplodeColorBomb' : null;
          const tmr = TM(), fire = () => fxEv(ev, d.x, d.y, t.color);
          if (ev && (tmr.shrink && t.kind === 'candy' ? (E.after(tmr.remove * 0.85, fire), !!E.skin('fxEvent')) : fire())) { if (t.sp === 'w') { E.sfx('bomb'); E.shake(0.25); } else if (t.sp) E.sfx('rocket'); else if (t.kind === 'bomb') E.sfx('magic'); }
          else if (t.kind === 'candy') E.burst(d.x, d.y, [COLORS[t.color], '#fff'], 6, { size: 9 });
          else if (t.kind === 'ice' && t.choc) { E.burst(d.x, d.y, ['#8a5530', '#4a2a14', '#c58a5a'], 12, { size: 11 }); E.sfx('land', 1.2); }
          else if (t.kind === 'ice') { E.burst(d.x, d.y, ['#fff', '#cfe8ff', '#9cc9ef'], 12, { size: 11 }); }
          else if (t.kind === 'lic') { E.burst(d.x, d.y, ['#1d1d24', '#55555f'], 10, { size: 10 }); }
          else if (t.kind === 'ing') { E.floatText(d.x, d.y - 20, '¡Bien!', '#ffe14d', 36); E.sfx('rescue'); }
          else if (t.kind === 'bomb') E.sfx('magic');
          if (t.sp === 'w') { E.sfx('bomb'); E.shake(0.25); }
          else if (t.sp) E.sfx('rocket');
        }
        if (d.age > TM().remove + 0.03) dying.splice(i, 1);
      }
      for (let i = fxs.length - 1; i >= 0; i--) {
        const f = fxs[i]; const was = f.age; f.age += dt;
        if (was < 0 && f.age >= 0) { const sf = E.skin('fxStart'); if (sf && sf(f, cx(f.c), cy(f.r), ts, (rr, cc) => [cx(cc), cy(rr)])) f.skin = true; }
        if (f.age > 0.5) fxs.splice(i, 1);
      }
      if (hint) hint.t += dt;
      P.busy = !!swapAnim || !!cur || queue.length > 0 || moving || dying.length > 0 || !!P.finaleOn || !!P.waitBooster;
      // al acabar la cascada: una exclamación (desde 3 eslabones), arriba del tablero para no tapar las piezas
      if (excLoop && !cur && !queue.length && !moving) {
        const k = Math.min(excLoop, 5); excLoop = 0;
        if (k >= 3) {
          const words = ['', '', '¡Dulce!', '¡Sabroso!', '¡Delicioso!', '¡Divino!'], ey = Math.max(60, by - ts * 0.55);
          if (!E.exclaim(k - 1, E.W / 2, ey)) E.floatText(E.W / 2, ey, words[k - 1], '#ff5fb0', 44);
          E.sfx('vo' + (k - 1));
        }
      }
    };

    // para el dibujo WebGL (gl.js): dónde está el tablero y qué casillas tiene
    // para el dibujo WebGL (gl.js): el tablero, sus piezas, las que desaparecen, los efectos y cuándo cambia lo de debajo
    // y lo de encima de los caramelos (firmas: si no cambian, sus imágenes no se rehacen)
    P.glState = () => {
      let under = ts + '|' + bx + '|' + by + '|' + (S.ingLeft > 0 || spec.ings ? 1 : 0) + '|';
      for (let r = 0; r < S.R; r++) under += vj[r].join(',') + ';';
      if (S.rapid) for (const q of S.rapid) under += 'r' + q.p;
      let over = ts + '|' + bx + '|' + by + '|';
      if (S.wall) for (let r = 0; r < S.R; r++) over += S.wall[r].join(',') + ';';
      for (const t of vis) if (t.frog) t.fillK = S.frogBelly / S.frogFull;
      return { S, ts, bx, by, inB: (r, c) => inB(S, r, c), vis, dying, fxs, hint, drawTile, TM, finaleOn: P.finaleOn, celebrate: P.celebrate, tossing: P.tossing, cx, cy, under, over, COLORS, t0: born };
    };
    // lo de debajo de los caramelos (gelatina, portales, cintas, salidas…) y lo de encima (cañones, muros, flechas): aparte
    // para que Dulces HD los pase a WebGL como imágenes que solo se rehacen si cambian (P.glState)
    P.drawUnder = function (g, o) {
      if (S.rapid && !(o && o.noRapid)) for (const p of S.rapid) p.cells.forEach(([r, c], i) => {
        const x0 = bx + c * ts, y0 = by + r * ts, done = i < p.p;
        g.save(); E.rr(g, x0 + ts * 0.3, y0, ts * 0.4, ts, ts * 0.12);
        if (done) { const gr = g.createLinearGradient(x0 + ts * 0.3, 0, x0 + ts * 0.7, 0); ['#ff5050', '#ffb030', '#ffe040', '#60d060', '#50a0ff', '#b070ff'].forEach((cc, k) => gr.addColorStop(k / 5, cc)); g.fillStyle = gr; g.globalAlpha = 0.75; }
        else { g.fillStyle = 'rgba(20,20,60,0.35)'; }
        g.fill(); g.restore();
      });
      if (S.rapid && !(o && o.noRapid)) for (const p of S.rapid) if (p.mold) E.emoji(g, p.p >= p.cells.length ? '⭐' : '🏺', bx + p.mold[1] * ts + ts / 2, by + p.mold[0] * ts + ts / 2, ts * 0.5);
      // generadores bajo los huecos
      if (S.portal) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.portal[r][c]) {
        // portal: anillo de entrada encima del hueco y de salida debajo
        const pe = S.portal[r][c];
        let q = r - 1, qc = c; if (typeof pe === 'object') { q = pe.r; qc = pe.c; } else while (q >= 0 && S.hole[q][c]) q--;
        const pim = E.skin('portal'), pdraw = E.skin('portalDraw');
        for (const [rr, cc, col] of [[q + 1, qc, '#3fa9f5'], [r, c, '#ff8c1a']]) {
          if (pdraw && pdraw(g, bx + cc * ts + ts / 2, by + rr * ts, ts, rr === q + 1)) continue;
          if (pim) { const w = ts * 1.1, h = (w * pim.height) / pim.width; g.drawImage(pim, bx + cc * ts + ts / 2 - w / 2, by + rr * ts - h / 2, w, h); continue; }
          g.save(); g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.ellipse(bx + cc * ts + ts / 2, by + rr * ts, ts * 0.4, 6, 0, 0, 7); g.stroke(); g.restore();
        }
        if (typeof pe === 'object') { const n2 = (r * 7 + c) % 9 + 1; for (const [rr, cc] of [[q + 1, qc], [r, c]]) E.text(g, String(n2), bx + cc * ts + ts * 0.86, by + rr * ts, ts * 0.22, '#fff', { stroke: '#3a2a6a', sw: 3 }); } // pareja numerada
        g.fillStyle = 'rgba(255,255,255,0.07)';
      }
      if (S.spawn) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.spawn[r][c]) { g.fillStyle = 'rgba(255,220,120,0.9)'; E.rr(g, bx + c * ts + ts * 0.2, by + r * ts - 4, ts * 0.6, 8, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,0.07)'; }
      if (S.cannon) for (let c = 0; c < S.C; c++) if (S.cannon[c]) {
        const ci = E.skin('cannonImg') && E.skin('cannonImg')(S.cannon[c]);
        if (ci) continue; // el del estilo se dibuja después de las piezas, colgando sobre la primera casilla
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
        const ex = E.skin('ingExit');
        for (let c = 0; c < S.C; c++) { if (ex) { const w = ts * 0.5, h = (w * ex.height) / ex.width; g.drawImage(ex, cx(c) - w / 2, by + S.R * ts + 4, w, h); } else E.emoji(g, '⬇️', cx(c), by + S.R * ts + 14, 18); }
      }
    };
    P.drawOver = function (g) {
      if (S.cannon && E.skin('cannonImg')) for (let c = 0; c < S.C; c++) if (S.cannon[c]) {
        const ci = E.skin('cannonImg')(S.cannon[c]); if (!ci) continue;
        const w = ts * 0.9, h = (w * ci.height) / ci.width; g.drawImage(ci, cx(c) - w / 2, by + S.top[c] * ts - h * 0.9, w, h); // la base, apenas sobre la primera casilla
      }
      if (S.wall) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.wall[r][c] >= 2) { // bastón de caramelo con sus capas
        const x0 = bx + (c + 1) * ts, y0 = by + r * ts;
        E.rr(g, x0 - ts * 0.1, y0 - 3, ts * 0.2, ts + 6, ts * 0.08); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#b0123a'; g.stroke();
        g.fillStyle = '#e8203f'; for (let k = 0; k < 5; k++) g.fillRect(x0 - ts * 0.1, y0 + ts * (0.05 + k * 0.2), ts * 0.2, ts * 0.08);
        E.text(g, String(S.wall[r][c] - 1), x0, y0 + ts * 0.5, ts * 0.26, '#fff', { stroke: '#b0123a', sw: 4 });
      } else if (S.wall[r][c]) {
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
    };
    P.draw = function (g) {
      // tablero
      const skb = E.skin('board');
      if (E.glBoard) { /* las casillas ya las pinta WebGL */ } else if (skb) skb(g, S, bx, by, ts, (r, c) => inB(S, r, c));
      else {
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c)) { E.rr(g, bx + c * ts - 6, by + r * ts - 6, ts + 12, ts + 12, 14); g.fill(); }
      g.fillStyle = 'rgba(40,30,90,0.72)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c)) g.fillRect(bx + c * ts - 1, by + r * ts - 1, ts + 2, ts + 2);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (inB(S, r, c) && (r + c) % 2) g.fillRect(bx + c * ts, by + r * ts, ts, ts);
      }
      P.drawUnder(g);
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
        if (t.front) continue; // la que avanza en el intercambio se dibuja encima
        drawTile(g, t, x, y, ts);
      }
      for (const t of vis) if (t.front && t.x != null) drawTile(g, t, t.x, t.y, ts);
      g.restore();
      P.drawOver(g);
      for (const d of dying) {
        if (!d.started) continue;
        const tm = TM(), k = Math.min(1, d.age / tm.remove);
        const t = d.t, o = t.sc;
        if (tm.shrink && d.mode !== 'ing' && d.mode !== 'merge') { // Candy Crush: se ilumina, encoge al 30 % y estalla
          t.sc = (o == null ? 1 : o) * (k < 0.15 ? 1 : 1 - 0.7 * (k - 0.15) / 0.85); t.alpha = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
          drawTile(g, t, d.x, d.y, ts);
          if (k < 0.3) { g.save(); g.globalCompositeOperation = 'lighter'; t.alpha = 0.5 * (1 - k / 0.3); drawTile(g, t, d.x, d.y, ts); g.restore(); }
          t.sc = o; t.alpha = 1; continue;
        }
        if (d.mode === 'ing') { t.alpha = 1 - k; t.sc = 1 + k * 0.5; drawTile(g, t, d.x, d.y - k * 50, ts); }
        else { t.sc = (o == null ? 1 : o) * (d.mode === 'merge' ? 1 - k * 0.6 : 1 + k * 0.25); t.alpha = 1 - k; drawTile(g, t, d.x, d.y, ts); }
        t.sc = o; t.alpha = 1;
      }
      for (const f of fxs) {
        if (f.age < 0 || (f.skin && f.type !== 'zap')) continue;
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
          g.strokeStyle = '#fff'; g.lineWidth = 4; if (!f.skin) { g.shadowColor = COLORS[f.color]; g.shadowBlur = 14; } else { g.lineWidth = 6; g.strokeStyle = 'rgba(220,240,255,0.95)'; }
          const kk = Math.min(1, k * 2.5);
          for (const [rr, cc] of f.targets) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (cx(cc) - x0) * kk, y0 + (cy(rr) - y0) * kk); g.stroke(); }
        }
        g.restore();
      }
      if (P.finaleOn) E.text(g, 'Toca para saltar', E.W / 2, by + S.R * ts + 24, 24, '#ffffff', { stroke: '#c2185b', sw: 6 }); // como el "Tap to skip" de Candy Crush
    };

    // Sugar Crush como en Candy Crush (grabado en el emulador, nivel 9): primero cada movimiento que sobra se convierte,
    // deprisa, en un caramelo rayado al azar (el contador baja de uno en uno); después revientan uno a uno todos los
    // especiales del tablero. "Toca para saltar" lo acaba al momento.
    // Antes, con WebGL, la celebración de Candy Crush (rec_001, nivel 9): el tablero se oscurece, cae confeti, el Yeti salta
    // de la cabecera y baila ("success_final"), y salen "¡Maravilloso!" y "¡Nivel completado!"; 3,4 s en total
    let finSkip = false;
    const CELEB = 3.4;
    P.finale = function (done) {
      const celeb = !!(window.GL && E.glBoard && !window.__pasada);
      if (celeb) {
        P.finaleOn = true; finSkip = false; P.celebrate = E.t;
        E.confetti(); E.sfx('celebrate'); E.sfx('confetti');
        E.after(CELEB, () => { P.celebrate = null; if (finSkip) { P.finaleOn = false; done(); } else crush(done); });
        return;
      }
      crush(done);
    };
    function crush(done) {
      const left = Math.min(P.moves, 40);
      const plain = () => { const cand = []; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (matchable(t) && !t.sp) cand.push([r, c]); } return cand; };
      const specials = () => { const out = []; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const t = at(S, r, c); if (t && ((t.kind === 'candy' && t.sp) || t.kind === 'bomb')) out.push([r, c]); } return out; };
      if (left <= 0 && !specials().length) { P.finaleOn = false; done(); return; }
      P.finaleOn = true; finSkip = false;
      E.after(11, () => { finSkip = true; }); // como mucho 11 s (en la grabación del juego real, unos 12): luego, como si se tocara para saltar
      E.sfx('sugarcrush');
      const ey = Math.max(60, by - ts * 0.55); // arriba del tablero, como las demás exclamaciones
      if (!E.exclaim(9, E.W / 2, ey)) E.floatText(E.W / 2, ey, '¡Sugar Crush!', '#ffe14d', 50);
      const end = () => { if (!P.finaleOn) return; P.finaleOn = false; P.tossing = false; done(); };
      let i = 0, guard = 0;
      // como en Candy Crush (rec_001): 1) revientan los especiales que ya había; 2) cada movimiento que sobra se vuelve
      // un rayado (el Yeti de la cabecera se asoma, "tossing"); 3) revientan esos de uno en uno
      // de uno en uno cada 0,25 s sin esperar a que acabe la cascada (como en la grabación: 23 rayados en unos 8 s); si
      // las cascadas siguen haciendo especiales, pasado un tope (cap explosiones o tmax segundos) revientan todos a la vez
      const blast = (next, cap, tmax) => {
        const t0 = E.t; let n = 0;
        const step = () => {
          if (finSkip) return end();
          if (queue.length > 1) { E.after(0.1, step); return; }
          const sp = specials();
          if (n > cap + 1 || E.t - t0 > tmax + 1.5) { const wait = () => (finSkip ? end() : P.busyFinale() ? E.after(0.1, wait) : E.after(0.3, next)); wait(); return; } // tope duro: ya no más tandas
          if (!sp.length || ++guard > 160) { const wait = () => (finSkip ? end() : P.busyFinale() ? E.after(0.1, wait) : E.after(0.4, next)); wait(); return; }
          K.begin();
          if (++n > cap || E.t - t0 > tmax) for (const [r, c] of sp) hit(S, r, c, 0.05, K); // los que quedan, todos a la vez
          else { // en tandas: varios a la vez, con un poco de separación entre ellos (como el juego real, que los encadena)
            const take = Math.max(1, Math.ceil(sp.length / 3));
            for (let j = 0; j < take && sp.length; j++) { const [r, c] = sp.splice((Math.random() * sp.length) | 0, 1)[0]; hit(S, r, c, 0.05 + j * 0.07, K); }
          }
          fill(S, K); K.end(S); resolve(S, K, null);
          E.after(0.35, step);
        };
        step();
      };
      const convert = () => {
        if (finSkip) return end();
        P.tossing = i < left;
        const last = () => blast(() => E.after(0.1, end), 4, 4.5);
        if (i >= left) { E.after(0.4, last); return; }
        const cand = plain(); if (!cand.length) { P.tossing = false; E.after(0.4, last); return; }
        i++; P.moves = Math.max(0, P.moves - 1);
        const [r, c] = cand[(Math.random() * cand.length) | 0], t = S.grid[r][c];
        t.sp = Math.random() < 0.5 ? 'h' : 'v'; t.sc = 0.4; E.tween(t, { sc: 1 }, 0.25, { ease: E.ease.outBack });
        fxEv('SwitcherCreateStriped', cx(c), cy(r), t.color); E.sfx('special', 1 + Math.min(i, 20) * 0.03);
        E.after(0.1, convert);
      };
      E.after(0.4, () => blast(convert, 2, 3));
    }
    P.skipFinale = () => { if (P.finaleOn) finSkip = true; };
    P.busyFinale = () => !!cur || queue.length > 0;
    P.debugPhase = () => ({ cur: cur && { dur: cur.dur, falling: cur.falling, shuffle: cur.shuffle }, queue: queue.length, swapAnim: !!swapAnim, phaseT }); // para probar
    return P;
  };
})();
