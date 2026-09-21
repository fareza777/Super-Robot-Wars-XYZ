import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { AUDIO, AudioKey } from './assets';

let enabled = true;
const live = new Set<AudioPlayer>();
let modeSet = false;

async function ensureMode() {
  if (modeSet) return;
  modeSet = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  } catch {}
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

// ---------- BGM (looping music channel, independent of SFX) ----------

let bgmPlayer: AudioPlayer | null = null;
let bgmKey: string | null = null;
let musicEnabled = true;
let bgmVol = 0.45;

export function setMusicEnabled(v: boolean) {
  musicEnabled = v;
  if (!v) stopBgm();
}

export function setBgmVolume(v: number) {
  bgmVol = v;
  try {
    if (bgmPlayer) bgmPlayer.volume = v;
  } catch {}
}

export function stopBgm() {
  try {
    bgmPlayer?.pause();
    bgmPlayer?.remove();
  } catch {}
  bgmPlayer = null;
  bgmKey = null;
}

/** Switch the looping music track; no-op if already playing this key or music is off. */
export function bgm(key: AudioKey) {
  if (!musicEnabled) return;
  if (bgmKey === key && bgmPlayer) return;
  stopBgm();
  try {
    void ensureMode();
    const p = createAudioPlayer(AUDIO[key]);
    p.loop = true;
    p.volume = bgmVol;
    p.play();
    bgmPlayer = p;
    bgmKey = key;
  } catch {}
}

export function play(key: AudioKey) {
  if (!enabled || !(key in AUDIO)) return;
  try {
    void ensureMode();
    const p = createAudioPlayer(AUDIO[key]);
    live.add(p);
    p.play();
    const id = setInterval(() => {
      if (!p.isLoaded || p.duration <= 0) return;
      if (p.currentTime >= p.duration - 0.1 || !p.playing) {
        clearInterval(id);
        live.delete(p);
        p.remove();
      }
    }, 250);
  } catch {}
}
