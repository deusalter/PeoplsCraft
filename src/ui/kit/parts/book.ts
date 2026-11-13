import { PAGE_ARROW, PAGE_ARROW_LEFT } from '../art/book';
import { SMALL } from '../font/face';
import { centreX } from '../font/measure';
import type { Live, Node } from '../node';
import { type Colour, SEATS } from '../palette';
import type { Surface } from '../surface';
import { type Force, lv, ring } from './common';
import { CHOSEN_RISE, type Fill, OTHER_RISE, TAB_PITCH, TAB_SIZE, type Tones, chosenTab, otherTab, otherTabState } from './tabs';

export const BOOK_W = 292;
export const BOOK_H = 180;
/** A page's text area: 126 wide, 12 from the book's outer edge and 10 from its top; the right page's at x 154. */
export const PAGE_TEXT = { left: 12, right: 154, top: 10, w: 126 };
/** The lowest unit a page's text may reach: the arrows and the page numbers stand under it. */
export const PAGE_BOTTOM = 158;

/**
 * A section of a book: a tab on the cover's top edge carrying its 16 by 16 mark, and a ribbon of its colour hanging
 * from the book's foot, the open section's hanging longer. The name is the tooltip of both.
 */
export interface Ribbon { id: string; colour: Colour; dark: Colour; name: string; icon: string }

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

/**
 * The gutter, three columns at the middle: the left page's last column in `clay.sh`, a crease of root.0, and the right
 * page's first column in `clay.lt`, the page itself, so that the fold is a cut and not a ramp of stripes.
 */
const GUTTER = BOOK_W / 2 - 1;
const GUTTER_TONES: Colour[] = ['clay.sh', 'root.0', 'clay.lt'];
/** Where the block of pages starts: its outline of root.0 stands this far in from the book's edge. */
const BLOCK = 4;

/** The leather of the boards, by role, so that the tabs are cut from the same hide as the cover. */
const LEATHER: Tones = (r) => ({ hi: 'timber.lt', lt: 'timber.sh', face: 'timber.sh', sh: 'timber.pit', dk: 'timber.pit', pit: 'timber.pit' } as const)[r];
/** A tab not open lightens under the pointer to `timber.dk`, a step above its `timber.pit` and below the open one. */
const LEATHER_SHUT: Tones = (r) => (r === 'face' ? 'timber.dk' : LEATHER(r));

/**
 * The cover, the block of pages and the gutter (5.19). The cover is a board of leather: the outline with its corners
 * left out, a light row and column of `timber.lt` on the top and left, a face of `timber.sh`, a dark row and column of
 * `timber.pit` on the bottom and right, and nothing more. The block of pages has its outline of root.0; the edges of
 * the leaves show three deep along each page's outer side and foot; the gutter is a crease between the two pages.
 */
function paintBook(s: Surface): void {
  const w = BOOK_W, h = BOOK_H, b = BLOCK;
  s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, h - 1, w - 2, 1, 'root.0');
  s.fill(0, 1, 1, h - 2, 'root.0'); s.fill(w - 1, 1, 1, h - 2, 'root.0');
  s.fill(1, 1, w - 2, h - 2, 'timber.sh');
  s.fill(1, 1, w - 3, 1, 'timber.lt'); s.fill(1, 2, 1, h - 4, 'timber.lt');
  s.fill(2, h - 2, w - 3, 1, 'timber.pit'); s.fill(w - 2, 2, 1, h - 4, 'timber.pit');
  s.fill(b, b, w - 2 * b, h - 2 * b, 'root.0');
  s.fill(b + 1, b + 1, w - 2 * b - 2, h - 2 * b - 2, 'clay.lt');
  // The edges of the leaves, stacked three deep along each page's outer side and its foot, the outermost first.
  const leaves: Colour[] = ['clay.face', 'clay.lt', 'clay.sh'];
  const p = b + 1;
  leaves.forEach((c, i) => {
    const y = h - p - 1 - i;
    s.fill(p + i, y, w - 2 * p - 2 * i, 1, c);
    s.fill(p + i, p, 1, y - p, c);
    s.fill(w - p - 1 - i, p, 1, y - p, c);
  });
  GUTTER_TONES.forEach((c, i) => s.fill(GUTTER + i, p, 1, h - 2 * p, c));
}

/** A ribbon hangs from the foot of the book for each section, 6 wide, its end cut in a V; the open one hangs 4 longer. */
export const RIBBON_W = 6;
const RIBBON_DROP = 12, RIBBON_OPEN = 4, RIBBON_PITCH = 8;
/** Where the first ribbon hangs: the ribbons stand together just left of the spine, under the left page's gutter edge. */
const ribbonX = (n: number) => BOOK_W / 2 - 8 - n * RIBBON_PITCH;

function paintRibbon(s: Surface, r: Ribbon, open: boolean, hot: boolean): void {
  const long = RIBBON_DROP + (open ? RIBBON_OPEN : 0);
  const c: Colour = r.colour;
  s.fill(0, 0, 1, long, 'root.0'); s.fill(RIBBON_W - 1, 0, 1, long, 'root.0');
  s.fill(1, 0, RIBBON_W - 3, long - 1, hot ? r.dark : c);
  s.fill(RIBBON_W - 2, 0, 1, long - 1, r.dark);
  // The V: the two outer columns run a unit lower than the middle, which is left open.
  s.fill(1, long - 1, 1, 1, hot ? r.dark : c); s.fill(RIBBON_W - 2, long - 1, 1, 1, r.dark);
  s.fill(2, long - 1, RIBBON_W - 4, 1, 'root.0');
  s.fill(0, long, 2, 1, 'root.0'); s.fill(RIBBON_W - 2, long, 2, 1, 'root.0');
}

