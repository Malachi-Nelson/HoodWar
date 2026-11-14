/* =====================================================================
   5. TIME OF DAY — a session starts in the last hour of sun and runs on through the night and round again
   ===================================================================== */
// hour, sun colour, sun strength, sky light, ground bounce, their strength, fog, zenith, horizon, night (0..1)
const TOD_KEYS = [
  [0,    0x000000, 0,    0x3d5480, 0x191c26, .92, 0x0e1524, 0x03050d, 0x121d33, 1],
  [5,    0x000000, 0,    0x3d5480, 0x191c26, .92, 0x0e1524, 0x03050d, 0x121d33, 1],
  [6.4,  0xff9a5a, .6,   0x9a9ab8, 0x3a3038, .6,  0xc79a8c, 0x35507a, 0xf0a880, .4],
  [8,    0xfff0d8, 1.0,  0xbcd0e8, 0x4a4238, .74, 0xa9c0d8, 0x3d78c0, 0xbcd6ee, 0],
  [16,   0xfff0d8, 1.05, 0xbcd0e8, 0x4a4238, .74, 0xa9c0d8, 0x3d78c0, 0xbcd6ee, 0],
  [18.3, 0xffae6a, 1.0,  0xc4aca6, 0x4c3c36, .64, 0xdcae90, 0x4a6aa0, 0xffba82, .12],
  [19.7, 0xff6a3a, .5,   0x8272a0, 0x2c2632, .6,  0x8a5a6a, 0x1e2a55, 0xe0704a, .62],
  [20.9, 0x000000, 0,    0x3d5480, 0x191c26, .92, 0x0e1524, 0x03050d, 0x121d33, 1],
  [24,   0x000000, 0,    0x3d5480, 0x191c26, .92, 0x0e1524, 0x03050d, 0x121d33, 1],
];
const _ca = new T.Color(), _cb = new T.Color(), _cWhite = new T.Color(1, 1, 1), ENV = { night: 0, hour: 17.3, sunI: 1, base: 1 };
// how strong each light is in linear light, how bright lit windows and signs are, and an overall exposure (21-post.js uses these)
const LOOK = { sun: 2.35, hemi: .82, hemiEnv: .3, moon: .45, win: 1.25, winHDR: 2.4, sign: .8, signHDR: 2.2, lamp: 1.5, exp: 1, envI: .48 };
const LAMP_COL = new T.Color(0xffc47a);
const mixCol = (out, a, b, t) => out.copy(_ca.setHex(a)).lerp(_cb.setHex(b), t);
const sunDirV = new T.Vector3(.4, .6, .5).normalize();
function applyTod(h) {
  h = ((h % 24) + 24) % 24; ENV.hour = h;
  let k = 0; while (k < TOD_KEYS.length - 2 && TOD_KEYS[k + 1][0] <= h) k++;
  const A = TOD_KEYS[k], B = TOD_KEYS[k + 1], t = clamp((h - A[0]) / (B[0] - A[0]), 0, 1), night = lerp(A[9], B[9], t), base = lerp(A[2], B[2], t), hdr = POST.on;
  mixCol(sun.color, A[1], B[1], t); sun.intensity = ENV.sunI = base * LOOK.sun; ENV.base = base; sun.castShadow = sun.intensity > .05;
  mixCol(hemi.color, A[3], B[3], t); mixCol(hemi.groundColor, A[4], B[4], t); hemi.intensity = lerp(A[5], B[5], t) * (GQ.env ? LOOK.hemiEnv : LOOK.hemi);
  mixCol(scene.fog.color, A[6], B[6], t); mixCol(SKY.top, A[7], B[7], t); mixCol(SKY.hor, A[8], B[8], t);
  scene.fog.near = lerp(70, 30, night); scene.fog.far = Math.min(lerp(1050, 620, night), VIEW.far);
  moon.intensity = night * .55 * LOOK.moon; ENV.night = night; SKY.night.value = night; SKY.stars.value = night;
  const d = clamp((h - 6) / 14, 0, 1), el = Math.max(.14, Math.sin(d * PI) * 1.02), az = .22 + d * (PI - .44);
  sunDirV.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
  SKY.sunDir.copy(sunDirV); SKY.sunCol.copy(sun.color); SKY.sunAmt.value = Math.min(1, base * 1.4);
  // cloud: white by day, the low sun's colour at either end of it, dim blue-grey at night with the city's orange glow under it
  SKY.cLit.copy(sun.color).lerp(_cWhite, .45).multiplyScalar(.25 + base * .95).lerp(_ca.setRGB(.035, .04, .055), night);
  SKY.cShade.copy(SKY.hor).lerp(_cb.setRGB(.42, .44, .48), .55).multiplyScalar(lerp(.75, .22, night));
  SKY.glow.setRGB(.11, .055, .022).multiplyScalar(night);
  FOGU.fogSunDir.value.copy(sunDirV); FOGU.fogSunCol.value.copy(sun.color).multiplyScalar(.45 * base);
  const em = clamp((night - .15) / .6, 0, 1);
  FACADES.forEach(m => m.emissive.setScalar(em * (hdr ? LOOK.winHDR : LOOK.win))); matsOf('sign').forEach(m => m.emissive.setScalar(.06 + em * (hdr ? LOOK.signHDR : LOOK.sign)));
  lampGlow.material.opacity = em; lampPool.material.opacity = em * .5; lampGlow.visible = lampPool.visible = em > .02; lampGlow.material.color.copy(LAMP_COL).multiplyScalar(hdr ? LOOK.lamp : 1); lampGlow.material.size = hdr ? 2.8 : 5.5;
  waterTone(night);
  vmHemi.color.copy(hemi.color); vmHemi.groundColor.copy(hemi.groundColor); vmKey.color.copy(night > .5 ? _ca.setHex(0x8aa0c8) : sun.color); vmKey.intensity = lerp(.75, .4, night);
  mallLights.forEach(l => l.intensity = .55 + night * .35);
  lookTick();
}
// the shadow map follows the action, snapped to its own texels so shadows do not shimmer
const _lr = new T.Vector3(), _lu = new T.Vector3(), _UP = new T.Vector3(0, 1, 0);
function updateSun(fx, fy, fz) {
  _lr.crossVectors(_UP, sunDirV).normalize(); _lu.crossVectors(sunDirV, _lr);
  const tex = SHADOW.tex, a = Math.round((fx * _lr.x + fy * _lr.y + fz * _lr.z) / tex) * tex, b = Math.round((fx * _lu.x + fy * _lu.y + fz * _lu.z) / tex) * tex, c = fx * sunDirV.x + fy * sunDirV.y + fz * sunDirV.z;
  sun.target.position.set(_lr.x * a + _lu.x * b + sunDirV.x * c, _lr.y * a + _lu.y * b + sunDirV.y * c, _lr.z * a + _lu.z * b + sunDirV.z * c);
  sun.position.copy(sun.target.position).addScaledVector(sunDirV, 260); sun.target.updateMatrixWorld();
}

