/* ---------------------------------------------------------------------
   4d. Put the city together: one generator per block, then kerbs, lamps, parking and the walking graph.
   --------------------------------------------------------------------- */
const DIST = ['hhwoowi', 'hPwtzwB', 'hlSMtLi', 'AwCkwwD', 'hpwwgid', 'hhcwiid'];
const RING = [];
let mallLightAt = null;
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const L = lotOf(i, j), d = DIST[j][i];
  switch (d) {
    case 'h': genHouses(L); break;
    case 'w': genWalkups(L); break;
    case 'o': genOffices(L); break;
    case 't': genTower(L, i === 3 ? 96 : 124, i === 4, i === 4); break;
    case 'z': genCivic(L); break;
    case 'i': genIndustrial(L); break;
    case 'd': genDocks(L, false); break;
    case 'D': genDocks(L, true); ZONES.push({ id: 'E', name: 'The Docks', x: L.cx, z: L.cz, r: 18 }); navNode(L.cx, CURB, L.cz); break;
    case 'P': genCourts(L); break;
    case 'A': genEmberBase(L); break;
    case 'B': genTideBase(L); break;
    case 'C': genCorner(L); break;
    case 'S': genStrip(L); break;
    case 'l': genLibrary(L); break;
    case 'M': mallLightAt = genMall(L); break;
    case 'k': genPark(L); break;
    case 'p': genProjects(L); break;
    case 'g': genGas(L); break;
    case 'c': genChurch(L); break;
    case 'L': terrace(L, 'n', { x0: L.x0 + 4 }); terrace(L, 's', { x0: L.x0 + 4 }); ground(L.x0, L.z0 + 21, L.x1, L.z1 - 21, 'plaza'); bench(L.x0 + 20, L.cz - 4, true); bench(L.x0 + 34, L.cz + 4, true); planter(L.x0 + 27, L.cz - 6, 1.5); planter(L.x0 + 50, L.cz + 6, 1.5);
      addBox(L.x0 + 9, L.x0 + 13, CURB, CURB + 2.8, L.cz - 2, L.cz + 2, 'flat', { col: 0x2f5d3a, a: false }); sign('NEWS · COFFEE', 'gold', L.x0 + 11, CURB + 2.3, L.cz + 2.05, 3.6, .6, 's');
      navNode(L.x0 + 6, CURB, L.cz + 5); navNode(L.cx, CURB, L.cz); navNode(L.x1 - 3, CURB, L.cz); break;
  }
  // kerbside: lamps, a hydrant, a bin, sometimes a stop sign; then the pavement ring that people walk
  const k = WALK - .7;
  prop('lamp', L.x0 + 14, L.z0 - k); prop('lamp', L.x1 - 14, L.z0 - k); prop('lamp', L.x0 + 14, L.z1 + k); prop('lamp', L.x1 - 14, L.z1 + k); prop('lamp', L.x0 - k, L.cz); prop('lamp', L.x1 + k, L.cz);
  PROPS[PROPS.length - 6].yaw = PROPS[PROPS.length - 5].yaw = 0; PROPS[PROPS.length - 4].yaw = PROPS[PROPS.length - 3].yaw = PI; PROPS[PROPS.length - 2].yaw = PI / 2; PROPS[PROPS.length - 1].yaw = -PI / 2;
  prop('hydrant', L.x0 + wr(24, 56), L.z0 - k + .1); prop('bin', L.x0 + 3, L.z1 + WALK - 1.1); if (W() < .5) prop('bin', L.x1 - 3, L.z0 - WALK + 1.1);
  if (W() < .6) prop('sign', L.x0 - k, L.z0 - k); if (W() < .6) prop('sign', L.x1 + k, L.z1 + k);
  if ('wotzLSC'.includes(d)) { tree(L.x0 + 27, L.z0 - .9, .85); tree(L.x1 - 27, L.z0 - .9, .85); tree(L.x0 + 27, L.z1 + .9, .85); tree(L.x1 - 27, L.z1 + .9, .85); }
  for (let q = 0; q < 3; q++) { PARK.push({ x: L.x0 + 16 + q * 22 + wr(-2, 2), z: L.z0 - WALK - 1.15, yaw: -PI / 2 }); PARK.push({ x: L.x0 + 20 + q * 22 + wr(-2, 2), z: L.z1 + WALK + 1.15, yaw: PI / 2 }); }
  for (let q = 0; q < 2; q++) { PARK.push({ x: L.x0 - WALK - 1.15, z: L.z0 + 18 + q * 26 + wr(-2, 2), yaw: 0 }); PARK.push({ x: L.x1 + WALK + 1.15, z: L.z0 + 22 + q * 26 + wr(-2, 2), yaw: PI }); }
  const o = WALK / 2, R = { nw: navNode(L.x0 - o, CURB, L.z0 - o), n: navNode(L.cx, CURB, L.z0 - o), ne: navNode(L.x1 + o, CURB, L.z0 - o), e: navNode(L.x1 + o, CURB, L.cz), se: navNode(L.x1 + o, CURB, L.z1 + o), s: navNode(L.cx, CURB, L.z1 + o), sw: navNode(L.x0 - o, CURB, L.z1 + o), w: navNode(L.x0 - o, CURB, L.cz) };
  ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach((key, q, arr) => navLink(R[key], R[arr[(q + 1) % 8]], true));
  (RING[i] || (RING[i] = []))[j] = R;
}
for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const R = RING[i][j];   // zebra crossings join the rings
  if (i + 1 < NX) { navLink(R.ne, RING[i + 1][j].nw, true); navLink(R.se, RING[i + 1][j].sw, true); }
  if (j + 1 < NZ) { navLink(R.sw, RING[i][j + 1].nw, true); navLink(R.se, RING[i][j + 1].ne, true); } }
