import { pixmap } from '../pixmap';

// The face of a menu button (5.6): one tile of dressed stone 16 by 16, repeated across the whole face, the label's
// ground included. Three tones only, `stone.sh` and the two grits a few levels either side of it, so the grain is felt
// and never read as specks: four pebbles of 2 by 1 or 2 by 2 lit from the top left, and one crack of three units.
export const BUTTON_FACE = pixmap({
  rows: [
    '................',
    '.EE.............',
    '.Ew.............',
    '............Ew..',
    '................',
    '................',
    '................',
    '......EE........',
    '......Ew........',
    '................',
    '..............E.',
    '..............w.',
    '..ww............',
    '....w....Ew.....',
    '................',
    '................',
  ].map((r) => r.replace(/\./g, 'J')),
  key: { J: 'stone.sh', E: 'grit.lt', w: 'grit.dk' },
}, 'button-face');
