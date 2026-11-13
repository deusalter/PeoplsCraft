// SimHost over the in-thread transport: the hello and the join lock, the way from welcome to a player in
// play, validated dispatch, the save, and a connection that goes and comes back. The client here is a
// Session with the pure block store, as a bot would hold them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../../src/client/session';
import { CVOL } from '../../src/core/constants';
import { B } from '../../src/data/blocks';
import { ClientVoxels, VoxChunk } from '../../src/net/clientvoxels';
import { SimHost } from '../../src/net/host';
import { loopback } from '../../src/net/loopback';
import type { S2C, S2COf } from '../../src/net/protocol';
import { MV_GROUND } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';
import type { ChunkSource, GenResult } from '../../src/sim/chunksource';
import { hashBlocks } from '../../src/sim/genjob';
import { playerIdOf, sha256Hex } from '../../src/sim/identity';
import { active } from '../../src/sim/player';
import { MemStorage, StorageError } from '../../src/sim/storage';

const GROUND = 64;
function flat(dim: number, cx: number, cz: number): GenResult {
  const blocks = new Uint8Array(CVOL);
  for (let col = 0; col < 256; col++) for (let y = 0; y < GROUND; y++) blocks[(col << 8) | y] = y === 0 ? B.bedrock : B.stone;
  return { dim, cx, cz, blocks, biomes: new Uint8Array(256), ents: [], hash: hashBlocks(blocks) };
}
/** Flat stone under y = 64 everywhere, generated the moment it is asked for. */
class FlatSource implements ChunkSource {
  jobs: [number, number, number][] = [];
  get pending(): number { return this.jobs.length; }
  request(dim: number, cx: number, cz: number): void { if (!this.jobs.some((j) => j[0] === dim && j[1] === cx && j[2] === cz)) this.jobs.push([dim, cx, cz]); }
  cancel(dim: number, cx: number, cz: number): void { this.jobs = this.jobs.filter((j) => !(j[0] === dim && j[1] === cx && j[2] === cz)); }
  poll(max: number): GenResult[] { return this.jobs.splice(0, Math.min(max, this.jobs.length)).map(([d, cx, cz]) => flat(d, cx, cz)); }
  dispose(): void { this.jobs = []; }
}

interface Rig { host: SimHost; storage: MemStorage; logs: string[] }
async function rig(solo: boolean, storage = new MemStorage(), maxPlayers = solo ? 1 : 4): Promise<Rig> {
  const logs: string[] = [];
  const host = new SimHost({ now: () => performance.now(), setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as NodeJS.Timeout), log: (l, m) => { logs.push(`${l} ${m}`); } },
    storage, new FlatSource(), { id: 'w', name: 'Test', seed: 7, seedText: '7', cheats: true, password: null, maxPlayers, viewMax: 8, clock: 'manual', saveEvery: 0, solo });
  await host.start();
  return { host, storage, logs };
}

