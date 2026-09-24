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

export type SpiritId = 'focus' | 'strike' | 'valor' | 'grit' | 'accel' | 'guard' | 'flash' | 'snipe' | 'zeal' | 'rouse' | 'disrupt' | 'bless' | 'vigor' | 'roar' | 'fortune' | 'soul' | 'trust' | 'miracle' | 'lucky' | 'vanish' | 'overdrive' | 'mercy' | 'purge' | 'resolve' | 'sunder' | 'provoke' | 'cheer' | 'wish' | 'gravity' | 'guts' | 'expose' | 'decoy' | 'hymn' | 'emp' | 'phalanx' | 'deadshot' | 'frenzy' | 'breach' | 'relentless' | 'reboot' | 'sanctuary' | 'awaken' | 'charity' | 'siphon' | 'intimidate' | 'scan' | 'empower' | 'marksman' | 'ward' | 'warsong' | 'execute' | 'shatter' | 'glacial' | 'relay' | 'soulburn' | 'fluster' | 'hunt' | 'tracer' | 'strafe' | 'inspire' | 'pyre' | 'overrun' | 'exert' | 'veil' | 'cantata' | 'warhorn' | 'skyfall' | 'avenger' | 'reaper' | 'stalker' | 'interfere' | 'safeguard' | 'blade' | 'suppress' | 'carnage' | 'trueshot' | 'dischord' | 'absolution' | 'judge' | 'banner' | 'gorelust' | 'armorrot' | 'winterverse' | 'litany' | 'rampage' | 'drawfire' | 'hemorrhage' | 'lockcascade' | 'wardmist' | 'aegis' | 'voidedge' | 'standfirm' | 'plunderedge' | 'firelink' | 'dreadverse' | 'sanctumhymn' | 'tempestedge' | 'ironoath' | 'lacerate' | 'staticchoir' | 'dirgemist' | 'miraclechorus' | 'hellfire' | 'bulwarkaria' | 'thrillkill' | 'pinverse' | 'tideverse' | 'gracehymn' | 'sunderstorm' | 'mirrorwall' | 'ravenous' | 'breachverse' | 'tideebb' | 'renewalverse' | 'quakeedge' | 'valiantverse' | 'rageverse' | 'exposeverse' | 'darkverse' | 'foresightverse' | 'heavensverse' | 'bastionverse' | 'furyverse' | 'tracerverse' | 'sirenverse' | 'clarionverse' | 'levinedge' | 'rampartverse' | 'ravageverse' | 'ghostverse' | 'curseverse' | 'vigorverse' | 'savageedge' | 'phantomverse' | 'crimsonverse' | 'scopeverse' | 'doomverse' | 'flowverse' | 'truthedge' | 'oathverse' | 'goreverse' | 'mirageverse' | 'hexverse' | 'triumphverse' | 'novaedge' | 'fortressverse' | 'culledge' | 'bindverse' | 'blightverse' | 'vigilverse' | 'mortaledge' | 'sentinelverse' | 'rendedge' | 'siphonverse' | 'terrorverse' | 'salvoverse' | 'snaredge' | 'shelterverse' | 'overedge' | 'cleanseverse' | 'mireverse' | 'choirverse' | 'arcedge' | 'juggernautverse' | 'splatteredge' | 'voidverse' | 'ruinverse' | 'anthemverse' | 'doomedge' | 'defianceverse' | 'havocverse' | 'swiftverse' | 'shroudverse' | 'wardverse' | 'flareedge' | 'mendverse' | 'maimedge' | 'repulseverse' | 'silenceverse' | 'magnumverse' | 'breaedge' | 'palisadeverse' | 'hollowedge' | 'fearverse' | 'veilbreakverse' | 'requiemverse' | 'cinderedge' | 'steadfastverse' | 'maraudedge' | 'nullverse' | 'tetherverse' | 'seraphverse';

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
  /** kamikaze drone — beelines the nearest player and detonates its core */
  kamikaze?: boolean;
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
  veilUntilEndOfEnemyPhase?: boolean;
  counterBuffUntilEndOfEnemyPhase?: boolean;
  counterSealUntilEndOfEnemyPhase?: boolean;
  phantomUntilEndOfEnemyPhase?: boolean;
  crimsonUntilEndOfEnemyPhase?: boolean;
  scopeUntilEndOfEnemyPhase?: boolean;
  goreUntilEndOfEnemyPhase?: boolean;
  mirageUntilEndOfEnemyPhase?: boolean;
  triumphUntilEndOfEnemyPhase?: boolean;
  fortressUntilEndOfEnemyPhase?: boolean;
  vigilUntilEndOfEnemyPhase?: boolean;
  sentinelUntilEndOfEnemyPhase?: boolean;
  siphonUntilEndOfEnemyPhase?: boolean;
  salvoUntilEndOfEnemyPhase?: boolean;
  shelterUntilEndOfEnemyPhase?: boolean;
  juggernautUntilEndOfEnemyPhase?: boolean;
  defianceUntilEndOfEnemyPhase?: boolean;
  havocUntilEndOfEnemyPhase?: boolean;
  swiftUntilEndOfEnemyPhase?: boolean;
  shroudUntilEndOfEnemyPhase?: boolean;
  doomTurns?: number;
  guardAuraUntilEndOfEnemyPhase?: boolean;
  suppressDmgUntilEndOfEnemyPhase?: boolean;
  dischordUntilEndOfEnemyPhase?: boolean;
  absolveUntilEndOfEnemyPhase?: boolean;
  bannerUntilEndOfEnemyPhase?: boolean;
  drawfireUntilEndOfEnemyPhase?: boolean;
  statusproofUntilEndOfEnemyPhase?: boolean;
  aegisUntilEndOfEnemyPhase?: boolean;
  standFirmUntilEndOfEnemyPhase?: boolean;
  firelinkUntilEndOfEnemyPhase?: boolean;
  dreadedUntilEndOfEnemyPhase?: boolean;
  sanctumUntilEndOfEnemyPhase?: boolean;
  oathUntilEndOfEnemyPhase?: boolean;
  dirgeHealUntilEndOfEnemyPhase?: boolean;
  chorusUntilEndOfEnemyPhase?: boolean;
  anchoredUntilEndOfEnemyPhase?: boolean;
  pinverseUntilEndOfEnemyPhase?: boolean;
  tideUntilEndOfEnemyPhase?: boolean;
  graceTurns?: number;
  mirrorwallUntilEndOfEnemyPhase?: boolean;
  ravenousNext?: boolean;
  breachAtkUntilEndOfEnemyPhase?: boolean;
  ebbUntilEndOfEnemyPhase?: boolean;
  renewalTurns?: number;
  foresightTurns?: number;
  sirenTurns?: number;
  clarionTurns?: number;
  bastionTurns?: number;
  mendTurns?: number;
  obscuredTurns?: number;
  repulseUntilEndOfEnemyPhase?: boolean;
  palisadeUntilEndOfEnemyPhase?: boolean;
  requiemUntilEndOfEnemyPhase?: boolean;
  steadfastUntilEndOfEnemyPhase?: boolean;
  nullifiedUntilEndOfEnemyPhase?: boolean;
  tetherUntilEndOfEnemyPhase?: boolean;
  seraphUntilEndOfEnemyPhase?: boolean;
  quakeedgeNext?: boolean;
  valiantUntilEndOfEnemyPhase?: boolean;
  rageverseNext?: boolean;
  heavensverseNext?: boolean;
  furyverseNext?: boolean;
  levinedgeNext?: boolean;
  savageNext?: boolean;
  truthedgeNext?: boolean;
  novaNext?: boolean;
  cullNext?: boolean;
  mortalNext?: boolean;
  rendNext?: boolean;
  snareNext?: boolean;
  overNext?: boolean;
  arcNext?: boolean;
  splatterNext?: boolean;
  doomNext?: boolean;
  flareNext?: boolean;
  maimNext?: boolean;
  breachNext?: boolean;
  hollowNext?: boolean;
  /** armor permanently compromised — +10% damage taken for the rest of the battle */
  rended?: boolean;
  ravageNext?: boolean;
  ghostNext?: boolean;
  tracerAllyUntilEndOfEnemyPhase?: boolean;
  rampartUntilEndOfEnemyPhase?: boolean;
  cursedUntilEndOfEnemyPhase?: boolean;
  weakenUntilEndOfEnemyPhase?: boolean;
  silencedUntilEndOfEnemyPhase?: boolean;
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
  empowerForNextAttack?: boolean;
  marksmanUntilEndOfEnemyPhase?: boolean;
  wardenArmed?: boolean;
  warsongUntilEndOfEnemyPhase?: boolean;
  executeNext?: boolean;
  shatterNext?: boolean;
  glacialNext?: boolean;
  soulburnNext?: boolean;
  flusterNext?: boolean;
  huntNext?: boolean;
  tracerNext?: boolean;
  strafeNext?: boolean;
  pyreNext?: boolean;
  cinderNext?: boolean;
  maraudNext?: boolean;
  overrunNext?: boolean;
  exertNext?: boolean;
  skyfallNext?: boolean;
  avengerNext?: boolean;
  reaperNext?: boolean;
  stalkNext?: boolean;
  bladeNext?: boolean;
  carnageNext?: boolean;
  trueShotNext?: boolean;
  judgeNext?: boolean;
  goreNext?: boolean;
  rampageNext?: boolean;
  hemoNext?: boolean;
  voidedgeNext?: boolean;
  plunderNext?: boolean;
  knockNext?: boolean;
  lacerateNext?: boolean;
  hellfireNext?: boolean;
  sunderstormNext?: boolean;
  thrillNext?: boolean;
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
  /** attacks committed this battle — vanguard gate */
  attacksMade?: number;
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
  /** charge stance — the next attack lands at 1.5x damage with +15 crit; consumed on the attack */
  charged?: boolean;
  aimed?: boolean;
  /** desperation fury — a cornered boss at <20% HP gains +15% damage and +10 crit */
  enraged?: boolean;
  /** has launched an attack this battle — gates the Initiative opening strike */
  hasAttacked?: boolean;
  /** ablative plating already spent this battle */
  ablativeUsed?: boolean;
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

