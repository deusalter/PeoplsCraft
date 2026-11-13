// Silhouettes the play screens need beyond the nine of 5.5, drawn by the same rule: one flat tone on the floor.
import { type PixelMap, pixmap } from '../../pixmap';

function mask(rows: string[], name: string): PixelMap { return pixmap({ rows, key: { '#': 'tint' } }, `silhouette.${name}`); }

/** Salt, for the pot: a heap poured on a board. */
export const SALT = mask([
  '................',
  '................',
  '................',
  '................',
  '.......##.......',
  '......####......',
  '.....######.....',
  '....########....',
  '...##########...',
  '...##########...',
  '..############..',
  '.##############.',
  '.##############.',
  '................',
  '................',
  '................',
], 'salt');
