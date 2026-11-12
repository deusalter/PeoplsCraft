// The simulation's own block store (3.2), its light (7.8) and the host's chunk subscriptions (4.7), through
// their public surface: SimChunks under a Realm, EditMaps over MemStorage, ApproxLight, ChunkService over fake
// connections. Section 9's cases that live here: a container never goes away under a viewer, a gate the records
// no longer describe, memory wins until durable, a large base joined late is sent nearest first and paced.
import assert from 'node:assert/strict';
import test from 'node:test';
import { CVOL, chunkKey } from '../../src/core/constants';
import { B, T_EMIT_R } from '../../src/data/blocks';
import { decodeFull, decodeSparse } from '../../src/net/codec';
import { ChunkService } from '../../src/net/hostchunks';
import { BUF_CE, CE_BYTES, CE_BYTES_LOCAL, type C2S, type CeEntry, FULL_PER_SEC, LOADS_MAX, LOADS_PER_TICK, type S2C, SUB_KEEP, SUB_RANGE } from '../../src/net/protocol';
import type { Conn } from '../../src/net/transport';
import { tickBlocks } from '../../src/sim/blocks';
import type { ChunkSource, GenResult } from '../../src/sim/chunksource';
import type { Fx, Scope, Sink } from '../../src/sim/fx';
import { ApproxLight, blockLightApprox, skyApprox } from '../../src/sim/light';
import { blockKeys } from '../../src/sim/migrate';
import type { SimPlayer } from '../../src/sim/player';
import { Sim } from '../../src/sim/sim';
import { type ChunkRecord, MemStorage, StorageError, type WorldRecord } from '../../src/sim/storage';
import type { EntInit } from '../../src/world/gen/types';
import { type ChunkEdits, DENSE_AT, EditMaps, SIM_DROP_AFTER, SIM_KEEP, SIM_RADIUS, SimChunks, cellOf, newEdits, pumpChunks } from '../../src/sim/voxels';

const GROUND = 64;   // stone below, air from here up
const cell = (x: number, y: number, z: number): number => cellOf(x, y, z);
const settle = (): Promise<void> => new Promise((r) => setImmediate(r));

/** Flat terrain, generated at once; `ents` places generator entities (the block under each is set to match). */
class FlatSource implements ChunkSource {
  jobs: [number, number, number, number][] = [];
  requests: [number, number, number, number][] = [];
  cancels: string[] = [];
  ents = new Map<string, EntInit[]>();
  get pending(): number { return this.jobs.length; }
  request(dim: number, cx: number, cz: number, prio: number): void { this.requests.push([dim, cx, cz, prio]); if (!this.jobs.some((j) => j[0] === dim && j[1] === cx && j[2] === cz)) this.jobs.push([dim, cx, cz, prio]); }
  cancel(dim: number, cx: number, cz: number): void { this.cancels.push(`${dim},${cx},${cz}`); this.jobs = this.jobs.filter((j) => !(j[0] === dim && j[1] === cx && j[2] === cz)); }
  poll(max: number): GenResult[] { return this.jobs.splice(0, max).map(([dim, cx, cz]) => flat(dim, cx, cz, this.ents.get(`${cx},${cz}`) ?? [])); }
  dispose(): void { this.jobs = []; }
}
function flat(dim: number, cx: number, cz: number, ents: EntInit[] = []): GenResult {
  const blocks = new Uint8Array(CVOL);
  for (let col = 0; col < 256; col++) for (let y = 0; y < GROUND; y++) blocks[(col << 8) | y] = y === 0 ? B.bedrock : B.stone;
  for (const e of ents) blocks[cell(e.x, e.y, e.z)] = e.kind === 'nest' ? B.brood_nest : B.chest;
  return { dim, cx, cz, blocks, biomes: new Uint8Array(256), ents, hash: 1000 + cx * 7 + cz };
}

const worldRecord = (): WorldRecord => ({
  format: 2, id: 'w', name: 'Test', seed: 7, seedText: '7', created: 0, played: 0, owner: null, palettes: [blockKeys()], names: {},
  state: { clock: 0.3, tick: 0, rnd: 99, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [8, 8], gates: [], summons: [], owed: {} },
});

