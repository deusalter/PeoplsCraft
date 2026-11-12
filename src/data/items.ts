// Item table. Hand-written entries plus gear generated from the tier table, so a new
// material tier is one line in TIERS and every tool, weapon and armour piece follows.
import { BLOCKS, ToolKind } from './blocks';

export type Style = 'melee' | 'ranged' | 'magic' | 'summon';
export type StatKey = 'melee' | 'ranged' | 'magic' | 'summon' | 'dmg' | 'crit' | 'def' | 'hp' | 'mana' | 'manaRegen' | 'regen' | 'speed' | 'jump'
  | 'minions' | 'mining' | 'atkSpeed' | 'knockRes' | 'pickup' | 'extraJump' | 'noFall' | 'thorns' | 'dodge' | 'luck' | 'swim' | 'reach';
export type Stats = Partial<Record<StatKey, number>>;

export interface IconSpec { t: string; a: number; b?: number; c?: number }
export interface ItemDef {
  key: string; name: string; stack: number; rarity: number; icon: IconSpec | null;
  block?: number;
  tool?: { kind: ToolKind; speed: number; power: number };
  weapon?: { style: Style; dmg: number; rate: number; knock: number; reach?: number; proj?: string; mana?: number; ammo?: boolean; minion?: string; projSpeed?: number };
  armor?: { slot: 0 | 1 | 2; set: string };
  acc?: boolean;
  stats?: Stats;
  food?: number; heal?: number; restoreMana?: number; buff?: [key: string, seconds: number];
  fuel?: number; ammoDmg?: number;
  use?: string;        // special right-click action
  tier?: number; desc?: string; tags?: string[];
}

export interface Tier { key: string; name: string; mat: string; color: number; speed: number; power: number; dmg: number; def: number; rar: number; station: string;
  names: [sword: string, bow: string, staff: string, totem: string]; minion: string;
  trim?: number }   // second colour for edges, guards and bands, so close-hued tiers stay distinguishable
export const TIERS: Tier[] = [
  { key: 'wood', name: 'Wooden', mat: '#planks', color: 0xb88a4e, speed: 2, power: 1, dmg: 4, def: 0, rar: 0, station: 'workbench', names: ['Wooden Sword', 'Wooden Bow', '', ''], minion: '' },
  { key: 'stone', name: 'Stone', mat: 'cobble', color: 0x8b8f96, speed: 4, power: 2, dmg: 6, def: 0, rar: 0, station: 'workbench', names: ['Stone Sword', 'Stone Bow', '', ''], minion: '' },
  { key: 'iron', name: 'Iron', mat: 'iron_bar', color: 0xd4d6dc, speed: 6, power: 3, dmg: 9, def: 2, rar: 1, station: 'anvil', names: ['Iron Sword', 'Iron Bow', 'Iron Staff', 'Iron Totem'], minion: 'm_thornling' },
  { key: 'lumenite', name: 'Hīrak', mat: 'lumenite', color: 0x4fe6e0, speed: 8, power: 4, dmg: 13, def: 3, rar: 2, station: 'anvil', names: ['Hīrak Sword', 'Hīrak Bow', 'Hīrak Staff', 'Hīrak Totem'], minion: 'm_wisp' },
  { key: 'cinder', name: 'Jalit', mat: 'cinder_bar', color: 0xff7a2a, speed: 10, power: 5, dmg: 18, def: 4, rar: 2, station: 'anvil', names: ['Jalit Sword', 'Jalit Bow', 'Jalit Staff', 'Jalit Totem'], minion: 'm_brazier' },
  { key: 'umbrite', name: 'Antar', mat: 'umbrite_bar', color: 0x9a5af0, speed: 12, power: 6, dmg: 24, def: 5, rar: 3, station: 'anvil', names: ['Antar Sword', 'Antar Bow', 'Antar Staff', 'Antar Totem'], minion: 'm_shade', trim: 0xd8a0ff },
  { key: 'noctrium', name: 'Tala', mat: 'noctrium_bar', color: 0x1f9e8a, speed: 14, power: 7, dmg: 31, def: 6, rar: 3, station: 'anvil', names: ['Tala Sword', 'Tala Bow', 'Tala Staff', 'Tala Totem'], minion: 'm_mycelid', trim: 0xb6ff8a },
  { key: 'aether', name: 'Ākās', mat: 'aether_bar', color: 0x4fb6f6, speed: 16, power: 8, dmg: 40, def: 8, rar: 4, station: 'anvil', names: ['Ākās Sword', 'Ākās Bow', 'Ākās Staff', 'Ākās Totem'], minion: 'm_zephyr', trim: 0xffffff },
  { key: 'prism', name: 'Patik', mat: 'prism_bar', color: 0xf6a0f0, speed: 19, power: 9, dmg: 51, def: 10, rar: 4, station: 'anvil', names: ['Patik Sword', 'Patik Bow', 'Patik Staff', 'Patik Totem'], minion: 'm_shardling' },
  { key: 'eclipse', name: 'Gahan', mat: 'eclipse_bar', color: 0x7a3ad0, speed: 23, power: 10, dmg: 66, def: 12, rar: 5, station: 'anvil', names: ['Gahan Sword', 'Gahan Bow', 'Gahan Staff', 'Gahan Totem'], minion: 'm_moon', trim: 0xffb45a },
];

