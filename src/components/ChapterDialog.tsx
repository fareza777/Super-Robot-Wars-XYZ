import React from 'react';
import { ART, AudioKey } from '../assets';
import { chapterOf } from '../game/campaign';
import { useGame } from '../game/store';
import { DialogScene } from './DialogScene';

/** Pre-mission dialogue — VN-style exchange over the battlefield, per chapter. */
export function ChapterDialog() {
  const finish = useGame((s) => s.finishDialog);
  const chapter = useGame((s) => s.chapter);
  const chDef = chapterOf(chapter);
  const lines = chDef.lines.map((l, i) => ({ speaker: l.speaker, text: l.text, voice: (l.voice ?? `c${chDef.id}_l${i}`) as AudioKey }));
  return <DialogScene lines={lines} tag={`CHAPTER ${chDef.id} · ${chDef.name.toUpperCase()}`} bg={ART.story[4]} onDone={finish} />;
}