/** One client end: a session, the block store of the 3 x 3 chunks round the origin, and everything it was sent. */
interface Client {
  s: Session; t: Transport; vox: ClientVoxels; got: S2C[]; closed: string[]; tp: number; pos: [number, number, number]; moveFlags: number;
  of<T extends S2C['t']>(t: T): S2COf<T>[];
  hello(name?: string, token?: string): void;
}
const TYPES: S2C['t'][] = ['welcome', 'error', 'st', 'stats', 'hurt', 'dead', 'tp', 'open', 'rej', 'ce', 'b', 'gh', 'fx', 'flags', 'quest', 'time', 'event', 'pl', 'where', 'chat', 'rtt', 'cmdr', 'stepped', 'saved'];
function client(host: SimHost, opt: { clone?: boolean; local?: boolean } = {}): Client {
  const { transport, conn } = loopback(opt);
  host.connect(conn);
  const s = new Session(transport), vox = new ClientVoxels((cx, cz, key) => new VoxChunk(cx, cz, key)), got: S2C[] = [], closed: string[] = [];
  transport.onClose = (code) => { closed.push(code); };
  vox.attach(s);
  const c: Client = {
    s, t: transport, vox, got, closed, tp: 0, pos: [0, 0, 0], moveFlags: MV_GROUND,
    of: (t) => got.filter((m) => m.t === t) as never,
    hello: (name = 'Ada', token = '') => s.hello({ name, token, view: 8, build: 'test' }),
  };
  for (const t of TYPES) s.on(t, (m) => { got.push(m); });
  s.on('welcome', (m) => { c.tp = m.tp; c.pos = [m.pos[0], m.pos[1], m.pos[2]]; });
  s.on('tp', (m) => { c.tp = m.id; c.pos = [m.x, m.y, m.z]; });
  s.mover = () => ({ tp: c.tp, x: c.pos[0], y: c.pos[1], z: c.pos[2], vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: c.moveFlags });
  return c;
}
/** Steps of the host with the client pumped after each, as a frame does it. */
async function run(r: Rig, n: number, ...cl: Client[]): Promise<void> {
  for (let i = 0; i < n; i++) { await r.host.stepManual(1); for (const c of cl) c.s.pump(); }
}
/** Generate and subscribe the chunks round the client's column, say `ready`, and step until the host has put the player in play. */
async function enter(r: Rig, c: Client): Promise<void> {
  await run(r, 3, c);
  const w = c.of('welcome').at(-1);
  assert.ok(w, 'a welcome');
  const cx = Math.floor(c.pos[0] / 16), cz = Math.floor(c.pos[2] / 16);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ch = c.vox.create(cx + dx, cz + dz), g = flat(w.dim, cx + dx, cz + dz);
    c.vox.generated(ch, g.blocks, g.biomes, false, g.hash);
  }
  c.vox.flush(1e6);
  c.s.send({ t: 'ready', tp: c.tp });
  for (let i = 0; i < 200 && !c.of('tp').some((m) => !m.load); i++) await run(r, 1, c);
  assert.ok(c.of('tp').some((m) => !m.load), 'the tp that ends the loading');
}

test('sha256Hex and the record id of a token', () => {
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('a'.repeat(64)), 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb');
  assert.equal(playerIdOf('0123456789abcdef0123456789abcdef')!.length, 24);
  assert.equal(playerIdOf('nope'), null);
});

for (const clone of [false, true]) test(`a new solo world: hello, welcome, loading, in play${clone ? ' (every message through JSON)' : ''}`, async () => {
  const r = await rig(true), sim = r.host.sim, c = client(r.host, { clone });
  assert.equal(sim.world.owner, 'local'); assert.equal(sim.world.id, 'w');
  c.hello();
  await run(r, 2, c);
  const w = c.of('welcome')[0];
  assert.ok(w, 'welcome after the player record was looked for');
  assert.equal(w.you.id, 'local'); assert.equal(w.world.seed, 7); assert.equal(w.cfg.cheats, true); assert.equal(w.cfg.maxPlayers, 1);
  assert.equal(w.players.length, 1); assert.equal(w.players[0].name, 'Ada');
  const st = c.of('st')[0];
  assert.ok(st && st.inv && st.ack === 0, 'the whole inventory follows the welcome');
  assert.equal(c.of('stats').length, 1);
  const p = sim.players.get('local')!;
  assert.ok(p.loading && !active(p));
  // behind the loading screen a solo world stands still
  const t0 = sim.tick;
  await run(r, 30, c);
  assert.equal(sim.tick, t0); assert.equal(sim.running(), false);
  await enter(r, c);
  assert.ok(active(p)); assert.equal(p.arriving, -1);
  await run(r, 2, c);
  assert.ok(sim.tick > t0, 'the world runs once the player is in play');
  assert.equal(Math.floor(p.body.y), GROUND, 'landed on the ground');
  assert.deepEqual(c.pos, [p.body.x, p.body.y, p.body.z]);
  assert.ok(sim.flags.has('started'));
  await run(r, 3, c);
  assert.ok(c.of('flags').some((m) => m.add.includes('started')));
  // every chunk it follows has had its (empty) edit set, so the block store is ready under the player
  assert.ok(c.vox.ready(Math.floor(c.pos[0]), Math.floor(c.pos[2])));
});

