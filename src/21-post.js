/* =====================================================================
   2b. THE LOOK — how a frame is made, on top of the plain renderer in 20-render.js:
       · fog that is thicker near the ground and brighter toward the sun (every material, through three's shader chunks)
       · physically based twins of the city's materials, lit by and reflecting an environment map made from the sky itself
       · an HDR pipeline: the scene in linear light, ambient occlusion from the depth buffer, bloom on what is truly bright,
         then exposure, filmic tone mapping, colour grading, vignette and grain, then FXAA; optional depth of field and
         motion blur. The first-person gun is drawn last, straight to the screen.
       · the graphics presets and their settings (GQ, in 20-render.js), and the menu that sets them.
   ===================================================================== */
// --- fog. The fog chunks are replaced for every material: distance fog as before (scene.fog near/far), but it thins with height so
//     towers rise out of the haze, and it takes the sun's colour when you look toward the sun. The extra uniforms are shared by every
//     material through onBeforeCompile.
const FOGU = { fogSunDir: { value: new T.Vector3(0, 1, 0) }, fogSunCol: { value: new T.Color(0, 0, 0) }, fogHeight: { value: .011 } };
T.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n varying float fogDepth; varying vec3 vFogW;\n#endif';
T.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n fogDepth = - mvPosition.z; vFogW = cameraPosition + transposeMat3( mat3( viewMatrix ) ) * mvPosition.xyz;\n#endif';
T.ShaderChunk.fog_pars_fragment = '#ifdef USE_FOG\n uniform vec3 fogColor; varying float fogDepth; varying vec3 vFogW; uniform vec3 fogSunDir; uniform vec3 fogSunCol; uniform float fogHeight;\n #ifdef FOG_EXP2\n uniform float fogDensity;\n #else\n uniform float fogNear; uniform float fogFar;\n #endif\n#endif';
T.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  vec3 fogRay = vFogW - cameraPosition; float fogDist = length(fogRay);
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(- fogDensity * fogDensity * fogDist * fogDist);
  #else
    float fogT = max(fogDist - fogNear, 0.0) / max(fogFar - fogNear, 1.0), fogH = exp(- max(vFogW.y, 0.0) * fogHeight);
    float fogFactor = 1.0 - exp(- (fogT * fogT * 3.0 + fogT * 0.7) * mix(0.4, 1.0, fogH));
  #endif
  vec3 fogC = fogColor + fogSunCol * pow(max(dot(fogRay / max(fogDist, 0.001), fogSunDir), 0.0), 6.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogC, clamp(fogFactor, 0.0, 1.0));
#endif`;
T.Material.prototype.onBeforeCompile = function (sh) { sh.uniforms.fogSunDir = FOGU.fogSunDir; sh.uniforms.fogSunCol = FOGU.fogSunCol; sh.uniforms.fogHeight = FOGU.fogHeight; };
// --- physically based twins for the standing city: roughness and metalness for each material. Low keeps the old matte ones.
const PBR_OF = { asphalt: [1, 0], lot: [1, 0], walk: [1, 0], plaza: [1, 0],   // these four take their roughness from their maps (22-surfaces.js)
  grass: [1, 0], turf: [1, 0], dirt: [1, 0], court: [.62, 0], roof: [.92, 0], shingle: [.85, 0],
  concrete: [.9, 0], corr: [.48, .55], tile: [.5, 0], plaster: [.92, 0], flat: [.72, 0], flatnc: [.72, 0], paint: [.65, 0], glass: [.05, .2], fence: [.45, .6], sign: [.55, 0] };
