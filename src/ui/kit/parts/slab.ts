import { DRESSING_CELL, LONG_PEBBLE, PEBBLE, FRAMED_PLATE, NAMED_PLATE, PLATE, SLAB, cellHash } from '../art/slab';
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

/** How far a pebble stands from every part, every line of text and the slab's edges. */
const CLEAR = 3;

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
 * The pebbles of a stone face (5.1): the face is cut into cells of 24, and each cell holds one pebble or none, round or
 * long, at a place of its own within it, so that there is no row, column or rhythm to read. A pebble is set only where
 * all of it stands 3 clear of every part, every line of text and the slab's edges. Specks of one and two units over
 * the whole face, touching titles and slots, read as noise laid on for texture.
 */
function dress(s: Surface, w: number, h: number, keep: number[][]): void {
  const fx = 3, fy = 3, fw = w - 6, fh = h - 6, C = DRESSING_CELL;
  const clear = (x: number, y: number) =>
    x >= fx + CLEAR && y >= fy + CLEAR && x < fx + fw - CLEAR && y < fy + fh - CLEAR &&
    keep.every(([rx, ry, rw, rh]) => x < rx - CLEAR || y < ry - CLEAR || x >= rx + rw + CLEAR || y >= ry + rh + CLEAR);
  const roles = { 1: 'hi', 2: 'lt', 4: 'sh' } as const;
  for (let j = 0; j * C < fh; j++) for (let i = 0; i * C < fw; i++) {
    const r = cellHash(i, j, 0);
    if (r % 100 >= 60) continue;
    const m = (r >>> 8) % 3 === 0 ? LONG_PEBBLE : PEBBLE;
    const mw = m[0].length, mh = m.length;
    const mx = fx + i * C + ((r >>> 12) % (C - mw)), my = fy + j * C + ((r >>> 20) % (C - mh));
    if (!(clear(mx, my) && clear(mx + mw - 1, my) && clear(mx, my + mh - 1) && clear(mx + mw - 1, my + mh - 1))) continue;
    m.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '.') s.fill(mx + dx, my + dy, 1, 1, tone('stone', roles[ch as '1' | '2' | '4']));
    }));
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
        // The title's whole row stays bare: a pebble beside a title read as a speck stuck to it.
        const keep: number[][] = title ? [[0, 6, w, 10]] : [];
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
