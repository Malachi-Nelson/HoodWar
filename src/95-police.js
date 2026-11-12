/* =====================================================================
   10b. THE LAW — what a player does builds heat, heat becomes stars, stars bring cruisers, and staying out of
        sight shakes them. All of it runs on the machine that runs the world; everyone else is told their stars.
   ===================================================================== */
const starsOf = wp => { let s = 0; while (s < 5 && wp >= CFG.stars[s]) s++; return s; };
const copNear = (x, z, r) => { for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.team === TEAM_COP && !b.dead && hyp(b.x - x, b.z - z) < r) return true; } return false; };
// `min` forces at least that many stars; `gap` ignores a repeat of the same kind of thing inside that many seconds
GAME.crime = (who, pts, min, gap) => {
  if (!AUTH() || !G.cops || G.phase !== 'play' || !who || who.kind === 'bot' || who.dead || who.gone) return;
  if (who === P && DBG.notarget) return;
  if (gap && G.time - (who.crimeAt || -9) < gap) return; who.crimeAt = G.time;
  who.wp = Math.min(CFG.stars[4] + 40, Math.max((who.wp || 0) + pts, min ? CFG.stars[min - 1] : 0));
  const h = starsOf(who.wp);
  if (h > (who.heat | 0)) { if (!(who.heat > 0)) { who.seenT = G.time; who.dispT = G.time + 1.2; who.lostT = -8; } who.heat = h; who.lkx = who.x; who.lky = who.y; who.lkz = who.z; }   // the first car gets time to arrive before the clock starts
  if (who.heat > 0) { who.crimeT = G.time; who.lostT = Math.min(who.lostT || 0, 0); }
};
GAME.clearHeat = a => { a.wp = 0; a.heat = 0; a.evade = false; a.lostT = 0; };
// what each car brings, by how many stars its target has
const COP_GUNS = [null, ['pistol', 'pistol'], ['pistol', 'smg'], ['smg', 'shotgun'], ['smg', 'rifle', 'shotgun'], ['rifle', 'rifle', 'smg']];
function copUnit(x, z, yaw, heat, chase) {
  const heavy = heat >= 4, c = spawnCar(heavy ? 'suv' : 'sedan', x, z, yaw, { color: COP_PAINT, team: TEAM_COP }); if (!c) return null; c.temp = true;
  COP_GUNS[clamp(heat, 1, 5)].forEach((w, k) => { const b = spawnBot(TEAM_COP, x, 0, z, { temp: true, wpn: w }); if (!b) return; b.car = c; b.seat = k; c.occ[k] = b; b.chase = chase; b.unit = c; b.until = 1e9; b.skill = .8 + heat * .08; if (heavy) b.hp = 150; });
  if (!c.occ[0]) { for (let k = 1; k < 4; k++) if (c.occ[k]) removeBot(c.occ[k]); removeCar(c); return null; }
  return c;
}
const GRID4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function spawnCopUnit(a) {   // a cruiser a few blocks from the last place they were seen, already rolling that way
  if (cars.length >= CAR_MAX - 1) return false;
  let best = null, bs = -1e9;
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const x = RX(i), z = RZ(j), d = hyp(x - a.lkx, z - a.lkz); if (d < 100 || d > 290 || nearHuman(x, z) < 95) continue; const s = -Math.abs(d - 150) + rand() * 50; if (s > bs) { bs = s; best = [i, j]; } }
  if (!best) return false;
  const toward = g => hyp(RX(best[0] + g[0]) - a.lkx, RZ(best[1] + g[1]) - a.lkz);
  const dir = GRID4.filter(g => best[0] + g[0] >= 0 && best[0] + g[0] <= NX && best[1] + g[1] >= 0 && best[1] + g[1] <= NZ).sort((p, q) => toward(p) - toward(q))[0];
  lanePoint(best, [best[0] + dir[0], best[1] + dir[1]], 14, LANE, _lp); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 8)) return false;
  const c = copUnit(_lp.x, _lp.z, yawOf(dir[0], dir[1]), a.heat, a); if (!c) return false;
  const A = aiStart(c, 'cop', xingOf(a.lkx, a.lkz)); A.chase = a; c.vx = dir[0] * 10; c.vz = dir[1] * 10; c.horn = 1; return true;
}
function spawnPatrol() {     // the one car that is simply out on the streets
  for (let tries = 0; tries < 10; tries++) { const i = (rand() * (NX + 1)) | 0, j = (rand() * (NZ + 1)) | 0; if (nearHuman(RX(i), RZ(j)) < 120) continue;
    const dirs = GRID4.filter(g => i + g[0] >= 0 && i + g[0] <= NX && j + g[1] >= 0 && j + g[1] <= NZ), dir = dirs[(rand() * dirs.length) | 0];
    lanePoint([i, j], [i + dir[0], j + dir[1]], 16, LANE, _lp); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 9)) continue;
    const c = copUnit(_lp.x, _lp.z, yawOf(dir[0], dir[1]), 1, null); if (!c) return false; aiStart(c, 'traffic'); c.vx = dir[0] * 8; c.vz = dir[1] * 8; return true; }
  return false;
}
function updatePolice() {    // four times a second
  let cops = 0, manned = 0, spare = 0, anyHeat = false; const hs = humans(), empty = [];
  for (let i = 0; i < bots.length; i++) if (bots[i].team === TEAM_COP && !bots[i].dead) cops++;
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c.cop || c.wreck) continue;
    if (c.occ.some(o => o && o.kind === 'bot')) { manned++; if (c.occ[0] && c.occ[0].kind === 'bot' && c.ai && c.ai.mode !== 'cop') spare++; } else if (!c.occ.some(o => o)) empty.push(c); }
  hs.forEach(a => {
    if (!(a.heat > 0)) { if (a.wp > 0) a.wp = Math.max(0, a.wp - .15); a.evade = false; return; }   // small things are forgotten
    if (a.dead || !G.cops) { GAME.clearHeat(a); return; }
    anyHeat = true; let seen = false, close = false, mine = 0; const ay = chestY(a);
    for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.team !== TEAM_COP || b.dead) continue; if (b.chase === a) mine++; if (seen) continue; const d = hyp(b.x - a.x, b.z - a.z); if (d < 42) close = true;
      if (d < 90 && (d < 14 || los(b.x, eyeY(b), b.z, a.x, ay, a.z, 'a') || los(b.x, eyeY(b), b.z, a.x, ay + .4, a.z, 'a'))) seen = true; }
    // the clock that ends a chase only runs while nobody has eyes on them and no officer is close by
    if (seen) { a.seenT = G.time; a.lostT = 0; a.lkx = a.x; a.lky = a.y; a.lkz = a.z; } else if (!close) a.lostT = (a.lostT || 0) + .25;
    a.evade = !seen && a.lostT > 1.5;
    if (a.lostT > 14 + a.heat * 4) { GAME.clearHeat(a); return; }                                              // they have got away
    if (mine < a.heat * 2 && G.time > (a.dispT || 0) && cops <= 10 && manned < 5) { if (spawnCopUnit(a)) { a.dispT = G.time + (a.heat >= 3 ? 4 : 6); cops += 2; manned++; } else a.dispT = G.time + 1.5; }
  });
  if (G.cops && !anyHeat && manned === 0 && G.time > G.patrolT) { G.patrolT = G.time + 25; spawnPatrol(); }
  // cruisers left standing with nobody to come back to them are cleared away: at once when out of the way, and from the far end of the scene when the streets are filling up
  { const full = cars.length >= CAR_MAX - 4; let far = null, fd = -1;
    for (let i = 0; i < empty.length; i++) { const c = empty[i]; let owned = false; for (let k = 0; k < bots.length && !owned; k++) { const b = bots[k]; if (b.unit === c && !b.dead) owned = true; } if (owned) continue;
      const d = nearHuman(c.x, c.z); if (d > 45 && !c.stolen) removeCar(c); else if (d > fd) { fd = d; far = c; } }
    if (full && far && !far.gone) removeCar(far); }
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c.cop || !c.horn || c.occ[0]) continue; let busy = false; for (let k = 0; k < bots.length && !busy; k++) { const b = bots[k]; if (b.unit === c && !b.dead && b.chase) busy = true; } if (!busy) c.horn = 0; }   // lights off once its officers have nobody to chase
  // cars with nobody to chase drive off, and are taken off the map once no player is near; one stays out as the patrol
  for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; if (!c.cop || c.wreck || !c.occ[0] || c.occ[0].kind !== 'bot' || !c.ai || c.ai.mode === 'cop') continue;
    if ((spare > 1 || !G.cops) && nearHuman(c.x, c.z) > 130) { for (let k = 0; k < 4; k++) if (c.occ[k] && c.occ[k].kind === 'bot') removeBot(c.occ[k]); removeCar(c); spare--; } }
}
// --- at the wheel. Far from the target a cruiser follows the streets like anything else, only faster; with a clear
//     line to them it drives straight at them, and stops short so the officers can get out.
function regrid(c, A) { const sn = aiSnap(c); A.from = sn[0]; A.to = sn[1]; A.next = aiNext(A); A.direct = false; }
function copDrive(c, A, dt) {   // true when it has set the controls for this step
  const a = A.chase, inp = c.inp;
  if (!a || a.gone || a.dead || !(a.heat > 0)) { A.mode = 'traffic'; A.chase = null; A.dest = null; A.cruise = 11; A.done = false; c.horn = 0; if (A.direct) regrid(c, A); return false; }
  c.horn = 1; A.cruise = 26;
  const known = G.time - a.seenT < 2.5, tx = known ? a.x : a.lkx, tz = known ? a.z : a.lkz, dx = tx - c.x, dz = tz - c.z, d = hyp(dx, dz);
  A.destT = (A.destT || 0) - dt; if (A.destT <= 0) { A.destT = .6; A.dest = xingOf(tx, tz); A.clear = d < 70 && Math.abs((known ? a.y : a.lky) - c.y) < 3 && los(c.x, c.y + .8, c.z, tx, c.y + .8, tz, 'p'); }
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), vf = c.vx * fx + c.vz * fz, sp = Math.abs(vf);
  // how near the streets have brought it so far; once it starts drawing away again, this is as close as the car gets
  if (A.nearD === undefined || d < A.nearD) { A.nearD = d; A.awayT = 0; } else { A.awayT += dt; if (d > A.nearD + 30) A.nearD = d; }
  if (!A.clear || A.rev > 0) { if (A.direct) regrid(c, A);
    if ((!a.car || carSpeed(a.car) < 3) && (d < (known ? 38 : 32) || (d < 85 && A.awayT > .7 && d > A.nearD + 2))) { inp.thr = 0; inp.steer = 0; inp.hb = true; if (sp < 1.5) A.done = true; return true; }   // no way to drive at them from here: stop and go in on foot
    return false; }
  A.direct = true;
  const tc = known ? a.car : null, tsp = tc ? carSpeed(tc) : 0, stopAt = tc ? 6.5 : 12;
  let cruise = tc && tsp > 4 ? Math.min(30, tsp + (d - 5) * .9) : clamp((d - stopAt) * 1.2, 0, 22);
  const diff = angTo(c.yaw, yawOf(dx, dz)); if (Math.abs(diff) > .6) cruise = Math.min(cruise, 7);
  inp.steer = clamp(-diff * 2.3, -1, 1); inp.hb = false;
  inp.thr = vf < cruise - .6 ? clamp((cruise - vf) * .45, .25, 1) : vf > cruise + 1.2 ? -clamp((vf - cruise) * .35, .2, 1) : 0;
  if (cruise <= .1) { inp.thr = 0; inp.hb = true; if (sp < 1.5) A.done = true; }
  if (cruise > 2.5 && sp < .7) { A.stuck += dt; if (A.stuck > 1.2) { A.rev = 1.2; A.stuck = 0; A.jams++; } } else A.stuck = Math.max(0, A.stuck - dt * .5);   // wedged: back off, then go round by the streets
  return true;
}
// --- on foot. An officer fights whoever is wanted and in view, goes to where they were last seen when they are not,
//     gets back in the car when they have got away from here, and leaves when there is nobody left to chase.
function copBrain(b) {
  let a = b.chase;
  if (a && (a.gone || a.dead || !(a.heat > 0))) { a = b.chase = null; if (b.tgt && b.tgt.kind !== 'bot') b.tgt = null; b.hunt = false; b.path = null; b.until = G.time + 25; }
  if (!a) { let bd = 170; humans().forEach(h => { if (!(h.heat > 0) || h.dead) return; const d = hyp(h.lkx - b.x, h.lkz - b.z); if (d < bd) { bd = d; a = h; } });
    if (a) { b.chase = a; b.until = 1e9; b.path = null; if (b.car && b.seat === 0 && b.car.ai && b.car.ai.mode !== 'cop') { b.car.ai.mode = 'cop'; b.car.ai.chase = a; b.car.ai.done = false; } } }
  botLook(b);
  if (b.car) { const c = b.car, dr = c.occ[0];
    if (c.wreck || c.burn > 0 || (b.seat !== 0 && (!dr || dr.team !== TEAM_COP)) || (c.ai && (c.ai.done || c.ai.jams > 3)) || c.hp < c.spec.hp * .2) { if (carSpeed(c) < 9 || c.burn > 0) botExit(b, false); }
    return; }
  const away = a ? hyp(a.lkx - b.x, a.lkz - b.z) : 0, fleeing = !!a && !!a.car && carSpeed(a.car) > 4 && away > 30;
  if (fleeing && b.tgt === a) b.tgt = null;                                                           // they are driving off: no use standing here
  if (b.tgt) return;
  if (b.wantCar) { const w = b.wantCar, dr = w.occ[0]; if (w.gone || w.wreck || w.burn > 0 || w.occ[b.wantSeat] || (dr && dr.team !== TEAM_COP) || hyp(w.x - b.x, w.z - b.z) > 90) b.wantCar = null; else return; }
  const u = b.unit, c = u && !u.gone && !u.wreck && u.burn <= 0 && u.hp > u.spec.hp * .25 && (!u.occ[0] || u.occ[0].team === TEAM_COP) ? u : null;
  if (c && hyp(c.x - b.x, c.z - b.z) < 80 && (!a || fleeing || away > 115) && G.time > (b.noCar || 0)) {
    let k = -1; for (let s = 0; s < c.spec.seats && k < 0; s++) if (!c.occ[s] && !bots.some(o => o !== b && o.wantCar === c && o.wantSeat === s)) k = s;
    if (k >= 0) { b.wantCar = c; b.wantSeat = k; b.carT = G.time; b.carChk = 0; b.path = null; b.hunt = false; return; } }
  if (a) { if (!b.hunt && !b.path) { b.lsx = a.lkx; b.lsy = a.lky; b.lsz = a.lkz; b.hunt = true; if (!botPathTo(b, a.lkx, a.lky, a.lkz, false)) b.hunt = false; } }
  else if (!b.path && !b.hunt) { const from = nearestNode(b.x, b.y, b.z, true); for (let k = 0; k < 5; k++) { const n = NAVOK[(rand() * NAVOK.length) | 0], d = hyp(n.x - b.x, n.z - b.z); if (d < 50 || d > 200) continue; const p = navPath(from, n.i, true); if (p) { b.path = p; b.pi = 0; break; } } }   // nothing to do and no car: walk the beat until out of everyone's way
}
