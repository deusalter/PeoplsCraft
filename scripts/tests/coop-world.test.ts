// The co-op rules of the world (7.5 to 7.7, 7.9, 7.10, 9) with several players: a SimHost on a manual clock, each player a
// Session over the in-thread transport, as host.test.ts drives one. Every number is the document's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../../src/client/session';
import { CVOL } from '../../src/core/constants';
import { B } from '../../src/data/blocks';
import { QUESTS } from '../../src/data/quests';
import { ClientVoxels, VoxChunk } from '../../src/net/clientvoxels';
import { SimHost } from '../../src/net/host';
import { loopback } from '../../src/net/loopback';
import type { S2C, S2COf } from '../../src/net/protocol';
import type { Fx } from '../../src/sim/fx';
import { MV_GROUND } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';
import type { ChunkSource, GenResult } from '../../src/sim/chunksource';
import { STEP } from '../../src/sim/clock';
import { gateStand } from '../../src/sim/gates';
import { hashBlocks } from '../../src/sim/genjob';
import { playerIdOf } from '../../src/sim/identity';
import { LINGER, STALL_AFTER, active, hurtPlayer, type SimPlayer, useBed } from '../../src/sim/player';
import type { Batch } from '../../src/sim/storage';
import { MemStorage, StorageError } from '../../src/sim/storage';

const GROUND = 64;
function flat(dim: number, cx: number, cz: number): GenResult {
  const blocks = new Uint8Array(CVOL);
  for (let col = 0; col < 256; col++) for (let y = 0; y < GROUND; y++) blocks[(col << 8) | y] = y === 0 ? B.bedrock : B.stone;
  return { dim, cx, cz, blocks, biomes: new Uint8Array(256), ents: [], hash: hashBlocks(blocks) };
}
/** Flat stone under y = 64 in every realm, generated the moment it is asked for. */
class FlatSource implements ChunkSource {
  jobs: [number, number, number][] = [];
  get pending(): number { return this.jobs.length; }
  request(dim: number, cx: number, cz: number): void { if (!this.jobs.some((j) => j[0] === dim && j[1] === cx && j[2] === cz)) this.jobs.push([dim, cx, cz]); }
  cancel(dim: number, cx: number, cz: number): void { this.jobs = this.jobs.filter((j) => !(j[0] === dim && j[1] === cx && j[2] === cz)); }
  poll(max: number): GenResult[] { return this.jobs.splice(0, Math.min(max, this.jobs.length)).map(([d, cx, cz]) => flat(d, cx, cz)); }
  dispose(): void { this.jobs = []; }
}

interface Rig { host: SimHost; storage: MemStorage }
async function rig(o: { solo?: boolean; cheats?: boolean; storage?: MemStorage } = {}): Promise<Rig> {
  const storage = o.storage ?? new MemStorage(), solo = !!o.solo;
  const host = new SimHost({ now: () => performance.now(), setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as NodeJS.Timeout), log: () => {} },
    storage, new FlatSource(), { id: 'w', name: 'Coop', seed: 7, seedText: '7', cheats: o.cheats ?? true, password: null, maxPlayers: solo ? 1 : 8, viewMax: 8, clock: 'manual', saveEvery: 0, solo });
  await host.start();
  return { host, storage };
}

