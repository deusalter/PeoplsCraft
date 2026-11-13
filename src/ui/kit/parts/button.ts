import { centreX, measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Live, Node, Tip } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
import type { PixelMap } from '../pixmap';
import { type Force, lv, outline } from './common';

export interface ButtonOpts {
  id?: string;
  x: number; y: number;
  /** The classic button is 200 by 20; half is 98; inside windows 12, 14 or 16 tall and its label plus 10 wide. */
  w: number; h?: number;
  label: string;
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

/** Paints a button at the origin (5.6): always dressed stone, whatever it stands on. */
export function paintButton(s: Surface, w: number, h: number, label: string, live: Live, disabled = false, key = label): void {
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
    s.fill(1, 1, w - 2, 1, 'stone.pit');
    s.fill(1, 2, w - 2, 1, 'stone.dk');
    s.fill(1, 3, w - 2, h - 5, 'stone.sh');
    s.fill(1, h - 2, w - 2, 1, 'stone.dk');
    drop = 1;
  } else {
    s.fill(1, 1, w - 2, 1, live.hover ? 'stone.hi' : 'stone.lt');
    s.fill(1, 2, w - 2, h - 5, 'stone.sh');
    s.fill(1, h - 3, w - 2, 1, 'stone.dk');
    s.fill(1, h - 2, w - 2, 1, 'stone.pit');
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
    paint: (s, live) => paintButton(s, o.w, h, o.label, lv(live, o.force), o.disabled, o.id ?? o.label),
    tip: o.tip,
    on: o.disabled ? undefined : { click: () => o.onPress?.() },
  };
}

/** A small button as wide as its label plus 10. */
export function smallButton(o: Omit<ButtonOpts, 'w'> & { w?: number }, measureLabel: (s: string) => number): Node {
  return button({ ...o, w: o.w ?? measureLabel(o.label) + 10, h: o.h ?? 14 });
}

/** The 12 by 12 button that adds: a plus of salt with its shadow. */
export function plusButton(o: Omit<ButtonOpts, 'w' | 'h' | 'label'>): Node {
  return button({ ...o, w: 12, h: 12, label: '+' });
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
      paintButton(s, n, n, '', l, o.disabled);
      const drop = !o.disabled && l.down && l.hover ? 1 : 0;
      const x = Math.floor((n - o.mark.w) / 2), y = Math.floor((n - 2 - o.mark.h) / 2) + drop;
      s.map(o.mark, x, y);
    },
    tip: o.tip ?? (() => ({ lines: [{ text: o.name, c: 'salt' }, ...(o.says ? [{ text: o.says, c: 'root.4' as const }] : [])], delay: 0.4 })),
    on: o.disabled ? undefined : { click: () => o.onPress?.() },
  };
}
