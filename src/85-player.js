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
  if (GUN_GEO[id]) { vmGun = new T.Mesh(GUN_GEO[id], gunMat); vmGun.rotation.y = PI; vmRoot.add(vmGun); }
  // each arm runs from the hand back, down and outward, so it leaves the picture at the bottom corner
  vmHands[0].position.set(.012, -.055, .03); vmHands[0].rotation.set(.62, .3, 0); vmHands[1].visible = true;
  if (id === 'fist') { vmHands[0].position.set(.04, -.02, -.12); vmHands[1].position.set(-.34, -.02, -.12); vmHands[1].rotation.set(.62, -.3, 0); }
  else if (long) { vmHands[1].position.set(-.01, -.03, -.36); vmHands[1].rotation.set(.5, -.85, 0); } else { vmHands[1].position.set(-.045, -.075, .03); vmHands[1].rotation.set(.62, -.55, 0); }
}
const SIGHT = { pistol: .084, smg: .098, shotgun: .09, rifle: .118, marksman: .128, fist: .05 };
function resetLoadout() { P.inv = { fist: { mag: 0, res: 0 }, pistol: { mag: WEAPONS.pistol.mag, res: 60 } }; P.wpn = 'pistol'; P.nades = 1; P.armor = 0; }
function giveWeapon(id, ammo) { const d = WEAPONS[id]; if (!d || d.melee) return; if (!P.inv[id]) P.inv[id] = { mag: d.mag, res: ammo === undefined ? d.res : ammo }; else P.inv[id].res = Math.min(Math.round(d.res * 1.5), P.inv[id].res + (ammo === undefined ? d.mag * 2 : ammo)); }
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
  if (!DBG.ammo) w.mag--; P.fireT = 60 / d.rpm; P.shootT = 1.3; meChar.kick = 1;
  aimDir();
  const moving = P.spd > 1.5 ? 1.45 : 1, spread = lerp(d.hip, d.spread, P.ads) * moving * (P.onGround || P.car ? 1 : 1.8) * (P.car ? 1.5 : 1) + P.kick * .06;
  let mx, my, mz;
  if (firstPerson()) { const rx = Math.cos(P.cyaw), rz = -Math.sin(P.cyaw), k = 1 - P.ads; mx = AIM.ox + rx * .16 * k + AIM.dx * .7; my = AIM.oy - .1 * k - .03 + AIM.dy * .7; mz = AIM.oz + rz * .16 * k + AIM.dz * .7; }
  else if (P.car) { mx = AIM.ox + AIM.dx * .5; my = AIM.oy; mz = AIM.oz + AIM.dz * .5; } else { mx = meChar.muz.x; my = meChar.muz.y; mz = meChar.muz.z; }
  shoot(P, AIM.ox, AIM.oy, AIM.oz, AIM.dx, AIM.dy, AIM.dz, d, spread, mx, my, mz);
  P.kick = Math.min(.32, P.kick + d.kick); P.cpitch = Math.min(1.35, P.cpitch + d.kick * (P.ads > .5 ? .16 : .24)); P.cyaw += rs(d.kick * .16); shake(d.kick * .5);
  if (d.cycle) SFX.cycle();
  { const rx = Math.cos(P.cyaw), rz = -Math.sin(P.cyaw); FX.casing(mx - AIM.dx * .3, my, mz - AIM.dz * .3, rx * 2.2 + rs(.6), 1.8 + rand(), rz * 2.2 + rs(.6)); }
  if (w.mag === 0 && w.res > 0) P.autoReload = .3;
}
function punch() {
  P.punchT = .34; P.fireT = 60 / WEAPONS.fist.rpm; P.shootT = .8;
  const fx = -Math.sin(P.cyaw), fz = -Math.cos(P.cyaw); let best = null, bd = WEAPONS.fist.reach;
  eachActor(a => { if (a === P || a.dead || a.car || (isCrew(a.team) && a.team === P.team)) return; const dx = a.x - P.x, dz = a.z - P.z, d = hyp(dx, dz); if (d >= bd || Math.abs(a.y - P.y) > 1.4 || (dx * fx + dz * fz) / (d || 1) < .4) return; bd = d; best = a; });
  SFX.punch(!!best); if (best) { FX.blood(best.x, best.y + 1.4, best.z, 3); hitActor(best, WEAPONS.fist.dmg, false, P, 'fist'); shake(.15); }
}
// --- cars: which one is in reach, and what F would do with it
function carInReach() {
  let best = null, bd = 2.9;
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c.wreck || c.burn > 0 || hyp(c.x - P.x, c.z - P.z) > 7 || Math.abs(c.y - P.y) > 1.5) continue; doorPos(c, 0, _d0, .5); doorPos(c, 1, _d1, .5); const d = Math.min(hyp(_d0.x - P.x, _d0.z - P.z), hyp(_d1.x - P.x, _d1.z - P.z)); if (d < bd) { bd = d; best = c; } }
  return best;
}
function carOffer(c) {   // -> { seat, jack, text } or null
  const dr = c.occ[0], nm = (c.cop ? 'police ' : '') + c.spec.name;
  if (!dr) return { seat: 0, jack: false, text: `<b>F</b>Drive the ${nm}` };
  if (isCrew(dr.team) && dr.team === P.team) { for (let k = 1; k < c.spec.seats; k++) if (!c.occ[k]) return { seat: k, jack: false, text: `<b>F</b>Ride with ${nameOf(dr)}` }; return null; }
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
  if (seat === 0) { c.inp.thr = 0; c.inp.steer = 0; c.inp.hb = false; c.ai = null; c.kin = false; c.mine = true; c.asleep = false; c.team = P.team; c.horn = 0; P.siren = false; if (c.cop && !c.stolen && AUTH()) { c.stolen = true; GAME.crime(P, 20, 1); } }
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
  if (!dead && sp > 9) { hurtPlayer((sp - 9) * 2.4, null, 'fall'); P.knock = 1; P.knockT = .9; }
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
  for (let i = 0; i < ROBS.length; i++) { const r = ROBS[i]; if (hyp(r.x - P.x, r.z - P.z) > 1.7 || Math.abs(P.y - CURB) > 1.2) continue;
    if (P.rob && P.rob.i === i) { prompt = { text: 'Emptying the till… ' + Math.round(P.rob.t / 3.5 * 100) + '%' }; return; }
    if (!tillOpen(i)) prompt = { text: 'The till is empty. Give it a few minutes.' };
    else if (WEAPONS[P.wpn].melee) prompt = { text: 'Draw a gun to rob the till' };
    else prompt = { text: '<b>F</b>Rob the till', act: () => { P.rob = { i, t: 0 }; SFX.tick(); } };
    return; }
  const c = carInReach(); if (c) { const o = carOffer(c); if (o) prompt = { text: o.text, act: () => tryEnter(c, o) }; }
}
// holding someone up takes a few seconds of standing there with the gun out
function updateRob(dt) {
  const R = P.rob, r = ROBS[R.i]; if (hyp(r.x - P.x, r.z - P.z) > 2.2 || WEAPONS[P.wpn].melee || !tillOpen(R.i)) { P.rob = null; return; }
  R.t += dt; P.shootT = Math.max(P.shootT, .3); if (R.t < 3.5) return;
  P.rob = null; if (AUTH()) GAME.rob(P, R.i); else NET.req('rb', R.i);
}
function openShop(s) { shopOpen = s; $('shop-title').textContent = s.name; renderShop(); $('shop').hidden = false; SFX.tick(); }
function closeShop() { shopOpen = null; $('shop').hidden = true; }
function renderShop() { const ol = $('shop-list'); ol.textContent = ''; SHOP.forEach(it => { const li = document.createElement('li'), own = WEAPONS[it.what] && P.inv[it.what], full = (it.what === 'armor' && P.armor >= 100) || (it.what === 'nade' && P.nades >= 4);
    li.className = own || full ? 'own' : P.cash < it.cost ? 'no' : ''; li.dataset.key = it.key; const b = document.createElement('b'), a = document.createElement('span'), c = document.createElement('span'); b.textContent = it.key; a.textContent = it.label; c.textContent = own ? 'Owned' : full ? 'Full' : '$' + it.cost; li.append(b, a, c); ol.appendChild(li); }); }
