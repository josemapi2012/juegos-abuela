// robot de pruebas (Cubos Locos)
window.robo = function (n) {
  E.popup = null; E.startLevel(n);
  for (let i = 0; i < 90; i++) E.step(1 / 30);
  const P = E.play.P, spec = GAME.makeLevel(n);
  let guard = 0;
  while (guard++ < 300) {
    for (let i = 0; i < 600 && P.busy; i++) E.step(1 / 30);
    if (E.popup && E.popup.starsShown != null) return { n, win: true, moves: spec.moves, left: P.moves };
    if (E.popup) return { n, win: false, moves: spec.moves, goals: P.goals.filter((g) => g.left > 0).map((g) => g.type + (g.key != null ? g.key : '') + ':' + g.left).join(' ') };
    if (P.dead || P.moves <= 0 || !P.goals.some((g) => g.left > 0)) { for (let i = 0; i < 300 && !E.popup; i++) E.step(1 / 30); continue; }
    const S0 = P.S, lay = E.play.layout.board;
    const ts = Math.min(lay.w / S0.C, lay.h / S0.R, 78), bx = lay.x + (lay.w - ts * S0.C) / 2, by = lay.y + (lay.h - ts * S0.R) / 2;
    const need = { color: {} };
    P.goals.forEach((g) => { if (g.type === 'color') need.color[g.key] = g.left; else need[g.type] = g.left; });
    const b = GAME.botPick(P.S, need);
    if (b) P.down(bx + b[1] * ts + ts / 2, by + b[0] * ts + ts / 2);
    for (let i = 0; i < 5; i++) E.step(1 / 30);
  }
  return { n, stuck: true };
};
window.__runL = (L) => { window.__res = null; const out = []; let i = 0; const nx = () => { if (i >= L.length) { window.__res = out.filter((x) => x.includes('"win":true')).length + '/' + L.length + '\n' + out.join('\n'); return; } try { out.push(JSON.stringify(robo(L[i]))); } catch (e) { out.push(L[i] + ' ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } i++; setTimeout(nx, 0); }; nx(); };
