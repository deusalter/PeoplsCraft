import { TITLE_MARK } from '../art/title';
import { measure } from '../font/measure';
import type { Node } from '../node';

/** A key cap (5.28): 12 tall, its label plus 6 wide, `stone.hi` top row, `stone.lt` face, two rows of `stone.sh`, ink. */
export function keycap(o: { x: number; y: number; label: string }): Node {
  const w = measure(o.label) + 6;
  return {
    x: o.x, y: o.y, w, h: 12,
    paint: (s) => {
      s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, 11, w - 2, 1, 'root.0');
      s.fill(0, 1, 1, 10, 'root.0'); s.fill(w - 1, 1, 1, 10, 'root.0');
      s.fill(1, 1, w - 2, 1, 'stone.hi');
      s.fill(1, 2, w - 2, 7, 'stone.lt');
      s.fill(1, 9, w - 2, 2, 'stone.sh');
      s.text(o.label, 3, 0, 'ink');
    },
  };
}

/** The title mark (5.28): one pixel map of 187 by 36, never scaled. */
export function titleMark(o: { cx: number; y: number }): Node {
  return { x: o.cx - Math.floor(TITLE_MARK.w / 2), y: o.y, w: TITLE_MARK.w, h: TITLE_MARK.h, paint: (s) => s.map(TITLE_MARK, 0, 0) };
}
