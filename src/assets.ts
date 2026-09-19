// Central registry for generated art + audio assets.
// Images are JPGs produced by Recraft (see scripts/genart), audio MP3s by ElevenLabs.

export const ART = {
  icon: require('../assets/art/icon.png'),
  titleKey: require('../assets/art/title_key.jpg'),
  splash: require('../assets/art/splash.jpg'),
  homeBg: require('../assets/art/home_bg.jpg'),
  battleBg: require('../assets/art/battle_bg.jpg'),
  boardBg: require('../assets/art/board_bg.jpg'),
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
};

export const PILOT_ART: Record<string, number> = {
  valstray: require('../assets/art/pilot_ray.jpg'),
  arielis: require('../assets/art/pilot_mira.jpg'),
  gruntborg: require('../assets/art/pilot_gara.jpg'),
  zephyra: require('../assets/art/pilot_orin.jpg'),
  kargan: require('../assets/art/pilot_karg.jpg'),
  zolda: require('../assets/art/pilot_grunt.jpg'),
  zolda_air: require('../assets/art/pilot_grunt.jpg'),
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
};

export type AudioKey = keyof typeof AUDIO;

export const NARRATION: AudioKey[] = ['nar_1', 'nar_2', 'nar_3', 'nar_4', 'nar_5'];

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
