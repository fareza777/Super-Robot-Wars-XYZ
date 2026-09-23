// Central registry for generated art + audio assets.
// Images are JPGs produced by Recraft (see scripts/genart), audio MP3s by ElevenLabs.
import { GEN_AUDIO } from './assets_audio_gen';

export const ART = {
  icon: require('../assets/art/icon.png'),
  titleKey: require('../assets/art/title_key2.jpg'),
  splash: require('../assets/art/splash.jpg'),
  homeBg: require('../assets/art/home_bg2.jpg'),
  battleBg: require('../assets/art/battle_bg.jpg'),
  boardBg: require('../assets/art/board_bg.jpg'),
  hqBg: require('../assets/art/hq_bg.jpg'),
  hangarBg: require('../assets/art/hangar_bg.jpg'),
  story: [
    require('../assets/art/story_1.jpg'),
    require('../assets/art/story_2.jpg'),
    require('../assets/art/story_3b.jpg'),
    require('../assets/art/story_4b.jpg'),
    require('../assets/art/story_5b.jpg'),
  ],
};

// Keyed by unit defId
export const MECH_ART: Record<string, number> = {
  valstray: require('../assets/art/mech2_valstray.jpg'),
  arielis: require('../assets/art/mech2_arielis.jpg'),
  gruntborg: require('../assets/art/mech2_gruntborg.jpg'),
  zephyra: require('../assets/art/mech2_zephyra.jpg'),
  zolda: require('../assets/art/mech2_zolda.jpg'),
  zolda_air: require('../assets/art/mech2_zoldaair.jpg'),
  kargan: require('../assets/art/mech2_kargan.jpg'),
  zoldaTank: require('../assets/art/mech2_zoldatank.jpg'),
  vexia: require('../assets/art/mech2_vexia.jpg'),
  nightmare: require('../assets/art/mech2_nightmare.jpg'),
  raxden: require('../assets/art/mech2_raxden.jpg'),
  moorin: require('../assets/art/mech2_moorin.jpg'),
  serka: require('../assets/art/mech2_serka.jpg'),
  empress: require('../assets/art/mech2_empress.jpg'),
  warden: require('../assets/art/mech2_warden.jpg'),
  emperor: require('../assets/art/mech2_emperor.jpg'),
  raxdenR: require('../assets/art/mech2_raxden.jpg'),
  vexiaX: require('../assets/art/mech2_vexia.jpg'),
  lancer: require('../assets/art/mech2_lancer.jpg'),
  bulwark: require('../assets/art/mech2_bulwark.jpg'),
};

// Keyed by terrain id — generated top-down map tiles
export const TERRAIN_ART: Record<string, number> = {
  plain: require('../assets/art/ter_plain.jpg'),
  road: require('../assets/art/ter_road.jpg'),
  forest: require('../assets/art/ter_forest.jpg'),
  mountain: require('../assets/art/ter_mountain.jpg'),
  water: require('../assets/art/ter_water.jpg'),
  city: require('../assets/art/ter_city.jpg'),
  base: require('../assets/art/ter_base.jpg'),
  void: require('../assets/art/ter_void.jpg'),
  moon: require('../assets/art/ter_moon.jpg'),
  desert: require('../assets/art/ter_desert.jpg'),
  snow: require('../assets/art/ter_snow.jpg'),
  lava: require('../assets/art/ter_lava.jpg'),
  ruins: require('../assets/art/ter_ruins.jpg'),
};

export const PILOT_ART: Record<string, number> = {
  valstray: require('../assets/art/face_ray.jpg'),
  arielis: require('../assets/art/face_mira.jpg'),
  gruntborg: require('../assets/art/face_gara.jpg'),
  zephyra: require('../assets/art/face_orin.jpg'),
  kargan: require('../assets/art/face_karg.jpg'),
  zolda: require('../assets/art/face_grunt.jpg'),
  zolda_air: require('../assets/art/face_grunt.jpg'),
  zoldaTank: require('../assets/art/face_grunt.jpg'),
  vexia: require('../assets/art/face_grunt.jpg'),
  nightmare: require('../assets/art/face_grunt.jpg'),
  raxden: require('../assets/art/face_rax.jpg'),
  moorin: require('../assets/art/face_moorin.jpg'),
  serka: require('../assets/art/face_serka.jpg'),
  empress: require('../assets/art/face_serka.jpg'),
  warden: require('../assets/art/face_bram.jpg'),
  emperor: require('../assets/art/face_vael.jpg'),
  raxdenR: require('../assets/art/face_rax.jpg'),
  vexiaX: require('../assets/art/face_vee.jpg'),
  lancer: require('../assets/art/face_grunt.jpg'),
  bulwark: require('../assets/art/face_grunt.jpg'),
};

