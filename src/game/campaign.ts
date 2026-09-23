import chaptersJson from './chapters.json';
import { PILOTS, UNITS, WEAPONS, TERRAIN_INFO, MISSION_SSS } from './data';
import { MapDef, PartDef, PilotDef, PilotSkillId, Pos, SpiritId, Terrain, UnitDef } from './types';

// ---------- Items (usable in battle, bought at merchant) ----------

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  apply: 'hp' | 'en' | 'ammo' | 'sp' | 'valor';
  amount: number;
}

export const ITEMS: Record<string, ItemDef> = {
  repairKit: { id: 'repairKit', name: 'Repair Kit', desc: 'Restore 3000 HP', price: 400, apply: 'hp', amount: 3000 },
  megaKit: { id: 'megaKit', name: 'Mega Repair Kit', desc: 'Restore full HP', price: 900, apply: 'hp', amount: 99999 },
  enCell: { id: 'enCell', name: 'EN Cell', desc: 'Restore 80 EN', price: 350, apply: 'en', amount: 80 },
  ammoBox: { id: 'ammoBox', name: 'Ammo Box', desc: 'Refill all weapon ammo', price: 300, apply: 'ammo', amount: 0 },
  spiritWing: { id: 'spiritWing', name: 'Spirit Wing', desc: 'Restore 40 SP', price: 500, apply: 'sp', amount: 40 },
  valorPill: { id: 'valorPill', name: 'Valor Pill', desc: 'Next attack damage x1.5', price: 600, apply: 'valor', amount: 0 },
};

export type ItemId = keyof typeof ITEMS;

// ---------- Enhancement parts (workshop — equip up to MAX_PART_SLOTS per mecha) ----------

export const MAX_PART_SLOTS = 2;

export const PARTS: Record<string, PartDef> = {
  sparePlate: { id: 'sparePlate', name: 'Spare Plating', desc: '+800 max HP', price: 600, hp: 800 },
  servoArm: { id: 'servoArm', name: 'Servo Armor', desc: '+80 armor', price: 800, armor: 80 },
  vernier: { id: 'vernier', name: 'Vernier Thrusters', desc: '+8 mobility', price: 700, mobility: 8 },
  teslaDrive: { id: 'teslaDrive', name: 'Tesla Drive', desc: '+1 move range', price: 1500, move: 1 },
  aimScope: { id: 'aimScope', name: 'Targeting Scope', desc: '+8% hit chance', price: 900, hit: 8 },
  reflexChip: { id: 'reflexChip', name: 'Reflex Chip', desc: '+6% evade', price: 850, evade: 6 },
  overcharger: { id: 'overcharger', name: 'Overcharger', desc: '+8% weapon damage', price: 1200, dmg: 8 },
  batteryPack: { id: 'batteryPack', name: 'Battery Pack', desc: '+30 max EN', price: 550, en: 30 },
  afterburner: { id: 'afterburner', name: 'Afterburner Core', desc: 'attack again after destroying a target (once/turn)', price: 2400, again: true },
  veteranPlate: { id: 'veteranPlate', name: 'Veteran Plate', desc: '+120 armor · +6 mobility — S-rank award', price: 3000, armor: 120, mobility: 6 },
};

export type PartId = keyof typeof PARTS;

// ---------- Pilot skill points (PP — earned per kill/level, spent in workshop PILOTS tab) ----------

export interface PilotStatDef {
  id: PilotSkillId;
  name: string;
  desc: string;
}

export const PILOT_STATS: PilotStatDef[] = [
  { id: 'hit', name: 'Precision', desc: '+1% hit chance per point' },
  { id: 'evade', name: 'Reflexes', desc: '+1% evade per point' },
  { id: 'dmg', name: 'Firepower', desc: '+1.5% damage per point' },
  { id: 'def', name: 'Endurance', desc: '-1.5% damage taken per point' },
];

export const MAX_PILOT_SKILL = 20;

// ---------- Upgrades (hangar; per unit defId, per stat level) ----------

export interface UpgradeStat {
  id: 'hp' | 'en' | 'armor' | 'mobility';
  name: string;
  desc: string;
  per: number; // flat amount per level
  cost: (lvl: number) => number;
}

export const UPGRADE_STATS: UpgradeStat[] = [
  { id: 'hp', name: 'Hull Plating', desc: '+400 max HP per level', per: 400, cost: (l) => 300 + l * 220 },
  { id: 'en', name: 'Reactor Output', desc: '+15 max EN per level', per: 15, cost: (l) => 250 + l * 180 },
  { id: 'armor', name: 'Composite Armor', desc: '+90 armor per level', per: 90, cost: (l) => 320 + l * 240 },
  { id: 'mobility', name: 'Servo Tuning', desc: '+6 mobility per level', per: 6, cost: (l) => 320 + l * 240 },
];

export const MAX_UPGRADE_LEVEL = 8;

export type UpgradeMap = Record<string, Record<string, number>>; // defId -> statId -> level

export function upgradedStat(def: UnitDef, stat: UpgradeStat['id'], up: UpgradeMap): number {
  const lvl = up[def.id]?.[stat] ?? 0;
  const per = UPGRADE_STATS.find((s) => s.id === stat)!.per;
  const base = stat === 'hp' ? def.maxHp : stat === 'en' ? def.maxEn : stat === 'armor' ? def.armor : def.mobility;
  return base + lvl * per;
}

// ---------- New pilots & units (campaign) ----------

const P = (p: PilotDef) => p;
const U = (u: UnitDef) => u;

export const CAMPAIGN_PILOTS = {
  raxp: P({ name: 'Cap. Rax Daver', callsign: 'RED', melee: 66, ranged: 62, defense: 62, evade: 60, maxSp: 55, spirits: ['valor', 'strike'], faceColor: '#ff7a7a', trait: 'crimson_fury', lastWords: 'Heh... not bad, Ardent. The throne... is yours to storm.', killQuip: 'Your courage deserved a better machine.' }),
  moorinp: P({ name: 'Gen. Moorin', callsign: 'GEN', melee: 72, ranged: 70, defense: 78, evade: 52, maxSp: 70, spirits: ['grit', 'guard', 'strike'], faceColor: '#a8b8a0', trait: 'rally', lastWords: 'The Empire does not fall with me... it only grows quieter.', killQuip: 'This is what defiance costs.' }),
  serkap: P({ name: 'Void Empress Serka', callsign: 'EMP', melee: 74, ranged: 82, defense: 66, evade: 80, maxSp: 75, spirits: ['strike', 'valor', 'focus'], faceColor: '#d8a0ff', lastWords: 'Beautiful... to the void we all return.', killQuip: 'Hush now. The void was always calling.' }),
  veep: P({ name: 'Lt. Vee Corrin', callsign: 'FALCON', melee: 58, ranged: 79, defense: 60, evade: 84, maxSp: 58, spirits: ['focus', 'strike', 'accel'], faceColor: '#8ef0e8', trait: 'falcon_wing' }),
  bramp: P({ name: 'Warden Bram', callsign: 'GATE', melee: 80, ranged: 55, defense: 82, evade: 50, maxSp: 60, spirits: ['grit', 'guard'], faceColor: '#c8a878', trait: 'rally', lastWords: 'The gate... opens for no one now.', killQuip: 'None pass the gate. None.' }),
  // recurring rival ace — hunts the squad across the war, always comes back for a rematch
  vossen: P({ name: 'Cpt. Vossen', callsign: 'ACE', melee: 74, ranged: 78, defense: 72, evade: 76, maxSp: 65, spirits: ['focus', 'strike', 'grit'], faceColor: '#ff6a5a', trait: 'ace_instinct', lastWords: 'A draw today, Ardent. The Drake flies again.', killQuip: 'Too slow. The Drake does not wait.' }),
  vaelp: P({ name: 'Emperor Vael', callsign: 'THRONE', melee: 82, ranged: 84, defense: 76, evade: 72, maxSp: 90, spirits: ['strike', 'valor', 'focus', 'guard'], faceColor: '#ffe08a', trait: 'sovereign', lastWords: 'Impossible... I AM the Throne—', killQuip: 'Kneel before the Throne — or break.' }),
};

