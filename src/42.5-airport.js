/* ---------------------------------------------------------------------
   4c½. PORT CALDER INTERNATIONAL — an island across the harbour channel with one runway, a terminal and four gates, two
        hangars, three helipads and a cargo shed, joined to the docks by the Harbor Bridge. Built once the city stands
        (43-assemble.js calls genBridge and genAirport), with dice of its own so the city itself never changes.
        The whole island is one slab at pavement height; the runway, roads and apron are laid on it.
   --------------------------------------------------------------------- */
const RWY = { x0: 1045, x1: 1090, z0: 10, z1: 526, cx: 1067.5 };    // the runway, north-south
const TAXI = { x0: 1005, x1: 1023 }, LANDX = 866;                   // the taxiway beside it; the airport road's centre line, landside
const TERM = { x0: 880, x1: 940, z0: 160, z1: 370 };                 // the terminal
const AIRPORT = { pads: [], city: [], gun: null, guards: [], masts: [], stands: [], name: 'Port Calder International' };
// a thin round member between two points: stay cables, braces, poles that lean
function strut(ax, ay, az, bx, by, bz, r, col) {
  const len = hyp(bx - ax, by - ay, bz - az), g = new T.CylinderGeometry(r, r, len, 6), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3((bx - ax) / len, (by - ay) / len, (bz - az) / len));
  SB('flat').geo(g, new T.Matrix4().compose(new T.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), q, new T.Vector3(1, 1, 1)), colOf(col)); g.dispose();
}
// a ring of paint (a helipad's circle): flat quads round the centre
function paintRing(cx, cz, r, w, col, y) { const n = 28, c = colOf(col), h = y + .05; for (let k = 0; k < n; k++) { const a = k / n * TAU, b = (k + 1) / n * TAU, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  SB('paint').quad([cx + ca * (r + w), h, cz + sa * (r + w)], [cx + cb * (r + w), h, cz + sb * (r + w)], [cx + cb * r, h, cz + sb * r], [cx + ca * r, h, cz + sa * r], 0, 1, 0, 0, 0, 1, 1, c); } }
// big painted numbers on the runway, seven-segment style, read by a pilot coming in along `dir` (1: heading south, -1: heading north)
function paintDigits(text, cx, cz, dir, y) {
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' }, w = 5, h = 9, t = .9, gap = 2;
  const total = text.length * w + (text.length - 1) * gap;
  [...text].forEach((ch, i) => { const lx = -total / 2 + i * (w + gap), segs = SEG[ch] || '';
    // in the reader's frame: u across (to their right), v ahead; the digit sits from v = 0 (near) to v = h (far)
    const R = { a: [0, h - t, w, h], b: [w - t, h / 2, w, h], c: [w - t, 0, w, h / 2], d: [0, 0, w, t], e: [0, 0, t, h / 2], f: [0, h / 2, t, h], g: [0, h / 2 - t / 2, w, h / 2 + t / 2] };
    [...segs].forEach(sg => { const q = R[sg], u0 = lx + q[0], u1 = lx + q[2], v0 = q[1] - h / 2, v1 = q[3] - h / 2;
      // heading south (dir 1) the reader's right is -x and ahead is +z; heading north it is +x and -z
      const xa = cx - dir * u0, xb = cx - dir * u1, za = cz + dir * v0, zb = cz + dir * v1; paint(Math.min(xa, xb), Math.min(za, zb), Math.max(xa, xb), Math.max(za, zb), WHT, y); }); });
}
// an airliner parked nose-in at a gate, pointing west: nose at nx, tail out at nx + 38. Drawn into the static city; it stops people, cars and bullets.
function airliner(nx, cz, tail, belly) {
  const y0 = CURB, fy = y0 + 3.6, wh = colOf(0xeceae4), dk = colOf(0x1f2a33), gy = colOf(0x8c9299), tl = colOf(tail), bl = colOf(belly), b = SB('flat');
  const put = (g, x, y, z, col, rx, ry, rz, sx, sy, sz) => { const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx || 1, sy || 1, sz || 1)); b.geo(g, m, col); g.dispose(); };
  put(new T.CylinderGeometry(2.1, 2.1, 29, 16), nx + 17.5, fy, cz, wh, 0, 0, PI / 2);                           // fuselage
  put(new T.SphereGeometry(1, 16, 10), nx + 3, fy - .05, cz, wh, 0, 0, 0, 3, 2.08, 2.08);                        // nose
  put(new T.CylinderGeometry(.55, 2.1, 6.5, 14), nx + 35.2, fy + .55, cz, wh, 0, 0, PI / 2 + .12);              // tail cone, swept up
  put(new T.CylinderGeometry(2.12, 2.12, 25, 16, 1, true, -PI / 2 - .5, 1), nx + 18, fy, cz, bl, 0, 0, PI / 2); // belly stripe
  b.box(nx + .9, nx + 2.4, fy + .55, fy + 1.15, cz - 1.25, cz + 1.25, dk);                                        // cockpit glass
  [-1, 1].forEach(s => { b.box(nx + 5, nx + 31, fy + .55, fy + .88, cz + s * 2.06 - .04, cz + s * 2.06 + .04, dk);  // window band
    const wing = new T.Shape([new T.Vector2(nx + 13, s * 1.8), new T.Vector2(nx + 21.5, s * 17), new T.Vector2(nx + 24, s * 17), new T.Vector2(nx + 21.5, s * 1.8)]), wg = new T.ExtrudeGeometry(wing, { depth: .32, bevelEnabled: false }); wg.rotateX(PI / 2); wg.translate(0, fy - 1.05, 0); b.geo(wg, null, wh); wg.dispose();
    const st = new T.Shape([new T.Vector2(nx + 32, s * 1.2), new T.Vector2(nx + 35.6, s * 6.6), new T.Vector2(nx + 37.6, s * 6.6), new T.Vector2(nx + 37.4, s * 1.2)]), sg = new T.ExtrudeGeometry(st, { depth: .22, bevelEnabled: false }); sg.rotateX(PI / 2); sg.translate(0, fy + 1.1, 0); b.geo(sg, null, wh); sg.dispose();
    put(new T.CylinderGeometry(.92, .8, 3.8, 14), nx + 15.6, fy - 1.95, cz + s * 7.2, gy, 0, 0, PI / 2);          // engines
    b.box(nx + 15.2, nx + 17.4, fy - 1.3, fy - .9, cz + s * 7.2 - .18, cz + s * 7.2 + .18, gy);
    b.box(nx + 18.5, nx + 19.3, y0, fy - 1.6, cz + s * 2.6 - .25, cz + s * 2.6 + .25, dk); b.box(nx + 18.2, nx + 19.6, y0, y0 + 1.1, cz + s * 2.6 - .45, cz + s * 2.6 + .45, dk); });   // main gear
  b.box(nx + 4.2, nx + 4.8, y0, fy - 1.8, cz - .2, cz + .2, dk); b.box(nx + 4, nx + 5, y0, y0 + .9, cz - .35, cz + .35, dk);                  // nose gear
  const fin = new T.Shape([new T.Vector2(nx + 31, fy + 1.6), new T.Vector2(nx + 35.4, fy + 8.6), new T.Vector2(nx + 37.6, fy + 8.6), new T.Vector2(nx + 37.9, fy + 1.6)]), fg = new T.ExtrudeGeometry(fin, { depth: .42, bevelEnabled: false }); fg.translate(0, 0, cz - .21); b.geo(fg, null, tl); fg.dispose();
  solid(nx, nx + 38, y0 + .6, fy + 2.1, cz - 2.1, cz + 2.1);                                                     // the body stops everything
  [-1, 1].forEach(s => { solid(nx + 13.6, nx + 17.6, fy - 2.9, fy - 1, cz + s * 7.2 - .95, cz + s * 7.2 + .95); solid(nx + 14, nx + 23, fy - 1.05, fy - .7, Math.min(cz + s * 2, cz + s * 17), Math.max(cz + s * 2, cz + s * 17), { p: false, a: false }); });
  solid(nx + 32.5, nx + 37.8, fy + 1.6, fy + 8.6, cz - .3, cz + .3, { p: false, a: false });                      // fin: only for what flies or shoots
  FOOT.push([nx, cz - 2.1, nx + 38, cz + 2.1, 'b']); FOOT.push([nx + 14, cz - 17, nx + 22, cz + 17, 'b']);
}
// --- the Harbor Bridge: a cable-stayed span from the docks to the island, a road and two pavements wide
function genBridge() {
  const z = BRIDGE.z, x0 = CITY.w, x1 = ISLE.x0, w = BRIDGE.w, steel = 0x6f7a80, stone = 0xb8b4ac;
  addBox(x0, x1, -1.7, -.02, z - w - .3, z + w + .3, 'concrete', { nocol: true, faces: 15 | 32, col: 0x9a968e });
  ground(x0, z - 6.5, x1, z + 6.5, 'asphalt', null, -.01); PATCH.push([x0, z - w, x1, z + w, 'walk'], [x0, z - 6.5, x1, z + 6.5, 'asphalt']);
  paint(x0, z - .28, x1, z - .12, YEL, -.01); paint(x0, z + .12, x1, z + .28, YEL, -.01);
  for (let x = x0 + 2; x < x1 - 2; x += 7) { paint(x, z - 4.3, x + .9, z - 4.15, WHT, -.01); paint(x, z + 4.15, x + .9, z + 4.3, WHT, -.01); }
  [-1, 1].forEach(s => { const a = Math.min(z + s * 6.5, z + s * w), b = Math.max(z + s * 6.5, z + s * w), zr = z + s * (w - .15);
    addBox(x0, x1, -.6, CURB, a, b, 'walk', { faces: 15 | 16 });
    addBox(x0, x1, CURB, CURB + 1.05, zr - .12, zr + .12, 'flat', { col: steel, a: false, s: false });                 // the railing
    for (let x = x0 + 1.5; x < x1; x += 3) deco(x - .05, x + .05, -1.6, CURB, zr - .05, zr + .05, steel); });
  for (let x = x0 + 14; x < x1 - 6; x += 26) { prop('lamp', x, z - 8.3); PROPS[PROPS.length - 1].yaw = PI; prop('lamp', x + 13, z + 8.3); PROPS[PROPS.length - 1].yaw = 0; }
  [752, 798].forEach((tx, k) => {
    [-1, 1].forEach(s => { addBox(tx - .9, tx + .9, -3, 31, z + s * 11.3 - .9, z + s * 11.3 + .9, 'concrete', { col: stone, a: false });
      for (let d = 8; d <= 26; d += 6) [-1, 1].forEach(e => { const cx = tx + e * d; if (cx > x0 + 2 && cx < x1 - 2) strut(tx, 29.5, z + s * 11.3, cx, CURB + 1, z + s * (w - .15), .06, 0xd8d6cc); }); });
    addBox(tx - .9, tx + .9, 27.5, 31, z - 12.2, z + 12.2, 'concrete', { col: stone, a: false });
    sign(k ? 'AIRPORT · PORT CALDER INTL' : 'HARBOR BRIDGE', 'blue', tx - .95, 29.2, z, k ? 13 : 9.5, 1.4, 'w');
    sign(k ? 'HARBOR BRIDGE' : 'CITY CENTER · DOCKS', 'blue', tx + .95, 29.2, z, k ? 9.5 : 12, 1.4, 'e'); });
  // the pavements are walking routes into town and out to the terminal
  const ends = [];
  [-1, 1].forEach(s => { const zz = z + s * 8.25; let prev = -1, first = -1; for (let x = x0 - 1.5; x <= x1 + 2; x += 23) { const n = navNode(x, CURB, zz); if (prev >= 0) navLink(prev, n, true); else first = n; prev = n; } ends.push([first, prev]); });
  const ring = (i, j, key) => RING[i] && RING[i][j] ? RING[i][j][key] : -1;
  navLink(ring(NX - 1, 2, 'se'), ends[0][0], true); navLink(ring(NX - 1, 3, 'ne'), ends[1][0], true);              // across the avenue from the docks corners
  return ends;
}
// --- the island
function genAirport(bridgeEnds) {
  const R = rng32(4471), rr = (a, b) => a + (b - a) * R(), z = BRIDGE.z, LX = LANDX, y1 = CURB + .03;
  addBox(ISLE.x0, ISLE.x1, -3, CURB, ISLE.z0, ISLE.z1, 'concrete', { faces: 15 | 16, top: 'turf', col: 0x9a968e, tcol: 0xffffff });
  PATCH.push([ISLE.x0, ISLE.z0, ISLE.x1, ISLE.z1, 'grass']);
  // landside: the road from the bridge, the airport road along the front, and the car parks either side of the bridge road
  ground(LX - 6.5, 14, LX + 6.5, 516, 'asphalt'); ground(ISLE.x0, z - 6.5, LX - 6.5, z + 6.5, 'asphalt');
  paint(LX - .28, 20, LX - .12, z - 8, YEL, y1); paint(LX + .12, 20, LX + .28, z - 8, YEL, y1); paint(LX - .28, z + 8, LX - .12, 510, YEL, y1); paint(LX + .12, z + 8, LX + .28, 510, YEL, y1);
  paint(ISLE.x0, z - .28, LX - 8, z - .12, YEL, y1); paint(ISLE.x0, z + .12, LX - 8, z + .28, YEL, y1);
  [-1, 1].forEach(s => { addBox(ISLE.x0, LX - 6.5, CURB, CURB * 2, Math.min(z + s * 6.5, z + s * BRIDGE.w), Math.max(z + s * 6.5, z + s * BRIDGE.w), 'walk', { faces: 15 | 16 }); });   // the bridge pavements carry on to the airport road
  [[162, 249], [276, 372]].forEach(q => { ground(833, q[0], 857, q[1], 'lot');
    for (let zz = q[0] + 1; zz + 2.8 <= q[1]; zz += 2.8) { paint(833.5, zz - .06, 842.5, zz + .06, WHT, CURB + .022); paint(847.5, zz - .06, 856.5, zz + .06, WHT, CURB + .022);
      if (zz + 2.8 + 2.8 <= q[1]) { PARK.push({ x: 838.2, z: zz + 1.4, yaw: PI / 2, lot: true }, { x: 851.8, z: zz + 1.4, yaw: -PI / 2, lot: true }); } }
    for (let zz = q[0] + 8; zz < q[1]; zz += 30) { prop('lamp', 857.9, zz); PROPS[PROPS.length - 1].yaw = -PI / 2; }
    tree(834.5, q[0] - 2.5, .9); tree(834.5, q[1] + 2.5, .9); });
  for (let zz = 30; zz < 150; zz += 30) { prop('lamp', 857.9, zz); PROPS[PROPS.length - 1].yaw = -PI / 2; } for (let zz = 392; zz < 510; zz += 30) { prop('lamp', 857.9, zz); PROPS[PROPS.length - 1].yaw = -PI / 2; }
  // the terminal: glass on four sides, the name across the front, a canopy over the drop-off kerb and jet bridges out the back
  addBox(LX + 6.5, TERM.x0, CURB, CURB * 2, 156, 380, 'walk', { faces: 15 | 16 });
  building(TERM.x0, TERM.z0, TERM.x1, TERM.z1, 15, { mat: 'tower', col: 0xb7c6d2, kind: 'o', trim: 0x5d6e7c });
  deco(LX + 6.9, TERM.x0, CURB + 5.4, CURB + 5.8, 168, 362, 0xd8d6cc); for (let zz = 172; zz <= 358; zz += 18.6) addBox(LX + 7.6, LX + 8, CURB * 2, CURB + 5.4, zz - .2, zz + .2, 'flat', { col: 0x8a9096, a: false, s: false, n: false });
  [200, 265, 330].forEach(zz => deco(TERM.x0 - .06, TERM.x0, CURB * 2, CURB + 3.4, zz - 3.5, zz + 3.5, 0x1c2630));
  sign('PORT CALDER INTERNATIONAL', 'blue', TERM.x0 - .1, CURB + 12, 265, 44, 3.2, 'w'); sign('DEPARTURES', 'white', TERM.x0 - .1, CURB + 7.2, 222, 9, 1.2, 'w'); sign('ARRIVALS', 'white', TERM.x0 - .1, CURB + 7.2, 308, 8, 1.2, 'w');
  sign('PORT CALDER', 'white', TERM.x1 + .1, CURB + 12.5, 265, 20, 2.2, 'e');
  [190, 245, 300, 355].forEach((sz, k) => { addBox(TERM.x1, 953, CURB + 4.2, CURB + 6.8, sz - 1.6, sz + 1.6, 'flat', { col: 0xc9ced2, a: false }); addBox(950, 951.2, CURB, CURB + 4.2, sz - .6, sz + .6, 'flat', { col: 0x5a6066, a: false, n: false });
    sign('GATE ' + (k + 1), 'gold', TERM.x1 + .1, CURB + 3.2, sz + 3.2, 3.6, .7, 'e'); AIRPORT.stands.push(sz);
    airliner(954, sz, [0x15467a, 0xa3221b, 0x1d6b45, 0xd9a521][k], [0x15467a, 0xa3221b, 0x1d6b45, 0xd9a521][k]);
    paint(992, sz - .15, TAXI.x0, sz + .15, YEL, y1); });
  // airside: the apron, the taxiway, the runway and what is painted on them
  ground(935, 0, TAXI.x0, 522, 'concrete', 0xc4c0b8); PATCH.push([935, 0, TAXI.x0, 522, 'plaza']); ground(TAXI.x0, 4, TAXI.x1, 532, 'asphalt'); paint(1013.85, 8, 1014.15, 528, YEL, y1);
  [[10, 30], [258, 276], [506, 524]].forEach(q => { ground(TAXI.x1, q[0], RWY.x0, q[1], 'asphalt'); paint(TAXI.x1, (q[0] + q[1]) / 2 - .15, RWY.x0, (q[0] + q[1]) / 2 + .15, YEL, y1); });
  ground(RWY.x0, RWY.z0, RWY.x1, RWY.z1, 'asphalt');
  paint(RWY.x0 + 1, RWY.z0 + 1, RWY.x0 + 1.9, RWY.z1 - 1, WHT, y1); paint(RWY.x1 - 1.9, RWY.z0 + 1, RWY.x1 - 1, RWY.z1 - 1, WHT, y1);
  for (let zz = RWY.z0 + 62; zz < RWY.z1 - 70; zz += 46) paint(RWY.cx - .45, zz, RWY.cx + .45, zz + 28, WHT, y1);
  [RWY.z0 + 4, RWY.z1 - 34].forEach(za => { for (let k = 0; k < 5; k++) [-1, 1].forEach(s => { const xa = RWY.cx + s * (3.4 + k * 3.6); paint(Math.min(xa, xa + s * 1.8), za, Math.max(xa, xa + s * 1.8), za + 30, WHT, y1); }); });
  [[RWY.z0 + 110, 1], [RWY.z1 - 150, 1]].forEach(q => [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) paint(RWY.cx + s * 8 - 1.2, q[0] + k * 13, RWY.cx + s * 8 + 1.2, q[0] + k * 13 + 9, WHT, y1); }));
  paintDigits('18', RWY.cx, RWY.z0 + 46, 1, y1); paintDigits('36', RWY.cx, RWY.z1 - 46, -1, y1);
  // helipads: the one in front of the police hangar keeps a gunship; the other two take whatever flies in
  [[966, 30, 'gun'], [966, 84, 'civ'], [991, 122, 'civ'], [992, 56, 'free']].forEach(q => { const [px, pz, kind] = q;
    cyl(px, CURB, CURB + .06, pz, 9, 'concrete', 0xc9c5bc, { nocol: true, seg: 28 }); paintRing(px, pz, 7.4, .5, kind === 'gun' ? 0xd23a2a : 0xd9b13a, CURB + .06);
    paint(px - 2.6, pz - 3.6, px - 1.6, pz + 3.6, WHT, CURB + .06); paint(px + 1.6, pz - 3.6, px + 2.6, pz + 3.6, WHT, CURB + .06); paint(px - 1.6, pz - .5, px + 1.6, pz + .5, WHT, CURB + .06);
    const pad = { x: px, z: pz, yaw: -PI / 2, kind, y: CURB, name: 'Port Calder International' }; AIRPORT.pads.push(pad); if (kind === 'gun') AIRPORT.gun = pad; });   // 'free': kept clear for the helicopters people own
  AIRPORT.guards = [{ x: 954, z: 22, yaw: PI / 2 }, { x: 955, z: 40, yaw: PI / 2 }, { x: 979, z: 18, yaw: 0 }];
  SPAWNS[TEAM_COP] = [{ x: 942, z: 24, yaw: -PI / 2 }, { x: 942, z: 36, yaw: -PI / 2 }, { x: LINE.x - 8.3, z: LINE.sz - 3, yaw: 0 }, { x: LINE.x + 8.3, z: LINE.sz + 3, yaw: PI }];   // a police player's start: the air support hangar, or outside the El station
  // and two in town, on open ground a helicopter can be set down on: the strip mall's car park and the container yard at the docks
  [[251, 219, 'the strip mall car park'], [649, 303, 'the docks']].forEach(q => { const [px, pz, nm] = q; paintRing(px, pz, 7.4, .5, 0xd9b13a, CURB + .02); paint(px - 2.6, pz - 3.6, px - 1.6, pz + 3.6, WHT, CURB + .02); paint(px + 1.6, pz - 3.6, px + 2.6, pz + 3.6, WHT, CURB + .02); paint(px - 1.6, pz - .5, px + 1.6, pz + .5, WHT, CURB + .02);
    AIRPORT.city.push({ x: px, z: pz, yaw: 0, y: CURB, kind: 'city', name: nm }); });
  // two hangars, open to the apron: the north one the airport police keep their helicopter at
  [[6, 52, 'AIRPORT POLICE · AIR SUPPORT', 'blue'], [62, 108, 'CALDER HELI TOURS', 'gold']].forEach(q => { const [z0, z1, nm, st] = q, x0 = 886, x1 = 934, hh = 13.5, col = 0x9aa3ab;
    addBox(x0, x0 + 1.2, CURB, CURB + hh, z0, z1, 'corr', { col }); addBox(x0, x1, CURB, CURB + hh, z0, z0 + 1.2, 'corr', { col }); addBox(x0, x1, CURB, CURB + hh, z1 - 1.2, z1, 'corr', { col });
    addBox(x0, x1, CURB + hh, CURB + hh + 1.4, z0, z1, 'corr', { col, top: 'roof' }); addBox(x1 - 1.2, x1, CURB + 10.5, CURB + hh, z0 + 1.2, z1 - 1.2, 'corr', { col: 0x7d868e });
    sign(nm, st, x1 + .05, CURB + 12.2, (z0 + z1) / 2, 22, 1.6, 'e'); FOOT.push([x0, z0, x1, z1, 'i']);
    ground(x0 + 1.2, z0 + 1.2, x1, z1 - 1.2, 'concrete', 0xb0aca4); });
  // the control tower, between the hangars and the terminal
  { const tx = 900, tz = 128; building(tx - 7, tz - 7, tx + 7, tz + 7, 9, { mat: 'office', col: 0xc9ccd0, kind: 'o', clutter: false });
    cyl(tx, CURB + 9, CURB + 34, tz, 2.6, 'concrete', 0xc9c5bc, { seg: 14 }); cyl(tx, CURB + 34, CURB + 35, tz, 5.4, 'flat', 0x3a3f45, { seg: 14 });
    cyl(tx, CURB + 35, CURB + 39.5, tz, 5.1, 'glass', 0x6f9ab8, { seg: 14 }); cyl(tx, CURB + 35, CURB + 39.5, tz, 3.2, 'flat', 0x2a2f35, { nocol: true, seg: 10 });
    cyl(tx, CURB + 39.5, CURB + 40.6, tz, 5.8, 'flat', 0x3a3f45, { seg: 14 }); deco(tx - .12, tx + .12, CURB + 40.6, CURB + 47, tz - .12, tz + .12, 0x8a9096); AIRPORT.tower = { x: tx, z: tz, top: CURB + 47 }; }
  // the way airside from the airport road, past a gatehouse
  ground(LX + 6.5, 140, 935, 154, 'asphalt'); paint(LX + 6.5, 146.85, 935, 147.15, YEL, y1);
  addBox(LX + 9, LX + 13, CURB, CURB + 3, 155.5, 158.5, 'plaster', { col: 0xe3ded3 }); deco(LX + 8.7, LX + 13.3, CURB + 3, CURB + 3.3, 155.2, 158.8, 0x2a2c30);
  deco(LX + 13.3, LX + 13.5, CURB + .9, CURB + 6.5, 154.6, 154.8, 0xd23a2a);                                          // the barrier, up
  // the cargo shed and its yard
  building(886, 418, 944, 484, 12, { mat: 'corr', col: 0xb9c0c6, kind: 'i', clutter: false, parapet: false }); sign('CALDER AIR CARGO', 'gold', 944.1, CURB + 10, 451, 18, 1.6, 'e');
  for (let k = 0; k < 4; k++) deco(944, 944.15, CURB, CURB + 5.5, 428 + k * 14.5 - 3, 428 + k * 14.5 + 3, 0x5a6066);
  airliner(954, 404, 0x8c9299, 0x3a3f45); AIRPORT.stands.push(404);
  for (let k = 0; k < 5; k++) for (let q = 0; q < 2; q++) { const lv = R(); container(958 + q * 15, 440 + k * 13.4, false, 0); if (lv < .55) container(958 + q * 15, 440 + k * 13.4, false, 1); }
  // fuel farm, windsock, floodlights, the fence round it all
  [[1104, 46], [1104, 74]].forEach(q => { cyl(q[0], CURB, CURB + 8, q[1], 6.5, 'flat', 0xdcdad4, { seg: 18 }); cyl(q[0], CURB + 8, CURB + 8.6, q[1], 6.2, 'flat', 0xb8b4ac, { seg: 18, rTop: 5.2 }); FOOT.push([q[0] - 6.5, q[1] - 6.5, q[0] + 6.5, q[1] + 6.5, 'i']); });
  deco(1098 - .08, 1098 + .08, CURB, CURB + 7, 300 - .08, 300 + .08, 0xd8d6cc); { const g = new T.CylinderGeometry(.25, .55, 3, 8); g.rotateZ(PI / 2); SB('flat').geo(g, new T.Matrix4().makeTranslation(1099.5, CURB + 6.6, 300), colOf(0xff7a1a)); g.dispose(); }
  [[937, 138], [937, 386], [1000, 3], [1000, 517], [1028, 140], [1028, 390]].forEach(q => { addBox(q[0] - .3, q[0] + .3, CURB, CURB + 20, q[1] - .3, q[1] + .3, 'flat', { col: 0x6f7a80, a: false }); deco(q[0] - 1.6, q[0] + 1.6, CURB + 20, CURB + 21, q[1] - .5, q[1] + .5, 0x3a3f45); AIRPORT.masts.push([q[0], CURB + 20.5, q[1]]); });
  fence(ISLE.x0 + 1.2, ISLE.z0 + 1.2, ISLE.x0 + 1.2, z - BRIDGE.w, 2.2); fence(ISLE.x0 + 1.2, z + BRIDGE.w, ISLE.x0 + 1.2, ISLE.z1 - 1.2, 2.2);
  fence(ISLE.x0 + 1.2, ISLE.z0 + 1.2, ISLE.x1 - 1.2, ISLE.z0 + 1.2, 2.2); fence(ISLE.x0 + 1.2, ISLE.z1 - 1.2, ISLE.x1 - 1.2, ISLE.z1 - 1.2, 2.2); fence(ISLE.x1 - 1.2, ISLE.z0 + 1.2, ISLE.x1 - 1.2, ISLE.z1 - 1.2, 2.2);
  for (let k = 0; k < 9; k++) tree(rr(838, 855), rr(388, 500), rr(.8, 1.1)); for (let k = 0; k < 6; k++) tree(rr(838, 855), rr(24, 140), rr(.8, 1.1));
  // where people go: along the terminal kerb, over to the car parks, out to the pads and round to the cargo yard
  const kerb = []; for (let zz = 160; zz <= 378; zz += 21.8) kerb.push(navNode(LX + 10.2, CURB * 2, zz)); for (let i = 1; i < kerb.length; i++) navLink(kerb[i - 1], kerb[i], true);
  const near = (x, zz) => kerb.reduce((b, n) => Math.abs(NAV[n].z - zz) < Math.abs(NAV[b].z - zz) ? n : b, kerb[0]);
  [-1, 1].forEach((s, k) => { const zz = z + s * 8.25, a = navNode(LX - 9.5, CURB * 2, zz), lot = navNode(845, CURB, z + s * 60); navLink(bridgeEnds[k][1], a, true); navLink(a, near(0, zz), true); navLink(a, lot, true); });   // off the bridge, over the road, into the car parks
  const north = [navNode(LX + 10, CURB, 140), navNode(LX + 10, CURB, 112), navNode(LX + 10, CURB, 56), navNode(LX + 10, CURB, 18)], gate = navNode(910, CURB, 147), apronN = [navNode(948, CURB, 147), navNode(948, CURB, 112), navNode(948, CURB, 57), navNode(948, CURB, 22)];
  navLink(kerb[0], north[0], true); for (let i = 1; i < 4; i++) { navLink(north[i - 1], north[i], true); navLink(apronN[i - 1], apronN[i], true); } navLink(north[0], gate, true); navLink(gate, apronN[0], true); navLink(north[2], navNode(910, CURB, 57), true); navLink(NAV.length - 1, apronN[2], true);
  const south = [navNode(LX + 10, CURB, 400), navNode(LX + 10, CURB, 496)], apronS = [navNode(950, CURB, 394), navNode(950, CURB, 496)]; navLink(kerb[kerb.length - 1], south[0], true); navLink(south[0], south[1], true); navLink(south[0], apronS[0], true); navLink(apronS[0], apronS[1], true); navLink(south[1], apronS[1], true);
  // people waiting at the kerb with their bags, a coffee cart, benches against the glass
  [186, 228, 302, 344].forEach(zz => POI.push({ k: 'wait', x: LX + 9.6, z: zz, y: CURB * 2, yaw: PI / 2, cap: 3 }));
  addBox(LX + 11.2, LX + 12.6, CURB * 2, CURB * 2 + 1.1, 263.5, 266.5, 'flat', { col: 0x2f5d3a, a: false }); deco(LX + 11, LX + 12.8, CURB * 2 + 2.3, CURB * 2 + 2.4, 263.2, 266.8, 0xf2efe6);
  POI.push({ k: 'post', role: 1, x: LX + 13.3, z: 265, y: CURB * 2, yaw: PI / 2, name: 'Vendor' }, { k: 'browse', x: LX + 9.6, z: 265, y: CURB * 2, yaw: -PI / 2, cap: 2 });
  [178, 210, 320, 352].forEach(zz => { addBox(TERM.x0 - 1.1, TERM.x0 - .6, CURB * 2, CURB * 2 + .45, zz - .9, zz + .9, 'flat', { col: 0x6a6e73, a: false, s: false, n: false }); POI.push({ k: 'sit', x: TERM.x0 - .85, z: zz, y: CURB * 2, ax: false, cap: 2 }); });
  POI.push({ k: 'hang', x: 852, z: 256, cap: 3 }, { k: 'hang', x: 950, z: 150, cap: 2 }, { k: 'work', role: 2, x: 950, z: 396, bx: 950, bz: 494 });
}
