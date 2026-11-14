/* =====================================================================
   6. PEOPLE — players, crew and bystanders share one jointed figure.
      Each body part is a single instanced mesh, so a hundred people cost about as much to draw as one.
   ===================================================================== */
const CHAR_MAX = 150;
const charMat = new T.MeshLambertMaterial({ color: 0xffffff }), gunMat = lam({});
const ZERO_M = new T.Matrix4().makeScale(0, 0, 0), _wc = new T.Color();
const CP = {};
const bxg = (w, h, d, x, y, z) => { const g = new T.BoxGeometry(w, h, d); g.translate(x || 0, y || 0, z || 0); return g; };
function charPart(name, geo, per, mat) { const m = new T.InstancedMesh(geo, mat || charMat, CHAR_MAX * per); m.castShadow = true; m.frustumCulled = false; m.userData.per = per; for (let i = 0; i < CHAR_MAX * per; i++) { m.setMatrixAt(i, ZERO_M); if (!mat) m.setColorAt(i, _wc.setHex(0xffffff)); } scene.add(m); CP[name] = m; return m; }
charPart('pelvis', bxg(.36, .2, .22), 1); charPart('chest', bxg(.43, .5, .245, 0, .29, 0), 1); charPart('head', bxg(.21, .24, .23, 0, .13, 0), 1);
{ const b = new GeoBuf(); b.box(-.118, .118, .215, .3, -.125, .125); b.box(-.105, .105, .215, .24, .12, .26); charPart('cap', b.build(), 1); }
charPart('beanie', bxg(.228, .13, .246, 0, .24, -.004), 1); charPart('hood', bxg(.262, .29, .255, 0, .15, -.035), 1); charPart('hair', bxg(.222, .085, .242, 0, .262, -.006), 1); charPart('mask', bxg(.218, .105, .07, 0, .065, .092), 1);
charPart('uarm', bxg(.12, .3, .13, 0, -.15, 0), 2); charPart('farm', bxg(.1, .27, .11, 0, -.135, 0), 2); charPart('hand', bxg(.09, .1, .1, 0, -.32, 0), 2);
charPart('thigh', bxg(.155, .44, .17, 0, -.22, 0), 2); charPart('shin', bxg(.13, .42, .145, 0, -.21, 0), 2); charPart('shoe', bxg(.135, .09, .27, 0, -.445, .05), 2);
const HEADGEAR = ['cap', 'beanie', 'hood', 'hair'];
// --- the same figure up close: rounded and tapered limbs, a jaw, a nose, ears, eyes and brows, hair that wraps the head, a sole on
//     each shoe. Drawn for anyone within about 45 m when the textures setting is above Low; past that (and on Low) the boxes above.
//     The vertex colours shade the features (dark eyes, brows) and multiply by each person's own colours.
function rbox(w, h, d, r, seg, taper) {   // a box with its edges rounded to radius r; taper: [x, z] scale at the bottom, 1 at the top
  const g = new T.BoxGeometry(w, h, d, seg[0], seg[1], seg[2]), p = g.attributes.position, n = g.attributes.normal, a = w / 2 - r, b = h / 2 - r, c = d / 2 - r;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), qx = clamp(x, -a, a), qy = clamp(y, -b, b), qz = clamp(z, -c, c), dx = x - qx, dy = y - qy, dz = z - qz, l = Math.hypot(dx, dy, dz) || 1;
    let X = qx + dx / l * r, Y = qy + dy / l * r, Z = qz + dz / l * r; if (taper) { const t = (Y + h / 2) / h; X *= lerp(taper[0], 1, t); Z *= lerp(taper[1], 1, t); }
    p.setXYZ(i, X, Y, Z); n.setXYZ(i, dx / l, dy / l, dz / l); }
  return g;
}
const CPD = {}, charMatD = [new T.MeshLambertMaterial({ vertexColors: true }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0, envMapIntensity: .6 })];
{ const W1 = [1, 1, 1], dk = [.06, .05, .05], brow = [.2, .18, .17], lip = [.6, .45, .43], band = [.82, .82, .82], sole = [.5, .5, .5];
  const part = (name, per, fn) => { const b = new GeoBuf(); fn((g, x, y, z, col) => { g.translate(x, y, z); b.geo(g, null, col || W1); g.dispose(); }); const m = new T.InstancedMesh(b.build(), charMatD[0], CHAR_MAX * per);
    m.castShadow = true; m.frustumCulled = false; m.userData.per = per; for (let i = 0; i < CHAR_MAX * per; i++) { m.setMatrixAt(i, ZERO_M); m.setColorAt(i, _wc.setHex(0xffffff)); } m.count = 0; scene.add(m); CPD[name] = m; };
  part('pelvis', 1, put => put(rbox(.355, .21, .22, .07, [3, 2, 2]), 0, 0, 0));
  part('chest', 1, put => put(rbox(.43, .5, .245, .085, [4, 5, 2], [.8, .85]), 0, .29, 0));
  part('head', 1, put => { put(rbox(.2, .235, .215, .07, [4, 4, 4], [.8, .9]), 0, .135, 0); put(new T.CylinderGeometry(.05, .056, .1, 10, 1, true), 0, -.008, -.008);   // skull and jaw, neck
    put(rbox(.034, .052, .036, .014, [1, 1, 1]), 0, .118, .108); put(rbox(.06, .014, .012, .005, [1, 1, 1]), 0, .084, .1, lip);                                      // nose, mouth
    [-1, 1].forEach(sd => { put(rbox(.024, .056, .042, .011, [1, 1, 1]), sd * .1, .132, -.006); put(rbox(.032, .019, .012, .006, [1, 1, 1]), sd * .044, .148, .1, dk); put(rbox(.042, .012, .012, .005, [1, 1, 1]), sd * .044, .171, .1, brow); }); });   // ears, eyes, brows
  part('hair', 1, put => { put(rbox(.222, .1, .238, .05, [3, 2, 3]), 0, .236, -.008); put(rbox(.216, .15, .095, .04, [3, 2, 1]), 0, .17, -.07); });
  part('beanie', 1, put => { put(rbox(.232, .14, .252, .09, [3, 2, 3]), 0, .246, -.006); put(rbox(.238, .045, .258, .02, [3, 1, 3]), 0, .195, -.006, band); });
  part('hood', 1, put => put(rbox(.272, .29, .205, .09, [3, 3, 2]), 0, .152, -.06));
  part('cap', 1, put => { put(rbox(.228, .095, .242, .08, [3, 2, 3]), 0, .252, -.006); put(rbox(.2, .022, .135, .009, [2, 1, 2]), 0, .214, .168); });
  part('mask', 1, put => put(rbox(.226, .11, .088, .035, [2, 2, 1]), 0, .07, .088));
  part('uarm', 2, put => put(rbox(.122, .32, .132, .056, [2, 3, 2], [.84, .88]), 0, -.15, 0));
  part('farm', 2, put => put(rbox(.102, .28, .112, .048, [2, 3, 2], [.8, .84]), 0, -.135, 0));
  part('hand', 2, put => put(rbox(.086, .105, .096, .036, [2, 2, 2]), 0, -.318, .006));
  part('thigh', 2, put => put(rbox(.162, .46, .176, .072, [2, 4, 2], [.76, .8]), 0, -.22, 0));
  part('shin', 2, put => put(rbox(.132, .43, .142, .06, [2, 4, 2], [.74, .8]), 0, -.21, 0));
  part('shoe', 2, put => { put(rbox(.132, .085, .28, .04, [2, 1, 3]), 0, -.438, .05); put(rbox(.138, .026, .29, .011, [2, 1, 3]), 0, -.477, .05, sole); }); }
