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
  DUEL_BANTER,
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
  TURN_CHATTER,
} from './campaign';
import { BOND_EVENTS, MAX_BOND, bondKey, bondLevel, bondMods } from './bonds';

/** full attacker mods: bond bonus + rally aura + formation adjacency (+5 hit per adjacent ally, max +10) */
const modsFor = (bonds: Record<string, number>, units: UnitState[]) => (u: UnitState) => {
  const bm = bondMods(bonds, units, u);
  return { hitBonus: bm.hitBonus + rallyBonus(units, u) + formationBonus(units, u) - jammerPenalty(units, u), dmgMult: bm.dmgMult };
};
import { MISSION_SSS, SPIRITS, TERRAIN_INFO, WEAPONS } from './data';
import { bgm, setMusicEnabled, setSoundEnabled } from '../audio';
import {
  aiPickReaction,
  applyAttack,
  isStealthHidden,
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
  maxAmmoOf,
  formationBonus,
  jammerPenalty,
  phaseRecovery,
  planEnemyActions,
  rallyBonus,
  same,
  terrainAt,
  unitAt,
  usableWeapons,
  rangeMaxOf,
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
  snowFox?: boolean; // WHITEOUT honor — won during a blizzard turn
  mirrorWon?: boolean; // MIRROR BREAKER honor — cleared a Σ mirror wave
  arcKill?: boolean; // CHAIN REACTION honor — chain arc scored a kill
  blastKill?: boolean; // SATURATION honor — 4+ foes down in one strike
  extremeWon?: boolean; // OVERLORD honor — won a mission on EXTREME
  wounded?: string[]; // pilot def ids flying wounded (downed last mission)
  shepHon?: boolean; // SHEPHERD honor — convoy reached safety unscathed
  flawlessHon?: boolean; // FLAWLESS honor — no unit lost on a Ch.10+ mission
  maxHitEver?: number; // ANNIHILATOR honor — biggest single hit ever landed
}

/** Serialized mid-battle snapshot — lets the player leave a mission and resume it later. */
export interface BattleSave {
  sideId: string | null;
  missionCh: ChapterDef;
  map: MapDef;
  units: UnitState[];
  turn: number;
  kills: number;
  altKill?: boolean;
  decoyHit?: boolean;
  iFieldKill?: boolean;
  arcKill?: boolean;
  blastKill?: boolean;
  lostAlly?: boolean;
  rescuedPods?: string[];
  snipeKill?: boolean;
  bossRush?: boolean;
  usedResupply?: boolean;
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
  wounded: string[]; // pilots downed in the previous battle — sortie weakened
  snowFox: boolean;
  mirrorWon: boolean;
  arcKill: boolean;
  blastKill: boolean;
  lostAlly: boolean;
  /** escape pods recovered this battle — pilot of each def.id spared the wounded penalty */
  rescuedPods: string[];
  snipeKill: boolean;
  bossRush: boolean;
  usedResupply: boolean;
  extremeWon: boolean;
  shepHon: boolean;
  /** a frame transformed at least once this battle (FORMA SHIFT honor) */
  transformed: boolean;
  /** a spirit was cast or item used this battle (RAW POWER honor) */
  usedSupport: boolean;
  /** a kill was scored by a unit in transformed form this battle (GHOSTDANCER honor) */
  altKill: boolean;
  decoyHit: boolean;
  iFieldKill: boolean;
  flawlessHon: boolean;
  maxHitEver: number;
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
  sellItem: (itemId: string) => void;
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
  overwatchUnit: () => void;
  swapUnit: () => void;
  transformUnit: (uid: string) => void;
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

function hardEnemy(u: UnitState, difficulty: 'normal' | 'hard' | 'extreme') {
  if (difficulty === 'hard') {
    u.def = { ...u.def, maxHp: Math.round(u.def.maxHp * 1.15), armor: Math.round(u.def.armor * 1.1), mobility: u.def.mobility + 8 };
    u.hp = u.def.maxHp;
    u.level += 2;
  } else if (difficulty === 'extreme') {
    u.def = { ...u.def, maxHp: Math.round(u.def.maxHp * 1.3), armor: Math.round(u.def.armor * 1.2), mobility: u.def.mobility + 14 };
    u.hp = u.def.maxHp;
    u.level += 4;
    // extreme frames run veteran crews — counter-cut, deadlier crits, nanite regen
    u.skills = { ...u.skills, countercut: 3, crit: 4, regen: 2 };
  }
}

function buildMission(ch: ChapterDef, pilotProg: Store['pilotProg'], upgrades: UpgradeMap, wupg: WeaponUpgMap, deploySel: string[], ngPlus: number, parts: Record<string, string[]>, difficulty: 'normal' | 'hard' | 'extreme' = 'normal', vossenAllied = false, woundedIds: string[] = []): { map: MapDef; units: UnitState[] } {
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
      u.skills = { hit: 0, evade: 0, dmg: 0, def: 0, countercut: 0, esave: 0, hitrun: 0, crit: 0, scavenger: 0, regen: 0, riposte: 0, ...(prog.skills ?? {}) };
      if ((prog.kills ?? 0) >= ACE_KILLS) u.will = 130; // ace pilots start hot
      if ((prog.kills ?? 0) >= ACE_MASTER_KILLS) u.aceMastery = true;
      // career-kill milestones: extra spirits the pilot learned along the war
      const earned = (MILESTONE_SPIRITS[s.defId] ?? []).filter((m) => (prog.kills ?? 0) >= m.kills).map((m) => m.spirit);
      if (earned.length) u.bonusSpirits = earned;
    }
    u.parts = (parts[s.defId] ?? []).slice(0, MAX_PART_SLOTS);
    u.wounded = woundedIds.includes(s.defId);
    const ap = partBonus(u, 'ammoPct');
    if (ap) for (const k of Object.keys(u.ammo)) u.ammo[k] = Math.ceil(u.ammo[k] * (1 + ap / 100));
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

async function persist(s: Pick<Store, 'chapter' | 'credits' | 'inventory' | 'upgrades' | 'pilotProg' | 'weaponUpg' | 'bonds' | 'bondSeen' | 'sideCleared' | 'ngPlus' | 'parts' | 'partsOwned'> & Partial<Pick<Store, 'masteryDone' | 'hintsSeen' | 'route' | 'honorsClaimed' | 'missionRank' | 'snowFox' | 'extremeWon' | 'shepHon' | 'flawlessHon' | 'maxHitEver' | 'wounded'>>) {
  const data: SaveData = { chapter: s.chapter, credits: s.credits, inventory: s.inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg: s.pilotProg, parts: s.parts, partsOwned: s.partsOwned, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared: s.sideCleared, ngPlus: s.ngPlus, masteryDone: s.masteryDone, hintsSeen: s.hintsSeen, route: s.route, honorsClaimed: s.honorsClaimed, missionRank: s.missionRank, simBest: useGame.getState().simBest, vossenDefeated: useGame.getState().vossenDefeated, killsByDef: useGame.getState().killsByDef, snowFox: useGame.getState().snowFox, mirrorWon: useGame.getState().mirrorWon, arcKill: useGame.getState().arcKill, blastKill: useGame.getState().blastKill, extremeWon: useGame.getState().extremeWon, shepHon: useGame.getState().shepHon, flawlessHon: useGame.getState().flawlessHon, maxHitEver: useGame.getState().maxHitEver, wounded: useGame.getState().wounded };
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
    kills: s.kills, altKill: s.altKill, arcKill: s.arcKill, blastKill: s.blastKill, lostAlly: s.lostAlly, rescuedPods: s.rescuedPods, snipeKill: s.snipeKill, bossRush: s.bossRush, usedResupply: s.usedResupply,
    decoyHit: s.decoyHit,
    iFieldKill: s.iFieldKill,
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
function rollDrop(force = false, bonusPct = 0): keyof typeof ITEMS | null {
  return force || Math.random() < 0.25 + bonusPct / 100 ? DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)] : null;
}
/** Salvage Arm part — squad-wide +25% drop chance while an equipped frame stands. */
function dropBonusPct(units: UnitState[]): number {
  return units.some((u) => u.alive && u.parts?.includes('salvageArm')) ? 25 : 0;
}
/** Lucky spirit — the next kill yields guaranteed supplies and +25cr salvage per enemy level. */
/** Overdrive spirit — a kill refunds the attacker's action (consumed on use). */
function applyOverdrive(units: UnitState[], attackerUid: string, kills: number, log: string[]): string[] {
  if (kills <= 0) return log;
  const att = units.find((u) => u.uid === attackerUid);
  if (!att?.alive || !att.againOnKill) return log;
  att.againOnKill = false;
  att.acted = false;
  att.moved = true;
  return push(log, `⚡ OVERDRIVE — ${att.def.name} presses the attack again!`);
}

/** Track the largest single hit ever landed — feeds the ANNIHILATOR honor. */
function trackMaxHit(get: () => { maxHitEver: number }, set: (p: { maxHitEver: number }) => void, r: AttackResult): void {
  const m = Math.max(get().maxHitEver ?? 0, r.damage ?? 0, r.counter?.damage ?? 0, r.support?.damage ?? 0, ...(r.splash ?? []).map((x) => x.damage));
  if (m !== (get().maxHitEver ?? 0)) set({ maxHitEver: m });
}

