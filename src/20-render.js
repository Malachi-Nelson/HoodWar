/* =====================================================================
   2. RENDERER, SKY, LIGHT, MATERIALS
   ===================================================================== */
const canvas = $('view');
let renderer;
try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('o-text').textContent = 'This browser could not start WebGL, so the game cannot run here.'; $('deploy').hidden = true; return; }
// --- graphics quality: a preset from Low (phones, old laptops) to Ultra, or each setting by hand (Custom). What each one does is in
//     21-post.js. res caps the pixel ratio; shadow 0-3; tex 0-2 (texture filtering and size); view 0-3 (how far you see); aa 0/1 (FXAA);
//     env: physically based materials lit and reflecting the sky; ao 0-2 (ambient occlusion off/half/full); post: the HDR pipeline with
//     bloom and colour grading; dof, mblur: optional depth of field and motion blur.
const GQ_PRESETS = {
  low:    { res: 1,    shadow: 0, tex: 0, view: 0, aa: 0, env: 0, ao: 0, post: 0, bloom: 0, dof: 0, mblur: 0 },
  medium: { res: 1.25, shadow: 1, tex: 1, view: 1, aa: 1, env: 1, ao: 0, post: 1, bloom: 1, dof: 0, mblur: 0 },
  high:   { res: 1.5,  shadow: 2, tex: 2, view: 2, aa: 1, env: 1, ao: 1, post: 1, bloom: 1, dof: 0, mblur: 0 },
  ultra:  { res: 2,    shadow: 3, tex: 2, view: 3, aa: 1, env: 1, ao: 2, post: 1, bloom: 1, dof: 0, mblur: 0 },
};
const GQ_KEYS = Object.keys(GQ_PRESETS.low), GQ = Object.assign({ preset: 'high' }, GQ_PRESETS.high);
{ let sv = null; try { sv = JSON.parse(localStorage.getItem('pc-gfx2') || 'null'); } catch (e) {}
  if (!sv || typeof sv !== 'object') { let old = null; try { old = localStorage.getItem('pc-gfx'); } catch (e) {} sv = { preset: old === 'low' || (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'low' : 'high' }; }
  if (GQ_PRESETS[sv.preset]) Object.assign(GQ, GQ_PRESETS[sv.preset], { preset: sv.preset });
  else if (sv.preset === 'custom') { GQ.preset = 'custom'; GQ_KEYS.forEach(k => { if (typeof sv[k] === 'number') GQ[k] = sv[k]; }); } }
const GFX = { get low() { return GQ.preset === 'low'; }, auto: false };   // older code asks this
renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.autoClear = false;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.fog = new T.Fog(0x9fb0c4, 90, 640);
const camera = new T.PerspectiveCamera(70, 1, .12, 2600);
camera.rotation.order = 'YXZ';
scene.add(camera);
const vmScene = new T.Scene(), vmCam = new T.PerspectiveCamera(52, 1, .01, 10);
const vmHemi = new T.HemisphereLight(0xcfd8e0, 0x30343a, .8), vmKey = new T.DirectionalLight(0xfff0d8, .7);
vmKey.position.set(-1.2, 2, 1.4); vmScene.add(vmHemi); vmScene.add(vmKey);

const hemi = new T.HemisphereLight(0xbcd0e8, 0x4a4238, .7); scene.add(hemi);
const sun = new T.DirectionalLight(0xffe0b0, 1); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .06;
{ const c = sun.shadow.camera; c.left = -95; c.right = 95; c.top = 95; c.bottom = -95; c.near = 1; c.far = 520; c.updateProjectionMatrix(); }
scene.add(sun); scene.add(sun.target);
const moon = new T.DirectionalLight(0x7f9bd0, 0); moon.position.set(-.45, 1, .35); scene.add(moon);

// --- sky: the hour's gradient, the sun and its glow, a layer of cloud that drifts with the wind and thickens with the weather (lit
//     by the sun by day, by the moon and the city's own glow at night), stars and the moon. The same material is drawn into the
//     environment map that lights and reflects off everything (21-post.js).
const SKY = { top: new T.Color(), hor: new T.Color(), sunCol: new T.Color(), sunDir: new T.Vector3(0, 1, 0), sunAmt: { value: 1 }, night: { value: 0 },
  cloud: { value: 0 }, time: { value: 0 }, cLit: new T.Color(1, 1, 1), cShade: new T.Color(.5, .5, .55), glow: new T.Color(0, 0, 0), flash: { value: 0 }, moonDir: new T.Vector3(-.4, .6, .5).normalize(), stars: { value: 0 } };
const skyMat = new T.ShaderMaterial({
  uniforms: { top: { value: SKY.top }, hor: { value: SKY.hor }, sunCol: { value: SKY.sunCol }, sunDir: { value: SKY.sunDir }, sunAmt: SKY.sunAmt, night: SKY.night, cloud: SKY.cloud, time: SKY.time,
    cLit: { value: SKY.cLit }, cShade: { value: SKY.cShade }, glow: { value: SKY.glow }, flash: SKY.flash, moonDir: { value: SKY.moonDir }, stars: SKY.stars },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunCol; uniform vec3 sunDir; uniform float sunAmt; uniform float night; uniform float cloud; uniform float time;
    uniform vec3 cLit; uniform vec3 cShade; uniform vec3 glow; uniform float flash; uniform vec3 moonDir; uniform float stars; varying vec3 vDir;
    float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), f.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vn(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return v; }
    void main() {
      vec3 d = normalize(vDir); float h = max(d.y, 0.0), s = max(dot(d, sunDir), 0.0);
      vec3 c = mix(hor, top, pow(h, 0.45));
      if (d.y < 0.0) c = mix(hor, hor * 0.55 + glow * 0.4, clamp(-d.y * 3.0, 0.0, 1.0));                       // below the horizon: the haze over the land
      c += glow * pow(1.0 - h, 6.0) * 0.6;                                                                       // the city's glow low in the night sky
      c += sunCol * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.5) * sunAmt;                                         // the glow round the sun
      vec3 q = floor(d * 190.0); float st = step(0.9982, fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453));
      float sky = 1.0;
      // cloud: one layer, seen in perspective, drifting; how much of it there is comes from the weather
      if (d.y > 0.0) {
        vec2 p = d.xz / (d.y + 0.06) * 1.25 + vec2(time * 0.006, time * 0.0025);
        float n = fbm(p), n2 = fbm(p * 2.3 + vec2(time * 0.01, 0.0));
        float cov = mix(0.66, 0.08, cloud), den = smoothstep(cov, cov + 0.3, n * 0.8 + n2 * 0.25) * smoothstep(0.0, 0.18, d.y);
        float lit = clamp(0.55 + 0.45 * pow(s, 4.0) - (n - 0.5) * 0.6, 0.0, 1.0);
        vec3 cc = mix(cShade, cLit, lit) + sunCol * pow(s, 10.0) * 0.6 * sunAmt + glow * 0.5 + vec3(flash);
        c = mix(c, cc, den); sky = 1.0 - den;
      }
      c += sunCol * smoothstep(0.9993, 0.9997, s) * 2.5 * sunAmt * sky;                                           // the sun itself
      float m = max(dot(d, moonDir), 0.0); c += vec3(0.9, 0.92, 1.0) * (smoothstep(0.99955, 0.99975, m) * 1.4 + pow(m, 80.0) * 0.08) * night * sky;
      c += vec3(st) * stars * smoothstep(0.05, 0.3, d.y) * sky * 0.9;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`,
  side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
});
const skyDome = new T.Mesh(new T.SphereGeometry(1800, 32, 16), skyMat); skyDome.renderOrder = -10; skyDome.frustumCulled = false; scene.add(skyDome);

// --- procedural textures
function texCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function asTex(c, rep) { const t = new T.CanvasTexture(c); if (rep !== false) t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; }
function noiseTex(base, vary, o) {
  o = o || {}; const S = o.size || 256, c = texCanvas(S), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < (o.n || 3500); i++) { const v = rand() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${rand() * vary})`; g.fillRect(rand() * S, rand() * S, 1 + rand() * (o.grain || 3), 1 + rand() * (o.grain || 3)); }
  if (o.lines) { g.strokeStyle = o.lineCol || 'rgba(0,0,0,.25)'; g.lineWidth = o.lineW || 1; for (let y = 0; y < S; y += o.lines) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(S, y + .5); g.stroke(); } }
  if (o.vlines) { g.strokeStyle = o.lineCol || 'rgba(0,0,0,.25)'; g.lineWidth = o.lineW || 1; for (let x = 0; x < S; x += o.vlines) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, S); g.stroke(); } }
  if (o.cracks) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; for (let i = 0; i < o.cracks; i++) { let x = rand() * S, y = rand() * S; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rand() - .5) * 46; y += (rand() - .5) * 46; g.lineTo(x, y); } g.stroke(); } }
  if (o.blots) for (let i = 0; i < o.blots; i++) { const x = rand() * S, y = rand() * S, r = 8 + rand() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${.05 + rand() * .12})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  return asTex(c);
}
// A building face: `bays` windows across by `floors` up on one tile. The wall is drawn pale so each building's own colour can tint it.
function facadeTex(o) {
  const S = 512, c = texCanvas(S), g = c.getContext('2d'), e = texCanvas(S), x = e.getContext('2d'), rc = texCanvas(S), rg = rc.getContext('2d');   // rc: roughness, for the lit (PBR) look: walls rough, glass smooth
  rg.fillStyle = o.style === 'glass' ? 'rgb(70,70,70)' : 'rgb(220,220,220)'; rg.fillRect(0, 0, S, S); rg.fillStyle = 'rgb(22,22,22)';
  const cw = S / o.bays, ch = S / o.floors;
  g.fillStyle = o.wall || '#d9d2c8'; g.fillRect(0, 0, S, S); x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) { const v = rand() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${rand() * .07})`; g.fillRect(rand() * S, rand() * S, 2 + rand() * 4, 1 + rand() * 2); }
  if (o.style === 'brick') { g.strokeStyle = 'rgba(60,40,30,.2)'; g.lineWidth = 1; for (let y = 0; y < S; y += 7) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(S, y + .5); g.stroke(); for (let bx = (y / 7 % 2) * 9; bx < S; bx += 18) { g.beginPath(); g.moveTo(bx + .5, y); g.lineTo(bx + .5, y + 7); g.stroke(); } } }
  if (o.style === 'siding') { g.strokeStyle = 'rgba(0,0,0,.16)'; for (let y = 0; y < S; y += 9) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(S, y + .5); g.stroke(); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, y + 1, S, 2); } }
  if (o.style === 'panel') { g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; for (let i = 0; i <= o.bays; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, S); g.stroke(); } for (let j = 0; j <= o.floors; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(S, j * ch); g.stroke(); } }
  for (let j = 0; j < o.floors; j++) for (let i = 0; i < o.bays; i++) {
    const ww = cw * o.ww, wh = ch * o.wh, wx = i * cw + (cw - ww) / 2, wy = j * ch + (ch - wh) * (o.wy === undefined ? .45 : o.wy);
    if (o.style !== 'glass') { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(wx - 3, wy - 5, ww + 6, 5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx - 3, wy + wh, ww + 6, 4); }
    rg.fillRect(wx, wy, ww, wh); const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, o.glass0 || '#27323f'); gr.addColorStop(1, o.glass1 || '#3d4c5c'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(190,215,235,.12)'; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww * .55, wy); g.lineTo(wx + ww * .8, wy); g.lineTo(wx + ww * .25, wy + wh); g.fill();
    const r = rand();
    if (o.style !== 'glass' && r < .45) { g.fillStyle = pick(rand, ['rgba(226,214,190,.75)', 'rgba(200,205,210,.7)', 'rgba(170,120,95,.6)', 'rgba(120,140,150,.6)']); g.fillRect(wx, wy, ww, wh * (.25 + rand() * .5)); }
    g.strokeStyle = o.frame || 'rgba(235,235,230,.85)'; g.lineWidth = o.style === 'glass' ? 1 : 2; g.strokeRect(wx + .5, wy + .5, ww - 1, wh - 1);
    if (o.mull) { g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); if (o.mull > 1) { g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); } g.stroke(); }
    if (rand() < (o.lit === undefined ? .4 : o.lit)) { const k = pick(rand, o.lights || ['#ffd9a0', '#ffe8c0', '#f3c27a', '#cfe2ff']); const lg = x.createLinearGradient(0, wy, 0, wy + wh); lg.addColorStop(0, k); lg.addColorStop(1, '#6b4a2a'); x.fillStyle = lg; x.globalAlpha = .55 + rand() * .45; x.fillRect(wx + 1, wy + 1, ww - 2, wh - 2); x.globalAlpha = 1; if (o.mull) { x.fillStyle = '#000'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh); } }
  }
  const rough = asTex(rc); rough.encoding = T.LinearEncoding; return { map: asTex(c), em: asTex(e), rough };
}
// --- geometry buffers: everything that never moves is poured into a handful of big meshes, one per material
class GeoBuf {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  // a,b,c,d counter-clockwise seen from the side the normal points to; uv runs (u0,v0) at a to (u1,v1) at c
  quad(a, b, c, d, nx, ny, nz, u0, v0, u1, v1, col) {
    const P = this.p, N = this.n, U = this.u, C = this.c, r = col ? col[0] : 1, g = col ? col[1] : 1, bl = col ? col[2] : 1;
    P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    for (let i = 0; i < 6; i++) { N.push(nx, ny, nz); C.push(r, g, bl); }
    U.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
  }
  geo(g, m, col) {
    const src = g.index ? g.toNonIndexed() : g, pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv, v = new T.Vector3(), nm = m ? new T.Matrix3().getNormalMatrix(m) : null;
    const r = col ? col[0] : 1, gg = col ? col[1] : 1, b = col ? col[2] : 1;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); if (m) v.applyMatrix4(m); this.p.push(v.x, v.y, v.z);
      if (nor) { v.fromBufferAttribute(nor, i); if (nm) v.applyMatrix3(nm).normalize(); this.n.push(v.x, v.y, v.z); } else this.n.push(0, 1, 0);
      if (uv) this.u.push(uv.getX(i), uv.getY(i)); else this.u.push(0, 0);
      this.c.push(r, gg, b);
    }
    if (src !== g) src.dispose();
  }
  box(x0, x1, y0, y1, z0, z1, col, m) { const g = new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); this.geo(g, m, col); g.dispose(); }
  build() {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); return g;
  }
}
const hexCol = h => [s2l((h >> 16 & 255) / 255), s2l((h >> 8 & 255) / 255), s2l((h & 255) / 255)];   // linear, for vertex colours
const colOf = c => c === undefined || c === null ? null : Array.isArray(c) ? c : hexCol(c);

// --- materials for the standing city. tu/tv: metres covered by one repeat of the texture.
const MATS = {};
const lam = o => new T.MeshLambertMaterial(Object.assign({ vertexColors: true }, o));
function defMat(key, mat, tu, tv, o) { MATS[key] = Object.assign({ mat, tu: tu || 4, tv: tv || tu || 4, cast: true, recv: true }, o || {}); return mat; }
const FACADES = [];   // materials whose windows light up after dark
function defFacade(key, o, bayW, floorH) { const t = facadeTex(o), m = lam({ map: t.map, emissiveMap: t.em, emissive: 0x000000 }); m.userData.rough = t.rough; FACADES.push(m); return defMat(key, m, o.bays * (bayW || 3), o.floors * (floorH || 3.2)); }
defMat('asphalt', lam({ map: noiseTex('#3a3c40', .1, { cracks: 14, blots: 16 }) }), 12, 12, { cast: false });
defMat('walk',    lam({ map: noiseTex('#a9a7a0', .07, { lines: 64, vlines: 64, lineCol: 'rgba(0,0,0,.18)', blots: 8 }) }), 6, 6, { cast: false });
defMat('plaza',   lam({ map: noiseTex('#b9b4a8', .05, { lines: 32, vlines: 32, lineCol: 'rgba(0,0,0,.12)' }) }), 4, 4, { cast: false });
defMat('grass',   lam({ map: noiseTex('#5e7f42', .12, { grain: 2, n: 6000, blots: 10 }) }), 10, 10, { cast: false });
defMat('dirt',    lam({ map: noiseTex('#8a7557', .12, { blots: 14 }) }), 8, 8, { cast: false });
defMat('court',   lam({ map: noiseTex('#4d6f8a', .06, { blots: 6 }) }), 8, 8, { cast: false });
defMat('roof',    lam({ map: noiseTex('#55524e', .1, { grain: 2, n: 5000 }) }), 6, 6);
defMat('shingle', lam({ map: noiseTex('#6a625c', .1, { lines: 16, lineCol: 'rgba(0,0,0,.3)' }) }), 3, 3);
defMat('concrete',lam({ map: noiseTex('#a39f98', .07, { lines: 85, lineCol: 'rgba(0,0,0,.14)', blots: 10 }) }), 5, 5);
defMat('corr',    lam({ map: noiseTex('#c9ced2', .05, { vlines: 12, lineCol: 'rgba(0,0,0,.22)', lineW: 3, blots: 10 }) }), 4, 4);
defMat('tile',    lam({ map: noiseTex('#d8d4ca', .03, { lines: 64, vlines: 64, lineCol: 'rgba(0,0,0,.2)' }) }), 4, 4, { cast: false });
defMat('plaster', lam({ map: noiseTex('#e3ded3', .04, { blots: 6 }) }), 6, 6);
defMat('flat',    lam({}), 1, 1);
defMat('flatnc',  lam({}), 1, 1, { cast: false });
defMat('paint',   lam({ polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -22 }), 1, 1, { cast: false });
defMat('lot',     lam({ map: noiseTex('#46484b', .1, { cracks: 10, blots: 18 }) }), 12, 12, { cast: false });
['grass', 'dirt', 'lot', 'plaza', 'tile', 'court'].forEach((k, i) => { const m = MATS[k].mat; m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2 - i * 3; });   // these lie on top of the pavement slab, and on each other in this order: a court laid on grass always wins
defMat('turf', lam({ map: MATS.grass.mat.map }), 10, 10, { cast: false });   // grass as a base to lay roads on (the airport island): no pull toward the eye, so the runway shows over it
defMat('glass',   new T.MeshLambertMaterial({ color: 0x9fc4d8, transparent: true, opacity: .32, vertexColors: true }), 1, 1, { cast: false, recv: false });
defMat('glow',    new T.MeshBasicMaterial({ vertexColors: true }), 1, 1, { cast: false, recv: false });
{ const c = texCanvas(64), g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(200,205,210,.95)'; g.lineWidth = 1.6; for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); }
  defMat('fence', new T.MeshLambertMaterial({ map: asTex(c), transparent: true, alphaTest: .35, side: T.DoubleSide, vertexColors: true }), .5, .5, { cast: false }); }
defFacade('brick',   { bays: 4, floors: 4, style: 'brick', ww: .42, wh: .58, mull: 2, lit: .42 });
defFacade('brick2',  { bays: 4, floors: 4, style: 'brick', ww: .56, wh: .5, mull: 1, lit: .38, wall: '#d6d0c4' });
defFacade('office',  { bays: 4, floors: 4, style: 'panel', ww: .86, wh: .56, mull: 1, lit: .5, wall: '#cfd2d4', lights: ['#e8f2ff', '#fff3d6', '#d4e6ff'], frame: 'rgba(40,46,52,.9)' });
defFacade('tower',   { bays: 4, floors: 4, style: 'glass', ww: .96, wh: .9, wy: .5, lit: .34, wall: '#5d6e7c', glass0: '#32485c', glass1: '#5a7d98', lights: ['#fff1cf', '#e3efff'], frame: 'rgba(20,26,32,.9)' }, 3, 3.4);
defFacade('siding',  { bays: 2, floors: 2, style: 'siding', ww: .34, wh: .5, mull: 2, lit: .45 }, 3.5, 3);
defFacade('shop',    { bays: 2, floors: 1, style: 'panel', ww: .84, wh: .62, wy: .7, lit: .8, wall: '#cfc8bc', glass0: '#1f2a33', glass1: '#44586a', lights: ['#fff0c8', '#ffe3a8', '#e9f4ff'], frame: 'rgba(30,30,30,.9)' }, 4, 4);

const SBUF = {};   // material key -> GeoBuf
const SB = key => SBUF[key] || (SBUF[key] = new GeoBuf());
const staticMeshes = [];
function finishStatic() {
  for (const key in SBUF) { const d = MATS[key], m = new T.Mesh(SBUF[key].build(), d.mat); m.userData.key = key; m.castShadow = !!d.cast; m.receiveShadow = !!d.recv; m.matrixAutoUpdate = false; if (d.order) m.renderOrder = d.order; scene.add(m); staticMeshes.push(m); delete SBUF[key]; }
}
