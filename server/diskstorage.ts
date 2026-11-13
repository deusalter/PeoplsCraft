// The server's Storage (8.1): one folder, JSON for the world and each player, region files for chunk edits,
// a journal that makes each commit whole, rolling backups, and what to do with every file that does not read.
import { mkdir, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { type Batch, type ChunkRecord, type PlayerRecord, type Storage, StorageError, type WorldRecord } from '../src/sim/storage';
import {
  type DiskIO, RESTORE_MARK, dropBackupTemps, errCode, exists, ioError, listBackups, newestGoodBackup, nodeIO, parsePlayer, parseWorld,
  playerFromBackup, regionFromBackup, releaseLock, rotateBackups, stampOf, syncDir, takeBackup, takeLock,
} from './backup';
import { FormatError, decodeRegion, encodeRegion, localKey, parseRegionName, regionName, regionOf } from './region';

/** A file that did not read, and what was put in its place: for the player's toast or the chat line (8.1). */
export interface DiskNotice {
  kind: 'player' | 'region';
  /** The player's record id, or `<dim>/<rx>/<rz>`. */
  id: string;
  /** The backup the copy came from; null when no backup had one (a fresh player, an unedited region). */
  from: string | null;
  text: string;
}
export interface DiskOptions {
  /** Seconds between backups when something was committed since the last one (`--backup-interval`). */
  backupInterval?: number;
  /** Backups kept (`--backup-keep`). */
  backupKeep?: number;
  log?: (level: 'info' | 'warn' | 'error', msg: string) => void;
  notice?: (n: DiskNotice) => void;
  /** The command printed when world.json does not read. */
  restoreCommand?: (dir: string, stamp: string) => string;
  /** Wall clock, milliseconds: backup and `.bad-` names. */
  now?: () => number;
  io?: DiskIO;
  /** Milliseconds a region stays in memory after the last load or commit that touched it. */
  regionLinger?: number;
  /** Tests only: called at each step of a commit (`tmp`, `journal`, `rename`, `renamed`, `done`), so that a test can kill
   *  the process exactly there. */
  hook?: (point: string) => void;
}

export const BACKUP_INTERVAL = 1800, BACKUP_KEEP = 12, REGION_LINGER_MS = 5 * 60_000;
const SWEEP_MS = 60_000;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

interface Region { dim: number; rx: number; rz: number; chunks: Map<number, ChunkRecord>; touched: number }
const regionKey = (dim: number, rx: number, rz: number): string => `${dim}/${rx}/${rz}`;
const regionFile = (dim: number, rx: number, rz: number): string => join('chunks', String(dim), regionName(rx, rz));
const copyChunk = (c: ChunkRecord): ChunkRecord => ({ dim: c.dim, cx: c.cx, cz: c.cz, rev: c.rev, pal: c.pal, enc: c.enc, data: c.data.slice(), ents: JSON.parse(JSON.stringify(c.ents)) });

export class DiskStorage implements Storage {
  private readonly io: DiskIO;
  private readonly now: () => number;
  private readonly log: NonNullable<DiskOptions['log']>;
  /** Commits, backups and repairs, one at a time and in order. */
  private queue: Promise<unknown> = Promise.resolve();
  private state: 'new' | 'open' | 'closed' = 'new';
  /** Regions that have a file, as listed at `open` and added to by commits. */
  private readonly listed = new Set<string>();
  private readonly regions = new Map<string, Region>();
  private readonly loading = new Map<string, Promise<Region>>();
  /** Player ids whose file a commit wrote since a repair of that file was asked for. */
  private readonly written = new Set<string>();
  private backedUp = false;
  private committedSince = false;
  private failing = false;
  /** A commit failed after its journal was written: the next one finishes it first. */
  private journalLeft = false;
  private lastStamp = 0;
  private timerBackup = false;
  private timers: ReturnType<typeof setInterval>[] = [];

  constructor(readonly dir: string, private opt: DiskOptions = {}) {
    this.io = opt.io ?? nodeIO;
    this.now = opt.now ?? Date.now;
    this.log = opt.log ?? ((level, msg) => (level === 'info' ? console.log : console.error)(`[storage] ${msg}`));
  }

  private run<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.queue.then(fn, fn);
    this.queue = p.catch(() => {});
    return p;
  }
  private path(name: string): string { return join(this.dir, name); }
  private hook(point: string): void { this.opt.hook?.(point); }
  private stamp(): string { return stampOf(this.now()); }

  async open(): Promise<WorldRecord | null> {
    if (this.state !== 'new') throw new StorageError('io', 'open twice');
    try { await mkdir(this.dir, { recursive: true }); } catch (e) { throw ioError(e, 'make the data folder'); }
    await takeLock(this.dir);
    try {
      const world = await this.boot();
      this.state = 'open';
      const every = (this.opt.backupInterval ?? BACKUP_INTERVAL) * 1000;
      this.timers.push(setInterval(() => {
        if (this.timerBackup || !this.committedSince || this.failing) return;
        // looked at again in the queue: a commit or a backup may be under way when the timer fires
        this.timerBackup = true;
        void this.run(async () => { this.timerBackup = false; return this.committedSince && !this.failing ? this.backupNow('timer') : null; });
      }, every));
      this.timers.push(setInterval(() => void this.run(async () => this.sweep()), Math.min(SWEEP_MS, this.opt.regionLinger ?? REGION_LINGER_MS)));
      for (const t of this.timers) t.unref();
      return world;
    } catch (e) {
      await releaseLock(this.dir);
      throw e;
    }
  }

  private async boot(): Promise<WorldRecord | null> {
    if (await exists(this.path(RESTORE_MARK))) {
      const m = await readFile(this.path(RESTORE_MARK), 'utf8').catch(() => '');
      let stamp = '<stamp>';
      try { stamp = JSON.parse(m).stamp ?? stamp; } catch { /* the restore names it again */ }
      throw new StorageError('corrupt', `A restore of ${stamp} was cut short. Finish it first: ${this.restoreCmd(stamp)}`);
    }
    await this.finishJournal();
    await this.dropStrays();
    await dropBackupTemps(this.dir);

    let world: WorldRecord | null = null;
    let text: string | null = null;
    try { text = await readFile(this.path('world.json'), 'utf8'); } catch (e) { if (errCode(e) !== 'ENOENT') throw await this.refuse('io', `world.json cannot be read (${(e as Error).message})`); }
    if (text === null) {
      if ((await this.anyRecords())) throw await this.refuse('corrupt', 'world.json is missing but the folder holds players or chunks');
    } else {
      try { world = parseWorld(text); } catch (e) {
        throw await this.refuse(e instanceof FormatError && e.kind === 'version' ? 'version' : 'corrupt', (e as Error).message);
      }
    }
    await this.listRegions();
    return world;
  }

  private restoreCmd(stamp: string): string {
    return this.opt.restoreCommand ? this.opt.restoreCommand(this.dir, stamp) : `npm start -- --data ${this.dir} --restore ${stamp}`;
  }
  /** 8.1: refuse to start; name the newest backup that reads and the command that restores it. Nothing is chosen here. */
  private async refuse(code: 'corrupt' | 'version' | 'io', why: string): Promise<StorageError> {
    const good = await newestGoodBackup(this.dir).catch(() => null);
    const tail = good
      ? ` The newest backup that reads is ${good}. To go back to it (the current files are first moved to backups/pre-restore-<time>/): ${this.restoreCmd(good)}`
      : ' No backup in this folder reads either.';
    return new StorageError(code, `The world in ${this.dir} cannot be opened: ${why}.${tail}`);
  }

  /** 8.1 start-up: a journal that exists names a commit whose files were all written; finish putting them in place. */
  private async finishJournal(): Promise<void> {
    const jp = this.path('commit.json');
    let text: string;
    try { text = await readFile(jp, 'utf8'); } catch (e) { if (errCode(e) === 'ENOENT') return; throw ioError(e, 'read commit.json'); }
    let names: string[];
    try {
      const j = JSON.parse(text);
      names = j.names;
      if (!Array.isArray(names) || names.some((n) => typeof n !== 'string' || n.startsWith('/') || n.split(/[\\/]/).includes('..'))) throw new Error('bad names');
    } catch {
      // the journal is fsynced before it is renamed into place, so only damage to the disk gets here; which `.tmp`
      // files are this commit's cannot be told, and guessing could put an older failed save over a newer one
      throw await this.refuse('corrupt', 'commit.json, the journal of an unfinished save, does not read');
    }
    const dirs = new Set<string>();
    try {
      for (const n of names) {
        if (await exists(this.path(n + '.tmp'))) { await rename(this.path(n + '.tmp'), this.path(n)); dirs.add(dirname(this.path(n))); }
      }
      for (const d of dirs) await syncDir(d);
      await unlink(jp);
      await syncDir(this.dir);
    } catch (e) { throw ioError(e, 'finish the unfinished save'); }
    if (names.length) this.log('info', `finished a save that was cut short (${names.length} file(s))`);
  }
  private async dropStrays(): Promise<void> {
    const drop = async (d: string): Promise<void> => {
      for (const n of await readdir(d).catch(() => [] as string[])) if (n.endsWith('.tmp')) await unlink(join(d, n)).catch(() => {});
    };
    await drop(this.dir);
    await drop(this.path('players'));
    for (const dim of await readdir(this.path('chunks')).catch(() => [] as string[])) await drop(join(this.dir, 'chunks', dim));
  }
  private async anyRecords(): Promise<boolean> {
    if ((await readdir(this.path('players')).catch(() => [] as string[])).some((n) => n.endsWith('.json'))) return true;
    for (const dim of await readdir(this.path('chunks')).catch(() => [] as string[])) {
      if ((await readdir(join(this.dir, 'chunks', dim)).catch(() => [] as string[])).some((n) => parseRegionName(n))) return true;
    }
    return false;
  }
  /** Lists `chunks/<dim>/` once: a chunk whose region has no file costs nothing to ask for. */
  private async listRegions(): Promise<void> {
    for (const dim of await readdir(this.path('chunks')).catch(() => [] as string[])) {
      if (!/^-?\d+$/.test(dim)) continue;
      for (const n of await readdir(join(this.dir, 'chunks', dim)).catch(() => [] as string[])) {
        const rc = parseRegionName(n);
        if (rc) this.listed.add(regionKey(Number(dim), rc[0], rc[1]));
      }
    }
  }
  /** How many region files `open` found or commits made. */
  get regionCount(): number { return this.listed.size; }

  // ---- players ----

  async loadPlayer(id: string): Promise<PlayerRecord | null> {
    this.ready();
    if (!ID.test(id)) throw new StorageError('io', `"${id}" is not a player id`);
    let text: string;
    try { text = await readFile(this.path(join('players', id + '.json')), 'utf8'); } catch (e) {
      if (errCode(e) === 'ENOENT') return null;
      throw ioError(e, 'load player');
    }
    try { return parsePlayer(text, id); } catch (e) {
      if (e instanceof FormatError && e.kind === 'version') throw new StorageError('version', e.message);
      this.written.delete(id);
      return this.run(() => this.repairPlayer(id, (e as Error).message));
    }
  }
  /** 8.1: the file is renamed aside, the newest backup copy that reads takes its place (written back, so the next
   *  start finds the same), or the player starts fresh. */
  private async repairPlayer(id: string, why: string): Promise<PlayerRecord | null> {
    const name = join('players', id + '.json');
    // a commit that ran while this waited wrote a good file; read that one
    if (this.written.has(id)) {
      try { return parsePlayer(await readFile(this.path(name), 'utf8'), id); } catch { /* still bad: repair it */ }
    }
    const bad = `${name}.bad-${this.stamp()}`;
    await rename(this.path(name), this.path(bad)).catch(() => {});
    const copy = await playerFromBackup(this.dir, id);
    if (copy) {
      try {
        await this.io.write(this.path(name + '.tmp'), JSON.stringify(copy.rec));
        await rename(this.path(name + '.tmp'), this.path(name));
        await syncDir(this.path('players'));
      } catch (e) {
        await unlink(this.path(name + '.tmp')).catch(() => {});
        this.log('warn', `player ${id}: the backup copy could not be written back (${(e as Error).message}); it is used from memory`);
      }
    }
    const text = copy
      ? `Your saved character could not be read. It was put back as it was in the backup of ${copy.stamp}.`
      : 'Your saved character could not be read, and no backup holds it. You start afresh.';
    this.log('error', `player ${id}: ${why}; moved to ${bad}; ${copy ? 'restored from backup ' + copy.stamp : 'no backup copy, starts fresh'}`);
    this.opt.notice?.({ kind: 'player', id, from: copy?.stamp ?? null, text });
    return copy?.rec ?? null;
  }

  // ---- chunks ----

  async loadChunk(dim: number, cx: number, cz: number): Promise<ChunkRecord | null> {
    this.ready();
    const rx = regionOf(cx), rz = regionOf(cz);
    if (!this.listed.has(regionKey(dim, rx, rz))) return null;
    const r = await this.region(dim, rx, rz, false);
    r.touched = this.now();
    const c = r.chunks.get(localKey(cx, cz));
    return c ? copyChunk(c) : null;
  }
  /** A region from memory or its file. `queued`: the caller already runs in the queue, which a repair needs. */
  private region(dim: number, rx: number, rz: number, queued: boolean): Promise<Region> {
    const k = regionKey(dim, rx, rz), have = this.regions.get(k);
    if (have) return Promise.resolve(have);
    const pending = this.loading.get(k);
    if (pending) return pending;
    const p = this.readRegion(dim, rx, rz, queued).finally(() => this.loading.delete(k));
    this.loading.set(k, p);
    return p;
  }
  private async readRegion(dim: number, rx: number, rz: number, queued: boolean): Promise<Region> {
    const k = regionKey(dim, rx, rz), name = regionFile(dim, rx, rz);
    const keep = (chunks: Map<number, ChunkRecord>): Region => {
      // a commit that ran meanwhile has put the newer content in memory
      const r = this.regions.get(k) ?? { dim, rx, rz, chunks, touched: this.now() };
      this.regions.set(k, r);
      return r;
    };
    let b: Uint8Array;
    try { b = await readFile(this.path(name)); } catch (e) {
      if (errCode(e) === 'ENOENT') return keep(new Map());
      throw ioError(e, 'load region');
    }
    try { return keep(decodeRegion(b, dim, rx, rz)); } catch (e) {
      if (e instanceof FormatError && e.kind === 'version') throw new StorageError('version', `${name}: ${e.message}`);
      const why = (e as Error).message;
      const chunks = queued ? await this.repairRegion(dim, rx, rz, why, false) : await this.run(() => this.repairRegion(dim, rx, rz, why, true));
      return keep(chunks);
    }
  }
  /** 8.1: renamed aside; the newest backup copy that validates is used (written back unless a commit is about to
   *  write the region anyway), or the region counts as unedited. */
  private async repairRegion(dim: number, rx: number, rz: number, why: string, writeBack: boolean): Promise<Map<number, ChunkRecord>> {
    const k = regionKey(dim, rx, rz), name = regionFile(dim, rx, rz), have = this.regions.get(k);
    if (have) return have.chunks;
    const bad = `${name}.bad-${this.stamp()}`;
    await rename(this.path(name), this.path(bad)).catch(() => {});
    const copy = await regionFromBackup(this.dir, dim, regionName(rx, rz));
    const chunks = copy ? decodeRegion(copy.bytes, dim, rx, rz) : new Map<number, ChunkRecord>();
    if (copy && writeBack) {
      try {
        await this.io.write(this.path(name + '.tmp'), copy.bytes);
        await rename(this.path(name + '.tmp'), this.path(name));
        await syncDir(dirname(this.path(name)));
      } catch (e) {
        await unlink(this.path(name + '.tmp')).catch(() => {});
        this.log('warn', `region ${k}: the backup copy could not be written back (${(e as Error).message}); it is used from memory`);
      }
    }
    const where = dim === 0 ? 'the Overworld' : `realm ${dim}`;
    const text = copy
      ? `Part of ${where} near ${rx * 512}, ${rz * 512} could not be read. It was put back as it was in the backup of ${copy.stamp}.`
      : `Part of ${where} near ${rx * 512}, ${rz * 512} could not be read, and no backup holds it. It is back as it was first made.`;
    this.log('error', `region ${k}: ${why}; moved to ${bad}; ${copy ? 'restored from backup ' + copy.stamp : 'no backup copy, counts as unedited'}`);
    this.opt.notice?.({ kind: 'region', id: k, from: copy?.stamp ?? null, text });
    return chunks;
  }
  /** Regions untouched for `regionLinger` leave memory. Runs in the queue, so never under a commit. */
  private sweep(): void {
    const old = this.now() - (this.opt.regionLinger ?? REGION_LINGER_MS);
    for (const [k, r] of this.regions) if (r.touched < old && !this.loading.has(k)) this.regions.delete(k);
  }
  /** Regions in memory now. */
  get regionsHeld(): number { return this.regions.size; }

  // ---- commit ----

  commit(batch: Batch): Promise<void> {
    try { this.ready(); } catch (e) { return Promise.reject(e); }
    return this.run(() => this.apply(batch));
  }
  private async apply(batch: Batch): Promise<void> {
    if (this.journalLeft) {
      try { await this.finishJournal(); this.journalLeft = false; } catch (e) { this.failing = true; throw ioError(e, 'save'); }
    }
    if (!this.backedUp) {
      this.backedUp = true;
      if (await exists(this.path('world.json'))) await this.backupNow('first commit since start');
    }
    const files: { name: string; data: Uint8Array | string }[] = [];
    if (batch.world) files.push({ name: 'world.json', data: JSON.stringify(batch.world) });
    for (const p of batch.players) {
      if (!ID.test(p.id)) throw new StorageError('io', `"${p.id}" is not a player id`);
      files.push({ name: join('players', p.id + '.json'), data: JSON.stringify(p) });
    }
    const touched = new Map<string, Region>();
    const byRegion = new Map<string, ChunkRecord[]>();
    for (const c of batch.chunks) {
      const k = regionKey(c.dim, regionOf(c.cx), regionOf(c.cz));
      let l = byRegion.get(k);
      if (!l) byRegion.set(k, (l = []));
      l.push(c);
    }
    for (const [k, list] of byRegion) {
      const { dim, cx, cz } = list[0], rx = regionOf(cx), rz = regionOf(cz);
      const old = this.listed.has(k) ? (await this.region(dim, rx, rz, true)).chunks : new Map<number, ChunkRecord>();
      const next = new Map(old);
      for (const c of list) {
        if (c.rev === 0 && !c.ents.length) next.delete(localKey(c.cx, c.cz));
        else next.set(localKey(c.cx, c.cz), copyChunk(c));
      }
      touched.set(k, { dim, rx, rz, chunks: next, touched: this.now() });
      files.push({ name: regionFile(dim, rx, rz), data: encodeRegion(next.values()) });
    }
    if (!files.length) return;

    // steps 1 and 2: nothing is in place yet, so a failure leaves the last save as it was
    const dirs = new Set(files.map((f) => dirname(this.path(f.name))));
    try {
      for (const d of dirs) await mkdir(d, { recursive: true });
      await Promise.all(files.map(async (f) => { await this.io.write(this.path(f.name + '.tmp'), f.data); this.hook('tmp'); }));
      await this.io.write(this.path('commit.json.tmp'), JSON.stringify({ names: files.map((f) => f.name) }));
      await rename(this.path('commit.json.tmp'), this.path('commit.json'));
      await syncDir(this.dir);
    } catch (e) {
      await Promise.all(files.map((f) => unlink(this.path(f.name + '.tmp')).catch(() => {})));
      await unlink(this.path('commit.json.tmp')).catch(() => {});
      this.failing = true;
      throw ioError(e, 'save');
    }
    this.hook('journal');
    // steps 3 and 4: the save is durable now; a failure here is finished from the journal, at the next commit or start
    try {
      for (const f of files) { await rename(this.path(f.name + '.tmp'), this.path(f.name)); this.hook('rename'); }
      for (const d of dirs) await syncDir(d);
      this.hook('renamed');
      await unlink(this.path('commit.json'));
      this.hook('done');
    } catch (e) {
      this.journalLeft = true;
      this.failing = true;
      for (const k of touched.keys()) this.regions.delete(k);
      throw ioError(e, 'save');
    }
    for (const [k, r] of touched) { this.regions.set(k, r); this.listed.add(k); }
    for (const p of batch.players) this.written.add(p.id);
    this.failing = false;
    this.committedSince = true;
  }

  // ---- backups ----

  /** A backup now, after any commit under way. Resolves with its name, or null when none was made. */
  backup(): Promise<string | null> {
    try { this.ready(); } catch (e) { return Promise.reject(e); }
    return this.run(() => this.backupNow('asked'));
  }
  /** Whether the last commit failed: backups wait for one that succeeds. */
  get saveFailing(): boolean { return this.failing; }

  private async backupNow(why: string): Promise<string | null> {
    if (this.failing) { this.log('warn', `backup (${why}) skipped: saves are failing`); return null; }
    if (!(await exists(this.path('world.json')))) return null;
    const have = new Set(await listBackups(this.dir).catch(() => [] as string[]));
    let ms = Math.max(this.now(), this.lastStamp + 1000), stamp = stampOf(ms);
    while (have.has(stamp)) stamp = stampOf((ms += 1000));
    this.lastStamp = ms;
    try {
      await takeBackup(this.dir, stamp, this.io);
      this.committedSince = false;
      const gone = await rotateBackups(this.dir, this.opt.backupKeep ?? BACKUP_KEEP);
      this.log('info', `backup ${stamp} (${why})${gone.length ? `; removed ${gone.join(', ')}` : ''}`);
      return stamp;
    } catch (e) {
      this.log('error', `backup (${why}) failed: ${(e as Error).message}`);
      return null;
    }
  }

  // ---- end ----

  private ready(): void {
    if (this.state !== 'open') throw new StorageError('io', this.state === 'new' ? 'storage used before open' : 'storage used after close');
  }
  /** Waits for what is under way, takes the shutdown backup when anything was committed since the last one, and
   *  lets go of the folder. */
  async close(): Promise<void> {
    if (this.state !== 'open') return;
    this.state = 'closed';
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    await this.run(async () => { if (this.committedSince) await this.backupNow('shutdown'); });
    await releaseLock(this.dir);
  }
}
