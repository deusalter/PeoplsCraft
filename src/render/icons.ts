// Item icons. Non-block items are drawn by small template painters and auto-outlined;
// block items are rendered as isometric cubes from the block's own tiles.
import { mulberry32, strSeed } from '../core/noise';
import { BLOCKS, TEXTURE_NAMES } from '../data/blocks';
import { ITEM_LIST, IconSpec } from '../data/items';
import type { Atlas } from './atlas';
import { Px, mix, sh } from './textures';

// a = main colour, b = secondary, c = optional trim (a tier's highlight / guard / band colour)
type Draw = (t: Px, a: number, b: number, r: () => number, c?: number) => void;
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
  ingot: (t, a, _b, _r, c) => { for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) t.put(3 + x + (y < 2 ? 1 : 0), 6 + y, sh(a, y === 0 ? 0.45 : y === 1 ? 0.2 : y === 4 ? -0.4 : -0.1 - (x > 7 ? 0.15 : 0))); t.rect(4, 6, 12, 6, c ?? sh(a, 0.5)); },
  gem: (t, a) => { fillRows(t, 3, [[6, 9], [5, 10], [4, 11], [4, 11], [5, 10], [6, 9], [7, 8], [7, 8]], a); t.line(6, 3, 5, 6, sh(a, 0.6)); t.put(7, 4, 0xffffff); t.line(8, 6, 8, 10, sh(a, -0.35)); },
  cloth: (t, a, b) => { for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) t.put(x, y, sh((x + y) % 3 === 0 ? b : a, (x + y) % 2 ? 0.08 : -0.08)); },
  idol: (t, a, b) => { fillRows(t, 2, [[7, 8], [6, 9], [6, 9], [7, 8], [5, 10], [4, 11], [6, 9], [6, 9], [6, 9], [5, 10], [5, 10], [4, 11]], b); t.put(7, 3, a); t.put(8, 3, a); t.rect(7, 7, 8, 9, a); t.put(7, 7, sh(a, 0.6)); },
  orb: (t, a, b) => { disc(t, 7.5, 8, 4.6, a); disc(t, 8.5, 9, 2, b); t.put(6, 6, 0xffffff); t.put(5, 7, sh(a, 0.6)); },
  fang: (t, a, b) => { for (let i = 0; i < 9; i++) { const w = Math.max(0, 3 - (i >> 1)); for (let x = 0; x <= w; x++) t.put(5 + i * 0.6 + x, 3 + i, sh(x === 0 ? a : b, x === 0 ? 0.2 : 0)); } },
  dust: (t, a, b, r) => {
    // a solid mound (scattered single pixels turn into a smudge once outlined) with two loose motes
    [[7, 8], [5, 10], [4, 11], [3, 12], [2, 13]].forEach(([x0, x1], i) => { for (let x = x0; x <= x1; x++) t.put(x, 9 + i, r() < 0.22 ? b : sh(a, (x < 7 ? 0.2 : x > 9 ? -0.25 : 0) + (i === 4 ? -0.15 : 0))); });
    t.put(6, 6, b, 254); t.put(10, 7, b, 254);
  },
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
  arrow: (t, a, b) => {
    t.line(3, 12, 11, 4, b); t.line(4, 12, 11, 5, sh(b, -0.25));
    for (let y = 2; y <= 5; y++) for (let x = 10; x <= 13; x++) { const u = 13 - x, v = y - 2; if (u + v <= 3) t.put(x, y, u + v === 0 ? sh(a, 0.6) : v > u ? sh(a, -0.3) : v < u ? sh(a, 0.25) : a); }
    t.put(2, 11, 0xf0f0f6); t.put(2, 12, 0xf0f0f6); t.put(3, 13, 0xf0f0f6); t.put(2, 13, 0xd0d0d8); t.put(4, 13, 0xd0d0d8);
  },
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
  pickaxe: (t, a, b, _r, c) => { handle(t, b); t.line(5, 3, 10, 3, c ?? sh(a, 0.3)); t.line(6, 4, 11, 4, a); t.line(11, 4, 12, 5, a); t.line(12, 5, 12, 10, sh(a, -0.2)); t.line(13, 6, 13, 10, sh(a, -0.35)); t.put(4, 4, a); t.put(12, 11, sh(a, -0.3)); },
  axe: (t, a, b, _r, c) => {
    handle(t, b); fillRows(t, 1, [[9, 11], [8, 12], [8, 13], [10, 13], [11, 13], [11, 13], [12, 13]], a, false);
    const edge = c ?? sh(a, 0.55);
    t.put(12, 1, edge); t.put(12, 7, edge); for (let y = 2; y <= 7; y++) t.put(13, y, edge);
    t.put(9, 1, sh(a, 0.3)); t.put(8, 2, sh(a, 0.3)); t.put(8, 3, sh(a, 0.3)); t.put(10, 4, sh(a, -0.3)); t.put(11, 5, sh(a, -0.3)); t.put(11, 6, sh(a, -0.3));
  },
  shovel: (t, a, b, _r, c) => { thick(t, 3, 13, 9, 7, b); fillRows(t, 2, [[11, 13], [10, 13], [9, 13], [9, 12], [10, 11]], a); t.put(12, 3, c ?? sh(a, 0.6)); t.put(13, 2, c ?? sh(a, 0.6)); },
  sword: (t, a, b, _r, c) => {
    // three-pixel blade: lit edge, flat, shaded edge. This sprite is also extruded into the held weapon.
    for (let i = 0; i < 8; i++) { t.put(5 + i, 9 - i, c ?? sh(a, 0.5)); t.put(5 + i, 10 - i, a); t.put(6 + i, 10 - i, sh(a, -0.3)); }
    t.put(13, 2, sh(a, 0.7));
    t.line(2, 8, 7, 13, c ? sh(c, -0.2) : sh(b, -0.25)); t.put(3, 8, c ?? sh(b, 0.3)); t.put(7, 12, c ?? sh(b, 0.3));
    t.put(4, 11, b); t.put(3, 12, sh(b, -0.15)); t.put(2, 13, b); t.put(1, 14, c ?? sh(b, 0.45));
  },
  // the string is alpha 254: solid everywhere it matters, but it does not grow a black outline
  bow: (t, a, b, _r, c) => { t.line(4, 2, 9, 3, a); t.line(9, 3, 12, 6, sh(a, 0.2)); t.line(12, 6, 13, 11, a); t.line(5, 3, 9, 4, sh(a, -0.3)); t.line(10, 5, 12, 11, sh(a, -0.3)); t.line(4, 2, 13, 11, 0xe8e8f0, 254); t.rect(10, 4, 11, 5, c ?? b); },
  staff: (t, a, b, _r, c) => { thick(t, 3, 13, 10, 6, b); disc(t, 11.5, 4, 2.4, a); t.put(11, 3, 0xffffff); t.put(9, 6, c ?? sh(b, 0.4)); t.put(10, 7, c ?? sh(b, 0.4)); t.put(13, 6, sh(a, -0.4)); },
  totem: (t, a, b, _r, c) => { t.rect(6, 5, 9, 14, b); for (let y = 5; y < 15; y++) { t.put(6, y, sh(b, 0.25)); t.put(9, y, sh(b, -0.3)); } t.rect(4, 6, 5, 7, b); t.rect(10, 6, 11, 7, b); disc(t, 7.5, 3, 2, a); t.put(7, 8, c ?? a); t.put(8, 8, c ?? a); t.rect(7, 11, 8, 11, sh(b, -0.5)); },
  helm: (t, a, b, _r, c) => { fillRows(t, 3, [[6, 9], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 5]], a); t.rect(10, 10, 12, 10, a); t.rect(5, 7, 10, 8, 0x1a1a22); t.rect(3, 6, 12, 6, b); t.put(5, 4, c ?? sh(a, 0.6)); t.put(6, 3, c ?? sh(a, 0.6)); },
  chest: (t, a, b, _r, c) => { fillRows(t, 3, [[2, 5], [2, 13], [2, 13], [2, 13], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11]], a); t.rect(10, 3, 13, 3, a); t.rect(6, 3, 9, 3, 0, 0); t.rect(7, 4, 8, 4, 0, 0); t.line(7, 5, 7, 12, b); t.line(8, 5, 8, 12, sh(b, -0.2)); t.rect(4, 11, 11, 12, b); if (c !== undefined) { t.rect(2, 4, 4, 4, c); t.rect(11, 4, 13, 4, c); } },
  legs: (t, a, b, _r, c) => { t.rect(4, 3, 11, 5, b); if (c !== undefined) t.rect(4, 3, 11, 3, c); t.rect(4, 6, 7, 13, a); t.rect(8, 6, 11, 13, sh(a, -0.12)); t.rect(7, 8, 8, 13, 0, 0); for (let y = 6; y < 14; y++) { t.put(4, y, sh(a, 0.3)); t.put(11, y, sh(a, -0.35)); } t.rect(4, 13, 6, 13, b); t.rect(9, 13, 11, 13, b); },
  // ---- boss summoning items: one silhouette each ----
  lure: (t, a, b) => { t.line(8, 1, 8, 3, b, 254); fillRows(t, 4, [[7, 8], [6, 9], [6, 9], [6, 9], [7, 8], [7, 8]], a); t.put(7, 5, 0x1a1a22); t.put(8, 7, sh(a, -0.35)); for (const [x, y] of [[8, 10], [8, 11], [8, 12], [7, 13], [6, 13], [5, 12], [5, 11], [6, 10]]) t.put(x, y, b); },
  bell: (t, a, b) => { t.rect(7, 1, 8, 2, b); fillRows(t, 3, [[7, 8], [6, 9], [5, 10], [5, 10], [5, 10], [4, 11], [4, 11]], a); t.rect(3, 10, 12, 10, sh(a, -0.3)); t.rect(3, 10, 5, 10, sh(a, 0.1)); t.put(6, 5, sh(a, 0.6)); t.put(6, 6, sh(a, 0.6)); t.rect(7, 11, 8, 12, b); t.put(7, 11, sh(b, 0.4)); },
  censer: (t, a, b) => {
    t.line(8, 2, 4, 7, sh(b, 0.35), 254); t.line(8, 2, 11, 7, sh(b, 0.35), 254); t.put(7, 1, b); t.put(8, 1, b);
    fillRows(t, 8, [[4, 11], [3, 12], [4, 11], [5, 10], [6, 9]], b); t.rect(4, 8, 11, 8, sh(b, 0.4)); t.rect(6, 13, 9, 13, sh(b, -0.3));
    for (const x of [5, 7, 9]) t.put(x, 10, a); t.put(6, 9, a); t.put(8, 9, a); t.put(10, 9, a);
    t.put(8, 5, a, 254); t.put(7, 4, a, 254); t.put(9, 6, sh(a, -0.2), 254);
  },
  kite: (t, a, b) => {
    fillRows(t, 1, [[8, 8], [7, 9], [6, 10], [5, 11], [4, 12], [5, 11], [6, 10], [6, 10], [7, 9], [7, 9], [8, 8]], a, false);
    for (let y = 1; y <= 11; y++) for (let x = 4; x <= 12; x++) if (t.getA(x, y)) t.put(x, y, sh(a, x < 8 ? 0.25 : x > 8 ? -0.2 : 0));
    t.line(8, 1, 8, 11, b); t.line(4, 5, 12, 5, b); t.line(8, 12, 6, 13, b, 254); t.line(6, 13, 5, 15, b, 254); t.put(4, 13, a); t.put(7, 14, a);
  },
  mask: (t, a, b, _r, c) => {
    fillRows(t, 3, [[5, 10], [4, 11], [3, 12], [3, 12], [3, 12], [4, 11], [5, 10], [6, 9], [7, 8]], a); t.rect(4, 4, 11, 4, c ?? b);
    t.rect(5, 6, 6, 6, 0x15131c); t.rect(9, 6, 10, 6, 0x15131c); t.put(4, 6, b); t.put(11, 6, b); t.rect(7, 8, 8, 9, sh(a, -0.3)); t.put(7, 10, b); t.put(8, 10, b);
  },
  key: (t, a, b) => {
    disc(t, 5, 5, 2.6, a); t.rect(4, 4, 5, 5, 0x15131c); t.line(7, 7, 12, 12, a); t.line(7, 8, 11, 12, sh(a, -0.3));
    t.put(12, 10, a); t.put(13, 11, a); t.put(10, 12, sh(a, -0.3)); t.put(11, 13, sh(a, -0.3)); t.put(12, 13, a); t.put(3, 3, sh(a, 0.6)); t.put(6, 2, b); t.put(2, 6, b);
  },
  // ---- armour silhouettes per play style (melee keeps helm / chest / legs) ----
  hood: (t, a, b, _r, c) => { fillRows(t, 2, [[7, 8], [6, 9], [5, 10], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [3, 12], [3, 12], [4, 11]], a); t.rect(6, 6, 9, 9, 0x1a1a22); t.rect(6, 5, 9, 5, b); t.put(5, 6, b); t.put(10, 6, b); t.rect(7, 11, 8, 11, c ?? b); t.put(7, 3, c ?? sh(a, 0.6)); },
  jerkin: (t, a, b, _r, c) => {
    fillRows(t, 3, [[4, 5], [4, 6], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11], [5, 10]], a); t.rect(10, 3, 11, 3, a); t.rect(9, 4, 11, 4, sh(a, -0.2));
    for (let y = 5; y <= 10; y++) t.put(y & 1 ? 7 : 8, y, b); t.rect(4, 11, 11, 11, c ?? b); t.put(4, 3, sh(a, 0.5));
  },
  circlet: (t, a, b, _r, c) => {
    // a thin band rising to a single set gem (the crown template is the heavy four-point version)
    t.rect(3, 9, 12, 9, a); t.rect(4, 10, 11, 10, sh(a, -0.3)); t.put(3, 8, a); t.put(12, 8, sh(a, -0.2)); t.put(2, 7, a); t.put(13, 7, sh(a, -0.2)); t.rect(3, 9, 5, 9, sh(a, 0.3));
    t.put(6, 8, a); t.put(9, 8, sh(a, -0.2)); t.put(6, 7, a); t.put(9, 7, sh(a, -0.2)); t.rect(7, 5, 8, 5, a);
    t.rect(7, 6, 8, 8, b); t.put(7, 6, c ?? sh(b, 0.7)); t.put(8, 8, sh(b, -0.3));
  },
  robe: (t, a, b, _r, c) => {
    fillRows(t, 2, [[6, 9], [4, 11], [2, 13], [2, 13], [2, 13], [2, 3], [2, 3]], a); t.rect(12, 7, 13, 8, sh(a, -0.22)); t.rect(6, 2, 9, 2, 0, 0); t.put(6, 2, a); t.put(9, 2, a);
    fillRows(t, 7, [[5, 10], [5, 10], [5, 10], [4, 11], [4, 11], [3, 12], [3, 12], [2, 13]], a); t.line(7, 3, 7, 13, b); t.line(8, 3, 8, 13, sh(b, -0.2)); t.rect(2, 14, 13, 14, c ?? b); t.rect(2, 8, 3, 8, c ?? b); t.rect(12, 8, 13, 8, c ?? b);
  },
  skirt: (t, a, b, _r, c) => {
    fillRows(t, 5, [[5, 10], [4, 11], [4, 11], [3, 12], [3, 12], [2, 13], [2, 13], [2, 13]], a); t.rect(5, 3, 10, 4, b); t.rect(7, 3, 8, 4, c ?? sh(b, 0.5));
    for (let y = 6; y <= 12; y++) { t.put(6, y, sh(a, -0.3)); t.put(10, y, sh(a, -0.35)); } t.rect(2, 12, 13, 12, c ?? b);
  },
  mantle: (t, a, b, _r, c) => {
    fillRows(t, 3, [[6, 9], [4, 11], [3, 12], [2, 13], [2, 13], [2, 13], [2, 13], [2, 4]], a); t.rect(6, 10, 9, 10, a); t.rect(11, 10, 13, 10, sh(a, -0.22)); t.put(3, 11, a); t.rect(7, 11, 8, 11, a); t.put(12, 11, sh(a, -0.22));
    t.rect(6, 3, 9, 3, b); t.rect(5, 4, 10, 4, b); t.rect(7, 4, 8, 5, 0x1a1a22); t.put(7, 6, c ?? sh(b, 0.6)); t.put(8, 6, c ?? sh(b, 0.6)); t.rect(2, 9, 13, 9, c ?? b);
  },
  wraps: (t, a, b, _r, c) => {
    for (let y = 3; y <= 13; y++) for (let x = 4; x <= 11; x++) { if (y > 6 && (x === 7 || x === 8)) continue; const band = y > 4 && ((x + y) & 3) === 0; t.put(x, y, band ? b : sh(a, x === 4 || x === 8 && y > 6 ? 0.25 : x === 11 || x === 6 && y > 6 ? -0.3 : x > 7 ? -0.1 : 0)); }
    t.rect(4, 3, 11, 3, c ?? b); t.rect(4, 13, 6, 13, sh(a, -0.4)); t.rect(9, 13, 11, 13, sh(a, -0.4));
  },
};

