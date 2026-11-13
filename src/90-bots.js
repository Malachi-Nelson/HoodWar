/* =====================================================================
   10. BOTS — crew soldiers, bystanders, police, and everyone at a wheel that is not a player
   ===================================================================== */
let botSeq = 0;
const botHp = t => t === TEAM_CIV ? 55 : t === TEAM_COP ? 110 : 100;
const BOT_GUNS = ['pistol', 'pistol', 'smg', 'smg', 'rifle', 'rifle', 'shotgun', 'smg', 'rifle', 'marksman'];
// o.role: someone at work (ROLE.staff behind a counter, ROLE.hand in a yard); o.name: what the feed calls them
function spawnBot(team, x, y, z, o) {
  o = o || {}; let id = o.id; if (id === undefined) { do { botSeq = botSeq >= 46000 ? 1 : botSeq + 1; } while (botById(botSeq)); id = botSeq; } else if (id > botSeq) botSeq = id;      // ids come round again long before they outgrow three characters
  const role = team === TEAM_CIV ? o.role | 0 : 0, ch = makeChar(makeLook(id, team, role)); if (!ch) return null;
  const r = rng32(id * 131 + 7), wp = o.wpn || (team === TEAM_CIV ? 'fist' : pick(r, BOT_GUNS));
  const b = { kind: 'bot', id, team, role, name: o.name || (team === TEAM_CIV ? (role === ROLE.staff ? 'Vendor' : role === ROLE.hand ? 'Worker' : 'Bystander') : team === TEAM_COP ? 'Police' : HANDLES[id % HANDLES.length]), x, y, z, vy: 0, vx: 0, vz: 0, onGround: true, yaw: r() * TAU, pitch: 0, hp: botHp(team), dead: false, deadT: 0, wpn: wp, mag: WEAPONS[wp].mag || 0,
    ch, spd: 0, brainT: r() * .3, goal: null, path: null, pi: 0, tgt: null, seenT: -9, lsx: x, lsz: z, lsy: y, react: 0, burst: 3, fireT: 0, pauseT: 0, strafe: 1, strafeT: 0, stuck: 0, stuckT: 0, lx: x, lz: z, car: null, seat: 0, wantCar: null, shots: 0, aim: 0, reloadT: 0,
    knock: 0, knockT: 0, skill: .8 + r() * .5, kills: 0, deaths: 0, goalT: 0, idleT: r() * 3, fleeT: 0, temp: !!o.temp, buf: [], walk: 1.3 + r() * .6, side: 0, sideT: 0, hunt: false,
    act: 0, poi: null, slot: -1, at: 0, actT: 0, poiT: 0, chatT: 0, post: null, scareT: 0, scare: 0, calm: 0, calmT: 0, leg: 0, legT: 0 };
  bots.push(b); return b;
}
function removeBot(b) { const i = bots.indexOf(b); if (i >= 0) bots.splice(i, 1); if (b.car) { if (b.car.occ[b.seat] === b) b.car.occ[b.seat] = null; if (b.seat === 0) b.car.ai = null; b.car = null; } leavePoi(b); if (b.post) { if (b.post.npc === b) b.post.npc = null; b.post = null; } freeChar(b.ch); b.ch = null; b.gone = true; }
const botById = id => { for (let i = 0; i < bots.length; i++) if (bots[i].id === id) return bots[i]; return null; };
// --- walking
function botWalk(b, tx, tz, speed, dt) {
  const dx = tx - b.x, dz = tz - b.z, d = hyp(dx, dz); let wx = 0, wz = 0;
  if (d > .12 && speed > 0) { wx = dx / d * speed; wz = dz / d * speed; if (b.sideT > 0) { b.sideT -= dt; wx += -dz / d * b.side * speed * .9; wz += dx / d * b.side * speed * .9; } }
  const acc = Math.min(1, dt * 9); b.vx = lerp(b.vx, wx, acc); b.vz = lerp(b.vz, wz, acc);
  moveEntity(b, b.vx * dt, b.vz * dt, dt, .32, 'p', 1.75); carBlock(b, .32); b.spd = hyp(b.vx, b.vz);
  if (speed > 1) { b.stuckT += dt; if (b.stuckT > .7) { if (hyp(b.x - b.lx, b.z - b.lz) < .3) { b.stuck++; if (b.stuck === 1 && b.onGround) { b.vy = 6.4; b.onGround = false; } else if (b.stuck <= 3) { b.side = rand() < .5 ? -1 : 1; b.sideT = .7; } else if (b.stuck > 6) { const n = NAV[nearestNode(b.x, b.y, b.z, false)]; b.x = n.x; b.y = n.y; b.z = n.z; b.path = null; b.stuck = 0; } else b.path = null; } else b.stuck = 0; b.stuckT = 0; b.lx = b.x; b.lz = b.z; } }
  if (b.y < -4) { const n = NAV[nearestNode(b.x, 0, b.z, false)]; b.x = n.x; b.y = n.y; b.z = n.z; b.vy = 0; }
  return d;
}
function botPathTo(b, x, y, z, civ) {
  const a = nearestNode(b.x, b.y, b.z, true), e = nearestNode(x, y, z, false); b.path = navPath(a, e, civ); b.pi = 0;
  if (b.path && b.path.length > 1 && walkClear(b, NAV[b.path[1]])) b.pi = 1;
  return !!b.path;
}
function botFollow(b, speed, dt) {   // true once the last node is reached
  if (!b.path || b.pi >= b.path.length) return true;
  const n = NAV[b.path[b.pi]]; if (hyp(n.x - b.x, n.z - b.z) < 1.15 && Math.abs(n.y - b.y) < 1.3) { b.pi++; if (b.pi >= b.path.length) return true; }
  const m = NAV[b.path[b.pi]]; botWalk(b, m.x, m.z, speed, dt); return false;
}
// --- seeing and shooting
const _cand = [];
function botLook(b) {
  // someone minding their own turf only looks as far as the street; someone on a raid, in a fight or just shot at looks the length of the block
  const ex = b.x, ey = eyeY(b), ez = b.z, keen = !!b.tgt || b.hunt || G.time - (b.hurtT || -99) < 14 || (isCrew(b.team) && !!b.goal && b.goal.zone >= 0 && ZS[b.goal.zone].owner !== b.team), range = b.car ? 60 : keen ? 120 : 58; _cand.length = 0;
  eachActor(a => { if (a === b || a.dead || a.gone || !hostile(b, a)) return; if (a === P && (DBG.notarget || P.safeT > 0 || G.state === 'menu')) return; if (a.safe || a.down) return; const d = hyp(a.x - ex, a.z - ez); if (d < range) _cand.push([d * (a === b.tgt ? .6 : 1), a]); });
  _cand.sort((p, q) => p[0] - q[0]);
  for (let i = 0; i < _cand.length && i < 3; i++) { const a = _cand[i][1]; if (los(ex, ey, ez, a.x, chestY(a), a.z, 'a')) { if (b.tgt !== a) b.react = (.3 + rand() * .45) / b.skill; b.tgt = a; b.seenT = G.time; b.lsx = a.x; b.lsy = a.y; b.lsz = a.z; b.hunt = false; return true; } }
  if (b.tgt && (b.tgt.dead || b.tgt.gone || G.time - b.seenT > 6)) b.tgt = null;
  return false;
}
function botShoot(b, dt) {
  const t = b.tgt, d = WEAPONS[b.wpn]; if (!t || d.melee) return;
  const ox = b.x, oy = eyeY(b) - .14, oz = b.z; let dx = t.x - ox, dy = chestY(t) - oy, dz = t.z - oz; const dist = hyp(dx, dy, dz) || 1, yaw = yawOf(dx, dz);
  b.ayaw = yaw; if (!b.car) b.yaw = lerpAng(b.yaw, yaw, Math.min(1, dt * 11)); b.pitch = Math.atan2(dy, hyp(dx, dz)); b.aim = 1;
  if (b.react > 0) { b.react -= dt; return; }
  if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) b.mag = d.mag; return; }
  b.fireT -= dt; if (b.pauseT > 0) { b.pauseT -= dt; return; }
  if (b.fireT > 0 || dist > d.range[1] * 1.25 || (!b.car && Math.abs(angTo(b.yaw, yaw)) > .5)) return;
  if (b.mag <= 0) { b.reloadT = d.reload * 1.15; return; }
  b.mag--; b.fireT = 60 / d.rpm * (d.auto ? 1 : 2 + rand());
  if (--b.burst <= 0) { b.burst = d.auto ? 3 + (rand() * 5 | 0) : 1 + (rand() * 2 | 0); b.pauseT = .45 + rand() * .9; }
  const tsp = t.car ? carSpeed(t.car) : (t.spd || 0), err = (.04 + dist * .00055) * (1 + tsp * .1) * (b.spd > 1 ? 1.35 : 1) * (b.car ? 1.7 : 1) / b.skill + d.spread;
  dx /= dist; dy /= dist; dz /= dist; const m = b.ch && b.ch.shown && !b.car ? b.ch.muz : null;
  if (d.proj) { b.shots = (b.shots | 0) + 1; b.shotT = G.time; fireProj(d.proj, ox + dx * .8, oy, oz + dz * .8, dx + rs(err), dy + rs(err), dz + rs(err), b, false); } else shoot(b, ox + dx * .4, oy, oz + dz * .4, dx, dy, dz, d, err, m ? m.x : ox + dx * .7, m ? m.y : oy, m ? m.z : oz + dz * .7); if (b.ch) b.ch.kick = 1;
}
// --- cars: getting in, getting out, being thrown out
function botEnter(b, c, k) { b.car = c; b.seat = k; c.occ[k] = b; b.wantCar = null; b.path = null; b.vx = b.vz = 0; b.spd = 0; c.asleep = false; SFX.door(c.x, c.y, c.z); }
function botExit(b, stunned) {
  const c = b.car; if (!c) return; if (c.occ[b.seat] === b) c.occ[b.seat] = null; if (b.seat === 0) { c.ai = null; c.inp.thr = 0; c.inp.steer = 0; c.inp.hb = true; }
  b.car = null; const tries = [[b.seat, .75], [b.seat ^ 1, .75], [b.seat, 1.6]]; let ok = false;
  for (let i = 0; i < tries.length && !ok; i++) { doorPos(c, tries[i][0], _d0, tries[i][1]); if (!pushOut(_d0.x, _d0.z, .32, c.y + CFG.step + .01, c.y + 1.7, 'p')) { b.x = _d0.x; b.z = _d0.z; ok = true; } }
  if (!ok) { b.x = c.x; b.z = c.z; } b.y = c.y + .05; b.vy = 0; b.vx = c.vx * .5; b.vz = c.vz * .5; b.yaw = c.yaw; b.path = null; b.goalT = 0; b.stuck = 0;
  if (stunned) { b.knock = 1; b.knockT = 1.5; }
}
GAME.eject = (c, k, by) => {   // dragged out of the seat
  const o = c.occ[k]; if (!o) return;
  if (o.kind === 'bot') { botExit(o, true); if (by && by.kind !== 'bot') { if (o.team === TEAM_CIV) GAME.crime(by, 6); else if (o.team === TEAM_COP) GAME.crime(by, 30, 2); }
    if (o.team === TEAM_CIV) { o.fleeT = 12; o.fleeX = c.x; o.fleeZ = c.z; } else if (by && hostile(o, by)) { o.tgt = by; o.seenT = G.time; o.react = 1.6; } }
  else if (o.kind === 'rp') { c.occ[k] = null; GAME.ev('ej', o.slot, c.id); }
  else if (o === P) { GAME.leaveCar(false); P.knock = 1; P.knockT = 1.2; }
};
function findCarFor(b, zone) {
  let best = null, bd = 42, seat = 0;
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c.wreck || c.burn > 0 || c.hp < c.spec.hp * .35 || c.temp || c.spec.air) continue; const d = hyp(c.x - b.x, c.z - b.z); if (d >= bd) continue;
    const dr = c.occ[0];
    if (!dr) { if (c.team >= 0 && c.team !== b.team && c.home) continue; if (c.home && c.home.lot && hyp(c.x - c.home.x, c.z - c.home.z) < 3) continue; if (bots.some(o => o !== b && o.wantCar === c && o.wantSeat === 0)) { for (let k = 1; k < c.spec.seats; k++) if (!c.occ[k] && !bots.some(o => o.wantCar === c && o.wantSeat === k)) { bd = d; best = c; seat = k; break; } continue; } bd = d; best = c; seat = 0; }
    else if (dr.kind === 'bot' && dr.team === b.team && c.ai && c.ai.wait > 0 && c.ai.zone === zone) { for (let k = 1; k < c.spec.seats; k++) if (!c.occ[k]) { bd = d; best = c; seat = k; break; } } }
  if (best) { b.wantCar = best; b.wantSeat = seat; b.carT = G.time; b.carChk = 0; }
  return best;
}
// --- driving. A car follows the street grid crossing to crossing, keeping to the right-hand lane.
const _lp = { x: 0, z: 0 };
function lanePoint(f, t, s, off, out) { const ax = RX(f[0]), az = RZ(f[1]), bx = RX(t[0]), bz = RZ(t[1]), L = hyp(bx - ax, bz - az) || 1, dx = (bx - ax) / L, dz = (bz - az) / L; out.x = ax + dx * s - dz * off; out.z = az + dz * s + dx * off; return out; }
function aiNext(A) {
  const ti = A.to[0], tj = A.to[1], fi = A.from[0], fj = A.from[1], opts = [];
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(q => { const ni = ti + q[0], nj = tj + q[1]; if (ni < 0 || nj < 0 || ni > NX || nj > NZ || (ni === fi && nj === fj)) return; opts.push([ni, nj, q[0] === ti - fi && q[1] === tj - fj]); });
  if (!opts.length) return [fi, fj];
  if (A.dest) { let best = opts[0], bd = 1e9; opts.forEach(o => { const d = Math.abs(o[0] - A.dest[0]) + Math.abs(o[1] - A.dest[1]) - (o[2] ? .1 : 0) + rand() * .05; if (d < bd) { bd = d; best = o; } }); return [best[0], best[1]]; }
  let tot = 0; opts.forEach(o => tot += o[2] ? 3 : 1); let r = rand() * tot; for (let k = 0; k < opts.length; k++) { r -= opts[k][2] ? 3 : 1; if (r <= 0) return [opts[k][0], opts[k][1]]; } return [opts[0][0], opts[0][1]];
}
// put a car on the grid: the block it is on, pointing the way it faces
function aiSnap(c) {
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), ns = Math.abs(fz) > Math.abs(fx);
  let from, to;
  if (ns) { const i = clamp(Math.round((c.x - EDGE) / PX), 0, NX), j = clamp(Math.floor((c.z - EDGE) / PZ), 0, NZ - 1); if (fz > 0) { from = [i, j]; to = [i, j + 1]; } else { from = [i, j + 1]; to = [i, j]; } }
  else { const j = clamp(Math.round((c.z - EDGE) / PZ), 0, NZ), i = clamp(Math.floor((c.x - EDGE) / PX), 0, NX - 1); if (fx > 0) { from = [i, j]; to = [i + 1, j]; } else { from = [i + 1, j]; to = [i, j]; } }
  return [from, to];
}
function aiStart(c, mode, dest) {
  const sn = aiSnap(c), from = sn[0], to = sn[1];
  const A = { mode, from, to, next: null, dest: dest || null, cruise: mode === 'traffic' ? 9.5 + rand() * 3.5 : mode === 'driveby' ? 12 : mode === 'cop' ? 26 : 20, stuck: 0, rev: 0, jams: 0, wait: 0, hold: 0, off: LANE, passT: 0, done: false, panic: 0, zone: -1, age: 0 };
  A.next = aiNext(A); c.ai = A; c.asleep = false; c.inp.hb = false; return A;
}
function aiBlocked(c, reach, yieldTo) {   // -> [gap ahead in metres, speed of what is there, 1 if it is a person]
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); let gap = 1e9, v = 99, who = 0;
  for (let i = 0; i < cars.length; i++) { const o = cars[i]; if (o === c) continue; const dx = o.x - c.x, dz = o.z - c.z; if (dx * dx + dz * dz > (reach + 6) * (reach + 6)) continue; const ah = dx * fx + dz * fz, lat = dx * rx + dz * rz, turned = Math.abs(Math.sin(o.yaw - c.yaw)), hwid = 1.25 + turned * (o.spec.len / 2 - 1); if (ah < 1 || Math.abs(lat) > hwid + .5) continue; const g = ah - c.spec.len / 2 - lerp(o.spec.len / 2, 1, turned); if (g < gap && g < reach) { gap = g; v = Math.max(0, o.vx * fx + o.vz * fz); } }
  if (yieldTo) eachActor(a => { if (a.dead || a.car || a.gone || !yieldTo(a)) return; const dx = a.x - c.x, dz = a.z - c.z, ah = dx * fx + dz * fz; if (ah < 1 || ah > reach * .8 + 3 || Math.abs(dx * rx + dz * rz) > 1.5 || Math.abs(a.y - c.y) > 1.5) return; const g = ah - c.spec.len / 2 - .4; if (g < gap) { gap = g; v = 0; who = 1; } });
  _blk[0] = gap; _blk[1] = v; _blk[2] = who; return _blk;
}
const _blk = [0, 0, 0];
function driveAI(c, dt) {
  const A = c.ai, inp = c.inp, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), vf = c.vx * fx + c.vz * fz, sp = Math.abs(vf); A.age += dt;
  if (A.wait > 0) { A.wait -= dt; inp.thr = 0; inp.steer = 0; inp.hb = true; return; }
  if (A.mode === 'cop' && copDrive(c, A, dt)) return;
  let ax = RX(A.from[0]), az = RZ(A.from[1]), bx = RX(A.to[0]), bz = RZ(A.to[1]), L = hyp(bx - ax, bz - az) || 1, dx = (bx - ax) / L, dz = (bz - az) / L, s = (c.x - ax) * dx + (c.z - az) * dz;
  if (s > L - 3.5) { A.from = A.to; A.to = A.next; A.next = aiNext(A); ax = bx; az = bz; bx = RX(A.to[0]); bz = RZ(A.to[1]); L = hyp(bx - ax, bz - az) || 1; dx = (bx - ax) / L; dz = (bz - az) / L; s = (c.x - ax) * dx + (c.z - az) * dz; }
  const turnAt = L - 9.5, look = 6.5 + sp * .5, ts = s + look; if (A.passT > 0) { A.passT -= dt; if (A.passT <= 0) A.off = LANE; }
  // parking at the journey's end
  const last = A.dest && A.to[0] === A.dest[0] && A.to[1] === A.dest[1] && A.mode === 'crew';
  if (last && s > L - 34) { lanePoint(A.from, A.to, Math.max(s + 4, L - 16), 4.9, _lp); } else if (ts <= turnAt || !A.next) lanePoint(A.from, A.to, Math.max(9.5, Math.min(ts, L)), A.off, _lp); else lanePoint(A.to, A.next, 9.5 + Math.max(0, ts - turnAt - 6), A.off, _lp);
  const want = yawOf(_lp.x - c.x, _lp.z - c.z), diff = angTo(c.yaw, want); let cruise = A.cruise * (A.panic > 0 ? 1.7 : 1); if (A.panic > 0) A.panic -= dt;
  const nx = A.next ? RX(A.next[0]) - bx : dx, nz = A.next ? RZ(A.next[1]) - bz : dz, nl = hyp(nx, nz) || 1, turning = (nx * dx + nz * dz) / nl < .5, toX = turnAt - s;
  if (turning && toX < 34) cruise = Math.min(cruise, lerp(6, cruise, clamp((toX - 3) / 31, 0, 1))); else if (toX < 10 && toX > -10 && A.mode === 'traffic') cruise = Math.min(cruise, 9);
  if (Math.abs(diff) > .45) cruise = Math.min(cruise, 6.5);
  if (last && s > L - 34) { cruise = Math.min(cruise, Math.max(0, (L - 15 - s) * .7)); if (s > L - 22 && sp < 1.2) A.done = true; }
  const blk = aiBlocked(c, 5 + sp * 1.15, c.cop ? a => a.team === TEAM_CIV || a.team === TEAM_COP : A.mode === 'traffic' ? a => true : a => isCrew(a.team) && a.team === c.team), gap = blk[0];   // police wait for bystanders and each other, nobody else
  if (A.mode === 'cop' && gap < 20 && A.passT <= 0) { A.off = -1.8; A.passT = 3.5; }
  if (gap < 1e8) { cruise = Math.min(cruise, gap < 3 ? 0 : blk[1] + (gap - 3) * .8); if (gap < 6 && sp < 1) { A.hold += dt; if (A.mode === 'traffic' && A.hold > 2 && A.hold < 2.6) c.horn = 1; else c.horn = 0; if (A.hold > (A.mode === 'traffic' ? 6 : 2.5) && A.passT <= 0) { A.off = -1.8; A.passT = 5; A.hold = 0; if (blk[2]) { A.rev = 1.3; A.passT = 8; } } } }   // a person who will not move: back up and go round else { A.hold = Math.max(0, A.hold - dt); c.horn = 0; }
  if (A.passT > 0 && gap > 1e8) cruise = Math.min(cruise, 9);
  if (A.passT > 0 && blk[2] && gap > 1 && gap < 1e8) cruise = Math.max(cruise, 2.2);       // someone is standing in the road and is not going to move: edge round them
  // stuck against something: back up and try again
  if (A.rev > 0) { A.rev -= dt; inp.thr = -.8; inp.steer = clamp(diff * 2.2, -1, 1); inp.hb = false; return; }
  if (cruise > 2.5 && sp < .7 && gap > 5) { A.stuck += dt; if (A.stuck > 1.8) { A.rev = 1.4; A.stuck = 0; A.jams++; } } else A.stuck = Math.max(0, A.stuck - dt * .5);
  inp.steer = clamp(-diff * 2.3, -1, 1); inp.hb = false;
  inp.thr = vf < cruise - .6 ? clamp((cruise - vf) * .45, .25, 1) : vf > cruise + 1.2 ? -clamp((vf - cruise) * .35, .2, 1) : 0;
  if (cruise <= .1 && sp < .5) { inp.thr = 0; inp.hb = true; }
}
// --- what each kind of bot wants
GAME.assigned = (team, zi) => { let n = 0; for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (!b.dead && b.team === team && b.goal && b.goal.zone === zi) n++; } return n; };
// A crew holds what it has and goes out in force only when a raid is called (see updateRaids). With no turf and no raid, it stays home.
const BASES = CREWS.map((c, t) => ({ x: SPAWNS[t][0].x, z: SPAWNS[t][0].z, r: 9 }));
const goalAt = g => g.zone >= 0 ? ZONES[g.zone] : BASES[g.team];
function pickGoal(b) {
  const R = G.raid[b.team]; let best = -1, bs = -1e9;
  for (let i = 0; i < ZONES.length; i++) { const z = ZONES[i], s = ZS[i], cur = !!b.goal && b.goal.zone === i, n = GAME.assigned(b.team, i) - (cur ? 1 : 0); let sc;
    if (R && R.zone === i) sc = n < R.n ? 2.4 : -1; else if (s.owner === b.team) sc = 1 + (s.hot ? 1.3 : 0) - n * .6 + (cur ? .5 : 0); else continue;
    sc += rand() * .5 - hyp(z.x - b.x, z.z - b.z) / 500; if (sc > bs) { bs = sc; best = i; } }
  b.goal = { zone: best, team: b.team }; b.goalT = G.time + 30 + rand() * 30; b.path = null; b.wantCar = null; b.arrived = false; b.holdX = undefined;
}
function crewBrain(b) {
  const saw = botLook(b);
  if (b.car) { const c = b.car; if (c.spec.air) { if (c.landed && !c.occ[0]) botExit(b, false); return; } if (c.wreck || c.burn > 0 || (b.seat !== 0 && (!c.occ[0] || c.occ[0].team !== b.team)) || (c.ai && (c.ai.done || c.ai.jams > 3)) || c.hp < c.spec.hp * .2) { if (carSpeed(c) < 9 || c.burn > 0) botExit(b, false); } return; }
  if (saw || b.tgt) return;
  if (b.hunterOf) { const a = b.hunterOf;   // sent after someone: keep looking for them until they are dead or the crew loses interest
    if (a.gone || a.dead || !(a.gn && a.gn[b.team] >= CFG.gang[0])) b.hunterOf = null;
    else if (!b.hunt && hyp(a.x - b.x, a.z - b.z) < 160) { b.lsx = a.x; b.lsy = a.y; b.lsz = a.z; b.hunt = true; b.path = null; if (!botPathTo(b, a.x, a.y, a.z, false)) b.hunt = false; return; } }
  if (!b.goal || G.time > b.goalT || (b.arrived && rand() < .03 && (b.goal.zone < 0 || (ZS[b.goal.zone].owner === b.team && !ZS[b.goal.zone].hot)))) pickGoal(b);
  const z = goalAt(b.goal), dist = hyp(z.x - b.x, z.z - b.z);
  if (dist < z.r * .75) { b.arrived = true; b.wantCar = null; }
  if (b.arrived || b.path || b.hunt) return;
  if (b.wantCar) { const c = b.wantCar; if (c.gone || c.wreck || c.occ[b.wantSeat] || (b.wantSeat > 0 && (!c.occ[0] || !c.ai || c.ai.wait <= 0)) || hyp(c.x - b.x, c.z - b.z) > 60) b.wantCar = null; else return; }
  if (dist > 150 && !b.temp && G.time > (b.noCar || 0) && findCarFor(b, b.goal.zone)) return;
  if (!botPathTo(b, z.x, CURB, z.z, false)) b.goalT = 0;
}
const IDLE_ACTS = [0, ACT.talk, ACT.talk, ACT.smoke, ACT.phone, ACT.lean, 0];
function crewAct(b, dt) {
  b.act = 0;
  if (b.car) { const c = b.car; seatPos(c, b.seat, _sp); b.x = _sp.x; b.z = _sp.z; b.y = c.y; b.yaw = c.yaw; b.spd = 0; b.vx = c.vx; b.vz = c.vz;
    if (b.seat === 0 && c.ai) { driveAI(c, dt); if (c.ai && (c.ai.mode === 'crew' || c.ai.mode === 'driveby') && b.tgt && G.time - b.seenT < .6 && !c.ai.done) c.ai.cruise = 11; else if (c.ai && c.ai.mode === 'crew') c.ai.cruise = 20; }
    if (b.tgt && !b.tgt.dead && G.time - b.seenT < .5 && hyp(b.tgt.x - b.x, b.tgt.z - b.z) < 55 && (b.seat !== 0 || WEAPONS[b.wpn].car)) botShoot(b, dt); else { b.aim = 0; b.ayaw = undefined; }
    return; }
  if (b.tgt && !b.tgt.dead) {
    const t = b.tgt, dist = hyp(t.x - b.x, t.z - b.z), d = WEAPONS[b.wpn];
    if (G.time - b.seenT < .55) {
      botShoot(b, dt); const pref = clamp(d.range[0] * .7, 7, 36), ux = (t.x - b.x) / (dist || 1), uz = (t.z - b.z) / (dist || 1);
      b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeT = .6 + rand() * 1.2; b.strafe = rand() < .25 ? 0 : rand() < .5 ? -1 : 1; }
      let mx = -uz * b.strafe * .8, mz = ux * b.strafe * .8; if (dist > pref * 1.25) { mx += ux; mz += uz; } else if (dist < pref * .4) { mx -= ux * .8; mz -= uz * .8; }
      botWalk(b, b.x + mx * 4, b.z + mz * 4, hyp(mx, mz) > .1 ? 3.3 : 0, dt); b.path = null; b.hunt = true; b.wantCar = null; return;
    }
    b.aim = Math.max(0, b.aim - dt * 2);   // lost them: go to where they were
    if (!b.path) { if (!botPathTo(b, b.lsx, b.lsy, b.lsz, false)) { b.tgt = null; b.hunt = false; return; } }
    if (botFollow(b, 5.8, dt)) { if (botWalk(b, b.lsx, b.lsz, 5, dt) < 1.5 || G.time - b.seenT > 5) { b.tgt = null; b.path = null; b.hunt = false; } }
    if (b.spd > .5) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 9)); return;
  }
  b.aim = Math.max(0, b.aim - dt * 2); b.pitch = lerp(b.pitch, 0, Math.min(1, dt * 5));
  if (b.hunt) { if (b.path) { if (botFollow(b, 5.6, dt)) { b.path = null; b.hunt = false; } } else { b.hunt = false; } }
  else if (b.wantCar) { const c = b.wantCar; doorPos(c, b.wantSeat, _d0, .6); let d = hyp(_d0.x - b.x, _d0.z - b.z);
    if (G.time - b.carT > 16) { b.wantCar = null; b.noCar = G.time + 25; b.path = null; return; }                   // cannot get to it: walk instead
    if (b.path) { if (botFollow(b, 5.6, dt) || d < 5) b.path = null; }
    else if (d > 3 && G.time > (b.carChk || 0)) { b.carChk = G.time + .8; if (!walkClear(b, { x: _d0.x, y: b.y, z: _d0.z })) botPathTo(b, _d0.x, c.y, _d0.z, false); }
    if (!b.path) d = botWalk(b, _d0.x, _d0.z, 5.6, dt);
    if (d < 1.3 || hyp(c.x - b.x, c.z - b.z) < 1.8) { if (!c.occ[b.wantSeat] && !c.wreck && (b.team !== TEAM_COP || !c.occ[0] || c.occ[0].team === TEAM_COP)) { const k = b.wantSeat; botEnter(b, c, k);
        if (k === 0 && b.team === TEAM_COP) { const A = aiStart(c, b.chase ? 'cop' : 'traffic', null); A.chase = b.chase || null; A.wait = 1.3; }
        else if (k === 0) { const z = goalAt(b.goal), A = aiStart(c, 'crew', xingOf(z.x, z.z)); A.zone = b.goal.zone; A.wait = 1.6; c.team = b.team; } } else b.wantCar = null; } }
  else if (b.path) { if (botFollow(b, b.beat && !b.chase ? 1.6 : 5.3, dt)) b.path = null; }   // an officer on the beat is in no hurry
  else if (b.arrived && b.goal) {   // hold the turf: drift between spots inside it, and pass the time while standing
    const z = goalAt(b.goal); b.idleT -= dt;
    if (b.idleT <= 0 || b.holdX === undefined) { b.idleT = 4 + rand() * 9; const a = rand() * TAU, r = rand() * z.r * .7; b.holdX = z.x + Math.cos(a) * r; b.holdZ = z.z + Math.sin(a) * r; if (!walkClear(b, { x: b.holdX, y: b.y, z: b.holdZ })) { b.holdX = b.x; b.holdZ = b.z; } b.lookYaw = rand() * TAU; b.idleAct = IDLE_ACTS[(rand() * IDLE_ACTS.length) | 0]; }
    if (botWalk(b, b.holdX, b.holdZ, 3, dt) < .6) { b.vx *= .5; b.vz *= .5; b.yaw = lerpAng(b.yaw, b.lookYaw, Math.min(1, dt * 3)); if (b.spd < .3 && isCrew(b.team) && (b.goal.zone < 0 || !ZS[b.goal.zone].hot)) b.act = b.idleAct | 0; }
  } else botWalk(b, b.x, b.z, 0, dt);
  if (b.spd > .6) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 9));
}
// --- bystanders. Most are out for a walk between places where there is something to do; some are at work.
const ACT_AT = { sit: [ACT.sit], hang: [ACT.talk, ACT.talk, ACT.talk, ACT.phone, ACT.smoke, ACT.lean, 0], browse: [ACT.browse], wait: [ACT.phone, 0, ACT.lean, 0], hoop: [ACT.ball], dance: [ACT.dance] };
const STAY_AT = { sit: [35, 100], hang: [30, 85], browse: [8, 20], wait: [20, 55], hoop: [60, 140], dance: [40, 100] };
const freeSlot = p => { const k0 = (rand() * p.cap) | 0; for (let k = 0; k < p.cap; k++) { const q = (k0 + k) % p.cap; if (!p.who[q]) return q; } return -1; };
const isNight = () => G.tod < 6 || G.tod > 21.5;
function leavePoi(b) {
  const p = b.poi; if (!p) return; if (p.who[b.slot] === b) p.who[b.slot] = null;
  if (b.at === 2 && p.k === 'sit') { b.x = p.fx; b.z = p.fz; b.y = p.y; }                                 // stand up in front of the bench, not inside it
  b.poi = null; b.slot = -1; b.at = 0; b.act = 0;
}
// put someone straight onto their spot: used when they arrive, and when the city fills a place nobody is watching
function takeSpot(b, p, k) { const s = p.slots[k]; p.who[k] = b; b.poi = p; b.slot = k; b.at = 2; b.x = s.x; b.y = s.y; b.z = s.z; b.yaw = s.yaw; b.vx = b.vz = 0; b.spd = 0; b.path = null; b.onGround = true; b.act = ACT_AT[p.k][(rand() * ACT_AT[p.k].length) | 0]; b.actT = G.time + lerp(STAY_AT[p.k][0], STAY_AT[p.k][1], rand()); b.chatT = G.time + 4 + rand() * 6; }
function pickSpot(b) {
  let best = null, bs = 1e9; const night = isNight(); if (!SPOTS.length) return null;
  for (let k = 0; k < 26; k++) { const p = SPOTS[(rand() * SPOTS.length) | 0], d = hyp(p.x - b.x, p.z - b.z); if (d < 8 || d > 90 || freeSlot(p) < 0) continue;
    if (p.zone >= 0 && ZS[p.zone].hot) continue; if (night && (p.k === 'hoop' || p.k === 'browse') && rand() < .75) continue;
    const sc = d * (.5 + rand()); if (sc < bs) { bs = sc; best = p; } }
  return best;
}
const gunUp = a => a === P ? !WEAPONS[P.wpn].melee && (P.ads > .5 || P.shootT > 0) : a.wpn !== 'fist' && !!a.aim;
function civBrain(b) {
  if (b.car) { const c = b.car; if (c.wreck || c.burn > 0 || c.hp < c.spec.hp * .55 || (c.ai && c.ai.jams > 4)) { botExit(b, false); b.fleeT = 10; b.fleeX = c.x; b.fleeZ = c.z; } return; }
  if (b.post) {   // at work
    const p = b.post; let threat = false;
    if (b.fleeT > 0) { if (p.npc === b) { p.npc = null; p.t = G.time + 80; } b.post = null; b.act = 0; }                                                     // hurt: the job can wait
    else { const hs = humans(); for (let i = 0; i < hs.length; i++) { const a = hs[i]; if (!a.dead && !a.car && Math.abs(a.y - b.y) < 2 && hyp(a.x - b.x, a.z - b.z) < 6.5 && gunUp(a)) threat = true; }
      if (threat) { b.scare = ACT.handsup; b.scareT = G.time + 2.5; }
      if (G.time > b.calmT && p.k === 'post' && !p.act) { b.calmT = G.time + 3 + rand() * 6; b.calm = rand() < .55 ? 0 : rand() < .6 ? ACT.talk : ACT.browse; }
      return; }
  }
  if (b.fleeT > 0) { if (b.poi) leavePoi(b);
    if (!b.path || !b.fleeing) { let best = -1, bs = -1e9; const from = nearestNode(b.x, b.y, b.z, true); for (let k = 0; k < 8; k++) { const n = NAVOK[(Math.random() * NAVOK.length) | 0], d = hyp(n.x - b.x, n.z - b.z); if (d < 40 || d > 170) continue; const s = hyp(n.x - b.fleeX, n.z - b.fleeZ) - d * .3; if (s > bs) { bs = s; best = n.i; } } if (best >= 0) { b.path = navPath(from, best, false); b.pi = 0; b.fleeing = true; } }
    return; }
  if (b.fleeing) { b.fleeing = false; b.path = null; }
  if (b.poi) { const p = b.poi; if (b.at === 2 && (G.time > b.actT || (p.zone >= 0 && ZS[p.zone].hot))) { leavePoi(b); b.idleT = .4 + rand() * 1.5; } else if (b.at < 2 && G.time > b.poiT) { leavePoi(b); b.path = null; b.idleT = 1; } return; }
  if (b.path || b.idleT > 0) return;
  const from = nearestNode(b.x, b.y, b.z, true);
  if (rand() < .75) { const p = pickSpot(b), path = p ? navPath(from, p.node, 2) : null;   // somewhere to be
    if (path) { const k = freeSlot(p); let len = hyp(NAV[path[0]].x - b.x, NAV[path[0]].z - b.z); for (let q = 1; q < path.length; q++) len += hyp(NAV[path[q]].x - NAV[path[q - 1]].x, NAV[path[q]].z - NAV[path[q - 1]].z);
      p.who[k] = b; b.poi = p; b.slot = k; b.at = 0; b.path = path; b.pi = path.length > 1 && walkClear(b, NAV[path[1]]) ? 1 : 0; b.poiT = G.time + 25 + len / b.walk * 1.5; return; } }
  for (let k = 0; k < 8; k++) { const n = NAVOK[(Math.random() * NAVOK.length) | 0], d = hyp(n.x - b.x, n.z - b.z); if (d < 30 || d > 130) continue; const p = navPath(from, n.i, true); if (p) { b.path = p; b.pi = 0; break; } }
  if (!b.path) b.idleT = 2;
}
function civStand(b, dt, yaw) { b.vx = b.vz = 0; b.spd = 0; if (yaw !== undefined) b.yaw = lerpAng(b.yaw, yaw, Math.min(1, dt * 5)); }
function civAct(b, dt) {
  if (b.car) { const c = b.car; seatPos(c, b.seat, _sp); b.x = _sp.x; b.z = _sp.z; b.y = c.y; b.yaw = c.yaw; b.spd = 0; if (b.seat === 0 && c.ai) driveAI(c, dt); return; }
  if (b.fleeT > 0) b.fleeT -= dt; b.idleT -= dt;
  if (b.post && b.fleeT <= 0) { const p = b.post, scared = G.time < b.scareT;
    if (p.k === 'post' || scared) { civStand(b, dt, p.slots[0].yaw); b.act = scared ? b.scare : b.calm; if (p.k === 'post' && !scared && hyp(b.x - p.slots[0].x, b.z - p.slots[0].z) > .5) { b.x = p.slots[0].x; b.z = p.slots[0].z; } return; }
    // a job done between two places: work a while here, carry something over there, work a while, walk back
    if (b.leg === 0 || b.leg === 2) { civStand(b, dt); b.act = ACT.browse; if (G.time > b.actT) { const to = b.leg === 0 ? p.bnode : p.node, path = navPath(nearestNode(b.x, b.y, b.z, true), to, false); if (path) { b.path = path; b.pi = 0; b.leg++; b.legT = G.time + 60; } else b.actT = G.time + 5; } }
    else { const tx = b.leg === 1 ? p.bx : p.x, tz = b.leg === 1 ? p.bz : p.z; b.act = b.leg === 1 ? ACT.carry : 0;
      if (b.path) { if (botFollow(b, 1.45, dt)) b.path = null; } else if (botWalk(b, tx, tz, 1.45, dt) < .6 || G.time > b.legT) { b.leg = (b.leg + 1) % 4; b.actT = G.time + 4 + rand() * 6; }
      if (b.spd > .3) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 8)); }
    return; }
  if (b.poi && b.fleeT <= 0) { const p = b.poi, s = p.slots[b.slot];
    if (b.at === 2) { civStand(b, dt, s.yaw);                                                              // there: do what the place is for
      if (p.k === 'hang' && G.time > b.chatT) { b.chatT = G.time + 5 + rand() * 9; b.act = ACT_AT.hang[(rand() * ACT_AT.hang.length) | 0]; } return; }
    if (b.at === 0) { if (botFollow(b, b.walk, dt)) { b.path = null; b.at = 1; b.poiD = 1e9; b.poiP = G.time; b.poiT = G.time + 8 + hyp(p.fx - b.x, p.fz - b.z) / b.walk * 1.5; } }   // on the way
    else { const d = botWalk(b, p.fx, p.fz, b.walk, dt); if (d < b.poiD - .05) { b.poiD = d; b.poiP = G.time; }                                              // the last few steps
      if (d < .55 || (d < 2.6 && G.time - b.poiP > 1)) takeSpot(b, p, b.slot); else if (G.time - b.poiP > 2.2) { leavePoi(b); b.idleT = .5; return; } }      // something is parked in the way: near enough will do, or think again
    if (b.spd > .4) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 8)); return; }
  b.act = 0;
  if (b.path) { if (botFollow(b, b.fleeT > 0 ? 6.4 : b.walk, dt)) { b.path = null; b.idleT = b.fleeT > 0 ? 0 : .5 + rand() * 3; } } else botWalk(b, b.x, b.z, 0, dt);
  if (b.spd > .4) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 8));
}
// --- street crews: a crew's people on its own corners. They pass the time at a spot until somebody from another crew shows up,
//     fight, then drift back to where they were.
const STREET_ACTS = [ACT.talk, ACT.talk, ACT.smoke, ACT.phone, ACT.lean, 0];
function streetBrain(b) {
  const saw = botLook(b);
  if (saw || b.tgt || b.hunt) { if (b.poi) leavePoi(b); return; }
  if (b.poi || !b.home) return;
  const p = b.home, k = freeSlot(p); if (k < 0) return;                                                 // somebody has their spot: stand about where they are
  const path = hyp(p.fx - b.x, p.fz - b.z) > 5 ? navPath(nearestNode(b.x, b.y, b.z, true), p.node, false) : null;
  p.who[k] = b; b.poi = p; b.slot = k; b.at = path ? 0 : 1; b.path = path; b.pi = 0; b.poiT = G.time + 40;
}
function streetAct(b, dt) {
  b.aim = Math.max(0, b.aim - dt * 2); b.pitch = lerp(b.pitch, 0, Math.min(1, dt * 5));
  const p = b.poi; if (!p) { botWalk(b, b.x, b.z, 0, dt); b.act = b.deal && !b.deal.blown ? ACT.talk : 0; if (b.dealYaw !== undefined && b.deal && !b.deal.blown) b.yaw = lerpAng(b.yaw, b.dealYaw, Math.min(1, dt * 4)); return; }
  if (b.at === 2) { civStand(b, dt, p.slots[b.slot].yaw); if (G.time > b.chatT) { b.chatT = G.time + 5 + rand() * 10; b.act = p.k === 'hang' || p.k === 'browse' ? STREET_ACTS[(rand() * STREET_ACTS.length) | 0] : ACT_AT[p.k][0]; } return; }
  b.act = 0;
  if (b.at === 0) { if (botFollow(b, 2.4, dt)) { b.path = null; b.at = 1; } }
  else if (botWalk(b, p.fx, p.fz, 2.2, dt) < .6 || G.time > b.poiT) takeSpot(b, p, b.slot);
  if (b.spd > .4) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 8));
}
// a loud thing happened at (x,z): bystanders run, people at work get down, crew who have nothing better to do come and look
GAME.noise = (x, z, src, r) => {
  if (GAME.heard) GAME.heard(x, z);
  r = r || 42; if (G.time - (GAME.noiseT || 0) < .25 && r < 50) return; GAME.noiseT = G.time; let law = false; const rc = r > 45 ? r : 32;   // people on the pavement mind a gunshot down the street less than one beside them
  for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.dead) continue; const d = hyp(b.x - x, b.z - z); if (d > r) continue; if (b.team === TEAM_COP) law = true;
    if (b.team === TEAM_CIV) { if (d > rc) continue; if (b.car) { if (b.car.ai) b.car.ai.panic = 6; } else if (b.post) { if (b.scare !== ACT.handsup || G.time > b.scareT) b.scare = ACT.cower; b.scareT = Math.max(b.scareT, G.time + 3.5 + rand() * 3.5); if (b.path) b.path = null; }
      else if (b.fleeT <= 0) { b.fleeT = 6 + rand() * 4; b.fleeX = x; b.fleeZ = z; b.path = null; b.fleeing = false; } }
    else if (!b.car && !b.tgt && !b.hunt && src && hostile(b, src) && d > 6 && rand() < .5) { b.lsx = x; b.lsz = z; b.lsy = src.y; b.hunt = true; b.path = null; if (!botPathTo(b, x, src.y, z, false)) b.hunt = false; } }
  if (law && src && src.kind !== 'bot') GAME.crime(src, 10, 0, 3);
};
function updateBot(b, dt) {
  if (b.dead) { b.deadT += dt; b.spd = 0; return; }
  if (b.knock > 0) { b.knockT -= dt; if (b.knockT <= 0) b.knock = 0; b.vx *= Math.max(0, 1 - dt * 3); b.vz *= Math.max(0, 1 - dt * 3); moveEntity(b, b.vx * dt, b.vz * dt, dt, .32, 'p', 1.75); b.spd = 0; b.aim = 0; return; }
  b.brainT -= dt; const civ = b.team === TEAM_CIV;
  if (b.brainT <= 0) { b.brainT = .22 + rand() * .12; if (civ) civBrain(b); else if (b.homie) homieBrain(b); else if (b.team === TEAM_COP) copBrain(b); else if (b.street && !b.car) streetBrain(b); else crewBrain(b); }
  if (b.dead) return;
  if (civ) civAct(b, dt); else if (b.homie) homieAct(b, dt); else if (b.street && !b.tgt && !b.hunt && !b.car) streetAct(b, dt); else crewAct(b, dt);
}
// what a bot looks like from its state; runs for every bot on every machine
function botVisual(b, dt) {
  const ch = b.ch; if (!ch) return;
  const far = hyp(b.x - camera.position.x, b.z - camera.position.z);
  if ((b.dead && b.deadT > 7) || far > (TOUCH.on ? 220 : 300)) { hideChar(ch); return; }
  ch.acc = (ch.acc || 0) + dt; if (far > 70 && ch.shown && ((LIFE.frame + ch.idx) & (far > 140 ? 3 : 1))) return;   // far enough that nobody can tell it is posed half as often
  dt = Math.min(.2, ch.acc); ch.acc = 0;
  let seat = null, twist = 0, x = b.x, y = b.y, z = b.z;
  if (b.car) { seat = b.seat === 0 ? 'drive' : 'ride'; seatPos(b.car, b.seat, _sp); x = _sp.x; y = _sp.y; z = _sp.z; if (b.aim > .5 && b.ayaw !== undefined) twist = clamp(angTo(b.car.yaw, b.ayaw), -1.5, 1.5); }
  poseChar(ch, { x, y, z, yaw: b.car ? b.car.yaw : b.yaw, pitch: b.pitch, spd: b.spd, air: !b.onGround && !b.car, wpn: b.team === TEAM_CIV ? null : b.wpn, aim: b.aim, reload: b.reloadT > 0, seat, twist, dead: b.dead ? b.deadT : -1, knock: b.knock, sprint: b.spd > 5.9, act: b.car ? 0 : b.act, shoot: b.shootK || 0 }, dt);
}
