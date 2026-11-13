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
await A.fill('#co-name', 'Alice'); await A.dispatchEvent('#co-name', 'change'); await B.fill('#co-name', 'Bob'); await B.dispatchEvent('#co-name', 'change');
await B.click('#crew1'); await sleep(200);
log('status A', await A.textContent('#co-status')); log('status B', await B.textContent('#co-status'));
await A.click('#co-host'); await sleep(300);
log('B sees', await B.textContent('#co-status'));
await B.click('#co-join'); await sleep(300);
log('B in lobby', await B.evaluate(() => ({ team: __pc.P.team, crewLocked: document.getElementById('crew1').disabled, status: document.getElementById('co-status').textContent })));
await A.selectOption('#set-bots', '3'); await sleep(250);
log('B copies settings', await B.evaluate(() => ({ bots: document.getElementById('set-bots').value, cops: document.getElementById('set-cops').value })));
await A.selectOption('#set-bots', '4'); await B.click('#co-ready'); await sleep(300);
log('A roster', await A.evaluate(() => [...document.querySelectorAll('#co-roster li')].map(l => l.textContent)));
log('A status', await A.textContent('#co-status'));
await A.click('#co-start'); await sleep(400);
await pump(40);
log('modes', [await A.evaluate(() => __pc.NET.mode + '/' + __pc.G.state), await B.evaluate(() => __pc.NET.mode + '/' + __pc.G.state)]);
const snap = () => { const g = __pc; return { slot: g.NET.slot, team: g.P.team, crew: g.G.crew, bots: g.bots.length, cops: g.bots.filter(b => b.team === g.CREWS.length + 1).length, walkers: g.bots.filter(b => b.team === g.CREWS.length && !b.car).length, cars: g.cars.length, remotes: Object.values(g.NET.remotes).map(r => r.name + ':' + r.slot + ':t' + r.team + ':h' + (r.heat | 0) + '@' + Math.round(r.x) + ',' + Math.round(r.z)), me: Math.round(g.P.x) + ',' + Math.round(g.P.z), zones: g.ZS.map(z => z.owner + (z.prog > .01 ? '>' + z.by + '@' + z.prog.toFixed(1) : '') + (z.hot ? '!' : '')).join(','), tod: g.G.tod.toFixed(2), bytes: window.__maxBytes, over: window.__over || 0, hp: Math.round(g.P.hp), cash: g.P.cash, heat: g.P.heat }; };
log('A', await A.evaluate(snap)); log('B', await B.evaluate(snap));
const sync = async (X, tag) => {
  const list = () => __pc.bots.filter(b => !b.dead).map(b => [b.id, Math.round(b.x), Math.round(b.z), b.team, b.role | 0, b.car ? -1 : b.act | 0, b.car ? b.car.id : 0]), hb = await A.evaluate(list), cb = await X.evaluate(list);
  let off = 0, miss = 0, actOff = 0, roleOff = 0, carOff = 0; const acts = {}; hb.forEach(h => { const c = cb.find(q => q[0] === h[0]); if (!c || c[3] !== h[3]) { miss++; return; } off = Math.max(off, Math.hypot(c[1] - h[1], c[2] - h[2])); if (c[4] !== h[4]) roleOff++; if (c[5] !== h[5]) actOff++; if (c[6] !== h[6]) carOff++; acts[h[5]] = (acts[h[5]] || 0) + 1; });
  const hc = await A.evaluate(() => __pc.cars.map(c => [c.id, Math.round(c.x), Math.round(c.z), c.type, !!c.cop])), cc = await X.evaluate(() => __pc.cars.map(c => [c.id, Math.round(c.x), Math.round(c.z), c.type, !!c.cop]));
  let offc = 0, missc = 0; hc.forEach(h => { const c = cc.find(q => q[0] === h[0]); if (!c || c[3] !== h[3] || c[4] !== h[4]) missc++; else offc = Math.max(offc, Math.hypot(c[1] - h[1], c[2] - h[2])); });
  log(tag, { bots: hb.length + '/' + cb.length, botsMissing: miss, botOff: +off.toFixed(1), actsDiffer: actOff, rolesDiffer: roleOff, seatsDiffer: carOff, acts, cars: hc.length + '/' + cc.length, carsMissing: missc, carOff: +offc.toFixed(1), copCars: hc.filter(c => c[4]).length });
};
await sync(B, 'sync B');
// the client shoots a rival: the host's copy must take the damage, the client gets the credit
const shot = await B.evaluate(() => { const g = __pc, P = g.P; g.DBG.god = true; const b = g.bots.filter(b => b.team !== P.team && b.team < g.CREWS.length && !b.dead && !b.car).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0]; if (!b) return null; P.x = b.x + 4; P.z = b.z + 4; P.y = b.y; g.giveWeapon('rifle'); g.setWeapon('rifle'); window.__tgt = b.id; return b.id; });
const fireAt = async (X, n) => { for (let i = 0; i < n; i++) { await X.evaluate(() => { const g = __pc, P = g.P, b = g.bots.find(q => q.id === window.__tgt); if (!b || b.dead) { g.mouse.down = false; return; } P.switchT = 0; P.cyaw = Math.atan2(-(b.x - P.x), -(b.z - P.z)); P.cpitch = Math.atan2(b.y + 1.1 - (P.y + 1.45), Math.hypot(b.x - P.x, b.z - P.z)); g.mouse.down = true; g.visuals(1 / 30); g.step(2, 1 / 30); }); for (const p of [A, B, C]) if (p && p !== X) await p.evaluate(() => { __pc.step(2, 1 / 30); }); await sleep(15); } await X.evaluate(() => { __pc.mouse.down = false; }); };
await fireAt(B, 26); await pump(20);
log('rival shot by client', { id: shot, onHost: await A.evaluate(id => { const b = __pc.bots.find(q => q.id === id); return b ? { hp: Math.round(b.hp), dead: b.dead } : 'gone'; }, shot), clientCash: await B.evaluate(() => __pc.P.cash), clientKills: await B.evaluate(() => __pc.P.kills), feedB: await B.textContent('#feed') });
// the client takes a car: the host must see it move with the client in it
const car = await B.evaluate(() => { const g = __pc, P = g.P; const c = g.cars.filter(c => !c.occ[0] && !c.wreck && !c.cop && Math.hypot(c.vx, c.vz) < .5).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0]; P.x = c.x - Math.cos(c.yaw) * 2; P.z = c.z + Math.sin(c.yaw) * 2; P.y = c.y; const o = g.carOffer(c); g.tryEnter(c, o); return { id: c.id, x: c.x, z: c.z, offer: o && o.text }; });
await pump(30);
log('client in car', await B.evaluate(() => ({ inCar: !!__pc.P.car, seat: __pc.P.seat, mine: __pc.P.car && __pc.P.car.mine })));
await B.evaluate(() => { __pc.keys.KeyW = true; }); await pump(60); await B.evaluate(() => { __pc.keys.KeyW = false; });
await pump(10);
log('car on client', await B.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return c && { x: Math.round(c.x), z: Math.round(c.z), sp: Math.hypot(c.vx, c.vz).toFixed(1) }; }, car.id));
log('car on host', await A.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return c && { x: Math.round(c.x), z: Math.round(c.z), kin: c.kin, driver: c.occ[0] ? c.occ[0].name : null }; }, car.id));
await B.evaluate(() => { __pc.GAME.leaveCar(false); }); await pump(20);
log('after exit: host', await A.evaluate(id => { const c = __pc.cars.find(q => q.id === id); return c && { kin: c.kin, driver: c.occ[0] ? c.occ[0].name : null }; }, car.id));
// no player against player: the client empties a magazine into the host and nothing happens
await A.evaluate(() => { __pc.DBG.god = false; __pc.DBG.notarget = true; __pc.P.safeT = 0; __pc.P.hp = 100; });
await B.evaluate(() => { const g = __pc, P = g.P, r = Object.values(g.NET.remotes)[0]; P.x = r.x + 5; P.z = r.z; P.y = r.y; });
await pump(10);
for (let i = 0; i < 14; i++) { await B.evaluate(() => { const g = __pc, P = g.P, r = Object.values(g.NET.remotes)[0]; P.switchT = 0; P.cyaw = Math.atan2(-(r.x - P.x), -(r.z - P.z)); P.cpitch = Math.atan2(r.y + 1.1 - (P.y + 1.45), Math.hypot(r.x - P.x, r.z - P.z)); g.mouse.down = true; g.visuals(1 / 30); g.step(2, 1 / 30); }); await A.evaluate(() => { __pc.P.safeT = 0; __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(15); }
await B.evaluate(() => { __pc.mouse.down = false; }); await pump(15);
log('host after being shot at by a player', await A.evaluate(() => ({ hp: Math.round(__pc.P.hp), dead: __pc.P.dead, deaths: __pc.P.deaths })));
log('client shots fired', await B.evaluate(() => ({ shots: __pc.P.shots, kills: __pc.P.kills })));
// heat: the client hurts a bystander, the host gives the client stars and sends a car after them
await A.evaluate(() => { __pc.DBG.god = true; });
const civ = await B.evaluate(() => { const g = __pc, P = g.P; const b = g.bots.filter(b => b.team === g.CREWS.length && !b.dead && !b.car && !b.post).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0]; P.x = b.x + 3; P.z = b.z + 3; P.y = b.y; window.__tgt = b.id; return b.id; });
await fireAt(B, 20); await pump(30);
log('client heat', { onClient: await B.evaluate(() => ({ heat: __pc.P.heat, stars: document.getElementById('h-stars').textContent, hidden: document.getElementById('h-stars').hidden })), onHost: await A.evaluate(() => Object.values(__pc.NET.remotes).map(r => ({ n: r.name, heat: r.heat, wp: Math.round(r.wp) }))), civ: await A.evaluate(id => { const b = __pc.bots.find(q => q.id === id); return b ? b.dead : 'gone'; }, civ) });
await pump(150);
log('police after the client', await A.evaluate(() => ({ cops: __pc.bots.filter(b => b.team === __pc.CREWS.length + 1 && !b.dead).map(b => (b.chase ? b.chase.name : '-') + (b.car ? '@car' : '@foot') + Math.round(Math.hypot(b.x - Object.values(__pc.NET.remotes)[0].x, b.z - Object.values(__pc.NET.remotes)[0].z))), bob: Object.values(__pc.NET.remotes).map(r => r.heat + (r.evade ? 'e' : '')), hostHeat: __pc.P.heat })));
log('client sees police', await B.evaluate(() => ({ heat: __pc.P.heat, evade: __pc.P.evade, cops: __pc.bots.filter(b => b.team === __pc.CREWS.length + 1).length, sirens: __pc.cars.filter(c => c.cop && c.horn).length, hp: Math.round(__pc.P.hp) })));
await sync(B, 'sync B with police');
await shotOf(B, '/tmp/mpB.png');
// a stick-up by the client
const rob = await B.evaluate(() => { const g = __pc, P = g.P, r = g.ROBS[2]; P.x = r.x; P.z = r.z; P.y = .15; P.vx = P.vz = 0; g.setWeapon('pistol'); g.step(2, 1 / 30); return { cash: P.cash, open: g.tillOpen(2) }; });
await pump(6); await B.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); }); await pump(75);
log('stick-up by client', { before: rob, after: await B.evaluate(() => ({ cash: __pc.P.cash, open: __pc.tillOpen(2), heat: __pc.P.heat, banner: document.querySelector('#h-banner .big').textContent })), hostTill: await A.evaluate(() => __pc.tillOpen(2)), hostFeed: await A.textContent('#feed') });
// v4: RP reaches the client through the host; the client calls homies and has the mechanic bring its car
log('client RP', await B.evaluate(() => ({ rp: __pc.P.rp, rank: __pc.P.rank })));
await B.evaluate(() => { const g = __pc; g.addRP(g.rpFor(2) - g.P.rp + 5); g.P.pv = { t: 'suv', c: g.CREWS[0].paint, ar: 1, en: 2 }; g.openPhone(); g.buy('1'); g.sendPV(); });
await pump(40);
log('client homies on host', await A.evaluate(() => { const g = __pc, hm = g.bots.filter(b => b.homie && b.homie.name === 'Bob'); return { n: hm.length, d: hm.map(b => Math.round(Math.hypot(b.x - b.homie.x, b.z - b.homie.z))), pv: g.cars.filter(c => c.pv && c.pv.name === 'Bob').map(c => c.type + ' plate ' + c.plate + ' tune ' + c.tune) }; }));
log('client sees its car', await B.evaluate(() => { const c = __pc.myPV(); return c ? { type: c.type, plate: c.plate, tune: c.tune, d: Math.round(Math.hypot(c.x - __pc.P.x, c.z - __pc.P.z)) } : null; }));
// v6: a joined player starts the jewelry job and smashes a case; the host runs it
await B.evaluate(() => { const g = __pc; g.P.earn += 5000; g.G.jobT = {}; g.openPhone(); g.buy(String(g.phoneItems().findIndex(q => /Heists/.test(q.label)) + 1)); g.buy('2'); });
await pump(20);
log('client job on host', await A.evaluate(() => { const E = __pc.EVTS.find(q => q.k === 'jewel'); return E ? { stage: E.stage, cases: E.cases } : null; }));
await B.evaluate(() => { const g = __pc, c = g.JEWEL.cases[0]; g.P.x = c.x + (g.JEWEL.door.x - c.x) * .2; g.P.z = c.z + (g.JEWEL.door.z - c.z) * .2; g.step(3, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); });
await pump(20);
log('client smash', { host: await A.evaluate(() => { const E = __pc.EVTS.find(q => q.k === 'jewel'); return E ? { cases: E.cases, take: E.take } : null; }), client: await B.evaluate(() => { const E = __pc.EVTS.find(q => q.k === 'jewel'); __pc.visuals(1 / 30); return E ? { cases: E.cases, take: E.take, line: document.getElementById('h-race').textContent } : null; }) });
log('client rank tag on host', await A.evaluate(() => { const r = Object.values(__pc.NET.remotes).find(q => q.name === 'Bob'); return r ? r.rank : null; }));
// a third player turns up and joins the running session
C = await open('C'); await sleep(1300); await C.fill('#co-name', 'Cara'); await C.dispatchEvent('#co-name', 'change'); await C.click('#crew2'); await sleep(300);
log('C before joining', { status: await C.textContent('#co-status'), join: await C.textContent('#co-join') });
await C.click('#co-join'); await sleep(300); await pump(50);
log('C', await C.evaluate(snap)); log('A sees', await A.evaluate(() => Object.values(__pc.NET.remotes).map(r => r.name + ':' + r.slot + ':t' + r.team)));
await sync(C, 'sync C');
await shotOf(A, '/tmp/mpA.png'); await shotOf(C, '/tmp/mpC.png');
// a few minutes of everyone just being there
await pump(450);
log('later', [await A.evaluate(snap), await B.evaluate(snap), await C.evaluate(snap)]);
// the host leaves: the session closes for everyone
await A.evaluate(() => { __pc.G.state = 'paused'; document.getElementById('leave').click(); }); await sleep(300); await pump(60); await sleep(300);
log('after the host leaves', [await A.evaluate(() => __pc.NET.mode + '/' + __pc.G.state), await B.evaluate(() => __pc.NET.mode + '/' + __pc.G.state + '/' + document.getElementById('o-eyebrow').textContent), await C.evaluate(() => __pc.NET.mode + '/' + __pc.G.state + '/' + document.getElementById('o-eyebrow').textContent)]);
log('lobby text', [await A.textContent('#co-status'), await B.textContent('#co-status')]);
log('saved', await B.evaluate(() => localStorage.getItem('pc-save')));
log('bytes', [await A.evaluate(() => [window.__maxBytes, window.__over || 0]), await B.evaluate(() => [window.__maxBytes, window.__over || 0])]);
console.log([...new Set(errs)].slice(0, 20).join('\n') || 'no errors');
await b.close();
