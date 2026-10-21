// robot de pruebas (Burbujas Panda)
window.robo = function (n) {
  E.popup = null; E.startLevel(n);
  for (let i = 0; i < 120; i++) E.step(1 / 30);
  const P = E.play.P, S = P.S, spec = GAME.makeLevel(n);
  let guard = 0;
  while (guard++ < 300) {
    for (let i = 0; i < 600 && P.busy; i++) E.step(1 / 30);
    if (E.popup && E.popup.starsShown != null) return { n, win: true, moves: spec.moves, left: P.moves };
    if (E.popup) return { n, win: false, moves: spec.moves, dead: P.deadMsg || '', goals: P.goals.map((g) => g.type + ':' + g.left).join(' ') };
    if (P.dead || P.moves <= 0 || !P.goals.some((g) => g.left > 0)) { for (let i = 0; i < 300 && !E.popup; i++) E.step(1 / 30); continue; }
    const full = [0, 1, 2, 3].filter((i) => S.lan[i] >= 1);
    if (full.length && !S.power) { const [x, y] = P.lanternXY(full[0]); P.down(x, y); }
    const pw = S.power; S.power = null; P.hint(); S.power = pw;
    P.autoShot();
    for (let i = 0; i < 5; i++) E.step(1 / 30);
  }
  return { n, stuck: true, moves: P.moves, busy: P.busy, popup: !!E.popup, state: E.play.state, cur: E.play.n, left: P.goals.map((g) => g.left).join(',') };
};
window.__runL = (L) => { window.__res = null; const out = []; let i = 0; const nx = () => { if (i >= L.length) { window.__res = out.filter((x) => x.includes('"win":true')).length + '/' + L.length + '\n' + out.join('\n'); return; } try { out.push(JSON.stringify(robo(L[i]))); } catch (e) { out.push(L[i] + ' ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } i++; setTimeout(nx, 0); }; nx(); };
