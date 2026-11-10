// Item icons. Non-block items are drawn by small template painters and auto-outlined;
// block items are rendered as isometric cubes from the block's own tiles.
import { mulberry32, strSeed } from '../core/noise';
import { BLOCKS, TEXTURE_NAMES } from '../data/blocks';
import { ITEM_LIST, IconSpec } from '../data/items';
import type { Atlas } from './atlas';
import { Px, mix, sh } from './textures';

type Draw = (t: Px, a: number, b: number, r: () => number) => void;
const thick = (t: Px, x0: number, y0: number, x1: number, y1: number, c: number): void => {
  t.line(x0, y0, x1, y1, sh(c, 0.3)); t.line(x0 + 1, y0, x1 + 1, y1, sh(c, -0.15));
};
const disc = (t: Px, cx: number, cy: number, rad: number, c: number): void => {
  for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= rad) t.put(x, y, sh(c, (cx - x + cy - y) * 0.14 - (d > rad - 1 ? 0.12 : 0)));
  }
};
const fillRows = (t: Px, y0: number, rows: [number, number][], c: number, shadeX = true): void => {
  rows.forEach(([x0, x1], i) => { for (let x = x0; x <= x1; x++) t.put(x, y0 + i, sh(c, (shadeX ? (x < (x0 + x1) / 2 - 1 ? 0.22 : x > (x0 + x1) / 2 + 1 ? -0.22 : 0) : 0) + (i === 0 ? 0.12 : 0))); });
};
const handle = (t: Px, b: number): void => thick(t, 2, 13, 10, 5, b);

