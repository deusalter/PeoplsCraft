// The things of the play screens' sample data. Keys, names, grades and stack sizes are the game's own (src/data and
// docs/world/names.json); `icon` is the picture the kit has for it until the icons are redrawn by hand.
import type { Colour } from '../palette';
import { GRADES } from '../palette';
import type { Tip, TipLine } from '../node';

export type Wear = 'head' | 'body' | 'legs' | 'trinket';

export interface Thing {
  key: string;
  name: string;
  grade: number;
  /** What it is, as the second line of its tooltip says it after the grade. */
  kind: string;
  stack: number;
  icon: string;
  /** Lines in salt: what it does. */
  does?: string[];
  /** The telling, in grey. */
  tell?: string;
  wear?: Wear;
  /** Seconds it burns. */
  fuel?: number;
  /** A set line, in arm blue. */
  set?: string;
  /** Defence it gives when worn, for the body panel's totals. */
  def?: number;
  /** Matches a pattern's `#tag`. */
  tags?: string[];
}

const T: Thing[] = [];
const add = (key: string, name: string, grade: number, kind: string, icon: string, o: Partial<Thing> = {}): void => {
  T.push({ key, name, grade, kind, icon, stack: 99, ...o });
};

// materials
add('stick', 'Stick', 0, 'material', 'stick', { fuel: 5 });
add('coal', 'Coal', 0, 'material', 'coal', { fuel: 80 });
add('flint', 'Flint', 0, 'material', 'flint');
add('fiber', 'Plant Fiber', 0, 'material', 'fiber');
add('feather', 'Feather', 0, 'material', 'feather');
add('hide', 'Hide', 0, 'material', 'hide');
add('bone', 'Bone', 0, 'material', 'bone');
add('iron_bar', 'Iron Bar', 0, 'material', 'ingot', { tell: 'Smelted from iron ore. Metal gear is made of it at the anvil.' });
add('gold_bar', 'Gold Bar', 1, 'material', 'gold_bar');
add('lumenite', 'Hīrak', 2, 'material', 'crystal', { tell: 'A clear gem from the deep rock. It gives a cold light.' });
add('mana_crystal', 'Crystal', 1, 'material', 'mana_crystal', { tell: 'Old lees, set hard. The head of every staff.' });
add('cinder_bar', 'Jalit Bar', 2, 'material', 'cinder_bar');
add('umbrite_bar', 'Antar Bar', 3, 'material', 'umbrite_bar');
add('noctrium_bar', 'Tala Bar', 3, 'material', 'noctrium_bar');
add('aether_bar', 'Ākās Bar', 4, 'material', 'aether_bar');
add('prism_bar', 'Patik Bar', 4, 'material', 'prism_bar');
add('eclipse_bar', 'Gahan Bar', 5, 'material', 'eclipse_bar');
add('ember_dust', 'Ember Dust', 1, 'material', 'ember_dust', { fuel: 160 });
add('weave', 'Crystal Fiber', 1, 'material', 'fiber', { tell: 'Fiber laid round a crystal.' });
add('gel', 'Jelly', 0, 'material', 'gel');
add('shade_essence', 'Shade Flesh', 1, 'material', 'shade_essence');
add('chitin', 'Stone Scale', 0, 'material', 'chitin');
add('spore_sac', 'Spore Sac', 2, 'material', 'spore_sac');
add('bog_pearl', 'Lees Lump', 1, 'lees', 'bog_pearl', { stack: 999, tell: 'Lees boiled down and dried. Every hearth weighs it in.' });
add('ash_token', 'Mūda', 1, 'token', 'ash_token', { tell: 'Glass from under a sand-country fire. A night inside the light at any of their fires.' });
add('heartroot', 'Vanahar Remains', 2, 'remains', 'heartroot', { stack: 1, tell: 'It still moves. On a bench it loosens two worked pieces far enough to join them.' });
add('scorched_core', 'Maruhar Remains', 3, 'remains', 'scorched_core', { stack: 1, tell: 'Bedded in a ring of deep rock, it loosens Jalit ore.' });
add('queen_spore', 'Guhamāt Remains', 4, 'remains', 'queen_spore', { stack: 1, tell: 'Feeds a kiln that burns without heat.' });
add('prism_heart', 'Ratan Remains', 5, 'remains', 'prism_heart', { stack: 1, tell: 'Splits light, heat and ore alike.' });
add('eclipse_ember', 'Kuranga Remains', 5, 'remains', 'eclipse_ember', { stack: 1, tell: 'A coal from the last eclipse. It has not gone out.' });

