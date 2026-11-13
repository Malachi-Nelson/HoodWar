/* =====================================================================
   11c. HEISTS AND THE PRODUCT TRADE — the bank on Calder Avenue, the airport's cargo yard and the jewelers in the mall, done by
        everyone in the session together; and a lab of your own whose product you smuggle across town to a buyer.
        The bank takes setting up first: a getaway car stolen off a crew and parked behind the bank, the drill and charges taken
        off another, and the bank cased from the inside. Then in loud (alarm, guards, drill the vault, keep it running) or quiet
        (guns away, hack the time lock in the back office before a guard sees what you are doing). The money comes out in bags:
        one on each back, slow going, and every bag has to reach the getaway car, and the car the drop, for it to count.
        The machine that runs the world runs all of it as events, so they are in everyone's list and on everyone's map.
   ===================================================================== */
const JOBS = { bank: { name: 'Calder Savings Score', cost: 2500, rank: 4, cool: 600, bag: 3500, quiet: 1.4 }, cargo: { name: 'Cargo Score', cost: 4000, rank: 6, cool: 700, bag: 6000 }, jewel: { name: 'Jewelry store', cost: 1000, rank: 2, cool: 420 } };
const PREPS = { car: { name: 'Getaway car', how: 'Steal a fast car off a crew and park it behind Calder Savings', pay: 750 }, gear: { name: 'Drill and charges', how: 'Take the crate of gear off a crew and bring it to the getaway spot', pay: 750 }, scout: { name: 'Case the bank', how: 'Stand at the three marked spots in and around the bank, guns away, no stars', pay: 500 } }, PREP_IDS = ['car', 'gear', 'scout'];
const LAB = { price: 25000, cap: 20, unit: 600, hour: 100 };   // a lab: what it costs, what it holds, what a unit sells for, seconds to make one
EV_KINDS.push('bank', 'jewel', 'smug', 'prep', 'cargo');
Object.assign(EV_INFO, {
  bank:  { name: 'Bank job', icon: '$', col: '#ffc83d', hex: 0xffc83d, how: 'Calder Savings: open the vault, bag the cash, load the getaway car, reach the drop' },
  jewel: { name: 'Jewelry store', icon: '◇', col: '#9fd0ff', hex: 0x9fd0ff, how: 'Gold Rush Jewelers in the mall: smash the cases and get out' },
  smug:  { name: 'Smuggling run', icon: '▣', col: '#c8ff7d', hex: 0xc8ff7d, how: 'Drive the van to the buyer' },
  prep:  { name: 'Heist setup', icon: '★', col: '#ffd27d', hex: 0xffd27d, how: 'Set up the bank job' },
  cargo: { name: 'Cargo Score', icon: '▲', col: '#ffb347', hex: 0xffb347, how: 'Airport cargo yard: crack the gold container, load the gold, get it out' },
});
CFG.rp.job.bank = 1200; CFG.rp.job.jewel = 500; CFG.rp.job.smug = 300; CFG.rp.job.prep = 250; CFG.rp.job.cargo = 1400;
G.prep = { car: 0, gear: 0, scout: 0 };
const zoneById = id => ZONES.find(z => z.id === id);
// the drop, or the buyer: somewhere a long way across town from where the job was
function dropFar(x, z) { const all = [CHOP, zoneById('E'), zoneById('J'), zoneById('I'), zoneById('B'), zoneById('A')].filter(Boolean).map(q => ({ x: q.x, z: q.z })), far = all.filter(q => hyp(q.x - x, q.z - z) > 230); const list = far.length ? far : all; return list[(rand() * list.length) | 0]; }
const jobOn = () => EVTS.find(E => E.k === 'bank' || E.k === 'jewel' || E.k === 'cargo') || null;
const heistBusy = () => EVTS.find(E => E.k === 'bank' || E.k === 'jewel' || E.k === 'cargo' || E.k === 'prep') || null;
const bagJob = () => EVTS.find(E => E.k === 'bank' || E.k === 'cargo') || null;
const wpnOfH = h => h === P ? P.wpn : h.wpn || 'fist';
G.jobT = {};
// the last leg of the jewelers: anyone in the crew at the fence, with the police off them, ends it and everyone is paid a share
function dropLeg(E) {
  const hs = humans().filter(h => !h.dead), h = hs.find(q => hyp(q.x - E.x, q.z - E.z) < 10); if (!h) return;
  if (h.heat > 0) { if (G.time - (E.warnT || -9) > 6) { E.warnT = G.time; GAME.ev('hj', E.id, 9); } return; }
  G.jobT[E.k] = G.time + JOBS[E.k].cool; evEnd(E, true, Math.round(E.take / Math.max(1, humans().length) / 10) * 10, h);
}
function jobFail(E) { (E.bags || []).forEach(b => { if (!b.gone) removePickup(b); }); humans().forEach(h => { h.bag = 0; }); G.jobT[E.k] = G.time + JOBS[E.k].cool / 2; evEnd(E, false); }

// --- inside the bank: three guard posts, the time-lock panel in the back office, three spots to case, and where the getaway car waits
const BK2 = BANK ? (() => { const B = BANK, tx = B.x1 + 9, s = PARK.filter(q => !q.lot && !q.truck).sort((a, b) => hyp(a.x - tx, a.z - B.cz) - hyp(b.x - tx, b.z - B.cz))[0];
  return { posts: [[B.x0 + 4, B.cz + 3.5], [B.x0 + 11.5, B.cz - 2.5], [B.vx - 3, B.cz + 3]], panel: { x: B.vx - 2.2, z: B.z1 - 1.25 }, spots: [{ x: B.x0 + 5.5, z: B.z0 + 1.7 }, { x: B.x0 + 7.2, z: B.z1 - 2.6 }, { x: B.x1 + 2.6, z: B.cz }],
    away: s ? { x: s.x, z: s.z, yaw: s.yaw } : { x: B.door.x - 10, z: B.cz, yaw: 0 } }; })() : null;
