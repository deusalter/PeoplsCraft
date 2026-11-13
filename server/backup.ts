// The files of a server's data folder (8.1) other than the commit itself: the write layer, the lock, reading and
// checking world and player files, rolling backups and restoring one. Run by hand to list or restore backups:
//
//   npm run node -- server/backup.ts --data <dir> --list
//   npm run node -- server/backup.ts --data <dir> --restore <stamp>
import { open, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { StorageError, type PlayerRecord, type WorldRecord } from '../src/sim/storage';
import { FormatError, decodeRegion, parseRegionName } from './region';

/** Every byte the folder storage writes goes through here, so a test can stand a full disk in for the real one. */
export interface DiskIO {
  /** Write the whole file, then fsync it, before resolving. */
  write(path: string, data: Uint8Array | string): Promise<void>;
}
export const nodeIO: DiskIO = {
  async write(path, data) {
    const h = await open(path, 'w');
    try { await h.writeFile(data); await h.sync(); } finally { await h.close(); }
  },
};

/** fsync a directory so that the renames and creations in it survive a power cut. */
export async function syncDir(path: string): Promise<void> {
  let h;
  try { h = await open(path, 'r'); await h.sync(); } catch { /* some platforms refuse to sync a directory; nothing else to do there */ }
  finally { await h?.close().catch(() => {}); }
}

export const errCode = (e: unknown): string => (e as NodeJS.ErrnoException)?.code ?? '';
export function ioError(e: unknown, what: string): StorageError {
  if (e instanceof StorageError) return e;
  const code = errCode(e);
  return new StorageError(code === 'ENOSPC' || code === 'EDQUOT' ? 'full' : 'io', `${what}: ${(e as Error)?.message ?? String(e)}`);
}
export async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch (e) { if (errCode(e) === 'ENOENT') return false; throw e; }
}

/** Backup and `.bad-` names: UTC, so that the names sort in time order through a change of clocks. */
export const STAMP = /^\d{8}-\d{6}$/;
export function stampOf(ms: number): string {
  const d = new Date(ms), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

// ---- the lock ----

const alive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch (e) { return errCode(e) === 'EPERM'; }
};
/** Take `server.lock`, or refuse when a live process holds it. A lock left by a process that died is taken over. */
export async function takeLock(dir: string): Promise<void> {
  const p = join(dir, 'server.lock');
  for (let i = 0; i < 3; i++) {
    try { await writeFile(p, `${process.pid}\n`, { flag: 'wx' }); return; } catch (e) { if (errCode(e) !== 'EEXIST') throw ioError(e, 'take server.lock'); }
    const pid = Number.parseInt((await readFile(p, 'utf8').catch(() => '')).trim(), 10);
    if (pid > 0 && alive(pid)) throw new StorageError('locked', `Another server (pid ${pid}) is using ${dir}.`);
    await unlink(p).catch(() => {});
  }
  throw new StorageError('locked', `Could not take ${p}.`);
}
export async function releaseLock(dir: string): Promise<void> {
  const p = join(dir, 'server.lock');
  const pid = Number.parseInt((await readFile(p, 'utf8').catch(() => '')).trim(), 10);
  if (pid === process.pid) await unlink(p).catch(() => {});
}

// ---- reading the record files ----

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
export function parseWorld(text: string): WorldRecord {
  let w: unknown;
  try { w = JSON.parse(text); } catch { throw new FormatError('corrupt', 'world.json is not JSON'); }
  if (!isObj(w)) throw new FormatError('corrupt', 'world.json is not a world record');
  if (typeof w.format === 'number' && w.format > 2) throw new FormatError('version', `world format ${w.format} is newer than this build`);
  if (w.format !== 2) throw new FormatError('corrupt', `world.json has an unknown format (${String(w.format)})`);
  if (typeof w.id !== 'string' || typeof w.seed !== 'number' || !Array.isArray(w.palettes) || !isObj(w.state) || !isObj(w.names))
    throw new FormatError('corrupt', 'world.json lacks fields of a world record');
  return w as unknown as WorldRecord;
}
export function parsePlayer(text: string, id: string): PlayerRecord {
  let p: unknown;
  try { p = JSON.parse(text); } catch { throw new FormatError('corrupt', `player ${id} is not JSON`); }
  if (!isObj(p)) throw new FormatError('corrupt', `player ${id} is not a player record`);
  if (typeof p.v === 'number' && p.v > 1) throw new FormatError('version', `player format ${p.v} is newer than this build`);
  if (p.v !== 1 || p.id !== id || !isObj(p.pos)) throw new FormatError('corrupt', `player ${id} is not a player record`);
  return p as unknown as PlayerRecord;
}
const readText = async (path: string): Promise<string | null> => {
  try { return await readFile(path, 'utf8'); } catch (e) { if (errCode(e) === 'ENOENT') return null; throw e; }
};

