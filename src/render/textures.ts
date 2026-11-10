// Procedural 16x16 pixel textures. Every block face name in data/blocks.ts maps to a painter here.
// For opaque tiles the alpha channel is a mask (0 = tinted by biome, or glowing if the block is
// emissive); for cutout / translucent tiles it is ordinary coverage.
import { hashInt, mulberry32, strSeed } from '../core/noise';

export const TS = 16;
type Rnd = () => number;

// ---- colour helpers ---------------------------------------------------------------
function toHsl(c: number): [number, number, number] {
  const r = (c >> 16) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
}
function fromHsl(h: number, s: number, l: number): number {
  const f = (n: number): number => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
function hueTo(h: number, target: number, amt: number): number {
  let d = target - h;
  if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
  return (h + d * amt + 1) % 1;
}
/** Shade a colour by f in [-1, 1]: shadows go cool, highlights warm. The warm/cool split is done
 *  in RGB after the HSL step so that greys (stone, the grey tint-mask tiles) shift as well. */
export function sh(c: number, f: number): number {
  let [h, s, l] = toHsl(c);
  if (f < 0) { h = hueTo(h, 0.7, -f * 0.14); s = Math.min(1, s * (1 - f * 0.2)); l *= 1 + f * 0.6; }
  else { h = hueTo(h, 0.13, f * 0.14); s *= 1 - f * 0.2; l += (1 - l) * f * 0.7; }
  const o = fromHsl(h, s, Math.max(0, Math.min(1, l))), k = Math.abs(f) * 0.18;
  let r = o >> 16, g = (o >> 8) & 255, b = o & 255;
  if (f < 0) { r *= 1 - k; g *= 1 - 0.55 * k; } else { b *= 1 - k; g *= 1 - 0.3 * k; }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
export function mix(a: number, b: number, t: number): number {
  const r = (a >> 16) + ((b >> 16) - (a >> 16)) * t, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

export class Px {
  d = new Uint8ClampedArray(TS * TS * 4);
  set(x: number, y: number, c: number, a = 255): void {
    const o = (((y & 15) << 4) | (x & 15)) << 2;
    this.d[o] = c >> 16; this.d[o + 1] = (c >> 8) & 255; this.d[o + 2] = c & 255; this.d[o + 3] = a;
  }
  /** Set without wrapping; ignores out-of-range pixels. */
  put(x: number, y: number, c: number, a = 255): void { if (x >= 0 && x < 16 && y >= 0 && y < 16) this.set(x, y, c, a); }
  get(x: number, y: number): number { const o = (((y & 15) << 4) | (x & 15)) << 2; return (this.d[o] << 16) | (this.d[o + 1] << 8) | this.d[o + 2]; }
  alpha(x: number, y: number, a: number): void { this.d[((((y & 15) << 4) | (x & 15)) << 2) + 3] = a; }
  getA(x: number, y: number): number { return this.d[((((y & 15) << 4) | (x & 15)) << 2) + 3]; }
  each(fn: (x: number, y: number) => number, a = 255): void { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) this.set(x, y, fn(x, y), a); }
  rect(x0: number, y0: number, x1: number, y1: number, c: number, a = 255): void { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, c, a); }
  shade(x: number, y: number, f: number): void { if (x >= 0 && x < 16 && y >= 0 && y < 16) { const a = this.getA(x, y); this.set(x, y, sh(this.get(x, y), f), a); } }
  line(x0: number, y0: number, x1: number, y1: number, c: number, a = 255): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  }
}
type P = (t: Px, r: Rnd, seed: number) => void;

/** Tileable value noise on a 16px tile; `cells` lattice cells across. */
function vn(x: number, y: number, cells: number, seed: number): number {
  const fx = (x / 16) * cells, fy = (y / 16) * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const h = (a: number, b: number): number => hashInt(((a % cells) + cells) % cells, ((b % cells) + cells) % cells, 0, seed) / 4294967296;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * sx, b = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}
const q = (v: number, levels: number): number => Math.round(v * levels) / levels;

