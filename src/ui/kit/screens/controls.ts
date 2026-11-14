// Controls (section 6, Controls): a clay slab that shows every key as a drawn cap in two columns. A row is a button:
// pressed, it waits for the key (or mouse button) that is to do its work, cap by cap. Done is the menus' stone button.
import { GROUND } from '../art/ground';
import { measure, rightX } from '../font/measure';
import type { KeyEv, Node, Screen, Tip } from '../node';
import type { Colour } from '../palette';
import { button } from '../parts/button';
import { ring } from '../parts/common';
import { keycap } from '../parts/keycap';
import { slab } from '../parts/slab';
import { firstFocus, go, placeWindow } from './books-common';
import type { NamedScreen } from './index';

export type Mouse = 'left' | 'right' | 'middle';

/** A cap's label, or one of the three mouse buttons drawn as a mouse with that button pressed. */
export type Cap = string | { mouse: Mouse };

export interface Binding {
  caps: Cap[];
  does: string;
  /** Not to be changed: the number row and the key that leaves every window. */
  fixed?: boolean;
}

/** The row waiting for a key, and which of its caps it waits for. */
export interface Listen { side: 0 | 1; row: number; cap: number }

export interface ControlsView {
  left: Binding[];
  right: Binding[];
  over: 'ground' | 'world';
  listen: Listen | null;
  onListen(l: Listen | null): void;
  onSet(l: Listen, cap: Cap): void;
  onDone(): void;
}

const ROW = 16, ROWS_Y = 20, PAD = 8, GAP = 12, AFTER_CAP = 6;

const MOUSE_BUTTONS: Mouse[] = ['left', 'middle', 'right'];
/**
 * A mouse button's label on its cap: the mouse with that button filled, then its word, both in ink. Drawn as a grey
 * mouse and a grey word with no cap round them, the three mouse rows looked disabled beside the keys.
 */
const MOUSE_LABEL: Record<Mouse, string> = { left: '{lmb} Left', right: '{rmb} Right', middle: '{mmb} Wheel' };

/** The label a cap carries. */
const label = (c: Cap) => (typeof c === 'string' ? c : MOUSE_LABEL[c.mouse]);

/** The least width a cap needs: its label plus 6, and 7 more for the lock of a key that cannot be changed. */
function capW(c: Cap, fixed = false): number { return measure(label(c)) + 6 + (fixed ? 7 : 0); }

/**
 * The one width of a row's run of caps on this screen, so that every cap stands left-aligned at the same width and the
 * words after them start in one column: the widest single cap, or a run of several caps (Move) at the width of its
 * widest, sharing outline columns, whichever is more. Caps each as wide as their label left the column ragged.
 */
function runW(rows: Binding[]): number {
  return Math.max(...rows.map((b) => b.caps.length === 1 ? capW(b.caps[0], b.fixed) : b.caps.length * Math.max(...b.caps.map((c) => capW(c, b.fixed))) - (b.caps.length - 1)));
}

/** The width of each of `n` caps sharing outline columns so that together they are `run` wide. */
const eachW = (run: number, n: number) => Math.floor((run + n - 1) / n);

function same(a: Cap, b: Cap): boolean {
  return typeof a === 'string' ? typeof b === 'string' && a === b : typeof b !== 'string' && a.mouse === b.mouse;
}

function capName(c: Cap): string { return typeof c === 'string' ? c : `the ${c.mouse} mouse button`; }

/** The cap a key press makes, in the face's own words; null for a key that cannot be bound. */
export function capOf(e: KeyEv): string | null {
  const k = e.key;
  if (k === ' ' || e.code === 'Space') return 'Space';
  const named: Record<string, string> = {
    Shift: 'Shift', Control: 'Ctrl', Alt: 'Alt', Meta: 'Cmd', Tab: 'Tab', Enter: 'Enter', Backspace: 'Back', CapsLock: 'Caps',
    Delete: 'Del', Insert: 'Ins', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
    ArrowUp: '{up}', ArrowDown: '{down}', ArrowLeft: '{left}', ArrowRight: '{right}',
  };
  if (named[k]) return named[k];
  if (/^F\d{1,2}$/.test(k)) return k;
  if ([...k].length === 1) return k.toUpperCase();
  return null;
}

interface Column { rows: Binding[]; x: number; run: number; textX: number; w: number }

function column(rows: Binding[], x: number, run: number): Column {
  const textX = run + AFTER_CAP;
  return { rows, x, run, textX, w: textX + Math.max(...rows.map((b) => measure(b.does))) };
}

