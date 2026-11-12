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
const _ca = new T.Color(), _cb = new T.Color(), ENV = { night: 0, hour: 17.3, sunI: 1 };
const mixCol = (out, a, b, t) => out.copy(_ca.setHex(a)).lerp(_cb.setHex(b), t);
const sunDirV = new T.Vector3(.4, .6, .5).normalize();
function applyTod(h) {
  h = ((h % 24) + 24) % 24; ENV.hour = h;
  let k = 0; while (k < TOD_KEYS.length - 2 && TOD_KEYS[k + 1][0] <= h) k++;
  const A = TOD_KEYS[k], B = TOD_KEYS[k + 1], t = clamp((h - A[0]) / (B[0] - A[0]), 0, 1), night = lerp(A[9], B[9], t);
  mixCol(sun.color, A[1], B[1], t); sun.intensity = ENV.sunI = lerp(A[2], B[2], t); sun.castShadow = sun.intensity > .05;
  mixCol(hemi.color, A[3], B[3], t); mixCol(hemi.groundColor, A[4], B[4], t); hemi.intensity = lerp(A[5], B[5], t);
  mixCol(scene.fog.color, A[6], B[6], t); mixCol(SKY.top, A[7], B[7], t); mixCol(SKY.hor, A[8], B[8], t);
  scene.fog.near = lerp(90, 40, night); scene.fog.far = lerp(660, 460, night);
  moon.intensity = night * .55; ENV.night = night; SKY.night.value = night;
  const d = clamp((h - 6) / 14, 0, 1), el = Math.max(.14, Math.sin(d * PI) * 1.02), az = .22 + d * (PI - .44);
  sunDirV.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
  SKY.sunDir.copy(sunDirV); SKY.sunCol.copy(sun.color); SKY.sunAmt.value = Math.min(1, sun.intensity * 1.4);
  const em = clamp((night - .15) / .6, 0, 1);
  FACADES.forEach(m => m.emissive.setScalar(em * .9)); MATS.sign.mat.emissive.setScalar(.06 + em * .75);
  lampGlow.material.opacity = em; lampPool.material.opacity = em * .5; lampGlow.visible = lampPool.visible = em > .02;
  water.material.color.copy(_ca.setHex(0x35607a)).lerp(_cb.setHex(0x0b1826), night);
  vmHemi.color.copy(hemi.color); vmHemi.groundColor.copy(hemi.groundColor); vmKey.color.copy(night > .5 ? _ca.setHex(0x8aa0c8) : sun.color); vmKey.intensity = lerp(.75, .4, night);
  mallLights.forEach(l => l.intensity = .55 + night * .35);
}
// the shadow map follows the action, snapped to its own texels so shadows do not shimmer
const _lr = new T.Vector3(), _lu = new T.Vector3(), _UP = new T.Vector3(0, 1, 0);
function updateSun(fx, fy, fz) {
  _lr.crossVectors(_UP, sunDirV).normalize(); _lu.crossVectors(sunDirV, _lr);
  const tex = 190 / 2048, a = Math.round((fx * _lr.x + fy * _lr.y + fz * _lr.z) / tex) * tex, b = Math.round((fx * _lu.x + fy * _lu.y + fz * _lu.z) / tex) * tex, c = fx * sunDirV.x + fy * sunDirV.y + fz * sunDirV.z;
  sun.target.position.set(_lr.x * a + _lu.x * b + sunDirV.x * c, _lr.y * a + _lu.y * b + sunDirV.y * c, _lr.z * a + _lu.z * b + sunDirV.z * c);
  sun.position.copy(sun.target.position).addScaledVector(sunDirV, 260); sun.target.updateMatrixWorld();
}
applyTod(18);
