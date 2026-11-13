/* =====================================================================
   11b. CONTROLS — every action starts from its keys, mouse buttons and controller buttons, and any of them can be changed on the
        Controls page (kept in this browser). Touch buttons start actions directly, so a key moved elsewhere never strands a
        button, and any touch button can be given another action. A controller works as soon as one is connected: the left
        stick moves, drives and flies, the right stick looks, the triggers aim and fire (and drive, in a car).
   ===================================================================== */
// id, its name on the Controls page, the label a touch button shows, where it works (f on foot, c in a car or riding along in anything,
// a at the controls of an aircraft), 1 when it is held rather than pressed once, keyboard and mouse defaults, controller defaults
const ACTS = [
  ['fwd', 'Forward', 'FWD', 'f', 1, ['KeyW'], []], ['back', 'Back', 'BACK', 'f', 1, ['KeyS'], []], ['left', 'Left', 'LEFT', 'f', 1, ['KeyA'], []], ['right', 'Right', 'RIGHT', 'f', 1, ['KeyD'], []],
  ['sprint', 'Sprint', 'SPRINT', 'f', 1, ['ShiftLeft', 'ShiftRight'], ['Pad10']], ['jump', 'Jump', 'JUMP', 'f', 1, ['Space'], ['Pad0']],
  ['fire', 'Fire', 'FIRE', 'f', 1, ['Mouse0'], ['Pad7']], ['ads', 'Aim down sights (ADS)', 'ADS', 'f', 1, ['Mouse2'], ['Pad6']],
  ['nade', 'Throw a grenade', 'NADE', 'f', 0, ['KeyG'], ['Pad1']],
  ['next', 'Next gun', 'NEXT', 'f', 0, ['KeyQ', 'WheelDown'], ['Pad5']], ['prev', 'Previous gun', 'PREV', 'f', 0, ['WheelUp'], ['Pad4']],
  ['gas', 'Accelerate', 'GAS', 'c', 1, ['KeyW'], ['Pad7']], ['brake', 'Brake · reverse', 'BRAKE', 'c', 1, ['KeyS'], ['Pad6']],
  ['steerL', 'Steer left', 'LEFT', 'c', 1, ['KeyA'], []], ['steerR', 'Steer right', 'RIGHT', 'c', 1, ['KeyD'], []],
  ['hb', 'Handbrake · drift', 'DRIFT', 'c', 1, ['Space'], ['Pad0']], ['nos', 'Nitrous', 'NOS', 'c', 1, ['ShiftLeft', 'ShiftRight'], ['Pad1']],
  ['horn', 'Horn · siren', 'HORN', 'c', 1, ['KeyH'], ['Pad10']], ['behind', 'Look behind', 'BEHIND', 'c', 1, ['KeyC'], ['Pad11']],
  ['radio', 'Next radio station', 'RADIO', 'ca', 0, ['KeyQ'], ['Pad15']], ['cfire', 'Shoot from a car', 'FIRE', 'c', 1, ['Mouse0'], ['Pad5']], ['cnext', 'Next gun (in a car)', 'NEXT', 'c', 0, ['WheelDown', 'WheelUp'], ['Pad4']],
  ['afwd', 'Fly forward · nose down', 'FWD', 'a', 1, ['KeyW'], []], ['aback', 'Fly back · nose up', 'BACK', 'a', 1, ['KeyS'], []], ['aleft', 'Fly left · roll left', 'LEFT', 'a', 1, ['KeyA'], []], ['aright', 'Fly right · roll right', 'RIGHT', 'a', 1, ['KeyD'], []],
  ['up', 'Climb · throttle up', 'UP', 'a', 1, ['Space'], ['Pad7']], ['down', 'Descend · throttle down', 'DOWN', 'a', 1, ['ShiftLeft', 'ShiftRight', 'KeyC'], ['Pad6']],
  ['guns', 'Guns (gunship)', 'GUNS', 'a', 1, ['Mouse0'], ['Pad5']], ['rockets', 'Rockets (gunship)', 'ROCKETS', 'a', 1, ['Mouse2', 'KeyG'], ['Pad4']],
  ['use', 'Use · get in or out', 'USE', 'fca', 0, ['KeyF', 'KeyE'], ['Pad3']], ['reload', 'Reload', 'RELOAD', 'fca', 0, ['KeyR'], ['Pad2']],
  ['view', 'Camera', 'CAM', 'fca', 0, ['KeyV'], ['Pad13']], ['phone', 'Phone', 'PHONE', 'fca', 0, ['KeyT', 'ArrowUp'], ['Pad12']],
  ['driveby', 'Call a drive-by', 'CALL', 'fca', 0, ['KeyB'], ['Pad14']], ['ping', 'Mark a spot for your side (ping)', 'PING', 'fca', 0, ['KeyZ', 'Mouse1'], ['Pad11']],
  ['map', 'Map (hold)', 'MAP', 'fca', 1, ['KeyM'], ['Pad8']], ['board', 'Players and turf (hold)', 'TURF', 'fca', 1, ['Tab'], []], ['pause', 'Pause', 'PAUSE', 'fca', 0, ['KeyP'], ['Pad9']],
];
const ACT_BY = {}; ACTS.forEach(a => { ACT_BY[a[0]] = a; });
const BK = {}, BP = {}, BIND = {}, BYIN = {}, TACT = {}, ADS = { on: false };
const CTL = { ads: 'hold', tads: 'toggle', ps: 1, pi: 0, pa: 1 };   // ADS held or toggled (keys and controller; touch), controller look speed, inverted look, aim help
const RESERVED = /^(Escape|Backquote|Digit[0-9]|Minus|Equal|F5|F11|F12|MetaLeft|MetaRight)$/;
const STICKY = /^(fwd|back|left|right|steerL|steerR|afwd|aback|aleft|aright)$/;     // on a controller the left stick does these
function ctlLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem('pc-ctl') || 'null'); } catch (e) {}
  const pick = (t, a, d) => (s && s[t] && Array.isArray(s[t][a]) ? s[t][a] : d).filter(c => typeof c === 'string' && c.length < 24).slice(0, 3);
  ACTS.forEach(a => { BK[a[0]] = pick('kb', a[0], a[5]); BP[a[0]] = pick('pad', a[0], a[6]); });
  if (s) { CTL.ads = s.ads === 'toggle' ? 'toggle' : 'hold'; CTL.tads = s.tads === 'hold' ? 'hold' : 'toggle'; CTL.ps = clamp(+s.ps || 1, .3, 3); CTL.pi = s.pi ? 1 : 0; CTL.pa = s.pa === 0 ? 0 : 1; }
  ctlIndex();
}
function ctlSave() { try { localStorage.setItem('pc-ctl', JSON.stringify({ v: 1, kb: BK, pad: BP, ads: CTL.ads, tads: CTL.tads, ps: CTL.ps, pi: CTL.pi, pa: CTL.pa })); } catch (e) {} }
function ctlIndex() { for (const k in BYIN) delete BYIN[k]; ACTS.forEach(a => { BIND[a[0]] = BK[a[0]].concat(BP[a[0]]); BIND[a[0]].forEach(c => (BYIN[c] || (BYIN[c] = [])).push(a)); }); }
ctlLoad();
// --- names for keys and buttons
const KEYNAME = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', NumpadEnter: 'Num Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', WheelUp: 'Wheel up', WheelDown: 'Wheel down', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', IntlBackslash: '\\' };
const PADNAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'Left stick', 'Right stick', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'];
const PADSONY = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'PS'];
function keyName(c) {
  if (!c) return '—'; if (c.startsWith('Pad')) { const i = +c.slice(3); return (PAD.sony ? PADSONY : PADNAME)[i] || 'Button ' + (i + 1); }
  if (KEYNAME[c]) return KEYNAME[c]; if (c.startsWith('Key')) return c.slice(3); if (c.startsWith('Digit')) return c.slice(5); if (c.startsWith('Numpad')) return 'Num ' + c.slice(6); return c;
}
const padRecent = () => PAD.on && PAD.used && performance.now() - PAD.t < 30000;
// the key cap to show for an action in prompts and hints: what this player is actually using
function capOf(id) {
  const a = ACT_BY[id]; if (!a) return '?';
  if (typeof TOUCH !== 'undefined' && TOUCH.on) return a[2];
  if (padRecent() && BP[id].length) return keyName(BP[id][0]);
  return BK[id].length ? keyName(BK[id][0]) : '—';
}
const capText = s => s.indexOf('<b>F</b>') < 0 ? s : s.replace('<b>F</b>', '<b>' + capOf('use') + '</b>');
// --- what the player is doing right now decides which actions a key can start
const ctxNow = () => !P.car ? 'f' : P.car.spec.air && P.seat === 0 ? 'a' : 'c';
const FIRES = ['fire', 'cfire', 'guns'];
function isHeld(id) { if (TACT[id]) return true; const b = BIND[id]; if (b) for (let i = 0; i < b.length; i++) if (keys[b[i]]) return true; return false; }
function heldAmt(id) {   // 0 to 1: a key is all or nothing, a trigger can be half pressed
  if (TACT[id]) return 1; const b = BIND[id]; let v = 0; if (!b) return 0;
  for (let i = 0; i < b.length; i++) { const c = b[i]; if (c.charCodeAt(0) === 80 && c.charCodeAt(1) === 97) { const p = PAD.val[c] || 0; if (keys[c] || p > .08) v = Math.max(v, keys[c] ? Math.max(p, .5) : p); } else if (keys[c]) return 1; }
  return Math.min(1, v);
}
// a key, mouse button, wheel notch or controller button went down. Where two actions share it, the one made for this situation wins:
// Q is the radio in a car and the next gun on foot.
function inputDown(code, fresh) {   // fresh: the browser says this is a new press (keys and mouse buttons; a controller is polled, so it checks)
  if (keys[code] && !fresh) return; keys[code] = true; if (G.state !== 'playing') return;
  const rows = BYIN[code]; if (!rows) return; const cx = ctxNow(); let best = 9;
  for (let i = 0; i < rows.length; i++) if (rows[i][3].indexOf(cx) >= 0 && rows[i][3].length < best) best = rows[i][3].length;
  for (let i = 0; i < rows.length; i++) if (rows[i][3].indexOf(cx) >= 0 && rows[i][3].length === best) actDown(rows[i][0], 'in');
}
function inputUp(code) { if (!keys[code]) return; keys[code] = false; const rows = BYIN[code]; if (rows) for (let i = 0; i < rows.length; i++) actUp(rows[i][0], 'in'); }
function setAds(on) { ADS.on = on; mouse.right = on; if (typeof TOUCH !== 'undefined') TOUCH.aim = on; markAds(); }
function markAds() { if (typeof TOUCH === 'undefined') return; for (const id in TOUCH.el) if (tHow(id) === 'act:ads') TOUCH.el[id].classList.toggle('on', mouse.right); }
function actDown(id, src) {
  if (G.state !== 'playing') return;
  if (id === 'map') { const m = $('bigmap'); if (src === 'touch' && !m.hidden) { m.hidden = true; return; } m.hidden = false; $('board').hidden = true; drawBigMap(); return; }
  if (id === 'board') { const b = $('board'); if (src === 'touch' && !b.hidden) { b.hidden = true; return; } drawBoard(); b.hidden = false; $('bigmap').hidden = true; return; }
  if (id === 'pause') { if (shopOpen) closeShop(); else if (locked()) document.exitPointerLock(); else pause(); return; }
  if (P.dead) return;
  switch (id) {
    case 'fire': case 'cfire': case 'guns': if (P.down) return; mouse.down = true; mouse.fresh = true; initAudio(); return;
    case 'ping': pingHere(); return;
    case 'ads': if ((src === 'touch' ? CTL.tads : CTL.ads) === 'toggle') setAds(!mouse.right); else { mouse.right = true; markAds(); } return;
    case 'use': if (P.down) { bleedOut(); return; } if (shopOpen) closeShop(); else if (P.car) GAME.leaveCar(false); else if (prompt && prompt.act) prompt.act(); return;
    case 'reload': startReload(); return;
    case 'nade': throwGrenade(); return;
    case 'next': case 'cnext': cycleWeapon(1); return;
    case 'prev': cycleWeapon(-1); return;
    case 'radio': nextRadio(); return;
    case 'view': if (P.car) camFar = camFar ? 0 : 1; else { P.view = P.view === 1 ? 3 : 1; $('set-view').value = String(P.view); try { localStorage.setItem('pc-view', String(P.view)); } catch (x) {} } return;
    case 'driveby': callDriveBy(); return;
    case 'phone': if (shopOpen && shopOpen.kind === 'phone') closeShop(); else if (!shopOpen) openPhone(); return;
  }
}
function actUp(id, src) {
  if (FIRES.indexOf(id) >= 0) { if (!FIRES.some(isHeld)) mouse.down = false; }
  else if (id === 'ads') { if ((src === 'touch' ? CTL.tads : CTL.ads) !== 'toggle' && !isHeld('ads')) { mouse.right = false; markAds(); } }
  else if (id === 'map') { if (src !== 'touch' && !isHeld('map')) $('bigmap').hidden = true; }
  else if (id === 'board') { if (src !== 'touch' && !isHeld('board')) $('board').hidden = true; }
}
// an ADS left on goes off when it can no longer apply
function inputTick() { if (mouse.right && (P.car || P.dead) && !isHeld('ads')) setAds(false); }
// --- a controller: polled every frame
const PAD = { on: false, used: false, id: '', sony: false, lx: 0, ly: 0, rx: 0, ry: 0, val: {}, t: -1e9 };
const padDz = v => { v = +v || 0; const a = Math.abs(v); return a < .17 ? 0 : Math.sign(v) * Math.min(1, (a - .17) / .78); };
function pollPad(dt) {
  if (!navigator.getGamepads) return; let gp = null; let all = []; try { all = navigator.getGamepads() || []; } catch (e) {}
  for (let i = 0; i < all.length; i++) if (all[i] && all[i].connected !== false && all[i].buttons && all[i].buttons.length) { gp = all[i]; break; }
  if (!gp) { if (PAD.on) { PAD.on = false; PAD.lx = PAD.ly = PAD.rx = PAD.ry = 0; for (let i = 0; i < 17; i++) { PAD.val['Pad' + i] = 0; inputUp('Pad' + i); } } return; }
  if (!PAD.on || PAD.id !== gp.id) { PAD.on = true; PAD.id = gp.id; PAD.sony = /054c|playstation|dualshock|dualsense|^wireless controller/i.test(gp.id); if (!$('ctl').hidden) ctlRender(); }
  for (let i = 0; i < 17 && i < gp.buttons.length; i++) { const b = gp.buttons[i], v = typeof b === 'number' ? b : (b.value || (b.pressed ? 1 : 0)), c = 'Pad' + i, on = v > .3 || (typeof b === 'object' && b.pressed && i !== 6 && i !== 7); PAD.val[c] = v;
    if (on && !keys[c]) padDown(c); else if (!on && keys[c]) inputUp(c); }
  const ax = gp.axes || []; PAD.lx = padDz(ax[0]); PAD.ly = padDz(ax[1]); PAD.rx = padDz(ax[2]); PAD.ry = padDz(ax[3]);
  if (PAD.lx || PAD.ly || PAD.rx || PAD.ry) padUsed();
  if (G.state === 'playing' && (PAD.rx || PAD.ry)) {   // the right stick looks; the curve keeps small pushes fine for aiming
    const k = CTL.ps * 3.1 * dt * (firstPerson() || P.ads > .5 ? camera.fov / 72 : 1);
    P.cyaw -= PAD.rx * Math.abs(PAD.rx) * k; P.cpitch = clamp(P.cpitch - PAD.ry * Math.abs(PAD.ry) * k * .72 * (CTL.pi ? -1 : 1), -1.25, 1.35); P.idleCam = 0;
  }
}
function padUsed() {
  PAD.t = performance.now(); if (!PAD.used) { PAD.used = true; if (G.state === 'playing') banner('Controller on', 'Change its buttons on the Controls page', 2.2); }
  if (typeof TOUCH !== 'undefined' && TOUCH.on && TOUCH.cfg.mode === 'auto' && !TOUCH.edit) { TOUCH.coarse = false; setTouch(false); }   // a thumb on the screen brings them back
}
function padDown(c) {
  padUsed();
  if (CAP.on) { keys[c] = true; if (CAP.dev === 'pad') capSet(c); return; }
  if (G.state === 'paused' && c === 'Pad9' && $('ctl').hidden) { keys[c] = true; $('deploy').click(); return; }
  if (G.state === 'menu' && c === 'Pad9' && !NET.lob && $('ctl').hidden) { keys[c] = true; $('deploy').click(); return; }
  if (G.state === 'playing' && shopOpen) {   // menus: the d-pad picks, A takes it, B closes
    if (c === 'Pad12' || c === 'Pad13') { keys[c] = true; shopNav(c === 'Pad13' ? 1 : -1); return; }
    if (c === 'Pad0') { keys[c] = true; shopNav(0); return; }
    if (c === 'Pad1') { keys[c] = true; closeShop(); return; }
  }
  inputDown(c);
}
window.addEventListener('gamepadconnected', () => { PAD.t = performance.now(); });
// the stick that moves you: the touch stick when a thumb is on it, otherwise a controller's left stick
const stickX = () => typeof TOUCH !== 'undefined' && TOUCH.on && (TOUCH.fx || TOUCH.fy) ? TOUCH.fx : PAD.on ? PAD.lx : 0;
const stickY = () => typeof TOUCH !== 'undefined' && TOUCH.on && (TOUCH.fx || TOUCH.fy) ? TOUCH.fy : PAD.on ? PAD.ly : 0;
function shopNav(d) {
  if (!shopOpen) return; const list = shopOpen.list || []; if (!list.length) return;
  if (d === 0) { const it = list[clamp(shopOpen.hi | 0, 0, list.length - 1)]; if (it) buy(it.key); return; }
  shopOpen.hi = ((shopOpen.hi | 0) + d + list.length) % list.length; markShop(); SFX.tick();
}
function markShop() { const lis = $('shop-list').children, hi = shopOpen ? clamp(shopOpen.hi | 0, 0, lis.length - 1) : -1; for (let i = 0; i < lis.length; i++) lis[i].classList.toggle('hi', padRecent() && i === hi); }
// --- the Controls page
const CAP = { on: false, a: null, s: 0, dev: 'kb', el: null };
let ctlDev = 'kb';
const CTX_NAME = { f: 'on foot', c: 'in a car', a: 'flying' };
const grpOf = a => a[3] === 'fca' ? 'b' : a[3] === 'ca' ? 'c' : a[3][0];
function ctlNotes(a, T) {   // [clashes, shadowed]: other actions that share an input with this one where both can happen
  const bad = [], hid = [];
  ACTS.forEach(o => { if (o === a) return; const shared = T[a[0]].filter(c => T[o[0]].indexOf(c) >= 0); if (!shared.length) return;
    const both = [...a[3]].filter(ch => o[3].indexOf(ch) >= 0); if (!both.length) return;
    if (o[3].length === a[3].length) bad.push(o[1]); else if (o[3].length < a[3].length) hid.push(keyName(shared[0]) + ' ' + both.map(ch => CTX_NAME[ch]).join(' and ') + ' is ' + o[1]); });
  return [bad, hid];
}
function ctlRender() {
  const box = $('ctl-list'); if (!box) return; const T = ctlDev === 'pad' ? BP : BK, keep = box.scrollTop; box.textContent = ''; CAP.el = null;
  [['f', 'On foot'], ['c', 'In a car'], ['a', 'Flying'], ['b', 'Anywhere']].forEach(g => {
    const h = document.createElement('h4'); h.textContent = g[1]; box.appendChild(h);
    ACTS.forEach(a => {
      if (grpOf(a) !== g[0] || (ctlDev === 'pad' && STICKY.test(a[0]))) return;
      const row = document.createElement('div'); row.className = 'cr'; const nm = document.createElement('span'); nm.textContent = a[1] + (a[3] === 'ca' ? ' (and flying)' : ''); row.appendChild(nm);
      for (let s = 0; s < 2; s++) { const b = document.createElement('button'); b.type = 'button'; b.dataset.a = a[0]; b.dataset.s = String(s); b.textContent = T[a[0]][s] ? keyName(T[a[0]][s]) : '—';
        if (CAP.on && CAP.a === a[0] && CAP.s === s && CAP.dev === ctlDev) { b.className = 'cap'; b.textContent = ctlDev === 'pad' ? 'Press a button' : 'Press a key'; CAP.el = b; } row.appendChild(b); }
      const n = ctlNotes(a, T); if (n[0].length) { const sm = document.createElement('small'); sm.className = 'bad'; sm.textContent = 'Also starts: ' + n[0].join(', '); row.appendChild(sm); }
      if (n[1].length) { const sm = document.createElement('small'); sm.textContent = n[1].join(' · '); row.appendChild(sm); }
      box.appendChild(row); });
  });
  box.scrollTop = keep;
  document.querySelectorAll('#ctl .tabs button').forEach(b => b.classList.toggle('on', b.dataset.dev === ctlDev));
  $('ctl-ads').value = CTL.ads; $('ctl-ps').value = String(CTL.ps); $('ctl-pi').value = CTL.pi ? '1' : '0'; $('ctl-pa').value = CTL.pa ? '1' : '0'; $('ctl-ms').value = String(Math.round(SENS / .0022 * 100) / 100);
  $('ctl-padopts').hidden = ctlDev !== 'pad'; $('ctl-kbopts').hidden = ctlDev === 'pad';
  if (!CAP.on) $('ctl-note').textContent = ctlDev === 'pad' ? (PAD.on ? 'Controller: ' + PAD.id.replace(/\s*\(.*\)\s*$/, '').slice(0, 48) + '. Left stick moves, drives and flies; right stick looks. Tap a box, then press the button you want.' : 'No controller yet. Plug one in or pair it, then press any button on it. Left stick moves, right stick looks.')
    : 'Tap a box, then press the key, mouse button or wheel you want. Esc, `, 1–0, - and = stay as they are.';
}
function capStart(a, s, el) { CAP.on = true; CAP.a = a; CAP.s = s; CAP.dev = ctlDev; ctlRender(); $('ctl-note').textContent = ctlDev === 'pad' ? 'Press a controller button. Esc cancels, Backspace clears the box.' : 'Press a key, a mouse button (click this box again for the left button) or turn the wheel. Esc cancels, Backspace clears the box.'; }
function capEnd() { if (!CAP.on) return; CAP.on = false; ctlRender(); }
function capSet(code) {
  if (!CAP.on) return; const T = CAP.dev === 'pad' ? BP : BK, L = T[CAP.a].filter(c => c !== code);
  if (code === null) L.splice(CAP.s, 1); else if (CAP.s < L.length) L[CAP.s] = code; else L.push(code);
  T[CAP.a] = L.slice(0, 3); CAP.on = false; ctlIndex(); ctlSave(); ctlRender(); keysHelp(); SFX.tick();
}
function ctlOpen() { ctlDev = padRecent() ? 'pad' : 'kb'; $('ctl').hidden = false; ctlRender(); }
function ctlClose() { CAP.on = false; $('ctl').hidden = true; keysHelp(); }
$('ctl-open').addEventListener('click', ctlOpen); $('ctl-x').addEventListener('click', ctlClose); $('ctl-done').addEventListener('click', ctlClose);
$('ctl-list').addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b) return; if (CAP.on && CAP.el === b) return; capStart(b.dataset.a, +b.dataset.s, b); });
document.querySelectorAll('#ctl .tabs button').forEach(b => b.addEventListener('click', () => { CAP.on = false; ctlDev = b.dataset.dev; ctlRender(); }));
$('ctl-reset').addEventListener('click', () => { const pad = ctlDev === 'pad'; ACTS.forEach(a => { if (pad) BP[a[0]] = a[6].slice(); else BK[a[0]] = a[5].slice(); }); CAP.on = false; ctlIndex(); ctlSave(); ctlRender(); keysHelp(); });
$('ctl-ads').addEventListener('change', e => { CTL.ads = e.target.value === 'toggle' ? 'toggle' : 'hold'; ctlSave(); });
$('ctl-ps').addEventListener('input', e => { CTL.ps = clamp(+e.target.value || 1, .3, 3); ctlSave(); });
$('ctl-pi').addEventListener('change', e => { CTL.pi = e.target.value === '1' ? 1 : 0; ctlSave(); });
$('ctl-pa').addEventListener('change', e => { CTL.pa = e.target.value === '1' ? 1 : 0; ctlSave(); });
$('ctl-ms').addEventListener('input', e => { SENS = clamp(.0022 * (+e.target.value || 1), .0006, .008); try { localStorage.setItem('pc-sens', String(SENS)); } catch (x) {} });
['pointerdown', 'pointermove', 'pointerup', 'touchmove'].forEach(t => $('ctl').addEventListener(t, e => e.stopPropagation()));
// while a box is listening, the next key, mouse button or wheel notch is for it, and for nothing else
document.addEventListener('keydown', e => {
  if (!CAP.on) { if (e.code === 'Escape' && !$('ctl').hidden) { e.preventDefault(); ctlClose(); } return; }
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.code === 'Escape') return capEnd();
  if (CAP.dev !== 'kb') return;
  if (e.code === 'Backspace' || e.code === 'Delete') return capSet(null);
  if (RESERVED.test(e.code)) { $('ctl-note').textContent = keyName(e.code) + ' is kept for ' + (/^Digit/.test(e.code) ? 'picking guns' : e.code === 'Backquote' ? 'the dev menu' : /Minus|Equal/.test(e.code) ? 'mouse speed' : 'the browser') + '. Pick another key.'; return; }
  capSet(e.code);
}, true);
document.addEventListener('mousedown', e => {
  if (!CAP.on || CAP.dev !== 'kb') return;
  if (e.button === 0 && e.target !== CAP.el) { capEnd(); return; }   // a click anywhere else: stop listening and let the click do its job
  e.preventDefault(); e.stopImmediatePropagation(); capSet('Mouse' + e.button);
}, true);
document.addEventListener('wheel', e => { if (!CAP.on || CAP.dev !== 'kb') return; e.preventDefault(); e.stopImmediatePropagation(); capSet(e.deltaY > 0 ? 'WheelDown' : 'WheelUp'); }, { capture: true, passive: false });
document.addEventListener('contextmenu', e => { if (!$('ctl').hidden) e.preventDefault(); }, true);
// the key list on the menu follows the bindings
function keysHelp() {
  const dl = document.querySelector('.keys'); if (!dl) return; const k = (...ids) => ids.map(id => BK[id].length ? keyName(BK[id][0]) : '—').join(' ');
  const rows = [[k('fwd', 'left', 'back', 'right'), 'Move · drive'], ['Mouse', 'Look · ' + k('fire') + ' fires · ' + k('ads') + ' aims down sights'], [k('use'), 'Get in or out · carjack · shop · rob a till'],
    [k('sprint') + ' · ' + k('jump'), 'Sprint · jump / handbrake'], ['1–0 · ' + k('next'), 'Weapons (7 Glocks · 8 M60 · 9 launcher · 0 bazooka)'], [k('reload') + ' · ' + k('nade'), 'Reload · grenade'],
    [k('view') + ' · ' + k('behind'), 'Camera · look behind'], [k('radio') + ' · ' + k('horn'), 'Radio · horn, or siren in a police car'], [k('board') + ' · ' + k('map'), 'Players and turf · map'],
    [k('driveby') + ' · ' + k('phone'), 'Call a drive-by (4-kill streak) · phone'], [k('ping'), 'Mark a spot, an enemy or a car for your side (ping)'],
    ['Flying', k('afwd', 'aleft', 'aback', 'aright') + ' fly · ' + k('up') + ' up · ' + k('down') + ' down · mouse turns · ' + k('guns') + ' guns · ' + k('rockets') + ' rockets'],
    ['Controller', 'Works when connected · Controls changes any key or button']];
  dl.textContent = ''; rows.forEach(r => { const d = document.createElement('div'), t = document.createElement('dt'), v = document.createElement('dd'); t.textContent = r[0]; v.textContent = r[1]; d.append(t, v); dl.appendChild(d); });
}
keysHelp();
