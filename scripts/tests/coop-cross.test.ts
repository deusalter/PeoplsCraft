// Where the fighting rules meet the connection states and the social view (7.4, 7.9, 7.10): a SimHost on a manual clock, each
// player a Session over the in-thread transport, as coop-world.test.ts drives them. Every number is the document's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../../src/client/session';
import { Social } from '../../src/client/social';
import { CVOL } from '../../src/core/constants';
import { B } from '../../src/data/blocks';
import { ClientVoxels, VoxChunk } from '../../src/net/clientvoxels';
import { playerFlags } from '../../src/net/hostsnap';
import { SimHost } from '../../src/net/host';
import { loopback } from '../../src/net/loopback';
import { MV_GROUND, PF_AWAY, type S2C, type S2COf } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';
import { trySummon } from '../../src/sim/actions';
import type { ChunkSource, GenResult } from '../../src/sim/chunksource';
import type { Fx } from '../../src/sim/fx';
import { hashBlocks } from '../../src/sim/genjob';
import { playerIdOf } from '../../src/sim/identity';
import type { Mob } from '../../src/sim/mobs';
import { active, type SimPlayer } from '../../src/sim/player';
import { MemStorage } from '../../src/sim/storage';

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
  /** The move flags this client sends. */
  flags: number;
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
    s, t: transport, got, closed, tp: 0, pos: [0, 0, 0], token, name, p: null as unknown as SimPlayer, flags: MV_GROUND,
    of: (t) => got.filter((m) => m.t === t) as never,
    texts: () => c.of('fx').flatMap((m) => m.l).filter((e: Fx) => e[0] === 't' || e[0] === 'n').map((e) => String(e[1])),
  };
  for (const t of TYPES) s.on(t, (m) => { got.push(m); });
  s.on('welcome', (m) => { c.tp = m.tp; c.pos = [m.pos[0], m.pos[1], m.pos[2]]; });
  s.on('tp', (m) => { c.tp = m.id; c.pos = [m.x, m.y, m.z]; });
  s.mover = () => ({ tp: c.tp, x: c.pos[0], y: c.pos[1], z: c.pos[2], vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: c.flags });
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
/** Say `ready` for every loading teleport, a second one included, until the host has put the player in play. */
async function settle(r: Rig, c: Client, all: Client[]): Promise<void> {
  await run(r, 1, all);
  const n = c.of('tp').length;
  let said = -1;
  await until(r, () => {
    const last = c.of('tp').slice(n).at(-1);
    if (last && !last.load) return true;
    if (c.tp !== said) { said = c.tp; c.s.send({ t: 'ready', tp: c.tp }); }
    return false;
  }, 600, all, all.filter((q) => q !== c));
}
/** A player is moved by command and steps on until the chunks round it are ready. */
async function tpTo(r: Rig, c: Client, x: number, y: number, z: number, all: Client[]): Promise<void> {
  r.host.sim.handle(c.p, { t: 'cmd', id: 7, text: `tp ${x} ${y} ${z}` });
  const w = r.host.sim.realms[c.p.dim];
  await until(r, () => w.store.areaReady(x, z, 3), 600, all, all);
}
/** A player comes in: hello, welcome, ready, in play. */
async function join(r: Rig, all: Client[], name: string, local = false, again?: Client, pre?: (c: Client) => void): Promise<Client> {
  const c = client(r.host, name, local);
  if (again) c.token = again.token;
  pre?.(c);
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

const OFFERING = 'verdant_idol';
/** An altar of boss 1 eight blocks north of `c`, the offering in its hand, and the summon as `use` makes it. */
function summon(r: Rig, c: Client): Mob {
  const sim = r.host.sim, p = c.p, realm = sim.realms[p.dim];
  const x = Math.floor(p.body.x), z = Math.floor(p.body.z) - 8;
  realm.setBlock(x, GROUND, z, B.altar1, true);
  p.inv.slots[p.inv.sel] = { k: OFFERING, n: 1 }; p.inv.touch();
  trySummon(sim, p, 1, x, GROUND, z);
  const m = realm.mobs.boss();
  assert.ok(m, 'a boss came up');
  return m;
}
const count = (p: SimPlayer, k: string): number => p.inv.slots.reduce((n, s) => n + (s && s.k === k ? s.n : 0), 0) + p.mail.reduce((n, s) => n + (s.k === k ? s.n : 0), 0);
const god = (r: Rig, ...cs: Client[]): void => { for (const c of cs) r.host.sim.handle(c.p, { t: 'cmd', id: 9, text: 'god on' }); };

test('a lone fighter whose link goes silent and then closes is waited for: the boss holds; when the grace ends the offering is in its mail', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), realm = sim.realms[0];
  quiet(r);
  const m = summon(r, a), b = m.boss!;
  assert.equal(sim.shared.summons.length, 1, 'the summon is recorded');
  assert.ok(b.parts.has(a.p.id) && b.by === a.p.id && b.item === OFFERING);
  assert.equal(count(a.p, OFFERING), 0, 'the offering is spent');
  await run(r, 60, all, [a]);
  // silence: stalled after 1.5 s, and from then on the boss stands where it is
  await run(r, 100, all, []);
  assert.ok(a.p.stalled && !active(a.p));
  const hp = a.p.stats.hp, x = m.x, z = m.z;
  await run(r, 600, all, []);
  assert.ok(m.active, 'held, not withdrawn, while its fighter is away');
  assert.ok(Math.hypot(m.x - x, m.z - z) < 0.01, 'no movement while it holds');
  assert.equal(a.p.stats.hp, hp, 'an away player takes no damage');
  // the socket closes: lingering, still waited for
  a.t.close();
  assert.ok(!a.p.online && !a.p.parked);
  await until(r, () => a.p.parked, 1500, all, []);
  assert.ok(!m.active, 'the realm emptied with the parking and the boss went with it');
  assert.equal(sim.shared.summons.length, 0);
  assert.equal(count(a.p, OFFERING), 1, 'interrupted by a lost connection: the offering is back, in the mail of a player in memory');
  assert.ok(a.p.mail.some((s) => s.k === OFFERING));
});

