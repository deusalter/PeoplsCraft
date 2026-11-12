// Biome table. Colours are sRGB tints multiplied onto grey-scale grass / foliage / water textures.
export interface BiomeDef {
  id: number; key: string; name: string;
  grass: number; foliage: number; water: number;
  fog: [number, number, number];   // multiplier on the horizon colour
  haze: number;                    // extra fog density (0 = clear)
}
const b = (key: string, name: string, grass: number, foliage: number, water: number, fog: [number, number, number] = [1, 1, 1], haze = 0) =>
  ({ key, name, grass, foliage, water, fog, haze });

const LIST = [
  b('ocean', 'Samudda', 0x74c264, 0x5fae4a, 0x2f6fd8),
  b('beach', 'Vela', 0x9dcf6c, 0x7cba52, 0x38a0dc),
  b('plains', 'Yavas', 0x86c653, 0x6fb445, 0x3a84dc),
  b('forest', 'Vana', 0x62b040, 0x4f9e33, 0x377bd0),
  b('palewood', 'Davalavan', 0x8fcb6e, 0x9fd070, 0x4490dc),
  b('bloomvale', 'Kusum', 0x7fd596, 0x86cf8a, 0x5fb4ea, [1.04, 0.98, 1.04]),
  b('taiga', 'Tusāravan', 0x659f72, 0x4c8a62, 0x3572c4, [0.96, 1.0, 1.04]),
  b('tundra', 'Hima', 0x93b9a0, 0x7aa68c, 0x3068b8, [0.95, 1.0, 1.08], 0.25),
  b('desert', 'Marudesha', 0xc8b869, 0xa7a851, 0x3fb2d8, [1.1, 1.0, 0.86], 0.15),
  b('savanna', 'Kāsa', 0xbdb24d, 0x9aa23c, 0x3f9ad2, [1.06, 1.0, 0.9]),
  b('jungle', 'Aranna', 0x4cae3e, 0x38983a, 0x2fb9c4, [0.9, 1.03, 0.92], 0.3),
  b('swamp', 'Panka', 0x6c8f49, 0x5d7f3c, 0x4f7a56, [0.82, 0.95, 0.8], 0.6),
  b('crags', 'Pabbat', 0x7dab66, 0x5f9552, 0x3878cc),
  b('peaks', 'Sānu', 0x93b9a0, 0x6f9c80, 0x3068b8, [0.96, 1.0, 1.06], 0.1),
  b('hollows', 'Fungus Caverns', 0x3f8f86, 0x3a8f7a, 0x2fa08a, [1, 1, 1]),
  b('hollows_crystal', 'Crystal Caverns', 0x5f6fb0, 0x5a6ab0, 0x5a5ad0, [1, 1, 1]),
  b('rift', 'Island Meadow', 0x8fd8c8, 0x9fd8e0, 0x6fc0f0, [1, 1, 1]),
  b('rift_shards', 'Crystal Islands', 0xb0c8f0, 0xc0c8f8, 0x8fb0f8, [1, 1, 1]),
];
export const BIOMES: BiomeDef[] = LIST.map((x, id) => ({ id, ...x }));
export const BIOME: Record<string, number> = Object.fromEntries(BIOMES.map((x) => [x.key, x.id]));

// Flat RGB tables for the mesher (index = biome * 3).
export const GRASS_RGB = new Uint8Array(BIOMES.length * 3);
export const FOLIAGE_RGB = new Uint8Array(BIOMES.length * 3);
export const WATER_RGB = new Uint8Array(BIOMES.length * 3);
for (const x of BIOMES) {
  const put = (a: Uint8Array, c: number) => { a[x.id * 3] = c >> 16; a[x.id * 3 + 1] = (c >> 8) & 255; a[x.id * 3 + 2] = c & 255; };
  put(GRASS_RGB, x.grass); put(FOLIAGE_RGB, x.foliage); put(WATER_RGB, x.water);
}
