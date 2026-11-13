// Sample world for the map: the countries of the living ground drawn from a seed, where the crew has walked, its known
// places, and the rooms of the sealed store one of the crew is inside. Coordinates are strides, x east and z south.
import type { MapKind } from '../art/chart';
import { CREW } from './crew';

export interface Country { key: string; name: string; kind: MapKind }

/** Each kind of country (names.json biomes) and the kind of ground the chart draws it as. */
export const COUNTRIES: Record<string, Country> = {
  ocean: { key: 'ocean', name: 'Samudda', kind: 'water' },
  beach: { key: 'beach', name: 'Vela', kind: 'sand' },
  plains: { key: 'plains', name: 'Yavas', kind: 'grass' },
  palewood: { key: 'palewood', name: 'Davalavan', kind: 'grass' },
  forest: { key: 'forest', name: 'Vana', kind: 'forest' },
  bloomvale: { key: 'bloomvale', name: 'Kusum', kind: 'grass' },
  swamp: { key: 'swamp', name: 'Panka', kind: 'forest' },
  taiga: { key: 'taiga', name: 'Tusāravan', kind: 'forest' },
  tundra: { key: 'tundra', name: 'Hima', kind: 'snow' },
  desert: { key: 'desert', name: 'Marudesha', kind: 'sand' },
  savanna: { key: 'savanna', name: 'Kāsa', kind: 'sand' },
  jungle: { key: 'jungle', name: 'Aranna', kind: 'forest' },
  crags: { key: 'crags', name: 'Pabbat', kind: 'stone' },
  peaks: { key: 'peaks', name: 'Sānu', kind: 'snow' },
};

function hash(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise, 0 to 1, with cells of `cell` strides. */
function noise(x: number, z: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
  const fx = x / cell - gx, fz = z / cell - gz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash(gx, gz, seed), b = hash(gx + 1, gz, seed), c = hash(gx, gz + 1, seed), d = hash(gx + 1, gz + 1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

// Chosen so that the crew stands in the countries its roster names.
const SEED = 223;

/** The kind of country at a place, by height, wet and warmth. */
export function countryAt(x: number, z: number): Country {
  const e = noise(x, z, 260, SEED) * 0.7 + noise(x, z, 90, SEED + 1) * 0.3;
  const m = noise(x, z, 220, SEED + 2);
  const t = noise(x, z, 600, SEED + 3) * 0.8 + noise(x, z, 150, SEED + 4) * 0.2;
  const C = COUNTRIES;
  if (e < 0.3) return C.ocean;
  if (e < 0.33) return C.beach;
  if (e > 0.74) return C.peaks;
  if (e > 0.67) return C.crags;
  if (t < 0.3) return m > 0.5 ? C.taiga : C.tundra;
  if (t > 0.68) return m < 0.4 ? C.desert : m < 0.56 ? C.savanna : C.jungle;
  if (m > 0.7) return C.swamp;
  if (m > 0.55) return C.forest;
  if (m > 0.47) return C.palewood;
  if (m > 0.45) return C.bloomvale;
  return C.plains;
}

/** The houses of the settlements the crew knows, roofs 16 strides square on a grid of 24. */
export const SETTLEMENTS = [{ name: 'Village', x: -110, z: -180, r: 52 }];

/** What the chart draws at a place: a roof, or the kind of its country. */
export function groundAt(x: number, z: number): MapKind {
  for (const t of SETTLEMENTS) {
    const dx = x - t.x, dz = z - t.z;
    if (dx * dx + dz * dz > t.r * t.r) continue;
    const gx = Math.floor((dx + 960) / 24), gz = Math.floor((dz + 960) / 24);
    const ux = (dx + 960) % 24, uz = (dz + 960) % 24;
    if (ux < 16 && uz < 16 && hash(gx, gz, SEED + 9) > 0.3) return 'settlement';
  }
  return countryAt(x, z).kind;
}

/** Where one stands and faces (0 north, 1 east, 2 south, 3 west). */
export const ME = { x: 110, z: -322, facing: 1 };

/** The ways the crew has walked; a chunk of 32 strides whose middle lies within 56 strides of one is known. */
export const WALKED: [number, number][][] = [
  [[0, 0], [60, -160], [110, -322], [332, -330]],
  [[110, -322], [-30, -226], [-200, -120], [-260, 40]],
  [[110, -322], [148, -344], [300, -380], [420, -520]],
  [[60, -160], [20, -62], [-40, 120], [-80, 280], [20, -62]],
  [[300, -380], [540, -62], [410, -152]],
  [[110, -322], [50, -502], [-60, -560]],
];
export const WALK_RADIUS = 56;
export const CHUNK = 32;

export type PlaceKind = 'bed' | 'mouth' | 'altar' | 'gate' | 'friend';

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  icon: string;
  x: number; z: number;
  seat?: number;
  /** How the crossing goes, or why there is none. */
  crossing: string;
  /** Seconds before the way is open; the crossing is open at 0. */
  cooling?: number;
}

const friends: Place[] = CREW.filter((m) => m.online && m.at && m.place !== 'a Sealed Store').map((m) => ({
  id: `place.friend.${m.seat}`, kind: 'friend', name: m.name, icon: `head:${m.seat}`, seat: m.seat,
  x: ME.x + m.at![0], z: ME.z + m.at![1], crossing: 'No crossing to a friend',
}));

export const PLACES: Place[] = [
  { id: 'place.bed', kind: 'bed', name: 'Bed', icon: 'codex:map_bed', x: 120, z: -330, crossing: 'Recall Stone', cooling: 12 },
  { id: 'place.mouth', kind: 'mouth', name: 'The mouth', icon: 'codex:map_mouth', x: 0, z: 0, crossing: 'No crossing to the mouth' },
  { id: 'place.altar1', kind: 'altar', name: 'Vanahar Altar', icon: 'codex:place_altar', x: 332, z: -330, crossing: 'No crossing to an altar' },
  ...friends,
];

/** Pings the crew has set, by seat. */
export const PINGS = [{ seat: 3, x: -60, z: -250 }];

/** Where one last fell. */
export const FELL = { x: 262, z: -150 };

export interface Room { x: number; z: number; w: number; h: number }
export interface Door { x: number; z: number; across: boolean; locked?: boolean }

/** The sealed store under Pabbat that Pellwright is inside: the rooms entered so far and their doors. */
export const STORE = {
  name: 'Sealed Store under Pabbat',
  rooms: [
    { x: 0, z: 0, w: 48, h: 40 }, { x: 56, z: 8, w: 64, h: 24 }, { x: 128, z: -16, w: 40, h: 72 },
    { x: 8, z: 48, w: 32, h: 56 }, { x: 128, z: 64, w: 56, h: 40 },
  ] as Room[],
  doors: [
    { x: 48, z: 16, across: false }, { x: 120, z: 16, across: false }, { x: 16, z: 40, across: true },
    { x: 144, z: 56, across: true }, { x: 168, z: 24, across: false, locked: true },
  ] as Door[],
  /** Where Pellwright stands in it. */
  at: { x: 150, z: 80, seat: 4 },
};