// ---- base painters ------------------------------------------------------------------
const mineral = (c: number, amt = 0.32, cells = 4, cracks = 0): P => (t, r, s) => {
  t.each((x, y) => sh(c, q((vn(x, y, cells, s) * 0.65 + r() * 0.35 - 0.5) * 2, 3) * amt));
  for (let i = 0; i < cracks; i++) {
    let x = (r() * 16) | 0, y = (r() * 16) | 0;
    for (let k = 0, n = 3 + ((r() * 4) | 0); k < n; k++) { t.set(x, y, sh(c, -0.42)); if (r() < 0.6) x += r() < 0.5 ? 1 : -1; else y++; }
  }
};
const speckle = (c: number, amt = 0.16, dens = 0.45): P => (t, r) => t.each(() => (r() < dens ? sh(c, q((r() - 0.5) * 2, 2) * amt) : c));
const cobble = (c: number, n = 9, mortar = -0.5, spread = 0.3): P => (t, r) => {
  const sx: number[] = [], sy: number[] = [], tone: number[] = [];
  for (let i = 0; i < n; i++) { sx.push(r() * 16); sy.push(r() * 16); tone.push((r() - 0.5) * 2 * spread); }
  t.each((x, y) => {
    let d1 = 99, d2 = 99, bi = 0, bdx = 0, bdy = 0;
    for (let i = 0; i < n; i++) {
      let dx = x + 0.5 - sx[i], dy = y + 0.5 - sy[i];
      if (dx > 8) dx -= 16; else if (dx < -8) dx += 16;
      if (dy > 8) dy -= 16; else if (dy < -8) dy += 16;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < d1) { d2 = d1; d1 = d; bi = i; bdx = dx; bdy = dy; } else if (d < d2) d2 = d;
    }
    if (d2 - d1 < 1.0) return sh(c, mortar);
    return sh(c, tone[bi] + (bdx + bdy < -1.5 ? 0.16 : bdx + bdy > 2 ? -0.16 : 0) + (r() - 0.5) * 0.1);
  });
};
const bricks = (c: number, mortar: number, bw = 8, bh = 4, bevel = 0.12): P => (t, r, s) => {
  t.each((x, y) => {
    const row = Math.floor(y / bh), xo = (x + (row % 2) * (bw >> 1)) % 16, bx = Math.floor(xo / bw);
    const ix = xo % bw, iy = y % bh;
    if (iy === bh - 1 || ix === bw - 1) return mortar;
    const tone = (hashInt(bx, row, 0, s) / 4294967296 - 0.5) * 0.36;
    return sh(c, tone + (iy === 0 ? bevel : iy === bh - 2 ? -bevel : 0) + (r() - 0.5) * 0.1);
  });
};
const planks = (c: number): P => (t, r, s) => {
  t.each((x, y) => {
    const board = y >> 2;
    if ((y & 3) === 3) return sh(c, -0.42);
    if (x === (board * 7 + 3) % 16) return sh(c, -0.32);
    const tone = (hashInt(board, (x + board * 7 + 12) >> 4, 1, s) / 4294967296 - 0.5) * 0.2;
    return sh(c, tone + q(vn(x * 0.5, y * 4 + board * 3, 8, s) - 0.5, 2) * 0.22 + ((y & 3) === 0 ? 0.08 : 0));
  });
};
const logSide = (bark: number): P => (t, r, s) => {
  t.each((x, y) => {
    const col = hashInt(x, 0, 2, s) / 4294967296;
    const groove = col < 0.28 && hashInt(x, y >> 2, 3, s) / 4294967296 < 0.8;
    return sh(bark, (groove ? -0.38 : (col - 0.5) * 0.3) + (r() - 0.5) * 0.14);
  });
};
const logTop = (bark: number, wood: number): P => (t, r) => {
  t.each((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) return sh(bark, (r() - 0.5) * 0.3);
    return sh(wood, ((d | 0) % 2 ? -0.16 : 0.08) + (r() - 0.5) * 0.08);
  });
};
const leaves = (c: number, holes = 0.2, amt = 0.4, dots = 0, dotC = 0): P => (t, r, s) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const n = vn(x, y, 5, s) * 0.55 + r() * 0.45;
    if (n < holes + 0.12) { t.set(x, y, sh(c, -0.5), 0); continue; }
    t.set(x, y, dots && r() < dots ? dotC : sh(c, q((n - 0.55) * 2.4, 3) * amt));
  }
};
const grassTop: P = (t, r, s) => { t.each((x, y) => sh(0xe9e9e9, q((vn(x, y, 5, s) * 0.5 + r() * 0.5 - 0.62) * 2, 3) * 0.26), 0); };
const turfSide = (soil: P, fringe: number, tinted: boolean): P => (t, r, s) => {
  soil(t, r, s);
  for (let x = 0; x < 16; x++) {
    const d = 2 + (r() < 0.55 ? 1 : 0) + (r() < 0.2 ? 1 : 0);
    for (let y = 0; y < d; y++) t.set(x, y, sh(fringe, (y === d - 1 ? -0.22 : 0) + (r() - 0.5) * 0.14), tinted ? 0 : 255);
  }
};
const ore = (base: P, c: number, glow = false, n = 5): P => (t, r, s) => {
  base(t, r, s);
  for (let i = 0; i < n; i++) {
    const cx = 1 + ((r() * 13) | 0), cy = 1 + ((r() * 13) | 0), a = glow ? 0 : 255;
    t.shade(cx + 1, cy + 2, -0.3); t.shade(cx + 2, cy + 1, -0.3); t.shade(cx, cy + 2, -0.25);
    t.set(cx, cy, sh(c, 0.45), a); t.set(cx + 1, cy, c, a); t.set(cx, cy + 1, c, a);
    if (r() < 0.7) t.set(cx + 1, cy + 1, sh(c, -0.3), a);
    if (r() < 0.4) t.set(cx - 1, cy + 1, sh(c, -0.15), a);
  }
};
const crystal = (c: number): P => (t, r, s) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const cell = hashInt(x >> 2, y >> 2, 4, s) & 7;
    const band = ((x * 3 + y * 5 + cell * 5) % 14) / 14;
    const f = band < 0.16 ? 0.7 : band < 0.5 ? 0.1 : band < 0.8 ? -0.2 : -0.45;
    t.set(x, y, sh(c, f + (r() - 0.5) * 0.08), f > 0.5 ? 0 : f > 0 ? 90 : 190);
  }
};
const metal = (c: number): P => (t, r) => {
  t.each((x, y) => {
    const e = x === 0 || y === 0 ? 0.3 : x === 15 || y === 15 ? -0.35 : 0;
    const seam = (x === 7 || y === 7) && !e ? -0.18 : 0;
    return sh(c, e + seam + (r() - 0.5) * 0.08 + ((x + y) % 7 === 0 ? 0.08 : 0));
  });
};
const overlayMoss = (base: P, moss: number, amt = 0.4): P => (t, r, s) => {
  base(t, r, s);
  t.each((x, y) => (vn(x, y, 4, s + 9) + r() * 0.3 > 1 - amt ? sh(moss, (r() - 0.5) * 0.4) : t.get(x, y)));
};
const clear: P = (t) => t.d.fill(0);
const plantP = (draw: (t: Px, r: Rnd) => void): P => (t, r) => { clear(t, r, 0); draw(t, r); };

