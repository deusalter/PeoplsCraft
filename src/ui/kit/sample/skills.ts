// Sample skill trees: one field to each job of the crew's roles (world bible 8.4), and what each of the crew has taken.
import type { NodeShape } from '../art/tree';
import { HEAD_ICONS } from '../art/heads';
import type { PixelMap } from '../pixmap';

export interface SkillNode {
  id: string;
  col: number; row: number;
  shape: NodeShape;
  icon: string;
  name: string;
  /** What a rank of it does. */
  does: string;
  ranks: number;
}

export interface Job { key: string; name: string; icon: string; nodes: SkillNode[]; links: [string, string][] }

// Every job's field has the same plan: two steps anyone may take, the job's own skills branching from them, and the
// three marks it ends in at the far side.
const PLAN: [col: number, row: number, shape: NodeShape, ranks: number][] = [
  [0, 2, 'square', 1], [1, 2, 'square', 2], [2, 1, 'cut', 3], [2, 3, 'cut', 3], [3, 1, 'square', 1], [3, 3, 'square', 2],
  [4, 0, 'cut', 3], [4, 2, 'cut', 2], [4, 4, 'square', 1], [5, 2, 'square', 2], [6, 0, 'spiked', 1], [6, 2, 'spiked', 1],
  [6, 4, 'spiked', 1],
];
const LINKS: [number, number][] = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [4, 7], [5, 7], [5, 8], [7, 9], [6, 10], [9, 11], [8, 12]];

function job(key: string, name: string, icon: string, nodes: [icon: string, name: string, does: string][]): Job {
  return {
    key, name, icon,
    nodes: nodes.map(([ic, n, d], i) => ({ id: `${key}.${i}`, col: PLAN[i][0], row: PLAN[i][1], shape: PLAN[i][2], ranks: PLAN[i][3], icon: ic, name: n, does: d })),
    links: LINKS.map(([a, b]) => [`${key}.${a}`, `${key}.${b}`]),
  };
}

