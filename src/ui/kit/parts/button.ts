import { centreX } from '../font/measure';
import { cut } from '../font/wrap';
import type { Live, Node, Tip } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
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

/** The tooling of a face 20 tall: strokes 3 long rising to the right in `stone.dk`, every 16 from x 6 and from x 14. */
function tooling(s: Surface, w: number, drop: number): void {
  for (let x = 6; x + 2 <= w - 3; x += 16) for (let i = 0; i < 3; i++) s.fill(x + i, 5 - i + drop, 1, 1, 'stone.dk');
  for (let x = 14; x + 2 <= w - 3; x += 16) for (let i = 0; i < 3; i++) s.fill(x + i, 15 - i + drop, 1, 1, 'stone.dk');
}

/** Paints a button at the origin (5.6): always dressed stone, whatever it stands on. */
export function paintButton(s: Surface, w: number, h: number, label: string, live: Live, disabled = false): void {
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
  if (tall && !disabled) tooling(s, w, drop);
  const t = cut(label, w - 4);
  s.text(t, centreX(t, 0, w), Math.floor((h - 9) / 2) + drop, text, shadow);
}

/** A button (5.6). It shows pressed while held over it and acts when the press comes up over it. */
export function button(o: ButtonOpts): Node {
  const h = o.h ?? 20;
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h,
    focus: !o.disabled,
    takes: true,
    paint: (s, live) => paintButton(s, o.w, h, o.label, lv(live, o.force), o.disabled),
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
