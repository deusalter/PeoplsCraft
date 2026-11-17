import { FRAMED_PLATE, NAMED_PLATE } from './art/slab';
import { TEXT } from './font/face';
import { measure } from './font/measure';
import { wrap } from './font/wrap';
import type { Tip, TipLine } from './node';
import type { Surface } from './surface';

/** Lines wrap at this width (5.12). */
export const TIP_WRAP = 180;

export interface TipBox { lines: TipLine[]; w: number; h: number; named: boolean }

/** Wraps a tip's lines and measures its plate: the widest line plus 10, 10 to the line plus 7, 2 more after the first. */
export function tipBox(tip: Tip): TipBox {
  const lines: TipLine[] = [];
  for (const l of tip.lines) for (const w of wrap(l.text, TIP_WRAP)) lines.push({ text: w.text, c: l.c });
  const named = !!tip.named;
  const widest = lines.reduce((m, l) => Math.max(m, measure(l.text)), 0);
  const extra = named ? 2 : 0;
  return { lines, named, w: widest + 10 + extra, h: lines.length * TEXT.height + 7 + (lines.length > 1 ? 2 : 0) + extra };
}

/** Where the tip stands for a pointer at px, py (7, tooltip placement). */
export function placeTip(b: TipBox, px: number, py: number, screenW: number, screenH: number): { x: number; y: number } {
  let x = px + 10;
  if (x + b.w > screenW - 2) x = px - 6 - b.w;
  x = Math.max(2, x);
  let y = py - 4;
  y = Math.min(y, screenH - 2 - b.h);
  y = Math.max(2, y);
  return { x, y };
}

export function paintTip(s: Surface, tip: Tip, b: TipBox, x: number, y: number): void {
  const frame = tip.frame ?? 'root.4';
  s.nine(b.named ? NAMED_PLATE : FRAMED_PLATE, x, y, b.w, b.h, { tint: frame });
  const tx = x + (b.named ? 6 : 5);
  let ty = y + (b.named ? 4 : 3);
  b.lines.forEach((l, i) => {
    s.text(l.text, tx, ty, l.c, true);
    ty += TEXT.height + (i === 0 ? 2 : 0);
  });
}
