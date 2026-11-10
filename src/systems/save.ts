// IndexedDB persistence: one record per world, plus one per modified chunk (run-length encoded).
import type { SavedChunk } from '../world/world';

export interface WorldMeta { id: string; name: string; seed: number; seedText: string; created: number; played: number; data: any }
const DB = 'cairnlight', VER = 1;

let scratch = new Uint8Array(0);   // worst case is two bytes per cell
function rle(a: Uint8Array): Uint8Array {
  if (scratch.length < a.length * 2) scratch = new Uint8Array(a.length * 2);
  const out = scratch;
  let o = 0;
  for (let i = 0; i < a.length;) { const v = a[i]; let n = 1; while (n < 255 && i + n < a.length && a[i + n] === v) n++; out[o++] = v; out[o++] = n; i += n; }
  return out.slice(0, o);
}
function unrle(a: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size);
  let o = 0;
  for (let i = 0; i + 1 < a.length && o < size; i += 2) { out.fill(a[i], o, Math.min(size, o + a[i + 1])); o += a[i + 1]; }
  return out;
}
const req = <T>(r: IDBRequest<T>): Promise<T> => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export class SaveDB {
  private db: IDBDatabase | null = null;
  async open(): Promise<boolean> {
    try {
      this.db = await new Promise<IDBDatabase>((res, rej) => {
        const r = indexedDB.open(DB, VER);
        r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('worlds')) d.createObjectStore('worlds', { keyPath: 'id' }); if (!d.objectStoreNames.contains('chunks')) d.createObjectStore('chunks'); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return true;
    } catch (e) { console.warn('saving is unavailable', e); return false; }
  }
  private store(name: string, mode: IDBTransactionMode): IDBObjectStore { return this.db!.transaction(name, mode).objectStore(name); }
  async listWorlds(): Promise<WorldMeta[]> { if (!this.db) return []; const l = await req(this.store('worlds', 'readonly').getAll()); return (l as WorldMeta[]).sort((a, b) => b.played - a.played); }
  async putWorld(m: WorldMeta): Promise<void> { if (this.db) await req(this.store('worlds', 'readwrite').put(m)); }
  async deleteWorld(id: string): Promise<void> {
    if (!this.db) return;
    await req(this.store('worlds', 'readwrite').delete(id));
    await req(this.store('chunks', 'readwrite').delete(IDBKeyRange.bound(id + '|', id + '|￿')));
  }
  /** Chunk coordinates that have a saved copy in one dimension, as "cx,cz" pairs. */
  async chunkList(id: string, dim: number): Promise<[number, number][]> {
    if (!this.db) return [];
    const p = `${id}|${dim}|`, keys = await req(this.store('chunks', 'readonly').getAllKeys(IDBKeyRange.bound(p, p + '￿')));
    return (keys as string[]).map((k) => { const s = k.slice(p.length).split('|'); return [+s[0], +s[1]]; });
  }
  async getChunk(id: string, dim: number, cx: number, cz: number, size: number): Promise<SavedChunk | null> {
    if (!this.db) return null;
    const r = await req(this.store('chunks', 'readonly').get(`${id}|${dim}|${cx}|${cz}`));
    if (!r) return null;
    return { blocks: unrle(r.d, size), biomes: r.b, hasEmit: r.h, ents: r.e || [], pal: r.p ?? 0 };
  }
  putChunk(id: string, dim: number, cx: number, cz: number, c: SavedChunk): void {
    if (!this.db) return;
    try { this.store('chunks', 'readwrite').put({ d: rle(c.blocks), b: c.biomes, h: c.hasEmit, e: c.ents, p: c.pal ?? 0 }, `${id}|${dim}|${cx}|${cz}`); } catch (e) { console.warn('chunk save failed', e); }
  }
}
