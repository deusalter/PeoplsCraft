// The block store as the simulation, the client and bots see it, and the simulation's own store:
// the sim chunks round the players, and the edit maps that are saved and sent.
import { BUILD_MAX, CH, CVOL, chunkKey } from '../core/constants';
import { BLOCKS, T_EMITS, T_OPAQUE } from '../data/blocks';
import { DIMS } from '../data/dims';
import { packFull, packSparse, unpackFull, unpackSparse } from '../net/codec';
import type { ChunkSource, GenResult } from './chunksource';
import { ApproxLight, type LightField } from './light';
import { currentPalette, paletteMap } from './migrate';
import type { RealmStore } from './realm';
import type { ChunkRecord, Storage } from './storage';

export interface VoxelRead {
  /** 0 outside 0..CH-1 and where no data is loaded. */
  getBlock(x: number, y: number, z: number): number;
  /** True when the column's chunk has its generation and its edit set. Bodies freeze where this is false. */
  ready(x: number, z: number): boolean;
  /** Highest non-air y in the column, -1 when not ready. */
  topY(x: number, z: number): number;
  biomeAt(x: number, z: number): number;
}
export interface VoxelWrite extends VoxelRead {
  /** False when y is outside 1..BUILD_MAX, the chunk is not ready, or the id is unchanged.
   *  `silent` keeps the block entity in the cell and skips onBlockChange (doors, furnace lit state, water seep). */
  setBlock(x: number, y: number, z: number, id: number, silent?: boolean): boolean;
}
export interface BlockEnt { x: number; y: number; z: number; kind: string; data: any }
export interface BlockEnts {
  getEnt(x: number, y: number, z: number): BlockEnt | null;
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null;
  removeEnt(x: number, y: number, z: number): void;
}

/** Cell index inside a chunk: ((z & 15) << 4 | (x & 15)) << 8 | y  (same as core/constants.ts `ci`). */
export interface ChunkEdits {
  dim: number; cx: number; cz: number;
  /** +1 for every cell change. 0 = never edited. */
  rev: number;
  /** Sparse form: cell index -> block id. Null when `full` is set. */
  cells: Map<number, number> | null;
  /** Dense form (migration of rewritten chunks, or more than 16,384 edited cells): the whole block array. */
  full: Uint8Array | null;
  /** Stored block entities (opened chests, forges, player containers). */
  ents: Map<number, BlockEnt>;
  /** FNV-1a hash of the generated (pre-edit) blocks, 0 until this process has generated the chunk. */
  genHash: number;
  /** Changed since the last takeDirty. */
  dirty: boolean;
  /** Changed since the last resolved commit that held it (dirty, or taken by a commit still in flight). */
  unsaved: boolean;
  /** The `ce` payload for the current `rev`, encoded once and shared by every subscriber. */
  wire: { rev: number; enc: 0 | 1; data: string } | null;
}
export interface EditStore {
  /** Returns the in-memory ChunkEdits if there is one, else loads from Storage; one promise per chunk. */
  load(dim: number, cx: number, cz: number): Promise<ChunkEdits>;
  peek(dim: number, cx: number, cz: number): ChunkEdits | null;
  /** Mark dirty and unsaved. The ONLY thing that does; mutating `ent.data` without it saves nothing. */
  touch(e: ChunkEdits): void;
  /** Drop from memory. Refused (kept, retried later) while the chunk is subscribed, a sim chunk, or `unsaved`:
   *  nothing is ever reloaded from Storage while a newer version of it is still on its way there. */
  release(dim: number, cx: number, cz: number): void;
}
export interface SimChunk {
  cx: number; cz: number; key: number;
  state: 0 | 1 | 2;                 // 0 wanted, 1 generating or loading edits, 2 ready
  blocks: Uint8Array | null; biomes: Uint8Array | null;
  top: Uint8Array;                  // highest non-air y per column
  sky: Uint8Array;                  // highest T_OPAQUE y per column
  edits: ChunkEdits | null;
  idleT: number;                    // seconds outside SIM_KEEP of every player
}

