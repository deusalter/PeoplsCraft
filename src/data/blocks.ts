// Block table. Everything the engine knows about a block comes from this file:
// the mesher, lighting, physics and item systems all read the derived typed arrays below.
// Adding a block = adding one line here plus a painter entry in render/textures.ts.

export type Tex = string | [top: string, bottom: string, side: string] | { top: string; bottom: string; side: string; front: string };
export type Drop = [item: string, chance: number, min: number, max: number];
export type ToolKind = 'pick' | 'axe' | 'shovel' | 'none';
export type SoundKind = 'stone' | 'wood' | 'dirt' | 'grass' | 'sand' | 'glass' | 'leaf' | 'metal' | 'crystal' | 'snow' | 'liquid' | 'cloth';

export interface BlockInit {
  key: string; name: string; tex?: Tex;
  shape?: 'none' | 'cube' | 'cross' | 'liquid' | 'box';
  mat?: 'opaque' | 'cutout' | 'translucent';
  solid?: boolean; opaque?: boolean; atten?: number;
  light?: [number, number, number]; emissive?: number;
  tint?: 0 | 1 | 2 | 3;          // 1 grass, 2 foliage, 3 water
  sway?: 0 | 1 | 2;              // 1 leaves, 2 plant
  hard?: number; tool?: ToolKind; power?: number;
  drops?: Drop[]; sound?: SoundKind;
  box?: number[];                // [x0,y0,z0,x1,y1,z1] in 1/16ths
  replaceable?: boolean; liquid?: 0 | 1 | 2; liqH?: number;
  use?: string; support?: boolean; selfCull?: 0 | 1 | 2; door?: boolean;
  damage?: number; desc?: string;
}
export interface BlockDef extends Required<Omit<BlockInit, 'tex' | 'drops' | 'light' | 'box' | 'use' | 'desc'>> {
  id: number; faces: string[]; drops: Drop[]; light: [number, number, number] | null;
  box: number[]; use: string | null; desc: string;
}

const warm: [number, number, number] = [15, 12, 8];
const leaf = (key: string, name: string, tint: 0 | 2, extra: Drop[] = []): BlockInit => ({
  key, name, tex: key, mat: 'cutout', opaque: false, atten: 1, selfCull: 2, sway: 1, tint, hard: 0.2, sound: 'leaf',
  drops: [['stick', 0.1, 1, 2], ...extra],
});
const plant = (key: string, name: string, o: Partial<BlockInit> = {}): BlockInit => ({
  key, name, tex: key, shape: 'cross', sway: 2, hard: 0, sound: 'grass', support: true, ...o,
});
const ore = (key: string, name: string, hard: number, power: number, o: Partial<BlockInit> = {}): BlockInit => ({
  key, name, tex: key, hard, tool: 'pick', power, sound: 'stone', ...o,
});
const rock = (key: string, name: string, hard: number, power = 1, o: Partial<BlockInit> = {}): BlockInit => ({
  key, name, tex: key, hard, tool: 'pick', power, sound: 'stone', ...o,
});
const wood = (key: string, name: string, tex: Tex, o: Partial<BlockInit> = {}): BlockInit => ({
  key, name, tex, hard: 2, tool: 'axe', sound: 'wood', ...o,
});
const flow = (n: number): BlockInit => ({
  key: 'water' + n, name: 'Water', tex: 'water', shape: 'liquid', mat: 'translucent', atten: 2, tint: 3, liquid: 1,
  liqH: Math.max(2, Math.round(n * 1.75)), hard: -1, drops: [], sound: 'liquid',
});
const altar = (n: number, name: string, light: [number, number, number]): BlockInit => ({
  key: 'altar' + n, name, tex: { top: 'altar' + n + '_top', bottom: 'wardstone', side: 'altar' + n, front: 'altar' + n },
  hard: -1, light, emissive: 150, use: 'altar' + n, sound: 'stone', drops: [],
});