function makePBR() {
  for (const key in MATS) { const M = MATS[key], m = M.mat; if (M.low) continue; M.low = m; if (!(m instanceof T.MeshLambertMaterial)) { M.pbr = m; continue; }
    const fac = FACADES.includes(m), q = PBR_OF[key] || [.85, 0];
    const p = new T.MeshStandardMaterial({ vertexColors: m.vertexColors, map: m.map, emissiveMap: m.emissiveMap, emissive: m.emissive.clone(), color: m.color.clone(), transparent: m.transparent, opacity: m.opacity,
      alphaTest: m.alphaTest, side: m.side, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits, roughness: fac ? 1 : q[0], metalness: fac ? 0 : q[1],
      roughnessMap: m.userData.rough || null, normalMap: m.userData.nrm || null, depthWrite: m.depthWrite, envMapIntensity: key === 'glass' ? 1.2 : fac ? .8 : LOOK.envI });
    if (m.userData.nrm) p.normalScale.set(m.userData.ns || 1, m.userData.ns || 1);
    if (fac) FACADES.push(p); M.pbr = p; }
}
function setStaticPBR(on) {
  for (const key in MATS) { const M = MATS[key]; if (!M.pbr) continue; M.mat = on ? M.pbr : M.low; }
  staticMeshes.forEach(s => { const M = MATS[s.userData.key]; if (M) s.material = M.mat; });
}
const matsOf = key => { const M = MATS[key]; return M ? [M.low || M.mat, M.pbr].filter((m, i, a) => m && a.indexOf(m) === i) : []; };   // both versions, for anything that changes a material's colour
// --- the environment map: the sky (and a plain ground below the horizon) rendered into a cube and prefiltered, redone when the hour
//     or the weather has moved on enough to show
const ENVM = { pm: null, rt: null, scene: new T.Scene(), tod: -9, cloud: -9, rain: -9, t: -99, busy: false };
{ const dome = new T.Mesh(new T.SphereGeometry(40, 32, 16), skyMat); ENVM.scene.add(dome);
  ENVM.ground = new T.Mesh(new T.CircleGeometry(38, 24), new T.MeshBasicMaterial({ color: 0x3a3c40, fog: false })); ENVM.ground.rotation.x = -PI / 2; ENVM.ground.position.y = -3; ENVM.scene.add(ENVM.ground); }