const blades = (c: number, n: number, minH: number, maxH: number): P => plantP((t, r) => {
  for (let i = 0; i < n; i++) {
    let x = 1 + Math.round((i / (n - 1)) * 13 + (r() - 0.5) * 1.6);
    const h = minH + ((r() * (maxH - minH + 1)) | 0), lean = r() < 0.5 ? -1 : 1, tone = (r() - 0.5) * 0.3;
    for (let k = 0; k < h; k++) {
      t.put(x, 15 - k, sh(c, tone - 0.42 + (k / h) * 0.62));
      if (k > h * 0.45 && r() < 0.28) x += lean;
    }
  }
});
const flower = (petal: number, center: number): P => plantP((t, r) => {
  const g = 0x4a9a3c, x = 7 + ((r() * 2) | 0);
  for (let y = 8; y < 16; y++) t.put(x, y, sh(g, (y - 12) * -0.05));
  t.put(x - 1, 12, sh(g, 0.2)); t.put(x - 2, 11, g); t.put(x + 1, 13, sh(g, 0.2)); t.put(x + 2, 12, g);
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1]]) t.put(x + dx, 6 + dy, sh(petal, dy < 0 ? 0.25 : dx < 0 ? 0 : -0.2));
  t.put(x - 2, 6, sh(petal, 0.1)); t.put(x + 2, 6, sh(petal, -0.25)); t.put(x, 4, sh(petal, 0.35));
  t.put(x, 6, center);
});
const shroom = (cap: number, stem: number, spots: number, glow = false): P => plantP((t, r) => {
  for (let y = 11; y < 16; y++) { t.put(7, y, sh(stem, 0.1)); t.put(8, y, sh(stem, -0.2)); }
  const a = glow ? 255 : 255;
  for (let y = 6; y <= 10; y++) {
    const w = y === 6 ? 2 : y === 7 ? 4 : y === 10 ? 4 : 5;
    for (let x = 8 - w; x < 8 + w; x++) t.put(x, y, sh(cap, (x < 6 ? 0.25 : x > 9 ? -0.25 : 0) + (y === 10 ? -0.3 : 0)), a);
  }
  if (spots) { t.put(5, 8, spots); t.put(9, 7, spots); t.put(7, 9, spots); t.put(10, 9, spots); }
  void r;
});
const bush = (c: number, berry: number): P => plantP((t, r) => {
  for (let y = 3; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, (y - 9.5) * 1.15);
    if (d > 7.2 + (r() - 0.5) * 1.6) continue;
    t.put(x, y, sh(c, q(r() - 0.5 + (y < 7 ? 0.2 : y > 12 ? -0.25 : 0), 3) * 0.5));
  }
  if (berry) for (let i = 0; i < 7; i++) { const x = 2 + ((r() * 12) | 0), y = 5 + ((r() * 9) | 0); t.put(x, y, berry); t.put(x + 1, y, sh(berry, -0.3)); }
});

