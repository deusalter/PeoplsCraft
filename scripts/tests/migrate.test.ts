// Solo saves of the build before multiplayer, opened by this one: the real fixture (scripts/fixtures/legacy-v1.json)
// goes through IdbStorage on a stand-in IndexedDB, and every probe the smoke scenario `legacy` checks is found
// in what the migration made. Also the IndexedDB store of format 2 itself: one transaction per commit, versions,
// the world list and deletion.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { CVOL } from '../../src/core/constants';
import { BLOCKS } from '../../src/data/blocks';
import { useBlock } from '../../src/sim/actions';
import type { ChunkSource } from '../../src/sim/chunksource';
import type { Sink } from '../../src/sim/fx';
import { genChunk } from '../../src/sim/genjob';
import { LEGACY_DENSE_AT, LOCAL_ID, blockKeys, diffLegacyChunk, splitLegacyWorld } from '../../src/sim/migrate';
import { unrle } from '../../src/sim/rle';
import { Sim } from '../../src/sim/sim';
import { type PlayerRecord, StorageError, type WorldRecord } from '../../src/sim/storage';
import { EditMaps, SimChunks } from '../../src/sim/voxels';
import { DB_NAME, type IdbEnv, IdbStorage, deleteWorld, listWorlds } from '../../src/storage/idb';

// ---- a stand-in for IndexedDB: transactions on copies, committed whole when the last request is done ----

type Rec = Map<string, unknown>;
interface FStore { keyPath?: string; data: Rec }
interface FDb { version: number; stores: Map<string, FStore> }
interface Range { lo: string; hi: string }
const isRange = (k: unknown): k is Range => !!k && typeof k === 'object' && 'lo' in (k as object);
const inRange = (k: string, r: Range): boolean => k >= r.lo && k <= r.hi;
type Handler = ((ev: unknown) => void) | null;

class FReq { result: any; error: any = null; onsuccess: Handler = null; onerror: Handler = null; onupgradeneeded: Handler = null; onblocked: Handler = null }

