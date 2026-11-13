import { PLANKS } from '../art/ground';
import { NODE_FOOT, NODE_FRAMES, type NodeShape, type NodeState } from '../art/tree';
import { coded } from '../pixmap';
import type { Live, Node, Tip, Ui } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
import { type Force, type Host, lv, sunk } from './common';
import { paintSelector } from './hud';
import { LOCK } from './slot';

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

/** The light line of a link, by the state of the node it runs to; its dark line under it is always root.0. */
const LIGHT: Record<NodeState, Colour> = { locked: 'root.3', open: 'root.4', earned: 'salt' };

/** Space left between the field's edge and the nearest whole node, so that a node is never cut where it rests. */
const MARGIN = 4;

/** A link's light line: along a row or a column, or both with a square elbow at the midpoint across. */
function path(a: TreeNodeSpec, b: TreeNodeSpec): [number, number][] {
  const c = (n: TreeNodeSpec): [number, number] => [n.col * LATTICE + NODE / 2 - 1, n.row * LATTICE + NODE / 2 - 1];
  const [ax, ay] = c(a), [bx, by] = c(b);
  if (ax === bx || ay === by) return [[ax, ay], [bx, by]];
  const mx = Math.floor((ax + bx) / 2);
  return [[ax, ay], [mx, ay], [mx, by], [bx, by]];
}

/** Each segment of the path, one unit wide, grown by one to the right and down when `dark`, so that the light line has its dark line under it and to its right. */
function run(s: Surface, pts: [number, number][], dark: boolean, c: Colour): void {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const g = dark ? 1 : 0;
    s.fill(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1 + g, Math.abs(y1 - y0) + 1 + g, c);
  }
}

/**
 * The ranks of a node (5.20) as a row of cells 3 by 3, one unit apart, in a strip of root.0 one unit round them, set
 * into the frame's foot: a rank taken is ember, one still to take root.2.
 */
function paintRanks(s: Surface, shape: NodeShape, have: number, of: number, locked: boolean): void {
  // Under a lock the strip stands to the left, clear of it.
  const w = of * 4 + 1, x = locked ? 4 : Math.floor((NODE - w) / 2), y = NODE_FOOT[shape] - 4;
  s.fill(x, y, w, 5, 'root.0');
  for (let i = 0; i < of; i++) s.fill(x + 1 + i * 4, y + 1, 3, 3, i < have ? 'ember' : 'root.2');
}

// The chevrons that say the field goes on past an edge (5.20): a head 5 wide and 3 deep in salt, outlined in root.0.
const CHEVRON = {
  up: coded(['...K...', '..KWK..', '.KWWWK.', 'KWWWWWK', 'KKKKKKK'], 'tree.more.up'),
  down: coded(['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'], 'tree.more.down'),
  left: coded(['...KK', '..KWK', '.KWWK', 'KWWWK', '.KWWK', '..KWK', '...KK'], 'tree.more.left'),
  right: coded(['KK...', 'KWK..', 'KWWK.', 'KWWWK', 'KWWK.', 'KWK..', 'KK...'], 'tree.more.right'),
};

interface Lay { base: number; max: number }

/** Along one axis: a field wide enough holds the nodes centred and does not pan; a narrower one pans from MARGIN. */
function lay(span: number, view: number): Lay {
  if (span + MARGIN * 2 <= view) return { base: Math.floor((view - span) / 2), max: 0 };
  return { base: MARGIN, max: span + MARGIN * 2 - view };
}

/** A pan at rest: a whole number of lattice steps, so that the edge falls MARGIN before a node, or the far end. */
function rest(p: number, l: Lay): number {
  if (p >= l.max) return l.max;
  return Math.min(l.max, Math.max(0, Math.round(p / LATTICE) * LATTICE));
}

function lays(nodes: TreeNodeSpec[], fw: number, fh: number): { x: Lay; y: Lay } {
  const cols = Math.max(0, ...nodes.map((n) => n.col)), rows = Math.max(0, ...nodes.map((n) => n.row));
  return { x: lay(cols * LATTICE + NODE, fw), y: lay(rows * LATTICE + NODE, fh) };
}

/** The pan, as the ui stores it, that brings a node as near the middle of a field w by h as a pan at rest allows. */
export function panTo(nodes: TreeNodeSpec[], w: number, h: number, id: string): number {
  const { x, y } = lays(nodes, w - 2, h - 2);
  const n = nodes.find((m) => m.id === id) ?? nodes[0];
  const px = rest(n.col * LATTICE + NODE / 2 + x.base - (w - 2) / 2, x), py = rest(n.row * LATTICE + NODE / 2 + y.base - (h - 2) / 2, y);
  return px + py * 100000;
}

