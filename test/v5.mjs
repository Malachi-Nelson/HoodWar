// v5 checks: new guns and launchers, stronger grenades, faster cars and the bigger car shop, nitrous, bulletproof glass, deals, the online car store
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises';
const ROOT = new URL('..', import.meta.url).pathname;
const srv = createServer(async (q, r) => { try { const f = decodeURIComponent(new URL(q.url, 'http://x').pathname); r.end(await readFile(ROOT + f.replace(/^\/+/, ''))); } catch (e) { r.statusCode = 404; r.end(); } }).listen(0); const PORT = srv.address().port;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|404/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { if (!localStorage.getItem('pc-test-init')) { localStorage.clear(); localStorage.setItem('pc-test-init', '1'); } } catch (e) {} });
await p.goto('http://localhost:' + PORT + '/dist/claude.html');
await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 6; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };

await run('start', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 3, 1 / 30); g.P.hints = [];
  return { weapons: Object.keys(g.WEAPONS).map(k => k + ':' + g.WEAPONS[k].slot + ':' + g.WEAPONS[k].n), cars: Object.keys(g.CARS).map(k => k + ' ' + Math.round(g.CARS[k].vmax * 2.237) + 'mph') }; });

await run('gun shop', () => { const g = __pc, s = g.SHOPS.find(q => q.team === g.P.team); g.P.earn += 60000; g.addRP(g.rpFor(10) + 10); g.step(2, 1 / 30); g.P.x = s.x; g.P.z = s.z; g.step(4, 1 / 30);
  const txt = () => [...document.querySelectorAll('#shop-list li')].map(li => li.textContent).join(' | ');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); const open = !!g.shopNow(), main = txt();
  g.buy('5'); const hand = txt(); g.buy('2'); g.buy('3'); const hand2 = txt(); g.buy('4');
  g.buy('7'); const heavy = txt(); g.buy('1'); g.buy('2'); g.buy('3'); const heavy2 = txt(); g.buy('4'); g.buy('3'); g.buy('1'); g.closeShop();
  return { open, main, hand, hand2, heavy, heavy2, inv: Object.keys(g.P.inv), sw: !!(g.P.inv.glocks && g.P.inv.glocks.sw), nades: g.P.nades }; });

await run('keys', () => { const g = __pc, out = {}; for (const [code, want] of [['Digit7', 'glocks'], ['Digit8', 'm60'], ['Digit9', 'gl'], ['Digit0', 'rpg'], ['Digit5', 'rifle']]) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); window.dispatchEvent(new KeyboardEvent('keyup', { code })); g.P.switchT = 0; out[code] = g.P.wpn === want; } return out; });

// put a few rivals in front of the player and use each new gun on them
await run('guns', () => { const g = __pc, out = {}, z0 = g.ZONES[6]; g.DBG.notarget = true;
  const lineUp = (n, d) => { g.bots.filter(b => b.temp && b.lineup).forEach(b => g.removeBot(b)); const list = []; for (let k = 0; k < n; k++) { const b = g.spawnBot((g.P.team + 1) % 6, g.P.x + (k - (n - 1) / 2) * 1.2, g.P.y, g.P.z - d, { temp: true }); b.lineup = true; b.react = 99; b.brainT = 99; list.push(b); } return list; };
  const aimAt = (x, y, z) => { for (let k = 0; k < 8; k++) { const cp = g.camera.position, dx = x - cp.x, dy = y - cp.y, dz = z - cp.z; g.P.cyaw = Math.atan2(-dx, -dz); g.P.cpitch = Math.atan2(dy, Math.hypot(dx, dz)); g.visuals(1 / 30); } };
  g.P.x = z0.x + 4; g.P.z = z0.z + 30; g.P.y = 0.12; g.step(3, 1 / 30);
  // glocks: semi without the switch would be one shot per click; with it the trigger can be held
  g.setWeapon('glocks'); g.P.switchT = 0; let t = lineUp(1, 10); aimAt(t[0].x, t[0].y + 1.1, t[0].z); g.mouse.down = true; const m0 = g.P.inv.glocks.mag; for (let k = 0; k < 20; k++) { g.step(1, 1 / 30); g.visuals(1 / 30); } g.mouse.down = false; out.glocksAuto = { fired: m0 - g.P.inv.glocks.mag, dead: t[0].dead };
  g.setWeapon('m60'); g.P.switchT = 0; t = lineUp(1, 14); aimAt(t[0].x, t[0].y + 1.1, t[0].z); g.mouse.down = true; const m1 = g.P.inv.m60.mag; for (let k = 0; k < 30; k++) { g.step(1, 1 / 30); g.visuals(1 / 30); } g.mouse.down = false; out.m60 = { fired: m1 - g.P.inv.m60.mag, dead: t[0].dead };
  g.setWeapon('rpg'); g.P.switchT = 0; t = lineUp(3, 24); aimAt(t[1].x, t[1].y + .9, t[1].z); g.P.fireT = 0; g.mouse.fresh = true; g.tryFire(); let flew = 0; for (let k = 0; k < 40; k++) { g.step(1, 1 / 30); flew = Math.max(flew, g.PROJ ? g.PROJ.length : 0); } out.rpg = { dead: t.filter(b => b.dead).length, of: t.length, flew };
  g.setWeapon('gl'); g.P.switchT = 0; t = lineUp(3, 18); aimAt(t[1].x, t[1].y + .6, t[1].z); g.P.fireT = 0; g.mouse.fresh = true; g.tryFire(); for (let k = 0; k < 60; k++) g.step(1, 1 / 30); out.gl = { dead: t.filter(b => b.dead).length, of: t.length };
  t = lineUp(4, 9.5); g.explode(g.P.x, g.P.y + .3, g.P.z - 9, g.P, 1.35, 'nade'); out.nadeAt9m = t.filter(b => b.dead).length + ' of 4';
  return out; });

