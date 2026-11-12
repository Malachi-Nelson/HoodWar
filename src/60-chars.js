/* =====================================================================
   6. PEOPLE — players, crew and bystanders share one jointed figure.
      Each body part is a single instanced mesh, so forty people cost about as much to draw as one.
   ===================================================================== */
const CHAR_MAX = 72;
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
// guns, modelled in gun space: +z down the barrel, origin at the firing hand
const GUN_GEO = {}, GUN_MUZ = {};
{ const st = hexCol(0x2a2d31), dk = hexCol(0x15171a), wd = hexCol(0x6a4528), pl = hexCol(0x3d4145), mk = (id, f, mz) => { const b = new GeoBuf(); f(b); GUN_GEO[id] = b.build(); GUN_MUZ[id] = mz; };
  mk('pistol', b => { b.box(-.016, .016, .035, .078, -.05, .15, st); b.box(-.014, .014, -.075, .04, -.05, -.008, dk); b.box(-.005, .005, .078, .088, .13, .14, dk); b.box(-.006, .006, .01, .035, -.005, .03, dk); }, .15);
  mk('smg', b => { b.box(-.022, .022, .018, .088, -.1, .2, st); b.box(-.01, .01, .042, .064, .2, .3, dk); b.box(-.014, .014, -.21, .02, .02, .062, dk); b.box(-.016, .016, -.09, .02, -.085, -.04, dk); b.box(-.012, .012, .03, .062, -.19, -.1, dk); b.box(-.005, .005, .088, .1, .15, .16, dk); }, .3);
  mk('shotgun', b => { b.box(-.014, .014, .05, .082, -.1, .76, st); b.box(-.013, .013, .016, .046, .12, .7, dk); b.box(-.025, .025, .006, .058, .3, .48, wd); b.box(-.022, .022, 0, .092, -.14, .12, st); b.box(-.02, .02, -.065, .07, -.46, -.14, wd); b.box(-.015, .015, -.1, 0, -.13, -.085, wd); }, .76);
  mk('rifle', b => { b.box(-.022, .022, 0, .086, -.14, .16, st); b.box(-.025, .025, .008, .076, .16, .44, pl); b.box(-.01, .01, .034, .056, .44, .68, dk); b.box(-.014, .014, -.2, 0, .02, .09, dk); b.box(-.015, .015, -.11, 0, -.125, -.078, dk); b.box(-.02, .02, -.035, .07, -.42, -.14, pl); b.box(-.005, .005, .086, .118, .4, .42, dk); b.box(-.012, .012, .086, .11, -.1, -.06, dk); b.box(-.016, .016, .028, .062, .66, .72, dk); }, .72);
  mk('marksman', b => { b.box(-.022, .022, 0, .084, -.16, .18, st); b.box(-.022, .022, .01, .07, .18, .52, wd); b.box(-.009, .009, .034, .054, .52, .92, dk); b.box(-.014, .014, -.13, 0, .02, .08, dk); b.box(-.015, .015, -.11, 0, -.14, -.095, wd); b.box(-.02, .02, -.045, .075, -.46, -.16, wd); b.box(-.006, .006, .084, .105, -.05, -.02, dk); b.box(-.006, .006, .084, .105, .1, .13, dk);
    const c = new T.CylinderGeometry(.024, .024, .3, 10); c.rotateX(PI / 2); c.translate(0, .128, .04); b.geo(c, null, dk); c.dispose(); const e = new T.CylinderGeometry(.03, .024, .06, 10); e.rotateX(PI / 2); e.translate(0, .128, .21); b.geo(e, null, dk); e.dispose(); }, .92); }