const OUTLINE = 0x15131c;
/** Dark outline around every solid pixel: the thing that makes tiny icons read. Pixels drawn at
 *  alpha 254 (strings, chains, loose motes) are solid but do not grow an outline of their own. */
function outline(t: Px): void {
  const add: number[] = [], solid = (x: number, y: number): boolean => x >= 0 && x < 16 && y >= 0 && y < 16 && t.getA(x, y) === 255;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (t.getA(x, y) > 0) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push(x, y);
  }
  for (let i = 0; i < add.length; i += 2) t.set(add[i], add[i + 1], OUTLINE, 255);
  // rim light along the upper-left edge so dark items (coal, flint, thorns) keep a shape on the dark slot
  const rim: number[] = [], edge = (x: number, y: number): boolean => x >= 0 && y >= 0 && t.getA(x, y) === 255 && t.get(x, y) === OUTLINE;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (t.getA(x, y) === 255 && t.get(x, y) !== OUTLINE && (edge(x, y - 1) || edge(x - 1, y))) rim.push(x, y);
  for (let i = 0; i < rim.length; i += 2) t.set(rim[i], rim[i + 1], sh(t.get(rim[i], rim[i + 1]), 0.25));
}
function drawIcon(spec: IconSpec, key: string): Uint8ClampedArray {
  const t = new Px(), d = D[spec.t];
  if (d) { d(t, spec.a, spec.b ?? sh(spec.a, -0.4), mulberry32(strSeed(key)), spec.c); outline(t); }
  else { console.warn('no icon template', spec.t); t.rect(4, 4, 11, 11, 0xff00ff); }
  return t.d;
}

