'use strict';
// Cubos: juego de tocar grupos de cubos del mismo color (estilo "blast").

const GAME = {
  id: 'cubos',
  title: 'Cubos Locos',
  theme: {
    mascot: '👧',
    accent: '#ff6a2b',
    node: '#2f8de4',
    bg: ['#7fd0f5', '#3a8fd1'],
    zones: [['#8fd16a', '#5bb04a'], ['#f7c66b', '#e89a3c'], ['#9ad8f5', '#55a9e0'], ['#f59ac0', '#d9669b'], ['#b9a2f2', '#8a6ad9']],
    worlds: ['Cuarto de juegos', 'Tienda de juguetes', 'Feria del pueblo', 'Castillo de bloques', 'Parque de atracciones', 'Taller de juguetes', 'Isla del tesoro', 'Gran circo', 'Ciudad de los juguetes', 'Granja de juguete'],
    decor: ['🌳', '🌷', '🏠', '🌻', '🧸', '🎠', '🪁', '🌲', '🍄'],
    hudBorder: '#2e6f8e',
    bar: 'rgba(25,70,110,0.92)',
    bgDeco(g, w, h) {
      g.fillStyle = 'rgba(255,255,255,0.08)';
      for (let y = 0; y < h; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < w; x += 60) g.fillRect(x, y, 30, 30);
    },
  },
};