interface Rig { sim: Sim; storage: MemStorage; edits: EditMaps; source: FlatSource; chunks: SimChunks[]; sent: [number, S2C][]; ev: [Scope, Fx][] }
function rig(storage = new MemStorage()): Rig {
  const sent: [number, S2C][] = [], ev: [Scope, Fx][] = [], world = worldRecord(), source = new FlatSource();
  const edits = new EditMaps(storage, world.palettes), chunks = [0, 1, 2].map((d) => new SimChunks(d, source, edits));
  const sink: Sink = { emit: (to, e) => { ev.push([to, e]); }, send: (slot, m) => { sent.push([slot, m]); }, broadcast() {} };
  const sim = new Sim(world, { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, store: (d) => chunks[d], log() {}, requestSave() {} });
  return { sim, storage, edits, source, chunks, sent, ev };
}
/** Load and integrate the chunks within `r` of a chunk, as the step does it. */
async function grow(r: Rig, dim: number, cx: number, cz: number, rad = 1): Promise<void> {
  const s = r.chunks[dim];
  for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
    const e = await r.edits.load(dim, cx + dx, cz + dz);
    s.integrate(flat(dim, cx + dx, cz + dz, r.source.ents.get(`${cx + dx},${cz + dz}`) ?? []), e);
  }
}
function player(r: Rig, id: string, x: number, z: number, dim: 0 | 1 | 2 = 0): SimPlayer {
  const p = r.sim.join(id, id, null, false);
  p.body.teleport(x, GROUND, z);
  if (dim !== p.dim) { r.sim.realms[p.dim].players.splice(r.sim.realms[p.dim].players.indexOf(p), 1); p.dim = dim; r.sim.realms[dim].players.push(p); }
  return p;
}

// ---- sim chunks ----

test('SimChunks.update: wants every chunk within SIM_RADIUS nearest first, keeps to SIM_KEEP, drops after 10 s', async () => {
  const r = rig(), s = r.chunks[0], p = player(r, 'a', 8, 8);
  s.update([p]);
  const side = 2 * SIM_RADIUS + 1;
  assert.equal(s.map.size, side * side);
  const prios = r.source.requests.map((q) => q[3]);
  assert.deepEqual(prios, [...prios].sort((a, b) => a - b), 'nearest first');
  assert.deepEqual(r.source.requests[0], [0, 0, 0, 0]);
  assert.equal(Math.max(...prios), SIM_RADIUS);
  await r.edits.idle();
  assert.equal(pumpChunks(r.source, r.chunks, Infinity, Infinity), 2, 'at most two integrated per step');
  const done = [...s.map.values()].filter((c) => c.state === 2);
  assert.ok(s.ready(8, 8) && done.length === 2 && done.every((c) => Math.max(Math.abs(c.cx), Math.abs(c.cz)) <= 1), 'the two nearest first');
  while (pumpChunks(r.source, r.chunks, Infinity, Infinity));
  assert.ok(s.areaReady(8, 8, SIM_RADIUS));
  p.body.teleport(16 * SIM_KEEP + 8, GROUND, 8);
  s.update([p]);
  assert.ok(s.chunk(0, 0), 'within SIM_KEEP: kept');
  p.body.teleport(16 * (SIM_KEEP + SIM_RADIUS + 1) + 8, GROUND, 8);
  for (let t = 1; t < SIM_DROP_AFTER; t++) s.update([p]);
  assert.ok(s.chunk(0, 0), 'outside SIM_KEEP for less than 10 s: kept');
  s.update([p]);
  assert.equal(s.chunk(0, 0), null, 'dropped after 10 s');
  assert.equal(r.edits.peek(0, 0, 0), null, 'and its unedited edit map released');
});

test('SimChunks: blocks, heightmaps and readiness after edits; nothing written outside 1..BUILD_MAX or an unready chunk', async () => {
  const r = rig(), realm = r.sim.realms[0];
  await grow(r, 0, 0, 0);
  assert.equal(realm.chunks, r.chunks[0], 'a realm built on sim chunks has them');
  assert.equal(realm.topY(3, 3), GROUND - 1);
  assert.equal(realm.ready(3, 3), true); assert.equal(realm.ready(16 * 5, 0), false); assert.equal(realm.topY(16 * 5, 0), -1);
  assert.ok(realm.setBlock(3, 80, 3, B.stone));
  assert.equal(realm.topY(3, 3), 80); assert.equal(r.chunks[0].skyHeight(3, 3), 80);
  assert.ok(realm.setBlock(3, 80, 3, B.glass));
  assert.equal(realm.topY(3, 3), 80); assert.equal(r.chunks[0].skyHeight(3, 3), GROUND - 1, 'glass lets the sky through');
  assert.ok(realm.setBlock(3, 80, 3, 0));
  assert.equal(realm.topY(3, 3), GROUND - 1);
  assert.equal(realm.setBlock(3, 0, 3, 0), false); assert.equal(realm.setBlock(3, 251, 3, B.stone), false);
  assert.equal(realm.setBlock(3, 70, 3, 0), false, 'unchanged');
  assert.equal(realm.setBlock(16 * 5, 70, 0, B.stone), false, 'not ready');
  const e = r.edits.peek(0, 0, 0)!;
  assert.equal(e.rev, 3);
  assert.equal(e.cells!.get(cell(3, 80, 3)), 0, 'entries are never pruned, even back to generated terrain');
  assert.ok(e.dirty && e.unsaved);
});

