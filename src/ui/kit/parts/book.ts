import { PAGE_ARROW, PAGE_ARROW_LEFT } from '../art/book';
import { SMALL } from '../font/face';
import { centreX } from '../font/measure';
import type { Live, Node } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
import { type Force, lv } from './common';

export const BOOK_W = 292;
export const BOOK_H = 180;
/** A page's text area: 126 wide, 12 from the book's outer edge and 10 from its top; the right page's at x 154. */
export const PAGE_TEXT = { left: 12, right: 154, top: 10, w: 126 };

export interface Ribbon { id: string; colour: Colour; dark: Colour; name: string }

export interface BookOpts {
  id: string;
  x: number; y: number;
  ribbons: Ribbon[];
  chosen: number;
  onRibbon?: (i: number) => void;
  /** The page numbers under each page; an arrow is drawn only where there is a page that way. */
  pages?: [number, number];
  prev?: () => void;
  next?: () => void;
  left?: Node[];
  right?: Node[];
  force?: { prev?: Force; next?: Force; ribbon?: { i: number; force: Force } };
}

const MID = BOOK_W / 2 - 3;

/** The boards, the block of pages with its leaves, and the gutter (5.19). */
function paintBook(s: Surface): void {
  const w = BOOK_W, h = BOOK_H;
  s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, h - 1, w - 2, 1, 'root.0');
  s.fill(0, 1, 1, h - 2, 'root.0'); s.fill(w - 1, 1, 1, h - 2, 'root.0');
  s.fill(1, 1, w - 2, h - 2, 'timber.sh');
  s.fill(1, 1, w - 2, 1, 'timber.lt'); s.fill(1, 2, 1, h - 3, 'timber.lt');
  s.fill(w - 2, 2, 1, h - 3, 'timber.pit'); s.fill(2, h - 2, w - 3, 1, 'timber.pit');
  // The block of pages, 3 in, with a line of root.0 round it.
  s.fill(3, 3, w - 6, h - 6, 'root.0');
  s.fill(4, 4, w - 8, h - 8, 'clay.lt');
  // The leaves under each page along its outer edge and the bottom.
  s.fill(4, 4, 1, h - 8, 'clay.sh'); s.fill(5, 4, 1, h - 9, 'clay.face');
  s.fill(w - 5, 4, 1, h - 8, 'clay.sh'); s.fill(w - 6, 4, 1, h - 9, 'clay.face');
  s.fill(6, h - 6, w - 12, 1, 'clay.sh'); s.fill(5, h - 5, w - 10, 1, 'clay.face');
  s.fill(w - 6, h - 6, 1, 2, 'clay.face');
  // The gutter: face, sh, two of dk, sh, face.
  const g: Colour[] = ['clay.face', 'clay.sh', 'clay.dk', 'clay.dk', 'clay.sh', 'clay.face'];
  g.forEach((c, i) => s.fill(MID + i, 4, 1, h - 8, c));
}

/** A ribbon: 12 wide in one colour with its right 2 columns in its dark tone, outlined, rising `rise` above the boards. */
function paintRibbon(s: Surface, r: Ribbon, x: number, rise: number): void {
  s.fill(x + 1, -rise, 12, 1, 'root.0');
  s.fill(x, -rise + 1, 1, rise - 1, 'root.0');
  s.fill(x + 13, -rise + 1, 1, rise - 1, 'root.0');
  s.fill(x + 1, -rise + 1, 10, rise - 1, r.colour);
  s.fill(x + 11, -rise + 1, 2, rise - 1, r.dark);
}

/** The journal and the codex (5.19): a book of 292 by 180 opened to two pages, ribbons above, page arrows at the bottom. */
export function book(o: BookOpts): Node {
  const kids: Node[] = [];
  o.ribbons.forEach((r, i) => {
    const chosen = i === o.chosen;
    const rise = chosen ? 12 : 7;
    const f = o.force?.ribbon?.i === i ? o.force.ribbon.force : undefined;
    kids.push({
      id: r.id, x: 159 + i * 16, y: -rise, w: 14, h: rise, takes: true, focus: true,
      on: { down: () => o.onRibbon?.(i) },
      tip: (live: Live) => (lv(live, f).hover ? { lines: [{ text: r.name, c: 'salt' }], delay: 0.4 } : null),
      paint: (s) => { s.translate(0, rise); paintRibbon(s, r, 0, rise); s.translate(0, -rise); },
    });
  });
  const arrow = (id: string, x: number, map: typeof PAGE_ARROW, act: () => void, force?: Force): Node => ({
    id, x, y: 164, w: 16, h: 7, takes: true, focus: true,
    on: { click: act },
    paint: (s, live) => { const l = lv(live, force); s.draw(map, 0, 0, { flat: l.hover || l.focus ? 'blood.dk' : 'ink' }); },
  });
  if (o.prev) kids.push(arrow(`${o.id}.prev`, 14, PAGE_ARROW_LEFT, o.prev, o.force?.prev));
  if (o.next) kids.push(arrow(`${o.id}.next`, BOOK_W - 30, PAGE_ARROW, o.next, o.force?.next));
  if (o.left) kids.push({ x: PAGE_TEXT.left, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: 150, kids: o.left });
  if (o.right) kids.push({ x: PAGE_TEXT.right, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: 150, kids: o.right });
  return {
    id: o.id, x: o.x, y: o.y, w: BOOK_W, h: BOOK_H,
    paint: (s) => {
      paintBook(s);
      if (o.pages) {
        const [a, b] = o.pages.map(String);
        s.text(a, centreX(a, PAGE_TEXT.left, PAGE_TEXT.w, SMALL), 166, 'ink.faded', false, SMALL);
        s.text(b, centreX(b, PAGE_TEXT.right, PAGE_TEXT.w, SMALL), 166, 'ink.faded', false, SMALL);
      }
    },
    kids,
  };
}

/** A heading on a page: plain ink with a rule of `clay.sh` one unit thick one unit under its cell. */
export function pageHeading(o: { x: number; y: number; w: number; text: string }): Node {
  return {
    x: o.x, y: o.y, w: o.w, h: 12,
    paint: (s) => { s.text(o.text, 0, 0, 'ink'); s.fill(0, 11, o.w, 1, 'clay.sh'); },
  };
}
