(() => {
'use strict';
const $ = id => document.getElementById(id);
if (!window.THREE) { $('o-text').textContent = 'The 3D library could not load, so the game cannot start here. Reload the page to try again.'; $('deploy').hidden = true; return; }
const T = THREE, rand = Math.random, PI = Math.PI, TAU = PI * 2, hyp = Math.hypot;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const wrapPi = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
const angTo = (a, b) => wrapPi(b - a);                 // shortest signed turn from a to b
const lerpAng = (a, b, t) => a + angTo(a, b) * t;
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);        // forward is (-sin yaw, -cos yaw): yaw 0 faces north (-z), +x is east, +z is south
function rng32(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const TEST = /[?&]test\b/.test(location.search) || !!window.__PC_TEST;

/* =====================================================================
   1. TUNING TABLES
   ===================================================================== */
const CFG = {
  player: { r: .34, h: 1.78, eye: 1.6, walk: 2.4, run: 5.0, sprint: 7.3, jump: 6.6, hp: 100, armor: 100, regenDelay: 5, regenRate: 24 },
  gravity: 22, step: .5,
  startCash: 600,
  pay: { kill: 100, head: 50, chain: 150, save: 50, capture: 300, rob: [350, 650] },
  botDmg: .5,                 // bots hit players this much softer than players hit bots
  respawn: 5, botRespawn: [14, 22],
  streak: 4,                  // kills in one life that earn a drive-by call-in
  stars: [10, 30, 60, 100, 150],   // heat it takes to reach each wanted star
  robEvery: 240,              // seconds before a till that was emptied is worth robbing again
  gang: [10, 30, 60, 100, 150],     // notoriety it takes for each skull a crew puts on your head
  hourly: { A: 80, B: 100, C: 150, D: 120, E: 150, F: 120, G: 120, H: 100, I: 80, J: 120 },   // what each neighbourhood pays its crew every hour of the day
  offline: { rate: 1, cap: 8 },     // away from the game, your turf keeps earning one in-game hour of income per real hour, for up to eight hours
  ev: { truck: [250, 450], hit: 1200, war: 800, warHalf: 300, chop: [600, 1200], stash: 1000, race: 700 },
};
// Four invented crews, named for the parts of town they come from. Each has a yard and starts with two turfs.
// `tops` is what its people wear; `paint` is the colour of its cars.
const CREWS = [
  { name: 'Ember Row', short: 'EMBER', side: 'West side',  holds: 'The Courts and The Corner',       color: 0xff5a36, css: '#ff5a36', rgb: '255,90,54',   dark: 0x7a2415, paint: 0xc8401f, tops: [0xff5a36, 0xc8401f, 0x8a2a14, 0x1c1e22] },
  { name: 'Tidewater', short: 'TIDE',  side: 'Dock side',  holds: 'the Station and The Docks',       color: 0x2fb6ff, css: '#2fb6ff', rgb: '47,182,255',  dark: 0x124a6e, paint: 0x1f86c8, tops: [0x2fb6ff, 0x1f86c8, 0x145a8a, 0x1c1e22] },
  { name: 'Northgate', short: 'NORTH', side: 'North side', holds: 'Civic Square and Uptown Market',  color: 0xb684ff, css: '#b684ff', rgb: '182,132,255', dark: 0x4a2f7a, paint: 0x7a4fd0, tops: [0xb684ff, 0x8a5fe0, 0x5a3a9a, 0x1c1e22] },
  { name: 'Steelyard', short: 'STEEL', side: 'South side', holds: 'Gas & Auto Row and The Foundry',  color: 0xf2d21b, css: '#f2d21b', rgb: '242,210,27',  dark: 0x6e5d0c, paint: 0xd9b80f, tops: [0xf2d21b, 0xd0b010, 0x8a7a14, 0x1c1e22] },
];
const NCREW = CREWS.length, TEAM_CIV = NCREW, TEAM_COP = NCREW + 1;
// which crew holds each turf when a session starts; anything not listed is nobody's
const TURF_START = { A: 0, B: 0, D: 1, E: 1, F: 2, G: 2, H: 3, J: 3 };
// range: [full damage out to, half damage from] in metres. `car`: can be fired from a vehicle.
const WEAPONS = {
  fist:     { name: 'Fists',          slot: 0, melee: true, dmg: 34, rpm: 115, reach: 2.1, kick: 0, zoom: 62, snd: [.05, 500] },
  pistol:   { name: '9mm Pistol',     slot: 1, dmg: 27, head: 2.0, mag: 15, res: 90,  rpm: 400, auto: false, reload: 1.35, spread: .011, hip: .03,  pellets: 1, kick: .035, zoom: 56, range: [28, 75],  car: true, snd: [.11, 2500], cost: 0,    ammo: 60 },
  smg:      { name: 'Micro SMG',      slot: 2, dmg: 17, head: 1.8, mag: 30, res: 180, rpm: 900, auto: true,  reload: 1.9,  spread: .024, hip: .05,  pellets: 1, kick: .02,  zoom: 58, range: [18, 55],  car: true, snd: [.085, 2900], cost: 450,  ammo: 90 },
  shotgun:  { name: 'Pump Shotgun',   slot: 3, dmg: 13, head: 1.4, mag: 6,  res: 36,  rpm: 68,  auto: false, reload: 2.8,  spread: .07,  hip: .085, pellets: 9, kick: .14,  zoom: 60, range: [9, 30],   cycle: 'pump', snd: [.34, 1050], cost: 700,  ammo: 90 },
  rifle:    { name: 'Assault Rifle',  slot: 4, dmg: 25, head: 2.0, mag: 30, res: 150, rpm: 620, auto: true,  reload: 2.3,  spread: .012, hip: .045, pellets: 1, kick: .04,  zoom: 46, range: [50, 120], snd: [.15, 1700], cost: 1300, ammo: 120 },
  marksman: { name: 'Marksman Rifle', slot: 5, dmg: 68, head: 2.2, mag: 8,  res: 40,  rpm: 150, auto: false, reload: 2.8,  spread: .0015, hip: .07, pellets: 1, kick: .1,   zoom: 20, range: [130, 300], scope: true, snd: [.3, 1300], cost: 1900, ammo: 150 },
};
const WID = Object.keys(WEAPONS);                      // weapon ids by number, for the wire
Object.keys(WEAPONS).forEach((k, i) => { WEAPONS[k].id = k; WEAPONS[k].n = i; });
const SHOP = [
  { key: '1', what: 'ammo',     label: 'Ammo for every gun', cost: 150 },
  { key: '2', what: 'armor',    label: 'Body armor',         cost: 500 },
  { key: '3', what: 'smg',      label: 'Micro SMG',          cost: WEAPONS.smg.cost },
  { key: '4', what: 'shotgun',  label: 'Pump Shotgun',       cost: WEAPONS.shotgun.cost },
  { key: '5', what: 'rifle',    label: 'Assault Rifle',      cost: WEAPONS.rifle.cost },
  { key: '6', what: 'marksman', label: 'Marksman Rifle',     cost: WEAPONS.marksman.cost },
  { key: '7', what: 'nade',     label: 'Grenade',            cost: 200 },
];
// Invented models. Sizes in metres; accel m/s^2, vmax m/s, grip is how fast sideways speed dies (1/s).
const CARS = {
  sedan:    { name: 'Lakeview',  len: 4.7, wid: 1.86, accel: 9.5,  vmax: 39, grip: 9,   mass: 1.0, hp: 1000, seats: 4, body: { ride: .3, belt: .9,  roof: 1.42, hood: 1.25, trunk: 1.0, rake: .6,  crake: .5 } },
  coupe:    { name: 'Brawler',   len: 4.8, wid: 1.92, accel: 12.5, vmax: 46, grip: 7.2, mass: 1.05, hp: 1000, seats: 2, body: { ride: .3, belt: .88, roof: 1.32, hood: 1.7,  trunk: 1.0, rake: .75, crake: .9 } },
  sport:    { name: 'Kestrel',   len: 4.4, wid: 1.94, accel: 15,   vmax: 54, grip: 11,  mass: .9,  hp: 850,  seats: 2, body: { ride: .22, belt: .76, roof: 1.16, hood: 1.35, trunk: .7,  rake: .95, crake: 1.1 } },
  suv:      { name: 'Bulwark',   len: 4.9, wid: 2.0,  accel: 9,    vmax: 37, grip: 8.5, mass: 1.5, hp: 1400, seats: 4, body: { ride: .42, belt: 1.1, roof: 1.82, hood: 1.3,  trunk: 0,   rake: .5,  crake: .15 } },
  pickup:   { name: 'Roughneck', len: 5.4, wid: 2.0,  accel: 9.5,  vmax: 37, grip: 8,   mass: 1.4, hp: 1300, seats: 2, body: { ride: .45, belt: 1.1, roof: 1.78, hood: 1.45, trunk: 0,   rake: .45, crake: .1, bed: 2.0 } },
  van:      { name: 'Hauler',    len: 5.2, wid: 2.0,  accel: 7.5,  vmax: 32, grip: 8,   mass: 1.7, hp: 1400, seats: 4, body: { ride: .38, belt: 1.15, roof: 2.05, hood: .75, trunk: 0,   rake: .55, crake: .05, panel: true } },
  hatch:    { name: 'Pip',       len: 3.9, wid: 1.74, accel: 10,   vmax: 36, grip: 9.5, mass: .8,  hp: 800,  seats: 4, body: { ride: .28, belt: .9,  roof: 1.46, hood: .95,  trunk: 0,   rake: .55, crake: .35 } },
  lowrider: { name: 'Marquesa',  len: 5.5, wid: 1.98, accel: 8.5,  vmax: 36, grip: 7.8, mass: 1.2, hp: 1100, seats: 4, body: { ride: .2, belt: .82, roof: 1.3,  hood: 1.8,  trunk: 1.55, rake: .6, crake: .7, fins: true } },
};
const CID = Object.keys(CARS);
CID.forEach((k, i) => { CARS[k].id = k; CARS[k].n = i; });
const PAINTS = [0xd9d6cf, 0x1b1d21, 0x8c9299, 0xb3261e, 0x1f4e8c, 0x1d6b45, 0xe0a224, 0x6b3fa0, 0xd96f1c, 0x4a2d1e, 0x2a7f86, 0xf2efe6];
const CREW_PAINT = CREWS.map(c => c.paint), COP_PAINT = 0x14181f;
const HANDLES = ['Ghost', 'Tiny', 'Smoke', 'Lucky', 'Ace', 'Duke', 'Rook', 'Juno', 'Mako', 'Onyx', 'Vega', 'Nix', 'Zed', 'Kilo', 'Moss', 'Rio', 'Sable', 'Jinx', 'Tank', 'Dot', 'Wren', 'Cruz', 'Bishop', 'Echo', 'Pax', 'Lark', 'Ozzy', 'Remy', 'Sol', 'Trey', 'Ivy', 'Knox'];
