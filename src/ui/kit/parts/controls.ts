import { CHECK, HANDLE } from '../art/controls';
import { measure } from '../font/measure';
import type { Live, Node, Ui } from '../node';
import type { Surface } from '../surface';
import { type Force, type Host, hostHi, lv, ring, sunk } from './common';

export interface FieldOpts {
  id: string;
  x: number; y: number; w: number;
  /** 14 in a window, 16 in a full-screen menu. */
  h?: 14 | 16;
  value: string;
  placeholder?: string;
  limit?: number;
  allow?: RegExp;
  password?: boolean;
  host: Host;
  /** Pins a look for the sheet: focused (with its caret), a selection, or refused. */
  show?: { focus?: boolean; select?: [number, number]; refused?: boolean };
  onText?: (v: string) => void;
  ui: Ui;
}

/** A password's characters: a 3 by 3 dot each, at the pitch of a narrow glyph. */
function dots(s: Surface, n: number, x: number, y: number): number {
  for (let i = 0; i < n; i++) s.fill(x + i * 4, y + 4, 3, 3, 'salt');
  return n ? n * 4 - 1 : 0;
}

/**
 * A text field (5.9): sunk and dark with the edges of a well; the text's cell at 4, 2 (4, 3 when 16 tall) in salt with
 * its shadow. With focus, a frame of salt inside its edges and a caret one unit wide and 10 tall that blinks each 0.5 s.
 */
export function field(o: FieldOpts): Node {
  const h = o.h ?? 14, w = o.w;
  const ty = h === 16 ? 3 : 2;
  return {
    id: o.id, x: o.x, y: o.y, w, h,
    focus: true,
    field: { value: o.value, limit: o.limit, allow: o.allow, password: o.password, textX: 4 },
    on: { text: (st) => { o.onText?.(st.value); o.ui.wake(); } },
    paint: (s) => {
      const st = o.ui.field(o.id);
      const focused = o.show?.focus || o.ui.focused() === o.id;
      const value = st?.value ?? o.value;
      const refused = o.show?.refused || (st ? o.ui.t - st.refusedAt < 0.3 : false);
      sunk(s, 0, 0, w, h, o.host);
      if (refused) ring(s, 1, 1, w - 2, h - 2, 'blood');
      else if (focused) ring(s, 1, 1, w - 2, h - 2, 'salt');
      if (!value && !focused) { if (o.placeholder) s.text(o.placeholder, 4, ty, 'root.4'); return; }
      const sel = o.show?.select ?? (st ? [st.start, st.end] as [number, number] : [value.length, value.length] as [number, number]);
      const before = (i: number) => (o.password ? (i ? i * 4 : 0) : i ? measure(value.slice(0, i)) + 1 : 0);
      // The text scrolls so that the caret stays inside the field.
      const room = w - 8;
      const caretAt = before(sel[1]);
      const scroll = Math.max(0, caretAt - room + 1);
      s.clip(2, 2, w - 4, h - 4);
      if (sel[0] !== sel[1]) {
        const a = Math.min(sel[0], sel[1]), b = Math.max(sel[0], sel[1]);
        s.fill(4 + before(a) - scroll, ty, Math.max(1, before(b) - before(a) - 1), 10, 'arm.dk');
      }
      if (o.password) dots(s, value.length, 4 - scroll, ty);
      else s.text(value, 4 - scroll, ty, 'salt', true);
      if (st?.compose) {
        const [a, b] = st.compose;
        s.fill(4 + before(a) - scroll, ty + 9, Math.max(1, before(b) - before(a) - 1), 1, 'salt');
      }
      const on = o.show?.focus ? true : Math.floor(o.ui.t * 2) % 2 === 0;
      if (focused && on) s.fill(4 + caretAt - scroll, ty, 1, 10, 'salt');
      s.unclip();
    },
    anim: o.ui.focused() === o.id,
  };
}

export interface CheckOpts {
  id: string;
  x: number; y: number;
  on: boolean;
  label?: string;
  host: Host;
  force?: Force;
  onToggle?: (on: boolean) => void;
}

/** A checkbox (5.10): 12 by 12 with the edges of a well, the check in salt at 2, 3; its label in ink at x + 15, y + 1. */
export function checkbox(o: CheckOpts): Node {
  const lw = o.label ? measure(o.label) : 0;
  const w = o.label ? 15 + lw : 12;
  const dark = o.host === 'dark' || o.host === 'ground';
  return {
    id: o.id, x: o.x, y: o.y, w, h: 12,
    focus: true, takes: true,
    on: { click: () => o.onToggle?.(!o.on) },
    paint: (s, live) => {
      const l = lv(live, o.force);
      sunk(s, 0, 0, 12, 12, o.host);
      if (l.hover || l.focus) ring(s, 1, 1, 10, 10, 'salt');
      if (o.on) s.map(CHECK, 2, 3);
      if (o.label) s.text(o.label, 15, 1, dark ? 'salt' : 'ink', dark);
    },
  };
}

export interface SliderOpts {
  id: string;
  x: number; y: number; w: number;
  /** 0 to 1. */
  value: number;
  /** How many steps the setting has; the value snaps to the nearest. */
  steps?: number;
  host: Host;
  force?: Force;
  onChange?: (v: number) => void;
  ui: Ui;
}

/**
 * A slider (5.11): a row 14 tall, a groove 6 tall at y 4 with `root.4` from its left end to the handle, and a handle of
 * 7 by 14 in dressed stone that moves by whole units.
 */
export function slider(o: SliderOpts): Node {
  const w = o.w, stops = w - 7;
  const snap = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return o.steps ? Math.round(c * o.steps) / o.steps : c;
  };
  const hx = Math.round(snap(o.value) * stops);
  const set = (x: number) => { o.onChange?.(snap((x - 3) / stops)); o.ui.invalidate(); };
  return {
    id: o.id, x: o.x, y: o.y, w, h: 14,
    focus: true, takes: true,
    on: {
      down: (e) => set(e.x),
      drag: (e) => { if (e.phase !== 'end') set(e.x); },
      key: (e) => {
        const step = o.steps ? 1 / o.steps : 1 / stops;
        if (e.key === 'ArrowLeft') { o.onChange?.(snap(o.value - step)); o.ui.invalidate(); return true; }
        if (e.key === 'ArrowRight') { o.onChange?.(snap(o.value + step)); o.ui.invalidate(); return true; }
      },
    },
    paint: (s, live) => {
      const l = lv(live, o.force);
      s.fill(0, 4, w - 1, 1, 'root.0');
      s.fill(0, 5, 1, 4, 'root.0');
      s.fill(1, 9, w - 1, 1, hostHi(o.host));
      s.fill(w - 1, 5, 1, 4, hostHi(o.host));
      s.fill(1, 5, w - 2, 4, 'root.1');
      if (hx > 1) s.fill(1, 5, hx - 1, 4, 'root.4');
      s.map(HANDLE, hx, 0);
      if (l.hover || l.down || l.focus) {
        s.fill(hx + 1, 0, 5, 1, 'salt'); s.fill(hx + 1, 13, 5, 1, 'salt');
        s.fill(hx, 1, 1, 12, 'salt'); s.fill(hx + 6, 1, 1, 12, 'salt');
      }
    },
  };
}
