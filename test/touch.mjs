// touch controls in a phone-sized landscape viewport: layout, stick, look, fire, driving, editing the layout, portrait hint
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname, W = +(process.argv[2] || 844), H = +(process.argv[3] || 390);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage(), errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { if (!sessionStorage.getItem('cleared')) { localStorage.clear(); sessionStorage.setItem('cleared', '1'); } } catch (e) {} });
await p.goto('file://' + ROOT + 'dist/claude.html'); await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 6; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };
// a finger on the touch layer, by pointer events
await p.evaluate(() => { window.__touch = (type, id, x, y) => { const el = document.elementFromPoint(x, y) || document.getElementById('touch'); el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true })); };
  window.__ctr = id => { const r = document.querySelector('.tc-' + id).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; }; });
await run('menu', () => ({ touch: __pc.TOUCH.on, coarse: __pc.TOUCH.coarse, row: !document.getElementById('row-touch').hidden, keys: document.querySelector('.keys').hidden, help: !document.getElementById('touch-help').hidden, gfx: document.getElementById('set-gfx').value }));
await shot('t_menu');
await p.tap('#deploy'); await p.waitForTimeout(300);
await run('playing', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.step(30 * 3, 1 / 30); const vis = [...document.querySelectorAll('.tc')].filter(e => e.offsetParent !== null).map(e => e.dataset.tc); return { state: g.G.state, layer: !document.getElementById('touch').hidden, cls: document.getElementById('touch').className, vis }; });
await shot('t_foot');
// overlaps between the controls that show together, and with the HUD blocks
await run('overlaps', () => { for (let i = 0; i < 3; i++) __pc.visuals(1 / 30); const box = e => e.getBoundingClientRect(), hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const out = []; ['foot', 'car'].forEach(m => { document.getElementById('touch').className = m + ' call'; const els = [...document.querySelectorAll('.tc')].filter(e => getComputedStyle(e).display !== 'none'), hud = ['radar', 'h-right', 'turf'].map(id => [id, box(document.getElementById(id))]);
    els.forEach((a, i) => { els.slice(i + 1).forEach(b => { if (hit(box(a), box(b))) out.push(m + ':' + a.dataset.tc + '/' + b.dataset.tc); }); hud.forEach(h => { if (hit(box(a), h[1])) out.push(m + ':' + a.dataset.tc + '/' + h[0]); }); }); });
  return out; });
// stick forward: the player walks off along the camera's forward
await run('stick', async () => { const g = __pc, s = __ctr('stick'), x0 = g.P.x, z0 = g.P.z; __touch('pointerdown', 7, s[0], s[1]); __touch('pointermove', 7, s[0], s[1] - s[2] * .45); g.step(45, 1 / 30); const fy = g.TOUCH.fy, moved = Math.hypot(g.P.x - x0, g.P.z - z0), sprint = g.P.sprint;
  __touch('pointerup', 7, s[0], s[1] - s[2] * .45); return { fy: +fy.toFixed(2), moved: +moved.toFixed(1), sprint, after: g.TOUCH.fy }; });
await run('look', () => { const g = __pc, y0 = g.P.cyaw, x = innerWidth * .6, y = innerHeight * .4; __touch('pointerdown', 8, x, y); __touch('pointermove', 8, x + 80, y + 20); __touch('pointerup', 8, x + 80, y + 20); return { dyaw: +(g.P.cyaw - y0).toFixed(3), pitch: +g.P.cpitch.toFixed(3) }; });
await run('fire', () => { const g = __pc, f = __ctr('fire'), shots = g.P.shots; __touch('pointerdown', 9, f[0], f[1]); const down = g.mouse.down; g.step(20, 1 / 30); __touch('pointerup', 9, f[0], f[1]); return { down, up: g.mouse.down, shots: g.P.shots - shots }; });
await run('aim', () => { const g = __pc; g.step(2, 1 / 30); for (let i = 0; i < 3; i++) g.visuals(1 / 30); const a = __ctr('aim'), hitEl = document.elementFromPoint(a[0], a[1]); window.__hit = hitEl ? hitEl.className || hitEl.id : null; __touch('pointerdown', 10, a[0], a[1]); __touch('pointerup', 10, a[0], a[1]); const on = g.mouse.right; g.step(10, 1 / 30); const ads = g.P.ads; __touch('pointerdown', 10, a[0], a[1]); __touch('pointerup', 10, a[0], a[1]); return { hit: window.__hit, at: a.map(Math.round), on, ads: +ads.toFixed(2), off: g.mouse.right }; });
// a car: USE gets in, the stick drives and steers
await run('car', () => { const g = __pc, c = g.cars.filter(c => !c.occ[0] && !c.wreck && !c.cop).sort((p, q) => Math.hypot(p.x - g.P.x, p.z - g.P.z) - Math.hypot(q.x - g.P.x, q.z - g.P.z))[0];
  g.P.x = c.x - Math.cos(c.yaw) * 2; g.P.z = c.z + Math.sin(c.yaw) * 2; g.P.y = c.y; g.step(3, 1 / 30); for (let i = 0; i < 6; i++) g.visuals(1 / 30); const u = __ctr('use'), lit = document.querySelector('.tc-use').classList.contains('go');
  __touch('pointerdown', 11, u[0], u[1]); __touch('pointerup', 11, u[0], u[1]); g.step(30, 1 / 30); for (let i = 0; i < 3; i++) g.visuals(1 / 30); return { lit, inCar: g.P.car === c, cls: document.getElementById('touch').className, label: document.querySelector('.tc-use').textContent }; });
