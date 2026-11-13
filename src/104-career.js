/* ---------------------------------------------------------------------
   10b. Career: rank and RP; the phone and who answers it (homies, the mechanic, the fixer, someone with work);
        businesses on your turf; the car shop; the car that is yours.
   --------------------------------------------------------------------- */
// --- rank. Everything that moves the crew forward pays RP, and each rank asks a little more than the one before.
const UNLOCK = { smg: 1, shotgun: 2, glocks: 3, rifle: 4, switch: 5, marksman: 6, gl: 7, m60: 8, rpg: 10, homies: 2, fixer: 3 };   // the rank each one opens at
const rpFor = r => r <= 1 ? 0 : 500 * (r - 1) + 125 * (r - 1) * (r - 2);
const rankOf = rp => { let r = 1; while (r < 150 && rp >= rpFor(r + 1)) r++; return r; };
const hpBonus = r => Math.min(50, Math.floor((r - 1) / 2) * 5);                     // +5 health every other rank, up to +50
const maxHp = () => CFG.player.hp + hpBonus(P.rank || 1);
const homieCount = r => r >= 10 ? 4 : r >= 6 ? 3 : r >= UNLOCK.homies ? 2 : 0;
function unlocksAt(r) {
  const u = []; ['smg', 'shotgun', 'glocks', 'rifle', 'marksman', 'gl', 'm60', 'rpg'].forEach(w => { if (r > 1 && UNLOCK[w] === r) u.push(WEAPONS[w].name); }); if (UNLOCK.switch === r) u.push('the Glock switch');
  if (homieCount(r) > homieCount(r - 1)) u.push(homieCount(r) + ' homies on call');
  if (UNLOCK.fixer === r) u.push('the fixer');
  if (hpBonus(r) > hpBonus(r - 1)) u.push('+5 health');
  return u;
}
// RP is decided where the world runs, like cash: the host keeps a running total for each joined player, who adds what is new
GAME.rp = (a, n) => { if (!a || !(n > 0)) return; if (a === P) addRP(n); else if (a.kind === 'rp') a.xp = (a.xp | 0) + Math.round(n); };
const RPF = { amt: 0, t: 0 };
function addRP(n) {
  if (!(n > 0) || !SAVE.live) return;
  const was = P.rank || 1; n = Math.round(n); P.rp = Math.min(9e7, (P.rp || 0) + n); P.rank = rankOf(P.rp); RPF.amt += n; RPF.t = 2.6;
  if (P.rank > was) { let u = []; for (let r = was + 1; r <= P.rank; r++) u = u.concat(unlocksAt(r));
    banner('Rank up', 'Rank ' + P.rank + (u.length ? ' · ' + u.join(' · ') : ''), 3.6, 'gold'); SFX.streak(); if (!P.dead) P.hp = Math.min(maxHp(), P.hp + hpBonus(P.rank) - hpBonus(was)); }
}
// the badge and bar under the cash, and what the last few seconds paid
function rankHud(dt) {
  const r = P.rank || 1, lo = rpFor(r), hi = rpFor(r + 1), f = clamp(((P.rp || 0) - lo) / (hi - lo), 0, 1), key = r * 1000 + Math.round(f * 100);
  if (hudCache.rk !== key) { hudCache.rk = key; $('rk-n').textContent = r; $('rk-fill').style.width = Math.round(f * 100) + '%'; $('h-rank').title = 'Rank ' + r + ' · ' + (P.rp | 0) + ' RP · rank ' + (r + 1) + ' at ' + hi + ' RP'; }
  if (RPF.t > 0) { RPF.t -= dt; if (hudCache.rkg !== RPF.amt) { hudCache.rkg = RPF.amt; $('rk-gain').textContent = '+' + RPF.amt + ' RP'; $('rk-gain').className = 'on'; } if (RPF.t <= 0) { RPF.amt = 0; hudCache.rkg = 0; $('rk-gain').className = ''; } }
}

