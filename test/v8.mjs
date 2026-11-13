// stage two: the bank set up and done quiet and loud, the cargo yard, and (in mp4.mjs) going down and being picked up online
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
await run('phone', () => { const g = __pc; const main = g.jobItems('jobs').map(i => i.label + (i.off ? ' (off)' : '')), bank = g.jobItems('jobs-bank').map(i => i.label + ' · ' + (i.sub || '').slice(0, 40) + (i.off ? ' (off)' : '')); return { main, bank }; });
// setup: case the bank, guns away
await run('case the bank', () => { const g = __pc; g.setWeapon('fist'); g.P.switchT = 0; g.startPrep('scout'); const E = __ev('prep'); const out = { started: !!E && E.sub }; g.BK2.spots.forEach((s, i) => { __at(s.x, s.z); __run(3.2); out['spot' + i] = E.mask; }); __run(.5); out.prep = g.prepMask(); out.over = !__ev('prep'); return out; });
await run('case with a gun out does nothing', () => { const g = __pc; return { scout: g.G.prep.scout }; });
// setup: the getaway car
await run('getaway car', () => { const g = __pc; g.startPrep('car'); const E = __ev('prep'); if (!E) return 'no setup'; const c = E.car, guards = E.guards.length; __at(c.x + 3, c.z); __run(.3); g.tryEnter(c, g.carOffer(c)); __run(2.5); const inCar = g.P.car === c;
  c.x = g.BK2.away.x; c.z = g.BK2.away.z; c.vx = c.vz = 0; __run(1.5); g.GAME.leaveCar(false); __run(1); return { type: c.type, guards, inCar, getaway: g.G.prep.car === c.id, flag: !!c.getaway, prep: g.prepMask(), over: !__ev('prep') }; });
// setup: the gear
await run('gear', () => { const g = __pc; g.startPrep('gear'); const E = __ev('prep'); if (!E) return 'no setup'; const bag = E.bag; __at(bag.x, bag.z); __run(.6); const carrier = E.carrier === g.P; const gc = g.getaway(E) || g.cars.find(c => c.id === g.G.prep.car); __at(gc.x + 2.5, gc.z + 2.5); __run(1); return { carrier, prep: g.prepMask(), over: !__ev('prep') }; });
await run('phone after setups', () => __pc.jobItems('jobs-bank').map(i => i.label + (i.off ? ' (off)' : '') + (i.cost ? ' $' + i.cost : '')));
await shot('v8_getaway');
// the bank, quiet
await run('quiet: walk in', () => { const g = __pc; g.G.jobT = {}; g.setWeapon('fist'); g.startJob('bank', 1); const E = __ev('bank'); __at(g.BK2.spots[0].x, g.BK2.spots[0].z); __run(1); return { quiet: E && E.quiet, stage: E && E.stage, guards: E && E.guards.length, heat: g.P.heat | 0, sus: E && +E.sus.toFixed(2) }; });
await run('quiet: hack the panel', () => { const g = __pc, E = __ev('bank'); __at(g.BK2.panel.x, g.BK2.panel.z - .3); __run(.3); const pr = g.findPromptNow(), txt = pr && pr.text; if (pr && pr.act) pr.act(); __run(8); return { prompt: txt, stage: E.stage, sus: +E.sus.toFixed(2), alarm: E.alarm, heat: g.P.heat | 0 }; });
await run('quiet: time lock', () => { const g = __pc, E = __ev('bank'); __run(21); return { stage: E.stage, bags: E.bags.length, each: E.bags[0] && E.bags[0].amt, door: g.BANK ? 'ok' : 'no bank' }; });
await shot('v8_vault');
await run('quiet: bags', () => { const g = __pc, E = __ev('bank'), gc = g.getaway(E), out = []; for (let i = 0; i < 6 && E.bags.some(q => !q.gone); i++) { const bg = E.bags.find(q => !q.gone); __at(bg.x, bg.z); __run(.4); const had = g.P.bag; __at(gc.x + 2.6, gc.z + 2.6); __run(.6); out.push([had, E.loaded]); } __run(1); return { trips: out, stage: E.stage, loaded: E.loaded, heat: g.P.heat | 0, alarm: E.alarm }; });
await run('quiet: the drop', () => { const g = __pc, E = __ev('bank'); if (!E) return 'over already'; const gc = g.getaway(E), cash0 = g.P.cash; g.GAME.clearHeat(g.P); __at(gc.x + 2.5, gc.z); __run(.3); g.tryEnter(gc, g.carOffer(gc)); __run(2.5); gc.x = E.x + 3; gc.z = E.z; gc.vx = gc.vz = 0; g.GAME.clearHeat(g.P); __run(2); return { over: !__ev('bank'), got: Math.round(g.P.cash - cash0), line: g.jobLine ? g.jobLine() : '' }; });
// suspicion: a gun out in front of a guard sets the alarm off
await run('quiet: gun out', () => { const g = __pc; if (g.P.car) g.GAME.leaveCar(false); __run(1); g.G.jobT = {}; g.startJob('bank', 1); const E = __ev('bank'); if (!E) return 'no job'; const gd = E.guards[0]; __at(gd.x + 3, gd.z); g.setWeapon('pistol'); g.P.switchT = 0; let t = 0; while (!E.alarm && t < 300) { __run(1 / 30); t++; } return { secs: +(t / 30).toFixed(1), alarm: E.alarm, heat: g.P.heat | 0 }; });
await run('end that one', () => { const g = __pc, E = __ev('bank'); if (E) { E.until = 0; __run(.5); } g.GAME.clearHeat(g.P); return { over: !__ev('bank') }; });
// the bank, loud: alarm, drill, a jam, restart
await run('loud', () => { const g = __pc; g.G.jobT = {}; g.startJob('bank', 0); const E = __ev('bank'); if (!E) return 'no job'; __at(g.BANK.door.x + 4, g.BANK.cz); __run(1); const s1 = E.stage, heat = g.P.heat | 0; __at(g.BANK.vault.x, g.BANK.vault.z); let t = 0, jams = 0, restarted = 0;
  while (E.stage === 1 && t < 30 * 120) { __run(1 / 30); t++; if (E.jam) { jams++; const pr = g.findPromptNow(); if (pr && pr.act) { pr.act(); restarted++; } } }
  return { s1, heat, stage: E.stage, secs: Math.round(t / 30), jams, restarted, bags: E.bags.length, each: E.bags[0] && E.bags[0].amt }; });
