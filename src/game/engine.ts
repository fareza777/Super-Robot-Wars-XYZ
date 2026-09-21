import { ALL_UNITS } from './campaign';
import { SPIRITS, TERRAIN_INFO } from './data';
import { AttackResult, MapDef, Pos, SpiritId, Terrain, UnitState, WeaponDef } from './types';

export const key = (p: Pos) => `${p.x},${p.y}`;
export const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
export const dist = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function makeUnit(defId: string, side: UnitState['side'], pos: Pos, uid: string): UnitState {
  const def = ALL_UNITS[defId];
  const ammo: Record<string, number> = {};
  for (const w of def.weapons) if (w.ammo != null) ammo[w.id] = w.ammo;
  return {
    uid,
    side,
    def,
    hp: def.maxHp,
    en: def.maxEn,
    sp: def.pilot.maxSp,
    pos,
    ammo,
    level: def.level ?? 1,
    exp: 0,
    moved: false,
    acted: false,
    alive: true,
  };
}

export function terrainAt(map: MapDef, p: Pos): Terrain {
  if (p.x < 0 || p.y < 0 || p.x >= map.cols || p.y >= map.rows) return 'plain';
  return map.terrain[p.y][p.x];
}

export function unitAt(units: UnitState[], p: Pos): UnitState | undefined {
  return units.find((u) => u.alive && same(u.pos, p));
}

export function moveRangeOf(u: UnitState): number {
  return u.def.moveRange + (u.accelThisTurn ?? 0);
}

/** BFS over terrain move cost; blocked tiles occupied by other units. */
export interface MoveRec {
  pos: Pos;
  cost: number;
  from?: Pos; // BFS predecessor — reconstructs the walked path
}

export function movementRange(map: MapDef, units: UnitState[], u: UnitState): Map<string, MoveRec> {
  const range = moveRangeOf(u);
  const mt = u.def.moveType;
  const blocked = new Set(units.filter((o) => o.alive && o.uid !== u.uid).map((o) => key(o.pos)));
  const out = new Map<string, MoveRec>();
  const start = key(u.pos);
  out.set(start, { pos: u.pos, cost: 0 });
  // dijkstra-lite (costs 1-3)
  const frontier: { pos: Pos; cost: number }[] = [{ pos: u.pos, cost: 0 }];
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    for (const d of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const np = { x: cur.pos.x + d.x, y: cur.pos.y + d.y };
      if (np.x < 0 || np.y < 0 || np.x >= map.cols || np.y >= map.rows) continue;
      const nk = key(np);
      if (blocked.has(nk)) continue;
      const t = TERRAIN_INFO[terrainAt(map, np)];
      if (!t.passable[mt]) continue;
      const nc = cur.cost + t.moveCost[mt];
      if (nc > range) continue;
      const prev = out.get(nk);
      if (prev && prev.cost <= nc) continue;
      out.set(nk, { pos: np, cost: nc, from: cur.pos });
      frontier.push({ pos: np, cost: nc });
    }
  }
  return out;
}

export function usableWeapons(u: UnitState): WeaponDef[] {
  return u.def.weapons.filter((w) => u.en >= w.enCost && (w.ammo == null || (u.ammo[w.id] ?? 0) > 0));
}

/** Weapons that can attack `target` from `from`. postMove=false weapons require !moved. */
export function weaponsAgainst(u: UnitState, from: Pos, target: UnitState, moved: boolean): WeaponDef[] {
  const r = dist(from, target.pos);
  return usableWeapons(u).filter((w) => r >= w.rangeMin && r <= w.rangeMax && (!moved || w.postMove));
}

/** All tiles attackable by weapon w standing at `from`. */
export function attackTiles(map: MapDef, from: Pos, w: WeaponDef): Pos[] {
  const out: Pos[] = [];
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const d = dist(from, { x, y });
      if (d >= w.rangeMin && d <= w.rangeMax) out.push({ x, y });
    }
  return out;
}

// ---------- Combat ----------

function evadeOf(u: UnitState, map: MapDef): number {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  return u.def.mobility + u.def.pilot.evade + (u.level - 1) * 2 + t.eva + (u.focusUntilEndOfEnemyPhase ? 30 : 0);
}

function armorOf(u: UnitState, map: MapDef): number {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  return u.def.armor + (u.level - 1) * 40 + t.def + (u.gritUntilEndOfEnemyPhase ? 400 : 0);
}

function statFor(u: UnitState, w: WeaponDef): number {
  return (w.kind === 'melee' ? u.def.pilot.melee : u.def.pilot.ranged) + (u.level - 1) * 3;
}

