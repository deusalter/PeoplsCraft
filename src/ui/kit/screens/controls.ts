// Controls (section 6, Controls): a clay slab that shows every key as a drawn cap in two columns, and Done.
import { GROUND } from '../art/ground';
import type { Node, Screen } from '../node';
import { button } from '../parts/button';
import { keycap } from '../parts/keycap';
import { slab } from '../parts/slab';
import { firstFocus, go, placeWindow } from './books-common';
import { ink } from './play/common';
import type { NamedScreen } from './index';

/** A cap's label, or one of the three mouse buttons drawn as a mouse with that button lit. */
export type Cap = string | { mouse: 'left' | 'right' | 'middle' };

export interface Binding {
  caps: Cap[];
  does: string;
}

export interface ControlsView {
  left: Binding[];
  right: Binding[];
  over: 'ground' | 'world';
  onDone(): void;
}

const W = 248, H = 206, ROW = 16, ROWS_Y = 20, COL_W = 112, TEXT_X = 48;

/** A mouse 9 by 12 in the cap's own tones, its chosen button lit in ember. */
function mouse(x: number, y: number, which: 'left' | 'right' | 'middle'): Node {
  return {
    x, y, w: 9, h: 12,
    paint: (s) => {
      s.fill(2, 0, 5, 1, 'root.0'); s.fill(2, 11, 5, 1, 'root.0');
      s.fill(1, 1, 1, 1, 'root.0'); s.fill(7, 1, 1, 1, 'root.0');
      s.fill(1, 10, 1, 1, 'root.0'); s.fill(7, 10, 1, 1, 'root.0');
      s.fill(0, 2, 1, 8, 'root.0'); s.fill(8, 2, 1, 8, 'root.0');
      s.fill(2, 1, 5, 1, 'stone.hi');
      s.fill(1, 2, 7, 8, 'stone.lt');
      s.fill(2, 10, 5, 1, 'stone.sh'); s.fill(1, 8, 7, 2, 'stone.sh');
      // The seam between the two buttons, down to where the palm begins.
      s.fill(1, 5, 7, 1, 'stone.sh'); s.fill(4, 1, 1, 4, 'stone.sh');
      if (which === 'left') s.fill(1, 2, 3, 3, 'ember');
      if (which === 'right') s.fill(5, 2, 3, 3, 'ember');
      if (which === 'middle') s.fill(4, 1, 1, 4, 'ember');
    },
  };
}

function rowNodes(b: Binding, x: number, y: number): Node[] {
  const out: Node[] = [];
  let at = x;
  for (const c of b.caps) {
    const n = typeof c === 'string' ? keycap({ x: at, y, label: c }) : mouse(at, y + 1, c.mouse);
    out.push(n);
    // Caps of one row stand side by side sharing an outline column, as a run of keys on a board does.
    at += n.w - 1;
  }
  out.push(ink(x + TEXT_X, y + 2, b.does, 'ink', COL_W - TEXT_X));
  return out;
}

export const controlsScreen: Screen<ControlsView> = (v, ui) => {
  firstFocus(ui, 'controls', 'ctl.done');
  const kids: Node[] = [];
  v.left.forEach((b, i) => kids.push(...rowNodes(b, 8, ROWS_Y + i * ROW)));
  v.right.forEach((b, i) => kids.push(...rowNodes(b, 8 + COL_W + 8, ROWS_Y + i * ROW)));
  kids.push(button({ id: 'ctl.done', x: 74, y: 184, w: 100, h: 16, ramp: 'clay', label: 'Done', onPress: v.onDone }));
  const at = placeWindow(ui, W, H, 21);
  return {
    id: 'controls', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => { if (v.over === 'ground') s.tile(GROUND, 0, 0, ui.w, ui.h); else s.wash(0, 0, ui.w, ui.h, 'root.0', 2); },
    kids: [slab({ id: 'ctl.slab', x: at.x, y: at.y, w: W, h: H, ramp: 'clay', title: 'Controls', kids })],
    on: { key: (e) => { if (e.key === 'Escape' || e.key === 'Enter') { v.onDone(); return true; } } },
  };
};

// The body and the hands on the left, the windows and the rest on the right, as the game binds them.
export const LEFT: Binding[] = [
  { caps: ['W', 'A', 'S', 'D'], does: 'Move' },
  { caps: ['Space'], does: 'Jump, swim' },
  { caps: ['Shift'], does: 'Sneak' },
  { caps: ['Ctrl'], does: 'Sprint' },
  { caps: [{ mouse: 'left' }], does: 'Mine, strike' },
  { caps: [{ mouse: 'right' }], does: 'Use, place' },
  { caps: [{ mouse: 'middle' }], does: 'Pick block' },
  { caps: ['1-9'], does: 'Hotbar' },
  { caps: ['Q'], does: 'Drop' },
];

export const RIGHT: Binding[] = [
  { caps: ['E'], does: 'Pack' },
  { caps: ['G'], does: 'Journal' },
  { caps: ['M'], does: 'Map' },
  { caps: ['T'], does: 'Chat' },
  { caps: ['Tab'], does: 'Roster' },
  { caps: ['V'], does: 'Ping' },
  { caps: ['H'], does: 'Salve' },
  { caps: ['F1'], does: 'Hide panels' },
  { caps: ['Esc'], does: 'Pause' },
];

const sample = (name: string, title: string, over: 'ground' | 'world'): NamedScreen => ({
  name, title, world: over === 'world',
  build: (ui) => controlsScreen({ left: LEFT, right: RIGHT, over, onDone: () => go(over === 'ground' ? 'title' : 'pause') }, ui),
});

export const SCREENS: NamedScreen[] = [
  sample('controls', 'Controls, from the title', 'ground'),
  sample('controls-play', 'Controls, from the pause', 'world'),
];