test('a fighter who comes back inside the grace finds the boss where it was, still a participant, and the fight goes on', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada');
  quiet(r);
  const m = summon(r, a), b = m.boss!;
  realm0hit(r, m, a.p, 20);
  await run(r, 60, all, [a]);
  a.t.close();
  await run(r, 600, all, []);
  assert.ok(m.active && b.holdT > 5, 'holding after ten seconds without its fighter');
  const back = await join(r, all, 'Ada', false, a);
  assert.equal(back.p, a.p, 'the same SimPlayer');
  assert.ok(m.active && b.parts.has(a.p.id) && m.hitBy.has(a.p.id));
  const x = m.x, z = m.z;
  await run(r, 120, all, [back]);
  assert.equal(b.holdT, 0, 'a valid target again');
  assert.ok(!b.lost);
  assert.ok(Math.hypot(m.x - x, m.z - z) > 0.5 || b.atk !== null, 'moving or attacking again');
  assert.equal(sim.shared.summons.length, 1, 'the fight is still the summoned one');
});

function realm0hit(r: Rig, m: Mob, p: SimPlayer, dmg: number): void { r.host.sim.realms[p.dim].mobs.hurt(m, dmg, 0, 0, 0, false, p); }

test('three fighters scale the boss to 924; a share for one whose link dropped goes to its mail, the others pick up their own heartroot', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), c = await join(r, all, 'Cyd');
  quiet(r); god(r, a, b, c);
  const m = summon(r, a), bs = m.boss!;
  assert.ok(bs.parts.has(b.p.id) && bs.parts.has(c.p.id), 'everyone within 32 blocks joins at the summon');
  await run(r, 61, all, all);
  assert.equal(m.maxHp, 924);
  for (const q of [a, b, c]) realm0hit(r, m, q.p, 10);
  await run(r, 1, all, all);
  b.t.close();
  await run(r, 120, all, [a, c]);
  assert.ok(!b.p.online && !b.p.parked, 'Bram lingers');
  const xb = b.p.stats.xp + b.p.stats.level * 1e6, coins = b.p.inv.coins;
  realm0hit(r, m, a.p, 5000);
  assert.ok(!m.active, 'dead');
  assert.equal(sim.shared.summons.length, 0, 'a kill refunds nothing and ends the entry');
  await run(r, 120, all, [a, c]);
  assert.ok(count(a.p, 'heartroot') >= 6 && count(c.p, 'heartroot') >= 6, 'each active fighter has its own heartroot');
  assert.ok(b.p.mail.some((s) => s.k === 'heartroot'), 'the lingering one has it in its mail');
  assert.ok(b.p.stats.xp + b.p.stats.level * 1e6 > xb && b.p.inv.coins > coins, 'and its experience and coins on its SimPlayer');
  assert.equal(count(a.p, OFFERING), 0, 'no refund for a fight that was won');
});