// merged pilot lookup (unit.def.pilot stays typed as PilotDef)
export const CAMPAIGN_UNITS: Record<string, UnitDef> = {
  zoldaTank: U({ id: 'zoldaTank', name: 'Zolda Bastion', title: 'Imperial Heavy', color: '#5c6b52', accent: '#b8c4a8', maxHp: 5200, maxEn: 90, armor: 1300, mobility: 70, moveRange: 4, moveType: 'land', weapons: [WEAPONS.railgun, WEAPONS.heatRod], pilot: PILOTS.grunt }),
  vexia: U({ id: 'vexia', name: 'Vexia', title: 'Imperial Interceptor', color: '#4a6b8a', accent: '#c0e0ff', maxHp: 4400, maxEn: 130, armor: 800, mobility: 138, moveRange: 7, moveType: 'air', weapons: [WEAPONS.photonRifle, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  nightmare: U({ id: 'nightmare', name: 'Nightmare', title: 'Royal Guard', color: '#5a2f3a', accent: '#ffb0c0', maxHp: 6800, maxEn: 140, armor: 1150, mobility: 122, moveRange: 6, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.missilePods, WEAPONS.stasisRay], pilot: PILOTS.grunt }),
  raxden: U({ id: 'raxden', name: 'Raxden Crimson', title: 'Custom Ace', color: '#a02828', accent: '#ffb080', maxHp: 7800, maxEn: 150, armor: 1100, mobility: 116, moveRange: 6, moveType: 'land', weapons: [WEAPONS.plasmaEdge, WEAPONS.railgun, WEAPONS.vulcan], pilot: CAMPAIGN_PILOTS.raxp, boss: true }),
  moorin: U({ id: 'moorin', name: 'Moorin Anvil', title: 'Imperial General', color: '#4a5a48', accent: '#d0e0c0', maxHp: 9800, maxEn: 160, armor: 1500, mobility: 96, moveRange: 5, moveType: 'land', weapons: [WEAPONS.megaBeam, WEAPONS.gatling, WEAPONS.punch], pilot: CAMPAIGN_PILOTS.moorinp, boss: true }),
  serka: U({ id: 'serka', name: 'Serka Vanta', title: 'Void Empress', color: '#5a2f6e', accent: '#e0b8ff', maxHp: 8200, maxEn: 190, armor: 1000, mobility: 140, moveRange: 7, moveType: 'air', weapons: [WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.serkap, boss: true }),
  empress: U({ id: 'empress', name: 'Empress Ascendant', title: 'True Void Form', color: '#7a3f8e', accent: '#ffe0ff', maxHp: 11000, maxEn: 220, armor: 1250, mobility: 146, moveRange: 7, moveType: 'air', weapons: [WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.chestBlaster], pilot: CAMPAIGN_PILOTS.serkap, boss: true, resists: { beam: 0.3, funnel: 0.3 } }),
  warden: U({ id: 'warden', name: 'Gate Warden', title: 'Ancient Guardian', color: '#7a5a30', accent: '#ffe0a8', maxHp: 12000, maxEn: 140, armor: 1600, mobility: 90, moveRange: 4, moveType: 'land', weapons: [WEAPONS.drillLancer, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.bramp, boss: true }),
  emperor: U({ id: 'emperor', name: 'Throne of Vael', title: 'The Emperor', color: '#e8d8a0', accent: '#fff8d8', maxHp: 15000, maxEn: 240, armor: 1500, mobility: 130, moveRange: 6, moveType: 'air', weapons: [WEAPONS.chestBlaster, WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.vaelp, boss: true }),
  // --- late-wave line frames ---
  lancer: U({ id: 'lancer', name: 'Wolfen Lance', title: 'Strike Cavalry', color: '#4a3a2e', accent: '#ff9060', maxHp: 3600, maxEn: 120, armor: 700, mobility: 150, moveRange: 7, moveType: 'land', weapons: [WEAPONS.drillLancer, WEAPONS.plasmaEdge, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  bulwark: U({ id: 'bulwark', name: 'Rampart Bulwark', title: 'Siege Anchor', color: '#3a4438', accent: '#ffe060', maxHp: 8200, maxEn: 80, armor: 1700, mobility: 55, moveRange: 3, moveType: 'land', weapons: [WEAPONS.gatling, WEAPONS.heatRod, WEAPONS.vampEdge], pilot: PILOTS.grunt, resists: { gun: 0.3, missile: 0.3, melee: 0.25 } }),
  // unarmed civilian convoy — escort objective on protect chapters
  arklander: U({ id: 'arklander', name: 'Arklander Convoy', title: 'Civilian Transport', color: '#5a5148', accent: '#e0d0a8', maxHp: 3400, maxEn: 0, armor: 350, mobility: 40, moveRange: 0, moveType: 'land', weapons: [], pilot: PILOTS.civ }),
  // --- player reinforcements (join at arc boundaries) ---
  raxdenR: U({ id: 'raxdenR', name: 'Raxden Crimson', title: 'Defected Ace', color: '#a02828', accent: '#ffb080', maxHp: 7800, maxEn: 150, armor: 1100, mobility: 116, moveRange: 6, moveType: 'land', weapons: [WEAPONS.plasmaEdge, WEAPONS.railgun, WEAPONS.vulcan, WEAPONS.crimsonDuet], pilot: CAMPAIGN_PILOTS.raxp, level: 5 }),
  vexiaX: U({ id: 'vexiaX', name: 'Vexia Custom', title: 'Ark Interceptor', color: '#2a8a9a', accent: '#a0f0ff', maxHp: 5200, maxEn: 150, armor: 880, mobility: 142, moveRange: 7, moveType: 'air', weapons: [WEAPONS.photonRifle, WEAPONS.missilePods, WEAPONS.vulcan, WEAPONS.voidLance], pilot: CAMPAIGN_PILOTS.veep, level: 7 }),
  // act-3 fast striker — drains HP on hit, high evade, hunts stragglers
  cataphract: U({ id: 'cataphract', name: 'Karn Cataphract', title: 'Shadow Striker', color: '#2e2e3a', accent: '#a0a0ff', maxHp: 4200, maxEn: 120, armor: 650, mobility: 158, moveRange: 8, moveType: 'air', weapons: [WEAPONS.vampEdge, WEAPONS.plasmaEdge], pilot: PILOTS.grunt, resists: { beam: 0.4 } }),
  // Cpt. Vossen's personal frame — recurring ace, guaranteed salvage drop when downed
  vossDrake: U({ id: 'vossDrake', name: 'Drake Eclipse', title: 'Rival Ace', color: '#3a2030', accent: '#ff6a5a', maxHp: 9800, maxEn: 160, armor: 1350, mobility: 150, moveRange: 7, moveType: 'air', weapons: [WEAPONS.megaBeam, WEAPONS.plasmaEdge, WEAPONS.missilePods], pilot: CAMPAIGN_PILOTS.vossen, boss: true, level: 8 }),
  // unarmed loot hauler — flees the east edge on carrier missions; big salvage when downed
  cargoMule: U({ id: 'cargoMule', name: 'Supply Mule', title: 'Loot Carrier', color: '#4a4030', accent: '#ffe8a0', maxHp: 14000, maxEn: 0, armor: 500, mobility: 70, moveRange: 3, moveType: 'land', weapons: [], pilot: PILOTS.grunt, carrier: true }),
};

export const ALL_UNITS: Record<string, UnitDef> = { ...UNITS, ...CAMPAIGN_UNITS };

export const PLAYER_DEF_IDS = ['valstray', 'gruntborg', 'arielis', 'zephyra'];

/** Units the player owns at a given chapter — reinforcements join at arc boundaries. */
export function rosterFor(ch: ChapterDef): string[] {
  const n = ch.rosterCh ?? ch.id;
  const r = [...PLAYER_DEF_IDS];
  if (n >= 11) r.push('raxdenR');
  if (n >= 21) r.push('vexiaX');
  return r;
}

export const MAX_SQUAD = 6;

/** Career-kill milestones: pilots learn bonus spirits as their legend grows. */
export const MILESTONE_SPIRITS: Record<string, { kills: number; spirit: SpiritId }[]> = {
  valstray: [
    { kills: 15, spirit: 'flash' },
    { kills: 35, spirit: 'fortune' },
  ],
  gruntborg: [
    { kills: 15, spirit: 'zeal' },
    { kills: 35, spirit: 'bless' },
  ],
  arielis: [
    { kills: 15, spirit: 'zeal' },
    { kills: 35, spirit: 'soul' },
  ],
  zephyra: [
    { kills: 15, spirit: 'trust' },
    { kills: 35, spirit: 'zeal' },
  ],
  raxdenR: [
    { kills: 15, spirit: 'roar' },
    { kills: 35, spirit: 'soul' },
  ],
  vexiaX: [
    { kills: 15, spirit: 'rouse' },
    { kills: 35, spirit: 'fortune' },
  ],
};

// ---------- Weapon upgrades (workshop tab) ----------

export const MAX_WEAPON_UPG = 5;
export const WEAPON_UPG_POWER = 0.08; // +8% per level
export const weaponUpgCost = (lvl: number) => 400 + lvl * 350;
export type WeaponUpgMap = Record<string, Record<string, number>>; // defId -> weaponId -> level

// ---------- Chapters ----------

export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  act: 1 | 2 | 3;
  theme: string;
  lvl: number;
  count: number;
  boss?: string;
  bossLevel?: number;
  objectiveType?: 'rout' | 'survive' | 'boss' | 'protect' | 'seize' | 'reach';
  surviveTurns?: number;
  /** rout/boss/seize/reach only: defeat if the objective isn't met by this turn */
  turnLimit?: number;
  /** hero clause: if a unit with this def id sorties and is destroyed, the mission fails */
  requiredDefId?: string;
  /** protect missions: turns the NPC convoy must stay alive */
  protectTurns?: number;
  /** seize missions: beacon tile a player unit must occupy to win (filled by genMap) */
  seizePos?: Pos;
  /** reach missions: extraction tile a player unit must reach to win (filled by genMap) */
  reachPos?: Pos;
  objective: string;
  /** SRW-point style bonus challenge — award credits when the mission ends meeting it */
  mastery?: { desc: string; maxTurns?: number; keepAll?: boolean; rewardCr: number };
  lines: { speaker: string; text: string; voice?: string }[];
  /** overrides roster gating (used by side missions whose ids are off-chapter) */
  rosterCh?: number;
  /** route variants: elite promotion chance override (default 0.15) */
  eliteChance?: number;
  /** route variant: force every non-boss spawn elite */
  eliteAll?: boolean;
  /** route variant: flat bonus credits on victory */
  rewardBonus?: number;
  /** route variant: item granted on victory */
  bonusItem?: ItemId;
  /** route flavor tag shown under the chapter name */
  routeTag?: string;
  /** VR simulator run — routing a wave spawns the next one; defeat settles the score */
  sim?: boolean;
  /** fog of war: enemy units are hidden until a player unit is within FOG_RANGE */
  fog?: boolean;
  /** a loot carrier spawns with the enemy force — kill it before it escapes east */
  carrier?: boolean;
}

export const CHAPTERS: ChapterDef[] = chaptersJson as unknown as ChapterDef[];

export function chapterOf(idx: number): ChapterDef {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, idx))];
}

// ---------- Route split (chosen after Chapter 15 — affects chapters 16-18) ----------

export type RouteId = 'a' | 'b';

export const ROUTE_INFO: Record<RouteId, { name: string; tagline: string; desc: string }> = {
  a: {
    name: 'ROUTE A — IRON VANGUARD',
    tagline: 'The frontal assault',
    desc: 'Lead the charge down the Throne corridor. Enemy patrols are heavier and elites more common — but the salvage is rich.\n\nCh.16–18: +1 enemy unit · elevated elite spawns · +700 credits per mission.',
  },
  b: {
    name: 'ROUTE B — GHOST LANCE',
    tagline: 'The silent approach',
    desc: 'Slip through the debris fields unseen. Fewer patrols guard this path, but every sentry is elite. Stealth pays in supplies.\n\nCh.16–18: −2 enemy units · more elite spawns · +400 credits + a Spirit Wing per mission · void-colony terrain.',
  },
};

/** Apply the player's route choice to a chapter. Only chapters 16-18 carry variants. */
export function applyRoute(ch: ChapterDef, route?: RouteId | null): ChapterDef {
  if (!route || ch.id < 16 || ch.id > 18) return ch;
  if (route === 'a') return { ...ch, count: ch.count + 1, eliteChance: 0.3, rewardBonus: 700, routeTag: ROUTE_INFO.a.name };
  const theme = ch.id === 18 ? 'colony' : 'void';
  return { ...ch, count: Math.max(4, ch.count - 2), theme, eliteChance: 0.4, rewardBonus: 400, bonusItem: 'spiritWing' as ItemId, routeTag: ROUTE_INFO.b.name };
}

/** The chapter as the player will actually face it — route variant applied. */
export function missionOf(idx: number, route?: RouteId | null): ChapterDef {
  return applyRoute(chapterOf(idx), route);
}

// ---------- Procedural map generation (14x10, theme-weighted, seeded) ----------

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEME_WEIGHTS: Record<string, [Terrain, number][]> = {
  earth: [['plain', 0.55], ['forest', 0.18], ['road', 0.12], ['mountain', 0.06], ['water', 0.05], ['city', 0.04]],
  forest: [['forest', 0.45], ['plain', 0.3], ['road', 0.08], ['mountain', 0.1], ['water', 0.07]],
  sea: [['plain', 0.4], ['water', 0.3], ['road', 0.1], ['city', 0.08], ['forest', 0.12]],
  city: [['city', 0.4], ['road', 0.18], ['plain', 0.28], ['forest', 0.08], ['base', 0.06]],
  mountain: [['mountain', 0.32], ['plain', 0.4], ['road', 0.1], ['forest', 0.14], ['water', 0.04]],
  base: [['base', 0.22], ['plain', 0.34], ['road', 0.2], ['city', 0.1], ['forest', 0.08], ['mountain', 0.06]],
  road: [['road', 0.2], ['plain', 0.44], ['water', 0.14], ['forest', 0.12], ['city', 0.06], ['mountain', 0.04]],
  void: [['void', 0.68], ['mountain', 0.14], ['base', 0.08], ['plain', 0.1]],
  colony: [['void', 0.36], ['city', 0.24], ['base', 0.12], ['plain', 0.14], ['road', 0.14]],
  moon: [['moon', 0.6], ['mountain', 0.18], ['base', 0.1], ['plain', 0.12]],
  fortress: [['base', 0.3], ['city', 0.22], ['road', 0.16], ['mountain', 0.12], ['plain', 0.2]],
  desert: [['desert', 0.55], ['plain', 0.16], ['mountain', 0.12], ['ruins', 0.09], ['road', 0.08]],
  snow: [['snow', 0.5], ['forest', 0.14], ['mountain', 0.14], ['plain', 0.14], ['water', 0.07]],
  volcano: [['plain', 0.28], ['lava', 0.24], ['mountain', 0.2], ['ruins', 0.12], ['desert', 0.1], ['road', 0.06]],
  ruins: [['ruins', 0.38], ['city', 0.12], ['road', 0.14], ['plain', 0.2], ['forest', 0.16]],
};

function pickTerrain(r: () => number, theme: string): Terrain {
  const w = THEME_WEIGHTS[theme] ?? THEME_WEIGHTS.earth;
  const roll = r();
  let acc = 0;
  for (const [t, p] of w) {
    acc += p;
    if (roll <= acc) return t;
  }
  return 'plain';
}

const PLAYER_SPAWNS: Pos[] = [
  { x: 1, y: 8 }, { x: 3, y: 9 }, { x: 4, y: 8 }, { x: 2, y: 9 }, { x: 0, y: 7 }, { x: 5, y: 9 },
];

/** Mid-battle enemy reinforcement waves keyed by chapter id — extra units storm in from the right edge. */
const REINFORCE: Record<number, { turn: number; comp: string[] }> = {
  7: { turn: 3, comp: ['zolda', 'zoldaAir', 'zolda'] },
  12: { turn: 3, comp: ['vexia', 'nightmare'] },
  14: { turn: 4, comp: ['vexia', 'vexia', 'nightmare'] },
  19: { turn: 3, comp: ['nightmare', 'zoldaTank'] },
  22: { turn: 4, comp: ['nightmare', 'nightmare'] },
  // p10 'Last Stand Ridge' patrol (side id 1017) — a second wave crests the pass mid-siege
  1017: { turn: 3, comp: ['zolda', 'zoldaAir', 'zoldaTank'] },
  26: { turn: 3, comp: ['nightmare', 'zoldaTank', 'nightmare'] },
  30: { turn: 2, comp: ['nightmare', 'nightmare'] },
};

/** Mid-battle story beats keyed by chapter id — dialog fires at the start of that player turn. */
const MID_EVENTS: Record<number, MapDef['events']> = {
  1: [{
    turn: 3,
    lines: [
      { speaker: 'kargan', text: 'So the Aegis pups finally crawled out. Every meter you advance is a meter of Imperial soil you bleed on.' },
      { speaker: 'valstray', text: 'You hear that, squad? He talks like a man who has never held a line. Push on — we end this today.' },
    ],
  }] as MapDef['events'],
  5: [{
    turn: 2,
    lines: [
      { speaker: 'raxden', text: 'Surrender, little Valstray. Your frame is scrap metal the moment I decide it is.' },
      { speaker: 'valstray', text: 'Raxden, is it? Come down here and say that to my face!' },
    ],
  }] as MapDef['events'],
  10: [{
    turn: 3,
    lines: [
      { speaker: 'vexia', text: 'Their formation is holding better than I expected. All units — tighten the ring, leave no gap.' },
      { speaker: 'arielis', text: 'Energy stores at 60% here. Ray, we finish them before they finish us — move!' },
    ],
  }] as MapDef['events'],
  15: [{
    turn: 3,
    lines: [
      { speaker: 'serka', text: 'You fight for a dying world, children. The Emperor offers a seat at the table — kneel, and live.' },
      { speaker: 'npc_captain', text: 'Do not answer her! The Ark does not kneel. Weapons free, all squadrons.' },
    ],
  }] as MapDef['events'],
  20: [{
    turn: 4,
    lines: [
      { speaker: 'gruntborg', text: 'Grunborg holding at 40% armor... this is the hardest fight of my life and I am loving every second of it.' },
      { speaker: 'zephyra', text: 'Save the monologue for the debrief, old man. Reinforcements are still coming — eyes forward.' },
    ],
  }] as MapDef['events'],
  25: [{
    turn: 2,
    lines: [
      { speaker: 'warden', text: 'Beyond this door lies the Emperor himself. You will not pass while a single reactor on this station still burns.' },
      { speaker: 'valstray', text: 'Then we will put out every reactor you have. For everyone who believed we would get this far — attack!' },
    ],
  }] as MapDef['events'],
  // recurring rival — Cpt. Vossen taunts the squad on each Drake Eclipse sortie
  6: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'So you are the stray dog the Ark keeps feeding. The Drake has not tasted a real fight in months — do not disappoint me.' },
      { speaker: 'valstray', text: 'Who is that lunatic? Fine — you want a real fight? Come and get it!' },
    ],
  }] as MapDef['events'],
  13: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'Back again, Ardent? Persistent. I respect that — it makes the wreckage more memorable.' },
      { speaker: 'valstray', text: 'You again! Didn\'t learn your lesson last time, Vossen?' },
    ],
  }] as MapDef['events'],
  19: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'Three sorties now, pup. You should know — the Eclipse keeps no mercy in its magazines.' },
      { speaker: 'arielis', text: 'He\'s faster than before — keep spacing tight and do not chase him alone!' },
    ],
  }] as MapDef['events'],
  26: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'Last dance, Ardent. When this ends, one of us never flies again. Show me everything.' },
      { speaker: 'valstray', text: 'Everything he\'s got, squad — this is the last time we meet the Drake!' },
    ],
  }] as MapDef['events'],
  30: [{
    turn: 3,
    lines: [
      { speaker: 'emperor', text: 'I watched your ship die at Kharon and your pilots bleed across my empire. And still you come. Magnificent. Futile.' },
      { speaker: 'valstray', text: 'We crossed your whole empire to stand here, Emperor. Every burn, every scar — let it answer you now.' },
    ],
  }] as MapDef['events'],
};