class FakeIdb {
  readonly dbs = new Map<string, FDb>();
  /** The next read-write transaction aborts with an error of this name, and writes nothing. */
  failNext: string | null = null;
  opens = 0;
  env(): IdbEnv { return { open: (n, v) => this.open(n, v) as any, bound: (lo, hi) => ({ lo, hi }), now: () => performance.now() }; }
  open(name: string, version: number): FReq {
    const r = new FReq();
    this.opens++;
    setTimeout(() => {
      let d = this.dbs.get(name);
      if (d && d.version > version) { r.error = { name: 'VersionError', message: `database is at ${d.version}` }; r.onerror?.({}); return; }
      if (!d) { d = { version: 0, stores: new Map() }; this.dbs.set(name, d); }
      const c = new FConn(this, d);
      r.result = c;
      if (d.version < version) { d.version = version; r.onupgradeneeded?.({}); }
      r.onsuccess?.({});
    }, 0);
    return r;
  }
  store(name: string): Rec { return this.dbs.get(DB_NAME)!.stores.get(name)!.data; }
}
class FConn {
  onversionchange: Handler = null;
  readonly objectStoreNames = { contains: (n: string) => this.d.stores.has(n) };
  constructor(private idb: FakeIdb, private d: FDb) {}
  get version(): number { return this.d.version; }
  createObjectStore(n: string, opt?: { keyPath?: string }): void { this.d.stores.set(n, { keyPath: opt?.keyPath, data: new Map() }); }
  transaction(names: string | string[], mode: 'readonly' | 'readwrite'): FTx { return new FTx(this.idb, this.d, ([] as string[]).concat(names), mode); }
  close(): void {}
}
class FTx {
  oncomplete: Handler = null; onerror: Handler = null; onabort: Handler = null; error: any = null;
  private work = new Map<string, Rec>();
  private pending = 0; private over = false;
  constructor(private idb: FakeIdb, private d: FDb, private names: string[], private mode: string) {
    for (const n of names) if (!d.stores.has(n)) throw Object.assign(new Error('no store ' + n), { name: 'NotFoundError' });
    this.check();
  }
  objectStore(n: string): FObjStore {
    if (!this.names.includes(n)) throw new Error('store not in transaction: ' + n);
    return new FObjStore(this, n, this.d.stores.get(n)!.keyPath);
  }
  rec(n: string): Rec { let m = this.work.get(n); if (!m) { m = new Map(this.d.stores.get(n)!.data); this.work.set(n, m); } return m; }
  run(fn: () => unknown, write: boolean): FReq {
    if (write && this.mode !== 'readwrite') throw Object.assign(new Error('read-only transaction'), { name: 'ReadOnlyError' });
    const r = new FReq();
    this.pending++;
    queueMicrotask(() => {
      try { r.result = fn(); r.onsuccess?.({}); } catch (e) { r.error = e; r.onerror?.({}); }
      this.pending--; this.check();
    });
    return r;
  }
  abort(): void { this.over = true; this.onabort?.({}); }
  private check(): void {
    if (this.pending || this.over) return;
    setTimeout(() => {
      if (this.pending || this.over) return;
      this.over = true;
      if (this.mode === 'readwrite' && this.idb.failNext) { this.error = { name: this.idb.failNext, message: 'stand-in failure' }; this.idb.failNext = null; this.onabort?.({}); return; }
      for (const [n, m] of this.work) this.d.stores.get(n)!.data = m;
      this.oncomplete?.({});
    }, 0);
  }
}
class FObjStore {
  constructor(private t: FTx, private n: string, private keyPath?: string) {}
  get(k: string): FReq { return this.t.run(() => structuredClone(this.t.rec(this.n).get(k)), false); }
  put(v: any, k?: string): FReq { const v2 = structuredClone(v); return this.t.run(() => { this.t.rec(this.n).set(this.keyPath ? v2[this.keyPath] : k!, v2); }, true); }
  delete(k: string | Range): FReq {
    return this.t.run(() => { const m = this.t.rec(this.n); if (isRange(k)) { for (const key of [...m.keys()]) if (inRange(key, k)) m.delete(key); } else m.delete(k); }, true);
  }
  getAll(): FReq { return this.t.run(() => [...this.t.rec(this.n).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((e) => structuredClone(e[1])), false); }
  getAllKeys(q?: Range): FReq { return this.t.run(() => [...this.t.rec(this.n).keys()].filter((k) => !q || inRange(k, q)).sort(), false); }
}

// ---- the fixture ----

// the test runs bundled from out/run, with the repository as its working directory
const FILE = resolve('scripts/fixtures/legacy-v1.json');
const dec = (v: any): any => {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === 'object') {
    if (typeof v.$u8 === 'string') return new Uint8Array(Buffer.from(v.$u8, 'base64'));
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]));
  }
  return v;
};
const fixture = JSON.parse(readFileSync(FILE, 'utf8'));
const X = fixture.expect;
const MAIN = X.main.id as string, DEAD = X.dead.id as string;

/** A profile as the old build left it: database version 1 with its two stores, filled from the fixture. */
function oldProfile(): FakeIdb {
  const idb = new FakeIdb(), worlds: Rec = new Map(), chunks: Rec = new Map();
  for (const w of fixture.worlds) worlds.set(w.id, dec(w));
  for (const [k, v] of fixture.chunks) chunks.set(k, dec(v));
  idb.dbs.set(DB_NAME, { version: 1, stores: new Map([['worlds', { keyPath: 'id', data: worlds }], ['chunks', { data: chunks }]]) });
  return idb;
}

const noSource: ChunkSource = { request() {}, cancel() {}, poll: () => [], pending: 0, dispose() {} };
const sink: Sink = { emit() {}, send() {}, broadcast() {} };

