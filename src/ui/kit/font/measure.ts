import { type Face, type Glyph, TEXT, tokens } from './face';

/** The width of a run of glyphs: their widths and one unit between each two. */
export function widthOf(gs: readonly { g: Glyph }[] | readonly Glyph[], face: Face = TEXT): number {
  if (gs.length === 0) return 0;
  let w = 0;
  for (const t of gs) w += 'g' in t ? t.g.w : t.w;
  return w + face.gap * (gs.length - 1);
}

export function measure(str: string, face: Face = TEXT): number { return widthOf(tokens(str, face), face); }

/** Where text starts so that its last column is `right`. */
export function rightX(str: string, right: number, face: Face = TEXT): number { return right - measure(str, face) + 1; }

/** Where text starts so that it is centred in `w` units from `x`: the odd unit goes to the right. */
export function centreX(str: string, x: number, w: number, face: Face = TEXT): number { return x + Math.floor((w - measure(str, face)) / 2); }

/** A count as the direction writes it: bare under a thousand, with commas above (`1,240`). */
export function count(n: number): string {
  const neg = n < 0;
  const s = String(Math.trunc(Math.abs(n)));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return (neg ? '-' : '') + out;
}

/** A time as `m:ss`. */
export function clock(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
