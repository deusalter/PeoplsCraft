// Greedy mesher with per-vertex ambient occlusion and smooth RGB + sky lighting.
// Runs in a worker on the region buffers filled by light.ts. Cube faces are merged per
// slice when their lighting is uniform; liquids, plants and boxes are emitted individually.
//
// Vertex layout (24 bytes):
//   aPos   Int16 x4   position in 1/16 blocks, w = flags (bits 0-2 normal, 3-4 sway, 5 water, 6 mirror the tile
//                     at random per block, 7 lava, 8 face is under water)
//   aUv    Uint16 x4  uv in 1/16 tiles, texture layer, aux (emissive strength or water depth)
//   aLight Uint8 x4   sky, block R, G, B
//   aTint  Uint8 x4   biome tint RGB, ambient occlusion (on water tops: how much open water surrounds the corner)
import { CH, RS } from '../core/constants';
import { hashInt } from '../core/noise';
import { FOLIAGE_RGB, GRASS_RGB, WATER_RGB } from '../data/biomes';
import {
  MAT_CUTOUT, SHAPE_BOX, SHAPE_CROSS, SHAPE_CUBE, SHAPE_LIQUID, T_BOX, T_DOOR, T_EMISSIVE, T_LAYER, T_LIQH, T_LIQUID,
  T_MAT, T_OPAQUE, T_SELFCULL, T_SHAPE, T_SWAY, T_TINT, T_VARY, texLayer,
} from '../data/blocks';
import { lb, lg, lr, rb, sky } from './light';

const SX = 256, SZ = RS * 256;

class Out {
  pos = new Int16Array(1 << 15); uv = new Uint16Array(1 << 15); light = new Uint8Array(1 << 15); tint = new Uint8Array(1 << 15);
  idx = new Uint32Array(1 << 14);
  nv = 0; ni = 0; minY = 4096; maxY = 0;
  reset(): void { this.nv = 0; this.ni = 0; this.minY = 4096; this.maxY = 0; }
  reserve(): void {
    if ((this.nv + 4) * 4 > this.pos.length) {
      const n = this.pos.length * 2;
      const p = new Int16Array(n); p.set(this.pos); this.pos = p;
      const u = new Uint16Array(n); u.set(this.uv); this.uv = u;
      const l = new Uint8Array(n); l.set(this.light); this.light = l;
      const t = new Uint8Array(n); t.set(this.tint); this.tint = t;
    }
    if (this.ni + 6 > this.idx.length) { const i = new Uint32Array(this.idx.length * 2); i.set(this.idx); this.idx = i; }
  }
  vert(x: number, y: number, z: number, flags: number, u: number, v: number, layer: number, aux: number, c: number, t: number): void {
    const o = this.nv * 4;
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z; this.pos[o + 3] = flags;
    this.uv[o] = u; this.uv[o + 1] = v; this.uv[o + 2] = layer; this.uv[o + 3] = aux;
    this.light[o] = (c & 63) << 2; this.light[o + 1] = ((c >> 6) & 63) << 2; this.light[o + 2] = ((c >> 12) & 63) << 2; this.light[o + 3] = ((c >> 18) & 63) << 2;
    this.tint[o] = t >> 16; this.tint[o + 1] = (t >> 8) & 255; this.tint[o + 2] = t & 255; this.tint[o + 3] = ((c >> 24) & 3) * 85;
    if (y < this.minY) this.minY = y;
    if (y > this.maxY) this.maxY = y;
    this.nv++;
  }
  /** Two triangles over the last four vertices. `flip` reverses winding, `alt` uses the B-D diagonal. */
  quad(flip: boolean, alt: boolean): void {
    const b = this.nv - 4, ix = this.idx; let n = this.ni;
    if (!alt) {
      if (flip) { ix[n++] = b; ix[n++] = b + 2; ix[n++] = b + 1; ix[n++] = b; ix[n++] = b + 3; ix[n++] = b + 2; }
      else { ix[n++] = b; ix[n++] = b + 1; ix[n++] = b + 2; ix[n++] = b; ix[n++] = b + 2; ix[n++] = b + 3; }
    } else if (flip) { ix[n++] = b + 1; ix[n++] = b + 3; ix[n++] = b + 2; ix[n++] = b + 1; ix[n++] = b; ix[n++] = b + 3; }
    else { ix[n++] = b + 1; ix[n++] = b + 2; ix[n++] = b + 3; ix[n++] = b + 1; ix[n++] = b + 3; ix[n++] = b; }
    this.ni = n;
  }
}
const outs = [new Out(), new Out(), new Out()];

