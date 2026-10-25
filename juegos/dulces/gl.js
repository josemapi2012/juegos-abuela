// "Dulces HD": Dulces dibujado con WebGL (PixiJS) como el Candy Crush real, con las piezas y escenas de su APK
// (tools/gl_export.py y tools/king_scene.py con JUEGO=dulces → privado/dulces/gl/). Medidas de la captura del
// emulador (1080×1920, referencias/capturas_reales/cc_emu_nivel1.png). Las reglas siguen en game.js. El motor llama a:
//   GL.resize(lienzo, dpr) · GL.layout() · GL.boardLayout(C, R, área) · GL.play(estado) · GL.fx(…) · GL.frameEnd()
// Primera fase: WebGL pinta el fondo, el tablero, la cabecera y la barra de potenciadores; los caramelos y sus efectos
// siguen en el lienzo de siempre, encima (GL.play devuelve 'tiles2d'). Sin WebGL, todo como siempre (Canvas 2D).
(function () {
  const GL = (window.GL = {});
  let app = null, view = null, root = null, ready = false, failed = false, usedThisFrame = false, shownFrames = 0;
  const atlases = {}; // nombre → { k, base: [BaseTexture], frames }
  const texCache = new Map(); // 'atlas:pieza' → Texture
  const ATLASES = ['candy', 'striped', 'hud', 'hudboost', 'boosters', 'boosterbar', 'progress', 'mainpop', 'popups', 'levelmenu', 'mainmenu', 'navbar', 'map', 'exclaim', 'particles', 'endlevel', 'candies', 'main', 'hll', 'hll2', 'characters', 'egp', 'candymix', 'tiffi', 'yeti', 'boostervfx', 'dragonnest'];
  const REF = 1080; // ancho de las capturas de referencia: las medidas de abajo van en sus píxeles
  const px = (v) => (v * E.W) / REF; // píxeles de la captura → unidades del juego (600 de ancho)

  const glOk = (() => { try { const c = document.createElement('canvas'); return !!(window.PIXI && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } })();
  // pantalla de carga de Candy Crush (game_logo_refresh: fondo envelope_pattern, el logo y la bomba de color que gira)
  GL.carga = { color: '#3ab4f2', fondo: { f: 'fondo.png', modo: 'mosaico', k: 1 }, piezas: [{ f: 'logo.png', x: 0.5, y: 0.37, w: 0.8 }, { f: 'giro.png', x: 0.5, y: 0.68, w: 0.2, anim: 'giro', vel: 3 }] };
  const on = () => glOk && !failed && ready && typeof E !== 'undefined' && E.gfx === 'real';
  GL.listo = () => !glOk || failed || ready; // la pantalla de carga sigue hasta que esté todo (o no haya WebGL)

  // ---------------------------------------------------------------- arranque
  function ensureApp(cv) {
    if (app || !glOk) return;
    try {
      view = document.createElement('canvas'); view.id = 'gl';
      view.style.position = 'absolute'; view.style.left = '0'; view.style.top = '0'; view.style.display = 'none';
      cv.parentNode.insertBefore(view, cv);
      cv.style.position = 'relative'; cv.style.zIndex = '1'; // el lienzo de siempre queda encima (ventanas, textos)
      app = new PIXI.Application({ view, width: 10, height: 10, backgroundAlpha: 0, antialias: true, autoStart: false, sharedTicker: false });
      view.style.pointerEvents = 'none'; // los toques siguen yendo al lienzo de siempre
      app.ticker.stop();
      root = new PIXI.Container(); app.stage.addChild(root); GL._stage = app.stage; // para revisar desde la consola
      loadAtlases();
    } catch (e) { failed = true; console.warn('WebGL no disponible', e); }
  }
  function loadAtlases() {
    const base = E.privBase() + 'gl/';
    let left = ATLASES.length + 1;
    const xs = new XMLHttpRequest(); xs.open('GET', base + 'scenes.json'); // escenas y animaciones de King (tools/king_scene.py)
    xs.onload = () => { try { SCN = JSON.parse(xs.responseText); } catch (e) { console.warn('escenas', e); } if (--left === 0) ready = true; };
    xs.onerror = () => { if (--left === 0) ready = true; };
    xs.send();
    for (const name of ATLASES) {
      const x = new XMLHttpRequest(); x.open('GET', base + name + '.json');
      x.onload = () => {
        try {
          const d = JSON.parse(x.responseText);
          atlases[name] = { k: d.k, frames: d.frames, base: d.images.map((f) => PIXI.BaseTexture.from(base + f)) };
        } catch (e) { console.warn('atlas', name, e); }
        if (--left === 0) ready = true;
      };
      x.onerror = () => { if (--left === 0) ready = true; };
      x.send();
    }
  }
  // textura de una pieza de atlas ('hud:cat_icon'); su tamaño lógico es el de las escenas de King
  function tex(id) {
    let t = texCache.get(id); if (t) return t;
    const [a, n] = id.split(':'), A = atlases[a], f = A && A.frames[n]; if (!f) return null;
    const k = A.k;
    t = new PIXI.Texture(A.base[f.i], new PIXI.Rectangle(f.x, f.y, f.w, f.h), new PIXI.Rectangle(0, 0, f.W, f.H), new PIXI.Rectangle(f.ox, f.oy, f.w, f.h));
    t.k = k; texCache.set(id, t); return t;
  }
  GL.tex = tex;

  // ---------------------------------------------------------------- dibujo inmediato (se rehace cada fotograma)
  const pools = { spr: [], nine: [], gfx: [], txt: new Map() };
  let nSpr = 0, nNine = 0, nGfx = 0;
  function begin() {
    const drop = (list) => { for (const c of list) { if (c.poolBox) { drop(c.removeChildren()); c.destroy({ children: false }); } else if (c.sceneTmp) c.destroy({ children: true }); } };
    drop(root.removeChildren()); // poolBox: sus hijos se reutilizan (y dentro pueden ir piezas de escena, que se destruyen)
    nSpr = nNine = nGfx = 0; for (const t of pools.txt.values()) t.usedNow = false;
  }
  // imagen: o = { w, h, sc, ax, ay, rot, alpha, tint, add, flipX, flipY }
  function img(t, x, y, o) {
    if (typeof t === 'string') t = tex(t); if (!t) return null;
    o = o || {};
    let s = pools.spr[nSpr]; if (!s) s = pools.spr[nSpr] = new PIXI.Sprite(); nSpr++;
    s.texture = t; s.anchor.set(o.ax != null ? o.ax : 0.5, o.ay != null ? o.ay : 0.5);
    const k = t.k || 1, w = o.w != null ? o.w : (t.orig.width / k) * (o.sc || 1) * px(1) * 2, h = o.h != null ? o.h : (t.orig.height / k) * (o.sc || 1) * px(1) * 2;
    s.scale.set((w / t.orig.width) * (o.flipX ? -1 : 1), (h / t.orig.height) * (o.flipY ? -1 : 1)); // escala directa: el setter de width conserva el signo anterior
    s.position.set(x, y); s.rotation = o.rot || 0; s.alpha = o.alpha != null ? o.alpha : 1;
    s.tint = o.tint != null ? o.tint : 0xffffff; s.blendMode = o.add ? PIXI.BLEND_MODES.ADD : o.mul ? PIXI.BLEND_MODES.MULTIPLY : PIXI.BLEND_MODES.NORMAL;
    root.addChild(s); return s;
  }
  // panel estirable de 9 trozos; ins = [izq, arriba, dcha, abajo] en píxeles de la lámina lógica
  function nine(t, x, y, w, h, ins, o) {
    if (typeof t === 'string') t = tex(t); if (!t) return null;
    o = o || {};
    if (o.half) { // lámina de media anchura (King la pinta dos veces, la derecha en espejo)
      const o2 = Object.assign({}, o, { half: false }), i2 = [ins[0], ins[1], 0, ins[3]];
      const l = nine(t, x, y, w / 2, h, i2, o2), r = nine(t, 0, 0, w / 2, h, i2, o2);
      l.addChild(r); r.scale.set(-1, 1); r.position.set(l.width * 2, 0); return l; // la derecha cuelga de la izquierda (se mueven juntas)
    }
    const k = t.k || 1;
    let p = pools.nine[nNine]; if (!p) { p = pools.nine[nNine] = new PIXI.NineSlicePlane(t); } else if (p.children.length) p.removeChildren(); nNine++;
    p.texture = t;
    p.leftWidth = ins[0] * k; p.topHeight = ins[1] * k; p.rightWidth = ins[2] * k; p.bottomHeight = ins[3] * k;
    const sc = o.inset != null ? o.inset : 0.5; // grosor de los bordes respecto a la lámina
    p.width = w / sc; p.height = h / sc; p.scale.set(sc);
    p.position.set(x, y); p.alpha = o.alpha != null ? o.alpha : 1; p.tint = o.tint != null ? o.tint : 0xffffff;
    root.addChild(p); return p;
  }
  function gfx() { let g = pools.gfx[nGfx]; if (!g) g = pools.gfx[nGfx] = new PIXI.Graphics(); nGfx++; g.clear(); g.position.set(0, 0); g.scale.set(1); g.renderable = true; g.isMask = false; g.alpha = 1; g.blendMode = PIXI.BLEND_MODES.NORMAL; root.addChild(g); return g; } // una que fue máscara (otro fotograma) vuelve a pintarse
  // texto con la letra del juego (CurseCasual, la de Pet Rescue) y su contorno
  // mano izquierda (Ajustes, "Ayudas a la izquierda"): la barra de abajo al revés, como en el lienzo 2D. Se recoloca en espejo
  // lo que se pinta dentro de fn (y sus zonas de toque); textos e iconos centrados solo cambian de sitio, sin darles la vuelta
  function withHand(fn) {
    if (E.save.hand !== 'izq') return fn();
    const n0 = root.children.length, hs = E.hotspot;
    E.hotspot = (id, x, y, w, h, cb) => hs(id, E.W - x - w, y, w, h, cb);
    try { fn(); } finally { E.hotspot = hs; }
    for (let i = n0; i < root.children.length; i++) {
      const o = root.children[i]; o.x = E.W - o.x;
      if (o instanceof PIXI.Text) o.anchor.x = 1 - o.anchor.x;
      else if (!(o.anchor && Math.abs(o.anchor.x - 0.5) < 0.01)) o.scale.x = -o.scale.x;
    }
  }
  function text(str, x, y, size, o) {
    o = o || {};
    const key0 = str + '|' + size + '|' + (o.fill || '') + '|' + (o.stroke || '') + '|' + (o.sw || 0) + '|' + (o.wrap || 0) + (o.shadow ? 's' : '');
    let key = key0, t = pools.txt.get(key);
    for (let i = 1; t && t.usedNow; i++) { key = key0 + '#' + i; t = pools.txt.get(key); } // el mismo texto dos veces en pantalla
    if (!t) {
      t = new PIXI.Text(str, new PIXI.TextStyle({ fontFamily: [E.fontFamily || 'JuegoOriginal', 'Arial Rounded MT Bold', 'sans-serif'], fontSize: size * 2, fill: o.fill || '#ffffff',
        stroke: o.stroke || '#000000', strokeThickness: (o.sw || 0) * 2, lineJoin: 'round', wordWrap: !!o.wrap, wordWrapWidth: (o.wrap || 0) * 2, align: o.align || 'center', dropShadow: !!o.shadow, dropShadowAlpha: 0.35, dropShadowDistance: 3, dropShadowAngle: Math.PI / 2, dropShadowBlur: 0 }));
      t.scale.set(0.5); pools.txt.set(key, t);
      if (pools.txt.size > 400) for (const [kk, v] of pools.txt) { if (!v.usedNow) { v.destroy(true); pools.txt.delete(kk); } if (pools.txt.size < 300) break; }
    }
    t.usedNow = true; t.scale.set(0.5); t.anchor.set(o.ax != null ? o.ax : 0.5, o.ay != null ? o.ay : 0.5); t.position.set(x, y); t.alpha = o.alpha != null ? o.alpha : 1;
    root.addChild(t); return t;
  }
  // explicaciones nuestras (texto largo): con "Letra grande" un 18 % mayor, en varias líneas de maxW y, si no caben en maxH,
  // un poco más pequeñas hasta que quepan (el tamaño se calcula una vez por texto)
  const fitSize = new Map();
  function fitHelp(str, x, y, maxW, maxH, size, o) {
    const big = E.save && E.save.big ? 1.18 : 1, key = str + '|' + Math.round(maxW) + '|' + Math.round(maxH) + '|' + size + '|' + big;
    let sz = fitSize.get(key);
    if (sz == null) {
      sz = size * big;
      for (let i = 0; i < 14; i++) { const t = text(str, -9999, -9999, sz, Object.assign({}, o, { wrap: maxW })); const h = t.height; root.removeChild(t); t.usedNow = false; if (h <= maxH) break; sz *= 0.92; }
      fitSize.set(key, sz);
    }
    return text(str, x, y, sz, Object.assign({}, o, { wrap: maxW }));
  }
  GL.img = img; GL.nine = nine; GL.gfx = gfx; GL.text = text;

  // ---------------------------------------------------------------- efectos encima de todo (partículas de King, chispas, textos)
  // El motor los mueve y deja aquí lo que toca dibujar en este fotograma (ver fxCmds en engine.js): imagen con su recorte,
  // tamaño, giro, transparencia, tinte y mezcla; forma de color (cuadradito, círculo, estrella, trocito de imagen); o texto.
  GL.fxOn = () => on() && usedThisFrame;
  const imgTex = new Map(), shapeTex = {};
  function texOf(im, fr) {
    let base = imgTex.get(im); if (!base) { base = PIXI.Texture.from(im); imgTex.set(im, base); if (imgTex.size > 300) imgTex.delete(imgTex.keys().next().value); }
    if (!fr) return base;
    const key = '_fr' + fr.join(','); if (base[key]) return base[key];
    const fw = base.width / fr[0], fh = base.height / fr[1];
    return (base[key] = new PIXI.Texture(base.baseTexture, new PIXI.Rectangle((fr[2] % fr[0]) * fw, Math.floor(fr[2] / fr[0]) * fh, fw, fh)));
  }
  function shape(kind) { // formas blancas que se tiñen con el color de cada chispa
    if (shapeTex[kind]) return shapeTex[kind];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff';
    if (kind === 'circle') { g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); }
    else if (kind === 'star') E.star(g, 32, 32, 30, '#fff');
    else g.fillRect(0, 0, 64, 64);
    return (shapeTex[kind] = PIXI.Texture.from(c));
  }
  const hexCache = new Map();
  function hexOf(col) {
    let v = hexCache.get(col); if (v != null) return v;
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(col || '');
    v = m ? parseInt(m[1].length === 3 ? m[1].replace(/./g, (ch) => ch + ch) : m[1], 16) : 0xffffff;
    hexCache.set(col, v); return v;
  }
  // presupuesto de partículas: en las explosiones grandes (bomba de color con especiales) llegaban a cubrir más de 3
  // pantallas por fotograma y la GPU de la tablet no da para tanto. Pasado el presupuesto se pinta una parte (siempre las
  // mismas: cada partícula trae su número al azar) un poco más opacas
  const FX_BUDGET = 0.9;
  GL.fx = function (cmds) {
    let area = 0; for (const c of cmds) if (c.im) area += c.w * c.h;
    const k = area / (E.W * E.H) > FX_BUDGET ? (FX_BUDGET * E.W * E.H) / area : 1;
    for (const c of cmds) {
      if (k < 1 && c.im && c.r != null) { if (c.r > k) continue; c.alpha = Math.min(1, c.alpha * Math.min(2, 1 / k)); }
      try { fxOne(c); } catch (e) { /* un efecto raro no debe parar el juego */ }
    }
  };
  function fxOne(c) {
    {
      if (c.text) { text(c.text, c.x, c.y, c.size, { fill: c.color, stroke: 'rgba(60,30,10,0.75)', sw: Math.max(2, c.size * 0.2), alpha: c.alpha }); return; }
      if (c.im) {
        const t = texOf(c.im, c.fr), ch = (v) => Math.max(0, Math.min(255, v | 0)), tn = c.tint ? (ch(c.tint[0]) << 16) | (ch(c.tint[1]) << 8) | ch(c.tint[2]) : 0xffffff;
        img(t, c.x, c.y, { w: c.w, h: c.h, rot: c.rot, alpha: c.alpha, tint: tn, add: c.blend === 'add', mul: c.blend === 'mul' });
        return;
      }
      if (c.shape === 'img' && c.img) { // un trocito de dentro de la imagen
        const base = texOf(c.img), iw = base.width, ih = base.height, key = '_q' + c.q;
        const t = base[key] || (base[key] = new PIXI.Texture(base.baseTexture, new PIXI.Rectangle(iw * (0.15 + (c.q % 2) * 0.36), ih * (0.15 + ((c.q / 2) | 0) * 0.36), iw * 0.34, ih * 0.34)));
        img(t, c.x, c.y, { w: c.s, h: c.s, rot: c.rot, alpha: c.alpha });
        return;
      }
      const sq = !c.shape || c.shape === 'sq';
      img(shape(sq ? 'sq' : c.shape), c.x, c.y, { w: c.s, h: sq ? c.s * 0.7 : c.s, rot: c.rot, alpha: c.alpha, tint: hexOf(c.color) });
    }
  }
  GL.frameEnd = function () {
    if (!app) return;
    // sobre la partida, el lienzo WebGL va debajo del de siempre; con una ventana WebGL sobre otra pantalla (el mapa), encima
    const z = usedThisFrame && !playedThisFrame ? '2' : '0'; if (view.style.zIndex !== z) view.style.zIndex = z;
    if (usedThisFrame) { if (view.style.display === 'none') view.style.display = 'block'; app.renderer.render(app.stage); shownFrames++; }
    else if (view.style.display !== 'none') view.style.display = 'none';
    // en la partida todo va aquí: el lienzo 2D de encima, vacío, se esconde (el navegador lo mezclaba igual con la pantalla
    // entera); vuelve cuando tiene algo (exclamaciones, una ventana 2D)
    if (cv2d) { const vis = playedThisFrame && E.need2D && !E.need2D() ? 'hidden' : 'visible'; if (cv2d.style.visibility !== vis) cv2d.style.visibility = vis; } // los toques los recoge la página (engine.js)
    usedThisFrame = false; playedThisFrame = false;
  };

  // ---------------------------------------------------------------- escenas de King (tools/king_scene.py)
  // Se dibujan nodo a nodo: posición · giro · escala de cada SceneObject, su Sprite (pivote, panel de 9 trozos, tamaño,
  // color de vértices, volteo) y sus animaciones (claves de posición, escala, giro, color y cambio de dibujo con su curva).
  // o = { show: {nombre: true} (los marcados "never" que el juego enseña), play: {animación: t0}, text: {nombre: texto} }
  let SCN = null;
  const EASE = {
    linear: (k) => k, quad: (k) => k * k, cubic: (k) => k * k * k, quart: (k) => k * k * k * k, quint: (k) => k * k * k * k * k,
    sine: (k) => 1 - Math.cos((k * Math.PI) / 2), back: (k) => k * k * (2.70158 * k - 1.70158), expo: (k) => (k === 0 ? 0 : Math.pow(2, 10 * (k - 1))),
  };
  function ease(tw, mode, k) {
    const f = EASE[tw] || EASE.linear;
    if (mode === 'easeOut') return 1 - f(1 - k);
    if (mode === 'easeInOut') return k < 0.5 ? f(k * 2) / 2 : 1 - f((1 - k) * 2) / 2;
    return f(k);
  }
  function track(keys, t) { // valor de una pista en t (la curva va en la clave de llegada)
    if (t <= keys[0].time) return [keys[0], keys[0], 0];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i].time) { const a = keys[i - 1], b = keys[i]; return [a, b, ease(b.tw, b.ease, (t - a.time) / Math.max(1e-6, b.time - a.time))]; }
    const l = keys[keys.length - 1]; return [l, l, 0];
  }
  function animDur(A) { let d = 0; for (const v of Object.values(A)) d = Math.max(d, v[v.length - 1].time); return d; }
  // una animación de King en t segundos; las que van por fotogramas (OnAppearGrow) corren a 90 por segundo y empiezan
  // cuando la escala deja de ser 0, como en el motor (E.kanim)
  function animXf(name, t) {
    const A = SCN && SCN.anims[name]; if (!A) return null;
    const dur = animDur(A); let tt = t;
    if (dur > 10) { const S = A.Scale; let f0 = S ? S[0].time : 0; if (S) for (let i = 0; i < S.length - 1 && S[i + 1].x === 0; i++) f0 = S[i + 1].time; tt = f0 + t * 90; }
    const r = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, done: tt >= dur };
    if (A.Translation) { const [p, q, k] = track(A.Translation, tt); r.tx = p.x + (q.x - p.x) * k; r.ty = p.y + (q.y - p.y) * k; }
    if (A.Scale) { const [p, q, k] = track(A.Scale, tt); r.sx = p.x + (q.x - p.x) * k; r.sy = p.y + (q.y - p.y) * k; }
    if (A.Rotation) { const [p, q, k] = track(A.Rotation, tt); r.rot = p.z + (q.z - p.z) * k; }
    return r;
  }
  const PIV = { center: [0.5, 0.5], top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5], topLeft: [0, 0], topRight: [1, 0], bottomLeft: [0, 1], bottomRight: [1, 1] };
  function sceneDraw(node, M, o, alpha) {
    if (node.vis === 'never' && !(o.show && o.show[node.n])) return;
    if ((o.hide && o.hide[node.n]) || (node.n && node.n[0] === '#')) return; // los "#…" son nodos de lógica del juego
    let t = node.t || [0, 0], sc = node.s || [1, 1], r = node.r || 0, a = alpha, frameObj = null, tint = null;
    if (o.off && o.off[node.n]) t = [t[0] + o.off[node.n][0], t[1] + o.off[node.n][1]]; // desplazamiento de una línea de tiempo
    for (const an of node.anim || []) { // animaciones activas de este nodo
      const t0 = o.play && o.play[an.name] != null ? o.play[an.name] : an.play ? 0 : null; if (t0 == null) continue;
      const A = SCN.anims[an.data]; if (!A) continue;
      const dur = animDur(A); let tt = ((o.time - t0) * (an.speed || 1)) - (an.delay || 0) + (an.start || 0);
      if (tt < 0) tt = 0; if (an.loop !== 0 && dur > 0) tt %= dur; else tt = Math.min(tt, dur);
      if (A.Translation) { const [p, q, k] = track(A.Translation, tt); t = [p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k]; }
      if (A.Scale) { const [p, q, k] = track(A.Scale, tt); sc = [p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k]; }
      if (A.Rotation) { const [p, q, k] = track(A.Rotation, tt); r = p.z + (q.z - p.z) * k; }
      const C = A.Color || A.VertexColor; if (C) { const [p, q, k] = track(C, tt); a *= (p.a + (q.a - p.a) * k) / 255; tint = p.rgb; }
      if (A.Frame) { let f0 = A.Frame[0]; for (const f of A.Frame) if (f.time <= tt) f0 = f; frameObj = f0.obj; }
    }
    const L = new PIXI.Matrix().scale(sc[0], sc[1]).rotate((r * Math.PI) / 180).translate(t[0], t[1]);
    const W = M.clone().append(L);
    if (node.spr && node.spr.a) {
      const sp = node.spr, tx = tex(sp.a);
      if (tx) {
        const k = tx.k || 1, nw = tx.orig.width / k, nh = tx.orig.height / k;
        let w = sp.size && sp.size[0] > 0 ? sp.size[0] : nw, h = sp.size && sp.size[1] > 0 ? sp.size[1] : nh;
        if (sp.sc) { w *= sp.sc[0]; h *= sp.sc[1]; }
        if (o.wscale && o.wscale[node.n] != null) w *= o.wscale[node.n]; // barras que se llenan (pivote a la izquierda)
        const pv = Array.isArray(sp.piv) ? [sp.piv[0] / w, sp.piv[1] / h] : PIV[sp.piv || 'center'] || PIV.center;
        const vc = sp.vc || [255, 255, 255, 255], col = tint ? [vc[0] * tint[0] / 255, vc[1] * tint[1] / 255, vc[2] * tint[2] / 255] : vc;
        const tn = (Math.round(col[0]) << 16) | (Math.round(col[1]) << 8) | Math.round(col[2]), al = a * (vc[3] / 255);
        // cada pieza en su contenedor con la matriz del nodo; dentro, la imagen desplazada por su pivote
        const box = new PIXI.Container(); box.transform.setFromMatrix(W); box.sceneTmp = true;
        const fx = sp.flip && sp.flip[0] ? -1 : 1, fy = sp.flip && sp.flip[1] ? -1 : 1;
        let d;
        if ((sp.mode === 'panel' || sp.mode === 'panel_v2') && sp.ins && (sp.ins[0] || sp.ins[1] || sp.ins[2] || sp.ins[3])) {
          d = new PIXI.NineSlicePlane(tx, sp.ins[0] * k, sp.ins[1] * k, sp.ins[2] * k, sp.ins[3] * k); d.width = w * k; d.height = h * k;
          d.scale.set(fx / k, fy / k); d.position.set(-pv[0] * w * fx, -pv[1] * h * fy);
        } else {
          d = new PIXI.Sprite(tx); d.anchor.set(pv[0], pv[1]); d.width = w * fx; d.height = h * fy;
        }
        box.addChild(d); d.tint = tn; d.alpha = al; root.addChild(box);
      }
    }
    if (node.txt && o.text && o.text[node.n] != null) {
      const tx = node.txt, c = tx.col || [255, 255, 255, 255], ol = tx.outline;
      const tt = text(String(o.text[node.n]), 0, 0, (tx.size || 20) * 1.5, { fill: 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')', stroke: ol ? 'rgb(' + ol[0] + ',' + ol[1] + ',' + ol[2] + ')' : null, sw: ol ? (tx.size || 20) * 0.12 : 0 });
      tt.transform.setFromMatrix(W.clone().append(new PIXI.Matrix().scale(0.5, 0.5)));
    }
    // clave Frame (o la opción only {padre: hijo}, p. ej. qué potenciador enseña el cohete): solo se ve ese hijo
    const kids0 = node.kids || [], pick = (o.only && o.only[node.n]) || frameObj, onlyOne = pick && kids0.some((q) => q.n === pick);
    let kids = kids0.some((q) => q.z) ? kids0.slice().sort((p, q) => (p.z || 0) - (q.z || 0)) : kids0; // por profundidad, como King
    if (o.front && kids.some((q) => o.front[q.n])) kids = kids.filter((q) => !o.front[q.n]).concat(kids.filter((q) => o.front[q.n])); // los que van delante
    for (const kd of kids) { if (onlyOne && kd.n !== pick) continue; sceneDraw(kd, W, o, a); }
  }
  GL.scene = function (name, x, y, scale, o) {
    if (!SCN || !SCN.scenes[name]) return false;
    o = Object.assign({ time: E.t }, o || {});
    const M = new PIXI.Matrix().scale(scale, scale).translate(x, y);
    for (const kd of SCN.scenes[name].kids) sceneDraw(kd, M, o, o.alpha == null ? 1 : o.alpha);
    return true;
  };

  // ---------------------------------------------------------------- medidas (las de Candy Crush, captura 1080×1920)
  // cabecera de cartón rosa hasta ~236 px; barra de potenciadores de 1716 a 1898; tablero de casillas de 118 px,
  // centrado al 50,4 % del alto (en el nivel 1 real va de 456 a 1480)
  const HUD_H = 250, BAR_H = 230;
  let playedThisFrame = false;
  GL.layout = () => (on() ? { top: px(HUD_H), bottom: px(BAR_H) } : null);
  GL.boardLayout = (C, R, area) => {
    if (!on()) return null;
    const ts = Math.min(px(118), (E.W * 0.94) / C, (area.h - px(30)) / R);
    const x = (E.W - ts * C) / 2;
    const y = Math.max(area.y + px(15), Math.min(E.H * 0.504 - (R * ts) / 2, area.y + area.h - R * ts));
    return { ts, x, y };
  };
  let cv2d = null;
  GL.resize = function (cv, dpr) {
    ensureApp(cv); if (!app) return; cv2d = cv;
    view.style.width = cv.style.width; view.style.height = cv.style.height; view.style.left = cv.style.marginLeft || '0';
    app.renderer.resolution = dpr; app.renderer.resize(cv.width / dpr, cv.height / dpr);
    root.scale.set(E.scale / dpr);
  };

  // ---------------------------------------------------------------- pantalla de juego
  // puntos de cada combinación como en Candy Crush: el número con su letra (Numbers = BubblegumBliss, la de la partida)
  // del color del caramelo; crece de golpe, sube y se apaga (≈1 s)
  const POPCOL = [['#ff4d5a', '#7a0e1c'], ['#ffa133', '#7a3a00'], ['#ffe14d', '#7a5a00'], ['#5fd84a', '#145a10'], ['#3fa4ff', '#0d3a7a'], ['#c06bff', '#4a1470']];
  const pops = [];
  GL.scorePop = function (x, y, str, color) { if (!on()) return false; pops.push({ x, y, str, c: POPCOL[color] || ['#ffffff', '#5a2a4a'], t0: E.t }); if (pops.length > 30) pops.shift(); return true; };
  function drawScorePops() {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i], t = E.t - p.t0; if (t > 1.1 || t < 0) { pops.splice(i, 1); continue; }
      const sc = t < 0.12 ? 0.5 + (t / 0.12) * 0.65 : t < 0.22 ? 1.15 - ((t - 0.12) / 0.1) * 0.15 : 1, a = t > 0.75 ? 1 - (t - 0.75) / 0.35 : 1;
      const tx = text(p.str, p.x, p.y - Math.max(0, t - 0.2) * px(60), px(64), { fill: p.c[0], stroke: p.c[1], sw: px(8) });
      if (tx) { tx.scale.set(0.5 * sc); tx.alpha = a; }
    }
  }
  GL.play = function (st) {
    if (!on() || !st.P || !st.P.glState) return false;
    usedThisFrame = true; playedThisFrame = true;
    begin();
    const B = st.P.glState(); B.n = st.n;
    const OFF = GL.off || {}; // para medir: GL.off = { bg, board, pieces, hud, bar, yeti }
    if (!OFF.bg) drawBackground(st);
    if (!OFF.board) drawBoard(B);
    if (!OFF.pieces) drawPieces(st, B);
    drawScorePops();
    if (!OFF.hud) drawHud(st, B);
    if (!OFF.bar) withHand(() => drawBoosters(st, B));
    drawNotices(st);
    if (B.celebrate != null) drawCelebration(st, B);
    if (GL.test3d) { const q = GL.test3d; draw3d(q.n, q.a, q.t, q.x, q.y, B.ts / 80, 1, q.X); } // para probar
    drawBooster3d(B);
    E.glBoard = true;
    return true; // todo dibujado aquí: el lienzo 2D de encima queda vacío (salvo las exclamaciones)
  };

  // fondo: el del mundo (la imagen difuminada del Candy Crush real), cubriendo la pantalla
  function drawBackground(st) {
    const f = E.skin('bgImage'), im = f && f(st.n);
    if (!im) { const g = gfx(); g.beginFill(0x6fcaca); g.drawRect(0, 0, E.W, E.H); g.endFill(); } // con la imagen, una sola capa a pantalla completa
    else { const t = texOf(im), s = Math.max(E.W / t.width, E.H / t.height); img(t, E.W / 2, E.H / 2, { w: t.width * s, h: t.height * s }); }
  }

  // tablero: cada casilla con la pieza overlay_game_board (azul marino) al 40 %, todas juntas sin solaparse, y un brillo
  // suave alrededor (en la captura, el borde de fuera es más claro que el fondo)
  // va dentro de la capa de debajo de las piezas (una capa grande menos que mezclar en cada fotograma); sola si no hay piezas
  function drawBoard(B) { if ((GL.off || {}).pieces) layerSprite('cells', cellsKey(B), B, cellsPaint(B), true); }
  const cellsKey = (B) => B.S.R + ':' + B.S.C + ':' + B.ts + ':' + B.bx + ':' + B.by;
  function cellsPaint(B) { // una sola imagen (antes, dos filtros de transparencia en cada fotograma)
    const { S, ts, bx, by } = B, e = px(7);
    return (g) => {
      g.beginPath(); for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (B.inB(r, c)) E.rr(g, bx + c * ts - e, by + r * ts - e, ts + e * 2, ts + e * 2, e * 1.5);
      g.globalAlpha = 0.22; g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (B.inB(r, c)) g.rect(bx + c * ts - 0.6, by + r * ts - 0.6, ts + 1.2, ts + 1.2); // solapadas: sin costuras
      g.globalAlpha = 0.42; g.fillStyle = '#00133a'; g.fill(); g.globalAlpha = 1;
    };
  }
  // ---- todo lo del tablero: lo de debajo y lo de encima de los caramelos (game.js, P.drawUnder/drawOver) como imágenes que
  // se rehacen solo cuando cambia su firma, y cada pieza como un sprite de su dibujo (drawTile pasado a textura una vez)
  const layers = {};
  function layerSprite(name, key, B, draw, fixed) {
    const t = B.ts, x0 = B.bx - t * 0.6, y0 = B.by - t * 1.2, w = B.S.C * t + t * 1.2, h = B.S.R * t + t * 2; // el tablero y un margen justo (cañones arriba, salidas de ingredientes abajo): todo lo transparente también se mezcla
    const k = E.scale, W = Math.ceil(w * k), H = Math.ceil(h * k);
    let L = layers[name];
    if (!L || L.c.width !== W || L.c.height !== H) { if (L) L.t.destroy(true); const c = document.createElement('canvas'); c.width = W; c.height = H; L = layers[name] = { c, t: PIXI.Texture.from(c), key: null }; }
    if (!fixed && E.t - (B.t0 || 0) < 4) key += '|' + Math.floor(E.t); // los primeros segundos, cada segundo (imágenes que cargan tarde)
    if (L.key !== key) {
      const g = L.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
      draw(g); L.t.baseTexture.update(); L.key = key; stats.layer++;
    }
    img(L.t, x0, y0, { ax: 0, ay: 0, w, h });
  }
  const tileTex = new Map(), stats = (GL.stats = { tileNew: 0, tileDraw: 0, layer: 0, keys: {} });
  const DYN = new Set(['x', 'y', 'vy', 'sc', 'alpha', 'rot', 'wait', 'tr', 'tc', 'front', 'sel', 'id', 'fillK', 'gx', 'gy', 'delay']);
  function tileKey(t) { let k = ''; for (const n in t) { const v = t[n]; if (DYN.has(n)) continue; if (v === null || typeof v !== 'object') k += n + '=' + v + ';'; else if (Array.isArray(v)) k += n + '=' + v.join(',') + ';'; } return k; }
  function tileTexture(B, t) {
    const anim = !!t.frog; // la rana se mueve (engorda): se pinta cada fotograma
    const key = anim ? 'anim' + t.id : tileKey(t) + '@' + Math.round(B.ts * 10);
    let e = tileTex.get(key);
    const S = Math.ceil(B.ts * (anim ? 1.7 : 1.3) * E.scale); // margen justo (la rana sale de su casilla)
    if (!e) {
      const c = document.createElement('canvas'); c.width = c.height = S;
      e = { c, t: PIXI.Texture.from(c), drawn: false }; tileTex.set(key, e); stats.tileNew++; if (Object.keys(stats.keys).length < 40) stats.keys[key] = 1;
      if (tileTex.size > 500) { for (const [kk, v] of tileTex) { if (kk.startsWith('anim') || v.used >= cbFrame - 2) continue; v.t.destroy(true); tileTex.delete(kk); if (tileTex.size < 350) break; } } // solo las que no se han usado estos fotogramas
    }
    e.used = cbFrame;
    if (e.drawn && !e.again && e.early && E.t - e.t0 > 2) { e.again = true; e.drawn = false; } // hecha al arrancar: una vez más a los 2 s, por si su imagen no había cargado
    if (!e.drawn || anim) {
      if (!e.t0) { e.t0 = E.t; e.early = E.t < 8; }
      const g = e.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.setTransform(E.scale, 0, 0, E.scale, S / 2, S / 2);
      const SK = GAME.skins && GAME.skins[E.gfx], ta = SK && SK.tileAnim; if (SK) SK.tileAnim = null; // el balanceo va en el sprite
      const o = [t.sc, t.alpha, t.rot, t.sel]; t.sc = 1; t.alpha = 1; t.rot = 0; t.sel = false;
      B.drawTile(g, t, 0, 0, B.ts); stats.tileDraw++;
      t.sc = o[0]; t.alpha = o[1]; t.rot = o[2]; t.sel = o[3]; if (SK) SK.tileAnim = ta;
      e.t.baseTexture.update(); e.drawn = true;
    }
    return e.t;
  }
  // al empezar un nivel, los especiales de cada color (rayados, envueltos, pez) y la bomba se pasan a imagen de antemano,
  // de dos en dos por fotograma: hacerlo cuando aparecen, en plena explosión, daba tirones de más de 50 ms
  let warmS = null, warmQ = [];
  const warmSpine = ['cbomb', 'cbaura', 'cbitem', 'cbitemol', 'fish', 'fish2'];
  function prewarm(B) {
    if (warmS !== B.S) {
      warmS = B.S; warmQ = [{ kind: 'bomb' }];
      const cols = new Set(); for (const t of B.vis) if (t.kind === 'candy') cols.add(t.color);
      for (const c of cols) for (const sp of ['h', 'v', 'w', 'f']) warmQ.push({ kind: 'candy', color: c, sp });
    }
    for (let i = 0; i < 2 && warmQ.length; i++) tileTexture(B, warmQ.shift());
    // los esqueletos de la bomba de color y del pez, uno por fotograma: hacerlos cuando sale la primera bomba daba un tirón
    if (!warmQ.length && warmSpine.length && PIXI.spine40 && skelJson[warmSpine[0]] && atlases[SKEL[warmSpine[0]][1]]) spineData(warmSpine.shift());
    else if (!warmQ.length && !warmSpine.length && !celebY && YETI) { celebY = newSpine('yeti'); if (celebY) { celebY.skeleton.setSkinByName(YETI.skinNow || 'standard'); celebY.skinNow = YETI.skinNow; celebY.state.setAnimation(0, 'success_final', false); celebY.update(0); } } // el Yeti grande del final
  }
  const piecesMask = { g: null, key: '' };
  function drawPieces(st, B) {
    const { S, ts, bx, by } = B;
    prewarm(B);
    const rap = rapidOk(B);
    const cells = cellsPaint(B);
    layerSprite('under', cellsKey(B) + '#' + B.under + (rap ? '|R' : ''), B, (g) => { cells(g); st.P.drawUnder(g, { noRapid: rap }); });
    if (rap) drawRapids(B);
    // piezas, recortadas a las casillas del tablero
    if (!piecesMask.g) piecesMask.g = new PIXI.Graphics();
    const mk = S.R + ':' + S.C + ':' + ts + ':' + bx + ':' + by;
    // un solo rectángulo (la GPU lo recorta sin plantilla): lo que cae desde arriba no se ve fuera del tablero
    if (piecesMask.key !== mk) { const m = piecesMask.g; m.clear(); m.beginFill(0xffffff); m.drawRect(bx - 1, by - 1, S.C * ts + 2, S.R * ts + 2); m.endFill(); piecesMask.key = mk; }
    const box = new PIXI.Container(); box.poolBox = true; root.addChild(box); root.addChild(piecesMask.g); box.mask = piecesMask.g;
    const ta = E.skin('tileAnim');
    const put = (t, x, y, sc, alpha, add) => {
      if (!add && cbOk(t) && cbBomb(t, x, y, alpha, box, ts)) return;
      if (!add && fishOk(t) && fishBorn(t, x, y, alpha, box, ts)) return;
      if (t.kind === 'cake') { if (!t.q && !add) drawCake(t, x + ts / 2, y + ts / 2, ts, alpha, box); return; }
      if (t.kind === 'cobra' && cobraOk() && (add || cobra3d(t, x, y, sc, alpha, box, ts))) return;
      if (t.kind === 'rope') { if (!add) drawRope(B, t, x, y, ts, sc, alpha, box); return; }
      if (t.kind === 'nest') return; // drawNests: un esqueleto por nido
      if (t.kind === 'mold') return; // drawRapids
      if (t.kind === 'sprink') { if (!add) { const sp = img('dragonnest:gummi_dragon_free', x, y, { w: ts * 1.05 * sc, h: ts * 1.05 * sc, alpha }); if (sp) { root.removeChild(sp); box.addChild(sp); } } return; }
      const tx = tileTexture(B, t), sz = ts * (t.frog ? 1.7 : 1.3); let sx = sc, sy = sc, oy = 0;
      const an = ta && ta(t); if (an) { sx *= an.sx; sy *= an.sy; oy = ((an.ty || 0) * ts * sc) / 80; }
      const sp = img(tx, x, y + oy, { w: sz * sx, h: sz * sy, rot: t.rot || 0, alpha, add }); if (sp) { root.removeChild(sp); box.addChild(sp); }
    };
    // pista como en Candy Crush (rec_001): los caramelos de la línea laten y se iluminan juntos, una vez por segundo
    const H = B.hint, hk = H && H.t > 0 && H.tiles ? 0.5 - 0.5 * Math.cos(H.t * Math.PI * 2) : 0;
    for (const t of B.vis) {
      if (t.x == null || t.front) continue;
      const sc = t.sc == null ? 1 : t.sc, al = t.alpha == null ? 1 : Math.max(0, t.alpha);
      if (hk && H.tiles.includes(t) && !fishOk(t)) { put(t, t.x, t.y, sc * (1 + 0.06 * hk), al); put(t, t.x, t.y, sc * (1 + 0.06 * hk), 0.5 * hk, true); continue; }
      put(t, t.x, t.y, sc, al);
    }
    for (const t of B.vis) if (t.front && t.x != null) put(t, t.x, t.y, t.sc == null ? 1 : t.sc, t.alpha == null ? 1 : Math.max(0, t.alpha));
    if (S.cannon || S.wall || S.belt) layerSprite('over', B.over, B, (g) => st.P.drawOver(g)); // solo tiene cañones, bastones y cintas
    // rápidos del arcoíris: su cañón (candy/rainbow_canon, el 152 de los niveles) sobre la primera casilla de cada camino
    if (S.rapid && rapidOk(B)) for (const p of S.rapid) { const [r, c] = p.cells[0], t = tex('candy:rainbow_canon'); if (t) { const w = ts * 0.9, h = (w * t.orig.height) / t.orig.width; img(t, B.cx(c), by + r * ts - h * 0.4, { w, h }); } }
    // las que desaparecen (como en game.js: en Candy Crush se iluminan, encogen al 30 % y estallan)
    const tm = B.TM();
    for (const d of B.dying) {
      if (!d.started) continue;
      const k = Math.min(1, d.age / tm.remove), t = d.t, o = t.sc == null ? 1 : t.sc;
      if (cbOk(t)) { if (!d.cb) { d.cb = true; cbFire(t, d.x, d.y, d.r, d.c); } continue; }
      if (fishOk(t)) continue; // el pez se va nadando (fishSwim)
      if (t.kind === 'coco' || t.kind === 'ufo') continue; // se van rodando o volando (drawRollUfo)
      if (t.kind === 'cobra' && cobraOk()) { if (!d.snake) { d.snake = true; snakeGo(B, d.r, d.c); } continue; } // cruza su fila (drawSnakes)
      if (tm.shrink && d.mode !== 'ing' && d.mode !== 'merge') {
        const sc = o * (k < 0.15 ? 1 : 1 - (0.7 * (k - 0.15)) / 0.85), al = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
        put(t, d.x, d.y, sc, al); if (k < 0.3) put(t, d.x, d.y, sc, 0.5 * (1 - k / 0.3), true);
      } else if (d.mode === 'ing') put(t, d.x, d.y - k * 50, 1 + k * 0.5, 1 - k);
      else put(t, d.x, d.y, o * (d.mode === 'merge' ? 1 - k * 0.6 : 1 + k * 0.25), 1 - k);
    }
    // rayos, explosiones y chispazos sin efecto propio del estilo
    for (const f of B.fxs) {
      if (f.age < 0 || (f.skin && f.type !== 'zap') || (f.fish && fishOk({ kind: 'candy', sp: 'f' }))) continue; // el pez ya se ve nadando
      const k = Math.min(1, f.age / 0.45), x0 = B.cx(f.c), y0 = B.cy(f.r), g = gfx(); g.alpha = 1 - k;
      if (f.type === 'line') {
        const len = k * Math.max(S.R, S.C) * ts;
        g.beginFill(0xffe66b, 0.45); if (f.dir === 'h') g.drawRect(x0 - len, y0 - ts * 0.22, len * 2, ts * 0.44); else g.drawRect(x0 - ts * 0.22, y0 - len, ts * 0.44, len * 2); g.endFill();
        g.beginFill(0xffffff); if (f.dir === 'h') g.drawRect(x0 - len, y0 - ts * 0.12, len * 2, ts * 0.24); else g.drawRect(x0 - ts * 0.12, y0 - len, ts * 0.24, len * 2); g.endFill();
      } else if (f.type === 'boom') {
        g.lineStyle(8, 0xffffff); g.beginFill(0xffe68c, 0.6); g.drawCircle(x0, y0, ts * (0.5 + k * f.rad)); g.endFill();
      } else if (f.type === 'roll' || f.type === 'ufo') { /* abajo, con su dibujo */
      } else if (f.type === 'zap') {
        const kk = Math.min(1, k * 2.5);
        g.lineStyle(f.skin ? 6 : 4, f.skin ? 0xdcf0ff : 0xffffff, f.skin ? 0.95 : 1);
        for (const [rr, cc] of f.targets) { g.moveTo(x0, y0); g.lineTo(x0 + (B.cx(cc) - x0) * kk, y0 + (B.cy(rr) - y0) * kk); }
      }
    }
    cbEffects(B, box); fishSwim(B, box); drawRollUfo(B); drawSnakes(B);
    drawTwists(B); drawOrlocks(B); drawBobbers(B); drawNests(B, box);
    // iconos de objetivos que vuelan a la cabecera
    for (const f of st.flyers || []) { const t = goalTexture(f.gl), ow = t.orig ? t.orig.width : t.width, oh = t.orig ? t.orig.height : t.height, s2 = (52 * f.s) / Math.max(ow, oh); img(t, f.x, f.y, { w: ow * s2, h: oh * s2 }); }
  }
  // ---- bomba de color de Candy Crush (Spine, models/color_bomb): en reposo "idle" (cada una con su fase); al nacer,
  // "create"; al usarla se queda en su casilla con "active_in"/"active_loop" y su aura mientras estallan los caramelos que
  // alcanza, y acaba con "destroy". Cada caramelo alcanzado se ilumina con ColorBombItem_vfx y su contorno (_OL): "active_in",
  // "active_loop" mientras sigue en el tablero y "destroy" al romperse. Una casilla son unas 56 unidades de sus esqueletos
  const cbLive = new Map(), cbGhosts = [], cbItems = [], cbZaps = new WeakSet();
  let cbFrame = 0;
  const cbOk = (t) => t && t.kind === 'bomb' && !t.lock && !t.coat && !t.vlock && !(GL.off && GL.off.cbomb) && !!spineData('cbomb');
  const cbDt = () => Math.min(0.05, E.dt || 0.016);
  function cbPut(sp, x, y, ts, alpha, parent) { sp.position.set(x, y); sp.scale.set(ts / 56); sp.alpha = alpha == null ? 1 : alpha; parent.addChild(sp); }
  function cbBomb(t, x, y, alpha, box, ts) {
    let e = cbLive.get(t);
    if (!e) {
      const sp = newSpine('cbomb'); if (!sp) return false;
      if (t.sc != null && t.sc < 0.99) { E.sfx('cbMade'); sp.state.setAnimation(0, 'create', false); sp.state.addAnimation(0, 'idle', true, 0); } // recién hecha
      else { const tr = sp.state.setAnimation(0, 'idle', true); tr.trackTime = Math.random() * 8.7; }
      e = { sp }; cbLive.set(t, e);
    }
    if (e.frame !== cbFrame) { e.frame = cbFrame; e.sp.update(cbDt()); }
    cbPut(e.sp, x, y, ts, alpha, box); e.seen = cbFrame;
    return true;
  }
  function cbFire(t, x, y, r, c) { // la bomba se usa: se queda con su aura hasta que acaban sus caramelos
    const e = cbLive.get(t); cbLive.delete(t);
    const sp = (e && e.sp) || newSpine('cbomb'), au = newSpine('cbaura'); if (!sp) return;
    sp.state.setAnimation(0, 'active_in', false); sp.state.addAnimation(0, 'active_loop', true, 0);
    if (au) { au.state.setAnimation(0, 'active_in', false); au.state.addAnimation(0, 'active_loop', true, 0); }
    cbGhosts.push({ sp, au, x, y, r, c, age: 0, out: 0 }); E.sfx('cbCharge');
  }
  function cbEffects(B, box) {
    cbFrame++;
    const dt = cbDt(), ts = B.ts;
    // caramelos alcanzados por el rayo de una bomba
    for (const f of B.fxs) {
      if (f.type !== 'zap' || f.age < 0 || cbZaps.has(f) || !spineData('cbitem')) continue;
      cbZaps.add(f);
      for (const [rr, cc] of f.targets) {
        let tile = null; for (const t of B.vis) if (t.tr === rr && t.tc === cc) { tile = t; break; }
        if (!tile) continue;
        const it = newSpine('cbitem'), ol = newSpine('cbitemol');
        for (const s2 of [it, ol]) if (s2) { s2.state.setAnimation(0, 'active_in', false); s2.state.addAnimation(0, 'active_loop', true, 0); }
        cbItems.push({ it, ol, tile, r: f.r, c: f.c, x: tile.x, y: tile.y, end: -1 });
      }
    }
    for (let i = cbItems.length - 1; i >= 0; i--) {
      const m = cbItems[i];
      if (m.end < 0) { if (B.vis.has(m.tile)) { m.x = m.tile.x; m.y = m.tile.y; } else { m.end = 0.27; for (const s2 of [m.it, m.ol]) if (s2) s2.state.setAnimation(0, 'destroy', false); } }
      else if ((m.end -= dt) <= 0) { for (const s2 of [m.it, m.ol]) if (s2) s2.destroy(); cbItems.splice(i, 1); continue; }
      for (const s2 of [m.it, m.ol]) if (s2) { s2.update(dt); cbPut(s2, m.x, m.y, ts, 1, box); }
    }
    for (let i = cbGhosts.length - 1; i >= 0; i--) {
      const g = cbGhosts[i]; g.age += dt;
      const busy = cbItems.some((m) => m.r === g.r && m.c === g.c && m.end < 0);
      if (!g.out && g.age > 0.67 && !busy) { g.out = g.age; E.sfx('cbEnd'); g.sp.state.setAnimation(0, 'destroy', false); if (g.au) g.au.state.setAnimation(0, 'destroy', false); }
      const gone = g.out ? g.age - g.out : 0; // la bomba se va en 0,4 s; su aura estalla en 2 s
      if (gone > (g.au ? 2 : 0.4)) { g.sp.destroy(); if (g.au) g.au.destroy(); cbGhosts.splice(i, 1); continue; }
      if (g.au) { g.au.update(dt); cbPut(g.au, g.x, g.y, ts, 1, box); }
      if (gone < 0.4) { g.sp.update(dt); cbPut(g.sp, g.x, g.y, ts, 1, box); }
    }
    for (const [t, e] of cbLive) if (e.seen < cbFrame - 30) { e.sp.destroy(); cbLive.delete(t); } // bombas que ya no están
  }
  // ---- pez de Candy Crush: en el tablero, su dibujo quieto (candy_mix/<Color>_Regular, en diagonal, como el juego); al
  // usarlo, su Spine binario (models/fish/fish.skel, con su brillo fish2.skel; una piel por color) nada ("travel") hasta su
  // casilla mirando hacia donde va y allí "destroy". En el esqueleto el pez nadando (ranura "Fish") va de x -120 a 203 y de
  // y -116 a 86: su centro (41, -15) va en el sitio y sus 323 de ancho son el 95 % de una casilla
  const FISHU = 340;
  const fishLive = new Map(), fishGo = [], fishZaps = new WeakSet();
  const FISHC = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'];
  const fishOk = (t) => t && t.kind === 'candy' && t.sp === 'f' && !t.lock && !t.coat && !(GL.off && GL.off.fish) && !!spineData('fish');
  function fishNew(n, color, anim, loop) {
    const sp = newSpine(n); if (!sp) return null;
    try { sp.skeleton.setSkinByName(FISHC[color] || 'Blue'); sp.skeleton.setSlotsToSetupPose(); } catch (e) { /* sin esa piel */ }
    sp.pivot.set(41, -15); sp.state.setAnimation(0, anim, !!loop); return sp;
  }
  function fishBorn(t, x, y, alpha, box, ts) { // en el tablero, el pez quieto de Candy Crush (candy_mix/<Color>_Regular, en diagonal)
    const tx = tex('candymix:' + (FISHC[t.color] || 'Blue') + '_Regular'); if (!tx) return false;
    const sc = t.sc == null ? 1 : t.sc, k = (ts * 0.95 * sc) / Math.max(tx.orig.width, tx.orig.height);
    const sp = img(tx, x, y, { w: tx.orig.width * k, h: tx.orig.height * k, alpha }); if (sp) { root.removeChild(sp); box.addChild(sp); }
    if (!fishLive.has(t)) { fishLive.set(t, { seen: cbFrame }); if (t.sc != null && t.sc < 0.99) E.sfx('fishMade'); }
    fishLive.get(t).seen = cbFrame;
    return true;
  }
  function fishSwim(B, box) {
    const dt = cbDt(), ts = B.ts;
    for (const f of B.fxs) {
      if (f.type !== 'zap' || !f.fish || f.age < 0 || fishZaps.has(f) || !spineData('fish')) continue;
      fishZaps.add(f);
      const x0 = B.cx(f.c), y0 = B.cy(f.r), x1 = B.cx(f.targets[0][1]), y1 = B.cy(f.targets[0][0]);
      fishGo.push({ sp: fishNew('fish', f.color, 'travel', true), gl: fishNew('fish2', f.color, 'travel', true), x0, y0, x1, y1, age: 0, out: false }); E.sfx('fishSwim');
    }
    for (let i = fishGo.length - 1; i >= 0; i--) {
      const g = fishGo[i]; g.age += dt;
      const T = 0.5, k = Math.min(1, g.age / T), e = k * k * (3 - 2 * k), x = g.x0 + (g.x1 - g.x0) * e, y = g.y0 + (g.y1 - g.y0) * e;
      if (k >= 1 && !g.out) { g.out = true; for (const s2 of [g.sp, g.gl]) if (s2) s2.state.setAnimation(0, 'destroy', false); E.sfx('fishHit'); }
      if (g.age > T + 0.67) { for (const s2 of [g.sp, g.gl]) if (s2) s2.destroy(); fishGo.splice(i, 1); continue; }
      const a = Math.atan2(g.y1 - g.y0, g.x1 - g.x0), right = Math.abs(a) < Math.PI / 2; // el pez mira a la izquierda
      for (const s2 of [g.gl, g.sp]) if (s2) { s2.update(dt); s2.position.set(x, y); s2.scale.set((right ? -1 : 1) * ts / FISHU, ts / FISHU); s2.rotation = right ? a : a - Math.PI; box.addChild(s2); }
    }
    for (const [t, e] of fishLive) if (!(e.seen >= cbFrame - 30)) fishLive.delete(t); // peces que ya no están
  }
  // ---- potenciadores 3D de Candy Crush (tools/gl_boosters3d.py): piruleta-martillo, pincel y mano del cambio libre, con su
  // esqueleto y animación, movidos en directo como las mascotas de Rescate Animal HD (hasta 3 huesos por vértice, búfer de
  // profundidad). Escenas de King (special_effects/*_scene.xml): modelos ×10 y cada pieza con su escala (1,5 con la y
  // del revés, porque en 2D la y va hacia abajo); un caramelo son 80 unidades de King
  let B3D = null, b3dLoading = false;
  const b64 = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
  function load3d() {
    if (b3dLoading) return; b3dLoading = true;
    const x = new XMLHttpRequest(); x.open('GET', E.privBase() + 'gl/boosters3d.json');
    x.onload = () => { try {
      const d = JSON.parse(x.responseText), out = { models: {}, anims: {}, tex: {} };
      for (const [n, m] of Object.entries(d.models)) out.models[n] = { nv: m.nv, pos: b64(m.pos, Float32Array), nrm: b64(m.nrm, Float32Array), uv: b64(m.uv, Float32Array), tri: b64(m.tri, Uint16Array),
        bi: b64(m.bi, Uint16Array), w: b64(m.w, Float32Array), parent: m.parent, bind: b64(m.bind, Float32Array), inv: b64(m.inv, Float32Array) };
      for (const [n, a] of Object.entries(d.anims)) out.anims[n] = { fps: a.fps, nf: a.nf, tracks: a.tracks.map((t) => b64(t, Float32Array)) };
      for (const n of Object.keys(out.models).concat(d.tex || [])) out.tex[n] = PIXI.BaseTexture.from(E.privBase() + 'gl/b3d_' + n + '.webp');
      B3D = out;
    } catch (e) { console.warn('potenciadores 3D', e); B3D = false; } };
    x.send();
  }
  const VS3 = `precision highp float; attribute vec2 aVertexPosition; attribute float aDepth; attribute vec2 aTextureCoord; attribute vec2 aLight;
    uniform mat3 projectionMatrix; uniform mat3 translationMatrix; varying vec2 vUv; varying vec2 vLight;
    void main(){ vec3 p = projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0); gl_Position = vec4(p.xy, aDepth, 1.0); vUv = aTextureCoord; vLight = aLight; }`;
  const FS3 = `precision mediump float; varying vec2 vUv; varying vec2 vLight; uniform sampler2D uSampler; uniform float uAlpha;
    void main(){ vec4 c = texture2D(uSampler, vUv); if (c.a < 0.02) discard; vec3 rgb = min(vec3(1.0), c.rgb * vLight.x + vLight.y); gl_FragColor = vec4(rgb * c.a, c.a) * uAlpha; }`;
  let prog3 = null;
  function mesh3(texture, nv, uv, idx) {
    prog3 = prog3 || PIXI.Program.from(VS3, FS3);
    const geo = new PIXI.Geometry().addAttribute('aVertexPosition', new Float32Array(nv * 2), 2).addAttribute('aDepth', new Float32Array(nv), 1).addAttribute('aTextureCoord', uv, 2)
      .addAttribute('aLight', new Float32Array(nv * 2), 2).addIndex(idx);
    const st = PIXI.State.for2d(); st.depthTest = true; st.blend = true;
    const m = new PIXI.Mesh(geo, new PIXI.Shader(prog3, { uSampler: texture, uAlpha: 1 }), st);
    const r0 = m._render.bind(m);
    m._render = (renderer) => { const gl = renderer.gl; gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); gl.depthFunc(gl.LEQUAL); r0(renderer); };
    return m;
  }
  function mul4(a, ao, b, bo, o) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[ao + i * 4 + k] * b[bo + k * 4 + j]; o[i * 4 + j] = s; } }
  const b3dMesh = {};
  // dibuja el modelo n con la animación a en el instante t (s), con su origen en (x, y) y escala sc (unidades de King por
  // unidad del modelo) · u (píxeles por unidad de King)
  // con perspectiva: la cámara a GL.b3dD unidades de King mirando al centro de la pantalla. X = la colocación de su escena:
  // S (escala de "Models"), sc (Scale), rot (Rotation en grados: x, luego y, luego z), tr (Translation); en 2D la y va abajo
  GL.b3dD = 900;
  function rotM(r) {
    const [ax, ay, az] = r.map((d) => (d * Math.PI) / 180), cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
    // Rz · Ry · Rx (por columnas: vector columna)
    return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
  }
  function draw3d(n, a, t, x, y, u, alpha, X) {
    if (B3D === null) load3d(); if (!B3D) return null;
    const tx = B3D.tex[(X && X.tex) || n], M = B3D.models[n], A = B3D.anims[n + '_' + a]; if (!M || !A || !tx || !tx.valid) return null;
    const nb = M.parent.length, f = Math.max(0, Math.min(A.nf - 1, Math.floor(t * A.fps))), mk = n + '#' + ((X && X.key) || '');
    let st = b3dMesh[mk]; // X.key: otra copia del mismo modelo en el mismo fotograma (cada cobra, cada casilla del arcoíris)
    if (!st) { st = b3dMesh[mk] = { world: new Float32Array(nb * 16), skin: new Float32Array(nb * 16), P: new Float32Array(M.nv * 2), D: new Float32Array(M.nv), Lt: new Float32Array(M.nv * 2), mesh: mesh3(tx, M.nv, M.uv, M.tri) }; }
    st.mesh.shader.uniforms.uSampler = tx;
    const tmp = new Float32Array(16), { world, skin, P, D, Lt } = st;
    for (let i = 0; i < nb; i++) {
      const tr = A.tracks[i], L = tr && tr.length ? tr : M.bind, lo = tr && tr.length ? Math.min(f, tr.length / 16 - 1) * 16 : i * 16, p = M.parent[i];
      if (p < 0) for (let k = 0; k < 16; k++) world[i * 16 + k] = L[lo + k]; else { mul4(L, lo, world, p * 16, tmp); world.set(tmp, i * 16); }
      mul4(M.inv, i * 16, world, i * 16, tmp); skin.set(tmp, i * 16);
    }
    const NW = M.w.length / M.nv, cxs = E.W / 2, cys = E.H / 2, Dd = GL.b3dD, S = X.S, sc = X.sc, R = rotM(X.rot || [0, 0, 0]), tr = (X.tr || [0, 0, 0]).slice();
    if (X.ctr) { const c = X.ctr.map((v, j) => v * sc[j]); for (let j = 0; j < 3; j++) tr[j] -= R[j * 3] * c[0] + R[j * 3 + 1] * c[1] + R[j * 3 + 2] * c[2]; } // ese punto del modelo, en (x, y)
    for (let v = 0; v < M.nv; v++) {
      let X0 = 0, Y0 = 0, Z0 = 0, NX = 0, NY = 0, NZ = 0; const px0 = M.pos[v * 3], py0 = M.pos[v * 3 + 1], pz0 = M.pos[v * 3 + 2], nx0 = M.nrm[v * 3], ny0 = M.nrm[v * 3 + 1], nz0 = M.nrm[v * 3 + 2];
      for (let j = 0; j < NW; j++) {
        const w = M.w[v * NW + j]; if (!w) continue; const o = M.bi[v * NW + j] * 16;
        X0 += w * (px0 * skin[o] + py0 * skin[o + 4] + pz0 * skin[o + 8] + skin[o + 12]);
        Y0 += w * (px0 * skin[o + 1] + py0 * skin[o + 5] + pz0 * skin[o + 9] + skin[o + 13]);
        Z0 += w * (px0 * skin[o + 2] + py0 * skin[o + 6] + pz0 * skin[o + 10] + skin[o + 14]);
        NX += w * (nx0 * skin[o] + ny0 * skin[o + 4] + nz0 * skin[o + 8]); NY += w * (nx0 * skin[o + 1] + ny0 * skin[o + 5] + nz0 * skin[o + 9]); NZ += w * (nx0 * skin[o + 2] + ny0 * skin[o + 6] + nz0 * skin[o + 10]);
      }
      // luz del material "Smooth" de sus escenas: ambiente 215, difusa 50 y brillo 178 con dureza 15 (luz de arriba a la izquierda, por delante)
      const nl = Math.hypot(NX, NY, NZ) || 1, dif = Math.max(0, (-0.35 * NX + 0.5 * NY + 0.79 * NZ) / nl), hz = Math.max(0, (-0.18 * NX + 0.26 * NY + 0.95 * NZ) / nl);
      Lt[v * 2] = X.flat ? 1 : 0.84 + 0.2 * dif; Lt[v * 2 + 1] = X.flat ? 0 : 0.7 * Math.pow(hz, 15); // flat: sin luz (material TextureColor, modelos sin normales)
      const mm = X.m || 1, qx = X0 * sc[0] * mm, qy = Y0 * sc[1] * mm, qz = Z0 * sc[2] * mm; // escala, giro y traslación de su escena; luego ×S (unidades de King)
      const wx = (R[0] * qx + R[1] * qy + R[2] * qz + tr[0]) * S, wy = (R[3] * qx + R[4] * qy + R[5] * qz + tr[1]) * S, wz = (R[6] * qx + R[7] * qy + R[8] * qz + tr[2]) * S;
      const pz = Dd / Math.max(50, Dd - wz);
      P[v * 2] = cxs + (x + wx * u - cxs) * pz; P[v * 2 + 1] = cys + (y + wy * u - cys) * pz; D[v] = 0.5 - wz * 0.001;
    }
    st.mesh.geometry.getBuffer('aVertexPosition').update(P); st.mesh.geometry.getBuffer('aDepth').update(D); st.mesh.geometry.getBuffer('aLight').update(Lt);
    st.mesh.shader.uniforms.uAlpha = alpha == null ? 1 : alpha;
    root.addChild(st.mesh); return st.mesh;
  }
  GL.draw3d = draw3d; // para probar
  // escenas de los potenciadores (special_effects/candy_hammer*, use_brush_*, free_switch_*): qué modelo y animación, dónde
  // y cuánto dura; el juego espera "hit" segundos para romper o intercambiar. La mano de la 1.119 es unas 8 veces más
  // pequeña que la del juego actual (m: 10) para la misma escena
  const B3S = {
    hammer: { n: 'hammer', S: 10, sc: [1.5, -1.5, 1.5], tr: [0, 0, 10], seq: [[0, 'hit']], end: 1.5, fade: 0.3, hit: 0.78 },
    brushh: { n: 'brush', S: 12, sc: [1.5, -1.5, 1.5], rot: [0, 180, 90], tr: [3, 0, 10], seq: [[0, 'paint']], end: 2.0, fade: 0.3, hit: 0.9 },
    brushv: { n: 'brush', S: 12, sc: [1.5, -1.5, 1.5], rot: [0, 180, 0], tr: [0, 3, 10], seq: [[0, 'paint']], end: 2.0, fade: 0.3, hit: 0.9 },
    hand: { n: 'hand', S: 12, m: 10, sc: [0.6, 0.6, 1], sc2: [[0.3, 0.6], [0.5, 0.4]], rot: [0, 180, 180], tr: [0, 2.5, 10], seq: [[0, 'slap'], [0.8, null]], end: 1.3, fade: 0.2, hit: 0.8 },
  };
  const b3dPlays = [];
  GL.booster3d = function (kind, x, y, dir) { // devuelve cuándo hay que hacer el golpe (0 = sin animación)
    if (!on() || !B3D) { if (on() && B3D === null) load3d(); return 0; }
    const sc = B3S[kind]; if (!sc || !B3D.models[sc.n]) return 0;
    b3dPlays.push({ sc, x, y, dir, t0: E.t }); return sc.hit;
  };
  function drawBooster3d(B) {
    const u = B.ts / 80;
    for (let i = b3dPlays.length - 1; i >= 0; i--) {
      const p = b3dPlays[i], c = p.sc, t = E.t - p.t0;
      if (t > c.end + c.fade) { b3dPlays.splice(i, 1); continue; }
      let anim = c.seq[0][1], ta = t;
      for (const [s0, a] of c.seq) if (t >= s0) { anim = a || p.dir; ta = t - s0; }
      let sc = c.sc;
      if (c.sc2) { const k = Math.max(0, Math.min(1, (t - c.sc2[0][0]) / (c.sc2[1][0] - c.sc2[0][0]))), v = c.sc2[0][1] + (c.sc2[1][1] - c.sc2[0][1]) * k; sc = [v, v, c.sc[2]]; }
      draw3d(c.n, anim, ta, p.x, p.y, u, t > c.end ? 1 - (t - c.end) / c.fade : 1, { S: c.S, m: c.m, sc, rot: c.rot, tr: c.tr });
    }
  }

  // rueda de coco: rueda girando por las casillas que convierte (0,12 s cada una) y se desvanece; ovni: sube, vuela sobre el
  // tablero disparando a sus 3 caramelos y se va por arriba
  const rolls = [];
  let UFO_K = 1.8, UFO_TILT = 45, UFO2_ROT = [-45, 0, 0]; // tamaño y vista algo desde arriba (para ajustar: GL.ufoK)
  GL.ufoK = (k, t, r2) => { UFO_K = k; if (t != null) UFO_TILT = t; if (r2) UFO2_ROT = r2; };
  function drawRollUfo(B) {
    const ts = B.ts, dt = Math.min(0.05, E.dt || 0.016);
    for (const f of B.fxs) if ((f.type === 'roll' || f.type === 'ufo') && f.age >= 0 && !f.seenGL) { f.seenGL = true; rolls.push(Object.assign({ t: 0 }, f)); }
    for (let i = rolls.length - 1; i >= 0; i--) {
      const f = rolls[i]; f.t += dt;
      const x0 = B.cx(f.c), y0 = B.cy(f.r);
      if (f.type === 'roll') {
        const T = 0.2 * f.n, k = Math.min(1, f.t / T), x = x0 + f.dc * ts * f.n * k, y = y0 + f.dr * ts * f.n * k, a = f.t > T ? 1 - (f.t - T) / 0.25 : 1;
        if (a <= 0) { rolls.splice(i, 1); continue; }
        // el modelo 3D de Candy Crush (boosters/coconut_wheel): tumbado como en el tablero, se pone de pie (final de
        // "wake_up") y rueda ("roll" en bucle) hacia donde va; vista algo inclinada para que se vea la rueda y no solo su canto
        const tilt = -60, rot = f.dc > 0 ? [tilt, 0, 0] : f.dc < 0 ? [tilt, 0, 180] : f.dr > 0 ? [tilt, 0, 90] : [tilt, 0, -90];
        const an = f.t < 0.3 ? 'wake' : 'roll', at = f.t < 0.3 ? 1.05 + f.t : (f.t - 0.3) % 1;
        if (!draw3d('coco', an, at, x, y, ts / 80, a, { S: 12, sc: [1, -1, 1], rot, ctr: [0, 3, 0] }))
          img('candy:coconut_wheel', x, y, { w: ts * 0.9, h: ts * 0.9, alpha: a });
      } else {
        const T = 1.6; if (f.t > T) { rolls.splice(i, 1); continue; }
        const mx = E.W / 2, my = B.by + ts * 1.2; let x, y, s = 1.4;
        if (f.t < 0.35) { const k = f.t / 0.35; x = x0 + (mx - x0) * k; y = y0 + (my - y0) * k; s = 1 + 0.4 * k; }
        else if (f.t < 1.1) { x = mx + Math.sin((f.t - 0.35) * 6) * ts * 0.6; y = my + Math.sin((f.t - 0.35) * 9) * ts * 0.1; }
        else { const k = (f.t - 1.1) / 0.5; x = mx; y = my - k * ts * 6; }
        if (f.t > 0.4 && f.t < 1.1) { const g = gfx(); g.alpha = 0.7; for (const [r, c] of f.targets) { g.lineStyle(ts * 0.12, 0xff8ad8, 0.6); g.moveTo(x, y + ts * 0.3); g.lineTo(B.cx(c), B.cy(r)); } }
        // el ovni 3D de Candy Crush (scenes/models/ufo de la 1.119: escala 10, girado −90° en x): despega (LiftOff), carga y
        // dispara (Charge, Shoot), gira mientras reparte y se va (LiftOff)
        // el ovni actual (ufo.ffm, escena scenes/models/ufo: escala 10) con sus animaciones (comprimidas con ACL): despega
        // (Lift ×1,5), dispara mientras reparte (Shoot) y acelera para irse (Accelerate); si no está, el de la 1.119
        const an2 = f.t < 0.35 ? 'lift' : f.t < 1.1 ? 'shot' : 'accelerate';
        const at2 = f.t < 0.35 ? f.t * 1.5 * (1.04 / 0.52) : f.t < 1.1 ? (f.t - 0.35) * 1.78 : f.t - 1.1;
        const an = f.t < 0.35 ? 'up' : f.t < 0.64 ? 'zapUp' : f.t < 1.03 ? 'zapDown' : f.t < 1.1 ? 'spin' : 'up';
        const at = f.t < 0.35 ? f.t * 1.5 : f.t < 0.64 ? f.t - 0.35 : f.t < 1.03 ? f.t - 0.64 : f.t < 1.1 ? f.t - 1.03 : (f.t - 1.1) * 1.5;
        if (!draw3d('ufo2', an2, at2, x, y, (ts / 80) * s * UFO_K, 1, { S: 10, sc: [1, -1, 1], rot: UFO2_ROT.slice() }) &&
            !draw3d('ufo', an, at, x, y, (ts / 80) * s * UFO_K, 1, { S: 10, sc: [1, -1, 1], rot: [-90 + UFO_TILT, 0, 0] }))
          img('candy:ufoStill_01', x, y, { w: ts * s, h: ts * s * 0.9 });
      }
    }
  }
  // ---- triturachuches (scenes/board_assets/gummyRope_vertical/horizontal y gummy_ropes_shredder): la cuerda son trozos
  // gummy_rope_2/1 alternos de una casilla (92 unidades) que salen de la trituradora; la trituradora, sus piezas encajadas
  // en un marco de 150 unidades (dientes, labio, boca, cuerpo, tolva, ojo y pupila) con la boca hacia la cuerda
  const SHRED = ['shredder_mouth_teeth_1', 'shredder_mouth_lip_1', 'shredder_mouth_1', 'shredder_body_base', 'shredder_topchute_base', 'shredder_topchute_body',
    'shredder_topchute_rim', 'shredder_eyewhite', 'shredder_pupil', 'shredder_eyeframe'];
  function drawRope(B, t, x, y, ts, sc, alpha, box) {
    const R = B.S.ropes && B.S.ropes[t.rope], dir = R ? R.dir : [-1, 0], k = (ts / 100.3) * (sc == null ? 1 : sc); // gummyRope_*.xml: trozos de 92 cada 92 × 1,09 = una casilla
    const put2 = (id, rot, w, h) => { const tx = tex(id); if (!tx) return; const sp = img(tx, x, y, { w: w * k, h: h * k, rot, alpha }); if (sp) { root.removeChild(sp); box.addChild(sp); } };
    const rot = dir[0] < 0 ? 0 : dir[0] > 0 ? Math.PI : dir[1] > 0 ? Math.PI / 2 : -Math.PI / 2;
    // los trozos encajan en un sentido (Rope1, Rope2... desde la trituradora): su x apunta de la trituradora a la punta
    const along = Math.atan2(dir[0], dir[1]);
    // se cuentan desde la punta (Rope11 = gummy_rope_3, antes Rope10 = 2, Rope9 = 1...): la cuerda se desliza hacia la trituradora
    const d = R ? R.cells.length - 1 - t.k : t.k;
    const id = t.head ? 'gummy_rope_2' : d <= 0 ? 'gummy_rope_3' : d % 2 ? 'gummy_rope_2' : 'gummy_rope_1'; // boca, punta o trozo
    put2('candymix:' + id, along, 100.3, 92); // a lo largo la casilla, de grueso 92
    put2('candymix:gummy_rope_white_stroke', along - Math.PI / 2, 168, 100.3); // Stroke_vertical: el brillo blanco a lo largo (183 × 0,917 de ancho)
    if (!t.head) return;
    for (const n of SHRED) put2('candymix:' + n, rot, 150, 150); // lienzos de 300 px a doble resolución (k = 2): 150 unidades; el cuerpo, 85, cabe en su casilla de 92
  }

  // ---- nidos de chispitas (Spine animations/candy/spine/dragon_nest): en reposo idle_<huevos>_eggs_step_<golpes+1> y, al
  // recibir un golpe, hit_<huevos>_eggs_step_<golpes>
  const nestLive = new WeakMap();
  let NEST_K = 0.5; GL.nestK = (k) => { NEST_K = k; };
  function drawNests(B, box) {
    const { S, ts } = B; if (!S.nests) return;
    S.nests.forEach((N) => {
      if (N.eggs <= 0) return;
      let e = nestLive.get(N);
      if (!e) { const sp = newSpine('nest'); if (!sp) return; e = { sp, key: '' }; nestLive.set(N, e); }
      const eg = Math.max(1, Math.min(6, N.eggs)), key = eg + ':' + N.step;
      if (e.key !== key) {
        const hitA = e.key && 'hit_' + eg + '_eggs_step_' + Math.max(1, Math.min(2, N.step || 2)), idle = 'idle_' + eg + '_eggs_step_' + Math.min(2, N.step + 1);
        const has = (n) => !!e.sp.spineData.findAnimation(n);
        if (hitA && has(hitA)) { e.sp.state.setAnimation(0, hitA, false); if (has(idle)) e.sp.state.addAnimation(0, idle, true, 0); }
        else if (has(idle)) e.sp.state.setAnimation(0, idle, true);
        e.key = key;
      }
      e.sp.update(Math.min(0.05, E.dt || 0.016));
      e.sp.position.set(B.cx(N.c) + ts / 2, B.cy(N.r) + ts / 2); e.sp.scale.set((ts / 56) * NEST_K * 0.5); box.addChild(e.sp);
    });
  }

  // ---- flotadores de pesca (scenes/models/bobber.xml: modelo ×1,45 con su sombra; "Bait" en reposo y, al picar,
  // "Catch" con BobberRipple, o BobberSplash si suelta tres peces)
  const bobLive = new WeakMap(), bobSeen = new WeakSet();
  let BOB_K = 1.45, BOB_SY = -1; GL.bobK = (k, sy) => { BOB_K = k; if (sy != null) BOB_SY = sy; };
  function drawBobbers(B) {
    const { S, ts } = B; if (!S.bob || !B3D) { if (S.bob && B3D === null) load3d(); return; }
    for (const f of B.fxs) if (f.type === 'bobber' && f.age >= 0 && !bobSeen.has(f)) {
      bobSeen.add(f);
      const b = S.bob.find((q) => q.r === f.r && q.c === f.c); if (b) bobLive.set(b, E.t);
      E.kfx(f.n > 1 ? 'BobberSplash' : 'BobberRipple', B.cx(f.c), B.cy(f.r), ts / 80);
    }
    S.bob.forEach((b, i) => {
      const x = B.cx(b.c), y = B.cy(b.r), t0 = bobLive.get(b), tc = t0 != null ? E.t - t0 : 99, catching = tc < 156 / 60;
      const an = catching ? 'catch' : 'bait', at = catching ? tc : (E.t + i * 0.7) % (178 / 60), u = ts / 80;
      const X = { S: 1, sc: [BOB_K, BOB_SY * BOB_K, BOB_K], tr: [0, 0, 0], key: 'b' + i, flat: true };
      draw3d('bobbershadow', an, at, x, y, u, 0.6, Object.assign({}, X, { key: 's' + i }));
      draw3d('bobber', an, at, x, y, u, 1, X);
    });
  }

  // ---- cordón de colores (RainbowTwist): las espirales son piezas del tablero (twist.png, chain_layer1_c); aquí, debajo,
  // el eslabón (candy:chain_link, 150 × 44 para un caramelo de 80) entre cada dos vecinas de la misma cadena
  function drawTwists(B) {
    const { S, ts } = B, at2 = (r, c) => S.grid[r] && S.grid[r][c];
    for (let r = 0; r < S.R; r++) for (let c = 0; c + 1 < S.C; c++) {
      const a = at2(r, c), b = at2(r, c + 1);
      if (a && b && a.kind === 'twist' && b.kind === 'twist' && a.tw === b.tw) img('candy:chain_link', (B.cx(c) + B.cx(c + 1)) / 2, B.cy(r), { w: ts * 0.94, h: ts * 0.28 });
    }
  }

  // ---- cerrojos de pedido (scenes/board_assets/orlock_multitile_border y _fill): el marco naranja estirable (tex/candy/orlock,
  // bordes de 20) alrededor de su zona, el velo blanco encima de los caramelos y lo que pide con lo que falta; al abrirse,
  // OrlockShatter y OrlockIconOrderCollected
  const orlDone = new WeakSet();
  function drawOrlocks(B) {
    const { S, ts, bx, by } = B; if (!S.orl) return;
    for (const o of S.orl) {
      const x0 = bx + o.c * ts, y0 = by + o.r * ts, w = o.w * ts, h = o.h * ts, cx = x0 + w / 2, cy = y0 + h / 2;
      if (o.left <= 0) { if (!orlDone.has(o)) { orlDone.add(o); E.kfx('OrlockShatter', cx, cy, ts / 80); E.kfx('OrlockIconOrderCollected', cx, cy, ts / 80); } continue; }
      const g = gfx(); g.beginFill(0xffffff, 0.13 * 2.4); g.drawRect(x0, y0, w, h); g.endFill();
      nine('candy:orlock', x0 - ts * 0.06, y0 - ts * 0.06, w + ts * 0.12, h + ts * 0.12, [20, 20, 20, 20], { inset: 0.55 });
      const tx = goalTexture({ type: o.type, key: o.key });
      if (tx) { const ow = tx.orig ? tx.orig.width : tx.width, oh = tx.orig ? tx.orig.height : tx.height, s2 = (ts * 0.62) / Math.max(ow, oh); img(tx, cx, cy - ts * 0.08, { w: ow * s2, h: oh * s2 }); }
      text(String(o.left), cx + ts * 0.22, cy + ts * 0.22, ts * 0.36, { fill: '#ffffff', stroke: '#173a7a', sw: ts * 0.07 });
    }
  }

  // ---- cobra gelatinosa de Candy Crush (scenes/board_assets/candy_cobra.xml): enroscada en su casilla (snake_tile) con la
  // textura y escala de las vidas que le quedan (lives1..5: snake_01 = a punto, ×1; ×0,9; ×0,85) y su animación de reposo
  // (lives1 "idle_body", las otras "idle_head", más lenta cuantas más vidas); al cargarla, "eat" (×2). Cargada, la que ataca
  // (snake_attack: start ×3, move ×4 en bucle, finish ×2) cruza la fila hasta su cesta (vfx_snake_basket_diffuse, 70 × 1,1)
  // dejando su estela rosa (special_effects/snake_blocker_scene.xml). Un caramelo son 80 unidades, como en los potenciadores
  const cobraLive = new Map(), snakes = [];
  let lastB = null;
  GL._snakeGo = (r, c) => lastB && snakeGo(lastB, r, c); // para probar
  const COBRA = [[1, 'body', 0.8], [0.9, 'head', 0.8], [0.9, 'head', 0.8], [0.85, 'head', 0.7], [0.85, 'head', 0.6]];
  const cobraOk = () => on() && !(GL.off && GL.off.cobra) && !!(B3D && B3D.models.snake);
  function cobra3d(t, x, y, sc, alpha, box, ts) {
    const hp = Math.max(1, Math.min(5, t.vhp != null ? t.vhp : t.hp)), u = ts / 80;
    let e = cobraLive.get(t); if (!e) { e = { hp, eat: -9, ph: Math.random() * 3 }; cobraLive.set(t, e); }
    if (hp < e.hp) e.eat = E.t; e.hp = hp; e.seen = cbFrame;
    const [k, idle, sp] = COBRA[hp - 1], te = (E.t - e.eat) * 2, A = B3D.anims['snake_' + idle], loop = A.nf / A.fps;
    const m = draw3d('snake', te < 39 / 24 ? 'eat' : idle, te < 39 / 24 ? te : ((E.t + e.ph) * sp) % loop, x, y, u, alpha,
      { S: 1, sc: [k, -k, k], tex: hp === 1 ? 'snake' : 'snake' + hp, key: t.id, flat: true });
    if (!m) return false;
    root.removeChild(m); box.addChild(m);
    if (cobraLive.size > 40) for (const [o, v] of cobraLive) if (!(v.seen >= cbFrame - 30)) cobraLive.delete(o);
    return true;
  }
  function snakeGo(B, r, c) {
    const dir = B.S.C - 1 - c >= c ? 1 : -1, x0 = B.cx(c), ts = B.ts;
    const xe = Math.max(ts * 0.5, Math.min(E.W - ts * 0.5, dir > 0 ? B.bx + B.S.C * ts + ts * 0.45 : B.bx - ts * 0.45));
    snakes.push({ r, dir, x0, xe, t0: E.t, T: (Math.abs(xe - x0) / ts) * (5 / 60) + 0.12 }); // una casilla cada 5 tics, como la lógica
  }
  function drawSnakes(B) {
    const ts = B.ts, u = ts / 80, L = 86 * u; lastB = B; // la cabeza está a 86 unidades de su origen
    for (let i = snakes.length - 1; i >= 0; i--) {
      const s = snakes[i], t = E.t - s.t0, y = B.cy(s.r), fin = 29 / 48, end = s.T + fin + 0.35;
      if (t > end) { snakes.splice(i, 1); continue; }
      const k = Math.max(0, Math.min(1, (t - 0.12) / (s.T - 0.12))), head = s.x0 + (s.xe - s.x0) * k, a = t > s.T + fin ? 1 - (t - s.T - fin) / 0.35 : 1;
      img('candy:vfx_snake_basket_diffuse', s.xe, y, { w: ts * 1.1, h: ts * 1.1, alpha: Math.min(1, t / 0.15) * a });
      if (t < s.T + 0.2) { // estela (sprite_trail con vfx_lighten_blend: rosa, aditiva)
        const g = gfx(), x1 = Math.min(s.x0, head - s.dir * L), x2 = Math.max(s.x0, head - s.dir * L); g.blendMode = PIXI.BLEND_MODES.ADD;
        g.alpha = 0.5 * Math.max(0, 1 - Math.max(0, t - s.T) / 0.2); g.beginFill(0xff0081, 0.6); g.drawRoundedRect(x1, y - ts * 0.16, x2 - x1, ts * 0.32, ts * 0.16); g.endFill();
      }
      const an = t < 0.12 ? 'start' : t < s.T ? 'move' : 'finish', at = t < 0.12 ? t * 3 : t < s.T ? ((t - 0.12) * 4) % (61 / 24) : (t - s.T) * 2;
      draw3d('snakemove', an, at, head - s.dir * L, y, u, a, { S: 1, sc: [s.dir, -1, 1], key: i, flat: true });
    }
  }

  // ---- rápidos del arcoíris de Candy Crush ("flipper"): el canal oscuro de cada casilla (tex/candy_mix: path_line recto,
  // path_corner de izquierda a abajo), el molde al final (mold) y el arcoíris en 3D que llena casilla a casilla
  // (scenes/flipper/path_line_filled y path_l_filled: modelos ×10 tumbados 90° en x, 10 fotogramas a 24 por segundo;
  // UpDown entra por arriba, DownUp por el otro lado). Al llegar al molde sale el caramelo arcoíris (rainbow_candy,
  // rainbow_candy_morph) y el arcoíris se vacía (Shrink)
  const rapLive = new WeakMap(), FILL = 10 / 24;
  const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // arriba, derecha, abajo, izquierda (girar 90° = siguiente)
  const side = (dr, dc) => SIDES.findIndex(([x, y]) => x === dc && y === dr);
  const rapidOk = (B) => on() && !!B.S.rapid && !(GL.off && GL.off.rapid) && !!tex('candymix:path_line');
  function rapidPieces(p) { // por casilla: lado de entrada y de salida (0..3)
    return p.cells.map(([r, c], i) => {
      const pr = p.cells[i - 1], nx = p.cells[i + 1];
      const sin = pr ? side(pr[0] - r, pr[1] - c) : 0, sout = nx ? side(nx[0] - r, nx[1] - c) : (sin + 2) % 4;
      return { r, c, sin, sout };
    });
  }
  function drawRapids(B) {
    const ts = B.ts, u = ts / 100, now = E.t;
    for (const p of B.S.rapid) {
      let e = rapLive.get(p);
      if (!e || e.cells !== p.cells) { e = { cells: p.cells, pcs: rapidPieces(p), ft: [] }; for (let i = 0; i < p.p; i++) e.ft[i] = -99; rapLive.set(p, e); }
      for (let i = 0; i < Math.min(p.p, p.cells.length); i++) if (e.ft[i] == null) e.ft[i] = Math.max(now, (e.ft[i - 1] || -99) + FILL * 0.8);
      const n = p.cells.length, done = p.p >= n, tc = done ? e.ft[n - 1] + FILL : 1e9;
      if (done && now >= tc && !e.morph) { e.morph = true; const q = p.mold ? { r: p.mold[0], c: p.mold[1] } : e.pcs[n - 1]; E.kfx('rainbow_candy_morph', B.cx(q.c), B.cy(q.r), ts / 80); }
      e.pcs.forEach((q, i) => { // canal
        const x = B.cx(q.c), y = B.cy(q.r), straight = (q.sin + 2) % 4 === q.sout;
        if (straight) img('candymix:path_line', x, y, { w: ts * 1.03, h: ts * 1.03, rot: q.sin % 2 ? Math.PI / 2 : 0 });
        else { const k = [0, 1, 2, 3].find((k) => [(3 + k) % 4, (2 + k) % 4].every((s2) => s2 === q.sin || s2 === q.sout)); img('candymix:path_corner', x, y, { w: ts * 1.03, h: ts * 1.03, rot: (k * Math.PI) / 2 }); }
      });
      const shr = now - tc - 0.5; // el arcoíris se vacía medio segundo después de llegar
      if (shr < FILL) e.pcs.forEach((q, i) => { // arcoíris
        if (e.ft[i] == null || e.ft[i] > now) return; // aún no le ha llegado
        const x = B.cx(q.c), y = B.cy(q.r), straight = (q.sin + 2) % 4 === q.sout;
        // recto: arriba-abajo girado para que "UpDown" entre por q.sin; esquina (arriba y derecha): UpDown entra por arriba y DownUp por la derecha
        let k, an;
        if (straight) { k = q.sin; an = 'up'; }
        else { k = [0, 1, 2, 3].find((k) => (k % 4 === q.sin && (1 + k) % 4 === q.sout) || ((1 + k) % 4 === q.sin && k % 4 === q.sout)); an = k === q.sin ? 'up' : 'down'; }
        const at = shr > 0 ? shr : Math.min(FILL - 0.001, Math.max(0, now - e.ft[i]));
        draw3d(straight ? 'pline' : 'pl', shr > 0 ? 'shrink' : an, at, x, y, u, 1, { S: 10, sc: [1, 1, 1], rot: [90, 0, k * 90], key: p.cells[0] + ':' + i, flat: true });
      });
      const q = p.mold ? { r: p.mold[0], c: p.mold[1] } : e.pcs[n - 1], x = B.cx(q.c), y = B.cy(q.r); // el molde (su casilla, debajo del final) y, al llegar, el caramelo arcoíris
      img('candymix:mold', x, y, { w: ts, h: ts });
      if (done && now >= tc && now < tc + 1.2) { const kk = Math.min(1, (now - tc) / 0.25), a = now > tc + 0.9 ? 1 - (now - tc - 0.9) / 0.3 : 1; img('candymix:rainbow_candy2', x, y, { w: ts * 0.8 * kk, h: ts * 0.8 * kk, alpha: a }); img('candymix:rainbow_candy', x, y, { w: ts * 0.8 * kk, h: ts * 0.8 * kk, alpha: a }); }
    }
  }

  // tarta bomba (scenes/board_assets/blocker_cakeBomb.xml): bandeja de 200 × 200 (2 × 2 casillas) y 8 porciones en su sitio;
  // se van quitando de la 8 a la 1
  const CAKE = [[-53.7, -10.7, 65, 95], [-80.0, -12.1, 88, 72], [-6.2, -10.7, 70, 96], [-4.0, -13.2, 92, 65], [-2.0, -63.8, 88, 73], [-77.0, -63.2, 84, 73], [-54.0, -92.5, 61, 98], [-21.5, -88.5, 84, 94]];
  const CAKEZ = [7, 6, 5, 4, 3, 2, 1, 0]; // orden de dibujo (z de la escena)
  function drawCake(t, x, y, ts, alpha, box) {
    const k = ts / 100, left = t.vhp != null ? t.vhp : t.cake ? t.cake.hp : 8;
    const put2 = (id, px2, py2, w, h, ax, ay) => { const sp = img(id, px2, py2, { w, h, ax, ay, alpha }); if (sp) { root.removeChild(sp); box.addChild(sp); } };
    put2('candymix:t_cakeBomb_tray_d', x, y, 200 * k, 200 * k, 0.5, 0.5);
    for (const i of CAKEZ) if (i < left) { const [ox, oy, w, h] = CAKE[i]; put2('candymix:t_cakeBomb_slice_0' + (i + 1) + '_d', x + ox * k, y + oy * k, w * k, h * k, 0, 0); }
  }
  const _begin = begin; // las capas del tablero se reutilizan: que begin() no las destruya
  begin = function () { if (piecesMask.g) root.removeChild(piecesMask.g); _begin(); };

  // cabecera de Candy Crush, montada con sus piezas en el sitio que tienen en la captura del nivel 1 real (la escena
  // game_hud_bar_v2 la recoloca el juego desde su código): cartón rosa hasta 236 px, nivel arriba a la izquierda, los
  // movimientos grandes debajo, la barra de puntos granate con tres estrellas arriba al centro y el papel de los objetivos
  const barGot = { P: null, n: 0 };
  function drawHud(st, B) {
    const P = st.P, hard = E.hardness ? E.hardness(st.n) : 0;
    nine('hud:pnl_cardboard_pink', -px(40), -px(240), E.W + px(80), px(478), [100, 90, 100, 90], { inset: 0.5, tint: hard === 2 ? 0x50e8f0 : hard === 1 ? 0xc79cff : 0xffffff }); // difícil, morado; superdifícil, turquesa
    const gs = gfx(); gs.beginFill(0xffffff, 0.18); // rayas diagonales claras del cartón
    for (let x = -px(260); x < E.W + px(260); x += px(150)) gs.drawPolygon([x, px(226), x + px(64), px(226), x + px(64) + px(226), 0, x + px(226), 0]);
    gs.endFill();
    // nivel
    text(String(st.n), px(180), px(44), px(46), { fill: '#d22a72', stroke: '#ffd6e8', sw: px(4) });
    // movimientos: blancos con contorno rosa y sombra
    if (isFinite(P.moves) && P.moves < 900) {
      const m = String(Math.max(0, P.moves));
      text(m, px(172), px(141), px(92), { fill: '#c43b7d', stroke: '#c43b7d', sw: px(16) });
      text(m, px(170), px(135), px(92), { fill: '#ffffff', stroke: '#ea5b9b', sw: px(12) });
    }
    // barra de puntos: granate con el relleno naranja y tres estrellas (rosas; amarillas al conseguirlas)
    const bx = px(338), bw = px(427), by = px(33), bh = px(24);
    const g = gfx(); g.beginFill(0x8a2a55); g.drawRoundedRect(bx, by, bw, bh, bh / 2); g.endFill();
    // (Dulces da las estrellas por los movimientos que sobran: la barra enseña lo que llevas de los objetivos)
    let tot = 0, done = 0; for (const gl of P.goals || []) { tot += gl.count; done += Math.max(0, gl.count - Math.max(0, gl.left)); }
    const prog = tot ? Math.min(1, done / tot) : 0, sc = [1 / 3, 2 / 3, 1], top = 1;
    if (prog > 0) { const f = gfx(); f.beginFill(0xff8a2a); f.drawRoundedRect(bx + px(3), by + px(3), Math.max(bh - px(6), (bw - px(6)) * prog), bh - px(6), (bh - px(6)) / 2); f.endFill(); }
    const got = sc.filter((v) => prog >= v - 1e-6).length;
    if (barGot.P !== P) { barGot.P = P; barGot.n = got; } // estrella conseguida: su estallido (effect_progressBar_Hit) y su sonido
    else if (got > barGot.n) {
      for (let i = barGot.n; i < got; i++) { const x = bx + bw * Math.min(0.95, sc[i] / top * 0.95); E.kfx('effect_progressBar_Hit_01', x, by + bh / 2, px(1.4)); E.sfx('barStar' + (i + 1)); }
      barGot.n = got;
    }
    sc.forEach((v, i) => {
      const x = bx + bw * Math.min(0.95, v / top * 0.95), y = by + bh / 2, s = px(44 + i * 4);
      img(i < got ? 'hud:hud_scoreStar_yellow_star_revamp' : 'hud:hud_unfilled_star_newhud_star_revamp', x, y, { w: s, h: s });
    });
    // papel de los objetivos
    nine('hud:pnl_hud_goal_paper', px(340), px(82), px(408), px(156), [40, 50, 40, 20], { inset: 0.5 });
    E.hotspot('gl_ask', px(340), px(82), px(408), px(150), st.ask); // tocar los objetivos: "¿qué es esto?"
    drawGoals(st);
    loadSpine();
    const Y = yeti(hard);
    if (Y && !(GL.off && GL.off.yeti) && B.celebrate == null) { Y.alpha = 1; yetiMood(Y, st, B); Y.update(Math.min(0.05, E.dt || 0.016)); Y.position.set(px(915), px(216)); Y.scale.set(px(0.78)); root.addChild(Y); }
  }
  // esqueletos Spine 4.0 de Candy Crush, cada uno con las piezas de su atlas: el Yeti de la cabecera (yeti.json, atlas
  // yeti_hud, con su "idle_main" y la piel de la dificultad del nivel) y la bomba de color (models/color_bomb: la bomba,
  // su aura y el brillo de cada caramelo que alcanza; atlas booster_vfx). El lector de Spine (pixi-spine) va solo en
  // privado/, como las piezas de King: su licencia pide la del editor Spine para repartirlo
  const SKEL = { nest: ['dragon_nest.json', 'dragonnest'], yeti: ['yeti_skel.json', 'yeti'], cbomb: ['ColorBomb.json', 'boostervfx'], cbaura: ['ColorBombAura.json', 'boostervfx'], cbitem: ['ColorBombItem_vfx.json', 'boostervfx'], cbitemol: ['ColorBombItem_vfx_OL.json', 'boostervfx'], fish: ['fish.skel', 'boostervfx'], fish2: ['fish2.skel', 'boostervfx'] };
  const skelJson = {}, skelData = {}, spineAtlas = {};
  let YETI = null, spineLoading = false;
  function loadSpine() {
    if (spineLoading) return; spineLoading = true;
    const base = E.privBase() + 'gl/';
    const add = (src, cb) => { const sc = document.createElement('script'); sc.src = base + src; sc.onload = cb; sc.onerror = () => {}; document.head.appendChild(sc); };
    setTimeout(() => { if (B3D === null) load3d(); }, 1500); // modelos 3D de los potenciadores, sin esperar a usarlos
    add('spine_base.js', () => add('spine_40.js', () => {
      for (const n in SKEL) {
        const x = new XMLHttpRequest(), bin = SKEL[n][0].endsWith('.skel'); x.open('GET', base + SKEL[n][0]); if (bin) x.responseType = 'arraybuffer'; // .skel: Spine binario
        x.onload = () => { try { skelJson[n] = bin ? new Uint8Array(x.response) : JSON.parse(x.responseText); } catch (e) { console.warn('spine', n, e); } };
        x.send();
      }
    }));
  }
  function spineData(n) {
    if (skelData[n] !== undefined) return skelData[n];
    const js = skelJson[n], an = SKEL[n][1], A = atlases[an];
    if (!js || !A || !PIXI.spine || !PIXI.spine40) return null;
    try {
      let at = spineAtlas[an];
      if (!at) { at = spineAtlas[an] = new PIXI.spine.TextureAtlas(); for (const f in A.frames) at.addTexture(f, tex(an + ':' + f)); }
      const c0 = document.createElement('canvas'); c0.width = c0.height = 2; const none = PIXI.Texture.from(c0); // piezas de otras pieles que no vienen en este atlas
      for (const sk of (js.skins || [])) for (const slot in sk.attachments) for (const a0 in sk.attachments[slot]) {
        const a = sk.attachments[slot][a0], nm = a.path || a.name || a0;
        if (!A.frames[nm] && !at.findRegion(nm) && (a.type || 'region') !== 'clipping' && a.type !== 'boundingbox' && a.type !== 'point' && a.type !== 'path') at.addTexture(nm, none);
      }
      if (js instanceof Uint8Array) { // binario: no se pueden mirar sus piezas antes, así que las que falten salen vacías
        const ld = new PIXI.spine40.AtlasAttachmentLoader(at);
        const miss = (nm) => { if (!at.findRegion(nm)) at.addTexture(nm, none); };
        for (const k of ['newRegionAttachment', 'newMeshAttachment']) { const o = ld[k].bind(ld); ld[k] = (skin, name, path) => { miss(path || name); return o(skin, name, path); }; }
        skelData[n] = new PIXI.spine40.SkeletonBinary(ld).readSkeletonData(js);
      } else skelData[n] = new PIXI.spine40.SkeletonJson(new PIXI.spine40.AtlasAttachmentLoader(at)).readSkeletonData(js);
    } catch (e) { console.warn('spine', n, e); skelData[n] = false; }
    return skelData[n];
  }
  function newSpine(n) { const sd = spineData(n); if (!sd) return null; const sp = new PIXI.spine40.Spine(sd); sp.autoUpdate = false; return sp; }
  GL.newSpine = newSpine; // para probar desde la consola
  // para probar: un trozo del último fotograma de WebGL (en unidades del juego) como imagen
  GL.snap = function (x, y, w, h) {
    const k = app.renderer.resolution, c = app.renderer.extract.canvas(app.stage), o = document.createElement('canvas');
    o.width = Math.round(w * E.scale); o.height = Math.round(h * E.scale);
    const f = c.width / (E.W * E.scale); o.getContext('2d').drawImage(c, x * E.scale * f, y * E.scale * f, w * E.scale * f, h * E.scale * f, 0, 0, o.width, o.height);
    return o.toDataURL();
  };
  // para probar: hoja con los fotogramas de una animación del esqueleto n (cada paso s segundos) en un lienzo 2D
  GL.sheet = function (n, anim, step, cols, skin, size) {
    const sp = newSpine(n); if (!sp) return null; if (skin) { sp.skeleton.setSkinByName(skin); sp.skeleton.setSlotsToSetupPose(); }
    const A = sp.spineData.findAnimation(anim), N = Math.max(1, Math.ceil(A.duration / step)), W = size || 160;
    sp.state.setAnimation(0, anim, false); sp.update(0);
    const box = new PIXI.Container(); box.addChild(sp);
    const rt = PIXI.RenderTexture.create({ width: W * Math.min(cols, N), height: W * Math.ceil(N / cols) });
    const fr = []; for (let i = 0; i < N; i++) { sp.update(i ? step : 0.0001); const b = sp.getLocalBounds(); fr.push([b.x, b.y, b.width, b.height]); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const f of fr) { x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0] + f[2]); y1 = Math.max(y1, f[1] + f[3]); }
    const k = W / Math.max(x1 - x0, y1 - y0);
    sp.state.setAnimation(0, anim, false); sp.update(0);
    for (let i = 0; i < N; i++) {
      sp.update(i ? step : 0.0001); sp.scale.set(k); sp.position.set((i % cols) * W - x0 * k, Math.floor(i / cols) * W - y0 * k);
      app.renderer.render(box, { renderTexture: rt, clear: i === 0 });
    }
    return app.renderer.extract.canvas(rt).toDataURL();
  };
  function yeti(hard) {
    if (YETI === null && spineData('yeti')) { YETI = newSpine('yeti'); YETI.skinNow = ''; YETI.state.setAnimation(0, 'idle_main', true); }
    else if (YETI === null && skelData.yeti === false) YETI = false;
    if (YETI) { const sk = ['standard', 'hard', 'super_hard'][Math.min(2, hard || 0)]; if (YETI.skinNow !== sk) { YETI.skeleton.setSkinByName(sk); YETI.skeleton.setSlotsToSetupPose(); YETI.skinNow = sk; } }
    return YETI;
  }
  // lo que hace el Yeti, como en Candy Crush: en reposo "idle_main"; contento ("Happy") con cada exclamación (¡Dulce!,
  // ¡Delicioso!…); bailando ("win_dance_loop") al ganar y durante el final dulce; triste ("sad_loop") al perder
  let yetiHappyAt = -9;
  function yetiMood(Y, st, B) {
    if (!E.exclaim.yeti) { const ex = E.exclaim; E.exclaim = function () { yetiHappyAt = E.t; return ex.apply(this, arguments); }; E.exclaim.yeti = true; }
    const want = st.state === 'won' ? (B && B.tossing ? 'tossing' : 'win_dance_loop') : st.state === 'lost' || (E.popup && E.popup.lost) ? 'sad_loop' : 'idle_main';
    const happy = want === 'idle_main' && E.t - yetiHappyAt < 0.2 && Y.moodNow !== 'Happy';
    if (happy) { Y.state.setAnimation(0, 'Happy', false); Y.state.addAnimation(0, 'idle_main', true, 0); Y.moodNow = 'Happy'; Y.moodBase = 'idle_main'; return; }
    if (Y.moodBase === 'Hide') { Y.state.setAnimation(0, 'appear', false); Y.state.addAnimation(0, want, true, 0); Y.moodBase = want; Y.moodNow = want; } // vuelve a su círculo
    else if (Y.moodBase !== want) { Y.state.setAnimation(0, want, true); Y.moodBase = want; Y.moodNow = want; }
    else if (Y.moodNow === 'Happy' && E.t - yetiHappyAt > 1.5) Y.moodNow = want;
  }
  // celebración al ganar (Candy Crush, rec_001): el tablero y la cabecera se oscurecen de morado, el Yeti sale de su
  // círculo de un salto ("success_final") y baila sobre su palo ("success_final_idle"); a los 2 s, "¡Maravilloso!" y
  // "¡Nivel completado!"; el oscuro se va en los últimos 0,3 s
  let celebY = null; GL._celeb = () => celebY; // para probar
  const CELEB_Y = (GL.celebY = [569, 2209, 1.08]); // origen (el pie del palo) y escala del Yeti grande, medidos en rec_001
  function drawCelebration(st, B) {
    const t = E.t - B.celebrate, D = 3.4;
    const a = Math.min(1, t / 0.3) * Math.min(1, Math.max(0, (D - t) / 0.3));
    const hard = E.hardness ? E.hardness(st.n) : 0, Y = yeti(hard);
    if (Y && !celebY && spineData('yeti')) celebY = newSpine('yeti');
    if (Y && celebY) { // el de la cabecera se esconde ("Hide") y deja el círculo vacío; sale el grande
      if (Y.moodBase !== 'Hide') { Y.state.setAnimation(0, 'Hide', false); Y.moodBase = Y.moodNow = 'Hide'; }
      Y.update(Math.min(0.05, E.dt || 0.016)); Y.alpha = 1; Y.position.set(px(915), px(216)); Y.scale.set(px(0.78)); root.addChild(Y);
    }
    const g = gfx(); g.beginFill(0x281c5c, 0.82 * a); g.drawRect(0, 0, E.W, E.H); g.endFill(); // el oscuro, también sobre la cabecera
    if (Y && celebY) {
      const C = celebY;
      if (C.skinNow !== Y.skinNow) { C.skeleton.setSkinByName(Y.skinNow); C.skeleton.setSlotsToSetupPose(); C.skinNow = Y.skinNow; }
      if (C.start !== B.celebrate) { C.start = B.celebrate; C.state.setAnimation(0, 'success_final', false).trackTime = 0.9; C.state.addAnimation(0, 'success', true, 0); } // entra de un salto por la izquierda y baila con los brazos arriba
      C.update(Math.min(0.05, E.dt || 0.016)); C.position.set(px(CELEB_Y[0]), E.H + px(CELEB_Y[1] - 1920)); C.scale.set(px(CELEB_Y[2])); C.alpha = Math.min(1, (D - t) / 0.3); root.addChild(C); // el pie del palo, bajo el borde de abajo, como en rec_001 (vale para pantallas de otra proporción)
    }
    const pop = (t0) => { const k = Math.max(0, Math.min(1, (t - t0) / 0.25)); return k <= 0 ? 0 : k < 1 ? 1 + Math.sin(k * Math.PI) * 0.15 : 1; };
    const s1 = pop(2), s2 = pop(2.25);
    if (s1) { const tx = text('¡Maravilloso!', E.W / 2, E.H * 0.33, px(84), { fill: '#ffffff', stroke: '#3a1e6e', sw: px(10), shadow: true }); tx.scale.set(0.5 * s1); tx.alpha = a; }
    if (s2) { const tx = text('¡Nivel completado!', E.W / 2, E.H * 0.41, px(50), { fill: '#ffffff', stroke: '#3a1e6e', sw: px(8) }); tx.scale.set(0.5 * s2); tx.alpha = a; }
  }
  function starsNow(st) {
    const P = st.P, sp = st.spec; if (!sp || !sp.starScores) return 0;
    let n = 0; for (const s of sp.starScores) if ((P.score || 0) >= s) n++; return n;
  }
  // objetivos en el papel del centro: el icono de Candy Crush de cada pedido y lo que falta (o la marca si ya está)
  const COLN = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  const GOALICON = { jelly: 'hud:jelly', ice: 'hud:order_frosting', lic: 'hud:order_liquorice', waffle: 'hud:hud_waffle', striped: 'hud:order_striped',
    gumball: 'hud:hud_gumball_machine', coat: 'hud:hud_sugarcoat', glass: 'hud:hud_glass', gum: 'hud:hud_bubblepop', choc: 'hud:order_chocolate', wrapper: 'hud:order_wonderful_wrapper', cake: 'hud:order_cakebomb',
    rapid: 'candymix:rainbow_candy', rope: 'hud:order_gummy_rope',
    skull: 'hud:hud_skull', cobra: 'hud:order_snake', shell: 'hud:order_licorice_shell', slock: 'candy:mulock1', twist: 'candy:chain_layer1_c' };
  const goalTex = new Map();
  function goalTexture(gl) {
    const id = gl.type === 'color' ? 'hud:hud_candy_' + COLN[gl.key] : GOALICON[gl.type];
    const t = id && tex(id); if (t) return t;
    const key = gl.type + ':' + gl.key; let e = goalTex.get(key); // sin pieza propia: el icono de siempre del juego
    if (!e) { const S = 128, c = document.createElement('canvas'); c.width = c.height = S; GAME.drawGoalIcon(c.getContext('2d'), gl, S / 2, S / 2, S * 0.9); e = PIXI.Texture.from(c); goalTex.set(key, e); }
    return e;
  }
  function drawGoals(st) {
    const goals = (st.P.goals || []).slice(0, 4), n = goals.length; if (!n) return;
    const cy = px(150), step = Math.min(px(150), px(380) / n);
    goals.forEach((gl, i) => {
      const x = px(544) + (i - (n - 1) / 2) * step, t = goalTexture(gl), s = px(n > 2 ? 80 : 96);
      const ow = t.orig ? t.orig.width : t.width, oh = t.orig ? t.orig.height : t.height, sc = s / Math.max(ow, oh);
      img(t, x, cy - px(4), { w: ow * sc, h: oh * sc });
      if (gl.left <= 0) img('hud:checkmark', x + px(26), cy + px(32), { w: px(48), h: px(40) });
      else text(String(gl.left), x + px(24), cy + px(34), px(42), { fill: '#ffffff', stroke: '#173a7a', sw: px(7) });
    });
  }

  // barra de potenciadores de abajo: la barra de Candy Crush (izquierda con el engranaje, centro, derecha; coloreadas
  // al exportar) y un disco por potenciador con su dibujo, lo que queda y el candado si no hay
  const BICON = { hammer: 'hudboost:booster_lollipop', row: 'hudboost:booster_strippedbrush', rainbow: 'hudboost:booster_colorbomb', switch: 'hudboost:booster_freeswitch', shuffle: 'hudboost:booster_shuffle' };
  // en el final dulce la barra baja y se va; en su sitio, "Toca para saltar" con su nube (TapToSkip_vertical)
  const barOut = { k: 0, skipT: -9 };
  function drawBoosters(st, B) {
    const away = !!(B && B.finaleOn && B.celebrate == null);
    barOut.k = Math.max(0, Math.min(1, barOut.k + (away ? 1 : -1) * Math.min(0.05, E.dt || 0.016) / 0.3));
    if (away && E.t - barOut.skipT > 30) { barOut.skipT = E.t; E.kfx('TapToSkip_vertical', E.W / 2, E.H - px(105), px(1.6)); }
    if (!away) barOut.skipT = -9;
    if (away && barOut.k > 0.5) text('Toca para saltar', E.W / 2, E.H - px(105), px(44), { fill: '#ffffff', stroke: '#e0457b', sw: px(7), shadow: true });
    if (barOut.k >= 1) return;
    const y0 = E.H - px(196) + barOut.k * barOut.k * px(260), h = px(182), x0 = px(54), x1 = E.W - px(54), lw = px(170);
    img('boosterbar:booster_bar_refresh_leftRGB', x0, y0, { ax: 0, ay: 0, w: lw, h });
    const cw = x1 - (x0 + lw) - px(81);
    img('boosterbar:booster_bar_refresh_centerRGB', x0 + lw, y0, { ax: 0, ay: 0, w: cw, h });
    img('boosterbar:booster_bar_refresh_rightRGB', x1 - px(81), y0, { ax: 0, ay: 0, w: px(81), h });
    const gy = y0 + h * 0.5;
    img('hudboost:settings_button_menu', x0 + px(70), gy, { w: px(96), h: px(97) }); // engranaje rosa
    E.hotspot('gl_pause', x0, y0, px(150), h, st.openPause);
    const items = GAME.boosters || [], n = items.length, d = px(140), area0 = x0 + lw + px(10), area1 = x1 - px(20), step = (area1 - area0) / n;
    items.forEach((b, i) => {
      const x = area0 + step * (i + 0.5), y = gy, have = st.boosterLeft(b.id), active = st.booster === b.id;
      img('hudboost:booster_button_blue', x, y, { w: d, h: d * 0.97, tint: active ? 0xfff0a0 : 0xffffff });
      const t = tex(BICON[b.id]);
      if (t) { const s = (d * 0.78) / Math.max(t.orig.width, t.orig.height); img(t, x, y - px(4), { w: t.orig.width * s, h: t.orig.height * s, alpha: have ? 1 : 0.85 }); }
      if (!have) img('hudboost:t_inv_lock', x + d * 0.3, y + d * 0.28, { w: px(60), h: px(67) });
      else {
        img('hudboost:booster_panel_revamp_amount_panel', x + d * 0.32, y + d * 0.32, { w: px(54), h: px(54) });
        text(have === Infinity ? '∞' : String(have), x + d * 0.32, y + d * 0.32, px(30), { fill: '#7a3b14' });
      }
      E.hotspot('gl_b_' + b.id, x - d / 2, y - d / 2, d, d, () => st.useBooster(b));
    });
  }
  // avisos: qué tocar (potenciador elegido o "¿qué es esto?") en el bocadillo de Candy Crush bajo la cabecera
  function drawNotices(st) {
    let y0 = px(HUD_H) + px(14);
    if (st.duo) { // por turnos con otra persona (nuestro): de quién es el turno y cómo van
      const w = px(760), h = px(90), x = E.W / 2 - w / 2;
      nine('hudboost:tool_tip_panel', x, y0, w, h, [40, 34, 40, 34], { inset: 0.6, tint: st.duo.turn ? 0xb4dcff : 0xffe7a0 });
      text('Turno de ' + st.duo.name + '  ·  ' + st.duo.score[0] + ' – ' + st.duo.score[1], E.W / 2, y0 + h / 2, px(40), { fill: '#7a3b14' });
      y0 += h + px(10);
    }
    if (!st.prompt) return;
    const w = px(940), h = px(120), x = E.W / 2 - w / 2, y = y0 + Math.sin(E.t * 3) * px(4);
    nine('hudboost:tool_tip_panel', x, y, w, h, [40, 34, 40, 34], { inset: 0.6 });
    text(st.prompt, E.W / 2, y + h / 2, px(44), { fill: '#7a3b14' });
  }
  // ---------------------------------------------------------------- mapa: barras de Candy Crush encima
  // (captura cc_2, 1200 px de ancho) arriba el cartón rosa rayado con dos cápsulas (en lugar de las vidas, el cofre de
  // estrellas; en lugar de los lingotes, la racha), el cuadro azul del evento (el día especial, si lo hay) y el engranaje;
  // abajo la barra de navegación rosa (Mapa, Misiones, Desafío, Trofeos), con el nombre solo en la activa
  // ---------------------------------------------------------------- el mapa entero con WebGL (GL.mapBody): fondo de cada
  // mundo, camino, carteles cada 20 niveles y los círculos de nivel con sus estrellas, con las mismas imágenes y medidas
  // que tenía en el lienzo 2D (los toques los sigue resolviendo el motor por posición)
  const elT = new Map();
  function elTex(name) { // imagen ya cargada por el motor (E.img / E.imgL) como textura
    let t = elT.get(name); if (t) return t;
    const im = (E.img && E.img(name)) || (E.imgL && E.imgL(name)); if (!im || (im.complete === false) || !(im.naturalWidth || im.width)) return null;
    t = PIXI.Texture.from(im); elT.set(name, t); return t;
  }
  function starG(g, x, y, r, fill, line) { // estrella de 5 puntas como E.star
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.lineStyle(line ? 2.5 : 0, line ? PIXI.utils.string2hex(line) : 0); g.beginFill(PIXI.utils.string2hex(fill)); g.drawPolygon(pts); g.endFill(); g.lineStyle(0);
  }
  const shadeHex = (hex, k) => { const c = PIXI.utils.string2hex(hex), r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255, f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))); return (f(r) << 16) | (f(gg) << 8) | f(b); };
  GL.mapBody = function (M) {
    if (!on() || !MAPSTYLE) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const zoneH = M.gap * M.world, z0 = Math.floor(M.scroll / zoneH);
    MAPSTYLE.bg(M, zoneH, z0);
    MAPSTYLE.path(M);
    // carteles de los mundos
    for (let i = M.first; i <= M.last; i++) {
      if ((i - 1) % M.world !== 0) continue;
      const p = M.pos(i), w = Math.floor((i - 1) / M.world), sx = p.x > E.W / 2 ? p.x - 250 : p.x + 70, sy = p.y - 60, g = gfx();
      g.beginFill(0x7a5230); g.drawRect(sx + 85, sy + 40, 12, 60); g.endFill();
      g.lineStyle(4, 0x7a5230); g.beginFill(0xb07a46); g.drawRoundedRect(sx, sy - 18, 180, 66, 12); g.endFill(); g.lineStyle(0);
      text('Mundo ' + (w + 1), sx + 90, sy - 2, 20, { fill: '#ffffff', stroke: '#5a3a1a', sw: 4 });
      const t = text(M.worldName(w), sx + 90, sy + 24, 17, { fill: '#fff8e8', stroke: '#5a3a1a', sw: 3 }); if (t && t.width > 172) t.scale.set((t.scale.x * 172) / t.width);
    }
    for (let i = M.first; i <= M.last; i++) {
      const p = M.pos(i), cur = i === M.level, done = i < M.level, r = cur ? 40 + Math.sin(E.t * 4) * 3 : 32;
      MAPSTYLE.node(M, i, p.x, p.y, r, cur, done, M.hard(i), M.stars(i));
    }
    return true;
  };
  // camino recorrido a trozos: f(x, y) cada "step" px a lo largo de la línea que une los niveles
  function alongPath(M, a, b, step, f) {
    let carry = 0;
    for (let i = a; i < b; i++) {
      const p = M.pos(i), q = M.pos(i + 1), L = Math.hypot(q.x - p.x, q.y - p.y);
      for (let d = carry; d < L; d += step) f(p.x + ((q.x - p.x) * d) / L, p.y + ((q.y - p.y) * d) / L, d);
      carry = (carry - L) % step; if (carry < 0) carry += step;
    }
  }
  function coverZone(t, zy, zoneH) { const s = Math.max(E.W / t.width, zoneH / t.height); img(t, (E.W - t.width * s) / 2, zy + (zoneH - t.height * s) / 2, { w: t.width * s, h: t.height * s, ax: 0, ay: 0 }); }
  // mapa de Dulces HD: la tierra verde con las decoraciones de cada mundo de Candy Crush, la carretera rosa con su raya
  // discontinua y los discos rosas con Tiffi en el nivel actual
  let mapGrad = null;
  const MAPSTYLE = {
    bg(M, zoneH, z0) {
      if (!mapGrad) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9fe0b0'); gr.addColorStop(1, '#6cc68a'); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); mapGrad = PIXI.Texture.from(c); }
      for (let z = z0 - 1; z <= z0 + 1; z++) { const zy = -z * zoneH - zoneH + M.scroll + E.H; img(mapGrad, 0, zy, { w: E.W, h: zoneH + 1, ax: 0, ay: 0 }); }
      const L0 = window.MAPA_DECOS || {}, keys = Object.keys(L0), step = 150, i0 = Math.floor(M.scroll / step) - 1;
      if (!keys.length) return;
      for (let i = i0; i <= i0 + Math.ceil(E.H / step) + 2; i++) {
        const y = -i * step + M.scroll + E.H, w = Math.max(0, Math.floor((i * step) / zoneH)), L = L0[keys[w % keys.length]] || []; if (!L.length) continue;
        const r = E.rng(i * 7919 + 3), left = ((i % 2) + 2) % 2 === 0, nm = L[Math.floor(r() * L.length)], t = elTex(nm); if (!t) continue;
        const big = nm.includes('_l_') ? 230 : nm.includes('_m_') ? 170 : 120, s = Math.min(big / t.width, big / t.height), x = left ? 8 + r() * 30 : E.W - 8 - t.width * s - r() * 30;
        img(t, x, y - t.height * s, { w: t.width * s, h: t.height * s, ax: 0, ay: 0 });
      }
    },
    path(M) {
      const g = gfx(), line = (w, c) => { g.lineStyle({ width: w, color: c, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND }); for (let i = M.first; i <= M.last; i++) { const p = M.pos(i); if (i === M.first) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); } };
      line(150, 0xf7c1d9); line(132, 0xfbd3e6); line(14, 0xffffff);
      g.lineStyle(0); g.beginFill(0xff6fa8); let prev = null;
      alongPath(M, M.first, M.last, 36, (x, y) => { if (prev) { const dx = x - prev[0], dy = y - prev[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; g.drawPolygon([prev[0] - uy * 7, prev[1] + ux * 7, prev[0] + ux * 18 - uy * 7, prev[1] + uy * 18 + ux * 7, prev[0] + ux * 18 + uy * 7, prev[1] + uy * 18 - ux * 7, prev[0] + uy * 7, prev[1] - ux * 7]); } prev = [x, y]; });
      g.endFill();
    },
    node(M, i, x, y, r, cur, done, hd, stars) {
      const base = hd === 2 ? '#6a2aa0' : hd === 1 ? '#a03ad0' : cur ? '#ff3f8f' : done ? '#ff5fa0' : '#f7a8c8', g = gfx();
      g.beginFill(0xa03c64, 0.35); g.drawEllipse(x, y + r * 0.55, r * 1.05, r * 0.5); g.endFill();
      if (cur) { g.beginFill(0xffffff, 0.55); g.drawCircle(x, y, r + 12 + Math.sin(E.t * 4) * 3); g.endFill(); }
      g.beginFill(0xffffff); g.drawCircle(x, y, r); g.endFill();
      g.beginFill(PIXI.utils.string2hex(base)); g.drawCircle(x, y - 1, r - 4); g.endFill();
      g.beginFill(shadeHex(base, 0.4), 0.7); g.drawEllipse(x - r * 0.15, y - r * 0.4, (r - 6) * 0.6, (r - 6) * 0.35); g.endFill();
      text(String(i), x, y + 1, i > 999 ? 22 : 28, { fill: '#ffffff', stroke: '#' + shadeHex(base, -0.5).toString(16).padStart(6, '0'), sw: 5 });
      if (hd && !done) img(hd === 2 ? 'hll2:skull_icon_superhard' : 'hll2:skull_icon_hard', x, y - r - 14, { w: 40, h: 35 });
      if (done) { const gs = gfx(); for (let k = 0; k < 3; k++) starG(gs, x + (k - 1) * 22, y + r + 6 + (k === 1 ? 4 : 0), 11, k < stars ? '#ffd23f' : '#e8c8d8', '#a0607a'); }
      if (cur) { const t = elTex('map_tiffi'); if (t) { const s = 120 / t.height; img(t, x - r - t.width * s + 6, y - 100, { w: t.width * s, h: t.height * s, ax: 0, ay: 0 }); } }
    },
  };
  GL.mapChrome = function (H) {
    if (!on()) return false;
    const P = E.popup; if (P && !(P.pre || P.lost || P.win || (P.gl && WINDOWS[P.gl.kind]))) return false; // ventana 2D: todo como siempre
    if (!usedThisFrame) begin(); // el mapa (GL.mapBody) ya está dibujado debajo
    usedThisFrame = true;
    const s = E.W / 1200, X = (v) => v * s, Y = (v) => v * s;
    // barra de arriba
    const bh = 132 * s;
    img('map:pnl_striped_pink_left', 0, 0, { ax: 0, ay: 0, w: 47 * s * 1.2, h: bh });
    img('map:pnl_striped_pink_center', 47 * s * 1.2, 0, { ax: 0, ay: 0, w: E.W - 2 * 47 * s * 1.2, h: bh });
    img('map:pnl_striped_pink_right', E.W - 47 * s * 1.2, 0, { ax: 0, ay: 0, w: 47 * s * 1.2, h: bh });
    const pill = (x0, x1, icon, label, iw) => {
      const g = gfx(); g.beginFill(0xffe8f0); g.drawRoundedRect(X(x0), Y(36), X(x1 - x0), Y(60), Y(30)); g.endFill();
      const t = tex(icon); if (t) { const k2 = (iw * s) / Math.max(t.orig.width, t.orig.height); img(t, X(x0 - 10), Y(62), { w: t.orig.width * k2, h: t.orig.height * k2 }); }
      text(label, X((x0 + x1) / 2 + 20), Y(64), 44 * s, { fill: '#8a1a4a' });
    };
    pill(300, 500, 'hud:icn_hud_star', H.chest + '/' + H.CHEST, 100);
    pill(720, 930, 'candies:chocolate_box_winstreak', String(H.streak || 0), 96);
    img('map:frm_avatar_01', X(600), Y(66), { w: 132 * s, h: 132 * s });
    if (H.fiesta && !H.fiesta.done) { img('popups:time_limited_badge', X(600), Y(66), { w: 112 * s, h: 112 * s }); E.hotspot('gl_m_fi', X(530), 0, X(140), Y(140), H.openFiesta); }
    else img('popups:tiffy', X(600), Y(66), { w: 108 * s, h: 102 * s });
    img('main:btn_pink', X(1130), Y(60), { w: 86 * s, h: 86 * s }); img('main:icn_settings', X(1130), Y(58), { w: 52 * s, h: 52 * s });
    E.hotspot('gl_m_set', X(1070), 0, X(130), Y(130), H.settings);
    // barra de navegación de abajo
    const nh = 158 * s, ny = E.H - nh, slots = [['navbar:navbar_map_icon', 'Mapa', null, true], ['navbar:navbar_events_icon', 'Misiones', H.openMissions, false, H.missions],
      ['navbar:navbar_pins_icon', 'Desafío', H.openWeekly, false, H.weekly && !H.weekly.done ? 1 : 0], ['main:icn_medal_gold', 'Trofeos', H.album, false]];
    const sw = E.W / slots.length;
    const nb = gfx(); nb.beginFill(0xff7fb6); nb.drawRect(0, ny, E.W, nh); nb.endFill(); nb.beginFill(0xffb3d4); nb.drawRect(0, ny, E.W, 3 * s); nb.endFill();
    slots.forEach(([icon, label, cb, active, badge], i) => {
      const x0 = i * sw, cx = x0 + sw / 2;
      if (active) { const ga = gfx(); ga.beginFill(0xffc4dd); ga.drawRect(x0, ny, sw, nh); ga.endFill(); }
      if (i > 0) { const gd = gfx(); gd.beginFill(0xe0609a); gd.drawRect(x0 - 1.5 * s, ny, 3 * s, nh); gd.endFill(); }
      const t = tex(icon); if (t) { const k2 = ((active ? 128 : 116) * s) / Math.max(t.orig.width, t.orig.height); img(t, cx, ny + (active ? 60 : 78) * s, { w: t.orig.width * k2, h: t.orig.height * k2 }); }
      if (active) text(label, cx, ny + 128 * s, 34 * s, { fill: '#8a1a4a' });
      if (badge) { img('map:pnl_notification_m', cx + 52 * s, ny + 30 * s, { w: 50 * s, h: 52 * s }); text(String(badge), cx + 52 * s, ny + 30 * s, 28 * s, { fill: '#ffffff' }); }
      if (cb) E.hotspot('gl_m_nav' + i, x0, ny, sw, nh, cb);
    });
    return true;
  };

  // ---------------------------------------------------------------- ventanas de Candy Crush
  // Sus prefabs (XML) a 750 × 1334 unidades, al 95 % de la pantalla; entran y salen con las animaciones de su escena
  const T = (k, d) => (SCN && SCN.text && SCN.text[k]) || d;
  function begin0() { if (!usedThisFrame) begin(); usedThisFrame = true; }
  const fade = (pop) => Math.min(1, pop.anim == null ? 1 : pop.anim);
  const backdrop = (a, al) => { const g = gfx(); g.beginFill(0x000000, al * a); g.drawRect(0, 0, E.W, E.H); g.endFill(); };
  const winK = () => Math.min((E.W * 0.95) / 750, (E.H * 0.95) / 1334); // unidades de los prefabs → unidades del juego
  // contenedor de la ventana con su animación de entrada y salida (desplazamientos en unidades de la escena)
  function winBox(pop, inA, outA) {
    const box = new PIXI.Container(); box.poolBox = true; root.addChild(box);
    pop.closeDur = animDur((SCN.anims[outA]) || {}) + 0.02;
    const k = winK(), m = pop.closing ? animXf(outA, E.t - pop.tc) : animXf(inA, E.t - (pop.t0 || 0));
    if (m) box.position.set(m.tx * k, m.ty * k);
    const add = (o) => { if (!o) return o; root.removeChild(o); box.addChild(o); return o; };
    const grow = (cx, cy, delay) => { // grupo que crece con OnAppearGrow
      const g = animXf('OnAppearGrow', pop.closing ? 9 : E.t - (pop.t0 || 0) - delay) || { sx: 1, sy: 1, rot: 0 };
      const c = new PIXI.Container(); c.poolBox = true; c.pivot.set(cx, cy); c.position.set(cx, cy); c.scale.set(g.sx, g.sy); box.addChild(c);
      return (o) => { if (!o) return o; root.removeChild(o); c.addChild(o); return o; };
    };
    const scene = (name, x, y, kk, o) => { const n0 = root.children.length; GL.scene(name, x, y, kk, o); for (const c of root.children.slice(n0)) add(c); };
    return { box, add, grow, scene };
  }
  GL.popup = function (pop, g) {
    if (!on() || !SCN) return false;
    if (pop.pre || pop.lost || pop.win) begin0();
    if (pop.pre && SCN.scenes.prelevel_d0) return preLevel(pop);
    if (pop.lost) return lostLevel(pop);
    if (pop.gl && WINDOWS[pop.gl.kind]) { begin0(); WINDOWS[pop.gl.kind](pop, pop.gl); return true; }
    if (pop.win) { // Candy Crush no tiene ventana de ganar: tras el final dulce vuelve al mapa (grabación del juego real)
      begin0(); if (!pop.autoNext) { pop.autoNext = true; E.after(0.4, pop.win.next); }
      return true;
    }
    return false; // las demás, por ahora, las de siempre
  };
  // frase del objetivo, la de Candy Crush según lo que pide el nivel
  function goalPhrase(goals) {
    const has = (t) => goals.some((g) => g.type === t), jelly = has('jelly'), ing = has('ing'), rapid = has('rapid');
    const orders = goals.some((g) => !['jelly', 'ing', 'rapid'].includes(g.type));
    const key = rapid ? 'rainbow_drop' : jelly && ing ? 'jelly_drop' : jelly && orders ? 'jelly_order' : jelly ? 'light_up' : ing && orders ? 'order_drop' : ing ? 'drop_down' : 'order';
    return T('game_swipe_intro_mode_' + key + '_header', '¡Recoge todos los pedidos!');
  }
  const SBICON = { stripe: 'candies:T_stritpdCandy', wrap: 'candies:T_wrappedCandy', cbomb: 'hudboost:booster_colorbomb' };
  // antes del nivel, montada con las piezas de Candy Crush y las medidas de su captura (1200 px de ancho, nivel 55
  // difícil): marco de caramelo, cinta del título (rosa con "Nivel N"; envoltorio morado "Difícil" con la calavera si es
  // difícil, burdeos si es superdifícil), recuadro de los objetivos con sus iconos y la frase, "Nivel N" debajo en los
  // difíciles, tres potenciadores de inicio redondos con lo que tienes y el botón rosa "¡Jugar!"
  const HARD = [null, { tint: 0xb04df2, panel: 'hll2:popup_bkg_panel_hard', candy: 1, skull: 'hll2:skull_icon_hard', label: 'core_hardlevel_label_hard', def: 'Difícil', inset: 0x8a3ab8 },
    { tint: 0x14b4c4, panel: 'hll2:popup_bkg_panel_superhard', candy: 2, skull: 'hll2:skull_icon_superhard', label: 'core_hardlevel_label_superhard', def: 'Superdifícil', inset: 0x1a8a96 }]; // colores de hll_panel_gradients: morado y turquesa
  // panel, marco, cinta del título y cerrar: lo común de antes y después del nivel (medidas de 1200 px de ancho)
  function ccPanel(pop, hard, n, close) {
    begin0();
    const a = fade(pop), H = HARD[Math.min(2, hard || 0)], s = E.W / 1200;
    backdrop(a, 0.55);
    const W = winBox(pop, 'SlideInFromTop', 'SlideOutToTop');
    const X = (v) => v * s, Y = (v) => E.H * 0.45 + (v - 835) * s, add = W.add;
    // panel y marco
    add(nine(H ? H.panel : 'mainpop:pnl_popup_standard', X(168), Y(348), X(868), 976 * s, H ? [30, 30, 30, 30] : [60, 60, 60, 60], { inset: 0.5 }));
    if (H) { const st = gfx(); add(st); st.beginFill(0xffffff, 0.06); for (let x = 168; x < 1036; x += 90) st.drawPolygon([X(x), Y(348), X(x + 40), Y(348), X(x + 40 - 120), Y(1324), X(x - 120), Y(1324)]); st.endFill(); }
    add(nine('mainpop:popup_standard_frame', X(150), Y(330), X(904), 1010 * s, [50, 50, 50, 50], { inset: 0.5, tint: H ? H.tint : 0xffffff }));
    // cinta del título
    if (H) {
      add(img('hll:ext_header_candy_d' + H.candy, X(390), Y(365), { w: 150 * s, h: 120 * s }));
      add(img('hll:ext_header_candy_d' + H.candy, X(810), Y(365), { w: 150 * s, h: 120 * s, flipX: true }));
      add(nine('hll:pnl_header_candy_d' + H.candy, X(390), Y(305), X(420), 122 * s, [50, 40, 50, 40], { inset: 0.5 }));
      add(text(T(H.label, H.def), X(600), Y(366), 54 * s, { fill: '#ffffff', stroke: H.candy === 2 ? '#0a5a66' : '#5a1a7a', sw: 7 * s }));
      add(img(H.skull, X(594), Y(272), { w: 120 * s, h: 104 * s }));
    } else {
      add(img('mainpop:hdr_popup_curve_pink', X(452), Y(372), { w: 310 * s, h: 104 * s }));
      add(img('mainpop:hdr_popup_curve_pink', X(748), Y(372), { w: 310 * s, h: 104 * s, flipX: true }));
      add(text(T('popup_game_start_level', 'Nivel {0}').replace('{0}', n), X(600), Y(362), 58 * s, { fill: '#ffffff', stroke: '#c2185b', sw: 8 * s }));
    }
    // cerrar
    const addX = W.grow(X(1014), Y(364), 0.2);
    addX(img('main:btn_red', X(1014), Y(364), { w: 100 * s, h: 100 * s })); addX(img('main:icn_close', X(1014), Y(362), { w: 54 * s, h: 54 * s }));
    E.hotspot('gl_close', X(950), Y(300), 130 * s, 130 * s, close);
    return { W, H, s, X, Y, add };
  }
  // botón rosa de Candy Crush (btn_pink) que crece al aparecer
  function pinkButton(C, id, label, cb) {
    const { W, s, X, Y } = C, addP = W.grow(X(600), Y(1196), 0.3);
    addP(nine('main:btn_pink', X(420), Y(1146), X(360), 100 * s, [50, 40, 50, 40], { inset: 0.5 }));
    addP(text(label, X(600), Y(1192), 58 * s, { fill: '#ffffff', stroke: '#b0124f', sw: 7 * s }));
    E.hotspot(id, X(420), Y(1146), X(360), 100 * s, cb);
  }
  // al perder: el mismo panel con el corazón roto, el motivo de Candy Crush en su recuadro, los objetivos con lo que
  // falta, los puntos y "Reintentar" (textos de popup_game_over_*; la cruz vuelve al mapa)
  function lostLevel(pop) {
    const L = pop.lost, hard = E.hardness ? E.hardness(L.n) : 0, C = ccPanel(pop, hard, L.n, L.close), { W, H, s, X, Y, add } = C;
    const addH = W.grow(X(600), Y(560), 0.1);
    addH(img('tiffi:heart_broken', X(600), Y(560), { w: 230 * s, h: 200 * s }));
    const goals = L.goals || [], has = (t) => goals.some((g) => g.type === t && g.left > 0);
    const reason = L.dead ? L.msg : has('jelly') ? T('popup_game_over_lose_reason_jelly_m', 'No has eliminado toda la gelatina.') : has('ing') ? T('popup_game_over_lose_reason_ingredients_m', 'No has recogido todos los objetivos.') : T('popup_game_over_fail_reason_uncollected_orders_m', 'No has completado todos los pedidos');
    add(nine(H ? 'hll2:inset_hll' : 'mainpop:pnl_popup_paper_beige_dark', X(226), Y(690), X(748), 250 * s, [29, 29, 29, 29], { inset: 0.5, half: !H, tint: H ? H.inset : 0xffffff }));
    add(text(reason, X(600), Y(735), 40 * s, { fill: H ? '#ffffff' : '#8a3a5d', wrap: 680 * s }));
    const gs = goals.slice(0, 4), step = 170;
    gs.forEach((gl, i) => {
      const x = X(600 + (i - (gs.length - 1) / 2) * step), y = Y(860), t = goalTexture(gl), ow = t.orig ? t.orig.width : t.width, oh = t.orig ? t.orig.height : t.height, k2 = (90 * s) / Math.max(ow, oh);
      add(img(t, x, y, { w: ow * k2, h: oh * k2 }));
      if (gl.left <= 0) add(img('hud:checkmark', x + 32 * s, y + 30 * s, { w: 50 * s, h: 42 * s }));
      else add(text(String(gl.left), x + 34 * s, y + 32 * s, 40 * s, { fill: '#ffffff', stroke: '#173a7a', sw: 6 * s }));
    });
    add(text(T('popup_game_over_loss_your_score_m', 'Puntos:') + ' ' + Math.round(L.score || 0), X(600), Y(1020), 44 * s, { fill: H ? '#ffffff' : '#8a3a5d' }));
    pinkButton(C, 'gl_retry', T('popup_game_over_loss_button_retry_m', 'Reintentar'), L.retry);
    return true;
  }
  // ---- ventanas nuestras con el panel de Candy Crush: marco de caramelo rosa, cinta con el título, contenido en papel
  // beige y botones alargados de colores (btn_panel_*). h = alto del panel en las unidades de la captura (1200 de ancho)
  const WINDOWS = {};
  const noEmoji = (t) => String(t).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{3030}\u{FE0F}]/gu, '').replace(/\s+([:.,!])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  function ccWin(pop, title, h, onTitle) {
    const a = fade(pop), s = E.W / 1200;
    backdrop(a, 0.55);
    const W = winBox(pop, 'SlideInFromTop', 'SlideOutToTop');
    const top = Math.max(px(250), E.H / 2 - (h * s) / 2), X = (v) => v * s, Y = (v) => top + v * s, add = W.add;
    add(nine('mainpop:pnl_popup_standard', X(168), Y(18), X(868), (h - 36) * s, [60, 60, 60, 60], { inset: 0.5 }));
    add(nine('mainpop:popup_standard_frame', X(150), Y(0), X(904), h * s, [50, 50, 50, 50], { inset: 0.5 }));
    add(img('mainpop:hdr_popup_curve_pink', X(452), Y(42), { w: 310 * s, h: 104 * s }));
    add(img('mainpop:hdr_popup_curve_pink', X(748), Y(42), { w: 310 * s, h: 104 * s, flipX: true }));
    add(text(title, X(600), Y(32), 56 * s, { fill: '#ffffff', stroke: '#c2185b', sw: 8 * s }));
    if (onTitle) E.hotspot('gl_win_title', X(380), Y(-20), X(440), 110 * s, onTitle);
    return { W, s, X, Y, add, h };
  }
  function ccClose(C, cb) {
    const { W, s, X, Y } = C, addX = W.grow(X(1014), Y(34), 0.2);
    addX(img('main:btn_red', X(1014), Y(34), { w: 100 * s, h: 100 * s })); addX(img('main:icn_close', X(1014), Y(32), { w: 54 * s, h: 54 * s }));
    E.hotspot('gl_win_x', X(950), Y(-30), 130 * s, 130 * s, cb);
  }
  // botón alargado: btn_panel_<color> estirado con su texto
  const PANELSTROKE = { pink: '#b0124f', green: '#2a7a14', blue: '#1d4f9a', purple: '#5a1a7a', orange: '#a04a00', yellow: '#8a5a00' };
  function ccButton(C, id, color, cx, cy, w, h, label, cb, delay) {
    const { W, s } = C, add = W.grow(cx, cy, delay == null ? 0.2 : delay);
    add(nine('mainmenu:btn_panel_' + color, cx - w / 2, cy - h / 2, w, h, [80, 70, 80, 80], { inset: 0.5 }));
    add(text(label, cx, cy - 4 * s, Math.min(h * 0.5, 52 * s), { fill: '#ffffff', stroke: PANELSTROKE[color] || '#333', sw: 6 * s }));
    E.hotspot(id, cx - w / 2, cy - h / 2, w, h, cb);
  }
  function ccMenu(pop, title, sub, btns, extra) { // título, texto y una columna de botones (pausa, salir…)
    const h = 260 + (sub ? 120 : 0) + btns.length * 150 + (extra || 0), C = ccWin(pop, title, h), { X, Y, add, s } = C;
    let y = 150;
    if (sub) { add(text(sub, X(600), Y(y + 30), 40 * s, { fill: '#8a3a5d', wrap: 760 * s })); y += 120; }
    btns.forEach(([id, color, label, cb], i) => ccButton(C, id, color, X(600), Y(y + 60 + i * 150), X(600), 116 * s, label, cb, 0.15 + i * 0.06));
    return C;
  }
  // regalo diario: la "Ruleta de booster diario" de Candy Crush (booster_wheel_title_m): gira sola hasta "¡Alto!" y
  // luego "Reclamar premio"; casillas con los colores de los caramelos, sus potenciadores y el aro de luces
  WINDOWS.daily = (pop, D) => {
    const Wh = D.wheel; if (!Wh) return;
    const C = ccWin(pop, 'Ruleta de booster diario', 1060), { X, Y, add, s } = C, st = D.st, n = Wh.segs.length, WS = Wh.WS || {};
    if (!st.spinning) { st.idle = (st.idle || 0) + Math.min(0.05, E.dt || 0.016) * 2.2; st.rot = st.idle % (Math.PI * 2); }
    const cx0 = X(600), cy0 = Y(520), R = 330 * s, g = gfx(); add(g);
    g.beginFill(PIXI.utils.string2hex(WS.rim || '#e8459a')); g.drawCircle(cx0, cy0, R + 34 * s); g.endFill();
    for (let i = 0; i < n; i++) {
      const a0 = st.rot + (i / n) * Math.PI * 2 - Math.PI / 2, a1 = a0 + (Math.PI * 2) / n, c = PIXI.utils.string2hex(Wh.cols[i % Wh.cols.length]);
      g.lineStyle(5 * s, 0xffffff, 0.95); g.beginFill(c); g.moveTo(cx0, cy0); g.arc(cx0, cy0, R, a0, a1); g.lineTo(cx0, cy0); g.endFill();
    }
    g.lineStyle(0); const on = Math.floor(E.t * (st.spinning && !st.done ? 10 : 3)) % 2;
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; g.beginFill((i + on) % 2 ? 0xfff6c0 : 0xffd23f); g.drawCircle(cx0 + Math.cos(a) * (R + 17 * s), cy0 + Math.sin(a) * (R + 17 * s), 9 * s); g.endFill(); }
    g.beginFill(0xffffff); g.lineStyle(8 * s, PIXI.utils.string2hex(WS.rim || '#e8459a')); g.drawCircle(cx0, cy0, 52 * s); g.endFill(); g.lineStyle(0);
    Wh.segs.forEach((L, i) => {
      const am = st.rot + ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2, many = L.length > 1;
      L.forEach((ic, j) => { const t = iconTex(ic); if (!t) return; const d = R * (many ? 0.42 + j * 0.2 : 0.64), sz = (many ? 78 : 104) * s, ow = t.orig ? t.orig.width : t.width, oh = t.orig ? t.orig.height : t.height, k2 = sz / Math.max(ow, oh); add(img(t, cx0 + Math.cos(am) * d, cy0 + Math.sin(am) * d, { w: ow * k2, h: oh * k2 })); });
    });
    const p = gfx(); add(p); p.beginFill(PIXI.utils.string2hex(WS.arrowColor || '#e8459a')); p.lineStyle(6 * s, 0xffffff); p.moveTo(cx0 - 36 * s, cy0 - R - 44 * s); p.lineTo(cx0 + 36 * s, cy0 - R - 44 * s); p.lineTo(cx0, cy0 - R + 22 * s); p.closePath(); p.endFill();
    if (st.done) ccButton(C, 'gl_dw_ok', 'green', X(600), Y(950), X(520), 116 * s, 'Reclamar premio', D.finish, 0);
    else ccButton(C, 'gl_dw_go', st.spinning ? 'purple' : 'pink', X(600), Y(950), X(520), 116 * s, '¡Alto!', () => { if (!st.spinning) Wh.spin(); }, 0.3);
  };
  WINDOWS.pause = (pop, Z) => {
    const C = ccMenu(pop, 'Pausa', null, [['gl_pz_c', 'green', 'Seguir jugando', Z.resume], ['gl_pz_a', 'blue', 'Ajustes', Z.settings], ['gl_pz_m', 'pink', 'Salir al mapa', Z.leave]], Z.version ? 60 : 0);
    if (Z.version) C.add(text('Versión ' + Z.version, C.X(600), C.Y(C.h - 60), 30 * C.s, { fill: '#a07080' }));
  };
  WINDOWS.exit = (pop, X0) => { ccMenu(pop, '¿Salir del nivel?', 'Si sales, tendrás que empezarlo otra vez', [['gl_cx_no', 'green', 'Seguir jugando', X0.stay], ['gl_cx_si', 'pink', 'Sí, salir', X0.leave]]); };
  WINDOWS.info = (pop, I) => {
    const C = ccWin(pop, I.title, 740), { X, Y, add, s } = C;
    add(img('popups:tiffy', X(600), Y(200), { w: 180 * s, h: 170 * s }));
    add(fitHelp(noEmoji(I.text), X(600), Y(415), 820 * s, 250 * s, 48 * s, { fill: '#8a3a5d' })); // entre Tiffi y el botón; con "Letra grande", mayor
    ccButton(C, 'gl_ex_ok', 'green', X(600), Y(630), X(480), 116 * s, '¡Entendido!', I.ok);
  };
  WINDOWS.reward = (pop, R) => {
    const n = R.icons.length, C = ccWin(pop, noEmoji(R.title), n ? 820 : 640), { X, Y, add, s } = C;
    add(img('popups:tiffy', X(600), Y(200), { w: 170 * s, h: 160 * s }));
    add(text(noEmoji(R.sub), X(600), Y(360), 40 * s, { fill: '#8a3a5d', wrap: 760 * s }));
    R.icons.forEach((ic, i) => {
      const x = X(600 + (i - (n - 1) / 2) * 210), y = Y(540), d = 170 * s, addI = C.W.grow(x, y, 0.2 + i * 0.08);
      addI(img('main:btn_booster_blue', x, y, { w: d, h: d }));
      const t = iconTex(ic); if (t) { const k2 = (d * 0.66) / Math.max(t.orig ? t.orig.width : t.width, t.orig ? t.orig.height : t.height); addI(img(t, x, y, { w: (t.orig ? t.orig.width : t.width) * k2, h: (t.orig ? t.orig.height : t.height) * k2 })); }
    });
    ccButton(C, 'gl_rw_ok', 'green', X(600), Y(n ? 720 : 540), X(480), 116 * s, '¡Estupendo!', R.ok, 0.3);
  };
  // icono de un potenciador por su emoji: el dibujo de Candy Crush si lo hay; si no, el del estilo
  const EMO = { '〰️': 'candies:T_stritpdCandy', '🍬': 'candies:T_wrappedCandy', '🌈': 'hudboost:booster_colorbomb', '🍭': 'hudboost:booster_lollipop', '🧹': 'hudboost:booster_strippedbrush', '🔄': 'hudboost:booster_freeswitch', '🎲': 'hudboost:booster_shuffle' };
  const emoT = new Map();
  function iconTex(ch) { const t = EMO[ch] && tex(EMO[ch]); if (t) return t; let e = emoT.get(ch); if (!e) { e = PIXI.Texture.from(E.emojiSprite(ch, 128)); emoT.set(ch, e); } return e; }
  // ajustes: una fila por opción con su nombre y, a la derecha, el interruptor de Candy Crush (Sí/No) o un botón azul
  // con lo que tiene puesto; 5 toques en el título: elegir nivel (para quien cuida la tablet)
  WINDOWS.settings = (pop, S2) => {
    const n = S2.opts.length, C = ccWin(pop, 'Ajustes', 230 + n * 130, S2.secret), { X, Y, add, s } = C;
    ccClose(C, S2.close);
    S2.opts.forEach((o, i) => {
      const y = Y(170 + i * 130), v = o.val(), yes = v === 'Sí', no = v === 'No';
      if (o.name === 'Sonido') add(img('levelmenu:audio_icon', X(250), y, { w: 70 * s, h: 70 * s }));
      add(text(o.name, X(300), y, 42 * s, { fill: '#8a3a5d', ax: 0 }));
      if (yes || no) {
        add(img(yes ? 'levelmenu:switch_bg_on' : 'levelmenu:switch_bg_off', X(880), y, { w: 150 * s, h: 74 * s }));
        add(img('levelmenu:switch_button', X(yes ? 918 : 842), y, { w: 66 * s, h: 68 * s }));
      } else {
        add(nine('mainmenu:btn_panel_blue', X(760), y - 42 * s, X(260), 84 * s, [80, 70, 80, 80], { inset: 0.5 }));
        add(text(v, X(890), y - 3 * s, 34 * s, { fill: '#ffffff', stroke: '#1d4f9a', sw: 5 * s }));
      }
      E.hotspot('gl_st' + i, X(200), y - 60 * s, X(800), 120 * s, o.act);
      if (i < n - 1) add(img('levelmenu:devider', X(600), y + 65 * s, { w: X(800), h: 6 * s, alpha: 0.6 }));
    });
  };
  // misiones de la semana: una tarjeta por misión (texto, barra de Candy Crush y premio o la marca verde)
  WINDOWS.missions = (pop, M) => {
    const items = M.items(), C = ccWin(pop, 'Misiones', 220 + items.length * 190), { X, Y, add, s } = C;
    ccClose(C, M.close);
    items.forEach((q, i) => {
      const y = Y(130 + i * 190);
      add(nine('popups:pnl_info_popup_beige', X(220), y, X(760), 170 * s, [30, 30, 30, 30], { inset: 0.5 }));
      add(text(noEmoji(q.name), X(260), y + 50 * s, 38 * s, { fill: '#8a3a5d', ax: 0 }));
      const bx = X(260), bw = X(520), by = y + 110 * s, k = Math.max(0, Math.min(1, q.v / q.k));
      add(nine('levelmenu:bar_bg', bx, by - 22 * s, bw, 44 * s, [30, 20, 30, 20], { inset: 0.5 }));
      if (k > 0) add(nine('levelmenu:fill_bar', bx + 4 * s, by - 18 * s, Math.max(36 * s, (bw - 8 * s) * k), 36 * s, [24, 16, 24, 16], { inset: 0.5 }));
      add(text(q.v + '/' + q.k, bx + bw / 2, by, 30 * s, { fill: '#ffffff', stroke: '#8a3a5d', sw: 5 * s }));
      if (q.done) add(img('levelmenu:green_check_mark', X(890), y + 85 * s, { w: 110 * s, h: 97 * s }));
      else { add(img('candies:chocolate_box_prelevel_boosters', X(890), y + 80 * s, { w: 120 * s, h: 120 * s })); add(text('x2', X(930), y + 130 * s, 36 * s, { fill: '#ffffff', stroke: '#8a3a5d', sw: 6 * s })); }
    });
  };
  // trofeos: una fila por logro con su medalla de Candy Crush (bronce, plata, oro, rosa) y la barra hasta el siguiente
  WINDOWS.album = (pop, A) => {
    const items = A.items(), C = ccWin(pop, 'Trofeos', 220 + items.length * 170), { X, Y, add, s } = C;
    ccClose(C, A.close);
    items.forEach((q, i) => {
      const y = Y(130 + i * 170), full = q.t >= q.tiers.length, next = q.tiers[Math.min(q.t, q.tiers.length - 1)];
      add(nine('popups:pnl_info_popup_beige', X(220), y, X(760), 150 * s, [30, 30, 30, 30], { inset: 0.5 }));
      const med = full ? 'pink' : q.t >= 4 ? 'gold' : q.t >= 2 ? 'silver' : 'bronze';
      add(img('main:icn_medal_' + med, X(300), y + 75 * s, { w: 110 * s, h: 110 * s, alpha: q.t ? 1 : 0.45 }));
      if (q.t) add(text(String(q.t), X(300), y + 72 * s, 40 * s, { fill: '#ffffff', stroke: '#6a3a1a', sw: 6 * s }));
      add(text(noEmoji(q.name) + ': ' + q.value, X(380), y + 45 * s, 36 * s, { fill: '#8a3a5d', ax: 0 }));
      const bx = X(380), bw = X(560), by = y + 105 * s, k = full ? 1 : Math.max(0, Math.min(1, q.value / next));
      add(nine('levelmenu:bar_bg', bx, by - 20 * s, bw, 40 * s, [30, 20, 30, 20], { inset: 0.5 }));
      if (k > 0) add(nine('levelmenu:fill_bar', bx + 4 * s, by - 16 * s, Math.max(32 * s, (bw - 8 * s) * k), 32 * s, [24, 16, 24, 16], { inset: 0.5 }));
      add(text(full ? '¡Completo!' : q.value + '/' + next, bx + bw / 2, by, 28 * s, { fill: '#ffffff', stroke: '#8a3a5d', sw: 5 * s }));
    });
  };
  // teclado para elegir nivel
  WINDOWS.pad = (pop, K) => {
    const C = ccWin(pop, 'Ir al nivel', 1180), { X, Y, add, s } = C;
    add(nine('popups:pnl_info_popup_beige', X(340), Y(120), X(520), 120 * s, [30, 30, 30, 30], { inset: 0.5 }));
    add(text(K.val() || '—', X(600), Y(180), 70 * s, { fill: '#8a3a5d' }));
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach((key, i) => {
      const x = X(600 + ((i % 3) - 1) * 220), y = Y(340 + Math.floor(i / 3) * 170);
      ccButton(C, 'gl_lp' + i, key === 'OK' ? 'green' : key === '⌫' ? 'pink' : 'blue', x, y, X(190), 140 * s, key === '⌫' ? 'Borrar' : key, () => K.press(key), 0.1 + i * 0.02);
    });
    ccButton(C, 'gl_lp_x', 'purple', X(600), Y(1060), X(420), 110 * s, 'Cancelar', K.cancel, 0.3);
  };
  function preLevel(pop) {
    const P = pop.pre, C = ccPanel(pop, P.hard, P.n, P.close), { W, H, s, X, Y, add } = C;
    // objetivos: recuadro, iconos a la izquierda y la frase
    add(nine(H ? 'hll2:inset_hll' : 'mainpop:pnl_popup_paper_beige_dark', X(226), Y(472), X(748), 272 * s, [29, 29, 29, 29], { inset: 0.5, half: !H, tint: H ? H.inset : 0xffffff }));
    const LAY = [[[0, 0, 1]], [[-23, -30, 0.9], [25, 26, 0.9]], [[-35, -35, 0.75], [-31, 31, 0.75], [29, -5, 0.85]], [[-28, 28, 0.6], [28, 26, 0.6], [-30, -28, 0.6], [28, -30, 0.6]]];
    const goals = (P.goals || []).slice(0, 4), lay = LAY[Math.max(0, goals.length - 1)] || [];
    goals.forEach((gl, i) => {
      const [dx, dy, sc] = lay[i], t = goalTexture(gl), ow = t.orig ? t.orig.width : t.width, oh = t.orig ? t.orig.height : t.height, k2 = (150 * sc * s) / Math.max(ow, oh);
      add(img(t, X(370 + dx * 1.4), Y(608 + dy * 1.4), { w: ow * k2, h: oh * k2 }));
    });
    add(text(goalPhrase(P.goals || []), X(705), Y(608), 46 * s, { fill: H ? '#ffffff' : '#8a3a5d', wrap: 470 * s, align: 'left' }));
    if (H) add(text(T('popup_game_start_level', 'Nivel {0}').replace('{0}', P.n), X(600), Y(806), 44 * s, { fill: '#ffffff', stroke: H.candy === 2 ? '#0a5a66' : '#5a1a7a', sw: 6 * s }));
    else add(text(T('popup_game_start_select_boosters', 'Seleccionar boosters:'), X(600), Y(806), 40 * s, { fill: '#8a3a5d' }));
    // potenciadores de inicio
    const xs = [340, 600, 864];
    P.SB.slice(0, 3).forEach((b, i) => {
      const x = X(xs[i]), y = Y(956), d = 190 * s, onB = P.chosen.has(b.id), have = P.have(b), addB = W.grow(x, y, 0.15 + i * 0.05);
      addB(img(onB ? 'main:btn_booster_green' : 'main:btn_booster_blue', x, y, { w: d, h: d }));
      const t = tex(SBICON[b.id]); if (t) { const k2 = (d * 0.66) / Math.max(t.orig.width, t.orig.height); addB(img(t, x, y - d * 0.03, { w: t.orig.width * k2, h: t.orig.height * k2 })); }
      const bx = x + d * 0.34, by = y + d * 0.32;
      if (onB) addB(img('main:icn_checkmark_1', bx, by, { w: 70 * s, h: 70 * s }));
      else if (have > 0 || have === Infinity) { addB(img('hudboost:booster_panel_revamp_amount_panel', bx, by, { w: 74 * s, h: 74 * s })); addB(text(have === Infinity ? '∞' : String(have), bx, by, 36 * s, { fill: '#5a3a1a' })); }
      else addB(img('main:icn_add', bx, by, { w: 64 * s, h: 64 * s }));
      E.hotspot('gl_sb' + b.id, x - d / 2, y - d / 2, d, d, () => P.toggle(b));
    });
    pinkButton(C, 'gl_play', T('popup_game_start_button_play_m', '¡Jugar!'), P.play);
    // la explicación de la pieza nueva (nuestra) y "por turnos con otra persona", bajo el panel
    const help = P.spec && P.spec.text ? P.spec.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{3030}\u{FE0F}]/gu, '').replace(/\s+([:.,])/g, '$1').replace(/\s{2,}/g, ' ').trim() : '';
    // bajo el panel (dentro no cabía y se salía), en blanco sobre el fondo oscurecido; "por turnos" debajo
    let yd = Y(1420);
    if (help) { const top = Y(1362), t = add(fitHelp(help, X(600), top, X(1000), E.H - 110 * s - top, 36 * s, { fill: '#ffffff', stroke: '#7a1d4a', sw: 6 * s, ay: 0 })); yd = Math.max(yd, top + t.height + 62 * s); }
    const dg = gfx(); add(dg); dg.beginFill(E.duoOn ? 0xff4fa0 : 0x000000, E.duoOn ? 0.9 : 0.4); dg.drawRoundedRect(X(300), yd - 36 * s, X(600), 72 * s, 36 * s); dg.endFill();
    add(text('Por turnos con otra persona: ' + (E.duoOn ? 'Sí' : 'No'), X(600), yd, 30 * s, { fill: '#ffffff' }));
    E.hotspot('gl_duo', X(300), yd - 36 * s, X(600), 72 * s, P.duo);
    return true;
  }
})();
