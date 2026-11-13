import { type Colour, type Ramp, CODE, ci, washStandIn } from './palette';
import { type PixelMap, type Variant, NONE, ninePieces, resolve } from './pixmap';
import { type Face, TEXT, tokens } from './font/face';
import { widthOf } from './font/measure';

/** A 16 by 16 picture handed in by the game, not yet redrawn in the palette. */
export interface IconImage { readonly w: 16; readonly h: 16; readonly rgba: Uint8ClampedArray }
export type Icon = PixelMap | IconImage;
export type IconSource = (key: string) => Icon | null;
export type Look = 'full' | 'flat';

export function isImage(i: Icon): i is IconImage { return 'rgba' in i; }

export interface Surface {
  /** The virtual screen in units. */
  readonly w: number;
  readonly h: number;
  /** Washes are drawn as their opaque stand-ins, so nothing under one shows. */
  readonly strict?: boolean;
  fill(x: number, y: number, w: number, h: number, c: Colour): void;
  wash(x: number, y: number, w: number, h: number, c: Colour, quarters: 1 | 2 | 3): void;
  map(m: PixelMap, x: number, y: number, ramp?: Ramp): void;
  /** A map drawn with a variant: a tint for letter-like maps, a flat colour for a silhouette. */
  draw(m: PixelMap, x: number, y: number, v: Variant): void;
  /** A sliced map over a rectangle; the last argument is a ramp, or a variant for a tinted frame. */
  nine(m: PixelMap, x: number, y: number, w: number, h: number, v?: Ramp | Variant): void;
  tile(m: PixelMap, x: number, y: number, w: number, h: number, ox?: number, oy?: number, v?: Ramp | Variant): void;
  /** One line of text with its cell's top left at x, y; returns its width. */
  text(str: string, x: number, y: number, c: Colour, shadow?: boolean, face?: Face): number;
  icon(key: string, x: number, y: number, look?: Look, flat?: Colour): void;
  /**
   * The shape of an icon not yet known: its 16 by 16 mask with holes of one unit closed, filled flat, and the units
   * of it that face right or down drawn in `edge`, so the shape stands lit from the top left at any scale.
   */
  silhouette(key: string, x: number, y: number, fill: Colour, edge: Colour): void;
  clip(x: number, y: number, w: number, h: number): void;
  unclip(): void;
  /** Moves the origin of later calls by whole units; the root uses it to give each part its own coordinates. */
  translate(dx: number, dy: number): void;
}

function whole(...v: number[]): void {
  for (const n of v) if (!Number.isInteger(n)) throw new Error(`surface: ${n} is not a whole unit (${v.join(', ')})`);
}

function asVariant(v: Ramp | Variant | undefined): Variant { return typeof v === 'string' ? { ramp: v } : v ?? {}; }

interface Rect { x: number; y: number; w: number; h: number }

/** What both surfaces share: checking, translating, clipping, and cutting nine-slices, tiles and text into blits. */
export abstract class BaseSurface implements Surface {
  readonly w: number;
  readonly h: number;
  protected tx = 0;
  protected ty = 0;
  private clips: Rect[] = [];
  protected icons: IconSource = () => null;
  /** Washes are drawn as their opaque stand-ins. */
  strict = false;

  constructor(w: number, h: number) { this.w = w; this.h = h; }

  setIcons(src: IconSource): void { this.icons = src; }

