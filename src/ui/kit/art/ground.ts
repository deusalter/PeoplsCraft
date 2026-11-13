import { type Colour } from '../palette';
import { pixmap } from '../pixmap';

// The ground tile (5.21): a wall of dressed stone sunk to about a quarter of its light, so that it recedes behind the
// buttons and the white words on it. Two tones and the joint only: faces `root.2` with a lip of `stone.pit` along their
// top row and left column, joints `root.0` one unit wide, in a bond of blocks 16 by 8 whose courses are set 8 apart.
// The brightest unit of the wall is darker than the face of any button, and nothing on a block is a speck.

const W = 16, H = 16, BW = 16, BH = 8;

function build(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    const course = Math.floor(y / BH), v = y % BH, off = course % 2 ? BW / 2 : 0;
    let row = '';
    for (let x = 0; x < W; x++) {
      const u = (x + off) % BW;
      row += v === BH - 1 || u === BW - 1 ? 'K' : v === 0 || u === 0 ? 'z' : 'j';
    }
    rows.push(row);
  }
  return rows;
}

export const GROUND = pixmap({ rows: build(), key: { K: 'root.0', z: 'stone.pit', j: 'root.2' } }, 'ground');

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
