export type Pos = { x: number; y: number };

export type Terrain = 'plain' | 'forest' | 'mountain' | 'water' | 'city' | 'road' | 'base' | 'void' | 'moon' | 'desert' | 'snow' | 'lava' | 'ruins';

export type Side = 'player' | 'enemy';

export type WeaponKind = 'melee' | 'beam' | 'missile' | 'gun' | 'funnel';

export interface WeaponDef {
  id: string;
  /** ignores 35% of the target's armor */
  pierce?: boolean;
  /** heals the attacker for 25% of damage dealt */
  drain?: boolean;
  name: string;
  kind: WeaponKind;
  power: number;
  rangeMin: number;
  rangeMax: number;
  enCost: number;
  ammo: number | null; // null = unlimited (EN-only weapon)
  hitMod: number; // percentage points
  /** bonus crit chance (percentage points) — melee blades & lances run hot */
  critMod?: number;
  postMove: boolean; // usable after moving (P weapons)
  animSeed: number; // slight visual variation
  /** SRW kiai: minimum will required to fire this weapon */
  willReq?: number;
  /** MAP weapon: radius in tiles around the aimed tile; hits every unit in the blast (no counters) */
  mapRange?: number;
  /** combination attack: requires this partner unit adjacent & unacted; both consume their turn */
  comboPartner?: string;
  /** status inflicted on a hit: burn (HP loss/turn), stun (skip next action), break (armor -30%) */
  status?: 'burn' | 'stun' | 'break';
  /** ALL weapon: fires on every enemy inside range at once — no counters (SRW ALL attack) */
  all?: boolean;
}

export interface StatusFx {
  id: 'burn' | 'stun' | 'break';
  turns: number; // remaining phase transitions it lasts through
}

export type SpiritId = 'focus' | 'strike' | 'valor' | 'grit' | 'accel' | 'guard' | 'flash' | 'snipe' | 'zeal' | 'rouse' | 'disrupt' | 'bless' | 'vigor' | 'roar' | 'fortune' | 'soul' | 'trust';

export interface SpiritDef {
  id: SpiritId;
  name: string;
  cost: number;
  desc: string;
}

/** Unique pilot passive — see TRAITS in data.ts for name/description. */
export type TraitId = 'ace_instinct' | 'deadeye' | 'siege_breaker' | 'field_medic' | 'crimson_fury' | 'falcon_wing' | 'sovereign' | 'rally';

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
  /** pilot trait (passive) — resolved inside the combat engine */
  trait?: TraitId;
  /** spoken when this pilot's unit is destroyed (bosses) */
  lastWords?: string;
  /** taunt spoken when this pilot destroys a player unit (bosses/aces) */
  killQuip?: string;
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
  /** support frame: can REPAIR an adjacent ally (heal HP/EN) instead of attacking */
  repairer?: boolean;
  /** supply frame: can RESUPPLY an ally within 3 tiles (EN + ammo, no heal) */
  supplier?: boolean;
  /** damage-type resistance — fraction reduced per weapon kind (0.4 = -40% beam) */
  resists?: Partial<Record<WeaponKind, number>>;
  /** loot carrier: flees east each enemy phase; kill it before it leaves the map */
  carrier?: boolean;
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
  /** ace mastery — career kills >= 50: permanent +5% hit/dmg/+5 evade */
  aceMastery?: boolean;
  /** spirits unlocked via career-kill milestones — merged with pilot.spirits in menus */
  bonusSpirits?: SpiritId[];
  /** boss one-time spirit cast flag (Grit at <50% HP) */
  bossBuffed?: boolean;
  /** boss phase-2: triggers at <50% HP — permanent armor/dmg buff for the rest of the fight */
  phase2?: boolean;
  /** Fortune spirit: next attack grants double EXP */
  fortuneForNextAttack?: boolean;
  /** Soul spirit: next attack deals 2x damage */
  soulForNextAttack?: boolean;
  /** elite enemy: tougher stats, more EXP/credits on kill */
  elite?: boolean;
  /** NPC ally (side 'player') — uncontrollable, must be protected on protect missions */
  npc?: boolean;
  /** the protect objective itself — mission is lost if it dies */
  escort?: boolean;
  /** npc ally that fights back during the enemy phase */
  armed?: boolean;
  /** active debuffs (burn/stun/break) — ticked at the start of the unit's own phase */
  statuses?: StatusFx[];
  /** evasion decay — dodges this phase; each further dodge attempt is 8% harder */
  dodges?: number;
  /** afterburner part: may attack once more after destroying a target, once per turn */
  followUpReady?: boolean;
  /** total damage dealt this mission (for the debrief MVP) */
  dmgDealt?: number;
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
  /** afterburner: unit may attack again after a kill, once per turn */
  again?: boolean;
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
  enemySpawns: { defId: string; pos: Pos; elite?: boolean }[];
  /** NPC ally units that spawn fixed on the map (protect objectives) */
  allySpawns?: { defId: string; pos: Pos; armed?: boolean; escort?: boolean }[];
  /** hidden salvage crates: a player unit moving onto the tile claims the item */
  crates?: { pos: Pos; itemId: string }[];
  /** minefields: entering the tile detonates it — 15% maxHP loss, never lethal */
  mines?: Pos[];
  objective: string;
  /** boss units hold position (can still attack in place) until this turn number. */
  bossHoldUntil?: number;
  /** enemy reinforcement wave: at the start of player turn `turn`, `comp` units spawn on the enemy edge */
  reinforce?: { turn: number; comp: string[] };
  /** mid-battle story beats: dialog plays at the start of player turn `turn` */
  events?: { turn: number; lines: { speaker: string; text: string; voice?: string }[] }[];
  /** seize missions: the beacon tile a player unit must reach to win */
  beaconPos?: Pos;
  /** reach missions: the extraction tile — a player unit landing here wins */
  reachPos?: Pos;
  /** ion-storm volleys: every N turns, `count` telegraphed strike tiles detonate next turn */
  hazards?: { every: number; count: number };
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
  | 'route'
  | 'victory'
  | 'defeat';

export type BattleMode = 'full' | 'short' | 'off';

export interface GameSettings {
  battleMode: BattleMode;
  animSpeed: 1 | 2;
  sound: boolean;
  music: boolean;
  difficulty?: 'normal' | 'hard';
}

export type ObjectiveType = 'rout' | 'survive' | 'boss' | 'protect' | 'seize' | 'reach';

export type Reaction = 'counter' | 'defend' | 'evade' | 'cover';

export interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  destroyed: boolean;
  hitChance: number;
  /** a near-miss that grazes the target for reduced damage */
  graze?: boolean;
  // counter-attack performed by defender, if any
  counter: CounterResult | null;
  // the defender's chosen reaction (none for MAP weapons)
  reaction?: Reaction;
  // extra units hit when the weapon is a MAP weapon (primary target is `defender`)
  splash?: { uid: string; name: string; hit: boolean; damage: number; destroyed: boolean; hitChance: number }[];
  // SRW support attack — an adjacent ally chips in after the main strike (55% dmg, no counter)
  support?: { name: string; hit: boolean; damage: number; destroyed: boolean; hitChance: number };
  // pincer: a friendly unit mirrored across the target boosted this attack +10%
  pincer?: boolean;
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
  graze?: boolean;
}

export interface BattleData {
  attackerUid: string;
  defenderUid: string;
  weapon: WeaponDef;
  result: AttackResult;
}
