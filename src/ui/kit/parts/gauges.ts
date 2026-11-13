import { ARROW, ARROW_FILL, FLAME, FLAME_ROWS } from '../art/gauges';
import type { Node } from '../node';
import { type Colour, type Ramp, tone } from '../palette';

/** How many of `n` units are lit at a fraction: whole units, never a lit unit for nothing nor a dark one for all. */
export function lit(f: number, n: number): number {
  const c = Math.min(1, Math.max(0, f));
  return c >= 1 ? n : Math.floor(c * n);
}

export interface ArrowOpts { x: number; y: number; f: number; ramp: Ramp; colour?: Colour }

/** The progress arrow (5.13): a hollow 22 by 15 that fills from the left a column at a time, in ember (arm at the Line Frame). */
export function progressArrow(o: ArrowOpts): Node {
  return {
    x: o.x, y: o.y, w: 22, h: 15,
    paint: (s) => {
      s.map(ARROW, 0, 0, o.ramp);
      // The hollow's columns run from 1 to 20.
      const n = lit(o.f, 20);
      if (n) { s.clip(1, 0, n, 15); s.draw(ARROW_FILL, 0, 0, { flat: o.colour ?? 'ember' }); s.unclip(); }
    },
  };
}

export interface FlameOpts { x: number; y: number; f: number; ramp: Ramp }

/** The inner tongue of the flame, by row from row 4: its first and last column. */
const CORE: Record<number, readonly [number, number]> = { 4: [6, 6], 5: [6, 6], 6: [5, 6], 7: [5, 6], 8: [4, 6], 9: [4, 7], 10: [4, 7], 11: [5, 7] };

/**
 * The burn gauge (5.14): a hollow in the shape of a flame, 13 by 15, showing the fuel left. It empties from the top by
 * whole rows, and its fill has the form of a flame lit from within rather than bands: `ember` on the body, `ember.dk`
 * on the right unit of each row and along the bottom row, an inner tongue of `ember.lt` that widens toward the base,
 * and `ember.hi` only at the tip: the top two units of the flame when it is full, else the tongue's highest lit row.
 */
export function burnGauge(o: FlameOpts): Node {
  return {
    x: o.x, y: o.y, w: 13, h: 15,
    paint: (s) => {
      s.map(FLAME, 0, 0, o.ramp);
      const n = lit(o.f, 13);
      if (!n) return;
      const top = 14 - n;
      const tongueTop = Math.max(4, top);
      for (let y = top; y <= 13; y++) {
        const [a, b] = FLAME_ROWS[y - 1];
        const core = CORE[y];
        for (let x = a; x <= b; x++) {
          let c: Colour = 'ember';
          if (y <= 2 && x === 6) c = 'ember.hi';
          else if (y === 13 || x === b) c = 'ember.dk';
          else if (core && x >= core[0] && x <= core[1]) c = y === tongueTop && top > 2 ? 'ember.hi' : 'ember.lt';
          s.fill(x, y, 1, 1, c);
        }
      }
    },
  };
}

export interface ChannelOpts { x: number; y: number; len: number; f: number; ramp: Ramp; colour?: Colour; upright?: boolean }

/**
 * A channel sunk in the slab (5.14): upright, 6 wide, filling from the bottom; or lying, 7 tall, filling from the left.
 * Its rim is `pit` above and left and `hi` below and right, with its corners left out.
 */
export function channel(o: ChannelOpts): Node {
  const up = !!o.upright;
  const w = up ? 6 : o.len, h = up ? o.len : 7;
  return {
    x: o.x, y: o.y, w, h,
    paint: (s) => {
      const pit = tone(o.ramp, 'pit'), hi = tone(o.ramp, 'hi');
      s.fill(1, 0, w - 2, 1, pit);
      s.fill(0, 1, 1, h - 2, pit);
      s.fill(1, h - 1, w - 2, 1, hi);
      s.fill(w - 1, 1, 1, h - 2, hi);
      s.fill(1, 1, w - 2, h - 2, tone(o.ramp, 'dk'));
      const c = o.colour ?? 'ember';
      if (up) { const n = lit(o.f, h - 2); if (n) s.fill(1, h - 1 - n, w - 2, n, c); }
      else { const n = lit(o.f, w - 2); if (n) s.fill(1, 1, n, h - 2, c); }
    },
  };
}