// the airport's cargo yard: the gold is in the end container of the west row
const CARGO = { hack: { x: 950.6, z: 493.6 }, door: { x: 948.5, z: 493.6 }, posts: [[947, 470], [949, 512], [940, 488], [966, 506]] };
const inBank = h => !!BANK && h.x > BANK.x0 && h.x < BANK.x1 && h.z > BANK.z0 && h.z < BANK.z1 && h.y < 4;
const inStaff = h => !!BANK && h.x > BANK.x0 + 9.2 && h.x < BANK.vx && h.z > BANK.z0 && h.z < BANK.z1 && h.y < 4;
const getaway = E => { const c = E.k === 'bank' ? (G.prep.car ? carById(G.prep.car) : null) : E.gc ? carById(E.gc) : null; return c && !c.wreck && !c.gone ? c : null; };
const prepMask = () => { const c = G.prep.car ? carById(G.prep.car) : null; return (c && !c.wreck ? 1 : 0) | (G.prep.gear ? 2 : 0) | (G.prep.scout ? 4 : 0); };
function postGuards(E, posts, until, face) { posts.forEach((q, k) => { const g = spawnBot(TEAM_COP, q[0], CURB, q[1], { temp: true, wpn: k === 1 ? 'smg' : k === 3 ? 'shotgun' : 'pistol', name: 'Guard' }); if (g) { g.until = until; g.skill = 1.15; g.hp = g.hp0 = 130; g.stay = { x: q[0], z: q[1] }; if (face) { g.watch = yawOf(face.x - q[0], face.z - q[1]); g.yaw = g.watch; } E.guards.push(g); } }); }

// --- the bank. who: the player who started it; quiet: the way in
EV_START.bank = (who, quiet) => {
  if (!BANK || heistBusy() || G.time < (G.jobT.bank || 0)) return false;
  quiet = !!quiet; if (quiet ? !G.prep.scout : !G.prep.gear) return false;
  const E = evStart({ k: 'bank', stage: 0, quiet, alarm: false, sus: 0, x: BANK.door.x, z: BANK.door.z, until: G.time + 1080, drill: 0, jam: false, jamAt: .3 + rand() * .15, take: 0, loaded: 0, bags: [], guards: [], lockT: 0 });
  postGuards(E, BK2.posts, G.time + 1080, BANK.door); return true;
};
EV_TICK.bank = E => {
  const hs = humans().filter(h => !h.dead && !h.down);
  bankWatch(E, hs);
  if (E.stage === 0) { if (hs.some(inBank)) { E.stage = 1; const t = E.quiet ? BK2.panel : BANK.vault; E.x = t.x; E.z = t.z; if (!E.quiet) bankAlarm(E, 3); GAME.ev('hj', E.id, E.quiet ? 4 : 1); } }
  else if (E.stage === 1 && !E.quiet) {   // the drill: someone at the vault keeps it turning; now and then it jams and someone has to start it again
    const at = hs.filter(h => hyp(h.x - BANK.vault.x, h.z - BANK.vault.z) < 2.8);
    if (at.length && !E.jam) { E.drill = Math.min(1, E.drill + .25 / 45 * (1 + .3 * (at.length - 1))); hs.forEach(h => { if (inBank(h)) GAME.crime(h, 0, 3); }); if (E.drill >= E.jamAt && E.drill < 1) { E.jam = true; GAME.ev('hj', E.id, 6); } }
    if (E.drill >= 1) openVault(E, BANK.vx + 1.9, BANK.cz, JOBS.bank.bag); }
  else if (E.stage === 2) { if (G.time >= E.lockT) openVault(E, BANK.vx + 1.9, BANK.cz, Math.round(JOBS.bank.bag * (E.alarm ? 1 : JOBS.bank.quiet))); }
  else if (E.stage === 3) bagStage(E, BANK.door);
  else if (E.stage === 4) haulLeg(E);
  carryTick(E);
  if (G.time > E.until) jobFail(E);
};
// quiet: a guard who sees a gun out, someone behind the counter or at the vault, or anyone in a car in the lobby grows suspicious;
// a guard hurt, a shot near the bank or suspicion run out and the alarm goes
function bankWatch(E, hs) {
  if (E.alarm || E.stage > 3) return;
  if (E.guards.some(g => g.dead || g.gone || g.hp < (g.hp0 || 130) - 1) || E.noisy) return bankAlarm(E, 3);
  if (!E.quiet) return;
  let see = 0;
  E.guards.forEach(g => hs.forEach(h => { if (!inBank(h) && hyp(h.x - BANK.door.x, h.z - BANK.door.z) > 7) return; const vx = h.x - g.x, vz = h.z - g.z, d = hyp(vx, vz); if (d > 13 || (g.watch !== undefined && d > 1.5 && (-Math.sin(g.watch) * vx - Math.cos(g.watch) * vz) / d < .36) || !los(g.x, eyeY(g), g.z, h.x, h.y + 1.2, h.z, 'a')) return;   // a guard watches the way they face, toward the door
    let k = 0; if (!WEAPONS[wpnOfH(h)].melee) k += 1; if (inStaff(h)) k += .7; if (hyp(h.x - BANK.vault.x, h.z - BANK.vault.z) < 4) k += .8; if (h.car) k += 1; if (h.bag) k += 1; see = Math.max(see, k); }));
  E.sus = clamp(E.sus + (see > 0 ? see * .25 / 3.2 : -.25 / 14), 0, 1);
  if (E.sus >= 1) bankAlarm(E, 3);
}
function bankAlarm(E, stars) { E.alarm = true; E.sus = 1; humans().forEach(h => { if (!h.dead && hyp(h.x - BANK.door.x, h.z - BANK.door.z) < 95) GAME.crime(h, 60, stars); }); if (E.quiet) GAME.ev('hj', E.id, 1); }
GAME.heard = (x, z) => { const E = EVTS.find(q => q.k === 'bank' && q.quiet && !q.alarm); if (E && BANK && hyp(x - (BANK.x0 + BANK.x1) / 2, z - BANK.cz) < 32) E.noisy = true; };
// the vault (or the container) opens: bags of money on the floor, more the more of you there are
function openVault(E, x0, z0, each) {
  E.stage = 3; E.openT = G.time; E.x = x0 + 2; E.z = z0; const n = Math.min(8, 2 + 2 * humans().length);
  for (let k = 0; k < n; k++) { const p = addPickup('hbag', x0 + (k % 4) * 1.35, CURB + .25, z0 - 1.3 + Math.floor(k / 4) * 2.6, Math.round(each / 100)); p.ev = E; E.bags.push(p); }
  if (E.k === 'bank' && E.quiet && !E.alarm) E.silentT = G.time + 45;   // a quiet job buys you a head start, not a free ride
  GAME.ev('hj', E.id, 2);
}
// bags out: the marker sits on the getaway car while there are bags to load; when they are all out (or time has run on), the drop
function bagStage(E, door) {
  const gc = getaway(E); if (gc) { E.x = gc.x; E.z = gc.z; }
  if (E.silentT && !E.alarm && G.time > E.silentT) { bankAlarm(E, 2); GAME.ev('hj', E.id, 8); }
  const left = E.bags.filter(b => !b.gone).length, secured = E.loaded > 0 || humans().some(h => h.bag);
  if (!left || (G.time - E.openT > 100 && secured)) { E.bags.forEach(b => { if (!b.gone) removePickup(b); }); E.bags = []; E.stage = 4; const d = dropFar(door.x, door.z); E.x = d.x; E.z = d.z; GAME.ev('hj', E.id, 3); }
}
// who carries what: a bag is dropped by anyone who goes down, and goes into the getaway car when its carrier reaches it
function carryTick(E) {
  let gc = getaway(E);
  humans().forEach(h => { if (!h.bag) return;
    if (h.dead || h.down) { const b = addPickup('hbag', h.x + rs(.6), groundAt(h.x, h.z, h.y + .5, 'p'), h.z + rs(.6), Math.round(h.bag / 100)); b.ev = E; E.bags.push(b); h.bag = 0; GAME.ev('bd', E.id, GAME.ref(h)); return; }
    if (!gc && E.k === 'cargo') { const c = h.car && h.car.occ[0] && h.car.occ[0].kind !== 'bot' ? h.car : cars.find(q => !q.wreck && q.occ[0] && (q.occ[0] === P || q.occ[0].kind === 'rp') && hyp(q.x - h.x, q.z - h.z) < 4.5); if (c) { E.gc = c.id; gc = c; GAME.ev('hj', E.id, 11, c.id); } }
    if (gc && (h.car === gc || hyp(h.x - gc.x, h.z - gc.z) < 4.5) && E.stage >= 3) { E.loaded += h.bag; GAME.ev('bl', E.id, GAME.ref(h), h.bag, E.loaded); h.bag = 0; } });
  if (E.loaded > 0 && !gc) { GAME.ev('bx', E.id, E.loaded); E.loaded = 0; }
}
// the drop: the getaway car (with what is loaded) and anyone still carrying a bag, there together with the police off them
function haulLeg(E) {
  const hs = humans().filter(h => !h.dead), at = hs.filter(q => hyp(q.x - E.x, q.z - E.z) < 12); if (!at.length) return;
  if (at.some(q => q.heat > 0)) { if (G.time - (E.warnT || -9) > 6) { E.warnT = G.time; GAME.ev('hj', E.id, 9); } return; }
  const gc = getaway(E), inCar = gc && hyp(gc.x - E.x, gc.z - E.z) < 16 ? E.loaded : 0, near = hs.filter(q => hyp(q.x - E.x, q.z - E.z) < 30), take = inCar + near.reduce((m, q) => m + (q.bag | 0), 0);
  if (take <= 0) { if (G.time - (E.warnT || -9) > 8) { E.warnT = G.time; GAME.ev('hj', E.id, 10); } return; }
  near.forEach(q => { q.bag = 0; }); if (inCar) E.loaded = 0;
  G.jobT[E.k] = G.time + JOBS[E.k].cool; E.take = take; evEnd(E, true, Math.round(take / Math.max(1, humans().length) / 10) * 10, at[0]);
}
GAME.takeHBag = (p, who) => { if (p.gone || who.bag || who.dead || who.down) return; const E = p.ev; removePickup(p); if (!E || E.over) return; who.bag = p.amt; const i = E.bags.indexOf(p); if (i >= 0) E.bags.splice(i, 1); GAME.ev('bg', E.id, GAME.ref(who), p.amt); };
GAME.takeLoot = (p, who) => { if (p.gone) return; removePickup(p); const E = p.ev; if (E && !E.over) { E.take += p.amt; GAME.ev('lt', E.id, GAME.ref(who), p.amt, E.take); } };
// the quiet way: the time lock is hacked from the panel in the back office; then it counts down and opens the vault by itself
GAME.hack = who => { const E = bagJob(); if (!E) return;
  if (E.k === 'bank' && E.stage === 1 && E.quiet) { E.stage = 2; E.lockT = G.time + 20; E.x = BANK.vault.x; E.z = BANK.vault.z; GAME.ev('hj', E.id, 5, GAME.ref(who)); }
  else if (E.k === 'cargo' && E.stage === 1) openVault(E, CARGO.door.x - 4.2, CARGO.door.z, JOBS.cargo.bag); };
