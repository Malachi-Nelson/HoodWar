/* =====================================================================
   11b. EVENTS — jobs that turn up around the city for whoever is near: an armored truck on its round, a rival lieutenant
        out in the open, a crew coming for your turf, a car the chop shop wants, a stash left lightly guarded, a street race.
        The machine that runs the world starts and ends them and pays for them; everyone sees them on the map.
   ===================================================================== */
const EV_KINDS = ['truck', 'hit', 'war', 'chop', 'stash', 'race'];
const EV_INFO = {
  truck: { name: 'Armored truck', icon: '$', col: '#8fe36b', hex: 0x8fe36b, how: 'Shoot it to a stop, grab the cash' },
  hit:   { name: 'Hit', icon: '✖', col: '#ff6a5a', hex: 0xff6a5a, how: 'Take out the lieutenant' },
  war:   { name: 'Hood war', icon: '!', col: '#ffc83d', hex: 0xffc83d, how: 'Defend your turf' },
  chop:  { name: 'Chop shop', icon: '⚙', col: '#9fd0e8', hex: 0x9fd0e8, how: 'Steal the car, bring it to Calder Auto Body' },
  stash: { name: 'Stash run', icon: '◆', col: '#e8b8ff', hex: 0xe8b8ff, how: 'Grab the stash, bring it to your yard' },
  race:  { name: 'Street race', icon: '⚑', col: '#f2efe6', hex: 0xf2efe6, how: 'Drive into the ring to start' },
};
const EVTS = []; let evtSeq = 0;
const CHOP = GARAGES.find(g => g.team === undefined) || GARAGES[0];
const EV_START = {}, EV_TICK = {};
const someHuman = () => { const hs = humans().filter(a => !a.dead); return hs.length ? hs[(rand() * hs.length) | 0] : P; };
const areaName = (x, z) => AREAS[clamp(Math.floor((z - EDGE) / PZ), 0, NZ - 1)][clamp(Math.floor((x - EDGE) / PX), 0, NX - 1)];
// a crossing between d0 and d1 metres from `a` that no player is within `clear` of
function xingNear(a, d0, d1, clear) { let best = null, bs = -1e9; for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const x = RX(i), z = RZ(j), d = hyp(x - a.x, z - a.z); if (d < d0 || d > d1 || nearHuman(x, z) < clear) continue; const sc = rand() * 50 - Math.abs(d - (d0 + d1) / 2); if (sc > bs) { bs = sc; best = [i, j]; } } return best; }
// a lane leaving crossing ij, pointing at `toward` if given; the spot is left in _lp
function laneFrom(ij, toward) { const dirs = GRID4.filter(g => ij[0] + g[0] >= 0 && ij[0] + g[0] <= NX && ij[1] + g[1] >= 0 && ij[1] + g[1] <= NZ), dist = g => hyp(RX(ij[0] + g[0]) - toward.x, RZ(ij[1] + g[1]) - toward.z), dir = toward ? dirs.sort((p, q) => dist(p) - dist(q))[0] : dirs[(rand() * dirs.length) | 0]; lanePoint(ij, [ij[0] + dir[0], ij[1] + dir[1]], 14, LANE, _lp); return dir; }
// a spot to stand in a neighbourhood some other crew runs, a fair way from every player
function rivalSpot(a, kinds) { let best = null, bs = -1e9; for (let k = 0; k < 50; k++) { const p = SPOTS[(rand() * SPOTS.length) | 0]; if (p.hood < 0 || !kinds.includes(p.k)) continue; const t = ZS[p.hood].owner; if (t < 0 || t === G.crew) continue; const d = hyp(p.x - a.x, p.z - a.z); if (d < 120 || d > 300 || nearHuman(p.x, p.z) < 90 || p.who.some(w => w)) continue; const sc = rand() * 40 - Math.abs(d - 200); if (sc > bs) { bs = sc; best = p; } } return best; }
// a few of the crew's people standing about a spot, for a lieutenant or a stash
function guardsAt(p, t, n) { const out = []; for (let k = 0; k < n; k++) { const q = freeSlot(p), g = spawnBot(t, p.x + rs(3), p.y, p.z + rs(3), { temp: true, wpn: pick(rand, BOT_GUNS) }); if (!g) break; g.street = true; g.home = p; g.until = 1e9; g.skill = 1.1; g.guardOf = true; if (q >= 0) takeSpot(g, p, q); out.push(g); } return out; }
function evStart(E) { E.id = ++evtSeq; E.t0 = G.time; EVTS.push(E); GAME.ev('en', E.id, EV_KINDS.indexOf(E.k), Math.round(E.x), Math.round(E.z), E.team === undefined ? -1 : E.team, E.zone === undefined ? -1 : E.zone); return E; }
function evEnd(E, ok, amt, who) {
  const i = EVTS.indexOf(E); if (i < 0) return; EVTS.splice(i, 1); E.over = true;
  if (ok && amt) humans().forEach(a => GAME.pay(a, amt));                                               // in co-op the whole crew is paid
  if (ok) humans().forEach(a => GAME.rp(a, CFG.rp.job[E.k] || 150));
  (E.guards || []).forEach(g => { g.guardOf = false; g.until = G.time + 30; });
  GAME.ev('ed', E.id, EV_KINDS.indexOf(E.k), ok ? 1 : 0, amt | 0, GAME.ref(who), E.team === undefined ? -1 : E.team, E.zone === undefined ? -1 : E.zone);
}
function resetEvents() { EVTS.length = 0; RACE.on = false; evMarks.forEach(m => { m.g.visible = false; m.id = 0; }); }
function updateEvents() {   // four times a second, on the machine that runs the world
  for (let i = EVTS.length - 1; i >= 0; i--) EV_TICK[EVTS[i].k](EVTS[i]);
  if (G.phase !== 'play' || G.time < G.evT) return;
  if (EVTS.length >= (humans().length >= 3 ? 3 : 2)) { G.evT = G.time + 10; return; }
  const k = pickJob(); G.evT = G.time + (k && EV_START[k]() ? 50 + rand() * 40 : 8);
}
function pickJob() {   // which kind of job turns up next: any kind not already running, a hood war only when the crew has turf to lose
  const own = ZS.filter(s => s.owner === G.crew).length, w = { truck: 2, hit: 2, war: own ? 1.6 : 0, chop: 2, stash: 1.6, race: 1.4 };
  EVTS.forEach(E => { w[E.k] = 0; });
  let tot = 0; for (const q in w) tot += w[q]; if (tot <= 0) return null; let r = rand() * tot; for (const q in w) { r -= w[q]; if (r <= 0 && w[q] > 0) return q; }
  return null;
}
// work on request, from the phone: tried a few times, since a job needs somewhere suitable to happen
GAME.forceJob = () => { if (EVTS.length >= 4 || G.phase !== 'play') return false; for (let k = 0; k < 4; k++) { const j = pickJob(); if (j && EV_START[j]()) return true; } return false; };