// Bond event backdrops — romance events get the CG, friendship stays on mess/hangar
export const BOND_BG: Record<string, number> = {
  stars: require('../assets/art/bond_stars.jpg'),
  mess: require('../assets/art/bond_mess.jpg'),
};

export const NPC_ART: Record<string, number> = {
  merchant: require('../assets/art/npcface_merchant.jpg'),
  mechanic: require('../assets/art/npcface_mechanic.jpg'),
  captain: require('../assets/art/npcface_captain.jpg'),
};

export const AUDIO = {
  nar_1: require('../assets/audio/nar_1.mp3'),
  nar_2: require('../assets/audio/nar_2.mp3'),
  nar_3: require('../assets/audio/nar_3.mp3'),
  nar_4: require('../assets/audio/nar_4.mp3'),
  nar_5: require('../assets/audio/nar_5.mp3'),
  ray_1: require('../assets/audio/ray_1.mp3'),
  ray_2: require('../assets/audio/ray_2.mp3'),
  mira_1: require('../assets/audio/mira_1.mp3'),
  mira_2: require('../assets/audio/mira_2.mp3'),
  gara_1: require('../assets/audio/gara_1.mp3'),
  gara_2: require('../assets/audio/gara_2.mp3'),
  orin_1: require('../assets/audio/orin_1.mp3'),
  orin_2: require('../assets/audio/orin_2.mp3'),
  karg_1: require('../assets/audio/karg_1.mp3'),
  karg_2: require('../assets/audio/karg_2.mp3'),
  grunt_1: require('../assets/audio/grunt_1.mp3'),
  sfx_explosion: require('../assets/audio/sfx_explosion.mp3'),
  sfx_beam: require('../assets/audio/sfx_beam.mp3'),
  sfx_slash: require('../assets/audio/sfx_slash.mp3'),
  sfx_missiles: require('../assets/audio/sfx_missiles.mp3'),
  sfx_hit: require('../assets/audio/sfx_hit.mp3'),
  ui_confirm: require('../assets/audio/ui_confirm.mp3'),
  bgm_title: require('../assets/audio/bgm_title.mp3'),
  bgm_hq: require('../assets/audio/bgm_hq.mp3'),
  bgm_map: require('../assets/audio/bgm_map.mp3'),
  bgm_boss: require('../assets/audio/bgm_boss.mp3'),
  bgm_battle: require('../assets/audio/bgm_battle.mp3'),
  // chapter 1 pre-mission dialogue
  d_ray_1: require('../assets/audio/d_ray_1.mp3'),
  d_mira_1: require('../assets/audio/d_mira_1.mp3'),
  d_gara_1: require('../assets/audio/d_gara_1.mp3'),
  d_orin_1: require('../assets/audio/d_orin_1.mp3'),
  d_ray_2: require('../assets/audio/d_ray_2.mp3'),
  d_karg_1: require('../assets/audio/d_karg_1.mp3'),
  d_ray_3: require('../assets/audio/d_ray_3.mp3'),
  d_karg_2: require('../assets/audio/d_karg_2.mp3'),
  d_ray_4: require('../assets/audio/d_ray_4.mp3'),
  ...GEN_AUDIO,
};

export type AudioKey = keyof typeof AUDIO;

export const NARRATION: AudioKey[] = ['nar_1', 'nar_2', 'nar_3', 'nar_4', 'nar_5'];

