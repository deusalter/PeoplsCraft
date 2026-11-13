import { type Colour, SEATS } from '../palette';
import { type PixelMap, pixmap } from '../pixmap';

// The heads of the eight seats. Each is a person of its own, 8 by 8 and lit from the top left: their own hair or
// cloth, their own skin, eyes of one unit under a brow, a mouth or a beard. The seat's colour is only the frame of
// one unit round the face, so that a head is read as somebody and its frame says which seat they hold.
//
// Letters: H h d hair (light, mid, dark); L s t skin (lit, mid, shade) and m its darkest, for the mouth; e the eye;
// c C x cloth (light, mid, dark); `.` the dark behind the face, seen where hair or a pate leaves the square.

type Skin = readonly [lit: Colour, mid: Colour, shade: Colour, mouth: Colour];
type Tones = readonly [light: Colour, mid: Colour, dark: Colour];

const PALE: Skin = ['clay.lt', 'clay.face', 'clay.sh', 'clay.dk'];
const WHEAT: Skin = ['timber.hi', 'timber.lt', 'timber.face', 'timber.sh'];
const BROWN: Skin = ['timber.lt', 'timber.face', 'timber.sh', 'timber.dk'];
const DEEP: Skin = ['timber.face', 'timber.sh', 'timber.dk', 'timber.pit'];

const BLACK: Tones = ['root.3', 'root.1', 'root.0'];
const CHESTNUT: Tones = ['timber.face', 'timber.sh', 'timber.dk'];
const UMBER: Tones = ['clay.dk', 'clay.pit', 'root.0'];
const RUST: Tones = ['ember.lt', 'ember', 'ember.dk'];
const ASH: Tones = ['salt', 'stone.lt', 'stone.sh'];

interface Face { rows: readonly string[]; skin: Skin; hair: Tones; cloth?: Tones }

const FACES: readonly Face[] = [
  // 1: long black hair parted in the middle and falling past the jaw.
  { skin: BROWN, hair: BLACK, rows: [
    'hHHhhHhd',
    'hHhLshhd',
    'hLLsssdd',
    'hddssddd',
    'hLessetd',
    'hLsstsdd',
    'hhLmmtdd',
    'hhLsstdd',
  ] },
  // 2: short chestnut crop, ears out, a day's stubble.
  { skin: PALE, hair: CHESTNUT, rows: [
    'hHHHhhhd',
    'Hhhhhhhd',
    'hLLssstd',
    'Lddssddt',
    'Lsessest',
    'LLsstsst',
    'Ltsmmstt',
    'Lttttttt',
  ] },
  // 3: black hair cut close and a full black beard.
  { skin: DEEP, hair: BLACK, rows: [
    'hHHHhhhd',
    'HHhhhhdd',
    'hLssssdd',
    'Lddssddt',
    'Lsessest',
    'hLsstsdd',
    'hhhmmhdd',
    'dhhhhhdd',
  ] },
  // 4: dark hair drawn back into a knot on the crown.
  { skin: WHEAT, hair: UMBER, rows: [
    '..dHhd..',
    'hHHhhhhd',
    'hLLssstd',
    'hddssddd',
    'hLessetd',
    'LLsstsst',
    'LLsmmstt',
    'tLsssstt',
  ] },
  // 5: a hood of grey-green cloth, the face wrapped to the eyes.
  { skin: PALE, hair: UMBER, cloth: ['stone.lt', 'stone.face', 'stone.sh'], rows: [
    'cccCCCCx',
    'cCCCCCxx',
    'CxLsssxx',
    'CLdssdtx',
    'CLessetx',
    'cCCCCCCx',
    'CCCxCCxx',
    'CCxxxxxx',
  ] },
  // 6: red hair standing in tufts, freckles.
  { skin: PALE, hair: RUST, rows: [
    'H.hHh.hd',
    'hHHhhhhd',
    'hHhLsshd',
    'Lddssddt',
    'Lsessest',
    'Ltssttst',
    'LLsmmsst',
    'tLsssstt',
  ] },
  // 7: long grey hair under a band of pale cloth.
  { skin: DEEP, hair: ASH, cloth: ['clay.lt', 'clay.face', 'clay.sh'], rows: [
    'HHhhhhhd',
    'cCCCCCCx',
    'hLLsssdd',
    'hddssddd',
    'hLessetd',
    'hLsstsdd',
    'hhLmmtdd',
    'hdLsstdd',
  ] },
  // 8: a bare pate, a grey fringe, heavy brows and a grey beard.
  { skin: BROWN, hair: ASH, rows: [
    '.LLssst.',
    'LLsssstt',
    'hLsssstd',
    'hhhsshhd',
    'hLessetd',
    'HhLtsthd',
    'Hhhmmhhd',
    '.hhhhdd.',
  ] },
];

