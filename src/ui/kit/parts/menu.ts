import { GROUND } from '../art/ground';
import { SMALL, TEXT } from '../font/face';
import { centreX, measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Node, Ui } from '../node';
import type { Colour } from '../palette';

/** The width of a full-screen menu's column, and the screen its table is written for. */
export const COLUMN_W = 200;
export const MENU_W = 427;
export const MENU_H = 240;
const COLUMN_X = 113;

/**
 * Where a unit of a full-screen menu's table lands on this screen (section 3): the column of 200 is centred on x, so
 * that a table's x of 113 is the column's left on any width, and y is measured from the top of a block 240 tall that
 * is centred on the screen.
 */
export function menuOrigin(ui: Ui): { dx: number; dy: number } {
  return { dx: Math.floor((ui.w - COLUMN_W) / 2) - COLUMN_X, dy: Math.floor((ui.h - MENU_H) / 2) };
}

/** A full-screen menu on the ground tile, its parts placed by the table's coordinates. */
export function groundMenu(ui: Ui, id: string, kids: Node[], extra: Partial<Node> = {}): Node {
  const { dx, dy } = menuOrigin(ui);
  return {
    id, x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.tile(GROUND, 0, 0, ui.w, ui.h),
    kids: kids.map((k) => ({ ...k, x: k.x + dx, y: k.y + dy })),
    ...extra,
  };
}

/** A full-screen menu over the world under one wash: the pause's three quarters of root.0, the fall's blood. */
export function washedMenu(ui: Ui, id: string, wash: { c: Colour; quarters: 1 | 2 | 3 }, kids: Node[], extra: Partial<Node> = {}): Node {
  const { dx, dy } = menuOrigin(ui);
  return {
    id, x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, wash.c, wash.quarters),
    kids: kids.map((k) => ({ ...k, x: k.x + dx, y: k.y + dy })),
    ...extra,
  };
}

/** The form of a full-screen menu (New world, Join a server): its rows of a label over a field, in table units. */
export const FORM = {
  /** The screen's title, centred on the column. */
  titleY: 20,
  /** The first label; a field stands 10 under its label. */
  top: 40,
  fieldH: 20,
  /**
   * From one label to the next: the label (10), the field (20) and 12 between the groups, in which a field's answer is
   * written straight under it only when there is one. A further 12 kept clear for the answer read as a missing row.
   */
  pitch: 42,
} as const;

/** Where the buttons of a form of n rows start: the same 12 under the last field as between the groups. */
export function formButtonsY(rows: number): number { return FORM.top + FORM.pitch * (rows - 1) + 10 + FORM.fieldH + 12; }

/** The screen's title over a form: centred on the column, salt with its shadow. */
export function formTitle(text: string): Node {
  return line({ x: COLUMN_X, y: FORM.titleY, w: COLUMN_W, text, c: 'salt', shadow: true, centre: true });
}

/**
 * One line of text in a box, left-aligned or centred, cut with `…` when it is too long. On the ground tile or the world
 * it is drawn with its shadow; on a light face without.
 */
export function line(o: { x: number; y: number; w: number; text: string; c: Colour; shadow: boolean; centre?: boolean; small?: boolean }): Node {
  const face = o.small ? SMALL : TEXT;
  const t = cut(o.text, o.w, face);
  return {
    x: o.x, y: o.y, w: o.w + (o.shadow ? 1 : 0), h: face.height + (o.shadow ? 1 : 0),
    paint: (s) => { s.text(t, o.centre ? centreX(t, 0, o.w, face) : 0, 0, o.c, o.shadow, face); },
  };
}

/** How wide a line is drawn, for laying a second line after it. */
export function lineW(text: string, small = false): number { return measure(text, small ? SMALL : TEXT); }
