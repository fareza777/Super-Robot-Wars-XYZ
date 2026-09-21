import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { CHAPTERS, CHAPTERS_COUNT, ITEMS, UPGRADE_STATS, UpgradeMap, chapterOf, enemyLevelOf, genMap, upgradedStat } from './campaign';
import { MISSION_SSS, SPIRITS } from './data';
import {
  applyAttack,
  applySpirit,
  checkEnd,
  clearTransientForOwnPhase,
  key,
  makeUnit,
  MoveRec,
  movementRange,
  planEnemyActions,
  same,
  unitAt,
  usableWeapons,
  weaponsAgainst,
} from './engine';
import { AttackResult, BattleData, MapDef, Phase, Pos, SpiritId, UnitState, WeaponDef } from './types';

const SAVE_KEY = 'srwxyz_save_v1';

export interface SaveData {
  chapter: number;
  credits: number;
  inventory: Record<string, number>;
  upgrades: UpgradeMap;
  pilotProg: Record<string, { level: number; exp: number }>;
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
  pilotProg: Record<string, { level: number; exp: number }>;
  hasSave: boolean;
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
  replayStory: () => void;
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

function applyUpgrades(u: UnitState, up: UpgradeMap) {
  const rec = up[u.def.id];
  if (!rec) return;
  u.def = {
    ...u.def,
    maxHp: u.def.maxHp + (rec.hp ?? 0) * 400,
    maxEn: u.def.maxEn + (rec.en ?? 0) * 15,
    armor: u.def.armor + (rec.armor ?? 0) * 90,
    mobility: u.def.mobility + (rec.mobility ?? 0) * 6,
  };
  u.hp = u.def.maxHp;
  u.en = u.def.maxEn;
}

function buildMission(chapterIdx: number, pilotProg: Store['pilotProg'], upgrades: UpgradeMap): { map: MapDef; units: UnitState[] } {
  const ch = chapterOf(chapterIdx);
  const map = genMap(ch);
  const units: UnitState[] = [];
  let i = 0;
  for (const s of map.playerSpawns) {
    const u = makeUnit(s.defId, 'player', s.pos, `p${i++}`);
    const prog = pilotProg[s.defId];
    if (prog) {
      u.level = prog.level;
      u.exp = prog.exp;
    }
    applyUpgrades(u, upgrades);
    units.push(u);
  }
  for (const s of map.enemySpawns) {
    const u = makeUnit(s.defId, 'enemy', s.pos, `e${i++}`);
    u.level = enemyLevelOf(ch, s.defId);
    units.push(u);
  }
  return { map, units };
}

async function persist(s: Pick<Store, 'chapter' | 'credits' | 'inventory' | 'upgrades' | 'pilotProg'>) {
  const data: SaveData = { chapter: s.chapter, credits: s.credits, inventory: s.inventory, upgrades: s.upgrades, pilotProg: s.pilotProg };
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {}
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
  pilotProg: {},
  hasSave: false,
  kills: 0,

  start: () => set({ phase: 'onboarding', units: [], log: [] }),
  finishOnboarding: () => set({ phase: 'home' }),
  gotoBriefing: () => set({ phase: 'briefing' }),
  replayStory: () => set({ phase: 'onboarding' }),

  newCampaign: () => {
    const fresh = { chapter: 0, credits: 1200, inventory: { repairKit: 2, enCell: 1 } as Record<string, number>, upgrades: {} as UpgradeMap, pilotProg: {} as Store['pilotProg'] };
    set({ ...fresh, hasSave: true, kills: 0, phase: 'prologue' });
    void persist(fresh);
  },

  finishPrologue: () => set({ phase: 'hq' }),

  loadSave: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as SaveData;
      set({ chapter: d.chapter, credits: d.credits, inventory: d.inventory, upgrades: d.upgrades, pilotProg: d.pilotProg, hasSave: true });
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
    void persist({ chapter: s.chapter, credits, inventory, upgrades: s.upgrades, pilotProg: s.pilotProg });
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
    void persist({ chapter: s.chapter, credits, inventory: s.inventory, upgrades, pilotProg: s.pilotProg });
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
    void persist({ chapter: s.chapter, credits: s.credits, inventory, upgrades: s.upgrades, pilotProg: s.pilotProg });
  },