/**
 * A tree (5.20): a well whose floor is the board tile and pans by whole units under its frame, coming to rest on whole
 * steps of the lattice; nodes of 26 on a lattice of 40 in square, cut or spiked frames; links two wide drawn under
 * them; a chevron at each edge past which there are nodes.
 */
export function tree(o: TreeOpts): Node {
  const byId = new Map(o.nodes.map((n) => [n.id, n]));
  const panId = `${o.id}.pan`;
  const fw = o.w - 2, fh = o.h - 2;
  const L = lays(o.nodes, fw, fh);
  const pan = o.ui.scroll(panId);
  const px = Math.min(L.x.max, Math.round(pan % 100000)), py = Math.min(L.y.max, Math.round(Math.floor(pan / 100000)));
  const ox = L.x.base - px, oy = L.y.base - py;
  let from = { x: px, y: py };
  const nodeKids: Node[] = o.nodes.map((n): Node => ({
    id: n.id, x: ox + n.col * LATTICE, y: oy + n.row * LATTICE, w: NODE, h: NODE,
    takes: true, focus: true,
    tip: n.tip,
    on: { down: () => o.onChoose?.(n.id) },
    paint: (s, live) => {
      const l = lv(live, n.force);
      s.map(NODE_FRAMES[n.shape][n.state], 0, 0);
      // A locked node shows only the outline of what it holds, and the lock where a slot puts it.
      if (n.state === 'locked') s.icon(n.icon, 5, 5, 'flat', 'root.3');
      else s.icon(n.icon, 5, 5);
      if (n.ranks) paintRanks(s, n.shape, n.ranks[0], n.ranks[1], n.state === 'locked');
      if (n.state === 'locked') s.map(LOCK, NODE - 8, NODE_FOOT[n.shape] - 8);
      if (n.id === o.chosen || l.focus) paintSelector(s, -2, -2, 30);
    },
  }));
  const field: Node = {
    id: panId, x: 0, y: 0, w: fw, h: fh, takes: true,
    on: {
      down: () => { from = { x: px, y: py }; },
      drag: (e) => {
        let nx = Math.min(L.x.max, Math.max(0, from.x - e.dx)), ny = Math.min(L.y.max, Math.max(0, from.y - e.dy));
        if (e.phase === 'end') { nx = rest(nx, L.x); ny = rest(ny, L.y); }
        o.ui.setScroll(panId, nx + ny * 100000);
        o.ui.invalidate();
      },
    },
    paint: (s) => {
      s.tile(PLANKS, 0, 0, fw, fh, px, py);
      s.translate(ox, oy);
      const links = o.links.map(([a, b]) => ({ a: byId.get(a)!, b: byId.get(b)! })).filter((l) => l.a && l.b);
      for (const l of links) run(s, path(l.a, l.b), true, 'root.0');
      for (const l of links) {
        const both = l.a.state === 'earned' && l.b.state === 'earned';
        const to = l.a.state === 'earned' ? l.b : l.b.state === 'earned' ? l.a : l.a.state === 'locked' ? l.a : l.b;
        run(s, path(l.a, l.b), false, both ? 'salt' : LIGHT[to.state === 'earned' ? 'open' : to.state]);
      }
      s.translate(-ox, -oy);
    },
  };
  const more: Node = {
    x: 0, y: 0, w: fw, h: fh,
    paint: (s) => {
      // Up and down stand in the right-hand corners and left and right in the bottom corners, where a field laid out
      // from the left and top leaves the most room; in the middle of an edge they fell on a node's frame.
      if (py > 0) s.map(CHEVRON.up, fw - 9, 1);
      if (py < L.y.max) s.map(CHEVRON.down, fw - 9, fh - 6);
      if (px > 0) s.map(CHEVRON.left, 1, fh - 9);
      if (px < L.x.max) s.map(CHEVRON.right, fw - 6, fh - 9 - (py < L.y.max ? 8 : 0));
    },
  };
  return {
    id: o.id, x: o.x, y: o.y, w: o.w, h: o.h,
    paint: (s) => sunk(s, 0, 0, o.w, o.h, o.host),
    kids: [{ x: 1, y: 1, w: fw, h: fh, clip: true, kids: [field, ...nodeKids, more] }],
  };
}
