import chaptersJson from './chapters.json';
import { PILOTS, UNITS, WEAPONS, TERRAIN_INFO, MISSION_SSS } from './data';
import { MapDef, PartDef, PilotDef, PilotSkillId, Pos, SpiritId, Terrain, UnitDef } from './types';

// ---------- Items (usable in battle, bought at merchant) ----------

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  apply: 'hp' | 'en' | 'ammo' | 'sp' | 'valor' | 'willAll' | 'healArea' | 'purge' | 'barrage' | 'will' | 'mine' | 'smoke' | 'hymnAll';
  amount: number;
}

export const ITEMS: Record<string, ItemDef> = {
  repairKit: { id: 'repairKit', name: 'Repair Kit', desc: 'Restore 3000 HP', price: 400, apply: 'hp', amount: 3000 },
  megaKit: { id: 'megaKit', name: 'Mega Repair Kit', desc: 'Restore full HP', price: 900, apply: 'hp', amount: 99999 },
  enCell: { id: 'enCell', name: 'EN Cell', desc: 'Restore 80 EN', price: 350, apply: 'en', amount: 80 },
  ammoBox: { id: 'ammoBox', name: 'Ammo Box', desc: 'Refill all weapon ammo', price: 300, apply: 'ammo', amount: 0 },
  spiritWing: { id: 'spiritWing', name: 'Spirit Wing', desc: 'Restore 40 SP', price: 500, apply: 'sp', amount: 40 },
  valorPill: { id: 'valorPill', name: 'Valor Pill', desc: 'Next attack damage x1.5', price: 600, apply: 'valor', amount: 0 },
  rallyBanner: { id: 'rallyBanner', name: 'Rally Banner', desc: '+10 Will to every ally', price: 900, apply: 'willAll', amount: 10 },
  repairDrone: { id: 'repairDrone', name: 'Repair Drone', desc: 'Heal 30% HP — unit + allies within 2 tiles', price: 750, apply: 'healArea', amount: 30 },
  warDrums: { id: 'warDrums', name: 'War Drums', desc: 'Squad anthem — every ally +15 hit & +15 evade until end of enemy phase', price: 850, apply: 'hymnAll', amount: 15 },
  overclock: { id: 'overclock', name: 'Core Overclock', desc: '+15 Will to this unit', price: 550, apply: 'will', amount: 15 },
  lmCharge: { id: 'lmCharge', name: 'LM-Charge', desc: 'Plant a mine on a clear tile within 2 — heavy damage to anything that steps on it', price: 700, apply: 'mine', amount: 0 },
  ventKit: { id: 'ventKit', name: 'Emergency Vent', desc: 'Purge cripple and all status debuffs', price: 700, apply: 'purge', amount: 0 },
  smokeScreen: { id: 'smokeScreen', name: 'Smoke Screen', desc: 'Untargetable until the end of the enemy phase', price: 600, apply: 'smoke', amount: 0 },
  arkBarrage: { id: 'arkBarrage', name: 'Ark Barrage', desc: 'Call a shipboard strike — radius-2 blast on any tile within 2-8', price: 1200, apply: 'barrage', amount: 0 },
};

export type ItemId = keyof typeof ITEMS;

// ---------- Enhancement parts (workshop — equip up to MAX_PART_SLOTS per mecha) ----------

export const MAX_PART_SLOTS = 2;

export const PARTS: Record<string, PartDef> = {
  sparePlate: { id: 'sparePlate', name: 'Spare Plating', desc: '+800 max HP', price: 600, hp: 800 },
  servoArm: { id: 'servoArm', name: 'Servo Armor', desc: '+80 armor', price: 800, armor: 80 },
  vernier: { id: 'vernier', name: 'Vernier Thrusters', desc: '+8 mobility', price: 700, mobility: 8 },
  teslaDrive: { id: 'teslaDrive', name: 'Tesla Drive', desc: '+1 move range', price: 1500, move: 1 },
  aimScope: { id: 'aimScope', name: 'Targeting Scope', desc: '+8% hit chance', price: 900, hit: 8 },
  reflexChip: { id: 'reflexChip', name: 'Reflex Chip', desc: '+6% evade', price: 850, evade: 6 },
  overcharger: { id: 'overcharger', name: 'Overcharger', desc: '+8% weapon damage', price: 1200, dmg: 8 },
  batteryPack: { id: 'batteryPack', name: 'Battery Pack', desc: '+30 max EN', price: 550, en: 30 },
  afterburner: { id: 'afterburner', name: 'Afterburner Core', desc: 'attack again after destroying a target (once/turn)', price: 2400, again: true },
  veteranPlate: { id: 'veteranPlate', name: 'Veteran Plate', desc: '+120 armor · +6 mobility — S-rank award', price: 3000, armor: 120, mobility: 6 },
  titanFrame: { id: 'titanFrame', name: 'Titan Frame', desc: '+1500 max HP · −4 mobility', price: 2200, hp: 1500, mobility: -4 },
  gyroStab: { id: 'gyroStab', name: 'Gyro Stabilizer', desc: '+10% hit · +6% evade', price: 2600, hit: 10, evade: 6 },
  catalystCore: { id: 'catalystCore', name: 'Catalyst Core', desc: '+14% weapon damage', price: 3200, dmg: 14 },
  targetCPU: { id: 'targetCPU', name: 'Targeting CPU', desc: '+10% critical chance', price: 1100, crit: 10 },
  ventCore: { id: 'ventCore', name: 'Vent Core', desc: '+10 EN regenerated each turn', price: 950, enRegen: 10 },
  nanoWeave: { id: 'nanoWeave', name: 'Nano-Weave Frame', desc: '+8% max HP regenerated each turn', price: 1600, hpRegen: 8 },
  sensor: { id: 'sensor', name: 'Sensor Array', desc: 'Reveals stealth enemies within 5 tiles', price: 800 },
  salvageArm: { id: 'salvageArm', name: 'Salvage Arm', desc: '+25% salvage drop chance while any equipped frame stands (squad-wide)', price: 1200 },
  iField: { id: 'iField', name: 'I-Field Emitter', desc: 'Cuts incoming damage below 1400 to 20%', price: 3000, barrier: 1400 },
  commandRelay: { id: 'commandRelay', name: 'Command Relay', desc: 'Allies within 2 tiles gain +8% hit (squad aura)', price: 1400, auraHit: 8 },
  stealthField: { id: 'stealthField', name: 'Stealth Field', desc: 'Enemies cannot target this unit beyond 3 tiles', price: 2400, stealthField: true },
  deepMags: { id: 'deepMags', name: 'Deep Magazines', desc: '+50% ammunition capacity', price: 1600, ammoPct: 50 },
  ablative: { id: 'ablative', name: 'Ablative Plating', desc: 'Sacrificial skin — the first fatal hit each battle leaves the frame at 1 HP', price: 2200, ablative: true },
  cryoRounds: { id: 'cryoRounds', name: 'Cryo Rounds', desc: 'Hits have a 30% chance to SLOW the target', price: 1500, statusSlow: true },
  thrustVector: { id: 'thrustVector', name: 'Thrust Vector', desc: '+1 movement', price: 1800, move: 1 },
  firewall: { id: 'firewall', name: 'Firewall Suite', desc: 'Immune to enemy status effects', price: 2000, statusProof: true },
  decoyBeacon: { id: 'decoyBeacon', name: 'Decoy Beacon', desc: 'Enemies prefer targeting this unit — aggro magnet', price: 1600, aggro: true },
  ignitionCoil: { id: 'ignitionCoil', name: 'Ignition Coil', desc: '+10 Will at the start of each battle', price: 1400, willStart: true },
  reactiveArmor: { id: 'reactiveArmor', name: 'Reactive Armor', desc: 'Reflects 15% of hit damage back at the attacker', price: 1900, reflect: 15 },
  relayMatrix: { id: 'relayMatrix', name: 'Relay Matrix', desc: 'Allies within 2 tiles recover +6 EN/turn', price: 1800, auraEn: true },
  raptorClaw: { id: 'raptorClaw', name: 'Raptor Claw', desc: '+15% melee weapon damage', price: 1700, meleeDmg: 15 },
  chaffDispenser: { id: 'chaffDispenser', name: 'Chaff Dispenser', desc: 'Attackers suffer -10 hit chance against this unit', price: 1300, chaff: 10 },
  seekerHead: { id: 'seekerHead', name: 'Seeker Head', desc: '+8% hit chance · +6% critical chance', price: 1500, hit: 8, crit: 6 },
  combatComp: { id: 'combatComp', name: 'Combat Computer', desc: '+10% hit chance · +5% damage', price: 1600, hit: 10, dmg: 5 },
  fluxVent: { id: 'fluxVent', name: 'Plasma Vent', desc: 'Weapon EN cost −15%', price: 1800, enSaver: 15 },
  flakPods: { id: 'flakPods', name: 'Flak Pods', desc: 'All weapons gain anti-air: +25% dmg vs AIR frames', price: 1500, antiAir: 1 },
  ammoFeed: { id: 'ammoFeed', name: 'Ammo Feed', desc: 'Ammo-based weapons +15% damage', price: 1400, ammoDmg: 15 },
  siegeRounds: { id: 'siegeRounds', name: 'Siege Rounds', desc: '+15% damage vs boss & elite frames', price: 1600, bossDmg: 15 },
  counterweight: { id: 'counterweight', name: 'Counterweight Gyro', desc: '+20% counter-attack damage', price: 1500, counterDmg: 20 },
  telescopic: { id: 'telescopic', name: 'Telescopic Array', desc: '+1 max range for non-melee weapons', price: 1700, range: 1 },
  linkedFire: { id: 'linkedFire', name: 'Linked Fire Control', desc: 'Coordinated-fire allies contribute +8% more damage each', price: 1800, coFire: 8 },
  mendField: { id: 'mendField', name: 'Mend Field Emitter', desc: 'Adjacent allies regenerate +3% HP per turn', price: 1900, auraHeal: 3 },
  anchorPlate: { id: 'anchorPlate', name: 'Anchor Plating', desc: 'Frame cannot be knocked back', price: 1400, knockProof: true },
  energyCap: { id: 'energyCap', name: 'Energy Capacitor', desc: '+10% damage for EN weapons', price: 1600, enDmg: 10 },
  powerLoader: { id: 'powerLoader', name: 'Power Loader', desc: 'Knockback weapons hurl targets 1 extra tile', price: 1500, knockPlus: true },
  prismCoat: { id: 'prismCoat', name: 'Prism Coating', desc: '+10% damage for beam weapons', price: 1600, beamDmg: 10 },
  funnelAmp: { id: 'funnelAmp', name: 'Funnel Amplifier', desc: '+10% damage for funnel weapons', price: 1600, funnelDmg: 10 },
  missileBay: { id: 'missileBay', name: 'Missile Bay', desc: '+10% damage for missile weapons', price: 1600, missileDmg: 10 },
  gunBarrel: { id: 'gunBarrel', name: 'Gun Barrel', desc: '+10% damage for gun weapons', price: 1600, gunDmg: 10 },
  ammoSynth: { id: 'ammoSynth', name: 'Ammo Synthesizer', desc: 'Fabricate +1 ammo for every weapon each turn', price: 1500, ammoRegen: true },
  analysisCore: { id: 'analysisCore', name: 'Analysis Core', desc: '+12% damage against marked or exposed targets', price: 1700, markDmg: 12 },
  neuralLink: { id: 'neuralLink', name: 'Neural Link', desc: 'Pilot regenerates +2 SP every turn', price: 1600, spRegen: 2 },
  berserkCore: { id: 'berserkCore', name: 'Berserker Core', desc: '+8% damage while your hull is below 50% HP', price: 1800, lowHpDmg: 8 },
  aimEnhancer: { id: 'aimEnhancer', name: 'Aim Enhancer', desc: 'The AIM action grants +12 extra hit', price: 1300, aimBoost: 12 },
  breachCharge: { id: 'breachCharge', name: 'Breach Charge', desc: '+15% damage against barrier-protected frames', price: 1600, shieldBreak: 15 },
  pinBreaker: { id: 'pinBreaker', name: 'Pin Breaker', desc: '+12% damage against enemies pinned between two allies', price: 1700, pinDmg: 12 },
  eccmSuite: { id: 'eccmSuite', name: 'ECCM Suite', desc: 'Targeting suite immune to enemy ECM jammer fields', price: 1500, jamProof: true },
  incendiaryRounds: { id: 'incendiaryRounds', name: 'Incendiary Rounds', desc: 'Landed hits have a 25% chance to ignite the target (burn)', price: 1600, statusBurn: true },
  sunderRounds: { id: 'sunderRounds', name: 'Sunder Rounds', desc: 'Landed hits have a 20% chance to crack armor (break)', price: 1600, statusBreak: true },
  tracerRounds: { id: 'tracerRounds', name: 'Tracer Rounds', desc: 'Landed hits have a 30% chance to paint the target (mark)', price: 1500, statusMark: true },
  staticRounds: { id: 'staticRounds', name: 'Static Rounds', desc: 'Landed hits have a 15% chance to overload systems (stun)', price: 1900, statusStun: true },
  phaseCoat: { id: 'phaseCoat', name: 'Phase Coat', desc: 'Dispersive armor — incoming beam damage reduced by 25%', price: 1800, beamGuard: true },
  kineticWeave: { id: 'kineticWeave', name: 'Kinetic Weave', desc: 'Shock-dampening frame — incoming melee damage reduced by 25%', price: 1800, meleeGuard: true },
  flakCoat: { id: 'flakCoat', name: 'Flak Coat', desc: 'Ablative plating — incoming missile damage reduced by 25%', price: 1800, missileGuard: true },
  regenPlate: { id: 'regenPlate', name: 'Regen Plate', desc: 'Nanoweave armor — each landed hit regenerates 5% max HP', price: 2000, regenPlate: true },
  vampCoil: { id: 'vampCoil', name: 'Vampiric Coil', desc: 'Energy siphon — attacks restore 10% of damage dealt as HP', price: 1900, drainCoil: true },
  bulwarkShell: { id: 'bulwarkShell', name: 'Bulwark Shell', desc: 'Ballistic weave — incoming gun damage reduced by 25%', price: 1800, gunGuard: true },
  funnelLattice: { id: 'funnelLattice', name: 'Funnel Lattice', desc: 'Phase mesh — incoming funnel damage reduced by 25%', price: 1800, funnelGuard: true },
  retaliationRig: { id: 'retaliationRig', name: 'Retaliation Rig', desc: 'Long-arm mount — your counter-attacks reach 1 tile further', price: 1900, counterRange: true },
  blastDeflector: { id: 'blastDeflector', name: 'Blast Deflector', desc: 'Chaff weave — damage from MAP/area weapons reduced by 30%', price: 1700, mapGuard: true },
  warTrophyCore: { id: 'warTrophyCore', name: 'War Trophy Core', desc: 'Predator furnace — +3% damage per kill this battle (up to 15%)', price: 2000, killDmg: true },
  lastBastionPlate: { id: 'lastBastionPlate', name: 'Last Bastion Plate', desc: 'Reactive armor — +400 armor while hull is below 40%', price: 2100, lowHpArmor: true },
  overchargeCell: { id: 'overchargeCell', name: 'Overcharge Cell', desc: 'Volatile reactor — CHARGE grants an additional +15% damage', price: 1700, chargeBoost: true },
  groundPounder: { id: 'groundPounder', name: 'Ground Pounder', desc: 'Seismic array — your attacks ignore terrain armor bonuses', price: 1800, terrainArmor: true },
  warheadCache: { id: 'warheadCache', name: 'Warhead Cache', desc: 'Deep magazines — MAP/area weapons deal +15% damage', price: 1700, mapDmg: true },
  jammerSkin: { id: 'jammerSkin', name: 'Jammer Skin', desc: 'ECM coating — attackers that hit this frame have a 25% chance of a suppress glitch (-20 hit)', price: 1700, jammerSkin: true },
  survivalRig: { id: 'survivalRig', name: 'Survival Rig', desc: 'Emergency nanoloom — regenerates +8% hull per turn while below 40% HP', price: 1600, lowHpRegen: true },
  flakShield: { id: 'flakShield', name: 'Flak Shield', desc: 'Point-defense lattice — +400 armor against attacks from 5+ tiles away', price: 1700, sniperGuard: true },
  sealedHull: { id: 'sealedHull', name: 'Sealed Hull', desc: 'Hazard plating — immune to terrain damage (lava, void, corrosive fields)', price: 1400, terraProof: true },
  defuseKit: { id: 'defuseKit', name: 'Defuse Kit', desc: 'Mine sweeper rig — this frame steps through minefields without detonating them', price: 1500, defuseKit: true },
  bulwarkPlate: { id: 'bulwarkPlate', name: 'Bulwark Plate', desc: 'Terrain-locked armor — +400 armor while standing on defensive ground', price: 1500, fortArmor: true },
  soulLantern: { id: 'soulLantern', name: 'Soul Lantern', desc: 'Spirit-fed reactor — +5 Will for every kill this frame lands', price: 1600, willOnKill: true },
  linkageGear: { id: 'linkageGear', name: 'Linkage Gear', desc: 'Squad uplink — support-fire contribution raised to 70% damage', price: 1700, supportDmg: true },
  revengeFeed: { id: 'revengeFeed', name: 'Revenge Feed', desc: 'Vengeance loop — taking a hit feeds the pilot +4 SP', price: 1600, spOnHurt: true },
  lastReserve: { id: 'lastReserve', name: 'Last Reserve', desc: 'Emergency cells — weapon EN costs drop 40% while hull is below 50%', price: 1700, rageEn: true },
  warStandart: { id: 'warStandart', name: 'War Standart', desc: 'Offensive banner — allies within 2 tiles deal +8% damage', price: 2000, auraDmg: 8 },
  aegisHull: { id: 'aegisHull', name: 'Aegis Hull', desc: 'Blast curtain — this frame cannot suffer critical hits', price: 2000, critGuard: true },
  voltTap: { id: 'voltTap', name: 'Voltage Tap', desc: 'Kill reactor — each kill restores +15 EN', price: 1600, enOnKill: true },
  lastRounds: { id: 'lastRounds', name: 'Last Rounds', desc: 'Desperate load — ammo weapons deal +15% damage while at 2 ammo or less', price: 1600, lastAmmo: true },
  coreTap: { id: 'coreTap', name: 'Core Tap', desc: 'Pilot conduit — spirit costs reduced 10%', price: 1800, spSaver: true },
  boneCollector: { id: 'boneCollector', name: 'Bone Collector', desc: 'Scavenged clips — kills restock +1 ammo to the weapon used', price: 1700, ammoScalp: true },
  swarmAmp: { id: 'swarmAmp', name: 'Swarm Amp', desc: 'Cluster amplifier — +10% damage vs a foe with 2+ allies adjacent', price: 1600, clusterAmp: true },
  witchLoom: { id: 'witchLoom', name: 'Witch Loom', desc: 'Spirit weft — each kill grants +3 SP', price: 1600, thrallWeave: true },
  farSight: { id: 'farSight', name: 'Far Sight', desc: 'Long-range optics — +10% damage at range 5+', price: 1500, longsight: true },
  surveyRig: { id: 'surveyRig', name: 'Survey Rig', desc: 'Ambush optics — +12% damage vs targets that have not acted', price: 1500, surveyRig: true },
  pointMauler: { id: 'pointMauler', name: 'Point Mauler', desc: 'Close-quarters chamber — +15% damage at point-blank range', price: 1600, pointMauler: true },
  omenScope: { id: 'omenScope', name: 'Omen Scope', desc: 'Ω-reader — +15% damage vs bosses in phase two', price: 1800, omenScope: true },
  eagleEye: { id: 'eagleEye', name: 'Eagle Eye', desc: 'Recon optics — fog of war reveals +2 tiles further', price: 1500, eagleEye: true },
  haloScope: { id: 'haloScope', name: 'Halo Scope', desc: 'Ring reticle — +15 hit with weapons of range 6+', price: 1400, haloScope: true },
  apexRig: { id: 'apexRig', name: 'Apex Rig', desc: 'Resonant chamber — +10% damage for Will-requiring weapons', price: 1500, apexRig: true },
  reactorShield: { id: 'reactorShield', name: 'Reactor Shield', desc: 'Power sink — +400 armor while EN is above 50%', price: 1700, reactorShield: true },
  foilWeave: { id: 'foilWeave', name: 'Foil Weave', desc: 'Dune walker laminate — +10 evade on evasive terrain', price: 1500, foilWeave: true },
  cloakWeave: { id: 'cloakWeave', name: 'Cloak Weave', desc: 'Shroud laminate — +10 evade while hull is below 50%', price: 1600, cloakWeave: true },
  skyBooster: { id: 'skyBooster', name: 'Sky Booster', desc: 'Vernier array — airframes gain +1 movement', price: 1500, skyBooster: true },
  reactorVent: { id: 'reactorVent', name: 'Reactor Vent', desc: 'Overclocked core — +15 EN regen per turn but -100 armor', price: 1500, ventEn: 15, ventArmor: true },
  ramPlate: { id: 'ramPlate', name: 'Ram Plate', desc: 'Battering prow — +15% damage for knockback weapons', price: 1600, ramPlate: 15 },
  pulseVernier: { id: 'pulseVernier', name: 'Pulse Verniers', desc: 'Afterburner banks — +2 movement while EN is above 75%', price: 1700, pulseVernier: 2 },
  landVernier: { id: 'landVernier', name: 'Land Verniers', desc: 'Traction array — ground frames gain +1 movement', price: 1500, landVernier: 1 },
  lastStandCore: { id: 'lastStandCore', name: 'Last Stand Core', desc: 'Final bulwark — +500 armor while hull is below 25%', price: 1800, lastStandCore: true },
  siegePlate: { id: 'siegePlate', name: 'Siege Plate', desc: 'Anchored armor — +300 armor while this frame has not moved this turn', price: 1700, siegePlate: true },
  shockCoil: { id: 'shockCoil', name: 'Shock Coil', desc: 'Thornweb — melee attackers take 100 backlash damage', price: 1700, shockCoil: true },
  blazeCoil: { id: 'blazeCoil', name: 'Blaze Coil', desc: 'Incendiary lattice — attackers have a 25% chance to catch fire', price: 1800, blazeCoil: true },
  rageCoil: { id: 'rageCoil', name: 'Rage Coil', desc: 'Adrenal harness — each hit taken grants the pilot +5 Will', price: 1800, rageCoil: true },
  stunGuard: { id: 'stunGuard', name: 'Stun Guard', desc: 'Gyro anchor — this frame cannot be stunned', price: 1600, stunGuard: true },
  blazePlate: { id: 'blazePlate', name: 'Blaze Plate', desc: 'Fireproof laminate — this frame takes no burn damage', price: 1600, blazePlate: true },
  frostPlate: { id: 'frostPlate', name: 'Frost Plate', desc: 'Thermal lattice — this frame cannot be slowed', price: 1600, frostPlate: true },
  voidPlate: { id: 'voidPlate', name: 'Void Plate', desc: 'Sensor dark — this frame cannot be painted or exposed', price: 1600, voidPlate: true },
  witchPlate: { id: 'witchPlate', name: 'Witch Plate', desc: 'Hex ward — this frame cannot be suppressed', price: 1700, witchPlate: true },
  octaneCell: { id: 'octaneCell', name: 'Octane Cell', desc: 'Hot ammunition — +15% ammo weapon damage, -100 armor', price: 1700, ammoDmg: 15, ventArmor: true },
  orbShield: { id: 'orbShield', name: 'Orb Shield', desc: 'Deflector field — -15% damage from attacks at range 3+', price: 1700, orbShield: 15 },
  vendettaRig: { id: 'vendettaRig', name: 'Vendetta Rig', desc: 'Retaliation targeting — counter-attacks deal +15% damage', price: 1600, counterDmg: 15 },
  dancerWeave: { id: 'dancerWeave', name: 'Dancer Weave', desc: 'Momentum frame — +10 evade on turns this unit moved', price: 1700, dancerWeave: 1 },
  gloomCoil: { id: 'gloomCoil', name: 'Gloom Coil', desc: 'Curse lattice — attackers that hit this frame risk 25% getting marked', price: 1700, gloomCoil: true },
  overtureCell: { id: 'overtureCell', name: 'Overture Cell', desc: 'Pre-battle anthem — +20 Will at the start of each battle', price: 1500, willStart: 2 },
  deadeyeLens: { id: 'deadeyeLens', name: 'Deadeye Lens', desc: 'Precision optics — +10 hit', price: 1600, accBoost: 10 },
  siegeOptics: { id: 'siegeOptics', name: 'Siege Optics', desc: 'Long-focus array — +10% damage vs targets 4+ tiles away', price: 1600, rangeDmg: 10 },
  shredGauge: { id: 'shredGauge', name: 'Shred Gauge', desc: 'Armor-piercing oscillator — attacks ignore 15% of target armor', price: 1700, armorShred: 15 },
  riposteRig: { id: 'riposteRig', name: 'Riposte Rig', desc: 'Counter servos — counter-attacks deal +10% damage', price: 1500, counterDmg: 10 },
  menderNode: { id: 'menderNode', name: 'Mender Node', desc: 'Nanite halo — allies within 2 tiles regen +4% hull per turn', price: 1700, auraHeal: 4 },
  focusLens: { id: 'focusLens', name: 'Focus Lens', desc: 'Kill-matrix optics — +8% critical chance', price: 1600, crit: 8 },
  trainingManual: { id: 'trainingManual', name: 'Training Manual', desc: 'AIM drills — AIM focus grants +25 hit instead of +15', price: 1500, aimBoost: 10 },
  glassReactor: { id: 'glassReactor', name: 'Glass Reactor', desc: 'Overclocked core — +15% damage but -100 armor', price: 1700, dmg: 15, armor: -100 },
  warDrum: { id: 'warDrum', name: 'War Drum', desc: 'Kill chant — +3 Will per kill (soul-fed reactor)' , price: 1600, willOnKill: 3 },
  hunterScope: { id: 'hunterScope', name: 'Hunter Scope', desc: 'Marking optics — +10 hit and +10% damage vs marked or exposed targets', price: 1800, accBoost: 10, markDmg: 10 },
  maliceCoil: { id: 'maliceCoil', name: 'Malice Coil', desc: 'Hex emitter — landed hits have a 30% chance to mark the target', price: 1600, statusMark: true },
  benedictionSeal: { id: 'benedictionSeal', name: 'Benediction Seal', desc: 'Hymn conduits — allies within 2 tiles regen +3% hull per turn', price: 1700, auraHeal: 3 },
  horizonLens: { id: 'horizonLens', name: 'Horizon Lens', desc: 'Horizon array — +12% damage vs targets 4+ tiles away', price: 1800, rangeDmg: 12 },
  citadelPlate: { id: 'citadelPlate', name: 'Citadel Plate', desc: 'Fortress shell — +100 armor, plus +400 more on defensive terrain', price: 1900, armor: 100, fortArmor: true },
  gutsRipper: { id: 'gutsRipper', name: 'Guts Ripper', desc: 'Shredder maw — attacks ignore 20% of target armor', price: 1700, armorShred: 20 },
  reflexLoom: { id: 'reflexLoom', name: 'Reflex Loom', desc: 'Reflex weave — +15 evade on turns this frame moves', price: 1700, dancerWeave: 1.5 },
  mirrorScale: { id: 'mirrorScale', name: 'Mirror Scale', desc: 'Reflexive plating — reflects 20% of hit damage back at the attacker', price: 1800, reflect: 20 },
  choirRelic: { id: 'choirRelic', name: 'Choir Relic', desc: 'Anthem core — pilot regenerates +3 SP every turn', price: 1800, spRegen: 3 },
  warlordSigil: { id: 'warlordSigil', name: 'Warlord Sigil', desc: 'Command crest — adjacent allies deal +12% damage', price: 1900, auraDmg: 12 },
  judgeRig: { id: 'judgeRig', name: 'Judge Rig', desc: 'Arbiter servos — counter-attacks deal +25% damage', price: 1900, counterDmg: 25 },
  titanRipper: { id: 'titanRipper', name: 'Titan Ripper', desc: 'Colossus shredder — attacks ignore 25% of target armor', price: 1900, armorShred: 25 },
  conductorSeal: { id: 'conductorSeal', name: 'Conductor Seal', desc: 'Choir amplifier — pilot regenerates +4 SP every turn', price: 1900, spRegen: 4 },
  sabotRounds: { id: 'sabotRounds', name: 'Sabot Rounds', desc: 'Demolition load — landed hits have a 25% chance to crack the target\'s armor (break)', price: 1800, statusBreak: true },
  gyroStabilizer: { id: 'gyroStabilizer', name: 'Cyclone Gyro', desc: 'Inertial rig — +1 movement and +8 evade', price: 1900, move: 1, evade: 8 },
  blitzVerniers: { id: 'blitzVerniers', name: 'Blitz Verniers', desc: 'Assault thrusters — +1 movement and +10 EN regen each turn', price: 1900, move: 1, enRegen: 10 },
  oracleLens: { id: 'oracleLens', name: 'Oracle Lens', desc: 'Predictive array — +15 hit', price: 1900, accBoost: 15 },
  mirageWeave: { id: 'mirageWeave', name: 'Mirage Weave', desc: 'Phase-shift coating — +15 evade', price: 1900, evade: 15 },
  nullOptics: { id: 'nullOptics', name: 'Null Optics', desc: 'Void-sight matrix — +12 hit and +10% critical chance', price: 1900, accBoost: 12, crit: 10 },
  throneRelic: { id: 'throneRelic', name: 'Throne Relic', desc: 'Sovereign core — pilot regenerates +5 SP each turn', price: 2000, spRegen: 5 },
  reactorMk2: { id: 'reactorMk2', name: 'Reactor MK-II', desc: 'Second-stage core — +20 EN regenerated each turn', price: 2000, enRegen: 20 },
  marksmanCore: { id: 'marksmanCore', name: 'Marksman Core', desc: 'Deadeye matrix — +15 hit and +12% critical chance', price: 2000, accBoost: 15, crit: 12 },
  viceJaws: { id: 'viceJaws', name: 'Vice Jaws', desc: 'Crushing pincer servos — +18% damage against enemies pinned between two allies', price: 1900, pinDmg: 18 },
  hexRounds: { id: 'hexRounds', name: 'Hex Rounds', desc: 'Cursed ammunition — hits may mark (30%) and slow (30%) the target', price: 1800, statusMark: true, statusSlow: true },
  prismField: { id: 'prismField', name: 'Prism Field', desc: 'Refractive barrier — cuts incoming damage below 1500 to 20%', price: 2200, barrier: 1500 },
  reaperLattice: { id: 'reaperLattice', name: 'Reaper Lattice', desc: 'Executioner frame — ignores 15% armor and counters +15% damage', price: 1900, armorShred: 15, counterDmg: 15 },
  monolith: { id: 'monolith', name: 'Monolith', desc: 'Fortress monolith — +150 armor and 8% less damage taken', price: 2000, armor: 150, dmgTaken: -8 },
  bombardCache: { id: 'bombardCache', name: 'Bombard Cache', desc: 'Artillery stockpile — MAP/area weapons +15% damage and +1 ammo each turn', price: 2000, mapDmg: true, ammoRegen: true },
  harmonicCore: { id: 'harmonicCore', name: 'Harmonic Core', desc: 'Resonant conduit — spirit costs −10% and pilot regenerates +3 SP each turn', price: 2100, spSaver: true, spRegen: 3 },
  venomRounds: { id: 'venomRounds', name: 'Venom Rounds', desc: 'Toxic payload — landed hits can ignite (25%) and paint (25%) the target', price: 2100, statusBurn: true, statusMark: true },
  bloodPlate: { id: 'bloodPlate', name: 'Blood Plate', desc: 'Crimson laminate — +100 armor and +10% damage while hull is below 50%', price: 2100, armor: 100, lowHpDmg: 10 },
  triadCell: { id: 'triadCell', name: 'Triad Cell', desc: 'Tri-core array — beam and gun weapons +10% damage', price: 2100, beamDmg: 10, gunDmg: 10 },
  wardenPlate: { id: 'wardenPlate', name: 'Warden Plate', desc: 'Sentinel laminate — incoming melee and missile damage reduced by 25%', price: 2100, meleeGuard: true, missileGuard: true },
  furnaceRig: { id: 'furnaceRig', name: 'Furnace Rig', desc: 'Retribution lattice — melee attackers take 100 backlash and risk catching fire', price: 2200, shockCoil: true, blazeCoil: true },
  twinVeins: { id: 'twinVeins', name: 'Twin Veins', desc: 'Dual-cycle core — +12 EN regen and +4% hull regen per turn', price: 2100, enRegen: 12, hpRegen: 4 },
  prismAegis: { id: 'prismAegis', name: 'Prism Aegis', desc: 'Layered ward — +100 armor and a 600-point barrier', price: 2300, armor: 100, barrier: 600 },
  swarmRack: { id: 'swarmRack', name: 'Swarm Rack', desc: 'Swarm launcher links — missile and funnel weapons +12% damage', price: 2200, missileDmg: 12, funnelDmg: 12 },
  riposteLattice: { id: 'riposteLattice', name: 'Riposte Lattice', desc: 'Counterweave frame — counter-attacks +15% damage and reach +1 range', price: 2300, counterDmg: 15, counterRange: true },
  overdriveCore: { id: 'overdriveCore', name: 'Overdrive Core', desc: 'Turbine heart — +8% damage and +10 EN regen per turn', price: 2300, dmg: 8, enRegen: 10 },
  stormwallPlate: { id: 'stormwallPlate', name: 'Stormwall Plate', desc: 'Tempest laminate — +150 armor and +6 evade', price: 2300, armor: 150, evade: 6 },
  dualfeedCell: { id: 'dualfeedCell', name: 'Dualfeed Cell', desc: 'Split-loader array — ammo and EN weapons +10% damage', price: 2300, ammoDmg: 10, enDmg: 10 },
  gambitWeave: { id: 'gambitWeave', name: 'Gambit Weave', desc: 'Feint laminate — +8 evade and counter-attacks +15% damage', price: 2200, evade: 8, counterDmg: 15 },
  radiantPlate: { id: 'radiantPlate', name: 'Radiant Plate', desc: 'Prism laminate — +100 armor and incoming beam damage reduced by 25%', price: 2300, armor: 100, beamGuard: true },
  vulcanChamber: { id: 'vulcanChamber', name: 'Vulcan Chamber', desc: 'High-pressure bore — gun weapons +15% damage and +8% critical chance', price: 2400, gunDmg: 15, crit: 8 },
  zephyrLoom: { id: 'zephyrLoom', name: 'Zephyr Loom', desc: 'Aerowoven frame — +12 mobility and +6 evade', price: 2400, mobility: 12, evade: 6 },
  photonVeins: { id: 'photonVeins', name: 'Photon Veins', desc: 'Luminous conduits — +15 EN regen and +5% hull regen per turn', price: 2500, enRegen: 15, hpRegen: 5 },
  rayLens: { id: 'rayLens', name: 'Raylens Array', desc: 'Photon magnifier — beam weapons +15% damage and +8% critical chance', price: 2500, beamDmg: 15, crit: 8 },
  juggerPlate: { id: 'juggerPlate', name: 'Juggernaut Plate', desc: 'Siege laminate — +200 armor but -1 movement', price: 2600, armor: 200, move: -1 },
  seekerRack: { id: 'seekerRack', name: 'Seeker Rack', desc: 'Guidance lattice — missile weapons +15% damage and +8 hit', price: 2500, missileDmg: 15, hit: 8 },
  shadeLoom: { id: 'shadeLoom', name: 'Shade Loom', desc: 'Duskweave frame — +10 mobility and counter-attacks +10% damage', price: 2600, mobility: 10, counterDmg: 10 },
  triguard: { id: 'triguard', name: 'Tri Guard', desc: 'Trifold lattice — beam & gun damage taken -25%', price: 2700, beamGuard: true, gunGuard: true },
  bulwarkLoom: { id: 'bulwarkLoom', name: 'Bulwark Loom', desc: 'Bulwark weave — +150 armor and counter-attacks +12% damage', price: 2700, armor: 150, counterDmg: 12 },
  tracerVeil: { id: 'tracerVeil', name: 'Tracer Veil', desc: 'Paint-matrix shroud — +10 hit and +15% damage vs marked/exposed', price: 2800, hit: 10, markDmg: 15 },
  bombardRig: { id: 'bombardRig', name: 'Bombard Rig', desc: 'Siege lattice — MAP weapons +15% damage and +1 weapon range', price: 2800, mapDmg: true, range: 1 },
  emberRounds: { id: 'emberRounds', name: 'Ember Rounds', desc: 'Pyre load — landed hits can ignite the target (25%)', price: 2900, statusBurn: true, hit: 8 },
  rendLattice: { id: 'rendLattice', name: 'Rend Lattice', desc: 'Sunderweave frame — attacks shred 10% more armor and +8 hit', price: 2900, armorShred: 10, hit: 8 },
  hymnLoom: { id: 'hymnLoom', name: 'Hymn Loom', desc: 'Choir lattice — allies within 2 tiles regen +5% hull per turn', price: 1800, auraHeal: 5 },
  aegisCarapace: { id: 'aegisCarapace', name: 'Aegis Carapace', desc: 'Sanctum plate — +100 armor, plus +400 more while hull is below 40%', price: 1900, armor: 100, lowHpArmor: true },
  aegisField: { id: 'aegisField', name: 'Aegis Field', desc: '-20% damage taken — projected barrier', price: 2000, dmgTaken: -20 },
  escapePod: { id: 'escapePod', name: 'Escape Pod', desc: 'Pilot ejects on destruction — no WOUNDED penalty next sortie', price: 1200 },
  driveCore: { id: 'driveCore', name: 'Drive Core', desc: '+25% EXP gained', price: 1300, xp: 25 },
  drakeCell: { id: 'drakeCell', name: "Drake's Cell", desc: '+2 move · +8% hit — Vossen tech', price: 0, move: 2, hit: 8, unique: true },
  ammoRack: { id: 'ammoRack', name: 'Ammo Rack', desc: '+30% weapon ammo capacity — extended magazine', price: 1100, ammoPct: 30 },
};

