/* =====================================================================
   11. THE CITY AT WORK — turf, raids, spawns, traffic, pay. There are no rounds: the world starts and keeps going.
       All of it runs on one machine: the host's, or yours when you play alone.
   ===================================================================== */
const TOD_RATE = 24 / 2400;                       // a full day every forty minutes
const WCODE = { car: 20, boom: 21, nade: 21, fall: 22, fist: 0 };
const wcode = wid => WEAPONS[wid] ? WEAPONS[wid].n : WCODE[wid] === undefined ? 22 : WCODE[wid];
const wname = n => n === 20 ? 'ran over' : n === 21 ? 'blew up' : n === 22 ? 'dropped' : WID[n] === 'fist' ? 'knocked out' : (WEAPONS[WID[n]] || { name: '' }).name;
GAME.ref = a => !a ? '' : a === P ? 'p' + NET.slot : a.kind === 'rp' ? 'p' + a.slot : 'b' + a.id;
GAME.unref = r => { if (!r) return null; const n = +r.slice(1); if (r[0] === 'p') { if (n === NET.slot) return P; for (const k in NET.remotes) if (NET.remotes[k].slot === n) return NET.remotes[k]; return null; } return botById(n); };
// --- events: things everyone should see or hear. The host keeps the last few and every player plays each one once.
const EVQ = []; let evSeq = 0;
GAME.ev = (...a) => { const e = [++evSeq].concat(a); EVQ.push(e); if (EVQ.length > 12) EVQ.shift(); onEvent(e, true); };
function onEvent(e, mine) {
  const k = e[1];
  if (k === 'k') { const a = GAME.unref(e[2]), v = GAME.unref(e[3]); feed(a, v, e[4], e[5]); if (a === P && v && v !== P && isCrew(v.team)) { P.streak++; SFX.kill(!!e[5]); hitMarker(!!e[5], true); if (P.streak === CFG.streak) { P.driveby = true; SFX.streak(); banner('Drive-by ready', 'Press B to send the crew through', 3, 'gold'); } } }
  else if (k === 'z') { const z = ZONES[e[2]], t = e[3]; banner(z.name, t === P.team ? 'Your crew holds it' : CREWS[t].name + ' took it', 2.6, 't' + t); SFX.cap(t === P.team); }
  else if (k === 'x') { if (mine) return; const x = e[2], y = e[3], z = e[4], pw = e[5] / 10, c = e[6] ? carById(e[6]) : null, o = GAME.unref(e[7]);
    if (c && P.car === c) { GAME.leaveCar(true); hurtPlayer(999, o, 'boom'); }
    if (!(o === P && !e[6] && G.time - (NET.myBoom || -9) < 1)) { FX.boom(x, y, z, pw); SFX.boom(x, y, z); const pd = hyp(P.x - x, P.z - z); if (pd < 60) shake(clamp(1.4 - pd / 40, 0, 1)); const d = hyp(P.x - x, P.y + 1 - y, P.z - z), R = 7.5 * pw; if (!P.dead && d < R && o !== P && (!o || !isCrew(o.team) || o.team !== P.team)) hurtPlayer(170 * pw * (1 - d / (R * 1.15)), o, 'boom'); } }
  else if (k === 'bn') banner(e[2], e[3], e[4], e[5]);
  else if (k === 'ej') { if (e[2] === NET.slot && P.car && !mine) { GAME.leaveCar(false); P.knock = 1; P.knockT = 1.2; banner('Thrown out', '', 1.5); } }
  else if (k === 'ch') { const a = GAME.unref(e[2]); if (a === P) { SFX.chain(); banner(e[3] ? 'Chain saved' : 'Chain snatched', '+$' + (e[3] ? CFG.pay.save : CFG.pay.chain), 1.8, 'gold'); } }
  else if (k === 'db') { const a = GAME.unref(e[2]); if (a) banner('Drive-by inbound', (a.team === P.team ? 'Your crew is' : CREWS[a.team].name + ' is') + ' rolling through', 2.6, 't' + a.team); }
  else if (k === 'rd') { const z = ZONES[e[3]]; if (z) note(e[2] === P.team ? 'Your crew is moving on ' + z.name : CREWS[e[2]].name + ' is moving on ' + z.name, e[2] ? 't' : 'e'); }
  else if (k === 'ti') note('Turf income · ' + e[2] + (e[2] === 1 ? ' turf' : ' turfs') + ' · +$' + e[3], 'g');
  else if (k === 'rb') { const a = GAME.unref(e[2]), r = ROBS[e[3]]; if (a === P) { SFX.buy(); banner('Till emptied', '+$' + e[4], 2, 'gold'); } else if (a && r) note(nameOf(a) + ' robbed ' + r.name, 'g'); }
}
GAME.pay = (a, n) => { if (!a || n <= 0) return; if (a === P) { P.earn += n; gain(n); } else if (a.kind === 'rp') a.earn = (a.earn | 0) + n; };
GAME.onKill = (k, v, wid, head) => {
  v.deaths = (v.deaths | 0) + 1;
  if (k && k !== v) {
    if (rival(k, v)) { k.kills = (k.kills | 0) + 1; GAME.pay(k, CFG.pay.kill + (head ? CFG.pay.head : 0)); addPickup('chain', v.x, groundAt(v.x, v.z, v.y + .5, 'p'), v.z, v.team); if (k.kind !== 'bot' && copNear(v.x, v.z, 50)) GAME.crime(k, 8); }
    else if (k.kind !== 'bot') { if (v.team === TEAM_CIV) GAME.crime(k, 15); else if (v.team === TEAM_COP) { k.kills = (k.kills | 0) + 1; GAME.crime(k, 30, 3); } }   // bystanders pay nothing and cost plenty
  }
  if (v.kind === 'bot' && v.team !== TEAM_CIV && v.wpn !== 'pistol' && v.wpn !== 'fist' && rand() < .5) addPickup(v.wpn, v.x + rs(1.6), groundAt(v.x, v.z, v.y + .5, 'p'), v.z + rs(1.6), -1);
  if (v.kind === 'bot' && isCrew(v.team) && !v.temp) G.respawnQ[v.team].push(G.time + lerp(CFG.botRespawn[0], CFG.botRespawn[1], rand()));
  if (v.kind !== 'bot') GAME.clearHeat(v);                                                    // the police stop looking for the dead
  if (v.team !== TEAM_CIV) GAME.ev('k', GAME.ref(k), GAME.ref(v), wcode(wid), head ? 1 : 0);
};
GAME.playerDied = (src, wid, head) => {
  if (P.dead) return; P.dead = true; P.deadT = 0; P.streak = 0; P.driveby = false; P.orbit = 0; closeShop(); mouse.down = false; mouse.right = false; P.enter = null; P.ads = 0;
  if (P.car) GAME.leaveCar(true);
  $('dead').hidden = false; P.deadMsg = src && src !== P ? `${wname(wcode(wid))} by ${nameOf(src)}` : wid === 'fall' ? 'A long way down' : wid === 'car' ? 'Wrecked' : 'Caught in the blast'; SFX.dead();
  if (AUTH()) GAME.onKill(src, P, wid, head); else NET.died(src, wid, head);
};
function zoneSpawn(zi) { const n = NAV[zoneNode[zi]], opts = n.e.map(e => NAV[e[0]]).filter(q => q.y < 1 && !q.iso && hyp(q.x - ZONES[zi].x, q.z - ZONES[zi].z) < 40); if (!opts.length) return null; const e = opts[(rand() * opts.length) | 0]; return { x: e.x + rs(1.2), y: e.y, z: e.z + rs(1.2), yaw: yawOf(ZONES[zi].x - e.x, ZONES[zi].z - e.z) }; }
function baseSpawn(team) { const s = SPAWNS[team][(rand() * SPAWNS[team].length) | 0]; return { x: s.x + rs(1), y: CURB, z: s.z + rs(1), yaw: s.yaw }; }
function spawnPoint(team, forward) {   // forward: the chance of coming back at a quiet turf the crew holds instead of at home
  if (rand() < forward) { const own = []; ZS.forEach((s, i) => { if (s.owner === team && !s.hot) own.push(i); });
    if (own.length) { const s = zoneSpawn(own[(rand() * own.length) | 0]); if (s && (G.time < 1 || nearHuman(s.x, s.z) > 40)) return s; } }
  return baseSpawn(team);
}
// a player comes back at whichever is nearer to where they fell: the crew's yard, or a quiet turf the crew holds
GAME.respawn = home => {
  let zi = -1, bd = hyp(SPAWNS[P.team][0].x - P.x, SPAWNS[P.team][0].z - P.z); if (!home) ZS.forEach((z, i) => { if (z.owner !== P.team || z.hot) return; const d = hyp(ZONES[i].x - P.x, ZONES[i].z - P.z); if (d < bd) { bd = d; zi = i; } });
  if (!home) { const fee = Math.min(200, Math.floor(Math.max(0, P.cash) * .01) * 10); if (fee > 0) { P.spent += fee; P.cash -= fee; note('Patched up · −$' + fee, 'g'); } }
  const s = (zi >= 0 && zoneSpawn(zi)) || baseSpawn(P.team); Object.assign(P, { x: s.x, y: s.y, z: s.z, vx: 0, vz: 0, vy: 0, onGround: true, yaw: s.yaw, cyaw: s.yaw, cpitch: -.08, hp: CFG.player.hp, dead: false, deadT: 0, safeT: 3, knock: 0, car: null, enter: null, ads: 0, reloadT: 0, fireT: 0, lastHit: -99, camY: s.y });
  for (const id in P.inv) { const d = WEAPONS[id]; if (!d.melee) { P.inv[id].mag = d.mag; P.inv[id].res = Math.max(P.inv[id].res, d.mag * 2); } }
  if (P.nades < 1) P.nades = 1; $('dead').hidden = true;
};
// --- turf: the side with more people standing in a zone pulls it their way
function updateZones(dt) {
  for (let i = 0; i < ZONES.length; i++) { const z = ZONES[i], s = ZS[i]; let n0 = 0, n1 = 0;
    eachActor(a => { if (a.dead || a.gone || !isCrew(a.team)) return; if (hyp(a.x - z.x, a.z - z.z) < z.r && a.y < 14) { if (a.team) n1++; else n0++; } });
    s.n0 = n0; s.n1 = n1; s.hot = (n0 > 0 && n1 > 0) || (s.owner === 0 && n1 > 0) || (s.owner === 1 && n0 > 0);
    const push = clamp(n1 - n0, -3, 3);
    if (push) s.cap = clamp(s.cap + Math.sign(push) * (1 + (Math.abs(push) - 1) * .4) * dt / 9, -1, 1);
    else if (!n0 && !n1) { const home = s.owner === 0 ? -1 : s.owner === 1 ? 1 : s.cap; s.cap += clamp(home - s.cap, -dt / 25, dt / 25); }
    const was = s.owner; if (s.cap <= -1) s.owner = 0; else if (s.cap >= 1) s.owner = 1; else if ((s.owner === 0 && s.cap > 0) || (s.owner === 1 && s.cap < 0)) s.owner = -1;
    if (s.owner !== was && s.owner >= 0) { GAME.ev('z', i, s.owner); eachActor(a => { if (!a.dead && a.team === s.owner && a.kind !== 'bot' && hyp(a.x - z.x, a.z - z.z) < z.r) GAME.pay(a, CFG.pay.capture); }); } }
}
GAME.takeChain = (p, who) => { if (p.gone) return; removePickup(p); if (who.team === p.team) { GAME.pay(who, CFG.pay.save); GAME.ev('ch', GAME.ref(who), 1); } else { GAME.pay(who, CFG.pay.chain); GAME.ev('ch', GAME.ref(who), 0); } };
// --- raids: now and then a crew sends most of its people at a turf it does not hold. Between raids each side minds its own.
function updateRaids(dt) {
  for (let t = 0; t < 2; t++) { const R = G.raid[t];
    if (R) { if (ZS[R.zone].owner === t || G.time > R.until) { G.raid[t] = null; G.raidT[t] = 70 + rand() * 60; bots.forEach(b => { if (b.team === t && b.goal && b.goal.zone === R.zone && ZS[R.zone].owner !== t) b.goalT = 0; }); } continue; }
    G.raidT[t] -= dt; if (G.raidT[t] > 0) continue;
    const live = bots.filter(b => b.team === t && !b.dead && !b.temp); if (live.length < 2) { G.raidT[t] = 15; continue; }
    let best = -1, bd = 1e9; ZONES.forEach((z, i) => { if (ZS[i].owner === t) return; let d = hyp(z.x - BASES[t].x, z.z - BASES[t].z); ZONES.forEach((q, j) => { if (ZS[j].owner === t) d = Math.min(d, hyp(z.x - q.x, z.z - q.z)); }); d += rand() * 60 - (ZS[i].owner < 0 ? 40 : 0); if (d < bd) { bd = d; best = i; } });
    if (best < 0) { G.raidT[t] = 60; continue; }
    const z = ZONES[best], n = Math.max(2, Math.ceil(live.length * .6)); G.raid[t] = { zone: best, until: G.time + 120, n };
    live.sort((p, q) => hyp(p.x - z.x, p.z - z.z) - hyp(q.x - z.x, q.z - z.z)).slice(0, n).forEach(b => { if (!b.tgt) b.goalT = 0; });
    GAME.ev('rd', t, best); }
}
// --- stick-ups: a till gives up its cash once, then needs time to fill again
GAME.rob = (who, i) => {
  const r = ROBS[i]; if (!r || G.time < (G.robT[i] || 0) || who.dead) return;
  G.robT[i] = G.time + CFG.robEvery; const amt = Math.round(lerp(CFG.pay.rob[0], CFG.pay.rob[1], rand()) / 10) * 10;
  GAME.pay(who, amt); GAME.crime(who, 35, 2); GAME.ev('rb', GAME.ref(who), i, amt); GAME.noise(r.x, r.z, who, 30);
};
const tillOpen = i => AUTH() ? G.time >= (G.robT[i] || 0) : !!((G.robMask | 0) >> i & 1);
GAME.onKnock = (p, c) => { if (c) SFX.crash(p.x, p.y, p.z, 7); if (!AUTH() && c && c === P.car) NET.req('kn', p.i, Math.round(c.vx), Math.round(c.vz)); };
GAME.roadkill = (c, drv) => {
  const sp = carSpeed(c); if (sp < 3.5) return; const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), hw = c.spec.wid / 2 + .3, hl = c.spec.len / 2 + .3;
  eachActor(a => { if (a.dead || a.car || a === drv || a.gone || G.time - (a.rkT || -9) < .7) return; const dx = a.x - c.x, dz = a.z - c.z; if (dx * dx + dz * dz > 16 || Math.abs(a.y - c.y) > 1.6) return; if (Math.abs(dx * rx + dz * rz) > hw || Math.abs(dx * fx + dz * fz) > hl) return;
    if ((c.vx * dx + c.vz * dz) / (hyp(dx, dz) || 1) < 2.5) return;
    a.rkT = G.time; const dmg = (sp - 2.5) * 9, friend = !!drv && isCrew(a.team) && a.team === drv.team, byBot = !!drv && drv.kind === 'bot';
    if (a.kind === 'bot') { if (AUTH()) { a.knock = 1; a.knockT = 1.4; a.vx = c.vx * .8; a.vz = c.vz * .8; a.path = null; if (!friend) damageBot(a, dmg, false, drv, 'car'); } else if (drv === P && !friend) NET.reportBot(a, dmg, false, 'car'); }
    else if (a === P) { if (!friend) { hurtPlayer(dmg * (byBot ? .6 : 1), drv, 'car'); P.knock = 1; P.knockT = 1; P.vx = c.vx * .7; P.vz = c.vz * .7; } }
    else if (!friend) { if (drv === P) NET.reportPlayer(a, dmg, false, 'car'); else if (byBot && AUTH()) NET.hurt(a, dmg * .6, drv, 'car'); }
    SFX.crash(a.x, a.y, a.z, 6); c.vx *= .96; c.vz *= .96; });
};
function carAfterStep(c) {
  if (c.crash > 4.5) { SFX.crash(c.x, c.y, c.z, c.crash); const dmg = (c.crash - 4.5) * 15, by = c.hitBy && c.hitBy.occ[0] ? c.hitBy.occ[0] : null;
    if (AUTH()) damageCar(c, dmg, by); else if (c === P.car && P.seat === 0) NET.req('cd', c.id, Math.round(dmg));
    if (c === P.car) { shake(c.crash * .045); if (c.crash > 15) hurtPlayer((c.crash - 15) * 3.5, null, 'car'); } }
  c.crash = 0; c.hitBy = null;
}
const NOINP = { thr: 0, steer: 0, hb: true };
function updateCarsAuth(dt) {
  for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i];
    if (c.wreck) { c.wreckT += dt; if (carSpeed(c) > .1) stepCar(c, dt, NOINP); c.crash = 0; if (c.wreckT > 26) { removeCar(c); } continue; }
    if (c.burn > 0) { c.burn -= dt; if (c.burn <= 0) { blowCar(c); continue; } }
    if (c === P.car && P.seat === 0) { carAfterStep(c); continue; }
    if (c.kin) { c.crash = 0; continue; }
    if (c.occ[0] || !c.asleep) stepCar(c, dt, c.occ[0] && c.ai ? c.inp : c.occ[0] ? c.inp : NOINP);
    carAfterStep(c);
    if (c.ai && c.occ[0] && carSpeed(c) > 4.5) GAME.roadkill(c, c.occ[0]);
    if (!c.occ[0] && !c.occ[1] && !c.occ[2] && !c.occ[3]) c.idle += dt; else c.idle = 0;
  }
  carsCollide();
}
// --- who and what is on the streets
const humans = () => { const h = [P]; for (const k in NET.remotes) h.push(NET.remotes[k]); return h; };
const nearHuman = (x, z) => { let d = 1e9; humans().forEach(a => { const q = hyp(a.x - x, a.z - z); if (q < d) d = q; }); return d; };
const CREW_CARS = ['lowrider', 'suv', 'sedan'], STREET_CARS = ['sedan', 'sedan', 'hatch', 'hatch', 'coupe', 'suv', 'pickup', 'van', 'sport', 'lowrider'];
function parkCar(spot, type, o) { const c = spawnCar(type, spot.x, spot.z, spot.yaw, o); if (c) { c.home = spot; c.asleep = true; } return c; }
function spawnTraffic() {
  for (let tries = 0; tries < 12; tries++) { const i = (rand() * (NX + 1)) | 0, j = (rand() * (NZ + 1)) | 0, x = RX(i), z = RZ(j); if (nearHuman(x, z) < 115 && tries < 9) continue;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(q => i + q[0] >= 0 && i + q[0] <= NX && j + q[1] >= 0 && j + q[1] <= NZ), q = dirs[(rand() * dirs.length) | 0];
    lanePoint([i, j], [i + q[0], j + q[1]], 16, LANE, _lp); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 9)) continue;
    const c = spawnCar(STREET_CARS[(rand() * STREET_CARS.length) | 0], _lp.x, _lp.z, yawOf(q[0], q[1]), {}); if (!c) return;
    const b = spawnBot(TEAM_CIV, _lp.x, 0, _lp.z, {}); if (!b) { removeCar(c); return; } b.car = c; b.seat = 0; c.occ[0] = b; c.traffic = true; aiStart(c, 'traffic'); c.vx = q[0] * 8; c.vz = q[1] * 8; return; }
}
function spawnPed(clear) { for (let k = 0; k < 12; k++) { const n = NAVOK[(rand() * NAVOK.length) | 0]; if (nearHuman(n.x, n.z) < clear) continue; if (ZONES.some(z => hyp(z.x - n.x, z.z - n.z) < z.r + 6)) continue; return spawnBot(TEAM_CIV, n.x, n.y, n.z, {}); } return null; }
function spawnCrewBot(team, forward) { const s = spawnPoint(team, forward); const b = spawnBot(team, s.x, s.y, s.z, {}); if (b) { b.yaw = s.yaw; b.react = 1; } return b; }
// the players' crew is as big as the setting says; the other side gets one more, and one more again for each extra player
const crewSize = t => t === G.crew ? G.botsPer : G.botsPer + 1 + Math.min(3, humans().length - 1);
function populate() {
  for (let t = 0; t < 2; t++) { const want = crewSize(t); let live = 0; bots.forEach(b => { if (b.team === t && !b.dead && !b.temp) live++; });
    const Q = G.respawnQ[t]; while (live + Q.length < want) Q.push(G.time + .4 * Q.length); while (live + Q.length > want && Q.length) Q.pop();
    for (let k = Q.length - 1; k >= 0; k--) if (G.time >= Q[k]) { Q.splice(k, 1); spawnCrewBot(t, .45); } }
  for (let i = bots.length - 1; i >= 0; i--) { const b = bots[i]; if (b.dead && b.deadT > 9) removeBot(b); else if (b.temp && !b.car && G.time > b.until && nearHuman(b.x, b.z) > 45) removeBot(b); }
  let peds = 0, traf = 0; bots.forEach(b => { if (b.team !== TEAM_CIV || b.dead) return; if (b.car) traf++; else peds++; });
  if (peds < G.civs) spawnPed(60);
  if (traf < G.traffic && cars.length < CAR_MAX - 6) spawnTraffic();
  // cars: abandoned traffic is cleared away, parked cars come back to their spots
  for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; if (c.wreck || c.occ[0] || c.occ[1] || c.occ[2] || c.occ[3] || c.kin) continue; const far = nearHuman(c.x, c.z);
    if (!c.home && c.idle > 45 && far > 70) removeCar(c); else if (c.temp && c.idle > 8 && far > 60) removeCar(c); else if (c.home && c.idle > 70 && far > 90 && hyp(c.x - c.home.x, c.z - c.home.z) > 12) removeCar(c); }
  G.homes.forEach(h => { if (h.car && !h.car.gone && !h.car.wreck) return; if (h.car) { h.car = null; h.t = G.time + 28; } if (G.time < h.t || nearHuman(h.spot.x, h.spot.z) < 70 || cars.some(c => hyp(c.x - h.spot.x, c.z - h.spot.z) < 6) || cars.length >= CAR_MAX - 4) return; h.car = parkCar(h.spot, h.type, h.team >= 0 ? { color: CREW_PAINT[h.team], team: h.team } : {}); });
}
// a four-kill streak buys this: a carload of your crew cruising round the nearest contested block
GAME.callDriveBy = who => {
  const team = who.team; let zi = -1, bd = 1e9; ZONES.forEach((z, i) => { const s = ZS[i]; if (s.owner === team && !s.hot) return; const d = hyp(z.x - who.x, z.z - who.z); if (d < bd) { bd = d; zi = i; } });
  const tx = zi >= 0 ? ZONES[zi].x : who.x, tz = zi >= 0 ? ZONES[zi].z : who.z, bi = clamp(Math.floor((tx - EDGE) / PX), 0, NX - 1), bj = clamp(Math.floor((tz - EDGE) / PZ), 0, NZ - 1), loop = [[bi, bj], [bi + 1, bj], [bi + 1, bj + 1], [bi, bj + 1]];
  let best = null, bs = -1e9; for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const d = Math.abs(i - bi - .5) + Math.abs(j - bj - .5); if (d < 1.4 || d > 3.6) continue; let en = 1e9; eachActor(a => { if (!a.dead && isCrew(a.team) && a.team !== team) en = Math.min(en, hyp(a.x - RX(i), a.z - RZ(j))); }); const s = Math.min(en, 120) - d * 10 + rand() * 20; if (s > bs) { bs = s; best = [i, j]; } }
  if (!best) return false;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(q => best[0] + q[0] >= 0 && best[0] + q[0] <= NX && best[1] + q[1] >= 0 && best[1] + q[1] <= NZ).sort((p, q) => (Math.abs(best[0] + p[0] - bi - .5) + Math.abs(best[1] + p[1] - bj - .5)) - (Math.abs(best[0] + q[0] - bi - .5) + Math.abs(best[1] + q[1] - bj - .5))), q = dirs[0];
  lanePoint(best, [best[0] + q[0], best[1] + q[1]], 14, LANE, _lp);
  const c = spawnCar(CREW_CARS[(rand() * 3) | 0], _lp.x, _lp.z, yawOf(q[0], q[1]), { color: CREW_PAINT[team], team }); if (!c) return false; c.temp = true;
  ['smg', 'smg', 'rifle', 'rifle'].slice(0, c.spec.seats).forEach((w, k) => { const b = spawnBot(team, _lp.x, 0, _lp.z, { temp: true, wpn: w }); if (!b) return; b.car = c; b.seat = k; c.occ[k] = b; b.until = G.time + 75; b.skill = 1.25; });
  if (!c.occ[0]) { removeCar(c); return false; }
  const A = aiStart(c, 'driveby', loop[0]); A.loop = loop; A.li = 0; A.until = G.time + 50; c.vx = q[0] * 6; c.vz = q[1] * 6;
  GAME.ev('db', GAME.ref(who)); return true;
};
function updateDriveBys() {
  for (let i = 0; i < cars.length; i++) { const c = cars[i], A = c.ai; if (!A || A.mode !== 'driveby') continue;
    if (A.loop) { if (G.time > A.until) { A.loop = null; A.dest = [c.x < CITY.w / 2 ? NX : 0, c.z < CITY.d / 2 ? NZ : 0]; A.cruise = 19; } else if (A.to[0] === A.dest[0] && A.to[1] === A.dest[1]) { A.li = (A.li + 1) % 4; A.dest = A.loop[A.li]; A.next = aiNext(A); } }
    else if (nearHuman(c.x, c.z) > 130 || (A.to[0] === A.dest[0] && A.to[1] === A.dest[1])) { for (let k = 0; k < 4; k++) if (c.occ[k] && c.occ[k].kind === 'bot') removeBot(c.occ[k]); removeCar(c); return; } }
}
function resetWorld() {
  while (bots.length) removeBot(bots[0]); while (cars.length) removeCar(cars[0]); while (pickups.length) removePickup(pickups[0]); grenades.forEach(g => scene.remove(g.m)); grenades.length = 0; resetProps();
  carSeq = 0; botSeq = 0; pickSeq = 0; EVQ.length = 0; evSeq = 0; $('feed').textContent = '';
  // each crew starts with the two turfs on its side of town; the mall in the middle is anybody's
  ZS.forEach((s, i) => { s.owner = i < 2 ? 0 : i > 2 ? 1 : -1; s.cap = s.owner === 0 ? -1 : s.owner === 1 ? 1 : 0; s.n0 = s.n1 = 0; s.hot = false; });
  Object.assign(G, { time: 0, tod: 17.1, phase: 'play', respawnQ: [[], []], homes: [], popT: 0, civs: 9, traffic: 7, raid: [null, null], raidT: [45 + rand() * 30, 45 + rand() * 30], payT: CFG.turfEvery, polT: 0, patrolT: 6, robT: [], robMask: 0, propI: 0 });
  G.raidT[G.crew] += 40;                           // the other side makes the first move
  [P].forEach(GAME.clearHeat);
}
function startWorld() {   // only ever called on the machine that runs the world
  G.crew = P.team; resetWorld();
  const r = rng32((Math.random() * 1e9) | 0), street = PARK.filter(s => !s.lot), lots = PARK.filter(s => s.lot && !s.truck), used = [];
  const take = (list, n) => { for (let k = 0, guard = 0; k < n && guard < 400; guard++) { const s = list[(r() * list.length) | 0]; if (used.some(u => hyp(u.x - s.x, u.z - s.z) < 9)) continue; used.push(s); k++; G.homes.push({ spot: s, type: pick(r, STREET_CARS), team: -1, car: null, t: 0 }); } };
  take(street, 11); take(lots, 6);
  for (let t = 0; t < 2; t++) BASECARS[t].forEach((s, k) => G.homes.push({ spot: s, type: k === 3 ? 'coupe' : CREW_CARS[k % 3], team: t, car: null, t: 0 }));
  G.homes.forEach(h => { h.car = parkCar(h.spot, h.type, h.team >= 0 ? { color: CREW_PAINT[h.team], team: h.team } : { color: PAINTS[(r() * PAINTS.length) | 0] }); });
  for (let k = 0; k < G.traffic; k++) spawnTraffic();
  for (let t = 0; t < 2; t++) for (let k = crewSize(t); k > 0; k--) spawnCrewBot(t, .75);          // most of each crew starts out on its turf
  for (let k = 0; k < G.civs; k++) spawnPed(0);
}
function authTick(dt) {
  G.tod = (G.tod + dt * TOD_RATE) % 24;
  updateZones(dt); updateRaids(dt);
  G.polT -= dt; if (G.polT <= 0) { G.polT = .25; updatePolice(); }
  if (G.phase === 'play') { G.payT -= dt; if (G.payT <= 0) { G.payT = CFG.turfEvery; let n = 0; ZS.forEach(s => { if (s.owner === G.crew) n++; }); if (n) { humans().forEach(a => GAME.pay(a, n * CFG.pay.turf)); GAME.ev('ti', n, n * CFG.pay.turf); } } }
  if (!DBG.freeze) for (let i = 0; i < bots.length; i++) updateBot(bots[i], dt);
  updateCarsAuth(dt); updateDriveBys();
  G.popT -= dt; if (G.popT <= 0) { G.popT = .5; populate();
    for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; p.t -= .5; if (p.t <= 0) { removePickup(p); continue; } if (p.type === 'chain') for (let k = 0; k < bots.length; k++) { const b = bots[k]; if (!b.dead && !b.car && isCrew(b.team) && hyp(b.x - p.x, b.z - p.z) < 1.6 && Math.abs(b.y - p.y) < 1.5) { GAME.takeChain(p, b); break; } } }
    // the city puts its lamp posts and hydrants back once nobody is around to see it done
    for (let k = 0; k < 40; k++) { const p = PROPS[G.propI = (G.propI + 1) % PROPS.length]; if (p.down > 0 && G.time - (p.downT || 0) > 90 && nearHuman(p.x, p.z) > 55) raiseProp(p); } }
}
// --- markers in the world: a ring and a letter over each turf, a glow where you can buy or repair
const zoneMarks = ZONES.map((z, i) => {
  const y = z.id === 'D' ? .09 : CURB + .1, g = new T.RingGeometry(z.r - .45, z.r, 56); g.rotateX(-PI / 2);
  const ring = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); ring.position.set(z.x, y, z.z); scene.add(ring);
  const bg = new T.CylinderGeometry(.5, .5, 46, 8, 1, true), beam = new T.Mesh(bg, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); beam.position.set(z.x, 23, z.z); scene.add(beam);
  const c = texCanvas(128), x = c.getContext('2d'); x.font = '100px "Anton", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(z.id, 64, 70); x.fillStyle = '#fff'; x.fillText(z.id, 64, 70);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false, fog: false })); sp.scale.setScalar(5); sp.position.set(z.x, z.id === 'C' ? 14.5 : z.id === 'D' ? 13 : 9, z.z); sp.renderOrder = 8; scene.add(sp);
  return { ring, beam, sp, own: -2 };
});
const _zc = new T.Color();
function updateMarks(dt) {
  zoneMarks.forEach((m, i) => { const s = ZS[i], hex = s.owner < 0 ? 0xf2efe6 : CREWS[s.owner].color; _zc.setHex(hex); m.ring.material.color.copy(_zc); m.beam.material.color.copy(_zc); m.sp.material.color.copy(_zc); m.ring.material.opacity = s.hot ? .45 + Math.sin(G.time * 9) * .3 : .5;
    const d = hyp(ZONES[i].x - camera.position.x, ZONES[i].z - camera.position.z); m.sp.scale.setScalar(clamp(d * .05, 3, 16)); });
  shopMarks.forEach(m => { m.rotation.y += dt * 1.5; }); ROBS.forEach((r, i) => { r.m.visible = tillOpen(i); });
}
const shopMarks = [];
function mark(x, z, color, r) { const g = new T.CylinderGeometry(r, r, .5, 20, 1, true), m = new T.Mesh(g, new T.MeshBasicMaterial({ color, transparent: true, opacity: .26, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); m.position.set(x, CURB + .27, z); scene.add(m); shopMarks.push(m); return m; }
SHOPS.forEach(s => { s.m = mark(s.x, s.z, 0x8fe36b, 1.1); }); GARAGES.forEach(g => { g.m = mark(g.x, g.z, 0xffc83d, 2.4); }); ROBS.forEach(r => { r.m = mark(r.x, r.z, 0xff5fa2, .8); });
// the train on the elevated line: three cars that only ever pass through
const train = new T.Group(); { const b = new GeoBuf(); for (let k = 0; k < 3; k++) { const z = k * 15.4; b.box(-1.45, 1.45, .5, 3.5, z, z + 14.6, hexCol(0xb9c0c6)); b.box(-1.48, 1.48, 1.7, 2.7, z + .6, z + 14, hexCol(0x1f2a33)); b.box(-1.5, 1.5, .9, 1.15, z, z + 14.6, hexCol(0x1f4e8c)); b.box(-1.2, 1.2, 0, .5, z + 1, z + 3.4, hexCol(0x25282b)); b.box(-1.2, 1.2, 0, .5, z + 11.2, z + 13.6, hexCol(0x25282b)); }
  const m = new T.Mesh(b.build(), lam({})); m.castShadow = true; train.add(m); const w = new T.Mesh(new T.BoxGeometry(2.96, .9, 44), new T.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0 })); w.position.set(0, 2.2, 22.5); train.add(w); train.userData.win = w; scene.add(train); }
function updateTrain(dt) { const span = CITY.d + 420, z = ((G.time * 15) % span) - 210; train.position.set(LINE.x - 2.4, LINE.y1 + .1, z); train.userData.win.material.opacity = ENV.night * .55;
  const d = hyp(LINE.x - EAR.x, z + 22 - EAR.z); if (AC && d < 70 && rand() < dt * 9) sNoise(.3, 160, .22 * (1 - d / 70), 'lowpass'); }
