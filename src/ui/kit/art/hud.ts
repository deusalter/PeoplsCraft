import { coded } from '../pixmap';

// The sprites of the HUD (5.15, 5.28): pips of 9 by 9 drawn 7 wide so that a column stays clear between neighbours, full and empty (a half is drawn from the two), and the crosshair.

export const PIPS = {
  life: { full: coded([
    '....K....',
    '...KrK...',
    '..KrRRK..',
    '..KrRRK..',
    '.KrRRRRK.',
    '.KRRRRqK.',
    '.KRRRRqK.',
    '..KRqqK..',
    '...KKK...',
  ], 'pip.life'), empty: coded([
    '....K....',
    '...KjK...',
    '..KjjjK..',
    '..KjjjK..',
    '.KjjjjjK.',
    '.KjjjjjK.',
    '.KjjjjjK.',
    '..KjjjK..',
    '...KKK...',
  ], 'pip.life.empty') },
  // A bowl with no stem, wider than it is deep: a rim, a belly narrowing 7 to 5, a foot ring and a base 3 wide, so its
  // underside rounds and never pinches. Full, a heap of food stands over the rim; empty is the same bowl dark.
  hunger: { full: coded([
    '.........',
    '.........',
    '.........',
    '...KKK...',
    '.KKyyoKK.',
    '.KoooooK.',
    '.KOOOuuK.',
    '..KuuuK..',
    '...KKK...',
  ], 'pip.hunger'), empty: coded([
    '.........',
    '.........',
    '.........',
    '.........',
    '.KKKKKKK.',
    '.KhhhhhK.',
    '.KjjjjjK.',
    '..KkkkK..',
    '...KKK...',
  ], 'pip.hunger.empty') },
  arm: { full: coded([
    '..K.K.K..',
    '.KbKbKbK.',
    '.KBKBKdK.',
    '.KBBBBdK.',
    '.KKBBBdK.',
    '.KbKBBdK.',
    '.KBBBBdK.',
    '..KBBdK..',
    '...KKK...',
  ], 'pip.arm'), empty: coded([
    '..K.K.K..',
    '.KjKjKjK.',
    '.KjKjKjK.',
    '.KjjjjjK.',
    '.KKjjjjK.',
    '.KjKjjjK.',
    '.KjjjjjK.',
    '..KjjjK..',
    '...KKK...',
  ], 'pip.arm.empty') },
};
export type PipKind = keyof typeof PIPS;

export const CROSSHAIR = coded([
  '...KKK...',
  '...KWK...',
  '...KWK...',
  'KKKKWKKKK',
  'KWWWWWWWK',
  'KKKKWKKKK',
  '...KWK...',
  '...KWK...',
  '...KKK...',
], 'crosshair');