// --- businesses. A couple of shops in every neighbourhood will sell to the crew that runs it. Each pays its owner every hour of
//     the day for as long as the crew keeps the neighbourhood, and nothing while somebody else has it.
const titleCase = s => s.toLowerCase().replace(/(^|[\s&-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const BIZ = [];
{ const by = ZONES.map(() => []); FRONTS.forEach(f => { const h = hoodAt(f.x, f.z); if (h >= 0) by[h].push(f); });
  by.forEach((list, h) => { const z = ZONES[h], got = [];
    list.sort((p, q) => hyp(p.x - z.x, p.z - z.z) - hyp(q.x - z.x, q.z - z.z));
    for (const f of list) { if (got.length >= 2) break; if (got.some(q => hyp(q.x - f.x, q.z - f.z) < 25 || q.name === f.name)) continue; got.push(f); }
    got.forEach(f => BIZ.push({ x: f.x, z: f.z, name: titleCase(f.name), hood: h, key: Math.round(f.x) + ',' + Math.round(f.z), price: Math.round(z.val * 22 / 50) * 50, pay: Math.round(z.val * .5 / 5) * 5 })); }); }
const ownBiz = b => !!P.biz && P.biz.has(b.key);
const bizOpen = b => G.phase === 'play' && ZS[b.hood].owner === P.team;          // a business only trades for you while your crew runs its block
const bizIncome = () => { let n = 0; BIZ.forEach(b => { if (ownBiz(b) && bizOpen(b)) n += b.pay; }); return n; };
const bizOwned = () => BIZ.filter(ownBiz).length;
function payCash(n) { if (!(n > 0)) return true; if (P.cash < n) { SFX.deny(); return false; } P.spent += n; P.cash -= n; gain(-n); return true; }
function buyBiz(b) {
  if (ownBiz(b) || !bizOpen(b) || !payCash(b.price)) return;
  P.biz.add(b.key); SFX.buy(); addRP(CFG.rp.buy); saveGame(); bizMarks();
  banner(b.name, 'Yours · +$' + b.pay + ' every hour your crew holds ' + ZONES[b.hood].name, 3, 'gold');
}
function bizPrompt() {
  for (let i = 0; i < BIZ.length; i++) { const b = BIZ[i]; if (hyp(b.x - P.x, b.z - P.z) > 2.3 || Math.abs(P.y - CURB) > 1.2) continue;
    if (ownBiz(b)) return { text: 'Your business · ' + b.name + (bizOpen(b) ? ' · +$' + b.pay + ' an hour' : ' · shut until your crew takes back ' + ZONES[b.hood].name) };
    if (!bizOpen(b)) return { text: b.name + ' only sells to the crew that runs ' + ZONES[b.hood].name };
    if (P.cash < b.price) return { text: b.name + ' is for sale · $' + b.price.toLocaleString('en-US') + ' · +$' + b.pay + ' an hour' };
    return { text: '<b>F</b>Buy ' + b.name + ' · $' + b.price.toLocaleString('en-US') + ' · +$' + b.pay + ' an hour', act: () => buyBiz(b) }; }
  return null;
}
BIZ.forEach(b => { b.m = mark(b.x, b.z, 0x7dffb0, .85); b.m.visible = false; });
function bizMarks() { BIZ.forEach(b => { const own = ownBiz(b); b.m.visible = own || bizOpen(b); b.m.material.color.setHex(own ? (bizOpen(b) ? 0xffc83d : 0x8a8f98) : 0x7dffb0); }); }

// --- the phone. T, or the PHONE button, opens it; a number or a tap calls whoever is on it.
const PH = { homT: -999, homUntil: -1, fixT: -999, jobT: -999, mechT: -999, airT: -999 };
const coolLeft = (t, s) => Math.max(0, Math.ceil(t + s - G.time));
const homiesOut = () => AUTH() ? bots.some(b => b.homie === P && !b.dead) : G.time < PH.homUntil;
const myPV = () => { for (let i = 0; i < cars.length; i++) if (cars[i].pv === P && !cars[i].gone) return cars[i]; return null; };
const pvWrecked = () => { const c = myPV(); return !!c && (c.wreck || c.burn > 0); };
// the online store: cars delivered to the kerb by the mechanic (more on its pages as the city grows)
const CAR_SHOP = [['super', 28000, 6], ['muscle', 14000, 3], ['sport', 9000, 2], ['suv', 6500, 1], ['lowrider', 5500, 1], ['coupe', 4000, 1]];
function storeItems(pg) {
  if (pg === 'cars') return CAR_SHOP.map(q => { const S = CARS[q[0]], has = P.pv && P.pv.t === q[0];
    return has ? { label: S.name, sub: 'Yours · the mechanic brings it', off: true, own: true } : q[2] > (P.rank || 1) ? { label: S.name, sub: 'Opens at rank ' + q[2], off: true, lock: 'Opens at rank ' + q[2] }
      : { label: S.name, sub: Math.round(S.vmax * 2.237) + ' mph top speed · ' + S.seats + ' seats · replaces the car on file', cost: q[1], act: () => { if (payCash(q[1])) { P.pv = { t: q[0], c: CREW_PAINT[P.team], ar: 0, en: 0, no: 0, gr: 0, bp: 0, ne: 0 }; addRP(CFG.rp.buy); saveGame(); closeShop(); PH.mechT = G.time; sendPV(); banner(S.name, 'Bought · on its way to a kerb near you', 2.6, 'gold'); SFX.buy(); } } }; }).concat([back()]);
  return null;
}
function phoneItems(pg) {
  if (pg === 'jobs') return jobItems(); if (pg === 'lab') return labItems(); if (pg === 'air') return airItems();
  if (pg) { const st = storeItems(pg); if (st) return st; }
  const r = P.rank || 1, out = [], cd = (t, s) => coolLeft(t, s);
  if (homiesOut()) out.push({ label: 'Homies', sub: 'Rolling with you · tap to send them home', act: dismissHomies });
  else if (r < UNLOCK.homies) out.push({ label: 'Homies', sub: 'Your crew picks up from rank ' + UNLOCK.homies, off: true });
  else if (cd(PH.homT, 60)) out.push({ label: 'Homies', sub: 'Call back in ' + cd(PH.homT, 60) + 's', off: true });
  else out.push({ label: 'Homies', sub: homieCount(r) + ' of your crew come round the corner and roll with you', act: callHomies });
  if (!P.pv) out.push({ label: 'Mechanic', sub: 'No car on file · make one yours at a car shop, or buy one online', off: true });
  else if (cd(PH.mechT, 20)) out.push({ label: 'Mechanic', sub: 'On the way · call back in ' + cd(PH.mechT, 20) + 's', off: true });
  else out.push({ label: 'Mechanic', sub: 'Brings your ' + CARS[P.pv.t].name + ' to a kerb near you' + (pvWrecked() ? ' · insurance' : ''), cost: pvWrecked() ? 250 : 0, act: callMechanic });
  const fee = 200 * (P.heat | 0);
  if (r < UNLOCK.fixer) out.push({ label: 'Fixer', sub: 'Makes the police forget you · from rank ' + UNLOCK.fixer, off: true });
  else if (!(P.heat > 0)) out.push({ label: 'Fixer', sub: 'Makes the police forget you · nobody is looking for you now', off: true });
  else if (cd(PH.fixT, 120)) out.push({ label: 'Fixer', sub: 'Busy · call back in ' + cd(PH.fixT, 120) + 's', off: true });
  else out.push({ label: 'Fixer', sub: 'Makes the police forget you', cost: fee, act: callFixer });
  if (cd(PH.jobT, 75)) out.push({ label: 'Work', sub: 'Nothing yet · call back in ' + cd(PH.jobT, 75) + 's', off: true });
  else out.push({ label: 'Work', sub: 'Lines up a job: a truck, a hit, a stash, a race', act: callJob });
  if (P.driveby) out.push({ label: 'Drive-by', sub: 'A carload of your crew rolls through the nearest rival block', act: () => { closeShop(); callDriveBy(); } });
  out.push(page('Heists', 'jobs'), page(P.lab ? 'Your lab · ' + P.lab.stock + ' of ' + LAB.cap : 'Drug business', 'lab'), page('Online · cars', 'cars'), page(P.air ? 'Your ' + CARS[P.air.t].name : 'Aircraft', 'air'));
  return out;
}
function openPhone() { if (P.dead || G.state !== 'playing') return; openMenu({ kind: 'phone', title: 'Phone', items: phoneItems, foot: 'A number or a tap to call · T or Esc hangs up' }); }
function callDriveBy() { if (!P.driveby) return; P.driveby = false; P.streak = 0; if (AUTH()) { if (!GAME.callDriveBy(P)) P.driveby = true; } else NET.req('db'); }
function callHomies() { closeShop(); if (homiesOut() || (P.rank || 1) < UNLOCK.homies) return; PH.homT = G.time; if (AUTH()) { if (!GAME.homies(P, homieCount(P.rank))) note('Nobody could get to you here · try from a street', 'g'); } else NET.req('hm', homieCount(P.rank)); }
function dismissHomies() { closeShop(); PH.homUntil = -1; if (AUTH()) GAME.homiesHome(P); else NET.req('hd'); note('Your homies head home', 'g'); }
function callFixer() { const fee = 200 * (P.heat | 0); closeShop(); if (!(P.heat > 0) || !payCash(fee)) return; PH.fixT = G.time; if (AUTH()) GAME.clearHeat(P); else { NET.req('lw'); P.heat = 0; } SFX.clear(); banner('Fixed', 'A few calls later the police have lost you · $' + fee, 2.4, 'gold'); }
function callJob() { closeShop(); PH.jobT = G.time; if (AUTH()) { if (GAME.forceJob()) SFX.tick(); else note('Nothing going right now · try again in a minute', 'g'); } else NET.req('jb'); }
function callMechanic() { closeShop(); if (!P.pv) return; if (pvWrecked() && !payCash(250)) return; PH.mechT = G.time; sendPV(); }
function sendPV() { const v = P.pv; if (!v || !CARS[v.t]) return; if (AUTH()) { if (!GAME.pv(P, v)) note('The mechanic could not find a kerb near you · try a street', 'g'); } else NET.req('pv', CID.indexOf(v.t), Math.max(0, ALLPAINT.indexOf(v.c)), v.ar | 0, v.en | 0, v.no | 0, v.gr | 0, v.bp ? 1 : 0, v.ne | 0); }

// --- homies: a few of your crew who walk with you, get in the car with you, and shoot at whoever is shooting at you
GAME.homies = (a, n) => {   // on the machine that runs the world
  if (!a || a.dead || a.gone || !isCrew(a.team)) return 0; let have = 0, made = 0; bots.forEach(b => { if (b.homie === a && !b.dead) have++; });
  for (let k = have; k < n; k++) { const s = homieSpot(a); if (!s) break; const b = spawnBot(a.team, s.x + rs(1), s.y, s.z + rs(1), { temp: true, wpn: pick(rand, ['smg', 'rifle', 'shotgun', 'smg', 'rifle']) }); if (!b) break;
    Object.assign(b, { homie: a, until: G.time + 300, skill: 1.3, hp: 160, react: .2, yaw: yawOf(a.x - s.x, a.z - s.z) }); made++; }
  if (made) GAME.ev('hm', GAME.ref(a), made); return made;
};
GAME.homiesHome = a => { bots.forEach(b => { if (b.homie !== a) return; b.homie = null; b.until = G.time + 2; if (b.car && b.seat !== 0) botExit(b, false); }); };
function homieSpot(a) {   // round a corner from the player: near enough to come running, and out of sight if there is anywhere like that
  let best = null, bs = -1e9;
  for (let i = 0; i < NAVOK.length; i++) { const n = NAVOK[i], d = hyp(n.x - a.x, n.z - a.z); if (d < 14 || d > 60) continue; let sc = -Math.abs(d - 26) + rand() * 6; if (sc <= bs) continue; if (seenByHuman(n.x, n.y, n.z)) sc -= 30; if (sc > bs) { bs = sc; best = n; } }
  return best;
}
function threatOf(a) { let best = null, bd = 70; for (let i = 0; i < bots.length; i++) { const o = bots[i]; if (o.dead || o.tgt !== a || G.time - o.seenT > 3 || o.team === a.team) continue; const d = hyp(o.x - a.x, o.z - a.z); if (d < bd) { bd = d; best = o; } } return best; }
function homieCatchUp(b, a) { let best = null, bd = 1e9; for (let i = 0; i < NAVOK.length; i++) { const n = NAVOK[i], d = hyp(n.x - a.x, n.z - a.z); if (d < 12 || d > 40 || seenByHuman(n.x, n.y, n.z)) continue; if (d < bd) { bd = d; best = n; } }
  if (!best) return; if (b.car) botExit(b, false); b.x = best.x; b.y = best.y; b.z = best.z; b.vx = b.vz = 0; b.path = null; b.tgt = null; b.hunt = false; b.wantCar = null; }
function homieBrain(b) {
  const a = b.homie;
  if (!a || a.gone || G.time > b.until) { b.homie = null; b.until = G.time + 2; if (b.car && b.seat !== 0) botExit(b, false); return; }   // done for the day: they walk off and are gone once nobody is looking
  const saw = botLook(b);
  if (!saw && (!b.tgt || b.tgt.dead || G.time - b.seenT > 2)) { const t = threatOf(a); if (t && los(b.x, eyeY(b), b.z, t.x, chestY(t), t.z, 'a')) { if (b.tgt !== t) b.react = .35; b.tgt = t; b.seenT = G.time; b.lsx = t.x; b.lsy = t.y; b.lsz = t.z; } }   // whoever is shooting at you is who they shoot at
  if (b.car) { const c = b.car; if (c.spec.air) { if (a.car !== c) { if (c.landed) botExit(b, false); else homieCatchUp(b, a); } return; } if (c.wreck || c.burn > 0) botExit(b, false); else if (a.car !== c && carSpeed(c) < 7) botExit(b, false); return; }   // out of a helicopter only once it is down; if you jump, they meet you below
  const d = hyp(a.x - b.x, a.z - b.z);
  if (a.car && !a.dead && !a.car.wreck) { const c = a.car;
    if (b.wantCar === c) return;
    let k = -1; for (let q = 1; q < c.spec.seats; q++) if (!c.occ[q] && !bots.some(o => o !== b && o.wantCar === c && o.wantSeat === q)) { k = q; break; }
    if (k > 0 && d < 40 && (!c.spec.air || c.landed)) { b.wantCar = c; b.wantSeat = k; b.carT = G.time; b.carChk = 0; b.path = null; b.tgt = null; return; } }
  else if (b.wantCar) b.wantCar = null;
  if (d > 120 || (d > 60 && (!a.car || carSpeed(a.car) < 4))) { homieCatchUp(b, a); return; }
  if (saw || (b.tgt && !b.tgt.dead && G.time - b.seenT < 2)) return;
  b.tgt = null; b.hunt = false;
  if (d > 9) { if (!b.path || G.time > (b.repathT || 0)) { b.repathT = G.time + 1.5; if (!botPathTo(b, a.x, a.y, a.z, false)) b.path = null; } } else b.path = null;
}
function homieAct(b, dt) {
  const a = b.homie;
  if (!a || b.car || b.wantCar || (b.tgt && !b.tgt.dead && G.time - b.seenT < .6)) { crewAct(b, dt); return; }
  b.act = 0; b.aim = Math.max(0, b.aim - dt * 2); b.pitch = lerp(b.pitch, 0, Math.min(1, dt * 5));
  const d = hyp(a.x - b.x, a.z - b.z);
  if (b.path) { if (botFollow(b, d > 16 ? 6.2 : 5.2, dt) || d < 6) b.path = null; }
  else if (d > 3.2) { const sx = a.x + Math.cos(b.id * 2.4) * 2.4, sz = a.z + Math.sin(b.id * 2.4) * 2.4; botWalk(b, sx, sz, d > 7 ? 5.8 : 3, dt); }   // each keeps their own place at your shoulder
  else { botWalk(b, b.x, b.z, 0, dt); b.yaw = lerpAng(b.yaw, a.yaw || b.yaw, Math.min(1, dt * 3)); }
  if (b.spd > .6) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 9));
}

// --- the car that is yours: on file with its mods, waiting at a kerb near you when you arrive, and brought by the mechanic when called
const MODS = ['plate', 'tune', 'nos', 'grip', 'bp', 'neon'];   // what a car shop can do to a car, beyond paint
const specOf = c => ({ t: c.type, c: c.color, ar: c.plate | 0, en: c.tune | 0, no: c.nos | 0, gr: c.grip | 0, bp: c.bp ? 1 : 0, ne: c.neon | 0 });
function applySpec(c, sp) { c.plate = clamp(sp.ar | 0, 0, 3); c.tune = clamp(sp.en | 0, 0, 3); c.nos = clamp(sp.no | 0, 0, 2); c.grip = clamp(sp.gr | 0, 0, 2); c.bp = sp.bp ? 1 : 0; setNeon(c, sp.ne | 0); }
GAME.pv = (a, sp) => {   // on the machine that runs the world: a's car, parked at the nearest quiet kerb a short walk away
  if (!a || a.gone || !sp || !CARS[sp.t]) return false;
  for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; if (c.pv === a && !c.occ.some(o => o)) removeCar(c); }
  let best = null, bs = -1e9;
  PARK.forEach(s => { if (s.truck) return; const d = hyp(s.x - a.x, s.z - a.z); if (d < 10 || d > 90) return; if (cars.some(c => hyp(c.x - s.x, c.z - s.z) < 5.5)) return; const sc = -Math.abs(d - 24) - (s.lot ? 8 : 0) - (seenByHuman(s.x, CURB, s.z) ? 6 : 0); if (sc > bs) { bs = sc; best = s; } });
  if (!best) return false;
  const c = spawnCar(sp.t, best.x, best.z, best.yaw, { color: sp.c }); if (!c) return false;
  c.pv = a; applySpec(c, sp); c.asleep = true;
  GAME.ev('pv', GAME.ref(a), c.id); return true;
};
// neon under the car: a soft wash of colour on the road beneath it
const neonGeo = new T.PlaneGeometry(1, 1); neonGeo.rotateX(-PI / 2);
function setNeon(c, hex) { c.neon = hex | 0; if (!c.neon) { if (c.neonM) c.neonM.visible = false; return; }
  if (!c.neonM) { c.neonM = new T.Mesh(neonGeo, new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); c.neonM.scale.set(c.spec.wid + 1.1, 1, c.spec.len + 1.2); c.neonM.position.y = .06; c.g.add(c.neonM); }
  c.neonM.material.color.setHex(hex); c.neonM.visible = true; }

