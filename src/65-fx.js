/* =====================================================================
   6b. EFFECTS — smoke, fire, sparks, tracers, flashes. Two point clouds (one glowing, one not) hold every particle.
   ===================================================================== */
const PMAX = 900;
function makePSys(additive) {
  const g = new T.BufferGeometry(), pos = new Float32Array(PMAX * 3), col = new Float32Array(PMAX * 4), siz = new Float32Array(PMAX);
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('pcolor', new T.BufferAttribute(col, 4)); g.setAttribute('psize', new T.BufferAttribute(siz, 1)); g.setDrawRange(0, 0);
  const m = new T.ShaderMaterial({ uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
    vertexShader: 'attribute vec4 pcolor; attribute float psize; varying vec4 vC; uniform float scale; void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(420.0, psize * scale / max(0.1, -mv.z)); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 p = gl_PointCoord - 0.5; float d = dot(p, p) * 4.0; if (d > 1.0) discard; float a = 1.0 - d; gl_FragColor = vec4(vC.rgb, vC.a * a * (0.6 + 0.4 * a)); }' });
  const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 7 : 6; scene.add(pts);
  return { g, pos, col, siz, m, items: [] };
}
const PS = makePSys(false), PA = makePSys(true);
// one particle: grows from s0 to s1 and fades from a0 to nothing over its life
function spawnP(sys, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, grav, drag) { if (sys.items.length >= PMAX) sys.items.shift(); sys.items.push({ x, y, z, vx, vy, vz, t: 0, life, s0, s1, r, g, b, a0, grav: grav || 0, drag: drag || 0 }); }
function updatePSys(sys, dt) {
  const L = sys.items; let n = 0;
  for (let i = 0; i < L.length; i++) { const p = L[i]; p.t += dt; if (p.t >= p.life) continue;
    p.vy -= p.grav * dt; if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.grav > 4 && p.y < .03) { p.y = .03; p.vy *= -.3; p.vx *= .6; p.vz *= .6; }
    const k = p.t / p.life; sys.pos[n * 3] = p.x; sys.pos[n * 3 + 1] = p.y; sys.pos[n * 3 + 2] = p.z; sys.col[n * 4] = p.r; sys.col[n * 4 + 1] = p.g; sys.col[n * 4 + 2] = p.b; sys.col[n * 4 + 3] = p.a0 * (1 - k) * Math.min(1, p.t * 30); sys.siz[n] = lerp(p.s0, p.s1, k);
    if (n !== i) L[n] = p; n++; }
  L.length = n; sys.g.setDrawRange(0, n); sys.g.attributes.position.needsUpdate = true; sys.g.attributes.pcolor.needsUpdate = true; sys.g.attributes.psize.needsUpdate = true;
}
const rs = v => (rand() - .5) * v;
const FX = {
  dust: (x, y, z, n, c) => { c = c || .62; for (let i = 0; i < n; i++) spawnP(PS, x, y, z, rs(2.4), rand() * 1.6, rs(2.4), .35 + rand() * .4, .12, .5, c, c * .98, c * .94, .7, 1.5, 2); },
  sparks: (x, y, z, n) => { for (let i = 0; i < n; i++) spawnP(PA, x, y, z, rs(7), rand() * 5, rs(7), .18 + rand() * .25, .09, .03, 1, .78, .35, 1, 14, 0); },
  blood: (x, y, z, n) => { for (let i = 0; i < n; i++) spawnP(PS, x, y, z, rs(2.6), rand() * 2.2, rs(2.6), .3 + rand() * .3, .1, .16, .5, .04, .03, .9, 9, 0); },
  smoke: (x, y, z, s, dark) => { const c = dark ? .1 + rand() * .08 : .5 + rand() * .15; spawnP(PS, x + rs(.3), y, z + rs(.3), rs(.6), 1.2 + rand() * 1.4, rs(.6), 1.4 + rand() * 1.2, .5 * s, 2.6 * s, c, c, c, dark ? .6 : .34, -.2, .4); },
  fire: (x, y, z, s) => { spawnP(PA, x + rs(.7 * s), y + rand() * .3, z + rs(.7 * s), rs(.6), 1.6 + rand() * 2.2, rs(.6), .3 + rand() * .35, .9 * s, .2 * s, 1, .5 + rand() * .3, .12, .85, -1, .5); },
  tyre: (x, y, z) => spawnP(PS, x, y + .1, z, rs(.8), .5 + rand() * .5, rs(.8), .7 + rand() * .6, .35, 1.7, .78, .78, .78, .26, -.1, .8),
  muzzle: (x, y, z, s) => { spawnP(PA, x, y, z, 0, 0, 0, .05, .5 * s, .28 * s, 1, .86, .5, 1, 0, 0); spawnP(PA, x, y, z, rs(1), rs(1), rs(1), .07, .26 * s, .1 * s, 1, .95, .75, 1, 0, 0); },
  casing: (x, y, z, vx, vy, vz) => spawnP(PS, x, y, z, vx, vy, vz, .8, .035, .035, .79, .64, .23, 1, 12, 0),
  boom: (x, y, z, s) => { s = s || 1;
    for (let i = 0; i < 26; i++) { const a = rand() * TAU, e = rand() * 1.2, v = (3 + rand() * 9) * s; spawnP(PA, x, y + .4, z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 2, Math.sin(a) * Math.cos(e) * v, .35 + rand() * .45, 2.6 * s, .6 * s, 1, .55 + rand() * .3, .12, 1, -2, 2.2); }
    for (let i = 0; i < 18; i++) FX.smoke(x + rs(2.5 * s), y + .5 + rand() * 1.5, z + rs(2.5 * s), 1.6 * s, true);
    for (let i = 0; i < 22; i++) spawnP(PS, x, y + .5, z, rs(16), 3 + rand() * 9, rs(16), .9 + rand() * .7, .14, .1, .16, .15, .14, 1, 16, .3);
    FX.sparks(x, y + .6, z, 26); boomLight.position.set(x, y + 2, z); boomLight.intensity = 5 * s; },
};
const boomLight = new T.PointLight(0xffa24a, 0, 46, 1.6); scene.add(boomLight);
const muzzleLight = new T.PointLight(0xffc56a, 0, 10, 2); scene.add(muzzleLight);
const tracers = []; for (let i = 0; i < 28; i++) { const l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); l.visible = false; l.frustumCulled = false; scene.add(l); tracers.push({ l, t: 0 }); }
function tracer(x0, y0, z0, x1, y1, z1) { const tr = tracers.find(q => q.t <= 0); if (!tr) return; const p = tr.l.geometry.attributes.position; p.setXYZ(0, x0, y0, z0); p.setXYZ(1, x1, y1, z1); p.needsUpdate = true; tr.l.visible = true; tr.t = .06; }
let shakeAmt = 0, flashA = 0;
const shake = a => { shakeAmt = Math.min(1.2, shakeAmt + a); }, flash = a => { flashA = Math.max(flashA, a); };
function updateFx(dt) {
  for (const tr of tracers) if (tr.t > 0) { tr.t -= dt; if (tr.t <= 0) tr.l.visible = false; }
  updatePSys(PS, dt); updatePSys(PA, dt);
  boomLight.intensity = Math.max(0, boomLight.intensity - dt * 16); muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 40);
  shakeAmt = Math.max(0, shakeAmt - dt * 2.4); const sc = renderer.domElement.height / (2 * Math.tan(camera.fov * PI / 360)); PS.m.uniforms.scale.value = PA.m.uniforms.scale.value = sc;
}