export type PartId = keyof typeof PARTS;

// ---------- Pilot skill points (PP — earned per kill/level, spent in workshop PILOTS tab) ----------

export interface PilotStatDef {
  id: PilotSkillId;
  name: string;
  desc: string;
}

export const PILOT_STATS: PilotStatDef[] = [
  { id: 'hit', name: 'Precision', desc: '+1% hit chance per point' },
  { id: 'evade', name: 'Reflexes', desc: '+1% evade per point' },
  { id: 'dmg', name: 'Firepower', desc: '+1.5% damage per point' },
  { id: 'def', name: 'Endurance', desc: '-1.5% damage taken per point' },
  { id: 'countercut', name: 'Counter Cut', desc: '+4% chance per point to strike first when countering — a kill pre-empts the blow' },
  { id: 'esave', name: 'E-Save', desc: '-4% weapon EN cost per point' },
  { id: 'hitrun', name: 'Hit & Run', desc: 'Strike, then keep moving — one rank unlocks move-after-attack' },
  { id: 'crit', name: 'Veteran', desc: '+2% critical chance per point' },
  { id: 'scavenger', name: 'Scavenger', desc: 'Restores 4 EN per point on every kill' },
  { id: 'regen', name: 'Nanite Cloud', desc: '+1% HP regenerated per turn per point' },
  { id: 'riposte', name: 'Riposte', desc: '+8% counter-attack damage per point' },
  { id: 'lastStand', name: 'Last Stand', desc: '+5% damage per point while under 30% HP' },
  { id: 'assassin', name: 'Assassin', desc: '+6% damage per point vs targets under 40% HP' },
  { id: 'brawler', name: 'Brawler', desc: '+5% damage per point with melee weapons' },
  { id: 'initiative', name: 'Initiative', desc: '+10% damage per point on the first strike each battle' },
  { id: 'gunner', name: 'Gunner', desc: '+5% damage per point with ranged weapons' },
  { id: 'plunderer', name: 'Plunderer', desc: '+15% capture salvage per point' },
  { id: 'bodyguard', name: 'Bodyguard', desc: 'Cover intercepts take 10% less damage per point' },
  { id: 'opportunist', name: 'Opportunist', desc: '+7% damage per point vs targets with status effects' },
  { id: 'warcry', name: 'War Cry', desc: 'Your kills grant allies within 2 tiles +2 Will per point' },
  { id: 'pointBlank', name: 'Point Blank', desc: '+6% damage per point attacking from 2 tiles or closer' },
  { id: 'bloodlust', name: 'Bloodlust', desc: '+5% damage per point after this unit\'s 3rd kill of the battle' },
  { id: 'reaver', name: 'Reaver', desc: '+5% damage per point against targets at full HP' },
  { id: 'bulwark', name: 'Bulwark', desc: 'Defend reaction reduces damage an extra 8% per point' },
  { id: 'duelist', name: 'Duelist', desc: '+6% damage per point against isolated foes (no ally within 2 tiles)' },
  { id: 'juggernaut', name: 'Juggernaut', desc: '+4% damage per point when attacking without moving' },
  { id: 'giantSlayer', name: 'Giant Slayer', desc: '+6% damage per point against bosses and elite frames' },
  { id: 'loneWolf', name: 'Lone Wolf', desc: '+6% damage per point when no ally is within 2 tiles' },
  { id: 'overwhelm', name: 'Overwhelm', desc: '+5% damage per point vs enemies that have not acted' },
  { id: 'outgunned', name: 'Outgunned', desc: '+6% damage per point while your side is outnumbered' },
  { id: 'tankbuster', name: 'Tankbuster', desc: '+6% damage per point vs frames with 1200+ armor' },
  { id: 'coordinator', name: 'Coordinator', desc: '+5% damage per point while assisted by coordinated fire' },
  { id: 'sentinel', name: 'Sentinel', desc: '+5% damage on counter-attacks per point' },
  { id: 'gambit', name: 'Gambit', desc: '+8% damage per point but -8 evade per point' },
  { id: 'warcaster', name: 'Warcaster', desc: 'Spirits cost 4% less SP per point' },
  { id: 'underdog', name: 'Underdog', desc: '+5% damage per point against higher-level frames' },
  { id: 'skirmisher', name: 'Skirmisher', desc: '+5% damage per point when attacking after moving' },
  { id: 'engineer', name: 'Engineer', desc: 'REPAIR restores +10% more HP per point' },
  { id: 'cohort', name: 'Cohort', desc: '+4% damage per point while an ally is within 2 tiles' },
  { id: 'entrench', name: 'Entrench', desc: '+5% damage per point while standing on defensive terrain' },
  { id: 'steadfast', name: 'Steadfast', desc: 'Take 6% less damage per point' },
  { id: 'precision', name: 'Precision', desc: 'Critical hits deal +5% more damage per point' },
  { id: 'surge', name: 'Surge', desc: '+4% damage per point while reactor EN is above 75%' },
  { id: 'reflex', name: 'Reflex', desc: 'Take 5% less counter-attack damage per point' },
  { id: 'outflank', name: 'Outflank', desc: '+6% damage per point against targets that cannot counter' },
  { id: 'foeswarm', name: 'Foeswarm', desc: '+3% damage per point for each enemy within 2 tiles' },
  { id: 'cannonade', name: 'Cannonade', desc: '+5% damage per point with missile weapons' },
  { id: 'gunsmith', name: 'Gunsmith', desc: '+5% damage per point with gun weapons' },
  { id: 'luminance', name: 'Luminance', desc: '+5% damage per point with beam weapons' },
  { id: 'swarmer', name: 'Swarmer', desc: '+5% damage per point with funnel weapons' },
  { id: 'phantomstep', name: 'Phantom Step', desc: '+4 evade per point' },
  { id: 'parry', name: 'Parry', desc: '-5% melee damage taken per point' },
  { id: 'piercer', name: 'Piercer', desc: 'Attacks ignore +4% of target armor per point' },
  { id: 'heavycal', name: 'Heavy Caliber', desc: '+5% damage per point with ammunition weapons' },
  { id: 'anchor', name: 'Anchor', desc: '-5% damage taken per point while this frame did not move' },
  { id: 'dreadnought', name: 'Dreadnought', desc: '+4% damage per point against lower-level frames' },
  { id: 'resolute', name: 'Resolute', desc: '+6% damage per point while Will is 120 or higher' },
  { id: 'siegeadept', name: 'Siege Adept', desc: '+5% damage per point against enemies dug into defensive terrain' },
  { id: 'cadence', name: 'Cadence', desc: '+4% damage per point per kill this battle (up to 3 kills)' },
  { id: 'wingman', name: 'Wingman', desc: '+5% damage per point while an ally is adjacent to the target' },
  { id: 'fullmag', name: 'Full Mag', desc: '+6% damage per point when firing a weapon with a full clip' },
  { id: 'dirgesong', name: 'Dirge Song', desc: '+8% damage per point while a squad frame lies fallen this battle' },
  { id: 'burnout', name: 'Burnout', desc: '+6% damage per point while EN is at 25% or lower' },
  { id: 'divebomb', name: 'Divebomb', desc: '+6% damage per point when an air frame strikes a ground target' },
  { id: 'arsenalmind', name: 'Arsenal Mind', desc: '+3% damage per point for each part equipped on this frame' },
  { id: 'titanbreaker', name: 'Titanbreaker', desc: '+6% damage per point vs slow siege frames (move range 4 or less)' },
  { id: 'truesight', name: 'Truesight', desc: '+5% damage per point while AIM focus is active — rewards the patient shot' },
  { id: 'backliner', name: 'Backliner', desc: '+6% damage per point while no enemy stands adjacent — clean shooting lanes' },
  { id: 'bombard', name: 'Bombard', desc: '+5% damage per point with MAP/area weapons' },
  { id: 'ruinbreaker', name: 'Ruin Breaker', desc: '+7% damage per point vs frames with crumbling armor (sundered or broken)' },
  { id: 'artillerist', name: 'Artillerist', desc: '+5% damage per point vs targets 4 or more tiles away' },
  { id: 'paintburst', name: 'Paintburst', desc: '+7% damage per point vs painted targets (marked or exposed)' },
  { id: 'fortsoul', name: 'Fortress Soul', desc: '-5% damage taken per point while on defensive terrain' },
  { id: 'hexsurge', name: 'Hex Surge', desc: '+5% damage per point for each debuff on the target (cap 3)' },
  { id: 'coldsteel', name: 'Cold Steel', desc: '+5% damage per point while this frame is untouched (full hull)' },
  { id: 'capacitor', name: 'Capacitor', desc: '+4% damage per point per 25 EN remaining (cap +16%)' },
  { id: 'ironbound', name: 'Ironbound', desc: '+100 armor per point' },
  { id: 'coolloop', name: 'Coolant Loop', desc: 'Weapon EN cost −6% per point (cap −30%)' },
  { id: 'gritguard', name: 'Grit Guard', desc: '−8% incoming damage per point while hull is below 50%' },
  { id: 'savant', name: 'Savant', desc: '+1 SP regen per point each turn' },
  { id: 'shieldpierce', name: 'Shield Pierce', desc: '+7% damage per point vs frames carrying an I-Field or barrier' },
  { id: 'pureshot', name: 'Pure Shot', desc: '+6% damage per point vs targets free of debuffs' },
  { id: 'finisher', name: 'Finisher', desc: '+7% damage per point vs targets below 30% HP' },
  { id: 'aerobat', name: 'Aerobat', desc: '+5% damage per point while your mobility beats the target' },
  { id: 'sureshot', name: 'Sure Shot', desc: '+6% damage per point on shots at 85%+ hit' },
  { id: 'wildfire', name: 'Wildfire', desc: '+3% damage per point per burning enemy (max 3) — feeds the blaze' },
  { id: 'archer', name: 'Archer', desc: '+4% damage per point per tile of range beyond 3 (max 3 tiles)' },
  { id: 'stormeye', name: 'Stormeye', desc: '+5% damage per point while your Will exceeds the target' },
  { id: 'acehunter', name: 'Ace Hunter', desc: '+6% damage per point vs foes with 3+ battle kills' },
  { id: 'ravager', name: 'Ravager', desc: '+5% damage per point vs targets on open ground (no terrain armor)' },
  { id: 'sledge', name: 'Sledge', desc: '+6% damage per point with knockback weapons' },
  { id: 'overkill', name: 'Overkill', desc: '+5% damage per point when the blow would destroy the target' },
  { id: 'pike', name: 'Pike', desc: '+5% damage per point when firing at maximum weapon reach' },
  { id: 'wildswing', name: 'Wild Swing', desc: '+8% damage per point on attacks below 60% hit' },
  { id: 'zenith', name: 'Zenith', desc: '+6% damage per point while Will is at its peak (150)' },
  { id: 'closecombat', name: 'Close Combat', desc: '+5% damage per point when attacking at 2 tiles or closer' },
  { id: 'chainblade', name: 'Chainblade', desc: '+6% damage per point with chain-arc weapons' },
  { id: 'exploiter', name: 'Exploiter', desc: '+5% damage per point vs targets already dodging this phase' },
  { id: 'viper', name: 'Viper', desc: '+6% damage per point vs slowed targets' },
  { id: 'disruptor', name: 'Disruptor', desc: '+5% damage per point vs targets below 50% EN' },
  { id: 'myrmidon', name: 'Myrmidon', desc: '+5% damage per point when attacking without moving' },
  { id: 'sunderfist', name: 'Sunderfist', desc: '+5% damage per point with breaker weapons' },
  { id: 'bloodborne', name: 'Bloodborne', desc: '+5% damage per point while hull is above 80%' },
  { id: 'harvester', name: 'Harvester', desc: '+4% damage per point per 10% hull the target has lost (cap +40%)' },
  { id: 'gridshock', name: 'Gridshock', desc: '+5% damage per point with energy (EN-cost) weapons' },
  { id: 'shockjock', name: 'Shockjock', desc: '+5% damage per point with status weapons' },
  { id: 'biggame', name: 'Big Game', desc: '+6% damage per point vs frames with over 12000 max HP' },
  { id: 'razor', name: 'Razor', desc: '+5% damage per point with pierce weapons' },
  { id: 'retribution', name: 'Retribution', desc: '+6% counter damage per point when hull below half' },
  { id: 'bloodhound', name: 'Bloodhound', desc: '+5% damage per point vs crippled or wounded targets' },
  { id: 'headhunter', name: 'Headhunter', desc: '+6% damage per point vs boss and elite frames' },
  { id: 'soulcut', name: 'Soulcut', desc: '+5% damage per point vs slowed or crippled targets' },
  { id: 'wardancer', name: 'Wardancer', desc: '+5% damage per point on turns this unit moved' },
  { id: 'butcher', name: 'Butcher', desc: '+6% damage per point vs targets at full hull' },
  { id: 'punisher', name: 'Punisher', desc: '+6% damage per point vs targets that already acted' },
  { id: 'wrathborn', name: 'Wrathborn', desc: '+6% damage per point while hull at or below 40%' },
  { id: 'tracker', name: 'Tracker', desc: '+6% damage per point vs marked or exposed targets' },
  { id: 'carver', name: 'Carver', desc: '+5% damage per point vs frames with 110+ mobility' },
  { id: 'highvolt', name: 'Highvolt', desc: '+5% damage per point while EN at or above 50%' },
  { id: 'ironwill', name: 'Ironwill', desc: '+4% damage per point per 10 Will above 100' },
  { id: 'vigilant', name: 'Vigilant', desc: '+5% damage per point vs targets that moved this turn' },
  { id: 'bloodfrenzy', name: 'Bloodfrenzy', desc: '+4% damage per point per enemy adjacent to the target (max 3)' },
  { id: 'spectral', name: 'Spectral', desc: '+5% damage per point vs targets that have not moved this turn' },
  { id: 'hexblade', name: 'Hexblade', desc: '+5% damage per point vs suppressed targets' },
  { id: 'graceful', name: 'Graceful', desc: '+5% damage per point after dodging at least once this phase' },
  { id: 'flakmaster', name: 'Flakmaster', desc: '+6% damage per point vs air frames' },
  { id: 'shepherd', name: 'Shepherd', desc: '+4% damage per point while adjacent to a wounded ally' },
  { id: 'madmen', name: 'Madmen', desc: '+4% damage per point per debuff on this frame (max 2)' },
  { id: 'predator', name: 'Predator', desc: '+6% damage per point vs targets that have not acted' },
  { id: 'wither', name: 'Wither', desc: '+6% damage per point vs burning targets' },
  { id: 'grandstand', name: 'Grandstand', desc: '+5% damage per point while at least 3 allies are alive' },
  { id: 'vanguard', name: 'Vanguard', desc: '+6% damage per point on the unit\'s first attack each battle' },
  { id: 'phalanx', name: 'Phalanx', desc: '+4% damage per point per adjacent ally (max 3)' },
  { id: 'polymath', name: 'Polymath', desc: '+4% damage per point per weapon carried beyond the second' },
  { id: 'isolator', name: 'Isolator', desc: '+6% damage per point vs targets with no adjacent ally' },
  { id: 'scourge', name: 'Scourge', desc: '+5% damage per point vs targets suffering 2+ statuses' },
  { id: 'bloodtrance', name: 'Bloodtrance', desc: '+4% damage per point for each enemy adjacent to this frame (up to 3)' },
  { id: 'snipersoul', name: 'Snipersoul', desc: '+6% damage per point with sniper-tagged weapons' },
  { id: 'aegisshield', name: 'Aegis Shield', desc: '+4% damage per point while standing on defensive terrain' },
  { id: 'stunlock', name: 'Stunlock', desc: '+6% damage per point against stunned targets' },
  { id: 'polluter', name: 'Polluter', desc: '+4% damage per point against targets carrying any status effect' },
  { id: 'finale', name: 'Finale', desc: '+8% damage per point when the target is the last hostile standing' },
  { id: 'sunderborn', name: 'Sunderborn', desc: '+6% damage per point against targets with sundered or rended armor' },
  { id: 'landslide', name: 'Landslide', desc: '+5% damage per point against land-type frames' },
  { id: 'sapper', name: 'Sapper', desc: '+5% damage per point against targets on defensive terrain' },
  { id: 'flanker', name: 'Flanker', desc: '+4% damage per point when the target is pinned between two allies' },
  { id: 'tormentor', name: 'Tormentor', desc: '+6% damage per point against decaying targets' },
  { id: 'godsbreaker', name: 'Godsbreaker', desc: '+5% damage per point against phase-2 bosses' },
  { id: 'momentum', name: 'Momentum', desc: '+4% damage per point per attack already made this battle (cap 3)' },
  { id: 'vitals', name: 'Vitals', desc: '+5% critical damage per point' },
  { id: 'highhand', name: 'Highhand', desc: '+5% damage per point vs lower-level frames' },
  { id: 'saboteur', name: 'Saboteur', desc: '+5% damage per point vs targets unable to counter' },
  { id: 'barrierbane', name: 'Barrierbane', desc: '+6% damage per point vs barrier-protected frames' },
  { id: 'huntsman', name: 'Huntsman', desc: '+5% damage per point vs targets at 30-70% hull' },
  { id: 'guardbreaker', name: 'Guardbreaker', desc: '+6% damage per point vs targets under defensive stances (grit/guard/oath/fortress/defiance/bastion)' },
  { id: 'opening', name: 'Opening', desc: '+6% damage per point vs targets above 70% hull' },
  { id: 'remembrance', name: 'Remembrance', desc: '+4% damage per point per fallen ally (max 3) — vengeance build' },
  { id: 'scrapper', name: 'Scrapper', desc: '+5% damage per point with weapons that cost no EN' },
  { id: 'ballisteur', name: 'Ballisteur', desc: '+5% damage per point with ammo-fed weapons' },
  { id: 'awestruck', name: 'Awestruck', desc: '+5% damage per point vs targets at 120+ Will' },
  { id: 'lifeline', name: 'Lifeline', desc: '+4% damage per point while any ally is below 50% hull' },
  { id: 'lowburn', name: 'Lowburn', desc: '+5% damage per point while own EN is below 40%' },
  { id: 'bigbang', name: 'Big Bang', desc: '+5% damage per point when firing your strongest weapon' },
  { id: 'irongroove', name: 'Iron Groove', desc: '+5% damage per point while own hull is between 40-80%' },
  { id: 'ashstalker', name: 'Ashstalker', desc: '+6% damage per point vs targets standing on hostile terrain (lava/void)' },
  { id: 'dominant', name: 'Dominant', desc: '+5% damage per point vs targets carrying a smaller arsenal' },
  { id: 'crossfire', name: 'Crossfire', desc: '+5% damage per point vs targets covered by 2+ other allies' },
  { id: 'reaping', name: 'Reaping', desc: '+6% damage per point vs targets below 25% hull' },
  { id: 'luminarch', name: 'Luminarch', desc: '+5% damage per point with beam weapons' },
  { id: 'breakdancer', name: 'Breakdancer', desc: '+5% damage per point vs armor-broken targets' },
  { id: 'hailborn', name: 'Hailborn', desc: '+5% damage per point with missile weapons' },
  { id: 'rifleborn', name: 'Rifleborn', desc: '+5% damage per point with gun weapons' },
  { id: 'flankshot', name: 'Flankshot', desc: '+5% damage per point vs targets on open ground (no defensive terrain)' },
  { id: 'warlust', name: 'Warlust', desc: '+3% damage per point per battle kill made by this unit (max 5 tiers)' },
  { id: 'halfload', name: 'Halfload', desc: '+6% damage per point when the weapon is at half ammo or less' },
  { id: 'longbarrel', name: 'Longbarrel', desc: '+5% damage per point when attacking from at least 3 tiles away' },
  { id: 'corrosivist', name: 'Corrosivist', desc: '+6% damage per point vs targets suffering Rust Verse corrosion' },
  { id: 'thinner', name: 'Thinner', desc: '+6% damage per point vs grunt frames (non-boss, non-elite)' },
];

