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

export function play(key: AudioKey) {
  if (!enabled) return;
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
