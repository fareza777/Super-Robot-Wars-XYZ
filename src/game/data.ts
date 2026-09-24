import { MapDef, PilotDef, SpiritDef, SpiritId, Terrain, TraitId, UnitDef, WeaponDef } from './types';

// ---------- Spirits (SRW "seishin") ----------

export const SPIRITS: Record<SpiritId, SpiritDef> = {
  focus: { id: 'focus', name: 'Focus', cost: 15, desc: 'Evade +30% until end of enemy phase' },
  strike: { id: 'strike', name: 'Strike', cost: 20, desc: 'Next attack always hits' },
  valor: { id: 'valor', name: 'Valor', cost: 40, desc: 'Next attack damage x1.5' },
  grit: { id: 'grit', name: 'Grit', cost: 15, desc: 'Armor +400 until end of enemy phase' },
  guard: { id: 'guard', name: 'Guard', cost: 20, desc: 'Incoming damage halved until end of enemy phase' },
  accel: { id: 'accel', name: 'Accel', cost: 10, desc: 'Move +3 this turn' },
  flash: { id: 'flash', name: 'Flash', cost: 25, desc: 'Auto-dodge the next enemy attack' },
  snipe: { id: 'snipe', name: 'Snipe', cost: 20, desc: 'Next attack range +2' },
  zeal: { id: 'zeal', name: 'Zeal', cost: 10, desc: 'Will +15 (self)' },
  rouse: { id: 'rouse', name: 'Rouse', cost: 25, desc: 'Will +10 to allies within 2 tiles' },
  disrupt: { id: 'disrupt', name: 'Disrupt', cost: 25, desc: 'Will -10 to enemies within 2 tiles' },
  bless: { id: 'bless', name: 'Bless', cost: 25, desc: 'Restore 40% HP (self)' },
  vigor: { id: 'vigor', name: 'Vigor', cost: 20, desc: 'Restore +40 EN (self)' },
  roar: { id: 'roar', name: 'Roar', cost: 15, desc: 'Will +20 (self)' },
  fortune: { id: 'fortune', name: 'Fortune', cost: 30, desc: 'Next attack grants double EXP' },
  soul: { id: 'soul', name: 'Soul', cost: 60, desc: 'Next attack damage x2' },
  trust: { id: 'trust', name: 'Trust', cost: 25, desc: 'Heal the most wounded ally within 2 tiles for 30% HP' },
  miracle: { id: 'miracle', name: 'Miracle', cost: 60, desc: 'Survive the next fatal hit with 10 HP — once' },
  vanish: { id: 'vanish', name: 'Vanish', cost: 40, desc: 'Enemies cannot target this unit until end of enemy phase' },
  lucky: { id: 'lucky', name: 'Lucky', cost: 45, desc: 'Next kill yields a guaranteed drop and +25cr salvage per enemy level' },
  overdrive: { id: 'overdrive', name: 'Overdrive', cost: 50, desc: 'Act again after landing a kill' },
  mercy: { id: 'mercy', name: 'Mercy', cost: 30, desc: 'Pull the next lethal hit — leave the foe at 10 HP for capture' },
  purge: { id: 'purge', name: 'Purge', cost: 40, desc: 'Cleanse self and adjacent allies — cripple, burn, stun, break lifted' },
  resolve: { id: 'resolve', name: 'Resolve', cost: 50, desc: 'Kiai surge — Will instantly climbs to 150' },
  sunder: { id: 'sunder', name: 'Sunder', cost: 45, desc: 'Breacher field — enemies within 3 tiles lose 300 armor & 15 evade' },
  provoke: { id: 'provoke', name: 'Provoke', cost: 35, desc: 'War horn — enemies within 3 tiles are drawn to attack this unit next phase' },
  cheer: { id: 'cheer', name: 'Cheer', cost: 30, desc: 'The most junior ally within 3 tiles gains double EXP on their next attack' },
  wish: { id: 'wish', name: 'Wish', cost: 50, desc: 'The most drained ally within 3 tiles regains +30 SP' },
  gravity: { id: 'gravity', name: 'Gravity Well', cost: 50, desc: 'Enemies within 3 tiles are anchored — they cannot move next phase' },
  guts: { id: 'guts', name: 'Guts', cost: 40, desc: 'Berserker surge — next attack deals +75% damage while under half HP' },
  expose: { id: 'expose', name: 'Expose', cost: 35, desc: 'Paint enemies within 3 tiles — next hit on each lands +20 hit, +25% damage' },
  decoy: { id: 'decoy', name: 'Decoy', cost: 45, desc: 'Deploy a holoreplica beside you — hostiles waste their attacks on it until next phase' },
  hymn: { id: 'hymn', name: 'Hymn', cost: 50, desc: 'Squad anthem — every ally gains +15 hit & +15 evade until end of enemy phase' },
  emp: { id: 'emp', name: 'EMP Burst', cost: 40, desc: 'Electromagnetic burst — the nearest enemy within 4 tiles is stunned, skipping its next activation' },
  phalanx: { id: 'phalanx', name: 'Phalanx', cost: 50, desc: 'Lock formation — every ally gains +400 armor until end of enemy phase' },
  deadshot: { id: 'deadshot', name: 'Deadshot', cost: 45, desc: 'Paint the kill-shot — your next attack is a guaranteed critical' },
  frenzy: { id: 'frenzy', name: 'Frenzy', cost: 40, desc: 'Push the reactor — your weapons cost no EN for the rest of this turn' },
  breach: { id: 'breach', name: 'Breach', cost: 45, desc: 'Overload the cutter — your next attack ignores all enemy armor' },
  relentless: { id: 'relentless', name: 'Relentless', cost: 35, desc: 'Blood in the water — +25% damage to enemies below half HP until the enemy phase ends' },
  reboot: { id: 'reboot', name: 'Reboot', cost: 45, desc: 'Restart the core — purge your own debuffs and restore 25% HP' },
  sanctuary: { id: 'sanctuary', name: 'Sanctuary', cost: 55, desc: 'Litany of the Ark — allies within 2 tiles recover 20% HP' },
  awaken: { id: 'awaken', name: 'Awaken', cost: 70, desc: 'Second wind — the nearest spent ally within 3 tiles acts again' },
  charity: { id: 'charity', name: 'Charity', cost: 30, desc: 'Bleed 20% own hull — the weakest ally within 2 tiles mends 40% HP' },
  siphon: { id: 'siphon', name: 'Siphon', cost: 35, desc: 'Drain 15 Will from the nearest enemy within 3 tiles' },
  intimidate: { id: 'intimidate', name: 'Intimidate', cost: 40, desc: 'War cry — enemies within 3 tiles suffer -20 hit for 2 turns' },
  scan: { id: 'scan', name: 'Scan', cost: 30, desc: 'Sensor sweep — enemies within 5 tiles are painted (+20 hit, +25% dmg taken)' },
  empower: { id: 'empower', name: 'Empower', cost: 40, desc: 'War blessing — the strongest ally within 3 tiles gains +40% damage on their next attack' },
  marksman: { id: 'marksman', name: 'Deadeye Call', cost: 45, desc: 'Squad fire control — every ally gains +15 crit until end of enemy phase' },
  ward: { id: 'ward', name: 'Ward', cost: 45, desc: 'Aegis prayer — the weakest ally within 3 tiles survives their next fatal hit at 1 HP' },
  warsong: { id: 'warsong', name: 'Warsong', cost: 55, desc: 'Anthem of the Ark — every ally gains +10% damage until end of enemy phase' },
  execute: { id: 'execute', name: 'Execution', cost: 50, desc: 'Coup de grace — your next hit destroys any non-boss, non-elite foe at 20% HP or less' },
  shatter: { id: 'shatter', name: 'Shatter', cost: 45, desc: 'Armor breaker — your next hit treats enemy armor as 50% before damage' },
  glacial: { id: 'glacial', name: 'Glacial', cost: 40, desc: 'Cryo strike — your next landed hit also inflicts Slow on the target' },
  relay: { id: 'relay', name: 'Relay', cost: 35, desc: 'Reactor tether — the most-drained ally within 3 tiles gains +30 EN' },
  soulburn: { id: 'soulburn', name: 'Soulburn', cost: 50, desc: 'Burn your own hull — costs 10% HP; your next hit deals +50% damage' },
  fluster: { id: 'fluster', name: 'Fluster', cost: 40, desc: 'Rattle their aim — your next landed hit also suppresses the target (-20 hit)' },
  hunt: { id: 'hunt', name: 'Hunt', cost: 45, desc: 'Wounded prey — your next hit deals +30% damage to targets below half HP' },
  tracer: { id: 'tracer', name: 'Tracer', cost: 40, desc: 'Designate the target — your next landed hit also marks it (+25 hit, +15% dmg taken)' },
  strafe: { id: 'strafe', name: 'Strafe', cost: 45, desc: 'Air superiority — your next hit deals +35% damage to a ground-frame target' },
  inspire: { id: 'inspire', name: 'Inspire', cost: 35, desc: 'A rallying cry — every ally gains +8 Will' },
  pyre: { id: 'pyre', name: 'Pyre', cost: 40, desc: 'Incendiary load — your next landed hit ignites the target (burn, 2 turns)' },
  overrun: { id: 'overrun', name: 'Overrun', cost: 45, desc: 'Shock assault — your next attack cannot be countered' },
  exert: { id: 'exert', name: 'Exert', cost: 40, desc: 'Push the reactor — your next attack gains +20 hit and +15% damage (costs 10 EN)' },
  veil: { id: 'veil', name: 'Veil', cost: 45, desc: 'Sensor mist — allies within 3 tiles gain +20 evade until end of enemy phase' },
  cantata: { id: 'cantata', name: 'Cantata', cost: 40, desc: 'Chorus of resolve — allies within 3 tiles recover +10 SP' },
  warhorn: { id: 'warhorn', name: 'Warhorn', cost: 40, desc: 'Battle horn — allies within 3 tiles deal +10% counter damage until end of enemy phase' },
  skyfall: { id: 'skyfall', name: 'Skyfall', cost: 45, desc: 'Anti-air dive — your next hit deals +35% damage to an airborne frame' },
  avenger: { id: 'avenger', name: 'Avenger', cost: 45, desc: 'Vengeful stance — your next counter-attack deals +50% damage' },
  reaper: { id: 'reaper', name: 'Reaper', cost: 50, desc: 'Dirge of the fallen — your next hit deals +10% damage per squad frame destroyed this battle' },
  stalker: { id: 'stalker', name: 'Stalker', cost: 40, desc: 'Predator instinct — your next hit deals +30% damage to a target carrying any status effect' },
  interfere: { id: 'interfere', name: 'Interference', cost: 45, desc: 'ECM flood — enemies within 3 tiles cannot counter-attack until end of their next phase' },
  safeguard: { id: 'safeguard', name: 'Safeguard', cost: 40, desc: 'Defensive perimeter — allies within 3 tiles take -10% damage until end of enemy phase' },
  blade: { id: 'blade', name: 'Bladestorm', cost: 45, desc: 'Blade dance — your next melee hit deals +40% damage' },
  suppress: { id: 'suppress', name: 'Suppress Fire', cost: 45, desc: 'Covering barrage — enemies within 3 tiles deal -10% damage until end of enemy phase' },
  carnage: { id: 'carnage', name: 'Carnage', cost: 50, desc: 'Shockwave strike — your next hit splashes 30% damage to enemies adjacent to the target' },
  trueshot: { id: 'trueshot', name: 'True Shot', cost: 40, desc: 'Zero-deflection round — your next hit ignores Defend and Cover reductions' },
  dischord: { id: 'dischord', name: 'Dischord', cost: 45, desc: 'Cacophony wave — enemies within 3 tiles lose 15 evade until the end of the enemy phase' },
  absolution: { id: 'absolution', name: 'Absolution', cost: 45, desc: 'Cleansing hymn — allies within 3 tiles shed all debuffs and gain +15 hit until the end of the enemy phase' },
  judge: { id: 'judge', name: 'Judgement', cost: 50, desc: 'Executioner sight — your next hit deals +50% damage against boss and elite frames' },
  banner: { id: 'banner', name: 'Banner', cost: 55, desc: 'Rally standard — allies within 3 tiles gain +10 hit and +20% counter damage until the end of the enemy phase' },
};