export const MAX_PILOT_SKILL = 20;

// ---------- Upgrades (hangar; per unit defId, per stat level) ----------

export interface UpgradeStat {
  id: 'hp' | 'en' | 'armor' | 'mobility';
  name: string;
  desc: string;
  per: number; // flat amount per level
  cost: (lvl: number) => number;
}

export const UPGRADE_STATS: UpgradeStat[] = [
  { id: 'hp', name: 'Hull Plating', desc: '+400 max HP per level', per: 400, cost: (l) => 300 + l * 220 },
  { id: 'en', name: 'Reactor Output', desc: '+15 max EN per level', per: 15, cost: (l) => 250 + l * 180 },
  { id: 'armor', name: 'Composite Armor', desc: '+90 armor per level', per: 90, cost: (l) => 320 + l * 240 },
  { id: 'mobility', name: 'Servo Tuning', desc: '+6 mobility per level', per: 6, cost: (l) => 320 + l * 240 },
];

export const MAX_UPGRADE_LEVEL = 8;

export type UpgradeMap = Record<string, Record<string, number>>; // defId -> statId -> level

export function upgradedStat(def: UnitDef, stat: UpgradeStat['id'], up: UpgradeMap): number {
  const lvl = up[def.id]?.[stat] ?? 0;
  const per = UPGRADE_STATS.find((s) => s.id === stat)!.per;
  const base = stat === 'hp' ? def.maxHp : stat === 'en' ? def.maxEn : stat === 'armor' ? def.armor : def.mobility;
  return base + lvl * per;
}

// ---------- New pilots & units (campaign) ----------

const P = (p: PilotDef) => p;
const U = (u: UnitDef) => u;

export const CAMPAIGN_PILOTS = {
  raxp: P({ name: 'Cap. Rax Daver', callsign: 'RED', melee: 66, ranged: 62, defense: 62, evade: 60, maxSp: 55, spirits: ['valor', 'strike', 'miracle', 'overdrive', 'resolve', 'guts', 'relentless', 'execute', 'hunt', 'exert', 'reaper', 'carnage', 'gorelust', 'hemorrhage', 'plunderedge', 'lacerate', 'thrillkill', 'ravenous', 'rageverse', 'furyverse', 'ravageverse', 'crimsonverse', 'goreverse', 'culledge', 'rendedge', 'overedge', 'splatteredge', 'havocverse', 'maimedge', 'hollowedge', 'maraudedge', 'vampedge'], faceColor: '#ff7a7a', trait: 'crimson_fury', lastWords: 'Heh... not bad, Ardent. The throne... is yours to storm.', killQuip: 'Your courage deserved a better machine.' }),
  moorinp: P({ name: 'Gen. Moorin', callsign: 'GEN', melee: 72, ranged: 70, defense: 78, evade: 52, maxSp: 70, spirits: ['grit', 'guard', 'strike'], faceColor: '#a8b8a0', trait: 'rally', lastWords: 'The Empire does not fall with me... it only grows quieter.', killQuip: 'This is what defiance costs.' }),
  serkap: P({ name: 'Void Empress Serka', callsign: 'EMP', melee: 74, ranged: 82, defense: 66, evade: 80, maxSp: 75, spirits: ['strike', 'valor', 'focus'], faceColor: '#d8a0ff', lastWords: 'Beautiful... to the void we all return.', killQuip: 'Hush now. The void was always calling.' }),
  baron: P({ name: 'The Bloody Baron', callsign: 'REAPER', melee: 78, ranged: 80, defense: 64, evade: 76, maxSp: 66, spirits: ['strike', 'valor', 'grit'], faceColor: '#ff8860', lastWords: 'Hah... the hunt ends where it began. Well flown, little Arks.', killQuip: 'Nothing personal. You were simply worth more dead.' }),
  veep: P({ name: 'Lt. Vee Corrin', callsign: 'FALCON', melee: 58, ranged: 79, defense: 60, evade: 84, maxSp: 58, spirits: ['focus', 'strike', 'accel', 'vanish', 'overdrive', 'resolve', 'wish', 'gravity', 'reboot', 'siphon', 'glacial', 'strafe', 'cantata', 'interfere', 'dischord', 'winterverse', 'wardmist', 'dreadverse', 'dirgemist', 'tideverse', 'tideebb', 'darkverse', 'sirenverse', 'curseverse', 'doomverse', 'hexverse', 'blightverse', 'terrorverse', 'mireverse', 'ruinverse', 'shroudverse', 'silenceverse', 'veilbreakverse', 'tetherverse', 'stifleverse'], faceColor: '#8ef0e8', trait: 'falcon_wing' }),
  bramp: P({ name: 'Warden Bram', callsign: 'GATE', melee: 80, ranged: 55, defense: 82, evade: 50, maxSp: 60, spirits: ['grit', 'guard'], faceColor: '#c8a878', trait: 'rally', lastWords: 'The gate... opens for no one now.', killQuip: 'None pass the gate. None.' }),
  // recurring rival ace — hunts the squad across the war, always comes back for a rematch
  vossen: P({ name: 'Cpt. Vossen', callsign: 'ACE', melee: 74, ranged: 78, defense: 72, evade: 76, maxSp: 65, spirits: ['focus', 'strike', 'grit'], faceColor: '#ff6a5a', trait: 'ace_instinct', lastWords: 'A draw today, Ardent. The Drake flies again.', killQuip: 'Too slow. The Drake does not wait.' }),
  vaelp: P({ name: 'Emperor Vael', callsign: 'THRONE', melee: 82, ranged: 84, defense: 76, evade: 72, maxSp: 90, spirits: ['strike', 'valor', 'focus', 'guard'], faceColor: '#ffe08a', trait: 'sovereign', lastWords: 'Impossible... I AM the Throne—', killQuip: 'Kneel before the Throne — or break.' }),
};

