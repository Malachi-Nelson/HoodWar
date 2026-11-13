// stage five: on the street. Food from a cart, dice on a corner (and being accused), a purse snatcher, a holdup in progress, dogs
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
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 8; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };
await run('start', () => { const g = __pc; g.DBG.god = true; g.DBG.notarget = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 3, 1 / 30); g.P.hints = []; g.P.earn += 20000; g.addRP(g.rpFor(5) + 10); g.step(2, 1 / 30);
  return { carts: g.CARTS.map(c => c.text), dice: g.diceSpots().map(s => [s.i, Math.round(s.x), Math.round(s.z), s.p.cap]), robs: g.ROBS.map(r => r.name) }; });
await p.evaluate(() => { const g = __pc; window.__run = s => { for (let i = 0; i < Math.round(s * 30); i++) { g.step(1, 1 / 30); if (i % 6 === 0) g.visuals(1 / 5); } }; window.__at = (x, z) => { if (g.P.car) g.GAME.leaveCar(false); g.P.x = x; g.P.z = z; g.P.y = g.groundAt(x, z, 2.4, 'p'); g.P.vx = g.P.vz = g.P.vy = 0; }; });
await run('food', () => { const g = __pc; let out = []; for (const c of g.CARTS) { __at(c.x + c.d[0] * 30, c.z + c.d[1] * 30); __run(4); __at(c.x + c.d[0] * 1.6, c.z + c.d[1] * 1.6); __run(.5); const pr = g.foodPrompt(); if (pr && pr.act) { g.P.hp = 40; const c0 = g.P.cash; pr.act(); out.push({ cart: c.text, text: pr.text, hp: g.P.hp, paid: c0 - g.P.cash }); break; } else out.push({ cart: c.text, text: pr && pr.text }); } return out; });
await run('dice: a game starts', () => { const g = __pc; g.G.tod = 20; const s = g.diceSpots()[0]; __at(s.x + 70, s.z); for (let i = 0; i < 40; i++) { g.diceTick(); g.step(1, 1 / 30); } const n = g.bots.filter(b => b.dice === s.i).length; __at(s.x + 1.8, s.z); __run(.5); const pr = g.dicePrompt(); return { players: n, acts: g.bots.filter(b => b.dice === s.i).map(b => b.act), seen: g.dicers(s).length, prompt: pr && pr.text }; });
await run('dice: play', () => { const g = __pc, s = g.diceSpots()[0], pr = g.dicePrompt(); if (!pr || !pr.act) return 'no prompt'; pr.act(); const c0 = g.P.cash, rolls = []; for (let i = 0; i < 6; i++) { g.DICE.streak = 0; g.DICE.won = 0; g.diceRoll(50); rolls.push(g.DICE.roll && g.DICE.roll.text); } g.step(1, 1 / 30);
  return { menu: document.getElementById('shop-title').textContent, items: [...document.querySelectorAll('#shop-list li')].map(li => li.textContent).slice(0, 5), net: g.P.cash - c0, rolls }; });
await shot('v13_dice');
await run('dice: too lucky', () => { const g = __pc, s = g.diceSpots()[0]; const cars0 = g.cars.filter(c => c.squad === g.P).length; g.DICE.streak = 5; g.DICE.won = 2000; let k = 0; const R = Math.random; Math.random = () => .99; try { for (; k < 8 && g.DICE.streak; k++) g.diceRoll(50); } finally { Math.random = R; } __run(1);
  return { busted: !g.DICE.streak, banner: document.querySelector('#h-banner .big') && document.querySelector('#h-banner .big').textContent, squads: g.cars.filter(c => c.squad === g.P).length - cars0, players: g.bots.filter(b => b.dice === s.i).length, cool: Math.round(s.coolT - g.G.time) }; });
await run('purse snatcher', () => { const g = __pc; g.G.tod = 14; let E = null; for (let k = 0; k < 30 && !E; k++) { const n = g.NAVOK ? null : null; __at(300 + k * 13, 230); __run(3); if (g.EV_START.snatch()) E = g.EVTS.find(q => q.k === 'snatch'); }
  if (!E) return 'no snatch'; const th = E.thief, v = E.victim, d0 = Math.hypot(th.x - g.P.x, th.z - g.P.z); __run(3); const ran = Math.hypot(th.x - v.x, th.z - v.z);
  g.damageBot(th, 999, false, g.P, 'pistol'); __run(.6); const c = g.CASES.find(q => q.ev === E); if (!c) return { ran, dropped: false, d0 }; __at(c.x, c.z); __run(.5); const has = g.P.case && g.P.case.k;
  __at(v.x + 1.2, v.z); __run(.4); const pr = g.pursePrompt(); const c0 = g.P.cash; if (pr && pr.act) pr.act(); __run(.5); return { d0: Math.round(d0), ran: Math.round(ran), has, prompt: pr && pr.text, reward: Math.round(g.P.cash - c0), over: !g.EVTS.includes(E), banner: document.querySelector('#h-banner .big').textContent }; });
await run('holdup', () => { const g = __pc; let E = null; for (let k = 0; k < 6 && !E; k++) { const R = g.ROBS[k % g.ROBS.length]; __at(R.x + 90, R.z + 40); __run(1); g.G.robT = {}; if (g.EV_START.holdup()) E = g.EVTS.find(q => q.k === 'holdup'); }
  if (!E) return 'no holdup'; const b = E.robber; __run(2); const clerk = E.post && E.post.npc; const at = Math.hypot(b.x - E.x, b.z - E.z); __at(E.x + 6, E.z + 6); __run(.3); const c0 = g.P.cash; g.damageBot(b, 999, false, g.P, 'pistol'); __run(.6);
  return { store: g.ROBS[E.rob].name, robber: b.name, team: b.team, atTill: +at.toFixed(1), aim: +b.aim.toFixed(2), clerkHands: clerk ? clerk.act === g.ACT.handsup || clerk.scare === g.ACT.handsup : 'no clerk', reward: Math.round(g.P.cash - c0), over: !g.EVTS.includes(E), banner: document.querySelector('#h-banner .big').textContent }; });
await run('holdup: too slow', () => { const g = __pc; let E = null; for (let k = 0; k < 6 && !E; k++) { const R = g.ROBS[(k + 1) % g.ROBS.length]; __at(R.x + 100, R.z - 40); __run(1); g.G.robT = {}; if (g.EV_START.holdup()) E = g.EVTS.find(q => q.k === 'holdup'); } if (!E) return 'no holdup'; E.until = g.G.time + 1; __run(2); return { over: !g.EVTS.includes(E), fled: !!E.fled, tillShut: !g.tillOpen(E.rob) }; });
await run('dogs', () => { const g = __pc; g.G.tod = 15; let most = 0; for (let k = 0; k < 8; k++) { __at(150 + k * 60, 230); __run(4); g.visuals(1 / 30); most = Math.max(most, g.dogMesh.count); } return { dogs: most, walkers: g.bots.filter(b => g.dogOf ? g.dogOf(b) : false).length }; });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
await b.close();
