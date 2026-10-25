// "Cubos HD": la pantalla de juego dibujada con WebGL (PixiJS), copiando el Toy Blast real (Unity).
// Las piezas salen de sus datos (tools/tb_export.py → privado/cubos/gl/: hojas con pivote, píxeles por unidad y
// bordes de cada sprite) y la cabecera y la barra de abajo se montan desde sus prefabs (tools/unity_ui.py +
// tools/unity_flat.py → gl/flat.json, en unidades de Unity). Medidas de pantalla tomadas del juego real en el
// emulador a 1080×1920 (referencias/juego_real/toyblast/). Las reglas siguen en game.js; aquí solo se dibuja.
// El motor llama a: GL.resize · GL.layout · GL.boardLayout · GL.play · GL.fx · GL.frameEnd
(function () {
  const GL = (window.GL = {});
  let app = null, view = null, root = null, ready = false, failed = false, usedThisFrame = false, playedThisFrame = false;
  const atlases = {}, texCache = new Map();
  const ATLASES = ['ui', 'amy', 'blocks', 'esp', 'pop'];
  let FLAT = null, ESP = null, ANIM = null, POPF = null; // cabecera y barra de abajo, prefabs de los especiales y sus animaciones
  const REF = 1080;
  const px = (v) => (v * E.W) / REF; // píxeles de la captura de 1080 → unidades del juego
  const glOk = (() => { try { const c = document.createElement('canvas'); return !!(window.PIXI && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } })();
  // pantalla de carga de Toy Blast (loading_bkg, Amy en su columpio colgada de arriba, "Loading..." y el icono que gira)
  GL.carga = { color: '#0d5d5a', fondo: { f: 'fondo.png' }, piezas: [{ f: 'cuerda.png', x: 0.43, y: 0, w: 0.012, piv: [0.5, 0] }, { f: 'cuerda.png', x: 0.57, y: 0, w: 0.012, piv: [0.5, 0] },
    { f: 'amy.png', x: 0.5, y: 0.08, w: 0.5, piv: [0.47, 0], anim: 'columpio' }, { f: 'texto.png', x: 0.5, y: 0.74, w: 0.6 }, { f: 'giro.png', x: 0.5, y: 0.86, w: 0.13, anim: 'giro' }] };
  const on = () => glOk && !failed && ready && typeof E !== 'undefined' && E.gfx === 'real';
  GL.listo = () => !glOk || failed || ready; // la pantalla de carga sigue hasta que esté todo (o no haya WebGL)

  // ---------------------------------------------------------------- arranque
  function ensureApp(cv) {
    if (app || !glOk) return;
    try {
      view = document.createElement('canvas'); view.id = 'gl';
      view.style.position = 'absolute'; view.style.left = '0'; view.style.top = '0'; view.style.display = 'none';
      cv.parentNode.insertBefore(view, cv);
      cv.style.position = 'relative'; cv.style.zIndex = '1';
      app = new PIXI.Application({ view, width: 10, height: 10, backgroundAlpha: 0, antialias: true, autoStart: false, sharedTicker: false });
      view.style.pointerEvents = 'none';
      app.ticker.stop();
      root = new PIXI.Container(); app.stage.addChild(root); GL._stage = app.stage; // para revisar desde la consola
      load();
    } catch (e) { failed = true; console.warn('WebGL no disponible', e); }
  }
  function load() {
    const base = E.privBase() + 'gl/';
    let left = ATLASES.length + 4; // las hojas, flat.json, flat_esp.json, anim.json y flat_pop.json
    const done = () => { if (--left === 0) ready = true; };
    const xf = new XMLHttpRequest(); xf.open('GET', base + 'flat.json');
    xf.onload = () => { try { FLAT = JSON.parse(xf.responseText); } catch (e) { console.warn('flat', e); } done(); };
    xf.onerror = done; xf.send();
    for (const [f, set] of [['flat_esp.json', (d) => { ESP = d; }], ['anim.json', (d) => { ANIM = d; }], ['flat_pop.json', (d) => { POPF = d; }]]) {
      const x = new XMLHttpRequest(); x.open('GET', base + f);
      x.onload = () => { try { set(JSON.parse(x.responseText)); } catch (e) { console.warn(f, e); } done(); };
      x.onerror = done; x.send();
    }
    for (const name of ATLASES) {
      const x = new XMLHttpRequest(); x.open('GET', base + name + '.json');
      x.onload = () => {
        try { const d = JSON.parse(x.responseText); atlases[name] = { frames: d.frames, base: d.images.map((f) => PIXI.BaseTexture.from(base + f)) }; } catch (e) { console.warn('atlas', name, e); }
        done();
      };
      x.onerror = done; x.send();
    }
  }
  // textura de un sprite de Unity por su nombre (se busca en todas las hojas); t.u = tamaño en unidades de Unity
  function tex(n) {
    let t = texCache.get(n); if (t !== undefined) return t;
    t = null;
    for (const a in atlases) {
      const A = atlases[a]; let f = A.frames[n];
      if (!f && n.indexOf('#') < 0) { const k = Object.keys(A.frames).find((kk) => kk.startsWith(n + '#')); if (k) f = A.frames[k]; }
      if (!f) continue;
      t = new PIXI.Texture(A.base[f.i], new PIXI.Rectangle(f.x, f.y, f.w, f.h), new PIXI.Rectangle(0, 0, f.W, f.H), new PIXI.Rectangle(f.ox, f.oy, f.w, f.h));
      t.f = f; t.u = [f.W / f.ppu, f.H / f.ppu];
      break;
    }
    texCache.set(n, t); return t;
  }
  GL.tex = tex;
  const loose = {};
  function looseTex(n) { if (!loose[n]) loose[n] = PIXI.Texture.from(E.privBase() + n); return loose[n].baseTexture.valid ? loose[n] : null; }

  // ---------------------------------------------------------------- dibujo inmediato (se rehace cada fotograma)
  const pools = { spr: [], nine: [], gfx: [], txt: new Map() };
  let nSpr = 0, nNine = 0, nGfx = 0;
  function begin() {
    root.removeChildren();
    nSpr = nNine = nGfx = 0; for (const t of pools.txt.values()) t.usedNow = false;
  }
  // imagen: o = { w, h, ax, ay, rot, alpha, tint, add, flipX, flipY }; sin ax/ay, el pivote del sprite de Unity
  function img(t, x, y, o) {
    if (typeof t === 'string') t = tex(t); if (!t) return null;
    o = o || {};
    let s = pools.spr[nSpr]; if (!s) s = pools.spr[nSpr] = new PIXI.Sprite(); nSpr++;
    s.texture = t;
    s.anchor.set(o.ax != null ? o.ax : t.f ? t.f.px : 0.5, o.ay != null ? o.ay : t.f ? 1 - t.f.py : 0.5);
    const w = o.w != null ? o.w : t.orig.width, h = o.h != null ? o.h : t.orig.height;
    s.scale.set((w / t.orig.width) * (o.flipX ? -1 : 1), (h / t.orig.height) * (o.flipY ? -1 : 1));
    s.position.set(x, y); s.rotation = o.rot || 0; s.alpha = o.alpha != null ? o.alpha : 1;
    s.tint = o.tint != null ? o.tint : 0xffffff; s.blendMode = o.add ? PIXI.BLEND_MODES.ADD : PIXI.BLEND_MODES.NORMAL;
    root.addChild(s); return s;
  }
  // panel estirable con los bordes de Unity (izquierda, abajo, derecha, arriba, en píxeles del sprite); k = escala de los bordes
  function nine(t, x, y, w, h, k, o) {
    if (typeof t === 'string') t = tex(t); if (!t) return null;
    o = o || {}; const b = (t.f && t.f.b) || [0, 0, 0, 0];
    let p = pools.nine[nNine]; if (!p) p = pools.nine[nNine] = new PIXI.NineSlicePlane(t); nNine++;
    p.texture = t; p.leftWidth = b[0]; p.bottomHeight = b[1]; p.rightWidth = b[2]; p.topHeight = b[3];
    p.width = w / k; p.height = h / k; p.scale.set(k);
    p.position.set(x, y); p.alpha = o.alpha != null ? o.alpha : 1; p.tint = o.tint != null ? o.tint : 0xffffff;
    root.addChild(p); return p;
  }
  function gfx() { let g = pools.gfx[nGfx]; if (!g) g = pools.gfx[nGfx] = new PIXI.Graphics(); nGfx++; g.clear(); g.position.set(0, 0); g.scale.set(1); g.renderable = true; g.isMask = false; g.alpha = 1; g.blendMode = PIXI.BLEND_MODES.NORMAL; root.addChild(g); return g; } // una que fue máscara (otro fotograma) vuelve a pintarse
  // texto con la letra del juego (Dimbo, la de Toy Blast)
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
    const key0 = str + '|' + size + '|' + (o.fill || '') + '|' + (o.stroke || '') + '|' + (o.sw || 0) + '|' + (o.wrap || 0);
    let key = key0, t = pools.txt.get(key);
    for (let i = 1; t && t.usedNow; i++) { key = key0 + '#' + i; t = pools.txt.get(key); }
    if (!t) {
      t = new PIXI.Text(str, new PIXI.TextStyle({ fontFamily: [E.fontFamily || 'JuegoOriginal', 'sans-serif'], fontSize: size * 2, fill: o.fill || '#ffffff',
        stroke: o.stroke || '#000000', strokeThickness: (o.sw || 0) * 2, lineJoin: 'round', wordWrap: !!o.wrap, wordWrapWidth: (o.wrap || 0) * 2, align: 'center', dropShadow: !!o.shadow, dropShadowAlpha: 0.4, dropShadowDistance: 3, dropShadowAngle: Math.PI / 2, dropShadowBlur: 0 }));
      t.scale.set(0.5); pools.txt.set(key, t);
      if (pools.txt.size > 300) for (const [kk, v] of pools.txt) { if (!v.usedNow) { v.destroy(true); pools.txt.delete(kk); } if (pools.txt.size < 200) break; }
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
  GL.img = img; GL.gfx = gfx; GL.text = text;

  // piezas sin sprite propio todavía: el dibujo 2D de siempre pasado a textura
  const tileTex = new Map();
  const DYN = new Set(['x', 'y', 'vy', 'sc', 'alpha', 'rot', 'oy', 'delay', 'hidden', 'bt', 'id', 'sq', 'r0', 'c0']);
  function tileKey(t) { let k = ''; for (const n in t) { const v = t[n]; if (!DYN.has(n) && (typeof v !== 'object' || v === null)) k += n + '=' + v + ';'; } return k; }
  function tileTexture(B, t, size) {
    const key = tileKey(t) + '@' + Math.round(size);
    let e = tileTex.get(key);
    const S = Math.ceil(size * 1.6 * E.scale);
    if (!e) {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'); g.setTransform(E.scale, 0, 0, E.scale, S / 2, S / 2);
      const o = [t.sc, t.alpha, t.rot]; t.sc = 1; t.alpha = 1; t.rot = 0;
      B.drawTile(g, t, 0, 0, size);
      t.sc = o[0]; t.alpha = o[1]; t.rot = o[2];
      e = { t: PIXI.Texture.from(c), used: 0 }; tileTex.set(key, e);
      if (tileTex.size > 400) for (const [kk, v] of tileTex) { if (shownFrames - v.used > 2) { v.t.destroy(true); tileTex.delete(kk); } if (tileTex.size < 300) break; }
    }
    e.used = shownFrames;
    return e.t;
  }
  let shownFrames = 0;

  // ---------------------------------------------------------------- medidas (las del Toy Blast real a 1080×1920)
  // cabecera: su prefab (TopPanelGO) a 107,2 px por unidad, con su borde de arriba a 22 px; barra de abajo (BottomPanel)
  // con el centro de su fondo a 115 px del borde de abajo; casilla de 113,5 px (una unidad de su tablero)
  const HUD_PPU = 107.2, TOP_Y = 22, CELL = 113.5;
  GL.layout = () => (on() ? { top: px(330), bottom: px(240) } : null);
  GL.boardLayout = (C, R, area) => {
    if (!on()) return null;
    let ts = px(CELL);
    const maxW = E.W * 0.96, maxH = area.h - px(20);
    ts = Math.min(ts, maxW / C, maxH / R);
    const x = (E.W - ts * C) / 2, y = area.y + (area.h - ts * R) / 2;
    return { ts, x, y };
  };
  GL.resize = function (cv, dpr) {
    ensureApp(cv); if (!app) return;
    view.style.width = cv.style.width; view.style.height = cv.style.height; view.style.left = cv.style.marginLeft || '0';
    app.renderer.resolution = dpr; app.renderer.resize(cv.width / dpr, cv.height / dpr);
    root.scale.set(E.scale / dpr);
  };

  // ---------------------------------------------------------------- piezas de un prefab aplanado (unidades de Unity)
  // M = matriz del mundo de cada pieza; se lleva a pantalla con (ox, oy) = punto de anclaje y k = px por unidad
  const TXT = { strGoal: 'Objetivo', strMoves: 'Movimientos' }; // de Language.es de Toy Blast
  function drawFlat(list, ax, ay, sx, sy, k, skip) {
    const keyOf = {}; for (const p of list) if (p.tipo === 'texto' && p.clave) keyOf[p.nodo] = p.clave;
    const amy = [];
    for (const p of list) {
      if ((skip && skip.has(p.nodo)) || p.apagado) continue;
      if (p.ruta && p.ruta.includes('AmyAnimaition')) { amy.push(p); continue; } // Amy: aparte, por capas y con su máscara
      drawPart(p, ax, ay, sx, sy, k, keyOf);
    }
    if (amy.length) drawAmy(amy, ax, ay, sx, sy, k);
  }
  function drawPart(p, ax, ay, sx, sy, k, keyOf) {
    const m = p.m, x = sx + (m[4] - ax) * k, y = sy - (m[5] - ay) * k;
    const col = p.color || [1, 1, 1, 1], tint = ((col[0] * 255) << 16) | ((col[1] * 255) << 8) | (col[2] * 255);
    const scx = Math.hypot(m[0], m[1]), scy = Math.hypot(m[2], m[3]), rot = -Math.atan2(m[1], m[0]);
    if (p.tipo === 'image') {
      const t = tex(p.sprite); if (!t) return;
      const [rx, ry, rw, rh] = p.rect, w = rw * scx * k, h = rh * scy * k;
      const left = x + rx * scx * k, top = y - (ry + rh) * scy * k;
      if (p.modo === 1 && t.f.b) nine(t, left, top, w, h, (scx * k * 100) / t.f.ppu / (p.ppum || 1), { tint, alpha: col[3] }); // estirable: en Unity el borde mide b·100/ppu unidades del lienzo
      else img(t, left + w / 2, top + h / 2, { w, h, ax: 0.5, ay: 0.5, tint, alpha: col[3], rot });
    } else if (p.tipo === 'sprite') {
      const t = tex(p.sprite); if (!t) return;
      img(t, x, y, { w: t.u[0] * scx * k, h: t.u[1] * scy * k, tint, alpha: col[3], rot, flipX: p.flip && p.flip[0], flipY: p.flip && p.flip[1] });
    } else if (p.tipo === 'texto' && p.tam) { // títulos en amarillo con borde oscuro (material Dialog_HVD_Small_Title_Yellow)
      const str = TXT[keyOf[p.nodo]] || p.texto || ''; if (!str) return;
      const [rx, ry, rw, rh] = p.rect, cy = y - (ry + rh / 2) * scy * k, cx = x + (rx + rw / 2) * scx * k;
      const t = text(str, cx, cy, p.tam * scy * k * 1.0, { fill: '#f7d548', stroke: '#2a3a28', sw: p.tam * scy * k * 0.16 });
      const maxW = rw * scx * k * 1.6; if (t && t.width > maxW) t.scale.set((t.scale.x * maxW) / t.width);
    }
  }
  // Amy de la cabecera: sus piezas por orden de capa (sortingOrder); las de dentro del círculo, recortadas por él. Se
  // mueve con su AmyAnimator: Idle y, de vez en cuando, idle2_blink; con pocos movimientos, Sad y luego Sad_loop
  // (las curvas van desde el nodo Amy, el del Animator; cada pieza se recompone desde AmyAnimaition hacia abajo)
  let amyMask = null, amyMoves = null;
  const amyA = { clip: 'Amy_Idle', t0: 0, n: 0 };
  function amyClip() {
    let c = ANIM && ANIM[amyA.clip]; if (!c) return null;
    let t = E.t - amyA.t0;
    if (t >= c.dur || t < 0) {
      const sad = amyMoves != null && amyMoves <= 5, wasSad = amyA.clip.startsWith('Amy_Sad') && amyA.clip !== 'Amy_Sad_loop_to_idle';
      amyA.n++; amyA.t0 = E.t; t = 0;
      amyA.clip = sad ? (wasSad ? (amyA.n % 3 ? 'Amy_Sad_loop' : 'Amy_Sad_loop_blink') : 'Amy_Sad') : wasSad ? 'Amy_Sad_loop_to_idle' : amyA.n % 3 ? 'Amy_Idle' : 'Amy_idle2_blink';
      c = ANIM[amyA.clip] || c;
    }
    return [c, t];
  }
  const qz = (x, y, z, w) => (Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * 180) / Math.PI;
  const mulM = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  function amyMatrices(list) {
    const ca = amyClip(); if (!ca) return null;
    const [clip, t] = ca;
    if (!clip._byPath) { clip._byPath = {}; for (const q of clip.curvas) (clip._byPath[q.ruta] || (clip._byPath[q.ruta] = [])).push(q); }
    const nodes = list._nodes || (list._nodes = new Map(list.filter((p) => p.tipo === 'nodo').map((p) => [p.ruta.concat(p.nodo).join('/'), p])));
    const W = new Map();
    const wOf = (key) => {
      if (W.has(key)) return W.get(key);
      const n = nodes.get(key); let r = null;
      if (n) {
        const i = key.indexOf('AmyAnimaition/'), L = n.local; let px = L[0], py = L[1], sx = L[2], sy = L[3], rz = L[4];
        for (const q of (i >= 0 && clip._byPath[key.slice(i)]) || []) {
          if (q.clase === 'pos') { px = sampleC(q.v[0], t); py = sampleC(q.v[1], t); }
          else if (q.clase === 'scale') { sx = sampleC(q.v[0], t); sy = sampleC(q.v[1], t); }
          else if (q.clase === 'rot') rz = qz(sampleC(q.v[0], t), sampleC(q.v[1], t), sampleC(q.v[2], t), sampleC(q.v[3], t));
          else if (q.clase === 'euler') rz = sampleC(q.v[2], t);
        }
        const par = n.ruta.join('/'), pw = par.endsWith('AmyAnimaition') || par.includes('AmyAnimaition/') ? wOf(par) : null;
        const r0 = (rz * Math.PI) / 180, M = [Math.cos(r0) * sx, Math.sin(r0) * sx, -Math.sin(r0) * sy, Math.cos(r0) * sy, px, py];
        r = pw ? mulM(pw, M) : n.m;
      } else if (key.endsWith('/AmyAnimaition')) { const a = FLAT.TopPanelGO.find((p) => p.tipo === 'nodo' && p.nodo === 'AmyAnimaition'); r = a ? a.m : null; }
      W.set(key, r); return r;
    };
    return (p) => { const m = wOf(p.ruta.concat(p.nodo).join('/')); return m ? Object.assign({}, p, { m }) : p; };
  }
  function drawAmy(list, ax, ay, sx, sy, k) {
    const anim = amyMatrices(list) || ((p) => p);
    const mk = list.find((p) => p.nodo === 'Mask' && p.tipo !== 'nodo');
    const parts = list.filter((p) => p.tipo !== 'nodo' && p.nodo !== 'Mask' && p.nodo !== 'StaticAmyImage' && !p.apagado).sort((a, b) => (a.capa || 0) - (b.capa || 0) || a.orden - b.orden);
    let box = null;
    if (mk) {
      const t = tex('circle'); const m = anim(mk).m;
      if (t) {
        amyMask = amyMask || new PIXI.Sprite(); amyMask.texture = t; amyMask.anchor.set(t.f.px, 1 - t.f.py);
        const sc = Math.hypot(m[0], m[1]) * k; amyMask.width = t.u[0] * sc; amyMask.height = t.u[1] * sc;
        amyMask.position.set(sx + (m[4] - ax) * k, sy - (m[5] - ay) * k); root.addChild(amyMask);
        box = new PIXI.Container(); box.mask = amyMask;
      }
    }
    for (const p0 of parts) {
      const p = anim(p0);
      if (box && p.ruta.includes('circle_mask')) { const prev = root; root = box; drawPart(p, ax, ay, sx, sy, k, {}); root = prev; if (!box.parent) root.addChild(box); }
      else drawPart(p, ax, ay, sx, sy, k, {});
    }
  }

  // ---------------------------------------------------------------- fondo
  function drawBackground(st) {
    const n = Math.floor((((st.n || 1) - 1) / 10) % 12) + 1, bg = looseTex('map_' + n + '.jpg');
    if (bg) {
      const s = Math.max(E.W / bg.width, E.H / bg.height);
      img(bg, E.W / 2, E.H / 2, { w: bg.width * s, h: bg.height * s, ax: 0.5, ay: 0.5 });
    }
    const g = gfx(); g.beginFill(0x000000, 0.35); g.drawRect(0, 0, E.W, E.H); g.endFill(); // el juego real oscurece el cuarto
  }

  // ---------------------------------------------------------------- tablero
  // marco del tablero con las piezas de BoardUi (BorderSprites borders_1…9 en el orden del teclado numérico: 7 8 9
  // arriba, 1 2 3 abajo; BorderInteriorSprites para las esquinas hacia dentro y BorderCrossSprites para las diagonales).
  // Como en BlockSpaceUiPrefab, cada pieza mide media casilla y van en una red de medias casillas: en las esquinas, en
  // el centro de los lados y en el centro de cada casilla; cada una sale de qué casillas de alrededor hay
  function drawBoardFrame(B) {
    const S = B.S, ts = B.ts, has = (r, c) => r >= 0 && c >= 0 && r < S.R && c < S.C && r >= S.top[c];
    const q = ts / 2 + 0.8, put = (name, x, y) => { const t = looseTex('gl/borders/' + name + '.png'); if (t) img(t, x, y, { w: q, h: q, ax: 0.5, ay: 0.5 }); };
    for (let i = 0; i <= S.R; i++) for (let j = 0; j <= S.C; j++) { // esquinas (entre 4 casillas)
      const tl = has(i - 1, j - 1), tr = has(i - 1, j), bl = has(i, j - 1), br = has(i, j), n = tl + tr + bl + br;
      if (!n) continue;
      let name;
      if (n === 4) name = 'borders_5';
      else if (n === 3) name = 'interior_borders_' + (!tl ? 7 : !tr ? 9 : !bl ? 1 : 3);
      else if (n === 1) name = 'borders_' + (br ? 7 : bl ? 9 : tr ? 1 : 3);
      else if (tl && br) name = 'cross_borders_1';
      else if (tr && bl) name = 'cross_borders_2';
      else name = 'borders_' + (bl && br ? 8 : tl && tr ? 2 : tl && bl ? 6 : 4);
      put(name, B.bx + j * ts, B.by + i * ts);
    }
    for (let r = 0; r <= S.R; r++) for (let c = 0; c < S.C; c++) { // lados de arriba y abajo de cada casilla
      const u = has(r - 1, c), d = has(r, c); if (!u && !d) continue;
      put(u && d ? 'borders_5' : d ? 'borders_8' : 'borders_2', B.bx + c * ts + ts / 2, B.by + r * ts);
    }
    for (let r = 0; r < S.R; r++) for (let c = 0; c <= S.C; c++) { // lados izquierdo y derecho
      const l = has(r, c - 1), rr = has(r, c); if (!l && !rr) continue;
      put(l && rr ? 'borders_5' : rr ? 'borders_4' : 'borders_6', B.bx + c * ts, B.by + r * ts + ts / 2);
    }
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) if (has(r, c)) put('borders_5', B.bx + c * ts + ts / 2, B.by + r * ts + ts / 2);
  }
  const CN = ['red', 'yellow', 'blue', 'green', 'purple', 'orange'], HK = { rocket: 'rotor', bomb: 'tnt', disco: 'puzzle' };
  const PZ = ['red', 'yellow', 'Blue', 'green', 'purple', 'orange'], PZV = {}; // nombres de sus animaciones
  function cubeTex(t) {
    if (t.kind === 'cube') return tex('Blocks-Cube-cube_' + CN[t.color] + (t.hintK ? '_' + HK[t.hintK] : '')); // con el dibujo del especial que saldría
    if (t.kind === 'rocket') return tex('rotor');
    if (t.kind === 'bomb') return tex('tnt');
    if (t.kind === 'disco') return tex('puzzle');
    return null;
  }
  // juguetes que se bajan al suelo (BoardUi.PaintBlocks, tipos 13–19): el esqueleto de su ToyAnimationPrefabs, colocado
  // con ToyBlockDefaultPosition (0, −0,587) o el suyo (cohete −0,465, rinoceronte −0,5, tofidik 0,03/−0,587) y la escala
  // de su SkeletonDataAsset; SpineAnimationLibrary.AttachAndPlay le va poniendo una de sus animaciones al azar. Cada nivel
  // tiene su juguete (iconos de objetivo gp_toy_1…7 y helicopter_goal_ui)
  const TOYS = [['adam', 0, -0.5874, 0.0018], ['rocket', 0, -0.465, 0.0023], ['traktor', 0, -0.5874, 0.002], ['wooly', 0, -0.5874, 0.0019],
    ['rhino', 0, -0.5, 0.00198], ['tofidik', 0.03, -0.5874, 0.0012474], ['toy_fil', 0, -0.5874, 0.00119],
    ['chopper', 0, 0, 0.01, /^chopper_idle/]]; // el helicóptero (toy8, HelicopterController: sus chopper_idle_* al azar)
  const GPTOY = [3, 2, 4, 1, 5, 6, 7]; // icono de objetivo de cada uno (gp_toy_N): adam es el de las gafas (gozluk), wooly el robot azul
  const toyOf = (n) => ((n || 1) * 5 + 3) % TOYS.length;
  let curToy = 0;
  const toyLive = new Map(), toyAnims = {};
  function drawToy(B, t, x, y, size, sc, a) {
    const [n, px, py, k, only] = TOYS[curToy], sd = spineData(n); if (!sd) return false;
    const L = toyAnims[n] || (toyAnims[n] = sd.animations.filter((an) => an.duration > 0.05 && (!only || only.test(an.name))));
    let e = toyLive.get(t);
    if (!e || E.t - e.t0 > e.dur) { const an = L[Math.floor(Math.random() * L.length)]; e = { an: an.name, dur: an.duration, t0: E.t }; toyLive.set(t, e); }
    e.seen = E.t;
    if (toyLive.size > 30) for (const [o, v] of toyLive) if (E.t - v.seen > 2) { toyLive.delete(o); spInst.delete('toy' + o.id); } // juguetes que ya no están
    if (!drawSpine('toy' + t.id, n, e.an, E.t - e.t0, x + px * size * sc, y - py * size * sc, size * sc, { sc: k / 0.01, alpha: a })) return false;
    return true;
  }
  // reloj de cuco (CuckooController, esqueleto clockbird, escala 0,01): cerrado "clock_0"; con el primer golpe se abre y
  // asoma el pájaro ("clock_0to1", 0,8 s); si se recupera, "clock_1to0"; al romperlo, "clock_collect"
  const cuLive = new Map();
  let CU_K = 1, CU_Y = 0; GL.cuckooK = (k, y) => { CU_K = k; if (y != null) CU_Y = y; }; // para ajustar
  function drawCuckoo(t, x, y, size, sc, a, collectAge) {
    if (!spineData('clockbird')) return false;
    let e = cuLive.get(t);
    if (!e) { e = { hp: t.hp, an: t.hp < 2 ? 'clock_0to1' : 'clock_0', t0: E.t - 9 }; cuLive.set(t, e); }
    if (t.hp !== e.hp) { e.an = t.hp < e.hp ? 'clock_0to1' : 'clock_1to0'; e.t0 = E.t; e.hp = t.hp; }
    e.seen = E.t;
    if (cuLive.size > 30) for (const [o, v] of cuLive) if (E.t - v.seen > 2) { cuLive.delete(o); spInst.delete('cu' + o.id); }
    const an = collectAge != null ? 'clock_collect' : e.an, at = collectAge != null ? collectAge : E.t - e.t0;
    return drawSpine('cu' + t.id, 'clockbird', an, at, x, y - CU_Y * size * sc, size * sc * CU_K, { alpha: a });
  }
  // un cubo de Toy Blast mide 1×1,175 unidades (el relieve asoma por abajo) con su pivote en el centro de la cara
  function drawPiece(B, t, x, y, size) {
    const sc = t.sc == null ? 1 : t.sc, a = t.alpha == null ? 1 : t.alpha;
    if (t.kind === 'duck' && drawToy(B, t, x, y, size, sc, a)) return;
    if (t.kind === 'cuckoo' && drawCuckoo(t, x, y, size, sc, a)) return;
    // el rotor del tablero es RotorAnimation en reposo (RotorIdle), de lado o de pie
    if (t.kind === 'rocket' && drawPrefab('RotorAnimation', x, y, { anim: 'RotorIdle', t: 0, k: size * sc, alpha: a, rot: t.dir === 'v' ? Math.PI / 2 : 0 })) return;
    if (t.kind === 'disco' && ANIM) { // rompecabezas: su animación de reposo (una de 4 al azar con pesos 2,1,1,1)
      const cn = PZ[t.color], vs = PZV[cn] || (PZV[cn] = Object.keys(ANIM).filter((n) => n.startsWith(cn + '_puzzle_cube_idle')).sort());
      const w = (t.id * 7919) % 5, an = vs[Math.min(vs.length - 1, w < 2 ? 0 : w - 1)], clip = ANIM[an];
      if (clip) {
        const q = clip.curvas.find((c) => c.prop === 'm_Sprite'), tt = (E.t + (t.id % 13) * 0.37) % clip.dur;
        const nm = q ? clip.sprites[Math.round(sampleC(q.v[0], tt))] : null, tx = nm && tex(nm);
        if (tx) { img(tx, x, y, { w: tx.u[0] * size * sc, h: tx.u[1] * size * sc, alpha: a }); return; }
      }
    }
    if (t.kind === 'bomb' && drawPrefab('TntAnimation', x, y, { k: size * sc, alpha: a })) return;
    const ct = cubeTex(t);
    if (ct) {
      const u = size / (t.kind === 'cube' ? 1 : 1.0);
      img(ct, x, y, { w: ct.u[0] * u * sc, h: ct.u[1] * u * sc, alpha: a, rot: t.kind === 'rocket' && t.dir === 'v' ? Math.PI / 2 : t.rot || 0 });
      return;
    }
    const tt = tileTexture(B, t, size);
    img(tt, x, y, { w: tt.width / E.scale, h: tt.height / E.scale, ax: 0.5, ay: 0.5, alpha: a, rot: t.rot || 0 });
  }

  // pistas de combo (ComboHintHandler y BlockUi.ComboHintEnumerator de Toy Blast): un especial que se puede tocar con
  // otro especial al lado late entre 1 y 0,9 de tamaño (1 s en cada sentido) con el brillo ComboHintParticles debajo
  let comboNow = new Set();
  const comboFx = new Set();
  const isSpecial = (t) => t && !t.big && (t.kind === 'rocket' || t.kind === 'bomb' || t.kind === 'disco');
  function comboHints(B) {
    const S = B.S, out = new Set();
    if (!B.busy && !B.fin) for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const t = S.grid[r][c]; if (!isSpecial(t)) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const n = S.grid[r + dr] && S.grid[r + dr][c + dc]; if (isSpecial(n)) { out.add(t); break; } }
    }
    comboNow = out;
    for (const t of out) if (!comboFx.has(t) && t.x != null) {
      comboFx.add(t);
      GL.ufx('ComboHintParticles', t.x, t.y, B.ts, { under: true, follow: () => (comboNow.has(t) ? [t.x, t.y + (t.oy || 0)] : (comboFx.delete(t), null)) });
    }
    return out;
  }
  const comboScale = () => { const p = E.t % 2; return p < 1 ? 1 - 0.1 * p : 0.9 + 0.1 * (p - 1); };
  const boardBox = window.PIXI ? new PIXI.Container() : null; // las piezas, recortadas por el tablero
  let boardMask = null;
  function drawBoard(B) {
    const S = B.S, ts = B.ts;
    drawBoardFrame(B);
    // máscara: las piezas nuevas aparecen desde el borde de arriba de cada columna
    const mk = boardMask || (boardMask = new PIXI.Graphics()); mk.clear(); root.addChild(mk); mk.beginFill(0xffffff); // la máscara, aparte: una Graphics que fue máscara ya no se pinta
    for (let c = 0; c < S.C; c++) if (S.top[c] < S.R) mk.drawRect(B.bx + c * ts, B.by + S.top[c] * ts - 2, ts, (S.R - S.top[c]) * ts + ts * 0.3);
    mk.endFill();
    boardBox.removeChildren(); boardBox.mask = mk; root.addChild(boardBox); if (!B.fin || B.fin.phase !== 'lc') boardBox.alpha = 1;
    const prev = root; root = boardBox;
    const hset = B.hintTiles && B.hintTiles.t > 0 ? new Set(B.hintTiles.tiles) : null;
    const combo = comboHints(B);
    { const prev0 = root; root = boardBox; drawFx(true); root = prev0; } // brillos debajo de las piezas (ComboHintParticles, orden -4)
    // de arriba abajo: el relieve de cada cubo queda tapado por el de debajo, como en el juego
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const t = S.grid[r][c];
      if (!t || t.x == null || t.hidden > 0) continue;
      if (t.big) { if (r === t.r0 && c === t.c0) drawPiece(B, t, t.x, t.y, ts * 2); continue; }
      let k = 1; if (hset && hset.has(t)) k = 1 + Math.abs(Math.sin(B.hintTiles.t * 5)) * 0.08;
      if (combo.has(t)) k *= comboScale();
      const o = t.sc; t.sc = (o == null ? 1 : o) * k; drawPiece(B, t, t.x, t.y + (t.oy || 0), ts); t.sc = o;
    }
    for (const d of B.dying) {
      const t = d.t; if (t.x == null) continue;
      if (d.age <= 0) { drawPiece(B, t, t.x, t.y, ts); continue; }
      if (t.kind === 'cuckoo' && d.age < 0.8 && drawCuckoo(t, d.x, d.y, ts, 1, 1, d.age)) continue;
      if (d.ufx || (d.m && d.m.mode === 'bucket')) continue; // la rompe su efecto de partículas / vuela al balde (drawBucket)
      const k = Math.min(1, d.age / 0.25);
      if (d.m && d.m.mode === 'merge') { const o = t.sc; t.sc = 1 - k * 0.5; drawPiece(B, t, d.x, d.y, ts); t.sc = o; continue; }
      const o = t.sc, oa = t.alpha; t.sc = 1 + k * 0.3; t.alpha = 1 - k; drawPiece(B, t, d.x, d.y, ts); t.sc = o; t.alpha = oa;
    }
    root = prev;
  }


  // balde (BucketCollectCubesAnimation de Toy Blast): sube desde abajo de la pantalla bajo la columna tocada (0,25 s),
  // los cubos de su color vuelan a 4 casillas por encima (±1 en alto, ±0,1 en ancho) y caen dentro, y se va
  const BUCKET_K = 1.4;
  function drawBucket(B) {
    const ts = B.ts;
    for (const f of B.fxs) {
      if (f.type !== 'bucket' || f.delay > 0) continue;
      const bk = tex('Blocks-Bucket-Default-bucket_' + CN[f.color]), fr = tex('Blocks-Bucket-Front-bucket_' + CN[f.color] + '_f'); if (!bk || !fr) continue;
      const X = B.cx(f.c), Y0 = B.by + B.S.R * ts + ts * 0.55, off = E.H + ts - Y0, T = 1.125, a = f.age;
      const e = a < 0.25 ? 1 - (a / 0.25) * (2 - a / 0.25) : a > T ? Math.min(1, (a - T) / 0.25) ** 2 : 0, Y = Y0 + off * e;
      const k = ts * BUCKET_K;
      img(bk, X, Y, { w: bk.u[0] * k, h: bk.u[1] * k });
      for (const d of B.dying) {
        if (!d.m || d.m.mode !== 'bucket' || d.m.c !== f.c || d.age <= 0 || d.x == null) continue;
        const u = Math.min(1, d.age / d.m.dur), px = X + d.m.rx * ts * 0.1, py = Y0 - ts * (4 + d.m.ry);
        let x, y, sc = 1;
        if (u < 0.6) { const q = u / 0.6, w = q * (2 - q); x = d.x + (px - d.x) * w; y = d.y + (py - d.y) * w; }
        else { const q = (u - 0.6) / 0.4, w = q * q; x = px + (X - px) * w; y = py + (Y - py) * w; sc = 1 - 0.3 * w; }
        const o = d.t.sc; d.t.sc = sc; drawPiece(B, d.t, x, y, ts); d.t.sc = o;
      }
      img(fr, X, Y, { w: fr.u[0] * k, h: fr.u[1] * k });
    }
  }
  // ---------------------------------------------------------------- cabecera (TopPanelGO) y barra de abajo (BottomPanel)
  const TOP_DYN = new Set(['DigitOne', 'DigitTwo', 'DigitThree', 'DigitFour', 'DigitFive', 'StaticAmyImage', 'ScoreBar']); // los rellena el juego
  function drawHud(st) {
    if (!FLAT) return;
    const k = px(HUD_PPU), top = FLAT.TopPanelGO; amyMoves = st.P ? st.P.moves : null;
    // borde de arriba de la cabecera (TopPanelBaseImage, pivote arriba) a TOP_Y px
    drawFlat(top, 0, 7.85, E.W / 2, px(TOP_Y), k, TOP_DYN);
    const P = st.P, toS = (wx, wy) => [E.W / 2 + wx * k, px(TOP_Y) - (wy - 7.85) * k];
    // objetivos en su recuadro (GoalBg, centrado en -2,88, 6,32 y de 3×2,25 unidades): de 1 a 4, en cuadrícula
    const goals = P.goals || [], gs = goals.length;
    const slots = gs <= 1 ? [[0, 0]] : [[-0.78, 0.55], [0.78, 0.55], [-0.78, -0.55], [0.78, -0.55]]; // GoalUi1…4 del prefab
    goals.forEach((gl, i) => {
      const [sx, sy] = slots[i] || [0, 0], [x, y] = toS(-2.88 + sx, 6.35 + sy);
      const s = k * 0.75;
      const ic = goalTex(gl);
      if (ic) img(ic, x, y, { w: ic.u[0] * s, h: ic.u[1] * s });
      else { const tt = goalCanvas(gl); img(tt, x, y, { w: s, h: s, ax: 0.5, ay: 0.5 }); }
      if (gl.left <= 0) img('GoalPanel-topbar_goal_check', x + 0.45 * s * 1.2, y + 0.3 * s * 1.2, { w: 0.6 * k, h: 0.6 * k });
      else digits(String(gl.left), x + 0.28 * k * 1.2, y + 0.28 * k * 1.2, 'Numbers-UI-topbar_goal_digit_', k * 1.2 * 0.75);
    });
    // movimientos (MovesLeftText, en 1,44, 6,59 de su panel)
    const [mx, my] = toS(2.87, 6.76);
    if (isFinite(P.moves)) digits(String(Math.max(0, P.moves)), mx, my, 'Numbers-Default-digit_', k * 1.13);
    // barra de estrellas: relleno según los puntos (ScoreBar, tipo relleno horizontal)
    const sp = st.spec && st.spec.starScores;
    if (sp) {
      const fr = Math.min(1, (P.score || 0) / (sp[2] * 1.08));
      const bar = top.find((p) => p.nodo === 'ScoreBar');
      if (bar) {
        const m = bar.m, [bx, by] = toS(m[4], m[5]), w = bar.rect[2] * m[0] * k, h = bar.rect[3] * m[3] * k, t = tex('TopUi-top_star_progress');
        if (t && fr > 0) { const t2 = new PIXI.Texture(t.baseTexture, new PIXI.Rectangle(t.frame.x, t.frame.y, Math.max(1, t.frame.width * fr), t.frame.height)); img(t2, bx - w / 2, by, { w: w * fr, h, ax: 0, ay: 0.5 }); }
      }
      [-1.034, 0.024, 1.137].forEach((sx, i) => {
        if ((P.score || 0) < sp[i]) return;
        const [x, y] = toS(2.87 + sx * 1.0, 5.66 - 0.39); img('TopUi-topbar_progress_star', x, y, { w: 0.47 * 1.25 * k, h: 0.47 * 1.25 * k });
      });
    }
    E.hotspot('gl_ask', E.W / 2 - px(150), px(20), px(300), px(300), st.ask);
  }
  function digits(s, x, y, pre, k) {
    const ts = [...s].map((ch) => tex(pre + ch)).filter(Boolean); if (!ts.length) return;
    const w = ts.reduce((a, t) => a + t.u[0] * 0.8, 0) * k; let cx = x - w / 2;
    for (const t of ts) { const tw = t.u[0] * k; img(t, cx + tw * 0.4, y, { w: tw, h: t.u[1] * k }); cx += tw * 0.8; }
  }
  const GOAL_TEX = { cube: (gl) => 'cube_goal_' + CN[gl.key], bubble: 'GoalPanel-ItemGoals-bubble', balloon: 'GoalPanel-ItemGoals-gp_balloon', duck: () => (curToy === 7 ? 'helicopter_goal_ui' : 'GoalPanel-ItemGoals-gp_toy_' + GPTOY[curToy]), box: null /* la caja (CrateBlock) no tiene icono propio: su dibujo del tablero */, ball: null, egg: 'GoalPanel-ItemGoals-gp_easter02', pumpkin: 'GoalPanel-ItemGoals-gp_pumpkin', piggy: 'GoalPanel-ItemGoals-gp_piggybank', ufo: 'GoalPanel-ItemGoals-gp_ufo_temp', gum: 'GoalPanel-ItemGoals-gum', rocket: 'GoalPanel-ItemGoals-gp_rotor', bomb: 'GoalPanel-ItemGoals-gp_tnt', disco: 'GoalPanel-ItemGoals-gp_puzzlecube', metal: 'GoalPanel-ItemGoals-metal_lego', toast: 'GoalPanel-ItemGoals-gp_toast' };
  function goalTex(gl) { const n = GOAL_TEX[gl.type]; const name = typeof n === 'function' ? n(gl) : n; return name ? tex(name) : null; }
  const goalCv = new Map();
  function goalCanvas(gl) {
    const key = gl.type + ':' + gl.key; let t = goalCv.get(key);
    if (!t) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); GAME.drawGoalIcon(g, gl, 64, 64, 110); t = PIXI.Texture.from(c); goalCv.set(key, t); }
    return t;
  }
  const BICON = { hammer: 'drill', train: 'train', vacuum: 'vacuum', bucket: 'bucket', brush: 'paintbrush' };
  // avisos nuestros sobre el tablero (no están en Toy Blast): de quién es el turno si se juega por turnos y qué tocar con el
  // potenciador elegido (o con "¿qué es esto?"); en el hueco entre la cabecera y el tablero
  function drawNotices(st, B) {
    const pill = (y, h, str, col) => { const w = E.W * 0.86, g = gfx(); g.beginFill(col, 0.92); g.lineStyle(px(5), 0xffffff, 0.9); g.drawRoundedRect(E.W / 2 - w / 2, y - h / 2, w, h, h / 2); g.endFill(); text(str, E.W / 2, y, h * 0.48, { fill: '#ffffff', stroke: '#1b4f5a', sw: px(6) }); };
    let y = Math.max(px(330), B.by - px(64));
    if (st.duo) { pill(y, px(84), 'Turno de ' + st.duo.name + '  ·  ' + st.duo.score[0] + ' – ' + st.duo.score[1], st.duo.turn ? 0x2e8ff0 : 0xe6a400); y += px(96); }
    if (st.prompt) pill(y + Math.sin(E.t * 3) * px(4), px(84), st.prompt, 0x1b4f5a);
  }
  function drawBottom(st) {
    if (!FLAT) return;
    const k = px(HUD_PPU), bot = FLAT.BottomPanel;
    const skip = new Set(['LockIcon']);
    // el fondo (Bg) centrado a 115 px del borde de abajo
    drawFlat(bot, 0, -7.29, E.W / 2, E.H - px(115), k, skip);
    const toS = (wx, wy) => [E.W / 2 + wx * k, E.H - px(115) - (wy + 7.29) * k];
    const [gx, gy] = toS(-4.07, -7.16);
    E.hotspot('gl_pause', gx - px(70), gy - px(70), px(140), px(140), st.openPause);
    const xs = [-2.31, -0.75, 0.8, 2.36, 3.91];
    (GAME.boosters || []).slice(0, 5).forEach((b, i) => {
      const [x, y] = toS(xs[i], -7.15), have = st.boosterLeft(b.id), active = st.booster === b.id;
      if (active) { const g = gfx(); g.lineStyle(px(6), 0xfff27a); g.drawRoundedRect(x - px(75), y - px(72), px(150), px(144), px(26)); }
      const tx = x + px(55), ty = y + px(48);
      if (have === Infinity) text('∞', tx, ty, px(46), { fill: '#ffffff', stroke: '#1b4f5a', sw: px(7) });
      else if (have > 0) text(String(have), tx, ty, px(44), { fill: '#ffffff', stroke: '#1b4f5a', sw: px(7) });
      else { const g = gfx(); g.beginFill(0x3cb93c); g.lineStyle(px(4), 0xffffff); g.drawCircle(tx, ty, px(24)); g.endFill(); text('+', tx, ty, px(40), { fill: '#ffffff' }); }
      E.hotspot('gl_b_' + b.id, x - px(75), y - px(72), px(150), px(144), () => st.useBooster(b));
    });
  }

  // ---------------------------------------------------------------- partículas de Unity (tools/unity_fx.py → gl/fx/fx.json)
  // Simulador de los ParticleSystem de Toy Blast con lo que usan sus efectos: ráfagas y ritmo de emisión, vida, rapidez,
  // tamaño, giro y color de inicio (constantes, curvas o al azar entre dos), forma (caja, esfera, cono, círculo),
  // gravedad, velocidad, fuerza y límite a lo largo de la vida, tamaño/giro/color según la vida y hoja de fotogramas.
  // Se simula en 3D y se dibuja su X e Y (la cámara de Toy Blast es ortográfica); una unidad = una casilla.
  let FX = null, fxLoading = false;
  const fxTex = {}, fxRun = [];
  function loadFx() {
    if (fxLoading) return; fxLoading = true;
    const x = new XMLHttpRequest(); x.open('GET', E.privBase() + 'gl/fx/fx.json');
    x.onload = () => { try { FX = JSON.parse(x.responseText); } catch (e) { console.warn('fx', e); } }; x.send();
  }
  const rnd = Math.random;
  function cv(c, t) { if (!c) return 1; const f = Math.max(0, Math.min(1, t)) * (c.length - 1), i = Math.floor(f), k = f - i; return i >= c.length - 1 ? c[c.length - 1] : c[i] + (c[i + 1] - c[i]) * k; }
  function mmv(m, t, r) { // MinMaxCurve: [modo, máx, mín, curva máx, curva mín]
    if (m == null) return 0; if (typeof m === 'number') return m;
    const [st, a, b, ca, cb] = m;
    return st === 0 ? a : st === 1 ? a * cv(ca, t) : st === 2 ? a * (cv(cb, t) + (cv(ca, t) - cv(cb, t)) * r) : b + (a - b) * r;
  }
  function gradAt(g, t) {
    if (!g) return [1, 1, 1, 1];
    const pick = (keys, n) => { if (t <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], k = g.fijo ? 0 : (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * k); } return keys[keys.length - 1].slice(1); };
    const c = pick(g.c), a = pick(g.a); return [c[0], c[1], c[2], a[0]];
  }
  function mmg(m, t, r) { // MinMaxGradient: [modo, color máx, color mín, degradado máx, degradado mín]
    if (!m) return [1, 1, 1, 1]; const [st, ca, cb, ga, gb] = m;
    if (st === 0) return ca; if (st === 1) return gradAt(ga, t); if (st === 2) return ca.map((v, i) => cb[i] + (v - cb[i]) * r);
    if (st === 3) { const a = gradAt(ga, t), b = gradAt(gb, t); return a.map((v, i) => b[i] + (v - b[i]) * r); }
    return gradAt(ga, rnd());
  }
  function rotXYZ(v, e) { // giro de Unity en grados (Z, X, Y)
    let [x, y, z] = v; const [ax, ay, az] = e.map((d) => (d * Math.PI) / 180);
    let c = Math.cos(az), s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c];
    c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c];
    return [x, y, z];
  }
  function shapeSpawn(f) { // posición y dirección de salida según la forma
    if (!f) return [[0, 0, 0], [0, 0, 1]];
    const R = f.radio || 0, sc = f.esc || [1, 1, 1];
    let p = [0, 0, 0], d = [0, 0, 1];
    if (f.tipo === 0 || f.tipo === 1 || f.tipo === 2 || f.tipo === 3) { // esfera
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u); d = [q * Math.cos(a), q * Math.sin(a), u];
      if (f.tipo === 2 || f.tipo === 3) d[2] = Math.abs(d[2]);
      const rr = f.tipo === 1 || f.tipo === 3 ? R : R * (1 - (f.grosor ?? 1) * rnd()) ;
      p = d.map((v) => v * rr);
    } else if (f.tipo === 4 || f.tipo === 7 || f.tipo === 8 || f.tipo === 9) { // cono hacia +Z
      const a = rnd() * ((f.arco || 360) * Math.PI) / 180, rr = R * Math.sqrt(rnd()), ang = ((f.angulo || 0) * Math.PI) / 180;
      p = [Math.cos(a) * rr, Math.sin(a) * rr, 0];
      const k = R > 0 ? rr / R : rnd(), t = Math.sin(ang * k); d = [Math.cos(a) * t, Math.sin(a) * t, Math.cos(ang * k)];
    } else if (f.tipo === 10 || f.tipo === 11) { // círculo en el plano XY, hacia fuera
      const a = rnd() * ((f.arco || 360) * Math.PI) / 180, rr = f.tipo === 11 ? R : R * (1 - (f.grosor ?? 1) * rnd());
      d = [Math.cos(a), Math.sin(a), 0]; p = [d[0] * rr, d[1] * rr, 0];
    } else if (f.tipo === 5 || f.tipo === 15 || f.tipo === 16) { // caja, hacia +Z
      p = [(rnd() - 0.5) * sc[0], (rnd() - 0.5) * sc[1], (rnd() - 0.5) * sc[2]];
    } else if (f.tipo === 12) { p = [(rnd() - 0.5) * R * 2, 0, 0]; d = [0, 1, 0]; } // borde
    else if (f.tipo === 18) { p = [(rnd() - 0.5) * sc[0], (rnd() - 0.5) * sc[1], 0]; d = [0, 0, 1]; } // rectángulo
    if (f.tipo !== 5 && f.tipo !== 18) p = [p[0] * sc[0], p[1] * sc[1], p[2] * sc[2]];
    p = rotXYZ(p, f.giro || [0, 0, 0]); d = rotXYZ(d, f.giro || [0, 0, 0]);
    p = [p[0] + f.pos[0], p[1] + f.pos[1], p[2] + f.pos[2]];
    if (f.azar) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u); d = d.map((v, i) => v + ([q * Math.cos(a), q * Math.sin(a), u][i] - v) * f.azar); }
    return [p, d];
  }
  // lanza el efecto `name` en (x, y) de pantalla; k = tamaño de una unidad en pantalla (la casilla); o.tint para teñir
  GL.ufx = function (name, x, y, k, o) {
    loadFx(); if (!FX || !FX[name]) return false;
    o = o || {};
    for (const s of FX[name]) {
      if (s.apagado && !o.todos) continue; // los apagados en el prefab solo con o.todos
      const rr = rnd();
      fxRun.push({ s, x: x + s.pos[0] * k, y: y - s.pos[1] * k, dx: s.pos[0] * k, dy: -s.pos[1] * k, k, t: -mmv(s.retraso, 0, rr), parts: [], bursts: (s.emision ? s.emision.rafagas : []).map(() => 0), acc: 0, tint: o.tint, rot: ((s.rot || 0) * Math.PI) / 180, follow: o.follow, under: !!o.under, life: 0 });
    }
    return true;
  };
  function emit(e, n) {
    const s = e.s;
    for (let i = 0; i < n && e.parts.length < (s.max || 1000); i++) {
      const r = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
      const [p, d] = shapeSpawn(s.forma), sp = mmv(s.rapidez, e.t / s.dur, r[0]);
      e.parts.push({ p, v: d.map((q) => q * sp), age: 0, ox: s.espacio === 1 ? e.x : null, oy: s.espacio === 1 ? e.y : null, life: Math.max(0.01, mmv(s.vida, e.t / s.dur, r[1])), size: mmv(s.tam, e.t / s.dur, r[2]), sizeY: s.tamY ? mmv(s.tamY, e.t / s.dur, r[2]) : null,
        rot: mmv(s.giro0, e.t / s.dur, r[3]), col: mmg(s.color0, e.t / s.dur, r[4]), r });
    }
  }
  function stepFx(dt) {
    for (let i = fxRun.length - 1; i >= 0; i--) {
      const e = fxRun[i], s = e.s, sdt = dt * (s.vel || 1);
      e.t += sdt; e.life += dt;
      let emitting = true;
      if (e.follow) { const pos = e.follow(e.life); if (pos) { e.x = pos[0] + e.dx; e.y = pos[1] + e.dy; } else { emitting = false; e.follow = null; e.ended = true; } }
      if (e.ended) emitting = false;
      if (emitting && e.t >= 0 && (e.t < s.dur || s.bucle)) {
        const tt = s.bucle ? e.t % s.dur : e.t;
        if (s.emision) {
          s.emision.rafagas.forEach((b, j) => {
            const cyc = b[2] || 1;
            while (e.bursts[j] < cyc && tt >= b[0] + e.bursts[j] * (b[3] || 0)) { if (rnd() <= (b[4] ?? 1)) emit(e, Math.round(mmv(b[1], tt / s.dur, rnd()))); e.bursts[j]++; }
          });
          e.acc += mmv(s.emision.ritmo, tt / s.dur, rnd()) * sdt;
          if (e.acc >= 1) { const n = Math.floor(e.acc); e.acc -= n; emit(e, n); }
        }
        if (s.bucle && e.t > s.dur * 8) e.t = 0; // no se repiten sin fin: los efectos de partida duran poco
      }
      const g = mmv(s.gravedad, 0, 0) * 9.81;
      for (let j = e.parts.length - 1; j >= 0; j--) {
        const q = e.parts[j]; q.age += sdt; const lt = q.age / q.life;
        if (lt >= 1) { e.parts.splice(j, 1); continue; }
        q.v[1] -= g * sdt;
        if (s.fuerza) { q.v[0] += mmv(s.fuerza.x, lt, q.r[5]) * sdt; q.v[1] += mmv(s.fuerza.y, lt, q.r[6]) * sdt; }
        let vx = q.v[0], vy = q.v[1];
        if (s.velVida) { const mu = s.velVida.mult ? mmv(s.velVida.mult, lt, q.r[7]) || 1 : 1; vx += mmv(s.velVida.x, lt, q.r[5]) * mu; vy += mmv(s.velVida.y, lt, q.r[6]) * mu; }
        if (s.limite) {
          const lim = mmv(s.limite.mag, lt, q.r[7]), sp = Math.hypot(q.v[0], q.v[1]);
          if (sp > lim && sp > 0) { const nv = sp - (sp - lim) * (s.limite.freno || 0); q.v[0] *= nv / sp; q.v[1] *= nv / sp; }
        }
        q.p[0] += vx * sdt; q.p[1] += vy * sdt;
        q.vx = vx; q.vy = vy;
        if (s.giroVida) q.rot += mmv(s.giroVida, lt, q.r[3]) * sdt;
      }
      if ((e.t > s.dur + 0.1 || e.ended) && !e.parts.length && (!s.bucle || e.ended)) fxRun.splice(i, 1);
      else if (s.bucle && e.t > s.dur * 4 && !e.parts.length) fxRun.splice(i, 1);
    }
  }
  function fxTexture(n) { if (!fxTex[n]) fxTex[n] = PIXI.Texture.from(E.privBase() + 'gl/fx/fx_' + n + '.png'); return fxTex[n].baseTexture.valid ? fxTex[n] : null; }
  function drawFx(under) { // under: solo los que van debajo de las piezas (y sin él, solo los de encima)
    for (const e of fxRun) {
      if (!!e.under !== !!under) continue;
      const s = e.s, base = s.textura && fxTexture(s.textura); if (!base) continue;
      const add = /add/i.test(s.shader || '') || /add/i.test((s.material && s.material.nombre) || '');
      const tint0 = (s.material && s.material.tint) || [1, 1, 1, 1];
      for (const q of e.parts) {
        const lt = q.age / q.life;
        let fr = base;
        if (s.uv) {
          const nx = s.uv.x, ny = s.uv.y, f = mmv(s.uv.frames, lt, q.r[6]) * (s.uv.ciclos || 1) % 1, f0 = mmv(s.uv.inicio, 0, q.r[7]);
          let idx;
          if (s.uv.tipo === 1) { const row = s.uv.filaAzar ? Math.floor(q.r[5] * ny) : s.uv.fila; idx = row * nx + (Math.floor(f * nx + f0) % nx); }
          else idx = Math.floor(f * nx * ny + f0) % (nx * ny);
          const key = s.textura + ':' + nx + 'x' + ny + ':' + idx;
          fr = fxTex[key] || (fxTex[key] = new PIXI.Texture(base.baseTexture, new PIXI.Rectangle((idx % nx) * (base.width / nx), Math.floor(idx / nx) * (base.height / ny), base.width / nx, base.height / ny)));
        }
        const sz = q.size * (s.tamVida ? mmv(s.tamVida, lt, q.r[2]) : 1) * e.k;
        const c = mmg(s.colorVida, lt, q.r[4]), col = [q.col[0] * c[0] * tint0[0], q.col[1] * c[1] * tint0[1], q.col[2] * c[2] * tint0[2], q.col[3] * c[3]];
        if (e.tint) { col[0] *= e.tint[0]; col[1] *= e.tint[1]; col[2] *= e.tint[2]; }
        const ch = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
        const x = (q.ox != null ? q.ox : e.x) + q.p[0] * e.k, y = (q.oy != null ? q.oy : e.y) - q.p[1] * e.k;
        if (s.render && s.render.modo === 1) { // estirada en la dirección de la velocidad
          const sp = Math.hypot(q.vx || 0, q.vy || 0), len = sz * (s.render.largo || 1) + sp * (s.render.velEsc || 0) * e.k;
          img(fr, x, y, { w: len, h: sz, ax: 0.5, ay: 0.5, rot: -Math.atan2(q.vy || 0, q.vx || 1), tint: (ch(col[0]) << 16) | (ch(col[1]) << 8) | ch(col[2]), alpha: col[3], add });
        } else img(fr, x, y, { w: sz, h: q.sizeY != null ? q.sizeY * e.k : sz, ax: 0.5, ay: 0.5, rot: -q.rot, tint: (ch(col[0]) << 16) | (ch(col[1]) << 8) | ch(col[2]), alpha: col[3], add });
      }
    }
  }
  let lastFxT = null;

  // ---------------------------------------------------------------- prefabs animados (gl/flat_esp.json + gl/anim.json)
  // Dibuja un prefab de Toy Blast (sus piezas en unidades, con la ruta de cada nodo) aplicando un AnimationClip en el
  // instante t: nodos que se encienden o apagan (m_IsActive), cambio de sprite (m_Sprite) y posición/escala locales.
  // o = { anim, t, k (px por unidad), flipX, rot (radianes), alpha, sc }
  function curvesFor(clip, path) {
    if (!clip) return null;
    const c = clip._idx || (clip._idx = {});
    if (c[path] !== undefined) return c[path];
    return (c[path] = clip.curvas.filter((q) => q.ruta === path || path.startsWith(q.ruta + '/')));
  }
  function sampleC(v, t, dur) { const n = v.length; if (n <= 1) return v[0]; const f = Math.min(n - 1, Math.max(0, t * 60)), i = Math.floor(f), k = f - i; return i >= n - 1 ? v[n - 1] : v[i] + (v[i + 1] - v[i]) * k; }
  function drawPrefab(name, x, y, o) {
    const parts = ESP && ESP[name]; if (!parts) return false;
    const clip = o.anim && ANIM && ANIM[o.anim], k = o.k * (o.sc || 1);
    let t = o.t || 0; if (clip) t = clip.bucle && clip.dur > 0 ? t % clip.dur : Math.min(t, clip.dur);
    const ca = Math.cos(o.rot || 0), sa = Math.sin(o.rot || 0), fx = o.flipX ? -1 : 1;
    const list = parts._sorted || (parts._sorted = parts.filter((p) => p.tipo === 'sprite').sort((a, b) => (a.capa || 0) - (b.capa || 0) || a.orden - b.orden));
    for (const p of list) {
      const path = p.ruta.slice(1).concat(p.nodo).join('/');
      let on = !(p.apagado && p.apagado.length), spr = p.sprite + (p.sid ? '#' + p.sid : ''), dx = 0, dy = 0, msx = 1, msy = 1;
      const cs = curvesFor(clip, path);
      if (cs) for (const q of cs) {
        if (q.prop === 'm_IsActive') { const v = sampleC(q.v[0], t); if (v < 0.5) on = false; else if (q.ruta === path || (p.apagado || []).every((a) => !a.endsWith(q.ruta) || a === p.ruta.concat(p.nodo).join('/'))) on = true; }
        else if (q.ruta !== path) continue;
        else if (q.clase === 'pptr') { const i = Math.round(sampleC(q.v[0], t)); if (clip.sprites[i]) spr = clip.sprites[i]; }
        else if (q.clase === 'pos' && p.local) { const lx = sampleC(q.v[0], t), ly = sampleC(q.v[1], t); const ddx = (lx - p.local[0]) * p.pesc[0], ddy = (ly - p.local[1]) * p.pesc[1], pr = (p.prot * Math.PI) / 180; dx = ddx * Math.cos(pr) - ddy * Math.sin(pr); dy = ddx * Math.sin(pr) + ddy * Math.cos(pr); }
        else if (q.clase === 'scale' && p.local) { msx = sampleC(q.v[0], t) / (p.local[2] || 1); msy = sampleC(q.v[1], t) / (p.local[3] || 1); }
      }
      if (!on) continue;
      const tx = tex(spr); if (!tx) continue;
      const m = p.m, wx = (m[4] + dx) * fx, wy = m[5] + dy, sx = Math.hypot(m[0], m[1]) * msx, sy = Math.hypot(m[2], m[3]) * msy, r0 = Math.atan2(m[1], m[0]);
      const px0 = x + (wx * ca - wy * sa) * k, py0 = y - (wx * sa + wy * ca) * k;
      img(tx, px0, py0, { w: tx.u[0] * sx * k, h: tx.u[1] * sy * k, rot: -(r0 * fx + (o.rot || 0)), flipX: o.flipX, alpha: o.alpha });
    }
    return true;
  }
  GL.drawPrefab = drawPrefab;
  // rotores que salen volando del especial (RotorHandler: uno a cada lado, a UiConstants.RotorSpeed = 20 casillas/s),
  // con RotorAnimation en su animación RotorMove y la estela de humo RotorSmoke
  const flying = new Map();
  function drawRotors(B) {
    for (const f of B.fxs) {
      if (f.type !== 'rocket' || f.delay > 0) continue;
      let st = flying.get(f);
      const x0 = B.cx(f.c), y0 = B.cy(f.r), v = B.ts * 20, d = f.age * v, hz = f.dir === 'h';
      for (const sgn of [-1, 1]) {
        const x = x0 + (hz ? sgn * d : 0), y = y0 + (hz ? 0 : sgn * d);
        drawPrefab('RotorAnimation', x, y, { anim: 'RotorMove', t: f.age, k: B.ts, flipX: hz ? sgn < 0 : false, rot: hz ? 0 : (sgn < 0 ? Math.PI / 2 : -Math.PI / 2) });
      }
      if (!st) { st = { t: 0 }; flying.set(f, st); }
      while (st.t <= f.age) { // humo detrás de cada rotor, cada 1/30 s
        const dd = st.t * v;
        for (const sgn of [-1, 1]) GL.ufx('RotorAnimation', x0 + (hz ? sgn * dd : 0), y0 + (hz ? 0 : sgn * dd), B.ts, { todos: true });
        st.t += 1 / 30;
      }
    }
    const live = new Set();
    for (const f of B.fxs) { // potenciadores (Spine de Toy Blast)
      if (f.type !== 'boost' || f.delay > 0) continue;
      const key = 'b' + (f.id || (f.id = Math.random())), x = B.cx(f.c), y = B.cy(f.r), t = f.age; live.add(key);
      // tamaños: en Toy Blast la locomotora mide ~1,7 casillas de alto, la aspiradora y el taladro ~1,5 de ancho
      if (f.b === 'drill') drawSpine(key, 'drill', 'drill_anim', t, x + B.ts * 0.2, y + B.ts * 0.4, B.ts, { sc: 0.85 });
      else if (f.b === 'train') drawSpine(key, 'row_booster_train', 'row_blaster_train_anim', t % 0.6, B.bx + (t * 12 - 1.34) * B.ts, y + B.ts * 0.4, B.ts, { loop: true, sc: 0.35 }); // la locomotora delante
      else if (f.b === 'vacuum') drawSpine(key, 'vacuum', 'vacuum_anim', t, x, B.by + (t * 9 - 1.53) * B.ts, B.ts, { loop: true, sc: 0.4 });
      else if (f.b === 'brush') drawSpine(key, 'brush', t < 0.73 ? 'gelme' : 'gitme', t < 0.73 ? t : t - 0.73, x + B.ts * 0.7, y + B.ts * 0.5, B.ts, { sc: 0.6 });
    }
    for (const [k, sp] of spInst) if (k[0] === 'b' && !live.has(k)) { sp.destroy(); spInst.delete(k); }
    for (const f of B.fxs) {
      if (f.delay > 0 || flying.has(f)) continue;
      if (f.type === 'bomb') { flying.set(f, 1); GL.ufx(f.rad >= 3 ? 'TntComboExplotion' : 'TNTExplosion', B.cx(f.c), B.cy(f.r), B.ts * (f.rad >= 3 ? 1.5 : 1), { todos: true }); }
      else if (f.type === 'disco') { // estelas del rompecabezas hacia cada cubo de su color (PuzzleCubeTrail_Prefab), 0,25 s
        flying.set(f, 1);
        const x0 = B.cx(f.c), y0 = B.cy(f.r);
        GL.ufx('SoftExplosions', x0, y0, B.ts);
        for (const [rr, cc] of f.targets) {
          const x1 = B.cx(cc), y1 = B.cy(rr);
          GL.ufx('PuzzleCubeTrail_Prefab', x0, y0, B.ts, { follow: (t) => (t > 0.25 ? null : [x0 + (x1 - x0) * (t / 0.25), y0 + (y1 - y0) * (t / 0.25)]) });
        }
      }
    }
    for (const f of flying.keys()) if (!B.fxs.includes(f)) flying.delete(f);
  }

  // ---------------------------------------------------------------- esqueletos Spine 2.1 de Toy Blast (gl/spine/, pasados a
  // JSON 3.7 con tools/spine21_json.py) con el lector de pixi-spine 3.7, que va solo en privado/ (como en los otros HD).
  // En Unity, una unidad de Spine es 0,01 unidades del juego (una casilla)
  const SPN = { json: {}, atlas: {}, data: {} }, SPINES = ['TOYBLAST_ANIM', 'LevelCompleted', 'rocket', 'drill', 'row_booster_train', 'vacuum', 'brush', 'adam', 'traktor', 'wooly', 'rhino', 'tofidik', 'toy_fil', 'chopper', 'clockbird'];
  let spLoading = false;
  function loadSpine() {
    if (spLoading) return; spLoading = true;
    const base = E.privBase() + 'gl/';
    const add = (src, cb) => { const sc = document.createElement('script'); sc.src = base + src; sc.onload = cb; sc.onerror = () => {}; document.head.appendChild(sc); };
    const get = (u, cb) => { const x = new XMLHttpRequest(); x.open('GET', base + 'spine/' + u); x.onload = () => cb(x.responseText); x.send(); };
    add('spine_base.js', () => add('spine_37.js', () => {
      for (const n of SPINES) { get(n + '.json', (t) => { try { SPN.json[n] = JSON.parse(t); } catch (e) { console.warn('spine', n, e); } }); get(n + '.atlas', (t) => { SPN.atlas[n] = t; }); }
    }));
  }
  function spineData(n) {
    if (SPN.data[n] !== undefined) return SPN.data[n];
    const js = SPN.json[n], at = SPN.atlas[n];
    if (!js || !at || !window.PIXI || !PIXI.spine || !PIXI.spine37) return null;
    try {
      const atlas = new PIXI.spine.TextureAtlas(at, (page, cb) => cb(PIXI.BaseTexture.from(E.privBase() + 'gl/spine/' + page)));
      SPN.data[n] = new PIXI.spine37.SkeletonJson(new PIXI.spine37.AtlasAttachmentLoader(atlas)).readSkeletonData(js);
    } catch (e) { console.warn('spine', n, e); SPN.data[n] = false; }
    return SPN.data[n];
  }
  const spInst = new Map();
  // dibuja el esqueleto n con su animación anim en el instante t (segundos desde que empezó); k = px por unidad del juego
  function drawSpine(key, n, anim, t, x, y, k, o) {
    loadSpine(); const sd = spineData(n); if (!sd) return false;
    let sp = spInst.get(key);
    if (!sp || sp.n !== n) { sp = new PIXI.spine37.Spine(sd); sp.autoUpdate = false; sp.n = n; spInst.set(key, sp); }
    if (sp.anim !== anim || t < sp.t) { sp.state.setAnimation(0, anim, !!(o && o.loop)); sp.anim = anim; sp.t = 0; sp.update(0); }
    if (t > sp.t) { sp.update(t - sp.t); sp.t = t; }
    sp.position.set(x, y); sp.scale.set(k * 0.01 * ((o && o.sc) || 1)); sp.alpha = o && o.alpha != null ? o.alpha : 1;
    root.addChild(sp); return true;
  }
  GL.drawSpine = drawSpine; GL.spineData = spineData;

  // ---------------------------------------------------------------- final del nivel (como Toy Blast, grabado en el emulador)
  // fase 'logo': "TOY BLAST!" (TOYBLAST_ANIM, animación "animation") sobre el tablero y la barra de abajo se va (0,3 s);
  // 'moves': cada movimiento sobrante sale del contador como un cometa que se posa en un cubo y lo vuelve especial;
  // 'boom': los especiales estallan; 'lc': "Level Completed!" con Amy y las trompetas (LevelCompleted, 3 s)
  function drawFinale(st, B) {
    const F = B.fin; if (!F) return;
    const t = E.t - F.t0;
    if (F.phase === 'logo') drawSpine('logo', 'TOYBLAST_ANIM', 'animation', t, E.W / 2, B.by + B.ts * 2.2, B.ts * 0.8);
    for (const c of F.comets || []) { // cometas del contador al cubo (estela BeachBallTracer)
      const k = Math.min(1, (E.t - c.t0) / c.dur); if (k >= 1) continue;
      const e = k * k * (3 - 2 * k), x = c.x0 + (c.x1 - c.x0) * e, y = c.y0 + (c.y1 - c.y0) * e - Math.sin(Math.PI * e) * B.ts * 1.5;
      if (!c.fx) { c.fx = true; GL.ufx('BeachBallTracer', c.x0, c.y0, B.ts, { todos: true, follow: (tt) => { const kk = Math.min(1, tt / c.dur); if (kk >= 1) return null; const ee = kk * kk * (3 - 2 * kk); return [c.x0 + (c.x1 - c.x0) * ee, c.y0 + (c.y1 - c.y0) * ee - Math.sin(Math.PI * ee) * B.ts * 1.5]; } }); }
    }
    if (F.phase === 'lc') {
      boardBox.alpha = Math.max(0, 1 - t / 0.4); // el tablero se va (vídeo del juego real)
      const g = gfx(); g.beginFill(0x000000, Math.min(0.35, t)); g.drawRect(0, 0, E.W, E.H); g.endFill();
      drawSpine('lc', 'LevelCompleted', 'level_complete', t, E.W / 2, E.H * 0.42, E.W / 49.3); // a 1,5 s sus rayos miden 1,1 veces el ancho, como en el vídeo
    }
  }
  GL.movesXY = () => { const k = px(HUD_PPU); return [E.W / 2 + 2.87 * k, px(TOP_Y) - (6.76 - 7.85) * k]; };

  // ---------------------------------------------------------------- pantalla de juego
  GL.play = function (st) {
    if (!on() || !st.P || !st.P.glState) return false;
    usedThisFrame = true; playedThisFrame = true;
    loadSpine(); loadFx(); // que estén listos para el final
    begin();
    const B = st.P.glState(); curToy = toyOf(st.n);
    drawBackground(st);
    if (E.popup && (E.popup.win || E.popup.lost) && E.popup.anim > 0.5) return true;
    drawBoard(B);
    drawRotors(B);
    loadFx(); const dt = lastFxT == null ? 0 : Math.min(0.05, Math.max(0, E.t - lastFxT)); lastFxT = E.t; stepFx(dt);
    drawFx();
    drawHud(st);
    if (!B.fin || B.fin.phase === 'play') { withHand(() => drawBottom(st)); drawNotices(st, B); }
    else { const k = Math.min(1, (E.t - B.fin.tBar) / 0.3), y0 = root.children.length; withHand(() => drawBottom(st)); for (let i = y0; i < root.children.length; i++) root.children[i].y += k * px(260); } // la barra se va (HideBottomPanelSpeed 0,3 s)
    drawBucket(B); // el balde va delante de todo (ZIndexOfBucket = -8)
    drawFinale(st, B);
    for (const f of st.flyers || []) { const t = goalTex(f.gl) || goalCanvas(f.gl); const s = px(80) * f.s; img(t, f.x, f.y, { w: s, h: s * (t.u ? t.u[1] / t.u[0] : 1), ax: 0.5, ay: 0.5 }); }
    return true;
  };
  // ---------------------------------------------------------------- ventanas de Toy Blast
  // Antes del nivel: PreLevelDialog (gl/flat_pop.json) con sus piezas: panel, cinta del título "Nivel N", cruz, las tres
  // estrellas (StarsPanel; su Layout las coloca en tiempo de ejecución), "Seleccionar potenciadores", rotor, TNT y
  // rompecabezas (nuestros potenciadores de inicio, en ese orden) y el botón verde "Jugar". Textos de Language.es.
  // Entra creciendo (0,8 → 1 en 0,25 s) y por debajo va el modo por turnos (nuestro), discreto
  const PRE_SKIP = /\/(Layout|MultiplierTicket|IngameTimedBoosterPanel|LockIcon|BottomArea)(\/|$)|^(TopPanelHolder|BottomPanelHolder)/;
  function popBox(pop, cx, cy) { // la ventana entera crece al abrirse y se encoge al cerrarse
    const a = Math.min(1, pop.anim == null ? 1 : pop.anim), t = E.t - (pop.t0 || 0), q = Math.min(1, t / 0.25);
    const sc = pop.closing ? 0.8 + 0.2 * a : 0.8 + 0.2 * (1 + 2.7 * Math.pow(q - 1, 3) + 1.7 * Math.pow(q - 1, 2)); // salida con rebote (outBack)
    const g = gfx(); g.beginFill(0x000000, 0.55 * a); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const box = new PIXI.Container(); box.poolBox = true; box.pivot.set(cx, cy); box.position.set(cx, cy); box.scale.set(sc); box.alpha = Math.min(1, a * 1.5); root.addChild(box);
    return { box, sc, a };
  }
  function preLevel(pop) {
    if (!POPF || !POPF.PreLevelDialog) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const P = pop.pre, k = (E.W * 0.9) / 6.15, cx = E.W / 2, cy = E.H * 0.47; // el panel (6,15 unidades) ocupa el 90 % del ancho
    const { box, sc, a } = popBox(pop, cx, cy);
    const prev = root; root = box;
    const list = POPF.PreLevelDialog._pre || (POPF.PreLevelDialog._pre = POPF.PreLevelDialog.filter((p) => p.tipo === 'image' && !p.apagado && !PRE_SKIP.test(p.ruta.slice(2).concat(p.nodo).join('/'))));
    const at = (ux, uy) => [cx + ux * k, cy - (uy - 0.5) * k];
    drawFlat(list, 0, 0.5, cx, cy, k);
    // estrellas: la del centro más alta y las de los lados giradas, como en el prefab; encendidas las ya ganadas
    const won = (E.save.stars && E.save.stars[P.n]) || 0;
    [[-1.57, 1.95, 0.15], [0, 2.45, 0], [1.57, 1.95, -0.15]].forEach(([ux, uy, r], i) => {
      const [x, y] = at(ux, uy);
      img('Default-star_holder', x, y, { w: 1.62 * k, h: 1.6 * k, rot: r });
      if (i < won) img('Popups-PreLevel-prelevel_star', x, y, { w: 1.42 * k, h: 1.37 * k, rot: r });
    });
    if (P.hard) { const [x, y] = at(0, 0.95); text(P.hard >= 2 ? 'Superdifícil' : 'Nivel difícil', x, y, 0.42 * k, { fill: '#ff5a4e', stroke: '#5a1410', sw: 0.07 * k }); }
    { const [x, y] = at(0, 4.0); text('Nivel ' + P.n, x, y, 0.62 * k, { fill: '#ffffff', stroke: '#1f5d8c', sw: 0.1 * k }); }
    // la explicación de la pieza nueva (nuestra) va en el hueco del separador, entre las estrellas y los potenciadores
    const help = P.spec && P.spec.text ? P.spec.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{3030}\u{FE0F}]/gu, '').replace(/\s+([:.,])/g, '$1').replace(/\s{2,}/g, ' ').trim() : ''; // la explicación de la pieza nueva (nuestra), sin emojis
    if (help) { const [x, y] = at(0, P.hard ? 0.25 : 0.475); fitHelp(help, x, y, 5.3 * k, (P.hard ? 0.9 : 1.25) * k, 0.32 * k, { fill: '#ffffff', stroke: '#24505c', sw: 0.05 * k }); }
    else { const [x, y] = at(0, 0.45); img('Default-separator', x, y, { w: 3.11 * 1.122 * k, h: 0.1 * 1.122 * k }); } // Seperator (MiddlePanel), centrado por su Layout
    { const [x, y] = at(0, -0.4); text('Seleccionar potenciadores', x, y, 0.4 * k, { fill: '#ffffff', stroke: '#24505c', sw: 0.06 * k }); }
    { const [x, y] = at(0, -3.36); text('Jugar', x, y, 0.62 * k, { fill: '#ffffff', stroke: '#2c7a12', sw: 0.1 * k }); }
    // potenciadores de inicio: cantidad en su círculo, o la marca verde si están elegidos
    const hs = (ux, uy, w, h, fn, id) => { const [x, y] = at(ux, uy); E.hotspot(id, (x - (w / 2) * k - cx) * sc + cx, (y - (h / 2) * k - cy) * sc + cy, w * k * sc, h * k * sc, fn); };
    P.SB.slice(0, 3).forEach((b, i) => {
      const ux = (i - 1) * 1.632, [x, y] = at(ux, -1.473), have = P.have(b), onB = P.chosen.has(b.id);
      if (onB) img('GoalPanel-popup_goal_check', x + 0.45 * k, y + 0.35 * k, { w: 0.6 * k, h: 0.6 * k });
      else {
        const cg = gfx(); cg.beginFill(have > 0 ? 0xe8322b : 0x8a96a3); cg.lineStyle(0.05 * k, 0xffffff); cg.drawCircle(x + 0.48 * k, y + 0.38 * k, 0.24 * k); cg.endFill();
        text(have === Infinity ? '∞' : have > 0 ? String(have) : '+', x + 0.48 * k, y + 0.38 * k, 0.3 * k, { fill: '#ffffff' });
      }
      hs(ux, -1.473, 1.41, 1.14, () => P.toggle(b), 'gl_sb' + b.id);
    });
    root = prev;
    hs(0, -3.36, 3.4, 1.2, P.play, 'gl_play');
    hs(2.65, 3.88, 1.0, 1.0, P.close, 'gl_close');
    // por turnos con otra persona (nuestro), discreto debajo del panel
    if (P.duo) {
      const yd = at(0, -3.5)[1] + 1.25 * k, dg = gfx(); dg.alpha = a;
      dg.beginFill(E.duoOn ? 0xff8a1f : 0x000000, E.duoOn ? 0.9 : 0.35); dg.drawRoundedRect(cx - 2.2 * k, yd - 0.3 * k, 4.4 * k, 0.6 * k, 0.3 * k); dg.endFill();
      const tt = text(E.duoOn ? 'Por turnos: sí' : 'Por turnos: no', cx, yd, 0.3 * k, { fill: '#ffffff' }); if (tt) tt.alpha = a;
      E.hotspot('gl_duo', cx - 2.2 * k, yd - 0.3 * k, 4.4 * k, 0.6 * k, P.duo);
    }
    return true;
  }
  // Al ganar: LevelWin de Toy Blast ("WELL DONE!" tras el "Level Completed!" de Amy): fondo oscuro con la luz
  // ui_level_win_light, "¡Bien hecho!" (strWellDone) y las tres estrellas con su sombra, que saltan una a una; abajo
  // "Toca para continuar" (strTapToContinue) y cualquier toque sigue. Medidas del prefab en unidades (k px cada una)
  function winScreen(pop) {
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const W = pop.win, a = Math.min(1, pop.anim == null ? 1 : pop.anim), k = E.W / 7.2, cx = E.W / 2, cy = E.H * 0.42;
    const at = (ux, uy) => [cx + ux * k, cy - (uy - 0.65) * k];
    const g = gfx(); g.beginFill(0x000000, 0.72 * a); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const t = E.t - (pop.t0 || 0);
    { const [x, y] = at(0, 0.65); img('ui_level_win_light', x, y, { w: 9.07 * k, h: 11.12 * k, alpha: 0.85 * a, add: true }); }
    const sIn = Math.min(1, t / 0.3), ts = 0.6 + 0.4 * (1 + 2.7 * Math.pow(sIn - 1, 3) + 1.7 * Math.pow(sIn - 1, 2));
    { const [x, y] = at(0.11, 2.76); const tx = text('¡Bien hecho!', x, y, 0.95 * k * ts, { fill: '#ffd23f', stroke: '#8a3a00', sw: 0.14 * k }); if (tx) tx.alpha = a; }
    const stars = [[-1.62, 0.2, 0.979, 0.21], [0, 0.88, 1.0, 0], [1.62, 0.2, 0.979, -0.21]];
    stars.forEach(([ux, uy, s0, r], i) => {
      const [x, y] = at(ux, uy);
      img('ui_level_win_star_shadow', x, y, { w: 1.8 * s0 * k, h: 1.77 * s0 * k, rot: r, alpha: a });
      if (i < (pop.starsShown || 0)) {
        if (!pop._st) pop._st = []; if (pop._st[i] == null) { pop._st[i] = E.t; GL.ufx('SoftExplosions', x, y, k * 0.8); }
        const q = Math.min(1, (E.t - pop._st[i]) / 0.25), sc = q < 1 ? 1.6 - 0.6 * q * q : 1; // cae desde más grande
        img('ui_level_win_star', x, y, { w: 1.75 * s0 * k * sc, h: 1.74 * s0 * k * sc, rot: r, alpha: a }); // la de LevelWin (tb_export ya coge el sprite bueno de los dos con su nombre)
      }
    });
    if (t > 0.8) { const tt = text('Toca para continuar', cx, E.H - px(260), px(56), { fill: '#ffffff', stroke: '#13304a', sw: px(6) }); if (tt) tt.alpha = a * (0.75 + 0.25 * Math.sin(E.t * 4)); }
    E.hotspot('gl_next', 0, 0, E.W, E.H, W.next);
    return true;
  }
  // Al perder: el mismo panel de PreLevelDialog con "Nivel N", "¡No quedan movimientos!" (str31 de Language.es) o el
  // motivo, los objetivos con lo que falta y el botón verde "Jugar" (vuelve a la ventana de antes del nivel); la cruz,
  // al mapa
  const LOST_KEEP = new Set(['BackgroundImage', 'TitlePanel', 'CloseButton', 'PlayButtonHolder', 'PlayButton']);
  function lostLevel(pop) {
    if (!POPF || !POPF.PreLevelDialog) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const L = pop.lost, k = (E.W * 0.9) / 6.15, cx = E.W / 2, cy = E.H * 0.47;
    const { box, sc } = popBox(pop, cx, cy);
    const prev = root; root = box;
    const list = POPF.PreLevelDialog._lost || (POPF.PreLevelDialog._lost = POPF.PreLevelDialog.filter((p) => p.tipo === 'image' && !p.apagado && LOST_KEEP.has(p.nodo)));
    const at = (ux, uy) => [cx + ux * k, cy - (uy - 0.5) * k];
    drawFlat(list, 0, 0.5, cx, cy, k);
    { const [x, y] = at(0, 4.0); text('Nivel ' + L.n, x, y, 0.62 * k, { fill: '#ffffff', stroke: '#1f5d8c', sw: 0.1 * k }); }
    { const [x, y] = at(0, 2.6); const t = text(L.dead ? L.msg : '¡No quedan movimientos!', x, y, 0.5 * k, { fill: '#ffffff', stroke: '#24505c', sw: 0.07 * k }); if (t && t.width > 5.4 * k) t.scale.set((t.scale.x * 5.4 * k) / t.width); }
    { const [x, y] = at(0, 1.55); img('Default-separator', x, y, { w: 3.11 * 1.122 * k, h: 0.1 * 1.122 * k }); }
    // objetivos con lo que falta (o la marca si ya está), en fila
    const goals = (L.goals || []).slice(0, 4), n = goals.length, gap = 1.45;
    goals.forEach((gl, i) => {
      const [x, y] = at((i - (n - 1) / 2) * gap, 0.2), t = goalTex(gl) || goalCanvas(gl), s = 1.05 * k;
      img(t, x, y, { w: s, h: s * (t.u ? t.u[1] / t.u[0] : 1), ax: 0.5, ay: 0.5 });
      if (gl.left > 0) text(String(gl.left), x + 0.42 * k, y + 0.42 * k, 0.42 * k, { fill: '#ffffff', stroke: '#2a3a28', sw: 0.07 * k });
      else img('GoalPanel-popup_goal_check', x + 0.4 * k, y + 0.38 * k, { w: 0.55 * k, h: 0.55 * k });
    });
    { const [x, y] = at(0, -3.36); text('Jugar', x, y, 0.62 * k, { fill: '#ffffff', stroke: '#2c7a12', sw: 0.1 * k }); }
    root = prev;
    const hs = (ux, uy, w, h, fn, id) => { const [x, y] = at(ux, uy); E.hotspot(id, (x - (w / 2) * k - cx) * sc + cx, (y - (h / 2) * k - cy) * sc + cy, w * k * sc, h * k * sc, fn); };
    hs(0, -3.36, 3.4, 1.2, L.retry, 'gl_retry');
    hs(2.65, 3.88, 1.0, 1.0, L.close, 'gl_close');
    return true;
  }
  // Ventanas sencillas (pausa, salir, ajustes, "¿Qué es esto?") con las piezas de PreLevelDialog: el panel con la altura
  // que haga falta, la cinta del título, la cruz y botones verdes (button_338) o rojos (button_mid_red_slice)
  const PNODE = {};
  function pnode(n) { return PNODE[n] || (PNODE[n] = POPF.PreLevelDialog.find((p) => p.nodo === n && p.tipo === 'image' && !p.apagado)); }
  function moved(p, x, y, rect, sprite) { const m = p.m.slice(); m[4] = x; m[5] = y; return Object.assign({}, p, { m, rect: rect || p.rect, sprite: sprite || p.sprite }); }
  function wrapLines(str, max) { const out = []; for (const par of String(str).split('\n')) { let line = ''; for (const w of par.split(' ')) { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } out.push(line); } return out; }
  // rows: [{ text } | { label, red, fn, id } | { small }] de arriba abajo; devuelve true
  function tbPanel(pop, title, rows, close) {
    if (!POPF || !POPF.PreLevelDialog || !pnode('BackgroundImage')) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const k = (E.W * 0.9) / 6.15, cx = E.W / 2, cy = E.H * 0.52;
    const bg0 = E.save && E.save.big ? 1.18 : 1; // "Letra grande": letra mayor, menos letras por línea y líneas más altas
    const hRow = (r) => (r.h != null ? r.h : r.label ? 1.3 : r.small ? 0.5 : 0.62 * bg0 * r.lines.length + 0.25);
    for (const r of rows) if (r.text != null) r.lines = wrapLines(r.text, Math.round(26 / bg0));
    const H = Math.max(3.2, 1.5 + rows.reduce((s, r) => s + hRow(r), 0));
    const { box, sc } = popBox(pop, cx, cy);
    const prev = root; root = box;
    const at = (ux, uy) => [cx + ux * k, cy - uy * k];
    const bg = pnode('BackgroundImage'), tp = pnode('TitlePanel'), cb = pnode('CloseButton'), ph = pnode('PlayButtonHolder'), pb = pnode('PlayButton');
    const parts = [moved(bg, 0, 0, [bg.rect[0], -H / 2, bg.rect[2], H]), moved(tp, 0, H / 2)];
    if (close) parts.push(moved(cb, 2.65, H / 2 - 0.11));
    let y = H / 2 - 1.05; const btns = [];
    for (const r of rows) {
      const h = hRow(r);
      if (r.draw) r.y = y;
      else if (r.label) { parts.push(moved(ph, 0, y - h / 2, [ph.rect[0], ph.rect[1] * 0.8, ph.rect[2], ph.rect[3] * 0.8])); parts.push(moved(pb, 0, y - h / 2, [pb.rect[0], pb.rect[1] * 0.85, pb.rect[2], pb.rect[3] * 0.85], r.red ? 'button_mid_red_slice' : undefined)); btns.push([r, y - h / 2]); }
      else r.y = y;
      y -= h;
    }
    drawFlat(parts, 0, 0, cx, cy, k);
    { const [x, yy] = at(0, H / 2 + 0.01); const t = text(title, x, yy, 0.56 * k, { fill: '#ffffff', stroke: '#1f5d8c', sw: 0.09 * k }); if (t && t.width > 3.9 * k) t.scale.set((t.scale.x * 3.9 * k) / t.width); }
    for (const r of rows) {
      if (r.lines) r.lines.forEach((ln, i) => { const [x, yy] = at(0, r.y - 0.12 - 0.31 * bg0 - i * 0.62 * bg0); text(ln, x, yy, 0.42 * bg0 * k, { fill: '#ffffff', stroke: '#24505c', sw: 0.06 * k }); });
      else if (r.small) { const [x, yy] = at(0, r.y - 0.25); const t = text(r.small, x, yy, 0.26 * k, { fill: '#a8c8d0' }); }
    }
    for (const [r, yb] of btns) { const [x, yy] = at(0, yb); const t = text(r.label, x, yy, 0.5 * k, { fill: '#ffffff', stroke: r.red ? '#8a1d10' : '#2c7a12', sw: 0.09 * k }); if (t && t.width > 2.9 * k) t.scale.set((t.scale.x * 2.9 * k) / t.width); }
    const hs = (ux, uy, w, h, fn, id) => { const [x, yy] = at(ux, uy); E.hotspot(id, (x - (w / 2) * k - cx) * sc + cx, (yy - (h / 2) * k - cy) * sc + cy, w * k * sc, h * k * sc, fn); };
    for (const r of rows) if (r.draw) r.draw({ at, k, top: r.y, h: hRow(r), hs }); // filas a medida (premios, misiones, logros, teclado)
    root = prev;
    btns.forEach(([r, yb], i) => hs(0, yb, 3.4, 1.0, r.fn, r.id || 'gl_b' + i));
    if (close) hs(2.65, H / 2 - 0.11, 1.0, 1.0, close, 'gl_close');
    return true;
  }
  const NOEMO = (s) => String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  // Regalo diario: FortuneWheelDialog de Toy Blast ("Rueda de Juguete"): panel, la rueda (wheel_rotate) entre sus dos
  // mitades del marco (back_half), el cristal del centro (wheel_static), la flecha, 51 luces que se encienden por turnos
  // y el botón verde. La rueda gira sola; "Detener" la frena hasta su premio y "Reclamar" lo da. Unidades del prefab
  // (el centro de la rueda está en y 332)
  const WHEEL_N = 51;
  function dailyWheel(pop, D) {
    const W = D.wheel; if (!W || !POPF || !POPF.FortuneWheelDialog) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const k = (E.W * 0.92) / 5795, cx = E.W / 2, cy = E.H * 0.5, at = (wx, wy) => [cx + wx * k, cy - (wy - 332) * k];
    const { box, sc } = popBox(pop, cx, cy);
    const prev = root; root = box;
    const F = POPF.FortuneWheelDialog, pick = (n) => F.find((p) => p.nodo === n && !p.apagado);
    const bg = pick('BgImage'), bh = pick('ButtonHolder'), pb = pick('PlayButton');
    drawFlat([bg, bh, pb].filter(Boolean), 0, 332, cx, cy, k);
    const st = D.st;
    if (!st.spinning) { st.idle = (st.idle || 0) + Math.min(0.05, E.dt || 0.016) * 2.2; st.rot = st.idle % (Math.PI * 2); } // gira sola hasta "Detener"
    const S = (n) => tex(n);
    for (const n of ['RightHole', 'LeftHole']) { const p = pick(n); if (!p) continue; const t = S('back_half'), m = p.m, [x, y] = at(m[4], m[5]); img(t, x, y, { w: t.u[0] * Math.abs(m[0]) * k, h: t.u[1] * Math.abs(m[3]) * k, flipX: m[0] < 0, flipY: m[3] < 0 }); }
    { const t = S('wheel_rotate'), [x, y] = at(0, 332); if (t) img(t, x, y, { w: t.u[0] * 614.38 * k, h: t.u[1] * 614.38 * k, rot: st.rot, ax: 0.5, ay: 0.5 }); }
    // premios de cada casilla (los mismos que la ruleta del motor), girando con la rueda
    const R = 2105 * k, n = W.segs.length;
    W.segs.forEach((L, i) => {
      const am = st.rot + ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2, many = L.length > 1;
      L.forEach((ic, j) => { const d = R * (many ? 0.42 + j * 0.2 : 0.62), s = R * (many ? 0.26 : 0.34); img(emojiTex(ic), cx + Math.cos(am) * d, cy + Math.sin(am) * d, { w: s, h: s, ax: 0.5, ay: 0.5 }); });
    });
    { const t = S('wheel_static'), [x, y] = at(9.97, 206.81); if (t) img(t, x, y, { w: t.u[0] * 665 * k, h: t.u[1] * 665 * k }); }
    // luces: la mitad encendidas, alternando (y todas al ganar)
    const on = Math.floor(E.t * (st.spinning && !st.done ? 10 : 3)) % 2;
    F.filter((p) => /_wheel_led_light$/.test(p.nodo)).forEach((p, i) => {
      const [x, y] = at(p.m[4], p.m[5]), t = S('wheel_led_light'), l = S('led'); if (!t) return;
      img(t, x, y, { w: t.u[0] * 665 * k, h: t.u[1] * 665 * k });
      if (l && (st.done || (i + on) % 2)) img(l, x, y, { w: l.u[0] * 665 * k, h: l.u[1] * 665 * k });
    });
    { const t = S('wheel_arrow'), [x, y] = at(3.33, 3053.68); if (t) img(t, x, y, { w: t.u[0] * 665 * k, h: t.u[1] * 665 * k }); }
    { const [x, y] = at(0, 3330); text('Rueda de Juguete', x, y, 330 * k, { fill: '#ffffff', stroke: '#1f5d8c', sw: 55 * k }); }
    const label = st.done ? 'Reclamar' : 'Detener', [bx, by] = at(0, -3224);
    if (!st.spinning || st.done) text(label, bx, by, 330 * k, { fill: '#ffffff', stroke: '#2c7a12', sw: 55 * k });
    else { const t = text(label, bx, by, 330 * k, { fill: '#ffffff', stroke: '#2c7a12', sw: 55 * k }); if (t) t.alpha = 0.5; }
    root = prev;
    const act = () => { if (st.done) D.finish(); else if (!st.spinning) W.spin(); };
    E.hotspot('gl_wheel', (bx - 2290 * k - cx) * sc + cx, (by - 600 * k - cy) * sc + cy, 4580 * k * sc, 1200 * k * sc, act);
    return true;
  }
  const emoTex = new Map();
  function emojiTex(ch) { let t = emoTex.get(ch); if (!t) { t = PIXI.Texture.from(E.emojiSprite(ch, 128)); emoTex.set(ch, t); } return t; }
  // filas de las ventanas de premio, misiones y logros: el fondo amarillo de Toy Blast (inner_panel_yellow_slice) con su
  // texto, una barra de progreso y su icono o la marca verde
  function rowPanel(o, y0, h) { const [x, y] = o.at(-2.75, y0 - 0.05); const t = tex('inner_panel_yellow_slice'); if (t) nine(t, x, y, 5.5 * o.k, (h - 0.1) * o.k, (o.k * 0.55) / 100 * 100 / 100 * 0.55); }
  function bar(o, ux, uy, w, frac, label) {
    const [x, y] = o.at(ux, uy), g = gfx(), H = 0.36 * o.k;
    g.beginFill(0x24505c); g.drawRoundedRect(x, y - H / 2, w * o.k, H, H / 2); g.endFill();
    if (frac > 0) { g.beginFill(0x7ad332); g.drawRoundedRect(x + 0.04 * o.k, y - H / 2 + 0.04 * o.k, Math.max(H - 0.08 * o.k, (w * o.k - 0.08 * o.k) * frac), H - 0.08 * o.k, (H - 0.08 * o.k) / 2); g.endFill(); }
    text(label, x + (w * o.k) / 2, y, 0.26 * o.k, { fill: '#ffffff', stroke: '#1d3a40', sw: 0.05 * o.k });
  }
  const MORE = {
    reward: (pop, R) => {
      const n = R.icons.length, rows = [{ text: NOEMO(R.sub) }];
      if (n) rows.push({ h: 1.6, draw: (o) => R.icons.forEach((ic, i) => { const [x, y] = o.at((i - (n - 1) / 2) * 1.5, o.top - 0.8), d = 1.25 * o.k; img('Default-prelevel_option_back', x, y, { w: d * 1.24, h: d, ax: 0.5, ay: 0.5 }); img(emojiTex(ic), x, y, { w: d * 0.8, h: d * 0.8, ax: 0.5, ay: 0.5 }); }) });
      rows.push({ label: '¡Estupendo!', fn: R.ok, id: 'gl_rw_ok' });
      return tbPanel(pop, NOEMO(R.title), rows, R.ok);
    },
    missions: (pop, M) => tbPanel(pop, 'Misiones', M.items().map((q) => ({ h: 1.25, draw: (o) => {
      rowPanel(o, o.top, o.h);
      const [tx, ty] = o.at(-2.45, o.top - 0.38); text(NOEMO(q.name), tx, ty, 0.34 * o.k, { fill: '#7a4a1e', ax: 0 });
      bar(o, -2.45, o.top - 0.85, 3.6, Math.max(0, Math.min(1, q.v / q.k)), q.v + '/' + q.k);
      const [ix, iy] = o.at(2.05, o.top - 0.6); if (q.done) img('GoalPanel-popup_goal_check', ix, iy, { w: 0.7 * o.k, h: 0.7 * o.k }); else img('Popups-item_tnt', ix, iy, { w: 0.75 * o.k, h: 0.75 * o.k });
    } })), M.close),
    album: (pop, A) => tbPanel(pop, 'Logros', A.items().map((q) => ({ h: 1.15, draw: (o) => {
      const full = q.t >= q.tiers.length, next = q.tiers[Math.min(q.t, q.tiers.length - 1)];
      rowPanel(o, o.top, o.h);
      const [sx, sy] = o.at(-2.2, o.top - 0.57); img('Popups-PreLevel-prelevel_star', sx, sy, { w: 0.8 * o.k, h: 0.77 * o.k, alpha: q.t ? 1 : 0.35 }); if (q.t) text(String(q.t), sx, sy + 0.05 * o.k, 0.3 * o.k, { fill: '#ffffff', stroke: '#7a4a1e', sw: 0.05 * o.k });
      const [tx, ty] = o.at(-1.65, o.top - 0.33); text(NOEMO(q.name) + ': ' + q.value, tx, ty, 0.3 * o.k, { fill: '#7a4a1e', ax: 0 });
      bar(o, -1.65, o.top - 0.8, 4.2, full ? 1 : Math.max(0, Math.min(1, q.value / next)), full ? '¡Completo!' : q.value + '/' + next);
    } })), A.close),
    pad: (pop, K) => tbPanel(pop, 'Ir al nivel', [
      { h: 1.0, draw: (o) => { rowPanel(o, o.top, 0.9); const [x, y] = o.at(0, o.top - 0.45); text(K.val() || '—', x, y, 0.55 * o.k, { fill: '#7a4a1e' }); } },
      { h: 4.6, draw: (o) => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach((key, i) => {
        const ux = ((i % 3) - 1) * 1.55, uy = o.top - 0.6 - Math.floor(i / 3) * 1.13, [x, y] = o.at(ux, uy), t = tex(key === '⌫' ? 'button_mid_red_slice' : 'button_mid_green_slice');
        if (t) nine(t, x - 0.68 * o.k, y - 0.5 * o.k, 1.36 * o.k, 1.0 * o.k, (o.k * 0.5) / 55 * 0.55);
        text(key === '⌫' ? 'Borrar' : key, x, y - 0.03 * o.k, (key.length > 1 ? 0.3 : 0.48) * o.k, { fill: '#ffffff', stroke: key === '⌫' ? '#8a1d10' : '#2c7a12', sw: 0.07 * o.k });
        o.hs(ux, uy, 1.36, 1.0, () => K.press(key), 'gl_lp' + i);
      }) },
      { label: 'Cancelar', red: true, fn: K.cancel, id: 'gl_lp_x' }], K.cancel),
  };
  const WINDOWS = {
    pause: (pop, d) => tbPanel(pop, 'Ajustes', [{ label: 'Seguir jugando', fn: d.resume, id: 'gl_resume' }, { label: 'Ajustes', fn: d.settings, id: 'gl_settings' }, { label: 'Salir al mapa', red: true, fn: d.leave, id: 'gl_leave' }, { small: 'Versión ' + (d.version || 'de la app') }], d.resume),
    exit: (pop, d) => tbPanel(pop, '¿Abandonar nivel?', [{ label: 'Abandonar', red: true, fn: d.leave, id: 'gl_leave' }], d.stay),
    settings: (pop, d) => tbPanel(pop, 'Ajustes', d.opts.map((o, i) => ({ label: NOEMO(o.name) + ': ' + o.val(), fn: o.act, id: 'gl_opt' + i })), d.close),
    info: (pop, d) => tbPanel(pop, NOEMO(d.title), [{ text: NOEMO(d.text) }, { label: 'Vale', fn: d.ok, id: 'gl_ok' }], d.ok),
    daily: (pop, d) => dailyWheel(pop, d),
    ...MORE,
  };
  // ---------------------------------------------------------------- barras del mapa (pantalla principal de Toy Blast)
  // Arriba PageUi-Common-top_panel con el cofre de estrellas (Badges-Starchest_base y su barra) y los ajustes; abajo
  // PageUi-Common-bottom_panel con sus pestañas (inicio = el mapa, eventos = desafío semanal, equipo = misiones,
  // clasificación = logros) y, encima, el botón verde del nivel. El camino del mapa sigue debajo, en 2D
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
  // mapa de Cubos HD: el fondo de cada mundo de Toy Blast (map_N), puntitos crema entre niveles y discos con su aro
  const MAPSTYLE = {
    bg(M, zoneH, z0) { for (let z = z0 - 1; z <= z0 + 1; z++) { if (z < 0) continue; const zy = -z * zoneH - zoneH + M.scroll + E.H, t = looseTex('map_' + ((z % 12) + 1) + '.jpg'); if (t) coverZone(t, zy, zoneH); } },
    path(M) {
      const g = gfx();
      for (let i = M.first; i < M.last; i++) { const p = M.pos(i), q = M.pos(i + 1); for (let k = 1; k < 5; k++) { const t = k / 5, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t; g.beginFill(0x000000, 0.25); g.drawEllipse(x, y, 9, 6); g.endFill(); g.beginFill(0xf3e2b8); g.drawEllipse(x, y - 2, 9, 6); g.endFill(); } }
    },
    node(M, i, x, y, r, cur, done, hd, stars) {
      const base = cur ? '#ff8a1f' : hd === 2 ? '#6a2f9a' : hd === 1 ? '#d8352f' : done ? '#2f7f8f' : '#5d6a72', g = gfx();
      g.beginFill(0x000000, 0.3); g.drawEllipse(x, y + r * 0.85, r * 0.95, r * 0.3); g.endFill();
      if (cur) { g.beginFill(0xffdc78, 0.35); g.drawCircle(x, y, r + 10 + Math.sin(E.t * 4) * 3); g.endFill(); }
      g.beginFill(0xf3e2b8); g.drawCircle(x, y, r); g.endFill();
      g.beginFill(shadeHex(base, -0.4)); g.drawCircle(x, y, r - 5); g.endFill();
      g.beginFill(PIXI.utils.string2hex(base)); g.drawCircle(x, y - 2, r - 7); g.endFill();
      g.beginFill(shadeHex(base, 0.3), 0.7); g.drawEllipse(x, y - r * 0.35, (r - 9) * 0.8, (r - 9) * 0.45); g.endFill();
      text(String(i), x, y, i > 999 ? 22 : 27, { fill: '#ffffff', stroke: '#' + shadeHex(base, -0.55).toString(16).padStart(6, '0'), sw: 5 });
      if (hd && !done) { img('Hard-skull', x + r * 0.8, y - r * 0.8, { w: 32, h: 32, ax: 0.5, ay: 0.5 }); if (hd === 2) img('Hard-skull', x - r * 0.8, y - r * 0.8, { w: 32, h: 32, ax: 0.5, ay: 0.5 }); }
      if (done) { const gs = gfx(); for (let k = 0; k < 3; k++) starG(gs, x + (k - 1) * 22, y - r - 4 + (k === 1 ? -6 : 0), 11, k < stars ? '#ffd23f' : '#9aa3ad', '#7a4b00'); }
      if (cur) { const t = tex('topbar_amy') || emojiTex(M.mascot); if (t) { const h = 60, w = (t.orig ? t.orig.width / t.orig.height : 1) * h; img(t, x - r - w / 2 - 4, y - 6, { w, h, ax: 0.5, ay: 0.5 }); } }
    },
  };
  GL.mapChrome = function (H) {
    if (!on()) return false;
    const P = E.popup; if (P && !(P.pre || P.lost || P.win || (P.gl && (WINDOWS[P.gl.kind])))) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const s = E.W / 1080, th = 150 * s, bh = 190 * s, by = E.H - bh;
    nine('PageUi-Common-top_panel', 0, 0, E.W, th, s * 1.2);
    // cofre de estrellas
    { const [x, y] = [95 * s, th / 2]; img('Badges-Starchest_base', x, y, { w: 120 * s, h: 131 * s, ax: 0.5, ay: 0.5 });
      const bx = 165 * s, bw = 300 * s, bhh = 46 * s, g = gfx(); g.beginFill(0x1d3a40, 0.85); g.drawRoundedRect(bx, y - bhh / 2, bw, bhh, bhh / 2); g.endFill();
      const k2 = Math.max(0, Math.min(1, H.chest / H.CHEST)); if (k2 > 0) { const t = tex('Badges-Starchest_bar'); if (t) img(t, bx + 4 * s, y, { w: (bw - 8 * s) * k2, h: bhh - 8 * s, ax: 0, ay: 0.5 }); }
      text(H.chest + '/' + H.CHEST, bx + bw / 2, y, 34 * s, { fill: '#ffffff', stroke: '#1d3a40', sw: 6 * s });
      E.hotspot('gl_m_chest', 20 * s, 0, 480 * s, th, H.album); }
    if (H.streak) text('Racha ' + H.streak, 640 * s, th / 2, 40 * s, { fill: '#f7d548', stroke: '#2a3a28', sw: 7 * s });
    // ajustes: el engranaje de la partida de Toy Blast
    { const x = E.W - 85 * s, y = th / 2; const t = tex('BottomUi-gameplay_booster_settings_button_default'); if (t) img(t, x, y, { w: t.orig.width * s * 0.9, h: t.orig.height * s * 0.9, ax: 0.5, ay: 0.5 }); E.hotspot('gl_m_set', x - 70 * s, 0, 140 * s, th, H.settings); }
    if (H.fiesta) { const x = E.W - 190 * s, y = th + 70 * s, w = 340 * s, h = 100 * s; nine(H.fiesta.done ? 'button_mid_red_slice' : 'button_mid_green_slice', x - w / 2, y - h / 2, w, h, s * 0.6); text(H.fiesta.done ? '¡Hecho!' : 'Nivel especial', x, y - 3 * s, 36 * s, { fill: '#ffffff', stroke: '#2a3a28', sw: 6 * s }); E.hotspot('gl_m_fi', x - w / 2, y - h / 2, w, h, H.openFiesta); }
    // botón del nivel
    { const w = 560 * s, h = 165 * s, x = E.W / 2, y = by - 120 * s; nine('Default-button_background', x - w / 2 - 25 * s, y - h / 2 - 20 * s, w + 50 * s, h + 40 * s, s); nine('button_338', x - w / 2, y - h / 2, w, h, s);
      text('Nivel ' + H.level, x, y - 6 * s, 64 * s, { fill: '#ffffff', stroke: '#2c7a12', sw: 10 * s }); E.hotspot('gl_m_play', x - w / 2, y - h / 2, w, h, H.play); }
    // barra de abajo y sus pestañas
    nine('PageUi-Common-bottom_panel', 0, by, E.W, bh, s * 1.2);
    const tabs = [['home', 'Mapa', null, true, 0], ['events', 'Desafío', H.openWeekly, false, H.weekly && !H.weekly.done ? 1 : 0], ['team', 'Misiones', H.openMissions, false, H.missions], ['leaderboard', 'Logros', H.album, false, 0]];
    const tw = E.W / tabs.length;
    tabs.forEach(([n, label, cb, act, badge], i) => {
      const cx = tw * (i + 0.5), cy = by + bh * 0.42;
      if (act) img('PageUi-BottomBar-indicator_green', cx, cy, { w: 170 * s, h: 174 * s, ax: 0.5, ay: 0.5 });
      img('PageUi-BottomBar-' + n + '_shadow', cx, cy + 6 * s, { ax: 0.5, ay: 0.5, w: tex('PageUi-BottomBar-' + n + '_shadow') ? tex('PageUi-BottomBar-' + n + '_shadow').orig.width * s * 1.1 : 0, h: tex('PageUi-BottomBar-' + n + '_shadow') ? tex('PageUi-BottomBar-' + n + '_shadow').orig.height * s * 1.1 : 0 });
      const t = tex('PageUi-BottomBar-' + n); if (t) img(t, cx, cy, { w: t.orig.width * s * 1.1, h: t.orig.height * s * 1.1, ax: 0.5, ay: 0.5 });
      text(label, cx, by + bh * 0.84, 32 * s, { fill: act ? '#f7d548' : '#ffffff', stroke: '#1d3a40', sw: 6 * s });
      if (badge) { const g = gfx(); g.beginFill(0xe8322b); g.lineStyle(4 * s, 0xffffff); g.drawCircle(cx + 50 * s, cy - 45 * s, 24 * s); g.endFill(); text(String(badge), cx + 50 * s, cy - 45 * s, 30 * s, { fill: '#ffffff' }); }
      if (cb) E.hotspot('gl_m_tab' + i, tw * i, by, tw, bh, cb);
    });
    return true;
  };
  GL.popup = function (pop) {
    if (!on()) return false;
    if (pop.pre) return preLevel(pop);
    if (pop.lost) return lostLevel(pop);
    if (pop.gl && WINDOWS[pop.gl.kind]) return WINDOWS[pop.gl.kind](pop, pop.gl);
    if (pop.win) return winScreen(pop);
    return false;
  };

  // ---------------------------------------------------------------- efectos encima de todo (los mueve el motor)
  GL.fxOn = () => on() && usedThisFrame;
  const imgTex = new Map(), shapeTex = {};
  function texOf(im, fr) {
    let base = imgTex.get(im); if (!base) { base = PIXI.Texture.from(im); imgTex.set(im, base); if (imgTex.size > 300) imgTex.delete(imgTex.keys().next().value); }
    if (!fr) return base;
    const key = '_fr' + fr.join(','); if (base[key]) return base[key];
    const fw = base.width / fr[0], fh = base.height / fr[1];
    return (base[key] = new PIXI.Texture(base.baseTexture, new PIXI.Rectangle((fr[2] % fr[0]) * fw, Math.floor(fr[2] / fr[0]) * fh, fw, fh)));
  }
  function shape(kind) {
    if (shapeTex[kind]) return shapeTex[kind];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff';
    if (kind === 'circle') { g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); } else if (kind === 'star') E.star(g, 32, 32, 30, '#fff'); else g.fillRect(0, 0, 64, 64);
    return (shapeTex[kind] = PIXI.Texture.from(c));
  }
  const hexCache = new Map();
  function hexOf(col) {
    let v = hexCache.get(col); if (v != null) return v;
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(col || '');
    v = m ? parseInt(m[1].length === 3 ? m[1].replace(/./g, (ch) => ch + ch) : m[1], 16) : 0xffffff;
    hexCache.set(col, v); return v;
  }
  GL.fx = function (cmds) { for (const c of cmds) try { fxOne(c); } catch (e) { /* un efecto raro no debe parar el juego */ } };
  function fxOne(c) {
    if (c.text) { text(c.text, c.x, c.y, c.size, { fill: c.color, stroke: 'rgba(60,30,10,0.75)', sw: Math.max(2, c.size * 0.2), alpha: c.alpha }); return; }
    if (c.im) {
      const t = texOf(c.im, c.fr), ch = (v) => Math.max(0, Math.min(255, v | 0)), tn = c.tint ? (ch(c.tint[0]) << 16) | (ch(c.tint[1]) << 8) | ch(c.tint[2]) : 0xffffff;
      img(t, c.x, c.y, { w: c.w, h: c.h, ax: 0.5, ay: 0.5, rot: c.rot, alpha: c.alpha, tint: tn, add: c.blend === 'add' });
      return;
    }
    if (c.shape === 'img' && c.img) {
      const base = texOf(c.img), iw = base.width, ih = base.height, key = '_q' + c.q;
      const t = base[key] || (base[key] = new PIXI.Texture(base.baseTexture, new PIXI.Rectangle(iw * (0.15 + (c.q % 2) * 0.36), ih * (0.15 + ((c.q / 2) | 0) * 0.36), iw * 0.34, ih * 0.34)));
      img(t, c.x, c.y, { w: c.s, h: c.s, ax: 0.5, ay: 0.5, rot: c.rot, alpha: c.alpha });
      return;
    }
    const sq = !c.shape || c.shape === 'sq';
    img(shape(sq ? 'sq' : c.shape), c.x, c.y, { w: c.s, h: sq ? c.s * 0.7 : c.s, ax: 0.5, ay: 0.5, rot: c.rot, alpha: c.alpha, tint: hexOf(c.color) });
  }
  GL.frameEnd = function () {
    if (!app) return;
    const z = usedThisFrame && !playedThisFrame ? '2' : '0'; if (view.style.zIndex !== z) view.style.zIndex = z;
    if (usedThisFrame) { if (view.style.display === 'none') view.style.display = 'block'; app.renderer.render(app.stage); shownFrames++; }
    else if (view.style.display !== 'none') view.style.display = 'none';
    usedThisFrame = false; playedThisFrame = false;
  };
})();