/** Chunks round a player (Chebyshev) that the sim holds whole, and how far out they are kept. */
export const SIM_RADIUS = 5, SIM_KEEP = 7;
/** Seconds a sim chunk outside SIM_KEEP of every player is kept before it is dropped. */
export const SIM_DROP_AFTER = 10;
/** An edit map with more cells than this is held as the whole block array. */
export const DENSE_AT = 16384;

export const cellOf = (x: number, y: number, z: number): number => ((((z & 15) << 4) | (x & 15)) << 8) | y;
const editKey = (dim: number, cx: number, cz: number): string => `${dim},${cx},${cz}`;

export function newEdits(dim: number, cx: number, cz: number): ChunkEdits {
  return { dim, cx, cz, rev: 0, cells: new Map(), full: null, ents: new Map(), genHash: 0, dirty: false, unsaved: false, wire: null };
}

// ---- edit maps --------------------------------------------------------------------------------

/** The edit maps in memory, loaded from a Storage and taken back to it by full commits. */
export class EditMaps implements EditStore {
  private map = new Map<string, ChunkEdits>();
  private loading = new Map<string, Promise<ChunkEdits>>();
  /** Releases that were refused, tried again whenever something may have let go. */
  private refused = new Set<string>();
  private holds: ((dim: number, cx: number, cz: number) => boolean)[] = [];
  /** Changes made to each map, and the count a commit took it at. */
  private ver = new WeakMap<ChunkEdits, number>();
  private taken = new WeakMap<ChunkRecord, number>();
  /** Index of the block table current ids belong to, in the world's `palettes`. */
  readonly pal: number;
  private remap: Map<number, Uint8Array | null> = new Map();

  /** `palettes` is the world record's list: the current block table is added to it when it is not the last one. */
  constructor(private storage: Storage, private palettes: string[][]) { this.pal = currentPalette(palettes); }

  get size(): number { return this.map.size; }
  get loads(): number { return this.loading.size; }
  values(): IterableIterator<ChunkEdits> { return this.map.values(); }

  /** Something else that keeps an edit map in memory (a sim chunk, a subscription): asked by `release`. */
  hold(by: (dim: number, cx: number, cz: number) => boolean): void { this.holds.push(by); }

  load(dim: number, cx: number, cz: number): Promise<ChunkEdits> {
    const k = editKey(dim, cx, cz), have = this.map.get(k);
    if (have) return Promise.resolve(have);
    let p = this.loading.get(k);
    if (p) return p;
    p = this.storage.loadChunk(dim, cx, cz).then((rec) => {
      this.loading.delete(k);
      const e = rec ? this.fromRecord(rec, dim, cx, cz) : newEdits(dim, cx, cz);
      this.map.set(k, e);
      return e;
    }, (err) => { this.loading.delete(k); throw err; });
    this.loading.set(k, p);
    return p;
  }
  peek(dim: number, cx: number, cz: number): ChunkEdits | null { return this.map.get(editKey(dim, cx, cz)) ?? null; }
  touch(e: ChunkEdits): void { e.dirty = true; e.unsaved = true; this.ver.set(e, (this.ver.get(e) ?? 0) + 1); }
  release(dim: number, cx: number, cz: number): void {
    const k = editKey(dim, cx, cz), e = this.map.get(k);
    if (!e) { this.refused.delete(k); return; }
    if (e.unsaved || this.holds.some((h) => h(dim, cx, cz))) { this.refused.add(k); return; }
    this.map.delete(k); this.refused.delete(k);
  }
  /** Try every refused release again. */
  sweep(): void { for (const k of [...this.refused]) { const e = this.map.get(k); if (e) this.release(e.dim, e.cx, e.cz); else this.refused.delete(k); } }
  /** Settles when every load issued so far has (the manual clock waits for this before a step). */
  async idle(): Promise<void> { while (this.loading.size) await Promise.allSettled([...this.loading.values()]); }

