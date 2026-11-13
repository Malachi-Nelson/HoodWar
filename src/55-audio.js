/* =====================================================================
   5b. AUDIO — everything is synthesised: guns, engines, tyres, and three radio stations that write their own beats
   ===================================================================== */
let AC = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
const EAR = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
let sndBudget = 0;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  musicBus = AC.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1;
  // the city: a low hum of far traffic
  const wn = AC.createBufferSource(); wn.buffer = noiseBuf; wn.loop = true; const wf = AC.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 220; const wg = AC.createGain(); wg.gain.value = .05; wn.connect(wf); wf.connect(wg); wg.connect(master); wn.start();
  // tyres: one looping hiss whose level follows how hard the nearest car is sliding
  const sk = AC.createBufferSource(); sk.buffer = noiseBuf; sk.loop = true; const sf = AC.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1500; sf.Q.value = 2.2; SKID.g = AC.createGain(); SKID.g.gain.value = 0; sk.connect(sf); sf.connect(SKID.g); SKID.g.connect(sfxBus); sk.start();
  for (let i = 0; i < 4; i++) { const o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain(); o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 60; o2.frequency.value = 30; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o1.start(); o2.start(); ENGV.push({ o1, o2, f, g, car: null }); }
  SIREN.o = AC.createOscillator(); SIREN.o.type = 'sawtooth'; SIREN.o.frequency.value = 700; SIREN.f = AC.createBiquadFilter(); SIREN.f.type = 'lowpass'; SIREN.f.frequency.value = 1800; SIREN.g = AC.createGain(); SIREN.g.gain.value = 0; SIREN.o.connect(SIREN.f); SIREN.f.connect(SIREN.g); SIREN.g.connect(sfxBus); SIREN.o.start();
  // a helicopter: rotor noise chopped by a slow pulse, and the turbine's whine over it
  { const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; const am = AC.createGain(); am.gain.value = .5; const lfo = AC.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 12; const ld = AC.createGain(); ld.gain.value = .48; lfo.connect(ld); ld.connect(am.gain);
    const g = AC.createGain(); g.gain.value = 0; src.connect(f); f.connect(am); am.connect(g); g.connect(sfxBus); const wh = AC.createOscillator(); wh.type = 'sine'; wh.frequency.value = 1100; const wg = AC.createGain(); wg.gain.value = .045; wh.connect(wg); wg.connect(g); src.start(); lfo.start(); wh.start(); Object.assign(ROTOR, { g, lfo, wh }); }
  HORN.o = AC.createOscillator(); HORN.o2 = AC.createOscillator(); HORN.g = AC.createGain(); HORN.o.type = HORN.o2.type = 'square'; HORN.o.frequency.value = 392; HORN.o2.frequency.value = 494; HORN.g.gain.value = 0; HORN.o.connect(HORN.g); HORN.o2.connect(HORN.g); HORN.g.connect(sfxBus); HORN.o.start(); HORN.o2.start();
}
const SKID = { g: null }, ENGV = [], HORN = { o: null, g: null }, SIREN = { o: null, g: null }, ROTOR = { g: null };
function out(pan) { if (!AC || !pan || !AC.createStereoPanner) return sfxBus; const p = AC.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(sfxBus); return p; }
function sNoise(dur, freq, vol, type, when, dest) { if (!AC || vol < .004) return; const s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; const g = AC.createGain(), t = AC.currentTime + (when || 0); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(dest || sfxBus); s.start(t, rand() * .5, dur + .05); }
function sTone(f0, f1, dur, vol, wave, when, dest) { if (!AC || vol < .004) return; const o = AC.createOscillator(); o.type = wave || 'sine'; const g = AC.createGain(), t = AC.currentTime + (when || 0); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + dur + .05); }
// how loud and how far left or right something at (x,y,z) sounds from where the camera is
const HEAR = { v: 0, p: 0 };
function hear(x, y, z, range) { const dx = x - EAR.x, dz = z - EAR.z, d = hyp(dx, y - EAR.y, dz); HEAR.v = Math.pow(Math.max(0, 1 - d / range), 1.7); HEAR.p = d > .5 ? clamp((dx * EAR.rx + dz * EAR.rz) / d, -1, 1) * .8 : 0; return HEAR.v; }
const SFX = {
  // a gunshot in layers: the crack, the body of the report, the thump; mine is full, everyone else's thins out with distance
  shot: (d, x, y, z, mine) => { if (!AC) return; let v = 1, dest = sfxBus; if (!mine) { if (sndBudget <= 0 || hear(x, y, z, 150) < .015) return; sndBudget--; v = HEAR.v * .8; dest = out(HEAR.p); }
    const k = Math.min(1.25, .7 + d.kick * 3.2); sNoise(d.snd[0], d.snd[1], .9 * v, 'lowpass', 0, dest); sTone(220, 38, d.snd[0] * .9 + .04, .7 * k * v, 'sine', 0, dest);
    if (mine || v > .3) { sNoise(.026, 5200, .5 * k * v, 'highpass', 0, dest); sNoise(d.snd[0] * 2.4 + .1, 520, .18 * k * v, 'lowpass', .02, dest); } },
  cycle: () => { sNoise(.06, 1500, .35, 'bandpass', .2); sNoise(.06, 1900, .4, 'bandpass', .36); },
  hit: head => { if (head) { sNoise(.05, 2600, .45, 'bandpass'); sTone(1000, 320, .07, .28, 'triangle'); } else { sNoise(.06, 800, .5, 'bandpass'); sTone(150, 70, .07, .35); } },
  kill: head => { sTone(880, 880, .07, .22, 'triangle'); sTone(1320, 1320, .12, .22, 'triangle', .07); if (head) sTone(1760, 1760, .16, .18, 'triangle', .14); },
  metal: (x, y, z) => { if (sndBudget <= 0 || hear(x, y, z, 60) < .03) return; sndBudget--; const d = out(HEAR.p); sNoise(.05, 3200, .4 * HEAR.v, 'bandpass', 0, d); sTone(1900 + rand() * 900, 700, .08, .16 * HEAR.v, 'square', 0, d); },
  click: () => sTone(1300, 900, .04, .2, 'square'),
  reload: t => { sNoise(.05, 3000, .25, 'highpass'); sNoise(.06, 2500, .3, 'highpass', Math.max(.2, t - .25)); sTone(700, 500, .03, .1, 'square', Math.max(.2, t - .25)); },
  swap: () => sNoise(.05, 2200, .2, 'highpass'),
  step: v => sNoise(.05, 300, .13 * (v || 1)),
  land: () => sNoise(.09, 220, .4),
  hurt: () => { sTone(120, 45, .25, .5, 'square'); sNoise(.16, 500, .4); },
  punch: hit => { sNoise(.07, hit ? 500 : 2600, hit ? .7 : .25, hit ? 'lowpass' : 'highpass'); if (hit) sTone(140, 60, .09, .5); },
  buy: () => { sTone(660, 660, .09, .25, 'triangle'); sTone(990, 990, .14, .25, 'triangle', .09); },
  deny: () => sTone(160, 120, .15, .25, 'square'),
  cash: () => { sTone(1245, 1245, .06, .18, 'triangle'); sTone(1661, 1661, .12, .18, 'triangle', .06); },
  chain: () => { [1047, 1319, 1568].forEach((f, i) => sTone(f, f, .09, .2, 'triangle', i * .05)); },
  cap: mine => { (mine ? [392, 523, 659, 784] : [392, 370, 311, 262]).forEach((f, i) => sTone(f, f, .2, .22, 'sawtooth', i * .13)); },
  tick: () => sTone(520, 520, .04, .1, 'square'),
  door: (x, y, z) => { if (hear(x, y, z, 30) < .03) return; sNoise(.07, 420, .5 * HEAR.v); sTone(120, 80, .06, .3 * HEAR.v); },
  crash: (x, y, z, f) => { if (hear(x, y, z, 110) < .02) return; const v = HEAR.v * clamp(f / 14, .25, 1.2), d = out(HEAR.p); sNoise(.25, 700, .9 * v, 'lowpass', 0, d); sNoise(.1, 3200, .5 * v, 'bandpass', 0, d); sTone(110, 40, .22, .7 * v, 'square', 0, d); },
  boom: (x, y, z) => { hear(x, y, z, 320); const v = Math.max(.08, HEAR.v), d = out(HEAR.p); sNoise(1.1, 380, 1.3 * v, 'lowpass', 0, d); sTone(90, 24, .9, 1 * v, 'sine', 0, d); sNoise(.5, 2400, .4 * v, 'bandpass', .03, d); },
  streak: () => { [523, 659, 784, 1047].forEach((f, i) => sTone(f, f, .12, .2, 'square', i * .07)); },
  star: () => { sTone(988, 988, .09, .2, 'square'); sTone(740, 740, .16, .2, 'square', .11); },
  clear: () => { [523, 659, 784].forEach((f, i) => sTone(f, f, .14, .16, 'triangle', i * .09)); },
  dead: () => { sTone(300, 60, .9, .4, 'sawtooth'); sNoise(.5, 300, .5); },
  win: w => { (w ? [523, 659, 784, 1047, 1319] : [392, 349, 311, 262, 196]).forEach((f, i) => sTone(f, f, .3, .22, 'triangle', i * .16)); },
};
// engines: four voices follow the four nearest running cars
function updateEngines(dt, mine) {
  if (!AC) return; sndBudget = Math.min(14, sndBudget + dt * 34);
  const live = cars.filter(c => !c.wreck && !c.spec.air && (c.occ[0] || c.ai || hyp(c.vx, c.vz) > 1)).map(c => ({ c, d: c === mine ? -1 : hyp(c.x - EAR.x, c.z - EAR.z) })).sort((a, b) => a.d - b.d).slice(0, ENGV.length);
  let slip = 0;
  ENGV.forEach((v, i) => { const e = live[i], t = AC.currentTime;
    if (!e || e.d > 90) { v.g.gain.setTargetAtTime(0, t, .08); return; }
    const c = e.c, sp = hyp(c.vx, c.vz), top = c.spec.vmax, gear = Math.min(3, Math.floor(sp / (top / 4))), r = (sp - gear * top / 4) / (top / 4), f = 46 + r * 62 + gear * 9 + (c.inp.thr > 0 ? 9 : 0) + (c.type === 'sport' ? 14 : c.type === 'coupe' || c.type === 'lowrider' ? -6 : 0);
    v.o1.frequency.setTargetAtTime(f, t, .06); v.o2.frequency.setTargetAtTime(f * .5, t, .06); v.f.frequency.setTargetAtTime(280 + sp * 22 + (c.inp.thr > 0 ? 320 : 0), t, .08);
    const vol = c === mine ? .11 + (c.inp.thr > 0 ? .06 : 0) : .2 * Math.pow(Math.max(0, 1 - e.d / 90), 2); v.g.gain.setTargetAtTime(vol, t, .08);
    if (e.d < 45) slip = Math.max(slip, (c.slip > 4.5 ? Math.min(1, (c.slip - 4.5) / 6) : 0) * (c === mine ? 1 : .5), c.inp.hb && sp > 6 ? .7 : 0); });
  SKID.g.gain.setTargetAtTime(slip * .16, AC.currentTime, .05);
  // one siren: the nearest police car that has its lights on
  let sv = 0; for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c.cop || !c.horn || c.wreck || !c.occ[0]) continue; if (c === mine) { sv = Math.max(sv, .03); continue; } const d = hyp(c.x - EAR.x, c.z - EAR.z); if (d < 190) sv = Math.max(sv, .075 * Math.pow(1 - d / 190, 1.6)); }
  if (ROTOR.g) { let hb = null, hd = 1e9; for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c.spec.air || c.wreck || !(c.rotor > .04)) continue; const d = c === mine ? -1 : hyp(c.x - EAR.x, c.y - EAR.y, c.z - EAR.z); if (d < hd) { hd = d; hb = c; } }
    const rv = !hb || hd > 320 ? 0 : (hb === mine ? .2 : .45 * Math.pow(1 - hd / 320, 1.5)) * hb.rotor, t = AC.currentTime; ROTOR.g.gain.setTargetAtTime(rv, t, .1); if (hb) { ROTOR.lfo.frequency.setTargetAtTime(5 + hb.rotor * 9, t, .2); ROTOR.wh.frequency.setTargetAtTime(650 + hb.rotor * 550, t, .2); } }
  SIREN.g.gain.setTargetAtTime(sv, AC.currentTime, .12); if (sv > 0) { const ph = (AC.currentTime * .6) % 1, tri = ph < .5 ? ph * 2 : 2 - ph * 2; SIREN.o.frequency.setTargetAtTime(620 + tri * 540, AC.currentTime, .03); }
}
function setHorn(on) { if (AC) HORN.g.gain.setTargetAtTime(on ? .07 : 0, AC.currentTime, .015); }