  protected abstract rect(x: number, y: number, w: number, h: number, c: number): void;
  protected abstract washRect(x: number, y: number, w: number, h: number, c: number, quarters: number): void;
  /** Copies a source rectangle of a resolved map; when dw > sw then sw is 1 and the column is stretched (so for h). */
  protected abstract blit(m: PixelMap, v: Variant, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  protected abstract blitImage(img: IconImage, look: Look, flat: Colour, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number): void;

  private get bounds(): Rect { return this.clips.length ? this.clips[this.clips.length - 1] : { x: 0, y: 0, w: this.w, h: this.h }; }

  private cut(x: number, y: number, w: number, h: number): Rect | null {
    const b = this.bounds;
    const x0 = Math.max(x, b.x), y0 = Math.max(y, b.y);
    const x1 = Math.min(x + w, b.x + b.w), y1 = Math.min(y + h, b.y + b.h);
    return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }

  translate(dx: number, dy: number): void { whole(dx, dy); this.tx += dx; this.ty += dy; }

  clip(x: number, y: number, w: number, h: number): void {
    whole(x, y, w, h);
    this.clips.push(this.cut(x + this.tx, y + this.ty, w, h) ?? { x: 0, y: 0, w: 0, h: 0 });
  }
  unclip(): void { this.clips.pop(); }

  fill(x: number, y: number, w: number, h: number, c: Colour): void {
    whole(x, y, w, h);
    const r = this.cut(x + this.tx, y + this.ty, w, h);
    if (r) this.rect(r.x, r.y, r.w, r.h, ci(c));
  }

  wash(x: number, y: number, w: number, h: number, c: Colour, quarters: 1 | 2 | 3): void {
    whole(x, y, w, h);
    const r = this.cut(x + this.tx, y + this.ty, w, h);
    if (!r) return;
    if (this.strict) this.rect(r.x, r.y, r.w, r.h, ci(washStandIn(c)));
    else this.washRect(r.x, r.y, r.w, r.h, ci(c), quarters);
  }

  map(m: PixelMap, x: number, y: number, ramp?: Ramp): void { this.draw(m, x, y, { ramp }); }

  draw(m: PixelMap, x: number, y: number, v: Variant): void {
    whole(x, y);
    this.piece(m, v, 0, 0, m.w, m.h, x + this.tx, y + this.ty, m.w, m.h);
  }

  /** Draws a source rectangle over a destination of the same size, or stretched when the source is 1 across. */
  private piece(m: PixelMap, v: Variant, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
    const r = this.cut(dx, dy, dw, dh);
    if (!r) return;
    const nsx = sw === dw ? sx + (r.x - dx) : sx, nsw = sw === dw ? r.w : sw;
    const nsy = sh === dh ? sy + (r.y - dy) : sy, nsh = sh === dh ? r.h : sh;
    this.blit(m, v, nsx, nsy, nsw, nsh, r.x, r.y, r.w, r.h);
  }

  /** Repeats a source rectangle over a destination, phase (px, py) into the source at the destination's corner. */
  private repeat(m: PixelMap, v: Variant, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, px = 0, py = 0): void {
    const b = this.cut(dx, dy, dw, dh);
    if (!b) return;
    px = ((px % sw) + sw) % sw; py = ((py % sh) + sh) % sh;
    for (let y = dy - py; y < dy + dh; y += sh) {
      for (let x = dx - px; x < dx + dw; x += sw) {
        const x0 = Math.max(x, b.x), y0 = Math.max(y, b.y);
        const x1 = Math.min(x + sw, b.x + b.w), y1 = Math.min(y + sh, b.y + b.h);
        if (x1 <= x0 || y1 <= y0) continue;
        this.blit(m, v, sx + (x0 - x), sy + (y0 - y), x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  nine(m: PixelMap, x: number, y: number, w: number, h: number, rv?: Ramp | Variant): void {
    whole(x, y, w, h);
    const v = asVariant(rv);
    for (const p of ninePieces(m, w, h)) {
      const dx = x + this.tx + p.dx, dy = y + this.ty + p.dy;
      if (p.stretch) this.piece(m, v, p.sx, p.sy, p.dw === p.sw ? p.sw : 1, p.dh === p.sh ? p.sh : 1, dx, dy, p.dw, p.dh);
      else this.repeat(m, v, p.sx, p.sy, p.sw, p.sh, dx, dy, p.dw, p.dh);
    }
  }

  tile(m: PixelMap, x: number, y: number, w: number, h: number, ox = 0, oy = 0, rv?: Ramp | Variant): void {
    whole(x, y, w, h, ox, oy);
    this.repeat(m, asVariant(rv), 0, 0, m.w, m.h, x + this.tx, y + this.ty, w, h, ox, oy);
  }

  text(str: string, x: number, y: number, c: Colour, shadow = false, face: Face = TEXT): number {
    whole(x, y);
    const ts = tokens(str, face);
    const pass = (ox: number, oy: number, col: Colour) => {
      let cx = x + ox;
      for (const t of ts) {
        if (t.g.map) this.draw(t.g.map, cx, y + oy - (t.g.rise ?? 0), { tint: col });
        cx += t.g.w + face.gap;
      }
    };
    if (shadow) pass(1, 1, 'root.0');
    pass(0, 0, c);
    return widthOf(ts, face);
  }

  icon(key: string, x: number, y: number, look: Look = 'full', flat: Colour = 'clay.sh'): void {
    whole(x, y);
    const ic = this.icons(key);
    if (!ic) return;
    if (!isImage(ic)) { this.draw(ic, x, y, look === 'flat' ? { flat } : {}); return; }
    const dx = x + this.tx, dy = y + this.ty;
    const r = this.cut(dx, dy, 16, 16);
    if (r) this.blitImage(ic, look, flat, r.x - dx, r.y - dy, r.w, r.h, r.x, r.y);
  }

  silhouette(key: string, x: number, y: number, fill: Colour, edge: Colour): void {
    whole(x, y);
    const m = iconMask(this.icons(key));
    if (!m) return;
    const at = (i: number, j: number) => i >= 0 && j >= 0 && i < 16 && j < 16 && m[j * 16 + i] === 1;
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      if (!at(i, j)) continue;
      this.fill(x + i, y + j, 1, 1, at(i + 1, j) && at(i, j + 1) ? fill : edge);
    }
  }
}

/** An icon's 16 by 16 mask, 1 where it is drawn, with every empty unit between two drawn ones in a row or column filled. */
function iconMask(ic: Icon | null): Uint8Array | null {
  if (!ic) return null;
  const raw = new Uint8Array(256);
  if (isImage(ic)) { for (let k = 0; k < 256; k++) raw[k] = ic.rgba[k * 4 + 3] >= 128 ? 1 : 0; }
  else {
    const idx = resolve(ic, {});
    for (let j = 0; j < Math.min(16, ic.h); j++) for (let i = 0; i < Math.min(16, ic.w); i++) raw[j * 16 + i] = idx[j * ic.w + i] !== NONE ? 1 : 0;
  }
  const on = (i: number, j: number) => i >= 0 && j >= 0 && i < 16 && j < 16 && raw[j * 16 + i] === 1;
  const m = raw.slice();
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    if (!raw[j * 16 + i] && ((on(i - 1, j) && on(i + 1, j)) || (on(i, j - 1) && on(i, j + 1)))) m[j * 16 + i] = 1;
  }
  return m;
}

/** Marks in the grid for what is not a palette colour: the world, a wash over a colour, a picture from the game. */
export const WORLD = -3;
export const BLEND = -4;
export const IMAGE = -2;

/** Writes palette indices into an array, one cell to the unit. It needs no browser; the checks read it. */
export class GridSurface extends BaseSurface {
  readonly cells: Int16Array;
  private cache = new Map<string, Int16Array>();

  constructor(w: number, h: number) {
    super(w, h);
    this.cells = new Int16Array(w * h).fill(WORLD);
  }

  protected rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = y; j < y + h; j++) this.cells.fill(c, j * this.w + x, j * this.w + x + w);
  }

  protected washRect(x: number, y: number, w: number, h: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const k = j * this.w + i;
      if (this.cells[k] !== WORLD) this.cells[k] = BLEND;
    }
  }

