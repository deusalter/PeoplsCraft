// The title's picture: the ground cut through at night, drawn in the interface's palette one canvas pixel to the unit
// and scaled up by a whole number, so it sits on the same grid as the menu's letters and slabs.
//
// What it shows is what the game's name means (docs/world/01-ground.md 1.1). A householder kneels in a cut-away house
// with a hand on the hearthstone, the pot of lees beside it; the ward's light reaches a fixed distance and no further.
// Two peopls stand at its edge facing out, where the host it draws comes up to it in the dark. Under the turf the
// ground is blocks of soil and stone, and under the stone runs the dead root the world lies on, black, grained, and
// not made of this world's blocks. Each peopl is still joined to it: a thin way runs from an opening in the root up
// to their feet, and now and then something climbs it. The householder, born here, has none. A piece of ground hangs
// over a dug-out hill, because ground here stays as it is put.
import { TITLE_MARK } from './kit/art/title';
import { type Colour, RGB, byCode, ci } from './kit/palette';

const B = 8;            // a block, in units
const FPS = 15;         // the picture moves at a sprite's pace, not the display's
const R = 64;           // how far the ward's light reaches from the stone

/** Where the title's parts stand for a screen W by H units. The menu's column starts at colTop. */
export function sceneLayout(W: number, H: number) {
  const markY = Math.max(8, Math.round(H * 0.065));
  const groundY = Math.round(H * 0.5);
  const rootY = H - Math.max(20, Math.round(H * 0.085));
  return { W, H, cx: Math.floor(W / 2), markY, groundY, colTop: groundY + 14, rootY };
}

/** The whole-number scale the menu and the picture are drawn at: one unit is this many CSS pixels. */
export function unitScale(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / 427, window.innerHeight / 240)));
}

// ---- small helpers

function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x1b873593, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
/** A hash that is the same over a clump of 2 by 2 units, the clumps of alternate rows set half a clump over. */
const clump = (x: number, y: number, s: number) => { const cy = Math.floor(y / 2); return hash(Math.floor((x + (cy & 1)) / 2), cy, s); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const C = (n: Colour) => ci(n);

// Materials the hearth relights: each has four light levels of three tones (body, fleck lit, fleck dark).
const enum M { None, Grass, Dirt, Leaf, Trunk, Plank, Stone }
const TONES: Record<number, Colour[][]> = {
  [M.Grass]: [['root.2', 'growth.dk', 'root.1'], ['growth.dk', 'growth', 'root.2'], ['growth', 'growth.lt', 'growth.dk'], ['growth.lt', 'growth.lt', 'growth']],
  [M.Dirt]: [['timber.pit', 'timber.dk', 'root.1'], ['timber.dk', 'timber.sh', 'timber.pit'], ['timber.sh', 'timber.face', 'timber.dk'], ['timber.face', 'timber.lt', 'timber.sh']],
  [M.Leaf]: [['root.1', 'root.2', 'root.0'], ['growth.dk', 'growth', 'root.2'], ['growth', 'growth.lt', 'growth.dk'], ['growth', 'growth.lt', 'growth.dk']],
  [M.Trunk]: [['root.1', 'timber.pit', 'root.0'], ['timber.pit', 'timber.dk', 'root.1'], ['timber.dk', 'timber.sh', 'timber.pit'], ['timber.sh', 'timber.face', 'timber.dk']],
  [M.Plank]: [['root.1', 'timber.pit', 'root.0'], ['timber.pit', 'timber.dk', 'root.1'], ['timber.dk', 'timber.sh', 'timber.pit'], ['timber.sh', 'timber.face', 'timber.dk']],
  [M.Stone]: [['stone.pit', 'stone.dk', 'root.2'], ['stone.dk', 'stone.sh', 'stone.pit'], ['stone.sh', 'stone.face', 'stone.dk'], ['stone.face', 'stone.lt', 'stone.sh']],
};
const TONE_I: Record<number, number[][]> = Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, v.map((l) => l.map(C))]));

// ---- sprites: rows of palette codes, '.' clear. Figures are drawn with an outline of root.0 round them.

