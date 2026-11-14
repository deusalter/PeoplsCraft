import type { Colour } from '../palette';
import { type PixelMap, coded, pixmap } from '../pixmap';

/** The eight kinds of ground a chart is drawn in, as a map is drawn: not every country, only what it is to walk on. */
export type MapKind = 'water' | 'sand' | 'grass' | 'forest' | 'stone' | 'snow' | 'settlement' | 'unknown';

/**
 * The chart's palette, fixed: each kind's flat tone and the darker tone of its edge. A kind standing higher than its
 * neighbour (land over water, stone over grass, a roof over the field round it) is ringed by one unit of its edge, the
 * shore and cliff lines; ground not yet walked is parchment, ringed in `clay.sh` where it meets the known.
 */
export const MAP_TONES: Record<MapKind, readonly [face: Colour, edge: Colour]> = {
  water: ['arm.dk', 'arm.dk'],
  sand: ['timber.hi', 'timber.face'],
  grass: ['growth', 'growth.dk'],
  forest: ['growth.dk', 'root.1'],
  stone: ['stone.face', 'stone.sh'],
  snow: ['salt', 'stone.lt'],
  settlement: ['timber.sh', 'timber.pit'],
  unknown: ['clay.face', 'clay.sh'],
};

/** The lit tone of each kind, for a cell of it whose neighbour above or to the left stands lower: the light falls on it. */
export const MAP_LIT: Record<MapKind, Colour> = {
  water: 'arm', sand: 'salt', grass: 'growth.lt', forest: 'growth', stone: 'stone.lt', snow: 'salt', settlement: 'timber.face', unknown: 'clay.face',
};

/** Water beside land: the shallows, a band one cell wide along every shore. */
export const MAP_SHALLOWS: Colour = 'arm';

/** How high each kind stands, for the shore and cliff lines. */
export const MAP_HEIGHT: Record<MapKind, number> = { water: 0, sand: 1, grass: 2, forest: 3, settlement: 4, stone: 5, snow: 6, unknown: -1 };

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

/**
 * The marks a kind of ground carries on its face, so that a fill reads as a material and not as a flat colour: one
 * mark at each point of a grid fixed to the world, every other row moved half a pitch along, each unit a tone. A mark is
 * drawn only where the whole of it falls on that kind's face, never over a shore, an edge or another kind. A kind may
 * have several `marks` to pick among, a `jitter` of up to that many units right and down from the point, and leave one
 * point in `bare` empty, each by a fixed hash of the point; one mark on an exact lattice read as a machine's fill.
 */
type Mark = readonly (readonly [x: number, y: number, c: Colour])[];
export interface Texture { px: number; py: number; mark: Mark; marks?: readonly Mark[]; jitter?: number; bare?: number }

const TUFT: Mark = [[0, 0, 'growth.dk'], [2, 0, 'growth.dk'], [1, 1, 'growth.dk']];
const HOOK: Mark = [[0, 0, 'growth.dk'], [1, 0, 'growth.dk'], [1, 1, 'growth.dk']];
const BLADE: Mark = [[0, 0, 'growth.dk'], [0, 1, 'growth.dk']];

export const MAP_TEXTURE: Partial<Record<MapKind, Texture>> = {
  // A tuft 3 by 2, a hook 2 by 2 or a blade 1 by 2, in growth.dk, up to 3 off the point; a third of the points bare.
  grass: { px: 8, py: 6, mark: TUFT, marks: [TUFT, HOOK, BLADE], jitter: 3, bare: 3 },
  // A grain of darker sand.
  sand: { px: 6, py: 6, mark: [[0, 0, 'clay.sh']] },
  // A crown 5 by 4 seen from above: growth, its top left unit lit, its foot and right side in the shade of root.1.
  forest: { px: 7, py: 7, mark: [
    [1, 0, 'growth.lt'], [2, 0, 'growth'], [3, 0, 'growth'],
    [0, 1, 'growth.lt'], [1, 1, 'growth'], [2, 1, 'growth'], [3, 1, 'growth'], [4, 1, 'growth'],
    [0, 2, 'growth'], [1, 2, 'growth'], [2, 2, 'growth'], [3, 2, 'growth'], [4, 2, 'root.1'],
    [1, 3, 'root.1'], [2, 3, 'root.1'], [3, 3, 'root.1'],
  ] },
  // A ripple: a dash of arm.lt 3 long.
  water: { px: 8, py: 6, mark: [[0, 0, 'arm.lt'], [1, 0, 'arm.lt'], [2, 0, 'arm.lt']] },
};

/** The line of surf along a shore: the unit of the shallows that touches the land. */
export const MAP_SHORE: Colour = 'clay.lt';
