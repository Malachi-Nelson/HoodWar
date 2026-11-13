/* =====================================================================
   4d. CALDER TRANSIT — one bus route, a loop round the middle of town, clockwise, with a shelter at each stop. Here are the
       route and the stops as they are built into the streets; the buses themselves are in 99-transit.js.
       A stop is on the bus's right: on the pavement of a block inside the loop, with the kerb cleared of parked cars.
   ===================================================================== */
const BUS_ROUTE = [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [1, 4], [1, 3], [1, 2]];
// each stop: the block it is on, the side of that block facing the route, and how far along that side (from its west or north end) it would like to be
const BUS_STOPS = [[2, 1, 'n', 40], [4, 1, 'n', 40], [5, 2, 'e', 22], [4, 4, 's', 40], [2, 4, 's', 40], [1, 2, 'w', 42]].map((q, id) => ({ id, bi: q[0], bj: q[1], side: q[2], u: q[3] }));
// a block side as a frame: t runs along it, n points out from the block toward the road; base is the lot-line corner it starts from
function sideFrame(L, side) {
  if (side === 'n') return { bx: L.x0, bz: L.z0, tx: 1, tz: 0, nx: 0, nz: -1, len: L.x1 - L.x0 };
  if (side === 's') return { bx: L.x0, bz: L.z1, tx: 1, tz: 0, nx: 0, nz: 1, len: L.x1 - L.x0 };
  if (side === 'e') return { bx: L.x1, bz: L.z0, tx: 0, tz: 1, nx: 1, nz: 0, len: L.z1 - L.z0 };
  return { bx: L.x0, bz: L.z0, tx: 0, tz: 1, nx: -1, nz: 0, len: L.z1 - L.z0 };
}
const sidePt = (F, u, v) => ({ x: F.bx + F.tx * u + F.nx * v, z: F.bz + F.tz * u + F.nz * v });
// a box given in the side's own terms (along u0..u1, out v0..v1): in the world it is still square to the axes
function sideBox(F, u0, u1, v0, v1) { const a = sidePt(F, u0, v0), b = sidePt(F, u1, v1); return [Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)]; }
function genBusStops() {
  const keep = [];
  BUS_STOPS.forEach(S => {
    const L = lotOf(S.bi, S.bj), F = sideFrame(L, S.side);
    // somewhere along the side with room: nothing knockable or solid where the shelter and its sign go
    const clear = u => { const a = sideBox(F, u - 2.6, u + 3.2, .1, WALK - .1); if (PROPS.some(p => p.x > a[0] - .5 && p.x < a[1] + .5 && p.z > a[2] - .5 && p.z < a[3] + .5)) return false;
      for (let du = -2; du <= 2; du += 1) for (let dv = .6; dv <= 3; dv += .8) { const q = sidePt(F, u + du, dv); if (pushOut(q.x, q.z, .3, CURB + .3, CURB + 2, 'p')) return false; } return true; };
    let u = -1; for (let k = 0; k < 18 && u < 0; k++) { const c = S.u + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2.5; if (c > 12 && c < F.len - 12 && clear(c)) u = c; }
    if (u < 0) return; S.u = u;
    // the shelter: a roof on four posts, glass at the back and the ends, a bench, a sign on a pole at the kerb
    const y = CURB, post = 0x3a4048, glassY = y + 2.36, col = (u0, u1, v0, v1, y0, y1, mat, c, solid) => { const b = sideBox(F, u + u0, u + u1, v0, v1); if (solid) addBox(b[0], b[1], y0, y1, b[2], b[3], mat, { col: c }); else addBox(b[0], b[1], y0, y1, b[2], b[3], mat, { col: c, nocol: true }); };
    col(-1.95, 1.95, .12, 2.15, y + 2.42, y + 2.54, 'flat', 0xd8dde2, true);                         // roof
    col(-1.95, 1.95, .1, .16, y + 2.3, y + 2.5, 'flat', 0x1f4e8c, false);                            // a blue fascia along the back
    [-1.85, 1.85].forEach(du => { col(du - .05, du + .05, .2, .3, y, y + 2.42, 'flat', post, true); col(du - .05, du + .05, 1.95, 2.05, y, y + 2.42, 'flat', post, true); });
    col(-1.8, 1.8, .24, .3, y + .2, glassY, 'glass', 0xffffff, true);                                // the back pane
    [-1.86, 1.86].forEach(du => col(du - .03, du + .03, .32, 1.35, y + .2, glassY, 'glass', 0xffffff, true));
    col(-1.3, 1.3, .42, .86, y + .44, y + .52, 'flat', 0x6a4a32, false); [-1.1, 1.1].forEach(du => col(du - .05, du + .05, .5, .8, y, y + .44, 'flat', post, false));   // the bench
    const sp = sidePt(F, u + 3.1, WALK - .45); addBox(sp.x - .05, sp.x + .05, y, y + 2.75, sp.z - .05, sp.z + .05, 'flat', { col: post, nocol: true }); solid(sp.x - .08, sp.x + .08, y, y + 2.75, sp.z - .08, sp.z + .08, { a: false, n: false });
    const along = F.tx ? ['e', 'w'] : ['s', 'n']; along.forEach((f, k) => { const o = (k ? -1 : 1) * .03; sign('BUS STOP', 'blue', sp.x + (F.tx ? o : 0), y + 2.42, sp.z + (F.tz ? o : 0), .95, .42, f); });
    // people wait under it, facing the road; the kerb in front is kept clear
    const w = sidePt(F, u, 1.15); POI.push({ k: 'wait', x: w.x, z: w.z, y, yaw: yawOf(F.nx, F.nz), cap: 3, bus: S.id });
    for (let i = PARK.length - 1; i >= 0; i--) { const p = PARK[i], d = (p.x - (F.bx + F.tx * u)) * F.tx + (p.z - (F.bz + F.tz * u)) * F.tz, out = (p.x - F.bx) * F.nx + (p.z - F.bz) * F.nz; if (out > WALK && out < WALK + 3.5 && Math.abs(d) < 11) PARK.splice(i, 1); }
    S.x = sidePt(F, u, 0).x; S.z = sidePt(F, u, 0).z; S.at = sidePt(F, u, WALK + 1.4); S.F = F; S.yaw = yawOf(F.nx, F.nz); keep.push(S);
  });
  // where on the route each stop is: the leg of the loop that passes it, and how far along it the bus stands (its front door at the shelter)
  keep.forEach(S => { for (let k = 0; k < BUS_ROUTE.length; k++) { const a = BUS_ROUTE[k], b = BUS_ROUTE[(k + 1) % BUS_ROUTE.length], ax = RX(a[0]), az = RZ(a[1]), bx = RX(b[0]), bz = RZ(b[1]), Ln = hyp(bx - ax, bz - az), dx = (bx - ax) / Ln, dz = (bz - az) / Ln;
    const s = (S.at.x - ax) * dx + (S.at.z - az) * dz, off = (S.at.x - ax) * -dz + (S.at.z - az) * dx; if (s > 4 && s < Ln - 4 && Math.abs(off - 5) < 2.5) { S.leg = k; S.s = s - 3.3; break; } } });
  BUS_STOPS.length = 0; keep.filter(S => S.leg !== undefined).forEach(S => BUS_STOPS.push(S));
}
