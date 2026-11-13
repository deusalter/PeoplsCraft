import { type PixelMap, coded, pixmap } from '../pixmap';

// Marks on the map's chart, 7 by 7 like the compass's: a known altar, a raised gate, and one's own arrow in one's
// seat colour, pointing the way one faces in four quarters.

export const ALTAR_MARK = coded([
  '...K...',
  '..KyK..',
  'KKKKKKK',
  'KAGGGHK',
  '.KGHHK.',
  'KGHHHJK',
  'KKKKKKK',
], 'chart.altar');

export const GATE_MARK = coded([
  '.KKKKK.',
  'KhhhhjK',
  'KhvvvjK',
  'KhvVvjK',
  'KhvvvjK',
  'KhvvvjK',
  'KKKKKKK',
], 'chart.gate');

const ARROW_UP = [
  '...K...',
  '..KcK..',
  '.KcccK.',
  'KcccccK',
  'KKcccKK',
  '.KcccK.',
  '.KKKKK.',
];

/** Turns rows a quarter clockwise; the art is redrawn, never the picture turned when it is drawn. */
function quarter(rows: string[]): string[] {
  const n = rows.length;
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => rows[n - 1 - x][y]).join(''));
}

const turns = [ARROW_UP];
for (let i = 1; i < 4; i++) turns.push(quarter(turns[i - 1]));

/** One's own arrow facing north, east, south and west. */
export const OWN_ARROW: PixelMap[] = turns.map((rows, i) => pixmap({ rows, key: { K: 'root.0', c: 'tint' } }, `chart.arrow.${i}`));

/** The mouth, where arrivals come up: a ring of dressed stone round the dark. */
export const MOUTH_MARK = coded([
  '.KKKKK.',
  'KAGGGHK',
  'KGKKKJK',
  'KGKkKJK',
  'KGKKKJK',
  'KHJJJMK',
  '.KKKKK.',
], 'chart.mouth');