// merged pilot lookup (unit.def.pilot stays typed as PilotDef)
export const CAMPAIGN_UNITS: Record<string, UnitDef> = {
  zoldaTank: U({ id: 'zoldaTank', name: 'Zolda Bastion', title: 'Imperial Heavy', color: '#5c6b52', accent: '#b8c4a8', maxHp: 5200, maxEn: 90, armor: 1300, mobility: 70, moveRange: 4, moveType: 'land', weapons: [WEAPONS.railgun, WEAPONS.heatRod], pilot: PILOTS.grunt }),
  vexia: U({ id: 'vexia', name: 'Vexia', title: 'Imperial Interceptor', color: '#4a6b8a', accent: '#c0e0ff', maxHp: 4400, maxEn: 130, armor: 800, mobility: 138, moveRange: 7, moveType: 'air', weapons: [WEAPONS.photonRifle, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  nightmare: U({ id: 'nightmare', name: 'Nightmare', title: 'Royal Guard', color: '#5a2f3a', accent: '#ffb0c0', maxHp: 6800, maxEn: 140, armor: 1150, mobility: 122, moveRange: 6, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.missilePods, WEAPONS.stasisRay], pilot: PILOTS.grunt, guardian: true }),
  phantom: U({ id: 'phantom', name: 'Phantom Shade', title: 'Stealth Stalker', color: '#232336', accent: '#a0a8ff', maxHp: 3600, maxEn: 130, armor: 620, mobility: 172, moveRange: 8, moveType: 'air', weapons: [WEAPONS.heatRod, WEAPONS.vulcan, WEAPONS.missilePods], pilot: PILOTS.grunt, stealth: true }),
  raxden: U({ id: 'raxden', name: 'Raxden Crimson', title: 'Custom Ace', color: '#a02828', accent: '#ffb080', maxHp: 7800, maxEn: 150, armor: 1100, mobility: 116, moveRange: 6, moveType: 'land', weapons: [WEAPONS.plasmaEdge, WEAPONS.railgun, WEAPONS.vulcan], pilot: CAMPAIGN_PILOTS.raxp, boss: true }),
  moorin: U({ id: 'moorin', name: 'Moorin Anvil', title: 'Imperial General', color: '#4a5a48', accent: '#d0e0c0', maxHp: 9800, maxEn: 160, armor: 1500, mobility: 96, moveRange: 5, moveType: 'land', weapons: [WEAPONS.megaBeam, WEAPONS.burstRepeater, WEAPONS.siegeCrusher], pilot: CAMPAIGN_PILOTS.moorinp, boss: true }),
  serka: U({ id: 'serka', name: 'Serka Vanta', title: 'Void Empress', color: '#5a2f6e', accent: '#e0b8ff', maxHp: 8200, maxEn: 190, armor: 1000, mobility: 140, moveRange: 7, moveType: 'air', weapons: [WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.serkap, boss: true }),
  empress: U({ id: 'empress', name: 'Empress Ascendant', title: 'True Void Form', color: '#7a3f8e', accent: '#ffe0ff', maxHp: 11000, maxEn: 220, armor: 1250, mobility: 146, moveRange: 7, moveType: 'air', weapons: [WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.chestBlaster, WEAPONS.mapCataclysm], pilot: CAMPAIGN_PILOTS.serkap, boss: true, resists: { beam: 0.3, funnel: 0.3 }, barrier: 1600 }),
  warden: U({ id: 'warden', name: 'Gate Warden', title: 'Ancient Guardian', color: '#7a5a30', accent: '#ffe0a8', maxHp: 12000, maxEn: 140, armor: 1600, mobility: 90, moveRange: 4, moveType: 'land', weapons: [WEAPONS.drillLancer, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.bramp, boss: true }),
  emperor: U({ id: 'emperor', name: 'Throne of Vael', title: 'The Emperor', color: '#e8d8a0', accent: '#fff8d8', maxHp: 15000, maxEn: 240, armor: 1500, mobility: 130, moveRange: 6, moveType: 'air', weapons: [WEAPONS.chestBlaster, WEAPONS.funnelArray, WEAPONS.megaBeam, WEAPONS.plasmaEdge], pilot: CAMPAIGN_PILOTS.vaelp, boss: true, barrier: 1800 }),
  // --- late-wave line frames ---
  lancer: U({ id: 'lancer', name: 'Wolfen Lance', title: 'Strike Cavalry', color: '#4a3a2e', accent: '#ff9060', maxHp: 3600, maxEn: 120, armor: 700, mobility: 150, moveRange: 7, moveType: 'land', weapons: [WEAPONS.drillLancer, WEAPONS.plasmaEdge, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  bulwark: U({ id: 'bulwark', name: 'Rampart Bulwark', title: 'Siege Anchor', color: '#3a4438', accent: '#ffe060', maxHp: 8200, maxEn: 80, armor: 1700, mobility: 55, moveRange: 3, moveType: 'land', weapons: [WEAPONS.gatling, WEAPONS.heatRod, WEAPONS.vampEdge, WEAPONS.mapShelling], pilot: PILOTS.grunt, resists: { gun: 0.3, missile: 0.3, melee: 0.25 } }),
  // unarmed civilian convoy — escort objective on protect chapters
  arklander: U({ id: 'arklander', name: 'Arklander Convoy', title: 'Civilian Transport', color: '#5a5148', accent: '#e0d0a8', maxHp: 3400, maxEn: 0, armor: 350, mobility: 40, moveRange: 0, moveType: 'land', weapons: [], pilot: PILOTS.civ }),
  // --- player reinforcements (join at arc boundaries) ---
  raxdenR: U({ id: 'raxdenR', name: 'Raxden Crimson', title: 'Defected Ace', color: '#a02828', accent: '#ffb080', maxHp: 7800, maxEn: 150, armor: 1100, mobility: 116, moveRange: 6, moveType: 'land', weapons: [WEAPONS.fangRipper, WEAPONS.plasmaEdge, WEAPONS.pileBunker, WEAPONS.railgun, WEAPONS.vulcan, WEAPONS.crimsonDuet], pilot: CAMPAIGN_PILOTS.raxp, level: 5 }),
  vexiaX: U({ id: 'vexiaX', name: 'Vexia Custom', title: 'Ark Interceptor', color: '#2a8a9a', accent: '#a0f0ff', maxHp: 5200, maxEn: 150, armor: 880, mobility: 142, moveRange: 7, moveType: 'air', weapons: [WEAPONS.photonRifle, WEAPONS.missilePods, WEAPONS.vulcan, WEAPONS.voidLance, WEAPONS.arcCascade], pilot: CAMPAIGN_PILOTS.veep, level: 7 }),
  // act-3 fast striker — drains HP on hit, high evade, hunts stragglers
  cataphract: U({ id: 'cataphract', name: 'Karn Cataphract', title: 'Shadow Striker', color: '#2e2e3a', accent: '#a0a0ff', maxHp: 4200, maxEn: 120, armor: 650, mobility: 158, moveRange: 8, moveType: 'air', weapons: [WEAPONS.vampEdge, WEAPONS.plasmaEdge], pilot: PILOTS.grunt, resists: { beam: 0.4 }, jammer: true }),
  // act-2/3 support frame — mends wounded allies instead of pressing the attack
  medic: U({ id: 'medic', name: 'Vesper Choir', title: 'Imperial Medic', color: '#3a4a52', accent: '#a0ffd8', maxHp: 4000, maxEn: 100, armor: 700, mobility: 140, moveRange: 6, moveType: 'air', weapons: [WEAPONS.nullChord, WEAPONS.vulcan], pilot: PILOTS.grunt, medic: true }),
  // act-3 artillery — a dead-zone siege cannon: devastating at range, blind up close
  ballista: U({ id: 'ballista', name: 'Valkyr Ballista', title: 'Siege Artillery', color: '#4a3a52', accent: '#e0b070', maxHp: 4600, maxEn: 90, armor: 800, mobility: 92, moveRange: 4, moveType: 'land', weapons: [WEAPONS.siegeRain, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  // act-3 anchored defender — rooted in place, still swings hard
  bastion: U({ id: 'bastion', name: 'Bastion Anchor', title: 'Rooted Defender', color: '#5a4a42', accent: '#ffd8a8', maxHp: 5600, maxEn: 80, armor: 1900, mobility: 80, moveRange: 3, moveType: 'land', weapons: [WEAPONS.siegeCrusher, WEAPONS.vulcan], pilot: PILOTS.grunt, holdPos: true }),
  sparkDrone: U({ id: 'sparkDrone', name: 'Spark Drone', title: 'Kamikaze Frame', color: '#3a2a2a', accent: '#ff5a3a', maxHp: 2600, maxEn: 60, armor: 500, mobility: 150, moveRange: 7, moveType: 'air', weapons: [WEAPONS.vulcan], pilot: PILOTS.grunt, kamikaze: true }),
  centurion: U({ id: 'centurion', name: 'Centurion', title: 'Imperial Officer', color: '#4a3a5a', accent: '#e0c0ff', maxHp: 4800, maxEn: 110, armor: 1050, mobility: 112, moveRange: 5, moveType: 'land', weapons: [WEAPONS.railgun, WEAPONS.gatling, WEAPONS.missilePods], pilot: PILOTS.centurion }),
  scorcher: U({ id: 'scorcher', name: 'Scorcher', title: 'Incendiary Frame', color: '#5a3a2a', accent: '#ff9060', maxHp: 4000, maxEn: 100, armor: 800, mobility: 96, moveRange: 5, moveType: 'land', weapons: [WEAPONS.heatRod, WEAPONS.flareDart, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  hellhound: U({ id: 'hellhound', name: 'Hellhound', title: 'Pack Hunter', color: '#4a2a30', accent: '#ff7070', maxHp: 3600, maxEn: 90, armor: 700, mobility: 118, moveRange: 8, moveType: 'land', weapons: [WEAPONS.gatling, WEAPONS.heatRod, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  stormcaller: U({ id: 'stormcaller', name: 'Stormcaller', title: 'Tempest Frame', color: '#22335a', accent: '#7ad8ff', maxHp: 4600, maxEn: 120, armor: 820, mobility: 116, moveRange: 6, moveType: 'air', weapons: [WEAPONS.stormArc, WEAPONS.gatling, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  voidChanter: U({ id: 'voidChanter', name: 'Void Chanter', title: 'Hex Adept', color: '#3a1a4a', accent: '#c080ff', maxHp: 4600, maxEn: 130, armor: 500, mobility: 140, moveRange: 5, moveType: 'air', weapons: [WEAPONS.hexBolt, WEAPONS.nullChord], pilot: PILOTS.grunt }),
  blackguard: U({ id: 'blackguard', name: 'Blackguard', title: 'Veteran Elite', color: '#1a1a22', accent: '#ff5040', maxHp: 7400, maxEn: 120, armor: 1050, mobility: 118, moveRange: 5, moveType: 'land', weapons: [WEAPONS.vulcan, WEAPONS.havocMortar, WEAPONS.hexBolt], pilot: PILOTS.grunt }),
  dragoon: U({ id: 'dragoon', name: 'Dragoon Cavalry', title: 'Mounted Gunner', color: '#4a3a1a', accent: '#ffd080', maxHp: 5200, maxEn: 110, armor: 700, mobility: 130, moveRange: 6, moveType: 'land', weapons: [WEAPONS.gatling, WEAPONS.stasisRay], pilot: PILOTS.grunt }),
  // Cpt. Vossen's personal frame — recurring ace, guaranteed salvage drop when downed
  vossDrake: U({ id: 'vossDrake', name: 'Drake Eclipse', title: 'Rival Ace', color: '#3a2030', accent: '#ff6a5a', maxHp: 9800, maxEn: 160, armor: 1350, mobility: 150, moveRange: 7, moveType: 'air', weapons: [WEAPONS.megaBeam, WEAPONS.plasmaEdge, WEAPONS.missilePods], pilot: CAMPAIGN_PILOTS.vossen, boss: true, level: 8 }),
  // the Drake defects — after being downed twice he sorties as an armed Ark ally
  vossAlly: U({ id: 'vossAlly', name: 'Drake Eclipse V', title: 'Turncoat Ace', color: '#2a3a50', accent: '#7dc9ff', maxHp: 9800, maxEn: 160, armor: 1350, mobility: 150, moveRange: 7, moveType: 'air', weapons: [WEAPONS.megaBeam, WEAPONS.plasmaEdge, WEAPONS.missilePods], pilot: CAMPAIGN_PILOTS.vossen, level: 8 }),
  // unarmed loot hauler — flees the east edge on carrier missions; big salvage when downed
  cargoMule: U({ id: 'cargoMule', name: 'Supply Mule', title: 'Loot Carrier', color: '#4a4030', accent: '#ffe8a0', maxHp: 14000, maxEn: 0, armor: 500, mobility: 70, moveRange: 3, moveType: 'land', weapons: [], pilot: PILOTS.grunt, carrier: true }),
  holoDecoy: U({ id: 'holoDecoy', name: 'Holoreplica', title: 'Hardlight Decoy', color: '#223244', accent: '#7de8ff', maxHp: 1, maxEn: 0, armor: 0, mobility: 0, moveRange: 0, moveType: 'air', weapons: [], pilot: PILOTS.grunt }),
  bloodyBaron: U({ id: 'bloodyBaron', name: 'Bloody Baron', title: 'Bounty Ace', color: '#5c1a1a', accent: '#ffb060', maxHp: 9000, maxEn: 170, armor: 1100, mobility: 155, moveRange: 8, moveType: 'air', weapons: [WEAPONS.railgun, WEAPONS.heatRod, WEAPONS.soulReaver], pilot: CAMPAIGN_PILOTS.baron, boss: true }),
};

export const ALL_UNITS: Record<string, UnitDef> = { ...UNITS, ...CAMPAIGN_UNITS };

export const PLAYER_DEF_IDS = ['valstray', 'gruntborg', 'arielis', 'zephyra'];

/** Units the player owns at a given chapter — reinforcements join at arc boundaries. */
export function rosterFor(ch: ChapterDef): string[] {
  const n = ch.rosterCh ?? ch.id;
  const r = [...PLAYER_DEF_IDS];
  if (n >= 11) r.push('raxdenR');
  if (n >= 21) r.push('vexiaX');
  return r;
}

export const MAX_SQUAD = 6;

/** Career-kill milestones: pilots learn bonus spirits as their legend grows. */
export const MILESTONE_SPIRITS: Record<string, { kills: number; spirit: SpiritId }[]> = {
  valstray: [
    { kills: 15, spirit: 'flash' },
    { kills: 35, spirit: 'fortune' },
  ],
  gruntborg: [
    { kills: 15, spirit: 'zeal' },
    { kills: 35, spirit: 'bless' },
  ],
  arielis: [
    { kills: 15, spirit: 'zeal' },
    { kills: 35, spirit: 'soul' },
  ],
  zephyra: [
    { kills: 15, spirit: 'trust' },
    { kills: 35, spirit: 'zeal' },
  ],
  raxdenR: [
    { kills: 15, spirit: 'roar' },
    { kills: 35, spirit: 'soul' },
  ],
  vexiaX: [
    { kills: 15, spirit: 'rouse' },
    { kills: 35, spirit: 'fortune' },
  ],
};

// ---------- Weapon upgrades (workshop tab) ----------

export const MAX_WEAPON_UPG = 5;
export const WEAPON_UPG_POWER = 0.08; // +8% per level
export const weaponUpgCost = (lvl: number) => 400 + lvl * 350;
export type WeaponUpgMap = Record<string, Record<string, number>>; // defId -> weaponId -> level

// ---------- Chapters ----------

export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  act: 1 | 2 | 3;
  theme: string;
  lvl: number;
  count: number;
  boss?: string;
  bossLevel?: number;
  objectiveType?: 'rout' | 'survive' | 'boss' | 'protect' | 'seize' | 'reach' | 'escort' | 'hunt';
  /** hunt missions: def id of the marked ace — its destruction wins */
  huntId?: string;
  surviveTurns?: number;
  /** rout/boss/seize/reach only: defeat if the objective isn't met by this turn */
  turnLimit?: number;
  /** hero clause: if a unit with this def id sorties and is destroyed, the mission fails */
  requiredDefId?: string;
  /** protect missions: turns the NPC convoy must stay alive */
  protectTurns?: number;
  /** seize missions: beacon tile a player unit must occupy to win (filled by genMap) */
  seizePos?: Pos;
  /** reach missions: extraction tile a player unit must reach to win (filled by genMap) */
  reachPos?: Pos;
  objective: string;
  /** SRW-point style bonus challenge — award credits when the mission ends meeting it */
  mastery?: { desc: string; maxTurns?: number; keepAll?: boolean; rewardCr: number };
  lines: { speaker: string; text: string; voice?: string }[];
  /** overrides roster gating (used by side missions whose ids are off-chapter) */
  rosterCh?: number;
  /** route variants: elite promotion chance override (default 0.15) */
  eliteChance?: number;
  /** route variant: force every non-boss spawn elite */
  eliteAll?: boolean;
  /** route variant: flat bonus credits on victory */
  rewardBonus?: number;
  /** route variant: item granted on victory */
  bonusItem?: ItemId;
  /** route flavor tag shown under the chapter name */
  routeTag?: string;
  /** VR simulator run — routing a wave spawns the next one; defeat settles the score */
  sim?: boolean;
  /** fog of war: enemy units are hidden until a player unit is within FOG_RANGE */
  fog?: boolean;
  /** a loot carrier spawns with the enemy force — kill it before it escapes east */
  carrier?: boolean;
}

export const CHAPTERS: ChapterDef[] = chaptersJson as unknown as ChapterDef[];

export function chapterOf(idx: number): ChapterDef {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, idx))];
}

// ---------- Route split (chosen after Chapter 15 — affects chapters 16-18) ----------

export type RouteId = 'a' | 'b';

export const ROUTE_INFO: Record<RouteId, { name: string; tagline: string; desc: string }> = {
  a: {
    name: 'ROUTE A — IRON VANGUARD',
    tagline: 'The frontal assault',
    desc: 'Lead the charge down the Throne corridor. Enemy patrols are heavier and elites more common — but the salvage is rich.\n\nCh.16–18: +1 enemy unit · elevated elite spawns · +700 credits per mission.',
  },
  b: {
    name: 'ROUTE B — GHOST LANCE',
    tagline: 'The silent approach',
    desc: 'Slip through the debris fields unseen. Fewer patrols guard this path, but every sentry is elite. Stealth pays in supplies.\n\nCh.16–18: −2 enemy units · more elite spawns · +400 credits + a Spirit Wing per mission · void-colony terrain.',
  },
};

/** Apply the player's route choice to a chapter. Only chapters 16-18 carry variants. */
export function applyRoute(ch: ChapterDef, route?: RouteId | null): ChapterDef {
  if (!route || ch.id < 16 || ch.id > 18) return ch;
  if (route === 'a') return { ...ch, count: ch.count + 1, eliteChance: 0.3, rewardBonus: 700, routeTag: ROUTE_INFO.a.name };
  const theme = ch.id === 18 ? 'colony' : 'void';
  return { ...ch, count: Math.max(4, ch.count - 2), theme, eliteChance: 0.4, rewardBonus: 400, bonusItem: 'spiritWing' as ItemId, routeTag: ROUTE_INFO.b.name };
}

/** The chapter as the player will actually face it — route variant applied. */
export function missionOf(idx: number, route?: RouteId | null): ChapterDef {
  return applyRoute(chapterOf(idx), route);
}

// ---------- Procedural map generation (14x10, theme-weighted, seeded) ----------

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEME_WEIGHTS: Record<string, [Terrain, number][]> = {
  earth: [['plain', 0.55], ['forest', 0.18], ['road', 0.12], ['mountain', 0.06], ['water', 0.05], ['city', 0.04]],
  forest: [['forest', 0.45], ['plain', 0.3], ['road', 0.08], ['mountain', 0.1], ['water', 0.07]],
  sea: [['plain', 0.4], ['water', 0.3], ['road', 0.1], ['city', 0.08], ['forest', 0.12]],
  city: [['city', 0.4], ['road', 0.18], ['plain', 0.28], ['forest', 0.08], ['base', 0.06]],
  mountain: [['mountain', 0.32], ['plain', 0.4], ['road', 0.1], ['forest', 0.14], ['water', 0.04]],
  base: [['base', 0.22], ['plain', 0.34], ['road', 0.2], ['city', 0.1], ['forest', 0.08], ['mountain', 0.06]],
  road: [['road', 0.2], ['plain', 0.44], ['water', 0.14], ['forest', 0.12], ['city', 0.06], ['mountain', 0.04]],
  void: [['void', 0.68], ['mountain', 0.14], ['base', 0.08], ['plain', 0.1]],
  colony: [['void', 0.36], ['city', 0.24], ['base', 0.12], ['plain', 0.14], ['road', 0.14]],
  moon: [['moon', 0.6], ['mountain', 0.18], ['base', 0.1], ['plain', 0.12]],
  fortress: [['base', 0.3], ['city', 0.22], ['road', 0.16], ['mountain', 0.12], ['plain', 0.2]],
  desert: [['desert', 0.55], ['plain', 0.16], ['mountain', 0.12], ['ruins', 0.09], ['road', 0.08]],
  snow: [['snow', 0.5], ['forest', 0.14], ['mountain', 0.14], ['plain', 0.14], ['water', 0.07]],
  volcano: [['plain', 0.28], ['lava', 0.24], ['mountain', 0.2], ['ruins', 0.12], ['desert', 0.1], ['road', 0.06]],
  ruins: [['ruins', 0.38], ['city', 0.12], ['road', 0.14], ['plain', 0.2], ['forest', 0.16]],
};

function pickTerrain(r: () => number, theme: string): Terrain {
  const w = THEME_WEIGHTS[theme] ?? THEME_WEIGHTS.earth;
  const roll = r();
  let acc = 0;
  for (const [t, p] of w) {
    acc += p;
    if (roll <= acc) return t;
  }
  return 'plain';
}

const PLAYER_SPAWNS: Pos[] = [
  { x: 1, y: 8 }, { x: 3, y: 9 }, { x: 4, y: 8 }, { x: 2, y: 9 }, { x: 0, y: 7 }, { x: 5, y: 9 },
];

/** Mid-battle enemy reinforcement waves keyed by chapter id — extra units storm in from the right edge. */
const REINFORCE: Record<number, { turn: number; comp: string[] }> = {
  7: { turn: 3, comp: ['zolda', 'zoldaAir', 'zolda'] },
  12: { turn: 3, comp: ['vexia', 'nightmare'] },
  14: { turn: 4, comp: ['vexia', 'vexia', 'nightmare'] },
  19: { turn: 3, comp: ['nightmare', 'zoldaTank'] },
  22: { turn: 4, comp: ['nightmare', 'nightmare'] },
  // p10 'Last Stand Ridge' patrol (side id 1017) — a second wave crests the pass mid-siege
  1017: { turn: 3, comp: ['zolda', 'zoldaAir', 'zoldaTank'] },
  26: { turn: 3, comp: ['nightmare', 'zoldaTank', 'nightmare'] },
  30: { turn: 2, comp: ['nightmare', 'nightmare'] },
};

/** Mid-battle ALLIED reinforcement waves — NPC militia frames storm in from the west edge to fight beside you. */
const ALLY_REINFORCE: Record<number, { turn: number; comp: { defId: string; armed?: boolean }[] }> = {
  17: { turn: 3, comp: [{ defId: 'arkmilitia', armed: true }, { defId: 'arkmilitia', armed: true }] },
  23: { turn: 4, comp: [{ defId: 'arkmilitia', armed: true }, { defId: 'arkmilitia', armed: true }] },
  27: { turn: 3, comp: [{ defId: 'arkmilitia', armed: true }, { defId: 'arkmilitia', armed: true }, { defId: 'arkmilitia', armed: true }] },
};

/** Mid-battle story beats keyed by chapter id — dialog fires at the start of that player turn. */
const MID_EVENTS: Record<number, MapDef['events']> = {
  8: [{
    turn: 2,
    lines: [
      { speaker: 'gruntborg', text: 'Contacts spreading left and right — they want us split. Nobody chases alone, we stay inside support range.' },
      { speaker: 'arielis', text: 'Confirmed on scope. Tight formation, overlapping arcs — let them come to us.' },
    ],
  }] as MapDef['events'],
  9: [{
    turn: 3,
    lines: [
      { speaker: 'zephyra', text: 'Picking up fresh signatures on the far edge — the Empire is feeding this fight, squad. Expect more.' },
      { speaker: 'valstray', text: 'Then we deny them a second wave. Hit hard, hit fast, do not let the line stall.' },
    ],
  }] as MapDef['events'],
  11: [{
    turn: 3,
    lines: [
      { speaker: 'npc_captain', text: 'Ark squadron, this is the Captain. Reinforcement corridor secured — militia frames inbound on your flank.' },
      { speaker: 'raxdenR', text: 'Hah! About time the locals joined the war. Watch my six, allies — the Fang leads the charge!' },
    ],
  }] as MapDef['events'],
  14: [{
    turn: 2,
    lines: [
      { speaker: 'vexiaX', text: 'Ray. Their ambush net is tightening — read the terrain, pull the squad through the gap before it closes.' },
      { speaker: 'valstray', text: 'Copy that, Vexia. Squad — we move as one blade. No heroics unless it counts.' },
    ],
  }] as MapDef['events'],
  1: [{
    turn: 3,
    lines: [
      { speaker: 'kargan', text: 'So the Aegis pups finally crawled out. Every meter you advance is a meter of Imperial soil you bleed on.' },
      { speaker: 'valstray', text: 'You hear that, squad? He talks like a man who has never held a line. Push on — we end this today.' },
    ],
  }] as MapDef['events'],
  5: [{
    turn: 2,
    lines: [
      { speaker: 'raxden', text: 'Surrender, little Valstray. Your frame is scrap metal the moment I decide it is.' },
      { speaker: 'valstray', text: 'Raxden, is it? Come down here and say that to my face!' },
    ],
  }] as MapDef['events'],
  10: [{
    turn: 3,
    lines: [
      { speaker: 'vexia', text: 'Their formation is holding better than I expected. All units — tighten the ring, leave no gap.' },
      { speaker: 'arielis', text: 'Energy stores at 60% here. Ray, we finish them before they finish us — move!' },
    ],
  }] as MapDef['events'],
  15: [{
    turn: 3,
    lines: [
      { speaker: 'serka', text: 'You fight for a dying world, children. The Emperor offers a seat at the table — kneel, and live.' },
      { speaker: 'npc_captain', text: 'Do not answer her! The Ark does not kneel. Weapons free, all squadrons.' },
    ],
  }] as MapDef['events'],
  20: [{
    turn: 4,
    lines: [
      { speaker: 'gruntborg', text: 'Grunborg holding at 40% armor... this is the hardest fight of my life and I am loving every second of it.' },
      { speaker: 'zephyra', text: 'Save the monologue for the debrief, old man. Reinforcements are still coming — eyes forward.' },
    ],
  }] as MapDef['events'],
  25: [{
    turn: 2,
    lines: [
      { speaker: 'warden', text: 'Beyond this door lies the Emperor himself. You will not pass while a single reactor on this station still burns.' },
      { speaker: 'valstray', text: 'Then we will put out every reactor you have. For everyone who believed we would get this far — attack!' },
    ],
  }] as MapDef['events'],
  

// recurring rival — Cpt. Vossen taunts the squad on each Drake Eclipse sortie
  3: [{
    turn: 3,
    lines: [
      { speaker: 'gruntborg', text: 'Coastal guns are targeting our flank! Keep moving — a parked frame is a dead frame.' },
      { speaker: 'valstray', text: 'Battery positions sighted. Gara, crack their armor — Mira and I will sweep the gunline.' },
    ],
  }] as MapDef['events'],
  7: [{
    turn: 3,
    lines: [
      { speaker: 'arielis', text: 'Bridge integrity is failing under shelling. Orin — if the deck gives out we lose the whole line.' },
      { speaker: 'zephyra', text: 'Then we do not let it give out. Every unit off the span by sundown, understood?' },
    ],
  }] as MapDef['events'],
  12: [{
    turn: 2,
    lines: [
      { speaker: 'arielis', text: 'Debris this thick fouls my targeting solution... wait — power signature, three o\'clock high!' },
      { speaker: 'vexia', text: 'Imperial ambush in the wreckage! Squadron, weapons free — burn a hole through the field!' },
    ],
  }] as MapDef['events'],
  17: [{
    turn: 3,
    lines: [
      { speaker: 'raxdenR', text: 'This lattice is a cage and they know it — every corridor a firing lane. Stay tight, Ark squad.' },
      { speaker: 'vexiaX', text: 'I mapped this facility for the Empire once. Rax — on your wing. We take the core and we are out before the counterstrike.' },
    ],
  }] as MapDef['events'],
  22: [{
    turn: 4,
    lines: [
      { speaker: 'gruntborg', text: 'Outer wall, inner wall, throne — they built this fortress to bury people like us. Good thing I brought a bigger drill.' },
      { speaker: 'arielis', text: 'Mortar crews spotted on the parapets. If that wall speaks, it speaks in shells — move, now!' },
    ],
  }] as MapDef['events'],
  27: [{
    turn: 3,
    lines: [
      { speaker: 'vexiaX', text: 'The Sanctum hums. Vael knows we are coming — he is letting us walk in on purpose.' },
      { speaker: 'raxdenR', text: 'Then let him watch his welcome burn. One more push — the throne is almost within reach.' },
    ],
  }] as MapDef['events'],
  6: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'So you are the stray dog the Ark keeps feeding. The Drake has not tasted a real fight in months — do not disappoint me.' },
      { speaker: 'valstray', text: 'Who is that lunatic? Fine — you want a real fight? Come and get it!' },
    ],
  }] as MapDef['events'],
  13: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'Back again, Ardent? Persistent. I respect that — it makes the wreckage more memorable.' },
      { speaker: 'valstray', text: 'You again! Didn\'t learn your lesson last time, Vossen?' },
    ],
  }] as MapDef['events'],
  19: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'Three sorties now, pup. You should know — the Eclipse keeps no mercy in its magazines.' },
      { speaker: 'arielis', text: 'He\'s faster than before — keep spacing tight and do not chase him alone!' },
    ],
  }] as MapDef['events'],
  26: [{
    turn: 2,
    lines: [
      { speaker: 'vossDrake', text: 'Last dance, Ardent. When this ends, one of us never flies again. Show me everything.' },
      { speaker: 'valstray', text: 'Everything he\'s got, squad — this is the last time we meet the Drake!' },
    ],
  }] as MapDef['events'],
  30: [{
    turn: 3,
    lines: [
      { speaker: 'emperor', text: 'I watched your ship die at Kharon and your pilots bleed across my empire. And still you come. Magnificent. Futile.' },
      { speaker: 'valstray', text: 'We crossed your whole empire to stand here, Emperor. Every burn, every scar — let it answer you now.' },
    ],
  }] as MapDef['events'],
};
/** First-contact duel banter: fires once per mission when the keyed player frame attacks the keyed boss. */
export const TURN_CHATTER: Record<string, string> = {
  'X-1': 'Ray: "Sensors are live — stay sharp out there."',
  'X-2': 'Mira: "Holding formation. Keep pushing forward."',
  'Y-1': 'Gara: "Hrnh. Still standing? Let me fix that."',
  'Z-1': 'Orin: "Squad status nominal — fight on."',
  RED: 'Rax: "Ha! Is that really all the Empire has?"',
  FALCON: 'Vee: "Sky\'s mine — the ground is yours."',
};

export const DUEL_BANTER: Record<string, { speaker: string; text: string }[]> = {
  'valstray|kargan': [
    { speaker: 'kargan', text: 'The stray dog returns. Last time you crawled away — this time I nail the coffin shut myself.' },
    { speaker: 'valstray', text: 'You talk like a monument, Draven. Monuments fall. So will you.' },
  ],
  'valstray|serka': [
    { speaker: 'serka', text: 'The Ark\'s little spearhead. I have watched you carve through my fleet — it ends in this void.' },
    { speaker: 'valstray', text: 'You watched? Then you saw how this ends. Come down and learn it up close.' },
  ],
  'valstray|emperor': [
    { speaker: 'emperor', text: 'The weapon that outlived its makers. Bow, and I will let you stand at my throne\'s foot.' },
    { speaker: 'valstray', text: 'The Ark doesn\'t bow to thrones, Vael — it burns them. For everyone you took. Now!' },
  ],
  'gruntborg|moorin': [
    { speaker: 'moorin', text: 'A siege frame challenging the General who wrote the doctrine of siege. Bold. Foolish, but bold.' },
    { speaker: 'gruntborg', text: 'Doctrine\'s only good while the wall holds, General. My mortar says otherwise.' },
  ],
  'zephyra|empress': [
    { speaker: 'empress', text: 'A repair frame in my throne room? The Ark sends its nurses to fight its wars now.' },
    { speaker: 'zephyra', text: 'Nurse? I\'m the reason my whole squad is still standing. Today I\'m the reason you fall.' },
  ],
  'vexiaX|warden': [
    { speaker: 'warden', text: 'I have held this gate for three hundred years, child of the Empire. You will not be the one to open it.' },
    { speaker: 'vexiaX', text: 'I deserted that Empire for a reason, Warden. The gate opens today — one way or another.' },
  ],
  'valstray|vossDrake': [
    { speaker: 'vossDrake', text: 'The pup who outflew my squadron twice. You want a rivalry, Ardent? Here I am — catch me if your frame can.' },
    { speaker: 'valstray', text: 'I never asked for a rival, Vossen. But if the Drake wants a leash — I am the one holding it.' },
  ],
  'valstray|bloodyBaron': [
    { speaker: 'bloodyBaron', text: 'X-1 Valstray. The bounty on this frame would buy me a small moon. Nothing personal — strictly business.' },
    { speaker: 'valstray', text: 'The Empire puts a price on everything, Baron. Mine is higher than you can afford.' },
  ],
  'vexiaX|bloodyBaron': [
    { speaker: 'bloodyBaron', text: 'The Imperial deserter. Your old command still pays for defectors — dead or alive. I prefer the paperwork light.' },
    { speaker: 'vexiaX', text: 'Then you will die doing light paperwork, Baron. I left that Empire — I do not go back in a crate.' },
  ],
  'raxdenR|emperor': [
    { speaker: 'emperor', text: 'Captain Daver. I promoted you with my own hands — and you point them at me now?' },
    { speaker: 'raxdenR', text: 'You taught me loyalty is earned, not owed. The Ark earned it. You burned it.' },
  ],
};


/** Post-mission debrief scenes keyed by chapter id — play over the HQ screen after victory. */
export const DEBRIEFS: Record<number, { speaker: string; text: string; voice?: string }[]> = {
  1: [
    { speaker: 'npc_captain', voice: 'db_1_0' as never, text: 'Good work, squad. The Kargan line is broken — the corridor to the colony road is ours.' },
    { speaker: 'valstray', voice: 'db_1_1' as never, text: 'First sortie, first scars. The Ark is still standing — that is what counts.' },
  ],
  2: [{ speaker: 'npc_mechanic', voice: 'db_2_0' as never, text: 'Frames came back dented but whole. Get me two hours and they will fly like new.' }],
  5: [
    { speaker: 'raxden', voice: 'db_5_0' as never, text: '...Heh. So this is what it is like to lose to people who actually believe in something.' },
    { speaker: 'npc_captain', voice: 'db_5_1' as never, text: 'Raxden Crimson stands down. Secure his frame — and treat the pilot with respect.' },
  ],
  10: [
    { speaker: 'npc_captain', voice: 'db_10_0' as never, text: 'Moorin is down. The orbit gate is open — next stop, the sky itself.' },
    { speaker: 'arielis', voice: 'db_10_1' as never, text: 'Whatever waits above us is worse than anything below. Rest while you can, Ray.' },
  ],
  11: [{ speaker: 'raxdenR', voice: 'db_11_0' as never, text: 'First sortie in an Ark frame. Strange — fighting for something feels heavier than fighting for a throne.' }],
  15: [
    { speaker: 'npc_captain', voice: 'db_15_0' as never, text: 'The Void Empress is down. One throne left — and the man sitting on it knows we are coming.' },
    { speaker: 'gruntborg', voice: 'db_15_1' as never, text: 'Then let us not keep the Emperor waiting.' },
  ],
  20: [
    { speaker: 'gruntborg', voice: 'db_20_0' as never, text: 'Still breathing. Still flying. Someone pour me something when we dock.' },
    { speaker: 'zephyra', voice: 'db_20_1' as never, text: 'Doctor cleared you for engine coolant only, old man.' },
  ],
  21: [{ speaker: 'vexiaX', voice: 'db_21_0' as never, text: 'Falcon Squadron is aboard, Commander. We fly for the Ark now — prove it was worth the risk.' }],
  25: [
    { speaker: 'npc_captain', voice: 'db_25_0' as never, text: 'The Gate Warden has fallen. The Throne is ahead — whatever happens next, I am proud of every one of you.' },
  ],
  30: [
    { speaker: 'npc_captain', voice: 'db_30_0' as never, text: 'It is over. The Steel Throne is empty — tonight, the empire releases its grip on the colonies.' },
    { speaker: 'valstray', voice: 'db_30_1' as never, text: 'For everyone we carried this far... we made it. All units — stand down and come home.' },
  ],
};

// ~15% of non-boss line units deploy as elites — tougher, worth more EXP and credits
function markElites(spawns: { defId: string; pos: Pos; elite?: boolean }[], rSpawn: () => number, chance = 0.15, all = false) {
  for (const s of spawns) if (!ALL_UNITS[s.defId]?.boss && (all || rSpawn() < chance)) s.elite = true;
}

// hidden salvage crates — 1-2 claimable tiles scattered mid-field
function genCrates(terrain: Terrain[][], used: Set<string>, rSpawn: () => number) {
  const crates: { pos: Pos; itemId: string }[] = [];
  const crateItems = ['repairKit', 'enCell', 'ammoBox', 'megaKit', 'spiritWing'];
  for (let i = 0, n = 1 + Math.floor(rSpawn() * 2); i < n; i++) {
    for (let t = 0; t < 60; t++) {
      const x = 3 + Math.floor(rSpawn() * 7);
      const y = Math.floor(rSpawn() * 8);
      const k = `${x},${y}`;
      const ti = TERRAIN_INFO[terrain[y]?.[x]];
      if (ti && !used.has(k) && !crates.some((c) => c.pos.x === x && c.pos.y === y) && ti.passable.land && !ti.hpDmg) {
        used.add(k);
        crates.push({ pos: { x, y }, itemId: crateItems[Math.floor(rSpawn() * crateItems.length)] });
        break;
      }
    }
  }
  return crates;
}

export function genMap(ch: ChapterDef): MapDef {
  if (ch.theme === 'custom') {
    const roster = rosterFor(ch);
    const m: MapDef = { ...MISSION_SSS, bossHoldUntil: 3, events: MID_EVENTS[ch.id], playerSpawns: MISSION_SSS.playerSpawns.slice(0, 4).map((s, i) => ({ defId: roster[i] ?? s.defId, pos: s.pos })), enemySpawns: MISSION_SSS.enemySpawns.map((s) => ({ ...s })) };
    const rSpawn = rng(ch.id * 4243);
    markElites(m.enemySpawns, rSpawn, ch.eliteChance ?? 0.15, !!ch.eliteAll);
    const used = new Set(m.enemySpawns.concat(m.playerSpawns).map((s) => `${s.pos.x},${s.pos.y}`));
    m.crates = genCrates(m.terrain, used, rSpawn);
    return m;
  }
  const r = rng(ch.id * 7919);
  const terrain: Terrain[][] = [];
  for (let y = 0; y < 10; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < 14; x++) {
      let t = pickTerrain(r, ch.theme);
      // keep spawn zones clean & passable
      const inSpawn = (x <= 3 && y >= 5) || (x >= 9 && y <= 7);
      if (inSpawn && (t === 'water' || t === 'mountain' || t === 'void' || t === 'moon' || t === 'lava')) t = ch.theme === 'void' ? 'base' : 'plain';
      row.push(t);
    }
    terrain.push(row);
  }
  // blob smoothing: grow clusters — second pass pushes same-type neighbors
  const terrain2 = terrain.map((row) => row.slice());
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 14; x++) {
      const t = terrain[y][x];
      if (r() < 0.55) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[Math.floor(r() * 4)];
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < 14 && ny >= 0 && ny < 10) terrain2[ny][nx] = t;
      }
    }
  // enemy spawns along the right edge
  const enemySpawns: { defId: string; pos: Pos; elite?: boolean }[] = [];
  const used = new Set<string>();
  const comps = enemyComp(ch);
  const rSpawn = rng(ch.id * 4243);
  for (const defId of comps) {
    const isBoss = !!ALL_UNITS[defId]?.boss;
    for (let tries = 0; tries < 40; tries++) {
      // bosses always spawn in the far top-right corner — out of the player's turn-1 reach
      const x = isBoss ? 12 + Math.floor(rSpawn() * 2) : 9 + Math.floor(rSpawn() * 5);
      const y = isBoss ? Math.floor(rSpawn() * 2) : Math.floor(rSpawn() * 8);
      const k = `${x},${y}`;
      const ti = TERRAIN_INFO[terrain2[y][x]];
      // never spawn a unit on damaging terrain
      if (!used.has(k) && ti.passable.land && !ti.hpDmg) {
        used.add(k);
        enemySpawns.push({ defId, pos: { x, y } });
        break;
      }
    }
  }
  markElites(enemySpawns, rSpawn, ch.eliteChance ?? 0.15, !!ch.eliteAll);
  // fallback: never silently drop a unit (a missing boss would auto-win a boss-objective map)
  for (const defId of comps) {
    if (enemySpawns.filter((s) => s.defId === defId).length >= comps.filter((c) => c === defId).length) continue;
    outer: for (let x = 13; x >= 9; x--)
      for (let y = 0; y < 8; y++) {
        const k = `${x},${y}`;
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (!used.has(k) && ti.passable.land && !ti.hpDmg) {
          used.add(k);
          enemySpawns.push({ defId, pos: { x, y } });
          break outer;
        }
      }
  }
  const crates = genCrates(terrain2, used, rSpawn);
  // minefields on hazardous themes — telegraphed tiles that detonate on entry
  let mines: Pos[] | undefined;
  if (ch.theme === 'ruins' || ch.theme === 'desert' || ch.theme === 'lava') {
    mines = [];
    const want = 2 + Math.floor(rSpawn() * 2);
    for (let tries = 0; tries < 60 && mines.length < want; tries++) {
      const x = 4 + Math.floor(rSpawn() * 6); // mid-field, between the two lines
      const y = 2 + Math.floor(rSpawn() * 6);
      const k = `${x},${y}`;
      if (used.has(k) || mines.some((m) => m.x === x && m.y === y)) continue;
      const ti = TERRAIN_INFO[terrain2[y][x]];
      if (!ti.passable.land || ti.hpDmg) continue;
      mines.push({ x, y });
    }
  }
  // seize chapters place the beacon deep in enemy territory — the squad must break through
  let beaconPos: Pos | undefined;
  if (ch.objectiveType === 'seize') {
    outer: for (let x = 11; x <= 13; x++)
      for (let y = 3; y <= 6; y++) {
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (ti.passable.land && !ti.hpDmg) {
          beaconPos = { x, y };
          break outer;
        }
      }
  }
  // reach chapters place the extraction tile at the far edge — get any unit there alive
  let reachPos: Pos | undefined;
  if (ch.objectiveType === 'reach') {
    outer: for (let x = 13; x >= 11; x--)
      for (let y = 0; y <= 2; y++) {
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (ti.passable.land && !ti.hpDmg) {
          reachPos = { x, y };
          break outer;
        }
      }
  }
  // protect chapters station the convoy near the deployment zone, guarded by armed militia
  let allySpawns: { defId: string; pos: Pos; armed?: boolean; escort?: boolean }[] | undefined;
  if (ch.objectiveType === 'protect') {
    outer: for (let y = 3; y <= 6; y++)
      for (let x = 0; x <= 2; x++) {
        const k = `${x},${y}`;
        const ti = TERRAIN_INFO[terrain2[y][x]];
        if (!used.has(k) && ti.passable.land && !ti.hpDmg) {
          used.add(k);
          allySpawns = [{ defId: 'arklander', pos: { x, y }, escort: true }];
          // armed escort wing: up to 2 militia on free passable tiles beside the convoy
          const candidates = [
            { x: x + 1, y },
            { x: x + 1, y: y + 1 },
            { x, y: y + 1 },
            { x: x - 1, y: y + 1 },
            { x: x + 1, y: y - 1 },
            { x, y: y - 1 },
          ];
          for (const c of candidates) {
            if ((allySpawns.length ?? 0) >= 3) break;
            const ck = `${c.x},${c.y}`;
            if (c.x < 0 || c.y < 0 || c.x >= 14 || c.y >= 10 || used.has(ck)) continue;
            const ct = TERRAIN_INFO[terrain2[c.y][c.x]];
            if (!ct.passable.land || ct.hpDmg) continue;
            used.add(ck);
            allySpawns.push({ defId: 'arkmilitia', pos: c, armed: true });
          }
          break outer;
        }
      }
  }
  return {
    id: `c${ch.id}`,
    name: `CHAPTER ${ch.id}`,
    subtitle: `${ch.name} — ${ch.subtitle}`,
    cols: 14,
    rows: 10,
    terrain: terrain2,
    objective: ch.objective,
    playerSpawns: PLAYER_SPAWNS.slice(0, rosterFor(ch).length).map((p, i) => ({ defId: rosterFor(ch)[i], pos: p })),
    enemySpawns,
    allySpawns,
    crates,
    mines,
    beaconPos,
    reachPos,
    bossHoldUntil: ch.boss ? 3 : undefined,
    reinforce: REINFORCE[ch.id],
    allyReinforce: ALLY_REINFORCE[ch.id],
    events: MID_EVENTS[ch.id],
    hazards: ch.theme === 'void' || ch.theme === 'colony' ? { every: 3, count: 2 } : ch.theme === 'lava' ? { every: 3, count: 2 } : ch.theme === 'fortress' || ch.theme === 'moon' ? { every: 4, count: 3 } : undefined,
  };
}

