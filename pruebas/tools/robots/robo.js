// robot de pruebas (Dulces): juega un nivel entero con el bot del juego
window.robo = function (n) {
  E.popup = null; E.startLevel(n);
  for (let i = 0; i < 120; i++) E.step(1 / 30);
  const P = E.play.P, S = P.S;
  const lay = E.play.layout.board;
  let ts = Math.min(lay.w / S.C, lay.h / S.R, 76), bx = lay.x + (lay.w - ts * S.C) / 2, by = lay.y + (lay.h - ts * S.R) / 2;
  const gs = P.glState && P.glState(); if (gs) ({ ts, bx, by } = gs); // Dulces HD: el tablero lo coloca WebGL
  const xy = (r, c) => [bx + c * ts + ts / 2, by + r * ts + ts / 2];
  let frogs = 0, guard = 0;
  const m0 = P.moves;
  while (guard++ < 400) {
    for (let i = 0; i < 400 && P.busy; i++) E.step(1 / 30);
    const left = P.goals.filter((g) => g.left > 0).length;
    if (!left) return { n, win: true, moves: m0, left: P.moves, frogs };
    if (P.dead || P.moves <= 0) return { n, win: false, moves: m0, dead: P.deadMsg || '', goals: P.goals.map((g) => g.type + (g.key != null ? g.key : '') + ':' + g.left).join(' '), frogs };
    const need = { color: {} };
    P.goals.forEach((g) => { if (g.type === 'color') need.color[g.key] = g.left; else need[g.type] = g.left; });
    if (S.frogFull && S.frogBelly >= S.frogFull && GAME.findFrog(S)) {
      const f = GAME.findFrog(S), t = GAME.frogTarget(S, need);
      P.down(...xy(f[0], f[1])); P.up(); P.down(...xy(t[0], t[1])); P.up(); frogs++;
      for (let i = 0; i < 10; i++) E.step(1 / 30);
      continue;
    }
    const m = GAME.botPick(S, need);
    if (!m) { E.step(1 / 30); continue; }
    P.down(...xy(m[0][0], m[0][1])); P.move(...xy(m[1][0], m[1][1])); P.up();
    for (let i = 0; i < 10; i++) E.step(1 / 30);
  }
  return { n, stuck: true };
};
window.roboMany = function (list) {
  const out = [];
  for (const n of list) { try { out.push(JSON.stringify(robo(n))); } catch (e) { out.push(n + ' ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } }
  return out.join('\n');
};