const station = (base: P, deco: (t: Px, r: Rnd) => void): P => (t, r, s) => { base(t, r, s); deco(t, r); };
const frame = (t: Px, c: number): void => { for (let i = 0; i < 16; i++) { t.set(i, 0, c); t.set(i, 15, c); t.set(0, i, c); t.set(15, i, c); } };
const glowRect = (t: Px, x0: number, y0: number, x1: number, y1: number, hot: number, cool: number): void => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t.put(x, y, mix(hot, cool, (y1 - y) / Math.max(1, y1 - y0)), 0);
};
const forgeFront = (base: P, hot: number, cool: number): P => station(base, (t) => {
  t.rect(3, 6, 12, 13, 0x15121a); t.rect(4, 5, 11, 5, 0x15121a);
  glowRect(t, 4, 8, 11, 12, hot, cool);
  for (let x = 4; x <= 11; x += 2) t.put(x, 13, 0x2a2630);
  t.rect(2, 2, 13, 2, 0x2a2630); t.rect(2, 3, 13, 3, 0x4a4652);
});
const forgeSide = (base: P, hot: number): P => station(base, (t) => {
  for (const x of [3, 7, 11]) { t.rect(x, 9, x + 1, 12, 0x15121a); t.put(x, 11, hot, 0); t.put(x + 1, 12, hot, 0); }
  t.rect(0, 2, 15, 2, 0x2a2630);
});
const forgeTop = (base: P, hot: number): P => station(base, (t) => {
  frame(t, 0x2a2630); t.rect(5, 5, 10, 10, 0x15121a);
  for (let y = 6; y <= 9; y++) for (let x = 6; x <= 9; x++) t.put(x, y, sh(hot, (x + y) % 2 ? 0.2 : -0.1), 0);
});
const rune = (t: Px, c: number, k: number): void => {
  // a different glyph per altar, drawn from a 5x7 stroke table
  const G = ['01110100011000111111100011000110001', '11111000100010001000100010001000111', '10001100011111110001100011000110001', '00100011101010100100001000010000100',
    '11111100001111010000100001000011111', '01110100011000101110100011000101110', '10001010100010001010100010000000100', '11111100011010110101101011000111111'];
  const g = G[k % G.length];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y * 5 + x] === '1') t.put(5 + x, 5 + y, c, 0);
};
const swirl = (c: number, a: number): P => (t, r, s) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ang = Math.atan2(y - 7.5, x - 7.5), d = Math.hypot(x - 7.5, y - 7.5);
    const v = Math.sin(ang * 3 + d * 0.9) * 0.5 + 0.5 + (vn(x, y, 4, s) - 0.5) * 0.5;
    t.set(x, y, sh(c, q(v - 0.5, 3) * 0.9), a);
  }
  void r;
};
const crack = (stage: number): P => (t, r) => {
  clear(t, r, 0);
  const rr = mulberry32(991);
  for (let i = 0; i < 3 + stage * 2; i++) {
    let x = 8 + (rr() - 0.5) * 6, y = 8 + (rr() - 0.5) * 6;
    const a = rr() * 6.283, len = 2 + stage * 1.2 + rr() * 2;
    for (let k = 0; k < len; k++) {
      t.put(x | 0, y | 0, 0x0c0a10, 150 + stage * 12);
      x += Math.cos(a + (rr() - 0.5) * 1.4); y += Math.sin(a + (rr() - 0.5) * 1.4);
    }
  }
};

// ---- palette ----------------------------------------------------------------------------
const C = {
  stone: 0x8b8f96, deep: 0x4b4f5e, dirt: 0x8a5f3c, sand: 0xe4d39a, wood: 0xb88a4e, gloom: 0x3f4f5c, rift: 0xb9b0d6, ward: 0x5a6274,
  oakBark: 0x6f5132, pineBark: 0x4d3a2a, paleBark: 0xd9d6c8, kapokBark: 0x7a5a3a, roseBark: 0x6a3f4a,
};
const stoneP = mineral(C.stone, 0.3, 4, 3), deepP = mineral(C.deep, 0.3, 4, 3), dirtP = mineral(C.dirt, 0.34, 6);
const gloomP = mineral(C.gloom, 0.32, 4, 2), riftP = mineral(C.rift, 0.26, 4, 2), wardP = bricks(C.ward, 0x343a48, 8, 8, 0.2);
const scoriaP = mineral(0x4a3438, 0.4, 6, 2), nightP = mineral(0x1e1830, 0.35, 3);
const brickDark = bricks(0x4a4450, 0x24202a, 8, 4, 0.14);

const altarSide = (k: number, c: number): P => station(wardP, (t) => { rune(t, c, k); t.rect(0, 0, 15, 1, 0x343a48); for (let x = 1; x < 16; x += 3) t.put(x, 1, c, 0); });
const altarTop = (k: number, c: number): P => station(wardP, (t) => {
  for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; t.put(Math.round(7.5 + Math.cos(a) * 6), Math.round(7.5 + Math.sin(a) * 6), c, 0); }
  t.rect(6, 6, 9, 9, c, 0); t.put(7, 7, sh(c, 0.6), 0); void k;
});