export function enemyComp(ch: ChapterDef): string[] {
  const comp: string[] = [];
  const fill = ch.act === 1 ? 'zolda' : ch.act === 2 ? 'vexia' : 'nightmare';
  const alt = ch.act === 1 ? 'zoldaAir' : ch.act === 2 ? 'nightmare' : 'bulwark';
  const heavy = ch.act === 1 ? 'zoldaTank' : 'nightmare';
  const fast = ch.act === 3 ? 'cataphract' : 'lancer';
  const ghost = ch.act === 3 ? 'phantom' : 'vexia';
  for (let i = 0; i < ch.count; i++) comp.push(i % 5 === 4 ? fast : i % 3 === 2 ? alt : i % 4 === 3 ? heavy : (i % 11 === 9 && ch.act >= 2) ? 'medic' : (i % 13 === 11 && ch.act === 3) ? 'ballista' : (i % 11 === 10 && ch.act === 3) ? 'bastion' : (i % 12 === 8 && ch.act >= 2) ? 'voidChanter' : (i % 10 === 5 && ch.act === 3) ? 'blackguard' : (i % 13 === 4 && ch.act >= 2) ? 'dragoon' : (i % 15 === 12 && ch.act >= 2) ? 'sparkDrone' : (i % 17 === 14 && ch.act >= 2) ? 'centurion' : (i % 19 === 16 && ch.act >= 2) ? 'scorcher' : (i % 21 === 18 && ch.act === 3) ? 'stormcaller' : (i % 23 === 20 && ch.act === 3) ? 'hellhound' : i % 7 === 6 ? ghost : fill);
  if (ch.boss) comp.push(ch.boss);
  // Cpt. Vossen ambushes the squad on these chapters — a recurring ace duelist
  if ([6, 13, 19, 26].includes(ch.id)) comp.push('vossDrake');
  return comp;
}