test('a move, a break and a placement: the body follows, subscribers hear `b`, the sequence is acknowledged', async () => {
  const r = await rig(true), sim = r.host.sim, c = client(r.host, { clone: true });
  c.hello(); await enter(r, c);
  const p = sim.players.get('local')!, realm = sim.realms[0];
  c.pos = [c.pos[0] + 0.5, c.pos[1], c.pos[2]];
  c.s.move();
  await run(r, 1, c);
  assert.equal(p.body.x, c.pos[0]); assert.equal(p.moveSeq, c.s.lastMove);
  const x = Math.floor(c.pos[0]) + 1, y = GROUND - 1, z = Math.floor(c.pos[2]);
  await r.host.sim.handle(p, { t: 'cmd', id: 1, text: 'creative' });
  c.s.act({ t: 'edit', seq: 1, k: 0, x, y, z, id: B.stone });
  await run(r, 2, c);
  assert.equal(realm.getBlock(x, y, z), 0);
  assert.equal(c.vox.getBlock(x, y, z), 0, 'the client store took the `b`');
  assert.ok(c.of('b').some((m) => m.l[0] === x && m.l[1] === y && m.l[2] === z && m.l[3] === 0));
  assert.equal(p.ackSeq, 1);
  assert.equal(c.of('st').at(-1)!.ack, 1);
  assert.equal(c.of('rej').length, 0);
  assert.ok(c.s.unsaved, 'a sequenced message newer than any save');
  // a break of a block that is not there is refused with the truth
  c.s.act({ t: 'edit', seq: 2, k: 0, x, y, z, id: B.stone });
  await run(r, 2, c);
  assert.deepEqual(c.of('rej').at(-1), { t: 'rej', seq: 2, cells: [x, y, z, 0] });
  assert.equal(sim.refused.edit, 1);
});

test('what is not a message closes the connection with `proto`, and so does a sequence out of order; the step goes on', async () => {
  const r = await rig(false), a = client(r.host, { local: false }), b = client(r.host, { local: false }), d = client(r.host, { local: false });
  a.hello('Ada', 'a'.repeat(32)); b.hello('Bea', 'b'.repeat(32)); d.hello('Dov', 'd'.repeat(32));
  await enter(r, a); await enter(r, b); await enter(r, d);
  assert.equal(r.host.sim.online(), 3);
  (a.t as unknown as { send(m: unknown): void }).send({ t: 'edit', seq: 1, k: 9, x: 0, y: 0, z: 0, id: 0 });
  b.s.send({ t: 'op', seq: 5, o: 'sel', i: 1 });
  const t0 = r.host.sim.tick;
  await run(r, 2, a, b, d);
  assert.equal(a.of('error')[0]?.code, 'proto'); assert.deepEqual(a.closed, ['proto']);
  assert.equal(b.of('error')[0]?.code, 'proto'); assert.deepEqual(b.closed, ['proto']);
  assert.equal(d.closed.length, 0);
  assert.equal(r.host.sim.tick, t0 + 2);
  assert.equal(r.host.sim.online(), 1);
  // the two that were cut off linger: they hold their slots, and nobody acts for them
  const pa = r.host.sim.players.get(playerIdOf('a'.repeat(32))!)!;
  assert.ok(!pa.online && !pa.parked && pa.lingerT > 0);
  assert.ok(a.of('pl').some((m) => m.add?.some((q) => q.name === 'Bea')), 'the first to join was told of the second');
  assert.equal(d.of('welcome')[0].players.length, 3);
});

test('two sockets saying hello with one token in the same step make one player, and the newest holds it', async () => {
  const r = await rig(false), sim = r.host.sim, tok = 'c'.repeat(32), id = playerIdOf(tok)!;
  let reads = 0;
  const load = r.storage.loadPlayer.bind(r.storage);
  r.storage.loadPlayer = (q) => { reads++; return load(q); };
  const a = client(r.host, { local: false }), b = client(r.host, { local: false });
  a.hello('Cy', tok); b.hello('Cy', tok);
  await run(r, 2, a, b);
  assert.equal(sim.players.size, 1);
  assert.deepEqual(a.closed, ['replaced']); assert.equal(a.of('error')[0].code, 'replaced'); assert.equal(a.of('welcome').length, 0);
  assert.equal(b.of('welcome').length, 1); assert.equal(b.of('welcome')[0].you.id, id);
  assert.equal(reads, 1, 'one read of the record');
  // a third socket takes an online player over: the same SimPlayer, loading again, under a new teleport id
  const p = sim.players.get(id)!, tp = p.tp;
  await enter(r, b);
  const c = client(r.host, { local: false });
  c.hello('Cy', tok);
  await run(r, 2, b, c);
  assert.deepEqual(b.closed, ['replaced']);
  assert.equal(sim.players.get(id), p); assert.equal(sim.players.size, 1);
  assert.ok(p.loading && p.online && p.tp !== tp);
  assert.equal(c.of('welcome')[0].tp, p.tp);
  assert.equal(reads, 1, 'nothing is read for an id that is in memory');
  // names are unique, whatever the case
  const e = client(r.host, { local: false });
  e.hello('cy', 'e'.repeat(32));
  await run(r, 2, e);
  assert.equal(e.of('error')[0].code, 'name_taken');
  const f = client(r.host, { local: false });
  f.hello('bad name!', 'f'.repeat(32));
  await run(r, 2, f);
  assert.equal(f.of('error')[0].code, 'name_invalid');
});

