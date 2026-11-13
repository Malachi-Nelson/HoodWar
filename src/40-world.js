/* =====================================================================
   4. THE CITY — Port Calder, an invented lake port. Metres; +x east, +z south, +y up.
      A 7 x 6 grid of blocks. Everything is generated from one seed, so every player builds the same streets.
   ===================================================================== */
const W = rng32(935731);
const CURB = .15;
const RX = i => EDGE + i * PX, RZ = j => EDGE + j * PZ;          // road centre lines: i = 0..NX, j = 0..NZ
const lotOf = (i, j) => ({ i, j, x0: RX(i) + EDGE, x1: RX(i + 1) - EDGE, z0: RZ(j) + EDGE, z1: RZ(j + 1) - EDGE, cx: RX(i) + PX / 2, cz: RZ(j) + PZ / 2 });
const FOOT = [];          // building footprints for the radar: [x0, z0, x1, z1, kind]
const PATCH = [];         // ground patches for the radar: [x0, z0, x1, z1, colour]
const PARK = [];          // kerbside and lot parking spots: { x, z, yaw }
const PROPS = [];         // street furniture a car can knock flat: { type, x, z, y, box, down }
const ZONES = [], SHOPS = [], ROBS = [], GARAGES = [], SPAWNS = CREWS.map(() => []), BASECARS = CREWS.map(() => []);
// Places where people do something other than walk past. k: 'sit' a bench, 'hang' a knot of people talking, 'browse' a window or a stall,
// 'wait' a stop or a platform, 'hoop' a basket, 'dance' by a speaker, 'post' where a vendor or a clerk works, 'work' a job done between two spots.
const POI = [];
const CARTS = [];   // food carts: { x, z, text, d (the way the counter faces) }
const VENTS = [], STACKS = [], ROOSTS = [], SPEAKERS = [], GRILLS = [];   // steam from the street, smoke from chimneys, where pigeons gather, where music plays, where food is cooking
const WP = rng32(77123);                                       // its own dice, so adding a bench never reshuffles the buildings
const LAMPS = [];
const wr = (a, b) => a + (b - a) * W();
const wi = (a, b) => a + Math.floor(W() * (b - a + 1));