export function enemyLevelOf(ch: ChapterDef, defId: string): number {
  if (defId === 'vossDrake') return ch.lvl + 2; // the ace always out-levels the field
  return ch.boss === defId ? ch.bossLevel ?? ch.lvl + 2 : ch.lvl;
}

export const CHAPTERS_COUNT = CHAPTERS.length;

// ---------- Side missions (optional, unlocked by chapter progress) ----------

export interface SideMissionDef {
  id: string;
  name: string;
  desc: string;
  unlockCh: number; // chapter count reached (1-based) required to unlock
  theme: string;
  lvl: number;
  count: number;
  boss?: string;
  rewardCr: number;
  rewardItem?: ItemId;
  objectiveType?: 'rout' | 'survive' | 'seize' | 'reach' | 'escort' | 'hunt';
  huntId?: string;
  surviveTurns?: number;
  /** rout/seize objectives: defeat if not met within this many turns */
  turnLimit?: number;
  objective?: string;
  /** repeatable patrol op — never marked cleared, level scales with campaign progress */
  repeatable?: boolean;
  /** fog of war: enemy units are hidden until a player unit is within FOG_RANGE */
  fog?: boolean;
  /** hunt objective: a loot carrier joins the enemy side and flees east */
  carrier?: boolean;
}

export const SIDE_MISSIONS: SideMissionDef[] = [
  {
    id: 's1',
    name: 'Pirates of Kharon Pass',
    desc: 'Raiders are stripping a refugee convoy. Intercept them.',
    unlockCh: 4,
    theme: 'mountain',
    lvl: 5,
    count: 5,
    rewardCr: 1400,
    rewardItem: 'ammoBox',
    objectiveType: 'survive',
    surviveTurns: 5,
    objective: 'Hold the pass until the convoy clears — survive 5 turns',
  },
  {
    id: 's2',
    name: 'Dust Crown Ambush',
    desc: 'Imperial scavengers circle a wrecked carrier in the Glass Desert.',
    unlockCh: 6,
    theme: 'desert',
    lvl: 6,
    count: 6,
    rewardCr: 1600,
    rewardItem: 'repairKit',
  },
  {
    id: 's3',
    name: 'Signals in the Drift',
    desc: 'A derelict emitter is broadcasting Ark codes in the void belt.',
    unlockCh: 9,
    theme: 'void',
    lvl: 9,
    count: 7,
    rewardCr: 2000,
    rewardItem: 'enCell',
    objectiveType: 'seize',
    objective: 'Capture the derelict emitter — move any unit onto the beacon',
  },
  {
    id: 's4',
    name: 'The Frozen Relay',
    desc: 'A listening post went dark in the polar shelf — investigate.',
    unlockCh: 11,
    theme: 'snow',
    lvl: 10,
    count: 6,
    rewardCr: 1800,
    rewardItem: 'enCell',
  },
  {
    id: 's5',
    name: 'Ember Gate Raid',
    desc: 'A weapons convoy crosses the volcanic shelf. Hit it before it dives.',
    unlockCh: 13,
    theme: 'volcano',
    lvl: 12,
    count: 7,
    rewardCr: 2200,
    rewardItem: 'spiritWing',
  },
  {
    id: 's6',
    name: 'The Lost Convoy',
    desc: 'Escort fragments hold beyond the lunar shadow — go get them.',
    unlockCh: 14,
    theme: 'moon',
    lvl: 13,
    count: 6,
    boss: 'moorin',
    rewardCr: 2600,
    rewardItem: 'megaKit',
  },
  {
    id: 's7',
    name: 'Sunken Bastion',
    desc: 'An Imperial flotilla anchors over the flooded fortress. Break it.',
    unlockCh: 16,
    theme: 'sea',
    lvl: 14,
    count: 7,
    rewardCr: 2400,
    rewardItem: 'megaKit',
    objectiveType: 'survive',
    surviveTurns: 6,
    objective: 'Hold the flooded fortress until the tide lifts — survive 6 turns',
  },
  {
    id: 's8',
    name: 'Ruins of Veridia',
    desc: 'Kargan loyalists dig through the colony Ray failed to save.',
    unlockCh: 18,
    theme: 'ruins',
    lvl: 15,
    count: 7,
    boss: 'kargan',
    rewardCr: 2800,
    rewardItem: 'valorPill',
  },
  {
    id: 's9',
    name: "Falcon's Errand",
    desc: 'Vee found a weapons cache inside a dead colony. Quietly.',
    unlockCh: 21,
    theme: 'colony',
    lvl: 18,
    count: 7,
    boss: 'serka',
    rewardCr: 3400,
    rewardItem: 'spiritWing',
  },
  {
    id: 's10',
    name: "Throne's Shadow",
    desc: 'The Emperor\'s personal guard patrols the approach. Prove the squad is ready.',
    unlockCh: 25,
    theme: 'fortress',
    lvl: 19,
    count: 8,
    boss: 'warden',
    rewardCr: 3800,
    rewardItem: 'megaKit',
  },
];

/** Repeatable patrol operations — always replayable, level scales with campaign progress. */
export const PATROL_MISSIONS: SideMissionDef[] = [
  { id: 'p1', name: 'Drift Wolves Patrol', desc: 'Imperial stragglers harass the belt lanes. Run them off — again and again.', unlockCh: 7, theme: 'void', lvl: 8, count: 5, rewardCr: 800, repeatable: true, turnLimit: 7, objective: 'Rout all hostiles within 7 turns — or they slip away' },
  { id: 'p2', name: 'Ash Belt Sweep', desc: 'Scavenger packs regroup in the Glass Desert whenever we look away.', unlockCh: 13, theme: 'desert', lvl: 12, count: 6, rewardCr: 1100, repeatable: true, turnLimit: 8, objective: 'Rout all hostiles within 8 turns — or they slip away' },
  { id: 'p3', name: "Throne's Shadow Watch", desc: 'The Emperor\'s vanguard tests our perimeter. Answer in kind.', unlockCh: 20, theme: 'fortress', lvl: 17, count: 7, rewardCr: 1500, repeatable: true, turnLimit: 9, objective: 'Rout all hostiles within 9 turns — or they slip away' },
  { id: 'p4', name: 'Ghost Relay Intercept', desc: 'A dead relay station keeps pinging the throne. Reach it before the garrison does.', unlockCh: 15, theme: 'ice', lvl: 14, count: 6, rewardCr: 1250, repeatable: true, objectiveType: 'seize', turnLimit: 8, objective: 'Seize the relay beacon within 8 turns — before the Empire silences it' },
  { id: 'p5', name: 'Karn Circuit', desc: 'Cataphract wolf-packs run the caldera rim hunting convoys. Break the pack.', unlockCh: 24, theme: 'lava', lvl: 20, count: 8, rewardCr: 1800, repeatable: true, turnLimit: 10, objective: 'Rout all hostiles within 10 turns — or they slip away' },
  { id: 'p6', name: 'Marked for Death', desc: 'The Bloody Baron hunts the squad for sport — a bounty ace with a crimson frame. Turn the hunt around.', unlockCh: 22, theme: 'ruins', lvl: 18, count: 5, rewardCr: 2200, repeatable: true, objectiveType: 'hunt', huntId: 'bloodyBaron', boss: 'bloodyBaron', turnLimit: 9, objective: 'Destroy the Bloody Baron within 9 turns — or rout his pack' },
  { id: 'p7', name: 'Dead Runner', desc: 'A courier frame carries stolen throne codes through the ruins. Get a unit to the drop point before they torch it.', unlockCh: 18, theme: 'ruins', lvl: 16, count: 7, rewardCr: 1400, repeatable: true, objectiveType: 'reach', turnLimit: 8, objective: 'Reach the extraction ➤ within 8 turns — or rout the blockade' },
  { id: 'p9', name: 'Caravan Robbery', desc: 'Imperial supply mules haul throne gold through the dunes. Raid the caravan before it clears the pass.', unlockCh: 14, theme: 'desert', lvl: 13, count: 5, rewardCr: 1500, repeatable: true, carrier: true, objective: 'Destroy the Supply Mule before it escapes east — or rout the escort' },
  { id: 'p8', name: 'Night Passage', desc: 'Sensors are blind in the darkside channel. Slip a unit through the blockade line.', unlockCh: 24, theme: 'void', lvl: 20, count: 8, rewardCr: 1900, repeatable: true, objectiveType: 'reach', turnLimit: 9, fog: true, objective: 'Reach the extraction ➤ within 9 turns — sensors blind beyond 4 tiles' },
  { id: 'p6', name: 'Blackout Watch', desc: 'A sensor dead-zone hangs over the frozen relay shelf. Hostiles only reveal at knife range.', unlockCh: 11, theme: 'ice', lvl: 12, count: 6, rewardCr: 1150, repeatable: true, fog: true, objective: 'Rout all hostiles — sensors blind beyond 4 tiles' },
  { id: 'p10', name: 'Last Stand Ridge', desc: 'The ridge garrison is dug in and holding. Reinforcements keep cresting the pass — outlast them.', unlockCh: 22, theme: 'mountain', lvl: 19, count: 8, rewardCr: 1700, repeatable: true, objectiveType: 'survive', surviveTurns: 6, objective: 'Survive 6 turns against the ridge garrison' },
  { id: 'p11', name: 'The Long Haul', desc: 'A captured Imperial mule hauls Ark cargo across the dunes. Raiders want it back — get it to the east edge alive.', unlockCh: 16, theme: 'desert', lvl: 15, count: 7, rewardCr: 1600, repeatable: true, carrier: true, objectiveType: 'escort', turnLimit: 10, objective: 'Escort the Supply Mule to the east edge within 10 turns — or rout the raiders' },
];

export const ALL_SIDE_MISSIONS: SideMissionDef[] = [...SIDE_MISSIONS, ...PATROL_MISSIONS];

// ---------- Honors — persistent achievements with one-time credit bounties ----------

export interface HonorDef {
  id: string;
  name: string;
  desc: string;
  rewardCr: number;
}

