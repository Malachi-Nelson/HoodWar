/* =====================================================================
   4c¾. DRESSING THE CITY — after every block is built and before it is all poured into the big static meshes: the things that make
        a street read as real. On buildings: a cornice under the roofline, a plinth at the foot, corner piers, a stone sill under
        every window, air conditioners in some (with the stain they leave), balconies, a proper front door, rooftop plant; dirt
        along the foot of every wall and streaks down from the top. On the streets: tyre wear down every lane, patches, cracks,
        potholes and oil stains, storm drains at the kerbs, manhole covers, stains and litter on the pavements; traffic signals at
        the busy crossings (the traffic stops for them: 90-bots.js), street names at every crossing, and wooden utility poles
        with sagging wires along the house and factory streets.
        All of it rolls its own dice (WD), so nothing here moves a building, a shop or anything saved.
   ===================================================================== */
const WD = rng32(424243), wdr = (a, b) => a + (b - a) * WD();
const DLANE = 2.2;   // the middle of a travel lane, out from the road's centre line
// --- grime: one atlas of decals for walls and the ground (4 x 4 cells)
const GRIME = (() => {
  const S = 1024, C = S / 4, c = texCanvas(S), g = c.getContext('2d'), R = rng32(907);
  const cell = (k, fn) => { const x = (k % 4) * C, y = Math.floor(k / 4) * C; g.save(); g.beginPath(); g.rect(x, y, C, C); g.clip(); g.translate(x, y); fn(); g.restore(); };
  const blob = (x, y, r, a, rgb) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb || '12,11,10'},${a})`); gr.addColorStop(1, `rgba(${rgb || '12,11,10'},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  cell(0, () => { for (let i = 0; i < 26; i++) blob(128 + (R() - .5) * 120, 128 + (R() - .5) * 120, 18 + R() * 50, .14 + R() * .18); for (let i = 0; i < 5; i++) blob(128 + (R() - .5) * 90, 128 + (R() - .5) * 90, 10 + R() * 18, .25); });   // oil
  cell(1, () => { const gr = g.createLinearGradient(0, 0, 0, C); gr.addColorStop(0, 'rgba(22,19,15,0)'); gr.addColorStop(.5, 'rgba(22,19,15,.16)'); gr.addColorStop(1, 'rgba(22,19,15,.5)'); g.fillStyle = gr; g.fillRect(0, 0, C, C);
    for (let i = 0; i < 60; i++) { const x = R() * C, h = 30 + R() * 150; g.fillStyle = `rgba(22,19,15,${.03 + R() * .08})`; g.fillRect(x, C - h, 2 + R() * 7, h); }
    for (let i = 0; i < 12; i++) blob(R() * C, C - R() * 40, 20 + R() * 40, .12, '30,34,22'); });                                                     // dirt and damp at the foot of a wall
  cell(2, () => { for (let i = 0; i < 46; i++) { const x = R() * C, h = 60 + R() * 190, w = 2 + R() * 9, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(25,22,18,${.1 + R() * .22})`); gr.addColorStop(1, 'rgba(25,22,18,0)'); g.fillStyle = gr; g.fillRect(x, 0, w, h); } });   // streaks down from a ledge
  cell(3, () => { for (let x = 0; x < C; x++) { const d = (x - C / 2) / (C * .3), a = Math.exp(-d * d) * (.2 + R() * .08); g.fillStyle = `rgba(6,6,6,${a})`; g.fillRect(x, 0, 1, C); } });   // tyre wear: one band, the same all along
  const snake = (x, y, ang, len, w) => { const pts = []; let a = ang; for (let t = 0; t <= len; t += 6) { pts.push([x, y]); a += (R() - .5) * .5; x += Math.cos(a) * 6; y += Math.sin(a) * 6; }
    [[w * 3.2, .1], [w, .82]].forEach(([lw, al]) => { g.strokeStyle = `rgba(7,7,7,${al})`; g.lineWidth = lw; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }); };
  cell(4, () => { snake(-10, 60 + R() * 136, (R() - .5) * .4, 290, 3.5); if (R() < .7) snake(40 + R() * 170, -10, PI / 2 + (R() - .5) * .6, 120 + R() * 150, 2.6); });   // a sealed crack (a tar snake) and a branch
  cell(12, () => { g.strokeStyle = 'rgba(20,20,20,.7)'; g.lineWidth = 1.6; g.lineCap = 'round'; for (let k = 0; k < 2; k++) { let x = R() * C, y = 0, a = PI / 2 + (R() - .5) * .5; g.beginPath(); g.moveTo(x, y); while (y < C && x > 0 && x < C) { a += (R() - .5) * .35; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); } });   // a crack across a slab
  cell(5, () => { g.fillStyle = 'rgba(105,100,94,.55)'; g.beginPath(); for (let a = 0; a < TAU; a += .22) { const r = 98 + R() * 20; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r * .82); } g.fill();
    g.fillStyle = 'rgba(34,31,28,.93)'; g.beginPath(); for (let a = 0; a < TAU; a += .2) { const r = 64 + R() * 24; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r * .82); } g.fill();
    for (let i = 0; i < 160; i++) { const r = R() * 70, a = R() * TAU, v = 70 + R() * 70; g.fillStyle = `rgba(${v},${v - 4},${v - 9},${.5 + R() * .4})`; g.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r * .8, 2 + R() * 4, 2 + R() * 4); }
    const gr = g.createRadialGradient(128, 128, 40, 128, 128, 92); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, C, C); });   // pothole: a broken rim, gravel in the bottom
  cell(6, () => { g.fillStyle = 'rgba(14,14,16,.36)'; g.fillRect(16, 16, C - 32, C - 32); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${R() * .06})`; g.fillRect(16 + R() * (C - 60), 16 + R() * (C - 60), 10 + R() * 30, 10 + R() * 30); }
    g.strokeStyle = 'rgba(4,4,4,.65)'; g.lineWidth = 4; g.strokeRect(16, 16, C - 32, C - 32); });   // a patched repair: newer, darker asphalt and a sealed seam
  cell(7, () => { g.fillStyle = 'rgba(46,46,48,1)'; g.fillRect(8, 60, C - 16, C - 120); g.fillStyle = 'rgba(3,3,4,1)'; for (let x = 24; x < C - 26; x += 22) g.fillRect(x, 74, 11, C - 148); g.strokeStyle = 'rgba(92,92,95,1)'; g.lineWidth = 7; g.strokeRect(8, 60, C - 16, C - 120); });   // storm drain grate
  cell(8, () => { for (let i = 0; i < 70; i++) { const x = R() * C, y = R() * C, r = 2 + R() * 6; g.fillStyle = `rgba(20,20,20,${.15 + R() * .3})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } for (let i = 0; i < 6; i++) blob(R() * C, R() * C, 14 + R() * 24, .12); });   // gum and stains
  cell(9, () => { for (let i = 0; i < 9; i++) blob(128 + (R() - .5) * 140, 128 + (R() - .5) * 140, 30 + R() * 50, .1 + R() * .1, '28,30,26'); });       // a damp patch
  cell(10, () => { g.fillStyle = 'rgba(52,50,48,1)'; g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.fill(); g.strokeStyle = 'rgba(82,78,74,1)'; g.lineWidth = 9; g.stroke(); g.lineWidth = 4;
    for (let r = 30; r < 110; r += 22) { g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); } for (let a = 0; a < TAU; a += PI / 6) { g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); g.stroke(); } });   // manhole cover
  cell(11, () => { for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${200 + R() * 55},${190 + R() * 55},${170 + R() * 60},${.5 + R() * .4})`; g.save(); g.translate(R() * C, R() * C); g.rotate(R() * 6); g.fillRect(-6, -4, 8 + R() * 12, 6 + R() * 8); g.restore(); }
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${90 + R() * 50},${60 + R() * 30},20,.6)`; g.beginPath(); g.ellipse(R() * C, R() * C, 5 + R() * 6, 3 + R() * 3, R() * 3, 0, TAU); g.fill(); } });   // litter and leaves
  const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
})();
defMat('grime', new T.MeshLambertMaterial({ map: GRIME, transparent: true, depthWrite: false, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -40 }), 1, 1, { cast: false });
defMat('dflat', lam({}), 1, 1);                                                    // fine detail: sills, air conditioners, balconies, vents (not drawn on Low)
PBR_OF.grime = [.95, 0]; PBR_OF.dflat = [.7, .05];
const cellUV = k => [(k % 4) / 4 + .005, 1 - (Math.floor(k / 4) + 1) / 4 + .005, (k % 4 + 1) / 4 - .005, 1 - Math.floor(k / 4) / 4 - .005];
// a decal flat on the ground: centre, width across, length along, angle (0: the length runs along z), atlas cell, tint
function decalG(x, z, y, w, l, ang, k, col) { const u = cellUV(k), c = Math.cos(ang), s = Math.sin(ang), hw = w / 2, hl = l / 2, P = (a, b) => [x + a * c + b * s, y, z - a * s + b * c];
  SB('grime').quad(P(-hw, hl), P(hw, hl), P(hw, -hl), P(-hw, -hl), 0, 1, 0, u[0], u[1], u[2], u[3], colOf(col === undefined ? 0xffffff : col)); }
// a decal on a wall facing (nx, nz), centred at (px, pz) along it, w wide, from y0 up to y1
function decalW(px, pz, nx, nz, w, y0, y1, k, col) { const u = cellUV(k), tx = nz, tz = -nx, hw = w / 2, x = px + nx * .03, z = pz + nz * .03;
  SB('grime').quad([x - tx * hw, y0, z - tz * hw], [x + tx * hw, y0, z + tz * hw], [x + tx * hw, y1, z + tz * hw], [x - tx * hw, y1, z - tz * hw], nx, 0, nz, u[0], u[1], u[2], u[3], colOf(col === undefined ? 0xffffff : col)); }
// the dressing goes into buffers by square, each its own mesh, so the frustum (and the shadow camera) can skip what is not in view:
// "near" detail (sills, air conditioners, vents, aerials: material dflat) by 100 m squares, also left out beyond a few hundred metres
// and on Low; "mid" detail (ledges, doors, balconies, rooftop plant, signals, poles: the plain 'flat' material) by 200 m squares.
const DCH = {}, DETAIL = { list: [] };
const dchunk = (x, z, tier) => { const s = tier === 'm' ? 200 : 100, i = Math.floor(x / s), j = Math.floor(z / s), k = tier + i + ',' + j; return (DCH[k] || (DCH[k] = { b: new GeoBuf(), tier, x: (i + .5) * s, z: (j + .5) * s })).b; };
function boxQ(b, x0, x1, y0, y1, z0, z1, col, f) { const c = colOf(col);   // the same faces as addBox (bits: 1 +x, 2 -x, 4 +z, 8 -z, 16 top, 32 bottom)
  if (f & 4) b.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, 0, 0, 0, 0, c); if (f & 8) b.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, 0, 0, 0, 0, c);
  if (f & 1) b.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, 0, 0, 0, 0, c); if (f & 2) b.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, 0, 0, 0, 0, c);
  if (f & 16) b.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 0, 1, 0, 0, 0, 0, 0, c); if ((f & 32) && y0 > .3) b.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, 0, 0, 0, 0, c); }
const dbox = (x0, x1, y0, y1, z0, z1, col, mat, f) => boxQ(dchunk((x0 + x1) / 2, (z0 + z1) / 2, mat === 'flat' ? 'm' : 'n'), x0, x1, y0, y1, z0, z1, col, f === undefined ? 63 : f);
function dcyl(x, y0, y1, z, r, col, seg, tier, rTop) { const g = new T.CylinderGeometry(rTop === undefined ? r : rTop, r, y1 - y0, seg || 8, 1, false); g.translate(x, (y0 + y1) / 2, z); dchunk(x, z, tier || 'n').geo(g, null, colOf(col)); g.dispose(); }
function finishDetail() {
  for (const k in DCH) { const D = DCH[k], key = D.tier === 'm' ? 'flat' : 'dflat', m = new T.Mesh(D.b.build(), MATS[key].mat); m.userData.key = key; m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false;
    scene.add(m); staticMeshes.push(m); if (D.tier === 'n') DETAIL.list.push({ m, x: D.x, z: D.z }); }
}
function detailTick() { const on = GQ.tex > 0, R = [130, 130, 190, 280][GQ.view] + 71, cx = camera.position.x, cz = camera.position.z;   // 71: half a square's diagonal
  for (let i = 0; i < DETAIL.list.length; i++) { const d = DETAIL.list[i]; d.m.visible = on && hyp(d.x - cx, d.z - cz) < R; } }
// the windows each facade texture draws: bay width, storey height, window width and height (fractions of the bay and storey), where the window sits in its storey
const FAC_WIN = { brick: [3, 3.2, .42, .58, .45], brick2: [3, 3.2, .56, .5, .45], office: [3, 3.2, .86, .56, .45], siding: [3.5, 3, .34, .5, .45] };
// how far a face stands from the centre line of the street it looks onto (99: it looks onto no street)
function faceRoadGap(f, B) {
  if (f === 's') { const j = Math.ceil((B.z1 - EDGE) / PZ - .001); return j > NZ ? 99 : RZ(j) - B.z1; }
  if (f === 'n') { const j = Math.floor((B.z0 - EDGE) / PZ + .001); return j < 0 ? 99 : B.z0 - RZ(j); }
  if (f === 'e') { const i = Math.ceil((B.x1 - EDGE) / PX - .001); return i > NX ? 99 : RX(i) - B.x1; }
  const i = Math.floor((B.x0 - EDGE) / PX + .001); return i < 0 ? 99 : B.x0 - RX(i);
}
// a face as its texture sees it: where u = 0 is, the way u runs, the way the face looks, its length
function faceFrame(f, B) {
  if (f === 's') return { ox: B.x0, oz: B.z1, tx: 1, tz: 0, nx: 0, nz: 1, len: B.x1 - B.x0 };
  if (f === 'n') return { ox: B.x1, oz: B.z0, tx: -1, tz: 0, nx: 0, nz: -1, len: B.x1 - B.x0 };
  if (f === 'e') return { ox: B.x1, oz: B.z1, tx: 0, tz: -1, nx: 1, nz: 0, len: B.z1 - B.z0 };
  return { ox: B.x0, oz: B.z0, tx: 0, tz: 1, nx: -1, nz: 0, len: B.z1 - B.z0 };
}
// a box standing out from a face: from u0 to u1 along it, y0 to y1, d0 to d1 out from the wall
function faceBox(F, u0, u1, y0, y1, d0, d1, col, mat, f) { const ax = F.ox + F.tx * u0 + F.nx * d0, az = F.oz + F.tz * u0 + F.nz * d0, bx = F.ox + F.tx * u1 + F.nx * d1, bz = F.oz + F.tz * u1 + F.nz * d1;
  dbox(Math.min(ax, bx), Math.max(ax, bx), y0, y1, Math.min(az, bz), Math.max(az, bz), col, mat, f !== undefined ? f : d0 > 0 ? 63 : 63 & ~(F.nx > 0 ? 2 : F.nx < 0 ? 1 : F.nz > 0 ? 8 : 4)); }   // the side against the wall is never seen
const faceAt = (F, u) => [F.ox + F.tx * u, F.oz + F.tz * u];
const STONE = [0xcfc6b4, 0xbdb3a1, 0xd8d0c0, 0xa9a196], AC_COL = [0xd9d6cc, 0xc8ccc9, 0xbfb9aa, 0xe2ded2], DOORS = [0x3d2b20, 0x2c3e50, 0x1f2a24, 0x5a2d22, 0x2a2c30];
// grime along a face, in pieces a few metres long so the texture is never stretched
function grimeRun(F, y0, y1, k, p) { for (let u = 0; u < F.len - .2;) { const w = Math.min(F.len - u, wdr(2.4, 4.6)); if (WD() < p) { const c = faceAt(F, u + w / 2), v = .75 + WD() * .35; decalW(c[0], c[1], F.nx, F.nz, w + .2, y0, y1, k, [v, v, v]); } u += w; } }
function dressBuilding(B) {
  const W2 = FAC_WIN[B.mat], tall = B.top - B.y0, stone = STONE[(WD() * STONE.length) | 0], glassy = B.mat === 'office' || B.mat === 'tower';
  ['n', 's', 'e', 'w'].forEach(f => {
    const F = faceFrame(f, B); if (F.len < 3) return; const street = faceRoadGap(f, B) < EDGE + 4;
    // cornice under the roofline, plinth at the foot, piers up the corners of brick
    if (B.parapet && tall > 5) faceBox(F, -.25, F.len + .25, B.top - .52, B.top - .06, 0, .28, glassy ? 0x7d858c : stone, 'flat');
    if (!B.shop) faceBox(F, -.07, F.len + .07, B.y0, B.y0 + .55, 0, .08, 0x625c55, 'flat');
    if (tall > 6 && (B.mat === 'brick' || B.mat === 'brick2')) { faceBox(F, 0, .4, B.yb, B.top - .52, 0, .07, stone, 'flat'); faceBox(F, F.len - .4, F.len, B.yb, B.top - .52, 0, .07, stone, 'flat'); }
    grimeRun(F, B.y0, B.y0 + 1.6, 1, .9);
    if (tall > 6 && WD() < .6) grimeRun(F, B.top - wdr(3, 6), B.top - .52, 2, .55);
    if (!W2) return;
    const [bw, fh, wwf, whf, wy] = W2, floors = Math.floor((B.top - B.yb - .4) / fh), bays = Math.floor(F.len / bw + .001), sillY = (1 - (1 - whf) * wy - whf) * fh, ww = bw * wwf;
    const homes = B.mat !== 'office', balcony = B.mat === 'brick2' && floors >= 3 && WD() < .3;
    for (let fl = 0; fl < floors; fl++) for (let k = 0; k < bays; k++) {
      const uc = (k + .5) * bw, y = B.yb + fl * fh + sillY; if (uc + ww / 2 > F.len - .3 || uc - ww / 2 < .3) continue;
      if (homes) faceBox(F, uc - ww / 2 - .1, uc + ww / 2 + .1, y - .11, y, 0, .15, stone, 'n', 48 | (F.nx > 0 ? 1 : F.nx < 0 ? 2 : F.nz > 0 ? 4 : 8));                                          // the sill (office glazing has none)
      if (homes && fl >= (B.shop ? 0 : 1) && WD() < .1) { faceBox(F, uc - .34, uc + .34, y + .02, y + .48, 0, .56, AC_COL[(WD() * 4) | 0]); faceBox(F, uc - .29, uc + .29, y + .08, y + .42, .56, .58, 0x4d5052);   // an air conditioner
        const c = faceAt(F, uc); decalW(c[0], c[1], F.nx, F.nz, .6, Math.max(B.y0 + .3, y - wdr(1.2, 2.4)), y - .11, 2); }
      if (balcony && fl >= 1 && k % 2 === 1) { const y0 = B.yb + fl * fh - .02, a = uc - bw * .43, b = uc + bw * .43; faceBox(F, a, b, y0, y0 + .13, 0, 1.15, 0x8e8a84, 'flat');
        faceBox(F, a, b, y0 + .13, y0 + 1, 1.1, 1.15, 0x2b2e31, 'flat'); faceBox(F, a, a + .05, y0 + .13, y0 + 1, .02, 1.12, 0x2b2e31, 'flat'); faceBox(F, b - .05, b, y0 + .13, y0 + 1, .02, 1.12, 0x2b2e31, 'flat'); faceBox(F, a, b, y0 + .95, y0 + 1, 0, 1.15, 0x2b2e31, 'flat'); }
    }
    // a front door where a face with no shop fronts looks onto the street
    if (street && !B.shop && bays >= 2) { const uc = (Math.floor(bays / 2) + .5) * bw, dc = DOORS[(WD() * DOORS.length) | 0], y = B.y0;
      if (uc + 1.2 < F.len) { faceBox(F, uc - .86, uc - .62, y, y + 2.76, 0, .15, stone, 'flat'); faceBox(F, uc + .62, uc + .86, y, y + 2.76, 0, .15, stone, 'flat'); faceBox(F, uc - .9, uc + .9, y + 2.5, y + 2.82, 0, .17, stone, 'flat');
        faceBox(F, uc - .62, uc + .62, y + .14, y + 2.5, 0, .05, dc, 'flat'); faceBox(F, uc - .5, uc + .5, y + 1.55, y + 2.35, .05, .06, 0x2c3a46, 'flat');   // the door and its glass
        faceBox(F, uc - 1.05, uc + 1.05, y, y + .15, 0, .8, 0x9a948a, 'flat'); faceBox(F, uc - 1.15, uc + 1.15, y + 2.86, y + 2.98, 0, .95, 0x2f3134, 'flat'); }
    }
  });
  // rooftop plant: air handlers with fans, vents, aerials, the odd dish (not on roofs kept clear for helicopters)
  if (!B.roof || glassy && B.mat === 'tower') return;
  const rw = B.x1 - B.x0, rd = B.z1 - B.z0; if (rw < 7 || rd < 7) return; const y = B.top;
  for (let i = 0, n = 1 + ((WD() * 3) | 0); i < n; i++) { const x = wdr(B.x0 + 1.5, B.x1 - 3.4), z = wdr(B.z0 + 1.5, B.z1 - 2.8); dbox(x, x + 1.8, y, y + 1.1, z, z + 1.25, 0xa7abad, 'flat', 47);
    dcyl(x + .9, y + 1.1, y + 1.22, z + .62, .44, 0x34373a, 10); dbox(x + .1, x + 1.7, y + .2, y + .9, z - .02, z, 0x6b7073); solid(x, x + 1.8, y, y + 1.1, z, z + 1.25); }
  for (let i = 0, n = 2 + ((WD() * 3) | 0); i < n; i++) { const x = wdr(B.x0 + .8, B.x1 - .8), z = wdr(B.z0 + .8, B.z1 - .8), h = wdr(.5, 1.2); dcyl(x, y, y + h, z, wdr(.08, .16), 0x6a6e70, 6); dcyl(x, y + h, y + h + .08, z, .22, 0x55595b, 8); }
  if (WD() < .3) { const x = wdr(B.x0 + 1, B.x1 - 1), z = wdr(B.z0 + 1, B.z1 - 1), h = wdr(3, 7); dbox(x - .05, x + .05, y, y + h, z - .05, z + .05, 0x5a5e62); dbox(x - .6, x + .6, y + h * .8, y + h * .8 + .05, z - .03, z + .03, 0x5a5e62); dbox(x - .4, x + .4, y + h * .6, y + h * .6 + .05, z - .03, z + .03, 0x5a5e62); }
  if (WD() < .25) { const x = wdr(B.x0 + 1.5, B.x1 - 1.5), z = wdr(B.z0 + 1.5, B.z1 - 1.5), g = new T.CylinderGeometry(.5, .06, .22, 14); g.rotateX(-.9); g.rotateY(WD() * TAU); g.translate(x, y + .85, z); dchunk(x, z).geo(g, null, hexCol(0xd8d8d4)); g.dispose(); dbox(x - .04, x + .04, y, y + .75, z - .04, z + .04, 0x5a5e62); }
}
// --- the streets
const AVE = ['Westway', 'Ember Ave', 'Foundry Ave', 'Union Ave', 'Market Ave', 'Calder Ave', 'Harbor Ave', 'Waterfront'], STR = ['North St', 'Mill St', 'Library St', 'Court St', 'Founders St', 'Steeple St', 'Dock St'];
// street-name blades: their own little atlas (16 names, 256 x 64 each), white on green with a white border, like the real ones
const BLADES = AVE.concat(STR), BLADE_TEX = (() => { const c = texCanvas(512), g = c.getContext('2d');
  BLADES.forEach((t, k) => { const x = (k % 2) * 256, y = Math.floor(k / 2) * 64; g.fillStyle = '#1b5a38'; g.fillRect(x, y, 256, 64); g.strokeStyle = '#e9efe9'; g.lineWidth = 3; g.strokeRect(x + 5, y + 5, 246, 54);
    g.fillStyle = '#f2f5f0'; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 40; g.font = `bold ${fs}px "Arial Narrow", Arial, sans-serif`; while (g.measureText(t).width > 226 && fs > 20) { fs -= 2; g.font = `bold ${fs}px "Arial Narrow", Arial, sans-serif`; } g.fillText(t, x + 128, y + 34); });
  return asTex(c, false); })();
defMat('blade', lam({ map: BLADE_TEX }), 1, 1, { cast: false }); PBR_OF.blade = [.42, .1];
function blade(text, x, y, z, face) { const k = BLADES.indexOf(text), u0 = (k % 2) / 2 + .002, u1 = u0 + .496, v1 = 1 - Math.floor(k / 2) / 8 - .002, v0 = v1 - .121, b = SB('blade'), a = .68, c = .17;
  if (face === 's') b.quad([x - a, y - c, z], [x + a, y - c, z], [x + a, y + c, z], [x - a, y + c, z], 0, 0, 1, u0, v0, u1, v1);
  else if (face === 'n') b.quad([x + a, y - c, z], [x - a, y - c, z], [x - a, y + c, z], [x + a, y + c, z], 0, 0, -1, u0, v0, u1, v1);
  else if (face === 'e') b.quad([x, y - c, z + a], [x, y - c, z - a], [x, y + c, z - a], [x, y + c, z + a], 1, 0, 0, u0, v0, u1, v1);
  else b.quad([x, y - c, z - a], [x, y - c, z + a], [x, y + c, z + a], [x, y + c, z - a], -1, 0, 0, u0, v0, u1, v1); }
const SIGNALS = [], SIG_AT = {}, SIG_LAMPS = [];   // the signalled crossings; SIG_AT[i + j * 16]; every lamp in every signal head
const blockKind = (i, j) => i < 0 || j < 0 || i >= NX || j >= NZ ? '' : DIST[j][i];
const nearKinds = (i, j) => blockKind(i - 1, j - 1) + blockKind(i, j - 1) + blockKind(i - 1, j) + blockKind(i, j);
const propNear = (x, z, r) => PROPS.some(p => hyp(p.x - x, p.z - z) < r);
function dressStreets() {
  for (let j = 0; j <= NZ; j++) for (let i = 0; i < NX; i++) roadStretch(RX(i), RZ(j), RX(i + 1), RZ(j), nearKinds(i + 1, j));
  for (let i = 0; i <= NX; i++) for (let j = 0; j < NZ; j++) roadStretch(RX(i), RZ(j), RX(i), RZ(j + 1), nearKinds(i, j + 1));
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) crossing(i, j);
  VENTS.forEach(v => decalG(v[0], v[1], .034, .95, .95, 0, 10));
  PARK.forEach(p => { if (WD() < .55) decalG(p.x + wdr(-1, 1), p.z + wdr(-1, 1), .022, wdr(1.2, 2.6), wdr(1.2, 2.6), WD() * 3, 0); });
  // the pavements: stains, gum, litter, a crack or two
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const L = lotOf(i, j); for (let k = 0; k < 9; k++) { const s = (WD() * 4) | 0, t = WD(), o = WD() * (WALK - .8) + .4;
    const x = s < 2 ? L.x0 + t * (L.x1 - L.x0) : s === 2 ? L.x0 - o : L.x1 + o, z = s === 0 ? L.z0 - o : s === 1 ? L.z1 + o : L.z0 + t * (L.z1 - L.z0), r = WD();
    decalG(x, z, CURB + .045, wdr(1, 2.2), wdr(1, 2.2), WD() * 3, r < .55 ? 8 : r < .8 ? 11 : 12); } }
  // utility poles and their wires: along the house and factory streets, one side of each
  const lines = {};
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) if ('hiJ'.includes(blockKind(i, j))) { const L = lotOf(i, j), z = L.z0 - WALK + .55; (lines[z] || (lines[z] = [])).push(...utilityPoles(L.x0 + 3, L.x1 - 3, z)); }
  for (const z in lines) { const xs = lines[z].sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k++) if (xs[k + 1] - xs[k] < 31) [-1, 0, 1].forEach(o => POLE_WIRES.push([xs[k], +z + o, xs[k + 1], +z + o])); }
  buildWires();
}
// one stretch of road between two crossings: tyre wear down each lane, then patches, cracks, the odd pothole, oil where cars wait
function roadStretch(ax, az, bx, bz, kinds) {
  const len = hyp(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len, ang = Math.atan2(dx, dz), x0 = ax + dx * 7, z0 = az + dz * 7, L = len - 14;
  const rough = /[iJNYQRgdD]/.test(kinds) ? 1.7 : /[hp]/.test(kinds) ? 1.25 : .8, at = (t, o) => [x0 + dx * L * t - dz * o, z0 + dz * L * t + dx * o];
  [-1, 1].forEach(sd => [-.8, .8].forEach(o => { const c = at(.5, sd * DLANE + o); decalG(c[0], c[1], .02, .9, L, ang, 3); }));
  const scatter = (n, fn) => { for (let k = 0; k < n; k++) fn(at(.04 + WD() * .92, (WD() - .5) * 10)); };
  scatter(Math.round(2.2 * rough), c => decalG(c[0], c[1], .024, wdr(1.8, 4.5), wdr(2, 7), ang + (WD() < .5 ? 0 : PI / 2), 6));
  scatter(Math.round(3 * rough), c => decalG(c[0], c[1], .028, wdr(1.2, 2.2), wdr(3, 7), ang + (WD() < .6 ? 0 : PI / 2) + (WD() - .5) * .3, 4));
  scatter(WD() < .55 * rough ? 1 + (WD() < .3 * rough ? 1 : 0) : 0, c => decalG(c[0], c[1], .032, wdr(.7, 1.5), wdr(.7, 1.5), WD() * 6, 5));
  scatter(Math.round(2 * rough), c => decalG(c[0], c[1], .026, wdr(1, 2.5), wdr(1, 2.5), WD() * 6, 0));
  [.04, .96].forEach(t => [-1, 1].forEach(sd => { if (WD() < .7) { const c = at(t + (t < .5 ? .05 : -.05), sd * DLANE); decalG(c[0], c[1], .03, 1.6, 2.4, ang, 0); } }));   // where the cars stand waiting
}
// a crossing: storm drains at the kerbs; signals where the streets are busy; the street names on the north-east corner
function crossing(i, j) {
  const x = RX(i), z = RZ(j), k = nearKinds(i, j), c = ROAD / 2 - .33;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(q => { const ex = x + q[0] * 12, nz = z + q[1] * 12;
    if (ex > 4 && ex < CITY.w - 4) decalG(ex, z + q[1] * c, .03, .55, 1.1, PI / 2, 7); if (nz > 4 && nz < CITY.d - 4) decalG(x + q[0] * c, nz, .03, .55, 1.1, 0, 7); });
  const busy = i > 0 && j > 0 && i < NX && j < NZ && ([...k].filter(ch => 'otzVMlKSCLAB'.includes(ch)).length >= 2 || (i + j) % 3 === 0);
  if (busy) signalAt(i, j);
  const px = x + 7.1, pz = z - 7.1;
  if (!busy) { if (propNear(px, pz, 1)) return; dbox(px - .045, px + .045, CURB, CURB + 3.75, pz - .045, pz + .045, 0x2f3437, 'flat', 31); solid(px - .06, px + .06, CURB, CURB + 3.75, pz - .06, pz + .06, { n: false }); }
  const y = CURB + (busy ? 4.4 : 3.3);
  if (STR[j]) { dbox(px - .68, px + .68, y - .17, y + .17, pz - .04, pz + .04, 0x1d5c3a, 'flat', 51); blade(STR[j], px, y, pz + .045, 's'); blade(STR[j], px, y, pz - .045, 'n'); }
  if (AVE[i]) { dbox(px - .04, px + .04, y + .21, y + .55, pz - .68, pz + .68, 0x1d5c3a, 'flat', 60); blade(AVE[i], px + .045, y + .38, pz, 'e'); blade(AVE[i], px - .045, y + .38, pz, 'w'); }
}
// a signalled crossing: for each way in, a pole on the far right corner with a mast arm out over the lanes and a three-lamp head facing
// the oncoming traffic; walk signals on every pole. The stop signs these corners had are taken away.
const SIG_SET = [{ c: [1, -1], arm: [-1, 0], n: [0, 1], axis: 0 }, { c: [-1, 1], arm: [1, 0], n: [0, -1], axis: 0 },   // northbound, southbound
                 { c: [1, 1], arm: [0, -1], n: [-1, 0], axis: 1 }, { c: [-1, -1], arm: [0, 1], n: [1, 0], axis: 1 }];  // eastbound, westbound
function signalAt(i, j) {
  const x = RX(i), z = RZ(j), cr = 7, S = { i, j, x, z, off: Math.floor(WD() * 4) * 8 }, si = SIGNALS.length; SIGNALS.push(S); SIG_AT[i + j * 16] = S;
  const pole = 0x30352d, head = 0x23261f;
  SIG_SET.forEach(q => {
    const px = x + q.c[0] * cr, pz = z + q.c[1] * cr, armL = 4.6, [ax, az] = q.arm, [nx, nz] = q.n;
    for (let p = PROPS.length - 1; p >= 0; p--) if (PROPS[p].type === 'sign' && hyp(PROPS[p].x - px, PROPS[p].z - pz) < 1.6) { PROPS[p].box.off = true; PROPS.splice(p, 1); }
    dcyl(px, CURB, CURB + 6.3, pz, .12, pole, 10, 'm'); solid(px - .15, px + .15, CURB, CURB + 6.3, pz - .15, pz + .15, { n: false });
    dcyl(px, CURB, CURB + .5, pz, .2, pole, 10, 'm');
    const ex = px + ax * armL, ez = pz + az * armL, w = .055; dbox(Math.min(px, ex) - w, Math.max(px, ex) + w, CURB + 6.02, CURB + 6.14, Math.min(pz, ez) - w, Math.max(pz, ez) + w, pole, 'flat');
    const hx = px + ax * (armL - .2), hz = pz + az * (armL - .2), hw = nz ? .19 : .14, hd = nx ? .19 : .14, y0 = CURB + 4.84;
    dbox(hx - hw, hx + hw, y0, y0 + 1.12, hz - hd, hz + hd, head, 'flat'); dbox(hx - (nz ? .32 : .02) - nx * .16, hx + (nz ? .32 : .02) - nx * .16, y0 - .1, y0 + 1.22, hz - (nx ? .32 : .02) - nz * .16, hz + (nx ? .32 : .02) - nz * .16, 0x1a1c18, 'flat');
    dbox(hx - .02, hx + .02, y0 + 1.12, CURB + 6.02, hz - .02, hz + .02, pole, 'flat');
    [0, 1, 2].forEach(l => { const ly = y0 + .9 - l * .35, fx = hx + nx * .15, fz = hz + nz * .15; SIG_LAMPS.push({ x: fx + nx * .005, y: ly, z: fz + nz * .005, nx, nz, sig: si, axis: q.axis, kind: l });
      dbox(fx - (nz ? .15 : 0) + Math.min(0, nx * .2), fx + (nz ? .15 : 0) + Math.max(0, nx * .2), ly + .14, ly + .16, fz - (nx ? .15 : 0) + Math.min(0, nz * .2), fz + (nx ? .15 : 0) + Math.max(0, nz * .2), head, 'flat'); });   // a hood over each lamp
    // walk signals: one looking across each of the two crossings that meet at this corner
    [[-q.c[0], 0, 1], [0, -q.c[1], 0]].forEach(wq => { const [wx, wz, axis] = wq, bx = px + wx * .2, bz = pz + wz * .2, y = CURB + 2.55;
      dbox(bx - (wz ? .16 : .1), bx + (wz ? .16 : .1), y, y + .34, bz - (wx ? .16 : .1), bz + (wx ? .16 : .1), head, 'flat');
      SIG_LAMPS.push({ x: bx + wx * .105, y: y + .17, z: bz + wz * .105, nx: wx, nz: wz, sig: si, axis, kind: 3 }); });
  });
}
// a run of wooden poles along a kerb, every 25 m or so: crossarm, insulators, now and then a transformer
const POLE_WIRES = [], WIRES = { m: null };
function utilityPoles(xa, xb, z) {
  const xs = [], n = Math.max(1, Math.round((xb - xa) / 25));
  for (let k = 0; k <= n; k++) { let px = xa + (xb - xa) * k / n; if (propNear(px, z, 1.3)) px += 1.8; if (propNear(px, z, 1.3)) continue;
    dcyl(px, CURB, CURB + 9.2, z, .15, 0x5b4a3a, 8, 'm', .12); solid(px - .17, px + .17, CURB, CURB + 9.2, z - .17, z + .17, { n: false });
    dbox(px - .07, px + .07, CURB + 8.35, CURB + 8.5, z - 1.15, z + 1.15, 0x5b4a3a, 'flat'); [-1, 0, 1].forEach(o => dbox(px - .04, px + .04, CURB + 8.5, CURB + 8.66, z + o - .04, z + o + .04, 0x8a8f86));
    if (WD() < .3) dcyl(px + .36, CURB + 6.4, CURB + 7.5, z, .27, 0x6e7376, 10);
    xs.push(px); }
  return xs;
}
function buildWires() {
  const pos = [], y = CURB + 8.66;
  POLE_WIRES.forEach(w => { const n = 12, sag = t => Math.sin(t * PI) * .6; for (let s = 0; s < n; s++) { const t0 = s / n, t1 = (s + 1) / n; pos.push(lerp(w[0], w[2], t0), y - sag(t0), w[1], lerp(w[0], w[2], t1), y - sag(t1), w[3]); } });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); WIRES.m = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x151515 })); WIRES.m.matrixAutoUpdate = false; scene.add(WIRES.m);
}
// --- the whole pass (from 43-assemble.js, before the static meshes are made)
// houses (41-districts.js) are not building()s: they get the dirt along the foot of their walls and nothing else
function dressHouses() { FOOT.forEach(f => { if (f[4] !== 'h' || f[2] - f[0] < 2) return; const B = { x0: f[0], z0: f[1], x1: f[2], z1: f[3] }; ['n', 's', 'e', 'w'].forEach(k => grimeRun(faceFrame(k, B), CURB, CURB + 1.1, 1, .7)); }); }
function dressCity() { BLDS.forEach(dressBuilding); dressHouses(); dressStreets(); PROPS.forEach((p, i) => { p.i = i; }); buildSignalLamps(); finishDetail(); }
// --- the signals: every lamp is one instance; signalsTick colours them from the cycle. The clock is the time of day, which every
//     player shares, so all see the same lights and the traffic (run by the host) stops for the same reds.
//     32 s a cycle: north-south green 12, amber 3, all red 1; east-west the same. 2400 s a day, 75 cycles: it wraps cleanly.
const sigClock = () => G.tod * 100;
function signalPhase(S, axis, t) { const c = ((t + S.off) % 32 + 32) % 32, ns = c < 12 ? 0 : c < 15 ? 1 : 2, ew = c >= 16 && c < 28 ? 0 : c >= 28 && c < 31 ? 1 : 2; return axis === 0 ? ns : ew; }   // 0 green, 1 amber, 2 red
const SIG_LAMP = { mesh: null, key: '' };
function buildSignalLamps() {
  const g = new T.CircleGeometry(.12, 14), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), one = new T.Vector3(1, 1, 1), sq = new T.Vector3(1.25, 1.25, 1);
  const M = SIG_LAMP.mesh = new T.InstancedMesh(g, new T.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, SIG_LAMPS.length));
  SIG_LAMPS.forEach((L, k) => { e.set(0, Math.atan2(L.nx, L.nz), 0); m.compose(p.set(L.x, L.y, L.z), q.setFromEuler(e), L.kind === 3 ? sq : one); M.setMatrixAt(k, m); M.setColorAt(k, SIG_OFF); });
  M.count = SIG_LAMPS.length; M.frustumCulled = false; scene.add(M);
}
const SIG_C = [new T.Color(3, .14, .05), new T.Color(3, 1.45, .04), new T.Color(.12, 2.7, 1.05), new T.Color(2.5, 2.55, 2.6), new T.Color(3, 1, .08)], SIG_OFF = new T.Color(.035, .036, .032), _sigc = new T.Color();
function signalsTick() {
  const M = SIG_LAMP.mesh; if (!M || !SIG_LAMPS.length) return; const t = sigClock(), blink = (t * 2 % 2) < 1, hdr = POST.on ? 1 : .6, key = Math.floor(t * 4) + (POST.on ? 'h' : 'l'); if (key === SIG_LAMP.key) return; SIG_LAMP.key = key;
  for (let k = 0; k < SIG_LAMPS.length; k++) { const L = SIG_LAMPS[k], ph = signalPhase(SIGNALS[L.sig], L.axis, t);
    if (L.kind === 3) { if (ph === 0) _sigc.copy(SIG_C[3]).multiplyScalar(hdr); else if (ph === 2 || blink) _sigc.copy(SIG_C[4]).multiplyScalar(hdr); else _sigc.copy(SIG_OFF); }
    else { const on = (L.kind === 0 && ph === 2) || (L.kind === 1 && ph === 1) || (L.kind === 2 && ph === 0); if (on) _sigc.copy(SIG_C[L.kind]).multiplyScalar(hdr); else _sigc.copy(SIG_OFF); }
    M.setColorAt(k, _sigc); }
  M.instanceColor.needsUpdate = true;
}
// for the traffic: is the way into crossing `to`, from crossing `from`, shut? -> 0 go, 1 amber, 2 red
function signalAhead(from, to) { const S = SIG_AT[to[0] + to[1] * 16]; if (!S) return 0; return signalPhase(S, from[0] === to[0] ? 0 : 1, sigClock()); }
