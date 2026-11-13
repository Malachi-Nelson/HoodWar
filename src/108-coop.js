/* =====================================================================
   11d. PLAYING TOGETHER — online, a player whose health runs out goes down instead of dying, as long as someone on their side
        is still up: they bleed out for thirty seconds unless a teammate stands over them and picks them up. Anyone can mark a
        spot, a person or a car for their side (a ping). Teammates' health shows down the side of the screen, and a player who
        does die comes back near the others instead of across town.
   ===================================================================== */
const DOWN = { bleed: 30, revive: 2.5, again: 25 };   // seconds to bleed out, to pick someone up, and before the same player can go down again
const mateOf = (a, b) => a !== b && a.team === b.team && a.team !== TEAM_CIV;
function canGoDown() { if (!NET.mode || G.time - (P.revT || -99) < DOWN.again) return false; for (const k in NET.remotes) { const r = NET.remotes[k]; if (mateOf(r, P) && !r.dead && !r.down) return true; } return false; }
function goDown(src, wid, head) {
  if (P.car) GAME.leaveCar(true);
  Object.assign(P, { hp: 1, down: DOWN.bleed, downSrc: src, downW: wid, downH: head, knock: 1, knockT: 1, hack: null, rob: null, rev: null, ads: 0 }); mouse.down = false; setAds(false); closeShop();
  $('dead').hidden = false; setHud('dead-big', 'Down'); SFX.hurt(); banner('Down', 'A teammate can pick you up · ' + capOf('use') + ' gives up', 2.6);
}
function bleedOut() { if (!P.down) return; P.down = 0; P.knock = 0; P.hp = 0; setHud('dead-big', 'Dropped'); GAME.playerDied(P.downSrc && !P.downSrc.gone ? P.downSrc : null, P.downW || 'pistol', !!P.downH); }
function downTick(dt) {
  P.down -= dt; P.knock = 1; P.knockT = Math.max(P.knockT, .5); P.hp = Math.max(1, P.hp); mouse.down = false;
  setHud('dead-sub', 'Bleeding out · ' + Math.max(0, Math.ceil(P.down)) + 's · a teammate can pick you up · ' + capOf('use') + ' gives up');
  if (P.down <= 0 || !NET.mode) bleedOut();
}
function revived(by) {
  if (!P.down) return; Object.assign(P, { down: 0, knock: 0, knockT: 0, hp: Math.round(maxHp() * .4), safeT: 2.5, revT: G.time }); $('dead').hidden = true; setHud('dead-big', 'Dropped');
  banner('Back on your feet', by && by !== P ? 'Picked up by ' + nameOf(by) : '', 2); SFX.cap(true);
}
// picking someone up: stand over them and press USE; it takes a couple of seconds of staying there
function revivePrompt() {
  if (P.rev) return { text: 'Picking up ' + P.rev.r.name + '… ' + Math.round(P.rev.t / DOWN.revive * 100) + '%' };
  for (const k in NET.remotes) { const r = NET.remotes[k]; if (r.down && !r.dead && mateOf(r, P) && hyp(r.x - P.x, r.z - P.z) < 1.8 && Math.abs(r.y - P.y) < 1.5) return { text: '<b>F</b>Pick up ' + r.name, act: () => { P.rev = { r, t: 0 }; SFX.tick(); } }; }
  return null;
}
function reviveTick(dt) {
  const R = P.rev; if (!R) return; const r = R.r;
  if (!r.down || r.gone || r.dead || P.down || P.dead || P.car || hyp(r.x - P.x, r.z - P.z) > 2.4) { P.rev = null; return; }
  R.t += dt; P.shootT = Math.max(P.shootT, .2); if (R.t < DOWN.revive) return;
  P.rev = null; if (AUTH()) GAME.ev('rv', GAME.ref(r), GAME.ref(P)); else NET.req('rv', r.slot);
}
// --- pings: what is under the crosshair (a person, a car) or the spot it lands on, for everyone on your side to see
const PINGS = [], PING_KIND = ['here', 'enemy', 'car', 'police'], PING_COL = ['#ffc83d', '#ff6a5a', '#7dc3ff', '#5c98ff'], _pd = new T.Vector3();
function pingHere() {
  if (P.dead || G.state !== 'playing') return; camera.getWorldDirection(_pd);
  const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z; let best = null, ba = .07, kind = 0, bx = 0, by = 0, bz = 0;
  bots.forEach(b => { if (b.dead || b.gone) return; const tx = b.x - ox, ty = b.y + 1.2 - oy, tz = b.z - oz, d = hyp(tx, ty, tz); if (d < 2 || d > 180) return; const a = Math.acos(clamp((tx * _pd.x + ty * _pd.y + tz * _pd.z) / d, -1, 1)); if (a < Math.max(ba, Math.atan(.9 / d)) && a < .2 && los(ox, oy, oz, b.x, b.y + 1.2, b.z, 's')) { ba = a; best = b; } });
  if (best) { kind = best.team === TEAM_COP ? 3 : hostile(best, P) || (isCrew(best.team) && best.team !== P.team) ? 1 : 0; bx = best.x; by = best.y; bz = best.z; }
  else { let bc = null, bca = .06; cars.forEach(c => { if (c.gone || c === P.car) return; const tx = c.x - ox, ty = c.y + 1 - oy, tz = c.z - oz, d = hyp(tx, ty, tz); if (d < 3 || d > 200) return; const a = Math.acos(clamp((tx * _pd.x + ty * _pd.y + tz * _pd.z) / d, -1, 1)); if (a < Math.max(bca, Math.atan(1.6 / d)) && a < .2) { bca = a; bc = c; } });
    if (bc) { kind = 2; bx = bc.x; by = bc.y; bz = bc.z; }
    else { const t = Math.min(rayCars(ox, oy, oz, _pd.x, _pd.y, _pd.z, rayWorld(ox, oy, oz, _pd.x, _pd.y, _pd.z, 's', 260), P.car), 260); if (t >= 259) return; bx = ox + _pd.x * t; by = oy + _pd.y * t; bz = oz + _pd.z * t; } }
  if (AUTH()) GAME.ping(P, bx, by, bz, kind); else NET.req('pg', Math.round(bx * 10) / 10, Math.round(by * 10) / 10, Math.round(bz * 10) / 10, kind);
}
GAME.ping = (who, x, y, z, kind) => { if (!who || !isFinite(x + y + z)) return; GAME.ev('pg', GAME.ref(who), Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10, clamp(kind | 0, 0, 3)); };
function pingSprite(text, col) { const cv = texCanvas(256, 96), x = cv.getContext('2d'); x.font = '700 30px "Saira Condensed", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(14,16,20,.82)'; const w = Math.min(250, x.measureText(text).width + 28); x.fillRect(128 - w / 2, 4, w, 42); x.strokeStyle = col; x.lineWidth = 3; x.strokeRect(128 - w / 2 + 1.5, 5.5, w - 3, 39); x.fillStyle = col; x.fillText(text, 128, 26);
  x.beginPath(); x.moveTo(128, 92); x.lineTo(112, 60); x.lineTo(144, 60); x.closePath(); x.fill();
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false, fog: false })); sp.renderOrder = 9; return sp; }
function addPing(a, x, y, z, kind) {
  for (let i = PINGS.length - 1; i >= 0; i--) if (PINGS[i].who === a) { scene.remove(PINGS[i].sp); PINGS.splice(i, 1); }   // one ping each: a new one replaces the old
  const col = PING_COL[kind] || PING_COL[0], sp = pingSprite((a === P ? 'You' : nameOf(a)) + ' · ' + PING_KIND[kind], col); scene.add(sp);
  PINGS.push({ who: a, x, y, z, kind, t: G.time + 14, sp, col }); SFX.tick();
  if (a !== P) note(nameOf(a) + ' marked ' + (kind === 1 ? 'an enemy' : kind === 2 ? 'a car' : kind === 3 ? 'the police' : 'a spot'), 'g');
  if (a === P && !NET.mode) homiesTo(x, z);   // alone, a ping sends your homies there
}
function homiesTo(x, z) { let n = 0; bots.forEach(b => { if (b.homie === P && !b.dead && !b.car) { b.goPing = { x, z, until: G.time + 25 }; n++; } }); if (n) note('Homies heading for the mark', 'g'); }
function coopNews(e) {
  const k = e[1];
  if (k === 'rv') { const t = GAME.unref(e[2]), by = GAME.unref(e[3]); if (AUTH() && by) GAME.rp(by, 60); if (t === P) revived(by); else if (t) note((by === P ? 'You' : nameOf(by)) + ' picked up ' + nameOf(t), 'g'); }
  else if (k === 'pg') { const a = GAME.unref(e[2]); if (!a || (a !== P && !mateOf(a, P))) return; addPing(a, e[3], e[4], e[5], e[6] | 0); }
}
// --- every frame: pings fade, markers over teammates who are down, the teammates down the side of the screen
const _dm = [0, 1, 2].map(() => { const sp = pingSprite('DOWN', '#ff6a5a'); sp.visible = false; scene.add(sp); return sp; });
let mateT = 0;
function coopVisuals(dt) {
  for (let i = PINGS.length - 1; i >= 0; i--) { const q = PINGS[i]; if (G.time > q.t || G.state === 'menu') { scene.remove(q.sp); PINGS.splice(i, 1); continue; }
    const d = hyp(q.x - camera.position.x, q.z - camera.position.z), s = clamp(d * .07, 2.2, 14); q.sp.position.set(q.x, q.y + 1.6 + s * .2, q.z); q.sp.scale.set(s, s * .375, 1); q.sp.material.opacity = q.t - G.time < 2 ? (q.t - G.time) / 2 : 1; }
  let n = 0; for (const k in NET.remotes) { const r = NET.remotes[k]; if (!r.down || r.dead || !mateOf(r, P) || n >= _dm.length) continue; const sp = _dm[n++], d = hyp(r.x - camera.position.x, r.z - camera.position.z), s = clamp(d * .06, 1.8, 10); sp.visible = true; sp.position.set(r.x, r.y + 1.2 + s * .2, r.z); sp.scale.set(s, s * .375, 1); sp.material.opacity = .6 + .4 * Math.sin(G.time * 8); }
  for (let i = n; i < _dm.length; i++) _dm[i].visible = false;
  mateT -= dt; if (mateT > 0) return; mateT = .25;
  const el = $('mates'), list = []; if (NET.mode && G.state !== 'menu') for (const k in NET.remotes) { const r = NET.remotes[k]; if (mateOf(r, P)) list.push(r); }
  el.hidden = !list.length; if (!list.length) return;
  const html = list.slice(0, 5).map(r => { const hl = r.dead ? 0 : r.hl === undefined ? 100 : r.hl, st = r.dead ? 'dead' : r.down ? 'DOWN' : r.car ? 'in a car' : Math.round(hyp(r.x - P.x, r.z - P.z)) + 'm';
    return '<div class="' + (r.down ? 'dn' : r.dead ? 'dd' : '') + '"><b>' + r.name.replace(/[<>&]/g, '') + '</b><i><u style="width:' + hl + '%"></u></i><small>' + st + (r.bag ? ' · bag' : '') + '</small></div>'; }).join('');
  if (el.innerHTML !== html) el.innerHTML = html;
}
// --- dying online: come back near a teammate who is up, not across town
function mateSpawn() {
  if (!NET.mode) return null; let m = null, md = 1e9;
  for (const k in NET.remotes) { const r = NET.remotes[k]; if (!mateOf(r, P) || r.dead || r.down || r.y > 6 || !onLand(r.x, r.z)) continue; const d = hyp(r.x - P.x, r.z - P.z); if (d < md) { md = d; m = r; } }
  if (!m) return null;
  const near = NAVOK.filter(n => n.y < 1 && !n.iso && hyp(n.x - m.x, n.z - m.z) > 14 && hyp(n.x - m.x, n.z - m.z) < 45).sort((a, b) => hyp(a.x - m.x, a.z - m.z) - hyp(b.x - m.x, b.z - m.z)).slice(0, 6);
  if (!near.length) return null; const n = near[(rand() * near.length) | 0];
  return { x: n.x + rs(1), y: n.y, z: n.z + rs(1), yaw: yawOf(m.x - n.x, m.z - n.z), mate: m };
}