// ores and blocks
add('iron_ore', 'Iron Ore', 0, 'block', 'ore', { tell: 'Tan flecks in stone. A stone pick lifts it.' });
add('gold_ore', 'Gold Ore', 1, 'block', 'gold_ore');
add('lumenite_ore', 'Hīrak Ore', 2, 'block', 'lumenite_ore', { tell: 'Cyan gems in deep rock. Iron pick or better.' });
add('cindrite_ore', 'Jalit Ore', 2, 'block', 'cindrite_ore', { tell: 'Glowing orange ore near molten rock.' });
add('umbrite_ore', 'Antar Ore', 3, 'block', 'umbrite_ore');
add('noctrium_ore', 'Tala Ore', 3, 'block', 'umbrite_ore');
add('aetherium_ore', 'Ākās Ore', 4, 'block', 'lumenite_ore');
add('prismite_ore', 'Patik Ore', 4, 'block', 'lumenite_ore');
add('eclipsium_ore', 'Gahan Ore', 5, 'block', 'umbrite_ore');
add('cobble', 'Rubble', 0, 'block', 'cobble');
add('stone', 'Stone', 0, 'block', 'stone');
add('deepstone', 'Deep Rock', 1, 'block', 'deepstone');
add('wardstone', 'Dressed Stone', 2, 'block', 'brick', { tell: 'Stone cut square and set without mortar by the first comers. Nothing feeds through it.' });
add('stone_bricks', 'Stone Bricks', 0, 'block', 'brick');
add('grass', 'Turf', 0, 'block', 'turf');
add('dirt', 'Dirt', 0, 'block', 'dirt');
add('sand', 'Sand', 0, 'block', 'sand');
add('glass', 'Glass', 0, 'block', 'glass');
add('clay', 'Clay', 0, 'block', 'clay');
add('bricks', 'Clay Bricks', 0, 'block', 'bricks');
add('oak_log', 'Oak Log', 0, 'block', 'log', { fuel: 15, tags: ['log'] });
add('pine_log', 'Pine Log', 0, 'block', 'log', { fuel: 15, tags: ['log'] });
add('oak_planks', 'Oak Planks', 0, 'block', 'oak_planks', { fuel: 12, tags: ['planks'] });
add('torch', 'Torch', 0, 'block', 'torch');
add('mushroom_brown', 'Brown Mushroom', 0, 'block', 'mushroom_brown');
add('mushroom_red', 'Red Mushroom', 0, 'block', 'mushroom_red');
add('glowshroom', 'Glowing Mushroom', 1, 'block', 'mushroom_red');
add('gloomcap_violet', 'Violet Fungus Cap', 1, 'block', 'mushroom_red');
add('rift_frame', 'Island Gate Frame', 4, 'block', 'brick', { stack: 1 });
add('workbench', 'Workbench', 0, 'station', 'workbench');
add('furnace', 'Stone Furnace', 0, 'station', 'furnace');
add('anvil', 'Anvil', 0, 'station', 'anvil');
add('runeloom', 'Line Frame', 1, 'station', 'runeloom');
add('tinker_bench', 'Joining Bench', 2, 'station', 'tinker_bench');
add('chest', 'Chest', 0, 'station', 'chest');
add('door', 'Door', 0, 'block', 'door', { stack: 16 });
add('bedroll', 'Bedroll', 0, 'block', 'bedroll');
add('lantern', 'Lantern', 0, 'block', 'torch');

