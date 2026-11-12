// the public page (index.html) with its relay code, two players, and a stand-in for the MQTT library:
// checks that the relay shim gives the game the room it expects, through lobby, session and a private-room link
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';   // wherever Playwright is installed
const ROOT = new URL('..', import.meta.url).pathname;
const FAKE_MQTT = `window.__fakeMsgs = 0; window.mqtt = { connect(url, opts) {
  const ch = new BroadcastChannel('fakemqtt'), h = {}, subs = []; let open = true;
  const c = { on(e, f) { (h[e] = h[e] || []).push(f); return c; },
    subscribe(t, o, cb) { subs.push(t); setTimeout(() => cb && cb(null), 0); },
    publish(topic, payload) { if (!open) return; window.__fakeMsgs++; window.__fakeMax = Math.max(window.__fakeMax || 0, String(payload).length); ch.postMessage({ topic, payload: String(payload) }); },
    end() { open = false; ch.close(); } };
  ch.onmessage = e => { const { topic, payload } = e.data; if (!subs.some(s => s.endsWith('+') ? topic.startsWith(s.slice(0, -1)) && !topic.slice(s.length - 1).includes('/') : s === topic)) return; (h.message || []).forEach(f => f(topic, { toString: () => payload })); };
  window.__fakeUrl = url; window.__fakeId = opts.clientId; setTimeout(() => (h.connect || []).forEach(f => f()), 30);
  return c; } };`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript('window.__PC_TEST = true; window.__PC_MANUAL = true;');
const errs = [];
async function open(tag, hash) {
  const p = await ctx.newPage();
  p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED/.test(t)) errs.push(tag + ' ' + t); });
  p.on('pageerror', e => errs.push(tag + ' PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await p.route('**/mqtt.min.js', r => r.fulfill({ body: FAKE_MQTT, contentType: 'application/javascript' }));
  await p.route('**fonts.googleapis.com/**', r => r.abort());
  await p.goto('file://' + ROOT + 'index.html' + (hash || ''));
  return p;
}
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (k, v) => console.log(k, JSON.stringify(v));
const A = await open('A'), B = await open('B');
const pump = async n => { for (let i = 0; i < n; i++) { for (const p of [A, B]) await p.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(4); } };
await sleep(1500);
log('relay line', [await A.textContent('#co-link-status'), await B.textContent('#co-link-status')]);
log('link row', await A.evaluate(() => ({ link: document.getElementById('co-link').value.replace(/^.*\//, '…/'), priv: document.getElementById('co-priv').textContent, url: window.__fakeUrl, id: window.__fakeId.slice(0, 4), note: document.getElementById('o-note').textContent.slice(-150) })));
log('lobby status', [await A.textContent('#co-status'), await B.textContent('#co-status')]);
await A.fill('#co-name', 'Alice'); await A.dispatchEvent('#co-name', 'change'); await B.fill('#co-name', 'Bob'); await B.dispatchEvent('#co-name', 'change');
await A.click('#co-host'); await sleep(300); await B.click('#co-join'); await sleep(300); await B.click('#co-ready'); await sleep(300);
log('roster', await A.evaluate(() => [...document.querySelectorAll('#co-roster li')].map(l => l.textContent)));
await A.click('#co-start'); await sleep(300); await pump(45);
const snap = () => { const g = __pc; return { mode: g.NET.mode + '/' + g.G.state, slot: g.NET.slot, crew: g.G.crew, bots: g.bots.length, cars: g.cars.length, remotes: Object.values(g.NET.remotes).map(r => r.name + ':' + r.slot + '@' + Math.round(r.x) + ',' + Math.round(r.z)), msgs: window.__fakeMsgs, maxMsg: window.__fakeMax }; };
log('A', await A.evaluate(snap)); log('B', await B.evaluate(snap));
const hb = await A.evaluate(() => __pc.bots.filter(b => !b.dead).map(b => [b.id, Math.round(b.x), Math.round(b.z)])), cb = await B.evaluate(() => __pc.bots.filter(b => !b.dead).map(b => [b.id, Math.round(b.x), Math.round(b.z)]));
let off = 0, miss = 0; hb.forEach(h => { const c = cb.find(q => q[0] === h[0]); if (!c) miss++; else off = Math.max(off, Math.hypot(c[1] - h[1], c[2] - h[2])); });
log('bot sync through the relay', { host: hb.length, client: cb.length, missing: miss, maxOffMetres: +off.toFixed(1) });
log('relay line in session', await B.textContent('#co-link-status'));
// the host closes the tab without saying goodbye: the relay's stale check has to notice
await A.close(); await sleep(8500); for (let i = 0; i < 120; i++) { await B.evaluate(() => { __pc.step(2, 1 / 30); __pc.visuals(1 / 15); }); await sleep(4); }
log('after the host vanishes', await B.evaluate(() => ({ mode: __pc.NET.mode + '/' + __pc.G.state, eyebrow: document.getElementById('o-eyebrow').textContent, line: document.getElementById('co-link-status').textContent })));
// a private room: a link with a code
const C = await open('C', '#Crew42!'); await sleep(1200);
log('private room', await C.evaluate(() => ({ line: document.getElementById('co-link-status').textContent, link: document.getElementById('co-link').value.replace(/^.*\//, '…/'), btn: document.getElementById('co-priv').textContent, sees: document.getElementById('co-status').textContent })));
console.log([...new Set(errs)].slice(0, 20).join('\n') || 'no errors');
await b.close();