/** Post-mission debrief scenes keyed by chapter id — play over the HQ screen after victory. */
export const DEBRIEFS: Record<number, { speaker: string; text: string; voice?: string }[]> = {
  1: [
    { speaker: 'npc_captain', voice: 'db_1_0' as never, text: 'Good work, squad. The Kargan line is broken — the corridor to the colony road is ours.' },
    { speaker: 'valstray', voice: 'db_1_1' as never, text: 'First sortie, first scars. The Ark is still standing — that is what counts.' },
  ],
  2: [{ speaker: 'npc_mechanic', voice: 'db_2_0' as never, text: 'Frames came back dented but whole. Get me two hours and they will fly like new.' }],
  5: [
    { speaker: 'raxden', voice: 'db_5_0' as never, text: '...Heh. So this is what it is like to lose to people who actually believe in something.' },
    { speaker: 'npc_captain', voice: 'db_5_1' as never, text: 'Raxden Crimson stands down. Secure his frame — and treat the pilot with respect.' },
  ],
  10: [
    { speaker: 'npc_captain', voice: 'db_10_0' as never, text: 'Moorin is down. The orbit gate is open — next stop, the sky itself.' },
    { speaker: 'arielis', voice: 'db_10_1' as never, text: 'Whatever waits above us is worse than anything below. Rest while you can, Ray.' },
  ],
  11: [{ speaker: 'raxdenR', voice: 'db_11_0' as never, text: 'First sortie in an Ark frame. Strange — fighting for something feels heavier than fighting for a throne.' }],
  15: [
    { speaker: 'npc_captain', voice: 'db_15_0' as never, text: 'The Void Empress is down. One throne left — and the man sitting on it knows we are coming.' },
    { speaker: 'gruntborg', voice: 'db_15_1' as never, text: 'Then let us not keep the Emperor waiting.' },
  ],
  20: [
    { speaker: 'gruntborg', voice: 'db_20_0' as never, text: 'Still breathing. Still flying. Someone pour me something when we dock.' },
    { speaker: 'zephyra', voice: 'db_20_1' as never, text: 'Doctor cleared you for engine coolant only, old man.' },
  ],
  21: [{ speaker: 'vexiaX', voice: 'db_21_0' as never, text: 'Falcon Squadron is aboard, Commander. We fly for the Ark now — prove it was worth the risk.' }],
  25: [
    { speaker: 'npc_captain', voice: 'db_25_0' as never, text: 'The Gate Warden has fallen. The Throne is ahead — whatever happens next, I am proud of every one of you.' },
  ],
  30: [
    { speaker: 'npc_captain', voice: 'db_30_0' as never, text: 'It is over. The Steel Throne is empty — tonight, the empire releases its grip on the colonies.' },
    { speaker: 'valstray', voice: 'db_30_1' as never, text: 'For everyone we carried this far... we made it. All units — stand down and come home.' },
  ],
};

