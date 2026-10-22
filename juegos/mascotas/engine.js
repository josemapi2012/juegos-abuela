'use strict';
// Motor común para los juegos de la abuela: pantalla, mapa, ventanas, sonido, guardado.
// Cada juego define un objeto global GAME antes de cargar este archivo.

const E = {};
(function () {
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  E.ctx = ctx;
  E.W = 600;
  E.H = 960;
  E.t = 0;

  // ---------------------------------------------------------------- utilidades
  E.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (n) => Math.floor(f() * n);
    f.range = (a, b) => a + Math.floor(f() * (b - a + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    };
    return f;
  };
  E.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  E.lerp = (a, b, t) => a + (b - a) * t;
  E.ease = {
    linear: (t) => t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inQuad: (t) => t * t,
    outBack: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  };

  // Curva de dificultad 0..1 con dientes de sierra: cada 10 niveles uno más duro y luego uno de respiro.
  E.difficulty = function (n) {
    const base = 1 - Math.exp(-(n - 1) / 70);
    const k = n % 10;
    let bump = 0;
    if (k === 0) bump = n % 30 === 0 ? 0.2 : 0.12; // el superdifícil (cada 30) aprieta más
    else if (k === 1 || k === 2) bump = -0.1;
    else if (k === 5) bump = 0.05;
    return E.clamp(base * 0.85 + bump, 0, 1);
  };
  // 0 normal, 1 difícil, 2 superdifícil (cada juego puede tener su patrón: Toy Blast marca el 6 y el 10 de cada 10)
  E.hardness = (n) => (typeof GAME !== 'undefined' && GAME.hardness ? GAME.hardness(n) : n > 8 && n % 10 === 0 ? (n % 30 === 0 ? 2 : 1) : 0);
  E.isHard = (n) => E.hardness(n) > 0;

  // ---------------------------------------------------------------- pantalla
  let dpr = 1;
  E.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // en pantallas apaisadas (ordenador) el juego se dibuja en vertical y centrado, como en la tablet
    const cw = Math.min(window.innerWidth, Math.round(window.innerHeight * 0.625)); // 600×960, como la tablet
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    cv.style.width = cw + 'px';
    cv.style.height = window.innerHeight + 'px';
    cv.style.marginLeft = Math.max(0, Math.floor((window.innerWidth - cw) / 2)) + 'px';
    if (cw < window.innerWidth) document.body.style.background = 'linear-gradient(' + GAME.theme.bg[0] + ',' + GAME.theme.bg[1] + ')';
    E.scale = cv.width / E.W;
    E.H = cv.height / E.scale;
    spriteCache.clear();
    if (E.screen && E.screen.resize) E.screen.resize();
  };

  // ---------------------------------------------------------------- sprites
  const spriteCache = new Map();
  // ---------------------------------------------------------------- estilo gráfico
  // 'baja' (el dibujo sencillo de siempre), 'nueva' (estilo propio) u 'original' (como el juego original).
  // Cada juego trae sus estilos en skins.js: GAME.skins = { nueva: {...}, original: {...} }; cada clave
  // sustituye una parte del dibujo y lo que un estilo no trae se dibuja como en 'baja'.
  const GFX_OFF = ['nueva']; // el patio andaluz queda guardado pero no se ofrece (decisión del 22/10/2026)
  // un estilo con imágenes (skin.images) solo se ofrece si están en el aparato (van dentro del APK, nunca por internet)
  E.gfxList = () => ['baja'].concat(Object.keys(GAME.skins || {}).filter((k) => !GFX_OFF.includes(k) && (!GAME.skins[k].images || GAME.skins[k].ready)));
  const imgs = {};
  E.img = (name) => imgs[name];
  function loadSkinImages() {
    const base = location.protocol === 'file:' ? 'file:///android_asset/privado/' : 'privado/';
    for (const [k, sk] of Object.entries(GAME.skins || {})) {
      if (!sk.images) continue;
      const names = sk.images; let left = names.length, bad = false;
      for (const n of names) {
        const im = new Image();
        im.onload = () => { imgs[n] = im; if (--left === 0 && !bad) { sk.ready = true; if (E.wantGfx === k) E.setGfx(k); } };
        im.onerror = () => { bad = true; };
        im.src = base + n + '.png';
      }
    }
  }
  E.gfx = 'baja';
  E.skin = (name) => { const sk = GAME.skins && GAME.skins[E.gfx]; return (sk && sk[name]) || null; };
  let baseTheme = null;
  E.setGfx = function (v) {
    if (!E.gfxList().includes(v)) v = 'baja';
    E.gfx = v;
    if (!baseTheme) baseTheme = Object.assign({}, GAME.theme);
    GAME.theme = Object.assign({}, baseTheme, (GAME.skins && GAME.skins[v] && GAME.skins[v].theme) || {});
    spriteCache.clear();
    const init = E.skin('init'); if (init) init();
  };
  E.sprite = function (key, w, h, draw) {
    key = E.gfx + ':' + key;
    const pw = Math.max(1, Math.ceil(w * E.scale));
    const ph = Math.max(1, Math.ceil(h * E.scale));
    const k = key + '@' + pw + 'x' + ph;
    let c = spriteCache.get(k);
    if (!c) {
      c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      const g = c.getContext('2d');
      g.scale(pw / w, ph / h);
      draw(g, w, h);
      spriteCache.set(k, c);
    }
    return c;
  };
  E.emojiSprite = function (ch, size) {
    const s = Math.max(8, Math.round(size / 4) * 4);
    // un estilo gráfico puede cambiar algunos emojis por dibujos propios (p. ej. los especiales del juego)
    const ske = E.skin('emoji');
    if (ske && ske[ch]) return E.sprite('emo:' + ch, s, s, ske[ch]);
    return E.sprite('emo:' + ch, s, s, (g, w, h) => {
      g.font = Math.floor(h * 0.8) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(ch, w / 2, h * 0.56);
    });
  };
  E.emoji = function (g, ch, x, y, size) {
    g.drawImage(E.emojiSprite(ch, size), x - size / 2, y - size / 2, size, size);
  };

  // ---------------------------------------------------------------- dibujo
  E.rr = function (g, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  E.shade = function (hex, amt) {
    // amt -1..1 oscurece o aclara
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    let r = parseInt(c.substr(0, 2), 16), gg = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    if (amt >= 0) { r += (255 - r) * amt; gg += (255 - gg) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; gg *= 1 + amt; b *= 1 + amt; }
    return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
  };
  E.font = (size, weight) => (weight || '900') + ' ' + Math.round(size) + 'px "Arial Rounded MT Bold","Roboto","Helvetica Neue",Arial,sans-serif';
  E.text = function (g, str, x, y, size, color, opt) {
    opt = opt || {};
    g.font = E.font(size, opt.weight);
    g.textAlign = opt.align || 'center';
    g.textBaseline = opt.baseline || 'middle';
    if (opt.stroke !== false) {
      g.lineJoin = 'round';
      g.lineWidth = opt.sw || Math.max(2, size * 0.2);
      g.strokeStyle = opt.stroke || 'rgba(60,30,10,0.75)';
      g.strokeText(str, x, y);
    }
    g.fillStyle = color || '#fff';
    g.fillText(str, x, y);
  };
  // Texto en varias líneas que cabe en un ancho máximo
  E.wrapText = function (g, str, x, y, maxW, size, color, opt) {
    if (E.save && E.save.big) size = Math.round(size * 1.18); // opción de letra grande
    g.font = E.font(size, (opt && opt.weight) || '800');
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    const lh = size * 1.2;
    lines.forEach((l, i) => E.text(g, l, x, y + (i - (lines.length - 1) / 2) * lh, size, color, Object.assign({ weight: '800' }, opt)));
  };
  E.panel = function (g, x, y, w, h, opt) {
    opt = opt || {};
    const sk = E.skin('panel'); if (sk) { sk(g, x, y, w, h, opt); return; }
    const r = opt.r || 22;
    // sombra sólida (las sombras difuminadas son lentas en la tablet)
    E.rr(g, x + 2, y + 6, w, h, r);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fill();
    E.rr(g, x, y, w, h, r);
    g.fillStyle = opt.border || '#7a4b1f';
    g.fill();
    E.rr(g, x + 5, y + 5, w - 10, h - 10, r - 4);
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, opt.top || '#fff6dc');
    gr.addColorStop(1, opt.bottom || '#f5dfae');
    g.fillStyle = gr;
    g.fill();
  };
  E.star = function (g, x, y, r, fill, stroke) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.48 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) { g.lineWidth = r * 0.14; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); }
  };

  // ---------------------------------------------------------------- botones (modo inmediato)
  let btns = [], prevBtns = [];
  let pressed = null;
  E.hitBtn = function (id) { return pressed && pressed.id === id; };
  E.button = function (id, x, y, w, h, label, opt) {
    opt = opt || {};
    const color = opt.color || '#3cb93c';
    const down = pressed && pressed.id === id;
    const oy = down ? 4 : 0;
    const g = ctx;
    g.save();
    if (opt.alpha != null) g.globalAlpha = opt.alpha;
    const r = opt.r != null ? opt.r : h / 2.4;
    const skb = E.skin('button');
    if (skb) {
      skb(g, x, y, w, h, color, down, r, opt);
      if (opt.draw) opt.draw(g, x, y + oy, w, h - 6);
      if (label) E.text(g, label, x + w / 2, y + oy + (h - 6) / 2 + 1, opt.size || h * 0.42, '#fff', { stroke: E.shade(color, -0.5) });
      g.restore();
      btns.push({ id, x, y, w, h, cb: opt.cb, sound: opt.sound !== false });
      return;
    }
    if (!down) {
      E.rr(g, x + 1, y + 10, w, h - 6, r);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fill();
    }
    E.rr(g, x, y + 6, w, h - 6, r);
    g.fillStyle = E.shade(color, -0.35);
    g.fill();
    E.rr(g, x, y + oy, w, h - 6, r);
    const gr = g.createLinearGradient(0, y + oy, 0, y + oy + h - 6);
    gr.addColorStop(0, E.shade(color, 0.25));
    gr.addColorStop(1, color);
    g.fillStyle = gr;
    g.fill();
    E.rr(g, x + w * 0.06, y + oy + 4, w * 0.88, (h - 6) * 0.38, r * 0.7);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fill();
    if (opt.draw) opt.draw(g, x, y + oy, w, h - 6);
    if (label) E.text(g, label, x + w / 2, y + oy + (h - 6) / 2 + 1, opt.size || h * 0.42, '#fff', { stroke: E.shade(color, -0.5) });
    g.restore();
    btns.push({ id, x, y, w, h, cb: opt.cb, sound: opt.sound !== false });
  };
  // Zona táctil invisible
  E.hotspot = function (id, x, y, w, h, cb) { btns.push({ id, x, y, w, h, cb, sound: true }); };

  function findBtn(x, y) {
    for (let i = prevBtns.length - 1; i >= 0; i--) {
      const b = prevBtns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  // ---------------------------------------------------------------- animaciones
  const tweens = [];
  E.tween = function (o, props, dur, opt) {
    opt = opt || {};
    const t = { o, to: props, from: {}, dur: Math.max(0.0001, dur), t: -(opt.delay || 0), ease: opt.ease || E.ease.outQuad, done: opt.done, started: false };
    tweens.push(t);
    return t;
  };
  E.killTweens = function (o) {
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].o === o) tweens.splice(i, 1);
  };
  const timers = [];
  E.after = function (sec, fn) { timers.push({ t: sec, fn }); };
  E.clearTimers = function () { timers.length = 0; };

  // ---------------------------------------------------------------- partículas
  const parts = [];
  E.burst = function (x, y, color, n, opt) {
    opt = opt || {};
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opt.speed || 260) * (0.4 + Math.random() * 0.8);
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 120),
        life: 0, max: (opt.life || 0.7) * (0.7 + Math.random() * 0.6),
        size: (opt.size || 9) * (0.6 + Math.random() * 0.8),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
        shape: opt.shape || 'sq', grav: opt.grav != null ? opt.grav : 900,
      });
    }
  };
  E.floatText = function (x, y, str, color, size) {
    parts.push({ x, y, vx: 0, vy: -90, life: 0, max: E.save && E.save.big ? 1.6 : 1.1, text: str, color: color || '#fff', size: (size || 34) * (E.save && E.save.big ? 1.15 : 1), grav: 0, rot: 0, vr: 0 });
  };
  function drawParts(g, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = 1 - p.life / p.max;
      g.save();
      g.globalAlpha = Math.min(1, k * 1.6);
      if (p.text) {
        E.text(g, p.text, p.x, p.y, p.size, p.color);
      } else {
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = p.color;
        const s = p.size * (0.4 + 0.6 * k);
        if (p.shape === 'star') E.star(g, 0, 0, s, p.color);
        else if (p.shape === 'circle') { g.beginPath(); g.arc(0, 0, s / 2, 0, 7); g.fill(); }
        else g.fillRect(-s / 2, -s / 2, s, s * 0.7);
      }
      g.restore();
    }
  }
  E.confetti = function () {
    const cols = ['#ff4d4d', '#ffd23f', '#3fa7ff', '#4cd964', '#c86bff', '#ff9f1c'];
    for (let i = 0; i < 90; i++) {
      parts.push({
        x: Math.random() * E.W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 120, vy: 150 + Math.random() * 200,
        life: 0, max: 3 + Math.random(), size: 12 + Math.random() * 8, color: cols[i % cols.length],
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, shape: 'sq', grav: 60,
      });
    }
  };
  E.shakeT = 0;
  E.shake = function (amt) { E.shakeT = Math.max(E.shakeT, amt || 0.25); };

  // ---------------------------------------------------------------- sonido (sintetizado, sin archivos)
  let ac = null, master = null, noiseBuf = null;
  function ensureAudio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = 0.6;
        master.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(type, f1, f2, dur, vol, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, f1, f2, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(f1, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }
  // sonido en tres niveles: 2 alto, 1 bajo, 0 sin sonido
  E.vol = () => (E.save.vol != null ? E.save.vol : E.save.sound ? 2 : 0);
  E.cycleSound = function () { E.save.vol = (E.vol() + 2) % 3; E.save.sound = E.save.vol > 0; E.persist(); if (master) master.gain.value = [0, 0.22, 0.6][E.save.vol]; E.sfx('click'); };
  E.soundIcon = () => ['🔇', '🔉', '🔊'][E.vol()];
  E.sfx = function (name, p) {
    if (!E.vol() || !ac || E.fast) return;
    master.gain.value = [0, 0.22, 0.6][E.vol()];
    p = p || 1;
    try {
      switch (name) {
        case 'click': tone('sine', 700, 900, 0.07, 0.25); break;
        case 'pop': tone('sine', 420 * p, 880 * p, 0.12, 0.35); tone('triangle', 900 * p, 500 * p, 0.08, 0.12, 0.02); break;
        case 'swap': tone('sine', 500, 650, 0.1, 0.2); break;
        case 'bad': tone('square', 220, 160, 0.16, 0.12); break;
        case 'land': tone('sine', 300 * p, 250 * p, 0.05, 0.08); break;
        case 'rocket': noise(0.5, 0.35, 3000, 400); tone('sawtooth', 300, 1200, 0.35, 0.06); break;
        case 'bomb': noise(0.7, 0.6, 1200, 60); tone('sine', 120, 40, 0.5, 0.5); break;
        case 'magic': for (let i = 0; i < 6; i++) tone('sine', 600 + i * 180, 900 + i * 180, 0.15, 0.15, i * 0.05); break;
        case 'collect': tone('sine', 880 * p, 1320 * p, 0.12, 0.2); break;
        case 'special': tone('triangle', 500, 1000, 0.25, 0.25); tone('sine', 750, 1500, 0.25, 0.15, 0.08); break;
        case 'shoot': tone('sine', 300, 600, 0.12, 0.25); noise(0.1, 0.15, 2000, 500); break;
        case 'rescue': [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f * 1.01, 0.18, 0.22, i * 0.08)); break;
        case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.25, 0.25, i * 0.12)); break;
        case 'lose': [440, 392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.3, 0.2, i * 0.18)); break;
        case 'star': tone('sine', 1000 * p, 1600 * p, 0.2, 0.25); break;
      }
    } catch (e) { /* audio no disponible */ }
  };

  // leer en voz alta los textos de ayuda (voz del sistema, sin conexión)
  E.say = function (text) {
    if (!E.save.voice || !text || E.fast) return;
    const t = String(text).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '');
    try {
      if (window.AndroidVoice && window.AndroidVoice.ok()) { window.AndroidVoice.speak(t); return; }
      if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    } catch (e) { /* sin voz */ }
  };

  // ---------------------------------------------------------------- guardado
  const KEY = 'abuela_' + GAME.id;
  const native = window.AndroidSave || null; // en la tablet guarda al instante en Android
  E.save = { level: 1, stars: {}, sound: true, streak: 0, chest: 0, inv: {} };
  try {
    const raw = (native && native.get(KEY)) || localStorage.getItem(KEY);
    if (raw) Object.assign(E.save, JSON.parse(raw));
  } catch (e) { /* sin datos guardados */ }
  E.save.inv = E.save.inv || {};
  if (!E.save.binv) { E.save.binv = {}; for (const b of GAME.boosters || []) E.save.binv[b.id] = 3; } E.save.streak = E.save.streak || 0; E.save.chest = E.save.chest || 0;
  E.save.stats = Object.assign({ wins: 0, goals: {}, days: {}, bestStreak: 0 }, E.save.stats || {});
  E.save.ach = E.save.ach || {};
  E.today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  E.save.stats.days[E.today()] = 1;
  E.persist = function () {
    const data = JSON.stringify(E.save);
    try { if (native) native.set(KEY, data); } catch (e) { /* sin guardado nativo */ }
    try { localStorage.setItem(KEY, data); } catch (e) { /* sin guardado */ }
  };

  // ---------------------------------------------------------------- ventanas emergentes
  E.popup = null;
  E.openPopup = function (p) {
    p.anim = 0;
    E.popup = p;
    E.tween(p, { anim: 1 }, 0.35, { ease: E.ease.outBack });
  };
  E.closePopup = function (cb) {
    const p = E.popup;
    if (!p) { if (cb) cb(); return; }
    p.closing = true;
    E.tween(p, { anim: 0 }, 0.18, { ease: E.ease.inQuad, done: () => { if (E.popup === p) E.popup = null; if (cb) cb(); } });
  };
  function drawPopup(g) {
    const p = E.popup;
    g.save();
    g.fillStyle = 'rgba(0,0,0,' + (0.5 * Math.min(1, p.anim)) + ')';
    g.fillRect(0, 0, E.W, E.H);
    const s = Math.max(0.01, p.anim);
    g.translate(E.W / 2, E.H / 2);
    g.scale(s, s);
    g.translate(-E.W / 2, -E.H / 2);
    p.draw(g);
    g.restore();
  }

  // ---------------------------------------------------------------- objetivos (iconos comunes)
  E.drawGoalBox = function (g, goals, x, y, w, h) {
    const n = goals.length;
    const cols = n <= 2 ? n : 2;
    const rows = Math.ceil(n / cols);
    const cw = w / cols, ch = h / rows;
    const sz = Math.min(cw * 0.5, ch * 0.72, 64);
    goals.forEach((gl, i) => {
      const cx = x + (i % cols) * cw + cw * 0.38;
      const cy = y + Math.floor(i / cols) * ch + ch / 2;
      GAME.drawGoalIcon(g, gl, cx, cy, sz);
      if (gl.left <= 0) {
        g.beginPath(); g.arc(cx + sz * 0.55, cy + sz * 0.3, sz * 0.3, 0, 7);
        g.fillStyle = '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
        g.beginPath();
        g.moveTo(cx + sz * 0.42, cy + sz * 0.3); g.lineTo(cx + sz * 0.52, cy + sz * 0.42); g.lineTo(cx + sz * 0.7, cy + sz * 0.18);
        g.lineWidth = 4; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.stroke();
      } else {
        E.text(g, String(gl.left), cx + sz * 0.62, cy + sz * 0.32, Math.max(22, sz * 0.5), '#fff');
      }
    });
  };

  // ---------------------------------------------------------------- pantalla del mapa
  const NODE_GAP = 118;
  const mapS = { scroll: 0, vel: 0, drag: null };
  function nodePos(i) {
    return { x: E.W / 2 + Math.sin(i * 0.85) * 150, y: -i * NODE_GAP };
  }
  function mapTargetScroll() { return -nodePos(E.save.level).y - E.H * 0.38; }
  mapS.enter = function () { mapS.scroll = mapTargetScroll(); mapS.vel = 0; };
  mapS.resize = function () { mapS.scroll = mapTargetScroll(); };
  mapS.down = function (x, y) { mapS.drag = { x, y, sy: mapS.scroll, moved: 0, lastY: y, t: E.t }; mapS.vel = 0; };
  mapS.move = function (x, y) {
    const d = mapS.drag; if (!d) return;
    const dy = y - d.lastY;
    d.moved += Math.abs(dy);
    mapS.scroll += dy;
    mapS.vel = dy / Math.max(0.016, E.t - d.t);
    d.lastY = y; d.t = E.t;
  };
  mapS.up = function (x, y) {
    const d = mapS.drag; mapS.drag = null;
    if (!d || d.moved > 14) return;
    mapS.vel = 0;
    for (let i = Math.max(1, E.save.level - 12); i <= E.save.level + 12; i++) {
      const p = nodePos(i);
      const sy = p.y + mapS.scroll + E.H;
      if (Math.hypot(x - p.x, y - sy) < 52 && i <= E.save.level) { E.sfx('click'); openPreLevel(i); return; }
    }
  };
  function mapBg(g, top) {
    const sk = E.skin('mapBg'); if (sk) { sk(g, top, NODE_GAP * WORLD); return; }
    // Fondo que cambia de color por "zonas" de 20 niveles
    const th = GAME.theme;
    const zoneH = NODE_GAP * 20;
    const z0 = Math.floor(top / zoneH); // zona que hay arriba en pantalla (las zonas suben con el nivel)
    for (let z = z0 - 1; z <= z0 + 1; z++) {
      const zy = -z * zoneH - zoneH + top + E.H; // parte superior de la zona en pantalla
      const zi = Math.max(0, z);
      const pal = th.zones[zi % th.zones.length];
      const gr = g.createLinearGradient(0, zy, 0, zy + zoneH);
      gr.addColorStop(0, pal[0]); gr.addColorStop(0.5, pal[1]); gr.addColorStop(1, pal[0]);
      g.fillStyle = gr;
      g.fillRect(0, zy, E.W, zoneH + 1);
    }
  }
  mapS.update = function (dt) {
    if (!mapS.drag) {
      mapS.scroll += mapS.vel * dt;
      mapS.vel *= Math.pow(0.04, dt);
      if (Math.abs(mapS.vel) < 5) mapS.vel = 0;
    }
    const minS = -E.H * 0.25 - 40;
    if (mapS.scroll < minS) { mapS.scroll = E.lerp(mapS.scroll, minS, 0.2); }
    const maxS = -nodePos(E.save.level + 10).y;
    if (mapS.scroll > maxS) mapS.scroll = E.lerp(mapS.scroll, maxS, 0.2);
  };
  mapS.draw = function (g) {
    const th = GAME.theme;
    const off = mapS.scroll + E.H;
    mapBg(g, mapS.scroll);
    // decoraciones
    const first = Math.max(0, Math.floor((mapS.scroll - E.H * 0.2) / NODE_GAP) - 2);
    const last = Math.floor((mapS.scroll + E.H * 1.2) / NODE_GAP) + 2;
    for (let i = first; i <= last && !E.skin('mapNoDecor'); i++) {
      const r = E.rng(i * 7919 + 13);
      for (let k = 0; k < 2; k++) {
        const side = (i + k) % 2 ? 1 : -1;
        const x = E.W / 2 + side * (205 + r() * 70);
        const y = -i * NODE_GAP - r() * NODE_GAP + off;
        E.emoji(g, r.pick(th.decor), x, y, 44 + r() * 26);
      }
    }
    // camino
    const skp = E.skin('mapPath');
    if (skp) skp(g, Math.max(1, first), last, (i) => { const p = nodePos(i); return { x: p.x, y: p.y + off }; });
    else {
    g.lineCap = 'round';
    g.lineWidth = 34;
    g.strokeStyle = th.path || 'rgba(255,255,255,0.55)';
    g.beginPath();
    for (let i = Math.max(1, first); i <= last; i++) {
      const p = nodePos(i);
      if (i === Math.max(1, first)) g.moveTo(p.x, p.y + off); else g.lineTo(p.x, p.y + off);
    }
    g.stroke();
    g.lineWidth = 8;
    g.setLineDash([2, 22]);
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.stroke();
    g.setLineDash([]);
    }
    // carteles de los mundos (cada 20 niveles)
    for (let i = Math.max(1, first); i <= last; i++) {
      if ((i - 1) % WORLD !== 0) continue;
      const p = nodePos(i), w = worldOf(i);
      const sx = p.x > E.W / 2 ? p.x - 250 : p.x + 70, sy = p.y + off - 60;
      g.fillStyle = '#7a5230'; g.fillRect(sx + 85, sy + 40, 12, 60);
      E.rr(g, sx, sy - 18, 180, 66, 12); g.fillStyle = '#b07a46'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#7a5230'; g.stroke();
      E.text(g, 'Mundo ' + (w + 1), sx + 90, sy - 2, 20, '#fff', { stroke: '#5a3a1a', sw: 4 });
      E.wrapText(g, E.worldName(w), sx + 90, sy + 24, 172, 18, '#fff8e8', { stroke: '#5a3a1a', sw: 3 });
    }
    // nodos
    for (let i = Math.max(1, first); i <= last; i++) {
      const p = nodePos(i);
      const x = p.x, y = p.y + off;
      const cur = i === E.save.level;
      const done = i < E.save.level;
      const r = cur ? 40 + Math.sin(E.t * 4) * 3 : 32;
      const skn = E.skin('mapNode');
      if (skn) { skn(g, i, x, y, r, cur, done, E.hardness(i), E.save.stars[i] || 1); continue; }
      g.beginPath(); g.arc(x + 1, y + 5, r, 0, 7);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, 7);
      const hd = E.hardness(i);
      const hcol = hd === 2 ? '#5b2a86' : hd === 1 ? '#e0413a' : null; // difícil en rojo y superdifícil en morado oscuro
      g.fillStyle = cur ? th.accent : hcol || (done ? th.node : '#9aa3ad');
      g.fill();
      g.beginPath(); g.arc(x, y, r - 5, 0, 7);
      const gr = g.createLinearGradient(0, y - r, 0, y + r);
      const base = cur ? th.accent : hcol || (done ? th.node : '#b9c0c8');
      gr.addColorStop(0, E.shade(base, 0.35)); gr.addColorStop(1, base);
      g.fillStyle = gr; g.fill();
      g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
      E.text(g, String(i), x, y + 1, i > 999 ? 22 : 27, '#fff', { stroke: 'rgba(0,0,0,0.5)' });
      if (hd && !done) { E.emoji(g, '💀', x + r * 0.8, y - r * 0.8, 28); if (hd === 2) E.emoji(g, '💀', x - r * 0.8, y - r * 0.8, 28); }
      if (done) {
        const st = E.save.stars[i] || 1;
        for (let s = 0; s < 3; s++) E.star(g, x + (s - 1) * 22, y + r + 4 - (s === 1 ? 6 : 0), 11, s < st ? '#ffd23f' : '#d0d0d0', '#a86b00');
      }
      if (cur) E.emoji(g, th.mascot, x - r - 26, y - 6, 54);
    }
    // cabecera
    const skh = E.skin('mapHeader');
    if (skh) skh(g, E.W, 86); else { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, E.W, 86); }
    E.text(g, GAME.title, 16, 44, 25, '#fff', { align: 'left' });
    // cofre de estrellas y racha
    const cx0 = 246;
    E.emoji(g, '🎁', cx0, 43, 36);
    E.rr(g, cx0 + 22, 31, 104, 24, 12); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    E.rr(g, cx0 + 22, 31, 104 * Math.min(1, (E.save.chest || 0) / CHEST), 24, 12); g.fillStyle = '#ffd23f'; g.fill();
    E.text(g, Math.min(CHEST, E.save.chest || 0) + '/' + CHEST + ' ⭐', cx0 + 74, 44, 17, '#5a3a00', { stroke: false });
    if (E.save.streak) E.text(g, '🔥' + E.save.streak, cx0 + 164, 44, 26, '#fff', { stroke: '#c0392b', sw: 5 });
    E.button('ach', E.W - 158, 14, 66, 64, '', {
      color: '#f0a020', r: 18,
      draw: (gg, x, y, w, h) => E.emoji(gg, '🏆', x + w / 2, y + h / 2, 38),
      cb: () => E.openAlbum(),
    });
    E.button('snd', E.W - 84, 14, 66, 64, '', {
      color: '#3f8fd9', r: 18,
      draw: (gg, x, y, w, h) => E.emoji(gg, '⚙️', x + w / 2, y + h / 2, 38),
      cb: () => E.openSettings(),
    });
    // misiones de la semana
    const MS = missionState(), pend = missionList().filter((m) => !MS.done.includes(m.id)).length;
    E.button('missions', 20, E.H - 250, 170, 84, '', {
      color: '#8a5cd6', r: 26,
      draw: (gg, x, y, w, h) => { E.emoji(gg, '📋', x + 38, y + h / 2, 42); E.text(gg, 'Misiones', x + 110, y + h / 2 - 12, 22, '#fff'); E.text(gg, pend ? pend + ' por hacer' : '¡Todas!', x + 110, y + h / 2 + 14, 18, '#fff'); },
      cb: () => E.openMissions(),
    });
    // día especial
    const FI = E.fiesta();
    if (FI) E.button('fiesta', E.W - 216, 100, 200, 80, '', {
      color: FI.done ? '#9aa3ad' : '#e8459a', r: 26,
      draw: (gg, x, y, w, h) => { E.emoji(gg, FI.emoji, x + 42, y + h / 2, 46); E.text(gg, FI.done ? '¡Hecho!' : 'Nivel', x + 135, y + h / 2 - 12, 22, '#fff'); E.text(gg, 'especial', x + 135, y + h / 2 + 14, 20, '#fff'); },
      cb: () => E.openFiesta(),
    });
    // desafío de la semana
    const W2 = E.weekly();
    E.button('weekly', E.W - 200, E.H - 250, 180, 84, '', {
      color: W2.done ? '#9aa3ad' : '#ff8a1f', r: 26,
      draw: (gg, x, y, w, h) => { E.emoji(gg, '🏅', x + 40, y + h / 2, 44); E.text(gg, W2.done ? '¡Hecho!' : 'Desafío', x + 115, y + h / 2 - 12, 22, '#fff'); E.text(gg, 'semanal', x + 115, y + h / 2 + 14, 20, '#fff'); },
      cb: () => E.openWeekly(),
    });
    // botón jugar
    const bw = 380, bh = 104;
    E.button('play', (E.W - bw) / 2, E.H - bh - 34, bw, bh, '¡Jugar! Nivel ' + E.save.level, {
      color: '#3cb93c', size: 38, cb: () => openPreLevel(E.save.level),
    });
  };

  // ---------------------------------------------------------------- antes del nivel
  // ---------------------------------------------------------------- progresión (como en los originales)
  // Mundos de 20 niveles, cofre de estrellas (Toy Blast), racha de victorias y potenciadores de inicio.
  const WORLD = 20, CHEST = 20;
  const worldOf = (n) => Math.floor((n - 1) / WORLD);
  E.worldName = function (w) {
    const names = GAME.theme.worlds || ['Mundo'];
    return names[w % names.length] + (w >= names.length ? ' ' + 'II III IV V VI VII VIII IX X'.split(' ')[Math.min(8, Math.floor(w / names.length) - 1)] : '');
  };
  // lo que da la racha: 1 victoria seguida, 2 y 3 o más
  const streakBonus = () => { const L = GAME.streakBonus || []; const k = Math.min(E.save.streak || 0, L.length); return k ? L[k - 1].slice() : []; };
  // los de dentro del nivel van con 'b:' delante (pueden llamarse igual que uno de inicio)
  const startDef = (id) => id.startsWith('b:') ? (GAME.boosters || []).find((b) => 'b:' + b.id === id) || { icon: '⭐' } : (GAME.startBoosters || []).find((b) => b.id === id) || { icon: '⭐', name: id };
  const giveItem = (id) => { if (id.startsWith('b:')) E.save.binv[id.slice(2)] = (E.save.binv[id.slice(2)] || 0) + 1; else E.save.inv[id] = (E.save.inv[id] || 0) + 1; };
  function giveRandomStart(k) {
    const L = (GAME.startBoosters || []).map((b) => b.id).concat((GAME.boosters || []).map((b) => 'b:' + b.id)); const got = [];
    for (let i = 0; i < k && L.length; i++) { const id = L[(Math.random() * L.length) | 0]; giveItem(id); got.push(startDef(id)); }
    E.persist();
    return got;
  }
  // ventana de premio genérica (cofre, regalo, nuevo mundo…)
  function rewardPopup(title, sub, icons, then, emoji) {
    E.sfx('win');
    E.say(title + '. ' + sub);
    E.confetti();
    E.openPopup({
      draw(g) {
        const w = 520, h = 520, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, title, E.W / 2, y + 70, 46, '#ffd23f', { stroke: '#a85a00', sw: 9 });
        if (emoji) E.emoji(g, emoji, E.W / 2, y + 180, 120 + Math.sin(E.t * 4) * 6);
        E.wrapText(g, sub, E.W / 2, y + (emoji ? 270 : 150), w - 70, 30, '#7a4b1f', { stroke: false });
        (icons || []).forEach((ic, i) => E.emoji(g, ic, E.W / 2 + (i - (icons.length - 1) / 2) * 100, y + 345, 72));
        E.button('rw_ok', x + 90, y + h - 120, w - 180, 96, '¡Estupendo!', { color: '#3cb93c', size: 40, cb: () => E.closePopup(then) });
      },
      back() { E.closePopup(then); },
    });
  }
  // logros: cada escalón alcanzado da un potenciador de inicio
  function achList() {
    const st = E.save.stats, col = GAME.collection;
    const stars = Object.values(E.save.stars).reduce((a, b) => a + b, 0);
    const L = [
      { id: 'wins', name: 'Niveles superados', icon: '🏁', value: st.wins, tiers: [10, 25, 50, 100, 250, 500, 1000, 2000] },
      { id: 'stars', name: 'Estrellas conseguidas', icon: '⭐', value: stars, tiers: [30, 100, 300, 600, 1000, 2000, 4000] },
      { id: 'streak', name: 'Victorias seguidas', icon: '🔥', value: st.bestStreak, tiers: [3, 5, 10, 20, 50] },
      { id: 'days', name: 'Días jugados', icon: '📅', value: Object.keys(st.days).length, tiers: [3, 7, 15, 30, 60, 100, 200, 365] },
    ];
    if (col) L.push({ id: 'col', name: col.label, icon: col.icon, value: st.goals[col.type] || 0, tiers: [25, 100, 250, 500, 1000, 2500, 5000] });
    return L;
  }
  function newAchievements() {
    const got = [];
    for (const a of achList()) {
      let t = E.save.ach[a.id] || 0;
      while (t < a.tiers.length && a.value >= a.tiers[t]) { t++; got.push({ a, target: a.tiers[t - 1] }); }
      E.save.ach[a.id] = t;
    }
    if (got.length) E.persist();
    return got;
  }
  E.openAlbum = function () {
    const L = achList();
    E.openPopup({
      draw(g) {
        const w = 560, h = 210 + L.length * 112, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '🏆 Mis logros', E.W / 2, y + 55, 42, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        L.forEach((a, i) => {
          const yy = y + 105 + i * 112, t = E.save.ach[a.id] || 0, next = a.tiers[Math.min(t, a.tiers.length - 1)];
          E.rr(g, x + 24, yy, w - 48, 98, 18); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
          E.emoji(g, a.icon, x + 70, yy + 49, 54);
          E.text(g, a.name, x + 115, yy + 27, 26, '#5a3a1a', { align: 'left', stroke: false });
          E.text(g, String(a.value), x + w - 50, yy + 27, 26, '#3b6fb6', { align: 'right', stroke: false });
          const pw = w - 210, k = t >= a.tiers.length ? 1 : Math.min(1, a.value / next);
          E.rr(g, x + 115, yy + 52, pw, 22, 11); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fill();
          E.rr(g, x + 115, yy + 52, Math.max(22, pw * k), 22, 11); g.fillStyle = '#3cb93c'; g.fill();
          E.text(g, t >= a.tiers.length ? '¡Completo!' : 'Siguiente: ' + next, x + 115 + pw / 2, yy + 64, 17, '#fff', { stroke: 'rgba(0,0,0,0.4)', sw: 3 });
          for (let m = 0; m < Math.min(t, 8); m++) E.emoji(g, '🏅', x + 115 + m * 26, yy + 88, 20);
        });
        E.button('al_ok', x + 140, y + h - 95, w - 280, 76, 'Volver', { color: '#3cb93c', size: 32, cb: () => E.closePopup() });
      },
      back() { E.closePopup(); },
    });
  };
  // regalo diario: una ruleta con potenciadores de inicio (como la de Candy Crush)
  function dailyWheel(then) {
    const SB = GAME.startBoosters || [];
    if (!SB.length || E.save.gift === E.today()) { if (then) then(); return; }
    const ids = SB.map((b) => b.id), bi = (GAME.boosters || []).map((b) => 'b:' + b.id);
    const bk = (i) => bi[i % bi.length];
    const segs = [[ids[0]], [bk(0)], [ids[1]], [bk(1), bk(2)], [ids[2]], [ids[0], bk(bi.length - 1), ids[1]]];
    const cols = ['#ff7a7a', '#ffd23f', '#7ad7ff', '#9be37b', '#d59bff', '#ffb366'];
    const st = { rot: 0, spinning: false, done: false, prize: null };
    const finish = () => E.closePopup(then);
    E.openPopup({
      draw(g) {
        const w = 540, h = 700, x = (E.W - w) / 2, y = (E.H - h) / 2, cx = E.W / 2, cy = y + 330, R = 200;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '🎁 Regalo del día', cx, y + 55, 40, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        for (let i = 0; i < segs.length; i++) {
          const a0 = st.rot + (i / segs.length) * Math.PI * 2 - Math.PI / 2, a1 = a0 + (Math.PI * 2) / segs.length;
          g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fillStyle = cols[i]; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
          const am = (a0 + a1) / 2;
          segs[i].forEach((id, j) => { const d = R * (0.45 + j * 0.2); E.emoji(g, startDef(id).icon, cx + Math.cos(am) * d, cy + Math.sin(am) * d, 40); });
        }
        g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.fillStyle = '#fff'; g.fill();
        g.beginPath(); g.moveTo(cx - 22, cy - R - 26); g.lineTo(cx + 22, cy - R - 26); g.lineTo(cx, cy - R + 14); g.closePath(); g.fillStyle = '#e8453c'; g.fill();
        if (st.done) {
          E.text(g, '¡Te ha tocado!', cx, y + h - 170, 34, '#d2481f', { stroke: '#fff', sw: 6 });
          E.button('wh_ok', x + 120, y + h - 120, w - 240, 90, '¡Estupendo!', { color: '#3cb93c', size: 36, cb: finish });
        } else if (!st.spinning) {
          E.button('wh_go', x + 120, y + h - 120, w - 240, 90, '¡Girar!', {
            color: '#ff8a1f', size: 40,
            cb: () => {
              st.spinning = true;
              const k = (Math.random() * segs.length) | 0;
              // la casilla k termina arriba, bajo la flecha
              const target = Math.PI * 2 * 5 - ((k + 0.5) / segs.length) * Math.PI * 2;
              E.sfx('magic');
              E.tween(st, { rot: target }, 3.2, { ease: (t) => 1 - Math.pow(1 - t, 3), done: () => {
                st.done = true; st.prize = segs[k];
                for (const id of segs[k]) giveItem(id);
                E.save.gift = E.today(); E.persist();
                E.sfx('win'); E.confetti(); E.say('¡Te ha tocado un regalo!');
              } });
            },
          });
        }
      },
      back() { if (!st.spinning || st.done) finish(); },
    });
  }
  E.dailyWheel = (then) => dailyWheel(then);
  // desafío de la semana: un nivel especial (de los difíciles) que cambia cada lunes; da 3 potenciadores
  const weekNo = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Math.floor(d.getTime() / 6048e5); };
  E.weekly = () => ({ week: weekNo(), n: 5000 + (weekNo() % 1000) * 3, done: E.save.weekDone === weekNo() });
  E.openWeekly = function () {
    const W2 = E.weekly();
    if (W2.done) { rewardPopup('Desafío de la semana', '¡Ya lo has superado esta semana! El lunes habrá uno nuevo.', [], null, '🏅'); return; }
    playS.challenge = W2;
    openPreLevel(W2.n, true);
  };
  // ---------------------------------------------------------------- fechas especiales
  // Su cumpleaños, su santo, visitas… vienen de un calendario de Google: GitHub lo lee cada 6 horas
  // y publica fechas.json; el juego lo descarga al abrirse y lo guarda para cuando no haya wifi.
  E.FECHAS_URL = 'https://josemapi2012.github.io/juegos-abuela/fechas.json';
  E.loadCalendar = function () {
    if (!window.fetch || location.protocol === 'http:') return; // en los robots de prueba, no
    fetch(E.FECHAS_URL + '?t=' + Date.now()).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j && Array.isArray(j.dias) && JSON.stringify(j.dias) !== JSON.stringify(E.save.cal)) { E.save.cal = j.dias; E.persist(); }
    }).catch(() => {});
  };
  function easter(y) { // domingo de Pascua (algoritmo de Gauss/Meeus)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  E.specialDay = function (date) {
    const d = date || new Date(), M = d.getMonth() + 1, D = d.getDate(), Y = d.getFullYear();
    const same = (m, dd) => M === m && D === dd;
    const iso = Y + '-' + String(M).padStart(2, '0') + '-' + String(D).padStart(2, '0');
    const c = (E.save.cal || []).find((x) => x.fecha === iso);
    if (c) return { id: 'cal', name: c.texto, emoji: c.emoji || '🎉', nota: c.nota };
    if (M === 12 && D >= 24 && D <= 26) return { id: 'navidad', name: '¡Feliz Navidad!', emoji: '🎄' };
    if (same(12, 31)) return { id: 'nochevieja', name: '¡Feliz Nochevieja!', emoji: '🥂' };
    if (same(1, 1)) return { id: 'anonuevo', name: '¡Feliz Año Nuevo!', emoji: '🎆' };
    if (same(1, 6)) return { id: 'reyes', name: '¡Feliz Día de Reyes!', emoji: '👑' };
    const ea = easter(Y), diff = Math.round((new Date(Y, M - 1, D) - ea) / 864e5);
    if (diff >= -3 && diff <= 0) return { id: 'pascua', name: '¡Feliz Semana Santa!', emoji: '🐣' };
    if (M === 5 && d.getDay() === 0 && D <= 7) return { id: 'madre', name: '¡Feliz Día de la Madre!', emoji: '💐' };
    return null;
  };
  E.fiesta = function () {
    const sd = E.specialDay();
    if (!sd) return null;
    const key = E.today();
    const doy = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
    return Object.assign({ kind: 'fiesta', key, n: 9000 + doy * 3 + (new Date().getFullYear() % 3), done: E.save.fiestaDone === key, greeted: E.save.fiestaGreet === key }, sd);
  };
  // al abrir el juego en un día especial: felicitación con regalo (una vez al día)
  function fiestaGreeting(then) {
    const f = E.fiesta();
    if (!f || f.greeted) { if (then) then(); return; }
    E.save.fiestaGreet = f.key;
    const got = giveRandomStart(2);
    rewardPopup(f.name, (f.nota ? f.nota + ' ' : '') + 'Hoy tienes un regalo y un nivel especial en el mapa.', got.map((b) => b.icon), then, f.emoji);
  }
  E.openFiesta = function () {
    const f = E.fiesta();
    if (!f) return;
    if (f.done) { rewardPopup(f.name, '¡Ya has superado el nivel especial de hoy!', [], null, f.emoji); return; }
    playS.challenge = f;
    openPreLevel(f.n, true);
  };

  // ---------------------------------------------------------------- misiones de la semana
  // Tres misiones que cambian cada lunes (como las de los originales); cada una da potenciadores.
  function missionList() {
    const w = weekNo(), r = E.rng(w * 7919 + GAME.id.length * 31), col = GAME.collection;
    const pool = [
      { id: 'wins', text: (k) => 'Supera ' + k + ' niveles', k: r.pick([8, 10, 12, 15]) },
      { id: 'stars', text: (k) => 'Consigue ' + k + ' estrellas', k: r.pick([15, 20, 25, 30]) },
      { id: 'three', text: (k) => 'Supera ' + k + ' niveles con 3 estrellas', k: r.pick([3, 5, 6]) },
      { id: 'clean', text: (k) => 'Supera ' + k + ' niveles sin usar ayudas', k: r.pick([3, 5, 8]) },
    ];
    if (col) pool.push({ id: 'col', text: (k) => col.label.split(' ')[0] + ': consigue ' + k + ' ' + col.icon, k: r.pick([30, 50, 80]) });
    return r.shuffle(pool).slice(0, 3).map((m) => Object.assign(m, { name: m.text(m.k) }));
  }
  function missionState() {
    const w = weekNo();
    if (!E.save.mis || E.save.mis.week !== w) E.save.mis = { week: w, prog: {}, done: [] };
    return E.save.mis;
  }
  // se llama al apuntar cada intento (y al recoger la colección): suma a las misiones de la semana
  function missionAdd(id, k) { if (E.fast || !k) return; const st = missionState(); st.prog[id] = (st.prog[id] || 0) + k; }
  function missionsDone() {
    const st = missionState(), got = [];
    for (const m of missionList()) if (!st.done.includes(m.id) && (st.prog[m.id] || 0) >= m.k) { st.done.push(m.id); got.push(m); }
    return got;
  }
  E.openMissions = function () {
    const L = missionList(), st = missionState();
    E.openPopup({
      draw(g) {
        const w = 540, h = 230 + L.length * 120, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '📋 Misiones de la semana', E.W / 2, y + 55, 36, GAME.theme.accent, { stroke: '#fff', sw: 7 });
        L.forEach((m, i) => {
          const yy = y + 100 + i * 120, v = Math.min(m.k, st.prog[m.id] || 0), done = st.done.includes(m.id);
          E.rr(g, x + 24, yy, w - 48, 104, 18); g.fillStyle = done ? 'rgba(160,230,150,0.85)' : 'rgba(255,255,255,0.75)'; g.fill();
          E.wrapText(g, m.name, E.W / 2, yy + 26, w - 90, 24, '#5a3a1a', { stroke: false });
          E.rr(g, x + 50, yy + 62, w - 100, 24, 12); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fill();
          E.rr(g, x + 50, yy + 62, Math.max(24, (w - 100) * (v / m.k)), 24, 12); g.fillStyle = done ? '#2a8a2a' : '#3cb93c'; g.fill();
          E.text(g, done ? '¡Hecha! 🎁' : v + ' / ' + m.k, E.W / 2, yy + 74, 18, '#fff', { stroke: 'rgba(0,0,0,0.4)', sw: 3 });
        });
        E.text(g, 'Cambian cada lunes', E.W / 2, y + h - 112, 20, '#7a4b1f', { stroke: false });
        E.button('mi_ok', x + 140, y + h - 92, w - 280, 76, 'Volver', { color: '#3cb93c', size: 32, cb: () => E.closePopup() });
      },
      back() { E.closePopup(); },
    });
  };

  // después de ganar: cofre lleno, mundo nuevo y luego el siguiente nivel
  function afterWin(n) {
    const steps = [];
    for (const m of missionsDone()) steps.push((next) => {
      const got = giveRandomStart(2);
      rewardPopup('¡Misión cumplida!', m.name + '. Te llevas 2 potenciadores para empezar.', got.map((b) => b.icon), next, '📋');
    });
    for (const g2 of newAchievements()) steps.push((next) => {
      const got = giveRandomStart(1);
      rewardPopup('¡Logro conseguido!', g2.a.name + ': ' + g2.target + '. Te llevas un potenciador para empezar.', got.map((b) => b.icon), next, g2.a.icon);
    });
    if (E.save.chest >= CHEST) steps.push((next) => {
      E.save.chest -= CHEST;
      const got = giveRandomStart(2);
      rewardPopup('¡Cofre de estrellas!', 'Has juntado ' + CHEST + ' estrellas. Tienes nuevos potenciadores para empezar los niveles:', got.map((b) => b.icon), next, '🎁');
    });
    if (n % WORLD === 0) steps.push((next) => rewardPopup('¡Nuevo mundo!', 'Mundo ' + (worldOf(n + 1) + 1) + ': ' + E.worldName(worldOf(n + 1)), [], next, GAME.theme.mascot));
    const run = (i) => (i < steps.length ? steps[i](() => run(i + 1)) : openPreLevel(n + 1));
    run(0);
  }
  E.afterWin = afterWin;
  E.goMap = () => goMap();
  E.openPreLevel = (n) => openPreLevel(n);
  function openPreLevel(n, challenge) {
    if (!challenge) playS.challenge = null;
    const spec = getLevel(n);
    const goals = spec.goals.map((gl) => Object.assign({}, gl, { left: gl.count }));
    const chosen = new Set();
    const SB = GAME.startBoosters || [];
    // si un nivel se resiste (6 intentos sin superarlo), sus potenciadores de inicio salen gratis y ya marcados
    const help = !challenge && ((E.save.fails && E.save.fails[n]) || 0) >= HELP_AT;
    if (help) SB.forEach((b) => chosen.add(b.id));
    if (spec.text) E.say(spec.text);
    E.openPopup({
      draw(g) {
        const extra = (SB.length ? 150 : 0) + (E.save.streak ? 50 : 0) + 80 + (help ? 46 : 0);
        const w = 520, h = (spec.text ? 600 : 520) + extra, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.rr(g, x + 60, y - 30, w - 120, 76, 30);
        g.fillStyle = GAME.theme.ribbon || GAME.theme.accent; g.fill();
        g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
        E.text(g, playS.challenge ? (playS.challenge.kind === 'fiesta' ? playS.challenge.emoji + ' Nivel especial' : '🏅 Desafío semanal') : 'Nivel ' + n, E.W / 2, y + 8, playS.challenge ? 36 : 44, '#fff');
        if (E.isHard(n)) E.text(g, E.hardness(n) === 2 ? '💀 ¡Nivel superdifícil! 💀' : '💀 ¡Nivel difícil!', E.W / 2, y + 82, 30, E.hardness(n) === 2 ? '#5b2a86' : '#ff5a5a', { stroke: '#fff', sw: 6 });
        E.text(g, 'Objetivo', E.W / 2, y + 128, 34, GAME.theme.hudText || '#7a4b1f', { stroke: false });
        E.rr(g, x + 40, y + 160, w - 80, 180, 20);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
        E.drawGoalBox(g, goals, x + 50, y + 165, w - 100, 170);
        if (spec.text) E.wrapText(g, spec.text, E.W / 2, y + 395, w - 60, 27, GAME.theme.hudText || '#7a4b1f', { stroke: false });
        let yy = y + (spec.text ? 470 : 370);
        if (E.save.streak) {
          const sb = streakBonus().map((id) => startDef(id).icon).join(' ');
          E.text(g, '🔥 Racha de ' + E.save.streak + (E.save.streak === 1 ? ' victoria' : ' victorias') + (sb ? ': empiezas con ' + sb : ''), E.W / 2, yy + 14, 26, '#d2481f', { stroke: false });
          yy += 50;
        }
        if (help) {
          E.text(g, '💪 ¡Este nivel se resiste! Hoy todos los potenciadores son gratis', E.W / 2, yy + 12, 22, '#2a8a2a', { stroke: false });
          yy += 46;
        }
        if (SB.length) {
          E.text(g, 'Potenciadores para empezar', E.W / 2, yy + 10, 24, GAME.theme.hudText || '#7a4b1f', { stroke: false });
          const bw = 110, gap = 24, x0 = E.W / 2 - (SB.length * bw + (SB.length - 1) * gap) / 2;
          SB.forEach((b, i) => {
            const have = help ? Infinity : E.save.inv[b.id] || 0, on = chosen.has(b.id);
            E.button('pl_sb' + b.id, x0 + i * (bw + gap), yy + 30, bw, 96, '', {
              color: on ? '#ffb020' : have ? '#5cc24a' : '#b9c0c8', r: 22,
              draw: (gg, bx, by2, bw2, bh2) => {
                E.emoji(gg, b.icon, bx + bw2 / 2, by2 + bh2 / 2 - 4, 52);
                gg.beginPath(); gg.arc(bx + bw2 - 14, by2 + bh2 - 12, 18, 0, 7); gg.fillStyle = '#fff'; gg.fill();
                E.text(gg, on ? '✓' : have === Infinity ? '∞' : String(have), bx + bw2 - 14, by2 + bh2 - 12, 22, on ? '#d2481f' : '#2a7a2a', { stroke: false });
              },
              cb: () => { if (on) chosen.delete(b.id); else if (have > 0) chosen.add(b.id); else E.floatText(E.W / 2, yy, 'Se consiguen con el cofre de estrellas y las rachas', '#fff', 24); },
            });
          });
        }
        // jugar por turnos con otra persona (cuando vais a verla)
        E.button('pl_duo', x + 30, y + h - 205, w - 60, 64, '👥 Por turnos con otra persona: ' + (E.duoOn ? 'Sí' : 'No'), { color: E.duoOn ? '#ff8a1f' : '#8a96a3', size: 24, r: 20, cb: () => { E.duoOn = !E.duoOn; } });
        const play = () => {
          const bonus = streakBonus();
          for (const id of chosen) { if (!help) E.save.inv[id] = Math.max(0, (E.save.inv[id] || 0) - 1); bonus.push(id); }
          E.persist();
          E.closePopup(() => startLevel(n, null, bonus));
        };
        E.button('pl_go', x + 90, y + h - 125, w - 180, 100, '¡Jugar!', { color: '#3cb93c', size: 44, cb: play });
        E.button('pl_x', x + w - 62, y - 22, 70, 70, '✕', { color: '#e8453c', r: 35, size: 34, cb: () => E.closePopup() });
      },
      back() { E.closePopup(); },
    });
  }

  // ---------------------------------------------------------------- pantalla de juego
  const playS = { P: null, n: 1, state: 'playing', idle: 0, endT: 0 };
  E.play = playS;
  // ---------------------------------------------------------------- volver a mitad de nivel
  // Cada partida usa una semilla propia y el motor apunta los toques que cambian la partida.
  // Si la app se cierra a medias, al volver se repiten esos toques muy deprisa (sin dibujar ni sonar)
  // y la partida queda exactamente como estaba.
  const levelPrint = (spec) => JSON.stringify([spec.moves, spec.goals.map((g) => [g.type, g.key, g.count])]);
  function journalSave() { if (playS.journal && !playS.replaying) { playS.journal.t = Math.round(playS.activeT); E.save.resume = playS.journal; E.persist(); } }
  function journalAdd(ev) {
    const J = playS.journal;
    if (!J) return;
    const last = J.ev[J.ev.length - 1];
    if (ev[0] === 'm' && last && last[0] === 'm') J.ev[J.ev.length - 1] = ev; // los arrastres solo cuentan por su último punto
    else J.ev.push(ev);
    if (ev[0] !== 'm') journalSave();
  }
  function journalEnd() { playS.journal = null; if (E.save.resume) { delete E.save.resume; E.persist(); } }
  function startLevel(n, seed, bonus) {
    E.clearTimers();
    playS.n = n;
    playS.spec = getLevel(n);
    E.playSeed = seed != null ? seed : (Math.random() * 1e9) | 0;
    playS.P = GAME.newPlay(playS.spec, n);
    playS.P.goals = playS.spec.goals.map((gl) => Object.assign({}, gl, { left: gl.count }));
    playS.P.moves = playS.spec.moves;
    // dificultad dinámica (Candy Crush, ota-dynamic_difficulty): tras varias derrotas el nivel trae algún movimiento más
    if (GAME.dynamicDifficulty && playS.P.moves !== Infinity) {
      const f = (E.save.fails && E.save.fails[n]) || 0;
      playS.P.moves += f >= 9 ? 5 : f >= 6 ? 3 : f >= 3 ? 1 : 0;
    }
    // potenciadores de inicio y premio de la racha: especiales colocados antes de empezar
    if (bonus && bonus.length && playS.P.startBonus) playS.P.startBonus(bonus, E.rng(E.playSeed + 77));
    if (bonus && bonus.includes('plus3')) playS.P.moves += 3;
    // contrarreloj: el nivel trae tiempo (segundos) en vez de movimientos
    playS.timeTotal = playS.spec.time || 0; playS.bonusT = 0;
    if (playS.timeTotal) playS.P.moves = Infinity;
    playS.state = 'playing';
    playS.idle = 0;
    playS.journal = { n, seed: E.playSeed, moves0: playS.P.moves, fp: levelPrint(playS.spec), bonus: bonus || [], challenge: playS.challenge || null, ev: [] };
    playS.activeT = 0; playS.uses = 0; // para el registro de partidas
    // el siguiente nivel se va preparando mientras se juega este
    E.after(2, () => E.prefetch(n + 1));
    playS.booster = null;
    playS.ask = false;
    playS.duo = E.duoOn ? { turn: 0, score: [0, 0], pending: false, busySeen: false } : null;
    playS.lastGoalT = E.t;
    playS.extraUsed = 0;
    E.setScreen(playS);
    playS.resize();
  }
  E.startLevel = startLevel;
  // Llamado por el juego para descontar objetivos
  E.goal = function (type, key, amount, x, y) {
    const P = playS.P;
    if (!P) return false;
    for (const gl of P.goals) {
      if (gl.type === type && (gl.key === undefined || gl.key === key) && gl.left > 0) {
        const took = Math.min(gl.left, amount || 1);
        gl.left = Math.max(0, gl.left - (amount || 1));
        playS.lastGoalT = E.t;
        if (!E.fast) E.save.stats.goals[type] = (E.save.stats.goals[type] || 0) + took;
        if (playS.duo) playS.duo.score[playS.duo.turn] += took;
        if (GAME.collection && type === GAME.collection.type) missionAdd('col', took);
        if (x != null && gl.pos) {
          // pequeño icono que vuela hasta el panel de objetivos
          const fl = { x, y, gl, s: 1 };
          playS.flyers.push(fl);
          E.tween(fl, { x: gl.pos.x, y: gl.pos.y, s: 0.6 }, 0.55, { ease: E.ease.inOut, done: () => { playS.flyers.splice(playS.flyers.indexOf(fl), 1); gl.bump = 1; E.tween(gl, { bump: 0 }, 0.3); } });
        }
        return true;
      }
    }
    return false;
  };
  // Algunos obstáculos aumentan el objetivo (el jabón de Toy Blast crea burbujas nuevas que también hay que quitar)
  E.goalAdd = function (type, amount) {
    const P = playS.P;
    if (!P) return;
    const gl = P.goals.find((g) => g.type === type);
    if (gl) { gl.left += amount; gl.bump = 1; E.tween(gl, { bump: 0 }, 0.3); }
  };
  E.goalNeeded = function (type, key) {
    const P = playS.P;
    if (!P) return false;
    return P.goals.some((gl) => gl.type === type && (gl.key === undefined || gl.key === key) && gl.left > 0);
  };
  playS.flyers = [];
  playS.layout = {};
  playS.resize = function () {
    const top = 170, bottom = 140;
    playS.layout = { hudH: top, barH: bottom, board: { x: 10, y: top + 8, w: E.W - 20, h: E.H - top - bottom - 16 } };
    if (playS.P && playS.P.layout) playS.P.layout(playS.layout.board);
  };
  const DUO_NAMES = ['la abuela', 'la visita'];
  const canAct = () => playS.state === 'playing' && !playS.P.busy && !E.popup;
  function explain(text) {
    E.say(text);
    E.openPopup({
      draw(g) {
        const w = 520, h = 330, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '¿Qué es esto?', E.W / 2, y + 55, 38, GAME.theme.accent, { stroke: '#fff', sw: 7 });
        E.wrapText(g, text, E.W / 2, y + 120, w - 60, 30, '#5a3a1a', { stroke: false });
        E.button('ex_ok', x + 110, y + h - 105, w - 220, 84, '¡Entendido!', { color: '#3cb93c', size: 32, cb: () => E.closePopup() });
      },
      back() { E.closePopup(); },
    });
  }
  playS.down = function (x, y) {
    playS.idle = 0;
    if (playS.state !== 'playing') return;
    if (playS.ask) { // modo pregunta: no se juega, se explica
      playS.ask = false;
      const t = playS.P.describe && playS.P.describe(x, y);
      if (t) explain(t); else E.floatText(x, y - 30, 'Toca una pieza del tablero', '#fff', 26);
      return;
    }
    if (canAct()) { journalAdd(['d', Math.round(x), Math.round(y)]); if (playS.duo) playS.duo.pending = true; }
    playS.P.down && playS.P.down(x, y);
  };
  playS.move = function (x, y) { if (playS.state === 'playing' && playS.P.move) { if (canAct()) journalAdd(['m', Math.round(x), Math.round(y)]); playS.P.move(x, y); } };
  playS.up = function (x, y) { if (playS.state === 'playing' && playS.P.up) { if (canAct()) journalAdd(['u', Math.round(x), Math.round(y)]); playS.P.up(x, y); } };
  playS.update = function (dt) {
    const P = playS.P;
    P.update && P.update(dt);
    if (playS.state !== 'playing' || E.popup) return;
    if (!E.fast) playS.activeT += dt;
    const D2 = playS.duo;
    if (D2 && P.busy && D2.pending) D2.busySeen = true;
    if (D2 && !P.busy && D2.pending && D2.busySeen) { // jugada hecha: le toca al otro
      D2.pending = false; D2.busySeen = false; D2.turn = 1 - D2.turn;
      E.floatText(E.W / 2, E.H * 0.45, '¡Le toca a ' + DUO_NAMES[D2.turn] + '!', D2.turn ? '#7ad7ff' : '#ffd23f', 40);
      E.say('Le toca a ' + DUO_NAMES[D2.turn]);
    }
    if (P.busy) { playS.idle = 0; return; }
    playS.idle += dt;
    // si lleva rato sin conseguir nada, los objetivos que faltan parpadean para recordarlos
    if (E.t - (playS.lastGoalT || 0) > 40 && Math.floor(E.t * 0.5) !== playS.lastPulse) {
      playS.lastPulse = Math.floor(E.t * 0.5);
      for (const gl of P.goals) if (gl.left > 0) { gl.bump = 1; E.tween(gl, { bump: 0 }, 0.6); }
    }
    if (playS.idle > 7 && P.hint) { playS.idle = -3; P.hint(); }
    if (P.goals.every((gl) => gl.left <= 0)) {
      const sp = playS.spec;
      if (sp.starScores && (P.score || 0) < sp.starScores[0]) {
        // como en Pet Rescue: sin la primera estrella de puntos no se supera el nivel
        P.dead = true; P.deadMsg = 'No has llegado a la primera estrella';
        playS.state = 'lost';
        logAttempt('p');
        journalEnd();
        E.after(0.6, lose);
        return;
      }
      playS.state = 'won';
      logAttempt('g', starsFor(P, playS.spec));
      journalEnd();
      E.after(0.5, () => (P.finale ? P.finale(win) : win()));
    } else if (playS.timeTotal && E.timeLeft() <= 0 && !P.dead) {
      P.dead = true; P.deadMsg = '¡Se acabó el tiempo!';
      playS.state = 'lost';
      logAttempt('p');
      journalEnd();
      E.after(0.6, lose);
    } else if (P.moves <= 0 || P.dead) {
      playS.state = 'lost';
      logAttempt('p');
      journalEnd();
      E.after(0.6, lose);
    }
  };
  playS.draw = function (g) {
    const P = playS.P, L = playS.layout, th = GAME.theme;
    // fondo
    const skbg = E.skin('playBg');
    const bg = E.sprite('bg' + GAME.id, E.W, E.H, skbg ? (c, w, h) => skbg(c, w, h, L) : (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, th.bg[0]); gr.addColorStop(1, th.bg[1]);
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      if (th.bgDeco) th.bgDeco(c, w, h);
    });
    g.drawImage(bg, 0, 0, E.W, E.H);
    // tablero
    g.save();
    if (E.shakeT > 0) g.translate((Math.random() - 0.5) * 14 * E.shakeT, (Math.random() - 0.5) * 14 * E.shakeT);
    P.draw(g);
    g.restore();
    // cabecera
    drawHud(g, P, L);
    // barra de ayudas
    drawBar(g, P, L);
    for (const f of playS.flyers) GAME.drawGoalIcon(g, f.gl, f.x, f.y, 52 * f.s);
    if (playS.duo) { // de quién es el turno
      const D2 = playS.duo, col = D2.turn ? '#2e8ff0' : '#e6a400';
      E.rr(g, E.W / 2 - 170, L.hudH - 4, 340, 40, 20); g.fillStyle = col; g.fill();
      E.text(g, 'Turno de ' + DUO_NAMES[D2.turn] + '  ·  ' + D2.score[0] + ' – ' + D2.score[1], E.W / 2, L.hudH + 16, 22, '#fff', { stroke: 'rgba(0,0,0,0.35)', sw: 4 });
    }
    if (playS.ask) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      E.rr(g, 40, L.hudH + 10, E.W - 80, 70, 24); g.fill();
      E.text(g, 'Toca una pieza para saber qué es', E.W / 2, L.hudH + 45, 30, '#fff');
    }
    if (playS.booster) {
      const b = GAME.boosters.find((bb) => bb.id === playS.booster);
      g.fillStyle = 'rgba(0,0,0,0.55)';
      E.rr(g, 40, L.hudH + 10, E.W - 80, 70, 24); g.fill();
      E.text(g, b.prompt || 'Toca una ficha', E.W / 2, L.hudH + 45, 30, '#fff');
    }
  };
  function drawHud(g, P, L) {
    const th = GAME.theme;
    const skh = E.skin('hud');
    if (skh) skh(g, E.W, L.hudH);
    else E.panel(g, 8, 8, E.W - 16, L.hudH - 12, { border: th.hudBorder || '#2e6f8e', top: th.hudTop || '#fff8e6', bottom: th.hudBottom || '#f3dfb5', r: 26 });
    // objetivos
    const gx = 22, gy = 20, gw = 300, gh = L.hudH - 40;
    E.text(g, 'Objetivo', gx + gw / 2, gy + 14, 22, th.hudText || '#7a4b1f', { stroke: false, weight: '800' });
    const n = P.goals.length, cols = n <= 2 ? n : 2, rows = Math.ceil(n / cols);
    const cw = gw / cols, ch = (gh - 26) / rows;
    const sz = Math.min(cw * 0.48, ch * 0.78, 60);
    P.goals.forEach((gl, i) => {
      const cx = gx + (i % cols) * cw + cw * 0.36;
      const cy = gy + 30 + Math.floor(i / cols) * ch + ch / 2;
      gl.pos = { x: cx, y: cy };
      const s = sz * (1 + (gl.bump || 0) * 0.3);
      GAME.drawGoalIcon(g, gl, cx, cy, s);
      if (gl.left <= 0) {
        g.beginPath(); g.arc(cx + sz * 0.62, cy + sz * 0.25, sz * 0.32, 0, 7);
        g.fillStyle = '#3cb93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
        g.beginPath();
        g.moveTo(cx + sz * 0.48, cy + sz * 0.25); g.lineTo(cx + sz * 0.58, cy + sz * 0.37); g.lineTo(cx + sz * 0.78, cy + sz * 0.12);
        g.lineWidth = 4; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.stroke();
      } else {
        E.text(g, String(gl.left), cx + sz * 0.7, cy + sz * 0.3, Math.max(24, sz * 0.55), '#fff');
      }
    });
    // mascota: al tocarla, el siguiente toque en el tablero explica qué es esa pieza
    {
      const ax = E.W / 2 + 40, ay = L.hudH / 2 - 4;
      if (playS.ask) { g.beginPath(); g.arc(ax, ay, 52, 0, 7); g.fillStyle = 'rgba(255,176,32,0.55)'; g.fill(); }
      E.emoji(g, th.mascot, ax, ay, 76);
      g.beginPath(); g.arc(ax + 34, ay + 30, 18, 0, 7); g.fillStyle = '#3f8fd9'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
      E.text(g, '?', ax + 34, ay + 31, 25, '#fff', { stroke: false });
      E.hotspot('ask', ax - 50, ay - 50, 100, 100, () => { if (playS.state !== 'playing' || !playS.P.describe) return; playS.ask = !playS.ask; });
    }
    // movimientos
    const mx = E.W - 170, mw = 150;
    E.text(g, playS.timeTotal ? '⏱ Tiempo' : th.movesLabel || 'Movimientos', mx + mw / 2, 34, 22, th.hudText || '#7a4b1f', { stroke: false, weight: '800' });
    if (!skh) { E.rr(g, mx, 52, mw, 92, 20); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(); }
    if (playS.timeTotal) {
      const t = Math.max(0, Math.ceil(E.timeLeft())), lowT = t <= 10;
      E.text(g, Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), mx + mw / 2, 100, lowT ? 56 + Math.sin(E.t * 8) * 4 : 56, lowT ? '#ff4040' : '#3b6fb6', { stroke: '#fff', sw: 8 });
    } else {
      const low = P.moves <= 5;
      const ms = low ? 64 + Math.sin(E.t * 8) * 4 : 64;
      E.text(g, P.moves === Infinity ? '∞' : String(Math.max(0, P.moves)), mx + mw / 2, 100, ms, low ? '#ff4040' : '#3b6fb6', { stroke: '#fff', sw: 8 });
    }
    // barra de puntos con las 3 estrellas (Pet Rescue)
    const sp = playS.spec;
    if (sp && sp.starScores) {
      const bx = 30, bw = E.W - 220, by = L.hudH - 30, top = sp.starScores[2] * 1.08;
      const k = Math.min(1, (P.score || 0) / top);
      E.rr(g, bx, by, bw, 16, 8); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fill();
      if (k > 0) { E.rr(g, bx, by, Math.max(16, bw * k), 16, 8); g.fillStyle = '#ffb020'; g.fill(); }
      sp.starScores.forEach((v, i) => { const x = bx + (bw * v) / top; E.star(g, x, by + 8, 13, (P.score || 0) >= v ? '#ffd23f' : '#d8d8d8', '#a06a00'); });
      E.text(g, String(P.score || 0), bx + bw / 2, by - 12, 20, th.hudText || '#7a4b1f', { stroke: false, weight: '800' });
    }
  }
  function drawBar(g, P, L) {
    const y = E.H - L.barH;
    const skbar = E.skin('bar');
    if (skbar) skbar(g, y, E.W, L.barH);
    else {
      g.fillStyle = GAME.theme.bar || 'rgba(30,60,90,0.85)';
      g.fillRect(0, y, E.W, L.barH);
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.fillRect(0, y, E.W, 4);
    }
    const items = GAME.boosters;
    const n = items.length + 1;
    const bw = Math.min(110, (E.W - 20) / n - 10);
    const gap = (E.W - n * bw) / (n + 1);
    const by = y + (L.barH - bw) / 2 - 4;
    const mx = (x0) => (E.save.hand === 'izq' ? E.W - x0 - bw : x0); // mano izquierda: barra al revés
    const skpz = E.skin('pauseIcon');
    E.button('pause', mx(gap), by, bw, bw, '', {
      color: GAME.theme.pauseColor || '#4a90c2', r: bw / 2,
      draw: skpz || ((gg, x, yy, w, h) => E.emoji(gg, '⚙️', x + w / 2, yy + h / 2, w * 0.55)),
      cb: openPause,
    });
    items.forEach((b, i) => {
      const x = mx(gap + (i + 1) * (bw + gap));
      const active = playS.booster === b.id, have = boosterLeft(b.id);
      const skbb = E.skin('boosterIcon');
      E.button('b_' + b.id, x, by, bw, bw, '', {
        color: active ? '#ffb020' : have ? '#5cc24a' : '#9aa3ad', r: 24,
        draw: skbb ? (gg, xx, yy, w, h) => skbb(gg, b, xx, yy, w, h, have, active) : (gg, xx, yy, w, h) => {
          E.emoji(gg, b.icon, xx + w / 2, yy + h / 2, w * 0.62);
          gg.beginPath(); gg.arc(xx + w - 12, yy + h - 8, 17, 0, 7);
          gg.fillStyle = '#fff'; gg.fill();
          E.text(gg, have === Infinity ? '∞' : String(have), xx + w - 12, yy + h - 9, have === Infinity ? 26 : 22, have ? '#2a7a2a' : '#c0392b', { stroke: false });
        },
        cb: () => useBooster(b),
      });
    });
  }
  // dentro del nivel se gastan; si el nivel se resiste (6 intentos) son ilimitados en ese nivel
  const HELP_AT = 6;
  const levelHelp = (n) => !playS.challenge && ((E.save.fails && E.save.fails[n]) || 0) >= HELP_AT;
  function boosterLeft(id) { return levelHelp(playS.n) ? Infinity : E.save.binv[id] || 0; }
  function spendBooster(id) {
    if (playS.replaying || boosterLeft(id) === Infinity) return; // al reanudar ya estaba gastado
    E.save.binv[id] = Math.max(0, (E.save.binv[id] || 0) - 1); E.persist();
  }
  function useBooster(b) {
    const P = playS.P;
    if (playS.state !== 'playing' || P.busy) return;
    if (!playS.replaying && playS.booster !== b.id && !boosterLeft(b.id)) {
      if (!playS.replaying) { E.sfx('click'); E.floatText(E.W / 2, E.H - 260, 'No te quedan. Salen en la ruleta, el cofre y las misiones', '#fff', 26); }
      return;
    }
    playS.idle = 0;
    journalAdd(['b', b.id]);
    playS.uses++;
    if (b.target) {
      playS.booster = playS.booster === b.id ? null : b.id;
    } else {
      spendBooster(b.id);
      P.booster(b.id);
    }
  }
  E.takeBooster = function () { const b = playS.booster; playS.booster = null; if (b) spendBooster(b); return b; };
  E.activeBooster = () => playS.booster;
  E.useBooster = (id) => useBooster(GAME.boosters.find((b) => b.id === id)); // para las pruebas

  function openPause() {
    E.openPopup({
      draw(g) {
        const w = 480, h = 470, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, 'Pausa', E.W / 2, y + 60, 46, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        E.button('pz_c', x + 50, y + 110, w - 100, 96, 'Seguir jugando', { color: '#3cb93c', size: 34, cb: () => E.closePopup() });
        E.button('pz_a', x + 50, y + 222, w - 100, 86, '⚙️ Ajustes', { color: '#3f8fd9', size: 32, cb: () => E.closePopup(() => E.openSettings(openPause)) });
        E.button('pz_m', x + 50, y + 330, w - 100, 96, 'Salir al mapa', { color: '#e8453c', size: 34, cb: () => E.closePopup(confirmExit) });
        let ver = 0; try { ver = window.AndroidUpdate ? window.AndroidUpdate.version() : 0; } catch (e) { ver = 0; }
        E.text(g, 'Versión ' + (ver || 'de la app'), E.W / 2, y + h - 18, 16, 'rgba(90,58,26,0.55)', { stroke: false });
      },
      back() { E.closePopup(); },
    });
  }
  // ajustes de comodidad (desde la pausa y desde el mapa)
  E.dragK = () => ({ suave: 0.2, normal: 0.35, firme: 0.55 })[E.save.drag || 'normal'];
  E.openSettings = function (back) {
    const close = () => E.closePopup(back);
    const opts = [
      ['Sonido', () => ['No', 'Bajo', 'Alto'][E.vol()], () => E.cycleSound()],
      ['Letra grande', () => (E.save.big ? 'Sí' : 'No'), () => { E.save.big = !E.save.big; }],
      ['Leer en voz alta', () => (E.save.voice ? 'Sí' : 'No'), () => { E.save.voice = !E.save.voice; if (E.save.voice) E.say('Leeré en voz alta las explicaciones'); }],
      ['Ayudas a la', () => (E.save.hand === 'izq' ? 'izquierda' : 'derecha'), () => { E.save.hand = E.save.hand === 'izq' ? 'der' : 'izq'; }],
    ];
    const GFX = { baja: 'Sencillos', nueva: 'Nuevos', original: 'Como el original', real: 'Original' };
    if (E.gfxList().length > 1) opts.unshift(['Gráficos', () => GFX[E.gfx], () => { const L = E.gfxList(); E.save.gfx = L[(L.indexOf(E.gfx) + 1) % L.length]; E.setGfx(E.save.gfx); }]);
    if (GAME.usesDrag) opts.push(['Deslizar', () => ({ suave: 'Suave', normal: 'Normal', firme: 'Firme' })[E.save.drag || 'normal'], () => { E.save.drag = { suave: 'normal', normal: 'firme', firme: 'suave' }[E.save.drag || 'normal']; }]);
    if (GAME.usesAim) opts.push(['Disparar', () => (E.save.confirmShot ? 'Tocando a mamá' : 'Al soltar'), () => { E.save.confirmShot = !E.save.confirmShot; }]);
    E.openPopup({
      draw(g) {
        const w = 500, h = 170 + opts.length * 96 + 100, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '⚙️ Ajustes', E.W / 2, y + 60, 42, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        opts.forEach(([name, val, act], i) => E.button('st_' + i, x + 40, y + 110 + i * 96, w - 80, 82, name + ': ' + val(), { color: '#3f8fd9', size: 28, cb: () => { act(); E.persist(); } }));
        E.button('st_ok', x + 110, y + h - 120, w - 220, 90, 'Listo', { color: '#3cb93c', size: 34, cb: close });
      },
      back() { close(); },
    });
  };
  // confirmación para no perder la partida por un toque sin querer
  function confirmExit() {
    E.openPopup({
      draw(g) {
        const w = 500, h = 430, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '¿Salir del nivel?', E.W / 2, y + 70, 42, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        E.text(g, 'Si sales, tendrás que empezarlo otra vez', E.W / 2, y + 135, 26, '#7a4b1f', { stroke: false });
        E.button('cx_no', x + 50, y + 185, w - 100, 96, 'No, seguir jugando', { color: '#3cb93c', size: 32, cb: () => E.closePopup() });
        E.button('cx_si', x + 50, y + 300, w - 100, 90, 'Sí, salir', { color: '#e8453c', size: 30, cb: () => E.closePopup(() => { logAttempt('s'); E.save.fails = E.save.fails || {}; E.save.fails[playS.n] = (E.save.fails[playS.n] || 0) + 1; journalEnd(); E.save.streak = 0; E.persist(); goMap(); }) });
      },
      back() { E.closePopup(); },
    });
  }
  // ---------------------------------------------------------------- datos para arreglar cosas desde casa
  // El estado del juego (nivel, registro de partidas, errores) va a un repositorio privado de GitHub (./datos.sh lo lee).
  let lastSend = 0;
  E.sendData = function (motivo, force) {
    try {
      if (!window.AndroidData || !window.AndroidData.ok() || E.fast) return;
      const now = Date.now();
      if (!force && now - lastSend < 120000) return;
      lastSend = now;
      const ver = window.AndroidUpdate ? window.AndroidUpdate.version() : 0;
      window.AndroidData.send(JSON.stringify({ juego: GAME.id, enviado: new Date().toISOString(), motivo, version: ver, pantalla: E.W + 'x' + E.H, save: E.save }));
    } catch (e) { /* sin envío */ }
  };
  // errores que ocurran jugando: se guardan (los 30 últimos) para verlos desde casa
  window.addEventListener('error', (ev) => {
    if (!window.__arrancado) return;
    try {
      const v = window.AndroidUpdate ? window.AndroidUpdate.version() : 0;
      E.save.errs = (E.save.errs || []).concat([{ t: new Date().toISOString(), v, msg: String(ev.message).slice(0, 200), at: (ev.filename || '').split('/').pop() + ':' + ev.lineno, nivel: E.screen === playS ? playS.n : null }]).slice(-30);
      E.persist();
    } catch (e) { /* nada */ }
  });

  // ---------------------------------------------------------------- registro de partidas
  // Cada intento de nivel: para ver con datos reales qué le cuesta a la abuela (tools/registro.sh lo lee de la tablet).
  // r: g ganado, p perdido, s salió; m movimientos usados de mt; s segundos jugando (sin pausas); st estrellas; b ayudas
  function logAttempt(r, stars) {
    if (E.fast || !playS.journal) return;
    const P = playS.P, J = playS.journal, d = new Date();
    const e = { n: playS.n, r, s: Math.round(playS.activeT || 0), b: playS.uses || 0, d: E.today() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') };
    if (J.moves0 !== Infinity && P.moves !== Infinity) { e.m = J.moves0 - Math.max(0, P.moves); e.mt = J.moves0; }
    if (stars) e.st = stars;
    if (J.bonus && J.bonus.length) e.sb = J.bonus.length;
    if (playS.duo) e.duo = 1;
    if (playS.challenge) e.ch = 1;
    if (r === 'p') e.left = P.goals.reduce((a, g) => a + Math.max(0, g.left), 0);
    E.save.log = (E.save.log || []).concat([e]).slice(-1500);
    if (r === 'g' && !playS.challenge) {
      missionAdd('wins', 1); missionAdd('stars', Math.max(0, (stars || 0) - (E.save.stars[playS.n] || 0)));
      if (stars === 3) missionAdd('three', 1);
      if (!playS.uses) missionAdd('clean', 1);
    }
    setTimeout(() => { E.persist(); E.sendData('nivel ' + e.n); }, 1000);
  }
  E.logAttempt = logAttempt;
  // contrarreloj: segundos que quedan (solo corre jugando) y caramelos de reloj que suman tiempo
  E.timeLeft = () => (playS.timeTotal ? playS.timeTotal + playS.bonusT - (playS.activeT || 0) : Infinity);
  E.addTime = function (sec, x, y) { playS.bonusT += sec; if (!E.fast) { E.floatText(x != null ? x : E.W / 2, y != null ? y : E.H / 2, '+' + sec + ' s', '#2bb24c', 36); E.sfx('collect', 1.3); } };
  // Repite deprisa los toques apuntados de una partida a medias
  E.resumeLevel = (J) => resumeLevel(J);
  function resumeLevel(J) {
    playS.challenge = J.challenge || null;
    startLevel(J.n, J.seed, J.bonus);
    playS.resumedT = J.t || 0;
    const m0 = J.moves0 == null ? Infinity : J.moves0; // Infinity se guarda como null
    playS.P.moves = m0;
    playS.journal.moves0 = m0;
    playS.replaying = true; E.fast = true;
    const idle = () => { for (let i = 0; i < 900 && (playS.P.busy || E.popup); i++) E.step(1 / 30); };
    try {
      for (let i = 0; i < 3; i++) E.step(1 / 30); // que empiece la animación de entrada antes del primer toque
      for (const ev of J.ev) {
        if (playS.state !== 'playing') break;
        idle();
        if (ev[0] === 'd') playS.down(ev[1], ev[2]);
        else if (ev[0] === 'm') playS.move(ev[1], ev[2]);
        else if (ev[0] === 'u') playS.up(ev[1], ev[2]);
        else if (ev[0] === 'b') { const b = GAME.boosters.find((bb) => bb.id === ev[1]); if (b) useBooster(b); }
        for (let i = 0; i < 3; i++) E.step(1 / 30);
      }
      idle();
    } finally { playS.replaying = false; E.fast = false; }
    playS.activeT = playS.resumedT || 0; playS.uses = J.ev.filter((ev) => ev[0] === 'b').length;
    journalSave();
    E.floatText(E.W / 2, E.H * 0.45, '¡Seguimos donde lo dejaste!', '#fff', 40);
  }
  function goMap() { E.clearTimers(); E.setScreen(mapS); E.after(0.8, () => { E.prefetch(E.save.level); if (!E.weekly().done) E.prefetchLater(E.weekly().n); }); }

  function starsFor(P, spec) {
    // juegos con puntos (Pet Rescue): estrellas por los umbrales de puntos del nivel
    if (spec.starScores) { const sc = P.score || 0; return sc >= spec.starScores[2] ? 3 : sc >= spec.starScores[1] ? 2 : 1; }
    const r = playS.timeTotal ? E.timeLeft() / playS.timeTotal : P.moves / spec.moves;
    return r >= 0.3 ? 3 : r >= 0.12 ? 2 : 1;
  }
  function win() {
    const n = playS.n, P = playS.P;
    const st = starsFor(P, playS.spec);
    if (playS.challenge) { // el desafío o el nivel de fiesta no avanzan el mapa: dan su premio y vuelven
      const ch = playS.challenge;
      if (ch.kind === 'fiesta') E.save.fiestaDone = ch.key; else E.save.weekDone = ch.week;
      E.save.streak = (E.save.streak || 0) + 1;
      const got = giveRandomStart(3);
      playS.challenge = null;
      E.persist();
      E.sfx('win'); E.confetti();
      if (ch.kind === 'fiesta') rewardPopup('¡Nivel especial superado!', ch.name + ' Te llevas 3 potenciadores para empezar.', got.map((b) => b.icon), goMap, ch.emoji);
      else rewardPopup('¡Desafío superado!', 'Te llevas 3 potenciadores para empezar los niveles. ¡El lunes habrá otro!', got.map((b) => b.icon), goMap, '🏅');
      return;
    }
    E.save.chest = (E.save.chest || 0) + Math.max(0, st - (E.save.stars[n] || 0)); // solo cuentan las estrellas nuevas
    E.save.streak = (E.save.streak || 0) + 1;
    E.save.stats.wins++;
    E.save.stats.bestStreak = Math.max(E.save.stats.bestStreak, E.save.streak);
    E.save.stars[n] = Math.max(E.save.stars[n] || 0, st);
    if (n >= E.save.level) E.save.level = n + 1;
    if (E.save.fails) delete E.save.fails[n];
    E.persist();
    E.sfx('win');
    E.confetti();
    const words = ['¡Muy bien!', '¡Genial!', '¡Fantástico!', '¡Estupendo!', '¡Bravo!', '¡Increíble!'];
    const word = words[n % words.length];
    const pop = {
      starsShown: 0,
      draw(g) {
        const w = 500, h = 500, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, word, E.W / 2, y + 70, 54, '#ffd23f', { stroke: '#a85a00', sw: 10 });
        E.text(g, playS.challenge ? '¡Desafío de la semana superado!' : 'Nivel ' + n + ' superado', E.W / 2, y + 135, 30, '#7a4b1f', { stroke: false });
        if (playS.duo) E.text(g, 'Abuela ' + playS.duo.score[0] + '  ·  Visita ' + playS.duo.score[1], E.W / 2, y + 330, 28, '#d2481f', { stroke: false });
        for (let s = 0; s < 3; s++) {
          const on = s < pop.starsShown;
          const r = s === 1 ? 62 : 50;
          E.star(g, E.W / 2 + (s - 1) * 125, y + 250 - (s === 1 ? 20 : 0), r, on ? '#ffd23f' : 'rgba(0,0,0,0.15)', on ? '#c07800' : null);
        }
        E.button('w_next', x + 70, y + h - 140, w - 140, 108, '¡Siguiente!', { color: '#3cb93c', size: 44, cb: () => E.closePopup(() => afterWin(n)) });
        E.button('w_map', x + w - 62, y - 22, 70, 70, '✕', { color: '#3f8fd9', r: 35, size: 34, cb: () => E.closePopup(goMap) });
      },
      back() { E.closePopup(goMap); },
    };
    E.openPopup(pop);
    for (let s = 0; s < st; s++) E.after(0.4 + s * 0.35, () => { pop.starsShown = s + 1; E.sfx('star', 1 + s * 0.2); });
    // preparar el siguiente nivel cuando ya han salido las estrellas (en la tablet puede tardar ~1 s)
    E.after(0.6 + st * 0.35, () => E.prefetch(n + 1));
  }
  function lose() {
    const P = playS.P, n = playS.n;
    E.save.fails = E.save.fails || {};
    E.save.fails[n] = (E.save.fails[n] || 0) + 1;
    E.save.streak = 0;
    E.persist();
    E.sfx('lose');
    const dead = P.dead;
    E.openPopup({
      draw(g) {
        const w = 500, h = 540, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, dead ? '¡Vaya!' : '¡Casi!', E.W / 2, y + 70, 54, '#ff7a3c', { stroke: '#fff', sw: 10 });
        E.text(g, dead ? (P.deadMsg || 'No quedan jugadas') : (GAME.theme.outOfMoves || 'Se acabaron los movimientos'), E.W / 2, y + 135, 28, '#7a4b1f', { stroke: false });
        E.rr(g, x + 40, y + 160, w - 80, 120, 20);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
        E.drawGoalBox(g, P.goals, x + 50, y + 165, w - 100, 110);
        // como en los originales: no hay movimientos gratis para seguir, hay que volver a intentarlo
        E.button('l_retry', x + 60, y + 330, w - 120, 110, 'Intentarlo otra vez', { color: '#3cb93c', size: 38, cb: () => E.closePopup(() => (playS.challenge ? openPreLevel(n, true) : openPreLevel(n))) });
        E.button('l_map', x + w - 62, y - 22, 70, 70, '✕', { color: '#e8453c', r: 35, size: 34, cb: () => E.closePopup(goMap) });
      },
      back() { E.closePopup(goMap); },
    });
  }

  // ---------------------------------------------------------------- bucle principal
  E.screen = null;
  E.setScreen = function (s) { E.screen = s; if (s.enter) s.enter(); };

  function toLocal(ev) {
    const r = cv.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * E.W, y: ((ev.clientY - r.top) / r.height) * E.H };
  }
  let activePointer = null;
  cv.addEventListener('pointerdown', (ev) => {
    ensureAudio();
    if (activePointer !== null) return;
    if (ev.pointerType === 'touch' && ev.width > 70 && ev.height > 70) return; // la palma de la mano no cuenta
    activePointer = ev.pointerId;
    const p = toLocal(ev);
    const b = findBtn(p.x, p.y);
    if (b) { pressed = b; return; }
    if (E.popup) return;
    E.screen && E.screen.down && E.screen.down(p.x, p.y);
  });
  cv.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== activePointer) return;
    const p = toLocal(ev);
    if (pressed) return;
    if (E.popup) return;
    E.screen && E.screen.move && E.screen.move(p.x, p.y);
  });
  function endPointer(ev, cancel) {
    if (ev.pointerId !== activePointer) return;
    activePointer = null;
    const p = toLocal(ev);
    if (pressed) {
      const b = pressed; pressed = null;
      const inside = p.x >= b.x - 10 && p.x <= b.x + b.w + 10 && p.y >= b.y - 10 && p.y <= b.y + b.h + 10;
      if (inside && !cancel && b.cb) { if (b.sound) E.sfx('click'); b.cb(); }
      return;
    }
    if (E.popup) return;
    E.screen && E.screen.up && E.screen.up(p.x, p.y);
  }
  cv.addEventListener('pointerup', (ev) => endPointer(ev, false));
  cv.addEventListener('pointercancel', (ev) => endPointer(ev, true));

  // Pausa automática al salir de la app o apagar la pantalla
  window.onAndroidPause = function () { if (E.screen === playS && playS.state === 'playing' && !E.popup) openPause(); E.sendData('salir', true); return 'ok'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.onAndroidPause(); else E.loadCalendar(); });
  E.loadCalendar();
  // Botón "atrás" de Android: devuelve 'exit' si hay que salir de la app.
  window.onAndroidBack = function () {
    if (E.popup) { if (E.popup.back) E.popup.back(); return 'ok'; }
    if (E.screen === playS) { if (playS.state === 'playing') openPause(); return 'ok'; }
    return 'exit';
  };

  // ---------------------------------------------------------------- niveles en segundo plano
  // Generar un nivel (con el bot jugándolo para comprobarlo) tarda varios segundos en la tablet.
  // Si el juego ofrece GAME.levelSteps(n) (un generador), se avanza unos milisegundos en cada
  // fotograma para no congelar la pantalla; si hace falta antes de tiempo, se termina de golpe.
  E.runGen = function (it) { let r; do r = it.next(); while (!r.done); return r.value; };
  const bg = { n: null, it: null };
  const bgQueue = [];
  E.prefetch = function (n) {
    if (!GAME.levelSteps) { GAME.makeLevel(n); return; }
    if (bg.n === n) return;
    const it = GAME.levelSteps(n);
    bg.n = it ? n : null; bg.it = it;
    if (!it && bgQueue.length) E.prefetch(bgQueue.shift());
  };
  // para después: se genera cuando acabe lo que se esté generando
  E.prefetchLater = function (n) { if (bg.it) { if (!bgQueue.includes(n)) bgQueue.push(n); } else E.prefetch(n); };
  function getLevel(n) {
    if (bg.it && bg.n === n) { E.runGen(bg.it); bg.it = null; bg.n = null; }
    return GAME.makeLevel(n);
  }
  function bgWork() {
    if (!bg.it) return;
    // durante la partida solo se trabaja con la pantalla quieta (mientras se piensa la jugada), sin tirones
    if (E.screen === playS && playS.state === 'playing' && playS.P && playS.P.busy) return;
    const t0 = performance.now();
    while (performance.now() - t0 < 6) {
      if (bg.it.next().done) { bg.it = null; bg.n = null; if (bgQueue.length) E.prefetch(bgQueue.shift()); return; }
    }
  }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    E.t += dt;
    E.dt = dt;
    for (let i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); }
    }
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      if (i >= tweens.length) continue;
      t.t += dt;
      if (t.t < 0) continue;
      if (!t.started) { t.started = true; for (const k in t.to) t.from[k] = t.o[k]; }
      const p = Math.min(1, t.t / t.dur);
      const e = t.ease(p);
      for (const k in t.to) t.o[k] = t.from[k] + (t.to[k] - t.from[k]) * e;
      if (p >= 1) {
        const idx = tweens.indexOf(t);
        if (idx >= 0) tweens.splice(idx, 1);
        if (t.done) t.done();
      }
    }
    if (E.shakeT > 0) E.shakeT = Math.max(0, E.shakeT - dt);
    if (E.screen && E.screen.update) E.screen.update(dt);

    if (E.fast) return; // repitiendo una partida a medias: solo la lógica
    prevBtns = btns; btns = [];
    ctx.setTransform(E.scale, 0, 0, E.scale, 0, 0);
    ctx.clearRect(0, 0, E.W, E.H);
    if (E.screen) E.screen.draw(ctx);
    if (E.popup) {
      // los botones del fondo no deben responder con una ventana abierta
      btns = [];
      drawPopup(ctx);
    }
    drawParts(ctx, dt);
    if (!stepping) { bgWork(); requestAnimationFrame(frame); }
  }
  // Para los robots de prueba: avanza el juego dt segundos sin esperar a la pantalla
  let stepping = false;
  E.step = function (dt) { stepping = true; try { frame(last + dt * 1000); } finally { stepping = false; } };

  window.addEventListener('resize', E.resize);
  document.addEventListener('visibilitychange', () => {
    if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); }
  });
  E.boot = function () {
    loadSkinImages();
    const qg = /[?&]gfx=(\w+)/.exec(location.search); // para probar: index.html?gfx=original
    E.wantGfx = qg ? qg[1] : E.save.gfx || 'baja'; // si es un estilo con imágenes, se pone en cuanto carguen
    E.setGfx(E.wantGfx);
    E.resize();
    E.setScreen(mapS);
    const J = E.save.resume;
    let resumed = false;
    if (J && J.ev && J.n) {
      try { if (levelPrint(getLevel(J.n)) === J.fp) { resumeLevel(J); resumed = true; } } catch (e) { resumed = false; }
      if (!resumed) { delete E.save.resume; E.persist(); E.setScreen(mapS); }
    }
    // arrancó bien: si era una versión descargada, se confirma (ver actualizaciones en MainActivity)
    setTimeout(() => { window.__arrancado = true; try { if (window.AndroidUpdate) window.AndroidUpdate.ok(); } catch (e) { /* sin Android */ } }, 3000);
    setTimeout(() => E.sendData('arranque', true), 15000);
    if (!resumed) { E.after(0.8, () => { E.prefetch(E.save.level); if (!E.weekly().done) E.prefetchLater(E.weekly().n); const fi = E.fiesta(); if (fi && !fi.done) E.prefetchLater(fi.n); }); E.after(1, () => { if (E.screen === mapS && !E.popup) fiestaGreeting(() => dailyWheel()); }); }
    requestAnimationFrame(frame);
  };
})();