interface Client {
  s: Session; t: Transport; got: S2C[]; closed: string[]; tp: number; pos: [number, number, number]; token: string; name: string; p: SimPlayer;
  of<T extends S2C['t']>(t: T): S2COf<T>[];
  /** Every toast and banner text this client was sent in `fx`. */
  texts(): string[];
}
const TYPES: S2C['t'][] = ['welcome', 'error', 'st', 'stats', 'hurt', 'dead', 'tp', 'open', 'rej', 'fx', 'flags', 'quest', 'time', 'event', 'pl', 'cmdr', 'saved'];
let tokens = 0;
function client(host: SimHost, name: string, local = false): Client {
  const { transport, conn } = loopback({ local });
  host.connect(conn);
  const s = new Session(transport), vox = new ClientVoxels((cx, cz, key) => new VoxChunk(cx, cz, key)), got: S2C[] = [], closed: string[] = [];
  transport.onClose = (code) => { closed.push(code); };
  vox.attach(s);
  const token = (++tokens).toString(16).padStart(32, '0');
  const c: Client = {
    s, t: transport, got, closed, tp: 0, pos: [0, 0, 0], token, name, p: null as unknown as SimPlayer,
    of: (t) => got.filter((m) => m.t === t) as never,
    texts: () => c.of('fx').flatMap((m) => m.l).filter((e: Fx) => e[0] === 't' || e[0] === 'n').map((e) => String(e[1])),
  };
  for (const t of TYPES) s.on(t, (m) => { got.push(m); });
  s.on('welcome', (m) => { c.tp = m.tp; c.pos = [m.pos[0], m.pos[1], m.pos[2]]; });
  s.on('tp', (m) => { c.tp = m.id; c.pos = [m.x, m.y, m.z]; });
  s.mover = () => ({ tp: c.tp, x: c.pos[0], y: c.pos[1], z: c.pos[2], vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: MV_GROUND });
  return c;
}
/** `n` steps, every client pumped after each; the clients in `live` send a move before each step, as a frame does. */
async function run(r: Rig, n: number, all: Client[], live: Client[] = []): Promise<void> {
  for (let i = 0; i < n; i++) {
    for (const c of live) if (!c.closed.length) c.s.move();
    await r.host.stepManual(1);
    for (const c of all) c.s.pump();
  }
}
/** Step until `f` holds, at most `max` steps. */
async function until(r: Rig, f: () => boolean, max: number, all: Client[], live: Client[] = all): Promise<number> {
  for (let i = 0; i < max; i++) { if (f()) return i; await run(r, 1, all, live); }
  assert.ok(f(), 'condition not reached in ' + max + ' steps');
  return max;
}
/** Say `ready` for the newest teleport and step until the host has put the player in play. */
async function land(r: Rig, c: Client, all: Client[]): Promise<void> {
  await run(r, 1, all);
  const n = c.of('tp').length;
  c.s.send({ t: 'ready', tp: c.tp });
  await until(r, () => c.of('tp').slice(n).some((m) => !m.load), 300, all, all.filter((q) => q !== c));
}
/** A player comes in: hello, welcome, ready, in play. */
async function join(r: Rig, all: Client[], name: string, local = false, again?: Client): Promise<Client> {
  const c = client(r.host, name, local);
  if (again) c.token = again.token;
  all.push(c);
  c.s.hello({ name, token: c.token, view: 8, build: 'test' });
  await until(r, () => c.of('welcome').length > 0, 20, all, all.filter((q) => q !== c));
  c.p = r.host.sim.players.get(local ? 'local' : playerIdOf(c.token)!)!;
  assert.ok(c.p, 'a player for ' + name);
  await land(r, c, all);
  assert.ok(active(c.p), name + ' in play');
  return c;
}
/** Every listed player is active again: one move each. */
async function wakeAll(r: Rig, all: Client[]): Promise<void> { await run(r, 1, all, all.filter((c) => !c.closed.length)); }
/** A player crosses to another realm by command and lands there. */
async function cross(r: Rig, c: Client, dim: number, all: Client[]): Promise<void> {
  r.host.sim.handle(c.p, { t: 'cmd', id: 1, text: 'dim ' + dim });
  await land(r, c, all);
  assert.equal(c.p.dim, dim); assert.ok(active(c.p));
}
const quiet = (r: Rig): void => { const sim = r.host.sim; for (const re of sim.realms) { re.mobs.hostileCap = 0; re.mobs.passiveCap = 0; re.mobs.clear(); } };

test('a player heard from for 90 ticks is in play; at 90 it is stalled, safe and no target; a move ends it; a local player never stalls', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), p = a.p, realm = sim.realms[0];
  quiet(r);
  a.s.move(); await run(r, 1, all);
  const t0 = p.lastMoveTick;
  assert.equal(STALL_AFTER, 90);
  while (sim.tick < t0 + STALL_AFTER - 1) await run(r, 1, all);
  assert.ok(!p.stalled && active(p), '89 ticks without a move');
  await run(r, 1, all);
  assert.equal(sim.tick - t0, 90);
  assert.ok(p.stalled && !active(p), 'stalled at 90');
  assert.ok(!realm.targets().includes(p), 'no target');
  const hp = p.stats.hp;
  hurtPlayer(sim, p, 10, p.body.x + 1, p.body.z, 'test');
  assert.equal(p.stats.hp, hp, 'cannot be hurt');
  await run(r, 1, all, [a]);
  assert.ok(!p.stalled && active(p), 'the next move ends it');
  hurtPlayer(sim, p, 10, p.body.x + 1, p.body.z, 'test');
  assert.ok(p.stats.hp < hp, 'hurt again once in play');
  // solo: the local player is never stalled
  const s = await rig({ solo: true }), sl: Client[] = [], l = await join(s, sl, 'Solo', true);
  await run(s, 200, sl);
  assert.ok(!l.p.stalled && active(l.p));
});

