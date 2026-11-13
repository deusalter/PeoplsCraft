// The body as worn, drawn front on in a well: a figure built from rectangles, each lit along its top and left and
// shaded along its right and bottom, outlined in root.0. A piece that is worn is drawn in its material's tones; the
// rest of the body is a silhouette in the dark plate's tones.
import type { Node } from '../../node';
import type { Colour } from '../../palette';
import { type PixelMap, coded } from '../../pixmap';
import { CODE, COLOURS } from '../../palette';

export type Part = 'head' | 'body' | 'legs';

interface Rect { x: number; y: number; w: number; h: number; part: Part }

/** The figure's rectangles at two sizes: the pack's well (20 by 36) and the states panel's (32 by 64). */
const SHAPES: Record<'small' | 'large', { w: number; h: number; rects: Rect[] }> = {
  small: {
    w: 20, h: 37,
    rects: [
      { x: 6, y: 1, w: 8, h: 8, part: 'head' },
      { x: 6, y: 10, w: 8, h: 12, part: 'body' },
      { x: 2, y: 10, w: 3, h: 12, part: 'body' },
      { x: 15, y: 10, w: 3, h: 12, part: 'body' },
      { x: 6, y: 23, w: 4, h: 13, part: 'legs' },
      { x: 10, y: 23, w: 4, h: 13, part: 'legs' },
    ],
  },
  large: {
    w: 32, h: 64,
    rects: [
      { x: 10, y: 1, w: 12, h: 12, part: 'head' },
      { x: 10, y: 14, w: 12, h: 22, part: 'body' },
      { x: 3, y: 14, w: 6, h: 22, part: 'body' },
      { x: 23, y: 14, w: 6, h: 22, part: 'body' },
      { x: 10, y: 37, w: 6, h: 26, part: 'legs' },
      { x: 16, y: 37, w: 6, h: 26, part: 'legs' },
    ],
  },
};

/** The tones of a piece: lit, mid, shade. */
export type Tones = [Colour, Colour, Colour];
export const BARE: Tones = ['root.3', 'root.2', 'root.2'];

const cache = new Map<string, PixelMap>();

function code(c: Colour): string { return CODE[COLOURS.indexOf(c)]; }

/** The figure's pixel map with each part in its tones. */
export function figureMap(size: 'small' | 'large', tones: Record<Part, Tones>): PixelMap {
  const key = `${size}|${tones.head}|${tones.body}|${tones.legs}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sh = SHAPES[size];
  const g: string[][] = Array.from({ length: sh.h }, () => Array(sh.w).fill('.'));
  for (const r of sh.rects) {
    const [lt, mid, dk] = tones[r.part].map(code);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const edgeL = x === r.x || y === r.y, edgeR = x === r.x + r.w - 1 || y === r.y + r.h - 1;
      g[y][x] = edgeL && !edgeR ? lt : edgeR ? dk : mid;
    }
  }
  // Eyes on a worn helm's face would be ornament; the head stays plain. The outline is every empty unit beside a filled one.
  const filled = (x: number, y: number) => y >= 0 && y < sh.h && x >= 0 && x < sh.w && g[y][x] !== '.' && g[y][x] !== 'K';
  for (let y = 0; y < sh.h; y++) for (let x = 0; x < sh.w; x++) {
    if (g[y][x] !== '.') continue;
    if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) g[y][x] = 'K';
  }
  const m = coded(g.map((r) => r.join('')), `figure.${key}`);
  cache.set(key, m);
  return m;
}

export function figure(x: number, y: number, size: 'small' | 'large', tones: Record<Part, Tones>): Node {
  const m = figureMap(size, tones);
  return { x, y, w: m.w, h: m.h, paint: (s) => s.map(m, 0, 0) };
}

export const FIGURE_SIZE = { small: { w: 20, h: 37 }, large: { w: 32, h: 64 } };