// ---------- Pilot traits (passives, resolved in the combat engine) ----------

export const TRAITS: Record<TraitId, { name: string; desc: string }> = {
  ace_instinct: { name: 'Ace Instinct', desc: '+12% damage when Will is 130 or higher' },
  deadeye: { name: 'Deadeye', desc: '+8% hit chance on all attacks' },
  siege_breaker: { name: 'Siege Breaker', desc: '+15% damage against bosses and elite units' },
  field_medic: { name: 'Field Medic', desc: 'REPAIR restores +50% more HP' },
  crimson_fury: { name: 'Crimson Fury', desc: '+10% damage and +8% hit while under 50% HP' },
  falcon_wing: { name: 'Falcon Wing', desc: '+10% hit chance against air units' },
  sovereign: { name: 'Sovereign', desc: '+8% damage at all times' },
  rally: { name: 'Rally', desc: 'allies within 2 tiles gain +8% hit chance' },
};

// ---------- Weapons ----------

const W = (w: WeaponDef) => w;

export const WEAPONS = {
  beamSaber: W({ id: 'beam_saber', name: 'Beam Saber', kind: 'melee', power: 2300, rangeMin: 1, rangeMax: 1, enCost: 5, ammo: null, hitMod: 15, critMod: 15, postMove: true, animSeed: 1 }),
  photonRifle: W({ id: 'photon_rifle', name: 'Photon Rifle', kind: 'beam', power: 1800, rangeMin: 1, rangeMax: 5, enCost: 10, ammo: null, hitMod: 5, postMove: true, animSeed: 2 }),
  missilePods: W({ id: 'missile_pods', name: 'Missile Pods', kind: 'missile', power: 1500, rangeMin: 2, rangeMax: 6, enCost: 0, ammo: 8, hitMod: -5, postMove: true, animSeed: 3, antiAir: true }),
  gatling: W({ id: 'gatling', name: 'Arm Gatling', kind: 'gun', power: 1200, rangeMin: 1, rangeMax: 3, enCost: 0, ammo: 20, hitMod: 10, postMove: true, animSeed: 4, antiAir: true }),
  burstRepeater: W({ id: 'burst_repeater', name: 'Burst Repeater', kind: 'gun', power: 950, rangeMin: 1, rangeMax: 3, enCost: 0, ammo: 30, hitMod: 5, postMove: true, animSeed: 4, antiAir: true, multiHit: 2 }),
  arcCascade: W({ id: 'arc_cascade', name: 'Arc Cascade', kind: 'funnel', power: 2400, rangeMin: 2, rangeMax: 5, enCost: 30, ammo: null, hitMod: 5, postMove: false, animSeed: 13, willReq: 110, chain: 2 }),
  stormArc: W({ id: 'storm_arc', name: 'Storm Arc', kind: 'funnel', power: 2200, rangeMin: 2, rangeMax: 5, enCost: 20, ammo: null, hitMod: 0, postMove: false, animSeed: 29, chain: 2 }),
  plasmaEdge: W({ id: 'plasma_edge', name: 'Plasma Edge', kind: 'melee', power: 2900, rangeMin: 1, rangeMax: 2, enCost: 15, ammo: null, hitMod: 10, critMod: 12, postMove: true, animSeed: 5 }),
  megaBeam: W({ id: 'mega_beam', name: 'Mega Beam Launcher', kind: 'beam', power: 3400, rangeMin: 3, rangeMax: 7, enCost: 40, ammo: null, hitMod: -15, postMove: false, animSeed: 6, willReq: 115 }),
  vulcan: W({ id: 'vulcan', name: 'Head Vulcan', kind: 'gun', power: 800, rangeMin: 1, rangeMax: 2, enCost: 0, ammo: 30, hitMod: 25, postMove: true, animSeed: 7, antiAir: true }),
  railgun: W({ id: 'railgun', name: 'Linear Railgun', kind: 'gun', power: 2600, rangeMin: 2, rangeMax: 6, enCost: 20, ammo: 10, hitMod: 0, postMove: true, animSeed: 8, pierce: true, antiAir: true, sniper: true }),
  heatRod: W({ id: 'heat_rod', name: 'Heat Rod', kind: 'melee', power: 2100, rangeMin: 1, rangeMax: 2, enCost: 8, ammo: null, hitMod: 10, critMod: 10, postMove: true, animSeed: 9, status: 'burn' }),
  stasisRay: W({ id: 'stasis_ray', name: 'Stasis Ray', kind: 'beam', power: 1600, rangeMin: 2, rangeMax: 5, enCost: 12, ammo: null, hitMod: 12, postMove: true, animSeed: 23, status: 'stun' }),
  siegeRain: W({ id: 'siege_rain', name: 'Siege Rain', kind: 'missile', power: 2600, rangeMin: 4, rangeMax: 8, enCost: 18, ammo: null, hitMod: -10, postMove: false, animSeed: 3, antiAir: true, status: 'slow' }),
  chestBlaster: W({ id: 'chest_blaster', name: 'Chest Blaster', kind: 'beam', power: 3100, rangeMin: 1, rangeMax: 4, enCost: 30, ammo: null, hitMod: -5, postMove: false, animSeed: 10, willReq: 115 }),
  mapBuster: W({ id: 'map_buster', name: 'MAP: Buster Mortar', kind: 'missile', power: 2200, rangeMin: 2, rangeMax: 5, enCost: 0, ammo: 3, hitMod: -10, postMove: false, animSeed: 14, willReq: 110, mapRange: 1 }),
  punch: W({ id: 'punch', name: 'Rocket Punch', kind: 'melee', power: 1900, rangeMin: 1, rangeMax: 3, enCost: 10, ammo: null, hitMod: 10, postMove: true, animSeed: 11 }),
  drillLancer: W({ id: 'drill_lancer', name: 'Drill Lancer', kind: 'melee', power: 2700, rangeMin: 1, rangeMax: 1, enCost: 12, ammo: null, hitMod: 5, critMod: 15, postMove: true, animSeed: 12, pierce: true }),
  vampEdge: W({ id: 'vamp_edge', name: 'Vampiric Edge', kind: 'melee', power: 2350, rangeMin: 1, rangeMax: 2, enCost: 14, ammo: null, hitMod: 8, critMod: 12, postMove: true, animSeed: 24, drain: true }),
  soulReaver: W({ id: 'soul_reaver', name: 'Soul Reaver', kind: 'melee', power: 3000, rangeMin: 1, rangeMax: 2, enCost: 18, ammo: null, hitMod: 5, postMove: true, animSeed: 24, drain: true, willDrain: true }),
  funnelArray: W({ id: 'funnel_array', name: 'Funnel Array', kind: 'funnel', power: 2800, rangeMin: 2, rangeMax: 6, enCost: 25, ammo: null, hitMod: 10, postMove: false, animSeed: 13, willReq: 115 }),
  // combination attacks — need the partner unit standing adjacent & unacted
  twinBreaker: W({ id: 'twin_breaker', name: 'Twin Breaker', kind: 'melee', power: 4300, rangeMin: 1, rangeMax: 2, enCost: 25, ammo: null, hitMod: 30, critMod: 20, postMove: true, animSeed: 15, willReq: 110, comboPartner: 'gruntborg' }),
  twinBarrage: W({ id: 'twin_barrage', name: 'Twin Barrage', kind: 'beam', power: 4500, rangeMin: 2, rangeMax: 6, enCost: 30, ammo: null, hitMod: 25, postMove: false, animSeed: 16, willReq: 115, comboPartner: 'zephyra' }),
  crimsonDuet: W({ id: 'crimson_duet', name: 'Crimson Duet', kind: 'melee', power: 4600, rangeMin: 1, rangeMax: 3, enCost: 30, ammo: null, hitMod: 28, critMod: 20, postMove: true, animSeed: 17, willReq: 110, comboPartner: 'vexiaX' }),
  // the two X-Face leads firing in perfect sync — the showpiece combination
  starfallStrike: W({ id: 'starfall_strike', name: 'Starfall Strike', kind: 'beam', power: 4800, rangeMin: 2, rangeMax: 5, enCost: 35, ammo: null, hitMod: 30, critMod: 15, postMove: false, animSeed: 26, willReq: 115, comboPartner: 'valstray' }),
  ironChord: W({ id: 'iron_chord', name: 'Iron Chord', kind: 'melee', power: 4400, rangeMin: 1, rangeMax: 3, enCost: 28, ammo: null, hitMod: 26, critMod: 18, postMove: true, animSeed: 18, willReq: 110, comboPartner: 'raxdenR' }),
  mirageWaltz: W({ id: 'mirage_waltz', name: 'Mirage Waltz', kind: 'funnel', power: 4700, rangeMin: 2, rangeMax: 6, enCost: 32, ammo: null, hitMod: 24, postMove: false, animSeed: 27, willReq: 115, comboPartner: 'vexiaX' }),
  dawnCutter: W({ id: 'dawn_cutter', name: 'Dawn Cutter', kind: 'beam', power: 4600, rangeMin: 1, rangeMax: 4, enCost: 30, ammo: null, hitMod: 25, postMove: true, animSeed: 33, willReq: 115, comboPartner: 'vexiaX' }),
  // v1.8 hero weapons — one extra trick per mech
  arcCannon: W({ id: 'arc_cannon', name: 'Arc Cannon', kind: 'beam', power: 3200, rangeMin: 2, rangeMax: 5, enCost: 28, ammo: null, hitMod: 5, postMove: false, animSeed: 17, willReq: 105 }),
  thermoCharge: W({ id: 'thermo_charge', name: 'Thermobaric Charge', kind: 'missile', power: 3600, rangeMin: 1, rangeMax: 3, enCost: 0, ammo: 4, hitMod: 0, postMove: false, animSeed: 18, willReq: 110, knockback: true }),
  railVolley: W({ id: 'rail_volley', name: 'Railgun Volley', kind: 'gun', power: 2000, rangeMin: 1, rangeMax: 4, enCost: 0, ammo: 12, hitMod: 15, postMove: true, animSeed: 19, status: 'break', sniper: true }),
  flareField: W({ id: 'flare_field', name: 'Flare Field', kind: 'funnel', power: 2400, rangeMin: 1, rangeMax: 4, enCost: 20, ammo: null, hitMod: 15, postMove: true, animSeed: 20, status: 'burn' }),
  flareDart: W({ id: 'flare_dart', name: 'Flare Dart', kind: 'beam', power: 1600, rangeMin: 2, rangeMax: 5, enCost: 12, ammo: null, hitMod: 10, postMove: true, animSeed: 21, status: 'mark' }),
  havocMortar: W({ id: 'havoc_mortar', name: 'Havoc Mortar', kind: 'missile', power: 2000, rangeMin: 3, rangeMax: 6, enCost: 16, ammo: null, hitMod: -5, postMove: false, animSeed: 4, status: 'supp' }),
  hexBolt: W({ id: 'hex_bolt', name: 'Hex Bolt', kind: 'beam', power: 2400, rangeMin: 2, rangeMax: 5, enCost: 12, ammo: null, hitMod: -5, postMove: true, animSeed: 22, status: 'break' }),
  nullChord: W({ id: 'null_chord', name: 'Null Chord', kind: 'beam', power: 800, rangeMin: 1, rangeMax: 3, enCost: 8, ammo: null, hitMod: 10, postMove: true, animSeed: 22, status: 'supp' }),
  mapFlare: W({ id: 'map_flare', name: 'MAP: Flare Burst', kind: 'funnel', power: 1900, rangeMin: 2, rangeMax: 5, enCost: 45, ammo: null, hitMod: -5, postMove: false, animSeed: 20, willReq: 105, mapRange: 1 }),
  mapShelling: W({ id: 'map_shelling', name: 'MAP: Siege Howitzer', kind: 'missile', power: 2400, rangeMin: 2, rangeMax: 6, enCost: 40, ammo: null, hitMod: -10, postMove: false, animSeed: 25, mapRange: 1 }),
  mapCataclysm: W({ id: 'map_cataclysm', name: 'MAP: Void Cataclysm', kind: 'funnel', power: 2800, rangeMin: 2, rangeMax: 6, enCost: 60, ammo: null, hitMod: -5, postMove: false, animSeed: 26, mapRange: 2 }),
  // ALL weapon — saturates every hostile inside range in one volley, no counters
  omniBarrage: W({ id: 'omni_barrage', name: 'ALL: Omni Barrage', kind: 'missile', power: 2100, rangeMin: 1, rangeMax: 4, enCost: 0, ammo: 4, hitMod: 0, postMove: false, animSeed: 27, willReq: 110, all: true }),
  fangRipper: W({ id: 'fang_ripper', name: 'Fang Ripper', kind: 'melee', power: 3300, rangeMin: 1, rangeMax: 2, enCost: 30, ammo: null, hitMod: 12, postMove: true, animSeed: 54, breaker: true }),
  pileBunker: W({ id: 'pile_bunker', name: 'Pile Bunker', kind: 'melee', power: 3400, rangeMin: 1, rangeMax: 1, enCost: 16, ammo: 3, hitMod: -10, critMod: 40, postMove: true, animSeed: 24 }),
  siegeCrusher: W({ id: 'siege_crusher', name: 'Siege Crusher', kind: 'melee', power: 3600, rangeMin: 1, rangeMax: 1, enCost: 20, ammo: null, hitMod: -5, postMove: true, animSeed: 55, breaker: true, knockback: true }),
  arkZenith: W({ id: 'ark_zenith', name: 'Ark Zenith Saber', kind: 'melee', power: 5200, rangeMin: 1, rangeMax: 2, enCost: 45, ammo: null, hitMod: 20, critMod: 20, postMove: true, animSeed: 56, aceReq: 5 }),
  novaMortar: W({ id: 'nova_mortar', name: 'MAP: Nova Mortar', kind: 'missile', power: 3100, rangeMin: 2, rangeMax: 5, enCost: 0, ammo: 3, hitMod: -5, postMove: false, animSeed: 57, mapRange: 1, aceReq: 5 }),
  eclipseLance: W({ id: 'eclipse_lance', name: 'Eclipse Lance', kind: 'beam', power: 4900, rangeMin: 3, rangeMax: 8, enCost: 50, ammo: null, hitMod: 10, postMove: false, animSeed: 58, aceReq: 5, sniper: true, pierce: true }),
  wraithBloom: W({ id: 'wraith_bloom', name: 'Wraith Bloom', kind: 'funnel', power: 3800, rangeMin: 2, rangeMax: 6, enCost: 40, ammo: null, hitMod: 15, postMove: true, animSeed: 59, aceReq: 5 }),
  arkBarrageW: W({ id: 'ark_barrage', name: 'MAP: Ark Barrage', kind: 'missile', power: 2400, rangeMin: 2, rangeMax: 8, enCost: 0, ammo: null, hitMod: 0, postMove: true, animSeed: 60, mapRange: 2 }),
  militiaRifle: W({ id: 'militia_rifle', name: 'Defense Rifle', kind: 'gun', power: 1500, rangeMin: 1, rangeMax: 4, enCost: 0, ammo: 12, hitMod: 8, postMove: true, animSeed: 21 }),
  voidLance: W({ id: 'void_lance', name: 'Void Lance', kind: 'beam', power: 3300, rangeMin: 2, rangeMax: 7, enCost: 32, ammo: null, hitMod: 0, critMod: 8, postMove: false, animSeed: 25, willReq: 115, pierce: true, sniper: true }),
};

