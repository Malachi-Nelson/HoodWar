/* =====================================================================
   11c. HEISTS AND THE PRODUCT TRADE — the bank on Calder Avenue and the jewelers in the mall, done by everyone in the session
        together; and a lab of your own whose product you smuggle across town to a buyer. Started from the phone (or the lab's
        own door). The machine that runs the world runs them as events, so they are in everyone's list and on everyone's map.
   ===================================================================== */
const JOBS = { bank: { name: 'Bank job', cost: 2500, rank: 4, cool: 600, bag: 3500 }, jewel: { name: 'Jewelry store', cost: 1000, rank: 2, cool: 420 } };
const LAB = { price: 25000, cap: 20, unit: 600, hour: 100 };   // a lab: what it costs, what it holds, what a unit sells for, seconds to make one
EV_KINDS.push('bank', 'jewel', 'smug');
Object.assign(EV_INFO, {
  bank:  { name: 'Bank job', icon: '$', col: '#ffc83d', hex: 0xffc83d, how: 'Calder Savings: drill the vault, bag the cash, lose the police, reach the drop' },
  jewel: { name: 'Jewelry store', icon: '◇', col: '#9fd0ff', hex: 0x9fd0ff, how: 'Gold Rush Jewelers in the mall: smash the cases and get out' },
  smug:  { name: 'Smuggling run', icon: '▣', col: '#c8ff7d', hex: 0xc8ff7d, how: 'Drive the van to the buyer' },
});
CFG.rp.job.bank = 1000; CFG.rp.job.jewel = 500; CFG.rp.job.smug = 300;
const zoneById = id => ZONES.find(z => z.id === id);
// the drop, or the buyer: somewhere a long way across town from where the job was
function dropFar(x, z) { const all = [CHOP, zoneById('E'), zoneById('J'), zoneById('I'), zoneById('B'), zoneById('A')].filter(Boolean).map(q => ({ x: q.x, z: q.z })), far = all.filter(q => hyp(q.x - x, q.z - z) > 230); const list = far.length ? far : all; return list[(rand() * list.length) | 0]; }
const jobOn = () => EVTS.find(E => E.k === 'bank' || E.k === 'jewel') || null;
G.jobT = {};
// the last leg of a heist: anyone in the crew at the drop, with the police off them, ends it and everyone is paid a share
function dropLeg(E) {
  const hs = humans().filter(h => !h.dead), h = hs.find(q => hyp(q.x - E.x, q.z - E.z) < 10); if (!h) return;
  if (h.heat > 0) { if (G.time - (E.warnT || -9) > 6) { E.warnT = G.time; GAME.ev('hj', E.id, 9); } return; }
  G.jobT[E.k] = G.time + JOBS[E.k].cool; evEnd(E, true, Math.round(E.take / Math.max(1, humans().length) / 10) * 10, h);
}
function jobFail(E) { (E.bags || []).forEach(b => { if (!b.gone) removePickup(b); }); G.jobT[E.k] = G.time + JOBS[E.k].cool / 2; evEnd(E, false); }

