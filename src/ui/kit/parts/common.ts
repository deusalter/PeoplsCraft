import type { Live, Node } from '../node';
import { type Colour, type Ramp, tone } from '../palette';
import type { Surface } from '../surface';

/** A state a sheet or a test pins on a part, whatever the pointer does. */
export type Force = Partial<Pick<Live, 'hover' | 'down' | 'focus'>>;

export function lv(live: Live, f?: Force): Live { return f ? { ...live, ...f } : live; }

/** What a part may be sunk in or stand on: one of the three slab ramps, the ground tile, or a dark plate. */
export type Host = Ramp | 'ground' | 'dark';

/** The light edge of something sunk in a host (5.8): the slab's `hi`, `stone.lt` on the ground tile, `root.3` on dark. */
export function hostHi(h: Host): Colour { return h === 'ground' ? 'stone.lt' : h === 'dark' ? 'root.3' : tone(h, 'hi'); }

/** A ring one unit deep just inside a rectangle. */
export function ring(s: Surface, x: number, y: number, w: number, h: number, c: Colour): void {
  s.fill(x, y, w, 1, c);
  s.fill(x, y + h - 1, w, 1, c);
  s.fill(x, y + 1, 1, h - 2, c);
  s.fill(x + w - 1, y + 1, 1, h - 2, c);
}

/** A ring with its four corner units left out: the outline of every raised part. */
export function outline(s: Surface, x: number, y: number, w: number, h: number, c: Colour): void {
  s.fill(x + 1, y, w - 2, 1, c);
  s.fill(x + 1, y + h - 1, w - 2, 1, c);
  s.fill(x, y + 1, 1, h - 2, c);
  s.fill(x + w - 1, y + 1, 1, h - 2, c);
}

/**
 * A rectangle sunk in its host by the edges of a well (5.8): `root.0` along the top and left, the host's light edge
 * along the bottom and right, the two corners where they meet left to the host, and a floor.
 */
export function sunk(s: Surface, x: number, y: number, w: number, h: number, host: Host, floor: Colour = 'root.1'): void {
  s.fill(x, y, w - 1, 1, 'root.0');
  s.fill(x, y + 1, 1, h - 2, 'root.0');
  const hi = hostHi(host);
  s.fill(x + 1, y + h - 1, w - 1, 1, hi);
  s.fill(x + w - 1, y + 1, 1, h - 2, hi);
  s.fill(x + 1, y + 1, w - 2, h - 2, floor);
}

/** A node that only paints. */
export function painted(x: number, y: number, w: number, h: number, paint: (s: Surface, live: Live) => void, extra: Partial<Node> = {}): Node {
  return { x, y, w, h, paint, ...extra };
}

/** A node that only holds others. */
export function group(x: number, y: number, w: number, h: number, kids: Node[]): Node { return { x, y, w, h, kids }; }
