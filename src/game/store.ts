import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  CHAPTERS,
  CHAPTERS_COUNT,
  ITEMS,
  MAX_WEAPON_UPG,
  UPGRADE_STATS,
  UpgradeMap,
  WEAPON_UPG_POWER,
  WeaponUpgMap,
  ChapterDef,
  SIDE_MISSIONS,
  chapterOf,
  enemyLevelOf,
  genMap,
  rosterFor,
  sideAsChapter,
  upgradedStat,
  weaponUpgCost,
} from './campaign';
import { BOND_EVENTS, MAX_BOND, bondKey, bondLevel, bondMods } from './bonds';
import { MISSION_SSS, SPIRITS } from './data';
import { setMusicEnabled, setSoundEnabled } from '../audio';
import {
  applyAttack,
  applySpirit,
  checkEnd,
  clearTransientForOwnPhase,
  dist,
  key,
  makeUnit,
  MoveRec,
  movementRange,
  phaseRecovery,
  planEnemyActions,
  same,
  unitAt,
  usableWeapons,
  weaponsAgainst,
} from './engine';
import { AttackResult, BattleData, GameSettings, MapDef, Phase, Pos, SpiritId, UnitState, WeaponDef } from './types';

const SAVE_KEY = 'srwxyz_save_v1';
const SETTINGS_KEY = 'srwxyz_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = { battleMode: 'full', animSpeed: 1, sound: true, music: true };

export interface SaveData {
  chapter: number;
  credits: number;
  inventory: Record<string, number>;
  upgrades: UpgradeMap;
  weaponUpg: WeaponUpgMap;
  pilotProg: Record<string, { level: number; exp: number }>;
  bonds?: Record<string, number>;
  bondSeen?: string[];
  sideCleared?: string[];
}

export interface BattleAnim {
  attacker: UnitState;
  defender: UnitState;
  attackerAfter: UnitState; // post-attack state (for HP drain animation)
  defenderAfter: UnitState;
  weapon: WeaponDef;
  result: AttackResult;
}

interface Store {
  phase: Phase;
  turn: number;
  units: UnitState[];
  chapter: number; // index into CHAPTERS — next/current mission
  map: MapDef;
  credits: number;
  inventory: Record<string, number>;
  upgrades: UpgradeMap;
  weaponUpg: WeaponUpgMap;
  pilotProg: Record<string, { level: number; exp: number }>;
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
  threatTiles: Set<string>;
  kills: number; // enemies destroyed this mission
  cursor: Pos | null;
  selectedUid: string | null;
  moveTiles: Map<string, MoveRec>;
  walk: { uid: string; path: Pos[] } | null; // unit walking animation in progress
  pendingMove: Pos | null; // unit previewed here, menu open
  preMovePos: Pos | null; // original tile to revert to on cancel
  pendingMovedFlag: boolean;
  attackTiles: Set<string>;
  pendingWeapon: WeaponDef | null;
  menuForUid: string | null;
  spiritForUid: string | null;
  battle: BattleAnim | null;
  log: string[];
  enemyBusy: boolean;
  screenShake: number;

  start: () => void;
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
  clearInspect: () => void;
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
  waitUnit: () => void;
  openSpirits: (uid: string) => void;
  castSpirit: (uid: string, s: SpiritId) => void;
  endTurn: () => void;
  finishBattle: () => void;
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

function buildMission(ch: ChapterDef, pilotProg: Store['pilotProg'], upgrades: UpgradeMap, wupg: WeaponUpgMap, deploySel: string[]): { map: MapDef; units: UnitState[] } {
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
    }
    applyUpgrades(u, upgrades, wupg);
    units.push(u);
  }
  for (const s of map.enemySpawns) {
    const u = makeUnit(s.defId, 'enemy', s.pos, `e${i++}`);
    u.level = enemyLevelOf(ch, s.defId);
    units.push(u);
  }
  return { map, units };
}

async function persist(s: Pick<Store, 'chapter' | 'credits' | 'inventory' | 'upgrades' | 'pilotProg' | 'weaponUpg' | 'bonds' | 'bondSeen' | 'sideCleared'>) {
  const data: SaveData = { chapter: s.chapter, credits: s.credits, inventory: s.inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg: s.pilotProg, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared: s.sideCleared };
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {}
}

