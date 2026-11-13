import type { Live, Node } from '../node';
import { type Colour, type Ramp, type Role, tone } from '../palette';
import type { Surface } from '../surface';
import { type Force, lv } from './common';
import { type SlabOpts, slab } from './slab';

export interface TabSpec {
  id: string;
  icon: string;
  /** Its name is its tooltip. */
  name: string;
  /** A tab that cannot be chosen here: drawn flat, its icon a flat shape, with `why` under its name. */
  off?: boolean;
  why?: string;
}

export interface TabbedOpts extends SlabOpts {
  edge: 'top' | 'left';
  tabs: TabSpec[];
  chosen: number;
  onTab?: (i: number) => void;
  /** Pins the hover of one tab, for the sheet. */
  forceTab?: { i: number; force: Force };
}

/** The pitch of tabs along one edge: they share outline columns (5.7). */
export const TAB_PITCH = 23;
export const TAB_SIZE = 24;
const CHOSEN_RISE = 21;
const OTHER_RISE = 18;

export type Fill = (x: number, y: number, w: number, h: number, c: Colour) => void;

/** The tones a tab is drawn in, by role: a slab's ramp, or the book's leather. */
export type Tones = (r: Role) => Colour;

/**
 * The chosen top tab at `tx`, the slab's outline row at y 0, drawn by the construction of 5.7: it rises 21 and is joined
 * to the slab, whose outline and light edge are gone across its inner width. A side tab is the same, turned.
 */
export function chosenTab(fill: Fill, tx: number, t: Tones): void {
  const top = -CHOSEN_RISE;
  fill(tx + 1, top, 22, 1, 'root.0');
  fill(tx, top + 1, 1, CHOSEN_RISE, 'root.0');
  fill(tx + 23, top + 1, 1, CHOSEN_RISE, 'root.0');
  fill(tx + 1, top + 1, 22, CHOSEN_RISE + 2, t('face'));
  fill(tx + 1, top + 1, 21, 1, t('hi'));
  fill(tx + 1, top + 2, 1, CHOSEN_RISE + 1, t('hi'));
  fill(tx + 2, top + 2, 19, 1, t('lt'));
  fill(tx + 2, top + 3, 1, CHOSEN_RISE, t('lt'));
  fill(tx + 22, top + 2, 1, CHOSEN_RISE - 1, t('pit'));
  fill(tx + 21, top + 3, 1, CHOSEN_RISE - 2, t('sh'));
  // Where the slab's top edge starts again past the tab: the light rows step in, as at the slab's own corner.
  fill(tx + 22, 1, 1, 1, t('hi'));
  fill(tx + 21, 2, 2, 1, t('lt'));
}

/**
 * A tab not chosen: 18 high, flat `sh` with a light row and column of `lt` and a dark column of `pit`. Its far corner
 * is left out; the tab drawn after it, which shares that column, fills it back.
 */
export function otherTab(fill: Fill, tx: number, t: Tones, first: boolean): void {
  const top = -OTHER_RISE;
  fill(tx + (first ? 1 : 0), top, first ? 22 : 23, 1, 'root.0');
  fill(tx, top + 1, 1, OTHER_RISE - 1, 'root.0');
  fill(tx + 23, top + 1, 1, OTHER_RISE - 1, 'root.0');
  fill(tx + 1, top + 1, 22, OTHER_RISE - 1, t('sh'));
  fill(tx + 1, top + 1, 21, 1, t('lt'));
  fill(tx + 1, top + 2, 1, OTHER_RISE - 2, t('lt'));
  fill(tx + 22, top + 2, 1, OTHER_RISE - 2, t('pit'));
  if (first) fill(tx, 0, 1, 1, 'root.0');
}

/** The hover and the focus of a tab not chosen: its face lightens to `face`, a ring of salt inside its light edge. */
export function otherTabState(fill: Fill, tx: number, t: Tones, hover: boolean, focus: boolean): void {
  if (hover) fill(tx + 2, -OTHER_RISE + 2, 20, OTHER_RISE - 2, t('face'));
  if (focus) {
    fill(tx + 2, -OTHER_RISE + 2, 20, 1, 'salt');
    fill(tx + 2, -OTHER_RISE + 2, 1, OTHER_RISE - 2, 'salt');
    fill(tx + 21, -OTHER_RISE + 2, 1, OTHER_RISE - 2, 'salt');
  }
}

/** A tab that cannot be chosen here: flat `dk` inside its outline, with no light edge and no dark column. */
export function offTab(fill: Fill, tx: number, t: Tones, first: boolean): void {
  const top = -OTHER_RISE;
  fill(tx + (first ? 1 : 0), top, first ? 22 : 23, 1, 'root.0');
  fill(tx, top + 1, 1, OTHER_RISE - 1, 'root.0');
  fill(tx + 23, top + 1, 1, OTHER_RISE - 1, 'root.0');
  fill(tx + 1, top + 1, 22, OTHER_RISE - 1, t('dk'));
  if (first) fill(tx, 0, 1, 1, 'root.0');
}

export { CHOSEN_RISE, OTHER_RISE };

/** A slab with tabs along its top or its left edge (5.7). */
export function tabbedSlab(o: TabbedOpts): Node {
  const body = slab(o);
  const top = o.edge === 'top';
  const kids: Node[] = [];
  const fillFor = (s: Surface): Fill => top ? (x, y, w, h, c) => s.fill(x, y, w, h, c) : (x, y, w, h, c) => s.fill(y, x, h, w, c);
  const tabNode = (i: number, chosen: boolean): Node => {
    const at = i * TAB_PITCH;
    const rise = chosen ? CHOSEN_RISE : OTHER_RISE;
    const spec = o.tabs[i];
    const force = o.forceTab?.i === i ? o.forceTab.force : undefined;
    return {
      id: spec.id,
      x: top ? at : -rise, y: top ? -rise : at, w: top ? TAB_SIZE : rise, h: top ? rise : TAB_SIZE,
      takes: true, focus: !spec.off,
      on: spec.off ? undefined : { down: () => o.onTab?.(i) },
      tip: (live: Live) => (lv(live, force).hover
        ? { lines: [{ text: spec.name, c: 'salt' }, ...(spec.off && spec.why ? [{ text: spec.why, c: 'root.4' as Colour }] : [])], delay: 0.4 }
        : null),
      paint: (s, live) => {
        const l = lv(live, force);
        // The node's origin is the tab's corner; the construction is written from the slab's corner.
        const ox = top ? -at : rise, oy = top ? rise : -at;
        s.translate(ox, oy);
        const f = fillFor(s);
        const t: Tones = (r) => tone(o.ramp, r);
        if (chosen) chosenTab(f, at, t);
        else if (spec.off) offTab(f, at, t, i === 0);
        else {
          otherTab(f, at, t, i === 0);
          otherTabState(f, at, t, l.hover, l.focus);
        }
        s.translate(-ox, -oy);
        const [ix, iy] = top ? [4, chosen ? 4 : 2] : [chosen ? 4 : 2, 4];
        if (spec.off) s.icon(spec.icon, ix, iy, 'flat', tone(o.ramp, 'sh'));
        else s.icon(spec.icon, ix, iy);
      },
    };
  };
  for (let i = 0; i < o.tabs.length; i++) if (i !== o.chosen) kids.push(tabNode(i, false));
  const chosenNode = o.chosen >= 0 && o.chosen < o.tabs.length ? tabNode(o.chosen, true) : null;
  return { id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, kids: [...kids, { ...body, x: 0, y: 0, id: undefined }, ...(chosenNode ? [chosenNode] : [])] };
}
