import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  CHAPTERS,
  CHAPTERS_COUNT,
  ITEMS,
  MAX_PART_SLOTS,
  MAX_PILOT_SKILL,
  MAX_WEAPON_UPG,
  PARTS,
  PILOT_STATS,
  UPGRADE_STATS,
  UpgradeMap,
  WEAPON_UPG_POWER,
  WeaponUpgMap,
  ChapterDef,
  DEBRIEFS,
  ALL_SIDE_MISSIONS,
  HONORS,
  honorDone,
  SIDE_MISSIONS,
  chapterOf,
  enemyLevelOf,
  genMap,
  missionOf,
  rosterFor,
  sideAsChapter,
  enemyComp,
  upgradedStat,
  weaponUpgCost,
  MILESTONE_SPIRITS,
} from './campaign';
import { BOND_EVENTS, MAX_BOND, bondKey, bondLevel, bondMods } from './bonds';

/** full attacker mods: bond bonus + rally aura + formation adjacency (+5 hit per adjacent ally, max +10) */
const modsFor = (bonds: Record<string, number>, units: UnitState[]) => (u: UnitState) => {
  const bm = bondMods(bonds, units, u);
  return { hitBonus: bm.hitBonus + rallyBonus(units, u) + formationBonus(units, u), dmgMult: bm.dmgMult };
};
import { MISSION_SSS, SPIRITS, TERRAIN_INFO } from './data';
import { bgm, setMusicEnabled, setSoundEnabled } from '../audio';
import {
  aiPickReaction,
  applyAttack,
  applyAllAttack,
  applyMapAttack,
  applySpirit,
  applySupportStrike,
  attackTiles as attackTilesFor,
  checkEnd,
  clearTransientForOwnPhase,
  defeatQuotes,
  dist,
  findSupport,
  key,
  makeUnit,
  MAX_WILL,
  MoveRec,
  movementRange,
  partBonus,
  formationBonus,
  phaseRecovery,
  planEnemyActions,
  rallyBonus,
  same,
  terrainAt,
  unitAt,
  usableWeapons,
  weaponsAgainst,
} from './engine';
import { AttackResult, GameSettings, MapDef, Phase, PilotSkillId, PilotSkills, Pos, Reaction, SpiritId, StatusFx, UnitState, WeaponDef } from './types';

const SAVE_KEY = 'srwxyz_save_v1';
const SETTINGS_KEY = 'srwxyz_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = { battleMode: 'full', animSpeed: 1, sound: true, music: true };

export interface SaveData {
  chapter: number;
  credits: number;
  inventory: Record<string, number>;
  upgrades: UpgradeMap;
  weaponUpg: WeaponUpgMap;
  pilotProg: Record<string, { level: number; exp: number; kills?: number; pp?: number; skills?: PilotSkills }>;
  parts?: Record<string, string[]>; // defId -> equipped part ids
  partsOwned?: string[]; // part ids purchased once, freely equippable
  bonds?: Record<string, number>;
  bondSeen?: string[];
  sideCleared?: string[];
  ngPlus?: number;
  masteryDone?: number[]; // chapter ids whose mastery challenge was achieved
  hintsSeen?: string[]; // one-time tutorial cards already dismissed
  route?: 'a' | 'b' | null; // route split chosen after ch.15
  honorsClaimed?: string[];
  missionRank?: Record<string, 'S' | 'A' | 'B' | 'C'>; // HONORS achievement ids whose credit bounty was claimed
  simBest?: number; // VR simulator high score
  vossenDefeated?: boolean; // NEMESIS honor — Drake Eclipse shot down at least once
  killsByDef?: Record<string, number>; // enemies destroyed per frame id — codex tally
}

/** Serialized mid-battle snapshot — lets the player leave a mission and resume it later. */
export interface BattleSave {
  sideId: string | null;
  missionCh: ChapterDef;
  map: MapDef;
  units: UnitState[];
  turn: number;
  kills: number;
  bossWarned: boolean;
  eventsFired: string[];
  inventory: Record<string, number>;
  log: string[];
  crates?: { pos: Pos; itemId: string }[];
  hazardWarn?: Pos[];
  salvageCr?: number;
}

/** Pilots with this many career kills deploy at raised will (ace bonus). */
export const ACE_KILLS = 25;

export interface BattleAnim {
  attacker: UnitState;
  defender: UnitState;
  attackerAfter: UnitState; // post-attack state (for HP drain animation)
  defenderAfter: UnitState;
  weapon: WeaponDef;
  result: AttackResult;
  /** waiting on the player's defender reaction choice — scene shows the reaction bar, no anims yet */
  needsReaction?: boolean;
  /** uid of an adjacent unacted ally eligible to cover the defender this prompt */
  coverUid?: string;
  /** first contact with this boss this mission — scene flashes a WARNING card */
  warning?: string;
}

interface Store {
  phase: Phase;
  turn: number;
  units: UnitState[];
  chapter: number; // index into CHAPTERS — next/current mission
  map: MapDef;
  crates: { pos: Pos; itemId: string }[]; // unclaimed salvage crates on the map
  credits: number;
  inventory: Record<string, number>;
  upgrades: UpgradeMap;
  weaponUpg: WeaponUpgMap;
  pilotProg: Record<string, { level: number; exp: number; kills?: number; pp?: number; skills?: PilotSkills }>;
  parts: Record<string, string[]>; // defId -> equipped part ids (max MAX_PART_SLOTS)
  partsOwned: string[];
  ngPlus: number; // New Game+ cycle count — enemies scale up, progression kept
  bonds: Record<string, number>; // pairKey -> bond level 0..3
  bondSeen: string[]; // bond event ids already viewed
  sideCleared: string[]; // cleared side mission ids
  sideId: string | null; // active side mission id (null = campaign chapter)
  bondEventId: string | null; // bond event currently playing
  missionCh: ChapterDef; // objective/map source for current mission (chapter or side)
  hasSave: boolean;
  settings: GameSettings;
  deploySel: string[];
  inspectUid: string | null;
  dangerZone: boolean;
  dangerTiles: Set<string>;
  /** ion-storm strike tiles telegraphed this round — detonate at the next turn transition */
  hazardWarn: Pos[];
  blizzard: boolean;
  /** empty-tile tap -> show terrain info card */
  tileInfo: Pos | null;
  threatTiles: Set<string>;
  kills: number; // enemies destroyed this mission
  salvageCr: number; // sector income accrued this mission (units holding base/city tiles)
  chainTurn: number; // turn the current kill-chain belongs to
  chainCount: number; // kills so far in that chain — 2nd+ kill per turn pays bonus salvage
  cursor: Pos | null;
  selectedUid: string | null;
  moveTiles: Map<string, MoveRec>;
  walk: { uid: string; path: Pos[] } | null; // unit walking animation in progress
  pendingMove: Pos | null; // unit previewed here, menu open
  preMovePos: Pos | null; // original tile to revert to on cancel
  pendingMovedFlag: boolean;
  attackTiles: Set<string>;
  pendingWeapon: WeaponDef | null;
  /** MAP weapon aim point — first tap marks the blast, second tap (or FIRE) commits */
  mapAim: Pos | null;
  menuForUid: string | null;
  spiritForUid: string | null;
  battle: BattleAnim | null;
  battleReaction: Reaction | null; // defender's pick while a reaction prompt is open
  bossWarned: boolean; // WARNING card already shown this mission
  notice: string | null; // transient map banner (e.g. ENEMY REINFORCEMENTS)
  hint: { id: string; text: string } | null; // one-time tutorial card currently showing
  hintsSeen: string[]; // tutorial cards already dismissed (persisted)
  midDialog: { speaker: string; text: string; voice?: string }[] | null; // mid-battle story event playing
  eventsFired: string[]; // mid-battle event indexes already shown this mission
  deployTiles: Set<string>; // legal reposition tiles while in the deploy phase
  lastReward: number; // credits earned by the just-finished mission
  lastSalvage: number; // sector income included in that reward
  lastMastery: string | null; // mastery objective earned on the just-finished mission (description)
  masteryDone: number[]; // chapter ids whose mastery challenge was achieved
  savedBattle: BattleSave | null; // resumable in-progress mission
  debrief: { speaker: string; text: string; voice?: string }[] | null; // post-mission scene queued over HQ
  salvageQueue: string[]; // item names dropped on kills, toasted on the map
  route: 'a' | 'b' | null; // campaign route split chosen after ch.15 (affects ch.16-18)
  honorsClaimed: string[]; // HONORS ids already claimed
  missionRank: Record<number, 'S' | 'A' | 'B' | 'C'>; // best battle rank per chapter id (side missions use 1000+idx)
  lastRank: 'S' | 'A' | 'B' | 'C' | null; // rank earned on the mission just finished
  simWave: number; // VR simulator — current wave (0 when not in a sim run)
  simSettled: boolean; // VR simulator — payout already applied for this run
  simBest: number; // VR simulator high score (persisted)
  vossenDefeated: boolean; // Cpt. Vossen shot down at least once (persisted — NEMESIS honor)
  killsByDef: Record<string, number>; // enemy frames destroyed per def id — codex tally (persisted)
  log: string[];
  enemyBusy: boolean;
  screenShake: number;

  start: () => void;
  showHint: (id: string, text: string) => void;
  dismissHint: () => void;
  finishOnboarding: () => void;
  gotoBriefing: () => void;
  gotoMissions: () => void;
  openBondEvent: (id: string) => void;
  finishBondEvent: () => void;
  startSideMission: (id: string) => void;
  replayStory: () => void;
  gotoSettings: () => void;
  setSetting: <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => void;
  resetSave: () => Promise<void>;
  toggleDeploy: (defId: string) => void;
  upgradeWeapon: (defId: string, weaponId: string) => void;
  buyPart: (partId: string) => void;
  equipPart: (defId: string, partId: string) => void;
  allocPP: (defId: string, statId: PilotSkillId) => void;
  claimHonor: (id: string) => void;
  clearInspect: () => void;
  toggleDanger: () => void;
  startMission: () => void;
  finishDialog: () => void;
  newCampaign: () => void;
  finishPrologue: () => void;
  loadSave: () => Promise<void>;
  gotoHq: () => void;
  buyItem: (itemId: string) => void;
  upgradeStat: (defId: string, statId: string) => void;
  useItem: (uid: string, itemId: string) => void;
  tapTile: (p: Pos) => void;
  cancel: () => void;
  confirmMove: (p: Pos) => void;
  chooseWeapon: (w: WeaponDef) => void;
  chooseTarget: (uid: string) => void;
  chooseMapTile: (p: Pos) => void;
  setReaction: (r: Reaction) => void;
  waitUnit: () => void;
  openSpirits: (uid: string) => void;
  beginMission: () => void; // deploy phase -> chapter dialog
  finishMidDialog: () => void;
  gotoCredits: () => void;
  castSpirit: (uid: string, s: SpiritId) => void;
  repairUnit: (uid: string, targetUid: string) => void;
  supplyUnit: (uid: string, targetUid: string) => void;
  captureUnit: (uid: string, targetUid: string) => void;
  chooseRoute: (r: 'a' | 'b') => void;
  resumeBattle: () => void;
  retreatMission: () => void;
  startSim: () => void; // VR simulator — endless-wave score run
  finishSim: () => void; // settle score + credits once per sim run
  endTurn: () => void;
  finishBattle: () => void;
  clearDebrief: () => void;
  restart: () => void;
}

const push = (log: string[], line: string) => [line, ...log].slice(0, 30);

function applyUpgrades(u: UnitState, up: UpgradeMap, wupg: WeaponUpgMap) {
  const rec = up[u.def.id];
  const wrec = wupg[u.def.id];
  u.def = { ...u.def };
  if (rec) {
    u.def.maxHp += (rec.hp ?? 0) * 400;
    u.def.maxEn += (rec.en ?? 0) * 15;
    u.def.armor += (rec.armor ?? 0) * 90;
    u.def.mobility += (rec.mobility ?? 0) * 6;
    u.hp = u.def.maxHp;
    u.en = u.def.maxEn;
  }
  if (wrec) {
    u.def.weapons = u.def.weapons.map((w) => {
      const lvl = wrec[w.id] ?? 0;
      return lvl > 0 ? { ...w, power: Math.round(w.power * (1 + WEAPON_UPG_POWER * lvl)) } : w;
    });
  }
}

/** NG+ : each cleared cycle buffs enemy frames (+18% HP, +10% armor, +6 mobility, +2 levels). */
function ngEnemy(u: UnitState, ngPlus: number) {
  if (ngPlus <= 0) return;
  u.def = { ...u.def, maxHp: Math.round(u.def.maxHp * (1 + 0.18 * ngPlus)), armor: Math.round(u.def.armor * (1 + 0.1 * ngPlus)), mobility: u.def.mobility + 6 * ngPlus };
  u.hp = u.def.maxHp;
  u.level += ngPlus * 2;
}

/** Tiles within 3 of any player spawn that a unit may redeploy to (empty + passable). */
function deployZone(map: MapDef): Set<string> {
  const out = new Set<string>();
  for (const sp of map.playerSpawns)
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const p = { x: sp.pos.x + dx, y: sp.pos.y + dy };
        if (Math.abs(dx) + Math.abs(dy) > 3) continue;
        if (p.x < 0 || p.y < 0 || p.x >= map.cols || p.y >= map.rows) continue;
        out.add(key(p));
      }
  return out;
}

/** Ace mastery: pilots with >= 50 career kills get a permanent combat edge. */
const ACE_MASTER_KILLS = 50;

