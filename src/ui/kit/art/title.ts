import { coded } from '../pixmap';

// The title mark (5.28): "PEOPLS CRAFT" drawn by hand for the mark alone, not the text face enlarged. Each letter is
// laid out on cells of 3 by 3 units, 8 cells (24 units) tall with strokes 2 cells (6 units) thick, its width its own,
// rounded letters cut on their corners by one cell. PEOPLS is timber and CRAFT is fired clay, set 2 units lower, so
// the two words read as two pieces and not as one typeset line. A face is lit from the top left (its top row and left
// column the ramp's `hi`, its bottom row and right column `sh`), crossed by grain lines one unit deep broken by a
// fixed hash, pushed back 3 units down and right in `clay.dk`, and outlined once in `root.0`.

const C = 3, DEPTH = 3, GAP = 5, SPACE = 15, DROP = 2;

const LETTERS: Record<string, string[]> = {
  P: ['#####.', '######', '##..##', '##..##', '######', '#####.', '##....', '##....'],
  E: ['#####', '#####', '##...', '####.', '####.', '##...', '#####', '#####'],
  O: ['.####.', '######', '##..##', '##..##', '##..##', '##..##', '######', '.####.'],
  L: ['##...', '##...', '##...', '##...', '##...', '##...', '#####', '#####'],
  S: ['.####', '#####', '##...', '####.', '.####', '...##', '#####', '####.'],
  C: ['.####', '#####', '##...', '##...', '##...', '##...', '#####', '.####'],
  R: ['#####.', '######', '##..##', '##..##', '#####.', '####..', '##.##.', '##..##'],
  A: ['.####.', '######', '##..##', '##..##', '######', '######', '##..##', '##..##'],
  F: ['#####', '#####', '##...', '####.', '####.', '##...', '##...', '##...'],
  T: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
};

/** The two words, each with its ramp's tones as palette codes: hi, face, sh, and the grain. */
const WORDS: { text: string; hi: string; face: string; sh: string; grain: string; drop: number }[] = [
  { text: 'PEOPLS', hi: 'e', face: 'T', sh: 't', grain: 't', drop: 0 },
  { text: 'CRAFT', hi: 'W', face: 'F', sh: 'S', grain: 'S', drop: DROP },
];

function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  return (Math.imul(h, 0x27d4eb2f) ^ (h >>> 13)) >>> 0;
}

function build(): string[] {
  const widthOf = (word: string) => [...word].reduce((n, ch) => n + LETTERS[ch][0].length * C + GAP, 0) - GAP;
  const textW = WORDS.reduce((n, w) => n + widthOf(w.text), 0) + SPACE;
  const W = textW + DEPTH + 2, H = 8 * C + DROP + DEPTH + 2;
  // Which word each face unit belongs to, or -1.
  const face: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(-1));
  let x = 1;
  WORDS.forEach((w, wi) => {
    for (const ch of w.text) {
      const rows = LETTERS[ch];
      for (let r = 0; r < 8; r++) for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== '#') continue;
        for (let v = 0; v < C; v++) for (let u = 0; u < C; u++) face[1 + w.drop + r * C + v][x + c * C + u] = wi;
      }
      x += rows[0].length * C + GAP;
    }
    x += SPACE - GAP;
  });
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? face[y][x] : -1);
  const back = (x: number, y: number) => { for (let d = 1; d <= DEPTH; d++) if (at(x - d, y - d) >= 0) return true; return false; };
  const solid = (x: number, y: number) => at(x, y) >= 0 || (x >= 0 && y >= 0 && x < W && y < H && back(x, y));
  const out: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const wi = at(x, y);
      if (wi >= 0) {
        const w = WORDS[wi];
        if (at(x, y - 1) !== wi || at(x - 1, y) !== wi) row += w.hi;
        else if (at(x, y + 1) !== wi || at(x + 1, y) !== wi) row += w.sh;
        // Grain: every fourth row from the word's top, in runs broken where the hash says, never on an edge.
        else if ((y - 1 - w.drop) % 4 === 2 && hash(Math.floor(x / 5), y) % 3 !== 0) row += w.grain;
        else row += w.face;
      } else if (back(x, y)) {
        row += 'D';
      } else {
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if (solid(x + dx, y + dy)) { edge = true; break; }
        row += edge ? 'K' : '.';
      }
    }
    out.push(row);
  }
  return out;
}

export const TITLE_MARK = coded(build(), 'title');
