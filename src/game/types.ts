export type Pos = { x: number; y: number };

export type Terrain = 'plain' | 'forest' | 'mountain' | 'water' | 'city' | 'road' | 'base' | 'void' | 'moon' | 'desert' | 'snow' | 'lava' | 'ruins';

export type Side = 'player' | 'enemy';

export type WeaponKind = 'melee' | 'beam' | 'missile' | 'gun' | 'funnel';

export interface WeaponDef {
  id: string;
  /** ignores 35% of the target's armor */
  pierce?: boolean;
  /** +15% damage when fired from 4+ tiles away */
  sniper?: boolean;
  /** anti-air — +25% damage vs airborne units */
  antiAir?: boolean;
  /** heals the attacker for 25% of damage dealt */
  drain?: boolean;
  /** breaker — a landed hit sunders the target's armor for the rest of the battle */
  breaker?: boolean;
  /** ace-unlock — stays sealed until the pilot scores this many kills THIS battle */
  aceReq?: number;
  /** multi-hit: this many independent strikes per trigger */
  multiHit?: number;
  /** chain arc: on hit, bolt arcs to this many extra foes within 2 tiles of the target (50% dmg) */
  chain?: number;
  /** bash — a landed hit hurls the survivor one tile away from the attacker */
  knockback?: boolean;
  /** soul reaver — a landed hit tears 5 Will from the pilot */
  willDrain?: boolean;
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
  status?: 'burn' | 'stun' | 'break' | 'slow' | 'mark' | 'supp';
  /** ALL weapon: fires on every enemy inside range at once — no counters (SRW ALL attack) */
  all?: boolean;
}

export interface StatusFx {
  id: 'burn' | 'stun' | 'break' | 'slow' | 'mark' | 'supp';
  turns: number; // remaining phase transitions it lasts through
}

export type SpiritId = 'focus' | 'strike' | 'valor' | 'grit' | 'accel' | 'guard' | 'flash' | 'snipe' | 'zeal' | 'rouse' | 'disrupt' | 'bless' | 'vigor' | 'roar' | 'fortune' | 'soul' | 'trust' | 'miracle' | 'lucky' | 'vanish' | 'overdrive' | 'mercy' | 'purge' | 'resolve' | 'sunder' | 'provoke' | 'cheer' | 'wish' | 'gravity' | 'guts' | 'expose' | 'decoy' | 'hymn' | 'emp' | 'phalanx' | 'deadshot' | 'frenzy' | 'breach' | 'relentless' | 'reboot' | 'sanctuary' | 'awaken';

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
  /** bodyguard frame — intercepts strikes aimed at an adjacent boss (within 2 tiles) */
  guardian?: boolean;
  /** ECM suite — hostile units within 2 tiles take -15 hit */
  jammer?: boolean;
  /** stealth frame — invisible on the field until a hostile closes within 3 tiles */
  stealth?: boolean;
  /** transformable frame — swaps into this def via the TRANSFORM action */
  transformInto?: string;
  level?: number; // starting level (default 1)
  /** support frame: can REPAIR an adjacent ally (heal HP/EN) instead of attacking */
  repairer?: boolean;
  /** supply frame: can RESUPPLY an ally within 3 tiles (EN + ammo, no heal) */
  supplier?: boolean;
  /** damage-type resistance — fraction reduced per weapon kind (0.4 = -40% beam) */
  barrier?: number;
  resists?: Partial<Record<WeaponKind, number>>;
  /** loot carrier: flees east each enemy phase; kill it before it leaves the map */
  carrier?: boolean;
  /** field medic — restores the most wounded ally within 3 tiles at its activation instead of attacking */
  medic?: boolean;
  /** siege anchor — never moves; holds its ground and attacks in place */
  holdPos?: boolean;
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
  /** Hymn — squad anthem: +15 hit & +15 evade until end of enemy phase */
  hymnUntilEndOfEnemyPhase?: boolean;
  /** Deadshot — the next attack is a guaranteed critical */
  deadshotForNextAttack?: boolean;
  /** Frenzy — weapons cost no EN for the rest of this turn */
  frenzyThisTurn?: boolean;
  /** Breach — next attack ignores enemy armor */
  breachNextAttack?: boolean;
  /** Relentless — +25% damage to enemies below half HP until the enemy phase ends */
  relentlessUntilEndOfEnemyPhase?: boolean;
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
  /** crippling blow taken — move -2 for the rest of the battle */
  crippled?: boolean;
  /** Gravity Well — frame is anchored and cannot move next enemy phase */
  anchored?: boolean;
  /** overwatch stance: fires on the first hostile that enters range during the enemy phase */
  overwatch?: boolean;
  /** Guts — next attack deals +75% damage while under half HP */
  gutsForNextAttack?: boolean;
  /** Exposed — painted by targeting data: next hit lands +20 hit and +25% damage */
  exposed?: boolean;
  /** pilot wounded in a previous sortie — -15% hit & damage this battle */
  wounded?: boolean;
  /** breacher field victim — armor & evade permanently reduced this battle */
  sundered?: boolean;
  /** provoked — this enemy is drawn to attack the provoking unit next enemy phase */
  provokedTo?: string;
  /** transformable frame — the alternate def this unit can swap into */
  /** hardlight decoy — disappears at the start of the given player turn */
  decoyUntil?: number;
  altDef?: UnitDef;
  /** original def id when transformable — tracks which form is active */
  baseDefId?: string;
  /** Miracle spirit armed — survive the next fatal hit with 10 HP */
  miracleArmed?: boolean;
  /** Vanish spirit — enemies cannot target this unit until the flag clears */
  vanishUntilEndOfEnemyPhase?: boolean;
  /** Lucky spirit — the next kill yields a guaranteed drop and bonus salvage */
  luckyForNextKill?: boolean;
  /** Overdrive spirit — act again after landing a kill (consumed) */
  againOnKill?: boolean;
  /** Mercy spirit — pull a lethal hit, leave the foe at 10 HP (consumed) */
  mercyArmed?: boolean;
  /** overkill damage this unit took on its deathblow — feeds salvage bonus */
  overkillDealt?: number;
}