// --- the car shop: drive into any garage your crew uses (or the one on Gas & Auto Row) and stop
const PAINT_MENU = [['Black', 0x1b1d21], ['White', 0xf2efe6], ['Red', 0xb3261e], ['Blue', 0x1f4e8c], ['Gold', 0xe0a224], ['Purple', 0x6b3fa0], ['Teal', 0x2a7f86], ['Orange', 0xd96f1c]];
const UPG = {   // level costs, and what each level does in words
  plate: { name: 'Armor plating', cost: [1500, 3000, 6000], say: ['Takes about a third less from anything', 'Shrugs off about half of what hits it', 'Takes a beating: about a third of the damage'] },
  tune:  { name: 'Engine tune',   cost: [1200, 2500, 5000], say: ['Quicker off the line and faster flat out', 'Quicker again', 'As fast as the car will go'] },
  nos:   { name: 'Nitrous',       cost: [2000, 4000],       say: ['Hold Shift (or NOS) for a burst; it refills as you drive', 'A longer burst'] },
  grip:  { name: 'Handling',      cost: [900, 1800],        say: ['Tyres and suspension: holds the road harder', 'Race tyres: corners like it is on rails'] },
};
function modItems(pg) {
  const c = P.car; if (!c) return [];
  if (pg === 'paint') return [[CREWS[P.team].name + ' colours', CREW_PAINT[P.team]]].concat(PAINT_MENU).map(q => c.cop ? { label: q[0], sub: 'Not on a police car', off: true } : c.color === q[1] ? { label: q[0], sub: 'Already this colour', off: true, own: true }
    : { label: q[0], sub: P.heat > 0 ? (P.evade ? 'and the police lose you' : 'lose the police first: they can see you') : '', cost: 300, off: P.heat > 0 && !P.evade, act: () => modPaint(q[1]) }).concat([back()]);
  const out = [], mine = c.pv === P;
  out.push(c.hp < c.spec.hp - 20 ? { label: 'Repair', sub: 'The ' + c.spec.name + ' back to new', cost: 200, act: () => { if (payCash(200)) { c.hp = c.spec.hp; c.burn = 0; if (!AUTH()) NET.req('fx', c.id); SFX.buy(); banner('Repaired', c.spec.name, 1.6); afterMod(c); } } } : { label: 'Repair', sub: 'Nothing to fix', off: true });
  out.push(page('Respray', 'paint'));
  for (const k of ['plate', 'tune', 'nos', 'grip']) { const u = UPG[k], lv = c[k] | 0;
    out.push(lv >= u.cost.length ? { label: u.name, sub: 'Maxed out', off: true, own: true } : { label: u.name + ' · level ' + (lv + 1), sub: u.say[lv], cost: u.cost[lv], act: () => { if (payCash(u.cost[lv])) { c[k] = lv + 1; modSync(c); SFX.buy(); banner(u.name, 'Level ' + c[k], 1.6, 'gold'); afterMod(c); } } }); }
  out.push(c.bp ? { label: 'Bulletproof glass', sub: 'Fitted: bullets stop at the windows', off: true, own: true } : { label: 'Bulletproof glass', sub: 'Nobody can shoot whoever is inside; the car takes it', cost: 3500, act: () => { if (payCash(3500)) { c.bp = 1; modSync(c); SFX.buy(); banner('Bulletproof glass', 'Fitted', 1.6, 'gold'); afterMod(c); } } });
  out.push(c.neon ? { label: 'Neon', sub: 'Glowing underneath · tap to take it off', act: () => { setNeon(c, 0); afterMod(c); } } : { label: 'Neon', sub: 'A glow under the car in your crew colour', cost: 800, act: () => { if (payCash(800)) { setNeon(c, CREWS[P.team].glow); SFX.buy(); afterMod(c); } } });
  out.push(mine ? { label: 'Your car', sub: 'On file · the mechanic brings it anywhere, upgrades and all', off: true, own: true } : c.cop ? { label: 'Make it yours', sub: 'Not a police car', off: true } : { label: 'Make it yours', sub: 'Put it on file: it waits for you, and the mechanic brings it', cost: 500, act: () => { if (payCash(500)) { c.pv = P; if (!AUTH()) NET.req('pm', c.id); SFX.buy(); banner('Your car', 'The ' + c.spec.name + ' is on file', 2, 'gold'); afterMod(c); } } });
  return out;
}
function modSync(c) { if (!AUTH()) NET.req('md', c.id, c.plate | 0, c.tune | 0, c.bp ? 1 : 0); }
function modPaint(hex) {
  const c = P.car; if (!c || c.cop) { SFX.deny(); return; }
  if (P.heat > 0 && !P.evade) { banner('Lose the police first', 'they can see you', 1.8); SFX.deny(); return; }
  if (!payCash(300)) return; const lost = P.heat > 0; setPaint(c, hex); SFX.buy();
  if (AUTH()) { if (lost) GAME.clearHeat(P); } else { NET.req('rs', c.id, Math.max(0, ALLPAINT.indexOf(hex))); if (lost) P.heat = 0; }
  banner('Resprayed', lost ? 'The police have lost you' : 'Looking new', 2, 'gold'); afterMod(c);
}
function afterMod(c) { if (c.pv === P) P.pv = specOf(c); addRP(CFG.rp.mod); saveGame(); if (shopOpen && shopOpen.kind === 'mod') renderShop(); }
const garageName = g => g.team !== undefined ? CREWS[g.team].name + ' garage' : 'Gas & Auto Row car shop';
function garageCheck(c) {   // called while driving: stop in a garage and its menu opens; drive off and it closes
  let g = null; for (let i = 0; i < GARAGES.length; i++) { const q = GARAGES[i]; if ((q.team !== undefined && q.team !== P.team) || hyp(q.x - c.x, q.z - c.z) > 3.4) continue; g = q; break; }
  if (g && carSpeed(c) < 3 && c.burn <= 0 && P.seat === 0) { if (P.garage !== g) { P.garage = g; if (!shopOpen) openMenu({ kind: 'mod', title: garageName(g), items: modItems, foot: 'A number or a tap to buy · F or Esc to drive on' }); } }
  else if (P.garage && (!g || carSpeed(c) > 4)) { P.garage = null; if (shopOpen && shopOpen.kind === 'mod') closeShop(); }
}
// nitrous: held down, a few seconds of push that comes back while you drive
function nitrous(c, dt, want) {
  if (!(c.nos > 0)) { c.boostT = 0; return; } if (c.nosQ === undefined) c.nosQ = 1;
  if (want && c.nosQ > .02 && c.inp.thr > 0 && !c.wreck) { c.boostT = .1; c.nosQ = Math.max(0, c.nosQ - dt / (1.4 + c.nos * 1.3)); if (Math.random() < .6) { const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw); FX.muzzle(c.x - fx * c.spec.len * .52, c.y + .45, c.z - fz * c.spec.len * .52, .7); } }
  else { c.boostT = 0; c.nosQ = Math.min(1, c.nosQ + dt / 10); }
}

