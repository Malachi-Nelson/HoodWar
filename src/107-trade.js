/* =====================================================================
   11c'. THE PRODUCT TRADE AND THE DEALS — the lab grows into a business: supplies to buy or steal, upgrades, dealers on your
        side's corners, crews that come to raid it. And the deals, the way Sub Rosa does them: what changes hands is a briefcase
        somebody has to carry. Cash, product or a courier's package, it is in your hand until you put it down or go down, and
        whoever picks it up owns it. Sell product wholesale to a crew (who may have brought guns instead of money), run a
        package across town, fence a case you took off someone, or offer product to another player and meet them to swap cases.
        Text the others from the phone to set it up. The machine that runs the world keeps the cases; the lab is its owner's.
   ===================================================================== */
Object.assign(LAB, { capBig: 40, unitHi: 800, fast: 1.6, supPer: 5, dealEvery: 160, dealCut: .85, dealer: 2500, supBuy: 3000, ups: [['eq', 'Better equipment', 15000, 'Makes product 60% faster'], ['staff', 'A better cook', 12000, 'Every unit sells for $800 instead of $600'], ['store', 'More storage', 9000, 'Holds 40 units instead of 20'], ['sec', 'Security', 12000, 'Raids come half as often, and two of your people defend the lab']] });
const labCap = () => P.lab && P.lab.up & 4 ? LAB.capBig : LAB.cap, unitVal = () => P.lab && P.lab.up & 2 ? LAB.unitHi : LAB.unit;
EV_KINDS.push('raid', 'sups', 'whsl', 'cour', 'trade');
Object.assign(EV_INFO, {
  raid:  { name: 'Lab raid', icon: '!', col: '#ff6a5a', hex: 0xff6a5a, how: 'A crew is hitting a lab' },
  sups:  { name: 'Supply run', icon: '▤', col: '#c8ff7d', hex: 0xc8ff7d, how: 'Steal the supply van, drive it to the lab' },
  whsl:  { name: 'Wholesale deal', icon: '⇄', col: '#7dffb0', hex: 0x7dffb0, how: 'Bring the product case to the buyers' },
  cour:  { name: 'Courier job', icon: '✉', col: '#e8b8ff', hex: 0xe8b8ff, how: 'Take the package to the buyer' },
  trade: { name: 'Meet', icon: '⇄', col: '#ffd27d', hex: 0xffd27d, how: 'Swap cases with the other side' },
});
CFG.rp.job.raid = 300; CFG.rp.job.sups = 200; CFG.rp.job.whsl = 400; CFG.rp.job.cour = 300; CFG.rp.job.trade = 0;
const FENCE = CHOP;                                                       // Calder Auto Body takes product cases, no questions, at a poor price
const CASE_K = ['cash', 'prod', 'pkg', 'purse'], CASE_NAME = { cash: 'cash', prod: 'product', pkg: 'package', purse: 'purse' };
const CASES = []; let caseSeq = 0;   // briefcases on the ground; carried ones live on their carrier (a.case)
const caseGeo = new T.BoxGeometry(.48, .36, .13), caseMats = { cash: new T.MeshLambertMaterial({ color: 0x22262c }), prod: new T.MeshLambertMaterial({ color: 0x6b4a2a }), pkg: new T.MeshLambertMaterial({ color: 0x8c7a5a }), purse: new T.MeshLambertMaterial({ color: 0x8a2433 }) };
function caseMesh(k) { const m = new T.Mesh(caseGeo, caseMats[k] || caseMats.cash); m.castShadow = true; scene.add(m); return m; }
function dropCase(k, v, x, y, z, ev, id) { const c = { id: id || ++caseSeq, k, v, x, y, z, ev: ev || null, m: caseMesh(k) }; c.m.position.set(x, y + .2, z); CASES.push(c); if (c.id > caseSeq) caseSeq = c.id; return c; }
function liftCase(c) { const i = CASES.indexOf(c); if (i >= 0) CASES.splice(i, 1); scene.remove(c.m); c.gone = true; }
// --- on the machine that runs the world: who has what, and where it goes
GAME.takeCase = (id, who) => { const c = CASES.find(q => q.id === id); if (!c || who.case || who.dead || who.down || hyp(c.x - who.x, c.z - who.z) > 3) return; liftCase(c); who.case = { k: c.k, v: c.v, ev: c.ev, t: G.time }; GAME.ev('ct', GAME.ref(who), CASE_K.indexOf(c.k), c.v); };
GAME.putCase = who => { const q = who.case; if (!q) return; who.case = null; const fx = -Math.sin(who.yaw || 0), fz = -Math.cos(who.yaw || 0); dropCase(q.k, q.v, who.x + fx * .8, groundAt(who.x, who.z, (who.y || 0) + .5, 'p'), who.z + fz * .8, q.ev); GAME.ev('cq', GAME.ref(who)); };
GAME.giveCase = (who, k, v, ev) => { if (!who) return; if (who.case) GAME.putCase(who); who.case = { k, v, ev: ev || null, t: G.time }; GAME.ev('ct', GAME.ref(who), CASE_K.indexOf(k), v); };
const yardFor = a => a.team === TEAM_COP ? SPAWNS[TEAM_COP][0] : SPAWNS[sideOf(a.team)][0];
function caseTick() {
  humans().forEach(h => { const q = h.case; if (!q) return; if (q.t === undefined) q.t = G.time;
    if (h.dead || h.down) return GAME.putCase(h);                                          // down: it is on the ground for whoever gets there first
    if (q.k === 'cash' || (q.k === 'purse' && !q.ev)) { const y = yardFor(h), site = labOfRef(h); if (G.time - q.t > 20 && (hyp(h.x - y.x, h.z - y.z) < 12 || (site >= 0 && hyp(h.x - LABS[site].x, h.z - LABS[site].z) < 8))) { h.case = null; GAME.pay(h, q.v); GAME.ev('cb', GAME.ref(h), q.v); } }   // cash is yours once it is home: your side's yard, or your lab
    else if (q.k === 'prod' && hyp(h.x - FENCE.x, h.z - FENCE.z) < 6 && !(h.car && carSpeed(h.car) > 4)) { h.case = null; const amt = q.v * 450; GAME.pay(h, amt); GAME.ev('cf', GAME.ref(h), q.v, amt); }
    else if (q.k === 'prod') { const site = labOfRef(h); if (site >= 0 && hyp(h.x - LABS[site].x, h.z - LABS[site].z) < 7) { h.case = null; GAME.ev('cl', GAME.ref(h), q.v); } } });
  for (let i = CASES.length - 1; i >= 0; i--) { const c = CASES[i]; if (c.ev && c.ev.over && c.k === 'pkg') liftCase(c); }
}
// whose lab is where: a player's lab site comes with their presence
const labOfRef = a => a === P ? (P.lab ? P.lab.site : -1) : a.lab === undefined ? -1 : a.lab;
// --- what joined players are told about the cases, and what they make of it
const casesWire = () => [CASES.map(c => [c.id, CASE_K.indexOf(c.k), c.v, Math.round(c.x * 10), Math.round(c.y * 10), Math.round(c.z * 10)]), humans().filter(h => h.case).map(h => [GAME.ref(h), CASE_K.indexOf(h.case.k), h.case.v])];
function casesFromHost(fc, cc) {
  if (!Array.isArray(fc) || !Array.isArray(cc)) return; const live = {};
  fc.forEach(q => { live[q[0]] = 1; const c = CASES.find(o => o.id === q[0]); if (c) { c.x = q[3] / 10; c.y = q[4] / 10; c.z = q[5] / 10; c.m.position.set(c.x, c.y + .2, c.z); return; } if (!NET.ckGone || !NET.ckGone[q[0]]) dropCase(CASE_K[q[1]] || 'cash', q[2], q[3] / 10, q[4] / 10, q[5] / 10, null, q[0]); });
  for (let i = CASES.length - 1; i >= 0; i--) if (!live[CASES[i].id]) liftCase(CASES[i]);
  const held = {}; cc.forEach(q => { held[q[0]] = { k: CASE_K[q[1]] || 'cash', v: q[2] }; });
  P.case = held['p' + NET.slot] || null; for (const k in NET.remotes) { const r = NET.remotes[k]; r.case = held['p' + r.slot] || null; }
  if (NET.ckGone) for (const id in NET.ckGone) if (G.time - NET.ckGone[id] > 3) delete NET.ckGone[id];
}
// --- this player: walk over a case to take it; USE puts yours down; a case in the hand shows
function myCases(dt) {
  if (P.putAt && hyp(P.x - P.putAt.x, P.z - P.putAt.z) > 2.4) P.putAt = null;   // one you have just put down stays down until you walk away from it
  if (P.dead || P.down || P.case || P.car || G.state !== 'playing') return;
  for (const c of CASES) { if (hyp(c.x - P.x, c.z - P.z) > 1.3 || Math.abs(c.y - P.y) > 1.6 || (P.putAt && hyp(c.x - P.putAt.x, c.z - P.putAt.z) < 2.2)) continue;
    if (AUTH()) GAME.takeCase(c.id, P); else { NET.req('ck', c.id); (NET.ckGone || (NET.ckGone = {}))[c.id] = G.time; liftCase(c); P.case = { k: c.k, v: c.v }; } break; }
}
function casePrompt() {
  if (!P.case || P.car) return null; const q = P.case, what = q.k === 'cash' ? '$' + q.v.toLocaleString('en-US') + ' cash' : q.k === 'prod' ? q.v + ' units of product' : q.k === 'purse' ? 'the purse' : 'the package';
  return { text: '<b>F</b>Put the case down · ' + what, act: () => { P.putAt = { x: P.x, z: P.z }; if (AUTH()) GAME.putCase(P); else { NET.req('cq'); P.case = null; } SFX.tick(); } };
}
const _cmh = [0, 1, 2, 3].map(() => { const m = caseMesh('cash'); m.visible = false; return m; });
function caseVisuals(dt) {
  CASES.forEach(c => { c.m.rotation.y += dt * .8; c.m.position.y = c.y + .25 + Math.sin(G.time * 2.4 + c.id) * .05; });
  let n = 0; const hand = (a, x, y, z, yaw, k) => { if (n >= _cmh.length) return; const m = _cmh[n++]; m.visible = true; m.material = caseMats[k] || caseMats.cash; m.position.set(x + Math.cos(yaw) * .38, y + .72, z - Math.sin(yaw) * .38); m.rotation.set(0, yaw, 0); };
  if (P.case && !P.car && !P.dead && !firstPerson() && G.state !== 'menu') hand(P, P.x, P.y, P.z, P.yaw, P.case.k);
  for (const k in NET.remotes) { const r = NET.remotes[k]; if (r.case && !r.car && !r.dead) hand(r, r.x, r.y, r.z, r.yaw, r.case.k); }
  for (let i = n; i < _cmh.length; i++) _cmh[i].visible = false;
}
// --- the lab as a business: supplies, upgrades, dealers, raids (all on its owner's machine; the world's machine sends the crews)
function labBusiness(dt) {
  const L = P.lab; if (!L) return;
  L.dealT = (L.dealT || 0) + dt; if (L.dealT >= LAB.dealEvery) { L.dealT = 0; dealersSell(L); }
  if (L.raidT === undefined) L.raidT = G.time + 420 + rand() * 480;
  if (G.time > L.raidT && L.stock >= 8) {
    L.raidT = G.time + (420 + rand() * 480) * (L.up & 8 ? 2 : 1);
    if (!EVTS.some(E => E.k === 'raid')) { if (AUTH()) EV_START.raid(P, L.site, L.up & 8 ? 1 : 0); else NET.req('lr', L.site, L.up & 8 ? 1 : 0); }
  }
}
const mySide = () => G.rivals ? P.team : G.crew;
function dealersSell(L) {
  if (!L.dealers || !L.dealers.length) return; let sold = 0, cash = 0;
  for (let i = L.dealers.length - 1; i >= 0; i--) { const zi = L.dealers[i]; if (L.stock <= 0) break; if (!ZS[zi] || ZS[zi].owner !== mySide()) continue;
    if (rand() < .05) { L.dealers.splice(i, 1); note('Your dealer in ' + ZONES[zi].name + ' got picked up by the police', 'c'); continue; }
    L.stock--; sold++; cash += Math.round(unitVal() * LAB.dealCut); }
  if (sold) { P.earn += cash; gain(cash); note('Your dealers moved ' + sold + (sold === 1 ? ' unit' : ' units') + ' · +$' + cash.toLocaleString('en-US'), 'g'); saveGame(); }
}
function buyUp(i) { const L = P.lab, U = LAB.ups[i]; if (!L || L.up >> i & 1 || !payCash(U[2])) return; L.up |= 1 << i; addRP(CFG.rp.buy); saveGame(); SFX.buy(); banner(U[1], 'Done · ' + U[3], 2.6, 'gold'); }
function buySups() { const L = P.lab; if (!L || L.sup >= 100 || !payCash(LAB.supBuy)) return; L.sup = Math.min(100, L.sup + 50); saveGame(); SFX.buy(); note('Supplies delivered · ' + L.sup + '%', 'g'); }
function hireDealer(zi) { const L = P.lab; if (!L || (L.dealers || []).length >= 3 || (L.dealers || []).includes(zi) || !payCash(LAB.dealer)) return; (L.dealers || (L.dealers = [])).push(zi); saveGame(); SFX.buy(); banner('Dealer on the corner', ZONES[zi].name + ' · sells while your side holds it', 2.6, 'gold'); }
// --- raids: a crew comes for the stock; kill them all before they finish or lose half of it
EV_START.raid = (who, site, sec) => {
  const L = LABS[site]; if (!L || !who || EVTS.some(E => E.k === 'raid')) return false; const ai = aiCrews(); if (!ai.length) return false; const t = ai[(rand() * ai.length) | 0], raiders = [], guards = [];
  for (let k = 0; k < 5; k++) { const a = rand() * TAU, b = spawnBot(t, L.park.x + Math.cos(a) * 9, CURB, L.park.z + Math.sin(a) * 9, { temp: true, wpn: pick(rand, ['smg', 'rifle', 'shotgun', 'pistol']) }); if (!b) continue; b.until = G.time + 200; b.skill = 1.1; b.stay = { x: L.x + rs(3), z: L.z + rs(3) }; b.tgt = who; b.seenT = G.time; raiders.push(b); }
  if (sec && isCrew(who.team)) for (let k = 0; k < 2; k++) { const g = spawnBot(who.team, L.x + rs(2), CURB, L.z + rs(2), { temp: true, wpn: 'rifle' }); if (g) { g.until = G.time + 200; g.stay = { x: L.x + rs(2), z: L.z + rs(2) }; guards.push(g); } }
  evStart({ k: 'raid', owner: who, site, team: t, raiders, guards, x: L.x, z: L.z, until: G.time + 150 }); return true;
};
EV_TICK.raid = E => { if (E.raiders.every(b => b.dead || b.gone)) return evEnd(E, true, 0, E.owner); if (G.time > E.until) { E.raiders.forEach(b => { b.until = G.time + 20; }); evEnd(E, false, 0, E.owner); } };
// --- a supply run: a van of supplies on a crew's corner, driven to your lab
EV_START.sups = (who, site) => {
  const L = LABS[site], p = L && rivalSpot(who, ['hang']); if (!p) return false; const t = ZS[p.hood].owner, s = PARK.filter(q => !q.lot && !q.truck && hyp(q.x - p.x, q.z - p.z) < 45 && !cars.some(c => hyp(c.x - q.x, c.z - q.z) < 6)).sort((q, r) => hyp(q.x - p.x, q.z - p.z) - hyp(r.x - p.x, r.z - p.z))[0]; if (!s) return false;
  const c = spawnCar('van', s.x, s.z, s.yaw, { color: 0x6b5a3a }); if (!c) return false; c.temp = true; c.asleep = true;
  evStart({ k: 'sups', owner: who, site, car: c, team: t, zone: p.hood, guards: guardsAt(p, t, 3), x: c.x, z: c.z, until: G.time + 420 }); return true;
};
EV_TICK.sups = E => { const c = E.car, L = LABS[E.site]; if (!c || c.gone || c.wreck || c.burn > 0) return evEnd(E, false, 0, E.owner);
  const dr = c.occ[0], human = !!dr && (dr === P || dr.kind === 'rp'); if (human) { E.x = L.park.x; E.z = L.park.z; } else { E.x = c.x; E.z = c.z; }
  if (hyp(c.x - L.park.x, c.z - L.park.z) < 10 && carSpeed(c) < 3) { if (P.car === c) GAME.leaveCar(false); c.temp = true; return evEnd(E, true, 0, E.owner); }
  if (G.time > E.until && !human) evEnd(E, false, 0, E.owner); };
