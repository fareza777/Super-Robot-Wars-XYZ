import chaptersJson from './chapters.json';
import { PILOTS, UNITS, WEAPONS, TERRAIN_INFO, MISSION_SSS } from './data';
import { MapDef, PartDef, PilotDef, PilotSkillId, Pos, Terrain, UnitDef } from './types';

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
  raxp: P({ name: 'Cap. Rax Daver', callsign: 'RED', melee: 66, ranged: 62, defense: 62, evade: 60, maxSp: 55, spirits: ['valor', 'strike'], faceColor: '#ff7a7a' }),
  moorinp: P({ name: 'Gen. Moorin', callsign: 'GEN', melee: 72, ranged: 70, defense: 78, evade: 52, maxSp: 70, spirits: ['grit', 'guard', 'strike'], faceColor: '#a8b8a0' }),
  serkap: P({ name: 'Void Empress Serka', callsign: 'EMP', melee: 74, ranged: 82, defense: 66, evade: 80, maxSp: 75, spirits: ['strike', 'valor', 'focus'], faceColor: '#d8a0ff' }),
  veep: P({ name: 'Lt. Vee Corrin', callsign: 'FALCON', melee: 58, ranged: 79, defense: 60, evade: 84, maxSp: 58, spirits: ['focus', 'strike', 'accel'], faceColor: '#8ef0e8' }),
  bramp: P({ name: 'Warden Bram', callsign: 'GATE', melee: 80, ranged: 55, defense: 82, evade: 50, maxSp: 60, spirits: ['grit', 'guard'], faceColor: '#c8a878' }),
  vaelp: P({ name: 'Emperor Vael', callsign: 'THRONE', melee: 82, ranged: 84, defense: 76, evade: 72, maxSp: 90, spirits: ['strike', 'valor', 'focus', 'guard'], faceColor: '#ffe08a' }),
};

