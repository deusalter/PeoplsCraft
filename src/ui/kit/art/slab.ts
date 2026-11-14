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