const INIT: BlockInit[] = [
  { key: 'air', name: 'Air', shape: 'none', hard: -1, drops: [] },
  rock('bedrock', 'Bedrock', -1, 99, { drops: [] }),
  rock('stone', 'Stone', 1.5, 1, { drops: [['cobble', 1, 1, 1]] }),
  rock('cobble', 'Cobblestone', 2),
  rock('deepstone', 'Deepstone', 3),
  { key: 'dirt', name: 'Dirt', tex: 'dirt', hard: 0.5, tool: 'shovel', sound: 'dirt' },
  { key: 'grass', name: 'Grass Block', tex: ['grass_top', 'dirt', 'grass_side'], tint: 1, hard: 0.6, tool: 'shovel', sound: 'grass', drops: [['dirt', 1, 1, 1]] },
  { key: 'sand', name: 'Sand', tex: 'sand', hard: 0.5, tool: 'shovel', sound: 'sand' },
  rock('sandstone', 'Sandstone', 0.8, 1, { tex: ['sandstone_top', 'sandstone_top', 'sandstone'] }),
  { key: 'gravel', name: 'Gravel', tex: 'gravel', hard: 0.6, tool: 'shovel', sound: 'sand', drops: [['gravel', 0.88, 1, 1], ['flint', 0.12, 1, 1]] },
  { key: 'clay', name: 'Clay', tex: 'clay', hard: 0.6, tool: 'shovel', sound: 'dirt' },
  { key: 'snow', name: 'Snow', tex: 'snow', hard: 0.2, tool: 'shovel', sound: 'snow' },
  { key: 'ice', name: 'Ice', tex: 'ice', mat: 'translucent', opaque: false, atten: 1, selfCull: 1, hard: 0.5, tool: 'pick', sound: 'glass', drops: [] },
  { key: 'mud', name: 'Mud', tex: 'mud', hard: 0.5, tool: 'shovel', sound: 'dirt' },
  { key: 'snowy_grass', name: 'Snowy Grass', tex: ['snow', 'dirt', 'snowy_side'], hard: 0.6, tool: 'shovel', sound: 'snow', drops: [['dirt', 1, 1, 1]] },
  rock('scoria', 'Scoria', 2),
  rock('nightglass', 'Nightglass', 14, 4, { sound: 'glass', desc: 'Volcanic glass. Only a Lumenite pick bites into it.' }),
  { key: 'water', name: 'Water', tex: 'water', shape: 'liquid', mat: 'translucent', atten: 2, tint: 3, liquid: 1, liqH: 14, hard: -1, drops: [], sound: 'liquid' },
  flow(7), flow(6), flow(5), flow(4), flow(3), flow(2), flow(1),
  { key: 'lava', name: 'Lava', tex: 'lava', shape: 'liquid', mat: 'opaque', atten: 0, liquid: 2, liqH: 14, light: [15, 9, 3], emissive: 150, hard: -1, drops: [], sound: 'liquid', damage: 4 },

  wood('oak_log', 'Oak Log', ['oak_log_top', 'oak_log_top', 'oak_log']),
  leaf('oak_leaves', 'Oak Leaves', 2, [['apple', 0.04, 1, 1]]),
  wood('oak_planks', 'Oak Planks', 'oak_planks'),
  wood('pine_log', 'Pine Log', ['pine_log_top', 'pine_log_top', 'pine_log']),
  leaf('pine_leaves', 'Pine Needles', 0),
  wood('pine_planks', 'Pine Planks', 'pine_planks'),
  wood('pale_log', 'Palebark Log', ['pale_log_top', 'pale_log_top', 'pale_log']),
  leaf('pale_leaves', 'Palebark Leaves', 0),
  wood('pale_planks', 'Palebark Planks', 'pale_planks'),
  wood('kapok_log', 'Kapok Log', ['kapok_log_top', 'kapok_log_top', 'kapok_log']),
  leaf('kapok_leaves', 'Kapok Leaves', 2),
  wood('kapok_planks', 'Kapok Planks', 'kapok_planks'),
  wood('rose_log', 'Rosewood Log', ['rose_log_top', 'rose_log_top', 'rose_log']),
  leaf('rose_leaves', 'Rosewood Blossom', 0),
  wood('rose_planks', 'Rosewood Planks', 'rose_planks'),

  plant('tall_grass', 'Tall Grass', { tint: 1, replaceable: true, drops: [['fiber', 0.3, 1, 1]] }),
  plant('fern', 'Fern', { tint: 1, replaceable: true, drops: [['fiber', 0.3, 1, 1]] }),
  plant('flower_red', 'Emberpetal'),
  plant('flower_yellow', 'Sunpip'),
  plant('flower_blue', 'Skybell'),
  plant('flower_white', 'Moonlily'),
  plant('dead_bush', 'Dry Bramble', { sway: 0, replaceable: true, drops: [['stick', 1, 1, 2]] }),
  plant('reeds', 'Reeds', { drops: [['fiber', 1, 1, 2]] }),
  plant('mushroom_brown', 'Duskcap', { sway: 0 }),
  plant('mushroom_red', 'Dapplecap', { sway: 0 }),
  { key: 'cactus', name: 'Needlepod', tex: ['cactus_top', 'cactus_top', 'cactus'], hard: 0.4, sound: 'cloth', damage: 1 },
  plant('berry_bush', 'Berry Bush', { sway: 0, use: 'berries', hard: 0.2, drops: [['berries', 1, 1, 3]] }),
  plant('berry_bush_empty', 'Berry Bush', { sway: 0, hard: 0.2, drops: [] }),
  plant('glowshroom', 'Glowshroom', { sway: 0, light: [2, 12, 10], emissive: 220 }),

  ore('coal_ore', 'Coal Ore', 3, 1, { drops: [['coal', 1, 1, 2]] }),
  ore('iron_ore', 'Iron Ore', 3, 2),
  ore('gold_ore', 'Gold Ore', 3, 3),
  ore('mana_ore', 'Mana Geode', 3, 3, { drops: [['mana_crystal', 1, 1, 2]], light: [2, 5, 10], emissive: 140, sound: 'crystal' }),
  ore('lumenite_ore', 'Lumenite Ore', 4, 3, { drops: [['lumenite', 1, 1, 1]], light: [3, 8, 9], emissive: 160, sound: 'crystal' }),
  ore('cindrite_ore', 'Cindrite Ore', 5, 4, { light: [9, 4, 1], emissive: 170 }),
  ore('eclipsium_ore', 'Eclipsium Ore', 8, 9, { light: [7, 3, 10], emissive: 200 }),

  rock('stone_bricks', 'Stone Bricks', 2),
  rock('mossy_bricks', 'Mossy Bricks', 2),
  rock('sandstone_bricks', 'Sandstone Bricks', 1.2),
  rock('bricks', 'Clay Bricks', 2),
  { key: 'glass', name: 'Glass', tex: 'glass', mat: 'cutout', opaque: false, atten: 0, selfCull: 1, hard: 0.3, sound: 'glass', drops: [] },
  rock('wardstone', 'Wardstone', 6, 2, { desc: 'Dense masonry laid by whoever built the old wards.' }),

  { key: 'torch', name: 'Torch', tex: 'torch', shape: 'box', box: [7, 0, 7, 9, 10, 9], solid: false, light: warm, emissive: 255, hard: 0, sound: 'wood', support: true },
  { key: 'lantern', name: 'Lantern', tex: ['lantern_top', 'lantern_top', 'lantern'], shape: 'box', box: [5, 0, 5, 11, 9, 11], solid: false, light: [15, 13, 10], emissive: 230, hard: 0.3, sound: 'metal', support: true },
  wood('workbench', 'Workbench', { top: 'workbench_top', bottom: 'oak_planks', side: 'workbench_side', front: 'workbench_side' }, { hard: 2.5, use: 'workbench' }),
  rock('furnace', 'Stone Furnace', 3.5, 1, { tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'furnace_front' }, use: 'forge1' }),
  rock('furnace_lit', 'Stone Furnace', 3.5, 1, { tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'furnace_front_lit' }, use: 'forge1', light: [13, 9, 4], emissive: 180, drops: [['furnace', 1, 1, 1]] }),
  wood('chest', 'Chest', { top: 'chest_top', bottom: 'chest_top', side: 'chest_side', front: 'chest_front' }, { hard: 2.5, use: 'chest' }),
  rock('anvil', 'Anvil', 5, 1, { tex: ['anvil_top', 'anvil_top', 'anvil_side'], use: 'anvil', sound: 'metal' }),
  rock('emberforge', 'Emberforge', 5, 1, { tex: { top: 'emberforge_top', bottom: 'scoria', side: 'emberforge_side', front: 'emberforge_front' }, use: 'forge2', light: [12, 6, 2], emissive: 180 }),
  rock('voidkiln', 'Voidkiln', 5, 1, { tex: { top: 'voidkiln_top', bottom: 'gloomstone', side: 'voidkiln_side', front: 'voidkiln_front' }, use: 'forge3', light: [7, 4, 12], emissive: 180 }),
  rock('prism_crucible', 'Prism Crucible', 5, 1, { tex: { top: 'crucible_top', bottom: 'riftstone', side: 'crucible_side', front: 'crucible_front' }, use: 'forge4', light: [12, 12, 14], emissive: 180 }),
  rock('eclipse_forge', 'Eclipse Forge', 5, 1, { tex: { top: 'eclforge_top', bottom: 'nightglass', side: 'eclforge_side', front: 'eclforge_front' }, use: 'forge5', light: [12, 5, 13], emissive: 200 }),
  wood('tinker_bench', "Tinker's Bench", { top: 'tinker_top', bottom: 'oak_planks', side: 'tinker_side', front: 'tinker_side' }, { hard: 2.5, use: 'tinker' }),
  wood('runeloom', 'Runeloom', { top: 'runeloom_top', bottom: 'oak_planks', side: 'runeloom_side', front: 'runeloom_side' }, { hard: 2.5, use: 'runeloom', light: [4, 3, 8], emissive: 120 }),
  { key: 'bedroll', name: 'Bedroll', tex: ['bedroll_top', 'oak_planks', 'bedroll_side'], shape: 'box', box: [0, 0, 0, 16, 5, 16], hard: 0.3, sound: 'cloth', use: 'bed' },
  { key: 'guest_bed', name: 'Guest Bed', tex: ['guestbed_top', 'oak_planks', 'guestbed_side'], shape: 'box', box: [0, 0, 0, 16, 9, 16], hard: 0.3, sound: 'cloth', use: 'guestbed', desc: 'Place inside a closed, lit room with a door and someone may move in.' },
  { key: 'door_x', name: 'Door', tex: 'door', shape: 'box', box: [0, 0, 6, 16, 16, 10], door: true, hard: 1.5, tool: 'axe', sound: 'wood', use: 'door', drops: [['door', 1, 1, 1]] },
  { key: 'door_z', name: 'Door', tex: 'door', shape: 'box', box: [6, 0, 0, 10, 16, 16], door: true, hard: 1.5, tool: 'axe', sound: 'wood', use: 'door', drops: [['door', 1, 1, 1]] },
  { key: 'door_x_open', name: 'Door', tex: 'door', shape: 'box', box: [0, 0, 0, 4, 16, 16], door: true, hard: 1.5, tool: 'axe', sound: 'wood', use: 'door', drops: [['door', 1, 1, 1]] },
  { key: 'door_z_open', name: 'Door', tex: 'door', shape: 'box', box: [0, 0, 0, 16, 16, 4], door: true, hard: 1.5, tool: 'axe', sound: 'wood', use: 'door', drops: [['door', 1, 1, 1]] },

  { key: 'crystal_cyan', name: 'Azure Crystal', tex: 'crystal_cyan', light: [3, 13, 15], emissive: 80, hard: 1.5, tool: 'pick', power: 1, sound: 'crystal' },
  { key: 'crystal_violet', name: 'Violet Crystal', tex: 'crystal_violet', light: [12, 5, 15], emissive: 80, hard: 1.5, tool: 'pick', power: 1, sound: 'crystal' },
  { key: 'crystal_amber', name: 'Amber Crystal', tex: 'crystal_amber', light: [15, 11, 3], emissive: 80, hard: 1.5, tool: 'pick', power: 1, sound: 'crystal' },
  rock('iron_block', 'Iron Block', 5, 2, { sound: 'metal' }),
  rock('gold_block', 'Gold Block', 4, 3, { sound: 'metal' }),
  rock('lumenite_block', 'Lumenite Block', 5, 3, { sound: 'crystal', light: [5, 12, 13], emissive: 80 }),

  // Gloomroot Hollows
  rock('gloomstone', 'Gloomstone', 3.5, 4),
  { key: 'mycel', name: 'Mycel Turf', tex: ['mycel_top', 'gloomstone', 'mycel_side'], hard: 1, tool: 'shovel', sound: 'dirt', drops: [['gloomstone', 1, 1, 1]] },
  wood('gloom_stem', 'Gloomcap Stem', ['gloom_stem_top', 'gloom_stem_top', 'gloom_stem']),
  { key: 'gloomcap_teal', name: 'Teal Gloomcap', tex: 'gloomcap_teal', hard: 0.4, tool: 'axe', sound: 'cloth', light: [2, 9, 8], emissive: 70 },
  { key: 'gloomcap_violet', name: 'Violet Gloomcap', tex: 'gloomcap_violet', hard: 0.4, tool: 'axe', sound: 'cloth', light: [8, 3, 11], emissive: 70 },
  wood('gloom_planks', 'Gloomcap Planks', 'gloom_planks'),
  ore('umbrite_ore', 'Umbrite Ore', 6, 5, { light: [5, 2, 8], emissive: 150 }),
  ore('noctrium_ore', 'Noctrium Ore', 7, 6, { light: [1, 7, 6], emissive: 150 }),
  plant('lumen_frond', 'Lumen Frond', { light: [3, 11, 6], emissive: 220, replaceable: true }),
  { key: 'sporelamp', name: 'Sporelamp', tex: 'sporelamp', hard: 0.6, sound: 'cloth', light: [14, 11, 5], emissive: 110 },

  // The Skyrift
  rock('riftstone', 'Riftstone', 4, 6),
  { key: 'skyturf', name: 'Skyturf', tex: ['skyturf_top', 'skysoil', 'skyturf_side'], hard: 0.7, tool: 'shovel', sound: 'grass', drops: [['skysoil', 1, 1, 1]] },
  { key: 'skysoil', name: 'Skysoil', tex: 'skysoil', hard: 0.6, tool: 'shovel', sound: 'dirt' },
  wood('star_log', 'Starwood Log', ['star_log_top', 'star_log_top', 'star_log']),
  { ...leaf('star_leaves', 'Starwood Leaves', 0), light: [6, 7, 11], emissive: 90 },
  wood('star_planks', 'Starwood Planks', 'star_planks'),
  ore('aetherium_ore', 'Aetherium Ore', 8, 7, { light: [4, 9, 13], emissive: 160 }),
  ore('prismite_ore', 'Prismite Ore', 9, 8, { light: [11, 9, 13], emissive: 180, sound: 'crystal' }),
  { key: 'cloud', name: 'Cloudstuff', tex: 'cloud', hard: 0.3, sound: 'snow' },
  { key: 'prism_crystal', name: 'Prism Crystal', tex: 'prism_crystal', light: [13, 13, 15], emissive: 80, hard: 2, tool: 'pick', power: 1, sound: 'crystal' },

  // Gates
  rock('hollow_frame', 'Hollow Gate Frame', 10, 4, { light: [4, 2, 7], emissive: 110, drops: [] }),
  { key: 'hollow_portal', name: 'Hollow Gate', tex: 'hollow_portal', mat: 'translucent', solid: false, opaque: false, atten: 0, selfCull: 1, light: [8, 4, 14], emissive: 80, hard: -1, drops: [], sound: 'glass' },
  rock('rift_frame', 'Rift Gate Frame', 10, 4, { light: [8, 7, 3], emissive: 110, drops: [] }),
  { key: 'rift_portal', name: 'Rift Gate', tex: 'rift_portal', mat: 'translucent', solid: false, opaque: false, atten: 0, selfCull: 1, light: [14, 12, 6], emissive: 80, hard: -1, drops: [], sound: 'glass' },

  // Boss altars (one per arena type)
  altar(1, 'Rootbound Altar', [4, 11, 3]),
  altar(2, 'Sunken Altar', [14, 10, 3]),
  altar(3, 'Warden Altar', [5, 9, 13]),
  altar(4, 'Mycelial Altar', [3, 12, 9]),
  altar(5, 'Tempest Altar', [8, 10, 15]),
  altar(6, 'Prism Altar', [14, 13, 15]),
  altar(7, 'Eclipse Altar', [12, 4, 13]),
  altar(8, 'First Cairn', [15, 12, 7]),

  // Structure dressing
  rock('moss_stone', 'Mossy Cobble', 2),
  rock('bone_block', 'Palebone', 2),
  rock('gilded_bricks', 'Gilded Bricks', 2.5),
  { key: 'thatch', name: 'Thatch', tex: 'thatch', hard: 0.5, sound: 'grass' },
  { key: 'path', name: 'Packed Path', tex: ['path_top', 'dirt', 'dirt'], hard: 0.6, tool: 'shovel', sound: 'dirt', drops: [['dirt', 1, 1, 1]] },
  rock('brood_nest', 'Brood Nest', 5, 2, { use: 'nest', light: [7, 2, 2], emissive: 120, drops: [], mat: 'cutout', opaque: false, atten: 1 }),
  wood('crate', 'Supply Crate', 'crate', { hard: 1, use: 'crate', drops: [] }),
  rock('storm_block', 'Stormglass', 3, 2, { light: [6, 8, 13], emissive: 140, sound: 'glass' }),
];

