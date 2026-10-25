// robot de pruebas (Rescate Animal)
window.robo = function (n) {
  E.popup = null; E.startLevel(n);
  for (let i = 0; i < 150; i++) E.step(1 / 30);
  const P = E.play.P, S = P.S, spec = GAME.makeLevel(n);
  let guard = 0;
  while (guard++ < 600) {
    for (let i = 0; i < 600 && P.busy; i++) E.step(1 / 30);
    if (E.popup && E.popup.starsShown != null) return { n, mode: spec.mode, win: true, score: P.score, stars: spec.starScores.join('/'), moves: P.moves };
    if (E.popup) return { n, mode: spec.mode, win: false, dead: P.deadMsg || 'moves', goals: P.goals.map((g) => g.type + ':' + g.left).join(' '), score: P.score, star1: spec.starScores[0] };
    if (P.dead || P.moves <= 0 || !P.goals.some((g) => g.left > 0)) { for (let i = 0; i < 300 && !E.popup; i++) E.step(1 / 30); continue; }
    const need = { color: {} };
    P.goals.forEach((g) => { if (g.type === 'color') need.color[g.key] = g.left; else need[g.type] = g.left; });
    if (S.charge >= 200) {
      const [rx, ry] = P.rocketXY(); P.down(rx, ry); P.up && P.up();
      const c = GAME.bestColumn(S, spec.V);
      const B = E.play.layout.board; // una fila que se vea dentro del tablero (en el dibujo WebGL el tablero va centrado: sus límites)
      const G = P.glState && P.glState(), top = G ? G.by + 4 : B.y + 30, bot = G ? G.by + G.V * G.tsy - 4 : B.y + B.h - 140;
      for (let r = 0; r < S.R; r++) { const [x, y] = P.cellXY(r, c); if (y > top && y < bot) { P.down(x, y); break; } }
      if (G && P.fireRocket && P.glState().rocketAim) P.fireRocket(); // en el dibujo WebGL se confirma con ✓
      E.step(1 / 30); continue;
    }
    const m = GAME.botPick(S, need, spec.V);
    if (!m) { E.step(1 / 30); continue; }
    const [x, y] = P.cellXY(m[0], m[1]); P.down(x, y); P.up && P.up();
    for (let i = 0; i < 5; i++) E.step(1 / 30);
  }
  return { n, stuck: true, goals: P.goals.map((g) => g.type + ':' + g.left).join(' ') };
};
window.__runL = (L) => { window.__res = null; const out = []; let i = 0; const nx = () => { if (i >= L.length) { window.__res = out.join('\n'); return; } try { out.push(JSON.stringify(robo(L[i]))); } catch (e) { out.push(L[i] + ' ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } i++; setTimeout(nx, 0); }; nx(); };
