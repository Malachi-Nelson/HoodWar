/* =====================================================================
   7c. PLANES — a single-prop Mallard and a Starling business jet, parked on the airport's apron for anyone and sold on the phone.
       Like the helicopters they are cars to everything else (seats, damage, wrecks, the wire); here is how they are drawn and how
       they fly: throttle for airspeed, the nose and the bank for where it goes, lift that fades below stall speed, a runway (or any
       long flat road) to get up to speed on and to land on gently. With a mouse the plane flies toward where you look; on a stick
       or a touch screen it is flown directly. Anything taller than the plane is flying is a crash at speed.
   ===================================================================== */
const PLANE_PIVOT = 1.0;
function planeGeo(type) {
  if (CAR_GEO[type]) return CAR_GEO[type];
  const jet = type === 'jet', Pb = new GeoBuf(), M = new GeoBuf(), Gl = new GeoBuf(), L = new GeoBuf(), Y = -PLANE_PIVOT, dk = hexCol(0x1c1e21), mt = hexCol(0x5f666d), red = hexCol(0xff3a30), grn = hexCol(0x38ff6a), wht = hexCol(0xfff6e0);
  const ext = (buf, pts, width, bv, col) => { const sh = new T.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); const d = Math.max(.02, width - bv * 2), g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: bv > 0, bevelSize: bv, bevelThickness: bv, bevelSegments: 2, steps: 1 }); g.translate(0, Y, -d / 2); g.rotateY(-PI / 2); buf.geo(g, null, col); g.dispose(); };
  const tube = (buf, ax, ay, az, bx, by, bz, r, col, r2) => { const len = hyp(bx - ax, by - ay, bz - az), g = new T.CylinderGeometry(r2 === undefined ? r : r2, r, len, 9), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3((bx - ax) / len, (by - ay) / len, (bz - az) / len)); buf.geo(g, new T.Matrix4().compose(new T.Vector3((ax + bx) / 2, (ay + by) / 2 + Y, (az + bz) / 2), q, new T.Vector3(1, 1, 1)), col); g.dispose(); };
  const slab = (buf, cx, cy, cz, w, h, d, sweep, col) => { const g = new T.BoxGeometry(w, h, d); buf.geo(g, new T.Matrix4().compose(new T.Vector3(cx, cy + Y, cz), new T.Quaternion().setFromEuler(new T.Euler(0, sweep, 0)), new T.Vector3(1, 1, 1)), col); g.dispose(); };
  const wheel = (x, y, z, r) => { const g = new T.CylinderGeometry(r, r, .2, 12); g.rotateZ(PI / 2); g.translate(x, y + Y, z); M.geo(g, null, dk); g.dispose(); };
  let out;
  if (!jet) {   // the Mallard: high wing, a prop on the nose, fixed gear
    ext(Pb, [[-4.0, 1.05], [-1.6, .8], [1.0, .55], [2.9, .62], [3.5, .9], [3.45, 1.35], [2.6, 1.6], [.6, 1.74], [-1.2, 1.56], [-4.0, 1.22]], 1.16, .1);
    ext(Gl, [[.7, 1.62], [1.1, 2.04], [2.3, 1.96], [2.78, 1.58]], 1.12, .03);
    Pb.box(-5.3, 5.3, 2.02 + Y, 2.16 + Y, .25, 1.75);                                        // the wing
    [-1, 1].forEach(s => { tube(M, s * 2.4, 2.02, 1.0, s * .56, .82, 1.0, .05, mt); tube(M, s * .5, .72, .45, s * 1.05, .32, .45, .06, mt); wheel(s * 1.08, .32, .45, .32); });
    Pb.box(-1.75, 1.75, 1.2 + Y, 1.28 + Y, -4.05, -3.2); ext(Pb, [[-4.05, 1.2], [-3.2, 1.26], [-3.75, 2.55], [-4.18, 2.6]], .12, .02);
    tube(M, 0, .62, 2.8, 0, .3, 2.85, .05, mt); wheel(0, .27, 2.86, .25); tube(M, 0, 1.08, 3.48, 0, 1.08, 3.86, .02, mt, .2);
    L.box(5.22, 5.32, 2.04 + Y, 2.14 + Y, .9, 1.1, red); L.box(-5.32, -5.22, 2.04 + Y, 2.14 + Y, .9, 1.1, grn); L.box(-.06, .06, 2.58 + Y, 2.66 + Y, -4.22, -4.12, wht); L.box(-.12, .12, .62 + Y, .7 + Y, 3.38, 3.46, wht);
    out = { seats: [[-.3, 1.2], [.3, 1.2]], prop: { z: 3.92, y: 1.08, r: 1.05 }, span: 10.6, len: 7.6, nose: 3.9, tail: -4.2, belt: 1.45, roof: 2.1 };
  } else {      // the Starling: low swept wings, a T-tail, two engines at the back
    ext(Pb, [[-6.0, 1.25], [-4.5, 1.02], [-1.0, .78], [3.0, .74], [4.8, .86], [5.75, 1.2], [5.55, 1.55], [4.3, 1.96], [2.5, 2.26], [-1.5, 2.32], [-4.5, 2.08], [-6.0, 1.92]], 1.76, .14);
    ext(Gl, [[3.05, 2.0], [3.7, 2.2], [4.62, 1.86], [3.65, 1.72]], 1.62, .03);
    for (let k = 0; k < 5; k++) [-1, 1].forEach(s => M.box(s * .9 - .02, s * .9 + .02, 1.62 + Y, 1.92 + Y, 1.6 - k * 1.1, 2.1 - k * 1.1, dk));   // cabin windows
    [-1, 1].forEach(s => { slab(Pb, s * 3.2, .98, -.6, 5.0, .16, 2.1, s * .32); slab(Pb, s * 5.55, 1.18, -1.55, .12, .5, .8, s * .32);                 // wings and winglets
      tube(M, s * 1.38, 2.08, -4.7, s * 1.38, 2.08, -2.5, .42, mt, .38); M.box(s * .82 - .1, s * .82 + .1, 1.94 + Y, 2.14 + Y, -4.0, -3.0, mt);   // engines and pylons
      tube(M, s * 1.4, .8, -.4, s * 1.4, .32, -.4, .07, mt); wheel(s * 1.4, .32, -.4, .33); });
    ext(Pb, [[-6.0, 1.9], [-4.6, 2.02], [-5.45, 3.72], [-6.35, 3.78]], .16, .03); Pb.box(-2.15, 2.15, 3.64 + Y, 3.74 + Y, -6.35, -5.35);
    tube(M, 0, .8, 4.3, 0, .3, 4.3, .06, mt); wheel(0, .27, 4.32, .26);
    L.box(5.78, 5.9, 1.08 + Y, 1.2 + Y, -1.7, -1.5, red); L.box(-5.9, -5.78, 1.08 + Y, 1.2 + Y, -1.7, -1.5, grn); L.box(-.06, .06, 3.76 + Y, 3.84 + Y, -6.4, -6.3, wht); L.box(-.14, .14, .76 + Y, .84 + Y, 5.55, 5.65, wht);
    out = { seats: [[-.4, 3.3], [.4, 3.3], [-.4, .9], [.4, .9]], prop: null, span: 11.8, len: 11.8, nose: 5.8, tail: -6.4, belt: 1.7, roof: 2.4 };
  }
  return CAR_GEO[type] = Object.assign({ paint: Pb.build(), trim: M.build(), glass: Gl.build(), lamp: L.build(), wr: .3, axF: 0, axR: 0, seatY: .65, ride: .3, zf: 0, zr: 0, zc1: 0, k: 1 }, out);
}
const propGeo = (() => { const b = new GeoBuf(), c = hexCol(0x24272b); [0, PI].forEach(a => { const g = new T.BoxGeometry(.12, 1.05, .05); g.translate(0, .52, 0); g.rotateZ(a); b.geo(g, null, c); g.dispose(); }); return b.build(); })();
const propDisc = (() => { const g = new T.CircleGeometry(1.05, 24); return g; })();
function planeDress(c) {
  c.body.position.y = PLANE_PIVOT; c.bm.visible = false; c.bm.scale.setScalar(0);
  if (c.geo.prop) { const p = c.geo.prop; c.prop = new T.Mesh(propGeo, rotorMat); c.prop.position.set(0, p.y - PLANE_PIVOT, p.z); c.body.add(c.prop); c.pdisc = new T.Mesh(propDisc, discMat.clone()); c.pdisc.position.set(0, p.y - PLANE_PIVOT, p.z + .02); c.pdisc.visible = false; c.body.add(c.pdisc); }
  c.bea = new T.Sprite(BEACON); c.bea.scale.setScalar(1.8); c.bea.position.set(0, (c.geo.roof || 2) - PLANE_PIVOT + .1, -.5); c.bea.visible = false; c.body.add(c.bea);
  c.rotor = 0; c.rotA = 0; c.landed = true; c.vy = 0; c.spd = 0; c.thr = 0; c.ptc = 0; c.sink = 0;
}
/* --- flying. inp: { pitch -1..1 (back on the stick, nose up), roll -1..1 (right), thr -1..1 (throttle up or down), brake,
       aim: fly toward aimYaw/aimPitch (the mouse) }. Airspeed comes from the throttle and goes into climbing; under stall speed the
       wings stop holding it up and the nose drops. It turns by banking. On the ground it rolls, steers and brakes like a car. */