// food and draughts
add('apple', 'Apple', 0, 'food', 'apple', { does: ['Fills 4 hunger'] });
add('berries', 'Wild Berries', 0, 'food', 'apple', { does: ['Fills 2 hunger'] });
add('raw_meat', 'Raw Meat', 0, 'food', 'raw_meat', { does: ['Fills 3 hunger'] });
add('cooked_meat', 'Roast Meat', 0, 'food', 'haunch', { does: ['Fills 9 hunger'] });
add('raw_fish', 'Raw Fish', 0, 'food', 'raw_fish', { does: ['Fills 2 hunger'] });
add('cooked_fish', 'Roast Fish', 0, 'food', 'raw_fish', { does: ['Fills 7 hunger'] });
add('stew', 'Mushroom Stew', 0, 'food', 'stew', { stack: 16, does: ['Fills 8 hunger'] });
add('salve', 'Healing Salve', 1, 'salve', 'tonic', { stack: 20, does: ['Mends 40 life'], tell: 'A short wait before the next.' });
add('greater_salve', 'Greater Salve', 3, 'salve', 'tonic', { stack: 20, does: ['Mends 100 life'] });
add('tonic', 'Tonic', 1, 'draught', 'tonic_arm', { stack: 20, does: ['Fills 60 of the arm'] });
add('ironbark', 'Bark Draught', 1, 'draught', 'ironbark', { stack: 20, does: ['+6 defence for 3:00'] });
add('swiftroot', 'Flower Tea', 1, 'draught', 'swiftroot', { stack: 20, does: ['+20% speed for 3:00'] });
add('recall_stone', 'Recall Stone', 2, 'stone', 'recall_stone', { stack: 1, does: ['Takes you back to your bed'], tell: 'It cools for a while after.' });

// ammunition and baits
add('arrow', 'Arrow', 0, 'arrow', 'arrow', { does: ['+2 harm to a bow'] });
add('barbed_arrow', 'Barbed Arrow', 1, 'arrow', 'arrow', { does: ['+5 harm to a bow'] });
add('verdant_idol', 'Vanahar Likeness', 1, 'bait', 'bait', { stack: 20, tell: 'Lay it on a Vanahar Altar. Vanahar comes up to it.' });
add('warden_bell', 'Kankāl Bell', 2, 'bait', 'warden_bell', { stack: 20, tell: 'Lay it on a Kankāl Altar. Kankāl comes up to it.' });
add('cairn_key', 'Cairn Key', 5, 'bait', 'key', { stack: 20, tell: 'Lay it on the Cairn. Nihān comes up through the base to take it.' });

// tools and weapons
const tool = (key: string, name: string, grade: number, kind: string, icon: string, harm: number, extra: string[] = []): void =>
  add(key, name, grade, kind, icon, { stack: 1, does: [`${harm} harm`, ...extra] });
tool('wood_pickaxe', 'Wooden Pick', 0, 'tool', 'pick', 2, ['Breaks stone']);
tool('stone_pickaxe', 'Stone Pick', 0, 'tool', 'pick', 4, ['Lifts iron ore']);
tool('iron_pickaxe', 'Iron Pick', 1, 'tool', 'pick', 6, ['Breaks gold, geodes and Hīrak']);
tool('lumenite_pickaxe', 'Hīrak Pick', 2, 'tool', 'pick', 8, ['Bites Jalit ore and black glass']);
tool('iron_axe', 'Iron Axe', 1, 'tool', 'axe', 8);
tool('iron_shovel', 'Iron Shovel', 1, 'tool', 'spade', 5);
tool('wood_sword', 'Wooden Sword', 0, 'weapon', 'blade', 4);
tool('stone_sword', 'Stone Sword', 0, 'weapon', 'blade', 6);
tool('iron_sword', 'Iron Sword', 1, 'weapon', 'blade', 9);
tool('lumenite_sword', 'Hīrak Sword', 2, 'weapon', 'blade', 13);
tool('cinder_sword', 'Jalit Sword', 2, 'weapon', 'blade', 18);
tool('wood_bow', 'Wooden Bow', 0, 'weapon', 'bow', 3, ['Shoots arrows']);
tool('iron_bow', 'Iron Bow', 1, 'weapon', 'bow', 8, ['Shoots arrows']);
tool('iron_staff', 'Iron Staff', 1, 'weapon', 'iron_staff', 9, ['Draws 7 from the arm a bolt']);
tool('iron_totem', 'Iron Totem', 1, 'weapon', 'iron_totem', 5, ['A Kantak forms on what you carry']);