// --- each second or so: business marks, the car you were promised, the phone menu kept current
// --- a helicopter of your own: bought on the phone, kept on file, and set down on the helipad nearest you whenever you call for it
const AIR_SHOP = [['chopper', 45000, 4, 'Four seats, quick, no guns'], ['heli', 95000, 8, 'Nose guns and rockets']];
const myAir = () => { for (let i = 0; i < cars.length; i++) if (cars[i].pa === P && !cars[i].gone) return cars[i]; return null; };
function airItems() {
  const r = P.rank || 1, out = [], cd = coolLeft(PH.airT, 30), c = myAir(), wrecked = !!c && (c.wreck || c.burn > 0);
  if (P.air) out.push(cd ? { label: 'Bring my ' + CARS[P.air.t].name, sub: 'On the way · call back in ' + cd + 's', off: true } : { label: 'Bring my ' + CARS[P.air.t].name, sub: 'Set down on the helipad nearest you' + (wrecked ? ' · insurance' : ''), cost: wrecked ? 500 : 0, act: () => { if (wrecked && !payCash(500)) return; closeShop(); PH.airT = G.time; sendAir(); } });
  AIR_SHOP.forEach(q => { const S = CARS[q[0]], has = P.air && P.air.t === q[0];
    out.push(has ? { label: S.name + ' helicopter', sub: 'Yours · ' + q[3], off: true, own: true } : q[2] > r ? { label: S.name + ' helicopter', sub: 'Opens at rank ' + q[2], off: true, lock: 'Opens at rank ' + q[2] }
      : { label: S.name + ' helicopter', sub: q[3] + ' · ' + Math.round(S.vmax * 2.237) + ' mph' + (P.air ? ' · replaces your ' + CARS[P.air.t].name : ''), cost: q[1], act: () => { if (!payCash(q[1])) return; P.air = { t: q[0], c: q[0] === 'heli' ? 0x1b1d21 : CREW_PAINT[P.team] }; addRP(CFG.rp.buy); saveGame(); closeShop(); PH.airT = G.time; sendAir(); banner(S.name, 'Bought · on its way to the nearest helipad', 2.6, 'gold'); } }); });
  out.push(back()); return out;
}
function sendAir() { const v = P.air; if (!v || !CARS[v.t]) return; if (AUTH()) GAME.airDeliver(P, v.t, v.c); else NET.req('ad', CARS[v.t].n, Math.max(0, ALLPAINT.indexOf(v.c))); }
// on the machine that runs the world: a's helicopter on the nearest free pad. The airport keeps three; the city has a few of its own.
GAME.airDeliver = (a, t, col) => {
  if (!a || a.gone || !CARS[t] || !CARS[t].air) return false;
  for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; if (c.pa === a && !c.occ.some(o => o)) removeCar(c); }
  let best = null, bd = 1e9; AIRPORT.pads.concat(AIRPORT.city).forEach(p => { if (cars.some(c => hyp(c.x - p.x, c.z - p.z) < 9 && Math.abs(c.y - p.y) < 3)) return; const d = hyp(p.x - a.x, p.z - a.z); if (d < bd) { bd = d; best = p; } });
  if (!best) return false; const c = spawnCar(t, best.x, best.z, best.yaw, { color: ALLPAINT.includes(col) ? col : undefined }); if (!c) return false;
  c.pa = a; c.y = best.y; GAME.ev('ad', GAME.ref(a), best.name || 'the airport', t, c.id); return true;
};

function careerTick(dt) {
  PH.tickT = (PH.tickT || 0) - dt; if (PH.tickT > 0) return; PH.tickT = .5;
  bizMarks(); labTick();
  if (P.pvAsk && G.time > P.pvAsk && G.state === 'playing' && (AUTH() || NET.slot > 0)) { P.pvAsk = 0; sendPV(); }
  if (shopOpen && shopOpen.kind === 'phone') renderShop();
}