export const STYLES: Style[] = ['melee', 'ranged', 'magic', 'summon'];
export const STYLE_INFO: Record<Style, { set: string; pieces: [string, string, string]; icons: [string, string, string]; accent: number; defMul: number; label: string }> = {
  melee: { set: 'Plate', pieces: ['Helm', 'Cuirass', 'Greaves'], icons: ['helm', 'chest', 'legs'], accent: 0x8a8e96, defMul: 1, label: 'Melee' },
  ranged: { set: 'Leather', pieces: ['Hood', 'Jerkin', 'Leggings'], icons: ['hood', 'jerkin', 'legs'], accent: 0x8a5f34, defMul: 0.8, label: 'Ranged' },
  magic: { set: 'Cloth', pieces: ['Circlet', 'Robe', 'Skirt'], icons: ['circlet', 'robe', 'skirt'], accent: 0x6a4ab8, defMul: 0.6, label: 'Crystal-work' },
  summon: { set: 'Harness', pieces: ['Mask', 'Mantle', 'Wraps'], icons: ['mask', 'mantle', 'wraps'], accent: 0x2f8a7a, defMul: 0.6, label: 'Totem' },
};
export const RARITY = [
  { name: 'Surface', color: '#e9e4d6' }, { name: 'Upper', color: '#7fd66b' }, { name: 'Deep', color: '#5aa9ff' }, { name: 'Hollow', color: '#c07bff' },
  { name: 'Island', color: '#ffa13c' }, { name: 'Floor', color: '#ff5f8a' }, { name: 'Old', color: '#ffe27a' },
];

const L: ItemDef[] = [];
const add = (key: string, name: string, icon: IconSpec, o: Partial<ItemDef> = {}): void => { L.push({ key, name, stack: 99, rarity: 0, icon, ...o }); };
const mat = (key: string, name: string, t: string, a: number, b: number | undefined, rarity = 0, desc = '', c?: number): void => add(key, name, { t, a, b, c }, { rarity, desc });