(function () {
  const COLORS = ['#e8322b', '#ffc21a', '#2f8de4', '#4fc12a', '#a24ed8', '#ff8a1f'];
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let uid = 1;

  // ------------------------------------------------------------ dibujo de piezas
  function symbol(g, idx, cx, cy, s) {
    g.beginPath();
    switch (idx) {
      case 0: E.rr(g, cx - s * 0.8, cy - s * 0.8, s * 1.6, s * 1.6, s * 0.35); break;
      case 1: {
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s;
          g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        g.closePath(); break;
      }
      case 2: g.arc(cx, cy, s * 0.85, 0, 7); break;
      case 3: g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.75); g.lineTo(cx - s, cy + s * 0.75); g.closePath(); break;
      case 4: g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.8, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.8, cy); g.closePath(); break;
      default: {
        g.moveTo(cx, cy + s * 0.85);
        g.bezierCurveTo(cx - s * 1.3, cy - s * 0.1, cx - s * 0.6, cy - s * 1.1, cx, cy - s * 0.4);
        g.bezierCurveTo(cx + s * 0.6, cy - s * 1.1, cx + s * 1.3, cy - s * 0.1, cx, cy + s * 0.85);
      }
    }
  }
  function cubeSprite(color, ts) {
    return E.sprite('cube' + color, ts, ts, (g, w, h) => {
      const base = COLORS[color];
      const p = w * 0.035;
      E.rr(g, p, p, w - 2 * p, h - 2 * p, w * 0.17);
      g.fillStyle = E.shade(base, -0.35); g.fill();
      E.rr(g, p, p, w - 2 * p, h - 2 * p - w * 0.07, w * 0.17);
      const gr = g.createLinearGradient(0, p, 0, h);
      gr.addColorStop(0, E.shade(base, 0.35)); gr.addColorStop(0.6, base); gr.addColorStop(1, E.shade(base, -0.1));
      g.fillStyle = gr; g.fill();
      E.rr(g, w * 0.14, w * 0.09, w * 0.72, h * 0.2, w * 0.1);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
      symbol(g, color, w / 2, h * 0.47 + w * 0.02, w * 0.22);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
      symbol(g, color, w / 2, h * 0.47, w * 0.22);
      g.fillStyle = E.shade(base, -0.28); g.fill();
    });
  }
  function discoSprite(color, ts) {
    return E.sprite('disco' + color, ts, ts, (g, w, h) => {
      const base = COLORS[color];
      const gr = g.createRadialGradient(w * 0.38, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.48);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, E.shade(base, 0.4)); gr.addColorStop(1, E.shade(base, -0.3));
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.44, 0, 7); g.fillStyle = gr; g.fill();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = w * 0.025;
      for (let i = -3; i <= 3; i++) {
        g.beginPath(); g.moveTo(0, h / 2 + i * w * 0.13); g.lineTo(w, h / 2 + i * w * 0.13); g.stroke();
        g.beginPath(); g.ellipse(w / 2, h / 2, Math.abs(i) * w * 0.14 + 0.1, w * 0.45, 0, 0, 7); g.stroke();
      }
      g.restore();
      g.lineWidth = w * 0.05; g.strokeStyle = '#fff';
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.44, 0, 7); g.stroke();
      E.star(g, w * 0.7, h * 0.28, w * 0.13, '#fff');
    });
  }
  function boxSprite(hp, ts) {
    return E.sprite('box' + hp, ts, ts, (g, w, h) => {
      const base = hp >= 3 ? '#7d5a3a' : hp === 2 ? '#a36b35' : '#c98b48';
      const p = w * 0.04;
      E.rr(g, p, p, w - 2 * p, h - 2 * p, w * 0.08);
      g.fillStyle = E.shade(base, -0.4); g.fill();
      E.rr(g, p + w * 0.06, p + w * 0.06, w - 2 * p - w * 0.12, h - 2 * p - w * 0.12, w * 0.05);
      g.fillStyle = base; g.fill();
      g.strokeStyle = E.shade(base, -0.35); g.lineWidth = w * 0.035;
      for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(p + w * 0.1, h * i / 3); g.lineTo(w - p - w * 0.1, h * i / 3); g.stroke(); }
      g.lineWidth = w * 0.09; g.strokeStyle = E.shade(base, 0.15);
      g.beginPath(); g.moveTo(w * 0.18, h * 0.18); g.lineTo(w * 0.82, h * 0.82); g.stroke();
      if (hp >= 2) {
        g.fillStyle = '#9aa7b3';
        [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]].forEach(([x, y]) => {
          g.beginPath(); g.arc(w * x, h * y, w * 0.08, 0, 7); g.fill();
        });
      }
      if (hp >= 3) {
        g.strokeStyle = '#6d7880'; g.lineWidth = w * 0.08;
        g.beginPath(); g.moveTo(w / 2, p); g.lineTo(w / 2, h - p); g.stroke();
      }
    });
  }
  // huevo: 2 golpes (entero -> rajado)
  function eggSprite(hp, ts) {
    return E.sprite('egg' + hp, ts, ts, (g, w, h) => {
      g.beginPath(); g.ellipse(w / 2, h * 0.54, w * 0.34, h * 0.42, 0, 0, 7);
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#fffdf4'); gr.addColorStop(1, '#e9d9b8');
      g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.035; g.strokeStyle = '#b89c6a'; g.stroke();
      g.fillStyle = '#f2a33a'; [[0.38, 0.4], [0.62, 0.62], [0.45, 0.75]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, w * 0.05, 0, 7); g.fill(); });
      if (hp <= 1) {
        g.strokeStyle = '#6b4f2a'; g.lineWidth = w * 0.04;
        g.beginPath(); g.moveTo(w * 0.18, h * 0.5); g.lineTo(w * 0.32, h * 0.42); g.lineTo(w * 0.42, h * 0.55); g.lineTo(w * 0.55, h * 0.43); g.lineTo(w * 0.66, h * 0.56); g.lineTo(w * 0.82, h * 0.47); g.stroke();
      }
    });
  }
  // pelota de playa: hay que darle con cada uno de sus colores
  function ballSprite(cols, ts) {
    return E.sprite('ball' + cols.join(''), ts, ts, (g, w, h) => {
      const R = w * 0.42, n = 4;
      for (let i = 0; i < n; i++) {
        g.beginPath(); g.moveTo(w / 2, h / 2); g.arc(w / 2, h / 2, R, -Math.PI / 2 + (i * 2 * Math.PI) / n, -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n); g.closePath();
        g.fillStyle = cols[i] != null && cols[i] >= 0 ? COLORS[cols[i]] : '#f4f4f4'; g.fill();
      }
      g.lineWidth = w * 0.04; g.strokeStyle = '#ffffff';
      g.beginPath(); g.arc(w / 2, h / 2, R, 0, 7); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.09, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(w * 0.36, h * 0.3, w * 0.12, h * 0.06, -0.6, 0, 7); g.fill();
    });
  }
  function washerSprite(stage, ts) {
    return E.sprite('washer' + stage, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.06, h * 0.04, w * 0.88, h * 0.92, w * 0.12);
      g.fillStyle = '#f4f7fb'; g.fill(); g.lineWidth = w * 0.04; g.strokeStyle = '#8fa3b8'; g.stroke();
      g.fillStyle = '#c9d6e3'; g.fillRect(w * 0.1, h * 0.08, w * 0.8, h * 0.16);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w * (0.3 + i * 0.13), h * 0.16, w * 0.045, 0, 7); g.fillStyle = i < stage ? '#2fb84a' : '#7d8a97'; g.fill(); }
      g.beginPath(); g.arc(w / 2, h * 0.6, w * 0.27, 0, 7); g.fillStyle = '#7fc8f5'; g.fill(); g.lineWidth = w * 0.06; g.strokeStyle = '#5d6f82'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      [[0.42, 0.55, 0.07], [0.56, 0.66, 0.05], [0.5, 0.48, 0.04]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(w * x, h * y, w * rr, 0, 7); g.fill(); });
    });
  }
  function piggySprite(hp, ts) {
    return E.sprite('piggy' + hp, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.14); g.fillStyle = '#9aa6b2'; g.fill();
      g.lineWidth = w * 0.05; g.strokeStyle = '#5f6b77'; g.stroke();
      const s = w * 0.72; g.drawImage(E.emojiSprite('🐷', s), (w - s) / 2, (h - s) / 2, s, s);
      if (hp >= 2) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(w * 0.82, h * 0.18, w * 0.11, 0, 7); g.fill(); }
    });
  }
  function stoneSprite(shell, ts) {
    return E.sprite('stone' + (shell ? 1 : 0), ts, ts, (g, w, h) => {
      g.beginPath(); g.moveTo(w * 0.12, h * 0.6); g.lineTo(w * 0.25, h * 0.18); g.lineTo(w * 0.7, h * 0.1); g.lineTo(w * 0.92, h * 0.45); g.lineTo(w * 0.8, h * 0.88); g.lineTo(w * 0.3, h * 0.92); g.closePath();
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, shell ? '#a9a39b' : '#d8cfc2'); gr.addColorStop(1, shell ? '#5d5852' : '#9e958a');
      g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.04; g.strokeStyle = '#4a4540'; g.stroke();
      if (!shell) { g.strokeStyle = '#4a4540'; g.lineWidth = w * 0.035; g.beginPath(); g.moveTo(w * 0.3, h * 0.3); g.lineTo(w * 0.5, h * 0.5); g.lineTo(w * 0.45, h * 0.75); g.moveTo(w * 0.5, h * 0.5); g.lineTo(w * 0.75, h * 0.45); g.stroke(); }
    });
  }
  function gumSprite(stuck, ts) {
    return E.sprite('gum' + (stuck ? 1 : 0), ts, ts, (g, w, h) => {
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 7); g.fillStyle = stuck ? '#e05aa3' : '#ff8cc6'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(w * 0.38, h * 0.33, w * 0.13, h * 0.07, -0.6, 0, 7); g.fill();
      if (stuck) { g.strokeStyle = '#a2316d'; g.lineWidth = w * 0.05; g.beginPath(); g.moveTo(w * 0.3, h * 0.9); g.lineTo(w * 0.3, h); g.moveTo(w * 0.7, h * 0.88); g.lineTo(w * 0.7, h); g.stroke(); }
    });
  }
  function crateSprite(hp, ts) {
    return E.sprite('crate' + hp, ts, ts, (g, w, h) => {
      g.drawImage(boxSprite(1, ts), 0, 0, w, h);
      const s = w * 0.42; g.drawImage(E.emojiSprite('💣', s), w * 0.29, h * 0.29, s, s);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.8, h * 0.2, w * 0.15, 0, 7); g.fill();
      E.text(g, String(hp), w * 0.8, h * 0.21, w * 0.22, '#7a3b00', { stroke: false });
    });
  }
  function pinwheelSprite(cols, ts) {
    return E.sprite('pinw' + cols.join('_'), ts, ts, (g, w, h) => {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        g.beginPath(); g.moveTo(w / 2, h / 2); g.arc(w / 2, h / 2, w * 0.45, a, a + Math.PI / 2 - 0.5); g.closePath();
        g.fillStyle = cols[i] >= 0 ? COLORS[cols[i]] : '#dfe5ea'; g.fill(); g.lineWidth = w * 0.03; g.strokeStyle = '#fff'; g.stroke();
      }
      g.fillStyle = '#8a5a2b'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.08, 0, 7); g.fill();
    });
  }
  function curtainSprite(ts) {
    return E.sprite('curtain', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.1); g.fillStyle = '#7a4b2a'; g.fill();
      for (let i = 0; i < 6; i++) { const y = h * (0.1 + i * 0.14); E.rr(g, w * 0.1, y, w * 0.8, h * 0.11, h * 0.04); g.fillStyle = i % 2 ? '#f3e2c4' : '#e8d1a8'; g.fill(); }
      g.strokeStyle = '#5a3418'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(w * 0.5, h * 0.06); g.lineTo(w * 0.5, h * 0.94); g.stroke();
    });
  }
  function hiveSprite(ts) {
    return E.sprite('hive', ts, ts, (g, w, h) => {
      g.beginPath(); g.ellipse(w / 2, h * 0.55, w * 0.38, h * 0.4, 0, 0, 7); g.fillStyle = '#f2b632'; g.fill(); g.lineWidth = w * 0.04; g.strokeStyle = '#9a6a10'; g.stroke();
      g.strokeStyle = '#c98c18'; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(w * 0.15, h * (0.25 + i * 0.15)); g.lineTo(w * 0.85, h * (0.25 + i * 0.15)); g.stroke(); }
      g.fillStyle = '#5a3a0a'; g.beginPath(); g.arc(w / 2, h * 0.72, w * 0.08, 0, 7); g.fill();
      const s = w * 0.36; g.drawImage(E.emojiSprite('🐝', s), w * 0.6, h * 0.02, s, s);
    });
  }
  function toasterSprite(ts) {
    return E.sprite('toaster', ts, ts, (g, w, h) => {
      E.rr(g, w * 0.08, h * 0.3, w * 0.84, h * 0.62, w * 0.14); g.fillStyle = '#e8edf2'; g.fill(); g.lineWidth = w * 0.04; g.strokeStyle = '#8796a5'; g.stroke();
      g.fillStyle = '#d9a35b'; E.rr(g, w * 0.22, h * 0.1, w * 0.24, h * 0.3, w * 0.05); g.fill(); E.rr(g, w * 0.54, h * 0.1, w * 0.24, h * 0.3, w * 0.05); g.fill();
      g.fillStyle = '#5f6b77'; g.fillRect(w * 0.2, h * 0.3, w * 0.28, h * 0.05); g.fillRect(w * 0.52, h * 0.3, w * 0.28, h * 0.05);
      g.fillStyle = '#ff6a2b'; g.beginPath(); g.arc(w * 0.8, h * 0.62, w * 0.06, 0, 7); g.fill();
    });
  }
  function bubbleOverlay(ts) {
    return E.sprite('bubov', ts, ts, (g, w, h) => {
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7);
      const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.48);
      gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.75, 'rgba(190,230,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0.85)');
      g.fillStyle = gr; g.fill(); g.lineWidth = w * 0.035; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(w * 0.32, h * 0.27, w * 0.11, h * 0.06, -0.7, 0, 7); g.fill();
    });
  }
  function rocketSprite(dir, ts) {
    return E.sprite('rocket' + dir, ts, ts, (g, w, h) => {
      E.rr(g, w * 0.06, w * 0.06, w * 0.88, h * 0.88, w * 0.2);
      g.fillStyle = '#d8f0ff'; g.fill();
      g.lineWidth = w * 0.04; g.strokeStyle = '#5aa8e0'; g.stroke();
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(dir === 'h' ? Math.PI / 4 : -Math.PI / 4);
      const s = w * 0.62;
      const spr = E.emojiSprite('🚀', s);
      g.drawImage(spr, -s / 2, -s / 2, s, s);
      g.restore();
      g.fillStyle = '#2a6fb0';
      const a = w * 0.12;
      if (dir === 'h') {
        g.beginPath(); g.moveTo(w * 0.04, h / 2); g.lineTo(w * 0.04 + a, h / 2 - a); g.lineTo(w * 0.04 + a, h / 2 + a); g.fill();
        g.beginPath(); g.moveTo(w * 0.96, h / 2); g.lineTo(w * 0.96 - a, h / 2 - a); g.lineTo(w * 0.96 - a, h / 2 + a); g.fill();
      } else {
        g.beginPath(); g.moveTo(w / 2, h * 0.04); g.lineTo(w / 2 - a, h * 0.04 + a); g.lineTo(w / 2 + a, h * 0.04 + a); g.fill();
        g.beginPath(); g.moveTo(w / 2, h * 0.96); g.lineTo(w / 2 - a, h * 0.96 - a); g.lineTo(w / 2 + a, h * 0.96 - a); g.fill();
      }
    });
  }
  function drawTile(g, t, x, y, ts) {
    let spr;
    switch (t.kind) {
      case 'cube': spr = cubeSprite(t.color, ts); break;
      case 'disco': spr = discoSprite(t.color, ts); break;
      case 'box': spr = boxSprite(t.hp, ts); break;
      case 'rocket': spr = rocketSprite(t.dir, ts); break;
      case 'bomb': spr = E.emojiSprite('💣', ts); break;
      case 'balloon': spr = E.emojiSprite('🎈', ts); break;
      case 'duck': spr = E.emojiSprite(['🧸', '🚂', '🪀', '🎺', '🪁'][t.id % 5], ts); break;
      case 'rduck': spr = E.emojiSprite('🦆', ts); break;
      case 'ice': spr = E.sprite('icecube', ts, ts, (g, w, h) => { E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.16); g.fillStyle = 'rgba(200,235,255,0.95)'; g.fill(); g.lineWidth = w * 0.05; g.strokeStyle = '#fff'; g.stroke(); g.strokeStyle = 'rgba(120,180,230,0.8)'; g.lineWidth = w * 0.04; g.beginPath(); g.moveTo(w * 0.25, h * 0.3); g.lineTo(w * 0.5, h * 0.5); g.lineTo(w * 0.42, h * 0.75); g.moveTo(w * 0.5, h * 0.5); g.lineTo(w * 0.78, h * 0.42); g.stroke(); }); break;
      case 'igloo': spr = E.emojiSprite('🛖', ts); break;
      case 'cannon': spr = E.emojiSprite('🎯', ts); break;
      case 'eggpot': spr = E.emojiSprite('🍫', ts); break;
      case 'dragon': spr = E.emojiSprite('🐉', ts); break;
      case 'egg': spr = eggSprite(t.hp, ts); break;
      case 'ball': spr = ballSprite([0, 1, 2, 3], ts); break;
      case 'soap': spr = E.emojiSprite('🧼', ts); break;
      case 'washer': spr = washerSprite(t.stage || 0, ts); break;
      case 'pumpkin': spr = E.emojiSprite('🎃', ts); break;
      case 'ufo': spr = E.emojiSprite('🛸', ts); break;
      case 'piggy': spr = piggySprite(t.hp, ts); break;
      case 'stone': spr = stoneSprite(t.shell, ts); break;
      case 'gum': spr = gumSprite(t.stuck, ts); break;
      case 'toaster': spr = toasterSprite(ts); break;
      case 'cuckoo': spr = E.emojiSprite('🕰️', ts); break;
      case 'crate': spr = crateSprite(t.hp, ts); break;
      case 'pinwheel': spr = pinwheelSprite(t.cols, ts); break;
      case 'hive': spr = hiveSprite(ts); break;
      case 'curtain': spr = curtainSprite(ts); break;
      default: if (XOBS[t.kind]) spr = xSprite(t, ts);
    }
    const s = ts * (t.sc == null ? 1 : t.sc);
    const sy = t.sq ? 1 - t.sq * 0.15 : 1;
    g.save();
    if (t.alpha != null && t.alpha < 1) g.globalAlpha = Math.max(0, t.alpha);
    if (t.kind === 'rduck' && !t.on) g.globalAlpha *= 0.25; // patito escondido
    g.translate(x, y + (s * (1 - sy)) / 2);
    if (t.rot) g.rotate(t.rot);
    g.scale(1, sy);
    if (t.kind === 'disco') g.rotate(Math.sin(E.t * 2 + t.id) * 0.15);
    const k = t.kind === 'bomb' ? 0.95 : t.kind === 'balloon' || t.kind === 'duck' ? 1.12 : 1;
    g.drawImage(spr, (-s * k) / 2, (-s * k) / 2, s * k, s * k);
    if (t.caged) { // jaula encima del cubo
      g.strokeStyle = '#5b3a1d'; g.lineWidth = s * 0.07;
      for (let i = 0; i < 4; i++) { const x = -s * 0.36 + i * s * 0.24; g.beginPath(); g.moveTo(x, -s * 0.44); g.lineTo(x, s * 0.44); g.stroke(); }
      g.lineWidth = s * 0.09; g.beginPath(); g.moveTo(-s * 0.46, -s * 0.42); g.lineTo(s * 0.46, -s * 0.42); g.moveTo(-s * 0.46, s * 0.42); g.lineTo(s * 0.46, s * 0.42); g.stroke();
    }
    if (t.hintK && t.kind === 'cube') {
      const hs = s * 0.38;
      const ch = t.hintK === 'rocket' ? '🚀' : t.hintK === 'bomb' ? '💣' : '✨';
      g.globalAlpha = 0.85;
      g.drawImage(E.emojiSprite(ch, hs), -hs / 2, -hs / 2 - s * 0.02, hs, hs);
    }
    g.restore();
  }
  GAME.drawGoalIcon = function (g, gl, x, y, s) {
    let spr;
    if (gl.type === 'color') spr = cubeSprite(gl.key, s);
    else if (gl.type === 'box') spr = boxSprite(1, s);
    else if (gl.type === 'balloon') spr = E.emojiSprite('🎈', s);
    else if (gl.type === 'egg') spr = eggSprite(2, s);
    else if (gl.type === 'soap') spr = E.emojiSprite('🧼', s);
    else if (gl.type === 'pumpkin') spr = E.emojiSprite('🎃', s);
    else if (gl.type === 'ufo') spr = E.emojiSprite('🛸', s);
    else if (gl.type === 'toast') spr = E.emojiSprite('🍞', s);
    else if (gl.type === 'cuckoo') spr = E.emojiSprite('🕰️', s);
    else if (gl.type === 'crate') spr = crateSprite(5, s);
    else if (gl.type === 'pinwheel') spr = pinwheelSprite([0, 1, 2, 3], s);
    else if (gl.type === 'bee') spr = E.emojiSprite('🐝', s);
    else if (gl.type === 'curtain') spr = curtainSprite(s);
    else if (XOBS[gl.type]) spr = E.emojiSprite(XOBS[gl.type].ch, s);
    else if (gl.type === 'piggy') spr = piggySprite(1, s);
    else if (gl.type === 'stone') spr = stoneSprite(true, s);
    else if (gl.type === 'gum') spr = gumSprite(false, s);
    else if (gl.type === 'ball') spr = ballSprite([0, 1, 2, 3], s);
    else if (gl.type === 'bubble') { g.drawImage(cubeSprite(2, s), x - s / 2, y - s / 2, s, s); spr = bubbleOverlay(s); }
    else if (gl.type === 'duck') spr = E.emojiSprite('🧸', s);
    else if (gl.type === 'rduck') spr = E.emojiSprite('🦆', s);
    else if (gl.type === 'ice') spr = E.emojiSprite('🧊', s);
    else if (gl.type === 'cage') spr = E.emojiSprite('🔒', s);
    else if (gl.type === 'dragon') spr = E.emojiSprite('🐉', s);
    else if (gl.type === 'dirt') spr = E.emojiSprite('🟫', s);
    else spr = E.emojiSprite('🧸', s);
    g.drawImage(spr, x - s / 2, y - s / 2, s, s);
  };

  // ------------------------------------------------------------ lógica (sin dibujo, la usa también el bot)
  function cell(S, r, c) {
    if (r < 0 || c < 0 || r >= S.R || c >= S.C || r < S.top[c]) return undefined;
    return S.grid[r][c];
  }
  function inBoard(S, r, c) { return r >= 0 && c >= 0 && r < S.R && c < S.C && r >= S.top[c]; }
  const isSpecial = (t) => t && (t.kind === 'rocket' || t.kind === 'bomb' || t.kind === 'disco');
  function newCube(S) { return { id: uid++, kind: 'cube', color: S.rand.int(S.colors) }; }

  function group(S, r, c) {
    const t = cell(S, r, c);
    if (!t || t.kind !== 'cube' || t.caged) return [];
    const seen = new Set([r * 64 + c]);
    const out = [[r, c]];
    for (let i = 0; i < out.length; i++) {
      const [rr, cc] = out[i];
      for (const [dr, dc] of D4) {
        const nr = rr + dr, nc = cc + dc, k = nr * 64 + nc;
        if (seen.has(k)) continue;
        const o = cell(S, nr, nc);
        if (o && o.kind === 'cube' && o.color === t.color && !o.caged) { seen.add(k); out.push([nr, nc]); }
      }
    }
    return out;
  }
  function specialGroup(S, r, c) {
    const seen = new Set([r * 64 + c]);
    const out = [[r, c]];
    for (let i = 0; i < out.length; i++) {
      const [rr, cc] = out[i];
      for (const [dr, dc] of D4) {
        const nr = rr + dr, nc = cc + dc, k = nr * 64 + nc;
        if (seen.has(k)) continue;
        if (isSpecial(cell(S, nr, nc))) { seen.add(k); out.push([nr, nc]); }
      }
    }
    return out;
  }
  function specialFor(size, color, S) {
    if (size >= 9) return { id: uid++, kind: 'disco', color };
    if (size >= 7) return { id: uid++, kind: 'bomb' };
    return { id: uid++, kind: 'rocket', dir: S.rand() < 0.5 ? 'h' : 'v' };
  }

  // K es el "receptor" de eventos: el juego real anima, el bot solo cuenta.
  // Obstáculos de su tramo de Toy Blast con reglas comunes (analisis/toy_blast.md §9).
  // rule: hits = cualquier golpe; special = solo cohete/bomba/cubo mágico; shell = primero un especial y luego un grupo;
  // color = solo grupos de su color; potion = un grupo la colorea y luego hay que combinar ese color;
  // orb = cambia de color cada turno y se rompe con un grupo de su color; dispense = da piezas al objetivo hasta vaciarse;
  // allColors = un grupo de cada uno de sus colores
  const XOBS = {
    chick: { hp: 4, rule: 'hits', move: true, ch: '🥚', from: 75, text: 'Haz 4 combinaciones junto al huevo para que salga el pollito' },
    snowman: { hp: 4, rule: 'hits', move: false, ch: '⛄', from: 79, text: 'Haz 4 combinaciones junto al montón de nieve para hacer el muñeco' },
    safe: { hp: 2, rule: 'hits', move: false, ch: '🔐', ch2: '💰', from: 83, text: 'Combina junto a la caja fuerte para sacar el saco de dinero' },
    locker: { hp: 1, rule: 'shell', move: false, ch: '🗄️', from: 87, text: 'Golpea la taquilla con un cohete o una bomba y luego combina a su lado' },
    metal: { hp: 1, rule: 'special', move: false, ch: '🔩', from: 91, text: 'El ladrillo de metal solo se rompe con cohetes o bombas' },
    cbrick: { hp: 2, rule: 'color', move: false, ch: '🧱', from: 95, text: 'El ladrillo de color solo se rompe con combinaciones de su color' },
    potion: { hp: 1, rule: 'potion', move: true, ch: '🧪', from: 99, text: 'Combina junto a la poción para colorearla y luego combina su color' },
    orb: { hp: 1, rule: 'orb', move: true, ch: '🔮', from: 103, text: 'La bola de cristal cambia de color: combina a su lado ese color' },
    jam: { hp: 1, rule: 'dispense', move: false, ch: '🍯', from: 107, text: 'Combina junto al armario para sacar los tarros de mermelada' },
    firework: { hp: 1, rule: 'allColors', move: false, ch: '🎆', from: 111, text: 'Combina cada color junto a los fuegos artificiales para encenderlos' },
    bowling: { hp: 2, rule: 'hits', move: false, ch: '🎳', from: 115, text: 'Haz combinaciones junto a los bolos para derribarlos' },
    statue: { hp: 3, rule: 'special', move: false, ch: '🗿', from: 119, big: true, text: 'Usa cohetes o bombas tres veces para tallar la estatua' },
    vase: { hp: 3, rule: 'vase', move: false, ch: '🏺', from: 143, text: 'Haz 3 combinaciones junto a un jarrón y disfruta de tu potenciador' },
    hanoi: { hp: 1, rule: 'hanoi', move: false, ch: '🎯', from: 147, text: 'Combina cubos del mismo color que el aro de arriba de la pirámide' },
    cjar: { hp: 3, rule: 'color', move: false, ch: '🍬', from: 151, text: 'Empareja colores junto al bote de caramelos para recogerlo' },
    spiggy: { hp: 1, rule: 'special', move: true, ch: '🐖', from: 155, text: 'El cerdo deportista se cambia de sitio en cada jugada; rómpelo con cohetes o bombas' },
    rplat: { hp: 1, rule: 'platform', move: false, ch: '🚀', from: 159, text: 'Haz 3 combinaciones junto a la plataforma para lanzar el cohete' },
    // del tramo de la abuela (Toy Blast 2201, 2501 y 2701)
    monster: { hp: 6, rule: 'hits', move: false, ch: '👾', from: 171, big: true, text: 'Dale de comer al monstruo de los dulces combinando cubos a su lado' },
    cocktail: { hp: 3, rule: 'hits', move: false, ch: '🍹', from: 175, text: 'Cada combinación al lado llena un vaso de cóctel' },
    plate: { hp: 1, rule: 'shell', move: false, ch: '🍽️', from: 179, text: 'Golpea el lavavajillas con un cohete o una bomba y luego combina a su lado' },
    // más allá de su tramo (Toy Blast 1301 y 3251)
    compass: { hp: 3, rule: 'hits', move: false, ch: '🧭', from: 183, text: 'La brújula solo cuenta las combinaciones junto a su lado iluminado, que gira en cada jugada' },
    koala: { hp: 2, rule: 'hits', move: false, ch: '🐨', from: 187, text: 'Combina junto al arbusto para sacar al koala' },
    // sombrero mágico (Toy Blast, MagicHatBlock): "Combina cubos del mismo color para ver qué hay dentro"; suelta algo de su bolsa
    hat: { hp: 2, rule: 'hat', move: false, ch: '🎩', from: 191, text: 'Combina cubos del color del sombrero a su lado para ver qué hay dentro' },
  };
  const LIT = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // lado iluminado de la brújula: arriba, derecha, abajo, izquierda
  function xSprite(o, ts) {
    const def = XOBS[o.kind];
    const key = 'x' + o.kind + '_' + (o.dir != null ? o.dir : '') + (o.color != null ? o.color : '') + (o.shell ? 's' : '') + (o.open ? 'o' : '') + '_' + (o.cols ? o.cols.join('') : '');
    return E.sprite(key, ts, ts, (g, w, h) => {
      if (o.color != null && (def.rule === 'color' || def.rule === 'orb' || def.rule === 'potion' || def.rule === 'hat')) {
        g.beginPath(); g.arc(w / 2, h / 2, w * 0.46, 0, 7); g.fillStyle = COLORS[o.color]; g.fill();
        g.lineWidth = w * 0.05; g.strokeStyle = '#fff'; g.stroke();
      } else if (o.cols) { g.drawImage(pinwheelSprite(o.cols, ts), 0, 0, w, h); }
      else if (!def.move) { E.rr(g, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.14); g.fillStyle = o.shell ? '#6d7880' : 'rgba(255,255,255,0.85)'; g.fill(); }
      if (o.kind === 'compass') { // el lado iluminado
        const [dr, dc] = LIT[o.dir || 0];
        g.fillStyle = 'rgba(255,214,40,0.9)';
        if (dr) g.fillRect(w * 0.12, dr < 0 ? h * 0.05 : h * 0.8, w * 0.76, h * 0.15); else g.fillRect(dc < 0 ? w * 0.05 : w * 0.8, h * 0.12, w * 0.15, h * 0.76);
      }
      const s = w * (o.cols ? 0.5 : 0.7);
      g.drawImage(E.emojiSprite(o.open && def.ch2 ? def.ch2 : def.ch, s), (w - s) / 2, (h - s) / 2, s, s);
    });
  }
  // piezas fijas (no caen): lavadora, tostadora, cuco, caja con bomba, molinillo, colmena y persiana
  const isStatic = (o) => !!o && o !== 1 && (o.kind === 'dragon' || ['washer', 'toaster', 'cuckoo', 'crate', 'pinwheel', 'hive', 'curtain'].includes(o.kind) || (XOBS[o.kind] && !XOBS[o.kind].move) || ['ice', 'igloo', 'cannon', 'eggpot'].includes(o.kind));
  const isObstacle = (o) => o && (o.kind === 'box' || o.kind === 'balloon' || o.kind === 'egg' || o.kind === 'ball' || o.kind === 'soap' || o.kind === 'washer' || o.kind === 'pumpkin' || o.kind === 'ufo' || o.kind === 'piggy' || o.kind === 'stone' || o.kind === 'gum' || o.kind === 'toaster' || o.kind === 'cuckoo' || o.kind === 'crate' || o.kind === 'pinwheel' || o.kind === 'hive' || o.kind === 'curtain' || !!XOBS[o.kind] || ['rduck', 'ice', 'igloo', 'cannon', 'eggpot'].includes(o.kind) || (o.kind === 'cube' && o.caged));
  // Burbujas: capa de la casilla (no cae). Se quitan cuando se elimina lo que hay encima (Toy Blast: "haz una coincidencia sobre la Burbuja")
  function popBubble(S, r, c, delay, K) {
    if (!S.bub || !S.bub[r][c]) return;
    S.bub[r][c] = 0; S.bubbleLeft--;
    K.bubble(r, c, delay);
  }
  const bubblesOnBoard = (S) => { let n = 0; if (S.bub) for (const row of S.bub) for (const v of row) n += v; return n; };
  // casillas que pueden recibir una burbuja nueva: cubos normales sin burbuja
  function bubbleTargets(S) {
    const out = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = cell(S, r, c); if (o && o.kind === 'cube' && !S.bub[r][c]) out.push([r, c]); }
    return out;
  }
  function damage(S, r, c, delay, K, color) {
    if (color == null && S.dirt && S.dirt[r] && S.dirt[r][c] > 0) { S.dirt[r][c]--; K.dirt(r, c, delay); if (!S.dirt[r][c]) K.collect('dirt', undefined, { x: null, y: null }, delay); }
    const o = cell(S, r, c);
    if (!o) return;
    const fromMatch = color != null; // un grupo al lado trae su color; cohetes, bombas y boosters no
    // tostadora: fija e indestructible; cada combinación al lado da una tostada (ToastBlock)
    if (o.kind === 'toaster') { if (fromMatch) { K.collect('toast', undefined, o, delay); K.hurt(o, delay); } return; }
    if (XOBS[o.kind]) { xDamage(S, r, c, o, delay, K, color); return; }
    // patito (DuckBlock): aparece y desaparece cada turno; solo se le puede dar cuando se ve
    if (o.kind === 'rduck') { if (!o.on) return; S.grid[r][c] = null; K.remove(o, delay); K.collect('rduck', undefined, o, delay); return; }
    // hielo: se rompe con cualquier golpe (y si un turno no se rompe ninguno, crece)
    if (o.kind === 'ice') { S.grid[r][c] = null; K.remove(o, delay); K.collect('ice', undefined, o, delay); S.iceHit = true; return; }
    // iglú, cañón y chocolatera: fijos; 2 o 3 combinaciones al lado sueltan hielo, pelotas playeras o huevos
    if (o.kind === 'igloo' || o.kind === 'cannon' || o.kind === 'eggpot') {
      if (!fromMatch) return;
      o.stage = (o.stage || 0) + 1; K.hurt(o, delay);
      const need = o.kind === 'igloo' ? 2 : 3;
      if (o.stage >= need) { o.stage = 0; (S.genQueue = S.genQueue || []).push([r, c, o.kind]); }
      return;
    }
    // persiana: "combina cubos junto a una persiana para eliminarla" (cualquier golpe la quita)
    if (o.kind === 'curtain') { S.grid[r][c] = null; K.remove(o, delay); K.collect('curtain', undefined, o, delay); return; }
    // colmena: igual que la tostadora, suelta una abeja por combinación (HiveBlock)
    if (o.kind === 'hive') { if (fromMatch) { K.collect('bee', undefined, o, delay); K.hurt(o, delay); } return; }
    // caja con bomba: 5 golpes y estalla rompiendo lo de alrededor (CrateBlock, "detonar las cajas de alrededor")
    if (o.kind === 'crate') {
      o.hp--;
      if (o.hp > 0) { K.hurt(o, delay); return; }
      S.grid[r][c] = null; K.remove(o, delay); K.collect('crate', undefined, o, delay);
      K.fx({ type: 'bomb', r, c, rad: 1, delay: delay + 0.1 });
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) damage(S, r + dr, c + dc, delay + 0.15, K);
      return;
    }
    // molinillo: cada combinación al lado pinta el aspa de su color; con todas pintadas se recoge (PinWheelBlock)
    if (o.kind === 'pinwheel') {
      let i = color == null ? o.cols.findIndex((x) => x >= 0) : o.cols.indexOf(color);
      if (i < 0) return;
      o.cols = o.cols.slice(); o.cols[i] = -1;
      if (o.cols.every((x) => x < 0)) { S.grid[r][c] = null; K.remove(o, delay); K.collect('pinwheel', undefined, o, delay); } else K.hurt(o, delay);
      return;
    }
    // cerdito: solo cohete, bomba o cubo mágico (PiggyBlock); el doble necesita dos
    if (o.kind === 'piggy') { if (fromMatch) return; o.hp--; if (o.hp <= 0) { S.grid[r][c] = null; K.remove(o, delay); K.collect('piggy', undefined, o, delay); } else K.hurt(o, delay); return; }
    // roca: primero un especial le quita la corteza y después se rompe con un grupo al lado (StoneBlock)
    if (o.kind === 'stone') {
      if (o.shell) { if (!fromMatch) { o.shell = false; K.hurt(o, delay); } return; }
      S.grid[r][c] = null; K.remove(o, delay); K.collect('stone', undefined, o, delay); return;
    }
    // ovni: hay que darle dos turnos seguidos; si un turno no recibe golpe, se recupera (ConsecutiveBlock)
    if (o.kind === 'ufo' || o.kind === 'cuckoo') { o.hp--; o.hitTurn = S.turn; if (o.hp <= 0) { S.grid[r][c] = null; K.remove(o, delay); K.collect(o.kind, undefined, o, delay); } else K.hurt(o, delay); return; }
    // calabaza (3 golpes) y chicle (el primero lo deja pegado, el segundo lo quita)
    if (o.kind === 'pumpkin' || o.kind === 'gum') {
      o.hp--; if (o.kind === 'gum') o.stuck = true;
      if (o.hp <= 0) { S.grid[r][c] = null; K.remove(o, delay); K.collect(o.kind, undefined, o, delay); } else K.hurt(o, delay);
      return;
    }
    if (o.kind === 'egg') {
      o.hp--;
      if (o.hp <= 0) { S.grid[r][c] = null; K.remove(o, delay); K.collect('egg', undefined, o, delay); }
      else K.hurt(o, delay);
      return;
    }
    // pelota playera: salta con un solo golpe de cualquier color (BeachBallBlock)
    if (o.kind === 'ball') { S.grid[r][c] = null; K.remove(o, delay); K.collect('ball', undefined, o, delay); return; }
    // lavadora: no se rompe; cada 3 golpes lanza burbujas al final del turno (BubbleGeneratorBlock 3/3)
    if (o.kind === 'washer') { o.stage = (o.stage || 0) + 1; if (o.stage >= 3) { o.stage = 0; S.throws = (S.throws || 0) + 1; } K.hurt(o, delay); return; }
    // jabón: al romperse llena de burbujas las 3x3 casillas de alrededor y el objetivo sube
    if (o.kind === 'soap') {
      S.grid[r][c] = null; K.remove(o, delay); K.collect('soap', undefined, o, delay);
      let added = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const q = cell(S, r + dr, c + dc);
        if (q && q.kind === 'cube' && !S.bub[r + dr][c + dc]) { S.bub[r + dr][c + dc] = 1; K.bubbleNew(r + dr, c + dc, delay + 0.2); added++; }
      }
      if (added) { S.bubbleLeft += added; K.goalAdd('bubble', added, delay + 0.2); }
      return;
    }
    if (o.kind === 'cube' && o.caged) { o.caged = false; K.hurt(o, delay); K.collect('cage', undefined, o, delay); return; } // "combina junto a una jaula para liberar lo que encierra"
    if (o.kind === 'cube') { S.grid[r][c] = null; K.remove(o, delay); K.collect('color', o.color, o, delay); popBubble(S, r, c, delay, K); }
    else if (o.kind === 'balloon') { S.grid[r][c] = null; K.remove(o, delay); K.collect('balloon', undefined, o, delay); }
    else if (o.kind === 'box') {
      o.hp--;
      if (o.hp <= 0) { S.grid[r][c] = null; K.remove(o, delay); K.collect('box', undefined, o, delay); }
      else K.hurt(o, delay);
    } else if (isSpecial(o)) {
      S.grid[r][c] = null;
      popBubble(S, r, c, delay, K);
      activate(S, o, r, c, delay + 0.1, K);
    }
  }
  function clearPiece(S, r, c, o) {
    if (!o.big) { S.grid[r][c] = null; return; }
    for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) if (S.grid[o.r0 + dr] && S.grid[o.r0 + dr][o.c0 + dc] === o) S.grid[o.r0 + dr][o.c0 + dc] = null;
  }
  function xDamage(S, r, c, o, delay, K, color) {
    const def = XOBS[o.kind], fromMatch = color != null;
    const finish = () => { clearPiece(S, r, c, o); K.remove(o, delay); K.collect(o.kind, undefined, o, delay); };
    if (o.big) { if (o.lastAct === S.act) return; o.lastAct = S.act; }
    switch (def.rule) {
      case 'hits': o.hp--; if (o.kind === 'safe') o.open = true; if (o.hp <= 0) finish(); else K.hurt(o, delay); return;
      case 'special': if (fromMatch) return; o.hp--; if (o.hp <= 0) finish(); else K.hurt(o, delay); return;
      case 'shell': if (o.shell) { if (!fromMatch) { o.shell = false; K.hurt(o, delay); } return; } finish(); return;
      case 'color': if (!fromMatch || color !== o.color) return; o.hp--; if (o.hp <= 0) finish(); else K.hurt(o, delay); return;
      case 'potion':
        if (o.color == null) { if (fromMatch) { o.color = color; K.hurt(o, delay); } return; }
        if (!fromMatch || color === o.color) finish(); return;
      case 'orb': if (!fromMatch || color === o.color) finish(); return;
      case 'dispense': if (!fromMatch) return; o.jars--; K.collect('jam', undefined, o, delay); if (o.jars <= 0) { S.grid[r][c] = null; K.remove(o, delay); } else K.hurt(o, delay); return;
      case 'vase': // jarrón: 3 combinaciones al lado y se convierte en un potenciador
        if (!fromMatch) return;
        o.hp--; if (o.hp > 0) { K.hurt(o, delay); return; }
        { const sp = S.rand() < 0.5 ? { id: uid++, kind: 'rocket', dir: S.rand() < 0.5 ? 'h' : 'v' } : { id: uid++, kind: 'bomb' }; S.grid[r][c] = sp; K.transform(o, sp, delay); K.collect('vase', undefined, o, delay); }
        return;
      case 'hanoi': { // pirámide de aros: solo el color del aro de arriba
        const i = o.cols.findIndex((x) => x >= 0);
        if (i < 0 || (fromMatch && color !== o.cols[i])) return;
        o.cols = o.cols.slice(); o.cols[i] = -1;
        if (o.cols.every((x) => x < 0)) finish(); else K.hurt(o, delay);
        return;
      }
      case 'hat': { // sombrero mágico: con su color, saca un cohete o una bomba a una casilla de al lado
        if (!fromMatch || color !== o.color) return;
        o.hp--;
        const opts = D4.map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => { const q = cell(S, rr, cc); return q && q.kind === 'cube' && !q.caged; });
        if (opts.length) {
          const [rr, cc] = opts[S.rand.int(opts.length)];
          const sp = S.rand() < 0.6 ? { id: uid++, kind: 'rocket', dir: S.rand() < 0.5 ? 'h' : 'v' } : { id: uid++, kind: 'bomb' };
          const old = S.grid[rr][cc]; S.grid[rr][cc] = sp; K.transform(old, sp, delay + 0.1);
        }
        if (o.hp <= 0) finish(); else K.hurt(o, delay);
        return;
      }
      case 'platform': // plataforma: 3 combinaciones al lado lanzan su cohete por la columna
        if (!fromMatch) return;
        o.stage = (o.stage || 0) + 1; K.hurt(o, delay);
        if (o.stage >= 3) { o.stage = 0; (S.genQueue = S.genQueue || []).push([r, c, 'rplat']); }
        return;
      case 'allColors': {
        let i = color == null ? o.cols.findIndex((x) => x >= 0) : o.cols.indexOf(color);
        if (i < 0) return;
        o.cols = o.cols.slice(); o.cols[i] = -1;
        if (o.cols.every((x) => x < 0)) finish(); else K.hurt(o, delay);
      }
    }
  }
  function activate(S, t, r, c, delay, K) {
    K.remove(t, delay);
    if (t.kind === 'rocket') {
      K.fx({ type: 'rocket', dir: t.dir, r, c, delay });
      if (t.dir === 'h') for (let cc = 0; cc < S.C; cc++) { if (cc !== c) damage(S, r, cc, delay + Math.abs(cc - c) * 0.035, K); }
      else for (let rr = 0; rr < S.R; rr++) { if (rr !== r) damage(S, rr, c, delay + Math.abs(rr - r) * 0.035, K); }
    } else if (t.kind === 'bomb') {
      K.fx({ type: 'bomb', r, c, rad: 1, delay });
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) damage(S, r + dr, c + dc, delay + 0.05 * Math.max(Math.abs(dr), Math.abs(dc)), K);
    } else if (t.kind === 'disco') {
      const targets = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = cell(S, rr, cc); if (o && o.kind === 'cube' && o.color === t.color) targets.push([rr, cc]); }
      K.fx({ type: 'disco', r, c, targets, delay, color: t.color });
      targets.forEach(([rr, cc], i) => damage(S, rr, cc, delay + 0.25 + i * 0.015, K));
    }
  }
  function combo(S, cells, r, c, K) {
    const tiles = cells.map(([rr, cc]) => { const t = S.grid[rr][cc]; S.grid[rr][cc] = null; return t; });
    tiles.forEach((t) => K.remove(t, 0, { mode: 'merge', r, c }));
    const n = (k) => tiles.filter((t) => t.kind === k).length;
    const d = 0.25;
    if (n('disco') >= 2) {
      K.fx({ type: 'bomb', r, c, rad: 9, delay: d });
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) damage(S, rr, cc, d + 0.04 * Math.max(Math.abs(rr - r), Math.abs(cc - c)), K);
    } else if (n('disco') === 1) {
      const disco = tiles.find((t) => t.kind === 'disco');
      const into = n('bomb') ? 'bomb' : 'rocket';
      const targets = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = cell(S, rr, cc); if (o && o.kind === 'cube' && o.color === disco.color) targets.push([rr, cc]); }
      K.fx({ type: 'disco', r, c, targets, delay: d, color: disco.color });
      targets.forEach(([rr, cc], i) => {
        const old = S.grid[rr][cc];
        const sp = into === 'bomb' ? { id: uid++, kind: 'bomb' } : { id: uid++, kind: 'rocket', dir: S.rand() < 0.5 ? 'h' : 'v' };
        K.transform(old, sp, d + 0.2);
        K.collect('color', old.color, old, d + 0.2);
        S.grid[rr][cc] = sp;
      });
      targets.forEach(([rr, cc], i) => {
        const sp = S.grid[rr][cc];
        if (sp && isSpecial(sp)) { S.grid[rr][cc] = null; activate(S, sp, rr, cc, d + 0.6 + i * 0.09, K); }
      });
    } else if (n('bomb') >= 2) {
      K.fx({ type: 'bomb', r, c, rad: 3, delay: d });
      for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) damage(S, r + dr, c + dc, d + 0.05 * Math.max(Math.abs(dr), Math.abs(dc)), K);
    } else if (n('bomb') >= 1) {
      for (let k = -1; k <= 1; k++) {
        K.fx({ type: 'rocket', dir: 'h', r: r + k, c, delay: d });
        K.fx({ type: 'rocket', dir: 'v', r, c: c + k, delay: d });
        for (let cc = 0; cc < S.C; cc++) damage(S, r + k, cc, d + Math.abs(cc - c) * 0.035, K);
        for (let rr = 0; rr < S.R; rr++) damage(S, rr, c + k, d + Math.abs(rr - r) * 0.035, K);
      }
    } else {
      K.fx({ type: 'rocket', dir: 'h', r, c, delay: d });
      K.fx({ type: 'rocket', dir: 'v', r, c, delay: d });
      for (let cc = 0; cc < S.C; cc++) damage(S, r, cc, d + Math.abs(cc - c) * 0.035, K);
      for (let rr = 0; rr < S.R; rr++) damage(S, rr, c, d + Math.abs(rr - r) * 0.035, K);
    }
  }
  // Una jugada tocando la casilla (r,c). Devuelve false si no es válida.
  function act(S, r, c, K) {
    const t = cell(S, r, c);
    if (!t) return false;
    S.turn = (S.turn || 0) + 1;
    S.iceHit = false;
    S.act = (S.act || 0) + 1;
    if (t.kind === 'cube') {
      const grp = group(S, r, c);
      if (grp.length < 2) return false;
      const big = grp.length >= 5;
      const hit = new Set();
      for (const [rr, cc] of grp) {
        const tt = S.grid[rr][cc];
        S.grid[rr][cc] = null;
        K.remove(tt, 0, big ? { mode: 'merge', r, c } : null);
        K.collect('color', tt.color, tt, big ? 0.2 : 0);
        popBubble(S, rr, cc, 0, K);
      }
      for (const [rr, cc] of grp) {
        for (const [dr, dc] of D4) {
          const o = cell(S, rr + dr, cc + dc);
          if (o && o.kind === 'compass') { // solo cuenta la combinación junto a su lado iluminado
            const [lr, lc] = LIT[o.dir || 0];
            if (!hit.has(o) && lr === -dr && lc === -dc) { hit.add(o); damage(S, rr + dr, cc + dc, 0.05, K, t.color); }
            continue;
          }
          if (isObstacle(o) && !hit.has(o)) { hit.add(o); damage(S, rr + dr, cc + dc, 0.05, K, t.color); }
        }
      }
      if (big) { const sp = specialFor(grp.length, t.color, S); S.grid[r][c] = sp; K.created(sp, r, c, 0.2); }
      K.sound('pop', grp.length);
    } else if (isSpecial(t)) {
      const sg = specialGroup(S, r, c);
      if (sg.length >= 2) combo(S, sg, r, c, K);
      else { S.grid[r][c] = null; activate(S, t, r, c, 0, K); }
    } else return false;
    settle(S, K);
    return true;
  }
  // ¿el patito ha llegado al fondo de su tramo? (abajo del todo o encima de una pieza fija)
  const atFloor = (S, r, c) => r === S.R - 1 || isStatic(S.grid[r + 1][c]);
  // Gravedad con piezas fijas: caída vertical por tramos, piezas nuevas arriba
  // y relleno en diagonal de lo que queda debajo de una pieza fija (NewFallDownCalculator de Toy Blast)
  function dropDragons(S) {
    let moved = false;
    const seen = new Set();
    for (let r = S.R - 1; r >= 0; r--) for (let c = 0; c < S.C; c++) {
      const o = S.grid[r][c];
      if (!o || o.kind !== 'dragon' || seen.has(o)) continue;
      seen.add(o);
      const br = o.r0 + 2;
      if (br >= S.R || S.grid[br][o.c0] || S.grid[br][o.c0 + 1] || br < S.top[o.c0] || br < S.top[o.c0 + 1]) continue;
      S.grid[o.r0][o.c0] = null; S.grid[o.r0][o.c0 + 1] = null;
      S.grid[br][o.c0] = o; S.grid[br][o.c0 + 1] = o; o.r0++;
      moved = true;
    }
    return moved;
  }
  function gravity(S, K) {
    const spawned = new Array(S.C).fill(0);
    for (let guard = 0; guard < 300; guard++) {
      let moved = dropDragons(S);
      for (let c = 0; c < S.C; c++) {
        for (let r = S.R - 1; r >= S.top[c]; r--) {
          if (S.grid[r][c]) continue;
          let k = r - 1;
          while (k >= S.top[c] && !S.grid[k][c]) k--;
          if (k >= S.top[c]) {
            const o = S.grid[k][c];
            if (!isStatic(o)) { S.grid[r][c] = o; S.grid[k][c] = null; moved = true; }
          } else {
            let t;
            const ducksOn = countKind(S, 'duck');
            if (S.ducksLeft > ducksOn && ducksOn < 2 && S.rand() < 0.15) t = { id: uid++, kind: 'duck' };
            else t = newCube(S);
            S.grid[r][c] = t; K.spawn(t, r, c, spawned[c]++); moved = true;
          }
        }
      }
      if (moved) continue;
      // diagonal: una pieza que no puede bajar recto se desliza a la casilla vacía de abajo a un lado
      let diag = false;
      for (let r = S.R - 1; r > 0 && !diag; r--) for (let c = 0; c < S.C && !diag; c++) {
        if (r < S.top[c] || S.grid[r][c]) continue;
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc >= S.C || r - 1 < S.top[cc]) continue;
          const o = S.grid[r - 1][cc];
          if (!o || isStatic(o)) continue;
          const below = r < S.R && r >= S.top[cc] ? S.grid[r][cc] : 1;
          if (!below) continue; // esa pieza aún puede caer recto
          S.grid[r][c] = o; S.grid[r - 1][cc] = null; diag = true; break;
        }
      }
      if (!diag) break;
    }
  }
  function settle(S, K) {
    for (let guard = 0; guard < 20; guard++) {
      let changed = false;
      // patitos que llegan al fondo
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const o = S.grid[r][c];
        if (o && o.kind === 'duck' && atFloor(S, r, c)) { S.grid[r][c] = null; K.remove(o, 0, { mode: 'duck', r, c }); K.collect('duck', undefined, o, 0); S.ducksLeft--; changed = true; }
      }
      gravity(S, K);
      for (let c = 0; c < S.C; c++) { const o = S.grid[S.R - 1][c]; if (o && o.kind === 'dragon') { clearPiece(S, S.R - 1, c, o); K.remove(o, 0); K.collect('dragon', undefined, o, 0); changed = true; } }
      if (changed) gravity(S, K);
      let duckBottom = false;
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = S.grid[r][c]; if (o && o.kind === 'duck' && atFloor(S, r, c)) duckBottom = true; }
      if (!duckBottom) break;
    }
    // fin de turno (solo tras una jugada del jugador)
    if (S.lastTurnDone !== S.turn) {
      S.lastTurnDone = S.turn;
      // patitos: cambian entre visible y escondido
      for (const row of S.grid) for (const o of row) if (o && o.kind === 'rduck') o.on = !o.on;
      // brújula: el lado iluminado gira
      for (const row of S.grid) for (const o of row) if (o && o.kind === 'compass') { o.dir = ((o.dir || 0) + 1) % 4; }
      // hielo que crece (IceHandler): si no se rompió ninguno, una casilla vecina se congela y el objetivo sube
      const ices = [];
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = S.grid[rr][cc]; if (o && o.kind === 'ice') ices.push([rr, cc]); }
      if (ices.length && !S.iceHit) {
        const opts = [];
        for (const [rr, cc] of ices) for (const [dr, dc] of D4) { const q = cell(S, rr + dr, cc + dc); if (q && q.kind === 'cube') opts.push([rr + dr, cc + dc]); }
        if (opts.length) { const [rr, cc] = opts[S.rand.int(opts.length)]; const old = S.grid[rr][cc]; const ic = { id: uid++, kind: 'ice' }; S.grid[rr][cc] = ic; K.transform(old, ic, 0.2); K.goalAdd('ice', 1); }
      }
      // generadores: sueltan sus piezas sobre cubos cercanos
      for (const [gr, gc, kind] of (S.genQueue || []).filter((q) => q[2] === 'rplat')) {
        K.fx({ type: 'rocket', dir: 'v', r: gr, c: gc, delay: 0.1 });
        for (let rr = 0; rr < S.R; rr++) if (rr !== gr) damage(S, rr, gc, 0.1 + Math.abs(rr - gr) * 0.03, K);
        K.collect('rplat', undefined, S.grid[gr][gc], 0.1);
      }
      S.genQueue = (S.genQueue || []).filter((q) => q[2] !== 'rplat');
      for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) {
        const o = S.grid[rr][cc];
        if (!o || o.kind !== 'spiggy' || o.swTurn === S.turn) continue;
        o.swTurn = S.turn;
        const opts = D4.map(([dr, dc]) => [rr + dr, cc + dc]).filter(([a, b]) => { const q = cell(S, a, b); return q && q.kind === 'cube'; });
        if (opts.length) { const [a, b] = opts[S.rand.int(opts.length)]; const q = S.grid[a][b]; S.grid[a][b] = o; S.grid[rr][cc] = q; }
      }
      for (const [gr, gc, kind] of S.genQueue || []) {
        const opts = [];
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const q = cell(S, gr + dr, gc + dc); if (q && q.kind === 'cube' && !q.caged) opts.push([gr + dr, gc + dc]); }
        S.rand.shuffle(opts).slice(0, kind === 'igloo' ? 1 : 2).forEach(([rr, cc]) => {
          const old = S.grid[rr][cc];
          const nw = kind === 'igloo' ? { id: uid++, kind: 'ice' } : kind === 'cannon' ? { id: uid++, kind: 'ball', cols: [0, 1, 2, 3] } : { id: uid++, kind: 'egg', hp: 2 };
          S.grid[rr][cc] = nw; K.transform(old, nw, 0.25);
          if (kind === 'igloo') K.goalAdd('ice', 1);
        });
      }
      S.genQueue = [];
    }
    // las bolas de cristal cambian de color cada turno
    for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = S.grid[rr][cc]; if (o && o.kind === 'orb' && o.colorTurn !== S.turn) { o.colorTurn = S.turn; o.color = (o.color + 1) % S.colors; } }
    // ovnis que no recibieron golpe este turno recuperan una capa
    for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = S.grid[rr][cc]; if (o && (o.kind === 'ufo' || o.kind === 'cuckoo') && o.hp < 2 && o.hitTurn !== S.turn) { o.hp++; K.hurt(o, 0.3); } }
    // lavadoras: lanzan min(3, burbujas que faltan − burbujas en el tablero) sobre cubos al azar
    while (S.throws > 0) {
      S.throws--;
      const want = Math.min(3, S.bubbleLeft - bubblesOnBoard(S));
      const tg = S.rand.shuffle(bubbleTargets(S)).slice(0, Math.max(0, want));
      tg.forEach(([r, c], i) => { S.bub[r][c] = 1; K.bubbleNew(r, c, 0.3 + i * 0.12); });
    }
    if (!hasMove(S)) shuffle(S, K);
  }
  function countKind(S, kind) {
    let n = 0;
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = S.grid[r][c]; if (o && o.kind === kind) n++; }
    return n;
  }
  function hasMove(S) {
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const o = cell(S, r, c);
      if (!o) continue;
      if (isSpecial(o)) return true;
      if (o.kind === 'cube' && !o.caged) {
        const a = cell(S, r + 1, c), b = cell(S, r, c + 1);
        if ((a && a.kind === 'cube' && !a.caged && a.color === o.color) || (b && b.kind === 'cube' && !b.caged && b.color === o.color)) return true;
      }
    }
    return false;
  }
  function shuffle(S, K) {
    const pos = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = cell(S, r, c); if (o && o.kind === 'cube' && !o.caged) pos.push([r, c]); }
    const cubes = pos.map(([r, c]) => S.grid[r][c]);
    for (let tries = 0; tries < 30; tries++) {
      S.rand.shuffle(cubes);
      pos.forEach(([r, c], i) => { S.grid[r][c] = cubes[i]; });
      if (hasMove(S)) break;
    }
    if (!hasMove(S) && pos.length >= 2) {
      // forzar una pareja
      const [r, c] = pos[0];
      for (const [dr, dc] of D4) { const o = cell(S, r + dr, c + dc); if (o && o.kind === 'cube') { o.color = S.grid[r][c].color; break; } }
    }
    K.shuffled();
  }

  // ------------------------------------------------------------ generador de niveles
  function buildState(spec, seed) {
    const S = { R: spec.R, C: spec.C, top: spec.top.slice(), colors: spec.colors, rand: E.rng(seed), ducksLeft: spec.ducks, throws: 0 };
    S.bub = spec.bub ? spec.bub.map((row) => row.slice()) : spec.cells.map((row) => row.map(() => 0));
    S.dirt = spec.dirt ? spec.dirt.map((row) => row.slice()) : spec.cells.map((row) => row.map(() => 0));
    const bg = spec.goals.find((g) => g.type === 'bubble');
    S.bubbleLeft = bg ? bg.count : 0;
    const memo = new Map();
    S.grid = [];
    for (let r = 0; r < S.R; r++) {
      S.grid.push([]);
      for (let c = 0; c < S.C; c++) {
        const d = spec.cells[r][c];
        if (d && d.big) { if (!memo.has(d)) memo.set(d, Object.assign({ id: uid++ }, d)); S.grid[r].push(memo.get(d)); }
        else S.grid[r].push(d ? Object.assign({ id: uid++ }, d) : null);
      }
    }
    return S;
  }
  const nullK = {
    remove() {}, created() {}, fx() {}, hurt() {}, spawn() {}, transform() {}, shuffled() {}, sound() {}, bubble() {}, bubbleNew() {}, goalAdd() {}, dirt() {},
  };
  // Bot sencillo: elige la jugada que más avanza los objetivos.
  function* botRunG(spec, seed) {
    const S = buildState(spec, seed);
    const need = { color: {}, box: 0, balloon: 0, duck: 0, egg: 0, ball: 0, bubble: 0, soap: 0, pumpkin: 0, ufo: 0, toast: 0, piggy: 0, stone: 0, gum: 0, cuckoo: 0, crate: 0, pinwheel: 0, bee: 0, curtain: 0 };
    spec.goals.forEach((gl) => { if (gl.type === 'color') need.color[gl.key] = gl.count; else need[gl.type] = gl.count; });
    const K = Object.assign({}, nullK, {
      collect(type, key) { if (type === 'color') { if (need.color[key] > 0) need.color[key]--; } else if (need[type] > 0) need[type]--; },
      bubble() { if (need.bubble > 0) need.bubble--; },
      goalAdd(type, n) { if (need[type] != null) need[type] += n; },
    });
    const done = () => Object.entries(need).every(([k, v]) => (k === 'color' ? Object.values(v).every((x) => x <= 0) : v <= 0));
    let moves = 0;
    while (!done() && moves < 150) {
      yield;
      const best = botPick(S, need);
      if (!best) { shuffle(S, K); moves++; continue; }
      act(S, best[0], best[1], K);
      moves++;
    }
    if (GAME.debug) { GAME.lastNeed = need; GAME.lastS = S; }
    return moves;
  }
  GAME.botRun = (spec, seed) => E.runGen(botRunG(spec, seed));
  GAME.botPick = (S, need) => botPick(S, need);
  // ¿un grupo de este color le hace algo a este obstáculo?
  function groupHits(q, color) {
    const def = XOBS[q.kind];
    if (q.kind === 'piggy' || (q.kind === 'stone' && q.shell)) return false;
    if (q.kind === 'pinwheel') return q.cols.includes(color);
    if (q.kind === 'rduck') return !!q.on;
    if (!def) return true;
    if (def.rule === 'special' || (def.rule === 'shell' && q.shell)) return false;
    if (def.rule === 'color' || def.rule === 'orb' || def.rule === 'hat') return color === q.color;
    if (def.rule === 'potion') return q.color == null || color === q.color;
    if (def.rule === 'allColors') return q.cols.includes(color);
    return true;
  }
  function botPick(S, need) {
    const seen = new Set();
    let best = null, bestScore = -1;
    // obstáculos que aún hacen falta: el bot juega cerca de ellos
    const obs = [];
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = cell(S, r, c); if (isObstacle(o) && (need[o.kind] > 0 || (o.kind === 'jam' && need.jam > 0) || (o.kind === 'cube' && o.caged && need.cage > 0) || (o.kind === 'toaster' && need.toast > 0) || (o.kind === 'hive' && need.bee > 0) || (o.kind === 'washer' && need.bubble > bubblesOnBoard(S)))) obs.push([r, c]); else if (o && o.kind === 'duck') obs.push([r + 1, c]); else if (o && o.kind === 'dragon' && need.dragon > 0) obs.push([r + 2, c]); else if (need.dirt > 0 && S.dirt[r][c] > 0) obs.push([r, c]); else if (o && need.bubble > 0 && S.bub[r][c]) obs.push([r, c]); }
    let specialOnly = false;
    for (const [orr, oc] of obs) { const q = cell(S, orr, oc); if (q && ((XOBS[q.kind] && XOBS[q.kind].rule === 'special') || q.kind === 'piggy' || (q.shell))) specialOnly = true; }
    if (need.dirt > 0) specialOnly = true;
    // cuando ya solo faltan obstáculos, acercarse a ellos pesa mucho más (si no, el bot se pierde con las últimas cajas)
    // (con obstáculos que solo rompen los especiales, lo que hace falta son grupos grandes, no acercarse)
    const onlyObs = !specialOnly && obs.length && !Object.values(need.color).some((v) => v > 0);
    const near = (r, c) => { let m = 99; for (const [orr, oc] of obs) m = Math.min(m, Math.abs(orr - r) + Math.abs(oc - c)); return obs.length ? (onlyObs ? 15 : 5) / (1 + m) : 0; };
    const obsCols = new Set(obs.map(([, oc]) => oc));
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const o = cell(S, r, c);
      if (!o || seen.has(o)) continue;
      let score = -1;
      if (isSpecial(o)) {
        seen.add(o);
        score = 10 + (o.kind === 'disco' ? 6 : 0) + near(r, c) * 2;
      } else if (o.kind === 'cube') {
        const grp = group(S, r, c);
        grp.forEach(([rr, cc]) => seen.add(S.grid[rr][cc]));
        if (grp.length < 2) continue;
        score = grp.length;
        if (need.color[o.color] > 0) score += grp.length * 2;
        if (grp.length >= 5) score += 4;
        const adj = new Set();
        for (const [rr, cc] of grp) for (const [dr, dc] of D4) {
          const q = cell(S, rr + dr, cc + dc);
          if (isObstacle(q) && groupHits(q, o.color)) adj.add(q);
        }
        score += adj.size * 4;
        // rematar un ovni o cuco que ya recibió un golpe (si no, se recupera)
        for (const q of adj) if ((q.kind === 'ufo' || q.kind === 'cuckoo') && q.hp < 2) score += 12;
        if (need.bubble > 0) for (const [rr, cc] of grp) if (S.bub[rr][cc]) score += 3;
        let nb = 0; for (const [rr, cc] of grp) nb = Math.max(nb, near(rr, cc)); score += nb;
        // quitar cubos de la columna de encima de un obstáculo trae colores nuevos a su lado
        if (onlyObs) for (const [, cc] of grp) if (obsCols.has(cc) || obsCols.has(cc - 1) || obsCols.has(cc + 1)) score += 1.5;
        // los obstáculos que solo rompen los especiales piden grupos grandes (cohete/bomba) a su lado
        if (grp.length >= 5 && specialOnly) score += nb * 4;
        if (need.duck > 0) for (const [rr, cc] of grp) for (let k = rr - 1; k >= 0; k--) { const q = cell(S, k, cc); if (q && q.kind === 'duck') score += 8; }
      }
      if (score > bestScore) { bestScore = score; best = [r, c]; }
    }
    return best;
  }

  const cache = new Map();
  // generador por pasos: el motor lo avanza poco a poco en segundo plano (ver E.prefetch)
  function* levelG(n) {
    if (cache.has(n)) return cache.get(n);
    let spec = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const sp = yield* genLevelG(n, attempt);
      if (!spec || sp.botMoves < spec.botMoves) spec = sp;
      if (spec.botMoves <= 40) break;
    }
    const k10 = n % 10;
    spec.hard = n > 10 && (k10 === 0 ? 2 : k10 === 6 ? 1 : 0);
    // el bot varía mucho entre partidas: se calibra con el percentil 75 de 8 partidas
    const runs = [];
    for (let k = 0; k < 8; k++) runs.push(yield* botRunG(spec, n * 977 + 50 + k));
    runs.sort((x, y) => x - y);
    spec.botP75 = runs[5];
    const factor = 1.25 - spec.d * 0.2 - (spec.hard || 0) * 0.06;
    spec.moves = E.clamp(Math.ceil(spec.botP75 * factor) + (n < 5 ? 4 : 2), 8, 60);
    cache.set(n, spec);
    return spec;
  }
  GAME.makeLevel = (n) => (cache.has(n) ? cache.get(n) : E.runGen(levelG(n)));
  GAME.levelSteps = (n) => (cache.has(n) ? null : levelG(n));
  function* genLevelG(n, attempt) {
    const rng = E.rng(n * 2654435761 + 77 + attempt * 1013);
    const d = E.difficulty(n) * Math.pow(0.75, attempt);
    const C = n < 4 ? 7 : rng.pick([8, 9, 9]);
    const R = n < 4 ? 8 : rng.pick([9, 9, 10]);
    const colors = n < 12 ? 4 : n > 120 && d > 0.7 && rng() < 0.25 ? 6 : 5;
    // forma del tablero (columnas contiguas, simétrica)
    const top = new Array(C).fill(0);
    const shape = n < 6 ? 0 : rng.int(6);
    for (let c = 0; c < C; c++) {
      const m = Math.min(c, C - 1 - c);
      if (shape === 1) top[c] = m === 0 ? 2 : m === 1 ? 1 : 0;
      else if (shape === 2) top[c] = Math.max(0, 2 - Math.abs(m - Math.floor((C - 1) / 2)));
      else if (shape === 3) top[c] = m === 0 ? 1 : 0;
      else if (shape === 4) top[c] = c % 2 ? 0 : 1;
      else if (shape === 5 && C % 2 === 1 && c === (C - 1) / 2) top[c] = R; // columna vacía en el centro (como el nivel 2418)
    }
    const cells = [];
    for (let r = 0; r < R; r++) { cells.push([]); for (let c = 0; c < C; c++) cells[r].push(r >= top[c] ? { kind: 'cube', color: rng.int(colors) } : null); }

    // tipos de objetivo disponibles según avanza
    const types = ['color'];
    if (n >= 4) types.push('box');
    if (n >= 7) types.push('balloon');
    if (n >= 11) types.push('duck');
    if (n >= 15) types.push('egg');
    if (n >= 19) types.push('ball');
    if (n >= 9) types.push('bubble', 'bubble'); // la burbuja es el objetivo más frecuente en el tramo de la abuela
    // obstáculos de su tramo de Toy Blast (ver analisis/toy_blast.md §9)
    if (n >= 31) types.push('pumpkin');
    if (n >= 35) types.push('ufo');
    if (n >= 39) types.push('toast');
    if (n >= 43) types.push('piggy');
    if (n >= 47) types.push('stone');
    if (n >= 51) types.push('gum');
    if (n >= 55) types.push('cuckoo');
    if (n >= 59) types.push('crate');
    if (n >= 63) types.push('pinwheel');
    if (n >= 67) types.push('bee');
    if (n >= 71) types.push('curtain');
    for (const k in XOBS) if (n >= XOBS[k].from) types.push(k);
    if (n >= 123) types.push('ice');
    if (n >= 127) types.push('rduck');
    if (n >= 131) types.push('cage');
    if (n >= 135) types.push('cannon');
    if (n >= 139) types.push('eggpot');
    if (n >= 163) types.push('dragon');
    if (n >= 167) types.push('dirt');
    // en Toy Blast lo normal son 3-4 objetivos por nivel
    let ng = n < 4 ? 1 : n < 10 ? rng.pick([1, 2]) : n < 20 ? rng.pick([2, 2, 3]) : rng.pick([2, 3, 3, 4]);
    ng = Math.min(ng, types.length);
    const chosen = [];
    // el tipo "nuevo" aparece en su nivel de estreno
    const intro = { 4: 'box', 7: 'balloon', 9: 'bubble', 11: 'duck', 15: 'egg', 19: 'ball', 23: 'bubble', 27: 'bubble', 31: 'pumpkin', 35: 'ufo', 39: 'toast', 43: 'piggy', 47: 'stone', 51: 'gum', 55: 'cuckoo', 59: 'crate', 63: 'pinwheel', 67: 'bee', 71: 'curtain', ...Object.fromEntries(Object.entries(XOBS).map(([k, v]) => [v.from, k])), 123: 'ice', 127: 'rduck', 131: 'cage', 135: 'cannon', 139: 'eggpot', 163: 'dragon', 167: 'dirt' }[n];
    if (intro) chosen.push(intro);
    const pool = rng.shuffle(types.slice());
    for (const t of pool) { if (chosen.length >= ng) break; if (!chosen.includes(t)) chosen.push(t); }

    const goals = [];
    const bub = cells.map((row) => row.map(() => 0));
    const dirt = cells.map((row) => row.map(() => 0));
    let ducks = 0;
    let text = '';
    for (const t of chosen) {
      if (t === 'color') {
        const k = chosen.length > 1 ? 0.7 : 1;
        const ncol = n > 20 && chosen.length < 3 && rng() < 0.3 ? 2 : 1;
        const cols = rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, ncol);
        cols.forEach((col) => goals.push({ type: 'color', key: col, count: Math.round((14 + d * 40) * k * (0.85 + rng() * 0.3) / ncol) }));
      } else if (t === 'box') {
        const rows = 1 + Math.round(d * 1.6 + rng());
        const hp = d < 0.3 ? 1 : rows >= 3 ? rng.pick([1, 2]) : rng.pick(d < 0.6 ? [1, 2] : [1, 2, 3]);
        const pat = rng.int(3);
        let count = 0;
        for (let r = R - rows; r < R; r++) for (let c = 0; c < C; c++) {
          const m = Math.min(c, C - 1 - c);
          const on = pat === 0 || (pat === 1 && (r + m) % 2 === 0) || (pat === 2 && m % 2 === 0);
          if (on && cells[r][c]) { cells[r][c] = { kind: 'box', hp }; count++; }
        }
        if (count) goals.push({ type: 'box', count });
        if (n === 4) text = 'Rompe las cajas explotando cubos a su lado';
      } else if (t === 'balloon') {
        const cnt = Math.round(4 + d * 10);
        let placed = 0;
        for (let i = 0; i < 200 && placed < cnt; i++) {
          const r = rng.range(2, R - 2), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = { kind: 'balloon' }; placed++; const mc = C - 1 - c; if (placed < cnt && cells[r][mc] && cells[r][mc].kind === 'cube') { cells[r][mc] = { kind: 'balloon' }; placed++; } }
        }
        if (placed) goals.push({ type: 'balloon', count: placed });
        if (n === 7) text = 'Explota los globos con los cubos de al lado';
      } else if (t === 'egg' || t === 'ball') {
        const cnt = Math.round((t === 'egg' ? 4 : 3) + d * 6);
        let placed = 0;
        for (let i = 0; i < 200 && placed < cnt; i++) {
          const r = rng.range(1, R - 2), c = rng.int(C);
          const mk = () => (t === 'egg' ? { kind: 'egg', hp: 2 } : { kind: 'ball', cols: rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, 4) });
          if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = mk(); placed++; const mc = C - 1 - c; if (placed < cnt && cells[r][mc] && cells[r][mc].kind === 'cube') { cells[r][mc] = mk(); placed++; } }
        }
        if (placed) goals.push({ type: t, count: placed });
        if (n === 15) text = 'Los huevos se rompen con dos golpes';
        if (n === 19) text = 'Haz una combinación junto a la pelota playera para hacerla saltar';
      } else if (t === 'bubble') {
        if (goals.some((g) => g.type === 'bubble')) continue;
        // burbujas encima de los cubos: un bloque central o casillas sueltas simétricas
        const want = Math.round(6 + d * 12);
        let placed = 0;
        const pat = rng.int(2);
        for (let i = 0; i < 300 && placed < want; i++) {
          const r = pat === 0 ? rng.range(Math.floor(R / 2) - 2, Math.floor(R / 2) + 1) : rng.range(1, R - 2), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'cube' && !bub[r][c]) { bub[r][c] = 1; placed++; const mc = C - 1 - c; if (placed < want && cells[r][mc] && cells[r][mc].kind === 'cube' && !bub[r][mc]) { bub[r][mc] = 1; placed++; } }
        }
        let goalCount = placed;
        // qué generador lleva el nivel lo decide solo su número (así las variantes no lo descartan)
        const lr = E.rng(n * 7919 + 3)();
        const washers = n === 27 || (n > 27 && lr < 0.4);
        // lavadoras en la fila de abajo (desde el 27): generan las burbujas que faltan
        if (washers) {
          const cs = C % 2 ? [1, C - 2] : [1, C - 2];
          cs.forEach((c) => { if (cells[R - 1][c]) cells[R - 1][c] = { kind: 'washer', stage: 0 }; });
          goalCount += 3 * (1 + Math.round(d * 2));
          if (n === 27) text = 'Haz 3 combinaciones junto a las lavadoras para generar burbujas';
        }
        // jabón (desde el 23): al romperlo llena de burbujas lo de alrededor
        if (!washers && goals.length < 3 && (n === 23 || (n > 23 && lr > 0.6))) {
          const ns = 1 + (d > 0.5 ? 1 : 0);
          let sp = 0;
          for (let i = 0; i < 100 && sp < ns; i++) { const r = rng.range(2, R - 3), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = { kind: 'soap' }; bub[r][c] = 0; sp++; } }
          if (sp) goals.push({ type: 'soap', count: sp });
          if (n === 23) text = 'Rompe el jabón para crear burbujas y quítalas todas';
        }
        if (goalCount) goals.push({ type: 'bubble', count: goalCount });
        if (n === 9) text = 'Haz una combinación sobre las burbujas para quitarlas';
      } else if (t === 'toast') {
        // tostadoras en la fila de abajo (son fijas)
        const cs = [2, C - 3];
        let k = 0;
        cs.forEach((c) => { if (cells[R - 1][c] && cells[R - 1][c].kind === 'cube') { cells[R - 1][c] = { kind: 'toaster' }; k++; } });
        if (k) goals.push({ type: 'toast', count: Math.round(5 + d * 8) });
        if (n === 39) text = 'Haz combinaciones junto a las tostadoras para conseguir tostadas';
      } else if (['cuckoo', 'crate', 'pinwheel', 'bee'].includes(t)) {
        // piezas fijas: en cualquier sitio de la mitad de abajo (lo de debajo se rellena en diagonal)
        const want = t === 'bee' ? 1 + (d > 0.5 ? 1 : 0) : 2;
        let placed = 0;
        for (let i = 0; i < 80 && placed < want; i++) {
          const r = rng.range(Math.floor(R / 2), R - 1), c = rng.int(C);
          if (!cells[r][c] || cells[r][c].kind !== 'cube') continue;
          cells[r][c] = t === 'cuckoo' ? { kind: 'cuckoo', hp: 2 } : t === 'crate' ? { kind: 'crate', hp: 5 } : t === 'pinwheel' ? { kind: 'pinwheel', cols: rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, 4) } : { kind: 'hive' };
          placed++;
        }
        if (placed) goals.push({ type: t, count: t === 'bee' ? Math.round(6 + d * 8) : placed });
        const texts = { 55: 'Dale al reloj de cuco dos veces seguidas', 59: 'Haz 5 combinaciones junto a la caja con bomba para que estalle', 63: 'Combina cada color junto al molinillo para pintar sus aspas', 67: 'Haz combinaciones junto a la colmena para que salgan abejas' };
        if (texts[n]) text = texts[n];
      } else if (t === 'ice' || t === 'rduck' || t === 'cage') {
        const want = t === 'cage' ? 4 + Math.round(d * 6) : t === 'ice' ? 2 + Math.round(d * 3) : 2 + Math.round(d * 2);
        let placed = 0;
        for (let i = 0; i < 150 && placed < want; i++) {
          const r = rng.range(Math.floor(R / 3), R - 1), c = rng.int(C);
          const o = cells[r][c];
          if (!o || o.kind !== 'cube' || o.caged) continue;
          if (t === 'cage') o.caged = true; else cells[r][c] = t === 'ice' ? { kind: 'ice' } : { kind: 'rduck', on: true };
          placed++;
        }
        // con hielo, un iglú lo genera a veces
        if (t === 'ice' && n >= 131 && rng() < 0.4) for (let i = 0; i < 40; i++) { const r = rng.range(Math.floor(R / 2), R - 1), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = { kind: 'igloo' }; break; } }
        if (placed) goals.push({ type: t, count: placed });
        const tx = { 123: '¡Cuidado con el hielo! Si no lo quitas, se expande', 127: 'Combina junto al patito antes de que desaparezca', 131: 'Combina cubos junto a una jaula para liberar lo que encierra' };
        if (tx[n]) text = tx[n];
      } else if (t === 'dragon') {
        let placed = 0;
        for (let i = 0; i < 80 && placed < 1 + (d > 0.5 ? 1 : 0); i++) {
          const r = rng.range(0, Math.floor(R / 2)), c = rng.int(C - 1);
          if (![[0, 0], [0, 1], [1, 0], [1, 1]].every(([dr, dc]) => cells[r + dr] && cells[r + dr][c + dc] && cells[r + dr][c + dc].kind === 'cube')) continue;
          const o = { kind: 'dragon', big: true, r0: r, c0: c };
          for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) cells[r + dr][c + dc] = o;
          placed++;
        }
        if (placed) goals.push({ type: 'dragon', count: placed });
        if (n === 163) text = '¡Logra que los dragones lleguen abajo para hacerte con ellos!';
      } else if (t === 'dirt') {
        // tierra: capa de la casilla que solo quitan cohetes, bombas y el cubo mágico
        let placed = 0;
        for (let r = R - 3; r < R; r++) for (let c = 0; c < C; c++) if (cells[r][c] && rng() < 0.7) { dirt[r][c] = 1 + (d > 0.5 && rng() < 0.4 ? 1 : 0); placed++; }
        if (placed) goals.push({ type: 'dirt', count: placed });
        if (n === 167) text = 'Quita la tierra con cohetes y bombas';
      } else if (t === 'cannon' || t === 'eggpot') {
        let placed = 0;
        for (let i = 0; i < 60 && placed < 1 + (d > 0.5 ? 1 : 0); i++) { const r = rng.range(Math.floor(R / 2), R - 1), c = rng.int(C); if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = { kind: t, stage: 0 }; placed++; } }
        if (placed) goals.push({ type: t === 'cannon' ? 'ball' : 'egg', count: Math.round(4 + d * 4) });
        if (n === 135) text = 'Haz 3 combinaciones junto al cañón para que dispare pelotas playeras';
        if (n === 139) text = 'Haz 3 combinaciones junto a la chocolatera para que suelte huevos';
      } else if (XOBS[t]) {
        const def = XOBS[t];
        const want = def.move ? 2 + Math.round(d * 3) : t === 'jam' ? 1 : 2 + Math.round(d * 1.5);
        let placed = 0, jars = 0;
        for (let i = 0; i < 120 && placed < want; i++) {
          const r = def.move ? rng.range(1, R - 2) : rng.range(Math.floor(R / 2) - 1, R - (def.big ? 2 : 1)), c = rng.int(C - (def.big ? 1 : 0));
          if (!cells[r][c] || cells[r][c].kind !== 'cube') continue;
          if (def.big && ![[0, 1], [1, 0], [1, 1]].every(([dr, dc]) => cells[r + dr] && cells[r + dr][c + dc] && cells[r + dr][c + dc].kind === 'cube')) continue;
          const o = { kind: t, hp: def.hp };
          if (def.big) { o.big = true; o.r0 = r; o.c0 = c; for (const [dr, dc] of [[0, 1], [1, 0], [1, 1]]) cells[r + dr][c + dc] = o; }
          if (t === 'hanoi') o.cols = rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, 3);
          if (t === 'cjar') o.color = rng.int(colors);
          if (t === 'cbrick' || t === 'orb' || t === 'hat') o.color = rng.int(colors);
          if (t === 'locker' || t === 'plate') o.shell = true;
          if (t === 'compass') o.dir = rng.int(4);
          if (t === 'jam') { o.jars = 4 + Math.round(d * 4); jars += o.jars; }
          if (t === 'firework') o.cols = rng.shuffle([0, 1, 2, 3, 4, 5].slice(0, colors)).slice(0, 3);
          cells[r][c] = o; placed++;
        }
        if (placed) goals.push({ type: t, count: t === 'jam' ? jars : t === 'rplat' ? 2 * placed : placed });
        if (n === def.from) text = def.text;
      } else if (t === 'curtain') {
        // persianas: una tira horizontal fija en la mitad de abajo
        const r = rng.range(Math.floor(R / 2), R - 2), c0 = rng.int(Math.max(1, C - 4)), len = 3 + rng.int(3);
        let placed = 0;
        for (let c = c0; c < Math.min(C, c0 + len); c++) if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = { kind: 'curtain' }; placed++; }
        if (placed) goals.push({ type: 'curtain', count: placed });
        if (n === 71) text = 'Haz combinaciones junto a las persianas para quitarlas';
      } else if (['pumpkin', 'ufo', 'piggy', 'stone', 'gum'].includes(t)) {
        const cnt = Math.round((t === 'piggy' || t === 'stone' ? 2 : 3) + d * (t === 'ufo' ? 3 : 4));
        let placed = 0;
        const mk = () => ({ pumpkin: { kind: 'pumpkin', hp: 3 }, ufo: { kind: 'ufo', hp: 2 }, piggy: { kind: 'piggy', hp: d > 0.5 && rng() < 0.4 ? 2 : 1 }, stone: { kind: 'stone', shell: true }, gum: { kind: 'gum', hp: 2 } })[t];
        for (let i = 0; i < 200 && placed < cnt; i++) {
          const r = rng.range(1, R - 2), c = rng.int(C);
          if (cells[r][c] && cells[r][c].kind === 'cube') { cells[r][c] = mk(); placed++; const mc = C - 1 - c; if (placed < cnt && cells[r][mc] && cells[r][mc].kind === 'cube') { cells[r][mc] = mk(); placed++; } }
        }
        if (placed) goals.push({ type: t, count: placed });
        const texts = { 31: 'La calabaza necesita 3 combinaciones a su lado', 35: 'Dale al ovni dos veces seguidas o se recupera', 43: 'El cerdito solo se rompe con cohetes, bombas o el cubo mágico', 47: 'Rompe la roca con un especial y luego haz una combinación a su lado', 51: 'El chicle se pega con el primer golpe y se va con el segundo' };
        if (texts[n]) text = texts[n];
      } else if (t === 'duck') {
        ducks = 2 + Math.round(d * 2);
        const init = Math.min(ducks, 3);
        for (let i = 0; i < init; i++) {
          let c = Math.floor(((i + 1) * C) / (init + 1));
          if (top[c] >= R) c = Math.max(0, c - 1);
          cells[top[c]][c] = { kind: 'duck' };
        }
        goals.push({ type: 'duck', count: ducks });
        if (n === 11) text = '¡Trae los juguetes al suelo para recogerlos!';
      }
    }
    // como mucho 4 objetivos (lo normal en Toy Blast es 3): sobra antes el del jabón, luego un color
    while (goals.length > 4) {
      let i = goals.findIndex((g) => g.type === 'soap');
      if (i < 0) i = goals.findIndex((g) => g.type === 'color');
      if (i < 0) i = goals.length - 1;
      goals.splice(i, 1);
    }
    if (n === 1) text = 'Toca 2 o más cubos iguales que estén juntos';
    if (n === 2) text = 'Con 5 o más cubos juntos ganas un cohete 🚀';
    if (n === 3) text = 'Con 7 juntos, una bomba 💣. ¡Con 9, un cubo mágico!';
    const spec = { R, C, top, colors, cells, goals, ducks, text, d, bub, dirt };
    // movimientos calculados con el bot (siempre es posible ganar)
    const runs = [yield* botRunG(spec, n * 31 + 1), yield* botRunG(spec, n * 31 + 2), yield* botRunG(spec, n * 31 + 3)].sort((a, b) => a - b);
    spec.botMoves = runs[2]; // la peor de 3: se descartan los niveles muy irregulares
    return spec;
  }

  // potenciadores de inicio (Toy Blast: cohete, bomba y cubo mágico) y premio de la racha de victorias
  // como Toy Blast: en cada 10 niveles, el 6 es difícil y el 10 superdifícil (spec.hard)
  GAME.hardness = (n) => (n > 10 && n % 10 === 0 ? 2 : n > 10 && n % 10 === 6 ? 1 : 0);
  // colección propia del juego (logros y álbum)
  GAME.collection = { type: 'duck', label: 'Juguetes rescatados', icon: '🧸' };
  GAME.startBoosters = [{ id: 'rocket', icon: '🚀', name: 'Cohete' }, { id: 'bomb', icon: '💣', name: 'Bomba' }, { id: 'disco', icon: '🔮', name: 'Cubo mágico' }];
  GAME.streakBonus = [['rocket'], ['rocket', 'bomb'], ['rocket', 'bomb', 'disco']];
  GAME.boosters = [
    { id: 'hammer', icon: '🔨', target: true, prompt: 'Martillo: toca la pieza que quieras romper' },
    { id: 'train', icon: '🚂', target: true, prompt: 'Tren: toca una fila' },
    { id: 'vacuum', icon: '🌪️', target: true, prompt: 'Aspiradora: toca una columna' },
    { id: 'bucket', icon: '🪣', target: true, prompt: 'Balde: toca un color' },
    { id: 'brush', icon: '🖌️', target: true, prompt: 'Pincel: toca un cubo para cambiarle el color' },
  ];

  // ------------------------------------------------------------ partida
  GAME.newPlay = function (spec, n) {
    const S = buildState(spec, E.playSeed != null ? E.playSeed : (Math.random() * 1e9) | 0);
    const P = { S, busy: false };
    let ts = 60, bx = 0, by = 0;
    const dying = [];
    const fxs = [];
    let hold = 0;
    let hintTiles = null;
    const bubAnim = new Map(); // casilla -> tiempo desde que apareció su burbuja (negativo = aún no)

    const cx = (c) => bx + c * ts + ts / 2;
    const cy = (r) => by + r * ts + ts / 2;
    const all = () => { const a = []; for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.grid[r][c]) a.push([S.grid[r][c], r, c]); return a; };

    P.layout = function (area) {
      ts = Math.min(area.w / S.C, area.h / S.R, 78);
      bx = area.x + (area.w - ts * S.C) / 2;
      by = area.y + (area.h - ts * S.R) / 2;
      if (!P.placed) {
        P.placed = true;
        for (const [t, r, c] of all()) { t.x = cx(c); t.y = cy(r) - (S.R + 2) * ts; t.vy = 0; t.delay = 0.3 + (S.R - r) * 0.03 + c * 0.02; }
      } else {
        for (const [t, r, c] of all()) { t.x = cx(c); t.y = cy(r); }
      }
      updateHints();
    };

    // receptor de eventos para el juego real
    const K = {
      remove(t, delay, m) {
        if (m && m.mode === 'duck') delay = hold + 0.45;
        dying.push({ t, delay: delay || 0, m, age: 0 });
        hold = Math.max(hold, (delay || 0) + 0.18);
      },
      created(t, r, c, delay) { t.x = cx(c); t.y = cy(r); t.sc = 0; t.vy = 0; E.tween(t, { sc: 1 }, 0.35, { delay, ease: E.ease.outBack }); E.after(delay, () => E.sfx('special')); },
      fx(f) { fxs.push(Object.assign({ age: 0 }, f)); hold = Math.max(hold, f.delay + 0.3); },
      hurt(t, delay) { E.after(delay, () => { t.sc = 0.8; E.tween(t, { sc: 1 }, 0.2, { ease: E.ease.outBack }); E.burst(t.x, t.y, ['#8a5a2b', '#c98b48'], 6, { size: 8 }); E.sfx('land', 1.5); }); },
      spawn(t, r, c, k) { t.x = cx(c); t.y = by + S.top[c] * ts - ts / 2 - k * ts - ts * 0.3; t.vy = 0; t.delay = 0; },
      transform(old, sp, delay) {
        sp.x = old.x; sp.y = old.y; sp.vy = 0; sp.sc = 1; sp.hidden = delay;
        dying.push({ t: old, delay, age: 0 });
        E.after(delay, () => E.burst(sp.x, sp.y, '#fff', 4, { size: 6 }));
      },
      collect(type, key, t, delay) {
        if (type === 'duck') delay = hold;
        E.after(delay + 0.05, () => {
          if (E.goal(type, key, 1, t.x, t.y)) E.sfx('collect', 1 + Math.random() * 0.2);
        });
      },
      shuffled() { for (const [t] of all()) { t.rot = 0; E.tween(t, { rot: Math.PI * 2 }, 0.5, { done: () => { t.rot = 0; } }); } E.floatText(E.W / 2, by + ts * S.R / 2, '¡Mezclando!', '#fff', 44); hold = Math.max(hold, 0.4); },
      sound(name, size) { E.sfx(name, 0.8 + Math.min(size, 10) * 0.05); },
      bubble(r, c, delay) {
        E.after(delay + 0.05, () => {
          E.burst(cx(c), cy(r), ['#ffffff', '#bfe6ff', '#8fd3ff'], 9, { size: 9 });
          E.sfx('pop', 1.8);
          E.goal('bubble', undefined, 1, cx(c), cy(r));
        });
      },
      bubbleNew(r, c, delay) { bubAnim.set(r * 64 + c, -delay); hold = Math.max(hold, delay + 0.3); E.after(delay, () => E.sfx('pop', 2.2)); },
      goalAdd(type, n) { E.goalAdd(type, n); },
      dirt(r, c, delay) { E.after(delay, () => { E.burst(cx(c), cy(r), ['#8c5f32', '#5a3719'], 8, { size: 9 }); }); },
    };

    function cellAt(x, y) {
      const c = Math.floor((x - bx) / ts), r = Math.floor((y - by) / ts);
      if (!inBoard(S, r, c)) return null;
      return [r, c];
    }
    function afterAction() {
      hintTiles = null;
      for (const [t, r, c] of all()) if (t.delay == null || t.delay < hold) t.delay = hold;
    }
    P.down = function (x, y) {
      if (P.busy || P.finaleOn) return;
      const rc = cellAt(x, y);
      if (!rc) return;
      const [r, c] = rc;
      const bst = E.activeBooster();
      if (bst) {
        E.takeBooster();
        useTargetBooster(bst, r, c);
        return;
      }
      const t = S.grid[r][c];
      if (act(S, r, c, K)) {
        P.moves--;
        afterAction();
        if (t.kind !== 'cube') E.sfx(t.kind === 'rocket' ? 'rocket' : t.kind === 'bomb' ? 'bomb' : 'magic');
      } else if (t) {
        E.sfx('bad');
        t.rot = 0;
        E.tween(t, { rot: 0.25 }, 0.06, { done: () => E.tween(t, { rot: -0.25 }, 0.1, { done: () => E.tween(t, { rot: 0 }, 0.06) }) });
      }
    };
    function useTargetBooster(id, r, c) {
      if (id === 'hammer') {
        const t = S.grid[r][c];
        if (!t || t.kind === 'duck') return;
        if (t.kind === 'box' || t.kind === 'egg' || t.kind === 'pumpkin' || t.kind === 'gum' || t.kind === 'ufo' || t.kind === 'piggy') t.hp = 1;
        if (t.kind === 'stone' && t.shell) { t.shell = false; }
        if (t.kind === 'ball') t.cols = [t.cols.find((x) => x >= 0), -1, -1, -1];
        damage(S, r, c, 0, K);
        E.sfx('bomb'); E.shake(0.2);
      } else if (id === 'vacuum') {
        K.fx({ type: 'rocket', dir: 'v', r, c, delay: 0 });
        for (let rr = 0; rr < S.R; rr++) damage(S, rr, c, Math.abs(rr - r) * 0.035, K);
        E.sfx('rocket');
      } else if (id === 'bucket') {
        const t = S.grid[r][c];
        if (!t || t.kind !== 'cube') return;
        const targets = [];
        for (let rr = 0; rr < S.R; rr++) for (let cc = 0; cc < S.C; cc++) { const o = cell(S, rr, cc); if (o && o.kind === 'cube' && o.color === t.color) targets.push([rr, cc]); }
        K.fx({ type: 'disco', r, c, targets, delay: 0, color: t.color });
        targets.forEach(([rr, cc], i) => damage(S, rr, cc, 0.25 + i * 0.015, K));
        E.sfx('magic');
      } else if (id === 'brush') {
        // Turbo Pincel: "cambia el color de un solo cubo" (al color de sus vecinos que forme el grupo más grande)
        const t = S.grid[r][c];
        if (!t || t.kind !== 'cube') return;
        let bestCol = -1, bestN = 0;
        for (let col = 0; col < S.colors; col++) {
          if (col === t.color) continue;
          const old = t.color; t.color = col; const nn = group(S, r, c).length; t.color = old;
          if (nn > bestN) { bestN = nn; bestCol = col; }
        }
        if (bestCol < 0) return;
        t.color = bestCol; t.sc = 0.6; E.tween(t, { sc: 1 }, 0.35, { ease: E.ease.outBack }); E.burst(t.x, t.y, COLORS[bestCol], 8, { size: 9 });
        E.sfx('magic');
        afterAction(); updateHints();
        return;
      } else if (id === 'train') {
        K.fx({ type: 'rocket', dir: 'h', r, c, delay: 0 });
        for (let cc = 0; cc < S.C; cc++) damage(S, r, cc, Math.abs(cc - c) * 0.035, K);
        E.sfx('rocket');
      } else if (id === 'bomb') {
        damage(S, r, c, 0, K);
        const t = { id: uid++, kind: 'bomb', x: cx(c), y: cy(r) };
        activate(S, t, r, c, 0, K);
        E.shake(0.35);
      }
      settle(S, K);
      afterAction();
    }
    P.booster = function (id) {
    };
    // "¿Qué es esto?": explicación de la pieza tocada
    const DESC = {
      cube: 'Toca 2 o más cubos iguales juntos para quitarlos', rocket: 'Cohete: tócalo y limpia su fila o su columna', bomb: 'Bomba: tócala y explota a su alrededor',
      disco: 'Cubo mágico: tócalo y quita todos los cubos de su color', box: 'Caja: se rompe con cubos que exploten a su lado', balloon: 'Globo: explota con los cubos de al lado',
      duck: 'Juguete: bájalo hasta el suelo para recogerlo', egg: 'Huevo: se rompe con dos golpes', ball: 'Pelota playera: haz una combinación a su lado',
      soap: 'Jabón: rómpelo y llenará de burbujas', washer: 'Lavadora: 3 combinaciones a su lado y suelta burbujas', pumpkin: 'Calabaza: 3 combinaciones a su lado',
      ufo: 'Ovni: combina a su lado dos veces seguidas', piggy: 'Hucha: solo se rompe con cohetes o bombas', stone: 'Roca: primero un cohete o bomba, luego combina a su lado',
      gum: 'Chicle: 2 combinaciones a su lado', toaster: 'Tostadora: combina a su lado para sacar tostadas', cuckoo: 'Reloj de cuco: combina a su lado dos veces seguidas',
      crate: 'Caja con bomba: 5 combinaciones a su lado', pinwheel: 'Molinillo: combina a su lado cada uno de sus colores', hive: 'Colmena: combina a su lado para que salgan abejas',
      curtain: 'Persiana: combina a su lado para quitarla', ice: 'Hielo: se rompe combinando a su lado; si no lo rompes, crece', igloo: 'Iglú: lo rompen las combinaciones a su lado',
      rduck: 'Patito: combina a su lado antes de que se esconda', cannon: 'Cañón: 3 combinaciones a su lado y dispara pelotas', eggpot: 'Chocolatera: 3 combinaciones a su lado y suelta huevos',
      dragon: 'Dragón: bájalo hasta el suelo',
    };
    P.describe = function (x, y) {
      const rc = cellAt(x, y);
      if (!rc) return null;
      const [r, c] = rc, o = cell(S, r, c);
      if (S.dirt && S.dirt[r] && S.dirt[r][c]) return 'Tierra: solo la quitan los cohetes y las bombas';
      if (o && o.caged) return 'Jaula: combina a su lado para abrirla';
      if (o && XOBS[o.kind]) return XOBS[o.kind].text;
      if (S.bub && S.bub[r][c] && (!o || o.kind === 'cube')) return 'Burbuja: haz una combinación encima para quitarla';
      return o ? DESC[o.kind] || null : null;
    };
    // potenciadores de inicio: especiales colocados en cubos al azar antes de empezar
    P.startBonus = function (list, rnd) {
      for (const id of list) {
        const opts = [];
        for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) { const o = cell(S, r, c); if (o && o.kind === 'cube' && !o.caged) opts.push([r, c]); }
        if (!opts.length) return;
        const [r, c] = opts[rnd.int(opts.length)], col = S.grid[r][c].color;
        S.grid[r][c] = id === 'rocket' ? { id: uid++, kind: 'rocket', dir: rnd() < 0.5 ? 'h' : 'v' } : id === 'bomb' ? { id: uid++, kind: 'bomb' } : id === 'disco' ? { id: uid++, kind: 'disco', color: col } : S.grid[r][c];
      }
    };
    P.hint = function () {
      let best = null;
      const seen = new Set();
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const o = cell(S, r, c);
        if (!o || seen.has(o)) continue;
        if (isSpecial(o)) { if (!best || best.length < 99) best = [[r, c]]; best.length = 1; best.sp = true; continue; }
        if (o.kind !== 'cube') continue;
        const g = group(S, r, c);
        g.forEach(([rr, cc]) => seen.add(S.grid[rr][cc]));
        if (g.length >= 2 && (!best || (!best.sp && g.length > best.length))) best = g;
      }
      if (!best) return;
      hintTiles = { tiles: best.map(([r, c]) => S.grid[r][c]), t: 0 };
    };

    function updateHints() {
      const seen = new Set();
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const o = cell(S, r, c);
        if (!o || o.kind !== 'cube' || seen.has(o)) continue;
        const g = group(S, r, c);
        const k = g.length >= 9 ? 'disco' : g.length >= 7 ? 'bomb' : g.length >= 5 ? 'rocket' : null;
        g.forEach(([rr, cc]) => { const t = S.grid[rr][cc]; seen.add(t); t.hintK = k; });
      }
    }

    P.update = function (dt) {
      if (hold > 0) hold -= dt;
      for (const [k, v] of bubAnim) { const nv = v + dt; if (nv > 0.4) bubAnim.delete(k); else bubAnim.set(k, nv); }
      let moving = false;
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const t = S.grid[r][c];
        if (!t) continue;
        if (t.big && (r !== t.r0 || c !== t.c0)) continue; // las piezas de 2x2 se mueven desde su esquina
        if (t.hidden > 0) { t.hidden -= dt; continue; }
        const tx = cx(c) + (t.big ? ts / 2 : 0), ty = cy(r) + (t.big ? ts / 2 : 0);
        if (t.x == null) { t.x = tx; t.y = ty; }
        if (t.delay > 0) { t.delay -= dt; moving = true; continue; }
        if (Math.abs(t.x - tx) > 0.5) { t.x += (tx - t.x) * Math.min(1, dt * 14); moving = true; } else t.x = tx;
        if (t.y < ty - 0.5) {
          t.vy = (t.vy || 0) + 3200 * dt;
          t.y += t.vy * dt;
          moving = true;
          if (t.y >= ty) {
            t.y = ty;
            if (t.vy > 500) { t.sq = 1; E.tween(t, { sq: 0 }, 0.18); }
            t.vy = 0;
          }
        } else if (t.y > ty) { t.y = ty; t.vy = 0; }
      }
      for (let i = dying.length - 1; i >= 0; i--) {
        const d = dying[i];
        if (d.m && d.m.mode === 'duck' && d.age === 0) {
          // el patito sigue cayendo hasta el fondo antes de desaparecer
          const t = d.t, ty = cy(d.m.r);
          if (t.y < ty) { t.vy = (t.vy || 0) + 3200 * dt; t.y = Math.min(ty, t.y + t.vy * dt); }
        }
        if (d.delay > 0) { d.delay -= dt; continue; }
        if (d.age === 0) startDeath(d);
        d.age += dt;
        if (d.age > 0.3) dying.splice(i, 1);
      }
      for (let i = fxs.length - 1; i >= 0; i--) {
        const f = fxs[i];
        if (f.delay > 0) { f.delay -= dt; continue; }
        if (f.age === 0) startFx(f);
        f.age += dt;
        if (f.age > 0.6) fxs.splice(i, 1);
      }
      const was = P.busy;
      P.busy = moving || dying.length > 0 || hold > 0 || !!P.finaleOn;
      if (was && !P.busy) updateHints();
      if (hintTiles) hintTiles.t += dt;
    };
    function startDeath(d) {
      const t = d.t;
      d.x = t.x; d.y = t.y;
      if (d.m && d.m.mode === 'merge') {
        d.age = 0.0001;
        E.tween(d, { x: cx(d.m.c), y: cy(d.m.r) }, 0.2, { ease: E.ease.inQuad });
        return;
      }
      d.age = 0.0001;
      if (t.kind === 'cube') E.burst(t.x, t.y, [COLORS[t.color], E.shade(COLORS[t.color], 0.4)], 7, { size: 11 });
      else if (t.kind === 'box') { E.burst(t.x, t.y, ['#8a5a2b', '#c98b48', '#e0b07a'], 10, { size: 12 }); E.sfx('land', 1.2); }
      else if (t.kind === 'balloon') { E.burst(t.x, t.y, ['#ff4d4d', '#ffffff'], 10, { size: 9 }); E.sfx('pop', 1.6); }
      else if (t.kind === 'duck') { E.floatText(t.x, t.y - 20, '¡Bien!', '#ffe14d', 36); E.sfx('rescue'); }
      else if (t.kind === 'egg') { E.burst(t.x, t.y, ['#fffdf4', '#e9d9b8', '#f2a33a'], 12, { size: 10 }); E.sfx('pop', 1.3); }
      else if (t.kind === 'ball') { E.burst(t.x, t.y, COLORS.slice(0, 4), 14, { size: 10 }); E.sfx('pop', 1.5); }
      else if (t.kind === 'pumpkin') { E.burst(t.x, t.y, ['#ff9f1c', '#e86a00', '#3d8b2f'], 14, { size: 11 }); E.sfx('pop', 1.1); }
      else if (t.kind === 'piggy' || t.kind === 'stone') { E.burst(t.x, t.y, ['#9aa6b2', '#ffb3c7', '#5f6b77'], 14, { size: 11 }); E.sfx('bomb', 1.3); }
      else if (t.kind === 'ufo') { E.burst(t.x, t.y, ['#7fe3ff', '#c0c8d2', '#ffe14d'], 14, { size: 10 }); E.sfx('magic', 1.4); }
      else if (t.kind === 'gum') { E.burst(t.x, t.y, ['#ff8cc6', '#e05aa3'], 12, { size: 10 }); E.sfx('pop', 1.4); }
      else if (t.kind === 'crate' || t.kind === 'cuckoo' || t.kind === 'pinwheel') { E.burst(t.x, t.y, ['#c98b48', '#ffd23f', '#fff'], 14, { size: 11 }); E.sfx('bomb', 1.2); }
      else if (t.kind === 'bomb') { E.burst(t.x, t.y, ['#ff9f1c', '#ffd23f', '#555'], 18, { size: 14, speed: 400 }); E.shake(0.3); }
    }
    function startFx(f) {
      if (f.type === 'bomb') E.sfx('bomb');
      if (f.type === 'rocket') E.sfx('rocket');
      if (f.type === 'disco') E.sfx('magic');
    }

    P.draw = function (g) {
      // fondo del tablero
      g.save();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let c = 0; c < S.C; c++) {
        if (S.top[c] >= S.R) continue;
        E.rr(g, bx + c * ts - 6, by + S.top[c] * ts - 6, ts + 12, (S.R - S.top[c]) * ts + 12, 14);
        g.fill();
      }
      g.fillStyle = 'rgba(20,45,80,0.82)';
      for (let c = 0; c < S.C; c++) {
        if (S.top[c] >= S.R) continue;
        E.rr(g, bx + c * ts - 1, by + S.top[c] * ts - 1, ts + 2, (S.R - S.top[c]) * ts + 2, 10);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (r >= S.top[c] && (r + c) % 2) g.fillRect(bx + c * ts, by + r * ts, ts, ts);
      // tierra (capa de la casilla)
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (S.dirt[r][c] > 0) { g.fillStyle = S.dirt[r][c] > 1 ? 'rgba(90,55,25,0.95)' : 'rgba(140,95,50,0.9)'; g.fillRect(bx + c * ts + 2, by + r * ts + 2, ts - 4, ts - 4); }
      // recorte para que las piezas nuevas aparezcan desde el borde
      g.beginPath();
      for (let c = 0; c < S.C; c++) g.rect(bx + c * ts - 2, by + S.top[c] * ts - 2, ts + 4, (S.R - S.top[c]) * ts + 4);
      g.clip();
      const hset = hintTiles && hintTiles.t > 0 ? new Set(hintTiles.tiles) : null;
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        const t = S.grid[r][c];
        if (!t || t.x == null || t.hidden > 0) continue;
        if (t.big) { if (r === t.r0 && c === t.c0) drawTile(g, t, t.x, t.y, ts * 2); continue; }
        if (hset && hset.has(t)) {
          const k = 1 + Math.abs(Math.sin(hintTiles.t * 5)) * 0.12;
          const old = t.sc; t.sc = (old == null ? 1 : old) * k;
          drawTile(g, t, t.x, t.y, ts);
          t.sc = old;
        } else drawTile(g, t, t.x, t.y, ts);
      }
      // capa de burbujas (es de la casilla: no cae con los cubos)
      for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
        if (!S.bub[r][c]) continue;
        const a = bubAnim.get(r * 64 + c);
        let k = 1 + Math.sin(E.t * 2.5 + r + c) * 0.03;
        if (a != null) { if (a < 0) continue; k *= Math.min(1, a / 0.3); }
        const bs = ts * 1.04 * k;
        g.drawImage(bubbleOverlay(ts), cx(c) - bs / 2, cy(r) - bs / 2, bs, bs);
      }
      g.restore();
      // piezas que desaparecen
      for (const d of dying) {
        if (d.age <= 0) { if (d.t.x != null) drawTile(g, d.t, d.t.x, d.t.y, ts); continue; }
        const k = Math.min(1, d.age / 0.25);
        const t = d.t;
        if (d.m && d.m.mode === 'merge') { const o = t.sc; t.sc = 1 - k * 0.5; drawTile(g, t, d.x, d.y, ts); t.sc = o; continue; }
        if (t.kind === 'duck') { const o = t.sc; t.sc = 1 + k * 0.5; t.alpha = 1 - k; drawTile(g, t, d.x, d.y - k * 60, ts); t.sc = o; t.alpha = 1; continue; }
        const o = t.sc; t.sc = 1 + k * 0.3; t.alpha = 1 - k;
        drawTile(g, t, d.x, d.y, ts);
        t.sc = o; t.alpha = 1;
      }
      // efectos
      for (const f of fxs) {
        if (f.delay > 0) continue;
        const k = Math.min(1, f.age / 0.5);
        const x0 = cx(f.c), y0 = cy(f.r);
        g.save();
        if (f.type === 'rocket') {
          const dist = k * Math.max(S.R, S.C) * ts * 1.2;
          const s = ts * 0.8;
          g.globalAlpha = 1 - k * 0.3;
          g.fillStyle = 'rgba(255,240,180,0.6)';
          if (f.dir === 'h') {
            g.fillRect(x0 - dist, y0 - ts * 0.15, dist * 2, ts * 0.3);
            g.translate(x0 + dist, y0); g.rotate(Math.PI / 4); g.drawImage(E.emojiSprite('🚀', s), -s / 2, -s / 2, s, s);
            g.setTransform(1, 0, 0, 1, 0, 0); g.restore(); g.save();
            g.translate(x0 - dist, y0); g.rotate(-Math.PI * 3 / 4); g.drawImage(E.emojiSprite('🚀', s), -s / 2, -s / 2, s, s);
          } else {
            g.fillRect(x0 - ts * 0.15, y0 - dist, ts * 0.3, dist * 2);
            g.translate(x0, y0 - dist); g.rotate(-Math.PI / 4); g.drawImage(E.emojiSprite('🚀', s), -s / 2, -s / 2, s, s);
            g.restore(); g.save();
            g.translate(x0, y0 + dist); g.rotate(Math.PI * 3 / 4); g.drawImage(E.emojiSprite('🚀', s), -s / 2, -s / 2, s, s);
          }
        } else if (f.type === 'bomb') {
          g.globalAlpha = 1 - k;
          g.beginPath(); g.arc(x0, y0, ts * (0.5 + k * (f.rad + 0.5)), 0, 7);
          g.fillStyle = 'rgba(255,220,120,0.6)'; g.fill();
          g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke();
        } else if (f.type === 'disco') {
          g.globalAlpha = 1 - k * 0.8;
          g.strokeStyle = '#fff'; g.lineWidth = 4;
          g.shadowColor = COLORS[f.color]; g.shadowBlur = 12;
          for (const [rr, cc] of f.targets) {
            const kk = Math.min(1, k * 2.5);
            g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (cx(cc) - x0) * kk, y0 + (cy(rr) - y0) * kk); g.stroke();
          }
        }
        g.restore();
      }
    };

    // al ganar, los movimientos que sobran se convierten en cohetes
    P.finale = function (done) {
      const left = Math.min(P.moves, 8);
      if (left <= 0) { done(); return; }
      P.finaleOn = true;
      E.floatText(E.W / 2, by + ts * 2, '¡Movimientos extra!', '#ffe14d', 46);
      let i = 0;
      const step = () => {
        if (i >= left) { E.after(0.8, () => { P.finaleOn = false; done(); }); return; }
        i++;
        const cand = all().filter(([t]) => t.kind === 'cube');
        if (!cand.length) { i = left; step(); return; }
        const [t, r, c] = cand[(Math.random() * cand.length) | 0];
        const sp = { id: uid++, kind: 'rocket', dir: Math.random() < 0.5 ? 'h' : 'v', x: t.x, y: t.y, vy: 0 };
        S.grid[r][c] = null;
        activate(S, sp, r, c, 0.05, K);
        settle(S, K);
        afterAction();
        E.after(0.45, step);
      };
      step();
    };
    return P;
  };
})();
