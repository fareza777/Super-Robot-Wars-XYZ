import { MapDef, PilotDef, SpiritDef, SpiritId, Terrain, TraitId, UnitDef, WeaponDef } from './types';

// ---------- Spirits (SRW "seishin") ----------

export const SPIRITS: Record<SpiritId, SpiritDef> = {
  focus: { id: 'focus', name: 'Focus', cost: 15, desc: 'Evade +30% until end of enemy phase' },
  strike: { id: 'strike', name: 'Strike', cost: 20, desc: 'Next attack always hits' },
  valor: { id: 'valor', name: 'Valor', cost: 40, desc: 'Next attack damage x1.5' },
  grit: { id: 'grit', name: 'Grit', cost: 15, desc: 'Armor +400 until end of enemy phase' },
  guard: { id: 'guard', name: 'Guard', cost: 20, desc: 'Incoming damage halved until end of enemy phase' },
  accel: { id: 'accel', name: 'Accel', cost: 10, desc: 'Move +3 this turn' },
  flash: { id: 'flash', name: 'Flash', cost: 25, desc: 'Auto-dodge the next enemy attack' },
  snipe: { id: 'snipe', name: 'Snipe', cost: 20, desc: 'Next attack range +2' },
  zeal: { id: 'zeal', name: 'Zeal', cost: 10, desc: 'Will +15 (self)' },
  rouse: { id: 'rouse', name: 'Rouse', cost: 25, desc: 'Will +10 to allies within 2 tiles' },
  disrupt: { id: 'disrupt', name: 'Disrupt', cost: 25, desc: 'Will -10 to enemies within 2 tiles' },
  bless: { id: 'bless', name: 'Bless', cost: 25, desc: 'Restore 40% HP (self)' },
  vigor: { id: 'vigor', name: 'Vigor', cost: 20, desc: 'Restore +40 EN (self)' },
  roar: { id: 'roar', name: 'Roar', cost: 15, desc: 'Will +20 (self)' },
  fortune: { id: 'fortune', name: 'Fortune', cost: 30, desc: 'Next attack grants double EXP' },
  soul: { id: 'soul', name: 'Soul', cost: 60, desc: 'Next attack damage x2' },
  trust: { id: 'trust', name: 'Trust', cost: 25, desc: 'Heal the most wounded ally within 2 tiles for 30% HP' },
};

// ---------- Pilot traits (passives, resolved in the combat engine) ----------

export const TRAITS: Record<TraitId, { name: string; desc: string }> = {
  ace_instinct: { name: 'Ace Instinct', desc: '+12% damage when Will is 130 or higher' },
  deadeye: { name: 'Deadeye', desc: '+8% hit chance on all attacks' },
  siege_breaker: { name: 'Siege Breaker', desc: '+15% damage against bosses and elite units' },
  field_medic: { name: 'Field Medic', desc: 'REPAIR restores +50% more HP' },
  crimson_fury: { name: 'Crimson Fury', desc: '+10% damage and +8% hit while under 50% HP' },
  falcon_wing: { name: 'Falcon Wing', desc: '+10% hit chance against air units' },
  sovereign: { name: 'Sovereign', desc: '+8% damage at all times' },
};

// ---------- Weapons ----------

const W = (w: WeaponDef) => w;

