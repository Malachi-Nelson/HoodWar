/* =====================================================================
   12. MULTIPLAYER — the same scheme as the Black Ops Clone engine. Everyone with the page open shares a small
       "presence" record. One player hosts: their machine runs the bots, the traffic, the turf and the police, and
       publishes it ten times a second. Everyone else sends where they are, what they hit and what they ask for.
       A player's own body and the car they are driving are theirs to simulate; the host fits them into its world.
       By default every player is in the host's crew and players cannot hurt each other. With rival sides on, each keeps the crew
       they picked, or the police, and anyone on another side is fair game.
   ===================================================================== */
Object.assign(NET, { hostPeer: null, seq: 0, hits: [], hp: [], reqs: [], kd: null, evSeen: -1, lastDmg: -1, sendT: 0, lost: 0, lastS: null, pkGone: {}, slots: {}, dmgOut: {}, lob: null, bytes: 0, myBoom: -9, knSeen: 0, joinT: 0 });
const ALLPAINT = PAINTS.concat(CREW_PAINT, [COP_PAINT]);
const B36 = (n, w) => { n = Math.max(0, Math.round(n)); let s = n.toString(36); while (s.length < w) s = '0' + s; return s.length > w ? 'z'.repeat(w) : s; };
const U36 = (s, o, w) => parseInt(s.substr(o, w), 36);
const r2 = v => Math.round(v * 100) / 100;
const cleanName = n => String(n || '').replace(/[^\w \-]/g, '').trim().slice(0, 14) || 'Player';
const myName = () => cleanName($('co-name').value);
const SNAP = .13;   // everything from another machine is drawn this far in the past, so there are always two positions to glide between
const crewOf = sideOf;   // a side from the wire: a crew, or the police
function snapPush(buf, s) { s.t = performance.now() / 1000; const L = buf[buf.length - 1]; if (L && s.t - L.t < .02) { buf[buf.length - 1] = s; return; } buf.push(s); if (buf.length > 8) buf.shift(); }
function snapAt(buf, o) {   // o gets x, y, z, yaw (and pitch, vf when the snapshots carry them)
  if (!buf.length) return false; const rt = performance.now() / 1000 - SNAP; let a = buf[0], b = buf[buf.length - 1];
  for (let q = buf.length - 1; q > 0; q--) if (buf[q - 1].t <= rt) { a = buf[q - 1]; b = buf[q]; break; }
  if (a === b && buf.length > 1) a = buf[buf.length - 2];
  const span = Math.max(.001, b.t - a.t), far = hyp(b.x - a.x, b.z - a.z) > 14 || Math.abs(b.y - a.y) > 5, f = a === b || far ? 1 : clamp((rt - a.t) / span, 0, 1 + Math.min(.15, span) / span), g = Math.min(1, f);
  o.x = a.x + (b.x - a.x) * f; o.y = a.y + (b.y - a.y) * f; o.z = a.z + (b.z - a.z) * f; o.yaw = a.yaw + angTo(a.yaw, b.yaw) * g; if (b.pitch !== undefined) o.pitch = a.pitch + (b.pitch - a.pitch) * g; if (b.roll !== undefined) o.roll = (a.roll || 0) + (b.roll - (a.roll || 0)) * g; if (b.vf !== undefined) o.vf = b.vf; return true;
}
// --- what I say about myself
const myPos = () => [r2(P.x), r2(P.y), r2(P.z), r2(P.yaw), r2(P.pitch)];
function myBody() {
  const c = P.car, fl = (P.reloadT > 0 ? 1 : 0) | (P.ads > .5 || P.shootT > 0 ? 2 : 0) | (P.dead ? 4 : 0) | (c ? 8 : 0) | (P.sprint ? 16 : 0) | (P.knock > .5 ? 32 : 0) | (P.safeT > 0 ? 64 : 0) | (P.chute ? 128 : 0);
  const o = { n: myName(), cr: P.team, rk: P.rank || 1, p: myPos(), a: [P.shots | 0, WEAPONS[P.wpn].n, fl, r2(c ? P.cyaw : P.yaw)], v: null };
  if (c && P.seat === 0 && c.mine !== false) { const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw); o.v = [c.id, r2(c.x), r2(c.z), r2(c.yaw), Math.round((c.vx * fx + c.vz * fz) * 10) / 10, Math.round(c.steer * 10) / 10, r2(c.y), (c.horn ? 1 : 0) | (c.slip > 5.5 ? 2 : 0)]; if (c.spec.air) o.v.push(r2(c.dive), r2(c.roll)); }
  if (P.hg || P.hr) o.hf = [P.hg | 0, P.hr | 0];
  return o;
}
function prune(list, max) { const now = G.time; while (list.length && (now - list[0].t > 1.6 || list.length > max)) list.shift(); return list.map(e => e.d); }
NET.reportBot = (b, dmg, head, wid) => { if (b.dead) return; b.flinch = .2; NET.hits.push({ t: G.time, d: [++NET.seq, 'b', b.id, Math.round(dmg), head ? 1 : 0, wcode(wid)] }); };
NET.reportCar = (c, dmg) => { NET.hits.push({ t: G.time, d: [++NET.seq, 'c', c.id, Math.round(dmg), 0, 0] }); };
NET.reportPlayer = (r, dmg, head, wid) => { if (r.slot === undefined || r.slot < 0) return; NET.hp.push({ t: G.time, d: [++NET.seq, r.slot, Math.round(dmg), head ? 1 : 0, wcode(wid)] }); };
NET.req = (...a) => { if (NET.mode !== 'client') return; NET.reqs.push({ t: G.time, d: [++NET.seq].concat(a) }); };
NET.died = (src, wid, head) => { NET.kd = [++NET.seq, GAME.ref(src), wcode(wid), head ? 1 : 0]; };
NET.hurt = (r, dmg, src, wid) => { if (r.slot === undefined || r.slot < 0) return; const e = NET.dmgOut[r.slot] || (NET.dmgOut[r.slot] = [r.slot, 0, '', 0]); e[1] = Math.round((e[1] + dmg) * 10) / 10; e[2] = GAME.ref(src); e[3] = wcode(wid); };
const widOf = n => n === 20 ? 'car' : n === 21 ? 'boom' : n === 22 ? 'fall' : WID[n] || 'pistol';
// --- other players: read where each one is, draw them, forget the ones who left
const _so = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
function netPeers(dt, each) {
  const seen = {}; let host = null;
  for (const pr of NET.room.peers()) {
    if (pr.isMe && pr.sameTab) { NET.me = pr.peer; continue; }
    const s = pr.presence; if (!s) continue;
    if (s.t !== 'h' && s.t !== 'c') { if (pr.peer === NET.hostPeer) host = pr; continue; }
    if (s.t === 'h' && (!host || host.presence.t !== 'h')) host = pr;
    if (!Array.isArray(s.p)) continue;
    seen[pr.peer] = 1; let r = NET.remotes[pr.peer];
    if (!r) { const team = G.rivals ? sideOf(s.cr) : G.crew, ch = makeChar(makeLook(hashStr(pr.peer), team)); if (!ch) continue;
      r = NET.remotes[pr.peer] = { kind: 'rp', peer: pr.peer, slot: -1, team, name: cleanName(s.n), x: s.p[0], y: s.p[1], z: s.p[2], yaw: s.p[3], pitch: 0, dead: false, deadT: 0, car: null, seat: 0, wpn: 'pistol', ch, buf: [], shots: s.a ? s.a[0] : 0, spd: 0, hs: 0, qs: 0, kdSeen: s.kd ? s.kd[0] : 0, hpSeen: (s.hp || []).reduce((m, h) => Math.max(m, h[0]), 0), kills: 0, deaths: 0, earn: 0, aim: 0, knock: 0, tag: null, safe: false, vbuf: [], heat: 0, wp: 0, evade: false, seenT: -99, crimeT: -99, lkx: s.p[0], lky: s.p[1], lkz: s.p[2] };
      (s.h || []).forEach(h => { if (h[0] > r.hs) r.hs = h[0]; }); (s.q || []).forEach(q => { if (q[0] > r.qs) r.qs = q[0]; });
      if (NET.mode === 'host') { let k = 1; const used = Object.keys(NET.slots).map(p => NET.slots[p]); while (used.includes(k)) k++; NET.slots[pr.peer] = k; r.slot = k; note(r.name + ' joined the session', 'g'); } }
    const p = s.p, A = s.a || [0, 1, 0, 0], ox = r.x, oz = r.z;
    if (s !== r.lastS) { r.lastS = s; snapPush(r.buf, { x: p[0], y: p[1], z: p[2], yaw: p[3], pitch: p[4] || 0 }); } if (snapAt(r.buf, _so)) { r.x = _so.x; r.y = _so.y; r.z = _so.z; r.yaw = _so.yaw; r.pitch = _so.pitch; }
    r.spd = lerp(r.spd, hyp(r.x - ox, r.z - oz) / Math.max(dt, .001), .3); r.wpn = WID[A[1]] || 'pistol'; r.ayaw = A[3];
    const fl = A[2] | 0, wasDead = r.dead; r.reload = !!(fl & 1); r.aim = fl & 2 ? 1 : 0; r.dead = !!(fl & 4); r.sprint = !!(fl & 16); r.knock = fl & 32 ? 1 : 0; r.safe = !!(fl & 64); r.chute = !!(fl & 128);
    { const hf = Array.isArray(s.hf) ? s.hf : [0, 0]; if (r.hg === undefined) { r.hg = hf[0] | 0; r.hr = hf[1] | 0; } if ((hf[0] | 0) > r.hg) fxHeli(r, 'gun', (hf[0] | 0) - r.hg); if ((hf[1] | 0) > r.hr) fxHeli(r, 'pod', (hf[1] | 0) - r.hr); r.hg = hf[0] | 0; r.hr = hf[1] | 0; } if (r.dead && !wasDead) r.deadT = 0; if (r.dead) r.deadT += dt;
    if (A[0] !== r.shots) { if (A[0] > r.shots && !r.dead) { fxShot(r, r.wpn); if (NET.mode === 'host') GAME.noise(r.x, r.z, r); } r.shots = A[0]; }
    const team = G.rivals ? sideOf(s.cr) : G.crew; if (team !== r.team || cleanName(s.n) !== r.name) { r.team = team; r.name = cleanName(s.n); setLook(r.ch, makeLook(hashStr(pr.peer), team)); killTag(r.tag); r.tag = null; }
    r.v = Array.isArray(s.v) ? s.v : null; if ((s.rk | 0) !== (r.rank | 0)) { r.rank = clamp(s.rk | 0, 0, 999); killTag(r.tag); r.tag = null; }
    // incoming fire from this player
    (s.hp || []).forEach(h => { if (h[0] <= r.hpSeen) return; r.hpSeen = h[0]; if (h[1] !== NET.slot || r.team === P.team) return; const wid = widOf(h[4]); hurtPlayer(+h[2] || 0, r, wid, !!h[3]); if (wid === 'car' && !P.dead && !P.car) { P.knock = 1; P.knockT = 1; } });
    if (each) each(pr, s, r);
  }
  for (const k in NET.remotes) if (!seen[k]) { const r = NET.remotes[k]; if (NET.mode === 'host') { note(r.name + ' left', 'g'); cars.forEach(c => { for (let q = 0; q < 4; q++) if (c.occ[q] === r) { c.occ[q] = null; if (!q) c.kin = false; } }); delete NET.slots[k]; delete NET.dmgOut[r.slot]; } freeChar(r.ch); killTag(r.tag); if (r.chm) scene.remove(r.chm); r.gone = true; delete NET.remotes[k]; }
  return host;
}
const hashStr = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 100000; };
function remoteVisual(r, dt) {
  let seat = null, twist = 0, x = r.x, y = r.y, z = r.z, yaw = r.yaw;
  if (r.car && !r.car.gone) { seat = r.seat === 0 ? 'drive' : 'ride'; seatPos(r.car, r.seat, _sp); x = r.x = _sp.x; y = _sp.y; z = r.z = _sp.z; r.y = r.car.y; yaw = r.car.yaw; twist = r.aim ? clamp(angTo(yaw, r.ayaw || yaw), -1.5, 1.5) : 0; }
  poseChar(r.ch, { x, y, z, yaw, pitch: r.pitch, spd: r.spd, air: false, wpn: r.wpn, aim: r.aim, reload: r.reload, seat, twist, dead: r.dead ? r.deadT : -1, knock: r.knock, sprint: r.sprint }, dt);
  const mate = r.team === P.team, show = !r.dead && (mate || hyp(r.x - P.x, r.z - P.z) < 30);
  if (show && !r.tag) r.tag = nameTag(r.name, lite(r.team), false, r.rank | 0); if (r.tag) { r.tag.visible = show; if (show) { r.tag.position.set(x, y + (seat ? 1.55 : 2.15), z); const d = hyp(x - camera.position.x, z - camera.position.z); r.tag.scale.set(clamp(d * .07, 1.2, 6), clamp(d * .07, 1.2, 6) / 4, 1); } }
}
// --- the world as the host tells it. A whole city has to fit in one small message, so every record is fixed-width base 36,
//     people in cars are written without a position of their own, and cars standing empty are written without speed or seats.
const BOT_W = 19, CIV_W = 13, RIDE_W = 14, CAR_W = 22, PARK_W = 16, PICK_W = 13, NET_MAX = 3850;   // ids take three characters: a session with no end runs through thousands of them
const encYaw = y => B36(((y % TAU) + TAU) % TAU / TAU * 1295, 2);
// -> [crew and police on foot, bystanders on foot, anyone in a car]. A bystander has no gun and is rarely the one being aimed at,
// so their record is the shortest: height to a quarter of a metre, facing to ten degrees.
function encBots(skip) {
  let f = '', v = '', r = '';
  for (let i = 0; i < bots.length; i++) { const b = bots[i]; if ((b.dead && b.deadT > 7) || (skip && skip.has(b))) continue;
    const fl = (b.dead ? 1 : 0) | (b.aim > .5 ? 2 : 0) | (b.knock > .5 ? 4 : 0) | (b.reloadT > 0 ? 8 : 0) | (b.temp ? 16 : 0), tail = B36(clamp((b.pitch + 1.5) / 3, 0, 1) * 35, 1) + B36(fl, 1) + B36(WEAPONS[b.wpn].n, 1) + B36(b.shots % 36, 1);
    if (b.car) { r += B36(b.id, 3) + B36(b.team, 1) + B36(b.car.id, 3) + B36(b.seat, 1) + encYaw(b.ayaw !== undefined && b.aim > .5 ? b.ayaw : b.yaw) + tail; continue; }
    const xz = B36((b.x + 8) * 16, 3) + B36((b.z + 8) * 16, 3), ar = B36((b.act | 0) + 12 * (b.role | 0), 1);
    if (b.team === TEAM_CIV) v += B36(b.id, 3) + xz + B36(clamp((b.y + .1) * 4, 0, 35), 1) + B36((((b.yaw % TAU) + TAU) % TAU / TAU * 36) % 36, 1) + B36(fl, 1) + ar;
    else f += B36(b.id, 3) + B36(b.team, 1) + xz + B36((b.y + 4) * 8, 2) + encYaw(b.yaw) + tail + ar; }
  return [f, v, r];
}
function decBots(sf, sv, sr) {
  const live = {};
  const get = (id, team, role, x, y, z, fl, wn, sh) => { live[id] = 1; let b = botById(id); if (b && (b.team !== team || b.role !== role)) { removeBot(b); b = null; }
    if (!b) { b = spawnBot(team, x, y, z, { id, wpn: team === TEAM_CIV ? 'fist' : WID[wn] || 'pistol', temp: !!(fl & 16), role }); if (!b) return null; b.shots = sh; b.onGround = true; if (fl & 1) { b.dead = true; b.deadT = 9; } }
    b.aim = fl & 2 ? 1 : 0; b.knock = fl & 4 ? 1 : 0; b.reloadT = fl & 8 ? 1 : 0; if ((fl & 1) && !b.dead) { b.dead = true; b.deadT = 0; if (b.car && b.car.occ[b.seat] === b) b.car.occ[b.seat] = null; b.car = null; }
    if (sh !== b.shots) { b.pend = (b.pend | 0) + 1; b.shots = sh; } return b; };
  const foot = (b, src, o, ar, pitch, civ) => { const x = U36(src, o, 3) / 16 - 8, z = U36(src, o + 3, 3) / 16 - 8, y = civ ? Math.max(0, U36(src, o + 6, 1) / 4 - .1) : U36(src, o + 6, 2) / 8 - 4, yaw = civ ? U36(src, o + 7, 1) / 36 * TAU : U36(src, o + 8, 2) / 1295 * TAU;
    if (b.car) { if (b.car.occ[b.seat] === b) b.car.occ[b.seat] = null; b.car = null; b.buf.length = 0; }                           // they have just got out
    b.act = ar % 12; snapPush(b.buf, { x, y, z, yaw, pitch }); };
  for (let o = 0; o + BOT_W <= sf.length; o += BOT_W) { const ar = U36(sf, o + 18, 1), b = get(U36(sf, o, 3), U36(sf, o + 3, 1), 0, U36(sf, o + 4, 3) / 16 - 8, 0, U36(sf, o + 7, 3) / 16 - 8, U36(sf, o + 15, 1), U36(sf, o + 16, 1), U36(sf, o + 17, 1)); if (b) foot(b, sf, o + 4, ar, U36(sf, o + 14, 1) / 35 * 3 - 1.5, false); }
  for (let o = 0; o + CIV_W <= sv.length; o += CIV_W) { const ar = U36(sv, o + 12, 1), b = get(U36(sv, o, 3), TEAM_CIV, Math.floor(ar / 12), U36(sv, o + 3, 3) / 16 - 8, 0, U36(sv, o + 6, 3) / 16 - 8, U36(sv, o + 11, 1), 0, 0); if (b) foot(b, sv, o + 3, ar, 0, true); }
  for (let o = 0; o + RIDE_W <= sr.length; o += RIDE_W) { const c = carById(U36(sr, o + 4, 3)), seat = U36(sr, o + 7, 1), yaw = U36(sr, o + 8, 2) / 1295 * TAU;
    const b = get(U36(sr, o, 3), U36(sr, o + 3, 1), 0, c ? c.x : 0, c ? c.y : 0, c ? c.z : 0, U36(sr, o + 11, 1), U36(sr, o + 12, 1), U36(sr, o + 13, 1)); if (!b) continue;
    if (b.car && (b.car !== c || b.seat !== seat) && b.car.occ[b.seat] === b) b.car.occ[b.seat] = null;
    b.car = b.dead ? null : c; b.seat = seat; b.act = 0; b.yaw = b.ayaw = yaw; b.pitch = U36(sr, o + 10, 1) / 35 * 3 - 1.5; b.buf.length = 0; if (b.car) b.car.occ[seat] = b; }
  for (let i = bots.length - 1; i >= 0; i--) if (!live[bots[i].id]) removeBot(bots[i]);
}
function encCars() {   // -> [in use, standing empty]. A helicopter's head is four characters longer: its height (to 320 m) and its lean.
  let s = '', pk = '';
  for (let i = 0; i < cars.length; i++) { const c = cars[i], fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), vf = c.vx * fx + c.vz * fz, fl = (c.wreck ? 1 : 0) | (c.burn > 0 ? 2 : 0) | (c.horn ? 4 : 0) | (c.ai || c.occ[0] ? 8 : 0) | (c.slip > 5.5 ? 16 : 0);
    const head = B36(c.id, 3) + B36(c.spec.n, 1) + B36(Math.max(0, ALLPAINT.indexOf(c.color)), 1) + B36((c.x + 8) * 16, 3) + B36((c.z + 8) * 16, 3) + B36(clamp((c.y + 1) * 8, 0, 35), 1) + encYaw(c.yaw)
      + (c.spec.air ? B36(clamp((c.y + 4) * 4, 0, 1295), 2) + B36(clamp(((c.dive || 0) + .5) * 35, 0, 35), 1) + B36(clamp(((c.roll || 0) + .5) * 35, 0, 35), 1) : ''), hp = B36(clamp(c.hp / c.spec.hp, 0, 1) * 35, 1);
    if (!c.occ[0] && !c.occ[1] && !c.occ[2] && !c.occ[3] && !c.ai && !c.horn && Math.abs(vf) < .15 && !(c.spec.air && (!c.landed || c.rotor > .05))) { pk += head + hp + B36(fl, 1); continue; }
    let occ = ''; for (let k = 0; k < 4; k++) { const o = c.occ[k]; occ += !o ? '-' : o.kind === 'bot' ? '*' : B36(o === P ? 0 : o.slot, 1); }
    s += head + B36(clamp((vf + 60) * 10, 0, 1295), 2) + hp + B36(fl, 1) + occ; }
  return [s, pk];
}
function decCars(s, pk) {
  const live = {};
  // one record from o; returns its length, so the next one can be found whatever this one turned out to be
  const put = (src, o, moving) => { const tn = U36(src, o + 3, 1), sp = CARS[CID[tn]], air = !!(sp && sp.air), b = o + (air ? 18 : 14), len = b - o + (moving ? 8 : 2); if (o + len > src.length || !sp) return 0;
    const id = U36(src, o, 3), ci = U36(src, o + 4, 1), x = U36(src, o + 5, 3) / 16 - 8, z = U36(src, o + 8, 3) / 16 - 8, yaw = U36(src, o + 12, 2) / 1295 * TAU,
      y = air ? U36(src, o + 14, 2) / 4 - 4 : U36(src, o + 11, 1) / 8 - 1, dive = air ? U36(src, o + 16, 1) / 35 - .5 : 0, roll = air ? U36(src, o + 17, 1) / 35 - .5 : 0,
      vf = moving ? U36(src, b, 2) / 10 - 60 : 0, q = moving ? b + 2 : b, hp = U36(src, q, 1) / 35, fl = U36(src, q + 1, 1), occ = moving ? src.substr(q + 2, 4) : '----';
    live[id] = 1; let c = carById(id);
    if (!c) { c = spawnCar(CID[tn] || 'sedan', x, z, yaw, { id, color: ALLPAINT[ci] }); if (!c) return len; c.kin = true; c.y = y; if (air) { c.dive = dive; c.roll = roll; } } else if (!c.cop && ALLPAINT[ci] !== COP_PAINT) setPaint(c, ALLPAINT[ci]);
    if (!c.mine && !c.vbufOf) snapPush(c.buf, air ? { x, y, z, yaw, vf, pitch: dive, roll } : { x, y, z, yaw, vf });
    c.hp = hp * c.spec.hp; if ((fl & 1) && !c.wreck) { c.wreck = true; c.wreckT = 0; } c.burn = fl & 2 ? 1 : 0; if (!c.mine) { c.horn = fl & 4 ? 1 : 0; c.rslip = fl & 16 ? 7 : 0; } c.eng = !!(fl & 8);
    for (let k = 0; k < 4; k++) { const ch = occ[k], was = c.occ[k]; if (ch === '-') c.occ[k] = null; else if (ch === '*') { if (!was || was.kind !== 'bot') c.occ[k] = null; } else { const a = GAME.unref('p' + parseInt(ch, 36)); c.occ[k] = a; if (a && a.kind === 'rp') { a.car = c; a.seat = k; } } }
    return len; };
  for (let o = 0, n; o < s.length; o += n) if (!(n = put(s, o, true))) break;
  for (let o = 0, n; o < pk.length; o += n) if (!(n = put(pk, o, false))) break;
  for (let i = cars.length - 1; i >= 0; i--) if (!live[cars[i].id]) { if (P.car === cars[i]) { P.car = null; setHorn(false); radioVolume(0); } removeCar(cars[i]); }
  for (const k in NET.remotes) { const r = NET.remotes[k]; if (r.car && (r.car.gone || r.car.occ[r.seat] !== r)) r.car = null; }
}
const PICK_TY = { chain: 'c', cash: '$', bag: 'b', loot: 'l' }, PICK_OF = { c: 'chain', $: 'cash', b: 'bag', l: 'loot' };
const encPicks = () => pickups.map(p => B36(p.id, 3) + (PICK_TY[p.type] || String(WEAPONS[p.type].n)) + B36((p.x + 8) * 16, 3) + B36((p.z + 8) * 16, 3) + B36((p.y + 4) * 8, 2) + (p.team < 0 ? '-' : B36(p.team, 1))).join('');
function decPicks(s) {
  const live = {};
  for (let o = 0; o + PICK_W <= s.length; o += PICK_W) { const id = U36(s, o, 3), ty = s[o + 3], x = U36(s, o + 4, 3) / 16 - 8, z = U36(s, o + 7, 3) / 16 - 8, y = U36(s, o + 10, 2) / 8 - 4, tm = s[o + 12]; live[id] = 1; if (NET.pkGone[id] || pickups.some(p => p.id === id)) continue; addPickup(PICK_OF[ty] || WID[+ty] || 'pistol', x, y, z, tm === '-' ? -1 : parseInt(tm, 36), id); }
  for (let i = pickups.length - 1; i >= 0; i--) if (!live[pickups[i].id]) removePickup(pickups[i]);
}
// ---- the host: applies what the others report, then tells everyone the state of the world
NET.host = dt => {
  netPeers(dt, (pr, s, r) => {
    if (s.t !== 'c') return;
    (s.h || []).forEach(h => { if (h[0] <= r.hs) return; r.hs = h[0]; if (h[1] === 'b') { const b = botById(h[2]); if (b && !b.dead) damageBot(b, Math.min(+h[3] || 0, 400), !!h[4], r, widOf(h[5])); } else { const c = carById(h[2]); if (c) damageCar(c, Math.min(+h[3] || 0, 400), r); } });
    (s.q || []).forEach(q => { if (q[0] <= r.qs) return; r.qs = q[0]; const k = q[1], c = k === 'en' || k === 'cj' || k === 'ex' || k === 'cd' || k === 'fx' ? carById(q[2]) : null;
      if (k === 'en' && c && !c.wreck) { const st = q[3] | 0; if (!c.occ[st] && !r.car && st < c.spec.seats) { c.occ[st] = r; r.car = c; r.seat = st; if (st === 0) { c.kin = true; c.ai = null; c.team = r.team; c.asleep = false; c.buf.length = 0; GAME.boarded(c, r); } } }
      else if (k === 'cj' && c && !c.wreck && !r.car) { if (c.occ[0] && c.occ[0] !== r) GAME.eject(c, 0, r); if (!c.occ[0]) { c.occ[0] = r; r.car = c; r.seat = 0; c.kin = true; c.ai = null; c.team = r.team; c.asleep = false; c.buf.length = 0; GAME.boarded(c, r); } }
      else if (k === 'ex' && c) { for (let st = 0; st < 4; st++) if (c.occ[st] === r) { c.occ[st] = null; if (st === 0) { c.kin = false; c.inp.thr = 0; c.inp.steer = 0; c.inp.hb = false; c.asleep = false; } } r.car = null; }
      else if (k === 'cd' && c) damageCar(c, clamp(+q[3] || 0, 0, 600), null);
      else if (k === 'dk') { const dc = carById(q[2]); if (dc && dc.spec.air && dc.occ.includes(r)) GAME.ditch(dc); }
      else if (k === 'ad') GAME.airDeliver(r, CID[q[2] | 0], ALLPAINT[q[3] | 0]);
      else if (k === 'fx' && c) { c.hp = c.spec.hp; c.burn = 0; }
      else if (k === 'rs') { const rc = carById(q[2]); if (rc && r.car === rc && !rc.cop && ALLPAINT[q[3] | 0] !== undefined && ALLPAINT[q[3] | 0] !== COP_PAINT) { setPaint(rc, ALLPAINT[q[3] | 0]); if (r.heat > 0 && r.evade) GAME.clearHeat(r); } }
      else if (k === 'md') { const rc = carById(q[2]); if (rc && r.car === rc) { rc.plate = clamp(q[3] | 0, 0, 3); rc.tune = clamp(q[4] | 0, 0, 3); rc.bp = q[5] ? 1 : 0; } }
      else if (k === 'pm') { const rc = carById(q[2]); if (rc && r.car === rc && !rc.cop) rc.pv = r; }
      else if (k === 'pv') GAME.pv(r, { t: CID[q[2] | 0], c: ALLPAINT[q[3] | 0], ar: q[4] | 0, en: q[5] | 0, no: q[6] | 0, gr: q[7] | 0, bp: q[8] | 0, ne: q[9] | 0 });
      else if (k === 'hm') GAME.homies(r, clamp(q[2] | 0, 0, 4));
      else if (k === 'hd') GAME.homiesHome(r);
      else if (k === 'lw') GAME.clearHeat(r);
      else if (k === 'jb') GAME.forceJob();
      else if (k === 'rb') GAME.rob(r, q[2] | 0);
      else if (k === 'pk') { const p = pickups.find(o => o.id === q[2]); if (p) { if (p.type === 'chain') GAME.takeChain(p, r); else if (p.type === 'cash') GAME.takeCash(p, r); else if (p.type === 'bag') GAME.takeBag(p, r); else if (p.type === 'loot') GAME.takeLoot(p, r); else removePickup(p); } }
      else if (k === 'hs') { if (EV_START[q[2]] && JOBS[q[2]]) EV_START[q[2]](); }
      else if (k === 'js') GAME.smash(q[2] | 0, r);
      else if (k === 'sm') EV_START.smug(r, q[2] | 0, q[3] | 0);
      else if (k === 'gx') { const x = +q[2], y = +q[3], z = +q[4], pw = clamp((+q[5] || 10) / 10, .5, 2), kind = BOOM[q[6]] ? q[6] : 'nade'; if (isFinite(x + y + z)) { GAME.ev('x', Math.round(x), Math.round(y), Math.round(z), Math.round(pw * 10), 0, GAME.ref(r)); explode(x, y + .3, z, r, pw, kind); } }
      else if (k === 'db') GAME.callDriveBy(r);
      else if (k === 'kn') { const p = PROPS[q[2] | 0]; if (p) knockProp(p, +q[3] || 0, +q[4] || 1); } });
    if (s.kd && s.kd[0] > r.kdSeen) { r.kdSeen = s.kd[0]; for (let st = 0; st < 4; st++) if (r.car && r.car.occ[st] === r) { r.car.occ[st] = null; if (!st) r.car.kin = false; } r.car = null; GAME.onKill(GAME.unref(s.kd[1]), r, widOf(s.kd[2]), !!s.kd[3]); }
    // the car this player is driving goes where they say it is
    if (r.car && r.seat === 0 && r.v && r.v[0] === r.car.id && r.v !== r.car.lastV) { const c = r.car, v = r.v; c.lastV = v; snapPush(c.buf, { x: v[1], y: v[6] || 0, z: v[2], yaw: v[3], vf: v[4], pitch: +v[8] || 0, roll: +v[9] || 0 }); c.steer = v[5] || 0; c.horn = v[7] & 1; c.rslip = v[7] & 2 ? 7 : 0; }
  });
  cars.forEach(c => { if (c.kin && snapAt(c.buf, _so)) { c.x = _so.x; c.y = _so.y; c.z = _so.z; c.yaw = _so.yaw; if (c.spec.air) { c.dive = _so.pitch || 0; c.roll = _so.roll || 0; c.landed = c.y - groundAt(c.x, c.z, c.y + .3, 's', .6) < .35; } const vf = _so.vf || 0; c.vx = -Math.sin(c.yaw) * vf; c.vz = -Math.cos(c.yaw) * vf; c.spin += vf * dt / c.geo.wr; c.slip = c.rslip || 0; } });
  NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = 1 / 10;
  const sk = a => CREWS.map((c, t) => skullsOf(a.gn ? a.gn[t] : 0)).join('');   // each crew's skulls on this player, one digit each
  const pl = [[0, NET.me || '', P.team, P.kills | 0, P.deaths | 0, 0, P.heat | 0, P.evade ? 1 : 0, sk(P), 0, P.rank || 1]]; for (const k in NET.remotes) { const r = NET.remotes[k]; pl.push([r.slot, k, r.team, r.kills | 0, r.deaths | 0, r.earn | 0, r.heat | 0, r.evade ? 1 : 0, sk(r), r.xp | 0, r.rank | 0]); }
  const kn = []; for (let i = 0; i < PROPS.length && kn.length < 60; i++) if (PROPS[i].down) kn.push(i);
  const W = { z: ZS.map(s => B36(s.owner + 1, 1) + B36(s.by + 1, 1) + B36(clamp(s.prog, 0, 1) * 35, 1) + (s.hot ? '1' : '0') + B36(clamp(s.ctrl, 0, 100) * .35, 1)).join(''), d: Math.round(G.tod * 10) / 10, o: [G.botsPer, G.cops ? 1 : 0, G.rivals ? 1 : 0], c: G.crew, r: ROBS.reduce((m, r, i) => m | (tillOpen(i) ? 1 << i : 0), 0), e: evWire() };
  let bb = encBots(null); const cc = encCars();
  const msg = Object.assign(myBody(), { t: 'h', W, bs: bb[0], bv: bb[1], bc: bb[2], cs: cc[0], cp: cc[1], pk: encPicks(), pl, d: Object.keys(NET.dmgOut).map(k => NET.dmgOut[k]), ev: EVQ, kn, h: null, hp: prune(NET.hp, 24), q: null, kd: null, ld: null, rd: null });
  NET.bytes = JSON.stringify(msg).length; NET.cut = 0; if (NET.bytes > NET_MAX - 150) { msg.ev = EVQ.slice(-5); msg.kn = kn.slice(0, 20); NET.bytes = JSON.stringify(msg).length; }
  if (NET.bytes > NET_MAX) {   // still too much to say at once: leave out the people farthest from every player, who nobody can see from there anyway
    const far = bots.filter(q => !q.car && q.team === TEAM_CIV && !(q.dead && q.deadT > 7)).map(q => [nearHuman(q.x, q.z), q]).sort((p, q) => q[0] - p[0]).slice(0, Math.ceil((NET.bytes - NET_MAX) / CIV_W) + 1), skip = new Set(far.map(q => q[1]));
    bb = encBots(skip); msg.bv = bb[1]; NET.bytes = JSON.stringify(msg).length; NET.cut = skip.size; }
  NET.room.presence(msg).catch(() => {});
};
// ---- a joined player: draws the host's world, plays their own body
function applyHost(s) {
  const W = s.W; if (!W) return;
  G.tod = W.d; if (W.o) { G.botsPer = W.o[0]; G.cops = !!W.o[1]; G.rivals = !!W.o[2]; } G.robMask = W.r | 0; G.phase = 'play';
  if (G.rivals) G.crew = crewOf(W.c);                                                                         // each on the side they picked
  else if (crewOf(W.c) !== G.crew || P.team !== G.crew) { G.crew = crewOf(W.c); wearCrew(G.crew); }          // everyone rides with the host's side
  if (typeof W.z === 'string') for (let i = 0; i < ZS.length && i * 5 + 5 <= W.z.length; i++) { const z = ZS[i], o = i * 5; z.owner = U36(W.z, o, 1) - 1; z.by = U36(W.z, o + 1, 1) - 1; z.prog = U36(W.z, o + 2, 1) / 35; z.hot = W.z[o + 3] === '1'; z.ctrl = U36(W.z, o + 4, 1) / .35; }
  evFromHost(W.e);
  (s.pl || []).forEach(e => { if (e[1] === NET.me) { NET.slot = e[0]; P.slot = e[0]; P.kills = e[3]; P.deaths = e[4]; if (e[5] > NET.paid) { gain(e[5] - NET.paid); P.earn += e[5] - NET.paid; } NET.paid = e[5]; if ((e[9] | 0) > NET.xpSeen) addRP((e[9] | 0) - NET.xpSeen); NET.xpSeen = e[9] | 0; P.heat = e[6] | 0; P.evade = !!e[7]; P.gs = String(e[8] || ''); } else { const r = NET.remotes[e[1]]; if (r) { r.slot = e[0]; r.kills = e[3]; r.deaths = e[4]; r.heat = e[6] | 0; } } });
  { const hr = NET.remotes[NET.hostPeer]; if (hr) hr.slot = 0; }
  decCars(s.cs || '', s.cp || ''); decBots(s.bs || '', s.bv || '', s.bc || ''); decPicks(s.pk || '');
  for (const id in NET.pkGone) if (G.time - NET.pkGone[id] > 4) delete NET.pkGone[id];
  const first = NET.evSeen < 0, e = (s.d || []).find(q => q[0] === NET.slot);
  if (e) { if (NET.lastDmg < 0 || first) NET.lastDmg = e[1]; else if (e[1] > NET.lastDmg) { const wid = widOf(e[3]); hurtPlayer(e[1] - NET.lastDmg, GAME.unref(e[2]), wid); if (wid === 'car' && !P.dead && !P.car) { P.knock = 1; P.knockT = 1; } NET.lastDmg = e[1]; } } else if (first || NET.lastDmg < 0) NET.lastDmg = 0;
  (s.ev || []).forEach(v => { if (v[0] <= NET.evSeen) return; if (!first) onEvent(v, false); }); NET.evSeen = (s.ev || []).reduce((m, v) => Math.max(m, v[0]), Math.max(0, NET.evSeen));
  (s.kn || []).forEach(i => { const p = PROPS[i]; if (p && !p.down) knockProp(p, 0, 1); });
  if ((s.kn || []).length < 60) { const dn = {}; (s.kn || []).forEach(i => { dn[i] = 1; }); for (let k = 0; k < 60; k++) { const i = NET.propI = ((NET.propI | 0) + 1) % PROPS.length, p = PROPS[i]; if (p.down > 0 && !dn[i] && G.time - (p.downT || 0) > 4) raiseProp(p); } }   // the host has stood these back up
}
function updateReplicas(dt) {
  for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.dead) { b.deadT += dt; b.spd = 0; continue; } const ox = b.x, oz = b.z;
    if (b.car) { seatPos(b.car, b.seat, _sp); b.x = _sp.x; b.z = _sp.z; b.y = b.car.y; b.spd = 0; }                                    // someone in a seat is wherever the car is
    else { if (snapAt(b.buf, _so)) { b.x = _so.x; b.y = _so.y; b.z = _so.z; b.yaw = _so.yaw; b.pitch = _so.pitch; } b.spd = lerp(b.spd, hyp(b.x - ox, b.z - oz) / Math.max(dt, .001), .3); if (b.spd < .25) b.spd = 0; }
    if (b.pend) { b.pend = 0; b.ayaw = b.yaw; fxShot(b, b.wpn); } }
  for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c.mine) { c.kin = false; continue; } c.kin = true; if (c.wreck) c.wreckT += dt;
    const dr = c.occ[0]; if (dr && dr.kind === 'rp' && dr.v && dr.v[0] === c.id) { if (c.vbufOf !== dr) { c.vbufOf = dr; c.buf.length = 0; c.lastV = null; } if (dr.v !== c.lastV) { const v = c.lastV = dr.v; snapPush(c.buf, { x: v[1], y: v[6] || 0, z: v[2], yaw: v[3], vf: v[4], pitch: +v[8] || 0, roll: +v[9] || 0 }); c.steer = v[5] || 0; c.horn = v[7] & 1; c.rslip = v[7] & 2 ? 7 : 0; } } else if (c.vbufOf) { c.vbufOf = null; c.buf.length = 0; }
    if (snapAt(c.buf, _so)) { c.x = _so.x; c.y = _so.y; c.z = _so.z; c.yaw = _so.yaw; if (c.spec.air) { c.dive = _so.pitch || 0; c.roll = _so.roll || 0; } const vf = _so.vf || 0; c.vx = -Math.sin(c.yaw) * vf; c.vz = -Math.cos(c.yaw) * vf; c.spin += vf * dt / c.geo.wr; c.slip = c.rslip || 0; } c.crash = 0; }
  carsCollide(); if (P.car && P.seat === 0) carAfterStep(P.car);
  for (let i = pickups.length - 1; i >= 0; i--) pickups[i].g.rotation.y += dt * 2;
}
NET.client = dt => {
  const host = netPeers(dt);
  if (!host || host.presence.t !== 'h') { NET.lost += dt; if ((host && NET.lost > .6) || NET.lost > 6) { saveGame(); NET.stop(); G.state = 'menu'; if (document.pointerLockElement) document.exitPointerLock(); ownCrew(); showOverlay('lost'); startAttract(); } }
  else { NET.lost = 0; NET.hostPeer = host.peer; if (host.presence !== NET.lastS) { NET.lastS = host.presence; applyHost(host.presence); } }
  updateReplicas(dt);
  NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = 1 / 15;
  const msg = Object.assign(myBody(), { t: 'c', h: prune(NET.hits, 30), hp: prune(NET.hp, 24), q: prune(NET.reqs, 12), kd: NET.kd, W: null, bs: null, bv: null, bc: null, cs: null, cp: null, pk: null, pl: null, d: null, ev: null, kn: null, ld: null, rd: null });
  NET.bytes = JSON.stringify(msg).length; NET.room.presence(msg).catch(() => {});
};
NET.start = mode => {
  for (const k in NET.remotes) { freeChar(NET.remotes[k].ch); killTag(NET.remotes[k].tag); }
  Object.assign(NET, { mode, remotes: {}, slots: {}, dmgOut: {}, hits: [], hp: [], reqs: [], kd: null, evSeen: -1, lastDmg: -1, sendT: 0, lost: 0, lastS: null, pkGone: {}, hostPeer: null, slot: mode === 'host' ? 0 : -1, paid: 0, xpSeen: 0 });
  P.slot = NET.slot;
};
NET.stop = () => {
  const was = NET.mode; NET.mode = null; for (const k in NET.remotes) { freeChar(NET.remotes[k].ch); killTag(NET.remotes[k].tag); } NET.remotes = {}; NET.slot = 0; P.slot = 0;
  if (NET.room && was) { NET.room.presence({ t: 'm', n: myName(), cr: P.team, p: null, a: null, v: null, W: null, bs: null, bv: null, bc: null, cs: null, cp: null, pk: null, pl: null, d: null, ev: null, kn: null, h: null, hp: null, q: null, kd: null }).catch(() => {}); setTimeout(NET.lobby, 0); }
};
// ---- the lobby: players gather on the menu and ready up, the leader picks the crew and starts the session for everyone at once.
//      Anyone who turns up later joins the session where it stands.
NET.say = () => { if (!NET.room || NET.mode) return; const L = NET.lob; NET.room.presence(L ? { t: 'L', ld: L.lead ? 1 : 0, rd: L.lead || L.ready ? 1 : 0, n: myName(), cr: P.team, rk: myRank(), o: L.lead ? [G.botsPer, G.cops ? 1 : 0, G.rivals ? 1 : 0] : null } : { t: 'm', ld: null, rd: null, n: myName(), cr: P.team, rk: myRank(), o: null }).catch(() => {}); };
const myRank = () => { const s = SAVE.live ? null : loadSave(); return s ? rankOf(+s.rp || 0) : P.rank || 1; };   // in the lobby, the rank on file
NET.lobby = () => {
  if (!NET.room || NET.mode) return;
  const ps = NET.room.peers(), mine = ps.find(p => p.isMe && p.sameTab), me = mine ? mine.peer : '', others = ps.filter(p => p !== mine && p.presence && p.presence.t);
  const host = others.find(p => p.presence.t === 'h'), inL = others.filter(p => p.presence.t === 'L'), leads = inL.filter(p => p.presence.ld).sort((a, b) => a.peer < b.peer ? -1 : 1), L = NET.lob;
  if (L && host) return coopBegin('client');
  if (L && me) {
    if (L.lead && leads.length && leads[0].peer < me) { L.lead = false; L.ready = true; NET.say(); }
    else if (!L.lead && !leads.length && !inL.some(p => p.peer < me)) { L.lead = true; NET.say(); }
  }
  if (L && !L.lead && leads.length) { const lp = leads[0].presence, was = G.rivals; if (Array.isArray(lp.o)) { G.botsPer = clamp(+lp.o[0] || 4, 1, 8); G.cops = !!lp.o[1]; G.rivals = !!lp.o[2]; $('set-bots').value = String(G.botsPer); $('set-cops').value = G.cops ? '1' : '0'; $('set-sides').value = G.rivals ? '1' : '0'; }
    if (G.rivals) { if (!was) { ownCrew(); NET.say(); } } else if (crewOf(lp.cr) !== P.team) { wearCrew(crewOf(lp.cr)); NET.say(); } }   // one crew: wear the leader's; rival sides: your own
  const allReady = inL.every(p => p.presence.rd), waiting = inL.filter(p => !p.presence.rd).length, plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  $('co-host').hidden = $('co-join').hidden = !!L; $('co-ready').hidden = !L || L.lead; $('co-start').hidden = !L || !L.lead; $('co-leave').hidden = !L; $('deploy').hidden = !!L; $('set-bots').disabled = $('set-cops').disabled = $('set-sides').disabled = !!L && !L.lead; crewLock(!!L && !L.lead && !G.rivals);
  $('co-host').disabled = !!host || leads.length > 0; $('co-join').disabled = !host && !leads.length; $('co-join').textContent = host ? 'Join session' : 'Join lobby';
  $('co-ready').textContent = L && L.ready ? 'Not ready' : 'Ready up'; $('co-start').disabled = !allReady;
  const rows = [];
  if (L || leads.length) { if (L) rows.push([myName() + ' (you)', L.lead ? 'Leader' : L.ready ? 'Ready' : 'Not ready', L.lead || L.ready, L.lead ? 0 : 1, me, P.team, myRank()]); inL.forEach(p => rows.push([cleanName(p.presence.n), p.presence.ld ? 'Leader' : p.presence.rd ? 'Ready' : 'Not ready', p.presence.ld || p.presence.rd, p.presence.ld ? 0 : 1, p.peer, crewOf(p.presence.cr), p.presence.rk | 0])); }
  else if (host) others.filter(p => p.presence.t === 'h' || p.presence.t === 'c').forEach(p => rows.push([cleanName(p.presence.n), p.presence.t === 'h' ? 'Host · in the city' : 'In the city', true, p.presence.t === 'h' ? 0 : 1, p.peer, crewOf(p.presence.cr), p.presence.rk | 0]));
  rows.sort((a, b) => a[3] - b[3] || (a[4] < b[4] ? -1 : 1));
  const ul = $('co-roster'); ul.hidden = !rows.length; ul.textContent = '';
  rows.forEach(r => { const li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('span'); a.textContent = r[0] + (r[6] > 0 ? ' · rank ' + r[6] : '') + ' · ' + SIDE(r[5]).name; b.textContent = r[1]; li.className = 'c' + r[5] + (r[2] ? ' ok' : ''); li.appendChild(a); li.appendChild(b); ul.appendChild(li); });
  const st = $('co-status'); st.className = 'status ok';
  st.textContent = L ? (L.lead ? (!inL.length ? 'Lobby open. Waiting for players. You can also start now: anyone who arrives later can join the session.' : allReady ? 'Everyone is ready. Start when you like.' : 'Waiting for ' + plural(waiting, 'player') + ' to ready up.') : L.ready ? 'Ready. Waiting for the leader to start.' : G.rivals ? 'Rival sides: pick your own crew, or the police. Ready up when you are set.' : 'The leader picks the crew. Ready up when you are set.')
    : host ? 'A session is running. You can join it now.' : leads.length ? cleanName(leads[0].presence.n) + ' has a lobby open with ' + plural(inL.length, 'player') + '.' : others.length ? plural(others.length, 'other player') + ' on this page. Open a lobby for them to join.' : 'Online. Nobody else has this page open yet.';
};
function coopBegin(mode) {
  NET.lob = null; ['co-ready', 'co-start', 'co-leave'].forEach(id => $(id).hidden = true); $('co-roster').hidden = true;
  initAudio(); NET.start(mode); G.solo = false;
  if (mode === 'host') startWorld(); else { const hp = NET.room.peers().find(p => p.presence && p.presence.t === 'h'), W = hp && hp.presence.W; if (W && Array.isArray(W.o)) G.rivals = !!W.o[2]; if (hp && !G.rivals) wearCrew(crewOf(hp.presence.cr)); G.crew = hp ? crewOf(hp.presence.cr) : P.team; resetWorld(); }
  beginPlay();
}
const lobbySet = L => { NET.lob = L; NET.say(); NET.lobby(); };
NET.connect = async () => {
  let lobby = null; try { lobby = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) {}
  const off = 'Multiplayer is not available in this view. Solo play works.';
  if (!lobby) { $('co-status').textContent = off; return; }
  let rm = lobby; try { if (lobby.join) rm = await lobby.join('port-calder-8'); } catch (e) {}      // the name changes with the wire format, so an old tab and a new one never share a room
  NET.room = rm; $('co-status').textContent = 'Looking for other players…'; NET.say();
  rm.onPeers(() => { if (!NET.mode) NET.lobby(); }, () => { NET.room = null; NET.lob = null; ['co-ready', 'co-start', 'co-leave'].forEach(id => $(id).hidden = true); $('co-host').hidden = $('co-join').hidden = false; $('co-host').disabled = $('co-join').disabled = true; $('deploy').hidden = false; $('co-roster').hidden = true; $('co-status').className = 'status'; $('co-status').textContent = off; if (NET.mode) { NET.mode = null; G.state = 'menu'; showOverlay('lost'); } });
  NET.lobby();
};
