// graphics stage three: cars and people up close. Lamps follow what the car is doing; a crash dents the side that was hit and can
// put that end's lamps out; a repair takes the dents out; near cars get the detailed wheels and near people the detailed figure,
// packed so that only those are drawn; on Low neither is drawn
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|404/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { localStorage.clear(); localStorage.setItem('pc-gfx2', JSON.stringify({ preset: 'high' })); } catch (e) {} });
await p.goto('file://' + ROOT + 'dist/claude.html'); await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
let fails = 0; const expect = (what, ok) => { if (!ok) { fails++; console.log('FAIL', what); } };
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30, 1 / 30); g.P.hints = []; return { cars: g.cars.length }; });
// a parked car of our own to drive
const L = await run('lamps', () => { const g = __pc, c = g.spawnCar('sedan', 300, 96.5, Math.PI / 2, { color: 0x8a1f1f }), base = c.slot * 10, col = k => { const v = new THREE.Color(); g.LAMP.mesh.getColorAt(base + k, v); return +(v.r + v.g + v.b).toFixed(2); };
  const frame = () => { g.step(1, 1 / 30); g.visuals(1 / 30); };
  g.G.tod = 13; c.occ[0] = g.P; c.eng = true; c.inp.thr = 0; frame(); frame(); const dayHead = col(0), dayTail = col(2);
  c.vx = -6; c.vz = 0; c.inp.thr = -1; frame(); const brake = col(2);
  c.inp.thr = 0; c.inp.hb = false; c.vx = 0; for (let i = 0; i < 20; i++) frame(); c.vx = 1.5; c.inp.thr = -1; frame(); const rev = col(4), revBrake = col(2);   // rolling backwards on reverse: white lamps, no brake
  g.G.tod = 22; c.inp.thr = 0; c.vx = 0; for (let i = 0; i < 6; i++) frame(); const nightHead = col(0), nightTail = col(2);
  c.occ[0] = null; g.removeCar(c); return { dayHead, dayTail, brake, rev, revBrake, nightHead, nightTail }; });
expect('lamps: off by day, brake lights on braking, white on reversing, head and tail on at night', L && L.dayHead === 0 && L.dayTail === 0 && L.brake > 3 && L.rev > 3 && L.revBrake < 1 && L.nightHead > 5 && L.nightTail > .8 && L.nightTail < L.brake);
// an AI car about to turn shows the indicator on that side
const I = await run('indicators', () => { const g = __pc; g.G.tod = 13; let seen = 0, frames = 0;
  for (let f = 0; f < 30 * 40 && !seen; f++) { g.step(1, 1 / 30); if (f % 2) continue; g.visuals(1 / 15);
    for (const c of g.cars) { if (!c.ai || c.ai.mode !== 'traffic' || c.wreck) continue; const t = g.turnAhead(c); if (!t) continue; frames++; const base = c.slot * 10, k = t > 0 ? 7 : 6, v = new THREE.Color(); g.LAMP.mesh.getColorAt(base + k, v); if (v.r > 1) seen++; } }
  return { turningFrames: frames, blinking: seen }; });
expect('an AI car turning blinks its indicator', I && I.blinking > 0);
// crashes dent the side that was hit
const D = await run('dents', () => { const g = __pc, c = g.spawnCar('coupe', 320, 96.5, Math.PI / 2, { color: 0x1f3f8a }); g.step(1, 1 / 30); g.visuals(1 / 30);
  const v0 = Float32Array.from(c.pm.geometry.attributes.position.array); c.crash = 22; c.hitN = [1, 0]; g.step(1, 1 / 30); g.visuals(1 / 30);   // pushed east: hit from the west, which is its nose
  const v1 = c.pm.geometry.attributes.position.array; let moved = 0, maxd = 0; for (let i = 0; i < v1.length; i += 3) { const d = Math.hypot(v1[i] - v0[i], v1[i + 1] - v0[i + 1], v1[i + 2] - v0[i + 2]); if (d > .01) moved++; maxd = Math.max(maxd, d); }
  g.G.tod = 22; c.occ[0] = g.P; c.eng = true; g.step(1, 1 / 30); g.visuals(1 / 30); const v = new THREE.Color(); g.LAMP.mesh.getColorAt(c.slot * 10, v); const headOut = v.r + v.g + v.b < .01; c.occ[0] = null;
  const dent = c.dent.map(x => +x.toFixed(2)), shared = c.pm.geometry !== c.geo.paint; g.undentCar(c); const back = c.pm.geometry === c.geo.paint; g.removeCar(c); return { dent, moved, maxd: +maxd.toFixed(2), headOut, shared, repaired: back }; });
expect('a hard knock on the nose dents the front, not the sides', D && D.dent[0] > .5 && D.dent[1] === 0 && D.dent[2] === 0 && D.dent[3] === 0 && D.moved > 10 && D.maxd > .1);
expect('smashed front: headlights out at night', D && D.headOut);
expect('a repair takes the dents out', D && D.shared && D.repaired);
// level of detail: only the near ones drawn in detail, none on Low
const N = await run('near detail', () => { const g = __pc; g.G.tod = 13; for (let i = 0; i < 4; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); }
  const hi = { people: g.CPD.head.count, wheels: g.wheelNear.tire.count, cars: g.cars.length, nearCars: g.cars.filter(c => Math.hypot(c.x - g.camera.position.x, c.z - g.camera.position.z) < 58 && !c.spec.air).length };
  g.setPreset('low', false); for (let i = 0; i < 3; i++) g.visuals(1 / 30); const lo = { people: g.CPD.head.count, wheels: g.wheelNear.tire.count };
  g.setPreset('high', false); g.visuals(1 / 30); return { hi, lo }; });
expect('detail drawn only for near people and cars, and not on Low', N && N.hi.people >= 1 && N.hi.people < 60 && N.hi.wheels === N.hi.nearCars * 4 && N.lo.people === 0 && N.lo.wheels === 0);
await p.evaluate(() => { const g = __pc; g.G.tod = 21.5; for (let i = 0; i < 6; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); } g.draw(); });
await p.screenshot({ path: '/tmp/v15_night.png' });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? fails + ' FAILED' : 'ALL OK');
await b.close();
