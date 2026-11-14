/* =====================================================================
   7b. CARS UP CLOSE — what the bodies in 70-cars.js were missing.
       · Inside: seats, a dashboard and a steering wheel you can see through the glass.
       · Lamps that work: headlights and tail lights after dark, brake lights (pedal or handbrake, or a car seen slowing hard),
         reversing lights, indicators blinking before a turn. One instanced mesh for every lamp of every car; at night the
         headlights also flare, and the car you are driving throws real light down the road (a spotlight, Medium and up).
       · Wheels: a tyre with a sidewall and a tread, a five-spoke rim and a brake disc behind it, for cars near the camera.
       · A tailpipe, and a puff from it when the car pulls away hard.
       · Dents: a hard knock pushes the panels in where it landed (front, back or side) and can put out that end's lamps. The
         car's own machine knows where it was hit; anyone else watching sees the dents land on the side the numbers suggest.
   ===================================================================== */
// --- inside the car, in the body's own frame (+z the front, +x the car's left)
function carInterior(M, S, B, hl, hw, zf, zr, zc1) {
  if (S.air) return; const seat = hexCol(pick(rng32(S.len * 100 | 0), [0x2a2b2e, 0x3a2f26, 0x4a3f33, 0x24272c])), dash = hexCol(0x1d1e21), wheel = hexCol(0x151618), sy = Math.max(.12, B.belt - .78);
  const box = (x0, x1, y0, y1, z0, z1, col) => M.box(x0, x1, y0, y1, z0, z1, col);
  if (S.len > 9) return;   // the bus has its own plan
  const front = .12, back = -.82;
  [.43, -.43].forEach(x => { box(x - .24, x + .24, sy, sy + .13, front - .26, front + .22, seat);
    const g = new T.BoxGeometry(.46, .62, .11); g.rotateX(-.22); g.translate(x, sy + .42, front - .3); M.geo(g, null, seat); g.dispose();
    box(x - .12, x + .12, sy + .72, sy + .86, front - .38, front - .28, seat); });                                                       // cushion, back, headrest
  if (S.seats > 2 && zr < back - .2) { box(-hw + .2, hw - .2, sy, sy + .13, back - .25, back + .2, seat); const g = new T.BoxGeometry(hw * 2 - .4, .55, .1); g.rotateX(-.18); g.translate(0, sy + .38, back - .3); M.geo(g, null, seat); g.dispose(); }
  box(-hw + .14, hw - .14, B.belt - .26, B.belt + .02, zf - .55, zf + .02, dash); box(-hw + .14, hw - .14, sy - .02, sy + .02, back - .4, zf, dash);   // dashboard; the floor
  const ex = new T.CylinderGeometry(.045, .05, .3, 8, 1, true); ex.rotateX(PI / 2); ex.translate(-(hw - .42), B.ride + .07, -hl + .1); M.geo(ex, null, hexCol(0x55585c)); ex.dispose();   // the tailpipe, right side
  const t = new T.TorusGeometry(.17, .022, 6, 18); t.rotateX(-1.05); t.translate(.43, B.belt + .02, zf - .42); M.geo(t, null, wheel); t.dispose();          // the steering wheel
  const col = new T.CylinderGeometry(.025, .03, .3, 6); col.rotateX(PI / 2 - .5); col.translate(.43, B.belt - .07, zf - .3); M.geo(col, null, wheel); col.dispose();
}
// --- lamps: ten to a car. Where they sit comes from the body's measurements
const LAMP_N = 10, LAMP = { mesh: null, glare: null, gpos: null, slots: [] };
function lampSpots(S, B) {   // [x, y, z, w, h, facing (1 front, -1 back), kind]: kind 0 head, 1 tail, 2 reverse, 3 indicator front, 4 indicator back
  const hl = S.len / 2, hw = S.wid / 2, nose = B.belt - .1, deck = B.trunk > 0 ? B.belt - .03 : B.belt, ty = deck - .195, hy = nose - .19, o = [];
  [1, -1].forEach(s => o.push([s * (hw - .26), hy, hl + .045, .33, .13, 1, 0])); [1, -1].forEach(s => o.push([s * (hw - .26), ty, -hl - .045, .33, .12, -1, 1]));
  [1, -1].forEach(s => o.push([s * (hw - .53), ty, -hl - .04, .12, .09, -1, 2])); [1, -1].forEach(s => o.push([s * (hw - .05), hy, hl - .02, .09, .09, 1, 3])); [1, -1].forEach(s => o.push([s * (hw - .05), ty + .1, -hl - .02, .09, .08, -1, 4]));
  return o;
}
{ const g = new T.PlaneGeometry(1, 1), m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  LAMP.mesh = new T.InstancedMesh(g, m, CAR_MAX * LAMP_N); LAMP.mesh.frustumCulled = false; LAMP.mesh.renderOrder = 5;
  for (let i = 0; i < CAR_MAX * LAMP_N; i++) { LAMP.mesh.setMatrixAt(i, ZERO_M); LAMP.mesh.setColorAt(i, new T.Color(0, 0, 0)); } scene.add(LAMP.mesh);
  const pg = new T.BufferGeometry(); LAMP.gpos = new Float32Array(CAR_MAX * 4 * 3); LAMP.gcol = new Float32Array(CAR_MAX * 4 * 3); pg.setAttribute('position', new T.BufferAttribute(LAMP.gpos, 3)); pg.setAttribute('color', new T.BufferAttribute(LAMP.gcol, 3));
  LAMP.glare = new T.Points(pg, new T.PointsMaterial({ map: glowTex, size: 1.5, sizeAttenuation: true, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); LAMP.glare.frustumCulled = false; LAMP.glare.renderOrder = 6; scene.add(LAMP.glare); }
const LAMP_C = [new T.Color(3.4, 3.15, 2.7), new T.Color(1.5, .07, .04), new T.Color(2.6, 2.6, 2.6), new T.Color(3.2, 1.45, .05), new T.Color(4.2, .2, .1)], LAMP_OFF = new T.Color(0, 0, 0), _lc = new T.Color(), _lm = new T.Matrix4(), _lq = new T.Quaternion(), _lv = new T.Vector3(), _ls = new T.Vector3(), _ly = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), PI), _lpt = new T.Vector3();
function lampsOff(c) { for (let k = 0; k < LAMP_N; k++) LAMP.mesh.setMatrixAt(c.slot * LAMP_N + k, ZERO_M); for (let k = 0; k < 4; k++) LAMP.gpos[(c.slot * 4 + k) * 3 + 1] = -999; LAMP.mesh.instanceMatrix.needsUpdate = true; }
// which way an AI driver is about to turn: -1 left, 1 right, 0 straight on (and how far off the turn is)
function turnAhead(c) { const A = c.ai; if (!A || !A.next || !A.to || !A.from) return 0; const ax = RX(A.from[0]), az = RZ(A.from[1]), bx = RX(A.to[0]), bz = RZ(A.to[1]), nx = RX(A.next[0]) - bx, nz = RZ(A.next[1]) - bz, dx = bx - ax, dz = bz - az;
  if (hyp(c.x - bx, c.z - bz) > 38) return 0; const cr = dx * nz - dz * nx; return Math.abs(cr) < 1 ? 0 : cr > 0 ? 1 : -1; }