// visual box + collider. faces bits: 1 +x, 2 -x, 4 +z, 8 -z, 16 top, 32 bottom
function addBox(x0, x1, y0, y1, z0, z1, mat, o) {
  o = o || {};
  if (mat) {
    const d = MATS[mat], buf = SB(mat), col = colOf(o.col), tu = o.tu || d.tu, tv = o.tv || d.tv, w = x1 - x0, h = y1 - y0, dp = z1 - z0, f = o.faces === undefined ? 63 : o.faces;
    if (f & 4) buf.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, 0, 0, w / tu, h / tv, col);
    if (f & 8) buf.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, 0, 0, w / tu, h / tv, col);
    if (f & 1) buf.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, 0, 0, dp / tu, h / tv, col);
    if (f & 2) buf.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, 0, 0, dp / tu, h / tv, col);
    if (f & 16) { const tm = o.top || mat, td = MATS[tm]; SB(tm).quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 0, 1, 0, x0 / td.tu, -z1 / td.tv, x1 / td.tu, -z0 / td.tv, colOf(o.tcol === undefined ? (o.top ? null : o.col) : o.tcol)); }
    if ((f & 32) && y0 > .3) buf.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, 0, 0, w / tu, dp / tu, col);
  }
  return o.nocol ? null : solid(x0, x1, y0, y1, z0, z1, o);
}
const deco = (x0, x1, y0, y1, z0, z1, col, o) => addBox(x0, x1, y0, y1, z0, z1, 'flat', Object.assign({ nocol: true, col }, o || {}));
// a flat patch of another surface laid on the block (grass, a parking lot, a court)
const LAYER = { grass: .014, dirt: .018, lot: .022, plaza: .026, tile: .03, court: .034 };   // patches laid over one another sit at slightly different heights, softest ground lowest
function ground(x0, z0, x1, z1, mat, col, y) { const d = MATS[mat], h = (y === undefined ? CURB : y) + (LAYER[mat] || .03); SB(mat).quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], 0, 1, 0, x0 / d.tu, -z1 / d.tv, x1 / d.tu, -z0 / d.tv, colOf(col)); if (y === undefined) PATCH.push([x0, z0, x1, z1, mat]); }
function paint(x0, z0, x1, z1, col, y) { const h = (y === undefined ? 0 : y) + .05; SB('paint').quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], 0, 1, 0, 0, 0, 1, 1, colOf(col === undefined ? 0xd8d6cc : col)); }
function cyl(x, y0, y1, z, r, mat, col, o) { o = o || {}; const g = new T.CylinderGeometry(o.rTop === undefined ? r : o.rTop, r, y1 - y0, o.seg || 12); SB(mat).geo(g, new T.Matrix4().makeTranslation(x, (y0 + y1) / 2, z), colOf(col)); g.dispose(); if (!o.nocol) solid(x - r * .8, x + r * .8, y0, y1, z - r * .8, z + r * .8, o); }
// a straight flight of steps from (ax,az) at y0 up to (bx,bz) at y1; each step is solid down to the bottom
function stairs(ax, az, bx, bz, y0, y1, w, mat, col) {
  const n = Math.max(2, Math.round((y1 - y0) / .3)), alongX = Math.abs(bx - ax) > Math.abs(bz - az);
  for (let i = 0; i < n; i++) {
    const top = y0 + (y1 - y0) * (i + 1) / n, a = i / n, b = (i + 1) / n;
    if (alongX) { const xa = lerp(ax, bx, a), xb = lerp(ax, bx, b); addBox(Math.min(xa, xb), Math.max(xa, xb), y0, top, az - w / 2, az + w / 2, mat, { col }); }
    else { const za = lerp(az, bz, a), zb = lerp(az, bz, b); addBox(ax - w / 2, ax + w / 2, y0, top, Math.min(za, zb), Math.max(za, zb), mat, { col }); }
  }
}
// wall along `axis` from a..b at thickness p0..p1 on the other axis, with door openings [from, to, sill, head]
function wall(axis, p0, p1, a, b, y0, y1, ops, mat, o) {
  const seg = (u0, u1, ya, yb) => { if (u1 - u0 < .01 || yb - ya < .01) return; axis === 'x' ? addBox(u0, u1, ya, yb, p0, p1, mat, o) : addBox(p0, p1, ya, yb, u0, u1, mat, o); };
  let cur = a;
  (ops || []).slice().sort((p, q) => p[0] - q[0]).forEach(op => { seg(cur, op[0], y0, y1); seg(op[0], op[1], y0, y0 + (op[2] || 0)); seg(op[0], op[1], y0 + op[3], y1); cur = op[1]; });
  seg(cur, b, y0, y1);
}

// --- signs: one atlas of painted boards, redrawn once the web fonts arrive
const SIGNS = [], SIGN_COLS = 4, SIGN_ROWS = 32, signCanvas = texCanvas(1024, 2048), signTex = asTex(signCanvas, false);
defMat('sign', new T.MeshLambertMaterial({ map: signTex, emissiveMap: signTex, emissive: 0x000000, alphaTest: .35 }), 1, 1, { cast: false });
const SIGN_STYLES = { shop: ['#16181c', '#f2efe6'], red: ['#a3221b', '#fff4e0'], gold: ['#d9a521', '#1a1408'], blue: ['#15467a', '#eaf4ff'], green: ['#1d5c3a', '#eafbea'], white: ['#ece8dc', '#1c1c1c'], neon: ['#0c0d12', '#ff5fa2'], cyan: ['#0c0d12', '#5fe9ff'],
  tagW: [null, '#f2efe6'] };
