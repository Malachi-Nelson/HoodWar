// graphics stage six: the city going about its day. People wait for the walk signal at signalled crossings; shops have people going
// in and coming out; an ambulance comes for someone down in the street, stops by them, takes them and leaves; building work
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
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.G.cops = false; g.startWorld(); g.beginPlay(); g.step(30, 1 / 30); g.G.tod = 13; return true; });
const W = await run('the walk signal', () => { const g = __pc, S = g.SIGNALS[0]; let right = 0, wrong = 0;
  for (let t = 0; t < 32; t += .5) { g.G.tod = (t - S.off) / 100 + 24 * 0; const ew = g.signalPhase(S, 1, g.sigClock()) === 0, ns = g.signalPhase(S, 0, g.sigClock()) === 0;
    const across = g.walkWait({ x: S.x + 8.25, z: S.z + 8.25 }, { x: S.x - 8.25, z: S.z + 8.25 }), along = g.walkWait({ x: S.x + 8.25, z: S.z + 8.25 }, { x: S.x + 8.25, z: S.z - 8.25 });
    if (across === !ew && along === !ns) right++; else wrong++; }
  g.G.tod = 13; return { right, wrong }; });
expect('crossing the north-south road waits for the east-west green, and the other way about', W && W.wrong === 0 && W.right > 50);
// over two minutes of the city: does anyone set off over a signalled crossing against the light (when not running for their life)?
const C = await run('people at the crossings', () => { const g = __pc; g.G.civs = 90; let set = 0, against = 0, waited = 0, shopIn = new Set(), vanished = 0; const seenWait = new Set();
  for (let f = 0; f < 30 * 120; f++) { g.step(1, 1 / 30);
    if (f % 3) continue; for (const b of g.bots) { if (b.team !== g.TEAM_CIV || b.dead || b.car || !b.path || b.pi < 1 || b.pi >= b.path.length) continue; if (b.shopIn) shopIn.add(b.id); if (b.vanish) vanished++;
      const a = g.NAV[b.path[b.pi - 1]], m = g.NAV[b.path[b.pi]], dx = m.x - a.x, dz = m.z - a.z, L = Math.hypot(dx, dz); if (L < 10 || L > 22) continue;
      const mx = (a.x + m.x) / 2, mz = (a.z + m.z) / 2, S = g.SIG_AT[Math.round((mx - 10) / 100) + Math.round((mz - 10) / 84) * 16]; if (!S || Math.hypot(mx - S.x, mz - S.z) > 13) continue;
      const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < 1.9 && b.spd < .2 && g.walkWait(a, m)) seenWait.add(b.id);
      if (d > 2.1 && d < 3.2 && !b['x' + b.pi]) { b['x' + b.pi] = 1; set++; if (g.walkWait(a, m) && !(b.fleeT > 0) && (g.signalPhase(S, Math.abs(dx) > Math.abs(dz) ? 1 : 0, g.sigClock() - 3) !== 0)) against++; } } }
  return { setOff: set, against, waited: seenWait.size, shopGoers: shopIn.size }; });
expect('people wait at the kerb for the walk signal', C && C.waited > 0);
expect('nobody sets off against the light (unless fleeing)', C && C.against <= Math.max(0, Math.round(C.setOff * .05)));
expect('people head into shops', C && C.shopGoers > 0);
const D = await run('out of a shop door', () => { const g = __pc, hs = g.humans(); let n = 0, atDoor = 0; for (let k = 0; k < 10; k++) { const b = g.shopOut(hs); if (!b) continue; n++; if (g.FRONTS.some(F => Math.hypot(F.x - b.x, F.z - b.z) < 2.2)) atDoor++; } return { n, atDoor }; });
expect('people come out of shop doors', D && D.n > 0 && D.atDoor === D.n);
const E = await run('an ambulance', () => { const g = __pc; const onWalk = b => { const dx = Math.abs(((b.x - 10) % 100 + 100) % 100), dz = Math.abs(((b.z - 10) % 84 + 84) % 84); return Math.min(dx, 100 - dx) < 11 || Math.min(dz, 84 - dz) < 11; };   // down on a pavement, by a street
  const v = g.bots.find(b => b.team === g.TEAM_CIV && !b.dead && !b.car && onWalk(b) && Math.hypot(b.x - g.P.x, b.z - g.P.z) < 120);
  if (!v) return 'nobody'; for (let f = 0; f < 30 * 90 && g.EMS.list.length; f++) g.step(1, 1 / 30);   // one at a time: let any ambulance already out finish
  v.dead = true; v.deadT = 3; v.hp = 0; const log = []; let near = 1e9, sent = null, E = null;   // follow the first ambulance out after this (someone else killed nearby at the same moment may be the one it comes for)
  for (let f = 0; f < 30 * 150; f++) { g.step(1, 1 / 30); if (f % 5 === 0) g.visuals(1 / 6); if (!E && g.EMS.list.length) { E = g.EMS.list[0]; sent = { paint: E.car.color === 0xf3f1ea, ems: !!E.car.ems, siren: E.car.horn, type: E.car.type, ours: E.v === v }; }
    if (E) { near = Math.min(near, Math.hypot(E.car.x - E.v.x, E.car.z - E.v.z)); if (!log.includes(E.leg)) log.push(E.leg); if (!g.EMS.list.includes(E)) break; } }
  return { sent, legs: log, nearest: Math.round(near), why: E && E.why, bodyGone: E ? !g.bots.includes(E.v) : null, left: E ? !g.EMS.list.includes(E) : null }; });
expect('an ambulance comes with its siren, stops by the body, takes them and goes', E && E.sent && E.sent.ems && E.sent.siren && E.legs.includes(1) && E.legs.includes(2) && (E.nearest < 26 || (E.why === 'held' && E.nearest < 62)) && E.bodyGone);
const FD = await run('past the expressway', () => { const g = __pc, inBlock = q => g.FAR_BL.some(L => q[0] >= L.x0 - .5 && q[2] <= L.x1 + .5 && q[1] >= L.z0 - .5 && q[3] <= L.z1 + .5);
  const nw = g.FAR_B.filter(q => q[1] < g.CITY.d), off = nw.filter(q => !inBlock(q)).length, wet = nw.filter(q => q[0] < g.FAR_LAND.x0 || q[1] < g.FAR_LAND.z0).length;
  const city = g.FAR_BL.filter(L => L.x1 > -6 && L.z1 > -6).length; return { blocks: g.FAR_BL.length, towers: nw.length, off, wet, city }; });
expect('the city goes on past the expressway, its towers in its blocks, none in the water or the town', FD && FD.blocks > 50 && FD.towers > 10 && !FD.off && !FD.wet && !FD.city);
const K = await run('building work', () => { const g = __pc; return { scaffolds: g.SCAFF.length, crane: !!g.CRANE.g }; });
expect('scaffolding and a crane', K && K.scaffolds >= 2 && K.crane);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? fails + ' FAILED' : 'ALL OK');
await b.close();
