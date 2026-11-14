// graphics stage seven: performance. Only the character slots in use are drawn (no empty slots, no gun nobody holds); dynamic
// resolution steps down when the frame rate cannot keep up and back up when it can; a frame stays inside its draw-call and triangle budget
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
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(60, 1 / 30); g.G.tod = 14; for (let i = 0; i < 4; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); } return true; });
// a few crews' people with their guns out, then: does every part draw exactly the people who show it?
const S = await run('slots drawn', () => { const g = __pc; for (let i = 0; i < 6; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); }
  const id = Object.keys(g.GUNMESH).find(k => k !== 'glocks'), c = g.meChar; for (let i = 0; i < 30; i++) g.poseChar(c, { x: g.P.x, y: g.P.y, z: g.P.z, yaw: 0, pitch: 0, spd: 0, wpn: id, aim: 1, dead: -1 }, 1 / 30); g.flushChars();   // our own figure, gun up
  const shown = g.chars.filter(c => c.shown), far = shown.filter(c => !c.det).length, guns = {}; let gunOk = true, held = 0;
  for (const id in g.GUNMESH) { const n = shown.filter(c => c.gun === id).length; held += n; guns[id] = [g.GUNMESH[id].count, n]; if (g.GUNMESH[id].count !== n) gunOk = false; }
  let tris = 0, cap = 0; for (const k in g.CP) { const m = g.CP[k], t = (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; tris += t * m.count; cap += t * m.instanceMatrix.count; }
  return { people: shown.length, far, pelvis: g.CP.pelvis.count, gunOk, held, tris, cap }; });
expect('the far figure is drawn once per far person, each gun once per person holding it', S && S.pelvis === S.far && S.gunOk && S.held > 0);
expect('the people cost a fraction of what every slot would', S && S.tris < S.cap * .5);
// dynamic resolution, driven with made-up frame rates: a machine whose frame rate follows the number of pixels (30 fps at full size),
// then one capped at 30 whatever the size (battery saving)
const D = await run('dynamic resolution', () => { const g = __pc, out = {}; const reset = () => { g.GFX.scale = 1; Object.assign(g.DRS, { ceil: 1, upAt: -99, off: false, floorT: 0, lowT: 0, highT: 0, f0: 0 }); };
  const feed = (sec, fps) => { for (let t = 0; t < sec; t += 1 / 60) g.drsTick(1 / 60, typeof fps === 'function' ? fps(g.GFX.scale) : fps); return g.GFX.scale; };
  reset(); out.fill = [feed(2, s => 30 / (s * s)), feed(4, s => 30 / (s * s)), feed(30, s => 30 / (s * s)), g.DRS.ceil];
  reset(); out.capped = [feed(2, 30), feed(8, 30), feed(10, 30), g.DRS.off];
  g.applyQuality(true); out.reset = [g.GFX.scale, g.DRS.off]; return out; });
expect('a slow machine settles on the biggest picture it can hold (70%) and does not keep trying 80%; a capped one goes back to full size; new settings start over',
  D && D.fill[0] === .9 && D.fill[1] === .7 && D.fill[2] === .7 && D.fill[3] === .7 && D.capped[0] === .9 && D.capped[1] === .6 && D.capped[2] === 1 && D.capped[3] === true && D.reset[0] === 1 && D.reset[1] === false);
// the frame budget on High and on Low (every pass: shadow map, the scene, the effects)
const B = await run('frame budget', () => { const g = __pc, I = g.renderer.info, out = {}; I.autoReset = false;
  for (const pr of ['high', 'low']) { g.setPreset(pr, false); for (let i = 0; i < 3; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); g.draw(); } I.reset(); g.draw(); out[pr] = { calls: I.render.calls, tris: I.render.triangles }; }
  I.autoReset = true; g.setPreset('high', false); return out; });
expect('High stays under 560 draw calls and 850k triangles a frame; Low under 400 and 500k', B && B.high.calls < 560 && B.high.tris < 850000 && B.low.calls < 400 && B.low.tris < 500000);
console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 6).join('\n') : 'no page errors'); if (errs.length) fails++;
console.log(fails ? fails + ' FAILED' : 'ALL OK');
await b.close(); process.exit(fails ? 1 : 0);
