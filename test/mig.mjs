// the session outliving its host: the host goes, the next player takes over the city where it stands; a host that comes back
// gives way to the one with more players; a player who drops off rejoins without the session noticing more than a gap
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const MOCK = `(() => {
  const me = 'peer' + (window.name || Math.random().toString(36).slice(2, 10)), ch = new BroadcastChannel('mockroom2'), table = {}, subs = []; let mine = {}, off = false;
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
const A = await open('a'), B = await open('b'), C = await open('c'); let live = [A, B, C];
const pump = async (n, ms) => { for (let i = 0; i < n; i++) { for (const p of live) await p.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(ms || 3); } };
await sleep(1200);
for (const [p, n] of [[A, 'Alice'], [B, 'Bob'], [C, 'Cara']]) { await p.fill('#co-name', n); await p.dispatchEvent('#co-name', 'change'); }
await A.click('#co-host'); await sleep(300); await B.click('#co-join'); await C.click('#co-join'); await sleep(300); await B.click('#co-ready'); await C.click('#co-ready'); await sleep(300);
await A.click('#co-start'); await sleep(400); await pump(60);
const st = () => { const g = __pc; return { me: window.__mock.me, mode: g.NET.mode, state: g.G.state, host: g.NET.hostPeer, ep: g.NET.ep + '/' + g.NET.hostEp, slot: g.NET.slot, bots: g.bots.length, cars: g.cars.length, car: g.P.car ? g.P.car.id : 0, remotes: Object.values(g.NET.remotes).map(r => r.name + ':' + r.slot), zones: g.ZS.map(z => z.owner).join(''), net: document.getElementById('h-net').textContent, banner: document.querySelector('#h-banner .big').textContent }; };
for (const [t, p] of [['A', A], ['B', B], ['C', C]]) log('start ' + t, await p.evaluate(st));
// Bob takes a car and Cara turns a neighbourhood: both must survive the takeover
await B.evaluate(() => { const g = __pc, P = g.P; g.DBG.god = true; const c = g.cars.filter(c => !c.occ.some(Boolean) && !c.wreck && !c.cop && !c.spec.air).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0]; P.x = c.x - Math.cos(c.yaw) * 2; P.z = c.z + Math.sin(c.yaw) * 2; P.y = c.y; g.tryEnter(c, g.carOffer(c)); });
await A.evaluate(() => { __pc.ZS[4].owner = 2; __pc.ZS[4].ctrl = 77; });
await pump(60);
const before = { bCar: await B.evaluate(() => __pc.P.car && __pc.P.car.id), zones: await A.evaluate(() => __pc.ZS.map(z => z.owner).join('')), tod: await A.evaluate(() => __pc.G.tod) };
log('before', before);
// the host goes
await A.evaluate(() => window.__mock.off()); live = [B, C];
await pump(30);
log('gap B', await B.evaluate(st)); log('gap C', await C.evaluate(st));
await pump(150);
const b1 = await B.evaluate(st), c1 = await C.evaluate(st); log('after B', b1); log('after C', c1);
const newHost = b1.mode === 'host' ? 'B' : c1.mode === 'host' ? 'C' : null, H = newHost === 'B' ? B : C, F = newHost === 'B' ? C : B;
log('takeover', { newHost, bothPlaying: b1.state === 'playing' && c1.state === 'playing', follower: (newHost === 'B' ? c1 : b1).host === (newHost === 'B' ? b1 : c1).me, bStillInCar: b1.car === before.bCar && b1.car > 0, zonesKept: b1.zones === before.zones && c1.zones === before.zones });
await pump(90);
log('host world', await H.evaluate(() => { const g = __pc; return { bots: g.bots.length, crews: g.bots.filter(b => b.team < g.CREWS.length).length, walkers: g.bots.filter(b => b.team === g.CREWS.length && !b.car).length, traffic: g.cars.filter(c => c.traffic).length, homes: g.G.homes.length, remotes: Object.values(g.NET.remotes).map(r => r.name + ':' + r.slot + (r.car ? ':car' + r.car.id : '')) }; }));
log('follower world', await F.evaluate(() => { const g = __pc; return { bots: g.bots.length, cars: g.cars.length, slot: g.NET.slot, myCar: g.P.car ? g.P.car.id : 0 }; }));
// the follower shoots a rival on the new host: the new host takes the damage
const hit = await F.evaluate(() => { const g = __pc, P = g.P; if (P.car) g.GAME.leaveCar(false); g.DBG.god = true; const b = g.bots.filter(b => b.team !== P.team && b.team < g.CREWS.length && !b.dead && !b.car).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0]; if (!b) return null; P.x = b.x + 4; P.z = b.z + 4; P.y = b.y; g.giveWeapon('rifle'); g.setWeapon('rifle'); window.__tgt = b.id; return b.id; });
await pump(10);
for (let i = 0; i < 30; i++) { await F.evaluate(() => { const g = __pc, P = g.P, b = g.bots.find(q => q.id === window.__tgt); if (!b || b.dead) { g.mouse.down = false; return; } P.switchT = 0; P.cyaw = Math.atan2(-(b.x - P.x), -(b.z - P.z)); P.cpitch = Math.atan2(b.y + 1.1 - (P.y + 1.45), Math.hypot(b.x - P.x, b.z - P.z)); g.mouse.down = true; g.visuals(1 / 30); g.step(2, 1 / 30); }); await H.evaluate(() => { __pc.step(2, 1 / 30); }); await sleep(3); }
await F.evaluate(() => { __pc.mouse.down = false; }); await pump(20);
log('hit after takeover', { id: hit, onHost: await H.evaluate(id => { const b = __pc.bots.find(q => q.id === id); return b ? { hp: Math.round(b.hp), dead: b.dead } : 'gone'; }, hit) });
// the old host comes back with its stale city: it has nobody with it, so it joins the new host's city instead
await A.evaluate(() => window.__mock.on()); live = [A, B, C];
await pump(90);
log('old host back', await A.evaluate(st)); log('new host still', await H.evaluate(st));
// the follower drops off for a while: it keeps playing, does not take over, and comes back to the same host
const fw = await F.evaluate(st);
await F.evaluate(() => window.__mock.off());
await pump(240);
log('offline follower', await F.evaluate(st));
await F.evaluate(() => window.__mock.on()); await pump(60);
log('follower back', await F.evaluate(st)); log('host sees', await H.evaluate(() => Object.values(__pc.NET.remotes).map(r => r.name + ':' + r.slot)));
// everyone else leaves: the last one standing runs the city alone
await H.evaluate(() => window.__mock.off()); await A.evaluate(() => window.__mock.off()); live = [F];
await pump(150);
log('last one', await F.evaluate(st));
await b.close();
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
