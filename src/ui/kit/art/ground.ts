import { type Colour } from '../palette';
import { pixmap } from '../pixmap';

// The ground tile (5.21): dressed stone laid in courses of blocks 16 by 8, each course set 8 along from the one under
// it, with joints of one unit. The stone is darkened, as the ground behind a menu should be: a block is lit from the top
// left, its top row and left column in `stone.dk`, a face of `stone.pit`, its bottom row and right column in `root.1`,
// the joint `root.0`. A third of the blocks, chosen by a
// fixed hash of where they stand, have their face one step lighter or darker, so the courses read as separate stones
// and not as a mesh. The tile is 96 by 48 (six blocks by six courses) so that the variation does not repeat closely.

const W = 96, H = 48, BW = 16, BH = 8;

/** A fixed hash of a block's column and course, 0 to 5. */
function pick(col: number, row: number): number {
  let h = (col * 73856093) ^ (row * 19349663) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) % 6;
}

function build(): string[] {
  const key: Record<Colour, string> = {} as Record<Colour, string>;
  const ch = (c: Colour) => (key[c] ??= 'abcdef'[Object.keys(key).length]);
  const out: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    const course = Math.floor(y / BH), v = y % BH;
    const shift = course % 2 ? BW / 2 : 0;
    for (let x = 0; x < W; x++) {
      const bx = (x + W - shift) % W, col = Math.floor(bx / BW), u = bx % BW;
      const p = pick(col, course);
      const face: Colour = p === 0 ? 'stone.dk' : p === 1 ? 'root.1' : 'stone.pit';
      let c: Colour;
      if (u === BW - 1 || v === BH - 1) c = 'root.0';
      else if (u === BW - 2 || v === BH - 2) c = 'root.1';
      else if (u === 0 || v === 0) c = p === 1 ? 'stone.pit' : 'stone.dk';
      else c = face;
      row += ch(c);
    }
    out.push(row);
  }
  KEY = Object.fromEntries(Object.entries(key).map(([c, k]) => [k, c as Colour]));
  return out;
}

let KEY: Record<string, Colour> = {};
const ROWS = build();

export const GROUND = pixmap({ rows: ROWS, key: KEY }, 'ground');

/** The tile's period, for parts that scroll it. */
export const GROUND_W = W;
export const GROUND_H = H;
