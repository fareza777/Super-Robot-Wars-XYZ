// Central registry for generated art + audio assets.
// Images are JPGs produced by Recraft (see scripts/genart), audio MP3s by ElevenLabs.
import { GEN_AUDIO } from './assets_audio_gen';

export const ART = {
  icon: require('../assets/art/icon.png'),
  titleKey: require('../assets/art/title_key.jpg'),
  splash: require('../assets/art/splash.jpg'),
  homeBg: require('../assets/art/home_bg.jpg'),
  battleBg: require('../assets/art/battle_bg.jpg'),
  boardBg: require('../assets/art/board_bg.jpg'),
  hqBg: require('../assets/art/hq_bg.jpg'),
  hangarBg: require('../assets/art/hangar_bg.jpg'),
  story: [
    require('../assets/art/story_1.jpg'),
    require('../assets/art/story_2.jpg'),
    require('../assets/art/story_3.jpg'),
    require('../assets/art/story_4.jpg'),
    require('../assets/art/story_5.jpg'),
  ],
};

// Keyed by unit defId
export const MECH_ART: Record<string, number> = {
  valstray: require('../assets/art/mech_valstray.jpg'),
  arielis: require('../assets/art/mech_arielis.jpg'),
  gruntborg: require('../assets/art/mech_gruntborg.jpg'),
  zephyra: require('../assets/art/mech_zephyra.jpg'),
  zolda: require('../assets/art/mech_zolda.jpg'),
  zolda_air: require('../assets/art/mech_zoldaair.jpg'),
  kargan: require('../assets/art/mech_kargan.jpg'),
  zoldaTank: require('../assets/art/mech_zoldatank.jpg'),
  vexia: require('../assets/art/mech_vexia.jpg'),
  nightmare: require('../assets/art/mech_nightmare.jpg'),
  raxden: require('../assets/art/mech_raxden.jpg'),
  moorin: require('../assets/art/mech_moorin.jpg'),
  serka: require('../assets/art/mech_serka.jpg'),
  empress: require('../assets/art/mech_empress.jpg'),
  warden: require('../assets/art/mech_warden.jpg'),
  emperor: require('../assets/art/mech_emperor.jpg'),
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
};

export const PILOT_ART: Record<string, number> = {
  valstray: require('../assets/art/pilot_ray.jpg'),
  arielis: require('../assets/art/pilot_mira.jpg'),
  gruntborg: require('../assets/art/pilot_gara.jpg'),
  zephyra: require('../assets/art/pilot_orin.jpg'),
  kargan: require('../assets/art/pilot_karg.jpg'),
  zolda: require('../assets/art/pilot_grunt.jpg'),
  zolda_air: require('../assets/art/pilot_grunt.jpg'),
  zoldaTank: require('../assets/art/pilot_grunt.jpg'),
  vexia: require('../assets/art/pilot_grunt.jpg'),
  nightmare: require('../assets/art/pilot_grunt.jpg'),
  raxden: require('../assets/art/pilot_rax.jpg'),
  moorin: require('../assets/art/pilot_moorin.jpg'),
  serka: require('../assets/art/pilot_serka.jpg'),
  empress: require('../assets/art/pilot_serka.jpg'),
  warden: require('../assets/art/pilot_bram.jpg'),
  emperor: require('../assets/art/pilot_vael.jpg'),
};

export const NPC_ART: Record<string, number> = {
  merchant: require('../assets/art/npc_merchant.jpg'),
  mechanic: require('../assets/art/npc_mechanic.jpg'),
  captain: require('../assets/art/npc_captain.jpg'),
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
  "Year 2199. War has reached the heavens. Above a burning Earth, the Imperial fleet clashes with the last of humanity's defenders.",
  "On the surface, the Empire's machine legions march unopposed. City after city falls beneath their black steel.",
  "But in a hidden hangar, one pilot waits with humanity's final answer — the XYZ Frame. The Valstray.",
  'At dawn, the counterattack begins. Squadron XYZ launches — four machines against an empire.',
  "And waiting at Sector Triple-S — the Emperor's ace, Colonel Karg Draven. This is where the war turns.",
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
};