function hardEnemy(u: UnitState, difficulty: 'normal' | 'hard') {
  if (difficulty !== 'hard') return;
  u.def = { ...u.def, maxHp: Math.round(u.def.maxHp * 1.15), armor: Math.round(u.def.armor * 1.1), mobility: u.def.mobility + 8 };
  u.hp = u.def.maxHp;
  u.level += 2;
}

function buildMission(ch: ChapterDef, pilotProg: Store['pilotProg'], upgrades: UpgradeMap, wupg: WeaponUpgMap, deploySel: string[], ngPlus: number, parts: Record<string, string[]>, difficulty: 'normal' | 'hard' = 'normal', vossenAllied = false): { map: MapDef; units: UnitState[] } {
  const map = genMap(ch);
  const units: UnitState[] = [];
  let i = 0;
  for (const s of map.playerSpawns) {
    if (deploySel.length && !deploySel.includes(s.defId)) continue;
    const u = makeUnit(s.defId, 'player', s.pos, `p${i++}`);
    const prog = pilotProg[s.defId];
    if (prog) {
      u.level = prog.level;
      u.exp = prog.exp;
      u.pp = prog.pp ?? 0;
      u.skills = { hit: 0, evade: 0, dmg: 0, def: 0, ...(prog.skills ?? {}) };
      if ((prog.kills ?? 0) >= ACE_KILLS) u.will = 130; // ace pilots start hot
      if ((prog.kills ?? 0) >= ACE_MASTER_KILLS) u.aceMastery = true;
      // career-kill milestones: extra spirits the pilot learned along the war
      const earned = (MILESTONE_SPIRITS[s.defId] ?? []).filter((m) => (prog.kills ?? 0) >= m.kills).map((m) => m.spirit);
      if (earned.length) u.bonusSpirits = earned;
    }
    u.parts = (parts[s.defId] ?? []).slice(0, MAX_PART_SLOTS);
    applyUpgrades(u, upgrades, wupg);
    // flat stat parts raise the frame itself
    const hpB = partBonus(u, 'hp');
    const enB = partBonus(u, 'en');
    if (hpB || enB) {
      u.def = { ...u.def, maxHp: u.def.maxHp + hpB, maxEn: u.def.maxEn + enB };
      u.hp = u.def.maxHp;
      u.en = u.def.maxEn;
    }
    units.push(u);
  }
  for (const s of map.enemySpawns) {
    if (vossenAllied && s.defId === 'vossDrake') continue; // the Drake fights on our wing this sortie
    const u = makeUnit(s.defId, 'enemy', s.pos, `e${i++}`);
    u.level = enemyLevelOf(ch, s.defId);
    ngEnemy(u, ngPlus);
    hardEnemy(u, difficulty);
    if (s.elite) {
      u.elite = true;
      u.def = {
        ...u.def,
        name: `Elite ${u.def.name}`,
        accent: '#ffd34d',
        maxHp: Math.round(u.def.maxHp * 1.2),
        armor: u.def.armor + 150,
        mobility: u.def.mobility + 8,
      };
      u.hp = u.def.maxHp;
    }
    units.push(u);
  }
  if (vossenAllied) {
    // the Drake defects — armed npc ally sorties on our wing instead of against us
    const va = makeUnit('vossAlly', 'player', { x: 1, y: Math.floor(map.rows / 2) - 1 }, `a${i++}`);
    va.npc = true;
    va.armed = true;
    va.level = ch.lvl + 2;
    va.def = { ...va.def, maxHp: Math.round(va.def.maxHp * (1 + (ch.lvl - 1) * 0.15)) };
    va.hp = va.def.maxHp;
    units.push(va);
  }
  if (ch.carrier) {
    if (ch.objectiveType === 'escort') {
      // escort mission — friendly mule on our side, auto-flees east every enemy phase
      const mule = makeUnit('cargoMule', 'player', { x: 1, y: Math.floor(map.rows / 2) }, `a${i++}`);
      mule.npc = true;
      mule.escort = true;
      mule.level = ch.lvl;
      mule.def = { ...mule.def, maxHp: Math.round(mule.def.maxHp * (1 + (ch.lvl - 1) * 0.15)) };
      mule.hp = mule.def.maxHp;
      units.push(mule);
    } else {
      // loot carrier spawns mid-right and flees east every enemy phase
      const spawnX = Math.floor(map.cols * 0.55);
      const mule = makeUnit('cargoMule', 'enemy', { x: spawnX, y: Math.floor(map.rows / 2) }, `e${i++}`);
      mule.level = ch.lvl;
      ngEnemy(mule, ngPlus);
      hardEnemy(mule, difficulty);
      units.push(mule);
    }
  }
  for (const s of map.allySpawns ?? []) {
    const u = makeUnit(s.defId, 'player', s.pos, `a${i++}`);
    u.npc = true;
    if (s.escort) u.escort = true;
    if (s.armed) u.armed = true;
    u.level = ch.lvl;
    // allied NPC frames scale with chapter level so escorts aren't paper vs late-game enemies
    const hpScale = s.escort ? 1 + (ch.lvl - 1) * 0.18 : 1 + (ch.lvl - 1) * 0.12;
    u.def = { ...u.def, maxHp: Math.round(u.def.maxHp * hpScale) };
    u.hp = u.def.maxHp;
    units.push(u);
  }
  return { map, units };
}

const BATTLE_SAVE_KEY = 'srwxyz_battle_v1';

async function persist(s: Pick<Store, 'chapter' | 'credits' | 'inventory' | 'upgrades' | 'pilotProg' | 'weaponUpg' | 'bonds' | 'bondSeen' | 'sideCleared' | 'ngPlus' | 'parts' | 'partsOwned'> & Partial<Pick<Store, 'masteryDone' | 'hintsSeen' | 'route' | 'honorsClaimed' | 'missionRank'>>) {
  const data: SaveData = { chapter: s.chapter, credits: s.credits, inventory: s.inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg: s.pilotProg, parts: s.parts, partsOwned: s.partsOwned, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared: s.sideCleared, ngPlus: s.ngPlus, masteryDone: s.masteryDone, hintsSeen: s.hintsSeen, route: s.route, honorsClaimed: s.honorsClaimed, missionRank: s.missionRank, simBest: useGame.getState().simBest, vossenDefeated: useGame.getState().vossenDefeated, killsByDef: useGame.getState().killsByDef };
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {}
}

/** Snapshot the live mission so it can be resumed after leaving to HQ. */
async function persistBattle(s: Store) {
  if (s.missionCh.sim) return; // VR runs are a single sitting — never autosaved
  const data: BattleSave = {
    sideId: s.sideId,
    missionCh: s.missionCh,
    map: s.map,
    units: s.units,
    turn: s.turn,
    kills: s.kills,
    bossWarned: s.bossWarned,
    eventsFired: s.eventsFired,
    inventory: s.inventory,
    log: s.log.slice(-30),
    crates: s.crates,
    hazardWarn: s.hazardWarn,
    salvageCr: s.salvageCr,
  };
  try {
    await AsyncStorage.setItem(BATTLE_SAVE_KEY, JSON.stringify(data));
  } catch {}
}

async function clearBattleSave() {
  try {
    await AsyncStorage.removeItem(BATTLE_SAVE_KEY);
  } catch {}
}

async function persistSettings(s: GameSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

const DROP_POOL: (keyof typeof ITEMS)[] = ['repairKit', 'enCell', 'ammoBox', 'spiritWing', 'valorPill', 'megaKit'];
/** Enemies occasionally drop supplies — 25% chance per kill. */
function rollDrop(): keyof typeof ITEMS | null {
  return Math.random() < 0.25 ? DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)] : null;
}
/** Roll salvage drops for `n` kills — returns updated inventory + log lines + item names for the map toast. */
function dropsForKills(n: number, inventory: Record<string, number>): { inventory: Record<string, number>; lines: string[]; names: string[] } {
  const lines: string[] = [];
  const names: string[] = [];
  let inv = inventory;
  for (let i = 0; i < n; i++) {
    const drop = rollDrop();
    if (drop) {
      inv = { ...inv, [drop]: (inv[drop] ?? 0) + 1 };
      lines.push(`Salvaged ${ITEMS[drop].name} from the wreck`);
      names.push(ITEMS[drop].name);
    }
  }
  return { inventory: inv, lines, names };
}

/** Toast the queued salvage drops on the map once the current banner has cleared. */
function drainSalvage(set: SetFn, get: Get, delayMs: number) {
  const names = get().salvageQueue;
  if (!names.length) return;
  setTimeout(() => {
    if (get().phase !== 'player') {
      set({ salvageQueue: [] });
      return;
    }
    set({ notice: `▣ SALVAGE — ${names.join(' · ')}`, salvageQueue: [] });
    setTimeout(() => set((st) => (st.notice && st.notice.startsWith('▣ SALVAGE') ? { notice: null } : {})), 2800);
  }, delayMs);
}

/** Tiles the unit threatens: move range + max weapon reach from each tile. */
function threatTilesFor(map: MapDef, units: UnitState[], u: UnitState): Set<string> {
  const out = new Set<string>();
  for (const rec of movementRange(map, units, u).values()) {
    const p = rec.pos;
    out.add(key(p));
    const maxR = Math.max(...usableWeapons(u).map((w) => w.rangeMax), 0);
    const minR = Math.min(...usableWeapons(u).map((w) => w.rangeMin), 1);
    for (let y = 0; y < map.rows; y++)
      for (let x = 0; x < map.cols; x++) {
        const d = dist(p, { x, y });
        if (d >= minR && d <= maxR) out.add(`${x},${y}`);
      }
  }
  return out;
}