function charLook() { const m = charMatD[GQ.env ? 1 : 0]; for (const k in CPD) CPD[k].material = m; }
// the near figures are packed into the front of each instanced mesh every frame, so only as many are drawn as there are people near
const NEAR = { list: [], frame: 0 };
function flushNear() {
  const L = NEAR.list, n = L.length, col = (m, k, h) => m.setColorAt(k, _wc.setHex(h));
  for (let k = 0; k < n; k++) { const c = L[k], r = c.rig, Lk = c.look;
    CPD.pelvis.setMatrixAt(k, r.hips.matrixWorld); col(CPD.pelvis, k, Lk.pants); CPD.chest.setMatrixAt(k, r.torso.matrixWorld); col(CPD.chest, k, Lk.top); CPD.head.setMatrixAt(k, r.head.matrixWorld); col(CPD.head, k, Lk.skin);
    HEADGEAR.forEach(g => { if (g === Lk.gear) { CPD[g].setMatrixAt(k, r.head.matrixWorld); col(CPD[g], k, Lk.gearCol); } else CPD[g].setMatrixAt(k, ZERO_M); });
    if (Lk.mask) { CPD.mask.setMatrixAt(k, r.head.matrixWorld); col(CPD.mask, k, Lk.maskCol || 0); } else CPD.mask.setMatrixAt(k, ZERO_M);
    for (let s = 0; s < 2; s++) { const j = k * 2 + s; CPD.uarm.setMatrixAt(j, r.sh[s].matrixWorld); col(CPD.uarm, j, Lk.top); CPD.farm.setMatrixAt(j, r.el[s].matrixWorld); col(CPD.farm, j, Lk.tee ? Lk.skin : Lk.top);
      CPD.hand.setMatrixAt(j, r.el[s].matrixWorld); col(CPD.hand, j, Lk.skin); CPD.thigh.setMatrixAt(j, r.hip[s].matrixWorld); col(CPD.thigh, j, Lk.pants); CPD.shin.setMatrixAt(j, r.kn[s].matrixWorld); col(CPD.shin, j, Lk.shorts ? Lk.skin : Lk.pants); CPD.shoe.setMatrixAt(j, r.kn[s].matrixWorld); col(CPD.shoe, j, Lk.shoe); } }
  for (const k in CPD) { const m = CPD[k]; m.count = n * m.userData.per; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  L.length = 0; NEAR.frame++;
}
// guns, modelled in gun space: +z down the barrel, origin at the firing hand
const GUN_GEO = {}, GUN_MUZ = {};
{ const st = hexCol(0x2a2d31), dk = hexCol(0x15171a), wd = hexCol(0x6a4528), pl = hexCol(0x3d4145), mk = (id, f, mz) => { const b = new GeoBuf(); f(b); GUN_GEO[id] = b.build(); GUN_MUZ[id] = mz; };
  mk('pistol', b => { b.box(-.016, .016, .035, .078, -.05, .15, st); b.box(-.014, .014, -.075, .04, -.05, -.008, dk); b.box(-.005, .005, .078, .088, .13, .14, dk); b.box(-.006, .006, .01, .035, -.005, .03, dk); }, .15);
  mk('smg', b => { b.box(-.022, .022, .018, .088, -.1, .2, st); b.box(-.01, .01, .042, .064, .2, .3, dk); b.box(-.014, .014, -.21, .02, .02, .062, dk); b.box(-.016, .016, -.09, .02, -.085, -.04, dk); b.box(-.012, .012, .03, .062, -.19, -.1, dk); b.box(-.005, .005, .088, .1, .15, .16, dk); }, .3);
  mk('shotgun', b => { b.box(-.014, .014, .05, .082, -.1, .76, st); b.box(-.013, .013, .016, .046, .12, .7, dk); b.box(-.025, .025, .006, .058, .3, .48, wd); b.box(-.022, .022, 0, .092, -.14, .12, st); b.box(-.02, .02, -.065, .07, -.46, -.14, wd); b.box(-.015, .015, -.1, 0, -.13, -.085, wd); }, .76);
  mk('rifle', b => { b.box(-.022, .022, 0, .086, -.14, .16, st); b.box(-.025, .025, .008, .076, .16, .44, pl); b.box(-.01, .01, .034, .056, .44, .68, dk); b.box(-.014, .014, -.2, 0, .02, .09, dk); b.box(-.015, .015, -.11, 0, -.125, -.078, dk); b.box(-.02, .02, -.035, .07, -.42, -.14, pl); b.box(-.005, .005, .086, .118, .4, .42, dk); b.box(-.012, .012, .086, .11, -.1, -.06, dk); b.box(-.016, .016, .028, .062, .66, .72, dk); }, .72);
  mk('marksman', b => { b.box(-.022, .022, 0, .084, -.16, .18, st); b.box(-.022, .022, .01, .07, .18, .52, wd); b.box(-.009, .009, .034, .054, .52, .92, dk); b.box(-.014, .014, -.13, 0, .02, .08, dk); b.box(-.015, .015, -.11, 0, -.14, -.095, wd); b.box(-.02, .02, -.045, .075, -.46, -.16, wd); b.box(-.006, .006, .084, .105, -.05, -.02, dk); b.box(-.006, .006, .084, .105, .1, .13, dk);
    const c = new T.CylinderGeometry(.024, .024, .3, 10); c.rotateX(PI / 2); c.translate(0, .128, .04); b.geo(c, null, dk); c.dispose(); const e = new T.CylinderGeometry(.03, .024, .06, 10); e.rotateX(PI / 2); e.translate(0, .128, .21); b.geo(e, null, dk); e.dispose(); }, .92);
  const drum = (b, y) => { const c = new T.CylinderGeometry(.052, .052, .05, 12); c.rotateZ(PI / 2); c.translate(0, y, .02); b.geo(c, null, dk); c.dispose(); };
  mk('glocks', b => { b.box(-.016, .016, .035, .078, -.05, .15, dk); b.box(-.014, .014, -.06, .04, -.05, -.008, dk); b.box(-.005, .005, .078, .088, .13, .14, st); drum(b, -.1); }, .15);
  mk('m60', b => { b.box(-.026, .026, 0, .09, -.2, .3, st); b.box(-.012, .012, .04, .064, .3, .86, dk); b.box(-.03, .03, -.02, .055, .32, .5, pl); b.box(-.02, .02, -.04, .07, -.6, -.2, wd); b.box(-.014, .014, -.12, 0, -.13, -.085, dk); b.box(-.05, -.02, -.1, .02, -.02, .14, pl); b.box(-.004, .004, -.3, .04, .62, .66, dk); b.box(-.02, .02, .09, .13, -.04, .02, dk); }, .86);
  mk('gl', b => { const c = new T.CylinderGeometry(.075, .075, .2, 6); c.rotateX(PI / 2); c.translate(0, .04, .1); b.geo(c, null, st); c.dispose(); b.box(-.022, .022, .01, .07, .2, .5, dk); b.box(-.018, .018, -.11, 0, -.09, -.04, dk); b.box(-.02, .02, -.03, .06, -.36, -.08, pl); b.box(-.016, .016, -.06, .02, .24, .3, dk); }, .5);
  mk('rpg', b => { const c = new T.CylinderGeometry(.06, .06, 1.15, 10); c.rotateX(PI / 2); c.translate(0, .07, .12); b.geo(c, null, hexCol(0x3a4a34)); c.dispose(); const e = new T.CylinderGeometry(.08, .06, .14, 10); e.rotateX(PI / 2); e.translate(0, .07, .72); b.geo(e, null, dk); e.dispose(); b.box(-.015, .015, -.12, 0, -.03, .02, dk); b.box(-.015, .015, -.1, 0, .2, .25, dk); b.box(-.03, .03, .13, .16, -.02, .06, dk); }, .76); }
const GUN_IDS = Object.keys(GUN_GEO), GUNMESH = {};
GUN_IDS.forEach(id => { GUNMESH[id] = charPart('gun_' + id, GUN_GEO[id], 1, gunMat); });
const GUN2 = charPart('gun_glocks2', GUN_GEO.glocks, 1, gunMat);   // the second of the pair, in the other hand
// where the gun sits in the shoulder frame, and how the arms hold it. Arm 0 is the firing arm (model -x).
const HOLD = {
  pistol: { g: [-.03, -.13, .56, 0], s0: [-1.33, .38], e0: -.18, s1: [-1.25, -.52], e1: -.28 },
  long:   { g: [-.13, -.2, .36, .06], s0: [-.72, .12], e0: -1.12, s1: [-1.18, -.5], e1: -.42 },
  dual:   { g: [-.27, -.12, .54, 0], g2: [.27, -.12, .54, 0], s0: [-1.45, -.02], e0: -.06, s1: [-1.45, .02], e1: -.06 },
  tube:   { g: [-.16, .02, .2, .04], s0: [-.85, .1], e0: -1.3, s1: [-1.25, -.45], e1: -.5 },
};
const holdOf = id => id === 'pistol' || id === 'smg' ? HOLD.pistol : id === 'glocks' ? HOLD.dual : id === 'rpg' ? HOLD.tube : HOLD.long;
const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68e63, 0x9a6642, 0x70452b, 0x4f3020], HAIRC = [0x1a1512, 0x2e2118, 0x5a3d25, 0x8a6a3d, 0xb9b4a8, 0x111111];
const CIV_TOP = [0xd8d6cc, 0x6b7a6a, 0x8a7a5c, 0x5a5f66, 0xc9b27a, 0x7a5a6a, 0x3f4a44, 0xb9a48f, 0xe8d8a0, 0x9a8f86, 0x4a5a4a], PANTS = [0x2f3640, 0x4a4238, 0x1c1e22, 0x6a6258, 0x3a4a5c, 0x26282c];
// what someone wears follows from who they are: crews in their colour, police in blue, people at work in what the job gives them, bystanders in whatever
const ROLE = { none: 0, staff: 1, hand: 2 };   // staff: behind a counter or a stall. hand: yards, docks, workshops
function makeLook(seed, team, role) {
  const r = rng32(seed * 7919 + 13), L = { skin: pick(r, SKIN), hair: pick(r, HAIRC), h: .93 + r() * .1 };
  if (team >= 0 && team < NCREW) { const C = CREWS[team].tops.concat([0xe8e4da]); L.top = pick(r, C.slice(0, 4)); L.gear = pick(r, ['cap', 'beanie', 'hood', 'hair', 'hood', 'cap']); L.gearCol = L.gear === 'hood' ? L.top : L.gear === 'hair' ? L.hair : pick(r, [C[0], C[1], 0x1c1e22]); L.mask = r() < .45; L.maskCol = C[0]; L.pants = pick(r, [0x1c1e22, 0x2f3640, 0x26282c, 0x4a4238]); if (L.top === 0x1c1e22) { L.gearCol = C[0]; L.mask = true; } }
  else if (team === TEAM_COP) { L.top = 0x1c2a4a; L.pants = 0x161d30; L.gear = 'cap'; L.gearCol = 0x101626; L.mask = false; }
  else if (role === ROLE.staff) { L.top = pick(r, [0xf2efe6, 0xe8e4da, 0xd8d6cc]); L.pants = pick(r, [0x1c1e22, 0x2f3640]); L.gear = pick(r, ['cap', 'hair', 'cap']); L.gearCol = L.gear === 'hair' ? L.hair : pick(r, [0x1d5c3a, 0xa3221b, 0x15467a]); L.mask = false; }
  else if (role === ROLE.hand) { L.top = pick(r, [0x4a5a6a, 0x5a6a5a, 0x6a5a48]); L.pants = L.top; L.gear = 'cap'; L.gearCol = pick(r, [0xf2efe6, 0xe0a224]); L.mask = false; }
  else { L.top = pick(r, CIV_TOP); L.pants = pick(r, PANTS); L.gear = pick(r, ['hair', 'hair', 'hair', 'cap', 'beanie']); L.gearCol = L.gear === 'hair' ? L.hair : pick(r, [0x4a4238, 0x6b7a6a, 0x26282c, 0x8a7a5c]); L.mask = false; }
  L.tee = r() < .35 && L.gear !== 'hood'; L.shorts = r() < .18 && role !== ROLE.hand; L.shoe = pick(r, [0xe8e4da, 0x1c1e22, 0xe8e4da, 0x5a3d25, 0xb3261e]);
  return L;
}
const chars = [], charFree = []; for (let i = CHAR_MAX - 1; i >= 0; i--) charFree.push(i);
function makeRig() {
  const N = () => new T.Object3D(), root = N(), hips = N(), torso = N(), head = N(), up = N(), gun = N(), sh = [N(), N()], el = [N(), N()], hip = [N(), N()], kn = [N(), N()];
  root.rotation.order = 'YXZ'; hips.position.set(0, .97, 0); root.add(hips); torso.position.set(0, .07, 0); hips.add(torso); head.position.set(0, .56, 0); torso.add(head); up.position.set(0, .46, 0); torso.add(up); up.add(gun); const gun2 = new T.Object3D(); up.add(gun2);
  [0, 1].forEach(i => { const sd = i ? 1 : -1; sh[i].position.set(sd * .27, 0, 0); sh[i].rotation.order = 'YXZ'; up.add(sh[i]); el[i].position.set(0, -.3, 0); sh[i].add(el[i]); hip[i].position.set(sd * .1, -.04, 0); hips.add(hip[i]); kn[i].position.set(0, -.44, 0); hip[i].add(kn[i]); });
  return { root, hips, torso, head, up, gun, gun2, sh, el, hip, kn };
}
function setLook(c, L) {
  const i = c.idx, col = (m, k, h) => { m.setColorAt(k, _wc.setHex(h)); m.instanceColor.needsUpdate = true; };
  c.look = L; [CP].forEach(P => { col(P.pelvis, i, L.pants); col(P.chest, i, L.top); col(P.head, i, L.skin);
  HEADGEAR.forEach(g => { col(P[g], i, L.gearCol); if (g !== L.gear) P[g].setMatrixAt(i, ZERO_M); }); col(P.mask, i, L.maskCol || 0); if (!L.mask) P.mask.setMatrixAt(i, ZERO_M);
  for (let k = 0; k < 2; k++) { const j = i * 2 + k; col(P.uarm, j, L.top); col(P.farm, j, L.tee ? L.skin : L.top); col(P.hand, j, L.skin); col(P.thigh, j, L.pants); col(P.shin, j, L.shorts ? L.skin : L.pants); col(P.shoe, j, L.shoe); } });
}
function makeChar(look) {
  if (!charFree.length) return null;
  const c = { idx: charFree.pop(), rig: makeRig(), ph: rand() * 6, amp: 0, aim: 0, hold: 0, fall: 0, sit: 0, gun: null, shown: true, muz: new T.Vector3(), kick: 0 };
  chars.push(c); setLook(c, look); return c;
}
function zeroParts(P, i) { for (const k in P) { const m = P[k]; if (m.userData.per === 1) m.setMatrixAt(i, ZERO_M); else { m.setMatrixAt(i * 2, ZERO_M); m.setMatrixAt(i * 2 + 1, ZERO_M); } } }
function hideChar(c) { if (!c.shown) return; c.shown = false; const i = c.idx; zeroParts(CP, i); c.gun = null; }
function freeChar(c) { if (!c) return; c.shown = true; hideChar(c); const k = chars.indexOf(c); if (k >= 0) chars.splice(k, 1); charFree.push(c.idx); }
const _mz = new T.Vector3();
// What someone is doing when they are not walking, fighting or driving. The number travels with them between machines.
const ACT = { none: 0, talk: 1, sit: 2, lean: 3, handsup: 4, phone: 5, dance: 6, ball: 7, cower: 8, browse: 9, smoke: 10, carry: 11 };
/* Pose one figure. s: { x, y, z, yaw, pitch, spd, air, wpn, aim 0..1, reload, seat ('drive' | 'ride' | null), twist (radians the chest turns, for firing from a seat),
   dead (seconds since death, or -1), knock 0..1, punch 0..1, sprint, act (one of ACT), shoot 0..1 (arms up for a shot at the basket) } */
