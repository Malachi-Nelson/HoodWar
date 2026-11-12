/* =====================================================================
   14. INPUT, MENUS, LOOP
   ===================================================================== */
let wasLocked = false;
const locked = () => document.pointerLockElement === canvas;
function requestLock() { if (TEST) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
let SENS = .0022; try { const s = +localStorage.getItem('pc-sens'); if (s > .0004 && s < .01) SENS = s; } catch (e) {}
function showOverlay(mode) {
  const o = $('overlay'); o.hidden = false; $('hud').hidden = mode !== 'paused'; $('o-stats').hidden = true; $('leave').hidden = mode !== 'paused';
  const inGame = mode === 'paused'; o.querySelector('.crews').hidden = inGame; $('row-lobby').hidden = inGame; $('co-status').hidden = inGame; $('set-box').hidden = inGame; $('set-bots').disabled = $('set-cops').disabled = false; if (inGame) $('co-roster').hidden = true;
  if (mode === 'paused') { $('o-eyebrow').textContent = 'Paused'; $('o-text').textContent = NET.mode ? 'The city keeps moving while this menu is open.' : 'The city waits.'; $('deploy').textContent = 'Resume'; $('deploy').hidden = false;
    let turf = 0; ZS.forEach(z => { if (z.owner === P.team) turf++; }); $('o-stats').hidden = false; $('o-stats').innerHTML = `<span>Cash <b>$${Math.max(0, Math.round(P.cash)).toLocaleString('en-US')}</b></span><span>Kills <b>${P.kills | 0}</b></span><span>Deaths <b>${P.deaths | 0}</b></span><span>Turf <b>${turf} of ${ZONES.length}</b></span>`; return; }
  $('deploy').textContent = 'Play solo'; $('deploy').hidden = !!NET.lob; $('crew0').disabled = $('crew1').disabled = false;
  if (mode === 'lost') { $('o-eyebrow').textContent = 'Session closed'; $('o-text').textContent = 'The host left, so the session closed. Open a new lobby or play solo. Your cash and guns are kept.'; }
  else { $('o-eyebrow').textContent = 'Open world · free roam · solo or co-op'; $('o-text').textContent = MENU_TEXT; }
  if (!NET.mode) NET.lobby();
}
const MENU_TEXT = $('o-text').textContent;
// what the player looks like and which side the menu shows; setCrew is the player choosing, wearCrew is being told
function wearCrew(t) { P.team = t ? 1 : 0; $('crew0').setAttribute('aria-pressed', String(!P.team)); $('crew1').setAttribute('aria-pressed', String(!!P.team)); setLook(meChar, makeLook(hashStr(myName()) + 3, P.team)); vmSleeve.color.setHex(meChar.look.top); vmSkin.color.setHex(meChar.look.skin); }
const ownCrew = () => { let c = P.team; try { const v = localStorage.getItem('pc-crew'); if (v === '0' || v === '1') c = +v; } catch (e) {} if (c !== P.team) wearCrew(c); };   // back to the crew this player picks for themselves
function setCrew(t) { wearCrew(t); try { localStorage.setItem('pc-crew', String(P.team)); } catch (e) {} NET.say(); if (!NET.mode) NET.lobby(); }
// cash and guns are kept in this browser between sessions: with no rounds, there is nothing else to reset them
function loadSave() { try { const s = JSON.parse(localStorage.getItem('pc-save') || 'null'); if (s && isFinite(s.c)) return s; } catch (e) {} return null; }
function saveGame() { if (G.state === 'menu') return; try { localStorage.setItem('pc-save', JSON.stringify({ c: Math.max(0, Math.round(P.cash)), w: Object.keys(P.inv).filter(id => !WEAPONS[id].melee && id !== 'pistol'), n: P.nades })); } catch (e) {} }
const readSettings = () => { G.botsPer = +$('set-bots').value || 5; G.cops = $('set-cops').value !== '0'; };
function beginPlay() {
  const sv = loadSave(); P.name = myName(); wearCrew(P.team); resetLoadout(); if (sv) { (sv.w || []).forEach(id => { if (WEAPONS[id] && !WEAPONS[id].melee) giveWeapon(id); }); P.nades = clamp(sv.n | 0, 1, 4); }
  Object.assign(P, { bank: sv ? clamp(Math.round(sv.c), 0, 1e7) : CFG.startCash, earn: 0, spent: 0, kills: 0, deaths: 0, streak: 0, driveby: false, dead: false, shots: 0, car: null, enter: null, heat: 0, wp: 0, evade: false, rob: null, siren: false }); P.cash = P.bank;
  hudCache.heat = 0; $('h-stars').hidden = true; closeShop(); $('dead').hidden = true; $('board').hidden = true; $('bigmap').hidden = true;
  GAME.respawn(true); G.state = 'playing'; $('overlay').hidden = true; $('hud').hidden = false; wasLocked = false; requestLock();
  banner('Port Calder', 'You run with ' + CREWS[P.team].name + ' · the city is open', 3.5, 't' + P.team);
  P.hintAt = G.time; P.hints = [[5, 'F takes any car · Tab shows turf · M opens the map'], [13, 'Stand in a rival ring to take the turf: each one pays your crew'], [22, 'Pink dots are tills to rob · yellow dots fix and respray a car']];
}
function startAttract() { readSettings(); startWorld(); G.phase = 'attract'; P.dead = true; P.deadT = 99; hideChar(meChar); }
function pause() { if (G.state !== 'playing') return; G.state = 'paused'; mouse.down = mouse.right = false; for (const k in keys) keys[k] = false; saveGame(); showOverlay('paused'); }
function leaveSession() { saveGame(); if (NET.mode) NET.stop(); if (document.pointerLockElement) document.exitPointerLock(); G.state = 'menu'; ownCrew(); showOverlay('menu'); startAttract(); }
$('deploy').addEventListener('click', () => {
  initAudio();
  if (G.state === 'paused') { G.state = 'playing'; $('overlay').hidden = true; $('hud').hidden = false; wasLocked = false; requestLock(); return; }
  if (NET.lob) lobbySet(null);
  readSettings(); G.solo = true; startWorld(); beginPlay();
});
$('leave').addEventListener('click', leaveSession);
$('crew0').addEventListener('click', () => setCrew(0)); $('crew1').addEventListener('click', () => setCrew(1));
$('set-bots').addEventListener('change', () => { readSettings(); NET.say(); }); $('set-cops').addEventListener('change', () => { readSettings(); NET.say(); });
$('set-view').addEventListener('change', () => { P.view = +$('set-view').value === 1 ? 1 : 3; try { localStorage.setItem('pc-view', String(P.view)); } catch (e) {} });
$('set-gfx').addEventListener('change', () => { GFX.low = $('set-gfx').value === 'low'; try { localStorage.setItem('pc-gfx', GFX.low ? 'low' : 'high'); } catch (e) {} applyGfx(); resize(); });
$('co-host').addEventListener('click', () => lobbySet({ lead: true, ready: true }));
$('co-join').addEventListener('click', () => { if (NET.room && NET.room.peers().some(p => !(p.isMe && p.sameTab) && p.presence && p.presence.t === 'h')) coopBegin('client'); else lobbySet({ lead: false, ready: false }); });
$('co-ready').addEventListener('click', () => { if (NET.lob) lobbySet({ lead: NET.lob.lead, ready: !NET.lob.ready }); });
$('co-start').addEventListener('click', () => { if (NET.lob && NET.lob.lead) { readSettings(); coopBegin('host'); } });
$('co-leave').addEventListener('click', () => { ownCrew(); lobbySet(null); });
try { $('co-name').value = cleanName(localStorage.getItem('pc-name') || '').replace(/^Player$/, ''); const c = localStorage.getItem('pc-crew'); if (c === '1') P.team = 1; if (localStorage.getItem('pc-view') === '1') P.view = 1; } catch (e) {}
$('set-view').value = String(P.view); $('set-gfx').value = GFX.low ? 'low' : 'high';
$('co-name').addEventListener('change', () => { try { localStorage.setItem('pc-name', myName()); } catch (e) {} NET.say(); if (!NET.mode) NET.lobby(); });
$('co-name').addEventListener('keydown', e => e.stopPropagation());
document.addEventListener('pointerlockchange', () => { if (locked()) wasLocked = true; else if (wasLocked && G.state === 'playing') pause(); });
canvas.addEventListener('mousedown', e => {
  if (G.state !== 'playing') return; if (!locked()) requestLock();
  if (e.button === 0) { mouse.down = true; mouse.fresh = true; } else if (e.button === 2) mouse.right = true;
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; else if (e.button === 2) mouse.right = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousemove', e => {
  if (G.state !== 'playing' || (!locked() && !TEST)) return;
  const s = SENS * (firstPerson() || P.ads > .5 ? camera.fov / 72 : 1); P.cyaw -= (e.movementX || 0) * s; P.cpitch = clamp(P.cpitch - (e.movementY || 0) * s, -1.25, 1.35); P.idleCam = 0;
});
canvas.addEventListener('wheel', e => { if (G.state === 'playing') { e.preventDefault(); cycleWeapon(e.deltaY > 0 ? 1 : -1); } }, { passive: false });
window.addEventListener('keydown', e => {
  if (G.state !== 'playing') { if (e.code === 'Escape' && G.state === 'paused' && TEST) $('deploy').click(); return; }
  if (['Space', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys[e.code] = true;
  if (shopOpen && /^Digit[1-9]$/.test(e.code)) { buy(e.code.slice(5)); return; }
  if (e.code === 'Tab') { drawBoard(); $('board').hidden = false; } else if (e.code === 'KeyM') { $('bigmap').hidden = false; drawBigMap(); }
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (shopOpen) closeShop(); else if (!locked()) pause(); }
  else if (e.code === 'Backquote') devOpen();
  else if (P.dead) return;
  else if (e.code === 'KeyF' || e.code === 'KeyE') { if (shopOpen) closeShop(); else if (P.car) GAME.leaveCar(false); else if (prompt && prompt.act) prompt.act(); }
  else if (e.code === 'KeyR') startReload(); else if (e.code === 'KeyG') throwGrenade();
  else if (/^Digit[1-6]$/.test(e.code)) { const id = WID.find(k => WEAPONS[k].slot === +e.code.slice(5) - 1); if (id) setWeapon(id); }
  else if (e.code === 'KeyV') { if (P.car) camFar = camFar ? 0 : 1; else { P.view = P.view === 1 ? 3 : 1; $('set-view').value = String(P.view); try { localStorage.setItem('pc-view', String(P.view)); } catch (x) {} } }
  else if (e.code === 'KeyQ') { if (P.car) nextRadio(); else cycleWeapon(1); }
  else if (e.code === 'KeyB') { if (P.driveby) { P.driveby = false; P.streak = 0; if (AUTH()) { if (!GAME.callDriveBy(P)) { P.driveby = true; } } else NET.req('db'); } }
  else if (e.code === 'Minus' || e.code === 'Equal') { SENS = clamp(SENS * (e.code === 'Minus' ? .88 : 1.14), .0006, .008); try { localStorage.setItem('pc-sens', String(SENS)); } catch (x) {} banner('Mouse speed ' + Math.round(SENS / .0022 * 100) + '%', '', 1); }
});
window.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Tab') $('board').hidden = true; if (e.code === 'KeyM') $('bigmap').hidden = true; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = mouse.right = false; setHorn(false); $('board').hidden = true; $('bigmap').hidden = true; });
function resize() { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = vmCam.aspect = w / h; camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix(); }
window.addEventListener('resize', resize);

/* ---- dev menu: ` while playing ---- */
const DEV_FLAGS = { god: 'dv-god', ammo: 'dv-ammo', freeze: 'dv-freeze', stats: 'dv-stats', nav: 'dv-nav', notarget: 'dv-notarget' };
let navLines = null;
function devSet(k, v) {
  DBG[k] = v; const el = $(DEV_FLAGS[k]); if (el) el.checked = v;
  if (k === 'nav') { if (v && !navLines) { const pts = []; NAV.forEach(n => n.e.forEach(e => { if (e[0] > n.i) { const m = NAV[e[0]]; pts.push(new T.Vector3(n.x, n.y + .4, n.z), new T.Vector3(m.x, m.y + .4, m.z)); } })); navLines = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fe36b })); scene.add(navLines); } if (navLines) navLines.visible = v; }
}
function devOpen() { if (G.state !== 'playing') return; G.state = 'dev'; mouse.down = mouse.right = false; for (const k in keys) keys[k] = false; if (locked()) document.exitPointerLock(); $('dev').hidden = false; $('dv-tod').value = String(G.tod); }
function devClose() { if (G.state !== 'dev') return; $('dev').hidden = true; G.state = 'playing'; wasLocked = false; requestLock(); }
Object.keys(DEV_FLAGS).forEach(k => $(DEV_FLAGS[k]).addEventListener('change', e => devSet(k, e.target.checked)));
CID.forEach(id => $('dv-car').add(new Option(CARS[id].name + ' (' + id + ')', id)));
const TELEPORTS = {}; ZONES.forEach(z => { TELEPORTS['Turf ' + z.id + ' · ' + z.name] = [z.x + 4, z.id === 'D' ? 0 : CURB, z.z + 6]; }); TELEPORTS['Ember Row yard'] = [SPAWNS[0][0].x, CURB, SPAWNS[0][0].z]; TELEPORTS['Tidewater yard'] = [SPAWNS[1][0].x, CURB, SPAWNS[1][0].z]; TELEPORTS['Station platform'] = [LINE.x + 9, LINE.y1, LINE.sz + 6]; TELEPORTS['Mall, upper floor'] = [ZONES[2].x + 6.2, CURB + 5.2, ZONES[2].z - 14];
SHOPS.forEach((s, i) => { TELEPORTS['Shop ' + (i + 1) + ' · ' + s.name] = [s.x + 1.5, CURB, s.z + 1.5]; });
Object.keys(TELEPORTS).forEach(id => $('dv-tp').add(new Option(id, id)));
const devOn = (id, fn) => $(id).addEventListener('click', fn);
devOn('dv-cash', () => { P.earn += 5000; });
devOn('dv-star', () => { if (AUTH()) GAME.crime(P, 0, Math.min(5, (P.heat | 0) + 1)); }); devOn('dv-clear', () => { if (AUTH()) GAME.clearHeat(P); });
devOn('dv-wipe', () => { try { localStorage.removeItem('pc-save'); } catch (e) {} resetLoadout(); P.bank = CFG.startCash; P.earn = 0; P.spent = 0; }); devOn('dv-guns', () => { WID.forEach(id => giveWeapon(id)); P.nades = 4; }); devOn('dv-heal', () => { P.hp = CFG.player.hp; P.armor = 100; }); devOn('dv-streak', () => { P.driveby = true; });
devOn('dv-spawncar', () => { if (!AUTH()) return; const fx = -Math.sin(P.cyaw), fz = -Math.cos(P.cyaw); spawnCar($('dv-car').value, P.x + fx * 6, P.z + fz * 6, P.cyaw, {}); });
devOn('dv-go', () => { const t = TELEPORTS[$('dv-tp').value]; if (P.car) GAME.leaveCar(false); P.x = t[0]; P.y = P.camY = t[1]; P.z = t[2]; P.vy = 0; });
$('dv-tod').addEventListener('input', e => { if (AUTH()) G.tod = +e.target.value; const h = +e.target.value; $('dv-todv').textContent = Math.floor(h) + ':' + String(Math.round(h % 1 * 60)).padStart(2, '0'); });
$('dv-scale').addEventListener('input', e => { DBG.scale = +e.target.value; $('dv-scalev').textContent = DBG.scale + 'x'; });
devOn('dv-close', devClose);
window.addEventListener('keydown', e => { if (e.code === 'Backquote' && G.state === 'dev') { e.preventDefault(); devClose(); } });