genLine();
ZONES.sort((a, b) => a.id < b.id ? -1 : 1);
billboard(-5.6, 150, 8, 'CALDER LAGER · BREWED BY THE LAKE', 'gold', 'e'); billboard(-5.6, 390, 8, 'WKPC 94.7 · THE BLOCK', 'neon', 'e'); billboard(260, -5.6, 8, 'INJURED? CALL 555-0144', 'white', 's'); billboard(560, -5.6, 8, 'PORT CALDER LOTTERY · $4 MILLION', 'green', 's');

// --- knockable street furniture: one instanced mesh per kind
const PROP_GEO = {};
{ const b = new GeoBuf(), st = hexCol(0x3a4046);
  b.box(-.08, .08, 0, 6.2, -.08, .08, st); b.box(-.06, .06, 6.05, 6.2, -1.7, .06, st); b.box(-.22, .22, 5.92, 6.08, -2.1, -1.3, hexCol(0x2a2e33)); b.box(-.16, .16, 5.88, 5.93, -2, -1.4, hexCol(0xfff0c8)); b.box(-.14, .14, 0, .5, -.14, .14, hexCol(0x2a2e33)); PROP_GEO.lamp = b.build(); }
{ const b = new GeoBuf(), r = hexCol(0xb3261e); b.box(-.14, .14, 0, .62, -.14, .14, r); b.box(-.1, .1, .62, .78, -.1, .1, r); b.box(-.24, .24, .38, .52, -.07, .07, r); PROP_GEO.hydrant = b.build(); }
{ const b = new GeoBuf(); b.box(-.28, .28, 0, .95, -.28, .28, hexCol(0x2f4a38)); b.box(-.31, .31, .95, 1.03, -.31, .31, hexCol(0x1c1e20)); PROP_GEO.bin = b.build(); }
{ const b = new GeoBuf(); b.box(-.04, .04, 0, 2.5, -.04, .04, hexCol(0x8a9096)); b.box(-.33, .33, 1.9, 2.56, -.06, -.03, hexCol(0xb3261e)); b.box(-.22, .22, 2.16, 2.3, -.07, -.06, hexCol(0xf2efe6)); PROP_GEO.sign = b.build(); }
const propMat = lam({}), propMesh = {};
['lamp', 'hydrant', 'bin', 'sign'].forEach(type => { const list = PROPS.filter(p => p.type === type), m = new T.InstancedMesh(PROP_GEO[type], propMat, list.length); m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; list.forEach((p, k) => { p.slot = k; }); propMesh[type] = m; scene.add(m); });
const _pm = new T.Matrix4(), _pq = new T.Quaternion(), _pe = new T.Euler(0, 0, 0, 'YXZ'), _pv = new T.Vector3(), _ps = new T.Vector3(1, 1, 1);
function propPlace(p) {   // upright, or lying where it was knocked (down: 0..1, fall: direction it fell in)
  const a = p.down * (PI / 2 - .04); _pe.set(a, p.down ? p.fall : p.yaw, 0); _pq.setFromEuler(_pe); if (p.down) { const q2 = new T.Quaternion().setFromEuler(new T.Euler(0, p.yaw - p.fall, 0)); _pq.multiply(q2); }
  _pm.compose(_pv.set(p.x, p.y + p.down * .08, p.z), _pq, _ps); propMesh[p.type].setMatrixAt(p.slot, _pm); propMesh[p.type].instanceMatrix.needsUpdate = true;
}
PROPS.forEach(propPlace);
// lamps after dark: a glow at each head and a pool of light on the road
const glowTex = (() => { const c = texCanvas(64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return asTex(c, false); })();
const lampHead = p => [p.x - Math.sin(p.yaw) * 1.7, p.y + 5.9, p.z - Math.cos(p.yaw) * 1.7];   // the arm reaches -z in the lamp's own frame, turned by yaw
const lampGlowGeo = new T.BufferGeometry(); { const a = []; LAMPS.forEach(p => { const h = lampHead(p); a.push(h[0], h[1], h[2]); }); lampGlowGeo.setAttribute('position', new T.Float32BufferAttribute(a, 3)); }
const lampGlow = new T.Points(lampGlowGeo, new T.PointsMaterial({ map: glowTex, color: 0xffc47a, size: 5.5, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); lampGlow.frustumCulled = false; scene.add(lampGlow);
const poolGeo = new T.PlaneGeometry(1, 1); poolGeo.rotateX(-PI / 2);
const lampPool = new T.InstancedMesh(poolGeo, new T.MeshBasicMaterial({ map: glowTex, color: 0xffb964, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }), LAMPS.length); lampPool.frustumCulled = false; scene.add(lampPool);
function lampPlace(p, k) { const h = lampHead(p); _pm.compose(_pv.set(h[0], p.down ? -50 : .22, h[2]), _pq.set(0, 0, 0, 1), new T.Vector3(17, 1, 17)); lampPool.setMatrixAt(k, _pm); lampPool.instanceMatrix.needsUpdate = true; lampGlowGeo.attributes.position.setY(k, p.down ? -50 : h[1]); lampGlowGeo.attributes.position.needsUpdate = true; }
LAMPS.forEach(lampPlace);
function knockProp(p, dx, dz, quiet) {
  if (p.down) return false; p.box.off = true; p.fall = Math.atan2(dx, dz); p.down = .01; p.falling = true; p.downT = G.time; if (p.type === 'lamp') lampPlace(p, LAMPS.indexOf(p)); return true;
}
function raiseProp(p) { if (!p.down) return; p.down = 0; p.falling = false; p.box.off = false; propPlace(p); if (p.type === 'lamp') lampPlace(p, LAMPS.indexOf(p)); }
function updateProps(dt) { for (let i = 0; i < PROPS.length; i++) { const p = PROPS[i]; if (!p.falling) continue; p.down = Math.min(1, p.down + dt * 3.2); if (p.down >= 1) p.falling = false; propPlace(p); } }
function resetProps() { PROPS.forEach(raiseProp); }

finishStatic();
drawSigns();
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('40px "Anton"'), document.fonts.load('46px "Permanent Marker"')]).then(drawSigns, () => {});
const mallLights = mallLightAt ? [-13, 13].map(o => { const l = new T.PointLight(0xfff0d8, .75, 46, 1.6); l.position.set(mallLightAt.x, mallLightAt.y, mallLightAt.z + o); scene.add(l); return l; }) : [];

// --- the walking graph: join every pair of nodes that a person could walk straight between
function walkClear(A, B) {
  const dx = B.x - A.x, dz = B.z - A.z, d = hyp(dx, dz); if (d < .01) return true;
  const px = -dz / d * .32, pz = dx / d * .32, dy = B.y - A.y, l = hyp(d, dy);
  for (let s = -1; s <= 1; s += 2) if (rayWorld(A.x + px * s, A.y + .55, A.z + pz * s, dx / l, dy / l, dz / l, 'n', l) < l - .05) return false;
  const n = Math.ceil(d / 1.5); for (let i = 1; i < n; i++) { const t = i / n, y = lerp(A.y, B.y, t), g = groundAt(A.x + dx * t, A.z + dz * t, y + .3, 'p'); if (Math.abs(g - y) > .36) return false; }
  return true;
}
NAV.forEach(n => { if (pushOut(n.x, n.z, .36, n.y + .6, n.y + 1.6, 'p') && hyp(COL.x - n.x, COL.z - n.z) < 2.5) { n.x = COL.x; n.z = COL.z; } const g = groundAt(n.x, n.z, n.y + .45, 'p'); if (Math.abs(g - n.y) < .8) n.y = g; n.e.forEach(e => { const m = NAV[e[0]]; e[1] = hyp(m.x - n.x, m.y - n.y, m.z - n.z); }); });
for (let i = PARK.length - 1; i >= 0; i--) { const s = PARK[i], fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw); let hit = false; for (let k = -1; k <= 1 && !hit; k++) if (pushOut(s.x + fx * k * 1.7, s.z + fz * k * 1.7, 1.15, .62, 1.4, 'p')) hit = true; if (hit) PARK.splice(i, 1); }
const NAVCELL = 46, navGrid = {};
NAV.forEach(n => { const k = Math.floor(n.x / NAVCELL) + ',' + Math.floor(n.z / NAVCELL); (navGrid[k] || (navGrid[k] = [])).push(n.i); });
{ for (let a = 0; a < NAV.length; a++) { const A = NAV[a]; if (!A.auto) continue; const cx = Math.floor(A.x / NAVCELL), cz = Math.floor(A.z / NAVCELL);
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) { const L = navGrid[gx + ',' + gz]; if (!L) continue;
      for (let q = 0; q < L.length; q++) { const b = L[q]; if (b <= a) continue; const B = NAV[b]; if (!B.auto || Math.abs(A.y - B.y) > .5) continue; const d = hyp(A.x - B.x, A.z - B.z); if (d > NAVCELL || d < .5) continue; if (A.e.some(e => e[0] === b)) continue; if (walkClear(A, B)) navLink(a, b, false); } } } }