await run('gl debug', () => { const g = __pc; g.setWeapon('gl'); g.P.switchT = 0; g.P.fireT = 0; g.P.reloadT = 0; const w = g.P.inv.gl, m0 = w.mag; g.mouse.fresh = true; g.tryFire(); const n = g.PROJ.length, pr = g.PROJ[0] ? { kind: g.PROJ[0].kind, vy: +g.PROJ[0].vy.toFixed(1), y: +g.PROJ[0].y.toFixed(1) } : null; let ys = []; for (let k = 0; k < 40 && g.PROJ.length; k++) { g.step(1, 1 / 30); if (g.PROJ[0]) ys.push(+g.PROJ[0].y.toFixed(1)); } return { m0, mag: w.mag, n, pr, ys: ys.slice(0, 12), left: g.PROJ.length }; });
const road = 'const road = (c) => { c.x = g.RX(0) + 8; c.z = g.RZ(2) + 3.2; c.yaw = -Math.PI / 2; c.y = g.groundAt(c.x, c.z, 3, "p"); c.vx = c.vz = 0; c.hp = c.spec.hp; c.burn = 0; c.wreck = false; };';
await run('cars', () => { const g = __pc, S = g.CARS; const road = c => { c.x = g.RX(0) + 8; c.z = g.RZ(2) + 3.2; c.yaw = -Math.PI / 2; c.y = g.groundAt(c.x, c.z, 3, 'p'); c.vx = c.vz = 0; c.hp = c.spec.hp; c.burn = 0; };
  let c = null; for (let k = 0; k < 8 && !c; k++) c = g.spawnCar('super', g.P.x + 4 + k, g.P.z, 0, {}); g.step(4, 1 / 30);
  g.P.x = c.x - 2.5; g.P.z = c.z; const o = g.carOffer(c); g.tryEnter(c, o); g.step(60, 1 / 30); const inCar = g.P.car === c;
  const run = (nos, secs) => { road(c); let top = 0; for (let k = 0; k < secs * 30; k++) { g.keys.KeyW = true; g.keys.ShiftLeft = nos; g.step(1, 1 / 30); top = Math.max(top, Math.hypot(c.vx, c.vz)); } g.keys.KeyW = false; g.keys.ShiftLeft = false; return Math.round(top * 2.237); };
  const plain = run(false, 4); c.nos = 2; c.nosQ = 1; const boosted = run(true, 4); road(c); g.step(10, 1 / 30);
  return { inCar, vmax: Math.round(S.super.vmax * 2.237), plain4s: plain, nos4s: boosted, nosLeft: +c.nosQ.toFixed(2), hp: Math.round(c.hp) }; });