test('a full world refuses, and a hello with other numbers is told to reload', async () => {
  const r = await rig(false, new MemStorage(), 1), a = client(r.host, { local: false }), b = client(r.host, { local: false });
  a.hello('Ada', 'a'.repeat(32));
  await run(r, 2, a);
  b.hello('Bea', 'b'.repeat(32));
  await run(r, 2, a, b);
  assert.equal(b.of('error')[0].code, 'full');
  const c = client(r.host, { local: false });
  c.s.send({ t: 'hello', proto: 99, build: 'x', data: 0, name: 'Cy', token: 'c'.repeat(32), view: 8 });
  await run(r, 1, c);
  assert.equal(c.of('error')[0].code, 'version');
  const d = client(r.host, { local: false });
  d.s.send({ t: 'chat', text: 'hi' });
  await run(r, 1, d);
  assert.equal(d.of('error')[0].code, 'proto', 'anything before hello');
});

test('a save is one commit of world, player and edits, and tells the client; a failed one is taken again whole', async () => {
  const r = await rig(true), sim = r.host.sim, c = client(r.host);
  c.hello(); await enter(r, c);
  const p = sim.players.get('local')!, x = Math.floor(c.pos[0]) + 1, z = Math.floor(c.pos[2]);
  sim.handle(p, { t: 'cmd', id: 1, text: 'creative' });
  c.s.act({ t: 'edit', seq: 1, k: 0, x, y: GROUND - 1, z, id: B.stone });
  await run(r, 2, c);
  assert.ok(c.s.unsaved);
  r.storage.failNext = new StorageError('full', 'no room');
  c.s.send({ t: 'save' });
  await new Promise((res) => setTimeout(res, 5));
  c.s.pump();
  assert.deepEqual(c.of('saved').at(-1), { t: 'saved', ok: false, seq: 1, err: 'no room' });
  assert.equal(r.storage.commits, 0); assert.ok(c.s.unsaved);
  c.s.send({ t: 'save' });
  await new Promise((res) => setTimeout(res, 5));
  c.s.pump();
  assert.deepEqual(c.of('saved').at(-1), { t: 'saved', ok: true, seq: 1 });
  assert.ok(!c.s.unsaved);
  assert.equal(r.storage.commits, 1);
  assert.equal(r.storage.world!.state.tick, sim.tick);
  assert.ok(r.storage.world!.state.flags.includes('mine:stone'));
  const rec = r.storage.players.get('local')!;
  assert.equal(rec.pos.x, p.body.x); assert.equal(rec.modes.creative, true);
  const ch = r.storage.chunks.get(`0,${x >> 4},${z >> 4}`)!;
  assert.equal(ch.rev, 1);

  // "save now" takes what the client has already said, though no step has come for it
  c.s.send({ t: 'cmd', id: 2, text: 'give cobble 3' });
  c.s.send({ t: 'save' });
  await new Promise((res) => setTimeout(res, 5));
  assert.equal(JSON.stringify(r.storage.players.get('local')!.inv).includes('cobble'), true);

  // the same storage opened by a new host: the world goes on from the save, the player stands where it stood
  const r2 = await rig(true, r.storage), c2 = client(r2.host);
  assert.equal(r2.host.sim.tick, sim.tick);
  c2.hello(); await enter(r2, c2);
  const p2 = r2.host.sim.players.get('local')!;
  assert.equal(p2.fresh, false); assert.equal(p2.modes.creative, true);
  assert.ok(Math.abs(p2.body.x - p.body.x) < 1e-9 && Math.abs(p2.body.z - p.body.z) < 1e-9);
  assert.equal(r2.host.sim.realms[0].getBlock(x, GROUND - 1, z), 0, 'the edit is in the sim chunk');
  assert.equal(c2.vox.getBlock(x, GROUND - 1, z), 0, 'and reached the client as an edit set');
});

