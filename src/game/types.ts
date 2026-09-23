export type Pos = { x: number; y: number };

export type Terrain = 'plain' | 'forest' | 'mountain' | 'water' | 'city' | 'road' | 'base' | 'void' | 'moon' | 'desert' | 'snow' | 'lava' | 'ruins';

export type Side = 'player' | 'enemy';

export type WeaponKind = 'melee' | 'beam' | 'missile' | 'gun' | 'funnel';

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  power: number;
  rangeMin: number;
  rangeMax: number;
  enCost: number;
  ammo: number | null; // null = unlimited (EN-only weapon)
  hitMod: number; // percentage points
  postMove: boolean; // usable after moving (P weapons)
  animSeed: number; // slight visual variation
  /** SRW kiai: minimum will required to fire this weapon */
  willReq?: number;
  /** MAP weapon: radius in tiles around the aimed tile; hits every unit in the blast (no counters) */
  mapRange?: number;
}

export type SpiritId = 'focus' | 'strike' | 'valor' | 'grit' | 'accel' | 'guard' | 'flash' | 'snipe';

export interface SpiritDef {
  id: SpiritId;
  name: string;
  cost: number;
  desc: string;
}

export interface PilotDef {
  name: string;
  callsign: string;
  melee: number;
  ranged: number;
  defense: number;
  evade: number;
  maxSp: number;
  spirits: SpiritId[];
  faceColor: string;
}

export interface UnitDef {
  id: string;
  name: string;
  title: string; // e.g. "Personal Trooper"
  color: string;
  accent: string;
  maxHp: number;
  maxEn: number;
  armor: number;
  mobility: number;
  moveRange: number;
  moveType: 'land' | 'air';
  weapons: WeaponDef[];
  pilot: PilotDef;
  boss?: boolean;
  level?: number; // starting level (default 1)
}

export interface UnitState {
  uid: string;
  side: Side;
  def: UnitDef;
  hp: number;
  en: number;
  sp: number;
  pos: Pos;
  ammo: Record<string, number>; // weaponId -> remaining
  level: number;
  exp: number; // 0-99, level up at 100
  moved: boolean;
  acted: boolean;
  alive: boolean;
  // spirit effects active until next own phase (or one-shot)
  focusUntilEndOfEnemyPhase?: boolean;
  gritUntilEndOfEnemyPhase?: boolean;
  guardUntilEndOfEnemyPhase?: boolean;
  strikeForNextAttack?: boolean;
  valorForNextAttack?: boolean;
  accelThisTurn?: number; // bonus move squares
  flashUntilEndOfEnemyPhase?: boolean; // auto-dodge the next incoming attack
  snipeForNextAttack?: boolean; // next attack +2 range
  /** SRW kiai/will — 100 base, rises in combat; gates strong weapons, buffs stats */
  will: number;
  /** enemies destroyed by this unit this mission (ace tracking) */
  kills: number;
  /** equipped enhancement part ids (max MAX_PART_SLOTS) */
  parts: string[];
  /** pilot points — earned on kills/level-ups, spent on pilot skills in the workshop */
  pp: number;
  /** pilot skill allocation (persisted per pilot defId) */
  skills: PilotSkills;
}

export type PilotSkillId = 'hit' | 'evade' | 'dmg' | 'def';
export type PilotSkills = Record<PilotSkillId, number>;

/** SRW-style enhancement parts equippable on a mecha. */
export interface PartDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  armor?: number;
  mobility?: number;
  move?: number;
  hit?: number; // +% hit chance
  dmg?: number; // +% outgoing damage
  hp?: number; // +max HP
  en?: number; // +max EN
  evade?: number; // +% evade
}

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  // terrain[y][x]
  terrain: Terrain[][];
  playerSpawns: { defId: string; pos: Pos }[];
  enemySpawns: { defId: string; pos: Pos }[];
  objective: string;
  /** boss units hold position (can still attack in place) until this turn number. */
  bossHoldUntil?: number;
  /** enemy reinforcement wave: at the start of player turn `turn`, `comp` units spawn on the enemy edge */
  reinforce?: { turn: number; comp: string[] };
  /** mid-battle story beats: dialog plays at the start of player turn `turn` */
  events?: { turn: number; lines: { speaker: string; text: string; voice?: string }[] }[];
}

export type Phase =
  | 'title'
  | 'onboarding'
  | 'home'
  | 'briefing'
  | 'dialog'
  | 'deploy'
  | 'prologue'
  | 'credits'
  | 'hq'
  | 'missions'
  | 'bond'
  | 'settings'
  | 'player'
  | 'enemy'
  | 'battle'
  | 'victory'
  | 'defeat';

export type BattleMode = 'full' | 'short' | 'off';

export interface GameSettings {
  battleMode: BattleMode;
  animSpeed: 1 | 2;
  sound: boolean;
  music: boolean;
}

export type ObjectiveType = 'rout' | 'survive' | 'boss';

export type Reaction = 'counter' | 'defend' | 'evade';

export interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  destroyed: boolean;
  hitChance: number;
  // counter-attack performed by defender, if any
  counter: CounterResult | null;
  // the defender's chosen reaction (none for MAP weapons)
  reaction?: Reaction;
  // extra units hit when the weapon is a MAP weapon (primary target is `defender`)
  splash?: { uid: string; name: string; hit: boolean; damage: number; destroyed: boolean; hitChance: number }[];
  // SRW support attack — an adjacent ally chips in after the main strike (55% dmg, no counter)
  support?: { name: string; hit: boolean; damage: number; destroyed: boolean; hitChance: number };
  // human-readable EXP/level-up events for the log
  expEvents: string[];
}

export interface CounterResult {
  weapon: WeaponDef;
  hit: boolean;
  crit: boolean;
  damage: number;
  destroyed: boolean;
  hitChance: number;
}

export interface BattleData {
  attackerUid: string;
  defenderUid: string;
  weapon: WeaponDef;
  result: AttackResult;
}