// anything that cannot be reached from the middle of town is not a place to send anyone
{ const start = NAV.reduce((b, n) => hyp(n.x - CITY.w / 2, n.z - CITY.d / 2) + n.y * 9 < hyp(b.x - CITY.w / 2, b.z - CITY.d / 2) + b.y * 9 ? n : b, NAV[0]), seen = new Set([start.i]), q = [start.i]; while (q.length) { const a = q.pop(); NAV[a].e.forEach(e => { if (!seen.has(e[0])) { seen.add(e[0]); q.push(e[0]); } }); } NAV.forEach(n => { n.iso = !seen.has(n.i); }); }
const NAVOK = NAV.filter(n => !n.iso && n.y < 1);   // street-level places that are safe to pick at random
function nearestNode(x, y, z, needLos) {
  let best = -1, bd = 1e9; const cx = Math.floor(x / NAVCELL), cz = Math.floor(z / NAVCELL);
  for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) { const L = navGrid[gx + ',' + gz]; if (!L) continue;
    for (let q = 0; q < L.length; q++) { const n = NAV[L[q]]; if (n.iso) continue; const dy = Math.abs(n.y - y), d = hyp(n.x - x, n.z - z) + dy * 5; if (d >= bd) continue; if (needLos && (dy > 1.4 || !walkClear({ x, y, z }, n))) continue; bd = d; best = n.i; } }
  if (best < 0 && needLos) return nearestNode(x, y, z, false);
  if (best < 0) { for (let i = 0; i < NAV.length; i++) { const n = NAV[i]; if (n.iso) continue; const d = hyp(n.x - x, n.z - z) + Math.abs(n.y - y) * 5; if (d < bd) { bd = d; best = i; } } }
  return best;
}
// A* over the walking graph. civ: keep to pavements and crossings.
const _open = [], _g = new Float32Array(4096), _f = new Float32Array(4096), _from = new Int16Array(4096), _mark = new Uint16Array(4096); let _stamp = 0;
function navPath(a, b, civ) {
  if (a < 0 || b < 0) return null; if (a === b) return [a];
  if (++_stamp > 65000) { _mark.fill(0); _stamp = 1; }
  const B = NAV[b]; _open.length = 0; _open.push(a); _g[a] = 0; _f[a] = hyp(NAV[a].x - B.x, NAV[a].z - B.z); _from[a] = -1; _mark[a] = _stamp;
  for (let guard = 0; guard < 6000 && _open.length; guard++) {
    let bi = 0; for (let i = 1; i < _open.length; i++) if (_f[_open[i]] < _f[_open[bi]]) bi = i;
    const cur = _open[bi]; _open[bi] = _open[_open.length - 1]; _open.pop();
    if (cur === b) { const path = []; for (let n = b; n >= 0; n = _from[n]) path.push(n); return path.reverse(); }
    const E = NAV[cur].e;
    for (let i = 0; i < E.length; i++) { const e = E[i]; if (civ && !e[2]) continue; const to = e[0], g = _g[cur] + e[1] * (e[2] ? 1 : 1.05);
      if (_mark[to] === _stamp && g >= _g[to]) continue; const fresh = _mark[to] !== _stamp || !_open.includes(to); _mark[to] = _stamp; _g[to] = g; _f[to] = g + hyp(NAV[to].x - B.x, NAV[to].y - B.y, NAV[to].z - B.z); _from[to] = cur; if (fresh) _open.push(to); }
  }
  return null;
}
const zoneNode = ZONES.map(z => nearestNode(z.x, z.id === 'D' ? CURB : CURB, z.z, false));
// --- the driving graph is the street grid itself: crossings (i, j), i = 0..NX, j = 0..NZ
const xingOf = (x, z) => [clamp(Math.round((x - EDGE) / PX), 0, NX), clamp(Math.round((z - EDGE) / PZ), 0, NZ)];
const LANE = 2.1;
