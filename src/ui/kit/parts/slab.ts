import { FRAMED_PLATE, NAMED_PLATE, PLATE, SLAB } from '../art/slab';
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

/** A window slab (5.1) of clay, timber or stone, with its title (5.3); every face is flat. */
export function slab(o: SlabOpts): Node {
  const { w, h, ramp } = o;
  const title = o.title ? cut(o.title, w - 16 - (o.titleRoom ?? 0)) : '';
  const node: Node = {
    id: o.id, x: o.x, y: o.y, w, h,
    paint: (s) => {
      s.nine(SLAB, 0, 0, w, h, ramp);
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