test('the generator-entity rule: a stored entity wins, an edited cell drops it, else it is made in memory only', async () => {
  const r = rig(), s = r.chunks[0];
  const g: EntInit[] = [{ x: 1, y: GROUND, z: 1, kind: 'chest', data: 'ruin' }, { x: 2, y: GROUND, z: 2, kind: 'chest', data: 'ruin' },
    { x: 3, y: GROUND, z: 3, kind: 'nest', data: 'm_imp' }, { x: 4, y: GROUND, z: 4, kind: 'chest', data: 'ruin' }];
  const e = newEdits(0, 0, 0);
  e.rev = 2;
  e.ents.set(cell(1, GROUND, 1), { x: 1, y: GROUND, z: 1, kind: 'chest', data: { s: [{ k: 'arrow', n: 3 }], loot: null } });
  e.cells!.set(cell(2, GROUND, 2), B.chest);
  // a structure stamped later overwrote this one's block
  const gen = flat(0, 0, 0, g);
  gen.blocks[cell(4, GROUND, 4)] = B.stone;
  s.integrate(gen, e);
  assert.deepEqual(s.getEnt(1, GROUND, 1)!.data.s, [{ k: 'arrow', n: 3 }]);
  assert.equal(s.getEnt(2, GROUND, 2), null);
  assert.deepEqual(s.getEnt(3, GROUND, 3)!.data, { mob: 'm_imp', t: 0 });
  assert.equal(s.getEnt(4, GROUND, 4), null);
  assert.equal(e.genHash, gen.hash);
  assert.equal(e.ents.size, 1, 'generator entities are not stored');
  assert.equal(e.dirty, false);
});

test('touch: opening a generator chest stores it; timers of nests and forges never touch', async () => {
  const r = rig(), realm = r.sim.realms[0], s = r.chunks[0];
  r.source.ents.set('0,0', [{ x: 5, y: GROUND, z: 5, kind: 'chest', data: 'ruin' }, { x: 9, y: GROUND, z: 9, kind: 'nest', data: 'm_imp' }]);
  await grow(r, 0, 0, 0);
  const p = player(r, 'a', 8.5, 8.5), e = r.edits.peek(0, 0, 0)!;
  p.loading = false; p.arriving = -1;
  const f = realm.setEnt(12, GROUND, 12, 'forge', { s: [null, null, null], burn: 50, burnMax: 50, prog: 0, need: 0, level: 1, rev: 0 })!;
  assert.ok(e.ents.has(cell(12, GROUND, 12)) && e.dirty, 'setEnt stores and touches');
  e.dirty = false;
  for (let i = 0; i < 20; i++) tickBlocks(realm, 0.25);
  assert.equal(e.dirty, false, 'a nest timer and a burning idle forge do not touch');
  assert.notEqual(f.data.at, undefined);
  const chest = s.getEnt(5, GROUND, 5)!;
  chest.data.s = new Array(27).fill(null); chest.data.loot = null;
  realm.touchEnt(chest);
  assert.ok(e.dirty && e.ents.get(cell(5, GROUND, 5)) === chest, 'opened: stored and saved');
  assert.equal(e.ents.has(cell(9, GROUND, 9)), false, 'the nest stays a generator entity');
  realm.removeEnt(5, GROUND, 5);
  assert.equal(s.getEnt(5, GROUND, 5), null); assert.equal(e.ents.has(cell(5, GROUND, 5)), false);
});

test('a forge taking fuel or finishing an item touches its chunk and marks its viewers for an st', async () => {
  const r = rig(), realm = r.sim.realms[0];
  await grow(r, 0, 0, 0);
  realm.setBlock(6, GROUND, 6, B.furnace);
  const p = player(r, 'a', 6.5, 7.5), e = r.edits.peek(0, 0, 0)!;
  const f = realm.setEnt(6, GROUND, 6, 'forge', { s: [{ k: 'iron_ore', n: 2 }, { k: 'coal', n: 1 }, null], burn: 0, burnMax: 0, prog: 0, need: 0, level: 1, rev: 0 })!;
  realm.viewers.set(`6,${GROUND},6`, new Set([p]));
  e.dirty = false; p.invDirty = false;
  tickBlocks(realm, 0.25);
  assert.equal(f.data.s[1], null, 'fuel taken');
  assert.ok(e.dirty && p.invDirty);
  e.dirty = false; p.invDirty = false;
  for (let i = 0; i < 400 && !f.data.s[2]; i++) tickBlocks(realm, 0.25);
  assert.deepEqual(f.data.s[2], { k: 'iron_bar', n: 1 });
  assert.ok(e.dirty && p.invDirty, 'an item finished');
});

