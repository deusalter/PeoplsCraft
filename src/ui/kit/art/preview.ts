import type { Colour } from '../palette';
import { type PixelMap, pixmap } from '../pixmap';

/**
 * A world's picture in the world list (section 6, World list), 32 by 32: a side cut of the ground at the spawn, built
 * of blocks 4 units square as the world is built of blocks, under a sky of two flat bands. A frame of root.0 with a
 * light edge of root.3 on the top and left inside it. Each column of blocks stands at its own height (the heightmap at
 * one cell to 4 units); the top block is turf, 1 unit of its light tone over 1 of its face, then earth with one speck
 * to the block, then stone. Its ground is the meadow, the snow or the dunes by the seed. The game hands the kit a
 * picture of the world's spawn once it has one; until then the seed draws this.
 */
const S = 32;
const CELL = 4;
/** The highest a surface stands: the sky keeps the first 12 rows inside the frame. */
const SKY = 13;

interface Ground { lit: Colour; top: Colour; body: Colour; speck: Colour }
const GROUNDS: Ground[] = [
  { lit: 'growth.lt', top: 'growth', body: 'timber.sh', speck: 'timber.dk' },
  { lit: 'salt', top: 'stone.lt', body: 'timber.sh', speck: 'timber.dk' },
  { lit: 'clay.lt', top: 'clay.face', body: 'clay.face', speck: 'clay.sh' },
];

const KEY: Record<string, Colour> = {
  K: 'root.0', h: 'root.3', a: 'arm', b: 'arm.lt',
  n: 'growth.lt', N: 'growth', W: 'salt', G: 'stone.lt', L: 'clay.lt', F: 'clay.face', S: 'clay.sh',
  t: 'timber.sh', U: 'timber.dk', J: 'stone.sh', M: 'stone.dk',
};
const CODE: Partial<Record<Colour, string>> = Object.fromEntries(Object.entries(KEY).map(([k, c]) => [c, k]));

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
  // The heightmap: a walk of one block up, down or level from column to column, kept within three blocks of the sky.
  const cols = Math.ceil((S - 2) / CELL);
  const depth: number[] = [Math.floor(hash(seed, 2) * 3)];
  for (let i = 1; i < cols; i++) {
    const r = hash(seed, 10 + i), d = r < 0.3 ? -1 : r > 0.7 ? 1 : 0;
    depth.push(Math.max(0, Math.min(2, depth[i - 1] + d)));
  }
  const rows: string[][] = Array.from({ length: S }, (_, y) => Array<string>(S).fill(y < 7 ? 'a' : 'b'));
  for (let x = 1; x < S - 1; x++) {
    const c = Math.floor((x - 1) / CELL), top = SKY + depth[c] * CELL;
    for (let y = top; y < S - 1; y++) {
      const block = Math.floor((y - top) / CELL), cy = (y - top) % CELL, cx = (x - 1) % CELL;
      const stone = block >= 2;
      // One speck to a block, at a place the seed and the block choose, never on its turf rows.
      const k = 100 + c * 7 + block;
      const sx = 1 + Math.floor(hash(seed, k) * 3), sy = 1 + Math.floor(hash(seed, k + 50) * 3);
      let col: Colour = stone ? 'stone.sh' : g.body;
      if (cx === sx && cy === sy && !(block === 0 && cy < 2)) col = stone ? 'stone.dk' : g.speck;
      if (block === 0 && cy === 0) col = g.lit;
      else if (block === 0 && cy === 1) col = g.top;
      rows[y][x] = CODE[col]!;
    }
  }
  for (let i = 1; i < S - 1; i++) { rows[1][i] = 'h'; rows[i][1] = 'h'; }
  for (let i = 0; i < S; i++) { rows[0][i] = 'K'; rows[S - 1][i] = 'K'; rows[i][0] = 'K'; rows[i][S - 1] = 'K'; }
  const m = pixmap({ rows: rows.map((r) => r.join('')), key: KEY }, `world.${seed}`);
  cache.set(seed, m);
  return m;
}
