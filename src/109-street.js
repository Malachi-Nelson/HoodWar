/* =====================================================================
   11f. ON THE STREET — the small things to do and see: something to eat from the carts, dice on the corner, a purse snatcher
        to run down, a stick-up already going on at a corner store, people out with their dogs. The machine that runs the
        world starts the encounters and pays for them; dice are played on your own machine, with your own cash.
   ===================================================================== */
EV_KINDS.push('snatch', 'holdup');
Object.assign(EV_INFO, {
  snatch: { name: 'Purse snatcher', icon: '!', col: '#ffb3c8', hex: 0xffb3c8, how: 'Stop him · give the purse back, or keep it' },
  holdup: { name: 'Holdup', icon: '!', col: '#ff8a5a', hex: 0xff8a5a, how: 'Somebody is robbing the store · stop them' },
});
Object.assign(SAY, {
  thanks: ['Enjoy!', 'There you go.', 'Come again.', 'Careful, it is hot.'],
  snatch: ['My bag!', 'Stop him!', 'Thief! Thief!', 'He took my purse!'],
  dice: ['Come on, seven!', 'Baby needs shoes!', 'Roll it!', 'Snake eyes, ha!', 'Pay up.', 'Shoot, man.'],
  grateful: ['Oh, thank you!', 'You got it back!', 'Bless you.'],
});
// --- something to eat: a cart with someone working it sells a bite for a few dollars, and it puts some health back
const FOOD = { 'HOT DOGS': ['a hot dog', 6, 35], 'TACOS': ['tacos', 8, 45], 'PRETZELS': ['a pretzel', 4, 25], 'ROASTED CORN': ['roasted corn', 5, 30], 'ICE · WATER': ['a cold drink', 3, 15] };
function cartVendor(c) { const vx = c.x - c.d[0] * 1.2, vz = c.z - c.d[1] * 1.2; for (let i = 0; i < bots.length; i++) { const b = bots[i]; if (b.team === TEAM_CIV && !b.dead && !b.car && !(b.fleeT > 0) && hyp(b.x - vx, b.z - vz) < 1.4) return b; } return null; }
function foodPrompt() {
  if (P.car || P.dead || P.down) return null; let c = null, bd = 2.9;
  for (let k = 0; k < CARTS.length; k++) { const q = CARTS[k], d = hyp(q.x - P.x, q.z - P.z); if (d < bd && Math.abs(P.y - CURB) < 1.5) { bd = d; c = q; } }
  if (!c) return null; const f = FOOD[c.text] || ['something to eat', 5, 30], v = cartVendor(c);
  if (!v) return { text: 'Nobody is working the cart' };
  const hurt = P.hp < maxHp();
  return { text: `<b>F</b>Buy ${f[0]} · $${f[1]}` + (hurt ? ' · +' + f[2] + ' health' : ''), act: () => { if (!payCash(f[1])) { note('Not enough cash', 'c'); return; } P.hp = Math.min(maxHp(), P.hp + f[2]); SFX.buy(); LIFE.said[v.id] = 0; say(v, 'thanks', '#ffe8b0', 0); if (hurt) note('+' + f[2] + ' health', 'g'); } };
}
// --- dice on the corner: a few spots round town where some locals have a game going in the afternoon and at night.
//     Put money down and roll against them: high roll takes it, a tie is a push. Win too often and they decide your dice
//     are loaded: they scatter, and someone sends a crew after you. Pull a gun on the game and the pot is on the ground.
const DICE = { spots: null, mine: null, streak: 0, won: 0, roll: null, t: 0 };
function diceSpots() {   // the same on every machine: hang spots in different blocks, well apart
  if (DICE.spots) return DICE.spots; const out = [];
  SPOTS.forEach(p => { if (p.k !== 'hang' || p.hood < 0 || p.cap < 3 || p.y > 1) return; if (out.some(q => hyp(q.x - p.x, q.z - p.z) < 170)) return; if (BUS_STOPS.some(S => hyp(S.x - p.x, S.z - p.z) < 12)) return; out.push(p); });
  DICE.spots = out.slice(0, 6).map((p, i) => ({ i, p, x: p.x, z: p.z, y: p.y, pot: 0, coolT: 0, bust: false })); return DICE.spots;
}
const diceOpen = () => G.tod > 12 || G.tod < 4;
const dicers = s => bots.filter(b => b.team === TEAM_CIV && !b.dead && !b.car && hyp(b.x - s.x, b.z - s.z) < 1.5 && Math.abs(b.y - s.y) < 1.5);
// on the machine that runs the world, four times a second: the games come and go with the players and the hour
function diceTick() {
  const O = DICE.owed; if (O) { if (G.time > O.until || O.who.gone || O.who.dead) DICE.owed = null; else if (spawnHitSquad(O.who, O.t, 2)) DICE.owed = null; }
  diceSpots().forEach(s => {
    const own = bots.filter(b => b.dice === s.i && !b.dead), near = nearHuman(s.x, s.z);
    if (own.some(b => b.fleeT > 0) && own.length) {   // shots fired, or a gun pulled: the game breaks up and the pot is left on the ground
      if (s.pot > 0) { addPickup('cash', s.x, s.y + .1, s.z, Math.max(1, Math.round(s.pot / 100))); s.pot = 0; }
      own.forEach(b => { b.dice = undefined; b.until = G.time + 20; if (b.poi) leavePoi(b); b.fleeT = Math.max(b.fleeT, 8); }); s.coolT = G.time + 180; return; }
    if (own.length && (near > 170 || !diceOpen() || (s.p.zone >= 0 && ZS[s.p.zone].hot))) { own.forEach(b => { b.dice = undefined; b.until = G.time; if (b.poi) leavePoi(b); }); return; }
    if (own.length >= 3 || near > 120 || !diceOpen() || G.time < s.coolT || (s.p.zone >= 0 && ZS[s.p.zone].hot)) return;
    const k = s.p.who.findIndex(w => !w); if (k < 0) return; const q = s.p.slots[k];
    if (near < 30 || (near < 60 && seenByHuman(q.x, s.y, q.z))) return;   // nobody watches them sit down
    const b = spawnBot(TEAM_CIV, q.x, s.y, q.z, { temp: true }); if (!b) return;
    takeSpot(b, s.p, k); b.dice = s.i; b.until = 1e9; b.actT = 1e9; b.act = own.length === 0 ? ACT.ball : own.length === 1 ? ACT.browse : ACT.talk; if (!s.pot) s.pot = 200 + ((rand() * 5) | 0) * 100;
  });
}
function dicePrompt() {
  if (P.car || P.dead || P.down || shopOpen) return null; const S = diceSpots(); let s = null;
  for (let i = 0; i < S.length; i++) if (hyp(S[i].x - P.x, S[i].z - P.z) < 2.6 && Math.abs(P.y - S[i].y) < 1.5) { s = S[i]; break; }
  if (!s || dicers(s).length < 2) return null;
  if (gunUp(P)) return { text: 'Put the gun away to play · or take the pot' };
  return { text: '<b>F</b>Shoot dice · bets from $50', act: () => { DICE.mine = s; openMenu({ kind: 'phone', x: s.x, z: s.z, title: 'Dice · ' + areaName(s.x, s.z), items: diceItems, foot: 'Higher roll wins · a tie is a push · ' + capOf('use') + ' or Esc walks away' }); } };
}
function diceItems() {
  const r = DICE.roll, out = [], bets = [50, 200, 500].concat((P.rank | 0) >= 4 ? [1000] : []);
  bets.forEach(v => out.push({ label: 'Bet $' + v.toLocaleString('en-US'), sub: r ? r.text : 'Two dice each · they roll after you', cost: v, act: () => diceRoll(v) }));
  out.push({ label: 'Walk away', act: () => closeShop() }); return out;
}
const d6 = () => 1 + ((Math.random() * 6) | 0);
function diceRoll(v) {
  const s = DICE.mine; if (!s || !payCash(v) || dicers(s).length < 2) { closeShop(); return; }
  const a = [d6(), d6()], b = [d6(), d6()], me = a[0] + a[1], them = b[0] + b[1];
  let text; if (me > them) { GAME.pay(P, v * 2); DICE.streak++; DICE.won += v; text = `You ${a[0]}+${a[1]}, them ${b[0]}+${b[1]} · you win $${v.toLocaleString('en-US')}`; SFX.buy(); }
  else if (me === them) { GAME.pay(P, v); text = `You ${me}, them ${them} · a push, money back`; SFX.tick(); }
  else { DICE.streak = 0; DICE.won -= v; text = `You ${a[0]}+${a[1]}, them ${b[0]}+${b[1]} · you lose $${v.toLocaleString('en-US')}`; SFX.deny(); }
  DICE.roll = { text, a, b, t: G.time }; DICE.t = G.time; const sh = dicers(s)[0]; if (sh) { LIFE.said[sh.id] = 0; say(sh, 'dice', '#f2efe6', 0); }
  if (DICE.streak >= 3 && DICE.won >= 600 && Math.random() < .5 + DICE.streak * .1) {   // too lucky
    closeShop(); DICE.streak = 0; DICE.won = 0; banner('"Your dice are loaded"', 'They do not like how you play · watch your back', 3.2); SFX.star();
    if (AUTH()) GAME.diceBust(P, s.i); else NET.req('dz', s.i); }
}
// on the machine that runs the world: the game breaks up and somebody sends a carload after whoever cleaned it out
GAME.diceBust = (who, i) => {
  const s = diceSpots()[i]; if (!s || !who) return; bots.forEach(b => { if (b.dice === i) { b.dice = undefined; b.until = G.time + 20; if (b.poi) leavePoi(b); b.fleeT = 6; b.fleeX = who.x; b.fleeZ = who.z; } }); s.coolT = G.time + 240;
  const zi = hoodAt(s.x, s.z), own = zi >= 0 ? ZS[zi].owner : -1, ai = aiCrews().filter(t => t !== who.team), t = own >= 0 && ai.includes(own) ? own : ai[(rand() * ai.length) | 0];
  if (t !== undefined && ![0, 1, 2].some(() => spawnHitSquad(who, t, 2))) DICE.owed = { who, t, until: G.time + 40 };   // no street to send them down just now: soon
};
// the dice themselves, and a little cash, in the middle of any game going on (drawn on every machine from who is there)
const diceGeo = new T.BoxGeometry(.09, .09, .09), diceMat = new T.MeshLambertMaterial({ color: 0xf4f1ea }), billGeo = new T.BoxGeometry(.16, .015, .08), billMat = new T.MeshLambertMaterial({ color: 0x6a9a5a });
const diceMesh = [0, 1, 2, 3].map(k => { const m = new T.Mesh(k < 2 ? diceGeo : billGeo, k < 2 ? diceMat : billMat); m.visible = false; scene.add(m); return m; });
function diceVisuals(dt) {
  if (G.state === 'menu') { diceMesh.forEach(m => m.visible = false); return; }
  let s = null; diceSpots().forEach(q => { if (!s && hyp(q.x - camera.position.x, q.z - camera.position.z) < 60 && dicers(q).length >= 2) s = q; });
  diceMesh.forEach((m, k) => { m.visible = !!s; if (!s) return; const rolling = G.time - DICE.t < .9 && DICE.mine === s, a = k * 2.1 + s.i;
    if (k < 2) { m.position.set(s.x + Math.cos(a) * .22, s.y + .05 + (rolling ? Math.abs(Math.sin((G.time - DICE.t) * 14 + k)) * .25 : 0), s.z + Math.sin(a) * .22); if (rolling) m.rotation.set(G.time * 13 + k, G.time * 9, 0); }
    else { m.position.set(s.x + Math.cos(a) * .3, s.y + .01, s.z + Math.sin(a) * .3); m.rotation.y = a; } });
}
// --- a purse snatcher: somebody grabs a bag off a passer-by near you and runs. Bring him down and the purse drops; hand it
//     back for thanks and a reward, or walk off with it (take it home, like any cash).
EV_START.snatch = () => {
  const hs = humans().filter(a => !a.dead && !a.car && a.team !== undefined); if (!hs.length) return false; const a = hs[(rand() * hs.length) | 0];
  let v = null; for (let i = 0; i < bots.length && !v; i++) { const b = bots[i]; if (b.team !== TEAM_CIV || b.dead || b.car || b.post || b.board || b.gotOn || b.dice !== undefined || b.role || b.temp) continue;
    const d = hyp(b.x - a.x, b.z - a.z); if (d < 22 || d > 65 || Math.abs(b.y - a.y) > 2 || b.y > 1) continue; if (!los(a.x, eyeY(a), a.z, b.x, b.y + 1.4, b.z)) continue; v = b; }
  if (!v) return false;
  const th = spawnBot(TEAM_CIV, v.x + rs(1.2), v.y, v.z + rs(1.2), { temp: true, name: 'Purse snatcher' }); if (!th) return false;
  th.until = 1e9; th.thief = true; th.fleeT = 120; th.fleeX = a.x; th.fleeZ = a.z; th.path = null; th.fleeing = false;
  if (v.poi) leavePoi(v); v.path = null; v.idleT = 90; v.robbed = true; v.temp = true; v.until = 1e9;
  const E = evStart({ k: 'snatch', thief: th, victim: v, val: 150 + ((rand() * 7) | 0) * 50, x: th.x, z: th.z, until: G.time + 80, solo: true, near: GAME.ref(a) });
  GAME.ev('sn', E.id, 0, GAME.ref(a), E.val); return true;
};
EV_TICK.snatch = E => {
  const th = E.thief, v = E.victim; if (v.dead || v.gone) return streetEnd(E, false);
  const c = CASES.find(q => q.ev === E), held = humans().find(h => h.case && h.case.ev === E);
  if (!E.dropped) { if (th.gone || th.dead || th.knock > .5) { E.dropped = true; dropCase('purse', E.val, th.x, groundAt(th.x, th.z, th.y + .5, 'p'), th.z, E); GAME.ev('sn', E.id, 1, -1, E.val); if (!th.dead && !th.gone) { th.fleeT = 30; th.until = G.time + 30; } }
    else { E.x = th.x; E.z = th.z; if (nearHuman(th.x, th.z) > 170 || G.time > E.until) { removeBot(th); return streetEnd(E, false); } } }
  else if (held) { E.x = v.x; E.z = v.z; if (hyp(held.x - v.x, held.z - v.z) > 140) { GAME.ev('sn', E.id, 3, GAME.ref(held), 0); E.kept = true; held.case.ev = null; return streetEnd(E, false); } }   // gone with it: it is just cash now
  else if (c) { E.x = c.x; E.z = c.z; if (G.time > E.until + 60) { liftCase(c); return streetEnd(E, false); } }
  else return streetEnd(E, false);
  if (!v.robbed) v.robbed = true; v.idleT = Math.max(v.idleT || 0, 5);
};
// whoever has the purse hands it back: on the machine that runs the world
GAME.returnPurse = who => {
  const q = who && who.case; if (!q || q.k !== 'purse' || !q.ev || q.ev.over) return; const E = q.ev, v = E.victim; if (!v || v.dead || hyp(who.x - v.x, who.z - v.z) > 3.2) return;
  who.case = null; const reward = 100 + Math.round(E.val * .4 / 10) * 10; GAME.pay(who, reward); GAME.rp(who, 160); GAME.ev('sn', E.id, 2, GAME.ref(who), reward);
  v.robbed = false; v.temp = true; v.until = G.time + 25; v.idleT = 2; streetEnd(E, true, who);
};
function pursePrompt() {
  const q = P.case; if (!q || q.k !== 'purse' || P.car) return null;
  // the marker stands on the victim once the purse is off the thief (a joined player knows no more than that)
  const E = EVTS.find(e => e.k === 'snatch' && hyp(P.x - e.x, P.z - e.z) < 3); if (!E) return null;
  return { text: '<b>F</b>Give the purse back', act: () => { if (AUTH()) GAME.returnPurse(P); else NET.req('pb'); SFX.tick(); } };
}
// --- a holdup already going on: somebody from a crew has the clerk of a corner store at gunpoint. Take them down before they
//     get away with the till, and the owner pays you for it.
EV_START.holdup = () => {
  const a = someHuman(); let best = -1, bd = 1e9;
  ROBS.forEach((r, i) => { const d = hyp(r.x - a.x, r.z - a.z); if (d < 55 || d > 230 || nearHuman(r.x, r.z) < 45 || !tillOpen(i)) return; if (d < bd) { bd = d; best = i; } });
  if (best < 0) return false; const R = ROBS[best], ai = aiCrews().filter(t => !humans().some(h => h.team === t)); if (!ai.length) return false;
  const post = POSTS.find(p => p.rob === best), t = ai[(rand() * ai.length) | 0], fx = post ? post.slots[0].x : R.x, fz = post ? post.slots[0].z : R.z, yaw = yawOf(fx - R.x, fz - R.z);
  const x = R.x, z = R.z, b = spawnBot(t, x, groundAt(x, z, 1.5, 'p'), z, { temp: true, wpn: 'pistol', name: 'Robber' }); if (!b) return false;   // where a customer stands at the till, facing the clerk
  b.until = 1e9; b.stay = { x, z }; b.yaw = b.hyaw = yaw; b.skill = .8; b.holdup = true;
  const E = evStart({ k: 'holdup', robber: b, rob: best, post, x: R.x, z: R.z, until: G.time + 55, solo: true, team: t });
  GAME.ev('ho', E.id, 0, best, -1, 0); return true;
};
EV_TICK.holdup = E => {
  const b = E.robber, clerk = E.post && E.post.npc;
  if (b.dead || b.gone) { const who = humans().filter(h => !h.dead && hyp(h.x - E.x, h.z - E.z) < 45).sort((p, q) => hyp(p.x - E.x, p.z - E.z) - hyp(q.x - E.x, q.z - E.z))[0];
    if (who) { const pay = 300 + ((rand() * 5) | 0) * 100; GAME.pay(who, pay); GAME.rp(who, 220); GAME.ev('ho', E.id, 1, E.rob, GAME.ref(who), pay); return streetEnd(E, true, who); } return streetEnd(E, false); }
  if (clerk && !clerk.dead) { clerk.scare = ACT.handsup; clerk.scareT = G.time + 1; }
  if (G.time > E.until && !E.fled) { E.fled = true; b.stay = null; b.holdup = false; b.until = G.time + 25; G.robT[E.rob] = G.time + CFG.robEvery; GAME.ev('ho', E.id, 2, E.rob, -1, 0); return streetEnd(E, false); }
};
function streetEnd(E, ok, who) { evEnd(E, ok, 0, who); }
// --- what everyone is told
function streetNews(e) {
  const k = e[1], ref = v => typeof v === 'string' ? GAME.unref(v) : null;
  if (k === 'sn') { const st = e[3], who = ref(e[4]), amt = e[5], E = EVTS.find(q => q.id === e[2]);
    if (st === 0) { if (who === P) { banner('Stop, thief!', 'Somebody just snatched a purse · run him down', 2.6, 'gold'); SFX.star(); } }
    else if (st === 1) { if (E && hyp(E.x - P.x, E.z - P.z) < 120) note('The thief dropped the purse', 'g'); }
    else if (st === 2) { if (who === P) { banner('Purse returned', '+$' + amt + ' · "Oh, thank you!"', 2.6, 'gold'); SFX.streak(); } else if (who) note(nameOf(who) + ' gave the purse back', 'g'); }
    else if (st === 3) { if (who === P) note('You kept the purse · take it home and it is your cash', 'c'); } }
  else if (k === 'ho') { const st = e[3], R = ROBS[e[4]], who = ref(e[5]), amt = e[6];
    if (st === 0) { if (R && hyp(R.x - P.x, R.z - P.z) < 260) { banner('Holdup in progress', (R ? R.name + ' · ' : '') + 'stop the robber', 2.8, 'gold'); SFX.star(); } }
    else if (st === 1) { if (who === P) { banner('Holdup stopped', '+$' + amt + ' from the owner of ' + (R ? R.name : 'the store'), 2.8, 'gold'); SFX.streak(); } else if (who) note(nameOf(who) + ' stopped the holdup at ' + (R ? R.name : 'the store'), 'g'); }
    else if (st === 2) { if (R && hyp(R.x - P.x, R.z - P.z) < 300) note('The robber got away with the till at ' + (R ? R.name : 'the store'), 'c'); } }
}
// the machine that runs the world: an encounter now and then near somebody
function streetEvents() {
  if (G.phase !== 'play' || G.time < (G.streetEvT || 60)) return; G.streetEvT = G.time + 55 + rand() * 50;
  if (EVTS.filter(E => E.k === 'snatch' || E.k === 'holdup').length) return;
  const k = rand() < .6 ? 'snatch' : 'holdup'; if (!EV_START[k]()) G.streetEvT = G.time + 12;
}
// --- dogs: a few of the people out walking have one along. They trot at heel, sit when their person stops, and run when they do.
const DOG_N = 14, dogBody = (() => { const b = new GeoBuf(), w = hexCol(0xffffff), add = (g, x, y, z) => { g.translate(x, y, z); b.geo(g, null, w); g.dispose(); };
  add(new T.BoxGeometry(.24, .22, .6), 0, .42, 0); add(new T.BoxGeometry(.2, .2, .24), 0, .58, .36); add(new T.BoxGeometry(.12, .08, .14), 0, .53, .52); [-1, 1].forEach(s => add(new T.BoxGeometry(.05, .1, .04), s * .07, .71, .34)); add(new T.BoxGeometry(.05, .05, .22), 0, .52, -.38); return b.build(); })();
