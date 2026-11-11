// Run-length coding of a chunk's block array, as value and count byte pairs: the form saved chunks are stored in.

let scratch = new Uint8Array(0);   // worst case is two bytes per cell
export function rle(a: Uint8Array): Uint8Array {
  if (scratch.length < a.length * 2) scratch = new Uint8Array(a.length * 2);
  const out = scratch;
  let o = 0;
  for (let i = 0; i < a.length;) { const v = a[i]; let n = 1; while (n < 255 && i + n < a.length && a[i + n] === v) n++; out[o++] = v; out[o++] = n; i += n; }
  return out.slice(0, o);
}
export function unrle(a: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size);
  let o = 0;
  for (let i = 0; i + 1 < a.length && o < size; i += 2) { out.fill(a[i], o, Math.min(size, o + a[i + 1])); o += a[i + 1]; }
  return out;
}
