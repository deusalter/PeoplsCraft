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
  /** The classic button is 200 by 20; half is 98; inside windows 14 or 16 tall (12 only for a label with no descender) and its label plus 10 wide. */
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
 * The stone of a face 20 tall or more (art/button): its pebbles and crack. Pressed, they drop a unit down and
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
 * The mark of the button the keys are on and the pointer is not: a wedge 3 by 5 pointing at the label, its point 4
 * units left of it so that its shadow stands 2 clear of the first letter. It stands inside the button, since half
 * buttons stand only 4 apart and one outside would fall on the next.
 */
const FOCUS_WEDGE = ['#..', '##.', '###', '##.', '#..'];

function focusWedge(s: Surface, x: number, y: number, c: Colour, shadow: boolean): void {
  FOCUS_WEDGE.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      if (r[i] !== '#') continue;
      if (shadow) s.fill(x + i + 1, y + j + 1, 1, 1, 'root.0');
    }
  });
  FOCUS_WEDGE.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') s.fill(x + i, y + j, 1, 1, c); });
}

/**
 * A small button inside a window, in the ramp of the slab it stands on (5.6): a raised piece of that slab, `hi` on its
 * first row and column, `dk` (`pit` on timber) on its last, the label in ink. One dark unit and not two, so that the
 * descenders of a 14-tall button end on face and not on its edge. Hovered, its face lightens to `lt`; pressed, the
 * bevel turns over; disabled, it is flat, `sh` with faded ink on clay, `dk` under the slab's face tone on stone and timber. A door that loses something has its label in
 * blood.dk, the refusal's tone on a light face.
 */
function paintSlabButton(s: Surface, w: number, h: number, label: string, live: Live, disabled: boolean, ramp: Ramp, warn = false): void {
  const pressed = !disabled && live.down && live.hover;
  // Focus with the pointer elsewhere is a solid salt outline: a dashed one was a browser's focus ring, not a drawn state.
  outline(s, 0, 0, w, h, !disabled && live.focus && !live.hover ? 'salt' : 'root.0');
  let drop = 0;
  if (disabled) {
    // Flat, with no light row: on stone and timber a face of `dk`, a step under the slab's shade, so that it never
    // stands in the face of a menu's enabled button (`stone.sh` under salt), which a disabled Travel was read as.
    s.fill(1, 1, w - 2, h - 2, tone(ramp, ramp === 'clay' ? 'sh' : 'dk'));
  } else if (pressed) {
    bevel(s, w, h, tone(ramp, 'dk'), tone(ramp, 'sh'), tone(ramp, 'sh'), tone(ramp, 'face'), null);
    drop = 1;
  } else {
    bevel(s, w, h, tone(ramp, 'hi'), null, tone(ramp, live.hover ? 'lt' : 'face'), tone(ramp, ramp === 'timber' ? 'pit' : 'dk'), null);
  }
  const t = cut(label, w - 4);
  // Disabled on stone or timber the label is the slab's own face tone on the flat dark face, grey as the tradition
  // writes a disabled label: faded ink on it could not be read, and salt made it an enabled menu button. On clay faded
  // ink still reads.
  const off: Colour = ramp === 'clay' ? 'ink.faded' : tone(ramp, 'face');
  if (t) s.text(t, centreX(t, 0, w) + drop, Math.floor((h - 9) / 2) + drop, disabled ? off : warn ? 'blood.dk' : 'ink');
}

/**
 * Paints a button at the origin (5.6): dressed stone on menus and the ground tile, or, given the ramp of the slab it
 * stands on, a small button of that slab.
 */
export function paintButton(s: Surface, w: number, h: number, label: string, live: Live, disabled = false, ramp?: Ramp, warn = false): void {
  if (ramp) { paintSlabButton(s, w, h, label, live, disabled, ramp, warn); return; }
  const pressed = !disabled && live.down && live.hover;
  // Hovered, the outline is solid ember.hi, the colour of the hovered label; with the keys on it and not the pointer,
  // solid salt, the label kept salt and the focus wedge before it; pressed into the slab, root.0.
  const focused = !disabled && !pressed && !live.hover && live.focus;
  if (!disabled && !pressed && live.hover) outline(s, 0, 0, w, h, warn ? 'blood.lt' : 'ember.hi');
  else outline(s, 0, 0, w, h, focused ? 'salt' : 'root.0');
  const tall = h >= 20;
  let text: Colour = 'salt', shadow = true, drop = 0;
  if (disabled) {
    // Still a slab of stone, two steps darker, its bevel kept and its face bare: flat dark it read as a fourth field.
    bevel(s, w, h, 'stone.sh', null, 'stone.dk', 'stone.pit', 'stone.pit');
    text = 'root.4';
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
  if (focused && tx - 7 >= 3) focusWedge(s, tx - 7, ty + 2, 'salt', shadow);
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