// ---- materials ----
mat('stick', 'Stick', 'stick', 0x9a6a3a, undefined);
L[L.length - 1].fuel = 5;
mat('coal', 'Coal', 'chunk', 0x2a2a32, 0x55555f); L[L.length - 1].fuel = 80;
mat('flint', 'Flint', 'chunk', 0x4a4e5a, 0x8a8e9a);
mat('fiber', 'Plant Fiber', 'fiber', 0x9ac86a, 0x5f8a3a);
mat('feather', 'Feather', 'feather', 0xf0f0f6, 0xb8b8c6);
mat('hide', 'Hide', 'hide', 0xa8703c, 0x6a4420);
mat('bone', 'Bone', 'bone', 0xece6d2, 0xb0a890);
mat('iron_bar', 'Iron Bar', 'ingot', 0xd4d6dc, undefined);
mat('gold_bar', 'Gold Bar', 'ingot', 0xf4cb3a, undefined, 1);
mat('lumenite', 'Hīrak', 'gem', 0x4fe6e0, undefined, 2, 'A clear gem from the deep rock. It gives a cold light.');
mat('mana_crystal', 'Crystal', 'gem', 0x4f86f6, undefined, 1, 'Old lees, set hard. The head of every staff.');
mat('cinder_bar', 'Jalit Bar', 'ingot', 0xff7a2a, undefined, 2);
mat('umbrite_bar', 'Antar Bar', 'ingot', 0x9a5af0, undefined, 3, '', 0xd8a0ff);
mat('noctrium_bar', 'Tala Bar', 'ingot', 0x1f9e8a, undefined, 3, '', 0xb6ff8a);
mat('aether_bar', 'Ākās Bar', 'ingot', 0x4fb6f6, undefined, 4, '', 0xffffff);
mat('prism_bar', 'Patik Bar', 'ingot', 0xf6a0f0, undefined, 4);
mat('eclipse_bar', 'Gahan Bar', 'ingot', 0x7a3ad0, undefined, 5, '', 0xffb45a);
mat('weave', 'Crystal Fiber', 'cloth', 0x6a4ab8, 0xc8a0ff, 1, 'Fiber laid round a crystal.');
mat('effigy', 'Carved Bone', 'idol', 0xece6d2, 0x2f8a7a, 1, 'A little carved thing that something answers to.');
// creature drops
mat('gel', 'Jelly', 'orb', 0x7ad6a0, 0x3f8a5a);
mat('thorn', 'Thorn', 'fang', 0x6a8a3a, 0x3a5a1a);
mat('shade_essence', 'Shade Flesh', 'orb', 0x5a4a8a, 0x1a1430, 1);
mat('ember_dust', 'Ember Dust', 'dust', 0xff8a2a, 0xffe06a, 1); L[L.length - 1].fuel = 160;
mat('chitin', 'Stone Scale', 'scale', 0x6a5a4a, 0x3a2e24);
mat('frost_fang', 'Vaka Tooth', 'fang', 0xcfeaff, 0x7ab0e0, 1);
mat('bog_pearl', 'Lees Lump', 'orb', 0x9ab86a, 0x4a6a3a, 1);
mat('rust_core', 'Rust Lump', 'gear', 0xb8623a, 0x5a3a2a, 1);
mat('spore_sac', 'Spore Sac', 'orb', 0x8af0d8, 0x3f8f86, 2);
mat('moth_dust', 'Moth Dust', 'dust', 0xc8a0ff, 0xf0e0ff, 2);
mat('rift_scale', 'Vihanga Scale', 'scale', 0x9ab6ff, 0x4a5ab0, 3);
mat('shard', 'Shard', 'gem', 0xf4f0ff, undefined, 3);
mat('ash_token', 'Mūda', 'coin', 0x8a8a92, 0x4a4a52, 1, 'Glass from under a sand-country fire. A night inside the light at any of their fires.');
mat('moon_sliver', 'Moon Sliver', 'fang', 0xfff0d0, 0xd0b070, 3);
// boss drops
mat('heartroot', 'Vanahar Remains', 'root', 0x6ae05a, 0x8a5f3c, 2, 'It still moves. On a bench it loosens two worked pieces far enough to join them.');
mat('scorched_core', 'Maruhar Remains', 'orb', 0xff7a2a, 0x5a1a0a, 3, 'Bedded in a ring of deep rock, it loosens Jalit ore.');
mat('warden_sigil', 'Kankāl Remains', 'sigil', 0x6ab8f6, 0x2a3a5a, 3, 'A piece of Kankāl.');
mat('queen_spore', 'Guhamāt Remains', 'orb', 0x4ae6b8, 0x6a3f9a, 4, 'Feeds a kiln that burns without heat.');
mat('storm_plume', 'Jīmūt Remains', 'feather', 0x9ab6ff, 0xf4f8ff, 4, 'Crackles. Points upward no matter how you hold it.');
mat('prism_heart', 'Ratan Remains', 'gem', 0xf4f0ff, undefined, 5, 'Splits light, heat and ore alike.');
mat('eclipse_ember', 'Kuranga Remains', 'dust', 0xd86af6, 0x2a0a3a, 5, 'A coal from the last eclipse. It has not gone out.');
mat('cairn_heart', 'Nihān Remains', 'gem', 0xffd27a, undefined, 6, 'The first light, returned.');