async function persistSettings(s: GameSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
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
  menuForUid: null,
  spiritForUid: null,
  battle: null,
  log: [],
  enemyBusy: false,
  screenShake: 0,
  chapter: 0,
  map: MISSION_SSS,
  credits: 0,
  inventory: {},
  upgrades: {},
  weaponUpg: {},
  pilotProg: {},
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
  threatTiles: new Set<string>(),
  kills: 0,

  start: () => set({ phase: 'onboarding', units: [], log: [] }),
  finishOnboarding: () => set({ phase: 'home' }),
  gotoBriefing: () => {
    const s = get();
    set({ phase: 'briefing', deploySel: rosterFor(chapterOf(s.chapter)) });
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
    void persist({ chapter: s.chapter, credits: s.credits, inventory: s.inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg: s.pilotProg, bonds, bondSeen, sideCleared: s.sideCleared });
  },

  startSideMission: (id) => {
    const s = get();
    const m = SIDE_MISSIONS.find((x) => x.id === id);
    if (!m || s.chapter < m.unlockCh || s.sideCleared.includes(id)) return;
    const ch = sideAsChapter(m);
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, []);
    set({ phase: 'player', sideId: id, missionCh: ch, map, units, kills: 0, turn: 1, log: [`SIDE QUEST: ${m.name}`, `Objective: ${ch.objective}`], inspectUid: null, threatTiles: new Set() });
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
    } catch {}
    set({ hasSave: false, chapter: 0, credits: 0, inventory: {}, upgrades: {}, weaponUpg: {}, pilotProg: {} });
  },

  toggleDeploy: (defId) => {
    const s = get();
    const has = s.deploySel.includes(defId);
    if (has && s.deploySel.length <= 1) return; // keep at least one unit deployed
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

  newCampaign: () => {
    const fresh = {
      chapter: 0,
      credits: 1200,
      inventory: { repairKit: 2, enCell: 1 } as Record<string, number>,
      upgrades: {} as UpgradeMap,
      weaponUpg: {} as WeaponUpgMap,
      pilotProg: {} as Store['pilotProg'],
      bonds: {} as Record<string, number>,
      bondSeen: [] as string[],
      sideCleared: [] as string[],
    };
    set({ ...fresh, hasSave: true, kills: 0, phase: 'prologue' });
    void persist({ ...fresh, bonds: fresh.bonds, bondSeen: fresh.bondSeen, sideCleared: fresh.sideCleared });
  },

  finishPrologue: () => set({ phase: 'hq' }),

  loadSave: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as SaveData;
      set({ chapter: d.chapter, credits: d.credits, inventory: d.inventory, upgrades: d.upgrades, weaponUpg: d.weaponUpg ?? {}, pilotProg: d.pilotProg, hasSave: true, bonds: d.bonds ?? {}, bondSeen: d.bondSeen ?? [], sideCleared: d.sideCleared ?? [] });
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
  },

  gotoHq: () => set({ phase: 'hq' }),

  buyItem: (itemId) => {
    const s = get();
    const item = ITEMS[itemId];
    if (!item || s.credits < item.price) return;
    const inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 };
    const credits = s.credits - item.price;
    set({ credits, inventory });
    void persist({ ...s, credits, inventory });
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
    const ch = chapterOf(s.chapter);
    const { map, units } = buildMission(ch, s.pilotProg, s.upgrades, s.weaponUpg, s.deploySel);
    set({ phase: 'dialog', sideId: null, missionCh: ch, map, units, kills: 0, turn: 1, log: [`Chapter ${ch.id}: ${ch.name}`, `Objective: ${ch.objective}`], inspectUid: null, threatTiles: new Set() });
  },
  finishDialog: () => set({ phase: 'player' }),

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
      menuForUid: null,
      spiritForUid: null,
      battle: null,
      log: [],
      enemyBusy: false,
      inspectUid: null,
      threatTiles: new Set(),
    }),

  tapTile: (p) => {
    const s = get();
    if (s.phase !== 'player' || s.battle || s.enemyBusy) return;

    // target selection mode
    if (s.pendingWeapon && s.pendingMove) {
      const t = unitAt(s.units, p);
      if (t && t.side === 'enemy' && s.attackTiles.has(key(p))) {
        get().chooseTarget(t.uid);
      }
      return;
    }

    // a move is previewed and menu open -> taps handled by menu, ignore map
    if (s.menuForUid) return;

    const u = unitAt(s.units, p);

    // tap an enemy: inspect card + threat-range overlay
    if (u && u.side === 'enemy' && !s.selectedUid) {
      const threat = threatTilesFor(s.map, s.units, u);
      set({ cursor: p, inspectUid: u.uid, threatTiles: threat });
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
        return;
      }
      // tapped elsewhere -> select that unit or deselect
      if (u && u.side === 'player' && !u.acted) {
        get().cancel();
        get().tapTile(p);
        return;
      }
      get().cancel();
      return;
    }

    if (u && u.side === 'player' && u.acted && s.inspectUid) {
      get().clearInspect();
      set({ cursor: p });
      return;
    }

    if (u && u.side === 'player' && !u.acted) {
      const tiles = movementRange(s.map, s.units, u);
      set({
        selectedUid: u.uid,
        cursor: p,
        moveTiles: tiles,
      });
      return;
    }
    set({ cursor: p });
  },

  confirmMove: (p) => {
    const s = get();
    const sel = s.units.find((x) => x.uid === s.selectedUid);
    if (!sel) return;
    const units = s.units.map((u) => (u.uid === sel.uid ? { ...u, pos: p, moved: true } : u));
    const path = pathTo(s.moveTiles, p);
    const walking = path.length > 1 ? { uid: sel.uid, path } : null;
    set({ units, walk: walking, pendingMove: p, preMovePos: sel.pos, pendingMovedFlag: !same(sel.pos, p), menuForUid: sel.uid, moveTiles: new Map(), selectedUid: sel.uid });
    if (walking) scheduleWalkClear(set, get, sel.uid, path.length);
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
      menuForUid: null,
      spiritForUid: null,
      inspectUid: null,
      threatTiles: new Set(),
    });
  },

  chooseWeapon: (w) => {
    const s = get();
    if (!s.menuForUid || !s.pendingMove) return;
    const u = s.units.find((x) => x.uid === s.menuForUid)!;
    // compute attack tiles + mark targets
    const tiles = new Set<string>();
    for (const e of s.units) {
      if (!e.alive || e.side !== 'enemy') continue;
      if (weaponsAgainst(u, s.pendingMove, e, s.pendingMovedFlag).some((x) => x.id === w.id)) tiles.add(key(e.pos));
    }
    set({ pendingWeapon: w, attackTiles: tiles });
  },

  chooseTarget: (uid) => {
    const s = get();
    if (!s.pendingWeapon || !s.menuForUid) return;
    const att = s.units.find((x) => x.uid === s.menuForUid)!;
    const def = s.units.find((x) => x.uid === uid)!;
    const { state, result } = applyAttack({ map: s.map, units: s.units, turn: s.turn }, att.uid, uid, s.pendingWeapon.id, (u) => bondMods(s.bonds, s.units, u));
    const attAfter = state.units.find((u) => u.uid === att.uid)!;
    const defAfter = state.units.find((u) => u.uid === uid)!;
    const log = push(
      s.log,
      result.hit
        ? `${att.def.name} hits ${def.def.name} with ${s.pendingWeapon.name} for ${result.damage}${result.crit ? ' CRIT!' : ''}${result.destroyed ? ' — DESTROYED' : ''}`
        : `${att.def.name} missed ${def.def.name} (${result.hitChance}%)`,
    );
    let log2 = result.counter
      ? push(
          log,
          result.counter.hit
            ? `${def.def.name} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`
            : `${def.def.name}'s counter missed`,
        )
      : log;
    for (const e of result.expEvents) log2 = push(log2, e);
    const common = {
      units: state.units,
      log: log2,
      kills: s.kills + (result.destroyed ? 1 : 0) + (result.counter?.destroyed ? 1 : 0),
      pendingWeapon: null,
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
      battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: s.pendingWeapon, result },
      phase: 'battle',
    });
  },

  waitUnit: () => {
    const s = get();
    if (!s.menuForUid) return;
    const uid = s.menuForUid;
    const units = s.units.map((u) => (u.uid === uid ? { ...u, acted: true, moved: true } : u));
    set({ units, menuForUid: null, pendingMove: null, selectedUid: null, moveTiles: new Map(), inspectUid: null, threatTiles: new Set() });
  },

  openSpirits: (uid) => set({ spiritForUid: uid }),

  castSpirit: (uid, sp) => {
    const s = get();
    const target = s.units.find((x) => x.uid === uid);
    if (!target || target.sp < SPIRITS[sp].cost) {
      set({ spiritForUid: null });
      return;
    }
    const units = s.units.map((u) => {
      if (u.uid !== uid) return u;
      const c = { ...u };
      applySpirit(c, sp);
      return c;
    });
    const u = units.find((x) => x.uid === uid)!;
    const tiles = movementRange(s.map, units, u);
    set({
      units,
      spiritForUid: null,
      log: push(s.log, `${u.def.name} uses ${SPIRITS[sp].name}`),
      moveTiles: s.menuForUid ? new Map() : tiles,
    });
  },

  finishBattle: () => {
    const s = get();
    const end = checkEnd(s.units, s.missionCh, s.turn);
    if (end === 'victory') {
      applyVictory(set, get);
      return;
    }
    set({ battle: null, phase: end === 'defeat' ? 'defeat' : s.enemyBusy ? 'enemy' : 'player' });
  },

  endTurn: () => {
    const s = get();
    if (s.phase !== 'player' || s.enemyBusy) return;
    get().cancel();
    const healed: string[] = [];
    const units = s.units.map((u) => {
      if (u.side !== 'enemy' || !u.alive) return u;
      const c = { ...u };
      const r = phaseRecovery(c, s.map);
      if (r.hpGain > 0) healed.push(`${c.def.name} +${r.hpGain} HP`);
      if (r.hpLoss > 0) healed.push(`${c.def.name} -${r.hpLoss} HP (burning terrain)`);
      return c;
    });
    let log = push(s.log, `— Turn ${s.turn} enemy phase —`);
    for (const l of healed) log = push(log, l);
    set({ phase: 'enemy', enemyBusy: true, units, log, inspectUid: null, threatTiles: new Set() });
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

// award credits + persist pilot levels when a mission is won
function applyVictory(set: SetFn, get: Get) {
  const s = get();
  const pilotProg = { ...s.pilotProg };
  for (const u of s.units) {
    if (u.side === 'player') pilotProg[u.def.id] = { level: u.level, exp: u.exp };
  }
  const side = s.sideId ? SIDE_MISSIONS.find((m) => m.id === s.sideId) : undefined;
  if (side) {
    const reward = side.rewardCr + s.kills * 150;
    const credits = s.credits + reward;
    const inventory = side.rewardItem ? { ...s.inventory, [side.rewardItem]: (s.inventory[side.rewardItem] ?? 0) + 1 } : s.inventory;
    const sideCleared = [...s.sideCleared, side.id];
    set({
      battle: null,
      phase: 'victory',
      credits,
      inventory,
      sideCleared,
      pilotProg,
      sideId: null,
      log: push(s.log, `Side quest cleared! +${reward} credits${side.rewardItem ? ` + ${ITEMS[side.rewardItem].name}` : ''}`),
    });
    void persist({ chapter: s.chapter, credits, inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared });
    return;
  }
  const ch = s.missionCh;
  const credits = s.credits + 800 + ch.id * 150 + s.kills * 150;
  const chapter = s.chapter + 1;
  set({
    battle: null,
    phase: 'victory',
    credits,
    pilotProg,
    chapter,
    sideId: null,
    log: push(s.log, `Mission complete! +${800 + ch.id * 150 + s.kills * 150} credits`),
  });
  void persist({ chapter, credits, inventory: s.inventory, upgrades: s.upgrades, weaponUpg: s.weaponUpg, pilotProg, bonds: s.bonds, bondSeen: s.bondSeen, sideCleared: s.sideCleared });
}

async function runEnemyPhase(set: SetFn, get: Get) {
  await sleep(650);
  let guard = 0;
  while (guard++ < 20) {
    const s = get();
    if (s.phase !== 'enemy') return;
    const plans = planEnemyActions({ map: s.map, units: s.units, turn: s.turn });
    const remaining = plans.filter((pl) => !s.units.find((u) => u.uid === pl.unit.uid)?.acted);
    const plan = remaining[0];
    if (!plan) break;

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
    }

    if (plan.target && plan.weapon) {
      const cur = get();
      const att = cur.units.find((u) => u.uid === plan.unit.uid)!;
      const def = cur.units.find((u) => u.uid === plan.target!.uid)!;
      const { state, result } = applyAttack({ map: cur.map, units: cur.units, turn: cur.turn }, att.uid, def.uid, plan.weapon.id, (u) => bondMods(cur.bonds, cur.units, u));
      const attAfter = state.units.find((u) => u.uid === att.uid)!;
      const defAfter = state.units.find((u) => u.uid === def.uid)!;
      const mkLog = (l: string[]) =>
        result.expEvents.reduce(
          (ll, e) => push(ll, e),
          result.counter
            ? push(
                l,
                `${att.def.name} hits ${def.def.name} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''} · ${def.def.name} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`,
              )
            : push(
                l,
                result.hit
                  ? `${att.def.name} hits ${def.def.name} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''}`
                  : `${att.def.name} missed ${def.def.name}`,
              ),
        );
      if (cur.settings.battleMode === 'off') {
        set((st) => ({ units: state.units, kills: st.kills + (result.destroyed ? 1 : 0) + (result.counter?.destroyed ? 1 : 0), log: mkLog(st.log) }));
        const end = checkEnd(get().units, get().missionCh, get().turn);
        if (end) {
          if (end === 'victory') applyVictory(set, get);
          else set({ phase: end, enemyBusy: false });
          return;
        }
        await sleep(120);
        continue;
      }
      set((st) => ({
        units: state.units,
        phase: 'battle',
        kills: st.kills + (result.destroyed ? 1 : 0) + (result.counter?.destroyed ? 1 : 0),
        log: mkLog(st.log),
        battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: plan.weapon!, result },
      }));
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
      set((st) => ({ units: st.units.map((u) => (u.uid === plan.unit.uid ? { ...u, acted: true } : u)) }));
      await sleep(140);
    }
  }

  // new player turn — clear flags + EN regen / base-city heal
  let pendingVictory = false;
  set((st) => {
    const recovered: string[] = [];
    const units = st.units.map((u) => {
      const c = { ...u };
      if (c.side === 'player') clearTransientForOwnPhase(c);
      else {
        c.moved = false;
        c.acted = false;
      }
      if (c.alive) {
        const r = phaseRecovery(c, st.map);
        if (r.hpGain > 0) recovered.push(`${c.def.name} +${r.hpGain} HP`);
        if (r.hpLoss > 0) recovered.push(`${c.def.name} -${r.hpLoss} HP (burning terrain)`);
      }
      return c;
    });
    const nextTurn = st.turn + 1;
    const end = checkEnd(units, st.missionCh, nextTurn);
    let log = push(st.log, `— Turn ${nextTurn} player phase —`);
    for (const l of recovered) log = push(log, l);
    if (end === 'victory') {
      // survive-objective reached its turn limit — resolve outside this updater
      pendingVictory = true;
      return { units, turn: nextTurn };
    }
    return {
      units,
      phase: end === 'defeat' ? 'defeat' : 'player',
      enemyBusy: false,
      turn: nextTurn,
      log,
    };
  });
  if (pendingVictory) applyVictory(set, get);
}

function waitFor(cond: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t = setInterval(() => {
      if (cond()) {
        clearInterval(t);
        resolve();
      }
    }, 120);
  });
}

// selectors
export const alivePlayers = (s: Store) => s.units.filter((u) => u.alive && u.side === 'player');
export const aliveEnemies = (s: Store) => s.units.filter((u) => u.alive && u.side === 'enemy');