function stepPlane(c, dt, inp) {
  const S = c.spec, alive = !c.wreck && c.burn <= 0 && c.hp > 0, pilot = !!c.occ[0] && alive && !c.sunk; c.stepT = G.time;
  c.thr = clamp((c.thr || 0) + (pilot ? inp.thr || 0 : -1) * dt * .55, 0, 1);
  c.rotor = approach(c.rotor || 0, pilot ? .3 + c.thr * .7 : 0, dt * .8);
  const ground0 = groundAt(c.x, c.z, c.y + .5, 's', .6), hgt = c.y - ground0;
  // airspeed: the throttle's speed, less what climbing costs, more what diving gives
  const want = alive ? S.vmax * c.thr : 0;
  c.spd += ((want - c.spd) * (c.landed ? .3 : .2) - (c.landed ? 0 : 9.8 * Math.sin(c.ptc) * .9)) * dt;
  if (c.landed) { c.spd -= c.spd * dt * (inp.brake && pilot ? 1.6 : .06); if (!pilot) c.spd = approach(c.spd, 0, dt * 3); }
  c.spd = clamp(c.spd, 0, S.vmax * 1.25);
  const lift = clamp((c.spd - S.vstall * .55) / (S.vstall * .45), 0, 1), auth = clamp(c.spd / S.vstall, .15, 1);
  let pIn = pilot ? inp.pitch || 0 : 0, rIn = pilot ? inp.roll || 0 : 0;
  if (!c.landed && pilot && inp.aim && !pIn && !rIn) {   // mouse: bank toward where you look, and lift or drop the nose to it
    const dy = angTo(c.yaw, inp.aimYaw); rIn = clamp(-dy * 2.4, -1, 1); pIn = clamp((clamp(inp.aimPitch, -.7, .8) - c.ptc) * 3, -1, 1); }
  if (c.wreck) { if (c.landed) c.roll = approach(c.roll, Math.round(c.roll / PI) * PI, dt * 2); else { c.roll += dt * 1.8; c.ptc = approach(c.ptc, -.9, dt * .7); } }   // a wreck spins down, then lies where it fell
  else if (c.landed) {   // on its wheels: the bank comes out, the nose comes up only once it is quick enough to fly
    c.roll = approach(c.roll || 0, 0, dt * 3); c.yaw = wrapPi(c.yaw - rIn * dt * .9 * clamp(c.spd / 6, 0, 1) * (c.spd > S.vstall ? .4 : 1));
    if (pIn > 0 && c.spd > S.vstall * .95) c.ptc = Math.min(.32, c.ptc + pIn * S.pitchRate * .6 * dt); else c.ptc = approach(c.ptc, 0, dt * 1.2); }
  else {
    c.roll = approach(c.roll || 0, rIn * 1.1, dt * S.rollRate * (rIn ? 1 : .6));
    c.ptc = clamp(c.ptc + pIn * S.pitchRate * auth * dt - (1 - lift) * .8 * dt, -1.1, 1.05);   // stalling: the nose falls through
    c.yaw = wrapPi(c.yaw - Math.sin(c.roll) * S.turn * auth * dt); }
  c.sink = approach(c.sink || 0, c.landed ? 0 : (1 - lift) * 16, dt * (lift < 1 ? 7 : 12));
  const cp = Math.cos(c.ptc), fx = -Math.sin(c.yaw) * cp, fz = -Math.cos(c.yaw) * cp, fy = Math.sin(c.ptc);
  c.vx = fx * c.spd; c.vz = fz * c.spd; c.vy = c.landed ? Math.max(0, c.spd * fy * lift) : c.spd * fy - c.sink;
  if (c.sunk) { c.vy = -1.1; c.vx *= .3; c.vz *= .3; c.spd *= 1 - Math.min(1, dt * 2); }
  c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt;
  // what it hits: anything at the nose or a wingtip, at the height it is flying (what stops bullets stops it)
  let hit = 0;
  if (!c.sunk && c.spd > 2) { const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), yb = c.y + PLANE_PIVOT, h = c.geo.span / 2, cr = Math.cos(c.roll || 0), sr = Math.sin(c.roll || 0), n = c.geo.nose;
    const pts = [[c.x + fx * n, c.z + fz * n, yb + fy * n], [c.x + rx * h * cr, c.z + rz * h * cr, yb - h * sr], [c.x - rx * h * cr, c.z - rz * h * cr, yb + h * sr]];   // the nose and both wingtips (a right bank drops the right one)
    for (const q of pts) if (pushOut(q[0], q[1], .45, q[2] - .35, q[2] + .35, 's')) { hit = Math.max(hit, c.spd * (c.landed ? .6 : 2.2)); break; }
    if (hit > 0) { c.spd *= c.landed ? .2 : .35; c.x -= c.vx * dt * 2; c.z -= c.vz * dt * 2; } }
  if (!c.sunk) { const A = AIRSPACE; c.oob = c.x < A.x0 || c.x > A.x1 || c.z < A.z0 || c.z > A.z1 || c.y > A.top - 6;
    if (c.oob && !c.landed) { const to = yawOf((A.x0 + A.x1) / 2 - c.x, (A.z0 + A.z1) / 2 - c.z); c.yaw = wrapPi(c.yaw + clamp(angTo(c.yaw, to), -1, 1) * dt * .9); if (c.y > A.top - 6) c.ptc = Math.min(c.ptc, -.05); }
    c.x = clamp(c.x, A.x0 - 60, A.x1 + 60); c.z = clamp(c.z, A.z0 - 60, A.z1 + 60); }
  // the ground: a gentle touchdown, wings level and nose up a little, lands it; anything else is a crash
  const g = c.sunk ? -50 : groundAt(c.x, c.z, c.y + .5, 's', .6), was = c.landed;
  if (c.y <= g) { const imp = -c.vy; c.y = g;
    if (!was) { const bad = imp > 6.5 || Math.abs(c.roll || 0) > .5 || c.ptc < -.28 || c.wreck; if (bad) hit = Math.max(hit, 18 + imp * 3 + c.spd * 1.1); else { c.landed = true; c.ptc = Math.max(0, c.ptc); c.sink = 0; } }
    c.landed = c.landed || c.wreck; c.vy = 0; if (c.landed && c.ptc < 0) c.ptc = 0; }
  else if (hgt > .6 && c.landed) c.landed = false;
  if (c.landed && c.y > g + .4) c.landed = false;
  if (!c.sunk && c.y < .7 && !onLand(c.x, c.z)) { if (AUTH()) GAME.ditch(c); else if (c === P.car) { NET.req('dk', c.id); c.sunk = true; } }
  c.dive = -c.ptc;
  if (c.burn > 0 && hit > 2.5) c.burn = Math.min(c.burn, .02);
  if (hit > 0) c.crash = Math.max(c.crash || 0, hit);
  c.asleep = c.landed && !c.occ[0] && c.spd < .05 && !c.sunk && (c.rotor || 0) < .02;
  return hit;
}
// --- at the controls
function planeControls(c, dt) {
  const inp = c.inp; let pitch = (isHeld('aback') ? 1 : 0) - (isHeld('afwd') ? 1 : 0), roll = (isHeld('aright') ? 1 : 0) - (isHeld('aleft') ? 1 : 0);
  { const sx = stickX(), sy = stickY(); if (sx || sy) { pitch = clamp(sy * 1.25, -1, 1); roll = clamp(sx * 1.25, -1, 1); } }   // stick back (toward you) is nose up
  inp.pitch = pitch; inp.roll = roll; inp.thr = heldAmt('up') - heldAmt('down'); inp.brake = isHeld('down') && c.thr < .05;
  inp.aim = !TOUCH.on && !padRecent(); inp.aimYaw = P.cyaw; inp.aimPitch = P.cpitch + .1;
  stepPlane(c, dt, inp);
  if (c.oob && !P.airWarn) { P.airWarn = true; banner('Restricted airspace', 'Turning back toward the city', 2); } if (!c.oob) P.airWarn = false;
}
// what it looks like: the prop turning (a blur once it is going), the beacon, smoke and fire when it is hurt
const _pp = { x: 0, y: 0, z: 0 };
function planeVisual(c, dt) {
  if (G.time - (c.stepT || -9) > .25) c.rotor = approach(c.rotor || 0, (c.eng || c.occ[0]) && !c.wreck ? .8 : 0, dt * .45);
  const r = c.rotor || 0; if (c.prop) { c.rotA = (c.rotA + r * 46 * dt) % TAU; c.prop.rotation.z = c.rotA; const blur = r > .3 ? (r - .3) / .7 : 0; c.pdisc.visible = blur > .02; if (c.pdisc.visible) c.pdisc.material.opacity = blur * .3; }
  c.bea.visible = r > .1 && !c.wreck && (G.time * 1.2 + c.id * .37) % 1 < .1;
  if (c.wreck) { if (c.pm.material !== wreckMat) c.pm.material = wreckMat; c.smokeT -= dt; if (!c.sunk && c.smokeT <= 0 && c.wreckT < 14) { c.smokeT = .16; FX.smoke(c.x, c.y + 1.4, c.z, 1.6, true); if (c.wreckT < 6) FX.fire(c.x, c.y + 1, c.z, 1.4); } return; }
  const frac = c.hp / c.spec.hp; c.smokeT -= dt; heliPoint(c, 0, PLANE_PIVOT + .4, c.geo.prop ? 2.6 : -4, _pp);
  if (c.burn > 0) { if (c.smokeT <= 0) { c.smokeT = .06; FX.fire(_pp.x, _pp.y, _pp.z, 1); FX.smoke(_pp.x, _pp.y + .4, _pp.z, 1.2, true); } }
  else if (frac < .45 && c.smokeT <= 0) { c.smokeT = frac < .25 ? .09 : .2; FX.smoke(_pp.x, _pp.y, _pp.z, .9, frac < .25); }
}
const isPlane = c => !!c && c.spec.air === 'plane', NOPLANE = { pitch: 0, roll: 0, thr: -1, brake: true };