export const useGame = create<Store>((set, get) => ({
  phase: 'title',
  turn: 1,
  units: [],
  cursor: null,
  selectedUid: null,
  moveTiles: new Map(),
  walk: null,
  pendingMove: null,
  preMovePos: null,
  pendingMovedFlag: false,
  attackTiles: new Set(),
  pendingWeapon: null,
  mapAim: null,
  menuForUid: null,
  spiritForUid: null,
  battle: null,
  log: [],
  enemyBusy: false,
  screenShake: 0,
  chapter: 0,
  map: MISSION_SSS,
  crates: [],
  credits: 0,
  inventory: {},
  upgrades: {},
  weaponUpg: {},
  pilotProg: {},
  parts: {},
  partsOwned: [],
  hasSave: false,
  settings: DEFAULT_SETTINGS,
  bonds: {},
  bondSeen: [],
  sideCleared: [],
  sideId: null,
  bondEventId: null,
  missionCh: CHAPTERS[0],
  deploySel: [],
  inspectUid: null,
  tileInfo: null,
  dangerZone: false,
  dangerTiles: new Set<string>(),
  threatTiles: new Set<string>(),
  hazardWarn: [],
  blizzard: false,
  kills: 0,
  salvageCr: 0,
  chainTurn: 0,
  chainCount: 0,
  ngPlus: 0,
  battleReaction: null,
  bossWarned: false,
  notice: null,
  midDialog: null,
  eventsFired: [],
  deployTiles: new Set<string>(),
  lastReward: 0,
  lastSalvage: 0,
  lastMastery: null,
  masteryDone: [],
  savedBattle: null,
  debrief: null,
  salvageQueue: [],
  route: null,
  honorsClaimed: [],
  missionRank: {} as Record<number, 'S' | 'A' | 'B' | 'C'>,
  lastRank: null as 'S' | 'A' | 'B' | 'C' | null,
  simWave: 0,
  simSettled: false,
  simBest: 0,
  vossenDefeated: false,
  killsByDef: {} as Record<string, number>,
  hint: null,
  hintsSeen: [],

  start: () => set({ phase: 'onboarding', units: [], log: [] }),

  // one-time tutorial card — first-run help on the early campaign chapters only
  showHint: (id, text) => {
    const s = get();
    if (s.missionCh.id > 2 || s.sideId || s.hintsSeen.includes(id) || s.hint) return;
    set({ hint: { id, text } });
  },
  dismissHint: () => {
    const s = get();
    if (!s.hint) return;
    const hintsSeen = [...s.hintsSeen, s.hint.id];
    set({ hint: null, hintsSeen });
    void persist({ ...s, hintsSeen });
  },
  clearDebrief: () => set({ debrief: null }),
  finishOnboarding: () => set({ phase: 'home' }),
  gotoBriefing: () => {
    const s = get();
    // safety net: a save written at the ch.15 victory screen carries chapter=15
    // with no route yet — force the choice before briefing can be reached
    if (s.chapter === 15 && !s.route) {
      set({ phase: 'route' });
      return;
    }
    set({ phase: 'briefing', deploySel: rosterFor(missionOf(s.chapter, s.route)) });
  },

  gotoMissions: () => set({ phase: 'missions' }),

  openBondEvent: (id) => set({ phase: 'bond', bondEventId: id }),

  finishBondEvent: () => {
    const s = get();
    const ev = BOND_EVENTS.find((e) => e.id === s.bondEventId);
    if (!ev) {
      set({ phase: 'hq', bondEventId: null });
      return;
    }
    const seen = s.bondSeen.includes(ev.id);
    const bonds = seen ? s.bonds : { ...s.bonds, [bondKey(ev.a, ev.b)]: Math.min(MAX_BOND, bondLevel(s.bonds, ev.a, ev.b) + 1) };
    const bondSeen = seen ? s.bondSeen : [...s.bondSeen, ev.id];
    set({ phase: 'hq', bondEventId: null, bonds, bondSeen });
    void persist({ chapter: s.chapter, credits: s.credits, inventory: s.inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg: s.pilotProg, parts: s.parts, partsOwned: s.partsOwned, bonds, bondSeen, sideCleared: s.sideCleared, ngPlus: s.ngPlus, route: s.route });
  },

  startSideMission: (id) => {
    const s = get();
    const m = ALL_SIDE_MISSIONS.find((x) => x.id === id);
    if (!m || s.chapter < m.unlockCh || (s.sideCleared.includes(id) && !m.repeatable)) return;
    // patrol ops scale to campaign progress — always stay relevant as a grind option
    const lvl = m.repeatable ? Math.max(m.lvl, s.chapter) : m.lvl;
    const ch = sideAsChapter({ ...m, lvl });
    const allied = (s.killsByDef['vossDrake'] ?? 0) >= 2;
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, [], s.ngPlus, s.parts, s.settings.difficulty ?? 'normal', allied);
    void clearBattleSave();
    set({ phase: 'player', sideId: id, missionCh: { ...ch, seizePos: map.beaconPos, reachPos: map.reachPos }, map, units, crates: map.crates ?? [], kills: 0, salvageCr: 0, turn: 1, bossWarned: false, savedBattle: null, simWave: 0, log: [`${m.repeatable ? 'PATROL OP' : 'SIDE QUEST'}: ${m.name}`, `Objective: ${ch.objective}`, ...(allied ? [`🤝 Cpt. Vossen: "I've seen enough. Ark — the Drake flies on your wing now."`] : [])], inspectUid: null, tileInfo: null, dangerZone: false, dangerTiles: new Set(), threatTiles: new Set(), hazardWarn: [], blizzard: false, midDialog: null, eventsFired: [], notice: 'PLAYER PHASE — TURN 1' });
    setTimeout(() => set({ notice: null }), 2400);
    void persistBattle(get());
  },

  // VR SIMULATOR — endless-wave combat drill. Rout a wave, a bigger one warps in.
  // Score = kills*50 + 150 per cleared wave; payout = score/4 credits. No autosave.
  startSim: () => {
    const s = get();
    const themes = ['void', 'desert', 'fortress', 'ice', 'ruins', 'snow'];
    const lvl = Math.max(6, s.chapter); // sim difficulty scales with campaign progress
    const ch: ChapterDef = {
      id: 2000,
      name: 'VR Simulation',
      subtitle: 'ENDLESS WAVE PROTOCOL',
      act: 3,
      theme: themes[Math.floor(Math.random() * themes.length)],
      lvl,
      count: 4,
      objectiveType: 'rout',
      objective: 'Survive escalating waves — payout scales with score',
      sim: true,
      lines: [],
    };
    // no guest ace in the simulator — it would inflate scores
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, [], s.ngPlus, s.parts, s.settings.difficulty ?? 'normal', false);
    // VR runs are ephemeral and never autosave — keep any prior mission snapshot
    // so the ops board still offers RESUME for it after the run ends.
    set({ phase: 'player', sideId: null, missionCh: { ...ch, seizePos: map.beaconPos, reachPos: map.reachPos }, map, units, crates: map.crates ?? [], kills: 0, salvageCr: 0, turn: 1, bossWarned: false, savedBattle: s.savedBattle, simWave: 1, simSettled: false, log: ['▲ VR SIMULATION — WAVE 1', `Objective: ${ch.objective}`, 'Waves escalate. The run ends when the squad falls.'], inspectUid: null, tileInfo: null, dangerZone: false, dangerTiles: new Set(), threatTiles: new Set(), hazardWarn: [], blizzard: false, midDialog: null, eventsFired: [], notice: '▲ VR SIMULATION — WAVE 1' });
    setTimeout(() => set({ notice: null }), 2600);
  },

  // settle the run exactly once: score -> credits payout, best score persists
  finishSim: () => {
    const s = get();
    if (!s.missionCh.sim || s.simSettled) return;
    const score = s.kills * 50 + (s.simWave - 1) * 150;
    const payout = Math.round(score / 4);
    const simBest = Math.max(s.simBest, score);
    set({ simSettled: true, simBest, credits: s.credits + payout });
    void persist({ ...s, credits: s.credits + payout });
  },
  replayStory: () => set({ phase: 'onboarding' }),
  gotoSettings: () => set({ phase: 'settings' }),

  setSetting: (k, v) => {
    const settings = { ...get().settings, [k]: v };
    set({ settings });
    if (k === 'sound') setSoundEnabled(v as boolean);
    if (k === 'music') setMusicEnabled(v as boolean);
    void persistSettings(settings);
  },

  resetSave: async () => {
    try {
      await AsyncStorage.removeItem(SAVE_KEY);
      await AsyncStorage.removeItem(BATTLE_SAVE_KEY);
    } catch {}
    set({ hasSave: false, chapter: 0, credits: 0, inventory: {}, upgrades: {}, weaponUpg: {}, pilotProg: {}, ngPlus: 0, parts: {}, partsOwned: [], masteryDone: [], savedBattle: null, simBest: 0, vossenDefeated: false, killsByDef: {} });
  },

  toggleDeploy: (defId) => {
    const s = get();
    const has = s.deploySel.includes(defId);
    if (has && s.deploySel.length <= 1) return; // keep at least one unit deployed
    if (has && missionOf(s.chapter, s.route).requiredDefId === defId) return; // hero clause — the required unit always sorties
    set({ deploySel: has ? s.deploySel.filter((d) => d !== defId) : [...s.deploySel, defId] });
  },

  upgradeWeapon: (defId, weaponId) => {
    const s = get();
    const cur = s.weaponUpg[defId]?.[weaponId] ?? 0;
    if (cur >= MAX_WEAPON_UPG) return;
    const cost = weaponUpgCost(cur);
    if (s.credits < cost) return;
    const weaponUpg: WeaponUpgMap = { ...s.weaponUpg, [defId]: { ...(s.weaponUpg[defId] ?? {}), [weaponId]: cur + 1 } };
    const credits = s.credits - cost;
    set({ credits, weaponUpg });
    void persist({ ...s, credits, weaponUpg });
  },

  clearInspect: () => set({ inspectUid: null, threatTiles: new Set() }),

  // SRW danger zone: paint every tile any hostile could reach + attack this turn
  toggleDanger: () =>
    set((s) => {
      if (s.dangerZone) return { dangerZone: false, dangerTiles: new Set<string>() };
      const tiles = new Set<string>();
      for (const e of s.units.filter((u) => u.alive && u.side === 'enemy')) for (const t of threatTilesFor(s.map, s.units, e)) tiles.add(t);
      return { dangerZone: true, dangerTiles: tiles };
    }),

  newCampaign: () => {
    const fresh = {
      chapter: 0,
      credits: 1200,
      inventory: { repairKit: 2, enCell: 1 } as Record<string, number>,
      upgrades: {} as UpgradeMap,
      weaponUpg: {} as WeaponUpgMap,
      pilotProg: {} as Store['pilotProg'],
      parts: {} as Record<string, string[]>,
      partsOwned: [] as string[],
      bonds: {} as Record<string, number>,
      bondSeen: [] as string[],
      sideCleared: [] as string[],
      ngPlus: 0,
      masteryDone: [] as number[],
      savedBattle: null as BattleSave | null,
      route: null as 'a' | 'b' | null,
      honorsClaimed: [] as string[],
      missionRank: {} as Record<number, 'S' | 'A' | 'B' | 'C'>,
      lastRank: null as 'S' | 'A' | 'B' | 'C' | null,
      vossenDefeated: false,
      killsByDef: {} as Record<string, number>,
    };
    void clearBattleSave();
    set({ ...fresh, hasSave: true, kills: 0, phase: 'prologue' });
    void persist({ ...fresh, bonds: fresh.bonds, bondSeen: fresh.bondSeen, sideCleared: fresh.sideCleared });
  },

  finishPrologue: () => set({ phase: 'hq' }),

  // HONORS — one-time credit bounty for a persistent feat
  claimHonor: (id) => {
    const s = get();
    const h = HONORS.find((x) => x.id === id);
    if (!h || s.honorsClaimed.includes(id) || !honorDone(h, s)) return;
    const honorsClaimed = [...s.honorsClaimed, id];
    const credits = s.credits + h.rewardCr;
    set({ honorsClaimed, credits, log: push(s.log, `★ HONOR — ${h.name}: +${h.rewardCr} credits`) });
    void persist({ ...s, honorsClaimed, credits });
  },

  loadSave: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as SaveData;
      set({ chapter: d.chapter, credits: d.credits, inventory: d.inventory, upgrades: d.upgrades, weaponUpg: d.weaponUpg ?? {}, pilotProg: d.pilotProg, hasSave: true, bonds: d.bonds ?? {}, bondSeen: d.bondSeen ?? [], sideCleared: d.sideCleared ?? [], ngPlus: d.ngPlus ?? 0, parts: d.parts ?? {}, partsOwned: d.partsOwned ?? [], masteryDone: d.masteryDone ?? [], hintsSeen: d.hintsSeen ?? [], route: d.route ?? null, honorsClaimed: d.honorsClaimed ?? [], missionRank: (d.missionRank as Record<number, 'S' | 'A' | 'B' | 'C'>) ?? {}, simBest: d.simBest ?? 0, vossenDefeated: d.vossenDefeated ?? false, killsByDef: d.killsByDef ?? {} });
    } catch {}
    try {
      const sraw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (sraw) {
        const st = { ...DEFAULT_SETTINGS, ...(JSON.parse(sraw) as Partial<GameSettings>) };
        set({ settings: st });
        setSoundEnabled(st.sound);
        setMusicEnabled(st.music);
      }
    } catch {}
    try {
      const braw = await AsyncStorage.getItem(BATTLE_SAVE_KEY);
      if (braw) set({ savedBattle: JSON.parse(braw) as BattleSave });
    } catch {}
  },

  gotoHq: () =>
    set((s) => ({
      // the route split unlocks once — right after the Void Empress falls (ch.15 cleared => chapter index 15)
      phase: s.chapter === 15 && !s.route ? 'route' : 'hq',
    })),

  chooseRoute: (r) => {
    set({ route: r, phase: 'hq' });
    void persist({ ...get(), route: r });
  },

  buyItem: (itemId) => {
    const s = get();
    const item = ITEMS[itemId];
    if (!item || s.credits < item.price) return;
    const inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 };
    const credits = s.credits - item.price;
    set({ credits, inventory });
    void persist({ ...s, credits, inventory });
  },

  buyPart: (partId) => {
    const s = get();
    const part = PARTS[partId];
    if (!part || s.credits < part.price || s.partsOwned.includes(partId)) return;
    const partsOwned = [...s.partsOwned, partId];
    const credits = s.credits - part.price;
    set({ credits, partsOwned });
    void persist({ ...s, credits, partsOwned });
  },

  equipPart: (defId, partId) => {
    const s = get();
    if (!s.partsOwned.includes(partId)) return;
    const cur = s.parts[defId] ?? [];
    let next: string[];
    if (cur.includes(partId)) next = cur.filter((p) => p !== partId); // unequip
    else if (cur.length < MAX_PART_SLOTS) next = [...cur, partId];
    else next = [cur[1], partId]; // swap out the oldest slot
    // a part can't be equipped on two mechas at once
    const parts = { ...s.parts, [defId]: next };
    for (const [k, v] of Object.entries(parts)) if (k !== defId && v.includes(partId)) parts[k] = v.filter((p) => p !== partId);
    set({ parts });
    void persist({ ...s, parts });
  },

  allocPP: (defId, statId) => {
    const s = get();
    const prog = s.pilotProg[defId];
    if (!prog || (prog.pp ?? 0) < 1) return;
    const skills = { hit: 0, evade: 0, dmg: 0, def: 0, ...(prog.skills ?? {}) };
    if (skills[statId] >= MAX_PILOT_SKILL) return;
    skills[statId] += 1;
    const pilotProg = { ...s.pilotProg, [defId]: { ...prog, pp: (prog.pp ?? 0) - 1, skills } };
    set({ pilotProg });
    void persist({ ...s, pilotProg });
  },

  upgradeStat: (defId, statId) => {
    const s = get();
    const stat = UPGRADE_STATS.find((x) => x.id === statId);
    if (!stat) return;
    const cur = s.upgrades[defId]?.[statId] ?? 0;
    if (cur >= 8) return;
    const cost = stat.cost(cur);
    if (s.credits < cost) return;
    const upgrades: UpgradeMap = { ...s.upgrades, [defId]: { ...(s.upgrades[defId] ?? {}), [statId]: cur + 1 } };
    const credits = s.credits - cost;
    set({ credits, upgrades });
    void persist({ ...s, credits, upgrades });
  },

  useItem: (uid, itemId) => {
    const s = get();
    const item = ITEMS[itemId];
    if (!item || (s.inventory[itemId] ?? 0) <= 0) return;
    const u = s.units.find((x) => x.uid === uid);
    if (!u || u.acted) return;
    const units = s.units.map((x) => {
      if (x.uid !== uid) return x;
      const c = { ...x, ammo: { ...x.ammo } };
      switch (item.apply) {
        case 'willAll': {
          if (x.side === 'player' && x.alive) {
            const c2 = { ...x, will: Math.min(150, (x.will ?? 100) + item.amount) };
            if (x.uid === uid) { c2.moved = true; c2.acted = true; }
            return c2;
          }
          return x;
        }
        case 'healArea': {
          if (x.side === 'player' && x.alive && Math.abs(x.pos.x - u.pos.x) + Math.abs(x.pos.y - u.pos.y) <= 2) {
            const c2 = { ...x, hp: Math.min(x.def.maxHp + 8000, x.hp + Math.round(x.def.maxHp * item.amount / 100)) };
            if (x.uid === uid) { c2.moved = true; c2.acted = true; }
            return c2;
          }
          if (x.uid === uid) return { ...x, moved: true, acted: true };
          return x;
        }
        case 'hp':
          c.hp = Math.min(c.def.maxHp, c.hp + item.amount);
          break;
        case 'en':
          c.en = Math.min(c.def.maxEn, c.en + item.amount);
          break;
        case 'ammo':
          for (const w of c.def.weapons) if (w.ammo != null) c.ammo[w.id] = w.ammo;
          break;
        case 'sp':
          c.sp = Math.min(c.def.pilot.maxSp, c.sp + item.amount);
          break;
        case 'valor':
          c.valorForNextAttack = true;
          break;
      }
      c.moved = true;
      c.acted = true;
      return c;
    });
    const inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) - 1 };
    set({
      units,
      inventory,
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
      log: push(s.log, `${u.def.name} uses ${item.name}`),
    });
    void persist({ ...s, inventory });
  },

  startMission: () => {
    const s = get();
    const ch = missionOf(s.chapter, s.route);
    const allied = (s.killsByDef['vossDrake'] ?? 0) >= 2;
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, s.deploySel, s.ngPlus, s.parts, s.settings.difficulty ?? 'normal', allied);
    const zone = deployZone(map);
    // paint the deploy zone with the move-range overlay so the player sees where units can go
    const zoneTiles = new Map<string, MoveRec>();
    for (const k of zone) {
      const [x, y] = k.split(',').map(Number);
      zoneTiles.set(k, { pos: { x, y }, cost: 0 });
    }
    void clearBattleSave();
    set({ phase: 'deploy', sideId: null, missionCh: { ...ch, seizePos: map.beaconPos, reachPos: map.reachPos }, map, units, crates: map.crates ?? [], kills: 0, salvageCr: 0, turn: 1, bossWarned: false, savedBattle: null, log: [`Chapter ${ch.id}: ${ch.name}${s.ngPlus ? ` · NG+ ${s.ngPlus}` : ''}`, `Objective: ${ch.objective}`, ...(allied ? [`🤝 Cpt. Vossen: "I've seen enough. Ark — the Drake flies on your wing now."`] : [])], inspectUid: null, tileInfo: null, dangerZone: false, dangerTiles: new Set(), threatTiles: new Set(), hazardWarn: [], blizzard: false, midDialog: null, eventsFired: [], deployTiles: zone, moveTiles: zoneTiles });
  },
  finishDialog: () => {
    set({ phase: 'player', notice: 'PLAYER PHASE — TURN 1' });
    setTimeout(() => set({ notice: null }), 2400);
    setTimeout(() => get().showHint('move', 'TAP a unit to select it — blue tiles are its move range, red its attack reach. Drag the map with a finger to look around.'), 2600);
    void persistBattle(get());
  },

  // abandon the in-progress mission — autosave is discarded, back to the ops board
  // (in VR mode, retreating settles the run through the standard sim-over screen)
  retreatMission: () => {
    if (get().missionCh.sim) {
      set({ phase: 'defeat', battle: null, cursor: null, selectedUid: null, pendingMove: null, menuForUid: null, spiritForUid: null, pendingWeapon: null, mapAim: null, midDialog: null });
      return;
    }
    void clearBattleSave();
    set({ phase: 'missions', sideId: null, savedBattle: null, battle: null, cursor: null, selectedUid: null, pendingMove: null, menuForUid: null, spiritForUid: null, pendingWeapon: null, mapAim: null, midDialog: null, units: [] });
  },

  resumeBattle: () => {
    const s = get();
    if (!s.savedBattle) return;
    const b = s.savedBattle;
    set({
      phase: 'player',
      sideId: b.sideId,
      missionCh: b.missionCh,
      map: b.map,
      units: b.units,
      turn: b.turn,
      kills: b.kills,
      bossWarned: b.bossWarned,
      eventsFired: b.eventsFired,
      inventory: b.inventory,
      crates: b.crates ?? [],
      hazardWarn: b.hazardWarn ?? [],
      blizzard: false,
      log: b.log,
      cursor: null,
      selectedUid: null,
      moveTiles: new Map(),
      walk: null,
      pendingMove: null,
      preMovePos: null,
      pendingMovedFlag: false,
      attackTiles: new Set(),
      pendingWeapon: null,
      mapAim: null,
      menuForUid: null,
      spiritForUid: null,
      battle: null,
      battleReaction: null,
      notice: null,
      midDialog: null,
      deployTiles: new Set(),
      inspectUid: null,
      tileInfo: null,
      threatTiles: new Set(),
      enemyBusy: false,
    });
  },

  repairUnit: (uid, targetUid) => {
    const s = get();
    const u = s.units.find((x) => x.uid === uid);
    const t = s.units.find((x) => x.uid === targetUid);
    if (!u || !t || !u.def.repairer || t.side !== 'player' || !t.alive) return;
    if (dist(u.pos, t.pos) > 2) return; // repair reach: adjacent + 1
    const heal = Math.round(t.def.maxHp * 0.4 * (u.def.pilot.trait === 'field_medic' ? 1.5 : 1));
    const enGain = 30;
    const units = s.units.map((x) => {
      if (x.uid === targetUid) {
        // a repair crew also restocks limited-ammo weapons
        const ammo = { ...x.ammo };
        for (const w of x.def.weapons) if (w.ammo != null) ammo[w.id] = w.ammo;
        return { ...x, hp: Math.min(x.def.maxHp, x.hp + heal), en: Math.min(x.def.maxEn, x.en + enGain), ammo };
      }
      if (x.uid === uid) return { ...x, moved: true, acted: true, exp: Math.min(99, x.exp + 25) };
      return x;
    });
    set({
      units,
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
      log: push(s.log, `${u.def.name} repairs ${t.def.name} — +${heal} HP, +${enGain} EN, ammo restocked`),
    });
    void persistBattle(get());
  },

  // RESUPPLY: restock ammo + EN for an ally within 3 tiles (no heal — longer reach than repair)
  supplyUnit: (uid, targetUid) => {
    const s = get();
    const u = s.units.find((x) => x.uid === uid);
    const t = s.units.find((x) => x.uid === targetUid);
    if (!u || !t || !u.def.supplier || t.side !== 'player' || !t.alive) return;
    if (dist(u.pos, t.pos) > 3) return;
    const enGain = 50;
    const units = s.units.map((x) => {
      if (x.uid === targetUid) {
        const ammo = { ...x.ammo };
        for (const w of x.def.weapons) if (w.ammo != null) ammo[w.id] = w.ammo;
        return { ...x, en: Math.min(x.def.maxEn, x.en + enGain), ammo };
      }
      if (x.uid === uid) return { ...x, moved: true, acted: true, exp: Math.min(99, x.exp + 20) };
      return x;
    });
    set({
      units,
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
      log: push(s.log, `${u.def.name} resupplies ${t.def.name} — +${enGain} EN, ammo restocked`),
    });
    void persistBattle(get());
  },

  // CAPTURE: salvage crews secure a crippled adjacent enemy frame — bigger payout than a kill
  captureUnit: (uid, targetUid) => {
    const s = get();
    const u = s.units.find((x) => x.uid === uid);
    const t = s.units.find((x) => x.uid === targetUid);
    if (!u || !t || u.side !== 'player' || t.side !== 'enemy' || !t.alive || t.def.boss) return;
    if (dist(u.pos, t.pos) > 1 || t.hp > t.def.maxHp * 0.25) return;
    const salvage = 60 * t.level + (t.elite ? 200 : 0);
    const units = s.units.map((x) => {
      if (x.uid === targetUid) return { ...x, alive: false, hp: 0 };
      if (x.uid === uid) return { ...x, moved: true, acted: true, exp: Math.min(99, x.exp + 30) };
      return x;
    });
    let inventory = s.inventory;
    let salvageQueue = s.salvageQueue;
    const drop = rollDrop();
    if (drop) {
      inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
      salvageQueue = [...salvageQueue, ITEMS[drop].name];
    }
    set({
      units,
      inventory,
      salvageQueue,
      salvageCr: s.salvageCr + salvage,
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
      moveTiles: new Map(),
      log: push(
        s.log,
        `⛓ ${t.def.name} crippled & CAPTURED — crews haul the frame (+${salvage}cr salvage)${drop ? ` + ${ITEMS[drop].name}` : ''}`,
      ),
    });
    void persistBattle(get());
    const end = checkEnd(units, s.missionCh, s.turn);
    if (end === 'victory') applyVictory(set, get);
  },

  restart: () =>
    set({
      phase: 'home',
      turn: 1,
      units: [],
      cursor: null,
      selectedUid: null,
      moveTiles: new Map(),
      walk: null,
      pendingMove: null,
      attackTiles: new Set(),
      pendingWeapon: null,
      mapAim: null,
      menuForUid: null,
      spiritForUid: null,
      battle: null,
      battleReaction: null,
      bossWarned: false,
      notice: null,
      log: [],
      enemyBusy: false,
      inspectUid: null,
      tileInfo: null,
      threatTiles: new Set(),
    }),

  tapTile: (p) => {
    const s = get();
    if (s.phase === 'deploy') {
      const u = unitAt(s.units, p);
      if (u?.side === 'player') {
        set({ selectedUid: u.uid });
        return;
      }
      const sel = s.units.find((x) => x.uid === s.selectedUid);
      if (sel && !u && s.deployTiles.has(key(p)) && TERRAIN_INFO[terrainAt(s.map, p)].passable[sel.def.moveType]) {
        const units = s.units.map((x) => (x.uid === sel.uid ? { ...x, pos: p } : x));
        set({ units });
      }
      return;
    }
    if (s.phase !== 'player' || s.battle || s.enemyBusy) return;

    // target selection mode
    if (s.pendingWeapon && s.pendingMove) {
      if (s.pendingWeapon.mapRange != null) {
        // MAP aim: first tap marks the blast zone, a second tap on the same tile commits
        if (s.attackTiles.has(key(p))) {
          if (s.mapAim && same(s.mapAim, p)) get().chooseMapTile(p);
          else set({ mapAim: p });
        } else if (s.mapAim) {
          set({ mapAim: null });
        }
        return;
      }
      const t = unitAt(s.units, p);
      if (t && t.side === 'enemy' && s.attackTiles.has(key(p))) {
        get().chooseTarget(t.uid);
      }
      return;
    }

    // a move is previewed and menu open -> taps handled by menu, ignore map
    if (s.menuForUid) return;

    const u = unitAt(s.units, p);

    // tap an enemy: inspect card + threat-range overlay (fog hides uncontacted hostiles)
    if (u && (u.side === 'enemy' || u.npc) && !s.selectedUid && !(s.missionCh.fog && u.side === 'enemy' && !fogLit(s.units, u.pos))) {
      const threat = threatTilesFor(s.map, s.units, u);
      set({ cursor: p, inspectUid: u.uid, threatTiles: threat, tileInfo: null });
      return;
    }

    if (s.selectedUid) {
      const sel = s.units.find((x) => x.uid === s.selectedUid);
      if (sel && s.moveTiles.has(key(p)) && !unitAt(s.units, p)) {
        get().confirmMove(p);
        return;
      }
      // tapped self tile -> open menu without moving
      if (sel && same(sel.pos, p)) {
        set({ menuForUid: sel.uid, pendingMove: sel.pos, preMovePos: sel.pos, pendingMovedFlag: false, moveTiles: new Map() });
        get().showHint('menu', 'ACTION MENU — pick a weapon to strike targets in range (each row shows HIT % and damage), cast SPIRITS, use ITEMS, or WAIT. Greyed weapons need more WILL or EN.');
        return;
      }
      // tapped elsewhere -> select that unit or deselect
      if (u && u.side === 'player' && !u.acted && !u.npc) {
        get().cancel();
        get().tapTile(p);
        return;
      }
      get().cancel();
      return;
    }

    if (u && u.side === 'player' && u.acted && s.inspectUid) {
      get().clearInspect();
      set({ cursor: p, tileInfo: null });
      return;
    }

    if (u && u.side === 'player' && !u.acted && !u.npc) {
      const tiles = movementRange(s.map, s.units, u);
      set({
        selectedUid: u.uid,
        cursor: p,
        moveTiles: tiles,
        tileInfo: null,
      });
      return;
    }
    set({ cursor: p, tileInfo: p });
  },

  confirmMove: (p) => {
    const s = get();
    const sel = s.units.find((x) => x.uid === s.selectedUid);
    if (!sel) return;
    const units = s.units.map((u) => (u.uid === sel.uid ? { ...u, pos: p, moved: true } : u));
    const path = pathTo(s.moveTiles, p);
    const walking = path.length > 1 ? { uid: sel.uid, path } : null;
    // landing on a salvage crate claims it for the squad
    const crateIdx = s.crates.findIndex((c) => c.pos.x === p.x && c.pos.y === p.y);
    let inventory = s.inventory;
    let crates = s.crates;
    let salvageQueue = s.salvageQueue;
    if (crateIdx >= 0) {
      const itemId = s.crates[crateIdx].itemId;
      inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 };
      crates = s.crates.filter((_, i) => i !== crateIdx);
      salvageQueue = [...s.salvageQueue, ITEMS[itemId]?.name ?? itemId];
    }
    set({ units, walk: walking, pendingMove: p, preMovePos: sel.pos, pendingMovedFlag: !same(sel.pos, p), menuForUid: sel.uid, moveTiles: new Map(), selectedUid: sel.uid, inventory, crates, salvageQueue, tileInfo: null });
    if (crateIdx >= 0) drainSalvage(set, get, walking ? path.length * 320 + 400 : 600);
    detonateMineAt(set, get, sel.uid, p, walking ? path.length * 320 + 300 : 350);
    if (walking) scheduleWalkClear(set, get, sel.uid, path.length);
    // seize objective: landing on the beacon wins the mission on the spot
    if (s.missionCh.objectiveType === 'seize' && sel.side === 'player' && checkEnd(units, s.missionCh, s.turn) === 'victory') {
      setTimeout(() => applyVictory(set, get), walking ? path.length * 320 + 500 : 700);
    }
  },

  cancel: () => {
    const s = get();
    if (s.menuForUid && s.preMovePos) {
      // revert pending move to the tile the unit started on
      const uid = s.menuForUid;
      const back = s.preMovePos;
      const units = s.units.map((u) => (u.uid === uid ? { ...u, pos: back, moved: false } : u));
      set({ units });
    }
    set({
      selectedUid: null,
      moveTiles: new Map(),
      walk: null,
      pendingMove: null,
      preMovePos: null,
      pendingMovedFlag: false,
      attackTiles: new Set(),
      pendingWeapon: null,
      mapAim: null,
      menuForUid: null,
      spiritForUid: null,
      inspectUid: null,
      tileInfo: null,
      threatTiles: new Set(),
    });
  },

  chooseWeapon: (w) => {
    const s = get();
    if (!s.menuForUid || !s.pendingMove) return;
    const u = s.units.find((x) => x.uid === s.menuForUid)!;
    const tiles = new Set<string>();
    if (w.mapRange != null) {
      // MAP weapon: every tile in firing range is a valid blast aim point
      for (const p of attackTilesFor(s.map, s.pendingMove, w, u)) tiles.add(key(p));
    } else {
      for (const e of s.units) {
        if (!e.alive || e.side !== 'enemy') continue;
        if (s.missionCh.fog && !fogLit(s.units, e.pos)) continue; // can't lock what the sensors can't see
        if (weaponsAgainst(u, s.pendingMove, e, s.pendingMovedFlag).some((x) => x.id === w.id)) tiles.add(key(e.pos));
      }
    }
    set({ pendingWeapon: w, attackTiles: tiles, mapAim: null });
  },

  chooseTarget: (uid) => {
    const s = get();
    if (!s.pendingWeapon || !s.menuForUid) return;
    const att = s.units.find((x) => x.uid === s.menuForUid)!;
    const def = s.units.find((x) => x.uid === uid)!;
    // ALL weapon — volley on every hostile in range, no counters
    if (s.pendingWeapon.all) {
      const w0 = s.pendingWeapon;
      const out = applyAllAttack({ map: s.map, units: s.units, turn: s.turn }, att.uid, w0.id, modsFor(s.bonds, s.units));
      const state = out.state;
      const result = out.result;
      const killCount = deadEnemies(s.units, state.units).length;
      const chain = killCount > 0 ? (s.turn === s.chainTurn ? s.chainCount + killCount : killCount) : s.chainCount;
      const chainBonus = chain > 1 && killCount > 0 ? 30 * chain : 0;
      let log = push(s.log, `◈ ALL ATTACK — ${att.def.name} saturates the field with ${w0.name}${result.hit ? ` for ${result.damage}` : ' — missed'}`);
      for (const sp of result.splash ?? []) log = push(log, `  ${sp.name}: ${sp.hit ? `${sp.damage}${sp.destroyed ? ' — DESTROYED' : ''}` : 'missed'}`);
      if (chainBonus) log = push(log, `⛓ CHAIN ×${chain} — +${chainBonus}cr bonus salvage`);
      for (const e of result.expEvents) log = push(log, e);
      for (const q of defeatQuotes(s.units, state.units, att)) log = push(log, q);
      const attAfter = state.units.find((u) => u.uid === att.uid)!;
      const defAfter = state.units.find((u) => u.uid === uid)!;
      const dead = deadEnemies(s.units, state.units);
      const common = {
        units: state.units,
        log,
        kills: s.kills + killCount,
        chainTurn: killCount > 0 ? s.turn : s.chainTurn,
        chainCount: chain,
        salvageCr: s.salvageCr + chainBonus,
        killsByDef: tallyKills(s.killsByDef, dead),
        pendingWeapon: null,
        mapAim: null,
        attackTiles: new Set<string>(),
        menuForUid: null,
        pendingMove: null,
        selectedUid: null,
      };
      if (s.settings.battleMode === 'off') {
        const end = checkEnd(state.units, s.missionCh, s.turn);
        if (end === 'victory') {
          set(common);
          applyVictory(set, get);
          return;
        }
        set({ ...common, battle: null, phase: end === 'defeat' ? 'defeat' : 'player' });
        return;
      }
      set({
        ...common,
        battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: w0, result },
        phase: 'battle',
      });
      return;
    }
    const reaction = aiPickReaction(att, def, s.pendingWeapon, s.map);
    let { state, result } = applyAttack({ map: s.map, units: s.units, turn: s.turn, blizzard: s.blizzard }, att.uid, uid, s.pendingWeapon.id, modsFor(s.bonds, s.units), reaction);
    // SRW support attack — an ally beside the shooter chips in at reduced damage
    if (def.side === 'enemy' && state.units.find((u) => u.uid === uid)!.alive) {
      const sup = findSupport(state.units, att.uid, state.units.find((u) => u.uid === uid)!);
      if (sup) {
        const out = applySupportStrike(state, sup.uid, uid, modsFor(s.bonds, s.units));
        if (out) {
          state = out.state;
          result = { ...result, support: { name: sup.def.name, hit: out.result.hit, damage: out.result.damage, destroyed: out.result.destroyed, hitChance: out.result.hitChance } };
          result.expEvents = [...result.expEvents, ...out.result.expEvents];
        }
      }
    }
    const attAfter = state.units.find((u) => u.uid === att.uid)!;
    const defAfter = state.units.find((u) => u.uid === uid)!;
    const warning = def.def.boss && !s.bossWarned ? `${def.def.name} — ${def.def.pilot.name}` : undefined;
    let log = push(
      s.log,
      result.hit
        ? `${att.def.name} hits ${def.def.name} with ${s.pendingWeapon.name} for ${result.damage}${result.crit ? ' CRIT!' : ''}${result.pincer ? ' ⇄PIN' : ''}${result.destroyed ? ' — DESTROYED' : ''}`
        : `${att.def.name} missed ${def.def.name} (${result.hitChance}%)`,
    );
    if (reaction === 'defend') log = push(log, `${def.def.name} braces — damage halved`);
    if (reaction === 'evade') log = push(log, `${def.def.name} goes evasive (-30% hit)`);
    let log2 = result.counter
      ? push(
          log,
          result.counter.hit
            ? `${def.def.name} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`
            : `${def.def.name}'s counter missed`,
        )
      : log;
    if (result.support) log2 = push(log2, `⇒ ${result.support.name} support fire: ${result.support.hit ? `${result.support.damage}${result.support.destroyed ? ' — DESTROYED' : ''}` : 'missed'}`);
    // combination attack: the partner unit burns its own action joining the strike
    const partnerId = s.pendingWeapon.comboPartner;
    if (partnerId) {
      const partner = state.units.find((u) => u.def.id === partnerId && u.side === 'player' && u.alive);
      if (partner) {
        partner.moved = true;
        partner.acted = true;
        log2 = push(log2, `⇒ ${partner.def.name} joins in — TWIN ATTACK`);
      }
    }
    for (const e of result.expEvents) log2 = push(log2, e);
    for (const q of defeatQuotes(s.units, state.units, att)) log2 = push(log2, q);
    const dead = deadEnemies(s.units, state.units);
    const killCount = dead.length;
    // kill-chain: every kill beyond the first on the same turn pays bonus salvage
    const chain = killCount > 0 ? (s.turn === s.chainTurn ? s.chainCount + killCount : killCount) : s.chainCount;
    const chainBonus = chain > 1 && killCount > 0 ? 30 * chain : 0;
    if (chainBonus) log2 = push(log2, `⛓ CHAIN ×${chain} — +${chainBonus}cr bonus salvage`);
    const quip = bondQuip(s, att, dead);
    if (quip) log2 = push(log2, `♥ ${quip}`);
    let inventory = s.inventory;
    let salvageQueue = s.salvageQueue;
    for (let i = 0; i < killCount; i++) {
      const drop = rollDrop();
      if (drop) {
        inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
        log2 = push(log2, `Salvaged ${ITEMS[drop].name} from the wreck`);
        salvageQueue = [...salvageQueue, ITEMS[drop].name];
      }
    }
    if (vossenDowned(s.units, state.units)) {
      inventory = { ...inventory, megaKit: (inventory.megaKit ?? 0) + 1 };
      log2 = push(log2, "Cpt. Vossen's wreck spills a cache — Mega Repair Kit acquired");
      salvageQueue = [...salvageQueue, ITEMS.megaKit.name];
    }
    let carrierCr = 0;
    if (dead.some((d) => d.def.carrier)) {
      carrierCr = 600;
      const drop = rollDrop() ?? 'repairKit';
      inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
      log2 = push(log2, `💰 CARRIER DOWN — crews crack the cargo hold: +${carrierCr}cr + ${ITEMS[drop].name}`);
      salvageQueue = [...salvageQueue, ITEMS[drop].name];
      setTimeout(() => set({ notice: '💰 CARRIER DOWN — cargo secured (+600cr)' }), 900);
      setTimeout(() => set({ notice: null }), 3100);
    }
    const common = {
      units: state.units,
      log: log2,
      inventory,
      salvageQueue,
      kills: s.kills + killCount,
      chainTurn: killCount > 0 ? s.turn : s.chainTurn,
      chainCount: chain,
      salvageCr: s.salvageCr + chainBonus + carrierCr,
      pendingWeapon: null,
      mapAim: null,
      attackTiles: new Set<string>(),
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
      vossenDefeated: s.vossenDefeated || vossenDowned(s.units, state.units),
      killsByDef: tallyKills(s.killsByDef, dead),
    };
    if (s.settings.battleMode === 'off') {
      const end = checkEnd(state.units, s.missionCh, s.turn);
      if (end === 'victory') {
        set(common);
        applyVictory(set, get);
        return;
      }
      set({ ...common, battle: null, phase: end === 'defeat' ? 'defeat' : 'player' });
      return;
    }
    set({
      ...common,
      bossWarned: s.bossWarned || !!warning,
      battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: s.pendingWeapon, result, warning },
      phase: 'battle',
    });
  },

  chooseMapTile: (p) => {
    const s = get();
    if (!s.pendingWeapon || !s.menuForUid || s.pendingWeapon.mapRange == null) return;
    const att = s.units.find((x) => x.uid === s.menuForUid)!;
    const w = s.pendingWeapon;
    // refuse an empty blast so the player can re-aim instead of wasting the shot
    const targets = s.units.filter((u) => u.alive && u.uid !== att.uid && dist(u.pos, p) <= (w.mapRange ?? 0));
    if (!targets.length) {
      set({ log: push(s.log, `${w.name}: no units in the blast — pick another tile`) });
      return;
    }
    const { state, result } = applyMapAttack({ map: s.map, units: s.units, turn: s.turn }, att.uid, p, w.id, modsFor(s.bonds, s.units));
    const primary = targets.slice().sort((a, b) => dist(a.pos, p) - dist(b.pos, p))[0];
    const attAfter = state.units.find((u) => u.uid === att.uid)!;
    const defAfter = state.units.find((u) => u.uid === primary.uid) ?? primary;
    let log2 = push(s.log, `${att.def.name} fires ${w.name} — ${result.splash!.length + 1} units in the blast`);
    for (const sp of result.splash!) log2 = push(log2, `  ${sp.name}: ${sp.hit ? `${sp.damage}${sp.destroyed ? ' — DESTROYED' : ''}` : 'missed'}`);
    for (const e of result.expEvents) log2 = push(log2, e);
    for (const q of defeatQuotes(s.units, state.units, att)) log2 = push(log2, q);
    let inventory = s.inventory;
    let salvageQueue = s.salvageQueue;
    if (vossenDowned(s.units, state.units)) {
      inventory = { ...inventory, megaKit: (inventory.megaKit ?? 0) + 1 };
      log2 = push(log2, "Cpt. Vossen's wreck spills a cache — Mega Repair Kit acquired");
      salvageQueue = [...salvageQueue, ITEMS.megaKit.name];
    }
    const mapKills = deadEnemies(s.units, state.units).length;
    const mapChain = mapKills > 0 ? (s.turn === s.chainTurn ? s.chainCount + mapKills : mapKills) : s.chainCount;
    const mapChainBonus = mapChain > 1 && mapKills > 0 ? 30 * mapChain : 0;
    if (mapChainBonus) log2 = push(log2, `⛓ CHAIN ×${mapChain} — +${mapChainBonus}cr bonus salvage`);
    const common = {
      units: state.units,
      log: log2,
      inventory,
      salvageQueue,
      vossenDefeated: s.vossenDefeated || vossenDowned(s.units, state.units),
      killsByDef: tallyKills(s.killsByDef, deadEnemies(s.units, state.units)),
      kills: s.kills + deadEnemies(s.units, state.units).length,
      chainTurn: mapKills > 0 ? s.turn : s.chainTurn,
      chainCount: mapChain,
      salvageCr: s.salvageCr + mapChainBonus,
      pendingWeapon: null,
      mapAim: null,
      attackTiles: new Set<string>(),
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
    };
    if (s.settings.battleMode === 'off') {
      const end = checkEnd(state.units, s.missionCh, s.turn);
      if (end === 'victory') {
        set(common);
        applyVictory(set, get);
        return;
      }
      set({ ...common, battle: null, phase: end === 'defeat' ? 'defeat' : 'player' });
      return;
    }
    set({
      ...common,
      battle: { attacker: { ...att }, defender: { ...primary }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: w, result },
      phase: 'battle',
    });
  },

  setReaction: (r) => {
    const s = get();
    if (!s.battle?.needsReaction) return;
    set({ battleReaction: r });
  },

  waitUnit: () => {
    const s = get();
    if (!s.menuForUid) return;
    const uid = s.menuForUid;
    const units = s.units.map((u) => (u.uid === uid ? { ...u, acted: true, moved: true } : u));
    set({ units, menuForUid: null, pendingMove: null, selectedUid: null, moveTiles: new Map(), inspectUid: null, threatTiles: new Set() });
  },

  openSpirits: (uid) => set({ spiritForUid: uid }),

  beginMission: () => {
    if (get().phase !== 'deploy') return; // guard: only launchable from the deploy screen
    set({ phase: 'dialog', selectedUid: null, deployTiles: new Set(), moveTiles: new Map() });
  },
  finishMidDialog: () => set({ midDialog: null }),
  gotoCredits: () => set({ phase: 'credits' }),

  castSpirit: (uid, sp) => {
    const s = get();
    const target = s.units.find((x) => x.uid === uid);
    if (!target || target.sp < SPIRITS[sp].cost) {
      set({ spiritForUid: null });
      return;
    }
    // Trust needs a wounded ally in reach — refuse without spending SP
    if (sp === 'trust' && !s.units.some((u) => u.alive && u.uid !== uid && u.side === target.side && dist(u.pos, target.pos) <= 2 && u.hp < u.def.maxHp)) {
      set({ spiritForUid: null, log: push(s.log, 'Trust: no wounded ally within 2 tiles') });
      return;
    }
    const units = s.units.map((u) => {
      if (u.uid !== uid) return u;
      const c = { ...u };
      applySpirit(c, sp);
      return c;
    });
    // area spirits — rouse/disrupt affect neighbours within 2 tiles
    if (sp === 'rouse' || sp === 'disrupt') {
      const src = units.find((x) => x.uid === uid)!;
      for (const u2 of units) {
        if (u2.uid === uid || !u2.alive) continue;
        const d = Math.abs(u2.pos.x - src.pos.x) + Math.abs(u2.pos.y - src.pos.y);
        if (d > 2) continue;
        if (sp === 'rouse' && u2.side === src.side) u2.will = Math.min(150, u2.will + 10);
        if (sp === 'disrupt' && u2.side !== src.side) u2.will = Math.max(100, u2.will - 10);
      }
    }
    // trust — heal the most wounded ally within 2 tiles for 30% HP
    let trustLog: string | null = null;
    if (sp === 'trust') {
      const src = units.find((x) => x.uid === uid)!;
      const tgt = units
        .filter((u2) => u2.alive && u2.uid !== uid && u2.side === src.side && dist(u2.pos, src.pos) <= 2 && u2.hp < u2.def.maxHp)
        .sort((a, b) => a.hp / a.def.maxHp - b.hp / b.def.maxHp)[0];
      if (tgt) {
        tgt.hp = Math.min(tgt.def.maxHp, tgt.hp + Math.round(tgt.def.maxHp * 0.3));
        trustLog = `Trust restores ${tgt.def.name} +30% HP`;
      }
    }
    const u = units.find((x) => x.uid === uid)!;
    const tiles = movementRange(s.map, units, u);
    set({
      units,
      spiritForUid: null,
      log: trustLog ? push(push(s.log, `${u.def.name} uses ${SPIRITS[sp].name}`), trustLog) : push(s.log, `${u.def.name} uses ${SPIRITS[sp].name}`),
      moveTiles: s.menuForUid ? new Map() : tiles,
    });
  },

  finishBattle: () => {
    const s = get();
    // a pending reaction prompt can't be skipped — a tap counts as choosing COUNTER (SRW's default)
    if (s.battle?.needsReaction) {
      get().setReaction('counter');
      return;
    }
    const end = checkEnd(s.units, s.missionCh, s.turn);
    if (end === 'victory') {
      applyVictory(set, get);
      return;
    }
    set({ battle: null, battleReaction: null, phase: end === 'defeat' ? 'defeat' : s.enemyBusy ? 'enemy' : 'player' });
    if (!end && !s.enemyBusy) drainSalvage(set, get, 400);
  },

  endTurn: () => {
    const s = get();
    if (s.phase !== 'player' || s.enemyBusy) return;
    get().cancel();
    void persistBattle(get());
    const healed: string[] = [];
    const units = s.units.map((u) => {
      if (u.side !== 'enemy' || !u.alive) return u.side === 'player' && (u.dodges ?? 0) > 0 ? { ...u, dodges: 0 } : u; // evasion decay resets as each side's phase begins
      const c = { ...u, dodges: 0 };
      const r = phaseRecovery(c, s.map);
      if (r.hpGain > 0) healed.push(`${c.def.name} +${r.hpGain} HP`);
      if (r.hpLoss > 0) healed.push(`${c.def.name} -${r.hpLoss} HP (burning terrain)`);
      return c;
    });
    let log = push(s.log, `— Turn ${s.turn} enemy phase —`);
    for (const l of healed) log = push(log, l);
    set({ phase: 'enemy', enemyBusy: true, units, log, inspectUid: null, tileInfo: null, threatTiles: new Set() });
    get().showHint('phase', 'ENEMY PHASE — hostiles move and strike. Units that kept COUNTER answer back automatically.');
    void runEnemyPhase(set, get);
  },
}));