  /** Detached records of every dirty map, as one commit holds them. The maps stay `unsaved` until `committed`. */
  take(all = false): ChunkRecord[] {
    const out: ChunkRecord[] = [];
    for (const e of this.map.values()) {
      if (!e.dirty && !(all && (e.rev > 0 || e.ents.size))) continue;
      const r = this.toRecord(e);
      e.dirty = false;
      this.taken.set(r, this.ver.get(e) ?? 0);
      out.push(r);
    }
    return out;
  }
  /** The commit of these records resolved. ok: those not changed since are durable. Not ok: all are dirty again. */
  committed(recs: readonly ChunkRecord[], ok: boolean): void {
    for (const r of recs) {
      const e = this.map.get(editKey(r.dim, r.cx, r.cz));
      if (!e) continue;
      if (!ok) { e.dirty = true; e.unsaved = true; continue; }
      if (!e.dirty && this.taken.get(r) === (this.ver.get(e) ?? 0)) e.unsaved = false;
    }
    this.sweep();
  }

  toRecord(e: ChunkEdits): ChunkRecord {
    const ents = [...e.ents.values()].map((q) => ({ x: q.x, y: q.y, z: q.z, kind: q.kind, data: q.data == null ? q.data : JSON.parse(JSON.stringify(q.data)) }));
    return e.full
      ? { dim: e.dim, cx: e.cx, cz: e.cz, rev: e.rev, pal: this.pal, enc: 1, data: packFull(e.full), ents }
      : { dim: e.dim, cx: e.cx, cz: e.cz, rev: e.rev, pal: this.pal, enc: 0, data: packSparse(e.cells ?? new Map()), ents };
  }
  private fromRecord(rec: ChunkRecord, dim: number, cx: number, cz: number): ChunkEdits {
    const e = newEdits(dim, cx, cz), map = this.mapFor(rec.pal);
    e.rev = rec.rev;
    if (rec.enc === 1) {
      const full = unpackFull(rec.data);
      if (full) { if (map) for (let i = 0; i < full.length; i++) full[i] = map[full[i]]; e.full = full; e.cells = null; }
    } else {
      const cells = e.cells!;
      unpackSparse(rec.data, map ? (i, id) => cells.set(i, map[id]) : (i, id) => cells.set(i, id));
    }
    for (const q of rec.ents) e.ents.set(cellOf(q.x, q.y, q.z), q);
    // written under an older block table: it is saved again in the current one
    if (map) this.touch(e);
    return e;
  }
  private mapFor(pal: number): Uint8Array | null {
    if (pal === this.pal) return null;
    let m = this.remap.get(pal);
    if (m === undefined) { m = paletteMap(this.palettes[pal] ?? null); this.remap.set(pal, m); }
    return m;
  }
}

// ---- sim chunks -------------------------------------------------------------------------------

interface Chunk extends SimChunk {
  /** Every block entity of the chunk: the stored ones (the same objects as `edits.ents`) and those the generator made. */
  ents: Map<number, BlockEnt>;
  /** Cells holding a block that emits light. */
  emit: Set<number>;
  gen: GenResult | null;
  /** Chebyshev distance to the nearest player at the last update. */
  dist: number;
}

/** The chunks a realm holds whole, near its players: the block store a Realm runs on. */
export class SimChunks implements RealmStore, LightField {
  readonly map = new Map<number, Chunk>();
  readonly light: ApproxLight;
  onChange: ((x: number, y: number, z: number, old: number, now: number) => void) | null = null;
  /** Before a non-silent change takes a cell's block or entity away: the realm closes the windows on it. */
  onClose: ((x: number, y: number, z: number) => void) | null = null;
  /** After every change of a cell: the realm drops the gate entries that hold it. */
  onCell: ((x: number, y: number, z: number) => void) | null = null;
  /** Every change of a cell, with the chunk's new revision: the chunk service queues it for subscribers. */
  onEdit: ((x: number, y: number, z: number, id: number, rev: number) => void) | null = null;
  /** A chunk was generated in this process for the first time: its hash, for subscribers whose `ce` went out without it. */
  onGen: ((cx: number, cz: number, hash: number) => void) | null = null;
  private last: Chunk | null = null;

  constructor(readonly dim: number, private source: ChunkSource, readonly edits: EditMaps) {
    this.light = new ApproxLight(this, DIMS[dim]?.hasSky ?? true);
    edits.hold((d, cx, cz) => d === dim && this.map.has(chunkKey(cx, cz)));
  }