export const controlsScreen: Screen<ControlsView> = (v, ui) => {
  firstFocus(ui, 'controls', 'ctl.done');
  const run = runW([...v.left, ...v.right]);
  const left = column(v.left, PAD, run);
  const right = column(v.right, PAD + left.w + GAP, run);
  const W = Math.max(216, right.x + right.w + PAD);
  const rowsH = Math.max(v.left.length, v.right.length) * ROW;
  const doneY = ROWS_Y + rowsH + 6;
  const H = doneY + 20 + 8;
  const all = [...v.left, ...v.right];
  const clashes = (b: Binding) => all.filter((o) => o !== b && o.caps.some((c) => b.caps.some((d) => same(c, d))));
  /** Gives the waiting cap its key and waits for the row's next cap, or stops after its last. */
  const put = (cap: Cap) => {
    const l = v.listen;
    if (!l) return;
    v.onSet(l, cap);
    v.onListen(l.cap + 1 < (l.side ? v.right : v.left)[l.row].caps.length ? { ...l, cap: l.cap + 1 } : null);
    ui.cue('press');
    ui.invalidate();
  };

  const rowNode = (col: Column, side: 0 | 1, i: number): Node => {
    const b = col.rows[i];
    const y = ROWS_Y + i * ROW;
    const listening = v.listen && v.listen.side === side && v.listen.row === i ? v.listen : null;
    const clash = clashes(b);
    const kids: Node[] = [];
    let at = 2;
    const cw = eachW(col.run, b.caps.length);
    b.caps.forEach((c, k) => {
      // The cap being waited for reads "?" until a key is pressed.
      const shown: Cap = listening && listening.cap === k ? '?' : c;
      kids.push(keycap({ x: at, y: 1, label: label(shown), w: cw, locked: b.fixed }));
      at += cw - 1;
    });
    // A key that cannot be changed is told by the lock on its cap; what it does stays in ink, as every other row's.
    const doesC: Colour = clash.length ? 'blood.dk' : 'ink';
    const tip = (): Tip | null => {
      if (listening) return null;
      if (b.fixed) return { lines: [{ text: b.does, c: 'salt' }, { text: 'This key cannot be changed', c: 'root.4' }], delay: 0.4 };
      const lines = [{ text: b.does, c: 'salt' as Colour }];
      for (const o of clash) lines.push({ text: `Shares a key with ${o.does}`, c: 'blood.lt' });
      lines.push({ text: 'Press to change its key', c: 'root.4' });
      return { lines, delay: 0.4 };
    };
    return {
      id: `ctl.${side}.${i}`, x: col.x - 2, y, w: col.w + 4, h: ROW,
      takes: true, focus: !b.fixed,
      paint: (s, live) => {
        if (listening) { s.fill(0, 0, col.w + 4, ROW, 'clay.lt'); ring(s, 0, 0, col.w + 4, ROW, 'ink'); }
        else if (live.hover && !b.fixed) s.fill(0, 0, col.w + 4, ROW, 'clay.lt');
        if (live.focus && !listening) ring(s, 0, 0, col.w + 4, ROW, 'salt');
        s.text(b.does, col.textX + 2, 3, doesC);
      },
      tip,
      kids,
      on: b.fixed ? undefined : {
        down: (e) => {
          if (listening) { put({ mouse: MOUSE_BUTTONS[e.button] ?? 'left' }); return; }
          v.onListen({ side, row: i, cap: 0 });
          ui.cue('press');
          ui.invalidate();
        },
        key: (e) => {
          if (listening || e.key !== 'Enter') return;
          v.onListen({ side, row: i, cap: 0 });
          ui.invalidate();
          return true;
        },
      },
    };
  };

  const kids: Node[] = [];
  v.left.forEach((_, i) => kids.push(rowNode(left, 0, i)));
  v.right.forEach((_, i) => kids.push(rowNode(right, 1, i)));
  const l = v.listen;
  const hint = l ? `Press a key for ${(l.side ? v.right : v.left)[l.row].does}` : 'Press a row to change its key';
  kids.push({ x: 0, y: 6, w: W - PAD, h: 10, paint: (s) => { s.text(hint, rightX(hint, W - PAD - 1), 0, 'ink.faded'); } });
  kids.push(button({ id: 'ctl.done', x: Math.floor((W - 200) / 2), y: doneY, w: 200, label: 'Done', onPress: v.onDone }));
  const at = placeWindow(ui, W, H);
  return {
    id: 'controls', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => { if (v.over === 'ground') s.tile(GROUND, 0, 0, ui.w, ui.h); else s.wash(0, 0, ui.w, ui.h, 'root.0', 2); },
    kids: [slab({ id: 'ctl.slab', x: at.x, y: at.y, w: W, h: H, ramp: 'clay', title: 'Controls', kids })],
    on: {
      key: (e) => {
        if (v.listen) {
          // While a row waits, every key is for it; Esc leaves it as it was.
          if (e.key === 'Escape') { v.onListen(null); ui.invalidate(); return true; }
          const cap = capOf(e);
          if (cap) put(cap);
          return true;
        }
        if (e.key === 'Escape') { v.onDone(); return true; }
      },
    },
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
  { caps: ['1-9'], does: 'Hotbar', fixed: true },
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
  { caps: ['Esc'], does: 'Pause', fixed: true },
];

// The sample keeps what was rebound for as long as the page is open.
const bound: [Binding[], Binding[]] = [LEFT.map((b) => ({ ...b, caps: [...b.caps] })), RIGHT.map((b) => ({ ...b, caps: [...b.caps] }))];
let listen: Listen | null = null;

const sample = (name: string, title: string, over: 'ground' | 'world'): NamedScreen => ({
  name, title, world: over === 'world',
  build: (ui) => controlsScreen({
    left: bound[0], right: bound[1], over, listen,
    onListen: (l) => { listen = l; },
    onSet: (l, cap) => { bound[l.side][l.row].caps[l.cap] = cap; },
    onDone: () => go(over === 'ground' ? 'title' : 'pause'),
  }, ui),
});

export const SCREENS: NamedScreen[] = [
  sample('controls', 'Controls, from the title', 'ground'),
  sample('controls-play', 'Controls, from the pause', 'world'),
];