// --- the bank: get in and the alarm goes; stand at the vault while the drill runs; bag the cash; get it to the drop clean
EV_START.bank = () => {
  if (!BANK || jobOn() || G.time < (G.jobT.bank || 0)) return false;
  evStart({ k: 'bank', stage: 0, x: BANK.door.x, z: BANK.door.z, until: G.time + 900, drill: 0, take: 0, bags: [], guards: [] }); return true;
};
const inBank = h => !!BANK && h.x > BANK.x0 && h.x < BANK.x1 && h.z > BANK.z0 && h.z < BANK.z1 && h.y < 4;
EV_TICK.bank = E => {
  const hs = humans().filter(h => !h.dead);
  if (E.stage === 0) { if (hs.some(inBank)) { E.stage = 1; E.x = BANK.vault.x; E.z = BANK.vault.z;
      hs.forEach(h => { if (hyp(h.x - BANK.door.x, h.z - BANK.door.z) < 80) GAME.crime(h, 60, 3); });
      for (let k = 0; k < 3; k++) { const g = spawnBot(TEAM_COP, BANK.x0 + 4 + k * 2.6, CURB, BANK.cz + (k - 1) * 3.5, { temp: true, wpn: k === 1 ? 'smg' : 'pistol', name: 'Guard' }); if (g) { g.until = G.time + 400; g.skill = 1.15; g.hp = 130; E.guards.push(g); } }
      GAME.ev('hj', E.id, 1); } }
  else if (E.stage === 1) { const at = hs.filter(h => hyp(h.x - BANK.vault.x, h.z - BANK.vault.z) < 2.8);
    if (at.length) { E.drill = Math.min(1, E.drill + .25 / 45 * (1 + .3 * (at.length - 1))); hs.forEach(h => { if (inBank(h)) GAME.crime(h, 0, 3); }); }
    if (E.drill >= 1) { E.stage = 2; E.x = (BANK.vx + BANK.x1) / 2; E.z = BANK.cz; E.openT = G.time; const n = Math.min(8, 2 + 2 * hs.length);
      for (let k = 0; k < n; k++) { const p = addPickup('loot', BANK.vx + 1.9 + (k % 4) * 1.35, CURB + .25, BANK.cz - 1.3 + Math.floor(k / 4) * 2.6, JOBS.bank.bag / 100); p.ev = E; E.bags.push(p); }
      GAME.ev('hj', E.id, 2); } }
  else if (E.stage === 2) { if (!E.bags.some(b => !b.gone) || (G.time - E.openT > 75 && E.take > 0)) { E.bags.forEach(b => { if (!b.gone) removePickup(b); }); E.stage = 3; const d = dropFar(BANK.door.x, BANK.door.z); E.x = d.x; E.z = d.z; GAME.ev('hj', E.id, 3); } }
  else if (E.stage === 3) dropLeg(E);
  if (G.time > E.until) jobFail(E);
};
GAME.takeLoot = (p, who) => { if (p.gone) return; removePickup(p); const E = p.ev; if (E && !E.over) { E.take += p.amt; GAME.ev('lt', E.id, GAME.ref(who), p.amt, E.take); } };
// the strongroom door: shut and solid until the drill is through, then it swings open
const vaultDoor = (() => { if (!BANK) return null; const g = new T.Group(), m = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, .5, 24), new T.MeshLambertMaterial({ color: 0x9aa2aa })); m.rotation.z = PI / 2; m.position.set(0, 0, 1.15); g.add(m);
  const hub = new T.Mesh(new T.CylinderGeometry(.35, .35, .7, 12), new T.MeshLambertMaterial({ color: 0x6a7078 })); hub.rotation.z = PI / 2; hub.position.set(-.1, 0, 1.15); g.add(hub);
  g.position.set(BANK.vx + .45, CURB + 1.3, BANK.cz - 1.15); scene.add(g); BANK.vbox = solid(BANK.vx, BANK.vx + .9, CURB, CURB + 2.7, BANK.cz - 1.15, BANK.cz + 1.15); return g; })();