await run('car shop', () => { const g = __pc, c = g.P.car, gar = g.GARAGES.find(q => q.team === g.P.team); g.P.earn += 40000; c.nos = 0; c.hp = c.spec.hp - 100; c.burn = 0; c.x = gar.x; c.z = gar.z; c.vx = c.vz = 0; g.step(8, 1 / 30);
  const txt = () => [...document.querySelectorAll('#shop-list li')].map(li => li.textContent);
  const main = txt(); g.buy('2'); const paint = txt(); g.buy('3'); g.buy('10'); const back = txt().length;
  for (let k = 0; k < 3; k++) g.buy('3'); for (let k = 0; k < 3; k++) g.buy('4'); for (let k = 0; k < 2; k++) g.buy('5'); for (let k = 0; k < 2; k++) g.buy('6'); g.buy('7'); g.buy('8'); g.buy('9'); g.buy('1'); g.step(2, 1 / 30);
  return { open: !!g.shopNow(), main, paint, back, mods: { plate: c.plate, tune: c.tune, nos: c.nos, grip: c.grip, bp: c.bp, neon: (c.neon | 0).toString(16), color: c.color.toString(16), hp: Math.round(c.hp) }, pv: g.P.pv }; });

await run('bulletproof', () => { const g = __pc, c = g.P.car; if (g.shopNow()) g.closeShop(); c.x += 20; g.step(5, 1 / 30); g.DBG.god = false; g.DBG.notarget = false; const hp0 = g.P.hp, chp = c.hp;
  const shooter = g.spawnBot((g.P.team + 1) % 6, c.x + 6, c.y, c.z + 2, { temp: true, wpn: 'rifle' }); shooter.skill = 3;
  for (let k = 0; k < 30 * 6; k++) { shooter.tgt = g.P; shooter.seenT = g.G.time; shooter.react = 0; g.step(1, 1 / 30); }
  g.DBG.god = true; g.DBG.notarget = true; g.removeBot(shooter); return { playerHp: [Math.round(hp0), Math.round(g.P.hp)], carHp: [Math.round(chp), Math.round(c.hp)], shots: shooter.shots }; });

await run('deal', () => { const g = __pc; g.GAME.leaveCar(false); g.step(20, 1 / 30); let ok = false; for (let k = 0; k < 10 && !ok; k++) ok = g.EV_START.deal(); const E = g.EVTS.find(e => e.k === 'deal'); if (!E) return 'no deal';
  const sides = E.side.map(l => l.map(b => b.team).join('')); g.step(30 * 3, 1 / 30); const calm = !E.blown && E.side.flat().every(b => !b.dead);
  g.P.x = E.x + 9; g.P.z = E.z + 9; g.step(30 * 2, 1 / 30); const blown = E.blown;
  for (let k = 0; k < 30 * 20 && !E.side.flat().every(b => b.dead || b.gone); k++) g.step(1, 1 / 30);
  E.side.flat().forEach(b => { if (!b.dead) g.damageBot(b, 999, false, g.P, 'rifle'); }); g.step(30, 1 / 30);
  const loot = E.loot.map(l => l ? l.amt : 0), cash0 = g.P.cash; E.loot.forEach(l => { if (l && !l.gone) { g.P.x = l.x; g.P.z = l.z; g.P.y = l.y; g.step(4, 1 / 30); } }); g.step(30, 1 / 30);
  return { sides, calm, blown, loot, gained: g.P.cash - cash0, over: !g.EVTS.includes(E), feed: document.getElementById('feed').textContent.slice(-160) }; });

await run('online cars', () => { const g = __pc; g.openPhone(); const k = g.phoneItems().findIndex(q => /Online/.test(q.label)); g.buy(String(k + 1)); const items = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent);
  g.buy('1'); g.step(10, 1 / 30); const c = g.myPV(); return { items, pv: g.P.pv && g.P.pv.t, delivered: c ? c.type + ' ' + Math.round(Math.hypot(c.x - g.P.x, c.z - g.P.z)) + 'm' : null }; });
await shot('v5_play');
await run('soak', () => { const g = __pc, t0 = performance.now(); for (let i = 0; i < 30 * 200; i++) { g.step(1, 1 / 30); if (i % 30 === 0) g.visuals(1 / 30); } return { ms: Math.round(performance.now() - t0), bots: g.bots.length, cars: g.cars.length, evts: g.EVTS.map(E => E.k) }; });
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no errors');
await b.close(); srv.close();
