// Seeded PRNG, integer hashes and simplex noise. Pure and allocation-free in the hot paths.

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashInt(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519) ^ Math.imul(seed | 0, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}
export const hash01 = (x: number, y: number, z: number, seed: number): number => hashInt(x, y, z, seed) / 4294967296;

export function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6, F3 = 1 / 3, G3 = 1 / 6;
const GR = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);

export class Simplex {
  private perm = new Uint8Array(512);
  private pm12 = new Uint8Array(512);
  constructor(seed: number) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    const r = mulberry32(seed);
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) { this.perm[i] = p[i & 255]; this.pm12[i] = this.perm[i] % 12; }
  }
  n2(xin: number, yin: number): number {
    const perm = this.perm, pm = this.pm12;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = pm[ii + perm[jj]] * 3; t0 *= t0; n += t0 * t0 * (GR[g] * x0 + GR[g + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = pm[ii + i1 + perm[jj + j1]] * 3; t1 *= t1; n += t1 * t1 * (GR[g] * x1 + GR[g + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = pm[ii + 1 + perm[jj + 1]] * 3; t2 *= t2; n += t2 * t2 * (GR[g] * x2 + GR[g + 1] * y2); }
    return 70 * n;
  }
  n3(xin: number, yin: number, zin: number): number {
    const perm = this.perm, pm = this.pm12;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { const g = pm[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n += t0 * t0 * (GR[g] * x0 + GR[g + 1] * y0 + GR[g + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { const g = pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n += t1 * t1 * (GR[g] * x1 + GR[g + 1] * y1 + GR[g + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { const g = pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n += t2 * t2 * (GR[g] * x2 + GR[g + 1] * y2 + GR[g + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { const g = pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n += t3 * t3 * (GR[g] * x3 + GR[g + 1] * y3 + GR[g + 2] * z3); }
    return 32 * n;
  }
}

/** Fractal noise, normalised to roughly [-1, 1]. */
export function fbm2(n: Simplex, x: number, y: number, oct: number, lac = 2, gain = 0.5): number {
  let a = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += a * n.n2(x * f, y * f); norm += a; a *= gain; f *= lac; }
  return sum / norm;
}

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
/** Piecewise-linear spline through [x0,y0,x1,y1,...] (xs ascending). */
export function spline(v: number, pts: number[]): number {
  if (v <= pts[0]) return pts[1];
  for (let i = 2; i < pts.length; i += 2) {
    if (v <= pts[i]) { const t = (v - pts[i - 2]) / (pts[i] - pts[i - 2]); return pts[i - 1] + (pts[i + 1] - pts[i - 1]) * t; }
  }
  return pts[pts.length - 1];
}
