/* =====================================================================
   7b. AIRCRAFT — a helicopter is a car with a rotor: seats, damage, wrecks, the wire and jacking one are the cars' own, and only
       how it is drawn, how it flies and what it shoots are here. Also the airport's lights, the airliner that lands and leaves
       again, the police helicopter that joins a big chase, the guards on the gunship, a parachute for whoever jumps, and the
       swim back to shore for whoever lands in the water.
   ===================================================================== */
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const HELI_PIVOT = 1.2;   // the body tilts about a point this high, about where its weight is
// --- the machine itself: a hull and a canopy drawn from the side and extruded like the cars, a tail boom, skids; the gunship adds stub
//     wings with rocket pods and a pair of guns under the nose. Built about the pivot, so the body can lean without leaving the ground.
function heliGeo(type) {
  if (CAR_GEO[type]) return CAR_GEO[type];
  const S = CARS[type], gun = S.air === 'gun', k = gun ? 1 : 1.1, P = new GeoBuf(), M = new GeoBuf(), G = new GeoBuf(), L = new GeoBuf(), dk = hexCol(0x1c1e21), mt = hexCol(0x4f565c), Y = -HELI_PIVOT;
  const ext = (buf, pts, width, bv, col) => { const sh = new T.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0] * k, p[1] * k) : sh.moveTo(p[0] * k, p[1] * k)); const d = Math.max(.02, width * k - bv * 2), g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: bv > 0, bevelSize: bv, bevelThickness: bv, bevelSegments: 2, steps: 1 }); g.translate(0, Y, -d / 2); g.rotateY(-PI / 2); buf.geo(g, null, col); g.dispose(); };
  const tube = (buf, ax, ay, az, bx, by, bz, r, col) => { const len = hyp(bx - ax, by - ay, bz - az), g = new T.CylinderGeometry(r, r, len, 7), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3((bx - ax) / len, (by - ay) / len, (bz - az) / len)); buf.geo(g, new T.Matrix4().compose(new T.Vector3((ax + bx) / 2, (ay + by) / 2 + Y, (az + bz) / 2), q, new T.Vector3(1, 1, 1)), col); g.dispose(); };
  ext(P, [[-1.7, .62], [-1.75, 1.3], [-.4, 1.42], [1.1, 1.3], [2.15, 1.08], [2.55, .8], [2.35, .5], [1.4, .42], [-1.2, .42]], 1.9, .12);         // the hull
  ext(G, [[-.6, 1.36], [-.35, 2.14], [.7, 2.22], [1.75, 1.72], [2.3, 1.14], [1.2, 1.22]], 1.76, .05);                                              // the canopy
  ext(P, [[-1.75, 1.32], [-1.7, 2.18], [-1.1, 2.4], [-.15, 2.4], [.15, 2.12], [-.45, 1.32]], 1.24, .08);                                           // the engine on top
  { const g = new T.CylinderGeometry(.15 * k, .36 * k, 5.6 * k, 10); g.rotateX(-PI / 2); g.translate(0, 1.55 * k + Y, -4.4 * k); P.geo(g, null, null); g.dispose(); }   // the tail boom
  ext(P, [[-7.5, 1.48], [-7.0, 1.62], [-7.35, 3.0], [-7.78, 3.05]], .14, .02); ext(P, [[-7.25, 1.5], [-7.45, .95], [-7.7, .98], [-7.6, 1.52]], .1, .02);
  P.box(-1.15 * k, 1.15 * k, 1.5 * k + Y, 1.58 * k + Y, -6.35 * k, -5.85 * k);
  [-1, 1].forEach(s => { M.box(s * .52 - .1, s * .52 + .1, 1.98 * k + Y, 2.16 * k + Y, -1.98 * k, -1.7 * k, dk); });                              // exhausts
  tube(M, 0, 2.38 * k, -.75 * k, 0, 2.7 * k, -.75 * k, .11, mt);
  [-1, 1].forEach(s => { const x = s * 1.0 * k; tube(M, x, .07, -1.45 * k, x, .07, 1.95 * k, .055, mt); tube(M, x, .07, 1.95 * k, x, .3, 2.35 * k, .055, mt);
    [-.85, 1.15].forEach(zz => tube(M, x, .07, zz * k, s * .72 * k, .5 * k, zz * k, .05, mt)); });
  if (gun) { P.box(-2.35, 2.35, .92 + Y, 1.02 + Y, .05, .85);
    [-1, 1].forEach(s => { tube(M, s * 2.05, .74, -.25, s * 2.05, .74, 1.3, .21, dk); tube(M, s * 2.05, .96, .45, s * 2.05, .78, .45, .05, mt); tube(M, s * .3, .56, 2.3, s * .3, .56, 3.6, .055, dk); });
    M.box(-.5, .5, .38 + Y, .74 + Y, 1.85, 2.45, dk); }
  const red = hexCol(0xff3a30), grn = hexCol(0x38ff6a), wht = hexCol(0xfff6e0), wx = gun ? 2.38 : 1.0 * k, wy = gun ? .97 : .62 * k, wz = gun ? .45 : .9 * k;
  L.box(wx - .07, wx + .07, wy - .05 + Y, wy + .05 + Y, wz - .07, wz + .07, red); L.box(-wx - .07, -wx + .07, wy - .05 + Y, wy + .05 + Y, wz - .07, wz + .07, grn);   // port is +x in the model
  L.box(-.07, .07, 3.0 * k + Y, 3.1 * k + Y, -7.74 * k, -7.62 * k, wht); L.box(-.22, .22, .42 + Y, .48 + Y, 2.05 * k, 2.25 * k, wht);
  return CAR_GEO[type] = { paint: P.build(), trim: M.build(), glass: G.build(), lamp: L.build(), wr: .3, axF: 0, axR: 0, seatY: .58, belt: 1.42 * k, roof: 2.4 * k, ride: .42, zf: 0, zr: 0, zc1: 0, k,
    seats: [[-.42, .95 * k], [.42, .95 * k], [-1.06 * k, -.3 * k], [1.06 * k, -.3 * k]],   // pilot, front passenger, and two sat in the open doors behind
    rotor: { y: 2.68 * k, z: -.75 * k, r: gun ? 5.0 : 5.5, tz: -7.5 * k, ty: 2.5 * k }, guns: gun ? [.3, .56, 3.65] : null, pods: gun ? [2.05, .74, 1.35] : null };
}
const ROTOR_GEO = {};
function rotorGeo(r) { if (ROTOR_GEO[r]) return ROTOR_GEO[r]; const b = new GeoBuf(), c = hexCol(0x24272b); for (let i = 0; i < 4; i++) { const g = new T.BoxGeometry(r - .25, .05, .3); g.translate((r - .25) / 2 + .25, 0, 0); g.rotateY(i / 4 * TAU); b.geo(g, null, c); g.dispose(); } const h = new T.CylinderGeometry(.3, .3, .22, 10); b.geo(h, null, c); h.dispose(); return ROTOR_GEO[r] = b.build(); }
const tailRotorGeo = (() => { const b = new GeoBuf(), c = hexCol(0x24272b); [0, PI / 2].forEach(a => { const g = new T.BoxGeometry(.04, 1.5, .16); g.rotateX(a); b.geo(g, null, c); g.dispose(); }); return b.build(); })();
const discGeo = (() => { const g = new T.CircleGeometry(1, 32); g.rotateX(-PI / 2); return g; })(), rotorMat = lam({}), discMat = new T.MeshBasicMaterial({ color: 0x15171a, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
const BEACON = new T.SpriteMaterial({ map: glowTex, color: 0xff3a30, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false, fog: false });
const beamConeGeo = (() => { const g = new T.ConeGeometry(1, 1, 16, 1, true); g.translate(0, -.5, 0); return g; })(), beamConeMat = new T.MeshBasicMaterial({ color: 0xfff3d0, transparent: true, opacity: .1, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
const beamSpotMat = new T.MeshBasicMaterial({ map: glowTex, color: 0xfff0c8, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false });
function heliDress(c, cop) {
  const ge = c.geo, R = ge.rotor; c.body.position.y = HELI_PIVOT; c.bm.visible = false; c.bm.scale.setScalar(0);
  c.rot = new T.Mesh(rotorGeo(R.r), rotorMat); c.rot.position.set(0, R.y - HELI_PIVOT, R.z); c.rot.castShadow = true; c.body.add(c.rot);
  c.disc = new T.Mesh(discGeo, discMat.clone()); c.disc.scale.set(R.r, 1, R.r); c.disc.position.set(0, R.y - HELI_PIVOT + .03, R.z); c.disc.renderOrder = 3; c.disc.visible = false; c.body.add(c.disc);
  c.trot = new T.Mesh(tailRotorGeo, rotorMat); c.trot.position.set(-.2, R.ty - HELI_PIVOT, R.tz); c.body.add(c.trot);
  c.bea = new T.Sprite(BEACON); c.bea.scale.setScalar(2.2); c.bea.position.set(0, .3 - HELI_PIVOT, -.6); c.bea.visible = false; c.body.add(c.bea);
  c.rotor = 0; c.rotA = 0; c.landed = true; c.vy = 0; c.rk = 8; c.rkT = 0;
  if (cop) { c.cop = true; c.lph = -1;
    c.lb = [0, 1].map(q => { const s = new T.Sprite(copGlow[q]); s.scale.setScalar(2.6); s.position.set(q ? -.55 : .55, .45 - HELI_PIVOT, 1.6); s.visible = false; s.renderOrder = 5; c.body.add(s); return { s }; });
    c.cone = new T.Mesh(beamConeGeo, beamConeMat); c.cone.visible = false; c.cone.renderOrder = 4; scene.add(c.cone);
    c.spot = new T.Mesh(poolGeo, beamSpotMat); c.spot.visible = false; c.spot.renderOrder = 4; scene.add(c.spot); }
}
function heliUndress(c) { if (c.cone) { scene.remove(c.cone); scene.remove(c.spot); } }
// a point on the machine (ax to its right, ay up, az forward of the cabin) in the world, the lean of the nose included
function heliPoint(c, ax, ay, az, out) {
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), cp = Math.cos(c.dive || 0), sp = Math.sin(c.dive || 0), h = ay - HELI_PIVOT;
  const f = az * cp + h * sp; out.x = c.x + fx * f + rx * ax; out.z = c.z + fz * f + rz * ax; out.y = c.y + HELI_PIVOT + h * cp - az * sp; return out;
}
/* --- flying. inp: { fwd -1..1, side -1..1 (right is positive), up -1..1, yaw: where the nose should come round to }. Climb and
       descent are asked for directly and the machine holds its height between; across the ground it accelerates in the direction
       pushed and drag holds it to its top speed. Lift is the rotor's speed: it spins up with a pilot aboard and winds down without
       one, so an empty one in the air sinks, then falls. */
const NOAIR = { fwd: 0, side: 0, up: 0 };
function stepHeli(c, dt, inp) {
  const S = c.spec, alive = !c.wreck && c.burn <= 0 && c.hp > 0, pilot = !!c.occ[0] && alive && !c.sunk; c.stepT = G.time;
  c.rotor = approach(c.rotor || 0, pilot ? 1 : 0, dt * (pilot ? .5 : c.wreck ? .6 : .1));
  const lift = c.wreck || c.sunk ? 0 : c.rotor * (c.burn > 0 ? .5 : 1);
  let fwd = pilot ? inp.fwd || 0 : 0, side = pilot ? inp.side || 0 : 0; const up = pilot ? inp.up || 0 : 0, pushL = hyp(fwd, side); if (pushL > 1) { fwd /= pushL; side /= pushL; }
  if (c.burn > 0 && !c.landed) c.yawRate = lerp(c.yawRate, 2.4, Math.min(1, dt * .9));                                     // a burning one spins down
  else if (pilot && inp.yaw !== undefined && !(c.landed && up <= 0 && pushL < .1)) c.yawRate = lerp(c.yawRate, clamp(angTo(c.yaw, inp.yaw) * 2.6, -S.turn, S.turn), Math.min(1, dt * 4));
  else c.yawRate = lerp(c.yawRate, 0, Math.min(1, dt * 3));
  c.yaw = wrapPi(c.yaw + c.yawRate * dt);
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), thrust = c.landed ? 0 : S.accel * lift;
  c.vx += (fx * fwd + rx * side * .8) * thrust * dt; c.vz += (fz * fwd + rz * side * .8) * thrust * dt;
  const drag = S.accel / S.vmax; c.vx -= c.vx * drag * dt; c.vz -= c.vz * drag * dt;
  let want = up * S.climb * (up < 0 ? .85 : 1); if (up < 0 && pilot) { const h = c.y - groundAt(c.x, c.z, c.y + .05, 's', .6); if (h < 9) want = Math.max(want, -(1.3 + h * 1.05)); }   // the last few metres down are taken gently
  if (lift > .02) c.vy += ((want - c.vy) * 2.4 * lift - 9.8 * (1 - lift)) * dt; else c.vy -= 9.8 * dt;
  if (c.sunk) { c.vy = -1.1; c.vx *= 1 - Math.min(1, dt * 2); c.vz *= 1 - Math.min(1, dt * 2); }
  c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt;
  // what it hits: the cabin, the tail, and the rotor disc while it turns (a rotor strike costs more). Only what stops bullets stops it.
  let hit = 0;
  const wall = (px, pz, r, ya, yb, cost) => { if (!pushOut(px, pz, r, ya, yb, 's')) return; c.x += COL.x - px; c.z += COL.z - pz; const vn = c.vx * COL.nx + c.vz * COL.nz; if (vn < 0) { c.vx -= COL.nx * vn * 1.35; c.vz -= COL.nz * vn * 1.35; if (-vn * cost > hit) hit = -vn * cost; } };
  if (!c.sunk) { wall(c.x, c.z, S.wid * .62, c.y + .45, c.y + 2.3, 1); wall(c.x - fx * 5.2, c.z - fz * 5.2, .55, c.y + 1.1, c.y + 3, 1); if (c.rotor > .3) wall(c.x, c.z, c.geo.rotor.r - .4, c.y + c.geo.rotor.y - .25, c.y + c.geo.rotor.y + .25, 1.4);
    if (c.y + 3 > AIRSPACE.top) c.vy = Math.min(c.vy, 0);
    const A = AIRSPACE, m = 2.5 * dt; if (c.x < A.x0) c.vx += (A.x0 - c.x) * m; else if (c.x > A.x1) c.vx -= (c.x - A.x1) * m; if (c.z < A.z0) c.vz += (A.z0 - c.z) * m; else if (c.z > A.z1) c.vz -= (c.z - A.z1) * m;
    c.x = clamp(c.x, A.x0 - 30, A.x1 + 30); c.z = clamp(c.z, A.z0 - 30, A.z1 + 30); c.oob = c.x < A.x0 || c.x > A.x1 || c.z < A.z0 || c.z > A.z1 || c.y > A.top - 6; }
  const g = c.sunk ? -50 : groundAt(c.x, c.z, c.y + .05, 's', .6), was = c.landed; c.landed = false;
  if (c.y <= g) { const imp = -c.vy, hs = hyp(c.vx, c.vz); c.y = g; c.vy = Math.max(0, c.vy); c.landed = true;
    if (imp > 5.5) hit = Math.max(hit, imp * 1.15); if (!was && hs > 11) hit = Math.max(hit, hs * .7);
    const f = Math.min(1, dt * (c.rotor > .9 && up > 0 ? 1 : 5)); c.vx -= c.vx * f; c.vz -= c.vz * f; }
  if (!c.sunk && c.y < .7 && !onLand(c.x, c.z)) { if (AUTH()) GAME.ditch(c); else if (c === P.car) { NET.req('dk', c.id); c.sunk = true; } }
  const air = !c.landed;
  c.dive = lerp(c.dive || 0, air ? fwd * .2 * lift + clamp(-c.vy * .004, -.04, .04) : 0, Math.min(1, dt * 3));
  c.roll = lerp(c.roll || 0, air ? side * .26 * lift - clamp(c.yawRate * .1, -.12, .12) : 0, Math.min(1, dt * 3));
  if (c.burn > 0 && hit > 2.5) c.burn = Math.min(c.burn, .02);                                                             // on fire and it hits something: it goes up
  if (hit > 0) c.crash = Math.max(c.crash, hit);
  c.asleep = c.landed && !c.occ[0] && c.rotor < .02 && hyp(c.vx, c.vz) < .05 && !c.sunk;
  return hit;
}
// someone has just taken the controls: a police car, or the gunship off the airport police's pad, is a crime
GAME.boarded = (c, who) => {
  if (c.stolen || !who || who.kind === 'bot' || who.team === TEAM_COP) return;   // an officer may take a police car or the police gunship
  if (c.cop) { c.stolen = true; GAME.crime(who, 20, 1); }
  else if (c.spec.air === 'gun' && c.home && c.home.kind === 'gun') { c.stolen = true; GAME.crime(who, 60, 3); GAME.ev('gs', GAME.ref(who)); }
};
// down in the water: it sinks, whoever was flying it swims for it
GAME.ditch = c => {
  if (c.sunk) return; c.sunk = true; c.wreck = true; c.wreckT = 0; c.burn = 0; c.hp = 0; c.ai = null; FX.dust(c.x, .2, c.z, 20, .92);
  for (let k = 0; k < 4; k++) { const o = c.occ[k]; if (!o) continue; c.occ[k] = null; if (o.kind === 'bot') { o.car = null; killBot(o, c.lastHit && !c.lastHit.gone ? c.lastHit : null, 'fall', false); } else if (o === P) { GAME.leaveCar(true); swimAshore(); } else o.car = null; }
};
function swimAshore() { const n = NAV[nearestNode(P.x, CURB, P.z, false)]; if (!n) return; P.x = n.x; P.y = P.camY = n.y; P.z = n.z; P.vx = P.vz = P.vy = 0; P.chute = 0; banner('Swam ashore', '', 1.6); }
// --- what it looks like: blades turning (a blur once they are up to speed), the beacon, smoke and fire, the downwash on the ground below,
//     and on a police one the lights and, after dark, the searchlight on whoever they are after
const _hp = { x: 0, y: 0, z: 0 };
function heliVisual(c, dt) {
  if (G.time - (c.stepT || -9) > .25) c.rotor = approach(c.rotor || 0, (c.eng || c.occ[0]) && !c.wreck ? 1 : 0, dt * .45);   // flown elsewhere: just spin as it should
  const r = c.rotor || 0; c.rotA = (c.rotA + r * 31 * dt) % TAU; c.rot.rotation.y = c.rotA; c.trot.rotation.x = c.rotA * 2.6;
  const blur = r > .35 ? (r - .35) / .65 : 0; c.disc.visible = blur > .02; if (c.disc.visible) c.disc.material.opacity = blur * .24;
  c.bea.visible = r > .1 && !c.wreck && (G.time * 1.15 + c.id * .37) % 1 < .1;
  if (c.wreck) { if (c.pm.material !== wreckMat) c.pm.material = wreckMat; c.smokeT -= dt; if (!c.sunk && c.smokeT <= 0 && c.wreckT < 14) { c.smokeT = .16; FX.smoke(c.x, c.y + 1.4, c.z, 1.4, true); if (c.wreckT < 6) FX.fire(c.x, c.y + 1, c.z, 1.2); }
    if (c.cone) { c.cone.visible = c.spot.visible = false; } if (c.lb) c.lb.forEach(L => { L.s.visible = false; }); return; }
  const frac = c.hp / c.spec.hp; c.smokeT -= dt; heliPoint(c, 0, 2.2, -1.2, _hp);
  if (c.burn > 0) { if (c.smokeT <= 0) { c.smokeT = .06; FX.fire(_hp.x, _hp.y, _hp.z, 1); FX.smoke(_hp.x, _hp.y + .4, _hp.z, 1.2, true); } }
  else if (frac < .45 && c.smokeT <= 0) { c.smokeT = frac < .25 ? .09 : .2; FX.smoke(_hp.x, _hp.y, _hp.z, .9, frac < .25); }
  if (r > .5 && (c.dustT = (c.dustT || 0) - dt) <= 0) { const g = groundAt(c.x, c.z, c.y + .2, 's', 0), h = c.y - g; if (h < 10) { c.dustT = .05; const a = rand() * TAU, d = 3 + rand() * 4; FX.dust(c.x + Math.cos(a) * d, g + .2, c.z + Math.sin(a) * d, 1, onLand(c.x, c.z) ? .62 : .92); } else c.dustT = .3; }
  if (c.cop) { const ph = c.horn ? Math.floor(G.time * 5 + c.id * .5) % 2 : -1; if (c.lph !== ph) { c.lph = ph; c.lb.forEach((L, k) => { L.s.visible = ph === k; }); }
    let on = ENV.night > .3 && r > .8; const a = on ? copLight(c) : null; on = !!a;
    c.cone.visible = c.spot.visible = on;
    if (on) { heliPoint(c, 0, .5, 1.6, _hp); const tx = a.x, tz = a.z, ty = groundAt(a.x, a.z, (a.y || 0) + 1, 's') + .05, dx = tx - _hp.x, dy = ty - _hp.y, dz = tz - _hp.z, L = hyp(dx, dy, dz) || 1;
      c.cone.position.set(_hp.x, _hp.y, _hp.z); c.cone.scale.set(L * .16, L, L * .16); c.cone.quaternion.setFromUnitVectors(_up0, _cv0.set(-dx / L, -dy / L, -dz / L)); c.spot.position.set(tx, ty + .02, tz); c.spot.scale.set(L * .34, 1, L * .34); } }
}
const _up0 = new T.Vector3(0, 1, 0), _cv0 = new T.Vector3();
function copLight(c) { let best = null, bd = 90; humans().forEach(h => { if (!(h.heat > 0) || h.dead) return; const d = hyp(h.x - c.x, h.z - c.z); if (d < bd) { bd = d; best = h; } }); return best; }
// --- at the controls: keys or the stick across the ground, Space and Shift (or the UP and DOWN buttons) for height, the mouse turns it
function heliControls(c, dt) {
  const inp = c.inp; let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (TOUCH.on && (TOUCH.fx || TOUCH.fy)) { fwd = clamp(-TOUCH.fy * 1.25, -1, 1); side = clamp(TOUCH.fx * 1.25, -1, 1); }
  inp.fwd = fwd; inp.side = side; inp.up = (keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.ShiftRight || keys.KeyC ? 1 : 0); inp.yaw = P.cyaw;
  stepHeli(c, dt, inp);
  if (c.spec.air === 'gun' && !c.sunk) { if (mouse.down) heliGun(c); if (mouse.right || keys.KeyG) heliRocket(c); }
  c.rk = Math.min(8, (c.rk === undefined ? 8 : c.rk) + dt / 1.2);
  if (c.oob && !P.airWarn) { P.airWarn = true; banner('Restricted airspace', 'Turn back toward the city', 2); } if (!c.oob) P.airWarn = false;
}
// --- the gunship's weapons. Both go where the crosshair is, within reason: nothing behind the tail.
const _hm = { x: 0, y: 0, z: 0 }, _ht = { x: 0, y: 0, z: 0 }, _cw = new T.Vector3();
function crossTarget(c, out) {   // the first thing under the middle of the screen, or a point far off along it
  camera.getWorldDirection(_cw); const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, fx = _cw.x, fy = _cw.y, fz = _cw.z, h2 = hyp(fx, fz);
  let t = rayCars(ox, oy, oz, fx, fy, fz, rayWorld(ox, oy, oz, fx, fy, fz, 's', 420), c);
  eachActor(a => { if (a === P || a.dead || a.gone || a.car === c) return; const ex = a.x - ox, ez = a.z - oz; if (h2 > .05) { const al = (ex * fx + ez * fz) / h2; if (al < 0 || ex * ex + ez * ez - al * al > 2) return; } const q = actorHit(a, ox, oy, oz, fx, fy, fz); if (q < t) t = q; });
  t = Math.min(t, 420); out.x = ox + fx * t; out.y = oy + fy * t; out.z = oz + fz * t; return out;
}
function aimFrom(c, m, out) {   // the way from a muzzle at m to the crosshair, kept to the front of the machine
  crossTarget(c, _ht); let dx = _ht.x - m.x, dy = _ht.y - m.y, dz = _ht.z - m.z, l = hyp(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), hl = hyp(dx, dz), along = hl > .08 ? (dx * fx + dz * fz) / hl : 1; if (along < .1) { const k = (.1 - along) * 1.2 * hl; dx += fx * k; dz += fz * k; l = hyp(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l; }   // only round toward the tail is out of reach
  out.x = dx; out.y = dy; out.z = dz; return out;
}
const _hd = { x: 0, y: 0, z: 0 };
function heliGun(c) {
  const d = WEAPONS.hgun; if (P.fireT > 0 || P.dead) return; P.fireT = 60 / d.rpm; c.gs = -(c.gs || 1);
  const q = c.geo.guns; heliPoint(c, c.gs * q[0], q[1], q[2], _hm); aimFrom(c, _hm, _hd);
  const n = P.shots; shoot(P, _hm.x, _hm.y, _hm.z, _hd.x, _hd.y, _hd.z, d, d.spread, _hm.x, _hm.y, _hm.z); P.shots = n; P.hg = (P.hg | 0) + 1; P.shootT = .4; shake(.04);
}
function heliRocket(c) {
  if (P.dead || G.time < (c.rkT || 0) || (c.rk === undefined ? 8 : c.rk) < 1) return; c.rkT = G.time + .32; c.rk = (c.rk === undefined ? 8 : c.rk) - 1; c.ps = -(c.ps || 1);
  const q = c.geo.pods; heliPoint(c, c.ps * q[0], q[1], q[2], _hm); aimFrom(c, _hm, _hd);
  fireProj('hr', _hm.x + _hd.x * .6, _hm.y + _hd.y * .6, _hm.z + _hd.z * .6, _hd.x, _hd.y, _hd.z, P, false); FX.muzzle(_hm.x, _hm.y, _hm.z, 1.4); P.hr = (P.hr | 0) + 1; shake(.12);
}
// someone else's gunship firing: the same flash and tracer, or a ghost of the rocket, from where their guns are
function fxHeli(r, kind, n) {
  const c = r.car; if (!c || !c.spec || c.spec.air !== 'gun') return; const cp = Math.cos(r.pitch || 0), yaw = r.ayaw === undefined ? c.yaw : r.ayaw, dx0 = -Math.sin(yaw) * cp, dy0 = Math.sin(r.pitch || 0), dz0 = -Math.cos(yaw) * cp;
  for (let i = 0; i < Math.min(3, n); i++) { c.gs = -(c.gs || 1); const q = kind === 'gun' ? c.geo.guns : c.geo.pods; heliPoint(c, c.gs * q[0], q[1], q[2], _hm);
    if (kind === 'gun') { const t = Math.min(rayWorld(_hm.x, _hm.y, _hm.z, dx0, dy0, dz0, 's', 200), 200); if (t > 2) tracer(_hm.x, _hm.y, _hm.z, _hm.x + dx0 * t, _hm.y + dy0 * t, _hm.z + dz0 * t); FX.muzzle(_hm.x, _hm.y, _hm.z, 1); if (!i) SFX.shot(WEAPONS.hgun, _hm.x, _hm.y, _hm.z, false); }
    else fireProj('hr', _hm.x + dx0 * .6, _hm.y + dy0 * .6, _hm.z + dz0 * .6, dx0, dy0, dz0, r, true); }
}
/* --- the police helicopter: called in once someone has three stars. It comes in high over the roofs, circles where they were last
       seen thirty metres up with its side to them so the two marksmen in the doors can shoot, and lights them up after dark.
       It only knows what its crew can see, like any other unit. */
function spawnCopHeli(a) {
  if (cars.length >= CAR_MAX - 1) return null;
  const ang = rand() * TAU, x = clamp(a.lkx + Math.cos(ang) * 240, AIRSPACE.x0 + 20, AIRSPACE.x1 - 20), z = clamp(a.lkz + Math.sin(ang) * 240, AIRSPACE.z0 + 20, AIRSPACE.z1 - 20);
  const c = spawnCar('chopper', x, z, yawOf(a.lkx - x, a.lkz - z), { color: COP_PAINT, team: TEAM_COP }); if (!c) return null;
  c.y = 75; c.landed = false; c.rotor = 1; c.asleep = false; c.temp = true; c.hai = { chase: a, ang: rand() * TAU, side: rand() < .5 ? 1 : -1 }; c.horn = 1;
  [['fist', 0, 'Pilot'], ['marksman', 2, 'Air unit'], ['rifle', 3, 'Air unit']].forEach(q => { const b = spawnBot(TEAM_COP, x, 75, z, { temp: true, wpn: q[0], name: q[2] }); if (!b) return; b.car = c; b.seat = q[1]; c.occ[q[1]] = b; b.chase = a; b.unit = c; b.until = 1e9; b.skill = 1.05; b.onGround = true; });
  if (!c.occ[0]) { for (let k = 1; k < 4; k++) if (c.occ[k]) removeBot(c.occ[k]); removeCar(c); return null; }
  return c;
}
function heliBrain(c, dt) {
  const A = c.hai, a = A.chase, inp = c.inp, on = !!a && !a.gone && !a.dead && (a.heat | 0) >= 3 && G.cops;
  let tx, tz, ty, face;
  if (on) { const known = G.time - (a.seenT || -99) < 4, px = known ? a.x : a.lkx, pz = known ? a.z : a.lkz, py = known ? a.y : a.lky || 0;
    A.ang += dt * .2; tx = px + Math.cos(A.ang) * 30; tz = pz + Math.sin(A.ang) * 30; ty = Math.max(0, py) + 32; face = yawOf(px - c.x, pz - c.z) + PI / 2 * A.side; c.horn = 1; }
  else { if (!A.leave) { A.leave = true; const ang = rand() * TAU; A.lx = c.x + Math.cos(ang) * 700; A.lz = c.z + Math.sin(ang) * 700; } tx = A.lx; tz = A.lz; ty = 110; face = yawOf(tx - c.x, tz - c.z); c.horn = 0;
    if (nearHuman(c.x, c.z) > 380 || c.oob) { for (let k = 0; k < 4; k++) if (c.occ[k] && c.occ[k].kind === 'bot') removeBot(c.occ[k]); removeCar(c); return; } }
  let top = 0; for (let k = 0; k <= 3; k++) top = Math.max(top, groundAt(c.x + c.vx * k * .9, c.z + c.vz * k * .9, 300, 's', 0)); ty = Math.max(ty, top + 14);
  const dx = tx - c.x, dz = tz - c.z, d = hyp(dx, dz), sp = Math.min(on ? 26 : 34, d * .55), wvx = d > .1 ? dx / d * sp : 0, wvz = d > .1 ? dz / d * sp : 0;
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), ex = wvx - c.vx, ez = wvz - c.vz;
  inp.fwd = clamp((ex * fx + ez * fz) / 5, -1, 1); inp.side = clamp((ex * rx + ez * rz) / 5, -1, 1); inp.up = clamp((ty - c.y) / 6, -1, 1); inp.yaw = d > 70 ? yawOf(dx, dz) : face;
}
/* --- the airport on the machine that runs the world, four times a second: the gunship's guards come out while anyone is near,
       and a police helicopter is sent after anyone with three stars who has not already got one on them */
const AIRS = { guards: [], t: 0 };
function airTick() {
  const pad = AIRPORT.gun, home = G.homes.find(h => h.spot === pad), ship = home && home.car && !home.car.gone && !home.car.wreck ? home.car : null, onPad = !!ship && !ship.stolen && hyp(ship.x - pad.x, ship.z - pad.z) < 6, near = nearHuman(pad.x, pad.z);
  for (let i = AIRS.guards.length - 1; i >= 0; i--) { const b = AIRS.guards[i]; if (b.gone || b.dead) { AIRS.guards.splice(i, 1); continue; } if (near > 230 && !b.chase) { removeBot(b); AIRS.guards.splice(i, 1); } }
  if (onPad && near < 170 && AIRS.guards.length < AIRPORT.guards.length && G.time > AIRS.t && G.cops) { AIRS.t = G.time + 3;
    const s = AIRPORT.guards.find(q => !AIRS.guards.some(b => b.stay === q)); if (s && !seenByHuman(s.x, CURB, s.z)) { const b = spawnBot(TEAM_COP, s.x, CURB, s.z, { temp: true, wpn: 'rifle', name: 'Airport police' }); if (b) { b.stay = s; b.until = 1e9; b.skill = 1.15; b.hp = 140; b.yaw = s.yaw; AIRS.guards.push(b); } } }
  if (!G.cops) return;
  humans().forEach(a => { if ((a.heat | 0) < 3 || a.dead || G.time < (a.heliT || 0)) return; if (cars.some(c => c.hai && c.hai.chase === a && !c.wreck && !c.hai.leave)) return; a.heliT = G.time + (spawnCopHeli(a) ? 45 : 8); });
}
// --- jumping out up high: a parachute opens and lets you down gently, steering as you go
const chuteGeo = (() => { const b = new GeoBuf(), cols = [0xd23a2a, 0xf2efe6], seg = 10; for (let i = 0; i < seg; i++) { const g = new T.SphereGeometry(2.7, 2, 4, i / seg * TAU, TAU / seg, 0, PI * .32); g.scale(1, .55, 1.25); b.geo(g, null, hexCol(cols[i % 2])); g.dispose(); }
  [[-2.1, -1.1], [2.1, -1.1], [-2.1, 1.1], [2.1, 1.1]].forEach(q => { const len = hyp(q[0] * .9, 3.2, q[1] * 1.1), g = new T.CylinderGeometry(.012, .012, len, 3), v = new T.Vector3(q[0] * .9, 3.2, q[1] * 1.1).normalize(); b.geo(g, new T.Matrix4().compose(new T.Vector3(q[0] * .45, 1.6 + 1.6, q[1] * .55), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v), new T.Vector3(1, 1, 1)), hexCol(0x2a2c30)); g.dispose(); });
  return b.build(); })();
const chuteMat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
function chuteFor(a, on) { if (!on) { if (a.chm) a.chm.visible = false; return; } if (!a.chm) { a.chm = new T.Mesh(chuteGeo, chuteMat); a.chm.position.y = 0; scene.add(a.chm); } a.chm.visible = true; a.chm.position.set(a.x, a.y + 3.1, a.z); a.chm.rotation.y = a.yaw || 0; }
// --- the airport's own lights after dark: the runway's edges and ends, the taxiway, the pads, the floodlit apron, the tower's beacon
const airLights = (() => { const sets = { w: [], g: [], r: [], b: [], a: [], f: [] }, y = CURB + .4;
  for (let z = RWY.z0 + 4; z <= RWY.z1 - 4; z += 32) { sets.w.push(RWY.x0 - .6, y, z, RWY.x1 + .6, y, z); }
  for (let x = RWY.x0 + 2; x <= RWY.x1 - 2; x += 4.5) { sets.g.push(x, y, RWY.z0 - .5, x, y, RWY.z1 + .5); sets.r.push(x, y, RWY.z0 - 3, x, y, RWY.z1 + 3); }
  for (let z = 8; z <= 528; z += 40) sets.b.push(TAXI.x0 - .4, y, z, TAXI.x1 + .4, y, z);
  AIRPORT.pads.forEach(p => { for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; sets.a.push(p.x + Math.cos(a) * 8.6, y - .2, p.z + Math.sin(a) * 8.6); } });
  AIRPORT.masts.forEach(m => sets.f.push(m[0], m[1] - .7, m[2]));
  const mk = (arr, col, size) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); const p = new T.Points(g, new T.PointsMaterial({ map: glowTex, color: col, size, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); p.frustumCulled = false; scene.add(p); return p; };
  const out = [mk(sets.w, 0xfff4d8, 2.4), mk(sets.g, 0x46ff7a, 2.6), mk(sets.r, 0xff3a30, 2.6), mk(sets.b, 0x4a8cff, 2), mk(sets.a, 0xffc83d, 1.8), mk(sets.f, 0xffe2a8, 9)];
  const tb = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x46ff7a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); tb.scale.setScalar(7); tb.position.set(AIRPORT.tower.x, AIRPORT.tower.top + .4, AIRPORT.tower.z); scene.add(tb); out.tb = tb;
  return out; })();
