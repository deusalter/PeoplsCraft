// Flood-fill lighting over a 3x3 chunk region (48 x 48 columns).
// Light never travels further than 15 blocks and a chunk is 16 wide, so lighting the
// region from scratch yields exact values for the centre chunk with no cross-chunk state.
import { CH, RAREA, RS, RVOL } from '../core/constants';
import { T_ATTEN, T_EMITS, T_EMIT_B, T_EMIT_G, T_EMIT_R, T_OPAQUE } from '../data/blocks';

export const rb = new Uint8Array(RVOL);      // region blocks
export const sky = new Uint8Array(RVOL);
export const lr = new Uint8Array(RVOL);
export const lg = new Uint8Array(RVOL);
export const lb = new Uint8Array(RVOL);

const QN = 1 << 21, QM = QN - 1;
const queue = new Int32Array(QN);
const h15 = new Int16Array(RAREA);   // first y (from the top) where the column stops being fully sky-lit
const stop = new Int16Array(RAREA);  // y where the direct beam died
const SX = 256, SZ = RS * 256;
// Only the centre chunk and a one-column rim (columns 15..32) are ever read back. `need` is a column's distance
// from that footprint: every step costs at least one level, so a cell must have more light than that to matter.
const need = new Uint8Array(RAREA);
for (let z = 0; z < RS; z++) for (let x = 0; x < RS; x++) need[z * RS + x] = Math.max(0, 15 - x, x - 32) + Math.max(0, 15 - z, z - 32);
const seeds: number[] = [];
let skyDirty = true, blockDirty = true;

/** Copy nine chunk arrays into the region buffer. Column-major layout makes this 2304 memcpys. */
export function assembleRegion(chunks: Uint8Array[]): void {
  for (let n = 0; n < 9; n++) {
    const c = chunks[n], bx = (n % 3) * 16, bz = ((n / 3) | 0) * 16;
    for (let z = 0; z < 16; z++) {
      const src = (z << 4) << 8, dst = ((bz + z) * RS + bx) << 8;
      rb.set(c.subarray(src, src + 4096), dst);
    }
  }
}

function flood(L: Uint8Array, head: number, tail: number): void {
  while (head < tail) {
    const i = queue[head++ & QM];
    const l = L[i] - 1;
    if (l <= 0) continue;
    const y = i & 255, c = i >> 8;
    if (l < need[c]) continue;   // cannot reach the footprint: values out here end up too low, but nothing reads them
    const x = c % RS, z = (c / RS) | 0;
    let j: number, id: number, nl: number;
    if (y > 0) { j = i - 1; id = rb[j]; if (!T_OPAQUE[id]) { nl = l - T_ATTEN[id]; if (nl > L[j]) { L[j] = nl; queue[tail++ & QM] = j; } } }
    if (y < CH - 1) { j = i + 1; id = rb[j]; if (!T_OPAQUE[id]) { nl = l - T_ATTEN[id]; if (nl > L[j]) { L[j] = nl; queue[tail++ & QM] = j; } } }
    if (x > 0) { j = i - SX; id = rb[j]; if (!T_OPAQUE[id]) { nl = l - T_ATTEN[id]; if (nl > L[j]) { L[j] = nl; queue[tail++ & QM] = j; } } }
    if (x < RS - 1) { j = i + SX; id = rb[j]; if (!T_OPAQUE[id]) { nl = l - T_ATTEN[id]; if (nl > L[j]) { L[j] = nl; queue[tail++ & QM] = j; } } }
    if (z > 0) { j = i - SZ; id = rb[j]; if (!T_OPAQUE[id]) { nl = l - T_ATTEN[id]; if (nl > L[j]) { L[j] = nl; queue[tail++ & QM] = j; } } }
    if (z < RS - 1) { j = i + SZ; id = rb[j]; if (!T_OPAQUE[id]) { nl = l - T_ATTEN[id]; if (nl > L[j]) { L[j] = nl; queue[tail++ & QM] = j; } } }
  }
}

/** Light the region. `emit[n]` says whether chunk n contains any light-emitting block. */
export function computeLight(hasSky: boolean, emit: boolean[]): void {
  // the buffers are 590 KB each: clear only the ones the previous job wrote to
  if (skyDirty) { sky.fill(0); skyDirty = false; }
  if (blockDirty) { lr.fill(0); lg.fill(0); lb.fill(0); blockDirty = false; }

  if (hasSky) {
    skyDirty = true;
    // direct beams
    for (let c = 0; c < RAREA; c++) {
      const base = c << 8;
      let l = 15, y = CH - 1, top = CH;
      for (; y >= 0; y--) {
        const id = rb[base + y];
        if (T_OPAQUE[id]) break;
        if (l === 15 && T_ATTEN[id]) top = y + 1;
        l -= T_ATTEN[id];
        if (l <= 0) break;
        sky[base + y] = l;
      }
      if (top === CH) top = y + 1;
      h15[c] = top; stop[c] = y;
    }
    // seed every lit cell that sits beside a column whose beam ended higher up
    let tail = 0;
    for (let z = 0; z < RS; z++) for (let x = 0; x < RS; x++) {
      const c = z * RS + x, base = c << 8, nd = need[c], min = nd > 1 ? nd : 1;
      if (nd > 14) continue;
      let hi = h15[c];
      if (x > 0 && h15[c - 1] > hi) hi = h15[c - 1];
      if (x < RS - 1 && h15[c + 1] > hi) hi = h15[c + 1];
      if (z > 0 && h15[c - RS] > hi) hi = h15[c - RS];
      if (z < RS - 1 && h15[c + RS] > hi) hi = h15[c + RS];
      if (hi > CH - 1) hi = CH - 1;
      for (let y = stop[c] + 1; y <= hi; y++) if (sky[base + y] > min) queue[tail++ & QM] = base + y;
    }
    flood(sky, 0, tail);
  }

  // block light, one channel at a time
  let tr = 0;
  seeds.length = 0;
  for (let n = 0; n < 9; n++) {
    if (!emit[n]) continue;
    const bx = (n % 3) * 16, bz = ((n / 3) | 0) * 16;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const col = (bz + z) * RS + bx + x, base = col << 8;
      if (need[col] > 14) continue;
      for (let y = 1; y < CH - 1; y++) if (T_EMITS[rb[base + y]]) seeds.push(base + y);
    }
  }
  if (seeds.length) {
    blockDirty = true;
    tr = 0; for (const i of seeds) { const v = T_EMIT_R[rb[i]]; if (v) { lr[i] = v; queue[tr++ & QM] = i; } } flood(lr, 0, tr);
    tr = 0; for (const i of seeds) { const v = T_EMIT_G[rb[i]]; if (v) { lg[i] = v; queue[tr++ & QM] = i; } } flood(lg, 0, tr);
    tr = 0; for (const i of seeds) { const v = T_EMIT_B[rb[i]]; if (v) { lb[i] = v; queue[tr++ & QM] = i; } } flood(lb, 0, tr);
  }
}

/** Compact light for the main thread: sky in the high nibble, strongest block channel in the low. */
export function packCenterLight(): Uint8Array {
  const out = new Uint8Array(16 * 16 * CH);
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const src = ((z + 16) * RS + x + 16) << 8, dst = ((z << 4) | x) << 8;
    for (let y = 0; y < CH; y++) {
      const r = lr[src + y], g = lg[src + y], b = lb[src + y];
      out[dst + y] = (sky[src + y] << 4) | (r > g ? (r > b ? r : b) : g > b ? g : b);
    }
  }
  return out;
}
