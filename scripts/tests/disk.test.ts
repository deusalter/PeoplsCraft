// The server's folder storage (8.1): region files, the commit journal under kill -9, every file kind made
// unreadable, a full disk, rolling backups, restore, and SimHost running on it.
//
// The kill test runs this same bundle as a child process (`<bundle> writer <dir> ...`) and kills it with SIGKILL,
// at random moments from outside and at each step of a commit from inside.
import assert from 'node:assert/strict';
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { CVOL } from '../../src/core/constants';
import { B } from '../../src/data/blocks';
import { ClientVoxels, VoxChunk } from '../../src/net/clientvoxels';
import { SimHost } from '../../src/net/host';
import { loopback } from '../../src/net/loopback';
import { MV_GROUND, type S2C } from '../../src/net/protocol';
import { Session } from '../../src/client/session';
import type { ChunkSource, GenResult } from '../../src/sim/chunksource';
import { hashBlocks } from '../../src/sim/genjob';
import type { Batch, ChunkRecord, PlayerRecord, WorldRecord } from '../../src/sim/storage';
import { StorageError } from '../../src/sim/storage';
import { type DiskIO, listBackups, nodeIO, restoreBackup, stampOf } from '../../server/backup';
import { type DiskNotice, type DiskOptions, DiskStorage } from '../../server/diskstorage';
import { FormatError, crc32, decodeRegion, encodeRegion, localKey } from '../../server/region';

// ---- a small world whose items are counted ----

const PLAYERS = 6, START_INV = 50, START_BOX = 40;
/** Chests: two in one region, the others each in a region of their own, three realms, negative coordinates. */
const CHESTS: [number, number, number][] = [[0, 0, 0], [0, 1, 0], [0, 40, 3], [0, -33, -1], [0, 5, 70], [1, 0, 0], [2, -100, 7]];
const TOTAL = PLAYERS * START_INV + CHESTS.length * START_BOX;
const COMMITS = 50;

interface State { k: number; inv: number[]; box: number[]; rev: number[] }
const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** Records are numbered: players 0..5, then chests 6..12. */
function move(s: State): number[] {
  const r = mulberry(s.k * 7919 + 13), n = PLAYERS + CHESTS.length;
  const a = Math.floor(r() * n);
  let b = Math.floor(r() * (n - 1));
  if (b >= a) b++;
  const get = (i: number) => (i < PLAYERS ? s.inv[i] : s.box[i - PLAYERS]);
  const set = (i: number, v: number) => { if (i < PLAYERS) s.inv[i] = v; else { s.box[i - PLAYERS] = v; s.rev[i - PLAYERS]++; } };
  const m = Math.min(get(a), 1 + Math.floor(r() * 12));
  set(a, get(a) - m); set(b, get(b) + m);
  return [a, b];
}
function stateAt(k: number): State {
  const s: State = { k: 0, inv: Array(PLAYERS).fill(START_INV), box: Array(CHESTS.length).fill(START_BOX), rev: Array(CHESTS.length).fill(1) };
  for (let i = 1; i <= k; i++) { s.k = i; move(s); }
  return s;
}
const worldRec = (k: number): WorldRecord => ({
  format: 2, id: 'w', name: 'Counted', seed: 1, seedText: '1', created: 0, played: k, owner: null, palettes: [['air', 'stone']], names: {},
  state: { tick: k } as unknown as WorldRecord['state'],
});
const playerRec = (i: number, coins: number): PlayerRecord => ({
  v: 1, id: 'p' + i, name: 'P' + i, seen: 0, dim: 0, pos: { x: i, y: 70, z: 0, yaw: 0, pitch: 0 }, inv: { coins }, stats: { hp: 20 },
  bed: null, deathAt: null, portalReturn: {}, safe: [0, 70, 0], arriving: -1, pendingBed: false, recallT: 0,
  modes: { creative: false, hidden: false, god: false, fly: false }, mail: [],
});
function chestRec(j: number, n: number, rev: number): ChunkRecord {
  const [dim, cx, cz] = CHESTS[j], data = new Uint8Array(600 + (rev % 7) * 300);
  for (let i = 0; i < data.length; i++) data[i] = (i * 31 + rev * 7 + j) & 255;
  return { dim, cx, cz, rev, pal: 0, enc: 0, data, ents: [{ x: cx * 16 + 3, y: 65, z: cz * 16 + 4, kind: 'chest', data: { items: [{ id: 'coin', n }] } }] };
}
/** Everything of state `s`: the first save of a world. */
const fullBatch = (s: State): Batch => ({
  world: worldRec(s.k), players: s.inv.map((n, i) => playerRec(i, n)), chunks: s.box.map((n, j) => chestRec(j, n, s.rev[j])),
});
/** The next commit: the world and only the two records the move touched, as a save after one transfer would hold. */
function nextBatch(s: State): Batch {
  s.k++;
  const touched = move(s), b: Batch = { world: worldRec(s.k), players: [], chunks: [] };
  for (const i of touched) {
    if (i < PLAYERS) b.players.push(playerRec(i, s.inv[i]));
    else b.chunks.push(chestRec(i - PLAYERS, s.box[i - PLAYERS], s.rev[i - PLAYERS]));
  }
  return b;
}
const coinsOf = (c: ChunkRecord | null): number => (c?.ents[0]?.data?.items?.[0]?.n as number) ?? -1;

