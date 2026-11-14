import type { Colour } from '../palette';

// The face of a menu button (5.6): a course of dressed stone blocks, `stone.sh`, set so that the label is cut into one
// block of its own. A joint is one unit of `stone.dk` down the face. From the label's block the joints step out every
// 40 units, and stop where the block left at the end would be shorter than 16. A groove with a lit far wall in
// `stone.face`, every 25, read as a fence of bright posts.
// Each block carries a few pebbles in the two grits, placed by a hash of the button so no two buttons are alike: 1 by 1,
// 2 by 1 (lit unit first) or 2 by 2 (`grit.lt` on its top left unit, `grit.dk` on its bottom right), no two within 5
// units, none within 3 of the label or 2 of a joint; and one crack of three units of `grit.dk` somewhere on the face.

export type Mark = [x: number, y: number, c: Colour];

/** Where the joints stand, from the button's left, for a face whose label is drawn from tx and tw wide. */
export function joints(w: number, tx: number, tw: number): number[] {
  const out: number[] = [];
  if (tw <= 0) return out;
  const fits = (x: number) => x >= 18 && x <= w - 20;
  for (let x = tx - 7; fits(x); x -= 40) out.push(x);
  for (let x = tx + tw + 6; fits(x); x += 40) out.push(x);
  return out.sort((a, b) => a - b);
}

function rng(seed: number): () => number {
  let h = seed >>> 0 || 1;
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}

/** A hash of a label and a width, to seed a button's pebbles. */
export function seedOf(label: string, w: number): number {
  let h = 2166136261 ^ w;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return h >>> 0;
}

const cache = new Map<string, Mark[]>();

/**
 * The marks on the face of a button w by h (h of 20 or more) whose label stands at tx, ty, tw wide: the joints, then
 * the pebbles and the crack. Coordinates are from the button's top left; the face is x 2 to w - 4, y 2 to h - 4.
 */
export function ashlar(w: number, h: number, tx: number, ty: number, tw: number, seed: number): Mark[] {
  const key = `${w},${h},${tx},${ty},${tw},${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const marks: Mark[] = [];
  const x0 = 2, x1 = w - 4, y0 = 2, y1 = h - 4;
  const js = joints(w, tx, tw);
  for (const j of js) for (let y = y0; y <= y1; y++) marks.push([j, y, 'stone.dk']);
  const r = rng(seed);
  const clearOfLabel = (x: number, y: number, pw: number, ph: number) =>
    tw <= 0 || x + pw - 1 < tx - 3 || x > tx + tw + 2 || y + ph - 1 < ty - 3 || y > ty + 12;
  const clearOfJoints = (x: number, pw: number) => js.every((j) => x + pw - 1 < j - 2 || x > j + 2);
  const placed: [number, number][] = [];
  const far = (x: number, y: number) => placed.every(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) >= 5);
  const want = Math.max(2, Math.round(((x1 - x0 + 1) / 40) * (5 + r() * 2)));
  for (let tries = 0; placed.length < want && tries < 400; tries++) {
    const kind = Math.floor(r() * 3);
    const pw = kind === 0 ? 1 : 2, ph = kind === 2 ? 2 : 1;
    const x = x0 + Math.floor(r() * (x1 - x0 + 2 - pw)), y = y0 + Math.floor(r() * (y1 - y0 + 2 - ph));
    if (!clearOfLabel(x, y, pw, ph) || !clearOfJoints(x, pw) || !far(x, y)) continue;
    placed.push([x, y]);
    if (kind === 0) marks.push([x, y, r() < 0.5 ? 'grit.lt' : 'grit.dk']);
    else if (kind === 1) { marks.push([x, y, 'grit.lt']); marks.push([x + 1, y, 'grit.dk']); }
    else { marks.push([x, y, 'grit.lt']); marks.push([x + 1, y + 1, 'grit.dk']); }
  }
  for (let tries = 0; tries < 400; tries++) {
    const x = x0 + Math.floor(r() * (x1 - x0 - 1)), y = y0 + Math.floor(r() * (y1 - y0 - 1));
    if (!clearOfLabel(x, y, 2, 3) || !clearOfJoints(x, 2) || !far(x, y)) continue;
    marks.push([x, y, 'grit.dk'], [x, y + 1, 'grit.dk'], [x + 1, y + 2, 'grit.dk']);
    break;
  }
  cache.set(key, marks);
  return marks;
}