// --- the airliner that comes in over the water from the south, lands, turns round at the far end, waits, and takes off again southbound
const JET = { y0: CURB + 3.3, td: RWY.z1 - 40, end: RWY.z0 + 26, cyc: 160 }, _jt = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, ground: false };
function jetAt(t, o) {
  const u = ((t % JET.cyc) + JET.cyc) % JET.cyc, X = RWY.cx; o.x = X; o.roll = 0;
  if (u < 30) { const z = JET.td + (30 - u) * 72; o.z = z; o.y = JET.y0 + (z - JET.td) * .055 + Math.max(0, 1 - (30 - u) / 3) * 0; o.yaw = 0; o.pitch = -.05; o.ground = false; o.lights = true; }   // final approach, heading north
  else if (u < 42) { const v = u - 30, s = 65 * v - 2.29 * v * v; o.z = JET.td - s; o.y = JET.y0; o.yaw = 0; o.pitch = 0; o.ground = true; o.lights = true; }                  // the landing roll
  else if (u < 56) { const v = (u - 42) / 14; o.z = JET.td - (65 * 12 - 2.29 * 144) - Math.sin(Math.min(1, v * 1.4) * PI / 2) * 8; o.y = JET.y0; o.yaw = Math.min(1, v * 1.15) * PI; o.pitch = 0; o.ground = true; o.lights = true; }   // turning round at the end
  else if (u < 72) { o.z = JET.td - (65 * 12 - 2.29 * 144) - 8; o.y = JET.y0; o.yaw = PI; o.pitch = 0; o.ground = true; o.lights = true; }                                   // holding
  else { const v = u - 72, z0 = JET.td - (65 * 12 - 2.29 * 144) - 8, air = Math.max(0, v - 13), s = v < 13 ? 2.6 * v * v : 439.4 + 67.6 * air + 1.2 * air * air; o.z = z0 + s; o.yaw = PI; o.ground = v < 13;
    o.y = JET.y0 + air * air * .9 + air * 4.5; o.pitch = -Math.min(.17, Math.max(0, v - 12) * .09); o.lights = true; }                                                       // the take-off roll and the climb out
  return o;
}
let airVisT = 0;
function airVisuals(dt) {
  const n = clamp((ENV.night - .2) * 2.2, 0, 1); airLights.forEach((p, i) => { p.material.opacity = n * (i === 5 ? .8 : 1); });
  airLights.tb.material.opacity = (G.time * .55) % 1 < .5 ? .3 + n * .7 : 0; airLights.tb.material.color.setHex((G.time * .55) % 2 < 1 ? 0x46ff7a : 0xfff4d8);
  chuteFor(P, !!P.chute && !P.dead && !P.car); for (const k in NET.remotes) { const r = NET.remotes[k]; chuteFor(r, !!r.chute && !r.dead && !r.car); }
}
