/* =====================================================================
   10c. THE REST OF THE CITY — everything that is there only to be seen and heard: pigeons and gulls, steam from the street,
        smoke from the stacks, boats on the lake, a plane, the ball on each court, what people say as you pass, the murmur
        of a crowd, music from a speaker. None of it changes the game and none of it is sent between players: each machine
        makes its own from the people and places it can see.
   ===================================================================== */
const LIFE = { frame: 0, vol: 0, bangT: -99, bangX: 0, bangZ: 0, bangR: 0, said: {}, sayT: 0, spk: null, steamT: 0, stackN: 0, hornT: 0, ambT: 0, dogT: 14, birdT: 3, gullT: 8, crkT: 0, crowd: 0, barkT: 0, au: null,
  bang(x, z, r) { LIFE.bangT = G.time; LIFE.bangX = x; LIFE.bangZ = z; LIFE.bangR = r || 40; },                                     // a shot or a blast: every bird in earshot goes up
  reset() { flocks.forEach(f => { f.mode = 0; f.t = 0; f.birds.forEach(b => { b.x = b.tx = b.hx; b.y = b.hy; b.z = b.tz = b.hz; b.wait = rand() * 3; }); }); barks.forEach(k => { k.t = 0; k.who = null; k.sp.visible = false; }); LIFE.said = {}; LIFE.bangT = -99; LIFE.sayT = 0; },
};

