import { PAGE_ARROW, PAGE_ARROW_LEFT } from '../art/book';
import { SMALL } from '../font/face';
import { centreX } from '../font/measure';
import type { Live, Node } from '../node';
import { type Colour, SEATS } from '../palette';
import type { Surface } from '../surface';
import { type Force, lv, ring } from './common';
import { CHOSEN_RISE, type Fill, OTHER_RISE, TAB_PITCH, TAB_SIZE, type Tones, chosenTab, otherTab, otherTabState } from './tabs';

export const BOOK_W = 298;
export const BOOK_H = 186;
/** A page's text area: 126 wide, 15 from the book's outer edge and 13 from its top; the right page's at x 157. */
export const PAGE_TEXT = { left: 15, right: 157, top: 13, w: 126 };
/** The lowest unit a page's text may reach: the arrows and the page numbers stand under it. */
export const PAGE_BOTTOM = 161;

/**
 * A section of a book: a tab on the cover's top edge carrying its 16 by 16 mark, its name as its tooltip. The tabs are
 * the bookmarks: a row of ribbons in five colours under the book was a second way to the same pages, told from the
 * tabs only by colour.
 */
export interface Section { id: string; name: string; icon: string }

export interface BookOpts {
  id: string;
  x: number; y: number;
  sections: Section[];
  chosen: number;
  onSection?: (i: number) => void;
  /** The page numbers under each page; an arrow is drawn only where there is a page that way. */
  pages?: [number, number];
  prev?: () => void;
  next?: () => void;
  left?: Node[];
  right?: Node[];
  force?: { prev?: Force; next?: Force; tab?: { i: number; force: Force } };
}

/**
 * The gutter, three columns at the middle: the left page's last column in `clay.sh`, a crease of root.0, and the right
 * page's first column in `clay.lt`, the page itself, so that the fold is a cut and not a ramp of stripes.
 */
const GUTTER = BOOK_W / 2 - 1;
const GUTTER_TONES: Colour[] = ['clay.sh', 'root.0', 'clay.lt'];
/** Where the block of pages starts: its outline of root.0 stands this far in from the book's edge, past a board of 6. */
const BLOCK = 7;

/**
 * The leather of the boards, by role: the slab's construction one step darker than a timber slab, so that the tabs are
 * cut from the same hide as the cover and the open one joins it as a tab joins a slab.
 */
const LEATHER: Tones = (r) => ({ hi: 'timber.lt', lt: 'timber.face', face: 'timber.sh', sh: 'timber.dk', dk: 'timber.pit', pit: 'timber.pit' } as const)[r];
/** A tab not open: flat `timber.pit` with a light row and column of `timber.sh`, lightening to `timber.dk` under the pointer. */
const LEATHER_SHUT: Tones = (r) => ({ hi: 'timber.sh', lt: 'timber.sh', face: 'timber.dk', sh: 'timber.pit', dk: 'timber.pit', pit: 'timber.pit' } as const)[r];

/**
 * The cover, the block of pages and the gutter (5.19). The cover is a board of leather 6 deep inside its outline, built
 * as a slab is: the outline with its corners left out, a light edge two deep on the top and left, a dark edge two deep
 * on the bottom and right, the face between, `face` on the two diagonal units where light meets dark. At 2 or 3 deep
 * the board read as a frame round two panels, not as the boards of a bound book. The block of pages has its outline of
 * root.0; the stack of leaves under each page shows two deep along its outer side and the foot, `clay.face` and then
 * `clay.sh` outward, darkening to the outline. A stack of three with a light leaf inside the dark one left that dark
 * line standing 2 in from the edge all round, an inset rule.
 */
