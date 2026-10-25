// "Burbujas HD": la pantalla de juego de Burbujas con WebGL (PixiJS), como el Panda Pop real (Unity). WebGL dibuja
// el fondo, las burbujas con sus crías vivas (Spine BabyPanda), mamá panda viva (Spine mamapanda_nocostume), las crías
// en paracaídas y los reventones con las partículas de Panda Pop (tools/unity_fx.py → gl/fx/); el resto (farolillos,
// cesto, burbuja en las manos, tiro, puntería y textos) lo sigue pintando game.js encima, en 2D ('tiles2d').
// Las reglas siguen en game.js. El motor llama a: GL.resize · GL.play · GL.fx · GL.frameEnd
(function () {
  const GL = (window.GL = {});
  let app = null, view = null, root = null, ready = false, failed = false, usedThisFrame = false, playedThisFrame = false;
  const atlases = {}, texCache = new Map();
  const ATLASES = ['pp_ui', 'pp_pow', 'pp_cel', 'pp_pop', 'pp_obs'];
  const REF = 1080;
  const px = (v) => (v * E.W) / REF; // píxeles de la captura de 1080 → unidades del juego
  const glOk = (() => { try { const c = document.createElement('canvas'); return !!(window.PIXI && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } })();
  // pantalla de carga de Panda Pop: su fondo y LoadingCircle girando
  GL.carga = { color: '#7ec8f0', fondo: { f: 'fondo.jpg' }, piezas: [{ f: 'giro.png', x: 0.5, y: 0.5, w: 0.1, anim: 'giro' }] };
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
      root = new PIXI.Container(); app.stage.addChild(root); GL._stage = app.stage; GL._app = app; // para revisar desde la consola
      load();
    } catch (e) { failed = true; console.warn('WebGL no disponible', e); }
  }
  function load() {
    const base = E.privBase() + 'gl/';
    let left = ATLASES.length;
    const done = () => { if (--left <= 0) ready = true; };
    for (const name of ATLASES) {
      const x = new XMLHttpRequest(); x.open('GET', base + name + '.json');
      x.onload = () => { try { const d = JSON.parse(x.responseText); atlases[name] = { frames: d.frames, base: d.images.map((f) => PIXI.BaseTexture.from(base + f)) }; } catch (e) { console.warn('atlas', name, e); } done(); };
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

  let shownFrames = 0;

  // ---------------------------------------------------------------- partículas de Unity (tools/unity_fx.py → gl/fx/fx.json)
  // Simulador de los ParticleSystem de Toy Blast con lo que usan sus efectos: ráfagas y ritmo de emisión, vida, rapidez,
  // tamaño, giro y color de inicio (constantes, curvas o al azar entre dos), forma (caja, esfera, cono, círculo),
  // gravedad, velocidad, fuerza y límite a lo largo de la vida, tamaño/giro/color según la vida y hoja de fotogramas.
  // Se simula en 3D y se dibuja su X e Y (la cámara es ortográfica). k = px por unidad del prefab.
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
      if (o.solo && !o.solo.test(s.nombre)) continue;
      const rr = rnd(), kk = k * (s.escalado !== 2 && s.esc ? Math.abs(s.esc[0]) || 1 : 1); // escala de la jerarquía (modos Hierarchy y Local)
      const px0 = o.noPos ? 0 : s.pos[0] * k, py0 = o.noPos ? 0 : -s.pos[1] * k;
      fxRun.push({ s, x: x + px0, y: y + py0, dx: px0, dy: py0, k: kk, t: -mmv(s.retraso, 0, rr), parts: [], bursts: (s.emision ? s.emision.rafagas : []).map(() => 0), acc: 0, tint: o.tintRe && !o.tintRe.test(s.nombre) ? null : o.tint, rot: ((s.rot || 0) * Math.PI) / 180, follow: o.follow, life: 0 });
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
  function drawFx() {
    for (const e of fxRun) {
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

  // ---------------------------------------------------------------- esqueletos Spine 3.5 de Panda Pop (gl/spine/, pasados a
  // JSON 3.7 con tools/spine21_json.py) con el lector de pixi-spine 3.7, que va solo en privado/ (como en los otros HD)
  const SPN = { json: {}, atlas: {}, data: {}, h: {}, pages: {} }, SPINES = ['MamaPanda_game', 'BabyPanda', 'DragonBubble_V02'];
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
      const atlas = new PIXI.spine.TextureAtlas(at, (page, cb) => { const bt = PIXI.BaseTexture.from(E.privBase() + 'gl/spine/' + page); (SPN.pages[n] = SPN.pages[n] || []).push(bt); cb(bt); });
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
    if (o && o.skin && sp.skinName !== o.skin) { sp.skeleton.setSkinByName(o.skin); sp.skeleton.setSlotsToSetupPose(); sp.skinName = o.skin; if (o.hide) for (const h of o.hide) { const sl = sp.skeleton.findSlot(h); if (sl) sl.color.a = 0; } }
    if (sp.anim !== anim || t < sp.t) { sp.state.setAnimation(0, anim, !!(o && o.loop)); sp.anim = anim; sp.t = 0; sp.update(0); }
    if (t > sp.t) { sp.update(t - sp.t); sp.t = t; }
    if (o && o.fitH) { // k = alto que debe medir en pantalla, según el alto del esqueleto en la primera animación que se dibuje
      const hk = n + ':' + anim; if (!SPN.h[hk]) { const b = sp.getLocalBounds(); SPN.h[hk] = Math.max(1, b.height); } // getLocalBounds no cuenta su propia escala
      k = k / (o.fitKey ? SPN.h[n + ':' + o.fitKey] || SPN.h[hk] : SPN.h[hk]);
    }
    sp.position.set(x, y); sp.scale.set(k * ((o && o.sc) || 1) * (o && o.flipX ? -1 : 1), k * ((o && o.sc) || 1)); sp.alpha = o && o.alpha != null ? o.alpha : 1;
    root.addChild(sp); return true;
  }
  GL.drawSpine = drawSpine; GL.spineData = spineData;


  // animaciones de Spine "horneadas": en la tablet, cada ranura de Spine es una llamada de dibujo y 7 crías vivas (78
  // ranuras cada una) la dejaban a 15 fps; así que las de las crías se pasan una vez a fotogramas (30 por segundo, a la
  // resolución de la pantalla) y se dibujan como imágenes. Mamá panda sigue viva (es una sola)
  const baked = new Map();
  const bakeQ = new Map(); let bakeBusy = false;
  // durante el dibujo del fotograma la lámina salía vacía: se hornea después, en GL.frameEnd
  function bake(n, anim, o) {
    const key = n + ':' + anim + ':' + o.px; const b = baked.get(key); if (b !== undefined) return b;
    if (!bakeQ.has(key)) bakeQ.set(key, [n, anim, o]);
    return null;
  }
  GL._bakeNow = (n, anim, o) => bakeNow(n, anim, o);
  function bakeNow(n, anim, o) {
    const key = n + ':' + anim + ':' + o.px; let b = baked.get(key); if (b !== undefined) return b;
    const sd = spineData(n); if (!sd) return null;
    if ((SPN.pages[n] || []).some((bt) => !bt.valid)) return null; // sin sus láminas cargadas saldrían fotogramas vacíos
    const A = sd.findAnimation(anim); if (!A) { baked.set(key, false); return false; }
    const sp = new PIXI.spine37.Spine(sd); sp.autoUpdate = false;
    if (o.skin) { sp.skeleton.setSkinByName(o.skin); sp.skeleton.setSlotsToSetupPose(); }
    if (o.hide) for (const h of o.hide) { const sl = sp.skeleton.findSlot(h); if (sl) sl.color.a = 0; }
    const fps = 30, N = Math.max(1, Math.round(A.duration * fps));
    sp.state.setAnimation(0, anim, true); sp.update(0);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, h0 = 0;
    for (let i = 0; i < N; i++) { const bb = sp.getLocalBounds(); if (!i) h0 = bb.height; x0 = Math.min(x0, bb.x); y0 = Math.min(y0, bb.y); x1 = Math.max(x1, bb.x + bb.width); y1 = Math.max(y1, bb.y + bb.height); sp.update(1 / fps); }
    const k = o.px / (o.fitH ? (o.refH || h0 || 1) : 1), res = E.scale * (app.renderer.resolution || 1), W = Math.ceil((x1 - x0) * k * res) + 2, H = Math.ceil((y1 - y0) * k * res) + 2;
    const cols = Math.max(1, Math.floor(2048 / W)), perPage = cols * Math.max(1, Math.floor(2048 / H)); // varias láminas si hace falta
    if (H > 2048 || W > 2048) { baked.set(key, false); return false; }
    const rts = [];
    sp.state.setAnimation(0, anim, true); sp.update(0);
    const frames = [];
    for (let i = 0; i < N; i++) {
      const pg = Math.floor(i / perPage), j = i % perPage;
      if (!rts[pg]) { const left = Math.min(perPage, N - pg * perPage); rts[pg] = PIXI.RenderTexture.create({ width: Math.min(left, cols) * W, height: Math.ceil(left / cols) * H }); }
      const rt = rts[pg], cx = (j % cols) * W, cy = Math.floor(j / cols) * H;
      sp.scale.set(k * res); sp.position.set(cx - x0 * k * res + 1, cy - y0 * k * res + 1);
      if (j === 0) app.renderer.render(sp, { renderTexture: rt, clear: true }); // la primera vez sale vacía (sube las texturas): se repite
      app.renderer.render(sp, { renderTexture: rt, clear: j === 0 });
      frames.push(new PIXI.Texture(rt.baseTexture, new PIXI.Rectangle(cx, cy, W, H)));
      sp.update(1 / fps);
    }
    sp.destroy();
    // si la lámina de Spine aún no estaba en la tarjeta gráfica, el horneado sale vacío: se comprueba y se repite luego
    const px = app.renderer.extract.pixels(new PIXI.Sprite(frames[0]));
    let any = false; for (let i = 3; i < px.length; i += 16) if (px[i] > 10) { any = true; break; }
    if (!any) { for (const rt of rts) rt.destroy(true); return null; }
    b = { frames, fps, dur: A.duration, ax: (-x0 * k * res + 1) / W, ay: (-y0 * k * res + 1) / H, w: W / res, h: H / res };
    baked.set(key, b); return b;
  }
  GL._bake = bakeNow; GL._bq = bakeQ; GL._bk = baked;
  // dibuja una animación horneada: (x, y) es el origen del esqueleto; px = alto en pantalla (con fitH) o escala
  function drawBaked(n, anim, t, x, y, px, o) {
    const b = bake(n, anim, Object.assign({ px: Math.round(px) }, o)); if (!b) return false;
    const i = o && o.loop === false ? Math.min(b.frames.length - 1, Math.floor(t * b.fps)) : Math.floor(t * b.fps) % b.frames.length;
    img(b.frames[(i + b.frames.length) % b.frames.length], x, y, { w: b.w, h: b.h, ax: b.ax, ay: b.ay, alpha: o && o.alpha });
    return true;
  }

  // ---------------------------------------------------------------- pantalla de juego
  const live = new Set();
  function drawSpineL(key, n, anim, t, x, y, k, o) { live.add(key); return drawSpine(key, n, anim, t, x, y, k, o); }
  GL.on = () => on();
  // mamá panda (como en Panda Pop: mira hacia donde apunta, lanza, se preocupa con pocas burbujas y celebra o se
  // entristece al acabar); su tamaño, el del dibujo 2D de antes (4,4 diámetros de alto)
  const DIRS = ['Left', 'Left&Up', 'Up&Left', 'StraightUp', 'Up&Right', 'Right&Up', 'Right'];
  const dirOf = (a) => { if (a == null) return 'StraightUp'; const d = (-a * 180) / Math.PI; return DIRS[d > 150 ? 0 : d > 120 ? 1 : d > 100 ? 2 : d > 80 ? 3 : d > 60 ? 4 : d > 30 ? 5 : 6]; };
  let mamaEnd = null;
  function drawMama(B) {
    const sd = spineData('MamaPanda_game'); if (!sd) return;
    const [x, y] = B.shooter, size = B.size, panic = B.moves <= 5, state = E.play && E.play.state;
    let name, t, loop = true;
    if (state === 'won' || state === 'lost') { if (mamaEnd == null) mamaEnd = E.t; name = state === 'won' ? 'React_Win' : 'React_Lose'; t = E.t - mamaEnd; loop = state === 'won'; }
    else {
      mamaEnd = null;
      const sh = B.lastShot, th = sh && sd.findAnimation('Throw_' + dirOf(sh.ang));
      if (sh && th && E.t - sh.t < th.duration) { name = panic ? 'ThrowPanic_StraightUp' : 'Throw_' + dirOf(sh.ang); t = E.t - sh.t; loop = false; }
      else { name = panic ? 'IdlePanic_LookStraightUp' : 'Idle_Look' + dirOf(B.ang); t = E.t; }
    }
    if (!sd.findAnimation(name)) name = 'Idle_LookStraightUp';
    drawSpineL('mama', 'MamaPanda_game', name, t, x, y + size * 1.55, size * 4.4 * MAMA_K, { loop, fitH: true, fitKey: 'Idle_LookStraightUp' });
  }
  let MAMA_K = 0.88; // mamá panda: 3,9 diámetros de alto, como en la captura de la tablet de la abuela
  // crías: dentro de su burbuja (panda_bubble_idle_01, piel Panda_Default, sin la ranura body_bb_black) y bajando en
  // paracaídas (panda_escape_flying_down)
  const BABY = { skin: 'Panda_Default', hide: ['body_bb_black'] };
  const bubTex = new Map();
  const bubOf = new WeakMap(); // cada burbuja es un objeto que el juego cambia por otro al cambiar: su textura va con él
  function bubbleTexture(B, b, size) {
    let e = bubOf.get(b);
    if (e && e.size === Math.round(size) && !e.t.destroyed) { e.used = shownFrames; return e.t; }
    const key = JSON.stringify(b, (kk, v) => (kk === 'sc' || kk === 'alpha' || kk === 'x' || kk === 'y' || kk === 'id' ? undefined : v)) + '@' + Math.round(size);
    e = bubTex.get(key);
    const S = Math.ceil(size * 1.6 * E.scale);
    if (!e) {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'); g.setTransform(E.scale, 0, 0, E.scale, S / 2, S / 2);
      B.drawBubble(g, Object.assign({}, b, { baby: false, panda: false, sc: 1, alpha: 1 }), 0, 0, size);
      e = { t: PIXI.Texture.from(c), used: 0, size: Math.round(size) }; bubTex.set(key, e);
      if (bubTex.size > 300) for (const [kk, v] of bubTex) { if (shownFrames - v.used > 2) { v.t.destroy(true); bubTex.delete(kk); } if (bubTex.size < 200) break; }
    }
    e.used = shownFrames; bubOf.set(b, e);
    return e.t;
  }
  const PLAIN_KEYS = new Set(['color', 'id', 'panda', 'sc', 'alpha', 'x', 'y']);
  function plainBubble(b) {
    if (typeof b.color !== 'number') return null;
    for (const k in b) if (!PLAIN_KEYS.has(k) && b[k]) return null;
    return looseTex('b' + b.color + '.png');
  }
  // obstáculos con su prefab de Panda Pop y su animación (gl/flat_obs.json, gl/anim_obs.json; tools/pp_obstaculos.py):
  // el color elegido con el clip de color de su Animator y el de reposo encima. Una burbuja mide OBS_U unidades del prefab
  // (la capa del dado, que la cubre entera: 1,28 × 0,0859).
  // Lo que no está aquí (o lleva otros adornos encima) sigue con su imagen hecha con el dibujo 2D
  const COLN = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink'];
  let OBS_U = 1.28 * 0.0859;
  GL.obsU = (v) => { OBS_U = v; };
  const OBS_KEYS = new Set(['color', 'id', 'panda', 'sc', 'alpha', 'x', 'y', 'balloon', 'ghost', 'phase', 'dice', 'crystal', 'mask', 'on', 'hp', 'cd', 'dir']);
  const hideBut = (all, keep) => new Set(all.filter((n) => n !== keep));
  const CRYS = COLN.map((c) => 'crystal' + c).concat(['crystalRainbow']), FAIRY = ['fairylRed', 'fairyBlue', 'fairyPink', 'fairyGreen', 'fairyPurple', 'fairyYellow', 'fairyRainbow'];
  function obsPrefab(b, t) {
    for (const k in b) if (!OBS_KEYS.has(k) && b[k]) return null; // otros adornos: imagen 2D
    const c = b.color, col = typeof c === 'number' ? COLN[c] : null;
    if (col && b.balloon) return { name: 'BalloonBubblePool', anims: [{ a: 'Balloon' + col, t, root: 'BalloonBubble' }, { a: 'BalloonIdle', t, root: 'BalloonBubble' }], hide: new Set(['SpriteRenderer (RainbowBalloon)']) };
    if (col && b.ghost) return { name: 'GhostObjectPool', base: false, anims: [{ a: 'Ghost' + col, t, root: 'GhostBubblePoolable/GhostAnimation' }] };
    if (col && b.dice) return { name: 'DiceObjectPool', base: true, anims: [{ a: col + 'DiceIdle', t, root: 'DicePoolable' }], hide: new Set(['DiceRoll']) };
    if (col && b.crystal) return { name: 'CrystalObjectPool', base: false, anims: [{ a: 'crystalIdle', t, root: 'CrystalBubblePoolable' }], hide: hideBut(CRYS, 'crystal' + col) };
    if (col && b.mask) return { name: 'ShieldObjectPool', base: true, anims: [{ a: 'ShieldOn', t: 9, root: 'ShieldBubblePoolable/ShieldAnimation' }] };
    if (col) return null;
    if (c === 'rune') return { name: 'RuneObjectPool', anims: [{ a: b.on ? 'runeTriggered' : 'runeIdle', t, root: 'RuneIdlePoolable/GlowIdle' }] };
    if (c === 'volcano') return { name: 'VolcanoObjectPool', anims: [{ a: 'VolcanoSmallCloudIddle', t, root: 'VolcanoBubblePoolable/SmallVolcano/Pivot/Sprite' }], hide: new Set(['BigVolcano']) };
    if (c === 'bamboo') return { name: 'BambooObjectPool', anims: [{ a: (b.hp || 3) >= 3 ? 'BambooDefault' : b.hp === 2 ? 'BambooHitOnce' : 'BambooHitTwice', t: 9, loop: false, root: 'BambooBothPoolable' }], hide: new Set(['Center', 'LeftCap', 'RightCap']) };
    if (c === 'gspike') return { name: 'GoldenSpikeObjectPool', anims: [{ a: b.on === false ? 'GoldenSpikeOff' : 'GoldenSpikeOn', t: 9, root: 'GoldenSpikeBubblePoolable/GoldenSpikeAnimation' }] };
    if (c === 'ivy') return { name: 'PoisonIvyObjectPool', anims: [{ a: 'IdleIvy', t, root: 'PoisonIvyBubblePoolable/PoisonIvyAnimation' }] };
    if (c === 'ivymom') return { name: 'PoisonIvyMotherObjectPool', anims: [{ a: 'IvyMotherOpen', t, root: 'PoisonIvyMotherBubblePoolable' }] };
    if (c === 'foam') return { name: 'FoamObjectPool', anims: [{ a: 'IdleFoam', t, root: 'FoamBubblePoolable' }] };
    if (c === 'fairy') return { name: 'FairyObjectPool', anims: [{ a: 'fairyIdle', t, root: 'FairyBubblePoolable' }], hide: hideBut(FAIRY, 'fairyRainbow') };
    return null;
  }
  GL.obsPrefab = obsPrefab; // para probar
  function drawBubbles(B) {
    loadPrefabs();
    const S = B.S, size = B.size;
    for (let r = 0; r < S.grid.length; r++) {
      const yy = B.sy(B.bxy(r, 0)[1]);
      if (yy < B.area.y + size * 0.4 || yy > B.area.y + B.area.h + size) continue;
      for (let c = 0; c < B.colsIn(r); c++) {
        const b = S.grid[r][c]; if (!b) continue;
        const [bx, by] = B.bxy(r, c), x = B.sx(bx), y = B.sy(by);
        const plain = plainBubble(b); // burbuja de color sin adornos: su imagen de Panda Pop tal cual (se agrupan al dibujar)
        const pf = !plain && !(GL.off && GL.off.obsPrefab) && obsPrefab(b, E.t + ((b.id || c) % 13) * 0.29);
        if (plain) img(plain, x, y, { w: size, h: size, ax: 0.5, ay: 0.5 });
        else if (pf && PREF && PREF[pf.name] && ANIM) {
          if (pf.base) img(looseTex('b' + b.color + '.png'), x, y, { w: size, h: size, ax: 0.5, ay: 0.5 });
          drawPrefab(pf.name, x, y, { k: size / OBS_U, anims: pf.anims, hide: pf.hide, alpha: b.alpha, noRoot: true }); // la raíz es el 'pool': su sitio no cuenta
        }
        else { const tx = bubbleTexture(B, b, size); img(tx, x, y, { w: tx.width / E.scale, h: tx.height / E.scale, ax: 0.5, ay: 0.5 }); }
        if (B.isBaby(b)) drawBaked('BabyPanda', 'panda_bubble_idle_01', E.t + ((b.id || c) % 11) * 0.37, x, y + size * 0.36, size * BABY_K, Object.assign({ fitH: true }, BABY));
      }
    }
  }
  let BABY_K = 0.84; // la cría dentro de su burbuja: 0,84 diámetros
  function drawParachutes(B) {
    for (const p of B.parachutes) {
      const x = B.sx(p.x + Math.sin(p.t * 3 + p.sway) * 10), y = B.sy(p.y);
      drawBaked('BabyPanda', 'panda_escape_flying_down', p.t, x, y + B.size * 0.6, B.size * 2.2, Object.assign({ fitH: true }, BABY));
    }
  }
  // crías a salvo: bajan del paracaídas hasta el suelo junto a mamá panda (panda_escape_flying_down), aterrizan
  // (panda_landing) y se quedan allí contentas (panda_ground_idle_01)
  function drawRescued(B) {
    const sd = spineData('BabyPanda'); if (!sd) return;
    const land = sd.findAnimation('panda_landing'), ld = land ? land.duration : 0.5;
    const [mx, my] = B.shooter, gy0 = my + B.size * 2.3;
    for (let i = 0; i < B.rescued.length; i++) {
      const r = B.rescued[i], t = E.t - r.t0, tx = mx + r.gx * B.size, ty = gy0 + r.gy * B.size, fly = 0.7;
      if (t < fly) { const k = t / fly, e = k * (2 - k); drawBaked('BabyPanda', 'panda_escape_flying_down', t, r.x0 + (tx - r.x0) * e, r.y0 + (ty - r.y0) * e, B.size * 2.2, Object.assign({ fitH: true }, BABY)); }
      else if (t < fly + ld) drawBaked('BabyPanda', 'panda_landing', t - fly, tx, ty, B.size * 1.3, Object.assign({ fitH: true, loop: false }, BABY));
      else drawBaked('BabyPanda', 'panda_ground_idle_01', t - fly - ld + i * 0.3, tx, ty, B.size * 1.3, Object.assign({ fitH: true }, BABY));
    }
  }
  // reventones con el efecto BubbleBasicPopEffect de Panda Pop (sus partículas COLOR, del color de la burbuja)
  const POPCOL = { 0: [1, 0.25, 0.2], 1: [0.25, 0.6, 1], 2: [0.35, 0.85, 0.25], 3: [1, 0.65, 0.15], 4: [0.65, 0.35, 0.95], 5: [1, 0.45, 0.75] };
  const popped = new WeakSet();
  function drawPops(B) {
    for (const e of B.effects) {
      if (e.kind !== 'pop' || e.t < 0 || popped.has(e)) continue;
      popped.add(e);
      const col = typeof e.b.color === 'number' ? POPCOL[e.b.color] : null;
      GL.ufx('BasicPopEffectPool', B.sx(e.x), B.sy(e.y), B.size * POP_K, { tint: col, tintRe: /^COLOR/ });
      lanternTrail(B, e);
    }
  }
  let POP_K = 1.8;
  // poderes de los farolillos con sus secuencias de Panda Pop (SuperBubble_*_Effect: fotogramas a 30 por segundo; en el
  // juego cada fotograma mide su tamaño en unidades ×0,2 y una burbuja mide ~0,094: de ahí WU)
  const WU = 1 / 0.094;
  const SEQ = { fire: ['Explosion_Fire00', 2, 19, 1.0], sun: ['Sun_00', 5, 34, 1.025], sunfire: ['SunFire_00', 2, 27, 1.0], sunburst: ['Sun_Burst_00', 1, 27, 2.5],
    water: ['SuperBubble_Water00', 12, 33, 1.2], dragon: ['ExplosionDragonFire_Effect_', 1, 27, 1.0] };
  function seqFrame(kind, t) {
    const [pre, a, b, sc] = SEQ[kind], i = Math.floor(t * 30); if (i > b - a) return null;
    const n = a + i, name = pre + (kind === 'dragon' ? String(n).padStart(2, '0') : String(n).padStart(2, '0'));
    const tx = tex(name); return tx ? [tx, sc] : null;
  }
  function drawSeq(kind, t, x, y, size, mul) {
    const f = seqFrame(kind, t); if (!f) return;
    const [tx, sc] = f, k = 0.2 * sc * WU * size * (mul || 1);
    img(tx, x, y, { w: tx.u[0] * k, h: tx.u[1] * k, add: false });
  }
  // al llenar los farolillos, la burbuja de mamá panda se transforma con la animación de su poder (SuperBubble_*_Effect,
  // de una vez); con los cuatro llega el dragón (Spine DragonBubble_V02) cruzando el tablero y lanzando fuego
  let powKey = null, powT0 = 0;
  function drawPowers(B) {
    const p = B.power, key = p ? p.slice().sort().join('+') : null;
    if (key !== powKey) { powKey = key; powT0 = E.t; }
    if (p && !B.shot) {
      const kind = p.length >= 4 ? 'dragon' : p.includes('sun') && p.includes('fire') ? 'sunfire' : p.includes('sun') ? (p.length >= 2 ? 'sunburst' : 'sun') : p.includes('fire') ? 'fire' : p.includes('water') ? 'water' : null;
      if (kind) drawSeq(kind, E.t - powT0, B.shooter[0], B.shooter[1], B.size, kind === 'sunburst' ? 0.5 : 1.15);
    }
    for (const e of B.effects) {
      if (e.kind !== 'dragon' || e.t < 0) continue;
      const k = Math.min(1, e.t / 1.2), x = B.area.x - B.size * 3 + (B.area.w + B.size * 6) * k, y = B.area.y + B.area.h * 0.5 - Math.sin(k * Math.PI) * B.area.h * 0.25;
      drawSpineL('dragon', 'DragonBubble_V02', 'animation', e.t, x, y, B.size * 6, { loop: true, fitH: true });
      if (!e.glfx || E.t - e.glfx > 0.1) { e.glfx = E.t; GL.ufx('DragonFirePopEffectPool', x, y + B.size, B.size * POP_K); }
    }
  }
  // cada burbuja de color de farolillo que revienta manda su estela al farolillo (LanternFillBubblePop<Color>)
  const LANFX = ['LanternFillBubblePopRed', 'LanternFillBubblePopBlue', 'LanternFillBubblePopGreen', 'LanternFillBubblePopYellow'];
  let trails = []; // como mucho 5 estelas a la vez (en la tablet, cada una es un sistema de partículas)
  function lanternTrail(B, e) {
    const c = e.b.color; if (OFF.trails || typeof c !== 'number' || c > 3 || !B.lanternXY) return;
    trails = trails.filter((t0) => E.t - t0 < 0.6); if (trails.length >= 5) return; trails.push(E.t);
    const x0 = B.sx(e.x), y0 = B.sy(e.y), [x1, y1] = B.lanternXY(c), T = 0.55;
    GL.ufx(LANFX[c], x0, y0, B.size * POP_K, { follow: (t) => { if (t > T) return null; const k = t / T, q = k * k; return [x0 + (x1 - x0) * q, y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * B.size * 1.5]; } });
  }

  // farolillos montados como en LanternsLeftPrefab/LanternsRightPrefab de Panda Pop (posición y escala de cada pieza
  // respecto al farolillo apagado, en píxeles del prefab, y hacia arriba): palo, asa, apagado y encendido llenándose de
  // abajo arriba; lleno, con su brillo, su icono y la flecha que invita a tocarlo; elegido, con el aro LanternIconFX
  const LANC = ['Red', 'Blue', 'Green', 'Yellow'];
  const LANP = [
    [['Lantern_Stick', -215, 118.3, 199.2, 229.1], ['@Handle', 1, 27, 264, 244.1], ['@Off', 0, 0, 267.3, 264.9], ['@On', 0.4, -1, 265.9, 264.9, 'on'], ['@_Icon_On', 3.6, -0.6, 249.8, 249.8, 'full']],
    [['Lantern_Stick', 218.2, 114.2, -199.2, 229.1], ['@Handle', 0, 25, -264, 247.7], ['@Off', 0, 0, 267.1, 264.9], ['@On', 0, -2, 267.1, 264.9, 'on'], ['@_Icon_On', 1.2, 7.8, 247.8, 248.1, 'full']],
    [['Lantern_Stick', -215, 117.2, 199.2, 229.1], ['@Handle', 3.8, 26, -264, 247.7], ['@Off', 0, 0, 267.1, 264.9], ['@On', -0.7, 1.9, 264.6, 258.8, 'on'], ['@_Icon_On', 0.9, 2.7, 252.7, 252.9, 'full']],
    [['Lantern_Stick', 218.2, 110.3, -199.2, 229.1], ['@Handle', 0, 25, -264, 244.1], ['@Off', 0, 0, 267.3, 264.9], ['@On', 0, -2, 267.3, 264.9, 'on'], ['@_Icon_On', 1.1, 5.2, 246.1, 246.4, 'full']]];
  const LANPOW = ['fire', 'water', 'vine', 'sun'];
  const fillTex = new Map();
  function fillOf(t, k) { // la parte de abajo (k de 0 a 1) de un sprite sin recortes
    const q = Math.round(k * 48), key = t.f.x + ',' + t.f.y + ',' + q; let r = fillTex.get(key);
    if (!r) { const f = t.f, h = Math.max(1, Math.round((f.h * q) / 48)); r = new PIXI.Texture(t.baseTexture, new PIXI.Rectangle(f.x, f.y + f.h - h, f.w, h)); fillTex.set(key, r); }
    return r;
  }
  function drawLanterns(B) {
    if (!B.lanternXY || !B.lan) return;
    const f = (B.size * 1.25) / 196;
    for (const side of [[0, 2, 1], [3, 1, -1]]) { // el soporte (leftStand) va de un farolillo al otro de su lado
      const [a, b, dir] = side, [xa, ya] = B.lanternXY(a), [, yb] = B.lanternXY(b), t = tex('leftStand'); if (!t) continue;
      const sp = (yb - ya) / (324 * f);
      img(t, xa - 201 * f * dir, (ya + yb) / 2 - 36 * f, { w: t.u[0] * 266.7 * f, h: t.u[1] * 374.2 * f * sp, flipX: dir < 0, flipY: dir < 0 });
    }
    for (let i = 0; i < 4; i++) {
      const [X, Y] = B.lanternXY(i), lvl = Math.max(0, Math.min(1, B.lanAnim ? B.lanAnim[i] : B.lan[i])), full = B.lan[i] >= 1;
      const active = !!(B.power && B.power.includes(LANPOW[i]));
      const a = full && !active ? Math.sin(E.t * 9) * 0.06 : 0, co = Math.cos(a), si = Math.sin(a), py = 118 * f; // se menea colgado del palo
      const at = (dx, dy) => { const x = dx * f, y = -dy * f + py; return [X + x * co - y * si, Y - py + x * si + y * co]; };
      if (full) { const g = tex('Lantern_Glow'); if (g) { const [gx, gy] = at(1, 3); const p = 1 + Math.sin(E.t * 5) * 0.05; img(g, gx, gy, { w: g.u[0] * 257 * f * p, h: g.u[1] * 251 * f * p, add: true, alpha: 0.8 }); } }
      for (const [n0, dx, dy, ksx, ksy, role] of LANP[i]) {
        if (role === 'full' && !full) continue;
        const t = tex(n0.replace('@', 'Lantern' + LANC[i] + 'World1')); if (!t) continue;
        const w = t.u[0] * Math.abs(ksx) * f, h = t.u[1] * Math.abs(ksy) * f;
        if (n0 === 'Lantern_Stick') { img(t, X + dx * f, Y - dy * f, { w, h, flipX: ksx < 0 }); continue; }
        const [x, y] = at(dx, dy);
        if (role === 'on') {
          if (lvl <= 0) continue;
          const ft = fillOf(t, lvl), s = img(ft, x - (h / 2) * si, y + (h / 2) * co, { w, h: h * (ft.orig.height / t.f.h), ax: 0.5, ay: 1, rot: a });
          continue;
        }
        img(t, x, y, { w, h, flipX: ksx < 0, rot: a });
      }
      if (active) { const r = tex('LanternIconFX'); if (r) { const [rx, ry] = at(2.4, 4); img(r, rx, ry, { w: r.u[0] * 670 * f, h: r.u[1] * 625 * f, add: true, rot: E.t * 2 }); } }
      else if (full) { const ar = tex('LanternArrow'); if (ar) { const dir = i === 0 || i === 2 ? 1 : -1, k = 1 + Math.sin(E.t * 8) * 0.08; img(ar, X + dir * 230 * f, Y, { w: ar.u[0] * 234 * f * k, h: ar.u[1] * 300 * f * k, flipX: dir < 0 }); } }
    }
  }

  // una burbuja suelta (la de las manos, la del cesto, la que vuela): su imagen de Panda Pop o la textura con sus adornos
  function bubbleAt(B, b, x, y, size) {
    const plain = plainBubble(b);
    if (plain) return img(plain, x, y, { w: size, h: size, ax: 0.5, ay: 0.5 });
    const tx = bubbleTexture(B, b, size); return img(tx, x, y, { w: tx.width / E.scale, h: tx.height / E.scale, ax: 0.5, ay: 0.5 });
  }
  // la burbuja en las manos de mamá panda (con poder, la tapa la secuencia del poder) y la que vuela con su parra
  function drawHand(B) {
    if (!B.shotAt && B.cur && !(B.power && B.power.length)) bubbleAt(B, B.cur, B.shooter[0], B.shooter[1], B.size * 1.05);
  }
  function drawShot(B) {
    const sh = B.shotAt; if (!sh) return;
    if (sh.vine && sh.vine.length >= 4) { const g = gfx(); g.lineStyle(B.size * 0.16, 0x3fc84a, 1); g.moveTo(sh.vine[0], sh.vine[1]); for (let i = 2; i < sh.vine.length; i += 2) g.lineTo(sh.vine[i], sh.vine[i + 1]); }
    bubbleAt(B, sh.b, sh.x, sh.y, B.size * (sh.b.powers && sh.b.powers.length ? 1.2 : 1));
  }
  // cesto de Panda Pop 12.2 (el de la tablet de la abuela): fondo, la siguiente burbuja, el frente y el medallón
  function drawBasket(B) {
    const bk = looseTex('basket_back.png'), fr = looseTex('basket_front.png'), md = looseTex('basket_movecountframe.png'); if (!bk || !fr || !B.nextXY) return;
    const [x, y] = B.nextXY, size = B.size, w = size * 1.5, k = w / fr.width, bx = x - size * 0.3;
    img(bk, bx, y - size * 0.2, { w: bk.width * k, h: bk.height * k, ax: 0.5, ay: 0 });
    if (B.next != null) bubbleAt(B, { color: B.next }, bx, y - size * 0.15, size * 0.8);
    img(fr, bx, y + size * 0.05, { w, h: fr.height * k, ax: 0.5, ay: 0 });
    const mx = x + size * 0.75, ms = size * 0.85;
    if (md) img(md, mx, y + size * 0.2, { w: ms, h: ms, ax: 0.5, ay: 0.5 });
    text(String(Math.max(0, B.moves)), mx, y + size * 0.22, Math.round(size * 0.42), { stroke: '#5a2a10', sw: 4 });
  }
  // ---------------------------------------------------------------- ventanas de Panda Pop ("V2": PregameLevelPopupV2,
  // WinScreenPresenter, NewTallyLoseScreenPresenter…; hoja pp_pop). Medidas del prefab en px de su lienzo de 1080 de
  // ancho: panel Popup_Background_Default de 980, cinta Title_Background_Regular (dos mitades, la derecha en espejo)
  // asomando por arriba, botón redondo de cerrar, recuadros Popup_Cutout_Default, botones Button_Square_*_Big y
  // estrellas tallyStarEmpty_V2 / TallyStarFilled. Niveles difíciles y superdifíciles con sus variantes. Textos del
  // archivo Spanish de Panda Pop
  const PPV = { 0: '', 1: '_Hard', 2: '_SuperHard' };
  const emoT = new Map();
  function emojiTex(ch) { let e = emoT.get(ch); if (!e) { e = PIXI.Texture.from(E.emojiSprite(ch, 128)); emoT.set(ch, e); } return e; }
  const goalT = new Map(); // icono de cada objetivo, dibujado una vez con el dibujo del juego (GAME.drawGoalIcon)
  function goalTex(gl) { const key = gl.type + '|' + (gl.key == null ? '' : gl.key); let t = goalT.get(key); if (!t) { const c = document.createElement('canvas'); c.width = c.height = 128; GAME.drawGoalIcon(c.getContext('2d'), gl, 64, 64, 100); t = PIXI.Texture.from(c); goalT.set(key, t); } return t; }
  const NOEMO = (s) => String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  function wrapLines(str, max) { const out = []; for (const par of String(str).split('\n')) { let line = ''; for (const w of par.split(' ')) { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } out.push(line); } return out; }
  function popBox(pop, cx, cy, dim) {
    const a = Math.min(1, pop.anim == null ? 1 : pop.anim), t = E.t - (pop.t0 || 0), q = Math.min(1, t / 0.25);
    const sc = pop.closing ? 0.8 + 0.2 * a : 0.8 + 0.2 * (1 + 2.7 * Math.pow(q - 1, 3) + 1.7 * Math.pow(q - 1, 2));
    const g = gfx(); g.beginFill(0x000000, (dim == null ? 0.6 : dim) * a); g.drawRect(0, 0, E.W, E.H); g.endFill();
    const box = new PIXI.Container(); box.poolBox = true; box.pivot.set(cx, cy); box.position.set(cx, cy); box.scale.set(sc); box.alpha = Math.min(1, a * 1.5); root.addChild(box);
    return { box, sc, a };
  }
  // botón cuadrado de Panda Pop (verde, amarillo, rojo, gris o turquesa) con su texto blanco
  const BTN = { green: ['Button_Square_Green_Big', '#2f7a12'], yellow: ['Button_Square_Yellow_Big', '#8a5a00'], red: ['Button_Square_Red_Small', '#8a1d10'], grey: ['Button_Square_Grey_Big', '#4a4a4a'], teal: ['Button_Square_Teal_Small', '#145a5a'], brown: ['Button_Square_Brown_Big', '#5a3a1a'] };
  function ppButton(x, y, w, h, k, color, label, size) {
    const [sp, st] = BTN[color] || BTN.green;
    nine(sp, x - w / 2, y - h / 2, w, h, k * 0.9);
    const t = text(label, x, y - h * 0.04, size || h * 0.36, { fill: '#ffffff', stroke: st, sw: (size || h * 0.36) * 0.16 });
    if (t && t.width > w * 0.86) t.scale.set((t.scale.x * w * 0.86) / t.width);
  }
  // panel: rows = [{ text } | { label, color, fn, id } | { small } | { h, draw(o) }], de arriba abajo (px del prefab)
  function ppPanel(pop, title, rows, close, hard, extra, onTitle) {
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const k = (E.W * 0.9) / 980, cx = E.W / 2, cy = E.H * 0.5, v = PPV[hard || 0];
    const bg0 = E.save && E.save.big ? 1.18 : 1; // "Letra grande": letra mayor, menos letras por línea y líneas más altas
    for (const r of rows) if (r.text != null) r.lines = wrapLines(r.text, Math.round(30 / bg0));
    const hRow = (r) => (r.h != null ? r.h : r.label ? 210 : r.small ? 60 : 70 * bg0 * r.lines.length + 30);
    const H = Math.max(420, 190 + rows.reduce((s, r) => s + hRow(r), 0));
    const { box, sc } = popBox(pop, cx, cy);
    const prev = root; root = box;
    const at = (ux, uy) => [cx + ux * k, cy - uy * k], top = H / 2;
    if (extra && extra.under) extra.under({ at, k, top });
    { const [x, y] = at(-490, top); nine('Popup_Background' + (v || '_Default'), x, y, 980 * k, H * k, k * (v ? 2 : 1)); }
    // cinta del título
    { const t = tex('Title_Background' + (v || '_Regular')); if (t) { const w = 452 * k, h = 200 * k, [xl, yy] = at(-207, top + 15), [xr] = at(226, top + 15); img(t, xl, yy, { w, h, ax: 0.5, ay: 0.5 }); img(t, xr, yy, { w, h, ax: 0.5, ay: 0.5, flipX: true }); } }
    { const [x, y] = at(0, top + 22); const t = text(title, x, y, 64 * k, { fill: '#ffffff', stroke: hard === 2 ? '#4a1470' : hard === 1 ? '#7a1020' : '#1a5a8a', sw: 10 * k }); if (t && t.width > 640 * k) t.scale.set((t.scale.x * 640 * k) / t.width); }
    const hs = (ux, uy, w, h, fn, id) => { const [x, y] = at(ux, uy); E.hotspot(id, (x - (w / 2) * k - cx) * sc + cx, (y - (h / 2) * k - cy) * sc + cy, w * k * sc, h * k * sc, fn); };
    let y = top - 140;
    rows.forEach((r, i) => {
      const h = hRow(r);
      if (r.label) { const [x, yy] = at(0, y - h / 2); ppButton(x, yy, (r.w || 600) * k, 170 * k, k, r.color || 'green', r.label, 64 * k); hs(0, y - h / 2, r.w || 600, 170, r.fn, r.id || 'gl_b' + i); }
      else if (r.lines) r.lines.forEach((ln, j) => { const [x, yy] = at(0, y - 45 * bg0 - j * 70 * bg0); text(ln, x, yy, 52 * bg0 * k, { fill: '#6b3f1f' }); });
      else if (r.small) { const [x, yy] = at(0, y - 30); text(r.small, x, yy, 32 * k, { fill: '#9a7a5a' }); }
      else if (r.draw) r.draw({ at, k, top: y, h, hs });
      y -= h;
    });
    if (close) { const t = tex('Button_Close' + v); if (t) { const [x, yy] = at(457, top - 52); img(t, x, yy, { w: 115 * k, h: 115 * k, ax: 0.5, ay: 0.5 }); } hs(457, top - 52, 130, 130, close, 'gl_close'); }
    if (onTitle) hs(0, top + 22, 600, 110, onTitle, 'gl_st_secret'); // Ajustes: 5 toques en el título abren "Ir al nivel" (para quien cuida la tablet)
    if (extra && extra.over) extra.over({ at, k, top, hs });
    root = prev;
    return true;
  }
  const cutout = (o, y0, h, hard) => { const [x, y] = o.at(-425, y0); nine('Popup_Cutout' + (PPV[hard || 0] || '_Default'), x, y, 850 * o.k, h * o.k, o.k * 0.8); };
  function stars(o, y0, n, hard, pulse) { // tres estrellas como en el prefab (la del centro más grande y más alta)
    const empty = 'tallyStarEmpty_V2' + PPV[hard || 0];
    [[-134, 0, 0.69], [0, 22, 0.9], [134, 0, 0.69]].forEach(([dx, dy, s], i) => {
      const [x, y] = o.at(dx, y0 + dy), d = 128 * s * 1.25 * o.k;
      img(empty, x, y, { w: d, h: d, ax: 0.5, ay: 0.5 });
      if (i < n) {
        const q = pulse && pulse[i] != null ? Math.min(1, (E.t - pulse[i]) / 0.25) : 1, z = q < 1 ? 1.6 - 0.6 * q * q : 1;
        img('TallyStarFilled', x, y, { w: d * z, h: d * z, ax: 0.5, ay: 0.5 });
        if (q < 1) img('StarPulse', x, y, { w: d * 1.3, h: d * 1.3, ax: 0.5, ay: 0.5, alpha: 1 - q, add: true });
      }
    });
  }
  function bar(o, ux, uy, w, frac, label) {
    const [x, y] = o.at(ux, uy), g = gfx(), H = 44 * o.k;
    g.beginFill(0x7a4a2a, 0.35); g.drawRoundedRect(x, y - H / 2, w * o.k, H, H / 2); g.endFill();
    if (frac > 0) { g.beginFill(0x6fd23a); g.drawRoundedRect(x + 4 * o.k, y - H / 2 + 4 * o.k, Math.max(H - 8 * o.k, (w * o.k - 8 * o.k) * frac), H - 8 * o.k, (H - 8 * o.k) / 2); g.endFill(); }
    text(label, x + (w * o.k) / 2, y, 30 * o.k, { fill: '#ffffff', stroke: '#3a5a1a', sw: 5 * o.k });
  }
  function preLevel(pop) {
    const P = pop.pre, won = (E.save.stars && E.save.stars[P.n]) || 0, hard = P.hard || 0;
    const goals = (P.goals || []).slice(0, 3);
    const help = P.spec && P.spec.text ? P.spec.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2194}\u{3030}\u{FE0F}]/gu, '').replace(/\s+([:.,])/g, '$1').replace(/\s{2,}/g, ' ').trim() : ''; // la explicación de la pieza nueva (nuestra), sin emojis
    return ppPanel(pop, 'Nivel ' + P.n, [
      { h: 150, draw: (o) => stars(o, o.top - 70, won, hard) },
      { h: 230, draw: (o) => {
        cutout(o, o.top, 210, hard);
        const [tx, ty] = o.at(0, o.top - 45); text('Objetivo', tx, ty, 42 * o.k, { fill: '#ffffff', stroke: '#6b3f1f', sw: 6 * o.k });
        goals.forEach((gl, i) => { const [x, y] = o.at((i - (goals.length - 1) / 2) * 200, o.top - 140); img(goalTex(gl), x - 30 * o.k, y, { w: 90 * o.k, h: 90 * o.k, ax: 0.5, ay: 0.5 }); text(String(gl.count), x + 45 * o.k, y, 46 * o.k, { fill: '#ffffff', stroke: '#6b3f1f', sw: 6 * o.k, ax: 0 }); });
      } },
      ...(help ? [{ h: 160, draw: (o) => { const [x, y] = o.at(0, o.top - 80); fitHelp(help, x, y, 640 * o.k, 150 * o.k, 36 * o.k, { fill: '#6b3f1f' }); } }] : []),
      { h: 60, draw: (o) => { const [x, y] = o.at(0, o.top - 30); text('Elige potenciadores', x, y, 40 * o.k, { fill: '#6b3f1f' }); } },
      { h: 200, draw: (o) => P.SB.slice(0, 3).forEach((b, i) => {
        const ux = (i - 1) * 230, [x, y] = o.at(ux, o.top - 95), have = P.have(b), onB = P.chosen.has(b.id), d = 170 * o.k;
        nine(onB ? 'Button_Square_Yellow_Big' : 'Panel_Background', x - d / 2, y - d / 2, d, d, o.k * (onB ? 0.9 : 1.6));
        img(emojiTex(b.icon), x, y, { w: d * 0.66, h: d * 0.66, ax: 0.5, ay: 0.5 });
        const g = gfx(); g.beginFill(onB ? 0x3cb93c : have > 0 ? 0xe8322b : 0x8a96a3); g.lineStyle(4 * o.k, 0xffffff); g.drawCircle(x + d * 0.36, y + d * 0.36, 30 * o.k); g.endFill();
        text(onB ? '✓' : have === Infinity ? '∞' : have > 0 ? String(have) : '+', x + d * 0.36, y + d * 0.36, 34 * o.k, { fill: '#ffffff' });
        o.hs(ux, o.top - 95, 190, 190, () => P.toggle(b), 'gl_sb' + b.id);
      }) },
      { label: '¡Jugar!', fn: P.play, id: 'gl_play' },
      ...(P.duo ? [{ h: 70, draw: (o) => { const [x, y] = o.at(0, o.top - 35), g = gfx(); g.beginFill(E.duoOn ? 0xff8a1f : 0x6b3f1f, E.duoOn ? 0.9 : 0.25); g.drawRoundedRect(x - 280 * o.k, y - 28 * o.k, 560 * o.k, 56 * o.k, 28 * o.k); g.endFill(); text(E.duoOn ? 'Por turnos: sí' : 'Por turnos: no', x, y, 32 * o.k, { fill: '#ffffff' }); o.hs(0, o.top - 35, 560, 60, P.duo, 'gl_duo'); } }] : []),
    ], P.close, hard, { over: (o) => { const t = tex('PreGameCharacter'); if (t) { const [x, y] = o.at(23, o.top + 190); img(t, x, y, { w: 300 * o.k, h: 300 * o.k, ax: 0.5, ay: 0.5 }); } } });
  }
  function winLevel(pop) {
    const W = pop.win, n = pop.starsShown || 0;
    if (!pop._st) pop._st = []; for (let i = 0; i < n; i++) if (pop._st[i] == null) pop._st[i] = E.t;
    return ppPanel(pop, 'Nivel ' + W.n, [
      { h: 220, draw: (o) => { const t = tex('godRays_winStreak'), [x, y] = o.at(0, o.top - 100); if (t) img(t, x, y, { w: 480 * o.k, h: 420 * o.k, ax: 0.5, ay: 0.5, rot: E.t * 0.3, alpha: 0.6, add: true }); stars(o, o.top - 100, n, W.hard, pop._st); } },
      { text: '¡Has salvado a todas las crías!' },
      { label: 'Siguiente', fn: W.next, id: 'gl_next' },
    ], null, W.hard);
  }
  function lostLevel(pop) {
    const L = pop.lost, goals = (L.goals || []).slice(0, 3);
    return ppPanel(pop, '¡Fallaste!', [
      { text: L.dead ? NOEMO(L.msg) : 'No has salvado a todas las crías...' },
      { h: 200, draw: (o) => { cutout(o, o.top, 180, 0); goals.forEach((gl, i) => { const [x, y] = o.at((i - (goals.length - 1) / 2) * 220, o.top - 90); img(goalTex(gl), x - 35 * o.k, y, { w: 100 * o.k, h: 100 * o.k, ax: 0.5, ay: 0.5 }); text((gl.count - gl.left) + '/' + gl.count, x + 45 * o.k, y, 40 * o.k, { fill: gl.left > 0 ? '#ffd0c0' : '#ffffff', stroke: '#6b3f1f', sw: 6 * o.k, ax: 0 }); }); } },
      { label: 'Repetir', fn: L.retry, id: 'gl_retry' },
    ], L.close, 0);
  }
  // ruleta del regalo diario ("Giro de la suerte"): casillas de colores de las burbujas con sus premios
  function dailyWheel(pop, D) {
    const W = D.wheel; if (!W) return false;
    const st = D.st, n = W.segs.length;
    return ppPanel(pop, 'Giro de la suerte', [
      { h: 640, draw: (o) => {
        const [cx0, cy0] = o.at(0, o.top - 320), R = 270 * o.k, g = gfx(), WS = W.WS || {};
        g.beginFill(PIXI.utils.string2hex(WS.rim || '#8a5a2b')); g.drawCircle(cx0, cy0, R + 26 * o.k); g.endFill();
        for (let i = 0; i < n; i++) {
          const a0 = st.rot + (i / n) * Math.PI * 2 - Math.PI / 2, a1 = a0 + (Math.PI * 2) / n, c = PIXI.utils.string2hex(W.cols[i % W.cols.length]);
          g.lineStyle(4 * o.k, 0xffffff, 0.9); g.beginFill(c); g.moveTo(cx0, cy0); g.arc(cx0, cy0, R, a0, a1); g.lineTo(cx0, cy0); g.endFill();
        }
        g.lineStyle(0); const on = Math.floor(E.t * (st.spinning && !st.done ? 10 : 3)) % 2;
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginFill((i + on) % 2 ? 0xfff6c0 : 0xffd23f); g.drawCircle(cx0 + Math.cos(a) * (R + 13 * o.k), cy0 + Math.sin(a) * (R + 13 * o.k), 7 * o.k); g.endFill(); }
        g.beginFill(PIXI.utils.string2hex(WS.hub || '#ffffff')); g.lineStyle(6 * o.k, PIXI.utils.string2hex(WS.rim || '#8a5a2b')); g.drawCircle(cx0, cy0, 40 * o.k); g.endFill(); g.lineStyle(0);
        W.segs.forEach((L, i) => { const am = st.rot + ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2, many = L.length > 1; L.forEach((ic, j) => { const d = R * (many ? 0.42 + j * 0.2 : 0.62), s = (many ? 64 : 84) * o.k; img(emojiTex(ic), cx0 + Math.cos(am) * d, cy0 + Math.sin(am) * d, { w: s, h: s, ax: 0.5, ay: 0.5 }); }); });
        const p = gfx(); p.beginFill(PIXI.utils.string2hex(WS.arrowColor || '#e8322b')); p.lineStyle(4 * o.k, 0xffffff); p.moveTo(cx0 - 28 * o.k, cy0 - R - 34 * o.k); p.lineTo(cx0 + 28 * o.k, cy0 - R - 34 * o.k); p.lineTo(cx0, cy0 - R + 18 * o.k); p.closePath(); p.endFill();
      } },
      { label: st.done ? 'Obtener' : 'Girar', color: st.spinning && !st.done ? 'grey' : 'green', fn: () => { if (st.done) D.finish(); else W.spin(); }, id: 'gl_wheel' },
    ], null, 0);
  }
  const WINDOWS = {
    pause: (pop, d) => ppPanel(pop, 'Ajustes', [{ label: 'Continuar', fn: d.resume, id: 'gl_resume' }, { label: 'Ajustes', color: 'yellow', fn: d.settings, id: 'gl_settings' }, { label: 'Salir', color: 'red', fn: d.leave, id: 'gl_leave' }, { small: 'Versión ' + (d.version || 'de la app') }], d.resume),
    exit: (pop, d) => ppPanel(pop, '¿Salir del nivel?', [{ text: '¿Seguro que deseas salir?' }, { label: 'Seguir jugando', fn: d.stay, id: 'gl_stay' }, { label: 'Salir', color: 'red', fn: d.leave, id: 'gl_leave' }], d.stay),
    settings: (pop, d) => ppPanel(pop, 'Ajustes', d.opts.map((o2, i) => ({ label: NOEMO(o2.name) + ': ' + o2.val(), color: 'yellow', fn: o2.act, id: 'gl_opt' + i, w: 760 })), d.close, 0, null, d.secret),
    info: (pop, d) => ppPanel(pop, NOEMO(d.title), [{ text: NOEMO(d.text) }, { label: 'Continuar', fn: d.ok, id: 'gl_ok' }], d.ok),
    reward: (pop, R) => { const n = R.icons.length; return ppPanel(pop, NOEMO(R.title), [{ text: NOEMO(R.sub) }, ...(n ? [{ h: 220, draw: (o) => R.icons.forEach((ic, i) => { const [x, y] = o.at((i - (n - 1) / 2) * 210, o.top - 105), d = 170 * o.k; nine('Panel_Background', x - d / 2, y - d / 2, d, d, o.k * 1.6); img(emojiTex(ic), x, y, { w: d * 0.7, h: d * 0.7, ax: 0.5, ay: 0.5 }); }) }] : []), { label: 'Continuar', fn: R.ok, id: 'gl_rw_ok' }], R.ok); },
    missions: (pop, M) => ppPanel(pop, 'Misiones', M.items().map((q) => ({ h: 170, draw: (o) => {
      cutout(o, o.top - 5, 160, 0);
      const [tx, ty] = o.at(-380, o.top - 50); text(NOEMO(q.name), tx, ty, 38 * o.k, { fill: '#ffffff', stroke: '#6b3f1f', sw: 5 * o.k, ax: 0 });
      bar(o, -380, o.top - 115, 560, Math.max(0, Math.min(1, q.v / q.k)), q.v + '/' + q.k);
      const [ix, iy] = o.at(300, o.top - 85); img(q.done ? 'TallyStarFilled' : 'tallyStarEmpty_V2', ix, iy, { w: 100 * o.k, h: 100 * o.k, ax: 0.5, ay: 0.5 });
    } })), M.close),
    album: (pop, A) => ppPanel(pop, 'Logros', A.items().map((q) => ({ h: 150, draw: (o) => {
      const full = q.t >= q.tiers.length, next = q.tiers[Math.min(q.t, q.tiers.length - 1)];
      cutout(o, o.top - 5, 140, 0);
      const [sx, sy] = o.at(-340, o.top - 75); img(q.t ? 'TallyStarFilled' : 'tallyStarEmpty_V2', sx, sy, { w: 100 * o.k, h: 100 * o.k, ax: 0.5, ay: 0.5 }); if (q.t) text(String(q.t), sx, sy + 4 * o.k, 38 * o.k, { fill: '#ffffff', stroke: '#6b3f1f', sw: 6 * o.k });
      const [tx, ty] = o.at(-270, o.top - 45); text(NOEMO(q.name) + ': ' + q.value, tx, ty, 34 * o.k, { fill: '#ffffff', stroke: '#6b3f1f', sw: 5 * o.k, ax: 0 });
      bar(o, -270, o.top - 105, 630, full ? 1 : Math.max(0, Math.min(1, q.value / next)), full ? '¡Completo!' : q.value + '/' + next);
    } })), A.close),
    pad: (pop, K) => ppPanel(pop, 'Ir al nivel', [
      { h: 140, draw: (o) => { cutout(o, o.top - 10, 120, 0); const [x, y] = o.at(0, o.top - 70); text(K.val() || '—', x, y, 70 * o.k, { fill: '#ffffff', stroke: '#6b3f1f', sw: 8 * o.k }); } },
      { h: 720, draw: (o) => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach((key, i) => {
        const ux = ((i % 3) - 1) * 240, uy = o.top - 90 - Math.floor(i / 3) * 175, [x, y] = o.at(ux, uy);
        ppButton(x, y, 210 * o.k, 155 * o.k, o.k, key === '⌫' ? 'red' : key === 'OK' ? 'green' : 'yellow', key === '⌫' ? 'Borrar' : key, (key.length > 1 ? 40 : 62) * o.k);
        o.hs(ux, uy, 210, 155, () => K.press(key), 'gl_lp' + i);
      }) },
      { label: 'Cancelar', color: 'red', fn: K.cancel, id: 'gl_lp_x' }], K.cancel),
    daily: (pop, d) => dailyWheel(pop, d),
  };
  // ---------------------------------------------------------------- barras del mapa con piezas de Panda Pop: arriba la banda
  // oscura (BlackGradient_PYL) con la barra de estrellas del cofre (Bar_Background, StarBarFull, StarBar_Star_Active), la
  // racha y el botón redondo de ajustes; abajo el botón verde del nivel y los de misiones, desafío y logros
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
  // mapa de Burbujas HD: el fondo de cada mundo de Panda Pop (bgN), el camino claro con sus puntos blancos y discos
  const MAPSTYLE = {
    bg(M, zoneH, z0) { for (let z = z0 - 1; z <= z0 + 1; z++) { if (z < 0) continue; const zy = -z * zoneH - zoneH + M.scroll + E.H, t = looseTex('bg' + (z % 7) + '.jpg'); if (t) coverZone(t, zy, zoneH); } },
    path(M) {
      const th = GAME.theme || {}, g = gfx(), c = th.path ? PIXI.utils.string2hex(th.path) : 0xffffff, al = th.path ? 1 : 0.55;
      g.lineStyle({ width: 34, color: c, alpha: al, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
      for (let i = M.first; i <= M.last; i++) { const p = M.pos(i); if (i === M.first) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
      g.lineStyle(0); g.beginFill(0xffffff, 0.9); alongPath(M, M.first, M.last, 24, (x, y) => g.drawCircle(x, y, 4)); g.endFill();
    },
    node(M, i, x, y, r, cur, done, hd, stars) {
      const th = GAME.theme || {}, base = cur ? th.accent : hd === 2 ? '#5b2a86' : hd === 1 ? '#e0413a' : done ? th.node : '#9aa3ad', g = gfx();
      g.beginFill(0x000000, 0.18); g.drawCircle(x + 1, y + 5, r); g.endFill();
      g.beginFill(PIXI.utils.string2hex(base)); g.drawCircle(x, y, r); g.endFill();
      g.lineStyle(4, 0xffffff); g.beginFill(shadeHex(base, 0.12)); g.drawCircle(x, y, r - 5); g.endFill(); g.lineStyle(0);
      g.beginFill(shadeHex(base, 0.4), 0.6); g.drawEllipse(x, y - r * 0.38, (r - 8) * 0.75, (r - 8) * 0.4); g.endFill();
      text(String(i), x, y + 1, i > 999 ? 22 : 27, { fill: '#ffffff', stroke: '#000000', sw: 4 });
      if (hd && !done) { img(emojiTex('💀'), x + r * 0.8, y - r * 0.8, { w: 28, h: 28, ax: 0.5, ay: 0.5 }); if (hd === 2) img(emojiTex('💀'), x - r * 0.8, y - r * 0.8, { w: 28, h: 28, ax: 0.5, ay: 0.5 }); }
      if (done) { const gs = gfx(); for (let k = 0; k < 3; k++) starG(gs, x + (k - 1) * 22, y + r + 4 - (k === 1 ? 6 : 0), 11, k < stars ? '#ffd23f' : '#d0d0d0', '#a86b00'); }
      if (cur) img(emojiTex(M.mascot), x - r - 26, y - 6, { w: 54, h: 54, ax: 0.5, ay: 0.5 });
    },
  };
  GL.mapChrome = function (H) {
    if (!on()) return false;
    const P = E.popup; if (P && !(P.pre || P.lost || P.win || (P.gl && WINDOWS[P.gl.kind]))) return false;
    if (!usedThisFrame) begin();
    usedThisFrame = true;
    const s = E.W / 1080, th = 150 * s;
    img('BlackGradient_PYL', 0, 0, { w: E.W, h: th * 1.25, ax: 0, ay: 0, alpha: 0.5 });
    { const bx = 150 * s, bw = 380 * s, bh = 60 * s, y = th / 2;
      nine('Bar_Background', bx, y - bh / 2, bw, bh, s * 1.2);
      const k2 = Math.max(0, Math.min(1, H.chest / H.CHEST)); if (k2 > 0) img('StarBarFull', bx + 8 * s, y, { w: (bw - 16 * s) * k2, h: bh - 18 * s, ax: 0, ay: 0.5 });
      img('StarBar_Star_Active', 95 * s, y, { w: 110 * s, h: 105 * s, ax: 0.5, ay: 0.5 });
      text(H.chest + '/' + H.CHEST, bx + bw / 2, y, 36 * s, { fill: '#ffffff', stroke: '#3a2a10', sw: 6 * s });
      E.hotspot('gl_m_chest', 30 * s, 0, 520 * s, th, H.album); }
    if (H.streak) text('Racha ' + H.streak, 690 * s, th / 2, 42 * s, { fill: '#ffd23f', stroke: '#5a2a10', sw: 7 * s });
    { const x = E.W - 90 * s, y = th / 2; img('Button_Round_Teal_Medium', x, y, { w: 115 * s, h: 116 * s, ax: 0.5, ay: 0.5 }); img('Icon_Settings', x, y, { w: 66 * s, h: 65 * s, ax: 0.5, ay: 0.5 }); E.hotspot('gl_m_set', x - 70 * s, 0, 140 * s, th, H.settings); }
    if (H.fiesta) { const x = E.W - 200 * s, y = th + 80 * s; ppButton(x, y, 330 * s, 110 * s, s, H.fiesta.done ? 'grey' : 'yellow', H.fiesta.done ? '¡Hecho!' : 'Nivel especial', 40 * s); E.hotspot('gl_m_fi', x - 165 * s, y - 55 * s, 330 * s, 110 * s, H.openFiesta); }
    // abajo: misiones, el nivel y el desafío; logros, encima a la derecha
    const y = E.H - 130 * s;
    ppButton(E.W / 2, y, 470 * s, 180 * s, s, 'green', 'Nivel ' + H.level, 70 * s); E.hotspot('gl_m_play', E.W / 2 - 235 * s, y - 90 * s, 470 * s, 180 * s, H.play);
    const side = (x, color, l1, l2, cb, badge, id) => { ppButton(x, y, 230 * s, 130 * s, s, color, l1, 36 * s); const t = text(l2, x, y + 38 * s, 26 * s, { fill: '#ffffff' }); E.hotspot(id, x - 115 * s, y - 65 * s, 230 * s, 130 * s, cb);
      if (badge) { const g = gfx(); g.beginFill(0xe8322b); g.lineStyle(4 * s, 0xffffff); g.drawCircle(x + 100 * s, y - 60 * s, 26 * s); g.endFill(); text(String(badge), x + 100 * s, y - 60 * s, 32 * s, { fill: '#ffffff' }); } };
    side(140 * s, 'teal', 'Misiones', H.missions ? H.missions + ' por hacer' : '¡Todas!', H.openMissions, H.missions, 'gl_m_mis');
    side(E.W - 140 * s, H.weekly && H.weekly.done ? 'grey' : 'yellow', 'Desafío', H.weekly && H.weekly.done ? '¡Hecho!' : 'semanal', H.openWeekly, 0, 'gl_m_wk');
    { const x = E.W - 90 * s, yy = y - 170 * s; img('Button_Round_Yellow_Big', x, yy, { w: 120 * s, h: 120 * s, ax: 0.5, ay: 0.5 }); img('TallyStarFilled', x, yy - 4 * s, { w: 70 * s, h: 68 * s, ax: 0.5, ay: 0.5 }); E.hotspot('gl_m_alb', x - 60 * s, yy - 60 * s, 120 * s, 120 * s, H.album); }
    return true;
  };
  GL.popup = function (pop) {
    if (!on()) return false;
    if (pop.pre) return preLevel(pop);
    if (pop.win) return winLevel(pop);
    if (pop.lost) return lostLevel(pop);
    if (pop.gl && WINDOWS[pop.gl.kind]) return WINDOWS[pop.gl.kind](pop, pop.gl);
    return false;
  };
  GL.play = function (st) {
    if (!on() || !st.P || !st.P.glState) return false;
    usedThisFrame = true; playedThisFrame = true;
    loadSpine(); loadFx();
    begin(); live.clear();
    const B = st.P.glState();
    const n = Math.floor((((st.n || 1) - 1) / 10) % 7), bg = looseTex('bg' + n + '.jpg');
    if (bg) { const s = Math.max(E.W / bg.width, E.H / bg.height); img(bg, E.W / 2, E.H / 2, { w: bg.width * s, h: bg.height * s, ax: 0.5, ay: 0.5 }); }
    if (!OFF.rescued) drawRescued(B);
    if (!OFF.mama) drawMama(B);
    if (!OFF.bubbles) drawBubbles(B);
    if (!OFF.pops) drawPops(B);
    drawHand(B);
    drawPowers(B);
    if (!OFF.lanterns) drawLanterns(B);
    drawBasket(B);
    drawShot(B);
    const dt = lastFxT == null ? 0 : Math.min(0.05, Math.max(0, E.t - lastFxT)); lastFxT = E.t; stepFx(dt);
    drawFx();
    drawParachutes(B);
    drawHud(st, B);
    withHand(() => drawBottom(st)); drawNotices(st);
    drawPandamonium(B);
    for (const [k, sp] of spInst) if (!live.has(k)) { sp.destroy(); spInst.delete(k); }
    return 'tiles2d'; // farolillos, cesto, burbuja en las manos, tiro y puntería: game.js, encima
  };
  // ---------------------------------------------------------------- cabecera y potenciadores (como en la tablet de la abuela,
  // Panda Pop 12.2: barra oscura arriba con la cara de cría y las que quedan, la barra de estrellas en el centro y los
  // puntos con la pausa a la derecha; abajo, los potenciadores en un panel oscuro). Medidas de su captura (500 de ancho)
  const pp = (v) => (v * E.W) / 500;
  GL.layout = () => (on() ? { top: pp(40), bottom: pp(88) } : null);
  function drawHud(st, B) {
    const P = st.P, g = gfx();
    g.beginFill(0x2a1a12, 0.82); g.drawRect(0, 0, E.W, pp(36)); g.endFill();
    g.beginFill(0x000000, 0.25); g.drawRect(0, pp(36), E.W, pp(3)); g.endFill();
    const goal = (P.goals || [])[0];
    img('HUDBabyPandaFace', pp(26), pp(18), { w: pp(42), h: pp(29), ax: 0.5, ay: 0.5 });
    if (goal) text(Math.max(0, goal.count - goal.left) + '/' + goal.count, pp(52), pp(19), pp(22), { fill: '#ffffff', stroke: '#2a1a12', sw: pp(3), ax: 0 });
    // barra de estrellas: fondo (Bar_Background), relleno (StarBarFull) y las tres estrellas
    const bx = pp(178), bw = pp(144), by = pp(5), bh = pp(25);
    nine('Bar_Background', bx, by, bw, bh, 0.45, { tint: 0x4a2c1c });
    const sp = st.spec && st.spec.starScores, sc = P.score || 0;
    if (sp) {
      const fr = Math.min(1, sc / (sp[2] * 1.08)), t = tex('StarBarFull');
      if (t && fr > 0) { const t2 = new PIXI.Texture(t.baseTexture, new PIXI.Rectangle(t.frame.x, t.frame.y, Math.max(1, t.frame.width * fr), t.frame.height)); img(t2, bx + pp(4), by + bh / 2, { w: (bw - pp(8)) * fr, h: bh - pp(8), ax: 0, ay: 0.5 }); }
      sp.forEach((v, i) => { const x = bx + pp(4) + (bw - pp(8)) * Math.min(1, v / (sp[2] * 1.08)); img(sc >= v ? 'StarBar_Star_Active' : 'StarBar_Star_Inactive', x, by + bh / 2, { w: pp(sc >= v ? 26 : 20), h: pp(sc >= v ? 25 : 21), ax: 0.5, ay: 0.5 }); });
    }
    text(String(Math.round(sc)), pp(452), pp(19), pp(22), { fill: '#ffffff', stroke: '#2a1a12', sw: pp(3), ax: 1 });
    img('Button_Round_Red_Small', pp(478), pp(18), { w: pp(32), h: pp(32), ax: 0.5, ay: 0.5, tint: 0xffa040 });
    img('Icon_Pause', pp(478), pp(18), { w: pp(15), h: pp(18), ax: 0.5, ay: 0.5 });
    E.hotspot('gl_pause', pp(458), 0, pp(42), pp(38), st.openPause);
    E.hotspot('gl_ask', 0, 0, pp(130), pp(38), st.ask);
  }
  const BITEM = { bomb: 'Item_Bomb', rainbow: 'Item_Rainbow', swapc: 'Item_Arrow' };
  // avisos nuestros (no están en Panda Pop): de quién es el turno si se juega por turnos y qué tocar con el potenciador
  // elegido (o con "¿qué es esto?"), bajo la barra de arriba
  function drawNotices(st) {
    const pill = (y, h, str, col) => { const w = E.W * 0.86, g = gfx(); g.beginFill(col, 0.92); g.lineStyle(pp(2), 0xffffff, 0.9); g.drawRoundedRect(E.W / 2 - w / 2, y - h / 2, w, h, h / 2); g.endFill(); text(str, E.W / 2, y, h * 0.5, { fill: '#ffffff', stroke: '#2a1a12', sw: pp(3) }); };
    let y = pp(60);
    if (st.duo) { pill(y, pp(32), 'Turno de ' + st.duo.name + '  ·  ' + st.duo.score[0] + ' – ' + st.duo.score[1], st.duo.turn ? 0x2e8ff0 : 0xe6a400); y += pp(38); }
    if (st.prompt) pill(y + Math.sin(E.t * 3) * pp(2), pp(32), st.prompt, 0x2a1a12);
  }
  function drawBottom(st) {
    const items = GAME.boosters || [], y0 = E.H - pp(82), w = pp(242), x0 = (E.W - w) / 2;
    const g = gfx(); g.beginFill(0x1e2a3a, 0.85); g.drawRoundedRect(x0, y0, w, pp(90), pp(14)); g.endFill();
    items.forEach((b, i) => {
      const cx = x0 + pp(40) + i * pp(81), cy = y0 + pp(38), have = st.boosterLeft(b.id), active = st.booster === b.id;
      const s = gfx(); s.beginFill(active ? 0x5a7aa8 : 0x2c3e55, 1); s.lineStyle(pp(2), 0x111a26); s.drawRoundedRect(cx - pp(36), cy - pp(32), pp(72), pp(66), pp(10)); s.endFill();
      img(BITEM[b.id], cx, cy, { w: pp(50), h: pp(50), ax: 0.5, ay: 0.5 });
      text(have === Infinity ? '∞' : String(Math.max(0, have)), cx - pp(26), cy - pp(22), pp(16), { fill: '#ffffff', stroke: '#111a26', sw: pp(3) });
      if (!have) { const p = gfx(); p.beginFill(0x3cb93c); p.lineStyle(pp(2), 0xffffff); p.drawRoundedRect(cx + pp(14), cy + pp(14), pp(22), pp(22), pp(5)); p.endFill(); text('+', cx + pp(25), cy + pp(25), pp(20), { fill: '#ffffff' }); }
      E.hotspot('gl_b_' + b.id, cx - pp(36), cy - pp(32), pp(72), pp(66), () => st.useBooster(b));
    });
  }
  GL.resize = function (cv, dpr) {
    ensureApp(cv); if (!app) return;
    view.style.width = cv.style.width; view.style.height = cv.style.height; view.style.left = cv.style.marginLeft || '0';
    app.renderer.resolution = dpr; app.renderer.resize(cv.width / dpr, cv.height / dpr);
    root.scale.set(E.scale / dpr);
  };
  // ---------------------------------------------------------------- final ("Pandamonium!", como en el vídeo del juego real):
  // el texto crece con rebote, del fondo suben llamaradas por los dos lados (Fire_Btm_VFX de CelebratoryAnim) y caen
  // confeti y destellos desde los lados (Confetti_L/R, Sparkle_Side)
  let pandaText = null;

  // ---------------------------------------------------------------- prefabs animados (gl/flat_cel.json + gl/anim.json)
  // Los dragones del final (Celebotary_Dragon_L/R con la animación Celeboratory), como drawPrefab de Cubos HD: nodos que
  // se encienden o apagan (m_IsActive, m_Enabled), cambio de sprite (m_Sprite), transparencia (m_Color.a) y
  // posición/escala locales. o = { anim, t, k (px por unidad del prefab), alpha }
  let PREF = null, ANIM = null, prefLoading = false;
  function loadPrefabs() {
    if (prefLoading) return; prefLoading = true;
    // los dragones (flat_cel, anim) y los obstáculos de la partida (flat_obs, anim_obs: tools/pp_obstaculos.py)
    for (const f of ['flat_cel.json', 'anim.json', 'flat_obs.json', 'anim_obs.json']) {
      const x = new XMLHttpRequest(); x.open('GET', E.privBase() + 'gl/' + f);
      x.onload = () => { try { const d = JSON.parse(x.responseText); if (f.startsWith('flat')) PREF = Object.assign(PREF || {}, d); else ANIM = Object.assign(ANIM || {}, d); } catch (e) { console.warn(f, e); } }; x.send();
    }
  }
  function sampleC(v, t) { const n = v.length; if (n <= 1) return v[0]; const f = Math.min(n - 1, Math.max(0, t * 60)), i = Math.floor(f), k = f - i; return i >= n - 1 ? v[n - 1] : v[i] + (v[i + 1] - v[i]) * k; }
  const mulM = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  // o = { anim, t, depth } o varias a la vez: o.anims = [{ a: clip, t, depth, loop }] (las de después mandan), k (px por
  // unidad del prefab), alpha, add, hide (nombres de nodo que no se dibujan), noRoot (sin la transformación de la raíz)
  // Curvas: m_IsActive, m_Enabled, m_Sprite, m_Color (r, g, b, a), posición, escala y giro (cuaternión o Euler) locales
  const prefNodes = new WeakMap();
  function drawPrefab(name, x, y, o) {
    loadPrefabs();
    const parts = PREF && PREF[name]; if (!parts) return false;
    const list = o.anims || (o.anim ? [{ a: o.anim, t: o.t || 0, depth: o.depth || 2 }] : []), k = o.k;
    let P = prefNodes.get(parts);
    if (!P) {
      P = { nodes: new Map(), sprites: parts.filter((p) => p.tipo === 'sprite').sort((a, b) => (a.capa || 0) - (b.capa || 0) || (b.z || 0) - (a.z || 0) || a.orden - b.orden), byClip: new Map() };
      for (const p of parts) if (p.tipo === 'nodo') { const key = p.ruta.concat(p.nodo).join('/'); P.nodes.set(key, { p, key, parent: p.ruta.join('/'), path: p.ruta.concat(p.nodo) }); }
      prefNodes.set(parts, P);
    }
    const curvesOf = (A) => { // por clip y profundidad: las curvas de cada nodo
      if (!ANIM) return null; const clip = ANIM[A.a]; if (!clip) return null;
      const ck = A.a + '@' + (A.root || A.depth || 2); let m = P.byClip.get(ck);
      // A.root: ruta del nodo del Animator bajo la raíz del prefab (la animación solo toca a ese nodo y a los de debajo)
      const hit = A.root != null ? (nd, q) => nd.path.slice(1).join('/') === (q.ruta ? A.root + '/' + q.ruta : A.root) : (nd, q) => nd.path.slice(A.depth || 2).join('/') === q.ruta;
      if (!m) { m = new Map(); for (const q of clip.curvas) for (const nd of P.nodes.values()) if (hit(nd, q)) (m.get(nd.key) || m.set(nd.key, []).get(nd.key)).push(q); P.byClip.set(ck, m); }
      return { clip, m };
    };
    const act = list.map((A) => { const c = curvesOf(A); if (!c) return null; let t = A.t || 0; t = A.loop !== false && c.clip.bucle && c.clip.dur > 0 ? t % c.clip.dur : Math.min(t, c.clip.dur); return { c, t }; }).filter(Boolean);
    const st = new Map(); // estado de cada nodo en el instante t: matriz en el mundo, encendido, color, sprite
    const stateOf = (key) => {
      let s0 = st.get(key); if (s0) return s0;
      const nd = P.nodes.get(key); if (!nd) return null;
      const L = nd.p.local; let px = L[0], py = L[1], sx = L[2], sy = L[3], rot = L[4], on = nd.p.activo !== false || nd.parent === '', col = null, spr = null, en = true;
      for (const { c, t } of act) for (const q of c.m.get(key) || []) {
        if (q.clase === 'pos') { px = sampleC(q.v[0], t); py = sampleC(q.v[1], t); }
        else if (q.clase === 'scale') { sx = sampleC(q.v[0], t); sy = sampleC(q.v[1], t); }
        else if (q.clase === 'rot') { const qx = sampleC(q.v[0], t), qy = sampleC(q.v[1], t), qz = sampleC(q.v[2], t), qw = sampleC(q.v[3], t); rot = (Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz)) * 180) / Math.PI; }
        else if (q.clase === 'euler') rot = sampleC(q.v[2], t);
        else if (q.prop === 'm_IsActive') on = sampleC(q.v[0], t) >= 0.5;
        else if (q.prop === 'm_Enabled') en = sampleC(q.v[0], t) >= 0.5;
        else if (typeof q.prop === 'string' && q.prop.startsWith('m_Color.')) { col = col || {}; col[q.prop[8]] = sampleC(q.v[0], t); }
        else if (q.clase === 'pptr') spr = c.clip.sprites[Math.round(sampleC(q.v[0], t))];
      }
      if (o.hide && o.hide.has(nd.p.nodo)) on = false;
      const r = (rot * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r), M = !nd.parent && o.noRoot ? [1, 0, 0, 1, 0, 0] : [co * sx, si * sx, -si * sy, co * sy, px, py];
      const par = nd.parent ? stateOf(nd.parent) : null;
      s0 = { W: par ? mulM(par.W, M) : M, on: on && (!par || par.on), en, col, spr };
      st.set(key, s0); return s0;
    };
    for (const p of P.sprites) {
      const s0 = stateOf(p.ruta.concat(p.nodo).join('/')); if (!s0 || !s0.on || !s0.en) continue;
      const pc = p.color || [1, 1, 1, 1], c = s0.col || {};
      const al = (c.a != null ? c.a : pc[3]) * (o.alpha != null ? o.alpha : 1); if (al <= 0.01) continue;
      const tx = tex(s0.spr || p.sprite + (p.sid ? '#' + p.sid : '')); if (!tx) continue;
      const rr = c.r != null ? c.r : pc[0], gg = c.g != null ? c.g : pc[1], bb = c.b != null ? c.b : pc[2];
      const tint = rr >= 0.999 && gg >= 0.999 && bb >= 0.999 ? undefined : (Math.round(Math.min(1, rr) * 255) << 16) | (Math.round(Math.min(1, gg) * 255) << 8) | Math.round(Math.min(1, bb) * 255);
      const W = s0.W, mir = W[0] * W[3] - W[1] * W[2] < 0, sx = Math.hypot(W[0], W[1]), sy = Math.hypot(W[2], W[3]), r0 = mir ? Math.atan2(-W[1], -W[0]) : Math.atan2(W[1], W[0]); // con escala negativa en x: espejo
      img(tx, x + W[4] * k, y - W[5] * k, { w: tx.u[0] * sx * k, h: tx.u[1] * sy * k, rot: -r0, flipX: mir, alpha: al, add: !!o.add, tint });
    }
    return true;
  }
  GL.drawPrefab = drawPrefab;
  function drawPandamonium(B) {
    const F = B.fin; if (!F) return;
    const t = E.t - F.t0, T = F.dur;
    if (!F.fx) {
      F.fx = true;
      GL.ufx('CelebratoryAnim', 0, E.H * 0.38, E.H * FIN_K, { solo: /^(Confetti_L|Confetti_Stretch|trail_PFX|Sparkle_Side_L)$/, noPos: true });
      GL.ufx('CelebratoryAnim', E.W, E.H * 0.38, E.H * FIN_K, { solo: /^(Confetti_R|Sparkle_Side_R)$/, noPos: true });
    }
    if (t < T - 0.4 && (!F.nextFire || E.t >= F.nextFire)) { // llamaradas continuas abajo, a los lados
      F.nextFire = E.t + 0.12;
      for (const x of [E.W * 0.12, E.W * 0.88]) GL.ufx('CelebratoryAnim', x, E.H * 0.95, E.H * FIN_K, { solo: /^Fire_Btm_VFX$/, noPos: true });
    }
    if (!pandaText) {
      pandaText = new PIXI.Text('Pandamonium!', new PIXI.TextStyle({ fontFamily: [E.fontFamily || 'JuegoOriginal', 'sans-serif'], fontSize: 120, fill: ['#ffffff', '#ffe36a', '#ff8a1e'], fillGradientStops: [0, 0.45, 1],
        stroke: '#8a1d10', strokeThickness: 14, lineJoin: 'round', dropShadow: true, dropShadowColor: '#3a0a05', dropShadowDistance: 6, dropShadowAngle: Math.PI / 2, dropShadowBlur: 0 }));
      pandaText.anchor.set(0.5);
    }
    for (const nm of ['Celebotary_Dragon_L', 'Celebotary_Dragon_R']) drawPrefab(nm, E.W / 2 + DRG_X * (nm.endsWith('L') ? -1 : 1) * 0, E.H / 2, { anim: 'Celeboratory', t, k: E.H / DRG_H });
    const sIn = t < 0.35 ? (t / 0.35) * 1.15 : t < 0.5 ? 1.15 - ((t - 0.35) / 0.15) * 0.15 : 1, a = t > T - 0.35 ? Math.max(0, (T - t) / 0.35) : 1;
    pandaText.scale.set((E.W * 0.86 * Math.max(0.01, sIn)) / (pandaText.width / (pandaText.scale.x || 1)));
    pandaText.position.set(E.W / 2, E.H * 0.42); pandaText.alpha = a; root.addChild(pandaText);
  }
  let FIN_K = 0.5, DRG_H = 1920, DRG_X = 0; // CelebratoryAnim va en la cámara del HUD: una unidad = medio alto de pantalla
  const OFF = {}; // para medir en la tablet qué cuesta: GL.debug.set('off', { mama: true, ... })
  GL.debug = { set: (k, v) => { if (k === 'off') Object.assign(OFF, v); if (k === 'mama') MAMA_K = v; else if (k === 'pop') POP_K = v; else if (k === 'baby') BABY_K = v; else if (k === 'drgh') DRG_H = v; else if (k === 'drgx') DRG_X = v; } };

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
    if (bakeQ.size && !bakeBusy) { bakeBusy = true; setTimeout(() => { bakeBusy = false; for (const [k, a] of bakeQ) { const r = bakeNow(a[0], a[1], a[2]); if (r !== null) bakeQ.delete(k); break; } }, 0); } // fuera del fotograma (dentro salía vacía), una cada vez
  };
})();
