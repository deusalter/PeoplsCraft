import { coded } from '../pixmap';

/** The page arrow (5.19), 16 by 7, pointing right; the left one is its mirror. */
export const PAGE_ARROW = coded([
  '...........I....',
  '...........II...',
  '..IIIIIIIIIIII..',
  '..IIIIIIIIIIIII.',
  '..IIIIIIIIIIII..',
  '...........II...',
  '...........I....',
], 'book.arrow');
export const PAGE_ARROW_LEFT = coded([
  '....I...........',
  '...II...........',
  '..IIIIIIIIIIII..',
  '.IIIIIIIIIIIII..',
  '..IIIIIIIIIIII..',
  '...II...........',
  '....I...........',
], 'book.arrow.left');