export const PAINTERS: Record<string, P> = {
  bedrock: mineral(0x3a3a42, 0.5, 6, 4), stone: stoneP, cobble: cobble(0x84888f), deepstone: deepP, dirt: dirtP,
  grass_top: grassTop, grass_side: turfSide(dirtP, 0xe6e6e6, true),
  sand: speckle(C.sand, 0.14, 0.5), sandstone: (t, r, s) => { speckle(0xdcc88c, 0.1, 0.4)(t, r, s); for (const y of [0, 5, 6, 11, 15]) for (let x = 0; x < 16; x++) t.shade(x, y, y === 5 || y === 11 ? -0.2 : 0.14); },
  sandstone_top: speckle(0xdfcb90, 0.1, 0.35), gravel: cobble(0x8a8684, 22, -0.25, 0.5), clay: mineral(0x9aa3b4, 0.14, 3),
  snow: speckle(0xf2f6fb, 0.08, 0.3), ice: (t, r) => t.each((x, y) => sh(0xa9d4f5, ((x + y * 2) % 9 === 0 ? 0.5 : 0) + (r() - 0.5) * 0.1), 205),
  mud: mineral(0x574536, 0.3, 5), snowy_side: turfSide(dirtP, 0xf2f6fb, false), scoria: scoriaP,
  nightglass: station(nightP, (t) => { t.line(3, 2, 7, 6, 0x6a5aa0); t.line(10, 9, 13, 12, 0x4a3f78); t.put(4, 2, 0xb0a0e0); }),
  water: (t, r, s) => t.each((x, y) => sh(0xe4ecf6, q(vn(x, y * 2, 4, s) - 0.55, 3) * 0.3 + (r() < 0.04 ? 0.5 : 0))),
  lava: (t, r, s) => t.each((x, y) => mix(0xc8340c, 0xffd84a, q(Math.min(1, vn(x, y, 4, s) * 0.8 + vn(x, y, 8, s + 1) * 0.35), 4)), 0),

  oak_log: logSide(C.oakBark), oak_log_top: logTop(C.oakBark, 0xc19a5b), oak_leaves: leaves(0xdcdcdc, 0.2, 0.42), oak_planks: planks(0xb88a4e),
  pine_log: logSide(C.pineBark), pine_log_top: logTop(C.pineBark, 0xa87a48), pine_leaves: leaves(0x2f6b4a, 0.16, 0.4), pine_planks: planks(0x8a6238),
  pale_log: station(logSide(C.paleBark), (t, r) => { for (let i = 0; i < 6; i++) { const x = (r() * 14) | 0, y = (r() * 16) | 0; t.rect(x, y, x + 2, y, 0x3a3630); } }),
  pale_log_top: logTop(C.paleBark, 0xe6d6a8), pale_leaves: leaves(0x9fd45e, 0.22, 0.36), pale_planks: planks(0xdcc890),
  kapok_log: logSide(C.kapokBark), kapok_log_top: logTop(C.kapokBark, 0xc48a52), kapok_leaves: leaves(0xd2d2d2, 0.14, 0.5), kapok_planks: planks(0xa8663a),
  rose_log: logSide(C.roseBark), rose_log_top: logTop(C.roseBark, 0xd89aa0), rose_leaves: leaves(0xf2a0c4, 0.2, 0.34, 0.06, 0xfff0f6), rose_planks: planks(0xc97a86),

  tall_grass: blades(0xdcdcdc, 8, 5, 12), fern: plantP((t, r) => {
    for (const [bx, lean] of [[7, -1], [8, 1], [7, 0]] as const) for (let k = 0; k < 11; k++) {
      const x = bx + Math.round(lean * k * 0.45), y = 15 - k;
      t.put(x, y, sh(0xd4d4d4, -0.3 + k * 0.04));
      if (k > 2 && k % 2 === 0) { t.put(x - 1, y, 0xe6e6e6); t.put(x + 1, y, 0xe6e6e6); if (k < 9) { t.put(x - 2, y + 1, 0xcccccc); t.put(x + 2, y + 1, 0xcccccc); } }
    }
    void r;
  }),
  flower_red: flower(0xe2452f, 0xffd24a), flower_yellow: flower(0xf7c832, 0xb86a1c), flower_blue: flower(0x4f86ea, 0xf2f2ff), flower_white: flower(0xf4f1fa, 0xf0c040),
  dead_bush: plantP((t, r) => { const c = 0x8a6a42; t.line(8, 15, 8, 9, c); t.line(8, 11, 4, 6, c); t.line(8, 10, 12, 5, sh(c, -0.2)); t.line(5, 8, 3, 9, c); t.line(11, 7, 13, 8, sh(c, 0.2)); t.line(8, 9, 7, 4, sh(c, 0.15)); void r; }),
  reeds: plantP((t, r) => { for (const x of [3, 7, 8, 12]) { const h = 12 + ((r() * 4) | 0); for (let k = 0; k < h; k++) t.put(x, 15 - k, sh(0x6fae4a, k % 4 === 3 ? -0.35 : (x & 1) * 0.15)); t.put(x, 15 - h, 0x8a5f3c); } }),
  mushroom_brown: shroom(0x9a6a44, 0xe6dcc6, 0), mushroom_red: shroom(0xd23a32, 0xeee6d6, 0xfff6ea),
  cactus: (t, r) => t.each((x, y) => ((x % 4 === 1 && y % 5 === 2) ? 0xf2f0d0 : sh(0x4f9a44, (x % 4 === 0 ? -0.3 : x % 4 === 2 ? 0.16 : 0) + (r() - 0.5) * 0.1))),
  cactus_top: (t, r) => t.each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return sh(0x4f9a44, (d > 6.6 ? -0.35 : (d | 0) % 3 === 0 ? 0.2 : 0) + (r() - 0.5) * 0.1); }),
  berry_bush: bush(0x3f8a3a, 0xd8344a), berry_bush_empty: bush(0x3f8a3a, 0),
  glowshroom: shroom(0x3fe6c8, 0xbff7ea, 0xeafff8, true),

  coal_ore: ore(stoneP, 0x25252c), iron_ore: ore(stoneP, 0xd8a47c), gold_ore: ore(stoneP, 0xf6cf3c),
  mana_ore: ore(stoneP, 0x4f86f6, true, 4), lumenite_ore: ore(deepP, 0x4fe6e0, true, 4), cindrite_ore: ore(deepP, 0xff7a2a, true, 5), eclipsium_ore: ore(deepP, 0xc06af6, true, 4),

  stone_bricks: bricks(0x8a8e96, 0x55585f, 8, 8, 0.18), mossy_bricks: overlayMoss(bricks(0x8a8e96, 0x55585f, 8, 8, 0.18), 0x5a8a42, 0.42),
  sandstone_bricks: bricks(0xdcc88c, 0xb09a62, 8, 8, 0.16), bricks: bricks(0xa8523c, 0xcfc6b4, 8, 4, 0.1),
  glass: (t) => { clear(t, Math.random, 0); frame(t, 0xd8eef2); t.put(3, 3, 0xffffff); t.put(4, 2, 0xffffff); t.put(2, 4, 0xffffff); t.put(11, 12, 0xeaf6f8); t.put(12, 11, 0xeaf6f8); },
  wardstone: wardP,

  torch: plantP((t) => { for (let y = 9; y < 16; y++) { t.put(7, y, 0x8a5f34); t.put(8, y, 0x5f3f22); } t.rect(7, 6, 8, 8, 0xffb52a); t.put(7, 6, 0xfff0a0); t.put(8, 6, 0xffd64a); t.put(7, 7, 0xffe06a); }),
  lantern: plantP((t) => { t.rect(5, 7, 10, 15, 0x2e2a30); t.rect(6, 9, 9, 13, 0xffd66a); t.rect(7, 10, 8, 12, 0xfff4c0); t.rect(6, 7, 9, 7, 0x4a4650); t.rect(5, 15, 10, 15, 0x1e1a20); }),
  workbench_top: station(planks(C.wood), (t) => { frame(t, 0x5a3f22); t.line(1, 5, 14, 5, 0x7a5a30); t.line(1, 10, 14, 10, 0x7a5a30); t.line(5, 1, 5, 14, 0x7a5a30); t.line(10, 1, 10, 14, 0x7a5a30); }),
  workbench_side: station(planks(C.wood), (t) => { t.rect(0, 0, 15, 2, 0x6a4a28); t.rect(0, 3, 15, 3, 0x4a321a); t.line(3, 6, 3, 12, 0x8a8a92); t.rect(2, 5, 5, 6, 0x6a6a72); t.line(9, 6, 12, 12, 0xb0b0b8); t.line(10, 6, 13, 12, 0x6a6a72); t.rect(0, 13, 1, 15, 0x4a321a); t.rect(14, 13, 15, 15, 0x4a321a); }),
  furnace_top: station(cobble(0x7a7c84), (t) => frame(t, 0x4a4c54)), furnace_side: station(cobble(0x7a7c84), (t) => { t.rect(0, 0, 15, 1, 0x5a5c64); t.rect(0, 14, 15, 15, 0x4a4c54); }),
  furnace_front: station(cobble(0x7a7c84), (t) => { t.rect(0, 0, 15, 1, 0x5a5c64); t.rect(3, 7, 12, 13, 0x18161c); t.rect(4, 6, 11, 6, 0x18161c); for (let x = 4; x <= 11; x += 2) t.rect(x, 11, x, 13, 0x3a3840); t.rect(4, 3, 11, 4, 0x2a2830); }),
  furnace_front_lit: forgeFront(station(cobble(0x7a7c84), (t) => { t.rect(0, 0, 15, 1, 0x5a5c64); t.rect(4, 3, 11, 4, 0x2a2830); }), 0xffe06a, 0xff6a1c),
  chest_top: station(planks(0xa9762f), (t) => { frame(t, 0x4a3018); t.rect(1, 7, 14, 8, 0x6a4a22); }),
  chest_side: station(planks(0xa9762f), (t) => { frame(t, 0x4a3018); t.rect(1, 5, 14, 5, 0x3a2410); }),
  chest_front: station(planks(0xa9762f), (t) => { frame(t, 0x4a3018); t.rect(1, 5, 14, 5, 0x3a2410); t.rect(7, 4, 8, 7, 0xd8d8e0); t.put(7, 4, 0xffffff); t.put(8, 7, 0x8a8a92); }),
  anvil_top: metal(0x4a4c58), anvil_side: station(metal(0x3e404a), (t) => { t.rect(0, 0, 15, 3, 0x5a5c68); t.rect(0, 4, 15, 4, 0x24262e); t.rect(4, 5, 11, 10, 0x30323a); t.rect(1, 11, 14, 15, 0x4a4c58); }),
  emberforge_top: forgeTop(brickDark, 0xff8a2a), emberforge_side: forgeSide(brickDark, 0xff8a2a), emberforge_front: forgeFront(brickDark, 0xffe06a, 0xff4a12),
  voidkiln_top: forgeTop(bricks(0x3a3450, 0x1c1828), 0xb06af6), voidkiln_side: forgeSide(bricks(0x3a3450, 0x1c1828), 0xb06af6), voidkiln_front: forgeFront(bricks(0x3a3450, 0x1c1828), 0xe0b0ff, 0x7a2ad6),
  crucible_top: forgeTop(bricks(0xa8a0c8, 0x6a648a), 0xf4f0ff), crucible_side: forgeSide(bricks(0xa8a0c8, 0x6a648a), 0xf4f0ff), crucible_front: forgeFront(bricks(0xa8a0c8, 0x6a648a), 0xffffff, 0x9ad0ff),
  eclforge_top: forgeTop(nightP, 0xe06af6), eclforge_side: forgeSide(nightP, 0xe06af6), eclforge_front: forgeFront(nightP, 0xffd0ff, 0xb02ad6),
  tinker_top: station(planks(0x9a7448), (t) => { frame(t, 0x4a3420); for (const [cx, cy, rr] of [[5, 5, 3], [11, 10, 2.4]] as const) for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; t.put(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), i % 2 ? 0xd8b04a : 0x8a6a22); } t.put(5, 5, 0x3a2a12); t.put(11, 10, 0x3a2a12); }),
  tinker_side: station(planks(0x9a7448), (t) => { t.rect(0, 0, 15, 2, 0x6a4a28); for (const y of [5, 10]) { t.rect(2, y, 13, y + 3, 0x7a5834); t.rect(2, y + 3, 13, y + 3, 0x4a3420); t.rect(7, y + 1, 8, y + 1, 0xd8b04a); } }),
  runeloom_top: station((t, r) => t.each((x, y) => sh(0x5a3f8a, ((x + y) % 2 ? 0.1 : -0.1) + (r() - 0.5) * 0.08)), (t) => { frame(t, 0x4a3420); rune(t, 0xc8a0ff, 5); }),
  runeloom_side: station(planks(0x7a5a8a), (t) => { t.rect(0, 0, 15, 2, 0x4a3420); for (let x = 2; x < 15; x += 3) t.line(x, 3, x, 13, 0xc8a0ff, x % 2 ? 0 : 255); t.rect(0, 14, 15, 15, 0x4a3420); }),
  bedroll_top: (t, r) => t.each((x, y) => sh(y % 5 < 2 ? 0x8a9a5a : 0xb8a878, (r() - 0.5) * 0.14 + (x < 2 || x > 13 ? -0.2 : 0))),
  bedroll_side: (t, r) => t.each((_x, y) => sh(0x9a9a62, (y > 12 ? -0.3 : 0) + (r() - 0.5) * 0.12)),
  guestbed_top: (t, r) => t.each((x, y) => (y < 5 ? sh(0xf2efe6, (r() - 0.5) * 0.08 + (x < 2 || x > 13 ? -0.15 : 0)) : sh(0xc2463c, (y === 5 ? 0.25 : 0) + (r() - 0.5) * 0.12 + (x < 1 || x > 14 ? -0.25 : 0)))),
  guestbed_side: station(planks(C.wood), (t) => { t.rect(0, 7, 15, 11, 0xc2463c); t.rect(0, 7, 15, 7, 0xe06a5c); }),
  door: station(planks(0xa77a44), (t) => { frame(t, 0x5a3f22); t.rect(4, 3, 11, 9, 0, 0); t.line(7, 3, 7, 9, 0x5a3f22); t.line(8, 3, 8, 9, 0x5a3f22); t.line(4, 6, 11, 6, 0x5a3f22); }),
  door_lower: station(planks(0xa77a44), (t) => { frame(t, 0x5a3f22); t.rect(3, 3, 12, 12, 0x94683a); t.rect(11, 1, 12, 2, 0xd8d8e0); }),

  crystal_cyan: crystal(0x3fd6f2), crystal_violet: crystal(0xb060f6), crystal_amber: crystal(0xf6b030),
  iron_block: metal(0xd4d6dc), gold_block: metal(0xf4cb3a), lumenite_block: station(metal(0x4fd6d6), (t) => { for (let i = 2; i < 14; i += 4) for (let j = 2; j < 14; j += 4) t.rect(i, j, i + 1, j + 1, 0xc0fff8, 0); }),

  gloomstone: gloomP, mycel_top: (t, r, s) => { mineral(0x4a3f6a, 0.34, 6)(t, r, s); for (let i = 0; i < 9; i++) t.set((r() * 16) | 0, (r() * 16) | 0, 0x8af0d8); },
  mycel_side: turfSide(gloomP, 0x4a3f6a, false),
  gloom_stem: logSide(0xa8b4c8), gloom_stem_top: logTop(0xa8b4c8, 0xd0d8e6),
  gloomcap_teal: (t, r, s) => { mineral(0x2f8a86, 0.3, 4)(t, r, s); for (let i = 0; i < 6; i++) { const x = (r() * 15) | 0, y = (r() * 15) | 0; t.rect(x, y, x + 1, y + 1, 0x8af6e0, 0); } },
  gloomcap_violet: (t, r, s) => { mineral(0x6a3f9a, 0.3, 4)(t, r, s); for (let i = 0; i < 6; i++) { const x = (r() * 15) | 0, y = (r() * 15) | 0; t.rect(x, y, x + 1, y + 1, 0xd8a0ff, 0); } },
  gloom_planks: planks(0x4f7a82), umbrite_ore: ore(gloomP, 0x9a5af0, true, 5), noctrium_ore: ore(gloomP, 0x2ad6b0, true, 5),
  lumen_frond: blades(0x6af6a8, 6, 7, 14), sporelamp: (t, r, s) => t.each((x, y) => mix(0xb8641c, 0xffe07a, q(vn(x, y, 3, s) * 0.8 + r() * 0.2, 3)), 0),

  riftstone: riftP, skyturf_top: mineral(0x6fd8c0, 0.26, 6), skyturf_side: turfSide(mineral(0x8f9ab8, 0.26, 6), 0x6fd8c0, false), skysoil: mineral(0x8f9ab8, 0.26, 6),
  star_log: logSide(0xe0e6f6), star_log_top: logTop(0xe0e6f6, 0xb8c6ee), star_leaves: leaves(0x7f9af0, 0.2, 0.36, 0.07, 0xf4f8ff), star_planks: planks(0xc6d0f2),
  aetherium_ore: ore(riftP, 0x4fb6f6, true, 5), prismite_ore: ore(riftP, 0xf6a0f0, true, 5),
  cloud: (t, r, s) => t.each((x, y) => sh(0xf4f6fc, q(vn(x, y, 3, s) - 0.5, 3) * 0.14)),
  prism_crystal: (t, r, s) => { crystal(0xe8e8ff)(t, r, s); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x * 3 + y * 5) % 14 < 2) t.set(x, y, fromHsl(((x + y) / 20) % 1, 0.8, 0.8), 0); },

  hollow_frame: station(nightP, (t) => { frame(t, 0x120e1e); rune(t, 0xb070ff, 2); }), hollow_portal: swirl(0x8a4af0, 175),
  rift_frame: station(mineral(0x6a6078, 0.3, 4), (t) => { frame(t, 0x3a3048); rune(t, 0xffd86a, 4); }), rift_portal: swirl(0xf6c64a, 175),

  moss_stone: overlayMoss(cobble(0x84888f), 0x5a8a42, 0.45), bone_block: (t, r, s) => { mineral(0xe6dfcc, 0.16, 5)(t, r, s); for (let i = 0; i < 7; i++) t.set((r() * 16) | 0, (r() * 16) | 0, 0xa89f8a); },
  gilded_bricks: station(bricks(0xdcc88c, 0xb09a62, 8, 8, 0.16), (t) => { t.rect(0, 0, 15, 0, 0xf6cf3c); t.rect(0, 8, 15, 8, 0xd8a82a); }),
  thatch: (t, r) => t.each((x, y) => sh(0xd2b25a, ((x + y * 3) % 5 === 0 ? -0.35 : (x + y * 3) % 5 === 2 ? 0.2 : 0) + (r() - 0.5) * 0.16)),
  path_top: station(mineral(0xa07a50, 0.22, 6), (t, r) => { for (let i = 0; i < 6; i++) t.set((r() * 16) | 0, (r() * 16) | 0, 0xb8b0a0); }),
  brood_nest: (t, r, s) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const web = (x + y) % 5 === 0 || (x - y + 16) % 6 === 0 || vn(x, y, 4, s) > 0.62; t.set(x, y, sh(0x5a2630, (r() - 0.5) * 0.4), web ? 255 : 0); } t.rect(6, 6, 9, 9, 0xff6a5a); t.put(7, 7, 0xffd0c0); },
  crate: station(planks(0xb89458), (t) => { frame(t, 0x6a4a28); t.line(1, 1, 14, 14, 0x7a5a30); t.line(14, 1, 1, 14, 0x7a5a30); }),
  storm_block: station(mineral(0x4a5a8a, 0.24, 3), (t) => { t.line(9, 1, 6, 7, 0xd0e6ff, 0); t.line(6, 7, 10, 8, 0xd0e6ff, 0); t.line(10, 8, 6, 14, 0xd0e6ff, 0); }),
};
const ALTAR_C = [0x6ae05a, 0xf6b83a, 0x6ab8f6, 0x4ae6b8, 0x9ab6ff, 0xf4f0ff, 0xd86af6, 0xffd27a];
ALTAR_C.forEach((c, i) => { PAINTERS['altar' + (i + 1)] = altarSide(i, c); PAINTERS['altar' + (i + 1) + '_top'] = altarTop(i, c); });
for (let i = 0; i < 8; i++) PAINTERS['crack' + i] = crack(i);

export function paintTile(name: string): Uint8ClampedArray {
  const t = new Px(), p = PAINTERS[name], seed = strSeed(name);
  if (p) p(t, mulberry32(seed), seed);
  else { console.warn('no painter for texture', name); t.each((x, y) => ((x >> 2) + (y >> 2)) % 2 ? 0xff00ff : 0x101010); }
  return t.d;
}