// --- birds: a few pigeons wherever people sit and eat, gulls over the water. One instanced body and one instanced pair of wings.
const BIRD_MAX = 170, birdMat = new T.MeshLambertMaterial({ color: 0xffffff }), _bd = new T.Object3D(), _bc = new T.Color();
const birdBody = new T.InstancedMesh((() => { const b = new GeoBuf(); b.box(-.05, .05, 0, .1, -.1, .1); b.box(-.03, .03, .07, .15, .08, .16); b.box(-.03, .03, .03, .06, -.2, -.1); return b.build(); })(), birdMat, BIRD_MAX);
const birdWing = new T.InstancedMesh(new T.BoxGeometry(.64, .014, .13), birdMat, BIRD_MAX);
[birdBody, birdWing].forEach(m => { m.frustumCulled = false; m.castShadow = false; for (let i = 0; i < BIRD_MAX; i++) { m.setMatrixAt(i, ZERO_M); m.setColorAt(i, _bc.setHex(0x80868f)); } scene.add(m); });
const flocks = []; let birdN = 0;
function addFlock(x, z, n, gull) {
  const f = { x, z, gull, mode: 0, t: 0, dur: 0, chk: rand() * .2, shown: false, birds: [] }, r = rng32((Math.round(x * 13 + z * 7) + n) | 0);
  for (let k = 0; k < n && birdN < BIRD_MAX; k++) { const a = r() * TAU, d = .4 + r() * 2.3; let hx = x + Math.cos(a) * d, hz = z + Math.sin(a) * d;
    if (!gull && pushOut(hx, hz, .2, CURB + .7, CURB + 1.4, 'p')) { hx = COL.x; hz = COL.z; }
    const hy = gull ? 0 : Math.max(CURB, groundAt(hx, hz, CURB + .3, 'p')), shade = gull ? pick(r, [0xf2efe6, 0xe6e3dc]) : pick(r, [0x7b828c, 0x8d939c, 0x666c75, 0x9a958c, 0x5a5f68]);
    birdBody.setColorAt(birdN, _bc.setHex(shade)); birdWing.setColorAt(birdN, _bc.setHex(gull ? 0xcfd2d6 : shade).multiplyScalar(gull ? 1 : .82));
    f.birds.push({ i: birdN++, hx, hy, hz, x: hx, y: hy, z: hz, yaw: r() * TAU, tx: hx, tz: hz, wait: r() * 3, ph: r() * 6, oa: r() * TAU, or: gull ? 10 + r() * 24 : 6, ow: (gull ? .15 + r() * .1 : 1.2) * (r() < .5 ? -1 : 1), oh: gull ? 15 + r() * 20 : 10, lag: 0, sx: hx, sy: hy, sz: hz }); }
  flocks.push(f);
}
ROOSTS.forEach((q, k) => addFlock(q[0], q[1], 5 + k % 4, false));
{ const e = ZONES.find(z => z.id === 'E'); addFlock(CITY.w + 4, e ? e.z : 300, 6, true); addFlock(CITY.w + 28, 110, 5, true); addFlock(CITY.w * .62, CITY.d + 24, 5, true); }
birdBody.instanceColor.needsUpdate = birdWing.instanceColor.needsUpdate = true;
// what sends pigeons up: a bang, someone running through them, a car coming past
function birdScare(f) {
  if (G.time - LIFE.bangT < .5 && hyp(LIFE.bangX - f.x, LIFE.bangZ - f.z) < LIFE.bangR) return true;
  let hit = false;
  eachActor(a => { if (hit || a.dead || a.gone || a.car || a.act === ACT.sit) return; const d = hyp(a.x - f.x, a.z - f.z), sp = a.spd || 0; if ((d < 2 && sp > .6) || (d < 6 && sp > 2.6)) hit = true; });
  for (let i = 0; i < cars.length && !hit; i++) { const c = cars[i]; if (hyp(c.x - f.x, c.z - f.z) < 8 && carSpeed(c) > 2.5) hit = true; }
  return hit;
}
const ease = k => k * k * (3 - 2 * k);
function birdPut(b, x, y, z, yaw, pitch, flap, scale) {   // flap: -1..1 while flying, null on the ground
  _bd.position.set(x, y, z); _bd.rotation.set(pitch, yaw, 0, 'YXZ'); _bd.scale.setScalar(scale); _bd.updateMatrix(); birdBody.setMatrixAt(b.i, _bd.matrix);
  if (flap === null) { birdWing.setMatrixAt(b.i, ZERO_M); return; }
  _bd.position.y = y + (.085 + flap * .035) * scale; _bd.scale.set(scale * (.55 + .45 * Math.abs(flap)), scale, scale); _bd.updateMatrix(); birdWing.setMatrixAt(b.i, _bd.matrix);
}
function updateBirds(dt) {
  const cx = camera.position.x, cz = camera.position.z, night = ENV.night > .75, now = G.time; let any = false;
  for (let fi = 0; fi < flocks.length; fi++) { const f = flocks[fi], d = hyp(f.x - cx, f.z - cz), show = d < (f.gull ? 430 : 150) && !(f.gull && night);
    if (!show) { if (f.shown) { f.shown = false; any = true; f.birds.forEach(b => { birdBody.setMatrixAt(b.i, ZERO_M); birdWing.setMatrixAt(b.i, ZERO_M); }); } continue; }
    f.shown = true; any = true;
    if (!f.gull) {
      f.chk -= dt; if (f.chk <= 0) { f.chk = .15;
        if (f.mode !== 1 && birdScare(f)) { f.mode = 1; f.t = 0; f.dur = 9 + rand() * 7; if (d < 40) SFXL.flutter(f.x, f.z); f.birds.forEach(b => { b.sx = b.x; b.sy = b.y; b.sz = b.z; b.oa = Math.atan2(b.z - f.z, b.x - f.x); b.or = 4 + rand() * 7; b.ow = (1 + rand() * .7) * (rand() < .5 ? -1 : 1); b.oh = 8 + rand() * 9; b.lag = rand() * .45; }); }
        else if (f.mode === 1 && f.t > f.dur - 2.5 && birdScare(f)) f.dur = f.t + 4; }                                               // whatever scared them is still there: stay up
      if (f.mode === 1) { f.t += dt; if (f.t > f.dur) { f.mode = 2; f.t = 0; f.birds.forEach(b => { b.sx = b.x; b.sy = b.y; b.sz = b.z; }); } }
      else if (f.mode === 2) { f.t += dt; if (f.t > 2.8) { f.mode = 0; f.birds.forEach(b => { b.tx = b.x = b.hx; b.tz = b.z = b.hz; b.y = b.hy; b.wait = rand() * 2; }); } }
    }
    for (let k = 0; k < f.birds.length; k++) { const b = f.birds[k];
      if (f.gull) { b.oa += b.ow * dt; const x = f.x + Math.cos(b.oa) * b.or, z = f.z + Math.sin(b.oa) * b.or * .7, s = Math.sign(b.ow), fl = Math.sin(now * 2.6 + b.ph);
        birdPut(b, x, b.oh + Math.sin(now * .31 + b.ph) * 2.5, z, Math.atan2(-Math.sin(b.oa) * s, Math.cos(b.oa) * s * .7), 0, fl > .2 ? Math.sin(now * 7 + b.ph) : .9, 2.1); continue; }
      if (f.mode === 0) {   // on the ground: a few steps, a peck, a few more steps
        if (b.wait > 0) { b.wait -= dt; if (b.wait <= 0) { const a = rand() * TAU, r = rand() * 1.7; b.tx = b.hx + Math.cos(a) * r; b.tz = b.hz + Math.sin(a) * r; } birdPut(b, b.x, b.y, b.z, b.yaw, Math.max(0, Math.sin(now * 5 + b.ph)) * .7, null, 1); }
        else { const dx = b.tx - b.x, dz = b.tz - b.z, l = hyp(dx, dz); if (l < .06) b.wait = .5 + rand() * 3.5; else { b.x += dx / l * .55 * dt; b.z += dz / l * .55 * dt; b.yaw = Math.atan2(dx, dz); } birdPut(b, b.x, b.y + Math.abs(Math.sin(now * 15 + b.ph)) * .025, b.z, b.yaw, 0, null, 1); }
      } else if (f.mode === 1) {   // up and round
        b.oa += b.ow * dt; const k1 = ease(clamp((f.t - b.lag) / 1.7, 0, 1)), ox = f.x + Math.cos(b.oa) * b.or, oz = f.z + Math.sin(b.oa) * b.or, s = Math.sign(b.ow);
        const nx = lerp(b.sx, ox, k1), ny = lerp(b.sy, b.oh + Math.sin(now * .9 + b.ph), k1), nz = lerp(b.sz, oz, k1); if (hyp(nx - b.x, nz - b.z) > .001) b.yaw = Math.atan2(nx - b.x, nz - b.z); b.x = nx; b.y = ny; b.z = nz;
        birdPut(b, b.x, b.y, b.z, k1 > .9 ? Math.atan2(-Math.sin(b.oa) * s, Math.cos(b.oa) * s) : b.yaw, -.35 * (1 - k1), Math.sin(now * 19 + b.ph), 1);
      } else {   // coming back down
        const k2 = ease(clamp(f.t / 2.6, 0, 1)), nx = lerp(b.sx, b.hx, k2), nz = lerp(b.sz, b.hz, k2); if (hyp(nx - b.x, nz - b.z) > .001) b.yaw = Math.atan2(nx - b.x, nz - b.z); b.x = nx; b.z = nz; b.y = lerp(b.sy, b.hy, k2);
        birdPut(b, b.x, b.y, b.z, b.yaw, .3 * k2 * (1 - k2), k2 < .97 ? Math.sin(now * 19 + b.ph) : null, 1); }
    }
  }
  if (any) { birdBody.instanceMatrix.needsUpdate = true; birdWing.instanceMatrix.needsUpdate = true; }
}

