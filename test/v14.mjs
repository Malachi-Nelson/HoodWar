// graphics stage two: the dressed city. Signals cycle and the traffic stops for them; the stop signs at signalled corners are gone;
// the fine detail comes and goes with distance and preset; the ground has its relief maps on the lit presets and not on Low
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
const s = await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(60, 1 / 30); g.P.hints = [];
  const S = g.SIGNALS[0], cyc = []; for (let t = 0; t < 32; t += 2) cyc.push(g.signalPhase(S, 0, t - S.off) + '' + g.signalPhase(S, 1, t - S.off));
  const poles = []; g.SIGNALS.forEach(S => [[1, -1], [-1, 1], [1, 1], [-1, -1]].forEach(c => poles.push([S.x + c[0] * 7, S.z + c[1] * 7])));
  const signsLeft = g.PROPS.filter(p => p.type === 'sign' && poles.some(q => Math.hypot(q[0] - p.x, q[1] - p.z) < 1.6)).length;
  return { signals: g.SIGNALS.length, lamps: g.SIG_LAMPS.length, cycle: cyc.join(' '), signsLeft, chunks: g.DETAIL.list.length, asphaltN: !!g.MATS.asphalt.pbr.normalMap, facadeN: !!g.MATS.brick.pbr.normalMap, propIdx: g.PROPS.every((p, i) => p.i === i) }; });
expect('signals exist', s && s.signals >= 10 && s.lamps === s.signals * 20);
expect('a full cycle: NS green, amber, all red, EW green, amber, all red', s && /^02 02 02 02 02 02 12 12 20 20 20 20 20 20 21 21$/.test(s.cycle));
expect('no stop signs left at signalled corners', s && s.signsLeft === 0);
expect('prop indices still match', s && s.propIdx);
expect('relief maps on the ground and walls (High)', s && s.asphaltN && s.facadeN);
// traffic and signals: every crossing of a stop line by a traffic car, and the light it crossed on
const t = await run('traffic at the lights', () => { const g = __pc, seen = new Map(); let green = 0, amber = 0, red = 0, fled = 0, waits = 0, honks = 0; const reds = [], scared = new Map(); g.G.traffic = 16;
  for (let f = 0; f < 30 * 150; f++) { g.step(1, 1 / 30);
    for (const c of g.cars) { const A = c.ai; if (!A || A.mode !== 'traffic' || c.wreck || !A.to || !g.SIG_AT[A.to[0] + A.to[1] * 16]) continue;
      const ax = g.RX(A.from[0]), az = g.RZ(A.from[1]), bx = g.RX(A.to[0]), bz = g.RZ(A.to[1]), L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, sv = (c.x - ax) * dx + (c.z - az) * dz, toStop = L - 11 - c.spec.len / 2 - sv;
      if (A.panic > 0) scared.set(c.id, f); const key = c.id + ':' + A.from + '>' + A.to, prev = seen.get(key); seen.set(key, toStop);
      if (prev !== undefined && prev > 0 && toStop <= 0 && Math.abs(toStop - prev) < 3) { const ph = g.signalAhead(A.from, A.to); if (ph === 0) green++; else if (ph === 1) amber++; else if (f - (scared.get(c.id) || -999) < 90) fled++; else { red++; if (reds.length < 6) reds.push({ v: +Math.hypot(c.vx, c.vz).toFixed(1), panic: +A.panic.toFixed(1), red: A.red, rev: +A.rev.toFixed(1), q: A.q, t: +(g.sigClock() + g.SIG_AT[A.to[0] + A.to[1] * 16].off).toFixed(1) % 32 }); } }
      if (A.red && Math.hypot(c.vx, c.vz) < .3) waits++; if (c.horn) honks++; } }
  return { green, amber, red, fled, reds, waitFrames: waits, honkFrames: honks, cars: g.cars.filter(c => c.ai && c.ai.mode === 'traffic').length }; });
expect('traffic crosses on green, and waits at reds', t && t.green >= 5 && t.waitFrames > 100);
expect('nobody runs a red unless fleeing gunfire', t && t.red <= Math.max(1, Math.round(t.green * .04)));
// fine detail: drawn near the camera, left out far off, and not at all on Low
const d = await run('detail by distance and preset', () => { const g = __pc; g.camera.position.set(260, 2, 100); g.detailTick(); const near = g.DETAIL.list.filter(q => q.m.visible).length;
  g.camera.position.set(-2000, 2, -2000); g.detailTick(); const far = g.DETAIL.list.filter(q => q.m.visible).length;
  g.setPreset('low', false); g.camera.position.set(260, 2, 100); g.detailTick(); const low = g.DETAIL.list.filter(q => q.m.visible).length; const lowN = !!(g.MATS.asphalt.low.userData.nrm);
  g.setPreset('high', false); g.detailTick(); return { near, far, low, total: g.DETAIL.list.length, lowN }; });
expect('detail: near on, far off, Low off', d && d.near > 0 && d.near < d.total && d.far === 0 && d.low === 0);
await p.evaluate(() => { const g = __pc; g.G.tod = 21; for (let i = 0; i < 4; i++) g.visuals(1 / 30); g.draw(); });
await p.screenshot({ path: '/tmp/v14_night.png' });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? fails + ' FAILED' : 'ALL OK');
await b.close();