test('a dropped player lingers for the 30 s counted from its last move, then is parked; a silent one is closed `idle` at 30 s and parked at once', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), p = a.p, slot = p.slot;
  quiet(r);
  await run(r, 1, all, all);
  const t0 = p.lastMoveTick;
  // ten seconds of silence, then the socket closes
  await run(r, 600, all, [b]);
  a.t.close();
  assert.ok(!p.online && !p.parked);
  assert.equal(LINGER, 30);
  assert.ok(Math.abs(p.lingerT - (LINGER - (sim.tick - t0) * STEP)) < 1e-9, 'the grace counts from the last move');
  assert.ok(Math.abs(p.lingerT - 20) < 0.05);
  assert.ok(sim.realms[0].players.includes(p) && p.slot === slot, 'still in its realm, on its slot');
  assert.ok(!sim.realms[0].targets().includes(p));
  const hp = p.stats.hp;
  hurtPlayer(sim, p, 10, p.body.x, p.body.z, 'test');
  assert.equal(p.stats.hp, hp);
  await until(r, () => p.parked, 1300, all, [b]);
  assert.ok(Math.abs(sim.tick - (t0 + LINGER * 60)) <= 2, `parked ${sim.tick - t0} ticks after the last move`);
  assert.equal(p.slot, 0); assert.ok(!sim.realms[0].players.includes(p)); assert.ok(sim.players.has(p.id));
  // the same silence on an open socket: the host closes it itself
  const t1 = b.p.lastMoveTick;
  await until(r, () => b.closed.length > 0, 1900, all, []);
  assert.deepEqual(b.closed, ['idle']); assert.equal(b.of('error').at(-1)!.code, 'idle');
  assert.ok(Math.abs(sim.tick - (t1 + 1800)) <= 2, `closed ${sim.tick - t1} ticks after the last move`);
  assert.ok(b.p.parked, 'parked at once');
});

test('a resume from lingering keeps the slot and what the player was part of; a newcomer meanwhile takes another slot', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), p = a.p, slot = p.slot, realm = sim.realms[0];
  quiet(r);
  sim.handle(b.p, { t: 'cmd', id: 1, text: 'freeze on' });
  sim.handle(p, { t: 'cmd', id: 2, text: 'boss 1' });
  const boss = realm.mobs.list.find((m) => m.active && m.boss)!;
  assert.ok(boss, 'a boss');
  realm.mobs.hurt(boss, 5, 0, 0, 0, false, p);
  await run(r, 1, all, all);
  a.t.close();
  await run(r, 120, all, [b]);
  const c = await join(r, all, 'Cyd');
  assert.notEqual(c.p.slot, slot, 'the lingering player keeps its slot');
  const back = await join(r, all, 'Ada', false, a);
  assert.equal(back.p, p, 'the same SimPlayer'); assert.equal(p.slot, slot);
  assert.ok(boss.active, 'the boss is where it was');
  assert.ok(boss.hitBy.has(p.id), 'still counted by record id');
  const parts = (boss.boss as unknown as { parts?: Set<string> }).parts;
  if (parts) assert.ok(parts.has(p.id), 'still a participant');
});