/** The householder, kneeling, facing right, the near arm out to the stone's hollow. */
const HOLDER = [
  '...XXU......',
  '..XUUUU.....',
  '..Uffft.....',
  '..Ufftt.....',
  '...ftt......',
  '..ddBBff....',
  '.dBBBBBffff.',
  '.dBBBBd.....',
  '.dBBBBd.....',
  '.dBBBddd....',
  '..UTTTTTt...',
  '..UTTTTTtt..',
  '.XXUU..UXX..',
];

/** The hearthstone: dressed hard stone, the hollow worn in its top, the cut lines from it down to the charge. */
const HEARTHSTONE = [
  '..JHGGHJ..',
  '.JHG..GHJ.',
  'JHGGHuHGHM',
  'JGHHuHHHHM',
  'JGHuHHuHJM',
  'JHuHHHHuJM',
  'JHHHHHHHJM',
  'MJJJJJJJMM',
];

/** The pot of lees beside it: the charge, boiled down and salted. */
const POT = [
  '.DSSSD.',
  'DKKKKKD',
  'DSFFFSD',
  'DSFFSSD',
  'DSFSSSD',
  'DSSSSDD',
  '.DDDDD.',
];

/** A peopl at the ward's edge, facing right (out), the hearth's light on the near side, a spear held upright. */
const PEOPL = [
  '.......G.',
  '......GAG',
  '..JJM..U.',
  '.oGJMk.U.',
  '.oJkkk.U.',
  '..JMM..U.',
  '.oJMMMMU.',
  'oJJMMM.U.',
  'oJMMMM.U.',
  'oJMMMM.U.',
  '.JMMMM.U.',
  '.oUtUU.U.',
  '.oU..U.U.',
  '.oU..U...',
  '.oU..UU..',
  'oUU..UU..',
];

/** A bodied feeder of a host, facing left (toward the light), low and long, no face. Two strides. */
const FEEDER = [
  [
    '......hhhh.....',
    '....hhjjjjhh.h.',
    '..hjjjjjjjjjjhj',
    '.jjjjjjjjjjjjj.',
    'jjjkjjjjjjjkjj.',
    'jj.kj....jjk.j.',
    'j..k.....j..k..',
    'j..k....j...k..',
  ],
  [
    '......hhhh.....',
    '....hhjjjjhh.h.',
    '..hjjjjjjjjjjhj',
    '.jjjjjjjjjjjjj.',
    'jjjkjjjjjjjkjj.',
    '.jjk....jjk..j.',
    '.j.k...j..k.j..',
    '.j..k..j..k.j..',
  ],
];

type Sprite = string[];
const SPR = new Map<string, number>();
function code(ch: string): number {
  let v = SPR.get(ch);
  if (v === undefined) { v = byCode(ch) ?? -1; SPR.set(ch, v); }
  return v;
}

interface Way { pts: [number, number][]; period: number; phase: number }
interface Feeder { x: number; y: number; flip: boolean; phase: number }