export function hitChance(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef): number {
  if (att.strikeForNextAttack) return 100;
  const raw = 65 + statFor(att, w) * 0.6 + w.hitMod + att.def.mobility * 0.25 - evadeOf(def, map) * 0.55;
  return Math.max(10, Math.min(100, Math.round(raw)));
}

export function damageOf(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, crit: boolean): number {
  const raw = w.power + statFor(att, w) * 10 - armorOf(def, map);
  let dmg = Math.max(120, Math.round(raw));
  if (crit) dmg = Math.round(dmg * 1.3);
  if (att.valorForNextAttack) dmg = Math.round(dmg * 1.5);
  if (def.guardUntilEndOfEnemyPhase) dmg = Math.round(dmg * 0.5);
  return dmg;
}

const rnd = () => Math.random() * 100;
const critRoll = (att: UnitState, def: UnitState) => rnd() < Math.max(5, 8 + (att.def.mobility - def.def.mobility) * 0.2);

interface SimAttack {
  hit: boolean;
  crit: boolean;
  damage: number;
  hitChance: number;
  destroyed: boolean;
}

function resolveHit(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef): SimAttack {
  const hc = hitChance(att, def, w, map);
  const hit = rnd() < hc;
  if (!hit) return { hit: false, crit: false, damage: 0, hitChance: hc, destroyed: false };
  const crit = critRoll(att, def);
  const damage = damageOf(att, def, w, map, crit);
  return { hit, crit, damage, hitChance: hc, destroyed: def.hp - damage <= 0 };
}

function bestCounterWeapon(def: UnitState, attPos: Pos): WeaponDef | undefined {
  const opts = usableWeapons(def).filter((w) => dist(def.pos, attPos) >= w.rangeMin && dist(def.pos, attPos) <= w.rangeMax);
  opts.sort((a, b) => b.power - a.power);
  return opts[0];
}

/** Resolve a full attack including a possible single counter-attack. Pure-ish: mutates nothing, returns result. */
export function simulateAttack(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef): AttackResult {
  const first = resolveHit(att, def, w, map);
  let counter: AttackResult['counter'] = null;
  if (!first.destroyed) {
    // defender counter with its strongest in-range weapon (even if it "acted")
    const cw = bestCounterWeapon(def, att.pos);
    if (cw) {
      const c = resolveHit(def, att, cw, map);
      counter = { weapon: cw, ...c };
    }
  }
  return { hit: first.hit, crit: first.crit, damage: first.damage, destroyed: first.destroyed, hitChance: first.hitChance, counter, expEvents: [] };
}

// ---------- Store-level actions (pure functions on state slices) ----------

export interface GameState {
  map: MapDef;
  units: UnitState[];
  turn: number;
}

export function applyAttack(state: GameState, attackerUid: string, defenderUid: string, weaponId: string): { state: GameState; result: AttackResult } {
  const units = state.units.map((u) => ({ ...u, ammo: { ...u.ammo } }));
  const att = units.find((u) => u.uid === attackerUid)!;
  const def = units.find((u) => u.uid === defenderUid)!;
  const w = att.def.weapons.find((x) => x.id === weaponId)!;
  const result = simulateAttack(att, def, w, state.map);

  att.en = Math.max(0, att.en - w.enCost);
  if (w.ammo != null) att.ammo[w.id] = (att.ammo[w.id] ?? 0) - 1;
  if (result.hit) def.hp = Math.max(0, def.hp - result.damage);
  if (result.destroyed) def.alive = false;

  if (result.counter) {
    const cw = result.counter.weapon;
    def.en = Math.max(0, def.en - cw.enCost);
    if (cw.ammo != null) def.ammo[cw.id] = (def.ammo[cw.id] ?? 0) - 1;
    if (result.counter.hit) att.hp = Math.max(0, att.hp - result.counter.damage);
    if (result.counter.destroyed) att.alive = false;
  }

  att.moved = true;
  att.acted = true;
  att.strikeForNextAttack = false;
  att.valorForNextAttack = false;

  // EXP: +30 for a landed hit, +70 for a kill (counter kills award the countering unit)
  result.expEvents = [];
  if (result.hit) awardExp(att, result.destroyed ? 70 : 30, result.expEvents);
  if (result.counter?.hit) awardExp(def, result.counter.destroyed ? 70 : 25, result.expEvents);
  return { state: { ...state, units }, result };
}

const MAX_LEVEL = 9;

function awardExp(u: UnitState, amount: number, events: string[]) {
  if (!u.alive || u.level >= MAX_LEVEL) return;
  u.exp += amount;
  events.push(`${u.def.name} +${amount} EXP`);
  while (u.exp >= 100 && u.level < MAX_LEVEL) {
    u.exp -= 100;
    u.level += 1;
    events.push(`${u.def.pilot.name} LEVEL UP → Lv${u.level}!`);
  }
  if (u.level >= MAX_LEVEL) u.exp = 0;
}