  chunk(cx: number, cz: number): SimChunk | null { return this.at(cx, cz); }
  private at(cx: number, cz: number): Chunk | null {
    const l = this.last;
    if (l && l.cx === cx && l.cz === cz) return l;
    const c = this.map.get(chunkKey(cx, cz)) ?? null;
    if (c) this.last = c;
    return c;
  }
  private readyAt(x: number, z: number): Chunk | null { const c = this.at(x >> 4, z >> 4); return c && c.state === 2 ? c : null; }

  /** Once a second: want every chunk within SIM_RADIUS of a player, nearest first; drop those outside SIM_KEEP of all for 10 s. */
  update(players: readonly { body: { x: number; z: number } }[], dt = 1): void {
    const at = players.map((p) => [Math.floor(p.body.x) >> 4, Math.floor(p.body.z) >> 4]);
    const near = (cx: number, cz: number): number => { let d = Infinity; for (const [px, pz] of at) d = Math.min(d, Math.max(Math.abs(cx - px), Math.abs(cz - pz))); return d; };
    let gone: Chunk[] | null = null;
    for (const c of this.map.values()) {
      c.dist = near(c.cx, c.cz);
      if (c.dist <= SIM_KEEP) c.idleT = 0;
      else if ((c.idleT += dt) >= SIM_DROP_AFTER) (gone ??= []).push(c);
    }
    if (gone) for (const c of gone) this.drop(c);
    const want: [number, number, number][] = [];
    for (const [px, pz] of at) for (let dz = -SIM_RADIUS; dz <= SIM_RADIUS; dz++) for (let dx = -SIM_RADIUS; dx <= SIM_RADIUS; dx++) {
      const cx = px + dx, cz = pz + dz, k = chunkKey(cx, cz);
      if (this.map.has(k)) continue;
      const c: Chunk = { cx, cz, key: k, state: 0, blocks: null, biomes: null, top: new Uint8Array(256), sky: new Uint8Array(256), edits: null, idleT: 0,
        ents: new Map(), emit: new Set(), gen: null, dist: near(cx, cz) };
      this.map.set(k, c);
      want.push([c.dist, cx, cz]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const [d, cx, cz] of want) this.want(this.map.get(chunkKey(cx, cz))!, d);
  }
  private want(c: Chunk, prio: number): void {
    c.state = 1;
    this.source.request(this.dim, c.cx, c.cz, prio);
    this.edits.load(this.dim, c.cx, c.cz).then((e) => { if (this.map.get(c.key) === c) c.edits = e; }, () => { if (this.map.get(c.key) === c) this.map.delete(c.key); });
  }
  private drop(c: Chunk): void {
    if (c.state !== 2) this.source.cancel(this.dim, c.cx, c.cz);
    this.map.delete(c.key);
    if (this.last === c) this.last = null;
    this.edits.release(this.dim, c.cx, c.cz);
  }
  /** Every chunk goes (the realm is empty). Edit maps stay in memory while they are unsaved. */
  clear(): void { for (const c of [...this.map.values()]) this.drop(c); }

  /** A finished generation job of this realm. It waits here until its edit map has loaded too. */
  arrived(g: GenResult): void {
    const c = this.at(g.cx, g.cz);
    if (c && c.state === 1) c.gen = g;
  }
  /** Integrate up to `max` chunks whose generation and edit map have both arrived, nearest first. The count done. */
  integrateReady(max: number): number {
    let n = 0;
    while (n < max) {
      let best: Chunk | null = null;
      for (const c of this.map.values()) if (c.state === 1 && c.gen && c.edits && (!best || c.dist < best.dist)) best = c;
      if (!best) break;
      this.integrate(best.gen!, best.edits!);
      n++;
    }
    return n;
  }
  /** Generated blocks with the edit map on top, the heightmaps, and the block entities by the generator-entity rule (3.2). */
  integrate(gen: GenResult, edits: ChunkEdits): SimChunk {
    let c = this.at(gen.cx, gen.cz);
    if (!c) {
      c = { cx: gen.cx, cz: gen.cz, key: chunkKey(gen.cx, gen.cz), state: 1, blocks: null, biomes: null, top: new Uint8Array(256), sky: new Uint8Array(256),
        edits: null, idleT: 0, ents: new Map(), emit: new Set(), gen: null, dist: 0 };
      this.map.set(c.key, c);
    }
    const b = gen.blocks.slice(), first = !edits.genHash;
    edits.genHash = gen.hash;
    if (edits.full) b.set(edits.full);
    else if (edits.cells) for (const [i, id] of edits.cells) b[i] = id;
    c.blocks = b; c.biomes = gen.biomes; c.edits = edits; c.gen = null;
    // the heightmaps, from the top of each column down to its first opaque block
    const top = c.top, sky = c.sky, emit = c.emit, lit = gen.emit;
    for (let col = 0; col < 256; col++) {
      const base = col << 8;
      let t = 0, s = 0;
      for (let y = CH - 1; y >= 0; y--) {
        const id = b[base + y];
        if (id === 0) continue;
        if (t === 0 && y < CH - 1) t = y;
        if (T_OPAQUE[id]) { s = y; break; }
      }
      top[col] = t; sky[col] = s;
    }
    // the cells that give light: those the source listed that an edit has not put out, and those an edit lit;
    // without a list, or with the edits as a whole array, every cell is asked
    emit.clear();
    if (lit && edits.cells) {
      for (let k = 0; k < lit.length; k++) if (T_EMITS[b[lit[k]]]) emit.add(lit[k]);
      for (const [i, id] of edits.cells) if (T_EMITS[id]) emit.add(i);
    } else for (let i = 0; i < CVOL; i++) if (T_EMITS[b[i]]) emit.add(i);
    c.ents.clear();
    for (const [i, e] of edits.ents) c.ents.set(i, e);
    for (const e of gen.ents) {
      const i = cellOf(e.x, e.y, e.z);
      if (edits.ents.has(i)) continue;
      if (edits.full || edits.cells?.has(i)) continue;
      // a structure stamped later can overwrite the block (overlapping dungeon rooms): do not keep its entity
      if (BLOCKS[b[i]].use !== e.kind) continue;
      c.ents.set(i, { x: e.x, y: e.y, z: e.z, kind: e.kind, data: e.kind === 'nest' ? { mob: e.data, t: 0 } : { loot: e.data, s: null } });
    }
    c.state = 2;
    if (first && this.onGen) this.onGen(c.cx, c.cz, gen.hash);
    return c;
  }
  private column(c: Chunk, col: number): void {
    const b = c.blocks!, base = col << 8;
    let top = 0, sky = 0;
    for (let y = CH - 2; y > 0; y--) if (b[base + y] !== 0) { top = y; break; }
    for (let y = CH - 1; y >= 0; y--) if (T_OPAQUE[b[base + y]]) { sky = y; break; }
    c.top[col] = top; c.sky[col] = sky;
  }

  // ---- VoxelRead ----
  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= CH) return 0;
    const c = this.at(x >> 4, z >> 4);
    return c && c.blocks ? c.blocks[cellOf(x, y, z)] : 0;
  }
  ready(x: number, z: number): boolean { return !!this.readyAt(x, z); }
  topY(x: number, z: number): number { const c = this.readyAt(x, z); return c ? c.top[((z & 15) << 4) | (x & 15)] : -1; }
  biomeAt(x: number, z: number): number { const c = this.at(x >> 4, z >> 4); return c && c.biomes ? c.biomes[((z & 15) << 4) | (x & 15)] : 0; }
  areaReady(x: number, z: number, r: number): boolean {
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const c = this.at(cx + dx, cz + dz); if (!c || c.state !== 2) return false; }
    return true;
  }

  // ---- VoxelWrite: 3.2, in its order ----
  setBlock(x: number, y: number, z: number, id: number, silent = false): boolean {
    if (y < 1 || y > BUILD_MAX) return false;
    const c = this.readyAt(x, z);
    if (!c) return false;
    const i = cellOf(x, y, z), b = c.blocks!, old = b[i], e = c.edits!;
    if (old === id) return false;
    b[i] = id;
    if (e.full) e.full[i] = id;
    else {
      e.cells!.set(i, id);
      if (e.cells!.size > DENSE_AT) this.densify(c);
    }
    e.rev++;
    if (!silent) {
      if (this.onClose) this.onClose(x, y, z);
      if (c.ents.delete(i)) e.ents.delete(i);
    }
    const col = ((z & 15) << 4) | (x & 15);
    if (id !== 0 ? y > c.top[col] : y === c.top[col]) this.column(c, col);
    else if (T_OPAQUE[id] ? y > c.sky[col] : y === c.sky[col]) this.column(c, col);
    if (T_EMITS[old]) c.emit.delete(i);
    if (T_EMITS[id]) c.emit.add(i);
    this.edits.touch(e);
    if (this.onEdit) this.onEdit(x, y, z, id, e.rev);
    if (this.onCell) this.onCell(x, y, z);
    if (!silent && this.onChange) this.onChange(x, y, z, old, id);
    return true;
  }
  /** The sparse map is past DENSE_AT: from now on it is the whole array. The dense form cannot say which cells were
   *  edited, so every generator entity still only in memory is stored first, or it would not come back at a reload. */
  private densify(c: Chunk): void {
    const e = c.edits!;
    for (const [i, q] of c.ents) if (!e.ents.has(i)) e.ents.set(i, q);
    e.full = c.blocks!.slice(); e.cells = null;
  }

  // ---- BlockEnts ----
  getEnt(x: number, y: number, z: number): BlockEnt | null { const c = this.readyAt(x, z); return (c && c.ents.get(cellOf(x, y, z))) || null; }
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null {
    const c = this.readyAt(x, z);
    if (!c) return null;
    const i = cellOf(x, y, z), q: BlockEnt = { x, y, z, kind, data };
    c.ents.set(i, q); c.edits!.ents.set(i, q);
    this.edits.touch(c.edits!);
    return q;
  }
  removeEnt(x: number, y: number, z: number): void {
    const c = this.readyAt(x, z), i = cellOf(x, y, z);
    if (!c || !c.ents.has(i)) return;
    if (this.onClose) this.onClose(x, y, z);
    c.ents.delete(i); c.edits!.ents.delete(i);
    this.edits.touch(c.edits!);
  }
  /** The contents of this entity changed: it becomes a stored one if it was the generator's, and its chunk is saved. */
  touch(q: BlockEnt): void {
    const c = this.readyAt(q.x, q.z);
    if (!c) return;
    const i = cellOf(q.x, q.y, q.z), e = c.edits!;
    if (c.ents.get(i) !== q) return;
    if (!e.ents.has(i)) e.ents.set(i, q);
    this.edits.touch(e);
  }
  chunkEnts(cx: number, cz: number): Iterable<BlockEnt> | null { const c = this.at(cx, cz); return c && c.state === 2 && c.ents.size ? c.ents.values() : null; }

  // ---- light (7.8) ----
  sky(x: number, y: number, z: number): number { return this.light.sky(x, y, z); }
  block(x: number, y: number, z: number): number { return this.light.block(x, y, z); }
  skyHeight(x: number, z: number): number { const c = this.readyAt(x, z); return c ? c.sky[((z & 15) << 4) | (x & 15)] : -1; }
  emitters(cx: number, cz: number): Iterable<number> | null { const c = this.at(cx, cz); return c && c.state === 2 && c.emit.size ? c.emit : null; }
  blockAtCell(cx: number, cz: number, i: number): number { const c = this.at(cx, cz); return c && c.blocks ? c.blocks[i] : 0; }
}

/** Step 2 of a sim step (6.1): finished jobs to their realms, then at most `max` chunks integrated across them. */
export function pumpChunks(source: ChunkSource, realms: readonly (SimChunks | null)[], maxJobs: number, budgetMs: number, max = 2): number {
  for (const g of source.poll(maxJobs, budgetMs)) { const s = realms[g.dim]; if (s) s.arrived(g); }
  let n = 0;
  for (const s of realms) if (s && n < max) n += s.integrateReady(max - n);
  return n;
}