// greedy mask (max slice is 16 x 256)
const mKey = new Int32Array(4096), mUni = new Uint8Array(4096);
const mC0 = new Int32Array(4096), mC1 = new Int32Array(4096), mC2 = new Int32Array(4096), mC3 = new Int32Array(4096);
const mT0 = new Int32Array(4096), mT1 = new Int32Array(4096), mT2 = new Int32Array(4096), mT3 = new Int32Array(4096);

const MUL = [0, 1075, 538, 358, 269];
const WHITE = 0xffffff;
const tintGrid = new Int32Array(4 * 289);   // [type][vz*17+vx]
const rbio = new Uint8Array(RS * RS);
const DOOR_UP = texLayer('door'), DOOR_LOW = texLayer('door_lower');

const L = (i: number): number => sky[i] | (lr[i] << 8) | (lg[i] << 16) | (lb[i] << 24);
function pack(sum: number, n: number, ao: number): number {
  const m = MUL[n];
  return (((sum & 255) * m) >> 8) | ((((sum >> 8) & 255) * m) >> 8) << 6 | ((((sum >> 16) & 255) * m) >> 8) << 12 | ((((sum >>> 24) & 255) * m) >> 8) << 18 | (ao << 24);
}
function corner(lP: number, i1: number, s1: number, i2: number, s2: number, ic: number, sc: number): number {
  let sum = lP, n = 1, ao = 0;
  if (!(s1 && s2)) { ao = 3 - s1 - s2 - sc; if (!sc) { sum += L(ic); n++; } }
  if (!s1) { sum += L(i1); n++; }
  if (!s2) { sum += L(i2); n++; }
  return pack(sum, n, ao);
}
/** Light + AO for the four corners of a face whose outside cell is P; plane axes have strides SU, SV. */
function faceLight(k: number, P: number, SU: number, SV: number): void {
  const u0 = T_OPAQUE[rb[P - SU]], u1 = T_OPAQUE[rb[P + SU]], v0 = T_OPAQUE[rb[P - SV]], v1 = T_OPAQUE[rb[P + SV]];
  const lP = L(P);
  mC0[k] = corner(lP, P - SU, u0, P - SV, v0, P - SU - SV, T_OPAQUE[rb[P - SU - SV]]);
  mC1[k] = corner(lP, P + SU, u1, P - SV, v0, P + SU - SV, T_OPAQUE[rb[P + SU - SV]]);
  mC2[k] = corner(lP, P + SU, u1, P + SV, v1, P + SU + SV, T_OPAQUE[rb[P + SU + SV]]);
  mC3[k] = corner(lP, P - SU, u0, P + SV, v1, P - SU + SV, T_OPAQUE[rb[P - SU + SV]]);
}
function visible(id: number, nb: number, positive: boolean): boolean {
  if (T_OPAQUE[nb]) return false;
  if (nb === id) { const sc = T_SELFCULL[id]; if (sc === 1) return false; if (sc === 2) return positive; }
  return true;
}
const keyOf = (id: number, dir: number): number =>
  T_LAYER[id * 6 + dir] | (T_EMISSIVE[id] << 10) | (T_MAT[id] << 18) | ((T_SWAY[id] === 1 ? 1 : 0) << 20) | (T_VARY[id] << 22) | (1 << 23);
const bright = (c: number): number => ((c >> 24) & 3) * 64 + (c & 63) + Math.max((c >> 6) & 63, (c >> 12) & 63, (c >> 18) & 63);

