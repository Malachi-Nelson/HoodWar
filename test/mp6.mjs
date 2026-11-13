// planes online: a client flies a Mallard off the runway with the host riding along; each sees the other right
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const MOCK = `(() => {
  const me = 'peer' + (window.name || Math.random().toString(36).slice(2, 10)), ch = new BroadcastChannel('mockroom6'), table = {}, subs = []; let mine = {}, off = false;
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
await B.evaluate(() => { const g = __pc; g.DBG.god = true; });
const teams = [await A.evaluate(() => __pc.P.team), await B.evaluate(() => __pc.P.team)];
log('teams', teams);
// the host puts a Mallard at the south end of the runway; Bob walks up to it and takes the controls
log('cars', await A.evaluate(() => { const g = __pc; return { n: g.cars.length, homes: g.cars.filter(q => q.home).length, occ: g.cars.filter(q => q.occ.some(o => o)).length, kinds: Object.entries(g.cars.reduce((m, q) => (m[q.type] = (m[q.type] || 0) + 1, m), {})) }; }));
const id = await A.evaluate(() => { const g = __pc; const c = g.spawnCar('prop', g.RWY.cx, g.RWY.z1 - 25, 0, {}); window.__c = c; g.P.x = c.x - 6; g.P.z = c.z + 4; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); return c.id; });
await B.evaluate(() => { const g = __pc; g.P.x = g.RWY.cx + 8; g.P.z = g.RWY.z1 - 22; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); g.P.vx = g.P.vz = 0; });
await pump(30);
log('Bob boards', await B.evaluate(id => { const g = __pc, c = g.cars.find(q => q.id === id); if (!c) return 'no plane on Bob\'s screen'; window.__c = c; const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); g.P.x = c.x + rx * 1.9; g.P.z = c.z + rz * 1.9; g.P.y = c.y; g.step(4, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); return pr && pr.text; }, id));
await pump(20);
log('aboard', { bob: await B.evaluate(() => [__pc.P.car && __pc.P.car.type, __pc.P.seat, __pc.P.car && __pc.P.car.mine]), hostSees: await A.evaluate(() => { const c = window.__c; return [c.occ[0] && c.occ[0].name, c.kin]; }) });
// Alice rides along, if they are on the same side
log('Alice rides', await A.evaluate(() => { const g = __pc, c = window.__c, rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); g.P.x = c.x - rx * 1.9; g.P.z = c.z - rz * 1.9; g.P.y = c.y; g.step(4, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); g.step(16, 1 / 30); return { prompt: pr && pr.text, seat: g.P.car === c ? g.P.seat : null }; }));
await pump(10);
// Bob flies: full throttle down the runway, back on the stick, climb
const fly = async (n, keys, look) => { for (let i = 0; i < n; i++) { await B.evaluate(a => { const g = __pc, c = window.__c; a[0].forEach(k => g.keys[k] = true); if (a[1]) { g.P.cyaw = c.yaw; g.P.cpitch = a[1]; } }, [keys, look]); await pump(1); } await B.evaluate(k => k.forEach(q => __pc.keys[q] = false), keys); };
await B.evaluate(() => { __pc.P.cyaw = 0; __pc.P.cpitch = 0; });
await fly(50, ['Space']); await fly(18, ['Space', 'KeyS']); await fly(40, ['Space'], .3);
const bob = await B.evaluate(() => { const c = window.__c; return { x: Math.round(c.x), z: Math.round(c.z), y: +c.y.toFixed(1), pitch: +c.ptc.toFixed(2), dive: +c.dive.toFixed(2), roll: +c.roll.toFixed(2), landed: c.landed }; });
const host = await A.evaluate(() => { const g = __pc, c = window.__c; return { x: Math.round(c.x), z: Math.round(c.z), y: +c.y.toFixed(1), dive: +c.dive.toFixed(2), roll: +c.roll.toFixed(2), kin: c.kin, alice: g.P.car === c ? [Math.round(g.P.x), Math.round(g.P.z), +g.P.y.toFixed(1)] : null }; });
log('climbing: Bob flies', bob); log('host sees', host);
// a bank: Bob points the mouse off to the right, and the host sees the wings go over
await fly(14, [], null); await B.evaluate(() => { const g = __pc, c = window.__c; window.__y0 = c.yaw; });
for (let i = 0; i < 16; i++) { await B.evaluate(() => { const g = __pc, c = window.__c; g.P.cyaw = window.__y0 - 1.4; g.P.cpitch = 0; }); await pump(1); }
log('banking', { bob: await B.evaluate(() => +window.__c.roll.toFixed(2)), host: await A.evaluate(() => +window.__c.roll.toFixed(2)) });
await shotOf(A, '/tmp/mp6_host.png');
// Bob's screen: Alice is in the cabin, so she is not drawn standing in the air beside it
log('Bob sees Alice', await B.evaluate(() => { const g = __pc, r = Object.values(g.NET.remotes)[0]; g.visuals(1 / 30); return { inCar: !!r.car && r.car === window.__c, seat: r.seat, shown: r.ch.shown, x: Math.round(r.x), y: +r.y.toFixed(1) }; }));
// Alice jumps out with a parachute
log('Alice jumps', await A.evaluate(() => { const g = __pc; g.GAME.leaveCar(false); return { chute: g.P.chute, y: +g.P.y.toFixed(1) }; }));
await pump(30);
log('Bob sees the chute', await B.evaluate(() => { const r = Object.values(__pc.NET.remotes)[0]; return { chute: r.chute, car: !!r.car, shown: r.ch.shown }; }));
// Bob comes back down onto the runway
await B.evaluate(() => { const g = __pc, c = window.__c; c.x = g.RWY.cx; c.z = g.RWY.z1 - 60; c.yaw = 0; c.y = g.groundAt(c.x, c.z, 3, 's', .6) + 12; c.spd = 27; c.thr = .55; c.ptc = -.05; c.roll = 0; c.landed = false; c.sink = 0; });
for (let i = 0; i < 90; i++) { await B.evaluate(() => { const g = __pc; g.P.cyaw = 0; g.P.cpitch = -.16; }); await pump(1); if (await B.evaluate(() => window.__c.landed)) break; }
await fly(60, ['ShiftLeft']);
log('landed', { bob: await B.evaluate(() => { const c = window.__c; return { landed: c.landed, hp: Math.round(c.hp), spd: +c.spd.toFixed(1) }; }), host: await A.evaluate(() => { const c = window.__c; return { y: +c.y.toFixed(1), hp: Math.round(c.hp), dive: +c.dive.toFixed(2) }; }) });
await b.close();
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