// ---------- enemy phase driver ----------

type SetFn = (fn: Partial<Store> | ((s: Store) => Partial<Store>)) => void;
type Get = () => Store;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Reconstruct the tile-by-tile walked path to `dest` from movementRange records. */
function pathTo(recs: Map<string, MoveRec>, dest: Pos): Pos[] {
  const out: Pos[] = [];
  let cur = recs.get(key(dest));
  for (let g = 0; cur && g < 60; g++) {
    out.unshift(cur.pos);
    cur = cur.from ? recs.get(key(cur.from)) : undefined;
  }
  return out;
}

let walkTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleWalkClear(set: SetFn, get: Get, uid: string, len: number) {
  if (walkTimer) clearTimeout(walkTimer);
  walkTimer = setTimeout(() => {
    walkTimer = null;
    if (get().walk?.uid === uid) set({ walk: null });
  }, Math.min(2400, len * 220 + 150));
}

// award credits + persist pilot levels & kills when a mission is won
/** Battle rank: 100 score, -20 per unit lost, -6 per turn over par, +10 for mastery. S>=95 A>=80 B>=60 else C. */
const RANK_ORDER = { S: 4, A: 3, B: 2, C: 1 } as const;
type Rank = keyof typeof RANK_ORDER;
function battleRank(unitsLost: number, turn: number, parTurns: number, masteryEarned: boolean): Rank {
  const over = Math.max(0, turn - 1 - parTurns);
  const score = Math.max(0, Math.min(100, 100 - unitsLost * 20 - over * 6 + (masteryEarned ? 10 : 0)));
  return score >= 95 ? 'S' : score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';
}
function betterRank(prev: Rank | undefined, next: Rank): Rank {
  return prev && RANK_ORDER[prev] >= RANK_ORDER[next] ? prev : next;
}

