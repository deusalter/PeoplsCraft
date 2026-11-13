import { CROSSHAIR, type PipKind, PIPS } from '../art/hud';
import type { Node } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
import { paintSlot, type Stack } from './slot';

export const PIP = 9;
export const PIP_PITCH = 8;
export const PIP_ROW = 81;

export type PipLook = 'full' | 'half' | 'empty';

/** Pip i of ten (counted from the end the row fills from) for a measure: full at i + 0.75, half at i + 0.25 (5.15). */
export function pipLook(i: number, now: number, max: number): PipLook {
  const v = max > 0 ? (10 * now) / max : 0;
  if (v >= i + 0.75) return 'full';
  if (v >= i + 0.25 || (i === 0 && now > 0)) return 'half';
  return 'empty';
}

/** One pip; a half is the full pip's lit five columns beside the empty pip's rest, mirrored for the rows that fill from the right. */
export function paintPip(s: Surface, kind: PipKind, look: PipLook, x: number, y: number, mirror = false): void {
  const p = PIPS[kind];
  if (look !== 'half') { s.map(look === 'full' ? p.full : p.empty, x, y); return; }
  s.map(p.empty, x, y);
  // A half bowl holds no heap: its fill starts under the rim.
  const top = 'halfFrom' in p ? p.halfFrom : 0;
  s.clip(mirror ? x + 4 : x, y + top, 5, PIP - top);
  s.map(p.full, x, y);
  s.unclip();
}

export interface PipsOpts {
  x: number; y: number;
  kind: PipKind;
  now: number; max: number;
  /** The hunger and arm rows are right-aligned and fill from the right. */
  fromRight?: boolean;
  /** Each pip moves one unit up or down, changing every fourth frame: life at a quarter, hunger at 4 or less. */
  shake?: boolean;
  /** One pip at a time stands one unit higher, the raised place moving along the row once a second: life mending. */
  mending?: boolean;
  /** A fixed phase for the sheet, in place of the clock. */
  phase?: number;
}

/** A row of ten pips at a pitch of 8, 81 wide (5.15). */
export function pips(o: PipsOpts): Node {
  return {
    x: o.x, y: o.y - 1, w: PIP_ROW, h: PIP + 2,
    anim: (o.shake || o.mending) && o.phase === undefined,
    paint: (s, live) => {
      const frame = o.phase ?? Math.floor(live.t * 60);
      for (let i = 0; i < 10; i++) {
        const look = pipLook(i, o.now, o.max);
        const slot = o.fromRight ? 9 - i : i;
        let dy = 1;
        if (o.shake) dy += (((Math.floor(frame / 4) * 7 + i * 13) >> 1) & 1) ? -1 : 1;
        else if (o.mending && Math.floor(frame / 6) % 10 === i) dy -= 1;
        paintPip(s, o.kind, look, slot * PIP_PITCH, dy, !!o.fromRight);
      }
    },
  };
}

export interface StripOpts {
  x: number; y: number; w: number;
  f: number;
  /** The lit tones, light first: the strip's lt, mid and dk. */
  tones: [Colour, Colour, Colour];
  segments: number;
  /** The part just lost, still lit in `ember.lt`: the fraction it reached before the drop. */
  was?: number;
  /** The thin strip is 5 tall with three rows; the strip 7 tall with five. */
  thin?: boolean;
}

/**
 * A strip (5.15): outline, then the lit rows (`lt`, the mid tone, `dk`) filling from the left by whole units, unlit
 * `root.2`, divided evenly by segment lines of `root.0`.
 */
export function strip(o: StripOpts): Node {
  const h = o.thin ? 5 : 7;
  return {
    x: o.x, y: o.y, w: o.w, h,
    paint: (s) => paintStrip(s, o, 0, 0),
  };
}

export function paintStrip(s: Surface, o: StripOpts, x: number, y: number): void {
  const w = o.w, h = o.thin ? 5 : 7, inner = w - 2, rows = h - 2;
  s.fill(x + 1, y, w - 2, 1, 'root.0');
  s.fill(x + 1, y + h - 1, w - 2, 1, 'root.0');
  s.fill(x, y + 1, 1, rows, 'root.0');
  s.fill(x + w - 1, y + 1, 1, rows, 'root.0');
  s.fill(x + 1, y + 1, inner, rows, 'root.2');
  if (!o.thin) s.fill(x + 1, y + 1, inner, 1, 'root.1');
  const n = Math.round(Math.min(1, Math.max(0, o.f)) * inner);
  const was = o.was !== undefined ? Math.round(Math.min(1, Math.max(0, o.was)) * inner) : n;
  if (was > n) s.fill(x + 1 + n, y + 1, was - n, rows, 'ember.lt');
  if (n) {
    s.fill(x + 1, y + 1, n, 1, o.tones[0]);
    s.fill(x + 1, y + 2, n, rows - 2, o.tones[1]);
    s.fill(x + 1, y + h - 2, n, 1, o.tones[2]);
  }
  for (let k = 1; k < o.segments; k++) s.fill(x + 1 + Math.round((k * inner) / o.segments) - 1, y + 1, 1, rows, 'root.0');
}