// old things found (docs/world 8.8): each is one of a kind, named, and of grade Old
add('find:stone_staff', 'Stone Staff', 6, 'staff', 'stone_staff', {
  stack: 1, does: ['31 harm', 'Draws nothing from the arm'], tell: 'A first comers\' rod of dressed stone with cut lines and a gem seat. A line cut in stone does not leak.',
});
add('find:cutter_saw', 'Steel Saw', 6, 'tool', 'axe', { stack: 1, does: ['Fells timber fast'], tell: 'Steel is a metal nobody makes on this ground.' });

// armour
const wear = (key: string, name: string, grade: number, icon: string, slot: Wear, def: number, set?: string): void =>
  add(key, name, grade, 'armour', icon, { stack: 1, wear: slot, def, does: [`+${def} defence`], set });
wear('hide_0', 'Hide Cap', 0, 'hide_cap', 'head', 1, 'Hide: +1 defence, +4% speed');
wear('hide_1', 'Hide Vest', 0, 'plate', 'body', 1, 'Hide: +1 defence, +4% speed');
wear('hide_2', 'Hide Trousers', 0, 'greaves', 'legs', 1, 'Hide: +1 defence, +4% speed');
wear('iron_melee_0', 'Iron Helm', 1, 'helm', 'head', 2, 'Plate: +8% melee harm, +4 defence');
wear('iron_melee_1', 'Iron Cuirass', 1, 'plate', 'body', 3, 'Plate: +8% melee harm, +4 defence');
wear('iron_melee_2', 'Iron Greaves', 1, 'greaves', 'legs', 2, 'Plate: +8% melee harm, +4 defence');
wear('lumenite_melee_1', 'Hīrak Cuirass', 2, 'plate', 'body', 4, 'Plate: +9% melee harm, +5 defence');

// trinkets
const trinket = (key: string, name: string, grade: number, icon: string, does: string[]): void =>
  add(key, name, grade, 'trinket', icon, { stack: 1, wear: 'trinket', does });
trinket('strider_boots', 'Walking Boots', 1, 'boots', ['+12% speed']);
trinket('spring_anklet', 'Anklet', 1, 'spring_anklet', ['+20% jump height']);
trinket('bounding_boots', 'Spring Boots', 2, 'boots', ['+14% speed', '+22% jump height']);
trinket('iron_bracer', 'Arm Guard', 1, 'iron_bracer', ['+3 defence']);
trinket('warriors_band', 'Arm Ring', 1, 'warriors_band', ['+8% melee harm']);
trinket('marksman_lens', 'Eyeglass', 1, 'marksman_lens', ['+8% ranged harm', '+4% critical chance']);
trinket('duelists_sigil', 'Knuckle Band', 3, 'warriors_band', ['+9% harm', '+5% critical chance']);
trinket('heart_locket', 'Locket', 1, 'pendant', ['+20 life']);
trinket('mana_charm', 'Crystal Charm', 1, 'pendant', ['+40 to the arm']);
trinket('soul_reliquary', 'Crystal Pendant', 3, 'pendant', ['+30 life, +50 to the arm', 'Both mend steadily']);
trinket('feather_charm', 'Feather Charm', 1, 'feather', ['No harm from a fall']);
trinket('cloud_bottle', 'Cloud Bottle', 2, 'cloud_bottle', ['A second jump in the air']);
trinket('gale_emblem', 'Cloud Emblem', 3, 'feather', ['A second jump', 'No harm from a fall']);
trinket('shadow_cloak', 'Dark Cloak', 3, 'shadow_cloak', ['One blow in ten slips past']);
trinket('delvers_charm', 'Wrist Scale', 1, 'chitin', ['+25% digging speed']);
trinket('magnet_shell', 'Shell', 1, 'magnet_shell', ['Draws in dropped things from farther']);
trinket('lucky_coin', 'Worn Coin', 2, 'ash_token', ['Creatures drop 25% more']);
trinket('reach_gauntlet', 'Long Glove', 2, 'iron_bracer', ['+1.5 reach, +6% blow speed']);
trinket('sages_ring', 'Crystal Ring', 1, 'warriors_band', ['+8% crystal-work harm', '+20 to the arm']);
trinket('mossheart_sprig', 'Vanahar Sprig', 2, 'heartroot', ['Life mends faster', '+15 life']);
trinket('wardens_aegis', 'Kankāl Plate', 3, 'iron_bracer', ['+8 defence', 'You barely move when struck']);