// ~15% of non-boss line units deploy as elites — tougher, worth more EXP and credits
function markElites(spawns: { defId: string; pos: Pos; elite?: boolean }[], rSpawn: () => number, chance = 0.15, all = false) {
  for (const s of spawns) if (!ALL_UNITS[s.defId]?.boss && (all || rSpawn() < chance)) s.elite = true;
}

// hidden salvage crates — 1-2 claimable tiles scattered mid-field
function genCrates(terrain: Terrain[][], used: Set<string>, rSpawn: () => number) {
  const crates: { pos: Pos; itemId: string }[] = [];
  const crateItems = ['repairKit', 'enCell', 'ammoBox', 'megaKit', 'spiritWing'];
  for (let i = 0, n = 1 + Math.floor(rSpawn() * 2); i < n; i++) {
    for (let t = 0; t < 60; t++) {
      const x = 3 + Math.floor(rSpawn() * 7);
      const y = Math.floor(rSpawn() * 8);
      const k = `${x},${y}`;
      const ti = TERRAIN_INFO[terrain[y]?.[x]];
      if (ti && !used.has(k) && !crates.some((c) => c.pos.x === x && c.pos.y === y) && ti.passable.land && !ti.hpDmg) {
        used.add(k);
        crates.push({ pos: { x, y }, itemId: crateItems[Math.floor(rSpawn() * crateItems.length)] });
        break;
      }
    }
  }
  return crates;
}

