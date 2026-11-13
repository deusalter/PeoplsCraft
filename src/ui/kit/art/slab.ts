import { coded, pixmap } from '../pixmap';

/**
 * The window slab (5.1) in the tones of its ramp: the outline with its corners left out, light two deep on the top
 * and left, dark two deep on the bottom and right, `face` on the diagonal where they meet. Corners are 3 by 3.
 */
export const SLAB = coded([
  '.KKKKK.',
  'K11113K',
  'K12236K',
  'K12346K',
  'K13446K',
  'K36666K',
  '.KKKKK.',
], 'slab', [3, 3, 3, 3]);

/**
 * The chisel marks of a stone face (5.1), lit from the top left. Each is a pit: its walls that face down or right,
 * turned from the light, in `sh`, and the lip it throws up on its far side in `lt`. Two shapes: a chip 2 by 2 and a
 * cut 3 by 1 with its lip under it.
 */
export type Mark = readonly (readonly [number, number, 'sh' | 'lt'])[];
export const CHIP: Mark = [[0, 0, 'sh'], [1, 0, 'sh'], [0, 1, 'sh'], [1, 1, 'lt']];
export const CUT: Mark = [[0, 0, 'sh'], [1, 0, 'sh'], [2, 0, 'sh'], [1, 1, 'lt'], [2, 1, 'lt']];

/** The face is scattered in cells of this many units; a cell holds one mark or none, at a place of its own. */
export const DRESSING_CELL = 14;

/** A whole number from 0 to 2^32 for a cell, the same on every paint, unlike its neighbours'. */
export function cellHash(i: number, j: number, k: number): number {
  let h = (Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(j + 7, 0x165667b1) ^ Math.imul(k + 3, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The plain dark plate (5.2): a light edge of `root.3` along the top and left only. */
export const PLATE = coded([
  '.KKK.',
  'KhhhK',
  'KhkkK',
  'KhkkK',
  '.KKK.',
], 'plate', [2, 2, 2, 2]);

/**
 * The framed dark plate (5.2, 5.12): inside the outline a frame one unit deep in the colour given when it is drawn,
 * stepped down to its shade on the bottom and right, so it is lit like a part and not drawn as a line round a box.
 */
export const FRAMED_PLATE = pixmap({
  rows: [
    '.KKK.',
    'KccsK',
    'KcksK',
    'KcssK',
    '.KKK.',
  ],
  key: { K: 'root.0', c: 'tint', s: 'shade', k: 'root.1' },
  slice: [2, 2, 2, 2],
}, 'plate.framed');

/**
 * The status frame of a harm (5.18): the framed plate with a unit cut from each corner of its frame, so that a harm is
 * told from a help by its outline and not by its colour alone.
 */
export const HARM_PLATE = pixmap({
  rows: [
    '..KKK..',
    '.KccsK.',
    'KckkksK',
    'KckkksK',
    'KckkksK',
    '.KcssK.',
    '..KKK..',
  ],
  key: { K: 'root.0', c: 'tint', s: 'shade', k: 'root.1' },
  slice: [3, 3, 3, 3],
}, 'plate.harm');

/** The plate of a named old thing (5.12): a second frame of salt inside the coloured one. */
export const NAMED_PLATE = pixmap({
  rows: [
    '.KKKKK.',
    'KccccsK',
    'KcWWLsK',
    'KcWkLsK',
    'KcLLLsK',
    'KcssssK',
    '.KKKKK.',
  ],
  key: { K: 'root.0', c: 'tint', s: 'shade', W: 'salt', L: 'clay.lt', k: 'root.1' },
  slice: [3, 3, 3, 3],
}, 'plate.named');
