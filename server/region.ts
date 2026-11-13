// Region files of 8.1: 32 x 32 chunks of one realm in one file, "PCR1", entries, CRC-32 of all before it.
// Integers are little-endian, as everywhere else on the wire and on disk.
import type { ChunkRecord } from '../src/sim/storage';
import type { BlockEnt } from '../src/sim/voxels';

export const REGION_MAGIC = 'PCR1';
export const REGION_SHIFT = 5;
const HEAD = 12, TAIL = 4;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(b: Uint8Array, end = b.length): number {
  let c = 0xffffffff;
  for (let i = 0; i < end; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export const regionOf = (c: number): number => c >> REGION_SHIFT;
export const regionName = (rx: number, rz: number): string => `r.${rx}.${rz}.bin`;
const NAME = /^r\.(-?\d+)\.(-?\d+)\.bin$/;
export function parseRegionName(name: string): [number, number] | null {
  const m = NAME.exec(name);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
/** Key of a chunk inside its region. */
export const localKey = (cx: number, cz: number): number => ((cz & 31) << 5) | (cx & 31);

/** Why a saved file was refused: `version` for a newer format number, `corrupt` for anything else that does not validate. */
export class FormatError extends Error {
  constructor(readonly kind: 'corrupt' | 'version', msg: string) { super(msg); }
}

/** Only chunks with `rev > 0` or stored entities belong in a region; the caller leaves the others out. */
export function encodeRegion(chunks: Iterable<ChunkRecord>): Uint8Array {
  const enc = new TextEncoder(), parts: { c: ChunkRecord; ents: Uint8Array }[] = [];
  let len = 0;
  for (const c of chunks) {
    const ents = enc.encode(JSON.stringify(c.ents));
    parts.push({ c, ents });
    len += 2 + 1 + 2 + 4 + 4 + c.data.length + 4 + ents.length;
  }
  const out = new Uint8Array(HEAD + len + TAIL), v = new DataView(out.buffer);
  out.set(enc.encode(REGION_MAGIC), 0);
  v.setUint32(4, parts.length, true);
  v.setUint32(8, len, true);
  let o = HEAD;
  for (const { c, ents } of parts) {
    out[o] = c.cx & 31; out[o + 1] = c.cz & 31; out[o + 2] = c.enc;
    v.setUint16(o + 3, c.pal, true); v.setUint32(o + 5, c.rev, true); v.setUint32(o + 9, c.data.length, true);
    o += 13;
    out.set(c.data, o); o += c.data.length;
    v.setUint32(o, ents.length, true); o += 4;
    out.set(ents, o); o += ents.length;
  }
  v.setUint32(o, crc32(out, o), true);
  return out;
}

/** The chunks of one region file, keyed by `localKey`. Throws a FormatError when the file does not validate. */
export function decodeRegion(b: Uint8Array, dim: number, rx: number, rz: number): Map<number, ChunkRecord> {
  if (b.length < HEAD + TAIL) throw new FormatError('corrupt', `${b.length} bytes is shorter than a region header`);
  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic !== REGION_MAGIC) {
    const n = /^PCR(\d)$/.exec(magic);
    if (n && Number(n[1]) > 1) throw new FormatError('version', `region format ${magic} is newer than this build`);
    throw new FormatError('corrupt', 'bad magic');
  }
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const count = v.getUint32(4, true), len = v.getUint32(8, true);
  if (HEAD + len + TAIL !== b.length) throw new FormatError('corrupt', `length ${len} does not match the file size ${b.length}`);
  if (v.getUint32(HEAD + len, true) !== crc32(b, HEAD + len)) throw new FormatError('corrupt', 'bad CRC');
  const dec = new TextDecoder('utf-8', { fatal: true }), out = new Map<number, ChunkRecord>(), end = HEAD + len;
  let o = HEAD;
  for (let i = 0; i < count; i++) {
    if (o + 13 > end) throw new FormatError('corrupt', 'entry runs past the end');
    const lx = b[o], lz = b[o + 1], enc = b[o + 2], pal = v.getUint16(o + 3, true), rev = v.getUint32(o + 5, true), dl = v.getUint32(o + 9, true);
    o += 13;
    if (lx > 31 || lz > 31 || (enc !== 0 && enc !== 1) || o + dl + 4 > end) throw new FormatError('corrupt', 'bad entry');
    // a copy, and a plain Uint8Array even when `b` is a Buffer (whose slice is a view)
    const data = new Uint8Array(b.subarray(o, o + dl)); o += dl;
    const el = v.getUint32(o, true); o += 4;
    if (o + el > end) throw new FormatError('corrupt', 'entities run past the end');
    let ents: BlockEnt[];
    try { ents = JSON.parse(dec.decode(b.subarray(o, o + el))) as BlockEnt[]; } catch { throw new FormatError('corrupt', 'entities are not JSON'); }
    if (!Array.isArray(ents)) throw new FormatError('corrupt', 'entities are not a list');
    o += el;
    const cx = (rx << 5) | lx, cz = (rz << 5) | lz;
    out.set(localKey(cx, cz), { dim, cx, cz, rev, pal, enc: enc as 0 | 1, data, ents });
  }
  if (o !== end) throw new FormatError('corrupt', 'bytes left after the last entry');
  return out;
}
