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
  hourly: { A: 100, B: 100, C: 160, D: 140, E: 100, F: 100, G: 140, H: 100, I: 120, J: 100 },   // what each neighbourhood pays its crew every hour of the day: the home turfs less, the middle of town more
  offline: { rate: 1, cap: 8 },     // away from the game, your turf keeps earning one in-game hour of income per real hour, for up to eight hours
  ev: { truck: [250, 450], hit: 1200, war: 800, warHalf: 300, chop: [600, 1200], stash: 1000, race: 700 },
  cop: { pay: 150, rankPay: 15 },   // a police officer's wage every in-game hour, and how much more each rank adds
  rp: { kill: 25, head: 15, cop: 15, capture: 300, rob: 75, chain: 20, buy: 150, mod: 25, job: { truck: 200, hit: 250, war: 250, chop: 200, stash: 200, race: 150, deal: 250 } },   // what each thing is worth towards the next rank
};
// Six crews, each in its own colour, with a yard on the edge of town and one neighbourhood to start with; the middle of the city is anybody's.
// `tops` is what its people wear; `paint` is the colour of its cars; `glow` lights its rings and beams. `ink` writes its name on the dark HUD,
// with `halo` round the letters when the colour itself is too dark to read there; `on` is the colour of a letter on its swatch.
const CREWS = [
  { name: 'Bloods',                    short: 'BLOODS',     side: 'West side',  holds: 'The Courts',     color: 0xe8322b, css: '#ff3b30', ink: '#ff4d42', rgb: '255,59,48',   dark: 0x6e1410, paint: 0xb3201a, glow: 0xff3b30, on: '#1a0504', sign: ['#1a0908', '#ff3b30'], tops: [0xd8261f, 0xb3201a, 0x7e1611, 0x1c1e22] },
  { name: 'Crips',                     short: 'CRIPS',      side: 'Dock side',  holds: 'The Docks',      color: 0x2f7dff, css: '#2f7dff', ink: '#5b9cff', rgb: '47,125,255',  dark: 0x123a7a, paint: 0x1f5fc8, glow: 0x2f7dff, on: '#040d1c', sign: ['#07101c', '#4a90ff'], tops: [0x2a6fe8, 0x1f5fc8, 0x153f8a, 0x1c1e22] },
  { name: 'Sex Money Murder',          short: 'SMM',        side: 'North side', holds: 'Civic Square',   color: 0x2fc451, css: '#2fc451', ink: '#45d866', rgb: '47,196,81',   dark: 0x135a23, paint: 0x1d8f3b, glow: 0x2fc451, on: '#04160a', sign: ['#07160c', '#3ddc5a'], tops: [0x2bb84b, 0x1d8f3b, 0x14612a, 0x1c1e22] },
  { name: 'Vice Lords',                short: 'VICE LORDS', side: 'South side', holds: 'Gas & Auto Row', color: 0xf2d21b, css: '#f2d21b', ink: '#f2d21b', rgb: '242,210,27',  dark: 0x6e5d0c, paint: 0xd9b80f, glow: 0xf2d21b, on: '#171303', sign: ['#17150a', '#f2d21b'], tops: [0xf2d21b, 0xd0b010, 0x8a7a14, 0x1c1e22] },
  { name: 'Gangster Disciple Killers', short: 'GDK',        side: 'Southwest',  holds: 'The Corner',     color: 0xf2f2f2, css: '#f2f2f2', ink: '#ffffff', rgb: '242,242,242', dark: 0x8a8d92, paint: 0xe6e6e6, glow: 0xffffff, on: '#111214', sign: ['#16181c', '#f4f4f4'], tops: [0xf2f2f2, 0xdcdcdc, 0xbdbdbd, 0x1c1e22] },
  { name: 'Gangster Disciples',        short: 'GD',         side: 'Southeast',  holds: 'The Foundry',    color: 0x1b1c20, css: '#1b1c20', ink: '#16171a', rgb: '22,23,26',    dark: 0x0e0f11, paint: 0x141518, glow: 0x9aa3b4, on: '#f2f2f2', sign: ['#e6e6e6', '#111214'], tops: [0x161616, 0x232323, 0x0e0e0e, 0x30343a], halo: '#e6e9ee', edge: '#cfd4db' },
];
const NCREW = CREWS.length, TEAM_CIV = NCREW, TEAM_COP = NCREW + 1;
CREWS.forEach(c => { c.edge = c.edge || c.css; });
// which crew holds each neighbourhood when a session starts; anything not listed is nobody's
const TURF_START = { A: 0, E: 1, F: 2, H: 3, B: 4, J: 5 };
// range: [full damage out to, half damage from] in metres. `car`: can be fired from a vehicle.
const WEAPONS = {
  fist:     { name: 'Fists',          slot: 0, melee: true, dmg: 34, rpm: 115, reach: 2.1, kick: 0, zoom: 62, snd: [.05, 500] },
  pistol:   { name: '9mm Pistol',     slot: 1, dmg: 27, head: 2.0, mag: 15, res: 90,  rpm: 400, auto: false, reload: 1.35, spread: .011, hip: .03,  pellets: 1, kick: .035, zoom: 56, range: [28, 75],  car: true, snd: [.11, 2500], cost: 0,    ammo: 60 },
  smg:      { name: 'Micro SMG',      slot: 2, dmg: 17, head: 1.8, mag: 30, res: 180, rpm: 900, auto: true,  reload: 1.9,  spread: .024, hip: .05,  pellets: 1, kick: .02,  zoom: 58, range: [18, 55],  car: true, snd: [.085, 2900], cost: 450,  ammo: 90 },
  shotgun:  { name: 'Pump Shotgun',   slot: 3, dmg: 13, head: 1.4, mag: 6,  res: 36,  rpm: 68,  auto: false, reload: 2.8,  spread: .07,  hip: .085, pellets: 9, kick: .14,  zoom: 60, range: [9, 30],   cycle: 'pump', snd: [.34, 1050], cost: 700,  ammo: 90 },
  rifle:    { name: 'Assault Rifle',  slot: 4, dmg: 25, head: 2.0, mag: 30, res: 150, rpm: 620, auto: true,  reload: 2.3,  spread: .012, hip: .045, pellets: 1, kick: .04,  zoom: 46, range: [50, 120], snd: [.15, 1700], cost: 1300, ammo: 120 },
  marksman: { name: 'Marksman Rifle', slot: 5, dmg: 68, head: 2.2, mag: 8,  res: 40,  rpm: 150, auto: false, reload: 2.8,  spread: .0015, hip: .07, pellets: 1, kick: .1,   zoom: 20, range: [130, 300], scope: true, snd: [.3, 1300], cost: 1900, ammo: 150 },
  glocks:   { name: 'Dual Glocks',      slot: 6, dmg: 21, head: 2.0, mag: 100, res: 300, rpm: 520, auto: false, reload: 2.4, spread: .022, hip: .045, pellets: 1, kick: .028, zoom: 58, range: [24, 60], car: true, snd: [.1, 2600], cost: 2400, dual: true, sw: 1150 },   // a pistol in each hand on drum magazines; sw: how fast they go with a switch fitted
  m60:      { name: 'M60',              slot: 7, dmg: 31, head: 2.0, mag: 100, res: 300, rpm: 560, auto: true,  reload: 4.2, spread: .02,  hip: .075, pellets: 1, kick: .05,  zoom: 50, range: [60, 140], snd: [.2, 1400], cost: 4800 },
  gl:       { name: 'Grenade Launcher', slot: 8, dmg: 0,  head: 1,   mag: 6,   res: 24,  rpm: 80,  auto: false, reload: 3.2, spread: .008, hip: .02,  pellets: 1, kick: .12,  zoom: 54, range: [40, 80],  proj: 'gl',  snd: [.22, 380], cost: 6000 },
  rpg:      { name: 'Bazooka',          slot: 9, dmg: 0,  head: 1,   mag: 1,   res: 8,   rpm: 45,  auto: false, reload: 2.6, spread: .003, hip: .02,  pellets: 1, kick: .2,   zoom: 46, range: [60, 150], proj: 'rpg', snd: [.32, 260], cost: 9000 },
  // mounted on a gunship, never carried: the pilot's nose guns and rocket pods
  hgun:     { name: 'Nose guns',        slot: -1, heli: true, dmg: 24, head: 1.5, mag: 999, res: 0, rpm: 1100, auto: true, reload: 0, spread: .014, hip: .014, pellets: 1, kick: 0, zoom: 60, range: [90, 240], snd: [.12, 1500], cost: 0 },
  hr:       { name: 'Rockets',          slot: -1, heli: true, dmg: 0, head: 1, mag: 999, res: 0, rpm: 150, auto: true, reload: 0, spread: .004, hip: .004, pellets: 1, kick: 0, zoom: 60, range: [80, 220], proj: 'hr', snd: [.3, 300], cost: 0 },
};
const WID = Object.keys(WEAPONS);                      // weapon ids by number, for the wire
Object.keys(WEAPONS).forEach((k, i) => { WEAPONS[k].id = k; WEAPONS[k].n = i; });
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
CARS.muscle = { name: 'Bruiser', len: 4.9, wid: 1.95, accel: 14, vmax: 52, grip: 8,    mass: 1.15, hp: 1150, seats: 2, body: { ride: .28, belt: .9,  roof: 1.3,  hood: 1.9,  trunk: 1.05, rake: .8, crake: .85 } };
CARS.super  = { name: 'Vortex',  len: 4.5, wid: 2.02, accel: 17, vmax: 60, grip: 12.5, mass: .95,  hp: 900,  seats: 2, body: { ride: .18, belt: .7,  roof: 1.06, hood: 1.5,  trunk: .55, rake: 1.1, crake: 1.25 } };
for (const k in CARS) { CARS[k].accel *= 1.22; CARS[k].vmax *= 1.28; }   // everything on the road quicker than it was
// helicopters: kept with the cars so seats, damage, wrecks and the wire treat them alike. len and wid are the cabin (what you bump into);
// accel and vmax are across the ground, climb is metres a second up or down, turn is how fast the nose comes round. air 'gun' carries nose guns and rockets.
CARS.heli    = { name: 'Hornet',  air: 'gun', len: 5.2, wid: 2.3, accel: 21, vmax: 52, climb: 13, turn: 1.9, grip: 8, mass: 2.2, hp: 1800, seats: 4 };
CARS.chopper = { name: 'Skylark', air: 'civ', len: 5.6, wid: 2.4, accel: 17, vmax: 46, climb: 11, turn: 1.6, grip: 8, mass: 2.0, hp: 1400, seats: 4 };
// planes (air 'plane'): vmax and vstall are airspeeds, pitchRate and rollRate how quick the controls answer, turn how fast a full bank brings the nose round
CARS.prop    = { name: 'Mallard', air: 'plane', len: 7.6, wid: 2.2, accel: 8, vmax: 50, vstall: 21, turn: 1.05, pitchRate: .8, rollRate: 2.4, grip: 8, mass: 1.2, hp: 900, seats: 2 };
CARS.jet     = { name: 'Starling', air: 'plane', len: 11.8, wid: 2.6, accel: 12, vmax: 74, vstall: 33, turn: .92, pitchRate: .66, rollRate: 2.0, grip: 8, mass: 3, hp: 1500, seats: 4 };
// a city bus: Calder Transit's on the loop round the middle of town (99-transit.js); slow, heavy, a driver up front and three seats to ride in
CARS.bus     = { name: 'Calder Transit', len: 10.5, wid: 2.55, accel: 6.5, vmax: 23, grip: 8, mass: 4, hp: 3200, seats: 4, body: { ride: .42, belt: 1.15, roof: 3.0, hood: .22, trunk: 0, rake: .1, crake: .06 } };
const CID = Object.keys(CARS);
CID.forEach((k, i) => { CARS[k].id = k; CARS[k].n = i; });
const PAINTS = [0xd9d6cf, 0x1b1d21, 0x8c9299, 0xb3261e, 0x1f4e8c, 0x1d6b45, 0xe0a224, 0x6b3fa0, 0xd96f1c, 0x4a2d1e, 0x2a7f86, 0xf2efe6];
const CREW_PAINT = CREWS.map(c => c.paint), COP_PAINT = 0x14181f;
// The police as a side a player can take. Not a crew: no turf, no yard, no letter on the top bar. A salary every hour, the pay for every
// gangster taken down, a cruiser, backup on the phone, and the police helicopter on the airport pad.
const COPSIDE = { name: 'Police', short: 'POLICE', side: 'Port Calder PD', holds: 'nothing: the whole city is the beat', color: 0x2f6bff, css: '#5c98ff', ink: '#7fb0ff', edge: '#5c98ff', rgb: '92,152,255', dark: 0x14224d, paint: COP_PAINT, glow: 0x5c98ff, on: '#06102a', sign: ['#0b1530', '#7fb0ff'], tops: [0x1c2a4a, 0x1c2a4a, 0x16213a, 0x1c1e22] };
const SIDE = t => t === TEAM_COP ? COPSIDE : CREWS[t] || CREWS[0];      // a player's side, crew or police
// the weather everywhere: k is what the machine running the world says it is (see 98-weather.js); the rest is each machine's own turn toward it
const WX = { k: 0, next: 0, cloud: 0, rain: 0, fog: 0, wind: .2, wet: 0, flash: 0, boltT: 6, boltOn: 0, seen: 0, lit: false };
const sideOf = v => (v | 0) === TEAM_COP ? TEAM_COP : clamp(v | 0, 0, NCREW - 1);
const HANDLES = ['Ghost', 'Tiny', 'Smoke', 'Lucky', 'Ace', 'Duke', 'Rook', 'Juno', 'Mako', 'Onyx', 'Vega', 'Nix', 'Zed', 'Kilo', 'Moss', 'Rio', 'Sable', 'Jinx', 'Tank', 'Dot', 'Wren', 'Cruz', 'Bishop', 'Echo', 'Pax', 'Lark', 'Ozzy', 'Remy', 'Sol', 'Trey', 'Ivy', 'Knox'];