export class TitleScene {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img!: ImageData;
  private W = 0;
  private H = 0;
  private L = sceneLayout(1, 1);
  /** The picture with nothing moving and nothing lit: palette indices. */
  private base = new Int16Array(0);
  /** Which material each unit is, for the hearth to relight, and which of its three tones. */
  private mat = new Uint8Array(0);
  private tone = new Uint8Array(0);
  private frame = new Int16Array(0);
  private ways: Way[] = [];
  private feeders: Feeder[] = [];
  private stars: [number, number, number][] = [];
  private glints: [number, number][] = [];
  private blob = { x: 0, y: 0 };
  private raf = 0;
  private last = -1;
  private t0 = performance.now();
  /** Draw the title mark over the sky (the home screen) or not (the screens under it, where the sky is dimmed). */
  mark = true;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'scene';
    host.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', this.resize);
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }

  private resize = (): void => {
    const s = unitScale();
    const W = Math.ceil(window.innerWidth / s), H = Math.ceil(window.innerHeight / s);
    this.canvas.style.width = W * s + 'px';
    this.canvas.style.height = H * s + 'px';
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    this.img = this.ctx.createImageData(W, H);
    this.build();
    this.last = -1;
  };

  // ---- the still picture

  private px(x: number, y: number, c: number, m = M.None, t = 0): void {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = y * this.W + x;
    this.base[i] = c; this.mat[i] = m; this.tone[i] = t;
  }
  private lit(x: number, y: number, m: M, t: number): void { this.px(x, y, TONE_I[m][0][t], m, t); }

  /** How many blocks above the flat a column of blocks stands (0 to 3); flat across the ward and a margin round it. */
  private rise(c: number): number {
    const flat = Math.ceil((R + 52) / B);
    if (Math.abs(c) <= flat) return 0;
    let h = 0;
    const dir = c < 0 ? -1 : 1;
    for (let k = flat + 1; k <= Math.abs(c); k++) {
      const want = Math.max(0, Math.min(3, Math.round(1.3 + 1.4 * Math.sin(k * 0.62 + (dir < 0 ? 2.1 : 0.4)) + 0.7 * Math.sin(k * 1.7))));
      h += Math.sign(want - h);
    }
    return h;
  }

  private build(): void {
    const { W, H } = this;
    const L = (this.L = sceneLayout(W, H));
    const n = W * H;
    this.base = new Int16Array(n); this.mat = new Uint8Array(n); this.tone = new Uint8Array(n); this.frame = new Int16Array(n);
    this.glints = [];
    const { cx, groundY: gy, rootY } = L;
    const x0 = cx - 4; // the block grid is set by the hearthstone's block
    const col = (x: number) => Math.floor((x - x0) / B);
    const top = (x: number) => gy - this.rise(col(x)) * B;
    const rootTop = (x: number) => rootY + Math.round(3 * Math.sin(x / 29 + 0.7) + 2 * Math.sin(x / 11.3 + 2.1));

    // sky: four bands of the night, dithered, lifting to a haze at the horizon that the figures stand dark against
    for (let y = 0; y < gy; y++) for (let x = 0; x < W; x++) {
      const v = Math.pow(y / gy, 1.7) * 3.25;
      const band = Math.max(0, Math.min(3, Math.floor(v + bayer(x, y) - 0.5)));
      this.px(x, y, C((['root.0', 'root.1', 'root.2', 'root.3'] as const)[band]));
    }
    // stars, fewer toward the horizon
    this.stars = [];
    for (let y = 0; y < gy - 20; y++) for (let x = 0; x < W; x++) {
      if (hash(x, y, 7) >= 0.006 * (1 - y / gy)) continue;
      const kind = hash(x, y, 8);
      if (kind < 0.18) this.stars.push([x, y, hash(x, y, 9) * 6.28]);
      else this.px(x, y, C(kind < 0.55 ? 'root.3' : kind < 0.85 ? 'root.4' : 'salt'));
    }
    // the moon, high on the right
    const mx = Math.min(W - 20, cx + 160), my = L.markY + 10, mr = 9;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
      const d = x * x + y * y;
      if (d > mr * mr + 2) continue;
      const mare = clump(x + 40, y + 40, 3) < 0.25;
      this.px(mx + x, my + y, C(d > (mr - 1) * (mr - 1) + 1 && x + y > 4 ? 'clay.sh' : mare || x + y > 9 ? 'clay.face' : 'clay.lt'));
    }
    // a far ridge behind the hills, kept off the middle so the figures there stand against the haze
    for (let x = 0; x < W; x++) {
      const w = Math.max(0, Math.min(1, (Math.abs(x - cx) - R - 40) / 70));
      const h = Math.round(w * (14 + 6 * Math.sin(x / 31 + 1) + 4 * Math.sin(x / 13.7) + 2 * Math.sin(x / 5.1)));
      for (let y = gy - h; y < gy; y++) this.px(x, y, C('root.1'));
    }

    const cave = new Set<string>();

    // the ground: block columns of turf, soil and stone
    for (let x = 0; x < W; x++) {
      const c = col(x), u = ((x - x0) % B + B) % B, t0 = top(x), rt = rootTop(x);
      for (let y = t0; y < rt; y++) {
        const depth = y - t0;
        const by = Math.floor((y - gy) / B), v = ((y - gy) % B + B) % B;
        const k = clump(x, y, 11), r = hash(x, y, 12);
        if (depth < B) {
          // turf: two rows of grass, a ragged third and fourth, then soil
          const drip = (depth === 2 && hash(x, c, 5) < 0.55) || (depth === 3 && hash(x, c, 6) < 0.2);
          if (depth < 2 || drip) this.lit(x, y, M.Grass, depth === 0 ? 1 : r < 0.2 ? 1 : r > 0.88 ? 2 : 0);
          else this.lit(x, y, M.Dirt, k < 0.18 ? 1 : k > 0.82 ? 2 : 0);
          continue;
        }
        if (y < gy + 3 * B) { this.lit(x, y, M.Dirt, k < 0.16 ? 1 : k > 0.8 ? 2 : 0); continue; }
        if (cave.has(`${c},${by}`)) {
          // inside a cave: the far wall in the dark, a shadow under its roof
          const roof = !cave.has(`${c},${by - 1}`) && v < 2;
          this.px(x, y, C(roof ? 'root.0' : k < 0.3 ? 'root.2' : 'root.1'));
          continue;
        }
        const deep = y >= rootY - 2 * B;
        const kind = hash(c, by, 21);
        // a block's lower and right edges a step darker, here and there, so the stone reads as laid blocks
        const seam = (u === B - 1 || v === B - 1) && hash(x, y, 31) < 0.6;
        const caveBelow = cave.has(`${c},${by + 1}`) && v >= B - 1, caveAbove = cave.has(`${c},${by - 1}`) && v === 0;
        let cc: Colour;
        if (deep) cc = seam || k < 0.2 ? 'root.1' : k > 0.85 ? 'stone.pit' : 'root.2';
        else cc = caveAbove ? 'stone.dk' : caveBelow || seam || k < 0.16 ? 'root.2' : k > 0.82 ? 'stone.dk' : 'stone.pit';
        const inner = u > 0 && u < B - 1 && v > 0 && v < B - 1;
        if (!deep && kind < 0.075 && inner && clump(x, y, 41) < 0.3) cc = clump(x, y, 42) < 0.5 ? 'clay.dk' : 'clay.sh';
        if (kind > 0.962 && inner && clump(x, y, 43) < 0.32) {
          cc = 'cyan.dk';
          if (hash(x, y, 44) < 0.12) this.glints.push([x, y]);
        }
        this.px(x, y, C(cc));
      }
    }

    // the dead root: black plates of grain, its upper edge catching no warmth; roots of it reaching up into the deep stone
    for (let x = 0; x < W; x++) {
      const rt = rootTop(x);
      for (let y = rt; y < H; y++) {
        const d = y - rt;
        const band = Math.floor((y - rootY + 6 + Math.round(2 * Math.sin(x / 17))) / 3);
        const len = 7 + Math.floor(hash(band, 0, 51) * 12);
        const seg = Math.floor((x + band * 11) / len);
        const plate = hash(band, seg, 52) < 0.42;
        const first = Math.floor((x + band * 11) % len) === 0;
        let cc: Colour = 'root.0';
        if (d === 0) cc = 'root.2';
        else if (d === 1) cc = 'root.1';
        else if (plate && !first) cc = (y - rootY + 6 + Math.round(2 * Math.sin(x / 17))) % 3 === 0 && hash(x, band, 53) < 0.35 ? 'root.2' : 'root.1';
        this.px(x, y, C(cc));
      }
      if (hash(x, 1, 54) < 0.022) {
        let rx = x;
        const len = 6 + Math.floor(hash(x, 2, 54) * 10);
        for (let k = 1; k <= len; k++) {
          if (k > 2 && hash(x, k, 55) < 0.22) rx += hash(x, k, 56) < 0.5 ? -1 : 1;
          this.px(rx, rt - k, C('root.0'));
          if (k < len * 0.5) this.px(rx + 1, rt - k, C('root.1'));
        }
      }
    }

    // each peopl's way: an opening in the root, and a thread from it up through the stone to where the peopl stands
    this.ways = [];
    for (const [i, wx] of [cx - 56, cx + 56].entries()) {
      let x = wx;
      const pts: [number, number][] = [];
      const yTop = gy + 1;
      for (let y = rootTop(x) + 3; y >= yTop; y--) {
        if (y < rootTop(x) - 2 && y > gy + 6 && hash(i, y, 62) < 0.1) x += hash(i, y, 63) < 0.5 ? -1 : 1;
        pts.push([x, y]);
        if (y >= rootTop(x)) this.px(x, y, C('arm.dk'));
        else if (y > gy + B && y % 2 === 0) this.px(x, y, C('arm.dk'));
      }
      const ox = pts[0][0];
      for (const [dx, dy] of [[-1, 1], [1, 1], [-1, 2], [0, 2], [1, 2], [0, 3]]) this.px(ox + dx, rootTop(ox) + dy, C('arm.dk'));
      this.ways.push({ pts, period: 7 + i * 2.3, phase: i * 3.1 });
    }

    // trees: on the hills, out in the dark, and one in the yard within the light
    const tree = (tx: number, ty: number, size: number) => {
      for (let y = ty - 3 * size; y < ty; y++) for (let x = tx; x < tx + 2; x++) this.lit(x, y, M.Trunk, x === tx ? 1 : 0);
      const lw = 5 * size + 2, lh = 3 * size + 3, ly0 = ty - 3 * size - lh + 3;
      for (let y = 0; y < lh; y++) for (let x = -lw; x <= lw + 1; x++) {
        const e = (x - 0.5) ** 2 / (lw * lw) + (y - lh / 2) ** 2 / ((lh / 2) ** 2);
        if (e > 1 + 0.3 * (clump(tx + x, y, 71) - 0.5)) continue;
        const r = clump(tx + x, y, 72);
        this.lit(tx + x, ly0 + y, M.Leaf, y < 2 && r < 0.6 ? 1 : r > 0.8 ? 2 : r < 0.16 ? 1 : 0);
      }
    };
    for (let k = 0; k < 6; k++) {
      const side = k % 2 ? 1 : -1, dist = R + 48 + Math.floor(k / 2) * 54 + Math.round(hash(k, 1, 73) * 16);
      const tx = cx + side * dist;
      if (tx < 4 || tx > W - 6) continue;
      tree(tx, top(tx), 2 + (hash(k, 2, 73) < 0.5 ? 0 : 1));
    }
    tree(cx + 40, gy, 2);

    // ground left hanging: a piece of turf and stone over a hill on the left, its underside broken off
    const sx = cx - R - 96, sy = gy - 6 * B;
    if (sx > 2) for (let bx = 0; bx < 5; bx++) for (let y = 0; y < 2 * B; y++) for (let x = 0; x < B; x++) {
      const X = sx + bx * B + x, Y = sy + y, k = clump(X, Y, 81);
      const under = y >= B && (bx === 0 || bx === 4 || (y > B + 3 && (bx === 1 || bx === 3)) || y > B + 5 + Math.floor(hash(bx, x, 82) * 2));
      if (under) continue;
      if (y < 2 || (y === 2 && hash(X, 1, 83) < 0.5)) this.lit(X, Y, M.Grass, y === 0 ? 1 : 0);
      else if (y < B) this.lit(X, Y, M.Dirt, k < 0.18 ? 1 : k > 0.8 ? 2 : 0);
      else this.lit(X, Y, M.Stone, k < 0.15 ? 1 : k > 0.8 ? 2 : 0);
    }

    // the house, cut away: boards on the back wall, two posts, a stepped roof, a chimney
    const hx0 = cx - 28, hx1 = cx + 28, wallTop = gy - 21;
    for (let y = wallTop; y < gy; y++) for (let x = hx0; x <= hx1; x++) {
      const edge = x - hx0 < 3 || hx1 - x < 3;
      if (edge) { this.lit(x, y, M.Trunk, x - hx0 === 0 || hx1 - x === 2 ? 1 : 0); continue; }
      const row = Math.floor((y - wallTop) / 4);
      const seam = (y - wallTop) % 4 === 3 || (x + row * 9) % 17 === 0;
      this.lit(x, y, M.Plank, seam ? 2 : 0);
    }
    for (let x = hx0; x <= hx1; x++) { this.lit(x, wallTop, M.Trunk, 0); this.lit(x, wallTop + 1, M.Trunk, 2); }
    for (let x = hx0 + 3; x <= hx1 - 3; x++) this.lit(x, gy - 1, M.Plank, 1);
    for (let s = 0; s < 6; s++) {
      const y0 = wallTop - 2 - s * 2, inset = -4 + s * 5;
      for (let y = y0; y < y0 + 2; y++) for (let x = hx0 + inset; x <= hx1 - inset; x++) {
        this.px(x, y, C(y === y0 ? 'clay.sh' : x - (hx0 + inset) < 1 || hx1 - inset - x < 1 ? 'clay.pit' : 'clay.dk'));
      }
    }
    for (let y = wallTop - 15; y < wallTop - 5; y++) for (let x = hx1 - 13; x < hx1 - 8; x++) {
      this.px(x, y, C(y === wallTop - 15 ? 'stone.sh' : x === hx1 - 13 ? 'stone.dk' : 'stone.pit'));
    }

    // the host round the ward's edge on both sides, and the shapeless one at a fence post on the right
    this.feeders = [];
    [[-1, 10], [-1, 27], [-1, 44], [1, 8], [1, 40]].forEach(([side, d], i) => {
      const fx = side < 0 ? cx - R - d - 15 : cx + R + d;
      this.feeders.push({ x: fx, y: gy - 8, flip: side < 0, phase: hash(i, 1, 101) * 6.28 });
    });
    this.blob = { x: cx + R + 22, y: gy - 6 };
    for (let k = 0; k < 9; k++) this.lit(this.blob.x + 7 + Math.floor(k / 4), gy - 1 - k, M.Trunk, k > 6 ? 0 : 1);
  }

  // ---- each frame

  private tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    const t = (now - this.t0) / 1000;
    const step = Math.floor(t * FPS);
    if (step === this.last) return;
    this.last = step;
    this.draw(t);
  };

  private put(x: number, y: number, c: number): void {
    if (c < 0 || x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    this.frame[y * this.W + x] = c;
  }
  /** Draws a sprite, with a one-unit outline of root.0 round it when asked. */
  private sprite(s: Sprite, x: number, y: number, flip = false, outline = false): void {
    const w = s[0].length, h = s.length;
    const at = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && s[j][flip ? w - 1 - i : i] !== '.';
    if (outline) {
      const K = C('root.0');
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        if (!at(i, j) && (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1))) this.put(x + i, y + j, K);
      }
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = s[j][flip ? w - 1 - i : i];
      if (ch !== '.') this.put(x + i, y + j, code(ch));
    }
  }

  draw(t: number): void {
    const { W, H, L } = this;
    const { cx, groundY: gy } = L;
    const f = this.frame;
    f.set(this.base);

    // the hearth's light: a unit or two of flicker, four levels, stopping at the ward's edge
    const lx = cx + 1, ly = gy - 9;
    const reach = R + Math.round(1.2 * Math.sin(t * 7.3) + 0.8 * Math.sin(t * 12.7 + 1) + 0.6 * Math.sin(t * 2.3));
    for (let y = Math.max(0, ly - reach); y < Math.min(H, gy + 12); y++) for (let x = Math.max(0, lx - reach); x < Math.min(W, lx + reach); x++) {
      const i = y * W + x, m = this.mat[i];
      if (!m) continue;
      const d = Math.hypot(x - lx, (y - ly) * 1.3);
      if (d >= reach) continue;
      const under = Math.max(0, y - gy) / 9;
      const v = (1 - d / reach) * 3.4 - under + (bayer(x, y) - 0.5) * 0.7;
      const lv = Math.max(0, Math.min(3, Math.floor(v + 0.55)));
      if (lv) f[i] = TONE_I[m][lv][this.tone[i]];
    }

    // stars that come and go
    for (const [x, y, p] of this.stars) {
      const s = Math.sin(t * 1.3 + p);
      if (s > -0.2) f[y * W + x] = C(s > 0.75 ? 'salt' : s > 0.3 ? 'root.4' : 'root.3');
    }
    // crystal in the stone, catching light that is not there
    for (const [x, y] of this.glints) if (Math.sin(t * 2 + x * 0.7 + y) > 0.9) f[y * W + x] = C('cyan.lt');

    // smoke from the chimney
    for (let k = 0; k < 8; k++) {
      const age = (t * 0.3 + k / 8) % 1;
      const sx = cx + 17 + Math.round(Math.sin(age * 5 + k) * 2 + age * 7), sy = gy - 37 - Math.round(age * 30);
      if (sy >= 0) { this.put(sx, sy, C(age < 0.5 ? 'root.3' : 'root.2')); if (age < 0.35) this.put(sx + 1, sy, C('root.3')); }
    }

    // inside: the stone with its hollow lit under the hand, the pot, the householder
    this.sprite(HEARTHSTONE, cx - 4, gy - 9);
    const hot = Math.sin(t * 9) + Math.sin(t * 5.3) > 0.4;
    this.put(cx - 1, gy - 8, C(hot ? 'ember.hi' : 'ember.lt')); this.put(cx, gy - 8, C(hot ? 'ember.lt' : 'ember'));
    this.sprite(POT, cx + 9, gy - 8);
    this.sprite(HOLDER, cx - 15, gy - 14);

    // the peopls at the edge, facing out
    this.sprite(PEOPL, cx + 52, gy - 16, false, true);
    this.sprite(PEOPL, cx - 61, gy - 16 + (Math.sin(t * 0.9) > 0.85 ? 1 : 0), true, true);

    // the host: crowding the edge, never crossing it, shifting to and fro
    for (const fd of this.feeders) {
      const s = Math.sin(t * 0.55 + fd.phase), moving = Math.abs(Math.cos(t * 0.55 + fd.phase)) > 0.35;
      const stride = moving ? Math.floor(t * 4 + fd.phase) % 2 : 0;
      this.sprite(FEEDER[stride], fd.x + Math.round(3 * s), fd.y, !fd.flip, true);
    }
    // the shapeless one: no lasting outline, a mass round what it is eating
    const bx = this.blob.x, by = this.blob.y, q = Math.floor(t * 6);
    for (let y = -7; y <= 6; y++) for (let x = -8; x <= 8; x++) {
      const a = Math.atan2(y, x);
      const r = 5.6 + 1.4 * Math.sin(a * 3 + q * 0.9) + 0.9 * Math.sin(a * 5 - q * 1.3) + (hash(x, y, q) - 0.5) * 1.2;
      const d = Math.hypot(x, y * 1.35);
      if (d > r || by + y > gy - 1) continue;
      this.put(bx + x + 7, by + y, C(d > r - 1 ? (y < 0 ? 'root.3' : 'root.0') : d > r - 2.5 ? 'root.1' : 'root.0'));
    }

    // something climbing a way now and then
    for (const w of this.ways) {
      const p = ((t + w.phase) % w.period) / w.period;
      if (p > 0.6) continue;
      const k = Math.floor((p / 0.6) * (w.pts.length - 1));
      for (let tail = 0; tail < 5; tail++) {
        const pt = w.pts[k - tail];
        if (pt) this.put(pt[0], pt[1], C(tail === 0 ? 'salt' : tail === 1 ? 'arm.lt' : tail < 4 ? 'arm' : 'arm.dk'));
      }
    }

    // the title mark over the sky
    if (this.mark) {
      const m = TITLE_MARK, ox = cx - Math.floor(m.w / 2), oy = L.markY;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const c = m.cells[y * m.w + x];
        if (c >= 0) this.put(ox + x, oy + y, c);
      }
    }

    const d = this.img.data;
    for (let i = 0; i < f.length; i++) {
      const rgb = RGB[f[i]], o = i * 4;
      d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}
