import { ALL_UNITS, PARTS } from './campaign';
import { SPIRITS, TERRAIN_INFO } from './data';
import { AttackResult, MapDef, Pos, Reaction, SpiritId, Terrain, UnitState, WeaponDef } from './types';

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
    will: 100,
    kills: 0,
    parts: [],
    pp: 0,
    skills: { hit: 0, evade: 0, dmg: 0, def: 0 },
  };
}

/** Sum a stat bonus across the unit's equipped enhancement parts. */
export function partBonus(u: UnitState, stat: 'armor' | 'mobility' | 'move' | 'hit' | 'dmg' | 'hp' | 'en' | 'evade'): number {
  let n = 0;
  for (const p of u.parts) n += PARTS[p]?.[stat] ?? 0;
  return n;
}

export function terrainAt(map: MapDef, p: Pos): Terrain {
  if (p.x < 0 || p.y < 0 || p.x >= map.cols || p.y >= map.rows) return 'plain';
  return map.terrain[p.y][p.x];
}

export function unitAt(units: UnitState[], p: Pos): UnitState | undefined {
  return units.find((u) => u.alive && same(u.pos, p));
}

export function moveRangeOf(u: UnitState): number {
  return u.def.moveRange + (u.accelThisTurn ?? 0) + partBonus(u, 'move');
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
  return u.def.weapons.filter((w) => u.en >= w.enCost && (w.ammo == null || (u.ammo[w.id] ?? 0) > 0) && u.will >= (w.willReq ?? 0));
}

/** Will (kiai) scaling — every point above 100 fights harder. */
export const MAX_WILL = 150;
export const willDmgMult = (u: UnitState) => 1 + Math.max(0, u.will - 100) * 0.001; // +5% at 150
export const willHitBonus = (u: UnitState) => Math.max(0, u.will - 100) * 0.1; // +5% at 150
export const willEvade = (u: UnitState) => Math.max(0, u.will - 100) * 0.2; // +10 evade at 150
export const willArmor = (u: UnitState) => Math.max(0, u.will - 100) * 8; // +400 armor at 150
export const willGain = (u: UnitState, n: number) => {
  u.will = Math.max(100, Math.min(MAX_WILL, u.will + n));
};

/** Weapon's effective max range — Snipe spirit adds +2 for the next attack. */
export const rangeMaxOf = (u: UnitState, w: WeaponDef) => w.rangeMax + (u.snipeForNextAttack ? 2 : 0);

/** Weapons that can attack `target` from `from`. postMove=false weapons require !moved. */
export function weaponsAgainst(u: UnitState, from: Pos, target: UnitState, moved: boolean): WeaponDef[] {
  const r = dist(from, target.pos);
  return usableWeapons(u).filter((w) => r >= w.rangeMin && r <= rangeMaxOf(u, w) && (!moved || w.postMove));
}

/** All tiles attackable by weapon w standing at `from`. */
export function attackTiles(map: MapDef, from: Pos, w: WeaponDef, u?: UnitState): Pos[] {
  const rMax = u ? rangeMaxOf(u, w) : w.rangeMax;
  const out: Pos[] = [];
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const d = dist(from, { x, y });
      if (d >= w.rangeMin && d <= rMax) out.push({ x, y });
    }
  return out;
}

// ---------- Combat ----------

function evadeOf(u: UnitState, map: MapDef): number {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  return u.def.mobility + u.def.pilot.evade + (u.level - 1) * 2 + t.eva + (u.focusUntilEndOfEnemyPhase ? 30 : 0) + willEvade(u) + partBonus(u, 'mobility') + partBonus(u, 'evade') * 1.8 + (u.skills?.evade ?? 0) + (u.aceMastery ? 5 : 0);
}

function armorOf(u: UnitState, map: MapDef): number {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  return u.def.armor + (u.level - 1) * 40 + t.def + (u.gritUntilEndOfEnemyPhase ? 400 : 0) + willArmor(u) + partBonus(u, 'armor');
}

