// Pasada larga de los robots: juega los niveles DESDE..HASTA de cada juego en Chrome sin ventana
// y guarda el resultado de cada nivel en tools/robots/resultados/<juego>.json
// Uso: node tools/robots/pasada.mjs [desde] [hasta] [juegos...]
//   (antes: ./build.sh <juego> web para cada juego)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
mkdirSync(join(ROOT, 'tools', 'robots', 'resultados'), { recursive: true });
const [desde = '1', hasta = '300', ...lista] = process.argv.slice(2);
const JUEGOS = lista.length ? lista : ['cubos', 'dulces', 'mascotas', 'burbujas'];
const ROBOT = { cubos: 'robo_c.js', dulces: 'robo.js', mascotas: 'robo_m.js', burbujas: 'robo_b.js' };
const PORT = 8799, DBG = 9444;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', join(ROOT, 'build')], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pasada-'))}`,
  '--window-size=600,960', ...(process.env.CI ? ['--no-sandbox'] : []), '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
const fin = () => { try { chrome.kill(); } catch (e) {} try { server.kill(); } catch (e) {} };
process.on('exit', fin); process.on('SIGINT', () => { fin(); process.exit(1); });

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const wait = new Map(); const errores = [];
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description?.split('\n').slice(0, 2).join(' ') || d.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send('Runtime.enable');
  return { ev, send, errores, close: () => ws.close() };
}

for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${DBG}/json/version`); break; } catch (e) { await sleep(200); } }
await sleep(500);

async function jugar(juego) {
  const t = await (await fetch(`http://localhost:${DBG}/json/new?http://localhost:${PORT}/${juego}/assets/index.html?pasada=${Date.now()}`, { method: 'PUT' })).json();
  const c = await cdp(t.webSocketDebuggerUrl);
  // misma pantalla que la tablet (600×960 en unidades del juego), si no los tableros altos enseñan menos filas
  await c.send('Emulation.setDeviceMetricsOverride', { width: 600, height: 960, deviceScaleFactor: 1, mobile: false });
  await c.ev('location.reload(); true');
  await sleep(1500);
  for (let i = 0; i < 100 && !(await c.ev('typeof E !== "undefined" && !!E.play')); i++) await sleep(200);
  await c.ev('localStorage.clear(); E.save.resume = null; true');
  await c.ev(readFileSync(join(ROOT, 'tools', 'robots', ROBOT[juego]), 'utf8') + '; true');
  // bucle dentro de la página, nivel a nivel, cediendo el control entre niveles
  await c.ev(`(() => {
    window.__pasada = { res: [], done: false };
    (async () => {
      for (let n = ${+desde}; n <= ${+hasta}; n++) {
        let spec = null, r;
        const t0 = performance.now();
        try { spec = GAME.makeLevel(n); } catch (e) { __pasada.res.push({ n, err: 'generar: ' + e.message }); continue; }
        const gen = Math.round(performance.now() - t0), t1 = performance.now();
        try { r = robo(n); } catch (e) { r = { n, err: e.message + ' ' + ((e.stack || '').split('\\n')[1] || '').trim() }; }
        r.gen = gen; r.play = Math.round(performance.now() - t1);
        r.specMoves = spec.moves === Infinity ? null : spec.moves;
        r.goals = spec.goals.map((g) => g.type + ':' + g.count).join(' ');
        r.mode = r.mode || spec.mode;
        __pasada.res.push(r);
        E.popup = null;
        await new Promise((ok) => setTimeout(ok, 0));
      }
      __pasada.done = true;
    })();
    return true;
  })()`);
  const out = join(ROOT, 'tools', 'robots', 'resultados', juego + '.json');
  let visto = 0;
  for (;;) {
    await sleep(5000);
    const st = await c.ev('JSON.stringify({ res: __pasada.res, done: __pasada.done })');
    if (!st) continue;
    const { res, done } = JSON.parse(st);
    if (res.length !== visto) {
      visto = res.length;
      writeFileSync(out, JSON.stringify({ juego, desde: +desde, hasta: +hasta, res, errores: c.errores }, null, 1));
      const g = res.filter((x) => x.win).length;
      console.log(`[${new Date().toLocaleTimeString()}] ${juego}: ${res.length} niveles, gana ${g} (${Math.round((100 * g) / res.length)}%)`);
    }
    if (done) break;
  }
  // de paso, el registro de partidas que el motor ha ido apuntando
  const reg = await c.ev('JSON.stringify({ total: (E.save.log || []).length, ultimos: (E.save.log || []).slice(-3) })');
  const data = JSON.parse(readFileSync(out, 'utf8')); data.registro = JSON.parse(reg); writeFileSync(out, JSON.stringify(data, null, 1));
  console.log(juego + ': registro de partidas ' + reg);
  c.close();
}

await Promise.all(JUEGOS.map(jugar));
console.log('Pasada terminada');
fin();
process.exit(0);
