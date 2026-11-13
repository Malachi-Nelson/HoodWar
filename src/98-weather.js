/* =====================================================================
   10d. WEATHER — clear skies, cloud, rain, a thunderstorm, fog off the lake. The machine that runs the world decides what comes
        next and tells everyone (one number in the world message); each machine turns toward it at its own pace and draws it,
        hears it and lets it change things on its own: wet roads that grip less, people under umbrellas or hurrying through it,
        fewer of them out in it, lightning and the thunder that follows.
   ===================================================================== */
const WX_NAMES = ['Clear', 'Overcast', 'Rain', 'Thunderstorm', 'Fog'];
// what each kind is made of: cloud cover, rain, fog, wind
const WX_MIX = [[0, 0, 0, .2], [.85, 0, .12, .4], [.92, .6, .3, .55], [1, 1, .4, 1], [.55, 0, 1, .1]];
// what tends to follow what (clear, overcast, rain, storm, fog)
const WX_NEXT = [[.5, .35, 0, 0, .15], [.4, .2, .3, .1, 0], [.1, .45, .25, .2, 0], [0, .35, .65, 0, 0], [.6, .4, 0, 0, 0]];
const WX_SAY = ['The sky is clearing', 'Cloud is coming over', 'Rain is coming in', 'A storm is rolling in', 'Fog is coming off the lake'];
// on the machine that runs the world: every few minutes, what comes next
function weatherAuth() {
  if (!WX.next) { WX.next = G.time + 160 + rand() * 120; return; }   // the session opens on a fine evening; it keeps it a while
  if (G.time < WX.next) return;
  const row = WX_NEXT[WX.k]; let r = rand(), k = 0; for (; k < row.length - 1; k++) { r -= row[k]; if (r <= 0) break; }
  if (k === 4 && G.tod > 10 && G.tod < 19) k = 1;                   // fog belongs to the night and the early morning
  WX.k = k; WX.next = G.time + (k === 3 ? 120 : 200) + rand() * 220;
}
function weatherReset() { WX.k = 0; WX.next = 0; WX.cloud = WX.rain = WX.fog = WX.wet = WX.flash = 0; WX.wind = .2; WX.seen = 0; WX.boltT = 6; }
const umbOf = b => WX.rain > .3 && (b.id * 7919) % 100 < 55;          // who carries one: the same people on every machine
// --- turning toward it: about twenty seconds to change, the roads take a while to get wet and longer to dry
function weatherTick(dt) {
  const m = WX_MIX[WX.k], k = Math.min(1, dt / 20);
  WX.cloud += (m[0] - WX.cloud) * k; WX.rain += (m[1] - WX.rain) * k * (m[1] < WX.rain ? 1.5 : 1); WX.fog += (m[2] - WX.fog) * k; WX.wind += (m[3] - WX.wind) * k;
  WX.wet = clamp(WX.wet + (WX.rain > .15 ? dt / 30 * WX.rain : -dt / 160), 0, 1);
  if (WX.k !== WX.seen && G.state === 'playing') { if (WX.seen !== undefined && G.time > 5) note(WX_SAY[WX.k], 'c'); WX.seen = WX.k; }
  if (WX.k === 3 && WX.rain > .6) { WX.boltT -= dt; if (WX.boltT <= 0) { WX.boltT = 6 + rand() * 16; bolt(); } }
  WX.flash = Math.max(0, WX.flash - dt * 5);
}
// --- the light: after the hour has set it (applyTod), cloud greys and dims it, fog closes it in, a wet road goes dark
const _wg = new T.Color(), _wf = new T.Color(), WET_MATS = [['asphalt', .36], ['lot', .32], ['walk', .24], ['plaza', .2], ['concrete', .2], ['court', .22], ['dirt', .28], ['tile', .12], ['turf', .15], ['grass', .15]];
const WXL = { hemi: 0, fog: new T.Color(), top: new T.Color(), hor: new T.Color() };
function applyWeather() {
  const c = WX.cloud, f = WX.fog, r = WX.rain, grey = (col, k) => { const l = col.r * .3 + col.g * .55 + col.b * .15; col.lerp(_wg.setRGB(l * .97, l, l * 1.06), k); };
  sun.intensity *= 1 - .82 * c; ENV.sunI = sun.intensity; sun.castShadow = sun.intensity > .05; moon.intensity *= 1 - .75 * c;
  grey(hemi.color, c * .55); grey(hemi.groundColor, c * .4); hemi.intensity *= 1 + c * .1 - r * .12;
  grey(scene.fog.color, c * .7); grey(SKY.top, c * .85); grey(SKY.hor, c * .7); SKY.top.multiplyScalar(1 - c * .3); scene.fog.color.multiplyScalar(1 - r * .15);
  SKY.sunAmt.value *= 1 - c * .94; SKY.night.value *= 1 - c;                                   // no sun's disc and no stars through it
  scene.fog.near = lerp(scene.fog.near * (1 - r * .35), 3, f * .92); scene.fog.far = lerp(lerp(scene.fog.far, 300, r * .8), 105, f * .9);
  water.material.color.multiplyScalar(1 - c * .3);
  WET_MATS.forEach(q => { const M = MATS[q[0]]; if (M) M.mat.color.setScalar(1 - q[1] * WX.wet); });
  WXL.hemi = hemi.intensity; WXL.fog.copy(scene.fog.color); WXL.top.copy(SKY.top); WXL.hor.copy(SKY.hor);
}
// --- rain: streaks in a box that travels with the camera, each one fixed in the world as it falls (so driving through it reads
//     right), slanted by the wind. All of it is worked out on the graphics card from a seed per streak and the time.
const RAIN_N = 2800, RAIN_BOX = new T.Vector3(60, 36, 60);
const rainMat = new T.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uCam: { value: new T.Vector3() }, uBox: { value: RAIN_BOX }, uAmt: { value: 0 }, uWind: { value: new T.Vector2() }, uLen: { value: .9 }, uCol: { value: new T.Color(.78, .82, .9) }, uOp: { value: .4 } },
  vertexShader: `attribute vec4 seed; attribute float tip; uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform float uAmt; uniform vec2 uWind; uniform float uLen; varying float vA; varying float vT;
    void main() { float sp = 16.0 + seed.w * 7.0, fall = uTime * sp; vec3 q = seed.xyz * uBox + vec3(uWind.x * fall, -fall, uWind.y * fall), lo = uCam - 0.5 * uBox;
      vec3 p = lo + mod(q - lo, uBox) + normalize(vec3(uWind.x, -1.0, uWind.y)) * uLen * tip;
      vA = step(seed.w, uAmt) * (1.0 - smoothstep(0.3, 0.5, length((p.xz - uCam.xz) / uBox.xz))); vT = tip;
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform vec3 uCol; uniform float uOp; varying float vA; varying float vT; void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uCol, uOp * vA * (0.25 + 0.75 * vT)); }`,
  transparent: true, depthWrite: false, fog: false,
});
const rainMesh = (() => { const g = new T.BufferGeometry(), R = rng32(4242), seed = new Float32Array(RAIN_N * 8), tip = new Float32Array(RAIN_N * 2);
  for (let i = 0; i < RAIN_N; i++) { const s = [R(), R(), R(), R()]; for (let e = 0; e < 2; e++) { seed.set(s, (i * 2 + e) * 4); tip[i * 2 + e] = e; } }
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(RAIN_N * 6), 3)); g.setAttribute('seed', new T.BufferAttribute(seed, 4)); g.setAttribute('tip', new T.BufferAttribute(tip, 1));
  const m = new T.LineSegments(g, rainMat); m.frustumCulled = false; m.renderOrder = 5; m.visible = false; scene.add(m); return m; })();
