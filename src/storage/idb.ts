// Solo saves in IndexedDB (8.2): database "cairnlight" version 2, one Storage per world, plus the world
// list and deletion for the title menu. Saves of the build before multiplayer are migrated on open (8.4).
//
// The database is reached through the few calls declared below, so the same code runs on a browser's
// IndexedDB and, in Node tests, on a stand-in.
import { CVOL } from '../core/constants';
import { genChunk } from '../sim/genjob';
import { type LegacyChunk, type LegacyWorld, currentPalette, diffLegacyChunk, paletteMap, splitLegacyWorld } from '../sim/migrate';
import { unrle } from '../sim/rle';
import { type Batch, type ChunkRecord, type PlayerRecord, type Storage, StorageError, type WorldRecord } from '../sim/storage';
import type { BlockEnt } from '../sim/voxels';

// The database keeps the project's working name so worlds saved before the rename still load.
export const DB_NAME = 'cairnlight', DB_VERSION = 2;
const STORES = ['worlds', 'players', 'edits', 'backup', 'chunks'] as const;

export interface IdbRequest<T = any> { result: T; error: any; onsuccess: ((ev: any) => void) | null; onerror: ((ev: any) => void) | null }
export interface IdbOpenRequest extends IdbRequest<IdbDatabase> { onupgradeneeded: ((ev: any) => void) | null; onblocked: ((ev: any) => void) | null }
export interface IdbStore {
  get(key: any): IdbRequest; put(value: any, key?: any): IdbRequest; delete(key: any): IdbRequest;
  getAll(query?: any): IdbRequest<any[]>; getAllKeys(query?: any): IdbRequest<any[]>;
}
export interface IdbTransaction { objectStore(name: string): IdbStore; oncomplete: ((ev: any) => void) | null; onerror: ((ev: any) => void) | null; onabort: ((ev: any) => void) | null; error: any; abort(): void }
export interface IdbDatabase {
  readonly version: number; objectStoreNames: { contains(name: string): boolean };
  createObjectStore(name: string, opt?: { keyPath?: string }): unknown;
  transaction(names: string | string[], mode: 'readonly' | 'readwrite'): IdbTransaction;
  close(): void; onversionchange: ((ev: any) => void) | null;
}
/** The IndexedDB entry points this file uses. */
export interface IdbEnv { open(name: string, version: number): IdbOpenRequest; bound(lo: string, hi: string): unknown; now(): number }

function browserEnv(): IdbEnv {
  const g = globalThis as any;
  return { open: (n, v) => g.indexedDB.open(n, v), bound: (lo, hi) => g.IDBKeyRange.bound(lo, hi), now: () => g.performance?.now() ?? 0 };
}

const fail = (e: any, what: string): StorageError => {
  if (e instanceof StorageError) return e;
  const name = e?.name ?? '';
  const code = name === 'QuotaExceededError' ? 'full' : name === 'VersionError' ? 'version' : 'io';
  return new StorageError(code, `${what}: ${e?.message ?? name ?? String(e)}`);
};
const req = <T>(r: IdbRequest<T>): Promise<T> => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = (t: IdbTransaction): Promise<void> => new Promise((res, rej) => {
  t.oncomplete = () => res();
  t.onerror = () => rej(t.error);
  t.onabort = () => rej(t.error ?? new StorageError('io', 'transaction aborted'));
});

/** An open refused because another tab holds the database at an older version and does not let go. The request
 *  stays queued in the browser: `through` settles when it finally goes through (its handle is then closed, since
 *  nobody is waiting for it) or fails. */
export class LockedError extends StorageError {
  constructor(readonly through: Promise<void>) { super('locked', 'Another tab holds this game open: close it to continue.'); }
}

/** Open (and if need be create or upgrade) the database. The upgrade creates stores and touches no data. */
export function openDb(env: IdbEnv = browserEnv()): Promise<IdbDatabase> {
  return new Promise((res, rej) => {
    let r: IdbOpenRequest;
    try { r = env.open(DB_NAME, DB_VERSION); } catch (e) { rej(fail(e, 'open')); return; }
    let refused: (() => void) | null = null;
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of STORES) if (!d.objectStoreNames.contains(s)) { if (s === 'worlds') d.createObjectStore(s, { keyPath: 'id' }); else d.createObjectStore(s); }
    };
    r.onblocked = () => { if (!refused) rej(new LockedError(new Promise((ok) => { refused = ok; }))); };
    r.onsuccess = () => {
      const d = r.result;
      if (refused) { d.close(); refused(); return; }
      // a newer build in another tab wants to upgrade: let it
      d.onversionchange = () => d.close();
      res(d);
    };
    r.onerror = () => { if (refused) refused(); else rej(fail(r.error, 'open')); };
  });
}

