import { GROUND } from '../art/ground';
import { NODE_FRAMES, type NodeShape, type NodeState } from '../art/tree';
import { SMALL } from '../font/face';
import { centreX, measure } from '../font/measure';
import type { Live, Node, Tip, Ui } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
import { type Force, type Host, lv, sunk } from './common';
import { paintSelector } from './hud';

export const LATTICE = 40;
export const NODE = 26;

export interface TreeNodeSpec {
  id: string;
  /** Place on the lattice of 40 by 40. */
  col: number; row: number;
  shape: NodeShape;
  state: NodeState;
  icon: string;
  ranks?: [number, number];
  tip?: (live: Live) => Tip | null;
  force?: Force;
}

export interface TreeOpts {
  id: string;
  x: number; y: number; w: number; h: number;
  host: Host;
  nodes: TreeNodeSpec[];
  /** Pairs of node ids. */
  links: [string, string][];
  chosen?: string;
  onChoose?: (id: string) => void;
  ui: Ui;
}

const CORE: Record<NodeState, Colour> = { locked: 'root.3', open: 'root.4', earned: 'salt' };

/** A link's path: along a row or a column, or both with a square elbow at the midpoint across. */
function path(a: TreeNodeSpec, b: TreeNodeSpec): [number, number][] {
  const c = (n: TreeNodeSpec): [number, number] => [n.col * LATTICE + NODE / 2, n.row * LATTICE + NODE / 2];
  const [ax, ay] = c(a), [bx, by] = c(b);
  if (ax === bx || ay === by) return [[ax, ay], [bx, by]];
  const mx = Math.floor((ax + bx) / 2);
  return [[ax, ay], [mx, ay], [mx, by], [bx, by]];
}

function run(s: Surface, pts: [number, number][], grow: number, c: Colour): void {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const x = Math.min(x0, x1) - grow, y = Math.min(y0, y1) - grow;
    s.fill(x, y, Math.abs(x1 - x0) + 1 + grow * 2, Math.abs(y1 - y0) + 1 + grow * 2, c);
  }
}

/**
 * A tree (5.20): a well whose floor is the ground tile and pans by whole units under its frame, nodes of 26 on a lattice
 * of 40 in square, cut or spiked frames, and links three wide drawn under them.
 */
export function tree(o: TreeOpts): Node {
  const byId = new Map(o.nodes.map((n) => [n.id, n]));
  const panId = `${o.id}.pan`;
  const pan = o.ui.scroll(panId);
  const px = Math.round(pan % 100000), py = Math.round(Math.floor(pan / 100000));
  const ox = 8 - px, oy = 8 - py;
  const fw = o.w - 2, fh = o.h - 2;
  const maxX = Math.max(0, Math.max(0, ...o.nodes.map((n) => n.col * LATTICE + NODE + 16)) - fw);
  const maxY = Math.max(0, Math.max(0, ...o.nodes.map((n) => n.row * LATTICE + NODE + (n.ranks ? 8 : 0) + 16)) - fh);
  let from = { x: px, y: py };
  const nodeKids: Node[] = o.nodes.map((n): Node => ({
    id: n.id, x: ox + n.col * LATTICE, y: oy + n.row * LATTICE, w: NODE, h: NODE + (n.ranks ? 8 : 0),
    takes: true, focus: true,
    tip: n.tip,
    on: { down: () => o.onChoose?.(n.id) },
    paint: (s, live) => {
      const l = lv(live, n.force);
      s.map(NODE_FRAMES[n.shape][n.state], 0, 0);
      if (n.state === 'locked') s.icon(n.icon, 5, 5, 'flat', 'root.3');
      else s.icon(n.icon, 5, 5);
      if (n.id === o.chosen || l.focus) paintSelector(s, -2, -2, 30);
      if (n.ranks) {
        const t = `${n.ranks[0]}/${n.ranks[1]}`;
        const tx = centreX(t, 0, NODE, SMALL);
        // The ranks sit on a scrap of root.0 so that a link passing under them does not run through the figures.
        s.fill(tx - 2, NODE + 1, measure(t, SMALL) + 4, 9, 'root.0');
        s.text(t, tx, NODE + 2, n.ranks[0] >= n.ranks[1] ? 'growth.lt' : 'salt', true, SMALL);
      }
    },
  }));
  const field: Node = {
    id: panId, x: 0, y: 0, w: fw, h: fh, takes: true,
    on: {
      down: () => { from = { x: px, y: py }; },
      drag: (e) => {
        if (e.phase === 'end') return;
        // The field pans no further than its farthest node and a margin of 8 beyond it.
        const nx = Math.min(maxX, Math.max(0, from.x - e.dx)), ny = Math.min(maxY, Math.max(0, from.y - e.dy));
        o.ui.setScroll(panId, nx + ny * 100000);
        o.ui.invalidate();
      },
    },
    paint: (s) => {
      s.tile(GROUND, 0, 0, fw, fh, px, py);
      s.translate(ox, oy);
      const links = o.links.map(([a, b]) => ({ a: byId.get(a)!, b: byId.get(b)! })).filter((l) => l.a && l.b);
      for (const l of links) run(s, path(l.a, l.b), 1, 'root.0');
      for (const l of links) {
        const both = l.a.state === 'earned' && l.b.state === 'earned';
        const to = l.a.state === 'earned' ? l.b : l.b.state === 'earned' ? l.a : l.a.state === 'locked' ? l.a : l.b;
        run(s, path(l.a, l.b), 0, both ? 'salt' : CORE[to.state]);
      }
      s.translate(-ox, -oy);
    },
  };
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h: o.h,
    paint: (s) => sunk(s, 0, 0, o.w, o.h, o.host),
    kids: [{ x: 1, y: 1, w: fw, h: fh, clip: true, kids: [field, ...nodeKids] }],
  };
}