function applyLucky(units: UnitState[], attackerUid: string, dead: UnitState[]): { cr: number; drop?: keyof typeof ITEMS } {
  const att = units.find((u) => u.uid === attackerUid);
  if (!att?.luckyForNextKill || dead.length === 0) return { cr: 0 };
  att.luckyForNextKill = false;
  return { cr: dead.reduce((n, d) => n + d.level * 25, 0), drop: DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)] };
}
/** Roll salvage drops for `n` kills — returns updated inventory + log lines + item names for the map toast. */
function dropsForKills(n: number, inventory: Record<string, number>, bonusPct = 0): { inventory: Record<string, number>; lines: string[]; names: string[] } {
  const lines: string[] = [];
  const names: string[] = [];
  let inv = inventory;
  for (let i = 0; i < n; i++) {
    const drop = rollDrop(false, bonusPct);
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
  wounded: [] as string[],
  snowFox: false,
  mirrorWon: false,
  arcKill: false,
  blastKill: false,
  lostAlly: false,
  rescuedPods: [],
  snipeKill: false,
  bossRush: false,
    extremeWon: false,
    shepHon: false,
    transformed: false,
    usedSupport: false,
    usedResupply: false,
    altKill: false,
    decoyHit: false,
    iFieldKill: false,
    flawlessHon: false,
    maxHitEver: 0,
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
    const cellGranted = allied && grantDrakeCell(set, get);
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, [], s.ngPlus, s.parts, s.settings.difficulty ?? 'normal', allied);
    void clearBattleSave();
    set({ phase: 'player', sideId: id, missionCh: { ...ch, seizePos: map.beaconPos, reachPos: map.reachPos }, map, units, crates: map.crates ?? [], kills: 0, salvageCr: 0, turn: 1, bossWarned: false, savedBattle: null, simWave: 0, log: [`${m.repeatable ? 'PATROL OP' : 'SIDE QUEST'}: ${m.name}`, `Objective: ${ch.objective}`, ...(allied ? [`🤝 Cpt. Vossen: "I've seen enough. Ark — the Drake flies on your wing now."`] : []), ...(cellGranted ? [`▣ Drake's Cell integrated — unique part acquired`] : [])], inspectUid: null, tileInfo: null, dangerZone: false, dangerTiles: new Set(), threatTiles: new Set(), hazardWarn: [], blizzard: false, midDialog: null, eventsFired: [], notice: 'PLAYER PHASE — TURN 1', usedSupport: false, altKill: false, decoyHit: false, iFieldKill: false, arcKill: false, blastKill: false, lostAlly: false, rescuedPods: [], snipeKill: false, bossRush: false, usedResupply: false });
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
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, [], s.ngPlus, s.parts, s.settings.difficulty ?? 'normal', false, s.wounded);
    // VR runs are ephemeral and never autosave — keep any prior mission snapshot
    // so the ops board still offers RESUME for it after the run ends.
    set({ phase: 'player', sideId: null, missionCh: { ...ch, seizePos: map.beaconPos, reachPos: map.reachPos }, map, units, crates: map.crates ?? [], kills: 0, salvageCr: 0, turn: 1, bossWarned: false, savedBattle: s.savedBattle, simWave: 1, simSettled: false, log: ['▲ VR SIMULATION — WAVE 1', `Objective: ${ch.objective}`, 'Waves escalate. The run ends when the squad falls.'], inspectUid: null, tileInfo: null, dangerZone: false, dangerTiles: new Set(), threatTiles: new Set(), hazardWarn: [], blizzard: false, midDialog: null, eventsFired: [], notice: '▲ VR SIMULATION — WAVE 1', usedSupport: false, altKill: false, decoyHit: false, iFieldKill: false, arcKill: false, blastKill: false, lostAlly: false, rescuedPods: [], snipeKill: false, bossRush: false, usedResupply: false });
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
    set({ hasSave: false, chapter: 0, credits: 0, inventory: {}, upgrades: {}, weaponUpg: {}, pilotProg: {}, ngPlus: 0, parts: {}, partsOwned: [], masteryDone: [], savedBattle: null, simBest: 0, vossenDefeated: false, killsByDef: {}, snowFox: false, mirrorWon: false, arcKill: false, blastKill: false, extremeWon: false, shepHon: false, flawlessHon: false, maxHitEver: 0, wounded: [] });
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
      set({ chapter: d.chapter, credits: d.credits, inventory: d.inventory, upgrades: d.upgrades, weaponUpg: d.weaponUpg ?? {}, pilotProg: d.pilotProg, hasSave: true, bonds: d.bonds ?? {}, bondSeen: d.bondSeen ?? [], sideCleared: d.sideCleared ?? [], ngPlus: d.ngPlus ?? 0, parts: d.parts ?? {}, partsOwned: d.partsOwned ?? [], masteryDone: d.masteryDone ?? [], hintsSeen: d.hintsSeen ?? [], route: d.route ?? null, honorsClaimed: d.honorsClaimed ?? [], missionRank: (d.missionRank as Record<number, 'S' | 'A' | 'B' | 'C'>) ?? {}, simBest: d.simBest ?? 0, vossenDefeated: d.vossenDefeated ?? false, snowFox: d.snowFox ?? false, mirrorWon: d.mirrorWon ?? false, arcKill: d.arcKill ?? false, blastKill: d.blastKill ?? false,
    extremeWon: d.extremeWon ?? false, shepHon: d.shepHon ?? false, flawlessHon: d.flawlessHon ?? false, killsByDef: d.killsByDef ?? {}, maxHitEver: d.maxHitEver ?? 0, wounded: d.wounded ?? [] });
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

  sellItem: (itemId) => {
    const s = get();
    const item = ITEMS[itemId];
    const owned = s.inventory[itemId] ?? 0;
    if (!item || owned <= 0) return;
    const inventory = { ...s.inventory, [itemId]: owned - 1 };
    if (inventory[itemId] <= 0) delete inventory[itemId];
    const credits = s.credits + Math.round(item.price * 0.5);
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
    const skills = { hit: 0, evade: 0, dmg: 0, def: 0, countercut: 0, esave: 0, hitrun: 0, crit: 0, scavenger: 0, regen: 0, riposte: 0, ...(prog.skills ?? {}) };
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
    if (item.apply === 'barrage') {
      // shipboard strike: enter aim mode — pick any tile in range, blast radius 2
      const w = WEAPONS.arkBarrageW;
      const tiles = new Set<string>();
      for (let dy = -w.rangeMax; dy <= w.rangeMax; dy++)
        for (let dx = -w.rangeMax; dx <= w.rangeMax; dx++) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d >= w.rangeMin && d <= w.rangeMax && u.pos.x + dx >= 0 && u.pos.x + dx < s.map.cols && u.pos.y + dy >= 0 && u.pos.y + dy < s.map.rows) tiles.add(`${u.pos.x + dx},${u.pos.y + dy}`);
        }
      const inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) - 1 };
      set({ units: s.units.map((x) => (x.uid === uid ? { ...x, moved: true, acted: true } : x)), inventory, usedSupport: true, menuForUid: uid, pendingMove: u.pos, pendingWeapon: w, attackTiles: tiles, mapAim: null, log: push(s.log, `${u.def.name} designates coordinates — pick a tile for the Ark Barrage`) });
      return;
    }
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
          for (const w of c.def.weapons) if (w.ammo != null) c.ammo[w.id] = maxAmmoOf(c, w);
          break;
        case 'sp':
          c.sp = Math.min(c.def.pilot.maxSp, c.sp + item.amount);
          break;
        case 'purge':
          c.statuses = [];
          c.crippled = false;
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
      usedSupport: true,
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
    const cellGranted = allied && grantDrakeCell(set, get);
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, s.deploySel, s.ngPlus, s.parts, s.settings.difficulty ?? 'normal', allied, s.wounded);
    const zone = deployZone(map);
    // paint the deploy zone with the move-range overlay so the player sees where units can go
    const zoneTiles = new Map<string, MoveRec>();
    for (const k of zone) {
      const [x, y] = k.split(',').map(Number);
      zoneTiles.set(k, { pos: { x, y }, cost: 0 });
    }
    void clearBattleSave();
    set({ phase: 'deploy', sideId: null, missionCh: { ...ch, seizePos: map.beaconPos, reachPos: map.reachPos }, map, units, crates: map.crates ?? [], kills: 0, salvageCr: 0, turn: 1, bossWarned: false, savedBattle: null, log: [`Chapter ${ch.id}: ${ch.name}${s.ngPlus ? ` · NG+ ${s.ngPlus}` : ''}`, `Objective: ${ch.objective}`, ...(allied ? [`🤝 Cpt. Vossen: "I've seen enough. Ark — the Drake flies on your wing now."`] : []), ...(cellGranted ? [`▣ Drake's Cell integrated — unique part acquired`] : [])], inspectUid: null, tileInfo: null, dangerZone: false, dangerTiles: new Set(), threatTiles: new Set(), hazardWarn: [], blizzard: false, midDialog: null, eventsFired: [], deployTiles: zone, moveTiles: zoneTiles, transformed: false, usedSupport: false, altKill: false, decoyHit: false, iFieldKill: false, arcKill: false, blastKill: false, lostAlly: false, rescuedPods: [], snipeKill: false, bossRush: false, usedResupply: false });
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
      rescuedPods: b.rescuedPods ?? [],
      snipeKill: b.snipeKill ?? false,
      bossRush: b.bossRush ?? false,
      usedResupply: b.usedResupply ?? false,
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
        for (const w of x.def.weapons) if (w.ammo != null) ammo[w.id] = maxAmmoOf(x, w);
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
        for (const w of x.def.weapons) if (w.ammo != null) ammo[w.id] = maxAmmoOf(x, w);
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
      usedResupply: true,
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
    const drop = rollDrop(false, dropBonusPct(get().units));
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
      if (t && t.side === 'enemy' && s.attackTiles.has(key(p)) && !isStealthHidden(t, s.units)) {
        get().chooseTarget(t.uid);
      }
      return;
    }

    // a move is previewed and menu open -> taps handled by menu, ignore map
    if (s.menuForUid) return;

    const u = unitAt(s.units, p);

    // tap an enemy: inspect card + threat-range overlay (fog hides uncontacted hostiles)
    if (u && (u.side === 'enemy' || u.npc) && !s.selectedUid && !(s.missionCh.fog && u.side === 'enemy' && !fogLit(s.units, u.pos)) && !isStealthHidden(u, s.units)) {
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

    // Hit & Run: an acted unit that never moved may still reposition (no second attack)
    if (u && u.side === 'player' && u.acted && !u.moved && (u.skills?.hitrun ?? 0) > 0 && !u.npc) {
      const tiles = movementRange(s.map, s.units, u);
      set({ selectedUid: u.uid, cursor: p, moveTiles: tiles, tileInfo: null });
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
    let rescuedPods = s.rescuedPods;
    let willBoostUid: string | undefined;
    if (crateIdx >= 0) {
      const itemId = s.crates[crateIdx].itemId;
      crates = s.crates.filter((_, i) => i !== crateIdx);
      if (itemId.startsWith('pod:')) {
        const podDef = itemId.slice(4);
        rescuedPods = [...rescuedPods, podDef];
        willBoostUid = sel.uid;
        salvageQueue = [...s.salvageQueue, '🛟 pilot pod'];
      } else {
        inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 };
        salvageQueue = [...s.salvageQueue, ITEMS[itemId]?.name ?? itemId];
      }
    }
    const units2 = willBoostUid
      ? units.map((u) => (u.uid === willBoostUid ? { ...u, will: Math.min(150, (u.will ?? 100) + 10) } : u))
      : units;
    set({ units: units2, walk: walking, pendingMove: sel.acted ? null : p, preMovePos: sel.pos, pendingMovedFlag: !same(sel.pos, p), menuForUid: sel.acted ? null : sel.uid, moveTiles: new Map(), selectedUid: sel.acted ? null : sel.uid, inventory, crates, salvageQueue, rescuedPods, tileInfo: null, log: willBoostUid ? push(s.log, '🛟 POD RECOVERED — the pilot ejected safely and is back aboard') : s.log });
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
      trackMaxHit(get, set, out.result);
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
      let altFlag = s.altKill;
      let blastF = s.blastKill || dead.length >= 4;
    let arcF = s.arcKill || (result?.splash ?? []).some((x) => x.destroyed);
      let iFieldF = s.iFieldKill || dead.some((d) => (d.def.barrier ?? 0) > 0 || partBonus(d, 'barrier') > 0);
      if (dead.length > 0 && att.baseDefId && att.def.id !== att.baseDefId) altFlag = true;
      const overkillCr = Math.floor(dead.reduce((n, d) => n + (d.overkillDealt ?? 0), 0) / 50);
      if (overkillCr) log = push(log, `⚡ OVERKILL — +${overkillCr}cr salvage`);
      let inventory = s.inventory;
      let partsOwned = s.partsOwned;
      let salvageQueue = s.salvageQueue;
      for (const d of dead) {
        const drop = rollDrop(d.elite, dropBonusPct(s.units));
        if (drop) {
          inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
          log = push(log, `Salvaged ${ITEMS[drop].name} from the wreck`);
          salvageQueue = [...salvageQueue, ITEMS[drop].name];
        }
        if (d.def.boss) {
          const pool = Object.keys(PARTS).filter((id) => !PARTS[id].unique);
          const partId = pool[Math.floor(Math.random() * pool.length)];
          partsOwned = [...partsOwned, partId];
          log = push(log, `▣ BOSS SALVAGE — ${PARTS[partId].name} recovered from the wreck`);
          salvageQueue = [...salvageQueue, `▣ ${PARTS[partId].name}`];
        }
      }
      const lucky = applyLucky(state.units, att.uid, dead);
      if (lucky.cr) log = push(log, `☘ LUCKY — +${lucky.cr}cr bonus salvage`);
      if (lucky.drop) {
        inventory = { ...inventory, [lucky.drop]: (inventory[lucky.drop] ?? 0) + 1 };
        log = push(log, `Salvaged ${ITEMS[lucky.drop].name} — Lucky's blessing`);
        salvageQueue = [...salvageQueue, ITEMS[lucky.drop].name];
      }
      log = applyOverdrive(state.units, att.uid, killCount, log);
      const common = {
        units: state.units,
        log,
        inventory,
        partsOwned,
        salvageQueue,
        kills: s.kills + killCount, altKill: altFlag, iFieldKill: iFieldF, arcKill: arcF, blastKill: blastF, lostAlly: s.lostAlly || deadPlayers(s.units, state.units).length > 0, crates: podsFor(s.units, state.units, s.crates), snipeKill: s.snipeKill || deadEnemies(s.units, state.units).some((d) => dist(att.pos, d.pos) >= 5), bossRush: s.bossRush || deadEnemies(s.units, state.units).some((d) => d.def.boss && !d.phase2),
        chainTurn: killCount > 0 ? s.turn : s.chainTurn,
        chainCount: chain,
        salvageCr: s.salvageCr + chainBonus + overkillCr + lucky.cr,
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
    trackMaxHit(get, set, result);
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
    if (result.miracle) log2 = push(log2, `✦ MIRACLE — ${def.def.name} refuses to fall! (10 HP)`);
    if (result.mercy) log2 = push(log2, `🕊 MERCY — ${def.def.name} spared at 10 HP — the crew can board the frame`);
    if (result.guarded) log2 = push(log2, `🛡 GUARDIAN — a Royal Guard throws itself in front of ${result.guarded}!`);
    if (result.crippled) log2 = push(log2, `⚠ ${def.def.name} is CRIPPLED — move -2`);
    if (result.counter?.miracle) log2 = push(log2, `✦ MIRACLE — ${att.def.name} refuses to fall! (10 HP)`);
    if (result.counter?.crippled) log2 = push(log2, `⚠ ${att.def.name} is CRIPPLED — move -2`);
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
    const overkillCr = Math.floor(dead.reduce((n, d) => n + (d.overkillDealt ?? 0), 0) / 50);
    if (overkillCr) log2 = push(log2, `⚡ OVERKILL — the wrecks spill extra salvage: +${overkillCr}cr`);
    const quip = bondQuip(s, att, dead);
    if (quip) log2 = push(log2, `♥ ${quip}`);
    let inventory = s.inventory;
    let partsOwned = s.partsOwned;
    let salvageQueue = s.salvageQueue;
    let altFlag = s.altKill;
    let blastF = s.blastKill || dead.length >= 4;
    let arcF = s.arcKill || (result?.splash ?? []).some((x) => x.destroyed);
      let iFieldF = s.iFieldKill || dead.some((d) => (d.def.barrier ?? 0) > 0 || partBonus(d, 'barrier') > 0);
    for (const d of dead) {
      const drop = rollDrop(d.elite, dropBonusPct(s.units));
      if (drop) {
        inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
        log2 = push(log2, `Salvaged ${ITEMS[drop].name} from the wreck`);
        salvageQueue = [...salvageQueue, ITEMS[drop].name];
      }
      if (d.def.boss) {
        const pool = Object.keys(PARTS).filter((id) => !PARTS[id].unique);
        const partId = pool[Math.floor(Math.random() * pool.length)];
        partsOwned = [...partsOwned, partId];
        log2 = push(log2, `▣ BOSS SALVAGE — ${PARTS[partId].name} recovered from the wreck`);
        salvageQueue = [...salvageQueue, `▣ ${PARTS[partId].name}`];
      }
    }
    const lucky = applyLucky(state.units, att.uid, dead);
    if (lucky.cr) log2 = push(log2, `☘ LUCKY — +${lucky.cr}cr bonus salvage`);
    if (lucky.drop) {
      inventory = { ...inventory, [lucky.drop]: (inventory[lucky.drop] ?? 0) + 1 };
      log2 = push(log2, `Salvaged ${ITEMS[lucky.drop].name} — Lucky's blessing`);
      salvageQueue = [...salvageQueue, ITEMS[lucky.drop].name];
    }
    log2 = applyOverdrive(state.units, att.uid, killCount, log2);
    if (vossenDowned(s.units, state.units)) {
      inventory = { ...inventory, megaKit: (inventory.megaKit ?? 0) + 1 };
      log2 = push(log2, "Cpt. Vossen's wreck spills a cache — Mega Repair Kit acquired");
      salvageQueue = [...salvageQueue, ITEMS.megaKit.name];
    }
    let carrierCr = 0;
    if (dead.some((d) => d.def.carrier)) {
      carrierCr = 600;
      const drop = rollDrop(false, dropBonusPct(s.units)) ?? 'repairKit';
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
      partsOwned,
      salvageQueue,
      kills: s.kills + killCount, altKill: altFlag, iFieldKill: iFieldF, arcKill: arcF, blastKill: blastF, lostAlly: s.lostAlly || deadPlayers(s.units, state.units).length > 0, crates: podsFor(s.units, state.units, s.crates), snipeKill: s.snipeKill || deadEnemies(s.units, state.units).some((d) => dist(att.pos, d.pos) >= 5), bossRush: s.bossRush || deadEnemies(s.units, state.units).some((d) => d.def.boss && !d.phase2),
      chainTurn: killCount > 0 ? s.turn : s.chainTurn,
      chainCount: chain,
      salvageCr: s.salvageCr + chainBonus + carrierCr + overkillCr + lucky.cr,
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
      battle: {
        attacker: { ...att },
        defender: { ...(result.struckUid ? (state.units.find((u) => u.uid === result.struckUid) ?? def) : def) },
        attackerAfter: attAfter,
        defenderAfter: defAfter,
        weapon: s.pendingWeapon,
        result,
        warning,
      },
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
    const unitsForBlast = att.def.weapons.some((x) => x.id === w.id) ? s.units : s.units.map((x) => (x.uid === att.uid ? { ...x, def: { ...x.def, weapons: [...x.def.weapons, w] } } : x));
    const { state, result } = applyMapAttack({ map: s.map, units: unitsForBlast, turn: s.turn }, att.uid, p, w.id, modsFor(s.bonds, s.units));
    trackMaxHit(get, set, result);
    const primary = targets.slice().sort((a, b) => dist(a.pos, p) - dist(b.pos, p))[0];
    const attAfter = state.units.find((u) => u.uid === att.uid)!;
    const defAfter = state.units.find((u) => u.uid === primary.uid) ?? primary;
    let log2 = push(s.log, `${att.def.name} fires ${w.name} — ${result.splash!.length + 1} units in the blast`);
    for (const sp of result.splash!) log2 = push(log2, `  ${sp.name}: ${sp.hit ? `${sp.damage}${sp.destroyed ? ' — DESTROYED' : ''}` : 'missed'}`);
    for (const e of result.expEvents) log2 = push(log2, e);
    for (const q of defeatQuotes(s.units, state.units, att)) log2 = push(log2, q);
    let inventory = s.inventory;
    let partsOwned = s.partsOwned;
    let salvageQueue = s.salvageQueue;
    let altFlag = s.altKill;
    let blastF = s.blastKill || deadEnemies(s.units, state.units).length >= 4;
    let arcF = s.arcKill || (result?.splash ?? []).some((x) => x.destroyed);
      let iFieldF = s.iFieldKill || deadEnemies(s.units, state.units).some((d) => (d.def.barrier ?? 0) > 0 || partBonus(d, 'barrier') > 0);
    if (vossenDowned(s.units, state.units)) {
      inventory = { ...inventory, megaKit: (inventory.megaKit ?? 0) + 1 };
      log2 = push(log2, "Cpt. Vossen's wreck spills a cache — Mega Repair Kit acquired");
      salvageQueue = [...salvageQueue, ITEMS.megaKit.name];
    }
    const mapKills = deadEnemies(s.units, state.units).length;

    const overkillCr = Math.floor(deadEnemies(s.units, state.units).reduce((n, d) => n + (d.overkillDealt ?? 0), 0) / 50);
    if (overkillCr) log2 = push(log2, `⚡ OVERKILL — +${overkillCr}cr salvage`);
    const mapDead = deadEnemies(s.units, state.units);
    if (mapDead.length > 0 && att.baseDefId && att.def.id !== att.baseDefId) altFlag = true;
    for (const d of mapDead) {
      const drop = rollDrop(d.elite, dropBonusPct(s.units));
      if (drop) {
        inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
        log2 = push(log2, `Salvaged ${ITEMS[drop].name} from the wreck`);
        salvageQueue = [...salvageQueue, ITEMS[drop].name];
      }
      if (d.def.boss) {
        const pool = Object.keys(PARTS).filter((id) => !PARTS[id].unique);
        const partId = pool[Math.floor(Math.random() * pool.length)];
        partsOwned = [...partsOwned, partId];
        log2 = push(log2, `▣ BOSS SALVAGE — ${PARTS[partId].name} recovered from the wreck`);
        salvageQueue = [...salvageQueue, `▣ ${PARTS[partId].name}`];
      }
    }
    const lucky = applyLucky(state.units, att.uid, mapDead);
    if (lucky.cr) log2 = push(log2, `☘ LUCKY — +${lucky.cr}cr bonus salvage`);
    if (lucky.drop) {
      inventory = { ...inventory, [lucky.drop]: (inventory[lucky.drop] ?? 0) + 1 };
      log2 = push(log2, `Salvaged ${ITEMS[lucky.drop].name} — Lucky's blessing`);
      salvageQueue = [...salvageQueue, ITEMS[lucky.drop].name];
    }
    log2 = applyOverdrive(state.units, att.uid, mapKills, log2);
    const mapChain = mapKills > 0 ? (s.turn === s.chainTurn ? s.chainCount + mapKills : mapKills) : s.chainCount;
    const mapChainBonus = mapChain > 1 && mapKills > 0 ? 30 * mapChain : 0;
    if (mapChainBonus) log2 = push(log2, `⛓ CHAIN ×${mapChain} — +${mapChainBonus}cr bonus salvage`);
    const common = {
      units: state.units,
      log: log2,
      inventory,
      partsOwned,
      salvageQueue,
      vossenDefeated: s.vossenDefeated || vossenDowned(s.units, state.units),
      killsByDef: tallyKills(s.killsByDef, deadEnemies(s.units, state.units)),
      kills: s.kills + deadEnemies(s.units, state.units).length, altKill: altFlag, iFieldKill: iFieldF, arcKill: arcF, blastKill: blastF, lostAlly: s.lostAlly || deadPlayers(s.units, state.units).length > 0, crates: podsFor(s.units, state.units, s.crates), snipeKill: s.snipeKill || deadEnemies(s.units, state.units).some((d) => dist(att.pos, d.pos) >= 5), bossRush: s.bossRush || deadEnemies(s.units, state.units).some((d) => d.def.boss && !d.phase2),
      chainTurn: mapKills > 0 ? s.turn : s.chainTurn,
      chainCount: mapChain,
      salvageCr: s.salvageCr + mapChainBonus + overkillCr + lucky.cr,
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

  // TRANSFORM: swap the frame between its two forms — free action, only before moving
  transformUnit: (uid) => {
    const s = get();
    const u = s.units.find((x) => x.uid === uid);
    if (!u || !u.altDef || u.moved || u.acted || u.side !== 'player') return;
    const units = s.units.map((x) => {
      if (x.uid !== uid || !x.altDef) return x;
      const ammo = { ...x.ammo };
      for (const w of x.altDef.weapons) if (w.ammo != null && ammo[w.id] == null) ammo[w.id] = maxAmmoOf(x, w);
      return { ...x, def: x.altDef, altDef: x.def, ammo };
    });
    const into = units.find((x) => x.uid === uid)!;
    set({
      units,
      menuForUid: null,
      selectedUid: null,
      moveTiles: new Map(),
      threatTiles: new Set(),
      transformed: true,
      log: push(s.log, `⇄ ${into.def.name} — frame transformed (move ${u.def.moveRange}→${into.def.moveRange}${into.def.moveType === 'air' ? ', air' : ', land'})`),
    });
  },

  waitUnit: () => {
    const s = get();
    if (!s.menuForUid) return;
    const uid = s.menuForUid;
    const units = s.units.map((u) => (u.uid === uid ? { ...u, acted: true, moved: true } : u));
    set({ units, menuForUid: null, pendingMove: null, selectedUid: null, moveTiles: new Map(), inspectUid: null, threatTiles: new Set() });
  },

  overwatchUnit: () => {
    const s = get();
    if (!s.menuForUid) return;
    const uid = s.menuForUid;
    const name = s.units.find((u) => u.uid === uid)?.def.name;
    const units = s.units.map((u) => (u.uid === uid ? { ...u, acted: true, moved: true, overwatch: true } : u));
    set({ units, menuForUid: null, pendingMove: null, selectedUid: null, moveTiles: new Map(), inspectUid: null, threatTiles: new Set(), log: push(s.log, `\u25CF ${name} holds fire — overwatch arc armed`) });
  },

  swapUnit: () => {
    const s = get();
    const uid = s.menuForUid;
    const u = uid ? s.units.find((x) => x.uid === uid) : undefined;
    const mate = u ? s.units.find((x) => x.alive && x.side === 'player' && !x.npc && x.uid !== u.uid && !x.acted && dist(x.pos, u.pos) === 1) : undefined;
    if (!u || !mate) return;
    const units = s.units.map((x) => {
      if (x.uid === u.uid) return { ...x, pos: mate.pos, acted: true, moved: true };
      if (x.uid === mate.uid) return { ...x, pos: u.pos };
      return x;
    });
    set({ units, menuForUid: null, pendingMove: null, selectedUid: null, moveTiles: new Map(), inspectUid: null, threatTiles: new Set(), log: push(s.log, `\u21C4 ${u.def.name} ⇄ ${mate.def.name} — position swap`) });
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
    if (sp === 'wish' && !s.units.some((u) => u.alive && u.uid !== uid && u.side === target.side && dist(u.pos, target.pos) <= 3 && u.sp < u.def.pilot.maxSp)) {
      set({ spiritForUid: null, log: push(s.log, 'Wish: no drained ally within 3 tiles') });
      return;
    }
    if (sp === 'awaken' && !s.units.some((u) => u.alive && u.uid !== uid && u.side === 'player' && u.acted && dist(u.pos, target.pos) <= 3)) {
      set({ spiritForUid: null, log: push(s.log, 'Awaken: no spent ally within 3 tiles') });
      return;
    }
    if (sp === 'emp' && !s.units.some((u) => u.alive && u.side === 'enemy' && dist(u.pos, target.pos) <= 4)) {
      set({ spiritForUid: null, log: push(s.log, 'EMP Burst: no enemy within 4 tiles') });
      return;
    }
    if (sp === 'gravity' && !s.units.some((u) => u.alive && u.side === 'enemy' && dist(u.pos, target.pos) <= 3)) {
      set({ spiritForUid: null, log: push(s.log, 'Gravity Well: no enemy within 3 tiles') });
      return;
    }
    if (sp === 'cheer' && !s.units.some((u) => u.alive && u.uid !== uid && u.side === target.side && dist(u.pos, target.pos) <= 3)) {
      set({ spiritForUid: null, log: push(s.log, 'Cheer: no ally within 3 tiles') });
      return;
    }
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
    if (sp === 'rouse' || sp === 'disrupt' || sp === 'sunder' || sp === 'provoke' || sp === 'expose') {
      const src = units.find((x) => x.uid === uid)!;
      for (const u2 of units) {
        if (u2.uid === uid || !u2.alive) continue;
        const d = Math.abs(u2.pos.x - src.pos.x) + Math.abs(u2.pos.y - src.pos.y);
        if (d > (sp === 'sunder' || sp === 'provoke' || sp === 'expose' ? 3 : 2)) continue;
        if (sp === 'rouse' && u2.side === src.side) u2.will = Math.min(150, u2.will + 10);
        if (sp === 'disrupt' && u2.side !== src.side) u2.will = Math.max(100, u2.will - 10);
        if (sp === 'sunder' && u2.side !== src.side) u2.sundered = true;
        if (sp === 'expose' && u2.side === 'enemy') u2.exposed = true;
        if (sp === 'provoke' && u2.side !== src.side) u2.provokedTo = src.uid;
      }
    }
    // purge — cleanse self and adjacent allies of cripple + status debuffs
    let purgeLog: string | null = null;
    if (sp === 'purge') {
      const src = units.find((x) => x.uid === uid)!;
      let cleaned = 0;
      for (const u2 of units) {
        if (!u2.alive || u2.side !== src.side || dist(u2.pos, src.pos) > 2) continue;
        const had = (u2.statuses?.length ?? 0) > 0 || !!u2.crippled;
        u2.statuses = [];
        u2.crippled = false;
        if (had) cleaned++;
      }
      purgeLog = cleaned ? `Purge wave cleanses ${cleaned} frame${cleaned > 1 ? 's' : ''} — cripples and debuffs lifted` : 'Purge wave ripples out — nothing to cleanse';
    }
    // wish — the most SP-drained ally within 3 tiles is reinvigorated
    let wishLog: string | null = null;
    if (sp === 'wish') {
      const src = units.find((x) => x.uid === uid)!;
      const tgt = units
        .filter((u2) => u2.alive && u2.uid !== uid && u2.side === src.side && dist(u2.pos, src.pos) <= 3 && u2.sp < u2.def.pilot.maxSp)
        .sort((a, b) => a.sp / a.def.pilot.maxSp - b.sp / b.def.pilot.maxSp)[0];
      if (tgt) {
        tgt.sp = Math.min(tgt.def.pilot.maxSp, tgt.sp + 30);
        wishLog = `Wish restores ${tgt.def.name} +30 SP`;
      }
    }
    // gravity — every enemy within 3 tiles is anchored in place next phase
    let gravityLog: string | null = null;
    if (sp === 'gravity') {
      const src = units.find((x) => x.uid === uid)!;
      let n = 0;
      for (const u2 of units) {
        if (u2.alive && u2.side === 'enemy' && dist(u2.pos, src.pos) <= 3) {
          u2.anchored = true;
          n++;
        }
      }
      gravityLog = `Gravity Well anchors ${n} hostile frame${n === 1 ? '' : 's'} — no movement next phase`;
    }
    // cheer — the most junior ally within 3 tiles is inspired: double EXP next attack
    let cheerLog: string | null = null;
    if (sp === 'cheer') {
      const src = units.find((x) => x.uid === uid)!;
      const tgt = units
        .filter((u2) => u2.alive && u2.uid !== uid && u2.side === src.side && dist(u2.pos, src.pos) <= 3)
        .sort((a, b) => a.level - b.level || a.exp - b.exp)[0];
      if (tgt) {
        tgt.fortuneForNextAttack = true;
        cheerLog = `Cheer inspires ${tgt.def.name} — double EXP next attack`;
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
    // decoy — a hardlight replica appears beside the caster and soaks enemy fire
    let decoyLog: string | null = null;
    if (sp === 'decoy') {
      const src = units.find((x) => x.uid === uid)!;
      let placed = false;
      for (let r = 1; r <= 2 && !placed; r++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          for (let dy = -r; dy <= r && !placed; dy++) {
            const px = src.pos.x + dx;
            const py = src.pos.y + dy;
            if (px < 0 || py < 0 || px >= s.map.cols || py >= s.map.rows) continue;
            if (!TERRAIN_INFO[s.map.terrain[py][px]].passable.air) continue;
            if (units.some((u2) => u2.alive && u2.pos.x === px && u2.pos.y === py)) continue;
            const nu = makeUnit('holoDecoy', 'player', { x: px, y: py }, `dec${s.turn}x${dx}y${dy}`);
            nu.npc = true;
            nu.acted = true;
            nu.moved = true;
            nu.decoyUntil = s.turn + 1;
            units.push(nu);
            placed = true;
          }
        }
      }
      decoyLog = placed ? 'Holoreplica deployed — hostiles will chase the phantom' : 'No open tile for the holoreplica';
    }
    // phalanx — locked formation: every living ally gains +400 armor until end of enemy phase
    let phalanxLog: string | null = null;
    if (sp === 'phalanx') {
      let n = 0;
      for (const u2 of units) {
        if (u2.alive && u2.side === 'player') {
          u2.gritUntilEndOfEnemyPhase = true;
          n++;
        }
      }
      phalanxLog = `\u26E8 PHALANX — the wall holds: +400 armor across ${n} frames`;
    }
    // emp — the nearest hostile within 4 tiles takes a stasis lock
    let empLog: string | null = null;
    if (sp === 'emp') {
      const src = units.find((x) => x.uid === uid)!;
      const tgt = units
        .filter((u2) => u2.alive && u2.side === 'enemy' && dist(u2.pos, src.pos) <= 4)
        .sort((a2, b2) => dist(a2.pos, src.pos) - dist(b2.pos, src.pos))[0];
      if (tgt) {
        tgt.statuses = [...(tgt.statuses ?? []).filter((x) => x.id !== 'stun'), { id: 'stun', turns: 1 }];
        empLog = `\u26A1 EMP BURST — ${tgt.def.name}'s systems seize up`;
      }
    }
    // hymn — squad anthem: every living ally gains +15 hit & +15 evade until end of enemy phase
    let hymnLog: string | null = null;
    if (sp === 'hymn') {
      let n = 0;
      for (const u2 of units) {
        if (u2.alive && u2.side === 'player') {
          u2.hymnUntilEndOfEnemyPhase = true;
          n++;
        }
      }
      hymnLog = `\u266A HYMN — the squad rallies: +15 hit & +15 evade across ${n} frames`;
    }
    // sanctuary — a ring of mending: allies within 2 tiles recover 20% HP
    let sanctLog: string | null = null;
    if (sp === 'sanctuary') {
      const c = units.find((x) => x.uid === uid)!;
      let n = 0;
      for (const u2 of units) {
        if (u2.alive && u2.side === 'player' && u2.uid !== uid && dist(u2.pos, c.pos) <= 2) {
          u2.hp = Math.min(u2.def.maxHp, u2.hp + Math.round(u2.def.maxHp * 0.2));
          n++;
        }
      }
      sanctLog = `\u26E9 SANCTUARY — the litany mends ${n} frames for 20% HP`;
    }
    // awaken — rekindle the nearest spent ally within 3 tiles: they act again
    let awakenLog: string | null = null;
    if (sp === 'awaken') {
      const c = units.find((x) => x.uid === uid)!;
      const cand = units.filter((u2) => u2.alive && u2.side === 'player' && u2.uid !== uid && u2.acted && dist(u2.pos, c.pos) <= 3).sort((x, y) => dist(x.pos, c.pos) - dist(y.pos, c.pos))[0];
      if (cand) {
        cand.acted = false;
        cand.moved = false;
        awakenLog = `\u26A1 AWAKEN — ${cand.def.name} surges back into action`;
      }
    }
    const u = units.find((x) => x.uid === uid)!;
    const tiles = movementRange(s.map, units, u);
    set({
      units,
      spiritForUid: null,
      usedSupport: true,
      log: trustLog || purgeLog || cheerLog || wishLog || gravityLog || decoyLog || hymnLog || empLog || phalanxLog || sanctLog || awakenLog ? push(push(s.log, `${u.def.name} uses ${SPIRITS[sp].name}`), [trustLog, purgeLog, cheerLog, wishLog, gravityLog, decoyLog, hymnLog, empLog, phalanxLog, sanctLog, awakenLog].filter(Boolean).join(' · ')) : push(s.log, `${u.def.name} uses ${SPIRITS[sp].name}`),
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
    // first-contact duel banter: when a player frame attacks a boss, fire the keyed exchange once per mission
    let duelDialog: { speaker: string; text: string }[] | null = null;
    const duelFired = s.eventsFired;
    if (!end && !s.enemyBusy && s.battle) {
      const att = s.battle.attacker;
      const dfn = s.battle.defender;
      const key = att.side === 'player' && dfn.def.boss ? `${att.def.id}|${dfn.def.id}` : null;
      const lines = key ? DUEL_BANTER[key] : undefined;
      const tag = key ? `duel:${key}` : null;
      if (lines && tag && !duelFired.includes(tag)) {
        duelDialog = lines;
        duelFired.push(tag);
      }
    }
    set({ battle: null, battleReaction: null, phase: end === 'defeat' ? 'defeat' : s.enemyBusy ? 'enemy' : 'player', midDialog: duelDialog ?? s.midDialog, eventsFired: duelFired });
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
function deadPlayers(before: UnitState[], after: UnitState[]): UnitState[] {
  const afterAlive = new Set(after.filter((u) => u.alive).map((u) => u.uid));
  return before.filter((u) => u.side === 'player' && !u.npc && u.alive && !afterAlive.has(u.uid));
}
/** A downed pilot ejects — their pod waits on the tile for a squadmate to recover it. */
function podsFor(before: UnitState[], after: UnitState[], crates: { pos: Pos; itemId: string }[]): { pos: Pos; itemId: string }[] {
  let out = crates;
  for (const d of deadPlayers(before, after)) {
    if (!out.some((c) => same(c.pos, d.pos))) out = [...out, { pos: d.pos, itemId: `pod:${d.def.id}` }];
  }
  return out;
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
  // every 5th wave is MIRROR PROTOCOL — the simulator clones your own squad against you
  const mirror = wave % 5 === 0 && wave % 10 !== 0;
  // every 10th wave a Σ boss construct warps in alone
  const bossWave = wave % 10 === 0;
  const BOSS_CYCLE = ['kargan', 'moorin', 'serka', 'warden', 'bloodyBaron', 'empress', 'emperor'];
  const comp = bossWave ? [BOSS_CYCLE[Math.floor(wave / 10 - 1) % BOSS_CYCLE.length]] : mirror ? s.units.filter((u) => u.alive && u.side === 'player' && !u.npc).map((u) => u.def.id) : enemyComp({ ...s.missionCh, count: Math.min(3 + wave, 8), boss: undefined });
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
    if (mirror) {
      u.def = { ...u.def, name: `Σ ${u.def.name}`, accent: '#ff5a7a' };
      u.elite = true;
    }
    if (bossWave) {
      u.def = { ...u.def, name: `Σ ${u.def.name}`, accent: '#ff5a7a' };
      u.level = lvl + 4;
      u.elite = true;
      u.hp = u.def.maxHp;
    }
    news.push(u);
  });
  const mirrorCleared = s.simWave > 0 && s.simWave % 5 === 0;
  const healed = s.units.map((u) => (u.side !== 'player' || !u.alive ? u : { ...u, hp: Math.min(u.def.maxHp, u.hp + Math.round(u.def.maxHp * 0.25)), en: Math.min(u.def.maxEn, u.en + 30), moved: false, acted: false, dodges: 0 }));
  const units = healed.concat(news);
  // every 3rd wave a supply crate warps in with the hostiles
  let crates = s.crates;
  const crateItems = ['repairKit', 'enCell', 'ammoBox', 'megaKit', 'spiritWing'];
  if (wave % 3 === 0 && free.length > news.length) {
    crates = [...s.crates, { pos: free[news.length], itemId: crateItems[Math.floor(Math.random() * crateItems.length)] }];
  }
  let log = push(s.log, `— Wave ${wave - 1} cleared — +${(wave - 1) * 150} pts`);
  log = push(log, bossWave ? `▲ Σ BOSS WAVE ${wave} — a construct of the Empire\'s finest` : mirror ? `▲ MIRROR WAVE ${wave} — Σ protocol: your own squad, reversed` : `▲ WAVE ${wave}: ${news.length} hostiles warp in (Lv ${lvl}${wave % 4 === 0 ? ' · ALL ELITE' : ''}${wave % 3 === 0 ? ' + supply crate' : ''})`);
  const notice = bossWave ? `⚠ Σ BOSS WAVE ${wave} · ${s.kills * 50 + (wave - 1) * 150} PTS` : mirror ? `▲ MIRROR WAVE ${wave} — Σ PROTOCOL · ${s.kills * 50 + (wave - 1) * 150} PTS` : `▲ WAVE ${wave} — ${news.length} HOSTILES INBOUND · ${s.kills * 50 + (wave - 1) * 150} PTS`;
  set({ units, crates, simWave: wave, mirrorWon: s.mirrorWon || mirrorCleared, battle: null, phase: 'player', enemyBusy: false, selectedUid: null, menuForUid: null, spiritForUid: null, pendingWeapon: null, mapAim: null, pendingMove: null, attackTiles: new Set(), hazardWarn: [], blizzard: false, notice, log });
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
  const snowFox = s.snowFox || (s.missionCh.theme === 'snow' && s.blizzard);
  const extremeWon = s.extremeWon || s.settings.difficulty === 'extreme';
  const shepHon = s.shepHon || (s.missionCh.objectiveType === 'escort' && s.units.every((u) => !u.escort || (u.alive && u.hp >= u.def.maxHp)));
  const maxHitEver = s.maxHitEver ?? 0;
  const flawlessHon = s.flawlessHon || (!s.sideId && s.simWave === 0 && s.missionCh.id >= 10 && !s.units.some((u) => u.side === 'player' && !u.npc && !u.alive));
  // wrecked squad frames must be rebuilt — repair bill comes out of the reward
  const repairBill = s.units.filter((u) => u.side === 'player' && !u.npc && !u.alive).reduce((n, u) => n + u.level * 15, 0);
  // stragglers — surviving foes abandon their salvage when the field breaks (+15cr each)
  const stragglerCr = s.units.filter((u) => u.side === 'enemy' && u.alive).length * 15;
  const woundedIds = s.units.filter((u) => u.side === 'player' && !u.npc && !u.alive && !(u.parts ?? []).includes('escapePod') && !s.rescuedPods.includes(u.def.id)).map((u) => u.def.id);
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
    const reward = Math.round((side.rewardCr + s.kills * 150 + eliteCr) * (s.settings.difficulty === 'hard' ? 1.25 : s.settings.difficulty === 'extreme' ? 1.5 : 1)) + (s.salvageCr + stragglerCr) - repairBill;
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
      lastSalvage: s.salvageCr + stragglerCr,
      lastRank: rankS,
      missionRank,
      partsOwned,
      snowFox,
      extremeWon,
      shepHon,
      flawlessHon,
      maxHitEver,
      wounded: woundedIds,
      debrief: null,
      salvageQueue: [],
      log: aceLines.reduce((l, line) => push(l, line), push(push(s.log, `Side quest cleared! +${reward} credits${side.rewardItem ? ` + ${ITEMS[side.rewardItem].name}` : ''} · RANK ${rankS}${sRankNote ? ' · awarded 🛡 VETERAN PLATE' : ''}${repairBill > 0 ? ` · 🔧 repair bill -${repairBill}cr` : ''}${stragglerCr > 0 ? ` · 🏃 stragglers +${stragglerCr}cr` : ''}`), `${woundedIds.length ? `🩹 ${woundedIds.length} pilot(s) wounded — reduced effectiveness next sortie` : ''}`).filter(Boolean)),
    });
    void persist({ chapter: s.chapter, credits, inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg, parts: s.parts, partsOwned, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared, ngPlus: s.ngPlus, route: s.route, missionRank, snowFox, extremeWon, shepHon, flawlessHon, maxHitEver });
    return;
  }
  const ch = s.missionCh;
  const reward = Math.round((800 + ch.id * 150 + s.kills * 150 + eliteCr) * (s.settings.difficulty === 'hard' ? 1.25 : s.settings.difficulty === 'extreme' ? 1.5 : 1)) + (ch.rewardBonus ?? 0);
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
  const credits = s.credits + reward + masteryCr + (s.salvageCr + stragglerCr) + (clearedFinal ? 5000 : 0) - repairBill;
  if (repairBill > 0) log = push(log, `🔧 ${s.units.filter((u) => u.side === 'player' && !u.npc && !u.alive).length} frame(s) rebuilt — repair bill -${repairBill}cr`);
  if (stragglerCr > 0) log = push(log, `🏃 Stragglers abandon their salvage — +${stragglerCr}cr`);
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
    lastSalvage: s.salvageCr + stragglerCr,
    missionRank,
    partsOwned,
    snowFox,
    extremeWon,
    shepHon,
    flawlessHon,
    maxHitEver,
    wounded: woundedIds,
    lastReward: reward + masteryCr + (clearedFinal ? 5000 : 0),
    debrief: DEBRIEFS[ch.id] ?? null,
    salvageQueue: [],
    log: woundedIds.length
      ? push(push(log, clearedFinal ? `CAMPAIGN COMPLETE — NEW GAME+ ${ngPlus} unlocked! +${reward + masteryCr + 5000} credits` : `Mission complete! +${reward + masteryCr} credits · RANK ${rank}`), `🩹 ${woundedIds.length} pilot${woundedIds.length > 1 ? 's' : ''} wounded — they sortie at reduced effectiveness next battle`)
      : push(log, clearedFinal ? `CAMPAIGN COMPLETE — NEW GAME+ ${ngPlus} unlocked! +${reward + masteryCr + 5000} credits` : `Mission complete! +${reward + masteryCr} credits · RANK ${rank}`),
  });
  void clearBattleSave();
  void persist({ chapter, credits, inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg, parts: s.parts, partsOwned, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared: s.sideCleared, ngPlus, masteryDone, route: s.route, missionRank, snowFox, extremeWon, shepHon, flawlessHon, maxHitEver });
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

    // stasis lock / EMP burst — a stunned frame loses its whole activation
    {
      const cur0 = get();
      const frozen = cur0.units.find((u) => u.uid === plan.unit.uid);
      if (frozen?.statuses?.some((x) => x.id === 'stun')) {
        set((st) => ({
          units: st.units.map((u) => (u.uid === frozen.uid ? { ...u, acted: true, moved: true } : u)),
          log: push(st.log, `\u23F8 ${frozen.def.name} is STUNNED — its systems are locked`),
        }));
        await sleep(300);
        continue;
      }
    }

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

    // overwatch volley — a defender on standby snaps a shot at the first hostile in arc
    {
      const cur = get();
      const foe = cur.units.find((u) => u.uid === plan.unit.uid);
      const inArc = (u: UnitState, t: Pos) => (w: WeaponDef) => !w.mapRange && dist(u.pos, t) >= w.rangeMin && dist(u.pos, t) <= rangeMaxOf(u, w);
      const ow = foe?.alive === true ? cur.units.find((u) => u.alive && u.overwatch === true && u.side === 'player' && !u.npc && usableWeapons(u).some(inArc(u, foe.pos))) : undefined;
      const owW = ow ? usableWeapons(ow).filter(inArc(ow, foe!.pos)).sort((a, b) => b.power - a.power)[0] : undefined;
      if (ow && owW && foe) {
        const { state, result } = applyAttack({ map: cur.map, units: cur.units, turn: cur.turn, blizzard: cur.blizzard }, ow.uid, foe.uid, owW.id, modsFor(cur.bonds, cur.units), 'evade');
        const wi = state.units.findIndex((u) => u.uid === ow.uid);
        if (wi >= 0) state.units[wi] = { ...state.units[wi], overwatch: false };
        const dead = deadEnemies(cur.units, state.units);
        let log2 = push(cur.log, `\u25CF OVERWATCH — ${ow.def.name} snaps ${owW.name} at the intruder${result.hit ? ` for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''}` : ' — missed'}`);
        let inventory = cur.inventory;
        let salvageQueue = cur.salvageQueue;
        for (const d of dead) {
          const drop = rollDrop(d.elite, dropBonusPct(cur.units));
          if (drop) {
            inventory = { ...inventory, [drop]: (inventory[drop] ?? 0) + 1 };
            log2 = push(log2, `Salvaged ${ITEMS[drop].name} from the wreck`);
            salvageQueue = [...salvageQueue, ITEMS[drop].name];
          }
        }
        set({ units: state.units, kills: cur.kills + dead.length, killsByDef: tallyKills(cur.killsByDef, dead), snipeKill: cur.snipeKill || dead.some((d) => dist(ow.pos, d.pos) >= 5), bossRush: cur.bossRush || dead.some((d) => d.def.boss && !d.phase2), inventory, salvageQueue, log: log2, notice: `\u25CF OVERWATCH — ${ow.def.name}` });
        setTimeout(() => set({ notice: null }), 1900);
        await sleep(520);
        const end = checkEnd(get().units, get().missionCh, get().turn);
        if (end) {
          if (end === 'victory') applyVictory(set, get);
          else set({ phase: end, enemyBusy: false });
          return;
        }
      }
    }

    // field medic — mends the most wounded ally within 3 tiles, then ends its turn
    {
      const cur = get();
      const med = cur.units.find((u) => u.uid === plan.unit.uid);
      if (med?.alive && med.def.medic && !med.acted) {
        const tgt = cur.units
          .filter((u) => u.alive && u.side === 'enemy' && u.uid !== med.uid && u.hp < u.def.maxHp && dist(u.pos, med.pos) <= 3)
          .sort((a, b) => a.hp / a.def.maxHp - b.hp / b.def.maxHp)[0];
        if (tgt) {
          const healAmt = Math.round(tgt.def.maxHp * 0.15);
          set((st) => ({
            units: st.units.map((u) => (u.uid === med.uid ? { ...u, acted: true } : u.uid === tgt.uid ? { ...u, hp: Math.min(u.def.maxHp, u.hp + healAmt) } : u)),
            log: push(st.log, `\u271A FIELD MEDIC — ${med.def.name} restores ${tgt.def.name} +${healAmt} HP`),
            notice: `\u271A FIELD MEDIC — ${med.def.name}`,
          }));
          setTimeout(() => set({ notice: null }), 1600);
          await sleep(450);
          continue;
        }
      }
    }

    // enemy MAP barrage — a siege unit blasts the clustered formation (no counters)
    if (plan.mapAim && plan.mapWeapon) {
      const cur = get();
      const att = cur.units.find((u) => u.uid === plan.unit.uid)!;
      const mw = plan.mapWeapon;
      const aim = plan.mapAim;
      const targets = cur.units
        .filter((u) => u.alive && u.uid !== att.uid && dist(u.pos, aim) <= (mw.mapRange ?? 0))
        .sort((a, b) => dist(a.pos, aim) - dist(b.pos, aim));
      if (!targets.length) {
        set((st) => ({ units: st.units.map((u) => (u.uid === att.uid ? { ...u, acted: true } : u)) }));
        await sleep(120);
        continue;
      }
      const primary = targets[0];
      const { state, result } = applyMapAttack({ map: cur.map, units: cur.units, turn: cur.turn }, att.uid, aim, mw.id, modsFor(cur.bonds, cur.units));
      trackMaxHit(get, set, result);
      let log2 = push(cur.log, `☄ MAP BARRAGE — ${att.def.name} fires ${mw.name}: ${targets.length} units in the blast`);
      const primaryRes = targets[0].uid;
      log2 = push(log2, `  ${primary.def.name}: ${result.hit ? `${result.damage}${result.destroyed ? ' — DESTROYED' : ''}` : 'missed'}`);
      for (const sp of result.splash ?? []) log2 = push(log2, `  ${sp.name}: ${sp.hit ? `${sp.damage}${sp.destroyed ? ' — DESTROYED' : ''}` : 'missed'}`);
      for (const q of defeatQuotes(cur.units, state.units, att)) log2 = push(log2, q);
      if (cur.settings.battleMode === 'off') {
        set({ units: state.units, log: log2, notice: `☄ MAP BARRAGE — ${att.def.name}` });
        setTimeout(() => set({ notice: null }), 2400);
        const end = checkEnd(get().units, get().missionCh, get().turn);
        if (end) {
          if (end === 'victory') applyVictory(set, get);
          else set({ phase: end, enemyBusy: false });
          return;
        }
        await sleep(160);
        continue;
      }
      set({
        units: state.units,
        phase: 'battle',
        log: log2,
        notice: `☄ MAP BARRAGE — ${att.def.name}`,
        battle: {
          attacker: { ...att },
          defender: { ...primary },
          attackerAfter: state.units.find((u) => u.uid === att.uid)!,
          defenderAfter: state.units.find((u) => u.uid === primaryRes) ?? primary,
          weapon: mw,
          result,
        },
      });
      await waitFor(() => get().battle === null);
      set({ notice: null });
      const end = checkEnd(get().units, get().missionCh, get().turn);
      if (end) {
        if (end === 'victory') applyVictory(set, get);
        else set({ phase: end, enemyBusy: false });
        return;
      }
      await sleep(180);
      continue;
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
      trackMaxHit(get, set, result);
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
                `${att.def.name} hits ${tgtName} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''} · ${result.counterCut ? '⚔COUNTER-CUT ' : ''}${tgtName} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`,
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
          const d = dropsForKills(kc, st.inventory, dropBonusPct(st.units));
          let l = mkLog(st.log);
          for (const x of d.lines) l = push(l, x);
          for (const q of defeatQuotes(cur.units, state.units, att)) l = push(l, q);
          return { units: state.units, kills: st.kills + kc, decoyHit: st.decoyHit || def.decoyUntil != null, killsByDef: tallyKills(st.killsByDef, deadEnemies(cur.units, state.units)), inventory: d.inventory, salvageQueue: [...st.salvageQueue, ...d.names], lostAlly: st.lostAlly || deadPlayers(cur.units, state.units).length > 0, crates: podsFor(cur.units, state.units, st.crates), log: rxnLog(l) };
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
        const d = dropsForKills(kc, st.inventory, dropBonusPct(st.units));
        let l = mkLog(st.log);
        for (const x of d.lines) l = push(l, x);
        for (const q of defeatQuotes(cur.units, state.units, att)) l = push(l, q);
        return {
          units: state.units,
          phase: 'battle',
          kills: st.kills + kc,
          decoyHit: st.decoyHit || def.decoyUntil != null,
          killsByDef: tallyKills(st.killsByDef, deadEnemies(cur.units, state.units)),
          inventory: d.inventory,
          salvageQueue: [...st.salvageQueue, ...d.names],
          lostAlly: st.lostAlly || deadPlayers(cur.units, state.units).length > 0, crates: podsFor(cur.units, state.units, st.crates),
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
      const edge = get().map.cols - 1;
      const routed = !!plan.fleeing && plan.moveTo.x >= edge;
      set((st) => ({
        units: st.units.map((u) => (u.uid === plan.unit.uid ? { ...u, acted: true, ...(routed ? { alive: false, hp: 0 } : {}) } : u)),
        log: plan.fleeing ? push(st.log, routed ? `${plan.unit.def.name} ROUTED — falls back off the field!` : `${plan.unit.def.name} is falling back!`) : st.log,
      }));
      if (routed) {
        const end = checkEnd(get().units, get().missionCh, get().turn);
        if (end) {
          if (end === 'victory') applyVictory(set, get);
          else set({ phase: end, enemyBusy: false });
          return;
        }
      }
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
      if (c.decoyUntil != null && st.turn + 1 >= c.decoyUntil) {
        c.alive = false;
        c.hp = 0;
        recovered.push(`${c.def.name} disperses — decoy spent`);
      }
      if (c.side === 'player') clearTransientForOwnPhase(c);
      else {
        c.moved = false;
        c.acted = false;
        if (c.side === 'enemy') c.provokedTo = undefined;
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
    // allied reinforcement wave — NPC militia storm in from the west edge, fighting beside you
    const arf = st.map.allyReinforce;
    if (arf && nextTurn === arf.turn) {
      const occupied = new Set(units.filter((u) => u.alive).map((u) => key(u.pos)));
      let i = 0;
      for (const c of arf.comp) {
        outer: for (let x = 0; x <= Math.min(3, st.map.cols - 1); x++)
          for (let y = 0; y < st.map.rows; y++) {
            const k = `${x},${y}`;
            const ti = TERRAIN_INFO[st.map.terrain[y][x]];
            if (!occupied.has(k) && ti.passable.land && !ti.hpDmg) {
              occupied.add(k);
              const nu = makeUnit(c.defId, 'player', { x, y }, `ar${nextTurn}x${i++}`);
              nu.npc = true;
              nu.armed = c.armed ?? true;
              nu.level = st.missionCh?.lvl ?? 1;
              const hpScale = 1 + ((st.missionCh?.lvl ?? 1) - 1) * 0.12;
              nu.def = { ...nu.def, maxHp: Math.round(nu.def.maxHp * hpScale) };
              nu.hp = nu.def.maxHp;
              units.push(nu);
              break outer;
            }
          }
      }
      notice = '✚ ALLIED REINFORCEMENTS';
      recovered.push(`Allied reinforcements: ${arf.comp.length} militia frames join the line!`);
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
    // Gravity Well lifts as the new player phase begins
    for (const v of units) if (v.anchored) v.anchored = false;
    // tile hazards: tiles telegraphed last round detonate now (never lethal — leaves 1 HP)
    const hzLabel = st.missionCh.theme === 'fortress' || st.missionCh.theme === 'moon' ? 'artillery barrage' : st.missionCh.theme === 'lava' ? 'magma surge' : 'ion storm';
    for (const hz of st.hazardWarn) {
      for (const v of units.filter((u) => u.alive && same(u.pos, hz))) {
        const dmg = Math.min(v.hp - 1, Math.round(v.def.maxHp * 0.15));
        if (dmg > 0) {
          v.hp -= dmg;
          recovered.push(`${v.def.name} -${dmg} HP (${hzLabel})`);
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
        notice = hzLabel === 'artillery barrage' ? '⚠ ARTILLERY BARRAGE INCOMING' : hzLabel === 'magma surge' ? '🌋 MAGMA SURGE INCOMING' : '⚠ ION STORM INCOMING';
        recovered.push(`⚠ ${hzLabel === 'artillery barrage' ? 'Artillery barrage' : hzLabel === 'magma surge' ? 'Magma surge' : 'Ion storm'} telegraphed — evacuate the marked tiles!`);
        setTimeout(() => set({ notice: null }), 2800);
      }
    }
    // blizzard turns on snow fields — ground units lose 15% hit for the whole phase
    const stormTheme = st.missionCh.theme === 'snow' ? 'snow' : st.missionCh.theme === 'desert' ? 'desert' : st.missionCh.theme === 'ruins' ? 'ruins' : st.missionCh.theme === 'sea' || st.missionCh.theme === 'mountain' ? 'rain' : null;
    const blizzard = stormTheme != null && nextTurn % 3 === 0;
    if (blizzard) {
      if (!notice) { notice = stormTheme === 'desert' ? '🏜 SANDSTORM — ground units -15% hit' : stormTheme === 'ruins' ? '🌫 ASH STORM — ground units -15% hit' : stormTheme === 'rain' ? '🌧 RAIN SQUALL — ground units -15% hit' : '❄ BLIZZARD — ground units -15% hit'; setTimeout(() => set({ notice: null }), 2800); }
      recovered.push(stormTheme === 'desert' ? '🏜 Sandstorm sweeps the field — ground units have -15% hit this turn.' : stormTheme === 'ruins' ? '🌫 Ash storm sweeps the ruins — ground units have -15% hit this turn.' : stormTheme === 'rain' ? '🌧 Rain squall sweeps the field — ground units have -15% hit this turn.' : '❄ Blizzard sweeps the field — ground units have -15% hit this turn.');
    }
    // bond resonance — bonded partners standing together feed each other's Will
    let resonated = false;
    const pAlive = units.filter((u) => u.alive && u.side === 'player');
    for (const a of pAlive)
      for (const b of pAlive)
        if (a.uid < b.uid && bondLevel(st.bonds, a.def.id, b.def.id) > 0 && dist(a.pos, b.pos) <= 2) {
          a.will = Math.min(150, (a.will ?? 100) + 1);
          b.will = Math.min(150, (b.will ?? 100) + 1);
          resonated = true;
        }
    if (resonated) recovered.push('💞 Bond resonance — adjacent partners gain +1 Will.');
    if (nextTurn % 2 === 0) {
      const talkers = units.filter((u) => u.alive && u.side === 'player' && !u.npc && TURN_CHATTER[u.def.pilot.callsign]);
      if (talkers.length) recovered.push(TURN_CHATTER[talkers[nextTurn % talkers.length].def.pilot.callsign]);
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

/** Awards the unique Drake's Cell part the first time Vossen defects (2+ drake downs). */
function grantDrakeCell(set: (p: Partial<Store>) => void, get: () => Store): boolean {
  const s = get();
  if (s.partsOwned.includes('drakeCell')) return false;
  const partsOwned = [...s.partsOwned, 'drakeCell'];
  set({ partsOwned });
  void persist({ ...s, partsOwned });
  return true;
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
    kills: s.kills, altKill: s.altKill, arcKill: s.arcKill, blastKill: s.blastKill, lostAlly: s.lostAlly, rescuedPods: s.rescuedPods, snipeKill: s.snipeKill, bossRush: s.bossRush, usedResupply: s.usedResupply,
    decoyHit: s.decoyHit,
    iFieldKill: s.iFieldKill,
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
