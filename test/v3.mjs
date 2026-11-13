// solo checks for the territory, notoriety, events and progress systems, run on a manual clock
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { localStorage.clear(); } catch (e) {} });
await p.goto('file://' + ROOT + 'dist/claude.html');
await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 6; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };

await run('start', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 5, 1 / 30);
  return { hood: g.HOOD.map(r => r.join('')).join(' '), ctrl: g.ZS.map(s => s.owner + ':' + Math.round(s.ctrl)).join(' '), cash: g.P.cash, street: g.bots.filter(b => b.street).length }; });
await run('events start', () => { const g = __pc, out = {}; ['truck', 'hit', 'war', 'chop', 'stash', 'race'].forEach(k => { let ok = false; for (let i = 0; i < 8 && !ok; i++) ok = g.EV_START[k](); out[k] = ok; });
  return { out, evts: g.EVTS.map(E => E.k + '#' + E.id + '@' + Math.round(E.x) + ',' + Math.round(E.z)), feed: document.getElementById('feed').textContent.slice(-300) }; });
await run('wire', () => { const g = __pc; return JSON.stringify(g.EVTS.length) + ' ' + JSON.stringify(window.__pc.EVTS.map(E => [E.k, Math.round(E.until - g.G.time)])); });
// the truck: shoot it until the back opens, then pick up the cash
await run('truck', () => { const g = __pc, E = g.EVTS.find(e => e.k === 'truck'); if (!E) return 'none'; const c = E.car, cash0 = g.P.cash;
  for (let i = 0; i < 60 && !c.opened; i++) g.damageCar(c, 120, g.P);
  const opened = c.opened, bags = E.cash.length, heat = g.P.heat; g.step(30, 1 / 30);
  E.cash.slice().forEach(q => { g.P.x = q.x; g.P.z = q.z; g.P.y = q.y; g.step(4, 1 / 30); });
  g.step(30, 1 / 30); return { opened, bags, heat, gained: g.P.cash - cash0, ended: !g.EVTS.includes(E), guards: g.bots.filter(b => b.name === 'Guard').map(b => b.car ? 'car' : 'foot').join(',') }; });
// the hit: drop the lieutenant
await run('hit', () => { const g = __pc, E = g.EVTS.find(e => e.k === 'hit'); if (!E) return 'none'; const cash0 = g.P.cash, zi = E.zone, c0 = g.ZS[zi].ctrl, b = E.boss;
  g.damageBot(b, 999, false, g.P, 'rifle'); g.step(10, 1 / 30);
  return { dead: b.dead, ended: !g.EVTS.includes(E), gained: g.P.cash - cash0, ctrl: [Math.round(c0), Math.round(g.ZS[zi].ctrl)], gn: g.P.gn.map(Math.round), guards: E.guards.length }; });
// the hood war: kill every attacker
await run('war', () => { const g = __pc, E = g.EVTS.find(e => e.k === 'war'); if (!E) return 'none'; const cash0 = g.P.cash; g.step(30 * 4, 1 / 30);
  const seen = E.bots.map(b => b.car ? 'car' : 'foot').join(','); E.bots.forEach(b => { if (!b.dead) g.damageBot(b, 999, false, g.P, 'rifle'); }); g.step(10, 1 / 30);
  return { seen, ended: !g.EVTS.includes(E), gained: g.P.cash - cash0, zone: g.ZONES[E.zone].name, owner: g.ZS[E.zone].owner }; });
// the chop shop: drive the car in
await run('chop', () => { const g = __pc, E = g.EVTS.find(e => e.k === 'chop'); if (!E) return 'none'; const c = E.car, cash0 = g.P.cash;
  g.P.x = c.x - Math.cos(c.yaw) * 2; g.P.z = c.z + Math.sin(c.yaw) * 2; g.P.y = c.y; const o = g.carOffer(c); g.tryEnter(c, o); g.step(30, 1 / 30); const inCar = g.P.car === c;
  c.x = g.CHOP.x; c.z = g.CHOP.z; c.vx = c.vz = 0; g.step(8, 1 / 30);
  return { offer: o && o.text, inCar, ended: !g.EVTS.includes(E), gained: g.P.cash - cash0, car: !!g.cars.includes(c), pcar: !!g.P.car }; });
// the stash: pick it up, walk it home
await run('stash', () => { const g = __pc, E = g.EVTS.find(e => e.k === 'stash'); if (!E) return 'none'; const cash0 = g.P.cash, bag = E.bag;
  g.P.x = bag.x; g.P.z = bag.z; g.P.y = bag.y; g.step(6, 1 / 30); const carrier = E.carrier === g.P;
  const y = g.SPAWNS[g.G.crew][0]; g.P.x = y.x; g.P.z = y.z; g.P.y = .15; g.step(8, 1 / 30);
  return { carrier, ended: !g.EVTS.includes(E), gained: g.P.cash - cash0, gn: g.P.gn.map(Math.round) }; });