test('past 16,384 edited cells the map turns dense, storing every generator entity first, and keeps it across a reload', async () => {
  const st = new MemStorage(), r = rig(st), realm = r.sim.realms[0];
  r.source.ents.set('0,0', [{ x: 15, y: GROUND, z: 15, kind: 'chest', data: 'ruin' }]);
  await grow(r, 0, 0, 0);
  const e = r.edits.peek(0, 0, 0)!;
  let n = 0;
  for (let y = 1; y < 120 && n <= DENSE_AT; y++) for (let z = 0; z < 16 && n <= DENSE_AT; z++) for (let x = 0; x < 16 && n <= DENSE_AT; x++) {
    if (x === 15 && z === 15) continue;
    if (realm.setBlock(x, y, z, y < GROUND ? 0 : B.stone)) n++;
  }
  assert.equal(e.cells, null); assert.ok(e.full);
  assert.equal(e.rev, DENSE_AT + 1);
  assert.deepEqual(e.ents.get(cell(15, GROUND, 15))!.data, { loot: 'ruin', s: null }, 'the unopened chest was stored');
  realm.setBlock(0, 120, 0, B.glass);
  assert.equal(e.full![cell(0, 120, 0)], B.glass, 'writes go to the array now');
  const batch = r.edits.take();
  assert.equal(batch.length, 1); assert.equal(batch[0].enc, 1);
  await st.commit({ players: [], chunks: batch });
  r.edits.committed(batch, true);
  // a new process: the dense map regenerates to the same blocks, and the chest still rolls its loot
  const r2 = rig(st);
  r2.source.ents.set('0,0', [{ x: 15, y: GROUND, z: 15, kind: 'chest', data: 'ruin' }]);
  await grow(r2, 0, 0, 0, 0);
  assert.equal(r2.chunks[0].getBlock(3, 10, 3), 0); assert.equal(r2.chunks[0].getBlock(0, GROUND, 0), B.stone); assert.equal(r2.chunks[0].getBlock(0, 120, 0), B.glass);
  assert.deepEqual(r2.chunks[0].getEnt(15, GROUND, 15)!.data, { loot: 'ruin', s: null });
});

test('a container never goes away under a viewer: break, replace and removeEnt close every window on it first', async () => {
  const r = rig(), realm = r.sim.realms[0];
  await grow(r, 0, 0, 0);
  realm.setBlock(4, GROUND, 4, B.chest);
  const a = player(r, 'a', 4.5, 6.5), b = player(r, 'b', 6.5, 4.5);
  const open = (x: number, z: number, ...ps: SimPlayer[]): void => {
    realm.setEnt(x, GROUND, z, 'chest', { s: [{ k: 'arrow', n: 5 }, ...new Array(26).fill(null)], loot: null });
    realm.viewers.set(`${x},${GROUND},${z}`, new Set(ps));
    for (const p of ps) { p.window = { mode: 'chest', x, y: GROUND, z, sold: [] }; p.ackSeq = 7; }
  };
  open(4, 4, a, b);
  a.inv.cursor = { k: 'arrow', n: 2 };
  r.sent.length = 0;
  realm.setBlock(4, GROUND, 4, B.cobble, true);
  assert.ok(a.window && b.window, 'a silent change keeps the windows');
  assert.ok(realm.setBlock(4, GROUND, 4, 0));
  assert.equal(a.window, null); assert.equal(b.window, null);
  assert.equal(realm.viewers.size, 0);
  assert.deepEqual(r.sent, [[a.slot, { t: 'st', ack: 7, box: null }], [b.slot, { t: 'st', ack: 7, box: null }]]);
  assert.equal(a.inv.cursor, null, 'closed as op close does: the cursor went back to the pack');
  assert.equal(a.ackSeq, 7, 'with the sequence left where it is');
  assert.equal(realm.getEnt(4, GROUND, 4), null);
  // replaced by another block, and the entity removed by itself
  realm.setBlock(4, GROUND, 4, B.chest); open(4, 4, a); r.sent.length = 0;
  realm.setBlock(4, GROUND, 4, B.furnace);
  assert.equal(a.window, null); assert.equal(r.sent.length, 1);
  open(4, 4, b); r.sent.length = 0;
  realm.removeEnt(4, GROUND, 4);
  assert.equal(b.window, null); assert.deepEqual(r.sent, [[b.slot, { t: 'st', ack: 7, box: null }]]);
});

test('a change to a cell of a registered gate drops that entry, and only in its own realm', async () => {
  const r = rig(), realm = r.sim.realms[0], g = r.sim.shared.gates;
  await grow(r, 0, 0, 0);
  g.push({ kind: 1, dim: 0, x: 4, y: GROUND, z: 8, alongX: true }, { kind: 1, dim: 1, x: 4, y: GROUND, z: 8, alongX: true }, { kind: 2, dim: 0, x: 4, y: GROUND, z: 2, alongX: false });
  realm.setBlock(9, GROUND + 1, 9, B.stone);
  assert.equal(g.length, 3, 'a cell of no gate');
  realm.setBlock(6, GROUND + 4, 8, B.stone, true);
  assert.deepEqual(g.map((q) => [q.dim, q.z]), [[1, 8], [0, 2]], 'the top of the frame, even silently');
});

// ---- edit maps and storage ----