const GUN_IDS = Object.keys(GUN_GEO), GUNMESH = {};
GUN_IDS.forEach(id => { GUNMESH[id] = charPart('gun_' + id, GUN_GEO[id], 1, gunMat); });
// where the gun sits in the shoulder frame, and how the arms hold it. Arm 0 is the firing arm (model -x).
const HOLD = {
  pistol: { g: [-.03, -.13, .56, 0], s0: [-1.33, .38], e0: -.18, s1: [-1.25, -.52], e1: -.28 },
  long:   { g: [-.13, -.2, .36, .06], s0: [-.72, .12], e0: -1.12, s1: [-1.18, -.5], e1: -.42 },
};
const holdOf = id => id === 'pistol' || id === 'smg' ? HOLD.pistol : HOLD.long;
const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68e63, 0x9a6642, 0x70452b, 0x4f3020], HAIRC = [0x1a1512, 0x2e2118, 0x5a3d25, 0x8a6a3d, 0xb9b4a8, 0x111111];
const CIV_TOP = [0xd8d6cc, 0x6b7a6a, 0x8a7a5c, 0x5a5f66, 0xc9b27a, 0x7a5a6a, 0x3f4a44, 0xb9a48f, 0xe8d8a0, 0x9a8f86, 0x4a5a4a], PANTS = [0x2f3640, 0x4a4238, 0x1c1e22, 0x6a6258, 0x3a4a5c, 0x26282c];
const CREW_TOP = [[0xff5a36, 0xc8401f, 0x8a2a14, 0x1c1e22, 0xe8e4da], [0x2fb6ff, 0x1f86c8, 0x145a8a, 0x1c1e22, 0xe8e4da]];
// what someone wears follows from who they are: crews in their colour, bystanders in none of it
function makeLook(seed, team) {
  const r = rng32(seed * 7919 + 13), L = { skin: pick(r, SKIN), hair: pick(r, HAIRC), h: .93 + r() * .1 };
  if (team === 0 || team === 1) { const C = CREW_TOP[team]; L.top = pick(r, C.slice(0, 4)); L.gear = pick(r, ['cap', 'beanie', 'hood', 'hair', 'hood', 'cap']); L.gearCol = L.gear === 'hood' ? L.top : L.gear === 'hair' ? L.hair : pick(r, [C[0], C[1], 0x1c1e22]); L.mask = r() < .45; L.maskCol = C[0]; L.pants = pick(r, [0x1c1e22, 0x2f3640, 0x26282c, 0x4a4238]); if (L.top === 0x1c1e22) { L.gearCol = C[0]; L.mask = true; } }
  else if (team === TEAM_COP) { L.top = 0x1c2a4a; L.pants = 0x161d30; L.gear = 'cap'; L.gearCol = 0x101626; L.mask = false; }
  else { L.top = pick(r, CIV_TOP); L.pants = pick(r, PANTS); L.gear = pick(r, ['hair', 'hair', 'hair', 'cap', 'beanie']); L.gearCol = L.gear === 'hair' ? L.hair : pick(r, [0x4a4238, 0x6b7a6a, 0x26282c, 0x8a7a5c]); L.mask = false; }
  L.tee = r() < .35 && L.gear !== 'hood'; L.shorts = r() < .18; L.shoe = pick(r, [0xe8e4da, 0x1c1e22, 0xe8e4da, 0x5a3d25, 0xb3261e]);
  return L;
}
const chars = [], charFree = []; for (let i = CHAR_MAX - 1; i >= 0; i--) charFree.push(i);
function makeRig() {
  const N = () => new T.Object3D(), root = N(), hips = N(), torso = N(), head = N(), up = N(), gun = N(), sh = [N(), N()], el = [N(), N()], hip = [N(), N()], kn = [N(), N()];
  root.rotation.order = 'YXZ'; hips.position.set(0, .97, 0); root.add(hips); torso.position.set(0, .07, 0); hips.add(torso); head.position.set(0, .56, 0); torso.add(head); up.position.set(0, .46, 0); torso.add(up); up.add(gun);
  [0, 1].forEach(i => { const sd = i ? 1 : -1; sh[i].position.set(sd * .27, 0, 0); sh[i].rotation.order = 'YXZ'; up.add(sh[i]); el[i].position.set(0, -.3, 0); sh[i].add(el[i]); hip[i].position.set(sd * .1, -.04, 0); hips.add(hip[i]); kn[i].position.set(0, -.44, 0); hip[i].add(kn[i]); });
  return { root, hips, torso, head, up, gun, sh, el, hip, kn };
}
function setLook(c, L) {
  const i = c.idx, col = (m, k, h) => { m.setColorAt(k, _wc.setHex(h)); m.instanceColor.needsUpdate = true; };
  c.look = L; col(CP.pelvis, i, L.pants); col(CP.chest, i, L.top); col(CP.head, i, L.skin);
  HEADGEAR.forEach(g => { col(CP[g], i, L.gearCol); if (g !== L.gear) CP[g].setMatrixAt(i, ZERO_M); }); col(CP.mask, i, L.maskCol || 0); if (!L.mask) CP.mask.setMatrixAt(i, ZERO_M);
  for (let k = 0; k < 2; k++) { const j = i * 2 + k; col(CP.uarm, j, L.top); col(CP.farm, j, L.tee ? L.skin : L.top); col(CP.hand, j, L.skin); col(CP.thigh, j, L.pants); col(CP.shin, j, L.shorts ? L.skin : L.pants); col(CP.shoe, j, L.shoe); }
}
function makeChar(look) {
  if (!charFree.length) return null;
  const c = { idx: charFree.pop(), rig: makeRig(), ph: rand() * 6, amp: 0, aim: 0, hold: 0, fall: 0, sit: 0, gun: null, shown: true, muz: new T.Vector3(), kick: 0 };
  chars.push(c); setLook(c, look); return c;
}
function hideChar(c) { if (!c.shown) return; c.shown = false; const i = c.idx; for (const k in CP) { const m = CP[k]; if (m.userData.per === 1) m.setMatrixAt(i, ZERO_M); else { m.setMatrixAt(i * 2, ZERO_M); m.setMatrixAt(i * 2 + 1, ZERO_M); } } c.gun = null; }
function freeChar(c) { if (!c) return; c.shown = true; hideChar(c); const k = chars.indexOf(c); if (k >= 0) chars.splice(k, 1); charFree.push(c.idx); }
const _mz = new T.Vector3();
/* Pose one figure. s: { x, y, z, yaw, pitch, spd, air, wpn, aim 0..1, reload, seat ('drive' | 'ride' | null), twist (radians the chest turns, for firing from a seat),
   dead (seconds since death, or -1), knock 0..1, punch 0..1, sprint } */