await run('drive', () => { const g = __pc, c = g.P.car; if (!c) return 'no car'; const s = __ctr('stick'), gas = __ctr('gas'); __touch('pointerdown', 12, gas[0], gas[1]); __touch('pointerdown', 13, s[0], s[1]); __touch('pointermove', 13, s[0] + s[2] * .08, s[1]); g.step(60, 1 / 30);
  const sp = Math.hypot(c.vx, c.vz), steer = c.steer; __touch('pointerup', 12, gas[0], gas[1]); __touch('pointerup', 13, s[0], s[1]); return { speed: +sp.toFixed(1), steer: +steer.toFixed(2), thr: c.inp.thr }; });
await shot('t_car');
await run('exit', () => { const g = __pc, u = __ctr('use'); __touch('pointerdown', 14, u[0], u[1]); __touch('pointerup', 14, u[0], u[1]); g.step(10, 1 / 30); for (let i = 0; i < 3; i++) g.visuals(1 / 30); return { inCar: !!g.P.car, cls: document.getElementById('touch').className }; });
await run('map', () => { const g = __pc, m = __ctr('map'); __touch('pointerdown', 15, m[0], m[1]); __touch('pointerup', 15, m[0], m[1]); const open = !document.getElementById('bigmap').hidden; document.getElementById('bigmap').click(); return { open, closed: document.getElementById('bigmap').hidden }; });
// pause, then move the buttons
await run('pause', () => { const g = __pc, q = __ctr('pause'); __touch('pointerdown', 16, q[0], q[1]); __touch('pointerup', 16, q[0], q[1]); return { state: g.G.state, row: !document.getElementById('row-touch').hidden, save: document.getElementById('row-save').hidden }; });
await p.tap('#te-open'); await p.waitForTimeout(200);
await run('edit', () => { const g = __pc, f = __ctr('fire'); __touch('pointerdown', 20, f[0], f[1]); const L = document.getElementById('touch'); L.dispatchEvent(new PointerEvent('pointermove', { pointerId: 20, pointerType: 'touch', clientX: f[0] - 120, clientY: f[1] - 60, bubbles: true })); L.dispatchEvent(new PointerEvent('pointerup', { pointerId: 20, pointerType: 'touch', clientX: f[0] - 120, clientY: f[1] - 60, bubbles: true })); const after = __ctr('fire'), s = document.getElementById('te-size'); s.value = '0.3'; s.dispatchEvent(new Event('input')); const big = __ctr('fire');
  return { moved: [Math.round(after[0] - f[0]), Math.round(after[1] - f[1])], size: [Math.round(f[2]), Math.round(big[2])], sel: document.querySelector('.tc.sel').dataset.tc, overlay: document.getElementById('overlay').hidden, panel: !document.getElementById('tedit').hidden }; });
await shot('t_edit');
await p.tap('#te-ctx'); await p.waitForTimeout(100); await shot('t_edit_car');
await p.tap('#te-done'); await p.waitForTimeout(100);
await run('saved', () => ({ cfg: JSON.parse(localStorage.getItem('pc-touch') || 'null'), overlay: !document.getElementById('overlay').hidden }));
await p.reload(); await p.waitForTimeout(1500);
await run('after reload', () => ({ fire: __pc.tPlace('fire').map(Math.round), cfg: localStorage.getItem('pc-touch') }));
await p.setViewportSize({ width: H, height: W }); await p.waitForTimeout(300);
await run('portrait', () => ({ rotate: getComputedStyle(document.getElementById('rotate')).display }));
await p.screenshot({ path: '/tmp/t_portrait.png' });
console.log([...new Set(errs)].slice(0, 12).join('\n') || 'no errors');
await b.close();