const D: Record<string, Draw> = {
  stick: (t, a) => thick(t, 3, 13, 11, 3, a),
  chunk: (t, a, b) => { fillRows(t, 4, [[6, 9], [4, 11], [3, 12], [3, 12], [4, 12], [4, 11], [5, 10], [6, 8]], a); t.put(6, 6, b); t.put(9, 8, b); t.put(5, 9, b); t.put(10, 6, sh(a, 0.5)); },
  fiber: (t, a, b) => { t.line(4, 13, 6, 3, a); t.line(7, 13, 8, 2, sh(a, 0.3)); t.line(10, 13, 11, 4, b); t.line(5, 9, 11, 9, sh(b, -0.2)); t.line(5, 10, 11, 10, b); },
  feather: (t, a, b) => { for (let i = 0; i < 9; i++) { const x = 4 + i, y = 12 - i; t.put(x, y, a); t.put(x + 1, y, sh(a, -0.1)); if (i > 1) { t.put(x - 1, y - 1, a); t.put(x + 2, y + 1, b); } } t.line(2, 14, 5, 11, b); },
  hide: (t, a, b) => { fillRows(t, 3, [[4, 5], [3, 12], [4, 11], [4, 11], [3, 12], [3, 12], [4, 11], [4, 11], [3, 12], [3, 5]], a); t.rect(10, 12, 12, 12, a); t.put(6, 6, b); t.put(9, 9, b); t.put(7, 10, b); },
  bone: (t, a, b) => { thick(t, 4, 11, 11, 4, a); disc(t, 3.5, 12, 1.5, a); disc(t, 12, 3.5, 1.5, a); t.put(5, 12, b); t.put(12, 5, b); },
  ingot: (t, a) => { for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) t.put(3 + x + (y < 2 ? 1 : 0), 6 + y, sh(a, y === 0 ? 0.45 : y === 1 ? 0.2 : y === 4 ? -0.4 : -0.1 - (x > 7 ? 0.15 : 0))); t.rect(4, 6, 12, 6, sh(a, 0.5)); },
  gem: (t, a) => { fillRows(t, 3, [[6, 9], [5, 10], [4, 11], [4, 11], [5, 10], [6, 9], [7, 8], [7, 8]], a); t.line(6, 3, 5, 6, sh(a, 0.6)); t.put(7, 4, 0xffffff); t.line(8, 6, 8, 10, sh(a, -0.35)); },
  cloth: (t, a, b) => { for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) t.put(x, y, sh((x + y) % 3 === 0 ? b : a, (x + y) % 2 ? 0.08 : -0.08)); },
  idol: (t, a, b) => { fillRows(t, 2, [[7, 8], [6, 9], [6, 9], [7, 8], [5, 10], [4, 11], [6, 9], [6, 9], [6, 9], [5, 10], [5, 10], [4, 11]], b); t.put(7, 3, a); t.put(8, 3, a); t.rect(7, 7, 8, 9, a); t.put(7, 7, sh(a, 0.6)); },
  orb: (t, a, b) => { disc(t, 7.5, 8, 4.6, a); disc(t, 8.5, 9, 2, b); t.put(6, 6, 0xffffff); t.put(5, 7, sh(a, 0.6)); },
  fang: (t, a, b) => { for (let i = 0; i < 9; i++) { const w = Math.max(0, 3 - (i >> 1)); for (let x = 0; x <= w; x++) t.put(5 + i * 0.6 + x, 3 + i, sh(x === 0 ? a : b, x === 0 ? 0.2 : 0)); } },
  dust: (t, a, b, r) => { for (let i = 0; i < 26; i++) { const x = 3 + ((r() * 10) | 0), y = 7 + ((r() * 6) | 0) - Math.abs(x - 8) * 0.0; if (Math.abs(x - 8) + (13 - y) * 0.8 < 7) t.put(x, y, r() < 0.3 ? b : sh(a, (r() - 0.5) * 0.5)); } },
  scale: (t, a, b) => { fillRows(t, 3, [[6, 9], [5, 10], [4, 11], [4, 11], [4, 11], [5, 10], [5, 10], [6, 9], [7, 8]], a); t.line(5, 6, 10, 6, b); t.line(6, 9, 9, 9, b); t.put(6, 4, sh(a, 0.5)); },
  gear: (t, a, b) => { disc(t, 7.5, 7.5, 4.2, a); for (const [x, y] of [[7, 2], [8, 2], [7, 13], [8, 13], [2, 7], [2, 8], [13, 7], [13, 8], [4, 4], [11, 4], [4, 11], [11, 11]]) t.put(x, y, a); disc(t, 7.5, 7.5, 1.4, b); },
  coin: (t, a, b) => { disc(t, 7.5, 8, 4.4, a); t.line(7, 6, 7, 10, b); t.line(8, 6, 8, 10, sh(b, -0.2)); t.put(6, 5, 0xffffff); },
  root: (t, a, b) => { t.line(8, 13, 8, 6, b); t.line(8, 9, 4, 12, b); t.line(8, 10, 12, 13, sh(b, -0.2)); disc(t, 8, 5, 2.6, a); t.put(7, 4, sh(a, 0.6)); },
  sigil: (t, a, b) => { fillRows(t, 2, [[4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [5, 10], [5, 10], [6, 9], [7, 8]], b); t.line(8, 4, 8, 9, a); t.line(6, 6, 10, 6, a); t.put(8, 4, sh(a, 0.6)); },
  fruit: (t, a, b) => { disc(t, 7.5, 9, 4.2, a); t.line(8, 5, 9, 2, 0x6a4a2a); t.put(10, 3, b); t.put(11, 3, b); t.put(10, 4, sh(b, -0.2)); t.put(6, 7, 0xffffff); },
  berries: (t, a, b) => { disc(t, 5.5, 10, 2.2, a); disc(t, 10, 10.5, 2.2, a); disc(t, 8, 6.5, 2.2, sh(a, 0.15)); t.put(8, 3, b); t.put(9, 3, b); t.put(7, 4, b); },
  meat: (t, a, b) => { fillRows(t, 4, [[6, 10], [4, 11], [4, 12], [4, 12], [5, 12], [6, 11], [7, 10]], a); t.rect(7, 6, 9, 8, sh(a, 0.3)); thick(t, 10, 11, 13, 14, b); t.put(13, 13, b); },
  fish: (t, a, b) => { fillRows(t, 5, [[6, 9], [4, 11], [3, 12], [3, 12], [4, 11], [6, 9]], a); t.rect(4, 8, 10, 9, b); t.put(12, 6, a); t.put(13, 5, a); t.put(13, 10, a); t.put(12, 9, a); t.put(5, 7, 0x101018); },
  bowl: (t, a, b) => { fillRows(t, 7, [[3, 12], [3, 12], [4, 11], [5, 10], [6, 9]], b); t.rect(4, 7, 11, 7, a); t.rect(5, 6, 10, 6, sh(a, 0.3)); t.put(6, 6, sh(a, 0.6)); },
  flask: (t, a) => { t.rect(7, 2, 8, 2, 0x8a5f34); t.rect(7, 3, 8, 5, 0xdfeeff); fillRows(t, 6, [[6, 9], [5, 10], [4, 11], [4, 11], [4, 11], [5, 10], [6, 9]], a); t.rect(5, 7, 10, 7, 0xdfeeff); t.put(5, 9, sh(a, 0.6)); },
  rune: (t, a, b) => { fillRows(t, 3, [[5, 10], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [4, 11], [5, 10]], b); t.line(8, 5, 6, 8, a); t.line(6, 8, 9, 8, a); t.line(9, 8, 7, 10, a); },
  arrow: (t, a, b) => { thick(t, 3, 12, 11, 4, b); t.rect(11, 2, 13, 4, a); t.put(13, 2, sh(a, 0.5)); t.put(2, 12, 0xf0f0f6); t.put(3, 14, 0xf0f0f6); t.put(2, 14, 0xd0d0d8); },
  door: (t, a) => { for (let y = 1; y < 15; y++) for (let x = 4; x < 12; x++) t.put(x, y, sh(a, x === 4 || x === 11 || y === 1 || y === 14 ? -0.4 : (x & 1) * 0.1)); t.rect(6, 3, 9, 6, 0x9ad0e8); t.put(10, 9, 0xd8d8e0); },
  gate: (t, a, b) => { for (let y = 2; y < 15; y++) for (let x = 3; x < 13; x++) { const frame = x < 5 || x > 10 || y < 4; t.put(x, y, frame ? sh(b, (x + y) % 3 === 0 ? 0.3 : 0) : sh(a, Math.sin(x * 1.3 + y * 0.9) * 0.4)); } },
  boots: (t, a, b) => { t.rect(5, 3, 8, 9, a); t.rect(5, 10, 11, 12, a); t.rect(5, 13, 12, 13, sh(a, -0.45)); t.rect(5, 3, 8, 4, b); t.put(6, 6, sh(a, 0.4)); },
  ring: (t, a, b) => { for (let i = 0; i < 20; i++) { const an = (i / 20) * 6.283; t.put(Math.round(7.5 + Math.cos(an) * 3.6), Math.round(9 + Math.sin(an) * 3.6), sh(a, -Math.sin(an) * 0.3)); } disc(t, 7.5, 4.5, 1.6, b); t.put(7, 4, 0xffffff); },
  charm: (t, a, b) => { t.line(8, 2, 8, 5, b); disc(t, 7.5, 9, 3.6, a); t.rect(7, 8, 8, 10, b); t.put(6, 7, sh(a, 0.6)); },
  bracer: (t, a, b) => { fillRows(t, 4, [[4, 11], [4, 11], [5, 11], [5, 11], [5, 11], [4, 11], [4, 11]], a); t.rect(4, 4, 11, 4, b); t.rect(4, 10, 11, 10, b); t.put(7, 7, sh(a, 0.6)); t.put(8, 7, sh(a, 0.6)); },
  lens: (t, a, b) => { disc(t, 8.5, 6.5, 4, b); disc(t, 8.5, 6.5, 2.8, a); t.put(7, 5, 0xffffff); thick(t, 2, 13, 5, 10, 0x8a5f34); },
  whistle: (t, a, b) => { t.rect(3, 7, 11, 10, a); t.rect(11, 8, 13, 9, a); t.rect(5, 6, 7, 6, b); t.put(4, 8, sh(a, 0.5)); t.line(3, 11, 2, 14, b); },
  amulet: (t, a, b) => { for (let i = 0; i < 9; i++) { t.put(4 + (i >> 1), 2 + i * 0.6, b); t.put(11 - (i >> 1), 2 + i * 0.6, b); } fillRows(t, 8, [[7, 8], [6, 9], [5, 10], [6, 9], [7, 8]], a); t.put(7, 9, 0xffffff); },
  shell: (t, a, b) => { disc(t, 7.5, 8, 4.8, a); for (let i = 0; i < 14; i++) { const an = i * 0.7, rr = 0.5 + i * 0.3; t.put(Math.round(7.5 + Math.cos(an) * rr), Math.round(8 + Math.sin(an) * rr), b); } },
  cloak: (t, a, b) => { fillRows(t, 2, [[6, 9], [5, 10], [4, 11], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [2, 13], [2, 13], [3, 5]], a); t.rect(9, 12, 12, 12, a); t.rect(6, 2, 9, 3, b); t.line(8, 4, 8, 11, sh(a, -0.35)); },
  shield: (t, a, b) => { fillRows(t, 2, [[3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [4, 11], [4, 11], [5, 10], [6, 9], [7, 8]], b); fillRows(t, 4, [[5, 10], [5, 10], [5, 10], [6, 9], [7, 8]], a); t.put(6, 5, sh(a, 0.6)); },
  crown: (t, a, b) => { fillRows(t, 8, [[3, 12], [3, 12], [3, 12], [4, 11]], a); for (const x of [3, 7, 8, 12]) { t.put(x, 7, a); t.put(x, 6, a); } t.put(3, 5, b); t.put(12, 5, b); t.rect(7, 4, 8, 5, b); t.put(5, 10, b); t.put(10, 10, b); },
  pickaxe: (t, a, b) => { handle(t, b); t.line(5, 3, 10, 3, sh(a, 0.3)); t.line(6, 4, 11, 4, a); t.line(11, 4, 12, 5, a); t.line(12, 5, 12, 10, sh(a, -0.2)); t.line(13, 6, 13, 10, sh(a, -0.35)); t.put(4, 4, a); t.put(12, 11, sh(a, -0.3)); },
  axe: (t, a, b) => { handle(t, b); fillRows(t, 2, [[9, 11], [8, 12], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13]], a); t.put(13, 5, sh(a, 0.6)); t.put(12, 3, sh(a, 0.6)); },
  shovel: (t, a, b) => { thick(t, 3, 13, 9, 7, b); fillRows(t, 2, [[11, 13], [10, 13], [9, 13], [9, 12], [10, 11]], a); t.put(12, 3, sh(a, 0.6)); },
  sword: (t, a, b) => { thick(t, 5, 10, 12, 3, a); t.put(13, 2, sh(a, 0.6)); t.put(12, 2, a); t.line(3, 9, 7, 13, sh(b, -0.3)); t.line(4, 9, 7, 12, b); thick(t, 2, 13, 4, 11, b); t.put(2, 14, sh(b, 0.4)); },
  bow: (t, a, b) => { t.line(4, 2, 9, 3, a); t.line(9, 3, 12, 6, sh(a, 0.2)); t.line(12, 6, 13, 11, a); t.line(5, 3, 9, 4, sh(a, -0.3)); t.line(10, 5, 12, 11, sh(a, -0.3)); t.line(4, 2, 13, 11, 0xe8e8f0); t.rect(10, 4, 11, 5, b); },
  staff: (t, a, b) => { thick(t, 3, 13, 10, 6, b); disc(t, 11.5, 4, 2.4, a); t.put(11, 3, 0xffffff); t.put(9, 6, sh(b, 0.4)); t.put(13, 6, sh(a, -0.4)); },
  totem: (t, a, b) => { t.rect(6, 5, 9, 14, b); for (let y = 5; y < 15; y++) { t.put(6, y, sh(b, 0.25)); t.put(9, y, sh(b, -0.3)); } t.rect(4, 6, 5, 7, b); t.rect(10, 6, 11, 7, b); disc(t, 7.5, 3, 2, a); t.put(7, 8, a); t.put(8, 8, a); t.rect(7, 11, 8, 11, sh(b, -0.5)); },
  helm: (t, a, b) => { fillRows(t, 3, [[6, 9], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 5]], a); t.rect(10, 10, 12, 10, a); t.rect(5, 7, 10, 8, 0x1a1a22); t.rect(3, 6, 12, 6, b); t.put(5, 4, sh(a, 0.6)); },
  chest: (t, a, b) => { fillRows(t, 3, [[2, 5], [2, 13], [2, 13], [2, 13], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11]], a); t.rect(10, 3, 13, 3, a); t.rect(6, 3, 9, 3, 0, 0); t.rect(7, 4, 8, 4, 0, 0); t.line(7, 5, 7, 12, b); t.line(8, 5, 8, 12, sh(b, -0.2)); t.rect(4, 11, 11, 12, b); },
  legs: (t, a, b) => { t.rect(4, 3, 11, 5, b); t.rect(4, 6, 7, 13, a); t.rect(8, 6, 11, 13, sh(a, -0.12)); t.rect(7, 8, 8, 13, 0, 0); for (let y = 6; y < 14; y++) { t.put(4, y, sh(a, 0.3)); t.put(11, y, sh(a, -0.35)); } t.rect(4, 13, 6, 13, b); t.rect(9, 13, 11, 13, b); },
};

