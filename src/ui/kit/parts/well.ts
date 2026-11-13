import { count, rightX } from '../font/measure';
import { cut } from '../font/wrap';
import type { Live, Node, Tip, Ui } from '../node';
import { type Colour, type Ramp, tone } from '../palette';
import type { Surface } from '../surface';
import { type Force, type Host, lv, ring, sunk } from './common';

export const ROW_H = 18;
export const TRACK_W = 6;
const THUMB_MIN = 12;

export interface RowSpec {
  id: string;
  icon?: string;
  name: string;
  /** A grade's colour or salt. */
  colour?: Colour;
  /** Right-aligned 3 from the row's right end. */
  num?: number | string;
  numColour?: Colour;
  disabled?: boolean;
  force?: Force;
  tip?: (live: Live) => Tip | null;
  /** Paints what the row holds in place of the icon, name and number, over the floor and frame the well draws. */
  body?: (s: Surface, w: number, h: number, live: Live) => void;
}

/** Paints one row of a list on the well's floor (5.8). */
export function paintRow(s: Surface, r: RowSpec, w: number, live: Live, chosen: boolean, h = ROW_H): void {
  if (chosen) { s.fill(0, 0, w, h, 'root.3'); ring(s, 0, 0, w, h, 'salt'); }
  else if (live.hover && !r.disabled) s.fill(0, 0, w, h, 'root.2');
  if (live.focus && !chosen) ring(s, 0, 0, w, h, 'salt');
  if (r.body) { r.body(s, w, h, live); return; }
  const off = r.disabled;
  if (r.icon) s.icon(r.icon, 1, 1, off ? 'flat' : 'full', 'root.4');
  let right = w - 3;
  if (r.num !== undefined) {
    const t = typeof r.num === 'number' ? count(r.num) : r.num;
    const x = rightX(t, right);
    s.text(t, x, 4, off ? 'root.4' : r.numColour ?? 'salt', true);
    right = x - 5;
  }
  s.text(cut(r.name, right - 20 + 1), 20, 4, off ? 'root.4' : r.colour ?? 'salt', true);
}

export interface WellOpts {
  id: string;
  x: number; y: number; w: number; h: number;
  host: Host;
  rows: RowSpec[];
  chosen?: number;
  onChoose?: (i: number) => void;
  /** Pins the thumb's hover, for the sheet. */
  thumbForce?: Force;
  /** Rows taller than 18, for rows of two lines (the worlds' 36). */
  rowH?: number;
  /** A second press on a row, or Enter on the chosen one. */
  onUse?: (i: number) => void;
  /** Said in the well, grey, when it holds no rows. */
  empty?: string;
  ui: Ui;
}

/**
 * A list in a well (5.8): sunk, `root.0` along the top and left, the host's light edge along the bottom and right, a
 * floor of `root.1`, rows 18 tall moved by whole rows, and a scroll track of the floor's last 6 units when they do not fit.
 */
export function well(o: WellOpts): Node {
  const fw = o.w - 2, fh = o.h - 2;
  const RH = o.rowH ?? ROW_H;
  const fits = o.rows.length * RH <= fh;
  const rowW = fits ? fw : fw - TRACK_W;
  const visible = Math.floor(fh / RH);
  const maxTop = Math.max(0, o.rows.length - visible);
  const top = Math.min(maxTop, Math.max(0, o.ui.scroll(o.id)));
  const setTop = (v: number) => { o.ui.setScroll(o.id, Math.min(maxTop, Math.max(0, v))); o.ui.invalidate(); };
  const kids: Node[] = o.rows.map((r, i): Node => ({
    id: r.id, x: 1, y: 1 + (i - top) * RH, w: rowW, h: RH,
    takes: true, focus: !r.disabled,
    paint: (s, live) => paintRow(s, r, rowW, lv(live, r.force), i === o.chosen, RH),
    tip: r.tip,
    on: r.disabled ? undefined : {
      down: (e) => { if (e.double || (i === o.chosen && o.onUse)) o.onUse?.(i); else o.onChoose?.(i); },
      wheel: (e) => { setTop(top + e.notches); return true; },
      key: (e) => {
        if (e.key === 'Enter' && o.onUse) { o.onUse(i); return true; }
        // Up and Down choose within the list and keep the chosen row inside the well.
        const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (!d || !o.onChoose) return;
        const j = Math.min(o.rows.length - 1, Math.max(0, i + d));
        if (j < top) setTop(j); else if (j >= top + visible) setTop(j - visible + 1);
        o.onChoose(j);
        o.ui.focusOn(o.rows[j].id, true);
        return true;
      },
    },
  }));
  if (!o.rows.length && o.empty) {
    const t = o.empty;
    kids.push({ x: 1, y: 1, w: fw, h: Math.min(fh, RH), paint: (s) => s.text(cut(t, fw - 8), 4, Math.floor((Math.min(fh, RH) - 9) / 2), 'root.4', true) });
  }
  if (!fits) {
    const trackH = fh;
    const thumbH = Math.max(THUMB_MIN, Math.floor((trackH * visible) / o.rows.length));
    const thumbY = maxTop ? Math.round(((trackH - thumbH) * top) / maxTop) : 0;
    let dragFrom = top;
    kids.push({
      id: `${o.id}.track`, x: 1 + rowW, y: 1, w: TRACK_W, h: trackH, takes: true,
      paint: (s, live) => {
        const l = lv(live, o.thumbForce);
        s.fill(0, 0, TRACK_W, trackH, 'root.0');
        paintThumb(s, 0, thumbY, thumbH, l.hover || l.down);
      },
      on: {
        down: (e) => { dragFrom = top; if (e.y < thumbY) setTop(top - visible); else if (e.y >= thumbY + thumbH) setTop(top + visible); },
        drag: (e) => { if (e.phase !== 'end' && trackH > thumbH) setTop(dragFrom + Math.round((e.dy * maxTop) / (trackH - thumbH))); },
        wheel: (e) => { setTop(top + e.notches); return true; },
      },
    });
  }
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h: o.h,
    paint: (s) => sunk(s, 0, 0, o.w, o.h, o.host),
    kids: [{ x: 1, y: 1, w: fw, h: fh, clip: true, kids: kids.map((k) => ({ ...k, x: k.x - 1, y: k.y - 1 })) }],
  };
}

