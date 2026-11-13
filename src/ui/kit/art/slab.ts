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
 * The tooling of dressed stone (5.1), a tile 24 by 24 laid over the face of a stone slab from its corner: short level
 * strokes of `lt`, the bright floor of the cuts a claw chisel leaves, one to a course of six rows and staggered course
 * to course, so that the face reads as worked stone and not as the grey of a plain slab. It is sparse, and a light
 * stroke never reads as a dash beside dark ink as a dark one does, so text on it keeps its contrast.
 */
export const TOOLING = coded([
  '........................',
  '........................',
  '...2222.................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '...............22222....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '.........222............',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '2...................2222',
  '........................',
  '........................',
  '........................',
], 'tooling');

/** The plain dark plate (5.2): a light edge of `root.3` along the top and left only. */
export const PLATE = coded([
  '.KKK.',
  'KhhhK',
  'KhkkK',
  'KhkkK',
  '.KKK.',
], 'plate', [2, 2, 2, 2]);

/** The framed dark plate (5.2, 5.12): a frame one unit deep all round in the colour given when it is drawn. */
export const FRAMED_PLATE = pixmap({
  rows: [
    '.KKK.',
    'KcccK',
    'KckcK',
    'KcccK',
    '.KKK.',
  ],
  key: { K: 'root.0', c: 'tint', k: 'root.1' },
  slice: [2, 2, 2, 2],
}, 'plate.framed');

/** The plate of a named old thing (5.12): a second frame of salt inside the coloured one. */
export const NAMED_PLATE = pixmap({
  rows: [
    '.KKKKK.',
    'KcccccK',
    'KcWWWcK',
    'KcWkWcK',
    'KcWWWcK',
    'KcccccK',
    '.KKKKK.',
  ],
  key: { K: 'root.0', c: 'tint', W: 'salt', k: 'root.1' },
  slice: [3, 3, 3, 3],
}, 'plate.named');