CREWS.forEach((c, t) => { SIGN_STYLES['crew' + t] = c.sign; SIGN_STYLES['tag' + t] = [null, c.css]; });   // each crew's boards, and its name sprayed on walls
function signCell(text, style) { const k = style + '|' + text; let i = SIGNS.findIndex(s => s.k === k); if (i < 0) { i = SIGNS.length; SIGNS.push({ k, text, style }); } return i % (SIGN_COLS * SIGN_ROWS); }
function drawSigns() {
  const g = signCanvas.getContext('2d'); g.clearRect(0, 0, 1024, 2048);
  SIGNS.forEach((s, i) => {
    const cx = (i % SIGN_COLS) * 256, cy = Math.floor(i / SIGN_COLS) * 64, st = SIGN_STYLES[s.style] || SIGN_STYLES.shop, tag = !st[0];
    if (!tag) { g.fillStyle = st[0]; g.fillRect(cx, cy, 256, 64); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.strokeRect(cx + 3, cy + 3, 250, 58); }
    g.fillStyle = st[1]; g.textAlign = 'center'; g.textBaseline = 'middle';
    let px = tag ? 46 : 40; g.font = (tag ? `${px}px "Permanent Marker", "Comic Sans MS", cursive` : `${px}px "Anton", Impact, "Arial Narrow", sans-serif`);
    while (g.measureText(s.text).width > 236 && px > 14) { px -= 2; g.font = g.font.replace(/^\d+px/, px + 'px'); }
    if (tag) { g.save(); g.translate(cx + 128, cy + 34); g.rotate(-.05); g.lineWidth = 5; g.strokeStyle = /^#[0-3]/.test(st[1]) ? 'rgba(235,238,242,.75)' : 'rgba(0,0,0,.55)'; g.strokeText(s.text, 0, 0); g.fillText(s.text, 0, 0); g.restore(); }
    else g.fillText(s.text, cx + 128, cy + 35);
  });
  signTex.needsUpdate = true;
}
// a board facing 'n','s','e' or 'w', centred at (x,y,z); w metres wide, h tall
function sign(text, style, x, y, z, w, h, face) {
  const i = signCell(text, style), u0 = (i % SIGN_COLS) / SIGN_COLS, v1 = 1 - Math.floor(i / SIGN_COLS) / SIGN_ROWS, u1 = u0 + 1 / SIGN_COLS, v0 = v1 - 1 / SIGN_ROWS, b = SB('sign'), a = w / 2, c = h / 2;
  if (face === 's') b.quad([x - a, y - c, z], [x + a, y - c, z], [x + a, y + c, z], [x - a, y + c, z], 0, 0, 1, u0, v0, u1, v1);
  else if (face === 'n') b.quad([x + a, y - c, z], [x - a, y - c, z], [x - a, y + c, z], [x + a, y + c, z], 0, 0, -1, u0, v0, u1, v1);
  else if (face === 'e') b.quad([x, y - c, z + a], [x, y - c, z - a], [x, y + c, z - a], [x, y + c, z + a], 1, 0, 0, u0, v0, u1, v1);
  else b.quad([x, y - c, z - a], [x, y - c, z + a], [x, y + c, z + a], [x, y + c, z - a], -1, 0, 0, u0, v0, u1, v1);
}
const FACE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

// --- street furniture that a car can flatten
function prop(type, x, z, y) {
  const r = type === 'lamp' ? .16 : type === 'sign' ? .08 : .28, h = type === 'lamp' ? 6 : type === 'sign' ? 2.4 : type === 'bin' ? 1 : .8;
  y = y === undefined ? CURB : y;
  const box = solid(x - r, x + r, y, y + h, z - r, z + r, { a: false, s: type === 'bin', n: false });
  PROPS.push({ type, x, z, y, box, down: 0, yaw: 0, i: PROPS.length }); if (type === 'lamp') LAMPS.push(PROPS[PROPS.length - 1]);
}
function tree(x, z, s, y) {
  y = y === undefined ? CURB : y; s = s || 1; const h = 2.6 * s + W() * 1.2, g1 = hexCol(pick(W, [0x3f6b34, 0x4d7a3a, 0x58813c, 0x3a5f30])), tr = hexCol(0x4a3a2a);
  addBox(x - .2, x + .2, y, y + h + .4, z - .2, z + .2, 'flat', { col: tr, a: false, n: false });
  const ico = new T.IcosahedronGeometry(1, 1), m = new T.Matrix4();
  m.compose(new T.Vector3(x, y + h + 1.2 * s, z), new T.Quaternion().setFromEuler(new T.Euler(W() * 3, W() * 3, 0)), new T.Vector3(1.9 * s, 1.5 * s, 1.9 * s)); SB('flat').geo(ico, m, g1);
  m.compose(new T.Vector3(x + (W() - .5) * s, y + h + 2.3 * s, z + (W() - .5) * s), new T.Quaternion(), new T.Vector3(1.3 * s, 1.1 * s, 1.3 * s)); SB('flat').geo(ico, m, [g1[0] * 1.12, g1[1] * 1.12, g1[2] * 1.05]); ico.dispose();
  PATCH.push([x - 1.6 * s, z - 1.6 * s, x + 1.6 * s, z + 1.6 * s, 'tree']);
}
function fence(x0, z0, x1, z1, h, kind, y) {   // chain-link stops people and cars, not bullets or sight
  y = y === undefined ? CURB : y; const t = .06, ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
  if (kind === 'wood') { ax ? addBox(xa, xb, y, y + h, za - t, za + t, 'flat', { col: 0x7a6248, s: false }) : addBox(xa - t, xa + t, y, y + h, za, zb, 'flat', { col: 0x7a6248, s: false }); return; }
  ax ? addBox(xa, xb, y, y + h, za - t, za + t, 'fence', { a: false, s: false, faces: 12 }) : addBox(xa - t, xa + t, y, y + h, za, zb, 'fence', { a: false, s: false, faces: 3 });
  const n = Math.max(1, Math.round((ax ? xb - xa : zb - za) / 3));
  for (let i = 0; i <= n; i++) { const px = ax ? lerp(xa, xb, i / n) : xa, pz = ax ? za : lerp(za, zb, i / n); deco(px - .04, px + .04, y, y + h + .05, pz - .04, pz + .04, 0x8a9096); }
}
function dumpster(x, z, alongX) { const a = alongX ? 1.1 : .7, b = alongX ? .7 : 1.1; addBox(x - a, x + a, CURB, CURB + 1.25, z - b, z + b, 'flat', { col: pick(W, [0x2f5d3a, 0x2d4f7a, 0x5a3a2a]), a: false }); deco(x - a - .04, x + a + .04, CURB + 1.25, CURB + 1.32, z - b - .04, z + b + .04, 0x1c1e20); }
function barrier(x, z, alongX) { const a = alongX ? 1.5 : .3, b = alongX ? .3 : 1.5; addBox(x - a, x + a, 0, .85, z - b, z + b, 'concrete', { a: false }); }
function crate(x, z, s, y) { y = y === undefined ? CURB : y; addBox(x - s / 2, x + s / 2, y, y + s, z - s / 2, z + s / 2, 'flat', { col: pick(W, [0x8a6a44, 0x7a5c3a, 0x99794f]), a: s > 1.4 }); }
function bench(x, z, alongX) { const a = alongX ? .9 : .25, b = alongX ? .25 : .9; addBox(x - a, x + a, CURB, CURB + .45, z - b, z + b, 'flat', { col: 0x6a4d33, a: false, s: false, n: false }); POI.push({ k: 'sit', x, z, ax: !!alongX, cap: 2 }); }

// --- roofs
function gable(x0, x1, z0, z1, y, rise, ridgeAlongZ, col, wallCol) {
  const b = SB('shingle'), d = MATS.shingle, o = .35, c = colOf(col), wc = colOf(wallCol);
  if (ridgeAlongZ) { const mx = (x0 + x1) / 2, sl = hyp(mx - x0 + o, rise) / d.tv;
    b.quad([x0 - o, y - .12, z1 + o], [mx, y + rise, z1 + o], [mx, y + rise, z0 - o], [x0 - o, y - .12, z0 - o], -.6, .8, 0, 0, 0, sl, (z1 - z0) / d.tu, c);
    b.quad([mx, y + rise, z1 + o], [x1 + o, y - .12, z1 + o], [x1 + o, y - .12, z0 - o], [mx, y + rise, z0 - o], .6, .8, 0, 0, 0, sl, (z1 - z0) / d.tu, c);
    SB('flat').quad([x0, y, z1], [x1, y, z1], [mx, y + rise, z1], [mx, y + rise, z1], 0, 0, 1, 0, 0, 1, 1, wc); SB('flat').quad([x1, y, z0], [x0, y, z0], [mx, y + rise, z0], [mx, y + rise, z0], 0, 0, -1, 0, 0, 1, 1, wc);
  } else { const mz = (z0 + z1) / 2, sl = hyp(mz - z0 + o, rise) / d.tv;
    b.quad([x1 + o, y - .12, z0 - o], [x0 - o, y - .12, z0 - o], [x0 - o, y + rise, mz], [x1 + o, y + rise, mz], 0, .8, -.6, 0, 0, (x1 - x0) / d.tu, sl, c);
    b.quad([x0 - o, y - .12, z1 + o], [x1 + o, y - .12, z1 + o], [x1 + o, y + rise, mz], [x0 - o, y + rise, mz], 0, .8, .6, 0, 0, (x1 - x0) / d.tu, sl, c);
    SB('flat').quad([x1, y, z1], [x1, y, z0], [x1, y + rise, mz], [x1, y + rise, mz], 1, 0, 0, 0, 0, 1, 1, wc); SB('flat').quad([x0, y, z0], [x0, y, z1], [x0, y + rise, mz], [x0, y + rise, mz], -1, 0, 0, 0, 0, 1, 1, wc);
  }
}
function roofClutter(x0, z0, x1, z1, y, tank) {
  const n = wi(1, 3);
  for (let i = 0; i < n; i++) { const w = wr(1.2, 2.4), x = wr(x0 + 1.5, x1 - 1.5 - w), z = wr(z0 + 1.5, z1 - 1.5 - w); deco(x, x + w, y, y + wr(.8, 1.4), z, z + w * .8, 0x9aa0a3); }
  if (W() < .5) { const x = wr(x0 + 1, x1 - 4), z = wr(z0 + 1, z1 - 4); deco(x, x + 2.6, y, y + 2.5, z, z + 3, 0x8d877d); }
  if (tank) { const x = wr(x0 + 3, x1 - 3), z = wr(z0 + 3, z1 - 3); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => deco(x + q[0] * 1.1 - .08, x + q[0] * 1.1 + .08, y, y + 2.6, z + q[1] * 1.1 - .08, z + q[1] * 1.1 + .08, 0x3a3d40));
    cyl(x, y + 2.6, y + 5.6, z, 1.7, 'flat', 0x6d5540, { nocol: true, seg: 10 }); cyl(x, y + 5.6, y + 6.7, z, 1.8, 'flat', 0x4a3c30, { nocol: true, rTop: .1, seg: 10 }); }
}
// --- a building: one collider, a face per material, a roof with a parapet
const BRICKS = [0xb5694f, 0x9c5a47, 0xc98f6a, 0xd2b48c, 0x8a5a4a, 0xa87860, 0xc7a17e, 0x8f6e5e, 0xb9a48f];
function building(x0, z0, x1, z1, h, o) {
  o = o || {}; const y0 = o.base === undefined ? CURB : o.base, mat = o.mat || 'brick', col = o.col === undefined ? pick(W, BRICKS) : o.col;
  solid(x0, x1, y0, y0 + h, z0, z1); FOOT.push([x0, z0, x1, z1, o.kind || 'b']);
  let yb = y0;
  if (o.shop) { addBox(x0, x1, y0, y0 + 4, z0, z1, 'shop', { nocol: true, faces: 15, col: o.shopCol === undefined ? 0xd9d2c4 : o.shopCol }); deco(x0 - .12, x1 + .12, y0 + 3.75, y0 + 4.1, z0 - .12, z1 + .12, 0x2a2c30, { faces: 15 | 32 }); yb = y0 + 4; }
  addBox(x0, x1, yb, y0 + h, z0, z1, mat, { nocol: true, faces: 15 | 16, top: 'roof', col });
  if (o.parapet !== false) { const p = .35, ph = .7, pc = o.trim === undefined ? 0x4b4743 : o.trim, y = y0 + h;
    deco(x0, x1, y, y + ph, z0, z0 + p, pc); deco(x0, x1, y, y + ph, z1 - p, z1, pc); deco(x0, x0 + p, y, y + ph, z0 + p, z1 - p, pc); deco(x1 - p, x1, y, y + ph, z0 + p, z1 - p, pc); }
  if (o.clutter !== false && x1 - x0 > 8 && z1 - z0 > 8) roofClutter(x0, z0, x1, z1, y0 + h, o.tank);
  return { x0, z0, x1, z1, y: y0 + h };
}
function awning(x0, x1, z, face, col) { const d = FACE[face][1] * 1.3; deco(x0, x1, CURB + 2.9, CURB + 3.1, Math.min(z, z + d), Math.max(z, z + d), col); }
function awningX(z0, z1, x, face, col) { const d = FACE[face][0] * 1.3; deco(Math.min(x, x + d), Math.max(x, x + d), CURB + 2.9, CURB + 3.1, z0, z1, col); }