// ---------- Pilots ----------

const P = (p: PilotDef) => p;

export const PILOTS = {
  ray: P({ name: 'Ray Ardent', callsign: 'X-1', melee: 68, ranged: 74, defense: 60, evade: 72, maxSp: 60, spirits: ['strike', 'valor', 'focus', 'accel', 'zeal', 'roar', 'soul', 'frenzy', 'soulburn', 'pyre', 'skyfall', 'blade', 'judge'], faceColor: '#ffb347', trait: 'ace_instinct' }),
  mira: P({ name: 'Mira Solen', callsign: 'X-2', melee: 55, ranged: 80, defense: 55, evade: 78, maxSp: 55, spirits: ['focus', 'strike', 'accel', 'snipe', 'rouse', 'fortune', 'trust', 'emp', 'deadshot', 'scan', 'marksman', 'shatter', 'tracer', 'veil', 'stalker', 'trueshot'], faceColor: '#7ee7ff', trait: 'deadeye' }),
  gara: P({ name: 'Gara Dune', callsign: 'Y-1', melee: 78, ranged: 60, defense: 74, evade: 58, maxSp: 50, spirits: ['grit', 'valor', 'guard', 'vigor', 'sunder', 'provoke', 'phalanx', 'breach', 'charity', 'intimidate', 'warsong', 'fluster', 'overrun', 'avenger', 'suppress', 'banner'], faceColor: '#ff9d9d', trait: 'siege_breaker' }),
  orin: P({ name: 'Orin Vale', callsign: 'Z-1', melee: 62, ranged: 70, defense: 66, evade: 66, maxSp: 65, spirits: ['guard', 'focus', 'valor', 'flash', 'disrupt', 'bless', 'lucky', 'mercy', 'purge', 'cheer', 'expose', 'decoy', 'hymn', 'sanctuary', 'empower', 'ward', 'relay', 'inspire', 'warhorn', 'safeguard', 'absolution'], faceColor: '#b6ff9d', trait: 'field_medic' }),
  karg: P({ name: 'Col. Karg Draven', callsign: 'BOSS', melee: 75, ranged: 75, defense: 70, evade: 65, maxSp: 70, spirits: ['valor', 'strike'], faceColor: '#d0a0ff', lastWords: 'Rex is scrap... the Empire builds another. Always.', killQuip: 'Another Aegis relic for the pyre.' }),
  grunt: P({ name: 'Soldier', callsign: 'GR', melee: 56, ranged: 56, defense: 52, evade: 52, maxSp: 30, spirits: [], faceColor: '#bbbbbb' }),
  centurion: P({ name: 'Centurion', callsign: 'CT', melee: 64, ranged: 66, defense: 60, evade: 58, maxSp: 40, spirits: ['grit'], faceColor: '#e0c0ff', trait: 'rally', lastWords: 'The line... holds without me.', killQuip: 'Forward! For the Empire.' }),
  civ: P({ name: 'Convoy Crew', callsign: 'CVY', melee: 40, ranged: 40, defense: 40, evade: 40, maxSp: 0, spirits: [], faceColor: '#c8b090' }),
  militia: P({ name: 'Ark Militia', callsign: 'DEF', melee: 55, ranged: 60, defense: 58, evade: 55, maxSp: 0, spirits: [], faceColor: '#8fb8dd', trait: 'rally' }),
};