// ---- food and consumables ----
add('apple', 'Apple', { t: 'fruit', a: 0xd83a32, b: 0x4a9a3c }, { food: 4 });
add('berries', 'Wild Berries', { t: 'berries', a: 0xd8344a, b: 0x3f8a3a }, { food: 2 });
add('raw_meat', 'Raw Meat', { t: 'meat', a: 0xd86a6a, b: 0xf0d0c0 }, { food: 3 });
add('cooked_meat', 'Roast Meat', { t: 'meat', a: 0x9a5a2a, b: 0xe0c8a0 }, { food: 9 });
add('raw_fish', 'Raw Fish', { t: 'fish', a: 0x6ab8d8, b: 0xd0e8f0 }, { food: 2 });
add('cooked_fish', 'Roast Fish', { t: 'fish', a: 0xc8884a, b: 0xf0e0c0 }, { food: 7 });
add('stew', 'Mushroom Stew', { t: 'bowl', a: 0x9a6a44, b: 0x8a5f34 }, { food: 8, stack: 16 });
add('glow_broth', 'Fungus Broth', { t: 'bowl', a: 0x3fe6c8, b: 0x4a5a6a }, { food: 10, restoreMana: 30, stack: 16, rarity: 2 });
add('skyfruit', 'Island Fruit', { t: 'fruit', a: 0x9ab6ff, b: 0x6fd8c0 }, { food: 6, heal: 10, rarity: 3 });
add('salve', 'Healing Salve', { t: 'flask', a: 0xe5544b }, { heal: 40, stack: 20, rarity: 1, desc: 'Restores 40 health. Short cooldown.' });
add('greater_salve', 'Greater Salve', { t: 'flask', a: 0xff8a6a }, { heal: 100, stack: 20, rarity: 3, desc: 'Restores 100 health.' });
add('tonic', 'Tonic', { t: 'flask', a: 0x5aa9ff }, { restoreMana: 60, stack: 20, rarity: 1 });
add('greater_tonic', 'Greater Tonic', { t: 'flask', a: 0x9ac8ff }, { restoreMana: 150, stack: 20, rarity: 3 });
add('ironbark', 'Bark Draught', { t: 'flask', a: 0x8a6a3a }, { buff: ['ironbark', 180], stack: 20, rarity: 1, desc: '+6 defense for 3 minutes.' });
add('swiftroot', 'Flower Tea', { t: 'flask', a: 0x7fd66b }, { buff: ['swift', 180], stack: 20, rarity: 1, desc: '+20% movement speed for 3 minutes.' });
add('recall_stone', 'Recall Stone', { t: 'rune', a: 0x6ab8f6, b: 0x8a8e96 }, { stack: 1, rarity: 2, use: 'recall', desc: 'Returns you to your bed. Reusable.' });
// ammo
add('arrow', 'Arrow', { t: 'arrow', a: 0xb8b8c0, b: 0x9a6a3a }, { ammoDmg: 2, tags: ['arrow'] });
add('barbed_arrow', 'Barbed Arrow', { t: 'arrow', a: 0xd4d6dc, b: 0x5a5a62 }, { ammoDmg: 5, rarity: 1, tags: ['arrow'] });
add('ember_arrow', 'Jalit Arrow', { t: 'arrow', a: 0xff7a2a, b: 0x5a3a2a }, { ammoDmg: 9, rarity: 2, tags: ['arrow'] });
add('void_arrow', 'Antar Arrow', { t: 'arrow', a: 0x9a5af0, b: 0x2a2040 }, { ammoDmg: 14, rarity: 3, tags: ['arrow'] });
add('prism_arrow', 'Patik Arrow', { t: 'arrow', a: 0xf6a0f0, b: 0xd0d0f0 }, { ammoDmg: 22, rarity: 4, tags: ['arrow'] });
// placers and summoning items
add('door', 'Door', { t: 'door', a: 0xa77a44 }, { stack: 16, use: 'door' });
add('hollow_gate_kit', 'Hollow Gate', { t: 'gate', a: 0x8a4af0, b: 0x1e1830 }, { stack: 1, rarity: 3, use: 'gate1', desc: 'Raises a gate to the hollow where you place it.' });
add('rift_gate_kit', 'Island Gate', { t: 'gate', a: 0xf6c64a, b: 0x6a6078 }, { stack: 1, rarity: 4, use: 'gate2', desc: 'Raises a gate to the islands where you place it.' });
const summon = (n: number, key: string, name: string, t: string, a: number, b: number, rarity: number, desc: string): void =>
  add(key, name, { t, a, b }, { stack: 20, rarity, use: 'summon' + n, desc });
summon(1, 'verdant_idol', 'Vanahar Likeness', 'idol', 0x6ae05a, 0x8a5f3c, 1, 'Lay it on a Vanahar Altar. Vanahar comes up to it.');
summon(2, 'sunken_lure', 'Maruhar Lure', 'lure', 0xf6b83a, 0xdcc88c, 2, 'Lay it on a Maruhar Altar. Maruhar comes up to it.');
summon(3, 'warden_bell', 'Kankāl Bell', 'bell', 0x6ab8f6, 0x5a6274, 2, 'Lay it on a Kankāl Altar. Kankāl comes up to it.');
summon(4, 'spore_censer', 'Guhamāt Smoker', 'censer', 0x4ae6b8, 0x3f4f5c, 3, 'Lay it on a Guhamāt Altar. Guhamāt comes to the smoke.');
summon(5, 'storm_kite', 'Jīmūt Kite', 'kite', 0x9ab6ff, 0x4a5a8a, 3, 'Fly it from a Jīmūt Altar. Jīmūt comes to it.');
summon(6, 'prism_lens', 'Ratan Lens', 'lens', 0xf4f0ff, 0xb9b0d6, 4, 'Lay it on a Ratan Altar. Ratan comes to it.');
summon(7, 'eclipse_mask', 'Kuranga Mask', 'mask', 0xd86af6, 0x1e1830, 4, 'Lay it on a Kuranga Altar at night. Kuranga comes up to it.');
summon(8, 'cairn_key', 'Cairn Key', 'key', 0xffd27a, 0x5a6274, 5, 'Lay it on the Cairn. Nihān comes up through the base to take it.');

