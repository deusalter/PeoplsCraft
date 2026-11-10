// Procedural 16x16 pixel textures. Every block face name in data/blocks.ts maps to a painter here.
// For opaque tiles the alpha channel is a mask (0 = tinted by biome, or glowing if the block is
// emissive); for cutout / translucent tiles it is ordinary coverage.
import { hash01, hashInt, mulberry32, strSeed } from '../core/noise';

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
// Natural tiles are built from smooth noise quantised onto a short hand-picked ramp plus a few
// stamped features lit from above; per-pixel white noise is avoided because it reads as static.
/** Value below which `frac` of the tile's 256 samples of f fall, so coverage is exact for any seed. */
const cutoff = (f: (x: number, y: number) => number, frac: number): number => {
  const v: number[] = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) v.push(f(x, y));
  return v.sort((a, b) => a - b)[Math.min(255, Math.floor(256 * frac))];
};
const wrapD = (d: number): number => (d > 8 ? d - 16 : d < -8 ? d + 16 : d);

const mineral = (c: number, amt = 0.32, cells = 4): P => (t, r, s) => {
  t.each((x, y) => sh(c, q((vn(x, y, cells, s) * 0.85 + r() * 0.15 - 0.5) * 2, 3) * amt));
};
const ST = [0x5f6272, 0x767a86, 0x8b8f96, 0x9c9f9f, 0xb0b1a8], DS = [0x2e3142, 0x414556, 0x525666, 0x64687a, 0x787c92];
const DT = [0x5a3826, 0x744a30, 0x8a5f3c, 0xa07448, 0xb98f5e], SD = [0xc9ad7c, 0xd8c389, 0xe4d39a, 0xf1e4b2];
const GR = [0x9eb8b0, 0xbfceba, 0xdde4d2, 0xfffad2];
const ramp5 = (c: number, k = 1): number[] => [sh(c, -0.5 * k), sh(c, -0.25 * k), c, sh(c, 0.2 * k), sh(c, 0.42 * k)];
/** Mottled rock without features: the bed that ores sit in. */
const rockBase = (g: number[]): P => (t, _r, s) => t.each((x, y) => { const v = vn(x, y, 3, s) * 0.7 + vn(x, y, 6, s + 5) * 0.3; return g[v < 0.38 ? 1 : v < 0.68 ? 2 : 3]; });
const rock = (g: number[]): P => (t, r, s) => {
  rockBase(g)(t, r, s);
  for (let i = 0; i < 4; i++) {   // chiselled shelves (lit lip, shadow under it) on four separate bands, anywhere across, long and short
    const x = (r() * 16) | 0, y = i * 4 + ((r() * 3) | 0), n = i & 1 ? 2 + ((r() * 2) | 0) : 4 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) { t.set(x + k, y, g[4]); t.set(x + k + 1, y + 1, g[0]); }
    t.set(x + n, y, g[0]);
  }
  for (let i = 0; i < 6; i++) { const x = (r() * 16) | 0, y = (r() * 16) | 0; t.set(x, y, g[1]); t.set(x, y - 1, g[3]); }
};
/** Rock with n pits: shadow under the upper rim, light caught on the lower one. */
const pitted = (g: number[], n: number, flecks = 0): P => (t, r, s) => {
  rockBase(g)(t, r, s);
  for (let i = 0; i < n; i++) { const x = (r() * 16) | 0, y = (r() * 16) | 0; t.set(x, y, g[0]); if (r() < 0.6) t.set(x + 1, y, g[0]); t.set(x, y + 1, g[4]); }
  for (let i = 0; i < flecks; i++) { const x = (r() * 16) | 0, y = (r() * 16) | 0; t.set(x, y, g[4]); t.set(x, y + 1, g[1]); }
};
/** Slate: broken horizontal strata. The bands are directional, so this tile must never be rotated. */
const slateBase = (g: number[]): P => (t, _r, s) => t.each((x, y) => {
  // four beds of uneven thickness (3, 5, 4, 4 px) that undulate together, each with a lit lip over a broken seam
  const yy = (y + Math.round(vn(x, 0, 4, s) * 2.6)) & 15, row = yy < 3 ? 0 : yy < 8 ? 1 : yy < 12 ? 2 : 3, iy = yy - (row === 0 ? 0 : row === 1 ? 3 : row === 2 ? 8 : 12);
  if (iy === (row === 0 ? 2 : row === 1 ? 4 : 3) && hash01((x + row * 5) >> 2, row, 3, s) < 0.72) return g[0];
  const dark = row === (hashInt(0, 0, 7, s) & 3) ? 1 : 0;   // one bed is a darker rock
  return g[(iy === 0 ? 3 : 2) - dark];
});
const slate = (g: number[]): P => (t, r, s) => { slateBase(g)(t, r, s); for (let i = 0; i < 5; i++) t.set((r() * 16) | 0, (r() * 16) | 0, g[4]); };
const soil = (g: number[], pebbles = 7, pits = 5): P => (t, r, s) => {
  t.each((x, y) => { const v = vn(x, y, 4, s) * 0.75 + vn(x, y, 8, s + 1) * 0.25; return g[v < 0.33 ? 1 : v < 0.6 ? 2 : 3]; });
  for (let i = 0; i < pebbles; i++) { const x = (r() * 16) | 0, y = (r() * 16) | 0; t.set(x, y, g[4]); t.set(x + 1, y + 1, g[0]); if (r() < 0.5) t.set(x + 1, y, g[3]); }
  for (let i = 0; i < pits; i++) t.set((r() * 16) | 0, (r() * 16) | 0, g[0]);
};
/** Fine drift: soft dunes, a few wind dashes (light over dark) and loose grains. */
const drift = (g: number[], dashes = 6, grains = 8, dark = g[0], bright = 0xfff8dc): P => (t, r, s) => {
  t.each((x, y) => { const v = vn(x, y, 3, s) * 0.7 + vn(x, y, 6, s + 2) * 0.3; return g[v < 0.34 ? 1 : v > 0.72 ? 3 : 2]; });
  for (let i = 0; i < dashes; i++) { const x = (r() * 16) | 0, y = (r() * 16) | 0, n = 2 + ((r() * 2) | 0); for (let k = 0; k < n; k++) { t.set(x + k, y, g[3]); t.set(x + k, y + 1, g[1]); } }
  for (let i = 0; i < grains; i++) t.set((r() * 16) | 0, (r() * 16) | 0, r() < 0.7 ? dark : bright);
};
/** Fitted stones: Worley cells seeded on a jittered g x g grid so no stone is a sliver. */
const cobble = (c: number, g = 3, jit = 2.2, mortar = -0.5, spread = 0.3, gap = 1.0, c2 = c): P => (t, r) => {
  const n = g * g, sx: number[] = [], sy: number[] = [], tone: number[] = [], col: number[] = [];
  for (let i = 0; i < n; i++) {
    sx.push(((i % g) + 0.5) * (16 / g) + (r() * 2 - 1) * jit); sy.push((((i / g) | 0) + 0.5) * (16 / g) + (r() * 2 - 1) * jit);
    tone.push(q((r() - 0.5) * 2 * spread, 5)); col.push(r() < 0.5 ? c : c2);
  }
  t.each((x, y) => {
    let d1 = 99, d2 = 99, bi = 0, bdx = 0, bdy = 0;
    for (let i = 0; i < n; i++) {
      const dx = wrapD(x + 0.5 - sx[i]), dy = wrapD(y + 0.5 - sy[i]), d = Math.sqrt(dx * dx + dy * dy);
      if (d < d1) { d2 = d1; d1 = d; bi = i; bdx = dx; bdy = dy; } else if (d < d2) d2 = d;
    }
    if (d2 - d1 < gap) return sh(c, mortar);
    return sh(col[bi], tone[bi] + (bdx + bdy < -1.5 ? 0.16 : bdx + bdy > 2 ? -0.16 : 0));
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
/** Boards of the given heights. Each has one tone, long grain streaks that wrap, a lit top edge, a
 *  shadowed seam and (on every `every`-th board) one butt joint with two nails. */
const planks = (c: number, hs: number[] = [5, 5, 6], every = 1, knot = false): P => (t, _r, s) => {
  let y0 = 0;
  hs.forEach((h, b) => {
    const tone = (hash01(b, 0, 1, s) - 0.5) * 0.16, jx = hashInt(b, 0, 5, s) & 15;
    for (let y = y0; y < y0 + h; y++) {
      const ph = hashInt(y, 0, 6, s) & 15;
      for (let x = 0; x < 16; x++) {
        const run = hash01(((x + ph) & 15) >> 3, y, 4, s);
        t.set(x, y, y === y0 + h - 1 ? sh(c, -0.5) : sh(c, tone + (run < 0.3 ? -0.14 : run > 0.8 ? 0.1 : 0) + (y === y0 ? 0.2 : 0)));
      }
    }
    if ((b + 1) % every === 0) {
      for (let y = y0; y < y0 + h - 1; y++) { t.set(jx, y, sh(c, -0.34)); t.set(jx + 1, y, sh(c, tone + 0.2)); }
      t.set(jx - 1, y0 + 1, sh(c, -0.4)); t.set(jx + 2, y0 + 1, sh(c, -0.4));
    }
    if (knot && b === 0) { const kx = jx + 6, ky = y0 + (h >> 1) - 1; for (let dx = -1; dx <= 2; dx++) { t.set(kx + dx, ky - 1, sh(c, dx < 0 || dx > 1 ? -0.14 : -0.3)); t.set(kx + dx, ky + 1, sh(c, dx < 0 || dx > 1 ? -0.14 : -0.3)); t.set(kx + dx, ky, sh(c, dx < 0 || dx > 1 ? -0.3 : -0.5)); } }
    y0 += h;
  });
};
/** Bark: vertical ridges, each lit on its left flank and shadowed towards the groove on its right. */
const logSide = (bark: number): P => (t, _r, s) => {
  const col = (x: number): number => hash01(x & 15, 0, 2, s);
  t.each((x, y) => {
    // grooves break every few rows (staggered per column) so they do not read as stripes
    if (col(x) < 0.3 && hash01(x, (y + (hashInt(x, 0, 12, s) & 3)) >> 2, 3, s) < 0.82) return sh(bark, -0.42);
    return sh(bark, (col(x) - 0.6) * 0.22 + (col(x - 1) < 0.3 ? 0.16 : 0) + (col(x + 1) < 0.3 ? -0.14 : 0) + (hash01(x >> 1, y >> 1, 13, s) < 0.07 ? -0.12 : 0));
  });
};
/** Log end: bark rim, cambium line, heartwood and a few broken growth rings that round off
 *  towards the middle instead of the old seven concentric squares. */
const logTop = (bark: number, wood: number, rings: number[]): P => (t, _r, s) => {
  t.each((x, y) => {
    const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5), dc = Math.max(dx, dy), de = Math.hypot(dx, dy);
    if (dc > 7) return sh(bark, dx > 7 && dy > 7 ? -0.3 : (hash01(x, y, 8, s) - 0.5) * 0.24);
    if (dc > 6) return sh(wood, -0.34);
    const ring = Math.floor(de + (dc - de) * Math.min(1, dc / 6.5));
    if (ring === 0) return sh(wood, -0.28);
    if (rings.includes(ring) && hash01(x, y, 9, s) >= 0.18) return sh(wood, -0.16);
    return x + y < 15 ? sh(wood, 0.08) : wood;
  });
  t.line(9, 8, 11, 9, sh(wood, -0.3));
};
/** Canopy: clumped gaps with a dark rim, then leaflets stamped lit from the top-left. */
const leaves = (g: number[], holes: number, dotC = 0): P => (t, r, s) => {
  const n = (x: number, y: number): number => vn(x, y, 5, s + 1) * 0.8 + vn(x, y, 8, s + 3) * 0.2, th = cutoff(n, holes);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = n(x, y); if (v < th) t.set(x, y, g[0], 0); else t.set(x, y, v < th + 0.14 ? g[0] : g[1]); }
  const st = (x: number, y: number, c: number): void => { if (t.getA(x, y)) t.set(x, y, c); };   // never paints over a gap
  for (let i = 0; i < 25; i++) {
    const x = Math.round((i % 5) * 3.2 + r() * 2), y = Math.round(((i / 5) | 0) * 3.2 + r() * 2), dot = r() < 0.26;
    if (!t.getA(x, y) || !t.getA(x + 1, y + 1)) continue;
    st(x, y, g[3]); st(x + 1, y, g[2]); st(x, y + 1, g[2]); st(x + 1, y + 1, g[1]); st(x + 2, y + 1, g[0]); st(x + 1, y + 2, g[0]);
    if (dotC && dot) { st(x, y, dotC); st(x + 1, y, mix(dotC, g[2], 0.5)); }
  }
};
/** Turf seen from above: soft clumps with short blades (bright tip, shadow beneath). Written with
 *  alpha `a`: 0 for biome-tinted grass, whose hue shift is baked into the grey ramp. */
const turfTop = (g: number[], a: number): P => (t, r, s) => {
  const nz = (x: number, y: number): number => vn(x & 15, y & 15, 4, s) * 0.7 + vn(x & 15, y & 15, 8, s + 1) * 0.3;
  const lvl = (x: number, y: number): number => (nz(x, y) < 0.36 ? 1 : 2), deep = mix(g[0], g[1], 0.5);
  t.each((x, y) => (nz(x, y) < 0.24 ? deep : g[lvl(x, y)]), a);   // the hollows of the darker clumps go one half-step deeper
  const dim = (x: number, y: number): void => t.set(x, y, g[lvl(x, y) - 1], a);   // a blade's shadow is one step below the turf under it
  for (let i = 0; i < 16; i++) {
    const x = (i & 3) * 4 + ((r() * 4) | 0), y = (i >> 2) * 4 + ((r() * 4) | 0), lean = r() < 0.5 ? -1 : 1, k = (r() * 3) | 0;
    if (i === 6 || i === 9) continue;
    t.set(x, y, g[3], a);
    if (k === 0) { t.set(x + lean, y + 1, g[3], a); dim(x, y + 1); dim(x + lean, y + 2); }   // leaning blade
    else if (k === 1) { t.set(x, y + 1, g[3], a); dim(x, y + 2); }                           // upright blade
    else dim(x, y + 1);                                                                      // short tip
  }
};
const turfSide = (base: P, g: number[], tinted: boolean): P => (t, r, s) => {
  base(t, r, s);
  for (let x = 0; x < 16; x++) {
    const d = 2 + Math.round(vn(x, 0, 4, s + 2) * 2.4) + (hash01(x, 0, 9, s) < 0.14 ? 2 : 0);
    for (let y = 0; y < d; y++) t.set(x, y, y === 0 ? g[3] : y === d - 1 ? g[1] : g[2], tinted ? 0 : 255);
    t.shade(x, d, -0.3);   // the fringe casts a shadow on the soil
  }
};
// Ore colours follow the tier body / trim colours in data/items.ts.
// [dx, dy, tone] with tone 2 = highlight, 1 = body, 0 = shade: each family of ores has its own silhouette
const BLOB = [[1, 0, 2], [2, 0, 1], [0, 1, 2], [1, 1, 1], [2, 1, 1], [3, 1, 0], [1, 2, 0], [2, 2, 0]];
const VEIN = [[0, 2, 1], [1, 1, 2], [2, 1, 1], [3, 0, 2], [4, 0, 1], [2, 2, 0], [3, 1, 0]];
const SHARD = [[1, 0, 2], [0, 1, 2], [1, 1, 1], [0, 2, 1], [1, 2, 0], [0, 3, 0]];
// three ways to seat the four clusters (they never touch, even jittered and wrapped), picked per ore so veins do not all share one grid
const SEATS = [[[2, 2], [10, 4], [4, 10], [11, 11]], [[1, 5], [8, 1], [11, 9], [4, 12]], [[3, 1], [12, 6], [3, 9], [8, 12]]];
const ore = (base: P, c: number, shape: number[][], glow = false, dark = sh(c, -0.35), hi = sh(c, 0.55)): P => (t, r, s) => {
  base(t, r, s);
  const a = glow ? 0 : 255, tones = [dark, c, hi];
  for (const [ax, ay] of SEATS[(s >>> 3) % 3]) {
    const x = ax + ((r() * 3) | 0) - 1, y = ay + ((r() * 3) | 0) - 1;
    // shadows first, then the ore, so a shadow can never darken its own cluster
    for (const [dx, dy] of shape) t.shade((x + dx + 1) & 15, (y + dy + 1) & 15, -0.4);
    for (const [dx, dy, k] of shape) t.set(x + dx, y + dy, tones[k], k ? a : 255);   // the shaded side of a glowing ore does not glow
  }
  for (let i = 0; i < 2; i++) t.set((r() * 16) | 0, (r() * 16) | 0, c, a);
};
/** Cut crystal: tall wrapped Voronoi facets, each one flat tone, with bright or dark ridges where
 *  facets meet. Alpha is the glow mask (0 = full glow), so lit facets bloom and shaded ones do not. */
const crystal = (c: number, hues = false): P => (t, r) => {
  const sx: number[] = [], sy: number[] = [], F = hues ? [0.35, 0.1, -0.08, -0.2] : [0.5, 0.15, -0.15, -0.4], A = [0, 90, 190, 235];
  for (let i = 0; i < 8; i++) { sx.push(((i & 3) + 0.5) * 4 + (i >> 2) * 2 + (r() - 0.5) * 3); sy.push(((i >> 2) + 0.5) * 8 + (r() - 0.5) * 6); }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let d1 = 99, d2 = 99, b1 = 0, b2 = 0;
    for (let i = 0; i < 8; i++) {
      const d = Math.abs(wrapD(x + 0.5 - sx[i])) + 0.6 * Math.abs(wrapD(y + 0.5 - sy[i]));
      if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = i; } else if (d < d2) { d2 = d; b2 = i; }
    }
    // levels run 0 2 1 3 / 3 1 0 2 so touching facets rarely share a tone
    const lv = (i: number): number => [0, 2, 1, 3, 3, 1, 0, 2][i], l1 = lv(b1), l2 = lv(b2), cc = hues ? fromHsl(0.5 + b1 * 0.055, 0.6, 0.8) : c;
    if (d2 - d1 < 0.9 && l1 !== l2) { if (l1 < l2) t.set(x, y, hues ? 0xffffff : sh(cc, 0.75), 0); else t.set(x, y, sh(cc, hues ? -0.3 : -0.5), 255); }
    else t.set(x, y, sh(cc, F[l1]), A[l1]);
  }
};
const metal = (c: number): P => (t, r) => {
  t.each((x, y) => {
    const e = x === 0 || y === 0 ? 0.3 : x === 15 || y === 15 ? -0.35 : 0;
    const seam = (x === 7 || y === 7) && !e ? -0.18 : 0;
    return sh(c, e + seam + (r() - 0.5) * 0.08 + ((x + y) % 7 === 0 ? 0.08 : 0));
  });
};
/** Moss cushions over `amt` of the tile: lit along their top edge, dark underneath, and casting a
 *  shadow on the masonry below so the base tile stays readable. */