export const HONORS: HonorDef[] = [
  { id: 'h_first', name: 'FIRST BLOOD', desc: 'Destroy your first hostile', rewardCr: 300 },
  { id: 'h_ace', name: 'ACE PILOT', desc: 'A pilot reaches 25 career kills', rewardCr: 800 },
  { id: 'h_master', name: 'ACE MASTERY', desc: 'A pilot reaches 50 career kills', rewardCr: 1500 },
  { id: 'h_full', name: 'FULL SQUADRON', desc: 'Six pilots hold service records', rewardCr: 600 },
  { id: 'h_marksman', name: 'MARKSMAN', desc: 'Earn 5 ★ mastery objectives', rewardCr: 1000 },
  { id: 'h_perfect', name: 'PERFECT CAMPAIGN', desc: 'Earn every ★ mastery objective', rewardCr: 5000 },
  { id: 'h_comrades', name: 'COMRADES', desc: 'Watch 8 bond events in the mess hall', rewardCr: 800 },
  { id: 'h_hearts', name: 'HEARTS OF STEEL', desc: 'Complete all romance bond events', rewardCr: 1500 },
  { id: 'h_freelance', name: 'FREELANCER', desc: 'Clear 5 side quests', rewardCr: 800 },
  { id: 'h_allclear', name: 'PEACEKEEPER', desc: 'Clear all 10 side quests', rewardCr: 2000 },
  { id: 'h_eternal', name: 'ETERNAL WAR', desc: 'Begin a New Game+ cycle', rewardCr: 3000 },
  { id: 'h_chest', name: 'WAR CHEST', desc: 'Hold 20,000 credits at once', rewardCr: 1500 },
  { id: 'h_simace', name: 'VR ACE', desc: 'Score 1500+ PTS in the VR simulator', rewardCr: 1200 },
  { id: 'h_rival', name: 'NEMESIS', desc: 'Shoot down Cpt. Vossen and the Drake Eclipse', rewardCr: 1000 },
  { id: 'h_carrier', name: 'CARAVAN KING', desc: 'Down a Supply Mule before it escapes', rewardCr: 800 },
  { id: 'h_srank', name: 'FLAWLESS ACE', desc: 'Earn S rank on 5 different missions', rewardCr: 1500 },
  { id: 'h_turncoat', name: 'TURNCOAT', desc: 'Down the Drake Eclipse twice — Vossen joins your wing', rewardCr: 1200 },
  { id: 'h_collector', name: 'ARSENAL', desc: 'Own 10 equipment parts', rewardCr: 1000 },
  { id: 'h_snowfox', name: 'WHITEOUT WALKER', desc: 'Win a mission during a blizzard turn', rewardCr: 900 },
  { id: 'h_overlord', name: 'OVERLORD', desc: 'Win any mission on EXTREME difficulty', rewardCr: 1500 },
  { id: 'h_shepherd', name: 'SHEPHERD', desc: 'Finish an escort mission with the convoy unscathed', rewardCr: 1100 },
  { id: 'h_flawless', name: 'FLAWLESS', desc: 'Clear a main chapter at Ch.10+ without losing a single unit', rewardCr: 1400 },
  { id: 'h_annihilator', name: 'ANNIHILATOR', desc: 'Land a single hit of 8000+ damage in battle', rewardCr: 1400 },
  { id: 'h_ironwill', name: 'IRON WILL', desc: 'Win a battle with a wounded pilot in the line', rewardCr: 800 },
  { id: 'h_forma', name: 'FORMA SHIFT', desc: 'Transform a frame mid-battle and win', rewardCr: 700 },
  { id: 'h_raw', name: 'RAW POWER', desc: 'Win a battle with no spirits and no items used', rewardCr: 900 },
  { id: 'h_ghost', name: 'GHOST HUNTER', desc: 'Destroy 3 Phantom Shade stealth units', rewardCr: 800 },
  { id: 'h_ghostd', name: 'GHOSTDANCER', desc: 'Score a kill while in a transformed frame', rewardCr: 700 },
  { id: 'h_mirror', name: 'HALL OF MIRRORS', desc: 'Bait an enemy strike with a holoreplica decoy', rewardCr: 600 },
  { id: 'h_ifield', name: 'BARRIER BREAKER', desc: 'Destroy a unit shielded by an I-Field barrier', rewardCr: 800 },
  { id: 'h_sig', name: 'MIRROR BREAKER', desc: 'Clear a Σ mirror wave in the VR simulator', rewardCr: 800 },
  { id: 'h_arc', name: 'CHAIN REACTION', desc: 'Kill two foes with a single chain-arc strike', rewardCr: 700 },
  { id: 'h_blast', name: 'SATURATION', desc: 'Destroy four or more foes with a single strike', rewardCr: 900 },
  { id: 'h_brink', name: 'FROM THE BRINK', desc: 'Win a mission after losing a squad frame', rewardCr: 1000 },
  { id: 'h_snipe', name: 'SHARPSHOOTER', desc: 'Destroy a hostile from 5 or more tiles away', rewardCr: 700 },
  { id: 'h_angel', name: 'GUARDIAN ANGEL', desc: 'Recover two escape pods in a single battle', rewardCr: 800 },
  { id: 'h_rush', name: 'RUSH DOWN', desc: 'Destroy a boss before it can phase-shift', rewardCr: 800 },
  { id: 'h_chain', name: 'CHAIN GANG', desc: 'Score four or more kills in a single turn', rewardCr: 700 },
  { id: 'h_surv', name: 'SURVIVOR', desc: 'Win with a squad frame at 10% HP or less still standing', rewardCr: 600 },
  { id: 'h_solo', name: 'SOLO WING', desc: 'A single squad frame scores every player kill (3 or more)', rewardCr: 900 },
  { id: 'h_arty', name: 'ARTILLERY HUNTER', desc: 'Destroy two Valkyr Ballista siege frames', rewardCr: 700 },
  { id: 'h_attr', name: 'WAR OF ATTRITION', desc: 'Win a battle lasting fifteen turns or more', rewardCr: 700 },
  { id: 'h_void', name: 'VOID WALKER', desc: 'Win a mission in the void between worlds', rewardCr: 700 },
  { id: 'h_selfs', name: 'SELF SUFFICIENT', desc: 'Win a battle without calling resupply', rewardCr: 600 },
  { id: 'h_dec', name: 'DECIMATION', desc: 'Destroy ten enemies in a single battle', rewardCr: 800 },
  { id: 'h_last', name: 'LAST MAN', desc: 'Win with a single squad frame left standing', rewardCr: 800 },
  { id: 'h_dark', name: 'DARK PASSAGE', desc: 'Win a mission under sensor fog', rewardCr: 700 },
  { id: 'h_glory', name: 'SHARED GLORY', desc: 'Win with every deployed squad frame landing a kill', rewardCr: 900 },
  { id: 'h_light', name: 'LIGHTNING', desc: 'Win a battle in three turns or fewer', rewardCr: 700 },
  { id: 'h_uns', name: 'UNSCATHED', desc: 'Win with every squad frame above 80% HP', rewardCr: 800 },
  { id: 'h_armory', name: 'ARMORY', desc: 'Own every equipment part', rewardCr: 1000 },
  { id: 'h_acecorps', name: 'ACE CORPS', desc: 'Three pilots reach ACE rank — 25+ career kills each', rewardCr: 1300 },
  { id: 'h_vet', name: 'VETERAN CORPS', desc: 'Five pilots reach ACE rank — 25+ career kills each', rewardCr: 1500 },
  { id: 'h_fullhouse', name: 'FULL HOUSE', desc: 'Deploy all seven squad frames on one sortie', rewardCr: 900 },
  { id: 'h_drone', name: 'DRONE HUNTER', desc: 'Shoot down 3 Spark Drones before they detonate', rewardCr: 700 },
  { id: 'h_duo', name: 'DYNAMIC DUO', desc: 'Two pilots each reach 30 career kills', rewardCr: 800 },
  { id: 'h_campaign', name: 'CAMPAIGNER', desc: 'Earn a battle rank on 8 missions', rewardCr: 1000 },
  { id: 'h_biggame', name: 'BIG GAME', desc: 'Destroy 5 ace or boss frames in total', rewardCr: 1200 },
  { id: 'h_aceofaces', name: 'ACE OF ACES', desc: 'Earn an S battle rank on 3 missions', rewardCr: 1500 },
  { id: 'h_fortress', name: 'FORTRESS BREAKER', desc: 'Destroy 3 siege frames (Ballista or Bastion)', rewardCr: 900 },
  { id: 'h_quartermaster', name: 'QUARTERMASTER', desc: 'Stockpile 12 consumable items at once', rewardCr: 800 },
  { id: 'h_simace', name: 'SIMULATOR ACE', desc: 'Score 3000+ in the VR Simulator', rewardCr: 1000 },
  { id: 'h_magma', name: 'MAGMA RUNNER', desc: 'Win a mission on a lava field', rewardCr: 700 },
  { id: 'h_mogul', name: 'GRAND TREASURY', desc: 'Hold 50,000 credits at once', rewardCr: 2500 },
  { id: 'h_simvet', name: 'SIM VETERAN', desc: 'Score 6000+ in the VR Simulator', rewardCr: 1500 },
  { id: 'h_storm', name: 'STORMCHASER', desc: 'Destroy 2 Stormcaller tempest frames', rewardCr: 800 },
  { id: 'h_pack', name: 'PACK BREAKER', desc: 'Destroy 2 Hellhound frames', rewardCr: 700 },
  { id: 'h_triage', name: 'FIELD TRIAGE', desc: 'Destroy 2 Vesper Choir medic frames', rewardCr: 700 },
  { id: 'h_officer', name: 'OFFICER DOWN', desc: 'Destroy 2 Centurion officer frames', rewardCr: 700 },
  { id: 'h_blackguard', name: 'DUSK BREAKER', desc: 'Destroy 3 Blackguard veteran frames', rewardCr: 800 },
  { id: 'h_dragoon', name: 'HUNTER KILLER', desc: 'Destroy 3 Dragoon Cavalry frames', rewardCr: 700 },
  { id: 'h_scorcher', name: 'ASH MAKER', desc: 'Destroy 3 Scorcher frames', rewardCr: 700 },
  { id: 'h_chanter', name: 'SILENCE THE CHOIR', desc: 'Destroy 3 Void Chanter frames', rewardCr: 800 },
  { id: 'h_elitesq', name: 'ELITE SQUADRON', desc: 'Six pilots reach 15 career kills each', rewardCr: 1200 },
  { id: 'h_rivalry', name: 'RIVALRY', desc: 'Destroy the Drake Eclipse three times', rewardCr: 1000 },
  { id: 'h_blitz', name: 'BLITZ', desc: 'Win any battle within 6 turns', rewardCr: 700 },
  { id: 'h_demigod', name: 'DEMIGOD', desc: 'One pilot reaches 60 career kills', rewardCr: 1200 },
  { id: 'h_dustrider', name: 'DUST RIDER', desc: 'Win a mission on a desert field', rewardCr: 700 },
  { id: 'h_ironmarch', name: 'IRON MARCH', desc: 'Win a mission on a fortress field', rewardCr: 700 },
  { id: 'h_lunar', name: 'LUNAR', desc: 'Win a mission on the lunar surface', rewardCr: 700 },
  { id: 'h_delver', name: 'RUIN DELVER', desc: 'Win a mission in the ancient ruins', rewardCr: 700 },
  { id: 'h_colony', name: 'STAR COLONIST', desc: 'Win a mission on the colony map', rewardCr: 700 },
  { id: 'h_returner', name: 'SECOND TOUR', desc: 'Reach New Game++ (NG+2)', rewardCr: 2000 },
  { id: 'h_reaper', name: 'REAPER COMPANY', desc: 'Log 100 total career kills across the squad', rewardCr: 1800 },
  { id: 'h_records', name: 'ACE RECORDS', desc: 'Earn S rank on 7 missions', rewardCr: 1400 },
  { id: 'h_simlord', name: 'SIM LORD', desc: 'Score 9000+ in the VR Simulator', rewardCr: 2000 },
  { id: 'h_scholar', name: 'MASTERY SCHOLAR', desc: 'Earn MASTERY ★ on 8 missions', rewardCr: 1500 },
  { id: 'h_cataclysm', name: 'CATACLYSM', desc: 'Deal 12000+ damage in a single strike', rewardCr: 2000 },
  { id: 'h_consistent', name: 'CONSISTENT', desc: 'Earn rank A or better on 10 missions', rewardCr: 1200 },
  { id: 'h_grim', name: 'GRIM HARVEST', desc: 'Reach 150 total career kills across the squad', rewardCr: 2500 },
  { id: 'h_eternal', name: 'ETERNAL PILGRIM', desc: 'Reach New Game+3', rewardCr: 3000 },
  { id: 'h_omega', name: 'OMEGA PURGE', desc: 'Destroy 14+ enemy frames in a single battle', rewardCr: 1800 },
  { id: 'h_centurion', name: 'CENTURION', desc: 'One pilot reaches 100 career kills', rewardCr: 4000 },
  { id: 'h_warchest', name: 'WAR CHEST', desc: 'Hold 100,000 credits', rewardCr: 3000 },
  { id: 'h_forge', name: 'ELITE FORGE', desc: 'Four pilots reach 35 career kills', rewardCr: 2200 },
  { id: 'h_legend', name: 'LEGEND', desc: 'Earn S rank on 12 missions', rewardCr: 2500 },
  { id: 'h_sweeper', name: 'IRON SWEEP', desc: 'Earn rank B or better on 15 missions', rewardCr: 1600 },
  { id: 'h_stockpile', name: 'STOCKPILE', desc: 'Hold 20 consumable items at once', rewardCr: 1800 },
  { id: 'h_triumvirate', name: 'TRIUMVIRATE', desc: 'Three pilots reach 25 career kills', rewardCr: 1600 },
  { id: 'h_grandmaster', name: 'GRANDMASTER', desc: 'Earn MASTERY ★ on 15 missions', rewardCr: 2500 },
  { id: 'h_warpath', name: 'WARPATH', desc: 'Two hundred total career kills across the squad', rewardCr: 3000 },
  { id: 'h_devastator', name: 'DEVASTATOR', desc: 'Land a single hit of 20000 damage', rewardCr: 2000 },
  { id: 'h_twinaces', name: 'TWIN ACES', desc: 'Two pilots reach 50 career kills', rewardCr: 2200 },
  { id: 'h_tycoon', name: 'TYCOON', desc: 'Hold 200000 credits', rewardCr: 4000 },
  { id: 'h_bloodbath', name: 'BLOODBATH', desc: 'Destroy 18 enemies in a single battle', rewardCr: 1500 },
  { id: 'h_paragon', name: 'PARAGON', desc: 'Earn battle rank S in 18 missions', rewardCr: 2500 },
  { id: 'h_apex', name: 'APEX PILOT', desc: 'Score 15000+ in the VR Simulator', rewardCr: 4000 },
  { id: 'h_perfectionist', name: 'PERFECTIONIST', desc: 'Earn MASTERY ★ in 25 missions', rewardCr: 3500 },
  { id: 'h_frontier', name: 'FRONTIER SWEEP', desc: 'Clear 8 side missions', rewardCr: 2200 },
  { id: 'h_hoarder', name: 'HOARDER', desc: 'Stockpile 40 consumable items', rewardCr: 2000 },
  { id: 'h_tide', name: 'TIDEBREAKER', desc: 'Win a mission on the open sea', rewardCr: 800 },
  { id: 'h_ashwalker', name: 'ASH WALKER', desc: 'Win a mission on a volcano map', rewardCr: 800 },
  { id: 'h_summit', name: 'SUMMIT', desc: 'Win a mission on a mountain map', rewardCr: 800 },
  { id: 'h_frostbound', name: 'FROSTBOUND', desc: 'Win a mission on an ice map', rewardCr: 800 },
  { id: 'h_company', name: 'FULL COMPANY', desc: 'Every pilot earns 25+ career kills', rewardCr: 3000 },
  { id: 'h_scrapking', name: 'SCRAP KING', desc: 'Earn 30,000 salvage credits', rewardCr: 1800 },
  { id: 'h_virtuoso', name: 'VIRTUOSO', desc: 'Score 12,000+ in the VR Simulator', rewardCr: 2500 },
  { id: 'h_annihilation', name: 'ANNIHILATION', desc: 'Destroy 25 frames in a single battle', rewardCr: 2800 },
  { id: 'h_apexstrike', name: 'APEX STRIKE', desc: 'Land a single hit of 30,000+ damage', rewardCr: 3000 },
  { id: 'h_cartographer', name: 'CARTOGRAPHER', desc: 'Clear 15 side missions', rewardCr: 2600 },
  { id: 'h_marksman', name: 'ROYAL MARKSMAN', desc: 'Earn S rank on 22 missions', rewardCr: 3000 },
  { id: 'h_longwar', name: 'ATTRITION', desc: 'Win a battle that lasts 15+ turns', rewardCr: 1600 },
  { id: 'h_simdeity', name: 'SIM DEITY', desc: 'Score 20000+ in the VR Simulator', rewardCr: 4500 },
  { id: 'h_graveyard', name: 'GRAVEMAKER', desc: 'Reach 300 total career kills across the squad', rewardCr: 4500 },
  { id: 'h_partsbaron', name: 'PARTS BARON', desc: 'Own 20 different equipment parts', rewardCr: 2200 },
  { id: 'h_platinum', name: 'PLATINUM', desc: 'Earn A rank or better on 20 missions', rewardCr: 3500 },
  { id: 'h_frontiermaster', name: 'FRONTIER MASTER', desc: 'Clear 20 side missions', rewardCr: 3400 },
  { id: 'h_masterclass', name: 'MASTER CLASS', desc: 'Earn MASTERY ★ on 20 missions', rewardCr: 3600 },
  { id: 'h_apocalypse', name: 'APOCALYPSE', desc: 'Land a single hit of 50000+ damage', rewardCr: 6000 },
  { id: 'h_strider', name: 'ETERNAL STRIDER', desc: 'Reach NG+4', rewardCr: 3500 },
  { id: 'h_salvagebaron', name: 'SALVAGE BARON', desc: 'Accumulate 60000 salvage credits', rewardCr: 3600 },
  { id: 'h_marathon', name: 'MARATHON', desc: 'Win a battle lasting 25 or more turns', rewardCr: 2500 },
  { id: 'h_imperator', name: 'IMPERATOR', desc: 'Earn battle rank S in 28 missions', rewardCr: 5000 },
  { id: 'h_quartermaster', name: 'QUARTERMASTER', desc: 'Own 35 different parts', rewardCr: 3200 },
  { id: 'h_vrsaint', name: 'VR SAINT', desc: 'Score 25000+ in the VR Simulator', rewardCr: 5000 },
  { id: 'h_warlegion', name: 'WAR LEGION', desc: '400 total career kills across the squad', rewardCr: 4500 },
  { id: 'h_dominator', name: 'DOMINATOR', desc: 'Earn A rank or better on 25 missions', rewardCr: 3800 },
  { id: 'h_ranger', name: 'RANGER', desc: 'Clear 25 side missions', rewardCr: 4200 },
  { id: 'h_elitecorps', name: 'ELITE CORPS', desc: 'Six pilots reach 40 career kills', rewardCr: 5000 },
  { id: 'h_transcendent', name: 'TRANSCENDENT', desc: 'Earn MASTERY ★ in 30 missions', rewardCr: 5500 },
  { id: 'h_overlordvr', name: 'OVERLORD', desc: 'Score 30000+ in the VR Simulator', rewardCr: 6000 },
  { id: 'h_armory', name: 'ARMORY', desc: 'Own 45 different parts', rewardCr: 6500 },
  { id: 'h_genocide', name: 'GENOCIDE', desc: 'Destroy 500 frames across the squad', rewardCr: 7000 },
  { id: 'h_duelking', name: 'DUEL KING', desc: 'One pilot reaches 150 career kills', rewardCr: 8000 },
  { id: 'h_immortal', name: 'IMMORTAL', desc: 'Win a battle lasting 30+ turns', rewardCr: 8500 },
  { id: 'h_colossus', name: 'COLOSSUS', desc: 'Land a single hit for 75000+ damage', rewardCr: 9000 },
  { id: 'h_demigod', name: 'DEMIGOD', desc: 'Earn S rank on 35 missions', rewardCr: 10000 },
  { id: 'h_valhalla', name: 'VALHALLA', desc: 'Reach NG+2 or beyond', rewardCr: 12000 },
  { id: 'h_wareternal', name: 'WAR ETERNAL', desc: 'Score 750 total career kills across the squad', rewardCr: 9000 },
  { id: 'h_harbinger', name: 'HARBINGER', desc: 'One pilot reaches 200 career kills', rewardCr: 8000 },
  { id: 'h_requiem', name: 'REQUIEM', desc: 'Score 1000 total career kills across the squad', rewardCr: 11000 },
  { id: 'h_sovereign', name: 'SOVEREIGN', desc: 'Earn MASTERY star on 35 missions', rewardCr: 12000 },
  { id: 'h_deus', name: 'DEUS', desc: 'Reach NG+5 or beyond', rewardCr: 13000 },
  { id: 'h_eternalflame', name: 'ETERNAL FLAME', desc: 'Land a single blow of 100,000+ damage', rewardCr: 14000 },
  { id: 'h_conqueror', name: 'CONQUEROR', desc: 'Earn S rank on 40 missions', rewardCr: 15000 },
  { id: 'h_singularity', name: 'SINGULARITY', desc: 'Earn MASTERY star on 40 missions', rewardCr: 16000 },
  { id: 'h_obsidian', name: 'OBSIDIAN', desc: 'Reach NG+6 or beyond', rewardCr: 17000 },
  { id: 'h_mythic', name: 'MYTHIC', desc: 'One pilot reaches 300 career kills', rewardCr: 18000 },
  { id: 'h_eternum', name: 'ETERNUM', desc: 'One pilot reaches 400 career kills', rewardCr: 19000 },
  { id: 'h_godhand', name: 'GODHAND', desc: 'Land a single blow of 150,000+ damage', rewardCr: 20000 },
  { id: 'h_apexgod', name: 'APEX GOD', desc: 'Reach NG+7 or beyond', rewardCr: 22000 },
  { id: 'h_omegatitan', name: 'OMEGA TITAN', desc: 'Earn S rank on 50 missions', rewardCr: 24000 },
  { id: 'h_apexphantom', name: 'APEX PHANTOM', desc: 'One pilot reaches 500 career kills', rewardCr: 26000 },
  { id: 'h_voidregent', name: 'VOID REGENT', desc: 'Earn MASTERY ★ on 45 missions', rewardCr: 28000 },
  { id: 'h_seraphim', name: 'SERAPHIM', desc: 'Reach NG+8 or beyond', rewardCr: 30000 },
  { id: 'h_godslayer', name: 'GODSLAYER', desc: 'Earn S rank on 60 missions', rewardCr: 32000 },
  { id: 'h_immovable', name: 'IMMOVABLE', desc: 'Earn MASTERY ★ on 50 missions', rewardCr: 34000 },
  { id: 'h_apocalypse', name: 'APOCALYPSE GOD', desc: 'Land a single blow of 200,000+ damage', rewardCr: 36000 },
  { id: 'h_exterminatus', name: 'EXTERMINATUS', desc: 'Land a single blow of 300,000+ damage', rewardCr: 38000 },
  { id: 'h_unmaker', name: 'UNMAKER', desc: 'Earn MASTERY ★ on 60 missions', rewardCr: 40000 },
  { id: 'h_overgod', name: 'OVERGOD', desc: 'Reach NG+9 or beyond', rewardCr: 42000 },
  { id: 'h_peacemaker', name: 'PEACEMAKER', desc: 'Clear 30 side missions', rewardCr: 44000 },
  { id: 'h_warmonger', name: 'WARMONGER', desc: '1500 total career kills across the squad', rewardCr: 46000 },
  { id: 'h_ragnarok', name: 'RAGNAROK', desc: 'Land a single hit of 500,000+ damage', rewardCr: 50000 },
  { id: 'h_immaculate', name: 'IMMACULATE', desc: 'Earn S rank on 75 missions', rewardCr: 52000 },
  { id: 'h_divine', name: 'DIVINE', desc: 'Reach NG+10 or beyond', rewardCr: 54000 },
  { id: 'h_infinite', name: 'INFINITE', desc: 'Earn MASTERY ★ on 75 missions', rewardCr: 56000 },
  { id: 'h_pantheon', name: 'PANTHEON', desc: '2000 total career kills across the squad', rewardCr: 58000 },
  { id: 'h_omniscient', name: 'OMNISCIENT', desc: 'Reach NG+11 or beyond', rewardCr: 60000 },
  { id: 'h_warlord', name: 'WARLORD', desc: 'One pilot reaches 750 career kills', rewardCr: 62000 },
  { id: 'h_arsenal', name: 'ARSENAL', desc: 'Own 60 different parts', rewardCr: 64000 },
  { id: 'h_tycoon', name: 'TYCOON', desc: 'Hold 250,000 credits at once', rewardCr: 66000 },
  { id: 'h_cosmic', name: 'COSMIC', desc: 'Land a single blow of 1,000,000+ damage', rewardCr: 68000 },
  { id: 'h_vrgod', name: 'VR GOD', desc: 'Score 40,000+ in the VR Simulator', rewardCr: 70000 },
  { id: 'h_warmachine', name: 'WARMACHINE', desc: '3000 total career kills across the squad', rewardCr: 72000 },
  { id: 'h_soulforge', name: 'SOULFORGE', desc: 'Witness 18 bond events', rewardCr: 74000 },
  { id: 'h_kingslayer', name: 'KINGSLAYER', desc: 'Destroy 10 boss frames across your career', rewardCr: 76000 },
  { id: 'h_hoarder', name: 'HOARDER', desc: 'Hold 60 items in the inventory at once', rewardCr: 78000 },
  { id: 'h_veterano', name: 'VETERANO', desc: 'Clear 30 distinct missions', rewardCr: 80000 },
  { id: 'h_regicide', name: 'REGICIDE', desc: 'Destroy 15 boss frames across your career', rewardCr: 82000 },
  { id: 'h_aceofgods', name: 'ACE OF GODS', desc: 'One pilot reaches 1000 career kills', rewardCr: 84000 },
  { id: 'h_aeon', name: 'AEON', desc: 'Reach NG+12 or beyond', rewardCr: 86000 },
  { id: 'h_emperor', name: 'EMPEROR', desc: 'Destroy 20 boss frames across your career', rewardCr: 88000 },
  { id: 'h_magnate', name: 'MAGNATE', desc: 'Hold 500,000 credits at once', rewardCr: 90000 },
  { id: 'h_paladin', name: 'PALADIN', desc: 'Clear 40 distinct missions', rewardCr: 92000 },
  { id: 'h_warpaint', name: 'WARPAINT', desc: '4000 total career kills across the squad', rewardCr: 94000 },
  { id: 'h_liberator', name: 'LIBERATOR', desc: 'Clear 40 side missions', rewardCr: 96000 },
  { id: 'h_millennium', name: 'MILLENNIUM', desc: 'One pilot reaches 1000 career kills', rewardCr: 98000 },
  { id: 'h_butcherking', name: 'BUTCHER KING', desc: '5000 total career kills across the squad', rewardCr: 99000 },
  { id: 'h_vrapotheosis', name: 'VR APOTHEOSIS', desc: 'Score 50,000+ in the VR Simulator', rewardCr: 99000 },
  { id: 'h_hoardlord', name: 'HOARDLORD', desc: 'Hold 500,000 credits at once', rewardCr: 100000 },
  { id: 'h_peacelord', name: 'PEACELORD', desc: 'Clear 50 side missions', rewardCr: 100000 },
  { id: 'h_centurion', name: 'CENTURION', desc: 'Fly 50 ranked missions', rewardCr: 100000 },
  { id: 'h_warehouse', name: 'WAREHOUSE', desc: 'Hold 80 items in inventory at once', rewardCr: 100000 },
  { id: 'h_armorylord', name: 'ARMORY LORD', desc: 'Own 75 different parts', rewardCr: 100000 },
  { id: 'h_paradox', name: 'PARADOX', desc: 'Reach NG+12', rewardCr: 100000 },
  { id: 'h_purgeking', name: 'PURGE KING', desc: '6000 total career kills across the squad', rewardCr: 100000 },
  { id: 'h_sage', name: 'SAGE', desc: 'Earn MASTERY ★ on 70 missions', rewardCr: 100000 },
  { id: 'h_dreamteam', name: 'DREAM TEAM', desc: 'Every pilot reaches 150 career kills', rewardCr: 100000 },
  { id: 'h_genocider', name: 'GENOCIDER', desc: '7500 total career kills across the squad', rewardCr: 100000 },
  { id: 'h_paragon', name: 'PARAGON', desc: 'Reach NG+15', rewardCr: 100000 },
  { id: 'h_godhunter', name: 'GODHUNTER', desc: 'Destroy 20 bosses across your career', rewardCr: 100000 },
  { id: 'h_simulator', name: 'SIMULATOR', desc: 'Score 75,000+ in the VR Simulator', rewardCr: 100000 },
  { id: 'h_deity', name: 'DEITY', desc: 'Reach NG+18', rewardCr: 100000 },
  { id: 'h_warpath2', name: 'WARPATH II', desc: 'Squad reaches 10,000 total career kills', rewardCr: 100000 },
  { id: 'h_pinnacle', name: 'PINNACLE', desc: 'Earn S rank on 80 missions', rewardCr: 100000 },
  { id: 'h_apexlegion', name: 'APEX LEGION', desc: 'All pilots reach 250 career kills each', rewardCr: 100000 },
  { id: 'h_stockpile', name: 'STOCKPILE', desc: 'Hold 90 items in the inventory at once', rewardCr: 100000 },
  { id: 'h_godhunter2', name: 'GODHUNTER II', desc: 'Destroy 30 bosses across your career', rewardCr: 100000 },
  { id: 'h_immortal2', name: 'IMMORTAL II', desc: 'Reach MASTERY ★ on 80 missions', rewardCr: 100000 },
];

