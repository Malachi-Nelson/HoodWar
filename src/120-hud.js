/* =====================================================================
   13. HUD — radar, health, cash, wanted stars, the turf strip, the feed
   ===================================================================== */
const hudCache = {};
function setHud(id, v, html) { if (hudCache[id] === v) return; hudCache[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; }
let bannerT = 0, hitT = 0, hitSndT = -1;
function banner(big, sub, dur, cls) { const b = $('h-banner'); b.querySelector('.big').textContent = big; b.querySelector('.sub').textContent = sub || ''; b.className = 'sh on' + (cls ? ' ' + cls : ''); bannerT = dur || 2; }
function hitMarker(head, kill) { hitT = kill ? .2 : Math.max(hitT, .09); $('hitm').className = (head ? 'head ' : '') + (kill ? 'kill' : ''); if (!kill && G.time - hitSndT > .05) { SFX.hit(head); hitSndT = G.time; } }
function gain(n) { if (!n) return; const e = $('h-gain'); e.textContent = (n > 0 ? '+$' : '−$') + Math.abs(n); e.className = n > 0 ? '' : 'neg'; void e.offsetWidth; e.classList.add('on'); if (n > 0) SFX.cash(); }
const radarXY = (x, z, k, o) => { const dx = x - P.x, dz = z - P.z, c = Math.cos(P.cyaw), s = Math.sin(P.cyaw); o[0] = (dx * c - dz * s) * k; o[1] = (dx * s + dz * c) * k; return o; };
const _rv = [0, 0], dmgArrows = [];
function dmgArrow(x, z) { radarXY(x, z, 1, _rv); const el = document.createElement('i'), a = Math.atan2(_rv[0], -_rv[1]); el.style.transform = `rotate(${a}rad)`; $('dmg').appendChild(el); dmgArrows.push({ el, t: .9 }); if (dmgArrows.length > 6) dmgArrows.shift().el.remove(); }
const feedRows = [];
// a line of news in the feed: turf income, a raid starting, someone joining
function note(text, cls) { const row = document.createElement('div'), s = document.createElement('span'); s.className = cls || 'c'; s.textContent = text; row.appendChild(s); $('feed').appendChild(row); feedRows.push({ row, t: 7 }); if (feedRows.length > 5) feedRows.shift().row.remove(); }
function feed(a, v, wc, head) {
  if (!v) return; const row = document.createElement('div'), cls = q => !q ? 'c' : isCrew(q.team) ? 'k' + q.team : q.team === TEAM_COP ? 'p' : 'c', sp = (c, t) => { const s = document.createElement('span'); s.className = c; s.textContent = t; return s; };
  if (a && a !== v) row.appendChild(sp(cls(a), nameOf(a))); row.appendChild(sp('w', wname(wc) + (head ? ' · headshot' : ''))); row.appendChild(sp(cls(v), nameOf(v)));
  if (a === P || v === P) row.className = 'me'; $('feed').appendChild(row); feedRows.push({ row, t: 6.5 }); if (feedRows.length > 5) feedRows.shift().row.remove();
}
// --- the map: drawn once, then moved and turned under the radar every frame
const MS = 1.4, mapCv = texCanvas(Math.ceil((CITY.w + 60) * MS), Math.ceil((CITY.d + 60) * MS)), MO = 30;
{ const g = mapCv.getContext('2d'), X = x => (x + MO) * MS, R = (x0, z0, x1, z1, c) => { g.fillStyle = c; g.fillRect(X(x0), X(z0), (x1 - x0) * MS, (z1 - z0) * MS); };
  R(-MO, -MO, CITY.w + MO, CITY.d + MO, '#1d3a4d'); R(-MO, -MO, CITY.w + MO, 0, '#15171b'); R(-MO, -MO, 0, CITY.d + MO, '#15171b'); R(0, 0, CITY.w, CITY.d, '#2b2e34');
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const L = lotOf(i, j); R(L.x0 - WALK, L.z0 - WALK, L.x1 + WALK, L.z1 + WALK, '#454952'); }
  const PC = { grass: '#35553c', lot: '#33363d', plaza: '#50535a', dirt: '#5a5040', court: '#3d5f7a', tile: '#5a5a62', water: '#2a6a88', tree: '#2a4a30' };
  PATCH.forEach(p => { if (p[4] !== 'tree') R(p[0], p[1], p[2], p[3], PC[p[4]] || '#454952'); });
  PATCH.forEach(p => { if (p[4] === 'tree') { g.fillStyle = PC.tree; g.beginPath(); g.arc(X((p[0] + p[2]) / 2), X((p[1] + p[3]) / 2), (p[2] - p[0]) / 2 * MS, 0, TAU); g.fill(); } });
  const FC = { n: '#6a5a8a', y: '#8a7f4a', b: '#6b7079', h: '#7a7166', o: '#76808d', m: '#8a7a9a', i: '#66747b', c: '#8a6a4a', s: '#9a8a6a', e: '#8a4a3a' };
  FOOT.forEach(f => R(f[0], f[1], f[2], f[3], FC[f[4]] || FC.b));
  R(LINE.x - 5, 0, LINE.x + 5, CITY.d, 'rgba(18,20,24,.82)'); R(LINE.x - 13, LINE.sz - 17, LINE.x + 13, LINE.sz + 17, 'rgba(60,66,70,.9)'); }
