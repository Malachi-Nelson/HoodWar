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
  if (k === 'k') { const a = GAME.unref(e[2]), v = GAME.unref(e[3]), you = q => !!q && (q === P || q.kind === 'rp' || q.team === P.team);
    if (you(a) || you(v) || (v && hyp(v.x - P.x, v.z - P.z) < 140)) feed(a, v, e[4], e[5]);   /* a fight across town between two other crews does not need reporting */ if (a === P && v && v !== P && isCrew(v.team)) { P.streak++; SFX.kill(!!e[5]); hitMarker(!!e[5], true); if (P.streak === CFG.streak) { P.driveby = true; SFX.streak(); banner('Drive-by ready', 'Press B to send the crew through', 3, 'gold'); } } }
  else if (k === 'z') { const z = ZONES[e[2]], t = e[3]; if (t === P.team) { banner(z.name, 'Your crew holds it', 2.6, 't' + t); SFX.cap(true); } else if (hyp(z.x - P.x, z.z - P.z) < 220) note(CREWS[t].name + ' took ' + z.name, 'k' + t); }   // the city is full of this; only your own crew's news fills the screen
  else if (k === 'zn') { const z = ZONES[e[2]], t = e[3]; if (e[4] === P.team) { banner(z.name, CREWS[t].name + ' broke your hold', 2.6, 't' + t); SFX.cap(false); } }
  else if (k === 'x') { if (mine) return; const x = e[2], y = e[3], z = e[4], pw = e[5] / 10, c = e[6] ? carById(e[6]) : null, o = GAME.unref(e[7]);
    if (c && P.car === c) { GAME.leaveCar(true); hurtPlayer(999, o, 'boom'); }
    if (!(o === P && !e[6] && G.time - (NET.myBoom || -9) < 1)) { FX.boom(x, y, z, pw); SFX.boom(x, y, z); const pd = hyp(P.x - x, P.z - z); if (pd < 60) shake(clamp(1.4 - pd / 40, 0, 1)); const d = hyp(P.x - x, P.y + 1 - y, P.z - z), R = 7.5 * pw; if (!P.dead && d < R && o !== P && (!o || !isCrew(o.team) || o.team !== P.team)) hurtPlayer(170 * pw * (1 - d / (R * 1.15)), o, 'boom'); } }
  else if (k === 'bn') banner(e[2], e[3], e[4], e[5]);
  else if (k === 'ej') { if (e[2] === NET.slot && P.car && !mine) { GAME.leaveCar(false); P.knock = 1; P.knockT = 1.2; banner('Thrown out', '', 1.5); } }
  else if (k === 'ch') { const a = GAME.unref(e[2]); if (a === P) { SFX.chain(); banner(e[3] ? 'Chain saved' : 'Chain snatched', '+$' + (e[3] ? CFG.pay.save : CFG.pay.chain), 1.8, 'gold'); } }
  else if (k === 'db') { const a = GAME.unref(e[2]); if (a) banner('Drive-by inbound', (a.team === P.team ? 'Your crew is' : CREWS[a.team].name + ' is') + ' rolling through', 2.6, 't' + a.team); }
  else if (k === 'rd') { const z = ZONES[e[3]]; if (z && (e[2] === P.team || ZS[e[3]].owner === P.team || hyp(z.x - P.x, z.z - P.z) < 170)) note(e[2] === P.team ? 'Your crew is moving on ' + z.name : CREWS[e[2]].name + ' is moving on ' + z.name, 'k' + e[2]); }
  else if (k === 'ti') { const bz = SAVE.live && G.state !== 'menu' ? bizIncome() : 0; if (bz > 0) { P.earn += bz; gain(bz); }   // each player's own businesses, on their own machine
    note('Hourly income · ' + e[2] + (e[2] === 1 ? ' neighbourhood' : ' neighbourhoods') + ' · +$' + e[3] + (bz > 0 ? ' · businesses +$' + bz : ''), 'g'); }
  else if (k === 'hm') { if (GAME.unref(e[2]) === P) { PH.homUntil = G.time + 300; banner('Homies on the way', e[3] + ' of your crew coming round the corner', 2.4, 't' + P.team); } }
  else if (k === 'pv') { if (GAME.unref(e[2]) === P) { const c = carById(e[3]); if (c && P.pv) { c.pv = P; applySpec(c, P.pv); } note('Your ' + (P.pv && CARS[P.pv.t] ? CARS[P.pv.t].name : 'car') + ' is at a kerb nearby · it is on your map', 'g'); } }
  else if (k === 'hz') { const z = ZONES[e[2]]; if (e[3] === P.team) { banner('Hold broken', 'Their grip on ' + z.name + ' is gone · take the ring', 3, 't' + P.team); SFX.cap(true); } }
  else if (k === 'hw') { const z = ZONES[e[2]]; note(CREWS[e[3]].name + ' is hitting your turf in ' + z.name, 'k' + e[3]); }
  else if (k === 'hs') { const a = GAME.unref(e[2]); if (a === P) { note(CREWS[e[3]].name + ' sent a crew after you', 'k' + e[3]); SFX.star(); } }
  else if (k === 'en' || k === 'ed' || k === 'eo' || k === 'sc' || k === 'sd' || k === 'db2' || k === 'dl') evNews(e, mine);
  else if (k === 'hj' || k === 'lt' || k === 'js' || k === 'st') heistNews(e);
  else if (k === 'gs') { const a = GAME.unref(e[2]); if (a === P) banner('Gunship stolen', 'The airport police are coming', 2.6, 'gold'); else if (a) note(nameOf(a) + ' stole the airport gunship', 'g'); }
  else if (k === 'ad') { if (GAME.unref(e[2]) === P) { const c = carById(e[5]); if (c) c.pa = P; note('Your ' + (CARS[e[4]] ? CARS[e[4]].name : 'helicopter') + ' is on the helipad at ' + e[3] + ' · it is on your map', 'g'); } }
  else if (k === 'rb') { const a = GAME.unref(e[2]), r = ROBS[e[3]]; if (a === P) { SFX.buy(); banner('Till emptied', '+$' + e[4], 2, 'gold'); } else if (a && r) note(nameOf(a) + ' robbed ' + r.name, 'g'); }
}
GAME.pay = (a, n) => { if (!a || n <= 0) return; if (a === P) { P.earn += n; gain(n); } else if (a.kind === 'rp') a.earn = (a.earn | 0) + n; };
GAME.onKill = (k, v, wid, head) => {
  v.deaths = (v.deaths | 0) + 1;
  if (v.boss && !v.boss.over) GAME.bossDown(v, k);
  if (k && k !== v) {
    if (rival(k, v)) { k.kills = (k.kills | 0) + 1; GAME.pay(k, CFG.pay.kill + (head ? CFG.pay.head : 0)); GAME.rp(k, CFG.rp.kill + (head ? CFG.rp.head : 0)); addPickup('chain', v.x, groundAt(v.x, v.z, v.y + .5, 'p'), v.z, v.team); if (k.kind !== 'bot' && copNear(v.x, v.z, 50)) GAME.crime(k, 8);
      const zi = hoodAt(v.x, v.z); if (zi >= 0 && ZS[zi].owner === v.team) GAME.hurtHood(zi, k, k.kind === 'bot' ? 3 : 6); if (k.kind !== 'bot') GAME.notor(k, v.team, 12); }   // every one of theirs you drop on their own ground loosens their hold, and they remember who did it
    else if (k.kind !== 'bot') { if (v.team === TEAM_CIV) GAME.crime(k, 15); else if (v.team === TEAM_COP) { k.kills = (k.kills | 0) + 1; GAME.crime(k, 30, 3); GAME.rp(k, CFG.rp.cop); } }   // bystanders pay nothing and cost plenty
  }
  if (v.kind === 'bot' && v.team !== TEAM_CIV && v.wpn !== 'pistol' && v.wpn !== 'fist' && rand() < .5) addPickup(v.wpn, v.x + rs(1.6), groundAt(v.x, v.z, v.y + .5, 'p'), v.z + rs(1.6), -1);
  if (v.kind === 'bot' && isCrew(v.team) && !v.temp) G.respawnQ[v.team].push(G.time + lerp(CFG.botRespawn[0], CFG.botRespawn[1], rand()));
  if (v.kind !== 'bot') { GAME.clearHeat(v); GAME.clearGang(v); }                              // the police and the crews stop looking for the dead
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
  const s = (zi >= 0 && zoneSpawn(zi)) || baseSpawn(P.team); Object.assign(P, { x: s.x, y: s.y, z: s.z, vx: 0, vz: 0, vy: 0, onGround: true, yaw: s.yaw, cyaw: s.yaw, cpitch: -.08, hp: maxHp(), dead: false, deadT: 0, safeT: 3, knock: 0, car: null, enter: null, ads: 0, reloadT: 0, fireT: 0, lastHit: -99, camY: s.y });
  for (const id in P.inv) { const d = WEAPONS[id]; if (!d.melee) { P.inv[id].mag = d.mag; P.inv[id].res = Math.max(P.inv[id].res, d.mag * 2); } }
  if (P.nades < 1) P.nades = 1; $('dead').hidden = true;
};
// --- turf: the crew with the most people standing in a ring works on it. A held turf is first broken (it becomes nobody's),
//     then taken; the holders showing up in force undo the work. How fast a hold breaks depends on how firm it is (ctrl):
//     a neighbourhood whose crew has been bled on its own streets falls three times as fast as one nobody has touched.
function updateZones(dt) {
  for (let i = 0; i < ZONES.length; i++) { const z = ZONES[i], s = ZS[i], n = s.n; for (let t = 0; t < NCREW; t++) n[t] = 0;
    eachActor(a => { if (a.dead || a.gone || !isCrew(a.team)) return; if (hyp(a.x - z.x, a.z - z.z) < z.r && a.y < 14) n[a.team]++; });
    let lead = -1, top = 0, second = 0, others = 0;
    for (let t = 0; t < NCREW; t++) { if (n[t] > top) { second = top; top = n[t]; lead = t; } else if (n[t] > second) second = n[t]; if (t !== s.owner) others += n[t]; }
    s.hot = s.owner >= 0 ? others > 0 : second > 0;
    const push = Math.min(3, top - second), rate = push > 0 ? (1 + (push - 1) * .4) * dt / 9 : 0, weak = s.owner >= 0 && lead !== s.owner ? 1 + (1 - s.ctrl / 100) * 2 : 1;
    if (push > 0 && lead !== s.owner) {
      if (s.by !== lead && s.prog > 0) { s.prog -= rate * 1.5; if (s.prog <= 0) { s.prog = 0; s.by = lead; } }                 // first undo what another crew had started
      else { s.by = lead; s.prog += rate * weak; s.calmT = G.time;
        if (s.prog >= 1) { s.prog = 0;
          if (s.owner >= 0) { const was = s.owner; s.owner = -1; s.ctrl = 0; GAME.ev('zn', i, lead, was); }
          else { s.owner = lead; s.by = -1; s.ctrl = 50; GAME.ev('z', i, lead); eachActor(a => { if (!a.dead && a.team === lead && a.kind !== 'bot' && hyp(a.x - z.x, a.z - z.z) < z.r) { GAME.pay(a, CFG.pay.capture); GAME.rp(a, CFG.rp.capture); } }); } } }
    } else if (s.prog > 0 && (push > 0 || top === 0)) { s.prog -= push > 0 ? rate * 1.5 : dt / 25; if (s.prog <= 0) { s.prog = 0; s.by = -1; } }   // the holders push back, or everyone has gone
    // a hold firms up again while nobody troubles it, faster with the crew's own people standing in the ring
    if (s.owner >= 0 && !s.hot && G.time - s.calmT > 20) s.ctrl = Math.min(100, s.ctrl + dt * (n[s.owner] > 0 ? .5 : .15));
  }
}
// someone from another crew did damage in a neighbourhood: its holder's grip slips
GAME.hurtHood = (zi, by, amt) => {
  if (zi < 0 || !by) return; const s = ZS[zi]; if (s.owner < 0 || (isCrew(by.team) && by.team === s.owner)) return;
  const was = s.ctrl; s.ctrl = Math.max(0, s.ctrl - amt); s.calmT = G.time;
  if (by.kind !== 'bot' || by.team === G.crew) { if (was > 0 && s.ctrl <= 0) GAME.ev('hz', zi, by.team); }
  else if (s.owner === G.crew && was >= 50 && s.ctrl < 50 && G.time - s.warnT > 60) { s.warnT = G.time; GAME.ev('hw', zi, by.team); }
};
GAME.takeCash = (p, who) => { if (p.gone) return; removePickup(p); GAME.pay(who, p.amt || 300); };
// --- notoriety: each crew keeps its own count of what a player has done to it. Skulls bring cars of shooters, as stars bring the police.
const skullsOf = p => { let s = 0; while (s < 5 && p >= CFG.gang[s]) s++; return s; };
const gangOf = a => { if (!a.gn) { a.gn = CREWS.map(() => 0); a.gnT = CREWS.map(() => -99); a.gsqT = CREWS.map(() => 0); } return a.gn; };
GAME.notor = (who, t, pts) => {
  if (!AUTH() || !who || who.kind === 'bot' || who.dead || who.gone || !isCrew(t) || t === who.team || G.phase !== 'play') return;
  gangOf(who); who.gn[t] = Math.min(CFG.gang[4] + 40, who.gn[t] + pts); who.gnT[t] = G.time;
};
GAME.clearGang = a => { if (!a.gn) return; a.gn.fill(0); a.gnT.fill(-99); a.gsqT.fill(0); };
function updateGangs() {   // four times a second
  humans().forEach(a => { gangOf(a); if (a.dead) return;
    for (let t = 0; t < NCREW; t++) { if (!(a.gn[t] > 0)) continue;
      for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.team === t && b.tgt === a && G.time - b.seenT < 1.5) { a.gnT[t] = G.time; break; } }   // they still have eyes on you
      if (G.time - a.gnT[t] > 15) a.gn[t] = Math.max(0, a.gn[t] - .25);                                                  // out of their sight a while, and they let it go
      const sk = skullsOf(a.gn[t]); if (sk < 2) continue;
      let squads = 0; for (let i = 0; i < cars.length; i++) if (cars[i].squad === a && cars[i].team === t && !cars[i].wreck) squads++;
      if (squads < (sk >= 4 ? 2 : 1) && G.time > a.gsqT[t]) a.gsqT[t] = G.time + (spawnHitSquad(a, t, sk) ? (sk >= 4 ? 25 : 40) : 4); } });
}
// a car of a crew's shooters, a few blocks off, already on its way to whoever they are after
function spawnHitSquad(a, t, sk) {
  if (cars.length >= CAR_MAX - 2) return false;
  let best = null, bs = -1e9;
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const x = RX(i), z = RZ(j), d = hyp(x - a.x, z - a.z); if (d < 110 || d > 260 || nearHuman(x, z) < 95) continue; const sc = -Math.abs(d - 160) + rand() * 50; if (sc > bs) { bs = sc; best = [i, j]; } }
  if (!best) return false;
  const toward = g => hyp(RX(best[0] + g[0]) - a.x, RZ(best[1] + g[1]) - a.z), dir = GRID4.filter(g => best[0] + g[0] >= 0 && best[0] + g[0] <= NX && best[1] + g[1] >= 0 && best[1] + g[1] <= NZ).sort((p, q) => toward(p) - toward(q))[0];
  lanePoint(best, [best[0] + dir[0], best[1] + dir[1]], 14, LANE, _lp); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 8)) return false;
  const c = spawnCar(CREW_CARS[(rand() * 3) | 0], _lp.x, _lp.z, yawOf(dir[0], dir[1]), { color: CREW_PAINT[t], team: t }); if (!c) return false; c.temp = true; c.squad = a;
  const guns = sk >= 4 ? ['rifle', 'smg', 'rifle', 'shotgun'] : ['smg', 'pistol', 'smg', 'shotgun'];
  for (let k = 0; k < Math.min(c.spec.seats, sk >= 4 ? 4 : 3); k++) { const b = spawnBot(t, _lp.x, 0, _lp.z, { temp: true, wpn: guns[k] }); if (!b) break; b.car = c; b.seat = k; c.occ[k] = b; b.until = G.time + 150; b.skill = 1 + sk * .06; b.hunterOf = a; }
  if (!c.occ[0]) { for (let k = 1; k < 4; k++) if (c.occ[k]) removeBot(c.occ[k]); removeCar(c); return false; }
  const A = aiStart(c, 'cop', xingOf(a.x, a.z)); A.chase = a; A.gang = t; c.vx = dir[0] * 10; c.vz = dir[1] * 10;
  GAME.ev('hs', GAME.ref(a), t); return true;
}
GAME.takeChain = (p, who) => { if (p.gone) return; removePickup(p); GAME.rp(who, CFG.rp.chain); if (who.team === p.team) { GAME.pay(who, CFG.pay.save); GAME.ev('ch', GAME.ref(who), 1); } else { GAME.pay(who, CFG.pay.chain); GAME.ev('ch', GAME.ref(who), 0); } };
// --- raids: now and then a crew sends most of its people at a turf it does not hold. Between raids each crew minds its own.
function updateRaids(dt) {
  for (let t = 0; t < NCREW; t++) { const R = G.raid[t];
    if (R) { if (ZS[R.zone].owner === t || G.time > R.until) { G.raid[t] = null; G.raidT[t] = 130 + rand() * 110; bots.forEach(b => { if (b.team === t && b.goal && b.goal.zone === R.zone && ZS[R.zone].owner !== t) b.goalT = 0; }); } continue; }
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
  GAME.pay(who, amt); GAME.rp(who, CFG.rp.rob); GAME.crime(who, 35, 2); GAME.ev('rb', GAME.ref(who), i, amt); GAME.noise(r.x, r.z, who, 30);
  const zi = hoodAt(r.x, r.z); if (zi >= 0 && ZS[zi].owner >= 0 && ZS[zi].owner !== who.team) { GAME.hurtHood(zi, who, 12); GAME.notor(who, ZS[zi].owner, 10); }   // their block, their till
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
    if (c.wreck) { c.wreckT += dt; if (c.spec.air) { stepHeli(c, dt, NOAIR); if (c.sunk && c.wreckT > 9) { removeCar(c); continue; } } else if (carSpeed(c) > .1) stepCar(c, dt, NOINP); c.crash = 0; if (c.wreckT > 26) { removeCar(c); } continue; }
    if (c.burn > 0) { c.burn -= dt; if (c.burn <= 0) { blowCar(c); continue; } }
    if (c === P.car && P.seat === 0) { carAfterStep(c); continue; }
    if (c.kin) { c.crash = 0; continue; }
    if (c.spec.air) { if (c.hai && c.occ[0] && c.occ[0].kind === 'bot') heliBrain(c, dt); if (c.gone) continue; if (c.occ[0] || !c.asleep) stepHeli(c, dt, c.occ[0] ? c.inp : NOAIR); }
    else if (c.occ[0] || !c.asleep) stepCar(c, dt, c.occ[0] && c.ai ? c.inp : c.occ[0] ? c.inp : NOINP);
    carAfterStep(c);
    if (c.ai && c.occ[0] && carSpeed(c) > 4.5) GAME.roadkill(c, c.occ[0]);
    if (!c.occ[0] && !c.occ[1] && !c.occ[2] && !c.occ[3]) c.idle += dt; else c.idle = 0;
  }
  carsCollide();
}
// --- who and what is on the streets
const humans = () => { const h = [P]; for (const k in NET.remotes) h.push(NET.remotes[k]); return h; };
const nearHuman = (x, z) => { let d = 1e9; humans().forEach(a => { const q = hyp(a.x - x, a.z - z); if (q < d) d = q; }); return d; };
const CREW_CARS = ['lowrider', 'suv', 'sedan'], STREET_CARS = ['sedan', 'sedan', 'hatch', 'hatch', 'coupe', 'suv', 'pickup', 'van', 'sport', 'lowrider', 'muscle', 'sport', 'super', 'muscle'];
function parkCar(spot, type, o) { const c = spawnCar(type, spot.x, spot.z, spot.yaw, o); if (c) { c.home = spot; c.asleep = true; } return c; }
// Traffic and people on foot are kept where there is someone to see them: they turn up a little way off from a player and are
// taken away again once every player has left them far behind.
function spawnTraffic() {
  const hs = humans();
  for (let tries = 0; tries < 14; tries++) { const i = (rand() * (NX + 1)) | 0, j = (rand() * (NZ + 1)) | 0, x = RX(i), z = RZ(j), h = hs[(rand() * hs.length) | 0]; if ((nearHuman(x, z) < 115 || hyp(x - h.x, z - h.z) > 340) && tries < 11) continue;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(q => i + q[0] >= 0 && i + q[0] <= NX && j + q[1] >= 0 && j + q[1] <= NZ), q = dirs[(rand() * dirs.length) | 0];
    lanePoint([i, j], [i + q[0], j + q[1]], 16, LANE, _lp); if (cars.some(c => hyp(c.x - _lp.x, c.z - _lp.z) < 9)) continue;
    const c = spawnCar(STREET_CARS[(rand() * STREET_CARS.length) | 0], _lp.x, _lp.z, yawOf(q[0], q[1]), {}); if (!c) return;
    const b = spawnBot(TEAM_CIV, _lp.x, 0, _lp.z, {}); if (!b) { removeCar(c); return; } b.car = c; b.seat = 0; c.occ[0] = b; c.traffic = true; aiStart(c, 'traffic'); c.vx = q[0] * 8; c.vz = q[1] * 8; return; }
}
// someone new on foot. Some are simply walking; others are already where they were going, so a square is not empty when a player first turns the corner.
// They appear near a player but never where one could watch it happen, and ahead of anyone who is travelling fast.
// start: the session is only just beginning, so nobody is watching and they may appear anywhere near.
const _ctr = { x: 0, z: 0 };
function bubbleCentre(h) { const c = h.car, vx = c ? c.vx : h.vx || 0, vz = c ? c.vz : h.vz || 0, sp = hyp(vx, vz), k = sp > 7 ? Math.min(2.6, 75 / sp) : 0; _ctr.x = h.x + vx * k; _ctr.z = h.z + vz * k; return _ctr; }
// how far a spot is from the nearest player, or from where a fast-moving player is about to be
function nearBubble(x, z) { let d = 1e9; const hs = humans(); for (let i = 0; i < hs.length; i++) { const h = hs[i], c = bubbleCentre(h); d = Math.min(d, hyp(h.x - x, h.z - z), hyp(c.x - x, c.z - z)); } return d; }
function spawnPed(start) {
  const hs = humans(), hidden = (x, y, z) => start || nearHuman(x, z) > 60 || (nearHuman(x, z) > 26 && !seenByHuman(x, y, z));
  for (let k = 0; k < 28; k++) { const c = bubbleCentre(hs[(rand() * hs.length) | 0]);
    if (rand() < .5 && SPOTS.length) { const p = SPOTS[(rand() * SPOTS.length) | 0]; if (hyp(p.x - c.x, p.z - c.z) > 92 || (p.zone >= 0 && ZS[p.zone].hot)) continue; if (isNight() && (p.k === 'hoop' || p.k === 'browse') && rand() < .75) continue;
      const q = freeSlot(p); if (q < 0 || !hidden(p.slots[q].x, p.y, p.slots[q].z)) continue; const b = spawnBot(TEAM_CIV, p.x, p.y, p.z, {}); if (b) takeSpot(b, p, q); return b; }
    const n = NAVOK[(rand() * NAVOK.length) | 0]; if (hyp(n.x - c.x, n.z - c.z) > 92 || !hidden(n.x, n.y, n.z)) continue; if (ZONES.some((z, i) => ZS[i].hot && hyp(z.x - n.x, z.z - n.z) < z.r + 6)) continue;
    return spawnBot(TEAM_CIV, n.x, n.y, n.z, {}); }
  return null;
}
function spawnCrewBot(team, forward) { const s = spawnPoint(team, forward); const b = spawnBot(team, s.x, s.y, s.z, {}); if (b) { b.yaw = s.yaw; b.react = 1; } return b; }
// every crew is as big as the setting says: with six of them, that is plenty of people on the street
const crewSize = t => G.botsPer;
// how busy the pavements are: full from morning to dusk, thinner through the evening, quiet but never empty at night
const todBusy = () => { const h = G.tod; return h < 5 ? .5 : h < 7 ? lerp(.5, 1, (h - 5) / 2) : h < 19 ? 1 : h < 23 ? lerp(1, .6, (h - 19) / 4) : lerp(.6, .5, h - 23); };
const walkersWanted = () => Math.round((G.civs + 4 * Math.min(3, humans().length - 1)) * todBusy() * (TOUCH.on && NET.mode !== 'host' ? .7 : 1));   // a phone playing alone runs a lighter crowd
// --- people at work: a vendor at each stall and cart, clerks behind counters, hands in the yards. Each keeps hours, and is only there
//     when a player is near enough for it to matter.
const postOpen = p => { const h = G.tod; return p.role === ROLE.hand ? h > 6.5 && h < 20.5 : p.name === 'Vendor' ? h > 7 && h < 23.5 : true; };
function seenByHuman(x, y, z) { const hs = humans(); for (let i = 0; i < hs.length; i++) { const a = hs[i]; if (hyp(a.x - x, a.z - z) < 90 && los(a.x, eyeY(a), a.z, x, y + 1.2, z, 'a')) return true; } return false; }
function staffPosts(start) {
  for (let k = start ? POSTS.length : 12; k > 0; k--) { const p = POSTS[G.postI = ((G.postI | 0) + 1) % POSTS.length], d = nearHuman(p.x, p.z), open = postOpen(p);
    if (p.npc && (p.npc.gone || p.npc.dead || p.npc.post !== p)) { p.npc = null; p.t = G.time + 80; }
    if (p.npc) { if (d > 170) removeBot(p.npc); else if (!open) { const b = p.npc; p.npc = null; b.post = null; b.act = 0; b.path = null; b.idleT = 0; } continue; }   // closing time: they walk off home like anyone else
    if (!open || d > 140 || G.time < p.t || (!start && d < 40 && seenByHuman(p.slots[0].x, p.y, p.slots[0].z))) continue;
    const q = p.slots[0], b = spawnBot(TEAM_CIV, q.x, q.y, q.z, { role: p.role || ROLE.staff, name: p.name || (p.k === 'work' ? 'Worker' : 'Vendor') }); if (!b) return;
    b.post = p; p.npc = b; b.yaw = q.yaw; b.calm = p.act ? ACT[p.act] | 0 : 0; b.leg = 0; b.actT = G.time + 3 + rand() * 6; }
}
// an officer walking a beat: nothing to do with any chase until something happens in front of them
function spawnBeat() {
  const hs = humans(), h = hs[(rand() * hs.length) | 0];
  for (let k = 0; k < 10; k++) { const n = NAVOK[(rand() * NAVOK.length) | 0], d = hyp(n.x - h.x, n.z - h.z); if (d < 70 || d > 175 || nearHuman(n.x, n.z) < 70) continue;
    const b = spawnBot(TEAM_COP, n.x, n.y, n.z, { temp: true, wpn: 'pistol', name: 'Officer' }); if (b) { b.beat = true; b.until = 1e9; b.skill = .85; } return b; }
  return null;
}
function populate() {
  for (let t = 0; t < NCREW; t++) { const want = crewSize(t); let live = 0; bots.forEach(b => { if (b.team === t && !b.dead && !b.temp) live++; });
    const Q = G.respawnQ[t]; while (live + Q.length < want) Q.push(G.time + .4 * Q.length); while (live + Q.length > want && Q.length) Q.pop();
    for (let k = Q.length - 1; k >= 0; k--) if (G.time >= Q[k]) { Q.splice(k, 1); spawnCrewBot(t, .45); } }
  let peds = 0, traf = 0, beat = 0, farPed = null, fd = 90;
  for (let i = bots.length - 1; i >= 0; i--) { const b = bots[i];
    if (b.dead) { if (b.deadT > 9) removeBot(b); continue; }
    if (b.temp && !b.car && G.time > b.until && nearHuman(b.x, b.z) > 45) { removeBot(b); continue; }
    if (b.team === TEAM_COP) { if (b.beat) { if (!b.chase && !b.tgt && nearHuman(b.x, b.z) > 205) removeBot(b); else beat++; } continue; }
    if (b.team !== TEAM_CIV) continue;
    const far = nearHuman(b.x, b.z);
    if (b.car) { if (b.seat === 0 && b.car.traffic && far > 370) { const c = b.car; removeBot(b); removeCar(c); } else traf++; }
    else if (!b.post) { if (far > 128 && nearBubble(b.x, b.z) > 128) removeBot(b); else { peds++; if (far > fd) { fd = far; farPed = b; } } } }
  const want = walkersWanted();
  for (let k = Math.min(5, want - peds); k > 0; k--) spawnPed(false); if (peds > want + 2 && farPed) removeBot(farPed);       // the evening thins the crowd from its far edge
  if (traf < G.traffic + Math.min(2, humans().length - 1) && cars.length < CAR_MAX - 6) spawnTraffic();
  staffPosts(false); streetCrews();
  if (G.cops && beat < 2 && G.time > G.beatT) { G.beatT = G.time + 7; spawnBeat(); }
  // cars: abandoned traffic is cleared away, parked cars come back to their spots
  for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; if (c.wreck || c.occ[0] || c.occ[1] || c.occ[2] || c.occ[3] || c.kin || c.chop || c.pv || c.pa || (c.spec.air && !c.landed)) continue; const far = nearHuman(c.x, c.z);
    if (!c.home && c.idle > 45 && far > 70) removeCar(c); else if (c.temp && c.idle > 8 && far > 60) removeCar(c); else if (c.home && c.idle > 70 && far > 90 && hyp(c.x - c.home.x, c.z - c.home.z) > 12) removeCar(c); }
  G.homes.forEach(h => { if (h.car && !h.car.gone && !h.car.wreck) return; if (h.car) { h.car = null; h.t = G.time + 28; } if (G.time < h.t || nearHuman(h.spot.x, h.spot.z) < 70 || cars.some(c => hyp(c.x - h.spot.x, c.z - h.spot.z) < 6) || cars.length >= CAR_MAX - 4) return; h.car = parkCar(h.spot, h.type, h.color !== undefined ? { color: h.color } : h.team >= 0 ? { color: CREW_PAINT[h.team], team: h.team } : {}); });
}
// a few of each crew's people on its own corners, wherever a player is near: walk onto a rival's ground and they are there
function streetCrews() {
  let n = 0; const per = CREWS.map(() => 0);
  for (let i = bots.length - 1; i >= 0; i--) { const b = bots[i]; if (!b.street || b.dead) continue; if (!b.boss && !b.guardOf && nearHuman(b.x, b.z) > 175) { removeBot(b); continue; } n++; per[b.team]++; }
  if (n >= G.streetMax || G.time < G.streetT || !SPOTS.length) return; G.streetT = G.time + 1.2;
  const hs = humans(), h = hs[(rand() * hs.length) | 0];
  for (let k = 0; k < 12; k++) { const p = SPOTS[(rand() * SPOTS.length) | 0]; if (p.hood < 0 || p.k === 'wait') continue; const t = ZS[p.hood].owner; if (t < 0 || per[t] >= 7) continue;
    const d = hyp(p.x - h.x, p.z - h.z); if (d > 125 || nearHuman(p.x, p.z) < 32 || (p.zone >= 0 && ZS[p.zone].hot)) continue; const q = freeSlot(p); if (q < 0 || seenByHuman(p.slots[q].x, p.y, p.slots[q].z)) continue;
    const b = spawnBot(t, p.x, p.y, p.z, { temp: true }); if (!b) return; b.street = true; b.home = p; b.until = 1e9; takeSpot(b, p, q); b.act = STREET_ACTS[(rand() * STREET_ACTS.length) | 0]; return; }
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
  // each crew starts with the two turfs nearest its yard; the mall and the park in the middle are anybody's
  ZS.forEach((s, i) => { const o = TURF_START[ZONES[i].id]; s.owner = o === undefined ? -1 : o; s.by = -1; s.prog = 0; s.n.fill(0); s.hot = false; s.ctrl = s.owner >= 0 ? 100 : 0; s.calmT = -99; s.warnT = -99; });
  POI.forEach(p => { p.who.fill(null); p.npc = null; p.t = 0; });
  Object.assign(G, { time: 0, tod: 17.1, phase: 'play', respawnQ: CREWS.map(() => []), homes: [], popT: 0, civs: 70, traffic: 11, raid: CREWS.map(() => null), raidT: CREWS.map((c, t) => 55 + t * 32 + rand() * 40), hour: 17, polT: 0, gangT: 0, patrolT: 6, robT: [], robMask: 0, propI: 0, postI: 0, beatT: 10, streetT: 0, streetMax: TOUCH.on ? 8 : 12, evT: 35 });
  G.raidT[G.crew] += 40;                           // somebody else makes the first move
  [P].forEach(a => { GAME.clearHeat(a); GAME.clearGang(a); }); LIFE.reset(); resetEvents();
}
// only ever called on the machine that runs the world. `at`: where the first crowd should gather; by default, the player's own yard.
function startWorld(at) {
  G.crew = P.team; resetWorld(); at = at || SPAWNS[P.team][0]; P.x = at.x; P.z = at.z;
  const sv = loadSave(); if (sv && Array.isArray(sv.z) && sv.z.length === ZS.length) sv.z.forEach((q, i) => { const s = ZS[i], o = q[0] | 0; if (o < -1 || o >= NCREW) return; s.owner = o; s.ctrl = o >= 0 ? clamp(+q[1] || 50, 10, 100) : 0; });   // the city as this player left it
  const r = rng32((Math.random() * 1e9) | 0), street = PARK.filter(s => !s.lot), lots = PARK.filter(s => s.lot && !s.truck), used = [];
  const take = (list, n) => { for (let k = 0, guard = 0; k < n && guard < 400; guard++) { const s = list[(r() * list.length) | 0]; if (used.some(u => hyp(u.x - s.x, u.z - s.z) < 9)) continue; used.push(s); k++; G.homes.push({ spot: s, type: pick(r, STREET_CARS), team: -1, car: null, t: 0 }); } };
  take(street, 10); take(lots, 5);
  for (let t = 0; t < NCREW; t++) BASECARS[t].forEach((s, k) => G.homes.push({ spot: s, type: k === 3 ? 'coupe' : CREW_CARS[k % 3], team: t, car: null, t: 0 }));
  AIRPORT.pads.forEach((s, k) => s.kind !== 'free' && G.homes.push({ spot: s, type: s.kind === 'gun' ? 'heli' : 'chopper', team: -1, car: null, t: 0, color: s.kind === 'gun' ? 0x1d6b45 : [0xf2efe6, 0x1f4e8c][k % 2] }));   // the airport's helicopters
  G.homes.forEach(h => { h.car = parkCar(h.spot, h.type, h.color !== undefined ? { color: h.color } : h.team >= 0 ? { color: CREW_PAINT[h.team], team: h.team } : { color: PAINTS[(r() * PAINTS.length) | 0] }); });
  for (let k = 0; k < G.traffic; k++) spawnTraffic();
  for (let t = 0; t < NCREW; t++) for (let k = crewSize(t); k > 0; k--) spawnCrewBot(t, .75);      // most of each crew starts out on its turf
  staffPosts(true);
  for (let k = walkersWanted(); k > 0; k--) spawnPed(true);
}
// every hour of the day each neighbourhood pays the crew that runs it, less for one it only half controls
function payHour() { let n = 0, amt = 0; ZS.forEach((s, i) => { if (s.owner !== G.crew) return; n++; amt += ZONES[i].val * (.5 + .5 * s.ctrl / 100); }); amt = Math.round(amt / 10) * 10; if (amt > 0) { humans().forEach(a => GAME.pay(a, amt)); GAME.ev('ti', n, amt); } }
const hourlyNow = () => { let amt = 0; ZS.forEach((s, i) => { if (s.owner === G.crew) amt += ZONES[i].val * (.5 + .5 * s.ctrl / 100); }); return Math.round(amt / 10) * 10; };
function authTick(dt) {
  G.tod = (G.tod + dt * TOD_RATE) % 24;
  updateZones(dt); updateRaids(dt);
  G.polT -= dt; if (G.polT <= 0) { G.polT = .25; updatePolice(); airTick(); }
  if (G.phase === 'play') { const hr = Math.floor(G.tod); if (hr !== G.hour) { G.hour = hr; payHour(); } }
  G.gangT -= dt; if (G.gangT <= 0) { G.gangT = .25; updateGangs(); updateEvents(); }
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
  zoneMarks.forEach((m, i) => { const s = ZS[i], hex = s.owner < 0 ? 0xf2efe6 : CREWS[s.owner].glow; _zc.setHex(hex); m.ring.material.color.copy(_zc); m.beam.material.color.copy(_zc); m.sp.material.color.copy(_zc); m.ring.material.opacity = s.hot ? .45 + Math.sin(G.time * 9) * .3 : .5;
    const d = hyp(ZONES[i].x - camera.position.x, ZONES[i].z - camera.position.z); m.sp.scale.setScalar(clamp(d * .05, 3, 16)); });
  shopMarks.forEach(m => { m.rotation.y += dt * 1.5; }); ROBS.forEach((r, i) => { r.m.visible = tillOpen(i); });
}
const shopMarks = [];
function mark(x, z, color, r) { const g = new T.CylinderGeometry(r, r, .5, 20, 1, true), m = new T.Mesh(g, new T.MeshBasicMaterial({ color, transparent: true, opacity: .26, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); m.position.set(x, CURB + .27, z); scene.add(m); shopMarks.push(m); return m; }
SHOPS.forEach(s => { s.m = mark(s.x, s.z, 0x8fe36b, 1.1); }); GARAGES.forEach(g => { g.m = mark(g.x, g.z, 0x9fd0e8, 2.4); }); ROBS.forEach(r => { r.m = mark(r.x, r.z, 0xff5fa2, .8); });
// the train on the elevated line: three cars that only ever pass through
const train = new T.Group(); { const b = new GeoBuf(); for (let k = 0; k < 3; k++) { const z = k * 15.4; b.box(-1.45, 1.45, .5, 3.5, z, z + 14.6, hexCol(0xb9c0c6)); b.box(-1.48, 1.48, 1.7, 2.7, z + .6, z + 14, hexCol(0x1f2a33)); b.box(-1.5, 1.5, .9, 1.15, z, z + 14.6, hexCol(0x1f4e8c)); b.box(-1.2, 1.2, 0, .5, z + 1, z + 3.4, hexCol(0x25282b)); b.box(-1.2, 1.2, 0, .5, z + 11.2, z + 13.6, hexCol(0x25282b)); }
  const m = new T.Mesh(b.build(), lam({})); m.castShadow = true; train.add(m); const w = new T.Mesh(new T.BoxGeometry(2.96, .9, 44), new T.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0 })); w.position.set(0, 2.2, 22.5); train.add(w); train.userData.win = w; scene.add(train); }
function updateTrain(dt) { const span = CITY.d + 420, z = ((G.time * 15) % span) - 210; train.position.set(LINE.x - 2.4, LINE.y1 + .1, z); train.userData.win.material.opacity = ENV.night * .55;
  const d = hyp(LINE.x - EAR.x, z + 22 - EAR.z); if (AC && d < 70 && rand() < dt * 9) sNoise(.3, 160, .22 * (1 - d / 70), 'lowpass'); }