let vaultA = 0;
function heistVisuals(dt) {
  if (vaultDoor) { const E = EVTS.find(q => q.k === 'bank'), open = !!E && E.stage >= 2; vaultA = lerp(vaultA, open ? 1.75 : 0, Math.min(1, dt * 1.6)); vaultDoor.rotation.y = -vaultA;
    BANK.vbox.off = vaultA > .6; }   // shut, it is part of the wall
  jewelCases();
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
  L.prog = (L.prog || 0) + Math.max(0, G.time - (L.at === undefined ? G.time : L.at)) / LAB.hour; L.at = G.time;
  while (L.prog >= 1) { L.prog -= 1; if (L.stock < LAB.cap) { L.stock++; if (L.stock === LAB.cap) note('Your lab is full · smuggle the product to get paid', 'g'); } }
}
const smugMine = () => EVTS.find(E => E.k === 'smug' && (E.owner === P || E.ref === GAME.ref(P))) || null;
function buyLab(i) { if (P.lab || !LABS[i] || !payCash(LAB.price)) return; P.lab = { site: i, stock: 0, prog: 0, at: G.time }; addRP(CFG.rp.buy * 2); saveGame(); SFX.buy(); banner(LABS[i].name, 'Yours · it makes a unit of product every hour, twenty at most', 3, 'gold'); closeShop(); }
function startSmuggle() {
  const L = P.lab; if (!L || L.stock < 3 || smugMine()) { SFX.deny(); return; }
  const units = L.stock; L.stock = 0; L.prog = 0; saveGame(); closeShop();
  if (AUTH()) { if (!EV_START.smug(P, L.site, units)) { L.stock = units; note('No van could get to the lab · try again in a moment', 'g'); } } else NET.req('sm', L.site, units);
  banner('Smuggling run', units + ' units in the van at the ' + LABS[L.site].name + ' · drive it to the buyer', 3, 'gold');
}
EV_START.smug = (who, site, units) => {
  const L = LABS[site]; if (!L || !who) return false; units = clamp(units | 0, 1, LAB.cap);
  const c = spawnCar('van', L.park.x, L.park.z, L.park.yaw, { color: 0x3f4a3a }); if (!c) return false; c.temp = true; c.smug = true;
  const d = dropFar(L.x, L.z); evStart({ k: 'smug', owner: who, units, value: units * LAB.unit, car: c, x: c.x, z: c.z, drop: d, until: G.time + 480, tailT: G.time + 18 }); return true;
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
    if (P.lab && P.lab.site === i) return P.lab.stock >= 3 && !smugMine() ? { text: '<b>F</b>Your lab · ' + P.lab.stock + ' of ' + LAB.cap + ' · smuggle it for $' + (P.lab.stock * LAB.unit).toLocaleString('en-US'), act: startSmuggle } : { text: 'Your lab · ' + P.lab.stock + ' of ' + LAB.cap + (smugMine() ? ' · a run is on' : ' · needs three units for a run') };
    if (P.lab) return { text: 'You already run the ' + LABS[P.lab.site].name };
    return P.cash >= LAB.price ? { text: '<b>F</b>Set up a lab here · $' + LAB.price.toLocaleString('en-US'), act: () => buyLab(i) } : { text: 'A lab here costs $' + LAB.price.toLocaleString('en-US') }; }
  return null;
}