test('a parked player leaves memory only with the commit that makes its record durable', async () => {
  const storage = new MemStorage(), r = await rig({ storage }), sim = r.host.sim, all: Client[] = [];
  let hold: (() => void) | null = null, onTake: ((b: Batch) => void) | null = null;
  const commit = storage.commit.bind(storage);
  storage.commit = async (batch) => { onTake?.(batch); onTake = null; if (hold) await new Promise<void>((res) => { hold = res; }); return commit(batch); };
  const a = await join(r, all, 'Ada'), p = a.p;
  a.s.send({ t: 'bye' });
  await run(r, 1, all);
  assert.ok(p.parked && p.unsaved && sim.players.has(p.id));
  // a commit under way, which then fails
  hold = () => {};
  const s1 = r.host.save();
  await new Promise((res) => setTimeout(res, 0));
  assert.ok(sim.players.has(p.id), 'not while the commit is under way');
  storage.failNext = new StorageError('io', 'disk gone');
  (hold as () => void)(); hold = null;
  await s1;
  assert.ok(sim.players.has(p.id), 'a failed commit makes nothing durable');
  // one that took the record before it changed
  onTake = () => { p.mail.push({ k: 'stick', n: 1 }); };
  await r.host.save();
  assert.ok(sim.players.has(p.id), 'the record changed after the batch took it');
  await r.host.save();
  assert.ok(!sim.players.has(p.id), 'evicted by the commit that holds it as it is');
  assert.equal(storage.players.get(p.id)!.mail.length, 1);
});

test('a quick rejoin never reads storage: the parked player comes back from memory, before and during its commit', async () => {
  const storage = new MemStorage(), r = await rig({ storage }), sim = r.host.sim, all: Client[] = [];
  let release: (() => void) | null = null;
  const commit = storage.commit.bind(storage);
  storage.commit = async (batch) => { if (release === null) { await new Promise<void>((res) => { release = res; }); } return commit(batch); };
  const a = await join(r, all, 'Ada'), p = a.p;
  p.inv.add({ k: 'cobble', n: 5 });
  let reads = 0;
  const loadPlayer = storage.loadPlayer.bind(storage);
  storage.loadPlayer = (id) => { reads++; return loadPlayer(id); };
  const loads = 0;
  a.s.send({ t: 'bye' }); await run(r, 1, all);
  assert.ok(p.parked);
  const b = await join(r, all, 'Ada', false, a);
  assert.equal(b.p, p, 'the same SimPlayer'); assert.ok(p.slot > 0);
  assert.equal(reads, loads, 'no read of the player record');
  assert.equal(p.inv.count('cobble'), 5);
  // parked again, its commit taken and still under way: the record in storage is older than the player
  b.s.send({ t: 'bye' }); await run(r, 1, all);
  const s1 = r.host.save();
  await new Promise((res) => setTimeout(res, 0));
  const c = await join(r, all, 'Ada', false, a);
  assert.equal(c.p, p); assert.equal(reads, loads);
  p.inv.add({ k: 'cobble', n: 2 });
  (release as unknown as () => void)();
  await s1;
  assert.ok(sim.players.has(p.id) && !p.parked, 'a commit that resolves under a resumed player does not evict it');
  c.s.send({ t: 'bye' }); await run(r, 1, all);
  await r.host.save();
  assert.ok(!sim.players.has(p.id));
  const d = await join(r, all, 'Ada', false, a);
  assert.notEqual(d.p, p); assert.equal(d.p.inv.count('cobble'), 7, 'read back as it was last');
});

