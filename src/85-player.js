/* =====================================================================
   9. THE PLAYER — third person by default, V for first person; F gets in and out of cars
   ===================================================================== */
let meChar = makeChar(makeLook(7, 0));
const vmRoot = new T.Group(); vmScene.add(vmRoot);
let vmGun = null, vmId = '';
const vmSleeve = new T.MeshLambertMaterial({ color: 0x8a2a14 }), vmSkin = new T.MeshLambertMaterial({ color: 0xc68e63 }), vmHands = [new T.Group(), new T.Group()];
vmHands.forEach(h => { h.add(new T.Mesh(bxg(.085, .085, .4, 0, 0, .24), vmSleeve), new T.Mesh(bxg(.08, .095, .1), vmSkin)); vmRoot.add(h); });
function setVm(id) {
  if (vmId === id) return; vmId = id; if (vmGun) vmRoot.remove(vmGun); vmGun = null;
  const long = id !== 'pistol' && id !== 'smg' && id !== 'fist';
  if (GUN_GEO[id]) { vmGun = new T.Mesh(GUN_GEO[id], gunMat); vmGun.rotation.y = PI; vmRoot.add(vmGun); if (id === 'glocks') { const g2 = new T.Mesh(GUN_GEO[id], gunMat); g2.position.set(.34, 0, 0); vmGun.add(g2); } }
  // each arm runs from the hand back, down and outward, so it leaves the picture at the bottom corner
  vmHands[0].position.set(.012, -.055, .03); vmHands[0].rotation.set(.62, .3, 0); vmHands[1].visible = true;
  if (id === 'fist') { vmHands[0].position.set(.04, -.02, -.12); vmHands[1].position.set(-.34, -.02, -.12); vmHands[1].rotation.set(.62, -.3, 0); }
  else if (id === 'glocks') { vmHands[1].position.set(-.33, -.055, .03); vmHands[1].rotation.set(.62, -.3, 0); }
  else if (long) { vmHands[1].position.set(-.01, -.03, -.36); vmHands[1].rotation.set(.5, -.85, 0); } else { vmHands[1].position.set(-.045, -.075, .03); vmHands[1].rotation.set(.62, -.55, 0); }
}
const SIGHT = { pistol: .084, smg: .098, shotgun: .09, rifle: .118, marksman: .128, fist: .05, glocks: .084, m60: .12, gl: .12, rpg: .14 };
const autoNow = () => { const d = WEAPONS[P.wpn], w = P.inv[P.wpn]; return !!d.auto || (!!d.dual && !!w && !!w.sw); };   // a switch on the Glocks makes them automatic
function resetLoadout() { P.inv = { fist: { mag: 0, res: 0 }, pistol: { mag: WEAPONS.pistol.mag, res: 60 } }; P.wpn = 'pistol'; P.nades = 1; P.armor = 0; }
function giveWeapon(id, ammo) { const d = WEAPONS[id]; if (!d || d.melee || d.heli) return; if (!P.inv[id]) P.inv[id] = { mag: d.mag, res: ammo === undefined ? d.res : ammo }; else P.inv[id].res = Math.min(Math.round(d.res * 1.5), P.inv[id].res + (ammo === undefined ? d.mag * 2 : ammo)); }
function setWeapon(id) { if (!P.inv[id] || P.wpn === id || P.dead) return; if (P.car && !WEAPONS[id].car) return; P.wpn = id; P.reloadT = 0; P.autoReload = 0; P.switchT = .3; P.ads = 0; SFX.swap(); }
function cycleWeapon(dir) { const own = WID.filter(id => P.inv[id] && (!P.car || WEAPONS[id].car)); if (own.length < 2) return; setWeapon(own[(own.indexOf(P.wpn) + dir + own.length) % own.length]); }
function startReload() { const w = P.inv[P.wpn], d = WEAPONS[P.wpn]; if (d.melee || P.reloadT > 0 || w.mag >= d.mag || w.res <= 0) return; P.reloadT = d.reload; SFX.reload(d.reload); }
const scoped = () => !!WEAPONS[P.wpn].scope && P.ads > .75 && !P.car;
const firstPerson = () => (P.view === 1 && !P.car) || scoped();
// from the camera through the crosshair to whatever it lands on, then from the gun to that point
const AIM = { ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 0 }, _sp = { x: 0, y: 0, z: 0 }, _d0 = { x: 0, y: 0, z: 0 }, _d1 = { x: 0, y: 0, z: 0 };
function aimDir() {
  const cp = Math.cos(P.cpitch), fx = -Math.sin(P.cyaw) * cp, fy = Math.sin(P.cpitch), fz = -Math.cos(P.cyaw) * cp, fp = firstPerson();
  let ox = P.x, oy = P.y + (fp ? 1.6 : 1.45), oz = P.z;
  if (P.car) { seatPos(P.car, P.seat, _sp); ox = _sp.x; oy = _sp.y + 1.08; oz = _sp.z; }
  AIM.ox = ox; AIM.oy = oy; AIM.oz = oz; AIM.dx = fx; AIM.dy = fy; AIM.dz = fz; if (fp) return;
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, skip = Math.max(0, (ox - cx) * fx + (oy - cy) * fy + (oz - cz) * fz), sx = cx + fx * skip, sy = cy + fy * skip, sz = cz + fz * skip;
  let t = rayCars(sx, sy, sz, fx, fy, fz, rayWorld(sx, sy, sz, fx, fy, fz, 's', 300), P.car); const h2 = hyp(fx, fz);
  eachActor(a => { if (a === P || a.dead || a.gone) return; const ex = a.x - sx, ez = a.z - sz; if (h2 > .05) { const al = (ex * fx + ez * fz) / h2; if (al < -1 || ex * ex + ez * ez - al * al > 1.5) return; } const h = actorHit(a, sx, sy, sz, fx, fy, fz); if (h < t) t = h; });
  const px = sx + fx * t, py = sy + fy * t, pz = sz + fz * t;
  if (P.car) { const l2 = hyp(px - ox, pz - oz) || 1; ox += (px - ox) / l2 * .6; oz += (pz - oz) / l2 * .6; AIM.ox = ox; AIM.oz = oz; }
  const dx = px - ox, dy = py - oy, dz = pz - oz, l = hyp(dx, dy, dz); if (l > 1.4) { AIM.dx = dx / l; AIM.dy = dy / l; AIM.dz = dz / l; }
}
function tryFire() {
  const d = WEAPONS[P.wpn], w = P.inv[P.wpn];
  if (P.fireT > 0 || P.reloadT > 0 || P.switchT > 0 || P.dead || P.enter || P.knock > 0) return;
  if (d.melee) { if (!P.car) punch(); return; }
  if (P.car && !d.car) return;
  if (w.mag <= 0) { if (w.res > 0) startReload(); else { SFX.click(); P.fireT = .25; } return; }
  if (!DBG.ammo) w.mag--; P.fireT = 60 / (d.dual && w.sw ? d.sw : d.rpm); P.shootT = 1.3; meChar.kick = 1; if (d.dual) meChar.flip = !meChar.flip;
  aimDir();
  const moving = P.spd > 1.5 ? 1.45 : 1, spread = lerp(d.hip, d.spread, P.ads) * moving * (P.onGround || P.car ? 1 : 1.8) * (P.car ? 1.5 : 1) + P.kick * .06;
  let mx, my, mz;
  if (firstPerson()) { const rx = Math.cos(P.cyaw), rz = -Math.sin(P.cyaw), k = 1 - P.ads; mx = AIM.ox + rx * .16 * k + AIM.dx * .7; my = AIM.oy - .1 * k - .03 + AIM.dy * .7; mz = AIM.oz + rz * .16 * k + AIM.dz * .7; }
  else if (P.car) { mx = AIM.ox + AIM.dx * .5; my = AIM.oy; mz = AIM.oz + AIM.dz * .5; } else { mx = meChar.muz.x; my = meChar.muz.y; mz = meChar.muz.z; }
  if (d.proj) { fireProj(d.proj, mx + AIM.dx * .3, my + AIM.dy * .3, mz + AIM.dz * .3, AIM.dx + rs(spread), AIM.dy + rs(spread), AIM.dz + rs(spread), P, false); P.shots = (P.shots | 0) + 1; P.shotT = G.time; FX.muzzle(mx, my, mz, 1.6); }
  else shoot(P, AIM.ox, AIM.oy, AIM.oz, AIM.dx, AIM.dy, AIM.dz, d, spread, mx, my, mz);
  P.kick = Math.min(.32, P.kick + d.kick); P.cpitch = Math.min(1.35, P.cpitch + d.kick * (P.ads > .5 ? .16 : .24)); P.cyaw += rs(d.kick * .16); shake(d.kick * .5);
  if (d.cycle) SFX.cycle();
  if (!d.proj) { const rx = Math.cos(P.cyaw), rz = -Math.sin(P.cyaw); FX.casing(mx - AIM.dx * .3, my, mz - AIM.dz * .3, rx * 2.2 + rs(.6), 1.8 + rand(), rz * 2.2 + rs(.6)); }
  if (w.mag === 0 && w.res > 0) P.autoReload = .3;
}
function punch() {
  P.punchT = .34; P.fireT = 60 / WEAPONS.fist.rpm; P.shootT = .8;
  const fx = -Math.sin(P.cyaw), fz = -Math.cos(P.cyaw); let best = null, bd = WEAPONS.fist.reach;
  eachActor(a => { if (a === P || a.dead || a.car || ((isCrew(a.team) || a.team === TEAM_COP) && a.team === P.team)) return; const dx = a.x - P.x, dz = a.z - P.z, d = hyp(dx, dz); if (d >= bd || Math.abs(a.y - P.y) > 1.4 || (dx * fx + dz * fz) / (d || 1) < .4) return; bd = d; best = a; });
  SFX.punch(!!best); if (best) { FX.blood(best.x, best.y + 1.4, best.z, 3); hitActor(best, WEAPONS.fist.dmg, false, P, 'fist'); shake(.15); }
}
// --- cars: which one is in reach, and what F would do with it
function carInReach() {
  let best = null, bd = 2.9;
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c.wreck || c.burn > 0 || hyp(c.x - P.x, c.z - P.z) > 7 || Math.abs(c.y - P.y) > 1.5) continue; doorPos(c, 0, _d0, .5); doorPos(c, 1, _d1, .5); let d = Math.min(hyp(_d0.x - P.x, _d0.z - P.z), hyp(_d1.x - P.x, _d1.z - P.z));
    if (isPlane(c)) for (let k = 2; k < c.spec.seats; k++) { doorPos(c, k, _d0, .5); d = Math.min(d, hyp(_d0.x - P.x, _d0.z - P.z)); }   // a jet's cabin door, behind the cockpit's
    if (d < bd) { bd = d; best = c; } }
  return best;
}
function carOffer(c) {   // -> { seat, jack, text } or null
  const dr = c.occ[0], nm = (c.cop ? 'police ' : '') + c.spec.name + (c.spec.air === 'plane' ? (c.type === 'jet' ? ' jet' : ' plane') : c.spec.air ? ' helicopter' : ''), go = c.spec.air ? 'Fly' : 'Drive';
  if (!dr) return { seat: 0, jack: false, text: `<b>F</b>${go} the ${nm}` + (c.spec.air && c.home && c.home.kind === 'gun' && !c.stolen && P.team !== TEAM_COP ? ' · it brings three stars' : '') };
  if ((isCrew(dr.team) || dr.team === TEAM_COP) && dr.team === P.team) { for (let k = 1; k < c.spec.seats; k++) if (!c.occ[k]) return { seat: k, jack: false, text: `<b>F</b>Ride with ${nameOf(dr)}` }; return null; }
  if (carSpeed(c) < 7) return { seat: 0, jack: true, text: `<b>F</b>Jack the ${nm}` };
  return null;
}
function tryEnter(c, o) {
  if (P.enter || P.car || P.dead) return;
  P.enter = { car: c, seat: o.seat, t: o.jack ? .75 : .42, jack: o.jack, wait: 0 }; P.ads = 0; P.reloadT = 0;
  if (AUTH()) { if (!o.jack) { if (c.occ[o.seat]) { P.enter = null; return; } c.occ[o.seat] = P; } } else NET.req(o.jack ? 'cj' : 'en', c.id, o.seat);
  SFX.door(c.x, c.y, c.z);
}
function sitIn(c, seat) {
  P.enter = null; P.car = c; P.seat = seat; P.ads = 0; P.knock = 0;
  if (seat === 0) { c.inp.thr = 0; c.inp.steer = 0; c.inp.hb = false; c.ai = null; c.kin = false; c.mine = true; c.asleep = false; c.team = P.team; c.horn = 0; P.siren = false; if (AUTH()) GAME.boarded(c, P); }
  if (isPlane(c) && seat === 0 && !P.flownPlane) { P.flownPlane = true; banner(c.spec.name, TOUCH.on ? 'Throttle up (UP) and roll down the runway · stick back to climb, sideways to bank' : padRecent() ? 'RT throttle up, LT down · left stick flies it: back to climb, sideways to bank' : capOf('up') + ' throttle up, ' + capOf('down') + ' down · it flies where you look · ' + capOf('aback') + ' ' + capOf('afwd') + ' pitch, ' + capOf('aleft') + ' ' + capOf('aright') + ' bank', 6, 'gold'); }
  else if (c.spec.air && !isPlane(c) && seat === 0 && !P.flown) { P.flown = true; banner(c.spec.name, TOUCH.on ? 'The stick flies it · UP and DOWN for height · drag to turn' + (c.spec.air === 'gun' ? ' · FIRE guns · ROCKETS' : '') : 'W A S D fly · Space up · Shift down · the mouse turns it' + (c.spec.air === 'gun' ? ' · click guns · right-click rockets' : ''), 5, 'gold'); }
  if (!WEAPONS[P.wpn].car) { P.prevWpn = P.wpn; P.wpn = P.inv.smg ? 'smg' : 'pistol'; P.reloadT = 0; } else P.prevWpn = null;
  P.idleCam = 2; if (RADIO.on !== P.radio) setRadio(P.radio); radioVolume(P.radio >= 0 ? .55 : 0); if (P.radio >= 0) radioToast();   // whatever a speaker outside was playing gives way to the car's own station
}
function updateEnter(dt) {
  const E = P.enter, c = E.car; if (c.gone || c.wreck) { P.enter = null; return; }
  doorPos(c, E.seat, _d0, .55); const k = Math.min(1, dt * 9); P.x = lerp(P.x, _d0.x, k); P.z = lerp(P.z, _d0.z, k); P.yaw = lerpAng(P.yaw, yawOf(c.x - P.x, c.z - P.z), k); P.vx = P.vz = 0; P.spd = 2;
  E.t -= dt; if (E.t > 0) return;
  if (AUTH()) { if (E.jack) { if (c.occ[0] && c.occ[0] !== P) GAME.eject(c, 0, P); c.occ[0] = P; } sitIn(c, E.seat); }
  else if (c.occ[E.seat] === P) sitIn(c, E.seat); else { E.wait += dt; if (E.wait > 1.6) P.enter = null; }
}
GAME.leaveCar = dead => {
  const c = P.car; if (!c) return; const seat = P.seat, sp = carSpeed(c);
  if (AUTH()) { if (c.occ[seat] === P) c.occ[seat] = null; } else { NET.req('ex', c.id); c.occ[seat] = null; }
  if (seat === 0) { c.inp.thr = 0; c.inp.steer = 0; c.inp.hb = false; c.horn = 0; if (!AUTH()) { c.mine = false; c.buf.length = 0; } }
  P.car = null; setHorn(false); radioVolume(0);
  const tries = [[seat, .75], [seat ^ 1, .75], [seat, 1.5], [seat ^ 1, 1.5]]; let ok = false;
  for (let i = 0; i < tries.length && !ok; i++) { doorPos(c, tries[i][0], _d0, tries[i][1]); if (!pushOut(_d0.x, _d0.z, CFG.player.r, c.y + CFG.step + .01, c.y + 1.7, 'p')) { P.x = _d0.x; P.z = _d0.z; ok = true; } }
  if (!ok) { P.x = c.x; P.z = c.z; P.y = c.y + c.geo.roof + .1; } else P.y = c.y + .05;
  P.vx = c.vx * .5; P.vz = c.vz * .5; P.vy = 0; P.onGround = false; P.yaw = c.yaw; P.cyaw = P.cyaw;
  const high = c.spec.air && P.y - groundAt(P.x, P.z, P.y, 'p') > 6;
  if (high && !dead) { P.chute = 1; P.vy = Math.min(0, c.vy || 0); banner('Parachute', TOUCH.on ? 'Steer with the stick' : 'Steer with W A S D', 1.6); }
  else if (!dead && sp > 9) { hurtPlayer((sp - 9) * 2.4, null, 'fall'); P.knock = 1; P.knockT = .9; }
  if (P.prevWpn && P.inv[P.prevWpn]) P.wpn = P.prevWpn; P.prevWpn = null; if (!dead) SFX.door(c.x, c.y, c.z);
};
function radioToast() { const e = $('h-radio'); e.innerHTML = P.radio < 0 ? 'Radio off' : `<b>${STATIONS[P.radio].name}</b> · ${STATIONS[P.radio].tag}`; e.classList.add('on'); P.radioT = 2.6; }
function nextRadio() { P.radio = P.radio + 1 >= STATIONS.length ? -1 : P.radio + 1; setRadio(P.radio); radioVolume(P.radio >= 0 ? .55 : 0); radioToast(); try { localStorage.setItem('pc-radio', String(P.radio)); } catch (e) {} }
P.radio = 0; try { const r = localStorage.getItem('pc-radio'); if (r !== null && +r >= -1 && +r < STATIONS.length) P.radio = +r; } catch (e) {}
// --- shops and prompts
let prompt = null, shopOpen = null;
function findPrompt() {
  prompt = null; if (P.dead || P.car || P.enter) return;
  for (let i = 0; i < SHOPS.length; i++) { const s = SHOPS[i]; if (s.team !== undefined && s.team !== P.team) continue; if (hyp(s.x - P.x, s.z - P.z) < 2.3 && Math.abs(P.y - CURB) < 1.2) { prompt = { text: `<b>F</b>${s.name}: guns, ammo, armor`, act: () => openShop(s) }; return; } }
  { const bp = revivePrompt() || bankPrompt() || bizPrompt() || labPrompt() || jewelPrompt(); if (bp) { prompt = bp; return; } }
  for (let i = 0; i < ROBS.length; i++) { const r = ROBS[i]; if (hyp(r.x - P.x, r.z - P.z) > 1.7 || Math.abs(P.y - CURB) > 1.2) continue;
    if (P.rob && P.rob.i === i) { prompt = { text: 'Emptying the till… ' + Math.round(P.rob.t / 3.5 * 100) + '%' }; return; }
    if (!tillOpen(i)) prompt = { text: 'The till is empty. Give it a few minutes.' };
    else if (WEAPONS[P.wpn].melee) prompt = { text: 'Draw a gun to rob the till' };
    else prompt = { text: '<b>F</b>Rob the till', act: () => { P.rob = { i, t: 0 }; SFX.tick(); } };
    return; }
  const c = carInReach(); if (c) { const o = carOffer(c); if (o) prompt = { text: o.text, act: () => tryEnter(c, o) }; }
  if (!prompt) prompt = casePrompt();   // a case in the hand can always be put down
}
// holding someone up takes a few seconds of standing there with the gun out
function updateRob(dt) {
  const R = P.rob, r = ROBS[R.i]; if (hyp(r.x - P.x, r.z - P.z) > 2.2 || WEAPONS[P.wpn].melee || !tillOpen(R.i)) { P.rob = null; return; }
  R.t += dt; P.shootT = Math.max(P.shootT, .3); if (R.t < 3.5) return;
  P.rob = null; if (AUTH()) GAME.rob(P, R.i); else NET.req('rb', R.i);
}
// one panel for every menu: the gun shop, the car shop and the phone. Each brings its own items:
// { label, sub, cost, off (cannot be had right now), own (already yours), act }. An item can open a page of its own (shopOpen.page).
function openShop(s) { openMenu({ kind: 'gun', x: s.x, z: s.z, title: s.name, items: gunItems, foot: 'A number, a click or a tap to buy · ' + capOf('use') + ' or Esc closes' }); }
function openMenu(m) { shopOpen = m; $('shop-title').textContent = m.title; $('shop').className = 'pane menu-' + m.kind; $('shop-foot').textContent = m.foot || ''; renderShop(); $('shop').hidden = false; SFX.tick(); }
function closeShop() { shopOpen = null; $('shop').hidden = true; }
const page = (label, id) => ({ label: label + ' ›', act: () => { shopOpen.page = id; renderShop(); } }), back = () => ({ label: '‹ Back', act: () => { shopOpen.page = null; renderShop(); } });
function renderShop() {
  if (!shopOpen) return; const ol = $('shop-list'); ol.textContent = '';
  const row = (key, label, sub, right, cls) => { const li = document.createElement('li'), b = document.createElement('b'), a = document.createElement('span'), c = document.createElement('span'); li.className = cls; li.dataset.key = key; b.textContent = key === '10' ? '0' : key; a.textContent = label; if (sub) { const s = document.createElement('small'); s.textContent = sub; a.appendChild(s); } c.textContent = right; li.append(b, a, c); ol.appendChild(li); };
  shopOpen.list = shopOpen.items(shopOpen.page || null).slice(0, 10); shopOpen.list.forEach((it, i) => { it.key = String(i + 1); row(it.key, it.label, it.sub, it.cost > 0 ? '$' + it.cost.toLocaleString('en-US') : it.own ? 'Yours' : '', it.own ? 'own' : it.off || it.cost > P.cash ? 'no' : ''); });
  markShop();
}
function buy(key) {
  if (!shopOpen) return;
  const it = (shopOpen.list || []).find(q => q.key === key); if (!it || it.off || !it.act || (it.cost > 0 && P.cash < it.cost)) { SFX.deny(); if (it && it.lock) banner(it.label, it.lock, 1.6); return; }
  it.act(); if (shopOpen) renderShop();
}
// --- the gun shop: the basics on the first page, the guns on pages by kind; guns open with rank
const GUN_BLURB = { smg: 'Small, fast and good from a car', glocks: 'A pistol in each hand, 50-round drums', shotgun: 'Nine pellets, close up', rifle: 'The all-rounder', marksman: 'Scoped, long range', m60: '100-round belt, heavy hitting', gl: 'Six rounds that go off where they land', rpg: 'One rocket at a time: cars, crowds, helicopters' };
function ammoCost() { let n = 150; for (const id in P.inv) n += id === 'rpg' ? 450 : id === 'gl' ? 300 : id === 'm60' ? 150 : 0; return n; }
function gunItem(id) {
  const d = WEAPONS[id], need = UNLOCK[id] || 1;
  if (P.inv[id]) return { label: d.name, sub: 'Owned · ' + GUN_BLURB[id], off: true, own: true };
  if (need > (P.rank || 1)) return { label: d.name, sub: 'Opens at rank ' + need, off: true, lock: 'Opens at rank ' + need };
  return { label: d.name, sub: GUN_BLURB[id], cost: d.cost, act: () => { if (payCash(d.cost)) { giveWeapon(id); setWeapon(id); SFX.buy(); addRP(CFG.rp.mod); } } };
}
function gunItems(pg) {
  if (pg === 'hand') { const g = P.inv.glocks, need = UNLOCK.switch;
    return [gunItem('smg'), gunItem('glocks'), g && g.sw ? { label: 'Glock switch', sub: 'Fitted: the Glocks fire full auto', off: true, own: true } : !g ? { label: 'Glock switch', sub: 'Full auto for the Dual Glocks · buy the Glocks first', off: true } : need > (P.rank || 1) ? { label: 'Glock switch', sub: 'Opens at rank ' + need, off: true, lock: 'Opens at rank ' + need }
      : { label: 'Glock switch', sub: 'Makes the Dual Glocks fully automatic', cost: 1500, act: () => { if (payCash(1500)) { g.sw = true; SFX.buy(); banner('Glock switch', 'The Glocks fire full auto now', 2, 'gold'); saveGame(); } } }, back()]; }
  if (pg === 'long') return [gunItem('shotgun'), gunItem('rifle'), gunItem('marksman'), back()];
  if (pg === 'heavy') return [gunItem('m60'), gunItem('gl'), gunItem('rpg'), back()];
  return [
    { label: 'Ammo for every gun', sub: 'Full magazines and spares, rockets included', cost: ammoCost(), act: () => { if (payCash(ammoCost())) { for (const id in P.inv) { const d = WEAPONS[id]; if (!d.melee) { P.inv[id].mag = d.mag; P.inv[id].res = d.res; } } SFX.buy(); } } },
    P.armor >= 100 ? { label: 'Body armor', sub: 'Full', off: true, own: true } : { label: 'Body armor', sub: 'Soaks up most of what hits you', cost: 500, act: () => { if (payCash(500)) { P.armor = 100; SFX.buy(); } } },
    P.nades >= 6 ? { label: 'Grenade', sub: 'Carrying all you can (6)', off: true, own: true } : { label: 'Grenade', sub: P.nades + ' of 6 · ' + capOf('nade') + ' throws one', cost: 200, act: () => { if (payCash(200)) { P.nades++; SFX.buy(); } } },
    P.hp >= maxHp() ? { label: 'Medkit', sub: 'Not hurt', off: true } : { label: 'Medkit', sub: 'Back to full health', cost: 250, act: () => { if (payCash(250)) { P.hp = maxHp(); SFX.buy(); } } },
    page('Handguns & SMGs', 'hand'), page('Shotguns & rifles', 'long'), page('Heavy weapons', 'heavy')];
}
function collectPickups() {
  for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; if (hyp(p.x - P.x, p.z - P.z) > 1.4 || Math.abs(p.y - P.y) > 1.6 || P.dead) continue;
    if (p.type === 'hbag') { if (P.bag || P.down) continue; if (AUTH()) GAME.takeHBag(p, P); else { NET.req('pk', p.id); NET.pkGone[p.id] = G.time; removePickup(p); } }
    else if (p.type === 'chain' || p.type === 'cash' || p.type === 'bag' || p.type === 'loot') { if (AUTH()) (p.type === 'chain' ? GAME.takeChain : p.type === 'cash' ? GAME.takeCash : p.type === 'loot' ? GAME.takeLoot : GAME.takeBag)(p, P); else { NET.req('pk', p.id); NET.pkGone[p.id] = G.time; removePickup(p); if (p.type === 'cash' || p.type === 'loot') SFX.cash(); } }
    else { const had = !!P.inv[p.type]; giveWeapon(p.type, WEAPONS[p.type].mag * 2); SFX.swap(); if (!had) { banner(WEAPONS[p.type].name, 'picked up', 1.6); } if (AUTH()) removePickup(p); else { NET.req('pk', p.id); NET.pkGone[p.id] = G.time; removePickup(p); } } }
}
// --- on foot
function updateOnFoot(dt) {
  let fwd = (isHeld('fwd') ? 1 : 0) - (isHeld('back') ? 1 : 0), str = (isHeld('right') ? 1 : 0) - (isHeld('left') ? 1 : 0), push = 1; const d = WEAPONS[P.wpn], w = P.inv[P.wpn];
  { const sx = stickX(), sy = stickY(); if (sx || sy) { fwd = -sy; str = sx; push = Math.min(1, hyp(fwd, str)); } }   // a stick: a little push walks, all the way runs; on a touch screen, pinned forward sprints
  const aiming = mouse.right && P.reloadT <= 0 && !d.melee && P.knock <= 0, sprint = (isHeld('sprint') || (TOUCH.on && push > .95)) && fwd > (TOUCH.on ? .4 : 0) && !aiming && P.reloadT <= 0 && !P.bag;
  let wx = -Math.sin(P.cyaw) * fwd + Math.cos(P.cyaw) * str, wz = -Math.cos(P.cyaw) * fwd - Math.sin(P.cyaw) * str; const wl = hyp(wx, wz), sp = (sprint ? CFG.player.sprint : CFG.player.run * (push < 1 ? lerp(.45, 1, push) : 1)) * lerp(1, .52, P.ads) * (P.knock > 0 ? 0 : 1) * (P.bag ? .8 : 1);
  if (wl > 0) { wx = wx / wl * sp; wz = wz / wl * sp; }
  if (P.chute) { const k = 6.5 / (sp || 1); wx *= k; wz *= k; P.vy = Math.max(P.vy, -4.6); }   // under a canopy: a slow drift down, steered
  const acc = Math.min(1, dt * (P.onGround ? 11 : P.chute ? 1.6 : 2.5)); P.vx = lerp(P.vx, wx, acc); P.vz = lerp(P.vz, wz, acc);
  const jmp = isHeld('jump'); if (jmp && P.onGround && !P.jumpHeld && P.knock <= 0) { P.vy = CFG.player.jump; P.onGround = false; P.jumpHeld = true; } if (!jmp) P.jumpHeld = false;
  const wasAir = !P.onGround;
  moveEntity(P, P.vx * dt, P.vz * dt, dt, CFG.player.r, 'p', CFG.player.h); carBlock(P, CFG.player.r);
  if (wasAir && P.onGround) { if (P.fell < -15) hurtPlayer((-P.fell - 15) * 8, null, 'fall'); if (P.fell < -5) SFX.land(); }
  if (P.chute && P.onGround) { P.chute = 0; SFX.land(); }
  if (P.y < -4 || (P.onGround && P.y < 1 && !onLand(P.x, P.z))) swimAshore();
  P.spd = hyp(P.vx, P.vz); P.sprint = sprint && P.spd > 5.5;
  if (P.onGround) { P.stepPh = (P.stepPh || 0) + dt * P.spd * 2.1; const si = Math.floor(P.stepPh / PI); if (si !== P.stepI) { P.stepI = si; if (P.spd > 1.2) SFX.step(sprint ? 1.3 : 1); } }
  // which way the body faces: with the camera when a weapon is up, otherwise where it is walking
  if (firstPerson() || P.ads > .2 || P.shootT > 0) P.yaw = lerpAng(P.yaw, P.cyaw, Math.min(1, dt * 20)); else if (P.spd > .6) P.yaw = lerpAng(P.yaw, yawOf(P.vx, P.vz), Math.min(1, dt * 11));
  P.pitch = P.cpitch; P.shootT -= dt; if (P.knock > 0) { P.knockT -= dt; if (P.knockT <= 0) P.knock = 0; }
  // weapon
  if (P.autoReload > 0) { P.autoReload -= dt; if (P.autoReload <= 0) startReload(); }
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { const n = Math.min(d.mag - w.mag, w.res); w.mag += n; w.res -= n; } }
  if (mouse.down && !sprint && !P.down && (autoNow() || mouse.fresh)) tryFire();
  mouse.fresh = false;
  P.ads = lerp(P.ads, aiming && !sprint ? 1 : 0, Math.min(1, dt * 13));
  if (P.rob) updateRob(dt); hackTick(dt); reviveTick(dt); findPrompt(); collectPickups(); myCases(dt);
  if (shopOpen && shopOpen.kind === 'gun' && hyp(shopOpen.x - P.x, shopOpen.z - P.z) > 3.4) closeShop();
}
// --- at the wheel, or riding
function updateInCar(dt) {
  const c = P.car, d = WEAPONS[P.wpn], w = P.inv[P.wpn];
  if (c.gone) { P.car = null; return; }
  if (c.spec.air && (c.sunk || (c.wreck && c.y < 1.2 && !onLand(c.x, c.z)))) { GAME.leaveCar(true); swimAshore(); return; }
  if (isPlane(c) && P.seat === 0 && c.mine !== false) planeControls(c, dt);
  else if (c.spec.air && P.seat === 0 && c.mine !== false) heliControls(c, dt);
  else if (P.seat === 0 && c.mine !== false) {
    const inp = c.inp; inp.thr = heldAmt('gas') - heldAmt('brake'); inp.steer = (isHeld('steerR') ? 1 : 0) - (isHeld('steerL') ? 1 : 0); inp.hb = isHeld('hb');
    { const sx = stickX(), sy = stickY(); if (sx) inp.steer = clamp(inp.steer + sx * 1.15, -1, 1); if (TOUCH.on && !isHeld('gas') && !isHeld('brake') && Math.abs(sy) > .3) inp.thr = clamp(-sy * 1.3, -1, 1); }   // a stick steers; on a touch screen up or down on it drives when GAS and BRAKE are not held
    nitrous(c, dt, isHeld('nos')); stepCar(c, dt, inp);
    const hk = isHeld('horn'); if (c.cop) { if (hk && !P.hornHeld) P.siren = !P.siren; c.horn = P.siren ? 1 : 0; setHorn(false); } else { c.horn = hk ? 1 : 0; setHorn(hk); } P.hornHeld = hk;
    GAME.roadkill(c, P);
    garageCheck(c);   // stop in a garage and the car shop opens: repairs, resprays that lose the police, armor, engine, and keeping the car
  }
  seatPos(c, P.seat, _sp); P.x = _sp.x; P.z = _sp.z; P.y = c.y; P.vx = c.vx; P.vz = c.vz; P.vy = 0; P.onGround = true; P.yaw = c.yaw; P.spd = 0; P.pitch = P.cpitch; P.sprint = false;
  P.shootT -= dt; if (P.autoReload > 0) { P.autoReload -= dt; if (P.autoReload <= 0) startReload(); }
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { const n = Math.min(d.mag - w.mag, w.res); w.mag += n; w.res -= n; } }
  if (mouse.down && (autoNow() || mouse.fresh) && !(c.spec.air && P.seat === 0)) tryFire(); mouse.fresh = false; P.ads = 0; prompt = null;
  if (P.radioT > 0) { P.radioT -= dt; if (P.radioT <= 0) $('h-radio').classList.remove('on'); }
}
function updatePlayer(dt) {
  P.fireT -= dt; P.switchT -= dt; P.safeT -= dt; P.kick = Math.max(0, P.kick - dt * 1.3); if (P.punchT > 0) P.punchT -= dt;
  if (P.dead) { P.deadT += dt; P.spd = 0; if (P.deadT >= CFG.respawn && G.phase === 'play') GAME.respawn(); return; }
  if (P.down > 0) downTick(dt);
  if (P.enter) updateEnter(dt); else if (P.car) updateInCar(dt); else updateOnFoot(dt);
  if (G.time - P.lastHit > CFG.player.regenDelay && P.hp < maxHp()) P.hp = Math.min(maxHp(), P.hp + CFG.player.regenRate * dt);
  P.cash = (P.bank === undefined ? CFG.startCash : P.bank) + P.earn - P.spent;
}
// --- camera
let camDist = 3.4, camFar = 0;
function updateCamera(dt) {
  const cp = Math.cos(P.cpitch), fx = -Math.sin(P.cyaw) * cp, fy = Math.sin(P.cpitch), fz = -Math.cos(P.cyaw) * cp, rx = Math.cos(P.cyaw), rz = -Math.sin(P.cyaw), d = WEAPONS[P.wpn];
  P.camY = lerp(P.camY === undefined ? P.y : P.camY, P.y, Math.min(1, dt * 14)); if (Math.abs(P.camY - P.y) > 1.5) P.camY = P.y;
  const sk = shakeAmt * shakeAmt, sx = rs(sk * .05), sy = rs(sk * .05); let fov = 72, px, py, pz, want, rollZ = 0;
  if (P.dead) { P.orbit = (P.orbit || 0) + dt * .25; px = P.x; py = P.y + .8; pz = P.z; const a = P.cyaw + P.orbit; want = 5; camDist = lerp(camDist, want, Math.min(1, dt * 3)); const t = Math.min(camDist, rayWorld(px, py, pz, Math.sin(a) * .9, .42, Math.cos(a) * .9, 's', camDist + .3) - .3); camera.position.set(px + Math.sin(a) * .9 * t, py + .42 * t, pz + Math.cos(a) * .9 * t); camera.rotation.set(-.44, a, 0); }
  else if (P.car) {
    const c = P.car, sp = carSpeed(c), air = !!c.spec.air; P.idleCam += dt;
    const lb = isHeld('behind'), plane = isPlane(c); if (plane && (TOUCH.on || padRecent() || P.seat) && P.idleCam > .5) { P.cyaw = lerpAng(P.cyaw, c.yaw, Math.min(1, dt * 2.2)); P.cpitch = lerp(P.cpitch, -.14 + (c.dive || 0) * .45, Math.min(1, dt * 1.6)); }   // a plane flown by stick: the view swings in behind it
    if (!air && P.idleCam > 1.1 && sp > 2.5 && !lb) { P.cyaw = lerpAng(P.cyaw, c.yaw, Math.min(1, dt * 2.6)); P.cpitch = lerp(P.cpitch, -.13, Math.min(1, dt * 2)); }   // a helicopter turns to the camera instead
    const yaw = P.cyaw + (lb && !air ? PI : 0), cpp = Math.cos(P.cpitch), bx = -Math.sin(yaw) * cpp, bz = -Math.cos(yaw) * cpp; px = c.x; py = c.y + (plane ? 2.8 : air ? 2.4 : 1.5); pz = c.z; want = plane ? (camFar ? 30 : 17) + sp * .04 : air ? (camFar ? 20 : 12.5) + sp * .06 : (camFar ? 9.5 : 6.6) + sp * .055 + (c.spec.len - 4.5) * .6;
    camDist = lerp(camDist, want, Math.min(1, dt * 5)); const t = Math.max(1.2, Math.min(camDist, rayWorld(px, py, pz, -bx, -fy + .12, -bz, 's', camDist + .4) - .4));
    camera.position.set(px - bx * t + sx, py + (-fy + .12) * t + .5 + sy, pz - bz * t); camera.rotation.set(P.cpitch - .04 + sy * .3, yaw + sx * .3, clamp(c.yawRate * .02, -.05, .05)); fov = 72 + Math.min(16, sp * .32);
  } else if (firstPerson()) {
    const bob = P.onGround ? Math.sin(P.stepPh || 0) * .028 * Math.min(1, P.spd / 5) : 0; camera.position.set(P.x + sx, P.camY + 1.6 + bob + sy, P.z); camera.rotation.set(P.cpitch + P.kick * .1 + sy * .4, P.cyaw + sx * .4, 0); fov = lerp(74, d.zoom, P.ads) + (P.sprint ? 4 : 0);
  } else {
    const sh = lerp(.5, .78, P.ads); px = P.x + rx * sh; py = P.camY + 1.58; pz = P.z + rz * sh; want = lerp(3.7, 2.25, P.ads);
    camDist = lerp(camDist, want, Math.min(1, dt * 10));
    const side = rayWorld(P.x, py, P.z, rx, 0, rz, 's', sh + .25); if (side < sh + .2) { const k = Math.max(0, side - .22); px = P.x + rx * k; pz = P.z + rz * k; }
    const t = Math.max(.35, Math.min(camDist, rayCars(px, py, pz, -fx, -fy, -fz, rayWorld(px, py, pz, -fx, -fy, -fz, 's', camDist + .3), null) - .28));
    P.camClose = t < .95; camera.position.set(px - fx * t + sx, py - fy * t + .12 + sy, pz - fz * t); camera.rotation.set(P.cpitch + sy * .4, P.cyaw + sx * .4, rollZ); fov = lerp(72, Math.max(44, d.zoom + 4), P.ads) + (P.sprint ? 5 : 0);
  }
  { const nr = (P.car && P.car.spec.air) || P.chute ? 1 : .12; if (camera.near !== nr) { camera.near = nr; camera.updateProjectionMatrix(); } }   // up in the air the near plane steps back, so the ground far below does not shimmer
  if (Math.abs(camera.fov - fov) > .05) { camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 12)); camera.updateProjectionMatrix(); }
  skyDome.position.copy(camera.position);
  EAR.x = camera.position.x; EAR.y = camera.position.y; EAR.z = camera.position.z; EAR.rx = rx; EAR.rz = rz;
}
// --- how the player looks to the camera: the body in third person, a pair of hands in first
function updatePlayerLook(dt) {
  const fp = firstPerson() && !P.dead, d = WEAPONS[P.wpn];
  if (fp || (P.camClose && !P.car && !P.dead) || isPlane(P.car)) hideChar(meChar);   // in a plane the cabin hides whoever is aboard   // a wall has pushed the camera into the player's back: do not fill the screen with it
  else { let twist = 0, seat = null, aim = P.wpn === 'fist' ? 0 : Math.max(P.ads, P.shootT > 0 ? 1 : 0);
    if (P.car) { seat = P.seat === 0 ? 'drive' : 'ride'; aim = P.shootT > 0 ? 1 : 0; twist = aim ? clamp(angTo(P.car.yaw, P.cyaw), -1.5, 1.5) : 0; }
    const s = P.car ? seatPos(P.car, P.seat, _sp) : P;
    poseChar(meChar, { x: s.x, y: P.car ? s.y : P.y, z: s.z, yaw: P.yaw, pitch: P.pitch, spd: P.enter ? 2 : P.spd, air: !P.onGround && !P.car, wpn: P.wpn, aim, reload: P.reloadT > 0, seat, twist, dead: P.dead ? P.deadT : -1, knock: P.knock, punch: P.punchT > 0 ? Math.sin(P.punchT / .34 * PI) : 0, sprint: P.sprint }, dt); }
  vmRoot.visible = fp && !scoped();
  if (vmRoot.visible) { setVm(P.wpn); const low = P.reloadT > 0 ? Math.sin(clamp((d.reload - P.reloadT) / d.reload, 0, 1) * PI) * .2 : P.switchT > 0 ? P.switchT * .6 : 0, pn = P.punchT > 0 ? Math.sin(P.punchT / .34 * PI) : 0, bob = P.stepPh || 0, mv = Math.min(1, P.spd / 5) * (1 - P.ads);
    vmRoot.position.set(lerp(.17, 0, P.ads) + Math.cos(bob * .5) * .007 * mv, lerp(-.17, -(SIGHT[P.wpn] || .1), P.ads) - low + Math.abs(Math.sin(bob)) * .007 * mv - (P.sprint ? .04 : 0), lerp(-.4, -.3, P.ads) + P.kick * .45 - pn * .2);
    vmRoot.rotation.set(P.kick * 1.3 - low * 1.5, P.sprint ? .45 : 0, 0); }
  const so = scoped() ? 1 : 0; if (P.scopeO !== so) { P.scopeO = so; $('scope').style.opacity = so; }
}