export function genMap(ch: ChapterDef): MapDef {
  if (ch.theme === 'custom') {
    const roster = rosterFor(ch);
    const m: MapDef = { ...MISSION_SSS, bossHoldUntil: 3, events: MID_EVENTS[ch.id], playerSpawns: MISSION_SSS.playerSpawns.slice(0, 4).map((s, i) => ({ defId: roster[i] ?? s.defId, pos: s.pos })), enemySpawns: MISSION_SSS.enemySpawns.map((s) => ({ ...s })) };
    const rSpawn = rng(ch.id * 4243);
    markElites(m.enemySpawns, rSpawn, ch.eliteChance ?? 0.15, !!ch.eliteAll);
    const used = new Set(m.enemySpawns.concat(m.playerSpawns).map((s) => `${s.pos.x},${s.pos.y}`));
    m.crates = genCrates(m.terrain, used, rSpawn);
    return m;
  }
  const r = rng(ch.id * 7919);
  const terrain: Terrain[][] = [];
  for (let y = 0; y < 10; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < 14; x++) {
      let t = pickTerrain(r, ch.theme);
      // keep spawn zones clean & passable
      const inSpawn = (x <= 3 && y >= 5) || (x >= 9 && y <= 7);
      if (inSpawn && (t === 'water' || t === 'mountain' || t === 'void' || t === 'moon' || t === 'lava')) t = ch.theme === 'void' ? 'base' : 'plain';
      row.push(t);
    }
    terrain.push(row);
  }
  // blob smoothing: grow clusters — second pass pushes same-type neighbors
  const terrain2 = terrain.map((row) => row.slice());
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 14; x++) {
      const t = terrain[y][x];
      if (r() < 0.55) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[Math.floor(r() * 4)];
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < 14 && ny >= 0 && ny < 10) terrain2[ny][nx] = t;
      }
    }
  // enemy spawns along the right edge
  const enemySpawns: { defId: string; pos: Pos; elite?: boolean }[] = [];
  const used = new Set<string>();
  const comps = enemyComp(ch);
  const rSpawn = rng(ch.id * 4243);
  for (const defId of comps) {
    const isBoss = !!ALL_UNITS[defId]?.boss;
    for (let tries = 0; tries < 40; tries++) {
      // bosses always spawn in the far top-right corner — out of the player's turn-1 reach
      const x = isBoss ? 12 + Math.floor(rSpawn() * 2) : 9 + Math.floor(rSpawn() * 5);
      const y = isBoss ? Math.floor(rSpawn() * 2) : Math.floor(rSpawn() * 8);
      const k = `${x},${y}`;
      const ti = TERRAIN_INFO[terrain2[y][x]];
      // never spawn a unit on damaging terrain
      if (!used.has(k) && ti.passable.land && !ti.hpDmg) {
        used.add(k);
        enemySpawns.push({ defId, pos: { x, y } });
        break;
      }
    }
  }
  markElites(enemySpawns, rSpawn, ch.eliteChance ?? 0.15, !!ch.eliteAll);
  // fallback: never silently drop a unit (a missing boss would auto-win a boss-objective map)
  for (const defId of comps) {
    if (enemySpawns.filter((s) => s.defId === defId).length >= comps.filter((c) => c === defId).length) continue;
    outer: for (let x = 13; x >= 9; x--)
      for (let y = 0; y < 8; y++) {
        const k = `${x},${y}`;
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (!used.has(k) && ti.passable.land && !ti.hpDmg) {
          used.add(k);
          enemySpawns.push({ defId, pos: { x, y } });
          break outer;
        }
      }
  }
  const crates = genCrates(terrain2, used, rSpawn);
  // minefields on hazardous themes — telegraphed tiles that detonate on entry
  let mines: Pos[] | undefined;
  if (ch.theme === 'ruins' || ch.theme === 'desert' || ch.theme === 'lava') {
    mines = [];
    const want = 2 + Math.floor(rSpawn() * 2);
    for (let tries = 0; tries < 60 && mines.length < want; tries++) {
      const x = 4 + Math.floor(rSpawn() * 6); // mid-field, between the two lines
      const y = 2 + Math.floor(rSpawn() * 6);
      const k = `${x},${y}`;
      if (used.has(k) || mines.some((m) => m.x === x && m.y === y)) continue;
      const ti = TERRAIN_INFO[terrain2[y][x]];
      if (!ti.passable.land || ti.hpDmg) continue;
      mines.push({ x, y });
    }
  }
  // seize chapters place the beacon deep in enemy territory — the squad must break through
  let beaconPos: Pos | undefined;
  if (ch.objectiveType === 'seize') {
    outer: for (let x = 11; x <= 13; x++)
      for (let y = 3; y <= 6; y++) {
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (ti.passable.land && !ti.hpDmg) {
          beaconPos = { x, y };
          break outer;
        }
      }
  }
  // reach chapters place the extraction tile at the far edge — get any unit there alive
  let reachPos: Pos | undefined;
  if (ch.objectiveType === 'reach') {
    outer: for (let x = 13; x >= 11; x--)
      for (let y = 0; y <= 2; y++) {
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (ti.passable.land && !ti.hpDmg) {
          reachPos = { x, y };
          break outer;
        }
      }
  }
  // protect chapters station the convoy near the deployment zone, guarded by armed militia
  let allySpawns: { defId: string; pos: Pos; armed?: boolean; escort?: boolean }[] | undefined;
  if (ch.objectiveType === 'protect') {
    outer: for (let y = 3; y <= 6; y++)
      for (let x = 0; x <= 2; x++) {
        const k = `${x},${y}`;
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (!used.has(k) && ti.passable.land && !ti.hpDmg) {
          used.add(k);
          allySpawns = [{ defId: 'arklander', pos: { x, y }, escort: true }];
          // armed escort wing: up to 2 militia on free passable tiles beside the convoy
          const candidates = [
            { x: x + 1, y },
            { x: x + 1, y: y + 1 },
            { x, y: y + 1 },
            { x: x - 1, y: y + 1 },
            { x: x + 1, y: y - 1 },
            { x, y: y - 1 },
          ];
          for (const c of candidates) {
            if ((allySpawns.length ?? 0) >= 3) break;
            const ck = `${c.x},${c.y}`;
            if (c.x < 0 || c.y < 0 || c.x >= 14 || c.y >= 10 || used.has(ck)) continue;
            const ct = TERRAIN_INFO[terrain2[c.y][c.x]];
            if (!ct.passable.land || ct.hpDmg) continue;
            used.add(ck);
            allySpawns.push({ defId: 'arkmilitia', pos: c, armed: true });
          }
          break outer;
        }
      }
  }
  return {
    id: `c${ch.id}`,
    name: `CHAPTER ${ch.id}`,
    subtitle: `${ch.name} — ${ch.subtitle}`,
    cols: 14,
    rows: 10,
    terrain: terrain2,
    objective: ch.objective,
    playerSpawns: PLAYER_SPAWNS.slice(0, rosterFor(ch).length).map((p, i) => ({ defId: rosterFor(ch)[i], pos: p })),
    enemySpawns,
    allySpawns,
    crates,
    mines,
    beaconPos,
    reachPos,
    bossHoldUntil: ch.boss ? 3 : undefined,
    reinforce: REINFORCE[ch.id],
    events: MID_EVENTS[ch.id],
    hazards: ch.theme === 'void' || ch.theme === 'colony' ? { every: 3, count: 2 } : undefined,
  };
}

