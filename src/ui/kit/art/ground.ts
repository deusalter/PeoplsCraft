import { type Colour } from '../palette';
import { pixmap } from '../pixmap';

// The ground tile (5.21): dressed stone laid in courses 8 tall, darkened as the ground behind a menu should be. Each
// course is cut into blocks of 10 to 22 units chosen by a fixed hash, with joints of one unit that never fall within 3
// of a joint in the course below. A block is lit from the top left: its top row and left column a step lighter than its
// face, its bottom row and right column `root.1`, the joint `root.0`. Faces are `stone.pit`, one block in five a step
// lighter and one in five a step darker, and about half the faces carry one worn patch of 2 to 3 units a step darker.
// The tile is 96 by 48 so that the pattern does not repeat closely.

const W = 96, H = 48, BH = 8, COURSES = H / BH;
const LENGTHS = [10, 12, 14, 16, 18, 20, 22];

function hash(a: number, b: number, c = 0): number {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return (h ^ (h >>> 15)) >>> 0;
}

/** The joints of each course: x positions (0 to W - 1) of the one-unit joint before each block. */
function courses(): number[][] {
  const all: number[][] = [];
  for (let r = 0; r < COURSES; r++) {
    const below = r > 0 ? all[r - 1] : [];
    const above = r === COURSES - 1 ? all[0] : [];
    for (let attempt = 0; ; attempt++) {
      const joints: number[] = [];
      let x = hash(r, attempt, 7) % 12;
      const start = x;
      let ok = true;
      for (let i = 0; ; i++) {
        joints.push(x);
        const left = W - (x - start);
        let len = LENGTHS[hash(r, i, attempt) % LENGTHS.length];
        if (left - len < 10) len = left;
        x += len;
        if (x - start >= W) break;
      }
      const near = (j: number, set: number[]) => set.some((k) => { const d = Math.abs(j - k) % W; return Math.min(d, W - d) < 4; });
      for (const j of joints) if (near(j, below) || near(j, above)) ok = false;
      const lens = joints.map((j, i) => ((joints[(i + 1) % joints.length] - j) + W) % W || W);
      if (lens.some((l) => l < 10)) ok = false;
      if (ok || attempt > 400) { all.push(joints.map((j) => j % W)); break; }
    }
  }
  return all;
}

const LIGHTER: Record<string, Colour> = { 'root.1': 'stone.pit', 'stone.pit': 'stone.dk', 'stone.dk': 'stone.sh' };
const DARKER: Record<string, Colour> = { 'stone.dk': 'stone.pit', 'stone.pit': 'root.1', 'root.1': 'root.1' };

function build(): string[] {
  const key: Record<Colour, string> = {} as Record<Colour, string>;
  const ch = (c: Colour) => (key[c] ??= 'abcdefgh'[Object.keys(key).length]);
  const grid: Colour[][] = Array.from({ length: H }, () => Array<Colour>(W).fill('root.0'));
  const joints = courses();
  joints.forEach((js, r) => {
    const sorted = [...js].sort((a, b) => a - b);
    sorted.forEach((j, i) => {
      const next = sorted[(i + 1) % sorted.length] + (i + 1 === sorted.length ? W : 0);
      const len = next - j;
      const p = hash(j, r, 3) % 5;
      const face: Colour = p === 0 ? 'stone.dk' : p === 1 ? 'root.1' : 'stone.pit';
      const lit = LIGHTER[face];
      const y0 = r * BH;
      for (let v = 0; v < BH; v++) for (let u = 0; u < len; u++) {
        const x = (j + u) % W, y = y0 + v;
        let c: Colour;
        if (u === 0 || v === BH - 1) c = 'root.0';
        else if (u === len - 1 || v === BH - 2) c = 'root.1';
        else if (u === 1 || v === 0) c = lit;
        else c = face;
        grid[y][x] = c;
      }
      // Worn patches: a step darker, kept off the lit and shaded edges.
      const patches = hash(j, r, 11) % 2;
      for (let k = 0; k < patches; k++) {
        const pw = 2 + (hash(j, r, 20 + k) % 2), ph = 1 + (hash(j, r, 30 + k) % 2);
        const pu = 3 + (hash(j, r, 40 + k) % Math.max(1, len - pw - 5)), pv = 2 + (hash(j, r, 50 + k) % Math.max(1, BH - ph - 4));
        for (let dv = 0; dv < ph; dv++) for (let du = 0; du < pw; du++) {
          if (ph === 2 && pw === 3 && ((du === 0 && dv === 1) || (du === 2 && dv === 0))) continue;
          const x = (j + pu + du) % W, y = y0 + pv + dv;
          grid[y][x] = DARKER[face];
        }
      }
    });
  });
  const out = grid.map((row) => row.map(ch).join(''));
  KEY = Object.fromEntries(Object.entries(key).map(([c, k]) => [k, c as Colour]));
  return out;
}

let KEY: Record<string, Colour> = {};
const ROWS = build();

export const GROUND = pixmap({ rows: ROWS, key: KEY }, 'ground');

/** The tile's period, for parts that scroll it. */
export const GROUND_W = W;
export const GROUND_H = H;

// The floor of the tree (5.20): boards of root-dark timber laid lengthwise, 6 tall with a joint of one unit, their ends
// staggered by a fixed hash. A board is lit along its top row in `timber.dk`, has a face of `timber.pit` with two
// grain lines of `timber.dk` 4 to 9 long, and a bottom row of `root.1` over the `root.0` joint.
const PW = 96, PH = 42, BOARD = 7;

function planks(): string[] {
  const key: Record<Colour, string> = {} as Record<Colour, string>;
  const ch = (c: Colour) => (key[c] ??= 'abcdefgh'[Object.keys(key).length]);
  const grid: Colour[][] = Array.from({ length: PH }, () => Array<Colour>(PW).fill('timber.pit'));
  for (let r = 0; r < PH / BOARD; r++) {
    const y0 = r * BOARD;
    const ends = [hash(r, 1, 5) % 48, 48 + (hash(r, 2, 5) % 40)];
    for (let x = 0; x < PW; x++) {
      grid[y0][x] = 'timber.dk';
      grid[y0 + BOARD - 2][x] = 'root.1';
      grid[y0 + BOARD - 1][x] = 'root.0';
    }
    for (const e of ends) for (let v = 0; v < BOARD - 1; v++) {
      grid[y0 + v][e] = 'root.0';
      grid[y0 + v][(e + PW - 1) % PW] = 'root.1';
      if (v < BOARD - 2) grid[y0 + v][(e + 1) % PW] = 'timber.dk';
    }
    for (let k = 0; k < 2; k++) {
      const gx = hash(r, k, 9) % PW, gy = y0 + 2 + (hash(r, k, 13) % 3), gl = 4 + (hash(r, k, 17) % 6);
      for (let d = 0; d < gl; d++) {
        const x = (gx + d) % PW;
        if (grid[gy][x] === 'timber.pit') grid[gy][x] = 'timber.dk';
      }
    }
  }
  const out = grid.map((row) => row.map(ch).join(''));
  PKEY = Object.fromEntries(Object.entries(key).map(([c, k]) => [k, c as Colour]));
  return out;
}

let PKEY: Record<string, Colour> = {};
const PROWS = planks();

export const PLANKS = pixmap({ rows: PROWS, key: PKEY }, 'planks');
