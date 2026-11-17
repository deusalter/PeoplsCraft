import { PAGE_ARROW, PAGE_ARROW_LEFT } from '../art/book';
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
  // The board's corners step in by two, outline and all, as the worn corner of a bound board and never a slab's.
  s.fill(2, 0, w - 4, 1, 'root.0'); s.fill(2, h - 1, w - 4, 1, 'root.0');
  s.fill(0, 2, 1, h - 4, 'root.0'); s.fill(w - 1, 2, 1, h - 4, 'root.0');
  s.fill(2, 1, w - 4, h - 2, t('face')); s.fill(1, 2, w - 2, h - 4, t('face'));
  s.fill(2, 1, w - 5, 1, t('hi')); s.fill(1, 2, 1, h - 5, t('hi'));
  s.fill(2, 2, w - 5, 1, t('lt')); s.fill(2, 3, 1, h - 6, t('lt'));
  s.fill(3, h - 2, w - 5, 1, t('pit')); s.fill(w - 2, 3, 1, h - 5, t('pit'));
  s.fill(3, h - 3, w - 6, 1, t('sh')); s.fill(w - 3, 3, 1, h - 6, t('sh'));
  for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) s.fill(x, y, 1, 1, 'root.0');
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
  // Each page dips into the binding: a band 3 wide of `clay.face` beside the gutter, one tone and not a ramp.
  const dip = h - 2 * p - leaves.length;
  s.fill(GUTTER - 3, p, 3, dip, 'clay.face');
  s.fill(GUTTER + 3, p, 3, dip, 'clay.face');
  // The pages' columns of the gutter stop at the leaves; the crease runs through them to the outline.
  GUTTER_TONES.forEach((c, i) => s.fill(GUTTER + i, p, 1, h - 2 * p - (c === 'root.0' ? 0 : leaves.length), c));
  ribbon(s);
}

/**
 * The ribbon that keeps the place, 4 wide, from the top of the spine down the gutter to 14 under the block's top, its
 * tail cut in a notch: `blood` lit on its left in `blood.lt` and shaded on its right in `blood.dk`, outlined in root.0.
 * It lies in the fold, where no line of a page reaches; laid over the head of the right page it touched the first
 * word. One ribbon, always the same colour: it says the book lies open, and the tabs say at which section; five
 * ribbons in five colours were a second way to the sections, told apart by colour alone.
 */
function ribbon(s: Surface): void {
  const x = GUTTER - 1, end = BLOCK + 14;
  s.fill(x - 1, 0, 6, end + 1, 'root.0');
  s.fill(x, 1, 1, end - 1, 'blood.lt');
  s.fill(x + 1, 1, 2, end - 1, 'blood');
  s.fill(x + 3, 1, 1, end - 1, 'blood.dk');
  // The notch: the tail's two middle units cut back by two, the outline following them; under it the gutter shows.
  s.fill(x + 1, end - 2, 2, 1, 'root.0');
  s.fill(x + 1, end - 1, 1, 2, 'clay.sh');
  s.fill(x + 2, end - 1, 1, 2, 'root.0');
  s.fill(x - 1, end, 1, 1, 'clay.face'); s.fill(x + 4, end, 1, 1, 'clay.face');
  s.fill(x, end, 1, 1, 'root.0'); s.fill(x + 3, end, 1, 1, 'root.0');
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
        // The text face, its capitals level with the arrows: small digits in faded ink were lost between them.
        const [a, b] = o.pages.map(String);
        s.text(a, centreX(a, PAGE_TEXT.left, PAGE_TEXT.w), 163, 'ink.faded');
        s.text(b, centreX(b, PAGE_TEXT.right, PAGE_TEXT.w), 163, 'ink.faded');
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
 * A row of a list written on a page: chosen, a band of `clay.face` the row's full width and height behind its words;
 * hovered, a band of `salt`, the page lifted as the tradition lifts a hovered slot. A rule under the words read as a
 * link, which on a page is kept for what can be pressed. It is chosen on the press, and Up and Down move the choice
 * when it has the focus.
 */
export function pageRow(o: { id: string; x: number; y: number; w: number; h: number; chosen: boolean; onChoose: () => void; paint: (s: Surface, live: Live) => void }): Node {
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, takes: true, focus: true,
    on: { down: o.onChoose },
    paint: (s, live) => {
      if (o.chosen) s.fill(0, 0, o.w, o.h, 'clay.face');
      else if (live.hover) s.fill(0, 0, o.w, o.h, 'salt');
      if (live.focus) ring(s, 0, 0, o.w, o.h, 'salt');
      o.paint(s, live);
    },
  };
}

/** A player's colour on a light face: a flag 2 by 7 beside their name in ink. */
export function flag(s: Surface, seat: number, x: number, y: number): void { s.fill(x, y, 2, 7, SEATS[seat - 1]); }