// --- steam from the street, smoke from the stacks, a wisp from each food cart, the odd puff from someone smoking
function updateSmoke(dt) {
  LIFE.steamT -= dt; if (LIFE.steamT > 0) return; LIFE.steamT = .22;
  const cx = camera.position.x, cz = camera.position.z, a = .3 + ENV.night * .08;
  for (let i = 0; i < VENTS.length; i++) { const v = VENTS[i]; if (hyp(v[0] - cx, v[1] - cz) < 90 && rand() < .75) spawnP(PS, v[0] + rs(.4), .08, v[1] + rs(.4), .25 + rs(.3), .6 + rand() * .5, .1 + rs(.3), 2.6 + rand() * 1.4, .45, 2.6, .86, .88, .9, a, -.1, .2); }
  for (let i = 0; i < GRILLS.length; i++) { const v = GRILLS[i]; if (hyp(v[0] - cx, v[1] - cz) < 45 && rand() < .5) spawnP(PS, v[0] + rs(.3), CURB + 1.3, v[1] + rs(.3), .2 + rs(.2), .5 + rand() * .3, rs(.2), 1.3 + rand() * .8, .18, .9, .9, .9, .88, .24, -.1, .3); }
  if ((LIFE.stackN = (LIFE.stackN + 1) % 2) === 0) for (let i = 0; i < STACKS.length; i++) { const s = STACKS[i]; if (hyp(s[0] - cx, s[2] - cz) < 480) spawnP(PS, s[0] + rs(.5), s[1], s[2] + rs(.5), 1.1 + rs(.5), 1.5 + rand() * .8, .45 + rs(.4), 8 + rand() * 4, 2.6, 12, .27, .26, .25, .46, -.04, .06); }
  for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.act === ACT.smoke && !b.dead && rand() < .06 && hyp(b.x - cx, b.z - cz) < 30) spawnP(PS, b.x - Math.sin(b.yaw) * .3, b.y + 1.62, b.z - Math.cos(b.yaw) * .3, rs(.15), .25 + rand() * .2, rs(.15), 1.5, .08, .5, .8, .8, .8, .22, -.05, .5); }
}