const CELL = 32, COLS = 20;
/** Height (0..1] of a block drawn as an isometric solid: 1 for cubes, the box height for full-footprint
 *  slabs (bedroll, guest bed), 0 for everything else (plants, torches, doors, liquids are drawn flat). */
export function slabHeight(id: number): number {
  const b = BLOCKS[id];
  if (b.shape === 'cube') return 1;
  return b.shape === 'box' && b.box[0] === 0 && b.box[2] === 0 && b.box[3] === 16 && b.box[5] === 16 ? b.box[4] / 16 : 0;
}
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
    const h = slabHeight(id);
    if (!h) {
      const t = tile(0);
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const s = (((y >> 1) << 4) | (x >> 1)) << 2;
        if (b.shape !== 'liquid' && t[s + 3] < 110) continue;
        put(x, y, t, x >> 1, y >> 1, 1);
      }
      return;
    }
    // isometric cube, or a slab of height h whose top face is lowered and whose sides are cut short
    const top = tile(2), left = tile(4), right = tile(0), drop = 15 * (1 - h);
    for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) {
      const x = px + 0.5, y = py + 0.5, dx = (x - 16) / 16, dy = (y - 1 - drop) / 7.5;
      const u = (dx + dy) / 2, v = (dy - dx) / 2, mid = px === 15 || px === 16 ? 0.9 : 1;
      // the two front edges of the top face catch the light, the vertical edge between the sides is in shade
      if (u >= 0 && u < 1 && v >= 0 && v < 1) { put(px, py, top, u * 16, v * 16, u * 16 >= 15 || v * 16 >= 15 ? 1.15 : 1); continue; }
      if (x < 16) { const vv = (y - (8.5 + x * 0.469)) / 15; if (vv >= 1 - h && vv < 1) put(px, py, left, x, vv * 16, 0.78 * mid); }
      else { const vv = (y - (16 - (x - 16) * 0.469)) / 15; if (vv >= 1 - h && vv < 1) put(px, py, right, x - 16, vv * 16, 0.58 * mid); }
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