// Story captions — identical to the narrated lines so text and VO always match.
export const CAPTIONS = [
  "Year 2199. War has reached the heavens. Above a burning Earth, the last Federation fleet falls beneath Imperial guns.",
  "On the ground, the Empire's walkers march through burning streets. The world surrenders, city by city.",
  "In a hidden hangar, one pilot waits beside humanity's last hope — the prototype XYZ Frame. Valstray.",
  'At dawn, the counterattack begins. Four machines — Squadron XYZ — launch into the fire.',
  "And waiting at Sector Triple-S: Colonel Karg Draven, the Emperor's ace. This is where the war turns.",
];

// First-boot prologue — crew introduced one at a time (npc_* speakers use NPC_ART).
export const PROLOGUE: { speaker: string; voice: AudioKey; text: string }[] = [
  { speaker: 'npc_captain', voice: 'pro_1' as AudioKey, text: "Welcome aboard the Ark Raider, Commander. She's old, but she's the last free deck in the sky." },
  { speaker: 'valstray', voice: 'pro_2' as AudioKey, text: "Captain Vale. The squad's ready — Valstray just needs a launch window." },
  { speaker: 'npc_captain', voice: 'pro_3' as AudioKey, text: 'Before you fly, meet your crew. Bram Okoye, chief engineer — if it has a reactor, he can tune it.' },
  { speaker: 'npc_mechanic', voice: 'pro_4' as AudioKey, text: 'Commander. Bring me credits and salvage, and your frames will hit twice as hard. My workshop is always open.' },
  { speaker: 'npc_captain', voice: 'pro_5' as AudioKey, text: "And Mira Volkoff runs the quartermaster's store — the best salvage broker left in the fleet." },
  { speaker: 'npc_merchant', voice: 'pro_6' as AudioKey, text: 'A pleasure, Commander. Repair kits, energy cells — everything to keep you breathing out there. Special price for heroes.' },
  { speaker: 'npc_captain', voice: 'pro_7' as AudioKey, text: 'Spend your credits wisely — upgrade the frames, stock the racks. War is expensive.' },
  { speaker: 'valstray', voice: 'pro_8' as AudioKey, text: "Understood. Squadron XYZ doesn't plan on losing." },
  { speaker: 'npc_captain', voice: 'pro_9' as AudioKey, text: "Sector Triple-S. Karg Draven holds the gate. When you're ready — deploy, and make the Empire regret this war." },
];

// Chapter 1 pre-mission dialogue. speaker = unit defId (portrait + pilot name).
export const DIALOGUE: { speaker: string; voice: AudioKey; text: string }[] = [
  { speaker: 'valstray', voice: 'd_ray_1', text: 'All units, check in. Valstray — green and ready.' },
  { speaker: 'arielis', voice: 'd_mira_1', text: "Arielis, all systems nominal. I'm picking up six Imperial signatures dead ahead." },
  { speaker: 'gruntborg', voice: 'd_gara_1', text: 'Six of them? Ha! Just enough to make it interesting.' },
  { speaker: 'zephyra', voice: 'd_orin_1', text: "Zephyra standing by! Let's send them home in pieces!" },
  { speaker: 'valstray', voice: 'd_ray_2', text: 'Cut the chatter. There are still civilians down there — we break through fast and clean.' },
  { speaker: 'kargan', voice: 'd_karg_1', text: 'So. The Federation sends its little toys to die in my sky.' },
  { speaker: 'valstray', voice: 'd_ray_3', text: 'Karg Draven... the butcher of Veridia Colony.' },
  { speaker: 'kargan', voice: 'd_karg_2', text: 'You remember my work, boy. Then come — show me what that white machine of yours can do.' },
  { speaker: 'valstray', voice: 'd_ray_4', text: 'Squadron XYZ — weapons free! Mission start!' },
];

// Voice lines per unit (played during attack cut-in)
export const UNIT_VOICE: Record<string, AudioKey[]> = {
  valstray: ['ray_1', 'ray_2'],
  arielis: ['mira_1', 'mira_2'],
  gruntborg: ['gara_1', 'gara_2'],
  zephyra: ['orin_1', 'orin_2'],
  kargan: ['karg_1', 'karg_2'],
  zolda: ['grunt_1'],
  zolda_air: ['grunt_1'],
  raxdenR: ['raxv_1', 'raxv_2'],
  vexiaX: ['veev_1', 'veev_2'],
};