test('memory wins until durable: release is refused while unsaved, held, or in a commit still in flight', async () => {
  const st = new MemStorage(), r = rig(st), realm = r.sim.realms[0];
  await grow(r, 0, 0, 0, 0);
  realm.setBlock(1, 70, 1, B.stone);
  const e = r.edits.peek(0, 0, 0)!;
  r.chunks[0].clear();
  assert.equal(r.edits.peek(0, 0, 0), e, 'unsaved: kept although no sim chunk holds it');
  const batch = r.edits.take();
  assert.equal(e.dirty, false); assert.equal(e.unsaved, true, 'taken by a commit in flight');
  realm.setBlock(1, 71, 1, B.stone);   // cannot: the chunk is gone. Change it through the map instead
  assert.equal(r.edits.peek(0, 0, 0), e);
  st.failNext = new StorageError('full', 'disk full');
  await assert.rejects(st.commit({ players: [], chunks: batch }));
  r.edits.committed(batch, false);
  assert.ok(e.dirty && e.unsaved, 'a failed commit: dirty again');
  assert.equal(r.edits.peek(0, 0, 0), e);
  const b2 = r.edits.take();
  r.edits.touch(e);   // changed again while the second commit is in flight
  await st.commit({ players: [], chunks: b2 });
  r.edits.committed(b2, true);
  assert.equal(e.unsaved, true, 'changed since it was taken');
  assert.equal(r.edits.peek(0, 0, 0), e);
  const b3 = r.edits.take();
  await st.commit({ players: [], chunks: b3 });
  r.edits.committed(b3, true);
  assert.equal(e.unsaved, false);
  assert.equal(r.edits.peek(0, 0, 0), null, 'durable and held by nobody: the refused release went through');
  const loads = st.loads, again = await r.edits.load(0, 0, 0);
  assert.equal(st.loads, loads + 1);
  assert.equal(again.cells!.get(cell(1, 70, 1)), B.stone);
});

test('EditMaps.load: one promise per chunk, null as an empty map, a record of an older block table remapped and saved again', async () => {
  const st = new MemStorage(), keys = blockKeys(), old = [...keys];
  [old[1], old[2]] = [old[2], old[1]];   // bedrock and stone swapped places in the old table
  old.push('removed_block');
  const rec: ChunkRecord = { dim: 2, cx: 1, cz: 1, rev: 4, pal: 0, enc: 0, data: new Uint8Array([5, 0, 1, 6, 0, keys.length]), ents: [] };
  await st.commit({ players: [], chunks: [rec] });
  const pals = [old, keys], ed = new EditMaps(st, pals);
  assert.equal(ed.pal, 1);
  const [a, b] = [ed.load(2, 1, 1), ed.load(2, 1, 1)];
  assert.equal(a, b); assert.equal(st.loads, 1);
  const e = await a;
  assert.deepEqual([...e.cells!], [[5, B.stone], [6, 0]], 'by key, an unknown key as air');
  assert.ok(e.dirty && e.unsaved);
  assert.equal(ed.take()[0].pal, 1);
  const empty = await ed.load(0, 9, 9);
  assert.deepEqual([empty.rev, empty.cells!.size, empty.ents.size, empty.dirty], [0, 0, 0, false]);
  const pals2 = [keys];
  new EditMaps(st, pals2);
  assert.equal(pals2.length, 1, 'the current table is not added twice');
});

// ---- light ----

test('skyApprox and blockLightApprox: the numbers of 7.8', async () => {
  const r = rig(), realm = r.sim.realms[0], s = r.chunks[0];
  await grow(r, 0, 0, 0, 1);
  assert.equal(skyApprox(s, 8, GROUND, 8), 15, 'open sky');
  assert.equal(skyApprox(s, 8, GROUND - 1, 8), 0, 'in the ground');
  // a roof of 9 x 9 over (8, 8): the nearest open column is 5 blocks away (Manhattan)
  for (let x = 4; x <= 12; x++) for (let z = 4; z <= 12; z++) realm.setBlock(x, 70, z, B.stone);
  assert.equal(skyApprox(s, 8, GROUND, 8), 10);
  assert.equal(skyApprox(s, 8, GROUND, 8) <= 3, false, 'a sealed room within 8 blocks of open sky counts as lit');
  for (let x = -6; x <= 22; x++) for (let z = -6; z <= 22; z++) realm.setBlock(x, 70, z, B.stone);
  assert.equal(skyApprox(s, 8, GROUND, 8), 0, 'farther than 8 from any open column: dark');
  assert.equal(skyApprox(s, 8, 71, 8), 15, 'above the roof');
  assert.equal(blockLightApprox(s, 8, GROUND, 8), 0);
  realm.setBlock(8, GROUND, 13, B.torch);
  assert.equal(blockLightApprox(s, 8, GROUND, 8), T_EMIT_R[B.torch] - 5);
  realm.setBlock(8, GROUND, 11, B.stone);
  assert.equal(blockLightApprox(s, 8, GROUND, 8), 10, 'occlusion is ignored');
  assert.equal(blockLightApprox(s, 8, GROUND, 4), 0, 'outside the cube of radius 8');
  assert.equal(blockLightApprox(s, 8 - 8, GROUND, 13), 7, '8 blocks off along one axis');
  assert.equal(blockLightApprox(s, 9, GROUND + 3, 12), 15 - 5, 'Manhattan distance in three axes');
  realm.setBlock(8, GROUND, 13, 0);
  assert.equal(blockLightApprox(s, 8, GROUND, 8), 0, 'the emitter is gone');
  // the realm reads light through it, and a realm without a sky has none
  assert.equal(realm.light.sky(8, 71, 8), 15);
  assert.equal(new ApproxLight(s, false).sky(8, 71, 8), 0);
  assert.equal(r.sim.realms[1].light.sky(8, 71, 8), 0, 'the Hollows');
});