// ---------- Units (original mecha, 3 factions X / Y / Z) ----------

const U = (u: UnitDef) => u;

export const UNITS: Record<string, UnitDef> = {
  // --- player squad ---
  valstray: U({ id: 'valstray', name: 'Valstray', title: 'X-Face Vanguard', color: '#2f6fd0', accent: '#9fd0ff', maxHp: 5800, maxEn: 140, armor: 1050, mobility: 118, moveRange: 6, moveType: 'land', weapons: [WEAPONS.arkZenith, WEAPONS.beamSaber, WEAPONS.photonRifle, WEAPONS.missilePods, WEAPONS.twinBreaker, WEAPONS.arcCannon, WEAPONS.dawnCutter], pilot: PILOTS.ray, transformInto: 'valstray_s' }),
  // Valstray's flight frame — lighter armor, much faster, sheds workshop upgrades for raw speed
  valstray_s: U({ id: 'valstray_s', name: 'Valstray Strider', title: 'X-Face Skyframe', color: '#3a8de0', accent: '#bfe4ff', maxHp: 5400, maxEn: 140, armor: 880, mobility: 148, moveRange: 8, moveType: 'air', weapons: [WEAPONS.beamSaber, WEAPONS.photonRifle, WEAPONS.vulcan, WEAPONS.arcCannon, WEAPONS.dawnCutter], pilot: PILOTS.ray }),
  arielis: U({ id: 'arielis', name: 'Arielis', title: 'X-Face Sniper', color: '#38b6c9', accent: '#c8f6ff', maxHp: 4600, maxEn: 160, armor: 900, mobility: 132, moveRange: 7, moveType: 'air', weapons: [WEAPONS.eclipseLance, WEAPONS.megaBeam, WEAPONS.photonRifle, WEAPONS.vulcan, WEAPONS.twinBarrage, WEAPONS.railVolley, WEAPONS.starfallStrike], pilot: PILOTS.mira }),
  gruntborg: U({ id: 'gruntborg', name: 'Grunborg', title: 'Y-Face Heavy', color: '#c94f4f', accent: '#ffd0c0', maxHp: 7200, maxEn: 110, armor: 1400, mobility: 92, moveRange: 5, moveType: 'land', weapons: [WEAPONS.novaMortar, WEAPONS.havocMortar, WEAPONS.drillLancer, WEAPONS.railgun, WEAPONS.gatling, WEAPONS.mapBuster, WEAPONS.thermoCharge, WEAPONS.omniBarrage, WEAPONS.ironChord], pilot: PILOTS.gara }),
  zephyra: U({ id: 'zephyra', name: 'Zephyra', title: 'Z-Face Duelist', color: '#5fbf62', accent: '#d8ffd8', maxHp: 5400, maxEn: 150, armor: 1000, mobility: 126, moveRange: 6, moveType: 'air', weapons: [WEAPONS.wraithBloom, WEAPONS.plasmaEdge, WEAPONS.chestBlaster, WEAPONS.vulcan, WEAPONS.flareField, WEAPONS.flareDart, WEAPONS.mapFlare, WEAPONS.mirageWaltz], pilot: PILOTS.orin, repairer: true, supplier: true, transformInto: 'zephyra_w' }),
  // Zephyra's skirmisher frame — a ghost on the field: faster, harder to pin, paper-thin
  zephyra_w: U({ id: 'zephyra_w', name: 'Zephyra Wisp', title: 'Z-Face Ghost', color: '#8fe08f', accent: '#eaffea', maxHp: 5200, maxEn: 150, armor: 750, mobility: 158, moveRange: 8, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.chestBlaster, WEAPONS.flareField, WEAPONS.flareDart, WEAPONS.mirageWaltz], pilot: PILOTS.orin }),
  // --- enemy ---
  zolda: U({ id: 'zolda', name: 'Zolda', title: 'Imperial Mass Unit', color: '#6b6f7a', accent: '#c9ccd6', maxHp: 3800, maxEn: 100, armor: 850, mobility: 88, moveRange: 5, moveType: 'land', weapons: [WEAPONS.gatling, WEAPONS.heatRod], pilot: PILOTS.grunt }),
  zoldaAir: U({ id: 'zolda_air', name: 'Zolda Flyer', title: 'Imperial Air Unit', color: '#7a6b6f', accent: '#d6c9cc', maxHp: 3400, maxEn: 110, armor: 700, mobility: 104, moveRange: 7, moveType: 'air', weapons: [WEAPONS.missilePods, WEAPONS.vulcan], pilot: PILOTS.grunt }),
  kargan: U({ id: 'kargan', name: 'Kargan Rex', title: 'Imperial Ace', color: '#8a2fbe', accent: '#e0b3ff', maxHp: 8600, maxEn: 170, armor: 1250, mobility: 124, moveRange: 6, moveType: 'air', weapons: [WEAPONS.plasmaEdge, WEAPONS.funnelArray, WEAPONS.chestBlaster], pilot: PILOTS.karg, boss: true, level: 5 }),
  arkmilitia: U({ id: 'arkmilitia', name: 'Ark Militia', title: 'Colony Defender', color: '#3e4a5a', accent: '#8fb8dd', maxHp: 3800, maxEn: 80, armor: 420, mobility: 62, moveRange: 4, moveType: 'land', weapons: [WEAPONS.militiaRifle], pilot: PILOTS.militia }),
};