test('the night passes only when every active player of the Overworld sleeps; stalled, lingering and elsewhere neither block nor are needed', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), c = await join(r, all, 'Cyd'), d = await join(r, all, 'Dov');
  quiet(r);
  await cross(r, d, 1, all);
  await wakeAll(r, all);
  const w = sim.realms[0], bed = (q: Client, i: number): [number, number, number] => {
    const x = Math.floor(q.p.body.x) + 2 + i, z = Math.floor(q.p.body.z) + 2;
    w.setBlock(x, GROUND, z, B.bedroll); return [x, GROUND, z];
  };
  const beds = [a, b, c].map((q, i) => bed(q, i));
  const night = (): void => { sim.shared.clock = Math.floor(sim.shared.clock) + 0.6; };
  night();
  const day0 = Math.floor(sim.shared.clock);
  useBed(sim, a.p, ...beds[0]);
  assert.ok(a.p.sleeping && sim.isNight());
  useBed(sim, b.p, ...beds[1]);
  await run(r, 61, all, all);
  assert.ok(sim.isNight(), 'Cyd is awake');
  assert.ok(a.texts().some((t) => t === 'Ada and Bram are resting (2/3)'), 'the toast names who rests and the count');
  // Cyd goes silent: stalled, and the once-a-second check lets the night go
  await until(r, () => !sim.isNight(), 200, all, [a, b, d]);
  assert.ok(c.p.stalled);
  assert.equal(Math.floor(sim.shared.clock), day0 + 1);
  assert.ok(!a.p.sleeping && !b.p.sleeping);
  assert.ok(a.p.stats.buffs.has('dawn') && b.p.stats.buffs.has('dawn'));
  assert.ok(!c.p.stats.buffs.has('dawn') && !d.p.stats.buffs.has('dawn'), 'dawn is for those who slept');
  assert.ok(a.texts().includes('Morning') && c.texts().includes('Morning') && !d.texts().includes('Morning'), 'the banner is the Overworld\'s');
  // a lingering player is not needed either; one who is in play and awake holds the night
  await wakeAll(r, all);
  night();
  useBed(sim, a.p, ...beds[0]); useBed(sim, b.p, ...beds[1]);
  await run(r, 130, all, all);
  assert.ok(sim.isNight() && a.p.sleeping && b.p.sleeping, 'Cyd in play and awake');
  c.t.close();
  await until(r, () => !sim.isNight(), 70, all, [a, b, d]);
  // alone the rule is today's: a bed at night is morning at once
  a.p.stats.buffs.clear();
  night();
  b.t.close();
  await run(r, 1, all, [a, d]);
  useBed(sim, a.p, ...beds[0]);
  assert.ok(!sim.isNight() && !a.p.sleeping && a.p.stats.buffs.has('dawn'));
});

test('sleep ends when the sleeper moves 0.3 blocks or is hurt; a bed whose block is gone is forgotten and its owner told', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), w = sim.realms[0];
  quiet(r);
  const x = Math.floor(a.p.body.x) + 2, z = Math.floor(a.p.body.z);
  w.setBlock(x, GROUND, z, B.bedroll);
  sim.shared.clock = Math.floor(sim.shared.clock) + 0.6;
  useBed(sim, a.p, x, GROUND, z);
  assert.ok(a.p.sleeping);
  a.pos = [a.pos[0] + 0.2, a.pos[1], a.pos[2]];
  await run(r, 2, all, all);
  assert.ok(a.p.sleeping, '0.2 blocks');
  a.pos = [a.pos[0] + 0.2, a.pos[1], a.pos[2]];
  await run(r, 2, all, all);
  assert.ok(!a.p.sleeping, '0.4 blocks');
  useBed(sim, a.p, x, GROUND, z);
  assert.ok(a.p.sleeping);
  hurtPlayer(sim, a.p, 3, a.p.body.x + 2, a.p.body.z, 'test');
  assert.ok(!a.p.sleeping, 'hurt');
  assert.deepEqual(a.p.bed, [x, GROUND, z]);
  b.p.bed = [x, GROUND, z];
  w.setBlock(x, GROUND, z, 0);
  await until(r, () => a.p.bed === null && b.p.bed === null, 70, all);
  assert.ok(a.texts().includes('Your bedroll is gone.') && b.texts().includes('Your bedroll is gone.'));
});