// --- an armored truck on its round with two guards. Shoot it until the back gives, then pick the cash up off the road.
EV_START.truck = () => {
  const a = someHuman(), ij = xingNear(a, 140, 280, 100); if (!ij || cars.length > CAR_MAX - 4) return false;
  const dir = laneFrom(ij, null); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 9)) return false;
  const c = spawnCar('van', _lp.x, _lp.z, yawOf(dir[0], dir[1]), { color: 0x34503f }); if (!c) return false; c.temp = true; c.armored = true;
  ['smg', 'shotgun'].forEach((w, k) => { const b = spawnBot(TEAM_COP, _lp.x, 0, _lp.z, { temp: true, wpn: w, name: 'Guard' }); if (!b) return; b.car = c; b.seat = k; c.occ[k] = b; b.unit = c; b.until = 1e9; b.skill = 1; b.guard = true; });   // guards ride the round; they do not join chases
  if (!c.occ[0]) { for (let k = 1; k < 4; k++) if (c.occ[k]) removeBot(c.occ[k]); removeCar(c); return false; }
  const A = aiStart(c, 'traffic'); A.cruise = 10; c.vx = dir[0] * 8; c.vz = dir[1] * 8;
  c.ev = evStart({ k: 'truck', car: c, x: c.x, z: c.z, until: G.time + 170, cash: [] }); return true;
};
GAME.truckOpen = (c, src) => {
  if (c.opened) return; c.opened = true; const E = c.ev, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
  c.ai = null; c.inp.thr = 0; c.inp.steer = 0; c.inp.hb = true;
  for (let k = 0; k < 4; k++) { const o = c.occ[k]; if (o && o.kind === 'bot') botExit(o, false); }
  const bags = [];
  for (let k = 0; k < 4; k++) { const back = c.spec.len / 2 + 1 + k * .7, side = (k % 2 ? 1 : -1) * (.5 + rand() * .6), x = c.x - fx * back + rx * side, z = c.z - fz * back + rz * side, p = addPickup('cash', x, groundAt(x, z, c.y + .6, 'p'), z, 2 + ((rand() * 3) | 0)); p.t = 90; bags.push(p); }
  if (src && src.kind !== 'bot') GAME.crime(src, 25, 2);
  if (E && !E.over) { E.open = true; E.by = src; E.cash = bags; E.until = G.time + 80; GAME.ev('eo', E.id); }
};
EV_TICK.truck = E => {
  const c = E.car;
  if (!E.open) { if (c.gone) return evEnd(E, false); E.x = c.x; E.z = c.z; if (G.time > E.until && nearHuman(c.x, c.z) > 90) { for (let k = 0; k < 4; k++) if (c.occ[k] && c.occ[k].kind === 'bot') removeBot(c.occ[k]); removeCar(c); evEnd(E, false); } return; }
  E.cash = E.cash.filter(p => !p.gone); if (E.cash.length) { E.x = E.cash[0].x; E.z = E.cash[0].z; }
  if (!E.cash.length || G.time > E.until) { E.cash.forEach(removePickup); evEnd(E, true, 0, E.by); }                     // the cash is paid as it is picked up
};