test('ApproxLight.sky is cheap enough to ask for every shade every tick', async () => {
  const r = rig(), s = r.chunks[0], realm = r.sim.realms[0];
  await grow(r, 0, 0, 0, 1);
  for (let x = -16; x < 32; x++) for (let z = -16; z < 32; z++) realm.setBlock(x, 70, z, B.stone);
  const t0 = performance.now();
  let v = 0;
  for (let i = 0; i < 20000; i++) v += s.sky((i * 7) & 15, GROUND, (i * 13) & 15);
  const us = ((performance.now() - t0) * 1000) / 20000;
  assert.equal(v, 0);
  assert.ok(us < 20, `${us.toFixed(2)} us per call in the worst case (nothing found within 8)`);
});

// ---- the chunk subscription service ----

class FakeConn implements Conn {
  static n = 0;
  readonly id = ++FakeConn.n;
  readonly addr = 'test';
  buffered = 0;
  out: S2C[] = [];
  onMessage = null; onBinary = null; onClose = null;
  constructor(readonly local = false) {}
  send(m: S2C): void { this.out.push(JSON.parse(JSON.stringify(m))); }
  sendBin(): void {}
  close(): void {}
  take<T extends S2C['t']>(t: T): Extract<S2C, { t: T }>[] { const l = this.out.filter((m) => m.t === t) as Extract<S2C, { t: T }>[]; this.out = this.out.filter((m) => m.t !== t); return l; }
}
const chunksMsg = (dim: number, sub: number[], unsub: number[] = [], full?: number[]): C2S & { t: 'chunks' } => (full ? { t: 'chunks', dim, sub, unsub, full } : { t: 'chunks', dim, sub, unsub });
/** Tick, let the loads land, flush. What the connection was sent. */
async function serve(svc: ChunkService, c: FakeConn, p: SimPlayer): Promise<S2C[]> {
  svc.tick(c, p); await settle(); await settle();
  svc.flushLive(c); svc.flushCe(c);
  const o = c.out; c.out = [];
  return o;
}
const entries = (o: S2C[]): CeEntry[] => o.flatMap((m) => (m.t === 'ce' ? m.l : []));

test('chunks: a sub within viewMax + 4 of the stored position is accepted, farther and other realms ignored', async () => {
  const r = rig(), p = player(r, 'a', 8, 8), svc = new ChunkService(r.sim, r.edits, 12), c = new FakeConn();
  const range = 12 + SUB_RANGE;
  svc.onChunks(c, p, chunksMsg(0, [range, 0, 1, range + 1, 0, 2, 0, -range, 3, -range - 1, -range - 1, 4]));
  svc.onChunks(c, p, chunksMsg(1, [0, 0, 5]));
  const l = entries(await serve(svc, c, p));
  assert.deepEqual(l.map((e) => e.slice(0, 5)).sort(), [[0, -range, 3, 0, 0], [range, 0, 1, 0, 0]]);
});

test('chunks: unsub before sub in one message, a new nonce replaces the old, stale loads are not sent', async () => {
  const r = rig(), p = player(r, 'a', 8, 8), svc = new ChunkService(r.sim, r.edits, 12), c = new FakeConn();
  svc.onChunks(c, p, chunksMsg(0, [2, 2, 10]));
  svc.onChunks(c, p, chunksMsg(0, [2, 2, 11], [2, 2]));
  let l = entries(await serve(svc, c, p));
  assert.deepEqual(l, [[2, 2, 11, 0, 0]], 'unsub then sub of one chunk in one message: subscribed, once, with the new nonce');
  svc.onChunks(c, p, chunksMsg(0, [3, 3, 20]));
  svc.tick(c, p);   // the load of nonce 20 starts...
  svc.onChunks(c, p, chunksMsg(0, [3, 3, 21]));   // ...and a new subscription replaces it before it lands
  await settle();
  l = entries(await serve(svc, c, p));
  assert.deepEqual(l, [[3, 3, 21, 0, 0]]);
  svc.onChunks(c, p, chunksMsg(0, [], [3, 3]));
  svc.tick(c, p);
  assert.equal(entries(await serve(svc, c, p)).length, 0);
});