// ---- backups ----

/** Backup names, newest first. `pre-restore-` folders and unfinished copies are not counted. */
export async function listBackups(dir: string): Promise<string[]> {
  let names: string[];
  try { names = await readdir(join(dir, 'backups')); } catch (e) { if (errCode(e) === 'ENOENT') return []; throw e; }
  return names.filter((n) => STAMP.test(n)).sort().reverse();
}
/** The newest backup whose world.json reads as a world of this build, or null. */
export async function newestGoodBackup(dir: string): Promise<string | null> {
  for (const s of await listBackups(dir)) {
    try { const t = await readText(join(dir, 'backups', s, 'world.json')); if (t !== null) { parseWorld(t); return s; } } catch { /* next one */ }
  }
  return null;
}
/** The newest backup copy of a player that reads, and the backup it is from. */
export async function playerFromBackup(dir: string, id: string): Promise<{ rec: PlayerRecord; stamp: string } | null> {
  for (const s of await listBackups(dir)) {
    try { const t = await readText(join(dir, 'backups', s, 'players', id + '.json')); if (t !== null) return { rec: parsePlayer(t, id), stamp: s }; } catch { /* next one */ }
  }
  return null;
}
/** The newest backup copy of a region that validates: its bytes, and the backup it is from. */
export async function regionFromBackup(dir: string, dim: number, name: string): Promise<{ bytes: Uint8Array; stamp: string } | null> {
  const rc = parseRegionName(name);
  if (!rc) return null;
  for (const s of await listBackups(dir)) {
    try {
      const b = await readFile(join(dir, 'backups', s, 'chunks', String(dim), name));
      decodeRegion(b, dim, rc[0], rc[1]);
      return { bytes: b, stamp: s };
    } catch { /* next one */ }
  }
  return null;
}

/** world.json, players/*.json and chunks/<dim>/r.*.bin of `from`, written durably under `to` (made, with both folders). */
async function copyWorld(from: string, to: string, io: DiskIO): Promise<void> {
  const dirs = [to, join(to, 'players'), join(to, 'chunks')];
  for (const d of dirs) await mkdir(d, { recursive: true });
  const w = await readFile(join(from, 'world.json')).catch((e) => { if (errCode(e) === 'ENOENT') return null; throw e; });
  if (w) await io.write(join(to, 'world.json'), w);
  const list = async (d: string): Promise<string[]> => readdir(d).catch((e) => { if (errCode(e) === 'ENOENT') return []; throw e; });
  for (const f of await list(join(from, 'players'))) if (f.endsWith('.json')) await io.write(join(to, 'players', f), await readFile(join(from, 'players', f)));
  for (const dim of await list(join(from, 'chunks'))) {
    if (!/^-?\d+$/.test(dim)) continue;
    const d = join(to, 'chunks', dim);
    await mkdir(d, { recursive: true });
    dirs.push(d);
    for (const f of await list(join(from, 'chunks', dim))) if (parseRegionName(f)) await io.write(join(d, f), await readFile(join(from, 'chunks', dim, f)));
  }
  for (const d of dirs) await syncDir(d);
}

/** One backup of the folder as it stands: copied to `backups/.tmp-<stamp>/`, then renamed to `backups/<stamp>/`.
 *  The caller makes sure no commit runs meanwhile. */
export async function takeBackup(dir: string, stamp: string, io: DiskIO = nodeIO): Promise<void> {
  const root = join(dir, 'backups'), tmp = join(root, '.tmp-' + stamp);
  try {
    await mkdir(root, { recursive: true });
    await rm(tmp, { recursive: true, force: true });
    await copyWorld(dir, tmp, io);
    await rename(tmp, join(root, stamp));
    await syncDir(root);
  } catch (e) {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
    throw ioError(e, 'back up');
  }
}
/** Delete all but the newest `keep` backups; returns the names deleted. */
export async function rotateBackups(dir: string, keep: number): Promise<string[]> {
  const old = (await listBackups(dir)).slice(Math.max(0, keep));
  for (const s of old) {
    // renamed out of the list first: a crash in the middle of the delete must not leave half a backup under its name
    const gone = join(dir, 'backups', '.tmp-old-' + s);
    await rename(join(dir, 'backups', s), gone);
    await rm(gone, { recursive: true, force: true });
  }
  return old;
}
/** Copies a crash left half made. */
export async function dropBackupTemps(dir: string): Promise<void> {
  const names = await readdir(join(dir, 'backups')).catch(() => [] as string[]);
  for (const n of names) if (n.startsWith('.tmp-')) await rm(join(dir, 'backups', n), { recursive: true, force: true });
}

// ---- restore ----

