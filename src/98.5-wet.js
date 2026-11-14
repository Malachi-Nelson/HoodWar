/* =====================================================================
   10e. WET WEATHER UP CLOSE — what 98-weather.js left to the imagination.
        · Rain that comes and goes: inside a spell of rain it swells from a drizzle to a downpour and eases off again, on a clock
          every machine shares, so everyone gets the same shower. Storms flicker inside the clouds between the strikes.
        · Puddles: the low spots of each road, lot and pavement (marked in the blue of their roughness maps, 22-surfaces.js) fill
          as the ground soaks, lie flat and mirror-smooth, darken, and ring with ripples while it rains (Medium and up).
        · Splashes: drops bursting on the ground all round you in the rain; spray thrown up behind cars on a wet road.
        · Drops on the lens in the rain when you are out in it (Medium and up).
        · Wind: trees sway with it, smoke and steam drift with it, the rain slants with it.
   ===================================================================== */
const WETU = { uWet: { value: 0 }, uRain: { value: 0 }, uRT: { value: 0 } }, PUDDLE_KEYS = ['asphalt', 'lot', 'walk', 'plaza'];
const PUDDLE_FRAG = `
float pud = 0.0;
#ifdef USE_ROUGHNESSMAP
  pud = smoothstep(0.22, 0.7, texelRoughness.b) * smoothstep(0.25, 0.9, uWet);
#endif
roughnessFactor = mix(roughnessFactor, 0.04, pud);
diffuseColor.rgb *= 1.0 - 0.38 * pud;
float mirror = clamp(pud * 0.95 + uWet * 0.2 * (1.0 - pud), 0.0, 1.0);`;
const RIPPLE_FRAG = `
#ifdef USE_NORMALMAP
  normal = normalize(mix(normal, geometryNormal, pud));
  if (pud > 0.01 && uRain > 0.02) { vec2 rg = vec2(0.0);
    for (int k = 0; k < 2; k++) { vec2 p = vUv * (52.0 + float(k) * 21.0) + float(k) * 7.31, cell = floor(p), f = fract(p) - 0.5; float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
      f -= (vec2(fract(h * 13.7), fract(h * 71.3)) - 0.5) * 0.5; float ph = fract(uRT * (0.9 + h * 0.6) + h), d = length(f), w = d - ph * 0.45;
      rg += f / max(d, 1e-3) * sin(w * 55.0) * exp(-w * w * 700.0) * (1.0 - ph) * step(h, 0.35 + uRain * 0.6); }
    normal = perturbNormal2Arb(-vViewPosition, normal, normalize(vec3(rg * 0.55 * pud * uRain, 1.0)), faceDirection); }
#endif`;
function puddleCompile(sh, r) {
  T.Material.prototype.onBeforeCompile.call(this, sh, r); Object.assign(sh.uniforms, WETU);
  sh.fragmentShader = 'uniform float uWet; uniform float uRain; uniform float uRT;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>' + PUDDLE_FRAG).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + RIPPLE_FRAG)
    .replace('#include <tonemapping_fragment>', 'gl_FragColor.a = 1.0 - mirror;\n#include <tonemapping_fragment>');   // read by the street reflections (21-post.js)
}
function puddleMats() { PUDDLE_KEYS.forEach(k => { const M = MATS[k]; if (M && M.pbr && M.pbr.isMeshStandardMaterial && M.pbr.onBeforeCompile !== puddleCompile) { M.pbr.onBeforeCompile = puddleCompile; M.pbr.needsUpdate = true; } }); }
// --- trees in the wind: their crowns are their own material (40-world.js), bent by a gust that travels across the city
const WINDU = { uT: { value: 0 }, uW: { value: 0 } };
const SWAY_VERT = `
{ float hgt = clamp((transformed.y - 2.2) / 4.0, 0.0, 1.0), ph = uT * 1.6 + transformed.x * 0.21 + transformed.z * 0.17, gust = 0.6 + 0.4 * sin(uT * 0.45 + transformed.x * 0.02);
  float s = (sin(ph) * 0.7 + sin(ph * 2.3 + 1.7) * 0.3) * uW * gust * hgt; transformed.x += s * 0.32 + uW * hgt * 0.12; transformed.z += s * 0.2 + uW * hgt * 0.08; }`;
