import { FRAMED_PLATE, HARM_PLATE } from '../art/slab';
import { SMALL_SHADOWED } from '../font/face';
import { centreX, clock, measure } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { Node } from '../node';
import { type Colour, GRADES } from '../palette';
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
/** The gap between two toasts in the column. */
export const TOAST_GAP = 2;
/** The most toasts shown at once; the rest wait their turn. */
export const TOAST_MOST = 1;
const TOAST_TEXT = TOAST_W - 30 - 6;

export interface ToastOpts {
  x: number; y: number;
  /** What kind it is: `growth` a step of the Guide, a grade's frame a thing found, `blood` a warning, `root.4` else. */
  frame: Colour;
  icon?: string;
  title: string;
  line?: string;
  /** Units still to slide in from the right; the toast is cut by the stage's edge, not faded. */
  slide?: number;
}

/** The title's tone on the clay face, for each kind of toast: the light-face tone of what its frame meant on dark. */
export function toastTitle(frame: Colour): Colour {
  switch (frame) {
    case 'growth': case 'growth.lt': return 'growth.dk';
    case 'blood': case 'blood.lt': return 'blood.dk';
    case 'arm': case 'arm.lt': return 'arm.dk';
    case 'root.4': return 'ink';
    default: return GRADES.find((g) => g.frame === frame)?.light ?? 'ink';
  }
}

/** A toast's height: 32, or 42 when its second line wraps onto a third. */
export function toastHeight(o: Pick<ToastOpts, 'line'>): number {
  return o.line && box(o.line, TOAST_TEXT, 2).lines.length > 1 ? TOAST_H + 10 : TOAST_H;
}

/**
 * A toast (5.17): a small clay slab 160 wide handed in from the right, opaque, with the outline cut at its corners, a
 * light edge one deep on the top and left and a dark edge two deep on the bottom and right. The icon stands on the
 * face at 8, 8; the title in its kind's tone at 30, 7; the second line in ink at 30, 18, wrapping onto a third.
 */
export function toast(o: ToastOpts): Node {
  const dx = o.slide ?? 0;
  const h = toastHeight(o);
  const w = TOAST_W;
  return {
    x: o.x + dx, y: o.y, w, h,
    paint: (s) => {
      s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, h - 1, w - 2, 1, 'root.0');
      s.fill(0, 1, 1, h - 2, 'root.0'); s.fill(w - 1, 1, 1, h - 2, 'root.0');
      s.fill(1, 1, w - 2, h - 2, 'clay.face');
      s.fill(1, 1, w - 3, 1, 'salt'); s.fill(1, 2, 1, h - 4, 'salt');
      s.fill(2, h - 3, w - 3, 1, 'clay.sh'); s.fill(w - 3, 2, 1, h - 4, 'clay.sh');
      s.fill(1, h - 2, w - 2, 1, 'clay.pit'); s.fill(w - 2, 1, 1, h - 2, 'clay.pit');
      if (o.icon) s.icon(o.icon, 8, 8);
      s.text(cut(o.title, TOAST_TEXT), 30, 7, toastTitle(o.frame));
      if (o.line) for (const l of box(o.line, TOAST_TEXT, 2).lines) s.text(l.text, 30, 18 + l.y, 'ink');
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

/** Whether a timer in its last ten seconds is lit: on for half a second, off for half, held lit for the first three. */
export const blinkOn = (t: number): boolean => t < 3 || Math.floor(t * 2) % 2 === 0;

/**
 * A status frame (5.18): a dark plate 18 by 18 framed in growth for a help, or in blood with its frame's corners cut
 * for a harm, the time left under it in the small face, blinking in blood.lt for the last ten seconds.
 */
export function statusFrame(o: StatusOpts): Node {
  const last = o.seconds <= 10;
  return {
    x: o.x, y: o.y, w: 18, h: 26, anim: last || undefined,
    paint: (s, live) => {
      s.nine(o.good ? FRAMED_PLATE : HARM_PLATE, 0, 0, 18, 18, { tint: o.good ? 'growth' : 'blood' });
      s.icon(o.icon, 1, 1);
      if (last && !blinkOn(live.t)) return;
      const t = clock(o.seconds);
      s.text(t, centreX(t, 0, 18, SMALL_SHADOWED), 20, last ? 'blood.lt' : 'salt', true, SMALL_SHADOWED);
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
      // A descender's shadow would fall on the frame: the text is held inside it.
      s.clip(2, 2, w - 4, 20);
      s.text(o.title, 5, 2, o.colour ?? frameText(o.frame), true);
      if (o.line) s.text(o.line, 5, 12, 'root.4', true);
      s.unclip();
    },
  };
}