export const WEAPONS = {
  beamSaber: W({ id: 'beam_saber', name: 'Beam Saber', kind: 'melee', power: 2300, rangeMin: 1, rangeMax: 1, enCost: 5, ammo: null, hitMod: 15, postMove: true, animSeed: 1 }),
  photonRifle: W({ id: 'photon_rifle', name: 'Photon Rifle', kind: 'beam', power: 1800, rangeMin: 1, rangeMax: 5, enCost: 10, ammo: null, hitMod: 5, postMove: true, animSeed: 2 }),
  missilePods: W({ id: 'missile_pods', name: 'Missile Pods', kind: 'missile', power: 1500, rangeMin: 2, rangeMax: 6, enCost: 0, ammo: 8, hitMod: -5, postMove: true, animSeed: 3 }),
  gatling: W({ id: 'gatling', name: 'Arm Gatling', kind: 'gun', power: 1200, rangeMin: 1, rangeMax: 3, enCost: 0, ammo: 20, hitMod: 10, postMove: true, animSeed: 4 }),
  plasmaEdge: W({ id: 'plasma_edge', name: 'Plasma Edge', kind: 'melee', power: 2900, rangeMin: 1, rangeMax: 2, enCost: 15, ammo: null, hitMod: 10, postMove: true, animSeed: 5 }),
  megaBeam: W({ id: 'mega_beam', name: 'Mega Beam Launcher', kind: 'beam', power: 3400, rangeMin: 3, rangeMax: 7, enCost: 40, ammo: null, hitMod: -15, postMove: false, animSeed: 6, willReq: 115 }),
  vulcan: W({ id: 'vulcan', name: 'Head Vulcan', kind: 'gun', power: 800, rangeMin: 1, rangeMax: 2, enCost: 0, ammo: 30, hitMod: 25, postMove: true, animSeed: 7 }),
  railgun: W({ id: 'railgun', name: 'Linear Railgun', kind: 'gun', power: 2600, rangeMin: 2, rangeMax: 6, enCost: 20, ammo: 10, hitMod: 0, postMove: true, animSeed: 8 }),
  heatRod: W({ id: 'heat_rod', name: 'Heat Rod', kind: 'melee', power: 2100, rangeMin: 1, rangeMax: 2, enCost: 8, ammo: null, hitMod: 10, postMove: true, animSeed: 9 }),
  chestBlaster: W({ id: 'chest_blaster', name: 'Chest Blaster', kind: 'beam', power: 3100, rangeMin: 1, rangeMax: 4, enCost: 30, ammo: null, hitMod: -5, postMove: false, animSeed: 10, willReq: 115 }),
  mapBuster: W({ id: 'map_buster', name: 'MAP: Buster Mortar', kind: 'missile', power: 2200, rangeMin: 2, rangeMax: 5, enCost: 0, ammo: 3, hitMod: -10, postMove: false, animSeed: 14, willReq: 110, mapRange: 1 }),
  punch: W({ id: 'punch', name: 'Rocket Punch', kind: 'melee', power: 1900, rangeMin: 1, rangeMax: 3, enCost: 10, ammo: null, hitMod: 10, postMove: true, animSeed: 11 }),
  drillLancer: W({ id: 'drill_lancer', name: 'Drill Lancer', kind: 'melee', power: 2700, rangeMin: 1, rangeMax: 1, enCost: 12, ammo: null, hitMod: 5, postMove: true, animSeed: 12 }),
  funnelArray: W({ id: 'funnel_array', name: 'Funnel Array', kind: 'funnel', power: 2800, rangeMin: 2, rangeMax: 6, enCost: 25, ammo: null, hitMod: 10, postMove: false, animSeed: 13, willReq: 115 }),
  // combination attacks — need the partner unit standing adjacent & unacted
  twinBreaker: W({ id: 'twin_breaker', name: 'Twin Breaker', kind: 'melee', power: 4300, rangeMin: 1, rangeMax: 2, enCost: 25, ammo: null, hitMod: 30, postMove: true, animSeed: 15, willReq: 110, comboPartner: 'gruntborg' }),
  twinBarrage: W({ id: 'twin_barrage', name: 'Twin Barrage', kind: 'beam', power: 4500, rangeMin: 2, rangeMax: 6, enCost: 30, ammo: null, hitMod: 25, postMove: false, animSeed: 16, willReq: 115, comboPartner: 'zephyra' }),
  crimsonDuet: W({ id: 'crimson_duet', name: 'Crimson Duet', kind: 'melee', power: 4600, rangeMin: 1, rangeMax: 3, enCost: 30, ammo: null, hitMod: 28, postMove: true, animSeed: 17, willReq: 110, comboPartner: 'vexiaX' }),
  // v1.8 hero weapons — one extra trick per mech
  arcCannon: W({ id: 'arc_cannon', name: 'Arc Cannon', kind: 'beam', power: 3200, rangeMin: 2, rangeMax: 5, enCost: 28, ammo: null, hitMod: 5, postMove: false, animSeed: 17, willReq: 105 }),
  thermoCharge: W({ id: 'thermo_charge', name: 'Thermobaric Charge', kind: 'missile', power: 3600, rangeMin: 1, rangeMax: 3, enCost: 0, ammo: 4, hitMod: 0, postMove: false, animSeed: 18, willReq: 110 }),
  railVolley: W({ id: 'rail_volley', name: 'Railgun Volley', kind: 'gun', power: 2000, rangeMin: 1, rangeMax: 4, enCost: 0, ammo: 12, hitMod: 15, postMove: true, animSeed: 19 }),
  flareField: W({ id: 'flare_field', name: 'Flare Field', kind: 'funnel', power: 2400, rangeMin: 1, rangeMax: 4, enCost: 20, ammo: null, hitMod: 15, postMove: true, animSeed: 20 }),
  militiaRifle: W({ id: 'militia_rifle', name: 'Defense Rifle', kind: 'gun', power: 1500, rangeMin: 1, rangeMax: 4, enCost: 0, ammo: 12, hitMod: 8, postMove: true, animSeed: 21 }),
};