// --- out on the lake and overhead: a freighter, two small boats, a plane. They only ever pass by.
const boats = [];
function boatMesh(build, o) { const b = new GeoBuf(); build(b); const m = new T.Mesh(b.build(), lam({})); m.castShadow = false; m.receiveShadow = false; const lt = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: o.light || 0xffe2a0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); lt.scale.setScalar(o.ls || 4); lt.position.set(0, o.lh, o.lz || 0); m.add(lt); scene.add(m); boats.push(Object.assign({ m, lt }, o)); }
boatMesh(b => { const hull = hexCol(0x2b3038), red = hexCol(0x7a2a22), wh = hexCol(0xe4e0d6); b.box(-7, 7, -1.5, 4.2, -44, 44, hull); b.box(-7.05, 7.05, -1.5, .5, -44.05, 44.05, red); b.box(-5, 5, 4.2, 5.2, 44, 50, hull); b.box(-6.4, 6.4, 4.2, 15, -42, -30, wh); b.box(-2, 2, 15, 19, -39, -34, hexCol(0x33373d)); b.box(-6.8, 6.8, 13.4, 14.2, -30, -28.6, hexCol(0x33373d));
  const cols = [0xa3221b, 0x15467a, 0x1d5c3a, 0xd9a521, 0x8a9096, 0xc85a1c], r = rng32(51); for (let z = -24; z < 40; z += 6.6) for (let x = -5.4; x < 4; x += 2.75) { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) b.box(x, x + 2.5, 4.2 + k * 2.6, 6.7 + k * 2.6, z, z + 6.1, hexCol(pick(r, cols))); } },
  { ax: 'z', at: CITY.w + 300, lo: -700, hi: CITY.d + 700, sp: 2.6, ph: 0, lh: 20, lz: -36, ls: 9 });
const smallBoat = col => b => { const wh = hexCol(0xece8dc); b.box(-1.7, 1.7, -.6, 1, -5.4, 5.4, wh); b.box(-1.74, 1.74, .55, .85, -5.44, 5.44, hexCol(col)); b.box(-1.1, 1.1, 1, 1.6, 5.4, 7.2, wh); b.box(-1.25, 1.25, 1, 2.7, -2.6, 1.2, wh); b.box(-1.28, 1.28, 1.8, 2.3, -2.3, 1.22, hexCol(0x1f2a33)); b.box(-.05, .05, 2.7, 4.6, -.6, -.5, hexCol(0x8a9096)); };
boatMesh(smallBoat(0x15467a), { ax: 'z', at: CITY.w + 96, lo: -120, hi: CITY.d + 260, sp: 5.5, ph: 190, lh: 4.7, lz: -.55, ls: 3 });
boatMesh(smallBoat(0xa3221b), { ax: 'x', at: CITY.d + 84, lo: -40, hi: CITY.w + 300, sp: -4.4, ph: 330, lh: 4.7, lz: -.55, ls: 3 });
const plane = new T.Group(); { const b = new GeoBuf(), c = hexCol(0xdfe3e8); b.box(-1.9, 1.9, -1.9, 1.9, -19, 19, c); b.box(-21, 21, -.4, .2, -4, 3, c); b.box(-7, 7, 0, .4, -18.5, -15, c); b.box(-.3, .3, 0, 6.5, -19, -14.5, hexCol(0x15467a));
  const m = new T.Mesh(b.build(), new T.MeshLambertMaterial({ vertexColors: true, fog: false })); m.castShadow = false; plane.add(m);
  [[-21, 0xff3a30], [21, 0x38ff6a], [0, 0xffffff]].forEach((q, k) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: q[1], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); s.scale.setScalar(k === 2 ? 26 : 16); s.position.set(q[0], k === 2 ? -2.2 : 0, k === 2 ? 0 : -.5); plane.add(s); }); plane.visible = false; scene.add(plane); }
function updateTraffic3(dt) {
  const t = G.time, glow = clamp((ENV.night - .25) * 2.5, 0, 1);
  for (let i = 0; i < boats.length; i++) { const B = boats[i], span = B.hi - B.lo, u = (((t + B.ph) * Math.abs(B.sp)) % span + span) % span, p = B.sp > 0 ? B.lo + u : B.hi - u, bob = Math.sin(t * .8 + i * 2) * (B.ls > 5 ? .12 : .2);
    if (B.ax === 'z') { B.m.position.set(B.at, -1.2 + bob, p); B.m.rotation.set(Math.sin(t * .6 + i) * .012, B.sp > 0 ? 0 : PI, Math.sin(t * .5 + i) * (B.ls > 5 ? .008 : .04)); }
    else { B.m.position.set(p, -1.2 + bob, B.at); B.m.rotation.set(Math.sin(t * .6 + i) * .012, B.sp > 0 ? PI / 2 : -PI / 2, Math.sin(t * .5 + i) * .04); }
    B.lt.material.opacity = glow * .9; }
  // one airliner every couple of minutes, west to east and a little north
  const cyc = 150, u = (t % cyc) / 46; plane.visible = u < 1;
  if (plane.visible) { plane.position.set(lerp(-1500, CITY.w + 1500, u), 330, lerp(CITY.d * .9, -260, u)); plane.rotation.y = Math.atan2(CITY.w + 3000, -(CITY.d * .9 + 260)); const bl = (t * 1.1) % 1 < .12 ? 1 : 0; plane.children[1].material.opacity = plane.children[2].material.opacity = glow; plane.children[3].material.opacity = bl * (.35 + glow * .65); }
}