  startMission: () => {
    const s = get();
    const { map, units } = buildMission(s.chapter, s.pilotProg, s.upgrades);
    const ch = chapterOf(s.chapter);
    set({ phase: 'dialog', map, units, kills: 0, turn: 1, log: [`Chapter ${ch.id}: ${ch.name}`] });
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
    const { state, result } = applyAttack({ map: s.map, units: s.units, turn: s.turn }, att.uid, uid, s.pendingWeapon.id);
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
    set({
      units: state.units,
      log: log2,
      kills: s.kills + (result.destroyed ? 1 : 0) + (result.counter?.destroyed ? 1 : 0),
      battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: s.pendingWeapon, result },
      phase: 'battle',
      pendingWeapon: null,
      attackTiles: new Set(),
      menuForUid: null,
      pendingMove: null,
      selectedUid: null,
    });
  },

  waitUnit: () => {
    const s = get();
    if (!s.menuForUid) return;
    const uid = s.menuForUid;
    const units = s.units.map((u) => (u.uid === uid ? { ...u, acted: true, moved: true } : u));
    set({ units, menuForUid: null, pendingMove: null, selectedUid: null, moveTiles: new Map() });
  },

  openSpirits: (uid) => set({ spiritForUid: uid }),

  castSpirit: (uid, sp) => {
    const s = get();
    const units = s.units.map((u) => {
      if (u.uid !== uid) return u;
      const c = { ...u };
      if (c.sp < SPIRITS[sp].cost) return c;
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
    const end = checkEnd(s.units);
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
    set({ phase: 'enemy', enemyBusy: true, log: push(s.log, `— Turn ${s.turn} enemy phase —`) });
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
  const ch = chapterOf(s.chapter);
  const credits = s.credits + 800 + ch.id * 150 + s.kills * 150;
  const pilotProg = { ...s.pilotProg };
  for (const u of s.units) {
    if (u.side === 'player') pilotProg[u.def.id] = { level: u.level, exp: u.exp };
  }
  const chapter = s.chapter + 1;
  set({
    battle: null,
    phase: 'victory',
    credits,
    pilotProg,
    chapter,
    log: push(s.log, `Mission complete! +${800 + ch.id * 150 + s.kills * 150} credits`),
  });
  void persist({ chapter, credits, inventory: s.inventory, upgrades: s.upgrades, pilotProg });
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
      const { state, result } = applyAttack({ map: cur.map, units: cur.units, turn: cur.turn }, att.uid, def.uid, plan.weapon.id);
      const attAfter = state.units.find((u) => u.uid === att.uid)!;
      const defAfter = state.units.find((u) => u.uid === def.uid)!;
      set((st) => ({
        units: state.units,
        phase: 'battle',
        kills: st.kills + (result.destroyed ? 1 : 0) + (result.counter?.destroyed ? 1 : 0),
        log: result.expEvents.reduce(
          (l, e) => push(l, e),
          result.counter
            ? push(
                st.log,
                `${att.def.name} hits ${def.def.name} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''} · ${def.def.name} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`,
              )
            : push(
                st.log,
                result.hit
                  ? `${att.def.name} hits ${def.def.name} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''}`
                  : `${att.def.name} missed ${def.def.name}`,
              ),
        ),
        battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: plan.weapon!, result },
      }));
      // wait for player-visible battle anim to finish (finishBattle returns phase to 'enemy' since enemyBusy)
      await waitFor(() => get().battle === null);
      const end = checkEnd(get().units);
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

  // new player turn
  set((st) => ({
    units: st.units.map((u) => {
      const c = { ...u };
      if (c.side === 'player') clearTransientForOwnPhase(c);
      else {
        c.moved = false;
        c.acted = false;
      }
      return c;
    }),
    phase: checkEnd(st.units) ?? 'player',
    enemyBusy: false,
    turn: st.turn + 1,
    log: push(st.log, `— Turn ${st.turn + 1} player phase —`),
  }));
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