const overlayMoss = (base: P, moss: number, amt = 0.3): P => (t, r, s) => {
  base(t, r, s);
  const n = (x: number, y: number): number => vn(x, y, 4, s + 9) * 0.75 + vn(x, y, 8, s + 4) * 0.25, th = cutoff(n, 1 - amt);
  const m = (x: number, y: number): boolean => n(x & 15, y & 15) >= th;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!m(x, y)) continue;
    const under = !m(x, y + 1);
    t.set(x, y, sh(moss, !m(x, y - 1) ? 0.3 : under ? -0.35 : (hash01(x, y, 1, s) - 0.5) * 0.2));
    if (under) t.shade(x, (y + 1) & 15, -0.2);
  }
};
const clear: P = (t) => t.d.fill(0);
const plantP = (draw: (t: Px, r: Rnd) => void): P => (t, r) => { clear(t, r, 0); draw(t, r); };

/** A clump of separate blades that fans outward from the middle and brightens towards the tips. A
 *  short back row is drawn first, one step darker, so the taller front blades stand off it. */
const tuft = (g: number[], n = 9): P => plantP((t, r) => {
  const nb = n >> 1;
  for (let i = 0; i < n; i++) {
    const back = i < nb, slot = back ? (i + 0.5) / nb : (i - nb + 0.5) / (n - nb);
    const x0 = Math.round(1.5 + slot * 13 + (r() - 0.5) * 1.6), off = (x0 - 7.5) / 7.5;
    const h = Math.round((back ? 7 : 12) - Math.abs(off) * (back ? 1.5 : 5) + r() * 2.5), bend = off * (2 + r() * 2.5) + (r() - 0.5) * 3.4;
    for (let k = 0; k < h; k++) {
      // roots start at the turf's own tone: plant quads are lit less than the ground, so a darker root reads as a black scribble
      const f = k / (h - 1), lv = k === h - 1 ? 3 : f < 0.35 ? 1 : 2;
      const x = Math.round(x0 + bend * f * f);
      if (!back && f < 0.4 && !t.getA(x + 1, 15 - k)) t.put(x + 1, 15 - k, g[lv - 1]);   // front blades are two wide near the root, shaded on the right
      t.put(x, 15 - k, g[back ? Math.max(0, lv - 1) : lv]);
    }
  }
});
/** Four flower species with different heads: 0 cup, 1 disc, 2 hanging bells, 3 low star. */
const flower = (kind: number, petal: number, center: number): P => plantP((t, r) => {
  const g = 0x4a9a3c, x = 7 + ((r() * 2) | 0), lt = sh(petal, 0.3), dk = sh(petal, kind === 3 ? -0.12 : -0.25);
  for (let y = kind === 3 ? 8 : 7; y < 16; y++) t.put(x, y, sh(g, (y - 12) * -0.05));
  t.put(x - 1, 12, sh(g, 0.2)); t.put(x - 2, 11, g); t.put(x + 1, 13, sh(g, 0.2)); t.put(x + 2, 12, g);
  const row = (y: number, x0: number, x1: number, c: number): void => { for (let i = x0; i <= x1; i++) t.put(x + i, y, i < 0 && c === petal ? lt : i > 0 && c === petal ? dk : c); };
  if (kind === 0) {
    row(3, -2, -2, lt); row(3, 0, 0, lt); row(3, 2, 2, petal); row(4, -2, 2, petal); row(5, -2, 2, petal); row(6, -1, 1, dk);
    t.put(x - 2, 4, lt); t.put(x, 4, center); t.put(x - 1, 5, petal); t.put(x, 5, petal);
  } else if (kind === 1) {
    row(2, -1, 1, lt); row(3, -2, 2, petal); row(4, -2, 2, petal); row(5, -2, 2, petal); row(6, -1, 1, dk);
    t.rect(x - 1, 3, x + 1, 5, center); t.put(x - 1, 3, sh(center, 0.3)); t.put(x + 1, 5, sh(center, -0.25));
  } else if (kind === 2) {
    t.put(x + 1, 6, g); t.put(x + 2, 5, g); t.put(x + 3, 6, g); t.put(x - 1, 8, g);
    for (const [bx, by] of [[3, 7], [1, 8], [-2, 9]]) { t.put(x + bx, by, lt); t.put(x + bx + 1, by, petal); t.put(x + bx, by + 1, center); t.put(x + bx + 1, by + 1, dk); }
  } else {
    row(5, -3, -2, lt); row(5, 2, 3, petal); row(6, -3, 3, petal); row(7, -2, 2, dk);
    t.put(x, 5, lt); t.put(x, 6, center); t.put(x - 1, 6, lt);
  }
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
type Mouth = (t: Px, hot: number, cool: number) => void;
const inDisc = (t: Px, cx: number, cy: number, rad: number, fn: (x: number, y: number, d: number) => void): void => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= rad) fn(x, y, d); }
};
// each forge tier has its own firebox: wide arch, round porthole, open basin, crescent
const MOUTH: Mouth[] = [
  (t, hot, cool) => { t.rect(3, 6, 12, 13, 0x15121a); t.rect(4, 5, 11, 5, 0x15121a); glowRect(t, 4, 8, 11, 12, hot, cool); for (let x = 4; x <= 11; x += 2) t.put(x, 13, 0x2a2630); },
  (t, hot, cool) => {
    inDisc(t, 7.5, 8.5, 5.2, (x, y, d) => t.put(x, y, d > 4.2 ? (x + y < 16 ? 0x5a5470 : 0x2a2438) : 0x120e1a));
    inDisc(t, 7.5, 8.5, 2.6, (x, y, d) => t.put(x, y, mix(hot, cool, d / 2.6), 0));
  },
  (t, hot, cool) => {
    for (let y = 6; y <= 12; y++) { const i = Math.max(0, y - 9); t.rect(3 + i, y, 12 - i, y, y < 8 ? 0x15121a : y === 12 ? 0x3a3650 : 0x55507a); t.put(3 + i, y, 0x8a84b0); t.put(12 - i, y, 0x2a2640); }
    t.rect(4, 6, 11, 6, hot, 0); t.rect(4, 7, 11, 7, cool, 0); t.put(5, 6, 0xffffff, 0); t.put(9, 7, 0xffffff, 0); t.put(10, 6, 0xffffff, 0);
    t.rect(2, 5, 13, 5, 0x8a84b0); t.rect(6, 13, 9, 13, 0x2a2640);
  },
  (t, hot, cool) => {
    inDisc(t, 7.5, 8.5, 5.2, (x, y) => t.put(x, y, 0x0e0a16));
    inDisc(t, 7.5, 8.5, 4.2, (x, y, d) => t.put(x, y, mix(cool, hot, Math.max(0, (7.5 - x) / 4.2) * (1 - d / 9)), 0));
    inDisc(t, 9, 8.5, 3.5, (x, y) => t.put(x, y, 0x0e0a16));
  },
];
const forgeFront = (base: P, hot: number, cool: number, kind = 0): P => station(base, (t) => {
  MOUTH[kind](t, hot, cool);
  t.rect(2, 2, 13, 2, 0x2a2630); t.rect(2, 3, 13, 3, 0x4a4652);
});
const forgeSide = (base: P, hot: number, kind = 0): P => station(base, (t) => {
  if (kind === 0) for (const x of [3, 7, 11]) { t.rect(x, 9, x + 1, 12, 0x15121a); t.put(x, 11, hot, 0); t.put(x + 1, 12, hot, 0); }
  else if (kind === 1) { inDisc(t, 7.5, 9.5, 2.9, (x, y, d) => t.put(x, y, d > 1.9 ? (x + y < 17 ? 0x5a5470 : 0x2a2438) : 0x120e1a)); t.put(7, 9, hot, 0); t.put(8, 10, hot, 0); }
  else if (kind === 2) { t.rect(2, 6, 13, 7, 0x6a648a); t.rect(2, 6, 13, 6, 0xc8c2e6); for (const x of [4, 9, 12]) { t.put(x, 8, hot, 0); t.put(x, 9, hot, 0); if (x === 9) t.put(x, 10, hot, 0); } }
  else { inDisc(t, 7.5, 9.5, 3.2, (x, y) => t.put(x, y, hot, 0)); inDisc(t, 8.8, 9.5, 2.8, (x, y) => t.put(x, y, 0x0e0a16)); }
  t.rect(0, 2, 15, 2, 0x2a2630);
});
const forgeTop = (base: P, hot: number): P => station(base, (t) => {
  frame(t, 0x2a2630); t.rect(5, 5, 10, 10, 0x15121a);
  for (let y = 6; y <= 9; y++) for (let x = 6; x <= 9; x++) t.put(x, y, sh(hot, (x + y) % 2 ? 0.2 : -0.1), 0);
});
/** The stone furnace face. Lit and unlit share one seed and one layout, so lighting a furnace only
 *  changes what is inside the mouth. */
