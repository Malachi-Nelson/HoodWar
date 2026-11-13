/* =====================================================================
   8. STATE + COMBAT
   ===================================================================== */
const G = { state: 'menu', time: 0, tod: 18, phase: 'idle', botsPer: 4, cops: true, crew: 0, solo: true, raid: CREWS.map(() => null), raidT: CREWS.map(() => 60), payT: 60, polT: 0, patrolT: 0, robT: [] };
// each turf: who holds it (-1 nobody), which crew is in the middle of taking it and how far along they are, and how many of each crew stand in it
// ctrl: how firmly the holder runs the neighbourhood, 0..100. Hits against them in it wear it down, and a hold worn thin is quicker to break.
const ZS = ZONES.map(() => ({ owner: -1, by: -1, prog: 0, n: CREWS.map(() => 0), hot: false, ctrl: 100, calmT: -99, warnT: -99 }));
const keys = {}, mouse = { down: false, fresh: false, right: false };
const DBG = { god: false, ammo: false, freeze: false, stats: false, nav: false, notarget: false, scale: 1, fps: 60 };
const NET = { mode: null, room: null, remotes: {}, me: null, slot: 0 };
const AUTH = () => NET.mode !== 'client';           // this machine runs the bots, the traffic, the turf and the police
const bots = [], pickups = [], grenades = [];
const GAME = {};
const P = { kind: 'me', team: 0, name: 'Player', slot: 0, rp: 0, rank: 1, biz: new Set(), pv: null, pvAsk: 0, garage: null, x: 60, y: CURB, z: 300, vy: 0, vx: 0, vz: 0, onGround: true, yaw: 0, pitch: 0, cyaw: 0, cpitch: -.1, hp: 100, armor: 0, dead: false, deadT: 0, wpn: 'pistol', inv: {}, nades: 1, cash: CFG.startCash,
  fireT: 0, reloadT: 0, switchT: 0, ads: 0, punchT: 0, car: null, seat: 0, enter: null, view: 3, streak: 0, shots: 0, shootT: 0, lastHit: -99, safeT: 0, kills: 0, deaths: 0, spd: 0, knock: 0, kick: 0, earn: 0, spent: 0,
  heat: 0, wp: 0, evade: false, seenT: -99, crimeT: -99, lkx: 60, lky: CURB, lkz: 300 };