function poseChar(c, s, dt) {
  const r = c.rig, q = Math.min(1, dt * 12), spd = s.spd || 0, act = s.dead >= 0 || s.knock > .5 ? 0 : (s.act | 0), seated = !!s.seat || act === ACT.sit;
  const moving = spd > .3 && !s.air && !seated;
  // which way they are actually going, from where they were a moment ago (works the same for anyone, here or on another machine)
  if (c.px === undefined || hyp(s.x - c.px, s.z - c.pz) > 3 || dt <= 0) { c.px = s.x; c.pz = s.z; c.mvF = 1; c.mvS = 0; c.lyaw = s.yaw; c.yr = 0; }
  { const dx = s.x - c.px, dz = s.z - c.pz, fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw), l = hyp(dx, dz); c.px = s.x; c.pz = s.z;
    if (l > dt * .25) { const k = Math.min(1, dt * 8); c.mvF = lerp(c.mvF, (dx * fx + dz * fz) / l, k); c.mvS = lerp(c.mvS, (dx * -fz + dz * fx) / l, k); }   // forward, and to the right
    const yr = angTo(c.lyaw, s.yaw) / Math.max(dt, 1e-3); c.lyaw = s.yaw; c.yr = lerp(c.yr, clamp(yr, -8, 8), Math.min(1, dt * 6)); }
  // a stride that matches the ground covered: a walk is about 0.9 strides a second, a run 1.5. Each leg spends part of the stride on the
  // ground (60% walking, about 35% running) and sweeps back under the body at exactly the speed it is going, so the foot stays put
  const rn = smooth01((spd - 2.2) / 2.6), freq = lerp(.55 + .25 * spd, 1.25 + .05 * spd, rn), duty = lerp(.6, .36, rn), legL = .88 * (c.look.h || 1);
  const shuffle = !moving && !seated && !s.air && Math.abs(c.yr) > 1.3;   // turning on the spot: a few small steps
  const gs = moving ? spd : shuffle ? .7 : 0, gf = moving ? freq : 1.1;   // shuffling round on the spot: small steps
  if (moving || shuffle) c.ph += dt * TAU * gf; c.gs = lerp(c.gs || 0, gs, Math.min(1, dt * 7)); c.gf = lerp(c.gf || 1, gf, Math.min(1, dt * 7));
  c.amp = lerp(c.amp, moving || shuffle ? Math.min(.95, c.gs * .35) : 0, Math.min(1, dt * 7)); c.run = lerp(c.run || 0, moving ? rn : 0, Math.min(1, dt * 5));
  if (c.wasAir && !s.air && !seated) c.land = 1; c.wasAir = !!s.air; c.land = Math.max(0, (c.land || 0) - dt * 3.5);   // landing: a dip at the knees
  const armed = s.wpn && s.wpn !== 'fist' ? 1 : 0, H = armed ? holdOf(s.wpn) : HOLD.pistol;
  const busy = act > 0 && act !== ACT.sit && (!moving || act === ACT.carry);                       // doing something with their hands: a gun stays down, a walk keeps its arms
  c.hold = lerp(c.hold, armed && (!seated || s.aim > .1) && !(busy && !(s.aim > .1)) ? 1 : 0, q); c.aim = lerp(c.aim, s.aim || 0, q); c.sit = lerp(c.sit, seated ? 1 : 0, Math.min(1, dt * 9));
  const dead = s.dead >= 0 ? 1 : (s.knock || 0); c.fall = lerp(c.fall, dead, Math.min(1, dt * (dead > c.fall ? 9 : 4)));
  c.kick = Math.max(0, c.kick - dt * 5);
  // what they are doing fades in and out, so a pose never snaps
  if (busy) { c.actId = act; c.actW = lerp(c.actW || 0, 1, Math.min(1, dt * 6)); } else c.actW = lerp(c.actW || 0, 0, Math.min(1, dt * 8));
  c.t = (c.t || c.idx * 1.37) + dt;
  const A = c.actId | 0, w = c.actW < .01 ? 0 : c.actW, t = c.t, shot = s.shoot || 0;
  const sn = Math.sin(c.ph), cs = Math.cos(c.ph), a = c.amp, f = c.fall, st = c.sit, R = c.run, ld = c.land, ang = Math.atan2(c.mvS, Math.max(-1, c.mvF)), mcos = Math.cos(ang), msin = Math.sin(ang);
  const idle = !moving && !shuffle && !seated && !s.air && !busy && f < .1, br = idle ? 1 : 0;   // standing about: breathing, weight on one leg then the other
  const low = w * (A === ACT.cower ? .42 : A === ACT.ball ? .08 : A === ACT.dance ? .03 + Math.abs(Math.sin(t * 5.2)) * .05 : 0);
  r.root.position.set(s.x, s.y + f * .12, s.z); r.root.rotation.set(-f * 1.5, s.yaw + PI, clamp(c.yr * spd * .011, -.17, .17) * (1 - st)); r.root.scale.setScalar(c.look.h);   // leaning into a turn at a run
  // where each leg is in its stride: on the ground its foot sweeps straight back under the hip; in the air it swings forward, knee folded
  const sMax = Math.min(.9, c.gs * duty / (2 * legL * Math.max(c.gf, .3))), legA = [0, 0], legK = [0, 0]; let stand = 0;
  for (let k = 0; k < 2; k++) { const u = ((c.ph / TAU + (k ? .5 : 0)) % 1 + 1) % 1;
    if (u < duty) { const th = Math.asin(lerp(-sMax, sMax, u / duty)); legA[k] = th; legK[k] = .05 + R * .16 * Math.sin(u / duty * PI); stand = Math.max(stand, Math.cos(th)); }
    else { const v = (u - duty) / (1 - duty), sw = Math.sin(v * PI); legA[k] = Math.asin(sMax) * Math.cos(v * PI) - sw * (.15 + .5 * R) * Math.min(1, c.gs); legK[k] = sw * (.55 + 1.15 * R) * Math.min(1, c.gs * 1.5); } }
  const bob = a > .01 ? (stand ? (1 - stand) * legL * .75 : -.03 * R) : 0;   // the body vaults over the leg it stands on; a run leaves the ground between steps
  r.hips.position.y = lerp(.97 - bob - (s.air ? .04 : 0) - ld * .13, .4, st) - low; r.hips.position.x = (.028 * cs * a * (1 - R) + br * .018 * Math.sin(t * .37)) * (1 - st);
  r.hips.rotation.set(0, .12 * sn * a * (1 - R * .4) * (1 - st), br * .025 * Math.sin(t * .37));
  r.torso.rotation.set(lerp(.03 + a * .08 + R * .17 + (s.sprint ? .1 : 0) + br * .014 * Math.sin(t * 1.7) + ld * .15, -.16, st) + w * (A === ACT.cower ? .75 : A === ACT.lean ? -.1 : A === ACT.browse ? .1 : A === ACT.ball ? .18 : 0),
    (s.twist || 0) - .2 * sn * a * (1 - st) + (A === ACT.dance ? w * .3 * Math.sin(t * 2.6) : 0), f * .2);
  // legs: thigh swings, knee folds while the leg comes forward
  for (let k = 0; k < 2; k++) { const sg = k ? -1 : 1, g = Math.min(1, a * 3), hipA = legA[k] * g, kneeA = legK[k] * g + ld * .55 + br * Math.max(0, Math.sin(t * .37) * sg) * .14;
    let hx = lerp(s.air ? -.35 + k * .5 : hipA * mcos, -1.42, st), kx = lerp(s.air ? .7 : kneeA, 1.3, st), hz = s.air ? 0 : hipA * msin * (1 - st);
    if (w) { if (A === ACT.cower) { hx = lerp(hx, -1.25, w); kx = lerp(kx, 2.1, w); } else if (A === ACT.lean && !k) { hx = lerp(hx, -.55, w); kx = lerp(kx, 1.05, w); } else if (A === ACT.ball) { hx = lerp(hx, -.32, w); kx = lerp(kx, .5, w); }
      else if (A === ACT.dance) { const b = Math.max(0, Math.sin(t * 5.2 + k * PI)); hx = lerp(hx, -.22 * b, w); kx = lerp(kx, .45 * b, w); } }
    r.hip[k].rotation.set(hx * (1 - f * .8), 0, (k ? 1 : -1) * f * .22 + hz * (1 - f)); r.kn[k].rotation.x = kx * (1 - f * .6); }
  // arms: hang and swing, hold the weapon, or do what the moment calls for; the whole shoulder frame tips with the aim
  const h = c.hold, pitch = s.pitch || 0, rl = s.reload ? 1 : 0, pn = s.punch || 0;
  r.up.rotation.x = h * lerp(.72, -pitch * .92, c.aim) + h * rl * .4 - c.kick * .12;
  r.head.rotation.x = lerp(0, -pitch * .55, Math.max(c.aim, 1 - h)) * (1 - f) + w * (A === ACT.phone ? .38 : A === ACT.browse ? .16 : A === ACT.cower ? .3 : 0);
  r.head.rotation.y = w * (A === ACT.talk ? .3 * Math.sin(t * .7) : A === ACT.browse ? .45 * Math.sin(t * .5) : A === ACT.lean ? .5 * Math.sin(t * .23) : 0) + br * (1 - h) * .22 * Math.sin(t * .21 + c.idx) * Math.max(0, Math.sin(t * .13 + c.idx * 2));   // a look round now and then
  for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1, sg = k ? 1 : -1, hs = k ? H.s1 : H.s0, he = k ? H.e1 : H.e0;
    let ax = sg * sn * a * (.85 + R * .35) - R * .25, ay = 0, az = sd * (.07 + f * 1.05 + br * .02), ex = -.15 - a * .35 - R * 1.05 - br * .05;   // a run bends the elbows and pumps the arms
    if (st > .01) { const dr = s.seat === 'drive'; ax = lerp(ax, dr ? -1.05 : -.45, st); ay = lerp(ay, dr ? -sd * .22 : 0, st); ex = lerp(ex, dr ? -.45 : -.9, st); }
    if (w) { let tx = ax, ty = ay, te = ex;
      if (A === ACT.talk) { const g = k ? Math.max(0, Math.sin(t * 1.1)) : Math.max(0, Math.sin(t * .8 + 2)) * .6; tx = -.25 - g * (.75 + .2 * Math.sin(t * 5)); te = -.5 - g * .9; }
      else if (A === ACT.lean) { tx = -.55; ty = -sd * .75; te = -1.75; }
      else if (A === ACT.handsup) { tx = -2.85; ty = sd * .25; te = -.3; }
      else if (A === ACT.phone) { if (k) { tx = -.85; ty = -.35; te = -2.0; } }
      else if (A === ACT.dance) { tx = -.6 + .55 * Math.sin(t * 5.2 + k * PI); te = -1.15; ty = sd * .2; }
      else if (A === ACT.ball) { if (shot > 0) { tx = lerp(-.9, -2.75, shot); te = lerp(-1.2, -.25, shot); } else if (k) { tx = -.55 + .3 * Math.sin(t * 9.5); te = -.85 + .45 * Math.sin(t * 9.5); } else { tx = -.2; te = -.5; } }
      else if (A === ACT.cower) { tx = -2.5; ty = -sd * .35; te = -2.1; }
      else if (A === ACT.browse) { tx = .28; ty = -sd * .2; te = -.35; }
      else if (A === ACT.smoke) { if (k) { const m = Math.pow(Math.max(0, Math.sin(t * .85)), 3); tx = lerp(-.1, -1.0, m); te = lerp(-.3, -2.15, m); ty = lerp(0, -.3, m); } }
      else if (A === ACT.carry) { tx = -.78; ty = -sd * .12; te = -1.05; }
      ax = lerp(ax, tx, w); ay = lerp(ay, ty, w); ex = lerp(ex, te, w); }
    if (!k && pn > 0) { ax = lerp(ax, -1.5, pn); ex = lerp(ex, -.1, pn); }
    r.sh[k].rotation.set(lerp(ax, hs[0], h), lerp(ay, hs[1], h), az * (1 - h)); r.el[k].rotation.x = lerp(ex, he - (k ? rl * .7 : 0), h); }
  r.gun.position.set(H.g[0], H.g[1], H.g[2] - c.kick * .04); r.gun.rotation.y = H.g[3]; if (H.g2) { r.gun2.position.set(H.g2[0], H.g2[1], H.g2[2] - c.kick * .04); r.gun2.rotation.y = H.g2[3]; }
  // write the joints out to the instanced parts
  const i = c.idx; c.shown = true; r.root.updateMatrixWorld(true);
  const dist = hyp(s.x - camera.position.x, s.z - camera.position.z), det = GQ.tex > 0 && dist < (c.det ? 48 : 42);   // near: the rounded figure
  if (det !== !!c.det) { c.det = det; if (det) for (const k in CP) if (!k.startsWith('gun')) { const m = CP[k]; if (m.userData.per === 1) m.setMatrixAt(i, ZERO_M); else { m.setMatrixAt(i * 2, ZERO_M); m.setMatrixAt(i * 2 + 1, ZERO_M); } } }
  if (det) { if (c.nearF !== NEAR.frame) { c.nearF = NEAR.frame; NEAR.list.push(c); } }   // drawn by flushNear
  else { const P = CP; P.pelvis.setMatrixAt(i, r.hips.matrixWorld); P.chest.setMatrixAt(i, r.torso.matrixWorld); P.head.setMatrixAt(i, r.head.matrixWorld); P[c.look.gear].setMatrixAt(i, r.head.matrixWorld); if (c.look.mask) P.mask.setMatrixAt(i, r.head.matrixWorld);
    for (let k = 0; k < 2; k++) { const j = i * 2 + k; P.uarm.setMatrixAt(j, r.sh[k].matrixWorld); P.farm.setMatrixAt(j, r.el[k].matrixWorld); P.hand.setMatrixAt(j, r.el[k].matrixWorld); P.thigh.setMatrixAt(j, r.hip[k].matrixWorld); P.shin.setMatrixAt(j, r.kn[k].matrixWorld); P.shoe.setMatrixAt(j, r.kn[k].matrixWorld); } }
  const g = armed && h > .5 ? s.wpn : null;
  if (c.gun !== g) { if (c.gun) GUNMESH[c.gun].setMatrixAt(i, ZERO_M); if (c.gun === 'glocks') GUN2.setMatrixAt(i, ZERO_M); c.gun = g; }
  if (g) { GUNMESH[g].setMatrixAt(i, r.gun.matrixWorld); c.muz.set(0, .05, GUN_MUZ[g]).applyMatrix4(r.gun.matrixWorld); if (g === 'glocks') { GUN2.setMatrixAt(i, r.gun2.matrixWorld); if (c.flip) c.muz.set(0, .05, GUN_MUZ[g]).applyMatrix4(r.gun2.matrixWorld); } } else c.muz.set(s.x, s.y + 1.35, s.z);
}
function flushChars() { for (const k in CP) CP[k].instanceMatrix.needsUpdate = true; flushNear(); }

// name tags over other players
function nameTag(text, css, down, rank) {   // rank: drawn in a little badge before the name, the way online players show theirs
  const c = texCanvas(256, 64), x = c.getContext('2d'); x.font = '700 34px "Saira Condensed", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)';
  let cx = 128; if (rank > 0) { const w = Math.min(196, x.measureText(text).width); cx = 128 + 22; const bx = cx - w / 2 - 24; x.beginPath(); x.arc(bx, 33, 19, 0, Math.PI * 2); x.fillStyle = '#2f6fd6'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#eaf2ff'; x.stroke(); x.fillStyle = '#fff'; x.font = '700 24px "Saira Condensed", system-ui, sans-serif'; x.fillText(String(rank), bx, 35); x.font = '700 34px "Saira Condensed", system-ui, sans-serif'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)'; }
  x.strokeText(text, cx, 34); x.fillStyle = css; x.fillText(text, cx, 34);
  const tex = new T.CanvasTexture(c), sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .92, fog: false })); sp.scale.set(1.5, .375, 1); sp.renderOrder = 5; scene.add(sp); return sp;
}
function killTag(sp) { if (!sp) return; scene.remove(sp); sp.material.map.dispose(); sp.material.dispose(); }