export const KIND_SFX: Record<string, AudioKey> = {
  melee: 'sfx_slash',
  beam: 'sfx_beam',
  missile: 'sfx_missiles',
  gun: 'sfx_hit',
  funnel: 'sfx_beam',
};

export const SUBTITLES: Partial<Record<AudioKey, string>> = {
  ray_1: 'Valstray, full power! Take this — Photon Blade!',
  ray_2: 'This ends now!',
  mira_1: 'Target locked. Firing.',
  mira_2: "You won't escape my sights.",
  gara_1: 'Rookie mistake. All pods, fire!',
  gara_2: "Ha! Feel that? That's experience.",
  orin_1: 'Here I go! Zephyra, dance!',
  orin_2: 'Too slow!',
  karg_1: 'Insects. Kargan will crush you.',
  karg_2: 'Witness Imperial might!',
  grunt_1: 'For the Empire!',
  raxv_1: 'You took me in. Now watch a Crimson Fang fight for the Ark.',
  raxv_2: 'Crimson Fang — full output!',
  veev_1: 'Vexia Custom, on your wing. Falcons never miss.',
  veev_2: 'Too slow for a Falcon!',
};

// Text-only barks used when a unit has no voice clip (new campaign units)
// Last-words voice per unit (played when the unit is destroyed in battle)
export const UNIT_DEFEAT_VOICE: Record<string, AudioKey> = {
  valstray: 'die_valstray',
  arielis: 'die_arielis',
  gruntborg: 'die_gruntborg',
  zephyra: 'die_zephyra',
  raxdenR: 'die_raxdenR',
  vexiaX: 'die_vexiaX',
  kargan: 'die_kargan',
  raxden: 'die_raxden',
  moorin: 'die_moorin',
  serka: 'die_serka',
  empress: 'die_empress',
  warden: 'die_warden',
  emperor: 'die_emperor',
  nightmare: 'die_nightmare',
  zolda: 'die_grunt',
  zolda_air: 'die_grunt',
  zoldaTank: 'die_grunt',
  vexia: 'die_grunt',
  lancer: 'die_grunt',
  bulwark: 'die_grunt',
};

export const DEFEAT_BARK: Record<string, string> = {
  valstray: 'Damn it—! Ejecting! Sorry, everyone…',
  arielis: "Systems failing… Ray, I'm sorry. Ejecting!",
  gruntborg: "Tch—engine's dead! Go on without me!",
  zephyra: "No no no—I'm going down—ejecting!",
  raxdenR: 'The Crimson Fang falls… live on, Ark!',
  vexiaX: "Vexia's hit—! Punching out—good luck, everyone!",
  kargan: "Impossible…! My Kargan—! You'll regret this, boy!",
  raxden: 'The Crimson Fang… broken?! Mark this day, Ark!',
  moorin: 'The Anvil… falls?! Empire… forgive me…',
  serka: 'The void… rejects me?! No—!',
  empress: 'I ascend… no more… the void calls…',
  warden: 'The gate… opens… at last…',
  emperor: 'This cannot be—the Throne endures—!',
  nightmare: 'Guard… falling… for the Throne—',
  zolda: 'Aaaah—! Unit lost! Unit lo—',
  zolda_air: 'Aaaah—! Unit lost! Unit lo—',
  zoldaTank: 'Aaaah—! Unit lost! Unit lo—',
  vexia: 'Aaaah—! Unit lost! Unit lo—',
};

export const UNIT_BARK: Record<string, string> = {
  zolda: 'For the Empire!',
  zolda_air: 'For the Empire!',
  zoldaTank: 'Bastion holds!',
  vexia: 'For the Empire!',
  nightmare: 'Die, Ark scum!',
  raxden: 'The Crimson Fang strikes!',
  moorin: 'The Anvil falls on you!',
  serka: 'The void takes you.',
  empress: 'Kneel before the void.',
  warden: 'None pass the gate.',
  emperor: 'Perish, insects.',
  kargan: 'Witness Imperial might!',
  raxdenR: 'The Crimson Fang fights for the Ark now.',
  vexiaX: 'Falcons never miss.',
};