function buy(key) {
  const it = SHOP.find(q => q.key === key); if (!it) return;
  const own = WEAPONS[it.what] && P.inv[it.what], full = (it.what === 'armor' && P.armor >= 100) || (it.what === 'nade' && P.nades >= 4);
  if (own || full || P.cash < it.cost) { SFX.deny(); return; }
  P.spent += it.cost; P.cash -= it.cost; SFX.buy(); gain(-it.cost);
  if (it.what === 'ammo') { for (const id in P.inv) { const d = WEAPONS[id]; if (!d.melee) { P.inv[id].mag = d.mag; P.inv[id].res = d.res; } } }
  else if (it.what === 'armor') P.armor = 100; else if (it.what === 'nade') P.nades++; else { giveWeapon(it.what); setWeapon(it.what); }
  renderShop();
}
function collectPickups() {
  for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; if (hyp(p.x - P.x, p.z - P.z) > 1.4 || Math.abs(p.y - P.y) > 1.6 || P.dead) continue;
    if (p.type === 'chain' || p.type === 'cash' || p.type === 'bag') { if (AUTH()) (p.type === 'chain' ? GAME.takeChain : p.type === 'cash' ? GAME.takeCash : GAME.takeBag)(p, P); else { NET.req('pk', p.id); NET.pkGone[p.id] = G.time; removePickup(p); if (p.type === 'cash') SFX.cash(); } }
    else { const had = !!P.inv[p.type]; giveWeapon(p.type, WEAPONS[p.type].mag * 2); SFX.swap(); if (!had) { banner(WEAPONS[p.type].name, 'picked up', 1.6); } if (AUTH()) removePickup(p); else { NET.req('pk', p.id); NET.pkGone[p.id] = G.time; removePickup(p); } } }
}
// --- on foot
function updateOnFoot(dt) {
  let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), push = 1; const d = WEAPONS[P.wpn], w = P.inv[P.wpn];
  if (TOUCH.on && (TOUCH.fx || TOUCH.fy)) { fwd = -TOUCH.fy; str = TOUCH.fx; push = Math.min(1, hyp(fwd, str)); }   // the stick: a little push walks, all the way runs, pinned forward sprints
  const aiming = mouse.right && P.reloadT <= 0 && !d.melee && P.knock <= 0, sprint = (keys.ShiftLeft || keys.ShiftRight || (TOUCH.on && push > .95)) && fwd > (TOUCH.on ? .4 : 0) && !aiming && P.reloadT <= 0;
  let wx = -Math.sin(P.cyaw) * fwd + Math.cos(P.cyaw) * str, wz = -Math.cos(P.cyaw) * fwd - Math.sin(P.cyaw) * str; const wl = hyp(wx, wz), sp = (sprint ? CFG.player.sprint : CFG.player.run * (push < 1 ? lerp(.45, 1, push) : 1)) * lerp(1, .52, P.ads) * (P.knock > 0 ? 0 : 1);
  if (wl > 0) { wx = wx / wl * sp; wz = wz / wl * sp; }
  const acc = Math.min(1, dt * (P.onGround ? 11 : 2.5)); P.vx = lerp(P.vx, wx, acc); P.vz = lerp(P.vz, wz, acc);
  if (keys.Space && P.onGround && !P.jumpHeld && P.knock <= 0) { P.vy = CFG.player.jump; P.onGround = false; P.jumpHeld = true; } if (!keys.Space) P.jumpHeld = false;
  const wasAir = !P.onGround;
  moveEntity(P, P.vx * dt, P.vz * dt, dt, CFG.player.r, 'p', CFG.player.h); carBlock(P, CFG.player.r);
  if (wasAir && P.onGround) { if (P.fell < -15) hurtPlayer((-P.fell - 15) * 8, null, 'fall'); if (P.fell < -5) SFX.land(); }
  if (P.y < -4) { P.y = CURB + 1; P.vy = 0; }
  P.spd = hyp(P.vx, P.vz); P.sprint = sprint && P.spd > 5.5;
  if (P.onGround) { P.stepPh = (P.stepPh || 0) + dt * P.spd * 2.1; const si = Math.floor(P.stepPh / PI); if (si !== P.stepI) { P.stepI = si; if (P.spd > 1.2) SFX.step(sprint ? 1.3 : 1); } }
  // which way the body faces: with the camera when a weapon is up, otherwise where it is walking
  if (firstPerson() || P.ads > .2 || P.shootT > 0) P.yaw = lerpAng(P.yaw, P.cyaw, Math.min(1, dt * 20)); else if (P.spd > .6) P.yaw = lerpAng(P.yaw, yawOf(P.vx, P.vz), Math.min(1, dt * 11));
  P.pitch = P.cpitch; P.shootT -= dt; if (P.knock > 0) { P.knockT -= dt; if (P.knockT <= 0) P.knock = 0; }
  // weapon
  if (P.autoReload > 0) { P.autoReload -= dt; if (P.autoReload <= 0) startReload(); }
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { const n = Math.min(d.mag - w.mag, w.res); w.mag += n; w.res -= n; } }
  if (mouse.down && !sprint && (d.auto || mouse.fresh)) tryFire();
  mouse.fresh = false;
  P.ads = lerp(P.ads, aiming && !sprint ? 1 : 0, Math.min(1, dt * 13));
  if (P.rob) updateRob(dt); findPrompt(); collectPickups();
  if (shopOpen && hyp(shopOpen.x - P.x, shopOpen.z - P.z) > 3.4) closeShop();
}
// --- at the wheel, or riding
function updateInCar(dt) {
  const c = P.car, d = WEAPONS[P.wpn], w = P.inv[P.wpn];
  if (c.gone) { P.car = null; return; }
  if (P.seat === 0 && c.mine !== false) {
    const inp = c.inp; inp.thr = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0); inp.steer = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); inp.hb = !!keys.Space;
    if (TOUCH.on) { inp.steer = clamp(inp.steer + TOUCH.fx * 1.15, -1, 1); if (!keys.KeyW && !keys.KeyS && Math.abs(TOUCH.fy) > .3) inp.thr = clamp(-TOUCH.fy * 1.3, -1, 1); }   // the stick steers, and up or down on it drives when GAS and BRAKE are not held
    stepCar(c, dt, inp);
    if (c.cop) { if (keys.KeyH && !P.hornHeld) P.siren = !P.siren; c.horn = P.siren ? 1 : 0; setHorn(false); } else { c.horn = keys.KeyH ? 1 : 0; setHorn(!!keys.KeyH); } P.hornHeld = !!keys.KeyH;
    GAME.roadkill(c, P);
    for (let i = 0; i < GARAGES.length; i++) { const g = GARAGES[i]; if ((g.team !== undefined && g.team !== P.team) || hyp(g.x - c.x, g.z - c.z) > 3.4 || carSpeed(c) > 3 || c.burn > 0) continue;
      const deny = (big, sub) => { if (G.time - (P.denyT || 0) > 3) { P.denyT = G.time; banner(big, sub || '', 1.8); SFX.deny(); } };
      if (P.heat > 0) {   // a respray: the car comes out another colour and the police stop looking, if they are not watching it go in
        if (c.cop) deny('No resprays for police cars'); else if (!P.evade) deny('Lose the police first', 'they can see you'); else if (P.cash < 300) deny('A respray costs $300');
        else { P.spent += 300; P.cash -= 300; gain(-300); c.hp = c.spec.hp; const hex = PAINTS.filter(h => h !== c.color)[(rand() * (PAINTS.length - 1)) | 0]; setPaint(c, hex); if (AUTH()) GAME.clearHeat(P); else { NET.req('rs', c.id, PAINTS.indexOf(hex)); P.heat = 0; } SFX.buy(); banner('Resprayed', 'The police have lost you · $300', 2.4, 'gold'); } }
      else if (c.hp < c.spec.hp - 20) { if (P.cash >= 200) { P.spent += 200; P.cash -= 200; gain(-200); c.hp = c.spec.hp; if (!AUTH()) NET.req('fx', c.id); SFX.buy(); banner('Repaired', c.spec.name + ' · $200', 1.8); } else deny('Repairs cost $200'); } }
  }
  seatPos(c, P.seat, _sp); P.x = _sp.x; P.z = _sp.z; P.y = c.y; P.vx = c.vx; P.vz = c.vz; P.vy = 0; P.onGround = true; P.yaw = c.yaw; P.spd = 0; P.pitch = P.cpitch; P.sprint = false;
  P.shootT -= dt; if (P.autoReload > 0) { P.autoReload -= dt; if (P.autoReload <= 0) startReload(); }
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { const n = Math.min(d.mag - w.mag, w.res); w.mag += n; w.res -= n; } }
  if (mouse.down && (d.auto || mouse.fresh)) tryFire(); mouse.fresh = false; P.ads = 0; prompt = null;
  if (P.radioT > 0) { P.radioT -= dt; if (P.radioT <= 0) $('h-radio').classList.remove('on'); }
}
function updatePlayer(dt) {
  P.fireT -= dt; P.switchT -= dt; P.safeT -= dt; P.kick = Math.max(0, P.kick - dt * 1.3); if (P.punchT > 0) P.punchT -= dt;
  if (P.dead) { P.deadT += dt; P.spd = 0; if (P.deadT >= CFG.respawn && G.phase === 'play') GAME.respawn(); return; }
  if (P.enter) updateEnter(dt); else if (P.car) updateInCar(dt); else updateOnFoot(dt);
  if (G.time - P.lastHit > CFG.player.regenDelay && P.hp < CFG.player.hp) P.hp = Math.min(CFG.player.hp, P.hp + CFG.player.regenRate * dt);
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
    const c = P.car, sp = carSpeed(c); P.idleCam += dt;
    if (P.idleCam > 1.1 && sp > 2.5 && !keys.KeyC) { P.cyaw = lerpAng(P.cyaw, c.yaw, Math.min(1, dt * 2.6)); P.cpitch = lerp(P.cpitch, -.13, Math.min(1, dt * 2)); }
    const yaw = P.cyaw + (keys.KeyC ? PI : 0), cpp = Math.cos(P.cpitch), bx = -Math.sin(yaw) * cpp, bz = -Math.cos(yaw) * cpp; px = c.x; py = c.y + 1.5; pz = c.z; want = (camFar ? 9.5 : 6.6) + sp * .055 + (c.spec.len - 4.5) * .6;
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
  if (Math.abs(camera.fov - fov) > .05) { camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 12)); camera.updateProjectionMatrix(); }
  skyDome.position.copy(camera.position);
  EAR.x = camera.position.x; EAR.y = camera.position.y; EAR.z = camera.position.z; EAR.rx = rx; EAR.rz = rz;
}
// --- how the player looks to the camera: the body in third person, a pair of hands in first
function updatePlayerLook(dt) {
  const fp = firstPerson() && !P.dead, d = WEAPONS[P.wpn];
  if (fp || (P.camClose && !P.car && !P.dead)) hideChar(meChar);   // a wall has pushed the camera into the player's back: do not fill the screen with it
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