/** Opens the folder, checks it holds exactly state k for the k its world names, every item counted; returns k (-1: empty). */
async function verify(dir: string, opt: DiskOptions = {}): Promise<number> {
  const st = new DiskStorage(dir, { log: () => {}, ...opt });
  const w = await st.open();
  try {
    if (!w) {
      assert.equal((await readdir(join(dir, 'players')).catch(() => [])).filter((n) => n.endsWith('.json')).length, 0, 'no world, no players');
      return -1;
    }
    const k = (w.state as unknown as { tick: number }).tick, want = stateAt(k);
    let sum = 0;
    for (let i = 0; i < PLAYERS; i++) {
      const p = await st.loadPlayer('p' + i);
      assert.ok(p, `player ${i} at commit ${k}`);
      assert.equal((p.inv as { coins: number }).coins, want.inv[i], `player ${i} at commit ${k}`);
      sum += want.inv[i];
    }
    for (let j = 0; j < CHESTS.length; j++) {
      const c = await st.loadChunk(...CHESTS[j]);
      assert.ok(c, `chest ${j} at commit ${k}`);
      assert.equal(coinsOf(c), want.box[j], `chest ${j} at commit ${k}`);
      assert.equal(c.rev, want.rev[j]);
      assert.deepEqual(c.data, chestRec(j, want.box[j], want.rev[j]).data);
      sum += coinsOf(c);
    }
    assert.equal(sum, TOTAL, 'items neither vanish nor duplicate');
    return k;
  } finally { await st.close(); }
}
/** A backup folder must hold one whole commit too. */
async function verifyBackup(bdir: string): Promise<number> {
  const scratch = bdir + '.check';
  await rm(scratch, { recursive: true, force: true });
  await cp(bdir, scratch, { recursive: true });
  try { return await verify(scratch, { backupInterval: 1e6 }); } finally { await rm(scratch, { recursive: true, force: true }); }
}

// ---- the writer, in a child process ----

const POINTS = ['tmp', 'journal', 'rename', 'renamed', 'done'];
async function writer(dir: string, killAt: number, point: string, nth: number): Promise<void> {
  let seen = 0, k = -1;
  const st = new DiskStorage(dir, {
    log: () => {}, backupInterval: 0.1, backupKeep: 3,
    hook: (p) => { if (p === point && k === killAt && ++seen === nth) process.kill(process.pid, 'SIGKILL'); },
  });
  const w = await st.open();
  let s: State;
  if (!w) { s = stateAt(0); k = 0; await st.commit(fullBatch(s)); } else s = stateAt((w.state as unknown as { tick: number }).tick);
  process.stdout.write('ready\n');
  // a writer told where to die stops after that commit even when the step did not come (a commit of fewer files)
  while (s.k < COMMITS && (killAt < 0 || s.k < killAt)) { k = s.k + 1; await st.commit(nextBatch(s)); }
  await st.close();
}

const bundle = process.argv[1];
function spawnWriter(dir: string, killAt = -1, point = '', nth = 0): ChildProcess {
  return spawn(process.execPath, [bundle, 'writer', dir, String(killAt), point, String(nth)], { stdio: ['ignore', 'pipe', 'inherit'] });
}
const exited = (c: ChildProcess): Promise<{ code: number | null; sig: NodeJS.Signals | null }> =>
  new Promise((res) => { if (c.exitCode !== null || c.signalCode !== null) res({ code: c.exitCode, sig: c.signalCode }); else c.on('exit', (code, sig) => res({ code, sig })); });
const ready = (c: ChildProcess): Promise<void> => new Promise((res) => { let b = ''; c.stdout!.on('data', (d) => { b += d; if (b.includes('ready')) res(); }); c.on('exit', () => res()); });

// ---- helpers for the tests in this process ----

let base = '';
async function fresh(name: string): Promise<string> {
  if (!base) base = await mkdtemp(join(tmpdir(), 'pc-disk-'));
  const d = join(base, name);
  await rm(d, { recursive: true, force: true });
  await mkdir(d, { recursive: true });
  return d;
}
const quiet: DiskOptions = { log: () => {}, backupInterval: 1e6 };
async function opened(dir: string, opt: DiskOptions = {}): Promise<DiskStorage> {
  const st = new DiskStorage(dir, { ...quiet, ...opt });
  await st.open();
  return st;
}
/** A world at commit 3 with a backup of commit 2 and an older one of commit 1. */
async function seeded(name: string): Promise<{ dir: string; stamps: string[] }> {
  const dir = await fresh(name), s = stateAt(0);
  let t = Date.UTC(2026, 10, 13, 10, 0, 0);
  const st = await opened(dir, { now: () => t });
  await st.commit(fullBatch(s));
  await st.commit(nextBatch(s));
  t += 60_000; const b1 = await st.backup();
  await st.commit(nextBatch(s));
  t += 60_000; const b2 = await st.backup();
  await st.commit(nextBatch(s));
  await st.close();
  // the shutdown backup would hold commit 3 itself; without it the backups are older than the world
  for (const b of await listBackups(dir)) if (b !== b1 && b !== b2) await rm(join(dir, 'backups', b), { recursive: true });
  assert.deepEqual(await listBackups(dir), [b2, b1]);
  assert.equal(await verify(dir), 3);
  return { dir, stamps: [b1!, b2!] };
}
const exists = (p: string): Promise<boolean> => stat(p).then(() => true, () => false);
const rejects = async (p: Promise<unknown>, code: string): Promise<StorageError> => {
  try { await p; } catch (e) { assert.ok(e instanceof StorageError, String(e)); assert.equal(e.code, code, e.message); return e; }
  assert.fail(`expected StorageError ${code}`);
};
/** The region file of chest j. */
const regionPath = (dir: string, j: number): string => { const [d, cx, cz] = CHESTS[j]; return join(dir, 'chunks', String(d), `r.${cx >> 5}.${cz >> 5}.bin`); };