const dogLegG = (() => { const g = new T.BoxGeometry(.07, .34, .07); g.translate(0, -.17, 0); return g; })();
const dogMat = new T.MeshLambertMaterial({ vertexColors: true }), dogMesh = new T.InstancedMesh(dogBody, dogMat, DOG_N), dogLegs = new T.InstancedMesh(dogLegG, new T.MeshLambertMaterial({}), DOG_N * 4);
const DOG_COL = [0x6b4a2a, 0x1e1c1a, 0xd9c7a0, 0xa0662e, 0xe8e2d6, 0x4a4440].map(h => new T.Color(h));
for (let i = 0; i < DOG_N; i++) { dogMesh.setColorAt(i, DOG_COL[i % DOG_COL.length]); for (let k = 0; k < 4; k++) dogLegs.setColorAt(i * 4 + k, DOG_COL[i % DOG_COL.length]); }
dogMesh.count = 0; dogLegs.count = 0; dogMesh.frustumCulled = dogLegs.frustumCulled = false; scene.add(dogMesh); scene.add(dogLegs);
const dogOf = b => b.team === TEAM_CIV && !b.role && !b.temp && (b.id * 2654435761 >>> 0) % 100 < 9;   // the same people on every machine
const _dgm = new T.Matrix4(), _dgq = new T.Quaternion(), _dge = new T.Euler(), _dgp = new T.Vector3(), _dgs = new T.Vector3(1, 1, 1);
function dogs(dt) {
  let n = 0; if (G.state !== 'menu') for (let i = 0; i < bots.length && n < DOG_N; i++) { const b = bots[i]; if (!dogOf(b) || b.dead || b.car || b.gotOn || b.y > 1.2) { b.dog = null; continue; }
    if (hyp(b.x - camera.position.x, b.z - camera.position.z) > 70) { b.dog = null; continue; }
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), tx = b.x + rx * .7 - fx * .3, tz = b.z + rz * .7 - fz * .3;
    let D = b.dog; if (!D) D = b.dog = { x: tx, z: tz, yaw: b.yaw, ph: rand() * 6, sp: 0 };
    const dx = tx - D.x, dz = tz - D.z, d = hyp(dx, dz), want = d > 4 ? 8 : d > .25 ? Math.min(7, d * 3 + (b.spd || 0)) : 0; D.sp = approach(D.sp, want, dt * 14);
    if (d > 8) { D.x = tx; D.z = tz; } else if (d > .01) { const k = Math.min(1, D.sp * dt / d); D.x += dx * k; D.z += dz * k; }
    if (D.sp > .3) D.yaw = lerpAng(D.yaw, Math.atan2(-dx, -dz), Math.min(1, dt * 8)); else D.yaw = lerpAng(D.yaw, b.yaw, Math.min(1, dt * 2));
    D.ph += dt * (2 + D.sp * 2.4); const y = groundAt(D.x, D.z, b.y + .6, 'p'), sit = D.sp < .2 && (b.spd || 0) < .2, bob = D.sp > .3 ? Math.abs(Math.sin(D.ph)) * .03 : 0;
    _dge.set(sit ? -.35 : 0, D.yaw + PI, 0, 'YXZ'); _dgm.compose(_dgp.set(D.x, y + bob - (sit ? .08 : 0), D.z), _dgq.setFromEuler(_dge), _dgs); dogMesh.setMatrixAt(n, _dgm);
    const cy = Math.cos(D.yaw + PI), sy = Math.sin(D.yaw + PI); [[-1, .2], [1, .2], [-1, -.2], [1, -.2]].forEach((L, k) => { const sw = sit && k > 1 ? -1.3 : D.sp > .3 ? Math.sin(D.ph + (k === 0 || k === 3 ? 0 : PI)) * .6 : 0, lx = L[0] * .08, lz = L[1] - (sit && k > 1 ? .05 : 0);
      _dge.set(sw, D.yaw + PI, 0, 'YXZ'); _dgm.compose(_dgp.set(D.x + lx * cy + lz * sy, y + bob + .34 - (sit && k > 1 ? .12 : 0), D.z - lx * sy + lz * cy), _dgq.setFromEuler(_dge), _dgs); dogLegs.setMatrixAt(n * 4 + k, _dgm); });
    n++; }
  dogMesh.count = n; dogLegs.count = n * 4; if (n) { dogMesh.instanceMatrix.needsUpdate = true; dogLegs.instanceMatrix.needsUpdate = true; }
}
function streetVisuals(dt) { diceVisuals(dt); dogs(dt); }
