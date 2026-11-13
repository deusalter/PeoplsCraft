import { TEXT, tokens } from '../font/face';
import { type PixelMap, TINT, coded } from '../pixmap';

// Raised letters: the text face's own glyphs with every unit cut as a block of 2, then lit as a raised shape, as the
// title mark is at 3. A unit of the shape with open ground above or to its left is salt, one with open ground below or
// to its right is clay.sh, the rest clay.lt; every unit of ground that touches the shape, corners too, is root.0. They
// are drawn, not scaled: each block is part of one lit shape, not a big copy of a unit.

const cache = new Map<string, PixelMap>();

/** The raised drawing of a string at block 2, with its outline: (width of the text face times 2) + 2 by 22. */
export function raised(str: string): PixelMap {
  const hit = cache.get(str);
  if (hit) return hit;
  const B = 2;
  const ts = tokens(str, TEXT);
  const textW = ts.reduce((w, t, i) => w + t.g.w + (i ? TEXT.gap : 0), 0);
  const W = textW * B + 2, H = TEXT.height * B + 2;
  const shape: boolean[] = new Array(W * H).fill(false);
  let gx = 0;
  for (const t of ts) {
    const m = t.g.map;
    if (m) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.cells[y * m.w + x] !== TINT) continue;
      for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) shape[(1 + y * B + j) * W + 1 + (gx + x) * B + i] = true;
    }
    gx += t.g.w + TEXT.gap;
  }
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && shape[y * W + x];
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      if (at(x, y)) r += !at(x, y - 1) || !at(x - 1, y) ? 'W' : !at(x, y + 1) || !at(x + 1, y) ? 'S' : 'L';
      else {
        let near = false;
        for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) if (at(x + i, y + j)) { near = true; break; }
        r += near ? 'K' : '.';
      }
    }
    rows.push(r);
  }
  const map = coded(rows, `raised:${str}`);
  cache.set(str, map);
  return map;
}