const furnaceFace = (lit: boolean): P => (t) => {
  const s = strSeed('furnace_front');
  cobble(0x7a7c84)(t, mulberry32(s), s);
  t.rect(0, 0, 15, 1, 0x5a5c64); t.rect(4, 3, 11, 3, 0x4a4852); t.rect(4, 4, 11, 4, 0x2a2830);
  t.rect(3, 6, 12, 13, 0x18161c); t.rect(4, 5, 11, 5, 0x18161c);
  if (lit) glowRect(t, 4, 8, 11, 12, 0xffe06a, 0xff6a1c);
  else { t.rect(4, 11, 11, 12, 0x2a2026); t.put(5, 11, 0x4a2a22); t.put(8, 12, 0x4a2a22); t.put(10, 11, 0x4a2a22); }
  for (let x = 5; x <= 11; x += 2) t.rect(x, 10, x, 13, 0x3a3840);
  t.rect(3, 13, 12, 13, 0x2a2830);
};
// Original 5x7 marks, row-major: one per altar (root, maw, ward, spore, gale, prism, eclipse, cairn),
// then the two gate frames (descend, ascend) and the runeloom (weave).
const GLYPHS = ['00100000000010000100011101010110001', '10001110111010100000101011101110001', '11111100011010110101100010010000100', '01110111111010100100001000101010001',
  '00110000011111000000111000001000100', '00100010101000110101100010101000100', '01100100101011110101111010100100110', '00100011100000001110111110000011111',
  '10001010100010010001010100010000000', '00000001000101010001001000101010001', '10101010101010101010101010101010101'];