// the race: drive into the ring, then through every checkpoint
await run('race', () => { const g = __pc, E = g.EVTS.find(e => e.k === 'race'); if (!E) return 'none'; const cash0 = g.P.cash;
  if (g.P.car) g.GAME.leaveCar(false); const c = g.spawnCar('sport', E.x, E.z, 0, {}); g.P.x = c.x - Math.cos(c.yaw) * 2; g.P.z = c.z + Math.sin(c.yaw) * 2; g.P.y = c.y; g.tryEnter(c, g.carOffer(c)); g.step(30, 1 / 30);
  const on = g.RACE.on, n = g.RACE.cps.length, t0 = g.RACE.left; g.RACE.cps.forEach(cp => { c.x = cp[0]; c.z = cp[1]; c.vx = c.vz = 0; g.step(3, 1 / 30); });
  return { inCar: !!g.P.car, on, n, t0: Math.round(t0), won: !g.RACE.on, gained: g.P.cash - cash0 }; });
await shot('v3_events');
// notoriety: drop five of one rival crew and wait for the hit squad
await run('notoriety', () => { const g = __pc; if (g.P.car) g.GAME.leaveCar(false); const t = (g.G.crew + 1) % 4; let n = 0;
  g.bots.filter(b => b.team === t && !b.dead).slice(0, 5).forEach(b => { g.damageBot(b, 999, false, g.P, 'rifle'); n++; });
  const gn = g.P.gn[t], sk = g.skullsOf(gn); for (let i = 0; i < 6; i++) g.step(30, 1 / 30);
  const squad = g.cars.filter(c => c.squad === g.P).map(c => ({ team: c.team, occ: c.occ.filter(o => o).length, mode: c.ai && c.ai.mode, d: Math.round(Math.hypot(c.x - g.P.x, c.z - g.P.z)) }));
  g.step(30 * 20, 1 / 30); const later = g.cars.filter(c => c.squad === g.P).map(c => Math.round(Math.hypot(c.x - g.P.x, c.z - g.P.z)));
  return { killed: n, gn: Math.round(gn), skulls: sk, squad, later, hud: document.getElementById('h-gang').textContent, hp: Math.round(g.P.hp) }; });
// hourly income and hold
await run('hourly', () => { const g = __pc, cash0 = g.P.cash, own = g.ZS.filter(s => s.owner === g.G.crew).length; g.G.tod = Math.floor(g.G.tod) + .995; g.step(30 * 2, 1 / 30); return { own, hourly: g.hourlyNow(), gained: g.P.cash - cash0, feed: document.getElementById('feed').textContent.slice(-120) }; });
await run('hold', () => { const g = __pc, zi = g.ZS.findIndex(s => s.owner >= 0 && s.owner !== g.G.crew), owner = g.ZS[zi].owner, z = g.ZONES[zi]; const c0 = g.ZS[zi].ctrl;
  for (let k = 0; k < 20; k++) g.GAME.hurtHood(zi, g.P, 6); g.step(5, 1 / 30); return { zone: z.name, owner, ctrl: [Math.round(c0), Math.round(g.ZS[zi].ctrl)], feed: document.getElementById('h-banner').textContent }; });
// progress: the save holds the city; a code goes there and back; time away pays
await run('save', () => { const g = __pc; g.saveGame(); const s = g.loadSave(), code = g.saveCode(), d = g.readCode(code), bad = g.readCode(code.slice(0, -2) + 'zz');
  return { c: s.c, w: s.w, z: s.z && s.z.length, cr: s.cr, codeLen: code.length, round: d && d.c === s.c && JSON.stringify(d.z) === JSON.stringify(s.z), bad }; });
await run('away', () => { const g = __pc; g.G.state = 'paused'; document.getElementById('leave').click();
  const s = g.loadSave(); s.t = Date.now() - 3 * 3.6e6; s.z = s.z.map((q, i) => i < 3 ? [s.cr, 100] : q); localStorage.setItem('pc-save', JSON.stringify(s));
  g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(5, 1 / 30);
  return { saved: s.c, cash: g.P.cash, expect: s.c + Math.round(g.ZONES_VAL().slice(0, 3).reduce((a, v) => a + v, 0) * 3 / 10) * 10, owners: g.ZS.map(q => q.owner + ':' + Math.round(q.ctrl)).join(' '), hint: g.P.hints[0] }; });
await run('soak', () => { const g = __pc, t0 = performance.now(); let maxB = 0, maxC = 0, ev = {}; for (let m = 0; m < 20; m++) { const z = g.ZONES[m % 10]; if (m % 2 === 0) { g.P.x = z.x + 10; g.P.z = z.z + 22; g.P.y = .15; } for (let s = 0; s < 60; s++) { g.step(30, 1 / 30); maxB = Math.max(maxB, g.bots.length); maxC = Math.max(maxC, g.cars.length); g.EVTS.forEach(E => { ev[E.k] = (ev[E.k] || 0) + 1; }); } }
  return { ms: Math.round(performance.now() - t0), maxB, maxC, evSeconds: ev, owners: g.ZS.map(q => q.owner + ':' + Math.round(q.ctrl)).join(' '), street: g.bots.filter(b => b.street).length, cash: g.P.cash, gn: g.P.gn.map(Math.round) }; });
console.log([...new Set(errs)].slice(0, 12).join('\n') || 'no errors');
await b.close();
