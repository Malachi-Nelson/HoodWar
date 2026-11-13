// stage four online: rival sides. Alice hosts as Bloods, Bob joins as Crips, Cara joins as police; they can hurt each other now
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
const A = await open('A'), B = await open('B'), C = await open('C');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (k, v) => console.log(k, JSON.stringify(v));
// every page must keep simulating even when not in front: drive them by hand
const pump = async (n, ms) => { for (let i = 0; i < n; i++) { for (const p of [A, B, C]) if (p) await p.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(ms || 4); } };
const shotOf = async (p, path) => { await p.evaluate(() => { __pc.visuals(.016); __pc.draw(); }); await p.screenshot({ path }); };
await sleep(1200);
await A.fill('#co-name', 'Alice'); await A.dispatchEvent('#co-name', 'change'); await B.fill('#co-name', 'Bob'); await B.dispatchEvent('#co-name', 'change'); await C.fill('#co-name', 'Cara'); await C.dispatchEvent('#co-name', 'change');
await A.click('#crew0'); await sleep(150);
await A.click('#co-host'); await sleep(300);
await A.selectOption('#set-sides', '1'); await sleep(300);
await B.click('#co-join'); await C.click('#co-join'); await sleep(400);
await B.click('#crew1'); await C.click('#crew7'); await sleep(300);
log('lobby', { B: await B.evaluate(() => ({ team: __pc.P.team, locked: document.getElementById('crew1').disabled, sides: document.getElementById('set-sides').value, status: document.getElementById('co-status').textContent })), C: await C.evaluate(() => ({ team: __pc.P.team })) });
await B.click('#co-ready'); await C.click('#co-ready'); await sleep(300);
log('roster', await A.evaluate(() => [...document.querySelectorAll('#co-roster li')].map(l => l.textContent)));
await A.click('#co-start'); await sleep(400);
await pump(60);
const sides = async X => X.evaluate(() => ({ me: __pc.P.team, crew: __pc.G.crew, rivals: __pc.G.rivals, others: Object.values(__pc.NET.remotes).map(r => [r.name, r.team]) }));
log('sides', { A: await sides(A), B: await sides(B), C: await sides(C) });
// Bob shoots Alice
await A.evaluate(() => { __pc.DBG.god = false; __pc.DBG.notarget = true; __pc.P.safeT = 0; __pc.P.hp = 100; __pc.P.armor = 0; });
await B.evaluate(() => { const g = __pc, P = g.P, r = Object.values(g.NET.remotes).find(q => q.name === 'Alice'); P.x = r.x + 6; P.z = r.z; P.y = r.y; g.DBG.notarget = true; g.giveWeapon('rifle'); g.setWeapon && g.setWeapon('rifle'); });
await pump(10);
for (let i = 0; i < 12; i++) { await B.evaluate(() => { const g = __pc, P = g.P, r = Object.values(g.NET.remotes).find(q => q.name === 'Alice'); P.switchT = 0; P.fireT = 0; P.reloadT = 0; P.cyaw = Math.atan2(-(r.x - P.x), -(r.z - P.z)); P.cpitch = Math.atan2(r.y + 1.2 - (P.y + 1.5), Math.hypot(r.x - P.x, r.z - P.z)); g.visuals(1 / 30); g.mouse.down = true; g.mouse.fresh = true; g.step(1, 1 / 30); g.mouse.down = false; }); await pump(2); }
await pump(15);
log('pvp', { aliceHp: await A.evaluate(() => [Math.round(__pc.P.hp), __pc.P.dead]), bobShots: await B.evaluate(() => __pc.P.shots) });
// wages and turf pay, each to their own side
await A.evaluate(() => { __pc.payHour(); }); await pump(20);
log('pay', { A: await A.evaluate(() => [...document.querySelectorAll('#feed > *')].map(e => e.textContent).filter(t => /income|Paycheck/.test(t)).slice(-2)), B: await B.evaluate(() => [...document.querySelectorAll('#feed > *')].map(e => e.textContent).filter(t => /income|Paycheck/.test(t)).slice(-2)), C: await C.evaluate(() => [...document.querySelectorAll('#feed > *')].map(e => e.textContent).filter(t => /income|Paycheck/.test(t)).slice(-2)) });
// Bob gets wanted; Cara the officer hears it and takes him down for the bounty
await A.evaluate(() => { const g = __pc, r = Object.values(g.NET.remotes).find(q => q.name === 'Bob'); g.GAME.crime(r, 0, 2); }); await pump(20);
log('dispatch', await C.evaluate(() => [...document.querySelectorAll('#feed > *')].map(e => e.textContent).filter(t => /Dispatch/.test(t)).slice(-1)));
const cash0 = await C.evaluate(() => __pc.P.cash);
await B.evaluate(() => { __pc.DBG.god = false; __pc.P.safeT = 0; __pc.P.hp = 100; __pc.P.armor = 0; });
await C.evaluate(() => { const g = __pc, P = g.P, r = Object.values(g.NET.remotes).find(q => q.name === 'Bob'); P.x = r.x + 5; P.z = r.z + 1; P.y = r.y; g.DBG.notarget = true; g.giveWeapon('rifle'); });
await pump(10);
for (let i = 0; i < 20; i++) { await C.evaluate(() => { const g = __pc, P = g.P, r = Object.values(g.NET.remotes).find(q => q.name === 'Bob'); P.wpn = 'rifle'; P.switchT = 0; P.fireT = 0; P.reloadT = 0; P.cyaw = Math.atan2(-(r.x - P.x), -(r.z - P.z)); P.cpitch = Math.atan2(r.y + 1.2 - (P.y + 1.5), Math.hypot(r.x - P.x, r.z - P.z)); g.visuals(1 / 30); g.mouse.down = true; g.mouse.fresh = true; g.step(1, 1 / 30); g.mouse.down = false; }); await pump(2); }
await pump(30);
log('bounty', { bobDead: await B.evaluate(() => __pc.P.dead || __pc.P.deaths), caraPaid: (await C.evaluate(() => __pc.P.cash)) - cash0, caraHeat: await C.evaluate(() => __pc.P.heat), feed: await C.evaluate(() => [...document.querySelectorAll('#feed > *')].map(e => e.textContent).slice(-3)) });
log('board', await B.evaluate(() => { __pc.drawBoard(); return [...document.querySelectorAll('#board tr')].map(r => r.textContent).slice(0, 5); }));
await shotOf(C, '/tmp/v7_mp_cop.png');
log('errors', errs.length ? errs.slice(0, 8) : 'no errors');
await b.close();