await run('loud: lose the car, lose the loot', () => { const g = __pc, E = __ev('bank'); const gc = g.getaway(E), bg = E.bags.find(q => !q.gone); __at(bg.x, bg.z); __run(.4); __at(gc.x + 2.6, gc.z + 2.6); __run(.6); const loaded = E.loaded; gc.hp = 0; gc.burn = 3; __run(4); return { loaded, after: E.loaded, getaway: !!g.getaway(E) }; });
await run('end loud', () => { const g = __pc, E = __ev('bank'); if (E) { E.until = 0; __run(.5); } g.GAME.clearHeat(g.P); return { over: !__ev('bank'), bag: g.P.bag | 0 }; });
// the cargo yard: any car or helicopter becomes the getaway
await run('cargo', () => { const g = __pc; g.G.jobT = {}; g.startJob('cargo', 0); const E = __ev('cargo'); if (!E) return 'no job'; __at(g.CARGO.hack.x - 10, g.CARGO.hack.z); __run(1); const s1 = E.stage, heat = g.P.heat | 0; __at(g.CARGO.hack.x, g.CARGO.hack.z); __run(.3); const pr = g.findPromptNow(), txt = pr && pr.text; if (pr && pr.act) pr.act(); __run(11); return { s1, heat, prompt: txt, stage: E.stage, bags: E.bags.length, each: E.bags[0] && E.bags[0].amt }; });
await shot('v8_cargo');
await run('cargo: a ride', () => { const g = __pc, E = __ev('cargo'); const bg = E.bags.find(q => !q.gone); __at(bg.x, bg.z); __run(.4); const had = g.P.bag; const c = g.spawnCar('sport', g.P.x + 6, g.P.z, 0, {}); g.tryEnter(c, g.carOffer(c)); __run(2.5); __run(.5); return { had, inCar: !!g.P.car, gc: E.gc === (c && c.id), loaded: E.loaded, bag: g.P.bag | 0 }; });
await run('cargo: the drop', () => { const g = __pc, E = __ev('cargo'); E.bags.forEach(q => { if (!q.gone) g.GAME.takeHBag(q, g.P); }); __run(1); const c = g.P.car; const cash0 = g.P.cash; for (let k = 0; k < 8 && __ev('cargo'); k++) { __run(.5); if (__ev('cargo').stage === 4) break; E.openT = -999; } c.x = E.x + 3; c.z = E.z; c.vx = c.vz = 0; g.GAME.clearHeat(g.P); __run(2); return { over: !__ev('cargo'), got: Math.round(g.P.cash - cash0) }; });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
await b.close();