/** The migrated world as the sim will run it: a Sim on sim chunks over IdbStorage, every chunk of the fixture integrated. */
async function opened(idb: FakeIdb, id: string) {
  const st = new IdbStorage(id, idb.env()), world = (await st.open())!;
  assert.ok(world, 'the world opens');
  const edits = new EditMaps(st, world.palettes);
  const sim = new Sim(world, { cheats: true, maxPlayers: 1, solo: true, manual: true }, { sink, chunks: noSource, edits, log() {}, requestSave() {} });
  const stores = sim.realms.map((r) => r.chunks);
  const keys = fixture.chunks.map(([k]: [string]) => k.split('|')).filter((k: string[]) => k[0] === id);
  for (const [, d, cx, cz] of keys) {
    const dim = +d, e = await edits.load(dim, +cx, +cz), g = genChunk(world.seed, dim, +cx, +cz);
    stores[dim].integrate({ dim, cx: +cx, cz: +cz, ...g }, e);
  }
  const rec = await st.loadPlayer(LOCAL_ID);
  return { st, world, edits, stores, sim, rec, key: (dim: number, x: number, y: number, z: number) => BLOCKS[stores[dim].getBlock(x, y, z)].key };
}

// ---- splitLegacyWorld ----

test('splitLegacyWorld: the shared state, the one player and the palettes of the main world', () => {
  const legacy = dec(fixture.worlds.find((w: any) => w.id === MAIN)), d = legacy.data;
  const { world, player } = splitLegacyWorld(legacy);
  assert.equal(world.format, 2); assert.equal(world.owner, LOCAL_ID); assert.equal(world.seed, legacy.seed);
  assert.deepEqual(world.names, { local: { name: 'Player', seen: legacy.played } });
  assert.deepEqual(world.state.flags, d.flags);
  assert.equal(world.state.clock, d.clock); assert.equal(world.state.quest, d.quests);
  assert.deepEqual(world.state.homes, d.npcs); assert.deepEqual(world.state.worldSpawn, d.worldSpawn);
  assert.deepEqual([world.state.gates, world.state.summons, world.state.owed], [[], [], {}]);
  assert.deepEqual(world.palettes[0], d.palettes[0], 'the old table is kept at its index');
  assert.deepEqual(world.palettes[world.palettes.length - 1], blockKeys(), 'the current table is last');
  assert.ok(player);
  assert.deepEqual(player!.pos, d.player); assert.equal(player!.dim, d.dim);
  assert.deepEqual(player!.bed, d.spawn); assert.deepEqual(player!.portalReturn, d.portalReturn);
  assert.deepEqual(player!.inv, d.inv); assert.deepEqual(player!.stats, d.stats);
  assert.deepEqual(player!.modes, { creative: false, hidden: false, god: false, fly: false });
  assert.deepEqual(player!.mail, []);
  assert.notEqual(world.palettes, d.palettes, 'the legacy record is not written into');
});

test('splitLegacyWorld: a world never saved has no player; one saved on the death screen keeps hp 0', () => {
  const blank = splitLegacyWorld({ id: 'b', name: 'B', seed: 5, seedText: '5', created: 1, played: 2, data: null });
  assert.equal(blank.player, null);
  assert.equal(blank.world.state.clock, 0.06);
  assert.equal(blank.world.state.worldSpawn.length, 2, 'findSpawn when the record has no spawn');
  const dead = splitLegacyWorld(dec(fixture.worlds.find((w: any) => w.id === DEAD)));
  assert.equal((dead.player!.stats as any).hp, 0);
});

// ---- the fixture through IdbStorage ----