// --- a lieutenant of another crew, out on one of its corners with three of his people
EV_START.hit = () => {
  const p = rivalSpot(someHuman(), ['hang', 'dance', 'hoop']); if (!p) return false; const t = ZS[p.hood].owner;
  const boss = spawnBot(t, p.x, p.y, p.z, { temp: true, wpn: pick(rand, ['rifle', 'shotgun', 'smg']), name: 'Lt. ' + pick(rand, HANDLES) }); if (!boss) return false;
  boss.hp = 300; boss.skill = 1.4; boss.street = true; boss.home = p; boss.until = 1e9; takeSpot(boss, p, freeSlot(p));
  const E = evStart({ k: 'hit', boss, guards: guardsAt(p, t, 3), team: t, zone: p.hood, x: p.x, z: p.z, until: G.time + 260 }); boss.boss = E; return true;
};
GAME.bossDown = (v, k) => {
  const E = v.boss, human = !!k && (k === P || k.kind === 'rp');
  if (human) { GAME.hurtHood(E.zone, k, 25); GAME.notor(k, E.team, 25); }
  evEnd(E, human, human ? CFG.ev.hit : 0, k);
};
EV_TICK.hit = E => {
  const b = E.boss; if (b.gone && !E.over) return evEnd(E, false); if (b.dead) return;
  E.x = b.x; E.z = b.z;
  if (G.time > E.until && nearHuman(b.x, b.z) > 80) { b.boss = null; b.until = 0; evEnd(E, false); }
};