test('chunks: at most LOADS_PER_TICK loads started per tick and LOADS_MAX in flight, nearest first', async () => {
  const st = new MemStorage();
  let open = 0, most = 0;
  const gate: (() => void)[] = [];
  const slow = Object.assign(Object.create(st), { loadChunk: (d: number, x: number, z: number) => { open++; most = Math.max(most, open); return new Promise<null>((res) => gate.push(() => { open--; res(null); })); } });
  const r = rig(slow), p = player(r, 'a', 8, 8), svc = new ChunkService(r.sim, r.edits, 16), c = new FakeConn();
  const sub: number[] = [];
  for (let z = -10; z <= 10; z++) for (let x = -10; x <= 10; x++) sub.push(x, z, 1);   // 441
  svc.onChunks(c, p, chunksMsg(0, sub));
  svc.tick(c, p);
  assert.equal(open, LOADS_PER_TICK);
  for (let i = 0; i < 6; i++) svc.tick(c, p);
  assert.equal(most, LOADS_MAX);
  while (gate.length) gate.shift()!();
  await settle();
  svc.flushCe(c);
  const l = entries(c.take('ce'));
  assert.ok(l.length > 0);
  const d = l.map((e) => Math.max(Math.abs(e[0]), Math.abs(e[1])));
  assert.deepEqual(d, [...d].sort((a, b) => a - b), 'sent nearest first');
  assert.equal(d[0], 0);
});

test('joining late into a large base: ce paced at CE_BYTES nearest first, cache shared per revision, nothing past BUF_CE', async () => {
  const r = rig(), realm = r.sim.realms[0], p = player(r, 'a', 8, 8), q = player(r, 'b', 8, 8);
  await grow(r, 0, 0, 0, 2);
  for (let cz = -2; cz <= 2; cz++) for (let cx = -2; cx <= 2; cx++) for (let i = 0; i < 3000; i++) realm.setBlock(cx * 16 + (i & 15), 70 + ((i >> 4) & 15), cz * 16 + ((i >> 8) & 15), B.cobble);
  const svc = new ChunkService(r.sim, r.edits, 12), a = new FakeConn(), b = new FakeConn(true), sub: number[] = [];
  for (let cz = -2; cz <= 2; cz++) for (let cx = -2; cx <= 2; cx++) sub.push(cx, cz, 1);
  svc.onChunks(a, p, chunksMsg(0, sub)); svc.onChunks(b, q, chunksMsg(0, sub));
  const first = await serve(svc, a, p);
  assert.equal(first.length, 1);
  const bytes = JSON.stringify(first[0]).length, l0 = entries(first);
  assert.ok(bytes <= CE_BYTES + 512, `${bytes} bytes in one flush`);
  assert.ok(l0.length >= 1 && l0.length < 25);
  assert.deepEqual(l0[0].slice(0, 2), [0, 0], 'the player\'s own chunk first');
  let all = [...l0], flushes = 1;
  while (all.length < 25) { svc.flushCe(a); all = all.concat(entries(a.take('ce'))); flushes++; assert.ok(flushes < 40); }
  const d = all.map((e) => Math.max(Math.abs(e[0]), Math.abs(e[1])));
  assert.deepEqual(d, [...d].sort((x, y) => x - y));
  // the local connection gets more per flush, and the very same encoded strings
  svc.tick(b, q); await settle();
  b.buffered = BUF_CE;
  svc.flushCe(b);
  assert.equal(b.out.length, 0, 'nothing while the send buffer is over BUF_CE');
  b.buffered = 0;
  svc.flushCe(b);
  const lb = entries(b.take('ce'));
  assert.ok(lb.length > l0.length && JSON.stringify(lb).length <= CE_BYTES_LOCAL + 512);
  const e00 = r.edits.peek(0, 0, 0)!;
  assert.equal(e00.wire!.rev, e00.rev);
  assert.equal(lb.find((e) => e[0] === 0 && e[1] === 0)![6], all.find((e) => e[0] === 0 && e[1] === 0)![6]);
  // what the entry says rebuilds the edit set
  const got = new Map<number, number>();
  assert.ok(decodeSparse(all.find((e) => e[0] === 1 && e[1] === 1)![6] as string, (i, id) => got.set(i, id)));
  assert.deepEqual([...got], [...r.edits.peek(0, 1, 1)!.cells!]);
});

test('chunks: changes before the ce are inside its rev, changes after it arrive as b, in the order of 4.1', async () => {
  const r = rig(), realm = r.sim.realms[0], p = player(r, 'a', 8, 8);
  await grow(r, 0, 0, 0, 0);
  const svc = new ChunkService(r.sim, r.edits, 12), c = new FakeConn();
  svc.onChunks(c, p, chunksMsg(0, [0, 0, 9]));
  svc.tick(c, p); await settle();
  realm.setBlock(1, 70, 1, B.stone);
  svc.flushLive(c);
  assert.equal(c.out.length, 0, 'no b for a chunk whose ce has not gone out');
  svc.flushCe(c);
  const [ce] = c.take('ce');
  assert.deepEqual(ce.l[0].slice(0, 6), [0, 0, 9, 1, r.edits.peek(0, 0, 0)!.genHash, 0]);
  realm.setBlock(2, 70, 2, B.stone); realm.setBlock(2, 71, 2, B.stone);
  svc.flushLive(c); svc.flushCe(c);
  assert.deepEqual(c.out, [{ t: 'b', dim: 0, l: [2, 70, 2, B.stone, 2, 2, 71, 2, B.stone, 3] }]);
});