GAME.drillOn = who => { const E = EVTS.find(q => q.k === 'bank'); if (!E || !E.jam) return; E.jam = false; E.jamAt = E.drill + .26 + rand() * .16; GAME.ev('hj', E.id, 7, GAME.ref(who)); };

// --- the cargo yard: no setting up, all noise. The yard is airport police ground; the gold goes into whatever you drive or fly in.
EV_START.cargo = () => {
  if (heistBusy() || G.time < (G.jobT.cargo || 0)) return false;
  const E = evStart({ k: 'cargo', stage: 0, x: CARGO.hack.x, z: CARGO.hack.z, until: G.time + 1080, take: 0, loaded: 0, bags: [], guards: [], gc: 0 });
  postGuards(E, CARGO.posts, G.time + 1080); return true;
};
EV_TICK.cargo = E => {
  const hs = humans().filter(h => !h.dead && !h.down);
  if (E.stage === 0) { if (hs.some(h => hyp(h.x - CARGO.hack.x, h.z - CARGO.hack.z) < 34)) { E.stage = 1; hs.forEach(h => { if (hyp(h.x - CARGO.hack.x, h.z - CARGO.hack.z) < 90) GAME.crime(h, 50, 3); }); GAME.ev('hj', E.id, 12); } }
  else if (E.stage === 1) hs.forEach(h => { if (hyp(h.x - CARGO.hack.x, h.z - CARGO.hack.z) < 40) GAME.crime(h, 0, 3); });
  else if (E.stage === 3) bagStage(E, CARGO.door);
  else if (E.stage === 4) haulLeg(E);
  carryTick(E);
  if (G.time > E.until) jobFail(E);
};

