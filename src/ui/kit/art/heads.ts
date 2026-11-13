import { CODE, COLOURS, type Colour, SEATS } from '../palette';
import { coded, type PixelMap } from '../pixmap';

// The head of each of the eight seats, lit from the top left: hair in the seat's colour with its shade on the right
// and one unit of salt where the light first strikes, skin in three clay tones, ink eyes, a clay.dk jaw. The hair is
// what tells the seats apart; the face is the same for all.

/** The shade of each seat's colour, for the right edge of the hair. */
const SHADE: readonly Colour[] = ['arm', 'growth', 'ember', 'rose.dk', 'cyan.dk', 'violet.dk', 'blood', 'clay.face'];

const code = (c: Colour) => CODE[COLOURS.indexOf(c)];

// c the seat's colour, d its shade; L F S D clay.lt, clay.face, clay.sh, clay.dk; I ink; W salt; K root.0.
const SMALL_HEAD = [
  '.KKKKKK.',
  'KWccccdK',
  'KccccccK',
  'KLLFFFSK',
  'KLIFFISK',
  'KLFFFFSK',
  'KDDDDDDK',
  '.KKKKKK.',
];

const ICON_HEAD = [
  '................',
  '................',
  '...KKKKKKKKKK...',
  '..KWWccccccccK..',
  '..KWcccccccccK..',
  '..KcccccccccdK..',
  '..KcLFFFFFFSdK..',
  '..KcLIIFFIISdK..',
  '..KLLFFFFFFSSK..',
  '..KLFFFFFFFFSK..',
  '..KLFFSSSSFFSK..',
  '..KDDDDDDDDDDK..',
  '...KKKKKKKKKK...',
  '................',
  '................',
  '................',
];

function seatMap(rows: string[], seat: number, name: string): PixelMap {
  const c = code(SEATS[seat - 1]), d = code(SHADE[seat - 1]);
  return coded(rows.map((r) => r.replace(/c/g, c).replace(/d/g, d)), name);
}

/** The 8 by 8 head that stands for a player beside their name, on the compass and on the map. */
export const HEADS: readonly PixelMap[] = SEATS.map((_, i) => seatMap(SMALL_HEAD, i + 1, `head.small.${i + 1}`));

/** The same head as a 16 by 16 icon, for a side tab or a list row: `head:<seat>`. */
export const HEAD_ICONS: Record<string, PixelMap> = Object.fromEntries(SEATS.map((_, i) => [`head:${i + 1}`, seatMap(ICON_HEAD, i + 1, `head.${i + 1}`)]));

export const HEAD_SIZE = 8;
