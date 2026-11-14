// What the play screens share: the dimmed world under a window, slots wired to the mock's hand, the pack block every
// container repeats, labels, and a clock that stands still while a script photographs the page.
import type { SilhouetteName } from '../../art/silhouettes';
import { SMALL, TEXT } from '../../font/face';
import { measure, rightX } from '../../font/measure';
import { cut } from '../../font/wrap';
import type { DragEv, Live, Node, PointerEv, Tip, TipLine, Ui } from '../../node';
import { type Colour, type Ramp, tone } from '../../palette';
import type { PixelMap } from '../../pixmap';
import { button } from '../../parts/button';
import { type SlotMark, paintSlot } from '../../parts/slot';
import { heldStack } from '../../root';
import { centred } from '../../scale';
import { type Stack, stackTip, thing } from '../../sample/play-items';
import type { Hand, Place } from './hand';

/**
 * A browser driven by a script (the shot and grid scripts) reports itself; there every moving part stands at a fixed
 * phase so that the frame photographed is the frame the grid check paints.
 */
export const STILL = typeof navigator !== 'undefined' && navigator.webdriver === true;

/** Where a repeating motion of `period` seconds stands at time t, 0 to 1; `still` while a script photographs. */
export function cycle(t: number, period: number, still: number): number { return STILL ? still : (t % period) / period; }

/** Seconds since a thing began, or `still` while a script photographs. */
export function since(t: number, t0: number, still: number): number { return STILL ? still : t - t0; }

// ---- text

/** Ink on a light face, no shadow. */
export function ink(x: number, y: number, text: string, c: Colour = 'ink', w?: number): Node {
  const t = w ? cut(text, w) : text;
  return { x, y, w: Math.max(1, w ?? measure(t)), h: TEXT.height, paint: (s) => { s.text(t, 0, 0, c); } };
}

/** Salt or a meaning colour with its shadow, on dark or on the world. */
export function lit(x: number, y: number, text: string, c: Colour = 'salt', w?: number): Node {
  const t = w ? cut(text, w) : text;
  return { x, y, w: Math.max(1, (w ?? measure(t)) + 1), h: TEXT.height + 1, paint: (s) => { s.text(t, 0, 0, c, true); } };
}

/** Ink right-aligned so that its last column is `right`. */
export function inkRight(right: number, y: number, text: string, c: Colour = 'ink', face = TEXT): Node {
  const w = Math.max(1, measure(text, face));
  return { x: rightX(text, right, face), y, w, h: face.height, paint: (s) => { s.text(text, 0, 0, c, false, face); } };
}

export function smallInk(x: number, y: number, text: string, c: Colour = 'ink.faded'): Node {
  return { x, y, w: Math.max(1, measure(text, SMALL)), h: SMALL.height, paint: (s) => { s.text(text, 0, 0, c, false, SMALL); } };
}

/** A cut line sunk in a slab (5.13's rule for sunk shapes): `pit` above, `hi` below. */
export function cutLine(x: number, y: number, w: number, ramp: Ramp, h = 2): Node {
  return { x, y, w, h, paint: (s) => { s.fill(0, 0, w, 1, tones[ramp].pit); s.fill(0, h - 1, w, 1, tones[ramp].hi); } };
}

const tones: Record<Ramp, { hi: Colour; pit: Colour; sh: Colour; dk: Colour; face: Colour }> = {
  clay: { hi: 'salt', pit: 'clay.pit', sh: 'clay.sh', dk: 'clay.dk', face: 'clay.face' },
  timber: { hi: 'timber.hi', pit: 'timber.pit', sh: 'timber.sh', dk: 'timber.dk', face: 'timber.face' },
  stone: { hi: 'stone.hi', pit: 'stone.pit', sh: 'stone.sh', dk: 'stone.dk', face: 'stone.face' },
};

// ---- the screen

export interface Window { x: number; y: number; w: number; h: number }