function statFor(u: UnitState, w: WeaponDef): number {
  return (w.kind === 'melee' ? u.def.pilot.melee : u.def.pilot.ranged) + (u.level - 1) * 3;
}

export interface CombatMods {
  hitBonus: number; // percentage points added to hit chance
  dmgMult: number; // damage multiplier
}
export const NO_MODS: CombatMods = { hitBonus: 0, dmgMult: 1 };

export function hitChance(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, hitBonus = 0): number {
  if (def.flashUntilEndOfEnemyPhase) return 0; // Flash: guaranteed dodge
  if (att.strikeForNextAttack) return 100;
  const raw = 72 + statFor(att, w) * 0.6 + w.hitMod + att.def.mobility * 0.25 + hitBonus + willHitBonus(att) + partBonus(att, 'hit') + (att.skills?.hit ?? 0) + (att.aceMastery ? 5 : 0) - evadeOf(def, map) * 0.55;
  return Math.max(10, Math.min(100, Math.round(raw)));
}

export function damageOf(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, crit: boolean, dmgMult = 1): number {
  const raw = w.power + statFor(att, w) * 10 - armorOf(def, map);
  let dmg = Math.max(120, Math.round(raw));
  if (crit) dmg = Math.round(dmg * 1.3);
  if (att.valorForNextAttack) dmg = Math.round(dmg * 1.5);
  if (def.guardUntilEndOfEnemyPhase) dmg = Math.round(dmg * 0.5);
  dmg = Math.round(dmg * (1 + partBonus(att, 'dmg') * 0.01 + (att.skills?.dmg ?? 0) * 0.015));
  dmg = Math.round(dmg * (1 - Math.min(0.5, (def.skills?.def ?? 0) * 0.015)));
  if (att.aceMastery) dmg = Math.round(dmg * 1.05);
  return Math.round(dmg * dmgMult * willDmgMult(att));
}

const rnd = () => Math.random() * 100;
export const critChance = (att: UnitState, def: UnitState) => Math.max(5, Math.round(8 + (att.def.mobility - def.def.mobility) * 0.2));
const critRoll = (att: UnitState, def: UnitState) => rnd() < critChance(att, def);

interface SimAttack {
  hit: boolean;
  crit: boolean;
  damage: number;
  hitChance: number;
  destroyed: boolean;
}

function resolveHit(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, mods: CombatMods = NO_MODS): SimAttack {
  const hc = hitChance(att, def, w, map, mods.hitBonus);
  const hit = rnd() < hc;
  if (!hit) return { hit: false, crit: false, damage: 0, hitChance: hc, destroyed: false };
  const crit = critRoll(att, def);
  const damage = damageOf(att, def, w, map, crit, mods.dmgMult);
  return { hit, crit, damage, hitChance: hc, destroyed: def.hp - damage <= 0 };
}

export function bestCounterWeapon(def: UnitState, attPos: Pos): WeaponDef | undefined {
  const opts = usableWeapons(def).filter((w) => dist(def.pos, attPos) >= w.rangeMin && dist(def.pos, attPos) <= rangeMaxOf(def, w) && !w.mapRange);
  opts.sort((a, b) => b.power - a.power);
  return opts[0];
}

/** The AI's defender reaction: defend when a hit would destroy it (unless its counter would kill first), else counter. */
export function aiPickReaction(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef): Reaction {
  const hc = hitChance(att, def, w, map);
  const dmg = damageOf(att, def, w, map, false);
  const wouldDie = def.hp - Math.round(dmg) <= 0;
  const cw = bestCounterWeapon(def, att.pos);
  if (wouldDie) {
    const counterKills = cw && def.hp - 0 >= 0 ? damageOf(def, att, cw, map, false) >= att.hp : false;
    if (counterKills) return 'counter';
    return hc >= 45 ? 'defend' : 'evade';
  }
  return cw ? 'counter' : 'evade';
}