export const JOBS: Job[] = [
  job('melee', 'Melee', 'blade', [
    ['boots', 'Sure footing', 'Not thrown back by a blow'],
    ['haunch', 'Deep breath', '+2 life a rank'],
    ['blade', 'Heavy swing', '+8% harm with an edge a rank'],
    ['helm', 'Stand fast', '-6% harm taken while still, a rank'],
    ['axe', 'Cleave', 'A swing strikes two that stand close'],
    ['plate', 'Plate-wearer', 'Plate slows you 10% less a rank'],
    ['blade', 'Follow through', 'A kill gives back a breath, a rank'],
    ['greaves', 'Hold the door', 'Feeders go for you before the holder'],
    ['tonic', 'Salve in hand', 'A salve heals 4 more'],
    ['pendant', 'Carry the lees', 'Lees carried draws feeders 10% less'],
    ['blade', 'Breaker', 'A full swing breaks a guard'],
    ['helm', 'The wall', 'Nothing passes you to the holder'],
    ['plate', 'Last to fall', 'Once a night, a fall leaves you at 1'],
  ]),
  job('ranged', 'Ranged', 'bow', [
    ['boots', 'Light step', 'Draw while walking'],
    ['arrow', 'Steady hand', '+5% reach a rank'],
    ['bow', 'Long draw', '+8% harm drawn full, a rank'],
    ['arrow', 'Quick nock', '-6% time between arrows, a rank'],
    ['arrow', 'Barbed heads', 'A hit bleeds for 3 s'],
    ['helm', 'Far sight', 'See a body 4 m farther, a rank'],
    ['bow', 'From the wall', '+10% harm from inside a held place'],
    ['arrow', 'Through the gap', 'Arrows pass one body, a rank'],
    ['boots', 'Fletcher', 'One arrow in four is not spent'],
    ['bow', 'Bring it down', '+15% harm to what flies, a rank'],
    ['arrow', 'Pin down', 'A full draw holds a body still for 1 s'],
    ['bow', 'Volley', 'Three arrows on one draw'],
    ['helm', 'Last arrow', 'The last arrow in the quiver strikes twice'],
  ]),
  job('crystal', 'Crystal-work', 'crystal', [
    ['tonic', 'Steady arm', '+4 arm'],
    ['crystal', 'Clean line', 'Driving costs 5% less a rank'],
    ['crystal', 'Long line', '+2 m to a cut line, a rank'],
    ['pendant', 'Hard arm', 'The arm stops answering 8% later, a rank'],
    ['crystal', 'Split line', 'A line forks to a second body'],
    ['tonic', 'Slow tonic', 'A tonic lasts 20% longer a rank'],
    ['crystal', 'Bright head', '+8% harm through a staff, a rank'],
    ['pendant', 'At the holder’s cost', 'Draw from the holder when the arm is spent'],
    ['tonic', 'Cool arm', 'The arm rests 1 s sooner'],
    ['crystal', 'Old lees', 'Crystal from geodes counts twice, a rank'],
    ['crystal', 'Through stone', 'A line cut in stone does not leak'],
    ['pendant', 'Held line', 'Hold a line on one body as long as the arm lasts'],
    ['tonic', 'Spent and standing', 'An overdriven arm costs life, not a fall'],
  ]),
  job('totem', 'Totem', 'pendant', [
    ['haunch', 'Full pack', 'Carry two more food'],
    ['haunch', 'Good food', 'Food on a totem lasts 10% longer a rank'],
    ['pendant', 'Quick forming', 'What forms on a totem comes 8% sooner a rank'],
    ['bait', 'Two at once', '+1 small feeder at once, a rank'],
    ['pendant', 'Close by', 'Small feeders stay within 6 m'],
    ['haunch', 'Fed well', 'Small feeders have 10% more life a rank'],
    ['bait', 'Hungry', '+8% harm by what formed, a rank'],
    ['pendant', 'Lamp-bearer', 'The totem lights 4 m round, a rank'],
    ['haunch', 'Leftovers', 'A small feeder that falls gives back food'],
    ['bait', 'Shared food', 'Small feeders heal one another, a rank'],
    ['pendant', 'The great one', 'One feeder forms large instead of three'],
    ['bait', 'Swarm', '+2 small feeders at once'],
    ['haunch', 'Never starved', 'Food on a totem is not spent at night'],
  ]),
  job('cutter', "Cutter's trade", 'pick', [
    ['pick', 'Good grip', 'Break blocks 5% faster'],
    ['spade', 'Soft ground', 'Dig earth 10% faster a rank'],
    ['pick', 'Hard rock', 'Break stone 8% faster a rank'],
    ['axe', 'Feller', 'Fell timber 8% faster a rank'],
    ['ore', 'Eye for ore', 'Ore shows through 2 blocks of stone'],
    ['log', 'Long beams', 'Planks from a log: one more, a rank'],
    ['ingot', 'Hot furnace', 'Smelting is 8% faster a rank'],
    ['brick', 'Builder', 'Placing reaches 1 stride further, a rank'],
    ['coal', 'Slow burn', 'Fuel lasts 15% longer'],
    ['ore', 'Rich seams', 'One ore in eight gives two, a rank'],
    ['pick', 'Through to the floor', 'A pick breaks Dressed Stone'],
    ['brick', 'Raised in a day', 'One block in four set from the hotbar is free'],
    ['ingot', 'Second smelt', 'A furnace gives one bar in five again'],
  ]),
];

/** Ranks each of the crew has taken, by seat, in each job; what is not listed is not taken. */
export const TAKEN: Record<number, Record<string, number>> = {
  1: { 'melee.0': 1, 'melee.1': 2, 'melee.2': 2, 'melee.3': 3, 'melee.5': 1, 'cutter.0': 1, 'cutter.1': 1 },
  2: { 'crystal.0': 1, 'crystal.1': 2, 'crystal.2': 3, 'crystal.4': 1, 'crystal.6': 2 },
  3: { 'ranged.0': 1, 'ranged.1': 2, 'ranged.2': 3, 'ranged.3': 3, 'ranged.4': 1, 'ranged.5': 2, 'ranged.7': 1 },
  4: { 'cutter.0': 1, 'cutter.1': 2, 'cutter.2': 3, 'cutter.4': 1, 'cutter.6': 1 },
  5: { 'totem.0': 1, 'totem.1': 2, 'totem.2': 1 },
  6: { 'melee.0': 1, 'melee.1': 1 },
  8: { 'cutter.0': 1, 'cutter.1': 2, 'cutter.2': 3, 'cutter.3': 3, 'cutter.4': 1, 'cutter.5': 2, 'cutter.6': 3, 'cutter.7': 2, 'cutter.9': 2, 'cutter.11': 1 },
};

/** One's own points not yet spent. */
export const TO_SPEND = 3;

/** A head in each seat's colour, for the side tabs of the crew. */
export const ICONS: Record<string, PixelMap> = HEAD_ICONS;
