// v5 stage two: the bank job, the jewelry store, the lab and a smuggling run, solo on a manual clock
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises';
const ROOT = new URL('..', import.meta.url).pathname;
const srv = createServer(async (q, r) => { try { const f = decodeURIComponent(new URL(q.url, 'http://x').pathname); r.end(await readFile(ROOT + f.replace(/^\/+/, ''))); } catch (e) { r.statusCode = 404; r.end(); } }).listen(0); const PORT = srv.address().port;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|404/.test(t)) errs.push(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.addInitScript(() => { window.__PC_TEST = true; window.__PC_MANUAL = true; try { if (!localStorage.getItem('pc-test-init')) { localStorage.clear(); localStorage.setItem('pc-test-init', '1'); } } catch (e) {} });
await p.goto('http://localhost:' + PORT + '/dist/claude.html');
await p.waitForTimeout(1500);
const log = (k, v) => console.log(k, JSON.stringify(v));
const run = async (name, fn, arg) => { try { const r = await p.evaluate(fn, arg); log(name, r); return r; } catch (e) { log(name, 'EVAL ERROR ' + e.message.split('\n')[0]); return null; } };
const shot = async name => { await p.evaluate(() => { const g = __pc; for (let i = 0; i < 6; i++) g.visuals(1 / 30); g.draw(); }); await p.screenshot({ path: '/tmp/' + name + '.png' }); };
const tick = n => p.evaluate(n => { const g = __pc; for (let i = 0; i < n; i++) { g.step(1, 1 / 30); if (i % 3 === 0) g.visuals(1 / 30); } }, n);

await run('start', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30 * 3, 1 / 30); g.P.hints = []; g.P.earn += 80000; g.addRP(g.rpFor(5) + 10); g.step(2, 1 / 30);
  return { bank: g.BANK && [Math.round(g.BANK.x0), Math.round(g.BANK.z0), Math.round(g.BANK.x1), Math.round(g.BANK.z1)], jewel: g.JEWEL && g.JEWEL.name, labs: g.LABS.map(L => L.name), rank: g.P.rank }; });

await run('bank start', () => { const g = __pc; g.openPhone(); g.buy(String(g.phoneItems().findIndex(q => /Heists/.test(q.label)) + 1)); const items = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent);
  g.G.prep.gear = 1; g.buy('1'); const sub = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent); g.buy(String(g.shopNow().list.findIndex(q => /loud/.test(q.label)) + 1)); g.step(5, 1 / 30); for (let i = 0; i < 4; i++) g.visuals(1 / 30); const E = g.EVTS.find(q => q.k === 'bank'); return { items, sub, on: !!E, stage: E && E.stage, line: document.getElementById('h-race').textContent, banner: document.querySelector('#h-banner .big').textContent }; });

await run('bank in', () => { const g = __pc, B = g.BANK; g.DBG.notarget = false; g.P.x = B.door.x - 6; g.P.z = B.door.z; g.step(10, 1 / 30); const outside = g.EVTS.find(q => q.k === 'bank').stage;
  g.P.x = B.x0 + 3; g.P.z = B.cz; g.step(30, 1 / 30); const E = g.EVTS.find(q => q.k === 'bank');
  return { outside, stage: E.stage, heat: g.P.heat, guards: E.guards.length, vaultShut: !g.BANK.vbox.off, line: (g.visuals(1 / 30), document.getElementById('h-race').textContent) }; });
await shot('v5_bank');

await run('drill', () => { const g = __pc, B = g.BANK, E = g.EVTS.find(q => q.k === 'bank'); g.DBG.notarget = true; g.P.x = B.vault.x; g.P.z = B.vault.z; let half = null;
  let jams = 0; for (let i = 0; i < 30 * 90 && E.stage === 1; i++) { g.P.x = B.vault.x; g.P.z = B.vault.z; if (E.jam) { jams++; g.GAME.drillOn(g.P); } g.step(1, 1 / 30); if (i % 10 === 0) g.visuals(1 / 30); if (half === null && E.drill > .5) half = Math.round(g.G.time); }
  for (let i = 0; i < 40; i++) g.visuals(1 / 30);
  return { jams, stage: E.stage, bags: E.bags.length, vaultOpen: g.BANK.vbox.off, doorRot: +g.vaultDoor.rotation.y.toFixed(2), line: document.getElementById('h-race').textContent }; });
await shot('v5_vault');

await run('bag it', () => { const g = __pc, E = g.EVTS.find(q => q.k === 'bank'), cash0 = g.P.cash; const q = E.bags.find(b => !b.gone); g.P.x = q.x; g.P.z = q.z; g.P.y = q.y; g.step(5, 1 / 30); const carrying = g.P.bag; E.openT = -999; g.step(10, 1 / 30);
  return { carrying, left: E.bags.length, stage: E.stage, drop: [Math.round(E.x), Math.round(E.z)], cashNow: g.P.cash - cash0, line: (g.visuals(1 / 30), document.getElementById('h-race').textContent) }; });