test('journal: flags are shared; craft, have and level steps are met by any one online player, never summed; completion pays every online player', async () => {
  const r = await rig(), sim = r.host.sim, s = sim.shared, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), l = await join(r, all, 'Lin');
  quiet(r);
  l.t.close();
  await run(r, 1, all, [a, b]);
  const steps = (): Promise<void> => run(r, 31, all, [a, b]);
  const xp = (q: Client): string => `${q.p.stats.level}|${q.p.stats.xp}`;
  // have: 4 logs, held by one
  assert.equal(QUESTS[0].key, 'wood'); assert.equal(s.quest, 0);
  l.p.inv.add({ k: 'oak_log', n: 4 });
  a.p.inv.add({ k: 'oak_log', n: 2 }); b.p.inv.add({ k: 'oak_log', n: 2 });
  await steps();
  assert.equal(s.quest, 0, 'two and two is not four, and a player who is away does not count');
  const xa = xp(a), xb = xp(b), xl = xp(l);
  a.p.inv.add({ k: 'oak_log', n: 2 });
  await steps();
  assert.equal(s.quest, 1);
  assert.ok(sim.flags.has('had:wood'));
  assert.ok(xp(a) !== xa && xp(b) !== xb && xp(l) === xl, 'experience for every online player');
  assert.ok(a.texts().some((t) => t.startsWith('Guide: Gather wood')) && b.texts().some((t) => t.startsWith('Guide: Gather wood')));
  // had:<key> counts for a have step once it has been met
  s.quest = 0;
  for (const q of [a, b]) q.p.inv.remove('oak_log', 6);
  await steps();
  assert.equal(s.quest, 1, 'had:wood');
  // flags: craft:workbench set by anyone
  sim.addFlag('craft:workbench');
  await steps();
  assert.equal(s.quest, 2);
  // craft relaxation: a better tool of the kind, held by an online player
  assert.equal(QUESTS[2].flag, 'craft:wood_pickaxe');
  l.p.inv.add({ k: 'iron_pickaxe', n: 1 });
  await steps();
  assert.equal(s.quest, 2, 'held by a player who is away');
  b.p.inv.add({ k: 'iron_pickaxe', n: 1 });
  await steps();
  assert.equal(s.quest, 4, 'wooden pick and stone pick both met by an iron one');
  // level: any online player at the level
  QUESTS.splice(4, 0, { key: 'lv', chapter: '', title: 'Level test', hint: '', level: 3 });
  try {
    l.p.stats.level = 5;
    await steps();
    assert.equal(s.quest, 4);
    a.p.stats.level = 3;
    await steps();
    assert.equal(s.quest, 5);
    assert.ok(sim.flags.has('had:lv'));
  } finally { QUESTS.splice(4, 1); }
});

test('a move-in need is met by any one online player; the body stands while its home chunk is a ready sim chunk', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), l = await join(r, all, 'Lin'), w = sim.realms[0];
  quiet(r);
  // the first comer already has a home far away; the next wants 40 coins carried
  sim.shared.homes.push({ x: 5000, y: GROUND, z: 5000, npc: 'wayfinder' });
  const hx = Math.floor(a.p.body.x) + 9, hz = Math.floor(a.p.body.z);
  for (let x = hx - 3; x <= hx + 3; x++) for (let z = hz - 3; z <= hz + 3; z++) for (let y = GROUND; y <= GROUND + 3; y++) {
    const wall = Math.abs(x - hx) === 3 || Math.abs(z - hz) === 3 || y === GROUND + 3;
    w.setBlock(x, y, z, wall ? B.stone : 0);
  }
  w.setBlock(hx - 3, GROUND, hz, B.door_x); w.setBlock(hx - 3, GROUND + 1, hz, B.door_x);
  w.setBlock(hx + 2, GROUND, hz + 2, B.torch);
  w.setBlock(hx, GROUND, hz, B.guest_bed); sim.npcs.addBed(hx, GROUND, hz);
  assert.equal(sim.npcs.check(hx, GROUND, hz), null, 'a valid room');
  l.p.inv.coins = 100; a.p.inv.coins = 20; b.p.inv.coins = 20;
  l.t.close();
  await run(r, 400, all, [a, b]);
  assert.equal(sim.shared.homes.find((h) => h.x === hx)!.npc, null, 'coins of one who is away, or split between two, do not count');
  b.p.inv.coins = 40;
  await until(r, () => sim.shared.homes.find((h) => h.x === hx)!.npc === 'provisioner', 400, all, [a, b]);
  assert.ok(sim.flags.has('npc:provisioner'));
  const body = (): boolean => w.mobs.list.some((m) => m.active && m.def.key === 'n_provisioner');
  await until(r, body, 70, all, [a, b]);
  // everybody walks far away: the home's chunk is released, and the body goes with it
  for (const q of [a, b]) { sim.handle(q.p, { t: 'cmd', id: 9, text: `tp ${hx + 3000} ${GROUND} ${hz}` }); }
  l.p.body.teleport(hx + 3000, GROUND, hz);
  // a chunk out of every player's keep is let go after 10 s
  await until(r, () => !w.ready(hx, hz), 900, all, [a, b]);
  await until(r, () => !body(), 70, all, [a, b]);
});

