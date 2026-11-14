import { TITLE_MARK } from '../art/title';
import { measure } from '../font/measure';
import type { Node } from '../node';

export const KEYCAP_H = 14;

/** The lock of a key that cannot be changed: a shackle over a body, 5 by 5, in the cap's ink. */
const LOCK = ['.###.', '.#.#.', '#####', '##.##', '#####'];

/**
 * A key cap (5.28): 14 tall, its label plus 6 wide, or as wide as asked with the label centred, so that the caps of a
 * list stand as one column. Outline, a `stone.hi` row, the `stone.lt` face with the label's cell at y 2 so its capitals
 * stand on rows 3 to 9 with a clear row above them, two rows of `stone.dk`, outline. A cap that cannot be rebound
 * carries a lock 5 by 5 at its right, 2 in, and its label is centred in what is left.
 */
export function keycap(o: { x: number; y: number; label: string; w?: number; locked?: boolean }): Node {
  const room = o.locked ? 7 : 0;
  const w = Math.max(o.w ?? 0, measure(o.label) + 6 + room);
  const lx = Math.floor((w - room - measure(o.label)) / 2);
  return {
    x: o.x, y: o.y, w, h: KEYCAP_H,
    paint: (s) => {
      s.fill(1, 0, w - 2, 1, 'root.0'); s.fill(1, 13, w - 2, 1, 'root.0');
      s.fill(0, 1, 1, 12, 'root.0'); s.fill(w - 1, 1, 1, 12, 'root.0');
      s.fill(1, 1, w - 2, 1, 'stone.hi');
      s.fill(1, 2, w - 2, 9, 'stone.lt');
      s.fill(1, 11, w - 2, 2, 'stone.dk');
      s.text(o.label, lx, 2, 'ink');
      if (o.locked) LOCK.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '#') s.fill(w - 7 + i, 4 + j, 1, 1, 'ink'); });
    },
  };
}

/** The title mark (5.28): one pixel map, never scaled. */
export function titleMark(o: { cx: number; y: number }): Node {
  return { x: o.cx - Math.floor(TITLE_MARK.w / 2), y: o.y, w: TITLE_MARK.w, h: TITLE_MARK.h, paint: (s) => s.map(TITLE_MARK, 0, 0) };
}
