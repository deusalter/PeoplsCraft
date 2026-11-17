import { type Colour, type Ramp, type Role, CODE, COLOURS, RGB, ROLES, SHADE, ci, isColour, isRole, toneIndex } from './palette';

/**
 * All art is data: rows of characters and a key. `'tint'` in a key stands for the colour given when the map is
 * drawn, which is how the letters are coloured; `'shade'` stands for the step under that colour (SHADE), which is
 * how a coloured frame is turned from the light on its bottom and right.
 */
export interface PixelMapSrc {
  rows: string[];
  key: Record<string, Colour | Role | 'tint' | 'shade'>;
  slice?: [left: number, top: number, right: number, bottom: number];
}

export const NONE = -1;
export const ROLE_BASE = 64;
export const TINT = 80;
export const SHADE_CELL = 81;

export interface PixelMap {
  readonly id: number;
  readonly name: string;
  readonly w: number;
  readonly h: number;
  /** One cell to the unit: NONE, a palette index, ROLE_BASE + role, or TINT. */
  readonly cells: Int8Array;
  readonly roles: boolean;
  readonly tint: boolean;
  readonly slice?: readonly [number, number, number, number];
  /** Every column of the middle band is the same, so the middle may be stretched across instead of tiled. */
  readonly uniX: boolean;
  /** Every row of the middle band is the same. */
  readonly uniY: boolean;
}

/** What a map is drawn with: the ramp for its roles, the colour for its tint; `flat` draws every cell in one colour. */
export interface Variant { ramp?: Ramp; tint?: Colour; flat?: Colour }

/** Digits 1 to 6 stand for the roles of the host slab's ramp, as in the direction's diagrams. */
export const ROLE_DIGITS: Record<string, Role> = { 1: 'hi', 2: 'lt', 3: 'face', 4: 'sh', 5: 'dk', 6: 'pit' };

let nextId = 1;
const all: PixelMap[] = [];