// ---------- Pilots ----------

const P = (p: PilotDef) => p;

export const PILOTS = {
  ray: P({ name: 'Ray Ardent', callsign: 'X-1', melee: 68, ranged: 74, defense: 60, evade: 72, maxSp: 60, spirits: ['strike', 'valor', 'focus', 'accel', 'zeal', 'roar', 'soul'], faceColor: '#ffb347', trait: 'ace_instinct' }),
  mira: P({ name: 'Mira Solen', callsign: 'X-2', melee: 55, ranged: 80, defense: 55, evade: 78, maxSp: 55, spirits: ['focus', 'strike', 'accel', 'snipe', 'rouse', 'fortune', 'trust'], faceColor: '#7ee7ff', trait: 'deadeye' }),
  gara: P({ name: 'Gara Dune', callsign: 'Y-1', melee: 78, ranged: 60, defense: 74, evade: 58, maxSp: 50, spirits: ['grit', 'valor', 'guard', 'vigor'], faceColor: '#ff9d9d', trait: 'siege_breaker' }),
  orin: P({ name: 'Orin Vale', callsign: 'Z-1', melee: 62, ranged: 70, defense: 66, evade: 66, maxSp: 65, spirits: ['guard', 'focus', 'valor', 'flash', 'disrupt', 'bless'], faceColor: '#b6ff9d', trait: 'field_medic' }),
  karg: P({ name: 'Col. Karg Draven', callsign: 'BOSS', melee: 75, ranged: 75, defense: 70, evade: 65, maxSp: 70, spirits: ['valor', 'strike'], faceColor: '#d0a0ff' }),
  grunt: P({ name: 'Soldier', callsign: 'GR', melee: 56, ranged: 56, defense: 52, evade: 52, maxSp: 30, spirits: [], faceColor: '#bbbbbb' }),
  civ: P({ name: 'Convoy Crew', callsign: 'CVY', melee: 40, ranged: 40, defense: 40, evade: 40, maxSp: 0, spirits: [], faceColor: '#c8b090' }),
  militia: P({ name: 'Ark Militia', callsign: 'DEF', melee: 55, ranged: 60, defense: 58, evade: 55, maxSp: 0, spirits: [], faceColor: '#8fb8dd' }),
};

// ---------- Units (original mecha, 3 factions X / Y / Z) ----------

const U = (u: UnitDef) => u;