/** Whether this page can save: null when it can, else why not. An upgrade that another tab holds up is waited
 *  out, `onLocked` being told why first; the database is tried again once that tab has let go. */
export async function storageReady(onLocked: (msg: string) => void, env: IdbEnv = browserEnv()): Promise<StorageError | null> {
  for (;;) {
    try { (await openDb(env)).close(); return null; } catch (e) {
      if (!(e instanceof LockedError)) return fail(e, 'open');
      onLocked(e.message);
      await e.through;
    }
  }
}

/** One world in the title menu. */
export interface WorldSummary { id: string; name: string; seed: number; seedText: string; created: number; played: number; level: number; legacy: boolean }

const summaryOf = (w: any): WorldSummary => ({
  id: w.id, name: w.name, seed: w.seed, seedText: w.seedText, created: w.created, played: w.played,
  level: w.format ? (w.summary?.level ?? 1) : (w.data?.stats?.level ?? 1), legacy: !w.format,
});

/** Every world, most recently played first: migrated ones and those still in the old format. */
export async function listWorlds(env: IdbEnv = browserEnv()): Promise<WorldSummary[]> {
  const db = await openDb(env);
  try { return ((await req(db.transaction('worlds', 'readonly').objectStore('worlds').getAll())) as any[]).map(summaryOf).sort((a, b) => b.played - a.played); }
  catch (e) { throw fail(e, 'list'); }
  finally { db.close(); }
}
/** Remove a world from all five stores. */
export async function deleteWorld(id: string, env: IdbEnv = browserEnv()): Promise<void> {
  const db = await openDb(env);
  try {
    const t = db.transaction([...STORES], 'readwrite'), range = env.bound(id + '|', id + '|￿');
    t.objectStore('worlds').delete(id);
    for (const s of ['players', 'edits', 'backup', 'chunks']) t.objectStore(s).delete(range);
    await done(t);
  } catch (e) { throw fail(e, 'delete'); }
  finally { db.close(); }
}

/** The `edits` value of a chunk record: the key holds the rest. */
interface EditValue { rev: number; pal: number; enc: 0 | 1; data: Uint8Array; ents: BlockEnt[] }

/** What the legacy chunk conversion has done in this process (risk R3 of 12). */
export interface MigrationCount { chunks: number; dense: number; edits: number; bytes: number; ms: number }

/** One world's records. `open` must come first. */
export class IdbStorage implements Storage {
  private db: IdbDatabase | null = null;
  private world: WorldRecord | null = null;
  private pal = 0;
  private level = 1;
  /** Keys of this world in `edits` and in the legacy `chunks`, read once at `open`: most of a world was never edited,
   *  and asking for one of its chunks must cost no transaction. Null before `open`. */
  private known: Set<string> | null = null;
  readonly migrated: MigrationCount = { chunks: 0, dense: 0, edits: 0, bytes: 0, ms: 0 };

  constructor(readonly worldId: string, private env: IdbEnv = browserEnv()) {}

  private async handle(): Promise<IdbDatabase> {
    if (!this.db) this.db = await openDb(this.env);
    return this.db;
  }
  private key(...k: (string | number)[]): string { return [this.worldId, ...k].join('|'); }

  async open(): Promise<WorldRecord | null> {
    const db = await this.handle();
    let rec: any;
    try { rec = await req(db.transaction('worlds', 'readonly').objectStore('worlds').get(this.worldId)); }
    catch (e) { throw fail(e, 'open world'); }
    if (!rec) { this.known = new Set(); return null; }
    if (rec.format !== undefined && rec.format !== 2) throw new StorageError('version', `world format ${rec.format} is newer than this build`);
    try {
      const t = db.transaction(['edits', 'chunks'], 'readonly'), range = this.env.bound(this.worldId + '|', this.worldId + '|\uffff');
      const [a, b] = await Promise.all([req(t.objectStore('edits').getAllKeys(range)), req(t.objectStore('chunks').getAllKeys(range))]);
      this.known = new Set([...a, ...b] as string[]);
    } catch (e) { throw fail(e, 'list chunks'); }
    if (rec.format === undefined) return this.migrate(db, rec as LegacyWorld);
    const { summary, ...world } = rec;
    this.level = summary?.level ?? 1;
    return this.adopt(world as WorldRecord);
  }
  private adopt(w: WorldRecord): WorldRecord {
    this.world = w;
    this.pal = currentPalette(w.palettes);
    return w;
  }
  /** 8.4 steps 1 to 3. The old record stays where it is until the new one replaces it in one transaction. */
  private async migrate(db: IdbDatabase, legacy: LegacyWorld): Promise<WorldRecord> {
    try {
      const t = db.transaction('backup', 'readwrite'), s = t.objectStore('backup'), k = this.key('v1');
      if ((await req(s.get(k))) === undefined) s.put(legacy, k);
      await done(t);
    } catch (e) { throw fail(e, 'back up the old world'); }
    const { world, player } = splitLegacyWorld(legacy);
    this.level = (legacy.data?.stats?.level as number) ?? 1;
    try {
      const t = db.transaction(['worlds', 'players'], 'readwrite');
      t.objectStore('worlds').put({ ...world, summary: { level: this.level } });
      if (player) t.objectStore('players').put(player, this.key(player.id));
      await done(t);
    } catch (e) { throw fail(e, 'migrate the world'); }
    return this.adopt(world);
  }

