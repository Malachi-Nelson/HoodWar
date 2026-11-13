/* =====================================================================
   13b. TOUCH — a stick, a look pad and buttons for phones and tablets. Every button can be dragged anywhere and resized, the
        whole set made more or less see-through, and the layout is kept in this browser.
        In Auto, the controls appear on a touch screen and step aside as soon as a mouse is used.
   ===================================================================== */
// id, label, when it shows (f on foot, c in a car, a flying, b everywhere), what it does (an action from the Controls table, or one of the
// stick, fire and pause), and where it sits by default: anchored to the left (0), right (1) or middle (.5) of the screen and the top (0)
// or bottom (1), offset and sized in units of the screen's shorter side (capped for tablets). Any button but those three can be given
// another action, hidden, or joined by buttons of the player's own (Move buttons).
const TC_DEF = [
  ['stick', '', 'b', 'stick', 0, .3, 1, .28, .38],
  ['fire', 'FIRE', 'b', 'fire', 1, .27, 1, .38, .23],
  ['aim', 'ADS', 'f', 'act:ads', 1, .47, 1, .14, .15],
  ['jump', 'JUMP', 'f', 'act:jump', 1, .1, 1, .14, .14],
  ['use', 'USE', 'b', 'act:use', 1, .5, 1, .45, .14],
  ['reload', 'RELOAD', 'b', 'act:reload', 1, .09, 1, .42, .12],
  ['swap', 'SWAP', 'b', 'act:next', 1, .09, 1, .63, .12],
  ['nade', 'NADE', 'f', 'act:nade', 1, .64, 1, .3, .12],
  ['gas', 'GAS', 'c', 'act:gas', 1, .12, 1, .16, .2],
  ['brake', 'BRAKE', 'c', 'act:brake', 1, .34, 1, .14, .17],
  ['drift', 'DRIFT', 'c', 'act:hb', 1, .53, 1, .14, .14],
  ['horn', 'HORN', 'c', 'act:horn', 1, .66, 1, .3, .12],
  ['radio', 'RADIO', 'c', 'act:radio', 1, .66, 1, .52, .11],
  ['pause', '❚❚', 'b', 'pause', 0, .33, 0, .07, .1],
  ['map', 'MAP', 'b', 'act:map', 0, .44, 0, .07, .1],
  ['turf', 'TURF', 'b', 'act:board', 0, .55, 0, .07, .1],
  ['cam', 'CAM', 'b', 'act:view', 1, .5, 0, .07, .1],
  ['call', 'CALL', 'b', 'act:driveby', .5, 0, 0, .36, .13], ['phone', 'PHONE', 'b', 'act:phone', 1, .5, 0, .19, .1], ['nos', 'NOS', 'c', 'act:nos', 1, .5, 1, .68, .13], ['ping', 'PING', 'b', 'act:ping', 0, .66, 0, .07, .1],
  ['up', 'UP', 'a', 'act:up', 1, .12, 1, .16, .2], ['down', 'DOWN', 'a', 'act:down', 1, .34, 1, .14, .17], ['rocket', 'ROCKETS', 'a', 'act:rockets', 1, .53, 1, .14, .15],
];
const TC_FIXED = { stick: 1, fire: 1, pause: 1 }, TC_BASE = {}; TC_DEF.forEach(d => { TC_BASE[d[0]] = 1; });
const TCD = {}; TC_DEF.forEach(d => { TCD[d[0]] = d; });
const TOUCH = { on: false, fx: 0, fy: 0, ptr: {}, edit: false, sel: null, aim: false, ectx: 'f', el: {}, cfg: null, coarse: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) };
const TC_CFG0 = { mode: 'auto', sens: 1, alpha: .6, assist: true, float: true, lay: {}, act: {}, hide: {}, extra: [] };
try { TOUCH.cfg = Object.assign({}, TC_CFG0, JSON.parse(localStorage.getItem('pc-touch') || '{}')); } catch (e) { TOUCH.cfg = Object.assign({}, TC_CFG0); }
['lay', 'act', 'hide'].forEach(k => { if (!TOUCH.cfg[k] || typeof TOUCH.cfg[k] !== 'object' || Array.isArray(TOUCH.cfg[k])) TOUCH.cfg[k] = {}; });
if (!Array.isArray(TOUCH.cfg.extra)) TOUCH.cfg.extra = []; TOUCH.cfg.extra = TOUCH.cfg.extra.filter(x => Array.isArray(x) && /^x[a-z0-9]{1,8}$/.test(x[0]) && /^[fca]$/.test(x[1]) && ACT_BY[x[2]]).slice(0, 8);
for (const k in TOUCH.cfg.act) if (!ACT_BY[TOUCH.cfg.act[k]]) delete TOUCH.cfg.act[k];
const saveTouch = () => { try { localStorage.setItem('pc-touch', JSON.stringify(TOUCH.cfg)); } catch (e) {} };
const tLayer = document.createElement('div'); tLayer.id = 'touch'; tLayer.hidden = true; $('game').insertBefore(tLayer, $('hud'));
TC_DEF.forEach(d => { const el = document.createElement('div'); el.className = 'tc tc-' + d[0]; el.dataset.tc = d[0]; el.dataset.ctx = d[2]; if (d[0] === 'stick') el.appendChild(document.createElement('i')); else el.textContent = d[1]; tLayer.appendChild(el); TOUCH.el[d[0]] = el; });
// what a button does now, and what it says
function tHow(id) { const d = TCD[id]; if (!d) return ''; const o = TOUCH.cfg.act[id]; return o && !TC_FIXED[id] && ACT_BY[o] ? 'act:' + o : d[3]; }
function tLabel(id) { const d = TCD[id], h = tHow(id); return (TOUCH.cfg.act[id] || !d[1]) && h.startsWith('act:') ? ACT_BY[h.slice(4)][2] : d[1]; }
// the player's own buttons, and every button's label, hidden flag and changed action
function tBuild() {
  for (const id in TOUCH.el) if (!TC_BASE[id]) { TOUCH.el[id].remove(); delete TOUCH.el[id]; delete TCD[id]; }
  TOUCH.cfg.extra.forEach((x, k) => { TCD[x[0]] = [x[0], '', x[1], 'act:' + x[2], .5, -.33 + (k % 4) * .16, 1, .64 + Math.floor(k / 4) * .16, .13];
    const el = document.createElement('div'); el.className = 'tc tc-x'; el.dataset.tc = x[0]; el.dataset.ctx = x[1]; tLayer.appendChild(el); TOUCH.el[x[0]] = el; });
  for (const id in TOUCH.el) { const el = TOUCH.el[id]; if (id !== 'stick') el.textContent = tLabel(id); el.classList.toggle('off', !!TOUCH.cfg.hide[id]); el.classList.toggle('rm', !!TOUCH.cfg.act[id]); }
  if (typeof layoutTouch === 'function') layoutTouch();
}
// where a control's centre is and how big it is, in pixels
const tUnit = () => Math.min(window.innerWidth, window.innerHeight, 480);
function tPlace(id) {
  const d = TCD[id], W = window.innerWidth, H = window.innerHeight, U = tUnit(), L = TOUCH.cfg.lay[id];
  const size = (L ? L[2] : d[8]) * U, cx = L ? L[0] * W : d[4] === 0 ? d[5] * U : d[4] === 1 ? W - d[5] * U : W / 2 + d[5] * U, cy = L ? L[1] * H : d[6] === 0 ? d[7] * U : H - d[7] * U;
  return [clamp(cx, size / 2, W - size / 2), clamp(cy, size / 2, H - size / 2), size];
}
function layoutTouch() {
  Object.keys(TOUCH.el).forEach(id => { const d = TCD[id], el = TOUCH.el[id], q = tPlace(id); el.style.left = (q[0] - q[2] / 2) + 'px'; el.style.top = (q[1] - q[2] / 2) + 'px'; el.style.width = el.style.height = q[2] + 'px'; el.style.fontSize = Math.max(10, q[2] * (d[0] === 'pause' ? .34 : .22)) + 'px'; });
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
  const how = tHow(id); TOUCH.ptr[e.pointerId] = { k: how === 'fire' ? 'fire' : 'btn', id, x: e.clientX, y: e.clientY }; TOUCH.el[id].classList.add('down');
  if (how === 'fire') { mouse.down = true; mouse.fresh = true; initAudio(); }
  else if (how === 'pause') { releaseAll(); pause(); }
  else if (how.startsWith('act:')) { const a = how.slice(4), row = ACT_BY[a]; if (!row) return; if (row[4]) TACT[a] = true; actDown(a, 'touch'); }
}
function release(p) {
  if (!p) return;
  if (p.k === 'stick') { TOUCH.fx = TOUCH.fy = 0; const el = TOUCH.el.stick; el.classList.remove('down'); el.firstChild.style.transform = ''; if (p.float) layoutTouch(); return; }
  if (p.k === 'fire') mouse.down = false;
  if (p.id) { const how = tHow(p.id); if (how.startsWith('act:')) { const a = how.slice(4); TACT[a] = false; actUp(a, 'touch'); } if (TOUCH.el[p.id]) TOUCH.el[p.id].classList.remove('down'); }
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
// a little help with aim on a touch screen or a controller: while firing or aiming, the view leans toward the nearest enemy close to the crosshair
function touchAssist(dt) {
  if (!((TOUCH.on && TOUCH.cfg.assist) || (padRecent() && CTL.pa)) || G.state !== 'playing' || P.dead || !(mouse.down || mouse.right)) return;
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
  const go = !TOUCH.edit && (!!P.car || shopOpen || (prompt && !!prompt.act)), lab = P.car && !TOUCH.edit ? 'EXIT' : 'USE';
  for (const id in TOUCH.el) if (tHow(id) === 'act:use') { const el = TOUCH.el[id]; el.classList.toggle('go', go); if (el.textContent !== lab) el.textContent = lab; }
}
// --- moving and resizing the controls
function tSelect(id) {
  if (!TOUCH.el[id]) id = 'fire'; TOUCH.sel = id; for (const k in TOUCH.el) TOUCH.el[k].classList.toggle('sel', k === id); const q = tPlace(id); $('te-size').value = String((q[2] / tUnit()).toFixed(2));
  $('te-what').textContent = (id === 'stick' ? 'Stick' : tLabel(id)) + ' · drag to move · slider to resize';
  const sel = $('te-act'), d = TCD[id], ctx = d[2], how = tHow(id); sel.textContent = '';
  if (TC_FIXED[id]) { sel.add(new Option(id === 'stick' ? 'Move · steer · fly' : id === 'fire' ? 'Fire (drag it to aim)' : 'Pause', '')); sel.disabled = true; }
  else { sel.disabled = false; ACTS.filter(a => ctx === 'b' ? a[3] === 'fca' : a[3].indexOf(ctx) >= 0).forEach(a => sel.add(new Option(a[1], a[0]))); sel.value = how.slice(4); }
  const own = !TC_BASE[id]; $('te-hide').textContent = own ? 'Remove' : TOUCH.cfg.hide[id] ? 'Show' : 'Hide'; $('te-hide').disabled = id === 'stick' || id === 'pause';
}
function tKeep(id, cx, cy, s) { TOUCH.cfg.lay[id] = [+(cx / window.innerWidth).toFixed(4), +(cy / window.innerHeight).toFixed(4), +s.toFixed(3)]; }
function tDrag(id, dx, dy) { const q = tPlace(id); tKeep(id, q[0] + dx, q[1] + dy, q[2] / tUnit()); layoutTouch(); }
function touchEdit(on) {
  TOUCH.edit = on; $('tedit').hidden = !on; releaseAll();
  if (on) { TOUCH.wasState = G.state; $('overlay').hidden = true; TOUCH.ectx = 'f'; $('te-alpha').value = String(TOUCH.cfg.alpha); $('te-ctx').textContent = 'Showing: on foot'; tSelect('fire'); layoutTouch(); }
  else { for (const k in TOUCH.el) TOUCH.el[k].classList.remove('sel'); saveTouch(); $('overlay').hidden = false; }
  updateTouchUi();
}
$('te-size').addEventListener('input', e => { const id = TOUCH.sel; if (!id) return; const q = tPlace(id); tKeep(id, q[0], q[1], clamp(+e.target.value, .06, .5)); layoutTouch(); });
$('te-alpha').addEventListener('input', e => { TOUCH.cfg.alpha = clamp(+e.target.value, .15, 1); layoutTouch(); });
$('te-ctx').addEventListener('click', () => { TOUCH.ectx = TOUCH.ectx === 'f' ? 'c' : TOUCH.ectx === 'c' ? 'a' : 'f'; $('te-ctx').textContent = TOUCH.ectx === 'f' ? 'Showing: on foot' : TOUCH.ectx === 'c' ? 'Showing: in a car' : 'Showing: flying'; updateTouchUi(); });
$('te-reset').addEventListener('click', () => { TOUCH.cfg.lay = {}; TOUCH.cfg.act = {}; TOUCH.cfg.hide = {}; TOUCH.cfg.extra = []; TOUCH.cfg.alpha = TC_CFG0.alpha; $('te-alpha').value = String(TOUCH.cfg.alpha); tBuild(); tSelect(TC_BASE[TOUCH.sel] ? TOUCH.sel : 'fire'); saveTouch(); });
$('te-act').addEventListener('change', e => { const id = TOUCH.sel, v = e.target.value; if (!id || TC_FIXED[id] || !ACT_BY[v]) return;
  if (TC_BASE[id]) { if (TCD[id][3] === 'act:' + v) delete TOUCH.cfg.act[id]; else TOUCH.cfg.act[id] = v; } else { const x = TOUCH.cfg.extra.find(q => q[0] === id); if (x) x[2] = v; }
  tBuild(); tSelect(id); saveTouch(); });
$('te-hide').addEventListener('click', () => { const id = TOUCH.sel; if (!id || id === 'stick' || id === 'pause') return;
  if (!TC_BASE[id]) { TOUCH.cfg.extra = TOUCH.cfg.extra.filter(q => q[0] !== id); delete TOUCH.cfg.lay[id]; tBuild(); tSelect('fire'); }
  else { if (TOUCH.cfg.hide[id]) delete TOUCH.cfg.hide[id]; else TOUCH.cfg.hide[id] = 1; tBuild(); tSelect(id); }
  saveTouch(); });
$('te-add').addEventListener('click', () => { if (TOUCH.cfg.extra.length >= 8) { $('te-what').textContent = 'Eight of your own buttons is the most'; return; }
  const ctx = TOUCH.ectx, used = {}; for (const id in TOUCH.el) if (TCD[id][2] === ctx || TCD[id][2] === 'b') used[tHow(id).slice(4)] = 1;
  const fits = ACTS.filter(q => q[3].indexOf(ctx) >= 0 && !STICKY.test(q[0])), a = fits.find(q => !used[q[0]]) || fits[0], id = 'x' + (Date.now() % 1e7).toString(36);
  TOUCH.cfg.extra.push([id, ctx, a[0]]); tBuild(); tSelect(id); saveTouch(); });
$('te-done').addEventListener('click', () => touchEdit(false));
['pointerdown', 'pointermove', 'pointerup'].forEach(t => $('tedit').addEventListener(t, e => e.stopPropagation()));
// --- the touch part of the menu
function touchMenu() {
  const c = TOUCH.cfg; $('row-touch').hidden = !(TOUCH.on || TOUCH.coarse || c.mode === 'on'); $('set-touch').value = c.mode; $('set-tsens').value = String(c.sens); $('set-assist').value = c.assist ? '1' : '0'; $('set-float').value = c.float ? '1' : '0'; $('set-tads').value = CTL.tads;
  $('touch-help').hidden = !TOUCH.on; document.querySelector('.keys').hidden = TOUCH.on; $('fs-btn').hidden = !TOUCH.on || !document.documentElement.requestFullscreen;
}
$('set-touch').addEventListener('change', e => { TOUCH.cfg.mode = e.target.value; saveTouch(); setTouch(wantTouch()); touchMenu(); });
$('set-tsens').addEventListener('input', e => { TOUCH.cfg.sens = clamp(+e.target.value, .3, 3); saveTouch(); });
$('set-assist').addEventListener('change', e => { TOUCH.cfg.assist = e.target.value === '1'; saveTouch(); });
$('set-float').addEventListener('change', e => { TOUCH.cfg.float = e.target.value === '1'; saveTouch(); });
$('set-tads').addEventListener('change', e => { CTL.tads = e.target.value === 'hold' ? 'hold' : 'toggle'; ctlSave(); if (CTL.tads === 'hold' && mouse.right && !isHeld('ads')) setAds(false); });
$('te-open').addEventListener('click', () => { if (!TOUCH.on) setTouch(true); touchEdit(true); });
$('fs-btn').addEventListener('click', () => { const d = document.documentElement; if (!d.requestFullscreen) return; d.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (x) {} }, () => {}); });
// tapping a prompt does what it says; a tap anywhere on the map or the turf board closes it; shop items are bought with a tap
$('h-prompt').addEventListener('click', () => { if (TOUCH.on && prompt && prompt.act) prompt.act(); });
$('bigmap').addEventListener('click', () => { if (TOUCH.on) $('bigmap').hidden = true; }); $('board').addEventListener('click', () => { if (TOUCH.on) $('board').hidden = true; });
$('shop-list').addEventListener('click', e => { const li = e.target.closest('li'); if (!li || !li.dataset.key) return; buy(li.dataset.key); });
$('shop-x').addEventListener('click', () => closeShop());
tBuild(); setTouch(wantTouch()); touchMenu(); layoutTouch();
