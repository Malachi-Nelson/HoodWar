/* =====================================================================
   2c. SURFACES — the ground and the walls up close. Asphalt with real aggregate in it, pavements laid as slabs with joints between
       them (each slab a touch different, each sitting a touch off level), and for the lit look (Medium and up) a relief map for
       each — the stones stand out of the binder, the joints and mortar lines sink in, windows sit back in their frames — and a
       roughness map, whose blue channel also marks the low spots where rain will gather (98-weather.js). Built from numbers on
       the spot, tiled without a seam; Low gets the colour alone at half the size.
   ===================================================================== */
const SURF = { level: -1, tex: {}, gen: 0, fac: false };
// smooth noise that wraps at the edges: `cells` lattice points across
function tileNoise(S, cells, R) {
  const L = new Float32Array(cells * cells); for (let i = 0; i < L.length; i++) L[i] = R();
  const out = new Float32Array(S * S), k = cells / S;
  for (let y = 0; y < S; y++) { const fy = y * k, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = (y0 % cells) * cells, r1 = ((y0 + 1) % cells) * cells;
    for (let x = 0; x < S; x++) { const fx = x * k, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), c0 = x0 % cells, c1 = (x0 + 1) % cells, a = L[r0 + c0] + (L[r0 + c1] - L[r0 + c0]) * sx, b = L[r1 + c0] + (L[r1 + c1] - L[r1 + c0]) * sx;
      out[y * S + x] = a + (b - a) * sy; } }
  return out;
}
// the same at a quarter of the size, then stretched smoothly to full size: the slow drift of tone needs no more, and it is 16x cheaper
function fbmUp(S, cells, oct, R) { const s = S >> 2, lo = fbmTile(s, cells, oct, R), out = new Float32Array(S * S);
  for (let y = 0; y < S; y++) { const fy = y / 4 - .375, y0 = Math.floor(fy), ty = fy - y0, ra = ((y0 + s) % s) * s, rb = ((y0 + 1 + s) % s) * s;
    for (let x = 0; x < S; x++) { const fx = x / 4 - .375, x0 = Math.floor(fx), tx = fx - x0, ca = (x0 + s) % s, cb = (x0 + 1 + s) % s, a = lo[ra + ca] + (lo[ra + cb] - lo[ra + ca]) * tx, b = lo[rb + ca] + (lo[rb + cb] - lo[rb + ca]) * tx; out[y * S + x] = a + (b - a) * ty; } }
  return out; }
function fbmTile(S, cells, oct, R) { const out = new Float32Array(S * S); let amp = 1, tot = 0; for (let o = 0; o < oct; o++, amp *= .5) { const n = tileNoise(S, cells << o, R); tot += amp; for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; } for (let i = 0; i < out.length; i++) out[i] /= tot; return out; }
function pixTex(S, fill, linear) { const c = texCanvas(S), g = c.getContext('2d'), im = g.createImageData(S, S); fill(im.data); g.putImageData(im, 0, 0); const t = new T.CanvasTexture(c); if (linear) t.encoding = T.LinearEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; }
// a normal map from heights (wrapping): str is how steep a step of 1 between neighbours looks
function normalTex(h, S, str) { return pixTex(S, d => { for (let y = 0; y < S; y++) { const yu = ((y - 1 + S) % S) * S, yd = ((y + 1) % S) * S, yr = y * S;
  for (let x = 0; x < S; x++) { const xl = (x - 1 + S) % S, xr = (x + 1) % S, dx = (h[yr + xr] - h[yr + xl]) * str, dy = (h[yd + x] - h[yu + x]) * str, l = Math.sqrt(dx * dx + dy * dy + 1), i = (yr + x) * 4;
    d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (.5 / l + .5) * 255; d[i + 3] = 255; } } }, true); }