function poseChar(c, s, dt) {
  const r = c.rig, q = Math.min(1, dt * 12), spd = s.spd || 0, seated = !!s.seat;
  const moving = spd > .3 && !s.air && !seated;
  if (moving) c.ph += dt * (1 + spd * 2.1);
  c.amp = lerp(c.amp, moving ? clamp(.28 + spd * .09, .3, .95) : 0, q);
  const armed = s.wpn && s.wpn !== 'fist' ? 1 : 0, H = armed ? holdOf(s.wpn) : HOLD.pistol;
  c.hold = lerp(c.hold, armed && (!seated || s.aim > .1) ? 1 : 0, q); c.aim = lerp(c.aim, s.aim || 0, q); c.sit = lerp(c.sit, seated ? 1 : 0, Math.min(1, dt * 9));
  const dead = s.dead >= 0 ? 1 : (s.knock || 0); c.fall = lerp(c.fall, dead, Math.min(1, dt * (dead > c.fall ? 9 : 4)));
  c.kick = Math.max(0, c.kick - dt * 5);
  const sn = Math.sin(c.ph), cs = Math.cos(c.ph), a = c.amp, f = c.fall, st = c.sit;
  r.root.position.set(s.x, s.y + f * .12, s.z); r.root.rotation.set(-f * 1.5, s.yaw + PI, 0); r.root.scale.setScalar(c.look.h);
  r.hips.position.y = lerp(.97 - Math.abs(sn) * .035 * a - (s.air ? .04 : 0), .4, st);
  r.torso.rotation.set(lerp(a * (s.sprint ? .28 : .1), -.16, st), s.twist || 0, f * .2);
  // legs: thigh swings, knee folds while the leg comes forward
  for (let k = 0; k < 2; k++) { const sg = k ? -1 : 1, hipA = sg * sn * a, kneeA = Math.max(0, -sg * cs) * (a * 1.15 + .08) * (a > .05 ? 1 : 0);
    r.hip[k].rotation.set(lerp(s.air ? -.35 + k * .5 : hipA, -1.42, st) * (1 - f * .8), 0, (k ? 1 : -1) * f * .22); r.kn[k].rotation.x = lerp(s.air ? .7 : kneeA, 1.3, st) * (1 - f * .6); }
  // arms: hang and swing, or hold the weapon; the whole shoulder frame tips with the aim
  const h = c.hold, pitch = s.pitch || 0, rl = s.reload ? 1 : 0, pn = s.punch || 0;
  r.up.rotation.x = h * lerp(.72, -pitch * .92, c.aim) + h * rl * .4 - c.kick * .12;
  r.head.rotation.x = lerp(0, -pitch * .55, Math.max(c.aim, 1 - h)) * (1 - f);
  for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1, sg = k ? 1 : -1, hs = k ? H.s1 : H.s0, he = k ? H.e1 : H.e0;
    let ax = sg * sn * a * .8, ay = 0, az = sd * (.07 + f * 1.05), ex = -.15 - a * .4;
    if (st > .01) { const dr = s.seat === 'drive'; ax = lerp(ax, dr ? -1.05 : -.45, st); ay = lerp(ay, dr ? -sd * .22 : 0, st); ex = lerp(ex, dr ? -.45 : -.9, st); }
    if (!k && pn > 0) { ax = lerp(ax, -1.5, pn); ex = lerp(ex, -.1, pn); }
    r.sh[k].rotation.set(lerp(ax, hs[0], h), lerp(ay, hs[1], h), az * (1 - h)); r.el[k].rotation.x = lerp(ex, he - (k ? rl * .7 : 0), h); }
  r.gun.position.set(H.g[0], H.g[1], H.g[2] - c.kick * .04); r.gun.rotation.y = H.g[3];
  // write the joints out to the instanced parts
  const i = c.idx; c.shown = true; r.root.updateMatrixWorld(true);
  CP.pelvis.setMatrixAt(i, r.hips.matrixWorld); CP.chest.setMatrixAt(i, r.torso.matrixWorld); CP.head.setMatrixAt(i, r.head.matrixWorld); CP[c.look.gear].setMatrixAt(i, r.head.matrixWorld); if (c.look.mask) CP.mask.setMatrixAt(i, r.head.matrixWorld);
  for (let k = 0; k < 2; k++) { const j = i * 2 + k; CP.uarm.setMatrixAt(j, r.sh[k].matrixWorld); CP.farm.setMatrixAt(j, r.el[k].matrixWorld); CP.hand.setMatrixAt(j, r.el[k].matrixWorld); CP.thigh.setMatrixAt(j, r.hip[k].matrixWorld); CP.shin.setMatrixAt(j, r.kn[k].matrixWorld); CP.shoe.setMatrixAt(j, r.kn[k].matrixWorld); }
  const g = armed && h > .5 ? s.wpn : null;
  if (c.gun !== g) { if (c.gun) GUNMESH[c.gun].setMatrixAt(i, ZERO_M); c.gun = g; }
  if (g) { GUNMESH[g].setMatrixAt(i, r.gun.matrixWorld); c.muz.set(0, .05, GUN_MUZ[g]).applyMatrix4(r.gun.matrixWorld); } else c.muz.set(s.x, s.y + 1.35, s.z);
}
function flushChars() { for (const k in CP) CP[k].instanceMatrix.needsUpdate = true; }

// name tags over other players
function nameTag(text, css, down) {
  const c = texCanvas(256, 64), x = c.getContext('2d'); x.font = '700 34px "Saira Condensed", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, 128, 34); x.fillStyle = css; x.fillText(text, 128, 34);
  const tex = new T.CanvasTexture(c), sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .92, fog: false })); sp.scale.set(1.5, .375, 1); sp.renderOrder = 5; scene.add(sp); return sp;
}
function killTag(sp) { if (!sp) return; scene.remove(sp); sp.material.map.dispose(); sp.material.dispose(); }
