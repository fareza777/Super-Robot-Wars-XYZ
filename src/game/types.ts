export type Pos = { x: number; y: number };

export type Terrain = 'plain' | 'forest' | 'mountain' | 'water' | 'city' | 'road' | 'base';

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
}

export type SpiritId = 'focus' | 'strike' | 'valor' | 'grit' | 'accel' | 'guard';

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
}

export type Phase =
  | 'title'
  | 'onboarding'
  | 'home'
  | 'briefing'
  | 'dialog'
  | 'player'
  | 'enemy'
  | 'battle'
  | 'victory'
  | 'defeat';

export interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  destroyed: boolean;
  hitChance: number;
  // counter-attack performed by defender, if any
  counter: CounterResult | null;
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
