// graphics stage four: wet weather. Rain swells and eases inside a spell of rain (the same on every machine); the ground's lit
// materials carry the puddle shader and the tree crowns the wind; splashes fall round you in the rain (not on Low); drops gather
// on the lens out in a storm and not in a car; wet ground marks itself as a mirror for the street reflections (High and up)
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
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30, 1 / 30); g.P.hints = []; return true; });
const S = await run('rain comes and goes', () => { const g = __pc, out = []; for (let h = 0; h < 6; h += .05) { g.G.tod = 13 + h; out.push(g.rainSwell()); } return { min: +Math.min(...out).toFixed(2), max: +Math.max(...out).toFixed(2) }; });
expect('the swell runs from a drizzle to a downpour', S && S.min < .15 && S.max > .85);
const M = await run('shaders in place', () => { const g = __pc, asph = g.MATS.asphalt.pbr, fol = g.MATS.foliage.pbr; return { puddle: asph.onBeforeCompile === g.puddleCompile, sway: fol.onBeforeCompile === g.swayCompile, ssr: !!(g.POST.grade.defines.USE_SSR), drops: !!g.POST.grade.uniforms.dropAmt }; });
expect('puddle shader on the ground, wind on the trees, street reflections on High', M && M.puddle && M.sway && M.ssr && M.drops);
const W = await run('a storm on foot, then in a car', () => { const g = __pc; g.G.tod = 22; g.WX.k = 3; g.WX.next = g.G.time + 999; Object.assign(g.WX, { cloud: 1, rain: 1, wet: 1, wind: 1 });
  g.P.x = 160; g.P.z = 99; g.P.y = g.groundAt(160, 99, 3, 'p'); for (let i = 0; i < 90; i++) { g.step(1, 1 / 30); Object.assign(g.WX, { rain: 1, wet: 1 }); g.visuals(1 / 30); }
  const lensOut = +g.LENS.amt.toFixed(2), splashOn = g.splashMesh.visible, live = Array.from(g.splashMesh.geometry.attributes.at.array).filter((v, i) => i % 4 === 3 && v > g.G.time % 600 - .4).length;
  // the wet road marks itself as a mirror: read the frame's alpha straight under the camera's gaze down the road
  g.camera.position.set(160, 1.6, 97); g.camera.rotation.order = 'YXZ'; g.camera.rotation.set(-.35, -1.62, 0); g.camera.updateMatrixWorld(); g.draw();
  const rt = g.POST.scene, buf = new Uint16Array(4); g.renderer.readRenderTargetPixels(rt, rt.width >> 1, rt.height >> 2, 1, 1, buf);
  const half = h => { const s = h >> 15, e = (h >> 10) & 31, f = h & 1023; return (s ? -1 : 1) * (e ? Math.pow(2, e - 15) * (1 + f / 1024) : Math.pow(2, -14) * f / 1024); }, alpha = +half(buf[3]).toFixed(2);
  const c = g.spawnCar('sedan', 162, 96.5, Math.PI / 2); g.P.car = c; c.occ[0] = g.P; for (let i = 0; i < 150; i++) { g.step(1, 1 / 30); g.P.car = c; Object.assign(g.WX, { rain: 1, wet: 1 }); g.visuals(1 / 30); } const lensCar = +g.LENS.amt.toFixed(2); g.P.car = null; c.occ[0] = null; g.removeCar(c);
  return { lensOut, lensCar, splashOn, live, alpha }; });
expect('drops gather on the lens out in a storm, and clear in a car', W && W.lensOut > .3 && W.lensCar < .1);
expect('splashes falling', W && W.splashOn && W.live > 20);
expect('the wet road marks itself as a mirror', W && W.alpha < .95 && W.alpha >= 0);
const L = await run('Low', () => { const g = __pc; g.setPreset('low', false); for (let i = 0; i < 4; i++) { g.step(1, 1 / 30); g.visuals(1 / 30); } const r = { splashOn: g.splashMesh.visible }; g.setPreset('high', false); return r; });
expect('no splashes on Low', L && !L.splashOn);
await p.evaluate(() => { const g = __pc; for (let i = 0; i < 4; i++) g.visuals(1 / 30); g.draw(); });
await p.screenshot({ path: '/tmp/v16_storm.png' });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? fails + ' FAILED' : 'ALL OK');
await b.close();