export const THINGS = new Map<string, Thing>(T.map((t) => [t.key, t]));

export function thing(key: string): Thing {
  const t = THINGS.get(key);
  if (!t) throw new Error(`sample: no thing ${key}`);
  return t;
}

/**
 * The modifiers of the game: a name before the thing's and a step of grade. What one adds to defence is kept apart as
 * `def`, so that a tooltip states the thing's defence once, with the modifier already in it.
 */
export const MODS: Record<string, { name: string; rar: number; lines: TipLine[]; def?: number }> = {
  keen: { name: 'Keen', rar: 0, lines: [{ text: '+5% critical chance', c: 'growth.lt' }] },
  savage: { name: 'Quenched', rar: 1, lines: [{ text: '+12% harm', c: 'growth.lt' }] },
  swift: { name: 'Lean', rar: 0, lines: [{ text: '+10% blow speed', c: 'growth.lt' }] },
  heavy: { name: 'Heavy', rar: 0, lines: [{ text: '+18% harm', c: 'growth.lt' }, { text: '-10% blow speed', c: 'blood.lt' }] },
  dull: { name: 'Dull', rar: -1, lines: [{ text: '-8% harm', c: 'blood.lt' }] },
  blessed: { name: 'Favoured', rar: 2, lines: [{ text: '+15% harm, +5% critical chance', c: 'growth.lt' }, { text: '+8% blow speed', c: 'growth.lt' }] },
  warding: { name: 'Thick', rar: 0, lines: [], def: 2 },
  brittle: { name: 'Brittle', rar: -1, lines: [], def: -1 },
  radiant: { name: 'Glowing', rar: 2, lines: [{ text: '+6% harm, +10 life', c: 'growth.lt' }], def: 2 },
};

/** A stack in a slot, by the game's key, with a modifier when it carries one. */
export interface Stack { key: string; n: number; mod?: string }

export function stackName(s: Stack): string { return (s.mod ? `${MODS[s.mod].name} ` : '') + thing(s.key).name; }
export function stackGrade(s: Stack): number { return Math.max(0, Math.min(6, thing(s.key).grade + (s.mod ? MODS[s.mod].rar : 0))); }
export function gradeColour(g: number): Colour { return GRADES[g].dark; }

/** What the mouse does over a slot, as the last line of its tooltip says it. */
export type Hint = 'slot' | 'none' | string;

/**
 * The tooltip of a stack (5.12): its name in the grade's colour; the grade and kind in grey; what it does in salt;
 * the modifier's lines that compare; the set line in arm blue; the telling in grey; what the mouse does here.
 */
export function stackTip(s: Stack, hint: Hint = 'slot', extra: TipLine[] = []): Tip {
  const t = thing(s.key), g = stackGrade(s);
  const lines: TipLine[] = [{ text: stackName(s), c: GRADES[g].dark }, { text: `${GRADES[g].name} grade, ${t.kind}`, c: 'root.4' }];
  const mod = s.mod ? MODS[s.mod] : undefined;
  const def = (t.def ?? 0) + (mod?.def ?? 0);
  for (const d of t.does ?? []) lines.push({ text: t.def !== undefined && d === `+${t.def} defence` ? `${def < 0 ? '' : '+'}${def} defence` : d, c: 'salt' });
  if (t.def === undefined && mod?.def) lines.push({ text: `${mod.def < 0 ? '' : '+'}${mod.def} defence`, c: mod.def < 0 ? 'blood.lt' : 'growth.lt' });
  if (t.fuel) lines.push({ text: `Burns ${t.fuel} s`, c: 'salt' });
  if (mod) lines.push(...mod.lines);
  lines.push(...extra);
  if (t.set) lines.push({ text: t.set, c: 'arm.lt' });
  if (t.tell) lines.push({ text: t.tell, c: 'root.4' });
  if (hint === 'slot') lines.push({ text: s.n > 1 ? '{lmb} take   {rmb} take half' : '{lmb} take', c: 'root.4' });
  else if (hint !== 'none') lines.push({ text: hint, c: 'root.4' });
  return { lines, frame: GRADES[g].frame };
}
