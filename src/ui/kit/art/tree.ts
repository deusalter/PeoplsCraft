import type { Colour } from '../palette';
import { type PixelMap, pixmap } from '../pixmap';

// The three frames of a node of a tree (5.20), 26 by 26, built by the rule for raised shapes: outline, then `hi`
// where the shape faces up or left and `pit` where it faces down or right, the rest face. In the rows `1` is hi, `3`
// face and `6` pit; each frame is made once for each state with that state's tones.

export type NodeState = 'locked' | 'open' | 'earned';
export const NODE_TONES: Record<NodeState, { hi: Colour; face: Colour; pit: Colour }> = {
  locked: { hi: 'root.3', face: 'root.2', pit: 'root.1' },
  open: { hi: 'stone.lt', face: 'stone.sh', pit: 'stone.pit' },
  earned: { hi: 'salt', face: 'clay.face', pit: 'clay.pit' },
};

function frame(rows: string[], name: string): Record<NodeState, PixelMap> {
  const out = {} as Record<NodeState, PixelMap>;
  for (const st of Object.keys(NODE_TONES) as NodeState[]) {
    const t = NODE_TONES[st];
    out[st] = pixmap({ rows, key: { K: 'root.0', 1: t.hi, 3: t.face, 6: t.pit } }, `${name}.${st}`);
  }
  return out;
}

export const NODE_FRAMES = {
  square: frame([
    '.KKKKKKKKKKKKKKKKKKKKKKKK.',
    'K111111111111111111111113K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K366666666666666666666666K',
    '.KKKKKKKKKKKKKKKKKKKKKKKK.',
  ], 'node.square'),
  cut: frame([
    '.....KKKKKKKKKKKKKKKK.....',
    '....K1111111111111113K....',
    '...K133333333333333333K...',
    '..K13333333333333333333K..',
    '.K1333333333333333333333K.',
    'K133333333333333333333333K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K133333333333333333333336K',
    'K333333333333333333333336K',
    '.K3333333333333333333336K.',
    '..K33333333333333333336K..',
    '...K333333333333333336K...',
    '....K3666666666666666K....',
    '.....KKKKKKKKKKKKKKKK.....',
  ], 'node.cut'),
  spiked: frame([
    '............KK............',
    '.K.K.......K13K.......K.K.',
    '..K3K.....K1333K.....K3K..',
    '.K333KKKKK133333KKKKK133K.',
    '..K33111113333331111136K..',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '..K13333333333333333333K..',
    '.K1333333333333333333333K.',
    'K133333333333333333333333K',
    'K333333333333333333333336K',
    '.K3333333333333333333336K.',
    '..K33333333333333333336K..',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '...K133333333333333336K...',
    '..K13666663333336666633K..',
    '.K336KKKKK333336KKKKK333K.',
    '..K3K.....K3336K.....K3K..',
    '.K.K.......K36K.......K.K.',
    '............KK............',
  ], 'node.spiked'),
};
export type NodeShape = keyof typeof NODE_FRAMES;
