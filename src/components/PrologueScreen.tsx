import React from 'react';
import { ART, PROLOGUE } from '../assets';
import { useGame } from '../game/store';
import { DialogScene } from './DialogScene';

/** First-boot prologue — the crew of the Ark Raider introduced one at a time, RPG-style. */
export function PrologueScreen() {
  const finish = useGame((s) => s.finishPrologue);
  return <DialogScene lines={PROLOGUE} tag="PROLOGUE · ARK RAIDER" bg={ART.hqBg} onDone={finish} />;
}
