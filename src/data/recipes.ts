// Crafting and smelting tables. Shaped recipes use MC-style patterns; shapeless ones list ingredients.
// Tier gear recipes are generated from the same TIERS table that generates the items.
import { STYLES, TIERS } from './items';

export interface Recipe { out: string; n: number; station: string; shape?: string[]; key?: Record<string, string>; in?: [string, number][] }
export interface Smelt { in: string; out: string; n: number; time: number; forge: number }

const R: Recipe[] = [];
const shaped = (out: string, n: number, station: string, shape: string[], key: Record<string, string>): void => { R.push({ out, n, station, shape, key }); };
const loose = (out: string, n: number, station: string, ...ing: [string, number][]): void => { R.push({ out, n, station, in: ing }); };

// ---- basics (2x2, craftable anywhere) ----
for (const w of ['oak', 'pine', 'pale', 'kapok', 'rose', 'star']) loose(`${w}_planks`, 4, 'hand', [`${w}_log`, 1]);
loose('gloom_planks', 4, 'hand', ['gloom_stem', 1]);
shaped('stick', 4, 'hand', ['P', 'P'], { P: '#planks' });
shaped('workbench', 1, 'hand', ['PP', 'PP'], { P: '#planks' });
shaped('torch', 4, 'hand', ['C', 'S'], { C: 'coal', S: 'stick' });
loose('stew', 1, 'hand', ['mushroom_brown', 1], ['mushroom_red', 1]);
loose('salve', 2, 'hand', ['berries', 1], ['mushroom_red', 1], ['fiber', 1]);
shaped('thatch', 4, 'hand', ['FF', 'FF'], { F: 'fiber' });
loose('iron_bar', 9, 'hand', ['iron_block', 1]);
loose('gold_bar', 9, 'hand', ['gold_block', 1]);
loose('lumenite', 9, 'hand', ['lumenite_block', 1]);

// ---- workbench ----
shaped('furnace', 1, 'workbench', ['CCC', 'C C', 'CCC'], { C: 'cobble' });
shaped('chest', 1, 'workbench', ['PPP', 'P P', 'PPP'], { P: '#planks' });
shaped('door', 1, 'workbench', ['PP', 'PP', 'PP'], { P: '#planks' });
shaped('bedroll', 1, 'workbench', ['FFF', 'PPP'], { F: 'fiber', P: '#planks' });
shaped('guest_bed', 1, 'workbench', ['HHH', 'PPP'], { H: 'hide', P: '#planks' });
shaped('anvil', 1, 'workbench', ['III', ' I ', 'III'], { I: 'iron_bar' });
shaped('arrow', 8, 'workbench', ['F', 'S', 'E'], { F: 'flint', S: 'stick', E: 'feather' });
shaped('stone_bricks', 4, 'workbench', ['SS', 'SS'], { S: 'stone' });
shaped('sandstone_bricks', 4, 'workbench', ['SS', 'SS'], { S: 'sandstone' });
shaped('mossy_bricks', 1, 'workbench', ['B', 'F'], { B: 'stone_bricks', F: 'fiber' });
shaped('lantern', 2, 'workbench', ['I', 'T'], { I: 'iron_bar', T: 'torch' });
shaped('hide_0', 1, 'workbench', ['HHH', 'H H'], { H: 'hide' });
shaped('hide_1', 1, 'workbench', ['H H', 'HHH', 'HHH'], { H: 'hide' });
shaped('hide_2', 1, 'workbench', ['HHH', 'H H', 'H H'], { H: 'hide' });
shaped('iron_block', 1, 'workbench', ['III', 'III', 'III'], { I: 'iron_bar' });
shaped('gold_block', 1, 'workbench', ['III', 'III', 'III'], { I: 'gold_bar' });
shaped('lumenite_block', 1, 'workbench', ['III', 'III', 'III'], { I: 'lumenite' });
shaped('runeloom', 1, 'workbench', ['FMF', 'PMP', 'PPP'], { F: 'fiber', M: 'mana_crystal', P: '#planks' });
shaped('tinker_bench', 1, 'workbench', ['IHI', 'PPP', 'P P'], { I: 'iron_bar', H: 'heartroot', P: '#planks' });
shaped('emberforge', 1, 'workbench', ['DDD', 'DCD', 'DDD'], { D: 'deepstone', C: 'scorched_core' });
shaped('voidkiln', 1, 'workbench', ['GGG', 'GQG', 'GGG'], { G: 'gloomstone', Q: 'queen_spore' });
shaped('prism_crucible', 1, 'workbench', ['RRR', 'RPR', 'RRR'], { R: 'riftstone', P: 'prism_heart' });
shaped('eclipse_forge', 1, 'workbench', ['NNN', 'NEN', 'NNN'], { N: 'nightglass', E: 'eclipse_ember' });
loose('weave', 2, 'workbench', ['fiber', 2], ['mana_crystal', 1]);
loose('effigy', 2, 'workbench', ['bone', 2], ['shade_essence', 1]);
loose('tonic', 2, 'workbench', ['mana_crystal', 1], ['berries', 1]);
loose('ironbark', 2, 'workbench', ['#log', 1], ['mushroom_brown', 1], ['flint', 1]);
loose('swiftroot', 2, 'workbench', ['fiber', 1], ['flower_yellow', 1], ['berries', 1]);
loose('greater_salve', 2, 'workbench', ['salve', 1], ['spore_sac', 1], ['glowshroom', 1]);
loose('greater_tonic', 2, 'workbench', ['tonic', 1], ['moth_dust', 1]);
loose('glow_broth', 1, 'workbench', ['glowshroom', 2], ['lumen_frond', 1]);
loose('strider_boots', 1, 'workbench', ['hide', 3], ['feather', 2]);
loose('feather_charm', 1, 'workbench', ['feather', 4], ['gold_bar', 1]);
loose('tide_fins', 1, 'workbench', ['hide', 2], ['bog_pearl', 1], ['fiber', 2]);
loose('verdant_idol', 1, 'workbench', ['#log', 1], ['fiber', 2], ['gel', 2], ['flower_red', 1]);
loose('sunken_lure', 1, 'workbench', ['sandstone', 2], ['gold_bar', 1], ['raw_meat', 1], ['ember_dust', 1]);
loose('storm_kite', 1, 'workbench', ['weave', 2], ['feather', 3], ['noctrium_bar', 1], ['moth_dust', 1]);