/** A write layer with a byte budget: past it every write fails as a full disk does. */
class QuotaIO implements DiskIO {
  used = 0;
  constructor(public budget: number) {}
  async write(path: string, data: Uint8Array | string): Promise<void> {
    const n = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
    if (this.used + n > this.budget) {
      // a full disk often takes part of the file first
      await writeFile(path, typeof data === 'string' ? data.slice(0, 10) : data.subarray(0, 10));
      throw Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });
    }
    this.used += n;
    await nodeIO.write(path, data);
  }
}
async function noTemps(dir: string): Promise<void> {
  const all = await readdir(dir, { recursive: true });
  assert.deepEqual(all.filter((n) => String(n).endsWith('.tmp') || String(n).includes('commit.json')), [], 'no .tmp files and no journal');
}

function tests(): void {
  test('a region file: round trip, negative coordinates, CRC, magic, a newer format', () => {
    const recs = [{ ...chestRec(3, 9, 4), cx: -64, cz: -1 }, { ...chestRec(3, 1, 2), cx: -33, cz: -1, rev: 0 }];
    const b = encodeRegion(recs);
    assert.equal(String.fromCharCode(...b.subarray(0, 4)), 'PCR1');
    const back = decodeRegion(b, 0, -2, -1);
    assert.equal(back.size, 2);
    assert.deepEqual(back.get(localKey(-64, -1)), recs[0]);
    assert.deepEqual(back.get(localKey(-33, -1)), recs[1]);
    assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
    const flip = b.slice(); flip[40] ^= 1;
    assert.throws(() => decodeRegion(flip, 0, -2, -1), (e: unknown) => e instanceof FormatError && e.kind === 'corrupt' && /CRC/.test(e.message));
    const magic = b.slice(); magic[0] = 0x58;
    assert.throws(() => decodeRegion(magic, 0, -2, -1), (e: unknown) => e instanceof FormatError && e.kind === 'corrupt');
    const v2 = b.slice(); v2[3] = 0x32;
    assert.throws(() => decodeRegion(v2, 0, -2, -1), (e: unknown) => e instanceof FormatError && e.kind === 'version');
    assert.throws(() => decodeRegion(b.subarray(0, b.length - 3), 0, -2, -1), FormatError);
    assert.equal(decodeRegion(encodeRegion([]), 0, 0, 0).size, 0);
  });

  test('commit and reload; the region listing answers unedited chunks without touching a file; a chunk saved empty leaves its region', async () => {
    const dir = await fresh('basic'), s = stateAt(0);
    const st = await opened(dir);
    assert.equal(st.regionCount, 0);
    await st.commit(fullBatch(s));
    for (let i = 0; i < 5; i++) await st.commit(nextBatch(s));
    assert.equal(st.regionCount, 6, 'two chests share a region');
    await st.close();
    assert.equal(await verify(dir), 5);
    const files = (await readdir(join(dir, 'chunks'), { recursive: true })).map(String).sort();
    assert.deepEqual(files, ['0', '0/r.-2.-1.bin', '0/r.0.0.bin', '0/r.0.2.bin', '0/r.1.0.bin', '1', '1/r.0.0.bin', '2', '2/r.-4.0.bin']);

    const again = await opened(dir);
    assert.equal(again.regionCount, 6);
    for (let cx = 100; cx < 140; cx++) assert.equal(await again.loadChunk(0, cx, 9), null);
    assert.equal(again.regionsHeld, 0, 'chunks of regions with no file cost no read and no cache entry');
    assert.equal(await again.loadChunk(0, 2, 2), null, 'an unedited chunk of an edited region');
    assert.equal(again.regionsHeld, 1);
    await again.commit({ players: [], chunks: [{ ...chestRec(1, 0, 9), rev: 0, ents: [] }] });
    assert.equal(await again.loadChunk(...CHESTS[1]), null);
    assert.ok(await again.loadChunk(...CHESTS[0]), 'its neighbour in the region stays');
    await again.close();
    const last = await opened(dir);
    assert.equal(await last.loadChunk(...CHESTS[1]), null);
    assert.equal(coinsOf(await last.loadChunk(...CHESTS[0])), stateAt(5).box[0]);
    await last.close();
  });

  test('kill -9 at random points of 50 commits: every reload holds one whole commit and every item', async () => {
    const dir = await fresh('kill');
    const seed = Date.now() >>> 0, r = mulberry(seed);
    console.log(`# kill test seed ${seed}`);
    let last = -1, rounds = 0, midway = 0;
    const hit = new Map<string, number>();
    while (last < COMMITS && rounds < 300) {
      rounds++;
      let child: ChildProcess, point = '', at = -1;
      // the first rounds kill at each step of a commit twice, so that every step is hit before the commits run out
      const inside = rounds <= 2 * POINTS.length || rounds % 2 === 1;
      if (inside) {
        // inside: SIGKILL at a chosen step of the next commit or the one after
        point = POINTS[(rounds - 1) % POINTS.length];
        at = Math.min(COMMITS, last + 1 + Math.floor(r() * 2));
        // a commit writes at least two files (the world and one region or player)
        const nth = point === 'tmp' || point === 'rename' ? 1 + Math.floor(r() * 2) : 1;
        child = spawnWriter(dir, at, point, nth);
      } else {
        child = spawnWriter(dir);
        await ready(child);
        // the first commit after a start is behind a backup; the window reaches past it
        await new Promise((res) => setTimeout(res, r() * 400));
        child.kill('SIGKILL');
      }
      const end = await exited(child);
      if (!point && (await readdir(dir, { recursive: true })).some((n) => String(n).includes('.tmp') || n === 'commit.json')) midway++;
      const k = await verify(dir);
      assert.ok(k >= last, `a reload never goes back (${last} then ${k})`);
      if (process.env.DISK_DEBUG) console.log(`# round ${rounds} ${point || 'outside'} ${last} -> ${k} ${end.sig ?? end.code}`);
      if (point && end.sig === 'SIGKILL') {
        // the journal is the line: killed before it the commit is not there, from it on it is finished at start
        assert.equal(k, point === 'tmp' ? at - 1 : at, `killed at ${point} of commit ${at}`);
        hit.set(point, (hit.get(point) ?? 0) + 1);
      }
      last = k;
    }
    assert.equal(last, COMMITS, `reached the last commit in ${rounds} rounds`);
    for (const p of POINTS) assert.ok((hit.get(p) ?? 0) > 0, `a kill at "${p}"`);
    const backups = await listBackups(dir);
    assert.ok(backups.length > 0 && backups.length <= 3, `backups kept: ${backups.length}`);
    for (const b of backups) assert.ok((await verifyBackup(join(dir, 'backups', b))) >= 0, `backup ${b} holds one whole commit`);
    const left = (await readdir(join(dir, 'backups'))).filter((n) => n.startsWith('.tmp-'));
    assert.deepEqual(left, [], 'half-made backups are cleared at start');
    console.log(`# ${rounds} rounds, kills inside a commit: ${[...hit].map(([p, n]) => `${p} ${n}`).join(', ')}; kills from outside that left a commit or a backup half done: ${midway}`);
  });

  test('world.json unreadable or of a newer format: refuse, name the newest backup that reads and the command, choose nothing', async () => {
    const { dir, stamps } = await seeded('world-bad');
    await writeFile(join(dir, 'world.json'), '{"format":2,"id":"w","se');
    let e = await rejects(new DiskStorage(dir, quiet).open(), 'corrupt');
    assert.match(e.message, new RegExp(`newest backup that reads is ${stamps[1]}`));
    assert.ok(e.message.includes(`npm start -- --data ${dir} --restore ${stamps[1]}`), e.message);
    assert.ok(!(await exists(join(dir, 'server.lock'))), 'a refusal lets go of the folder');
    // a backup whose world does not read is passed over
    await writeFile(join(dir, 'backups', stamps[1], 'world.json'), 'garbage');
    e = await rejects(new DiskStorage(dir, quiet).open(), 'corrupt');
    assert.match(e.message, new RegExp(`newest backup that reads is ${stamps[0]}`));
    await writeFile(join(dir, 'world.json'), JSON.stringify({ ...worldRec(3), format: 3 }));
    e = await rejects(new DiskStorage(dir, quiet).open(), 'version');
    assert.equal(JSON.parse(await readFile(join(dir, 'world.json'), 'utf8')).format, 3, 'nothing is rewritten');
    await rm(join(dir, 'world.json'));
    await rejects(new DiskStorage(dir, quiet).open(), 'corrupt');

    // `--restore` as the server takes it: restored, then opened
    const logs: string[] = [];
    await rejects(new DiskStorage(dir, { ...quiet, restore: stamps[1] }).open(), 'corrupt');
    const st = new DiskStorage(dir, { ...quiet, log: (_l, m) => logs.push(m), restore: stamps[0], now: () => Date.UTC(2026, 10, 13, 11, 0, 0) });
    assert.equal(((await st.open())!.state as unknown as { tick: number }).tick, 1);
    await st.close();
    assert.ok(logs.some((m) => m.includes('pre-restore-20261113-110000')), logs.join('; '));
    assert.equal(await verify(dir), 1);
    await writeFile(join(dir, 'world.json'), 'garbage again');
    const { pre } = await restoreBackup(dir, stamps[0], { now: () => Date.UTC(2026, 10, 13, 12, 0, 0) });
    assert.equal(pre, join('backups', 'pre-restore-20261113-120000'));
    assert.ok(await exists(join(dir, pre, 'players', 'p0.json')), 'the files it replaced are kept');
    assert.equal(await readFile(join(dir, pre, 'world.json'), 'utf8'), 'garbage again', 'the unreadable world is kept');
    assert.equal(await verify(dir), 1, 'back as backup 1 held it');
    assert.ok((await listBackups(dir)).every((b) => !b.startsWith('pre-')), 'pre-restore folders are not rotated');
  });

  test('restore by hand: the command line lists backups and restores one', async () => {
    const { dir, stamps } = await seeded('world-cli');
    await writeFile(join(dir, 'world.json'), 'not json');
    const cli = (...a: string[]) => spawnSync(process.execPath, ['scripts/run.mjs', 'server/backup.ts', '--data', dir, ...a], { cwd: process.cwd(), encoding: 'utf8' });
    const list = cli('--list');
    assert.equal(list.status, 0, list.stderr);
    assert.deepEqual(list.stdout.trim().split('\n'), [`${stamps[1]}  reads`, `${stamps[0]}  reads`]);
    const held = await opened(await fresh('unused'));
    await held.close();
    const res = cli('--restore', stamps[1]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, new RegExp(`Restored .* from backups/${stamps[1]}`));
    assert.equal(await verify(dir), 2);
    // a running server holds the folder: the restore refuses
    const st = await opened(dir);
    const busy = cli('--restore', stamps[0]);
    assert.notEqual(busy.status, 0);
    assert.match(busy.stderr, /Another server/);
    await st.close();
  });

  test('a restore cut short is finished by running it again; until then the storage will not open', async () => {
    const { dir, stamps } = await seeded('restore-cut');
    // the state a crash leaves between moving the current files aside and putting the backup in place
    await cp(join(dir, 'backups', stamps[0]), join(dir, 'restore.tmp'), { recursive: true });
    await mkdir(join(dir, 'backups', 'pre-restore-x'), { recursive: true });
    await writeFile(join(dir, 'restore.json'), JSON.stringify({ stamp: stamps[0], pre: 'pre-restore-x' }));
    await rename(join(dir, 'players'), join(dir, 'backups', 'pre-restore-x', 'players'));
    const e = await rejects(new DiskStorage(dir, quiet).open(), 'corrupt');
    assert.match(e.message, new RegExp(`--restore ${stamps[0]}`));
    await rejects(restoreBackup(dir, stamps[1]), 'io');
    await restoreBackup(dir, stamps[0]);
    assert.equal(await verify(dir), 1);
    const pre = join(dir, 'backups', 'pre-restore-x');
    assert.equal(JSON.parse(await readFile(join(pre, 'world.json'), 'utf8')).state.tick, 3, 'the current world was moved aside');
    assert.ok(await exists(join(pre, 'players', 'p0.json')));
  });

  test('a player file unreadable: renamed aside, the newest backup copy that reads is used and kept, the player is told', async () => {
    const { dir, stamps } = await seeded('player-bad');
    const notes: DiskNotice[] = [];
    await writeFile(join(dir, 'players', 'p2.json'), '{"v":1,"id":"p2","inv":');
    // the newest backup's copy is damaged too: the older one is used
    await writeFile(join(dir, 'backups', stamps[1], 'players', 'p2.json'), '\u0000\u0000');
    let st = await opened(dir, { notice: (n) => notes.push(n) });
    const p = await st.loadPlayer('p2');
    assert.equal((p!.inv as { coins: number }).coins, stateAt(1).inv[2]);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].kind, 'player'); assert.equal(notes[0].id, 'p2'); assert.equal(notes[0].from, stamps[0]);
    assert.match(notes[0].text, /could not be read/);
    const bad = (await readdir(join(dir, 'players'))).filter((n) => n.startsWith('p2.json.bad-'));
    assert.equal(bad.length, 1);
    assert.match(bad[0], /^p2\.json\.bad-\d{8}-\d{6}$/);
    await st.close();
    st = await opened(dir, { notice: (n) => notes.push(n) });
    assert.equal(((await st.loadPlayer('p2'))!.inv as { coins: number }).coins, stateAt(1).inv[2], 'the copy was written back');
    assert.equal(notes.length, 1);
    // no backup holds it: a fresh player
    await st.commit({ players: [playerRec(9, 5)], chunks: [] });
    await writeFile(join(dir, 'players', 'p9.json'), 'x');
    assert.equal(await st.loadPlayer('p9'), null);
    assert.equal(notes[1].from, null);
    assert.match(notes[1].text, /start afresh/);
    // a newer format is not rewritten
    await writeFile(join(dir, 'players', 'p3.json'), JSON.stringify({ ...playerRec(3, 1), v: 2 }));
    await rejects(st.loadPlayer('p3'), 'version');
    assert.equal(JSON.parse(await readFile(join(dir, 'players', 'p3.json'), 'utf8')).v, 2);
    await rejects(st.loadPlayer('../world'), 'io');
    await st.close();
  });

  test('a region file with a bad CRC, a bad magic or cut short: renamed aside, the backup copy that validates is used, chat is told', async () => {
    const { dir, stamps } = await seeded('region-bad');
    const notes: DiskNotice[] = [];
    const s1 = stateAt(2);
    // chest 2 in the region of its own: one flipped bit
    const b = await readFile(regionPath(dir, 2)); b[30] ^= 4; await writeFile(regionPath(dir, 2), b);
    // chests 0 and 1 share a region: bad magic
    const m = await readFile(regionPath(dir, 0)); m.write('XXXX', 0); await writeFile(regionPath(dir, 0), m);
    // chest 5, realm 1: cut short, and no backup copy that validates
    const t = await readFile(regionPath(dir, 5)); await writeFile(regionPath(dir, 5), t.subarray(0, t.length >> 1));
    for (const s of stamps) await writeFile(regionPath(join(dir, 'backups', s), 5), 'PCR1');
    let st = await opened(dir, { notice: (n) => notes.push(n) });
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[2])), s1.box[2]);
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[0])), s1.box[0]);
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[1])), s1.box[1]);
    assert.equal(await st.loadChunk(...CHESTS[5]), null, 'no copy: the region counts as unedited');
    assert.deepEqual(notes.map((n) => [n.kind, n.id, n.from]), [['region', '0/1/0', stamps[1]], ['region', '0/0/0', stamps[1]], ['region', '1/0/0', null]]);
    assert.match(notes[2].text, /as it was first made/);
    for (const j of [0, 2, 5]) {
      const [d] = CHESTS[j], names = await readdir(join(dir, 'chunks', String(d)));
      assert.ok(names.some((n) => /\.bin\.bad-\d{8}-\d{6}$/.test(n)), `chest ${j}: the bad file is kept`);
    }
    // a commit into a damaged region that was never loaded keeps the backup's other chunks
    const c = await readFile(regionPath(dir, 4)); c[c.length - 1] ^= 255; await writeFile(regionPath(dir, 4), c);
    await st.commit({ players: [], chunks: [{ ...chestRec(4, 77, 50), cx: CHESTS[4][1] + 1 }] });
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[4])), s1.box[4]);
    await st.close();
    st = await opened(dir, { notice: (n) => notes.push(n) });
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[2])), s1.box[2], 'the copy was written back');
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[4])), s1.box[4]);
    assert.equal(coinsOf(await st.loadChunk(CHESTS[4][0], CHESTS[4][1] + 1, CHESTS[4][2])), 77);
    assert.equal(await st.loadChunk(...CHESTS[5]), null);
    assert.equal(notes.length, 4, 'nothing more to repair');
    const v = await readFile(regionPath(dir, 3)); v.write('PCR2', 0); await writeFile(regionPath(dir, 3), v);
    await rejects(st.loadChunk(...CHESTS[3]), 'version');
    await st.close();
  });

  test('the journal: an unreadable one refuses to start, a whole one is finished, stray temporaries are dropped', async () => {
    const { dir } = await seeded('journal');
    // a commit of 4 stopped after its journal: two files in place, two still .tmp
    const s = stateAt(3), b = nextBatch(s);
    const names = ['world.json', ...b.players.map((p) => `players/${p.id}.json`), ...b.chunks.map((c) => regionPath('', CHESTS.findIndex((x) => x[1] === c.cx && x[0] === c.dim && x[2] === c.cz)))];
    const st0 = await opened(dir);
    await st0.close();
    // build the .tmp files the way the commit would, from a copy committed elsewhere
    const side = await fresh('journal-side');
    await cp(dir, side, { recursive: true });
    const st1 = await opened(side);
    await st1.commit(b);
    await st1.close();
    for (const n of names) await cp(join(side, n), join(dir, n + '.tmp'));
    await writeFile(join(dir, 'commit.json'), JSON.stringify({ names }));
    await rename(join(dir, names[0] + '.tmp'), join(dir, names[0]));
    await writeFile(join(dir, 'players', 'stray.json.tmp'), 'half');
    await mkdir(join(dir, 'backups', '.tmp-20260101-000000'), { recursive: true });
    assert.equal(await verify(dir), 4, 'finished at start');
    await noTemps(join(dir, 'players'));
    assert.ok(!(await exists(join(dir, 'commit.json'))));
    assert.ok(!(await exists(join(dir, 'backups', '.tmp-20260101-000000'))));
    // a journal of strays alone (crash in step 1 of an earlier run) changes nothing
    await writeFile(join(dir, 'world.json.tmp'), JSON.stringify(worldRec(99)));
    assert.equal(await verify(dir), 4);
    await writeFile(join(dir, 'commit.json'), '{"names":["world.js');
    const e = await rejects(new DiskStorage(dir, quiet).open(), 'corrupt');
    assert.match(e.message, /commit\.json/);
    assert.match(e.message, /--restore \d{8}-\d{6}/);
  });

  test('server.lock: a second storage on one folder refuses, a dead holder or an unreadable lock is taken over', async () => {
    const dir = await fresh('lock');
    const a = await opened(dir);
    assert.equal((await readFile(join(dir, 'server.lock'), 'utf8')).trim(), String(process.pid));
    const e = await rejects(new DiskStorage(dir, quiet).open(), 'locked');
    assert.match(e.message, new RegExp(`pid ${process.pid}`));
    await a.close();
    assert.ok(!(await exists(join(dir, 'server.lock'))));
    const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout;
    await writeFile(join(dir, 'server.lock'), dead);
    await (await opened(dir)).close();
    await writeFile(join(dir, 'server.lock'), '\u0000garbage');
    await (await opened(dir)).close();
  });

  test('a full disk (a byte budget at the write layer): nothing is renamed, no temporaries stay, backups wait, the retry succeeds', async () => {
    const dir = await fresh('quota'), io = new QuotaIO(1e9), s = stateAt(0), logs: string[] = [];
    const st = await opened(dir, { io, log: (l, m) => logs.push(`${l} ${m}`) });
    await st.commit(fullBatch(s));
    for (let i = 0; i < 3; i++) await st.commit(nextBatch(s));
    io.budget = io.used + 500;
    const b = nextBatch(s);
    const e = await rejects(st.commit(b), 'full');
    assert.match(e.message, /no space/);
    assert.ok(st.saveFailing);
    await noTemps(dir);
    assert.equal(await st.backup(), null, 'backups are skipped while saves fail');
    assert.ok(logs.some((l) => l.includes('skipped: saves are failing')));
    // what was durable is all that a reload finds
    const side = await fresh('quota-side');
    await cp(dir, side, { recursive: true });
    await rm(join(side, 'server.lock'));
    assert.equal(await verify(side), 3);
    io.budget = 1e9;
    await st.commit(b);
    assert.ok(!st.saveFailing);
    assert.ok(await st.backup());
    await st.close();
    assert.equal(await verify(dir), 4);
  });

  test('a full disk (a real 1 MB volume)', { skip: process.platform !== 'darwin' && 'a small volume needs hdiutil (macOS); the byte-budget test covers the logic' }, async () => {
    const home = await fresh('volume'), img = join(home, 'vol.dmg'), mnt = join(home, 'mnt');
    const sh = (cmd: string, ...a: string[]) => spawnSync(cmd, a, { encoding: 'utf8' });
    let r = sh('hdiutil', 'create', '-size', '1m', '-fs', 'HFS+', '-volname', 'pcdisk', '-layout', 'NONE', img, '-quiet');
    assert.equal(r.status, 0, r.stderr);
    r = sh('hdiutil', 'attach', img, '-mountpoint', mnt, '-nobrowse', '-noautoopen', '-quiet');
    assert.equal(r.status, 0, r.stderr);
    try {
      const dir = join(mnt, 'data'), s = stateAt(0);
      const st = await opened(dir);
      await st.commit(fullBatch(s));
      for (let i = 0; i < 3; i++) await st.commit(nextBatch(s));
      // fill what is left with one file the operator can delete
      const free = Math.max(0, Number(sh('df', '-k', mnt).stdout.trim().split('\n')[1].split(/\s+/)[3]) * 1024 - 2048);
      await writeFile(join(mnt, 'filler'), Buffer.alloc(free));
      let failed: StorageError | null = null, b: Batch | null = null;
      for (let i = 0; i < 20 && !failed; i++) {
        b = nextBatch(s);
        // a big edit away from the chests fills the last bytes fast
        b.chunks.push({ dim: 0, cx: 300 + i, cz: 0, rev: 1, pal: 0, enc: 1, data: new Uint8Array(64 * 1024).fill(i + 1), ents: [] });
        try { await st.commit(b); } catch (e) { failed = e as StorageError; }
      }
      assert.ok(failed instanceof StorageError, 'the volume filled up');
      assert.equal(failed.code, 'full', failed.message);
      await noTemps(dir);
      assert.equal(await st.backup(), null);
      await rm(join(mnt, 'filler'));
      await st.commit(b!);
      await st.close();
      assert.equal(await verify(dir), s.k, 'the retry after the disk recovered holds everything');
    } finally {
      sh('hdiutil', 'detach', mnt, '-force', '-quiet');
    }
  });

  test('backups: before the first commit, on the timer only after a commit, at shutdown, rotated to the newest few', async () => {
    const dir = await fresh('rotate'), s = stateAt(0);
    let t = Date.UTC(2026, 10, 13, 8, 0, 0);
    const now = () => t;
    let st = await opened(dir, { now, backupKeep: 3 });
    await st.commit(fullBatch(s));
    assert.deepEqual(await listBackups(dir), [], 'a new world has nothing to back up before its first commit');
    await st.close();
    assert.deepEqual(await listBackups(dir), ['20261113-080000'], 'at shutdown, since something was committed');
    st = await opened(dir, { now, backupKeep: 3 });
    t += 1000;
    await st.commit(nextBatch(s));
    assert.deepEqual(await listBackups(dir), ['20261113-080001', '20261113-080000'], 'before the first commit after start');
    // two backups asked for within one second get names one second apart
    assert.equal(await st.backup(), '20261113-080002');
    for (let i = 0; i < 3; i++) { t += 60_000; await st.commit(nextBatch(s)); await st.backup(); }
    assert.deepEqual(await listBackups(dir), ['20261113-080301', '20261113-080201', '20261113-080101']);
    await mkdir(join(dir, 'backups', 'pre-restore-20200101-000000'));
    await st.close();
    assert.deepEqual(await listBackups(dir), ['20261113-080301', '20261113-080201', '20261113-080101'], 'nothing committed since the last: no shutdown backup');
    assert.ok(await exists(join(dir, 'backups', 'pre-restore-20200101-000000')));
    for (const b of await listBackups(dir)) assert.ok((await verifyBackup(join(dir, 'backups', b))) > 0);

    st = await opened(dir, { now, backupKeep: 3, backupInterval: 0.05 });
    t += 60_000;
    await st.commit(nextBatch(s));
    assert.equal((await listBackups(dir))[0], '20261113-080401', 'before the first commit after start');
    const newest = async () => (await listBackups(dir))[0];
    const changes = async (from: string): Promise<string> => {
      for (let i = 0; i < 250; i++) { const n = await newest(); if (n !== from) return n; await new Promise((r) => setTimeout(r, 20)); }
      return from;
    };
    const first = await changes('20261113-080401');
    assert.equal(first, '20261113-080402', 'the timer, after that commit');
    assert.equal(await verifyBackup(join(dir, 'backups', first)), s.k);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(await newest(), first, 'nothing committed since: the timer makes none');
    t += 60_000;
    await st.commit(nextBatch(s));
    await changes(first);
    const after = (await listBackups(dir))[0];
    assert.notEqual(after, first, 'the timer backs up after a commit');
    assert.equal(await verifyBackup(join(dir, 'backups', after)), s.k);
    await st.close();
  });

  test('regions leave memory after they linger unused, and load again', async () => {
    const dir = await fresh('linger'), s = stateAt(0);
    let t = 0;
    const st = await opened(dir, { now: () => t, regionLinger: 30 });
    await st.commit(fullBatch(s));
    assert.equal(st.regionsHeld, 6);
    t = 1000;
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(st.regionsHeld, 0);
    assert.equal(coinsOf(await st.loadChunk(...CHESTS[6])), START_BOX);
    assert.equal(st.regionsHeld, 1);
    // loads and commits at once: one read per region, and the commit's content wins
    const loads = CHESTS.map((c) => st.loadChunk(...c));
    const commit = st.commit(nextBatch(s));
    await Promise.all([...loads, commit]);
    await st.close();
    assert.equal(await verify(dir), 1);
  });

  test('SimHost on the folder storage: a mined block, an item and the place a player stood survive a stop and a start', async () => {
    const dir = await fresh('host');
    const env = { now: () => performance.now(), setTimer: (fn: () => void, ms: number) => setTimeout(fn, ms), clearTimer: (h: unknown) => clearTimeout(h as NodeJS.Timeout), log: () => {} };
    const opts = { id: 'w', name: 'Disk', seed: 7, seedText: '7', cheats: true, password: null, maxPlayers: 1, viewMax: 8, clock: 'manual' as const, saveEvery: 0, solo: true };
    let host = new SimHost(env, new DiskStorage(dir, quiet), new FlatSource(), opts);
    await host.start();
    let c = client(host);
    c.hello();
    await enter(host, c);
    const p = host.sim.players.get('local')!;
    c.pos = [c.pos[0] + 0.5, c.pos[1], c.pos[2]];
    c.s.move();
    await host.stepManual(1); c.s.pump();
    const x = Math.floor(c.pos[0]) + 1, y = GROUND - 1, z = Math.floor(c.pos[2]);
    await host.sim.handle(p, { t: 'cmd', id: 1, text: 'creative' });
    await host.sim.handle(p, { t: 'cmd', id: 2, text: 'give cobble 3' });
    c.s.act({ t: 'edit', seq: 1, k: 0, x, y, z, id: B.stone });
    for (let i = 0; i < 3; i++) { await host.stepManual(1); c.s.pump(); }
    assert.equal(host.sim.realms[0].getBlock(x, y, z), 0, 'mined');
    const tick = host.sim.tick, px = p.body.x;
    await host.stop();
    assert.equal((await listBackups(dir)).length, 1, 'the shutdown backup');
    host = new SimHost(env, new DiskStorage(dir, quiet), new FlatSource(), opts);
    await host.start();
    assert.equal(host.sim.world.name, 'Disk');
    assert.equal(host.sim.tick, tick);
    c = client(host);
    c.hello();
    await enter(host, c);
    const p2 = host.sim.players.get('local')!;
    assert.equal(p2.modes.creative, true);
    assert.ok(Math.abs(p2.body.x - px) < 1e-9);
    assert.ok(JSON.stringify(p2.inv.serialize()).includes('cobble'));
    assert.equal(host.sim.realms[0].getBlock(x, y, z), 0, 'the edit came back from its region file');
    await host.stop();
    assert.deepEqual((await readdir(dir)).sort(), ['backups', 'chunks', 'players', 'world.json']);
  });

  test('clean up', async () => { if (base) await rm(base, { recursive: true, force: true }); });
}

