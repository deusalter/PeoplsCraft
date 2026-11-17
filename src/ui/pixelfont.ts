// The kit's hand-drawn text face (src/ui/kit/font) as a real font, so that DOM text (labels, typed names, the world
// list) is drawn in the same letters as the kit's canvases. The glyphs are read from the kit's sheets and written into
// a TrueType file in memory: each run of ink is a square-cornered contour on a grid of 100 font units to the pixel, so
// at a font size of 10px (or 10px under an integer zoom) every stroke falls on whole device pixels.
import { TEXT } from './kit/font/face';

export const PIXEL_FAMILY = 'Peopls Text';

const P = 100;            // font units to one unit of the face
const ROWS = 10;          // rows in a cell
const BASE = 8;           // rows above the baseline (the baseline is under row 7)
const EM = ROWS * P;

/** The same characters as the face, plus what the face itself reads as one of them. */
const ALIASES: Record<string, string> = { '’': "'", '‘': "'", '“': '"', '”': '"', '−': '-', ' ': ' ' };

interface G { code: number[]; adv: number; rects: [number, number, number, number][] }

/** Square runs of a glyph's ink, merged down the rows where a run repeats: [x0, y0, x1, y1] in font units, y up. */
function rectsOf(cells: Int8Array, w: number, h: number, rise: number): [number, number, number, number][] {
  const runs: { x0: number; x1: number; r0: number; r1: number }[] = [];
  let open: typeof runs = [];
  for (let r = 0; r < h; r++) {
    const row: { x0: number; x1: number }[] = [];
    for (let x = 0; x < w;) {
      if (cells[r * w + x] < 0) { x++; continue; }
      const x0 = x;
      while (x < w && cells[r * w + x] >= 0) x++;
      row.push({ x0, x1: x });
    }
    const next: typeof runs = [];
    for (const s of row) {
      const o = open.find((q) => q.x0 === s.x0 && q.x1 === s.x1 && q.r1 === r);
      if (o) { o.r1 = r + 1; next.push(o); } else { const n = { ...s, r0: r, r1: r + 1 }; runs.push(n); next.push(n); }
    }
    open = next;
  }
  // row r of the cell (0 at the top) spans y from (BASE - 1 - r) to (BASE - r); a raised glyph's rows start one higher
  return runs.map((q) => [q.x0 * P, (BASE - (q.r1 - rise)) * P, q.x1 * P, (BASE - (q.r0 - rise)) * P]);
}

function glyphList(): G[] {
  const out: G[] = [];
  // .notdef: the face's tofu
  const tofu = TEXT.tofu;
  out.push({ code: [], adv: (tofu.w + TEXT.gap) * P, rects: tofu.map ? rectsOf(tofu.map.cells, tofu.map.w, tofu.map.h, 0) : [] });
  const byChar = new Map<string, G>();
  for (const [ch, g] of TEXT.glyphs) {
    if ([...ch].length !== 1) continue;
    const e: G = { code: [ch.codePointAt(0)!], adv: (g.w + TEXT.gap) * P, rects: g.map ? rectsOf(g.map.cells, g.map.w, g.map.h, g.rise ?? 0) : [] };
    byChar.set(ch, e);
    out.push(e);
  }
  for (const [from, to] of Object.entries(ALIASES)) byChar.get(to)?.code.push(from.codePointAt(0)!);
  return out;
}

// ---- writing the file

class Buf {
  b: number[] = [];
  u8(v: number) { this.b.push(v & 255); }
  u16(v: number) { this.u8(v >> 8); this.u8(v); }
  i16(v: number) { this.u16(v < 0 ? v + 65536 : v); }
  u32(v: number) { this.u16((v >>> 16) & 0xffff); this.u16(v & 0xffff); }
  tag(s: string) { for (let i = 0; i < 4; i++) this.u8(s.charCodeAt(i)); }
  pad4() { while (this.b.length % 4) this.u8(0); }
  get length() { return this.b.length; }
}

function checksum(bytes: number[]): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 4) sum = (sum + ((bytes[i] << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0))) >>> 0;
  return sum;
}

function searchParams(n: number, unit: number): [number, number, number] {
  let p = 1, e = 0;
  while (p * 2 <= n) { p *= 2; e++; }
  return [p * unit, e, n * unit - p * unit];
}