// --- the ball on each court: dribbled by whoever is up, put up at the rim, collected by the next. Also the box someone at work is carrying.
const HOOPS = SPOTS.filter(p => p.k === 'hoop').map(p => ({ p, m: null, pl: [], chk: 0, bx: 0, by: 0, bz: 0, sh: null, bounceT: 0, swish: false }));
{ const g = new T.SphereGeometry(.125, 10, 8), mat = new T.MeshLambertMaterial({ color: 0xd9722a }); HOOPS.forEach(h => { h.m = new T.Mesh(g, mat); h.m.castShadow = true; h.bx = h.p.x + h.p.dir * 3; h.by = CURB + .125; h.bz = h.p.z + 1.4; h.m.position.set(h.bx, h.by, h.bz); scene.add(h.m); }); }
const SHOT_T = 4.4, RIM_Y = CURB + 3.05;
// runs before people are drawn: tells each shooter how far up their arms are
function lifePoses(dt) {
  for (let i = 0; i < HOOPS.length; i++) { const h = HOOPS[i], p = h.p; h.chk -= dt;
    if (h.chk <= 0) { h.chk = .4; h.pl.length = 0; for (let k = 0; k < bots.length; k++) { const b = bots[k]; if (b.act === ACT.ball && !b.dead && hyp(b.x - p.x, b.z - p.z) < 9) h.pl.push(b); } h.pl.sort((a, b) => a.id - b.id); }
    for (let k = 0; k < h.pl.length; k++) h.pl[k].shootK = 0;
    h.sh = null; if (!h.pl.length) continue;
    const u = ((G.time + i * 1.3) % SHOT_T) / SHOT_T, sh = h.pl[Math.floor((G.time + i * 1.3) / SHOT_T) % h.pl.length]; if (sh.gone || sh.act !== ACT.ball) continue;
    h.sh = sh; h.u = u; sh.shootK = u < .46 ? 0 : u < .58 ? ease((u - .46) / .12) : u < .7 ? 1 - ease((u - .58) / .12) * .6 : Math.max(0, .4 - (u - .7) * 4); }
}
const crateMesh = new T.InstancedMesh(new T.BoxGeometry(.44, .3, .34), new T.MeshLambertMaterial({ color: 0x9a7a4f }), 8); crateMesh.frustumCulled = false; crateMesh.castShadow = true; for (let i = 0; i < 8; i++) crateMesh.setMatrixAt(i, ZERO_M); scene.add(crateMesh);
function updateProps3(dt) {
  const cx = camera.position.x, cz = camera.position.z;
  for (let i = 0; i < HOOPS.length; i++) { const h = HOOPS[i], p = h.p, near = hyp(p.x - cx, p.z - cz); h.m.visible = near < 130; if (!h.m.visible) continue;
    const sh = h.sh; let x = h.bx, y = h.by, z = h.bz;
    if (sh) { const u = h.u, fx = -Math.sin(sh.yaw), fz = -Math.cos(sh.yaw), rx = Math.cos(sh.yaw), rz = -Math.sin(sh.yaw), hx = sh.x + fx * .32, hz = sh.z + fz * .32;
      if (u < .46) { const ph = (G.time * 3.05) % 1, bn = Math.abs(Math.cos(ph * PI)); x = hx + rx * .26; z = hz + rz * .26; y = sh.y + .125 + bn * .72; if (ph < .08 && G.time - h.bounceT > .2) { h.bounceT = G.time; if (near < 34) SFXL.bounce(x, z); } h.swish = false; }
      else if (u < .58) { const k = ease((u - .46) / .12); x = hx + rx * .26 * (1 - k); z = hz + rz * .26 * (1 - k); y = sh.y + lerp(.85, 2.25, k); }
      else if (u < .8) { const k = (u - .58) / .22, sx = hx, sy = sh.y + 2.25, sz = hz; x = lerp(sx, p.x, k); z = lerp(sz, p.z, k); y = lerp(sy, RIM_Y, k) + Math.sin(k * PI) * 1.9; }
      else { const k = (u - .8) / .2, dy = RIM_Y - CURB - .125, fall = Math.min(1, k * 2.2); x = p.x + p.dir * k * 1.6; z = p.z + Math.sin(i * 7 + Math.floor(G.time / SHOT_T)) * k * 1.2; y = fall < 1 ? RIM_Y - dy * fall * fall : CURB + .125 + Math.abs(Math.sin((k * 2.2 - 1) * PI * 1.5)) * .5 * (1 - k); if (!h.swish) { h.swish = true; if (near < 34) SFXL.swish(p.x, p.z); } }
      h.bx = x; h.by = y; h.bz = z; }
    else { h.by = Math.max(CURB + .125, h.by - dt * 6); y = h.by; }                                                               // nobody playing: it lies where it fell
    h.m.position.set(x, y, z); h.m.rotation.x += dt * 4; }
  let n = 0;
  for (let i = 0; i < bots.length && n < 8; i++) { const b = bots[i]; if (b.act !== ACT.carry || b.dead || b.car || !b.ch || !b.ch.shown || hyp(b.x - cx, b.z - cz) > 110) continue;
    _bd.position.set(b.x - Math.sin(b.yaw) * .4, b.y + 1.08, b.z - Math.cos(b.yaw) * .4); _bd.rotation.set(0, b.yaw, 0); _bd.scale.setScalar(1); _bd.updateMatrix(); crateMesh.setMatrixAt(n++, _bd.matrix); }
  for (let i = n; i < 8; i++) crateMesh.setMatrixAt(i, ZERO_M); crateMesh.instanceMatrix.needsUpdate = true;
}