function paintBook(s: Surface): void {
  const w = BOOK_W, h = BOOK_H, b = BLOCK, t = LEATHER;
  s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, h - 1, w - 2, 1, 'root.0');
  s.fill(0, 1, 1, h - 2, 'root.0'); s.fill(w - 1, 1, 1, h - 2, 'root.0');
  s.fill(1, 1, w - 2, h - 2, t('face'));
  s.fill(1, 1, w - 3, 1, t('hi')); s.fill(1, 2, 1, h - 4, t('hi'));
  s.fill(2, 2, w - 5, 1, t('lt')); s.fill(2, 3, 1, h - 6, t('lt'));
  s.fill(2, h - 2, w - 3, 1, t('pit')); s.fill(w - 2, 2, 1, h - 4, t('pit'));
  s.fill(3, h - 3, w - 5, 1, t('sh')); s.fill(w - 3, 3, 1, h - 6, t('sh'));
  s.fill(b, b, w - 2 * b, h - 2 * b, 'root.0');
  s.fill(b + 1, b + 1, w - 2 * b - 2, h - 2 * b - 2, 'clay.lt');
  const leaves: Colour[] = ['clay.sh', 'clay.face'];
  const p = b + 1;
  leaves.forEach((c, i) => {
    const y = h - p - 1 - i;
    s.fill(p + i, y, w - 2 * p - 2 * i, 1, c);
    s.fill(p + i, p, 1, y - p, c);
    s.fill(w - p - 1 - i, p, 1, y - p, c);
  });
  // The pages' columns of the gutter stop at the leaves; the crease runs through them to the outline.
  GUTTER_TONES.forEach((c, i) => s.fill(GUTTER + i, p, 1, h - 2 * p - (c === 'root.0' ? 0 : leaves.length), c));
}

/** The journal and the codex (5.19): a book of 298 by 186 opened to two pages, tabs on its top edge, page arrows below. */
export function book(o: BookOpts): Node {
  const kids: Node[] = [];
  const tab = (i: number): Node => {
    const r = o.sections[i];
    const chosen = i === o.chosen;
    const rise = chosen ? CHOSEN_RISE : OTHER_RISE;
    const at = i * TAB_PITCH;
    const f = o.force?.tab?.i === i ? o.force.tab.force : undefined;
    return {
      id: r.id, x: at, y: -rise, w: TAB_SIZE, h: rise, takes: true, focus: true,
      on: { down: () => o.onSection?.(i) },
      tip: (live: Live) => (lv(live, f).hover ? { lines: [{ text: r.name, c: 'salt' }], delay: 0.4 } : null),
      paint: (s, live) => {
        const l = lv(live, f);
        const fill: Fill = (x, y, w, h, c) => s.fill(x - at, y + rise, w, h, c);
        if (chosen) chosenTab(fill, at, LEATHER);
        else { otherTab(fill, at, LEATHER_SHUT, i === 0); otherTabState(fill, at, LEATHER_SHUT, l.hover, l.focus); }
        s.icon(r.icon, 4, chosen ? 4 : 2);
      },
    };
  };
  o.sections.forEach((_, i) => { if (i !== o.chosen) kids.push(tab(i)); });
  if (o.chosen >= 0 && o.chosen < o.sections.length) kids.push(tab(o.chosen));
  const arrow = (id: string, x: number, map: typeof PAGE_ARROW, act: () => void, force?: Force): Node => ({
    id, x, y: 164, w: 16, h: 7, takes: true, focus: true,
    on: { click: act },
    paint: (s, live) => { const l = lv(live, force); s.draw(map, 0, 0, { flat: l.hover || l.focus ? 'blood.dk' : 'ink' }); },
  });
  if (o.prev) kids.push(arrow(`${o.id}.prev`, 15, PAGE_ARROW_LEFT, o.prev, o.force?.prev));
  if (o.next) kids.push(arrow(`${o.id}.next`, BOOK_W - 31, PAGE_ARROW, o.next, o.force?.next));
  if (o.left) kids.push({ x: PAGE_TEXT.left, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: PAGE_BOTTOM - PAGE_TEXT.top, kids: o.left });
  if (o.right) kids.push({ x: PAGE_TEXT.right, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: PAGE_BOTTOM - PAGE_TEXT.top, kids: o.right });
  return {
    id: o.id, x: o.x, y: o.y, w: BOOK_W, h: BOOK_H,
    paint: (s) => {
      paintBook(s);
      if (o.pages) {
        const [a, b] = o.pages.map(String);
        s.text(a, centreX(a, PAGE_TEXT.left, PAGE_TEXT.w, SMALL), 165, 'ink.faded', false, SMALL);
        s.text(b, centreX(b, PAGE_TEXT.right, PAGE_TEXT.w, SMALL), 165, 'ink.faded', false, SMALL);
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
