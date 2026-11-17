import { coded } from '../pixmap';

/** The check mark of a checkbox that is on (5.10): 7 by 6 in salt, two units thick, with its shadow, at 2, 2. */
export const CHECK = coded([
  '......W.',
  '.....WWK',
  'W...WWKK',
  'WW.WWKK.',
  '.WWWKK..',
  '..WKK...',
  '...K....',
], 'check');

/** The slider's handle (5.11), 8 by 14: a block of dressed stone lit from the top left, a grip cut down its middle. */
export const HANDLE = coded([
  '.KKKKKK.',
  'KAAAAAHK',
  'KAHHHHJK',
  'KAHHHHJK',
  'KAHMAHJK',
  'KAHMAHJK',
  'KAHMAHJK',
  'KAHMAHJK',
  'KAHMAHJK',
  'KAHMAHJK',
  'KAHHHHJK',
  'KAHHHHJK',
  'KHJJJJJK',
  '.KKKKKK.',
], 'slider.handle');