/** Resolve a full attack including a possible single counter-attack. Pure-ish: mutates nothing, returns result. */
export function simulateAttack(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, attMods: CombatMods = NO_MODS, defMods: CombatMods = NO_MODS, reaction: Reaction = 'counter'): AttackResult {
  const first = resolveHit(att, def, w, map, reaction === 'evade' ? { ...attMods, hitBonus: attMods.hitBonus - 30 } : attMods);
  if (reaction === 'defend' && first.hit) first.damage = Math.round(first.damage * 0.5);
  let counter: AttackResult['counter'] = null;
  if (!first.destroyed && reaction === 'counter') {
    // defender counter with its strongest in-range weapon (even if it "acted")
    const cw = bestCounterWeapon(def, att.pos);
    if (cw) {
      const c = resolveHit(def, att, cw, map, defMods);
      counter = { weapon: cw, ...c };
    }
  }
  return { hit: first.hit, crit: first.crit, damage: first.damage, destroyed: first.destroyed, hitChance: first.hitChance, counter, reaction, expEvents: [] };
}

/** Tiles inside a MAP weapon's blast centered at `center`. */
export function mapBlastTiles(map: MapDef, center: Pos, radius: number): Pos[] {
  const out: Pos[] = [];
  for (let y = Math.max(0, center.y - radius); y <= Math.min(map.rows - 1, center.y + radius); y++)
    for (let x = Math.max(0, center.x - radius); x <= Math.min(map.cols - 1, center.x + radius); x++)
      if (dist(center, { x, y }) <= radius) out.push({ x, y });
  return out;
}

/** Resolve a MAP weapon: every unit in the blast takes an independent hit roll; nobody counters. */
export function simulateMapAttack(att: UnitState, targets: UnitState[], w: WeaponDef, map: MapDef, attMods: CombatMods = NO_MODS): AttackResult {
  const result: AttackResult = { hit: false, crit: false, damage: 0, destroyed: false, hitChance: 0, counter: null, splash: [], expEvents: [] };
  if (!targets.length) return result;
  // primary target = the first (store picks the closest/most damaged one as scene's defender)
  targets.forEach((t, i) => {
    const r = resolveHit(att, t, w, map, attMods);
    if (i === 0) {
      result.hit = r.hit;
      result.crit = r.crit;
      result.damage = r.damage;
      result.destroyed = r.destroyed;
      result.hitChance = r.hitChance;
    } else {
      result.splash!.push({ uid: t.uid, name: t.def.name, hit: r.hit, damage: r.damage, destroyed: r.destroyed, hitChance: r.hitChance });
    }
  });
  return result;
}

// ---------- Store-level actions (pure functions on state slices) ----------

export interface GameState {
  map: MapDef;
  units: UnitState[];
  turn: number;
}

export function applyAttack(state: GameState, attackerUid: string, defenderUid: string, weaponId: string, mods?: (u: UnitState) => CombatMods, reaction: Reaction = 'counter'): { state: GameState; result: AttackResult } {
  const units = state.units.map((u) => ({ ...u, ammo: { ...u.ammo } }));
  const att = units.find((u) => u.uid === attackerUid)!;
  const def = units.find((u) => u.uid === defenderUid)!;
  const w = att.def.weapons.find((x) => x.id === weaponId)!;
  const result = simulateAttack(att, def, w, state.map, mods ? mods(att) : NO_MODS, mods ? mods(def) : NO_MODS, reaction);

  att.en = Math.max(0, att.en - w.enCost);
  if (w.ammo != null) att.ammo[w.id] = (att.ammo[w.id] ?? 0) - 1;
  if (result.hit) def.hp = Math.max(0, def.hp - result.damage);
  if (result.destroyed) {
    def.alive = false;
    att.kills += 1;
  }

  if (result.counter) {
    const cw = result.counter.weapon;
    def.en = Math.max(0, def.en - cw.enCost);
    if (cw.ammo != null) def.ammo[cw.id] = (def.ammo[cw.id] ?? 0) - 1;
    if (result.counter.hit) att.hp = Math.max(0, att.hp - result.counter.damage);
    if (result.counter.destroyed) {
      att.alive = false;
      def.kills += 1;
    }
  }

  att.moved = true;
  att.acted = true;
  att.strikeForNextAttack = false;
  att.valorForNextAttack = false;
  att.snipeForNextAttack = false;
  def.flashUntilEndOfEnemyPhase = false; // consumed by this attack whether it hit or not

  // Will: +1 for engaging, +1 for taking a hit, +4 per kill; PP: +3 per kill
  willGain(att, 1 + (result.counter?.hit ? 1 : 0) + (result.destroyed ? 4 : 0));
  willGain(def, (result.hit ? 1 : 0) + (result.counter?.hit ? 1 : 0) + (result.counter?.destroyed ? 4 : 0));
  if (result.destroyed) att.pp += 3;
  if (result.counter?.destroyed) def.pp += 3;

  // EXP: +30 for a landed hit, +70 for a kill (counter kills award the countering unit)
  result.expEvents = [];
  if (result.hit) awardExp(att, result.destroyed ? 70 : 30, result.expEvents);
  if (result.counter?.hit) awardExp(def, result.counter.destroyed ? 70 : 25, result.expEvents);
  return { state: { ...state, units }, result };
}

