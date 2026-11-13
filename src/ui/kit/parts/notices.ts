import { FRAMED_PLATE } from '../art/slab';
import { SMALL } from '../font/face';
import { centreX, clock, measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Node } from '../node';
import type { Colour } from '../palette';
import { paintStrip } from './hud';
import { paintSlot } from './slot';

const REST = { hover: false, down: false, focus: false, t: 0 };

/** The light tone of a frame, which a toast's first line and a banner's take. */
export function frameText(frame: Colour): Colour {
  switch (frame) {
    case 'growth': return 'growth.lt';
    case 'blood': return 'blood.lt';
    case 'arm': return 'arm.lt';
    case 'root.4': return 'salt';
    default: return frame;
  }
}

export const TOAST_W = 160;
export const TOAST_H = 32;
export const TOAST_PITCH = 34;

export interface ToastOpts {
  x: number; y: number;
  /** `growth` for a step of the Guide, a grade's frame for a thing found, `blood` for a warning, `root.4` otherwise. */
  frame: Colour;
  icon?: string;
  title: string;
  line?: string;
  /** Units still to slide in from the right; the toast is cut by the stage's edge, not faded. */
  slide?: number;
}

/** A toast (5.17): a framed dark plate 160 by 32, a dark slot at 6, 7, its first line at 30, 5, its second at 30, 16. */
export function toast(o: ToastOpts): Node {
  const dx = o.slide ?? 0;
  return {
    x: o.x + dx, y: o.y, w: TOAST_W, h: TOAST_H,
    paint: (s) => {
      s.nine(FRAMED_PLATE, 0, 0, TOAST_W, TOAST_H, { tint: o.frame });
      s.translate(6, 7);
      paintSlot(s, { ramp: 'dark', stack: o.icon ? { icon: o.icon, n: 1 } : null }, REST);
      s.translate(-6, -7);
      s.text(cut(o.title, TOAST_W - 36), 30, 5, frameText(o.frame), true);
      if (o.line) s.text(cut(o.line, TOAST_W - 36), 30, 16, 'root.4', true);
    },
  };
}

export interface BossOpts {
  x: number; y: number;
  name: string;
  f: number;
  /** Where the animal changes, as fractions of its life: two ticks of salt above and below the strip. */
  marks?: number[];
  /** The part just lost, still lit in `ember.lt`. */
  was?: number;
  /** A world event's strip of the time left: thin, in `blood` or `violet.lt`. */
  event?: 'blood' | 'violet';
}

const BOSS_W = 182;

/** The boss bar (5.18): 182 wide, the name centred at y 0, the strip at y 13 in ten segments; nothing else on its lines. */
export function bossBar(o: BossOpts): Node {
  const thin = !!o.event;
  return {
    x: o.x, y: o.y, w: BOSS_W, h: 22,
    paint: (s) => {
      const t = cut(o.name, BOSS_W);
      s.text(t, centreX(t, 0, BOSS_W), 0, 'salt', true);
      const tones: [Colour, Colour, Colour] = o.event === 'violet' ? ['violet.lt', 'violet.lt', 'violet.dk'] : ['blood.lt', 'blood', 'blood.dk'];
      paintStrip(s, { x: 0, y: 0, w: BOSS_W, f: o.f, was: o.was, tones, segments: 10, thin }, 0, 13);
      const h = thin ? 5 : 7;
      for (const m of o.marks ?? []) {
        const x = 1 + Math.round(m * (BOSS_W - 2));
        s.fill(x, 11, 1, 2, 'salt');
        s.fill(x, 13 + h, 1, 2, 'salt');
      }
    },
  };
}

export interface StatusOpts { x: number; y: number; icon: string; good: boolean; seconds: number }

/** A status frame (5.18): a dark plate 18 by 18 framed in growth or blood, the time left under it in the small face. */
export function statusFrame(o: StatusOpts): Node {
  return {
    x: o.x, y: o.y, w: 18, h: 26,
    paint: (s) => {
      s.nine(FRAMED_PLATE, 0, 0, 18, 18, { tint: o.good ? 'growth' : 'blood' });
      s.icon(o.icon, 1, 1);
      const t = clock(o.seconds);
      s.text(t, centreX(t, 0, 18, SMALL), 20, o.seconds <= 10 ? 'blood.lt' : 'salt', false, SMALL);
    },
  };
}

export interface BannerOpts { x: number; y: number; frame: Colour; title: string; line?: string; /** The first line's colour when it means something other than the frame. */ colour?: Colour }

export function bannerWidth(o: Pick<BannerOpts, 'title' | 'line'>): number {
  return Math.max(measure(o.title), o.line ? measure(o.line) : 0) + 10;
}

/** A banner (5.28): a framed dark plate 24 tall, as wide as its longer line plus 10; the first line in the frame's colour. */
export function banner(o: BannerOpts): Node {
  const w = bannerWidth(o);
  return {
    x: o.x, y: o.y, w, h: 24,
    paint: (s) => {
      s.nine(FRAMED_PLATE, 0, 0, w, 24, { tint: o.frame });
      s.text(o.title, 5, 2, o.colour ?? frameText(o.frame), true);
      if (o.line) s.text(o.line, 5, 12, 'root.4', true);
    },
  };
}
