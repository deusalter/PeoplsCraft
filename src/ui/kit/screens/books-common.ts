// What the screens of the books set share on the kit page: going from one mock screen to another as the game would.
import { rightX } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { Live, Node, Ui } from '../node';
import { type Colour, SEATS } from '../palette';
import { ring } from '../parts/common';
import type { Surface } from '../surface';

/** Opens another mock screen on the kit page, keeping its scale and strict mode, as a press in the game would. */
export function go(name: string): void {
  if (typeof location === 'undefined') return;
  const p = new URLSearchParams(location.search);
  p.set('screen', name);
  location.search = p.toString();
}

/** Focus drawn on one part when a screen first opens, as its table's "First" line asks. */
export function firstFocus(ui: Ui, key: string, id: string | null): void {
  if (opened.has(key)) return;
  opened.add(key);
  ui.focusOn(id, true);
}
const opened = new Set<string>();

/**
 * The focus put in a drawn field when a screen first opens, its text selected if asked. A field's state exists only
 * once the tree holding it has been placed, so this waits for the build under way to finish.
 */
export function firstFieldFocus(ui: Ui, key: string, id: string, selectAll: boolean): void {
  if (opened.has(key)) return;
  opened.add(key);
  setTimeout(() => {
    const st = ui.field(id);
    if (st && selectAll) { st.start = 0; st.end = st.value.length; }
    ui.focusOn(id, true);
    ui.invalidate();
  }, 0);
}

/** Text wrapped in a box on a page or a slab, in one colour, cut with `…` after its last line. */
export function para(x: number, y: number, w: number, text: string, c: Colour, lines = Infinity): Node {
  const b = box(text, w, lines);
  return { x, y, w, h: Math.max(1, b.h), paint: (s) => { for (const l of b.lines) s.text(l.text, 0, l.y, c); } };
}

/** One line of ink on a light face, cut with `…` to its width, or right-aligned to its right end. */
export function inkLine(x: number, y: number, w: number, text: string, c: Colour = 'ink', right = false): Node {
  const t = cut(text, w);
  return { x, y, w, h: 10, paint: (s) => { s.text(t, right ? rightX(t, w - 1) : 0, 0, c); } };
}

/**
 * A row of a list written on a page: hovered, its floor is `clay.face`; chosen, `clay.sh`. It is chosen on the press,
 * and Up and Down move the choice when it has the focus.
 */
export function pageRow(o: { id: string; x: number; y: number; w: number; h: number; chosen: boolean; onChoose: () => void; paint: (s: Surface, live: Live) => void }): Node {
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, takes: true, focus: true,
    on: { down: o.onChoose },
    paint: (s, live) => {
      if (o.chosen) s.fill(0, 0, o.w, o.h, 'clay.sh');
      else if (live.hover) s.fill(0, 0, o.w, o.h, 'clay.face');
      if (live.focus) ring(s, 0, 0, o.w, o.h, 'salt');
      o.paint(s, live);
    },
  };
}

/** A player's colour on a light face: a flag 2 by 7 beside their name in ink. */
export function flag(s: Surface, seat: number, x: number, y: number): void { s.fill(x, y, 2, 7, SEATS[seat - 1]); }
