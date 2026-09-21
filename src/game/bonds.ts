import { UnitState } from './types';

/** A watchable bond conversation between two pilots — grants +1 bond level (max 3). */
export interface BondEvent {
  id: string;
  title: string;
  chapter: number; // unlocked once campaign chapter index reaches this (0-based chapter-1)
  a: string; // unit defId
  b: string;
  romance?: boolean;
  lines: { speaker: string; text: string }[]; // voice key derived: `${id}_l${i}`
}

export const MAX_BOND = 3;

export const BOND_EVENTS: BondEvent[] = [
  {
    id: 'b0',
    title: 'Late Coffee',
    chapter: 2,
    a: 'valstray',
    b: 'arielis',
    romance: true,
    lines: [
      { speaker: 'arielis', text: 'You are still up? The hangar crew clocked out an hour ago.' },
      { speaker: 'valstray', text: 'Could not sleep. Keep replaying that last sortie — I almost lost you out there.' },
      { speaker: 'arielis', text: 'Almost is not losing. Besides, someone has to cover that reckless flight of yours.' },
      { speaker: 'valstray', text: 'Heh. Then let me return the favor — coffee? It is the only thing I make well.' },
      { speaker: 'arielis', text: '...One cup. And Ray — next time, trust me to watch my own flank too.' },
    ],
  },
  {
    id: 'b1',
    title: "Old Dog's Tale",
    chapter: 5,
    a: 'gruntborg',
    b: 'valstray',
    lines: [
      { speaker: 'gruntborg', text: 'Your engine note was off two percent today, kid. I tuned it. No charge.' },
      { speaker: 'valstray', text: 'You can hear that from the deck? Gara, sometimes you scare me.' },
      { speaker: 'gruntborg', text: 'Twenty years strapped into cockpits teaches you to listen. Machines talk before they break.' },
      { speaker: 'valstray', text: 'Then keep listening for both of us. I want you flying home in one piece too.' },
      { speaker: 'gruntborg', text: 'Ha! Buy me a drink at the next port and we call it even, Commander.' },
    ],
  },
  {
    id: 'b2',
    title: 'Wingmates',
    chapter: 8,
    a: 'zephyra',
    b: 'arielis',
    lines: [
      { speaker: 'zephyra', text: 'Mira — did you see my intercept pattern in the debrief? Tell me it was not lucky.' },
      { speaker: 'arielis', text: 'Luck does not thread three missiles through a canyon, Orin. That was you.' },
      { speaker: 'zephyra', text: 'I keep waiting for someone to say I do not belong in this squad.' },
      { speaker: 'arielis', text: 'Then listen carefully: you belong. You are the wing I trust when everything goes loud.' },
      { speaker: 'zephyra', text: '...Okay. Okay! Next sortie, watch me prove you right.' },
    ],
  },
  {
    id: 'b3',
    title: 'The Promise',
    chapter: 14,
    a: 'valstray',
    b: 'arielis',
    romance: true,
    lines: [
      { speaker: 'valstray', text: 'Mira. If tomorrow goes wrong — the things I never said will burn a hole in me.' },
      { speaker: 'arielis', text: 'Then say one of them. Just one, before the alarm cuts us off.' },
      { speaker: 'valstray', text: 'When this war ends — wherever landfall is — I want it to be next to you.' },
      { speaker: 'arielis', text: '...You really are a reckless idiot. But you are my reckless idiot, Ray Ardent.' },
      { speaker: 'valstray', text: 'Is that a yes?' },
      { speaker: 'arielis', text: 'It is a promise. Survive tomorrow, and ask me again properly.' },
    ],
  },
  {
    id: 'b4',
    title: "Crimson's Pledge",
    chapter: 16,
    a: 'raxdenR',
    b: 'valstray',
    lines: [
      { speaker: 'raxdenR', text: 'I keep expecting the crew to look at me and see an Imperial. Sometimes I still see one.' },
      { speaker: 'valstray', text: 'Then look harder, Rax. The Ark does not carry ghosts — it carries pilots.' },
      { speaker: 'raxdenR', text: 'You gave me a berth when I had no right to ask. I will not forget that.' },
      { speaker: 'valstray', text: 'You earned it the day you turned your blade around. Fight beside us — that is all.' },
      { speaker: 'raxdenR', text: 'Crimson Fang, sworn to the Ark. My sword answers your call, Commander.' },
    ],
  },
  {
    id: 'b5',
    title: 'Under the Stars',
    chapter: 23,
    a: 'valstray',
    b: 'arielis',
    romance: true,
    lines: [
      { speaker: 'arielis', text: 'One more battle. Then we are home. You remembered?' },
      { speaker: 'valstray', text: 'I remembered everything. Survive tomorrow — and ask me properly.' },
      { speaker: 'arielis', text: 'So ask, Commander. We are alone under a whole sky of stars.' },
      { speaker: 'valstray', text: 'Mira Solen — when the guns fall silent... marry me.' },
      { speaker: 'arielis', text: '...Yes. Yes, you impossible man. Yes.' },
      { speaker: 'valstray', text: 'Then we finish this war together. All of us — and come home.' },
    ],
  },
];

export const bondKey = (a: string, b: string) => [a, b].sort().join('|');
export const bondLevel = (bonds: Record<string, number>, a: string, b: string) => bonds[bondKey(a, b)] ?? 0;

/** SRW-style support bonus: +4% hit & +6% damage per bond level while a bonded partner is within 2 tiles. */
export function bondMods(bonds: Record<string, number>, units: UnitState[], u: UnitState): { hitBonus: number; dmgMult: number } {
  let best = 0;
  for (const o of units) {
    if (o === u || !o.alive || o.side !== 'player') continue;
    const d = Math.abs(o.pos.x - u.pos.x) + Math.abs(o.pos.y - u.pos.y);
    if (d <= 2) best = Math.max(best, bondLevel(bonds, u.def.id, o.def.id));
  }
  return { hitBonus: best * 4, dmgMult: 1 + best * 0.06 };
}

export function bondVoice(ev: BondEvent, lineIdx: number): string {
  return `${ev.id}_l${lineIdx}`;
}
