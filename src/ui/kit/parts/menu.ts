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
  titleY: 16,
  /** The first label's cell. */
  top: 36,
  /** From a label's cell to its field: its letters stand 3 clear above the field. */
  label: 11,
  fieldH: 20,
  /**
   * From one label to the next: the label (11), the field (20), the 11 under it that hold a field's answer with its
   * letters 2 under the field, and 8 more between the groups. With the next label straight under the answer, an answer
   * read as the label of the field below it.
   */
  pitch: 50,
} as const;

/** The field of row i of a form. */
export function formFieldY(i: number): number { return FORM.top + i * FORM.pitch + FORM.label; }

/** Where the buttons of a form of n rows start: 17 under the last field, 6 under its answer's cell. */
export function formButtonsY(rows: number): number { return formFieldY(rows - 1) + FORM.fieldH + 17; }

/**
 * A label over a field on the ground: `stone.lt` with its shadow, a step quieter than the salt of what is typed in the
 * field, so that a label and an entered name never read as the same kind of text.
 */
export function formLabel(i: number, text: string): Node {
  return line({ x: COLUMN_X, y: FORM.top + i * FORM.pitch, w: COLUMN_W, text, c: 'stone.lt', shadow: true });
}

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