export const RESTORE_MARK = 'restore.json';
const STAGE = 'restore.tmp';
/** What a restore moves aside first. A stray `.tmp` beside them is deleted at the next start, as after any crash. */
const CURRENT = ['world.json', 'players', 'chunks', 'commit.json'];
const STAGED = ['players', 'chunks', 'world.json'];

/** Put the folder back as backup `stamp` holds it. The current files are first moved to
 *  `backups/pre-restore-<now>/`. Refuses while a server holds the folder. A restore cut short by a crash is finished
 *  by running the same restore again; the folder storage refuses to open until then. */
export async function restoreBackup(dir: string, stamp: string, opt: { io?: DiskIO; now?: () => number } = {}): Promise<{ pre: string }> {
  const io = opt.io ?? nodeIO, now = opt.now ?? Date.now;
  if (!STAMP.test(stamp)) throw new StorageError('io', `"${stamp}" is not a backup name (YYYYMMDD-HHMMSS).`);
  await takeLock(dir);
  try {
    const markPath = join(dir, RESTORE_MARK), stage = join(dir, STAGE);
    let mark: { stamp: string; pre: string } | null = null;
    const markText = await readText(markPath);
    if (markText !== null) {
      try { mark = JSON.parse(markText); } catch { mark = null; }
      if (!mark || typeof mark.stamp !== 'string' || typeof mark.pre !== 'string') {
        // the mark is written only once the copy is whole, so a mark that does not read was never acted on
        await unlink(markPath);
        mark = null;
      } else if (mark.stamp !== stamp) {
        throw new StorageError('io', `A restore of ${mark.stamp} was cut short: run --restore ${mark.stamp} again to finish it first.`);
      }
    }
    if (!mark) {
      const src = join(dir, 'backups', stamp), w = await readText(join(src, 'world.json'));
      if (w === null) throw new StorageError('io', `There is no backup ${stamp} (or it holds no world.json).`);
      try { parseWorld(w); } catch (e) { throw new StorageError('corrupt', `Backup ${stamp} cannot be used: ${(e as Error).message}.`); }
      await rm(stage, { recursive: true, force: true });
      await copyWorld(src, stage, io);
      let pre = 'pre-restore-' + stampOf(now());
      for (let n = 2; await exists(join(dir, 'backups', pre)); n++) pre = `pre-restore-${stampOf(now())}-${n}`;
      mark = { stamp, pre };
      await io.write(markPath + '.tmp', JSON.stringify(mark));
      await rename(markPath + '.tmp', markPath);
      await syncDir(dir);
    }
    const preDir = join(dir, 'backups', mark.pre);
    // once any staged item has gone into place every current one had already been moved aside
    let placing = false;
    for (const n of STAGED) if (!(await exists(join(stage, n)))) placing = true;
    if (!placing) {
      await mkdir(preDir, { recursive: true });
      for (const n of CURRENT) if ((await exists(join(dir, n))) && !(await exists(join(preDir, n)))) await rename(join(dir, n), join(preDir, n));
      await syncDir(preDir);
    }
    for (const n of STAGED) if (await exists(join(stage, n))) await rename(join(stage, n), join(dir, n));
    await syncDir(dir);
    await rm(stage, { recursive: true, force: true });
    await unlink(markPath);
    await syncDir(dir);
    return { pre: join('backups', mark.pre) };
  } catch (e) {
    throw ioError(e, 'restore');
  } finally {
    await releaseLock(dir);
  }
}

// ---- by hand ----

async function cli(argv: string[]): Promise<number> {
  const arg = (k: string): string | undefined => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const dir = arg('--data'), stamp = arg('--restore');
  if (!dir || (!stamp && !argv.includes('--list'))) {
    console.error('usage: npm run node -- server/backup.ts --data <dir> (--list | --restore <stamp>)');
    return 2;
  }
  if (stamp) {
    const { pre } = await restoreBackup(dir, stamp);
    console.log(`Restored ${dir} from backups/${stamp}. The files it replaced are in ${join(dir, pre)}.`);
    return 0;
  }
  const all = await listBackups(dir);
  if (!all.length) console.log(`No backups in ${join(dir, 'backups')}.`);
  for (const s of all) {
    let state = 'reads';
    try { const t = await readText(join(dir, 'backups', s, 'world.json')); if (t === null) state = 'no world.json'; else parseWorld(t); } catch (e) { state = (e as Error).message; }
    console.log(`${s}  ${state}`);
  }
  return 0;
}
// Bundled into the server this file is part of main.js; only `npm run node -- server/backup.ts` runs it as its own entry.
if (basename(process.argv[1] ?? '') === 'backup.mjs' && basename(dirname(process.argv[1])) === 'run') {
  cli(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error((e as Error).message ?? e); process.exit(1); });
}