export function enemyComp(ch: ChapterDef): string[] {
  const comp: string[] = [];
  const fill = ch.act === 1 ? 'zolda' : ch.act === 2 ? 'vexia' : 'nightmare';
  const alt = ch.act === 1 ? 'zoldaAir' : ch.act === 2 ? 'nightmare' : 'bulwark';
  const heavy = ch.act === 1 ? 'zoldaTank' : 'nightmare';
  const fast = ch.act === 3 ? 'cataphract' : 'lancer';
  for (let i = 0; i < ch.count; i++) comp.push(i % 5 === 4 ? fast : i % 3 === 2 ? alt : i % 4 === 3 ? heavy : fill);
  if (ch.boss) comp.push(ch.boss);
  // Cpt. Vossen ambushes the squad on these chapters — a recurring ace duelist
  if ([6, 13, 19, 26].includes(ch.id)) comp.push('vossDrake');
  return comp;
}

export function enemyLevelOf(ch: ChapterDef, defId: string): number {
  if (defId === 'vossDrake') return ch.lvl + 2; // the ace always out-levels the field
  return ch.boss === defId ? ch.bossLevel ?? ch.lvl + 2 : ch.lvl;
}

export const CHAPTERS_COUNT = CHAPTERS.length;

// ---------- Side missions (optional, unlocked by chapter progress) ----------

