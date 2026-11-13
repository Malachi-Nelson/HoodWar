// solo checks for v4: six crews, one-shot headshots, rank and RP, the phone (homies, mechanic, fixer, work), businesses, the car shop
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
// served over http, not file://: headless Chrome now and then loses localStorage across a reload of a file:// page, and this test reloads to check saving
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises';
const srv = createServer(async (q, r) => { try { const f = decodeURIComponent(new URL(q.url, 'http://x').pathname); r.end(await readFile(ROOT + f.replace(/^\/+/, ''))); } catch (e) { r.statusCode = 404; r.end(); } }).listen(0); const PORT = srv.address().port;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { if (!localStorage.getItem('pc-test-init')) { localStorage.clear(); localStorage.setItem('pc-test-init', '1'); } } catch (e) {} });
await p.goto('http://localhost:' + PORT + '/dist/claude.html');
await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 6; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };

await run('start', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 4, 1 / 30);
  const per = {}; g.bots.forEach(b => { if (!b.dead && b.team < g.CREWS.length) per[b.team] = (per[b.team] || 0) + 1; });
  const biz = {}; g.BIZ.forEach(q => { biz[g.ZONES[q.hood].id] = (biz[g.ZONES[q.hood].id] || 0) + 1; });
  return { crews: g.CREWS.map(c => c.name), owners: g.ZS.map((s, i) => g.ZONES[i].id + ':' + s.owner).join(' '), per, fronts: g.FRONTS.length, biz, rank: g.P.rank, hp: g.P.hp, strip: [...document.querySelectorAll('#turf .zs b')].map(e => e.className || '-').join(' ') }; });

await run('headshots', () => { const g = __pc, s = g.ZONES[7], rival = (g.P.team + 1) % 6, out = {};
  const mk = () => g.spawnBot(rival, s.x + 3, 0, s.z + 3, { temp: true });
  const a = mk(); g.damageBot(a, 5, true, g.P, 'pistol'); out.playerHead = a.dead;
  const c = mk(); g.damageBot(c, 27, false, g.P, 'pistol'); out.playerBody = c.dead ? 'dead' : Math.round(c.hp);
  const src = mk(), d = mk(); g.damageBot(d, 20, true, src, 'pistol'); out.botHead = d.dead ? 'dead' : Math.round(d.hp);
  return out; });

// a real trigger pull at a rival's head, from the player's own gun
await run('aimed headshot', () => { const g = __pc; g.P.x = g.ZONES[7].x - 12; g.P.z = g.ZONES[7].z + 18; g.P.y = 0.12; g.step(3, 1 / 30);
  const t = g.spawnBot((g.P.team + 2) % 6, g.P.x, 0.12, g.P.z - 9, { temp: true }); t.yaw = 0; t.react = 99; t.brainT = 99; g.DBG.notarget = true; g.P.inv.marksman = { mag: 8, res: 40 }; g.setWeapon('marksman'); g.P.switchT = 0;
  let tries = 0; const rp0 = g.P.rp;
  for (; tries < 6 && !t.dead; tries++) { const ex = g.camera.position, hx = t.x, hy = t.y + 1.63, hz = t.z; g.mouse.right = true; g.P.ads = 1;
    for (let k = 0; k < 8; k++) { const cp = g.camera.position, dx = hx - cp.x, dy = hy - cp.y, dz = hz - cp.z; g.P.cyaw = Math.atan2(-dx, -dz); g.P.cpitch = Math.atan2(dy, Math.hypot(dx, dz)); g.visuals(1 / 30); }
    g.P.fireT = 0; g.mouse.fresh = true; g.tryFire(); g.step(12, 1 / 30); }
  g.mouse.right = false; return { dead: t.dead, tries, hpLeft: Math.round(t.hp), rp: g.P.rp - rp0 }; });