/** Dark outline around every opaque pixel: the thing that makes tiny icons read. */
function outline(t: Px): void {
  const add: number[] = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (t.getA(x, y) > 0) continue;
    if ((x > 0 && t.getA(x - 1, y) > 0) || (x < 15 && t.getA(x + 1, y) > 0) || (y > 0 && t.getA(x, y - 1) > 0) || (y < 15 && t.getA(x, y + 1) > 0)) add.push(x, y);
  }
  for (let i = 0; i < add.length; i += 2) t.set(add[i], add[i + 1], 0x15131c, 255);
}
function drawIcon(spec: IconSpec, key: string): Uint8ClampedArray {
  const t = new Px(), d = D[spec.t];
  if (d) { d(t, spec.a, spec.b ?? sh(spec.a, -0.4), mulberry32(strSeed(key))); outline(t); }
  else { console.warn('no icon template', spec.t); t.rect(4, 4, 11, 11, 0xff00ff); }
  return t.d;
}

const CELL = 32, COLS = 20;
const TINT = [0xffffff, 0x86c653, 0x6fb445, 0x3a84dc];

export class Icons {
  readonly sheet: HTMLCanvasElement;
  url = '';
  private index = new Map<string, number>();
  /** 16x16 RGBA pixels for non-block items (used to build held / dropped item models). */
  readonly pixels = new Map<string, Uint8ClampedArray>();