/** Cpt. Vossen always goes down carrying a cache — first downing in a mission guarantees the drop. */
/** Enemy units destroyed between two snapshots — kills count only hostiles, never player losses. */
/** fog-of-war sight radius — a tile/enemy is lit when any live player unit is this close */
export const FOG_RANGE = 4;
export function fogLit(units: UnitState[], p: Pos): boolean {
  return units.some((u) => u.alive && u.side === 'player' && dist(u.pos, p) <= FOG_RANGE);
}

function deadEnemies(before: UnitState[], after: UnitState[]): UnitState[] {
  const afterAlive = new Set(after.filter((u) => u.alive).map((u) => u.uid));
  return before.filter((u) => u.side === 'enemy' && u.alive && !afterAlive.has(u.uid));
}
function tallyKills(acc: Record<string, number>, dead: UnitState[]): Record<string, number> {
  if (!dead.length) return acc;
  const next = { ...acc };
  for (const u of dead) next[u.def.id] = (next[u.def.id] ?? 0) + 1;
  return next;
}

/** Bond banter — when a bonded partner stands within 2 tiles of the kill, they call it out. */
const KILL_QUIPS: Record<string, string> = {
  valstray: 'Ray: "That\'s how the X-1 does it!"',
  gruntborg: 'Gara: "Heavy support on point."',
  arielis: 'Mira: "Clean shot. Keep them coming."',
  zephyra: 'Orin: "Beautiful work, wingmate."',
  raxdenR: 'Rax: "Hah — leave some for me!"',
  vexiaX: 'Vee: "Swift and sharp."',
};
function bondQuip(s: Store, killer: UnitState, dead: UnitState[]): string | null {
  if (!dead.length || killer.side !== 'player') return null;
  const partner = s.units.find(
    (u) => u.alive && u.side === 'player' && !u.npc && u.uid !== killer.uid && dist(u.pos, killer.pos) <= 2 && bondLevel(s.bonds, u.def.id, killer.def.id) > 0,
  );
  return partner ? (KILL_QUIPS[partner.def.id] ?? null) : null;
}

