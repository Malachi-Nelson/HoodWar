/* =====================================================================
   13b. TOUCH — a stick, a look pad and buttons for phones and tablets. Every button can be dragged anywhere and resized, the
        whole set made more or less see-through, and the layout is kept in this browser.
        In Auto, the controls appear on a touch screen and step aside as soon as a mouse is used.
   ===================================================================== */
// id, label, when it shows (f on foot, c in a car, a flying a helicopter, b everywhere), what it does, and where it sits by default: anchored to the left (0), right (1)
// or middle (.5) of the screen and the top (0) or bottom (1), offset and sized in units of the screen's shorter side (capped for tablets)
const TC_DEF = [
  ['stick', '', 'b', 'stick', 0, .3, 1, .28, .38],
  ['fire', 'FIRE', 'b', 'fire', 1, .27, 1, .38, .23],
  ['aim', 'AIM', 'f', 'aim', 1, .47, 1, .14, .15],
  ['jump', 'JUMP', 'f', 'key:Space', 1, .1, 1, .14, .14],
  ['use', 'USE', 'b', 'tap:KeyF', 1, .5, 1, .45, .14],
  ['reload', 'RELOAD', 'b', 'tap:KeyR', 1, .09, 1, .42, .12],
  ['swap', 'SWAP', 'b', 'swap', 1, .09, 1, .63, .12],
  ['nade', 'NADE', 'f', 'tap:KeyG', 1, .64, 1, .3, .12],
  ['gas', 'GAS', 'c', 'key:KeyW', 1, .12, 1, .16, .2],
  ['brake', 'BRAKE', 'c', 'key:KeyS', 1, .34, 1, .14, .17],
  ['drift', 'DRIFT', 'c', 'key:Space', 1, .53, 1, .14, .14],
  ['horn', 'HORN', 'c', 'key:KeyH', 1, .66, 1, .3, .12],
  ['radio', 'RADIO', 'c', 'tap:KeyQ', 1, .66, 1, .52, .11],
  ['pause', '❚❚', 'b', 'pause', 0, .33, 0, .07, .1],
  ['map', 'MAP', 'b', 'map', 0, .44, 0, .07, .1],
  ['turf', 'TURF', 'b', 'board', 0, .55, 0, .07, .1],
  ['cam', 'CAM', 'b', 'tap:KeyV', 1, .5, 0, .07, .1],
  ['call', 'CALL', 'b', 'tap:KeyB', .5, 0, 0, .36, .13], ['phone', 'PHONE', 'b', 'tap:KeyT', 1, .5, 0, .19, .1], ['nos', 'NOS', 'c', 'key:ShiftLeft', 1, .5, 1, .68, .13],
  ['up', 'UP', 'a', 'key:Space', 1, .12, 1, .16, .2], ['down', 'DOWN', 'a', 'key:ShiftLeft', 1, .34, 1, .14, .17], ['rocket', 'ROCKETS', 'a', 'key:KeyG', 1, .53, 1, .14, .15],
];
const TCD = {}; TC_DEF.forEach(d => { TCD[d[0]] = d; });
const TOUCH = { on: false, fx: 0, fy: 0, ptr: {}, edit: false, sel: null, aim: false, ectx: 'f', el: {}, cfg: null, coarse: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) };
const TC_CFG0 = { mode: 'auto', sens: 1, alpha: .6, assist: true, float: true, lay: {} };
try { TOUCH.cfg = Object.assign({}, TC_CFG0, JSON.parse(localStorage.getItem('pc-touch') || '{}')); } catch (e) { TOUCH.cfg = Object.assign({}, TC_CFG0); }
if (!TOUCH.cfg.lay || typeof TOUCH.cfg.lay !== 'object') TOUCH.cfg.lay = {};
const saveTouch = () => { try { localStorage.setItem('pc-touch', JSON.stringify(TOUCH.cfg)); } catch (e) {} };
const tLayer = document.createElement('div'); tLayer.id = 'touch'; tLayer.hidden = true; $('game').insertBefore(tLayer, $('hud'));
TC_DEF.forEach(d => { const el = document.createElement('div'); el.className = 'tc tc-' + d[0]; el.dataset.tc = d[0]; el.dataset.ctx = d[2]; if (d[0] === 'stick') el.appendChild(document.createElement('i')); else el.textContent = d[1]; tLayer.appendChild(el); TOUCH.el[d[0]] = el; });
// where a control's centre is and how big it is, in pixels
const tUnit = () => Math.min(window.innerWidth, window.innerHeight, 480);
function tPlace(id) {
  const d = TCD[id], W = window.innerWidth, H = window.innerHeight, U = tUnit(), L = TOUCH.cfg.lay[id];
  const size = (L ? L[2] : d[8]) * U, cx = L ? L[0] * W : d[4] === 0 ? d[5] * U : d[4] === 1 ? W - d[5] * U : W / 2 + d[5] * U, cy = L ? L[1] * H : d[6] === 0 ? d[7] * U : H - d[7] * U;
  return [clamp(cx, size / 2, W - size / 2), clamp(cy, size / 2, H - size / 2), size];
}
function layoutTouch() {
  TC_DEF.forEach(d => { const el = TOUCH.el[d[0]], q = tPlace(d[0]); el.style.left = (q[0] - q[2] / 2) + 'px'; el.style.top = (q[1] - q[2] / 2) + 'px'; el.style.width = el.style.height = q[2] + 'px'; el.style.fontSize = Math.max(10, q[2] * (d[0] === 'pause' ? .34 : .22)) + 'px'; });
  tLayer.style.setProperty('--ta', TOUCH.cfg.alpha);
}
window.addEventListener('resize', layoutTouch); window.addEventListener('orientationchange', () => setTimeout(layoutTouch, 300));
// turning the controls on or off; the first time, a phone gets the lighter graphics as well
function setTouch(on) {
  if (TOUCH.on === on) return; TOUCH.on = on; document.body.classList.toggle('touch', on); releaseAll();
  if (on) { layoutTouch(); let pref = null; try { pref = localStorage.getItem('pc-gfx'); } catch (e) {} if (!pref && !GFX.low) { GFX.low = true; $('set-gfx').value = 'low'; applyGfx(); resize(); } }
  touchMenu(); updateTouchUi();
}
const wantTouch = () => TOUCH.cfg.mode === 'on' || (TOUCH.cfg.mode === 'auto' && TOUCH.coarse);
// in Auto, whichever was used last wins: a finger brings the controls up, a mouse puts them away
window.addEventListener('pointerdown', e => { if (TOUCH.cfg.mode !== 'auto' || TOUCH.edit) return; const finger = e.pointerType === 'touch' || e.pointerType === 'pen'; if (finger !== TOUCH.on) { TOUCH.coarse = finger; setTouch(finger); } }, true);
// --- the controls in use
function releaseAll() { for (const id in TOUCH.ptr) release(TOUCH.ptr[id]); TOUCH.ptr = {}; TOUCH.fx = TOUCH.fy = 0; }
function tKey(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); window.dispatchEvent(new KeyboardEvent('keyup', { code })); }
function press(id, e) {
  const how = TCD[id][3]; TOUCH.ptr[e.pointerId] = { k: how === 'fire' ? 'fire' : 'btn', id, x: e.clientX, y: e.clientY }; TOUCH.el[id].classList.add('down');
  if (how === 'fire') { mouse.down = true; mouse.fresh = true; initAudio(); }
  else if (how === 'aim') { TOUCH.aim = !TOUCH.aim; mouse.right = TOUCH.aim; TOUCH.el.aim.classList.toggle('on', TOUCH.aim); }
  else if (how.startsWith('key:')) keys[how.slice(4)] = true;
  else if (how.startsWith('tap:')) tKey(how.slice(4));
  else if (how === 'swap') cycleWeapon(1);
  else if (how === 'map') { const m = $('bigmap'); m.hidden = !m.hidden; if (!m.hidden) { $('board').hidden = true; drawBigMap(); } }
  else if (how === 'board') { const b = $('board'); b.hidden = !b.hidden; if (!b.hidden) { $('bigmap').hidden = true; drawBoard(); } }
  else if (how === 'pause') { releaseAll(); pause(); }
}
function release(p) {
  if (!p) return;
  if (p.k === 'stick') { TOUCH.fx = TOUCH.fy = 0; const el = TOUCH.el.stick; el.classList.remove('down'); el.firstChild.style.transform = ''; if (p.float) layoutTouch(); return; }
  if (p.k === 'fire') mouse.down = false;
  if (p.id) { const how = TCD[p.id][3]; if (how.startsWith('key:')) keys[how.slice(4)] = false; if (p.id !== 'aim') TOUCH.el[p.id].classList.remove('down'); else TOUCH.el.aim.classList.remove('down'); }
}
function stickStart(e, at) {
  const el = TOUCH.el.stick, r = el.getBoundingClientRect(), cx = at ? at[0] : r.left + r.width / 2, cy = at ? at[1] : r.top + r.height / 2;
  const p = TOUCH.ptr[e.pointerId] = { k: 'stick', cx, cy, rad: r.width / 2, float: !!at };
  if (at) { el.style.left = (cx - r.width / 2) + 'px'; el.style.top = (cy - r.height / 2) + 'px'; }
  el.classList.add('down'); stickMove(p, e);
}
function stickMove(p, e) {
  let dx = e.clientX - p.cx, dy = e.clientY - p.cy; const m = p.rad * .78, d = hyp(dx, dy); if (d > m) { dx *= m / d; dy *= m / d; }
  TOUCH.fx = dx / m; TOUCH.fy = dy / m; if (hyp(TOUCH.fx, TOUCH.fy) < .12) TOUCH.fx = TOUCH.fy = 0;
  TOUCH.el.stick.firstChild.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
}
function look(dx, dy) {
  if (G.state !== 'playing') return; const k = TOUCH.cfg.sens * .0058 * (firstPerson() || P.ads > .5 ? camera.fov / 72 : 1);
  P.cyaw -= dx * k; P.cpitch = clamp(P.cpitch - dy * k, -1.25, 1.35); P.idleCam = 0;
}
tLayer.addEventListener('pointerdown', e => {
  e.preventDefault(); try { tLayer.setPointerCapture(e.pointerId); } catch (x) {}
  const el = e.target.closest('[data-tc]'), id = el ? el.dataset.tc : null;
  if (TOUCH.edit) { if (id) { tSelect(id); TOUCH.ptr[e.pointerId] = { k: 'drag', id, x: e.clientX, y: e.clientY }; } return; }
  if (id === 'stick') return stickStart(e, null);
  if (id) return press(id, e);
  if (TOUCH.cfg.float && e.clientX < window.innerWidth * .42 && e.clientY > window.innerHeight * .28) return stickStart(e, [e.clientX, e.clientY]);   // a thumb anywhere low on the left is the stick
  TOUCH.ptr[e.pointerId] = { k: 'look', x: e.clientX, y: e.clientY };
}, { passive: false });
tLayer.addEventListener('pointermove', e => {
  const p = TOUCH.ptr[e.pointerId]; if (!p) return; e.preventDefault();
  if (p.k === 'stick') return stickMove(p, e);
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (p.k === 'look' || p.k === 'fire') look(dx, dy);                                                     // a thumb on FIRE can steer the aim while it shoots
  else if (p.k === 'drag') tDrag(p.id, dx, dy);
}, { passive: false });
const tUp = e => { const p = TOUCH.ptr[e.pointerId]; if (!p) return; delete TOUCH.ptr[e.pointerId]; if (p.k === 'drag') saveTouch(); else release(p); };
tLayer.addEventListener('pointerup', tUp); tLayer.addEventListener('pointercancel', tUp); tLayer.addEventListener('lostpointercapture', tUp);
tLayer.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (TOUCH.on && G.state === 'playing') e.preventDefault(); }, { passive: false });   // no page scroll or pinch zoom mid-game
// a little help with aim on a touch screen: while firing or aiming, the view leans toward the nearest enemy close to the crosshair
function touchAssist(dt) {
  if (!TOUCH.on || !TOUCH.cfg.assist || G.state !== 'playing' || P.dead || !(mouse.down || mouse.right)) return;
  const d = WEAPONS[P.wpn]; if (d.melee) return;
  const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, cp = Math.cos(P.cpitch), fx = -Math.sin(P.cyaw) * cp, fy = Math.sin(P.cpitch), fz = -Math.cos(P.cyaw) * cp;
  let best = null, ba = 1e9;
  for (let i = 0; i < bots.length; i++) { const a = bots[i]; if (a.dead || a.gone) continue; if (!((isCrew(a.team) && a.team !== P.team) || (a.team === TEAM_COP && P.heat > 0) || a.tgt === P)) continue;
    const tx = a.x - ox, ty = chestY(a) - oy, tz = a.z - oz, dist = hyp(tx, ty, tz); if (dist < 1.5 || dist > d.range[1] * 1.2) continue;
    const ang = Math.acos(clamp((tx * fx + ty * fy + tz * fz) / dist, -1, 1)); if (ang > Math.max(.11, Math.atan(1.4 / dist)) || ang >= ba) continue;
    if (los(P.x, P.y + 1.5, P.z, a.x, chestY(a), a.z, 's')) { ba = ang; best = a; } }
  if (!best) return;
  const tx = best.x - ox, tz = best.z - oz, k = Math.min(1, dt * (mouse.right ? 7 : 4.5));
  P.cyaw = lerpAng(P.cyaw, yawOf(tx, tz), k); P.cpitch = lerp(P.cpitch, Math.atan2(chestY(best) - oy, hyp(tx, tz)), k);
}
// which controls show: the foot set or the car set, CALL when a drive-by is ready, USE lit when it would do something
function updateTouchUi() {
  const show = TOUCH.on && (G.state === 'playing' || TOUCH.edit); if (tLayer.hidden === show) tLayer.hidden = !show; if (!show) return;
  const air = TOUCH.edit ? TOUCH.ectx === 'a' : !!P.car && !!P.car.spec.air && P.seat === 0, car = TOUCH.edit ? TOUCH.ectx === 'c' : !!P.car && !air, cls = (air ? 'air' : car ? 'car' : 'foot') + (P.car && P.car.spec.air === 'gun' && !TOUCH.edit ? ' gun' : '') + (TOUCH.edit ? ' edit' : '') + (P.driveby || TOUCH.edit ? ' call' : '') + (P.dead && !TOUCH.edit ? ' dead' : '');
  if (tLayer.className !== cls) tLayer.className = cls;
  if ((P.car || P.dead) && TOUCH.aim) { TOUCH.aim = false; mouse.right = false; TOUCH.el.aim.classList.remove('on'); }
  const go = !TOUCH.edit && (!!P.car || shopOpen || (prompt && !!prompt.act)); TOUCH.el.use.classList.toggle('go', go); TOUCH.el.use.textContent = P.car && !TOUCH.edit ? 'EXIT' : 'USE';
}
// --- moving and resizing the controls
function tSelect(id) { TOUCH.sel = id; TC_DEF.forEach(d => TOUCH.el[d[0]].classList.toggle('sel', d[0] === id)); const q = tPlace(id); $('te-size').value = String((q[2] / tUnit()).toFixed(2)); $('te-what').textContent = (TCD[id][1] || 'Stick') + ' · drag to move · slider to resize'; }
function tKeep(id, cx, cy, s) { TOUCH.cfg.lay[id] = [+(cx / window.innerWidth).toFixed(4), +(cy / window.innerHeight).toFixed(4), +s.toFixed(3)]; }
function tDrag(id, dx, dy) { const q = tPlace(id); tKeep(id, q[0] + dx, q[1] + dy, q[2] / tUnit()); layoutTouch(); }
function touchEdit(on) {
  TOUCH.edit = on; $('tedit').hidden = !on; releaseAll();
  if (on) { TOUCH.wasState = G.state; $('overlay').hidden = true; TOUCH.ectx = 'f'; $('te-alpha').value = String(TOUCH.cfg.alpha); $('te-ctx').textContent = 'Showing: on foot'; tSelect('fire'); layoutTouch(); }
  else { TC_DEF.forEach(d => TOUCH.el[d[0]].classList.remove('sel')); saveTouch(); $('overlay').hidden = false; }
  updateTouchUi();
}
$('te-size').addEventListener('input', e => { const id = TOUCH.sel; if (!id) return; const q = tPlace(id); tKeep(id, q[0], q[1], clamp(+e.target.value, .06, .5)); layoutTouch(); });
$('te-alpha').addEventListener('input', e => { TOUCH.cfg.alpha = clamp(+e.target.value, .15, 1); layoutTouch(); });
$('te-ctx').addEventListener('click', () => { TOUCH.ectx = TOUCH.ectx === 'f' ? 'c' : TOUCH.ectx === 'c' ? 'a' : 'f'; $('te-ctx').textContent = TOUCH.ectx === 'f' ? 'Showing: on foot' : TOUCH.ectx === 'c' ? 'Showing: in a car' : 'Showing: flying'; updateTouchUi(); });
$('te-reset').addEventListener('click', () => { TOUCH.cfg.lay = {}; TOUCH.cfg.alpha = TC_CFG0.alpha; $('te-alpha').value = String(TOUCH.cfg.alpha); layoutTouch(); if (TOUCH.sel) tSelect(TOUCH.sel); saveTouch(); });
$('te-done').addEventListener('click', () => touchEdit(false));
['pointerdown', 'pointermove', 'pointerup'].forEach(t => $('tedit').addEventListener(t, e => e.stopPropagation()));
// --- the touch part of the menu
function touchMenu() {
  const c = TOUCH.cfg; $('row-touch').hidden = !(TOUCH.on || TOUCH.coarse || c.mode === 'on'); $('set-touch').value = c.mode; $('set-tsens').value = String(c.sens); $('set-assist').value = c.assist ? '1' : '0'; $('set-float').value = c.float ? '1' : '0';
  $('touch-help').hidden = !TOUCH.on; document.querySelector('.keys').hidden = TOUCH.on; $('fs-btn').hidden = !TOUCH.on || !document.documentElement.requestFullscreen;
}
$('set-touch').addEventListener('change', e => { TOUCH.cfg.mode = e.target.value; saveTouch(); setTouch(wantTouch()); touchMenu(); });
$('set-tsens').addEventListener('input', e => { TOUCH.cfg.sens = clamp(+e.target.value, .3, 3); saveTouch(); });
$('set-assist').addEventListener('change', e => { TOUCH.cfg.assist = e.target.value === '1'; saveTouch(); });
$('set-float').addEventListener('change', e => { TOUCH.cfg.float = e.target.value === '1'; saveTouch(); });
$('te-open').addEventListener('click', () => { if (!TOUCH.on) setTouch(true); touchEdit(true); });
$('fs-btn').addEventListener('click', () => { const d = document.documentElement; if (!d.requestFullscreen) return; d.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (x) {} }, () => {}); });
// tapping a prompt does what it says; a tap anywhere on the map or the turf board closes it; shop items are bought with a tap
$('h-prompt').addEventListener('click', () => { if (TOUCH.on && prompt && prompt.act) prompt.act(); });
$('bigmap').addEventListener('click', () => { if (TOUCH.on) $('bigmap').hidden = true; }); $('board').addEventListener('click', () => { if (TOUCH.on) $('board').hidden = true; });
$('shop-list').addEventListener('click', e => { const li = e.target.closest('li'); if (!li || !li.dataset.key) return; buy(li.dataset.key); });
$('shop-x').addEventListener('click', () => closeShop());
setTouch(wantTouch()); touchMenu(); layoutTouch();