// ---- accessories ----
const acc = (key: string, name: string, t: string, a: number, b: number, rarity: number, stats: Stats, desc: string): void =>
  add(key, name, { t, a, b }, { stack: 1, rarity, acc: true, stats, desc });
acc('strider_boots', 'Walking Boots', 'boots', 0xa8703c, 0xf0f0f6, 1, { speed: 0.12 }, '+12% movement speed.');
acc('spring_anklet', 'Anklet', 'ring', 0xf4cb3a, 0x7ad6a0, 1, { jump: 0.2 }, '+20% jump height.');
acc('cloud_bottle', 'Cloud Bottle', 'flask', 0xdfeeff, 0xffffff, 2, { extraJump: 1 }, 'Grants a second jump in mid-air.');
acc('feather_charm', 'Feather Charm', 'charm', 0xf0f0f6, 0xf4cb3a, 1, { noFall: 1 }, 'Negates fall damage.');
acc('bounding_boots', 'Spring Boots', 'boots', 0x7ad6a0, 0xf4cb3a, 2, { speed: 0.14, jump: 0.22 }, '+14% speed, +22% jump height.');
acc('gale_emblem', 'Cloud Emblem', 'charm', 0xdfeeff, 0x9ab6ff, 3, { extraJump: 1, noFall: 1 }, 'Second jump and no fall damage.');
acc('skyrunner_treads', 'Cloud Treads', 'boots', 0x9ab6ff, 0xffffff, 4, { speed: 0.18, jump: 0.25, extraJump: 1, noFall: 1 }, 'Speed, height, a second jump and a soft landing.');
acc('iron_bracer', 'Arm Guard', 'bracer', 0xd4d6dc, 0x8a5f34, 1, { def: 3 }, '+3 defense.');
acc('briar_bracer', 'Thorned Guard', 'bracer', 0x6a8a3a, 0xd4d6dc, 2, { def: 4, thorns: 0.4 }, '+4 defense. Attackers take 40% of the damage they deal.');
acc('warriors_band', 'Arm Ring', 'ring', 0xe5544b, 0xd4d6dc, 1, { melee: 0.08 }, '+8% melee damage.');
acc('marksman_lens', 'Eyeglass', 'lens', 0x7fd66b, 0xf4cb3a, 1, { ranged: 0.08, crit: 0.04 }, '+8% ranged damage, +4% critical chance.');
acc('sages_ring', 'Crystal Ring', 'ring', 0x5aa9ff, 0xf4cb3a, 1, { magic: 0.08, mana: 20 }, '+8% crystal-work damage, +20 mana.');
acc('binders_whistle', 'Whistle', 'whistle', 0x2f8a7a, 0xece6d2, 2, { minions: 1 }, '+1 minion.');
acc('duelists_sigil', 'Knuckle Band', 'sigil', 0xffa13c, 0xd4d6dc, 3, { dmg: 0.09, crit: 0.05 }, '+9% all damage, +5% critical chance.');
acc('heart_locket', 'Locket', 'amulet', 0xe5544b, 0xf4cb3a, 1, { hp: 20 }, '+20 maximum health.');
acc('mana_charm', 'Crystal Charm', 'amulet', 0x5aa9ff, 0xd4d6dc, 1, { mana: 40 }, '+40 maximum mana.');
acc('soul_reliquary', 'Crystal Pendant', 'amulet', 0xc07bff, 0xf4cb3a, 3, { hp: 30, mana: 50, regen: 0.5, manaRegen: 2 }, '+30 health, +50 mana and steady regeneration of both.');
acc('delvers_charm', 'Wrist Scale', 'charm', 0xf2c14e, 0x8b8f96, 1, { mining: 0.25 }, '+25% mining speed.');
acc('magnet_shell', 'Shell', 'shell', 0xb8623a, 0xd4d6dc, 1, { pickup: 4 }, 'Pulls dropped items from farther away.');
acc('tide_fins', 'Fins', 'boots', 0x3a84dc, 0x6ab8d8, 1, { swim: 0.6 }, 'Swim 60% faster.');
acc('lucky_coin', 'Worn Coin', 'coin', 0xf4cb3a, 0xb8862a, 2, { luck: 0.25 }, 'Creatures drop 25% more coins and loot.');
acc('shadow_cloak', 'Dark Cloak', 'cloak', 0x3a2a5a, 0x9a5af0, 3, { dodge: 0.1 }, '10% chance to slip a hit entirely.');
acc('reach_gauntlet', 'Long Glove', 'bracer', 0xf2c14e, 0x4a4e5a, 2, { reach: 1.5, atkSpeed: 0.06 }, '+1.5 block reach, +6% attack speed.');
// boss trinkets
acc('mossheart_sprig', 'Vanahar Sprig', 'root', 0x6ae05a, 0xe5544b, 2, { regen: 1, hp: 15 }, 'Health regenerates faster. +15 health.');
acc('maw_fang', 'Maruhar Tooth', 'fang', 0xf6b83a, 0xdcc88c, 3, { crit: 0.1 }, '+10% critical chance.');
acc('wardens_aegis', 'Kankāl Plate', 'shield', 0x6ab8f6, 0x5a6274, 3, { def: 8, knockRes: 0.6 }, '+8 defense and you barely budge when struck.');
acc('mycelial_crown', 'Guhamāt Cap', 'crown', 0x4ae6b8, 0x6a3f9a, 4, { minions: 1, summon: 0.12 }, '+1 minion, +12% totem damage.');
acc('tempest_feather', 'Jīmūt Feather', 'feather', 0x9ab6ff, 0xfff0a0, 4, { speed: 0.22, noFall: 1, atkSpeed: 0.08 }, '+22% speed, +8% attack speed, no fall damage.');
acc('prism_core', 'Ratan Crystal', 'gem', 0xf4f0ff, 0xf6a0f0, 5, { magic: 0.16, manaRegen: 4, mana: 40 }, '+16% crystal-work damage, +40 mana, faster mana regeneration.');
acc('eclipse_shard', 'Kuranga Tine', 'fang', 0xd86af6, 0x1e1830, 5, { dmg: 0.14, crit: 0.06 }, '+14% all damage, +6% critical chance.');
acc('sovereign_light', 'Cairn Gem', 'crown', 0xffd27a, 0xffffff, 6, { dmg: 0.12, def: 8, hp: 40, mana: 40, speed: 0.1, regen: 1 }, 'A piece of the housing with its gem in it. Everything, a little better.');

