// graphics stage five: movement. Strides match the ground covered (no skating), a run is not a fast walk, people side-step and lean
// into turns; a car's body dips under braking, squats pulling away, rolls out of a turn and bounces over a kerb; past the tyres' grip
// a car runs wide instead of turning on a coin
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
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(20, 1 / 30); return true; });
// feet: over a stretch of walking or running, how far the planted foot slides compared with the distance covered
const F = await run('strides', () => { const g = __pc, c = g.meChar, out = {}, foot = new THREE.Vector3();
  for (const [name, spd] of [['walk', 1.4], ['jog', 3.2], ['run', 5.5]]) { let x = 300; const yaw = Math.PI / 2, dt = 1 / 60, rec = [];
    for (let i = 0; i < 240; i++) { x -= spd * dt; g.poseChar(c, { x, y: .15, z: 103, yaw, pitch: 0, spd, air: false, wpn: 'fist', aim: 0, dead: -1, act: 0 }, dt);
      rec.push([0, 1].map(k => { c.rig.kn[k].updateMatrixWorld(true); return foot.set(0, -.44, .05).applyMatrix4(c.rig.kn[k].matrixWorld).clone(); })); }
    // a foot is on the ground when it is within 3 cm of the lowest it gets; while it is, how far does it slide?
    const minY = Math.min(...rec.slice(60).map(f => Math.min(f[0].y, f[1].y))); let slide = 0, n = 0;
    for (let i = 61; i < rec.length; i++) { const k = rec[i][0].y < rec[i][1].y ? 0 : 1; if (rec[i][k].y < minY + .03 && rec[i - 1][k].y < minY + .03) { slide += Math.abs(rec[i][k].x - rec[i - 1][k].x); n++; } }   // the lower foot, when it is down
    out[name] = { slidePerM: +(slide / Math.max(1, n) / (spd * dt)).toFixed(2), grounded: n }; }
  return out; });
expect('feet stay planted while they carry the weight (slide well under the ground speed)', F && F.walk.slidePerM < .25 && F.jog.slidePerM < .25 && F.run.slidePerM < .35);
const C = await run('a car body on its springs', () => { const g = __pc, c = g.spawnCar('sedan', 160, 98.6, -Math.PI / 2); g.P.car = null; const dt = 1 / 30;   // facing east along the road
  const drive = (thr, steer, n) => { let mn = 1, mx = -1, mnr = 1, mxr = -1; for (let i = 0; i < n; i++) { c.occ[0] = g.P; c.inp.thr = thr; c.inp.steer = steer; c.inp.hb = false; g.stepCar(c, dt, c.inp); g.visuals(dt); mn = Math.min(mn, c.dive); mx = Math.max(mx, c.dive); mnr = Math.min(mnr, c.roll); mxr = Math.max(mxr, c.roll); } return { mn, mx, mnr, mxr }; };
  const go = drive(1, 0, 40), brake = drive(-1, 0, 25); c.vx = 16; c.vz = 0; drive(0, 0, 8); const right = drive(.4, 1, 20);
  // a hard corner at speed: how tight could it go?
  c.vx = 30; c.vz = 0; c.yaw = -Math.PI / 2; c.yawRate = 0; let yrMax = 0; for (let i = 0; i < 20; i++) { c.inp.thr = .3; c.inp.steer = 1; g.stepCar(c, dt, c.inp); yrMax = Math.max(yrMax, Math.abs(c.yawRate)); }
  c.occ[0] = null; g.removeCar(c);
  return { squat: +go.mn.toFixed(3), dive: +brake.mx.toFixed(3), rollRight: +right.mnr.toFixed(3), latG: +(yrMax * 30 / 9.81).toFixed(2) }; });
expect('nose up pulling away, nose down braking', C && C.squat < -.005 && C.dive > .01);
expect('turning right, the body rolls onto its left (outside) side', C && C.rollRight < -.005);
expect('at 30 m/s the tyres hold about two and a half g, not ten', C && C.latG > 1.5 && C.latG < 3.6);
await p.evaluate(() => { const g = __pc; for (let i = 0; i < 4; i++) g.visuals(1 / 30); g.draw(); });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? fails + ' FAILED' : 'ALL OK');
await b.close();
