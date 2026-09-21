import React from 'react';
import { ART, BOND_BG, AudioKey } from '../assets';
import { BOND_EVENTS, bondVoice } from '../game/bonds';
import { useGame } from '../game/store';
import { DialogScene } from './DialogScene';

/** Plays the currently-selected bond event as a VN scene; grants +1 bond on first view. */
export function BondDialog() {
  const id = useGame((s) => s.bondEventId);
  const finish = useGame((s) => s.finishBondEvent);
  const ev = BOND_EVENTS.find((e) => e.id === id);
  if (!ev) return null;
  const lines = ev.lines.map((l, i) => ({ speaker: l.speaker, text: l.text, voice: bondVoice(ev, i) as AudioKey }));
  const bg = (ev.bg && BOND_BG[ev.bg]) || ART.hqBg;
  return <DialogScene lines={lines} tag={`MESS HALL — ${ev.title.toUpperCase()}`} bg={bg} onDone={finish} />;
}