  async loadPlayer(id: string): Promise<PlayerRecord | null> {
    const db = await this.handle();
    try { return ((await req(db.transaction('players', 'readonly').objectStore('players').get(this.key(id)))) as PlayerRecord | undefined) ?? null; }
    catch (e) { throw fail(e, 'load player'); }
  }

  async loadChunk(dim: number, cx: number, cz: number): Promise<ChunkRecord | null> {
    const k = this.key(dim, cx, cz);
    if (this.known && !this.known.has(k)) return null;
    const db = await this.handle();
    let v: EditValue | undefined, legacy: LegacyChunk | undefined;
    try {
      const t = db.transaction(['edits', 'chunks'], 'readonly');
      [v, legacy] = await Promise.all([req(t.objectStore('edits').get(k)), req(t.objectStore('chunks').get(k))]);
    } catch (e) { throw fail(e, 'load chunk'); }
    if (v) return { dim, cx, cz, rev: v.rev, pal: v.pal, enc: v.enc, data: v.data, ents: v.ents ?? [] };
    if (!legacy) return null;
    return this.convert(db, k, dim, cx, cz, legacy);
  }
  /** 8.4 step 5. The legacy record stays; converting it again gives the same record. */
  private async convert(db: IdbDatabase, k: string, dim: number, cx: number, cz: number, legacy: LegacyChunk): Promise<ChunkRecord> {
    const w = this.world;
    if (!w) throw new StorageError('io', 'loadChunk before open');
    const t0 = this.env.now(), saved = unrle(legacy.d, CVOL), map = paletteMap(w.palettes[legacy.p ?? 0] ?? null);
    if (map) for (let i = 0; i < saved.length; i++) saved[i] = map[saved[i]];
    const g = genChunk(w.seed, dim, cx, cz), out = diffLegacyChunk(dim, cx, cz, saved, g, legacy.e ?? [], this.pal), r = out.rec;
    const m = this.migrated;
    m.chunks++; m.edits += out.edits; m.bytes += r.data.length; if (out.dense) m.dense++; m.ms += this.env.now() - t0;
    try {
      const t = db.transaction('edits', 'readwrite');
      t.objectStore('edits').put({ rev: r.rev, pal: r.pal, enc: r.enc, data: r.data, ents: r.ents } satisfies EditValue, k);
      await done(t);
    } catch { /* not written: the next load converts it again */ }
    return { ...r, data: r.data.slice(), ents: JSON.parse(JSON.stringify(r.ents)) };
  }

  /** One transaction over worlds, players and edits: all of the batch or none of it. */
  async commit(batch: Batch): Promise<void> {
    const db = await this.handle();
    const own = batch.players.find((p) => p.id === (batch.world?.owner ?? this.world?.owner));
    if (own) this.level = (own.stats as any)?.level ?? this.level;
    try {
      const t = db.transaction(['worlds', 'players', 'edits'], 'readwrite');
      if (batch.world) t.objectStore('worlds').put({ ...batch.world, summary: { level: this.level } });
      for (const p of batch.players) t.objectStore('players').put(p, this.key(p.id));
      const e = t.objectStore('edits');
      for (const c of batch.chunks) {
        const k = this.key(c.dim, c.cx, c.cz);
        // nothing edited and nothing stored: as if never saved (the legacy record, if any, was converted before)
        if (c.rev === 0 && !c.ents.length) e.delete(k);
        else e.put({ rev: c.rev, pal: c.pal, enc: c.enc, data: c.data, ents: c.ents } satisfies EditValue, k);
      }
      await done(t);
    } catch (err) { throw fail(err, 'save'); }
    // a key is never taken out: a chunk whose record was deleted just costs a read that finds nothing
    if (this.known) for (const c of batch.chunks) this.known.add(this.key(c.dim, c.cx, c.cz));
    if (batch.world && !this.world) this.adopt(batch.world);
  }

  async close(): Promise<void> { if (this.db) { this.db.close(); this.db = null; } }
}
