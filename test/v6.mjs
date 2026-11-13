// v6 stage three: the airport and helicopters, solo on a manual clock
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
const MODE = process.argv[2] || 'all';
await run('start', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 3, 1 / 30); g.P.hints = []; g.P.earn += 200000; g.addRP(g.rpFor(9) + 10); g.step(2, 1 / 30);
  return { pads: g.AIRPORT.pads.length, helis: g.cars.filter(c => c.spec.air).map(c => [c.type, Math.round(c.x), Math.round(c.z), +c.y.toFixed(2)]), nav: g.NAV.filter(n => n.x > 830 && !n.iso).length, navIso: g.NAV.filter(n => n.x > 700 && n.iso).length, rank: g.P.rank }; });
if (MODE === 'probe') {
  await run('scan', () => { const g = __pc, out = []; for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) { const L = { x0: 20 + i * 100, x1: 100 + i * 100, z0: 20 + j * 84, z1: 84 + j * 84 };
      let best = null; for (let x = L.x0 + 9; x <= L.x1 - 9; x += 2) for (let z = L.z0 + 9; z <= L.z1 - 9; z += 2) { if (g.pushOutTest(x, z)) continue; const gy = g.groundAt(x, z, 3, 'p'); if (Math.abs(gy - .15) > .1) continue; const dc = Math.min(x - L.x0, L.x1 - x, z - L.z0, L.z1 - z); if (!best || dc > best[2]) best = [x, z, dc]; }
      if (best) out.push([i, j, best[0], best[1], best[2]]); } return out; });
}
const tick = n => p.evaluate(n => { const g = __pc; for (let i = 0; i < n; i++) { g.step(1, 1 / 30); if (i % 3 === 0) g.visuals(1 / 30); } }, n);
if (MODE === 'all' || MODE === 'fly') {
  await run('board', () => { const g = __pc, c = g.cars.find(q => q.type === 'chopper' && q.home); g.P.x = c.x + 2.6; g.P.z = c.z + .9; g.P.y = c.y; g.step(4, 1 / 30); const pr = g.findPromptNow();
    if (pr && pr.act) pr.act(); g.step(30, 1 / 30); return { prompt: pr && pr.text, inCar: !!g.P.car, type: g.P.car && g.P.car.type, seat: g.P.seat }; });
  await run('climb', () => { const g = __pc, c = g.P.car; g.P.cyaw = c.yaw; const y0 = c.y; g.keys.Space = true; let t = 0; for (; t < 30 * 6; t++) { g.step(1, 1 / 30); if (t % 6 === 0) g.visuals(1 / 30); } g.keys.Space = false; const y1 = c.y; for (let i = 0; i < 60; i++) g.step(1, 1 / 30); return { y0: +y0.toFixed(2), y1: +y1.toFixed(1), hover: +c.y.toFixed(1), rotor: +c.rotor.toFixed(2), landed: c.landed }; });
  await shot('v6_climb');
  await run('cruise', () => { const g = __pc, c = g.P.car; g.P.cyaw = Math.PI / 2; for (let i = 0; i < 60; i++) g.step(1, 1 / 30); const yawOk = Math.abs(((c.yaw - Math.PI / 2 + 9 * Math.PI) % (2 * Math.PI)) - Math.PI); const x0 = c.x, z0 = c.z; g.keys.KeyW = true; let top = 0;
    for (let i = 0; i < 30 * 8; i++) { g.step(1, 1 / 30); top = Math.max(top, Math.hypot(c.vx, c.vz)); if (i % 6 === 0) g.visuals(1 / 30); } g.keys.KeyW = false; const hud = document.getElementById('h-air').textContent;
    return { facing: +yawOk.toFixed(2), moved: [Math.round(c.x - x0), Math.round(c.z - z0)], topMph: Math.round(top * 2.237), y: +c.y.toFixed(1), dive: +c.dive.toFixed(2), hp: c.hp, hud }; });
  await shot('v6_cruise');
  await run('land', () => { const g = __pc, c = g.P.car; for (let i = 0; i < 90; i++) g.step(1, 1 / 30); g.keys.ShiftLeft = true; let t = 0, hp = c.hp; const hits = []; while (!c.landed && t < 30 * 20) { g.step(1, 1 / 30); t++; if (c.hp < hp) { const s = c.lastHit; hits.push([t, Math.round(hp - c.hp), +c.y.toFixed(1), +c.vy.toFixed(1), +Math.hypot(c.vx, c.vz).toFixed(1), s ? (s.kind || '') + '/' + s.team + '/' + (s.car ? 'car' : 'foot') : 'none', g.P.heat | 0]); hp = c.hp; } } g.keys.ShiftLeft = false; for (let i = 0; i < 30; i++) { g.step(1, 1 / 30); if (c.hp < hp) { hits.push(['after', Math.round(hp - c.hp)]); hp = c.hp; } } window.__hits = hits;
    return { landed: c.landed, secs: +(t / 30).toFixed(1), y: +c.y.toFixed(2), hp: Math.round(c.hp), where: [Math.round(c.x), Math.round(c.z)], onLand: g.onLand(c.x, c.z), hits: window.__hits }; });
  await run('jump', () => { const g = __pc, c = g.P.car; g.keys.Space = true; for (let i = 0; i < 30 * 5; i++) g.step(1, 1 / 30); g.keys.Space = false; const alt = c.y; const hp0 = g.P.hp; g.DBG.god = false;
    g.GAME.leaveCar(false); const chute = g.P.chute; let t = 0; for (; t < 30 * 30 && !g.P.onGround; t++) { g.step(1, 1 / 30); if (t % 6 === 0) g.visuals(1 / 30); } g.step(5, 1 / 30); g.DBG.god = true;
    return { alt: Math.round(alt), chute, secs: +(t / 30).toFixed(1), hpBefore: Math.round(hp0), hpAfter: Math.round(g.P.hp), heliY: +c.y.toFixed(1), heliHp: Math.round(c.hp), wreck: c.wreck }; });
}
if (MODE === 'all' || MODE === 'gun') {
  await run('gunship', () => { const g = __pc, c = g.cars.find(q => q.type === 'heli' && q.home); g.DBG.notarget = false; g.P.x = 900; g.P.z = 135; g.P.y = .15; g.step(30 * 14, 1 / 30); const far = g.AIRS.guards.length; g.P.x = c.x - 8; g.P.z = c.z; g.step(30 * 4, 1 / 30);
    const guards = [far, g.AIRS.guards.length, g.AIRS.guards.map(b => Math.round(Math.hypot(b.x - b.stay.x, b.z - b.stay.z))).join(',')]; g.P.x = c.x + 2.4; g.P.z = c.z + .9; g.step(3, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); g.step(30, 1 / 30);
    return { guards, prompt: pr && pr.text, inCar: g.P.car && g.P.car.type, heat: g.P.heat, stolen: c.stolen }; });
  await run('guns', () => { const g = __pc, c = g.P.car; g.DBG.notarget = true; g.GAME.clearHeat(g.P); g.keys.Space = true; for (let i = 0; i < 30 * 3; i++) g.step(1, 1 / 30); g.keys.Space = false;
    const v = g.spawnBot(g.TEAM_CIV, c.x + 42, .15, c.z + 20, {}); v.hp = 60; g.P.cyaw = Math.atan2(-(v.x - c.x), -(v.z - c.z)); for (let i = 0; i < 60; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); }
    const dy = (v.y + 1.1) - (g.camera.position.y), dh = Math.hypot(v.x - g.camera.position.x, v.z - g.camera.position.z); g.P.cpitch = Math.atan2(dy, dh);
    const aim = () => { for (let q = 0; q < 3; q++) { g.P.cyaw = Math.atan2(-(v.x - g.camera.position.x), -(v.z - g.camera.position.z)); g.P.cpitch = Math.atan2((v.y + 1.1) - g.camera.position.y, Math.hypot(v.x - g.camera.position.x, v.z - g.camera.position.z)) + .04; g.visuals(1 / 30); } };
    g.mouse.down = true; let k = 0; for (; k < 30 * 4 && !v.dead; k++) { aim(); g.step(1, 1 / 30); } g.mouse.down = false;
    return { dead: v.dead, secs: +(k / 30).toFixed(2), shots: g.P.hg, wid: v.dead ? 'ok' : v.hp }; });
  await run('rockets', () => { const g = __pc, c = g.P.car, car = g.spawnCar('sedan', c.x + 46, c.z + 40, 0, {}); for (let i = 0; i < 10; i++) g.step(1, 1 / 30);
    g.P.cyaw = Math.atan2(-(car.x - c.x), -(car.z - c.z)); for (let i = 0; i < 50; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); }
    let k = 0; g.keys.KeyG = true; for (; k < 30 * 4 && !car.wreck; k++) { for (let q = 0; q < 3; q++) { g.P.cyaw = Math.atan2(-(car.x - g.camera.position.x), -(car.z - g.camera.position.z)); g.P.cpitch = Math.atan2(car.y + .8 - g.camera.position.y, Math.hypot(car.x - g.camera.position.x, car.z - g.camera.position.z)) + .04; g.visuals(1 / 30); } g.step(1, 1 / 30); } g.keys.KeyG = false;
    for (let i = 0; i < 30 * 3 && !car.wreck; i++) g.step(1, 1 / 30);
    return { carWreck: car.wreck, carBurn: car.burn, rockets: g.P.hr, left: +(c.rk).toFixed(1), heliHp: Math.round(c.hp) }; });
  await shot('v6_rockets');
  await run('ditch', () => { const g = __pc, c = g.P.car; c.x = 780; c.z = 120; c.y = 30; c.vx = c.vz = c.vy = 0; g.keys.ShiftLeft = true; let t = 0; for (; t < 30 * 15 && g.P.car; t++) g.step(1, 1 / 30); g.keys.ShiftLeft = false; g.step(10, 1 / 30);
    return { out: !g.P.car, secs: +(t / 30).toFixed(1), sunk: c.sunk, wreck: c.wreck, player: [Math.round(g.P.x), +g.P.y.toFixed(2), Math.round(g.P.z)], onLand: g.onLand(g.P.x, g.P.z) }; });
}
if (MODE === 'copdbg') {
  await run('dbg', () => { const g = __pc; g.DBG.notarget = false; g.P.x = 360; g.P.z = 262; g.P.y = 0; g.step(10, 1 / 30); g.GAME.crime(g.P, 0, 3); const out = [];
    for (let i = 0; i < 30 * 16; i++) { g.step(1, 1 / 30); const c = g.cars.find(q => q.hai); if (c && i % 30 === 0) out.push([i / 30 | 0, Math.round(c.x), Math.round(c.y), Math.round(c.z), +c.vx.toFixed(1), +c.vz.toFixed(1), c.inp.fwd && +c.inp.fwd.toFixed(2), c.inp.side && +c.inp.side.toFixed(2), +c.yaw.toFixed(2), c.landed, +c.rotor.toFixed(2), c.occ[0] && c.occ[0].kind, g.P.heat, g.G.cops, !!c.hai.leave]); }
    return out; });
}
if (MODE === 'gundbg') {
  await run('dbg', () => { const g = __pc, c = g.cars.find(q => q.type === 'heli' && q.home); g.P.x = c.x + 2.4; g.P.z = c.z + .9; g.step(3, 1 / 30); const pr = g.findPromptNow(); pr.act(); g.step(30, 1 / 30); g.GAME.clearHeat(g.P); g.DBG.notarget = true;
    g.keys.Space = true; for (let i = 0; i < 30 * 3; i++) g.step(1, 1 / 30); g.keys.Space = false;
    const v = g.spawnBot(g.TEAM_CIV, c.x + 42, .15, c.z + 20, {}); v.hp = 60; g.P.cyaw = Math.atan2(-(v.x - c.x), -(v.z - c.z)); for (let i = 0; i < 60; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); }
    g.P.cpitch = Math.atan2((v.y + 1.1) - g.camera.position.y, Math.hypot(v.x - g.camera.position.x, v.z - g.camera.position.z)); g.visuals(1 / 30);
    const t = { x: 0, y: 0, z: 0 }; g.crossTarget(c, t); return { heli: [Math.round(c.x), Math.round(c.y), Math.round(c.z), +c.yaw.toFixed(2)], cam: [Math.round(g.camera.position.x), Math.round(g.camera.position.y), Math.round(g.camera.position.z)], cyaw: +g.P.cyaw.toFixed(2), cpitch: +g.P.cpitch.toFixed(2), target: [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)], cross: [+t.x.toFixed(1), +t.y.toFixed(1), +t.z.toFixed(1)], vdead: v.dead, vcar: !!v.car }; });
}
if (MODE === 'rkdbg') {
  await run('dbg', () => { const g = __pc, c = g.cars.find(q => q.type === 'heli' && q.home); g.P.x = c.x + 2.4; g.P.z = c.z + .9; g.step(3, 1 / 30); const pr = g.findPromptNow(); pr.act(); g.step(30, 1 / 30); g.GAME.clearHeat(g.P); g.DBG.notarget = true;
    g.keys.Space = true; for (let i = 0; i < 30 * 3; i++) g.step(1, 1 / 30); g.keys.Space = false; const car = g.spawnCar('sedan', c.x + 46, c.z + 40, 0, {}); for (let i = 0; i < 30; i++) g.step(1, 1 / 30);
    const out = []; const blast = g.explode; g.explodeLog = []; 
    for (let r = 0; r < 4; r++) { for (let q = 0; q < 4; q++) { g.P.cyaw = Math.atan2(-(car.x - g.camera.position.x), -(car.z - g.camera.position.z)); g.P.cpitch = Math.atan2(car.y + .8 - g.camera.position.y, Math.hypot(car.x - g.camera.position.x, car.z - g.camera.position.z)) + .04; g.visuals(1 / 30); g.step(1, 1 / 30); }
      const t = { x: 0, y: 0, z: 0 }; g.crossTarget(c, t); const n0 = g.PROJ.length; g.heliRocket(c); const pr = g.PROJ[g.PROJ.length - 1]; let last = null; for (let i = 0; i < 60 && g.PROJ.includes(pr); i++) { last = [+pr.x.toFixed(1), +pr.y.toFixed(1), +pr.z.toFixed(1)]; g.step(1, 1 / 30); }
      out.push({ cross: [+t.x.toFixed(1), +t.y.toFixed(1), +t.z.toFixed(1)], end: last, car: [+car.x.toFixed(1), +car.z.toFixed(1)], hp: Math.round(car.hp), wreck: car.wreck, fired: g.PROJ.length >= n0 }); for (let i = 0; i < 12; i++) g.step(1, 1 / 30); }
    return out; });
}
if (MODE === 'all' || MODE === 'cops') {
  await run('police heli', () => { const g = __pc; g.DBG.notarget = false; g.P.x = 360; g.P.z = 262; g.P.y = 0; g.step(10, 1 / 30); g.GAME.crime(g.P, 0, 3); for (let i = 0; i < 30 * 25; i++) { g.step(1, 1 / 30); if (i % 6 === 0) g.visuals(1 / 30); }
    const c = g.cars.find(q => q.hai && !q.hai.leave); return c ? { heat: g.P.heat, at: [Math.round(c.x), Math.round(c.y), Math.round(c.z)], dist: Math.round(Math.hypot(c.x - g.P.x, c.z - g.P.z)), crew: c.occ.map(o => o ? o.wpn : '-'), hp: Math.round(c.hp), playerHp: Math.round(g.P.hp) } : { heat: g.P.heat, none: true }; });
  await p.evaluate(() => { const g = __pc; g.G.tod = 23; g.applyTod && g.applyTod(23); for (let i = 0; i < 30; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); } });
  await shot('v6_policeheli');
  await run('shoot it down', () => { const g = __pc, c = g.cars.find(q => q.hai && !q.hai.leave); if (!c) return null; const tr = []; for (let k = 0; k < 2; k++) { g.explode(c.x, c.y + 1.2, c.z, g.P, 1.6, 'rpg'); g.step(2, 1 / 30); tr.push([Math.round(c.hp), +c.burn.toFixed(1), c.occ.map(o => o ? 1 : 0).join('')]); }
    for (let i = 0; i < 30 * 10 && !c.gone; i++) { g.step(1, 1 / 30); if (i % 30 === 0) tr.push([i / 30 | 0, +c.y.toFixed(1), +c.burn.toFixed(2), c.wreck, c.landed, c.gone]); }
    return { wreck: c.wreck, y: +c.y.toFixed(1), gone: !!c.gone, tr }; });
  await run('clear', () => { const g = __pc; g.GAME.clearHeat(g.P); g.step(30 * 10, 1 / 30); return { left: g.cars.filter(q => q.hai && !q.wreck).length }; });
}
if (MODE === 'all' || MODE === 'buy') {
  await run('buy', () => { const g = __pc; g.DBG.notarget = true; g.P.x = 300; g.P.z = 230; g.P.y = .15; g.step(5, 1 / 30); g.openPhone(); g.buy(String(g.phoneItems().findIndex(q => /Aircraft/.test(q.label)) + 1)); const items = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent);
    g.buy('2'); g.step(10, 1 / 30); const c = g.myAir(); return { items, air: g.P.air, mine: c && [c.type, Math.round(c.x), Math.round(c.z)], note: document.getElementById('feed') ? '' : '' }; });
  await run('bring', () => { const g = __pc; g.P.x = 900; g.P.z = 300; g.step(5, 1 / 30); g.PH.airT = -999; g.openPhone(); g.buy(String(g.phoneItems().findIndex(q => /Your/.test(q.label)) + 1)); const it = g.airItems()[0].label; g.buy('1'); g.step(10, 1 / 30); const c = g.myAir(); return [it, c && [c.type, Math.round(c.x), Math.round(c.z)]]; });
  await run('save', () => { const g = __pc; g.saveGame(); const d = JSON.parse(localStorage.getItem('pc-save')); return d.ac; });
}
log('errors', errs.slice(0, 8));
await b.close(); srv.close();
