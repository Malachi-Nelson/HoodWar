/* ---------------------------------------------------------------------
   4c. Landmarks: the ten turfs, the four crew yards, and the blocks that give the city its shape.
   --------------------------------------------------------------------- */
// a stall under an awning: the counter faces `face`, the vendor works behind it, customers stop in front
function stall(x, z, face, col) {
  const d = FACE[face], ax = d[0] !== 0, lo = (a, b) => Math.min(a, b), hi = (a, b) => Math.max(a, b);
  addBox(x - (ax ? .45 : 1.5), x + (ax ? .45 : 1.5), CURB, CURB + 1, z - (ax ? 1.5 : .45), z + (ax ? 1.5 : .45), 'flat', { col: 0x6a4d33, a: false });
  const ux = ax ? [x - d[0] * 2, x + d[0] * .7] : [x - 1.7, x + 1.7], uz = ax ? [z - 1.7, z + 1.7] : [z - d[1] * 2, z + d[1] * .7];
  [[ux[0], uz[0]], [ux[1], uz[0]], [ux[0], uz[1]], [ux[1], uz[1]]].forEach(q => deco(q[0] - .05, q[0] + .05, CURB, CURB + 2.5, q[1] - .05, q[1] + .05, 0x8a9096));
  deco(lo(ux[0], ux[1]) - .3, hi(ux[0], ux[1]) + .3, CURB + 2.5, CURB + 2.62, lo(uz[0], uz[1]) - .3, hi(uz[0], uz[1]) + .3, col);
  for (let k = -1; k <= 1; k++) { const gx = ax ? x : x + k * .95, gz = ax ? z + k * .95 : z; deco(gx - .32, gx + .32, CURB + 1, CURB + 1.2 + WP() * .15, gz - .32, gz + .32, pick(WP, [0xb3261e, 0xd9a521, 0x1d6b45, 0xc85a1c, 0x6b3fa0, 0xe8e4da])); }
  POI.push({ k: 'post', role: 1, x: x - d[0] * 1.15, z: z - d[1] * 1.15, yaw: yawOf(d[0], d[1]), name: 'Vendor' }, { k: 'browse', x: x + d[0] * 1.35, z: z + d[1] * 1.35, yaw: yawOf(-d[0], -d[1]), cap: 2 });
}
// a food cart under an umbrella, with someone selling from it
function cart(x, z, face, text, style) {
  const d = FACE[face], ax = d[0] !== 0;
  addBox(x - (ax ? .6 : 1), x + (ax ? .6 : 1), CURB, CURB + 1.15, z - (ax ? 1 : .6), z + (ax ? 1 : .6), 'flat', { col: 0xd8d6cc, a: false });
  deco(x - .04, x + .04, CURB + 1.15, CURB + 2.5, z - .04, z + .04, 0x8a9096); cyl(x, CURB + 2.35, CURB + 2.9, z, 1.6, 'flat', pick(WP, [0xa3221b, 0x15467a, 0xd9a521, 0x1d5c3a]), { nocol: true, rTop: .08, seg: 8 });
  sign(text, style, x + d[0] * (ax ? .63 : 0), CURB + .68, z + d[1] * (ax ? 0 : .63), 1.7, .5, face); if (style !== 'cyan') GRILLS.push([x, z]);
  POI.push({ k: 'post', role: 1, x: x - d[0] * 1.2, z: z - d[1] * 1.2, yaw: yawOf(d[0], d[1]), name: 'Vendor' }, { k: 'browse', x: x + d[0] * 1.55, z: z + d[1] * 1.55, yaw: yawOf(-d[0], -d[1]), cap: 2 });
}
// a speaker on a crate: music for whoever is near, and people who stop to move to it
function boombox(x, z, station) { addBox(x - .35, x + .35, CURB, CURB + .6, z - .35, z + .35, 'flat', { col: 0x7a5c3a, a: false, n: false }); deco(x - .3, x + .3, CURB + .6, CURB + .92, z - .14, z + .14, 0x1c1e20); deco(x - .22, x - .06, CURB + .66, CURB + .86, z + .14, z + .16, 0x8a9096); deco(x + .06, x + .22, CURB + .66, CURB + .86, z + .14, z + .16, 0x8a9096); SPEAKERS.push({ x, z, st: station }); POI.push({ k: 'dance', x, z: z + 1.9, cap: 3 }); }
function rectLine(x0, z0, x1, z1, t, col, y) { paint(x0, z0, x1, z0 + t, col, y); paint(x0, z1 - t, x1, z1, col, y); paint(x0, z0 + t, x0 + t, z1 - t, col, y); paint(x1 - t, z0 + t, x1, z1 - t, col, y); }
function hoop(x, z, dir) {
  addBox(x - .12, x + .12, CURB, CURB + 3.6, z - .12, z + .12, 'flat', { col: 0x3a3d40, a: false, n: false });
  const bx = x + dir * 1.1, rx = x + dir * 1.6;
  deco(Math.min(x, bx), Math.max(x, bx), CURB + 3.4, CURB + 3.55, z - .06, z + .06, 0x3a3d40);
  deco(bx - .04, bx + .04, CURB + 2.9, CURB + 3.95, z - .9, z + .9, 0xe8e4da);
  deco(Math.min(bx, rx), Math.max(bx, rx), CURB + 3.03, CURB + 3.07, z - .23, z + .23, 0xd9541c);
}
function parkingRow(x0, z, n, pitch, yaw, len) { for (let k = 0; k <= n; k++) paint(x0 + k * pitch - .07, z - len / 2, x0 + k * pitch + .07, z + len / 2, WHT, CURB); const out = []; for (let k = 0; k < n; k++) { const s = { x: x0 + (k + .5) * pitch, z, yaw, lot: true }; PARK.push(s); out.push(s); } return out; }
function pylon(x, z, text, style, h) { [-1.3, 1.3].forEach(o => addBox(x + o - .15, x + o + .15, CURB, CURB + h, z - .15, z + .15, 'flat', { col: 0x30363a, a: false, n: false })); deco(x - 2.6, x + 2.6, CURB + h - 2.4, CURB + h, z - .22, z + .22, 0x1c1e20); sign(text, style, x, CURB + h - 1.2, z + .24, 5, 2.1, 's'); sign(text, style, x, CURB + h - 1.2, z - .24, 5, 2.1, 'n'); }
function billboard(x, z, y, text, style, face) { const ns = face === 'n' || face === 's'; if (ns) { deco(x - 5.2, x + 5.2, y + 1.2, y + 5, z - .15, z + .15, 0x25282b); [-3.5, 3.5].forEach(o => deco(x + o - .12, x + o + .12, y, y + 1.2, z - .12, z + .12, 0x25282b)); sign(text, style, x, y + 3.1, z + FACE[face][1] * .17, 10, 3.5, face); }
  else { deco(x - .15, x + .15, y + 1.2, y + 5, z - 5.2, z + 5.2, 0x25282b); [-3.5, 3.5].forEach(o => deco(x - .12, x + .12, y, y + 1.2, z + o - .12, z + o + .12, 0x25282b)); sign(text, style, x + FACE[face][0] * .17, y + 3.1, z, 10, 3.5, face); } }