function vossenDowned(before: UnitState[], after: UnitState[]): boolean {
  const wasUp = before.some((u) => u.def.id === 'vossDrake' && u.alive);
  const isUp = after.some((u) => u.def.id === 'vossDrake' && u.alive);
  return wasUp && !isUp;
}

/** VR simulator: routing a wave warps in a bigger one and restores the squad a little. */
function simNextWave(set: SetFn, get: Get) {
  const s = get();
  const wave = s.simWave + 1;
  const lvl = s.missionCh.lvl + wave;
  const comp = enemyComp({ ...s.missionCh, count: Math.min(3 + wave, 8), boss: undefined });
  const occupied = new Set(s.units.filter((u) => u.alive).map((u) => key(u.pos)));
  const free: Pos[] = [];
  for (let x = Math.max(0, s.map.cols - 6); x < s.map.cols; x++)
    for (let y = 0; y < s.map.rows; y++) {
      const p = { x, y };
      const t = TERRAIN_INFO[terrainAt(s.map, p)];
      if (t.passable.land && !t.hpDmg && !occupied.has(key(p))) free.push(p);
    }
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  const news: UnitState[] = [];
  comp.forEach((defId, i) => {
    const pos = free[i] ?? { x: s.map.cols - 1, y: i };
    const u = makeUnit(defId, 'enemy', pos, `sim${wave}-${i}`);
    u.level = lvl;
    ngEnemy(u, s.ngPlus);
    hardEnemy(u, s.settings.difficulty ?? 'normal');
    if (wave % 4 === 0) {
      u.elite = true;
      u.def = { ...u.def, name: `Elite ${u.def.name}`, accent: '#ffd34d', maxHp: Math.round(u.def.maxHp * 1.2), armor: u.def.armor + 150, mobility: u.def.mobility + 8 };
      u.hp = u.def.maxHp;
    }
    news.push(u);
  });
  const healed = s.units.map((u) => (u.side !== 'player' || !u.alive ? u : { ...u, hp: Math.min(u.def.maxHp, u.hp + Math.round(u.def.maxHp * 0.25)), en: Math.min(u.def.maxEn, u.en + 30), moved: false, acted: false, dodges: 0 }));
  const units = healed.concat(news);
  // every 3rd wave a supply crate warps in with the hostiles
  let crates = s.crates;
  const crateItems = ['repairKit', 'enCell', 'ammoBox', 'megaKit', 'spiritWing'];
  if (wave % 3 === 0 && free.length > news.length) {
    crates = [...s.crates, { pos: free[news.length], itemId: crateItems[Math.floor(Math.random() * crateItems.length)] }];
  }
  let log = push(s.log, `— Wave ${wave - 1} cleared — +${(wave - 1) * 150} pts`);
  log = push(log, `▲ WAVE ${wave}: ${news.length} hostiles warp in (Lv ${lvl}${wave % 4 === 0 ? ' · ALL ELITE' : ''}${wave % 3 === 0 ? ' + supply crate' : ''})`);
  const notice = `▲ WAVE ${wave} — ${news.length} HOSTILES INBOUND · ${s.kills * 50 + (wave - 1) * 150} PTS`;
  set({ units, crates, simWave: wave, battle: null, phase: 'player', enemyBusy: false, selectedUid: null, menuForUid: null, spiritForUid: null, pendingWeapon: null, mapAim: null, pendingMove: null, attackTiles: new Set(), hazardWarn: [], blizzard: false, notice, log });
  setTimeout(() => set({ notice: null }), 2600);
}

