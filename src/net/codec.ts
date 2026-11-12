// Bytes: the quantisers of the two binary messages, base64, and the two encodings of a chunk's
// edit set. Pure, and written by hand where the platform's helpers differ: there is no `atob` in a
// worker-less Node build of the simulation.
import { CVOL } from '../core/constants';
import { rle } from '../sim/rle';

// ---- quantisers --------------------------------------------------------------------------------

const TAU = Math.PI * 2, QUARTER = 1.5708;
const clampInt = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** A horizontal coordinate relative to the snapshot origin, in 1/32 blocks (i16). */
export const qRel = (v: number, origin: number): number => clampInt(Math.round((v - origin) * 32), -32768, 32767);
export const dRel = (q: number, origin: number): number => origin + q / 32;
/** A height, in 1/32 blocks from y = -64 (u16). */
export const qY = (y: number): number => clampInt(Math.round((y + 64) * 32), 0, 65535);
export const dY = (q: number): number => q / 32 - 64;
/** An angle as a u16 turn. */
export const qYaw16 = (yaw: number): number => Math.round((yaw / TAU) * 65536) & 0xffff;
export const dYaw16 = (q: number): number => (q / 65536) * TAU;
/** An angle as a u8 turn. */
export const qYaw8 = (yaw: number): number => Math.round((yaw / TAU) * 256) & 255;
export const dYaw8 = (q: number): number => (q / 256) * TAU;
/** A pitch (or a roll) within a quarter turn either way, as i8 and as i16. */
export const qPitch8 = (p: number): number => clampInt(Math.round((p / QUARTER) * 127), -127, 127);
export const dPitch8 = (q: number): number => (q / 127) * QUARTER;
export const qPitch16 = (p: number): number => clampInt(Math.round((p / QUARTER) * 32767), -32767, 32767);
export const dPitch16 = (q: number): number => (q / 32767) * QUARTER;
/** 0..1 as u8. */
export const qUnit = (v: number): number => clampInt(Math.round(v * 255), 0, 255);
export const dUnit = (q: number): number => q / 255;
/** -1..1 as i8. */
export const qSigned = (v: number): number => clampInt(Math.round(v * 127), -127, 127);
export const dSigned = (q: number): number => q / 127;
/** A velocity component in 1/256 blocks per second (i16). */
export const qVel = (v: number): number => clampInt(Math.round(v * 256), -32768, 32767);
export const dVel = (q: number): number => q / 256;
/** The origin a snapshot's positions are relative to, for a receiver standing at this coordinate. */
export const snapOrigin = (v: number): number => Math.floor(v / 16) * 16;

// ---- base64 ------------------------------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_CODE = new Uint8Array(64), B64_VAL = new Int8Array(128).fill(-1);
for (let i = 0; i < 64; i++) { B64_CODE[i] = B64.charCodeAt(i); B64_VAL[B64_CODE[i]] = i; }
const CHUNK = 0x6000;   // a multiple of 4, small enough for String.fromCharCode.apply

export function toBase64(a: Uint8Array): string {
  const n = a.length, out = new Uint8Array(Math.ceil(n / 3) * 4);
  let o = 0, i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
    out[o++] = B64_CODE[v >> 18]; out[o++] = B64_CODE[(v >> 12) & 63]; out[o++] = B64_CODE[(v >> 6) & 63]; out[o++] = B64_CODE[v & 63];
  }
  if (i < n) {
    const two = i + 1 < n, v = (a[i] << 16) | (two ? a[i + 1] << 8 : 0);
    out[o++] = B64_CODE[v >> 18]; out[o++] = B64_CODE[(v >> 12) & 63]; out[o++] = two ? B64_CODE[(v >> 6) & 63] : 61; out[o++] = 61;
  }
  let s = '';
  for (let j = 0; j < out.length; j += CHUNK) s += String.fromCharCode.apply(null, out.subarray(j, j + CHUNK) as unknown as number[]);
  return s;
}

/** Null when the text is not padded base64. */
export function fromBase64(s: string): Uint8Array | null {
  const n = s.length;
  if (n % 4) return null;
  if (!n) return new Uint8Array(0);
  const pad = s.charCodeAt(n - 1) === 61 ? (s.charCodeAt(n - 2) === 61 ? 2 : 1) : 0, out = new Uint8Array((n / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < n; i += 4) {
    const last = i + 4 === n;
    let v = 0;
    for (let j = 0; j < 4; j++) {
      const c = s.charCodeAt(i + j);
      if (last && j >= 4 - pad) { if (c !== 61) return null; v <<= 6; continue; }
      const d = c < 128 ? B64_VAL[c] : -1;
      if (d < 0) return null;
      v = (v << 6) | d;
    }
    if (o < out.length) out[o++] = v >> 16;
    if (o < out.length) out[o++] = (v >> 8) & 255;
    if (o < out.length) out[o++] = v & 255;
  }
  return out;
}

// ---- edit sets ---------------------------------------------------------------------------------
// Encoding 0 (sparse): three bytes per edited cell, the cell index as u16 little-endian and the block id.
// Encoding 1 (full): the whole block array as run-length pairs (id, count 1..255) in index order.
// The same bytes are what a ChunkRecord stores; on the wire they travel as base64.

/** Sparse bytes of an edit map, in the map's own order. */
export function packSparse(cells: ReadonlyMap<number, number>): Uint8Array {
  const out = new Uint8Array(cells.size * 3);
  let o = 0;
  for (const [i, id] of cells) { out[o++] = i & 255; out[o++] = (i >> 8) & 255; out[o++] = id; }
  return out;
}
/** Calls `put(index, id)` for every entry. False (and nothing called) when the length is not a whole number of entries. */
export function unpackSparse(bytes: Uint8Array, put: (i: number, id: number) => void): boolean {
  if (bytes.length % 3) return false;
  for (let o = 0; o < bytes.length; o += 3) put(bytes[o] | (bytes[o + 1] << 8), bytes[o + 2]);
  return true;
}
export const packFull = (blocks: Uint8Array): Uint8Array => rle(blocks);
/** The block array of a full encoding. Null unless the runs cover exactly `size` cells. */
export function unpackFull(bytes: Uint8Array, size = CVOL): Uint8Array | null {
  if (bytes.length % 2) return null;
  const out = new Uint8Array(size);
  let o = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const n = bytes[i + 1];
    if (!n || o + n > size) return null;
    out.fill(bytes[i], o, o + n); o += n;
  }
  return o === size ? out : null;
}

/** The `enc` and `data` of a `ce` entry for an edit map: its full array when it has one, else its cells. */
export function encodeEdits(e: { cells: ReadonlyMap<number, number> | null; full: Uint8Array | null }): { enc: 0 | 1; data: string } {
  return e.full ? { enc: 1, data: toBase64(packFull(e.full)) } : { enc: 0, data: toBase64(packSparse(e.cells ?? new Map())) };
}
/** The sparse entries of a `ce` entry with `enc` 0, through `put`. False when the data is malformed. */
export function decodeSparse(data: string, put: (i: number, id: number) => void): boolean {
  const b = fromBase64(data);
  return !!b && unpackSparse(b, put);
}
/** The block array of a `ce` entry with `enc` 1. Null when the data is malformed. */
export function decodeFull(data: string): Uint8Array | null {
  const b = fromBase64(data);
  return b ? unpackFull(b) : null;
}