// ---- a minimal client for the SimHost test (as host.test.ts drives one) ----

const GROUND = 64;
function flat(dim: number, cx: number, cz: number): GenResult {
  const blocks = new Uint8Array(CVOL);
  for (let col = 0; col < 256; col++) for (let y = 0; y < GROUND; y++) blocks[(col << 8) | y] = y === 0 ? B.bedrock : B.stone;
  return { dim, cx, cz, blocks, biomes: new Uint8Array(256), ents: [], hash: hashBlocks(blocks) };
}
class FlatSource implements ChunkSource {
  jobs: [number, number, number][] = [];
  get pending(): number { return this.jobs.length; }
  request(dim: number, cx: number, cz: number): void { if (!this.jobs.some((j) => j[0] === dim && j[1] === cx && j[2] === cz)) this.jobs.push([dim, cx, cz]); }
  cancel(dim: number, cx: number, cz: number): void { this.jobs = this.jobs.filter((j) => !(j[0] === dim && j[1] === cx && j[2] === cz)); }
  poll(max: number): GenResult[] { return this.jobs.splice(0, Math.min(max, this.jobs.length)).map(([d, cx, cz]) => flat(d, cx, cz)); }
  dispose(): void { this.jobs = []; }
}
interface Client { s: Session; vox: ClientVoxels; got: S2C[]; tp: number; pos: [number, number, number]; hello(): void }
function client(host: SimHost): Client {
  const { transport, conn } = loopback({});
  host.connect(conn);
  const s = new Session(transport), vox = new ClientVoxels((cx, cz, key) => new VoxChunk(cx, cz, key)), got: S2C[] = [];
  vox.attach(s);
  const c: Client = { s, vox, got, tp: 0, pos: [0, 0, 0], hello: () => s.hello({ name: 'Ada', token: '', view: 8, build: 'test' }) };
  for (const t of ['welcome', 'tp'] as const) s.on(t, (m) => { got.push(m); });
  s.on('welcome', (m) => { c.tp = m.tp; c.pos = [m.pos[0], m.pos[1], m.pos[2]]; });
  s.on('tp', (m) => { c.tp = m.id; c.pos = [m.x, m.y, m.z]; });
  s.mover = () => ({ tp: c.tp, x: c.pos[0], y: c.pos[1], z: c.pos[2], vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: MV_GROUND });
  return c;
}
async function enter(host: SimHost, c: Client): Promise<void> {
  const run = async (n: number) => { for (let i = 0; i < n; i++) { await host.stepManual(1); c.s.pump(); } };
  await run(3);
  const w = c.got.find((m) => m.t === 'welcome');
  assert.ok(w && w.t === 'welcome', 'a welcome');
  const cx = Math.floor(c.pos[0] / 16), cz = Math.floor(c.pos[2] / 16);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ch = c.vox.create(cx + dx, cz + dz), g = flat(w.dim, cx + dx, cz + dz);
    c.vox.generated(ch, g.blocks, g.biomes, false, g.hash);
  }
  c.vox.flush(1e6);
  c.s.send({ t: 'ready', tp: c.tp });
  const inPlay = () => c.got.some((m) => m.t === 'tp' && !m.load);
  for (let i = 0; i < 200 && !inPlay(); i++) await run(1);
  assert.ok(inPlay(), 'in play');
}

if (process.argv[2] === 'writer') {
  writer(process.argv[3], Number(process.argv[4]), process.argv[5], Number(process.argv[6])).then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
} else {
  tests();
}