test('the fixture: the upgrade to version 2 adds stores and the legacy records stay untouched', async () => {
  const idb = oldProfile(), before = structuredClone(idb.store('chunks'));
  const { st } = await opened(idb, MAIN);
  const db = idb.dbs.get(DB_NAME)!;
  assert.equal(db.version, 2);
  assert.deepEqual([...db.stores.keys()].sort(), ['backup', 'chunks', 'edits', 'players', 'worlds']);
  assert.deepEqual(idb.store('chunks'), before, 'legacy chunk records are read, never written or deleted');
  const original = dec(fixture.worlds.find((w: any) => w.id === MAIN));
  assert.deepEqual(idb.store('backup').get(MAIN + '|v1'), original, 'the backup is the legacy world record, verbatim');
  assert.equal(idb.store('backup').size, 1, 'only the world that was opened is backed up');
  const w = idb.store('worlds').get(MAIN) as any;
  assert.equal(w.format, 2); assert.deepEqual(w.summary, { level: 1 });
  assert.ok(!('data' in w));
  assert.equal((idb.store('worlds').get(DEAD) as any).format, undefined, 'a world not opened yet stays as it was');
  await st.close();
});

test('the fixture: blocks in all three dimensions, and each legacy chunk rebuilt exactly', async () => {
  const idb = oldProfile(), o = await opened(idb, MAIN);
  for (const dim of [0, 1, 2]) for (const [x, y, z, k] of X.blocks[dim]) assert.equal(o.key(dim, x, y, z), k, `dim ${dim} ${x} ${y} ${z}`);
  const pal = o.world.palettes[0], keys = blockKeys();
  for (const [k, v] of fixture.chunks) {
    const [id, d, cx, cz] = k.split('|');
    if (id !== MAIN) continue;
    const saved = unrle(dec(v).d, CVOL), ch = o.stores[+d].chunk(+cx, +cz)!;
    let diff = 0;
    for (let i = 0; i < CVOL; i++) if (keys[ch.blocks![i]] !== pal[saved[i]]) diff++;
    assert.equal(diff, 0, `chunk ${k}: every cell as saved`);
  }
});

test('the fixture: chest contents, the unopened ruin chest, the forge mid-smelt', async () => {
  const idb = oldProfile(), o = await opened(idb, MAIN), ow = o.stores[0];
  const chest = ow.getEnt(X.chest.at[0], X.chest.at[1], X.chest.at[2])!;
  assert.equal(chest.kind, 'chest'); assert.deepEqual(chest.data.s, X.chest.s);
  const f = ow.getEnt(X.forge.at[0], X.forge.at[1], X.forge.at[2])!;
  assert.equal(f.kind, 'forge');
  assert.deepEqual(f.data.s, X.forge.saved.s); assert.equal(f.data.burn, X.forge.saved.burn);
  assert.equal(f.data.s[0].n + f.data.s[2].n, X.forge.total);
  const [rx, ry, rz] = X.ruinChest.at, ruin = ow.getEnt(rx, ry, rz)!;
  assert.deepEqual([ruin.kind, ruin.data.loot, ruin.data.s], ['chest', X.ruinChest.loot, null], 'still unrolled');
  // opened now, it rolls its table
  const p = o.sim.join(LOCAL_ID, 'Player', o.rec, true);
  assert.ok(useBlock(o.sim, p, { x: rx, y: ry, z: rz, nx: 0, ny: 1, nz: 0, id: ow.getBlock(rx, ry, rz) }, 'chest'));
  assert.ok(ruin.data.s.some((q: unknown) => q), 'the loot was rolled'); assert.equal(ruin.data.loot, null);
  assert.ok(o.edits.peek(0, rx >> 4, rz >> 4)!.unsaved, 'and the chunk is to be saved');
});

