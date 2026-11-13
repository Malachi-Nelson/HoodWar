// deals between players online: an offer, the answer, two cases and a meet; a case taken off someone; a text
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const MOCK = `(() => {
  const me = 'peer' + (window.name || Math.random().toString(36).slice(2, 10)), ch = new BroadcastChannel('mockroom2'), table = {}, subs = []; let mine = {}, off = false;
  const fire = () => subs.forEach(f => { try { f({}); } catch (e) { console.error('onPeers handler: ' + e.message); } });
  ch.onmessage = e => { if (off) return; const m = e.data; if (m.t === 'p') { table[m.id] = m.p; fire(); } else if (m.t === 'bye') { delete table[m.id]; fire(); } else if (m.t === 'hello') ch.postMessage({ t: 'p', id: me, p: mine }); };
  window.__mock = { me, off: () => { ch.postMessage({ t: 'bye', id: me }); off = true; for (const k in table) delete table[k]; fire(); }, on: () => { off = false; ch.postMessage({ t: 'hello' }); ch.postMessage({ t: 'p', id: me, p: mine }); } };
  const room = {
    peers: () => [{ peer: me, presence: mine, isMe: true, sameTab: true }].concat(Object.keys(table).map(k => ({ peer: k, presence: table[k], isMe: false, sameTab: false }))),
    presence: patch => { const o = Object.assign({}, mine); for (const k in patch) { if (patch[k] === null) delete o[k]; else o[k] = patch[k]; } mine = o; if (!off) ch.postMessage({ t: 'p', id: me, p: o }); return Promise.resolve(); },
    onPeers: fn => { subs.push(fn); setTimeout(() => fn({}), 0); return () => {}; }, join: async () => room, get up() { return !off; }, get rtt() { return off ? 0 : 42; } };
  window.claude = { use: async n => n === 'room' ? (ch.postMessage({ t: 'hello' }), room) : null };
  window.__PC_TEST = true; window.__PC_MANUAL = true;
})();`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(MOCK);
const errs = [];
async function open(tag) {
  const p = await ctx.newPage(); await p.evaluate(t => { window.name = t; }, tag).catch(() => {});
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error') && !/ERR_FAILED/.test(t)) errs.push(tag + ' ' + t); });
  p.on('pageerror', e => errs.push(tag + ' PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await p.route('**fonts.googleapis.com/**', r => r.abort());
  await p.goto('file://' + ROOT + 'dist/claude.html');
  return p;
}
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (k, v) => console.log(k, JSON.stringify(v));
const shotOf = async (p, path) => { await p.evaluate(() => { __pc.visuals(.016); __pc.draw(); }); await p.screenshot({ path }); };

const A = await open('a'), B = await open('b'); let live = [A, B];
const pump = async (n, ms) => { for (let i = 0; i < n; i++) { for (const p of live) await p.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(ms || 3); } };
await sleep(1200);
for (const [p, n] of [[A, 'Alice'], [B, 'Bob']]) { await p.fill('#co-name', n); await p.dispatchEvent('#co-name', 'change'); }
await A.click('#co-host'); await sleep(300); await B.click('#co-join'); await sleep(300); await B.click('#co-ready'); await sleep(300);
await A.click('#co-start'); await sleep(400); await pump(60);

await A.evaluate(() => { const g = __pc; g.DBG.notarget = true; window.__spot = [g.P.x, g.P.z]; });
const spot = await A.evaluate(() => window.__spot);
await B.evaluate(s => { const g = __pc; g.P.x = s[0] + 6; g.P.z = s[1]; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); g.P.earn += 40000; g.step(1, 1 / 30); g.buyLab(1); g.P.lab.stock = 12; }, spot);
await A.evaluate(() => { const g = __pc; g.P.earn += 40000; g.step(1, 1 / 30); g.P.x += 30; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); }); await B.evaluate(() => { const g = __pc; g.P.x += 30; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); });
await pump(30);
// Bob offers Alice 5 units for $3,750
log('Bob offers', await B.evaluate(() => { const g = __pc; const items = g.dealItems('deals').map(i => i.label); const r = Object.values(g.NET.remotes)[0]; const page = g.dealItems('deals-o:' + r.peer).map(i => i.label + (i.off ? ' (off)' : '')); g.offerTo(r, 5, 3750); return { items, page, stock: g.P.lab.stock }; }));
await pump(20);
log('Alice gets it', await A.evaluate(() => ({ offers: __pc.OFFERS.map(o => o.from.name + ':' + o.units + ':' + o.price), banner: document.querySelector('#h-banner .big').textContent, phone: __pc.dealItems('deals').map(i => i.label).slice(0, 3) })));
log('Alice takes it', await A.evaluate(() => { const g = __pc, c0 = g.P.cash; g.answerOffer(g.OFFERS[0], true); g.step(2, 1 / 30); return { paid: Math.round(c0 - g.P.cash), case: g.P.case && g.P.case.k + ':' + g.P.case.v, meet: g.EVTS.filter(E => E.k === 'trade').length }; }));
await pump(25);
log('Bob has the product case', await B.evaluate(() => ({ case: __pc.P.case && __pc.P.case.k + ':' + __pc.P.case.v, line: __pc.jobLine(), banner: document.querySelector('#h-banner .big').textContent })));
// the swap: both put their cases down and pick up the other's
await B.evaluate(() => { const g = __pc; g.P.x += 3; const pr = g.casePrompt(); if (pr) pr.act(); g.P.x += 3; });
await A.evaluate(() => { const g = __pc; g.P.x -= 3; const pr = g.casePrompt(); if (pr) pr.act(); g.P.x -= 3; });
await pump(20);
const floor = await A.evaluate(() => __pc.CASES.map(c => [c.k, c.v, +c.x.toFixed(1), +c.z.toFixed(1)]));
log('cases on the ground', floor);
await A.evaluate(f => { const g = __pc, c = f.find(q => q[0] === 'prod'); g.P.x = c[2] + 3; g.P.z = c[3]; g.step(2, 1 / 30); g.P.x = c[2]; g.P.z = c[3]; g.P.y = g.groundAt(c[2], c[3], 2.4, 'p'); g.step(2, 1 / 30); }, floor);
await B.evaluate(f => { const g = __pc, c = f.find(q => q[0] === 'cash'); g.P.x = c[2] + 3; g.P.z = c[3]; g.step(2, 1 / 30); g.P.x = c[2]; g.P.z = c[3]; g.P.y = g.groundAt(c[2], c[3], 2.4, 'p'); g.step(2, 1 / 30); }, floor);
await pump(30);
log('after the swap', { alice: await A.evaluate(() => __pc.P.case && __pc.P.case.k + ':' + __pc.P.case.v), bob: await B.evaluate(() => __pc.P.case && __pc.P.case.k + ':' + __pc.P.case.v), hostSees: await A.evaluate(() => Object.values(__pc.NET.remotes).map(r => r.name + ':' + (r.case ? r.case.k : '-'))) });
// Bob takes the cash home to his yard and it is his
const c0 = await B.evaluate(() => __pc.P.cash); await pump(160); await B.evaluate(() => { const g = __pc, y = g.SPAWNS[g.P.team][0]; g.P.x = y.x; g.P.z = y.z; g.P.y = g.groundAt(y.x, y.z, 2.4, 'p'); }); await pump(30);
log('Bob stashed', await B.evaluate(c => ({ case: !!__pc.P.case, got: Math.round(__pc.P.cash - c) }), c0));
// Alice goes to a lab? She has none: she fences it
log('Alice fences', await A.evaluate(() => { const g = __pc, c0 = g.P.cash; g.P.x = g.FENCE.x + 1; g.P.z = g.FENCE.z + 1; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); g.step(20, 1 / 30); return { got: Math.round(g.P.cash - c0), case: !!g.P.case }; }));
// a text: Bob tells Alice to meet him
log('Bob texts', await B.evaluate(() => { const g = __pc, r = Object.values(g.NET.remotes)[0]; const page = g.dealItems('deals-t:' + r.peer).map(i => i.label); g.sendText(r, 0); return page; }));
await pump(15);
log('Alice reads it', await A.evaluate(() => ({ banner: document.querySelector('#h-banner .big').textContent, pings: __pc.PINGS.map(q => q.who.name + ':' + q.kind) })));
// a case taken off someone who goes down
await A.evaluate(() => { __pc.GAME.giveCase(Object.values(__pc.NET.remotes)[0], 'cash', 5000, null); });
await pump(15);
log('Bob given cash', await B.evaluate(() => __pc.P.case && __pc.P.case.v));
await B.evaluate(() => { const g = __pc; g.DBG.god = false; g.P.safeT = 0; g.P.revT = -99; g.hurtPlayer(999, null, 'pistol', false); });
await pump(20);
log('dropped when down', { bob: await B.evaluate(() => ({ down: __pc.P.down > 0, case: !!__pc.P.case })), floor: await A.evaluate(() => __pc.CASES.map(c => c.k + ':' + c.v)) });
await b.close();
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