function refreshEnv(force) {
  if (!GQ.env) { if (scene.environment) scene.environment = null; return; }
  if (!force && Math.abs(G.tod - ENVM.tod) < .12 && Math.abs(WX.cloud - ENVM.cloud) < .06 && Math.abs(WX.rain - ENVM.rain) < .1 && scene.environment) return;
  if (!force && G.time - ENVM.t < 1.5 && scene.environment) return;
  ENVM.tod = G.tod; ENVM.cloud = WX.cloud; ENVM.rain = WX.rain; ENVM.t = G.time;
  if (!ENVM.pm) { ENVM.pm = new T.PMREMGenerator(renderer); }
  ENVM.ground.material.color.copy(hemi.groundColor).multiplyScalar(.5 + hemi.intensity * .3);
  const tm = renderer.toneMapping; renderer.toneMapping = T.NoToneMapping;   // the map holds light, not a picture of it
  const was = SKY.flash.value; SKY.flash.value = 0; const rt = ENVM.pm.fromScene(ENVM.scene, 0, .1, 100); SKY.flash.value = was; renderer.toneMapping = tm;
  if (ENVM.rt) ENVM.rt.dispose(); ENVM.rt = rt; scene.environment = rt.texture;
}
// --- the HDR pipeline
const POST = { on: false, w: 0, h: 0, scene: null, ao: null, ao2: null, ldr: null, bloom: null, quad: null, cam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), exp: 1, prevVP: new T.Matrix4(), vp: new T.Matrix4(), first: true };
const HDR_TYPE = renderer.capabilities.isWebGL2 || renderer.extensions.get('OES_texture_half_float') ? T.HalfFloatType : T.UnsignedByteType;
POST.quad = new T.Mesh(new T.PlaneGeometry(2, 2)); POST.quadScene = new T.Scene(); POST.quadScene.add(POST.quad); POST.quad.frustumCulled = false;
const QUAD_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// ambient occlusion from depth alone (no second pass over the city): each pixel's position and normal are rebuilt from the depth
// buffer, and twelve samples round it ask how much of the space above it is filled
const aoMat = new T.ShaderMaterial({
  uniforms: { tDepth: { value: null }, res: { value: new T.Vector2() }, projInv: { value: new T.Matrix4() }, projScale: { value: 1 }, radius: { value: 1.6 }, intensity: { value: 1 }, aspect: { value: 1 } },
  vertexShader: QUAD_VS,
  fragmentShader: `uniform sampler2D tDepth; uniform vec2 res; uniform mat4 projInv; uniform float projScale; uniform float radius; uniform float intensity; uniform float aspect; varying vec2 vUv;
    // every position is rebuilt at the centre of the depth texel it was read from: half a texel out, a steep floor seen at a slant
    // comes back tilted a row at a time (that drew lines across the road)
    vec2 snap(vec2 uv) { return (floor(uv * res) + 0.5) / res; }
    vec3 vpos(vec2 uv) { uv = snap(uv); float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
    void main() {
      vec2 uv0 = snap(vUv); float d0 = texture2D(tDepth, uv0).x; if (d0 >= 0.99999) { gl_FragColor = vec4(1.0); return; }
      vec2 px = 1.0 / res; vec3 P = vpos(uv0), Pr = vpos(uv0 + vec2(px.x, 0.0)), Pl = vpos(uv0 - vec2(px.x, 0.0)), Pu = vpos(uv0 + vec2(0.0, px.y)), Pd = vpos(uv0 - vec2(0.0, px.y));
      vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl, dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd, N = normalize(cross(dx, dy));
      if (dot(N, P) > 0.0) N = -N;
      float ssr = min(radius * projScale / -P.z, 0.12), rot = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831, r2 = radius * radius, sum = 0.0;
      for (int i = 0; i < 12; i++) { float fi = float(i) + 0.5, a = fi * 2.39996 + rot, r = ssr * sqrt(fi / 12.0);
        vec3 v = vpos(uv0 + vec2(cos(a), sin(a) * aspect) * r) - P; float vv = dot(v, v), f = max(r2 - vv, 0.0);
        sum += f * f * f * max((dot(v, N) - 0.01 * -P.z) / (vv + 0.01), 0.0); }
      float ao = max(0.0, 1.0 - sum * intensity * 5.0 / (r2 * r2 * r2 * 12.0));
      gl_FragColor = vec4(ao, ao, ao, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});
// a blur that does not smear the occlusion across a depth edge
const aoBlurMat = new T.ShaderMaterial({
  uniforms: { tAO: { value: null }, tDepth: { value: null }, res: { value: new T.Vector2() }, near: { value: .12 }, far: { value: 1000 } },
  vertexShader: QUAD_VS,
  fragmentShader: `uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 res; uniform float near; uniform float far; varying vec2 vUv;
    float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    void main() { float z0 = lin(texture2D(tDepth, vUv).x), s = 0.0, w = 0.0;
      for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) { vec2 o = vec2(float(x), float(y)) / res; float z = lin(texture2D(tDepth, vUv + o).x), k = 1.0 / (0.02 + abs(z - z0) / max(z0, 1.0) * 30.0);
        s += texture2D(tAO, vUv + o).r * k; w += k; }
      float a = s / w; gl_FragColor = vec4(a, a, a, 1.0); }`,
  depthTest: false, depthWrite: false,
});
// the last step in linear light and the first on the screen: (motion blur, depth of field,) occlusion, exposure, filmic tone mapping,
// then colour grading, vignette and a little grain
function gradeMat(o) {
  return new T.ShaderMaterial({
    defines: Object.assign({}, o.ao ? { USE_AO: 1 } : {}, o.dof ? { USE_DOF: 1 } : {}, o.mblur ? { USE_MBLUR: 1 } : {}, o.ssr ? { USE_SSR: 1, SSR_STEPS: o.ssr > 1 ? 30 : 18, SSR_GROW: o.ssr > 1 ? '1.19' : '1.3' } : {}),
    uniforms: { tColor: { value: null }, tAO: { value: null }, tDepth: { value: null }, exposure: { value: 1 }, aoAmt: { value: .75 }, sat: { value: 1.06 }, contrast: { value: 1.06 }, tintLo: { value: new T.Vector3(1, 1, 1) },
      tintHi: { value: new T.Vector3(1, 1, 1) }, vign: { value: .32 }, grain: { value: .018 }, time: { value: 0 }, res: { value: new T.Vector2() }, near: { value: .12 }, far: { value: 1000 }, focus: { value: 6 },
      projInv: { value: new T.Matrix4() }, viewInv: { value: new T.Matrix4() }, prevVP: { value: new T.Matrix4() }, mbAmt: { value: 1 }, tDrops: { value: DROPS }, dropAmt: { value: 0 }, dropT: { value: 0 }, projMat: { value: new T.Matrix4() }, upV: { value: new T.Vector3() } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tColor; uniform sampler2D tAO; uniform sampler2D tDepth; uniform float exposure; uniform float aoAmt; uniform float sat; uniform float contrast; uniform vec3 tintLo; uniform vec3 tintHi;
      uniform float vign; uniform float grain; uniform float time; uniform vec2 res; uniform float near; uniform float far; uniform float focus; uniform mat4 projInv; uniform mat4 viewInv; uniform mat4 prevVP; uniform float mbAmt; uniform sampler2D tDrops; uniform float dropAmt; uniform float dropT; uniform mat4 projMat; uniform vec3 upV; varying vec2 vUv;
      float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c) { const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777)); const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        c = I * (c / 0.6); c = RRTAndODTFit(c); return clamp(O * c, 0.0, 1.0); }
      vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      float hsh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = vUv; float dm = 0.0;
        if (dropAmt > 0.01) { vec2 duv = vec2(vUv.x * res.x / res.y, vUv.y) * 1.2 + vec2(0.0, dropT * 0.01); vec4 dr = texture2D(tDrops, duv); dm = dr.b * step(1.0 - dropAmt * 0.85, hsh(floor(duv * 5.0) + floor(dropT * 0.05))); uv += (dr.rg - 0.5) * 0.07 * dm; }   // rain on the lens
        vec3 c = texture2D(tColor, uv).rgb * (1.0 + 0.06 * dm);
        #ifdef USE_SSR
        // wet ground mirrors the street: the ground writes how much it mirrors into alpha; trace the reflected ray through the depth
        { float m = 1.0 - texture2D(tColor, vUv).a; if (m > 0.02) { float d0 = texture2D(tDepth, vUv).x; vec4 vp = projInv * vec4(vUv * 2.0 - 1.0, d0 * 2.0 - 1.0, 1.0); vec3 P = vp.xyz / vp.w, V = normalize(P), N = normalize(upV), R = reflect(V, N);
          float F = 0.05 + 0.95 * pow(1.0 - max(dot(-V, N), 0.0), 5.0), t = 0.2, tp = 0.0, hit = 0.0; vec2 huv = vec2(0.0); float jit = hsh(gl_FragCoord.xy + time) * 0.24 + 0.88;
          for (int i = 0; i < SSR_STEPS; i++) { vec3 Q = P + R * t * jit; vec4 cp = projMat * vec4(Q, 1.0); if (cp.w <= 0.0) break; vec2 su = cp.xy / cp.w * 0.5 + 0.5; if (su.x < 0.0 || su.x > 1.0 || su.y < 0.0 || su.y > 1.0) break;
            float sd = texture2D(tDepth, su).x; if (sd < 0.99999) { vec4 sv = projInv * vec4(su * 2.0 - 1.0, sd * 2.0 - 1.0, 1.0); float sz = sv.z / sv.w;
              if (Q.z < sz && sz - Q.z < 0.5 + t * 0.15) { float a = tp, b = t; for (int r = 0; r < 4; r++) { float mid = (a + b) * 0.5; vec3 Qm = P + R * mid * jit; vec4 cm = projMat * vec4(Qm, 1.0); vec2 um = cm.xy / cm.w * 0.5 + 0.5; vec4 smv = projInv * vec4(um * 2.0 - 1.0, texture2D(tDepth, um).x * 2.0 - 1.0, 1.0);
                  if (Qm.z < smv.z / smv.w) b = mid; else a = mid; } vec3 Qb = P + R * b * jit; vec4 cb = projMat * vec4(Qb, 1.0); huv = cb.xy / cb.w * 0.5 + 0.5; hit = 1.0; break; } }
            tp = t; t *= SSR_GROW; }
          if (hit > 0.0) { vec2 e = smoothstep(0.0, 0.1, huv) * smoothstep(0.0, 0.1, 1.0 - huv); float rgh = 1.0 - smoothstep(0.35, 0.8, m);   // the rough wet road smears it down the screen, a puddle is a mirror
            vec3 rc = (texture2D(tColor, huv).rgb + texture2D(tColor, huv + vec2(0.0, 0.012 * rgh)).rgb + texture2D(tColor, huv - vec2(0.0, 0.012 * rgh)).rgb) / 3.0;
            c = mix(c, rc, clamp(m * F * e.x * e.y * 1.25, 0.0, 0.9)); } } }
        #endif
        #ifdef USE_MBLUR
        { float d = texture2D(tDepth, vUv).x; if (d < 0.99999 && lin(d) > 7.0) { vec4 v = projInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w; vec4 w = viewInv * v; vec4 pp = prevVP * w; vec2 puv = pp.xy / pp.w * 0.5 + 0.5;
          vec2 vel = clamp((vUv - puv) * mbAmt, -0.03, 0.03); if (dot(vel, vel) > 1e-7) { vec3 acc = c; for (int i = 1; i < 8; i++) acc += texture2D(tColor, vUv - vel * (float(i) / 7.0 - 0.5)).rgb; c = acc / 8.0; } } }
        #endif
        #ifdef USE_DOF
        { float z = lin(texture2D(tDepth, vUv).x), coc = clamp((z - focus * 3.0) / (focus * 14.0), 0.0, 1.0) * 6.0; if (coc > 0.3) { vec3 acc = c; float n = 1.0;
          for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996, r = coc * sqrt((float(i) + 0.5) / 12.0); vec2 o = vec2(cos(a), sin(a)) * r / res; float zz = lin(texture2D(tDepth, vUv + o).x); if (zz > focus * 2.0) { acc += texture2D(tColor, vUv + o).rgb; n += 1.0; } }
          c = acc / n; } }
        #endif
        #ifdef USE_AO
        c *= mix(1.0, texture2D(tAO, vUv).r, aoAmt);
        #endif
        c = toSRGB(aces(c * exposure));
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat); c = (c - 0.5) * contrast + 0.5; c *= mix(tintLo, tintHi, smoothstep(0.1, 0.9, l));
        vec2 q = vUv - 0.5; c *= 1.0 - vign * dot(q, q) * 1.5; c += (hsh(vUv * res + fract(time) * 61.0) - 0.5) * grain;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
}
// FXAA, after grading (it wants the picture as it will be seen)
const fxaaMat = new T.ShaderMaterial({
  uniforms: { tColor: { value: null }, res: { value: new T.Vector2() } }, vertexShader: QUAD_VS,
  fragmentShader: `uniform sampler2D tColor; uniform vec2 res; varying vec2 vUv;
    void main() { vec2 inv = 1.0 / res, fc = vUv * res; vec3 L = vec3(0.299, 0.587, 0.114);
      vec3 nw = texture2D(tColor, (fc + vec2(-1.0, -1.0)) * inv).rgb, ne = texture2D(tColor, (fc + vec2(1.0, -1.0)) * inv).rgb, sw = texture2D(tColor, (fc + vec2(-1.0, 1.0)) * inv).rgb, se = texture2D(tColor, (fc + vec2(1.0, 1.0)) * inv).rgb, m = texture2D(tColor, vUv).rgb;
      float lnw = dot(nw, L), lne = dot(ne, L), lsw = dot(sw, L), lse = dot(se, L), lm = dot(m, L), lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
      vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse)); float red = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0), rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
      dir = clamp(dir * rcp, -8.0, 8.0) * inv;
      vec3 a = 0.5 * (texture2D(tColor, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tColor, vUv + dir * (2.0 / 3.0 - 0.5)).rgb), b = a * 0.5 + 0.25 * (texture2D(tColor, vUv - dir * 0.5).rgb + texture2D(tColor, vUv + dir * 0.5).rgb);
      float lb = dot(b, L); gl_FragColor = vec4(lb < lmin || lb > lmax ? a : b, 1.0); }`,
  depthTest: false, depthWrite: false,
});
function disposePost() { ['scene', 'ao', 'ao2', 'ldr'].forEach(k => { if (POST[k]) { POST[k].dispose(); if (POST[k].depthTexture) POST[k].depthTexture.dispose(); POST[k] = null; } }); if (POST.bloom) { POST.bloom.dispose(); POST.bloom = null; } if (POST.grade) { POST.grade.dispose(); POST.grade = null; } }
function buildPost() {
  disposePost(); POST.on = !!GQ.post; if (!POST.on) return;
  const v = renderer.getDrawingBufferSize(new T.Vector2()), w = Math.max(2, v.x | 0), h = Math.max(2, v.y | 0); POST.w = w; POST.h = h;
  const opt = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: HDR_TYPE, depthBuffer: true, stencilBuffer: false };
  POST.scene = new T.WebGLRenderTarget(w, h, opt); POST.scene.depthTexture = new T.DepthTexture(w, h); POST.scene.depthTexture.type = renderer.capabilities.isWebGL2 || renderer.extensions.get('WEBGL_depth_texture') ? T.UnsignedIntType : T.UnsignedShortType;
  if (GQ.ao) { const k = GQ.ao === 2 ? 1 : .5, o2 = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: false, stencilBuffer: false }; POST.ao = new T.WebGLRenderTarget(Math.max(2, w * k | 0), Math.max(2, h * k | 0), o2); POST.ao2 = POST.ao.clone(); }
  if (GQ.aa) POST.ldr = new T.WebGLRenderTarget(w, h, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: false, stencilBuffer: false });
  if (GQ.bloom) { POST.bloom = new T.UnrealBloomPass(new T.Vector2(w, h), .55, .5, 2.5); [POST.bloom.renderTargetBright].concat(POST.bloom.renderTargetsHorizontal, POST.bloom.renderTargetsVertical).forEach(rt => { rt.texture.type = HDR_TYPE; });
    const mc = POST.bloom.materialCopy; mc.blending = T.CustomBlending; mc.blendEquation = T.AddEquation; mc.blendSrc = T.SrcAlphaFactor; mc.blendDst = T.OneFactor; mc.blendSrcAlpha = T.ZeroFactor; mc.blendDstAlpha = T.OneFactor; }   // add light, keep the mirror mask in alpha
  POST.grade = gradeMat({ ao: !!GQ.ao, dof: !!GQ.dof, mblur: !!GQ.mblur, ssr: GQ.ssr | 0 }); POST.first = true;
}
function quad(mat, target) { POST.quad.material = mat; renderer.setRenderTarget(target); renderer.render(POST.quadScene, POST.cam); }
// one frame, whatever the settings. The first-person gun goes on last, straight to the screen.
function drawFrame() {
  if (!POST.on) { renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera); }
  else {
    const v = renderer.getDrawingBufferSize(_dsz); if ((v.x | 0) !== POST.w || (v.y | 0) !== POST.h) buildPost();
    renderer.setRenderTarget(POST.scene); renderer.clear(); renderer.render(scene, camera);
    const pi = camera.projectionMatrixInverse, U = POST.grade.uniforms;
    if (POST.ao) { const a = aoMat.uniforms; a.tDepth.value = POST.scene.depthTexture; a.res.value.set(POST.w, POST.h); a.projInv.value.copy(pi); a.projScale.value = camera.projectionMatrix.elements[5] * .5; a.aspect.value = camera.aspect; quad(aoMat, POST.ao);
      const b = aoBlurMat.uniforms; b.tAO.value = POST.ao.texture; b.tDepth.value = POST.scene.depthTexture; b.res.value.set(POST.ao.width, POST.ao.height); b.near.value = camera.near; b.far.value = camera.far; quad(aoBlurMat, POST.ao2); U.tAO.value = POST.ao2.texture; }
    if (POST.bloom) { POST.bloom.threshold = POST.bthr; POST.bloom.strength = POST.bstr; POST.bloom.render(renderer, null, POST.scene, 0, false); }
    if (GQ.ssr) { U.projInv.value.copy(pi); U.projMat.value.copy(camera.projectionMatrix); U.upV.value.set(0, 1, 0).transformDirection(camera.matrixWorldInverse); }
    U.tColor.value = POST.scene.texture; U.tDepth.value = POST.scene.depthTexture; U.exposure.value = POST.exp; U.res.value.set(POST.w, POST.h); U.time.value = G.time; U.near.value = camera.near; U.far.value = camera.far;
    if (GQ.mblur || GQ.dof) { U.projInv.value.copy(pi); U.viewInv.value.copy(camera.matrixWorld); POST.vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); U.prevVP.value.copy(POST.first ? POST.vp : POST.prevVP); POST.prevVP.copy(POST.vp); POST.first = false;
      U.focus.value = Math.max(2, hyp(camera.position.x - P.x, camera.position.y - P.y - 1.2, camera.position.z - P.z)); }
    if (POST.ldr) { quad(POST.grade, POST.ldr); fxaaMat.uniforms.tColor.value = POST.ldr.texture; fxaaMat.uniforms.res.value.set(POST.w, POST.h); quad(fxaaMat, null); } else quad(POST.grade, null);
  }
  if (vmRoot.visible) { const tm = renderer.toneMapping, ex = renderer.toneMappingExposure; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = POST.on ? POST.exp : ex; renderer.setRenderTarget(null); renderer.clearDepth(); renderer.render(vmScene, vmCam); renderer.toneMapping = tm; renderer.toneMappingExposure = ex; }
}
const _dsz = new T.Vector2();
// how the hour and the weather want the picture: exposure, bloom, grading (called with the lighting, from applyTod)
function lookTick() {
  const n = ENV.night, c = WX.cloud, dusk = clamp(1 - Math.abs(G.tod - 19.3) / 1.6, 0, 1) + clamp(1 - Math.abs(G.tod - 6.6) / 1.2, 0, 1);
  POST.exp = lerp(.9, 1.45, n) * (1 + c * .15) * LOOK.exp; renderer.toneMappingExposure = POST.on ? 1 : POST.exp;
  POST.bthr = lerp(3.4, 1.3, n); POST.bstr = lerp(.3, .55, n) * (1 + WX.rain * .25);
  if (POST.grade) { const U = POST.grade.uniforms; U.sat.value = lerp(1.08, .96, n) - c * .12; U.contrast.value = lerp(1.07, 1.1, n);
    U.tintHi.value.set(1 + dusk * .05, 1 + dusk * .01, 1 - dusk * .06); U.tintLo.value.set(lerp(1, .96, n), lerp(1, .99, n), lerp(1, 1.06, n)); U.vign.value = .3 + n * .15; U.grain.value = .012 + n * .014; U.aoAmt.value = GQ.ao === 2 ? .85 : .75; U.mbAmt.value = 1; }
}
// --- applying the settings
const VIEW = { far: 1000 };
function anisoAll(a) { const seen = new Set(); for (const k in MATS) [MATS[k].low, MATS[k].pbr, MATS[k].mat].forEach(m => { if (!m) return; ['map', 'emissiveMap', 'roughnessMap', 'normalMap'].forEach(t => { const x = m[t]; if (x && !seen.has(x)) { seen.add(x); x.anisotropy = a; x.needsUpdate = true; } }); }); }
function applyQuality(save) {
  const dpr = window.devicePixelRatio || 1; renderer.setPixelRatio(Math.min(dpr, GQ.res));
  renderer.shadowMap.enabled = GQ.shadow > 0;
  if (GQ.shadow > 0) { const sz = [0, 1024, 2048, 4096][GQ.shadow], r = [0, 70, 95, 120][GQ.shadow], c = sun.shadow.camera;
    if (sun.shadow.mapSize.x !== sz) { sun.shadow.mapSize.set(sz, sz); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.updateProjectionMatrix(); SHADOW.tex = r * 2 / sz; }
  renderer.shadowMap.needsUpdate = true;
  anisoAll([1, 4, Math.min(8, renderer.capabilities.getMaxAnisotropy())][GQ.tex]);
  VIEW.far = [450, 700, 1000, 1500][GQ.view]; camera.far = VIEW.far + 300; camera.updateProjectionMatrix(); skyDome.scale.setScalar((camera.far * .92) / 1800);
  applySurfaces(GQ.tex > 0 ? 1 : 0); makePBR(); puddleMats(); swayMats(); setStaticPBR(!!GQ.env); carLook(); charLook(); wheelLook(); waterLook();
  renderer.toneMapping = GQ.post ? T.NoToneMapping : T.ACESFilmicToneMapping;
  buildPost(); refreshEnv(true); if (!GQ.env) scene.environment = null;
  scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); ENVM.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  applyTod(G.tod || 17.5); applyWeather(); lookTick();
  if (save) { const sv = { preset: GQ.preset }; if (GQ.preset === 'custom') GQ_KEYS.forEach(k => { sv[k] = GQ[k]; }); try { localStorage.setItem('pc-gfx2', JSON.stringify(sv)); } catch (e) {} }
  gqUi();
}
function setPreset(p, save) { if (GQ_PRESETS[p]) Object.assign(GQ, GQ_PRESETS[p]); GQ.preset = p; applyQuality(save); }
const SHADOW = { tex: 190 / 2048 };
// --- the settings menu: the preset, and every setting by hand behind Advanced
const GQ_UI = [['res', 'gq-res'], ['shadow', 'gq-shadow'], ['tex', 'gq-tex'], ['view', 'gq-view'], ['aa', 'gq-aa'], ['env', 'gq-env'], ['ao', 'gq-ao'], ['post', 'gq-post'], ['bloom', 'gq-bloom'], ['dof', 'gq-dof'], ['mblur', 'gq-mblur'], ['ssr', 'gq-ssr']];
function gqUi() {
  const sel = $('set-gfx'); if (sel) sel.value = GQ.preset;
  GQ_UI.forEach(q => { const el = $(q[1]); if (!el) return; el.value = String(GQ[q[0]]); el.disabled = !GQ.post && (q[0] === 'ao' || q[0] === 'bloom' || q[0] === 'dof' || q[0] === 'mblur' || q[0] === 'aa' || q[0] === 'ssr'); });
}
if ($('set-gfx')) $('set-gfx').addEventListener('change', e => { const v = e.target.value; if (v === 'custom') { GQ.preset = 'custom'; applyQuality(true); } else setPreset(v, true); GFX.auto = true; });
GQ_UI.forEach(q => { const el = $(q[1]); if (el) el.addEventListener('change', () => { GQ[q[0]] = +el.value; GQ.preset = 'custom'; applyQuality(true); GFX.auto = true; }); });
if ($('gq-more')) $('gq-more').addEventListener('click', () => { const a = $('gq-adv'); a.hidden = !a.hidden; $('gq-more').textContent = a.hidden ? 'Advanced' : 'Hide advanced'; });
// a machine that cannot keep up steps down a preset by itself (from the frame loop), at most twice a session
function slowerPreset() { const order = ['ultra', 'high', 'medium', 'low'], i = order.indexOf(GQ.preset), next = i < 0 ? 'medium' : order[Math.min(order.length - 1, i + 1)]; if (next === GQ.preset) return false; setPreset(next, true); return next; }