/**
 * The whole screen under a window: the world dimmed by one flat wash, a press on it dropping what the hand holds,
 * and a stop that keeps a press on the slabs' faces from reaching it.
 */
export function overWorld(ui: Ui, win: Window, kids: Node[], o: { dim?: boolean; outside?: (e: PointerEv) => void } = {}): Node {
  return {
    x: 0, y: 0, w: ui.w, h: ui.h,
    takes: true,
    on: { down: (e) => o.outside?.(e) },
    paint: (s) => { if (o.dim !== false) s.wash(0, 0, ui.w, ui.h, 'root.0', 2); },
    kids: [
      { x: win.x, y: win.y, w: win.w, h: win.h, takes: true },
      { x: win.x, y: win.y, w: win.w, h: win.h, kids },
    ],
  };
}

/** Where a window of w by h stands: centred, and never nearer an edge than 3 (tabs above it counted in `top`). */
export function place(ui: Ui, w: number, h: number, top = 0): Window {
  const at = centred(ui.w, ui.h, w, h);
  return { x: Math.max(3, at.x), y: Math.max(3 + top, at.y), w, h };
}

// ---- slots wired to the hand

/** What every slot of a screen shares: the hand, the root, and when each slot was last refused. */
export class Bench {
  refusedAt = new Map<string, number>();
  constructor(public hand: Hand, public ui: Ui) {
    hand.rules.refused = (p) => this.refuse(`${p.store}.${p.i}`);
  }

  refuse(id: string): void {
    this.refusedAt.set(id, this.ui.t);
    this.ui.cue('refuse');
    this.ui.invalidate();
    setTimeout(() => this.ui.invalidate(), 320);
  }

  refused(id: string): boolean {
    const at = this.refusedAt.get(id);
    return at !== undefined && this.ui.t - at < 0.3;
  }

  /** After the hand changed: the held stack follows the pointer, and the screen is built again. */
  after(): void {
    const h = this.hand.held;
    this.ui.held = h ? heldStack(thing(h.key).icon, h.n) : null;
    this.ui.invalidate();
  }
}

export interface StackSlotOpts {
  x: number; y: number;
  ramp: Ramp | 'dark';
  silhouette?: SilhouetteName;
  /** A silhouette that is not one of the nine. */
  silMap?: PixelMap;
  /** A thing that is missing: its icon's silhouette. */
  missing?: string;
  large?: boolean;
  /** Shows the frame of growth while the hand holds a stack this slot takes. */
  showAccepts?: boolean;
  /** The last line of the tooltip; the take line when not given. */
  hint?: string;
  extra?: TipLine[];
  /** A press the screen handles itself (a result, a locked place); return true to stop the hand's own. */
  press?(e: PointerEv): boolean;
  /** What the slot shows in place of its store's stack: a result. */
  show?: Stack | null;
  /** Draws the slot as locked, showing what is built into it. */
  locked?: Stack | null;
  mark?: SlotMark;
  tip?: (live: Live) => Tip | null;
}

