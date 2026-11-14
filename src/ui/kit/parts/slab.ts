import { FRAMED_PLATE, NAMED_PLATE, PLATE, SLAB } from '../art/slab';
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

/** How far a tool mark stands from every part and every line of text. */
const CLEAR = 3;
/** One tool mark to so many units along the top and bottom bands. */
const MARK_PITCH = 24;

/**
 * The rectangles a stone face must keep clear of tool marks, from the slab's top left: every node that paints,
 * and inside a node that holds others, each of them too, since a container may paint less than its box.
 */
function parts(kids: Node[] | undefined, ox: number, oy: number, out: number[][]): void {
  for (const k of kids ?? []) {
    if (k.paint) out.push([ox + k.x, oy + k.y, k.w, k.h]);
    parts(k.kids, ox + k.x, oy + k.y, out);
  }
}

/**
 * The tooling of a stone face (5.1): cuts of 3 by 1 in `sh` at a fixed pitch along the band 6 deep at the top and the
 * bottom, the middle of the face left plain where the work is. Pebbles and specks scattered over the whole face sat
 * beside the slots and read as dust and dead pixels.
 */
function dress(s: Surface, w: number, h: number, keep: number[][]): void {
  const clear = (x: number, y: number) =>
    keep.every(([rx, ry, rw, rh]) => x + 3 <= rx - CLEAR || y < ry - CLEAR || x >= rx + rw + CLEAR || y >= ry + rh + CLEAR);
  const first = 3 + Math.floor(((w - 6) % MARK_PITCH) / 2) + Math.floor(MARK_PITCH / 2) - 2;
  for (let x = first; x + 3 <= w - 6; x += MARK_PITCH) {
    for (const y of [4, h - 5]) if (clear(x, y)) s.fill(x, y, 3, 1, tone('stone', 'sh'));
  }
}

/** A window slab (5.1) of clay, timber or stone, with its title (5.3); stone carries its tool marks. */
export function slab(o: SlabOpts): Node {
  const { w, h, ramp } = o;
  const title = o.title ? cut(o.title, w - 16 - (o.titleRoom ?? 0)) : '';
  const node: Node = {
    id: o.id, x: o.x, y: o.y, w, h,
    paint: (s) => {
      s.nine(SLAB, 0, 0, w, h, ramp);
      if (ramp === 'stone') {
        // Over the title a cut would read as a mark belonging to its letters.
        const keep: number[][] = title ? [[8, 6, measure(title), 10]] : [];
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