const SHOP_NAMES = ['PORT CITY PIZZA', 'HARBOR DINER', 'FADE FACTORY BARBERS', 'SNEAKER VAULT', 'CHECK CASHING', 'PHONE REPAIR', '24 HR GYM', 'RECORDS & TAPES', 'TACO STOP', 'WINGS N THINGS', 'DOLLAR DEN', 'MATTRESS KINGDOM', 'LUCKY 7 LAUNDROMAT', 'EMBER ROW BBQ', 'BAIT & TACKLE', 'NAILS & LASHES', 'CORNER BAKERY', 'USED TIRES', 'CALDER HARDWARE', 'VIDEO PALACE', 'BEAUTY SUPPLY', 'FISH FRY', 'TAILOR & CLEANERS', 'SMOKE SHOP', 'ARCADE', 'TATTOO', 'KEYS CUT HERE', 'COFFEE', 'THRIFT', 'FURNITURE OUTLET'];
const AWN = [0xa3221b, 0x1d5c3a, 0x15467a, 0xd9a521, 0x2a2c30, 0x7a3a8a, 0xc85a1c];
let shopN = 0;
const FRONTS = [];   // every shop front's door on the pavement, with the name over it: a few of them are for sale (see 104-career.js)
const LABS = [];     // warehouses where a lab can be set up (see 106-heists.js)
let BANK = null;     // Calder Savings & Trust: where the bank job happens
const SHOP_STYLES = ['shop', 'red', 'gold', 'blue', 'green', 'white', 'neon', 'cyan'];
const styleOf = name => { let h = 0; for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) | 0; return SHOP_STYLES[Math.abs(h) % SHOP_STYLES.length]; };   // one board per name, so the sign sheet stays small
function shopFront(x0, x1, z, face) { const n = Math.max(1, Math.round((x1 - x0) / 9)), w = (x1 - x0) / n, d = FACE[face][1] * .1;
  for (let i = 0; i < n; i++) { const cx = x0 + w * (i + .5); { const nm = SHOP_NAMES[shopN++ % SHOP_NAMES.length]; sign(nm, styleOf(nm), cx, CURB + 3.45, z + d, Math.min(7, w - 1), .85, face); FRONTS.push({ x: cx, z: z + FACE[face][1] * 1.7, name: nm, face }); } if (W() < .6) awning(cx - w / 2 + .6, cx + w / 2 - .6, z, face, pick(W, AWN)); } }