test('chunks: gh for a chunk first generated after its ce went out; full answered only for ready sim chunks, 8 a second', async () => {
  const r = rig(), p = player(r, 'a', 8, 8), svc = new ChunkService(r.sim, r.edits, 12), c = new FakeConn(), sub: number[] = [];
  for (let i = 0; i < 12; i++) sub.push(i - 6, 0, 1);
  svc.onChunks(c, p, chunksMsg(0, sub));
  const l = entries(await serve(svc, c, p));
  assert.equal(l.length, 12);
  assert.ok(l.every((e) => e[4] === 0), 'not generated by the host yet: gh 0');
  await grow(r, 0, 0, 0, 1);
  await grow(r, 0, 0, 0, 1);   // integrated again: the hash is not news
  svc.flushLive(c);
  const gh = c.take('gh');
  assert.equal(gh.length, 1);
  const trip: number[][] = [];
  for (let i = 0; i < gh[0].l.length; i += 3) trip.push(gh[0].l.slice(i, i + 3));
  assert.deepEqual(trip.map((t) => t[0]).sort(), [-1, 0, 1]);
  assert.ok(trip.every((t) => t[2] === r.edits.peek(0, t[0], t[1])!.genHash));
  const full: number[] = [];
  for (let i = 0; i < 12; i++) full.push(i - 6, 0);
  svc.onChunks(c, p, chunksMsg(0, [], [], full.slice(0, 16)));
  svc.onChunks(c, p, chunksMsg(0, [], [], full.slice(16)));
  svc.flushCe(c);
  const fl = entries(c.take('ce'));
  assert.deepEqual(fl.map((e) => e[0]).sort(), [-1, 0, 1], `of ${FULL_PER_SEC} taken this second only the ready sim chunks are served`);
  assert.ok(fl.every((e) => e[4] === 0 && e[5] === 1));
  const arr = decodeFull(fl.find((e) => e[0] === 0)![6] as string)!;
  assert.deepEqual(arr, r.chunks[0].chunk(0, 0)!.blocks);
  for (let i = 0; i < 60; i++) svc.tick(c, p);
  svc.onChunks(c, p, chunksMsg(0, [], [], [0, 0, 7, 7]));
  svc.flushCe(c);
  assert.deepEqual(entries(c.take('ce')).map((e) => e[0]), [0], 'a new second, and a chunk not subscribed is ignored');
});

test('chunks: subscriptions beyond viewMax + 6 dropped once a second, all of them on a realm change, and the edit maps let go', async () => {
  const r = rig(), p = player(r, 'a', 8, 8), view = 10, svc = new ChunkService(r.sim, r.edits, view), c = new FakeConn();
  svc.onChunks(c, p, chunksMsg(0, [0, 0, 1, view + 3, 0, 2, view + 4, 0, 3]));
  assert.equal(entries(await serve(svc, c, p)).length, 3);
  assert.ok(r.edits.peek(0, view + 4, 0), 'held while subscribed');
  r.edits.release(0, view + 4, 0);
  assert.ok(r.edits.peek(0, view + 4, 0), 'a release is refused while the chunk is subscribed');
  p.body.teleport(8 - 16 * 3, GROUND, 8);   // view + 4 is now view + 7 away, view + 3 is view + 6
  for (let i = 0; i < 58; i++) svc.tick(c, p);   // serve ticked once
  r.edits.sweep();
  assert.ok(r.edits.peek(0, view + 4, 0));
  svc.tick(c, p);
  assert.equal(r.edits.peek(0, view + 4, 0), null, 'dropped beyond viewMax + SUB_KEEP and released');
  assert.ok(r.edits.peek(0, view + 3, 0), `kept at viewMax + ${SUB_KEEP}`);
  p.dim = 1;
  svc.onRealmChange(c);
  assert.equal(r.edits.size, 0);
  await grow(r, 0, 0, 0, 0);
  r.sim.realms[0].setBlock(1, 70, 1, B.stone);
  svc.flushLive(c);
  assert.equal(c.out.length, 0, 'no b after the realm change');
});

test('the subscriptions of a connection are bounded by its range whatever its unsubs say', async () => {
  const r = rig(), p = player(r, 'a', 8, 8), view = 2, svc = new ChunkService(r.sim, r.edits, view), c = new FakeConn();
  const sub: number[] = [];
  for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) sub.push(x, z, 1);
  svc.onChunks(c, p, chunksMsg(0, sub));
  for (let i = 0; i < 4; i++) await serve(svc, c, p);
  assert.equal(r.edits.size, 13 * 13);
  for (let k = 0; k < 4; k++) {
    p.body.teleport(8 + 16 * 40 * (k + 1), GROUND, 8);
    for (let i = 0; i < 60; i++) svc.tick(c, p);
    await settle();
  }
  assert.equal(r.edits.size, 0, `(2 x (view + ${SUB_KEEP}) + 1)^2 at most; here none is in range`);
  assert.equal(chunkKey(0, 0) > 0, true);
});