test('the fixture: bed, townsperson, gate pair and the player record', async () => {
  const idb = oldProfile(), o = await opened(idb, MAIN), rec = o.rec as PlayerRecord;
  assert.equal(o.key(0, X.bed.at[0], X.bed.at[1], X.bed.at[2]), 'bedroll');
  assert.deepEqual(rec.bed, X.bed.spawn);
  const home = o.world.state.homes.find((h) => h.x === X.home.at[0] && h.y === X.home.at[1] && h.z === X.home.at[2]);
  assert.equal(home?.npc, X.home.npc);
  assert.ok(o.world.state.flags.includes('npc:' + X.home.npc));
  assert.equal(o.key(0, X.home.at[0], X.home.at[1], X.home.at[2]), 'guest_bed');
  assert.equal(o.key(0, X.gate.frame[0], X.gate.frame[1], X.gate.frame[2]), X.gate.overworldFrame);
  assert.equal(o.key(0, X.gate.sheet[0], X.gate.sheet[1], X.gate.sheet[2]), X.gate.overworldSheet);
  assert.equal(o.key(1, X.gate.hollows[0], X.gate.hollows[1], X.gate.hollows[2]), 'hollow_portal');
  assert.deepEqual(rec.portalReturn[1], X.gate.hollows, 'the return point leads to the Hollows gate');
  assert.equal(rec.dim, X.main.dim);
  for (const f of X.flags) assert.ok(o.world.state.flags.includes(f), f);
  const p = o.sim.join(LOCAL_ID, 'Player', rec, true);
  assert.equal(p.stats.dead, false);
});

test('the fixture: the world saved on the death screen opens dead', async () => {
  const idb = oldProfile(), st = new IdbStorage(DEAD, idb.env()), world = (await st.open())!;
  const rec = await st.loadPlayer(LOCAL_ID);
  assert.equal((rec!.stats as any).hp, X.dead.hp);
  const sim = new Sim(world, { cheats: true, maxPlayers: 1, solo: true, manual: true }, { sink, chunks: noSource, edits: new EditMaps(st, world.palettes), log() {}, requestSave() {} });
  const p = sim.join(LOCAL_ID, 'Player', rec, true);
  assert.equal(p.stats.dead, true);
  assert.deepEqual(idb.store('backup').get(DEAD + '|v1'), dec(fixture.worlds.find((w: any) => w.id === DEAD)));
});

test('the fixture: opening again reads the new records, keeps the first backup, converts nothing twice', async () => {
  const idb = oldProfile(), a = await opened(idb, MAIN);
  const conv = a.st.migrated.chunks, edits = structuredClone(idb.store('edits')), backup = structuredClone(idb.store('backup'));
  assert.equal(conv, fixture.chunks.filter(([k]: [string]) => k.startsWith(MAIN + '|')).length);
  const b = await opened(idb, MAIN);
  assert.equal(b.st.migrated.chunks, 0, 'the edits records answer now');
  assert.deepEqual(idb.store('edits'), edits);
  assert.deepEqual(idb.store('backup'), backup);
  for (const dim of [0, 1, 2]) for (const [x, y, z, k] of X.blocks[dim]) assert.equal(b.key(dim, x, y, z), k);
  // repeated from the legacy record (its edits record gone), the conversion gives the same record
  idb.store('edits').clear();
  const c = new IdbStorage(MAIN, idb.env());
  await c.open();
  for (const [k] of fixture.chunks) {
    const [id, d, cx, cz] = k.split('|');
    if (id !== MAIN) continue;
    assert.deepEqual(await c.loadChunk(+d, +cx, +cz), await b.st.loadChunk(+d, +cx, +cz));
  }
});

test('the fixture: a migration whose write fails changes nothing, and the legacy world loads next time', async () => {
  const idb2 = oldProfile(), st = new IdbStorage(MAIN, idb2.env());
  // the backup transaction passes; the one that writes the world and the player fails
  const orig = FTx.prototype.objectStore;
  FTx.prototype.objectStore = function (this: FTx, s: string) { if (s === 'players') idb2.failNext = 'QuotaExceededError'; return orig.call(this, s); };
  try {
    await assert.rejects(st.open(), (e: unknown) => e instanceof StorageError && e.code === 'full');
  } finally { FTx.prototype.objectStore = orig; }
  assert.equal((idb2.store('worlds').get(MAIN) as any).format, undefined, 'still the legacy record');
  assert.equal(idb2.store('players').size, 0);
  const o = await opened(idb2, MAIN);
  assert.equal(o.world.format, 2);
  assert.deepEqual(idb2.store('backup').get(MAIN + '|v1'), dec(fixture.worlds.find((w: any) => w.id === MAIN)));
});