// --- a hood war: another crew drives two carloads at one of your neighbourhoods. Kill them all, or hold out until they give up.
EV_START.war = () => {
  const mine = []; ZS.forEach((s, i) => { if (s.owner === G.crew && !s.hot) mine.push(i); }); if (!mine.length) return false;
  const a = someHuman(); mine.sort((p, q) => hyp(ZONES[p].x - a.x, ZONES[p].z - a.z) - hyp(ZONES[q].x - a.x, ZONES[q].z - a.z));
  const zi = rand() < .7 ? mine[0] : mine[(rand() * mine.length) | 0], z = ZONES[zi], rivals = CREWS.map((c, t) => t).filter(t => t !== G.crew), t = rivals[(rand() * rivals.length) | 0];
  const E = { k: 'war', zone: zi, team: t, x: z.x, z: z.z, until: G.time + 210, bots: [] };
  for (let n = 0; n < 2; n++) { const ij = xingNear(z, 150, 280, 90); if (!ij) continue; const dir = laneFrom(ij, z); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 9)) continue;
    const c = spawnCar(CREW_CARS[n % 3], _lp.x, _lp.z, yawOf(dir[0], dir[1]), { color: CREW_PAINT[t], team: t }); if (!c) continue; c.temp = true;
    ['rifle', 'smg', 'shotgun', 'smg'].slice(0, c.spec.seats).forEach((w, k) => { const b = spawnBot(t, _lp.x, 0, _lp.z, { temp: true, wpn: w }); if (!b) return; b.car = c; b.seat = k; c.occ[k] = b; b.until = G.time + 280; b.skill = 1.15; b.goal = { zone: zi, team: t }; b.goalT = 1e9; b.war = E; E.bots.push(b); });
    if (!c.occ[0]) { for (let k = 1; k < 4; k++) if (c.occ[k]) removeBot(c.occ[k]); removeCar(c); continue; }
    const A = aiStart(c, 'crew', xingOf(z.x, z.z)); A.zone = zi; c.vx = dir[0] * 9; c.vz = dir[1] * 9; }
  if (E.bots.length < 3) { E.bots.forEach(b => { const c = b.car; removeBot(b); if (c && !c.occ.some(o => o)) removeCar(c); }); return false; }
  evStart(E); return true;
};
EV_TICK.war = E => {
  const s = ZS[E.zone], live = E.bots.filter(b => !b.dead && !b.gone);
  if (s.owner !== G.crew) return evEnd(E, false);
  if (!live.length) { s.ctrl = Math.min(100, s.ctrl + 40); return evEnd(E, true, CFG.ev.war); }
  if (G.time > E.until) { live.forEach(b => { b.until = G.time; b.goal = null; b.goalT = 0; b.war = null; }); return evEnd(E, true, CFG.ev.warHalf); }
};

// --- the chop shop wants a particular car: it is parked somewhere across town
EV_START.chop = () => {
  if (!CHOP || cars.length > CAR_MAX - 3) return false; const a = someHuman(), street = PARK.filter(s => !s.lot); let best = null, bs = -1e9;
  for (let k = 0; k < 50; k++) { const s = street[(rand() * street.length) | 0], d = hyp(s.x - a.x, s.z - a.z); if (d < 140 || d > 320 || nearHuman(s.x, s.z) < 80 || hyp(s.x - CHOP.x, s.z - CHOP.z) < 150 || cars.some(c => hyp(c.x - s.x, c.z - s.z) < 7)) continue; const sc = rand() * 40 - Math.abs(d - 220); if (sc > bs) { bs = sc; best = s; } }
  if (!best) return false;
  const c = spawnCar(pick(rand, ['sport', 'lowrider', 'coupe', 'suv', 'pickup']), best.x, best.z, best.yaw, { color: pick(rand, PAINTS) }); if (!c) return false; c.asleep = true;
  c.chop = evStart({ k: 'chop', car: c, x: c.x, z: c.z, until: G.time + 320, held: '' }); return true;
};
EV_TICK.chop = E => {
  const c = E.car; if (c.gone || c.wreck || c.burn > 0) return evEnd(E, false);
  const dr = c.occ[0], human = !!dr && (dr === P || dr.kind === 'rp'); E.x = human ? CHOP.x : c.x; E.z = human ? CHOP.z : c.z; E.held = human ? GAME.ref(dr) : '';
  if (human && hyp(c.x - CHOP.x, c.z - CHOP.z) < 5.5 && carSpeed(c) < 3) {
    const amt = Math.round(lerp(CFG.ev.chop[0], CFG.ev.chop[1], clamp(c.hp / c.spec.hp, 0, 1)) / 10) * 10; evEnd(E, true, amt, dr);
    if (P.car === c) GAME.leaveCar(false); for (let k = 0; k < 4; k++) { const o = c.occ[k]; if (!o) continue; if (o.kind === 'bot') removeBot(o); else { c.occ[k] = null; o.car = null; } } removeCar(c); return; }
  if (G.time > E.until && !human) { if (nearHuman(c.x, c.z) > 80) removeCar(c); else c.chop = null; evEnd(E, false); }
};