await run('drop', () => { const g = __pc, E = g.EVTS.find(q => q.k === 'bank'), cash0 = g.P.cash, rp0 = g.P.rp; g.P.x = E.x + 3; g.P.z = E.z; g.P.y = g.groundAt(E.x + 3, E.z, 3, 'p'); g.step(10, 1 / 30); const wanted = g.EVTS.includes(E);
  g.GAME.clearHeat(g.P); g.step(10, 1 / 30); return { blockedWhileWanted: wanted, over: !g.EVTS.includes(E), paid: g.P.cash - cash0, rp: g.P.rp - rp0, banner: document.querySelector('#h-banner .big').textContent }; });

await run('jewel', () => { const g = __pc, J = g.JEWEL; g.G.jobT = {}; g.openPhone(); g.buy(String(g.phoneItems().findIndex(q => /Heists/.test(q.label)) + 1)); g.buy(String(g.shopNow().list.findIndex(q => /Jewelry/.test(q.label)) + 1)); g.step(4, 1 / 30); const E = g.EVTS.find(q => q.k === 'jewel'); if (!E) return 'did not start';
  g.DBG.notarget = false; const prompts = []; J.cases.forEach((c, i) => { g.P.x = c.x + (J.door.x - c.x) * .1; g.P.z = c.z + (J.door.z - c.z) * .1; g.P.x += 0; g.step(3, 1 / 30); const pr = g.findPromptNow && g.findPromptNow(); prompts.push(pr ? pr.text : null); if (pr && pr.act) pr.act(); g.step(2, 1 / 30); });
  const heat = g.P.heat; g.step(30 * 2, 1 / 30); g.DBG.notarget = true; return { prompts, cases: E.cases, take: E.take, heat, stage: E.stage }; });

await run('jewel drop', () => { const g = __pc, E = g.EVTS.find(q => q.k === 'jewel'); if (!E) return 'none'; const cash0 = g.P.cash; g.GAME.clearHeat(g.P); g.P.x = E.x + 2; g.P.z = E.z; g.P.y = g.groundAt(E.x + 2, E.z, 3, 'p'); g.step(15, 1 / 30); return { over: !g.EVTS.includes(E), paid: g.P.cash - cash0 }; });

await run('lab', () => { const g = __pc; g.openPhone(); g.buy(String(g.phoneItems().findIndex(q => /Drug business/.test(q.label)) + 1)); const items = [...document.querySelectorAll('#shop-list li')].map(li => li.textContent); g.buy('1');
  const L = g.P.lab; if (!L) return { items, bought: false }; for (let i = 0; i < 30 * 520; i++) { g.step(1, 1 / 30); if (i % 15 === 0) g.careerTick(.5); }
  return { items, site: g.LABS[L.site].name, stock: L.stock, phone: (g.openPhone(), g.buy(String(g.phoneItems().findIndex(q => /Your lab/.test(q.label)) + 1)), [...document.querySelectorAll('#shop-list li')].map(li => li.textContent)) }; });

await run('smuggle', () => { const g = __pc, units = g.P.lab.stock; g.buy('2'); g.step(5, 1 / 30); const E = g.EVTS.find(q => q.k === 'smug'); if (!E) return 'no run'; const c = E.car, cash0 = g.P.cash;
  g.P.x = c.x - 2.5; g.P.z = c.z; const o = g.carOffer(c); g.tryEnter(c, o); g.step(60, 1 / 30); const inVan = g.P.car === c; for (let i = 0; i < 3; i++) g.visuals(1 / 30); const line = document.getElementById('h-race').textContent;
  g.step(30 * 20, 1 / 30); const tailed = E.tailed; c.x = E.drop.x + 3; c.z = E.drop.z; c.vx = c.vz = 0; c.y = g.groundAt(c.x, c.z, 3, 'p'); g.step(15, 1 / 30);
  return { units, inVan, line, tailed, over: !g.EVTS.includes(E), paid: g.P.cash - cash0, stockAfter: g.P.lab.stock }; });

await run('save', () => { const g = __pc; g.saveGame(); const s = g.loadSave(); return { lab: s.lab }; });
await p.reload(); await p.waitForTimeout(1500);
await run('after reload', () => { const g = __pc; g.DBG.god = true; g.G.solo = true; g.startWorld(); g.beginPlay(); g.step(30, 1 / 30); return { lab: g.P.lab && [g.LABS[g.P.lab.site].name, g.P.lab.stock] }; });
await run('soak', () => { const g = __pc, t0 = performance.now(); g.G.jobT = {}; g.EV_START.bank(); for (let i = 0; i < 30 * 200; i++) { g.step(1, 1 / 30); if (i % 30 === 0) g.visuals(1 / 30); } return { ms: Math.round(performance.now() - t0), evts: g.EVTS.map(E => E.k + ':' + (E.stage | 0)) }; });
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no errors');
await b.close(); srv.close();