function eachActor(fn) { fn(P); for (const k in NET.remotes) fn(NET.remotes[k]); for (let i = 0; i < bots.length; i++) fn(bots[i]); }
const isCrew = t => t >= 0 && t < NCREW;
const rival = (a, b) => a !== b && isCrew(a.team) && isCrew(b.team) && a.team !== b.team;          // any two people from different crews
const sameSide = (a, b) => a.team === b.team && a.team !== TEAM_CIV;                                 // crew with crew, police with police
const wanted = a => a.kind !== 'bot' && a.heat > 0;
// who a bot will open fire on: any other crew, a wanted player if it is police, and whoever last shot it across the crew/police line
const hostile = (a, b) => a !== b && !(a.deal && a.deal === b.deal && !a.deal.blown) && (rival(a, b) || (a.team === TEAM_COP && wanted(b)) || (b.team === TEAM_COP && wanted(a)) || (a.grudge === b && G.time < a.grudgeT));
const nameOf = a => !a ? 'The city' : a.name || 'Someone';
const dmgAt = (d, dist) => d.dmg * (dist <= d.range[0] ? 1 : dist >= d.range[1] ? .5 : lerp(1, .5, (dist - d.range[0]) / (d.range[1] - d.range[0])));
// where a seated or standing body is for the purposes of being shot
const AH = { head: false }, _ab = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 };
function actorHit(a, ox, oy, oz, dx, dy, dz) {
  let base = a.y, top = 1.5, hy = 1.63, w = .3, y0 = 0;
  if (a.car) { base = a.car.y + a.car.geo.seatY; top = 1.0; hy = 1.14; w = .25; y0 = .4; } else if (a.knock > .5) { top = .5; hy = .3; w = .5; }
  const th = raySphere(ox, oy, oz, dx, dy, dz, a.x, base + hy, a.z, .185);
  _ab.x0 = a.x - w; _ab.x1 = a.x + w; _ab.y0 = base + y0; _ab.y1 = base + top; _ab.z0 = a.z - w; _ab.z1 = a.z + w;
  const tb = rayBox(ox, oy, oz, dx, dy, dz, _ab); AH.head = th <= tb; return th < tb ? th : tb;
}
const chestY = a => a.car ? a.car.y + a.car.geo.seatY + .8 : a.y + (a.knock > .5 ? .3 : 1.15);
const eyeY = a => a.car ? a.car.y + a.car.geo.seatY + 1.12 : a.y + 1.6;
/* One trigger pull from `sh` at (ox,oy,oz) along (dx,dy,dz), with `spread` radians of scatter; the tracer is drawn from (mx,my,mz). */
function shoot(sh, ox, oy, oz, dx, dy, dz, d, spread, mx, my, mz) {
  const n = d.pellets || 1, hl = hyp(dx, dz) || 1e-6, rx = -dz / hl, rz = dx / hl, ux = -dy * dx / hl, uy = hl, uz = -dy * dz / hl;
  for (let k = 0; k < n; k++) {
    let ax = dx, ay = dy, az = dz;
    if (spread > 0) { const a = rand() * TAU, m = Math.sqrt(rand()) * spread, sx = Math.cos(a) * m, sy = Math.sin(a) * m; ax += rx * sx + ux * sy; ay += uy * sy; az += rz * sx + uz * sy; const l = hyp(ax, ay, az); ax /= l; ay /= l; az /= l; }
    const tW = rayWorld(ox, oy, oz, ax, ay, az, 's', 300), tC = rayCars(ox, oy, oz, ax, ay, az, tW, sh.car || null), carHit = RC.car;
    let best = tC, who = null, head = false;
    const h2 = hyp(ax, az);
    eachActor(a => { if (a === sh || a.dead || a.gone || sameSide(a, sh) || (a.car && a.car.bp)) return;   // bulletproof glass: the car takes it
      const ex = a.x - ox, ez = a.z - oz; if (h2 > .05) { const al = (ex * ax + ez * az) / h2; if (al < -1 || al * h2 > best + 1) return; if (ex * ex + ez * ez - al * al > 1.5) return; } else if (ex * ex + ez * ez > 1.5) return;
      const t = actorHit(a, ox, oy, oz, ax, ay, az); if (t < best) { best = t; who = a; head = AH.head; } });
    const ex = ox + ax * best, ey = oy + ay * best, ez = oz + az * best;
    if (who) { FX.blood(ex, ey, ez, 5); hitActor(who, dmgAt(d, best) * (head ? d.head : 1), head, sh, d.id); }
    else if (carHit && tC < tW) { FX.sparks(ex, ey, ez, 3); SFX.metal(ex, ey, ez); hitCar(carHit, dmgAt(d, best), sh); }
    else if (best < 299) { FX.dust(ex, ey, ez, 3); if (rand() < .25) FX.sparks(ex, ey, ez, 2); }
    if (k < 3 && best > 1.5) tracer(mx, my, mz, ex, ey, ez);
  }
  sh.shots = (sh.shots | 0) + 1; sh.shotT = G.time;
  FX.muzzle(mx, my, mz, d.pellets > 1 ? 1.5 : d.id === 'pistol' || d.id === 'smg' ? .8 : 1.1);
  SFX.shot(d, ox, oy, oz, sh === P);
  if (sh === P) { muzzleLight.position.set(mx, my, mz); muzzleLight.intensity = 2.2; }
  if (AUTH()) GAME.noise(ox, oz, sh);
  LIFE.bang(ox, oz);
}
// a shot seen from another machine: flash, crack and a tracer along where they are aiming; it decides nothing
function fxShot(a, wid) {
  const d = WEAPONS[wid] || WEAPONS.pistol, m = a.ch ? a.ch.muz : null, ox = m ? m.x : a.x, oy = m ? m.y : a.y + 1.4, oz = m ? m.z : a.z, cp = Math.cos(a.pitch || 0);
  let dx = -Math.sin(a.ayaw === undefined ? a.yaw : a.ayaw) * cp + rs(.04), dy = Math.sin(a.pitch || 0) + rs(.03), dz = -Math.cos(a.ayaw === undefined ? a.yaw : a.ayaw) * cp + rs(.04); const l = hyp(dx, dy, dz); dx /= l; dy /= l; dz /= l;
  if (d.proj) fireProj(d.proj, ox, oy, oz, dx, dy, dz, a, true); else { const t = Math.min(rayWorld(ox, oy, oz, dx, dy, dz, 's', 160), 160); if (t > 2) tracer(ox, oy, oz, ox + dx * t, oy + dy * t, oz + dz * t); }
  FX.muzzle(ox, oy, oz, 1); SFX.shot(d, ox, oy, oz, false); if (a.ch) a.ch.kick = 1; LIFE.bang(ox, oz);
}
function hitActor(t, dmg, head, sh, wid) {
  if (sh === P) {
    if (t.kind === 'bot') { if (AUTH()) damageBot(t, dmg, head, P, wid); else NET.reportBot(t, dmg, head, wid); }
    else if (t.kind === 'rp') NET.reportPlayer(t, dmg, head, wid);
    hitMarker(head, t.kind === 'bot' && t.dead);
  } else if (sh.kind === 'bot') {
    if (t === P) hurtPlayer(dmg * CFG.botDmg, sh, wid, head); else if (t.kind === 'rp') NET.hurt(t, dmg * CFG.botDmg, sh, wid, head); else damageBot(t, dmg * .8, head, sh, wid);
  }
}
function hitCar(c, dmg, sh) { if (AUTH()) damageCar(c, dmg, sh); else if (sh === P) NET.reportCar(c, dmg); }
function damageBot(b, dmg, head, src, wid) {
  if (b.dead || b.gone) return;
  if (head && src && src.kind !== 'bot') dmg = Math.max(dmg, b.hp + 1);   // a player's headshot drops anyone in one
  b.hp -= dmg; b.flinch = .25; b.hurtT = G.time;
  if (src && src !== b) {
    if (src.kind !== 'bot') { if (b.team === TEAM_CIV) GAME.crime(src, 5, 0, .4); else if (b.team === TEAM_COP) GAME.crime(src, 10, 2, .4); }
    else if (b.team !== TEAM_CIV && src.team !== TEAM_CIV && (b.team === TEAM_COP) !== (src.team === TEAM_COP)) { b.grudge = src; b.grudgeT = G.time + 12; }
    if (b.team !== TEAM_CIV && hostile(b, src) && (!b.tgt || b.tgt.dead)) { b.tgt = src; b.seenT = G.time; b.react = .25; }
  }
  if (b.team === TEAM_CIV && !b.car) { b.fleeT = 9; b.fleeX = src ? src.x : b.x; b.fleeZ = src ? src.z : b.z; b.fleeing = false; }
  if (b.hp <= 0) killBot(b, src, wid, head);
}
function killBot(b, src, wid, head) {
  if (b.dead) return; b.dead = true; b.deadT = 0; b.hp = 0; b.tgt = null; b.act = 0; leavePoi(b); if (b.post) { if (b.post.npc === b) { b.post.npc = null; b.post.t = G.time + 90; } b.post = null; }
  if (b.car) { const c = b.car; c.occ[b.seat] = null; if (b.seat === 0) { c.inp.thr = 0; c.inp.steer = 0; c.ai = null; } b.car = null; }
  GAME.onKill(src, b, wid, head);
}
function hurtPlayer(dmg, src, wid, head) {
  if (P.dead || DBG.god || P.safeT > 0 || G.state === 'menu') return;
  let d = dmg; if (P.armor > 0) { const ab = Math.min(P.armor, d * .7); P.armor -= ab; d -= ab; }
  P.hp -= d; P.lastHit = G.time; SFX.hurt(); if (src && src.x !== undefined) dmgArrow(src.x, src.z);
  if (P.hp <= 0) { P.hp = 0; GAME.playerDied(src, wid, head); }
}
function damageCar(c, dmg, src) {
  if (c.wreck) return; if (src && src.kind !== 'bot' && c.occ.some(o => o && o.kind !== 'bot' && o !== src)) return;   // players cannot wreck a car another player is in
  if (c.armored && !c.opened) { dmg *= .4; if (c.hp - dmg <= c.spec.hp * .35) { c.hp = Math.max(1, c.hp - dmg); if (src) c.lastHit = src; GAME.truckOpen(c, src); return; } }   // an armored truck gives up its cash before it gives up
  if (c.plate) dmg *= [1, .67, .5, .35][c.plate] || .35;   // car-shop armor plating
  c.hp -= dmg; if (src) c.lastHit = src; c.asleep = false;
  if (c.hp <= 0 && c.burn <= 0) { c.hp = 0; c.burn = 3 + rand() * 2.5; }
}
// everything a blast does on the machine that owns the world
function explode(x, y, z, owner, power, wid) {
  power = power || 1; const R = 7.5 * power;
  FX.boom(x, y, z, power); SFX.boom(x, y, z); const pd = hyp(P.x - x, P.z - z); if (pd < 60) shake(clamp(1.4 - pd / 40, 0, 1)); if (pd < 18) flash(.25); LIFE.bang(x, z, 70);
  if (AUTH()) {
    bots.forEach(b => { if (b.dead) return; const d = hyp(b.x - x, b.y + 1 - y, b.z - z); if (d < R && (!owner || !isCrew(b.team) || b.team !== owner.team || b === owner)) { if (!b.car) { b.knock = 1; b.knockT = 1.6; } damageBot(b, 190 * power * (1 - d / (R * 1.15)), false, owner, wid || 'boom'); } });
    cars.forEach(c => { const d = hyp(c.x - x, c.z - z); if (d < R + 1.5 && !c.wreck) damageCar(c, 520 * power * (1 - d / (R + 3)), owner); });
    PROPS.forEach(p => { if (!p.down && hyp(p.x - x, p.z - z) < R * .7) { if (knockProp(p, p.x - x, p.z - z)) GAME.onKnock(p, null); } });
    GAME.noise(x, z, owner, 60); if (owner && owner.kind !== 'bot') GAME.crime(owner, 12, 0, 1);
  }
  if (!P.dead) { const d = hyp(P.x - x, P.y + 1 - y, P.z - z); if (d < R && (!owner || owner === P || !isCrew(owner.team) || owner.team !== P.team)) hurtPlayer(170 * power * (1 - d / (R * 1.15)) * (owner === P ? .7 : 1), owner, wid || 'boom'); }
}
function blowCar(c) {
  if (c.wreck) return; c.wreck = true; c.wreckT = 0; c.burn = 0; c.hp = 0; c.vx *= .3; c.vz *= .3; c.ai = null; c.inp.thr = 0;
  const src = c.lastHit && !c.lastHit.gone ? c.lastHit : null;
  if (AUTH()) { if (c.armored && !c.opened) GAME.truckOpen(c, src); if (src && src.kind !== 'bot' && isCrew(c.team) && c.team !== src.team) { GAME.notor(src, c.team, 8); GAME.hurtHood(hoodAt(c.x, c.z), src, 5); } }
  for (let k = 0; k < 4; k++) { const o = c.occ[k]; if (!o) continue; if (o.kind === 'bot') { c.occ[k] = null; o.car = null; killBot(o, src, 'boom', false); } else if (o === P) { GAME.leaveCar(true); hurtPlayer(999, src, 'boom'); } }
  if (AUTH()) { GAME.ev('x', Math.round(c.x), Math.round(c.y), Math.round(c.z), 13, c.id, GAME.ref(src)); explode(c.x, c.y + .6, c.z, src, 1.3, 'boom'); }
}
// --- grenades: thrown and simulated by whoever threw them
const nadeGeo = new T.SphereGeometry(.07, 8, 6), nadeMat = new T.MeshLambertMaterial({ color: 0x2f3a2a });
function throwGrenade() {
  if (P.nades <= 0 || P.dead || P.car) return; if (!DBG.ammo) P.nades--;
  const cp = Math.cos(P.cpitch), fx = -Math.sin(P.cyaw) * cp, fy = Math.sin(P.cpitch), fz = -Math.cos(P.cyaw) * cp, m = new T.Mesh(nadeGeo, nadeMat); scene.add(m);
  grenades.push({ m, x: P.x + fx * .5, y: P.y + 1.5, z: P.z + fz * .5, vx: fx * 15 + P.vx, vy: fy * 15 + 4, vz: fz * 15 + P.vz, t: 2.3 }); P.shootT = .6; SFX.swap();
}
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i]; g.t -= dt; g.vy -= 18 * dt;
    const e = { x: g.x + g.vx * dt, y: g.y, z: g.z + g.vz * dt }, bx = e.x, bz = e.z; pushOut(e.x, e.z, .08, g.y - .02, g.y + .1, 'p'); if (COL.n) { e.x = COL.x; e.z = COL.z; }
    if (Math.abs(e.x - bx) > 1e-4) g.vx *= -.35; if (Math.abs(e.z - bz) > 1e-4) g.vz *= -.35;
    g.x = e.x; g.z = e.z; g.y += g.vy * dt;
    const gr = groundAt(g.x, g.z, g.y, 'p', .1); if (g.y <= gr + .07) { g.y = gr + .07; g.vy = -g.vy * .32; g.vx *= .6; g.vz *= .6; }
    g.m.position.set(g.x, g.y, g.z);
    if (g.t <= 0) { scene.remove(g.m); grenades.splice(i, 1); blastAt(P, g.x, g.y, g.z, 'nade'); }
  }
}
// how big each kind of blast is (1 is the old grenade); a launcher's round or a rocket goes off where it lands
const BOOM = { nade: 1.35, gl: 1.15, rpg: 1.6 };
function blastAt(owner, x, y, z, kind) {   // owner's own round: the world's machine decides what it did; anyone else just shows it
  const pw = BOOM[kind] || 1;
  if (AUTH()) { GAME.ev('x', Math.round(x), Math.round(y), Math.round(z), Math.round(pw * 10), 0, GAME.ref(owner)); explode(x, y + .3, z, owner, pw, kind); }
  else if (owner === P) { NET.req('gx', Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10, Math.round(pw * 10), kind); FX.boom(x, y, z, pw); SFX.boom(x, y, z); NET.myBoom = G.time; const d = hyp(P.x - x, P.y + 1 - y, P.z - z), R = 7.5 * pw; if (d < R) hurtPlayer(170 * pw * .7 * (1 - d / (R * 1.15)), P, kind); }
}
// --- rockets and launcher grenades: flown on the machine of whoever fired them; on any other machine a ghost copy shows the shot
const PROJ = [], rocketGeo = new T.CylinderGeometry(.075, .075, .6, 8), rocketMat = new T.MeshLambertMaterial({ color: 0x55624a }); rocketGeo.rotateX(PI / 2);
function fireProj(kind, x, y, z, dx, dy, dz, owner, ghost) {
  const sp = kind === 'rpg' ? 55 : 32, m = new T.Mesh(kind === 'rpg' ? rocketGeo : nadeGeo, kind === 'rpg' ? rocketMat : nadeMat); if (kind !== 'rpg') m.scale.setScalar(1.4); m.position.set(x, y, z); scene.add(m);
  PROJ.push({ kind, m, x, y, z, vx: dx * sp, vy: dy * sp + (kind === 'gl' ? 3 : 0), vz: dz * sp, t: kind === 'rpg' ? 4.5 : 3.2, owner, ghost: !!ghost, trailT: 0 });
  if (kind === 'rpg') SFX.boom(x, y, z);
}
function updateProj(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) { const p = PROJ[i];
    if (p.kind !== 'rpg') p.vy -= 12 * dt;   // a launcher round arcs: aim a touch high at range
    const sp = hyp(p.vx, p.vy, p.vz) || 1, step = sp * dt, dx = p.vx / sp, dy = p.vy / sp, dz = p.vz / sp, own = p.owner && p.owner.car;
    let t = rayCars(p.x, p.y, p.z, dx, dy, dz, rayWorld(p.x, p.y, p.z, dx, dy, dz, 's', step + .01), own || null);
    if (!p.ghost) eachActor(a => { if (a === p.owner || a.dead || a.gone || (p.owner && sameSide(a, p.owner))) return; if (hyp(a.x - p.x, a.z - p.z) > step + 2) return; const h = actorHit(a, p.x, p.y, p.z, dx, dy, dz); if (h < t) t = h; });
    const k = Math.min(t, step), nx = p.x + dx * k, ny = p.y + dy * k, nz = p.z + dz * k, gy = groundAt(nx, nz, ny + .4, 'p', .1); p.t -= dt;
    if (t < step || ny <= gy + .05 || p.t <= 0) { scene.remove(p.m); PROJ.splice(i, 1); if (!p.ghost) blastAt(p.owner, nx, Math.max(ny, gy + .1), nz, p.kind); continue; }
    p.x = nx; p.y = ny; p.z = nz; p.m.position.set(nx, ny, nz); p.m.lookAt(nx + dx, ny + dy, nz + dz);
    if ((p.trailT -= dt) <= 0) { p.trailT = p.kind === 'rpg' ? .025 : .06; FX.dust(nx - dx * .4, ny - dy * .4, nz - dz * .4, 1); }
  }
}
// --- things lying in the street: chains off the fallen, dropped guns
const cashGeo = new T.BoxGeometry(.36, .24, .26), cashMat = new T.MeshLambertMaterial({ color: 0x3d7a3a }), bagGeo = new T.BoxGeometry(.62, .3, .3), bagMat = new T.MeshLambertMaterial({ color: 0x2a2620 });
const chainGeo = new T.TorusGeometry(.2, .045, 6, 14), chainMat = new T.MeshBasicMaterial({ color: 0xffc83d }), pickGlow = new T.SpriteMaterial({ map: glowTex, color: 0xffc83d, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false });
let pickSeq = 0;
function addPickup(type, x, y, z, team, id) {
  const g = new T.Group(); let m;
  // chain: off a fallen rival (team: their crew). cash: out of a truck (team: hundreds of dollars). bag: a crew's stash (team: whose). Anything else is a gun.
  if (type === 'chain') { m = new T.Mesh(chainGeo, chainMat); m.rotation.x = .5; } else if (type === 'cash') m = new T.Mesh(cashGeo, cashMat); else if (type === 'bag' || type === 'loot') m = new T.Mesh(bagGeo, bagMat); else { m = new T.Mesh(GUN_GEO[type] || GUN_GEO.pistol, gunMat); m.scale.setScalar(1.5); m.rotation.z = .3; }
  const s = new T.Sprite(pickGlow); s.scale.setScalar(type === 'chain' || type === 'bag' ? 1.5 : 1.1); const glow = type === 'cash' ? 0x8fe36b : type === 'loot' ? 0xffc83d : (type === 'chain' || type === 'bag') && isCrew(team) ? CREWS[team].glow : null; if (glow !== null) { s.material = pickGlow.clone(); s.material.color.setHex(glow); }
  g.add(m); g.add(s); g.position.set(x, y + .7, z); scene.add(g);
  const p = { id: id === undefined ? ++pickSeq : id, type, x, y, z, team: team === undefined ? -1 : team, t: type === 'cash' ? 80 : type === 'bag' || type === 'loot' ? 1e9 : 40, g, amt: type === 'cash' || type === 'loot' ? (team | 0) * 100 : 0 }; /* loot: a heist's money bag (team: hundreds of dollars) */ if (p.id > pickSeq) pickSeq = p.id; pickups.push(p);
  while (pickups.length > 18) { const old = pickups.find(q => q.type !== 'cash' && q.type !== 'bag' && q.type !== 'loot'); if (!old) break; removePickup(old); }   // the oldest chain or gun goes first; nothing an event needs
  return p;
}
function removePickup(p) { const i = pickups.indexOf(p); if (i >= 0) pickups.splice(i, 1); scene.remove(p.g); p.gone = true; }