// --- a stash a crew has left on one of its corners with two or three people watching it: carry it home to your yard
EV_START.stash = () => {
  const p = rivalSpot(someHuman(), ['hang']); if (!p) return false; const t = ZS[p.hood].owner;
  const bag = addPickup('bag', p.x, groundAt(p.x, p.z, p.y + .5, 'p'), p.z, t);
  const E = evStart({ k: 'stash', team: t, zone: p.hood, bag, guards: guardsAt(p, t, 3), carrier: null, x: p.x, z: p.z, until: G.time + 330 }); bag.ev = E; return true;
};
GAME.takeBag = (p, who) => { if (p.gone) return; const E = p.ev; removePickup(p); if (!E || E.over) return; E.carrier = who; E.bag = null; GAME.notor(who, E.team, 20); GAME.ev('sc', E.id, GAME.ref(who)); };
const yardOf = () => SPAWNS[G.crew][0];
EV_TICK.stash = E => {
  const c = E.carrier;
  if (c) { if (c.gone || c.dead) { const b = addPickup('bag', c.x, groundAt(c.x, c.z, c.y + .5, 'p'), c.z, E.team); b.ev = E; E.bag = b; E.carrier = null; GAME.ev('sd', E.id); return; }
    const y = yardOf(); E.x = y.x; E.z = y.z; if (hyp(c.x - y.x, c.z - y.z) < 9) { GAME.hurtHood(E.zone, c, 20); return evEnd(E, true, CFG.ev.stash, c); } return; }
  if (E.bag && !E.bag.gone) { E.x = E.bag.x; E.z = E.bag.z; }
  if (G.time > E.until) { if (E.bag) removePickup(E.bag); evEnd(E, false); }
};

// --- a street race: a ring at a crossing. Drive into it and a run of checkpoints opens up on your own screen.
EV_START.race = () => { const ij = xingNear(someHuman(), 60, 210, 40); if (!ij) return false; evStart({ k: 'race', x: RX(ij[0]), z: RZ(ij[1]), ij, until: G.time + 200 }); return true; };
EV_TICK.race = E => { if (G.time > E.until) evEnd(E, true, 0, null); };
const RACE = { on: false, cps: [], i: 0, left: 0, out: 0, coolT: 0 };
function startRace(E) {
  const ij = E.ij, route = []; let cur = [ij[0], ij[1]], prev = null; const seen = new Set([cur.join()]);
  for (let k = 0; k < 7; k++) { const opts = GRID4.map(g => [cur[0] + g[0], cur[1] + g[1], prev && g[0] === cur[0] - prev[0] && g[1] === cur[1] - prev[1]]).filter(q => q[0] >= 0 && q[0] <= NX && q[1] >= 0 && q[1] <= NZ && !seen.has(q[0] + ',' + q[1])); if (!opts.length) break;
    let tot = 0; opts.forEach(o => tot += o[2] ? 2.5 : 1); let r = rand() * tot, nx = opts[0]; for (const o of opts) { r -= o[2] ? 2.5 : 1; if (r <= 0) { nx = o; break; } }
    route.push([RX(nx[0]), RZ(nx[1])]); seen.add(nx[0] + ',' + nx[1]); prev = cur; cur = [nx[0], nx[1]]; }
  if (route.length < 4) return;
  let len = hyp(route[0][0] - E.x, route[0][1] - E.z); for (let k = 1; k < route.length; k++) len += hyp(route[k][0] - route[k - 1][0], route[k][1] - route[k - 1][1]);
  Object.assign(RACE, { on: true, cps: route, i: 0, left: len / 18 + 12, out: 0 }); banner('Street race', 'Every checkpoint in ' + Math.round(RACE.left) + ' seconds', 2.6, 'gold'); SFX.streak();
}
function endRace(ok, why) { RACE.on = false; RACE.coolT = G.time + 8; if (ok) { const amt = CFG.ev.race; P.earn += amt; gain(amt); addRP(CFG.rp.job.race); banner('Race won', '+$' + amt, 2.6, 'gold'); SFX.streak(); } else { banner('Race over', why, 2.2); SFX.deny(); } }
function updateRace(dt) {   // on every machine, for its own player
  if (!RACE.on) { if (!P.car || P.seat !== 0 || P.dead || G.time < RACE.coolT) return; for (const E of EVTS) if (E.k === 'race' && E.ij && hyp(P.car.x - E.x, P.car.z - E.z) < 8) { startRace(E); break; } return; }
  RACE.left -= dt; if (P.dead) return endRace(false, 'Wasted');
  if (!P.car) { RACE.out += dt; if (RACE.out > 6) return endRace(false, 'You left the car'); } else RACE.out = 0;
  if (RACE.left <= 0) return endRace(false, 'Out of time');
  const cp = RACE.cps[RACE.i], px = P.car ? P.car.x : P.x, pz = P.car ? P.car.z : P.z;
  if (hyp(px - cp[0], pz - cp[1]) < 9) { RACE.i++; SFX.tick(); if (RACE.i >= RACE.cps.length) endRace(true); else SFX.cash(); }
}