function shopFrontX(z0, z1, x, face) { const n = Math.max(1, Math.round((z1 - z0) / 9)), w = (z1 - z0) / n, d = FACE[face][0] * .1;
  for (let i = 0; i < n; i++) { const cz = z0 + w * (i + .5); { const nm = SHOP_NAMES[shopN++ % SHOP_NAMES.length]; sign(nm, styleOf(nm), x + d, CURB + 3.45, cz, Math.min(7, w - 1), .85, face); FRONTS.push({ x: x + FACE[face][0] * 1.7, z: cz, name: nm, face }); } if (W() < .6) awningX(cz - w / 2 + .6, cz + w / 2 - .6, x, face, pick(W, AWN)); } }

// --- the ground, the roads, the paint on them
addBox(WORLD.x0, WORLD.x1, -3, 0, WORLD.z0, WORLD.z1, null);
SB('asphalt').quad([-4, 0, CITY.d + 4], [CITY.w + 4, 0, CITY.d + 4], [CITY.w + 4, 0, -4], [-4, 0, -4], 0, 1, 0, 0, 0, (CITY.w + 8) / 12, (CITY.d + 8) / 12);
const YEL = 0xd9b13a, WHT = 0xd8d6cc;
for (let i = 0; i <= NX; i++) for (let j = 0; j < NZ; j++) { const x = RX(i), a = RZ(j) + EDGE + 1.5, b = RZ(j + 1) - EDGE - 1.5;
  paint(x - .28, a, x - .12, b, YEL); paint(x + .12, a, x + .28, b, YEL);
  for (let z = a; z < b - 2; z += 7) { paint(x - 4.3, z, x - 4.15, z + .9, WHT); paint(x + 4.15, z, x + 4.3, z + .9, WHT); } }
