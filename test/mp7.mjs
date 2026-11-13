// stage five online: the weather reaches a joined player; a joined player rides the bus, plays dice and gets accused, hands a purse back
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const MOCK = `(() => {
  const me = 'peer' + (window.name || Math.random().toString(36).slice(2, 10)), ch = new BroadcastChannel('mockroom7'), table = {}, subs = []; let mine = {}, off = false;
  const fire = () => subs.forEach(f => { try { f({}); } catch (e) { console.error('onPeers handler: ' + e.message); } });
  ch.onmessage = e => { if (off) return; const m = e.data; if (m.t === 'p') { table[m.id] = m.p; fire(); } else if (m.t === 'bye') { delete table[m.id]; fire(); } else if (m.t === 'hello') ch.postMessage({ t: 'p', id: me, p: mine }); };
  window.__mock = { me, off: () => { ch.postMessage({ t: 'bye', id: me }); off = true; for (const k in table) delete table[k]; fire(); }, on: () => { off = false; ch.postMessage({ t: 'hello' }); ch.postMessage({ t: 'p', id: me, p: mine }); } };
  const room = {
    peers: () => [{ peer: me, presence: mine, isMe: true, sameTab: true }].concat(Object.keys(table).map(k => ({ peer: k, presence: table[k], isMe: false, sameTab: false }))),
    presence: patch => { const o = Object.assign({}, mine); for (const k in patch) { if (patch[k] === null) delete o[k]; else o[k] = patch[k]; } mine = o; if (!off) ch.postMessage({ t: 'p', id: me, p: o }); return Promise.resolve(); },
    onPeers: fn => { subs.push(fn); setTimeout(() => fn({}), 0); return () => {}; }, join: async () => room, get up() { return !off; }, get rtt() { return off ? 0 : 42; } };
  window.claude = { use: async n => n === 'room' ? (ch.postMessage({ t: 'hello' }), room) : null };
  window.__PC_TEST = true; window.__PC_MANUAL = true;
})();`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(MOCK);
const errs = [];
async function open(tag) {
  const p = await ctx.newPage(); await p.evaluate(t => { window.name = t; }, tag).catch(() => {});
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error') && !/ERR_FAILED/.test(t)) errs.push(tag + ' ' + t); });
  p.on('pageerror', e => errs.push(tag + ' PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await p.route('**fonts.googleapis.com/**', r => r.abort());
  await p.goto('file://' + ROOT + 'dist/claude.html');
  return p;
}
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (k, v) => console.log(k, JSON.stringify(v));
const shotOf = async (p, path) => { await p.evaluate(() => { __pc.visuals(.016); __pc.draw(); }); await p.screenshot({ path }); };

const A = await open('a'), B = await open('b'); let live = [A, B];
const pump = async (n, ms) => { for (let i = 0; i < n; i++) { for (const p of live) await p.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(ms || 3); } };
await sleep(1200);
for (const [p, n] of [[A, 'Alice'], [B, 'Bob']]) { await p.fill('#co-name', n); await p.dispatchEvent('#co-name', 'change'); }
await A.click('#co-host'); await sleep(300); await B.click('#co-join'); await sleep(300); await B.click('#co-ready'); await sleep(300);
await A.click('#co-start'); await sleep(400); await pump(60);
await A.evaluate(() => { const g = __pc; g.DBG.notarget = true; g.DBG.god = true; });
await A.evaluate(() => { const g = __pc; g.DBG.notarget = true; g.DBG.god = true; });
await B.evaluate(() => { const g = __pc; g.DBG.god = true; g.P.earn += 5000; });
// the weather: the host says storm, Bob's sky follows
await A.evaluate(() => { __pc.WX.k = 3; __pc.WX.next = __pc.G.time + 9999; });
await pump(90);
log('weather', { host: await A.evaluate(() => [__pc.WX.k, +__pc.WX.rain.toFixed(2)]), bob: await B.evaluate(() => [__pc.WX.k, +__pc.WX.rain.toFixed(2), __pc.rainMesh.visible]) });
await A.evaluate(() => { __pc.WX.k = 0; });
// the bus: put one at a stop by Bob and let him ride it
const S = await A.evaluate(() => { const g = __pc; for (let i = 0; i < 20 && !g.cars.some(c => c.bus && c.ai); i++) { g.BUS.t = 0; g.busService(); g.step(1, 1 / 30); } const S = g.BUS_STOPS[1]; return { id: S.id, x: S.x, z: S.z, nx: S.F.nx, nz: S.F.nz, leg: S.leg, s: S.s }; });
await B.evaluate(S => { const g = __pc; g.P.x = S.x + S.nx * 1.5; g.P.z = S.z + S.nz * 1.5; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); }, S);
await pump(20);
const busId = await A.evaluate(S => { const g = __pc, c = g.cars.find(q => q.bus && q.ai); if (!c) return null; const a = g.BUS_ROUTE[S.leg], b = g.BUS_ROUTE[(S.leg + 1) % g.BUS_ROUTE.length], lp = { x: 0, z: 0 }; g.lanePoint(a, b, S.s - 35, g.LANE, lp); c.x = lp.x; c.z = lp.z; c.yaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])); c.vx = c.vz = 0; const A2 = c.ai; A2.from = a; A2.to = b; A2.ri = (S.leg + 2) % g.BUS_ROUTE.length; A2.next = g.BUS_ROUTE[A2.ri]; A2.served = -1; A2.wait = 0; A2.off = g.LANE; return c.id; }, S);
let at = null; for (let i = 0; i < 80 && !at; i++) { await pump(3); at = await A.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return c && c.ai && c.ai.wait > 0 ? c.ai.atStop : null; }, busId); }
await pump(12);
log('bus at the stop', { atStop: at, bobSees: await B.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return c ? [c.type, Math.round(c.x), Math.round(c.z), +Math.hypot(c.vx, c.vz).toFixed(1)] : null; }, busId) });
log('Bob gets on', await B.evaluate(id => { const g = __pc, c = g.cars.find(q => q.id === id), d = g.busDoor(c, {}); g.P.x = d.x + Math.cos(c.yaw) * .5; g.P.z = d.z - Math.sin(c.yaw) * .5; g.P.y = g.groundAt(g.P.x, g.P.z, .8, 'p'); g.P.vx = g.P.vz = g.P.vy = 0; g.step(2, 1 / 30); const pr = g.findPromptNow(); const dbg = { me: [+g.P.x.toFixed(1), +g.P.y.toFixed(2), +g.P.z.toFixed(1)], door: [+d.x.toFixed(1), +d.z.toFixed(1)], bus: [+c.x.toFixed(1), +c.y.toFixed(2), +c.z.toFixed(1)], occ0: c.occ[0] && [c.occ[0].kind, c.occ[0].team], offer: g.busOffer(c), reach: g.carInReach ? (g.carInReach() || {}).id : 'n/a' }; if (pr && pr.act) pr.act(); return { text: pr && pr.text, dbg }; }, busId));
await pump(25);
log('aboard', { bob: await B.evaluate(() => [__pc.P.car && __pc.P.car.type, __pc.P.seat, document.getElementById('h-car').textContent]), host: await A.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return c.occ.map(o => o ? (o.name || o.kind) : '-'); }, busId) });
let moved = 0; for (let i = 0; i < 60; i++) { await pump(4); } 
log('riding', { bob: await B.evaluate(() => { const g = __pc; return g.P.car ? [Math.round(g.P.car.x), Math.round(g.P.car.z), g.P.seat, document.getElementById('h-car').textContent] : 'off'; }), host: await A.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return [Math.round(c.x), Math.round(c.z), c.ai && c.ai.atStop]; }, busId) });
await B.evaluate(() => __pc.GAME.leaveCar(false)); await pump(10);
log('Bob off', await B.evaluate(() => ({ car: !!__pc.P.car, y: +__pc.P.y.toFixed(2) })));
// dice: evening, Bob walks up to a game
const D = await A.evaluate(() => { const g = __pc; g.G.tod = 20; const s = g.diceSpots()[1]; return { i: s.i, x: s.x, z: s.z }; });
await B.evaluate(D => { const g = __pc; g.P.x = D.x + 70; g.P.z = D.z; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); }, D);
for (let i = 0; i < 30; i++) { await A.evaluate(() => __pc.diceTick()); await pump(1); }
await B.evaluate(D => { const g = __pc; g.P.x = D.x + 1.8; g.P.z = D.z; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); }, D); await pump(20);
log('Bob at the dice', await B.evaluate(D => { const g = __pc, s = g.diceSpots()[D.i], pr = g.dicePrompt(); return { players: g.dicers(s).length, prompt: pr && pr.text }; }, D));
const sq0 = await A.evaluate(() => __pc.cars.filter(c => c.squad && c.squad.kind === 'rp').length);
log('Bob too lucky', await B.evaluate(D => { const g = __pc, pr = g.dicePrompt(); if (pr && pr.act) pr.act(); g.DICE.streak = 6; g.DICE.won = 3000; const R = Math.random; Math.random = () => .99; try { for (let k = 0; k < 6 && g.DICE.streak; k++) g.diceRoll(50); } finally { Math.random = R; } return { busted: !g.DICE.streak, banner: document.querySelector('#h-banner .big').textContent }; }, D));
await pump(30);
log('host sends a crew after Bob', { squads: await A.evaluate(() => __pc.cars.filter(c => c.squad && c.squad.kind === 'rp').length) - sq0 });
await b.close();
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