// --- news of events, on every machine
function evNews(e, mine) {
  const k = e[1], kind = EV_KINDS[e[3]], I = EV_INFO[kind];
  if (k === 'en') { const team = e[6], zi = e[7];
    if (kind === 'war') { banner('Hood war', CREWS[team].name + ' is coming for ' + ZONES[zi].name + ' · defend it', 3.4, 't' + team); SFX.star(); }
    else note(I.name + ' · ' + areaName(e[4], e[5]) + ' · ' + I.how, 'g'); }
  else if (k === 'ed') { const ok = e[4], amt = e[5], who = GAME.unref(e[6]), team = e[7], zi = e[8];
    if (kind === 'race') return;
    if (ok && amt) banner(kind === 'war' ? 'Turf defended' : kind === 'hit' ? 'Hit done' : kind === 'chop' ? 'Car delivered' : kind === 'stash' ? 'Stash delivered' : I.name, '+$' + amt + (who && who !== P && who.name ? ' · ' + who.name : ''), 2.6, 'gold');
    else if (ok && kind === 'truck') note('Armored truck · done', 'g');
    else note(kind === 'war' ? CREWS[team].name + ' took ' + ZONES[zi].name : kind === 'hit' ? (who ? 'Somebody else got the lieutenant' : 'The lieutenant slipped away') : kind === 'truck' ? 'The armored truck got away' : kind === 'chop' ? 'The chop shop car is gone' : I.name + ' · missed', 'c'); }
  else if (k === 'eo') note('Armored truck stopped · grab the cash', 'g');
  else if (k === 'sc') { const a = GAME.unref(e[3]); if (a === P) banner('Stash grabbed', 'Get it to your yard', 2.6, 'gold'); else if (a) note(nameOf(a) + ' has the stash', 'g'); }
  else if (k === 'sd') note('The stash was dropped', 'c');
}
// --- what the host says about its events, and what a joined player makes of it
const evWire = () => EVTS.map(E => [E.id, EV_KINDS.indexOf(E.k), Math.round(E.x), Math.round(E.z), Math.max(0, Math.round(E.until - G.time)),
  E.k === 'truck' || E.k === 'chop' ? E.car.id : E.k === 'hit' ? E.boss.id : E.k === 'war' ? E.zone : E.k === 'stash' ? (E.carrier ? GAME.ref(E.carrier) : '') : E.ij[0] * 16 + E.ij[1],
  E.k === 'truck' ? (E.open ? 1 : 0) : E.k === 'chop' ? E.held : E.team === undefined ? -1 : E.team]);
