/* =====================================================================
   14. INPUT, MENUS, LOOP
   ===================================================================== */
let wasLocked = false;
const locked = () => document.pointerLockElement === canvas;
function requestLock() { if (TEST || TOUCH.on) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
let SENS = .0022; try { const s = +localStorage.getItem('pc-sens'); if (s > .0004 && s < .01) SENS = s; } catch (e) {}
function showOverlay(mode) {
  const o = $('overlay'); o.hidden = false; $('hud').hidden = mode !== 'paused'; $('o-stats').hidden = true; $('leave').hidden = mode !== 'paused';
  const inGame = mode === 'paused'; o.querySelector('.crews').hidden = inGame; $('row-lobby').hidden = inGame; $('co-status').hidden = inGame; $('set-box').hidden = inGame; $('set-bots').disabled = $('set-cops').disabled = $('set-sides').disabled = false; if (inGame) $('co-roster').hidden = true;
  if (mode === 'paused') { $('o-eyebrow').textContent = 'Paused'; $('o-text').textContent = NET.mode ? 'The city keeps moving while this menu is open.' : 'The city waits.'; $('deploy').textContent = 'Resume'; $('deploy').hidden = false;
    let turf = 0; ZS.forEach(z => { if (z.owner === P.team) turf++; }); $('o-stats').hidden = false; $('o-stats').innerHTML = `<span>Cash <b>$${Math.max(0, Math.round(P.cash)).toLocaleString('en-US')}</b></span><span>Turf <b>${turf} of ${ZONES.length}</b></span><span>Hourly <b>$${hourlyNow().toLocaleString('en-US')}</b></span><span>Kills <b>${P.kills | 0}</b></span>`; $('row-save').hidden = true; return; }
  $('row-save').hidden = false; saveLine();
  $('deploy').textContent = 'Play solo'; $('deploy').hidden = !!NET.lob; crewLock(false);
  if (mode === 'lost') { $('o-eyebrow').textContent = 'Session closed'; $('o-text').textContent = 'The host left, so the session closed. Open a new lobby or play solo. Your cash and guns are kept.'; }
  else { $('o-eyebrow').textContent = 'Open world · six crews and the police · solo or online'; $('o-text').textContent = MENU_TEXT; }
  if (!NET.mode) NET.lobby();
}
const MENU_TEXT = $('o-text').textContent;
// what the player looks like and which side the menu shows; setCrew is the player choosing, wearCrew is being told
// one button per crew, built from the crew table
CREWS.forEach((c, t) => { const b = document.createElement('button'), n = document.createElement('b'), d = document.createElement('small'), m = document.createElement('i'); b.className = 'crew c' + t; b.id = 'crew' + t; b.type = 'button'; b.style.setProperty('--c', c.edge); b.style.setProperty('--c-rgb', c.halo ? '207,212,219' : c.rgb); b.setAttribute('aria-pressed', 'false');
  n.textContent = c.name; d.textContent = c.side + '. Holds ' + c.holds + '.'; m.textContent = 'YOUR CREW'; b.append(n, d, m); b.addEventListener('click', () => setCrew(t)); $('crews').appendChild(b); });
{ const b = document.createElement('button'), n = document.createElement('b'), d = document.createElement('small'), m = document.createElement('i'); b.className = 'crew c' + TEAM_COP + ' cop'; b.id = 'crew' + TEAM_COP; b.type = 'button'; b.style.setProperty('--c', COPSIDE.edge); b.style.setProperty('--c-rgb', COPSIDE.rgb); b.setAttribute('aria-pressed', 'false');
  n.textContent = 'Police'; d.textContent = 'Port Calder PD. A wage, pay for every gangster you take down, a cruiser and backup. No turf.'; m.textContent = 'YOUR SIDE'; b.append(n, d, m); b.addEventListener('click', () => setCrew(TEAM_COP)); $('crews').appendChild(b); }
const SIDE_IDS = CREWS.map((c, t) => t).concat([TEAM_COP]);
function crewLock(v) { SIDE_IDS.forEach(t => { $('crew' + t).disabled = v; }); $('crew' + TEAM_COP).disabled = v || (!!NET.lob && !G.rivals && !NET.lob.lead); }
function wearCrew(t) { P.team = sideOf(t); SIDE_IDS.forEach(q => $('crew' + q).setAttribute('aria-pressed', String(q === P.team))); setLook(meChar, makeLook(hashStr(myName()) + 3, P.team)); vmSleeve.color.setHex(meChar.look.top); vmSkin.color.setHex(meChar.look.skin); }
const savedCrew = () => { try { const v = localStorage.getItem('pc-crew'); if (v !== null && v !== '' && ((+v >= 0 && +v < NCREW) || +v === TEAM_COP)) return +v | 0; } catch (e) {} return -1; };
const ownCrew = () => { const c = savedCrew(); if (c >= 0 && c !== P.team) wearCrew(c); };   // back to the crew this player picks for themselves
function setCrew(t) { wearCrew(t); try { localStorage.setItem('pc-crew', String(P.team)); } catch (e) {} NET.say(); if (!NET.mode) NET.lobby(); }
// --- progress. Cash, guns, armor and the city's turf are written to this browser a moment after anything changes, and, on the Claude
//     page, to the player's own account as well, so they follow the player to any device signed in to it. A save code carries them
//     anywhere else. Turf keeps paying while the player is away, up to a limit.
function loadSave() { try { const s = JSON.parse(localStorage.getItem('pc-save') || 'null'); if (s && isFinite(s.c)) return s; } catch (e) {} return null; }
function saveData() {
  const old = loadSave() || {}, world = AUTH() && G.phase === 'play';                                 // the city is only this player's to save when their machine runs it
  return { v: 4, t: Date.now(), c: Math.max(0, Math.round(P.cash)), w: Object.keys(P.inv).filter(id => !WEAPONS[id].melee && id !== 'pistol'), n: P.nades | 0, a: Math.round(P.armor), cr: P.team, z: world ? ZS.map(s => [s.owner, Math.round(s.ctrl)]) : old.z || null,
    rp: Math.round(P.rp || 0), b: [...P.biz], pv: P.pv || null, sw: P.inv.glocks && P.inv.glocks.sw ? 1 : 0, lab: P.lab ? [P.lab.site, P.lab.stock, P.lab.sup === undefined ? 60 : P.lab.sup, P.lab.up | 0, P.lab.dealers || []] : null, ac: P.air || null };
}
function writeSave(d) { try { localStorage.setItem('pc-save', JSON.stringify(d)); } catch (e) {} CLOUD.put(d); }
function saveGame() { if (G.state === 'menu' || !SAVE.live) return; SAVE.lastC = Math.round(P.cash); SAVE.lastR = Math.round(P.rp || 0); writeSave(saveData()); }
const pvOk = v => !!v && typeof v === 'object' && !!CARS[v.t] && !CARS[v.t].air && ALLPAINT.includes(v.c), acOk = v => !!v && typeof v === 'object' && !!CARS[v.t] && !!CARS[v.t].air && ALLPAINT.includes(v.c);   // a car on file that this game can build
const SAVE = { live: false, lastC: -1, lastR: -1 };
const CLOUD = { ref: null, busy: false, pend: null, last: '' };
const later = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
CLOUD.init = async () => {
  try { if (!window.claude || !window.claude.use) return; const u = await later(window.claude.use('user'), 12000), db = u && await later(window.claude.use('db'), 12000); if (!u || !db) return;
    const id = await later(u.id(), 8000); if (!id) return; const ref = db.doc('data/users/' + id + '/save'), snap = await later(ref.get(), 12000); if (!snap) return;
    CLOUD.ref = ref; if (snap.exists) CLOUD.adopt(snap.data()); else { const l = loadSave(); if (l) CLOUD.put(l); } saveLine();
  } catch (e) {}
};
// the account and this browser compare notes: whichever saved last wins, and the other catches up
CLOUD.adopt = d => {
  if (!d || !isFinite(d.c)) return; const l = loadSave(); if (l && (l.t || 0) >= (d.t || 0)) { if ((l.t || 0) > (d.t || 0)) CLOUD.put(l); return; }
  try { localStorage.setItem('pc-save', JSON.stringify(d)); } catch (e) {}
  if (G.state !== 'menu' && SAVE.live) { P.bank = clamp(Math.round(d.c), 0, 1e7); (d.w || []).forEach(w => { if (WEAPONS[w] && !WEAPONS[w].melee && !P.inv[w]) giveWeapon(w); });
    if (+d.rp > (P.rp || 0)) { P.rp = Math.round(+d.rp); P.rank = rankOf(P.rp); } if (Array.isArray(d.b)) d.b.forEach(k => P.biz.add(String(k))); if (!P.pv && pvOk(d.pv)) P.pv = d.pv; note('Progress brought over from your account', 'g'); }
};
CLOUD.put = d => { if (!CLOUD.ref) return; CLOUD.pend = d; if (!CLOUD.busy) CLOUD.flush(); };
CLOUD.flush = async () => {   // one write at a time, only when something other than the clock changed, at most every ten seconds
  CLOUD.busy = true;
  try { while (CLOUD.pend && CLOUD.ref) { const d = CLOUD.pend; CLOUD.pend = null; const key = JSON.stringify(Object.assign({}, d, { t: 0 })); if (key === CLOUD.last) continue;
      try { await CLOUD.ref.set(d); CLOUD.last = key; } catch (e) { const c = e && e.code; if (c === 'invalid_argument' || c === 'revoked' || c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed' || c === 'quota_exceeded') { CLOUD.ref = null; saveLine(); break; } CLOUD.pend = CLOUD.pend || d; }
      await new Promise(r => setTimeout(r, 10000)); } } finally { CLOUD.busy = false; }
};
function saveLine() { const e = $('save-line'); if (!e) return; const s = loadSave(); e.textContent = (s ? '$' + Math.round(s.c).toLocaleString('en-US') + ' saved · ' : '') + (CLOUD.ref ? 'kept in your Claude account, on every device you sign in on' : 'kept in this browser · a save code moves it to another device'); }
// a save code: the save itself, readable by this game alone, with a check so a typo is caught
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const sum36 = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
function saveCode() { const d = loadSave() || { c: CFG.startCash, w: [], n: 1, a: 0, cr: P.team, z: null }, j = JSON.stringify({ c: d.c, w: d.w || [], n: d.n | 0, a: d.a | 0, cr: d.cr | 0, z: d.z || null, t: d.t || Date.now(), rp: d.rp | 0, b: d.b || [], pv: d.pv || null }); return 'PC-' + b64e(j) + '-' + sum36(j); }
function readCode(code) { const m = /^PC-([A-Za-z0-9_-]+)-([0-9a-z]+)$/.exec(String(code || '').replace(/\s+/g, '')); if (!m) return null; try { const j = b64d(m[1]); if (sum36(j) !== m[2]) return null; const d = JSON.parse(j); return d && isFinite(d.c) && d.c >= 0 ? d : null; } catch (e) { return null; } }
const readSettings = () => { G.botsPer = +$('set-bots').value || 4; G.cops = $('set-cops').value !== '0'; G.rivals = $('set-sides').value === '1'; };
function beginPlay() {
  const sv = loadSave(); P.name = myName(); wearCrew(P.team); resetLoadout(); if (sv) { (sv.w || []).forEach(id => { if (WEAPONS[id] && !WEAPONS[id].melee) giveWeapon(id); }); P.nades = clamp(sv.n | 0, 1, 6); if (sv.sw && P.inv.glocks) P.inv.glocks.sw = true; }
  // what the player's turf made while they were away: an hour of income for every real hour, at most eight
  P.lab = sv && Array.isArray(sv.lab) && LABS[sv.lab[0] | 0] ? { site: sv.lab[0] | 0, stock: clamp(sv.lab[1] | 0, 0, LAB.capBig), prog: 0, at: G.time, sup: sv.lab[2] === undefined ? 60 : clamp(sv.lab[2] | 0, 0, 100), up: (sv.lab[3] | 0) & 15, dealers: Array.isArray(sv.lab[4]) ? sv.lab[4].filter(z => ZS[z | 0]).slice(0, 3) : [] } : null;
  if (P.lab && sv.t) { const made = Math.min(Math.floor(Math.min(CFG.offline.cap, (Date.now() - sv.t) / 3.6e6) * 2), Math.floor(P.lab.sup / LAB.supPer)); if (made > 0) { const was = P.lab.stock; P.lab.stock = Math.min(labCap(), was + made); P.lab.sup -= (P.lab.stock - was) * LAB.supPer; if (P.lab.stock > was) P.hints.unshift([4.5, 'Your lab made ' + (P.lab.stock - was) + ' units while you were away']); } }   // two units an hour while you are away
  P.rp = sv ? clamp(Math.round(+sv.rp || 0), 0, 9e7) : 0; P.rank = rankOf(P.rp); P.biz = new Set(sv && Array.isArray(sv.b) ? sv.b.map(String) : []); P.pv = sv && pvOk(sv.pv) ? sv.pv : null; P.pvAsk = P.pv ? G.time + 2.5 : 0; P.garage = null; P.air = sv && acOk(sv.ac) ? sv.ac : null; P.chute = 0; P.flown = false;
  let away = 0; if (sv && sv.t && Array.isArray(sv.z)) { const hrs = Math.min(CFG.offline.cap, (Date.now() - sv.t) / 3.6e6); if (hrs > .25) { let per = 0; sv.z.forEach((q, i) => { if (q && q[0] === sv.cr && ZONES[i]) per += ZONES[i].val * (.5 + .5 * clamp(+q[1] || 0, 0, 100) / 100); });
      BIZ.forEach(b => { const q = sv.z[b.hood]; if (P.biz.has(b.key) && q && q[0] === sv.cr) per += b.pay; }); away = Math.round(per * CFG.offline.rate * hrs / 10) * 10; } }   // businesses on turf the crew still held kept trading too
  Object.assign(P, { bank: (sv ? clamp(Math.round(sv.c), 0, 1e7) : CFG.startCash) + away, armor: sv ? clamp(sv.a | 0, 0, 100) : 0, earn: 0, spent: 0, kills: 0, deaths: 0, streak: 0, driveby: false, dead: false, shots: 0, car: null, enter: null, heat: 0, wp: 0, evade: false, rob: null, siren: false }); P.cash = P.bank;
  hudCache.heat = 0; $('h-stars').hidden = true; closeShop(); $('dead').hidden = true; $('board').hidden = true; $('bigmap').hidden = true;
  GAME.respawn(true); G.state = 'playing'; $('overlay').hidden = true; $('hud').hidden = false; wasLocked = false; requestLock();
  banner('Port Calder', P.team === TEAM_COP ? 'You are on the force · Port Calder PD' : 'You run with ' + CREWS[P.team].name + ' · the city is open', 3.5, 't' + P.team);
  P.hintAt = G.time; P.hints = TOUCH.on ? [[5, 'Left thumb moves · drag on the right to look · USE takes a car'], [13, 'Every block is somebody\'s turf: bleed a crew on its own streets, then take its ring'], [22, 'Icons on the map are jobs: trucks, hits, stashes, races']]
    : [[5, capOf('use') + ' takes any car · ' + capOf('board') + ' shows turf · ' + capOf('map') + ' opens the map'], [13, 'Every block is somebody\'s turf: bleed a crew on its own streets, then take its ring'], [22, 'Icons on the map are jobs: trucks, hits, stashes, races']];
  if (!sv) P.hints.push([31, capOf('phone') + ' opens your phone: call homies, the mechanic, the fixer, or line up work']);
  SAVE.live = true; if (away > 0) { P.hints.unshift([3.6, 'While you were away your turf made $' + away.toLocaleString('en-US')]); gain(away); } saveGame(); P.hp = maxHp();
}
function startAttract() { readSettings(); startWorld({ x: ZONES[1].x + 18, z: ZONES[1].z }); G.phase = 'attract'; P.dead = true; P.deadT = 99; hideChar(meChar); }   // the menu looks out over The Corner, so that is where the city gathers
function pause() { if (G.state !== 'playing') return; G.state = 'paused'; mouse.down = mouse.right = false; ADS.on = false; for (const k in keys) keys[k] = false; for (const k in TACT) TACT[k] = false; saveGame(); showOverlay('paused'); }
function leaveSession() { saveGame(); SAVE.live = false; if (NET.mode) NET.stop(); if (document.pointerLockElement) document.exitPointerLock(); G.state = 'menu'; ownCrew(); showOverlay('menu'); startAttract(); }
$('deploy').addEventListener('click', () => {
  initAudio();
  if (G.state === 'paused') { G.state = 'playing'; $('overlay').hidden = true; $('hud').hidden = false; wasLocked = false; requestLock(); return; }
  if (NET.lob) lobbySet(null);
  readSettings(); G.solo = true; startWorld(); beginPlay();
});
$('leave').addEventListener('click', leaveSession);
$('set-bots').addEventListener('change', () => { readSettings(); NET.say(); }); $('set-cops').addEventListener('change', () => { readSettings(); NET.say(); }); $('set-sides').addEventListener('change', () => { readSettings(); NET.say(); NET.lobby(); });
$('set-view').addEventListener('change', () => { P.view = +$('set-view').value === 1 ? 1 : 3; try { localStorage.setItem('pc-view', String(P.view)); } catch (e) {} });
$('set-gfx').addEventListener('change', () => { GFX.low = $('set-gfx').value === 'low'; try { localStorage.setItem('pc-gfx', GFX.low ? 'low' : 'high'); } catch (e) {} applyGfx(); resize(); });
$('co-host').addEventListener('click', () => lobbySet({ lead: true, ready: true }));
$('co-join').addEventListener('click', () => { if (NET.room && NET.room.peers().some(p => !(p.isMe && p.sameTab) && p.presence && p.presence.t === 'h')) coopBegin('client'); else lobbySet({ lead: false, ready: false }); });
$('co-ready').addEventListener('click', () => { if (NET.lob) lobbySet({ lead: NET.lob.lead, ready: !NET.lob.ready }); });
$('co-start').addEventListener('click', () => { if (NET.lob && NET.lob.lead) { readSettings(); coopBegin('host'); } });
$('co-leave').addEventListener('click', () => { ownCrew(); lobbySet(null); });
try { $('co-name').value = cleanName(localStorage.getItem('pc-name') || '').replace(/^Player$/, ''); if (savedCrew() >= 0) P.team = savedCrew(); if (localStorage.getItem('pc-view') === '1') P.view = 1; } catch (e) {}
$('set-view').value = String(P.view); $('set-gfx').value = GFX.low ? 'low' : 'high';
$('co-name').addEventListener('change', () => { try { localStorage.setItem('pc-name', myName()); } catch (e) {} NET.say(); if (!NET.mode) NET.lobby(); });
$('co-name').addEventListener('keydown', e => e.stopPropagation());
document.addEventListener('pointerlockchange', () => { if (locked()) wasLocked = true; else if (wasLocked && G.state === 'playing') pause(); });
canvas.addEventListener('mousedown', e => {
  if (G.state !== 'playing') return; if (!locked()) requestLock(); if (e.button > 2) e.preventDefault();
  inputDown('Mouse' + e.button, true);
});
window.addEventListener('mouseup', e => { if (e.button > 2 && G.state === 'playing') e.preventDefault(); inputUp('Mouse' + e.button); });
canvas.addEventListener('auxclick', e => e.preventDefault());
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousemove', e => {
  if (G.state !== 'playing' || (!locked() && !TEST)) return;
  const s = SENS * (firstPerson() || P.ads > .5 ? camera.fov / 72 : 1); P.cyaw -= (e.movementX || 0) * s; P.cpitch = clamp(P.cpitch - (e.movementY || 0) * s, -1.25, 1.35); P.idleCam = 0;
});
canvas.addEventListener('wheel', e => { if (G.state === 'playing') { e.preventDefault(); const c = e.deltaY > 0 ? 'WheelDown' : 'WheelUp'; inputDown(c, true); inputUp(c); } }, { passive: false });
window.addEventListener('keydown', e => {
  if (G.state !== 'playing') { if (e.code === 'Escape' && G.state === 'paused' && TEST) $('deploy').click(); return; }
  if (['Space', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Quote', 'Slash'].includes(e.code) || BYIN[e.code]) e.preventDefault();
  if (e.repeat) return;
  if (shopOpen && /^Digit[0-9]$/.test(e.code)) { const n = e.code.slice(5); buy(n === '0' ? '10' : n); return; }
  if (e.code === 'Escape') { if (shopOpen) closeShop(); else if (!locked()) pause(); return; }
  if (e.code === 'Backquote') { devOpen(); return; }
  if (/^Digit[0-9]$/.test(e.code)) { if (P.dead) return; const n = +e.code.slice(5), id = WID.find(k => WEAPONS[k].slot === (n === 0 ? 9 : n - 1)); if (id) setWeapon(id); return; }   // 1 fists … 6 marksman, 7 Glocks, 8 M60, 9 launcher, 0 bazooka
  if (e.code === 'Minus' || e.code === 'Equal') { SENS = clamp(SENS * (e.code === 'Minus' ? .88 : 1.14), .0006, .008); try { localStorage.setItem('pc-sens', String(SENS)); } catch (x) {} banner('Mouse speed ' + Math.round(SENS / .0022 * 100) + '%', '', 1); return; }
  inputDown(e.code, true);   // everything else goes through the bindings on the Controls page
});
window.addEventListener('keyup', e => inputUp(e.code));
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in TACT) TACT[k] = false; mouse.down = false; if (!ADS.on) mouse.right = false; setHorn(false); $('board').hidden = true; $('bigmap').hidden = true; });
function resize() { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = vmCam.aspect = w / h; camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix(); }
window.addEventListener('resize', resize);

