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
    skills: { hit: 0, evade: 0, dmg: 0, def: 0, countercut: 0, esave: 0, hitrun: 0, crit: 0, scavenger: 0, regen: 0, riposte: 0, lastStand: 0, assassin: 0, brawler: 0, initiative: 0, gunner: 0, plunderer: 0, bodyguard: 0, opportunist: 0, warcry: 0, pointBlank: 0, bloodlust: 0, reaver: 0, bulwark: 0, duelist: 0, juggernaut: 0, giantSlayer: 0, loneWolf: 0, overwhelm: 0, outgunned: 0, tankbuster: 0, coordinator: 0, sentinel: 0, gambit: 0, warcaster: 0, underdog: 0, skirmisher: 0, engineer: 0, cohort: 0, entrench: 0, steadfast: 0, precision: 0, surge: 0, reflex: 0, outflank: 0, foeswarm: 0, cannonade: 0, gunsmith: 0, luminance: 0, swarmer: 0, phantomstep: 0, parry: 0 },
    altDef: def.transformInto ? ALL_UNITS[def.transformInto] : undefined,
    baseDefId: def.transformInto ? def.id : undefined,
  };
}

/** Sum a stat bonus across the unit's equipped enhancement parts. */
export function partBonus(u: UnitState, stat: 'armor' | 'mobility' | 'move' | 'hit' | 'dmg' | 'hp' | 'en' | 'evade' | 'crit' | 'enRegen' | 'hpRegen' | 'xp' | 'dmgTaken' | 'ammoPct' | 'barrier' | 'auraHit' | 'stealthField' | 'ablative' | 'statusSlow' | 'statusProof' | 'aggro' | 'willStart' | 'reflect' | 'auraEn' | 'meleeDmg' | 'chaff' | 'enSaver' | 'antiAir' | 'ammoDmg' | 'bossDmg' | 'counterDmg' | 'range' | 'coFire' | 'auraHeal' | 'knockProof' | 'enDmg' | 'knockPlus' | 'beamDmg' | 'funnelDmg' | 'missileDmg' | 'gunDmg' | 'ammoRegen' | 'markDmg' | 'spRegen' | 'lowHpDmg' | 'aimBoost' | 'shieldBreak' | 'pinDmg' | 'jamProof' | 'statusBurn' | 'statusBreak' | 'statusMark' | 'statusStun' | 'beamGuard' | 'meleeGuard'): number {
  let n = 0;
  for (const p of u.parts) {
    const v = PARTS[p]?.[stat];
    n += typeof v === 'number' ? v : v ? 1 : 0;
  }
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
  return Math.max(1, u.def.moveRange + (u.accelThisTurn ?? 0) + partBonus(u, 'move') - (u.crippled ? 2 : 0) - (u.statuses?.some((fx) => fx.id === 'slow') ? 3 : 0));
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

/** E-Save pilot skill: weapon EN cost discounted 4% per trained rank. */
export function enCostOf(u: UnitState, w: WeaponDef): number {
  if (u.frenzyThisTurn) return 0;
  const r = u.skills?.esave ?? 0;
  const p = partBonus(u, 'enSaver');
  const mult = (1 - 0.04 * r) * (1 - p / 100);
  return mult < 1 ? Math.max(1, Math.round(w.enCost * mult)) : w.enCost;
}

/** Ammo Rack part: extended magazine capacity for ammo-limited weapons. */
export function maxAmmoOf(u: UnitState, w: WeaponDef): number {
  if (w.ammo == null) return 0;
  const p = partBonus(u, 'ammoPct');
  return p ? Math.ceil(w.ammo * (1 + p / 100)) : w.ammo;
}

export function usableWeapons(u: UnitState): WeaponDef[] {
  return u.def.weapons.filter((w) => u.en >= enCostOf(u, w) && (w.ammo == null || (u.ammo[w.id] ?? 0) > 0) && u.will >= (w.willReq ?? 0) && (w.aceReq == null || u.kills >= w.aceReq));
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
export const rangeMaxOf = (u: UnitState, w: WeaponDef) => w.rangeMax + (u.snipeForNextAttack ? 2 : 0) + (w.kind === 'melee' ? 0 : partBonus(u, 'range'));

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
  return u.def.mobility + u.def.pilot.evade + (u.level - 1) * 2 + t.eva + (u.focusUntilEndOfEnemyPhase ? 30 : 0) + (u.veilUntilEndOfEnemyPhase ? 20 : 0) + (u.hymnUntilEndOfEnemyPhase ? 15 : 0) + willEvade(u) + partBonus(u, 'mobility') + partBonus(u, 'evade') * 1.8 + (u.skills?.evade ?? 0) - (u.skills?.gambit ?? 0) * 8 + (u.aceMastery ? 5 : 0) + (u.skills?.phantomstep ?? 0) * 4 - (u.dodges ?? 0) * 8 - (u.sundered ? 15 : 0);
}

function armorOf(u: UnitState, map: MapDef): number {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  const base = u.def.armor + (u.level - 1) * 40 + t.def + (u.gritUntilEndOfEnemyPhase ? 400 : 0) + willArmor(u) + partBonus(u, 'armor') + (u.phase2 ? 300 : 0);
  return Math.round((base - (u.sundered ? 300 : 0)) * (u.statuses?.some((s) => s.id === 'break') ? 0.7 : 1));
}

/** status applied on a landed hit — refreshes the same debuff instead of stacking */
function applyStatus(u: UnitState, id: 'burn' | 'stun' | 'break' | 'slow' | 'mark' | 'supp'): void {
  if (partBonus(u, 'statusProof') > 0) return; // firewall suite shrugs off status
  u.statuses = [...(u.statuses ?? []).filter((s) => s.id !== id), { id, turns: 2 }];
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
  const trait = att.def.pilot.trait;
  const traitHit = (trait === 'deadeye' ? 8 : 0) + (trait === 'falcon_wing' && def.def.moveType === 'air' ? 10 : 0) + (trait === 'crimson_fury' && att.hp < att.def.maxHp / 2 ? 8 : 0);
  const raw = 72 + statFor(att, w) * 0.6 + w.hitMod + att.def.mobility * 0.25 + hitBonus + traitHit + willHitBonus(att) + partBonus(att, 'hit') + (att.skills?.hit ?? 0) + (att.aceMastery ? 5 : 0) + (att.hymnUntilEndOfEnemyPhase ? 15 : 0) + (att.aimed ? 15 + partBonus(att, 'aimBoost') : 0) + (att.exertNext ? 20 : 0) + (def.exposed ? 20 : 0) + (def.statuses?.some((fx) => fx.id === 'mark') ? 25 : 0) - (att.statuses?.some((fx) => fx.id === 'supp') ? 20 : 0) - partBonus(def, 'chaff') - evadeOf(def, map) * 0.55;
  return Math.max(10, Math.min(100, Math.round(raw * (att.wounded ? 0.85 : 1))));
}

export function damageOf(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, crit: boolean, dmgMult = 1, units?: UnitState[]): number {
  let armor = att.breachNextAttack ? 0 : armorOf(def, map);
  if (att.shatterNext) armor = Math.round(armor * 0.5);
  const raw = w.power + statFor(att, w) * 10 - (w.pierce ? Math.round(armor * 0.65) : armor);
  let dmg = Math.max(120, Math.round(raw));
  if (crit) dmg = Math.round(dmg * (1.3 + (att.skills?.precision ?? 0) * 0.05));
  if (att.valorForNextAttack) dmg = Math.round(dmg * 1.5);
  if (att.soulForNextAttack) dmg = Math.round(dmg * 2);
  if (att.gutsForNextAttack && att.hp < att.def.maxHp / 2) dmg = Math.round(dmg * 1.75);
  if (def.exposed) dmg = Math.round(dmg * 1.25);
  if (def.statuses?.some((fx) => fx.id === 'mark')) dmg = Math.round(dmg * 1.15);
  if (def.exposed || def.statuses?.some((fx) => fx.id === 'mark')) dmg = Math.round(dmg * (1 + partBonus(att, 'markDmg') / 100));
  if (def.skills?.steadfast) dmg = Math.round(dmg * (1 - def.skills.steadfast * 0.06));
  if (w.kind === 'melee' && def.skills?.parry) dmg = Math.round(dmg * (1 - def.skills.parry * 0.05));
  if (att.relentlessUntilEndOfEnemyPhase && def.hp < def.def.maxHp / 2) dmg = Math.round(dmg * 1.25);
  if (att.charged) dmg = Math.round(dmg * 1.5);
  if ((att.skills?.lastStand ?? 0) > 0 && att.hp < att.def.maxHp * 0.3) dmg = Math.round(dmg * (1 + 0.05 * att.skills.lastStand));
  if ((att.skills?.assassin ?? 0) > 0 && def.hp < def.def.maxHp * 0.4) dmg = Math.round(dmg * (1 + 0.06 * att.skills.assassin));
  if ((att.skills?.brawler ?? 0) > 0 && w.kind === 'melee') dmg = Math.round(dmg * (1 + 0.05 * att.skills.brawler));
  if ((att.skills?.gunner ?? 0) > 0 && w.kind !== 'melee') dmg = Math.round(dmg * (1 + 0.05 * att.skills.gunner));
  if ((def.statuses ?? []).length > 0) dmg = Math.round(dmg * (1 + 0.07 * (att.skills?.opportunist ?? 0)));
  if (dist(att.pos, def.pos) <= 2) dmg = Math.round(dmg * (1 + 0.06 * (att.skills?.pointBlank ?? 0)));
  if (units) {
    const assists = units.filter((u) => u.alive && u.side === att.side && u.uid !== att.uid && u.uid !== def.uid && !u.acted && dist(u.pos, def.pos) <= 2).length;
    dmg = Math.round(dmg * (1 + (0.12 + partBonus(att, 'coFire') / 100) * Math.min(2, assists)));
    if ((att.skills?.coordinator ?? 0) > 0 && assists > 0) dmg = Math.round(dmg * (1 + 0.05 * att.skills.coordinator));
  }
  if (w.kind === 'melee') dmg = Math.round(dmg * (1 + partBonus(att, 'meleeDmg') / 100));
  if (w.kind === 'beam') dmg = Math.round(dmg * (1 + partBonus(att, 'beamDmg') / 100));
  if (w.kind === 'funnel') dmg = Math.round(dmg * (1 + partBonus(att, 'funnelDmg') / 100));
  if (w.kind === 'missile') dmg = Math.round(dmg * (1 + partBonus(att, 'missileDmg') / 100) * (1 + (att.skills?.cannonade ?? 0) * 0.05));
  if (w.kind === 'gun') dmg = Math.round(dmg * (1 + (att.skills?.gunsmith ?? 0) * 0.05));
  if (w.kind === 'beam') dmg = Math.round(dmg * (1 + (att.skills?.luminance ?? 0) * 0.05));
  if (w.kind === 'funnel') dmg = Math.round(dmg * (1 + (att.skills?.swarmer ?? 0) * 0.05));
  if (w.kind === 'gun') dmg = Math.round(dmg * (1 + partBonus(att, 'gunDmg') / 100));
  if ((att.kills ?? 0) >= 3) dmg = Math.round(dmg * (1 + 0.05 * (att.skills?.bloodlust ?? 0)));
  if (def.hp >= def.def.maxHp) dmg = Math.round(dmg * (1 + 0.05 * (att.skills?.reaver ?? 0)));
  if ((att.skills?.duelist ?? 0) > 0 && !(units ?? []).some((x) => x.uid !== def.uid && x.side === def.side && x.alive && Math.abs(x.pos.x - def.pos.x) + Math.abs(x.pos.y - def.pos.y) <= 2)) dmg = Math.round(dmg * (1 + 0.06 * att.skills.duelist));
  if ((att.skills?.juggernaut ?? 0) > 0 && !att.moved) dmg = Math.round(dmg * (1 + 0.04 * att.skills.juggernaut));
  if (att.enraged) dmg = Math.round(dmg * 1.15);
  if (!att.hasAttacked && (att.skills?.initiative ?? 0) > 0) dmg = Math.round(dmg * (1 + 0.1 * att.skills.initiative));
  if (def.guardUntilEndOfEnemyPhase) dmg = Math.round(dmg * 0.5);
  dmg = Math.round(dmg * (1 + partBonus(att, 'dmg') * 0.01 + (att.skills?.dmg ?? 0) * 0.015));
  if (w.enCost > 0) dmg = Math.round(dmg * (1 + partBonus(att, 'enDmg') * 0.01));
  dmg = Math.round(dmg * (1 + (att.skills?.gambit ?? 0) * 0.08));
  if (att.soulburnNext) dmg = Math.round(dmg * 1.5);
  if (att.huntNext && def.hp * 2 < def.def.maxHp) dmg = Math.round(dmg * 1.3);
  if (att.strafeNext && def.def.moveType !== 'air') dmg = Math.round(dmg * 1.35);
  if (att.skyfallNext && def.def.moveType === 'air') dmg = Math.round(dmg * 1.35);
  if (att.stalkNext && (def.statuses?.length ?? 0) > 0) dmg = Math.round(dmg * 1.3);
  if (att.reaperNext && units) {
    const fallen = units.filter((x) => x.side === att.side && !x.alive).length;
    dmg = Math.round(dmg * (1 + fallen * 0.1));
  }
  if (att.exertNext) dmg = Math.round(dmg * 1.15);
  if (att.hp * 2 < att.def.maxHp) dmg = Math.round(dmg * (1 + partBonus(att, 'lowHpDmg') / 100));
  if (att.en * 4 > att.def.maxEn * 3) dmg = Math.round(dmg * (1 + (att.skills?.surge ?? 0) * 0.04));
  if ((att.skills?.outflank ?? 0) > 0 && !bestCounterWeapon(def, att.pos)) dmg = Math.round(dmg * (1 + att.skills.outflank * 0.06));
  if (units && (att.skills?.foeswarm ?? 0) > 0) {
    const foes = units.filter((u) => u.alive && u.side !== att.side && dist(u.pos, att.pos) <= 2).length;
    if (foes > 0) dmg = Math.round(dmg * (1 + att.skills.foeswarm * 0.03 * foes));
  }
  if (units && partBonus(att, 'pinDmg') > 0 && hasPincer(units, att, def)) dmg = Math.round(dmg * (1 + partBonus(att, 'pinDmg') / 100));
  if (TERRAIN_INFO[terrainAt(map, att.pos)].def) dmg = Math.round(dmg * (1 + (att.skills?.entrench ?? 0) * 0.05));
  if (def.level > att.level) dmg = Math.round(dmg * (1 + (att.skills?.underdog ?? 0) * 0.05));
  if (att.moved) dmg = Math.round(dmg * (1 + (att.skills?.skirmisher ?? 0) * 0.05));
  if (units && units.some((u2) => u2.alive && u2.side === att.side && u2.uid !== att.uid && dist(u2.pos, att.pos) <= 2)) dmg = Math.round(dmg * (1 + (att.skills?.cohort ?? 0) * 0.04));
  dmg = Math.round(dmg * (1 - Math.min(0.5, (def.skills?.def ?? 0) * 0.015)));
  dmg = Math.round(dmg * Math.max(0.4, 1 + partBonus(def, 'dmgTaken') * 0.01));
  if (att.aceMastery) dmg = Math.round(dmg * 1.05);
  if (att.wounded) dmg = Math.round(dmg * 0.85);
  if (att.phase2) dmg = Math.round(dmg * 1.15);
  const trait = att.def.pilot.trait;
  if (trait === 'ace_instinct' && att.will >= 130) dmg = Math.round(dmg * 1.12);
  if (trait === 'siege_breaker' && (def.def.boss || def.elite)) dmg = Math.round(dmg * 1.15);
  if ((def.def.boss || def.elite) && (att.skills?.giantSlayer ?? 0) > 0) dmg = Math.round(dmg * (1 + 0.06 * att.skills.giantSlayer));
  if ((def.def.boss || def.elite) && partBonus(att, 'bossDmg')) dmg = Math.round(dmg * (1 + partBonus(att, 'bossDmg') / 100));
  if (att.empowerForNextAttack) dmg = Math.round(dmg * 1.4);
  if (att.warsongUntilEndOfEnemyPhase) dmg = Math.round(dmg * 1.1);
  if ((att.skills?.loneWolf ?? 0) > 0 && !(units ?? []).some((x) => x !== att && x.alive && x.side === att.side && dist(x.pos, att.pos) <= 2)) dmg = Math.round(dmg * (1 + 0.06 * att.skills.loneWolf));
  if ((att.skills?.overwhelm ?? 0) > 0 && !def.acted) dmg = Math.round(dmg * (1 + 0.05 * att.skills.overwhelm));
  if ((att.skills?.outgunned ?? 0) > 0 && units) {
    const mine = units.filter((x) => x.alive && x.side === att.side).length;
    const theirs = units.filter((x) => x.alive && x.side !== att.side).length;
    if (mine < theirs) dmg = Math.round(dmg * (1 + 0.06 * att.skills.outgunned));
  }
  if ((att.skills?.tankbuster ?? 0) > 0 && def.def.armor >= 1200) dmg = Math.round(dmg * (1 + 0.06 * att.skills.tankbuster));
  if (trait === 'crimson_fury' && att.hp < att.def.maxHp / 2) dmg = Math.round(dmg * 1.1);
  if (trait === 'sovereign') dmg = Math.round(dmg * 1.08);
  // damage-type resistance — beam coats, phase armor, disperser fields
  const res = def.def.resists?.[w.kind] ?? 0;
  if (res > 0) dmg = Math.round(dmg * (1 - res));
  if (w.kind === 'beam' && partBonus(def, 'beamGuard') > 0) dmg = Math.round(dmg * 0.75);
  if (w.kind === 'melee' && partBonus(def, 'meleeGuard') > 0) dmg = Math.round(dmg * 0.75);
  if ((w.antiAir || partBonus(att, 'antiAir')) && def.def.moveType === 'air') dmg = Math.round(dmg * 1.25);
  if (w.ammo != null && partBonus(att, 'ammoDmg')) dmg = Math.round(dmg * (1 + partBonus(att, 'ammoDmg') / 100));
  if (w.sniper && dist(att.pos, def.pos) >= 4) dmg = Math.round(dmg * 1.15);
  dmg = Math.round(dmg * dmgMult * willDmgMult(att));
  // i-field barrier — weak hits are swallowed by the field (SRW barrier mechanic)
  const barrier = Math.max(def.def.barrier ?? 0, partBonus(def, 'barrier'));
  if (barrier > 0 && dmg < barrier) dmg = Math.max(60, Math.round(dmg * 0.2));
  if (barrier > 0) dmg = Math.round(dmg * (1 + partBonus(att, 'shieldBreak') / 100));
  return dmg;
}

const rnd = () => Math.random() * 100;
export const critChance = (att: UnitState, def: UnitState, w?: WeaponDef) => Math.max(5, Math.round(8 + (att.def.mobility - def.def.mobility) * 0.2 + (w?.critMod ?? 0) + partBonus(att, 'crit') + (att.charged ? 15 : 0) + (att.marksmanUntilEndOfEnemyPhase ? 15 : 0) + (att.enraged ? 10 : 0) + (att.skills?.crit ?? 0) * 2));
const critRoll = (att: UnitState, def: UnitState, w?: WeaponDef) => att.deadshotForNextAttack === true || rnd() < critChance(att, def, w);

interface SimAttack {
  hit: boolean;
  crit: boolean;
  graze?: boolean;
  damage: number;
  hitChance: number;
  destroyed: boolean;
}

/** an attack that just misses the hit roll by a small margin grazes for 45% damage */
const GRAZE_MARGIN = 12;

function resolveHit(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, mods: CombatMods = NO_MODS, units?: UnitState[]): SimAttack {
  const hc = hitChance(att, def, w, map, mods.hitBonus);
  const strike = (remainingHp: number): SimAttack => {
    const roll = rnd();
    if (roll >= hc) {
      if (roll < hc + GRAZE_MARGIN && remainingHp > 0) {
        const g = Math.round(damageOf(att, def, w, map, false, mods.dmgMult, units) * 0.45);
        return { hit: true, crit: false, graze: true, damage: g, hitChance: hc, destroyed: remainingHp - g <= 0 };
      }
      return { hit: false, crit: false, damage: 0, hitChance: hc, destroyed: false };
    }
    const crit = critRoll(att, def, w);
    const damage = damageOf(att, def, w, map, crit, mods.dmgMult, units);
    return { hit: true, crit, damage, hitChance: hc, destroyed: remainingHp - damage <= 0 };
  };
  // multi-hit weapons resolve each strike independently against the remaining HP
  let hp = def.hp;
  let damage = 0;
  let hit = false;
  let crit = false;
  let graze = false;
  const strikes = Math.max(1, w.multiHit ?? 1);
  for (let i = 0; i < strikes && hp > 0; i++) {
    const r = strike(hp);
    if (r.hit) {
      hit = true;
      damage += r.damage;
      hp -= r.damage;
      if (r.crit) crit = true;
      if (r.graze) graze = true;
    }
  }
  return { hit, crit, graze: graze && !crit, damage, hitChance: hc, destroyed: hp <= 0 };
}

/** Rally trait: an allied unit with trait 'rally' within 2 tiles grants +8% hit (non-stacking). */
/** ECM jamming: hostile jammer frames within 2 tiles degrade the attacker's targeting (-15 hit). */
export function jammerPenalty(units: UnitState[], att: UnitState): number {
  if (partBonus(att, 'jamProof') > 0) return 0;
  return units.some((u) => u.alive && u.side !== att.side && u.def.jammer === true && dist(u.pos, att.pos) <= 2) ? 15 : 0;
}

export function rallyBonus(units: UnitState[], u: UnitState): number {
  return units.some((a) => a.alive && a.side === u.side && a.uid !== u.uid && (a.def.pilot.trait === 'rally' || partBonus(a, 'auraHit') > 0) && dist(a.pos, u.pos) <= 2) ? 8 : 0;
}

/** Formation bonus: each adjacent same-side ally grants +5% hit, capped at +10. */
export function formationBonus(units: UnitState[], u: UnitState): number {
  let n = 0;
  for (const a of units) if (a.alive && a.side === u.side && a.uid !== u.uid && dist(a.pos, u.pos) <= 1) n++;
  return Math.min(n * 5, 10);
}

/** Stealth frames are invisible on the field until a non-enemy unit closes within 3 tiles. */
export function isStealthHidden(u: UnitState, units: UnitState[]): boolean {
  return u.side === 'enemy' && u.def.stealth === true && !units.some((p) => p.alive && p.side !== 'enemy' && dist(p.pos, u.pos) <= (p.parts?.includes('sensor') ? 5 : 3));
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
export function simulateAttack(att: UnitState, def: UnitState, w: WeaponDef, map: MapDef, attMods: CombatMods = NO_MODS, defMods: CombatMods = NO_MODS, reaction: Reaction = 'counter', units?: UnitState[]): AttackResult {
  const first = resolveHit(att, def, w, map, reaction === 'evade' ? { ...attMods, hitBonus: attMods.hitBonus - 30 } : attMods, units);
  if (reaction === 'defend' && first.hit && !w.pierce) first.damage = Math.round(first.damage * 0.5 * (1 - 0.08 * (def.skills?.bulwark ?? 0)));
  if (reaction === 'cover' && first.hit && !w.pierce) first.damage = Math.round(first.damage * Math.max(0.3, 0.7 - 0.1 * (def.skills?.bodyguard ?? 0)));
  let counter: AttackResult['counter'] = null;
  let counterCut = false;
  if (reaction === 'counter' && !att.overrunNext && !def.counterSealUntilEndOfEnemyPhase) {
    const cw = bestCounterWeapon(def, att.pos);
    // Counter-Cut skill: trained pilots strike BEFORE the enemy lands — a kill pre-empts the hit entirely
    const cutRank = def.skills?.countercut ?? 0;
    if (cw && cutRank > 0 && Math.random() * 100 < cutRank * 4) {
      const c = resolveHit(def, att, cw, map, defMods, units);
      if (def.skills?.riposte) c.damage = Math.round(c.damage * (1 + 0.08 * def.skills.riposte));
      if (partBonus(def, 'counterDmg')) c.damage = Math.round(c.damage * (1 + partBonus(def, 'counterDmg') / 100));
      if (att.skills?.reflex) c.damage = Math.round(c.damage * (1 - att.skills.reflex * 0.05));
      if (def.counterBuffUntilEndOfEnemyPhase) c.damage = Math.round(c.damage * 1.1);
      if (def.avengerNext) { c.damage = Math.round(c.damage * 1.5); def.avengerNext = false; }
      counter = { weapon: cw, ...c };
      counterCut = true;
      if (c.destroyed) {
        return { hit: false, crit: false, graze: false, damage: 0, destroyed: false, hitChance: first.hitChance, counter, reaction, counterCut: true, expEvents: [] };
      }
    }
    if (!counter && !first.destroyed) {
      const c = resolveHit(def, att, cw!, map, defMods, units);
      if (def.skills?.riposte) c.damage = Math.round(c.damage * (1 + 0.08 * def.skills.riposte));
      if (partBonus(def, 'counterDmg')) c.damage = Math.round(c.damage * (1 + partBonus(def, 'counterDmg') / 100));
      if (att.skills?.reflex) c.damage = Math.round(c.damage * (1 - att.skills.reflex * 0.05));
      if (def.counterBuffUntilEndOfEnemyPhase) c.damage = Math.round(c.damage * 1.1);
      if (def.avengerNext) { c.damage = Math.round(c.damage * 1.5); def.avengerNext = false; }
      counter = { weapon: cw!, ...c };
    }
  }
  return { hit: first.hit, crit: first.crit, graze: first.graze, damage: first.damage, destroyed: first.destroyed, hitChance: first.hitChance, counter, reaction, counterCut, expEvents: [] };
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
  blizzard?: boolean;
  map: MapDef;
  units: UnitState[];
  turn: number;
}

/** pincer attack — a same-side unit on the tile mirrored across the target adds +10% damage */
export function hasPincer(units: UnitState[], att: UnitState, def: UnitState): boolean {
  const dx = def.pos.x - att.pos.x;
  const dy = def.pos.y - att.pos.y;
  if (dx === 0 && dy === 0) return false;
  const mirror = { x: def.pos.x + Math.sign(dx), y: def.pos.y + Math.sign(dy) };
  return units.some((u) => u.alive && u.side === att.side && u.uid !== att.uid && same(u.pos, mirror));
}

export function applyAttack(state: GameState, attackerUid: string, defenderUid: string, weaponId: string, mods?: (u: UnitState) => CombatMods, reaction: Reaction = 'counter'): { state: GameState; result: AttackResult } {
  const units = state.units.map((u) => ({ ...u, ammo: { ...u.ammo } }));
  const att = units.find((u) => u.uid === attackerUid)!;
  let def = units.find((u) => u.uid === defenderUid)!;
  const w = att.def.weapons.find((x) => x.id === weaponId)!;
  // Guardian frames: a bodyguard beside a boss throws itself into the line of fire
  const bossTarget = def;
  let guarded: string | undefined;
  if (def.def.boss) {
    const grd = units.find((u) => u.alive && u.side === def.side && u.uid !== def.uid && u.def.guardian === true && dist(u.pos, def.pos) <= 2);
    if (grd) {
      def = grd;
      guarded = bossTarget.def.name;
    }
  }
  const pin = hasPincer(units, att, def);
  let attMods0 = mods ? mods(att) : NO_MODS;
  if (state.blizzard && att.def.moveType !== 'air') attMods0 = { ...attMods0, hitBonus: attMods0.hitBonus - 15 };
  const result0 = simulateAttack(att, def, w, state.map, pin ? { ...attMods0, dmgMult: attMods0.dmgMult * 1.1 } : attMods0, mods ? mods(def) : NO_MODS, reaction, units);
  const result: AttackResult = { ...result0, pincer: pin };
  if (guarded) { result.guarded = guarded; result.struckUid = def.uid; }

  att.en = Math.max(0, att.en - enCostOf(att, w));
  if (w.ammo != null) att.ammo[w.id] = (att.ammo[w.id] ?? 0) - 1;
  if (result.hit) {
    const hpBefore = def.hp;
    def.hp = Math.max(0, def.hp - result.damage);
    // Execution spirit — a wounded grunt below 20% HP is finished outright
    if (result.hit && att.executeNext && !result.destroyed && def.hp > 0 && def.hp <= def.def.maxHp * 0.2 && def.side === 'enemy' && !def.def.boss && !def.elite) {
      def.hp = 0;
      result.destroyed = true;
      result.execute = true;
    }
    att.dmgDealt = (att.dmgDealt ?? 0) + result.damage;
    // Miracle spirit — refuse a fatal hit, stand at 10 HP (consumed)
    if (result.destroyed && def.miracleArmed) {
      result.destroyed = false;
      result.miracle = true;
      def.miracleArmed = false;
      def.hp = 10;
    }
    // Ward spirit — the aegis-bound ally refuses a fatal hit, left at 1 HP (consumed)
    if (result.destroyed && def.wardenArmed) {
      result.destroyed = false;
      result.miracle = true;
      def.wardenArmed = false;
      def.hp = 1;
    }
    // Ablative plating — sacrificial skin eats the first fatal hit, frame left at 1 HP
    if (result.destroyed && partBonus(def, 'ablative') > 0 && !def.ablativeUsed) {
      result.destroyed = false;
      result.ablative = true;
      def.ablativeUsed = true;
      def.hp = 1;
    }
    // Mercy spirit — pull the killing blow, leave the foe at 10 HP (capture setup)
    if (result.destroyed && att.mercyArmed && def.side === 'enemy' && !def.def.boss) {
      result.destroyed = false;
      result.mercy = true;
      att.mercyArmed = false;
      def.hp = 10;
    }
    if (result.destroyed) {
      def.overkillDealt = Math.max(0, result.damage - hpBefore);
      result.overkill = def.overkillDealt;
    }
  }
  if (result.hit && w.drain) att.hp = Math.min(att.def.maxHp, att.hp + Math.round(result.damage * 0.25));
  if (result.hit && def.alive && partBonus(def, 'reflect') > 0) {
    const rd = Math.min(att.hp - 1, Math.round(result.damage * (partBonus(def, 'reflect') / 100)));
    if (rd > 0) {
      att.hp -= rd;
      result.expEvents.push(`\u21C4 REACTIVE ARMOR — ${att.def.name} takes ${rd} backlash`);
    }
  }
  if (result.hit && def.alive) def.statuses = (def.statuses ?? []).filter((fx) => fx.id !== 'mark'); // paint spent by the strike
  if (result.hit && def.alive && w.status && !result.graze) applyStatus(def, w.status);
  if (result.hit && def.alive && att.glacialNext && !result.graze) applyStatus(def, 'slow');
  if (result.hit && def.alive && att.flusterNext && !result.graze) applyStatus(def, 'supp');
  if (result.hit && def.alive && att.pyreNext && !result.graze) applyStatus(def, 'burn');
  if (result.hit && def.alive && att.tracerNext && !result.graze) applyStatus(def, 'mark');
  if (result.hit && def.alive && !w.status && !result.graze && partBonus(att, 'statusSlow') > 0 && rnd() < 0.3) applyStatus(def, 'slow');
  if (result.hit && def.alive && !result.graze && partBonus(att, 'statusBurn') > 0 && rnd() < 0.25) applyStatus(def, 'burn');
  if (result.hit && def.alive && !result.graze && partBonus(att, 'statusBreak') > 0 && rnd() < 0.2) applyStatus(def, 'break');
  if (result.hit && def.alive && !result.graze && partBonus(att, 'statusMark') > 0 && rnd() < 0.3) applyStatus(def, 'mark');
  if (result.hit && def.alive && !result.graze && partBonus(att, 'statusStun') > 0 && rnd() < 0.15) applyStatus(def, 'stun');
  if (result.hit && def.alive && w.breaker && !result.graze) def.sundered = true;
  if (result.hit && def.alive && w.willDrain) def.will = Math.max(100, def.will - 5);
  // bash knockback — a landed hit hurls the survivor one tile away from the strike
  if (result.hit && def.alive && !result.destroyed && w.knockback && partBonus(def, 'knockProof') === 0) {
    for (let ki = 0; ki < (partBonus(att, 'knockPlus') > 0 ? 2 : 1); ki++) {
    const kx = Math.sign(def.pos.x - att.pos.x);
    const ky = Math.sign(def.pos.y - att.pos.y);
    const opts =
      Math.abs(def.pos.x - att.pos.x) >= Math.abs(def.pos.y - att.pos.y)
        ? [{ x: def.pos.x + kx, y: def.pos.y }, { x: def.pos.x, y: def.pos.y + ky }]
        : [{ x: def.pos.x, y: def.pos.y + ky }, { x: def.pos.x + kx, y: def.pos.y }];
    for (const np of opts) {
      if (np.x === def.pos.x && np.y === def.pos.y) continue;
      if (np.x < 0 || np.y < 0 || np.x >= state.map.cols || np.y >= state.map.rows) continue;
      if (!TERRAIN_INFO[terrainAt(state.map, np)].passable[def.def.moveType]) continue;
      if (state.units.some((o) => o.alive && o.pos.x === np.x && o.pos.y === np.y)) continue;
      def.pos = np;
      break;
    }
    }
  }
  if (result.hit) def.exposed = false;
  if (result.destroyed) {
    def.alive = false;
    att.kills += 1;
  }
  // crippling blow — survived a hit >= 40% of max HP: frame damaged, move -2
  if (result.hit && def.alive && !def.crippled && result.damage >= def.def.maxHp * 0.4) {
    def.crippled = true;
    result.crippled = true;
  }
  // chain arc — the bolt leaps to nearby foes of the struck unit (half damage, no counter)
  if (result.hit && w.chain) {
    const arcs = units
      .filter((u) => u.alive && u.side === def.side && u.uid !== def.uid && dist(u.pos, def.pos) <= 2)
      .sort((x, y) => dist(x.pos, def.pos) - dist(y.pos, def.pos))
      .slice(0, w.chain);
    const spl = (result.splash = result.splash ?? []);
    for (const t of arcs) {
      const r = resolveHit(att, t, w, state.map, attMods0);
      if (!r.hit) {
        spl.push({ uid: t.uid, name: t.def.name, hit: false, damage: 0, destroyed: false, hitChance: r.hitChance });
        continue;
      }
      const dmg = Math.round(r.damage * 0.5);
      const hpB = t.hp;
      t.hp = Math.max(0, t.hp - dmg);
      att.dmgDealt = (att.dmgDealt ?? 0) + dmg;
      const dead = t.hp <= 0;
      if (dead) {
        t.alive = false;
        att.kills += 1;
        t.overkillDealt = Math.max(0, dmg - hpB);
      }
      spl.push({ uid: t.uid, name: t.def.name, hit: true, damage: dmg, destroyed: dead, hitChance: r.hitChance });
    }
  }

  if (!result.hit) def.dodges = (def.dodges ?? 0) + 1; // dodging costs — evasion decays through the phase

  if (result.counter) {
    const cw = result.counter.weapon;
    def.en = Math.max(0, def.en - enCostOf(def, cw));
    if (cw.ammo != null) def.ammo[cw.id] = (def.ammo[cw.id] ?? 0) - 1;
    if (result.counter.hit) {
      const hpBefore = att.hp;
      if (def.skills?.sentinel) result.counter.damage = Math.round(result.counter.damage * (1 + def.skills.sentinel * 0.05));
      att.hp = Math.max(0, att.hp - result.counter.damage);
      def.dmgDealt = (def.dmgDealt ?? 0) + result.counter.damage;
      if (result.counter.destroyed && att.miracleArmed) {
        result.counter.destroyed = false;
        result.counter.miracle = true;
        att.miracleArmed = false;
        att.hp = 10;
      }
      if (att.alive && !att.crippled && result.counter.damage >= att.def.maxHp * 0.4) {
        att.crippled = true;
        result.counter.crippled = true;
      }
      if (result.counter.destroyed) {
        att.overkillDealt = Math.max(0, result.counter.damage - hpBefore);
        result.counter.overkill = att.overkillDealt;
      }
    }
    if (result.counter.hit && cw.drain) def.hp = Math.min(def.def.maxHp, def.hp + Math.round(result.counter.damage * 0.25));
    if (result.counter.hit && att.alive) att.statuses = (att.statuses ?? []).filter((fx) => fx.id !== 'mark');
    if (result.counter.hit && att.alive && cw.status && !result.counter.graze) applyStatus(att, cw.status);
    if (result.counter.hit && att.alive && cw.breaker && !result.counter.graze) att.sundered = true;
    if (result.counter.hit && att.alive && cw.willDrain) att.will = Math.max(100, att.will - 5);
    if (result.counter.hit) att.exposed = false;
    if (result.counter.destroyed) {
      att.alive = false;
      def.kills += 1;
    }
    if (!result.counter.hit) att.dodges = (att.dodges ?? 0) + 1;
  }

  att.moved = true;
  att.acted = true;
  // afterburner part: a kill refreshes the attacker's turn, once per turn
  if (result.destroyed && att.parts.includes('afterburner') && att.alive && !att.followUpReady) {
    att.acted = false;
    att.moved = false;
    att.followUpReady = true;
  }
  att.strikeForNextAttack = false;
  att.deadshotForNextAttack = false;
  att.charged = false;
  att.aimed = false;
  att.hasAttacked = true;
  att.breachNextAttack = false;
  att.valorForNextAttack = false;
  att.empowerForNextAttack = false;
  att.executeNext = false;
  att.shatterNext = false;
  att.glacialNext = false;
  att.soulburnNext = false;
  att.flusterNext = false;
  att.huntNext = false;
  att.tracerNext = false;
  att.strafeNext = false;
  att.pyreNext = false;
  att.overrunNext = false;
  att.exertNext = false;
  att.skyfallNext = false;
  att.avengerNext = false;
  att.reaperNext = false;
  att.stalkNext = false;
  att.gutsForNextAttack = false;
  att.snipeForNextAttack = false;
  att.soulForNextAttack = false;
  att.gutsForNextAttack = false;
  def.flashUntilEndOfEnemyPhase = false; // consumed by this attack whether it hit or not

  // Will: +1 for engaging, +1 for taking a hit, +4 per kill; PP: +3 per kill
  willGain(att, 1 + (result.counter?.hit ? 1 : 0) + (result.destroyed ? 4 : 0));
  willGain(def, (result.hit ? 1 : 0) + (result.counter?.hit ? 1 : 0) + (result.counter?.destroyed ? 4 : 0));
  if (result.destroyed) {
    att.pp += 3;
    if (att.skills?.scavenger) att.en = Math.min(att.def.maxEn, att.en + (att.skills.scavenger ?? 0) * 4);
  }
  if (result.counter?.destroyed) {
    def.pp += 3;
    if (def.skills?.scavenger) def.en = Math.min(def.def.maxEn, def.en + (def.skills.scavenger ?? 0) * 4);
  }

  // EXP: +30 for a landed hit, +70 for a kill (counter kills award the countering unit)
  result.expEvents = [];
  if (result.hit) awardExp(att, result.destroyed ? (def.elite ? 110 : 70) : 30, result.expEvents);
  if (result.counter?.hit) awardExp(def, result.counter.destroyed ? (att.elite ? 110 : 70) : 25, result.expEvents);
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

  att.en = Math.max(0, att.en - enCostOf(att, w));
  if (w.ammo != null) att.ammo[w.id] = (att.ammo[w.id] ?? 0) - 1;
  att.moved = true;
  att.acted = true;
  att.strikeForNextAttack = false;
  att.deadshotForNextAttack = false;
  att.charged = false;
  att.aimed = false;
  att.hasAttacked = true;
  att.breachNextAttack = false;
  att.valorForNextAttack = false;
  att.empowerForNextAttack = false;
  att.executeNext = false;
  att.shatterNext = false;
  att.glacialNext = false;
  att.soulburnNext = false;
  att.flusterNext = false;
  att.huntNext = false;
  att.tracerNext = false;
  att.strafeNext = false;
  att.pyreNext = false;
  att.overrunNext = false;
  att.exertNext = false;
  att.skyfallNext = false;
  att.avengerNext = false;
  att.reaperNext = false;
  att.stalkNext = false;
  att.gutsForNextAttack = false;

  let hits = 0;
  let kills = 0;
  inBlast.forEach((t, i) => {
    const r = i === 0 ? { hit: result.hit, damage: result.damage, destroyed: result.destroyed } : result.splash![i - 1];
    if (r.hit) {
      const hpB = t.hp;
      t.hp = Math.max(0, t.hp - r.damage);
      if (r.destroyed) t.overkillDealt = Math.max(0, r.damage - hpB);
      if (t.side !== att.side) att.dmgDealt = (att.dmgDealt ?? 0) + r.damage;
      willGain(t, 1);
      hits++;
      if (r.destroyed) {
        t.alive = false;
        att.kills += 1;
        att.pp += 3;
        kills++;
      }
    } else {
      t.dodges = (t.dodges ?? 0) + 1;
    }
  });
  willGain(att, 1 + kills * 4);
  if (kills > 0 && att.skills?.scavenger) att.en = Math.min(att.def.maxEn, att.en + (att.skills.scavenger ?? 0) * 4 * kills);
  result.expEvents = [];
  if (hits > 0) awardExp(att, 30 + kills * 40 + (hits - 1) * 15, result.expEvents);
  return { state: { ...state, units }, result };
}

/** Apply an ALL weapon — every hostile inside weapon range eats an independent hit roll, no counters. */
export function applyAllAttack(state: GameState, attackerUid: string, weaponId: string, mods?: (u: UnitState) => CombatMods): { state: GameState; result: AttackResult } {
  const units = state.units.map((u) => ({ ...u, ammo: { ...u.ammo } }));
  const att = units.find((u) => u.uid === attackerUid)!;
  const w = att.def.weapons.find((x) => x.id === weaponId)!;
  const inRange = units
    .filter((u) => u.alive && u.side !== att.side && dist(u.pos, att.pos) >= w.rangeMin && dist(u.pos, att.pos) <= w.rangeMax)
    .sort((a, b) => dist(a.pos, att.pos) - dist(b.pos, att.pos));
  const result = simulateMapAttack(att, inRange, w, state.map, mods ? mods(att) : NO_MODS);

  att.en = Math.max(0, att.en - enCostOf(att, w));
  if (w.ammo != null) att.ammo[w.id] = (att.ammo[w.id] ?? 0) - 1;
  att.moved = true;
  att.acted = true;
  att.strikeForNextAttack = false;
  att.deadshotForNextAttack = false;
  att.charged = false;
  att.aimed = false;
  att.hasAttacked = true;
  att.breachNextAttack = false;
  att.valorForNextAttack = false;
  att.empowerForNextAttack = false;
  att.executeNext = false;
  att.shatterNext = false;
  att.glacialNext = false;
  att.soulburnNext = false;
  att.flusterNext = false;
  att.huntNext = false;
  att.tracerNext = false;
  att.strafeNext = false;
  att.pyreNext = false;
  att.overrunNext = false;
  att.exertNext = false;
  att.skyfallNext = false;
  att.avengerNext = false;
  att.reaperNext = false;
  att.stalkNext = false;
  att.gutsForNextAttack = false;
  att.soulForNextAttack = false;
  att.gutsForNextAttack = false;

  let hits = 0;
  let kills = 0;
  inRange.forEach((t, i) => {
    const r = i === 0 ? { hit: result.hit, damage: result.damage, destroyed: result.destroyed } : result.splash![i - 1];
    if (r.hit) {
      t.hp = Math.max(0, t.hp - r.damage);
      att.dmgDealt = (att.dmgDealt ?? 0) + r.damage;
      willGain(t, 1);
      hits++;
      if (r.destroyed) {
        t.alive = false;
        att.kills += 1;
        att.pp += 3;
        kills++;
      }
    } else {
      t.dodges = (t.dodges ?? 0) + 1;
    }
  });
  willGain(att, 1 + kills * 4);
  if (kills > 0 && att.skills?.scavenger) att.en = Math.min(att.def.maxEn, att.en + (att.skills.scavenger ?? 0) * 4 * kills);
  result.expEvents = [];
  if (hits > 0) awardExp(att, 30 + kills * 40 + (hits - 1) * 15, result.expEvents);
  return { state: { ...state, units }, result };
}

const MAX_LEVEL = 9;

function awardExp(u: UnitState, amount: number, events: string[]) {
  if (!u.alive || u.level >= MAX_LEVEL) return;
  amount = Math.round(amount * (1 + partBonus(u, 'xp') / 100));
  if (u.fortuneForNextAttack) {
    amount *= 2;
    u.fortuneForNextAttack = false;
    events.push(`${u.def.pilot.name} FORTUNE — double EXP!`);
  }
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

export const spiritCost = (u: UnitState, spirit: SpiritId): number =>
  Math.max(1, Math.round(SPIRITS[spirit].cost * (1 - (u.skills?.warcaster ?? 0) * 0.04)));

export function applySpirit(u: UnitState, spirit: SpiritId): void {
  u.sp = Math.max(0, u.sp - spiritCost(u, spirit));
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
    case 'vanish':
      u.vanishUntilEndOfEnemyPhase = true;
      break;
    case 'lucky':
      u.luckyForNextKill = true;
      break;
    case 'miracle':
      u.miracleArmed = true;
      break;
    case 'guts':
      u.gutsForNextAttack = true;
      break;
    case 'decoy':
      // store spawns the holoreplica unit next to the caster
      break;
    case 'hymn':
      break; // squad anthem — the store flags every ally
    case 'emp':
      break; // the stunned enemy is marked by the store pass
    case 'phalanx':
      break; // formation armor — the store flags every ally
    case 'deadshot':
      u.deadshotForNextAttack = true;
      break;
    case 'frenzy':
      u.frenzyThisTurn = true;
      break;
    case 'breach':
      u.breachNextAttack = true;
      break;
    case 'relentless':
      u.relentlessUntilEndOfEnemyPhase = true;
      break;
    case 'sanctuary':
      break; // ally heal ring — applied by the store pass
    case 'awaken':
      break; // ally reactivation — applied by the store pass
    case 'charity':
      break; // self-sacrifice heal — applied by the store pass
    case 'siphon':
      break; // will drain — applied by the store pass
    case 'reboot':
      u.statuses = [];
      u.hp = Math.min(u.def.maxHp, u.hp + Math.round(u.def.maxHp * 0.25));
      break;
    case 'expose':
      break; // enemies in radius are marked by the store pass
    case 'overdrive':
      u.againOnKill = true;
      break;
    case 'mercy':
      u.mercyArmed = true;
      break;
    case 'purge':
      break; // area cleanse is applied by the store pass
    case 'resolve':
      u.will = 150;
      break;
    case 'sunder':
    case 'provoke':
      break; // area debuff is applied by the store pass
    case 'cheer':
      break; // the inspired ally is chosen by the store pass
    case 'wish':
      break; // the restored ally is chosen by the store pass
    case 'gravity':
      break; // anchored enemies are marked by the store pass
    case 'snipe':
      u.snipeForNextAttack = true;
      break;
    case 'zeal':
      u.will = Math.min(MAX_WILL, u.will + 15);
      break;
    case 'roar':
      u.will = Math.min(MAX_WILL, u.will + 20);
      break;
    case 'bless':
      u.hp = Math.min(u.def.maxHp, u.hp + Math.round(u.def.maxHp * 0.4));
      break;
    case 'vigor':
      u.en = Math.min(u.def.maxEn, u.en + 40);
      break;
    case 'fortune':
      u.fortuneForNextAttack = true;
      break;
    case 'soul':
      u.soulForNextAttack = true;
      break;
    case 'empower':
      break; // war blessing — the blessed ally is chosen by the store pass
    case 'marksman':
      break; // squad fire control — the store flags every ally
    case 'ward':
      break; // aegis prayer — the warded ally is chosen by the store pass
    case 'warsong':
      break; // anthem — the store flags every ally
    case 'execute':
      u.executeNext = true;
      break;
    case 'shatter':
      u.shatterNext = true;
      break;
    case 'glacial':
      u.glacialNext = true;
      break;
    case 'relay':
      break;
    case 'soulburn':
      u.soulburnNext = true;
      u.hp = Math.max(1, u.hp - Math.round(u.def.maxHp * 0.1));
      break;
    case 'fluster':
      u.flusterNext = true;
      break;
    case 'hunt':
      u.huntNext = true;
      break;
    case 'tracer':
      u.tracerNext = true;
      break;
    case 'strafe':
      u.strafeNext = true;
      break;
    case 'inspire':
      break;
    case 'pyre':
      u.pyreNext = true;
      break;
    case 'overrun':
      u.overrunNext = true;
      break;
    case 'exert':
      u.exertNext = true;
      u.en = Math.max(0, u.en - 10);
      break;
    case 'veil':
      break;
    case 'cantata':
      break;
    case 'warhorn':
      break;
    case 'skyfall':
      u.skyfallNext = true;
      break;
    case 'avenger':
      u.avengerNext = true;
      break;
    case 'reaper':
      u.reaperNext = true;
      break;
    case 'stalker':
      u.stalkNext = true;
      break;
    case 'interfere':
      break;
    // 'rouse', 'disrupt' and 'trust' affect neighbouring units — applied in store.castSpirit
  }
}

export function clearTransientForOwnPhase(u: UnitState): void {
  u.focusUntilEndOfEnemyPhase = false;
  u.gritUntilEndOfEnemyPhase = false;
  u.guardUntilEndOfEnemyPhase = false;
  u.accelThisTurn = 0;
  u.vanishUntilEndOfEnemyPhase = false;
  u.moved = false;
  u.acted = false;
  u.followUpReady = false;
  u.overwatch = false;
  u.hymnUntilEndOfEnemyPhase = false;
  u.veilUntilEndOfEnemyPhase = false;
  u.counterBuffUntilEndOfEnemyPhase = false;
  u.counterSealUntilEndOfEnemyPhase = false;
  u.marksmanUntilEndOfEnemyPhase = false;
  u.warsongUntilEndOfEnemyPhase = false;
  u.frenzyThisTurn = false;
  u.relentlessUntilEndOfEnemyPhase = false;
  u.dodges = 0;
}

// ---------- Enemy AI ----------

interface AiPlan {
  unit: UnitState;
  moveTo: Pos;
  target?: UnitState;
  weapon?: WeaponDef;
  /** morale break — a battered grunt withdraws instead of pressing the attack */
  fleeing?: boolean;
  /** MAP barrage — aim point + weapon when a blast beats a single shot */
  mapAim?: Pos;
  mapWeapon?: WeaponDef;
  /** kamikaze — detonate the reactor beside the nearest player */
  detonate?: boolean;
  /** defensive standby — hold fire for the first player to enter the weapon arc */
  standby?: boolean;
}

/** For each enemy unit pick: best tile in range that can attack the weakest-hit player unit; else move toward nearest player. */
export function planEnemyActions(state: GameState): AiPlan[] {
  const { map, units } = state;
  const players = units.filter((u) => u.alive && u.side === 'player' && !u.vanishUntilEndOfEnemyPhase); // Vanish: untargetable
  const enemies = units.filter((u) => u.alive && u.side === 'enemy' && !u.acted);
  const plans: AiPlan[] = [];
  const claimed = new Set<string>(); // tiles other AI units plan to occupy

  for (const e of enemies) {
    // loot carriers ignore combat entirely — they bolt for the east edge every turn
    if (e.def.carrier) {
      const tiles = [...movementRange(map, units, e).values()].map((v) => v.pos).filter((p) => {
        const occ = unitAt(units, p);
        return (!occ || occ.uid === e.uid) && !claimed.has(key(p));
      });
      const best = (tiles.length ? tiles : [e.pos]).slice().sort((a, b) => b.x - a.x)[0];
      claimed.add(key(best));
      plans.push({ unit: e, moveTo: best });
      continue;
    }
    // kamikaze drones make a beeline for the nearest player and blow their core
    if (e.def.kamikaze) {
      const dz = [...movementRange(map, units, e).values()].map((v) => v.pos).filter((p) => {
        const occ = unitAt(units, p);
        return (!occ || occ.uid === e.uid) && !claimed.has(key(p));
      });
      const nearest2 = players.slice().sort((a, b) => dist(e.pos, a.pos) - dist(e.pos, b.pos))[0];
      if (!nearest2) {
        plans.push({ unit: e, moveTo: e.pos });
        continue;
      }
      const run = (dz.length ? dz : [e.pos]).slice().sort((a, b) => {
        const da = Math.min(...players.map((p) => dist(a, p.pos)));
        const db = Math.min(...players.map((p) => dist(b, p.pos)));
        return da - db;
      })[0];
      claimed.add(key(run));
      plans.push({ unit: e, moveTo: run, detonate: players.some((p) => dist(run, p.pos) <= 1) });
      continue;
    }
    // bosses hold position until the map's hold turn (commanding from the back line)
    const holding = !!e.def.boss && state.turn < (map.bossHoldUntil ?? 0);
    // seize missions: defenders already near the beacon stay to guard it
    const bp = map.beaconPos;
    const guarding = !!bp && dist(e.pos, bp) <= 4;
    const moveTiles = [...movementRange(map, units, e).values()].map((v) => v.pos).filter((p) => {
      const occ = unitAt(units, p);
      return (!occ || occ.uid === e.uid) && !claimed.has(key(p));
    });
    const tiles = (e.anchored || e.def.holdPos) ? moveTiles.filter((p) => same(p, e.pos)) : holding ? moveTiles.filter((p) => same(p, e.pos)) : guarding ? moveTiles.filter((p) => dist(p, bp!) <= 3) : moveTiles;
    // morale: a badly damaged line unit may break off and fall back instead of attacking
    if (!e.def.boss && !e.elite && !holding && e.hp <= e.def.maxHp * 0.25 && state.turn > 2 && Math.random() < 0.55) {
      const flee = (moveTiles.length ? moveTiles : [e.pos]).slice().sort((a, b) => {
        const da = players.length ? Math.min(...players.map((p) => dist(a, p.pos))) : 0;
        const db = players.length ? Math.min(...players.map((p) => dist(b, p.pos))) : 0;
        return db - da;
      })[0];
      claimed.add(key(flee));
      plans.push({ unit: e, moveTo: flee, fleeing: true });
      continue;
    }
    let best: { pos: Pos; target: UnitState; weapon: WeaponDef; score: number } | null = null;
    const willMove = (p: Pos) => !same(p, e.pos);
    for (const tile of tiles) {
      for (const p of players) {
        if (e.provokedTo && p.uid !== e.provokedTo) continue; // Provoke: locked onto the war horn
        if (partBonus(p, 'stealthField') > 0 && dist(tile, p.pos) > 3) continue; // Stealth Field: invisible past 3 tiles
        for (const w of weaponsAgainst(e, tile, p, willMove(tile))) {
          const hc = hitChance(e, p, w, map, rallyBonus(units, e) + formationBonus(units, e) - jammerPenalty(units, e));
          const dmg = damageOf(e, p, w, map, false);
          // convoy priority: protect-mission NPCs are the AI's preferred prey
          const score = dmg * (hc / 100) + (p.hp - dmg <= 0 ? 5000 : 0) + (p.escort ? 800 : 0) + (partBonus(p, 'aggro') > 0 ? 900 : 0) + w.power * 0.01;
          if (!best || score > best.score) best = { pos: tile, target: p, weapon: w, score };
        }
      }
    }
    // MAP barrage — a clustered formation is worth more than any single shot:
    // hit >=2 players while catching no allies and the siege weapon fires instead
    let mapPlan: { pos: Pos; aim: Pos; weapon: WeaponDef; hits: number } | null = null;
    for (const tile of tiles) {
      for (const w of usableWeapons(e)) {
        if (w.mapRange == null) continue;
        if (!same(tile, e.pos) && !w.postMove) continue;
        for (const p of players) {
          const d = dist(tile, p.pos);
          if (d < w.rangeMin || d > rangeMaxOf(e, w)) continue;
          const blast = units.filter((u) => u.alive && dist(u.pos, p.pos) <= (w.mapRange ?? 0));
          const ps = blast.filter((u) => u.side === 'player' && !u.vanishUntilEndOfEnemyPhase).length;
          const es = blast.filter((u) => u.side === 'enemy' && u.uid !== e.uid).length;
          if (ps >= 2 && es === 0 && (!mapPlan || ps > mapPlan.hits)) mapPlan = { pos: tile, aim: { ...p.pos }, weapon: w, hits: ps };
        }
      }
    }
    if (mapPlan && (!best || mapPlan.hits >= 3 || (mapPlan.hits >= 2 && best.score < 3200))) {
      claimed.add(key(mapPlan.pos));
      plans.push({ unit: e, moveTo: mapPlan.pos, mapAim: mapPlan.aim, mapWeapon: mapPlan.weapon });
      continue;
    }
    if (best) {
      claimed.add(key(best.pos));
      plans.push({ unit: e, moveTo: best.pos, target: best.target, weapon: best.weapon });
    } else {
      // advance toward nearest player — NPC convoy draws attackers like a magnet
      const nearest = (e.provokedTo ? players.find((p) => p.uid === e.provokedTo) : undefined) ?? players.slice().sort((a, b) => dist(e.pos, a.pos) - (a.escort ? 1.5 : 0) - (dist(e.pos, b.pos) - (b.escort ? 1.5 : 0)))[0];
      if (!nearest) continue;
      // guards drift back toward the beacon; everyone else chases the nearest player
      const anchor = guarding ? bp! : nearest.pos;
      const target = moveTiles.slice().sort((a, b) => dist(a, anchor) - dist(b, anchor))[0] ?? e.pos;
      claimed.add(key(target));
      // defensive standby — can't reach a target, so hold fire for whatever wanders in
      plans.push({ unit: e, moveTo: target, standby: !e.def.boss && usableWeapons(e).some((w) => !w.mapRange) });
    }
  }
  // armed npc allies (militia) fight back on the enemy phase — same scoring, aimed at hostiles
  for (const a of units.filter((u) => u.alive && u.armed && !u.acted && usableWeapons(u).length > 0)) {
    const moveTiles = [...movementRange(map, units, a).values()].map((v) => v.pos).filter((p) => {
      const occ = unitAt(units, p);
      return (!occ || occ.uid === a.uid) && !claimed.has(key(p));
    });
    let best: { pos: Pos; target: UnitState; weapon: WeaponDef; score: number } | null = null;
    const willMove = (p: Pos) => !same(p, a.pos);
    for (const tile of moveTiles) {
      for (const e of enemies) {
        for (const w of weaponsAgainst(a, tile, e, willMove(tile))) {
          const hc = hitChance(a, e, w, map, rallyBonus(units, a) + formationBonus(units, a) - jammerPenalty(units, a));
          const dmg = damageOf(a, e, w, map, false);
          const score = dmg * (hc / 100) + (e.hp - dmg <= 0 ? 5000 : 0) + w.power * 0.01;
          if (!best || score > best.score) best = { pos: tile, target: e, weapon: w, score };
        }
      }
    }
    if (best) {
      claimed.add(key(best.pos));
      plans.push({ unit: a, moveTo: best.pos, target: best.target, weapon: best.weapon });
    } else {
      // escorts hold formation near the convoy rather than charging off
      const esc = players.find((p) => p.escort && p.alive);
      const anchor = esc ? esc.pos : a.pos;
      const target = moveTiles.slice().sort((x, y) => dist(x, anchor) - dist(y, anchor))[0] ?? a.pos;
      claimed.add(key(target));
      plans.push({ unit: a, moveTo: target });
    }
  }
  return plans;
}

/** Log lines for units destroyed between two snapshots — boss last words + elite bounty callout. */
export function defeatQuotes(before: UnitState[], after: UnitState[], killer?: UnitState): string[] {
  const lines: string[] = [];
  for (const u of before) {
    if (!u.alive) continue;
    const post = after.find((x) => x.uid === u.uid);
    if (!post || post.alive) continue;
    if (u.def.pilot.lastWords) lines.push(`☠ ${u.def.pilot.name}: "${u.def.pilot.lastWords}"`);
    else if (u.elite && u.side === 'enemy') lines.push(`★ ELITE DOWN — ${u.def.name}`);
    if (u.side === 'player' && killer?.def.pilot.killQuip) lines.push(`⚔ ${killer.def.pilot.name}: "${killer.def.pilot.killQuip}"`);
    // avenge — the fall of a squadmate ignites the survivors' Will
    if (u.side === 'player' && post) {
      let n = 0;
      for (const ally of after) {
        if (ally.alive && ally.side === 'player' && !ally.npc && ally.uid !== post.uid && dist(ally.pos, post.pos) <= 3 && ally.will < 150) {
          ally.will = Math.min(150, ally.will + 10);
          n++;
        }
      }
      if (n) lines.push(`⚔ AVENGE — ${u.def.pilot.name}'s fall ignites the squad (${n} pilot${n > 1 ? 's' : ''} +10 Will)`);
    }
  }
  return lines;
}

export interface EndObjective {
  objectiveType?: 'rout' | 'survive' | 'boss' | 'protect' | 'seize' | 'reach' | 'escort' | 'hunt';
  surviveTurns?: number;
  protectTurns?: number;
  seizePos?: Pos;
  reachPos?: Pos;
  /** hero clause: when this def id is fielded and destroyed, the mission fails */
  requiredDefId?: string;
  /** hunt objective: the marked ace's def id — it falling wins the mission */
  huntId?: string;
  /** rout/boss/seize/reach only: fail if the objective isn't met by this turn */
  turnLimit?: number;
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
  sup.en = Math.max(0, sup.en - enCostOf(sup, w));
  if (w.ammo != null) sup.ammo[w.id] = (sup.ammo[w.id] ?? 0) - 1;
  sup.strikeForNextAttack = false;
  sup.valorForNextAttack = false;
  sup.snipeForNextAttack = false;
  sup.soulForNextAttack = false;
  if (r.hit) {
    def.hp = Math.max(0, def.hp - r.damage);
    sup.dmgDealt = (sup.dmgDealt ?? 0) + r.damage;
  }
  const destroyed = r.hit && def.hp <= 0;
  if (destroyed) {
    def.alive = false;
    sup.kills += 1;
    sup.pp += 3;
  }
  if (!r.hit) def.dodges = (def.dodges ?? 0) + 1;
  willGain(sup, 1 + (destroyed ? 4 : 0));
  const expEvents: string[] = [];
  awardExp(sup, destroyed ? 70 : 15, expEvents);
  return { state: { ...state, units }, result: { name: sup.def.name, hit: r.hit, damage: r.damage, destroyed, hitChance: r.hitChance, weapon: w, expEvents } };
}

export function checkEnd(units: UnitState[], obj?: EndObjective | null, turn?: number): 'victory' | 'defeat' | null {
  if (!units.some((u) => u.alive && u.side === 'player' && !u.npc)) return 'defeat';
  // hero clause — if the required sortie was fielded and destroyed, the mission is lost
  if (obj?.requiredDefId && units.some((u) => u.side === 'player' && u.def.id === obj.requiredDefId) && !units.some((u) => u.alive && u.side === 'player' && u.def.id === obj.requiredDefId)) return 'defeat';
  const type = obj?.objectiveType ?? 'rout';
  if (type === 'boss') {
    // win as soon as the boss unit falls, regardless of remaining grunts
    if (!units.some((u) => u.alive && u.side === 'enemy' && u.def.boss)) return 'victory';
    return timedOut(obj, turn) ? 'defeat' : null;
  }
  if (type === 'survive') {
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return (turn ?? 0) > (obj?.surviveTurns ?? 8) ? 'victory' : null;
  }
  if (type === 'protect') {
    // the escorted unit dying is an instant loss; armed escorts may fall without failing the mission
    if (!units.some((u) => u.alive && u.escort)) return 'defeat';
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return (turn ?? 0) > (obj?.protectTurns ?? 8) ? 'victory' : null;
  }
  if (type === 'hunt') {
    // hunt objective: the marked ace falling wins — routing the whole pack also wins
    if (!units.some((u) => u.alive && u.def.id === obj?.huntId)) return 'victory';
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return timedOut(obj, turn) ? 'defeat' : null;
  }
  if (type === 'seize') {
    // a player unit standing on the beacon wins; routing the defenders also wins
    const bp = obj?.seizePos;
    if (bp && units.some((u) => u.alive && u.side === 'player' && u.pos.x === bp.x && u.pos.y === bp.y)) return 'victory';
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return timedOut(obj, turn) ? 'defeat' : null;
  }
  if (type === 'reach') {
    // reach missions: land a unit on the extraction tile, or rout the blockade
    const rp = obj?.reachPos;
    if (rp && units.some((u) => u.alive && u.side === 'player' && u.pos.x === rp.x && u.pos.y === rp.y)) return 'victory';
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return timedOut(obj, turn) ? 'defeat' : null;
  }
  if (type === 'escort') {
    // escort missions: the mule dying fails instantly; reaching the east edge wins (handled in store);
    // routing all hostiles also secures the cargo
    if (!units.some((u) => u.alive && u.escort)) return 'defeat';
    if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
    return timedOut(obj, turn) ? 'defeat' : null;
  }
  if (!units.some((u) => u.alive && u.side === 'enemy')) return 'victory';
  return timedOut(obj, turn) ? 'defeat' : null;
}

function timedOut(obj: EndObjective | null | undefined, turn?: number): boolean {
  return !!obj?.turnLimit && (turn ?? 0) > obj.turnLimit;
}

/** Start-of-own-phase recovery: base EN regen + terrain effects (heal on base/city, burn on lava). */
export function phaseRecovery(u: UnitState, map: MapDef, units?: UnitState[]): { hpGain: number; enGain: number; hpLoss: number } {
  const t = TERRAIN_INFO[terrainAt(map, u.pos)];
  const aura = units ? units.filter((a) => a.alive && a.side === u.side && a.uid !== u.uid && partBonus(a, 'auraEn') > 0 && dist(a.pos, u.pos) <= 2).length * 6 : 0;
  const healPct = units ? units.filter((a) => a.alive && a.side === u.side && a.uid !== u.uid && partBonus(a, 'auraHeal') > 0 && dist(a.pos, u.pos) <= 2).reduce((n, a) => n + partBonus(a, 'auraHeal'), 0) : 0;
  const enGain = Math.min(u.def.maxEn - u.en, 5 + (t.enRegen ?? 0) + partBonus(u, 'enRegen') + aura);
  const hpGain = Math.min(u.def.maxHp - u.hp, Math.round(u.def.maxHp * (t.hpRegen ?? 0)) + Math.round(u.def.maxHp * (partBonus(u, 'hpRegen') / 100)) + Math.round(u.def.maxHp * 0.01 * (u.skills?.regen ?? 0)) + Math.round(u.def.maxHp * healPct / 100));
  const hpLoss = Math.min(u.hp - 1, Math.round(u.def.maxHp * (t.hpDmg ?? 0))); // terrain can't kill — leaves 1 HP
  if (partBonus(u, 'ammoRegen') > 0) {
    for (const w of u.def.weapons) {
      if (w.ammo != null) u.ammo[w.id] = Math.min(maxAmmoOf(u, w), (u.ammo[w.id] ?? 0) + 1);
    }
  }
  u.en += enGain;
  u.sp = Math.min(u.def.pilot.maxSp, u.sp + partBonus(u, 'spRegen'));
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