// A — the courts
function genCourts(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'grass');
  const cx = L.cx, cz = L.cz;
  [[cx - 29.5, cx - 1.5], [cx + 1.5, cx + 29.5]].forEach(c => {
    ground(c[0] - 1.5, cz - 9, c[1] + 1.5, cz + 9, 'court'); const y = CURB + .01;
    rectLine(c[0], cz - 7.5, c[1], cz + 7.5, .1, WHT, y); paint((c[0] + c[1]) / 2 - .05, cz - 7.5, (c[0] + c[1]) / 2 + .05, cz + 7.5, WHT, y); rectLine((c[0] + c[1]) / 2 - 1.8, cz - 1.8, (c[0] + c[1]) / 2 + 1.8, cz + 1.8, .1, WHT, y);
    rectLine(c[0], cz - 2.45, c[0] + 5.8, cz + 2.45, .1, WHT, y); rectLine(c[1] - 5.8, cz - 2.45, c[1], cz + 2.45, .1, WHT, y);
    hoop(c[0] - .6, cz, 1); hoop(c[1] + .6, cz, -1);
  });
  const fx0 = cx - 32, fx1 = cx + 32, fz0 = cz - 10, fz1 = cz + 10, H = 3.2;                       // chain-link cage with a gap on each side
  fence(fx0, fz0, cx - 3, fz0, H, 'link'); fence(cx + 3, fz0, fx1, fz0, H, 'link'); fence(fx0, fz1, cx - 3, fz1, H, 'link'); fence(cx + 3, fz1, fx1, fz1, H, 'link');
  fence(fx0, fz0, fx0, cz - 2.5, H, 'link'); fence(fx0, cz + 2.5, fx0, fz1, H, 'link'); fence(fx1, fz0, fx1, cz - 2.5, H, 'link'); fence(fx1, cz + 2.5, fx1, fz1, H, 'link');
  for (let k = 0; k < 3; k++) { addBox(cx - 26, cx - 8, CURB, CURB + .4 * (k + 1), fz0 - 5 + k * 1.1, fz0 - 3.9 + k * 1.1, 'flat', { col: 0x9aa0a3, a: false, n: false }); addBox(cx + 8, cx + 26, CURB, CURB + .4 * (k + 1), fz0 - 5 + k * 1.1, fz0 - 3.9 + k * 1.1, 'flat', { col: 0x9aa0a3, a: false, n: false }); }
  building(L.x0 + 3, L.z1 - 16, L.x0 + 25, L.z1 - 3, 5, { mat: 'brick2', col: 0xb5694f }); sign('EMBER ROW REC CENTER', 'white', L.x0 + 14, CURB + 4, L.z1 - 16.08, 12, 1.1, 'n'); sign('EMBER ROW', 'tagE', L.x0 + 25.08, CURB + 2.2, L.z1 - 9.5, 8, 2, 'e');
  ground(L.x1 - 22, L.z1 - 18, L.x1 - 4, L.z1 - 4, 'dirt');                                           // playground
  deco(L.x1 - 19, L.x1 - 18.8, CURB, CURB + 2.6, L.z1 - 15, L.z1 - 14.8, 0xb3261e); deco(L.x1 - 13, L.x1 - 12.8, CURB, CURB + 2.6, L.z1 - 15, L.z1 - 14.8, 0xb3261e); deco(L.x1 - 19, L.x1 - 12.8, CURB + 2.6, CURB + 2.75, L.z1 - 15, L.z1 - 14.8, 0xb3261e);
  addBox(L.x1 - 10, L.x1 - 7, CURB, CURB + 1.5, L.z1 - 10, L.z1 - 7, 'flat', { col: 0xd9a521, a: false }); addBox(L.x1 - 7, L.x1 - 4.4, CURB, CURB + .7, L.z1 - 9.3, L.z1 - 7.7, 'flat', { col: 0x1f4e8c, a: false, n: false });
  [[L.x0 + 5, L.z0 + 5], [L.x0 + 22, L.z0 + 4], [cx, L.z0 + 4], [L.x1 - 22, L.z0 + 5], [L.x1 - 5, L.z0 + 6], [L.x0 + 4, cz - 14], [L.x1 - 4, cz - 12], [L.x1 - 5, cz + 12], [cx - 6, L.z1 - 5], [cx + 14, L.z1 - 6], [L.x0 + 34, L.z1 - 6]].forEach(q => tree(q[0] + wr(-1, 1), q[1] + wr(-1, 1), wr(1, 1.4)));
  ground(cx - 1.5, L.z0, cx + 1.5, fz0, 'plaza'); ground(cx - 1.5, fz1, cx + 1.5, L.z1, 'plaza'); ground(L.x0, cz - 1.5, fx0, cz + 1.5, 'plaza'); ground(fx1, cz - 1.5, L.x1, cz + 1.5, 'plaza');
  bench(cx - 5, fz1 + 3, true); bench(cx + 5, fz1 + 3, true); bench(L.x0 + 4, cz + 4, false);
  POI.push({ k: 'hoop', x: cx - 28.5, z: cz, dir: 1, cap: 3 }, { k: 'hoop', x: cx + 28.5, z: cz, dir: -1, cap: 3 }, { k: 'hang', x: cx - 17, z: fz0 - 6.2, cap: 3 }, { k: 'hang', x: cx + 17, z: fz1 + 4, cap: 3 });
  cart(cx + 9, fz1 + 6.5, 'n', 'ICE · WATER', 'cyan'); ROOSTS.push([L.x1 - 14, L.z1 - 11]);
  ZONES.push({ id: 'A', name: 'The Courts', x: cx, z: cz, r: 17 });
  navNode(cx, CURB, cz); navNode(cx, CURB, fz0 - 1.5); navNode(cx, CURB, fz1 + 1.5); navNode(fx0 - 1.5, CURB, cz); navNode(fx1 + 1.5, CURB, cz);
  navNode(cx - 16, CURB, cz + 4); navNode(cx + 16, CURB, cz - 4); navNode(L.x0 + 3, CURB, L.z0 + 3); navNode(L.x1 - 3, CURB, L.z0 + 3); navNode(L.x1 - 3, CURB, L.z1 - 2); navNode(L.x0 + 28, CURB, L.z1 - 2);
}
// the crew yards: where each side spawns, arms up, and keeps its cars
function carport(x0, z0, x1, z1, col) { [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(q => addBox(q[0] - .12, q[0] + .12, CURB, CURB + 3, q[1] - .12, q[1] + .12, 'flat', { col: 0x30363a, a: false, n: false })); deco(x0 - .5, x1 + .5, CURB + 3, CURB + 3.2, z0 - .5, z1 + .5, col); }
function genEmberBase(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  building(L.x0 + 5, L.z0 + 5, L.x0 + 31, L.z0 + 25, 7.4, { mat: 'brick', col: 0x8a3f2c, tank: true, kind: 'e' });
  sign('EMBER ROW', 'ember', L.x0 + 18, CURB + 5.6, L.z0 + 25.08, 13, 2.2, 's'); sign('EMBER ROW', 'tagE', L.x0 + 31.08, CURB + 2.4, L.z0 + 15, 10, 2.6, 'e'); sign('WEST SIDE', 'tagW', L.x0 + 10, CURB + 2, L.z0 + 25.08, 6, 1.5, 's');
  deco(L.x0 + 17, L.x0 + 19, CURB, CURB + 2.4, L.z0 + 25, L.z0 + 25.06, 0x2a1a14);
  building(L.x1 - 24, L.z0 + 4, L.x1 - 4, L.z0 + 16, 4.4, { mat: 'brick2', col: 0x9c5a47, kind: 'e' }); sign('E.R. AUTO', 'ember', L.x1 - 14, CURB + 3.6, L.z0 + 16.08, 8, 1, 's'); deco(L.x1 - 17, L.x1 - 11, CURB, CURB + 3, L.z0 + 16, L.z0 + 16.06, 0x55595e);
  carport(L.x0 + 6, L.z1 - 14.5, L.x0 + 27, L.z1 - 6.5, CREWS[0].dark);
  [L.z0 + 5, L.z0 + 18, L.z1 - 9].forEach(z => BASECARS[0].push({ x: L.x1 + WALK + 1.15, z, yaw: PI }));        // the crew's cars wait at the kerb outside the east gate
  BASECARS[0].push({ x: L.x0 + 16.5, z: L.z1 - 10.5, yaw: -PI / 2, lot: true });
  const g = L.cz;                                                                                    // fenced yard: gates east and south
  fence(L.x0 + .4, L.z0 + .4, L.x1 - .4, L.z0 + .4, 2.8, 'link'); fence(L.x0 + .4, L.z0 + .4, L.x0 + .4, L.z1 - .4, 2.8, 'link');
  fence(L.x1 - .4, L.z0 + .4, L.x1 - .4, g - 5, 2.8, 'link'); fence(L.x1 - .4, g + 5, L.x1 - .4, L.z1 - .4, 2.8, 'link');
  fence(L.x0 + .4, L.z1 - .4, L.x0 + 38, L.z1 - .4, 2.8, 'link'); fence(L.x0 + 48, L.z1 - .4, L.x1 - .4, L.z1 - .4, 2.8, 'link');
  for (let k = 0; k < 8; k++) SPAWNS[0].push({ x: L.x0 + 37 + (k % 4) * 6, z: L.z0 + 30 + Math.floor(k / 4) * 7, yaw: -PI / 2 });
  SHOPS.push({ x: L.x0 + 33.5, z: L.z0 + 15, kind: 'gun', team: 0, name: 'Crew locker' }); GARAGES.push({ x: L.x1 - 14, z: L.z0 + 21, team: 0 });
  container(L.x1 - 8, L.z1 - 10, true, 0); crate(L.x0 + 64, L.z1 - 8, 1.4); crate(L.x0 + 66, L.z1 - 6.4, 1.1); barrier(L.x1 - 6, g - 8, false); barrier(L.x1 - 6, g + 8, false); hoop(L.x0 + 34, L.z1 - 20, 1);
  boombox(L.x0 + 60, L.z0 + 24, 1);
  for (let k = 0; k < 3; k++) cyl(L.x0 + 52 + k * 1.3, CURB, CURB + 1.1, L.z0 + 4, .45, 'flat', pick(W, [0xb3261e, 0x30363a, 0x1f4e8c]), { a: false, seg: 8 });
  navNode(L.x1 - 2, CURB, g); navNode(L.x0 + 43, CURB, L.z1 - 2); navNode(L.x0 + 46, CURB, g + 4); navNode(L.x0 + 36, CURB, L.z0 + 28); navNode(L.x1 - 14, CURB, L.z0 + 22);
}
function boat(x, z) { addBox(x - 1.3, x + 1.3, CURB + .7, CURB + 2, z - 3.6, z + 3.6, 'flat', { col: 0xe8e4da, a: false }); deco(x - 1, x + 1, CURB + 2, CURB + 3, z - 1.4, z + 1.2, 0x2f6f96); deco(x - 1.1, x + 1.1, CURB + .45, CURB + .7, z - 3.2, z + 4.4, 0x30363a); [-1.2, 1.2].forEach(o => deco(x + o - .15, x + o + .15, CURB, CURB + .7, z - .4, z + .4, 0x1c1e20)); }
function genTideBase(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  warehouse(L.x1 - 42, L.z0 + 5, L.x1 - 5, L.z0 + 27, 9.5, 's', { col: 0x2f6f96 });
  sign('TIDEWATER MARINE', 'tide', L.x1 - 23.5, CURB + 7.8, L.z0 + 27.08, 17, 2, 's'); sign('TIDEWATER', 'tagT', L.x1 - 42.08, CURB + 2.6, L.z0 + 16, 11, 2.6, 'w'); sign('DOCK SIDE', 'tagW', L.x1 - 34, CURB + 2.2, L.z0 + 4.92, 6, 1.5, 'n');
  boat(L.x0 + 8, L.z0 + 12); boat(L.x0 + 14, L.z0 + 13); boat(L.x0 + 24, L.z0 + 11);
  carport(L.x0 + 30, L.z1 - 14.5, L.x0 + 51, L.z1 - 6.5, CREWS[1].dark);
  [L.z0 + 5, L.z0 + 18, L.z1 - 9].forEach(z => BASECARS[1].push({ x: L.x0 - WALK - 1.15, z, yaw: 0 }));
  BASECARS[1].push({ x: L.x0 + 40.5, z: L.z1 - 10.5, yaw: PI / 2, lot: true });
  const g = L.cz;                                                                                    // gates west and south
  fence(L.x0 + .4, L.z0 + .4, L.x1 - .4, L.z0 + .4, 2.8, 'link'); fence(L.x1 - .4, L.z0 + .4, L.x1 - .4, L.z1 - .4, 2.8, 'link');
  fence(L.x0 + .4, L.z0 + .4, L.x0 + .4, g - 5, 2.8, 'link'); fence(L.x0 + .4, g + 5, L.x0 + .4, L.z1 - .4, 2.8, 'link');
  fence(L.x0 + .4, L.z1 - .4, L.x0 + 12, L.z1 - .4, 2.8, 'link'); fence(L.x0 + 22, L.z1 - .4, L.x1 - .4, L.z1 - .4, 2.8, 'link');
  for (let k = 0; k < 8; k++) SPAWNS[1].push({ x: L.x0 + 12 + (k % 4) * 6, z: L.z0 + 32 + Math.floor(k / 4) * 7, yaw: PI / 2 });
  SHOPS.push({ x: L.x1 - 44.5, z: L.z0 + 16, kind: 'gun', team: 1, name: 'Crew locker' }); GARAGES.push({ x: L.x1 - 12, z: L.z1 - 12, team: 1 });
  container(L.x1 - 10, L.z0 + 40, true, 0); container(L.x1 - 13.2, L.z0 + 40, true, 0); crate(L.x0 + 58, L.z1 - 8, 1.4); barrier(L.x0 + 6, g - 8, false); barrier(L.x0 + 6, g + 8, false);
  boombox(L.x0 + 34, L.z0 + 30, 0);
  for (let k = 0; k < 3; k++) cyl(L.x0 + 30 + k * 1.3, CURB, CURB + 1.1, L.z0 + 4, .45, 'flat', pick(W, [0x1f4e8c, 0x30363a, 0xd9a521]), { a: false, seg: 8 });
  navNode(L.x0 + 2, CURB, g); navNode(L.x0 + 17, CURB, L.z1 - 2); navNode(L.x0 + 24, CURB, g + 4); navNode(L.x1 - 46, CURB, L.z0 + 30); navNode(L.x1 - 14, CURB, L.z1 - 16);
}
// The two newer crews keep the same kind of yard as the first two: a clubhouse, a workshop, a carport, a fence with two gates.
// `flip` mirrors it east to west, so its street gate can face the middle of town from either side.
function genYard(L, t, flip, o) {
  const C = CREWS[t], X = d => flip ? L.x1 - d : L.x0 + d, bx = (a, b) => [Math.min(X(a), X(b)), Math.max(X(a), X(b))], sd = flip ? -1 : 1, name = C.name.toUpperCase();
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  { const b = bx(5, 31); building(b[0], L.z0 + 5, b[1], L.z0 + 25, o.h, { mat: o.mat, col: o.col, tank: !flip, kind: o.kind }); }
  sign(name, o.style, X(18), CURB + 5.6, L.z0 + 25.08, 13, 2.2, 's'); sign(name, o.tag, X(31) + sd * .08, CURB + 2.4, L.z0 + 15, 10, 2.6, flip ? 'w' : 'e'); sign(o.motto, 'tagW', X(10), CURB + 2, L.z0 + 25.08, 6, 1.5, 's');
  deco(X(18) - 1, X(18) + 1, CURB, CURB + 2.4, L.z0 + 25, L.z0 + 25.06, 0x1c1a18);
  { const b = bx(56, 76); building(b[0], L.z0 + 4, b[1], L.z0 + 16, 4.4, { mat: 'brick2', col: o.col2, kind: o.kind }); sign(o.shop, o.style, X(66), CURB + 3.6, L.z0 + 16.08, 8, 1, 's'); deco(X(66) - 3, X(66) + 3, CURB, CURB + 3, L.z0 + 16, L.z0 + 16.06, 0x55595e); }
  { const b = bx(6, 27); carport(b[0], L.z1 - 14.5, b[1], L.z1 - 6.5, C.dark); }
  const kerb = flip ? L.x0 - WALK - 1.15 : L.x1 + WALK + 1.15;                                        // the crew's cars wait at the kerb outside the street gate
  [L.z0 + 5, L.z0 + 18, L.z1 - 9].forEach(z => BASECARS[t].push({ x: kerb, z, yaw: flip ? 0 : PI }));
  BASECARS[t].push({ x: X(16.5), z: L.z1 - 10.5, yaw: flip ? PI / 2 : -PI / 2, lot: true });
  const g = L.cz, back = flip ? L.x1 - .4 : L.x0 + .4, front = flip ? L.x0 + .4 : L.x1 - .4;
  fence(L.x0 + .4, L.z0 + .4, L.x1 - .4, L.z0 + .4, 2.8, 'link'); fence(back, L.z0 + .4, back, L.z1 - .4, 2.8, 'link');
  fence(front, L.z0 + .4, front, g - 5, 2.8, 'link'); fence(front, g + 5, front, L.z1 - .4, 2.8, 'link');
  { const a = bx(.4, 38), b = bx(48, 79.6); fence(a[0], L.z1 - .4, a[1], L.z1 - .4, 2.8, 'link'); fence(b[0], L.z1 - .4, b[1], L.z1 - .4, 2.8, 'link'); }
  for (let k = 0; k < 8; k++) SPAWNS[t].push({ x: X(37 + (k % 4) * 6), z: L.z0 + 30 + Math.floor(k / 4) * 7, yaw: flip ? PI / 2 : -PI / 2 });
  SHOPS.push({ x: X(33.5), z: L.z0 + 15, kind: 'gun', team: t, name: 'Crew locker' }); GARAGES.push({ x: X(66), z: L.z0 + 21, team: t });
  container(X(72), L.z1 - 10, true, 0); crate(X(64), L.z1 - 8, 1.4); crate(X(66), L.z1 - 6.4, 1.1); barrier(X(74), g - 8, false); barrier(X(74), g + 8, false);
  for (let k = 0; k < 3; k++) cyl(X(52 + k * 1.3), CURB, CURB + 1.1, L.z0 + 4, .45, 'flat', pick(W, [C.dark, 0x30363a, 0x8c9299]), { a: false, seg: 8 });
  boombox(X(60), L.z0 + 25, o.station);
  navNode(X(78), CURB, g); navNode(X(43), CURB, L.z1 - 2); navNode(X(46), CURB, g + 4); navNode(X(36), CURB, L.z0 + 28); navNode(X(66), CURB, L.z0 + 22);
}
// G — Uptown Market: a square of stalls under awnings, with a row of shops behind
function genMarket(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'plaza');
  terrace(L, 'n', { shops: 1, full: true, clean: true });
  const zc = L.z0 + 43, AW = [0xa3221b, 0x1d5c3a, 0x15467a, 0xd9a521, 0x7a3a8a, 0xc85a1c];
  [13, 26, 54, 67].forEach((o, k) => stall(L.x0 + o, L.z0 + 25.6, 's', AW[k]));
  [35, 51].forEach((o, k) => { stall(L.x0 + 5.6, L.z0 + o, 'e', AW[k + 4]); stall(L.x1 - 5.6, L.z0 + o, 'w', AW[k + 1]); });
  cart(L.cx + 21, L.z1 - 4.5, 'n', 'ROASTED CORN', 'gold');
  [[L.x0 + 20, L.z0 + 31], [L.x1 - 20, L.z0 + 31], [L.x0 + 15, L.z1 - 6], [L.x1 - 13, L.z1 - 12]].forEach(q => { crate(q[0], q[1], 1.1); crate(q[0] + 1.2, q[1] + .3, .8); });
  planter(L.x0 + 12, L.z1 - 13, 1.2); planter(L.cx - 14, L.z1 - 3, 1.2); bench(L.cx - 6, L.z1 - 4, true); bench(L.cx + 8, L.z1 - 4, true); bench(L.cx, L.z0 + 27, true);
  sign('UPTOWN MARKET', 'green', L.cx, CURB + 3.3, L.z0 + 21.06, 12, 1.4, 's'); sign('NORTHGATE', 'tagN', L.cx - 24, CURB + 2.2, L.z0 + 21.06, 8, 2, 's');
  boombox(L.cx + 12, L.z0 + 30, 1); POI.push({ k: 'hang', x: L.cx - 12, z: zc + 9, cap: 4 }, { k: 'hang', x: L.cx + 15, z: zc - 3, cap: 3 }, { k: 'hang', x: L.cx - 20, z: zc - 6, cap: 3 }); ROOSTS.push([L.cx - 4, zc + 2], [L.cx + 8, L.z1 - 9]);
  ZONES.push({ id: 'G', name: 'Uptown Market', x: L.cx, z: zc, r: 15 });
  navNode(L.cx, CURB, zc); navNode(L.cx - 19, CURB, zc); navNode(L.cx + 19, CURB, zc); navNode(L.cx, CURB, L.z1 - 2); navNode(L.cx - 24, CURB, L.z0 + 30); navNode(L.cx + 24, CURB, L.z0 + 30); navNode(L.x0 + 2, CURB, zc); navNode(L.x1 - 2, CURB, zc);
}
// B — the corner store and its lot
function genCorner(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'plaza');
  const sx0 = L.x1 - 24, sx1 = L.x1 - 2, sz0 = L.z0 + 2, sz1 = L.z0 + 16, y = CURB, H = 4.4, t = .3, wc = { col: 0xd9c9a8 };
  wall('x', sz0, sz0 + t, sx0, sx1, y, y + H, [], 'plaster', wc);
  wall('x', sz1 - t, sz1, sx0, sx1, y, y + H, [[sx0 + 8, sx0 + 10.8, 0, 2.6]], 'plaster', wc);
  wall('z', sx0, sx0 + t, sz0 + t, sz1 - t, y, y + H, [], 'plaster', wc);
  wall('z', sx1 - t, sx1, sz0 + t, sz1 - t, y, y + H, [[sz0 + 4, sz0 + 10, 1, 3]], 'plaster', wc);
  addBox(sx1 - .2, sx1 - .1, y + 1, y + 3, sz0 + 4, sz0 + 10, 'glass', { a: false, s: false });
  addBox(sx0 - .4, sx1 + .4, y + H, y + H + .45, sz0 - .4, sz1 + .4, 'roof', { top: 'roof', tcol: 0x9aa0a3 }); FOOT.push([sx0, sz0, sx1, sz1, 's']);
  ground(sx0 + t, sz0 + t, sx1 - t, sz1 - t, 'tile');
  addBox(sx0 + 1.2, sx0 + 6.4, y, y + 1.1, sz0 + 1.8, sz0 + 2.7, 'flat', { col: 0x5a4636, a: false }); deco(sx0 + 1.2, sx0 + 2, y + 1.1, y + 1.5, sz0 + 1.9, sz0 + 2.6, 0x25282b);
  ROBS.push({ x: sx0 + 3.8, z: sz0 + 3.7, name: 'Calder Food & Liquor' }); POI.push({ k: 'post', role: 1, x: sx0 + 3.8, z: sz0 + 1.05, yaw: PI, name: 'Clerk', rob: ROBS.length - 1 }, { k: 'browse', x: sx0 + 14.2, z: sz0 + 8, yaw: PI / 2, cap: 1 }, { k: 'browse', x: sx0 + 17.5, z: sz0 + 5, yaw: -PI / 2, cap: 1 });
  [12.5, 15.8, 19.1].forEach(o => { addBox(sx0 + o - .4, sx0 + o + .4, y, y + 1.7, sz0 + 2.6, sz1 - 3.6, 'flat', { col: 0x9aa0a3, a: false }); [.5, .95, 1.4].forEach((h, i) => deco(sx0 + o - .44, sx0 + o + .44, y + h, y + h + .28, sz0 + 2.7, sz1 - 3.7, [0xb3261e, 0xd9a521, 0x1f4e8c][i])); });
  addBox(sx0 + 8.5, sx1 - 1, y, y + 2.2, sz0 + t, sz0 + t + .7, 'flat', { col: 0x30363a, a: false }); addBox(sx0 + 8.7, sx1 - 1.2, y + .3, y + 2, sz0 + t + .7, sz0 + t + .74, 'glow', { nocol: true, col: 0xbfe9ff });
  addBox(sx0 + 2, sx1 - 2, y + H - .12, y + H - .06, sz0 + 6.6, sz0 + 7.4, 'glow', { nocol: true, col: 0xfff3d6 });
  sign('CALDER FOOD & LIQUOR', 'red', (sx0 + sx1) / 2, y + 3.6, sz0 - .06, 15, 1.3, 'n'); sign('CALDER FOOD & LIQUOR', 'red', sx1 + .06, y + 3.6, (sz0 + sz1) / 2 + 3.6, 6.5, 1.1, 'e'); sign('CALDER FOOD & LIQUOR', 'red', sx0 + 14.5, y + 3.6, sz1 + .06, 10, 1.1, 's');
  sign('COLD BEER', 'neon', sx0 + 4, y + 2.6, sz1 + .06, 3, .7, 's'); sign('LOTTO', 'cyan', sx0 + 12.6, y + 2.6, sz1 + .06, 2.2, .7, 's'); sign('ATM', 'green', sx1 + .06, y + 2.2, sz0 + 12.4, 1.8, .7, 'e');
  ground(L.x0 + 32, sz1 + .5, L.x1, L.z0 + 41, 'lot');
  parkingRow(L.x0 + 36, L.z0 + 37.5, 5, 3.4, 0, 5.4);
  barrier(L.x1 - 30, L.z0 + 22, true); barrier(L.x1 - 12, L.z0 + 30, false); dumpster(sx0 - 1.6, sz0 + 5, false); crate(sx0 - 1.8, sz0 + 9, 1.2);
  addBox(sx0 + 12.2, sx0 + 13, y, y + 1.9, sz1 + .1, sz1 + .9, 'flat', { col: 0xe8e4da, a: false, n: false });                           // ice chest by the door
  building(L.x0 + 2, L.z0 + 2, L.x0 + 30, L.z0 + 20, 4.6, { mat: 'brick2', shop: true }); sign('LUCKY 7 LAUNDROMAT', 'blue', L.x0 + 16, y + 3.5, L.z0 + 1.94, 12, 1, 'n'); sign('OPEN 24 HRS', 'neon', L.x0 + 30.06, y + 3, L.z0 + 11, 5, .9, 'e');
  terrace(L, 's', { shops: .8, full: true });
  { const bx = L.x0 + 52, bz = L.z0 - 1.2; deco(bx - 2, bx + 2, y + 2.4, y + 2.5, bz - .8, bz + .8, 0x30363a); addBox(bx - 2, bx + 2, y, y + 2.4, bz + .7, bz + .76, 'glass', { a: false, s: false, n: false }); bench(bx, bz + .2, true); prop('sign', bx + 2.6, bz - 1.2); }
  POI.push({ k: 'hang', x: sx0 + 5, z: sz1 + 2.2, cap: 4 }, { k: 'hang', x: L.x0 + 31.5, z: L.z0 + 23, cap: 3 }, { k: 'wait', x: L.x0 + 53.6, z: L.z0 - 1.5, yaw: 0, cap: 2 }); cart(L.x1 - 40, L.z0 + 22, 's', 'TACOS', 'red'); ROOSTS.push([L.x0 + 40, L.z0 + 30]);
  ZONES.push({ id: 'B', name: 'The Corner', x: L.x1 - 26, z: L.z0 + 28, r: 16 });
  navNode(L.x1 - 26, CURB, L.z0 + 28); navNode(sx0 + 9.4, CURB, sz1 + 1.4); navNode(sx0 + 9.4, CURB, sz1 - 2.2); navNode(sx0 + 4, CURB, sz0 + 6); navNode(sx1 - 2.2, CURB, sz0 + 11.5);
  navNode(L.x0 + 34, CURB, L.z0 + 24); navNode(L.x0 + 20, CURB, L.z0 + 31); navNode(L.x1 - 2, CURB, L.z0 + 32); navNode(L.x0 + 2, CURB, L.z0 + 30); navNode(L.cx, CURB, L.z0 + 42);
}
function genStrip(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  building(L.x0 + 2, L.z0 + 2, L.x1 - 2, L.z0 + 16, 5, { mat: 'brick2', shop: true, col: 0xc7a17e }); shopFront(L.x0 + 18, L.x1 - 20, L.z0 + 16, 's');
  building(L.x0 + 2, L.z0 + 16, L.x0 + 16, L.z1 - 14, 5, { mat: 'brick2', shop: true, col: 0xc7a17e }); shopFrontX(L.z0 + 18, L.z1 - 16, L.x0 + 16, 'e');
  sign('PAWN · GUNS · GOLD', 'gold', L.x1 - 11, CURB + 3.45, L.z0 + 16.1, 12, 1.1, 's'); sign('WE BUY ANYTHING', 'neon', L.x1 - 11, CURB + 2.4, L.z0 + 16.1, 6, .7, 's');
  SHOPS.push({ x: L.x1 - 11, z: L.z0 + 18.4, kind: 'gun', name: 'Pawn & Guns' });
  parkingRow(L.x0 + 26, L.z0 + 27, 7, 3.4, PI, 5.4); parkingRow(L.x0 + 26, L.z1 - 16, 7, 3.4, 0, 5.4);
  pylon(L.x1 - 5, L.z1 - 4, 'LAKESIDE PLAZA', 'blue', 9); barrier(L.x0 + 22, L.z0 + 36, false); dumpster(L.x0 + 18.4, L.z1 - 11, false);
  [[L.x0 + 24, L.z0 + 21], [L.x1 - 26, L.z0 + 21]].forEach(q => planter(q[0], q[1], 1.2));
  POI.push({ k: 'hang', x: L.x1 - 16, z: L.z0 + 19.2, cap: 3 }, { k: 'browse', x: L.x0 + 34, z: L.z0 + 17.4, yaw: 0, cap: 2 }, { k: 'browse', x: L.x0 + 46, z: L.z0 + 17.4, yaw: 0, cap: 1 }, { k: 'browse', x: L.x0 + 17.4, z: L.cz, yaw: PI / 2, cap: 1 });
  navNode(L.cx + 8, CURB, L.cz + 6); navNode(L.x1 - 11, CURB, L.z0 + 19.5); navNode(L.x0 + 19, CURB, L.cz + 2); navNode(L.x1 - 2, CURB, L.cz + 10); navNode(L.cx, CURB, L.z1 - 2);
}
function genLibrary(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'grass'); ground(L.cx - 16, L.z0 + 34, L.cx + 16, L.z1, 'plaza');
  building(L.x0 + 14, L.z0 + 6, L.x1 - 14, L.z0 + 32, 11.4, { mat: 'office', col: 0xd9d2c0, kind: 'o', trim: 0xb9b4a8 });
  for (let k = 0; k < 6; k++) cyl(L.cx - 12.5 + k * 5, CURB + .9, CURB + 9.6, L.z0 + 35, .62, 'concrete', 0xe3ded3, { seg: 12, a: false });
  addBox(L.cx - 15, L.cx + 15, CURB + 9.6, CURB + 11.4, L.z0 + 32, L.z0 + 36.4, 'concrete', { col: 0xe3ded3 });
  for (let k = 0; k < 3; k++) addBox(L.cx - 15 - k * .0, L.cx + 15, CURB, CURB + .3 * (3 - k), L.z0 + 32, L.z0 + 36.4 + k * .7, 'concrete', { col: 0xcfcabd, a: false, n: false });
  sign('CALDER PUBLIC LIBRARY', 'white', L.cx, CURB + 10.5, L.z0 + 36.46, 18, 1.2, 's');
  [[L.x0 + 6, L.z0 + 40], [L.x0 + 7, L.z1 - 6], [L.x1 - 6, L.z0 + 42], [L.x1 - 7, L.z1 - 7], [L.x0 + 6, L.z0 + 12], [L.x1 - 6, L.z0 + 14], [L.cx - 24, L.z1 - 10], [L.cx + 24, L.z1 - 12]].forEach(q => tree(q[0], q[1], wr(1.1, 1.5)));
  bench(L.cx - 10, L.z1 - 8, true); bench(L.cx + 10, L.z1 - 8, true); planter(L.cx, L.z1 - 14, 1.6);
  POI.push({ k: 'hang', x: L.cx - 7, z: L.z0 + 40.5, cap: 3 }, { k: 'hang', x: L.cx + 12, z: L.z1 - 3, cap: 2 }); ROOSTS.push([L.cx + 5, L.z0 + 41], [L.cx - 12, L.z1 - 12]);
  navNode(L.cx, CURB, L.z1 - 6); navNode(L.cx - 20, CURB, L.z0 + 44); navNode(L.cx + 20, CURB, L.z0 + 44); navNode(L.x0 + 6, CURB, L.z0 + 28); navNode(L.x1 - 6, CURB, L.z0 + 28);
}
function genPark(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'grass'); ground(L.cx - 1.6, L.z0, L.cx + 1.6, L.z1, 'plaza'); ground(L.x0, L.cz - 1.6, L.x1, L.cz + 1.6, 'plaza');
  cyl(L.cx + 20, CURB, CURB + .06, L.cz - 14, 9, 'flat', 0x3f7f9a, { nocol: true, seg: 20 }); PATCH.push([L.cx + 12, L.cz - 22, L.cx + 28, L.cz - 6, 'water']);
  cyl(L.cx - 18, CURB, CURB + .5, L.cz + 14, 4.2, 'concrete', 0xb9b4a8, { seg: 8, a: false, n: false }); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; addBox(L.cx - 18 + Math.cos(a) * 3.7 - .1, L.cx - 18 + Math.cos(a) * 3.7 + .1, CURB + .5, CURB + 3.3, L.cz + 14 + Math.sin(a) * 3.7 - .1, L.cz + 14 + Math.sin(a) * 3.7 + .1, 'flat', { col: 0xe8e4da, a: false, n: false }); }
  cyl(L.cx - 18, CURB + 3.3, CURB + 5.2, L.cz + 14, 4.8, 'shingle', 0x7a5a4a, { nocol: true, rTop: .15, seg: 8 });
  addBox(L.cx - 1.1, L.cx + 1.1, CURB, CURB + 1.5, L.cz - 1.1, L.cz + 1.1, 'concrete', { col: 0xb9b4a8 }); addBox(L.cx - .45, L.cx + .45, CURB + 1.5, CURB + 6.5, L.cz - .45, L.cz + .45, 'concrete', { col: 0xcfcabd });
  for (let k = 0; k < 26; k++) { const x = wr(L.x0 + 3, L.x1 - 3), z = wr(L.z0 + 3, L.z1 - 3); if (Math.abs(x - L.cx) < 4 || Math.abs(z - L.cz) < 4 || hyp(x - L.cx - 20, z - L.cz + 14) < 11 || hyp(x - L.cx + 18, z - L.cz - 14) < 7) continue; tree(x, z, wr(1.1, 1.7)); }
  bench(L.cx + 3, L.cz - 12, false); bench(L.cx - 3, L.cz + 18, false); bench(L.cx - 22, L.cz - 3, true); bench(L.cx + 24, L.cz + 3, true);
  cart(L.cx - 5, L.cz - 5, 'e', 'PRETZELS', 'gold'); POI.push({ k: 'hang', x: L.cx - 18, z: L.cz + 14, cap: 4 }, { k: 'hang', x: L.cx + 10, z: L.cz + 8, cap: 3 }, { k: 'browse', x: L.cx + 20, z: L.cz - 3.6, yaw: 0, cap: 2 }); ROOSTS.push([L.cx + 6, L.cz + 3], [L.cx - 10, L.cz - 14], [L.cx + 22, L.cz + 14]);
  ZONES.push({ id: 'I', name: 'Founders Park', x: L.cx, z: L.cz, r: 17 });
  navNode(L.cx, CURB, L.cz - 3.2); navNode(L.cx + 3.2, CURB, L.cz); navNode(L.cx, CURB, L.z0 + 2); navNode(L.cx, CURB, L.z1 - 2); navNode(L.x0 + 2, CURB, L.cz); navNode(L.x1 - 2, CURB, L.cz); navNode(L.cx - 18, CURB, L.cz + 8.5);
}
function genProjects(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'grass'); ground(L.x0, L.cz + 14, L.x1, L.cz + 17, 'plaza'); ground(L.x1 - 31, L.z1 - 14, L.x1, L.z1, 'lot');
  const c = [0xc7a17e, 0xb9a48f, 0xa87860];
  building(L.x0 + 5, L.z0 + 5, L.x0 + 21, L.z0 + 43, 38.4, { mat: 'brick2', col: c[0], tank: true, kind: 'o' }); building(L.x0 + 31, L.z0 + 5, L.x0 + 47, L.z0 + 43, 35.2, { mat: 'brick2', col: c[1], tank: true, kind: 'o' }); building(L.x1 - 21, L.z0 + 5, L.x1 - 5, L.z0 + 43, 41.6, { mat: 'brick2', col: c[2], tank: true, kind: 'o' });
  parkingRow(L.x1 - 29, L.z1 - 7, 4, 3.4, 0, 5.4); hoop(L.x0 + 6, L.z1 - 8, 1); ground(L.x0 + 5, L.z1 - 13, L.x0 + 18, L.z1 - 3, 'court');
  dumpster(L.x0 + 26, L.z0 + 8, false); dumpster(L.x1 - 26, L.z0 + 9, false); bench(L.x0 + 26, L.cz + 19, true); bench(L.cx + 6, L.cz + 19, true);
  POI.push({ k: 'hoop', x: L.x0 + 7.6, z: L.z1 - 8, dir: 1, cap: 2 }, { k: 'hang', x: L.x0 + 26, z: L.z0 + 30, cap: 4 }, { k: 'hang', x: L.cx + 10, z: L.z0 + 24, cap: 3 }); boombox(L.cx - 4, L.cz + 21, 1);
  [[L.x0 + 26, L.z0 + 24], [L.cx + 10, L.z0 + 14], [L.cx + 10, L.z0 + 34], [L.x0 + 24, L.z1 - 6], [L.cx - 2, L.z1 - 6]].forEach(q => tree(q[0], q[1], 1.3));
  sign('EMBER ROW', 'tagE', L.x0 + 21.08, CURB + 2.2, L.z0 + 30, 9, 2.2, 'e'); sign('CALDER HOMES', 'white', L.x0 + 39, CURB + 3.4, L.z0 + 43.08, 9, 1, 's');
  navNode(L.x0 + 26, CURB, L.cz + 15.5); navNode(L.cx + 10, CURB, L.cz + 15.5); navNode(L.x0 + 26, CURB, L.z0 + 2.5); navNode(L.cx + 10, CURB, L.z0 + 2.5); navNode(L.x1 - 15, CURB, L.z1 - 16); navNode(L.x0 + 26, CURB, L.z1 - 2);
}
function genGas(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  const cx = L.cx + 4, z0 = L.z0 + 8;
  [[cx - 9, z0], [cx + 9, z0], [cx - 9, z0 + 12], [cx + 9, z0 + 12]].forEach(q => addBox(q[0] - .25, q[0] + .25, CURB, CURB + 4.8, q[1] - .25, q[1] + .25, 'flat', { col: 0xe8e4da, a: false, n: false }));
  deco(cx - 11, cx + 11, CURB + 4.8, CURB + 5.5, z0 - 2, z0 + 14, 0xe8e4da); deco(cx - 11.05, cx + 11.05, CURB + 4.95, CURB + 5.3, z0 - 2.05, z0 + 14.05, 0xb3261e, { faces: 15 });
  addBox(cx - 9.2, cx + 9.2, CURB + 4.72, CURB + 4.8, z0 + 4, z0 + 8, 'glow', { nocol: true, col: 0xfff3d6, faces: 32 });
  [z0 + 2, z0 + 10].forEach(z => { addBox(cx - 6, cx + 6, CURB, CURB + .22, z - .7, z + .7, 'concrete', { a: false, n: false }); [-4, 0, 4].forEach(o => { addBox(cx + o - .4, cx + o + .4, CURB + .22, CURB + 1.9, z - .3, z + .3, 'flat', { col: 0xb3261e, a: false }); deco(cx + o - .32, cx + o + .32, CURB + 1.2, CURB + 1.7, z - .33, z + .33, 0x1c1e20); }); });
  building(L.x0 + 4, L.z0 + 4, L.x0 + 18, L.z0 + 16, 4.2, { mat: 'brick2', shop: true, col: 0xd6d0c4 }); sign('QUIK STOP', 'red', L.x0 + 18.08, CURB + 3.5, L.z0 + 10, 8, 1, 'e');
  warehouse(L.x1 - 30, L.z1 - 26, L.x1 - 4, L.z1 - 4, 6.5, 'n', { col: 0x9a4a2a }); sign('CALDER AUTO BODY', 'gold', L.x1 - 17, CURB + 5.4, L.z1 - 26.08, 14, 1.2, 'n'); GARAGES.push({ x: L.x1 - 17, z: L.z1 - 31.5 });
  building(L.x0 + 4, L.z1 - 18, L.x0 + 22, L.z1 - 4, 4.4, { mat: 'brick', shop: true, col: 0x8a5a4a }); sign('PAWN & GUN', 'gold', L.x0 + 13, CURB + 3.45, L.z1 - 18.08, 10, 1.1, 'n'); sign('AMMO · ARMOR', 'neon', L.x0 + 22.08, CURB + 3.2, L.z1 - 11, 6, .8, 'e');
  SHOPS.push({ x: L.x0 + 13, z: L.z1 - 20.4, kind: 'gun', name: 'Pawn & Gun' }); ROBS.push({ x: L.x0 + 19.3, z: L.z0 + 10, name: 'Quik Stop' });
  ZONES.push({ id: 'H', name: 'Gas & Auto Row', x: cx, z: z0 + 8, r: 16 }); POI.push({ k: 'hang', x: L.x0 + 21, z: L.z0 + 15, cap: 3 }, { k: 'post', role: 2, act: 'smoke', x: L.x1 - 18.6, z: L.z1 - 27.3, yaw: 0, name: 'Mechanic' }, { k: 'browse', x: cx - 4, z: z0 + 3.4, yaw: 0, cap: 1 });
  for (let k = 0; k < 4; k++) cyl(L.x1 - 34 - (k % 2) * 1, CURB, CURB + .9 + (k > 1 ? .5 : 0), L.z1 - 8 - Math.floor(k / 2) * 1.1, .42, 'flat', 0x1c1e20, { a: false, seg: 10 });
  pylon(L.x1 - 5, L.z0 + 4, 'GAS 3.19', 'red', 8.5); parkingRow(L.x0 + 4, L.z0 + 23, 3, 3.4, PI, 5.4); barrier(L.cx - 6, L.z1 - 24, true);
  navNode(cx, CURB, z0 + 6); navNode(L.x0 + 22, CURB, L.z0 + 22); navNode(L.x0 + 13, CURB, L.z1 - 21.5); navNode(L.x1 - 17, CURB, L.z1 - 32); navNode(L.cx - 4, CURB, L.cz + 4); navNode(L.x0 + 2, CURB, L.cz); navNode(L.x1 - 2, CURB, L.cz - 6);
}
function genChurch(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'grass'); ground(L.x0 + 54, L.z0 + 6, L.x1, L.z0 + 40, 'lot'); ground(L.x0 + 36.5, L.z0, L.x0 + 39.5, L.z0 + 5, 'plaza');
  const c = 0xcfc4b0; addBox(L.x0 + 30, L.x0 + 46, CURB, CURB + 9, L.z0 + 11, L.z0 + 46, 'brick2', { col: c, faces: 15 }); FOOT.push([L.x0 + 30, L.z0 + 11, L.x0 + 46, L.z0 + 46, 'o']);
  gable(L.x0 + 30, L.x0 + 46, L.z0 + 11, L.z0 + 46, CURB + 9, 5.5, true, 0x4f4a48, hexCol(c)); solid(L.x0 + 34, L.x0 + 42, CURB + 9, CURB + 13, L.z0 + 11, L.z0 + 46, { p: false });
  addBox(L.x0 + 34.5, L.x0 + 41.5, CURB, CURB + 21, L.z0 + 5, L.z0 + 11, 'brick2', { col: c }); cyl(L.x0 + 38, CURB + 21, CURB + 30, L.z0 + 8, 3.6, 'shingle', 0x4f4a48, { nocol: true, rTop: .05, seg: 4 });
  deco(L.x0 + 37, L.x0 + 39, CURB, CURB + 3, L.z0 + 4.94, L.z0 + 5, 0x5a2d22);
  parkingRow(L.x0 + 58, L.z0 + 14, 5, 3.4, PI, 5.4); parkingRow(L.x0 + 58, L.z0 + 33, 5, 3.4, 0, 5.4);
  genHouses(L, { rows: ['s'], part: true });
  [[L.x0 + 8, L.z0 + 8], [L.x0 + 18, L.z0 + 22], [L.x0 + 8, L.z0 + 34], [L.x0 + 22, L.z0 + 6], [L.x1 - 6, L.z0 + 44]].forEach(q => tree(q[0], q[1], 1.4));
  POI.push({ k: 'hang', x: L.x0 + 38, z: L.z0 + 2.2, cap: 4 }, { k: 'hang', x: L.x0 + 52, z: L.z0 + 23, cap: 2 }); ROOSTS.push([L.x0 + 22, L.z0 + 14]);
  navNode(L.x0 + 38, CURB, L.z0 + 2.5); navNode(L.x0 + 52, CURB, L.z0 + 24); navNode(L.x0 + 14, CURB, L.z0 + 20); navNode(L.x1 - 4, CURB, L.z0 + 24);
}
// C — the mall: two floors around a cross of concourses, open in the middle
const MALL_SHOPS = ['NORTHLINE', 'KICKSTAND', 'VELOUR', 'PIXELHAUS', 'ORBIT TOYS', 'FOOD COURT', 'CINEMA 8', 'DENIM DEPOT', 'GOLD RUSH JEWELERS', 'SUNDAE SCHOOL', 'PRETZEL TWIST', 'GAME HALL', 'HATS HATS HATS', 'FRESH KICKS', 'CANDLE BARN', 'PHOTO BOOTH'];
function genMall(L) {
  const x0 = L.x0 + 4, x1 = L.x1 - 4, z0 = L.z0 + 4, z1 = L.z1 - 4, y = CURB, F2 = y + 5.2, top = y + 10.6, t = .6, cx = L.cx, cz = L.cz, wc = { col: 0xd9d4c8 }, gl = { a: false, s: false };
  ground(L.x0, L.z0, L.x1, L.z1, 'plaza'); ground(x0 + t, z0 + t, x1 - t, z1 - t, 'tile');
  wall('x', z0, z0 + t, x0, x1, y, top, [[cx - 5, cx + 5, 0, 4.2]], 'concrete', wc); wall('x', z1 - t, z1, x0, x1, y, top, [[cx - 5, cx + 5, 0, 4.2]], 'concrete', wc);
  wall('z', x0, x0 + t, z0 + t, z1 - t, y, top, [[cz - 4, cz + 4, 0, 4.2]], 'concrete', wc); wall('z', x1 - t, x1, z0 + t, z1 - t, y, top, [[cz - 4, cz + 4, 0, 4.2]], 'concrete', wc);
  FOOT.push([x0, z0, x1, z1, 'm']);
  sign('CALDER MALL', 'cyan', cx, y + 7.6, z0 - .06, 20, 2.6, 'n'); sign('CALDER MALL', 'cyan', cx, y + 7.6, z1 + .06, 20, 2.6, 's'); sign('CALDER MALL', 'cyan', x0 - .06, y + 7.6, cz, 16, 2.2, 'w'); sign('CALDER MALL', 'cyan', x1 + .06, y + 7.6, cz, 16, 2.2, 'e');
  let sn = 0; const msign = (...a) => { const t = MALL_SHOPS[sn++ % MALL_SHOPS.length]; sign(t, styleOf(t), ...a); };
  [[x0 + t, cx - 8, z0 + t, cz - 7], [cx + 8, x1 - t, z0 + t, cz - 7], [x0 + t, cx - 8, cz + 7, z1 - t], [cx + 8, x1 - t, cz + 7, z1 - t]].forEach((q, k) => {
    addBox(q[0], q[1], y, top - .1, q[2], q[3], 'shop', { tv: 5.2, tu: 8.2, col: 0xd9d2c4, faces: 15 });
    const west = k % 2 === 0, north = k < 2, fx = west ? q[1] : q[0], fz = north ? q[3] : q[2];                    // the two faces that look onto the concourses
    [0, 1].forEach(fl => { const sy = y + 4.3 + fl * 5.2; if (fl) msign(fx + (west ? .07 : -.07), sy - .4, (q[2] + q[3]) / 2, 7, .8, west ? 'e' : 'w'); else { msign(fx + (west ? .07 : -.07), sy, (q[2] + q[3]) / 2 - 4.5, 6, .8, west ? 'e' : 'w'); msign(fx + (west ? .07 : -.07), sy, (q[2] + q[3]) / 2 + 4.5, 6, .8, west ? 'e' : 'w'); }
      msign((q[0] + q[1]) / 2 - 6, fl ? sy - .4 : sy, fz + (north ? .07 : -.07), 7, .8, north ? 's' : 'n'); msign((q[0] + q[1]) / 2 + 6, fl ? sy - .4 : sy, fz + (north ? .07 : -.07), 7, .8, north ? 's' : 'n'); });
  });
  const slab = (a, b, c, d) => addBox(a, b, F2 - .35, F2, c, d, 'concrete', { top: 'tile', col: 0xcfcabd });
  slab(cx - 8, cx - 4.5, z0 + t, z1 - t); slab(cx + 4.5, cx + 8, z0 + t, z1 - t); slab(x0 + t, x1 - t, cz - 7, cz - 3.5); slab(x0 + t, x1 - t, cz + 3.5, cz + 7);
  slab(cx - 4.5, cx + 4.5, cz - 10.6, cz - 7); slab(cx - 4.5, cx + 4.5, cz + 7, cz + 10.6);
  stairs(cx, cz - 21, cx, cz - 10.6, y, F2, 3.2, 'concrete', 0xb9b4a8); stairs(cx, cz + 21, cx, cz + 10.6, y, F2, 3.2, 'concrete', 0xb9b4a8);
  const rail = (a, b, c, d) => { addBox(a, b, F2, F2 + 1.05, c, d, 'glass', gl); deco(a - .02, b + .02, F2 + 1.05, F2 + 1.1, c - .02, d + .02, 0x8a9096); };
  [-1, 1].forEach(s => {
    rail(cx + s * 4.5 - .05, cx + s * 4.5 + .05, z0 + t, cz - 10.6); rail(cx + s * 4.5 - .05, cx + s * 4.5 + .05, cz + 10.6, z1 - t);            // along the open concourse, north and south
    rail(cx + s * 4.5 - .05, cx + s * 4.5 + .05, cz - 3.5, cz + 3.5);                                                                         // the atrium, east and west sides
    rail(Math.min(cx + s * 1.6, cx + s * 4.5), Math.max(cx + s * 1.6, cx + s * 4.5), cz - 10.65, cz - 10.55); rail(Math.min(cx + s * 1.6, cx + s * 4.5), Math.max(cx + s * 1.6, cx + s * 4.5), cz + 10.55, cz + 10.65);   // either side of each stair head
    rail(cx - 4.5, cx + 4.5, cz + s * 3.5 - .05, cz + s * 3.5 + .05);                                                                         // the atrium, north and south sides
    rail(x0 + t, cx - 8, cz + s * 3.5 - .05, cz + s * 3.5 + .05); rail(cx + 8, x1 - t, cz + s * 3.5 - .05, cz + s * 3.5 + .05);               // along the cross concourse
  });
  addBox(x0, x1, top, top + .5, z0, cz - 12, 'roof', { top: 'roof' }); addBox(x0, x1, top, top + .5, cz + 12, z1, 'roof', { top: 'roof' }); addBox(x0, cx - 6, top, top + .5, cz - 12, cz + 12, 'roof', { top: 'roof' }); addBox(cx + 6, x1, top, top + .5, cz - 12, cz + 12, 'roof', { top: 'roof' });
  addBox(cx - 6, cx + 6, top + .2, top + .35, cz - 12, cz + 12, 'glass', { a: false });
  for (let k = -2; k <= 2; k++) deco(cx - 6, cx + 6, top + .1, top + .5, cz + k * 5 - .12, cz + k * 5 + .12, 0x8a9096);
  [[cx - 6.2, cz - 20], [cx + 6.2, cz - 20], [cx - 6.2, cz + 20], [cx + 6.2, cz + 20], [cx - 22, cz - 5.2], [cx - 22, cz + 5.2], [cx + 22, cz - 5.2], [cx + 22, cz + 5.2]].forEach(q => addBox(q[0] - 1.6, q[0] + 1.6, top - .12, top - .06, q[1] - .5, q[1] + .5, 'glow', { nocol: true, col: 0xfff6e0, faces: 32 }));
  [[cx - 6.2, cz - 20], [cx + 6.2, cz - 20], [cx - 6.2, cz + 20], [cx + 6.2, cz + 20], [cx - 22, cz - 5.2], [cx - 22, cz + 5.2], [cx + 22, cz - 5.2], [cx + 22, cz + 5.2]].forEach(q => addBox(q[0] - 1.6, q[0] + 1.6, F2 - .42, F2 - .36, q[1] - .5, q[1] + .5, 'glow', { nocol: true, col: 0xfff6e0, faces: 32 }));
  cyl(cx, y, y + .7, cz, 3, 'concrete', 0xb9b4a8, { seg: 12, a: false }); cyl(cx, y + .7, y + .78, cz, 2.6, 'grass', 0xffffff, { nocol: true, seg: 12 }); tree(cx, cz, 1.2, y + .7);
  [[cx - 24, cz], [cx + 24, cz]].forEach(q => { addBox(q[0] - 1.4, q[0] + 1.4, y, y + 1.15, q[1] - 1, q[1] + 1, 'flat', { col: 0x3a5f7a, a: false }); deco(q[0] - 1.6, q[0] + 1.6, y + 2.3, y + 2.45, q[1] - 1.2, q[1] + 1.2, 0xd9a521); [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]].forEach(o => deco(q[0] + o[0] - .05, q[0] + o[0] + .05, y + 1.15, y + 2.3, q[1] + o[1] - .05, q[1] + o[1] + .05, 0x8a9096)); });
  bench(cx - 6, cz - 15, false); bench(cx + 6, cz + 15, false); bench(cx - 14, cz + 5, true); bench(cx + 14, cz - 5, true);
  planter(cx - 9, z0 - 2.2, 1.1); planter(cx + 9, z0 - 2.2, 1.1); planter(cx - 9, z1 + 2.2, 1.1); planter(cx + 9, z1 + 2.2, 1.1);
  ZONES.push({ id: 'C', name: 'Calder Mall', x: cx, z: cz, r: 15 }); ROBS.push({ x: cx - 24, z: cz + 1.9, name: 'the mall kiosk' });
  POI.push({ k: 'post', role: 1, x: cx - 24, z: cz, yaw: PI, name: 'Clerk', rob: ROBS.length - 1, inside: true }, { k: 'post', role: 1, x: cx + 24, z: cz, yaw: 0, name: 'Clerk', inside: true }, { k: 'browse', x: cx + 24, z: cz - 1.9, yaw: PI, cap: 2 },
    { k: 'browse', x: cx - 6.6, z: cz - 14, yaw: PI / 2, cap: 1 }, { k: 'browse', x: cx + 6.6, z: cz + 13, yaw: -PI / 2, cap: 1 }, { k: 'browse', x: cx - 13, z: cz - 6.4, yaw: 0, cap: 1 }, { k: 'browse', x: cx + 16, z: cz + 6.4, yaw: PI, cap: 1 }, { k: 'hang', x: cx + 2.5, z: z0 - 3.4, cap: 3 }, { k: 'hang', x: cx - 3, z: z1 + 3.4, cap: 3 });
  const g = (x, z) => navNode(x, y, z), u = (x, z) => navNode(x, F2, z);
  g(cx, z0 - 2.5); g(cx, z1 + 2.5); g(x0 - 2.5, cz); g(x1 + 2.5, cz); g(cx, z0 + 3); g(cx, z1 - 3); g(x0 + 3, cz); g(x1 - 3, cz);
  g(cx - 5.5, cz - 16); g(cx + 5.5, cz - 16); g(cx - 5.5, cz + 16); g(cx + 5.5, cz + 16); g(cx - 5, cz); g(cx + 5, cz); g(cx, cz - 5); g(cx, cz + 5); g(cx - 18, cz); g(cx + 18, cz);
  const nb = g(cx, cz - 22.2), sb = g(cx, cz + 22.2), nt = u(cx, cz - 9.4), st = u(cx, cz + 9.4); navLink(nb, nt); navLink(sb, st);
  [-1, 1].forEach(s => { u(cx + s * 6.2, cz - 9); u(cx + s * 6.2, cz + 9); u(cx + s * 6.2, cz - 22); u(cx + s * 6.2, cz + 22); u(cx + s * 6.2, cz - 5.2); u(cx + s * 6.2, cz + 5.2); u(cx + s * 24, cz - 5.2); u(cx + s * 24, cz + 5.2); });
  return { x: cx, y: top - 2, z: cz };
}
// D — the elevated line down Calder Avenue, and its station
const LINE = { x: RX(5), y0: 7, y1: 7.9, sz: RZ(2) + PZ / 2 };
function genLine() {
  const x = LINE.x, y0 = LINE.y0, y1 = LINE.y1, steel = 0x3f4a44, sz = LINE.sz, pa = sz - 17, pb = sz + 17;
  addBox(x - 5, x + 5, y0, y1, -6, CITY.d, 'flat', { col: 0x4a5450, tcol: 0x35322e });
  [-3.12, -1.68, 1.68, 3.12].forEach(o => deco(x + o - .05, x + o + .05, y1, y1 + .13, 0, CITY.d, 0x9aa0a3));
  deco(x - 5.3, x - 5, y0 - .9, y1 + .1, -6, CITY.d, steel); deco(x + 5, x + 5.3, y0 - .9, y1 + .1, -6, CITY.d, steel);
  for (let z = 5; z < CITY.d; z += 14) { let skip = false; for (let j = 0; j <= NZ; j++) if (Math.abs(z - RZ(j)) < 9.6) skip = true; if (skip) continue;
    [-7.3, 7.3].forEach(o => addBox(x + o - .35, x + o + .35, CURB, y0 - .9, z - .35, z + .35, 'flat', { col: steel, a: false, n: false }));
    deco(x - 7.8, x + 7.8, y0 - .9, y0, z - .4, z + .4, steel); }
  [-1, 1].forEach(sd => {
    const a = Math.min(x + sd * 5, x + sd * 13), b = Math.max(x + sd * 5, x + sd * 13), sxc = x + sd * 11.5, ox = x + sd * 13;
    addBox(a, b, y0 + .2, y1, pa, pb, 'concrete', { tcol: 0xb9b4a8 }); paint(Math.min(x + sd * 5, x + sd * 5.5), pa, Math.max(x + sd * 5, x + sd * 5.5), pb, YEL, y1 - .04);
    [pa + 3, sz, pb - 3].forEach(z => addBox(x + sd * 12.5 - .3, x + sd * 12.5 + .3, CURB, y0 + .2, z - .3, z + .3, 'flat', { col: steel, a: false, n: false }));
    deco(a - .3, b + .3, y1 + 3.3, y1 + 3.5, pa + 5, pb - 5, 0x5a655f); [pa + 6, sz, pb - 6].forEach(z => deco(x + sd * 12.4 - .1, x + sd * 12.4 + .1, y1, y1 + 3.3, z - .1, z + .1, steel));
    addBox(Math.min(ox, ox - sd * .12), Math.max(ox, ox - sd * .12), y1, y1 + 1.15, pa, pb, 'flat', { col: steel, a: false, s: false });                         // outer rail
    addBox(Math.min(x + sd * 5, x + sd * 10.2), Math.max(x + sd * 5, x + sd * 10.2), y1, y1 + 1.15, pa - .12, pa, 'flat', { col: steel, a: false, s: false }); addBox(Math.min(x + sd * 5, x + sd * 10.2), Math.max(x + sd * 5, x + sd * 10.2), y1, y1 + 1.15, pb, pb + .12, 'flat', { col: steel, a: false, s: false });
    stairs(sxc, pb + 16.2, sxc, pb, CURB, y1, 2.4, 'concrete', 0x8f8b84); stairs(sxc, pa - 16.2, sxc, pa, CURB, y1, 2.4, 'concrete', 0x8f8b84);
    addBox(x + sd * 9.4 - 1.2, x + sd * 9.4 + 1.2, y1, y1 + 2.5, sz - 1.5, sz + 1.5, 'flat', { col: 0x5a655f, a: false }); sign('CALDER AVE', 'blue', x + sd * 9.4 - sd * 1.26, y1 + 1.9, sz, 2.6, .6, sd > 0 ? 'w' : 'e');
    sign('CALDER AVE', 'blue', x + sd * 7, y1 + 2.9, pa + 5.2, 4, .7, 'n'); sign('CALDER AVE', 'blue', x + sd * 7, y1 + 2.9, pb - 5.2, 4, .7, 's');
    const b0 = navNode(sxc, CURB, pb + 17.4), t0 = navNode(sxc, y1, pb - 1), b1 = navNode(sxc, CURB, pa - 17.4), t1 = navNode(sxc, y1, pa + 1), mid = navNode(x + sd * 8, y1, sz + sd * 4);
    navLink(b0, t0); navLink(b1, t1); navLink(t0, mid); navLink(t1, mid); LINE['mid' + sd] = mid;
    POI.push({ k: 'wait', x: x + sd * 7.4, z: sz - 8, y: y1, yaw: sd > 0 ? PI / 2 : -PI / 2, cap: 2 }, { k: 'wait', x: x + sd * 7.4, z: sz + 9, y: y1, yaw: sd > 0 ? PI / 2 : -PI / 2, cap: 2 });
  });
  navLink(LINE['mid-1'], LINE.mid1);
  ZONES.push({ id: 'D', name: 'Calder Ave Station', x, z: sz, r: 16 }); ROOSTS.push([x - 9, sz + 22], [x + 10, sz - 24]);
  navNode(x - 8.3, CURB, sz); navNode(x + 8.3, CURB, sz);
}