await run('rank', () => { const g = __pc, r0 = g.P.rank; g.addRP(g.rpFor(2) - g.P.rp + 10); const banner = document.querySelector('#h-banner .sub').textContent; g.step(3, 1 / 30); for (let i = 0; i < 3; i++) g.visuals(1 / 30);
  return { from: r0, to: g.P.rank, rp: g.P.rp, banner, badge: document.getElementById('rk-n').textContent, bar: document.getElementById('rk-fill').style.width, maxHp: g.maxHp(), shopLock: (() => { g.openMenu({ kind: 'gun', x: g.P.x, z: g.P.z, title: 'x' }); const t = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent).join(' | '); g.closeShop(); return t; })() }; });

await run('phone', () => { const g = __pc; g.openPhone(); const open = !document.getElementById('shop').hidden, cls = document.getElementById('shop').className, items = [...document.querySelectorAll('#shop-list li')].map(li => li.className + ':' + li.textContent);
  g.buy('1'); g.step(2, 1 / 30); const hm = g.bots.filter(b => b.homie === g.P); return { open, cls, items, homies: hm.length, dist: hm.map(b => Math.round(Math.hypot(b.x - g.P.x, b.z - g.P.z))), shopShut: document.getElementById('shop').hidden }; });

await run('homies follow', () => { const g = __pc; g.step(30 * 14, 1 / 30); const hm = g.bots.filter(b => b.homie === g.P);
  return { n: hm.length, dist: hm.map(b => Math.round(Math.hypot(b.x - g.P.x, b.z - g.P.z))), phone: g.phoneItems()[0].sub }; });

await run('homies ride', () => { const g = __pc; const n = g.NAV[g.nearestNode(g.P.x, g.P.y, g.P.z, false)];
  let c = null; for (let k = 0; k < 8 && !c; k++) c = g.spawnCar('sedan', g.P.x + 3 + k, g.P.z + 2, 0, {}); if (!c) return 'no car';
  g.step(10, 1 / 30); g.P.x = c.x - 2.5; g.P.z = c.z; const o = g.carOffer(c); if (o) g.tryEnter(c, o); g.step(30 * 3, 1 / 30);
  const inCar = g.P.car === c; g.step(30 * 10, 1 / 30); const riders = c.occ.map(o => !o ? '-' : o === g.P ? 'P' : o.homie === g.P ? 'H' : '?').join('');
  return { inCar, riders, homies: g.bots.filter(b => b.homie === g.P).map(b => b.car ? 'car' : 'foot:' + Math.round(Math.hypot(b.x - g.P.x, b.z - g.P.z))).join(',') }; });

await run('car shop', () => { const g = __pc, c = g.P.car; if (!c) return 'not in a car'; const gar = g.GARAGES.find(q => q.team === g.P.team); g.P.earn += 20000; g.step(1, 1 / 30);
  c.x = gar.x; c.z = gar.z; c.vx = c.vz = 0; g.step(10, 1 / 30); const m = g.shopNow(), title = document.getElementById('shop-title').textContent, items = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent);
  const cash0 = g.P.cash; g.buy('5'); g.buy('6'); g.buy('2'); g.buy('7'); g.step(2, 1 / 30);
  return { kind: m && m.kind, title, items, plate: c.plate, tune: c.tune, paint: c.color === g.CREWS[g.P.team].paint, pv: g.P.pv, spent: cash0 - g.P.cash, rp: g.P.rp }; });

await run('drive off', () => { const g = __pc, c = g.P.car; c.x += 12; g.step(10, 1 / 30); return { shopShut: !g.shopNow(), garage: g.P.garage }; });

await run('mechanic', () => { const g = __pc, old = g.P.car; g.GAME.leaveCar(false); g.step(30, 1 / 30); g.P.x = g.ZONES[6].x + 5; g.P.z = g.ZONES[6].z + 5; g.step(10, 1 / 30);
  g.openPhone(); const items = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent); const k = g.phoneItems().findIndex(q => q.label === 'Mechanic'); g.buy(String(k + 1)); g.step(5, 1 / 30);
  const c = g.myPV(); return { items, key: k + 1, delivered: !!c, oldGone: !!old.gone, d: c ? Math.round(Math.hypot(c.x - g.P.x, c.z - g.P.z)) : -1, type: c && c.type, plate: c && c.plate, tune: c && c.tune, feed: document.getElementById('feed').textContent.slice(-90) }; });

