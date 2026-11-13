import { SILHOUETTES, type SilhouetteName } from '../art/silhouettes';
import { DARK_SLOT, LARGE_SLOT_SIZE, SLOT, SLOT_SIZE } from '../art/slot';
import { SMALL } from '../font/face';
import { rightX } from '../font/measure';
import type { Handlers, Live, Node, Tip } from '../node';
import { type Colour, type Ramp, tone } from '../palette';
import type { Surface } from '../surface';
import { type Force, lv, ring } from './common';

export interface Stack { icon: string; n: number }

/**
 * What a slot is showing besides its stack: `accepts` the held stack (a frame of growth), `refused` a click (blood, for
 * 0.3 s), `chosen` (salt: the hotbar cell in hand), `locked` (a floor of face: a thing built in that takes nothing).
 */
export type SlotMark = 'accepts' | 'refused' | 'chosen' | 'locked';

export interface SlotOpts {
  id?: string;
  x: number; y: number;
  /** The ramp of the slab it is sunk in, or `dark` for a slot on a dark plate. */
  ramp: Ramp | 'dark';
  stack?: Stack | null;
  mark?: SlotMark;
  /** What belongs in it, shown while it is empty (5.5). */
  silhouette?: SilhouetteName;
  /** A thing that is missing: its icon drawn as a silhouette in one flat tone. */
  missing?: string;
  /** The large slot of a station's result, 26 by 26. */
  large?: boolean;
  force?: Force;
  tip?: (live: Live) => Tip | null;
  on?: Partial<Handlers>;
}

/**
 * The stack count (5.4), inside the floor with its shadow: its last column on `right` and its lowest row on `bottom`, so
 * that the shadow falls on the floor and never on the light edge, where salt digits would run into the bright rim. Two
 * digits are the text face; three no longer fit 15 units in it and take the small face, as does a count of a thousand
 * or more, written in thousands ("1k", "12k") so that it is never more than three glyphs. 1 is not written.
 */
export function paintCount(s: Surface, n: number, right: number, bottom: number, c: Colour = 'salt'): void {
  if (n <= 1) return;
  const whole = Math.trunc(n);
  const t = whole >= 1000 ? `${Math.min(999, Math.floor(whole / 1000))}k` : String(whole);
  if (t.length < 3 && whole < 1000) s.text(t, rightX(t, right), bottom - 7, c, true);
  else s.text(t, rightX(t, right, SMALL), bottom - 4, c, true, SMALL);
}

const FRAME: Record<Exclude<SlotMark, 'locked'>, Colour> = { accepts: 'growth', refused: 'blood', chosen: 'salt' };

/** Paints a slot at 0, 0 of the surface's origin. */
export function paintSlot(s: Surface, o: Omit<SlotOpts, 'x' | 'y'>, live: Live): void {
  const size = o.large ? LARGE_SLOT_SIZE : SLOT_SIZE;
  const f = size - 2;
  const dark = o.ramp === 'dark';
  const ramp = dark ? 'clay' : o.ramp as Ramp;
  if (dark) s.nine(DARK_SLOT, 0, 0, size, size);
  else s.nine(SLOT, 0, 0, size, size, ramp);
  if (o.mark === 'locked') s.fill(1, 1, f, f, dark ? 'root.2' : tone(ramp, 'face'));
  else if (live.hover) s.fill(1, 1, f, f, dark ? 'root.2' : tone(ramp, 'sh'));
  if (o.mark && o.mark !== 'locked') ring(s, 1, 1, f, f, FRAME[o.mark]);
  else if (live.focus) ring(s, 1, 1, f, f, 'salt');
  const at = o.large ? 5 : 1;
  const sil: Colour = dark ? 'root.3' : tone(ramp, live.hover ? 'face' : 'sh');
  if (o.stack) {
    s.icon(o.stack.icon, at, at);
    paintCount(s, o.stack.n, size - 3, size - 3);
  } else if (o.missing) s.icon(o.missing, at, at, 'flat', sil);
  else if (o.silhouette) s.draw(SILHOUETTES[o.silhouette], at, at, { flat: sil });
}

/** A slot (5.4): 18 by 18 holding a 16 by 16 icon at 1, 1, sunk in its slab or on a dark plate. */
export function slot(o: SlotOpts): Node {
  const size = o.large ? LARGE_SLOT_SIZE : SLOT_SIZE;
  return {
    id: o.id, x: o.x, y: o.y, w: size, h: size,
    focus: !!o.on,
    takes: true,
    paint: (s, live) => paintSlot(s, o, lv(live, o.force)),
    tip: o.tip,
    on: o.on,
  };
}

export interface GridOpts {
  id: string;
  x: number; y: number;
  cols: number; rows: number;
  ramp: Ramp | 'dark';
  /** The slot at index i, counted along rows. */
  at(i: number): Omit<SlotOpts, 'x' | 'y' | 'ramp' | 'id'>;
}

/** Slots in a grid with no gap between them (5.4): nine of them are 162 wide. */
export function slotGrid(o: GridOpts): Node {
  const kids: Node[] = [];
  for (let i = 0; i < o.cols * o.rows; i++) {
    kids.push(slot({ ...o.at(i), id: `${o.id}.${i}`, ramp: o.ramp, x: (i % o.cols) * SLOT_SIZE, y: Math.floor(i / o.cols) * SLOT_SIZE }));
  }
  return { x: o.x, y: o.y, w: o.cols * SLOT_SIZE, h: o.rows * SLOT_SIZE, kids };
}