// ---- anvil ----
shaped('barbed_arrow', 12, 'anvil', ['I', 'S', 'E'], { I: 'iron_bar', S: 'stick', E: 'feather' });
shaped('ember_arrow', 16, 'anvil', ['I', 'S', 'E'], { I: 'cinder_bar', S: 'stick', E: 'feather' });
shaped('void_arrow', 16, 'anvil', ['I', 'S', 'E'], { I: 'umbrite_bar', S: 'stick', E: 'moth_dust' });
shaped('prism_arrow', 20, 'anvil', ['I', 'S', 'E'], { I: 'prism_bar', S: 'stick', E: 'feather' });
shaped('hollow_gate_kit', 1, 'anvil', ['NNN', 'NWN', 'N N'], { N: 'nightglass', W: 'warden_sigil' });
shaped('rift_gate_kit', 1, 'anvil', ['UPU', 'U U', 'U U'], { U: 'noctrium_bar', P: 'storm_plume' });
loose('spring_anklet', 1, 'anvil', ['gold_bar', 2], ['gel', 3]);
loose('iron_bracer', 1, 'anvil', ['iron_bar', 3], ['hide', 1]);
loose('warriors_band', 1, 'anvil', ['gold_bar', 1], ['iron_bar', 2], ['thorn', 2]);
loose('marksman_lens', 1, 'anvil', ['gold_bar', 1], ['glass', 1], ['feather', 2]);
loose('heart_locket', 1, 'anvil', ['gold_bar', 2], ['salve', 2]);
loose('delvers_charm', 1, 'anvil', ['gold_bar', 1], ['coal', 3], ['chitin', 2]);
loose('magnet_shell', 1, 'anvil', ['iron_bar', 3], ['rust_core', 1]);
loose('lucky_coin', 1, 'anvil', ['gold_bar', 4], ['bog_pearl', 1]);
loose('reach_gauntlet', 1, 'anvil', ['cinder_bar', 4], ['hide', 2]);
loose('warden_bell', 1, 'anvil', ['iron_bar', 2], ['lumenite', 1], ['shade_essence', 2], ['bone', 2]);
loose('spore_censer', 1, 'anvil', ['umbrite_bar', 2], ['spore_sac', 3], ['glowshroom', 1]);
loose('prism_lens', 1, 'anvil', ['aether_bar', 2], ['shard', 3], ['glass', 1]);
loose('cairn_key', 1, 'anvil', ['eclipse_bar', 3], ['lumenite_block', 1], ['moon_sliver', 2], ['shard', 2]);

// ---- runeloom ----
loose('cloud_bottle', 1, 'runeloom', ['glass', 1], ['feather', 3], ['mana_crystal', 2]);
loose('sages_ring', 1, 'runeloom', ['gold_bar', 1], ['mana_crystal', 3]);
loose('binders_whistle', 1, 'runeloom', ['bone', 3], ['shade_essence', 2]);
loose('mana_charm', 1, 'runeloom', ['iron_bar', 1], ['mana_crystal', 4]);
loose('shadow_cloak', 1, 'runeloom', ['weave', 3], ['shade_essence', 4]);
loose('recall_stone', 1, 'runeloom', ['mana_crystal', 2], ['lumenite', 1], ['stone', 1]);
loose('eclipse_mask', 1, 'runeloom', ['prism_bar', 2], ['moon_sliver', 3], ['shade_essence', 2]);

