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
  force?: Force;
  onPress?: () => void;
  tip?: (live: Live) => Tip | null;
}

type Mark = readonly (readonly [number, number])[];

// Chisel strokes 2 to 4 long at four angles; the last unit of each is its lower end.
const STROKES: readonly Mark[] = [
  [[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[2, 0], [1, 1], [0, 2]], [[3, 0], [2, 0], [1, 1], [0, 1]], [[1, 0], [0, 1]],
  [[0, 0], [1, 1], [2, 2]], [[0, 0], [1, 0], [2, 1], [3, 1]], [[0, 0], [1, 1]],
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The tooling of a face 20 tall: three to five chisel strokes in `stone.dk`, each with a `stone.lt` unit under its
 * lower end, placed from the button's own key so that no two buttons in a column carry the same marks. They stand
 * only in the bands 3 to 30 units in from either end, at least 6 apart, and never inside the label's box widened by 2;
 * a few single pits are scattered over the rest of the face.
 */
function tooling(s: Surface, w: number, h: number, key: string, box: [number, number, number, number], drop: number): void {
  let seed = hash(key) || 1;
  const rnd = (n: number): number => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
  const want = 3 + rnd(3);
  const placed: [number, number][] = [];
  let marks = 0;
  const bands = [[3, Math.min(30, w - 3)], [Math.max(3, w - 30), w - 3]];
  for (let tries = 0; tries < 80 && marks < want; tries++) {
    const mark = STROKES[rnd(STROKES.length)];
    const band = bands[marks % 2];
    const x0 = band[0] + rnd(Math.max(1, band[1] - band[0] - 3));
    const y0 = 3 + rnd(h - 10);
    const units = mark.map(([dx, dy]) => [x0 + dx, y0 + dy] as [number, number]);
    const [lx, ly] = units[units.length - 1];
    const all = [...units, [lx, ly + 1] as [number, number]];
    const fits = all.every(([x, y]) => x >= 3 && x <= w - 4 && y >= 3 && y <= h - 4
      && !(x >= box[0] && x < box[0] + box[2] && y >= box[1] && y < box[1] + box[3]));
    const clear = placed.every(([px, py]) => all.every(([x, y]) => Math.max(Math.abs(x - px), Math.abs(y - py)) >= 6));
    if (!fits || !clear) continue;
    for (const [x, y] of units) s.fill(x, y + drop, 1, 1, 'stone.dk');
    s.fill(lx, ly + 1 + drop, 1, 1, 'stone.lt');
    for (const u of all) placed.push(u);
    marks++;
  }
  // Single pits anywhere on the face, about one to every 25 units, clear of the strokes and the label.
  const pits = Math.floor(w / 25);
  for (let n = 0, tries = 0; n < pits && tries < 60; tries++) {
    const x = 3 + rnd(w - 6), y = 3 + rnd(h - 7);
    if (x >= box[0] && x < box[0] + box[2] && y >= box[1] && y < box[1] + box[3]) continue;
    if (!placed.every(([px, py]) => Math.max(Math.abs(x - px), Math.abs(y - py)) >= 4)) continue;
    s.fill(x, y + drop, 1, 1, 'stone.dk');
    placed.push([x, y]);
    n++;
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
 * A small button inside a window, in the ramp of the slab it stands on (5.6): a raised piece of that slab, `hi` on its
 * first row and column, `sh` and `dk` on its last, the label in ink. Hovered, its face lightens to `lt`; pressed, the
 * bevel turns over; disabled, it is a flat `sh` with the label faded.
 */
function paintSlabButton(s: Surface, w: number, h: number, label: string, live: Live, disabled: boolean, ramp: Ramp): void {
  const pressed = !disabled && live.down && live.hover;
  outline(s, 0, 0, w, h, !disabled && live.focus && !live.hover ? 'salt' : 'root.0');
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
  if (t) s.text(t, centreX(t, 0, w), Math.floor((h - 9) / 2) + drop, disabled ? 'ink.faded' : 'ink');
}

/**
 * Paints a button at the origin (5.6): dressed stone on menus and the ground tile, or, given the ramp of the slab it
 * stands on, a small button of that slab.
 */
export function paintButton(s: Surface, w: number, h: number, label: string, live: Live, disabled = false, key = label, ramp?: Ramp): void {
  if (ramp) { paintSlabButton(s, w, h, label, live, disabled, ramp); return; }
  const hot = !disabled && (live.hover || live.focus);
  const pressed = !disabled && live.down && live.hover;
  outline(s, 0, 0, w, h, hot ? 'salt' : 'root.0');
  const tall = h >= 20;
  let text: Colour = 'salt', shadow = true, drop = 0;
  if (disabled) {
    s.fill(1, 1, w - 2, h - 3, 'stone.pit');
    s.fill(1, h - 2, w - 2, 1, 'stone.dk');
    text = 'root.4'; shadow = false;
  } else if (pressed) {
    bevel(s, w, h, 'stone.pit', 'stone.dk', 'stone.sh', 'stone.dk', null);
    drop = 1;
  } else {
    bevel(s, w, h, live.hover ? 'stone.hi' : 'stone.lt', null, 'stone.sh', 'stone.dk', 'stone.pit');
    if (live.hover) text = 'ember.hi';
  }
  const t = cut(label, w - 4);
  const tx = centreX(t, 0, w), ty = Math.floor((h - 9) / 2);
  if (tall && !disabled) tooling(s, w, h, key, [tx - 2, ty - 2, measure(t) + 5, 14], drop);
  s.text(t, tx, ty + drop, text, shadow);
}

/** A button (5.6). It shows pressed while held over it and acts when the press comes up over it. */
export function button(o: ButtonOpts): Node {
  const h = o.h ?? 20;
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h,
    focus: !o.disabled,
    takes: true,
    paint: (s, live) => paintButton(s, o.w, h, o.label, lv(live, o.force), o.disabled, o.id ?? o.label, o.ramp),
    tip: o.tip,
    on: o.disabled ? undefined : { click: () => o.onPress?.() },
  };
}

/** A small button as wide as its label plus 10. */
export function smallButton(o: Omit<ButtonOpts, 'w'> & { w?: number }, measureLabel: (s: string) => number): Node {
  return button({ ...o, w: o.w ?? measureLabel(o.label) + 10, h: o.h ?? 14 });
}

/** The square button that adds, 12 by 12 or, on a stat's row of 12, 11 by 11 so that a column of them keeps a unit apart. */
export function plusButton(o: Omit<ButtonOpts, 'w' | 'h' | 'label'> & { size?: 11 | 12 }): Node {
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
      paintButton(s, n, n, '', l, o.disabled, '', o.ramp);
      const drop = !o.disabled && l.down && l.hover ? 1 : 0;
      const x = Math.floor((n - o.mark.w) / 2), y = Math.floor((n - 2 - o.mark.h) / 2) + drop;
      s.map(o.mark, x, y);
    },
    tip: o.tip ?? (() => ({ lines: [{ text: o.name, c: 'salt' }, ...(o.says ? [{ text: o.says, c: 'root.4' as const }] : [])], delay: 0.4 })),
    on: o.disabled ? undefined : { click: () => o.onPress?.() },
  };
}