  protected blit(m: PixelMap, v: Variant, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
    const key = `${m.id}|${v.ramp ?? ''}|${v.tint ?? ''}|${v.flat ?? ''}`;
    let idx = this.cache.get(key);
    if (!idx) { idx = resolve(m, v); this.cache.set(key, idx); }
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) {
      const c = idx[(sy + (sh === dh ? j : 0)) * m.w + sx + (sw === dw ? i : 0)];
      if (c !== NONE) this.cells[(dy + j) * this.w + dx + i] = c;
    }
  }

  protected blitImage(img: IconImage, look: Look, flat: Colour, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number): void {
    const f = ci(flat);
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      if (img.rgba[((sy + j) * 16 + sx + i) * 4 + 3] < 128) continue;
      this.cells[(dy + j) * this.w + dx + i] = look === 'flat' ? f : IMAGE;
    }
  }

  at(x: number, y: number): number { return this.cells[y * this.w + x]; }

  /** The cells in the direction's codes: `.` the world, `~` a wash over a colour, `?` a picture. */
  dump(): string {
    const rows: string[] = [];
    for (let y = 0; y < this.h; y++) {
      let r = '';
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y * this.w + x];
        r += c === WORLD ? '.' : c === BLEND ? '~' : c === IMAGE ? '?' : CODE[c];
      }
      rows.push(r);
    }
    return rows.join('\n');
  }
}
