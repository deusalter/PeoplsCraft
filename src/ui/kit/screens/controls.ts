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

const ROW = 16, ROWS_Y = 20, PAD = 8, GAP = 12, AFTER_CAP = 6, MOUSE_W = 9, MOUSE_H = 13;

const MOUSE_BUTTONS: Mouse[] = ['left', 'middle', 'right'];
/** The mouse button's word, in faded ink after the mouse: which half is pressed is a small thing to read alone. */
const MOUSE_WORD: Record<Mouse, string> = { left: 'Left', right: 'Right', middle: 'Wheel' };

/**
 * A mouse 9 by 13 in the key cap's stone, lit from the top left: two buttons over the palm, split by a seam that holds
 * the wheel. The button it stands for is pressed: filled in ember, its lit edge `ember.lt`, its shaded edge `ember.dk`.
 */
function mouse(x: number, y: number, which: Mouse): Node {
  return {
    x, y, w: MOUSE_W, h: MOUSE_H,
    paint: (s) => {
      s.fill(2, 0, 5, 1, 'root.0'); s.fill(2, 12, 5, 1, 'root.0');
      s.fill(1, 1, 1, 1, 'root.0'); s.fill(7, 1, 1, 1, 'root.0');
      s.fill(1, 11, 1, 1, 'root.0'); s.fill(7, 11, 1, 1, 'root.0');
      s.fill(0, 2, 1, 9, 'root.0'); s.fill(8, 2, 1, 9, 'root.0');
      // The two buttons, x 1 to 3 and 5 to 7, rows 1 to 5; row 1 is narrower where the outline rounds.
      const half = (bx: number, on: boolean) => {
        const [hi, face, dk] = on ? ['ember.lt', 'ember', 'ember.dk'] as const : ['stone.hi', 'stone.lt', 'stone.sh'] as const;
        s.fill(bx, 2, 3, 4, face);
        s.fill(bx === 1 ? 2 : 5, 1, 2, 1, hi);
        s.fill(bx, 2, 1, 4, hi);
        s.fill(bx + 1, 5, 2, 1, dk);
        if (bx === 5) s.fill(7, 2, 1, 4, dk);
      };
      half(1, which === 'left');
      half(5, which === 'right');
      s.fill(4, 1, 1, 5, 'root.0');
      s.fill(4, 2, 1, 3, which === 'middle' ? 'ember' : 'stone.dk');
      s.fill(1, 6, 7, 1, 'root.0');
      s.fill(1, 7, 7, 4, 'stone.lt');
      s.fill(1, 7, 1, 4, 'stone.hi');
      s.fill(7, 7, 1, 4, 'stone.sh');
      s.fill(2, 11, 5, 1, 'stone.dk');
    },
  };
}

/** The least width a cap needs: its label plus 6, or the mouse with its word 3 after it. */
function capW(c: Cap): number { return typeof c === 'string' ? measure(c) + 6 : MOUSE_W + 3 + measure(MOUSE_WORD[c.mouse]); }

/**
 * The one width of a row's run of caps on this screen, so that every cap stands left-aligned at the same width and the
 * words after them start in one column: the widest single cap, or a run of several caps (Move) at the width of its
 * widest, sharing outline columns, whichever is more. Caps each as wide as their label left the column ragged.
 */
function runW(rows: Binding[]): number {
  return Math.max(...rows.map((b) => b.caps.length === 1 ? capW(b.caps[0]) : b.caps.length * Math.max(...b.caps.map(capW)) - (b.caps.length - 1)));
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
      if (typeof shown === 'string') kids.push(keycap({ x: at, y: 1, label: shown, w: cw }));
      else {
        const word = MOUSE_WORD[shown.mouse];
        kids.push(mouse(at, 2, shown.mouse), { x: at + MOUSE_W + 3, y: 3, w: measure(word), h: 10, paint: (s) => s.text(word, 0, 0, 'ink.faded') });
      }
      at += cw - 1;
    });
    const doesC: Colour = clash.length ? 'blood.dk' : b.fixed ? 'ink.faded' : 'ink';
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
