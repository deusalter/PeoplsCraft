// The body as worn, drawn front on in a well: the player's own face (art/heads.ts), a tunic and trousers of their own
// when bare, and over them each piece that is worn in its material's tones, so the picture changes as armour changes.
// Every limb is lit from the top left: its left column in the lit tone, its right column in the shade, a root.0 split
// between the legs, and the whole outlined in root.0. Under the feet lies a course of the ground tile with a shadow on it.
import { GROUND } from '../../art/ground';
import { seatFace } from '../../art/heads';
import type { Node } from '../../node';
import { type Colour, CODE, COLOURS } from '../../palette';
import { type PixelMap, coded } from '../../pixmap';

export type Part = 'head' | 'body' | 'legs';

/** The tones of a worn piece: lit, mid, shade. `BARE` stands for nothing worn there. */
export type Tones = [Colour, Colour, Colour];
export const BARE: Tones = ['root.3', 'root.2', 'root.2'];

const TUNIC: Tones = ['timber.lt', 'timber.face', 'timber.sh'];
const TROUSERS: Tones = ['clay.sh', 'clay.dk', 'clay.pit'];
const BOOTS: Tones = ['timber.sh', 'timber.dk', 'timber.pit'];

/** The measures of the body at its two sizes: the pack's well and the states panel's. */
interface Plan { head: number; wide: boolean; torsoW: number; torsoH: number; armW: number; legW: number; legH: number; boot: number; hands: number; helm: number }
const PLANS: Record<'small' | 'large', Plan> = {
  small: { head: 8, wide: false, torsoW: 8, torsoH: 12, armW: 4, legW: 4, legH: 12, boot: 3, hands: 2, helm: 3 },
  large: { head: 10, wide: true, torsoW: 12, torsoH: 20, armW: 6, legW: 6, legH: 22, boot: 5, hands: 3, helm: 4 },
};

function size(p: Plan): { w: number; h: number } {
  return { w: p.torsoW + 2 * p.armW + 2, h: p.head + p.torsoH + p.legH + 2 };
}

const cache = new Map<string, PixelMap>();
const code = (c: Colour) => CODE[COLOURS.indexOf(c)];
const worn = (t: Tones) => t !== BARE && t.join() !== BARE.join();

/** Fills a limb lit from the left: its left column lit, its right column in shade. */
function limb(g: (Colour | null)[][], x: number, y: number, w: number, h: number, t: Tones): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = i === x ? t[0] : i === x + w - 1 ? t[2] : t[1];
}

/** The figure's pixel map with each worn piece in its tones and the seat's face. */
export function figureMap(sz: 'small' | 'large', tones: Record<Part, Tones>, seat = 1): PixelMap {
  const key = `${sz}|${seat}|${tones.head}|${tones.body}|${tones.legs}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = PLANS[sz];
  const { w, h } = size(p);
  const g: (Colour | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));
  const ox = 1, oy = 1;
  const tx = ox + p.armW, hx = tx + Math.floor((p.torsoW - p.head) / 2);
  const face = seatFace(seat, p.wide);
  face.rows.forEach((r, j) => r.forEach((c, i) => { if (c) g[oy + j][hx + i] = c; }));
  if (worn(tones.head)) {
    const t = tones.head;
    for (let j = 0; j < p.helm; j++) for (let i = 0; i < p.head; i++) g[oy + j][hx + i] = j === 0 || i === 0 ? t[0] : j === p.helm - 1 || i === p.head - 1 ? t[2] : t[1];
    for (let j = p.helm; j < p.helm + 3; j++) { g[oy + j][hx] = t[0]; g[oy + j][hx + p.head - 1] = t[2]; }
  }
  const ty = oy + p.head;
  const chest = worn(tones.body) ? tones.body : TUNIC;
  limb(g, tx, ty, p.torsoW, p.torsoH, chest);
  for (const ax of [ox, tx + p.torsoW]) {
    limb(g, ax, ty, p.armW, p.torsoH - p.hands, chest);
    limb(g, ax, ty + p.torsoH - p.hands, p.armW, p.hands, face.skin as Tones);
  }
  const ly = ty + p.torsoH;
  const legs = worn(tones.legs) ? tones.legs : TROUSERS;
  for (const lx of [tx, tx + p.torsoW - p.legW]) {
    limb(g, lx, ly, p.legW, p.legH - p.boot, legs);
    limb(g, lx, ly + p.legH - p.boot, p.legW, p.boot, BOOTS);
  }
  for (let j = ly + 2; j < ly + p.legH; j++) g[j][tx + p.legW - 1] = 'root.0';
  const rows = g.map((r) => r.map((c) => (c ? code(c) : '.')));
  const filled = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && g[y][x] !== null && g[y][x] !== 'root.0';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== null) continue;
    if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) rows[y][x] = code('root.0');
  }
  const m = coded(rows.map((r) => r.join('')), `figure.${key}`);
  cache.set(key, m);
  return m;
}

export function figure(x: number, y: number, sz: 'small' | 'large', tones: Record<Part, Tones>, seat = 1): Node {
  const m = figureMap(sz, tones, seat);
  return { x, y, w: m.w, h: m.h, paint: (s) => s.map(m, 0, 0) };
}

/** The ground the figure stands on, across a well's inner width: one course of the ground tile, a shadow 10 wide under the feet at `cx`. */
export function floor(x: number, y: number, w: number, h: number, cx: number): Node {
  return { x, y, w, h, paint: (s) => { s.tile(GROUND, 0, 0, w, h, 3, 0); s.fill(cx - x - 5, 0, 10, 1, 'root.1'); } };
}

export const FIGURE_SIZE = { small: size(PLANS.small), large: size(PLANS.large) };