for (let j = 0; j <= NZ; j++) for (let i = 0; i < NX; i++) { const z = RZ(j), a = RX(i) + EDGE + 1.5, b = RX(i + 1) - EDGE - 1.5;
  paint(a, z - .28, b, z - .12, YEL); paint(a, z + .12, b, z + .28, YEL);
  for (let x = a; x < b - 2; x += 7) { paint(x, z - 4.3, x + .9, z - 4.15, WHT); paint(x, z + 4.15, x + .9, z + 4.3, WHT); } }
for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const x = RX(i), z = RZ(j);   // zebra crossings and stop bars on all four arms
  for (let k = -5.6; k < 5.7; k += 1.6) { paint(x + k, z - 9.6, x + k + .8, z - 7.2); paint(x + k, z + 7.2, x + k + .8, z + 9.6); paint(x - 9.6, z + k, x - 7.2, z + k + .8); paint(x + 7.2, z + k, x + 9.6, z + k + .8); }
  paint(x + .4, z + 10.2, x + 6.3, z + 10.6); paint(x - 6.3, z - 10.6, x - .4, z - 10.2); paint(x - 10.6, z + .4, x - 10.2, z + 6.3); paint(x + 10.2, z - 6.3, x + 10.6, z - .4); }
// blocks: a raised pavement slab each; the generators lay other surfaces on top
for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const L = lotOf(i, j); addBox(L.x0 - WALK, L.x1 + WALK, -.6, CURB, L.z0 - WALK, L.z1 + WALK, 'walk', { faces: 15 | 16 }); }
// the outer pavement and what closes the city in: an expressway wall to the west and north, water to the east and south
addBox(0, WALK, -.6, CURB, 0, CITY.d, 'walk', { faces: 15 | 16 }); addBox(CITY.w - WALK, CITY.w, -.6, CURB, 0, BRIDGE.z - 6.5, 'walk', { faces: 15 | 16 }); addBox(CITY.w - WALK, CITY.w, -.6, CURB, BRIDGE.z + 6.5, CITY.d, 'walk', { faces: 15 | 16 });   // the east pavement opens where the Harbor Bridge road leaves town
addBox(WALK, CITY.w - WALK, -.6, CURB, 0, WALK, 'walk', { faces: 15 | 16 }); addBox(WALK, CITY.w - WALK, -.6, CURB, CITY.d - WALK, CITY.d, 'walk', { faces: 15 | 16 });
addBox(-6, 0, 0, 8, -6, CITY.d, 'concrete', { tcol: 0x555a5e }); addBox(0, CITY.w, 0, 8, -6, 0, 'concrete', { tcol: 0x555a5e });
// unseen walls that keep anyone on foot or on wheels out of the water. They stop neither bullets nor eyes nor anything flying (see 82-air.js).
{ const wf = { a: false, s: false };
  solid(-48, 0, 0, 90, -48, WORLD.z1, wf); solid(-48, CITY.w, 0, 90, -48, 0, wf); solid(-48, CITY.w, -3, 90, CITY.d, WORLD.z1, wf);
  solid(CITY.w, ISLE.x0, -3, 90, -48, BRIDGE.z - BRIDGE.w, wf); solid(CITY.w, ISLE.x0, -3, 90, BRIDGE.z + BRIDGE.w, WORLD.z1, wf);                        // the channel, either side of the bridge
  solid(ISLE.x0, WORLD.x1, -3, 90, -48, ISLE.z0, wf); solid(ISLE.x0, WORLD.x1, -3, 90, ISLE.z1, WORLD.z1, wf); solid(ISLE.x1, WORLD.x1, -3, 90, ISLE.z0, ISLE.z1, wf); }   // round the island
