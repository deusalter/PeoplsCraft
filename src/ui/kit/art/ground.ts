import { type Colour } from '../palette';
import { pixmap } from '../pixmap';

// The ground tile (5.21): a wall of dressed stone sunk to about a quarter of its light, so that it recedes behind the
// buttons and the white words on it. Faces `root.2` with a lip of `stone.pit` along their top row and left column,
// joints `root.0` one unit wide. The tile is 32 by 32: four courses of blocks 8 tall, two blocks to a course, faces 13,
// 15 and 17 long so that no joint stands over the one two courses down. Two blocks are a tone darker (`root.1` faces),
// one has a chip knocked off its bottom right corner and one a crack of three units, so that the wall reads as laid
// stone and not as one block printed over and over. The brightest unit is still darker than any button's face.

const W = 32, H = 32, BH = 8;

type Mark = 'plain' | 'dark' | 'chip' | 'crack';
/** Each course: where its first block starts, and its two blocks as [length with the joint, mark]. */
const COURSES: [start: number, blocks: [number, Mark][]][] = [
  [0, [[14, 'dark'], [18, 'plain']]],
  [7, [[16, 'plain'], [16, 'chip']]],
  [1, [[18, 'plain'], [14, 'dark']]],
  [11, [[16, 'plain'], [16, 'crack']]],
];

function build(): string[] {
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('j'));
  const at = (x: number, y: number, c: string) => { g[y][((x % W) + W) % W] = c; };
  COURSES.forEach(([start, blocks], ci) => {
    let x0 = start;
    for (const [len, mark] of blocks) {
      for (let v = 0; v < BH; v++) for (let u = 0; u < len; u++) {
        const y = ci * BH + v;
        at(x0 + u, y, v === BH - 1 || u === len - 1 ? 'K' : v === 0 || u === 0 ? 'z' : mark === 'dark' ? 'k' : 'j');
      }
      const y0 = ci * BH;
      if (mark === 'chip') for (let v = 5; v <= 6; v++) for (let u = len - 3; u <= len - 2; u++) at(x0 + u, y0 + v, 'k');
      // The crack runs down from the lip, so it reads as split from the edge and not as a speck on the face.
      if (mark === 'crack') { at(x0 + 5, y0 + 1, 'K'); at(x0 + 5, y0 + 2, 'K'); at(x0 + 6, y0 + 3, 'K'); }
      x0 += len;
    }
  });
  return g.map((r) => r.join(''));
}

export const GROUND = pixmap({ rows: build(), key: { K: 'root.0', z: 'stone.pit', j: 'root.2', k: 'root.1' } }, 'ground');

/** The tile's period, for parts that scroll it. */
export const GROUND_W = W;
export const GROUND_H = H;

function hash(a: number, b: number, c = 0): number {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return (h ^ (h >>> 15)) >>> 0;
}

// The floor of the tree (5.20): boards of root-dark timber laid lengthwise, 6 tall with a joint of one unit, their ends
// staggered by a fixed hash. A board is flat `timber.pit` with two grain lines of `root.1` 4 to 9 long, the joint and
// the butt ends `root.0`. No board is lit along its top: a bright edge on every board made the floor as loud as the
// nodes on it, and the dark of a locked node was lost in it.
const PW = 96, PH = 42, BOARD = 7;

function planks(): string[] {
  const key: Record<Colour, string> = {} as Record<Colour, string>;
  const ch = (c: Colour) => (key[c] ??= 'abcdefgh'[Object.keys(key).length]);
  const grid: Colour[][] = Array.from({ length: PH }, () => Array<Colour>(PW).fill('timber.pit'));
  for (let r = 0; r < PH / BOARD; r++) {
    const y0 = r * BOARD;
    const ends = [hash(r, 1, 5) % 48, 48 + (hash(r, 2, 5) % 40)];
    for (let x = 0; x < PW; x++) grid[y0 + BOARD - 1][x] = 'root.0';
    for (const e of ends) for (let v = 0; v < BOARD - 1; v++) grid[y0 + v][e] = 'root.0';
    for (let k = 0; k < 2; k++) {
      const gx = hash(r, k, 9) % PW, gy = y0 + 1 + (hash(r, k, 13) % 4), gl = 4 + (hash(r, k, 17) % 6);
      for (let d = 0; d < gl; d++) {
        const x = (gx + d) % PW;
        if (grid[gy][x] === 'timber.pit') grid[gy][x] = 'root.1';
      }
    }
  }
  const out = grid.map((row) => row.map(ch).join(''));
  PKEY = Object.fromEntries(Object.entries(key).map(([c, k]) => [k, c as Colour]));
  return out;
}

let PKEY: Record<string, Colour> = {};
const PROWS = planks();

export const PLANKS = pixmap({ rows: PROWS, key: PKEY }, 'planks');
