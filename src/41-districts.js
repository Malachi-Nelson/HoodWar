/* ---------------------------------------------------------------------
   4b. Districts: the ordinary blocks. Each generator fills one 80 x 64 m lot.
   --------------------------------------------------------------------- */
const NAV = [];   // walking graph: { x, y, z, e: [[to, dist, civil]] }
function navNode(x, y, z, o) { NAV.push({ x, y: y === undefined ? CURB : y, z, e: [], auto: !(o && o.noauto), i: NAV.length }); return NAV.length - 1; }
function navLink(a, b, civ) { if (a === b || a < 0 || b < 0) return; const A = NAV[a], B = NAV[b]; if (A.e.some(q => q[0] === b)) return; const d = hyp(A.x - B.x, A.y - B.y, A.z - B.z); A.e.push([b, d, !!civ]); B.e.push([a, d, !!civ]); }

const SIDING = [0xb8c4c9, 0xd9cfae, 0xa8b89a, 0xc9a48a, 0x8f9aa6, 0xd6d6d0, 0xb5927a, 0x7d8c7a, 0xc2b280, 0x9a8f86];
const SHING = [0x6a625c, 0x4f4a48, 0x7a5a4a, 0x55606a, 0x5a4d44];
function house(x0, z0, x1, z1, face) {
  const col = pick(W, SIDING), h = W() < .72 ? 6 : 3.2, y = CURB, mx = (x0 + x1) / 2, n = face === 'n', rc = pick(W, SHING);
  addBox(x0, x1, y, y + h, z0, z1, 'siding', { col, faces: 15 }); FOOT.push([x0, z0, x1, z1, 'h']);
  const rise = wr(1.8, 2.6); gable(x0, x1, z0, z1, y + h, rise, true, rc, col); solid(x0 + 1.6, x1 - 1.6, y + h, y + h + rise * .7, z0, z1, { p: false });
  const pa = n ? z0 - 1.9 : z1, pb = n ? z0 : z1 + 1.9, wz = n ? z0 : z1;
  addBox(x0 + .5, x1 - .5, y, y + .42, pa, pb, 'flat', { col: 0x8f7f6a, a: false, n: false });
  addBox(mx - .8, mx + .8, y, y + .21, n ? pa - .45 : pb, n ? pa : pb + .45, 'flat', { col: 0x7d6e5c, a: false, n: false });
  deco(x0 + .3, x1 - .3, y + 2.75, y + 2.9, n ? pa - .15 : pa, n ? pb : pb + .15, rc);
  [x0 + .6, x1 - .6].forEach(px => deco(px - .07, px + .07, y + .42, y + 2.75, (n ? pa : pb) - .07, (n ? pa : pb) + .07, 0xe8e4da));
  deco(mx - .5, mx + .5, y + .42, y + 2.5, wz - .04, wz + .04, pick(W, [0x5a2d22, 0x2c3e50, 0x3d3028, 0x1f4d3a]));
  if (W() < .6) deco(x1 - 1.6, x1 - .9, y + h, y + h + rise + .9, (z0 + z1) / 2 - .35, (z0 + z1) / 2 + .35, 0x8a4f3f);
}
function genHouses(L, o) {
  o = o || {};
  if (!o.part) { ground(L.x0, L.z0, L.x1, L.z1, 'grass'); ground(L.x0 - WALK, L.cz - 3, L.x1 + WALK, L.cz + 3, 'lot'); }
  const rows = o.rows || ['n', 's'];
  rows.forEach(face => {
    const n = face === 'n';
    for (let k = 0; k < 8; k++) {
      const lx = L.x0 + k * 10; if (o.skip && o.skip(lx, face)) continue;
      const z0 = n ? L.z0 + 4.5 : L.z1 - 15.5, z1 = z0 + 11;
      house(lx + 1.5, z0, lx + 8.5, z1, face);
      ground(lx + 4.4, n ? L.z0 : z1 + 2.3, lx + 5.6, n ? z0 - 2.3 : L.z1, 'plaza');                       // front path
      const az = n ? L.cz - 3 : L.cz + 3;                                                                    // alley edge of this yard
      if (o.part) { if (W() < .4) tree(lx + wr(3, 7), n ? z1 + wr(3, 6) : z0 - wr(3, 6), wr(.8, 1.2)); }
      else if (W() < .55) { const g0 = n ? az - 6 : az + .3, gc = pick(W, SIDING); addBox(lx + 2.5, lx + 7.5, CURB, CURB + 2.8, g0, g0 + 5.7, 'siding', { col: gc, top: 'roof', faces: 15 | 16, tv: 6 }); FOOT.push([lx + 2.5, g0, lx + 7.5, g0 + 5.7, 'h']);
        deco(lx + 3.2, lx + 6.8, CURB, CURB + 2.2, n ? g0 + 5.66 : g0 - .04, n ? g0 + 5.74 : g0 + .04, 0xd8d6cc); }
      else { fence(lx + 1.4, n ? az - .3 : az + .3, lx + 10, n ? az - .3 : az + .3, 1.7, 'wood'); if (W() < .5) tree(lx + wr(3, 7), n ? az - wr(3, 7) : az + wr(3, 7), wr(.8, 1.2)); }
      if (W() < .3) fence(lx + 10, n ? z1 : z0, lx + 10, n ? az - .3 : az + .3, 1.2, 'link');
      if (W() < .22) tree(lx + wr(1, 3), n ? L.z0 + wr(1, 3) : L.z1 - wr(1, 3), .8);
    }
  });
  if (!o.part) { navNode(L.x0 + 2, CURB, L.cz); navNode(L.cx, CURB, L.cz); navNode(L.x1 - 2, CURB, L.cz); }
}
function fireEscape(cx, wz, face, floors) { const d = FACE[face][1], c = 0x25282b; for (let f = 1; f < floors; f++) { const y = CURB + 4 + (f - 1) * 3.2; deco(cx - 1.3, cx + 1.3, y - .08, y, Math.min(wz, wz + d * 1), Math.max(wz, wz + d * 1), c); deco(cx - 1.3, cx + 1.3, y + .9, y + .96, wz + d * .96 - .03, wz + d * .96 + .03, c); deco(cx + .8, cx + .9, y - 3.2, y, wz + d * .5 - .04, wz + d * .5 + .04, c); deco(cx + 1.15, cx + 1.25, y - 3.2, y, wz + d * .5 - .04, wz + d * .5 + .04, c); } }
// a terrace of walk-ups along one side of the block
function terrace(L, face, o) {
  o = o || {}; const n = face === 'n', dp = o.depth || 21, z0 = n ? L.z0 : L.z1 - dp, z1 = z0 + dp, xa = o.x0 === undefined ? L.x0 : o.x0, xb = o.x1 === undefined ? L.x1 : o.x1;
  let x = xa;
  while (x < xb - .5) {
    let w = pick(W, [12, 15, 18, 21]); if (xb - x - w < 12) w = xb - x;
    const vacant = W() < .12 && x > xa + 1 && x + w < xb - 1 && !o.full;
    if (vacant) { ground(x, z0, x + w, z1, 'dirt'); fence(x, n ? z0 + .4 : z1 - .4, x + w - 3.5, n ? z0 + .4 : z1 - .4, 2.2, 'link'); crate(x + wr(2, w - 2), wr(z0 + 4, z1 - 4), 1.1); if (W() < .7) dumpster(x + wr(3, w - 3), n ? z1 - 2 : z0 + 2, true); navNode(x + w / 2, CURB, (z0 + z1) / 2); }
    else {
      const floors = wi(o.minF || 3, o.maxF || 5), shop = W() < (o.shops === undefined ? .75 : o.shops), h = shop ? 4 + (floors - 1) * 3.2 : floors * 3.2;
      building(x, z0, x + w, z1, h, { mat: W() < .5 ? 'brick' : 'brick2', shop, tank: W() < .3 });
      if (shop) { shopFront(x, x + w, n ? z0 : z1, face); if (x === L.x0) shopFrontX(z0 + 1, z1 - 1, x, 'w'); if (Math.abs(x + w - L.x1) < .1) shopFrontX(z0 + 1, z1 - 1, x + w, 'e'); }
      if (floors >= 4 && W() < .7) fireEscape(x + w / 2, n ? z1 : z0, n ? 's' : 'n', floors);
      if (!o.clean && W() < .5) dumpster(x + wr(2, w - 2), n ? z1 + 1.2 : z0 - 1.2, true);
      if (!o.clean && W() < .25) crate(x + wr(1, w - 1), n ? z1 + wr(2.5, 5) : z0 - wr(2.5, 5), 1.2);
    }
    x += w;
  }
}
function genWalkups(L, o) {
  o = o || {};
  terrace(L, 'n', o); terrace(L, 's', o);
  ground(L.x0 - WALK, L.cz - 4, L.x1 + WALK, L.cz + 4, 'lot');
  for (let k = 0; k < 3; k++) if (W() < .6) PARK.push({ x: L.x0 + 14 + k * 24 + wr(-3, 3), z: L.cz + (W() < .5 ? -7.5 : 7.5), yaw: W() < .5 ? 0 : PI, lot: true });
  navNode(L.x0 + 2, CURB, L.cz); navNode(L.cx - 18, CURB, L.cz); navNode(L.cx + 18, CURB, L.cz); navNode(L.x1 - 2, CURB, L.cz);
}
function planter(x, z, s) { addBox(x - s, x + s, CURB, CURB + .55, z - s, z + s, 'concrete', { top: 'grass', a: false, n: s > 1.2 }); tree(x, z, .95, CURB + .55); }
function genOffices(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'plaza');
  const cs = [0xb8c2cc, 0x9aa8b5, 0xcfd3d6, 0xa9b4a6, 0xc4b8a8];
  building(L.x0 + 2, L.z0 + 2, L.x0 + 38, L.z0 + 29, wr(26, 44), { mat: 'office', shop: true, shopCol: 0x8a949c, col: pick(W, cs), kind: 'o' });
  building(L.x1 - 40, L.z1 - 32, L.x1 - 2, L.z1 - 2, wr(30, 56), { mat: W() < .5 ? 'office' : 'tower', shop: true, shopCol: 0x7d8a94, col: pick(W, cs), kind: 'o' });
  building(L.x1 - 30, L.z0 + 2, L.x1 - 2, L.z0 + 22, 9.6, { mat: 'concrete', col: 0xb0aca4, kind: 'o', tu: 5, clutter: false });
  for (let k = 0; k < 3; k++) deco(L.x1 - 30, L.x1 - 2, CURB + 2.6 + k * 3, CURB + 3 + k * 3, L.z0 + 22, L.z0 + 22.06, 0x1c1e20);
  building(L.x0 + 4, L.z1 - 22, L.x0 + 28, L.z1 - 3, wr(12, 20), { mat: 'brick2', shop: true, kind: 'o' }); shopFront(L.x0 + 4, L.x0 + 28, L.z1 - 3, 's');
  planter(L.cx + 6.5, L.cz - 19, 1.6); planter(L.x0 + 30, L.cz + 7, 1.6); bench(L.cx + 4, L.cz - 12, true); bench(L.x0 + 14, L.cz + 8, false);
  // the plaza is a set of passages between the four buildings: one node in each and one where they meet
  POI.push({ k: 'hang', x: L.x0 + 13, z: L.cz + 6.5, cap: 3 }, { k: 'hang', x: L.cx + 3.5, z: L.z0 + 11, cap: 2 });
  navNode(L.cx, CURB, L.cz - 6); navNode(L.cx - 1, CURB, L.cz - 1.5); navNode(L.x0 + 20, CURB, L.cz + 3.5); navNode(L.x0 + 34, CURB, L.z1 - 10); navNode(L.x1 - 18, CURB, L.cz - 5); navNode(L.cx + 2, CURB, L.z0 + 7);
}
function genTower(L, h, crown, noEast) {
  ground(L.x0, L.z0, L.x1, L.z1, 'plaza');
  const py = 9.2; building(L.x0 + 7, L.z0 + 9, L.x1 - 7, L.z1 - 9, py, { mat: 'office', shop: true, shopCol: 0x76828c, col: 0xc9ccd0, kind: 'o', clutter: false });
  const tc = pick(W, [0xa8c0d4, 0x8fb0c4, 0xb9c4d0, 0x9fb8a8]);
  addBox(L.cx - 17, L.cx + 17, CURB + py, CURB + h, L.cz - 14, L.cz + 14, 'tower', { nocol: true, faces: 15 | 16, top: 'roof', col: tc });
  solid(L.cx - 17, L.cx + 17, CURB + py, CURB + h, L.cz - 14, L.cz + 14);
  addBox(L.cx - 12, L.cx + 12, CURB + h, CURB + h + 6, L.cz - 9, L.cz + 9, 'tower', { nocol: true, faces: 15 | 16, top: 'roof', col: tc });
  if (crown) { deco(L.cx - .5, L.cx + .5, CURB + h + 6, CURB + h + 30, L.cz - .5, L.cz + .5, 0x8a9096); deco(L.cx - 2.2, L.cx + 2.2, CURB + h + 6, CURB + h + 8.5, L.cz - 2.2, L.cz + 2.2, 0x5d6870); }
  else deco(L.cx - 8, L.cx + 8, CURB + h + 6, CURB + h + 9, L.cz - 5, L.cz + 5, 0x5d6870);
  for (let k = 0; k < 4; k++) planter(L.x0 + 4, L.z0 + 4 + k * 18.6, 1.3);
  if (!noEast) for (let k = 0; k < 4; k++) planter(L.x1 - 4, L.z0 + 4 + k * 18.6, 1.3);
  navNode(L.cx, CURB, L.z0 + 4); navNode(L.cx, CURB, L.z1 - 4); navNode(L.x0 + 3.5, CURB, L.cz); navNode(L.x1 - 3.5, CURB, L.cz);
}
// F — Civic Square: a fountain between two office slabs
function genCivic(L) {
  ground(L.x0, L.z0, L.x1, L.z1, 'plaza');
  building(L.x0 + 2, L.z0 + 5, L.x0 + 22, L.z1 - 5, 31, { mat: 'office', shop: true, shopCol: 0x8a949c, col: 0xcfd3d6, kind: 'o' });
  building(L.x1 - 22, L.z0 + 5, L.x1 - 2, L.z1 - 5, 40, { mat: 'tower', shop: true, shopCol: 0x6f7c86, col: 0x9fb4c4, kind: 'o' });
  cyl(L.cx, CURB, CURB + .6, L.cz, 6.2, 'concrete', 0xb9b4a8, { seg: 20, a: false }); cyl(L.cx, CURB + .6, CURB + .66, L.cz, 5.6, 'flat', 0x4f86a0, { nocol: true, seg: 20 }); cyl(L.cx, CURB + .6, CURB + 2.4, L.cz, .7, 'concrete', 0xa39f98, { seg: 10, a: false });
  PATCH.push([L.cx - 5.6, L.cz - 5.6, L.cx + 5.6, L.cz + 5.6, 'water']);
  { const m = new T.Matrix4(), q = new T.Quaternion(), put = (x, z, rx, rz, w, h, d) => { m.compose(new T.Vector3(x, CURB + h / 2 - .2, z), q.setFromEuler(new T.Euler(rx, .4, rz)), new T.Vector3(1, 1, 1)); const g = new T.BoxGeometry(w, h, d); SB('flat').geo(g, m, hexCol(0x2f6f8a)); g.dispose(); };
    put(L.cx - 14, L.z0 + 12, .3, .25, .5, 9, 2.4); put(L.cx - 12, L.z0 + 11, -.35, -.3, .5, 7, 2); put(L.cx - 13, L.z0 + 13.5, .1, -.6, .5, 6, 1.6); solid(L.cx - 15, L.cx - 11, CURB, CURB + 5, L.z0 + 10, L.z0 + 14.5, { a: false }); }
  [[-9, -16], [9, -16], [-9, 16], [9, 16]].forEach(q => planter(L.cx + q[0], L.cz + q[1], 1.5));
  bench(L.cx - 9, L.cz, false); bench(L.cx + 9, L.cz, false); bench(L.cx, L.cz + 10, true);
  cart(L.cx + 13, L.cz - 20, 's', 'HOT DOGS', 'red'); POI.push({ k: 'hang', x: L.cx - 10, z: L.cz + 20, cap: 3 }, { k: 'hang', x: L.cx + 4, z: L.cz - 12, cap: 3 }); ROOSTS.push([L.cx - 3, L.cz + 9], [L.cx + 11, L.cz + 12]);
  ZONES.push({ id: 'F', name: 'Civic Square', x: L.cx, z: L.cz, r: 17 });
  navNode(L.cx, CURB, L.cz - 10); navNode(L.cx, CURB, L.cz + 12); navNode(L.cx - 12, CURB, L.cz); navNode(L.cx + 12, CURB, L.cz);
}
const CORR = [0x9aa3a8, 0x7d8a94, 0xa08a78, 0x6f7f6a, 0xb0885a, 0x8892a0];
function warehouse(x0, z0, x1, z1, h, doorFace, o) {
  o = o || {}; const col = o.col === undefined ? pick(W, CORR) : o.col;
  solid(x0, x1, CURB, CURB + h, z0, z1); FOOT.push([x0, z0, x1, z1, 'i']);
  addBox(x0, x1, CURB, CURB + h, z0, z1, 'corr', { nocol: true, faces: 15 | 16, top: 'roof', col });
  deco(x0 - .1, x1 + .1, CURB + h, CURB + h + .25, z0 - .1, z1 + .1, 0x3a3d40);
  const n = Math.max(1, Math.floor((doorFace === 'n' || doorFace === 's' ? x1 - x0 : z1 - z0) / 12));
  for (let k = 0; k < n; k++) { const t = (k + .5) / n;
    if (doorFace === 's' || doorFace === 'n') { const cx = lerp(x0, x1, t), z = doorFace === 's' ? z1 : z0, d = doorFace === 's' ? 1 : -1; deco(cx - 2.2, cx + 2.2, CURB, CURB + 4.2, Math.min(z, z + d * .05), Math.max(z, z + d * .05), 0x55595e); addBox(cx - 3.5, cx + 3.5, CURB, CURB + 1.05, Math.min(z, z + d * 2.6), Math.max(z, z + d * 2.6), 'concrete', { a: false }); }
    else { const cz = lerp(z0, z1, t), x = doorFace === 'e' ? x1 : x0, d = doorFace === 'e' ? 1 : -1; deco(Math.min(x, x + d * .05), Math.max(x, x + d * .05), CURB, CURB + 4.2, cz - 2.2, cz + 2.2, 0x55595e); addBox(Math.min(x, x + d * 2.6), Math.max(x, x + d * 2.6), CURB, CURB + 1.05, cz - 3.5, cz + 3.5, 'concrete', { a: false }); }
  }
}
const BOXCOL = [0xb3261e, 0x1f4e8c, 0xd9a521, 0x1d6b45, 0x8c9299, 0xc85a1c, 0x2a7f86, 0x6b3fa0, 0xd8d6cc];
function container(x, z, alongZ, level) { const a = alongZ ? 1.22 : 6.1, b = alongZ ? 6.1 : 1.22, y = CURB + level * 2.6; addBox(x - a, x + a, y, y + 2.6, z - b, z + b, 'corr', { col: pick(W, BOXCOL), tu: 1.2, tv: 5.2 }); if (!level) FOOT.push([x - a, z - b, x + a, z + b, 'c']); }
function genIndustrial(L, zone) {   // zone: this yard is a turf (J, The Foundry)
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  warehouse(L.x0 + 4, L.z0 + 4, L.x0 + 52, L.z0 + 28, wr(9, 12), 's');
  warehouse(L.x1 - 36, L.z1 - 28, L.x1 - 4, L.z1 - 4, wr(8, 10.5), 'n');
  fence(L.x0 + .4, L.z0 + 34, L.x0 + .4, L.z1 - .4, 2.6, 'link'); fence(L.x0 + .4, L.z1 - .4, L.x0 + 22, L.z1 - .4, 2.6, 'link'); fence(L.x0 + 30, L.z1 - .4, L.x1 - 38, L.z1 - .4, 2.6, 'link');
  fence(L.x1 - .4, L.z0 + .4, L.x1 - .4, L.z0 + 14, 2.6, 'link'); fence(L.x1 - .4, L.z0 + 22, L.x1 - .4, L.z1 - 30, 2.6, 'link'); fence(L.x0 + 54, L.z0 + .4, L.x1 - 8, L.z0 + .4, 2.6, 'link');
  cyl(L.x1 - 8, CURB, CURB + 7.5, L.z0 + 8, 3.2, 'corr', 0xd8d6cc, { seg: 14 }); cyl(L.x1 - 16, CURB, CURB + 6, L.z0 + 8, 2.8, 'corr', 0xc9ced2, { seg: 14 }); FOOT.push([L.x1 - 11, L.z0 + 5, L.x1 - 5, L.z0 + 11, 'i'], [L.x1 - 18.6, L.z0 + 5.4, L.x1 - 13.4, L.z0 + 10.6, 'i']);
  if (W() < .6) { cyl(L.x0 + 10, CURB, CURB + 30, L.z1 - 10, 1.3, 'concrete', 0x8a5548, { seg: 10, rTop: .9 }); FOOT.push([L.x0 + 8.7, L.z1 - 11.3, L.x0 + 11.3, L.z1 - 8.7, 'i']); STACKS.push([L.x0 + 10, CURB + 30.4, L.z1 - 10]); }
  for (let k = 0; k < 3; k++) { const x = L.x0 + 14 + k * 9 + wr(-1, 1), z = L.z1 - 9; container(x, z, true, 0); if (W() < .5) container(x, z, true, 1); }
  for (let k = 0; k < 5; k++) crate(wr(L.x0 + 6, L.x1 - 40), wr(L.z0 + 36, L.z1 - 18), wr(1, 1.6));
  if (zone) { ZONES.push({ id: 'J', name: 'The Foundry', x: L.x0 + 27, z: L.z0 + 42, r: 14 }); navNode(L.x0 + 27, CURB, L.z0 + 42); sign('CALDER FOUNDRY', 'white', L.x0 + 28, CURB + 6.2, L.z0 + 28.08, 14, 1.3, 's'); }
  POI.push({ k: 'work', role: 2, x: L.x0 + 20, z: L.z0 + 33, bx: L.x0 + 36, bz: L.z1 - 14 }, { k: 'post', role: 2, act: 'smoke', x: L.x1 - 42, z: L.z0 + 31.5, yaw: PI, name: 'Yard hand' });
  PARK.push({ x: L.x1 - 44, z: L.z0 + 34, yaw: PI / 2, lot: true, truck: true });
  navNode(L.cx - 1, CURB, L.cz + 5); navNode(L.x0 + 28, CURB, L.z0 + 38);
  navLink(navNode(L.x0 + 26, CURB, L.z1 - 2), navNode(L.x0 + 26, CURB, L.z1 + WALK / 2)); navLink(navNode(L.x1 - 2, CURB, L.z0 + 18), navNode(L.x1 + WALK / 2, CURB, L.z0 + 18)); navLink(navNode(L.x0 + 2, CURB, L.z0 + 31), navNode(L.x0 - WALK / 2, CURB, L.z0 + 31));
}
function genDocks(L, zone) {
  ground(L.x0, L.z0, L.x1, L.z1, 'lot');
  const gx0 = L.x1 - 20, gx1 = L.x1 - 2, gz = zone ? L.z0 + 7 : L.cz;                                                 // a gantry crane at the quay
  for (let r = 0; r < 6; r++) { const x = L.x0 + 8 + r * 12.6;
    [7.5, 21.5, 42.5, 56.5].forEach(zo => { const z = L.z0 + zo; if (zone && hyp(x - L.cx, z - L.cz) < 17) return; if (x > gx0 - 3 && Math.abs(z - gz) < 12.5) return;
      const lv = W(), n = lv < .2 ? 0 : lv < .5 ? 1 : lv < .85 ? 2 : 3; for (let k = 0; k < n; k++) container(x, z, true, k); }); }
  [[gx0, gz - 5], [gx1, gz - 5], [gx0, gz + 5], [gx1, gz + 5]].forEach(q => addBox(q[0] - .6, q[0] + .6, CURB, CURB + 24, q[1] - .6, q[1] + .6, 'flat', { col: 0xd9a521, a: false }));
  deco(gx0 - 14, gx1 + 34, CURB + 24, CURB + 26, gz - 1.2, gz + 1.2, 0xd9a521); deco(gx0 - 1, gx1 + 1, CURB + 22.5, CURB + 24, gz - 5.6, gz - 4.4, 0xb98a1b); deco(gx0 - 1, gx1 + 1, CURB + 22.5, CURB + 24, gz + 4.4, gz + 5.6, 0xb98a1b);
  deco(gx1 + 8, gx1 + 12, CURB + 20.5, CURB + 24, gz - 1.6, gz + 1.6, 0xe8e4da); deco(gx1 + 9.8, gx1 + 10.2, CURB + 8, CURB + 20.5, gz - .1, gz + .1, 0x25282b);
  for (let z = L.z0 + 4; z < L.z1; z += 12) addBox(L.x1 + WALK - 1.2, L.x1 + WALK - .6, CURB, CURB + .7, z - .3, z + .3, 'flat', { col: 0x25282b, a: false, n: false });
  for (let r = 0; r < 5; r++) { const x = L.x0 + 14.3 + r * 12.6; [L.z0 + 1.5, L.cz, L.z1 - 1.5].forEach(z => navNode(x, CURB, z)); }
  navNode(L.x0 + 1.5, CURB, L.cz); navNode(L.x1 - 1.5, CURB, L.cz);
  POI.push({ k: 'work', role: 2, x: L.x0 + 14.3, z: L.z0 + 1.5, bx: L.x0 + 52.1, bz: L.z1 - 1.5 }, { k: 'work', role: 2, x: L.x0 + 39.5, z: L.cz, bx: L.x0 + 64.7, bz: L.z0 + 1.5 });
}
