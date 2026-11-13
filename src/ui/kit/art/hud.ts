import { coded } from '../pixmap';

// The sprites of the HUD (5.15, 5.28): pips of 9 by 9, full and empty (a half is drawn from the two), and the crosshair.

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
  hunger: { full: coded([
    '.........',
    '...KKK...',
    '..KooOK..',
    '.KooOOOK.',
    'KKKKKKKKK',
    'KOOOOOOuK',
    '.KOOOOuK.',
    '.KOOOuuK.',
    '..KKKKK..',
  ], 'pip.hunger'), empty: coded([
    '.........',
    '...KKK...',
    '..KjjjK..',
    '.KjjjjjK.',
    'KKKKKKKKK',
    'KjjjjjjjK',
    '.KjjjjjK.',
    '.KjjjjjK.',
    '..KKKKK..',
  ], 'pip.hunger.empty') },
  arm: { full: coded([
    '..K.K.K..',
    '.KbKbKbK.',
    '.KbKbKBK.',
    'KKbBBBBK.',
    'KbKBBBBK.',
    'KbBBBBBK.',
    '.KBBBBdK.',
    '..KBBdK..',
    '...KKK...',
  ], 'pip.arm'), empty: coded([
    '..K.K.K..',
    '.KjKjKjK.',
    '.KjKjKjK.',
    'KKjjjjjK.',
    'KjKjjjjK.',
    'KjjjjjjK.',
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
