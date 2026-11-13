/* =====================================================================
   3. COLLISION + RAYS — every solid is an axis-aligned box that is both
      collider and walkable surface (stairs are stacked boxes).
      flags: p = blocks people and cars, a = blocks AI sight, s = stops bullets
   ===================================================================== */
const boxes = [];
const NX = 7, NZ = 6, PX = 100, PZ = 84, ROAD = 13, WALK = 3.5, EDGE = 10;      // blocks across and down, block pitch, carriageway, sidewalk, road centre to lot line
const CITY = { w: NX * PX + 20, d: NZ * PZ + 20 };                                // 720 x 524 m
// Port Calder International sits on an island across the harbour channel to the east, joined to the city by the Harbor Bridge,
// which carries the road along the line of the fourth cross street (z of RZ(3)). Everything else out there is water.
const ISLE = { x0: 830, x1: 1120, z0: -10, z1: 540 }, BRIDGE = { z: EDGE + 3 * PZ, w: 10 };   // BRIDGE.w: half its width, pavements included
const WORLD = { x0: -48, z0: -48, x1: ISLE.x1 + 48, z1: CITY.d + 48 };
const onLand = (x, z) => (x >= -6 && x <= CITY.w && z >= -6 && z <= CITY.d) || (x >= ISLE.x0 && x <= ISLE.x1 && z >= ISLE.z0 && z <= ISLE.z1) || (x > CITY.w && x < ISLE.x0 && Math.abs(z - BRIDGE.z) <= BRIDGE.w);
const AIRSPACE = { x0: -30, x1: ISLE.x1 + 140, z0: -30, z1: CITY.d + 110, top: 240 };   // how far a helicopter may go before it is turned back
const CELL = 16, GW = Math.ceil((WORLD.x1 - WORLD.x0) / CELL), GH = Math.ceil((WORLD.z1 - WORLD.z0) / CELL);
const gridCells = new Array(GW * GH); for (let i = 0; i < gridCells.length; i++) gridCells[i] = [];
const cellX = x => clamp(Math.floor((x - WORLD.x0) / CELL), 0, GW - 1), cellZ = z => clamp(Math.floor((z - WORLD.z0) / CELL), 0, GH - 1);
function gridAdd(b) { const a0 = cellX(b.x0), a1 = cellX(b.x1), c0 = cellZ(b.z0), c1 = cellZ(b.z1); for (let cz = c0; cz <= c1; cz++) for (let cx = a0; cx <= a1; cx++) gridCells[cz * GW + cx].push(b); }
function solid(x0, x1, y0, y1, z0, z1, o) {
  o = o || {};
  const b = { x0, x1, y0, y1, z0, z1, p: o.p !== false, a: o.a !== false, s: o.s !== false, n: o.n !== undefined ? !!o.n : o.p !== false, off: false, rs: 0 };   // n: stands in the way of a walking route
  boxes.push(b); gridAdd(b); return b;
}
const COL = { x: 0, z: 0, n: 0, nx: 0, nz: 0 };
// push a circle out of every box whose height span overlaps ya..yb; the result is left in COL
function pushOut(x, z, r, ya, yb, f) {
  let n = 0, sx = x, sz = z;
  for (let it = 0; it < 2; it++) {
    const a0 = cellX(x - r), a1 = cellX(x + r), c0 = cellZ(z - r), c1 = cellZ(z + r);
    for (let cz = c0; cz <= c1; cz++) for (let cx = a0; cx <= a1; cx++) {
      const L = gridCells[cz * GW + cx];
      for (let i = 0; i < L.length; i++) {
        const b = L[i]; if (b.off || !b[f]) continue;
        if (b.y1 <= ya || b.y0 >= yb) continue;
        const px = clamp(x, b.x0, b.x1), pz = clamp(z, b.z0, b.z1), dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        n++;
        if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; x += dx * k; z += dz * k; }
        else { const l = x - b.x0, rr = b.x1 - x, nn = z - b.z0, s = b.z1 - z, m = Math.min(l, rr, nn, s); if (m === l) x = b.x0 - r; else if (m === rr) x = b.x1 + r; else if (m === nn) z = b.z0 - r; else z = b.z1 + r; }
      }
    }
  }
  COL.x = x; COL.z = z; COL.n = n;
  if (n) { const l = hyp(x - sx, z - sz) || 1; COL.nx = (x - sx) / l; COL.nz = (z - sz) / l; }
  return n;
}
function collide(e, r, f, h) { if (pushOut(e.x, e.z, r, e.y + CFG.step + .001, e.y + h - .05, f)) { e.x = COL.x; e.z = COL.z; return true; } return false; }
function groundAt(x, z, feet, f, st) {
  let g = -50; const r = .15, lim = feet + (st === undefined ? CFG.step : st) + .001;
  const a0 = cellX(x - r), a1 = cellX(x + r), c0 = cellZ(z - r), c1 = cellZ(z + r);
  for (let cz = c0; cz <= c1; cz++) for (let cx = a0; cx <= a1; cx++) {
    const L = gridCells[cz * GW + cx];
    for (let i = 0; i < L.length; i++) { const b = L[i]; if (b.off || !b[f]) continue; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r && b.y1 <= lim && b.y1 > g) g = b.y1; }
  }
  return g;
}
function ceilingAt(e, r, f, h, ny) {   // head bump while rising
  const a0 = cellX(e.x - r), a1 = cellX(e.x + r), c0 = cellZ(e.z - r), c1 = cellZ(e.z + r); let top = ny;
  for (let cz = c0; cz <= c1; cz++) for (let cx = a0; cx <= a1; cx++) {
    const L = gridCells[cz * GW + cx];
    for (let i = 0; i < L.length; i++) { const b = L[i]; if (b.off || !b[f]) continue; if (e.x > b.x0 - r * .8 && e.x < b.x1 + r * .8 && e.z > b.z0 - r * .8 && e.z < b.z1 + r * .8 && b.y0 >= e.y + h - .3 && b.y0 < top + h) { top = b.y0 - h; e.vy = 0; } }
  }
  return top;
}
function moveEntity(e, dx, dz, dt, r, f, h) {
  e.x += dx; e.z += dz; collide(e, r, f, h);
  const was = e.onGround;
  e.vy -= CFG.gravity * dt; let ny = e.y + e.vy * dt;
  if (e.vy > 0) ny = ceilingAt(e, r, f, h, ny);
  const g = groundAt(e.x, e.z, e.y, f);
  if (ny <= g || (was && e.vy <= 0 && e.y - g <= CFG.step + .01)) { e.fell = e.vy; ny = g; e.vy = 0; e.onGround = true; } else e.onGround = false;
  e.y = ny;
}
function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let t0 = 0, t1 = 1e9, a, c, s;
  if (Math.abs(dx) < 1e-9) { if (ox < b.x0 || ox > b.x1) return Infinity; } else { a = (b.x0 - ox) / dx; c = (b.x1 - ox) / dx; if (a > c) { s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return Infinity; }
  if (Math.abs(dy) < 1e-9) { if (oy < b.y0 || oy > b.y1) return Infinity; } else { a = (b.y0 - oy) / dy; c = (b.y1 - oy) / dy; if (a > c) { s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return Infinity; }
  if (Math.abs(dz) < 1e-9) { if (oz < b.z0 || oz > b.z1) return Infinity; } else { a = (b.z0 - oz) / dz; c = (b.z1 - oz) / dz; if (a > c) { s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return Infinity; }
  return t0;
}
// nearest box along a ray: walks the grid cell by cell and stops as soon as a hit lies inside the cell it is leaving
let rayStamp = 0;
function rayWorld(ox, oy, oz, dx, dy, dz, f, maxT) {
  let best = maxT; const stamp = ++rayStamp;
  let cx = Math.floor((ox - WORLD.x0) / CELL), cz = Math.floor((oz - WORLD.z0) / CELL);
  if (cx < 0 || cz < 0 || cx >= GW || cz >= GH) return best;
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1, adx = Math.abs(dx), adz = Math.abs(dz);
  const tDX = adx > 1e-9 ? CELL / adx : Infinity, tDZ = adz > 1e-9 ? CELL / adz : Infinity;
  let tMX = adx > 1e-9 ? (dx > 0 ? (cx + 1) * CELL + WORLD.x0 - ox : ox - (cx * CELL + WORLD.x0)) / adx : Infinity;
  let tMZ = adz > 1e-9 ? (dz > 0 ? (cz + 1) * CELL + WORLD.z0 - oz : oz - (cz * CELL + WORLD.z0)) / adz : Infinity;
  for (let guard = 0; guard < 200; guard++) {
    const L = gridCells[cz * GW + cx];
    for (let i = 0; i < L.length; i++) { const b = L[i]; if (b.rs === stamp || b.off || !b[f]) continue; b.rs = stamp; const h = rayBox(ox, oy, oz, dx, dy, dz, b); if (h < best) best = h; }
    const tExit = tMX < tMZ ? tMX : tMZ;
    if (best <= tExit || tExit >= maxT) break;
    if (tMX < tMZ) { cx += sx; tMX += tDX; } else { cz += sz; tMZ += tDZ; }
    if (cx < 0 || cz < 0 || cx >= GW || cz >= GH) break;
  }
  return best;
}
function los(ax, ay, az, bx, by, bz, f) { const dx = bx - ax, dy = by - ay, dz = bz - az, d = hyp(dx, dy, dz); if (d < .05) return true; return rayWorld(ax, ay, az, dx / d, dy / d, dz / d, f || 'a', d) >= d - .02; }
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) { const lx = cx - ox, ly = cy - oy, lz = cz - oz, tc = lx * dx + ly * dy + lz * dz; if (tc < 0) return Infinity; const d2 = lx * lx + ly * ly + lz * lz - tc * tc; if (d2 > r * r) return Infinity; return tc - Math.sqrt(r * r - d2); }
