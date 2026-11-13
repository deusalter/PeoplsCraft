import { type PixelMap, pixmap } from '../pixmap';
import { SMALL_SHEETS } from './small';
import { SYMBOL_SHEETS, TEXT_SHEETS } from './text';

export interface Glyph {
  readonly ch: string;
  readonly w: number;
  /** Null for the space. */
  readonly map: PixelMap | null;
}

export interface Face {
  readonly name: 'text' | 'small';
  /** Rows in a cell, and the advance from one line to the next. */
  readonly height: number;
  readonly gap: number;
  readonly glyphs: ReadonlyMap<string, Glyph>;
  readonly symbols: ReadonlyMap<string, Glyph>;
  readonly tofu: Glyph;
  /** The small face draws a lowercase letter as its capital. */
  readonly upper: boolean;
}

/** Reads sheets of the direction's form into glyphs; a sheet that disagrees with its own widths throws. */
function readSheets(sheets: string[], rows: number, face: string): Map<string, Glyph> {
  const out = new Map<string, Glyph>();
  for (const sheet of sheets) {
    const groups = sheet.split(/\n\s*\n/).map((g) => g.split('\n').filter((l) => l.trim() !== '')).filter((g) => g.length);
    for (const g of groups) {
      if (g.length !== rows + 2) throw new Error(`${face} face: a group has ${g.length - 2} rows, not ${rows}`);
      const names = g[0].trim().split(/\s+/);
      const widths = g[rows + 1].trim().split(/\s+/).map(Number);
      const cells = g.slice(1, rows + 1).map((l) => l.trim().split(/\s+/));
      if (widths.length !== names.length) throw new Error(`${face} face: ${names.length} names and ${widths.length} widths in group ${names[0]}`);
      names.forEach((ch, i) => {
        const glyphRows = cells.map((r, y) => {
          const v = r[i];
          if (v === undefined) throw new Error(`${face} face: glyph ${ch} is missing row ${y}`);
          return v;
        });
        if (glyphRows.some((r) => r.length !== widths[i])) throw new Error(`${face} face: glyph ${ch} is not ${widths[i]} wide`);
        if (out.has(ch)) throw new Error(`${face} face: glyph ${ch} is drawn twice`);
        out.set(ch, { ch, w: widths[i], map: pixmap({ rows: glyphRows, key: { '#': 'tint' } }, `${face}:${ch}`) });
      });
    }
  }
  return out;
}

const textGlyphs = readSheets(TEXT_SHEETS, 10, 'text');
textGlyphs.set(' ', { ch: ' ', w: 3, map: null });
const textSymbols = readSheets(SYMBOL_SHEETS, 10, 'text');

const smallGlyphs = readSheets(SMALL_SHEETS, 6, 'small');
smallGlyphs.set(' ', { ch: ' ', w: 2, map: null });
// The direction gives the small face no tofu; it gets the text face's box at its own height.
const smallTofu: Glyph = { ch: 'tofu', w: 3, map: pixmap({ rows: ['###', '#.#', '#.#', '#.#', '###', '...'], key: { '#': 'tint' } }, 'small:tofu') };

/** Characters the game's text uses that stand for a glyph of the face. */
const ALIASES: Record<string, string> = { '’': "'", '‘': "'", '“': '"', '”': '"', '−': '-', ' ': ' ' };
const SYMBOL_ALIASES: Record<string, string> = { '→': 'right', '←': 'left', '↑': 'up', '↓': 'down', '✔': 'check', '✓': 'check', '✗': 'cross' };

export const TEXT: Face = {
  name: 'text', height: 10, gap: 1, glyphs: textGlyphs, symbols: textSymbols, tofu: textSymbols.get('tofu')!, upper: false,
};
export const SMALL: Face = {
  name: 'small', height: 6, gap: 1, glyphs: smallGlyphs, symbols: new Map(), tofu: smallTofu, upper: true,
};

export interface Token { readonly g: Glyph; readonly src: string }

/** Splits a string into the glyphs it draws: `{name}` is a symbol, a character the face lacks is tofu. */
export function tokens(str: string, face: Face = TEXT): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < str.length; i++) {
    let ch = str[i];
    if (ch === '{') {
      const end = str.indexOf('}', i + 1);
      if (end > i) {
        const sym = face.symbols.get(str.slice(i + 1, end));
        if (sym) { out.push({ g: sym, src: str.slice(i, end + 1) }); i = end; continue; }
      }
    }
    const code = str.codePointAt(i)!;
    if (code > 0xffff) { ch = String.fromCodePoint(code); i++; }
    const src = ch;
    const alias = SYMBOL_ALIASES[ch];
    if (alias && face.symbols.has(alias)) { out.push({ g: face.symbols.get(alias)!, src }); continue; }
    ch = ALIASES[ch] ?? ch;
    if (face.upper) ch = ch.toUpperCase();
    out.push({ g: face.glyphs.get(ch) ?? (ch === '\t' ? face.glyphs.get(' ')! : face.tofu), src });
  }
  return out;
}

export function glyphs(str: string, face: Face = TEXT): Glyph[] { return tokens(str, face).map((t) => t.g); }
