/* =====================================================================
   11e. THE CITY GOING ABOUT ITS DAY — what the people and traffic do around you, on top of 97-life.js and 109-street.js.
        · At a signalled crossing people wait at the kerb for the walk signal (unless they are running from something).
        · Shops have customers: people step out of shop doors, and others walk up to a shop and go in.
        · Ambulances: when someone is shot or run down in the street, one comes with its lights and siren, pulls up near them,
          takes them away and drives off. (The machine that runs the world sends them; everyone sees the same ambulance.)
        · The sound of the place: a traffic bed that swells with the cars around you, wind that rises with the weather and with
          height, sirens far off at night, and all of it muffled when there is a roof over your head.
   ===================================================================== */
// --- the walk signal: is the stretch of zebra from node a to node m shut right now?
function walkWait(a, m) {
  const dx = m.x - a.x, dz = m.z - a.z, L = hyp(dx, dz); if (L < 10 || L > 22) return false;   // one carriageway across
  const mx = (a.x + m.x) / 2, mz = (a.z + m.z) / 2, S = SIG_AT[Math.round((mx - EDGE) / PX) + Math.round((mz - EDGE) / PZ) * 16]; if (!S || hyp(mx - S.x, mz - S.z) > 13) return false;
  return signalPhase(S, Math.abs(dx) > Math.abs(dz) ? 1 : 0, sigClock()) !== 0;   // walking along x crosses the north-south road: go on the east-west green
}
// --- shops: who goes in, who comes out
const shopHours = () => G.tod > 7.5 && G.tod < 21.5;
const doorOf = F => ({ x: F.x - FACE[F.face][0] * 1.55, z: F.z - FACE[F.face][1] * 1.55, yaw: yawOf(FACE[F.face][0], FACE[F.face][1]) });
function frontNear(x, z, r0, r1) { const L = FRONTS.filter(F => { if (!F.face) return false; const d = hyp(F.x - x, F.z - z); return d > r0 && d < r1; }); return L.length ? L[(rand() * L.length) | 0] : null; }
function shopOut(hs) {   // someone steps out of a shop near a player (seen or not: coming out of a door is how people appear)
  const h = hs[(rand() * hs.length) | 0], F = frontNear(h.x, h.z, 14, 70); if (!F || cars.some(c => hyp(c.x - F.x, c.z - F.z) < 2.5)) return null; const d = doorOf(F);
  const b = spawnBot(TEAM_CIV, d.x, CURB, d.z, {}); if (!b) return null; b.yaw = d.yaw; b.idleT = .6 + rand() * 1.2; return b;
}
function shopIn(b) {   // a walk to a shop near them, to go in (civBrain asks)
  const F = frontNear(b.x, b.z, 4, 60); if (!F) return false; const path = navPath(nearestNode(b.x, b.y, b.z, true), nearestNode(F.x, CURB, F.z, false), true); if (!path) return false;
  b.path = path; b.pi = 0; b.shopIn = F; b.shopT = G.time + 70; return true;
}
function shopInStep(b, dt) {   // the last few steps to the door; then they are gone (populate takes them away)
  const d = doorOf(b.shopIn), r = botWalk(b, d.x, d.z, b.walk, dt); if (b.spd > .3) b.yaw = lerpAng(b.yaw, yawOf(b.vx, b.vz), Math.min(1, dt * 8));
  if (r < .5 || G.time > b.shopT) b.vanish = true;
}
// --- ambulances
const AMB_PAINT = 0xf3f1ea, EMS = { list: [], t: 0 };
function emsDress(c) {
  const S = c.spec, ge = c.geo, B = S.body, zm = (ge.zf + ge.zr) / 2 + .1, red = new T.MeshLambertMaterial({ color: 0xb3261e });
  const band = new T.Mesh(new T.BoxGeometry(S.wid + .02, .14, Math.max(1, S.len - .6)), red); band.position.set(0, B.belt - .12, 0); c.body.add(band);
  const base = new T.Mesh(copBaseGeo, carTrimMat); base.position.set(0, B.roof + .06, zm); c.body.add(base);
  c.lb = [0, 1].map(k => { const m = new T.Mesh(copBarGeo, new T.MeshBasicMaterial({ color: k ? 0x4d4d4d : 0x4d1313 })); m.position.set(k ? .26 : -.26, B.roof + .14, zm); c.body.add(m); const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: k ? 0xffffff : 0xff3030, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    s.scale.setScalar(2.6); s.position.set(m.position.x, m.position.y + .12, zm); s.visible = false; c.body.add(s); return { m, s }; });
  c.ems = true; c.lph = -1;
}
function emsLights(c) { const ph = c.horn && !c.wreck ? Math.floor(G.time * 6 + c.id * .5) % 2 : -1; if (c.lph === ph) return; c.lph = ph; c.lb.forEach((L, k) => { const on = ph === k; L.m.material.color.setHex(on ? (k ? 0xffffff : 0xff4a4a) : (k ? 0x4d4d4d : 0x4d1313)); L.s.visible = on; }); }
// on the machine that runs the world: someone down in the street, a player near: send one (one at a time), and see it through
function emsTick(dt) {
  EMS.t -= dt; if (EMS.t <= 0) { EMS.t = 2;
    if (!EMS.list.length) { const v = bots.find(b => b.dead && b.team === TEAM_CIV && !b.car && !b.emsDone && b.deadT > 2 && b.deadT < 6 && nearHuman(b.x, b.z) < 140); if (v) emsSend(v); } }
  for (let i = EMS.list.length - 1; i >= 0; i--) { const E = EMS.list[i], c = E.car; if (!c || c.gone || c.wreck) { if (E.v) E.v.emsHold = false; EMS.list.splice(i, 1); continue; } const A = c.ai;
    if (E.leg === 0) { c.horn = 1; const dv = hyp(c.x - E.v.x, c.z - E.v.z);
      if (E.ph === 0 && A && (A.done || hyp(c.x - RX(E.c1[0]), c.z - RZ(E.c1[1])) < 16)) { E.ph = 1; aiStart(c, 'ems', E.c2); c.ai.cruise = 12; }   // at the end of their street: now down it
      if (!A || !c.occ[0]) { E.leg = 2; continue; }   // lost its driver: it is no use to anyone
      if (dv < 20 || (E.ph === 1 && c.ai && c.ai.done) || G.time > E.give) { E.leg = 1; E.t = G.time + 7; c.horn = 0; c.inp.thr = 0; c.inp.hb = true; if (c.ai) c.ai.wait = 99; } }   // there (or near as it can get)
    else if (E.leg === 1) { c.inp.hb = true; if (G.time > E.t) { E.v.emsHold = false; E.v.deadT = 99; E.leg = 2; const far = [E.v.x < CITY.w / 2 ? NX : 0, E.v.z < CITY.d / 2 ? NZ : 0]; const B = c.occ[0]; if (B) { aiStart(c, 'ems', far); c.ai.cruise = 13; } } }   // taken away
    else if (E.leg === 2 && (nearHuman(c.x, c.z) > 220 || (c.ai && c.ai.done))) { const B = c.occ[0]; if (B) removeBot(B); removeCar(c); EMS.list.splice(i, 1); } }
}
function emsSend(v) {
  const hs = humans(); let best = null, bd = 1e9;
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const x = RX(i), z = RZ(j), d = hyp(x - v.x, z - v.z), nh = nearHuman(x, z); if (d < 150 || d > 330 || nh < 95) continue; if (d < bd) { bd = d; best = [i, j]; } }
  if (!best) return; const [i, j] = best, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(q => i + q[0] >= 0 && i + q[0] <= NX && j + q[1] >= 0 && j + q[1] <= NZ), q = dirs[(rand() * dirs.length) | 0];
  lanePoint([i, j], [i + q[0], j + q[1]], 16, LANE, _lp); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 9)) return;
  const c = spawnCar('van', _lp.x, _lp.z, yawOf(q[0], q[1]), { color: AMB_PAINT }); if (!c) return; const b = spawnBot(TEAM_CIV, _lp.x, 0, _lp.z, {}); if (!b) { removeCar(c); return; }
  // the street they are lying on: its two crossings; drive to the nearer end, then down the street to them
  const ci = clamp(Math.round((v.x - EDGE) / PX), 0, NX), cj = clamp(Math.round((v.z - EDGE) / PZ), 0, NZ), alongNS = Math.abs(v.x - RX(ci)) < Math.abs(v.z - RZ(cj));
  const ends = alongNS ? [[ci, clamp(Math.floor((v.z - EDGE) / PZ), 0, NZ - 1)], [ci, clamp(Math.floor((v.z - EDGE) / PZ), 0, NZ - 1) + 1]] : [[clamp(Math.floor((v.x - EDGE) / PX), 0, NX - 1), cj], [clamp(Math.floor((v.x - EDGE) / PX), 0, NX - 1) + 1, cj]];
  const near0 = hyp(RX(ends[0][0]) - c.x, RZ(ends[0][1]) - c.z) < hyp(RX(ends[1][0]) - c.x, RZ(ends[1][1]) - c.z), c1 = near0 ? ends[0] : ends[1], c2 = near0 ? ends[1] : ends[0];
  b.car = c; b.seat = 0; c.occ[0] = b; b.ems = true; aiStart(c, 'ems', c1); c.ai.cruise = 19; c.horn = 1; v.emsHold = true; v.emsDone = true; EMS.list.push({ car: c, v, leg: 0, t: 0, ph: 0, c1, c2, give: G.time + 120 });
}
// --- the sound of the place
const CITYSND = { wind: null, windF: null, bedG: null, bedF: null, sirT: 40, in: 0 };
function citySound(dt) {
  if (!AC || !CITYSND.bedG) return; const t = AC.currentTime, ex = camera.position.x, ey = camera.position.y, ez = camera.position.z;
  // a roof overhead (the mall, a shelter, a bus): what is outside comes through muffled
  const roof = groundAt(ex, ez, ey + 14, 'p') > ey + .5; CITYSND.in = lerp(CITYSND.in, roof ? 1 : 0, Math.min(1, dt * 3));
  let n = 0; for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c.spec.air || c.wreck) continue; const d = hyp(c.x - ex, c.z - ez); if (d < 110) n += Math.min(1, carSpeed(c) / 8) * (1 - d / 110); }
  CITYSND.bedG.gain.setTargetAtTime(G.state === 'menu' ? .03 : .028 + Math.min(.06, n * .012), t, .6); CITYSND.bedF.frequency.setTargetAtTime(lerp(260, 140, CITYSND.in), t, .3);
  const w = (WX.wind * .05 + Math.max(0, ey - 12) * .0012) * (1 - CITYSND.in * .7) * (G.state === 'menu' ? .3 : 1); CITYSND.windG.gain.setTargetAtTime(w * (.7 + .3 * Math.sin(t * .37) * Math.sin(t * .13)), t, .4); CITYSND.windF.frequency.setTargetAtTime(500 + 300 * Math.sin(t * .21), t, .5);
  if (RAINS.f) RAINS.f.frequency.setTargetAtTime(lerp(P.car && !P.car.spec.air ? 900 : 2400, 700, CITYSND.in), t, .3);
  // far sirens after dark, now and then
  if (ENV.night > .5 && G.state !== 'menu') { CITYSND.sirT -= dt; if (CITYSND.sirT <= 0) { CITYSND.sirT = 50 + rand() * 90; const pan = rand() * 2 - 1, d = .6 + rand() * 1.8; for (let k = 0; k < 6; k++) sTone(640, 1080, .45, .012 * (1 - CITYSND.in * .6), 'sawtooth', t + d + k * .9, out(pan)), sTone(1080, 640, .45, .012 * (1 - CITYSND.in * .6), 'sawtooth', t + d + k * .9 + .45, out(pan)); } }
}
function citySoundInit() {
  if (!AC || CITYSND.bedG) return;
  const w = AC.createBufferSource(); w.buffer = noiseBuf; w.loop = true; CITYSND.windF = AC.createBiquadFilter(); CITYSND.windF.type = 'bandpass'; CITYSND.windF.frequency.value = 600; CITYSND.windF.Q.value = .6; CITYSND.windG = AC.createGain(); CITYSND.windG.gain.value = 0;
  w.connect(CITYSND.windF); CITYSND.windF.connect(CITYSND.windG); CITYSND.windG.connect(master); w.start();
  const bd = AC.createBufferSource(); bd.buffer = noiseBuf; bd.loop = true; CITYSND.bedF = AC.createBiquadFilter(); CITYSND.bedF.type = 'lowpass'; CITYSND.bedF.frequency.value = 240; CITYSND.bedG = AC.createGain(); CITYSND.bedG.gain.value = .03;
  bd.connect(CITYSND.bedF); CITYSND.bedF.connect(CITYSND.bedG); CITYSND.bedG.connect(master); bd.start(rand() * .5);
}