// --- setups for the bank: one at a time, for the whole session
EV_START.prep = (who, sub) => {
  if (!BANK || heistBusy() || !PREPS[sub] || (sub === 'car' ? prepMask() & 1 : G.prep[sub])) return false; const a = who || someHuman();
  if (sub === 'car') { const p = rivalSpot(a, ['hang']); if (!p) return false; const t = ZS[p.hood].owner, s = PARK.filter(q => !q.lot && !q.truck && hyp(q.x - p.x, q.z - p.z) < 45 && !cars.some(c => hyp(c.x - q.x, c.z - q.z) < 6)).sort((q, r) => hyp(q.x - p.x, q.z - p.z) - hyp(r.x - p.x, r.z - p.z))[0]; if (!s) return false;
    const c = spawnCar(pick(rand, ['super', 'sport', 'muscle']), s.x, s.z, s.yaw, { color: 0x1b1e24 }); if (!c) return false; c.temp = true; c.prep = true; c.asleep = true;
    evStart({ k: 'prep', sub, car: c, team: t, zone: p.hood, guards: guardsAt(p, t, 3), x: c.x, z: c.z, until: G.time + 420 }); return true; }
  if (sub === 'gear') { const p = rivalSpot(a, ['hang']); if (!p) return false; const t = ZS[p.hood].owner, bag = addPickup('bag', p.x, groundAt(p.x, p.z, p.y + .5, 'p'), p.z, t);
    const E = evStart({ k: 'prep', sub, bag, team: t, zone: p.hood, guards: guardsAt(p, t, 4), carrier: null, x: p.x, z: p.z, until: G.time + 420 }); bag.ev = E; return true; }
  evStart({ k: 'prep', sub, mask: 0, hold: [0, 0, 0], x: BK2.spots[0].x, z: BK2.spots[0].z, until: G.time + 360 }); return true;
};
EV_TICK.prep = E => {
  if (E.sub === 'car') { const c = E.car; if (!c || c.gone || c.wreck || c.burn > 0) return prepEnd(E, false);
    const dr = c.occ[0], human = !!dr && (dr === P || dr.kind === 'rp'); if (human) { E.x = BK2.away.x; E.z = BK2.away.z; } else { E.x = c.x; E.z = c.z; }
    if (hyp(c.x - BK2.away.x, c.z - BK2.away.z) < 9 && carSpeed(c) < 3) { G.prep.car = c.id; c.getaway = true; c.temp = false; c.prep = false; c.home = null; return prepEnd(E, true, human ? dr : null); }
    if (G.time > E.until && !human) prepEnd(E, false); return; }
  if (E.sub === 'gear') { const c = E.carrier;
    if (c) { if (c.gone || c.dead || c.down) { const b = addPickup('bag', c.x, groundAt(c.x, c.z, c.y + .5, 'p'), c.z, E.team); b.ev = E; E.bag = b; E.carrier = null; GAME.ev('sd', E.id); return; }
      const gc = G.prep.car ? carById(G.prep.car) : null, t = gc && !gc.wreck ? gc : BK2.away; E.x = t.x; E.z = t.z;
      if (hyp(c.x - t.x, c.z - t.z) < 6) { G.prep.gear = 1; return prepEnd(E, true, c); } return; }
    if (E.bag && !E.bag.gone) { E.x = E.bag.x; E.z = E.bag.z; }
    if (G.time > E.until) { if (E.bag) removePickup(E.bag); prepEnd(E, false); } return; }
  const hs = humans().filter(h => !h.dead && !(h.heat > 0) && !h.car && WEAPONS[wpnOfH(h)].melee);   // casing: walk in like a customer
  BK2.spots.forEach((s, i) => { if (E.mask >> i & 1) return; if (hs.some(h => hyp(h.x - s.x, h.z - s.z) < 1.7 && Math.abs(h.y - CURB) < 1.6)) { E.hold[i] += .25; if (E.hold[i] >= 2.5) { E.mask |= 1 << i; GAME.ev('pz', E.id, i, E.mask); } } });
  const nx = BK2.spots.findIndex((s, i) => !(E.mask >> i & 1)); if (nx >= 0) { E.x = BK2.spots[nx].x; E.z = BK2.spots[nx].z; }
  if (E.mask === 7) { G.prep.scout = 1; return prepEnd(E, true, null); }
  if (G.time > E.until) prepEnd(E, false);
};
function prepEnd(E, ok, who) { if (!ok && E.sub === 'car' && E.car && !E.car.gone) E.car.temp = true; evEnd(E, ok, ok ? PREPS[E.sub].pay : 0, who); if (ok) GAME.ev('pp', PREP_IDS.indexOf(E.sub), prepMask()); }

// the strongroom door: shut and solid until the drill is through, then it swings open
const vaultDoor = (() => { if (!BANK) return null; const g = new T.Group(), m = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, .5, 24), new T.MeshLambertMaterial({ color: 0x9aa2aa })); m.rotation.z = PI / 2; m.position.set(0, 0, 1.15); g.add(m);
  const hub = new T.Mesh(new T.CylinderGeometry(.35, .35, .7, 12), new T.MeshLambertMaterial({ color: 0x6a7078 })); hub.rotation.z = PI / 2; hub.position.set(-.1, 0, 1.15); g.add(hub);
  g.position.set(BANK.vx + .45, CURB + 1.3, BANK.cz - 1.15); scene.add(g); BANK.vbox = solid(BANK.vx, BANK.vx + .9, CURB, CURB + 2.7, BANK.cz - 1.15, BANK.cz + 1.15); return g; })();