export type PilotSkillId = 'hit' | 'evade' | 'dmg' | 'def' | 'countercut' | 'esave' | 'hitrun' | 'crit' | 'scavenger' | 'regen' | 'riposte' | 'lastStand' | 'assassin' | 'brawler' | 'initiative' | 'gunner' | 'plunderer' | 'bodyguard' | 'opportunist' | 'warcry' | 'pointBlank' | 'bloodlust' | 'reaver' | 'bulwark' | 'duelist' | 'juggernaut' | 'giantSlayer' | 'loneWolf' | 'overwhelm' | 'outgunned' | 'tankbuster' | 'coordinator' | 'sentinel' | 'gambit' | 'warcaster' | 'underdog' | 'skirmisher' | 'engineer' | 'cohort' | 'entrench' | 'steadfast' | 'precision' | 'surge' | 'reflex' | 'outflank' | 'foeswarm' | 'cannonade' | 'gunsmith' | 'luminance' | 'swarmer' | 'phantomstep' | 'parry' | 'piercer' | 'heavycal' | 'anchor' | 'dreadnought' | 'resolute' | 'siegeadept' | 'cadence' | 'wingman' | 'fullmag' | 'dirgesong' | 'burnout' | 'divebomb' | 'arsenalmind' | 'titanbreaker' | 'truesight' | 'backliner' | 'bombard' | 'ruinbreaker' | 'artillerist' | 'paintburst' | 'fortsoul' | 'hexsurge' | 'coldsteel' | 'capacitor' | 'ironbound' | 'coolloop' | 'gritguard' | 'savant' | 'shieldpierce' | 'pureshot' | 'finisher' | 'aerobat' | 'sureshot' | 'wildfire' | 'archer' | 'stormeye' | 'acehunter' | 'ravager' | 'sledge' | 'overkill' | 'pike' | 'wildswing' | 'zenith' | 'closecombat' | 'chainblade' | 'exploiter' | 'viper' | 'disruptor' | 'myrmidon' | 'sunderfist' | 'bloodborne' | 'harvester' | 'gridshock' | 'shockjock' | 'biggame' | 'razor' | 'retribution' | 'bloodhound' | 'headhunter' | 'soulcut' | 'wardancer' | 'butcher' | 'punisher' | 'wrathborn' | 'tracker' | 'carver' | 'highvolt' | 'ironwill' | 'vigilant' | 'bloodfrenzy' | 'spectral' | 'hexblade' | 'graceful' | 'flakmaster' | 'shepherd' | 'madmen' | 'predator' | 'wither' | 'grandstand' | 'vanguard' | 'phalanx' | 'polymath' | 'isolator' | 'scourge' | 'bloodtrance' | 'snipersoul' | 'aegisshield' | 'stunlock' | 'polluter' | 'finale' | 'sunderborn' | 'landslide' | 'sapper' | 'flanker' | 'tormentor' | 'godsbreaker' | 'momentum' | 'vitals' | 'highhand' | 'saboteur' | 'barrierbane' | 'huntsman' | 'guardbreaker' | 'opening' | 'remembrance' | 'scrapper' | 'ballisteur' | 'awestruck' | 'lifeline' | 'lowburn' | 'bigbang' | 'irongroove' | 'ashstalker' | 'dominant' | 'crossfire' | 'reaping' | 'luminarch' | 'breakdancer' | 'hailborn';
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
  enSaver?: number;
  antiAir?: number;
  ammoDmg?: number;
  bossDmg?: number;
  counterDmg?: number;
  range?: number;
  coFire?: number;
  auraHeal?: number;
  knockProof?: boolean;
  enDmg?: number;
  knockPlus?: boolean;
  beamDmg?: number;
  funnelDmg?: number;
  missileDmg?: number;
  gunDmg?: number;
  ammoRegen?: boolean;
  markDmg?: number;
  spRegen?: number;
  lowHpDmg?: number;
  aimBoost?: number;
  shieldBreak?: number;
  pinDmg?: number;
  jamProof?: boolean;
  statusBurn?: boolean;
  statusBreak?: boolean;
  statusMark?: boolean;
  statusStun?: boolean;
  beamGuard?: boolean;
  meleeGuard?: boolean;
  missileGuard?: boolean;
  regenPlate?: boolean;
  drainCoil?: boolean;
  gunGuard?: boolean;
  funnelGuard?: boolean;
  counterRange?: boolean;
  mapGuard?: boolean;
  killDmg?: boolean;
  lowHpArmor?: boolean;
  chargeBoost?: boolean;
  terrainArmor?: boolean;
  mapDmg?: boolean;
  jammerSkin?: boolean;
  lowHpRegen?: boolean;
  sniperGuard?: boolean;
  terraProof?: boolean;
  defuseKit?: boolean;
  fortArmor?: boolean;
  willOnKill?: number | boolean;
  supportDmg?: boolean;
  spOnHurt?: boolean;
  rageEn?: boolean;
  auraDmg?: number;
  critGuard?: boolean;
  enOnKill?: boolean;
  lastAmmo?: boolean;
  spSaver?: boolean;
  ammoScalp?: boolean;
  clusterAmp?: boolean;
  thrallWeave?: boolean;
  longsight?: boolean;
  surveyRig?: boolean;
  pointMauler?: boolean;
  omenScope?: boolean;
  eagleEye?: boolean;
  haloScope?: boolean;
  apexRig?: boolean;
  reactorShield?: boolean;
  foilWeave?: boolean;
  cloakWeave?: boolean;
  skyBooster?: boolean;
  ventEn?: number;
  ventArmor?: boolean;
  ramPlate?: number;
  pulseVernier?: number;
  landVernier?: number;
  lastStandCore?: boolean;
  siegePlate?: boolean;
  shockCoil?: boolean;
  blazeCoil?: boolean;
  rageCoil?: boolean;
  stunGuard?: boolean;
  blazePlate?: boolean;
  frostPlate?: boolean;
  voidPlate?: boolean;
  witchPlate?: boolean;
  oVentArmor?: boolean;
  orbShield?: number;
  dancerWeave?: number;
  gloomCoil?: boolean;
  /** command aura: allies within 2 tiles gain this much hit */
  auraHit?: number;
  /** sacrificial skin — the first fatal hit each battle leaves the frame at 1 HP */
  ablative?: boolean;
  /** cryo rounds — hits may chill the target: 30% chance of SLOW */
  statusSlow?: boolean;
  /** firewall suite — immune to enemy status effects */
  statusProof?: boolean;
  /** ignition coil — start each battle with extra Will */
  willStart?: number | boolean;
  accBoost?: number;
  rangeDmg?: number;
  armorShred?: number;
  /** reactive armor — reflects this % of hit damage back at the attacker */
  reflect?: number;
  /** relay matrix — same-side units within 2 tiles recover +6 EN/turn */
  auraEn?: boolean;
  /** melee weapon damage bonus % */
  meleeDmg?: number;
  /** chaff dispenser — attackers suffer -this hit chance vs the holder */
  chaff?: number;
  /** decoy beacon — broadcast signature; enemies prefer this target */
  aggro?: boolean;
  /** cloaking field — enemies cannot target this unit beyond 3 tiles */
  stealthField?: boolean;
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
  /** ablative plating — the frame's sacrificial skin ate a fatal hit */
  ablative?: boolean;
  /** Counter-Cut pilot skill — the defender's counter struck first; a kill pre-empts the incoming hit entirely */
  counterCut?: boolean;
  /** a guardian frame intercepted — the boss this blow was meant for */
  guarded?: string;
  /** uid of the unit that actually took the hit (guardian redirect) */
  struckUid?: string;
  /** this blow crippled the defender's frame (move -2) */
  crippled?: boolean;
  /** Execution spirit — the strike finished a wounded grunt outright */
  execute?: boolean;
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
