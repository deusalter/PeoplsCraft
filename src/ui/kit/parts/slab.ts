import { CHIP, CUT, DRESSING_CELL, FRAMED_PLATE, NAMED_PLATE, PLATE, SLAB, cellHash } from '../art/slab';
import { measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Node } from '../node';
import { type Colour, type Ramp, tone } from '../palette';
import type { Surface } from '../surface';

export interface SlabOpts {
  id?: string;
  x: number; y: number; w: number; h: number;
  ramp: Ramp;
  /** Ink at 8, 6, sentence case, no shadow, cut before the slab's right edge (5.3). */
  title?: string;
  /** Units at the right of the title row kept for small buttons, so that the title is cut before them. */
  titleRoom?: number;
  kids?: Node[];
}

const CLEAR = 2;

/**
 * The rectangles a stone face must keep clear of chisel marks, from the slab's top left: every node that paints,
 * and inside a node that holds others, each of them too, since a container may paint less than its box.
 */
function parts(kids: Node[] | undefined, ox: number, oy: number, out: number[][]): void {
  for (const k of kids ?? []) {
    if (k.paint) out.push([ox + k.x, oy + k.y, k.w, k.h]);
    parts(k.kids, ox + k.x, oy + k.y, out);
  }
}

/**
 * The chisel marks of a stone face (5.1): the face is cut into cells of 14, and each cell holds one mark or none, a
 * chip or a cut, at a place of its own within it, so that there is no row, column or rhythm to read. A mark is drawn
 * only where all of it stands 2 clear of every part and every line of text.
 */
function dress(s: Surface, w: number, h: number, keep: number[][]): void {
  const fx = 3, fy = 3, fw = w - 6, fh = h - 6, C = DRESSING_CELL;
  const clear = (x: number, y: number) =>
    x >= fx + 1 && y >= fy + 1 && x < fx + fw - 1 && y < fy + fh - 1 &&
    keep.every(([rx, ry, rw, rh]) => x < rx - CLEAR || y < ry - CLEAR || x >= rx + rw + CLEAR || y >= ry + rh + CLEAR);
  for (let j = 0; j * C < fh; j++) for (let i = 0; i * C < fw; i++) {
    const r = cellHash(i, j, 0);
    if (r % 100 >= 55) continue;
    const m = (r >>> 8) % 3 === 0 ? CUT : CHIP;
    const mx = fx + i * C + ((r >>> 12) % (C - 3)), my = fy + j * C + ((r >>> 20) % (C - 2));
    if (!m.every(([dx, dy]) => clear(mx + dx, my + dy))) continue;
    for (const [dx, dy, role] of m) s.fill(mx + dx, my + dy, 1, 1, tone('stone', role));
  }
}

/** A window slab (5.1) of clay, timber or stone, with its title (5.3); stone carries its chisel marks. */
export function slab(o: SlabOpts): Node {
  const { w, h, ramp } = o;
  const title = o.title ? cut(o.title, w - 16 - (o.titleRoom ?? 0)) : '';
  const node: Node = {
    id: o.id, x: o.x, y: o.y, w, h,
    paint: (s) => {
      s.nine(SLAB, 0, 0, w, h, ramp);
      if (ramp === 'stone') {
        const keep: number[][] = title ? [[8, 6, measure(title) + 1, 10]] : [];
        parts(node.kids, 0, 0, keep);
        dress(s, w, h, keep);
      }
      if (title) s.text(title, 8, 6, 'ink');
    },
    kids: o.kids,
  };
  return node;
}

/** A side panel fastened to a main slab: as tall as it, overlapping it by one unit so that they share an outline column. */
export function panelBeside(main: { x: number; y: number; w: number; h: number }, w: number, side: 'right' | 'left', o: Omit<SlabOpts, 'x' | 'y' | 'w' | 'h'>): Node {
  const x = side === 'right' ? main.x + main.w - 1 : main.x - w + 1;
  return slab({ ...o, x, y: main.y, w, h: main.h });
}

export interface PlateOpts {
  id?: string;
  x: number; y: number; w: number; h: number;
  /** A frame one unit deep all round in a colour that means something; the plain plate when not given. */
  frame?: Colour;
  /** The named old thing's second frame of salt. */
  named?: boolean;
  kids?: Node[];
}

/** A dark plate (5.2): the plain one with its light edge on the top and left, or one with a frame that means something. */
export function plate(o: PlateOpts): Node {
  const { w, h } = o;
  return {
    id: o.id, x: o.x, y: o.y, w, h,
    paint: (s) => {
      if (o.named) s.nine(NAMED_PLATE, 0, 0, w, h, { tint: o.frame ?? 'ember.hi' });
      else if (o.frame) s.nine(FRAMED_PLATE, 0, 0, w, h, { tint: o.frame });
      else s.nine(PLATE, 0, 0, w, h);
    },
    kids: o.kids,
  };
}
