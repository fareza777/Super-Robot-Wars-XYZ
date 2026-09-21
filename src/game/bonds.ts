import { UnitState } from './types';

/** A watchable bond conversation between two pilots — grants +1 bond level (max 3). */
export interface BondEvent {
  id: string;
  title: string;
  chapter: number; // unlocked once campaign chapter index reaches this (0-based chapter-1)
  a: string; // unit defId
  b: string;
  romance?: boolean;
  bg?: string; // key into BOND_BG — CG backdrop; default is the mess hall art
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
  {
    id: 'b6',
    title: 'Storm Warning',
    chapter: 7,
    a: 'zephyra',
    b: 'valstray',
    lines: [
      { speaker: 'zephyra', text: 'Commander — your vector in that last furball was insane. Teach me.' },
      { speaker: 'valstray', text: 'Not insane. Calculated. The trick is knowing which risk is already dead.' },
      { speaker: 'zephyra', text: 'That is the most terrifying sentence I have ever heard you say.' },
      { speaker: 'valstray', text: 'Terrifying keeps you alive out there, Orin. Ask me again after a hundred sorties.' },
      { speaker: 'zephyra', text: 'Deal. And when I outfly you — which I will — you buy the first round.' },
      { speaker: 'valstray', text: 'Ha! Done. But bring your A-game, rookie. I do not go down easy.' },
    ],
  },
  {
    id: 'b7',
    title: 'Engine Warmth',
    chapter: 10,
    a: 'gruntborg',
    b: 'arielis',
    lines: [
      { speaker: 'arielis', text: 'Gara — you patched that Valstray armor twice this week. When do you sleep?' },
      { speaker: 'gruntborg', text: 'Sleep is for people whose machines are not held together by pride, Mira.' },
      { speaker: 'arielis', text: 'You mother that engine like it is family.' },
      { speaker: 'gruntborg', text: 'It is family. Out there, that engine is the only thing keeping us breathing.' },
      { speaker: 'arielis', text: 'Then let us keep it breathing together. I handle logistics, you handle steel.' },
      { speaker: 'gruntborg', text: 'Partnership. I like the sound of that, Quartermaster.' },
    ],
  },
  {
    id: 'b8',
    title: 'Rival Hearts',
    chapter: 12,
    a: 'raxdenR',
    b: 'vexiaX',
    romance: true,
    bg: 'stars',
    lines: [
      { speaker: 'vexiaX', text: 'You held formation badly today, Crimson. If you want a wingman who trusts you — earn it.' },
      { speaker: 'raxdenR', text: 'I do not need your trust, Vexia. I need your wing intact so I do not watch you die.' },
      { speaker: 'vexiaX', text: '...That was almost a compliment. Almost.' },
      { speaker: 'raxdenR', text: 'It was a promise. A Crimson Fang does not let a wing fall. Ever.' },
      { speaker: 'vexiaX', text: 'Then we are rivals, Rax. Whoever outflanks the other buys dinner — and I intend to collect.' },
      { speaker: 'raxdenR', text: 'Challenge accepted. But warn the kitchen — Imperial appetites are legendary.' },
    ],
  },
  {
    id: 'b9',
    title: 'Scar Tissue',
    chapter: 15,
    a: 'gruntborg',
    b: 'zephyra',
    lines: [
      { speaker: 'zephyra', text: 'Gara, your hands were shaking in the cockpit today. You never shake.' },
      { speaker: 'gruntborg', text: 'Old scar acts up when the void gets cold. Nothing a pilot learns to ignore.' },
      { speaker: 'zephyra', text: 'That is the bravest lie I have ever heard. Even legends get to be human, Gara.' },
      { speaker: 'gruntborg', text: '...You sound like your mother, Orin. She said the same thing before she stopped listening.' },
      { speaker: 'zephyra', text: 'She was wrong to stop. I am not stopping. We fly together until the engines give out, understood?' },
      { speaker: 'gruntborg', text: '...Understood, kid. And thank you — for not letting go.' },
    ],
  },
  {
    id: 'b10',
    title: 'First Dance',
    chapter: 17,
    a: 'valstray',
    b: 'arielis',
    romance: true,
    bg: 'mess',
    lines: [
      { speaker: 'arielis', text: 'You dragged me to the observation deck at three in the morning. Explain, Commander.' },
      { speaker: 'valstray', text: 'The Veridian nebula peaks tonight. And I wanted to see it with you — not alone.' },
      { speaker: 'arielis', text: '...It is beautiful, Ray.' },
      { speaker: 'valstray', text: 'Not as beautiful as the person standing next to me. Stand up — dance with me.' },
      { speaker: 'arielis', text: 'Here? In the hangar bay?' },
      { speaker: 'valstray', text: 'Right here. No orchestra, no witnesses — just you, me, and the stars outside.' },
      { speaker: 'arielis', text: '...You are ridiculous. My ridiculous commander. Lead on, then. Try not to step on my feet.' },
    ],
  },
  {
    id: 'b11',
    title: 'Steel and Silk',
    chapter: 19,
    a: 'raxdenR',
    b: 'vexiaX',
    romance: true,
    bg: 'stars',
    lines: [
      { speaker: 'vexiaX', text: 'Three months of shared patrols and you still do that stupid salute before every launch.' },
      { speaker: 'raxdenR', text: 'It is not stupid. It is the last thing my father taught me before he burned his last bridge.' },
      { speaker: 'vexiaX', text: '...I am sorry. I did not know.' },
      { speaker: 'raxdenR', text: 'No one does. Except you, now. Consider it a debt I am repaying by staying alive.' },
      { speaker: 'vexiaX', text: 'Then repay it properly — with dinner at the next port. And this time, I pick the restaurant.' },
      { speaker: 'raxdenR', text: 'Name the time and place. I will be there — sword and all.' },
    ],
  },
  {
    id: 'b12',
    title: 'Family Recipe',
    chapter: 20,
    a: 'zephyra',
    b: 'raxdenR',
    lines: [
      { speaker: 'zephyra', text: 'Rax — is it true Crimson Fang pilots eat ration bars by the fistful? That is barbaric.' },
      { speaker: 'raxdenR', text: 'Rations are fuel, not food, Orin. You would not understand until you have starved in a cockpit.' },
      { speaker: 'zephyra', text: 'Then let me teach you. The Ark has a galley, and I have a recipe from my grandmother.' },
      { speaker: 'raxdenR', text: 'Your grandmother cooked for Void Fang?' },
      { speaker: 'zephyra', text: 'She cooked for anyone who needed it. Food is how we say we care without using words.' },
      { speaker: 'raxdenR', text: '...Then cook for me sometime, Orin Zephyra. I want to hear what caring tastes like.' },
    ],
  },
  {
    id: 'b13',
    title: 'The Confession',
    chapter: 22,
    a: 'raxdenR',
    b: 'vexiaX',
    romance: true,
    bg: 'stars',
    lines: [
      { speaker: 'vexiaX', text: 'You took a hit for me today. In the middle of a firefight. Are you insane?' },
      { speaker: 'raxdenR', text: 'Perhaps. Insanity is what keeps the Crimson Fang alive long enough to matter.' },
      { speaker: 'vexiaX', text: 'That is not an answer, Rax. Tell me why you did it.' },
      { speaker: 'raxdenR', text: 'Because losing you would be the one battle I could not survive. That is why.' },
      { speaker: 'vexiaX', text: '...Oh.' },
      { speaker: 'raxdenR', text: 'I have spent my life burning bridges, Vexia. Let me build one — with you.' },
      { speaker: 'vexiaX', text: 'Then build it slowly. I am not going anywhere, Crimson.' },
    ],
  },
  {
    id: 'b14',
    title: 'Vows Unspoken',
    chapter: 26,
    a: 'valstray',
    b: 'arielis',
    romance: true,
    bg: 'stars',
    lines: [
      { speaker: 'arielis', text: 'One more battle, Ray. One more, and this war is over. Are you afraid?' },
      { speaker: 'valstray', text: 'Terrified. Not of dying — of losing the quiet moments we keep stealing.' },
      { speaker: 'arielis', text: 'Then let us steal one more. Right now. No rank, no mission, no Ark — just us.' },
      { speaker: 'valstray', text: 'Mira — when we land, wherever it is — will you walk with me into whatever comes next?' },
      { speaker: 'arielis', text: 'I already said yes, you fool. Under the stars, remember? I meant it then. I mean it now.' },
      { speaker: 'valstray', text: 'Then hold me until the klaxon sounds. That is an order, Lieutenant.' },
      { speaker: 'arielis', text: '...Yes, Commander. Always.' },
    ],
  },
  {
    id: 'b15',
    title: 'Brothers in Arms',
    chapter: 24,
    a: 'gruntborg',
    b: 'raxdenR',
    lines: [
      { speaker: 'raxdenR', text: 'You tuned my engine without being asked. Why, old man?' },
      { speaker: 'gruntborg', text: 'Because Crimson Fang engines scream before they die. Yours was screaming.' },
      { speaker: 'raxdenR', text: '...You could have let it scream. It is a Void Fang habit — letting allies burn first.' },
      { speaker: 'gruntborg', text: 'Not on my ship, Rax. On the Ark, a pilot is a pilot — Crimson or not. I fix what needs fixing.' },
      { speaker: 'raxdenR', text: 'Then I am in your debt, Engineer. And a Crimson Fang never forgets a debt.' },
      { speaker: 'gruntborg', text: 'Keep it that way. Now — get out of my hangar before I find you more work, kid.' },
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