// --- radio: a step sequencer. Each station is a tempo, a key and rules for writing a bar; nothing is recorded.
const STATIONS = [
  { name: 'WKPC 94.7', tag: 'Trap', bpm: 142, root: 43.65, scale: [0, 3, 5, 7, 10, 12], seed: 11 },
  { name: 'The Stoop 88.1', tag: 'Boom bap', bpm: 92, root: 55, scale: [0, 3, 5, 7, 10, 12], seed: 29, swing: .32 },
  { name: 'Night Drive 101', tag: 'Synth', bpm: 108, root: 49, scale: [0, 2, 3, 7, 8, 12], seed: 47 },
];
const RADIO = { on: -1, step: 0, next: 0, bar: null, barN: 0, timer: null, vol: .0 };
const hz = (root, semi) => root * Math.pow(2, semi / 12);
function writeBar(st, n) {
  const r = rng32(st.seed * 100 + (n % 8) * 7 + 1), B = { k: [], s: [], h: [], b: [], l: [] };
  for (let i = 0; i < 16; i++) { B.k.push(0); B.s.push(0); B.h.push(0); B.b.push(-1); B.l.push(-1); }
  const turn = n % 4 === 3;
  if (st.tag === 'Trap') { [0, 6, 10].forEach(i => B.k[i] = 1); if (r() < .6) B.k[13] = 1; if (turn) B.k[15] = 1; B.s[8] = 1; for (let i = 0; i < 16; i += 2) B.h[i] = 1; const roll = 2 + Math.floor(r() * 6) * 2; B.h[roll] = 3; if (turn) B.h[14] = 4;
    const note = [0, 0, 3, 5][n % 4]; B.b[0] = note; B.b[6] = note; B.b[10] = turn ? note + 5 : note; for (let i = 0; i < 16; i += 4) if (r() < .7) B.l[i + (r() < .5 ? 0 : 2)] = pick(r, st.scale) + 24; }
  else if (st.tag === 'Boom bap') { B.k[0] = 1; B.k[7] = 1; B.k[10] = 1; if (r() < .5) B.k[3] = 1; B.s[4] = 1; B.s[12] = 1; for (let i = 0; i < 16; i += 2) B.h[i] = 1; if (r() < .5) B.h[15] = 1;
    const walk = [0, 0, 3, 5, 7, 5, 3, 10]; for (let i = 0; i < 16; i += 4) B.b[i] = walk[(n * 2 + i / 4) % 8]; B.b[10] = walk[(n + 3) % 8]; [0, 6, 12].forEach(i => { if (r() < .75) B.l[i] = pick(r, [0, 3, 7, 10]) + 24; }); }
  else { for (let i = 0; i < 16; i += 4) B.k[i] = 1; B.s[4] = 1; B.s[12] = 1; for (let i = 2; i < 16; i += 4) B.h[i] = 2; const ch = [0, 8, 3, 10][n % 4]; for (let i = 0; i < 16; i += 2) B.b[i] = ch + (i % 4 === 2 ? 12 : 0); B.l[0] = ch + 24; B.l[4] = ch + 27; B.l[8] = ch + 31; if (turn) B.l[12] = ch + 36; B.pad = ch; }
  return B;
}
function radioTick() {
  if (!AC || RADIO.on < 0) return; const st = STATIONS[RADIO.on], spb = 60 / st.bpm / 4;
  while (RADIO.next < AC.currentTime + .14) {
    const i = RADIO.step % 16; if (i === 0) { RADIO.bar = writeBar(st, RADIO.barN++); }
    const B = RADIO.bar, w = Math.max(0, RADIO.next - AC.currentTime) + (st.swing && i % 2 ? spb * st.swing : 0), m = musicBus;
    if (B.k[i]) { sTone(150, 42, .2, .8, 'sine', w, m); sNoise(.012, 3000, .25, 'highpass', w, m); }
    if (B.s[i]) { sNoise(.13, 1900, .5, 'bandpass', w, m); sTone(200, 150, .08, .25, 'triangle', w, m); if (st.tag === 'Trap') sNoise(.1, 2600, .3, 'bandpass', w + .012, m); }
    if (B.h[i]) { const n = B.h[i] >= 3 ? B.h[i] : 1; for (let q = 0; q < n; q++) sNoise(B.h[i] === 2 ? .12 : .028, 7500, .16, 'highpass', w + q * spb / n, m); }
    if (B.b[i] >= 0) { const f = hz(st.root, B.b[i]); if (st.tag === 'Synth') sTone(f * 2, f * 2, spb * 1.6, .16, 'sawtooth', w, m); else sTone(f * 1.04, f, st.tag === 'Trap' ? .55 : .3, .6, 'sine', w, m); }
    if (B.l[i] >= 0) { const f = hz(st.root, B.l[i]); sTone(f, f, st.tag === 'Synth' ? .3 : .22, .1, st.tag === 'Boom bap' ? 'triangle' : 'square', w, m); if (st.tag === 'Boom bap') sTone(f * 1.5, f * 1.5, .22, .06, 'triangle', w, m); }
    if (B.pad !== undefined && i === 0) [0, 7, 15].forEach(o => sTone(hz(st.root, B.pad + 12 + o), hz(st.root, B.pad + 12 + o), spb * 15, .045, 'sawtooth', w, m));
    RADIO.next += spb; RADIO.step++;
  }
}
function setRadio(n) { RADIO.on = n; if (!AC) return; if (n >= 0) { RADIO.step = 0; RADIO.barN = 0; RADIO.next = AC.currentTime + .08; } if (!RADIO.timer) RADIO.timer = setInterval(radioTick, 50); }
function radioVolume(v) { if (AC && musicBus) musicBus.gain.setTargetAtTime(v, AC.currentTime, .12); }