export interface SideMissionDef {
  id: string;
  name: string;
  desc: string;
  unlockCh: number; // chapter count reached (1-based) required to unlock
  theme: string;
  lvl: number;
  count: number;
  boss?: string;
  rewardCr: number;
  rewardItem?: ItemId;
  objectiveType?: 'rout' | 'survive' | 'seize' | 'reach';
  surviveTurns?: number;
  /** rout/seize objectives: defeat if not met within this many turns */
  turnLimit?: number;
  objective?: string;
  /** repeatable patrol op — never marked cleared, level scales with campaign progress */
  repeatable?: boolean;
  /** fog of war: enemy units are hidden until a player unit is within FOG_RANGE */
  fog?: boolean;
  /** hunt objective: a loot carrier joins the enemy side and flees east */
  carrier?: boolean;
}

export const SIDE_MISSIONS: SideMissionDef[] = [
  {
    id: 's1',
    name: 'Pirates of Kharon Pass',
    desc: 'Raiders are stripping a refugee convoy. Intercept them.',
    unlockCh: 4,
    theme: 'mountain',
    lvl: 5,
    count: 5,
    rewardCr: 1400,
    rewardItem: 'ammoBox',
    objectiveType: 'survive',
    surviveTurns: 5,
    objective: 'Hold the pass until the convoy clears — survive 5 turns',
  },
  {
    id: 's2',
    name: 'Dust Crown Ambush',
    desc: 'Imperial scavengers circle a wrecked carrier in the Glass Desert.',
    unlockCh: 6,
    theme: 'desert',
    lvl: 6,
    count: 6,
    rewardCr: 1600,
    rewardItem: 'repairKit',
  },
  {
    id: 's3',
    name: 'Signals in the Drift',
    desc: 'A derelict emitter is broadcasting Ark codes in the void belt.',
    unlockCh: 9,
    theme: 'void',
    lvl: 9,
    count: 7,
    rewardCr: 2000,
    rewardItem: 'enCell',
    objectiveType: 'seize',
    objective: 'Capture the derelict emitter — move any unit onto the beacon',
  },
  {
    id: 's4',
    name: 'The Frozen Relay',
    desc: 'A listening post went dark in the polar shelf — investigate.',
    unlockCh: 11,
    theme: 'snow',
    lvl: 10,
    count: 6,
    rewardCr: 1800,
    rewardItem: 'enCell',
  },
  {
    id: 's5',
    name: 'Ember Gate Raid',
    desc: 'A weapons convoy crosses the volcanic shelf. Hit it before it dives.',
    unlockCh: 13,
    theme: 'volcano',
    lvl: 12,
    count: 7,
    rewardCr: 2200,
    rewardItem: 'spiritWing',
  },
  {
    id: 's6',
    name: 'The Lost Convoy',
    desc: 'Escort fragments hold beyond the lunar shadow — go get them.',
    unlockCh: 14,
    theme: 'moon',
    lvl: 13,
    count: 6,
    boss: 'moorin',
    rewardCr: 2600,
    rewardItem: 'megaKit',
  },
  {
    id: 's7',
    name: 'Sunken Bastion',
    desc: 'An Imperial flotilla anchors over the flooded fortress. Break it.',
    unlockCh: 16,
    theme: 'sea',
    lvl: 14,
    count: 7,
    rewardCr: 2400,
    rewardItem: 'megaKit',
    objectiveType: 'survive',
    surviveTurns: 6,
    objective: 'Hold the flooded fortress until the tide lifts — survive 6 turns',
  },
  {
    id: 's8',
    name: 'Ruins of Veridia',
    desc: 'Kargan loyalists dig through the colony Ray failed to save.',
    unlockCh: 18,
    theme: 'ruins',
    lvl: 15,
    count: 7,
    boss: 'kargan',
    rewardCr: 2800,
    rewardItem: 'valorPill',
  },
  {
    id: 's9',
    name: "Falcon's Errand",
    desc: 'Vee found a weapons cache inside a dead colony. Quietly.',
    unlockCh: 21,
    theme: 'colony',
    lvl: 18,
    count: 7,
    boss: 'serka',
    rewardCr: 3400,
    rewardItem: 'spiritWing',
  },
  {
    id: 's10',
    name: "Throne's Shadow",
    desc: 'The Emperor\'s personal guard patrols the approach. Prove the squad is ready.',
    unlockCh: 25,
    theme: 'fortress',
    lvl: 19,
    count: 8,
    boss: 'warden',
    rewardCr: 3800,
    rewardItem: 'megaKit',
  },
];

/** Repeatable patrol operations — always replayable, level scales with campaign progress. */
export const PATROL_MISSIONS: SideMissionDef[] = [
  { id: 'p1', name: 'Drift Wolves Patrol', desc: 'Imperial stragglers harass the belt lanes. Run them off — again and again.', unlockCh: 7, theme: 'void', lvl: 8, count: 5, rewardCr: 800, repeatable: true, turnLimit: 7, objective: 'Rout all hostiles within 7 turns — or they slip away' },
  { id: 'p2', name: 'Ash Belt Sweep', desc: 'Scavenger packs regroup in the Glass Desert whenever we look away.', unlockCh: 13, theme: 'desert', lvl: 12, count: 6, rewardCr: 1100, repeatable: true, turnLimit: 8, objective: 'Rout all hostiles within 8 turns — or they slip away' },
  { id: 'p3', name: "Throne's Shadow Watch", desc: 'The Emperor\'s vanguard tests our perimeter. Answer in kind.', unlockCh: 20, theme: 'fortress', lvl: 17, count: 7, rewardCr: 1500, repeatable: true, turnLimit: 9, objective: 'Rout all hostiles within 9 turns — or they slip away' },
  { id: 'p4', name: 'Ghost Relay Intercept', desc: 'A dead relay station keeps pinging the throne. Reach it before the garrison does.', unlockCh: 15, theme: 'ice', lvl: 14, count: 6, rewardCr: 1250, repeatable: true, objectiveType: 'seize', turnLimit: 8, objective: 'Seize the relay beacon within 8 turns — before the Empire silences it' },
  { id: 'p5', name: 'Karn Circuit', desc: 'Cataphract wolf-packs run the caldera rim hunting convoys. Break the pack.', unlockCh: 24, theme: 'lava', lvl: 20, count: 8, rewardCr: 1800, repeatable: true, turnLimit: 10, objective: 'Rout all hostiles within 10 turns — or they slip away' },
  { id: 'p7', name: 'Dead Runner', desc: 'A courier frame carries stolen throne codes through the ruins. Get a unit to the drop point before they torch it.', unlockCh: 18, theme: 'ruins', lvl: 16, count: 7, rewardCr: 1400, repeatable: true, objectiveType: 'reach', turnLimit: 8, objective: 'Reach the extraction ➤ within 8 turns — or rout the blockade' },
  { id: 'p9', name: 'Caravan Robbery', desc: 'Imperial supply mules haul throne gold through the dunes. Raid the caravan before it clears the pass.', unlockCh: 14, theme: 'desert', lvl: 13, count: 5, rewardCr: 1500, repeatable: true, carrier: true, objective: 'Destroy the Supply Mule before it escapes east — or rout the escort' },
  { id: 'p8', name: 'Night Passage', desc: 'Sensors are blind in the darkside channel. Slip a unit through the blockade line.', unlockCh: 24, theme: 'void', lvl: 20, count: 8, rewardCr: 1900, repeatable: true, objectiveType: 'reach', turnLimit: 9, fog: true, objective: 'Reach the extraction ➤ within 9 turns — sensors blind beyond 4 tiles' },
  { id: 'p6', name: 'Blackout Watch', desc: 'A sensor dead-zone hangs over the frozen relay shelf. Hostiles only reveal at knife range.', unlockCh: 11, theme: 'ice', lvl: 12, count: 6, rewardCr: 1150, repeatable: true, fog: true, objective: 'Rout all hostiles — sensors blind beyond 4 tiles' },
  { id: 'p10', name: 'Last Stand Ridge', desc: 'The ridge garrison is dug in and holding. Reinforcements keep cresting the pass — outlast them.', unlockCh: 22, theme: 'mountain', lvl: 19, count: 8, rewardCr: 1700, repeatable: true, objectiveType: 'survive', surviveTurns: 6, objective: 'Survive 6 turns against the ridge garrison' },
];

