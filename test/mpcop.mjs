// three players through the lobby and an open-world session, with a stand-in for the shared room
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';   // wherever Playwright is installed
const ROOT = new URL('..', import.meta.url).pathname;
const MOCK = `(() => {
  const me = 'peer' + Math.random().toString(36).slice(2, 10), ch = new BroadcastChannel('mockroom'), table = {}, subs = []; let mine = {};
  const fire = () => subs.forEach(f => { try { f({}); } catch (e) { console.error('onPeers handler: ' + e.message + ' ' + (e.stack || '').split('\\n')[1]); } });
  ch.onmessage = e => { const m = e.data; if (m.t === 'p') { table[m.id] = m.p; fire(); } else if (m.t === 'bye') { delete table[m.id]; fire(); } else if (m.t === 'hello') ch.postMessage({ t: 'p', id: me, p: mine }); };
  window.addEventListener('pagehide', () => ch.postMessage({ t: 'bye', id: me }));
  window.__mock = { bye: () => { ch.postMessage({ t: 'bye', id: me }); ch.close(); } };
  const room = {
    peers: () => [{ peer: me, presence: mine, isMe: true, sameTab: true }].concat(Object.keys(table).map(k => ({ peer: k, presence: table[k], isMe: false, sameTab: false }))),
    presence: patch => { const o = Object.assign({}, mine); for (const k in patch) { if (patch[k] === null) delete o[k]; else o[k] = patch[k]; } const n = new TextEncoder().encode(JSON.stringify(o)).length; window.__maxBytes = Math.max(window.__maxBytes || 0, n); if (n > 4096) { window.__over = (window.__over || 0) + 1; return Promise.reject(new Error('invalid_argument')); } mine = o; ch.postMessage({ t: 'p', id: me, p: mine }); return Promise.resolve(); },
    onPeers: fn => { subs.push(fn); setTimeout(() => fn({}), 0); return () => {}; }, join: async () => room };
  window.claude = { use: async n => n === 'room' ? (ch.postMessage({ t: 'hello' }), room) : null };
  window.__PC_TEST = true; window.__PC_MANUAL = true;
})();`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(MOCK);
const errs = [];
async function open(tag) {
  const p = await ctx.newPage();
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error') && !/ERR_FAILED/.test(t)) errs.push(tag + ' ' + t); });
  p.on('pageerror', e => errs.push(tag + ' PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await p.route('**fonts.googleapis.com/**', r => r.abort());
  await p.goto('file://' + ROOT + 'dist/claude.html');
  return p;
}
const A = await open('A'), B = await open('B'); let C = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (k, v) => console.log(k, JSON.stringify(v));
// every page must keep simulating even when not in front: drive them by hand
const pump = async (n, ms) => { for (let i = 0; i < n; i++) { for (const p of [A, B, C]) if (p) await p.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(ms || 4); } };
const shotOf = async (p, path) => { await p.evaluate(() => { __pc.visuals(.016); __pc.draw(); }); await p.screenshot({ path }); };
await sleep(1200);
await A.click('#co-host'); await sleep(300); await B.click('#co-join'); await sleep(300); await B.click('#co-ready'); await sleep(300); await A.click('#co-start'); await sleep(300); await pump(30);
const where = process.argv[2] || 'quik';
await B.evaluate(w => { const g = __pc, P = g.P; g.DBG.god = true; if (w === 'quik') { const r = g.ROBS[2]; P.x = r.x; P.z = r.z; } else if (w === 'store') { const r = g.ROBS[1]; P.x = r.x; P.z = r.z; } else { P.x = 110; P.z = 262; } P.y = .15; }, where); await pump(10);
await A.evaluate(() => { const g = __pc; g.DBG.notarget = true; g.GAME.crime(Object.values(g.NET.remotes)[0], 0, 2); });
for (let k = 0; k < 20; k++) { await pump(30); log('t', await A.evaluate(() => { const g = __pc, r = Object.values(g.NET.remotes)[0]; return g.G.time.toFixed(0) + 's h' + r.heat + (r.evade ? 'e' : '') + ' seen' + (g.G.time - r.seenT).toFixed(0) + ' cars[' + g.cars.filter(c => c.cop).map(c => Math.round(Math.hypot(c.x - r.x, c.z - r.z)) + (c.ai ? c.ai.mode[0] + (c.ai.direct ? 'D' : '') + (c.ai.done ? '!' : '') + (c.ai.clear ? 'c' : '') : '-')).join(',') + '] foot[' + g.bots.filter(b => b.team === 3 && !b.dead && !b.car).map(b => Math.round(Math.hypot(b.x - r.x, b.z - r.z)) + (b.tgt ? 't' : b.hunt ? 'h' : b.wantCar ? 'w' : b.path ? 'p' : '') + (b.chase ? '' : '~')).join(',') + ']'; }) + ' | B hp' + await B.evaluate(() => Math.round(__pc.P.hp) + ' h' + __pc.P.heat)); }
console.log([...new Set(errs)].slice(0, 20).join('\n') || 'no errors');
await b.close();