function carLamps(c, dt) {
  if (c.spec.air || !c.geo.lamps) return; const night = ENV.night > .35, run = !c.wreck && (c.occ[0] || c.ai || c.eng), hdr = POST.on ? 1 : .45, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), vf = c.vx * fx + c.vz * fz;
  // slowing hard counts as braking, so the lamps work on cars driven on another machine too
  const acc = (vf - (c.lvf === undefined ? vf : c.lvf)) / Math.max(dt, 1e-3); c.lvf = vf; c.dec = lerp(c.dec || 0, acc, Math.min(1, dt * 8));
  const brake = run && ((c.inp.thr < -.05 && vf > .4) || c.inp.hb || (vf > .8 && c.dec < -3.2) || (c.ai && c.ai.red && Math.abs(vf) < .5)), rev = run && vf < -.4 && c.inp.thr < 0;
  const turn = run ? turnAhead(c) : 0, blink = (G.time * 1.6 + c.id * .13) % 1 < .5, D = c.dent || null, base = c.slot * LAMP_N;
  c.body.updateMatrixWorld(); const W = c.body.matrixWorld;
  c.geo.lamps.forEach((L, k) => { const [x, y, z, w, h, face, kind] = L, side = x > 0 ? -1 : 1;   // +x is the car's left
    let on = 0; if (kind === 0) on = night && run ? 1 : 0; else if (kind === 1) on = brake ? 4 : night && run ? 1 : 0; else if (kind === 2) on = rev ? 2 : 0; else on = turn === side && blink ? 3 : 0;
    if (D && ((face > 0 && D[0] > .5) || (face < 0 && D[1] > .5))) on = 0;   // smashed
    _lm.compose(_lv.set(x, y, z), face > 0 ? _lq.identity() : _ly, _ls.set(w, h, 1)); _lm.premultiply(W); LAMP.mesh.setMatrixAt(base + k, _lm);
    _lc.copy(on ? LAMP_C[on === 4 ? 4 : on === 1 && kind === 1 ? 1 : on === 1 ? 0 : on === 2 ? 2 : 3] : LAMP_OFF).multiplyScalar(hdr); LAMP.mesh.setColorAt(base + k, _lc);
    if (k < 4) { const gi = (c.slot * 4 + k) * 3, lit = kind === 0 ? on && night : on && night; _lpt.set(x, y, z + face * .12).applyMatrix4(W); LAMP.gpos[gi] = _lpt.x; LAMP.gpos[gi + 1] = lit ? _lpt.y : -999; LAMP.gpos[gi + 2] = _lpt.z;
      const gc = kind === 0 ? [1.1, 1.0, .85] : brake ? [1.2, .05, .03] : [.45, .02, .01]; LAMP.gcol[gi] = gc[0] * hdr; LAMP.gcol[gi + 1] = gc[1] * hdr; LAMP.gcol[gi + 2] = gc[2] * hdr; } });
  // a puff from the tailpipe when it pulls away hard (or, on a car driven elsewhere, when it is seen to)
  if (run && vf < 9 && ((c.inp.thr > .7 && !c.kin) || c.dec > 2.6) && rand() < dt * 9) { const hw = c.spec.wid / 2, r = _lpt.set(-(hw - .42), c.spec.body.ride + .07, -c.spec.len / 2 - .05).applyMatrix4(W); FX.smoke(r.x, r.y, r.z, .28, false); }
  LAMP.mesh.instanceMatrix.needsUpdate = true; LAMP.mesh.instanceColor.needsUpdate = true; LAMP.glare.geometry.attributes.position.needsUpdate = true; LAMP.glare.geometry.attributes.color.needsUpdate = true;
}
// --- the light from your own headlights (one spotlight, kept in the scene so turning it on and off never rebuilds a shader)
const HEADLIGHT = new T.SpotLight(0xfff0dc, 0, 60, .5, .55, 1.4); HEADLIGHT.castShadow = false; scene.add(HEADLIGHT, HEADLIGHT.target);
function headlightTick() {
  const c = P.car, on = !!c && !c.spec.air && !c.wreck && ENV.night > .3 && GQ.env && !(c.dent && c.dent[0] > .5);
  HEADLIGHT.visible = GQ.env > 0; if (!on) { HEADLIGHT.intensity = 0; return; }
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), h = c.spec.len / 2; HEADLIGHT.position.set(c.x + fx * (h + .1), c.y + c.geo.belt - .25, c.z + fz * (h + .1)); HEADLIGHT.target.position.set(c.x + fx * (h + 22), c.y - 1.2, c.z + fz * (h + 22));
  HEADLIGHT.target.updateMatrixWorld(); HEADLIGHT.intensity = 2.2 * clamp((ENV.night - .3) * 3, 0, 1);
}
// --- wheels near the camera: tyre, rim, disc (in the same unit space as wheelGeo: radius 1 across, axle along x, 1 wide)
const WHEEL_D = (() => { const tire = new GeoBuf(), rim = new GeoBuf(), rub = hexCol(0x17181a), side = hexCol(0x222326), alloy = hexCol(0xb8bcc0), disc = hexCol(0x5a5c60), hub = hexCol(0x8c9094);
  const prof = [[.64, -.36], [.78, -.47], [.93, -.47], [.99, -.4], [1, -.25], [1, .25], [.99, .4], [.93, .47], [.78, .47], [.64, .36]].map(p => new T.Vector2(p[0], p[1]));
  const lg = new T.LatheGeometry(prof, 28); lg.rotateZ(-PI / 2); tire.geo(lg, null, rub); lg.dispose();
  [-1, 1].forEach(s => { const r = new T.RingGeometry(.58, .66, 28); r.rotateY(s * PI / 2); r.translate(s * .37, 0, 0); tire.geo(r, null, side); r.dispose();   // the bead
    const d = new T.CircleGeometry(.5, 24); d.rotateY(s * PI / 2); d.translate(s * .12, 0, 0); rim.geo(d, null, disc); d.dispose();                                    // brake disc
    const lip = new T.CylinderGeometry(.62, .62, .06, 28, 1, true); lip.rotateZ(PI / 2); lip.translate(s * .33, 0, 0); rim.geo(lip, null, alloy); lip.dispose();        // rim lip
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, b = new T.BoxGeometry(.06, .5, .1); b.translate(0, .36, 0); b.rotateX(a); b.translate(s * .32, 0, 0); rim.geo(b, null, alloy); b.dispose(); }   // spokes
    const hc = new T.CylinderGeometry(.16, .18, .08, 12); hc.rotateZ(PI / 2); hc.translate(s * .34, 0, 0); rim.geo(hc, null, hub); hc.dispose(); });
  return { tire: tire.build(), rim: rim.build() }; })();