// --- wholesale: a crew buys a case of product at a meet. One time in four they came to take it instead.
const meetSpot = (a, d0, d1) => { const st = PARK.filter(q => !q.lot && !q.truck); let best = null, bs = -1e9; for (let k = 0; k < 60; k++) { const s = st[(rand() * st.length) | 0], d = hyp(s.x - a.x, s.z - a.z); if (d < d0 || d > d1 || nearHuman(s.x, s.z) < 50) continue; const sc = rand() * 40 - Math.abs(d - (d0 + d1) / 2); if (sc > bs) { bs = sc; best = s; } } return best; };
EV_START.whsl = (who, units, value) => {
  units = clamp(units | 0, 1, LAB.capBig); const s = meetSpot(who, 130, 300), ai = aiCrews(); if (!s || !ai.length || EVTS.some(E => E.k === 'whsl' && E.owner === who)) return false; const t = ai[(rand() * ai.length) | 0];
  const E = evStart({ k: 'whsl', owner: who, units, price: Math.round(units * value * 1.3 / 10) * 10, cross: rand() < .25, team: t, buyers: [], x: s.x, z: s.z, until: G.time + 360 }); who.deal = E;
  for (let k = 0; k < 3; k++) { const b = spawnBot(t, s.x + rs(3), CURB, s.z + rs(3), { temp: true, wpn: pick(rand, ['smg', 'pistol', 'shotgun']), name: k ? undefined : 'The buyer' }); if (!b) continue; b.until = G.time + 400; b.deal = E; b.stay = { x: s.x + rs(1.5), z: s.z + rs(1.5) }; b.hp0 = b.hp; b.yaw = rand() * TAU; E.buyers.push(b); }
  if (!E.buyers.length) { evEnd(E, false, 0, who); return false; }
  GAME.giveCase(who, 'prod', units, E); return true;
};
EV_TICK.whsl = E => {
  const o = E.owner, lead = E.buyers[0];
  if (!E.blown && E.buyers.some(b => b.dead || b.gone || b.hp < (b.hp0 || 100) - 1)) { E.blown = true; GAME.ev('wb', E.id); }
  const met = !E.done && !E.blown && o && !o.dead && !o.car && o.case && o.case.ev === E ? E.buyers.find(b => !b.dead && !b.gone && hyp(o.x - b.x, o.z - b.z) < 4.5) : null;
  if (met) {
    if (E.cross) { E.blown = true; GAME.ev('wb', E.id); }                                  // it was never about buying
    else { o.case = null; E.done = true; dropCase('cash', E.price, (met.x + o.x) / 2, groundAt(met.x, met.z, met.y + .5, 'p'), (met.z + o.z) / 2, E); GAME.ev('wx', E.id, E.price); E.leaveT = G.time + 20; } }
  if (E.blown && lead && lead.dead && !E.dropped) { E.dropped = true; dropCase('cash', E.price, lead.x, groundAt(lead.x, lead.z, lead.y + .5, 'p'), lead.z, E); }   // the money they were showing is real
  if ((E.done && G.time > E.leaveT) || (E.blown && E.buyers.every(b => b.dead || b.gone)) || G.time > E.until) { if (o) o.deal = null; E.buyers.forEach(b => { b.deal = null; b.until = G.time + 15; }); evEnd(E, E.done || E.dropped, 0, o); }
};
// --- a courier job: a package from one corner of town to a buyer at another, and word may get out
EV_START.cour = who => {
  const a = meetSpot(who, 90, 220); if (!a) return false; const b = meetSpot(a, 220, 420); if (!b) return false;
  const buyer = spawnBot(TEAM_CIV, b.x, CURB, b.z, { role: ROLE.staff, name: 'The buyer' }); if (!buyer) return false; buyer.stay = { x: b.x, z: b.z };
  const E = evStart({ k: 'cour', owner: who, from: { x: a.x, z: a.z }, to: { x: b.x, z: b.z }, buyer, pay: Math.round(lerp(2200, 4200, rand()) / 50) * 50, x: a.x, z: a.z, until: G.time + 420, tailed: false });
  dropCase('pkg', 1, a.x, CURB, a.z, E); return true;
};
EV_TICK.cour = E => {
  const carrier = humans().find(h => h.case && h.case.ev === E);
  if (carrier) { E.x = E.to.x; E.z = E.to.z;
    if (!E.tailed && rand() < .4 / 4) { E.tailed = true; const ai = aiCrews(); if (ai.length) { spawnHitSquad(carrier, ai[(rand() * ai.length) | 0], 2); GAME.ev('st', E.id); } }
    if (hyp(carrier.x - E.to.x, carrier.z - E.to.z) < 5) { carrier.case = null; if (E.buyer && !E.buyer.dead) E.buyer.until = G.time + 20; return evEnd(E, true, E.pay, carrier); } }
  else { const c = CASES.find(q => q.ev === E); if (c) { E.x = c.x; E.z = c.z; } else if (!carrier) return evEnd(E, false); }
  if (G.time > E.until) { const c = CASES.find(q => q.ev === E); if (c) liftCase(c); humans().forEach(h => { if (h.case && h.case.ev === E) h.case = null; }); evEnd(E, false); }
};
// --- between players: one offers product, the other answers from the phone; both get a case and a place to meet. Then it is up to them.
const OFFERS = [];   // offers made to this player: { from, ref, units, price, t }
let myOffer = null;  // the offer this player has out: { to, units, price, t }
GAME.tradeOn = (seller, buyer, units, price) => {
  const s = meetSpot({ x: (seller.x + buyer.x) / 2, z: (seller.z + buyer.z) / 2 }, 0, 160) || { x: (seller.x + buyer.x) / 2, z: (seller.z + buyer.z) / 2 };
  const E = evStart({ k: 'trade', seller, buyer, units, price, x: s.x, z: s.z, until: G.time + 300 });
  GAME.giveCase(seller, 'prod', units, E); GAME.giveCase(buyer, 'cash', price, E); GAME.ev('tr', GAME.ref(seller), GAME.ref(buyer), units, price);
};
EV_TICK.trade = E => { if (G.time > E.until || !humans().includes(E.seller) || !humans().includes(E.buyer)) evEnd(E, true, 0, null); };
function offerTo(r, units, price) {
  const L = P.lab; if (!L || L.stock < units || myOffer) { SFX.deny(); return; }
  L.stock -= units; myOffer = { to: r, units, price, t: G.time }; saveGame(); closeShop();   // the product is set aside until they answer
  if (AUTH()) GAME.ev('to', GAME.ref(P), GAME.ref(r), units, price); else NET.req('of', r.slot, units, price);
  banner('Offer sent', units + ' units to ' + r.name + ' for $' + price.toLocaleString('en-US'), 2.4, 'gold');
}
function answerOffer(o, yes) {
  const i = OFFERS.indexOf(o); if (i >= 0) OFFERS.splice(i, 1); closeShop();
  if (yes && !payCash(o.price)) { SFX.deny(); note('Not enough cash for that', 'c'); yes = false; }
  if (AUTH()) { const s = GAME.unref(o.ref); if (yes && s) GAME.tradeOn(s, P, o.units, o.price); else GAME.ev('tn', o.ref, GAME.ref(P)); } else NET.req(yes ? 'oa' : 'od', o.from.slot, o.units, o.price);
}
// --- texts: a few things worth saying, with where you are attached
const TEXTS = ['Meet me here', 'Need backup', 'Got the goods', 'Bring the money', 'Deal is off', 'Watch your back'];
function sendText(r, i) { closeShop(); if (AUTH()) GAME.ev('mg', GAME.ref(P), GAME.ref(r), i, Math.round(P.x), Math.round(P.z)); else NET.req('mg', r.slot, i); note('Texted ' + r.name + ': ' + TEXTS[i], 'g'); }
// --- news, on every machine
function tradeNews(e) {
  const k = e[1], a = typeof e[2] === 'string' && e[2] ? GAME.unref(e[2]) : null, money = n => '$' + (n | 0).toLocaleString('en-US');   // wb and wx carry an event id, the rest a player
  if (k === 'ct') { const kind = CASE_K[e[3]], v = e[4]; if (a && !AUTH()) a.case = { k: kind, v }; if (a === P) banner(kind === 'cash' ? 'Case of cash · ' + money(v) : kind === 'prod' ? 'Case of product · ' + v + ' units' : 'The package', kind === 'cash' ? 'It is yours once it is home: your yard or your lab' : kind === 'prod' ? 'Your lab, a buyer, or the fence at ' + (FENCE.name || 'Calder Auto Body') : 'Get it to the buyer', 2.6, 'gold'); else if (a && hyp(a.x - P.x, a.z - P.z) < 120) note(nameOf(a) + ' picked up a case', 'g'); SFX.tick(); }
  else if (k === 'cq') { if (a) a.case = null; }
  else if (k === 'cb') { if (a) a.case = null; if (a === P) { banner('Cash stashed', '+' + money(e[3]), 2, 'gold'); SFX.cash(); } }
  else if (k === 'cf') { if (a) a.case = null; if (a === P) { banner('Fenced', e[3] + ' units · +' + money(e[4]), 2.2, 'gold'); SFX.cash(); } }
  else if (k === 'cl') { if (a) a.case = null; if (a === P && P.lab) { P.lab.stock = Math.min(labCap(), P.lab.stock + e[3]); saveGame(); banner('Product back in the lab', '+' + e[3] + ' units', 2, 'gold'); } }
  else if (k === 'wb') { banner('It is a setup', 'They came for the product · their money is on the buyer', 2.6); SFX.star(); }
  else if (k === 'wx') { banner('Deal done', 'They paid ' + money(e[3]) + ' · grab the case', 2.4, 'gold'); SFX.cash(); }
  else if (k === 'to') { const t = GAME.unref(e[3]); if (t === P && a) { OFFERS.push({ from: a, ref: e[2], units: e[4], price: e[5], t: G.time }); banner(nameOf(a) + ' offers product', e[4] + ' units for ' + money(e[5]) + ' · answer in Phone › Deals', 3.2, 'gold'); SFX.tick(); } }
  else if (k === 'tr') { const s = a, b = GAME.unref(e[3]); if (s === P) myOffer = null; if (s === P || b === P) { banner('The meet is on', (s === P ? 'You bring the product, ' + nameOf(b) + ' brings ' + money(e[5]) : nameOf(s) + ' brings ' + e[4] + ' units, you bring the money') + ' · it is on your map', 3.2, 'gold'); SFX.streak(); } }
  else if (k === 'tn') { if (a === P && myOffer) { if (P.lab) P.lab.stock = Math.min(labCap(), P.lab.stock + myOffer.units); myOffer = null; saveGame(); note(nameOf(GAME.unref(e[3])) + ' said no · the product is back in your lab', 'c'); } }
  else if (k === 'wf') { if (a === P && P.lab) { P.lab.stock = Math.min(labCap(), P.lab.stock + e[3]); saveGame(); note('No buyer right now · the product is back in your lab', 'g'); } }
  else if (k === 'mg') { const t = GAME.unref(e[3]); if (t === P && a) { banner(nameOf(a) + ': ' + TEXTS[e[4]], 'Their spot is on your map', 2.8, 'gold'); SFX.tick(); addPing(a, e[5], CURB, e[6], 0); } }
}
// an offer nobody answers runs out after two minutes and the product goes back
function offerTick() { if (myOffer && G.time - myOffer.t > 120) { if (P.lab) P.lab.stock = Math.min(labCap(), P.lab.stock + myOffer.units); myOffer = null; note('Nobody took your offer · the product is back in your lab', 'c'); } for (let i = OFFERS.length - 1; i >= 0; i--) if (G.time - OFFERS[i].t > 115 || !humans().includes(OFFERS[i].from)) OFFERS.splice(i, 1); }
// --- the phone's pages: the lab, deals, texts
function labItems(pg) {
  if (!P.lab) return LABS.map((L, i) => ({ label: L.name, sub: 'Set up a lab here: it makes product you sell, smuggle or deal', cost: LAB.price, act: () => buyLab(i) })).concat([back()]);
  const L = P.lab, run = smugMine(), cash = n => '$' + n.toLocaleString('en-US'), up = { label: '‹ Back', act: () => { shopOpen.page = 'lab'; renderShop(); } };
  if (pg === 'lab-up') return LAB.ups.map((U, i) => L.up >> i & 1 ? { label: U[1], sub: 'Done · ' + U[3], off: true, own: true } : { label: U[1], sub: U[3], cost: U[2], act: () => buyUp(i) }).concat([up]);
  if (pg === 'lab-deal') { const mine = ZS.map((z, i) => i).filter(i => ZS[i].owner === mySide());
    return [{ label: 'Dealers · ' + (L.dealers || []).length + ' of 3', sub: 'Each sells a unit every couple of hours at 85% while your side holds the turf · now and then one gets picked up', off: true, own: true }]
      .concat(mine.slice(0, 7).map(i => (L.dealers || []).includes(i) ? { label: ZONES[i].name, sub: 'Your dealer is on the corner', off: true, own: true } : { label: ZONES[i].name, sub: 'Put a dealer on the corner', cost: LAB.dealer, off: (L.dealers || []).length >= 3, act: () => hireDealer(i) }))
      .concat(mine.length ? [] : [{ label: 'No turf', sub: 'Your side holds no neighbourhood to deal in', off: true }]).concat([up]); }
  return [{ label: LABS[L.site].name, sub: L.stock + ' of ' + labCap() + ' units · ' + cash(L.stock * unitVal()) + ' · supplies ' + L.sup + '%' + (L.sup < LAB.supPer ? ' · STOPPED, no supplies' : ''), off: true, own: true },
    run ? { label: 'Smuggle', sub: 'A run is on now', off: true } : L.stock < 3 ? { label: 'Smuggle', sub: 'Needs three units at least', off: true } : { label: 'Smuggle the product', sub: 'A van takes all of it across town to a buyer · ' + cash(L.stock * unitVal()), act: startSmuggle },
    L.sup >= 100 ? { label: 'Buy supplies', sub: 'Full', off: true } : { label: 'Buy supplies', sub: '+50% · each unit uses 5%', cost: LAB.supBuy, act: buySups },
    EVTS.some(E => E.k === 'sups') ? { label: 'Steal supplies', sub: 'A supply run is on', off: true } : { label: 'Steal supplies', sub: 'A supply van on a crew\'s corner · bring it to the lab for +60%', act: () => { closeShop(); if (AUTH()) { if (!EV_START.sups(P, L.site)) note('No van to be had right now · try again', 'g'); } else NET.req('sp', L.site); } },
    page('Upgrades', 'lab-up'), page('Dealers', 'lab-deal'), back()];
}
function dealItems(pg) {
  const cash = n => '$' + n.toLocaleString('en-US'), L = P.lab, others = Object.values(NET.remotes).filter(r => !r.dead), up = { label: '‹ Back', act: () => { shopOpen.page = 'deals'; renderShop(); } };
  if (pg && pg.slice(0, 7) === 'deals-o') { const r = NET.remotes[pg.slice(8)]; if (!r) return [up];
    return [[5, 500], [5, 750], [10, 550], [10, 800]].map(q => ({ label: q[0] + ' units for ' + cash(q[0] * q[1]), sub: 'To ' + r.name + ' · ' + cash(q[1]) + ' a unit · they answer from their phone', off: !L || L.stock < q[0] || !!myOffer, act: () => offerTo(r, q[0], q[0] * q[1]) })).concat([up]); }
  if (pg && pg.slice(0, 7) === 'deals-t') { const r = NET.remotes[pg.slice(8)]; if (!r) return [up]; return TEXTS.map((t, i) => ({ label: t, sub: 'To ' + r.name + ' · with where you are', act: () => sendText(r, i) })).concat([up]); }
  const out = [];
  OFFERS.forEach(o => { out.push({ label: 'Take ' + nameOf(o.from) + '\'s offer', sub: o.units + ' units for ' + cash(o.price) + ' · you bring a case of cash to the meet', cost: o.price, act: () => answerOffer(o, true) }, { label: 'Turn ' + nameOf(o.from) + ' down', sub: 'No deal', act: () => answerOffer(o, false) }); });
  const busyW = EVTS.some(E => E.k === 'whsl' && (E.owner === P || E.ref === GAME.ref(P)));
  out.push(!L ? { label: 'Sell wholesale', sub: 'You need a lab', off: true } : L.stock < 5 ? { label: 'Sell wholesale', sub: 'Needs five units at least', off: true } : busyW ? { label: 'Sell wholesale', sub: 'A deal is on', off: true }
    : { label: 'Sell wholesale · ' + L.stock + ' units', sub: 'A crew pays 30% over the street price at a meet · bring the case yourself · they do not always pay', act: () => { const u = L.stock; L.stock = 0; saveGame(); closeShop(); if (AUTH()) { if (!EV_START.whsl(P, u, unitVal())) { L.stock = u; note('No buyer right now · try again', 'g'); } } else NET.req('ws', u, unitVal()); } });
  out.push(EVTS.some(E => E.k === 'cour') ? { label: 'Courier job', sub: 'One is on', off: true } : { label: 'Courier job', sub: 'Carry a package across town to a buyer · $2,200 to $4,200', act: () => { closeShop(); if (AUTH()) { if (!EV_START.cour(P)) note('Nothing going right now · try again', 'g'); } else NET.req('cr'); } });
  others.slice(0, 3).forEach(r => { out.push({ label: 'Offer product to ' + r.name + ' ›', sub: 'Name a price · meet them to swap cases', off: !L || L.stock < 5 || !!myOffer, act: () => { shopOpen.page = 'deals-o:' + r.peer; renderShop(); } }); });
  others.slice(0, 3).forEach(r => { out.push({ label: 'Text ' + r.name + ' ›', sub: 'Meet me here, need backup, bring the money…', act: () => { shopOpen.page = 'deals-t:' + r.peer; renderShop(); } }); });
  return out.slice(0, 9).concat([back()]);
}
function tradeEvNews(e, kind) {
  const k = e[1];
  if (k === 'en') { const E = EVTS.find(q => q.id === e[2]), mine = !!E && (E.owner === P || E.seller === P || E.buyer === P);
    if (kind === 'raid') { if (mine) { banner('Your lab is being raided', 'Get there and drop them before they clean you out', 3, 'gold'); SFX.star(); } else if (E && E.owner) note('A crew is hitting ' + nameOf(E.owner) + '\'s lab', 'c'); }
    else if (kind === 'sups' && mine) banner('Supply run', 'A van of supplies on a crew\'s corner · drive it to your lab', 3, 'gold');
    else if (kind === 'whsl' && mine) banner('Wholesale deal', 'The buyers are on your map · bring them the case yourself', 3, 'gold');
    else if (kind === 'cour') banner('Courier job', 'Pick up the package · get it to the buyer', 3, 'gold');
    return; }
  const ok = e[4], amt = e[5], who = GAME.unref(e[6]);
  if (kind === 'raid' && who === P && P.lab) { if (ok) { banner('You held the lab', 'Not a unit lost', 2.6, 'gold'); SFX.streak(); } else { const lost = Math.ceil(P.lab.stock / 2); P.lab.stock -= lost; saveGame(); banner('They cleaned you out', '−' + lost + ' units', 2.6); } }
  else if (kind === 'sups' && who === P && P.lab) { if (ok) { P.lab.sup = Math.min(100, P.lab.sup + 60); saveGame(); banner('Supplies in', 'The lab is at ' + P.lab.sup + '%', 2.4, 'gold'); SFX.streak(); } else note('The supply run fell through', 'c'); }
  else if (kind === 'whsl' && who === P && !ok) note('The deal fell through', 'c');
  else if (kind === 'cour') { if (ok) { banner('Package delivered', '+$' + (amt | 0).toLocaleString('en-US'), 2.4, 'gold'); SFX.streak(); } else note('The courier job fell through', 'c'); }
}