/** Puts the frame round a face: seat colour one unit deep with its corners left out, the dark behind the face inside. */
function framed(rows: readonly string[]): string[] {
  const n = rows[0].length;
  const edge = '.' + 'F'.repeat(n) + '.';
  return [edge, ...rows.map((r) => 'F' + r.replace(/\./g, 'k') + 'F'), edge];
}

/** The face 10 by 10 for an icon: the forehead and chin rows and the two edge columns of the face drawn twice. */
function widened(rows: readonly string[]): string[] {
  const wide = rows.map((r) => r[0] + r[1] + r.slice(1, 7) + r[6] + r[7]);
  return [wide[0], wide[1], wide[2], wide[2], ...wide.slice(3, 8), wide[7]];
}

function faceMap(f: Face, rows: string[], seat: number, name: string): PixelMap {
  const [L, s, t, m] = f.skin, [H, h, d] = f.hair;
  const key: Record<string, Colour> = { L, s, t, m, H, h, d, e: 'root.0', k: 'root.1', K: 'root.0', F: SEATS[seat - 1] };
  if (f.cloth) [key.c, key.C, key.x] = f.cloth;
  return pixmap({ rows, key }, name);
}

/**
 * A seat's bare face for a picture of the body: 8 by 8, or 10 by 10 (`wide`), as rows of colours, null where the
 * square is empty. Its skin's three tones come with it, for the hands.
 */
export function seatFace(seat: number, wide = false): { rows: (Colour | null)[][]; skin: readonly [Colour, Colour, Colour] } {
  const f = FACES[(seat - 1) % FACES.length];
  const [L, s, t, m] = f.skin, [H, h, d] = f.hair;
  const key: Record<string, Colour> = { L, s, t, m, H, h, d, e: 'root.0' };
  if (f.cloth) [key.c, key.C, key.x] = f.cloth;
  const rows = (wide ? widened(f.rows) : [...f.rows]).map((r) => [...r].map((ch) => (ch === '.' ? null : key[ch])));
  return { rows, skin: [L, s, t] };
}

/** The head that stands for a player beside their name, on the compass and on the map: 10 by 10 with its frame. */
export const HEADS: readonly PixelMap[] = FACES.map((f, i) => faceMap(f, framed(f.rows), i + 1, `head.small.${i + 1}`));

/** The head as a 16 by 16 icon, for a side tab or a list row: `head:<seat>`. The face is 10 by 10, framed and outlined. */
export const HEAD_ICONS: Record<string, PixelMap> = Object.fromEntries(FACES.map((f, i) => {
  const inner = framed(widened(f.rows));
  const out = ['.'.repeat(16), '..' + 'K'.repeat(12) + '..', ...inner.map((r) => '.K' + r.replace(/^\./, 'K').replace(/\.$/, 'K') + 'K.'), '..' + 'K'.repeat(12) + '..', '.'.repeat(16)];
  return [`head:${i + 1}`, faceMap(f, out, i + 1, `head.${i + 1}`)];
}));

/** The side of a head with its frame. */
export const HEAD_SIZE = 10;
