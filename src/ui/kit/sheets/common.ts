// What the sheets of parts share: a page of 474 by 262 over the dimmed world, and names written beside parts.
import { TEXT } from '../font/face';
import { measure } from '../font/measure';
import type { Node, Ui } from '../node';
import type { Colour } from '../palette';
import { centred } from '../scale';

export interface Sheet {
  title: string;
  /** The world stands behind it, dimmed; otherwise the ground tile fills the screen. */
  world: boolean;
  build(ui: Ui): Node;
}

export const PAGE_W = 474;
export const PAGE_H = 262;

/** A page of parts centred over the world behind a window's dim. */
export function page(ui: Ui, kids: Node[]): Node {
  const at = centred(ui.w, ui.h, PAGE_W, PAGE_H);
  return {
    x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [{ x: Math.max(0, at.x), y: Math.max(0, at.y), w: PAGE_W, h: PAGE_H, kids }],
  };
}

/** A name in ink on a light face. */
export function ink(x: number, y: number, text: string, c: Colour = 'ink'): Node {
  return { x, y, w: Math.max(1, measure(text)), h: TEXT.height, paint: (s) => { s.text(text, 0, 0, c); } };
}

/** A name in salt with its shadow, on dark or on the world. */
export function salt(x: number, y: number, text: string, c: Colour = 'salt'): Node {
  return { x, y, w: Math.max(1, measure(text) + 1), h: TEXT.height + 1, paint: (s) => { s.text(text, 0, 0, c, true); } };
}
