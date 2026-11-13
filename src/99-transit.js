/* =====================================================================
   11e. THE BUSES — two Calder Transit buses work the loop (see 42.7-transit.js), clockwise round the middle of town. Each
        stops at every shelter: the people waiting get on and someone or other gets off. Anyone can ride for a few dollars and
        get off wherever it stops. The machine that runs the world drives them like the rest of the traffic; a bus that has
        lost its driver is just a big car, and the depot sends another.
   ===================================================================== */
const BUS = { want: 2, t: 0, fare: 5, dwell: 7 }, BUS_PAINT = 0x1f4e8c;
const isBus = c => !!c && c.type === 'bus';
const busDoor = (c, out) => { const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), a = c.spec.len / 2 - 1.7, w = c.spec.wid / 2 + .55; out = out || {}; out.x = c.x + fx * a + rx * w; out.z = c.z + fz * a + rz * w; return out; };
const _bdr = { x: 0, z: 0 };
// on the machine that runs the world, from populate: keep the buses running, and clear away whoever has got on
function busService() {
  for (let i = bots.length - 1; i >= 0; i--) if (bots[i].gotOn) removeBot(bots[i]);
  if (!BUS_STOPS.length || G.phase !== 'play') return;
  const live = cars.filter(c => c.bus && c.ai && c.ai.mode === 'bus' && c.occ[0] && c.occ[0].kind === 'bot' && !c.wreck);
  if (live.length >= BUS.want || G.time < BUS.t) return; BUS.t = G.time + 6;   // a full car pool makes room for it (spawnCar)
  // a leg of the loop away from every player and out of their sight, as far from the other bus as it can be
  let best = -1, bs = -1e9; const n = BUS_ROUTE.length;
  for (let k = 0; k < n; k++) { const a = BUS_ROUTE[k], b = BUS_ROUTE[(k + 1) % n]; lanePoint(a, b, 24, LANE, _lp); if (nearHuman(_lp.x, _lp.z) < 95 || seenByHuman(_lp.x, 1.5, _lp.z) || cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 15)) continue;
    const sc = live.reduce((m, c) => Math.min(m, hyp(c.x - _lp.x, c.z - _lp.z)), 700) + rand() * 40; if (sc > bs) { bs = sc; best = k; } }
  if (best < 0) return;
  const a = BUS_ROUTE[best], b = BUS_ROUTE[(best + 1) % n]; lanePoint(a, b, 24, LANE, _lp);
  const c = spawnCar('bus', _lp.x, _lp.z, yawOf(Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])), { color: BUS_PAINT }); if (!c) return;
  const d = spawnBot(TEAM_CIV, _lp.x, 0, _lp.z, { name: 'Bus driver' }); if (!d) { removeCar(c); return; }
  d.car = c; d.seat = 0; c.occ[0] = d; c.bus = true; c.asleep = false;
  const A = aiStart(c, 'bus'); A.route = BUS_ROUTE; A.from = a; A.to = b; A.ri = (best + 1) % n; A.next = aiNext(A); A.cruise = 9; A.served = -1;
}
// the route's next crossing (aiNext asks)
function busNext(A) { A.ri = (A.ri + 1) % A.route.length; return A.route[A.ri]; }
// in driveAI, for a bus: pull in at the next stop on this leg, wait with the doors open, pull out again. -> the most it may do now
function busDrive(c, A, s, sp, dt) {
  const n = BUS_ROUTE.length, leg = (A.ri - 2 + n * 2) % n; let cap = 1e9, want = LANE;
  // gridlock at a corner (a car pulling out, another behind it, the bus turning in): after a while the bus noses through, shoving them aside
  if (sp < .4 && A.wait <= 0) A.jamT = (A.jamT || 0) + dt; else A.jamT = 0; if (A.jamT > 8) { A.bully = 5; A.jamT = 0; } if (A.bully > 0) A.bully -= dt;
  for (let i = 0; i < BUS_STOPS.length; i++) { const S = BUS_STOPS[i]; if (S.leg !== leg || A.served === S.id) continue; const d = S.s - s; if (d < -3 || d > 42) continue;
    want = lerp(LANE, 5, clamp((42 - d) / 20, 0, 1)); cap = Math.max(0, d * .45 + .15);
    if (d < 1.5 && sp < .8) { A.served = S.id; A.wait = BUS.dwell; A.atStop = S.id; busArrive(c, S); }
    break; }
  if (A.passT > 0 && want === LANE) return cap;                                               // going round something stuck in the lane
  A.off = want > A.off ? Math.min(want, A.off + dt * 2.2) : approach(A.off, LANE, dt * 1.1);  // into the kerb, and out again gently
  return cap;
}
// the doors open: whoever is waiting at this stop walks over and gets on; one or two get off
function busArrive(c, S) {
  const p = POI.find(q => q.bus === S.id);
  if (p) p.who.forEach(b => { if (b && !b.dead && b.team === TEAM_CIV && !b.car && !b.post) { b.board = c; b.boardT = G.time + BUS.dwell - .5; } });
  const off = (rand() * 2.6) | 0; busDoor(c, _bdr);
  for (let k = 0; k < off; k++) { const b = spawnBot(TEAM_CIV, _bdr.x + rs(.5), CURB, _bdr.z + rs(.5), {}); if (!b) break; b.yaw = S.yaw; b.idleT = .2 + k * .8; }
}
// a bystander on their way onto a bus (from civAct). -> true while that is all they are doing
function busBoard(b, dt) {
  const c = b.board; if (!c || c.gone || !c.ai || c.ai.wait <= 0 || G.time > b.boardT) { b.board = null; return false; }
  if (b.poi) leavePoi(b); b.path = null; busDoor(c, _bdr); const d = botWalk(b, _bdr.x, _bdr.z, 1.7, dt); if (b.spd > .3) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 8));
  if (d < .8) { b.gotOn = true; b.board = null; hideChar(b.ch); b.x = c.x; b.z = c.z; b.y = -40; }   // on board: gone from the street, cleared away at the next count
  return true;
}
// --- riding: a seat behind the driver while it is standing at a stop, for the fare
function busOffer(c) {
  if (!isBus(c) || !c.occ[0] || c.occ[0].kind !== 'bot' || c.occ[0].team !== TEAM_CIV) return null;
  if (carSpeed(c) > (AUTH() ? 1 : 2)) return { none: true, text: 'Wait for the bus to stop' };   // a joined player sees it a moment late
  for (let k = 1; k < c.spec.seats; k++) if (!c.occ[k]) return { seat: k, jack: false, fare: BUS.fare, text: '<b>F</b>Ride the bus · $' + BUS.fare };
  return { none: true, text: 'The bus is full' };
}
const stopName = S => S.name || (S.name = areaName(S.x, S.z));   // the neighbourhood it is in (the names are set later in the file than this)
const busLine = c => { if (G.time > (c.nsT || 0)) { c.nsT = G.time + .5; const S = busNextStop(c); c.ns = S ? ' · next stop ' + stopName(S) : ' · passenger'; } return c.ns; };
// which stop is next for a bus, worked out from where it is (so a joined player, who has no driver's plan, can say too)
function busNextStop(c) {
  const n = BUS_ROUTE.length, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw); let leg = -1, s = 0;
  for (let k = 0; k < n; k++) { const a = BUS_ROUTE[k], b = BUS_ROUTE[(k + 1) % n], ax = RX(a[0]), az = RZ(a[1]), Ln = hyp(RX(b[0]) - ax, RZ(b[1]) - az), dx = (RX(b[0]) - ax) / Ln, dz = (RZ(b[1]) - az) / Ln;
    const q = (c.x - ax) * dx + (c.z - az) * dz, off = (c.x - ax) * -dz + (c.z - az) * dx; if (q > -6 && q < Ln + 6 && Math.abs(off) < 9 && fx * dx + fz * dz > .6) { leg = k; s = q; break; } }
  if (leg < 0) return null;
  for (let k = 0; k < n; k++) { const L = (leg + k) % n, at = BUS_STOPS.filter(S => S.leg === L && (k > 0 || S.s > s + 2)).sort((p, q) => p.s - q.s); if (at.length) return at[0]; }
  return null;
}