/** The thumb (5.8): `root.3` with a top row of `root.4`, a bottom row of `root.2`, three grip rows of `root.1` at its middle. */
export function paintThumb(s: Surface, x: number, y: number, h: number, hot: boolean): void {
  s.fill(x, y, TRACK_W, h, hot ? 'root.4' : 'root.3');
  s.fill(x, y, TRACK_W, 1, hot ? 'salt' : 'root.4');
  s.fill(x, y + h - 1, TRACK_W, 1, 'root.2');
  const m = Math.floor(h / 2);
  for (const g of [m - 2, m, m + 2]) s.fill(x + 1, y + g, TRACK_W - 2, 1, 'root.1');
}

/**
 * Where rows of controls scroll on a slab and not in a well (settings): a channel sunk in the slab, 6 wide with its
 * rim and a floor of `dk`, whose thumb is the slider's handle, 6 wide and never shorter than 12 (5.8).
 */
export function slabTrack(o: { id: string; x: number; y: number; h: number; ramp: Ramp; top: number; visible: number; total: number; force?: Force; onScroll?: (top: number) => void }): Node {
  const h = o.h, inner = h - 2;
  const maxTop = Math.max(0, o.total - o.visible);
  const thumbH = Math.max(THUMB_MIN, Math.floor((inner * o.visible) / Math.max(1, o.total)));
  const thumbY = 1 + (maxTop ? Math.round(((inner - thumbH) * Math.min(o.top, maxTop)) / maxTop) : 0);
  return {
    id: o.id, x: o.x, y: o.y, w: TRACK_W, h, takes: true,
    on: { down: (e) => { if (e.y < thumbY) o.onScroll?.(o.top - o.visible); else if (e.y >= thumbY + thumbH) o.onScroll?.(o.top + o.visible); } },
    paint: (s, live) => {
      const l = lv(live, o.force);
      const pit = tone(o.ramp, 'pit'), hi = tone(o.ramp, 'hi');
      s.fill(1, 0, TRACK_W - 2, 1, pit); s.fill(0, 1, 1, h - 2, pit);
      s.fill(1, h - 1, TRACK_W - 2, 1, hi); s.fill(TRACK_W - 1, 1, 1, h - 2, hi);
      s.fill(1, 1, TRACK_W - 2, h - 2, tone(o.ramp, 'dk'));
      // The handle of 5.11 at the track's width: outline, a top row of stone.lt, stone.sh with a grip, two rows of stone.dk.
      const y = thumbY - 1, th = thumbH + 2;
      const edge = l.hover || l.down ? 'salt' : 'root.0';
      s.fill(1, y, TRACK_W - 2, 1, edge); s.fill(1, y + th - 1, TRACK_W - 2, 1, edge);
      s.fill(0, y + 1, 1, th - 2, edge); s.fill(TRACK_W - 1, y + 1, 1, th - 2, edge);
      s.fill(1, y + 1, TRACK_W - 2, 1, 'stone.lt');
      s.fill(1, y + 2, TRACK_W - 2, th - 5, 'stone.sh');
      s.fill(1, y + th - 3, TRACK_W - 2, 2, 'stone.dk');
      s.fill(2, y + 4, 1, th - 9, 'stone.dk');
    },
  };
}

/** A well that frames something other than a list: the figure, a picture, a field, a chart. */
export function frameWell(o: { x: number; y: number; w: number; h: number; host: Host; floor?: Colour; kids?: Node[] }): Node {
  return {
    x: o.x, y: o.y, w: o.w, h: o.h,
    paint: (s) => sunk(s, 0, 0, o.w, o.h, o.host, o.floor),
    kids: o.kids ? [{ x: 1, y: 1, w: o.w - 2, h: o.h - 2, clip: true, kids: o.kids }] : undefined,
  };
}
