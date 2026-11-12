// usage: node test/multi.mjs steps.json [query]   steps: [[name, js, waitMs?], ...] -> /tmp/<name>.png
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';   // wherever Playwright is installed
const ROOT = new URL('..', import.meta.url).pathname;
import fs from 'fs';
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), extra = process.argv[3] || '';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|ERR_FAILED/.test(t)) errs.push(m.type() + ': ' + t); if (m.type() === 'log' && /^T:/.test(t)) console.log(t); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await p.route('**/three.min.js', r => r.fulfill({ path: ROOT + 'node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.route('**fonts.googleapis.com/**', r => r.abort());
await p.goto('file://' + ROOT + 'dist/claude.html' + extra);
await p.waitForTimeout(1500);
for (const [name, js, wait] of steps) {
  try { const r = await p.evaluate(js); if (r !== undefined && r !== null) console.log(name, 'RESULT', JSON.stringify(r)); } catch (e) { console.log(name, 'EVAL ERROR', e.message.split('\n')[0]); }
  await p.waitForTimeout(wait || 500);
  if (name[0] !== '_') await p.screenshot({ path: '/tmp/' + name + '.png' });
}
console.log([...new Set(errs)].slice(0, 15).join('\n') || 'no errors');
await b.close();
