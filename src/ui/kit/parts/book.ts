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
 * A section of a book: a tab on the cover's top edge carrying its 16 by 16 mark, and, while it is open, a ribbon of its
 * colour lying in the gutter. The name is the tab's tooltip.
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

/** The first column of the gutter: 2 of shade, 4 of fold, 2 of shade, round the middle of the book. */
const GUTTER = BOOK_W / 2 - 4;

/** The leather of the boards, by role, so that the tabs are cut from the same hide as the cover. */
const LEATHER: Tones = (r) => ({ hi: 'timber.lt', lt: 'timber.sh', face: 'timber.dk', sh: 'timber.pit', dk: 'timber.pit', pit: 'timber.pit' } as const)[r];

/**
 * The cover, the block of pages and the gutter (5.19). The cover is a margin of leather 6 deep: the outline, a light edge
 * two deep on the top and left and a dark one on the bottom and right as on a slab, two rows of `timber.dk`, then a lip
 * of `timber.sh` round the pages. The block of pages has its outline of root.0; two rows of leaves show under the
 * pages; the gutter is two columns of shade either side of a fold of four.
 */
function paintBook(s: Surface): void {
  const w = BOOK_W, h = BOOK_H;
  const t = LEATHER;
  s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, h - 1, w - 2, 1, 'root.0');
  s.fill(0, 1, 1, h - 2, 'root.0'); s.fill(w - 1, 1, 1, h - 2, 'root.0');
  s.fill(1, 1, w - 2, h - 2, t('face'));
  s.fill(1, 1, w - 3, 1, t('hi')); s.fill(1, 2, 1, h - 4, t('hi'));
  s.fill(2, 2, w - 5, 1, t('lt')); s.fill(2, 3, 1, h - 6, t('lt'));
  s.fill(w - 2, 2, 1, h - 3, t('pit')); s.fill(2, h - 2, w - 3, 1, t('pit'));
  s.fill(w - 3, 3, 1, h - 5, t('sh')); s.fill(3, h - 3, w - 5, 1, t('sh'));
  s.fill(5, 5, w - 10, 1, 'timber.sh'); s.fill(5, h - 6, w - 10, 1, 'timber.sh');
  s.fill(5, 6, 1, h - 12, 'timber.sh'); s.fill(w - 6, 6, 1, h - 12, 'timber.sh');
  s.fill(6, 6, w - 12, h - 12, 'root.0');
  s.fill(7, 7, w - 14, h - 17, 'clay.lt');
  s.fill(7, h - 9, w - 14, 1, 'clay.sh');
  s.fill(7, h - 8, w - 14, 1, 'clay.face');
  const g: Colour[] = ['clay.face', 'clay.sh', 'clay.dk', 'clay.pit', 'clay.pit', 'clay.dk', 'clay.sh', 'clay.face'];
  g.forEach((c, i) => s.fill(GUTTER + i, 7, 1, h - 14, c));
}

/** The ribbon of the open section, 8 wide, lying in the gutter from the cover's top edge down 30, its end cut in a V. */
const RIBBON = [
  'KccKKcdK',
  'KcK..KdK',
  'KK....KK',
];
const RIBBON_LONG = 27;
function paintRibbon(s: Surface, r: Ribbon): void {
  const x = GUTTER;
  s.fill(x, 1, 1, RIBBON_LONG, 'root.0'); s.fill(x + 7, 1, 1, RIBBON_LONG, 'root.0');
  s.fill(x + 1, 1, 5, RIBBON_LONG, r.colour); s.fill(x + 6, 1, 1, RIBBON_LONG, r.dark);
  RIBBON.forEach((row, j) => {
    for (let i = 0; i < 8; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      s.fill(x + i, 1 + RIBBON_LONG + j, 1, 1, ch === 'K' ? 'root.0' : ch === 'c' ? r.colour : r.dark);
    }
  });
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
        else { otherTab(fill, at, LEATHER, i === 0); otherTabState(fill, at, LEATHER, l.hover, l.focus); }
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
  if (o.left) kids.push({ x: PAGE_TEXT.left, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: PAGE_BOTTOM - PAGE_TEXT.top, kids: o.left });
  if (o.right) kids.push({ x: PAGE_TEXT.right, y: PAGE_TEXT.top, w: PAGE_TEXT.w, h: PAGE_BOTTOM - PAGE_TEXT.top, kids: o.right });
  const open = o.ribbons[o.chosen];
  return {
    id: o.id, x: o.x, y: o.y, w: BOOK_W, h: BOOK_H,
    paint: (s) => {
      paintBook(s);
      if (open) paintRibbon(s, open);
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