function swayCompile(sh, r) { T.Material.prototype.onBeforeCompile.call(this, sh, r); Object.assign(sh.uniforms, WINDU); sh.vertexShader = 'uniform float uT; uniform float uW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + SWAY_VERT); }
const swayDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); swayDepth.onBeforeCompile = swayCompile;
function swayMats() { const M = MATS.foliage; if (!M) return; [M.low || M.mat, M.pbr].forEach(m => { if (m && m.onBeforeCompile !== swayCompile) { m.onBeforeCompile = swayCompile; m.needsUpdate = true; } });
  staticMeshes.forEach(s => { if (s.userData.key === 'foliage') s.customDepthMaterial = swayDepth; }); }
// --- rain through the day: how hard it is coming down right now, inside the rain the world is set to (the same on every machine)
function rainSwell() { const t = G.tod * 100 / 60; return .5 + .5 * Math.sin(t * .9 + Math.sin(t * .37) * 2.1); }   // 0..1, a minute or two per swell
// --- splashes: drops bursting on whatever is underfoot, all round the camera; drawn on the card from a birth time each
const SPL_N = 260, SPLASH = { i: 0, acc: 0 };
const splashMat = new T.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uCol: { value: new T.Color(.8, .84, .9) } },
  vertexShader: `attribute vec4 at; uniform float uTime; varying float vA; varying vec2 vQ;
    void main() { float age = uTime - at.w, k = clamp(age / 0.32, 0.0, 1.0); vA = (1.0 - k) * step(0.0, age) * step(age, 0.32); vQ = position.xy;
      vec4 mv = viewMatrix * vec4(at.xyz, 1.0); mv.xy += position.xy * vec2(0.03 + k * 0.1, 0.03 + k * 0.07) + vec2(0.0, 0.02 + k * 0.05); gl_Position = projectionMatrix * mv; }`,
  // a crown: a thin rim low down and a few droplets thrown up from it
  fragmentShader: `uniform vec3 uCol; varying float vA; varying vec2 vQ; void main() { vec2 q = vQ; float rim = smoothstep(0.25, 0.0, abs(length(vec2(q.x, (q.y + 0.55) * 2.2)) - 0.8)) * step(q.y, -0.3);
    float drops = 0.0; for (int i = 0; i < 4; i++) { float fi = float(i), x = -0.75 + fi * 0.5; drops += smoothstep(0.16, 0.0, length(q - vec2(x, 0.1 + 0.35 * sin(fi * 2.1)))); }
    float a = vA * clamp(rim + drops * 0.8, 0.0, 1.0); if (a < 0.01) discard; gl_FragColor = vec4(uCol, a * 0.42); }`,
  transparent: true, depthWrite: false, fog: true,
});
splashMat.fog = false;
const splashMesh = (() => { const g = new T.InstancedBufferGeometry(), q = new T.PlaneGeometry(2, 2); g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('at', new T.InstancedBufferAttribute(new Float32Array(SPL_N * 4).fill(-99), 4)); g.instanceCount = SPL_N;
  const m = new T.Mesh(g, splashMat); m.frustumCulled = false; m.renderOrder = 4; m.visible = false; scene.add(m); return m; })();
