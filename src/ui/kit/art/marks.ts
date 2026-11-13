import { coded, pixmap } from '../pixmap';

// Marks on the compass (5.25), 7 by 7, and the ping, 9 by 6, drawn in the colour of the player who set it.

export const COMPASS_MARKS = {
  bed: coded([
    '...K...',
    '..KnK..',
    '.KnnnK.',
    'KnnnnnK',
    'KnKKKnK',
    'KnK.KnK',
    'KKK.KKK',
  ], 'mark.bed'),
  fell: coded([
    'KK...KK',
    'KrK.KrK',
    '.KrKrK.',
    '..KrK..',
    '.KrKrK.',
    'KrK.KrK',
    'KK...KK',
  ], 'mark.fell'),
  guide: coded([
    '.KKKKK.',
    'KyyyyyK',
    '.KyyyK.',
    '.KyyyK.',
    '.KyyyK.',
    'KyyyyyK',
    'KKKKKKK',
  ], 'mark.guide'),
  friend: pixmap({ rows: [
    '.KKKKK.',
    'KcccccK',
    'KcccccK',
    'KcKcKcK',
    'KcccccK',
    'KcccccK',
    '.KKKKK.',
  ], key: { K: 'root.0', c: 'tint' } }, 'mark.friend'),
};

export const PING = pixmap({ rows: [
  'KKKKKKKKK',
  'KcccccccK',
  '.KcccccK.',
  '..KcccK..',
  '...KcK...',
  '....K....',
], key: { K: 'root.0', c: 'tint' } }, 'ping');