/* ---- dev menu: ` while playing ---- */
const DEV_FLAGS = { god: 'dv-god', ammo: 'dv-ammo', freeze: 'dv-freeze', stats: 'dv-stats', nav: 'dv-nav', notarget: 'dv-notarget' };
let navLines = null;
function devSet(k, v) {
  DBG[k] = v; const el = $(DEV_FLAGS[k]); if (el) el.checked = v;
  if (k === 'nav') { if (v && !navLines) { const pts = []; NAV.forEach(n => n.e.forEach(e => { if (e[0] > n.i) { const m = NAV[e[0]]; pts.push(new T.Vector3(n.x, n.y + .4, n.z), new T.Vector3(m.x, m.y + .4, m.z)); } })); navLines = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fe36b })); scene.add(navLines); } if (navLines) navLines.visible = v; }
}
function devOpen() { if (G.state !== 'playing') return; G.state = 'dev'; mouse.down = mouse.right = false; ADS.on = false; for (const k in keys) keys[k] = false; for (const k in TACT) TACT[k] = false; if (locked()) document.exitPointerLock(); $('dev').hidden = false; $('dv-tod').value = String(G.tod); }
function devClose() { if (G.state !== 'dev') return; $('dev').hidden = true; G.state = 'playing'; wasLocked = false; requestLock(); }
Object.keys(DEV_FLAGS).forEach(k => $(DEV_FLAGS[k]).addEventListener('change', e => devSet(k, e.target.checked)));
CID.forEach(id => $('dv-car').add(new Option(CARS[id].name + ' (' + id + ')', id)));
const TELEPORTS = {}; ZONES.forEach(z => { TELEPORTS['Turf ' + z.id + ' · ' + z.name] = [z.x + 4, z.id === 'D' ? 0 : CURB, z.z + 6]; }); CREWS.forEach((c, t) => { TELEPORTS[c.name + ' yard'] = [SPAWNS[t][0].x, CURB, SPAWNS[t][0].z]; }); TELEPORTS['Station platform'] = [LINE.x + 9, LINE.y1, LINE.sz + 6]; TELEPORTS['Mall, upper floor'] = [ZONES[2].x + 6.2, CURB + 5.2, ZONES[2].z - 14];
SHOPS.forEach((s, i) => { TELEPORTS['Shop ' + (i + 1) + ' · ' + s.name] = [s.x + 1.5, CURB, s.z + 1.5]; });
Object.keys(TELEPORTS).forEach(id => $('dv-tp').add(new Option(id, id)));
const devOn = (id, fn) => $(id).addEventListener('click', fn);
devOn('dv-cash', () => { P.earn += 5000; });
devOn('dv-star', () => { if (AUTH()) GAME.crime(P, 0, Math.min(5, (P.heat | 0) + 1)); }); devOn('dv-clear', () => { if (AUTH()) GAME.clearHeat(P); });
devOn('dv-wipe', () => { try { localStorage.removeItem('pc-save'); } catch (e) {} CLOUD.put({ v: 4, t: Date.now(), c: CFG.startCash, w: [], n: 1, a: 0, cr: P.team, z: null, rp: 0, b: [], pv: null }); resetLoadout(); P.rp = 0; P.rank = 1; P.biz.clear(); P.pv = null; P.bank = CFG.startCash; P.earn = 0; P.spent = 0; });
// the save buttons on the menu
$('sv-copy').addEventListener('click', () => { const code = saveCode(), done = () => { $('save-line').textContent = 'Save code copied. On the other device: Load save code, then paste it.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => window.prompt('Your save code. Copy it:', code)); else window.prompt('Your save code. Copy it:', code); });
$('sv-load').addEventListener('click', () => { const code = window.prompt('Paste a save code'); if (code === null) return; const d = readCode(code); if (!d) { $('save-line').textContent = 'That save code did not work. Check it was copied whole.'; return; }
  d.v = 4; d.t = Date.now(); writeSave(d); $('save-line').textContent = 'Loaded · $' + Math.round(d.c).toLocaleString('en-US') + (d.w && d.w.length ? ' and ' + d.w.length + (d.w.length === 1 ? ' gun' : ' guns') : '') + (d.rp ? ' · rank ' + rankOf(d.rp) : '') + '. Play to pick it up.'; if (!NET.mode) startAttract(); });
$('sv-reset').addEventListener('click', () => { if (!window.confirm('Start over? Your cash, guns and turf go back to the beginning. This cannot be undone.')) return; try { localStorage.removeItem('pc-save'); } catch (e) {} CLOUD.put({ v: 4, t: Date.now(), c: CFG.startCash, w: [], n: 1, a: 0, cr: P.team, z: null, rp: 0, b: [], pv: null }); saveLine(); if (!NET.mode) startAttract(); }); devOn('dv-guns', () => { WID.forEach(id => giveWeapon(id)); P.nades = 4; }); devOn('dv-heal', () => { P.hp = maxHp(); P.armor = 100; }); devOn('dv-streak', () => { P.driveby = true; });
devOn('dv-spawncar', () => { if (!AUTH()) return; const fx = -Math.sin(P.cyaw), fz = -Math.cos(P.cyaw); spawnCar($('dv-car').value, P.x + fx * 6, P.z + fz * 6, P.cyaw, {}); });
devOn('dv-go', () => { const t = TELEPORTS[$('dv-tp').value]; if (P.car) GAME.leaveCar(false); P.x = t[0]; P.y = P.camY = t[1]; P.z = t[2]; P.vy = 0; });
$('dv-tod').addEventListener('input', e => { if (AUTH()) G.tod = +e.target.value; const h = +e.target.value; $('dv-todv').textContent = Math.floor(h) + ':' + String(Math.round(h % 1 * 60)).padStart(2, '0'); });
$('dv-scale').addEventListener('input', e => { DBG.scale = +e.target.value; $('dv-scalev').textContent = DBG.scale + 'x'; });
devOn('dv-close', devClose);
window.addEventListener('keydown', e => { if (e.code === 'Backquote' && G.state === 'dev') { e.preventDefault(); devClose(); } });

/* ---- the loop ---- */
function step(dt) {
  G.time += dt;
  if (G.state !== 'menu') { inputTick(); updatePlayer(dt); updateRace(dt); }
  if (NET.mode === 'client') NET.client(dt); else { authTick(dt); if (NET.mode === 'host' && NET.room) NET.host(dt); }
  updateGrenades(dt); updateProj(dt);
}
let todT = 0, slowT = 0, menuA = 0, saveT = 15;
function visuals(dt, now) {
  todT -= dt; if (todT <= 0) { todT = .2; applyTod(G.tod); }
  if (G.state === 'menu') { menuA += dt * .05; const z = ZONES[1], r = 62; camera.position.set(z.x + 40 + Math.sin(menuA) * r, 26 + Math.sin(menuA * .7) * 5, z.z + Math.cos(menuA) * r); camera.rotation.set(-.3, menuA + .5, 0); if (Math.abs(camera.fov - 62) > .1) { camera.fov = 62; camera.updateProjectionMatrix(); } skyDome.position.copy(camera.position); EAR.x = camera.position.x; EAR.y = 200; EAR.z = camera.position.z; vmRoot.visible = false; }
  else { touchAssist(dt); updateCamera(dt); updatePlayerLook(dt); }
  updateTouchUi();
  updateSun(G.state === 'menu' ? camera.position.x - Math.sin(menuA + .5) * 50 : P.x, 0, G.state === 'menu' ? camera.position.z - Math.cos(menuA + .5) * 50 : P.z);
  lifePoses(dt);
  for (let i = 0; i < bots.length; i++) botVisual(bots[i], dt);
  for (const k in NET.remotes) remoteVisual(NET.remotes[k], dt);
  flushChars();
  for (let i = 0; i < cars.length; i++) updateCarVisual(cars[i], dt); wheelMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < pickups.length; i++) pickups[i].g.rotation.y += dt * 2;
  updateLife(dt); updateEventMarks(dt); careerTick(dt); heistVisuals(dt); airVisuals(dt); coopVisuals(dt); caseVisuals(dt);
  updateProps(dt); updateMarks(dt); updateTrain(dt); updateFx(dt); updateEngines(dt, G.state === 'menu' ? null : P.car);
  if (G.state !== 'menu') updateHud(dt);
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); if (TEST && window.__PC_MANUAL) return;      // a test is driving the clock itself
  const raw = (now - last) / 1000, dt = Math.min(.05, raw) * DBG.scale; last = now; DBG.fps = lerp(DBG.fps, 1 / Math.max(raw, .001), .05);
  if (canvas.width !== Math.floor(canvas.clientWidth * renderer.getPixelRatio())) resize();
  const live = G.state === 'playing' || G.state === 'menu' || (NET.mode && (G.state === 'paused' || G.state === 'dev'));
  pollPad(raw > .2 ? 0 : Math.min(.05, raw));
  if (live) step(dt);
  visuals(live ? dt : 0, now);
  if (G.state === 'playing') { saveT -= raw; const c = Math.round(P.cash), rp = Math.round(P.rp || 0); if (c !== SAVE.lastC || rp !== SAVE.lastR) { SAVE.lastC = c; SAVE.lastR = rp; saveT = Math.min(saveT, 1.5); } if (saveT <= 0) { saveT = 15; saveGame(); } }   // a moment after the money changes, and every fifteen seconds
  // a machine that cannot keep up drops to the lighter settings by itself, once
  if (G.state === 'playing' && !GFX.low && !GFX.auto && !TEST) { if (DBG.fps < 27) slowT += raw; else slowT = Math.max(0, slowT - raw); if (slowT > 5) { GFX.auto = true; GFX.low = true; $('set-gfx').value = 'low'; applyGfx(); resize(); banner('Graphics set to Low', 'to keep the game smooth · change it in the pause menu', 3.5); } }
  renderer.clear(); renderer.render(scene, camera);
  if (vmRoot.visible) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
}
// a host whose tab is hidden would freeze the city for everyone, so a worker keeps the world ticking while the page is out of sight
let bgWorker = null, bgLast = 0;
function bgTick() { if (!document.hidden || !NET.mode) return; const now = performance.now(); let left = Math.min(.3, (now - bgLast) / 1000); bgLast = now; while (left > .001) { const d = Math.min(.05, left); step(d); left -= d; } }
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); return; } saveGame(); if (!NET.mode) return; bgLast = performance.now(); if (!bgWorker) { try { bgWorker = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 50)'], { type: 'application/javascript' }))); bgWorker.onmessage = bgTick; } catch (e) {} } });
window.addEventListener('pagehide', saveGame);
applyGfx(); resize(); wearCrew(P.team); startAttract(); NET.connect(); CLOUD.init(); saveLine();
if (TEST) window.__pc = { RWY, PLANE_STANDS, stepPlane, isPlane, airItems, AIR_SHOP, casePrompt, CASES, OFFERS, TEXTS, labItems, dealItems, labTick, buyUp, buySups, hireDealer, dealersSell, offerTo, answerOffer, sendText, labCap, unitVal, FENCE, removeCar, BK2, CARGO, JOBS, PREPS, EVTS, jobItems, startJob, startPrep, bankPrompt, prepMask, getaway, inBank, PINGS, pingHere, canGoDown, goDown, revivePrompt, mateSpawn, DOWN, coopVisuals, BK, BP, CTL, ACTS, ctlIndex, pollPad, PAD, keyName, capOf, tSelect, TACT, isHeld, hostile, damageBot, payHour, hurtPlayer, drawBoard, SIDE, TEAM_CIV, TEAM_COP, pushOutTest: (x, z) => pushOut(x, z, 9, CURB + .3, CURB + 16, 's') || pushOut(x, z, 9, CURB + .3, CURB + 16, 'p'), groundAt, AIRPORT, ISLE, BRIDGE, AIRSPACE, RWY, onLand, stepHeli, heliControls, heliBrain, spawnCopHeli, airTick, AIRS, myAir, airItems, sendAir, jetAt, swimAshore, crossTarget, heliGun, heliRocket, NOAIR, collectPickups, findPromptNow: () => { findPrompt(); return prompt; }, BANK, JEWEL, LABS, LAB, JOBS, jobLine, labItems, jobItems, startSmuggle, buyLab, heistVisuals, vaultDoor, PROJ, fireProj, explode, RZ, RX, applySpec, setNeon, nitrous, gunItems, BIZ, PH, openPhone, phoneItems, modItems, garageCheck, addRP, rankOf, rpFor, maxHp, bizIncome, buyBiz, myPV, sendPV, UNLOCK, renderShop, buy, openMenu, closeShop, shopNow: () => shopOpen, FRONTS, AREAS, careerTick, homieCount, G, P, ZS, ZONES, NET, DBG, bots, cars, pickups, NAV, PROPS, PARK, SPAWNS, SHOPS, GARAGES, BASECARS, keys, mouse, boxes, FOOT, camera, renderer, scene, GAME, WEAPONS, CARS, chars, EVQ,
  step: (n, dt) => { for (let i = 0; i < n; i++) step(dt || 1 / 30); }, draw: () => { renderer.clear(); renderer.render(scene, camera); if (vmRoot.visible) { renderer.clearDepth(); renderer.render(vmScene, vmCam); } }, pushOut, COL, groundAt, navPath, nearestNode, zoneNode, walkClear, spawnCar, spawnBot, startWorld, beginPlay, ROBS, tillOpen, updatePolice, spawnCopUnit, copUnit, note, humans, saveGame, loadSave, updateRaids, BASES, tryFire, aimDir, AIM, applyTod, giveWeapon, setWeapon, tryEnter, carOffer, carInReach, damageBot, hurtPlayer, encBots, encCars, lanePoint, rayWorld, los, removeBot, aiStart, visuals,
  damageCar, carById, botById, CHOP, addPickup, ZONES_VAL: () => ZONES.map(z => z.val), TOUCH, setTouch, touchEdit, layoutTouch, tPlace, saveCode, readCode, saveData, loadSave, CLOUD, SAVE, initAudio, RADIO, EVTS, EV_START, RACE, HOOD, hoodAt, skullsOf, updateGangs, updateEvents, spawnHitSquad, payHour, hourlyNow, CREWS, POI, SPOTS, POSTS, ROOSTS, VENTS, STACKS, SPEAKERS, SIGNS, LIFE, ACT, populate, spawnPed, staffPosts, updateZones, walkersWanted, blockOf, nearHuman, hudCache, crewSize, takeSpot, leavePoi, NAVOK, updateLife };
requestAnimationFrame(frame);