// ---- generated gear ----
const TOOL: [string, ToolKind, string, number][] = [['pickaxe', 'pick', 'Pick', 0.5], ['axe', 'axe', 'Axe', 0.75], ['shovel', 'shovel', 'Shovel', 0.4]];
TIERS.forEach((t, ti) => {
  const handle = ti < 5 ? 0x8a5f34 : ti < 8 ? 0x4a4e5a : 0xdfe6f2;
  for (const [suffix, kind, label, dm] of TOOL) {
    add(`${t.key}_${suffix}`, `${t.name} ${label}`, { t: suffix, a: t.color, b: handle, c: t.trim }, {
      stack: 1, rarity: t.rar, tier: ti, tool: { kind, speed: t.speed, power: t.power },
      weapon: { style: 'melee', dmg: Math.round(t.dmg * dm) + 1, rate: 1.8, knock: 3 },
    });
  }
  add(`${t.key}_sword`, t.names[0], { t: 'sword', a: t.color, b: handle, c: t.trim }, { stack: 1, rarity: t.rar, tier: ti, weapon: { style: 'melee', dmg: t.dmg, rate: 2.3, knock: 5 } });
  add(`${t.key}_bow`, t.names[1], { t: 'bow', a: t.color, b: handle, c: t.trim }, { stack: 1, rarity: t.rar, tier: ti, weapon: { style: 'ranged', dmg: Math.round(t.dmg * 0.85), rate: 1.5, knock: 3, proj: 'arrow', ammo: true, projSpeed: 34 + ti * 2 } });
  if (ti >= 2) {
    add(`${t.key}_staff`, t.names[2], { t: 'staff', a: t.color, b: handle, c: t.trim }, { stack: 1, rarity: t.rar, tier: ti, weapon: { style: 'magic', dmg: Math.round(t.dmg * 1.05), rate: 2.2, knock: 2, proj: 'bolt' + ti, mana: 5 + ti, projSpeed: 26 } });
    add(`${t.key}_totem`, t.names[3], { t: 'totem', a: t.color, b: handle, c: t.trim }, { stack: 1, rarity: t.rar, tier: ti, weapon: { style: 'summon', dmg: Math.round(t.dmg * 0.55), rate: 1, knock: 2, minion: t.minion, mana: 20 }, desc: 'Summons a minion that fights for you.' });
    for (const st of STYLES) {
      const info = STYLE_INFO[st];
      info.pieces.forEach((piece, slot) => {
        const def = Math.max(1, Math.round(t.def * [0.8, 1.3, 1][slot] * info.defMul));
        add(`${t.key}_${st}_${slot}`, `${t.name} ${piece}`, { t: info.icons[slot], a: t.color, b: info.accent, c: t.trim }, {
          stack: 1, rarity: t.rar, tier: ti, armor: { slot: slot as 0 | 1 | 2, set: `${t.key}_${st}` }, stats: { def, [st]: 0.02 + ti * 0.004 },
        });
      });
    }
  }
});
// final-boss weapons
add('cairn_edge', 'Cairn Sword', { t: 'sword', a: 0xffd27a, b: 0xffffff }, { stack: 1, rarity: 6, tier: 10, weapon: { style: 'melee', dmg: 92, rate: 2.6, knock: 6, reach: 4.2 } });
add('cairn_bow', 'Cairn Bow', { t: 'bow', a: 0xffd27a, b: 0xffffff }, { stack: 1, rarity: 6, tier: 10, weapon: { style: 'ranged', dmg: 78, rate: 2, knock: 4, proj: 'arrow', ammo: true, projSpeed: 60 } });
add('cairn_staff', 'Cairn Staff', { t: 'staff', a: 0xffd27a, b: 0xffffff }, { stack: 1, rarity: 6, tier: 10, weapon: { style: 'magic', dmg: 96, rate: 2.6, knock: 3, proj: 'bolt10', mana: 12, projSpeed: 34 } });
add('cairn_totem', 'Cairn Lamp', { t: 'totem', a: 0xffd27a, b: 0xffffff }, { stack: 1, rarity: 6, tier: 10, weapon: { style: 'summon', dmg: 52, rate: 1, knock: 3, minion: 'm_cairn', mana: 20 } });
// starter leather set (no playstyle)
['Cap', 'Vest', 'Trousers'].forEach((p, slot) => add(`hide_${slot}`, `Hide ${p}`, { t: ['helm', 'chest', 'legs'][slot], a: 0xa8703c, b: 0x6a4420 },
  { stack: 1, armor: { slot: slot as 0 | 1 | 2, set: 'hide' }, stats: { def: 1 } }));