const wheelNear = { tire: new T.InstancedMesh(WHEEL_D.tire, lam({}), CAR_MAX * 4), rim: new T.InstancedMesh(WHEEL_D.rim, lam({}), CAR_MAX * 4), pbr: [new T.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .28, metalness: .85, envMapIntensity: 1.1 })] };
['tire', 'rim'].forEach(k => { const m = wheelNear[k]; m.castShadow = true; m.frustumCulled = false; for (let i = 0; i < CAR_MAX * 4; i++) m.setMatrixAt(i, ZERO_M); m.count = 0; scene.add(m); });
// near wheels are packed into the front of the two meshes each frame (placeCar leaves their matrices on the car)
const WNEAR = { list: [], frame: 0 };
function flushWheels() { const L = WNEAR.list; let n = 0; for (const c of L) { if (c.gone) continue; for (let k = 0; k < 4; k++, n++) { wheelNear.tire.setMatrixAt(n, c.wmat[k]); wheelNear.rim.setMatrixAt(n, c.wmat[k]); } }
  wheelNear.tire.count = wheelNear.rim.count = n; wheelNear.tire.instanceMatrix.needsUpdate = wheelNear.rim.instanceMatrix.needsUpdate = true; L.length = 0; WNEAR.frame++; }
const wheelLow = [wheelNear.tire.material, wheelNear.rim.material];
function wheelLook() { wheelNear.tire.material = GQ.env ? wheelNear.pbr[0] : wheelLow[0]; wheelNear.rim.material = GQ.env ? wheelNear.pbr[1] : wheelLow[1]; }
// a car's wheels go to the near set or the far one; this says which
function wheelsNear(c) { return GQ.tex > 0 && hyp(c.x - camera.position.x, c.z - camera.position.z) < (c.wnear ? 64 : 58); }
// --- dents: per-car copy of the body, pushed in where it was hit. zone: 0 front, 1 back, 2 left, 3 right
function dentCar(c, amount, hitN) {
  if (c.spec.air || amount <= 0) return; const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
  let zone; if (hitN) { const dx = -hitN[0], dz = -hitN[1], f = dx * fx + dz * fz, r = dx * rx + dz * rz; zone = Math.abs(f) >= Math.abs(r) ? (f > 0 ? 0 : 1) : (r > 0 ? 3 : 2); }
  else zone = Math.floor(rng32(c.id * 977 + Math.round(c.hp))() * 4);   // no idea where it landed: the same guess on every machine
  const D = c.dent || (c.dent = [0, 0, 0, 0]); D[zone] = Math.min(1, D[zone] + amount); c.dentAt = c.dentAt || [rand() * .6 - .3, rand() * .6 - .3]; dentShape(c);
}
function dentShape(c) {
  const geo = c.geo, S = c.spec, hl = S.len / 2, hw = S.wid / 2, D = c.dent; if (!D) return;
  if (!c.dentBase) { const g = geo.paint.clone(); c.pm.geometry = g; c.dentBase = Float32Array.from(g.attributes.position.array); }
  const p = c.pm.geometry.attributes.position, b = c.dentBase, zc = c.dentAt[0] * hl;
  for (let i = 0; i < p.count; i++) { let x = b[i * 3], y = b[i * 3 + 1], z = b[i * 3 + 2]; const n = .75 + .5 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    if (D[0] && z > hl - .95) { const t = (z - (hl - .95)) / .95; z -= D[0] * .3 * t * t * n; y -= D[0] * .07 * t * (y > S.body.belt - .2 ? 1 : 0); x *= 1 - D[0] * .05 * t; }
    if (D[1] && z < -hl + .9) { const t = (-hl + .9 - z) / .9; z += D[1] * .26 * t * t * n; y -= D[1] * .05 * t * (y > S.body.belt - .2 ? 1 : 0); }
    const bell = Math.exp(-Math.pow((z - zc) / 1.1, 2));
    if (D[2] && x > hw - .4) x -= D[2] * .16 * ((x - (hw - .4)) / .4) * bell * n;
    if (D[3] && x < -hw + .4) x += D[3] * .16 * ((-hw + .4 - x) / .4) * bell * n;
    p.setXYZ(i, x, y, z); }
  p.needsUpdate = true; c.pm.geometry.computeVertexNormals();
}
function undentCar(c) { if (!c.dentBase) return; c.pm.geometry.dispose(); c.pm.geometry = c.geo.paint; c.dentBase = null; c.dent = null; }