// --- lightning: a bolt drawn on a sprite somewhere off across the city, a flash on everything, and thunder a moment later
const boltTex = [0, 1, 2].map(v => { const c = texCanvas(128, 512), g = c.getContext('2d'), R = rng32(91 + v * 7); g.clearRect(0, 0, 128, 512); g.lineCap = 'round'; g.lineJoin = 'round';
  const path = (x, y, n, w) => { const pts = [[x, y]]; for (let k = 0; k < n; k++) { x = clamp(x + (R() - .5) * 34, 8, 120); y += 512 / 14 * (.6 + R() * .7); pts.push([x, y]); } [[w * 3.2, 'rgba(160,190,255,.35)'], [w, 'rgba(255,255,255,1)']].forEach(q => { g.lineWidth = q[0]; g.strokeStyle = q[1]; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }); return pts; };
  const main = path(64, 0, 14, 3); const b = main[4 + v]; path(b[0], b[1], 5, 1.6); return asTex(c, false); });
const boltSp = new T.Sprite(new T.SpriteMaterial({ map: boltTex[0], transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending })); boltSp.visible = false; boltSp.renderOrder = -5; scene.add(boltSp);
function bolt() {
  const a = rand() * TAU, d = 280 + rand() * 600, x = camera.position.x + Math.cos(a) * d, z = camera.position.z + Math.sin(a) * d;
  boltSp.material.map = boltTex[(rand() * 3) | 0]; boltSp.position.set(x, 110, z); boltSp.scale.set(55, 220, 1); boltSp.visible = true; boltSp.material.opacity = 1;
  WX.flash = .75 + rand() * .25; WX.boltOn = .22;
  if (AC) { const far = d / 340, v = clamp(1.1 - d / 1000, .25, .8); sNoise(.25, 1800, v * .25, 'bandpass', far * .6); sNoise(3.4, 150, v * .55, 'lowpass', far); sNoise(2.2, 90, v * .4, 'lowpass', far + .35); }
}
// --- what the rain sounds like: a hiss on the street, a drumming on the roof in a car
const RAINS = { g: null, f: null };
function rainSound() {
  if (!AC) return; if (!RAINS.g) { const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; RAINS.f = AC.createBiquadFilter(); RAINS.f.type = 'bandpass'; RAINS.f.Q.value = .5; RAINS.f.frequency.value = 2400; RAINS.g = AC.createGain(); RAINS.g.gain.value = 0; s.connect(RAINS.f); RAINS.f.connect(RAINS.g); RAINS.g.connect(sfxBus); s.start(); }
  const t = AC.currentTime, inCar = !!P.car && !P.car.spec.air; RAINS.g.gain.setTargetAtTime(WX.rain * (G.state === 'menu' ? .03 : inCar ? .1 : .13), t, .4); RAINS.f.frequency.setTargetAtTime(inCar ? 900 : 2400, t, .3);
}
// --- umbrellas: one instanced canopy and handle for each person carrying one near the camera
const UMB_N = 40, umbGeo = (() => { const b = new GeoBuf(), c = new T.ConeGeometry(.62, .3, 8, 1, true); c.translate(0, .15, 0); b.geo(c, null, hexCol(0xffffff)); c.dispose(); const h = new T.CylinderGeometry(.018, .018, .82, 5); h.translate(0, -.41, 0); b.geo(h, null, hexCol(0x2a2a2a)); h.dispose(); return b.build(); })();
const umbMesh = new T.InstancedMesh(umbGeo, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }), UMB_N); umbMesh.count = 0; umbMesh.frustumCulled = false; scene.add(umbMesh);
const UMB_COL = [0x1d2a44, 0x8c1c1c, 0x23262b, 0x2f5d3a, 0xd9b13a, 0x5a2d6e, 0x2c6f9e].map(h => new T.Color(h));
for (let i = 0; i < UMB_N; i++) umbMesh.setColorAt(i, UMB_COL[i % UMB_COL.length]);   // made now, so the material is built knowing each one has its own colour
const _um = new T.Matrix4(), _uq = new T.Quaternion(), _ue = new T.Euler(), _up = new T.Vector3(), _us = new T.Vector3(1, 1, 1);
function umbrellas() {
  let n = 0; if (WX.rain > .3) for (let i = 0; i < bots.length && n < UMB_N; i++) { const b = bots[i]; if (b.team !== TEAM_CIV || b.dead || b.car || b.knock > .5 || b.act === ACT.handsup || b.act === ACT.cower || b.post || b.spd > 4.2 || !umbOf(b)) continue;
    if (hyp(b.x - camera.position.x, b.z - camera.position.z) > 70) continue; const rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw);
    _ue.set(-.12 - WX.wind * .1, b.yaw, 0, 'YXZ'); _um.compose(_up.set(b.x + rx * .2, b.y + (b.act === ACT.sit ? 1.75 : 2.12), b.z + rz * .2), _uq.setFromEuler(_ue), _us); umbMesh.setMatrixAt(n, _um); umbMesh.setColorAt(n, UMB_COL[b.id % UMB_COL.length]); n++; }
  umbMesh.count = n; if (n) { umbMesh.instanceMatrix.needsUpdate = true; if (umbMesh.instanceColor) umbMesh.instanceColor.needsUpdate = true; }
}
// --- every frame, on every machine
function weatherFrame(dt) {
  const u = rainMat.uniforms, on = WX.rain > .02 && G.state !== 'menu';
  rainMesh.visible = on; if (on) { u.uTime.value = G.time % 600; u.uCam.value.copy(camera.position); u.uAmt.value = WX.rain * (GFX.low ? .45 : 1); u.uWind.value.set(Math.cos(.7) * WX.wind * .32, Math.sin(.7) * WX.wind * .32);
    u.uCol.value.setRGB(lerp(.78, .5, ENV.night), lerp(.82, .56, ENV.night), lerp(.9, .66, ENV.night)); u.uOp.value = lerp(.38, .26, ENV.night) + WX.flash * .3; }
  if (WX.flash > 0 || WX.lit) { const k = WX.flash; hemi.intensity = WXL.hemi + k * .95; scene.fog.color.copy(WXL.fog).lerp(_wf.setRGB(.62, .66, .8), k * .35); SKY.top.copy(WXL.top).lerp(_wf.setRGB(.5, .55, .72), k * .5); SKY.hor.copy(WXL.hor).lerp(_wf.setRGB(.6, .64, .8), k * .4); WX.lit = k > 0; }
  if (WX.boltOn > 0) { WX.boltOn -= dt; boltSp.material.opacity = WX.boltOn > .12 ? 1 : (G.time * 30 % 2 < 1 ? .9 : .2); if (WX.boltOn <= 0) boltSp.visible = false; }
  umbrellas(); rainSound();
}
