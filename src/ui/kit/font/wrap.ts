import { type Face, type Token, TEXT, tokens } from './face';
import { measure, widthOf } from './measure';

const ELLIPSIS = '…';

function joinSrc(ts: readonly Token[]): string { return ts.map((t) => t.src).join(''); }

/** The longest head of `ts` that is at most `width` wide. */
function fitCount(ts: readonly Token[], width: number, face: Face): number {
  let w = 0;
  for (let i = 0; i < ts.length; i++) {
    w += ts[i].g.w + (i > 0 ? face.gap : 0);
    if (w > width) return i;
  }
  return ts.length;
}

/** Cuts one line to `width`: unchanged when it fits, else cut at the last glyph that leaves room for `…`. */
export function cut(str: string, width: number, face: Face = TEXT): string {
  const ts = tokens(str, face);
  if (widthOf(ts, face) <= width) return str;
  return ellipsize(ts, width, face);
}

function ellipsize(ts: readonly Token[], width: number, face: Face): string {
  const ell = measure(ELLIPSIS, face);
  if (ell > width) return '';
  let n = fitCount(ts, width - ell - face.gap, face);
  while (n > 0 && ts[n - 1].src === ' ') n--;
  return joinSrc(ts.slice(0, n)) + ELLIPSIS;
}

export interface Line { text: string; /** The first line of a paragraph after the first, which stands 4 lower. */ para: boolean }

/** Wraps text at spaces to `width`; a word longer than a line is broken at a glyph. `\n` starts a paragraph. */
export function wrap(str: string, width: number, face: Face = TEXT): Line[] {
  const out: Line[] = [];
  str.split('\n').forEach((para, pi) => {
    const words = para.split(' ').filter((w, i, a) => w !== '' || (i === 0 && a.length === 1));
    let line: Token[] = [];
    let first = true;
    const push = () => { out.push({ text: joinSrc(line), para: first && pi > 0 }); first = false; line = []; };
    const space = tokens(' ', face);
    for (const word of words) {
      let wt = tokens(word, face);
      const joined = line.length ? [...line, ...space, ...wt] : wt;
      if (widthOf(joined, face) <= width) { line = joined; continue; }
      if (line.length) push();
      while (widthOf(wt, face) > width) {
        const n = Math.max(1, fitCount(wt, width, face));
        line = wt.slice(0, n);
        push();
        wt = wt.slice(n);
      }
      line = wt;
    }
    push();
  });
  return out;
}

export interface Box { lines: { text: string; y: number }[]; h: number }

/**
 * Lays text out in a box of `width` and at most `maxLines` lines, 10 to the line (or the face's height) and 4
 * more between paragraphs. What is left after the last line is cut with `…`.
 */
export function box(str: string, width: number, maxLines = Infinity, face: Face = TEXT): Box {
  const lines = wrap(str, width, face);
  let shown = lines;
  if (lines.length > maxLines) {
    shown = lines.slice(0, maxLines);
    const last = shown[maxLines - 1];
    const ts = tokens(last.text, face);
    const room = widthOf(ts, face) + face.gap + measure(ELLIPSIS, face) <= width;
    shown[maxLines - 1] = { ...last, text: room ? last.text + ELLIPSIS : ellipsize(ts, width, face) };
  }
  let y = 0;
  const out = shown.map((l, i) => {
    if (i > 0) y += face.height + (l.para ? 4 : 0);
    return { text: l.text, y };
  });
  return { lines: out, h: out.length ? y + face.height : 0 };
}