function evFromHost(list) {
  const was = {}; EVTS.forEach(E => { was[E.id] = E; }); EVTS.length = 0;
  (list || []).forEach(q => { const k = EV_KINDS[q[1]]; if (!k) return; const E = was[q[0]] || { id: q[0], k }; Object.assign(E, { x: q[2], z: q[3], until: G.time + q[4], ref: q[5], aux: q[6] });
    if (k === 'race') E.ij = [q[5] >> 4, q[5] & 15]; if (k === 'stash') E.carrier = q[5] ? GAME.unref(q[5]) : null; if (k === 'truck') E.open = !!q[6]; if (k === 'chop') E.held = q[6]; if (k === 'war') { E.zone = q[5]; E.team = q[6]; } else E.team = q[6]; EVTS.push(E); });
}
// where an event's marker belongs on this machine: on the thing itself when it can be seen, else where the host says
function evSpot(E, o) {
  o.x = E.x; o.z = E.z; o.y = CURB;
  const ref = E.ref !== undefined ? E.ref : E.k === 'truck' || E.k === 'chop' ? E.car.id : E.k === 'hit' ? E.boss.id : null;
  if ((E.k === 'truck' && !E.open) || (E.k === 'chop' && !E.held)) { const c = carById(ref); if (c) { o.x = c.x; o.z = c.z; o.y = c.y; } }
  else if (E.k === 'hit') { const b = botById(ref); if (b && !b.dead) { o.x = b.x; o.z = b.z; o.y = b.y; } }
  return o;
}
const evMine = E => (E.k === 'stash' && E.carrier === P) || (E.k === 'chop' && P.car && (E.car ? E.car === P.car : P.car.id === E.ref));
// --- markers: a tall beam in the event's colour with its sign floating above, and the race's checkpoints as rings on the road
const evMarks = [0, 1, 2, 3].map(() => { const g = new T.Group(), bm = new T.Mesh(new T.CylinderGeometry(.55, .55, 60, 8, 1, true), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); bm.position.y = 30; g.add(bm);
  const cv = texCanvas(128), sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false, fog: false })); sp.renderOrder = 8; g.add(sp); g.visible = false; scene.add(g); return { g, bm, sp, cv, id: 0, kind: '', x: 0, z: 0 }; });
function evIcon(m, kind) { const I = EV_INFO[kind], x = m.cv.getContext('2d'); x.clearRect(0, 0, 128, 128); x.beginPath(); x.arc(64, 64, 52, 0, TAU); x.fillStyle = 'rgba(14,16,20,.82)'; x.fill(); x.lineWidth = 8; x.strokeStyle = I.col; x.stroke(); x.fillStyle = I.col; x.font = '700 64px "Saira Condensed", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(I.icon, 64, 68); m.sp.material.map.needsUpdate = true; m.bm.material.color.setHex(I.hex); m.kind = kind; }
const raceRing = (() => { const g = new T.RingGeometry(5.2, 6.2, 40); g.rotateX(-PI / 2); return [0, 1].map(k => { const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: k ? 0xf2efe6 : 0xffc83d, transparent: true, opacity: k ? .35 : .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); const b = new T.Mesh(new T.CylinderGeometry(5.6, 5.6, 7, 28, 1, true), new T.MeshBasicMaterial({ color: k ? 0xf2efe6 : 0xffc83d, transparent: true, opacity: k ? .07 : .16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); b.position.y = 3.5; m.add(b); m.visible = false; scene.add(m); return m; }); })();
const _es = { x: 0, y: 0, z: 0 };
function updateEventMarks(dt) {
  const list = G.state === 'menu' ? [] : EVTS.filter(E => !(E.k === 'race' && RACE.on));
  evMarks.forEach((m, i) => { const E = list[i]; if (!E) { m.g.visible = false; m.id = 0; return; }
    evSpot(E, _es); if (m.id !== E.id) { m.id = E.id; m.x = _es.x; m.z = _es.z; evIcon(m, E.k); } else { const k = Math.min(1, dt * 6); m.x = lerp(m.x, _es.x, k); m.z = lerp(m.z, _es.z, k); }
    m.g.visible = true; m.g.position.set(m.x, _es.y, m.z); const d = hyp(m.x - camera.position.x, m.z - camera.position.z); m.sp.position.y = 6 + Math.min(16, d * .04); m.sp.scale.setScalar(clamp(d * .055, 2.4, 18)); m.bm.material.opacity = .14 + .08 * Math.sin(G.time * 4 + i); });
  raceRing.forEach((r, k) => { const cp = RACE.on ? RACE.cps[RACE.i + k] : null; r.visible = !!cp; if (cp) { r.position.set(cp[0], .08, cp[1]); r.rotation.y += dt * (k ? .3 : .8); } });
}
