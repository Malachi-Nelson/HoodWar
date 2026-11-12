/* =====================================================================
   7. CARS — bodies are drawn from a side profile and extruded; physics is a simple arcade model:
      drive force along the nose, grip that bleeds off sideways speed, yaw from the front wheels.
   ===================================================================== */
const CAR_MAX = 44, cars = [], carFree = []; for (let i = CAR_MAX - 1; i >= 0; i--) carFree.push(i);
let carSeq = 0;
const wheelGeo = (() => { const b = new GeoBuf(), c = new T.CylinderGeometry(1, 1, 1, 14); c.rotateZ(PI / 2); b.geo(c, null, hexCol(0x15171a)); c.dispose(); const h = new T.CylinderGeometry(.56, .56, 1.05, 10); h.rotateZ(PI / 2); b.geo(h, null, hexCol(0x9aa0a3)); h.dispose(); return b.build(); })();
const wheelMesh = new T.InstancedMesh(wheelGeo, lam({}), CAR_MAX * 4); wheelMesh.castShadow = true; wheelMesh.frustumCulled = false; for (let i = 0; i < CAR_MAX * 4; i++) wheelMesh.setMatrixAt(i, ZERO_M); scene.add(wheelMesh);
const carTrimMat = lam({}), carLampMat = new T.MeshBasicMaterial({ vertexColors: true }), carGlassMat = new T.MeshLambertMaterial({ color: 0x26323b, transparent: true, opacity: .64, depthWrite: false }), wreckMat = new T.MeshLambertMaterial({ color: 0x1a1816 });
const beamGeo = (() => { const g = new T.PlaneGeometry(7, 15); g.rotateX(-PI / 2); g.translate(0, .16, 9.5); return g; })(), beamMat = new T.MeshBasicMaterial({ map: glowTex, color: 0xfff0cc, transparent: true, opacity: .34, blending: T.AdditiveBlending, depthWrite: false });
const paintMats = {}; const paintMat = hex => paintMats[hex] || (paintMats[hex] = new T.MeshPhongMaterial({ color: hex, specular: 0x4a4a4a, shininess: 38 }));
const CAR_GEO = {};
function carGeo(type) {
  if (CAR_GEO[type]) return CAR_GEO[type];
  const S = CARS[type], B = S.body, hl = S.len / 2, hw = S.wid / 2, P = new GeoBuf(), M = new GeoBuf(), G = new GeoBuf(), L = new GeoBuf(), dk = hexCol(0x1c1e21), bl = hexCol(0x0e0f11);
  const ext = (buf, pts, width, bv, col) => { const sh = new T.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); const d = Math.max(.02, width - bv * 2), g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bv, bevelThickness: bv, bevelSegments: 2, steps: 1 }); g.translate(0, 0, -d / 2); g.rotateY(-PI / 2); buf.geo(g, null, col); g.dispose(); };
  const bar = (buf, x, z0, y0, z1, y1, th, col) => { const len = hyp(z1 - z0, y1 - y0), g = new T.BoxGeometry(th, th * .9, len); g.rotateX(-Math.atan2(y1 - y0, z1 - z0)); g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2); buf.geo(g, null, col); g.dispose(); };
  const wr = type === 'suv' || type === 'pickup' ? .4 : type === 'van' ? .37 : type === 'hatch' ? .31 : type === 'sport' ? .33 : .34;
  const nose = B.belt - .1, zc1 = hl - B.hood, deck = B.trunk > 0 ? B.belt - .03 : B.belt, zr0 = B.trunk > 0 ? -hl + B.trunk : B.bed ? -hl + B.bed : -hl + .07, zf = zc1 - B.rake, zr = zr0 + B.crake;
  ext(P, [[-hl + .1, B.ride], [-hl, B.ride + .14], [-hl, deck - .1], [-hl + .08, deck], [zr0, B.belt], [zc1, B.belt], [hl - .14, nose], [hl, nose - .17], [hl, B.ride + .14], [hl - .1, B.ride]], S.wid, .05);
  ext(G, [[zr0, B.belt - .03], [zr, B.roof], [zf, B.roof], [zc1, B.belt - .03]], S.wid - .2, .015);
  P.box(-hw + .1, hw - .1, B.roof - .025, B.roof + .04, zr - .02, zf + .02);
  [-1, 1].forEach(s => { const x = s * (hw - .115); bar(P, x, zc1, B.belt, zf, B.roof, .075); bar(P, x, zr0, B.belt, zr, B.roof, .09); if (zf - zr > 1.5) P.box(x - .04, x + .04, B.belt, B.roof, (zf + zr) / 2 - .02, (zf + zr) / 2 + .07); });
  if (B.panel) P.box(-hw + .06, hw - .06, B.belt - .02, B.roof + .02, -hl + .07, zf - 1.25);
  if (B.bed) { M.box(-hw + .14, hw - .14, B.belt - .25, B.belt + .012, -hl + .14, -hl + B.bed - .1, bl); }
  if (B.fins) [-1, 1].forEach(s => P.box(s * (hw - .09) - .05, s * (hw - .09) + .05, deck - .02, deck + .13, -hl - .04, -hl + 1));
  if (type === 'sport') { M.box(-hw + .08, hw - .08, deck + .16, deck + .2, -hl + .02, -hl + .34, dk); [-1, 1].forEach(s => M.box(s * (hw - .3) - .03, s * (hw - .3) + .03, deck, deck + .16, -hl + .12, -hl + .22, dk)); }
  M.box(-hw + .02, hw - .02, B.ride + .04, B.ride + .3, hl - .08, hl + .09, dk); M.box(-hw + .02, hw - .02, B.ride + .04, B.ride + .3, -hl - .09, -hl + .08, dk);
  M.box(-.52, .52, nose - .33, nose - .13, hl - .02, hl + .035, bl); M.box(-.27, .27, B.ride + .33, B.ride + .47, -hl - .03, -hl + .02, hexCol(0xe8e4da));
  M.box(-hw + .16, hw - .16, B.ride + .06, B.belt - .28, zr0 - .1, zc1 + .1, bl);
  const axF = hl - .86, axR = -hl + .9;
  [axF, axR].forEach(z => [-1, 1].forEach(s => M.box(Math.min(s * (hw - .03), s * (hw + .018)), Math.max(s * (hw - .03), s * (hw + .018)), B.ride - .03, wr * 2 - .04, z - wr - .05, z + wr + .05, bl)));
  [-1, 1].forEach(s => M.box(Math.min(s * hw, s * (hw + .17)), Math.max(s * hw, s * (hw + .17)), B.belt + .04, B.belt + .14, zc1 - .22, zc1 - .1, dk));
  [-1, 1].forEach(s => { L.box(Math.min(s * (hw - .44), s * (hw - .08)), Math.max(s * (hw - .44), s * (hw - .08)), nose - .27, nose - .11, hl - .03, hl + .03, hexCol(0xfff2cc)); L.box(Math.min(s * (hw - .44), s * (hw - .08)), Math.max(s * (hw - .44), s * (hw - .08)), deck - .27, deck - .12, -hl - .03, -hl + .03, hexCol(0xd6231a)); });
  return CAR_GEO[type] = { paint: P.build(), trim: M.build(), glass: G.build(), lamp: L.build(), wr, axF, axR, seatY: Math.max(.02, B.belt - .8), belt: B.belt, roof: B.roof, ride: B.ride, zf, zr, zc1 };
}
const SEATS = [[-.43, .12], [.43, .12], [-.43, -.82], [.43, -.82]];   // [across, along] from the centre: driver sits front left
// a police car is an ordinary model in black with white doors and a light bar that flashes while its siren is on
const copWhite = new T.MeshPhongMaterial({ color: 0xf2efe6, specular: 0x4a4a4a, shininess: 38 }), copBarGeo = new T.BoxGeometry(.4, .12, .24), copBaseGeo = new T.BoxGeometry(1.02, .05, .3);
const copGlow = [0xff3030, 0x3a78ff].map(hex => new T.SpriteMaterial({ map: glowTex, color: hex, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
function copDress(c) {
  const S = c.spec, ge = c.geo, B = S.body, zm = (ge.zf + ge.zr) / 2 + .1;
  const d = new T.Mesh(new T.BoxGeometry(S.wid + .03, Math.max(.2, B.belt - B.ride - .32), Math.max(.6, ge.zc1 - ge.zr - .3)), copWhite); d.position.set(0, (B.belt + B.ride) / 2 + .1, (ge.zc1 + ge.zr) / 2); c.body.add(d); c.dp = d;
  const base = new T.Mesh(copBaseGeo, carTrimMat); base.position.set(0, B.roof + .06, zm); c.body.add(base);
  c.lb = [0, 1].map(k => { const m = new T.Mesh(copBarGeo, new T.MeshBasicMaterial({ color: k ? 0x13224d : 0x4d1313 })); m.position.set(k ? .26 : -.26, B.roof + .14, zm); c.body.add(m); const s = new T.Sprite(copGlow[k]); s.scale.setScalar(2.8); s.position.set(m.position.x, m.position.y + .12, zm); s.visible = false; s.renderOrder = 5; c.body.add(s); return { m, s }; });
  c.cop = true; c.lph = -1;
}
function spawnCar(type, x, z, yaw, o) {
  if (!carFree.length) return null; o = o || {};
  const S = CARS[type], geo = carGeo(type), color = o.color === undefined ? PAINTS[Math.floor(rand() * PAINTS.length)] : o.color;   // any colour off the chart
  const g = new T.Group(), body = new T.Group(); g.rotation.order = 'YXZ'; g.add(body);
  const pm = new T.Mesh(geo.paint, paintMat(color)), tm = new T.Mesh(geo.trim, carTrimMat), gm = new T.Mesh(geo.glass, carGlassMat), lm = new T.Mesh(geo.lamp, carLampMat), bm = new T.Mesh(beamGeo, beamMat);
  pm.castShadow = tm.castShadow = true; pm.receiveShadow = true; gm.renderOrder = 3; bm.renderOrder = 4; bm.visible = false; body.add(pm, tm, gm, lm, bm); scene.add(g);
  const c = { id: o.id === undefined ? ++carSeq : o.id, type, spec: S, geo, slot: carFree.pop(), x, y: groundAt(x, z, 1, 'p', .45), z, yaw, vx: 0, vz: 0, yawRate: 0, steer: 0, hp: S.hp, color, g, body, pm, bm,
    occ: [null, null, null, null], inp: { thr: 0, steer: 0, hb: false }, wreck: false, burn: 0, spin: 0, roll: 0, dive: 0, asleep: true, home: o.home || null, team: o.team === undefined ? -1 : o.team, horn: 0, smokeT: 0, lastHit: null, idle: 0, buf: [], slip: 0, crash: 0 };
  if (c.id > carSeq) carSeq = c.id;
  if (color === COP_PAINT) copDress(c);
  cars.push(c); placeCar(c); return c;
}
function setPaint(c, hex) { if (hex === undefined || c.color === hex) return; c.color = hex; if (!c.wreck) c.pm.material = paintMat(hex); }
function removeCar(c) { const i = cars.indexOf(c); if (i < 0) return; cars.splice(i, 1); scene.remove(c.g); for (let k = 0; k < 4; k++) wheelMesh.setMatrixAt(c.slot * 4 + k, ZERO_M); wheelMesh.instanceMatrix.needsUpdate = true; carFree.push(c.slot); c.gone = true; }
const carById = id => { for (let i = 0; i < cars.length; i++) if (cars[i].id === id) return cars[i]; return null; };
const _cm = new T.Matrix4(), _wm = new T.Matrix4(), _wq = new T.Quaternion(), _we = new T.Euler(0, 0, 0, 'YXZ'), _wv = new T.Vector3(), _ws = new T.Vector3();
function placeCar(c) {
  const G = c.geo; c.g.position.set(c.x, c.y, c.z); c.g.rotation.set(0, c.yaw + PI, 0); c.body.rotation.set(c.dive, 0, c.roll); c.g.updateMatrixWorld(true);
  const hw = c.spec.wid / 2 - .13;
  for (let k = 0; k < 4; k++) { const front = k < 2, sd = k % 2 ? 1 : -1; _we.set(c.spin, front ? -c.steer * .5 : 0, 0); _wq.setFromEuler(_we); _wm.compose(_wv.set(sd * hw, G.wr, front ? G.axF : G.axR), _wq, _ws.set(.25, G.wr, G.wr)); _cm.multiplyMatrices(c.g.matrixWorld, _wm); wheelMesh.setMatrixAt(c.slot * 4 + k, _cm); }
}
const carFwd = c => [-Math.sin(c.yaw), -Math.cos(c.yaw)], carSpeed = c => hyp(c.vx, c.vz);
function seatPos(c, k, out) { const s = SEATS[k], fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); out.x = c.x + rx * s[0] + fx * s[1]; out.z = c.z + rz * s[0] + fz * s[1]; out.y = c.y + c.geo.seatY; return out; }
function doorPos(c, k, out, gap) { const s = SEATS[k], side = s[0] < 0 ? -1 : 1, d = c.spec.wid / 2 + (gap === undefined ? .6 : gap), fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); out.x = c.x + rx * side * d + fx * s[1]; out.z = c.z + rz * side * d + fz * s[1]; out.y = c.y; return out; }
// --- props in a hash so a moving car can find the ones in its way
const propGrid = {}; PROPS.forEach(p => { const k = Math.floor(p.x / 12) + ',' + Math.floor(p.z / 12); (propGrid[k] || (propGrid[k] = [])).push(p); });
function carProps(c, px, pz, R, sp) {
  const cx = Math.floor(px / 12), cz = Math.floor(pz / 12);
  for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) { const L = propGrid[gx + ',' + gz]; if (!L) continue;
    for (let i = 0; i < L.length; i++) { const p = L[i]; if (p.down) continue; if (hyp(p.x - px, p.z - pz) > R + .3) continue; if (sp > 3.2) { if (knockProp(p, c.vx, c.vz)) { GAME.onKnock(p, c); c.vx *= .93; c.vz *= .93; } } } }
}
/* One physics step. inp: { thr -1..1, steer -1..1 (right is positive), hb } */
function stepCar(c, dt, inp) {
  const S = c.spec, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
  let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz; const sp = Math.abs(vf), dead = c.wreck || c.hp <= 0 || c.burn > 0;
  const thr = dead ? 0 : inp.thr, limp = c.hp < S.hp * .25 ? .6 : 1;
  c.steer = lerp(c.steer, inp.steer, Math.min(1, dt * (Math.abs(inp.steer) > Math.abs(c.steer) ? 5.5 : 9)));
  if (thr > 0) { if (vf < -.6) vf += 26 * thr * dt; else vf += S.accel * limp * thr * Math.max(0, 1 - Math.pow(Math.max(0, vf) / (S.vmax * limp), 1.6)) * dt * (sp < 6 ? 1.25 : 1); }
  else if (thr < 0) { if (vf > .6) vf += 27 * thr * dt; else vf += S.accel * .6 * thr * Math.max(0, 1 + vf / 13) * dt; }
  vf -= vf * (.16 + .0011 * sp) * dt; if (!thr && sp < 1.2) vf -= vf * Math.min(1, dt * 2.5);
  if (inp.hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 8 * dt);
  const slide = Math.abs(vl), grip = inp.hb ? 2.1 : slide > 6.5 ? S.grip * .42 : S.grip; c.slip = slide;
  vl -= vl * Math.min(1, grip * dt);
  c.vx = fx * vf + rx * vl; c.vz = fz * vf + rz * vl;
  const maxSteer = lerp(.6, .085, clamp(sp / 44, 0, 1)), want = -(vf / (S.len * .58)) * Math.tan(c.steer * maxSteer) * (inp.hb ? 1.55 : 1);
  c.yawRate = lerp(c.yawRate, want, Math.min(1, dt * 7.5)); c.yaw = wrapPi(c.yaw + c.yawRate * dt);
  c.x += c.vx * dt; c.z += c.vz * dt;
  // the world: three circles down the length of the car
  const R = S.wid / 2, half = S.len / 2 - R, spd = hyp(c.vx, c.vz); let hit = 0;
  for (let k = 0; k < 3; k++) { const o = (k - 1) * half, px = c.x + fx * o, pz = c.z + fz * o;
    carProps(c, px, pz, R, spd);
    if (pushOut(px, pz, R, c.y + .46, c.y + 1.3, 'p')) { c.x += COL.x - px; c.z += COL.z - pz; const nx = COL.nx, nz = COL.nz, vn = c.vx * nx + c.vz * nz;
      if (vn < 0) { if (-vn > hit) hit = -vn; c.vx -= nx * vn * 1.22; c.vz -= nz * vn * 1.22; c.vx *= .97; c.vz *= .97; c.yawRate += (fz * o * nx - fx * o * nz) * -vn * .09; } } }
  c.y = lerp(c.y, groundAt(c.x, c.z, c.y, 'p', .46), Math.min(1, dt * 14));
  c.spin += vf * dt / c.geo.wr; c.roll = lerp(c.roll, clamp(-c.yawRate * sp * .0045, -.07, .07), Math.min(1, dt * 6)); c.dive = lerp(c.dive, clamp((thr > 0 && vf >= 0 ? -.012 : thr < 0 && vf > 1 ? .03 : 0) * (sp > .5 || thr ? 1 : 0), -.03, .04), Math.min(1, dt * 5));
  if (hit > 0) c.crash = Math.max(c.crash, hit);
  c.asleep = !c.occ[0] && spd < .06 && Math.abs(c.yawRate) < .02 && !thr;
  return hit;
}
// car against car: circles again; `kin` cars (driven on another machine) push but are not pushed
function carsCollide() {
  for (let i = 0; i < cars.length; i++) { const a = cars[i];
    for (let j = i + 1; j < cars.length; j++) { const b = cars[j]; if ((a.asleep || a.kin) && (b.asleep || b.kin)) continue;
      const dx = a.x - b.x, dz = a.z - b.z; if (dx * dx + dz * dz > 49) continue; if (Math.abs(a.y - b.y) > 1.5) continue;
      const ha = a.spec.len / 2 - a.spec.wid / 2, hb = b.spec.len / 2 - b.spec.wid / 2, afx = -Math.sin(a.yaw), afz = -Math.cos(a.yaw), bfx = -Math.sin(b.yaw), bfz = -Math.cos(b.yaw), R = (a.spec.wid + b.spec.wid) / 2;
      for (let p = -1; p <= 1; p++) for (let q = -1; q <= 1; q++) {
        const ax = a.x + afx * p * ha, az = a.z + afz * p * ha, bx = b.x + bfx * q * hb, bz = b.z + bfz * q * hb, ex = ax - bx, ez = az - bz, d = hyp(ex, ez); if (d >= R || d < 1e-4) continue;
        const nx = ex / d, nz = ez / d, pen = R - d, ma = a.kin ? 1e6 : a.spec.mass, mb = b.kin ? 1e6 : b.spec.mass, ka = mb / (ma + mb), kb = ma / (ma + mb);
        a.x += nx * pen * ka; a.z += nz * pen * ka; b.x -= nx * pen * kb; b.z -= nz * pen * kb;
        const vr = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; if (vr >= 0) continue;
        const jimp = -1.3 * vr / (1 / ma + 1 / mb);
        if (!a.kin) { a.vx += nx * jimp / ma; a.vz += nz * jimp / ma; a.yawRate += (afz * p * ha * nx - afx * p * ha * nz) * jimp / ma * .07; a.asleep = false; }
        if (!b.kin) { b.vx -= nx * jimp / mb; b.vz -= nz * jimp / mb; b.yawRate -= (bfz * q * hb * nx - bfx * q * hb * nz) * jimp / mb * .07; b.asleep = false; }
        const imp = -vr; if (imp > a.crash) a.crash = imp; if (imp > b.crash) b.crash = imp; a.hitBy = b; b.hitBy = a;
      } } }
}
// a walker against the cars: treat each car as a box turned with its heading
function carBlock(e, r, skip) {
  let hitCar = null;
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c === skip) continue; const dx = e.x - c.x, dz = e.z - c.z; if (dx * dx + dz * dz > 16) continue; if (e.y > c.y + 1.25 || e.y + 1.6 < c.y) continue;
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), lx = dx * rx + dz * rz, lz = dx * fx + dz * fz, hw = c.spec.wid / 2, hl = c.spec.len / 2;
    const px = clamp(lx, -hw, hw), pz = clamp(lz, -hl, hl), ox = lx - px, oz = lz - pz, d2 = ox * ox + oz * oz; if (d2 >= r * r) continue;
    let nx, nz, push;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = ox / d; nz = oz / d; push = r - d; } else { const a = hw - Math.abs(lx), b = hl - Math.abs(lz); if (a < b) { nx = Math.sign(lx) || 1; nz = 0; push = a + r; } else { nx = 0; nz = Math.sign(lz) || 1; push = b + r; } }
    e.x += (rx * nx + fx * nz) * push; e.z += (rz * nx + fz * nz) * push; hitCar = c; }
  return hitCar;
}
// a bullet against the cars: only the bodywork below the glass stops it
const _lb = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 }, RC = { car: null };
function rayCars(ox, oy, oz, dx, dy, dz, maxT, skip) {
  let best = maxT; RC.car = null;
  const h2 = Math.sqrt(dx * dx + dz * dz);
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c === skip) continue; const ex = c.x - ox, ez = c.z - oz; if (h2 > .05) { const along = (ex * dx + ez * dz) / h2; if (along < -4 || along * h2 > best + 4) continue; if (ex * ex + ez * ez - along * along > 12) continue; } else if (ex * ex + ez * ez > 12) continue;
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    _lb.x0 = -c.spec.wid / 2; _lb.x1 = c.spec.wid / 2; _lb.y0 = c.y + c.geo.ride; _lb.y1 = c.y + c.geo.belt + .06; _lb.z0 = -c.spec.len / 2; _lb.z1 = c.spec.len / 2;
    const t = rayBox(-ex * rx - ez * rz, oy, -ex * fx - ez * fz, dx * rx + dz * rz, dy, dx * fx + dz * fz, _lb); if (t < best) { best = t; RC.car = c; } }
  return best;
}
// what a car looks and sounds like from its state; runs for every car on every machine
function updateCarVisual(c, dt) {
  placeCar(c);
  const lit = ENV.night > .35 && !c.wreck && (c.occ[0] || c.ai || c.eng); if (c.bm.visible !== !!lit) c.bm.visible = !!lit;
  if (c.cop) { const ph = c.horn && !c.wreck ? Math.floor(G.time * 5.5 + c.id * .5) % 2 : -1; if (c.lph !== ph) { c.lph = ph; c.lb.forEach((L, k) => { const on = ph === k; L.m.material.color.setHex(on ? (k ? 0x5c98ff : 0xff4a4a) : (k ? 0x13224d : 0x4d1313)); L.s.visible = on; }); } if (c.wreck && c.dp.material !== wreckMat) c.dp.material = wreckMat; }
  if (c.wreck) { if (c.pm.material !== wreckMat) c.pm.material = wreckMat; c.smokeT -= dt; if (c.smokeT <= 0 && c.wreckT < 14) { c.smokeT = .18; FX.smoke(c.x, c.y + 1.1, c.z, 1.2, true); if (c.wreckT < 6) FX.fire(c.x, c.y + .9, c.z, 1.1); } return; }
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), hx = c.x + fx * (c.spec.len / 2 - .8), hz = c.z + fz * (c.spec.len / 2 - .8), frac = c.hp / c.spec.hp;
  c.smokeT -= dt;
  if (c.burn > 0) { if (c.smokeT <= 0) { c.smokeT = .07; FX.fire(hx, c.y + c.geo.belt, hz, .8); if (rand() < .5) FX.smoke(hx, c.y + c.geo.belt + .4, hz, 1, true); } }
  else if (frac < .45 && c.smokeT <= 0) { c.smokeT = frac < .25 ? .1 : .22; FX.smoke(hx, c.y + c.geo.belt, hz, .7, frac < .25); }
  if ((c.slip > 5.5 || (c.inp.hb && carSpeed(c) > 6)) && rand() < dt * 40) { const rxv = Math.cos(c.yaw), rzv = -Math.sin(c.yaw), s = rand() < .5 ? -1 : 1; FX.tyre(c.x - fx * (c.spec.len / 2 - .9) + rxv * s * .8, c.y, c.z - fz * (c.spec.len / 2 - .9) + rzv * s * .8); }
}
