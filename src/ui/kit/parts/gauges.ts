import { ARROW, ARROW_FILL, FLAME, FLAME_FILL } from '../art/gauges';
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

/**
 * The burn gauge (5.14): a hollow in the shape of a flame, 13 by 15, showing the fuel left. It empties from the top:
 * the two highest lit rows `ember.hi`, the lowest three `ember`, `ember.lt` between.
 */
export function burnGauge(o: FlameOpts): Node {
  return {
    x: o.x, y: o.y, w: 13, h: 15,
    paint: (s) => {
      s.map(FLAME, 0, 0, o.ramp);
      // The hollow's rows run from 1 to 13.
      const n = lit(o.f, 13);
      if (!n) return;
      const top = 14 - n;
      const band = (y0: number, y1: number, c: Colour) => {
        const a = Math.max(y0, top), b = y1;
        if (b <= a) return;
        s.clip(0, a, 13, b - a); s.draw(FLAME_FILL, 0, 0, { flat: c }); s.unclip();
      };
      band(top, Math.min(14, top + 2), 'ember.hi');
      band(top + 2, 11, 'ember.lt');
      band(Math.max(top + 2, 11), 14, 'ember');
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
