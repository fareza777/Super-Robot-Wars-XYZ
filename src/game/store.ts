import { create } from 'zustand';
import { MISSION_SSS, SPIRITS } from './data';
import {
  applyAttack,
  applySpirit,
  checkEnd,
  clearTransientForOwnPhase,
  key,
  makeUnit,
  movementRange,
  planEnemyActions,
  same,
  unitAt,
  usableWeapons,
  weaponsAgainst,
} from './engine';
import { AttackResult, BattleData, Phase, Pos, SpiritId, UnitState, WeaponDef } from './types';

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
  cursor: Pos | null;
  selectedUid: string | null;
  moveTiles: Map<string, Pos>;
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

function initUnits() {
  const units: UnitState[] = [];
  let i = 0;
  for (const s of MISSION_SSS.playerSpawns) units.push(makeUnit(s.defId, 'player', s.pos, `p${i++}`));
  for (const s of MISSION_SSS.enemySpawns) units.push(makeUnit(s.defId, 'enemy', s.pos, `e${i++}`));
  return units;
}

export const useGame = create<Store>((set, get) => ({
  phase: 'title',
  turn: 1,
  units: [],
  cursor: null,
  selectedUid: null,
  moveTiles: new Map(),
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

  start: () => set({ phase: 'onboarding', units: initUnits(), log: ['Mission SSS: Steel Sky Siege'] }),
  finishOnboarding: () => set({ phase: 'home' }),
  gotoBriefing: () => set({ phase: 'briefing' }),
  replayStory: () => set({ phase: 'onboarding' }),
  startMission: () => set({ phase: 'dialog' }),
  finishDialog: () => set({ phase: 'player' }),

  restart: () =>
    set({
      phase: 'home',
      turn: 1,
      units: [],
      cursor: null,
      selectedUid: null,
      moveTiles: new Map(),
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
      const tiles = movementRange(MISSION_SSS, s.units, u);
      set({
        selectedUid: u.uid,
        cursor: p,
        moveTiles: new Map([...tiles.entries()].map(([k, v]) => [k, v.pos])),
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
    set({ units, pendingMove: p, preMovePos: sel.pos, pendingMovedFlag: !same(sel.pos, p), menuForUid: sel.uid, moveTiles: new Map(), selectedUid: sel.uid });
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
    const { state, result } = applyAttack({ map: MISSION_SSS, units: s.units, turn: s.turn }, att.uid, uid, s.pendingWeapon.id);
    const attAfter = state.units.find((u) => u.uid === att.uid)!;
    const defAfter = state.units.find((u) => u.uid === uid)!;
    const log = push(
      s.log,
      result.hit
        ? `${att.def.name} hits ${def.def.name} with ${s.pendingWeapon.name} for ${result.damage}${result.crit ? ' CRIT!' : ''}${result.destroyed ? ' — DESTROYED' : ''}`
        : `${att.def.name} missed ${def.def.name} (${result.hitChance}%)`,
    );
    const log2 = result.counter
      ? push(
          log,
          result.counter.hit
            ? `${def.def.name} counters for ${result.counter.damage}${result.counter.destroyed ? ' — DESTROYED' : ''}`
            : `${def.def.name}'s counter missed`,
        )
      : log;
    set({
      units: state.units,
      log: log2,
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
    const tiles = movementRange(MISSION_SSS, units, u);
    set({
      units,
      spiritForUid: null,
      log: push(s.log, `${u.def.name} uses ${SPIRITS[sp].name}`),
      moveTiles: s.menuForUid ? new Map() : new Map([...tiles.entries()].map(([k, v]) => [k, v.pos])),
    });
  },

  finishBattle: () => {
    const s = get();
    const end = checkEnd(s.units);
    set({ battle: null, phase: end === 'victory' ? 'victory' : end === 'defeat' ? 'defeat' : s.enemyBusy ? 'enemy' : 'player' });
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

async function runEnemyPhase(set: SetFn, get: Get) {
  await sleep(650);
  let guard = 0;
  while (guard++ < 20) {
    const s = get();
    if (s.phase !== 'enemy') return;
    const plans = planEnemyActions({ map: MISSION_SSS, units: s.units, turn: s.turn });
    const remaining = plans.filter((pl) => !s.units.find((u) => u.uid === pl.unit.uid)?.acted);
    const plan = remaining[0];
    if (!plan) break;

    // move unit
    set((st) => ({
      units: st.units.map((u) => (u.uid === plan.unit.uid ? { ...u, pos: plan.moveTo, moved: true } : u)),
    }));
    await sleep(320);

    if (plan.target && plan.weapon) {
      const cur = get();
      const att = cur.units.find((u) => u.uid === plan.unit.uid)!;
      const def = cur.units.find((u) => u.uid === plan.target!.uid)!;
      const { state, result } = applyAttack({ map: MISSION_SSS, units: cur.units, turn: cur.turn }, att.uid, def.uid, plan.weapon.id);
      const attAfter = state.units.find((u) => u.uid === att.uid)!;
      const defAfter = state.units.find((u) => u.uid === def.uid)!;
      set((st) => ({
        units: state.units,
        phase: 'battle',
        log: push(
          st.log,
          result.hit
            ? `${att.def.name} hits ${def.def.name} for ${result.damage}${result.destroyed ? ' — DESTROYED' : ''}`
            : `${att.def.name} missed ${def.def.name}`,
        ),
        battle: { attacker: { ...att }, defender: { ...def }, attackerAfter: attAfter, defenderAfter: defAfter, weapon: plan.weapon!, result },
      }));
      // wait for player-visible battle anim to finish (finishBattle returns phase to 'enemy' since enemyBusy)
      await waitFor(() => get().battle === null);
      const end = checkEnd(get().units);
      if (end) {
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