let vaultA = 0;
// the time-lock panel on the back-office wall, the three spots to case (while that setup is on), a bag on every carrier's back,
// and a sign over the getaway car
const lockPanel = BK2 ? (() => { const m = new T.Mesh(new T.BoxGeometry(.8, .6, .08), new T.MeshBasicMaterial({ color: 0x3fd07a })); m.position.set(BK2.panel.x, CURB + 1.4, BANK.z1 - .55); scene.add(m); return m; })() : null;
const caseRings = BK2 ? BK2.spots.map(q => { const m = mark(q.x, q.z, 0xffd27d, 1.5); m.visible = false; return m; }) : [];
const bagMeshes = [0, 1, 2, 3, 4, 5].map(() => { const m = new T.Mesh(bagGeo, bagMat); m.visible = false; m.scale.setScalar(1.25); scene.add(m); return m; });
const awaySign = (() => { const cv = texCanvas(256, 64), x = cv.getContext('2d'); x.fillStyle = 'rgba(14,16,20,.8)'; x.fillRect(0, 8, 256, 48); x.strokeStyle = '#ffc83d'; x.lineWidth = 4; x.strokeRect(2, 10, 252, 44); x.fillStyle = '#ffc83d'; x.font = '700 34px "Saira Condensed", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GETAWAY', 128, 33);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false, fog: false })); sp.renderOrder = 8; sp.visible = false; scene.add(sp); return sp; })();
function heistVisuals(dt) {
  const E = EVTS.find(q => q.k === 'bank');
  if (vaultDoor) { const open = !!E && E.stage >= 3; vaultA = lerp(vaultA, open ? 1.75 : 0, Math.min(1, dt * 1.6)); vaultDoor.rotation.y = -vaultA; BANK.vbox.off = vaultA > .6; }   // shut, it is part of the wall
  if (lockPanel) lockPanel.material.color.setHex(!E ? 0x3fd07a : E.alarm ? 0xe23b2e : E.stage === 2 ? 0xffc83d : E.stage >= 3 ? 0x8fe36b : 0x3fd07a);
  const pr = EVTS.find(q => q.k === 'prep' && q.sub === 'scout'); caseRings.forEach((m, i) => { m.visible = !!pr && !((pr.mask | 0) >> i & 1); });
  let n = 0; const back = (a, x, y, z, yaw) => { if (n >= bagMeshes.length) return; const m = bagMeshes[n++]; m.visible = true; m.position.set(x + Math.sin(yaw) * .3, y + 1.15, z + Math.cos(yaw) * .3); m.rotation.set(0, yaw, .2); };
  if (P.bag && !P.car && !P.dead && G.state !== 'menu' && !firstPerson()) back(P, P.x, P.y, P.z, P.yaw);
  for (const k in NET.remotes) { const r = NET.remotes[k]; if (r.bag && !r.car && !r.dead) back(r, r.x, r.y, r.z, r.yaw); }
  for (let i = n; i < bagMeshes.length; i++) bagMeshes[i].visible = false;
  const gc = G.prep.car && G.state !== 'menu' ? carById(G.prep.car) : null; awaySign.visible = !!gc && !gc.wreck; if (awaySign.visible) { const d = hyp(gc.x - camera.position.x, gc.z - camera.position.z); awaySign.position.set(gc.x, gc.y + 2.6 + Math.min(4, d * .03), gc.z); awaySign.scale.set(clamp(d * .06, 2.2, 9), clamp(d * .06, 2.2, 9) / 4, 1); }
  jewelCases();
}
// the bank's and the cargo yard's prompts: hack the panel, start the drill again
function bankPrompt() {
  const E = bagJob(); if (!E || P.car) return null;
  if (P.hack) return { text: 'Hacking… ' + Math.round(P.hack.t / P.hack.need * 100) + '% · stay at the panel' };
  if (E.k === 'bank' && E.quiet && (E.stage | 0) === 1 && hyp(P.x - BK2.panel.x, P.z - BK2.panel.z) < 1.5) return { text: '<b>F</b>Hack the time lock', act: () => { P.hack = { t: 0, need: 7, x: BK2.panel.x, z: BK2.panel.z }; SFX.tick(); } };
  if (E.k === 'cargo' && (E.stage | 0) === 1 && hyp(P.x - CARGO.hack.x, P.z - CARGO.hack.z) < 1.7) return { text: '<b>F</b>Crack the container lock', act: () => { P.hack = { t: 0, need: 10, x: CARGO.hack.x, z: CARGO.hack.z }; SFX.tick(); } };
  if (E.k === 'bank' && E.jam && hyp(P.x - BANK.vault.x, P.z - BANK.vault.z) < 2.8) return { text: '<b>F</b>Start the drill again', act: () => { if (AUTH()) GAME.drillOn(P); else { NET.req('dr'); E.jam = false; } SFX.tick(); } };
  return null;
}
// a hack runs while you stand at the panel; walk off, go down or get hurt badly and it stops
function hackTick(dt) {
  const H = P.hack; if (!H) return; const E = bagJob();
  if (!E || P.dead || P.down || P.car || hyp(P.x - H.x, P.z - H.z) > 2) { P.hack = null; return; }
  H.t += dt; P.shootT = Math.max(P.shootT, .2); if (H.t < H.need) return;
  P.hack = null; SFX.cap(true); if (AUTH()) GAME.hack(P); else NET.req('hk');
}

// --- the jewelers: smash the cases (the alarm goes at the first), then get the take to the fence clean
const JEWEL = (() => { const f = FRONTS.find(q => q.name === 'GOLD RUSH JEWELERS' && q.mall) || FRONTS.filter(q => q.mall).sort((p, q) => hyp(p.x - zoneById('C').x, p.z - zoneById('C').z) - hyp(q.x - zoneById('C').x, q.z - zoneById('C').z))[0]; if (!f) return null;
  const n = FACE[f.face], tx = -n[1], tz = n[0], cases = [];
  for (let k = 0; k < 5; k++) { const o = (k - 2) * 1.5, x = f.x + n[0] * 1.2 + tx * o, z = f.z + n[1] * 1.2 + tz * o, g = new T.Group();
    const base = new T.Mesh(new T.BoxGeometry(1.1, .8, .6), new T.MeshLambertMaterial({ color: 0x2a2620 })), glass = new T.Mesh(new T.BoxGeometry(1.06, .4, .56), new T.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: .32 })), gold = new T.Mesh(new T.BoxGeometry(.7, .08, .3), new T.MeshLambertMaterial({ color: 0xffc83d, emissive: 0x5a4210 }));
    base.position.y = .4; glass.position.y = 1.0; gold.position.y = .85; g.add(base, glass, gold); g.position.set(x, CURB, z); g.rotation.y = Math.atan2(tx, tz); scene.add(g); cases.push({ x, z, glass, gold }); solid(x - .45, x + .45, CURB, CURB + .8, z - .45, z + .45); }
  return { door: { x: f.x, z: f.z }, cases, name: titleCase(f.name) }; })();