// --- what people say: a line over someone's head for a couple of seconds when you are close enough to have heard it
const SAY = {
  vendor: ['What can I get you?', 'Fresh today!', 'Best in Port Calder.', 'Take your time.', 'Two for one, today only.', 'Still warm!'],
  hands: ['Take it! Just take it!', "Don't shoot!", 'Okay, okay!', "It's all there!"],
  cower: ['Get down!', 'Not again…', 'Stay low!'],
  run: ['Run!', 'Call the police!', 'Get out of here!', 'Somebody help!', 'Go, go!'],
  chat: ['You hear about the market?', 'Rent went up again.', 'Did you see the game?', "It's getting late.", 'No way.', 'For real?', 'So I told him no.', 'Same as always.', 'You eating later?', 'Train was late again.', 'Ha!'],
  crew: ['All quiet.', 'We hold this.', 'Watch the corner.', 'Good to see you.', 'Eyes open.', 'Nothing moves without us.'],
  rival: ['Wrong block!', "That's them!", 'Get off our turf!', 'Light them up!'],
  cop: ['Police! Drop it!', 'Stop right there!', 'Hands where I can see them!', 'Suspect in sight!'],
  ball: ['Shoot it!', 'Nice shot.', 'My ball.', 'Game point.', 'Too easy.'],
  work: ['Coming through.', 'Watch your feet.', 'Heavy one.'],
  bump: ['Hey!', 'Watch it!', 'Easy!'],
};
const barks = []; for (let i = 0; i < 5; i++) { const c = texCanvas(384, 64), tex = new T.CanvasTexture(c), sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false })); sp.visible = false; sp.renderOrder = 6; scene.add(sp); barks.push({ c, tex, sp, t: 0, who: null }); }
function say(who, kind, css, gap) {
  if (G.time < LIFE.sayT || G.time - (LIFE.said[who.id] || -99) < (gap || 14)) return false;
  let k = barks.find(q => q.t <= 0); if (!k) return false;
  if (barks.some(q => q.t > 0 && q.who === who)) return false;
  const text = SAY[kind][(rand() * SAY[kind].length) | 0], g = k.c.getContext('2d'); g.clearRect(0, 0, 384, 64); g.font = '600 30px "Saira Condensed", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(372, g.measureText(text).width + 26); g.fillStyle = 'rgba(14,16,20,.72)'; g.fillRect(192 - w / 2, 10, w, 44); g.fillStyle = css || '#f2efe6'; g.fillText(text, 192, 33, 360); k.tex.needsUpdate = true;
  k.t = 2.6; k.who = who; k.sp.visible = true; LIFE.said[who.id] = G.time; LIFE.sayT = G.time + 1.4; return true;
}
function updateBarks(dt) {
  for (let i = 0; i < barks.length; i++) { const k = barks[i]; if (k.t <= 0) continue; k.t -= dt; const a = k.who;
    if (k.t <= 0 || !a || a.gone || a.dead) { k.t = 0; k.who = null; k.sp.visible = false; continue; }
    const d = hyp(a.x - camera.position.x, a.z - camera.position.z), s = clamp(d * .1, .9, 2.4); k.sp.position.set(a.x, a.y + (a.act === ACT.sit ? 1.75 : a.act === ACT.cower ? 1.5 : 2.15) + s * .12, a.z); k.sp.scale.set(2.5 * s, .417 * s, 1); k.sp.material.opacity = Math.min(1, k.t * 2.5, (2.6 - k.t) * 6) * .95; }
  LIFE.barkT -= dt; if (LIFE.barkT > 0 || G.state === 'menu' || P.dead) return; LIFE.barkT = .22;
  const calm = !(P.ads > .5 || P.shootT > 0);                                     // nobody makes small talk with someone pointing a gun
  for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.dead || b.car || b.knock > .5) { b.aimWas = 0; continue; } const d = hyp(b.x - P.x, b.z - P.z), up = b.aim > .5 && !b.aimWas; b.aimWas = b.aim > .5 ? 1 : 0;
    if (d > 26 || Math.abs(b.y - P.y) > 3) continue;
    if (b.team === TEAM_CIV) {
      if (b.act === ACT.handsup) { if (d < 9) say(b, 'hands', '#ffd9a0', 5); }
      else if (b.act === ACT.cower) { if (d < 12) say(b, 'cower', '#f2efe6', 7); }
      else if (b.spd > 5 && d < 16) { if (rand() < .35) say(b, 'run', '#f2efe6', 9); }
      else if (P.car) continue;
      else if (!calm) continue;
      else if (b.role === ROLE.staff && d < 5.5) say(b, 'vendor', '#ffe8b0', 22);
      else if (b.act === ACT.carry && d < 4) say(b, 'work', '#f2efe6', 20);
      else if (b.act === ACT.ball && d < 11 && rand() < .12) say(b, 'ball', '#f2efe6', 16);
      else if (b.act === ACT.talk && d < 7 && rand() < .1) say(b, 'chat', '#f2efe6', 18);
      else if (d < 1.1 && P.spd > 5.5 && b.spd < 3) say(b, 'bump', '#f2efe6', 6);
    } else if (b.team === TEAM_COP) { if (up && P.heat > 0 && d < 24) say(b, 'cop', '#9db8ff', 8); }
    else if (b.team === P.team) { if (!P.car && d < 5 && b.act > 0 && rand() < .12) say(b, 'crew', lite(b.team), 30); }
    else if (up && d < 24 && rand() < .5) say(b, 'rival', lite(b.team), 10);
  }
}

