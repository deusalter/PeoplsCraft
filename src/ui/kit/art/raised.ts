import { TEXT, tokens } from '../font/face';
import { type PixelMap, TINT, coded } from '../pixmap';

// Raised letters, the headline face: the text face's glyphs laid out at 2 to the unit as a mask, then cut and lit at 1,
// so that no part of the drawing is a block of 2. Each cut corner of the face is filled back to a cut of a single
// unit, the face's own chisel, and a diagonal steps by 1; the stroke is salt with a band of clay.lt one unit deep along its
// right and its bottom, where it turns from the light; every unit of ground touching it, corners too, is root.0. Lit
// in blocks of 2 under a single-unit outline and shadow, it read as the small face scaled up, two pixel sizes in one
// word.

const cache = new Map<string, PixelMap>();

/** The headline drawing of a string, cap height 14, with its outline: (width of the text face times 2) + 2 by 22. */
export function raised(str: string): PixelMap {
  const hit = cache.get(str);
  if (hit) return hit;
  const B = 2;
  const ts = tokens(str, TEXT);
  const textW = ts.reduce((w, t, i) => w + t.g.w + (i ? TEXT.gap : 0), 0);
  const W = textW * B + 2, H = TEXT.height * B + 2;
  const shape: boolean[] = new Array(W * H).fill(false);
  const on: boolean[] = new Array(textW * TEXT.height).fill(false);
  let gx = 0;
  for (const t of ts) {
    const m = t.g.map;
    if (m) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.cells[y * m.w + x] !== TINT) continue;
      on[y * textW + gx + x] = true;
      for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) shape[(1 + y * B + j) * W + 1 + (gx + x) * B + i] = true;
    }
    gx += t.g.w + TEXT.gap;
  }
  // A cut corner of the text face, a unit at 1 to 1, would be a cut of 2 here: each is filled back but its outer unit,
  // so the chisel stays one unit deep. A step of a diagonal is such a corner too, and so steps by 1 and not by 2.
  const cell = (x: number, y: number) => x >= 0 && y >= 0 && x < textW && y < TEXT.height && on[y * textW + x];
  for (let y = 0; y < TEXT.height; y++) for (let x = 0; x < textW; x++) {
    if (cell(x, y)) continue;
    const ox = 1 + x * B, oy = 1 + y * B;
    // [the unit left open, as dx, dy inside the cell]
    const open = cell(x - 1, y) && cell(x, y + 1) ? [1, 0] : cell(x + 1, y) && cell(x, y - 1) ? [0, 1] : null;
    if (open) for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) if (i !== open[0] || j !== open[1]) shape[(oy + j) * W + ox + i] = true;
  }
  const cut = shape;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && cut[y * W + x];
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      if (at(x, y)) r += !at(x, y + 1) || !at(x + 1, y) ? 'L' : 'W';
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