function splashTick(dt) {
  const on = WX.rain > .05 && G.state !== 'menu' && GQ.tex > 0; splashMesh.visible = on; if (!on) return; const t = G.time % 600, at = splashMesh.geometry.attributes.at;
  splashMat.uniforms.uTime.value = t; splashMat.uniforms.uCol.value.setRGB(lerp(.85, .55, ENV.night), lerp(.88, .58, ENV.night), lerp(.94, .66, ENV.night));
  SPLASH.acc += dt * WX.rain * 700; const cx = camera.position.x, cz = camera.position.z, cy = camera.position.y;
  while (SPLASH.acc >= 1) { SPLASH.acc--; const a = rand() * TAU, d = 1.5 + Math.sqrt(rand()) * 24, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = groundAt(x, z, Math.max(cy, 3) + 40, 'p');
    if (y < -5) continue; const i = SPLASH.i = (SPLASH.i + 1) % SPL_N; at.array[i * 4] = x; at.array[i * 4 + 1] = y + .02; at.array[i * 4 + 2] = z; at.array[i * 4 + 3] = t + rand() * .05; }
  at.needsUpdate = true;
}
// --- spray off the tyres of anything moving fast on a wet road
function sprayTick(dt) {
  if (WX.wet < .35 || G.state === 'menu') return; const k = (WX.wet - .35) * 1.5;
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c.spec.air || c.wreck) continue; const sp = hyp(c.vx, c.vz); if (sp < 7 || hyp(c.x - camera.position.x, c.z - camera.position.z) > 80) continue;
    if (rand() > dt * sp * 1.6 * k) continue; const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), s = rand() < .5 ? -1 : 1, b = c.spec.len / 2 - .7, w = c.spec.wid / 2 - .15;
    spawnP(PS, c.x - fx * b + rx * s * w, c.y + .25, c.z - fz * b + rz * s * w, -c.vx * .18 + rs(.6), .5 + rand() * .8, -c.vz * .18 + rs(.6), .5 + rand() * .4, .4, 1.6 + sp * .03, .82, .84, .88, .2, 1.2, 1.2); }
}
// --- drops on the lens: a sheet of them (offsets in red and green, the drop itself in blue) that slides down slowly
const DROPS = (() => { const S = 512, R = rng32(5150), d = new Float32Array(S * S * 3);
  for (let k = 0; k < 120; k++) { const cx = R() * S, cy = R() * S, r = 3 + R() * R() * 16, sy = 1 + R() * .5;
    for (let y = Math.floor(cy - r * sy) - 1; y <= cy + r * sy + 1; y++) for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) { const dx = (x - cx) / r, dy = (y - cy) / (r * sy), q = dx * dx + dy * dy; if (q > 1) continue;
      const i = (((y + S) % S) * S + ((x + S) % S)) * 3, h = Math.sqrt(1 - q); d[i] = dx * h; d[i + 1] = -dy * h; d[i + 2] = Math.max(d[i + 2], smoothDrop(q)); } }
  function smoothDrop(q) { return q < .8 ? 1 : (1 - q) / .2; }
  return pixTex(S, a => { for (let i = 0; i < S * S; i++) { a[i * 4] = (d[i * 3] * .5 + .5) * 255; a[i * 4 + 1] = (d[i * 3 + 1] * .5 + .5) * 255; a[i * 4 + 2] = d[i * 3 + 2] * 255; a[i * 4 + 3] = 255; } }, true); })();
const LENS = { amt: 0 };
function lensTick(dt) {   // out in the rain (not in a car, not under the camera's own roof) the drops gather; they clear in a few seconds when it stops
  const under = !!P.car && !P.car.spec.air || G.state === 'menu', want = WX.rain > .25 && !under ? clamp((WX.rain - .25) * 1.6, 0, 1) : 0;
  LENS.amt = lerp(LENS.amt, want, Math.min(1, dt * (want > LENS.amt ? .35 : .8))); const U = POST.grade && POST.grade.uniforms; if (U && U.dropAmt) { U.dropAmt.value = LENS.amt; U.dropT.value = G.time % 1000; }
}
// --- wind for everything that drifts (65-fx.js reads WINDV)
const WINDV = { x: 0, z: 0 };
// --- every frame
function wetFrame(dt) {
  const sw = WX.k === 2 ? rainSwell() : 1; WETU.uWet.value = WX.wet; WETU.uRain.value = WX.rain; WETU.uRT.value = G.time % 1000;
  WINDU.uT.value = G.time % 1000; WINDU.uW.value = WX.wind; WINDV.x = Math.cos(.7) * WX.wind * 2.6; WINDV.z = Math.sin(.7) * WX.wind * 2.6;
  if (WX.k === 3 && WX.rain > .5 && rand() < dt * .35 && WX.flash < .05) WX.flash = .18 + rand() * .2;   // lightning inside the cloud, no bolt
  splashTick(dt); sprayTick(dt); lensTick(dt); WX.swell = sw;
}
