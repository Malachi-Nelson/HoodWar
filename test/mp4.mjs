// playing together online: going down and being picked up, bleeding out, coming back near a teammate, pings, carrying heist bags
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
// both on a quiet street, side by side
await A.evaluate(() => { const g = __pc; g.DBG.notarget = true; window.__spot = [g.P.x, g.P.z]; });
const spot = await A.evaluate(() => window.__spot);
await B.evaluate(s => { const g = __pc; g.P.x = s[0] + 2; g.P.z = s[1]; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); }, spot);
await pump(30);
log('mates strip on A', await A.evaluate(() => ({ shown: !document.getElementById('mates').hidden, text: document.getElementById('mates').textContent })));
// Bob takes a killing hit: down, not dead
log('Bob down', await B.evaluate(() => { const g = __pc; g.hurtPlayer(999, null, 'pistol', false); return { down: +(g.P.down || 0).toFixed(1), dead: g.P.dead, hp: g.P.hp, overlay: document.getElementById('dead-big').textContent, can: g.canGoDown() }; }));
await pump(20);
log('A sees Bob down', await A.evaluate(() => { const r = Object.values(__pc.NET.remotes)[0]; return { down: r.down, strip: document.getElementById('mates').textContent }; }));
// Alice picks him up
log('A prompt', await A.evaluate(s => { const g = __pc, r = Object.values(g.NET.remotes)[0]; g.P.x = r.x + 1; g.P.z = r.z; g.P.y = r.y; g.step(2, 1 / 30); const pr = g.findPromptNow(); const t = pr && pr.text; if (pr && pr.act) pr.act(); return t; }));
await pump(50);
log('Bob back up', await B.evaluate(() => { const g = __pc; return { down: g.P.down | 0, dead: g.P.dead, hp: Math.round(g.P.hp), hidden: document.getElementById('dead').hidden, banner: document.querySelector('#h-banner .big').textContent }; }));
log('A RP for it', await A.evaluate(() => __pc.P.rp));
// down again too soon: dead this time, and he comes back near Alice
log('Bob again', await B.evaluate(() => { const g = __pc; g.P.safeT = 0; g.hurtPlayer(999, null, 'pistol', false); return { down: g.P.down | 0, dead: g.P.dead }; }));
await pump(130);
log('Bob respawned', await B.evaluate(() => { const g = __pc, r = Object.values(g.NET.remotes)[0]; return { dead: g.P.dead, near: Math.round(Math.hypot(g.P.x - r.x, g.P.z - r.z)), feed: document.getElementById('feed').textContent.slice(-60) }; }));
// down and left alone: bleeds out
await B.evaluate(() => { __pc.P.revT = -99; __pc.P.safeT = 0; __pc.hurtPlayer(999, null, 'pistol', false); });
log('bleeding', await B.evaluate(() => ({ down: Math.round(__pc.P.down), sub: document.getElementById('dead-sub').textContent })));
await pump(480);
log('bled out', await B.evaluate(() => ({ dead: __pc.P.dead, down: __pc.P.down | 0 })));
await pump(120);
// pings: Bob marks something in front of him, Alice sees it
log('Bob pings', await B.evaluate(() => { const g = __pc; g.P.cpitch = -.25; g.visuals(1 / 30); g.pingHere(); g.step(2, 1 / 30); return g.PINGS.map(q => q.kind + '@' + Math.round(q.x) + ',' + Math.round(q.z)); }));
await pump(10);
log('Alice sees the ping', await A.evaluate(() => __pc.PINGS.map(q => (q.who && q.who.name) + ':' + q.kind + '@' + Math.round(q.x) + ',' + Math.round(q.z))));
// the cargo yard with two: Bob carries a bag, Alice's machine knows, he goes down and drops it
log('cargo start', await A.evaluate(() => { const g = __pc; g.P.earn += 50000; g.addRP(g.rpFor(7)); g.step(1, 1 / 30); g.G.jobT = {}; const busy = g.EVTS.map(q => q.k); g.startJob('cargo', 0); const E = g.EVTS.find(q => q.k === 'cargo'); g.P.x = g.CARGO.hack.x; g.P.z = g.CARGO.hack.z; g.P.y = g.groundAt(g.P.x, g.P.z, 2.4, 'p'); return { busy, started: !!E, cash: Math.round(g.P.cash), rank: g.P.rank, dead: g.P.dead }; }));
await pump(20); await A.evaluate(() => { __pc.GAME.hack(__pc.P); }); await pump(10);
const bagAt = await A.evaluate(() => { const E = __pc.EVTS.find(q => q.k === 'cargo'); const bg = E.bags.find(q => !q.gone); return [bg.x, bg.z]; });
await B.evaluate(s => { const g = __pc; g.DBG.god = false; g.P.x = s[0]; g.P.z = s[1]; g.P.y = g.groundAt(s[0], s[1], 2.4, 'p'); g.step(2, 1 / 30); }, bagAt);
await pump(30);
log('Bob carries', { bob: await B.evaluate(() => ({ bag: __pc.P.bag | 0, line: __pc.jobLine() })), alice: await A.evaluate(() => Object.values(__pc.NET.remotes).map(r => r.name + ':' + (r.bag | 0))) });
await B.evaluate(() => { __pc.P.revT = -99; __pc.P.safeT = 0; __pc.hurtPlayer(999, null, 'pistol', false); }); await pump(20);
log('Bob down with the bag', { bob: await B.evaluate(() => ({ bag: __pc.P.bag | 0, down: __pc.P.down > 0 })), bagsOnFloor: await A.evaluate(() => __pc.EVTS.find(q => q.k === 'cargo').bags.filter(q => !q.gone).length) });
await shotOf(A, '/tmp/mp4_down.png');
await b.close();
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors');