const radar = $('radar'), rctx = radar.getContext('2d'), blipO = [0, 0];
function blip(g, x, z, k, R, col, r, ring, clampEdge) {
  radarXY(x, z, k, blipO); let bx = blipO[0], by = blipO[1]; const d = hyp(bx, by);
  if (d > R - 6) { if (!clampEdge) return; bx *= (R - 9) / d; by *= (R - 9) / d; }
  g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fillStyle = col; g.fill(); if (ring) { g.lineWidth = 1.5; g.strokeStyle = ring; g.stroke(); } blipO[0] = bx; blipO[1] = by;
}
function drawRadar() {
  const S = radar.width, R = S / 2, g = rctx, k = P.car ? .62 : 1; g.clearRect(0, 0, S, S); g.save(); g.translate(R, R);
  g.save(); g.rotate(P.cyaw); g.scale(k / MS, k / MS); g.drawImage(mapCv, -(P.x + MO) * MS, -(P.z + MO) * MS); g.restore();
  ZONES.forEach((z, i) => { const s = ZS[i], col = s.owner < 0 ? '#f2efe6' : CREWS[s.owner].css; radarXY(z.x, z.z, k, blipO); if (hyp(blipO[0], blipO[1]) < R + z.r * k) { g.beginPath(); g.arc(blipO[0], blipO[1], z.r * k, 0, TAU); g.fillStyle = s.owner < 0 ? 'rgba(242,239,230,.12)' : 'rgba(' + CREWS[s.owner].rgb + ',.2)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = col; g.stroke(); }
    blip(g, z.x, z.z, k, R, col, 8, s.hot && Math.sin(G.time * 9) > 0 ? '#fff' : '#111', true); g.fillStyle = '#111'; g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(z.id, blipO[0], blipO[1] + .5); });
  SHOPS.forEach(s => { if (s.team === undefined || s.team === P.team) { blip(g, s.x, s.z, k, R, '#8fe36b', 4.5, '#111'); } }); GARAGES.forEach(s => { if (s.team === undefined || s.team === P.team) blip(g, s.x, s.z, k, R, '#9fd0e8', 4, '#111'); });
  ROBS.forEach((s, i) => { if (tillOpen(i)) blip(g, s.x, s.z, k, R, '#ff5fa2', 3.5, '#111'); });
  pickups.forEach(p => { if (p.type === 'chain') blip(g, p.x, p.z, k, R, '#ffc83d', 2.5); });
  const hot = P.heat > 0, fl = Math.sin(G.time * 11) > 0;
  cars.forEach(c => { if (c.cop && c.occ[0] && c.occ[0].team === TEAM_COP) { if (hot && !c.wreck) blip(g, c.x, c.z, k, R, fl ? '#ff4a4a' : '#5c98ff', 4.4, '#fff', true); return; } if (!c.wreck && c !== P.car && (c.occ[0] || c.team === P.team)) blip(g, c.x, c.z, k, R, c.occ[0] && isCrew(c.occ[0].team) ? CREWS[c.occ[0].team].css : c.team === P.team ? '#d8d6cc' : '#8b929c', 3, '#111'); });
  bots.forEach(b => { if (b.dead || b.car) return; if (b.team === TEAM_COP) { if (hot) blip(g, b.x, b.z, k, R, fl ? '#5c98ff' : '#ff4a4a', 3.2, '#fff'); return; } if (!isCrew(b.team)) return; if (b.team === P.team) blip(g, b.x, b.z, k, R, CREWS[b.team].css, 3); else if (G.time - (b.shotT || -9) < 2.5 || hyp(b.x - P.x, b.z - P.z) < 22) blip(g, b.x, b.z, k, R, CREWS[b.team].css, 3.4, '#111'); });
  for (const q in NET.remotes) { const r = NET.remotes[q]; if (r.dead) continue; if (r.team === P.team) blip(g, r.x, r.z, k, R, CREWS[r.team].css, 4.2, '#fff', true); else if (G.time - (r.shotT || -9) < 2.5 || hyp(r.x - P.x, r.z - P.z) < 25) blip(g, r.x, r.z, k, R, CREWS[r.team].css, 4.2, '#111'); }
  g.save(); g.rotate(-angTo(P.cyaw, P.car ? P.car.yaw : P.yaw)); g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#111'; g.stroke(); g.restore();
  radarXY(P.x, P.z - 1000, 1, blipO); const nl = hyp(blipO[0], blipO[1]) || 1; g.fillStyle = '#f2efe6'; g.font = '700 12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', blipO[0] / nl * (R - 10), blipO[1] / nl * (R - 10));
  g.restore();
}
function drawBigMap() {
  const c = $('mapc'), g = c.getContext('2d'), k = c.width / (CITY.w + 60), X = x => (x + MO) * k; g.fillStyle = '#0e1014'; g.fillRect(0, 0, c.width, c.height); g.drawImage(mapCv, 0, 0, mapCv.width, mapCv.height, 0, 0, mapCv.width * k / MS, mapCv.height * k / MS);
  const dot = (x, z, r, col, ring) => { g.beginPath(); g.arc(X(x), X(z), r, 0, TAU); g.fillStyle = col; g.fill(); if (ring) { g.lineWidth = 2; g.strokeStyle = ring; g.stroke(); } };
  ZONES.forEach((z, i) => { const s = ZS[i], col = s.owner < 0 ? '#f2efe6' : CREWS[s.owner].css; g.beginPath(); g.arc(X(z.x), X(z.z), z.r * k, 0, TAU); g.fillStyle = s.owner < 0 ? 'rgba(242,239,230,.15)' : 'rgba(' + CREWS[s.owner].rgb + ',.28)'; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke(); dot(z.x, z.z, 11, col, '#111'); g.fillStyle = '#111'; g.font = '700 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(z.id, X(z.x), X(z.z) + 1); g.fillStyle = '#f2efe6'; g.font = '600 13px sans-serif'; g.fillText(z.name, X(z.x), X(z.z) + z.r * k + 10); });
  SHOPS.forEach(s => { if (s.team === undefined || s.team === P.team) dot(s.x, s.z, 5, '#8fe36b', '#111'); }); GARAGES.forEach(s => { if (s.team === undefined || s.team === P.team) dot(s.x, s.z, 5, '#9fd0e8', '#111'); });
  ROBS.forEach((s, i) => { if (tillOpen(i)) dot(s.x, s.z, 5, '#ff5fa2', '#111'); });
  bots.forEach(b => { if (b.dead) return; if (b.team === P.team) dot(b.x, b.z, 3.5, CREWS[b.team].css); else if (b.team === TEAM_COP && P.heat > 0) dot(b.x, b.z, 4, '#5c98ff', '#fff'); }); for (const q in NET.remotes) { const r = NET.remotes[q]; if (!r.dead && r.team === P.team) dot(r.x, r.z, 5, CREWS[r.team].css, '#fff'); }
  dot(P.x, P.z, 6, '#fff', '#111');
  const key = [['#8fe36b', 'Guns'], ['#9fd0e8', 'Repairs and resprays'], ['#ff5fa2', 'A till worth robbing'], ['#fff', 'You']].concat(CREWS.map((q, t) => [q.css, q.name + (t === P.team ? ' · your crew' : '')]));
  g.fillStyle = 'rgba(14,16,20,.82)'; g.fillRect(6, c.height - 12 - key.length * 18, 186, key.length * 18 + 6);
  g.textAlign = 'left'; g.font = '600 13px sans-serif'; key.forEach((q, i) => { const y = c.height - key.length * 18 + i * 18; g.beginPath(); g.arc(18, y, 5, 0, TAU); g.fillStyle = q[0]; g.fill(); g.fillStyle = '#f2efe6'; g.fillText(q[1], 30, y + 1); });
}
function drawBoard() {
  const el = $('board'), cell = (tr, tag, x) => { const c = document.createElement(tag); c.textContent = x; tr.appendChild(c); return c; }, head = (box, l, r) => { const h = document.createElement('h3'), a = document.createElement('span'), b = document.createElement('span'); a.textContent = l; b.textContent = r; h.append(a, b); box.appendChild(h); }; el.textContent = '';
  // who is in the city
  { const box = document.createElement('div'); box.className = 'c' + P.team; let mates = 0; bots.forEach(o => { if (o.team === P.team && !o.dead && !o.temp) mates++; }); head(box, CREWS[P.team].name, mates + ' on the street');
    const tb = document.createElement('table'), rows = [[P.name + ' (you)', P.kills | 0, P.deaths | 0, P.heat | 0, true]]; for (const q in NET.remotes) { const r = NET.remotes[q]; rows.push([r.name, r.kills | 0, r.deaths | 0, r.heat | 0, false]); }
    rows.sort((p, q) => q[1] - p[1]); const hr = document.createElement('tr'); ['Player', 'Kills', 'Deaths', 'Wanted'].forEach(x => cell(hr, 'th', x)); tb.appendChild(hr);
    rows.slice(0, 10).forEach(r => { const tr = document.createElement('tr'); if (r[4]) tr.className = 'me'; cell(tr, 'td', r[0]); cell(tr, 'td', r[1]); cell(tr, 'td', r[2]); cell(tr, 'td', r[3] ? '★'.repeat(r[3]) : '–'); tb.appendChild(tr); }); box.appendChild(tb); el.appendChild(box); }
  // who holds what
  { const box = document.createElement('div'); let mine = 0; ZS.forEach(s => { if (s.owner === P.team) mine++; }); head(box, 'Turf', mine + ' of ' + ZONES.length);
    const tb = document.createElement('table'), hr = document.createElement('tr'); ['Turf', 'Held by'].forEach(x => cell(hr, 'th', x)); tb.appendChild(hr);
    ZONES.forEach((z, i) => { const s = ZS[i], tr = document.createElement('tr'); cell(tr, 'td', z.id + ' · ' + z.name); const c = cell(tr, 'td', s.owner < 0 ? 'Nobody' : CREWS[s.owner].name + (s.hot ? ' · under fire' : '')); if (s.owner >= 0) c.style.color = CREWS[s.owner].css; tb.appendChild(tr); }); box.appendChild(tb); el.appendChild(box); }
  const f = document.createElement('div'); f.className = 'foot'; f.textContent = `No rounds, no clock. Four crews, ten turfs. Each turf your crew holds pays $${CFG.pay.turf} a minute; a rival is worth $${CFG.pay.kill} and their chain $${CFG.pay.chain}. Stars bring the police: stay out of their sight to shake them, or respray the car at a garage.`; el.appendChild(f);
}
const AREAS = [['North End', 'North End', 'Northgate', 'Northgate Yard', 'Midtown', 'Uptown', 'Port North'], ['Ember Row', 'The Courts', 'Uptown Market', 'Midtown', 'Civic Square', 'Calder Avenue', 'Tidewater Yard'], ['Ember Row', 'Library Hill', 'Lakeside Plaza', 'Calder Mall', 'Midtown', 'Calder Ave Station', 'Port North'],
  ['Ember Row Yard', 'Ember Row', 'The Corner', 'Founders Park', 'Southbank', 'Southbank', 'The Docks'], ['Ember Row', 'Calder Homes', 'Southbank', 'Southbank', 'Gas & Auto Row', 'The Foundry', 'The Docks'], ['West End', 'West End', 'Steeple Street', 'Southbank', 'The Steelyard', 'Steelyard', 'The Docks']];
// the turf strip: one square per turf, in the colour of whoever holds it
{ const zs = $('turf').querySelector('.zs'); ZONES.forEach((z, i) => { const b = document.createElement('b'); b.id = 't-z' + i; b.textContent = z.id; zs.appendChild(b); }); }
let radarT = 0, areaT = 0, areaNow = '', hereZone = -1;
function updateHud(dt) {
  const d = WEAPONS[P.wpn], w = P.inv[P.wpn] || { mag: 0, res: 0 };
  setHud('h-cash', '$' + Math.max(0, Math.round(P.cash)).toLocaleString('en-US'));
  setHud('h-weapon', d.name + (P.reloadT > 0 ? ' · reloading' : ''));
  setHud('h-ammo', d.melee ? '' : `${w.mag}<small> / ${w.res}</small>`, true);
  setHud('h-nades', 'GRENADES ' + '●'.repeat(P.nades) + '○'.repeat(Math.max(0, 4 - P.nades)));
  { const v = P.driveby ? 1 : 0; if (hudCache.streak !== v) { hudCache.streak = v; $('h-streak').hidden = !v; } }
  { const hp = Math.round(clamp(P.hp / CFG.player.hp, 0, 1) * 50), ar = Math.round(clamp(P.armor / CFG.player.armor, 0, 1) * 50); if (hudCache.hp !== hp) { hudCache.hp = hp; $('hp-fill').style.transform = `scaleX(${hp / 50})`; $('hp-fill').className = hp < 15 ? 'low' : ''; } if (hudCache.ar !== ar) { hudCache.ar = ar; $('ar-fill').style.transform = `scaleX(${ar / 50})`; } }
  setHud('t-time', Math.floor(G.tod) + ':' + String(Math.floor(G.tod % 1 * 60)).padStart(2, '0'));
  { const h = P.heat | 0, key = h * 2 + (P.evade && h ? 1 : 0); if (hudCache.heat !== key) { const was = (hudCache.heat | 0) >> 1; hudCache.heat = key; const e = $('h-stars'); e.hidden = !h; e.textContent = '★'.repeat(h) + '☆'.repeat(5 - h); e.className = P.evade && h ? 'evade' : '';
      if (h > was) { SFX.star(); if (!was) note('Wanted: the police are on their way', 'p'); } else if (!h && was && !P.dead) { SFX.clear(); note('The police have lost you', 'g'); } } }
  hereZone = -1; ZONES.forEach((z, i) => { const s = ZS[i], here = !P.dead && hyp(P.x - z.x, P.z - z.z) < z.r, c = (s.owner >= 0 ? 't' + s.owner : '') + (s.hot ? ' hot' : '') + (here ? ' here' : ''); if (here) hereZone = i; if (hudCache['z' + i] !== c) { hudCache['z' + i] = c; $('t-z' + i).className = c; } });
  { const show = hereZone >= 0 && G.phase === 'play'; if (hudCache.cap !== show) { hudCache.cap = show; $('cap').hidden = !show; }
    if (show) { const s = ZS[hereZone], mine = s.owner === P.team, work = s.prog > .005 && s.by >= 0, f = $('cap-fill'), tr = $('cap-track');   // the bar fills in the colour of the crew at work on it, over the colour of whoever holds it
      setHud('cap-label', (work && s.by === P.team ? (s.owner >= 0 ? 'Breaking their hold · ' : 'Taking · ') : work && mine ? 'Losing · ' : s.hot ? 'Contested · ' : mine ? 'Holding · ' : s.owner >= 0 ? CREWS[s.owner].name + ' turf · ' : 'Nobody holds · ') + ZONES[hereZone].name);
      const c = work ? Math.round(s.prog * 100) : 0, key = c + (s.by + 1) * 1000 + (s.owner + 1) * 10000; if (hudCache.capv !== key) { hudCache.capv = key; f.style.width = c + '%'; f.style.background = work ? CREWS[s.by].css : 'transparent'; tr.style.background = s.owner >= 0 ? 'rgba(' + CREWS[s.owner].rgb + ',.45)' : 'rgba(10,12,16,.75)'; } } }
  setHud('h-prompt', prompt && !shopOpen ? prompt.text : P.enter ? '' : '', true);
  { const c = P.car, show = !!c; if (hudCache.spd !== show) { hudCache.spd = show; $('h-speed').hidden = !show; } if (c) { setHud('spd-n', String(Math.round(carSpeed(c) * 2.237))); setHud('h-car', (c.cop ? 'Police ' : '') + c.spec.name + (P.seat ? ' · passenger' : '') + (c.cop && !P.seat ? ' · H siren' : '')); const h = Math.round(clamp(c.hp / c.spec.hp, 0, 1) * 40); if (hudCache.chp !== h) { hudCache.chp = h; $('car-fill').style.transform = `scaleX(${h / 40})`; $('car-fill').style.background = h < 12 ? 'var(--blood)' : 'var(--gold)'; } } }
  { const fp = firstPerson(), sc = (1 + P.kick * 3 + Math.min(1, P.spd / 5) * .35).toFixed(2), op = P.dead || scoped() || d.melee && !fp ? '0' : (P.car ? .6 : fp ? .85 * (1 - P.ads) : .85).toFixed(1); if (hudCache.cs !== sc) { hudCache.cs = sc; $('cross').style.transform = `scale(${sc})`; } if (hudCache.co !== op) { hudCache.co = op; $('cross').style.opacity = op; } }
  hitT -= dt; { const o = hitT > 0 ? '1' : '0'; if (hudCache.hit !== o) { hudCache.hit = o; $('hitm').style.opacity = o; } }
  { const v = (clamp(1 - P.hp / CFG.player.hp, 0, 1) * (G.time - P.lastHit < 4 || P.hp < 40 ? 1 : .35)).toFixed(2); if (hudCache.vg !== v) { hudCache.vg = v; $('vign').style.opacity = v; } }
  flashA = Math.max(0, flashA - dt * 1.6); { const v = flashA.toFixed(2); if (hudCache.fl !== v) { hudCache.fl = v; $('flash').style.opacity = v; } }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('h-banner').classList.remove('on'); }
  if (P.hints && P.hints.length && G.time - P.hintAt > P.hints[0][0]) note(P.hints.shift()[1], 'g');
  for (let i = dmgArrows.length - 1; i >= 0; i--) { const a = dmgArrows[i]; a.t -= dt; a.el.style.opacity = String(Math.max(0, a.t / .9)); if (a.t <= 0) { a.el.remove(); dmgArrows.splice(i, 1); } }
  for (let i = feedRows.length - 1; i >= 0; i--) { const f = feedRows[i]; f.t -= dt; if (f.t < 1) f.row.style.opacity = String(Math.max(0, f.t)); if (f.t <= 0) { f.row.remove(); feedRows.splice(i, 1); } }
  if (P.dead) setHud('dead-sub', (P.deadMsg || '') + (G.phase === 'play' ? ' · back in ' + Math.max(0, Math.ceil(CFG.respawn - P.deadT)) : ''));
  // which part of town this is, shown for a moment when it changes
  { const i = clamp(Math.floor((P.x - EDGE) / PX), 0, NX - 1), j = clamp(Math.floor((P.z - EDGE) / PZ), 0, NZ - 1), nm = AREAS[j][i]; if (nm !== areaNow) { areaNow = nm; const zi = ZONES.findIndex(z => z.name === nm || hyp(z.x - RX(i) - PX / 2, z.z - RZ(j) - PZ / 2) < 45), s = zi >= 0 ? ZS[zi] : null; $('h-area').innerHTML = ''; $('h-area').append(nm); const sm = document.createElement('small'); sm.textContent = s ? (s.owner < 0 ? 'Turf ' + ZONES[zi].id + ' · nobody holds it' : 'Turf ' + ZONES[zi].id + ' · ' + CREWS[s.owner].name) : 'Port Calder'; $('h-area').appendChild(sm); $('h-area').classList.add('on'); areaT = 3.2; } if (areaT > 0) { areaT -= dt; if (areaT <= 0) $('h-area').classList.remove('on'); } }
  radarT -= dt; if (radarT <= 0) { radarT = 1 / 30; drawRadar(); if (!$('bigmap').hidden) drawBigMap(); }
  if (DBG.stats) setHud('h-dev', `fps ${DBG.fps.toFixed(0)}  calls ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k\nbots ${bots.length}  cars ${cars.length}  people ${chars.length}\nnet ${NET.mode || 'solo'}  ${NET.bytes} B  slot ${NET.slot}\npos ${P.x.toFixed(1)} ${P.y.toFixed(1)} ${P.z.toFixed(1)}  ${G.tod.toFixed(1)}h`); else setHud('h-dev', '');
}
