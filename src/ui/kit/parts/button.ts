import { ashlar, seedOf } from '../art/button';
import { centreX, measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Live, Node, Tip } from '../node';
import { type Colour, type Ramp, tone } from '../palette';
import type { Surface } from '../surface';
import type { PixelMap } from '../pixmap';
import { type Force, lv, outline } from './common';

export interface ButtonOpts {
  id?: string;
  x: number; y: number;
  /** The classic button is 200 by 20; half is 98; inside windows 12, 14 or 16 tall and its label plus 10 wide. */
  w: number; h?: number;
  label: string;
  /** The ramp of the slab a small button stands on; left out, the button is dressed stone, as on menus. */
  ramp?: Ramp;
  disabled?: boolean;
  /**
   * A door that loses something (leaving unsaved, deleting a world): on stone, hovered or pressed, the label turns
   * blood.lt, not ember.hi; on a slab its ink label is blood.dk.
   */
  warn?: boolean;
  force?: Force;
  onPress?: () => void;
  tip?: (live: Live) => Tip | null;
}

/**
 * The stone of a face 20 tall or more (art/button): its joints, pebbles and crack. Pressed, they drop a unit down and
 * right with the label, and what would fall on the far bevel is left off.
 */
function grain(s: Surface, w: number, h: number, label: string, tx: number, ty: number, pressed: boolean): void {
  const d = pressed ? 1 : 0;
  for (const [x, y, c] of ashlar(w, h, tx, ty, label ? measure(label) : 0, seedOf(label, w))) {
    if (x + d <= w - 4 && y + d <= h - 4) s.fill(x + d, y + d, 1, 1, c);
  }
}

/**
 * The bevel inside a button's outline, lit from the top left like every slab: `light` on the first row and column (and
 * `light2` just inside it, when pressed), `dark` on the last row and column with `dark2` outside it when given. The two
 * units where light meets dark, top right and bottom left, are left to the face.
 */
function bevel(s: Surface, w: number, h: number, light: Colour, light2: Colour | null, face: Colour, dark: Colour, dark2: Colour | null): void {
  s.fill(1, 1, w - 2, h - 2, face);
  const o = dark2 ? 1 : 0;
  if (dark2) {
    s.fill(2, h - 2, w - 3, 1, dark2);
    s.fill(w - 2, 2, 1, h - 4, dark2);
  }
  s.fill(2, h - 2 - o, w - 3 - o, 1, dark);
  s.fill(w - 2 - o, 2, 1, h - 4 - o, dark);
  s.fill(1, 1, w - 3, 1, light);
  s.fill(1, 2, 1, h - 4, light);
  if (light2) {
    s.fill(2, 2, w - 5, 1, light2);
    s.fill(2, 3, 1, h - 6, light2);
  }
}

/**
 * The frame of a button the keys are on and the pointer is not: the outline in runs of two, `salt` then `root.0`,
 * counted from each corner, so that focus is never read as the solid `salt` of a hovered button.
 */
function dashedOutline(s: Surface, w: number, h: number): void {
  outline(s, 0, 0, w, h, 'root.0');
  for (let i = 1; i < w - 1; i++) if (((i - 1) >> 1) % 2 === 0) { s.fill(i, 0, 1, 1, 'salt'); s.fill(w - 1 - i, h - 1, 1, 1, 'salt'); }
  for (let j = 1; j < h - 1; j++) if (((j - 1) >> 1) % 2 === 0) { s.fill(0, j, 1, 1, 'salt'); s.fill(w - 1, h - 1 - j, 1, 1, 'salt'); }
}

/**
 * A small button inside a window, in the ramp of the slab it stands on (5.6): a raised piece of that slab, `hi` on its
 * first row and column, `sh` and `dk` on its last, the label in ink. Hovered, its face lightens to `lt`; pressed, the
 * bevel turns over; disabled, it is a flat `sh` with the label faded. A door that loses something has its label in
 * blood.dk, the refusal's tone on a light face.
 */
function paintSlabButton(s: Surface, w: number, h: number, label: string, live: Live, disabled: boolean, ramp: Ramp, warn = false): void {
  const pressed = !disabled && live.down && live.hover;
  if (!disabled && live.focus && !live.hover) dashedOutline(s, w, h);
  else outline(s, 0, 0, w, h, 'root.0');
  let drop = 0;
  if (disabled) {
    s.fill(1, 1, w - 2, h - 2, tone(ramp, 'sh'));
  } else if (pressed) {
    bevel(s, w, h, tone(ramp, 'dk'), tone(ramp, 'sh'), tone(ramp, 'sh'), tone(ramp, 'face'), null);
    drop = 1;
  } else {
    bevel(s, w, h, tone(ramp, 'hi'), null, tone(ramp, live.hover ? 'lt' : 'face'), tone(ramp, 'sh'), tone(ramp, 'dk'));
  }
  const t = cut(label, w - 4);
  if (t) s.text(t, centreX(t, 0, w) + drop, Math.floor((h - 9) / 2) + drop, disabled ? 'ink.faded' : warn ? 'blood.dk' : 'ink');
}