// ---------- Terrain table ----------

export interface TerrainInfo {
  name: string;
  def: number;
  eva: number;
  moveCost: { land: number; air: number };
  passable: { land: boolean; air: boolean };
  hpRegen?: number; // fraction of maxHp restored at phase start
  enRegen?: number; // extra EN restored at phase start
  hpDmg?: number; // fraction of maxHp lost per phase while standing on it
  color: string;
  glyph: string;
}

export const TERRAIN_INFO: Record<Terrain, TerrainInfo> = {
  plain: { name: 'Plains', def: 0, eva: 0, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, color: '#3d5a3d', glyph: '' },
  road: { name: 'Road', def: 0, eva: -5, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, color: '#5a5348', glyph: '═' },
  forest: { name: 'Forest', def: 100, eva: 15, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#1f4d2a', glyph: '♣' },
  mountain: { name: 'Mountain', def: 150, eva: 20, moveCost: { land: 3, air: 1 }, passable: { land: true, air: true }, color: '#5c4a3a', glyph: '▲' },
  water: { name: 'Water', def: 0, eva: 0, moveCost: { land: 99, air: 1 }, passable: { land: false, air: true }, color: '#1e3f66', glyph: '≈' },
  city: { name: 'City', def: 200, eva: -10, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, hpRegen: 0.08, enRegen: 8, color: '#4a4a58', glyph: '▦' },
  base: { name: 'Base', def: 250, eva: 0, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, hpRegen: 0.12, enRegen: 10, color: '#584a6e', glyph: '⌂' },
  void: { name: 'Void', def: 0, eva: 10, moveCost: { land: 1, air: 1 }, passable: { land: true, air: true }, color: '#141428', glyph: '·' },
  moon: { name: 'Moon Surface', def: 50, eva: 5, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#555560', glyph: '◌' },
  desert: { name: 'Desert', def: -50, eva: -10, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#8a7a4a', glyph: '∴' },
  snow: { name: 'Snowfield', def: 30, eva: 5, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#b8c4d0', glyph: '❄' },
  lava: { name: 'Lava Field', def: 0, eva: 0, moveCost: { land: 3, air: 1 }, passable: { land: true, air: true }, hpDmg: 0.08, color: '#8a2a12', glyph: '♨' },
  ruins: { name: 'Ruins', def: 180, eva: 10, moveCost: { land: 2, air: 1 }, passable: { land: true, air: true }, color: '#4a4456', glyph: '▤' },
};

// ---------- Mission SSS: "Steel Sky Siege" ----------

// prettier-ignore
const T: Terrain[][] = [
  // 0        1        2        3        4        5        6        7        8        9        10       11       12       13
  ['mountain','mountain','plain','plain','forest','plain','plain','plain','plain','plain','forest','plain','plain','plain'],   // 0
  ['mountain','plain','plain','forest','forest','plain','road','road','road','plain','plain','plain','plain','water'],      // 1
  ['plain','plain','plain','plain','forest','plain','road','plain','road','plain','plain','city','plain','water'],          // 2
  ['plain','city','road','road','road','road','road','plain','road','road','road','city','plain','water'],                  // 3
  ['plain','plain','plain','plain','forest','plain','road','plain','road','plain','forest','plain','plain','water'],        // 4
  ['water','plain','plain','forest','forest','plain','road','plain','plain','plain','forest','mountain','plain','water'],   // 5
  ['water','water','plain','plain','plain','plain','road','plain','city','plain','plain','mountain','plain','plain'],       // 6
  ['plain','plain','plain','city','plain','forest','road','road','road','road','plain','plain','plain','plain'],            // 7
  ['plain','base','plain','city','plain','forest','plain','plain','plain','road','plain','plain','city','plain'],           // 8
  ['plain','plain','plain','plain','plain','plain','plain','forest','plain','road','road','road','road','plain'],           // 9
];

export const MISSION_SSS: MapDef = {
  id: 'sss',
  name: 'MISSION SSS',
  subtitle: 'Steel Sky Siege',
  cols: 14,
  rows: 10,
  terrain: T,
  objective: 'Defeat all Imperial units. Ace pilot Col. Karg Draven commands the Kargan Rex — bring him down.',
  playerSpawns: [
    { defId: 'valstray', pos: { x: 1, y: 8 } },
    { defId: 'gruntborg', pos: { x: 3, y: 9 } },
    { defId: 'arielis', pos: { x: 4, y: 8 } },
    { defId: 'zephyra', pos: { x: 2, y: 9 } },
  ],
  enemySpawns: [
    { defId: 'zolda', pos: { x: 11, y: 2 } },
    { defId: 'zolda', pos: { x: 12, y: 3 } },
    { defId: 'zoldaAir', pos: { x: 10, y: 1 } },
    { defId: 'zoldaAir', pos: { x: 12, y: 5 } },
    { defId: 'zolda', pos: { x: 11, y: 4 } },
    { defId: 'kargan', pos: { x: 12, y: 1 } }, // far corner + boss hold: not attackable turn 1
  ],
  bossHoldUntil: 3, // Kargan Rex holds position until turn 3
  reinforce: { turn: 4, comp: ['zolda', 'zolda', 'zoldaAir'] },
};