// ---- block items ----
const FUEL: Record<string, number> = { oak_log: 15, pine_log: 15, pale_log: 15, kapok_log: 15, rose_log: 15, oak_planks: 12, pine_planks: 12, pale_planks: 12, kapok_planks: 12, rose_planks: 12, gloom_stem: 15, star_log: 15 };
const HIDDEN = new Set(['air', 'water7', 'water6', 'water5', 'water4', 'water3', 'water2', 'water1', 'furnace_lit', 'door_x', 'door_z', 'door_x_open', 'door_z_open', 'berry_bush_empty', 'hollow_portal', 'rift_portal']);
for (const b of BLOCKS) {
  if (HIDDEN.has(b.key)) continue;
  const tags: string[] = [];
  if (b.key.endsWith('_planks')) tags.push('planks');
  if (b.key.endsWith('_log') || b.key === 'gloom_stem') tags.push('log');
  L.push({ key: b.key, name: b.name, stack: 99, rarity: b.power >= 5 ? 2 : b.power >= 3 ? 1 : 0, icon: null, block: b.id, fuel: FUEL[b.key], tags, desc: b.desc || undefined });
}

export const ITEMS = new Map<string, ItemDef>(L.map((i) => [i.key, i]));
export const ITEM_LIST = L;
export const item = (key: string): ItemDef => {
  const d = ITEMS.get(key);
  if (!d) throw new Error('unknown item: ' + key);
  return d;
};
/** Items carrying a tag, e.g. every kind of planks. */
export const TAGGED = new Map<string, string[]>();
for (const i of L) for (const t of i.tags ?? []) { if (!TAGGED.has(t)) TAGGED.set(t, []); TAGGED.get(t)!.push(i.key); }
/** True if `key` satisfies ingredient `want` (an item key, or '#tag'). */
export const matches = (want: string, key: string): boolean => (want[0] === '#' ? !!ITEMS.get(key)?.tags?.includes(want.slice(1)) : want === key);