/** Whether an honor's condition is currently met. */
export function honorDone(h: HonorDef, s: { pilotProg: Record<string, { kills?: number }>; masteryDone: number[]; bondSeen: string[]; sideCleared: string[]; ngPlus: number; credits: number; simBest?: number; killsByDef?: Record<string, number>; missionRank?: Record<number, 'S' | 'A' | 'B' | 'C'>; partsOwned?: string[]; inventory?: Record<string, number>; snowFox?: boolean; extremeWon?: boolean; shepHon?: boolean; flawlessHon?: boolean; maxHitEver?: number; turn?: number;
missionCh?: { theme?: string; fog?: boolean };
usedResupply?: boolean;
salvageCr?: number;
kills?: number;
units?: { def: { id: string; maxHp?: number }; kills: number; alive: boolean; side: string; hp?: number; wounded?: boolean; npc?: boolean }[]; transformed?: boolean; usedSupport?: boolean; altKill?: boolean; decoyHit?: boolean; iFieldKill?: boolean; mirrorWon?: boolean; arcKill?: boolean; blastKill?: boolean; lostAlly?: boolean; snipeKill?: boolean; rescuedPods?: string[]; bossRush?: boolean; chainCount?: number }): boolean {
  const kills = Object.values(s.pilotProg);
  const totalKills = kills.reduce((n, p) => n + (p.kills ?? 0), 0);
  const maxKills = kills.reduce((n, p) => Math.max(n, p.kills ?? 0), 0);
  switch (h.id) {
    case 'h_first':
      return totalKills >= 1;
    case 'h_ace':
      return maxKills >= 25;
    case 'h_master':
      return maxKills >= 50;
    case 'h_full':
      return kills.length >= 6;
    case 'h_marksman':
      return s.masteryDone.length >= 5;
    case 'h_perfect':
      return s.masteryDone.length >= CHAPTERS.filter((c) => c.mastery).length;
    case 'h_comrades':
      return s.bondSeen.length >= 8;
    case 'h_hearts':
      return s.bondSeen.length >= 12;
    case 'h_freelance':
      return s.sideCleared.length >= 5;
    case 'h_allclear':
      return s.sideCleared.length >= SIDE_MISSIONS.length;
    case 'h_eternal':
      return s.ngPlus >= 1;
    case 'h_chest':
      return s.credits >= 20000;
    case 'h_simace':
      return (s.simBest ?? 0) >= 1500;
    case 'h_rival':
      return (s as { vossenDefeated?: boolean }).vossenDefeated === true;
    case 'h_carrier':
      return (s.killsByDef?.cargoMule ?? 0) >= 1;
    case 'h_srank':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 5;
    case 'h_turncoat':
      return (s.killsByDef?.vossDrake ?? 0) >= 2;
    case 'h_collector':
      return (s.partsOwned ?? []).length >= 10;
    case 'h_snowfox':
      return s.snowFox === true;
    case 'h_overlord':
      return s.extremeWon === true;
    case 'h_shepherd':
      return s.shepHon === true;
    case 'h_flawless':
      return s.flawlessHon === true;
    case 'h_acecorps':
      return kills.filter((p) => (p.kills ?? 0) >= 25).length >= 3;
    case 'h_vet':
      return kills.filter((p) => (p.kills ?? 0) >= 25).length >= 5;
    case 'h_fullhouse':
      return (s.units ?? []).filter((u) => u.side === 'player' && !u.npc).length >= 7;
    case 'h_drone':
      return (s.killsByDef?.sparkDrone ?? 0) >= 3;
    case 'h_duo':
      return kills.filter((p) => (p.kills ?? 0) >= 30).length >= 2;
    case 'h_campaign':
      return Object.keys(s.missionRank ?? {}).length >= 8;
    case 'h_biggame':
      return Object.entries(s.killsByDef ?? {}).filter(([id]) => ALL_UNITS[id]?.boss).reduce((n, [, k]) => n + k, 0) >= 5;
    case 'h_aceofaces':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 3;
    case 'h_fortress':
      return ((s.killsByDef ?? {}).ballista ?? 0) + ((s.killsByDef ?? {}).bastion ?? 0) >= 3;
    case 'h_quartermaster':
      return Object.values(s.inventory ?? {}).reduce((n, c) => n + (c ?? 0), 0) >= 12;
    case 'h_simace':
      return (s.simBest ?? 0) >= 3000;
    case 'h_magma':
      return s.missionCh?.theme === 'lava';
    case 'h_mogul':
      return s.credits >= 50000;
    case 'h_simvet':
      return (s.simBest ?? 0) >= 6000;
    case 'h_storm':
      return (s.killsByDef?.stormcaller ?? 0) >= 2;
    case 'h_pack':
      return (s.killsByDef?.hellhound ?? 0) >= 2;
    case 'h_triage':
      return (s.killsByDef?.medic ?? 0) >= 2;
    case 'h_officer':
      return (s.killsByDef?.centurion ?? 0) >= 2;
    case 'h_blackguard':
      return (s.killsByDef?.blackguard ?? 0) >= 3;
    case 'h_dragoon':
      return (s.killsByDef?.dragoon ?? 0) >= 3;
    case 'h_scorcher':
      return (s.killsByDef?.scorcher ?? 0) >= 3;
    case 'h_chanter':
      return (s.killsByDef?.voidChanter ?? 0) >= 3;
    case 'h_elitesq':
      return kills.filter((p) => (p.kills ?? 0) >= 15).length >= 6;
    case 'h_rivalry':
      return (s.killsByDef?.vossDrake ?? 0) >= 3;
    case 'h_blitz':
      return (s.turn ?? 99) <= 6;
    case 'h_demigod':
      return kills.some((p) => (p.kills ?? 0) >= 60);
    case 'h_dustrider':
      return s.missionCh?.theme === 'desert';
    case 'h_ironmarch':
      return s.missionCh?.theme === 'fortress';
    case 'h_lunar':
      return s.missionCh?.theme === 'moon';
    case 'h_delver':
      return s.missionCh?.theme === 'ruins';
    case 'h_colony':
      return s.missionCh?.theme === 'colony';
    case 'h_returner':
      return s.ngPlus >= 2;
    case 'h_reaper':
      return Object.values(s.killsByDef ?? {}).reduce((a, b) => a + b, 0) >= 100;
    case 'h_records':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 7;
    case 'h_simlord':
      return (s.simBest ?? 0) >= 9000;
    case 'h_scholar':
      return s.masteryDone.length >= 8;
    case 'h_cataclysm':
      return (s.maxHitEver ?? 0) >= 12000;
    case 'h_consistent':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'A' || r === 'S').length >= 10;
    case 'h_grim':
      return Object.values(s.killsByDef ?? {}).reduce((a, b) => a + b, 0) >= 150;
    case 'h_eternal':
      return s.ngPlus >= 3;
    case 'h_omega':
      return (s.kills ?? 0) >= 14;
    case 'h_centurion':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 100);
    case 'h_warchest':
      return s.credits >= 100000;
    case 'h_forge':
      return Object.values(s.pilotProg ?? {}).filter((p) => (p.kills ?? 0) >= 35).length >= 4;
    case 'h_legend':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 12;
    case 'h_sweeper':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S' || r === 'A' || r === 'B').length >= 15;
    case 'h_stockpile':
      return Object.values(s.inventory ?? {}).reduce((a, b) => a + b, 0) >= 20;
    case 'h_triumvirate':
      return Object.values(s.pilotProg ?? {}).filter((p) => (p.kills ?? 0) >= 25).length >= 3;
    case 'h_grandmaster':
      return (s.masteryDone ?? []).length >= 15;
    case 'h_warpath':
      return Object.values(s.pilotProg ?? {}).reduce((a, p) => a + (p.kills ?? 0), 0) >= 200;
    case 'h_devastator':
      return (s.maxHitEver ?? 0) >= 20000;
    case 'h_twinaces':
      return Object.values(s.pilotProg ?? {}).filter((p) => (p.kills ?? 0) >= 50).length >= 2;
    case 'h_tycoon':
      return s.credits >= 200000;
    case 'h_bloodbath':
      return (s.kills ?? 0) >= 18;
    case 'h_paragon':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 18;
    case 'h_apex':
      return (s.simBest ?? 0) >= 15000;
    case 'h_perfectionist':
      return (s.masteryDone ?? []).length >= 25;
    case 'h_frontier':
      return (s.sideCleared ?? []).length >= 8;
    case 'h_hoarder':
      return Object.values(s.inventory ?? {}).reduce((a, b) => a + b, 0) >= 40;
    case 'h_tide':
      return s.missionCh?.theme === 'sea';
    case 'h_ashwalker':
      return s.missionCh?.theme === 'volcano';
    case 'h_summit':
      return s.missionCh?.theme === 'mountain';
    case 'h_frostbound':
      return s.missionCh?.theme === 'ice';
    case 'h_company':
      return Object.values(s.pilotProg ?? {}).length >= 7 && Object.values(s.pilotProg ?? {}).every((p) => (p.kills ?? 0) >= 25);
    case 'h_scrapking':
      return (s.salvageCr ?? 0) >= 30000;
    case 'h_virtuoso':
      return (s.simBest ?? 0) >= 12000;
    case 'h_annihilation':
      return (s.kills ?? 0) >= 25;
    case 'h_apexstrike':
      return (s.maxHitEver ?? 0) >= 30000;
    case 'h_cartographer':
      return (s.sideCleared ?? []).length >= 15;
    case 'h_marksman':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 22;
    case 'h_longwar':
      return (s.turn ?? 0) >= 15;
    case 'h_simdeity':
      return (s.simBest ?? 0) >= 20000;
    case 'h_graveyard':
      return totalKills >= 300;
    case 'h_partsbaron':
      return (s.partsOwned ?? []).length >= 20;
    case 'h_platinum':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S' || r === 'A').length >= 20;
    case 'h_frontiermaster':
      return (s.sideCleared ?? []).length >= 20;
    case 'h_masterclass':
      return (s.masteryDone ?? []).length >= 20;
    case 'h_apocalypse':
      return (s.maxHitEver ?? 0) >= 50000;
    case 'h_strider':
      return (s.ngPlus ?? 0) >= 4;
    case 'h_salvagebaron':
      return (s.salvageCr ?? 0) >= 60000;
    case 'h_marathon':
      return (s.turn ?? 0) >= 25;
    case 'h_imperator':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 28;
    case 'h_quartermaster':
      return (s.partsOwned ?? []).length >= 35;
    case 'h_vrsaint':
      return (s.simBest ?? 0) >= 25000;
    case 'h_warlegion':
      return totalKills >= 400;
    case 'h_dominator':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S' || r === 'A').length >= 25;
    case 'h_ranger':
      return (s.sideCleared ?? []).length >= 25;
    case 'h_elitecorps':
      return Object.values(s.pilotProg ?? {}).filter((p) => (p.kills ?? 0) >= 40).length >= 6;
    case 'h_transcendent':
      return s.masteryDone.length >= 30;
    case 'h_overlordvr':
      return (s.simBest ?? 0) >= 30000;
    case 'h_armory':
      return (s.partsOwned ?? []).length >= 45;
    case 'h_genocide':
      return totalKills >= 500;
    case 'h_duelking':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 150);
    case 'h_immortal':
      return (s.turn ?? 0) >= 30;
    case 'h_colossus':
      return (s.maxHitEver ?? 0) >= 75000;
    case 'h_demigod':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 35;
    case 'h_valhalla':
      return (s.ngPlus ?? 0) >= 2;
    case 'h_wareternal':
      return totalKills >= 750;
    case 'h_harbinger':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 200);
    case 'h_requiem':
      return totalKills >= 1000;
    case 'h_sovereign':
      return (s.masteryDone?.length ?? 0) >= 35;
    case 'h_deus':
      return (s.ngPlus ?? 0) >= 5;
    case 'h_eternalflame':
      return (s.maxHitEver ?? 0) >= 100000;
    case 'h_conqueror':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 40;
    case 'h_singularity':
      return (s.masteryDone?.length ?? 0) >= 40;
    case 'h_obsidian':
      return (s.ngPlus ?? 0) >= 6;
    case 'h_mythic':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 300);
    case 'h_eternum':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 400);
    case 'h_godhand':
      return (s.maxHitEver ?? 0) >= 150000;
    case 'h_apexgod':
      return (s.ngPlus ?? 0) >= 7;
    case 'h_omegatitan':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 50;
    case 'h_apexphantom':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 500);
    case 'h_voidregent':
      return (s.masteryDone?.length ?? 0) >= 45;
    case 'h_seraphim':
      return (s.ngPlus ?? 0) >= 8;
    case 'h_godslayer':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 60;
    case 'h_immovable':
      return (s.masteryDone?.length ?? 0) >= 50;
    case 'h_apocalypse':
      return (s.maxHitEver ?? 0) >= 200000;
    case 'h_exterminatus':
      return (s.maxHitEver ?? 0) >= 300000;
    case 'h_unmaker':
      return (s.masteryDone?.length ?? 0) >= 60;
    case 'h_overgod':
      return (s.ngPlus ?? 0) >= 9;
    case 'h_peacemaker':
      return (s.sideCleared?.length ?? 0) >= 30;
    case 'h_warmonger':
      return totalKills >= 1500;
    case 'h_ragnarok':
      return (s.maxHitEver ?? 0) >= 500000;
    case 'h_immaculate':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 75;
    case 'h_divine':
      return (s.ngPlus ?? 0) >= 10;
    case 'h_infinite':
      return (s.masteryDone?.length ?? 0) >= 75;
    case 'h_pantheon':
      return totalKills >= 2000;
    case 'h_omniscient':
      return (s.ngPlus ?? 0) >= 11;
    case 'h_warlord':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 750);
    case 'h_arsenal':
      return (s.partsOwned ?? []).length >= 60;
    case 'h_tycoon':
      return (s.credits ?? 0) >= 250000;
    case 'h_cosmic':
      return (s.maxHitEver ?? 0) >= 1000000;
    case 'h_vrgod':
      return (s.simBest ?? 0) >= 40000;
    case 'h_warmachine':
      return totalKills >= 3000;
    case 'h_soulforge':
      return s.bondSeen.length >= 18;
    case 'h_kingslayer':
      return Object.entries(s.killsByDef ?? {}).filter(([id]) => ALL_UNITS[id]?.boss).reduce((n, [, k]) => n + k, 0) >= 10;
    case 'h_hoarder':
      return Object.values(s.inventory ?? {}).reduce((a, b) => a + b, 0) >= 60;
    case 'h_veterano':
      return Object.keys(s.missionRank ?? {}).length >= 30;
    case 'h_regicide':
      return Object.entries(s.killsByDef ?? {}).filter(([id]) => ALL_UNITS[id]?.boss).reduce((n, [, k]) => n + k, 0) >= 15;
    case 'h_aceofgods':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 1000);
    case 'h_aeon':
      return (s.ngPlus ?? 0) >= 12;
    case 'h_emperor':
      return Object.entries(s.killsByDef ?? {}).filter(([id]) => ALL_UNITS[id]?.boss).reduce((n, [, k]) => n + k, 0) >= 20;
    case 'h_magnate':
      return (s.credits ?? 0) >= 500000;
    case 'h_paladin':
      return Object.keys(s.missionRank ?? {}).length >= 40;
    case 'h_warpaint':
      return totalKills >= 4000;
    case 'h_liberator':
      return s.sideCleared.length >= 40;
    case 'h_millennium':
      return Object.values(s.pilotProg ?? {}).some((p) => (p.kills ?? 0) >= 1000);
    case 'h_butcherking':
      return totalKills >= 5000;
    case 'h_vrapotheosis':
      return (s.simBest ?? 0) >= 50000;
    case 'h_hoardlord':
      return s.credits >= 500000;
    case 'h_peacelord':
      return s.sideCleared.length >= 50;
    case 'h_centurion':
      return Object.keys(s.missionRank ?? {}).length >= 50;
    case 'h_warehouse':
      return Object.values(s.inventory ?? {}).reduce((n, c) => n + c, 0) >= 80;
    case 'h_armorylord':
      return (s.partsOwned ?? []).length >= 75;
    case 'h_paradox':
      return s.ngPlus >= 12;
    case 'h_purgeking':
      return totalKills >= 6000;
    case 'h_sage':
      return Object.keys(s.masteryDone).length >= 70;
    case 'h_dreamteam': {
      const ps = Object.values(s.pilotProg);
      return ps.length >= 4 && ps.every((p) => (p.kills ?? 0) >= 150);
    }
    case 'h_genocider':
      return totalKills >= 7500;
    case 'h_paragon':
      return s.ngPlus >= 15;
    case 'h_godhunter':
      return (s.killsByDef ? Object.values(s.killsByDef).reduce((n, k) => n + k, 0) : 0) >= 20;
    case 'h_simulator':
      return (s.simBest ?? 0) >= 75000;
    case 'h_deity':
      return s.ngPlus >= 18;
    case 'h_warpath2':
      return totalKills >= 10000;
    case 'h_immortal2':
      return s.masteryDone.length >= 80;
    case 'h_pinnacle':
      return Object.values(s.missionRank ?? {}).filter((r) => r === 'S').length >= 80;
    case 'h_apexlegion':
      return kills.length > 0 && kills.every((p) => (p.kills ?? 0) >= 250);
    case 'h_stockpile':
      return Object.values(s.inventory ?? {}).reduce((n, c) => n + c, 0) >= 90;
    case 'h_godhunter2':
      return (s.killsByDef ? Object.entries(s.killsByDef).filter(([id]) => ALL_UNITS[id]?.boss).reduce((n, [, k]) => n + k, 0) : 0) >= 30;
    case 'h_annihilator':
      return (s.maxHitEver ?? 0) >= 8000;
    case 'h_ironwill':
      return (s.units ?? []).some((u) => u.side === 'player' && u.wounded);
    case 'h_forma':
      return s.transformed === true;
    case 'h_raw':
      return s.usedSupport !== true;
    case 'h_ghost':
      return (s.killsByDef?.phantom ?? 0) >= 3;
    case 'h_ifield':
      return s.iFieldKill === true;
    case 'h_mirror':
      return s.decoyHit === true;
    case 'h_sig':
      return s.mirrorWon === true;
    case 'h_arc':
      return s.arcKill === true;
    case 'h_blast':
      return s.blastKill === true;
    case 'h_brink':
      return s.lostAlly === true;
    case 'h_snipe':
      return s.snipeKill === true;
    case 'h_angel':
      return (s.rescuedPods?.length ?? 0) >= 2;
    case 'h_rush':
      return s.bossRush === true;
    case 'h_chain':
      return (s.chainCount ?? 0) >= 4;
    case 'h_surv':
      return (s.units ?? []).some((u) => u.side === 'player' && u.alive && u.hp != null && u.def.maxHp != null && u.hp <= u.def.maxHp * 0.1);
    case 'h_solo': {
      const ks = (s.units ?? []).filter((u) => u.side === 'player' && u.kills > 0);
      return ks.length === 1 && (ks[0]?.kills ?? 0) >= 3;
    }
    case 'h_arty':
      return (s.killsByDef?.ballista ?? 0) >= 2;
    case 'h_attr':
      return (s.turn ?? 0) >= 15;
    case 'h_void':
      return s.missionCh?.theme === 'void';
    case 'h_selfs':
      return s.usedResupply !== true;
    case 'h_dec':
      return (s.kills ?? 0) >= 10;
    case 'h_last':
      return (s.units ?? []).filter((u) => u.side === 'player' && u.alive && !u.npc).length === 1;
    case 'h_dark':
      return s.missionCh?.fog === true;
    case 'h_glory': {
      const ps = (s.units ?? []).filter((u) => u.side === 'player' && u.alive && !u.npc);
      return ps.length >= 3 && ps.every((u) => u.kills > 0);
    }
    case 'h_light':
      return (s.turn ?? 99) <= 3;
    case 'h_armory':
      return Object.keys(PARTS).every((id) => s.partsOwned?.includes(id));
    case 'h_uns': {
      const ps = (s.units ?? []).filter((u) => u.side === 'player' && u.alive && !u.npc);
      return ps.length > 0 && ps.every((u) => (u.hp ?? 0) >= (u.def.maxHp ?? 1) * 0.8);
    }
    case 'h_ghostd':
      return s.altKill === true;
    default:
      return false;
  }
}

/** Fabricate a ChapterDef view of a side mission for genMap/enemyLevelOf/checkEnd. */
export function sideAsChapter(m: SideMissionDef): ChapterDef {
  const idx = m.repeatable ? SIDE_MISSIONS.length + PATROL_MISSIONS.findIndex((p) => p.id === m.id) : SIDE_MISSIONS.findIndex((x) => x.id === m.id);
  return {
    id: 1000 + idx,
    name: m.name,
    subtitle: m.repeatable ? 'PATROL OP' : 'SIDE QUEST',
    act: m.lvl >= 15 ? 3 : m.lvl >= 8 ? 2 : 1,
    theme: m.theme,
    lvl: m.lvl,
    count: m.count,
    boss: m.boss,
    bossLevel: m.boss ? m.lvl + 2 : undefined,
    objectiveType: m.objectiveType ?? (m.boss ? 'boss' : 'rout'),
    surviveTurns: m.surviveTurns,
    turnLimit: m.turnLimit,
    objective: m.objective ?? (m.boss ? 'Destroy the marked commander unit' : 'Rout all hostiles'),
    lines: [],
    rosterCh: m.unlockCh,
    fog: m.fog,
    huntId: m.huntId,
    carrier: m.carrier,
  };
}