function faces(t: Tex | undefined, key: string): string[] {
  if (t === undefined) return [key, key, key, key, key, key];
  if (typeof t === 'string') return [t, t, t, t, t, t];
  if (Array.isArray(t)) return [t[2], t[2], t[0], t[1], t[2], t[2]];
  return [t.side, t.side, t.top, t.bottom, t.front, t.front];
}

export const BLOCKS: BlockDef[] = INIT.map((b, id) => {
  const shape = b.shape ?? 'cube';
  const cube = shape === 'cube';
  const mat = b.mat ?? (cube ? 'opaque' : 'cutout');
  const opaque = b.opaque ?? (cube && mat === 'opaque');
  return {
    id, key: b.key, name: b.name, shape, mat,
    faces: shape === 'none' ? [] : faces(b.tex, b.key),
    solid: b.solid ?? (cube || shape === 'box'),
    opaque, atten: b.atten ?? (opaque ? 15 : 0),
    light: b.light ?? null, emissive: b.emissive ?? 0, tint: b.tint ?? 0, sway: b.sway ?? 0,
    hard: b.hard ?? 1, tool: b.tool ?? 'none', power: b.power ?? 0,
    drops: b.drops ?? [[b.key, 1, 1, 1]], sound: b.sound ?? 'stone',
    box: b.box ?? (shape === 'cross' ? [3, 0, 3, 13, 13, 13] : [0, 0, 0, 16, 16, 16]),
    replaceable: b.replaceable ?? (shape === 'none' || shape === 'liquid'),
    liquid: b.liquid ?? 0, liqH: b.liqH ?? 16, use: b.use ?? null, support: b.support ?? false,
    selfCull: b.selfCull ?? 0, door: b.door ?? false, damage: b.damage ?? 0, desc: b.desc ?? '',
  };
});
if (BLOCKS.length > 255) throw new Error('block table exceeds Uint8 range');