/** Checks a map and returns it as indices. A ragged row, an unkeyed character or an unknown name throws. */
export function pixmap(src: PixelMapSrc, name = 'map'): PixelMap {
  const h = src.rows.length;
  if (h === 0) throw new Error(`pixmap ${name}: no rows`);
  const w = src.rows[0].length;
  const cells = new Int8Array(w * h);
  let roles = false, tint = false;
  const codes = new Map<string, number>();
  for (const [ch, v] of Object.entries(src.key)) {
    if (ch.length !== 1 || ch === '.') throw new Error(`pixmap ${name}: bad key character ${JSON.stringify(ch)}`);
    if (v === 'tint') codes.set(ch, TINT);
    else if (v === 'shade') codes.set(ch, SHADE_CELL);
    else if (isRole(v)) codes.set(ch, ROLE_BASE + ROLES.indexOf(v));
    else if (isColour(v)) codes.set(ch, ci(v));
    else throw new Error(`pixmap ${name}: ${JSON.stringify(v)} is neither a colour, a role nor tint`);
  }
  for (let y = 0; y < h; y++) {
    const row = src.rows[y];
    if (row.length !== w) throw new Error(`pixmap ${name}: row ${y} is ${row.length} wide, not ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.') { cells[y * w + x] = NONE; continue; }
      const v = codes.get(ch);
      if (v === undefined) throw new Error(`pixmap ${name}: character ${JSON.stringify(ch)} at ${x}, ${y} has no key`);
      if (v === TINT || v === SHADE_CELL) tint = true; else if (v >= ROLE_BASE) roles = true;
      cells[y * w + x] = v;
    }
  }
  let uniX = false, uniY = false;
  if (src.slice) {
    const [l, t, r, b] = src.slice;
    if (l < 0 || t < 0 || r < 0 || b < 0 || l + r >= w || t + b >= h) throw new Error(`pixmap ${name}: slice ${src.slice} leaves no middle`);
    uniX = true;
    for (let y = 0; y < h && uniX; y++) for (let x = l + 1; x < w - r; x++) if (cells[y * w + x] !== cells[y * w + l]) { uniX = false; break; }
    uniY = true;
    for (let x = 0; x < w && uniY; x++) for (let y = t + 1; y < h - b; y++) if (cells[y * w + x] !== cells[t * w + x]) { uniY = false; break; }
  }
  const m: PixelMap = { id: nextId++, name, w, h, cells, roles, tint, slice: src.slice, uniX, uniY };
  all.push(m);
  return m;
}

/** Every map made so far, for the checks. */
export function allMaps(): readonly PixelMap[] { return all; }

/** Builds a map from rows that already use palette codes (the direction's own letters), digits for roles. */
export function coded(rows: string[], name: string, slice?: PixelMapSrc['slice']): PixelMap {
  const key: PixelMapSrc['key'] = {};
  for (const row of rows) for (const ch of row) {
    if (ch === '.' || key[ch]) continue;
    if (ROLE_DIGITS[ch]) { key[ch] = ROLE_DIGITS[ch]; continue; }
    const i = CODE.indexOf(ch);
    if (i < 0) throw new Error(`pixmap ${name}: ${JSON.stringify(ch)} is not a palette code`);
    key[ch] = COLOURS[i];
  }
  return pixmap({ rows, key, slice }, name);
}

export function variantKey(m: PixelMap, v: Variant): string {
  if (v.flat) return `${m.id}|flat|${v.flat}`;
  return `${m.id}|${m.roles ? (v.ramp ?? 'clay') : ''}|${m.tint ? (v.tint ?? 'salt') : ''}`;
}

/** The map's cells as palette indices (NONE where nothing is drawn). */
export function resolve(m: PixelMap, v: Variant = {}): Int16Array {
  const out = new Int16Array(m.cells.length);
  const ramp = v.ramp ?? 'clay';
  const t = ci(v.tint ?? 'salt');
  const sh = ci(SHADE[v.tint ?? 'salt'] ?? v.tint ?? 'salt');
  const f = v.flat ? ci(v.flat) : -1;
  for (let i = 0; i < out.length; i++) {
    const c = m.cells[i];
    out[i] = c === NONE ? NONE : f >= 0 ? f : c === TINT ? t : c === SHADE_CELL ? sh : c >= ROLE_BASE ? toneIndex(ramp, c - ROLE_BASE) : c;
  }
  return out;
}

/** The map as straight RGBA at one pixel to the unit. */
export function toRGBA(m: PixelMap, v: Variant = {}): Uint8ClampedArray<ArrayBuffer> {
  const idx = resolve(m, v);
  const px = new Uint8ClampedArray(idx.length * 4);
  for (let i = 0; i < idx.length; i++) {
    const c = idx[i];
    if (c < 0) continue;
    const [r, g, b] = RGB[c];
    px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255;
  }
  return px;
}

/**
 * One piece of a nine-slice: a source rectangle of the map and the rectangle it covers. When the cover is larger
 * than the source the piece repeats across it; `stretch` says it may instead be drawn as one scaled copy of a
 * single column or row, which gives the same cells.
 */
export interface Piece { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number; stretch: boolean }

/** Cuts a sliced map into the pieces that cover `w` by `h` units. */
export function ninePieces(m: PixelMap, w: number, h: number): Piece[] {
  if (!m.slice) throw new Error(`nine: map ${m.name} has no slice`);
  const [l, t, r, b] = m.slice;
  if (w < l + r || h < t + b) throw new Error(`nine: ${m.name} cannot be ${w} by ${h}, its corners need ${l + r} by ${t + b}`);
  const mw = m.w - l - r, mh = m.h - t - b;
  const cw = w - l - r, ch = h - t - b;
  const cols = [[0, l, 0, l], [l, mw, l, cw], [m.w - r, r, w - r, r]];
  const rows = [[0, t, 0, t], [t, mh, t, ch], [m.h - b, b, h - b, b]];
  const out: Piece[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const [sx, sw, dx, dw] = cols[i], [sy, sh, dy, dh] = rows[j];
    if (dw === 0 || dh === 0 || sw === 0 || sh === 0) continue;
    const stretch = (dw === sw || m.uniX) && (dh === sh || m.uniY);
    out.push({ sx, sy, sw, sh, dx, dy, dw, dh, stretch });
  }
  return out;
}