test('a gate one traveller raised is the gate the next arrives at; one whose blocks are gone is dropped and another is raised', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), c = await join(r, all, 'Cyd'), h = sim.realms[1];
  quiet(r);
  await cross(r, a, 1, all);
  quiet(r);
  assert.equal(sim.shared.gates.length, 1);
  const g = { ...sim.shared.gates[0] };
  assert.equal(g.dim, 1); assert.equal(g.kind, 1);
  assert.equal(h.getBlock(g.x - 1, g.y, g.z), B.hollow_frame); assert.equal(h.getBlock(g.x, g.y + 1, g.z), B.hollow_portal);
  const ret = a.p.portalReturn[1];
  assert.deepEqual(ret, [g.x, g.y + 1, g.z]);
  // the second traveller, from a column a few blocks off, comes out of the same gate
  b.pos = [b.pos[0] + 3, b.pos[1], b.pos[2] - 2]; await run(r, 2, all, all);
  await cross(r, b, 1, all);
  assert.equal(sim.shared.gates.length, 1, 'no second gate');
  assert.deepEqual(b.p.portalReturn[1], ret);
  const st = gateStand(g);
  assert.deepEqual([Math.floor(b.p.body.x), Math.floor(b.p.body.y), Math.floor(b.p.body.z)], st);
  let frames = 0;
  for (let x = g.x - 30; x <= g.x + 30; x++) for (let y = GROUND - 2; y < GROUND + 40; y++) for (let z = g.z - 30; z <= g.z + 30; z++) if (h.getBlock(x, y, z) === B.hollow_frame) frames++;
  assert.equal(frames, 14, 'one frame in the realm');
  // the frame is mined: the entry goes, and the next traveller gets a gate of its own on solid ground
  h.setBlock(g.x + 2, g.y + 2, g.z, 0);
  assert.equal(sim.shared.gates.length, 0, 'a cell of the gate changed');
  await cross(r, c, 1, all);
  assert.equal(sim.shared.gates.length, 1);
  assert.notDeepEqual(c.p.portalReturn[1], ret);
  assert.ok(h.getBlock(Math.floor(c.p.body.x), Math.floor(c.p.body.y) - 1, Math.floor(c.p.body.z)) !== 0, 'standing on something');
  // a frame changed without the registry hearing of it: the blocks decide at the next arrival
  const g2 = { ...sim.shared.gates[0] };
  const hook = h.chunks.onCell;
  h.chunks.onCell = null;
  h.setBlock(g2.x - 1, g2.y + 2, g2.z, 0);
  h.chunks.onCell = hook;
  assert.equal(sim.shared.gates.length, 1, 'the registry did not hear of it');
  const rc = c.p.portalReturn[1];
  await cross(r, c, 0, all);
  delete c.p.portalReturn[1];
  await cross(r, c, 1, all);
  assert.ok(!sim.shared.gates.some((q) => q.x === g2.x && q.y === g2.y && q.z === g2.z), 'an entry whose frame is broken is dropped');
  assert.equal(sim.shared.gates.length, 1, 'and another raised');
  assert.notDeepEqual(c.p.portalReturn[1], rc);
  // the way back: Ada left the Overworld by command, with no gate where she stood, so her return spot is not trusted
  assert.ok(a.p.portalReturn[0]);
  await cross(r, a, 0, all);
  const left = a.p.portalReturn[1];
  assert.deepEqual(left, st, 'she left the Hollows from in front of the gate');
  assert.equal(a.p.portalReturn[0], undefined, 'no sheet beside the spot');
  assert.equal(Math.floor(a.p.body.y), GROUND, 'a plain footing at that column');
  // and back to the Hollows by her return spot there, which still has its sheet
  await cross(r, a, 1, all);
  assert.deepEqual(a.p.portalReturn[1], left, 'the sheet is beside it');
  assert.ok(Math.hypot(a.p.body.x - left[0] - 0.5, a.p.body.z - left[2] - 0.5) <= 1, 'at the gate');
});