// --- asphalt: dark binder, aggregate of every size, a slow drift of tone; `warm` shifts it toward the browner lot surface
function asphaltSet(S, full, o) {
  const R = rng32(o.seed), N = S * S, tone = fbmUp(S, 4, 4, R), fine = new Float32Array(N), hgt = new Float32Array(N), stone = new Float32Array(N), tint = new Float32Array(N);
  for (let i = 0; i < N; i++) { fine[i] = R(); hgt[i] = fine[i] * .35 + tone[i] * 3; }
  const sc = S / 1024, nst = Math.round(N * .03);
  for (let k = 0; k < nst; k++) { const cx = R() * S, cy = R() * S, r = (.5 + R() * R() * 1.7) * Math.max(.8, sc), v = .35 + R() * .65, w = R() * .3 - .1, r2 = r * r;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 > r2) continue;
      const i = ((y + S) % S) * S + ((x + S) % S), f = 1 - d2 / r2; if (stone[i] < v * f) { stone[i] = v * f; tint[i] = w; } hgt[i] += f * .7; } }
  const puddle = full ? fbmUp(S, 3, 3, R) : null;
  const map = pixTex(S, d => { for (let i = 0; i < N; i++) { const t = (tone[i] - .5) * o.tone, s = stone[i], f = (fine[i] - .5) * 10, j = i * 4, b = o.base;
    d[j] = clamp(b[0] * (1 + t) + f + s * o.stone * (1 + tint[i]), 0, 255); d[j + 1] = clamp(b[1] * (1 + t) + f + s * o.stone, 0, 255); d[j + 2] = clamp(b[2] * (1 + t) + f + s * o.stone * (1 - tint[i] * .6), 0, 255); d[j + 3] = 255; } });
  if (!full) return { map };
  const rough = pixTex(S, d => { for (let i = 0; i < N; i++) { const j = i * 4; d[j] = 0; d[j + 1] = clamp(222 + (fine[i] - .5) * 40 - stone[i] * 26 + (tone[i] - .5) * 30, 0, 255); d[j + 2] = clamp((puddle[i] - .56) * 900, 0, 255); d[j + 3] = 255; } }, true);
  return { map, nrm: normalTex(hgt, S, 1.6 * Math.min(1, S / 1024) + .6), rough };
}
// --- pavement: concrete slabs `slab` px across, joints between, each slab its own shade and its own slight tilt; pores, stains
function slabSet(S, full, o) {
  const R = rng32(o.seed), N = S * S, tone = fbmUp(S, 6, 4, R), n = Math.round(S / o.slab), shade = [], tilt = [], hgt = new Float32Array(N), jw = Math.max(2, Math.round(S / 340)), sc = S / 1024;
  for (let k = 0; k < n * n; k++) { shade.push((R() - .5) * o.vary); tilt.push([(R() - .5) * .0016, (R() - .5) * .0016]); }
  const pores = new Float32Array(N); for (let k = 0; k < N * .012; k++) pores[(R() * N) | 0] = .4 + R() * .6;
  const crack = new Uint8Array(N); for (let k = 0; k < n * n * .12; k++) { const s = (R() * n * n) | 0, sx = (s % n) * o.slab, sy = Math.floor(s / n) * o.slab; let x = sx + R() * o.slab, y = sy + (R() < .5 ? 0 : o.slab), dx = (R() - .5) * .8, dy = y === sy ? 1 : -1; if (R() < .5) { [x, y] = [sx + (R() < .5 ? 0 : o.slab), sy + R() * o.slab]; dx = x === sx ? 1 : -1; dy = (R() - .5) * .8; }
    for (let st = 0; st < o.slab * 1.2; st++) { x += dx + (R() - .5) * .9; y += dy + (R() - .5) * .9; if (x < sx || x >= sx + o.slab || y < sy || y >= sy + o.slab) break; crack[((y | 0) % S) * S + ((x | 0) % S)] = 1; } }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, sx = Math.floor(x / o.slab), sy = Math.floor(y / o.slab), si = (sy % n) * n + (sx % n), lx = x % o.slab, ly = y % o.slab, jt = lx < jw || ly < jw;
    hgt[i] = jt ? -2.2 : (tone[i] * 1.2 + (lx * tilt[si][0] + ly * tilt[si][1]) * o.slab * .9 - pores[i] * .6 - crack[i] * 1.2); }
  const map = pixTex(S, d => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, j = i * 4, sx = Math.floor(x / o.slab), sy = Math.floor(y / o.slab), si = (sy % n) * n + (sx % n), lx = x % o.slab, ly = y % o.slab, jt = lx < jw || ly < jw;
    const k = (1 + shade[si] + (tone[i] - .5) * o.tone) * (jt ? .72 : 1) * (1 - pores[i] * .22) * (crack[i] ? .55 : 1), f = ((i * 2654435761 >>> 24) / 255 - .5) * 9;
    d[j] = clamp(o.base[0] * k + f, 0, 255); d[j + 1] = clamp(o.base[1] * k + f, 0, 255); d[j + 2] = clamp(o.base[2] * k + f, 0, 255); d[j + 3] = 255; } });
  if (!full) return { map };
  const puddle = fbmUp(S, 3, 2, R);
  const rough = pixTex(S, d => { for (let i = 0; i < N; i++) { const j = i * 4; d[j] = 0; d[j + 1] = clamp(235 - pores[i] * -15 + (tone[i] - .5) * 30, 0, 255); d[j + 2] = clamp((puddle[i] - .62) * 700 + (hgt[i] < -2 ? 60 : 0), 0, 255); d[j + 3] = 255; } }, true);
  return { map, nrm: normalTex(hgt, S, .6 * sc + .25), rough };
}
// --- a facade's relief, drawn over the same layout as its texture (facadeTex): mortar and joints sink in, windows sit back, frames stand out
function facadeRelief(o) {
  const S = 512, c = texCanvas(S), g = c.getContext('2d'), cw = S / o.bays, ch = S / o.floors;
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, S, S);
  if (o.style === 'brick') { g.fillStyle = 'rgb(70,70,70)'; for (let y = 0; y < S; y += 7) { g.fillRect(0, y, S, 1); for (let bx = (y / 7 % 2) * 9; bx < S; bx += 18) g.fillRect(bx, y, 1, 7); } }
  if (o.style === 'siding') for (let y = 0; y < S; y += 9) { const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, 'rgb(100,100,100)'); gr.addColorStop(1, 'rgb(160,160,160)'); g.fillStyle = gr; g.fillRect(0, y, S, 9); }
  if (o.style === 'panel') { g.fillStyle = 'rgb(84,84,84)'; for (let i = 0; i <= o.bays; i++) g.fillRect(i * cw - 1, 0, 2, S); for (let j = 0; j <= o.floors; j++) g.fillRect(0, j * ch - 1, S, 2); }
  if (o.style === 'glass') { g.fillStyle = 'rgb(150,150,150)'; for (let i = 0; i <= o.bays; i++) g.fillRect(i * cw - 2, 0, 4, S); for (let j = 0; j <= o.floors; j++) g.fillRect(0, j * ch - 2, S, 4); }
  for (let j = 0; j < o.floors; j++) for (let i = 0; i < o.bays; i++) {
    const ww = cw * o.ww, wh = ch * o.wh, wx = i * cw + (cw - ww) / 2, wy = j * ch + (ch - wh) * (o.wy === undefined ? .45 : o.wy);
    if (o.style !== 'glass') { g.fillStyle = 'rgb(176,176,176)'; g.fillRect(wx - 3, wy - 5, ww + 6, 5); }
    g.fillStyle = 'rgb(30,30,30)'; g.fillRect(wx, wy, ww, wh); g.strokeStyle = 'rgb(112,112,112)'; g.lineWidth = o.style === 'glass' ? 1 : 2; g.strokeRect(wx + .5, wy + .5, ww - 1, wh - 1);
    if (o.mull) { g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); if (o.mull > 1) { g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); } g.stroke(); }
  }
  const d = g.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < h.length; i++) h[i] = d[i * 4] / 255 * 6;
  return normalTex(h, S, o.style === 'glass' ? .5 : 1);
}
// --- put them on the materials (both the plain and the lit twin); `level` 0 is Low
const SURF_SETS = {
  asphalt: (S, f) => asphaltSet(S, f, { seed: 11, base: [60, 62, 66], tone: .2, stone: 40 }),
  lot: (S, f) => asphaltSet(S, f, { seed: 12, base: [66, 66, 67], tone: .24, stone: 36 }),
  walk: (S, f) => slabSet(S, f, { seed: 13, base: [170, 168, 160], slab: S / 4, vary: .06, tone: .12 }),
  plaza: (S, f) => slabSet(S, f, { seed: 14, base: [186, 180, 168], slab: S / 8, vary: .12, tone: .1 }),
};
const SURF_NS = { asphalt: .9, lot: .9, walk: .8, plaza: .7 };
const SURF_SIZE = { asphalt: 1024, walk: 1024, lot: 512, plaza: 512 };
// Built a set at a time between frames (the page stays live while it works; until each is ready the plain texture stands in), or all
// at once under test. A change of level part way through starts again.
function applySurfaces(level) {
  if (level === SURF.level) return; SURF.level = level; const gen = SURF.gen = (SURF.gen || 0) + 1, t0 = performance.now(), full = level > 0, keys = Object.keys(SURF_SETS);
  const one = key => { const M = MATS[key]; if (!M) return; const old = SURF.tex[key]; const set = SURF_SETS[key](full ? SURF_SIZE[key] : 512, full); SURF.tex[key] = Object.values(set);
    [M.low || M.mat, M.pbr].forEach(m => { if (!m) return; m.map = set.map; if (m.isMeshStandardMaterial) { m.normalMap = set.nrm || null; m.roughnessMap = set.rough || null; m.normalScale.set(SURF_NS[key], SURF_NS[key]); } m.needsUpdate = true; });
    const lo = M.low || M.mat; lo.userData.nrm = set.nrm || null; lo.userData.rough = set.rough || null; lo.userData.ns = SURF_NS[key]; if (old) old.forEach(t => t.dispose());
    const a = Math.min(8, renderer.capabilities.getMaxAnisotropy()), an = [1, 4, a][GQ.tex] || 4; SURF.tex[key].forEach(t => { t.anisotropy = an; }); };
  const facades = () => { if (!full || SURF.fac) return; SURF.fac = true; for (const key in MATS) { const M = MATS[key], lo = M.low || M.mat; if (!lo.userData || !lo.userData.fo || lo.userData.nrm) continue;
    lo.userData.nrm = facadeRelief(lo.userData.fo); lo.userData.ns = .55; if (M.pbr && M.pbr.isMeshStandardMaterial) { M.pbr.normalMap = lo.userData.nrm; M.pbr.normalScale.set(.55, .55); M.pbr.needsUpdate = true; } } };
  if (TEST) { keys.forEach(one); facades(); console.log('surfaces', level, Math.round(performance.now() - t0) + ' ms'); return; }
  const next = k => { if (gen !== SURF.gen) return; if (k < keys.length) { one(keys[k]); setTimeout(() => next(k + 1), 30); } else facades(); };
  setTimeout(() => next(0), 60);
}