// ---- set bonuses ----
export function setBonus(set: string): { stats: Stats; text: string } | null {
  if (set === 'hide') return { stats: { def: 1, speed: 0.04 }, text: '+1 defense, +4% speed' };
  const [tk, st] = set.split('_');
  const ti = TIERS.findIndex((t) => t.key === tk);
  if (ti < 0) return null;
  const p = 0.06 + ti * 0.012, pct = Math.round(p * 100);
  switch (st as Style) {
    case 'melee': return { stats: { melee: p, def: 2 + ti }, text: `+${pct}% melee damage, +${2 + ti} defense` };
    case 'ranged': return { stats: { ranged: p, crit: 0.04 + ti * 0.005 }, text: `+${pct}% ranged damage, +${Math.round((0.04 + ti * 0.005) * 100)}% critical chance` };
    case 'magic': return { stats: { magic: p, mana: 20 + ti * 10, manaRegen: 1 + ti * 0.3 }, text: `+${pct}% crystal-work damage, +${20 + ti * 10} mana` };
    case 'summon': return { stats: { summon: p, minions: ti >= 6 ? 2 : 1 }, text: `+${pct}% totem damage, +${ti >= 6 ? 2 : 1} minion${ti >= 6 ? 's' : ''}` };
  }
  return null;
}

// ---- random modifiers ----
export interface Modifier { key: string; name: string; stats: Stats; weight: number; rar: number; on: 'weapon' | 'armor' | 'acc' | 'any' }
export const MODIFIERS: Modifier[] = [
  { key: 'keen', name: 'Keen', stats: { crit: 0.05 }, weight: 10, rar: 0, on: 'weapon' },
  { key: 'savage', name: 'Quenched', stats: { dmg: 0.12 }, weight: 7, rar: 1, on: 'weapon' },
  { key: 'swift', name: 'Lean', stats: { atkSpeed: 0.1 }, weight: 8, rar: 0, on: 'weapon' },
  { key: 'heavy', name: 'Heavy', stats: { dmg: 0.18, atkSpeed: -0.1 }, weight: 6, rar: 0, on: 'weapon' },
  { key: 'dull', name: 'Dull', stats: { dmg: -0.08 }, weight: 5, rar: -1, on: 'weapon' },
  { key: 'blessed', name: 'Favoured', stats: { dmg: 0.15, crit: 0.05, atkSpeed: 0.08 }, weight: 1.5, rar: 2, on: 'weapon' },
  { key: 'warding', name: 'Thick', stats: { def: 2 }, weight: 9, rar: 0, on: 'armor' },
  { key: 'stalwart', name: 'Dense', stats: { def: 4, speed: -0.03 }, weight: 5, rar: 1, on: 'armor' },
  { key: 'vital', name: 'Vital', stats: { hp: 15 }, weight: 8, rar: 0, on: 'any' },
  { key: 'arcane', name: 'True', stats: { mana: 20 }, weight: 7, rar: 0, on: 'any' },
  { key: 'fleet', name: 'Fleet', stats: { speed: 0.05 }, weight: 6, rar: 0, on: 'any' },
  { key: 'lucky', name: 'Lucky', stats: { luck: 0.1, crit: 0.02 }, weight: 4, rar: 1, on: 'acc' },
  { key: 'menacing', name: 'Flecked', stats: { dmg: 0.04 }, weight: 6, rar: 1, on: 'acc' },
  { key: 'brittle', name: 'Brittle', stats: { def: -1 }, weight: 4, rar: -1, on: 'armor' },
  { key: 'radiant', name: 'Glowing', stats: { dmg: 0.06, def: 2, hp: 10 }, weight: 1.2, rar: 2, on: 'any' },
];
export const MOD_BY_KEY = new Map(MODIFIERS.map((m) => [m.key, m]));

export interface Item { k: string; n: number; m?: string }
/** 'a' or 'an' for a name, counting the marked vowels Ā Ī Ū as vowels. */
export const article = (name: string): string => (/^[AEIOUĀĪŪ]/i.test(name) ? 'an' : 'a');
export const itemName = (it: Item): string => (it.m ? MOD_BY_KEY.get(it.m)!.name + ' ' : '') + item(it.k).name;
export const itemRarity = (it: Item): number => Math.max(0, Math.min(6, item(it.k).rarity + (it.m ? MOD_BY_KEY.get(it.m)!.rar : 0)));
/** Roll a modifier for an item that can carry one. `chance` is the odds of getting any at all. */
export function rollModifier(key: string, rnd: () => number, chance: number): string | undefined {
  const d = item(key), kind = d.weapon && !d.tool ? 'weapon' : d.armor ? 'armor' : d.acc ? 'acc' : null;
  if (!kind || rnd() > chance) return undefined;
  const pool = MODIFIERS.filter((m) => m.on === kind || m.on === 'any');
  let r = rnd() * pool.reduce((s, m) => s + m.weight, 0);
  for (const m of pool) { r -= m.weight; if (r <= 0) return m.key; }
  return undefined;
}
