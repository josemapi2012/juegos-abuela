// "Rescate Animal HD": la pantalla de juego dibujada con WebGL (PixiJS), copiando el Pet Rescue real.
// Medidas sacadas de capturas del juego en el emulador (1080×1920) y piezas de sus atlas (tools/gl_export.py →
// privado/mascotas/gl/). Las reglas siguen en game.js; aquí solo se dibuja. El motor llama a:
//   GL.resize(lienzo, dpr) · GL.layout() · GL.boardLayout(C, R, área) · GL.play(estado) · GL.frameEnd()
// Si no hay WebGL o las piezas no han cargado, GL.play devuelve false y se dibuja como siempre (Canvas 2D).
(function () {
  const GL = (window.GL = {});
  let app = null, view = null, root = null, ready = false, failed = false, usedThisFrame = false, shownFrames = 0;
  const atlases = {}; // nombre → { k, base: [BaseTexture], frames }
  const texCache = new Map(); // 'atlas:pieza' → Texture
  const ATLASES = ['hud', 'blocks', 'boosters', 'levelmenu', 'decorations', 'petui', 'petui2', 'popups', 'nomap', 'constraints', 'particles', 'petsatlas', 'settingsbg', 'miniquest', 'dailygift', 'navbar', 'endgame_dog', 'endgame_pig'];
  const REF = 1080; // ancho de las capturas de referencia: las medidas de abajo van en sus píxeles
  const px = (v) => (v * E.W) / REF; // píxeles de la captura → unidades del juego (600 de ancho)

  const glOk = (() => { try { const c = document.createElement('canvas'); return !!(window.PIXI && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } })();
  // pantalla de carga de Pet Rescue (loading_screen/initial_loading_screen: degradado de King, su logo y la rueda)
  GL.carga = { color: '#f06a00', fondo: { f: 'fondo.png' }, piezas: [{ f: 'logo1.png', x: 0.5, y: 0.43, w: 0.5 }, { f: 'giro.png', x: 0.5, y: 0.66, w: 0.12, anim: 'giro' }] };
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
    let left = ATLASES.length + 3;
    const xd = new XMLHttpRequest(); xd.open('GET', base + 'deco.json'); // decoraciones de los niveles reales (tools/gl_deco.py)
    xd.onload = () => { try { DECO = JSON.parse(xd.responseText); } catch (e) { console.warn('decoraciones', e); } if (--left === 0) ready = true; };
    xd.onerror = () => { if (--left === 0) ready = true; };
    xd.send();
    const xs = new XMLHttpRequest(); xs.open('GET', base + 'scenes.json'); // escenas y animaciones de King (tools/king_scene.py)
    xs.onload = () => { try { SCN = JSON.parse(xs.responseText); } catch (e) { console.warn('escenas', e); } if (--left === 0) ready = true; };
    xs.onerror = () => { if (--left === 0) ready = true; };
    xs.send();
    const xp = new XMLHttpRequest(); xp.open('GET', base + 'pets.json'); // mascotas 3D (tools/gl_pets.py)
    xp.onload = () => { try { PETDATA = decodePets(JSON.parse(xp.responseText)); } catch (e) { console.warn('mascotas 3D', e); } if (--left === 0) ready = true; };
    xp.onerror = () => { if (--left === 0) ready = true; };
    xp.send();
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
    const k = t.k || 1;
    let p = pools.nine[nNine]; if (!p) { p = pools.nine[nNine] = new PIXI.NineSlicePlane(t); } nNine++;
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

  // fichas: el dibujo de siempre de cada ficha (drawTile del juego) pasado una vez a textura y movido aquí
  const tileTex = new Map();
  const DYN = new Set(['gx', 'gy', 'vy', 'sc', 'alpha', 'rot', 'oy', 'delay', 'hidden', 'bt', 'id', 'x', 'y', 'tx', 'ty', 'sel', 'wait']);
  function tileKey(t) { let k = ''; for (const n in t) { const v = t[n]; if (!DYN.has(n) && (typeof v !== 'object' || v === null)) k += n + '=' + v + ';'; } return k; }
  function tileTexture(st, t) {
    const anim = t.kind === 'pet' || (t.kind === 'cage'); // las mascotas se mueven: se pintan cada fotograma
    const key = anim ? 'anim' + t.id : tileKey(t) + '@' + Math.round(st.ts);
    let e = tileTex.get(key);
    const S = Math.ceil(st.ts * 1.7 * E.scale);
    if (!e) {
      const c = document.createElement('canvas'); c.width = c.height = S;
      e = { c, t: PIXI.Texture.from(c), drawn: false }; tileTex.set(key, e);
      if (tileTex.size > 600) { for (const [kk, v] of tileTex) { if (kk.startsWith('anim')) continue; v.t.destroy(true); tileTex.delete(kk); if (tileTex.size < 400) break; } }
    }
    if (!e.drawn || anim) {
      const g = e.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
      g.setTransform(E.scale, 0, 0, E.scale, S / 2, S / 2);
      const o = [t.sc, t.alpha, t.rot]; t.sc = 1; t.alpha = 1; t.rot = 0;
      st.drawTile(g, t, 0, 0, st.ts);
      t.sc = o[0]; t.alpha = o[1]; t.rot = o[2];
      e.t.baseTexture.update(); e.drawn = true;
    }
    return e.t;
  }

  // ---------------------------------------------------------------- medidas (las de Pet Rescue)
  // cabecera: banda turquesa (0–92 px) y banda crema (92–232 px); abajo, los potenciadores
  const HUD_H = 232, BAR_H = 420; // abajo: los potenciadores y, encima, el cohete recargable (a 330 px del borde)
  GL.layout = () => (on() ? { top: px(HUD_H), bottom: px(BAR_H) } : null);
  // casilla de 114×104 px: caben 9 columnas en el 95 % del ancho; tablero centrado al 49 % del alto
  GL.boardLayout = (C, R, area) => {
    if (!on()) return null;
    let tsx = px(114), tsy = px(104);
    const maxBottom = E.H - px(520); // el gato del cohete asoma ~190 px sobre su barra (a 330 del borde): el tablero acaba encima (en la tablet hay menos alto)
    const maxH = Math.min(E.H * 0.72, area.h - px(30), maxBottom - area.y - px(40)), maxW = E.W * 0.97;
    if (R * tsy > maxH) { const k = maxH / (R * tsy); tsx *= k; tsy *= k; } // si no caben las filas del nivel, casillas algo menores
    if (C * tsx > maxW) { const k = maxW / (C * tsx); tsx *= k; tsy *= k; } // ni las columnas (niveles de 10)
    const V = R;
    const x = (E.W - tsx * C) / 2;
    let y = E.H * 0.49 - (V * tsy) / 2;
    y = Math.max(area.y + px(40), Math.min(y, area.y + area.h - V * tsy, maxBottom - V * tsy));
    return { tsx, tsy, V, x, y, rackY: E.H - px(330), rocketX: E.W / 2 };
  };
  GL.resize = function (cv, dpr) {
    ensureApp(cv); if (!app) return;
    view.style.width = cv.style.width; view.style.height = cv.style.height; view.style.left = cv.style.marginLeft || '0';
    app.renderer.resolution = dpr; app.renderer.resize(cv.width / dpr, cv.height / dpr);
    root.scale.set(E.scale / dpr);
  };

  // ---------------------------------------------------------------- pantalla de juego
  // avisos de la partida: el de turno (por turnos con otra persona) en una cápsula bajo la cabecera y el de qué tocar
  // (potenciador elegido o "¿qué es esto?") en el bocadillo de las pistas de Pet Rescue (tooltip_base y su pico)
  function drawNotices(st, B) {
    const top = GL.layout().top;
    if (st.duo) {
      const D = st.duo, w = px(760), h = px(84), x = E.W / 2 - w / 2, y = top + px(14);
      nine('petui2:counter_bg', x, y, w, h, [24, 24, 24, 24], { inset: 0.6, tint: D.turn ? 0x2e8ff0 : 0xf0a400 });
      img('petui:ico_friends', x + px(56), y + h / 2, { w: px(92), h: px(70) });
      text('Turno de ' + D.name + '  ·  ' + D.score[0] + ' – ' + D.score[1], E.W / 2 + px(30), y + h / 2, px(42), { fill: '#ffffff', stroke: D.turn ? '#14508f' : '#8a5a00', sw: px(5) });
    }
    if (st.prompt) {
      const w = px(940), h = px(120), x = E.W / 2 - w / 2, y = top + (st.duo ? px(120) : px(20)) + Math.sin(E.t * 3) * px(4);
      nine('petui2:tooltip_base', x, y, w, h, [30, 28, 30, 28], { inset: 0.6 });
      img('petui2:tooltip_pointer', E.W / 2, y + h + px(14), { w: px(56), h: px(40), flipY: true });
      text(st.prompt, E.W / 2, y + h / 2, px(46), { fill: '#1a2c6b' });
    }
  }
  GL.play = function (st) {
    if (!on() || !st.P || !st.P.glState) return false;
    usedThisFrame = true; playedThisFrame = true;
    begin();
    const B = st.P.glState(); B.n = st.n;
    drawBackground(B);
    if (E.popup && (E.popup.win || E.popup.lost) && E.popup.anim > 0.5) return true; // ventana de ganar: el tablero se va, queda el fondo
    drawBoard(B);
    drawPops();
    drawRocketAim(st, B);
    const fin = (B.endSeq && B.endSeq.t1) || (E.popup && E.popup.win); // en la secuencia final se van la cabecera y los potenciadores (queda el cohete), y no vuelven al salir la ventana
    if (!fin) { drawHud(st, B); drawNotices(st, B); }
    if (B.rocketAim) drawAimButtons(st);
    else { if (!fin) withHand(() => drawBoosters(st)); drawRack(st, B); }
    if (B.intro) drawIntro(B.intro);
    if (B.endSeq) drawEndSeq(B.endSeq);
    if (window.GLDEBUG && PETDATA) { // para revisar una mascota en grande: GLDEBUG = { pet: '🐱', sc: 6, anim: 'game_idle_1' }
      const D = window.GLDEBUG, t = D.t || (D.t = { kind: 'pet', pet: D.pet, id: -1, vy: 0 });
      t.pet = D.pet; const st0 = petState.get(-1); if (st0 && D.anim) { st0.anim = D.anim; st0.dur = 1e9; }
      const g0 = gfx(); g0.beginFill(0x88aa88); g0.drawRect(0, E.H * 0.25, E.W, E.H * 0.5); g0.endFill();
      const m = petMesh(t, E.W / 2, E.H * 0.7, D.sc || 6, 1, Object.assign({}, B, { dying: [] }));
      if (m) { root.addChild(m.shadow); root.addChild(m.mesh); root.addChild(m.face); }
    }
    return true;
  };
  let playedThisFrame = false;
  // ---------------------------------------------------------------- puntos que saltan (escena scorepop_item de Pet Rescue)
  // Letra Scorepop (números blancos con borde, a escala 2,445·1,5) teñida; medido en el vídeo del juego real al rescatar
  // una mascota: "+1000" amarillo de unos 60 de alto que sube unas 75 unidades por segundo y se apaga en los últimos 0,6 s
  let SPF = null, spTex = null;
  const pops = [];
  function loadScorepop() {
    if (SPF !== null) return; SPF = false;
    const base = E.privBase() + 'gl/', x = new XMLHttpRequest(); x.open('GET', base + 'scorepop.json');
    x.onload = () => { try { SPF = JSON.parse(x.responseText); spTex = PIXI.BaseTexture.from(base + 'scorepop.webp'); } catch (e) { SPF = false; } };
    x.send();
  }
  GL.scorePop = function (x, y, str, tint) { if (!on()) return false; loadScorepop(); pops.push({ x, y, str, tint: tint || 0xffd83c, t0: E.t }); return true; };
  function drawPops() {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i], t = E.t - p.t0;
      if (t > 1.6 || t < -0.1) { pops.splice(i, 1); continue; }
      if (!SPF || !spTex || !spTex.valid) continue;
      const sc = (px(82) / 52) * (t < 0.1 ? 0.8 + 2 * t : 1), a = t > 1 ? 1 - (t - 1) / 0.6 : 1, y = p.y - px(75) * t;
      let w = 0; for (const ch of p.str) { const c = SPF.chars[ch]; if (c) w += c[6]; }
      let cx = p.x - (w * sc) / 2;
      for (const ch of p.str) {
        const c = SPF.chars[ch]; if (!c) continue;
        const k = 'sp' + ch; let tx = texCache.get(k); if (!tx) { tx = new PIXI.Texture(spTex, new PIXI.Rectangle(c[0], c[1], c[2], c[3])); texCache.set(k, tx); }
        img(tx, cx + c[4] * sc, y + (c[5] - 50) * sc, { w: c[2] * sc, h: c[3] * sc, ax: 0, ay: 0, alpha: a, tint: p.tint });
        cx += c[6] * sc;
      }
    }
  }
  // ---------------------------------------------------------------- franja de objetivos al empezar (como Pet Rescue)
  // cutscenes/target_scene: plantilla horizontal_panel_base_slim (bundle_panel teñido 52,192,232 de 1920×260, dos
  // panel_gradient_overlay teñidos 119,216,243 de 960 hacia cada lado y, detrás, bundle_back de 1940×280) a escala 0,13;
  // textos blancos con sombra. Entra con pregameIn (baja desde 160 unidades por encima) y sale con pregameOut (sube).
  // Medido en el vídeo del juego real: la franja ocupa el 21,7 % del alto, centrada al 47,5 %.
  const PRE_IN = [[0, -160], [0.067, -153.9], [0.133, -137.7], [0.2, -114.1], [0.267, -86.1], [0.333, -56.6], [0.4, -28.5], [0.467, -4.7], [0.5, 0], [0.567, -2.6], [0.633, -2.6], [0.7, -1.6], [0.783, -2]];
  const PRE_OUT = [[0, -2], [0.1, -1.3], [0.2, -0.1], [0.3, 1], [0.367, 1.4], [0.4, 0.6], [0.433, -5.5], [0.467, -16.7], [0.5, -31.8], [0.533, -49.7], [0.567, -69.2], [0.6, -89.4], [0.633, -108.9], [0.667, -126.8], [0.7, -141.9], [0.733, -153.1], [0.783, -160]];
  function drawIntro(I) {
    const t = E.t - I.t0, T = 2.9, bh = E.H * 0.217, u = bh / 36.4;
    const y = t < 0.783 ? keys(PRE_IN, t) : t > T - 0.783 ? keys(PRE_OUT, t - (T - 0.783)) : -2;
    const cyb = E.H * 0.475 + (y + 2) * u;
    if (cyb < -bh) return;
    const ph = bh * 260 / 280, W = 1920 * 0.13 * u; // más ancha que la pantalla: las esquinas redondas quedan fuera
    nine('petui:bundle_back', E.W / 2 - (W * 1940 / 1920) / 2, cyb - bh / 2, W * 1940 / 1920, bh, [40, 40, 40, 40], { inset: (bh * 80 / 280) / 80 });
    nine('petui:bundle_panel', E.W / 2 - W / 2, cyb - ph / 2, W, ph, [40, 40, 40, 40], { inset: (ph * 80 / 260) / 80, tint: 0x34c0e8 });
    for (const sx of [-1, 1]) { // degradados hacia cada lado desde el centro
      const g = img('petui:panel_gradient_overlay', E.W / 2, cyb, { w: W / 2, h: ph, ax: 1, ay: 0.5, tint: 0x77d8f3, flipX: sx > 0 });
      if (g && sx > 0) g.anchor.set(1, 0.5);
    }
    const L = I.lines, lh = E.H * 0.06, y0 = cyb - ((L.length - 1) * lh) / 2 - E.H * 0.004;
    L.forEach((s, i) => text(s, E.W / 2, y0 + i * lh, px(84), { fill: '#ffffff', stroke: 'rgba(0,0,0,0)', sw: 0, shadow: true }));
  }
  // ---------------------------------------------------------------- final del nivel (como Pet Rescue)
  // 1) "¡Mascotas rescatadas!" (cutscenes/pets_rescued_scene: texto amarillo con sombra, animaciones fancy_scalein y
  //    fancy_scaleout a velocidad 0,6·2,5; la nube es el efecto "pets_smoke", que lanza game.js).
  // 2) end_level_sequence con end_level_sequence_timeline: velo negro (alfa 0 → 50 → 120), cinco bloques que salen
  //    volando girando 180°, el perro y el cerdo (Spine 3.7, animación "animation" a velocidad 1,4) y "¡Nivel
  //    completado!" (blanco con contorno azul, animación booster_scale_down). Unidades del AnimationLayout: 1018×669 a
  //    escala uniforme que cubre la pantalla (en vertical manda el alto; el perro mide así lo que en el vídeo del juego
  //    real); la y de King va hacia arriba.
  const FANCY_IN = [[0, 0], [0.1, 0.15], [0.2, 0.493], [0.3, 0.865], [0.35, 1.012], [0.4, 1.105], [0.433, 1.127], [0.5, 1.049], [0.567, 0.917], [0.633, 0.964], [0.683, 1]];
  const SCALE_DOWN = [[0, 1.3], [0.05, 1.354], [0.15, 1.257], [0.2, 1.136], [0.25, 0.967], [0.267, 0.9], [0.283, 0.96], [0.317, 1]];
  function keys(K, t) { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return K[K.length - 1][1]; }
  // bloques: [pieza, escala, x final, y final, giro final en grados]
  const END_BLOCKS = [['common_blue_0', 0.8, 900, 200, 180], ['common_green_0', 1, -100, -1000, 180], ['common_yellow_0', 1, 800, -300, 180], ['common_red_0', 1, -1000, 500, 180], ['common_purple_0', 1, 300, 2000, 180]];
  const endSpines = {};
  const onTop = []; // piezas que van delante de las partículas (se suben al final del fotograma)
  function fitText(str, x, y, w, o, sc) { const t = text(str, x, y, px(60), o); if (!t) return; const k = (w / (t.width / t.scale.x)) * sc; t.scale.set(k); return t; }
  function drawEndSeq(Q) {
    const u = Math.max(E.W / 1018, E.H / 669), cx0 = E.W / 2, cy0 = E.H / 2;
    loadEndSpine(); // durante la primera parte, para tenerlos listos
    if (!Q.t1) { // "¡Mascotas rescatadas!"
      const t = E.t - Q.t0, sp = 0.6 * 2.5, out = 1.4; if (t < 0) return; // cutscenes/pets_rescued: fancy_scalein a 0 s y fancy_scaleout a 1,4 s
      const sc = t < out ? keys(FANCY_IN, t * sp) : Math.max(0, 1 - ((t - out) * sp) / 0.683);
      if (sc <= 0.01) return;
      onTop.push(fitText('¡Mascotas rescatadas!', cx0, E.H * 0.474, px(620), { fill: '#ffe11b', stroke: '#8a5f00', sw: px(3), shadow: true }, sc)); // delante de su humo
      return;
    }
    const t = E.t - Q.t1;
    const g = gfx(); const va = t < 0.154 ? (50 * t) / 0.154 : Math.min(120, 50 + (70 * (t - 0.154)) / (1.522 - 0.154));
    g.beginFill(0x000000, va / 255); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const k = Math.min(1, t / 2.15), e = 1 - (1 - k) * (1 - k); // easeOut cuadrático
    for (const [n, s, x, y, r] of END_BLOCKS) {
      const tx = tex('blocks:' + n); if (!tx || k >= 1) continue;
      const w = (tx.orig.width / (tx.k || 1)) * s * u;
      img(tx, cx0 + x * e * u, cy0 - y * e * u, { w, h: (w * tx.orig.height) / tx.orig.width, rot: (-r * e * Math.PI) / 180 });
    }
    if (t >= 0.153) for (const [n, x, s] of [['endgame_pig', 34, 0.41], ['endgame_dog', -55, 0.46]]) {
      let sp = endSpines[n];
      if (sp === undefined || (sp && sp.q !== Q)) { sp = newEndSpine(n); if (sp) { sp.q = Q; sp.state.setAnimation(0, 'animation', false); sp.last = E.t; } endSpines[n] = sp; }
      if (!sp) continue;
      sp.update(Math.max(0, Math.min(0.05, E.t - sp.last)) * 1.4); sp.last = E.t;
      sp.position.set(cx0 + x * u, cy0); sp.scale.set(s * u); root.addChild(sp);
    }
    fitText('¡Nivel completado!', cx0, E.H * 0.498, px(680), { fill: '#ffffff', stroke: '#3d80bc', sw: px(6) }, keys(SCALE_DOWN, t));
  }
  // Spine 3.7 del perro y el cerdo (pixi-spine runtime-3.7, solo en privado/ como en Dulces HD)
  const endSkel = {}, endSkelData = {};
  let endSpineLoading = false;
  function loadEndSpine() {
    if (endSpineLoading) return; endSpineLoading = true;
    const base = E.privBase() + 'gl/';
    const add = (src, cb) => { if (src === 'spine_base.js' && window.PIXI && PIXI.spine) { cb(); return; } const sc = document.createElement('script'); sc.src = base + src; sc.onload = cb; sc.onerror = () => {}; document.head.appendChild(sc); };
    add('spine_base.js', () => add('spine_37.js', () => {
      for (const n of ['endgame_dog', 'endgame_pig']) {
        const x = new XMLHttpRequest(); x.open('GET', base + n + '_skel.json');
        x.onload = () => { try { endSkel[n] = JSON.parse(x.responseText); } catch (e) { console.warn('spine', n, e); } };
        x.send();
      }
    }));
  }
  function newEndSpine(n) {
    if (endSkelData[n] === undefined) {
      const js = endSkel[n], A = atlases[n];
      if (!js || !A || !PIXI.spine || !PIXI.spine37) return null;
      try {
        const at = new PIXI.spine.TextureAtlas(); for (const f in A.frames) at.addTexture(f, tex(n + ':' + f));
        const c0 = document.createElement('canvas'); c0.width = c0.height = 2; const none = PIXI.Texture.from(c0);
        for (const sk in js.skins) for (const slot in js.skins[sk]) for (const a0 in js.skins[sk][slot]) { const a = js.skins[sk][slot][a0], nm = a.path || a.name || a0; if (!at.findRegion(nm)) at.addTexture(nm, none); }
        endSkelData[n] = new PIXI.spine37.SkeletonJson(new PIXI.spine37.AtlasAttachmentLoader(at)).readSkeletonData(js);
      } catch (e) { console.warn('spine', n, e); endSkelData[n] = false; }
    }
    if (!endSkelData[n]) return null;
    const sp = new PIXI.spine37.Spine(endSkelData[n]); sp.autoUpdate = false; return sp;
  }
  GL.loadEndSpine = loadEndSpine;
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
  GL.fx = function (cmds) {
    for (const c of cmds) try { fxOne(c); } catch (e) { /* un efecto raro no debe parar el juego */ }
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
    for (const o of onTop) if (o && o.parent === root) root.addChild(o);
    onTop.length = 0;
    if (usedThisFrame) { if (view.style.display === 'none') view.style.display = 'block'; app.renderer.render(app.stage); shownFrames++; }
    else if (view.style.display !== 'none') view.style.display = 'none';
    usedThisFrame = false; playedThisFrame = false;
  };

  // fondo: la escena nomap_tab_bg_default de Pet Rescue (vertical): el cielo (nomap_default_sky) arriba, a todo el ancho y
  // el 47 % del alto, y el prado ya desenfocado por King (nomap_bg_default_blured) al 86 % del alto, centrado en (50 %, 57 %)
  const loose = {};
  function looseTex(n) { if (!loose[n]) { loose[n] = PIXI.Texture.from(E.privBase() + 'gl/' + n); } return loose[n].baseTexture.valid ? loose[n] : null; }
  function drawBackground() {
    const sky = looseTex('bg_sky.webp'), base = looseTex('bg_blured.webp');
    const g = gfx(); g.beginFill(0x9fd2ec); g.drawRect(0, 0, E.W, E.H); g.endFill();
    if (sky) img(sky, E.W / 2, 0, { ax: 0.5, ay: 0, w: E.W, h: E.H * 0.47 });
    if (base) { const h = E.H * 0.86, w = (h * base.orig.width) / base.orig.height; img(base, E.W / 2, E.H * 0.57, { w: Math.max(w, E.W), h }); }
  }

  // tablero: fondo gris translúcido con el borde (oscuro, oliva, oscuro) que sigue la altura de cada columna
  const colTop = new Map(); // nivel → fila más alta de cada columna al empezar
  function boardShape(B) {
    const S = B.S, key = S;
    let tops = colTop.get(key);
    if (!tops) {
      tops = [];
      for (let c = 0; c < S.C; c++) { let r0 = S.R; for (let r = 0; r < S.R; r++) if (S.grid[r][c]) { r0 = r; break; } tops.push(r0); }
      colTop.clear(); colTop.set(key, tops);
    }
    return tops;
  }
  function drawBoard(B) {
    const { S, ts, tsy, bx, by, V, cam } = B;
    const tops = boardShape(B);
    const top = by, bottom = by + V * tsy, pad = px(14);
    // contorno escalonado: por cada columna su borde de arriba (las que empiezan más abajo dejan un hueco)
    const pts = [];
    const yTop = (c) => Math.max(top, by + (tops[c] - cam) * tsy) - pad;
    pts.push([bx - pad, bottom + pad]);
    for (let c = 0; c < S.C; c++) { const y = yTop(c); pts.push([bx + c * ts - (c === 0 ? pad : 0), y]); pts.push([bx + (c + 1) * ts + (c === S.C - 1 ? pad : 0), y]); }
    pts.push([bx + S.C * ts + pad, bottom + pad]);
    const path = roundedPath(pts, px(16));
    const g = gfx();
    g.beginFill(0x564e51, 0.62); g.drawPolygon(path); g.endFill();
    g.lineStyle({ width: px(9), color: 0x16140a, alpha: 1, join: 'round' }); g.drawPolygon(path);
    g.lineStyle({ width: px(4.5), color: 0xc1c188, alpha: 1, join: 'round' }); g.drawPolygon(path);
    drawDeco(B, B.n || 0, false);
    // hierba del suelo bajo la última fila
    const groundY = B.cy(S.R - 1) + tsy / 2;
    if (groundY <= bottom + 2) img('hud:ground', E.W / 2, groundY + px(6), { w: S.C * ts + pad * 2 + px(40), h: px(40) });
    // fichas
    const mask = gfx(); mask.beginFill(0xffffff); mask.drawRect(bx - pad, top - pad - tsy * 1.2, S.C * ts + pad * 2, V * tsy + pad * 2 + tsy * 1.2); mask.endFill();
    const tiles = new PIXI.Container(); tiles.mask = mask;
    const hset = B.hintTiles && B.hintTiles.t > 0 ? new Set(B.hintTiles.tiles) : null;
    const addTile = (t, x, y, sc, alpha, add) => {
      if (t.kind === 'pet' && PETDATA && !add) { const m = petMesh(t, x, y + tsy / 2, sc, alpha, B); if (m) { tiles.addChild(m.shadow); tiles.addChild(m.mesh); tiles.addChild(m.face); return; } }
      if (!add && t.kind === 'block' && t.rainbow && drawRainbow(tiles, t, x, y, ts, sc == null ? 1 : sc, alpha == null ? 1 : alpha)) return;
      if (!add && SPECIAL[t.kind] && drawSpecial(tiles, t, x, y, ts, sc == null ? 1 : sc, alpha == null ? 1 : alpha)) return;
      const tx = tileTexture(B, t), s = ts * 1.7 * (sc == null ? 1 : sc);
      const sp = new PIXI.Sprite(tx); sp.anchor.set(0.5); sp.position.set(x, y); sp.width = sp.height = s; sp.rotation = t.rot || 0;
      sp.alpha = alpha == null ? 1 : alpha; if (add) sp.blendMode = PIXI.BLEND_MODES.ADD; tiles.addChild(sp);
    };
    for (let r = 0; r < S.R; r++) for (let c = 0; c < S.C; c++) {
      const t = S.grid[r][c];
      if (!t || t.gx == null || t.hidden > 0) continue;
      const x = B.cx(t.gx), y = B.cy(t.gy + (t.oy || 0));
      if (y < top - ts * 2 || y > bottom + ts) continue;
      const sc = t.sc == null ? 1 : t.sc;
      addTile(t, x, y, sc, t.alpha);
      // pista como en Pet Rescue: el grupo se ilumina despacio y le salen destellos de su color (selectstar_<color>)
      if (hset && hset.has(t)) {
        addTile(t, x, y, sc, 0.35 * (0.5 + 0.5 * Math.sin(B.hintTiles.t * 4)), true);
        if (t.kind === 'block' && Math.random() < 0.05) E.kfx('selectstar', x + (Math.random() - 0.5) * ts * 0.6, y + (Math.random() - 0.5) * tsy * 0.6, ts / 300, null, 1);
      }
    }
    for (const d of B.dying) {
      const t = d.t;
      if (d.age <= 0) { if (t.gx != null) addTile(t, B.cx(t.gx), B.cy(t.gy)); continue; }
      const b = B.TM.brighten;
      if (b && !(d.m && (d.m.mode === 'pet' || d.m.mode === 'crush'))) { // se ilumina y desaparece de golpe
        if (d.age < b) {
          addTile(t, d.x, d.y); addTile(t, d.x, d.y, 1, 0.55 * (d.age / b), true);
        }
        continue;
      }
      const k = Math.min(1, d.age / 0.25);
      if (d.m && d.m.mode === 'pet') { const kk = Math.min(1, d.age / 0.7); addTile(t, d.x, d.y - kk * 90, 1 + kk * 0.6, 1 - kk); }
      else addTile(t, d.x, d.y, 1 + k * 0.3, 1 - k);
    }
    root.addChild(tiles);
    drawDeco(B, B.n || 0, true);
    tiles.on('removed', () => { for (const ch of tiles.children.slice()) if (!ch.keep) ch.destroy(); tiles.removeChildren(); tiles.destroy(); });
  }
  const CN = ['red', 'blue', 'green', 'yellow', 'purple']; // colores de los bloques en el orden del juego
  // decoraciones (constraintSprites de Pet Rescue): un conjunto de un nivel real con las mismas columnas, anclado a los lados
  // y a arriba/abajo del tablero. Regla medida: centro = casilla + desplazamiento·2,16 − 14 px; tamaño ×2,16 la lámina normal
  let DECO = null;
  // Los conjuntos vienen de niveles reales con otra forma de tablero: solo se ponen las piezas que tocan el borde del nuestro
  // (columnas con su altura propia); las que quedarían en el aire no. La cuerda, su nudo y el columpio van juntos: si una
  // de sus piezas sobra, sobran todas.
  function decoPlaced(B, n) {
    const C = B.S.C, keys = Object.keys(DECO).map(Number), kc = keys.includes(C) ? C : keys.sort((a, b) => Math.abs(a - C) - Math.abs(b - C))[0];
    const sets = DECO[kc]; if (!sets || !sets.length) return [];
    const set = sets[(n * 7) % sets.length], tops = boardShape(B), bottom = B.by + B.V * B.tsy;
    const sx = B.ts / 64, sy = B.tsy / 58; // la casilla de las decoraciones mide 64 × 58 unidades (= px de la lámina lógica)
    const yTop = (c) => Math.max(B.by, B.by + (tops[c] - B.cam) * B.tsy);
    const away = (x, y) => { // distancia al tablero (0 dentro)
      let d = 1e9;
      for (let c = 0; c < C; c++) {
        const x0 = B.bx + c * B.ts, x1 = x0 + B.ts, y0 = yTop(c);
        d = Math.min(d, Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - bottom)));
      }
      return d;
    };
    const out = []; let ropeOk = true;
    for (const [name, lado, c, ancla, r, xo, yo] of set) {
      const t = tex('constraints:' + name); if (!t) continue;
      const col = lado === 'R' ? C + c : c, row = ancla === 'B' ? B.V + r : r;
      // regla de Pet Rescue (PRConstraintsView, leída en el ensamblador de libpetrescuesaga.so, 0x13c0bcc): esquina de
      // arriba a la izquierda = (col·64 + xOffset − (ancho mod 64)/2, fila·58 + yOffset − (alto mod 58)/2), tamaño = el
      // de la lámina; todo por la escala de la casilla. Aquí, el centro
      const k = t.k || 1, W = Math.round(t.orig.width / k), H = Math.round(t.orig.height / k);
      const x = B.bx + (col * 64 + xo - Math.trunc((W % 64) / 2) + W / 2) * sx, y = B.by + (row * 58 + yo - Math.trunc((H % 58) / 2) + H / 2) * sy;
      const rope = /rope|tireswing/.test(name), ok = away(x, y) <= B.ts * 0.55;
      if (!ok) { if (rope) ropeOk = false; continue; }
      out.push({ name, t, x, y, rope, w: W * sx, h: H * sy });
    }
    return ropeOk ? out : out.filter((d) => !d.rope);
  }
  function drawDeco(B, n, front) { // front: las que caen fuera de las fichas van delante (como en Pet Rescue), las demás detrás
    if (!DECO) return;
    const C = B.S.C;
    if (!B.deco || B.decoKey !== n + ':' + B.bx + ':' + B.cam) { B.deco = decoPlaced(B, n); B.decoKey = n + ':' + B.bx + ':' + B.cam; }
    for (const { name, t, x, y, w, h } of B.deco) {
      const inside = x > B.bx + B.ts * 0.3 && x < B.bx + C * B.ts - B.ts * 0.3 && y > B.by + B.tsy * 0.3 && y < B.by + B.V * B.tsy - B.tsy * 0.3;
      if (inside === !!front) continue;
      if (name.startsWith('stone_') && x > B.bx && x < B.bx + C * B.ts) continue; // muros de piedra de ese nivel: encima de nuestras fichas no
      img(t, x, y, { w, h });
    }
  }
  // esquinas redondeadas para el contorno del tablero
  function roundedPath(pts0, r) {
    // sin puntos repetidos ni en línea recta (en la GPU de la tablet las uniones de largo cero salían como pinchos)
    const pts = [];
    for (const p of pts0) { const q = pts[pts.length - 1]; if (q && Math.abs(q[0] - p[0]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01) continue; pts.push(p); }
    for (let i = pts.length - 1; i >= 0 && pts.length > 3; i--) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 0.01) pts.splice(i, 1);
    }
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(...v1) || 1, l2 = Math.hypot(...v2) || 1, rr = Math.min(r, l1 / 2, l2 / 2);
      const a = [p1[0] + (v1[0] / l1) * rr, p1[1] + (v1[1] / l1) * rr], b = [p1[0] + (v2[0] / l2) * rr, p1[1] + (v2[1] / l2) * rr];
      for (let s = 0; s <= 4; s++) { const u = s / 4, q = (1 - u) * (1 - u), w = 2 * u * (1 - u), z = u * u; out.push(q * a[0] + w * p1[0] + z * b[0], q * a[1] + w * p1[1] + z * b[1]); }
    }
    return out;
  }

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
  // ---- especiales que Pet Rescue monta por código (constructores de sus vistas en libpetrescuesaga.so, ver
  // analisis/animales_hd.md): piezas de la lámina de bloques en unidades lógicas, casilla de 64; cada parte con su
  // animación de reposo (rotoblaster_idle, lineblast_*), que se repite cada poco
  const SPECIAL = {
    roto: { rot: true, parts: [['rotoblaster_b', 0, 0], ['rotoblaster_a', 0, 0, 'rotoblaster_idle']] },
    dblast: { rot: true, parts: [['directional_blaster_b', 0, 0], ['rotoblaster_a', 0, 0, 'rotoblaster_idle']] },
    lblast: { parts: [['lineblaster_left', -30, 3, 'lineblast_updown_left'], ['lineblaster_spring', 0, 3, 'lineblast_rotate'], ['lineblaster_right', 30, 3, 'lineblast_updown_right']] },
    freezer: { parts: [['blackblock_0', 0, 0], ['freezer_block', 0, 0], ['freezer_lever', 2.5, 7.5, null, [0.5, 0.86]]] },
  };
  function drawSpecial(parent, t, x, y, ts, sc, alpha) {
    const S = SPECIAL[t.kind], A = atlases.blocks; if (!A) return false;
    const u = (ts / 64) * sc, k = A.k || 1, box = new PIXI.Container(); box.position.set(x, y);
    if (S.rot) box.rotation = ((t.dir || 0) * Math.PI) / 2; // la rotobomba mira hacia donde dispara (0 arriba)
    const ph = ((t.id || 0) * 0.37) % 2.4, tt = (E.t + ph) % 2.4; // cada pieza tiembla un momento cada 2,4 s, sin ir a la vez
    for (const [n, ox, oy, an, piv] of S.parts) {
      const tx = tex('blocks:' + n); if (!tx) return false;
      const sp = new PIXI.Sprite(tx), w = (tx.orig.width / k) * u, h = (tx.orig.height / k) * u;
      sp.anchor.set(piv ? piv[0] : 0.5, piv ? piv[1] : 0.5); sp.width = w; sp.height = h;
      let dx = ox, dy = oy, rot = 0;
      const xf = an && animXf(an, tt);
      if (xf && !xf.done) { dx += xf.tx; dy -= xf.ty; rot = (xf.rot * Math.PI) / 180; }
      sp.position.set(dx * u, dy * u); sp.rotation = rot;
      box.addChild(sp);
    }
    box.alpha = alpha; parent.addChild(box); return true;
  }
  // arcoíris (constructor FUN_014e72b4): fondo al 70 %, 4 aspas al 80 % giradas k·90° + 180° sobre un pivote en
  // (0,82, 0,12) del aspa, con su brillo, y el pasador encima; las aspas giran (rainbowblock_spin)
  function drawRainbow(parent, t, x, y, ts, sc, alpha) {
    const A = atlases.blocks; if (!A) return false;
    const u = (ts / 64) * sc, k = A.k || 1, box = new PIXI.Container(); box.position.set(x, y); box.alpha = alpha;
    const put = (n, o) => { const tx = tex('blocks:' + n); if (!tx) return null; const sp = new PIXI.Sprite(tx); sp.anchor.set(o.ax == null ? 0.5 : o.ax, o.ay == null ? 0.5 : o.ay); sp.width = (tx.orig.width / k) * u * (o.s || 1); sp.height = (tx.orig.height / k) * u * (o.s || 1); sp.rotation = o.r || 0; box.addChild(sp); return sp; };
    if (!put('rainbow_back', { s: 0.7 })) return false;
    const blades = new PIXI.Container(); box.addChild(blades); blades.rotation = E.t * 0.6;
    for (let i = 0; i < 4; i++) for (const n of ['rainbow_blade', 'rainbow_blade_shine']) {
      const tx = tex('blocks:' + n); if (!tx) continue; const sp = new PIXI.Sprite(tx); sp.anchor.set(0.82, 0.12);
      sp.width = (tx.orig.width / k) * u * 0.8; sp.height = (tx.orig.height / k) * u * 0.8; sp.rotation = (i * Math.PI) / 2 + Math.PI; blades.addChild(sp);
    }
    put('rainbow_pin', {});
    parent.addChild(box); return true;
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

  // ---------------------------------------------------------------- ventanas de Pet Rescue
  // Ganar: escena DlgPostLevelSummaryWin (estrellas sobre la cinta "¡Nivel completado!", puntos en el círculo azul) y el
  // botón verde "Siguiente"; fondo de la partida oscurecido, sin el tablero (como en el juego real). Medidas de la captura
  // del emulador: estrella central a 230 px, cinta a 420, puntos a 536 y "Siguiente" a 1360 (de 1920), escala 1,78.
  const T = (k, d) => (SCN && SCN.text && SCN.text[k]) || d;
  GL.popup = function (pop) {
    if (!on() || !SCN) return false;
    if (pop.pre) return preLevel(pop);
    if (pop.lost) return lostLevel(pop);
    if (pop.gl) return WINDOWS[pop.gl.kind] ? (begin0(), WINDOWS[pop.gl.kind](pop, pop.gl), true) : false;
    if (!pop.win || !SCN.scenes.post_level_win) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const W = pop.win, a = Math.min(1, pop.anim == null ? 1 : pop.anim);
    const g = gfx(); g.beginFill(0x000000, 0.3 * a); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const which = W.hard === 2 ? 'ResultSuperHard' : W.hard === 1 ? 'ResultHard' : 'ResultNormal';
    const show = { ResultRoot: true }, hide = { ResultNormal: which !== 'ResultNormal', ResultHard: which !== 'ResultHard', ResultSuperHard: which !== 'ResultSuperHard', BackgroundClickArea: true, ButtonContainer: true };
    const n = pop.starsShown || 0; if (n >= 1) show.StarFirstOn = true; if (n >= 2) show.StarSecondOn = true; if (n >= 3) show.StarThirdOn = true;
    if (n >= 1) hide.StarFirstOff = true; if (n >= 2) hide.StarSecondOff = true; if (n >= 3) hide.StarThirdOff = true;
    const score = T('dlg_label_score', 'Puntos: {0}').replace('{0}', String(Math.round(W.score)));
    const texts = { CompleteText: T('prsm_fancy_level_complete', '¡Nivel completado!'), CompleteText2: T('dlg_superhard_level_success', ''), CompleteText3: T('dlg_hard_level_success', ''),
      PlayerScore: score, PlayerScoreHard: score, PlayerScoreSuperHard: score };
    // al abrirse, la línea de tiempo post_level_summary_result_appear: el resultado baja 500 unidades en 0,2 s (cúbica de
    // salida); las estrellas siguen sus animaciones desde ese momento y el botón crece (OnAppearGrow); al cerrarse se apaga
    const t = E.t - (pop.t0 || 0), q = Math.min(1, t / 0.2), fa = pop.closing ? a : 1;
    const k = px(1.78), off = { ResultRoot: [0, -500 * Math.pow(1 - q, 3)] };
    GL.scene('post_level_win', E.W / 2, px(-17), k, { show, hide, text: texts, front: { Stars: true }, off, time: t, alpha: fa }); // las estrellas, delante del círculo
    // botón "Siguiente": el verde de Pet Rescue (primary_btn) con su texto
    const bw = px(390), bh = px(130), bx = E.W / 2 - bw / 2, by = px(1360) - bh / 2;
    const gr = animXf('OnAppearGrow', t - 0.25) || { sx: 1, sy: 1, rot: 0 };
    const bt = new PIXI.Container(); bt.poolBox = true; bt.alpha = fa; bt.pivot.set(E.W / 2, px(1360)); bt.position.set(E.W / 2, px(1360));
    bt.scale.set(gr.sx, gr.sy); bt.rotation = (gr.rot * Math.PI) / 180; root.addChild(bt);
    for (const o of [nine('petui:primary_btn', bx, by, bw, bh, [60, 60, 60, 60], { inset: 0.5 }),
      text(T('prsm_generic_button_next', 'Siguiente'), E.W / 2, px(1356), px(64), { fill: '#ffffff', stroke: '#2f8a1a', sw: px(7) })]) if (o) bt.addChild(o);
    E.hotspot('gl_next', bx, by, bw, bh, W.next);
    return true;
  };

  // Antes del nivel (DlgPreLevel de Pet Rescue, medido en la captura del emulador; px de 1080 desde el borde blanco del
  // panel): panel blanco y azul de 900 × 800, cápsula oscura con "Nivel N", tres estrellas, filas blancas de objetivos con su
  // icono, botón verde "¡Jugar!"; debajo, nuestros potenciadores de inicio en sus discos y el modo por turnos.
  // Al perder: el mismo panel de Pet Rescue con "¡Nivel no superado!", el motivo ("¡Sin movimientos!"), los objetivos con lo
  // que falta y el botón verde "Reintentar"; la cruz vuelve al mapa
  // entrada y salida de una ventana con las animaciones de su escena (unidades de escena → px(1.78)); los botones crecen
  // con OnAppearGrow cuando el panel ya está casi dentro
  function winAnim(pop, box, inA, outA, spIn, spOut) {
    pop.closeDur = animDur(SCN.anims[outA] || {}) / spOut + 0.02; // que el motor no la quite antes de salir
    const k = px(1.78), m = pop.closing ? animXf(outA, (E.t - pop.tc) * spOut) : animXf(inA, (E.t - (pop.t0 || 0)) * spIn);
    if (m) box.position.set(box.position.x + m.tx * k, box.position.y + m.ty * k);
    return (cx, cy, delay) => { // grupo que crece en (cx, cy)
      const g = animXf('OnAppearGrow', pop.closing ? 9 : E.t - (pop.t0 || 0) - delay) || { sx: 1, sy: 1, rot: 0 };
      const c = new PIXI.Container(); c.poolBox = true; c.pivot.set(cx, cy); c.position.set(cx, cy); c.scale.set(g.sx, g.sy); c.rotation = (g.rot * Math.PI) / 180; box.addChild(c);
      return (o) => { if (!o) return o; root.removeChild(o); c.addChild(o); return o; };
    };
  }
  function lostLevel(pop) {
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const L = pop.lost, a = Math.min(1, pop.anim == null ? 1 : pop.anim), T0 = E.H * 0.16;
    const Y = (v) => T0 + px(v - 178), X = (v) => px(v);
    const g = gfx(); g.beginFill(0x000000, 0.5 * a); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const box = new PIXI.Container(); box.poolBox = true; root.addChild(box);
    const grow = winAnim(pop, box, 'SlideInFromTop', 'SlideOutToTop', 0.6, 0.6); // DlgEndGameOutOfMovesRevamped, a velocidad 0,6
    const add = (o) => { if (!o) return o; root.removeChild(o); box.addChild(o); return o; };
    add(nine('petui:bundle_back', X(84), Y(172), X(912), px(640), [60, 60, 60, 60], { inset: 0.5 }));
    add(nine('petui:bundle_panel', X(96), Y(194), X(888), px(608), [60, 60, 60, 60], { inset: 0.5, tint: 0x50c9ed }));
    const cap = gfx(); add(cap); cap.beginFill(0x196f87); cap.drawRoundedRect(X(230), Y(240), X(620), px(64), px(32)); cap.endFill();
    add(text(T('prsm_popup_game_over_title_loss', '¡Nivel no superado!'), E.W / 2, Y(273), px(44), { fill: '#d6eef4', stroke: '#0e4b5c', sw: px(3) }));
    add(text(L.dead ? L.msg : T('prsm_game_swipe_end_lose_header_reason_score', '¡Sin movimientos!'), E.W / 2, Y(360), px(48), { fill: '#ffffff', stroke: '#1d5c8a', sw: px(6) }));
    L.goals.slice(0, 2).forEach((gl, i) => {
      const y = 420 + i * 96, done = gl.count - gl.left;
      add(nine('popups:popup_normal_background_white', X(196), Y(y), X(690), px(72), [40, 30, 40, 30], { inset: 0.5 }));
      add(img(gl.type === 'pet' ? 'hud:cat_icon' : 'blocks:common_red_0', X(240), Y(y + 36), { w: px(78), h: px(70) }));
      add(text(done + ' / ' + gl.count, X(560), Y(y + 36), px(38), { fill: gl.left > 0 ? '#c0392b' : '#1a2c6b' }));
    });
    const by = 420 + Math.min(2, L.goals.length) * 96 + 24;
    const addB = grow(E.W / 2, Y(by + 54), 0.25);
    addB(nine('petui:bundle_back', X(300), Y(by - 6), X(480), px(120), [60, 60, 60, 60], { inset: 0.5 }));
    addB(nine('petui:primary_btn', X(310), Y(by), X(460), px(108), [60, 60, 60, 60], { inset: 0.5 }));
    addB(text(T('prsm_generic_popup_button_retry', 'Reintentar'), E.W / 2, Y(by + 50), px(56), { fill: '#ffffff', stroke: '#2f8a1a', sw: px(7) }));
    E.hotspot('gl_retry', X(310), Y(by), X(460), px(108), L.retry);
    const addX = grow(X(960), Y(204), 0.3);
    addX(img('petui:bundle_back', X(960), Y(204), { w: px(110), h: px(110) }));
    addX(img('petui:close_btn', X(960), Y(204), { w: px(92), h: px(92) }));
    E.hotspot('gl_lclose', X(905), Y(150), px(110), px(110), L.close);
    return true;
  }

  const emoTex = new Map();
  function emojiTex(ch) { let t = emoTex.get(ch); if (!t) { t = PIXI.Texture.from(E.emojiSprite(ch, 128)); emoTex.set(ch, t); } return t; }
  function preLevel(pop) {
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const P = pop.pre, a = Math.min(1, pop.anim == null ? 1 : pop.anim), T0 = E.H * 0.1;
    const Y = (v) => T0 + px(v - 178), X = (v) => px(v);
    const g = gfx(); g.beginFill(0x000000, 0.5 * a); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const root0 = new PIXI.Container(); root0.poolBox = true; root.addChild(root0);
    const grow = winAnim(pop, root0, 'SlideInFromLeft', 'SlideOutToRight', 1, 1); // DlgPreLevelCTAImprov: entra por la izquierda, sale por la derecha
    const add = (o) => { if (!o) return o; root.removeChild(o); root0.addChild(o); return o; };
    // la explicación de la pieza nueva de este nivel (nuestra, sin emojis) alarga el panel
    const help = P.spec.text ? P.spec.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{FE0F}]/gu, '').replace(/\s+([:.,])/g, '$1').replace(/\s{2,}/g, ' ').trim() : '';
    const extra = help ? 150 : 0;
    add(nine('petui:bundle_back', X(84), Y(172), X(912), px(820 + extra), [60, 60, 60, 60], { inset: 0.5 }));
    add(nine('petui:bundle_panel', X(96), Y(194), X(888), px(788 + extra), [60, 60, 60, 60], { inset: 0.5, tint: P.hard === 2 ? 0xa060f0 : P.hard === 1 ? 0xf05a6e : 0x50c9ed })); // pieza blanca que el juego tiñe (azul; difícil, rojo; superdifícil, morado)
    const cap = gfx(); add(cap); cap.beginFill(0x196f87); cap.drawRoundedRect(X(310), Y(240), X(460), px(60), px(30)); cap.endFill();
    add(text(T('dlg_label_level_id', 'Nivel {0}').replace('{0}', P.n), E.W / 2, Y(271), px(46), { fill: '#d6eef4', stroke: '#0e4b5c', sw: px(3) }));
    const st2 = tex('levelmenu:star2'), ar = st2 ? st2.orig.width / st2.orig.height : 0.5;
    [[-150, 420, 0.8], [0, 390, 1], [150, 420, 0.8]].forEach(([dx, y, k]) => { // estrellas vacías: dos mitades (star2), la derecha volteada
      const h = px(190) * k, w = h * ar;
      add(img('levelmenu:star2', E.W / 2 + X(dx) - w / 2, Y(y), { w, h }));
      add(img('levelmenu:star2', E.W / 2 + X(dx) + w / 2, Y(y), { w, h, flipX: true }));
    });
    const rows = [];
    for (const gl of P.goals) {
      if (gl.type === 'pet') rows.push(['hud:cat_icon', (gl.count === 1 ? T('task_rescue_one_pet', 'Rescata 1 mascota.') : T('task_rescue_several_pets', 'Rescata {0} mascotas.').replace('{0}', gl.count))]);
      else if (gl.type === 'blocks') rows.push(['blocks:common_red_0', 'Quita todos los bloques']);
    }
    if (P.spec.starScores) rows.push(['boosters:ootf_star', T('task_target_score', 'Gana {0} puntos').replace('{0}', P.spec.starScores[0])]);
    rows.slice(0, 3).forEach(([icon, label], i) => {
      const y = 582 + i * 96;
      add(nine('popups:popup_normal_background_white', X(196), Y(y), X(690), px(72), [40, 30, 40, 30], { inset: 0.5 }));
      add(img(icon, X(240), Y(y + 36), { w: px(78), h: px(70) }));
      add(text(label, X(560), Y(y + 36), px(34), { fill: '#1a2c6b' }));
    });
    let by = 582 + Math.min(3, rows.length) * 96 + 10;
    if (help) { add(fitHelp(help, E.W / 2, Y(by + 75), px(780), px(140), px(36), { fill: '#ffffff', stroke: '#1d5c8a', sw: px(5) })); by += extra; }
    const addB = grow(E.W / 2, Y(by + 54), 0.15);
    addB(nine('petui:bundle_back', X(330), Y(by - 6), X(420), px(120), [60, 60, 60, 60], { inset: 0.5 }));
    addB(nine('petui:primary_btn', X(340), Y(by), X(400), px(108), [60, 60, 60, 60], { inset: 0.5 }));
    addB(text(T('prsm_popup_game_start_button_play', '¡Jugar!'), E.W / 2, Y(by + 50), px(60), { fill: '#ffffff', stroke: '#2f8a1a', sw: px(7) }));
    E.hotspot('gl_play', X(340), Y(by), X(400), px(108), P.play);
    // cerrar: el botón rojo de la esquina (BackButton, también OnAppearGrow)
    const addX = grow(X(960), Y(204), 0.2);
    addX(img('petui:bundle_back', X(960), Y(204), { w: px(110), h: px(110) }));
    addX(img('petui:close_btn', X(960), Y(204), { w: px(92), h: px(92) }));
    E.hotspot('gl_close', X(905), Y(150), px(110), px(110), P.close);
    // potenciadores de inicio (los nuestros) en sus discos, bajo el panel
    const yb = Y(by + 290), n = P.SB.length, d = px(150), gap = px(40), x0 = E.W / 2 - (n * d + (n - 1) * gap) / 2 + d / 2;
    P.SB.forEach((b, i) => {
      const x = x0 + i * (d + gap), have = P.have(b), onB = P.chosen.has(b.id), add = grow(x, yb, 0.15 + i * 0.05); // cada disco crece (OnAppearGrow)
      add(img('boosters:booster_icon_back', x, yb, { w: d, h: d, tint: onB ? 0xffe680 : 0xffffff }));
      if (onB) add(img('levelmenu:booster_ring', x, yb, { w: d * 1.08, h: d * 1.08 }));
      add(img(emojiTex(b.icon), x, yb, { w: d * 0.66, h: d * 0.66 })); // el dibujo del estilo (las piezas de Pet Rescue)
      const cg = gfx(); add(cg); cg.beginFill(onB ? 0x3cb93c : have ? 0xe8322b : 0x8a96a3); cg.lineStyle(px(4), 0xffffff); cg.drawCircle(x + d * 0.32, yb + d * 0.32, px(26)); cg.endFill();
      add(text(onB ? '✓' : have === Infinity ? '∞' : have > 0 ? String(have) : '+', x + d * 0.32, yb + d * 0.32, px(32), { fill: '#ffffff' }));
      E.hotspot('gl_sb' + b.id, x - d / 2, yb - d / 2, d, d, () => P.toggle(b));
    });
    // por turnos con otra persona (nuestro), discreto debajo
    const yd = yb + d * 0.5 + px(70);
    const dg = gfx(); add(dg); dg.beginFill(E.duoOn ? 0xff8a1f : 0x000000, E.duoOn ? 0.9 : 0.35); dg.drawRoundedRect(X(240), yd - px(36), X(600), px(72), px(36)); dg.endFill();
    add(img('petui:ico_friends', X(290), yd, { w: px(70), h: px(54) }));
    add(text('Por turnos con otra persona: ' + (E.duoOn ? 'Sí' : 'No'), E.W / 2 + px(30), yd, px(30), { fill: '#ffffff' }));
    E.hotspot('gl_duo', X(240), yd - px(36), X(600), px(72), P.duo);
    return true;
  }

  // ---------------------------------------------------------------- otras ventanas con las piezas de Pet Rescue
  // Ajustes: DlgSettingsNavBar (cielo con nubes, título grande, botones redondos de sonido sobre su base, botones grandes
  // verdes y amarillos). Misiones: DlgMiniQuests con una tarjeta mini_quest_cell por misión (icono, texto, barra y premio).
  // Trofeos: no existen en Pet Rescue; van con las mismas tarjetas sobre el cielo de los ajustes y las medallas de sus
  // carreras. Premio (desafío superado, misión, logro, cofre): panel azul de DlgExitGame con el perro contento. Pausa y
  // salir del nivel: el panel de DlgExitGame (título, perro triste, "Seguir jugando" y "Salir").
  function begin0() { if (!usedThisFrame) begin(); usedThisFrame = true; }
  const WINDOWS = {};
  // contenedor de la ventana con su animación de entrada y salida; add() mete ahí lo que se dibuja
  function winBox(pop, inA, outA, spIn, spOut) {
    const box = new PIXI.Container(); box.poolBox = true; root.addChild(box);
    const grow = winAnim(pop, box, inA, outA, spIn, spOut);
    const add = (o) => { if (!o) return o; root.removeChild(o); box.addChild(o); return o; };
    return { box, grow, add };
  }
  // botón de Pet Rescue: base oscura (bundle_back) y el botón (verde primary_btn, amarillo yellow_btn, rojo btn_red)
  const BTN = { green: ['petui:primary_btn', '#2f8a1a'], yellow: ['petui:yellow_btn', '#b0560e'], red: ['petui:btn_red', '#8e1c1c'] };
  function button(W, id, kind, cx, cy, w, h, label, cb, o) {
    o = o || {};
    const add = W.grow(cx, cy, o.delay != null ? o.delay : 0.15), [t, sc] = BTN[kind];
    add(nine('petui:bundle_back', cx - w / 2 - px(10), cy - h / 2 - px(8), w + px(20), h + px(22), [36, 36, 36, 36], { inset: 0.5 }));
    add(nine(t, cx - w / 2, cy - h / 2, w, h, [44, 44, 44, 44], { inset: 0.5 }));
    const lines = String(label).split('\n'), fs = o.size || px(54), lh = fs * 1.05;
    lines.forEach((ln, i) => add(text(ln, cx, cy - px(6) + (i - (lines.length - 1) / 2) * lh, i === 0 && lines.length > 1 ? fs * 0.8 : fs, { fill: '#ffffff', stroke: sc, sw: px(6) })));
    E.hotspot(id, cx - w / 2, cy - h / 2, w, h, cb);
  }
  function closeButton(W, id, x, y, cb) {
    const add = W.grow(x, y, 0.2);
    add(img('petui:bundle_back', x, y, { w: px(118), h: px(118) }));
    add(img('petui:close_btn', x, y, { w: px(98), h: px(98) }));
    E.hotspot(id, x - px(70), y - px(70), px(140), px(140), cb);
  }
  const backdrop = (a, al) => { const g = gfx(); g.beginFill(0x000000, al * a); g.drawRect(0, 0, E.W, E.H); g.endFill(); };
  const fade = (pop) => Math.min(1, pop.anim == null ? 1 : pop.anim);
  // cielo de los ajustes (settings_bg_temp): degradado y nubes translúcidas que se mueven despacio
  function skyBg(a) {
    const g0 = gfx(); g0.beginFill(0x58c4f2, a); g0.drawRect(0, 0, E.W, E.H); g0.endFill(); // la lámina del degradado es translúcida
    img('settingsbg:sky_gradient_bg', E.W / 2, E.H / 2, { w: E.W, h: E.H, alpha: a });
    const C = [['bg_cloud', 113, 100, 0.46], ['bg_cloud', 652, 650, 0.27], ['bg_cloud', 604, 43, 0.27], ['bg_cloud_1', 285, 191, 0.42], ['bg_cloud_1', 845, 97, 0.52],
      ['bg_cloud_2', 125, 289, 0.63], ['bg_cloud_2', 508, 257, 0.63], ['bg_cloud_2', 813, 210, 0.63], ['bg_cloud_2', 364, 622, 0.63], ['bg_cloud_2', 320, 443, 0.63],
      ['bg_cloud_2', 666, 480, 0.63], ['bg_cloud_2', 332, 62, 0.63], ['bg_cloud_1', 91, 506, 0.42], ['bg_cloud_1', 775, 326, 0.42]];
    const sx = E.W / 940, sy = E.H / 700;
    C.forEach(([n, x, y, al], i) => { const t = tex('settingsbg:' + n); if (!t) return; const w = (t.orig.width / t.k) * px(2.4);
      img(t, ((x * sx + E.t * px(6) * (1 + (i % 3) * 0.4)) % (E.W + w)) - w / 2, y * sy, { w, h: (w * t.orig.height) / t.orig.width, alpha: al * a }); });
  }
  // título grande de los ajustes (settings_title_temp: letras claras con contorno azul y sombra)
  function bigTitle(W, str, y) {
    W.add(text(str, E.W / 2, y + px(8), px(110), { fill: '#0b2f7a', stroke: '#0b2f7a', sw: px(14) }));
    W.add(text(str, E.W / 2, y, px(110), { fill: '#fff7d8', stroke: '#1658c6', sw: px(12) }));
  }

  WINDOWS.settings = function (pop, S) {
    const a = fade(pop);
    skyBg(a);
    const W = winBox(pop, 'SlideInFromTop', 'SlideOutToTop', 1, 1);
    const ty = E.H * 0.15;
    bigTitle(W, T('prsm_settings_title_key', 'Ajustes'), ty);
    E.hotspot('gl_st_secret', E.W * 0.25, ty - px(80), E.W * 0.5, px(160), S.secret); // 5 toques: elegir nivel (para quien cuida la tablet)
    closeButton(W, 'gl_st_x', E.W * 0.9, E.H * 0.07, S.close);
    // botones redondos (GameSettings): sonido, voces y leer en voz alta, cada uno con lo que tiene puesto debajo
    const ROUND = { 'Sonido': ['petui2:sound_icon', 'petui:connect_btn'], 'Voces del narrador': ['petui2:music_icon', 'petui:connect_btn'], 'Leer en voz alta': ['petui2:info_icon', 'petui:yellow_btn'] };
    const round = S.opts.filter((o) => ROUND[o.name]), big = S.opts.filter((o) => !ROUND[o.name]);
    const ry = E.H * 0.31, d = px(170), gap = px(70), rw = round.length * d + (round.length - 1) * gap;
    W.add(nine('petui:basic_button_base_new', E.W / 2 - rw / 2 - px(40), ry - d / 2 - px(30), rw + px(80), d + px(60), [60, 60, 60, 60], { inset: 0.5 }));
    round.forEach((o, i) => {
      const x = E.W / 2 - rw / 2 + d / 2 + i * (d + gap), [ic, bt] = ROUND[o.name], v = o.val(), off = v === 'No';
      const add = W.grow(x, ry, 0.15 + i * 0.05);
      add(img('petui:bundle_back', x, ry, { w: d * 1.12, h: d * 1.12 }));
      add(img(bt, x, ry, { w: d, h: d }));
      const t = tex(ic); if (t) { const h = d * 0.5, w = (h * t.orig.width) / t.orig.height; add(img(t, x, ry - px(6), { w: Math.min(w, d * 0.62), h })); }
      if (off) add(img('petui2:off_ico', x, ry - px(6), { w: d * 0.62, h: d * 0.62 }));
      W.add(text(o.name, x, ry + d / 2 + px(70), px(38), { fill: '#ffffff', stroke: '#1658c6', sw: px(6) }));
      W.add(text(v, x, ry + d / 2 + px(116), px(42), { fill: '#fff7a0', stroke: '#1658c6', sw: px(6) }));
      E.hotspot('gl_st_r' + i, x - d / 2 - gap / 2, ry - d / 2, d + gap, d + px(150), o.act);
    });
    // botones grandes de dos en dos (como Ayuda/Privacidad y Cuenta/Comunidad): verdes a la izquierda, amarillos a la derecha
    const bw = px(440), bh = px(190), y0 = E.H * 0.53;
    big.forEach((o, i) => {
      const col = big.length % 2 && i === big.length - 1 ? 0.5 : i % 2, x = E.W / 2 + (col - 0.5) * px(500), y = y0 + Math.floor(i / 2) * px(250);
      button(W, 'gl_st_b' + i, col === 1 ? 'yellow' : 'green', x, y, bw, bh, o.name + '\n' + o.val(), o.act, { size: px(54), delay: 0.2 + i * 0.05 });
    });
    let ver = 0; try { ver = window.AndroidUpdate ? window.AndroidUpdate.version() : 0; } catch (e) { ver = 0; }
    if (ver) W.add(text(T('prsm_settings_menu_version', 'Versión {0}').replace('{0}', ver), E.W / 2, E.H * 0.93, px(34), { fill: '#ffffff', stroke: '#1658c6', sw: px(4) }));
  };

  // ---- tarjetas de misión (mini_quest_cell): icono del tipo, texto, barra con "v/k" y premio o marca de hecha
  const MQ_TEXT = { wins: 'mini_quests_complete_x_levels', stars: 'mini_quests_collect_x_stars', three: 'mini_quests_complete_x_levels_3stars', col: 'mini_quests_rescue_x_pets' };
  function questIcon(add, id, x, y, size, n) {
    const k = size / 127, o = { time: 0 };
    let sc = null;
    if (id === 'stars') { sc = 'mq_icon_stars'; o.show = { CollectXStars: true }; }
    else if (id === 'three') { sc = 'mq_icon_stars'; o.show = { CompleteXLevelsWith3Stars: true }; }
    else if (id === 'col' || id === 'pets') { sc = 'mq_icon_pets'; o.show = { RescueXPets: true }; }
    else if (id === 'streak') { sc = 'mq_icon_levels'; o.show = { CompleteXLevelsHard: true }; o.text = { hardLevelAmount: String(n) }; }
    else if (id === 'days') { add(img('miniquest:mini_quest_icon_bkg_liveop', x, y, { w: size, h: size * 113 / 127 })); add(img('petui:petopia_timer', x, y, { w: size * 0.42, h: size * 0.5 })); return; }
    else { sc = 'mq_icon_levels'; o.show = { CompleteXLevels: true }; o.text = { anyLevelAmount: String(n) }; }
    const n0 = root.children.length;
    GL.scene(sc, x - size / 2, y, k, o); // las plantillas de icono empiezan en su borde izquierdo
    for (const c of root.children.slice(n0)) add(c); // las piezas de la escena, dentro de la ventana
  }
  function questCard(W, i, it, x0, y, w, h, right) {
    const add = W.grow(x0 + w / 2, y + h / 2, 0.12 + i * 0.07);
    add(nine(it.done ? 'petui2:pet_Ui_card_completed' : 'petui2:pet_Ui_card', x0, y, w, h, [34, 34, 34, 34], { inset: 0.6 }));
    questIcon(add, it.icon, x0 + px(150), y + h / 2, px(190), it.n);
    const tx = x0 + px(280), bw = w - px(280) - px(250);
    add(text(it.text, tx, y + px(64), px(40), { fill: it.done ? '#ffffff' : '#2a3f84', ax: 0, wrap: bw + px(200), align: 'left' }));
    const by = y + h - px(78), k = Math.max(0, Math.min(1, it.v / it.k));
    add(nine('petui2:pet_Ui_progress_bar', tx, by - px(26), bw, px(52), [12, 10, 12, 10], { inset: 1, tint: 0x72ff0d, alpha: 86 / 255 })); // como en mini_quest_cell (color de vértices)
    if (k > 0) add(nine('petui2:pet_Ui_progress_bar_fill', tx, by - px(26), Math.max(px(40), bw * k), px(52), [12, 10, 12, 10], { inset: 1 }));
    add(text(it.label || it.v + '/' + it.k, tx + bw / 2, by - px(2), px(36), { fill: '#ffffff', stroke: '#2a6a12', sw: px(5) }));
    right(add, x0 + w - px(130), y + h / 2);
  }
  // días que quedan hasta el lunes (cuando cambian las misiones)
  const daysLeft = () => { const d = new Date().getDay(); return d === 1 ? 7 : (8 - d) % 7 || 7; };

  const gradT = new Map();
  function gradTex(id, cols) {
    let t = gradT.get(id); if (t) return t;
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    cols.forEach((cl, i) => gr.addColorStop(i / (cols.length - 1), cl)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    t = PIXI.Texture.from(c); gradT.set(id, t); return t;
  }
  WINDOWS.missions = function (pop, M) {
    const a = fade(pop), items = M.items();
    // fondo de DlgMiniQuests: degradado, ilustraciones del cielo y la del suelo repetida abajo
    img(gradTex('mq', ['#88b5ad', '#87afd1', '#c29ec6', '#e99ab4', '#f1a9a4', '#f2be85', '#f2d669']), E.W / 2, E.H / 2, { w: E.W, h: E.H, alpha: a }); // mini_quest_background_gradient (1 px de ancho: se dibuja aparte)
    const bt = tex('miniquest:mini_quest_bkg_bottom_illustration');
    if (bt) { const h = E.H * 0.2, w = (h * bt.orig.width) / bt.orig.height; for (let x = 0; x < E.W + w; x += w * 0.98) img(bt, x, E.H, { ax: 0, ay: 1, w, h, alpha: a }); }
    img('miniquest:mini_quest_bkg_top_illustration_1', E.W * 0.32, E.H * 0.06, { w: px(560), h: px(300), alpha: a });
    img('miniquest:mini_quest_bkg_top_illustration_2', E.W * 0.72, E.H * 0.03, { w: px(560), h: px(310), alpha: a });
    const W = winBox(pop, 'SlideInFromTop', 'SlideOutToTop', 1, 1);
    const cy = Math.max(E.H * 0.25, px(520));
    // cabecera: cuántas lleva, la explicación, el prado con el cerdito y el lote de potenciadores, y la cinta con el título
    const done = items.filter((q) => q.done).length;
    W.add(nine('miniquest:mini_quest_count_back', E.W / 2 - px(110), cy - px(440), px(220), px(80), [30, 30, 30, 30], { inset: 0.5 }));
    W.add(text(done + '/' + items.length, E.W / 2, cy - px(402), px(52), { fill: '#ffffff', stroke: '#2a3f84', sw: px(5) }));
    W.add(text(T('mini_quests_description', 'Completa misiones esta semana para ganar premios.'), E.W / 2, cy - px(310), px(40), { fill: '#ffffff', stroke: '#2a3f84', sw: px(5), wrap: px(760) }));
    W.add(img('miniquest:mini_quest_bkg_top_illustration_3', E.W / 2, cy - px(100), { w: px(1300), h: px(380) }));
    W.add(img('miniquest:mini_quest_pig', E.W / 2 - px(360), cy - px(110), { w: px(180), h: px(248) }));
    W.add(img('petui:booster_bundle_illustration', E.W / 2 + px(400), cy + px(20), { w: px(280), h: px(295) }));
    W.add(nine('miniquest:mini_quest_ribbon', E.W / 2 - px(560), cy - px(10), px(1120), px(170), [70, 40, 70, 40], { inset: 0.6 }));
    W.add(text(T('mini_quests_title', '¡Misiones semanales!'), E.W / 2, cy + px(62), px(62), { fill: '#ffffff', stroke: '#8a3a12', sw: px(7) }));
    // reloj: los días que quedan
    W.add(nine('miniquest:mini_quest_count_back', px(30), px(40), px(330), px(80), [30, 30, 30, 30], { inset: 0.5 }));
    W.add(img('petui:petopia_timer', px(80), px(76), { w: px(80), h: px(94) }));
    W.add(text(T('dlg_multiple_days_left', '¡Quedan {0} días!').replace('{0}', daysLeft()), px(215), px(80), px(36), { fill: '#ffffff', stroke: '#2a3f84', sw: px(4) }));
    closeButton(W, 'gl_mi_x', E.W - px(80), px(80), M.close);
    const ch = px(250), gap = px(36), y0 = cy + px(230);
    items.forEach((q, i) => {
      const key = MQ_TEXT[q.id], txt = key && T(key, null) ? T(key, '').replace('{0}', q.k).replace(/ /g, ' ') : q.name;
      questCard(W, i, { icon: q.id, n: q.k, text: txt, v: q.v, k: q.k, done: q.done }, px(50), y0 + i * (ch + gap), E.W - px(100), ch, (add, x, y) => {
        if (q.done) add(img('petui:icon_check', x, y, { w: px(150), h: px(131) }));
        else { add(img('petui:booster_bundle_3', x, y - px(10), { w: px(190), h: px(170) })); add(text('x2', x + px(70), y + px(70), px(48), { fill: '#ffffff', stroke: '#273371', sw: px(6) })); }
      });
    });
  };

  WINDOWS.album = function (pop, A) {
    const a = fade(pop), items = A.items();
    skyBg(a);
    const W = winBox(pop, 'SlideInFromTop', 'SlideOutToTop', 1, 1);
    bigTitle(W, 'Trofeos', E.H * 0.09);
    closeButton(W, 'gl_al_x', E.W * 0.9, E.H * 0.07 - px(20), A.close);
    const ch = px(240), gap = px(28), y0 = E.H * 0.17;
    items.forEach((q, i) => {
      const full = q.t >= q.tiers.length, next = q.tiers[Math.min(q.t, q.tiers.length - 1)];
      questCard(W, i, { icon: q.id, n: next, text: q.name + ': ' + q.value, v: full ? 1 : q.value, k: full ? 1 : next, done: full, label: full ? '¡Completo!' : q.value + '/' + next }, px(50), y0 + i * (ch + gap), E.W - px(100), ch, (add, x, y) => {
        // medallas de las carreras de Pet Rescue (discos donde el juego escribe el puesto): bronce, plata, verde y, con
        // todos los escalones, la de oro; dentro, cuántos escalones lleva; gris si aún ninguno
        const full = q.t >= q.tiers.length, m = full ? 1 : q.t >= 4 ? 2 : q.t >= 2 ? 4 : 3, d = m === 1 ? px(170) : px(140);
        add(img('petui2:levelrace_medail_0' + m, x, y - px(6), { w: d, h: d * (m === 1 ? 1.02 : 1.07), tint: q.t ? 0xffffff : 0xb0b0b0, alpha: q.t ? 1 : 0.6 }));
        add(text(String(q.t), x, y - px(14), px(64), { fill: '#ffffff', stroke: m === 1 ? '#c2571a' : m === 2 ? '#127a76' : m === 3 ? '#a8641d' : '#6b6f9a', sw: px(7) }));
      });
    });
  };

  // panel azul de DlgExitGame (levelmenu:blue_panel, 542 × 700) con su título; devuelve la ventana y la escala
  function bluePanel(pop, hh) {
    backdrop(fade(pop), 0.5);
    const W = winBox(pop, 'SlideInFromLeft', 'SlideOutToRight', 1, 1);
    const w = px(940), h = hh, x = (E.W - w) / 2, y = (E.H - h) / 2;
    W.add(nine('levelmenu:blue_panel', x, y, w, h, [70, 70, 70, 70], { inset: 0.6 }));
    return { W, x, y, w, h };
  }
  WINDOWS.reward = function (pop, R) {
    const P = bluePanel(pop, R.icons.length ? px(1000) : px(800)), { W, x, y, w, h } = P;
    W.add(img('petui:dog_front', E.W / 2, y - px(40), { w: px(260), h: px(336), ay: 0.7 })); // el perro contento asomando
    W.add(text(R.title, E.W / 2, y + px(160), px(76), { fill: '#fff6a0', stroke: '#1d4f9a', sw: px(8), wrap: w - px(80) }));
    W.add(text(R.sub, E.W / 2, y + px(340), px(52), { fill: '#ffffff', stroke: '#1d4f9a', sw: px(6), wrap: w - px(120) }));
    const n = R.icons.length, d = px(170);
    R.icons.forEach((ic, i) => {
      const cx = E.W / 2 + (i - (n - 1) / 2) * (d + px(40)), cy = y + px(560), add = W.grow(cx, cy, 0.2 + i * 0.08);
      add(img('petui:light_ray', cx, cy, { w: d * 2, h: d * 2, rot: E.t * 0.6, alpha: 0.5, add: true }));
      add(img('petui:reward_badge_back', cx, cy, { w: d, h: d }));
      add(img(emojiTex(ic), cx, cy, { w: d * 0.72, h: d * 0.72 }));
    });
    button(W, 'gl_rw_ok', 'green', E.W / 2, y + h - px(140), px(480), px(150), '¡Estupendo!', R.ok, { delay: 0.3, size: px(60) });
  };
  function exitLike(pop, title, sub, btns) {
    const P = bluePanel(pop, px(830 + (btns.length - 1) * 170)), { W, y, h } = P; // alto según los botones
    W.add(text(title, E.W / 2, y + px(110), px(64), { fill: '#ffffff', stroke: '#1d4f9a', sw: px(7) }));
    if (sub) W.add(text(sub, E.W / 2, y + px(200), px(40), { fill: '#d8f0ff', stroke: '#1d4f9a', sw: px(4), wrap: px(820) }));
    W.add(img('popups:shadow', E.W / 2, y + px(520), { w: px(300), h: px(87) }));
    W.add(img('popups:dog_sad', E.W / 2 - px(20), y + px(400), { w: px(230), h: px(325) }));
    btns.forEach(([id, kind, label, cb], i) => button(W, id, kind, E.W / 2, y + px(660) + i * px(170), px(560), px(140), label, cb, { delay: 0.15 + i * 0.06, size: px(54) }));
  }
  WINDOWS.exit = function (pop, X) {
    exitLike(pop, '¿Salir del nivel?', 'Si sales, tendrás que empezarlo otra vez', [['gl_cx_no', 'green', T('prsm_exit_game_main_menu_continue_button_text', 'Seguir jugando'), X.stay], ['gl_cx_si', 'red', 'Sí, salir', X.leave]]);
  };
  WINDOWS.pause = function (pop, Z) {
    exitLike(pop, 'Pausa', null, [['gl_pz_c', 'green', T('prsm_exit_game_main_menu_continue_button_text', 'Seguir jugando'), Z.resume], ['gl_pz_a', 'yellow', T('prsm_settings_title_key', 'Ajustes'), Z.settings], ['gl_pz_m', 'red', 'Salir al mapa', Z.leave]]);
    if (Z.version) text(T('prsm_settings_menu_version', 'Versión {0}').replace('{0}', Z.version), E.W / 2, E.H / 2 + px(625), px(32), { fill: '#ffffff', stroke: '#1d4f9a', sw: px(4), alpha: fade(pop) });
  };

  // Regalo diario (DlgDailyReward): cinta azul con "Regalo diario", seis casillas y el bonus ancho del 7.º día. Los días ya
  // cogidos, verdes con su marca; el de hoy, el regalo naranja con su brillo; los que faltan, el regalo azul. Al abrir el de
  // hoy salen sus premios con rayos y el botón "¡Estupendo!". Medidas de la escena (casillas de 130 a 145 de distancia).
  WINDOWS.daily = function (pop, D) {
    backdrop(fade(pop), 0.6);
    const W = winBox(pop, 'SlideInFromTop', 'SlideOutToBelow', 1, 1), t = E.t - (pop.t0 || 0);
    const k = Math.min(px(1.9), E.H / 900), cx = E.W / 2, cy = E.H * 0.5, ry = cy - 193 * k, st = D.st;
    // cinta del título: blue_band y su reflejo
    const bw = 175 * 1.4 * k, bh = 100 * 1.3 * k, ty = cy - 350 * k;
    W.add(img('levelmenu:blue_band', cx - bw / 2 + 3 * k, ty, { w: bw, h: bh })); // las dos mitades se solapan un poco, como en la escena
    W.add(img('levelmenu:blue_band', cx + bw / 2 - 3 * k, ty, { w: bw, h: bh, flipX: true }));
    W.add(text(T('daily_gift_title', 'Regalo diario'), cx, ty - 14 * k, 34 * k, { fill: '#ffffff', stroke: '#0f3f8f', sw: 4 * k }));
    const prizeIcons = (add, L, x, y, s) => L.forEach((ic, i) => add(img(emojiTex(ic), x + (i - (L.length - 1) / 2) * s * 0.62, y, { w: s, h: s })));
    const slot = (d, x, y) => {
      const s = 130 * k, add = W.grow(x, y, 0.1 + d * 0.04), today = d === D.day;
      if (d < D.day || (today && st.done)) { // ya cogido: el premio debajo y la marca verde encima
        if (today && st.done) add(img('petui:light_ray', x, y, { w: s * 1.8, h: s * 1.8, rot: E.t * 0.6, alpha: 0.35, add: true }));
        add(nine('levelmenu:booster_frame_outline', x - s / 2, y - s / 2, s, s, [30, 30, 30, 30], { inset: 0.5 }));
        prizeIcons(add, D.prizes[d - 1], x, y, s * (D.prizes[d - 1].length > 1 ? 0.5 : 0.7));
        if (!today) add(img('dailygift:daily_gift_claimed', x, y, { w: s * 1.02, h: s * 1.02, alpha: 0.85 }));
      } else if (today) { // hoy, por abrir: brillo que late y el regalo naranja
        const p = 1 + Math.sin(E.t * 5) * 0.04;
        add(img('dailygift:daily_gift_bonus_selected_outline', x, y, { w: s * 1.12 * p, h: s * 1.12 * p }));
        add(img('dailygift:daily_gift_selected', x, y, { w: s * p, h: s * p }));
        E.hotspot('gl_dg_today', x - s / 2, y - s / 2, s, s, D.claim);
      } else {
        add(nine('levelmenu:booster_frame_outline', x - s / 2, y - s / 2, s, s, [30, 30, 30, 30], { inset: 0.5 }));
        add(img('dailygift:daily_gift_unclaimed', x, y, { w: s * 0.96, h: s * 0.96 }));
      }
    };
    [[-145, 0], [0, 0], [145, 0], [-145, 150], [0, 150], [145, 150], [-145, 300]].slice(0, 6).forEach(([x, y], i) => slot(i + 1, cx + x * k, ry + y * k));
    // fila de abajo: el día 7… en Pet Rescue la casilla de la izquierda es el 7.º regalo pequeño y la ancha el bonus; aquí el
    // bonus ocupa la ancha y la pequeña enseña la racha
    const bx = cx + 72 * k, by = ry + 300 * k, bW = 275 * k, bH = 130 * k, b7 = D.day === 7, addB = W.grow(bx, by, 0.4);
    if (b7 && st.done) addB(img('petui:light_ray', bx, by, { w: bW * 1.3, h: bW * 1.3, rot: E.t * 0.6, alpha: 0.6, add: true }));
    addB(nine('levelmenu:booster_frame_outline', bx - bW / 2, by - bH / 2, bW, bH, [30, 30, 30, 30], { inset: 0.5 }));
    addB(nine(b7 && !st.done ? 'dailygift:daily_gift_bonus_back_selected' : 'dailygift:daily_gift_bonus_back', bx - bW / 2 + 5 * k, by - bH / 2 + 5 * k, bW - 10 * k, bH - 10 * k, [30, 30, 30, 30], { inset: 0.5 }));
    addB(img('dailygift:daily_gift_bonus_inside_glow', bx, by, { w: bW * 0.95, h: bH * 0.9, alpha: 0.7 }));
    addB(text(T('daily_gift_bonus', 'Bonus'), bx, by - 34 * k, 24 * k, { fill: '#ffffff', stroke: '#0f3f8f', sw: 3 * k }));
    prizeIcons(addB, D.prizes[6], bx, by + 18 * k, 62 * k);
    if (b7 && !st.done) { E.hotspot('gl_dg_bonus', bx - bW / 2, by - bH / 2, bW, bH, D.claim); addB(img('dailygift:daily_gift_bonus_selected_outline', bx, by, { w: bW * 1.08, h: bH * 1.15, alpha: 0.6 + Math.sin(E.t * 5) * 0.3 })); }
    if (D.day > 7 || (b7 && st.done)) addB(img('dailygift:daily_gift_claimed', bx + bW / 2 - 30 * k, by + bH / 2 - 30 * k, { w: 60 * k, h: 60 * k }));
    // racha: la casilla pequeña de abajo a la izquierda con el día en que va
    const sx = cx - 145 * k, addS = W.grow(sx, by, 0.36);
    addS(img('dailygift:daily_streak_back', sx, by, { w: 125 * k, h: 125 * k }));
    addS(text(T('dg_days', '{0}/{0} días').replace('{0}', D.day).replace('{0}', 7), sx, by + 4 * k, 28 * k, { fill: '#ffffff', stroke: '#0f3f8f', sw: 3 * k }));
    W.add(text(T('dg_new_description', '¡Inicia sesión cada día y logra recompensas!'), cx, cy + 232 * k, 24 * k, { fill: '#ffffff', stroke: '#0f3f8f', sw: 3 * k, wrap: 420 * k }));
    if (st.done) button(W, 'gl_dg_ok', 'green', cx, cy + 330 * k, 230 * k, 76 * k, '¡Estupendo!', D.finish, { delay: 0, size: 34 * k });
    else button(W, 'gl_dg_open', 'green', cx, cy + 330 * k, 230 * k, 76 * k, '¡Abrir!', D.claim, { delay: 0.5, size: 34 * k });
    void t;
  };
  // "¿Qué es esto?" (explicación de una pieza): el panel azul con el perro curioso y "¡Entendido!"
  WINDOWS.info = function (pop, I) {
    const P = bluePanel(pop, px(900)), { W, y, w, h } = P;
    W.add(img('popups:dog_playful', E.W / 2, y - px(30), { w: px(250), h: px(277), ay: 0.75 }));
    W.add(text(I.title, E.W / 2, y + px(130), px(84), { fill: '#fff6a0', stroke: '#1d4f9a', sw: px(9) }));
    // la explicación (nuestra, no es de Pet Rescue): grande para leerla bien, entre el título y el botón
    W.add(fitHelp(I.text, E.W / 2, y + px(440), w - px(110), px(460), px(70), { fill: '#ffffff', stroke: '#1d4f9a', sw: px(7) }));
    button(W, 'gl_ex_ok', 'green', E.W / 2, y + h - px(130), px(480), px(140), '¡Entendido!', I.ok, { delay: 0.2, size: px(58) });
  };
  // teclado para elegir nivel (para quien cuida la tablet): números en botones azules de Pet Rescue
  WINDOWS.pad = function (pop, K) {
    const P = bluePanel(pop, px(1400)), { W, y, h } = P;
    W.add(text('Ir al nivel', E.W / 2, y + px(100), px(66), { fill: '#ffffff', stroke: '#1d4f9a', sw: px(7) }));
    W.add(nine('popups:popup_normal_background_white', E.W / 2 - px(300), y + px(160), px(600), px(130), [40, 30, 40, 30], { inset: 0.5 }));
    W.add(text(K.val() || '—', E.W / 2, y + px(225), px(84), { fill: '#1a2c6b' }));
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach((key, i) => {
      const x = E.W / 2 + ((i % 3) - 1) * px(230), yy = y + px(400) + Math.floor(i / 3) * px(190), add = W.grow(x, yy, 0.1 + i * 0.02);
      const t = key === 'OK' ? 'petui:primary_btn' : key === '⌫' ? 'petui:btn_red' : 'petui:basicBlue_button_big_new'; // el azul cuadrado con borde blanco
      add(nine(t, x - px(100), yy - px(80), px(200), px(160), key.length > 1 || key === '⌫' ? [44, 44, 44, 44] : [56, 56, 56, 56], { inset: 0.5 }));
      add(text(key === '⌫' ? 'Borrar' : key, x, yy - px(6), key.length > 1 || key === '⌫' ? px(46) : px(76), { fill: '#ffffff', stroke: key === 'OK' ? '#2f8a1a' : key === '⌫' ? '#8e1c1c' : '#1d4f9a', sw: px(6) }));
      E.hotspot('gl_lp' + i, x - px(100), yy - px(80), px(200), px(160), () => K.press(key));
    });
    button(W, 'gl_lp_x', 'yellow', E.W / 2, y + h - px(120), px(420), px(130), 'Cancelar', K.cancel, { delay: 0.3, size: px(52) });
  };

  // ---------------------------------------------------------------- pantalla principal (la del Pet Rescue actual, sin mapa)
  // Escena nomap_main_bg_default: cielo, prado (86 % del alto, centrado al 57 %), árbol de fondo a la derecha, autocaravana
  // al 54 % (85 % del ancho) con su sombra, pino delante a la izquierda. Arriba, cápsulas como las de vidas/lingotes; abajo la
  // barra azul con el botón verde redondo del nivel y cuatro botones (medidas de la captura del emulador).
  GL.home = function (H) {
    if (!on()) return false;
    usedThisFrame = true; playedThisFrame = true; // el lienzo WebGL va debajo; el de siempre queda para ventanas y textos
    begin();
    const sky = looseTex('bg_sky.webp');
    const g0 = gfx(); g0.beginFill(0x8fd3f2); g0.drawRect(0, 0, E.W, E.H); g0.endFill();
    if (sky) img(sky, E.W / 2, 0, { ax: 0.5, ay: 0, w: E.W, h: E.H * 0.4 });
    for (const [x, y, w, fl] of [[0.15, 0.3, 0.3, false], [0.5, 0.4, 0.4, true], [0.8, 0.25, 0.4, true]]) {
      const t = tex('nomap:nomap_autumn_cloud'); if (t) img(t, E.W * x + Math.sin(E.t * 0.1 + x * 9) * px(20), E.H * y, { w: E.W * w, h: (E.W * w * t.orig.height) / t.orig.width, flipX: fl, alpha: 0.9 });
    }
    const base = tex('nomap:nomap_default_bg'); if (base) { const h = E.H * 0.86, w = (h * base.orig.width) / base.orig.height; img(base, E.W / 2, E.H * 0.57, { w: Math.max(w, E.W), h }); }
    const tb = tex('nomap:nomap_default_tree_bg'); if (tb) { const h = E.H * 0.8 * 0.2, w = (h * tb.orig.width) / tb.orig.height; img(tb, E.W * 0.98, E.H * 0.42, { ax: 0.5, ay: 1, w, h }); }
    const van = tex('nomap:nomap_default_van'), vs = tex('nomap:nomap_default_van_shadow');
    if (van) {
      const w = E.W * 0.85, h = (w * van.orig.height) / van.orig.width, y = E.H * 0.54 + Math.sin(E.t * 2) * px(4); // UpAndDown
      if (vs) img(vs, E.W / 2, E.H * 0.54 + h * 0.36, { w: w * 0.75, h: w * 0.75 * vs.orig.height / vs.orig.width, alpha: 0.8 });
      img(van, E.W / 2, y, { w, h });
    }
    const tp = tex('nomap:nomap_default_tree_portrait'); if (tp) { const h = E.H * 0.75, w = (h * tp.orig.width) / tp.orig.height; img(tp, E.W * 0.05, 0, { ax: 0.5, ay: 0, w, h }); }
    // cápsulas de arriba: cofre de estrellas (en lugar de las vidas) y racha (en lugar de los lingotes)
    // (piezas de Pet Rescue: el cofre morado de estrellas cc_chest_00 y la insignia de racha "On Fire" onfire_05)
    const pill = (x, icon, label, star) => {
      const gp = gfx(); gp.beginFill(0xc8e2f0); gp.drawRoundedRect(x, px(30), px(250), px(58), px(29)); gp.endFill();
      const t = tex(icon); if (t) { const h = px(92), w = (h * t.orig.width) / t.orig.height; img(t, x + px(10), px(59), { w, h }); }
      text(label, x + px(star ? 130 : 150), px(59), px(40), { fill: '#1d2c6b' });
      if (star) img('boosters:ootf_star', x + px(215), px(57), { w: px(50), h: px(48) });
    };
    pill(px(220), 'navbar:cc_chest_00', H.chest + '/' + H.CHEST, true);
    if (H.streak) pill(px(560), 'boosters:onfire_05', String(H.streak));
    // botones del original arriba a la derecha: trofeos (nuestros)
    img('levelmenu:topbar_generic_button', E.W - px(70), px(60), { w: px(96), h: px(96) });
    img('levelmenu:Crown_', E.W - px(70), px(58), { w: px(62), h: px(50) });
    E.hotspot('gl_h_ach', E.W - px(120), px(10), px(100), px(100), H.album);
    // nivel especial del día (nuestro), a la derecha sobre la barra, donde el original pone el mapa
    if (H.fiesta) {
      const fy = E.H - px(400);
      img('petui:btn_open', E.W - px(120), fy, { w: px(150), h: px(150), tint: H.fiesta.done ? 0x9aa3ad : 0xffffff });
      img('navbar:weather_gift1', E.W - px(120), fy, { w: px(100), h: px(100) }); // un regalo (el día especial es nuestro)
      E.hotspot('gl_h_fi', E.W - px(195), fy - px(75), px(150), px(150), H.openFiesta);
    }
    // barra de navegación azul con cinco huecos: Misiones · Desafío · [Jugar] · Trofeos · Ajustes
    const by = E.H - px(130), bh = px(170), bx0 = px(18), bw = E.W - px(36);
    const nb = gfx(); nb.beginFill(0xffffff); nb.drawRoundedRect(bx0 - px(4), by - bh / 2 - px(4), bw + px(8), bh + px(10), bh / 2); nb.endFill();
    nb.beginFill(0x3a5fd8); nb.drawRoundedRect(bx0, by - bh / 2, bw, bh, bh / 2); nb.endFill();
    nb.beginFill(0x4f78ec); nb.drawRoundedRect(bx0 + px(6), by - bh / 2 + px(4), bw - px(12), bh * 0.45, bh / 3); nb.endFill();
    const slots = [[px(135), 'petui:ico_events', 'Misiones', H.openMissions, H.missions ? H.missions + '' : null], [px(345), null, 'Desafío', H.openWeekly, null],
      [px(735), 'petui:ico_friends', 'Trofeos', H.album, null], [px(935), 'petui:ico_settings', 'Ajustes', H.settings, null]];
    for (const [x, icon, label, cb, badge] of slots) {
      if (icon) img(icon, x, by - px(28), { w: px(110), h: px(110) * tex(icon).orig.height / tex(icon).orig.width });
      else img('boosters:ootf_reward_pinata', x, by - px(32), { w: px(84), h: px(104) }); // la piñata del desafío diario de Pet Rescue
      text(label, x, by + px(48), px(36), { fill: '#ffffff', stroke: '#22339a', sw: px(3) });
      if (badge) { const bg = gfx(); bg.beginFill(0xe8322b); bg.lineStyle(px(4), 0xffffff); bg.drawCircle(x + px(48), by - px(70), px(26)); bg.endFill(); text(badge, x + px(48), by - px(70), px(30)); }
      E.hotspot('gl_h_' + label, x - px(95), by - bh / 2, px(190), bh, cb);
    }
    for (const x of [px(240), px(840)]) { const d = gfx(); d.beginFill(0x2b47b0); d.drawRect(x - px(2), by - bh * 0.35, px(4), bh * 0.7); d.endFill(); }
    // botón verde redondo con el número del nivel
    const pd = px(236) * (1 + 0.03 * Math.sin(E.t * 3));
    img('petui2:btn_play', E.W / 2, by - px(10), { w: pd, h: pd });
    text(String(H.level), E.W / 2 - px(8), by - px(10), px(H.level > 999 ? 50 : 66), { fill: '#8c7a6a' });
    E.hotspot('gl_h_play', E.W / 2 - pd / 2, by - px(10) - pd / 2, pd, pd, H.play);
    return true;
  };

  // ---------------------------------------------------------------- mascotas 3D (Improved_pets de Pet Rescue)
  // Gato y perro con su esqueleto y las animaciones game_*.ffa; la cara es otra pieza pegada al hueso "head" que cambia de
  // expresión. Se mueven en directo: huesos → vértices (2 huesos por vértice), vista con la inclinación de la escena
  // (Rotation x=6), triángulos de atrás adelante y sin las caras de detrás. Pelaje de cada mascota de nuestro juego:
  let PETDATA = null;
  // malla 3D con búfer de profundidad: posición en pantalla (x, y) + profundidad propia; se borra la profundidad antes de
  // cada mascota para que no se mezclen entre ellas
  const VS3 = `precision highp float; attribute vec2 aVertexPosition; attribute float aDepth; attribute vec2 aTextureCoord;
    uniform mat3 projectionMatrix; uniform mat3 translationMatrix; varying vec2 vUv;
    void main(){ vec3 p = projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0); gl_Position = vec4(p.xy, aDepth, 1.0); vUv = aTextureCoord; }`;
  const FS3 = `precision mediump float; varying vec2 vUv; uniform sampler2D uSampler; uniform float uAlpha;
    void main(){ vec4 c = texture2D(uSampler, vUv); if (c.a < 0.02) discard; gl_FragColor = c * uAlpha; }`;
  let prog3 = null;
  function mesh3(texture, nv, uv, idx) {
    prog3 = prog3 || PIXI.Program.from(VS3, FS3);
    const geo = new PIXI.Geometry().addAttribute('aVertexPosition', new Float32Array(nv * 2), 2).addAttribute('aDepth', new Float32Array(nv), 1)
      .addAttribute('aTextureCoord', uv, 2).addIndex(idx);
    const sh = new PIXI.Shader(prog3, { uSampler: texture, uAlpha: 1 });
    const st = PIXI.State.for2d(); st.depthTest = true; st.blend = true;
    const m = new PIXI.Mesh(geo, sh, st);
    const r0 = m._render.bind(m);
    m._render = (renderer) => { const gl = renderer.gl; if (m.clearDepth) { gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); } gl.depthFunc(gl.LEQUAL); r0(renderer); };
    m.keep = true; return m;
  }
  const COAT = { '🐶': ['dog', 'dog_classic'], '🐱': ['cat', 'cat_striped'], '🐰': ['cat', 'cat_white'], '🐷': ['dog', 'dog_pug'], '🐼': ['cat', 'cat_texture_black'],
    '🐹': ['dog', 'dog_border_collie'], '🐸': ['cat', 'cat_calico'], '🐵': ['dog', 'dog_dalmatian'], '🐨': ['dog', 'dog_grey'], '🦊': ['cat', 'cat_texture_orange'] };
  const b64 = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
  function decodePets(d) {
    const out = { models: {}, anims: {} };
    for (const [n, m] of Object.entries(d.models)) {
      const o = { nv: m.nv, pos: b64(m.pos, Float32Array), uv: b64(m.uv, Float32Array), tri: b64(m.tri, Uint16Array) };
      if (m.bi) Object.assign(o, { bi: b64(m.bi, Uint16Array), w: b64(m.w, Float32Array), parent: m.parent, bind: b64(m.bind, Float32Array), inv: b64(m.inv, Float32Array), names: m.names });
      let lo = 1e9, hi = -1e9; for (let i = 0; i < m.nv; i++) { const y = o.pos[i * 3 + 1]; lo = Math.min(lo, y); hi = Math.max(hi, y); } o.h = hi - lo; o.y0 = lo;
      out.models[n] = o;
    }
    for (const [n, a] of Object.entries(d.anims)) out.anims[n] = { fps: a.fps, nf: a.nf, tracks: a.tracks.map((t) => b64(t, Float32Array)) };
    return out;
  }
  // matrices 4x4 por filas con la traslación en la última fila (v' = v·M), como las de King
  function mul(a, ao, b, bo, o) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[ao + i * 4 + k] * b[bo + k * 4 + j]; o[i * 4 + j] = s; } }
  const petState = new Map(); // id de la mascota → { anim, t0, blink, mesh… }
  const IDLE = ['game_idle_1', 'game_idle_2', 'game_spec_1', 'game_spec_2', 'game_spec_3'];
  function chooseAnim(t, st, dying) {
    const now = E.t;
    let want = st.anim;
    if (dying) want = 'game_happy';
    else if ((t.vy || 0) > 3) want = 'game_fall';
    else if (st.anim === 'game_fall') want = 'game_land';
    else if (st.anim === 'game_land' && now - st.t0 < 0.7) want = 'game_land';
    else if (!IDLE.includes(st.anim) || now - st.t0 > st.dur) { // reposo: casi siempre game_idle_1, a veces otra
      const r = Math.random(); want = r < 0.6 ? 'game_idle_1' : r < 0.75 ? 'game_idle_2' : IDLE[2 + ((Math.random() * 3) | 0)];
      if (want === st.anim) { st.t0 = now; }
    }
    if (want !== st.anim) { st.anim = want; st.t0 = now; const A = PETDATA.anims[want]; st.dur = A ? (A.nf / A.fps) * (want === 'game_idle_1' ? 1 : 1) : 2; }
  }
  function petMesh(t, x, yFeet, sc, alpha, B) {
    const [kind, coat] = COAT[t.pet] || ['cat', 'cat_striped'];
    const M = PETDATA.models[kind + '_ingame'], F = PETDATA.models[kind + '_face']; if (!M) return null;
    let st = petState.get(t.id);
    if (!st) { st = { anim: '', t0: 0, dur: 0, off: Math.random() * 3, blinkAt: E.t + 1 + Math.random() * 3 }; petState.set(t.id, st); if (petState.size > 80) petState.delete(petState.keys().next().value); }
    const dying = B.dying.some((d) => d.t === t && d.age > 0);
    chooseAnim(t, st, dying);
    const A = PETDATA.anims[st.anim], nb = M.parent.length;
    const speed = st.anim.startsWith('game_idle') ? 1.2 : 1;
    let f = Math.floor((E.t - st.t0 + (st.anim === 'game_idle_1' ? st.off : 0)) * A.fps * speed);
    f = st.anim === 'game_land' ? Math.min(A.nf - 1, f) : f % A.nf;
    if (window.GLF && GLF.frame != null) f = GLF.frame;
    // huesos: mundo = local · mundo del padre; piel = inversa de reposo · mundo
    const world = st.world || (st.world = new Float32Array(nb * 16)), skin = st.skin || (st.skin = new Float32Array(nb * 16)), tmp = new Float32Array(16);
    for (let i = 0; i < nb; i++) {
      const tr = A.tracks[i], L = tr && tr.length ? tr : M.bind, lo = tr && tr.length ? Math.min(f, tr.length / 16 - 1) * 16 : i * 16;
      const p = M.parent[i];
      if (p < 0) for (let k = 0; k < 16; k++) world[i * 16 + k] = L[lo + k];
      else { mul(L, lo, world, p * 16, tmp); world.set(tmp, i * 16); }
      mul(M.inv, i * 16, world, i * 16, tmp); skin.set(tmp, i * 16);
    }
    // vista: inclinada 6° (la de la escena) y vista un poco desde arriba; tamaño: la altura de la casilla
    const k = ((B.tsy * 1.3) / M.h) * (sc == null ? 1 : sc), ca = Math.cos(0.16), sa = Math.sin(0.16);
    const nv = M.nv, P = st.P || (st.P = new Float32Array(nv * 2)), Z = st.Z || (st.Z = new Float32Array(nv));
    for (let v = 0; v < nv; v++) {
      let X = 0, Y = 0, Zz = 0;
      const px0 = M.pos[v * 3], py0 = M.pos[v * 3 + 1], pz0 = M.pos[v * 3 + 2];
      for (let j = 0; j < 2; j++) {
        const w = M.w[v * 2 + j]; if (!w) continue;
        const o = M.bi[v * 2 + j] * 16;
        X += w * (px0 * skin[o] + py0 * skin[o + 4] + pz0 * skin[o + 8] + skin[o + 12]);
        Y += w * (px0 * skin[o + 1] + py0 * skin[o + 5] + pz0 * skin[o + 9] + skin[o + 13]);
        Zz += w * (px0 * skin[o + 2] + py0 * skin[o + 6] + pz0 * skin[o + 10] + skin[o + 14]);
      }
      const FL = window.GLF || {}, mz = FL.mz != null ? FL.mz : 1, mx = FL.mx != null ? FL.mx : 1; // pruebas de orientación
      const y2 = (Y - M.y0) * ca - mz * Zz * sa, z2 = (Y - M.y0) * sa + mz * Zz * ca;
      P[v * 2] = x + mx * X * k; P[v * 2 + 1] = yFeet - y2 * k; Z[v] = z2;
    }
    // profundidad: más z = más cerca (como el render de tools/king_ffm.py) → depth = 0.5 - z·escala
    const D = st.D || (st.D = new Float32Array(nv)), zk = 0.4 / (M.h || 1);
    for (let v = 0; v < nv; v++) D[v] = 0.5 - Z[v] * zk;
    const tx = tex('petsatlas:' + coat);
    if (!st.mesh || st.coat !== coat) {
      const uv = new Float32Array(nv * 2), bw = tx.baseTexture.width, bh = tx.baseTexture.height, fr = tx.frame, tr0 = tx.trim || { x: 0, y: 0 }, W = tx.orig.width, H = tx.orig.height;
      for (let v = 0; v < nv; v++) { uv[v * 2] = (fr.x + M.uv[v * 2] * W - tr0.x) / bw; uv[v * 2 + 1] = (fr.y + M.uv[v * 2 + 1] * H - tr0.y) / bh; }
      st.mesh = mesh3(tx.baseTexture, nv, uv, M.tri); st.mesh.clearDepth = true; st.coat = coat;
    }
    st.mesh.geometry.getBuffer('aVertexPosition').update(P);
    st.mesh.geometry.getBuffer('aDepth').update(D);
    st.mesh.shader.uniforms.uAlpha = alpha == null ? 1 : alpha;
    // cara: pegada al hueso de la cabeza (girada -10°), con su expresión
    const hi = M.names.indexOf('head');
    if (!st.face) { st.face = mesh3(tex('petsatlas:' + kind + '_default').baseTexture, F.nv, new Float32Array(F.nv * 2), F.tri); }
    let expr = 'default';
    if (dying || st.anim === 'game_happy' || st.anim === 'game_win') expr = 'happy';
    else if (st.anim === 'game_fall') expr = 'scream';
    else if (E.t > st.blinkAt) { expr = 'blink'; if (E.t > st.blinkAt + 0.14) st.blinkAt = E.t + 2 + Math.random() * 3; }
    const ft = tex('petsatlas:' + kind + '_' + expr) || tex('petsatlas:' + kind + '_default');
    if (st.faceTex !== ft) {
      st.faceTex = ft;
      const uv = st.face.geometry.getBuffer('aTextureCoord').data, bw = ft.baseTexture.width, bh = ft.baseTexture.height, fr = ft.frame, tr0 = ft.trim || { x: 0, y: 0 }, W = ft.orig.width, H = ft.orig.height;
      for (let v = 0; v < F.nv; v++) { uv[v * 2] = (fr.x + F.uv[v * 2] * W - tr0.x) / bw; uv[v * 2 + 1] = (fr.y + F.uv[v * 2 + 1] * H - tr0.y) / bh; }
      st.face.geometry.getBuffer('aTextureCoord').update(uv);
    }
    const fp = st.face.geometry.getBuffer('aVertexPosition').data, fd = st.face.geometry.getBuffer('aDepth').data, ho = hi * 16, cr = Math.cos(-0.1745), sr = Math.sin(-0.1745);
    for (let v = 0; v < F.nv; v++) {
      const a0 = F.pos[v * 3], b0 = F.pos[v * 3 + 1], c0 = F.pos[v * 3 + 2];
      const b1 = b0 * cr - c0 * sr, c1 = b0 * sr + c0 * cr; // giro de -10° en x
      const X = a0 * world[ho] + b1 * world[ho + 4] + c1 * world[ho + 8] + world[ho + 12];
      const Y = a0 * world[ho + 1] + b1 * world[ho + 5] + c1 * world[ho + 9] + world[ho + 13];
      const Zz = a0 * world[ho + 2] + b1 * world[ho + 6] + c1 * world[ho + 10] + world[ho + 14];
      const FL = window.GLF || {}, mz = FL.mz != null ? FL.mz : 1, mx = FL.mx != null ? FL.mx : 1; // pruebas de orientación
      const y2 = (Y - M.y0) * ca - mz * Zz * sa, z2 = (Y - M.y0) * sa + mz * Zz * ca;
      fp[v * 2] = x + mx * X * k; fp[v * 2 + 1] = yFeet - y2 * k; fd[v] = 0.5 - z2 * zk - 0.002; // la cara, un pelo por delante
    }
    st.face.geometry.getBuffer('aVertexPosition').update(fp);
    st.face.geometry.getBuffer('aDepth').update(fd);
    st.face.shader.uniforms.uAlpha = st.mesh.shader.uniforms.uAlpha;
    // sombra redonda bajo las patas
    if (!st.shadow) { st.shadow = new PIXI.Sprite(tex('petsatlas:shadow_blob')); st.shadow.anchor.set(0.5); st.shadow.keep = true; }
    st.shadow.position.set(x, yFeet - B.tsy * 0.04); st.shadow.width = B.ts * 0.8 * (sc || 1); st.shadow.height = B.tsy * 0.22 * (sc || 1); st.shadow.alpha = 0.6 * st.mesh.shader.uniforms.uAlpha;
    return st;
  }

  // cabecera de Pet Rescue: banda turquesa con la puntuación y el engranaje; banda crema a rayas con las mascotas y las estrellas
  const hudLast = {}; // para los efectos del contador de mascotas (PetCounter) y de movimientos (MoveBling)
  function drawHud(st, B) {
    if (hudLast.st !== st.P) { hudLast.st = st.P; hudLast.left = hudLast.moves = null; }
    const P = st.P, g = gfx();
    g.beginFill(0x42d3f0); g.drawRect(0, 0, E.W, px(86)); g.endFill();
    g.beginFill(0x3bc4e4); g.drawRect(0, px(80), E.W, px(6)); g.endFill();
    g.beginFill(0xffeec4); g.drawRect(0, px(86), E.W, px(HUD_H - 86)); g.endFill();
    // rayas diagonales suaves de la banda crema
    const gs = gfx(); gs.beginFill(0xfde4b6, 1);
    for (let x = -px(200); x < E.W + px(200); x += px(150)) gs.drawPolygon([x, px(HUD_H - 4), x + px(60), px(HUD_H - 4), x + px(60) + px(130), px(92), x + px(130), px(92)]);
    gs.endFill();
    const gl = gfx(); gl.beginFill(0xe5d5a8); gl.drawRect(0, px(HUD_H - 6), E.W, px(6)); gl.endFill();
    gl.beginFill(0xbcb3a3, 0.6); gl.drawRect(0, px(86), E.W, px(5)); gl.endFill();
    // puntuación en su cápsula oscura
    const sp = gfx(); sp.beginFill(0x2c7fae, 0.85); sp.drawRoundedRect(E.W / 2 - px(103), px(19), px(206), px(60), px(30)); sp.endFill();
    const score = String(Math.max(0, Math.round(P.score || 0))).padStart(6, '0');
    text(score, E.W / 2, px(50), px(46), { fill: '#ffffff', stroke: '#2b5c8a', sw: px(5) });
    // engranaje: botón azul redondo con la rueda blanca
    const gx = px(1015), gy = px(75);
    img('levelmenu:topbar_generic_button', gx, gy, { w: px(96), h: px(96) });
    img('levelmenu:utility_button', gx, gy, { w: px(56), h: px(56), tint: 0xdfe8ff });
    E.hotspot('gl_pause', gx - px(50), gy - px(50), px(100), px(100), st.openPause);
    // mascotas: cápsula con la cara del gato y "0/2"
    const goal = (P.goals || [])[0];
    nine('hud:game_hud_progressbar_bg', px(100), px(158), px(302), px(58), [30, 30, 30, 30], { tint: 0xe3a776, inset: 0.45 });
    img('hud:cat_icon', px(148), px(180), { w: px(104), h: px(92) });
    if (goal) {
      if (hudLast.left != null && goal.left < hudLast.left) E.kfx('PetCounter', px(148), px(180), px(1.2)); // una mascota más a salvo
      hudLast.left = goal.left;
      const tot = goal.count, label = Math.max(0, tot - goal.left) + '/' + tot;
      text(label, px(270), px(189), px(44), { fill: '#ffffff', stroke: '#2f6db5', sw: px(5) });
    }
    E.hotspot('gl_ask', px(90), px(140), px(330), px(90), st.ask);
    // estrellas: cápsula con tres palitos y sus estrellas
    nine('hud:game_hud_progressbar_bg', px(677), px(158), px(290), px(58), [30, 30, 30, 30], { tint: 0xe3a776, inset: 0.45 });
    const stars = [px(722), px(830), px(925)];
    const got = starsNow(st);
    stars.forEach((x, i) => {
      img('hud:game_hud_star_target', x, px(178), { w: px(14), h: px(78) });
      img(i < got ? 'hud:game_hud_star_full' : 'hud:game_hud_star_empty', x, px(122), { w: px(58), h: px(54) });
    });
    // movimientos que quedan (Pet Rescue los pone en la cápsula de la puntuación cuando hay límite)
    if (isFinite(P.moves) && P.moves < 900 && hudLast.moves != null && P.moves > hudLast.moves) E.kfx('MoveBling', px(115), px(50), px(1.2)); // movimientos de más
    hudLast.moves = P.moves;
    if (isFinite(P.moves) && P.moves < 900) { // movimientos que quedan, en su cápsula a la izquierda (pendiente de ver dónde los pone el original)
      const mp = gfx(); mp.beginFill(0x2c7fae, 0.85); mp.drawRoundedRect(px(40), px(19), px(150), px(60), px(30)); mp.endFill();
      text(String(P.moves), px(115), px(50), px(42), { fill: '#ffffff', stroke: '#2b5c8a', sw: px(5) });
    }
  }
  function starsNow(st) {
    const P = st.P, sp = st.spec; if (!sp || !sp.starScores) return 0;
    let n = 0; for (const s of sp.starScores) if ((P.score || 0) >= s) n++; return n;
  }

  // cohete recargable: la escena rechargeable_booster_horizontal de Pet Rescue (barra con el gato ayudante y el cohete);
  // lleno, el botón grande con rayos. Tocarlo apunta a una columna (como siempre, P.down sobre el cohete)
  // apuntado del cohete (grabado del Pet Rescue real, nivel 5): de pie en su columna dentro de un rayo rosa, subiendo y
  // bajando despacio; abajo solo ✗ (cancelar) y ✓ (disparar). Al disparar sale volando por arriba.
  let beamTex = null;
  function drawRocketAim(st, B) {
    const ic = tex('petui:booster_column_blast');
    const top = B.by, bottom = B.by + B.V * B.tsy;
    if (B.rocketAim) {
      beamTex = beamTex || PIXI.Texture.from(E.privBase() + 'fx_columnselect2.png');
      const x = B.cx(B.aimCol), h = bottom - top + B.tsy, t = E.t;
      const gc = gfx(); gc.blendMode = PIXI.BLEND_MODES.ADD; gc.beginFill(0xd01aa0, 0.35); gc.drawRect(x - B.ts / 2, top, B.ts, bottom - top); gc.endFill(); // la columna se tiñe de rosa
      img(beamTex, x, (top + bottom) / 2, { w: B.ts * 1.3, h: h * 1.05, tint: 0xff2ec8, add: true, alpha: 0.85 });
      img(beamTex, x, (top + bottom) / 2, { w: B.ts * 0.55, h: h, tint: 0xffffff, add: true, alpha: 0.9 + 0.1 * Math.sin(t * 9) });
      if (Math.random() < 0.5) E.kfx('columnselect', x + (Math.random() - 0.5) * B.ts * 0.4, top + Math.random() * (bottom - top), B.ts / 160, null, 1);
      if (ic) { const rh = B.tsy * 2.1, rw = rh * ic.orig.width / ic.orig.height, y = bottom - rh * 0.55 - (0.5 + 0.5 * Math.sin(t * 2.2)) * (bottom - top) * 0.35; img(ic, x, y, { w: rw, h: rh }); }
    }
    const sh = B.rocketShot; // vuelo hacia arriba tras disparar
    if (sh && ic) {
      const k = (E.t - sh.t0) / 0.45; if (k < 1) {
        const x = B.cx(sh.c), rh = B.tsy * 2.1, rw = rh * ic.orig.width / ic.orig.height, y = bottom - rh / 2 - k * (bottom - top + rh * 2);
        beamTex = beamTex || PIXI.Texture.from(E.privBase() + 'fx_columnselect2.png');
        img(beamTex, x, (top + bottom) / 2, { w: B.ts * 1.2, h: bottom - top, tint: 0xff2ec8, add: true, alpha: 0.8 * (1 - k) });
        img(ic, x, y, { w: rw, h: rh });
      }
    }
  }
  function drawAimButtons(st) {
    const y = E.H - px(115), d = px(150), t = E.t;
    img('boosters:sunsplash', px(780), y, { w: d * 1.9, h: d * 1.9, rot: t * 0.5, alpha: 0.55, tint: 0xfff6a0 });
    img('levelmenu:exit_button', px(240), y, { w: d * 0.82, h: d * 0.82 });
    img('levelmenu:btn_primary', px(780), y, { w: d * 0.82, h: d * 0.82 }); // botón verde redondo con la marca blanca
    img('levelmenu:v', px(780), y, { w: d * 0.45, h: d * 0.45 });
    E.hotspot('gl_aim_x', px(240) - d / 2, y - d / 2, d, d, () => st.P.cancelRocket());
    E.hotspot('gl_aim_ok', px(780) - d / 2, y - d / 2, d, d, () => st.P.fireRocket());
  }

  let rackFullAt = null;
  // medidas del juego real (1080 de ancho): barra de 465×88 px centrada en x=488, disco de 170 px en x=735; lleno, el disco
  // dorado de 190 px en el centro con rayos. Todo a la altura B.rackY (330 px sobre el borde de abajo)
  function drawRack(st, B) {
    const full = B.full, y = B.rackY;
    if (full && rackFullAt == null) rackFullAt = E.t; if (!full) rackFullAt = null;
    if (full) {
      const t = E.t - rackFullAt, pulse = 1 + 0.04 * Math.sin(t * 5);
      img('boosters:sunsplash', E.W / 2, y, { w: px(420), h: px(420), rot: t * 0.4, alpha: 0.7, tint: 0xfff457 });
      img('popups:building_card_raysun', E.W / 2, y, { w: px(330), h: px(330), rot: -t * 0.25, alpha: 0.5, tint: 0xfff9a0 });
      img('hud:booster_round_back', E.W / 2, y, { w: px(190) * pulse, h: px(190) * pulse });
      const ic = tex('petui:booster_column_blast'); if (ic) img(ic, E.W / 2, y - px(4), { w: px(150) * ic.orig.width / ic.orig.height * pulse, h: px(150) * pulse, rot: -0.5 });
      return;
    }
    // barra: marco blanco con el hueco gris azulado; el relleno amarillo crece con la carga
    nine('petui2:progress_bar_container', px(488 - 232), y - px(44), px(465), px(88), [48, 0, 48, 0], { inset: 0.5 });
    const fw = (px(465) - px(40)) * Math.min(1, B.chargeShown);
    if (fw > px(20)) nine('hud:game_hud_progressbar_bg_buffbuddies', px(488 - 232 + 20), y - px(24), fw, px(48), [20, 20, 20, 20], { inset: 0.5 });
    // gato ayudante asomado (escena booster_cat_horizontal de Pet Rescue: cabeza, cuerpo, ojos que parpadean, patitas)
    GL.scene('booster_cat', px(495), y - px(18), px(1.6));
    // disco del cohete: brillo azul, aro blanco (dos mitades) y el cohete inclinado
    const dx = px(735);
    img('hud:progress_bar_booster_frame', dx, y, { ax: 1, ay: 0.5, w: px(88), h: px(176) });
    img('hud:progress_bar_booster_frame', dx, y, { ax: 1, ay: 0.5, w: px(88), h: px(176), flipX: true });
    img('hud:booster_round_back_started', dx, y, { w: px(146), h: px(146) }); // el interior azul encima del hueco gris del aro
    const ic = tex('petui:booster_column_blast'); if (ic) img(ic, dx, y - px(4), { w: px(118) * ic.orig.width / ic.orig.height, h: px(118), rot: -0.5 });
  }

  // potenciadores: discos azules abajo del todo (booster_round_back_s) con su dibujo y el número
  const BICON = { hammer: 'boosters:booster_round_hammer', column: 'boosters:booster_round_rocket', row: 'boosters:booster_round_blaster', colorpop: 'boosters:booster_round_colourpop' };
  function drawBoosters(st) {
    const items = GAME.boosters || [], n = items.length;
    const gb0 = gfx(); gb0.beginFill(0xffeec4); gb0.drawRect(0, E.H - px(100), E.W, px(100)); gb0.endFill();
    gb0.beginFill(0xe5d5a8); gb0.drawRect(0, E.H - px(100), E.W, px(5)); gb0.endFill();
    const y = E.H - px(80), d = px(150), gap = (E.W - n * d) / (n + 1);
    items.forEach((b, i) => {
      const x = gap + d / 2 + i * (d + gap), have = st.boosterLeft(b.id), active = st.booster === b.id;
      img('boosters:booster_frame_button', x, y + px(8), { w: d * 0.92, h: d * 0.92, tint: active ? 0xfff0a0 : 0x3a86c8 });
      const ic = tex(BICON[b.id]) || tex('hud:' + ({ hammer: 'blockbuster_chargeable', column: 'columnblast_chargeable', row: 'lineblast_chargeable', colorpop: 'colorpop_chargeable' })[b.id]);
      if (ic) { const s2 = (d * 0.95) / Math.max(ic.orig.width, ic.orig.height); img(ic, x, y - px(16), { w: ic.orig.width * s2, h: ic.orig.height * s2 }); }
      const cx = x + d * 0.3, cy = y + d * 0.3;
      const gb = gfx(); gb.beginFill(have ? 0xe8322b : 0x3cb93c); gb.lineStyle(px(4), 0xffffff); gb.drawCircle(cx, cy, px(24)); gb.endFill();
      text(have === Infinity ? '∞' : have > 0 ? String(have) : '+', cx, cy, px(30), { fill: '#ffffff' });
      E.hotspot('gl_b_' + b.id, x - d / 2, y - d / 2, d, d, () => st.useBooster(b));
    });
  }
})();
