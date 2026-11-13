// Tooltips (5.12), as the play screens raise them: a plain thing, a thing whose modifier compares, a named old thing,
// a block, and a tip raised at the screen's corner, which stands to the left of the pointer and is held inside. The
// slots in the slab raise the same tips live under the pointer.
import { POINTER } from '../art/pointer';
import type { Node, Tip, Ui } from '../node';
import { GRADES } from '../palette';
import { slab } from '../parts/slab';
import { paintTip, placeTip, tipBox } from '../tooltip';
import { type Stack, stackTip, thing } from '../sample/play-items';
import { Bench, lit, stackGrid } from './play/common';
import { Hand, store } from './play/hand';
import type { NamedScreen } from './index';

const ROW: Stack[] = [
  { key: 'iron_pickaxe', n: 1 }, { key: 'lumenite_sword', n: 1, mod: 'savage' }, { key: 'find:stone_staff', n: 1 },
  { key: 'wardstone', n: 48 }, { key: 'iron_melee_2', n: 1, mod: 'warding' }, { key: 'verdant_idol', n: 1 },
  { key: 'wardens_aegis', n: 1 }, { key: 'bog_pearl', n: 999 }, { key: 'salve', n: 7 },
];

const COMPARE = [
  { text: '+3 over Hide Trousers', c: 'growth.lt' as const },
  { text: '-4% speed: the hide set is broken', c: 'blood.lt' as const },
];

/** The tip of a named old thing: a second frame of salt inside, its own name first and what it is second. */
function namedTip(s: Stack): Tip {
  const t = thing(s.key);
  return {
    named: true, frame: GRADES[6].frame,
    lines: [
      { text: t.name, c: GRADES[6].dark },
      { text: `Old, a ${t.kind}`, c: 'root.4' },
      ...(t.does ?? []).map((d) => ({ text: d, c: 'salt' as const })),
      { text: t.tell ?? '', c: 'root.4' },
      { text: '{lmb} take', c: 'root.4' },
    ],
  };
}

function tipOf(s: Stack): Tip {
  if (s.key.startsWith('find:')) return namedTip(s);
  if (s.key === 'iron_melee_2') return stackTip(s, 'slot', COMPARE);
  return stackTip(s);
}

let hand: Hand | null = null;
let bench: Bench | null = null;

function specimen(x: number, y: number, label: string, tip: Tip): Node[] {
  const b = tipBox(tip);
  return [lit(x, y, label, 'salt'), { x, y: y + 12, w: b.w, h: b.h, paint: (s) => paintTip(s, tip, b, 0, 0) }];
}

function build(ui: Ui): Node {
  hand ??= new Hand({ row: store(9, Object.fromEntries(ROW.map((s, i) => [i, s]))) });
  if (!bench || bench.ui !== ui) bench = new Bench(hand, ui);
  const b = bench;
  const wx = Math.floor((ui.w - 176) / 2), wy = 6;
  const row = slab({
    x: 0, y: 0, w: 176, h: 36, ramp: 'timber', title: 'Supply Crate',
    kids: [stackGrid(b, { store: 'row', x: 8, y: 16, cols: 9, rows: 1, ramp: 'timber', each: (i) => ({ tip: () => tipOf(hand!.get({ store: 'row', i }) ?? ROW[i]) }) })],
  });
  // The specimens flow in rows under the slab; the block's tip is raised at the corner, as the pointer would place it.
  // The plain thing and the named old thing stand in the first column, the one that compares beside them when there
  // is room; the block's tip is raised at the corner, as the pointer would place it.
  const kids: Node[] = [];
  const y0 = wy + 36 + 6;
  const plain = tipOf(ROW[0]), oldOne = tipOf(ROW[2]), cmp = tipOf(ROW[4]);
  kids.push(...specimen(4, y0, 'A plain thing', plain));
  kids.push(...specimen(4, y0 + 12 + tipBox(plain).h + 6, 'A named old thing', oldOne));
  const cx = 4 + Math.max(tipBox(plain).w, tipBox(oldOne).w) + 8;
  if (cx + tipBox(cmp).w <= ui.w - 4) kids.push(...specimen(cx, y0, 'It compares', cmp));
  const edge = tipOf(ROW[3]);
  const eb = tipBox(edge);
  const px = ui.w - 5, py = ui.h - 8;
  const at = placeTip(eb, px, py, ui.w, ui.h);
  kids.push(
    lit(at.x, at.y - 12, 'A block, at the corner', 'salt'),
    { x: at.x, y: at.y, w: eb.w, h: eb.h, paint: (s) => paintTip(s, edge, eb, 0, 0) },
    { x: px, y: py, w: Math.min(POINTER.w, ui.w - px), h: Math.min(POINTER.h, ui.h - py), paint: (s) => { s.clip(0, 0, ui.w - px, ui.h - py); s.map(POINTER, 0, 0); s.unclip(); } },
  );
  return {
    x: 0, y: 0, w: ui.w, h: ui.h, takes: true,
    on: { down: () => { hand!.dropHeld(); b.after(); } },
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [...kids, { x: wx, y: wy, w: 176, h: 36, takes: true }, { ...row, x: wx, y: wy }],
  };
}

export const SCREENS: NamedScreen[] = [{ name: 'tooltips', title: 'Tooltips', world: true, build }];