test('risk R3: dense conversions, bytes and time per legacy chunk of the fixture', async () => {
  const idb = oldProfile(), o = await opened(idb, MAIN), m = o.st.migrated;
  let raw = 0;
  for (const [k, v] of fixture.chunks) if (k.startsWith(MAIN + '|')) raw += dec(v).d.length;
  console.log(`R3: ${m.chunks} legacy chunks converted, ${m.dense} dense, ${m.edits} edited cells, ${m.bytes} bytes of edits (legacy RLE ${raw} bytes), ${(m.ms / m.chunks).toFixed(2)} ms per chunk (generation included)`);
  assert.equal(m.dense, 0, 'saved by a build with the same generator: no chunk is rewritten whole');
  // a chunk that differs almost everywhere is stored whole
  const g = genChunk(o.world.seed, 0, 40, 40), saved = new Uint8Array(CVOL).fill(2);
  const big = diffLegacyChunk(0, 40, 40, saved, g, [], o.world.palettes.length - 1);
  assert.equal(big.dense, true); assert.equal(big.rec.enc, 1); assert.ok(big.edits > LEGACY_DENSE_AT);
});

// ---- the store of format 2 ----

const worldRec = (id: string, extra: Partial<WorldRecord> = {}): WorldRecord => ({
  format: 2, id, name: 'New', seed: 9, seedText: '9', created: 1, played: 5, owner: LOCAL_ID, palettes: [blockKeys()], names: {},
  state: { clock: 0.06, tick: 0, rnd: 1, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [0, 0], gates: [], summons: [], owed: {} }, ...extra,
});
const playerRec = (level: number): PlayerRecord => ({
  v: 1, id: LOCAL_ID, name: 'Player', seen: 5, dim: 0, pos: { x: 1, y: 100, z: 2, yaw: 0, pitch: 0 }, inv: {}, stats: { hp: 50, level }, bed: null, deathAt: null,
  portalReturn: {}, safe: [1, 100, 2], arriving: -1, pendingBed: false, recallT: 0, modes: { creative: false, hidden: false, god: false, fly: false }, mail: [],
});

test('IdbStorage: a new world, commits as one transaction, a failed commit writes nothing', async () => {
  const idb = new FakeIdb(), st = new IdbStorage('w1', idb.env());
  assert.equal(await st.open(), null, 'nothing saved yet');
  const chunk = { dim: 1, cx: -3, cz: 4, rev: 2, pal: 0, enc: 0 as const, data: new Uint8Array([1, 0, 5, 2, 0, 6]), ents: [{ x: -48, y: 70, z: 64, kind: 'chest', data: { s: [], loot: null } }] };
  await st.commit({ world: worldRec('w1'), players: [playerRec(3)], chunks: [chunk] });
  assert.deepEqual(await st.loadChunk(1, -3, 4), chunk);
  assert.deepEqual(await st.loadPlayer(LOCAL_ID), playerRec(3));
  assert.equal(await st.loadChunk(1, 0, 0), null);
  const w2 = new IdbStorage('w1', idb.env());
  assert.deepEqual(await w2.open(), worldRec('w1'), 'the menu summary is not part of the record');
  idb.failNext = 'QuotaExceededError';
  await assert.rejects(st.commit({ world: worldRec('w1', { played: 99 }), players: [playerRec(4)], chunks: [{ ...chunk, rev: 3 }] }), (e: unknown) => e instanceof StorageError && e.code === 'full');
  assert.equal((await st.loadChunk(1, -3, 4))!.rev, 2);
  assert.equal(((await st.loadPlayer(LOCAL_ID))!.stats as any).level, 3);
  assert.equal(((await new IdbStorage('w1', idb.env()).open())!).played, 5);
  // a chunk with nothing edited and nothing stored leaves the store
  await st.commit({ players: [], chunks: [{ ...chunk, rev: 0, data: new Uint8Array(0), ents: [] }] });
  assert.equal(await st.loadChunk(1, -3, 4), null);
});