function buildTints(biomes: Uint8Array[]): void {
  for (let n = 0; n < 9; n++) {
    const b = biomes[n], bx = (n % 3) * 16, bz = ((n / 3) | 0) * 16;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) rbio[(bz + z) * RS + bx + x] = b[(z << 4) | x];
  }
  const first = rbio[14 * RS + 14];
  let same = true;
  for (let z = 14; z < 35 && same; z++) for (let x = 14; x < 35; x++) if (rbio[z * RS + x] !== first) { same = false; break; }
  const tabs = [GRASS_RGB, FOLIAGE_RGB, WATER_RGB];
  for (let t = 0; t < 3; t++) {
    const tab = tabs[t], o = (t + 1) * 289;
    if (same) { tintGrid.fill((tab[first * 3] << 16) | (tab[first * 3 + 1] << 8) | tab[first * 3 + 2], o, o + 289); continue; }
    for (let vz = 0; vz <= 16; vz++) for (let vx = 0; vx <= 16; vx++) {
      let r = 0, g = 0, bl = 0;
      for (let dz = -2; dz < 2; dz++) for (let dx = -2; dx < 2; dx++) {
        const bi = rbio[(vz + 16 + dz) * RS + vx + 16 + dx] * 3;
        r += tab[bi]; g += tab[bi + 1]; bl += tab[bi + 2];
      }
      tintGrid[o + vz * 17 + vx] = ((r >> 4) << 16) | ((g >> 4) << 8) | (bl >> 4);
    }
  }
}

function greedy(U: number, V: number, dir: number, s: number): void {
  const flip = dir === 0 || dir === 2 || dir === 5;
  for (let v = 0; v < V; v++) for (let u = 0; u < U;) {
    const k = v * U + u, key = mKey[k];
    if (key === 0) { u++; continue; }
    let w = 1, h = 1;
    const cA = mC0[k], cB = mC1[k], cC = mC2[k], cD = mC3[k], tA = mT0[k], tB = mT1[k], tC = mT2[k], tD = mT3[k];
    if (mUni[k]) {
      while (u + w < U && mKey[k + w] === key && mUni[k + w] && mC0[k + w] === cA && mT0[k + w] === tA) w++;
      grow: while (v + h < V) {
        const row = k + h * U;
        for (let q = 0; q < w; q++) if (mKey[row + q] !== key || !mUni[row + q] || mC0[row + q] !== cA || mT0[row + q] !== tA) break grow;
        h++;
      }
      for (let hh = 0; hh < h; hh++) { const row = k + hh * U; for (let q = 0; q < w; q++) mKey[row + q] = 0; }
    } else mKey[k] = 0;

    const o = outs[(key >> 18) & 3]; o.reserve();
    const layer = key & 1023, aux = (key >> 10) & 255, flags = dir | (((key >> 20) & 3) << 3) | (((key >> 22) & 1) << 6) | (((key >> 24) & 1) << 8);
    const u0 = u * 16, u1 = (u + w) * 16, v0 = v * 16, v1 = (v + h) * 16;
    if (dir < 2) {
      const x = (s + (dir === 0 ? 1 : 0)) * 16;
      o.vert(x, v0, u0, flags, u0, 4096 - v0, layer, aux, cA, tA); o.vert(x, v0, u1, flags, u1, 4096 - v0, layer, aux, cB, tB);
      o.vert(x, v1, u1, flags, u1, 4096 - v1, layer, aux, cC, tC); o.vert(x, v1, u0, flags, u0, 4096 - v1, layer, aux, cD, tD);
    } else if (dir < 4) {
      const y = (s + (dir === 2 ? 1 : 0)) * 16;
      o.vert(u0, y, v0, flags, u0, v0, layer, aux, cA, tA); o.vert(u1, y, v0, flags, u1, v0, layer, aux, cB, tB);
      o.vert(u1, y, v1, flags, u1, v1, layer, aux, cC, tC); o.vert(u0, y, v1, flags, u0, v1, layer, aux, cD, tD);
    } else {
      const z = (s + (dir === 4 ? 1 : 0)) * 16;
      o.vert(u0, v0, z, flags, u0, 4096 - v0, layer, aux, cA, tA); o.vert(u1, v0, z, flags, u1, 4096 - v0, layer, aux, cB, tB);
      o.vert(u1, v1, z, flags, u1, 4096 - v1, layer, aux, cC, tC); o.vert(u0, v1, z, flags, u0, 4096 - v1, layer, aux, cD, tD);
    }
    o.quad(flip, bright(cA) + bright(cC) < bright(cB) + bright(cD));
    u += w;
  }
}