// --- what the city sounds like when nothing is happening: voices where people gather, birds by day, crickets by night,
//     a dog somewhere, a horn from a driver who is stuck, and whatever is playing on the nearest speaker
const SFXL = {
  flutter: (x, z) => { if (!AC || hear(x, 1, z, 45) < .03) return; const d = out(HEAR.p); for (let i = 0; i < 7; i++) sNoise(.045, 2400 + rand() * 1200, .2 * HEAR.v, 'bandpass', i * .055 + rand() * .02, d); },
  bounce: (x, z) => { if (!AC || hear(x, 1, z, 36) < .03) return; sTone(170, 70, .07, .3 * HEAR.v, 'sine', 0, out(HEAR.p)); sNoise(.03, 900, .12 * HEAR.v, 'bandpass'); },
  swish: (x, z) => { if (!AC || hear(x, 3, z, 36) < .03) return; const d = out(HEAR.p); if (rand() < .55) sNoise(.16, 4200, .13 * HEAR.v, 'highpass', 0, d); else { sTone(620, 540, .09, .12 * HEAR.v, 'triangle', 0, d); sNoise(.05, 1500, .15 * HEAR.v, 'bandpass', 0, d); } },
  honk: (x, z) => { if (!AC || hear(x, 1, z, 95) < .03) return; const d = out(HEAR.p), f = 350 + rand() * 90; sTone(f, f, .32, .09 * HEAR.v, 'square', 0, d); sTone(f * 1.26, f * 1.26, .32, .07 * HEAR.v, 'square', 0, d); },
};
function lifeAudioInit() {
  const A = LIFE.au = { vox: [], g: AC.createGain() }; A.g.gain.value = 0; A.g.connect(sfxBus);
  [104, 131, 168, 211].forEach((f, i) => { const o = AC.createOscillator(), bp = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = f; bp.type = 'bandpass'; bp.frequency.value = 600 + i * 150; bp.Q.value = 3.5; g.gain.value = 0; o.connect(bp); bp.connect(g); g.connect(A.g); o.start(); A.vox.push({ o, bp, g, f }); });
}
function updateAmbience(dt) {
  if (!AC) return; if (!LIFE.au) lifeAudioInit();
  const A = LIFE.au, t = AC.currentTime, menu = G.state === 'menu', ex = EAR.x, ez = EAR.z, quiet = menu || !!P.car;
  LIFE.ambT -= dt;
  if (LIFE.ambT <= 0) { LIFE.ambT = .13;
    // voices: a handful of buzzing tones pushed through moving filters, each one stopping and starting like someone talking
    let n = 0; if (!menu) for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.dead || b.car) continue; const d = hyp(b.x - ex, b.z - ez); if (d < 24) n += (b.act === ACT.talk ? 1.6 : b.act === ACT.dance || b.act === ACT.ball ? 1.2 : .7) * (1 - d / 24); }
    LIFE.crowd = lerp(LIFE.crowd, clamp(n / 7, 0, 1), .12); A.g.gain.setTargetAtTime(LIFE.crowd * (P.car ? .25 : .8), t, .2);
    if (LIFE.crowd > .02) A.vox.forEach((v, i) => { if (rand() < .34) { const on = rand() < .62; v.g.gain.setTargetAtTime(on ? .012 + rand() * .022 : 0, t, .035); if (on) { v.o.frequency.setTargetAtTime(v.f * (.9 + rand() * .28), t, .05); v.bp.frequency.setTargetAtTime(380 + rand() * 900, t, .06); } } });
    // a driver who has been held up leans on the horn
    for (let i = 0; i < cars.length; i++) { const c = cars[i], on = !!c.horn && !c.cop && c !== P.car; if (on && !c.hornWas && G.time - LIFE.hornT > .5) { LIFE.hornT = G.time; SFXL.honk(c.x, c.z); } c.hornWas = on; }
  }
  if (!menu) {
    const day = 1 - clamp(ENV.night * 1.4, 0, 1);
    LIFE.birdT -= dt; if (LIFE.birdT <= 0) { LIFE.birdT = 1.2 + rand() * 4.5; if (day > .3 && !P.car) { let g = .3; for (let i = 0; i < ROOSTS.length; i++) g = Math.max(g, 1 - hyp(ROOSTS[i][0] - ex, ROOSTS[i][1] - ez) / 80); const d = out(rs(1.4)), f = 2500 + rand() * 1300, k = 2 + ((rand() * 3) | 0); for (let q = 0; q < k; q++) sTone(f * (1 + q * .04), f * 1.22, .05 + rand() * .03, .028 * g * day, 'sine', q * .09, d); } }
    LIFE.crkT -= dt; if (LIFE.crkT <= 0) { LIFE.crkT = .62; if (ENV.night > .6 && !P.car) for (let q = 0; q < 3; q++) sTone(4350, 4300, .018, .011 * ENV.night, 'sine', q * .045); }
    LIFE.dogT -= dt; if (LIFE.dogT <= 0) { LIFE.dogT = 16 + rand() * 34; if (!P.car) { const d = out(rs(1.6)), v = .02 + rand() * .035, k = 2 + ((rand() * 2) | 0); for (let q = 0; q < k; q++) { sNoise(.09, 560, v * 2, 'bandpass', q * .24, d); sTone(430, 250, .09, v, 'sawtooth', q * .24, d); } } }
    LIFE.gullT -= dt; if (LIFE.gullT <= 0) { LIFE.gullT = 5 + rand() * 9; if (day > .4) { let best = 0, px = 0; for (let i = 0; i < flocks.length; i++) { const f = flocks[i]; if (f.gull && hear(f.x, 20, f.z, 190) > best) { best = HEAR.v; px = HEAR.p; } } if (best > .03) { const d = out(px); for (let q = 0; q < 3; q++) sTone(1750 - q * 60, 1150, .13, .05 * best, 'triangle', q * .19, d); } } }
  }
  // music: on foot near a speaker you hear what it is playing; in a car the car's own radio takes over
  if (menu) { if (LIFE.spk) { LIFE.spk = null; LIFE.vol = 0; radioVolume(0); setRadio(-1); } return; }
  if (P.car) { LIFE.spk = null; LIFE.vol = -1; return; }                                                   // the car's own radio
  let best = null, bd = 32; for (let i = 0; i < SPEAKERS.length; i++) { const s = SPEAKERS[i], d = hyp(s.x - ex, s.z - ez); if (d < bd) { bd = d; best = s; } }
  if (best) { if (RADIO.on !== best.st) setRadio(best.st); LIFE.spk = best; const v = .3 * Math.pow(1 - bd / 32, 1.4); if (Math.abs(v - LIFE.vol) > .008) { LIFE.vol = v; radioVolume(v); } }
  else if (LIFE.spk || RADIO.on >= 0) { LIFE.spk = null; LIFE.vol = 0; radioVolume(0); setRadio(-1); }
}
function updateLife(dt) { LIFE.frame = (LIFE.frame + 1) | 0; updateBirds(dt); updateSmoke(dt); updateTraffic3(dt); updateProps3(dt); updateBarks(dt); updateAmbience(dt); }