test('a share for a fighter parked and evicted before the kill waits in shared.owed; a newcomer on its slot gets none; its next join pays it', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram');
  quiet(r); god(r, a, b);
  const m = summon(r, a), slot = b.p.slot, bid = b.p.id;
  realm0hit(r, m, b.p, 10);
  await run(r, 1, all, all);
  b.t.close();
  await until(r, () => b.p.parked, 2000, all, [a]);
  assert.ok(m.boss!.parts.has(bid), 'a parked participant stays one');
  await r.host.save();
  assert.ok(!sim.players.has(bid), 'evicted');
  const c = await join(r, all, 'Cyd');
  assert.equal(c.p.slot, slot, 'the newcomer took the freed slot');
  // far from the fight: a newcomer standing by would earn a share of its own
  await tpTo(r, c, m.boss!.altar[0] + 200.5, GROUND + 0.01, m.boss!.altar[2] + 0.5, [a, c]);
  realm0hit(r, m, a.p, 5000);
  assert.ok(!m.active);
  const owed = sim.shared.owed[bid];
  assert.ok(owed && owed.xp > 0 && owed.items.some((s) => s.k === 'heartroot'), 'held in the world record');
  await run(r, 120, all, [a, c]);
  assert.equal(count(c.p, 'heartroot'), 0, 'nothing for the stranger on the slot');
  const back = await join(r, all, 'Bram', false, b);
  assert.notEqual(back.p, b.p, 'loaded again from storage');
  assert.ok(!sim.shared.owed[bid], 'paid at the join');
  await run(r, 30, all, [a, c, back]);
  assert.ok(count(back.p, 'heartroot') >= 6, 'in the pack once in play');
});

test('a boss waiting for a lingering fighter notes the loss when it is parked, and its withdrawal then refunds the summoner; a walk-away while connected does not', async () => {
  const r = await rig(), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram');
  quiet(r); god(r, a, b);
  const m = summon(r, a), bs = m.boss!, alt = bs.altar;
  realm0hit(r, m, b.p, 5);
  await run(r, 1, all, all);
  b.t.close();
  await tpTo(r, a, alt[0] + 0.5, GROUND + 0.01, alt[2] + 100.5, [a]);
  await until(r, () => b.p.parked, 2000, all, [a]);
  await until(r, () => !m.active, 120, all, [a]);
  assert.ok(bs.lost, 'the participant it waited for was parked');
  assert.equal(count(a.p, OFFERING), 1, 'interrupted: the offering is back in the active summoner\'s pack');
  assert.ok(a.p.inv.slots.some((s) => s && s.k === OFFERING));
  // the same walk-away with every connection whole: no refund
  await tpTo(r, a, alt[0] + 0.5, GROUND + 0.01, alt[2] + 8.5, [a]);
  for (let i = 0; i < a.p.inv.slots.length; i++) if (a.p.inv.slots[i]?.k === OFFERING) a.p.inv.slots[i] = null;
  a.p.inv.touch();
  const m2 = summon(r, a);
  await tpTo(r, a, alt[0] + 0.5, GROUND + 0.01, alt[2] + 100.5, [a]);
  await until(r, () => !m2.active, 900, all, [a]);
  assert.ok(!m2.boss!.lost);
  assert.equal(count(a.p, OFFERING), 0, 'withdrawn from a party that walked away: nothing back');
  assert.equal(sim.shared.summons.length, 0);
});

