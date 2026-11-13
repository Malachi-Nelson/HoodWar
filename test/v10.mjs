// stage four: planes. The Mallard and the Starling on the apron; take off from the runway, climb, turn toward where you look,
// stall, land gently, crash into the ground and into a building, bail out, buy one on the phone and have it waiting at the airport.
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
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 3, 1 / 30); g.P.hints = []; g.P.earn += 300000; g.addRP(g.rpFor(9) + 10); g.step(2, 1 / 30);
  return { rank: g.P.rank, planes: g.cars.filter(c => g.isPlane(c)).map(c => [c.type, Math.round(c.x), Math.round(c.z), +c.y.toFixed(2), c.landed, typeof c.ptc]) }; });
await p.evaluate(() => { const g = __pc;
  // fly for s seconds with keys held (and the mouse pointing somewhere), keeping a trace of what happened
  window.__fly = (s, keys, look) => { const c = g.P.car || window.__c, out = { maxY: -1, minY: 1e9, top: 0, stall: false, hp0: c ? c.hp : 0 }; (keys || []).forEach(k => g.keys[k] = true);
    for (let i = 0; i < Math.round(s * 30); i++) { if (look) look(c); g.step(1, 1 / 30); if (i % 3 === 0) g.visuals(1 / 30); if (!c) continue; out.maxY = Math.max(out.maxY, c.y); out.minY = Math.min(out.minY, c.y); out.top = Math.max(out.top, c.spd || 0); if (/STALL/.test((document.getElementById('h-air') || {}).textContent || '')) out.stall = true; }
    (keys || []).forEach(k => g.keys[k] = false); return out; };
  window.__st = c => ({ x: Math.round(c.x), z: Math.round(c.z), y: +c.y.toFixed(1), spd: +(c.spd || 0).toFixed(1), thr: +(c.thr || 0).toFixed(2), pitch: +(c.ptc || 0).toFixed(2), roll: +(c.roll || 0).toFixed(2), landed: c.landed, hp: Math.round(c.hp), wreck: c.wreck });
  window.__line = (c, z, yaw) => { c.x = g.RWY.cx; c.z = z; c.yaw = yaw; c.y = g.groundAt(c.x, c.z, 3, 's', .6); c.vx = c.vz = c.vy = 0; c.spd = 0; c.thr = 0; c.ptc = 0; c.roll = 0; c.landed = true; c.sink = 0; c.hp = c.spec.hp; };
});
await run('board the Mallard', () => { const g = __pc, c = g.cars.find(q => q.type === 'prop' && q.home); if (!c) return 'no Mallard'; window.__c = c; const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
  g.P.x = c.x + rx * 1.9; g.P.z = c.z + rz * 1.9; g.P.y = c.y; g.P.vx = g.P.vz = g.P.vy = 0; g.step(4, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); g.step(30, 1 / 30);
  return { prompt: pr && pr.text, type: g.P.car && g.P.car.type, seat: g.P.seat, hud: (document.getElementById('h-air') || {}).textContent }; });
await run('taxi', () => { const g = __pc, c = g.P.car; if (!c) return 'not aboard'; const x0 = c.x, z0 = c.z; g.P.cyaw = c.yaw; const f = __fly(3, ['Space']); const mid = __st(c); const f2 = __fly(3, ['ShiftLeft']); return { moved: Math.round(Math.hypot(c.x - x0, c.z - z0)), mid, after: __st(c), flew: f.maxY - c.y > 1 }; });
await run('take off (south end, heading north)', () => { const g = __pc, c = g.P.car; __line(c, g.RWY.z1 - 25, 0); g.P.cyaw = 0; g.P.cpitch = 0; const z0 = c.z;
  const roll = __fly(3.2, ['Space']); const rot = __st(c), dist = Math.round(z0 - c.z);
  const up = __fly(1.2, ['Space', 'KeyS']); const lift = __st(c); const climb = __fly(6, ['Space'], () => { g.P.cyaw = 0; g.P.cpitch = .3; });
  return { roll: rot, groundRoll: dist, lift, climb: __st(c), rose: Math.round(c.y - rot.y), hp: Math.round(c.hp), hud: document.getElementById('h-air').textContent }; });