await run('business', () => { const g = __pc, q = g.BIZ.find(x => g.ZS[x.hood].owner === g.P.team) || g.BIZ[0]; g.ZS[q.hood].owner = g.P.team; g.ZS[q.hood].ctrl = 100;
  g.P.x = q.x; g.P.z = q.z; g.P.earn += q.price + 100; g.step(6, 1 / 30); for (let i = 0; i < 3; i++) g.visuals(1 / 30); const pr = document.getElementById('h-prompt').textContent;
  g.buyBiz(q); const owned = g.P.biz.has(q.key), inc = g.bizIncome(), cash0 = g.P.cash; g.payHour(); g.step(2, 1 / 30);
  return { name: q.name, hood: g.ZONES[q.hood].name, price: q.price, pay: q.pay, prompt: pr, owned, inc, hourGain: g.P.cash - cash0, feed: document.getElementById('feed').textContent.slice(-120) }; });

await run('fixer', () => { const g = __pc; g.addRP(g.rpFor(3) - g.P.rp + 5); g.DBG.notarget = false; g.P.earn += 2000; g.GAME.crime(g.P, 40, 2); g.step(30, 1 / 30); const heat = g.P.heat, cash0 = g.P.cash;
  g.openPhone(); const k = g.phoneItems().findIndex(q => q.label === 'Fixer'), it = g.phoneItems()[k]; g.buy(String(k + 1)); g.step(2, 1 / 30); return { rank: g.P.rank, heat, item: it.sub + ' $' + it.cost, after: g.P.heat, paid: cash0 - g.P.cash }; });

await run('work', () => { const g = __pc, n0 = g.EVTS.length; g.openPhone(); const k = g.phoneItems().findIndex(q => q.label === 'Work'); g.buy(String(k + 1)); g.step(2, 1 / 30);
  return { before: n0, after: g.EVTS.length, kinds: g.EVTS.map(E => E.k), again: g.phoneItems()[k].sub }; });

await run('save', () => { const g = __pc; g.saveGame(); const s = g.loadSave(); const code = g.saveCode(), back = g.readCode(code); return { v: s.v, rp: s.rp, b: s.b, pv: s.pv, codeRound: !!back && back.rp === s.rp && back.b.length === s.b.length && !!back.pv }; });
await shot('v4_play');

// reload: rank, businesses and the car on file come back, and the car is waiting at a kerb
await p.reload(); await p.waitForTimeout(1500);
await run('after reload', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); for (let i = 0; i < 30 * 4; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); } const c = g.myPV();
  return { rank: g.P.rank, rp: g.P.rp, biz: g.P.biz.size, pv: !!g.P.pv, car: c ? c.type + ' ' + Math.round(Math.hypot(c.x - g.P.x, c.z - g.P.z)) + 'm plate ' + c.plate + ' tune ' + c.tune : null, hp: g.P.hp, maxHp: g.maxHp() }; });

await run('soak', () => { const g = __pc, t0 = performance.now(); g.openPhone(); g.buy('1'); for (let i = 0; i < 30 * 240; i++) { g.step(1, 1 / 30); if (i % 30 === 0) g.visuals(1 / 30); }
  const per = {}; g.bots.forEach(b => { if (!b.dead) per[b.team] = (per[b.team] || 0) + 1; }); return { ms: Math.round(performance.now() - t0), bots: g.bots.length, per, cars: g.cars.length, owners: g.ZS.map(s => s.owner).join(','), rank: g.P.rank, homies: g.bots.filter(b => b.homie === g.P).length }; });

console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no errors');
await b.close(); srv.close();
