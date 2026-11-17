// What the screens of the books set share on the kit page: going from one mock screen to another as the game would.
export { flag, pageRow } from '../parts/book';
import { WHERE_MARK } from '../art/marks';
import { rightX } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { Node, Ui } from '../node';
import type { Colour } from '../palette';

/** Opens another mock screen on the kit page, keeping its scale and strict mode, as a press in the game would. */
export function go(name: string): void {
  if (typeof location === 'undefined') return;
  const p = new URLSearchParams(location.search);
  p.set('screen', name);
  location.search = p.toString();
}

/**
 * The part a screen's table names as "First" takes the focus when the screen first opens, but its frame is not drawn
 * until a key moves it (section 7): a frame on open reads as a hovered button.
 */
export function firstFocus(ui: Ui, key: string, id: string | null): void {
  if (opened.has(key)) return;
  opened.add(key);
  ui.focusOn(id, false);
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

/**
 * Where to go, on a page: the compass mark at the left and the words beside it in ink, wrapped onto a second line
 * rather than cut, since it is the line the crew acts on.
 */
export function whereLine(x: number, y: number, w: number, text: string, lines = 2): Node {
  const b = box(text, w - 12, lines);
  // Straight up or down the compass cannot point: the mark is the arrow the words name.
  const plumb = / (up|down)$/.exec(text)?.[1];
  return {
    x, y, w, h: Math.max(10, b.h),
    paint: (s) => {
      if (plumb) s.text(`{${plumb}}`, 2, 0, 'ink');
      else s.draw(WHERE_MARK, 0, 0, { tint: 'ink' });
      for (const l of b.lines) s.text(l.text, 12, l.y, 'ink');
    },
  };
}

/** One line of ink on a light face, cut with `…` to its width, or right-aligned to its right end. */
export function inkLine(x: number, y: number, w: number, text: string, c: Colour = 'ink', right = false): Node {
  const t = cut(text, w);
  return { x, y, w, h: 10, paint: (s) => { s.text(t, right ? rightX(t, w - 1) : 0, 0, c); } };
}


/**
 * Where a window stands (section 3): centred on the screen, its tabs not counted, then moved as little as it takes for
 * its tabs above (`top`) and to the left (`left`) and its own edges to stand at least 3 units inside the screen.
 */
export function placeWindow(ui: Ui, w: number, h: number, top = 0, left = 0): { x: number; y: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    x: clamp(Math.floor((ui.w - w) / 2), 3 + left, ui.w - 3 - w),
    y: clamp(Math.floor((ui.h - h) / 2), 3 + top, ui.h - 3 - h),
  };
}