function setFace(k: number, id: number, dir: number, P: number, SU: number, SV: number, vA: number, vB: number, vC: number, vD: number): void {
  mKey[k] = keyOf(id, dir) | (T_LIQUID[rb[P]] === 1 ? 1 << 24 : 0);   // faces under water get caustics
  faceLight(k, P, SU, SV);
  const tt = T_TINT[id];
  if (tt) { const o = tt * 289; mT0[k] = tintGrid[o + vA]; mT1[k] = tintGrid[o + vB]; mT2[k] = tintGrid[o + vC]; mT3[k] = tintGrid[o + vD]; }
  else { mT0[k] = WHITE; mT1[k] = WHITE; mT2[k] = WHITE; mT3[k] = WHITE; }
  const c = mC0[k], t = mT0[k];
  mUni[k] = c === mC1[k] && c === mC2[k] && c === mC3[k] && t === mT1[k] && t === mT2[k] && t === mT3[k] ? 1 : 0;
}

function liquidDepth(i: number, fam: number): number {
  if (T_LIQUID[rb[i]] !== fam) return 0;
  let d = 1;
  while (d < 8 && T_LIQUID[rb[i - d]] === fam) d++;
  return d;
}

function box(o: Out, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, bx: number, by: number, bz: number, layers: number, layerOverride: number, aux: number, c: number, t: number): void {
  // u/v are taken from the position inside the cell so a thin box samples the matching texels
  const lx0 = x0 - bx, lx1 = x1 - bx, ly0 = 16 - (y0 - by), ly1 = 16 - (y1 - by), lz0 = z0 - bz, lz1 = z1 - bz;
  const ly = (d: number): number => (layerOverride >= 0 ? layerOverride : T_LAYER[layers + d]);
  o.reserve(); let l = ly(0);
  o.vert(x1, y0, z0, 0, lz0, ly0, l, aux, c, t); o.vert(x1, y0, z1, 0, lz1, ly0, l, aux, c, t); o.vert(x1, y1, z1, 0, lz1, ly1, l, aux, c, t); o.vert(x1, y1, z0, 0, lz0, ly1, l, aux, c, t); o.quad(true, false);
  o.reserve(); l = ly(1);
  o.vert(x0, y0, z0, 1, lz0, ly0, l, aux, c, t); o.vert(x0, y0, z1, 1, lz1, ly0, l, aux, c, t); o.vert(x0, y1, z1, 1, lz1, ly1, l, aux, c, t); o.vert(x0, y1, z0, 1, lz0, ly1, l, aux, c, t); o.quad(false, false);
  o.reserve(); l = ly(2);
  o.vert(x0, y1, z0, 2, lx0, lz0, l, aux, c, t); o.vert(x1, y1, z0, 2, lx1, lz0, l, aux, c, t); o.vert(x1, y1, z1, 2, lx1, lz1, l, aux, c, t); o.vert(x0, y1, z1, 2, lx0, lz1, l, aux, c, t); o.quad(true, false);
  o.reserve(); l = ly(3);
  o.vert(x0, y0, z0, 3, lx0, lz0, l, aux, c, t); o.vert(x1, y0, z0, 3, lx1, lz0, l, aux, c, t); o.vert(x1, y0, z1, 3, lx1, lz1, l, aux, c, t); o.vert(x0, y0, z1, 3, lx0, lz1, l, aux, c, t); o.quad(false, false);
  o.reserve(); l = ly(4);
  o.vert(x0, y0, z1, 4, lx0, ly0, l, aux, c, t); o.vert(x1, y0, z1, 4, lx1, ly0, l, aux, c, t); o.vert(x1, y1, z1, 4, lx1, ly1, l, aux, c, t); o.vert(x0, y1, z1, 4, lx0, ly1, l, aux, c, t); o.quad(false, false);
  o.reserve(); l = ly(5);
  o.vert(x0, y0, z0, 5, lx0, ly0, l, aux, c, t); o.vert(x1, y0, z0, 5, lx1, ly0, l, aux, c, t); o.vert(x1, y1, z0, 5, lx1, ly1, l, aux, c, t); o.vert(x0, y1, z0, 5, lx0, ly1, l, aux, c, t); o.quad(true, false);
}

