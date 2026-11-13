import type { Colour } from '../palette';
import { type PixelMap, pixmap } from '../pixmap';

/**
 * A world's picture in the world list (section 6, World list), 32 by 32: a cut through the ground under a flat sky, as
 * the seed would raise it. A frame of root.0, the sun at the top left where the light comes from, hills whose tops are
 * lit where they face up or left, two layers under the turf, stone below a seam of stone.pit, and a few trees. Its
 * ground is the meadow, the snow or the dunes by the seed. The game hands the kit a picture of the world's spawn once
 * it has one; until then the seed draws this.
 */
const S = 32;

const KEY: Record<string, Colour> = {
  K: 'root.0', s: 'arm', w: 'salt', y: 'ember.hi', o: 'ember.lt',
  g: 'growth.lt', G: 'growth', m: 'growth.dk',
  a: 'stone.hi', A: 'stone.lt',
  c: 'clay.lt', C: 'clay.face', d: 'clay.sh',
  t: 'timber.sh', T: 'timber.dk',
  h: 'stone.dk', z: 'stone.pit',
};

interface Ground { top: string; lit: string; under: string; deep: string }
const GROUNDS: Ground[] = [
  { top: 'G', lit: 'g', under: 't', deep: 'T' },
  { top: 'A', lit: 'w', under: 'A', deep: 't' },
  { top: 'C', lit: 'c', under: 'd', deep: 'd' },
];

function hash(n: number, k: number): number {
  let h = Math.imul(n, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca6b);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const cache = new Map<number, PixelMap>();

export function worldPreview(seed: number): PixelMap {
  const hit = cache.get(seed);
  if (hit) return hit;
  const g = GROUNDS[Math.floor(hash(seed, 1) * GROUNDS.length)];
  // The skyline: three knots joined by straight runs, so the hills are cut in steps, not smoothed.
  const knots = [0, 1, 2, 3].map((i) => 11 + Math.floor(hash(seed, 10 + i) * 12));
  const top: number[] = [];
  for (let x = 0; x < S; x++) {
    const f = (x / (S - 1)) * 3, i = Math.min(2, Math.floor(f));
    top.push(Math.round(knots[i] + (knots[i + 1] - knots[i]) * (f - i)));
  }
  const rows: string[][] = Array.from({ length: S }, () => Array<string>(S).fill('s'));
  for (let x = 0; x < S; x++) {
    for (let y = top[x]; y < S; y++) {
      const d = y - top[x];
      rows[y][x] = d === 0 ? g.top : d < 3 ? g.under : d < 6 ? g.deep : d === 6 ? 'z' : 'h';
    }
    // A turf unit is lit where the ground beside it on the left is lower or level: it faces up or left.
    const left = x > 0 ? top[x - 1] : top[x];
    if (left >= top[x]) rows[top[x]][x] = g.lit;
  }
  // Trees on the meadow and the snow: a trunk of two and a crown of five, standing on the turf.
  if (g !== GROUNDS[2]) {
    for (let k = 0; k < 3; k++) {
      const x = 5 + Math.floor(hash(seed, 20 + k) * 22);
      const base = top[x] - 1;
      if (base < 7) continue;
      rows[base][x] = 'T'; rows[base - 1][x] = 'T';
      for (const [dx, dy, c] of [[0, -2, 'm'], [-1, -2, 'm'], [1, -2, 'm'], [0, -3, 'G'], [-1, -3, 'G'], [1, -3, 'm'], [0, -4, 'G']] as const) {
        const tx = x + dx, ty = base + dy;
        if (tx > 0 && tx < S - 1) rows[ty][tx] = g === GROUNDS[1] && c === 'G' ? 'w' : c;
      }
    }
  }
  for (const [x, y, c] of [[4, 3, 'o'], [5, 3, 'y'], [6, 3, 'o'], [4, 4, 'y'], [5, 4, 'y'], [6, 4, 'y'], [4, 5, 'o'], [5, 5, 'y'], [6, 5, 'o']] as const) rows[y][x] = c;
  for (let i = 0; i < S; i++) { rows[0][i] = 'K'; rows[S - 1][i] = 'K'; rows[i][0] = 'K'; rows[i][S - 1] = 'K'; }
  const m = pixmap({ rows: rows.map((r) => r.join('')), key: KEY }, `world.${seed}`);
  cache.set(seed, m);
  return m;
}