// --- the phone's pages for these: jobs to start, the lab
function jobItems() {
  const on = jobOn(), out = [];
  Object.keys(JOBS).forEach(k => { const J = JOBS[k];
    out.push(on ? { label: J.name, sub: on.k === k ? 'On now · see the job line at the top' : 'Another job is on', off: true } : J.rank > (P.rank || 1) ? { label: J.name, sub: 'Opens at rank ' + J.rank, off: true, lock: 'Opens at rank ' + J.rank }
      : { label: J.name, sub: (k === 'bank' ? 'Drill the vault at Calder Savings · everyone in the session goes in' : 'Smash the cases at ' + (JOBS && JEWEL ? JEWEL.name : 'the jewelers') + ' · quick and loud') + ' · setup', cost: J.cost, act: () => startJob(k) }); });
  return out.concat([back()]);
}
function startJob(k) { const J = JOBS[k]; if (jobOn() || !payCash(J.cost)) return; closeShop(); if (AUTH()) { if (!EV_START[k]()) { P.spent -= J.cost; P.cash += J.cost; gain(J.cost); note(J.name + ' is not ready yet · try again later', 'g'); } } else NET.req('hs', k); SFX.tick(); }
function labItems() {
  if (!P.lab) return LABS.map((L, i) => ({ label: L.name, sub: 'Set up a lab here: it makes product you smuggle to a buyer', cost: LAB.price, act: () => buyLab(i) })).concat([back()]);
  const L = P.lab, run = smugMine();
  return [{ label: LABS[L.site].name, sub: L.stock + ' of ' + LAB.cap + ' units · worth $' + (L.stock * LAB.unit).toLocaleString('en-US') + ' · makes one every hour', off: true, own: true },
    run ? { label: 'Smuggle', sub: 'A run is on now', off: true } : L.stock < 3 ? { label: 'Smuggle', sub: 'Needs three units at least', off: true } : { label: 'Smuggle the product', sub: 'A van at the lab takes it across town to a buyer', act: startSmuggle }, back()];
}
// the line at the top that says what the job wants now
function jobLine() {
  const E = EVTS.find(q => q.k === 'bank' || q.k === 'jewel' || (q.k === 'smug' && (q.owner === P || q.ref === GAME.ref(P)))); if (!E) return '';
  const st = E.stage | 0, cash = n => '$' + Math.round(n).toLocaleString('en-US');
  if (E.k === 'bank') return 'Bank job · ' + (st === 0 ? 'get inside Calder Savings' : st === 1 ? 'hold the vault while the drill runs · ' + Math.round((E.drill === undefined ? (E.aux | 0) / 100 : E.drill) * 100) + '%' : st === 2 ? 'bag the cash · ' + cash(E.take === undefined ? (E.aux | 0) * 100 : E.take) : 'lose the police, then reach the drop');
  if (E.k === 'jewel') { const m = E.cases | 0; let n = 0; for (let i = 0; i < 5; i++) if (m >> i & 1) n++; return 'Jewelry store · ' + (st === 1 ? 'smash the cases · ' + n + ' of 5 · ' + cash(E.take || 0) : 'lose the police, then reach the fence · ' + cash(E.take || 0)); }
  return 'Smuggling run · ' + (P.car && P.car.smug ? 'get the van to the buyer' : 'get in the van') + ' · ' + cash((E.units || 0) * LAB.unit);
}
// --- what the jobs say as they go, on every machine
function heistNews(e) {
  const k = e[1], E = EVTS.find(q => q.id === e[2]);
  if (k === 'hj') { const st = e[3];
    if (st === 1) { banner('The alarm is going', 'Get to the vault and hold it while the drill runs', 3, 'gold'); SFX.star(); }
    else if (st === 2) { banner('The vault is open', 'Bag the cash · a few seconds each', 2.8, 'gold'); SFX.cap(true); }
    else if (st === 3) { banner(E && E.k === 'jewel' ? 'Get it to the fence' : 'Get the money to the drop', 'Lose the police first · the drop is on your map', 3, 'gold'); SFX.tick(); }
    else if (st === 9) note('Lose the police before the drop · they followed you here', 'c'); }
  else if (k === 'lt') { const a = GAME.unref(e[3]); if (a === P) banner('+$' + e[4].toLocaleString('en-US'), 'In the bag · $' + e[5].toLocaleString('en-US') + ' so far', 1.6, 'gold'); else note((a ? nameOf(a) : 'Someone') + ' bagged $' + e[4].toLocaleString('en-US'), 'g'); if (E) E.take = e[5]; SFX.cash(); }
  else if (k === 'js') { const a = GAME.unref(e[4]); if (E) { E.cases |= 1 << e[3]; E.take = e[6]; } if (a === P) banner('+$' + e[5].toLocaleString('en-US'), 'Take so far $' + e[6].toLocaleString('en-US'), 1.4, 'gold'); if (JEWEL && JEWEL.cases[e[3]]) { const c = JEWEL.cases[e[3]]; SFX.crash(c.x, CURB + 1, c.z, 3); } }
  else if (k === 'st') { if (E && (E.owner === P || E.ref === GAME.ref(P))) { banner('They know about the van', 'A crew is coming for it · keep moving', 2.6, 'gold'); SFX.star(); } }
}
