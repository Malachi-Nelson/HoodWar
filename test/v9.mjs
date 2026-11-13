// stage three: the lab as a business (supplies, upgrades, dealers, raids), and the deals: wholesale, courier, the fence, cases
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|404/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { localStorage.clear(); } catch (e) {} });
await p.goto('file://' + ROOT + 'dist/claude.html'); await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 6; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };
await run('start', () => { const g = __pc; g.G.solo = true; g.startWorld(); g.beginPlay(); g.DBG.god = true; g.step(60, 1 / 30); g.P.earn += 90000; g.addRP(g.rpFor(8) + 10); g.step(2, 1 / 30); g.P.hints = []; return { rank: g.P.rank, cash: Math.round(g.P.cash) }; });
// helpers in the page: put the player somewhere, run the clock, stand still
await p.evaluate(() => { const g = __pc; window.__at = (x, z, y) => { if (g.P.car) g.GAME.leaveCar(false); g.P.x = x; g.P.z = z; g.P.y = y === undefined ? g.groundAt(x, z, 2.4, 'p') : y; g.P.vx = g.P.vz = g.P.vy = 0; g.P.onGround = true; }; window.__run = s => g.step(Math.round(s * 30), 1 / 30); window.__ev = k => g.EVTS.find(E => E.k === k); window.__line = () => document.getElementById('h-job') ? document.getElementById('h-job').textContent : ''; });

await run('buy a lab', () => { const g = __pc; g.buyLab(0); const L = g.P.lab; return { site: L && L.site, sup: L && L.sup, cap: g.labCap(), unit: g.unitVal(), page: g.labItems('lab').map(i => i.label) }; });
await run('production uses supplies', () => { const g = __pc, L = g.P.lab; L.at = g.G.time; __run(100 * 3 + 2); g.labTick(); return { stock: L.stock, sup: L.sup }; });
await run('upgrades', () => { const g = __pc, L = g.P.lab; const items = g.labItems('lab-up').map(i => i.label + ' $' + i.cost); [0, 1, 2, 3].forEach(i => g.buyUp(i)); return { items, up: L.up, cap: g.labCap(), unit: g.unitVal() }; });
await run('faster now', () => { const g = __pc, L = g.P.lab, s0 = L.stock; L.at = g.G.time; __run(100 * 3 + 2); g.labTick(); return { made: L.stock - s0, sup: L.sup }; });
await run('out of supplies', () => { const g = __pc, L = g.P.lab; L.sup = 3; const s0 = L.stock; L.at = g.G.time; __run(120); g.labTick(); const stopped = L.stock === s0; g.buySups(); return { stopped, supAfterBuy: L.sup, line: g.labItems('lab')[0].sub }; });
await run('steal supplies', () => { const g = __pc, L = g.P.lab; L.sup = 10; const it = g.labItems('lab').find(i => /Steal supplies/.test(i.label)); it.act(); const E = __ev('sups'); if (!E) return 'no run'; const c = E.car; __at(c.x + 3, c.z); __run(.3); g.tryEnter(c, g.carOffer(c)); __run(2.5); const inVan = g.P.car === c; const site = g.LABS[L.site]; c.x = site.park.x; c.z = site.park.z; c.vx = c.vz = 0; __run(1.5); return { inVan, over: !__ev('sups'), sup: L.sup, guards: E.guards.length }; });
await run('dealers', () => { const g = __pc, L = g.P.lab; if (g.P.car) g.GAME.leaveCar(false); __run(1); const zi = g.ZS.findIndex(z => z.owner === g.P.team); const page = g.labItems('lab-deal').map(i => i.label); g.hireDealer(zi); L.stock = 10; const s0 = L.stock, c0 = g.P.cash; g.dealersSell(L); __run(.1); return { zone: zi, page, dealers: L.dealers, sold: s0 - L.stock, cash: Math.round(g.P.cash - c0) }; });
await run('raid held', () => { const g = __pc, L = g.P.lab; L.stock = 12; L.raidT = 0; L.dealT = 0; g.labTick(); __run(.5); const E = __ev('raid'); if (!E) return 'no raid'; const n = E.raiders.length, gd = E.guards.length; E.raiders.forEach(b => g.damageBot(b, 999, false, g.P, 'rifle')); __run(1); return { raiders: n, guards: gd, over: !__ev('raid'), stock: L.stock }; });
await run('raid lost', () => { const g = __pc, L = g.P.lab; L.stock = 12; L.raidT = 0; g.labTick(); __run(.5); const E = __ev('raid'); if (!E) return 'no raid'; E.until = g.G.time; __run(1); return { over: !__ev('raid'), stock: L.stock }; });
// the deals
await run('deals page', () => __pc.dealItems('deals').map(i => i.label + (i.off ? ' (off)' : '')));
await run('wholesale, honest', () => { const g = __pc, L = g.P.lab; L.stock = 10; const it = g.dealItems('deals').find(i => /wholesale/.test(i.label)); it.act(); const E = __ev('whsl'); if (!E) return 'no deal'; E.cross = false; const has = g.P.case && g.P.case.k + ':' + g.P.case.v;
  const lead = E.buyers[0]; __at(lead.x + 2, lead.z); __run(1); const paid = g.CASES.find(c => c.ev === E); const price = E.price; if (paid) { __at(paid.x, paid.z); __run(.5); } const holding = g.P.case && g.P.case.k; const c0 = g.P.cash; __run(21); const y = g.SPAWNS[g.P.team][0]; __at(y.x, y.z); __run(1); __run(20); return { has, stock: L.stock, buyers: E.buyers.length, price, holding, banked: Math.round(g.P.cash - c0), over: !__ev('whsl') }; });
