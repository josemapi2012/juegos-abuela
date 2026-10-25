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
    if (window.GL && GL.resize) GL.resize(cv, dpr); // dibujo con WebGL (solo los juegos que traen gl.js)
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
  // imagen que se carga la primera vez que se pide (para las muchas decoraciones del mapa)
  const lazyAsked = new Set();
  E.imgL = function (name) {
    if (imgs[name]) return imgs[name];
    if (!lazyAsked.has(name)) { lazyAsked.add(name); const im = new Image(); im.onload = () => { imgs[name] = im; }; im.src = E.privBase() + name + (/\.\w+$/.test(name) ? '' : '.png'); }
    return null;
  };
  function loadSkinImages() {
    const base = location.protocol === 'file:' ? 'file:///android_asset/privado/' : 'privado/';
    for (const [k, sk] of Object.entries(GAME.skins || {})) {
      if (!sk.images) continue;
      const scripts = (sk.scripts || []).filter((x) => !(sk.loadedScripts || []).includes(x));
      if (scripts.length) { // primero sus archivos de datos (efectos, mapa…), uno a uno
        sk.loadedScripts = (sk.loadedScripts || []).concat(scripts[0]);
        const sc = document.createElement('script');
        sc.onload = () => {
          if (window.KFX && !E.kfxData) { E.kfxData = window.KFX; sk.images = sk.images.concat(window.KFX.tex.map((t) => 'fx_' + t)); }
          if (window.KCUT && !sk.cutAdded) { sk.cutAdded = true; sk.images = sk.images.concat(window.KCUT.tex.map((t) => 'cut_' + t)); }
          loadSkinImages();
        };
        sc.onerror = () => loadSkinImages();
        sc.src = base + scripts[0]; document.head.appendChild(sc);
        return;
      }
      if (sk.loading) continue;
      sk.loading = true;
      const names = sk.images; let left = names.length, bad = false;
      for (const n of names) {
        const im = new Image();
        im.onload = () => { imgs[n] = im; if (--left === 0 && !bad) { sk.ready = true; if (E.wantGfx === k) E.setGfx(k); } };
        im.onerror = () => { bad = true; };
        im.src = base + n + (/\.\w+$/.test(n) ? '' : '.png');
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
    if (E.screen) E.music(E.screen === playS ? 'game' : 'map');
    const skf = GAME.skins && GAME.skins[E.gfx]; if (skf && skf.font) loadSkinFont(skf.font);
    applySkinFont();
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
  E.fontFamily = null; // la letra del juego original (estilo 'Original'), si está cargada
  E.font = (size, weight) => (E.fontFamily ? 'normal ' : (weight || '900') + ' ') + Math.round(size) + 'px ' + (E.fontFamily ? '"' + E.fontFamily + '",' : '') + '"Arial Rounded MT Bold","Roboto","Helvetica Neue",Arial,sans-serif';
  // carga la letra de un estilo (privado/font.otf) y la usa mientras ese estilo esté puesto
  let fontReady = false;
  function applySkinFont() {
    const sk = GAME.skins && GAME.skins[E.gfx];
    E.fontFamily = sk && sk.font && fontReady ? 'JuegoOriginal' : null;
    spriteCache.clear();
  }
  function loadSkinFont(file) {
    if (!window.FontFace || fontReady) return;
    try {
      const f = new FontFace('JuegoOriginal', 'url(' + E.privBase() + file + ')');
      f.load().then((ff) => { document.fonts.add(ff); fontReady = true; applySkinFont(); }).catch(() => {});
    } catch (e) { /* sin letra */ }
  }
  // exclamaciones del juego original ("¡Dulce!"): letra en tres capas y su animación
  const exclaims = [];
  E.exclaim = function (word, x, y) { const sk = E.skin('exclaim'); if (!sk) return false; exclaims.length = 0; exclaims.push({ word, x, y, t: 0, sk }); return true; }; // nunca dos a la vez
  E.need2D = () => exclaims.length > 0 || !!E.ovl || !!E.popup2D; // ¿pinta algo el lienzo 2D en este fotograma? (Dulces HD lo esconde si no)
  function drawExclaims(g, dt) {
    for (let i = exclaims.length - 1; i >= 0; i--) { const e = exclaims[i]; e.t += dt; if (e.sk(g, e.word, e.x, e.y, e.t)) exclaims.splice(i, 1); }
  }
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
  // dibuja una imagen estirándola por el centro y respetando las esquinas (como los paneles de los juegos)
  // b = ancho del borde en la imagen original; d = ancho del borde al dibujarlo
  E.nine = function (g, im, x, y, w, h, b, d) {
    if (!im) return;
    d = d == null ? b : d;
    const W = im.width, H = im.height, bw = Math.min(b, W / 2), bh = Math.min(b, H / 2), dw = Math.min(d, w / 2), dh = Math.min(d, h / 2);
    const sx = [0, bw, W - bw, W], sy = [0, bh, H - bh, H], dx = [x, x + dw, x + w - dw, x + w], dy = [y, y + dh, y + h - dh, y + h];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const sw = sx[i + 1] - sx[i], sh = sy[j + 1] - sy[j], ww = dx[i + 1] - dx[i], hh = dy[j + 1] - dy[j];
      if (sw > 0 && sh > 0 && ww > 0 && hh > 0) g.drawImage(im, sx[i], sy[j], sw, sh, dx[i], dy[j], ww, hh);
    }
  };
  // imagen teñida (multiplicar por un color), guardada para no repetir el trabajo
  const tintCache = new Map();
  E.tinted = function (name, rgb) {
    const im = E.img(name); if (!im) return null;
    const key = name + ':' + rgb;
    let c = tintCache.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = rgb; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
      tintCache.set(key, c);
    }
    return c;
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
      const bls = E.skin('btnStroke');
      if (label) E.text(g, label, x + w / 2, y + oy + (h - 6) / 2 + 1, opt.size || h * 0.42, '#fff', { stroke: bls ? bls(color) : E.shade(color, -0.5) });
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
        shape: opt.img ? 'img' : opt.shape || 'sq', grav: opt.grav != null ? opt.grav : 900,
        // opt.img: cada partícula es un trocito (de cuatro posibles) de esa imagen, como los cubos que se rompen en Toy Blast
        img: opt.img, q: (Math.random() * 4) | 0,
      });
    }
  };
  E.floatText = function (x, y, str, color, size) {
    // los mensajes grandes no se amontonan: uno nuevo quita al que siga en el mismo sitio
    if ((size || 34) >= 40) for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; if (q.text && q.size >= 40 && Math.abs(q.y - y) < 120 && Math.abs(q.x - x) < 200) parts.splice(i, 1); }
    parts.push({ x, y, vx: 0, vy: -90, life: 0, max: E.save && E.save.big ? 1.6 : 1.1, text: str, color: color || '#fff', size: (size || 34) * (E.save && E.save.big ? 1.15 : 1), grav: 0, rot: 0, vr: 0 });
  };
  // ---------------------------------------------------------------- efectos de partículas de los juegos originales
  // Intérprete de los efectos de King (Candy Crush / Pet Rescue): cada evento lanza varias partículas con los
  // parámetros del juego (cantidad, ángulo, velocidad, fuerza, frenado, tamaño y su cambio, color con el tiempo,
  // brillo aditivo y tinte del color de la pieza). Los datos vienen de privado/<juego>/fx.js (solo en la tablet).
  const kparts = [];
  const fxCmds = []; // con WebGL: lo que hay que dibujar de los efectos en este fotograma (GL.fx lo pinta)
  const KMAX = 420; // tope para que la tablet vaya fluida (con 260 se perdían los efectos de las jugadas grandes)
  const rnd = (a) => (a ? a[0] + Math.random() * (a[1] - a[0]) : 0);
  function kcurve(pts, k) {
    if (!pts) return 1;
    if (k <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (k - t0)) / Math.max(1e-6, t1 - t0); }
    return pts[pts.length - 1][1];
  }
  function kcolor(col, k) {
    if (!col || !col.length) return [255, 255, 255, 255];
    if (k <= col[0][0]) return col[0].slice(1);
    for (let i = 1; i < col.length; i++) if (k <= col[i][0]) { const a = col[i - 1], b = col[i], q = (k - a[0]) / Math.max(1e-6, b[0] - a[0]); return [1, 2, 3, 4].map((j) => a[j] + (b[j] - a[j]) * q); }
    return col[col.length - 1].slice(1);
  }
  // textura teñida (se guarda por color, redondeado para no llenar la memoria)
  const ktint = new Map();
  function ktex(name, rgb) {
    const im = E.img('fx_' + name); if (!im) return null;
    if (!rgb) return im;
    // color en 8 niveles por canal: con 16 salían miles de lienzos teñidos y la tablet iba a tirones (medido: 46 → 55 fps sin efectos)
    const q = rgb.map((v) => (v >> 5) * 32 + 16), key = name + ':' + q.join(',');
    let c = ktint.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(' + q.join(',') + ')'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
      ktint.set(key, c);
    }
    return c;
  }
  // lanza el evento 'ev' en (x,y); unit = píxeles por unidad del juego original; tint = [r,g,b] del color de la pieza
  E.kfx = function (ev, x, y, unit, tint, limit) { // limit: como mucho tantas partículas por emisor (los que emiten sin fin)
    const D = E.kfxData; if (!D || !D.ev[ev]) return false;
    let any = false;
    for (const pn of D.ev[ev]) {
      const p = D.p[pn]; if (!p || !p.tex) continue;
      any = true;
      const n = Math.min(limit || 1e9, p.rate > 0 && p.emit > 0 ? Math.min(p.max, Math.ceil(Math.max(p.emit, 0.05) / p.rate)) : p.max); // emissionRate de King: segundos entre partículas (emit < 0: sin fin, hasta el máximo)
      for (let i = 0; i < n && kparts.length < KMAX; i++) {
        const a = ((p.ang || 0) + (Math.random() - 0.5) * (p.spr || 0)) * Math.PI / 180;
        const r0 = rnd(p.rad) * unit, a0 = Math.random() * Math.PI * 2;
        const sp = rnd(p.vel) * unit;
        kparts.push({ p, x: x + Math.cos(a0) * r0 + (Math.random() - 0.5) * (p.area ? p.area[0] : 0) * unit, y: y + Math.sin(a0) * r0 + (Math.random() - 0.5) * (p.area ? p.area[1] : 0) * unit,
          ox: x, oy: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, fx: rnd(p.force && p.force[0]) * unit, fy: rnd(p.force && p.force[1]) * unit,
          cent: rnd(p.cent) * unit, damp: p.damp && rnd(p.damp) > 0 ? rnd(p.damp) : 1, mix: p.col2 ? (p.ext ? (Math.random() < 0.5 ? 0 : 1) : Math.random()) : 0, // amortiguación 0 = ninguna; mix: entre sus dos degradados
          size: rnd(p.size) * unit, grow: rnd(p.grow) * unit,
          rot: rnd(p.rot) * Math.PI / 180, rots: rnd(p.rots) * Math.PI / 180, life: Math.max(0.05, rnd(p.ttl) || 0.5), t: -Math.random() * Math.max(0, p.emit || 0),
          tint: p.tint && tint ? tint : null });
      }
    }
    return any;
  };
  // "cutscenes" 2D de los originales (p. ej. el rayado de Candy Crush): imágenes con claves de posición,
  // escala, color y visibilidad. Datos en privado/<juego>/cut.js (solo en la tablet).
  const kcuts = [];
  const tintImgCache = new Map();
  function tintImg(name, im, r, gg, b) {
    if (r >= 0.99 && gg >= 0.99 && b >= 0.99) return im;
    const key = name + ':' + [r, gg, b].map((v) => Math.round(v * 8)).join(',');
    let c = tintImgCache.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(' + [r, gg, b].map((v) => Math.round(Math.min(1, v) * 255)).join(',') + ')'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
      tintImgCache.set(key, c);
    }
    return c;
  }
  const keyAt = (keys, t, n) => {
    if (!keys.length) return null;
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], q = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * q); }
    return keys[keys.length - 1].slice(1);
  };
  E.kcut = function (name, x, y, unit) {
    const D = window.KCUT, c = D && D.c[name]; if (!c) return false;
    kcuts.push({ c, x, y, unit, t: 0 }); return true;
  };
  function drawKCuts(g, dt) {
    for (let i = kcuts.length - 1; i >= 0; i--) {
      const k = kcuts[i]; k.t += dt;
      if (k.t > k.c.dur) { kcuts.splice(i, 1); continue; }
      for (const o of k.c.objs) {
        const t = k.t - (o.t0 || 0); if (t < 0) continue;
        let vis = 1; for (const v of o.vis) if (t >= v[0]) vis = v[1];
        if (!vis) continue;
        const im = E.img('cut_' + o.tex); if (!im) continue;
        const tr = keyAt(o.tr, t) || [0, 0], sc = keyAt(o.sc, t) || [1, 1], col = keyAt(o.col, t) || [1, 1, 1, 1], rot = keyAt(o.rot, t);
        if (col[3] <= 0.01) continue;
        if (!g) { fxCmds.push({ im, x: k.x + tr[0] * k.unit, y: k.y + tr[1] * k.unit, w: im.width * sc[0] * k.unit, h: im.height * sc[1] * k.unit, rot: rot ? (rot[0] * Math.PI) / 180 : 0, alpha: Math.min(1, col[3]), tint: [col[0], col[1], col[2]].map((v) => Math.round(Math.min(1, v) * 255)) }); continue; }
        g.save(); g.globalAlpha = Math.min(1, col[3]);
        g.translate(k.x + tr[0] * k.unit, k.y + tr[1] * k.unit); if (rot) g.rotate((rot[0] * Math.PI) / 180);
        const w = im.width * sc[0] * k.unit, h = im.height * sc[1] * k.unit;
        g.drawImage(tintImg(o.tex, im, col[0], col[1], col[2]), -w / 2, -h / 2, w, h);
        g.restore();
      }
    }
  }
  function drawKParts(g, dt) {
    for (let i = kparts.length - 1; i >= 0; i--) {
      const q = kparts[i], p = q.p;
      q.t += dt;
      if (q.t < 0) continue;
      const k = q.t / q.life;
      if (k >= 1) { kparts.splice(i, 1); continue; }
      q.vx += q.fx * dt; q.vy += q.fy * dt;
      if (q.cent) { const dx = q.x - q.ox, dy = q.y - q.oy, d = Math.hypot(dx, dy) || 1; q.vx += (dx / d) * q.cent * dt; q.vy += (dy / d) * q.cent * dt; }
      if (q.damp !== 1) { const f = Math.pow(q.damp, dt * 60); q.vx *= f; q.vy *= f; }
      const vm = kcurve(p.velc, k);
      q.x += q.vx * vm * dt; q.y += q.vy * vm * dt;
      q.size = Math.max(0, q.size + q.grow * kcurve(p.growc, k) * dt);
      q.rot += q.rots * dt;
      let c = kcolor(p.col, k);
      if (q.mix && p.col2) { const c2 = kcolor(p.col2, k); c = c.map((v, j) => v + (c2[j] - v) * q.mix); }
      // paquete de texturas de Candy Crush (vfx_texturepack[_alpha].ffsb): la transparencia elige el canal (hasta 0,33 el verde,
      // hasta 0,66 el rojo, luego el azul) y lo fuerte que sale; el color tiñe la máscara de ese canal
      let tpTex = null;
      if (p.tp) {
        const a = Math.max(0, Math.min(1, c[3] / 255)), ch = a <= 0.33 ? 'g' : a <= 0.66 ? 'r' : 'b';
        const str = p.tp === 'a' ? Math.min(1, ch === 'g' ? a * 3.1 : ch === 'r' ? (a - 0.33) * 3 : (a - 0.66) * 3.1) : 1;
        tpTex = p.tex + '_' + p.tp + ch; c = [Math.min(255, c[0] * 1.3), Math.min(255, c[1] * 1.3), Math.min(255, c[2] * 1.3), str * 255];
      }
      const rgb = q.tint ? [Math.round(c[0] * q.tint[0] / 255), Math.round(c[1] * q.tint[1] / 255), Math.round(c[2] * q.tint[2] / 255)] : (c[0] < 250 || c[1] < 250 || c[2] < 250 ? [c[0] | 0, c[1] | 0, c[2] | 0] : null);
      if (!g) { // WebGL: la imagen sin teñir; el color va como tinte del dibujo
        const im0 = E.img('fx_' + (tpTex || p.tex)); if (!im0 || q.size < 0.5) continue;
        const fx = p.fx || 1, fy = p.fy || 1, cmd = { im: im0, x: q.x, y: q.y, w: q.size, h: q.size, rot: q.rot, alpha: Math.max(0, Math.min(1, c[3] / 255)), tint: rgb, blend: p.add ? 'add' : p.mul ? 'mul' : null, r: q.rnd || (q.rnd = Math.random()) };
        if (fx * fy > 1) { const fr = p.frames || [fx * fy, 0, 30], idx = (fr[1] + (Math.floor(q.t * fr[2]) % Math.max(1, fr[0]))) % (fx * fy); cmd.fr = [fx, fy, idx]; }
        fxCmds.push(cmd); continue;
      }
      const im = ktex(tpTex || p.tex, rgb); if (!im || q.size < 0.5) continue;
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, c[3] / 255));
      if (p.add) g.globalCompositeOperation = 'lighter';
      else if (p.mul) g.globalCompositeOperation = 'multiply'; // mezcla "Multiply" de King (el explotacolores de Pet Rescue)
      g.translate(q.x, q.y); if (q.rot) g.rotate(q.rot);
      const fx = p.fx || 1, fy = p.fy || 1;
      if (fx * fy > 1) {
        const fr = p.frames || [fx * fy, 0, 30], idx = (fr[1] + (Math.floor(q.t * fr[2]) % Math.max(1, fr[0]))) % (fx * fy);
        const fw = im.width / fx, fh = im.height / fy;
        g.drawImage(im, (idx % fx) * fw, Math.floor(idx / fx) * fh, fw, fh, -q.size / 2, -q.size / 2, q.size, q.size);
      } else g.drawImage(im, -q.size / 2, -q.size / 2, q.size, q.size);
      g.restore();
    }
  }
  const textCache = new Map();
  function textImg(str, size, color) {
    const key = str + '|' + size + '|' + color; let c = textCache.get(key);
    if (c) return c;
    if (document.fonts && !document.fonts.check(E.font(size))) return null;
    c = document.createElement('canvas'); const g0 = c.getContext('2d'); g0.font = E.font(size);
    c.width = Math.ceil(g0.measureText(str).width + size * 0.6); c.height = Math.ceil(size * 1.6);
    E.text(c.getContext('2d'), str, c.width / 2, c.height / 2, size, color);
    if (textCache.size > 80) textCache.clear();
    textCache.set(key, c); return c;
  }
  function drawParts(g, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = 1 - p.life / p.max;
      if (!g) { // WebGL: el texto o la forma con su color
        const al = Math.min(1, k * 1.6), sz = p.size * (0.4 + 0.6 * k);
        fxCmds.push(p.text ? { text: p.text, size: p.size, color: p.color, x: p.x, y: p.y, alpha: al } : { shape: p.shape, color: p.color, x: p.x, y: p.y, s: sz, rot: p.rot, alpha: al, img: p.img, q: p.q });
        continue;
      }
      g.save();
      g.globalAlpha = Math.min(1, k * 1.6);
      if (p.text) { // el texto flotante se dibuja una vez en una imagen y luego solo se mueve (más fluido en la tablet)
        const im = textImg(p.text, p.size, p.color);
        if (im) g.drawImage(im, p.x - im.width / 2, p.y - im.height / 2); else E.text(g, p.text, p.x, p.y, p.size, p.color);
      } else {
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = p.color;
        const s = p.size * (0.4 + 0.6 * k);
        if (p.shape === 'star') E.star(g, 0, 0, s, p.color);
        else if (p.shape === 'circle') { g.beginPath(); g.arc(0, 0, s / 2, 0, 7); g.fill(); }
        else if (p.shape === 'img' && p.img) { const iw = p.img.width, ih = p.img.height, w3 = iw * 0.34, h3 = ih * 0.34; g.drawImage(p.img, iw * (0.15 + (p.q % 2) * 0.36), ih * (0.15 + ((p.q / 2) | 0) * 0.36), w3, h3, -s / 2, -s / 2, s, s); } // un trocito de dentro, sin el canto: no parece un bloque entero
        else g.fillRect(-s / 2, -s / 2, s, s * 0.7);
      }
      g.restore();
    }
  }
  E.confetti = function () {
    // con WebGL (Rescate Animal HD) el confeti de partículas del juego original, en tres explosiones arriba
    if (window.GL && E.kfxData && E.kfxData.ev.Confetti) { [[0.25, 0.28, 0], [0.75, 0.28, 0.15], [0.5, 0.18, 0.3]].forEach(([fx, fy, d]) => E.after(d, () => E.kfx('Confetti', E.W * fx, E.H * fy, E.W / 700))); return; }
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
  let sfxBus = null;
  function ensureAudio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = 0.6;
        master.connect(ac.destination);
        // los sonidos grabados pasan por un compresor suave: varios a la vez no saturan
        sfxBus = ac.createDynamicsCompressor(); sfxBus.threshold.value = -18; sfxBus.knee.value = 12; sfxBus.ratio.value = 4; sfxBus.attack.value = 0.003; sfxBus.release.value = 0.15;
        sfxBus.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
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
  E.cycleSound = function () { E.save.vol = (E.vol() + 2) % 3; E.save.sound = E.save.vol > 0; E.persist(); if (master) master.gain.value = [0, 0.22, 0.6][E.save.vol]; E.sfx('click'); E.music(E.screen === playS ? 'game' : 'map'); };
  E.soundIcon = () => ['🔇', '🔉', '🔊'][E.vol()];
  // sonidos y música originales (estilo 'Original'): archivos en privado/<juego>/snd/, solo en la tablet
  const sndPool = {};
  E.privBase = () => (location.protocol === 'file:' ? 'file:///android_asset/privado/' : 'privado/');
  // cada sonido tiene 3 reproductores ya cargados: crear o clonar un Audio en plena partida hacía dar tirones a la tablet
  const sndLoad = (n) => {
    if (!sndPool[n]) sndPool[n] = [0, 1, 2].map(() => { const a = new Audio(E.privBase() + 'snd/' + n + '.ogg'); a.preload = 'auto'; try { a.load(); } catch (e) {} return a; });
    return sndPool[n];
  };
  // con Web Audio (si la app deja leer sus archivos): cada sonido se descodifica una vez y suena al instante, sin tirones
  const bufs = {}, bufAsked = {};
  const bufLoad = (n) => {
    if (bufAsked[n] || !ensureAudio()) return; bufAsked[n] = true;
    try {
      const x = new XMLHttpRequest(); x.open('GET', E.privBase() + 'snd/' + n + '.ogg'); x.responseType = 'arraybuffer';
      x.onload = () => { if (!x.response || !x.response.byteLength) return; ac.decodeAudioData(x.response, (b) => { bufs[n] = b; }, () => {}); };
      x.send();
    } catch (e) { /* se queda con Audio() */ }
  };
  E.sndInfo = () => ({ webaudio: Object.keys(bufs).length, pedidos: Object.keys(bufAsked).length, estado: ac && ac.state }); // para comprobar en la tablet
  E.playFile = function (n, vol) {
    try {
      if (ac && bufs[n]) {
        if (ac.state === 'suspended') ac.resume();
        const src = ac.createBufferSource(), gn = ac.createGain(); src.buffer = bufs[n]; gn.gain.value = Math.max(0, Math.min(1, vol));
        src.connect(gn); gn.connect(sfxBus || ac.destination); src.start(); return;
      }
      bufLoad(n);
      const pool = sndLoad(n);
      const c = pool.find((a) => a.paused || a.ended) || pool.reduce((x, y) => (x.currentTime > y.currentTime ? x : y)); // si suenan los 3, el más avanzado
      c.volume = Math.max(0, Math.min(1, vol)); c.currentTime = 0;
      const pr = c.play(); if (pr && pr.catch) pr.catch(() => {});
    } catch (e) { /* sin sonido */ }
  };
  // precarga los sonidos del estilo (también las voces), para que no se carguen al sonar por primera vez
  E.preloadSfx = function () {
    const sm = E.skin('sfx'); if (!sm || !E.vol()) return;
    for (const v of Object.values(sm)) {
      if (!v) continue;
      const lists = typeof v === 'function' ? [0.5, 1, 1.2, 1.5, 2, 3].map((p) => { try { return v(p); } catch (e) { return []; } }) : [v];
      for (const l of lists) for (const n of Array.isArray(l) ? l : [l]) if (n) { bufLoad(n); sndLoad(n); }
    }
  };
  let musicEl = null, musicName = null;
  E.music = function (which) {
    const sk = E.skin('music'), v = sk && sk[which], n = typeof v === 'function' ? v() : v; // el nombre puede depender del nivel
    if (!n || !E.vol() || E.fast) { if (musicEl) { musicEl.pause(); musicName = null; } return; }
    if (musicName === n && musicEl && !musicEl.paused) { musicEl.volume = [0, 0.12, 0.3][E.vol()]; return; }
    if (musicEl) musicEl.pause();
    musicEl = new Audio(E.privBase() + 'snd/' + n + '.ogg'); musicEl.loop = true; musicEl.volume = [0, 0.12, 0.3][E.vol()]; musicName = n;
    const pr = musicEl.play(); if (pr && pr.catch) pr.catch(() => {});
  };
  E.musicPause = function (on) { if (musicEl) { if (on) musicEl.pause(); else if (musicName && E.vol()) { const pr = musicEl.play(); if (pr && pr.catch) pr.catch(() => {}); } } };
  // voces grabadas del narrador del juego original ("Sweet!", "Sugar Crush!"...): se pueden quitar en Ajustes
  E.isNarrator = (name) => /^vo\d$|^sugarcrush$/.test(name);
  const sfxLast = {};
  E.sfx = function (name, p) {
    if (!E.vol() || E.fast) return;
    if (E.save.noNarr && E.isNarrator(name)) return;
    const sm = E.skin('sfx');
    if (sm && sm[name] !== undefined) { // sonido del juego original (si un nombre vale null, se calla)
      const v = sm[name]; if (!v) return;
      const list = typeof v === 'function' ? v(p || 1) : v;
      const n = Array.isArray(list) ? list[(Math.random() * list.length) | 0] : list;
      if (!n) return;
      // el mismo sonido muchas veces seguidas (p. ej. cada bloque al caer) se oye duro: uno cada 50 ms como mucho
      const now = performance.now(); if (now - (sfxLast[n] || 0) < 50) return; sfxLast[n] = now;
      const db = (E.skin('sfxVol') || {})[n] || 0; // volumen del sonido en el juego original (dB)
      E.playFile(n, [0, 0.35, 0.9][E.vol()] * Math.pow(10, db / 20));
      return;
    }
    if (!ac) return;
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
  // animaciones por claves de los juegos originales (privado/<juego>/anim.js): escala, posición y giro en el tiempo
  E.kanim = function (name, t, fromVisible) {
    const A = window.KANIM && window.KANIM[name]; if (!A) return null;
    let f = t * A.speed;
    if (fromVisible && A.sc.length) { // empezar donde la escala deja de ser 0
      let i0 = 0; while (i0 < A.sc.length - 1 && A.sc[i0 + 1][1] === 0 && A.sc[i0 + 1][2] === 0) i0++;
      f += A.sc[i0][0];
    } else if (A.sc.length) f += A.sc[0][0];
    const end = Math.max(A.sc.length ? A.sc[A.sc.length - 1][0] : 0, A.tr.length ? A.tr[A.tr.length - 1][0] : 0);
    const at = (keys, d) => { if (!keys.length) return d; if (f <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) { const a = keys[i - 1], b = keys[i], q = (f - a[0]) / Math.max(1e-6, b[0] - a[0]); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * q); } return keys[keys.length - 1].slice(1); };
    const sc = at(A.sc, [1, 1]), tr = at(A.tr, [0, 0]), rot = at(A.rot, [0]);
    return { sx: sc[0], sy: sc[1], tx: tr[0], ty: tr[1], rot: rot[0], done: f >= end };
  };
  E.openPopup = function (p) {
    E.sfx('popIn'); // sonido de ventana del juego original (los demás estilos no tienen)
    p.anim = 0; p.t0 = E.t;
    E.popup = p;
    E.tween(p, { anim: 1 }, 0.35, { ease: E.ease.outBack });
  };
  E.closePopup = function (cb) {
    const p = E.popup;
    if (!p) { if (cb) cb(); return; }
    if (!p.closing) E.sfx('popOut');
    p.closing = true; p.tc = E.t;
    E.tween(p, { anim: 0 }, p.closeDur || (E.skin('popupKanim') && window.KANIM ? 0.42 : 0.18), { ease: E.ease.inQuad, done: () => { if (E.popup === p) E.popup = null; if (cb) cb(); } });
  };
  function drawPopup(g) {
    const p = E.popup;
    E.popup2D = true; // si WebGL la dibuja, vuelve a false abajo
    if (window.GL && GL.popup && (p.win || p.pre || p.lost || p.gl) && GL.popup(p, g)) { E.popup2D = false; return; } // la dibuja WebGL entera (fondo, animación y botones)
    g.save();
    g.fillStyle = 'rgba(0,0,0,' + (0.5 * Math.min(1, p.anim)) + ')';
    g.fillRect(0, 0, E.W, E.H);
    let sx = Math.max(0.01, p.anim), sy = sx;
    if (E.skin('popupKanim') && window.KANIM) { // ventana que crece y rebota como en el juego original
      const a = p.closing ? E.kanim('OnDisappearShrink', E.t - p.tc, false) : E.kanim('OnAppearGrow', E.t - (p.t0 || 0), true);
      if (a) { sx = Math.max(0.01, a.sx); sy = Math.max(0.01, a.sy); }
    }
    g.translate(E.W / 2, E.H / 2);
    g.scale(sx, sy);
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
    if (window.GL && GL.home) { // pantalla principal del juego original dibujada con WebGL (Rescate Animal HD)
      const MS0 = missionState();
      if (GL.home({ level: E.save.level, chest: Math.min(CHEST, E.save.chest || 0), CHEST, streak: E.save.streak || 0, fiesta: E.fiesta(), weekly: E.weekly(),
        missions: missionList().filter((m) => !MS0.done.includes(m.id)).length, play: () => openPreLevel(E.save.level), album: () => E.openAlbum(), settings: () => E.openSettings(),
        openMissions: () => E.openMissions(), openWeekly: () => E.openWeekly(), openFiesta: () => E.openFiesta() })) return;
    }
    const th = GAME.theme;
    const off = mapS.scroll + E.H;
    // los HD dibujan con WebGL el mapa entero (fondo, camino, carteles y niveles); los toques siguen siendo los de aquí
    const bodyGL = !!(window.GL && GL.mapBody && GL.mapBody({ scroll: mapS.scroll, off, gap: NODE_GAP, world: WORLD, level: E.save.level,
      first: Math.max(1, Math.max(0, Math.floor((mapS.scroll - E.H * 0.2) / NODE_GAP) - 2)), last: Math.floor((mapS.scroll + E.H * 1.2) / NODE_GAP) + 2,
      pos: (i) => { const p = nodePos(i); return { x: p.x, y: p.y + off }; }, stars: (i) => E.save.stars[i] || 1, hard: (i) => E.hardness(i), worldName: (w) => E.worldName(w), mascot: th.mascot }));
    if (!bodyGL) {
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
    }
    // Dulces HD: la barra de arriba y la de navegación de Candy Crush, con WebGL encima del mapa (sin botón "Jugar":
    // como en el original, el nivel se abre tocando su círculo)
    if (window.GL && GL.mapChrome) {
      const MS1 = missionState();
      if (GL.mapChrome({ level: E.save.level, chest: Math.min(CHEST, E.save.chest || 0), CHEST, streak: E.save.streak || 0, fiesta: E.fiesta(), weekly: E.weekly(),
        missions: missionList().filter((m) => !MS1.done.includes(m.id)).length, play: () => openPreLevel(E.save.level), album: () => E.openAlbum(), settings: () => E.openSettings(),
        openMissions: () => E.openMissions(), openWeekly: () => E.openWeekly(), openFiesta: () => E.openFiesta() })) return;
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
      gl: { kind: 'reward', title, sub, icons: icons || [], ok: () => E.closePopup(then) }, // datos para el dibujo WebGL
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
      gl: { kind: 'album', items: () => L.map((a) => ({ id: a.id, name: a.name, value: a.value, tiers: a.tiers, t: E.save.ach[a.id] || 0 })), close: () => E.closePopup() },
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
    // el estilo puede dar su ruleta: imagen del juego original ({ face, arrow, n }) o sus colores ({ colors, rim, hub })
    const WS = E.skin('wheel'), base = [[ids[0]], [bk(0)], [ids[1]], [bk(1), bk(2)], [ids[2]], [ids[0], bk(bi.length - 1), ids[1]]];
    const segs = Array.from({ length: (WS && WS.n) || base.length }, (_, i) => base[i % base.length]);
    const cols = (WS && WS.colors) || ['#ff7a7a', '#ffd23f', '#7ad7ff', '#9be37b', '#d59bff', '#ffb366'];
    const st = { rot: 0, spinning: false, done: false, prize: null };
    const finish = () => E.closePopup(then);
    const spin = () => {
      if (st.spinning) return;
      st.spinning = true;
      const k = (Math.random() * segs.length) | 0;
      // la casilla k termina arriba, bajo la flecha
      const target = Math.PI * 2 * 5 - ((k + 0.5) / segs.length) * Math.PI * 2;
      E.sfx('magic');
      let seg = 0; const tick = () => { if (st.done) return; const k2 = Math.floor((st.rot / (Math.PI * 2)) * segs.length); if (k2 !== seg) { seg = k2; E.sfx('wheelTick'); } E.after(0.03, tick); }; tick();
      E.tween(st, { rot: target }, 3.2, { ease: (t) => 1 - Math.pow(1 - t, 3), done: () => {
        st.done = true; st.prize = segs[k];
        for (const id of segs[k]) giveItem(id);
        E.save.gift = E.today(); E.persist();
        E.sfx(E.skin('sfx') && E.skin('sfx').wheelWin ? 'wheelWin' : 'win'); E.confetti(); E.say('¡Te ha tocado un regalo!');
      } });
    };
    // con WebGL (Rescate Animal HD) es el "Regalo diario" de Pet Rescue: 7 regalos por días seguidos jugados, el 7.º el bonus
    const DAYS = [base[0], base[1], base[2], base[3], base[4], base[5], ids.slice(0, 3)];
    let day = 1; { const d = new Date(); for (;;) { d.setDate(d.getDate() - 1); const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); if (!E.save.stats.days[k] || day > 400) break; day++; } }
    day = ((day - 1) % 7) + 1;
    const claim = () => {
      if (st.done) return;
      st.done = true; st.prize = DAYS[day - 1];
      for (const id of st.prize) giveItem(id);
      E.save.gift = E.today(); E.persist();
      E.sfx(E.skin('sfx') && E.skin('sfx').wheelWin ? 'wheelWin' : 'win'); E.confetti(); E.say('¡Te ha tocado un regalo!');
    };
    E.openPopup({
      gl: { kind: 'daily', day, prizes: DAYS.map((L) => L.map((id) => startDef(id).icon)), st, claim, finish,
        wheel: { segs: segs.map((L) => L.map((id) => startDef(id).icon)), cols, WS, spin } }, // la ruleta, para los HD que la dibujan con WebGL
      draw(g) {
        const w = 540, h = 700, x = (E.W - w) / 2, y = (E.H - h) / 2, cx = E.W / 2, cy = y + 330, R = 200;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, 'Regalo del día', cx, y + 55, 40, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        const face = WS && WS.face && E.img(WS.face), arrow = WS && WS.arrow && E.img(WS.arrow);
        if (face) { // la rueda dibujada del juego original, girando
          const d = R * 2.16; g.save(); g.translate(cx, cy); g.rotate(st.rot); g.drawImage(face, -d / 2, -d / 2, d, d); g.restore();
        } else if (WS && WS.rim) { // aro con bombillas, gajos con brillo y buje en los colores del juego
          g.beginPath(); g.arc(cx, cy, R + 22, 0, 7); g.fillStyle = WS.rim; g.fill();
          g.beginPath(); g.arc(cx, cy, R + 22, 0, 7); g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.25)'; g.stroke();
          for (let i = 0; i < segs.length; i++) {
            const a0 = st.rot + (i / segs.length) * Math.PI * 2 - Math.PI / 2, a1 = a0 + (Math.PI * 2) / segs.length, c0 = cols[i % cols.length];
            const gr = g.createRadialGradient(cx, cy, R * 0.15, cx, cy, R); gr.addColorStop(0, E.shade(c0, 0.35)); gr.addColorStop(0.75, c0); gr.addColorStop(1, E.shade(c0, -0.2));
            g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
          }
          const on = Math.floor(E.t * 4) % 2;
          for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * (R + 11), cy + Math.sin(a) * (R + 11), 6, 0, 7); g.fillStyle = (i + on) % 2 ? '#fff6c0' : '#ffd23f'; g.fill(); }
        } else {
          for (let i = 0; i < segs.length; i++) {
            const a0 = st.rot + (i / segs.length) * Math.PI * 2 - Math.PI / 2, a1 = a0 + (Math.PI * 2) / segs.length;
            g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fillStyle = cols[i % cols.length]; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
          }
        }
        for (let i = 0; i < segs.length; i++) { // premios de cada casilla
          const am = st.rot + ((i + 0.5) / segs.length) * Math.PI * 2 - Math.PI / 2, many = segs[i].length > 1;
          segs[i].forEach((id, j) => { const d = R * (many ? 0.42 + j * 0.2 : 0.62); E.emoji(g, startDef(id).icon, cx + Math.cos(am) * d, cy + Math.sin(am) * d, many ? 38 : 50); });
        }
        if (!face) { g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.fillStyle = (WS && WS.hub) || '#fff'; g.fill(); if (WS && WS.rim) { g.lineWidth = 5; g.strokeStyle = WS.rim; g.stroke(); } }
        if (arrow) { const ah = 96, aw = (ah * arrow.width) / arrow.height; g.drawImage(arrow, cx - aw / 2, cy - R - 46, aw, ah); }
        else { g.beginPath(); g.moveTo(cx - 22, cy - R - 26); g.lineTo(cx + 22, cy - R - 26); g.lineTo(cx, cy - R + 14); g.closePath(); g.fillStyle = (WS && WS.arrowColor) || '#e8453c'; g.fill(); if (WS) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); } }
        if (st.done) {
          E.text(g, '¡Te ha tocado!', cx, y + h - 170, 34, '#d2481f', { stroke: '#fff', sw: 6 });
          E.button('wh_ok', x + 120, y + h - 120, w - 240, 90, '¡Estupendo!', { color: '#3cb93c', size: 36, cb: finish });
        } else if (!st.spinning) {
          E.button('wh_go', x + 120, y + h - 120, w - 240, 90, '¡Girar!', { color: '#ff8a1f', size: 40, cb: spin });
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
      gl: { kind: 'missions', items: () => L.map((m) => ({ id: m.id, name: m.name, k: m.k, v: Math.min(m.k, st.prog[m.id] || 0), done: st.done.includes(m.id) })), close: () => E.closePopup() },
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
    if (window.GL && E.screen !== mapS) { goMap(); E.after(0.6, () => run(0)); } // como en los originales: se vuelve al mapa y allí sale el siguiente nivel
    else run(0);
  }
  E.afterWin = afterWin;
  E.testWin = () => win(); // para revisar las ventanas de ganar y perder
  E.testLose = () => lose();
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
    const pre = { n, spec, goals, SB, chosen, help, hard: E.hardness(n), have: (b) => (help ? Infinity : E.save.inv[b.id] || 0) }; // datos para el dibujo WebGL
    const popP = {
      hard: E.isHard(n), pre, // los estilos originales cambian de color en los niveles difíciles
      draw(g) {
        if (window.GL && GL.popup && GL.popup(popP, g)) return; // ventana del juego original dibujada con WebGL
        const extra = (SB.length ? 150 : 0) + (E.save.streak ? 50 : 0) + 80 + (help ? 46 : 0);
        const w = 520, h = (spec.text ? 600 : 520) + extra, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        const skr = E.skin('ribbon');
        if (skr) skr(g, x + 40, y - 40, w - 80, 96);
        else { E.rr(g, x + 60, y - 30, w - 120, 76, 30); g.fillStyle = GAME.theme.ribbon || GAME.theme.accent; g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke(); }
        E.text(g, playS.challenge ? (playS.challenge.kind === 'fiesta' ? playS.challenge.emoji + ' Nivel especial' : '🏅 Desafío semanal') : 'Nivel ' + n, E.W / 2, y + 8, playS.challenge ? 36 : 44, '#fff');
        if (E.isHard(n)) E.text(g, E.hardness(n) === 2 ? '💀 ¡Nivel superdifícil! 💀' : '💀 ¡Nivel difícil!', E.W / 2, y + 82, 30, E.hardness(n) === 2 ? '#5b2a86' : '#ff5a5a', { stroke: '#fff', sw: 6 });
        E.text(g, 'Objetivo', E.W / 2, y + 128, 34, GAME.theme.popText || GAME.theme.hudText || '#7a4b1f', { stroke: false });
        const skg = E.skin('goalBox');
        if (skg) skg(g, x + 40, y + 160, w - 80, 180);
        else { E.rr(g, x + 40, y + 160, w - 80, 180, 20); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }
        E.drawGoalBox(g, goals, x + 50, y + 165, w - 100, 170);
        if (spec.text) E.wrapText(g, spec.text, E.W / 2, y + 395, w - 60, 27, GAME.theme.popText || GAME.theme.hudText || '#7a4b1f', { stroke: false });
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
          E.text(g, 'Potenciadores para empezar', E.W / 2, yy + 10, 24, GAME.theme.popText || GAME.theme.hudText || '#7a4b1f', { stroke: false });
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
    };
    pre.play = () => { const bonus = streakBonus(); for (const id of chosen) { if (!help) E.save.inv[id] = Math.max(0, (E.save.inv[id] || 0) - 1); bonus.push(id); } E.persist(); E.closePopup(() => startLevel(n, null, bonus)); };
    pre.toggle = (b) => { const have = pre.have(b); if (chosen.has(b.id)) chosen.delete(b.id); else if (have > 0) chosen.add(b.id); else E.floatText(E.W / 2, E.H * 0.6, 'Se consiguen con el cofre de estrellas y las rachas', '#fff', 24); };
    pre.close = () => E.closePopup();
    pre.duo = () => { E.duoOn = !E.duoOn; };
    E.openPopup(popP);
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
    if (!E.fast) E.preloadSfx(); // sonidos y voces listos antes de jugar
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
    const gl = window.GL && GL.layout && GL.layout(); // el dibujo WebGL pone sus propias medidas (las del juego original)
    const top = gl ? gl.top : 170, bottom = gl ? gl.bottom : 140;
    playS.layout = { hudH: top, barH: bottom, board: { x: 10, y: top + 8, w: E.W - 20, h: E.H - top - bottom - 16 } };
    if (playS.P && playS.P.layout) playS.P.layout(playS.layout.board);
  };
  const DUO_NAMES = ['la abuela', 'la visita'];
  const canAct = () => playS.state === 'playing' && !playS.P.busy && !E.popup;
  E.explain = (t) => explain(t); // para las pruebas
  function explain(text) {
    E.say(text);
    E.openPopup({
      gl: { kind: 'info', title: '¿Qué es esto?', text, ok: () => E.closePopup() }, // datos para el dibujo WebGL
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
    if (playS.state !== 'playing') { if (playS.P && playS.P.finaleOn && playS.P.skipFinale) playS.P.skipFinale(); return; } // "Toca para saltar" el final
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
      // el estilo puede poner la animación de victoria del juego original antes de la ventana (los robots no la esperan)
      const winShow = () => { const sw = E.skin('winShow'), ov = sw && !window.__pasada && sw(); if (ov) E.ovl = Object.assign({ t: 0, done: win }, ov); else win(); };
      E.after(0.5, () => (P.finale ? P.finale(winShow) : winShow()));
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
    E.glBoard = false;
    let glr;
    if (window.GL && GL.play && (glr = GL.play({ P, L, n: playS.n, spec: playS.spec, flyers: playS.flyers, booster: playS.booster, state: playS.state, boosterLeft, useBooster, openPause, ask: () => { if (playS.state === 'playing' && playS.P.describe) playS.ask = !playS.ask; }, askOn: playS.ask,
      prompt: playS.booster ? (GAME.boosters.find((bb) => bb.id === playS.booster) || {}).prompt || 'Toca una ficha' : playS.ask ? 'Toca una pieza para saber qué es' : null, // avisos sobre el tablero
      duo: playS.duo ? { name: DUO_NAMES[playS.duo.turn], turn: playS.duo.turn, score: playS.duo.score } : null }))) {
      if (glr === 'tiles2d') { // WebGL pinta fondo, tablero, cabecera y barra; las piezas, aquí encima (Dulces HD)
        g.save();
        if (E.shakeT > 0) g.translate((Math.random() - 0.5) * 14 * E.shakeT, (Math.random() - 0.5) * 14 * E.shakeT);
        P.draw(g);
        g.restore();
        for (const f of playS.flyers) GAME.drawGoalIcon(g, f.gl, f.x, f.y, 52 * f.s);
      }
      return;
    }
    // fondo
    const skbg = E.skin('playBg');
    const bgk = E.skin('bgKey');
    const bg = E.sprite('bg' + GAME.id + (bgk ? bgk(playS.n) : ''), E.W, E.H, skbg ? (c, w, h) => skbg(c, w, h, L) : (c, w, h) => {
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
    const ska = E.skin('hudAll');
    if (ska) { // el estilo dibuja la cabecera entera, como en el juego original
      ska(g, E.W, L.hudH, {
        P, goals: P.goals, n: playS.n, spec: playS.spec, timeTotal: playS.timeTotal, timeLeft: E.timeLeft,
        askOn: playS.ask, ask: (x, y, w, h) => E.hotspot('ask', x, y, w, h, () => { if (playS.state !== 'playing' || !playS.P.describe) return; playS.ask = !playS.ask; }),
      });
      return;
    }
    const skh = E.skin('hud');
    if (skh) skh(g, E.W, L.hudH);
    else E.panel(g, 8, 8, E.W - 16, L.hudH - 12, { border: th.hudBorder || '#2e6f8e', top: th.hudTop || '#fff8e6', bottom: th.hudBottom || '#f3dfb5', r: 26 });
    // objetivos
    const gx = 22, gy = 20, gw = 300, gh = L.hudH - 40;
    E.text(g, 'Objetivo', gx + gw / 2, gy + 14, 22, th.hudLabel || th.hudText || '#7a4b1f', { stroke: false, weight: '800' });
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
    E.text(g, playS.timeTotal ? '⏱ Tiempo' : th.movesLabel || 'Movimientos', mx + mw / 2, 34, 22, th.hudLabel || th.hudText || '#7a4b1f', { stroke: false, weight: '800' });
    if (!skh) { E.rr(g, mx, 52, mw, 92, 20); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(); }
    if (playS.timeTotal) {
      const t = Math.max(0, Math.ceil(E.timeLeft())), lowT = t <= 10;
      E.text(g, Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), mx + mw / 2, 100, lowT ? 56 + Math.sin(E.t * 8) * 4 : 56, lowT ? '#ff4040' : th.movesColor || '#3b6fb6', { stroke: th.movesStroke || '#fff', sw: 8 });
    } else {
      const low = P.moves <= 5;
      const ms = low ? 64 + Math.sin(E.t * 8) * 4 : 64;
      E.text(g, P.moves === Infinity ? '∞' : String(Math.max(0, P.moves)), mx + mw / 2, 100, ms, low ? '#ff4040' : th.movesColor || '#3b6fb6', { stroke: th.movesStroke || '#fff', sw: 8 });
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
    let ver0 = 0; try { ver0 = window.AndroidUpdate ? window.AndroidUpdate.version() : 0; } catch (e) { ver0 = 0; }
    E.openPopup({
      gl: { kind: 'pause', resume: () => E.closePopup(), settings: () => E.closePopup(() => E.openSettings(openPause)), leave: () => E.closePopup(confirmExit), version: ver0 },
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
  let secretTaps = 0, secretT = 0;
  // teclado para poner a mano el nivel actual: el mapa salta a ese nivel
  function openLevelPad() {
    let val = '';
    const press = (k) => {
      if (k === '⌫') val = val.slice(0, -1);
      else if (k === 'OK') { const n = parseInt(val, 10); if (n >= 1) { E.save.level = n; E.save.resume = null; E.persist(); E.closePopup(() => E.goMap()); } }
      else if (val.length < 5) val += k;
    };
    E.openPopup({
      gl: { kind: 'pad', val: () => val, press, cancel: () => E.closePopup() }, // datos para el dibujo WebGL
      draw(g) {
        const w = 520, h = 760, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, 'Ir al nivel', E.W / 2, y + 60, 40, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        E.rr(g, x + 60, y + 100, w - 120, 90, 18); g.fillStyle = '#fff'; g.fill();
        E.text(g, val || '—', E.W / 2, y + 147, 54, '#333', { stroke: false });
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
        keys.forEach((k, i) => {
          const bx = x + 50 + (i % 3) * 145, by = y + 215 + Math.floor(i / 3) * 112;
          E.button('lp_' + i, bx, by, 130, 98, k, { color: k === 'OK' ? '#3cb93c' : k === '⌫' ? '#e8453c' : '#3f8fd9', size: 40, cb: () => press(k) });
        });
        E.button('lp_x', x + 130, y + h - 100, w - 260, 76, 'Cancelar', { color: '#9aa3ad', size: 30, cb: () => E.closePopup() });
      },
      back() { E.closePopup(); },
    });
  }
  E.openSettings = function (back) {
    const close = () => E.closePopup(back);
    const opts = [
      ['Sonido', () => ['No', 'Bajo', 'Alto'][E.vol()], () => E.cycleSound()],
      ['Letra grande', () => (E.save.big ? 'Sí' : 'No'), () => { E.save.big = !E.save.big; }],
      ['Leer en voz alta', () => (E.save.voice ? 'Sí' : 'No'), () => { E.save.voice = !E.save.voice; if (E.save.voice) E.say('Leeré en voz alta las explicaciones'); }],
      ['Ayudas a la', () => (E.save.hand === 'izq' ? 'izquierda' : 'derecha'), () => { E.save.hand = E.save.hand === 'izq' ? 'der' : 'izq'; }],
    ];
    const GFX = { baja: 'Sencillos', nueva: 'Nuevos', original: 'Como el original', real: 'Original' };
    if (E.gfxList().length > 1 && !window.GL) opts.unshift(['Gráficos', () => GFX[E.gfx], () => { const L = E.gfxList(); E.save.gfx = L[(L.indexOf(E.gfx) + 1) % L.length]; E.setGfx(E.save.gfx); }]);
    if (GAME.usesDrag) opts.push(['Deslizar', () => ({ suave: 'Suave', normal: 'Normal', firme: 'Firme' })[E.save.drag || 'normal'], () => { E.save.drag = { suave: 'normal', normal: 'firme', firme: 'suave' }[E.save.drag || 'normal']; }]);
    const sm = E.skin('sfx');
    if (sm && Object.keys(sm).some((k) => E.isNarrator(k) && sm[k])) opts.push(['Voces del narrador', () => (E.save.noNarr ? 'No' : 'Sí'), () => { E.save.noNarr = !E.save.noNarr; }]);
    if (GAME.usesAim) opts.push(['Disparar', () => (E.save.confirmShot ? 'Tocando a mamá' : 'Al soltar'), () => { E.save.confirmShot = !E.save.confirmShot; }]);
    const secret = () => { const now = Date.now(); secretTaps = now - secretT < 1500 ? secretTaps + 1 : 1; secretT = now; if (secretTaps >= 5) { secretTaps = 0; openLevelPad(); } };
    E.openPopup({
      gl: { kind: 'settings', opts: opts.map(([name, val, act]) => ({ name, val, act: () => { act(); E.persist(); } })), close, secret }, // datos para el dibujo WebGL
      draw(g) {
        const w = 500, h = 170 + opts.length * 96 + 100, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '⚙️ Ajustes', E.W / 2, y + 60, 42, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        // oculto: 5 toques seguidos en el título para elegir el nivel (para quien cuida la tablet)
        E.hotspot('st_secret', x + 80, y + 20, w - 160, 80, secret);
        opts.forEach(([name, val, act], i) => E.button('st_' + i, x + 40, y + 110 + i * 96, w - 80, 82, name + ': ' + val(), { color: '#3f8fd9', size: 28, cb: () => { act(); E.persist(); } }));
        E.button('st_ok', x + 110, y + h - 120, w - 220, 90, 'Listo', { color: '#3cb93c', size: 34, cb: close });
      },
      back() { close(); },
    });
  };
  // confirmación para no perder la partida por un toque sin querer
  function confirmExit() {
    const leave = () => E.closePopup(() => { logAttempt('s'); E.save.fails = E.save.fails || {}; E.save.fails[playS.n] = (E.save.fails[playS.n] || 0) + 1; journalEnd(); E.save.streak = 0; E.persist(); goMap(); });
    E.openPopup({
      gl: { kind: 'exit', stay: () => E.closePopup(), leave },
      draw(g) {
        const w = 500, h = 430, x = (E.W - w) / 2, y = (E.H - h) / 2;
        E.panel(g, x, y, w, h, GAME.theme.panel);
        E.text(g, '¿Salir del nivel?', E.W / 2, y + 70, 42, GAME.theme.accent, { stroke: '#fff', sw: 8 });
        E.text(g, 'Si sales, tendrás que empezarlo otra vez', E.W / 2, y + 135, 26, '#7a4b1f', { stroke: false });
        E.button('cx_no', x + 50, y + 185, w - 100, 96, 'No, seguir jugando', { color: '#3cb93c', size: 32, cb: () => E.closePopup() });
        E.button('cx_si', x + 50, y + 300, w - 100, 90, 'Sí, salir', { color: '#e8453c', size: 30, cb: leave });
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
      starsShown: 0, win: { n, score: P.score || 0, hard: E.hardness(n), next: () => E.closePopup(() => afterWin(n)) }, // datos para el dibujo WebGL
      draw(g) {
        if (window.GL && GL.popup && GL.popup(pop, g)) return; // ventana del juego original dibujada con WebGL
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
    const retry = () => E.closePopup(() => (playS.challenge ? openPreLevel(n, true) : openPreLevel(n)));
    const popL = {
      lost: { n, dead, msg: dead ? (P.deadMsg || 'No quedan jugadas') : null, goals: P.goals, score: P.score || 0, retry, close: () => E.closePopup(goMap) }, // datos para el dibujo WebGL
      draw(g) {
        if (window.GL && GL.popup && GL.popup(popL, g)) return;
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
    };
    E.openPopup(popL);
  }

  // ---------------------------------------------------------------- bucle principal
  E.screen = null;
  E.setScreen = function (s) { E.screen = s; if (s.enter) s.enter(); E.music(s === playS ? 'game' : 'map'); };

  function toLocal(ev) {
    const r = cv.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * E.W, y: ((ev.clientY - r.top) / r.height) * E.H };
  }
  let activePointer = null;
  // los toques se escuchan en la página y no en el lienzo: con WebGL, el lienzo 2D vacío se esconde (visibility) para que el
  // navegador no lo mezcle en cada fotograma, y un lienzo escondido no recibe toques
  const inp = document.body;
  inp.addEventListener('pointerdown', (ev) => {
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
  inp.addEventListener('pointermove', (ev) => {
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
  inp.addEventListener('pointerup', (ev) => endPointer(ev, false));
  inp.addEventListener('pointercancel', (ev) => endPointer(ev, true));

  // Pausa automática al salir de la app o apagar la pantalla
  window.onAndroidPause = function () { if (E.screen === playS && playS.state === 'playing' && !E.popup) openPause(); E.sendData('salir', true); return 'ok'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { window.onAndroidPause(); E.musicPause(true); } else { E.loadCalendar(); E.musicPause(false); } });
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
    prevBtns = btns; btns = []; E.popup2D = false;
    ctx.setTransform(E.scale, 0, 0, E.scale, 0, 0);
    ctx.clearRect(0, 0, E.W, E.H);
    if (drawCarga(ctx)) { if (!stepping) requestAnimationFrame(frame); return; } // sin esto el bucle se paraba en la carga
    if (E.screen) E.screen.draw(ctx);
    if (E.popup) {
      // los botones del fondo no deben responder con una ventana abierta
      btns = [];
      drawPopup(ctx);
    }
    // efectos: si WebGL pinta este fotograma, también los dibuja él (encima de todo); si no, el lienzo de siempre
    const glfx = !!(window.GL && GL.fx && GL.fxOn && GL.fxOn());
    if (glfx) { fxCmds.length = 0; drawKCuts(null, dt); drawKParts(null, dt); drawParts(null, dt); GL.fx(fxCmds); }
    if (window.GL && GL.frameEnd) GL.frameEnd(); // WebGL: pinta lo de este fotograma (tablero y, si la hay, su ventana) o se oculta
    if (!glfx) { drawKCuts(ctx, dt); drawKParts(ctx, dt); drawParts(ctx, dt); }
    drawExclaims(ctx, dt);
    if (E.ovl) { // animación por encima de todo (p. ej. la de "nivel superado" del original); al acabar sigue el juego
      E.ovl.t += dt; E.ovl.draw(ctx, E.ovl.t);
      if (E.ovl.t >= E.ovl.dur) { const d = E.ovl.done; E.ovl = null; if (d) d(); }
    }
    if (!stepping) { bgWork(); requestAnimationFrame(frame); }
  }
  // Para los robots de prueba: avanza el juego dt segundos sin esperar a la pantalla
  let stepping = false;
  E.step = function (dt) { stepping = true; try { frame(last + dt * 1000); } finally { stepping = false; } };

  window.addEventListener('resize', E.resize);
  document.addEventListener('visibilitychange', () => {
    if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); }
  });
  // pantalla de carga del juego original (GL.carga en games/<juego>/gl.js, piezas en privado/carga/) mientras se cargan
  // sus imágenes: así nunca se ve el dibujo sencillo al abrir la app. Piezas: { f, x, y (fracción de la pantalla),
  // w (fracción del ancho), anim: 'giro' | 'columpio', piv: [px, py] (punto de giro en la pieza) }
  const carga = { img: {}, t0: 0 };
  function drawCarga(g) {
    const C = window.GL && GL.carga;
    if (!C || E.wantGfx !== 'real' || (E.gfx === 'real' && (!GL.listo || GL.listo()))) return false;
    if (!carga.pedido) { carga.pedido = true; carga.t0 = E.t; for (const p of [C.fondo].concat(C.piezas || [])) if (p && p.f) { const im = new Image(); im.onload = () => { carga.img[p.f] = im; }; im.src = E.privBase() + 'carga/' + p.f; } }
    if (E.t - carga.t0 > 20) return false; // si no cargan (sin imágenes), el dibujo de siempre
    g.fillStyle = C.color || '#000'; g.fillRect(0, 0, E.W, E.H);
    const F = C.fondo && carga.img[C.fondo.f];
    if (F) {
      if (C.fondo.modo === 'mosaico') { const k = (C.fondo.k || 1) * (E.W / 750), w = F.width * k, h = F.height * k; for (let y = 0; y < E.H; y += h) for (let x = 0; x < E.W; x += w) g.drawImage(F, x, y, w + 0.5, h + 0.5); }
      else g.drawImage(F, 0, 0, E.W, E.H);
    }
    for (const p of C.piezas || []) {
      const im = carga.img[p.f]; if (!im) continue;
      const w = p.w * E.W, h = (w * im.height) / im.width, x = p.x * E.W, y = p.y * E.H, t = E.t - carga.t0;
      const [px, py] = p.piv || [0.5, 0.5];
      g.save(); g.translate(x, y);
      if (p.anim === 'giro') g.rotate(t * (p.vel || 6));
      else if (p.anim === 'columpio') g.rotate(Math.sin(t * (p.vel || 2.2)) * (p.amp || 0.12));
      g.drawImage(im, -w * px, -h * py, w, h); g.restore();
    }
    return true;
  }
  E.boot = function () {
    loadSkinImages();
    const qg = /[?&]gfx=(\w+)/.exec(location.search); // para probar: index.html?gfx=original
    // el original en cuanto carguen sus imágenes (sin ellas, como en la página pública, se queda en 'baja'); con WebGL
    // (games/<juego>/gl.js) es una copia 1:1 del juego y no hay otro estilo que elegir
    E.wantGfx = qg ? qg[1] : window.GL ? 'real' : E.save.gfx || 'real';
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