test('IdbStorage: a newer world format or database version is refused, nothing rewritten', async () => {
  const idb = new FakeIdb(), st = new IdbStorage('w', idb.env());
  await st.commit({ world: worldRec('w'), players: [], chunks: [] });
  (idb.store('worlds').get('w') as any).format = 3;
  await assert.rejects(new IdbStorage('w', idb.env()).open(), (e: unknown) => e instanceof StorageError && e.code === 'version');
  assert.equal((idb.store('worlds').get('w') as any).format, 3);
  idb.dbs.get(DB_NAME)!.version = 3;
  await assert.rejects(new IdbStorage('w', idb.env()).open(), (e: unknown) => e instanceof StorageError && e.code === 'version');
});

test('the title menu: worlds of both formats listed, a deleted world gone from all five stores', async () => {
  const idb = oldProfile();
  await opened(idb, MAIN);
  const st = new IdbStorage('other', idb.env());
  await st.commit({ world: worldRec('other', { played: 9e12 }), players: [playerRec(7)], chunks: [] });
  const l = await listWorlds(idb.env());
  assert.deepEqual(l.map((w) => [w.id, w.level, w.legacy]).sort(), [['other', 7, false], [DEAD, 1, true], [MAIN, 1, false]]);
  assert.ok(l.every((w, i) => !i || l[i - 1].played >= w.played), 'most recently played first');
  await deleteWorld(MAIN, idb.env());
  for (const s of ['worlds', 'players', 'edits', 'backup', 'chunks']) for (const k of idb.store(s).keys()) assert.ok(!k.startsWith(MAIN), `${s} ${k}`);
  assert.ok(idb.store('chunks').size === 0 && idb.store('worlds').has(DEAD) && idb.store('worlds').has('other'));
});

test('diffLegacyChunk: a generator container the player removed stays removed; one in the legacy list is stored', async () => {
  const legacy = dec(fixture.worlds.find((w: any) => w.id === MAIN)), seed = legacy.seed, [rx, ry, rz] = X.ruinChest.at;
  const g = genChunk(seed, 0, rx >> 4, rz >> 4), ruin = g.ents.find((e) => e.x === rx && e.y === ry && e.z === rz);
  assert.ok(ruin, 'the generator places the ruin chest');
  const i = ((((rz & 15) << 4) | (rx & 15)) << 8) | ry, edits = new EditMaps({ loadChunk: async () => null } as any, [blockKeys()]);
  const run = (ents: { x: number; y: number; z: number; kind: string; data: any }[]) => {
    const d = diffLegacyChunk(0, rx >> 4, rz >> 4, g.blocks.slice(), g, ents, 0), cells = new Map<number, number>();
    for (let o = 0; o < d.rec.data.length; o += 3) cells.set(d.rec.data[o] | (d.rec.data[o + 1] << 8), d.rec.data[o + 2]);
    const s = new SimChunks(0, noSource, edits), e = { dim: 0, cx: rx >> 4, cz: rz >> 4, rev: 1, cells, full: null, ents: new Map(ents.map((q) => [((((q.z & 15) << 4) | (q.x & 15)) << 8) | q.y, q])), genHash: 0, dirty: false, unsaved: false, wire: null };
    s.integrate({ dim: 0, cx: rx >> 4, cz: rz >> 4, ...g }, e);
    return { d, cells, ent: s.getEnt(rx, ry, rz) };
  };
  const gone = run([]);
  assert.equal(gone.cells.get(i), g.blocks[i], 'the cell is an edit holding the saved id');
  assert.equal(gone.ent, null, 'so the generator-entity rule does not bring the chest back');
  const kept = run([{ x: rx, y: ry, z: rz, kind: 'chest', data: { loot: 'ruin', s: null } }]);
  assert.equal(kept.cells.has(i), false);
  assert.deepEqual(kept.ent?.data, { loot: 'ruin', s: null });
});