await run('wholesale, a setup', () => { const g = __pc, L = g.P.lab; L.stock = 6; const it = g.dealItems('deals').find(i => /wholesale/.test(i.label)); it.act(); const E = __ev('whsl'); if (!E) return 'no deal'; E.cross = true; const lead = E.buyers[0]; __at(lead.x + 2, lead.z); __run(1); const blown = !!E.blown;
  const hostileNow = g.hostile(lead, g.P); E.buyers.forEach(b => g.damageBot(b, 999, false, g.P, 'rifle')); __run(1); const cash = g.CASES.find(c => c.ev === E && c.k === 'cash'); const still = g.P.case && g.P.case.k; return { blown, hostileNow, dropped: !!cash, price: cash && cash.v, stillHolding: still }; });
await run('fence the product', () => { const g = __pc; const c0 = g.P.cash, units = g.P.case ? g.P.case.v : 0; __at(g.FENCE.x + 1, g.FENCE.z + 1); __run(1); return { units, got: Math.round(g.P.cash - c0), case: !!g.P.case }; });
await run('put down, pick up', () => { const g = __pc; const c = g.CASES.find(q => q.k === 'cash'); if (!c) return 'no cash case'; __at(c.x, c.z); __run(.5); const had = g.P.case && g.P.case.v; const pr = g.findPromptNow(); const t = pr && pr.text; if (pr && pr.act) pr.act(); __run(.3); const down = !g.P.case && g.CASES.length; __at(g.P.x + 4, g.P.z); __run(.3); const cc = g.CASES.find(q => q.k === 'cash'); __at(cc.x, cc.z); __run(.5); return { had, prompt: t, down, again: g.P.case && g.P.case.v }; });
await run('courier', () => { const g = __pc; g.P.case = null; g.CASES.slice().forEach(c => { if (c.k === 'cash') { c.m.visible = false; } }); __at(g.P.x + 30, g.P.z); __run(1); try { const it = g.dealItems('deals').find(i => /Courier/.test(i.label)); it.act(); const E = __ev('cour'); if (!E) return 'no job'; const pk = g.CASES.find(c => c.ev === E); __at(pk.x, pk.z); __run(.5); const has = g.P.case && g.P.case.k; const c0 = g.P.cash; __at(E.to.x + 2, E.to.z); __run(1); return { has, over: !__ev('cour'), paid: Math.round(g.P.cash - c0), pay: E.pay }; } catch (e) { return e.stack.split('\n').slice(0, 6).join(' | '); } });
await shot('v9_cases');
await run('lab kept', () => { const g = __pc; g.saveGame(); const s = JSON.parse(localStorage.getItem('pc-save') || '{}'); return s.lab; });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
await b.close();