function jewelCases() { if (!JEWEL) return; const E = EVTS.find(q => q.k === 'jewel'), m = E ? E.cases | 0 : 0; JEWEL.cases.forEach((c, i) => { const broke = !!(m >> i & 1); c.glass.visible = !broke; c.gold.visible = !broke; }); }
EV_START.jewel = () => { if (!JEWEL || jobOn() || G.time < (G.jobT.jewel || 0)) return false; evStart({ k: 'jewel', stage: 1, x: JEWEL.door.x, z: JEWEL.door.z, until: G.time + 600, take: 0, cases: 0, alarm: false }); return true; };
GAME.smash = (i, who) => {
  const E = EVTS.find(q => q.k === 'jewel'); if (!E || E.stage !== 1 || (E.cases >> i & 1) || !JEWEL.cases[i]) return;
  E.cases |= 1 << i; const v = Math.round(lerp(1200, 2000, rand()) / 50) * 50; E.take += v;
  if (!E.alarm) { E.alarm = true; E.alarmT = G.time; humans().forEach(h => { if (hyp(h.x - JEWEL.door.x, h.z - JEWEL.door.z) < 70) GAME.crime(h, 40, 2); }); }
  GAME.ev('js', E.id, i, GAME.ref(who), v, E.take);
};
EV_TICK.jewel = E => {
  if (E.stage === 1 && E.alarm && (E.cases === 31 || G.time - E.alarmT > 50)) { E.stage = 3; const d = dropFar(JEWEL.door.x, JEWEL.door.z); E.x = d.x; E.z = d.z; GAME.ev('hj', E.id, 3); }
  else if (E.stage === 3) dropLeg(E);
  if (G.time > E.until) jobFail(E);
};
function jewelPrompt() {
  const E = EVTS.find(q => q.k === 'jewel'); if (!E || (E.stage | 0) !== 1 || !JEWEL) return null;
  for (let i = 0; i < JEWEL.cases.length; i++) { const c = JEWEL.cases[i]; if ((E.cases >> i & 1) || hyp(c.x - P.x, c.z - P.z) > 1.5) continue;
    return { text: '<b>F</b>Smash the case', act: () => { SFX.crash(c.x, CURB + 1, c.z, 4); FX.sparks(c.x, CURB + 1, c.z, 6); if (AUTH()) GAME.smash(i, P); else { NET.req('js', i); E.cases |= 1 << i; } } }; }
  return null;
}

// --- a lab of your own: it makes product, a unit every in-game hour up to twenty; when you want the money, a van takes it
//     across town to a buyer. Rival crews hear about it and come for the van.
LABS.forEach((L, i) => { L.name = (L.j <= 1 ? 'North' : L.j >= 4 ? 'South' : 'River') + ' side lab'; L.idx = i; L.m = mark(L.x, L.z, 0xc8ff7d, .8); });
function labTick() {
  const L = P.lab; if (!L || G.state !== 'playing' || G.phase !== 'play') { if (L) L.at = G.time; return; }
  const dt = Math.max(0, G.time - (L.at === undefined ? G.time : L.at)); L.at = G.time; if (L.sup === undefined) L.sup = 60;
  if (L.sup >= LAB.supPer && L.stock < labCap()) { L.prog = (L.prog || 0) + dt / (LAB.hour / (L.up & 1 ? LAB.fast : 1));   // a unit an hour (faster with the better kit), each using up some supplies
    while (L.prog >= 1 && L.sup >= LAB.supPer && L.stock < labCap()) { L.prog -= 1; L.stock++; L.sup -= LAB.supPer; if (L.stock === labCap()) note('Your lab is full · sell, deal or smuggle the product', 'g'); if (L.sup < LAB.supPer) note('Your lab is out of supplies · Phone › Your lab', 'g'); } }
  labBusiness(dt);
}
const smugMine = () => EVTS.find(E => E.k === 'smug' && (E.owner === P || E.ref === GAME.ref(P))) || null;
function buyLab(i) { if (P.lab || !LABS[i] || !payCash(LAB.price)) return; P.lab = { site: i, stock: 0, prog: 0, at: G.time, sup: 100, up: 0, dealers: [] }; addRP(CFG.rp.buy * 2); saveGame(); SFX.buy(); banner(LABS[i].name, 'Yours · it makes a unit of product every hour, twenty at most', 3, 'gold'); closeShop(); }
function startSmuggle() {
  const L = P.lab; if (!L || L.stock < 3 || smugMine()) { SFX.deny(); return; }
  const units = L.stock; L.stock = 0; saveGame(); closeShop();
  if (AUTH()) { if (!EV_START.smug(P, L.site, units, unitVal())) { L.stock = units; note('No van could get to the lab · try again in a moment', 'g'); } } else NET.req('sm', L.site, units, unitVal());
  banner('Smuggling run', units + ' units in the van at the ' + LABS[L.site].name + ' · drive it to the buyer', 3, 'gold');
}
EV_START.smug = (who, site, units, val) => {
  const L = LABS[site]; if (!L || !who) return false; units = clamp(units | 0, 1, LAB.cap);
  const c = spawnCar('van', L.park.x, L.park.z, L.park.yaw, { color: 0x3f4a3a }); if (!c) return false; c.temp = true; c.smug = true;
  const d = dropFar(L.x, L.z); evStart({ k: 'smug', owner: who, units, value: units * (val || LAB.unit), car: c, x: c.x, z: c.z, drop: d, until: G.time + 480, tailT: G.time + 18 }); return true;
};
EV_TICK.smug = E => {
  const c = E.car; if (!c || c.gone || c.wreck || c.burn > 0) return evEnd(E, false, 0, E.owner);
  const dr = c.occ[0], human = !!dr && (dr === P || dr.kind === 'rp'); if (human) { E.x = E.drop.x; E.z = E.drop.z; } else { E.x = c.x; E.z = c.z; }
  if (human && !E.tailed && G.time > E.tailT) { E.tailed = true; const ai = aiCrews(); if (ai.length) spawnHitSquad(dr, ai[(rand() * ai.length) | 0], 3); GAME.ev('st', E.id); }   // word got out: somebody wants the van
  if (human && hyp(c.x - E.drop.x, c.z - E.drop.z) < 11 && carSpeed(c) < 5) { GAME.pay(E.owner, E.value); c.smug = false; return evEnd(E, true, 0, E.owner); }
  if (G.time > E.until) evEnd(E, false, 0, E.owner);
};
function labPrompt() {
  for (let i = 0; i < LABS.length; i++) { const L = LABS[i]; if (hyp(L.x - P.x, L.z - P.z) > 2.4 || Math.abs(P.y - CURB) > 1.2) continue;
    if (P.lab && P.lab.site === i) return { text: '<b>F</b>Your lab · ' + P.lab.stock + ' of ' + labCap() + ' · supplies ' + P.lab.sup + '% · open the books', act: () => { openMenu({ kind: 'phone', title: LABS[i].name, items: labItems, foot: 'A number or a tap · ' + capOf('use') + ' or Esc closes' }); } };
    if (P.lab) return { text: 'You already run the ' + LABS[P.lab.site].name };
    return P.cash >= LAB.price ? { text: '<b>F</b>Set up a lab here · $' + LAB.price.toLocaleString('en-US'), act: () => buyLab(i) } : { text: 'A lab here costs $' + LAB.price.toLocaleString('en-US') }; }
  return null;
}