/* ---- the loop ---- */
function step(dt) {
  G.time += dt;
  if (G.state !== 'menu') updatePlayer(dt);
  if (NET.mode === 'client') NET.client(dt); else { authTick(dt); if (NET.mode === 'host' && NET.room) NET.host(dt); }
  updateGrenades(dt);
}
let todT = 0, slowT = 0, menuA = 0, saveT = 15;
function visuals(dt, now) {
  todT -= dt; if (todT <= 0) { todT = .2; applyTod(G.tod); }
  if (G.state === 'menu') { menuA += dt * .05; const z = ZONES[1], r = 62; camera.position.set(z.x + 40 + Math.sin(menuA) * r, 26 + Math.sin(menuA * .7) * 5, z.z + Math.cos(menuA) * r); camera.rotation.set(-.3, menuA + .5, 0); if (Math.abs(camera.fov - 62) > .1) { camera.fov = 62; camera.updateProjectionMatrix(); } skyDome.position.copy(camera.position); EAR.x = camera.position.x; EAR.y = 200; EAR.z = camera.position.z; vmRoot.visible = false; }
  else { updateCamera(dt); updatePlayerLook(dt); }
  updateSun(G.state === 'menu' ? camera.position.x - Math.sin(menuA + .5) * 50 : P.x, 0, G.state === 'menu' ? camera.position.z - Math.cos(menuA + .5) * 50 : P.z);
  for (let i = 0; i < bots.length; i++) botVisual(bots[i], dt);
  for (const k in NET.remotes) remoteVisual(NET.remotes[k], dt);
  flushChars();
  for (let i = 0; i < cars.length; i++) updateCarVisual(cars[i], dt); wheelMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < pickups.length; i++) pickups[i].g.rotation.y += dt * 2;
  updateProps(dt); updateMarks(dt); updateTrain(dt); updateFx(dt); updateEngines(dt, G.state === 'menu' ? null : P.car);
  if (G.state !== 'menu') updateHud(dt);
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); if (TEST && window.__PC_MANUAL) return;      // a test is driving the clock itself
  const raw = (now - last) / 1000, dt = Math.min(.05, raw) * DBG.scale; last = now; DBG.fps = lerp(DBG.fps, 1 / Math.max(raw, .001), .05);
  if (canvas.width !== Math.floor(canvas.clientWidth * renderer.getPixelRatio())) resize();
  const live = G.state === 'playing' || G.state === 'menu' || (NET.mode && (G.state === 'paused' || G.state === 'dev'));
  if (live) step(dt);
  visuals(live ? dt : 0, now);
  if (G.state === 'playing') { saveT -= raw; if (saveT <= 0) { saveT = 15; saveGame(); } }
  // a machine that cannot keep up drops to the lighter settings by itself, once
  if (G.state === 'playing' && !GFX.low && !GFX.auto && !TEST) { if (DBG.fps < 27) slowT += raw; else slowT = Math.max(0, slowT - raw); if (slowT > 5) { GFX.auto = true; GFX.low = true; $('set-gfx').value = 'low'; applyGfx(); resize(); banner('Graphics set to Low', 'to keep the game smooth · change it in the pause menu', 3.5); } }
  renderer.clear(); renderer.render(scene, camera);
  if (vmRoot.visible) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
}
// a host whose tab is hidden would freeze the city for everyone, so a worker keeps the world ticking while the page is out of sight
let bgWorker = null, bgLast = 0;
function bgTick() { if (!document.hidden || !NET.mode) return; const now = performance.now(); let left = Math.min(.3, (now - bgLast) / 1000); bgLast = now; while (left > .001) { const d = Math.min(.05, left); step(d); left -= d; } }
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); return; } if (!NET.mode) return; bgLast = performance.now(); if (!bgWorker) { try { bgWorker = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 50)'], { type: 'application/javascript' }))); bgWorker.onmessage = bgTick; } catch (e) {} } });
window.addEventListener('pagehide', saveGame);
applyGfx(); resize(); wearCrew(P.team); startAttract(); NET.connect();
if (TEST) window.__pc = { G, P, ZS, ZONES, NET, DBG, bots, cars, pickups, NAV, PROPS, PARK, SPAWNS, SHOPS, GARAGES, BASECARS, keys, mouse, boxes, FOOT, camera, renderer, scene, GAME, WEAPONS, CARS, chars, EVQ,
  step: (n, dt) => { for (let i = 0; i < n; i++) step(dt || 1 / 30); }, draw: () => { renderer.clear(); renderer.render(scene, camera); if (vmRoot.visible) { renderer.clearDepth(); renderer.render(vmScene, vmCam); } }, pushOut, COL, groundAt, navPath, nearestNode, zoneNode, walkClear, spawnCar, spawnBot, startWorld, beginPlay, ROBS, tillOpen, updatePolice, spawnCopUnit, copUnit, note, humans, saveGame, loadSave, updateRaids, BASES, tryFire, aimDir, AIM, applyTod, giveWeapon, setWeapon, tryEnter, carOffer, carInReach, explode, damageBot, hurtPlayer, encBots, encCars, lanePoint, rayWorld, los, removeBot, aiStart, visuals };
requestAnimationFrame(frame);