export const UNITS: Record<string, UnitDef> = {
  // --- player squad ---
  valstray: U({ id: 'valstray', name: 'Valstray', title: 'X-Face Vanguard', color: '#2f6fd0', accent: '#9fd0ff', maxHp: 5800, maxEn: 140, armor: 1050, mobility: 118, moveRange: 6, moveType: 'land', weapons: [WEAPONS.beamSaber, WEAPONS.photonRifle, WEAPONS.missilePods, WEAPONS.twinBreaker, WEAPONS.arcCannon], pilot: PILOTS.ray }),
  arielis: U({ id: 'arielis', name: 'Arielis', title: 'X-Face Sniper', color: '#38b6c9', accent: '#c8f6ff', maxHp: 4600, maxEn: 160, armor: 900, mobility: 132, moveRange: 7, moveType: 'air', weapons: [WEAPONS.megaBeam, WEAPONS.photonRifle, WEAPONS.vulcan, WEAPONS.twinBarrage, WEAPONS.railVolley], pilot: PILOTS.mira }),
  gruntborg: U({ id: 'gruntborg', name: 'Grunborg', title: 'Y-Face Heavy', color: '#c94f4f', accent: '#ffd0c0', maxHp: 7200, maxEn: 110, armor: 1400, mobility: 92, moveRange: 5, moveType: 'land', weapons: [WEAPONS.drillLancer, WEAPONS.railgun, WEAPONS.gatling, WEAPONS.mapBuster, WEAPONS.thermoCharge], pilot: PILOTS.gara }),
  zephyra: U({ id: 'zephyra', name: 'Zephyra', title: 'Z-Face Duelist', color: '#5fbf62', accent: '#d8ffd8', maxHp: 5400, maxEn: 150, armor: 1000, mobility: 126, moveRange: 6, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.chestBlaster, WEAPONS.vulcan, WEAPONS.flareField], pilot: PILOTS.orin, repairer: true }),
  // --- enemy ---
  zolda: U({ id: 'zolda', name: 'Zolda', title: 'Imperial Mass Unit', color: '#6b6f7a', accent: '#c9ccd6', maxHp: 3800, maxEn: 100, armor: 850, mobility: 88, moveRange: 5, moveType: 'land', weapons: [WEAPONS.gatling, WEAPONS.heatRod], pilot: PILOTS.grunt }),
  zoldaAir: U({ id: 'zolda_air', name: 'Zolda Flyer', title: 'Imperial Air Unit', color: '#7a6b6f', accent: '#d6c9cc', maxHp: 3400, maxEn: 110, armor: 700, mobility: 104, moveRange: 7, moveType: 'air', weapons: [WEAPONS.missilePods, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  kargan: U({ id: 'kargan', name: 'Kargan Rex', title: 'Imperial Ace', color: '#8a2fbe', accent: '#e0b3ff', maxHp: 8600, maxEn: 170, armor: 1250, mobility: 124, moveRange: 6, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.funnelArray, WEAPONS.chestBlaster], pilot: PILOTS.karg, boss: true, level: 5 }),
  arkmilitia: U({ id: 'arkmilitia', name: 'Ark Militia', title: 'Colony Defender', color: '#3e4a5a', accent: '#8fb8dd', maxHp: 3800, maxEn: 80, armor: 420, mobility: 62, moveRange: 4, moveType: 'land', weapons: [WEAPONS.militiaRifle], pilot: PILOTS.militia }),
};

// ---------- Terrain table ----------

export interface TerrainInfo {
  name: string;
  def: number;
  eva: number;
  moveCost: { land: number; air: number };
  passable: { land: boolean; air: boolean };
  hpRegen?: number; // fraction of maxHp restored at phase start
  enRegen?: number; // extra EN restored at phase start
  hpDmg?: number; // fraction of maxHp lost per phase while standing on it
  color: string;
  glyph: string;
}

export const TERRAIN_INFO: Record<Terrain, TerrainInfo> = {
  plain: { name: 'Plains', def: 0, eva: 0, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, color: '#3d5a3d', glyph: '' },
  road: { name: 'Road', def: 0, eva: -5, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, color: '#5a5348', glyph: '═' },
  forest: { name: 'Forest', def: 100, eva: 15, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#1f4d2a', glyph: '♣' },
  mountain: { name: 'Mountain', def: 150, eva: 20, moveCost: { land: 3, air: 1 }, passable: { land: true, air: true }, color: '#5c4a3a', glyph: '▲' },
  water: { name: 'Water', def: 0, eva: 0, moveCost: { land: 99, air: 1 }, passable: { land: false, air: true }, color: '#1e3f66', glyph: '≈' },
  city: { name: 'City', def: 200, eva: -10, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, hpRegen: 0.08, enRegen: 8, color: '#4a4a58', glyph: '▦' },
  base: { name: 'Base', def: 250, eva: 0, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, hpRegen: 0.12, enRegen: 10, color: '#584a6e', glyph: '⌂' },
  void: { name: 'Void', def: 0, eva: 10, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, color: '#141428', glyph: '·' },
  moon: { name: 'Moon Surface', def: 50, eva: 5, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#555560', glyph: '◌' },
  desert: { name: 'Desert', def: -50, eva: -10, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#8a7a4a', glyph: '∴' },
  snow: { name: 'Snowfield', def: 30, eva: 5, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#b8c4d0', glyph: '❄' },
  lava: { name: 'Lava Field', def: 0, eva: 0, moveCost: { land: 3, air: 1 }, passable: { land: true, air: true }, hpDmg: 0.08, color: '#8a2a12', glyph: '♨' },
  ruins: { name: 'Ruins', def: 180, eva: 10, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#4a4456', glyph: '▤' },
};

// ---------- Mission SSS: "Steel Sky Siege" ----------

// prettier-ignore
const T: Terrain[][] = [
  // 0        1        2        3        4        5        6        7        8        9        10       11       12       13
  ['mountain','mountain','plain','plain','forest','plain','plain','plain','plain','plain','forest','plain','plain','plain'],   // 0
  ['mountain','plain','plain','forest','forest','plain','road','road','road','plain','plain','plain','plain','water'],      // 1
  ['plain','plain','plain','plain','forest','plain','road','plain','road','plain','plain','city','plain','water'],          // 2
  ['plain','city','road','road','road','road','road','plain','road','road','road','city','plain','water'],                  // 3
  ['plain','plain','plain','plain','forest','plain','road','plain','road','plain','forest','plain','plain','water'],        // 4
  ['water','plain','plain','forest','forest','plain','road','plain','plain','plain','forest','mountain','plain','water'],   // 5
  ['water','water','plain','plain','plain','plain','road','plain','city','plain','plain','mountain','plain','plain'],       // 6
  ['plain','plain','plain','city','plain','forest','road','road','road','road','plain','plain','plain','plain'],            // 7
  ['plain','base','plain','city','plain','forest','plain','plain','plain','road','plain','plain','city','plain'],           // 8
  ['plain','plain','plain','plain','plain','plain','plain','forest','plain','road','road','road','road','plain'],           // 9
];

export const MISSION_SSS: MapDef = {
  id: 'sss',
  name: 'MISSION SSS',
  subtitle: 'Steel Sky Siege',
  cols: 14,
  rows: 10,
  terrain: T,
  objective: 'Defeat all Imperial units. Ace pilot Col. Karg Draven commands the Kargan Rex — bring him down.',
  playerSpawns: [
    { defId: 'valstray', pos: { x: 1, y: 8 } },
    { defId: 'gruntborg', pos: { x: 3, y: 9 } },
    { defId: 'arielis', pos: { x: 4, y: 8 } },
    { defId: 'zephyra', pos: { x: 2, y: 9 } },
  ],
  enemySpawns: [
    { defId: 'zolda', pos: { x: 11, y: 2 } },
    { defId: 'zolda', pos: { x: 12, y: 3 } },
    { defId: 'zoldaAir', pos: { x: 10, y: 1 } },
    { defId: 'zoldaAir', pos: { x: 12, y: 5 } },
    { defId: 'zolda', pos: { x: 11, y: 4 } },
    { defId: 'kargan', pos: { x: 12, y: 1 } }, // far corner + boss hold: not attackable turn 1
  ],
  bossHoldUntil: 3, // Kargan Rex holds position until turn 3
  reinforce: { turn: 4, comp: ['zolda', 'zolda', 'zoldaAir'] },
};
