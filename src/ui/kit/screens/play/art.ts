// Silhouettes the play screens need beyond the nine of 5.5, drawn by the same rule: one flat tone on the floor.
import { type PixelMap, pixmap } from '../../pixmap';

function mask(rows: string[], name: string): PixelMap { return pixmap({ rows, key: { '#': 'tint' } }, `silhouette.${name}`); }

/** Salt, for the pot: a lidded crock, the lid lifted a row clear so that it reads as a vessel and not as a heap. */
export const SALT = mask([
  '................',
  '................',
  '.......##.......',
  '.....######.....',
  '....########....',
  '................',
  '....########....',
  '.....######.....',
  '...##########...',
  '..############..',
  '..############..',
  '..############..',
  '...##########...',
  '....########....',
  '................',
  '................',
], 'salt');