export function buildFont(): ArrayBuffer {
  const glyphs = glyphList();
  const n = glyphs.length;

  // glyf and loca
  const glyf = new Buf(), loca: number[] = [];
  let xMin = 0, yMin = 0, xMax = 0, yMax = 0, maxPts = 0, maxCtr = 0;
  for (const g of glyphs) {
    loca.push(glyf.length);
    if (!g.rects.length) continue;
    const bx0 = Math.min(...g.rects.map((r) => r[0])), by0 = Math.min(...g.rects.map((r) => r[1]));
    const bx1 = Math.max(...g.rects.map((r) => r[2])), by1 = Math.max(...g.rects.map((r) => r[3]));
    xMin = Math.min(xMin, bx0); yMin = Math.min(yMin, by0); xMax = Math.max(xMax, bx1); yMax = Math.max(yMax, by1);
    maxPts = Math.max(maxPts, g.rects.length * 4); maxCtr = Math.max(maxCtr, g.rects.length);
    glyf.i16(g.rects.length); glyf.i16(bx0); glyf.i16(by0); glyf.i16(bx1); glyf.i16(by1);
    g.rects.forEach((_, i) => glyf.u16(i * 4 + 3));
    glyf.u16(0); // no instructions
    const pts: [number, number][] = [];
    // clockwise with y up: bottom left, top left, top right, bottom right
    for (const [x0, y0, x1, y1] of g.rects) pts.push([x0, y0], [x0, y1], [x1, y1], [x1, y0]);
    for (let i = 0; i < pts.length; i++) glyf.u8(1);
    let px = 0, py = 0;
    for (const [x] of pts) { glyf.i16(x - px); px = x; }
    for (const [, y] of pts) { glyf.i16(y - py); py = y; }
    glyf.pad4();
  }
  loca.push(glyf.length);
  const locaB = new Buf();
  for (const o of loca) locaB.u32(o);

  const advMax = Math.max(...glyphs.map((g) => g.adv));
  const head = new Buf();
  head.u32(0x00010000); head.u32(0x00010000); head.u32(0); head.u32(0x5f0f3cf5);
  head.u16(0x000b); head.u16(EM);
  head.u32(0); head.u32(0); head.u32(0); head.u32(0);
  head.i16(xMin); head.i16(yMin); head.i16(xMax); head.i16(yMax);
  head.u16(0); head.u16(8); head.i16(2); head.i16(1); head.i16(0);

  const hhea = new Buf();
  hhea.u32(0x00010000); hhea.i16(BASE * P); hhea.i16(-(ROWS - BASE) * P); hhea.i16(0);
  hhea.u16(advMax); hhea.i16(0); hhea.i16(0); hhea.i16(xMax);
  hhea.i16(1); hhea.i16(0); hhea.i16(0);
  for (let i = 0; i < 4; i++) hhea.i16(0);
  hhea.i16(0); hhea.u16(n);

  const maxp = new Buf();
  maxp.u32(0x00010000); maxp.u16(n); maxp.u16(maxPts); maxp.u16(maxCtr); maxp.u16(0); maxp.u16(0);
  // maxZones 2, then maxTwilightPoints .. maxComponentDepth
  maxp.u16(2); for (let i = 0; i < 8; i++) maxp.u16(0);

  const hmtx = new Buf();
  for (const g of glyphs) { hmtx.u16(g.adv); hmtx.i16(g.rects.length ? Math.min(...g.rects.map((r) => r[0])) : 0); }

  // cmap: format 4, one segment for each character, then the closing 0xFFFF
  const map: [number, number][] = [];
  glyphs.forEach((g, gi) => g.code.forEach((c) => { if (c <= 0xffff) map.push([c, gi]); }));
  map.sort((a, b) => a[0] - b[0]);
  const seg = map.length + 1;
  const sub = new Buf();
  const [sr, es, rs] = searchParams(seg, 2);
  sub.u16(4); sub.u16(16 + seg * 8); sub.u16(0); sub.u16(seg * 2); sub.u16(sr); sub.u16(es); sub.u16(rs);
  for (const [c] of map) sub.u16(c); sub.u16(0xffff);
  sub.u16(0);
  for (const [c] of map) sub.u16(c); sub.u16(0xffff);
  for (const [c, gi] of map) sub.u16((gi - c + 65536) % 65536); sub.u16(1);
  for (let i = 0; i < seg; i++) sub.u16(0);
  const cmap = new Buf();
  cmap.u16(0); cmap.u16(1); cmap.u16(3); cmap.u16(1); cmap.u32(12);
  cmap.b.push(...sub.b);

  const codes = map.map((m) => m[0]);
  const os2 = new Buf();
  os2.u16(4); os2.i16(Math.round(glyphs.reduce((a, g) => a + g.adv, 0) / n)); os2.u16(400); os2.u16(5); os2.u16(0);
  os2.i16(500); os2.i16(500); os2.i16(0); os2.i16(100); os2.i16(500); os2.i16(500); os2.i16(0); os2.i16(400);
  os2.i16(P); os2.i16(4 * P); os2.i16(0);
  for (let i = 0; i < 10; i++) os2.u8(0);
  os2.u32(1 | 2); os2.u32(0); os2.u32(0); os2.u32(0);
  os2.tag('NONE'); os2.u16(0x40); os2.u16(Math.min(...codes)); os2.u16(Math.min(0xffff, Math.max(...codes)));
  os2.i16(BASE * P); os2.i16(-(ROWS - BASE) * P); os2.i16(0);
  os2.u16(Math.max(yMax, BASE * P)); os2.u16(Math.max(-yMin, (ROWS - BASE) * P));
  os2.u32(1); os2.u32(0);
  os2.i16(5 * P); os2.i16(7 * P); os2.u16(0); os2.u16(32); os2.u16(1);

  const strs: [number, string][] = [[1, PIXEL_FAMILY], [2, 'Regular'], [3, PIXEL_FAMILY + ' Regular'], [4, PIXEL_FAMILY], [6, 'PeoplsText-Regular']];
  const name = new Buf(), data = new Buf();
  name.u16(0); name.u16(strs.length); name.u16(6 + strs.length * 12);
  for (const [id, s] of strs) {
    name.u16(3); name.u16(1); name.u16(0x409); name.u16(id); name.u16(s.length * 2); name.u16(data.length);
    for (const ch of s) data.u16(ch.charCodeAt(0));
  }
  name.b.push(...data.b);

  const post = new Buf();
  post.u32(0x00030000); post.u32(0); post.i16(-P); post.i16(P); post.u32(0);
  post.u32(0); post.u32(0); post.u32(0); post.u32(0);

  const tables: [string, Buf][] = [
    ['OS/2', os2], ['cmap', cmap], ['glyf', glyf], ['head', head], ['hhea', hhea], ['hmtx', hmtx], ['loca', locaB], ['maxp', maxp], ['name', name], ['post', post],
  ];
  tables.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const out = new Buf();
  const [tsr, tes, trs] = searchParams(tables.length, 16);
  out.u32(0x00010000); out.u16(tables.length); out.u16(tsr); out.u16(tes); out.u16(trs);
  let off = 12 + tables.length * 16;
  const placed: { tag: string; b: number[]; off: number }[] = [];
  for (const [tag, b] of tables) {
    const bytes = b.b.slice();
    placed.push({ tag, b: bytes, off });
    off += bytes.length + ((4 - (bytes.length % 4)) % 4);
  }
  for (const t of placed) { out.tag(t.tag); out.u32(checksum(t.b)); out.u32(t.off); out.u32(t.b.length); }
  for (const t of placed) { out.b.push(...t.b); out.pad4(); }
  const headAt = placed.find((t) => t.tag === 'head')!.off;
  const adj = (0xb1b0afba - checksum(out.b)) >>> 0;
  out.b[headAt + 8] = adj >>> 24; out.b[headAt + 9] = (adj >>> 16) & 255; out.b[headAt + 10] = (adj >>> 8) & 255; out.b[headAt + 11] = adj & 255;
  return new Uint8Array(out.b).buffer;
}

let loading: Promise<void> | null = null;
/** Registers the face with the document once; resolves when it can be drawn (or when the browser refused it). */
export function loadPixelFont(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const face = new FontFace(PIXEL_FAMILY, buildFont());
      await face.load();
      document.fonts.add(face);
    } catch (e) {
      console.warn('pixel font refused', e);
    }
  })();
  return loading;
}