export const BLOCK_BY_KEY = new Map<string, BlockDef>(BLOCKS.map((b) => [b.key, b]));
/** Block ids by key. Unknown keys throw so a typo fails loudly instead of placing air. */
export const B: Record<string, number> = new Proxy({} as Record<string, number>, {
  get(_t, k: string) {
    const d = BLOCK_BY_KEY.get(k);
    if (!d) throw new Error('unknown block: ' + k);
    return d.id;
  },
});

// ---- Texture layers -------------------------------------------------------
export const EXTRA_TEXTURES = ['crack0', 'crack1', 'crack2', 'crack3', 'crack4', 'crack5', 'crack6', 'crack7', 'door_lower'];
export const TEXTURE_NAMES: string[] = [];
const texIndex = new Map<string, number>();
function layer(name: string): number {
  let i = texIndex.get(name);
  if (i === undefined) { i = TEXTURE_NAMES.length; TEXTURE_NAMES.push(name); texIndex.set(name, i); }
  return i;
}
for (const b of BLOCKS) for (const f of b.faces) layer(f);
for (const n of EXTRA_TEXTURES) layer(n);
export const texLayer = (name: string): number => texIndex.get(name) ?? 0;

// ---- Flat lookup tables (indexed by block id) ------------------------------
export const SHAPE_NONE = 0, SHAPE_CUBE = 1, SHAPE_CROSS = 2, SHAPE_LIQUID = 3, SHAPE_BOX = 4;
const N = 256;
export const T_SHAPE = new Uint8Array(N), T_MAT = new Uint8Array(N), T_OPAQUE = new Uint8Array(N), T_SOLID = new Uint8Array(N);
export const T_ATTEN = new Uint8Array(N), T_EMIT_R = new Uint8Array(N), T_EMIT_G = new Uint8Array(N), T_EMIT_B = new Uint8Array(N);
export const T_EMITS = new Uint8Array(N), T_EMISSIVE = new Uint8Array(N), T_TINT = new Uint8Array(N), T_SWAY = new Uint8Array(N);
export const T_LIQUID = new Uint8Array(N), T_LIQH = new Uint8Array(N), T_SELFCULL = new Uint8Array(N), T_REPLACE = new Uint8Array(N);
export const T_DOOR = new Uint8Array(N), T_SUPPORT = new Uint8Array(N), T_DAMAGE = new Uint8Array(N);
export const T_LAYER = new Uint16Array(N * 6), T_BOX = new Uint8Array(N * 6);
const SH = { none: 0, cube: 1, cross: 2, liquid: 3, box: 4 }, MT = { opaque: 0, cutout: 1, translucent: 2 };
for (const b of BLOCKS) {
  const i = b.id;
  T_SHAPE[i] = SH[b.shape]; T_MAT[i] = MT[b.mat]; T_OPAQUE[i] = b.opaque ? 1 : 0; T_SOLID[i] = b.solid ? 1 : 0;
  T_ATTEN[i] = b.atten;
  if (b.light) { T_EMIT_R[i] = b.light[0]; T_EMIT_G[i] = b.light[1]; T_EMIT_B[i] = b.light[2]; T_EMITS[i] = 1; }
  T_EMISSIVE[i] = b.emissive; T_TINT[i] = b.tint; T_SWAY[i] = b.sway; T_LIQUID[i] = b.liquid; T_LIQH[i] = b.liqH;
  T_SELFCULL[i] = b.selfCull; T_REPLACE[i] = b.replaceable ? 1 : 0; T_DOOR[i] = b.door ? 1 : 0;
  T_SUPPORT[i] = b.support ? 1 : 0; T_DAMAGE[i] = b.damage;
  for (let f = 0; f < 6; f++) { T_LAYER[i * 6 + f] = b.faces.length ? texLayer(b.faces[f]) : 0; T_BOX[i * 6 + f] = b.box[f]; }
}
// Natural ground whose tile is mirrored at random per block, so plains and cliffs do not show a one-block grid.
// Only list tiles without lettering or diagonal features: a mirrored tile must still read as the same material.
export const T_VARY = new Uint8Array(N);
for (const k of ['stone', 'deepstone', 'bedrock', 'dirt', 'grass', 'sand', 'gravel', 'clay', 'snow', 'mud', 'snowy_grass', 'scoria', 'gloomstone', 'mycel', 'riftstone', 'skysoil']) {
  const d = BLOCK_BY_KEY.get(k);
  if (d) T_VARY[d.id] = 1;
}
export const MAT_OPAQUE = 0, MAT_CUTOUT = 1, MAT_TRANSLUCENT = 2;