export interface HotbarOpts {
  x: number; y: number;
  cells: (Stack | null)[];
  chosen: number;
  /** For a cell that is cooling, the share of its time still to run. */
  cooling?: (number | undefined)[];
}

/**
 * The hotbar (5.16): a plain dark plate 182 by 22 holding nine dark slots at x 2 + 20i, y 2, and the selector of 24 by
 * 24 at x -1 + 20i, y -1, which overhangs the plate by one unit above and below.
 */
export function hotbar(o: HotbarOpts): Node {
  return {
    x: o.x, y: o.y, w: 182, h: 22,
    paint: (s) => {
      s.fill(1, 0, 180, 1, 'root.0');
      s.fill(1, 21, 180, 1, 'root.0');
      s.fill(0, 1, 1, 20, 'root.0');
      s.fill(181, 1, 1, 20, 'root.0');
      s.fill(1, 1, 180, 20, 'root.1');
      s.fill(1, 1, 180, 1, 'root.3');
      s.fill(1, 2, 1, 19, 'root.3');
      for (let i = 0; i < 9; i++) {
        s.translate(2 + 20 * i, 2);
        paintSlot(s, { ramp: 'dark', stack: o.cells[i] ?? null }, { hover: false, down: false, focus: false, t: 0 });
        const c = o.cooling?.[i];
        if (c && c > 0) s.wash(1, 1, 16, Math.max(1, Math.ceil(c * 16)), 'root.0', 2);
        s.translate(-(2 + 20 * i), -2);
      }
      paintSelector(s, -1 + 20 * o.chosen, -1, 24);
    },
  };
}

/**
 * The selector (5.16): an outline whose corners are cut at two units, two rings of salt (the inner one `clay.lt` along
 * its bottom and right), then a ring of `root.0` round the icon.
 */
export function paintSelector(s: Surface, x: number, y: number, n: number): void {
  s.fill(x + 1, y, n - 2, 1, 'root.0');
  s.fill(x + 1, y + n - 1, n - 2, 1, 'root.0');
  s.fill(x, y + 1, 1, n - 2, 'root.0');
  s.fill(x + n - 1, y + 1, 1, n - 2, 'root.0');
  for (const [cx, cy] of [[1, 1], [n - 2, 1], [1, n - 2], [n - 2, n - 2]]) s.fill(x + cx, y + cy, 1, 1, 'root.0');
  s.fill(x + 2, y + 1, n - 4, 1, 'salt');
  s.fill(x + 2, y + n - 2, n - 4, 1, 'salt');
  s.fill(x + 1, y + 2, 1, n - 4, 'salt');
  s.fill(x + n - 2, y + 2, 1, n - 4, 'salt');
  s.fill(x + 2, y + 2, n - 5, 1, 'salt');
  s.fill(x + 2, y + 3, 1, n - 6, 'salt');
  s.fill(x + 2, y + n - 3, n - 4, 1, 'clay.lt');
  s.fill(x + n - 3, y + 2, 1, n - 5, 'clay.lt');
  s.fill(x + 3, y + 3, n - 6, 1, 'root.0');
  s.fill(x + 3, y + n - 4, n - 6, 1, 'root.0');
  s.fill(x + 3, y + 4, 1, n - 8, 'root.0');
  s.fill(x + n - 4, y + 4, 1, n - 8, 'root.0');
}

export type HitLook = 'none' | 'hit' | 'crit';

/** Four diagonal ticks of the crosshair's weight, for 0.14 s after a hit. */
function paintTicks(s: Surface, x: number, y: number, c: Colour): void {
  const tick = (cx: number, cy: number, dx: number, dy: number) => {
    for (let k = 0; k < 2; k++) s.fill(cx + dx * k - 1, cy + dy * k - 1, 3, 3, 'root.0');
    for (let k = 0; k < 2; k++) s.fill(cx + dx * k, cy + dy * k, 1, 1, c);
  };
  tick(x + 1, y + 1, 1, 1);
  tick(x + 7, y + 1, -1, 1);
  tick(x + 1, y + 7, 1, -1);
  tick(x + 7, y + 7, -1, -1);
}

/** The crosshair (5.28), 9 by 9; a hit turns it into four diagonal ticks, in `ember.hi` for a critical hit. */
export function crosshair(o: { x: number; y: number; hit?: HitLook }): Node {
  return {
    x: o.x, y: o.y, w: 9, h: 9,
    paint: (s) => {
      if (!o.hit || o.hit === 'none') s.map(CROSSHAIR, 0, 0);
      else paintTicks(s, 0, 0, o.hit === 'crit' ? 'ember.hi' : 'salt');
    },
  };
}