test('a connection that closes leaves its player lingering; hello again resumes the same player; bye parks it and a save lets it go', async () => {
  const r = await rig(false), sim = r.host.sim, tok = 'a'.repeat(32), id = playerIdOf(tok)!;
  const a = client(r.host, { local: false });
  a.hello('Ada', tok); await enter(r, a);
  const p = sim.players.get(id)!, slot = p.slot;
  a.t.close();
  assert.ok(!p.online && !p.parked && p.lingerT > 0);
  assert.equal(sim.realms[0].players.includes(p), true);
  const b = client(r.host, { local: false });
  b.hello('Ada', tok);
  await run(r, 2, b);
  assert.equal(sim.players.get(id), p); assert.equal(p.slot, slot); assert.ok(p.online && p.loading);
  await enter(r, b);
  assert.ok(active(p));
  b.s.send({ t: 'bye' });
  await run(r, 1, b);
  assert.ok(p.parked && p.slot === 0); assert.equal(sim.realms[0].players.length, 0);
  assert.deepEqual(b.closed, ['bye']);
  assert.ok(sim.players.has(id), 'in memory until its record is durable');
  await r.host.save();
  assert.equal(sim.players.has(id), false);
  assert.ok(r.storage.players.has(id));
  // and back from storage
  const c = client(r.host, { local: false });
  c.hello('Ada', tok);
  await run(r, 3, c);
  assert.equal(c.of('welcome').length, 1);
  assert.notEqual(sim.players.get(id), p);
  assert.equal(sim.players.get(id)!.fresh, false);
});

test('a player that comes back under another name holds the new name at once, and the old one is free', async () => {
  const r = await rig(false), sim = r.host.sim, tok = 'a'.repeat(32), id = playerIdOf(tok)!;
  const a = client(r.host, { local: false });
  a.hello('Al', tok); await enter(r, a);
  assert.equal(sim.world.names[id].name, 'Al');
  a.t.close();
  const b = client(r.host, { local: false });
  b.hello('Bob', tok); await run(r, 2, b);
  assert.equal(b.of('welcome').length, 1);
  assert.equal(sim.players.get(id)!.name, 'Bob');
  assert.equal(sim.world.names[id].name, 'Bob', 'the name the world knows the record by');
  const c = client(r.host, { local: false });
  c.hello('bob', 'c'.repeat(32)); await run(r, 2, c);
  assert.equal(c.of('error')[0]?.code, 'name_taken');
  assert.equal(c.of('welcome').length, 0);
  const d = client(r.host, { local: false });
  d.hello('Al', 'd'.repeat(32)); await run(r, 2, d);
  assert.equal(d.of('error').length, 0); assert.equal(d.of('welcome').length, 1, 'the name it left is anybody\'s');
});

test('a takeover ends what the older connection had under way: its window, its dig, its sleep', async () => {
  const r = await rig(false), sim = r.host.sim, tok = 'a'.repeat(32), id = playerIdOf(tok)!, realm = sim.realms[0];
  const a = client(r.host, { local: false });
  a.hello('Ada', tok); await enter(r, a);
  const p = sim.players.get(id)!, x = Math.floor(a.pos[0]) + 1, z = Math.floor(a.pos[2]);
  realm.setBlock(x, GROUND, z, B.chest);
  a.s.act({ t: 'use', seq: 1, x, y: GROUND, z, id: B.chest });
  a.s.act({ t: 'dig', on: true, x, y: GROUND - 1, z: z + 1 });
  await run(r, 2, a);
  assert.equal(p.window?.mode, 'chest'); assert.ok(p.dig); assert.ok(realm.viewers.get(`${x},${GROUND},${z}`)?.has(p));
  assert.equal(a.of('st').at(-1)!.ack, 1);
  p.sleeping = true;
  // the socket has died without the host hearing of it; the client is back on a new one
  const b = client(r.host, { local: false });
  b.hello('Ada', tok); await run(r, 2, a, b);
  assert.deepEqual(a.closed, ['replaced']);
  assert.equal(sim.players.get(id), p); assert.ok(p.online && p.loading);
  assert.equal(p.window, null, 'no window the new client never opened');
  assert.equal(realm.viewers.size, 0);
  assert.equal(p.dig, null); assert.equal(p.sleeping, false);
  const st = b.of('st')[0];
  assert.ok(st.inv && st.ack === 0); assert.equal(st.box, undefined, 'and no box in the first state');
});