/** minefields: a unit landing on a mined tile detonates it — 15% maxHP loss, never lethal */
function detonateMineAt(set: SetFn, get: Get, uid: string, p: Pos, delayMs: number) {
  const go = () => {
    const cur = get();
    if (!cur.map.mines?.some((m) => same(m, p))) return;
    const u = cur.units.find((x) => x.uid === uid);
    if (!u?.alive || !same(u.pos, p)) return; // never stepped there (or walked away)
    const dmg = Math.max(1, Math.round(u.def.maxHp * 0.15));
    const units = cur.units.map((x) => (x.uid === uid ? { ...x, hp: Math.max(1, x.hp - dmg) } : x));
    set({
      units,
      map: { ...cur.map, mines: cur.map.mines!.filter((m) => !same(m, p)) },
      notice: `💥 MINEFIELD — ${u.def.name} hit a mine (-${dmg} HP)`,
      log: push(cur.log, `💥 ${u.def.name} detonated a mine — -${dmg} HP`),
    });
    setTimeout(() => set({ notice: null }), 2200);
    if (u.side === 'player') void persistBattle(get());
  };
  if (delayMs > 0) setTimeout(go, delayMs);
  else go();
}

function applyVictory(set: SetFn, get: Get) {
  const s = get();
  if (s.missionCh.sim) {
    simNextWave(set, get);
    return;
  }
  const pilotProg = { ...s.pilotProg };
  const unitsLost = s.units.filter((u) => u.side === 'player' && !u.alive).length;
  const aceLines: string[] = [];
  for (const u of s.units) {
    if (u.side === 'player' && !u.npc) {
      const prev = pilotProg[u.def.id]?.kills ?? 0;
      const total = prev + u.kills;
      pilotProg[u.def.id] = { level: u.level, exp: u.exp, kills: total, pp: u.pp, skills: u.skills };
      if (prev < ACE_KILLS && total >= ACE_KILLS) aceLines.push(`★ ${u.def.pilot.name} is now an ACE (${total} career kills) — deploys at WILL 130`);
      if (prev < ACE_MASTER_KILLS && total >= ACE_MASTER_KILLS) aceLines.push(`★★ ${u.def.pilot.name} attained ACE MASTERY (${total} kills) — permanent +5% hit/dmg, +5 evade`);
      for (const m of MILESTONE_SPIRITS[u.def.id] ?? [])
        if (prev < m.kills && total >= m.kills) aceLines.push(`✦ PILOT MILESTONE — ${u.def.pilot.name} learned ${SPIRITS[m.spirit].name} (${m.kills} career kills)`);
    }
  }
  // each elite destroyed pays a bounty on top of the standard kill credit
  const eliteCr = s.units.filter((u) => u.side === 'enemy' && !u.alive && u.elite).length * 50;
  const side = s.sideId ? ALL_SIDE_MISSIONS.find((m) => m.id === s.sideId) : undefined;
  if (side) {
    const reward = Math.round((side.rewardCr + s.kills * 150 + eliteCr) * (s.settings.difficulty === 'hard' ? 1.25 : 1)) + s.salvageCr;
    const credits = s.credits + reward;
    const inventory = side.rewardItem ? { ...s.inventory, [side.rewardItem]: (s.inventory[side.rewardItem] ?? 0) + 1 } : s.inventory;
    const sideCleared = side.repeatable ? s.sideCleared : [...s.sideCleared, side.id];
    const parS = side.surviveTurns ?? Math.max(6, Math.ceil(side.count * 1.2));
    const rankS = battleRank(unitsLost, s.turn, parS, false);
    const sideRankKey = sideAsChapter({ ...side, lvl: 0 }).id;
    const missionRank = { ...s.missionRank, [sideRankKey]: betterRank(s.missionRank[sideRankKey], rankS) };
    let partsOwned = s.partsOwned;
    const sRankNote = rankS === 'S' && s.missionRank[sideRankKey] !== 'S' && !partsOwned.includes('veteranPlate');
    if (sRankNote) partsOwned = [...partsOwned, 'veteranPlate'];
    set({
      battle: null,
      phase: 'victory',
      credits,
      inventory,
      sideCleared,
      pilotProg,
      sideId: null,
      lastReward: reward,
      lastSalvage: s.salvageCr,
      lastRank: rankS,
      missionRank,
      partsOwned,
      debrief: null,
      salvageQueue: [],
      log: aceLines.reduce((l, line) => push(l, line), push(s.log, `Side quest cleared! +${reward} credits${side.rewardItem ? ` + ${ITEMS[side.rewardItem].name}` : ''} · RANK ${rankS}${sRankNote ? ' · awarded 🛡 VETERAN PLATE' : ''}`)),
    });
    void persist({ chapter: s.chapter, credits, inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg, parts: s.parts, partsOwned, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared, ngPlus: s.ngPlus, route: s.route, missionRank });
    return;
  }
  const ch = s.missionCh;
  const reward = Math.round((800 + ch.id * 150 + s.kills * 150 + eliteCr) * (s.settings.difficulty === 'hard' ? 1.25 : 1)) + (ch.rewardBonus ?? 0);
  // route-variant bonus item (e.g. Route B stealth salvage)
  const inventory = ch.bonusItem ? { ...s.inventory, [ch.bonusItem]: (s.inventory[ch.bonusItem] ?? 0) + 1 } : s.inventory;
  const clearedFinal = s.chapter + 1 >= CHAPTERS_COUNT;
  // beating the final chapter rolls the campaign into New Game+: back to ch.1,
  // keeping levels/upgrades/bonds/items; enemy frames get +18% HP, +10% armor, +6 mobility, +2 lv per cycle
  const ngPlus = clearedFinal ? s.ngPlus + 1 : s.ngPlus;
  const chapter = clearedFinal ? 0 : s.chapter + 1;
  // SRW-point mastery: bonus challenge evaluated on the finishing turn
  let masteryCr = 0;
  let masteryDone = s.masteryDone;
  let lastMastery: string | null = null;
  let log = s.log;
  if (ch.bonusItem) log = push(log, `▣ Route salvage — ${ITEMS[ch.bonusItem].name} acquired`);
  const m = ch.mastery;
  if (m && !masteryDone.includes(ch.id)) {
    const turnsOk = m.maxTurns == null || s.turn <= m.maxTurns;
    const aliveOk = !m.keepAll || s.units.every((u) => u.side !== 'player' || u.alive);
    if (turnsOk && aliveOk) {
      masteryCr = m.rewardCr;
      masteryDone = [...masteryDone, ch.id];
      lastMastery = m.desc;
      log = push(log, `★ MASTERY — ${m.desc}: +${masteryCr} credits`);
    } else {
      log = push(log, `☆ Mastery missed — ${m.desc}`);
    }
  }
  const credits = s.credits + reward + masteryCr + s.salvageCr + (clearedFinal ? 5000 : 0);
  const par = ch.surviveTurns ?? Math.max(6, Math.ceil((ch.count + (ch.boss ? 1 : 0)) * 1.1));
  const rank = battleRank(unitsLost, s.turn, par, lastMastery != null);
  const missionRank = { ...s.missionRank, [ch.id]: betterRank(s.missionRank[ch.id], rank) };
  let partsOwned = s.partsOwned;
  if (rank === 'S' && s.missionRank[ch.id] !== 'S' && !partsOwned.includes('veteranPlate')) {
    partsOwned = [...partsOwned, 'veteranPlate'];
    log = push(log, `★ RANK S — flawless execution! Awarded 🛡 VETERAN PLATE`);
  } else if (rank === 'S') log = push(log, `★ RANK S — flawless execution!`);
  for (const line of aceLines) log = push(log, line);
  set({
    battle: null,
    phase: 'victory',
    credits,
    inventory,
    pilotProg,
    chapter,
    ngPlus,
    sideId: null,
    masteryDone,
    savedBattle: null,
    lastMastery,
    lastRank: rank,
    lastSalvage: s.salvageCr,
    missionRank,
    partsOwned,
    lastReward: reward + masteryCr + (clearedFinal ? 5000 : 0),
    debrief: DEBRIEFS[ch.id] ?? null,
    salvageQueue: [],
    log: push(log, clearedFinal ? `CAMPAIGN COMPLETE — NEW GAME+ ${ngPlus} unlocked! +${reward + masteryCr + 5000} credits` : `Mission complete! +${reward + masteryCr} credits · RANK ${rank}`),
  });
  void clearBattleSave();
  void persist({ chapter, credits, inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg, parts: s.parts, partsOwned, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared: s.sideCleared, ngPlus, masteryDone, route: s.route, missionRank });
}