test('a realm left empty is suspended and owned drops are held for their owners; a parked player\'s drops go to its mail and reach its pack in play', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), h = sim.realms[1], w = sim.realms[0];
  quiet(r);
  await cross(r, a, 1, all);
  quiet(r);
  const q = a.p.body;
  h.drops.spawn(q.x + 40, q.y + 1, q.z, { k: 'flint', n: 2 }, 0, 0, 0, 0, a.p.id);
  h.drops.spawn(q.x + 40, q.y + 1, q.z, { k: 'feather', n: 3 }, 0, 0, 0, 0, b.p.id);
  h.drops.spawn(q.x + 40, q.y + 1, q.z, { k: 'stick', n: 1 }, 0, 0, 0, 0, 'gone-player');
  sim.handle(a.p, { t: 'cmd', id: 3, text: 'spawn thornling' });
  assert.ok(h.mobs.list.some((m) => m.active));
  await cross(r, a, 0, all);
  assert.equal(h.players.length, 0);
  assert.ok(!h.mobs.list.some((m) => m.active) && !h.drops.list.some((d) => d.active), 'nothing lives in an empty realm');
  assert.equal(sim.shared.owed['gone-player'].items[0].k, 'stick');
  assert.ok(b.p.mail.some((it) => it.k === 'feather') || b.p.inv.count('feather') === 3, 'held for Bram');
  // in play, what was held reaches the pack
  await until(r, () => a.p.mail.length === 0 && b.p.mail.length === 0, 30, all);
  assert.equal(a.p.inv.count('flint'), 2); assert.equal(b.p.inv.count('feather'), 3);
  // Bram parks with a drop of his own on the ground of a realm that goes on
  w.drops.spawn(b.p.body.x + 30, b.p.body.y + 1, b.p.body.z, { k: 'cobble', n: 4 }, 0, 0, 0, 0, b.p.id);
  b.s.send({ t: 'bye' }); await run(r, 1, all);
  assert.ok(b.p.parked);
  assert.ok(!w.drops.list.some((d) => d.active && d.owner === b.p.id));
  assert.ok(b.p.mail.some((it) => it.k === 'cobble' && it.n === 4));
  await r.host.save();
  assert.ok(r.storage.players.get(b.p.id)!.mail.some((it) => it.k === 'cobble'));
});

test('events grow with the players in the Overworld when they start, and a win pays every online player there in full', async () => {
  const r = await rig(), sim = r.host.sim, ev = sim.shared.events, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), c = await join(r, all, 'Cyd'), l = await join(r, all, 'Lin');
  quiet(r);
  await cross(r, c, 1, all);
  l.t.close();
  await run(r, 1, all, [a, b, c]);
  sim.events.start('raid');
  assert.equal(ev.g, Math.round((10 + sim.difficulty() * 3) * (1 + 0.5 * (2 - 1))), 'two online in the Overworld');
  const coins = [a, b, c, l].map((q) => q.p.inv.coins);
  ev.k = ev.g - 1;
  sim.events.onKill({ event: true } as never);
  assert.equal(ev.a, null);
  assert.equal(a.p.inv.coins - coins[0], 25); assert.equal(b.p.inv.coins - coins[1], 25);
  assert.equal(c.p.inv.coins, coins[2], 'elsewhere'); assert.equal(l.p.inv.coins, coins[3], 'away');
  assert.ok(sim.flags.has('event:raid'));
  // everyone online leaves the Overworld: a running event ends, lost
  sim.events.start('ashen');
  assert.equal(ev.g, Math.round(18 * 1.5));
  await cross(r, a, 1, all); await cross(r, b, 1, all);
  await run(r, 2, all, [a, b, c]);
  assert.equal(ev.a, null);
});

test('commands run on a server only under --cheats; a local connection always has them; bad words change nothing', async () => {
  const r = await rig({ cheats: false }), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada');
  const clock = sim.shared.clock;
  a.s.send({ t: 'cmd', id: 1, text: 'time night' });
  await run(r, 2, all, all);
  assert.equal(a.of('cmdr').at(-1)!.text, 'Commands are off on this server.');
  assert.ok(Math.abs(sim.shared.clock - clock) < 0.01);
  const s = await rig({ solo: true, cheats: false }), sl: Client[] = [], l = await join(s, sl, 'Solo', true);
  l.s.send({ t: 'cmd', id: 1, text: 'event bogus' });
  l.s.send({ t: 'cmd', id: 2, text: 'flag' });
  l.s.send({ t: 'cmd', id: 3, text: 'time night' });
  await run(s, 2, sl);
  assert.deepEqual(l.of('cmdr').map((m) => m.text), ['event raid|moon|ashen', 'flag <name>', 'time set']);
  assert.equal(s.host.sim.shared.events.a, null);
  assert.ok(s.host.sim.isNight());
});