/** A slot of a store, wired to the hand by the table of section 7. */
export function stackSlot(b: Bench, p: Place, o: StackSlotOpts): Node {
  const id = `${p.store}.${p.i}`;
  const h = b.hand;
  const stack = o.show !== undefined ? o.show : o.locked !== undefined ? o.locked : h.get(p);
  const accepts = !!o.showAccepts && !!h.held && h.takes(p, h.held);
  const mark: SlotMark | undefined = b.refused(id) ? 'refused' : o.mark ?? (o.locked !== undefined ? 'locked' : accepts ? 'accepts' : undefined);
  const size = o.large ? 26 : 18;
  return {
    id, x: o.x, y: o.y, w: size, h: size,
    focus: true, takes: true,
    anim: b.refused(id),
    paint: (s, live) => {
      paintSlot(s, {
        ramp: o.ramp, large: o.large, mark,
        stack: stack ? { icon: thing(stack.key).icon, n: stack.n } : null,
        silhouette: o.silhouette, missing: stack ? undefined : o.missing,
      }, live);
      if (!stack && o.silMap && o.ramp !== 'dark') s.draw(o.silMap, o.large ? 5 : 1, o.large ? 5 : 1, { flat: tone(o.ramp, live.hover ? 'face' : 'sh') });
    },
    tip: o.tip ?? (() => (stack ? stackTip(stack, o.hint ?? (o.locked !== undefined ? 'none' : 'slot'), o.extra) : null)),
    on: {
      down: (e) => {
        if (o.press?.(e)) { b.after(); return; }
        if (o.locked !== undefined) { b.refuse(id); return; }
        if (e.button === 0) h.left(p, e.shift, e.double);
        else if (e.button === 2) h.right(p);
        b.ui.cue(h.held ? 'take' : 'put');
        b.after();
      },
      pass: (e) => { if (e.button === 2 && o.locked === undefined && o.show === undefined) { h.pass(p); b.after(); } },
      drop: (e: DragEv) => { if (e.button === 0 && o.locked === undefined && o.show === undefined) { h.drop(p); b.after(); } },
      key: (k) => {
        if (o.locked !== undefined || o.show !== undefined) return false;
        if (/^[1-9]$/.test(k.key)) { h.swapWithBar(p, Number(k.key) - 1); b.after(); return true; }
        if (k.key === 'q' || k.key === 'Q') { h.dropFrom(p, k.ctrl); b.after(); return true; }
        return false;
      },
    },
  };
}

export interface GridSpec {
  store: string;
  x: number; y: number;
  cols: number; rows: number;
  ramp: Ramp | 'dark';
  /** The index in the store of the grid's first slot. */
  from?: number;
  each?: (i: number) => Partial<StackSlotOpts>;
}

/** Slots of a store in a grid with no gap between them. */
export function stackGrid(b: Bench, g: GridSpec): Node {
  const kids: Node[] = [];
  for (let i = 0; i < g.cols * g.rows; i++) {
    const at = { store: g.store, i: (g.from ?? 0) + i };
    kids.push(stackSlot(b, at, { x: (i % g.cols) * 18, y: Math.floor(i / g.cols) * 18, ramp: g.ramp, ...g.each?.(i) }));
  }
  return { x: g.x, y: g.y, w: g.cols * 18, h: g.rows * 18, kids };
}

/** A small button of the title row or the pack row: 12 tall, as wide as asked. */
export function small(id: string, x: number, y: number, w: number, label: string, onPress: () => void, ramp: Ramp, h = 12): Node {
  return button({ id, x, y, w, h, label, onPress, ramp });
}

/**
 * The pack under a container's own slots: "Pack" at 8, `labelY`, its "Sort pack" button ending at 168, `labelY - 3`, the
 * nine by three at 8, `slotsY` and the hotbar row four units below it. The button names its grid: over a chest two
 * buttons both called "Sort" were told apart only by where they stood.
 */
export function packBlock(b: Bench, ramp: Ramp, labelY: number, slotsY: number, o: { sort?: boolean; each?: (store: string, i: number) => Partial<StackSlotOpts> } = {}): Node[] {
  const out: Node[] = [ink(8, labelY, 'Pack')];
  const sortW = measure('Sort pack') + 10;
  if (o.sort !== false) out.push(small('pack.sort', 168 - sortW, labelY - 3, sortW, 'Sort pack', () => { b.hand.sort('pack'); b.after(); }, ramp));
  out.push(stackGrid(b, { store: 'pack', x: 8, y: slotsY, cols: 9, rows: 3, ramp, each: o.each ? (i) => o.each!('pack', i) : undefined }));
  out.push(stackGrid(b, { store: 'bar', x: 8, y: slotsY + 58, cols: 9, rows: 1, ramp, each: o.each ? (i) => o.each!('bar', i) : undefined }));
  return out;
}