/** The journal and the codex (5.19): a book of 292 by 180 opened to two pages, tabs on its top edge, page arrows below. */
export function book(o: BookOpts): Node {
  const kids: Node[] = [];
  const tab = (i: number): Node => {
    const r = o.ribbons[i];
    const chosen = i === o.chosen;
    const rise = chosen ? CHOSEN_RISE : OTHER_RISE;
    const at = i * TAB_PITCH;
    const f = o.force?.ribbon?.i === i ? o.force.ribbon.force : undefined;
    return {
      id: r.id, x: at, y: -rise, w: TAB_SIZE, h: rise, takes: true, focus: true,
      on: { down: () => o.onRibbon?.(i) },
      tip: (live: Live) => (lv(live, f).hover ? { lines: [{ text: r.name, c: 'salt' }], delay: 0.4 } : null),
      paint: (s, live) => {
        const l = lv(live, f);
        const fill: Fill = (x, y, w, h, c) => s.fill(x - at, y + rise, w, h, c);
        if (chosen) chosenTab(fill, at, LEATHER);
        else { otherTab(fill, at, LEATHER, i === 0); otherTabState(fill, at, LEATHER_SHUT, l.hover, l.focus); }
        s.icon(r.icon, 4, chosen ? 4 : 2);
      },
    };
  };
  o.ribbons.forEach((_, i) => { if (i !== o.chosen) kids.push(tab(i)); });
  if (o.chosen >= 0 && o.chosen < o.ribbons.length) kids.push(tab(o.chosen));
  const arrow = (id: string, x: number, map: typeof PAGE_ARROW, act: () => void, force?: Force): Node => ({
    id, x, y: 161, w: 16, h: 7, takes: true, focus: true,
    on: { click: act },
    paint: (s, live) => { const l = lv(live, force); s.draw(map, 0, 0, { flat: l.hover || l.focus ? 'blood.dk' : 'ink' }); },
  });
  if (o.prev) kids.push(arrow(`${o.id}.prev`, 12, PAGE_ARROW_LEFT, o.prev, o.force?.prev));
  if (o.next) kids.push(arrow(`${o.id}.next`, BOOK_W - 28, PAGE_ARROW, o.next, o.force?.next));
  const x0 = ribbonX(o.ribbons.length);
  o.ribbons.forEach((r, i) => {
    const open = i === o.chosen;
    kids.push({
      x: x0 + i * RIBBON_PITCH, y: BOOK_H - 1, w: RIBBON_W, h: RIBBON_DROP + RIBBON_OPEN + 1, takes: true,
      on: { down: () => o.onRibbon?.(i) },
      tip: () => ({ lines: [{ text: r.name, c: 'salt' }], delay: 0.4 }),
      paint: (s, live) => paintRibbon(s, r, open, live.hover && !open),
    });
  });
  if (o.left) kids.push({ x: PAGE_TEXT.left, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: PAGE_BOTTOM - PAGE_TEXT.top, kids: o.left });
  if (o.right) kids.push({ x: PAGE_TEXT.right, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: PAGE_BOTTOM - PAGE_TEXT.top, kids: o.right });
  return {
    id: o.id, x: o.x, y: o.y, w: BOOK_W, h: BOOK_H,
    paint: (s) => {
      paintBook(s);
      if (o.pages) {
        const [a, b] = o.pages.map(String);
        s.text(a, centreX(a, PAGE_TEXT.left, PAGE_TEXT.w, SMALL), 162, 'ink.faded', false, SMALL);
        s.text(b, centreX(b, PAGE_TEXT.right, PAGE_TEXT.w, SMALL), 162, 'ink.faded', false, SMALL);
      }
    },
    kids,
  };
}

/** How far a book's tabs stand above it: the chosen one's rise. */
export const BOOK_TABS = CHOSEN_RISE;

/** A heading on a page: plain ink with a rule of `clay.sh` one unit thick one unit under its cell. */
export function pageHeading(o: { x: number; y: number; w: number; text: string }): Node {
  return {
    x: o.x, y: o.y, w: o.w, h: 12,
    paint: (s) => { s.text(o.text, 0, 0, 'ink'); s.fill(0, 11, o.w, 1, 'clay.sh'); },
  };
}

/**
 * A row of a list written on a page: hovered, its floor is `clay.face`; chosen, a rule of `clay.dk` one unit thick
 * under its words (`under`, in the row's coordinates), as a reader marks a line, and no floor. It is chosen on the
 * press, and Up and Down move the choice when it has the focus.
 */
export function pageRow(o: { id: string; x: number; y: number; w: number; h: number; chosen: boolean; under?: { x: number; y: number; w: number }; onChoose: () => void; paint: (s: Surface, live: Live) => void }): Node {
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, takes: true, focus: true,
    on: { down: o.onChoose },
    paint: (s, live) => {
      if (live.hover && !o.chosen) s.fill(0, 0, o.w, o.h, 'clay.face');
      if (o.chosen && o.under) s.fill(o.under.x, o.under.y, o.under.w, 1, 'clay.dk');
      if (live.focus) ring(s, 0, 0, o.w, o.h, 'salt');
      o.paint(s, live);
    },
  };
}

/** A player's colour on a light face: a flag 2 by 7 beside their name in ink. */
export function flag(s: Surface, seat: number, x: number, y: number): void { s.fill(x, y, 2, 7, SEATS[seat - 1]); }