// ---- tinker's bench: fuse trinkets ----
loose('bounding_boots', 1, 'tinker', ['strider_boots', 1], ['spring_anklet', 1]);
loose('gale_emblem', 1, 'tinker', ['cloud_bottle', 1], ['feather_charm', 1]);
loose('skyrunner_treads', 1, 'tinker', ['bounding_boots', 1], ['gale_emblem', 1]);
loose('briar_bracer', 1, 'tinker', ['iron_bracer', 1], ['thorn', 3]);
loose('duelists_sigil', 1, 'tinker', ['warriors_band', 1], ['marksman_lens', 1]);
loose('soul_reliquary', 1, 'tinker', ['heart_locket', 1], ['mana_charm', 1]);

// ---- tier gear ----
const HELM = ['MMM', 'M M'], CHEST = ['M M', 'MMM', 'MMM'], LEGS = ['MMM', 'M M', 'M M'];
const HELM_X = ['XMX', 'M M'], CHEST_X = ['X X', 'MMM', 'MXM'], LEGS_X = ['MXM', 'M M', 'X X'];
const STYLE_X: Record<string, string> = { ranged: 'hide', magic: 'weave', summon: 'bone' };
TIERS.forEach((t, ti) => {
  const st = t.station, M = t.mat;
  shaped(`${t.key}_pickaxe`, 1, st, ['MMM', ' S ', ' S '], { M, S: 'stick' });
  shaped(`${t.key}_axe`, 1, st, ['MM', 'MS', ' S'], { M, S: 'stick' });
  shaped(`${t.key}_shovel`, 1, st, ['M', 'S', 'S'], { M, S: 'stick' });
  shaped(`${t.key}_sword`, 1, st, ['M', 'M', 'S'], { M, S: 'stick' });
  shaped(`${t.key}_bow`, 1, st, [' MF', 'S F', ' MF'], { M, S: 'stick', F: 'fiber' });
  if (ti < 2) return;
  shaped(`${t.key}_staff`, 1, 'runeloom', [' MC', ' SM', 'S  '], { M, S: 'stick', C: 'mana_crystal' });
  shaped(`${t.key}_totem`, 1, 'runeloom', ['EME', ' S ', ' S '], { M, S: 'stick', E: 'effigy' });
  for (const s of STYLES) {
    const station = s === 'melee' || s === 'ranged' ? 'anvil' : 'runeloom';
    if (s === 'melee') {
      shaped(`${t.key}_${s}_0`, 1, station, HELM, { M }); shaped(`${t.key}_${s}_1`, 1, station, CHEST, { M }); shaped(`${t.key}_${s}_2`, 1, station, LEGS, { M });
    } else {
      const X = STYLE_X[s];
      shaped(`${t.key}_${s}_0`, 1, station, HELM_X, { M, X }); shaped(`${t.key}_${s}_1`, 1, station, CHEST_X, { M, X }); shaped(`${t.key}_${s}_2`, 1, station, LEGS_X, { M, X });
    }
  }
});

export const RECIPES = R;

export const SMELTS: Smelt[] = [
  { in: 'iron_ore', out: 'iron_bar', n: 1, time: 8, forge: 1 }, { in: 'gold_ore', out: 'gold_bar', n: 1, time: 8, forge: 1 },
  { in: 'sand', out: 'glass', n: 1, time: 5, forge: 1 }, { in: 'cobble', out: 'stone', n: 1, time: 5, forge: 1 }, { in: 'clay', out: 'bricks', n: 1, time: 6, forge: 1 },
  { in: 'raw_meat', out: 'cooked_meat', n: 1, time: 5, forge: 1 }, { in: 'raw_fish', out: 'cooked_fish', n: 1, time: 4, forge: 1 },
  { in: '#log', out: 'coal', n: 1, time: 6, forge: 1 },
  { in: 'cindrite_ore', out: 'cinder_bar', n: 1, time: 10, forge: 2 }, { in: 'umbrite_ore', out: 'umbrite_bar', n: 1, time: 10, forge: 2 },
  { in: 'noctrium_ore', out: 'noctrium_bar', n: 1, time: 12, forge: 3 }, { in: 'aetherium_ore', out: 'aether_bar', n: 1, time: 12, forge: 3 },
  { in: 'prismite_ore', out: 'prism_bar', n: 1, time: 14, forge: 4 }, { in: 'eclipsium_ore', out: 'eclipse_bar', n: 1, time: 16, forge: 5 },
];
export const STATION_NAMES: Record<string, string> = { hand: 'Hand', workbench: 'Workbench', anvil: 'Anvil', runeloom: 'Runeloom', tinker: "Tinker's Bench" };