deco(-6.3, -5.7, 8, 10.5, -6, CITY.d, 0x6f7a80); deco(-6, CITY.w, 8, 10.5, -6.3, -5.7, 0x6f7a80);                          // noise barrier along the expressway
for (let z = 6; z < CITY.d; z += 3) if (Math.abs(z - BRIDGE.z) > BRIDGE.w + .4) deco(CITY.w - .25, CITY.w - .1, CURB, CURB + 1.05, z - .06, z + .06, 0x30363a);            // harbour railing posts
[[0, BRIDGE.z - BRIDGE.w], [BRIDGE.z + BRIDGE.w, CITY.d]].forEach(q => { deco(CITY.w - .25, CITY.w - .1, CURB + 1, CURB + 1.1, q[0], q[1], 0x30363a); deco(CITY.w - .25, CITY.w - .1, CURB + .5, CURB + .56, q[0], q[1], 0x30363a); });
for (let x = 6; x < CITY.w; x += 3) deco(x - .06, x + .06, CURB, CURB + 1.05, CITY.d - .25, CITY.d - .1, 0x30363a);
deco(0, CITY.w, CURB + 1, CURB + 1.1, CITY.d - .25, CITY.d - .1, 0x30363a); deco(0, CITY.w, CURB + .5, CURB + .56, CITY.d - .25, CITY.d - .1, 0x30363a);
addBox(CITY.w, CITY.w + 1.2, -3, CURB, -6, BRIDGE.z - BRIDGE.w, 'concrete', { nocol: true }); addBox(CITY.w, CITY.w + 1.2, -3, CURB, BRIDGE.z + BRIDGE.w, CITY.d + 1.2, 'concrete', { nocol: true }); addBox(-6, CITY.w, -3, CURB, CITY.d, CITY.d + 1.2, 'concrete', { nocol: true });
// the skyline beyond: nothing out there can be reached
{ const far = (x0, z0, w, d, h, mat) => addBox(x0, x0 + w, 0, h, z0, z0 + d, mat, { nocol: true, faces: 15 | 16, top: 'roof', col: pick(W, mat === 'brick' ? BRICKS : [0xb8c2cc, 0x9aa8b5, 0xcfd3d6, 0x8796a3]) });
  for (let z = -40; z < CITY.d; z += wr(34, 60)) far(wr(-150, -50), z, wr(22, 40), wr(22, 36), wr(18, 95), pick(W, ['office', 'tower', 'brick', 'office']));
  for (let x = -40; x < CITY.w + 30; x += wr(34, 60)) far(x, wr(-160, -55), wr(22, 40), wr(22, 36), wr(18, 110), pick(W, ['office', 'tower', 'brick', 'tower']));
  for (let x = -60; x < CITY.w + 60; x += wr(40, 80)) far(x, CITY.d + wr(120, 190), wr(26, 50), wr(22, 30), wr(10, 46), pick(W, ['brick', 'office', 'brick2']));
  addBox(-60, CITY.w + 80, -3, 1.2, CITY.d + 104, CITY.d + 240, 'concrete', { nocol: true });                                    // far bank of the river
  const sx = 440;   // the freighters ride at anchor out past the airport
  addBox(CITY.w + sx + 150, CITY.w + sx + 330, -1, 6, 160, 190, 'flat', { nocol: true, col: 0x7a2a22 }); addBox(CITY.w + sx + 290, CITY.w + sx + 318, 6, 22, 166, 184, 'flat', { nocol: true, col: 0xd8d6cc });   // a freighter at anchor
  addBox(CITY.w + sx + 120, CITY.w + sx + 240, -1, 5, 380, 404, 'flat', { nocol: true, col: 0x1f3d5c }); addBox(CITY.w + sx + 212, CITY.w + sx + 234, 5, 17, 384, 400, 'flat', { nocol: true, col: 0xd8d6cc });
  for (let k = 0; k < 14; k++) addBox(CITY.w + sx + 160 + k * 8.4, CITY.w + sx + 168 + k * 8.4, 6, 6 + 2.6 * wi(1, 3), 163, 187, 'flat', { nocol: true, col: pick(W, [0xb3261e, 0x1f4e8c, 0xd9a521, 0x1d6b45, 0x8c9299]) });
  cyl(CITY.w + 62, -2, 24, 60, 3.2, 'flat', 0xe8e4da, { rTop: 2.2, a: false }); cyl(CITY.w + 62, 24, 27, 60, 2.4, 'glow', 0xffe9a8, { nocol: true }); cyl(CITY.w + 62, 27, 29.5, 60, 2.6, 'flat', 0xa3221b, { nocol: true, rTop: .2 });   // breakwater light
  addBox(CITY.w + 20, CITY.w + 66, -2, 1, 56, 64, 'concrete', { nocol: true }); }
const water = new T.Mesh(new T.PlaneGeometry(2600, 2600, 1, 1), new T.MeshLambertMaterial({ color: 0x35607a, map: noiseTex('#8fa9b8', .1, { blots: 20, grain: 4 }) }));
water.material.map.repeat.set(90, 90); water.rotation.x = -PI / 2; water.position.set(CITY.w / 2, -1.4, CITY.d / 2); water.receiveShadow = false; scene.add(water);