/** Glowing glyph k with a one-pixel drop shadow so it looks carved rather than printed. */
const rune = (t: Px, c: number, k: number, shadow: number, ox = 5, oy = 5): void => {
  const g = GLYPHS[k % GLYPHS.length];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y * 5 + x] === '1') t.put(ox + x + 1, oy + y + 1, shadow);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y * 5 + x] === '1') t.put(ox + x, oy + y, c, 0);
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
  for (let i = 0; i < 3 + stage * 2; i++) {
    // one generator per stroke: a stroke is the same at every stage and only gets longer
    const rr = mulberry32(991 + i * 7919);
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
const stoneP = rock(ST), deepP = slate(DS), dirtP = soil(DT), stoneBed = rockBase(ST), deepBed = slateBase(DS);
const GLOOM_G = ramp5(C.gloom), RIFT_G = ramp5(C.rift, 0.7), gloomBed = rockBase(GLOOM_G), riftBed = rockBase(RIFT_G);
const gloomP = pitted(GLOOM_G, 5, 3), riftP = pitted(RIFT_G, 0, 7), wardP = bricks(C.ward, 0x343a48, 8, 8, 0.2);
const scoriaP = pitted(ramp5(0x4a3438, 1.1), 11), nightP = mineral(0x1e1830, 0.35, 3);
const brickDark = bricks(0x4a4450, 0x24202a, 8, 4, 0.14);
const SNOW_G = [0xc4d2e8, 0xdde7f4, 0xf2f6fb, 0xffffff], MYCEL_G = [0x2e2748, 0x3c3358, 0x4a3f6a, 0x6c5c98], SKY_G = [0x48ac9c, 0x60c8b2, 0x78dcc4, 0xc8f6dc];
const LEAF_G = [0xa0b6b2, 0xcad8c8, 0xe6ecda, 0xfffbd8];   // grey ramp for foliage-tinted leaves, hue shift baked in
const skysoilP = soil(ramp5(0x8f9ab8, 0.7), 5, 4);

const altarSide = (k: number, c: number): P => station(wardP, (t) => { rune(t, c, k, 0x2a2f3c); t.rect(0, 0, 15, 1, 0x343a48); for (let x = 1; x < 16; x += 3) t.put(x, 1, c, 0); });
const altarTop = (k: number, c: number): P => station(wardP, (t) => {
  for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; t.put(Math.round(7.5 + Math.cos(a) * 6), Math.round(7.5 + Math.sin(a) * 6), c, 0); }
  t.rect(4, 3, 11, 12, 0x343a48); rune(t, c, k, 0x20242e, 5, 4);
});