/** Apply a MAP weapon blast — same bookkeeping as applyAttack but across every unit in the blast. */
export function applyMapAttack(state: GameState, attackerUid: string, targetTile: Pos, weaponId: string, mods?: (u: UnitState) => CombatMods): { state: GameState; result: AttackResult } {
  const units = state.units.map((u) => ({ ...u, ammo: { ...u.ammo } }));
  const att = units.find((u) => u.uid === attackerUid)!;
  const w = att.def.weapons.find((x) => x.id === weaponId)!;
  const inBlast = units.filter((u) => u.alive && u.uid !== att.uid && dist(u.pos, targetTile) <= (w.mapRange ?? 0));
  // primary target = the unit closest to the aim point (the scene shows it as the defender)
  inBlast.sort((a, b) => dist(a.pos, targetTile) - dist(b.pos, targetTile));
  const result = simulateMapAttack(att, inBlast, w, state.map, mods ? mods(att) : NO_MODS);

  att.en = Math.max(0, att.en - w.enCost);
  if (w.ammo != null) att.ammo[w.id] = (att.ammo[w.id] ?? 0) - 1;
  att.moved = true;
  att.acted = true;
  att.strikeForNextAttack = false;
  att.valorForNextAttack = false;

  let hits = 0;
  let kills = 0;
  inBlast.forEach((t, i) => {
    const r = i === 0 ? { hit: result.hit, damage: result.damage, destroyed: result.destroyed } : result.splash![i - 1];
    if (r.hit) {
      t.hp = Math.max(0, t.hp - r.damage);
      willGain(t, 1);
      hits++;
      if (r.destroyed) {
        t.alive = false;
        att.kills += 1;
        att.pp += 3;
        kills++;
      }
    }
  });
  willGain(att, 1 + kills * 4);
  result.expEvents = [];
  if (hits > 0) awardExp(att, 30 + kills * 40 + (hits - 1) * 15, result.expEvents);
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
    u.pp += 8;
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
    case 'flash':
      u.flashUntilEndOfEnemyPhase = true;
      break;
    case 'snipe':
      u.snipeForNextAttack = true;
      break;
    case 'zeal':
      u.will = Math.min(MAX_WILL, u.will + 15);
      break;
    // 'rouse' and 'disrupt' affect neighbouring units — applied in store.castSpirit
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
    // bosses hold position until the map's hold turn (commanding from the back line)
    const holding = !!e.def.boss && state.turn < (map.bossHoldUntil ?? 0);
    const moveTiles = [...movementRange(map, units, e).values()].map((v) => v.pos).filter((p) => {
      const occ = unitAt(units, p);
      return (!occ || occ.uid === e.uid) && !claimed.has(key(p));
    });
    const tiles = holding ? moveTiles.filter((p) => same(p, e.pos)) : moveTiles;
    let best: { pos: Pos; target: UnitState; weapon: WeaponDef; score: number } | null = null;
    const willMove = (p: Pos) => !same(p, e.pos);
    for (const tile of tiles) {
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

/** SRW support attack: an ally adjacent to the attacker and in range of the defender chips in (55% dmg, no counter, doesn't consume its turn). */
export function findSupport(units: UnitState[], attUid: string, def: UnitState): UnitState | undefined {
  const att = units.find((u) => u.uid === attUid)!;
  return units.find(
    (u) => u.side === 'player' && u.uid !== attUid && u.alive && !u.acted && !u.moved && dist(u.pos, att.pos) <= 2 && weaponsAgainst(u, u.pos, def, false).length > 0,
  );
}

export function applySupportStrike(
  state: GameState,
  supUid: string,
  defUid: string,
  mods?: (u: UnitState) => CombatMods,
): { state: GameState; result: { name: string; hit: boolean; damage: number; destroyed: boolean; hitChance: number; weapon: WeaponDef; expEvents: string[] } } | null {
  const units = state.units.map((u) => ({ ...u, ammo: { ...u.ammo } }));
  const sup = units.find((u) => u.uid === supUid)!;
  const def = units.find((u) => u.uid === defUid)!;
  const opts = weaponsAgainst(sup, sup.pos, def, false);
  if (!opts.length) return null;
  opts.sort((a, b) => b.power - a.power);
  const w = opts[0];
  const m = mods ? mods(sup) : NO_MODS;
  const r = resolveHit(sup, def, w, state.map, { hitBonus: m.hitBonus, dmgMult: m.dmgMult * 0.55 });
  sup.en = Math.max(0, sup.en - w.enCost);
  if (w.ammo != null) sup.ammo[w.id] = (sup.ammo[w.id] ?? 0) - 1;
  sup.strikeForNextAttack = false;
  sup.valorForNextAttack = false;
  sup.snipeForNextAttack = false;
  if (r.hit) def.hp = Math.max(0, def.hp - r.damage);
  const destroyed = r.hit && def.hp <= 0;
  if (destroyed) {
    def.alive = false;
    sup.kills += 1;
    sup.pp += 3;
  }
  willGain(sup, 1 + (destroyed ? 4 : 0));
  const expEvents: string[] = [];
  awardExp(sup, destroyed ? 70 : 15, expEvents);
  return { state: { ...state, units }, result: { name: sup.def.name, hit: r.hit, damage: r.damage, destroyed, hitChance: r.hitChance, weapon: w, expEvents } };
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

/** Start-of-own-phase recovery: base EN regen + terrain effects (heal on base/city, burn on lava). */
export function phaseRecovery(u: UnitState, map: MapDef): { hpGain: number; enGain: number; hpLoss: number } {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  const enGain = Math.min(u.def.maxEn - u.en, 5 + (t.enRegen ?? 0));
  const hpGain = Math.min(u.def.maxHp - u.hp, Math.round(u.def.maxHp * (t.hpRegen ?? 0)));
  const hpLoss = Math.min(u.hp - 1, Math.round(u.def.maxHp * (t.hpDmg ?? 0))); // terrain can't kill — leaves 1 HP
  u.en += enGain;
  u.hp = Math.max(1, u.hp + hpGain - Math.max(0, hpLoss));
  return { hpGain, enGain, hpLoss: Math.max(0, hpLoss) };
}

/** One-line terrain effect summary for unit/inspect cards, e.g. "Forest · DEF+100 · EVA+15". */
export function terrainDesc(map: MapDef, p: Pos): string {
  const t = TERRAIN_INFO[terrainAt(map, p)];
  const parts = [t.name];
  if (t.def) parts.push(`DEF${t.def > 0 ? '+' : ''}${t.def}`);
  if (t.eva) parts.push(`EVA${t.eva > 0 ? '+' : ''}${t.eva}`);
  if (t.hpRegen) parts.push(`+${Math.round(t.hpRegen * 100)}% HP/turn`);
  if (t.enRegen) parts.push(`+${t.enRegen} EN/turn`);
  if (t.hpDmg) parts.push(`-${Math.round(t.hpDmg * 100)}% HP/turn`);
  return parts.join(' · ');
}