export type PilotSkillId = 'hit' | 'evade' | 'dmg' | 'def' | 'countercut' | 'esave' | 'hitrun' | 'crit' | 'scavenger' | 'regen' | 'riposte';
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
  crit?: number; // +% critical chance
  enRegen?: number; // +EN regenerated each turn
  hpRegen?: number; // +% max HP regenerated each turn
  xp?: number; // +% EXP gained // +EN regenerated at the start of own phase
  /** % reduction to incoming damage (Aegis barrier) */
  dmgTaken?: number;
  /** magazine extension — +% ammo capacity on ammo-limited weapons */
  ammoPct?: number;
  /** command aura: allies within 2 tiles gain this much hit */
  auraHit?: number;
  unique?: boolean; // not sold — awarded by story
  /** afterburner: unit may attack again after a kill, once per turn */
  again?: boolean;
  /** i-field: incoming damage below this threshold is cut to 20% */
  barrier?: number;
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
  /** allied reinforcement wave: at the start of player turn `turn`, NPC units spawn on the player edge (west) */
  allyReinforce?: { turn: number; comp: { defId: string; armed?: boolean }[] };
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
  difficulty?: 'normal' | 'hard' | 'extreme';
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
  /** Miracle spirit — the defender refused a fatal hit (10 HP left) */
  miracle?: boolean;
  /** Mercy spirit — attacker pulled the killing blow (defender at 10 HP) */
  mercy?: boolean;
  /** Counter-Cut pilot skill — the defender's counter struck first; a kill pre-empts the incoming hit entirely */
  counterCut?: boolean;
  /** a guardian frame intercepted — the boss this blow was meant for */
  guarded?: string;
  /** uid of the unit that actually took the hit (guardian redirect) */
  struckUid?: string;
  /** this blow crippled the defender's frame (move -2) */
  crippled?: boolean;
  /** damage beyond what the finishing blow needed */
  overkill?: number;
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
  /** Miracle spirit — survived this would-be fatal hit with 10 HP */
  miracle?: boolean;
  /** this blow crippled the attacker's frame (move -2) */
  crippled?: boolean;
  /** damage beyond what the finishing blow needed */
  overkill?: number;
}

export interface BattleData {
  attackerUid: string;
  defenderUid: string;
  weapon: WeaponDef;
  result: AttackResult;
}
