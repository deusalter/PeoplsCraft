import { coded } from '../pixmap';

/**
 * A slot sunk in its slab (5.4), 18 by 18 or, sliced, the large slot of 26: `pit` above and left, `hi` below and right,
 * a floor of `sh`. On a `dk` floor the pit edge sank into the floor and a grid read as pale lines ruled on the slab.
 */
export const SLOT = coded([
  '663',
  '641',
  '311',
], 'slot', [1, 1, 1, 1]);

/** A slot on a dark plate (5.4): floor `root.0`, light edge `root.3`. */
export const DARK_SLOT = coded([
  'KKk',
  'KKh',
  'khh',
], 'slot.dark', [1, 1, 1, 1]);

export const SLOT_SIZE = 18;
export const LARGE_SLOT_SIZE = 26;
