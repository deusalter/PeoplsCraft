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

/**
 * A slot on a dark plate (5.4): `root.0` above and left, a floor of `root.2`, `root.3` below and right. On a floor of
 * `root.0` a dark thing, outlined in `root.0`, lost its silhouette to the floor.
 */
export const DARK_SLOT = coded([
  'KKk',
  'Kjh',
  'khh',
], 'slot.dark', [1, 1, 1, 1]);

export const SLOT_SIZE = 18;
export const LARGE_SLOT_SIZE = 26;