// --- the phone's pages for these: the heists and their setups, the lab
function jobItems(pg) {
  const busy = heistBusy(), r = P.rank || 1, out = [], cash = n => '$' + n.toLocaleString('en-US');
  if (pg === 'jobs-bank') {
    const m = AUTH() ? prepMask() : (G.prepMask | 0), done = [m & 1, m & 2, m & 4];
    out.push({ label: JOBS.bank.name, sub: 'Setups last the session · loud needs the gear, quiet needs the bank cased · bags only count in the getaway car', off: true, own: true });
    PREP_IDS.forEach((id, i) => { const S = PREPS[id]; out.push(done[i] ? { label: 'Setup · ' + S.name, sub: 'Done', off: true, own: true } : busy ? { label: 'Setup · ' + S.name, sub: busy.k === 'prep' && busy.sub === id ? 'On now' : 'Something else is on', off: true } : { label: 'Setup · ' + S.name, sub: S.how + ' · pays ' + cash(S.pay), act: () => startPrep(id) }); });
    const fin = (quiet, ok, why) => ({ label: quiet ? 'Go in quiet' : 'Go in loud', sub: !ok ? why : quiet ? 'Guns away past the guards, hack the time lock · bags worth 40% more' : 'Alarm, guards and the police from the start · drill the vault', cost: ok ? JOBS.bank.cost : 0, off: !ok, act: ok ? () => startJob('bank', quiet ? 1 : 0) : null });
    if (r < JOBS.bank.rank) out.push({ label: 'The job itself', sub: 'Opens at rank ' + JOBS.bank.rank, off: true, lock: 'Opens at rank ' + JOBS.bank.rank });
    else if (busy) out.push({ label: 'The job itself', sub: busy.k === 'bank' ? 'On now · see the job line at the top' : 'Something else is on', off: true });
    else out.push(fin(false, !!done[1], 'Needs the drill and charges'), fin(true, !!done[2], 'Needs the bank cased'));
    return out.concat([{ label: '‹ Back', act: () => { shopOpen.page = 'jobs'; renderShop(); } }]);
  }
  out.push({ label: JOBS.bank.name + ' ›', sub: (r < JOBS.bank.rank ? 'Opens at rank ' + JOBS.bank.rank + ' · ' : '') + 'Set it up, then in loud or quiet · everyone in the session goes in', act: () => { shopOpen.page = 'jobs-bank'; renderShop(); } });
  const one = (k, sub) => { const J = JOBS[k]; out.push(busy ? { label: J.name, sub: busy.k === k ? 'On now · see the job line at the top' : 'Something else is on', off: true } : J.rank > r ? { label: J.name, sub: 'Opens at rank ' + J.rank, off: true, lock: 'Opens at rank ' + J.rank } : { label: J.name, sub, cost: J.cost, act: () => startJob(k, 0) }); };
  one('cargo', 'Airport cargo yard: crack the gold container under fire, load it into anything you can drive or fly'); one('jewel', 'Smash the cases at ' + (JEWEL ? JEWEL.name : 'the jewelers') + ' · quick and loud');
  return out.concat([back()]);
}
function startJob(k, opt) { const J = JOBS[k]; if (heistBusy() || !payCash(J.cost)) return; closeShop(); if (AUTH()) { if (!EV_START[k](P, opt)) { P.spent -= J.cost; P.cash += J.cost; gain(J.cost); note(J.name + ' is not ready yet · try again later', 'g'); } } else NET.req('hs', k, opt | 0); SFX.tick(); }
function startPrep(id) { if (heistBusy()) return; closeShop(); if (AUTH()) { if (!EV_START.prep(P, id)) note('That setup could not start here · try again in a moment', 'g'); } else NET.req('pr', id); SFX.tick(); }
// the line at the top that says what the job wants now
function jobLine() {
  const mine = q => q.owner === P || q.ref === GAME.ref(P), E = EVTS.find(q => q.k === 'bank' || q.k === 'jewel' || q.k === 'cargo' || q.k === 'prep' || ((q.k === 'smug' || q.k === 'whsl' || q.k === 'sups' || q.k === 'raid') && mine(q)) || q.k === 'cour' || (q.k === 'trade' && (q.seller === P || q.buyer === P))); if (!E) return '';
  const st = E.stage | 0, cash = n => '$' + Math.round(n).toLocaleString('en-US'), carry = P.bag ? ' · you carry ' + cash(P.bag) : '', loaded = E.loaded ? ' · ' + cash(E.loaded) + ' in the car' : '';
  if (E.k === 'whsl') return 'Wholesale · ' + (P.case && P.case.k === 'prod' ? 'take the case to the buyers yourself' : P.case && P.case.k === 'cash' ? 'hold on to the cash' : 'grab the cash case');
  if (E.k === 'cour') return 'Courier · ' + (P.case && P.case.k === 'pkg' ? 'get the package to the buyer' : 'pick up the package');
  if (E.k === 'sups') return 'Supply run · ' + (P.car && P.car.type === 'van' ? 'drive the van to your lab' : 'steal the supply van off the crew');
  if (E.k === 'raid') return 'Lab raid · drop the crew at your lab before they clean you out';
  if (E.k === 'trade') { const o = E.seller === P ? E.buyer : E.seller; return 'Meet ' + nameOf(o) + ' · swap cases · ' + (P.case ? 'yours is in your hand' : 'pick up what they brought'); }
  if (E.k === 'prep') return 'Setup · ' + PREPS[E.sub].name + ' · ' + (E.sub === 'car' ? (P.car && P.car.prep ? 'park it at the getaway spot behind the bank' : 'steal the car the crew is sitting on') : E.sub === 'gear' ? (E.carrier === P ? 'bring the crate to the getaway spot' : 'take the crate off the crew') : 'stand at the marked spots · guns away · ' + [0, 1, 2].filter(i => (E.mask | 0) >> i & 1).length + ' of 3');
  if (E.k === 'bank' || E.k === 'cargo') { const gc = getaway(E), where = E.k === 'bank' ? 'Bank' : 'Cargo';
    if (st === 0) return where + ' · ' + (E.k === 'cargo' ? 'get to the cargo yard at the airport' : E.quiet ? 'walk in quietly · guns away near the guards' : 'get inside Calder Savings');
    if (st === 1 && E.k === 'cargo') return 'Cargo · crack the lock on the end container · hold the yard';
    if (st === 1 && !E.quiet) return 'Bank · hold the vault while the drill runs · ' + Math.round((E.drill === undefined ? (E.prog | 0) / 100 : E.drill) * 100) + '%' + (E.jam ? ' · THE DRILL JAMMED · start it again' : '');
    if (st === 1) return 'Bank · hack the time lock in the back office' + (E.alarm ? ' · the alarm is going' : ' · suspicion ' + Math.round((E.sus === undefined ? (E.prog | 0) / 100 : E.sus) * 100) + '%');
    if (st === 2) return 'Bank · the time lock opens the vault in ' + Math.max(0, Math.ceil(E.lockT !== undefined ? E.lockT - G.time : E.prog | 0)) + 's';
    if (st === 3) return where + ' · bag the money and ' + (gc ? 'load it into the getaway car' : E.k === 'cargo' ? 'carry it to a car or helicopter one of you is driving' : 'carry it out · no getaway car') + carry + loaded;
    return where + ' · lose the police, then take the ' + (gc ? 'getaway car' : 'money') + ' to the drop' + carry + loaded; }
  if (E.k === 'jewel') { const m = E.cases | 0; let n = 0; for (let i = 0; i < 5; i++) if (m >> i & 1) n++; return 'Jewelry store · ' + (st === 1 ? 'smash the cases · ' + n + ' of 5 · ' + cash(E.take || 0) : 'lose the police, then reach the fence · ' + cash(E.take || 0)); }
  return 'Smuggling run · ' + (P.car && P.car.smug ? 'get the van to the buyer' : 'get in the van') + ' · ' + cash((E.units || 0) * LAB.unit);
}
// --- what the jobs say as they go, on every machine
function heistNews(e) {
  const k = e[1], E = EVTS.find(q => q.id === e[2]), money = n => '$' + (n | 0).toLocaleString('en-US');
  if (k === 'hj') { const st = e[3], who = (st === 5 || st === 7) && e[4] ? GAME.unref(e[4]) : null;
    if (st === 1) { banner('The alarm is going', E && E.k === 'bank' && E.quiet ? 'They made you · guards and police coming' : 'Get to the vault and hold it while the drill runs', 3, 'gold'); SFX.star(); }
    else if (st === 2) { banner(E && E.k === 'cargo' ? 'The container is open' : 'The vault is open', 'One bag each · get them to the getaway', 2.8, 'gold'); SFX.cap(true); }
    else if (st === 3) { banner(E && E.k === 'jewel' ? 'Get it to the fence' : 'Get the money to the drop', 'Lose the police first · the drop is on your map', 3, 'gold'); SFX.tick(); }
    else if (st === 4) { banner('You are in', 'Guns away near the guards · the time lock panel is in the back office', 3.2, 'gold'); SFX.tick(); }
    else if (st === 5) { banner('Time lock hacked', 'The vault opens in 20 seconds · stay out of sight', 2.8, 'gold'); SFX.cap(true); }
    else if (st === 6) { banner('The drill jammed', 'Someone at the vault: start it again', 2.4, 'gold'); SFX.deny(); }
    else if (st === 7) note((who ? nameOf(who) : 'Someone') + ' got the drill going again', 'g');
    else if (st === 8) { banner('Silent alarm', 'The bank has called it in · move', 2.6, 'gold'); SFX.star(); }
    else if (st === 9) note('Lose the police before the drop · they followed you here', 'c');
    else if (st === 10) note('Bring the money: it is in the getaway car, or on someone\'s back', 'c');
    else if (st === 11) { const c = carById(e[4]); note('That ' + (c ? c.spec.name : 'ride') + ' is the getaway now · load the gold into it', 'g'); }
    else if (st === 12) { banner('Restricted area', 'Airport police · crack the end container\'s lock', 2.8, 'gold'); SFX.star(); } }
  else if (k === 'lt') { const a = GAME.unref(e[3]); if (a === P) banner('+$' + e[4].toLocaleString('en-US'), 'In the bag · $' + e[5].toLocaleString('en-US') + ' so far', 1.6, 'gold'); else note((a ? nameOf(a) : 'Someone') + ' bagged $' + e[4].toLocaleString('en-US'), 'g'); if (E) E.take = e[5]; SFX.cash(); }
  else if (k === 'js') { const a = GAME.unref(e[4]); if (E) { E.cases |= 1 << e[3]; E.take = e[6]; } if (a === P) banner('+$' + e[5].toLocaleString('en-US'), 'Take so far $' + e[6].toLocaleString('en-US'), 1.4, 'gold'); if (JEWEL && JEWEL.cases[e[3]]) { const c = JEWEL.cases[e[3]]; SFX.crash(c.x, CURB + 1, c.z, 3); } }
  else if (k === 'st') { if (E && (E.owner === P || E.ref === GAME.ref(P))) { banner('They know about the van', 'A crew is coming for it · keep moving', 2.6, 'gold'); SFX.star(); } }
  else if (k === 'bg') { const a = GAME.unref(e[3]); if (a) a.bag = e[4]; if (a === P) { banner('Bag on your back · ' + money(e[4]), 'Slow going · load it into the getaway', 2, 'gold'); SFX.cash(); } else if (a) note(nameOf(a) + ' has a bag', 'g'); }
  else if (k === 'bl') { const a = GAME.unref(e[3]); if (a) a.bag = 0; if (E) E.loaded = e[5]; if (a === P) banner('Loaded · ' + money(e[4]), money(e[5]) + ' in the getaway', 1.8, 'gold'); else note((a ? nameOf(a) : 'Someone') + ' loaded a bag · ' + money(e[5]) + ' in the getaway', 'g'); SFX.tick(); }
  else if (k === 'bd') { const a = GAME.unref(e[3]); if (a) a.bag = 0; note((a === P ? 'You' : a ? nameOf(a) : 'Someone') + ' dropped a bag · pick it up', 'c'); }
  else if (k === 'bx') { banner('The getaway is gone', 'And ' + money(e[3]) + ' with it', 2.8); SFX.deny(); }
  else if (k === 'pp') { G.prepMask = e[3]; }
  else if (k === 'pz') { if (E) E.mask = e[4]; SFX.tick(); note('Spot cased · ' + [0, 1, 2].filter(i => e[4] >> i & 1).length + ' of 3', 'g'); }
}
