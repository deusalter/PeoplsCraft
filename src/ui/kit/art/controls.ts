import { coded } from '../pixmap';

/** The check mark of a checkbox that is on (5.10), 7 by 5, at 2, 3. */
export const CHECK = coded([
  '......W',
  '.....W.',
  'W...W..',
  '.W.W...',
  '..W....',
], 'check');

/** The slider's handle (5.11), 7 by 14. */
export const HANDLE = coded([
  '.KKKKK.',
  'KGGGGGK',
  'KJJJJJK',
  'KJJJJJK',
  'KJJMJJK',
  'KJJMJJK',
  'KJJMJJK',
  'KJJMJJK',
  'KJJMJJK',
  'KJJJJJK',
  'KJJJJJK',
  'KMMMMMK',
  'KMMMMMK',
  '.KKKKK.',
], 'slider.handle');