test('the boot rule: an offering whose boss did not outlive the host is owed to its summoner and paid at the next join', async () => {
  const storage = new MemStorage(), r = await rig({ storage }), sim = r.host.sim, all: Client[] = [];
  const a = await join(r, all, 'Ada');
  quiet(r);
  summon(r, a);
  await r.host.save();
  assert.equal(storage.world!.state.summons.length, 1);
  const r2 = await rig({ storage }), s2 = r2.host.sim, all2: Client[] = [];
  assert.equal(s2.shared.summons.length, 0, 'cleared at start');
  assert.ok(s2.shared.owed[a.p.id]?.items.some((s) => s.k === OFFERING), 'owed to the summoner');
  assert.equal(storage.world!.state.summons.length, 0, 'in one commit, before anyone joins');
  const back = await join(r2, all2, 'Ada', false, a);
  await run(r2, 10, all2, all2);
  assert.equal(count(back.p, OFFERING), 1);
  void sim;
});

test('the list says away for a player whose link is gone, and a stalled body is drawn away; a chat command reaches cheats only under --cheats', async () => {
  const r = await rig({ cheats: false }), all: Client[] = [];
  const so = new Social();
  const a = await join(r, all, 'Ada', false, undefined, (q) => so.connect(q.s)), b = await join(r, all, 'Bram'), c = await join(r, all, 'Cyd');
  quiet(r);
  so.cmd = (text) => { const n = a.of('cmdr').length; a.s.send({ t: 'cmd', id: 77, text }); return until(r, () => a.of('cmdr').length > n, 10, all, [a]).then(() => a.of('cmdr').at(-1)!.text); };
  await run(r, 61, all, all);
  const mb = [...so.members.values()].find((q) => q.name === 'Bram')!, mc = [...so.members.values()].find((q) => q.name === 'Cyd')!;
  assert.ok(mb && mc);
  assert.equal(so.state(mb), '');
  // Cyd goes silent: away in every snapshot that holds it
  await run(r, 100, all, [a, b]);
  assert.ok(c.p.stalled && (playerFlags(r.host.sim, c.p) & PF_AWAY) !== 0);
  // Bram's socket closes: out of `where`, so away in the list while it lingers
  b.t.close();
  await run(r, 61, all, [a]);
  assert.ok(!b.p.parked);
  assert.equal(so.state(mb), 'away');
  so.submit('/time night');
  await run(r, 12, all, [a]);
  await new Promise((res) => setTimeout(res, 0));
  assert.equal(so.lines.at(-1)!.text, 'Commands are off on this server.');
});

test('a participant who says bye is one no longer; one whose link is closed by the host for silence stays one', async () => {
  const r = await rig(), all: Client[] = [];
  const a = await join(r, all, 'Ada'), b = await join(r, all, 'Bram'), c = await join(r, all, 'Cyd');
  quiet(r); god(r, a, b, c);
  const m = summon(r, a), parts = m.boss!.parts;
  assert.ok(parts.has(b.p.id) && parts.has(c.p.id));
  b.s.send({ t: 'bye' });
  await run(r, 2, all, [a, c]);
  assert.ok(b.p.parked && !parts.has(b.p.id), 'bye ends participation');
  await until(r, () => c.closed.length > 0, 1900, all, [a]);
  assert.deepEqual(c.closed, ['idle']);
  assert.ok(c.p.parked && parts.has(c.p.id), 'a lost link does not');
});