  constructor(atlas: Atlas) {
    const n = ITEM_LIST.length, rows = Math.ceil(n / COLS);
    this.sheet = document.createElement('canvas');
    this.sheet.width = COLS * CELL; this.sheet.height = rows * CELL;
    const ctx = this.sheet.getContext('2d')!;
    const img = ctx.createImageData(CELL, CELL);
    ITEM_LIST.forEach((it, i) => {
      this.index.set(it.key, i);
      img.data.fill(0);
      if (it.block !== undefined) this.blockIcon(atlas, it.block, img.data);
      else {
        const px = drawIcon(it.icon!, it.key);
        this.pixels.set(it.key, px);
        for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
          const s = (((y >> 1) << 4) | (x >> 1)) << 2, d = (y * CELL + x) << 2;
          img.data[d] = px[s]; img.data[d + 1] = px[s + 1]; img.data[d + 2] = px[s + 2]; img.data[d + 3] = px[s + 3];
        }
      }
      ctx.putImageData(img, (i % COLS) * CELL, Math.floor(i / COLS) * CELL);
    });
    this.url = this.sheet.toDataURL();
  }

  private blockIcon(atlas: Atlas, id: number, out: Uint8ClampedArray): void {
    const b = BLOCKS[id], tint = TINT[b.tint], opaque = b.mat === 'opaque';
    const tile = (f: number): Uint8ClampedArray => atlas.tiles[Math.max(0, TEXTURE_NAMES.indexOf(b.faces[f]))];
    const put = (x: number, y: number, t: Uint8ClampedArray, u: number, v: number, shade: number): void => {
      const s = ((Math.min(15, v | 0) << 4) | Math.min(15, u | 0)) << 2, d = (y * CELL + x) << 2;
      const a = t[s + 3];
      if (!opaque && a < 110) return;
      let c = (t[s] << 16) | (t[s + 1] << 8) | t[s + 2];
      if (b.tint && (!opaque || a < 128)) c = (((c >> 16) * (tint >> 16)) / 255) << 16 | ((((c >> 8) & 255) * ((tint >> 8) & 255)) / 255) << 8 | (((c & 255) * (tint & 255)) / 255);
      out[d] = (c >> 16) * shade; out[d + 1] = ((c >> 8) & 255) * shade; out[d + 2] = (c & 255) * shade; out[d + 3] = 255;
    };
    if (b.shape !== 'cube') {
      const t = tile(b.shape === 'box' ? 0 : 0);
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const s = (((y >> 1) << 4) | (x >> 1)) << 2;
        if (b.shape !== 'liquid' && t[s + 3] < 110) continue;
        put(x, y, t, x >> 1, y >> 1, 1);
      }
      return;
    }
    const top = tile(2), left = tile(4), right = tile(0);
    for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) {
      const x = px + 0.5, y = py + 0.5, dx = (x - 16) / 16, dy = (y - 1) / 7.5;
      const u = (dx + dy) / 2, v = (dy - dx) / 2;
      if (u >= 0 && u < 1 && v >= 0 && v < 1) { put(px, py, top, u * 16, v * 16, 1); continue; }
      if (x < 16) { const vv = (y - (8.5 + x * 0.469)) / 15; if (vv >= 0 && vv < 1) put(px, py, left, x, vv * 16, 0.78); }
      else { const vv = (y - (16 - (x - 16) * 0.469)) / 15; if (vv >= 0 && vv < 1) put(px, py, right, x - 16, vv * 16, 0.58); }
    }
  }

  has(key: string): boolean { return this.index.has(key); }
  /** Inline style that shows the icon as a CSS background at `size` px. */
  css(key: string, size = 32): string {
    const i = this.index.get(key) ?? 0, k = size / CELL;
    return `background-image:url(${this.url});background-position:-${(i % COLS) * size}px -${Math.floor(i / COLS) * size}px;background-size:${COLS * CELL * k}px auto;`;
  }
  /** Apply an icon to an element (cheaper than rewriting the style string). */
  apply(el: HTMLElement, key: string | null, size = 32): void {
    if (!key) { el.style.backgroundImage = 'none'; return; }
    const i = this.index.get(key) ?? 0, k = size / CELL;
    el.style.backgroundImage = `url(${this.url})`;
    el.style.backgroundPosition = `-${(i % COLS) * size}px -${Math.floor(i / COLS) * size}px`;
    el.style.backgroundSize = `${COLS * CELL * k}px auto`;
  }
}
void mix;