export const ALL_SIDE_MISSIONS: SideMissionDef[] = [...SIDE_MISSIONS, ...PATROL_MISSIONS];

// ---------- Honors — persistent achievements with one-time credit bounties ----------

export interface HonorDef {
  id: string;
  name: string;
  desc: string;
  rewardCr: number;
}

export const HONORS: HonorDef[] = [
  { id: 'h_first', name: 'FIRST BLOOD', desc: 'Destroy your first hostile', rewardCr: 300 },
  { id: 'h_ace', name: 'ACE PILOT', desc: 'A pilot reaches 25 career kills', rewardCr: 800 },
  { id: 'h_master', name: 'ACE MASTERY', desc: 'A pilot reaches 50 career kills', rewardCr: 1500 },
  { id: 'h_full', name: 'FULL SQUADRON', desc: 'Six pilots hold service records', rewardCr: 600 },
  { id: 'h_marksman', name: 'MARKSMAN', desc: 'Earn 5 ★ mastery objectives', rewardCr: 1000 },
  { id: 'h_perfect', name: 'PERFECT CAMPAIGN', desc: 'Earn every ★ mastery objective', rewardCr: 5000 },
  { id: 'h_comrades', name: 'COMRADES', desc: 'Watch 8 bond events in the mess hall', rewardCr: 800 },
  { id: 'h_hearts', name: 'HEARTS OF STEEL', desc: 'Complete all romance bond events', rewardCr: 1500 },
  { id: 'h_freelance', name: 'FREELANCER', desc: 'Clear 5 side quests', rewardCr: 800 },
  { id: 'h_allclear', name: 'PEACEKEEPER', desc: 'Clear all 10 side quests', rewardCr: 2000 },
  { id: 'h_eternal', name: 'ETERNAL WAR', desc: 'Begin a New Game+ cycle', rewardCr: 3000 },
  { id: 'h_chest', name: 'WAR CHEST', desc: 'Hold 20,000 credits at once', rewardCr: 1500 },
  { id: 'h_simace', name: 'VR ACE', desc: 'Score 1500+ PTS in the VR simulator', rewardCr: 1200 },
  { id: 'h_rival', name: 'NEMESIS', desc: 'Shoot down Cpt. Vossen and the Drake Eclipse', rewardCr: 1000 },
  { id: 'h_carrier', name: 'CARAVAN KING', desc: 'Down a Supply Mule before it escapes', rewardCr: 800 },
  { id: 'h_srank', name: 'FLAWLESS ACE', desc: 'Earn S rank on 5 different missions', rewardCr: 1500 },
];

/** Whether an honor's condition is currently met. */
export function honorDone(h: HonorDef, s: { pilotProg: Record<string, { kills?: number }>; masteryDone: number[]; bondSeen: string[]; sideCleared: string[]; ngPlus: number; credits: number; simBest?: number; killsByDef?: Record<string, number>; missionRank?: Record<number, 'S' | 'A' | 'B' | 'C'>; units?: { def: { id: string }; kills: number; alive: boolean; side: string }[] }): boolean {
  const kills = Object.values(s.pilotProg);
  const totalKills = kills.reduce((n, p) => n + (p.kills ?? 0), 0);
  const maxKills = kills.reduce((n, p) => Math.max(n, p.kills ?? 0), 0);
  switch (h.id) {
    case 'h_first':
      return totalKills >= 1;
    case 'h_ace':
      return maxKills >= 25;
    case 'h_master':
      return maxKills >= 50;
    case 'h_full':
      return kills.length >= 6;
    case 'h_marksman':
      return s.masteryDone.length >= 5;
    case 'h_perfect':
      return s.masteryDone.length >= CHAPTERS.filter((c) => c.mastery).length;
    case 'h_comrades':
      return s.bondSeen.length >= 8;
    case 'h_hearts':
      return s.bondSeen.length >= 12;
    case 'h_freelance':
      return s.sideCleared.length >= 5;
    case 'h_allclear':
      return s.sideCleared.length >= SIDE_MISSIONS.length;
    case 'h_eternal':
      return s.ngPlus >= 1;
    case 'h_chest':
      return s.credits >= 20000;
    case 'h_simace':
      return (s.simBest ?? 0) >= 1500;
    case 'h_rival':
      return (s as { vossenDefeated?: boolean }).vossenDefeated === true;
    case 'h_carrier':
      return (s.killsByDef?.cargoMule ?? 0) >= 1;
    case 'h_srank':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 5;
    default:
      return false;
  }
}

/** Fabricate a ChapterDef view of a side mission for genMap/enemyLevelOf/checkEnd. */
export function sideAsChapter(m: SideMissionDef): ChapterDef {
  const idx = m.repeatable ? SIDE_MISSIONS.length + PATROL_MISSIONS.findIndex((p) => p.id === m.id) : SIDE_MISSIONS.findIndex((x) => x.id === m.id);
  return {
    id: 1000 + idx,
    name: m.name,
    subtitle: m.repeatable ? 'PATROL OP' : 'SIDE QUEST',
    act: m.lvl >= 15 ? 3 : m.lvl >= 8 ? 2 : 1,
    theme: m.theme,
    lvl: m.lvl,
    count: m.count,
    boss: m.boss,
    bossLevel: m.boss ? m.lvl + 2 : undefined,
    objectiveType: m.objectiveType ?? (m.boss ? 'boss' : 'rout'),
    surviveTurns: m.surviveTurns,
    turnLimit: m.turnLimit,
    objective: m.objective ?? (m.boss ? 'Destroy the marked commander unit' : 'Rout all hostiles'),
    lines: [],
    rosterCh: m.unlockCh,
    fog: m.fog,
    carrier: m.carrier,
  };
}