async function runEnemyPhase(set: SetFn, get: Get) {
  await sleep(650);
  // escort mule — a friendly carrier auto-flees east at the start of each enemy phase;
  // reaching the edge delivers the cargo (victory)
  {
    const s0 = get();
    const mule = s0.units.find((u) => u.alive && u.npc && u.def.carrier && u.side === 'player');
    if (mule) {
      const best = [...movementRange(s0.map, s0.units, mule).values()]
        .map((r) => r.pos)
        .filter((p) => !unitAt(s0.units, p))
        .sort((a, b) => b.x - a.x)[0];
      if (best && !same(best, mule.pos)) {
        const path = pathTo(movementRange(s0.map, s0.units, mule), best);
        set((st) => ({
          units: st.units.map((u) => (u.uid === mule.uid ? { ...u, pos: best } : u)),
          walk: path && path.length > 1 ? { uid: mule.uid, path } : null,
          log: push(st.log, '🛡 Supply Mule advances toward the extraction point'),
        }));
        await sleep(path && path.length > 1 ? 160 + path.length * 190 : 200);
        set({ walk: null });
      }
      const m2 = get().units.find((u) => u.uid === mule.uid);
      if (m2 && m2.pos.x >= get().map.cols - 1) {
        set((st) => ({
          units: st.units.map((u) => (u.uid === mule.uid ? { ...u, alive: false } : u)),
          notice: '🛡 CARGO DELIVERED — the mule reached the extraction point',
          log: push(st.log, '🛡 Supply Mule delivered its cargo east — mission accomplished'),
        }));
        setTimeout(() => set({ notice: null }), 2600);
        await sleep(900);
        applyVictory(set, get);
        return;
      }
    }
  }
  let guard = 0;
  while (guard++ < 20) {
    const s = get();
    if (s.phase !== 'enemy') return;
    const plans = planEnemyActions({ map: s.map, units: s.units, turn: s.turn, blizzard: s.blizzard });
    const remaining = plans.filter((pl) => !s.units.find((u) => u.uid === pl.unit.uid)?.acted);
    const plan = remaining[0];
    if (!plan) break;

    // boss self-cast + phase-2 transformation: below 50% HP the boss snaps once per
    // battle — Grit spirit, permanent +300 armor / +15% damage / full Will, 15% heal
    {
      const boss = s.units.find((u) => u.uid === plan.unit.uid);
      if (boss?.def.boss && !boss.bossBuffed && boss.hp < boss.def.maxHp * 0.5) {
        set((st) => ({
          units: st.units.map((u) => {
            if (u.uid !== boss.uid) return u;
            const c = { ...u, bossBuffed: true, phase2: true, will: MAX_WILL, hp: Math.min(u.def.maxHp, u.hp + Math.round(u.def.maxHp * 0.15)) };
            applySpirit(c, 'grit');
            return c;
          }),
          log: push(st.log, `⚠ PHASE SHIFT — ${boss.def.name} unleashes full power! Armor +300, Will MAX`),
          notice: `⚠ PHASE SHIFT — ${boss.def.name.toUpperCase()}`,
        }));
        bgm('bgm_boss');
        setTimeout(() => set({ notice: null }), 3200);
        await sleep(700);
      }
    }

    // move unit — animate the walk along its BFS path
    {
      const cur0 = get();
      const moving = cur0.units.find((u) => u.uid === plan.unit.uid);
      const path = moving && !same(moving.pos, plan.moveTo) ? pathTo(movementRange(cur0.map, cur0.units, moving), plan.moveTo) : null;
      set((st) => ({
        units: st.units.map((u) => (u.uid === plan.unit.uid ? { ...u, pos: plan.moveTo, moved: true } : u)),
        walk: path && path.length > 1 ? { uid: plan.unit.uid, path } : null,
      }));
      await sleep(path && path.length > 1 ? 160 + path.length * 190 : 200);
      set({ walk: null });
      detonateMineAt(set, get, plan.unit.uid, plan.moveTo, 0);
      // loot carrier reaching the east edge slips away with the cargo
      const mover = get().units.find((u) => u.uid === plan.unit.uid);
      if (mover?.def.carrier && mover.pos.x >= get().map.cols - 1) {
        set((st) => ({
          units: st.units.map((u) => (u.uid === mover.uid ? { ...u, alive: false, acted: true } : u)),
          notice: '🏃 LOOT CARRIER ESCAPED — the salvage is gone',
          log: push(st.log, '🏃 Supply Mule escaped east with the cargo — objective reward lost'),
        }));
        setTimeout(() => set({ notice: null }), 2600);
        await sleep(700);
        continue; // no attack — it's off the map
      }
    }

    if (plan.target && plan.weapon) {
      const cur = get();
      const att = cur.units.find((u) => u.uid === plan.unit.uid)!;
      const def = cur.units.find((u) => u.uid === plan.target!.uid)!;
      // player-controlled defender picks a reaction — SRW's counter/defend/evade/cover choice
      let reaction: Reaction = 'counter';
      let warning: string | undefined;
      let coverUid: string | undefined;
      if (att.def.boss && !cur.bossWarned) warning = `${att.def.name} — ${att.def.pilot.name}`;
      if (def.side === 'player' && cur.settings.battleMode !== 'off') {
        // an adjacent ally that hasn't acted can intercept the blow (SRW cover)
        coverUid = cur.units
          .filter((u) => u.alive && u.side === 'player' && !u.acted && !u.npc && u.uid !== def.uid && dist(u.pos, def.pos) === 1)
          .sort((a, b) => b.hp - a.hp)[0]?.uid;
        set((st) => ({
          phase: 'battle',
          battleReaction: null,
          bossWarned: st.bossWarned || !!warning,
          battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: att, defenderAfter: def, weapon: plan.weapon!, result: { hit: false, crit: false, damage: 0, destroyed: false, hitChance: 0, counter: null, expEvents: [] }, needsReaction: true, warning, coverUid },
        }));
        get().showHint('react', 'INCOMING ATTACK — pick a reaction: COUNTER strikes back · DEFEND halves damage · EVADE improves dodge · COVER an ally beside you takes the hit.');
        await waitFor(() => get().battleReaction !== null, 5500);
        reaction = get().battleReaction ?? 'counter';
        if (reaction === 'cover' && !coverUid) reaction = 'counter';
      }
      if (warning) set({ bossWarned: true });
      const defUid = reaction === 'cover' ? coverUid! : def.uid;
      const { state, result } = applyAttack({ map: cur.map, units: cur.units, turn: cur.turn, blizzard: cur.blizzard }, att.uid, defUid, plan.weapon.id, modsFor(cur.bonds, cur.units), reaction);
      if (reaction === 'cover' && coverUid) {
        const ci = state.units.findIndex((u) => u.uid === coverUid);
        if (ci >= 0) state.units[ci] = { ...state.units[ci], acted: true };
      }
      const attAfter = state.units.find((u) => u.uid === att.uid)!;
      const defAfter = state.units.find((u) => u.uid === defUid)!;
      const tgtName = defAfter.def.name;
      const mkLog = (l: string[]) =>
        result.expEvents.reduce(
          (ll, e) => push(ll, e),
          result.counter
            ? push(
                l,
                `${att.def.name} hits ${tgtName} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''} · ${tgtName} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`,
              )
            : push(
                l,
                result.hit
                  ? `${att.def.name} hits ${tgtName} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''}`
                  : `${att.def.name} missed ${tgtName}`,
              ),
        );
      const rxnLog = (l: string[]) =>
        reaction === 'defend'
          ? push(l, `${tgtName} braces — damage halved`)
          : reaction === 'evade'
            ? push(l, `${tgtName} goes evasive (-30% hit)`)
            : reaction === 'cover'
              ? push(l, `${tgtName} covers ${def.def.name} — intercepts the blow (-30% dmg)`)
              : l;
      if (cur.settings.battleMode === 'off') {
        set((st) => {
          const kc = deadEnemies(cur.units, state.units).length;
          const d = dropsForKills(kc, st.inventory);
          let l = mkLog(st.log);
          for (const x of d.lines) l = push(l, x);
          for (const q of defeatQuotes(cur.units, state.units, att)) l = push(l, q);
          return { units: state.units, kills: st.kills + kc, killsByDef: tallyKills(st.killsByDef, deadEnemies(cur.units, state.units)), inventory: d.inventory, salvageQueue: [...st.salvageQueue, ...d.names], log: rxnLog(l) };
        });
        const end = checkEnd(get().units, get().missionCh, get().turn);
        if (end) {
          if (end === 'victory') applyVictory(set, get);
          else set({ phase: end, enemyBusy: false });
          return;
        }
        await sleep(120);
        continue;
      }
      // the scene shows whoever actually took the hit — the covering ally when covered
      const defForScene = reaction === 'cover' && coverUid ? (cur.units.find((u) => u.uid === coverUid) ?? def) : def;
      set((st) => {
        const kc = deadEnemies(cur.units, state.units).length;
        const d = dropsForKills(kc, st.inventory);
        let l = mkLog(st.log);
        for (const x of d.lines) l = push(l, x);
        for (const q of defeatQuotes(cur.units, state.units, att)) l = push(l, q);
        return {
          units: state.units,
          phase: 'battle',
          kills: st.kills + kc,
          killsByDef: tallyKills(st.killsByDef, deadEnemies(cur.units, state.units)),
          inventory: d.inventory,
          salvageQueue: [...st.salvageQueue, ...d.names],
          log: rxnLog(l),
          battle: { attacker: { ...att }, defender: { ...defForScene }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: plan.weapon!, result, warning },
        };
      });
      // wait for player-visible battle anim to finish (finishBattle returns phase to 'enemy' since enemyBusy)
      await waitFor(() => get().battle === null);
      const end = checkEnd(get().units, get().missionCh, get().turn);
      if (end) {
        if (end === 'victory') {
          applyVictory(set, get);
          return;
        }
        set({ phase: end, enemyBusy: false });
        return;
      }
      await sleep(180);
    } else {
      set((st) => ({ units: st.units.map((u) => (u.uid === plan.unit.uid ? { ...u, acted: true } : u)), log: plan.fleeing ? push(st.log, `${plan.unit.def.name} is falling back!`) : st.log }));
      await sleep(140);
    }
  }

  // new player turn — clear flags + EN regen / base-city heal
  let pendingVictory = false;
  set((st) => {
    const recovered: string[] = [];
    let sectorCr = 0;
    const units = st.units.map((u) => {
      const c = { ...u };
      if (c.side === 'player') clearTransientForOwnPhase(c);
      else {
        c.moved = false;
        c.acted = false;
        c.dodges = 0;
      }
      if (c.alive && c.statuses && c.statuses.length) {
        // status effects tick once per round: burn bleeds HP, stun eats the unit's phase, break shreds armor
        const keep: StatusFx[] = [];
        for (const fx of c.statuses) {
          if (fx.id === 'burn') {
            const dmg = Math.min(c.hp - 1, Math.round(c.def.maxHp * 0.08));
            if (dmg > 0) {
              c.hp -= dmg;
              recovered.push(`${c.def.name} -${dmg} HP (burn)`);
            }
          } else if (fx.id === 'stun') {
            c.acted = true;
            c.moved = true;
            recovered.push(`${c.def.name} is STUNNED`);
          }
          const t = { ...fx, turns: fx.turns - 1 };
          if (t.turns > 0) keep.push(t);
        }
        c.statuses = keep.length ? keep : undefined;
      }
      if (c.alive) {
        const r = phaseRecovery(c, st.map);
        if (r.hpGain > 0) recovered.push(`${c.def.name} +${r.hpGain} HP`);
        if (r.hpLoss > 0) recovered.push(`${c.def.name} -${r.hpLoss} HP (burning terrain)`);
        // sector income — a unit holding a base/city tile draws a stipend each player phase
        const tt = TERRAIN_INFO[terrainAt(st.map, c.pos)];
        if (c.side === 'player' && (tt.hpRegen ?? 0) > 0) {
          sectorCr += 40;
          recovered.push(`${c.def.name} secures the sector +40cr`);
        }
      }
      return c;
    });
    const nextTurn = st.turn + 1;
    // reinforcement wave arrives at the start of this turn — storm in from the right edge
    let notice = st.notice;
    const rf = st.map.reinforce;
    if (rf && nextTurn === rf.turn) {
      const occupied = new Set(units.filter((u) => u.alive).map((u) => key(u.pos)));
      let i = 0;
      for (const defId of rf.comp) {
        outer: for (let x = st.map.cols - 1; x >= st.map.cols - 5; x--)
          for (let y = 0; y < st.map.rows - 1; y++) {
            const k = `${x},${y}`;
            const ti = TERRAIN_INFO[st.map.terrain[y][x]];
            if (!occupied.has(k) && ti.passable.land && !ti.hpDmg) {
              occupied.add(k);
              const nu = makeUnit(defId, 'enemy', { x, y }, `r${nextTurn}x${i++}`);
              nu.level = enemyLevelOf(st.missionCh, defId);
              ngEnemy(nu, st.ngPlus);
              units.push(nu);
              break outer;
            }
          }
      }
      notice = '⚠ ENEMY REINFORCEMENTS';
      recovered.push(`Enemy reinforcements: ${rf.comp.length} units incoming!`);
      setTimeout(() => set({ notice: null }), 2800);
    }
    // mid-battle story event fires once, at the start of its turn
    let midDialog = st.midDialog;
    const eventsFired = st.eventsFired;
    if (st.map.events) {
      const idx = st.map.events.findIndex((e, i) => e.turn === nextTurn && !eventsFired.includes(String(i)));
      if (idx >= 0) {
        midDialog = st.map.events[idx].lines;
        eventsFired.push(String(idx));
      }
    }
    // ion-storm hazards: tiles telegraphed last round detonate now (never lethal — leaves 1 HP)
    for (const hz of st.hazardWarn) {
      for (const v of units.filter((u) => u.alive && same(u.pos, hz))) {
        const dmg = Math.min(v.hp - 1, Math.round(v.def.maxHp * 0.15));
        if (dmg > 0) {
          v.hp -= dmg;
          recovered.push(`${v.def.name} -${dmg} HP (ion storm)`);
        }
      }
    }
    let hazardWarn: Pos[] = [];
    const hz = st.map.hazards;
    if (hz && nextTurn % hz.every === 0) {
      // telegraph the next volley near living units — detonates at the next transition
      const alive = units.filter((u) => u.alive);
      const picked = new Set<string>();
      for (let i = 0; i < hz.count * 10 && hazardWarn.length < hz.count && alive.length; i++) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        const tx = Math.max(0, Math.min(st.map.cols - 1, t.pos.x + Math.floor(Math.random() * 5) - 2));
        const ty = Math.max(0, Math.min(st.map.rows - 1, t.pos.y + Math.floor(Math.random() * 5) - 2));
        const k = `${tx},${ty}`;
        if (!picked.has(k) && TERRAIN_INFO[st.map.terrain[ty][tx]].passable.land) {
          picked.add(k);
          hazardWarn.push({ x: tx, y: ty });
        }
      }
      if (hazardWarn.length) {
        notice = '⚠ ION STORM INCOMING';
        recovered.push('⚠ Ion storm telegraphed — evacuate the marked tiles!');
        setTimeout(() => set({ notice: null }), 2800);
      }
    }
    // blizzard turns on snow fields — ground units lose 15% hit for the whole phase
    const blizzard = st.missionCh.theme === 'snow' && nextTurn % 3 === 0;
    if (blizzard) {
      if (!notice) { notice = '❄ BLIZZARD — ground units -15% hit'; setTimeout(() => set({ notice: null }), 2800); }
      recovered.push('❄ Blizzard sweeps the field — ground units have -15% hit this turn.');
    }
    const end = checkEnd(units, st.missionCh, nextTurn);
    let log = push(st.log, `— Turn ${nextTurn} player phase —`);
    for (const l of recovered) log = push(log, l);
    if (end === 'victory') {
      // survive-objective reached its turn limit — resolve outside this updater
      pendingVictory = true;
      return { units, turn: nextTurn, midDialog, eventsFired, hazardWarn, blizzard, salvageCr: st.salvageCr + sectorCr };
    }
    if (!notice && end !== 'defeat') {
      notice =
        st.missionCh.turnLimit != null && nextTurn === st.missionCh.turnLimit
          ? `⚠ FINAL TURN — objective expires after this phase`
          : `PLAYER PHASE — TURN ${nextTurn}`;
      setTimeout(() => set({ notice: null }), 2400);
    }
    // refresh the danger-zone overlay for the new positions while it stays enabled
    let dangerTiles = st.dangerTiles;
    if (st.dangerZone) {
      dangerTiles = new Set<string>();
      for (const e of units.filter((u) => u.alive && u.side === 'enemy' && !(st.missionCh.fog && !fogLit(units, u.pos)))) for (const t of threatTilesFor(st.map, units, e)) dangerTiles.add(t);
    }
    return {
      units,
      phase: end === 'defeat' ? 'defeat' : 'player',
      enemyBusy: false,
      turn: nextTurn,
      log,
      notice,
      midDialog,
      eventsFired,
      dangerTiles,
      hazardWarn,
      blizzard,
      salvageCr: st.salvageCr + sectorCr,
    };
  });
  if (pendingVictory) applyVictory(set, get);
  else drainSalvage(set, get, 2700); // toast after the PLAYER PHASE banner clears
}

function waitFor(cond: () => boolean, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const t = setInterval(() => {
      if (cond() || Date.now() - t0 > timeoutMs) {
        clearInterval(t);
        resolve();
      }
    }, 120);
  });
}

// selectors
export const alivePlayers = (s: Store) => s.units.filter((u) => u.alive && u.side === 'player');
export const aliveEnemies = (s: Store) => s.units.filter((u) => u.alive && u.side === 'enemy');

// mid-battle autosave — whenever the game settles into the player phase with changed
// units, snapshot the mission so RESUME BATTLE always offers the latest turn state
useGame.subscribe((s, prev) => {
  if (s.missionCh.sim) return; // VR runs never produce resumable battle saves
  if (s.phase !== 'player' || s.battle || s.midDialog || s.enemyBusy) return;
  if (prev.phase === 'player' && prev.units === s.units) return;
  const b: BattleSave = {
    sideId: s.sideId,
    missionCh: s.missionCh,
    map: s.map,
    units: s.units,
    turn: s.turn,
    kills: s.kills,
    bossWarned: s.bossWarned,
    eventsFired: s.eventsFired,
    inventory: s.inventory,
    log: s.log.slice(-30),
    crates: s.crates,
    hazardWarn: s.hazardWarn,
    salvageCr: s.salvageCr,
  };
  useGame.setState({ savedBattle: b });
  try {
    void AsyncStorage.setItem(BATTLE_SAVE_KEY, JSON.stringify(b));
  } catch {}
});
