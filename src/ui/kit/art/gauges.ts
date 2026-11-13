import { coded, pixmap } from '../pixmap';

// Hollows that fill (5.13, 5.14), drawn as sunk shapes: the shape's own units are floor (`dk`), a unit just above or
// left of it `pit`, a unit just below or right of it `hi`. Each has a mask of the shape for its fill.

/** The progress arrow, 22 by 15 with its rim; it fills from the left. */
export const ARROW = coded([
  '..............6.......',
  '.............656......',
  '.............6556.....',
  '.............65556....',
  '.............655556...',
  '.6666666666666555556..',
  '655555555555555555556.',
  '6555555555555555555551',
  '655555555555555555551.',
  '.1111111111116555551..',
  '.............655551...',
  '.............65551....',
  '.............6551.....',
  '.............651......',
  '..............1.......',
], 'arrow');
export const ARROW_FILL = pixmap({ rows: [
    '......................',
    '..............#.......',
    '..............##......',
    '..............###.....',
    '..............####....',
    '..............#####...',
    '.###################..',
    '.####################.',
    '.###################..',
    '..............#####...',
    '..............####....',
    '..............###.....',
    '..............##......',
    '..............#.......',
    '......................',
  ], key: { '#': 'tint' } }, 'arrow.fill');

/**
 * The burn gauge, 13 by 15: one tongue of flame leaning a little to the right, with no cleft in it, so that it fills
 * as one shape. It empties from the top.
 */
export const FLAME = coded([
  '......6......',
  '.....656.....',
  '.....6551....',
  '....65556....',
  '....655551...',
  '...6555551...',
  '..65555556...',
  '..655555556..',
  '.65555555551.',
  '655555555556.',
  '6555555555551',
  '6555555555551',
  '.65555555551.',
  '..655555551..',
  '...1111111...',
], 'flame');

/** The units of the flame's hollow, by row: the first and last column of each, rows 1 to 13. */
export const FLAME_ROWS: readonly (readonly [number, number])[] = [
  [6, 6], [6, 7], [5, 7], [5, 8], [4, 8], [3, 8], [3, 9], [2, 10], [1, 10], [1, 11], [1, 11], [2, 10], [3, 9],
];