export function applySpirit(u: UnitState, spirit: SpiritId): void {
  const s = SPIRITS[spirit];
  u.sp = Math.max(0, u.sp - s.cost);
  switch (spirit) {
    case 'focus':
      u.focusUntilEndOfEnemyPhase = true;
      break;
    case 'grit':
      u.gritUntilEndOfEnemyPhase = true;
      break;
    case 'guard':
      u.guardUntilEndOfEnemyPhase = true;
      break;
    case 'strike':
      u.strikeForNextAttack = true;
      break;
    case 'valor':
      u.valorForNextAttack = true;
      break;
    case 'accel':
      u.accelThisTurn = (u.accelThisTurn ?? 0) + 3;
      break;
  }
}

export function clearTransientForOwnPhase(u: UnitState): void {
  u.focusUntilEndOfEnemyPhase = false;
  u.gritUntilEndOfEnemyPhase = false;
  u.guardUntilEndOfEnemyPhase = false;
  u.accelThisTurn = 0;
  u.moved = false;
  u.acted = false;
}

// ---------- Enemy AI ----------

interface AiPlan {
  unit: UnitState;
  moveTo: Pos;
  target?: UnitState;
  weapon?: WeaponDef;
}

/** For each enemy unit pick: best tile in range that can attack the weakest-hit player unit; else move toward nearest player. */
export function planEnemyActions(state: GameState): AiPlan[] {
  const { map, units } = state;
  const players = units.filter((u) => u.alive && u.side === 'player');
  const enemies = units.filter((u) => u.alive && u.side === 'enemy');
  const plans: AiPlan[] = [];
  const claimed = new Set<string>(); // tiles other AI units plan to occupy

  for (const e of enemies) {
    const moveTiles = [...movementRange(map, units, e).values()].map((v) => v.pos).filter((p) => {
      const occ = unitAt(units, p);
      return (!occ || occ.uid === e.uid) && !claimed.has(key(p));
    });
    let best: { pos: Pos; target: UnitState; weapon: WeaponDef; score: number } | null = null;
    const willMove = (p: Pos) => !same(p, e.pos);
    for (const tile of moveTiles) {
      for (const p of players) {
        for (const w of weaponsAgainst(e, tile, p, willMove(tile))) {
          const hc = hitChance(e, p, w, map);
          const dmg = damageOf(e, p, w, map, false);
          const score = dmg * (hc / 100) + (p.hp - dmg <= 0 ? 5000 : 0) + w.power * 0.01;
          if (!best || score > best.score) best = { pos: tile, target: p, weapon: w, score };
        }
      }
    }
    if (best) {
      claimed.add(key(best.pos));
      plans.push({ unit: e, moveTo: best.pos, target: best.target, weapon: best.weapon });
    } else {
      // advance toward nearest player
      const nearest = players.slice().sort((a, b) => dist(e.pos, a.pos) - dist(e.pos, b.pos))[0];
      if (!nearest) continue;
      const target = moveTiles.slice().sort((a, b) => dist(a, nearest.pos) - dist(b, nearest.pos))[0] ?? e.pos;
      claimed.add(key(target));
      plans.push({ unit: e, moveTo: target });
    }
  }
  return plans;
}

export interface EndObjective {
  objectiveType?: 'rout' | 'survive' | 'boss';
  surviveTurns?: number;
}

export function checkEnd(units: UnitState[], obj?: EndObjective | null, turn?: number): 'victory' | 'defeat' | null {
  if (!units.some((u) => u.alive && u.side === 'player')) return 'defeat';
  const type = obj?.objectiveType ?? 'rout';
  if (type === 'boss') {
    // win as soon as the boss unit falls, regardless of remaining grunts
    if (!units.some((u) => u.alive && u.side === 'enemy' && u.def.boss)) return 'victory';
    return null;
  }
  if (type === 'survive') {
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return (turn ?? 0) > (obj?.surviveTurns ?? 8) ? 'victory' : null;
  }
  if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
  return null;
}

/** Start-of-own-phase recovery: EN regen + heal on base/city tiles (SRW style). */
export function phaseRecovery(u: UnitState, map: MapDef): { hpGain: number; enGain: number } {
  const onBase = terrainAt(map, u.pos) === 'base' || terrainAt(map, u.pos) === 'city';
  const enGain = Math.min(u.def.maxEn - u.en, 5 + (onBase ? 10 : 0));
  const hpGain = onBase ? Math.min(u.def.maxHp - u.hp, Math.round(u.def.maxHp * 0.1)) : 0;
  u.en += enGain;
  u.hp += hpGain;
  return { hpGain, enGain };
}