/**
 * Paints a button at the origin (5.6): dressed stone on menus and the ground tile, or, given the ramp of the slab it
 * stands on, a small button of that slab.
 */
export function paintButton(s: Surface, w: number, h: number, label: string, live: Live, disabled = false, ramp?: Ramp, warn = false): void {
  if (ramp) { paintSlabButton(s, w, h, label, live, disabled, ramp, warn); return; }
  const pressed = !disabled && live.down && live.hover;
  // Hovered, the outline is solid ember.hi, the colour of the hovered label; with the keys on it and not the pointer,
  // dashed in salt; pressed into the slab, root.0.
  if (!disabled && !pressed && live.hover) outline(s, 0, 0, w, h, warn ? 'blood.lt' : 'ember.hi');
  else if (!disabled && !pressed && live.focus) dashedOutline(s, w, h);
  else outline(s, 0, 0, w, h, 'root.0');
  const tall = h >= 20;
  let text: Colour = 'salt', shadow = true, drop = 0;
  if (disabled) {
    s.fill(1, 1, w - 2, h - 3, 'stone.pit');
    s.fill(1, h - 2, w - 2, 1, 'stone.dk');
    text = 'root.4'; shadow = false;
  } else if (pressed) {
    // Sunk: shade under the top lip, the light caught on the lower one, the label still lit as hovered and moved a
    // unit down and right with the face.
    bevel(s, w, h, 'stone.pit', 'stone.dk', 'stone.sh', 'stone.lt', null);
    text = warn ? 'blood.lt' : 'ember.hi';
    drop = 1;
  } else {
    bevel(s, w, h, live.hover ? 'stone.hi' : 'stone.lt', null, 'stone.sh', 'stone.dk', 'stone.pit');
    if (live.hover) text = warn ? 'blood.lt' : 'ember.hi';
  }
  const t = cut(label, w - 4);
  const tx = centreX(t, 0, w), ty = Math.floor((h - 9) / 2);
  if (tall && !disabled) grain(s, w, h, t, tx, ty, pressed);
  s.text(t, tx + drop, ty + drop, text, shadow);
}

/** A button (5.6). It shows pressed while held over it and acts when the press comes up over it. */
export function button(o: ButtonOpts): Node {
  const h = o.h ?? 20;
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h,
    focus: !o.disabled,
    takes: true,
    paint: (s, live) => paintButton(s, o.w, h, o.label, lv(live, o.force), o.disabled, o.ramp, o.warn),
    tip: o.tip,
    on: o.disabled ? undefined : { click: () => o.onPress?.() },
  };
}

/** A small button as wide as its label plus 10. */
export function smallButton(o: Omit<ButtonOpts, 'w'> & { w?: number }, measureLabel: (s: string) => number): Node {
  return button({ ...o, w: o.w ?? measureLabel(o.label) + 10, h: o.h ?? 14 });
}

/** The square button that adds, 12 by 12 or, on a stat's row of 12, 11 by 11 so that a column of them keeps a unit apart. */
export function plusButton(o: Omit<ButtonOpts, 'w' | 'h' | 'label'> & { size?: 10 | 11 | 12 }): Node {
  const n = o.size ?? 12;
  return button({ ...o, w: n, h: n, label: '+' });
}

/**
 * A square button that carries a mark in place of a label (5.6): the small button's stone, the mark centred on it in
 * salt with its shadow, dropping a unit while pressed. Its name is said by its tooltip.
 */
export function iconButton(o: Omit<ButtonOpts, 'w' | 'h' | 'label'> & { size?: number; mark: PixelMap; name: string; says?: string }): Node {
  const n = o.size ?? 16;
  return {
    id: o.id, x: o.x, y: o.y, w: n, h: n,
    focus: !o.disabled,
    takes: true,
    paint: (s, live) => {
      const l = lv(live, o.force);
      paintButton(s, n, n, '', l, o.disabled, o.ramp);
      const drop = !o.disabled && l.down && l.hover ? 1 : 0;
      const x = Math.floor((n - o.mark.w) / 2) + drop, y = Math.floor((n - 2 - o.mark.h) / 2) + drop;
      s.map(o.mark, x, y);
    },
    tip: o.tip ?? (() => ({ lines: [{ text: o.name, c: 'salt' }, ...(o.says ? [{ text: o.says, c: 'root.4' as const }] : [])], delay: 0.4 })),
    on: o.disabled ? undefined : { click: () => o.onPress?.() },
  };
}
