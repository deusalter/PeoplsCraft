// What a save holds, and the one way it is written: Storage.commit of a Batch, all of it or none.
// The disk and IndexedDB stores belong to their hosts; MemStorage here serves tests.
//
// Three rules bind every caller:
//  1. `commit` is only ever called with the whole of `sim.takeDirty()`. Nothing writes one record by itself.
//  2. A record leaves memory only when it is not `unsaved`, and `loadPlayer` / `loadChunk` are called only for
//     keys that are not in memory: no read returns a version older than one still on its way to the store.
//  3. A failed commit is not merged later: every record of it is dirty again and the next save takes them afresh.
import type { Item } from '../data/items';
import type { SharedState } from './sim';
import type { BlockEnt } from './voxels';

export interface WorldRecord {
  format: 2;
  id: string; name: string; seed: number; seedText: string; created: number; played: number;
  /** Record id that a local transport always maps to (solo), null on a server. */
  owner: string | null;
  /** Block-key tables; a chunk record's `pal` indexes this. */
  palettes: string[][];
  /** Known players: unique names. */
  names: Record<string, { name: string; seen: number }>;
  state: SharedState;
}
export interface PlayerRecord {
  v: 1; id: string; name: string; seen: number;
  dim: number; pos: { x: number; y: number; z: number; yaw: number; pitch: number };
  inv: unknown;      // Inventory.serialize()
  stats: unknown;    // PlayerStats.serialize()
  bed: [number, number, number] | null;
  deathAt: [number, number, number, number] | null;
  portalReturn: Record<number, [number, number, number]>;
  safe: [number, number, number];
  arriving: number; pendingBed: boolean; recallT: number;
  modes: { creative: boolean; hidden: boolean; god: boolean; fly: boolean };
  mail: Item[];
}
/** One chunk's edits. `data` is `packSparse` of the edited cells (enc 0) or `packFull` of the whole array (enc 1),
 *  the bytes of net/codec.ts; block ids are those of palette `pal`. A record with `rev` 0 holds entities only. */
export interface ChunkRecord {
  dim: number; cx: number; cz: number; rev: number; pal: number;
  enc: 0 | 1;
  data: Uint8Array;
  ents: BlockEnt[];
}
/** What one save writes: every record that changed, copied at one instant between two steps. */
export interface Batch { world?: WorldRecord; players: PlayerRecord[]; chunks: ChunkRecord[] }

export type StorageCode = 'corrupt' | 'full' | 'locked' | 'io' | 'version';
export class StorageError extends Error {
  constructor(readonly code: StorageCode, msg: string) { super(msg); this.name = 'StorageError'; }
}

export interface Storage {
  /** Opens (and migrates) the world. Null = nothing saved yet. */
  open(): Promise<WorldRecord | null>;
  loadPlayer(id: string): Promise<PlayerRecord | null>;
  loadChunk(dim: number, cx: number, cz: number): Promise<ChunkRecord | null>;
  /** One save: all of the batch or none of it. Resolves when durable; rejects with a StorageError. */
  commit(batch: Batch): Promise<void>;
  close(): Promise<void>;
}

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const copyChunk = (c: ChunkRecord): ChunkRecord => ({ dim: c.dim, cx: c.cx, cz: c.cz, rev: c.rev, pal: c.pal, enc: c.enc, data: c.data.slice(), ents: plain(c.ents) });

/** A store in memory. What it hands out and what it keeps never share an object, as with a real store. */
export class MemStorage implements Storage {
  world: WorldRecord | null = null;
  readonly players = new Map<string, PlayerRecord>();
  readonly chunks = new Map<string, ChunkRecord>();
  /** Commits that resolved, and loads that were asked for. */
  commits = 0; loads = 0;
  /** The next commit rejects with this and writes nothing. */
  failNext: StorageError | null = null;

  constructor(world: WorldRecord | null = null) { this.world = world ? plain(world) : null; }

  async open(): Promise<WorldRecord | null> { return this.world ? plain(this.world) : null; }
  async loadPlayer(id: string): Promise<PlayerRecord | null> { this.loads++; const r = this.players.get(id); return r ? plain(r) : null; }
  async loadChunk(dim: number, cx: number, cz: number): Promise<ChunkRecord | null> { this.loads++; const r = this.chunks.get(`${dim},${cx},${cz}`); return r ? copyChunk(r) : null; }
  async commit(batch: Batch): Promise<void> {
    const fail = this.failNext;
    if (fail) { this.failNext = null; throw fail; }
    if (batch.world) this.world = plain(batch.world);
    for (const p of batch.players) this.players.set(p.id, plain(p));
    for (const c of batch.chunks) this.chunks.set(`${c.dim},${c.cx},${c.cz}`, copyChunk(c));
    this.commits++;
  }
  async close(): Promise<void> {}
}