// merged pilot lookup (unit.def.pilot stays typed as PilotDef)
export const CAMPAIGN_UNITS: Record<string, UnitDef> = {
  zoldaTank: U({ id: 'zoldaTank', name: 'Zolda Bastion', title: 'Imperial Heavy', color: '#5c6b52', accent: '#b8c4a8', maxHp: 5200, maxEn: 90, armor: 1300, mobility: 70, moveRange: 4, moveType: 'land', weapons: [WEAPONS.railgun, WEAPONS.heatRod], pilot: PILOTS.grunt }),
  vexia: U({ id: 'vexia', name: 'Vexia', title: 'Imperial Interceptor', color: '#4a6b8a', accent: '#c0e0ff', maxHp: 4400, maxEn: 130, armor: 800, mobility: 138, moveRange: 7, moveType: 'air', weapons: [WEAPONS.photonRifle, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  nightmare: U({ id: 'nightmare', name: 'Nightmare', title: 'Royal Guard', color: '#5a2f3a', accent: '#ffb0c0', maxHp: 6800, maxEn: 140, armor: 1150, mobility: 122, moveRange: 6, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.missilePods], pilot: PILOTS.grunt }),
  raxden: U({ id: 'raxden', name: 'Raxden Crimson', title: 'Custom Ace', color: '#a02828', accent: '#ffb080', maxHp: 7800, maxEn: 150, armor: 1100, mobility: 116, moveRange: 6, moveType: 'land', weapons: [WEAPONS.plasmaEdge, WEAPONS.railgun, WEAPONS.vulcan], pilot: CAMPAIGN_PILOTS.raxp, boss: true }),
  moorin: U({ id: 'moorin', name: 'Moorin Anvil', title: 'Imperial General', color: '#4a5a48', accent: '#d0e0c0', maxHp: 9800, maxEn: 160, armor: 1500, mobility: 96, moveRange: 5, moveType: 'land', weapons: [WEAPONS.megaBeam, WEAPONS.gatling, WEAPONS.punch], pilot: CAMPAIGN_PILOTS.moorinp, boss: true }),
  serka: U({ id: 'serka', name: 'Serka Vanta', title: 'Void Empress', color: '#5a2f6e', accent: '#e0b8ff', maxHp: 8200, maxEn: 190, armor: 1000, mobility: 140, moveRange: 7, moveType: 'air', weapons: [WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.serkap, boss: true }),
  empress: U({ id: 'empress', name: 'Empress Ascendant', title: 'True Void Form', color: '#7a3f8e', accent: '#ffe0ff', maxHp: 11000, maxEn: 220, armor: 1250, mobility: 146, moveRange: 7, moveType: 'air', weapons: [WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.chestBlaster], pilot: CAMPAIGN_PILOTS.serkap, boss: true }),
  warden: U({ id: 'warden', name: 'Gate Warden', title: 'Ancient Guardian', color: '#7a5a30', accent: '#ffe0a8', maxHp: 12000, maxEn: 140, armor: 1600, mobility: 90, moveRange: 4, moveType: 'land', weapons: [WEAPONS.drillLancer, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.bramp, boss: true }),
  emperor: U({ id: 'emperor', name: 'Throne of Vael', title: 'The Emperor', color: '#e8d8a0', accent: '#fff8d8', maxHp: 15000, maxEn: 240, armor: 1500, mobility: 130, moveRange: 6, moveType: 'air', weapons: [WEAPONS.chestBlaster, WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.vaelp, boss: true }),
  // --- player reinforcements (join at arc boundaries) ---
  raxdenR: U({ id: 'raxdenR', name: 'Raxden Crimson', title: 'Defected Ace', color: '#a02828', accent: '#ffb080', maxHp: 7800, maxEn: 150, armor: 1100, mobility: 116, moveRange: 6, moveType: 'land', weapons: [WEAPONS.plasmaEdge, WEAPONS.railgun, WEAPONS.vulcan], pilot: CAMPAIGN_PILOTS.raxp, level: 5 }),
  vexiaX: U({ id: 'vexiaX', name: 'Vexia Custom', title: 'Ark Interceptor', color: '#2a8a9a', accent: '#a0f0ff', maxHp: 5200, maxEn: 150, armor: 880, mobility: 142, moveRange: 7, moveType: 'air', weapons: [WEAPONS.photonRifle, WEAPONS.missilePods, WEAPONS.vulcan], pilot: CAMPAIGN_PILOTS.veep, level: 7 }),
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
  objectiveType?: 'rout' | 'survive' | 'boss';
  surviveTurns?: number;
  objective: string;
  /** SRW-point style bonus challenge — award credits when the mission ends meeting it */
  mastery?: { desc: string; maxTurns?: number; keepAll?: boolean; rewardCr: number };
  lines: { speaker: string; text: string; voice?: string }[];
  /** overrides roster gating (used by side missions whose ids are off-chapter) */
  rosterCh?: number;
}

export const CHAPTERS: ChapterDef[] = chaptersJson as unknown as ChapterDef[];

export function chapterOf(idx: number): ChapterDef {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, idx))];
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
  30: [{
    turn: 3,
    lines: [
      { speaker: 'emperor', text: 'I watched your ship die at Kharon and your pilots bleed across my empire. And still you come. Magnificent. Futile.' },
      { speaker: 'valstray', text: 'We crossed your whole empire to stand here, Emperor. Every burn, every scar — let it answer you now.' },
    ],
  }] as MapDef['events'],
};

/** Post-mission debrief scenes keyed by chapter id — play over the HQ screen after victory. */
export const DEBRIEFS: Record<number, { speaker: string; text: string }[]> = {
  1: [
    { speaker: 'npc_captain', text: 'Good work, squad. The Kargan line is broken — the corridor to the colony road is ours.' },
    { speaker: 'valstray', text: 'First sortie, first scars. The Ark is still standing — that is what counts.' },
  ],
  2: [{ speaker: 'npc_mechanic', text: 'Frames came back dented but whole. Get me two hours and they will fly like new.' }],
  5: [
    { speaker: 'raxden', text: '...Heh. So this is what it is like to lose to people who actually believe in something.' },
    { speaker: 'npc_captain', text: 'Raxden Crimson stands down. Secure his frame — and treat the pilot with respect.' },
  ],
  10: [
    { speaker: 'npc_captain', text: 'Moorin is down. The orbit gate is open — next stop, the sky itself.' },
    { speaker: 'arielis', text: 'Whatever waits above us is worse than anything below. Rest while you can, Ray.' },
  ],
  11: [{ speaker: 'raxdenR', text: 'First sortie in an Ark frame. Strange — fighting for something feels heavier than fighting for a throne.' }],
  15: [
    { speaker: 'npc_captain', text: 'The Void Empress is down. One throne left — and the man sitting on it knows we are coming.' },
    { speaker: 'gruntborg', text: 'Then let us not keep the Emperor waiting.' },
  ],
  20: [
    { speaker: 'gruntborg', text: 'Still breathing. Still flying. Someone pour me something when we dock.' },
    { speaker: 'zephyra', text: 'Doctor cleared you for engine coolant only, old man.' },
  ],
  21: [{ speaker: 'vexiaX', text: 'Falcon Squadron is aboard, Commander. We fly for the Ark now — prove it was worth the risk.' }],
  25: [
    { speaker: 'npc_captain', text: 'The Gate Warden has fallen. The Throne is ahead — whatever happens next, I am proud of every one of you.' },
  ],
  30: [
    { speaker: 'npc_captain', text: 'It is over. The Steel Throne is empty — tonight, the empire releases its grip on the colonies.' },
    { speaker: 'valstray', text: 'For everyone we carried this far... we made it. All units — stand down and come home.' },
  ],
};

export function genMap(ch: ChapterDef): MapDef {
  if (ch.theme === 'custom') {
    const roster = rosterFor(ch);
    return { ...MISSION_SSS, bossHoldUntil: 3, events: MID_EVENTS[ch.id], playerSpawns: MISSION_SSS.playerSpawns.slice(0, 4).map((s, i) => ({ defId: roster[i] ?? s.defId, pos: s.pos })) };
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
  const enemySpawns: { defId: string; pos: Pos }[] = [];
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
    bossHoldUntil: ch.boss ? 3 : undefined,
    reinforce: REINFORCE[ch.id],
    events: MID_EVENTS[ch.id],
  };
}

function enemyComp(ch: ChapterDef): string[] {
  const comp: string[] = [];
  const fill = ch.act === 1 ? 'zolda' : ch.act === 2 ? 'vexia' : 'nightmare';
  const alt = ch.act === 1 ? 'zoldaAir' : ch.act === 2 ? 'nightmare' : 'zoldaTank';
  const heavy = ch.act === 1 ? 'zoldaTank' : 'nightmare';
  for (let i = 0; i < ch.count; i++) comp.push(i % 3 === 2 ? alt : i % 4 === 3 ? heavy : fill);
  if (ch.boss) comp.push(ch.boss);
  return comp;
}

export function enemyLevelOf(ch: ChapterDef, defId: string): number {
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

/** Fabricate a ChapterDef view of a side mission for genMap/enemyLevelOf/checkEnd. */
export function sideAsChapter(m: SideMissionDef): ChapterDef {
  return {
    id: 1000 + SIDE_MISSIONS.indexOf(m),
    name: m.name,
    subtitle: 'SIDE QUEST',
    act: m.lvl >= 15 ? 3 : m.lvl >= 8 ? 2 : 1,
    theme: m.theme,
    lvl: m.lvl,
    count: m.count,
    boss: m.boss,
    bossLevel: m.boss ? m.lvl + 2 : undefined,
    objectiveType: m.boss ? 'boss' : 'rout',
    objective: m.boss ? 'Destroy the marked commander unit' : 'Rout all hostiles',
    lines: [],
    rosterCh: m.unlockCh,
  };
}