export const PAINTERS: Record<string, P> = {
  bedrock: mineral(0x3a3a42, 0.5, 6), stone: stoneP, cobble: cobble(0x84888f), deepstone: deepP, dirt: dirtP,
  grass_top: turfTop(GR, 0), grass_side: turfSide(dirtP, GR, true),
  sand: drift(SD), sandstone: (t, r, s) => { drift([0xc9b47c, 0xd3be84, 0xdcc88c, 0xe5d298], 0, 5, 0xc9b47c, 0xe5d298)(t, r, s); for (const y of [0, 5, 6, 11, 15]) for (let x = 0; x < 16; x++) t.shade(x, y, y === 5 || y === 11 ? -0.2 : 0.14); },
  sandstone_top: drift([0xc9b47c, 0xd6c287, 0xdfcb90, 0xe8d69f], 0, 5, 0xc9b47c, 0xeedcaa), gravel: cobble(0x9a8f80, 4, 1.7, -0.3, 0.24, 0.7, 0x7c8088), clay: mineral(0x9aa3b4, 0.14, 3),
  snow: drift([0xd3deee, 0xe4ecf7, 0xf2f6fb, 0xffffff], 5, 7, 0xe4ecf7, 0xffffff), ice: (t, r) => t.each((x, y) => { const k = (x + y * 2) & 15; return sh(0xa9d4f5, (k < 2 ? 0.5 : k === 9 ? 0.25 : 0) + (r() - 0.5) * 0.06); }, 205),
  mud: soil(ramp5(0x574536, 0.9), 3, 7), snowy_side: turfSide(dirtP, SNOW_G, false), scoria: scoriaP,
  nightglass: station(nightP, (t, r) => { for (let i = 0; i < 3; i++) { const x = (r() * 13) | 0, y = (r() * 13) | 0; t.set(x, y, 0x6a5aa0); t.set(x + 1, y + 1, 0x4a3f78); if (i === 0) { t.set(x + 2, y + 2, 0x4a3f78); t.set(x, y, 0xb0a0e0); } } }),
  water: (t, r) => {
    // caustic web: bright where two Worley cells meet, darker in the cell middles
    const sx: number[] = [], sy: number[] = [];
    for (let i = 0; i < 7; i++) { sx.push(r() * 16); sy.push(r() * 16); }
    t.each((x, y) => {
      const w = (vn(x, y, 4, 77) - 0.5) * 3;
      let d1 = 99, d2 = 99;
      for (let i = 0; i < 7; i++) { const d = Math.hypot(wrapD(x + w - sx[i]), wrapD(y + w - sy[i])); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return d2 - d1 < 0.7 ? 0xffffff : d2 - d1 < 1.6 ? 0xe2ebf8 : d1 < 1.8 ? 0xc2d0ea : 0xd2ddf1;
    });
  },
  lava: (t, r, s) => t.each((x, y) => mix(0xc8340c, 0xffd84a, q(Math.min(1, vn(x, y, 4, s) * 0.8 + vn(x, y, 8, s + 1) * 0.35), 4)), 0),

  oak_log: logSide(C.oakBark), oak_log_top: logTop(C.oakBark, 0xc19a5b, [2, 4]), oak_leaves: leaves(LEAF_G, 0.12), oak_planks: planks(0xb88a4e, [5, 5, 6], 2),
  pine_log: logSide(C.pineBark), pine_log_top: logTop(C.pineBark, 0xa87a48, [1, 3, 5]), pine_leaves: leaves([0x1f4e3e, 0x2f6a4c, 0x418456, 0x60a062], 0.08), pine_planks: planks(0x8a6238, [8, 8], 2, true),
  pale_log: station(logSide(C.paleBark), (t, r) => { for (let i = 0; i < 6; i++) { const x = (r() * 14) | 0, y = (r() * 16) | 0; t.rect(x, y, x + 2, y, 0x3a3630); } }),
  pale_log_top: logTop(C.paleBark, 0xe6d6a8, [3]), pale_leaves: leaves([0x6ea850, 0x90ca5c, 0xacde68, 0xdef292], 0.14), pale_planks: planks(0xdcc890, [4, 4, 4, 4], 2),
  kapok_log: logSide(C.kapokBark), kapok_log_top: logTop(C.kapokBark, 0xc48a52, [2, 4]), kapok_leaves: leaves(LEAF_G, 0.07), kapok_planks: planks(0xa8663a),
  rose_log: logSide(C.roseBark), rose_log_top: logTop(C.roseBark, 0xd89aa0, [2, 5]), rose_leaves: leaves([0xc46e9a, 0xe48ab4, 0xf2a2c6, 0xfbbad4], 0.12, 0xfff0f6), rose_planks: planks(0xc97a86),

  tall_grass: tuft(GR), fern: plantP((t) => {
    // arching fronds from one crown, outer pair first: [tip dx, tip y, rise of the arch above the tip]
    for (const [ex, ey, up] of [[-7, 11, 6], [7, 10, 6], [-3, 3, 1], [3, 4, 1]]) for (let i = 0; i <= 16; i++) {
      const f = i / 16, a = (1 - f) * (1 - f), b = 2 * f * (1 - f), c = f * f, cx = 7.5 + ex * 0.5, cy = ey - up;
      const x = a * 7.5 + b * cx + c * (7.5 + ex), y = a * 15 + b * cy + c * ey;
      const tx = (cx - 7.5) * (1 - f) + (7.5 + ex - cx) * f, ty = (cy - 15) * (1 - f) + (ey - cy) * f, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      t.put(Math.round(x), Math.round(y), GR[f < 0.25 ? 0 : 1]);
      if (i < 6 || i & 1) continue;
      // a leaflet either side of the stem; the upper one catches the light
      for (const sd of [-1, 1]) { const px = Math.round(x + nx * 1.2 * sd), py = Math.round(y + ny * 1.2 * sd); t.put(px, py, GR[py < y - 0.5 || i === 16 ? 3 : 2]); }
    }
  }),
  flower_red: flower(0, 0xe2452f, 0xffd24a), flower_yellow: flower(1, 0xf7c832, 0xb86a1c), flower_blue: flower(2, 0x4f86ea, 0xf2f2ff), flower_white: flower(3, 0xf4f1fa, 0xf0c040),
  dead_bush: plantP((t, r) => { const c = 0x8a6a42; t.line(8, 15, 8, 9, c); t.line(8, 11, 4, 6, c); t.line(8, 10, 12, 5, sh(c, -0.2)); t.line(5, 8, 3, 9, c); t.line(11, 7, 13, 8, sh(c, 0.2)); t.line(8, 9, 7, 4, sh(c, 0.15)); void r; }),
  reeds: plantP((t, r) => { for (const x of [3, 7, 8, 12]) { const h = 12 + ((r() * 4) | 0); for (let k = 0; k < h; k++) t.put(x, 15 - k, sh(0x6fae4a, k % 4 === 3 ? -0.35 : (x & 1) * 0.15)); t.put(x, 15 - h, 0x8a5f3c); } }),
  mushroom_brown: shroom(0x9a6a44, 0xe6dcc6, 0), mushroom_red: shroom(0xd23a32, 0xeee6d6, 0xfff6ea),
  cactus: (t, r) => t.each((x, y) => ((x % 4 === 1 && y % 5 === 2) ? 0xf2f0d0 : sh(0x4f9a44, (x % 4 === 0 ? -0.3 : x % 4 === 2 ? 0.16 : 0) + (r() - 0.5) * 0.1))),
  // ribs run in to a pale crown, with a spine cluster on every other rib
  cactus_top: (t) => {
    t.each((x, y) => {
      const dx = x - 7.5, dy = y - 7.5, d = Math.max(Math.abs(dx), Math.abs(dy)), rib = Math.cos(Math.atan2(dy, dx) * 8);
      return sh(0x4f9a44, d > 7 ? -0.35 : Math.hypot(dx, dy) < 2 ? 0.3 : (rib > 0.45 ? 0.16 : rib < -0.45 ? -0.24 : 0) + (d > 6 ? 0.1 : 0));
    });
    for (const [x, y] of [[7, 7], [4, 4], [11, 4], [4, 11], [11, 11]]) t.set(x, y, 0xf2f0d0);
  },
  berry_bush: bush(0x3f8a3a, 0xd8344a), berry_bush_empty: bush(0x3f8a3a, 0),
  glowshroom: shroom(0x3fe6c8, 0xbff7ea, 0xeafff8, true),

  coal_ore: ore(stoneBed, 0x25252c, BLOB), iron_ore: ore(stoneBed, 0xc98a5e, VEIN, false, 0x7a4630), gold_ore: ore(stoneBed, 0xf6cf3c, BLOB),
  mana_ore: ore(stoneBed, 0x4f86f6, SHARD, true), lumenite_ore: ore(deepBed, 0x4fe6e0, SHARD, true), cindrite_ore: ore(deepBed, 0xff7a2a, VEIN, true), eclipsium_ore: ore(deepBed, 0x8a4ae0, SHARD, true, 0x5a2aa8, 0xffb45a),

  stone_bricks: bricks(0x8a8e96, 0x55585f, 8, 8, 0.18), mossy_bricks: overlayMoss(bricks(0x8a8e96, 0x55585f, 8, 8, 0.18), 0x5a8a42, 0.3),
  sandstone_bricks: bricks(0xdcc88c, 0xb09a62, 8, 8, 0.16), bricks: bricks(0xa8523c, 0xcfc6b4, 8, 4, 0.1),
  glass: (t) => { clear(t, Math.random, 0); frame(t, 0xd8eef2); t.put(3, 3, 0xffffff); t.put(4, 2, 0xffffff); t.put(2, 4, 0xffffff); t.put(11, 12, 0xeaf6f8); t.put(12, 11, 0xeaf6f8); },
  wardstone: wardP,

  torch: plantP((t) => { for (let y = 9; y < 16; y++) { t.put(7, y, 0x8a5f34); t.put(8, y, 0x5f3f22); } t.rect(7, 6, 8, 8, 0xffb52a); t.put(7, 6, 0xfff0a0); t.put(8, 6, 0xffd64a); t.put(7, 7, 0xffe06a); }),
  lantern: plantP((t) => { t.rect(5, 7, 10, 15, 0x2e2a30); t.rect(6, 9, 9, 13, 0xffd66a); t.rect(7, 10, 8, 12, 0xfff4c0); t.rect(6, 7, 9, 7, 0x4a4650); t.rect(5, 15, 10, 15, 0x1e1a20); }),
  // the lantern box top samples texels 5..10, which the side tile leaves empty above its lid
  lantern_top: plantP((t) => { t.rect(5, 5, 10, 10, 0x2e2a30); t.rect(6, 6, 9, 9, 0x4a4650); t.rect(7, 7, 8, 8, 0x6a6670); }),
  workbench_top: station(planks(C.wood), (t) => { frame(t, 0x5a3f22); t.line(1, 5, 14, 5, 0x7a5a30); t.line(1, 10, 14, 10, 0x7a5a30); t.line(5, 1, 5, 14, 0x7a5a30); t.line(10, 1, 10, 14, 0x7a5a30); }),
  workbench_side: station(planks(C.wood), (t) => { t.rect(0, 0, 15, 2, 0x6a4a28); t.rect(0, 3, 15, 3, 0x4a321a); t.line(3, 6, 3, 12, 0x8a8a92); t.rect(2, 5, 5, 6, 0x6a6a72); t.line(9, 6, 12, 12, 0xb0b0b8); t.line(10, 6, 13, 12, 0x6a6a72); t.rect(0, 13, 1, 15, 0x4a321a); t.rect(14, 13, 15, 15, 0x4a321a); }),
  furnace_top: station(cobble(0x7a7c84), (t) => frame(t, 0x4a4c54)), furnace_side: station(cobble(0x7a7c84), (t) => { t.rect(0, 0, 15, 1, 0x5a5c64); t.rect(0, 14, 15, 15, 0x4a4c54); }),
  furnace_front: furnaceFace(false), furnace_front_lit: furnaceFace(true),
  chest_top: station(planks(0xa9762f), (t) => { frame(t, 0x4a3018); t.rect(1, 7, 14, 8, 0x6a4a22); }),
  chest_side: station(planks(0xa9762f), (t) => { frame(t, 0x4a3018); t.rect(1, 5, 14, 5, 0x3a2410); }),
  chest_front: station(planks(0xa9762f), (t) => { frame(t, 0x4a3018); t.rect(1, 5, 14, 5, 0x3a2410); t.rect(7, 4, 8, 7, 0xd8d8e0); t.put(7, 4, 0xffffff); t.put(8, 7, 0x8a8a92); }),
  // the block is a full cube, so the space around the anvil's waist is painted as deep shadow
  anvil_top: metal(0x4a4c58), anvil_side: station(metal(0x3e404a), (t) => { t.rect(0, 0, 15, 3, 0x5a5c68); t.rect(0, 0, 15, 0, 0x7a7c88); t.rect(0, 4, 15, 4, 0x24262e); t.rect(0, 5, 15, 10, 0x15151b); t.rect(4, 5, 11, 10, 0x30323a); t.rect(4, 5, 5, 10, 0x44464f); t.rect(11, 5, 11, 10, 0x24262e); t.rect(1, 11, 14, 15, 0x4a4c58); t.rect(1, 11, 14, 11, 0x62646f); t.rect(0, 11, 0, 15, 0x15151b); t.rect(15, 11, 15, 15, 0x15151b); }),
  emberforge_top: forgeTop(brickDark, 0xff8a2a), emberforge_side: forgeSide(brickDark, 0xff8a2a), emberforge_front: forgeFront(brickDark, 0xffe06a, 0xff4a12),
  voidkiln_top: forgeTop(bricks(0x3a3450, 0x1c1828), 0xb06af6), voidkiln_side: forgeSide(bricks(0x3a3450, 0x1c1828), 0xb06af6, 1), voidkiln_front: forgeFront(bricks(0x3a3450, 0x1c1828), 0xe0b0ff, 0x7a2ad6, 1),
  crucible_top: forgeTop(bricks(0xa8a0c8, 0x6a648a), 0xf4f0ff), crucible_side: forgeSide(bricks(0xa8a0c8, 0x6a648a), 0xf4f0ff, 2), crucible_front: forgeFront(bricks(0xa8a0c8, 0x6a648a), 0xffffff, 0x9ad0ff, 2),
  eclforge_top: forgeTop(nightP, 0xe06af6), eclforge_side: forgeSide(nightP, 0xe06af6, 3), eclforge_front: forgeFront(nightP, 0xffd0ff, 0xb02ad6, 3),
  tinker_top: station(planks(0x9a7448), (t) => { frame(t, 0x4a3420); for (const [cx, cy, rr] of [[5, 5, 3], [11, 10, 2.4]] as const) for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; t.put(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), i % 2 ? 0xd8b04a : 0x8a6a22); } t.put(5, 5, 0x3a2a12); t.put(11, 10, 0x3a2a12); }),
  tinker_side: station(planks(0x9a7448), (t) => { t.rect(0, 0, 15, 2, 0x6a4a28); for (const y of [5, 10]) { t.rect(2, y, 13, y + 3, 0x7a5834); t.rect(2, y + 3, 13, y + 3, 0x4a3420); t.rect(7, y + 1, 8, y + 1, 0xd8b04a); } }),
  runeloom_top: station((t, r) => t.each((x, y) => sh(0x5a3f8a, ((x + y) % 2 ? 0.1 : -0.1) + (r() - 0.5) * 0.08)), (t) => { frame(t, 0x4a3420); t.rect(4, 4, 11, 12, 0x3a2860); rune(t, 0xc8a0ff, 10, 0x241840); }),
  runeloom_side: station(planks(0x7a5a8a), (t) => { t.rect(0, 0, 15, 2, 0x4a3420); for (let x = 2; x < 15; x += 3) t.line(x, 3, x, 13, 0xc8a0ff, x % 2 ? 0 : 255); t.rect(0, 14, 15, 15, 0x4a3420); }),
  bedroll_top: (t, r) => t.each((x, y) => sh(y % 5 < 2 ? 0x8a9a5a : 0xb8a878, (r() - 0.5) * 0.14 + (x < 2 || x > 13 ? -0.2 : 0))),
  bedroll_side: (t, r) => t.each((_x, y) => sh(0x9a9a62, (y > 12 ? -0.3 : 0) + (r() - 0.5) * 0.12)),
  guestbed_top: (t, r) => t.each((x, y) => (y < 5 ? sh(0xf2efe6, (r() - 0.5) * 0.08 + (x < 2 || x > 13 ? -0.15 : 0)) : sh(0xc2463c, (y === 5 ? 0.25 : 0) + (r() - 0.5) * 0.12 + (x < 1 || x > 14 ? -0.25 : 0)))),
  guestbed_side: station(planks(C.wood), (t) => { t.rect(0, 7, 15, 11, 0xc2463c); t.rect(0, 7, 15, 7, 0xe06a5c); }),
  door: station(planks(0xa77a44), (t) => { frame(t, 0x5a3f22); t.rect(4, 3, 11, 9, 0, 0); t.line(7, 3, 7, 9, 0x5a3f22); t.line(8, 3, 8, 9, 0x5a3f22); t.line(4, 6, 11, 6, 0x5a3f22); }),
  door_lower: station(planks(0xa77a44), (t) => { frame(t, 0x5a3f22); t.rect(3, 3, 12, 12, 0x94683a); t.rect(11, 1, 12, 2, 0xd8d8e0); }),

  crystal_cyan: crystal(0x3fd6f2), crystal_violet: crystal(0xb060f6), crystal_amber: crystal(0xf6b030),
  iron_block: metal(0xd4d6dc), gold_block: metal(0xf4cb3a), lumenite_block: station(metal(0x4fd6d6), (t) => { for (let i = 2; i < 14; i += 4) for (let j = 2; j < 14; j += 4) t.rect(i, j, i + 1, j + 1, 0xc0fff8, 0); }),

  gloomstone: gloomP, mycel_top: (t, r, s) => { turfTop(MYCEL_G, 255)(t, r, s); for (let i = 0; i < 9; i++) t.set((r() * 16) | 0, (r() * 16) | 0, 0x8af0d8); },
  mycel_side: turfSide(gloomP, MYCEL_G, false),
  gloom_stem: logSide(0xa8b4c8), gloom_stem_top: logTop(0xa8b4c8, 0xd0d8e6, [2, 5]),
  gloomcap_teal: (t, r, s) => { mineral(0x2f8a86, 0.3, 4)(t, r, s); for (let i = 0; i < 6; i++) { const x = (r() * 15) | 0, y = (r() * 15) | 0; t.rect(x, y, x + 1, y + 1, 0x8af6e0, 0); } },
  gloomcap_violet: (t, r, s) => { mineral(0x6a3f9a, 0.3, 4)(t, r, s); for (let i = 0; i < 6; i++) { const x = (r() * 15) | 0, y = (r() * 15) | 0; t.rect(x, y, x + 1, y + 1, 0xd8a0ff, 0); } },
  gloom_planks: planks(0x4f7a82), umbrite_ore: ore(gloomBed, 0x9a5af0, BLOB, true, sh(0x9a5af0, -0.35), 0xd8a0ff), noctrium_ore: ore(gloomBed, 0x1f9e8a, SHARD, true, 0x14705f, 0xb6ff8a),
  lumen_frond: tuft([0x1f9a6a, 0x3fd088, 0x6af6a8, 0xd0ffe0], 8), sporelamp: (t, r, s) => t.each((x, y) => mix(0xb8641c, 0xffe07a, q(vn(x, y, 3, s) * 0.8 + r() * 0.2, 3)), 0),

  riftstone: riftP, skyturf_top: turfTop(SKY_G, 255), skyturf_side: turfSide(skysoilP, SKY_G, false), skysoil: skysoilP,
  star_log: logSide(0xe0e6f6), star_log_top: logTop(0xe0e6f6, 0xb8c6ee, [3]), star_leaves: leaves([0x566acc, 0x6e88e8, 0x8ca6f6, 0xc4d4ff], 0.12, 0xf4f8ff), star_planks: planks(0xc6d0f2, [4, 4, 4, 4], 2),
  aetherium_ore: ore(riftBed, 0x4fb6f6, VEIN, true), prismite_ore: ore(riftBed, 0xf6a0f0, SHARD, true),
  cloud: (t, _r, s) => t.each((x, y) => { const v = vn(x, y, 2, s) * 0.75 + vn(x, y, 4, s + 1) * 0.25; return v < 0.4 ? 0xe4eaf5 : v < 0.47 ? 0xecf0f8 : v > 0.72 ? 0xffffff : 0xf4f6fc; }),
  prism_crystal: crystal(0xe8e8ff, true),

  hollow_frame: station(nightP, (t) => { frame(t, 0x120e1e); rune(t, 0xb070ff, 8, 0x0c0816); }), hollow_portal: swirl(0x8a4af0, 175),
  rift_frame: station(mineral(0x6a6078, 0.3, 4), (t) => { frame(t, 0x3a3048); rune(t, 0xffd86a, 9, 0x3a3048); }), rift_portal: swirl(0xf6c64a, 175),

  moss_stone: overlayMoss(cobble(0x84888f), 0x5a8a42, 0.35), bone_block: (t, r, s) => { mineral(0xe6dfcc, 0.16, 5)(t, r, s); for (let i = 0; i < 7; i++) t.set((r() * 16) | 0, (r() * 16) | 0, 0xa89f8a); },
  gilded_bricks: station(bricks(0xdcc88c, 0xb09a62, 8, 8, 0.16), (t) => { t.rect(0, 0, 15, 0, 0xf6cf3c); t.rect(0, 8, 15, 8, 0xd8a82a); }),
  // straw strands, each cut at its own height (periods of 8 so the tile wraps)
  thatch: (t, _r, s) => t.each((x, y) => { const yy = (y + (hashInt(x, 0, 3, s) & 7)) & 15; return sh(0xd2b25a, (yy & 7) === 7 ? -0.34 : (hash01(x, yy >> 3, 1, s) - 0.5) * 0.3 + ((yy & 7) === 0 ? 0.16 : 0)); }),
  path_top: station(mineral(0xa07a50, 0.22, 6), (t, r) => { for (let i = 0; i < 6; i++) t.set((r() * 16) | 0, (r() * 16) | 0, 0xb8b0a0); }),
  brood_nest: (t, r, s) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const web = ((x + y) & 7) === 0 || ((x - y) & 7) === 3 || vn(x, y, 4, s) > 0.62; t.set(x, y, sh(0x5a2630, (r() - 0.5) * 0.4), web ? 255 : 0); } t.rect(6, 6, 9, 9, 0xff6a5a); t.put(7, 7, 0xffd0c0); },
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