export interface MeshPart { pos: Int16Array; uv: Uint16Array; light: Uint8Array; tint: Uint8Array; idx: Uint16Array | Uint32Array; minY: number; maxY: number }

/** Mesh the centre chunk of the region. light.ts buffers must already be filled. */
export function meshCenter(biomes: Uint8Array[], wx0: number, wz0: number): (MeshPart | null)[] {
  for (const o of outs) o.reset();
  buildTints(biomes);

  let maxY = 0;
  for (let z = 15; z < 33; z++) for (let x = 15; x < 33; x++) {
    const base = (z * RS + x) << 8;
    let y = CH - 2;
    while (y > maxY && rb[base + y] === 0) y--;
    if (y > maxY) maxY = y;
  }
  const V = maxY + 1;

  // ---- X faces (mask u = z, v = y) ----
  for (let dir = 0; dir < 2; dir++) {
    const N = dir === 0 ? SX : -SX, vx = dir === 0 ? 1 : 0;
    for (let s = 0; s < 16; s++) {
      let any = false;
      for (let z = 0; z < 16; z++) {
        const base = ((z + 16) * RS + s + 16) << 8;
        for (let y = 0; y < V; y++) {
          const i = base + y, id = rb[i], k = y * 16 + z;
          if (T_SHAPE[id] !== SHAPE_CUBE || !visible(id, rb[i + N], dir === 0)) { mKey[k] = 0; continue; }
          const a = z * 17 + s + vx, b = a + 17;
          setFace(k, id, dir, i + N, SZ, 1, a, b, b, a); any = true;
        }
      }
      if (any) greedy(16, V, dir, s);
    }
  }
  // ---- Y faces (mask u = x, v = z) ----
  for (let dir = 2; dir < 4; dir++) {
    const N = dir === 2 ? 1 : -1;
    for (let y = dir === 2 ? 0 : 1; y < V; y++) {
      let any = false;
      for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
        const i = (((z + 16) * RS + x + 16) << 8) | y, id = rb[i], k = z * 16 + x;
        if (T_SHAPE[id] !== SHAPE_CUBE || !visible(id, rb[i + N], dir === 2)) { mKey[k] = 0; continue; }
        const a = z * 17 + x;
        setFace(k, id, dir, i + N, SX, SZ, a, a + 1, a + 18, a + 17); any = true;
      }
      if (any) greedy(16, 16, dir, y);
    }
  }
  // ---- Z faces (mask u = x, v = y) ----
  for (let dir = 4; dir < 6; dir++) {
    const N = dir === 4 ? SZ : -SZ, vz = dir === 4 ? 1 : 0;
    for (let s = 0; s < 16; s++) {
      let any = false;
      for (let x = 0; x < 16; x++) {
        const base = ((s + 16) * RS + x + 16) << 8;
        for (let y = 0; y < V; y++) {
          const i = base + y, id = rb[i], k = y * 16 + x;
          if (T_SHAPE[id] !== SHAPE_CUBE || !visible(id, rb[i + N], dir === 4)) { mKey[k] = 0; continue; }
          const a = (s + vz) * 17 + x, b = a + 1;
          setFace(k, id, dir, i + N, SX, 1, a, b, b, a); any = true;
        }
      }
      if (any) greedy(16, V, dir, s);
    }
  }

  // ---- plants, liquids, boxes ----
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const base = ((z + 16) * RS + x + 16) << 8;
    for (let y = 1; y < V; y++) {
      const i = base + y, id = rb[i], sh = T_SHAPE[id];
      if (sh < SHAPE_CROSS) continue;
      const X = x * 16, Y = y * 16, Z = z * 16, tt = T_TINT[id], g = z * 17 + x;
      const t = tt ? tintGrid[tt * 289 + g] : WHITE;
      if (sh === SHAPE_CROSS) {
        // the root is darkened so plants sit on the ground instead of floating over it
        const o = outs[MAT_CUTOUT], c = pack(L(i), 1, 3), cb = pack(L(i), 1, 1), layer = T_LAYER[id * 6], aux = T_EMISSIVE[id];
        const hh = hashInt(wx0 + x, y, wz0 + z, 77), jx = (hh & 3) - 1, jz = ((hh >> 2) & 3) - 1;
        const x0 = X + 1 + jx, x1 = X + 15 + jx, z0 = Z + 1 + jz, z1 = Z + 15 + jz, top = 6 | (T_SWAY[id] ? 2 << 3 : 0);
        o.reserve();
        o.vert(x0, Y, z0, 6, 0, 16, layer, aux, cb, t); o.vert(x1, Y, z1, 6, 16, 16, layer, aux, cb, t);
        o.vert(x1, Y + 16, z1, top, 16, 0, layer, aux, c, t); o.vert(x0, Y + 16, z0, top, 0, 0, layer, aux, c, t); o.quad(false, false);
        o.reserve();
        o.vert(x0, Y, z1, 6, 0, 16, layer, aux, cb, t); o.vert(x1, Y, z0, 6, 16, 16, layer, aux, cb, t);
        o.vert(x1, Y + 16, z0, top, 16, 0, layer, aux, c, t); o.vert(x0, Y + 16, z1, top, 0, 0, layer, aux, c, t); o.quad(false, false);
      } else if (sh === SHAPE_LIQUID) {
        const fam = T_LIQUID[id], o = outs[T_MAT[id]], layer = T_LAYER[id * 6], water = fam === 1;
        const above = rb[i + 1], same = T_LIQUID[above] === fam;
        const yt = Y + (same ? 16 : T_LIQH[id]), wf = water ? 32 : fam === 2 ? 128 : 0, wave = (water && !same ? 3 << 3 : 0) | wf, em = T_EMISSIVE[id];
        if (!same && !T_OPAQUE[above]) {
          const P = i + 1;
          faceLight(0, P, SX, SZ);
          let d0 = em, d1 = em, d2 = em, d3 = em, s0 = 3, s1 = 3, s2 = 3, s3 = 3;
          if (water) {
            // shoreline factor per corner: 3 minus the solid cells touching it at water level (the shader draws foam from it)
            const xm = T_OPAQUE[rb[i - SX]], xp = T_OPAQUE[rb[i + SX]], zm = T_OPAQUE[rb[i - SZ]], zp = T_OPAQUE[rb[i + SZ]];
            s0 -= xm + zm + T_OPAQUE[rb[i - SX - SZ]]; s1 -= xp + zm + T_OPAQUE[rb[i + SX - SZ]]; s2 -= xp + zp + T_OPAQUE[rb[i + SX + SZ]]; s3 -= xm + zp + T_OPAQUE[rb[i - SX + SZ]];
            const a = liquidDepth(i - SX - SZ, 1), b = liquidDepth(i - SZ, 1), c2 = liquidDepth(i + SX - SZ, 1), d = liquidDepth(i - SX, 1);
            const e = liquidDepth(i, 1), f = liquidDepth(i + SX, 1), gg = liquidDepth(i - SX + SZ, 1), h = liquidDepth(i + SZ, 1), k = liquidDepth(i + SX + SZ, 1);
            d0 = ((a + b + d + e) * 8) | 0; d1 = ((b + c2 + e + f) * 8) | 0; d2 = ((e + f + h + k) * 8) | 0; d3 = ((d + e + gg + h) * 8) | 0;
          }
          const to = tt * 289;
          o.reserve();
          o.vert(X, yt, Z, 2 | wave, X, Z, layer, d0, (mC0[0] & 0xffffff) | (s0 << 24), tt ? tintGrid[to + g] : WHITE);
          o.vert(X + 16, yt, Z, 2 | wave, X + 16, Z, layer, d1, (mC1[0] & 0xffffff) | (s1 << 24), tt ? tintGrid[to + g + 1] : WHITE);
          o.vert(X + 16, yt, Z + 16, 2 | wave, X + 16, Z + 16, layer, d2, (mC2[0] & 0xffffff) | (s2 << 24), tt ? tintGrid[to + g + 18] : WHITE);
          o.vert(X, yt, Z + 16, 2 | wave, X, Z + 16, layer, d3, (mC3[0] & 0xffffff) | (s3 << 24), tt ? tintGrid[to + g + 17] : WHITE);
          o.quad(true, false);
        }
        const aux = water ? 96 : em;
        for (let d = 0; d < 6; d++) {
          if (d === 2) continue;
          const nI = i + (d === 0 ? SX : d === 1 ? -SX : d === 3 ? -1 : d === 4 ? SZ : -SZ), nb = rb[nI];
          if (T_LIQUID[nb] === fam || T_OPAQUE[nb]) continue;
          const c = pack(L(nI), 1, 3), fl = d | wf, ft = d | wave;
          o.reserve();
          if (d === 0) { o.vert(X + 16, Y, Z, fl, 0, 16, layer, aux, c, t); o.vert(X + 16, Y, Z + 16, fl, 16, 16, layer, aux, c, t); o.vert(X + 16, yt, Z + 16, ft, 16, 0, layer, aux, c, t); o.vert(X + 16, yt, Z, ft, 0, 0, layer, aux, c, t); o.quad(true, false); }
          else if (d === 1) { o.vert(X, Y, Z, fl, 0, 16, layer, aux, c, t); o.vert(X, Y, Z + 16, fl, 16, 16, layer, aux, c, t); o.vert(X, yt, Z + 16, ft, 16, 0, layer, aux, c, t); o.vert(X, yt, Z, ft, 0, 0, layer, aux, c, t); o.quad(false, false); }
          else if (d === 3) { o.vert(X, Y, Z, fl, 0, 0, layer, aux, c, t); o.vert(X + 16, Y, Z, fl, 16, 0, layer, aux, c, t); o.vert(X + 16, Y, Z + 16, fl, 16, 16, layer, aux, c, t); o.vert(X, Y, Z + 16, fl, 0, 16, layer, aux, c, t); o.quad(false, false); }
          else if (d === 4) { o.vert(X, Y, Z + 16, fl, 0, 16, layer, aux, c, t); o.vert(X + 16, Y, Z + 16, fl, 16, 16, layer, aux, c, t); o.vert(X + 16, yt, Z + 16, ft, 16, 0, layer, aux, c, t); o.vert(X, yt, Z + 16, ft, 0, 0, layer, aux, c, t); o.quad(false, false); }
          else { o.vert(X, Y, Z, fl, 0, 16, layer, aux, c, t); o.vert(X + 16, Y, Z, fl, 16, 16, layer, aux, c, t); o.vert(X + 16, yt, Z, ft, 16, 0, layer, aux, c, t); o.vert(X, yt, Z, ft, 0, 0, layer, aux, c, t); o.quad(true, false); }
        }
      } else if (sh === SHAPE_BOX) {
        const b = id * 6, c = pack(L(i), 1, 3);
        const lo = T_DOOR[id] ? (rb[i - 1] === id ? DOOR_UP : DOOR_LOW) : -1;
        box(outs[T_MAT[id]], X + T_BOX[b], Y + T_BOX[b + 1], Z + T_BOX[b + 2], X + T_BOX[b + 3], Y + T_BOX[b + 4], Z + T_BOX[b + 5], X, Y, Z, b, lo, T_EMISSIVE[id], c, t);
      }
    }
  }

  return outs.map((o) => {
    if (o.nv === 0) return null;
    return {
      pos: o.pos.slice(0, o.nv * 4), uv: o.uv.slice(0, o.nv * 4), light: o.light.slice(0, o.nv * 4), tint: o.tint.slice(0, o.nv * 4),
      idx: o.nv <= 65535 ? new Uint16Array(o.idx.subarray(0, o.ni)) : o.idx.slice(0, o.ni),
      minY: o.minY / 16, maxY: o.maxY / 16,
    };
  });
}