await shot('v10_climb');
await run('turn toward the mouse', () => { const g = __pc, c = g.P.car, y0 = c.yaw; let maxRoll = 0; const f = __fly(4, [], () => { g.P.cyaw = y0 + 1.6; g.P.cpitch = 0; maxRoll = Math.max(maxRoll, Math.abs(c.roll)); });
  const d = Math.abs(((c.yaw - (y0 + 1.6)) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return { turned: +(c.yaw - y0).toFixed(2), offBy: +d.toFixed(2), maxRoll: +maxRoll.toFixed(2), now: __st(c) }; });
await run('keys: roll and pitch', () => { const g = __pc, c = g.P.car; g.P.cyaw = c.yaw; const r0 = c.roll; __fly(.8, ['KeyD']); const rr = c.roll; __fly(1.5, ['KeyA']); const rl = c.roll; __fly(1.5, []); const p0 = c.ptc; __fly(.6, ['KeyW']); const pd = c.ptc; __fly(.6, ['KeyS']);
  return { rollRight: +rr.toFixed(2), rollLeft: +rl.toFixed(2), noseDownFrom: +p0.toFixed(2), to: +pd.toFixed(2), now: __st(c) }; });
await run('stall', () => { const g = __pc, c = g.P.car; c.y = Math.max(c.y, 140); const f = __fly(9, ['ShiftLeft', 'KeyS']); const s = __st(c); const rec = __fly(6, ['Space'], () => { g.P.cyaw = c.yaw; g.P.cpitch = -.2; });
  return { stallWarned: f.stall, at: s, recovered: __st(c), lost: Math.round(f.maxY - c.y) }; });
await run('land on the runway', () => { const g = __pc, c = g.P.car; c.x = g.RWY.cx; c.z = g.RWY.z1 - 40; c.yaw = 0; c.y = g.groundAt(c.x, c.z, 3, 's', .6) + 14; c.spd = 27; c.thr = .55; c.ptc = -.05; c.roll = 0; c.landed = false; c.sink = 0; c.hp = c.spec.hp;
  let t = 0, imp = 0; for (; t < 30 * 20 && !c.landed; t++) { g.P.cyaw = 0; g.P.cpitch = -.16; imp = Math.max(imp, -c.vy); g.step(1, 1 / 30); } const at = __st(c);
  const f = __fly(10, ['ShiftLeft']); return { landed: at.landed, secs: +(t / 30).toFixed(1), touchdownSink: +imp.toFixed(1), at, stopped: __st(c), onRunway: c.x > g.RWY.x0 && c.x < g.RWY.x1 && c.z > g.RWY.z0 && c.z < g.RWY.z1 }; });
await shot('v10_landed');
await run('nose into the ground', () => { const g = __pc, c = g.P.car; const hp0 = g.P.hp; c.y += 40; c.spd = 40; c.thr = 1; c.ptc = -.7; c.landed = false; c.sink = 0; let t = 0; for (; t < 30 * 8 && !c.wreck && c.hp > 0; t++) { g.P.cyaw = c.yaw; g.P.cpitch = -1.2; g.step(1, 1 / 30); }
  return { secs: +(t / 30).toFixed(1), wreck: c.wreck, burn: c.burn > 0, hp: Math.round(c.hp), inside: g.P.car === c, playerHp: Math.round(g.P.hp), was: Math.round(hp0) }; });
await run('a fresh Mallard', () => { const g = __pc; if (g.P.car) g.GAME.leaveCar(false); g.step(10, 1 / 30); const c = g.spawnCar('prop', g.RWY.cx, g.RWY.z1 - 25, 0, {}); window.__c = c; g.P.x = c.x + 1.9; g.P.z = c.z; g.P.y = c.y; g.step(3, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); g.step(20, 1 / 30); return { aboard: g.P.car === c, prompt: pr && pr.text }; });
await run('into a building', () => { const g = __pc, c = g.P.car; if (!c) return 'not aboard'; // find a tall block in the city and fly at it
  let best = null; for (let x = 120; x < 700 && !best; x += 6) for (let z = 120; z < 400 && !best; z += 6) { if (!g.pushOutTest(x, z)) continue; const top = g.groundAt(x, z, 200, 's'); if (top > 24) best = { x, z, top }; } if (!best) return 'no tall building';
  c.x = best.x + 120; c.z = best.z; c.y = best.top * .5; c.yaw = -Math.PI / 2 + Math.PI; c.spd = 34; c.thr = .8; c.ptc = 0; c.roll = 0; c.landed = false; c.sink = 0; c.hp = c.spec.hp; let t = 0; for (; t < 30 * 8 && !c.wreck; t++) { g.P.cyaw = c.yaw; g.P.cpitch = 0; g.step(1, 1 / 30); }
  return { block: best, secs: +(t / 30).toFixed(1), wreck: c.wreck, hp: Math.round(c.hp), at: __st(c) }; });
await run('bail out', () => { const g = __pc; if (g.P.car) g.GAME.leaveCar(false); g.step(10, 1 / 30); const c = g.spawnCar('jet', g.RWY.cx, 300, 0, {}); window.__c = c; c.y = 160; c.spd = 50; c.thr = .8; c.landed = false; g.P.x = c.x; g.P.z = c.z; g.P.y = c.y; c.occ[0] = g.P; g.P.car = c; g.P.seat = 0; g.step(5, 1 / 30);
  g.GAME.leaveCar(false); const chute = g.P.chute; let t = 0; for (; t < 30 * 50 && !g.P.onGround; t++) { g.step(1, 1 / 30); if (t % 6 === 0) g.visuals(1 / 30); }
  return { chute, secs: +(t / 30).toFixed(1), player: [Math.round(g.P.x), +g.P.y.toFixed(1), Math.round(g.P.z)], hp: Math.round(g.P.hp), plane: __st(c) }; });
await run('the Starling', () => { const g = __pc, j = g.cars.find(q => q.type === 'jet' && q.home); if (!j) return 'no Starling at the stand'; window.__c = j; const rx = Math.cos(j.yaw), rz = -Math.sin(j.yaw); g.P.chute = 0; g.P.x = j.x + rx * 2.0 - Math.sin(j.yaw) * .9; g.P.z = j.z + rz * 2.0 - Math.cos(j.yaw) * .9; g.P.y = j.y; g.P.vx = g.P.vz = g.P.vy = 0; g.step(4, 1 / 30);
  const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); g.step(20, 1 / 30); if (g.P.car !== j) return { prompt: pr && pr.text, aboard: false };
  __line(j, g.RWY.z1 - 25, 0); g.P.cyaw = 0; g.P.cpitch = 0; const z0 = j.z; __fly(5, ['Space']); const rollAt = __st(j), gr = Math.round(z0 - j.z); __fly(1.5, ['Space', 'KeyS']); __fly(6, ['Space'], () => { g.P.cyaw = 0; g.P.cpitch = .25; });
  return { prompt: pr && pr.text, groundRoll: gr, rollAt, flying: __st(j), mph: Math.round(j.spd * 2.237) }; });
await shot('v10_jet');
await run('buy on the phone', () => { const g = __pc; if (g.P.car) g.GAME.leaveCar(false); g.P.chute = 0; g.P.x = 300; g.P.z = 200; g.P.y = g.groundAt(300, 200, 3, 'p'); g.step(5, 1 / 30); const items = g.airItems().map(i => i.label + (i.cost ? ' $' + i.cost : '') + (i.off ? ' (' + i.sub + ')' : ''));
  const it = g.airItems().find(i => /Mallard/.test(i.label) && i.act); if (!it) return { items }; const c0 = g.P.cash; it.act(); g.step(30, 1 / 30); const mine = g.cars.find(c => c.pa === g.P);
  return { items, paid: Math.round(c0 - g.P.cash), air: g.P.air, delivered: mine ? [mine.type, Math.round(mine.x), Math.round(mine.z), typeof mine.ptc] : null }; });
await run('fly your own', () => { const g = __pc, c = g.cars.find(q => q.pa === g.P); if (!c) return 'none'; window.__c = c; const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); g.P.x = c.x + rx * 1.9; g.P.z = c.z + rz * 1.9; g.P.y = c.y; g.step(4, 1 / 30); const pr = g.findPromptNow(); if (pr && pr.act) pr.act(); g.step(20, 1 / 30);
  if (g.P.car !== c) return { prompt: pr && pr.text }; const x0 = c.x; g.P.cyaw = c.yaw; __fly(2.2, ['Space']); __fly(4, ['ShiftLeft']); const crossed = __st(c); // across the apron and the taxiway
  let t = 0; g.keys.KeyA = true; for (; t < 30 * 12 && Math.abs(((c.yaw % 6.2832) + 6.2832) % 6.2832) > .08 && Math.abs(((c.yaw % 6.2832) + 6.2832) % 6.2832 - 6.2832) > .08; t++) { g.keys.Space = c.spd < 4; g.keys.ShiftLeft = c.spd > 6; g.step(1, 1 / 30); } g.keys.KeyA = g.keys.Space = g.keys.ShiftLeft = false; const turned = __st(c);
  __fly(3.4, ['Space']); __fly(1.2, ['Space', 'KeyS']); __fly(3, ['Space'], () => { g.P.cyaw = 0; g.P.cpitch = .3; });
  return { crossed, turned: [turned.x, turned.z, +c.yaw.toFixed(2), +(t / 30).toFixed(1)], stillMine: c.pa === g.P, flying: __st(c) }; });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
await b.close();
