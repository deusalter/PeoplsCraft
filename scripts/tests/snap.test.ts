/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference types="vite/client" />
// The entity store is client code, which is compiled against the browser's types: the three lines above bring them into this program.
// Everything that moves, from the host's sims to the client's views: the snapshot a connection is
// sent, what each connection is told by interest, and what the client's entity store makes of it
// (interpolation at the delay of 4.4, projectiles and drops flown by the client itself).
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { EntityStore, type EntityHost } from '../../src/client/entities';
import { ENTITY_FX, FxPlay, type FxHost } from '../../src/client/fxplay';
import { Session } from '../../src/client/session';
import { B } from '../../src/data/blocks';
import { MOB_LIST, PROJECTILES } from '../../src/data/mobs';
import { snapOrigin } from '../../src/net/codec';
import { SnapService } from '../../src/net/hostsnap';
import { BOSS_KINDS, EXTRAPOLATE, GHOST_SECONDS, INTERP_LOCAL, INTERP_MAX, INTERP_MIN, MF_GROUND, MF_TP, PF_AWAY, PF_DIG, PF_HURT, PF_SWING_MASK,
  PF_SWING_SHIFT, PF_TP, type S2C, SELF_LOADING, SNAP_EVERY, SWEEP_EVERY } from '../../src/net/protocol';
import { decodeSnapshot, encodeSnapshot, type SnapMob } from '../../src/net/snapshot';
import type { Conn, Transport } from '../../src/net/transport';
import type { ItemModels } from '../../src/render/itemModel';
import type { Fx, Sink } from '../../src/sim/fx';
import type { SimPlayer } from '../../src/sim/player';
import { PROJ_KEYS } from '../../src/sim/projectiles';
import type { RealmStore } from '../../src/sim/realm';
import { Sim } from '../../src/sim/sim';
import type { ChunkSource } from '../../src/sim/chunksource';
import { MemStorage, type WorldRecord } from '../../src/sim/storage';
import { type BlockEnt, EditMaps } from '../../src/sim/voxels';

const GROUND = 64, STEP = 1 / 60, MS = 1000 / 60;
/** The rules under test run on the flat store below: the sim's own chunks are given nothing to generate. */
const NO_SOURCE: ChunkSource = { request() {}, cancel() {}, poll: () => [], pending: 0, dispose() {} };
class Flat implements RealmStore {
  onChange: RealmStore['onChange'] = null;
  cells = new Map<string, number>();
  getBlock(x: number, y: number, z: number): number { return this.cells.get(`${x},${y},${z}`) ?? (y >= 0 && y < GROUND ? B.stone : 0); }
  ready(): boolean { return true; }
  topY(): number { return GROUND - 1; }
  biomeAt(): number { return 0; }
  setBlock(x: number, y: number, z: number, id: number): boolean { this.cells.set(`${x},${y},${z}`, id); return true; }
  getEnt(): BlockEnt | null { return null; }
  setEnt(): BlockEnt | null { return null; }
  removeEnt(): void {}
  sky(): number { return 15; }
  block(): number { return 0; }
  chunkEnts(): null { return null; }
  areaReady(): boolean { return true; }
  touch(): void {}
}
const worldRecord = (): WorldRecord => ({
  format: 2, id: 'w', name: 'Test', seed: 7, seedText: '7', created: 0, played: 0, owner: null, palettes: [], names: {},
  state: { clock: 0.2, tick: 1200, rnd: 12345, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [0, 0], gates: [], summons: [], owed: {} },
});

/** The client end of one connection: a transport the host's Conn writes into, a session, and an entity store on stubs. */
interface Client { tr: Transport; s: Session; ents: EntityStore; now: number; fx: Fx[]; bins: ArrayBuffer[]; msgs: S2C[]; spawns: number[][] }
function client(kind: Transport['kind'], store: Flat | null, me?: { x: number; y: number; z: number }): Client {
  const tr: Transport = { kind, state: 'open', send() {}, sendBin() {}, onOpen: null, onMessage: null, onBinary: null, onClose: null, close() {} };
  const s = new Session(tr);
  const world = { getBlock: (x: number, y: number, z: number) => (store ? store.getBlock(x, y, z) : 0), ready: () => true, getLight: () => 0xf0, topY: () => GROUND - 1, biomeAt: () => 0 };
  const spawns: number[][] = [];
  const host = { world, particles: { spawn: (...a: number[]) => { spawns.push(a); } }, audio: { play() {} }, player: me ?? { x: 0, y: 0, z: 0, shake() {} }, gfx: { dayAmt: 1 }, paused: false, time: 0, dim: 0 } as unknown as EntityHost;
  const models = { isCube: () => true, get: () => new THREE.BufferGeometry() } as unknown as ItemModels;
  const ents = new EntityStore(host, models);
  const c: Client = { tr, s, ents, now: 0, fx: [], bins: [], msgs: [], spawns };
  ents.clock = () => c.now;
  ents.connect(s);
  s.on('fx', (m) => { c.fx.push(...m.l); });
  return c;
}
/** Hand a client what its connection was sent, as the transport would. */
const deliver = (c: Client, m: S2C | ArrayBuffer): void => { if (m instanceof ArrayBuffer) { c.bins.push(m); c.tr.onBinary!(m); } else { c.msgs.push(m); c.tr.onMessage!(m); } };
const welcome = (slot: number, tick: number, dim = 0): S2C => ({ t: 'welcome', proto: 1, boot: 1, you: { slot, id: 'x' }, world: { name: 'T', seed: 7, seedText: '7' }, dim, pos: [0, 0, 0, 0, 0],
  tp: 0, tick, clock: 0.2, flags: [], quest: 0, event: { a: null, k: 0, g: 0 }, spawn: [0, 0], cfg: { cheats: true, simRadius: 5, viewMax: 12, maxPlayers: 8 }, players: [] });

interface Host { sim: Sim; store: Flat; snap: SnapService; links: { p: SimPlayer; c: Conn; cl: Client }[]; add(id: string, x: number, z: number): { p: SimPlayer; c: Conn; cl: Client };
  /** Run the five flush calls' three of this service for every connection at the current tick, then pump each client. */
  flush(): void; until(every: number, link: { c: Conn }): void }
function host(): Host {
  const store = new Flat();
  let snap: SnapService;
  const sink: Sink = { emit: (to, e) => snap.emit(to, e), send: (s, m) => snap.send(s, m), broadcast: (m) => snap.broadcast(m) };
  const sim = new Sim(worldRecord(), { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, chunks: NO_SOURCE, edits: new EditMaps(new MemStorage(), []), store: () => store, log: () => {}, requestSave: () => {} });
  snap = new SnapService(sim);
  const h: Host = {
    sim, store, snap, links: [],
    add(id, x, z) {
      const p = sim.join(id, id.toUpperCase(), null, false);
      p.loading = false; p.arriving = -1; p.body.teleport(x, GROUND, z); p.body.onGround = true;
      const cl = client('ws', store, p.body);
      const c: Conn = { id: h.links.length + 1, local: false, addr: id, buffered: 0, send: (m) => deliver(cl, m), sendBin: (b) => deliver(cl, b), close() {}, onMessage: null, onBinary: null, onClose: null };
      snap.attach(c, p);
      deliver(cl, welcome(p.slot, sim.tick));
      cl.s.pump();
      const l = { p, c, cl };
      h.links.push(l);
      return l;
    },
    flush() {
      for (const l of h.links) { snap.flushState(l.c); snap.flushFx(l.c); snap.flushSnap(l.c, sim.tick); }
      for (const l of h.links) { l.cl.now = sim.tick * MS; l.cl.s.pump(); }
    },
    until(every, l) { while ((sim.tick + l.c.id) % every !== 0) sim.tick++; },
  };
  return h;
}
const mobsOf = (c: Client) => c.ents.mobs.filter((m) => m.active);
const near = (a: number, b: number, e = 1 / 64 + 1e-9): boolean => Math.abs(a - b) <= e;

test('a host snapshot of a sim with creatures, shots and drops decodes on the client into the same entities', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), Bl = h.add('b', 6.25, -3.5), realm = h.sim.realms[0];
  const sheep = realm.mobs.spawn('woolback', 3.3, GROUND, 2.7)!;
  const imp = realm.mobs.spawn('thornling', -10.1, GROUND + 0.4, 7.9)!;
  imp.hurt = 0.1; imp.onGround = true;
  const boss = realm.mobs.spawn('b_maw', 20.2, GROUND, -5.6)!, bs = boss.boss!;
  bs.phase = 1; bs.kind = 'slam'; bs.atk = null; bs.wind = 0.5; bs.rage = 0.25; bs.fxm = 4; boss.hp = 700.2; boss.maxHp = 924;
  const arrow = realm.proj.fire('arrow', 2.5, 66, 2.5, 1, 0.2, 0, 5, null)!;
  const bolt = realm.proj.fire('ember', 0.5, 65.6, 0.5, 0, 0, 1, 5, A.p, 7)!;
  realm.drops.spawn(1.5, GROUND + 0.5, -1.5, { k: 'stick', n: 3 }, 0.5, 1, 0, 0.3);
  realm.drops.spawn(2.5, GROUND + 0.5, 2.5, { k: 'torch', n: 1 }, 0, 0, 0, 0, 'b');
  h.until(SNAP_EVERY, A);
  h.flush();
  const c = A.cl;
  // projectiles and drops are there from their events
  const pv = c.ents.projs.filter((p) => p.active).sort((a, b) => a.id - b.id);
  assert.deepEqual(pv.map((p) => p.id), [arrow.id, bolt.id]);
  for (const [v, p] of [[pv[0], arrow], [pv[1], bolt]] as const) {
    assert.equal(v.def, p.def);
    assert.deepEqual([v.x, v.y, v.z, v.vx, v.vy, v.vz, v.life], [p.x, p.y, p.z, p.vx, p.vy, p.vz, p.life]);
  }
  const dv = c.ents.drops.filter((d) => d.active);
  assert.equal(dv.length, 1, 'the drop owned by someone else is not told');
  const sd = realm.drops.list.find((d) => d.active && !d.owner)!;
  assert.deepEqual([dv[0].id, dv[0].k, dv[0].n, dv[0].x, dv[0].y, dv[0].z, dv[0].vx, dv[0].vy, dv[0].delay], [sd.id, 'stick', 3, sd.x, sd.y, sd.z, sd.vx, sd.vy, sd.delay]);
  assert.equal(Bl.cl.ents.drops.filter((d) => d.active).length, 2, 'its owner has both');
  // creatures and the other player from the snapshot, once a tick has placed them
  c.ents.netTick(STEP);
  const mv = mobsOf(c).sort((a, b) => a.id - b.id), sm = [sheep, imp, boss].sort((a, b) => a.id - b.id);
  assert.deepEqual(mv.map((m) => m.id), sm.map((m) => m.id));
  for (let i = 0; i < sm.length; i++) {
    const v = mv[i], m = sm[i];
    assert.equal(v.def, m.def);
    assert.ok(near(v.x, m.x) && near(v.y, m.y) && near(v.z, m.z), `${m.def.key} at ${v.x} ${v.y} ${v.z}, host ${m.x} ${m.y} ${m.z}`);
    assert.ok(Math.abs(Math.cos(v.yaw - m.yaw) - 1) < 1e-3);
    assert.equal(v.hw, m.def.hw); assert.equal(v.h, m.def.h);
  }
  const vi = mv.find((m) => m.id === imp.id)!;
  assert.equal(vi.onGround, true); assert.ok(vi.hurt > 0, 'the hurt flag starts the flash');
  const vb = mv.find((m) => m.id === boss.id)!;
  assert.ok(vb.boss);
  assert.equal(vb.boss!.phase, 1); assert.equal(vb.boss!.kind, 'slam'); assert.ok(near(vb.boss!.wind, 0.5, 1 / 255)); assert.ok(near(vb.boss!.rage, 0.25, 1 / 255));
  assert.equal(vb.boss!.fxm, 4); assert.equal(vb.hp, 701); assert.equal(vb.maxHp, 924);
  assert.equal(vb.boss!.segs!.length, 36, 'a serpent grows its own segments behind the head');
  assert.equal(c.ents.boss(), vb);
  const ov = c.ents.players.filter((p) => p.active);
  assert.equal(ov.length, 1);
  assert.equal(ov[0].slot, Bl.p.slot); assert.deepEqual([ov[0].x, ov[0].y, ov[0].z], [6.25, GROUND, -3.5]);
  assert.equal(ov[0].hp, 1);
  // the receiver's own state
  const hd = c.ents.head!;
  assert.equal(hd.tick, h.sim.tick); assert.equal(hd.hp, A.p.stats.hp); assert.equal(hd.ox, snapOrigin(0.5)); assert.equal(hd.tp, A.p.tp);
});

test('the snapshot\'s player records: flags others see, who is left out, and the header', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), Bl = h.add('b', 4.5, 0.5), C = h.add('c', 8.5, 0.5), D = h.add('d', 12.5, 0.5), sim = h.sim;
  const b = Bl.p;
  C.p.loading = true;
  D.p.online = false;
  A.p.moveSeq = 4321; A.p.loading = true;
  h.until(SNAP_EVERY, A);
  b.stalled = true; b.swingSeq = 6; b.hurtTick = sim.tick - 5; b.dig = { x: 5, y: 64, z: 0, id: B.stone, bt: 2, t0: sim.tick - 60 };
  h.flush();
  const s = decodeSnapshot(A.cl.bins.at(-1)!)!;
  assert.equal(s.ackMove, 4321); assert.equal(s.flags & SELF_LOADING, SELF_LOADING);
  assert.deepEqual(s.players.map((q) => q.slot), [b.slot], 'a loading player and a lingering one are not shown');
  const f = s.players[0].flags;
  assert.equal(f & PF_AWAY, PF_AWAY, 'a stalled player is shown away');
  assert.equal((f & PF_SWING_MASK) >> PF_SWING_SHIFT, 6 & 3);
  assert.equal(f & PF_HURT, PF_HURT); assert.equal(f & PF_DIG, PF_DIG);
  assert.ok(near(s.players[0].dig, 0.5, 1 / 255));
  // the hurt flag lasts 0.22 s
  b.hurtTick = sim.tick - 14;
  sim.tick += SNAP_EVERY; h.flush();
  assert.equal(decodeSnapshot(A.cl.bins.at(-1)!)!.players[0].flags & PF_HURT, 0);
});

test('a snapshot waits for the connection\'s tick, and is skipped while its output is backed up', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), c = A.c as { buffered: number };
  h.until(SNAP_EVERY, A);
  h.sim.tick++; h.flush(); h.sim.tick++; h.flush();
  assert.equal(A.cl.bins.length, 0);
  h.sim.tick++; h.flush();
  assert.equal(A.cl.bins.length, 1);
  c.buffered = 300 * 1024;
  h.sim.tick += SNAP_EVERY; h.flush();
  assert.equal(A.cl.bins.length, 1);
});

test('state messages and fx go out in the order the sink took them, each queue flushed whole', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), Bl = h.add('b', 300, 0.5), sim = h.sim;
  A.cl.msgs.length = Bl.cl.msgs.length = 0;
  sim.sink.send(A.p.slot, { t: 'cmdr', id: 1, text: 'one' });
  sim.sink.broadcast({ t: 'quest', index: 3 });
  sim.sink.send(A.p.slot, { t: 'cmdr', id: 2, text: 'two' });
  sim.sink.emit({ dim: 0, x: 0.5, y: GROUND, z: 0.5, r: 40 }, ['s', 'hit', 1, 1, 0.5, GROUND, 0.5]);
  sim.sink.emit({ p: Bl.p.slot }, ['t', 'hello', '']);
  sim.sink.emit({ dim: 0, not: A.p.slot }, ['k', 0.5]);
  h.flush();
  assert.deepEqual(A.cl.msgs.filter((m) => m.t !== 'fx').map((m) => m.t === 'cmdr' ? m.text : m.t), ['one', 'quest', 'two']);
  assert.deepEqual(A.cl.fx.map((e) => e[0]), ['s']);
  assert.deepEqual(Bl.cl.msgs.filter((m) => m.t !== 'fx').map((m) => m.t), ['quest']);
  assert.deepEqual(Bl.cl.fx.map((e) => e[0]), ['t', 'k'], 'the sound is beyond its 40 blocks');
  // nothing to send sends nothing
  const n = A.cl.msgs.length;
  h.flush();
  assert.equal(A.cl.msgs.length, n);
});

test('creature interest follows the viewer: in at 80, out beyond 88, bosses to 160, own minions anywhere; the client lets a creature go after two snapshots without it', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), realm = h.sim.realms[0], sim = h.sim, b = A.p.body;
  const far = realm.mobs.spawn('woolback', 85.5, GROUND, 0.5)!;
  const boss = realm.mobs.spawn('b_colossus', 150.5, GROUND, 0.5)!;
  const mine = realm.mobs.spawn('m_thornling', -500.5, GROUND, 0.5)!; mine.owner = 'a';
  const theirs = realm.mobs.spawn('m_thornling', -40.5, GROUND, 0.5)!; theirs.owner = 'zz';
  const ids = (): number[] => decodeSnapshot(A.cl.bins.at(-1)!)!.mobs.map((m) => m.id).sort((x, y) => x - y);
  const snap = (): void => { sim.tick += SNAP_EVERY; h.flush(); A.cl.ents.netTick(STEP); };
  h.until(SNAP_EVERY, A); h.flush();
  assert.deepEqual(ids(), [boss.id, mine.id, theirs.id].sort((x, y) => x - y));
  b.x = 6.5; snap();
  assert.ok(ids().includes(far.id), 'in at 79');
  b.x = 0.5; snap();
  assert.ok(ids().includes(far.id), 'still in at 85: it left only beyond 88');
  b.x = -4; snap();
  assert.ok(!ids().includes(far.id), 'out at 89.5');
  assert.ok(A.cl.ents.mobs.some((m) => m.active && m.id === far.id), 'one snapshot without it: still drawn');
  snap();
  assert.ok(!A.cl.ents.mobs.some((m) => m.active && m.id === far.id), 'two: gone, without a corpse');
  b.x = 400; snap();
  assert.ok(!ids().includes(boss.id), 'a boss beyond 160');
  assert.ok(ids().includes(mine.id), 'its own minion, 900 away');
});

test('drop interest: told within 48, told it is gone beyond 64, its owner\'s alone, and its changes only where it was told', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), Bl = h.add('b', 200.5, 0.5), realm = h.sim.realms[0], sim = h.sim;
  realm.drops.spawn(40.5, GROUND + 0.2, 0.5, { k: 'stick', n: 2 }, 0, 0, 0, 0);
  const d = realm.drops.list.find((q) => q.active)!;
  h.flush();
  assert.deepEqual(A.cl.fx.filter((e) => e[0] === 'da').map((e) => e[1]), [d.id]);
  assert.equal(Bl.cl.fx.filter((e) => e[0] === 'da').length, 0, '160 away');
  // B walks up: the sweep tells it; A walks off: the sweep tells it the drop is gone
  Bl.p.body.x = 60.5; A.p.body.x = -30;
  for (let i = 0; i < SWEEP_EVERY; i++) { sim.tick++; h.flush(); }
  assert.deepEqual(Bl.cl.fx.filter((e) => e[0] === 'da').map((e) => e[1]), [d.id]);
  assert.deepEqual(A.cl.fx.filter((e) => e[0] === 'dd'), [['dd', d.id, 0]]);
  assert.equal(A.cl.ents.drops.filter((v) => v.active).length, 0, 'the client lets it go');
  // a count change and the end go to who knows it
  A.cl.fx.length = Bl.cl.fx.length = 0;
  realm.drops.spawn(40.6, GROUND + 0.2, 0.6, { k: 'stick', n: 1 }, 0, 0, 0, 0);
  realm.drops.clear();
  h.flush();
  assert.deepEqual(Bl.cl.fx.map((e) => e[0]), ['dn', 'dd']);
  assert.deepEqual(A.cl.fx, []);
  assert.equal(Bl.cl.ents.drops.find((v) => v.id === d.id)!.active, false);
  // owned: never to anyone else, however close
  A.cl.fx.length = Bl.cl.fx.length = 0;
  A.p.body.x = 0.5; Bl.p.body.x = 1.5;
  realm.drops.spawn(1, GROUND + 0.2, 0.5, { k: 'torch', n: 1 }, 0, 0, 0, 0, 'b');
  for (let i = 0; i < SWEEP_EVERY; i++) { sim.tick++; h.flush(); }
  assert.equal(A.cl.fx.filter((e) => e[0] === 'da').length, 0);
  assert.equal(Bl.cl.fx.filter((e) => e[0] === 'da').length, 1, 'told once');
});

test('projectile interest: the known set, the sweep that finds a player walking into a fight, and pe only where ps went', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), Bl = h.add('b', 150.5, 0.5), realm = h.sim.realms[0], sim = h.sim;
  // a slow bolt that flies a long time, fired next to B
  const p = realm.proj.fire('wardenorb', 150.5, 70, 0.5, 0, 0, 1, 5, null)!;
  h.flush();
  assert.equal(Bl.cl.fx.filter((e) => e[0] === 'ps').length, 1);
  assert.equal(A.cl.fx.filter((e) => e[0] === 'ps').length, 0, '150 away');
  // A walks within PROJ_R: the next sweep hands it the shot as it is then
  A.p.body.x = 60.5;
  realm.proj.tick(STEP);
  for (let i = 0; i < SWEEP_EVERY; i++) { sim.tick++; h.flush(); }
  const ps = A.cl.fx.filter((e) => e[0] === 'ps');
  assert.equal(ps.length, 1, 'once');
  assert.deepEqual(ps[0].slice(1, 10), [p.id, PROJ_KEYS.indexOf('wardenorb'), p.x, p.y, p.z, p.vx, p.vy, p.vz, p.life]);
  assert.ok(A.cl.ents.projs.some((v) => v.active && v.id === p.id));
  // its end reaches both; the end of one A never heard of reaches B alone
  A.p.body.x = -200;
  const q = realm.proj.fire('wardenorb', 150.5, 70, 10.5, 0, 0, 1, 5, null)!;
  h.flush();
  realm.proj.clear();
  h.flush();
  assert.deepEqual(A.cl.fx.filter((e) => e[0] === 'pe').map((e) => e[1]), [p.id]);
  assert.deepEqual(Bl.cl.fx.filter((e) => e[0] === 'pe').map((e) => e[1]).sort(), [p.id, q.id].sort());
  // a player's shot: the shooter hears it from anywhere and with its seq, the others by distance and without
  A.cl.fx.length = Bl.cl.fx.length = 0;
  realm.proj.fire('arrow', 150.5, 66, 0.5, 1, 0, 0, 5, A.p, 12);
  h.flush();
  assert.equal(A.cl.fx.filter((e) => e[0] === 'ps')[0][11], 12);
  assert.equal(Bl.cl.fx.filter((e) => e[0] === 'ps')[0][11], 0);
});

test('a player in another realm is told again from nothing: what it knew of the old one is forgotten', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), Bl = h.add('b', 2.5, 0.5), sim = h.sim, r0 = sim.realms[0], r1 = sim.realms[1];
  r0.drops.spawn(1.5, GROUND + 0.2, 0.5, { k: 'stick', n: 1 }, 0, 0, 0, 0);
  const shot = r0.proj.fire('wardenorb', 1.5, 70, 0.5, 0, 0, 1, 5, null)!;
  h.flush();
  assert.equal(A.cl.fx.filter((e) => e[0] === 'da' || e[0] === 'ps').length, 2);
  // A crosses; in realm 1 a drop lies near the same coordinates
  r0.players.splice(r0.players.indexOf(A.p), 1); A.p.dim = 1; r1.players.push(A.p);
  r1.drops.spawn(1.5, GROUND + 0.2, 0.5, { k: 'torch', n: 1 }, 0, 0, 0, 0);
  A.cl.fx.length = 0;
  // the old realm's end of the shot is not A's to hear, and the sweep tells A of the new realm's drop
  r0.proj.clear();
  for (let i = 0; i < SWEEP_EVERY; i++) { sim.tick++; h.flush(); }
  assert.deepEqual(A.cl.fx.map((e) => e[0]), ['da']);
  assert.equal(A.cl.fx[0][2], 'torch');
  assert.ok(Bl.cl.fx.some((e) => e[0] === 'pe' && e[1] === shot.id));
});

test('a shooter\'s ghost gives way to the ps that answers its fire, and is dropped after GHOST_SECONDS without one', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), realm = h.sim.realms[0], ents = A.cl.ents;
  ents.ghost(9, 'arrow', 0.5, 66, 0.5, 0, 0, 1);
  const g = ents.projs.find((v) => v.active)!;
  assert.equal(g.ghost, 9); assert.equal(g.vz, PROJECTILES.arrow.speed);
  ents.netTick(STEP);
  const p = realm.proj.fire('arrow', 0.5, 66, 0.5, 0, 0, 1, 5, A.p, 9, undefined, 'ranged', 3, false, 0.1)!;
  h.flush();
  const live = ents.projs.filter((v) => v.active);
  assert.equal(live.length, 1, 'one shot, not two');
  assert.equal(live[0], g); assert.equal(live[0].ghost, 0); assert.equal(live[0].id, p.id);
  assert.equal(live[0].z, p.z, 'where the host says it is, its lead flown');
  ents.ghost(10, 'arrow', 0.5, 66, 0.5, 1, 0, 0);
  const n = Math.ceil(GHOST_SECONDS / STEP);
  for (let i = 0; i < n - 1; i++) ents.netTick(STEP);
  assert.equal(ents.projs.filter((v) => v.active && v.ghost === 10).length, 1);
  ents.netTick(STEP); ents.netTick(STEP);
  assert.equal(ents.projs.filter((v) => v.active && v.ghost === 10).length, 0);
});

test('projectiles and drops fly on the client by the host\'s rules: the same path, the same rest, the same end', () => {
  const h = host(), A = h.add('a', 0.5, 0.5), realm = h.sim.realms[0], ents = A.cl.ents, sim = h.sim;
  // the player stands well clear, so the host's drop has nobody to fly to
  A.p.body.x = 30.5; A.cl.ents.netTick(0);
  const p = realm.proj.fire('arrow', 0.5, 70, 0.5, 1, 0.3, 0.2, 5, null)!;
  realm.drops.spawn(2.5, GROUND + 2, 2.5, { k: 'stick', n: 1 }, 1.2, 3, -0.8, 0);
  const d = realm.drops.list.find((q) => q.active)!;
  h.flush();
  const pv = ents.projs.find((v) => v.active && v.id === p.id)!, dv = ents.drops.find((v) => v.active && v.id === d.id)!;
  for (let i = 0; i < 240; i++) {
    realm.proj.tick(STEP); realm.drops.tick(STEP); sim.tick++;
    ents.netTick(STEP);
    if (p.active) assert.ok(Math.hypot(pv.x - p.x, pv.y - p.y, pv.z - p.z) < 1e-9, `tick ${i}: shot at ${pv.x} ${pv.y} ${pv.z}, host ${p.x} ${p.y} ${p.z}`);
    assert.ok(Math.hypot(dv.x - d.x, dv.y - d.y, dv.z - d.z) < 1e-9, `tick ${i}: drop at ${dv.x} ${dv.y} ${dv.z}, host ${d.x} ${d.y} ${d.z}`);
  }
  assert.equal(p.active, false, 'the arrow came down');
  assert.equal(pv.active, false, 'and ended here by itself');
  assert.equal(d.y, GROUND, 'the drop rests on the ground'); assert.equal(dv.onGround, true);
  // the host's word of that end changes nothing now
  h.flush();
  assert.ok(A.cl.fx.some((e) => e[0] === 'pe' && e[1] === p.id));
  assert.equal(ents.projs.filter((v) => v.active).length, 0);
  // a pick-up: the drop flies to the picker, then is gone
  sim.sink.emit({ dim: 0 }, ['dd', d.id, A.p.slot]);
  h.flush();
  assert.ok(dv.active);
  for (let i = 0; i < 12; i++) ents.netTick(STEP);
  assert.equal(dv.active, false);
});

/** A client fed by hand: snapshots of one creature, arriving at the client times given. */
function fed(kind: Transport['kind']) {
  const c = client(kind, null);
  deliver(c, welcome(1, 0)); c.s.pump();
  const at = (tick: number, ms: number, mobs: Partial<SnapMob>[]): void => {
    c.now = ms;
    deliver(c, encodeSnapshot({ flags: 0, tick, ackMove: 0, tp: 0, hunger: 20, ox: 0, oz: 0, hp: 100, mana: 40, players: [],
      mobs: mobs.map((m) => ({ id: 1, def: 0, flags: MF_GROUND, x: 0, y: GROUND, z: 0, yaw: 0, boss: null, ...m })) }));
    c.s.pump();
  };
  const frame = (ms: number): void => { c.now = ms; c.ents.netTick(STEP); };
  return { c, at, frame, mob: () => c.ents.mobs.find((m) => m.active && m.id === 1) ?? null };
}

test('interpolation on a local transport: the moment drawn is the host\'s tick less 4, linear between the snapshots around it', () => {
  const f = fed('loopback');
  f.at(100, 100 * MS, [{ x: 0 }]); f.at(103, 103 * MS, [{ x: 3 }]); f.at(106, 106 * MS, [{ x: 6 }]);
  assert.equal(f.c.ents.delay, INTERP_LOCAL);
  f.frame(106 * MS);
  assert.ok(Math.abs(f.c.ents.renderTick - (106 - INTERP_LOCAL)) < 1e-9);
  assert.ok(Math.abs(f.mob()!.x - 2) < 1e-9, `at ${f.mob()!.x}`);
  f.frame(108.5 * MS);
  assert.ok(Math.abs(f.mob()!.x - 4.5) < 1e-9);
  assert.ok(Math.abs(f.mob()!.moving - 60) < 1e-6, 'its speed, one block a tick');
  // past the newest snapshot: on its velocity for EXTRAPOLATE ticks, then held
  f.frame(111 * MS);
  assert.ok(Math.abs(f.mob()!.x - 7) < 1e-9);
  f.frame(130 * MS);
  assert.ok(Math.abs(f.mob()!.x - (6 + EXTRAPOLATE)) < 1e-9);
  assert.equal(f.mob()!.moving, 0);
});

test('yaw takes the short way round, and a teleport bit that flips snaps instead of sliding', () => {
  const f = fed('loopback'), T = Math.PI * 2;
  f.at(100, 100 * MS, [{ x: 0, yaw: (250 / 256) * T }]); f.at(103, 103 * MS, [{ x: 3, yaw: (4 / 256) * T }]);
  f.frame(105.5 * MS);
  const yaw = f.mob()!.yaw, want = (250 / 256) * T + (10 / 256) * T * 0.5;
  assert.ok(Math.abs(Math.cos(yaw - want) - 1) < 1e-9, `yaw ${yaw}`);
  f.at(106, 106 * MS, [{ x: 50, flags: MF_GROUND | MF_TP }]);
  f.frame(108.5 * MS);
  assert.ok(Math.abs(f.mob()!.x - 3) < 1e-9, 'held where it was until the jump');
  f.frame(110 * MS);
  const m = f.mob()!;
  assert.equal(m.x, 50); assert.equal(m.px, 50, 'nothing to blend from');
});

test('on a socket the delay is twice the snapshot spacing plus the jitter, within its bounds, and the host\'s tick estimate never runs back', () => {
  const steady = fed('ws');
  for (let i = 0; i < 40; i++) steady.at(i * 3, i * 3 * MS + 70, [{ x: i }]);
  assert.ok(Math.abs(steady.c.ents.delay - Math.max(INTERP_MIN, 2 * SNAP_EVERY)) < 1e-6);
  const shaky = fed('ws');
  for (let i = 0; i < 40; i++) shaky.at(i * 3, i * 3 * MS + 70 + (i % 2 ? 60 : 0), [{ x: i }]);
  assert.ok(shaky.c.ents.delay > INTERP_MIN && shaky.c.ents.delay <= INTERP_MAX, `delay ${shaky.c.ents.delay}`);
  const stalled = fed('ws');
  let last = 0;
  for (let i = 0; i < 40; i++) {
    // every fifth snapshot is held 400 ms and arrives with the next
    const late = i % 5 === 4 ? 400 : 0;
    stalled.at(i * 3, i * 3 * MS + 70 + late, [{ x: i }]);
    stalled.frame(i * 3 * MS + 70 + late);
    const t = stalled.c.ents.serverTick();
    assert.ok(t >= last, `estimate ${t} after ${last}`);
    last = t;
  }
  assert.equal(stalled.c.ents.delay, INTERP_MAX);
});

test('a creature\'s death waits for the moment drawn to reach it, and is drawn where it died', () => {
  const f = fed('loopback');
  f.at(100, 100 * MS, [{ x: 0 }]); f.at(103, 103 * MS, [{ x: 3 }]);
  deliver(f.c, { t: 'fx', l: [['md', 1, 1]] }); f.c.s.pump();
  f.at(106, 106 * MS, []); f.at(109, 109 * MS, []);
  f.frame(106 * MS);
  assert.ok(f.mob(), 'still alive at the moment drawn, though two snapshots have come without it');
  f.frame(107.5 * MS);
  assert.equal(f.mob(), null);
});

test('Bodies: a creature or another player as the client sees it blocks a cell; a minion does not', () => {
  const f = fed('loopback'), minion = MOB_LIST.findIndex((d) => d.ai === 'minion');
  f.at(100, 100 * MS, [{ id: 1, x: 5.5, z: 5.5 }, { id: 2, def: minion, x: 9.5, z: 9.5 }]);
  f.frame(110 * MS);
  const e = f.c.ents;
  assert.equal(e.blocked(5, GROUND, 5), true); assert.equal(e.blocked(5, GROUND + 3, 5), false); assert.equal(e.blocked(7, GROUND, 5), false);
  assert.equal(e.blocked(9, GROUND, 9), false);
  const h = host(), A = h.add('a', 0.5, 0.5);
  h.add('b', 3.5, 0.5);
  h.until(SNAP_EVERY, A); h.flush(); A.cl.ents.netTick(STEP);
  assert.equal(A.cl.ents.blocked(3, GROUND + 1, 0), true); assert.equal(A.cl.ents.blocked(0, GROUND, 0), false, 'its own body is not in its store');
});

test('another realm, or a new welcome, starts the store again', () => {
  const f = fed('loopback');
  f.at(100, 100 * MS, [{ x: 0 }]); f.frame(104 * MS);
  assert.ok(f.mob());
  deliver(f.c, { t: 'tp', id: 1, dim: 0, x: 0, y: 70, z: 0, load: false }); f.c.s.pump();
  assert.ok(f.mob(), 'a teleport in the same realm keeps it');
  deliver(f.c, { t: 'tp', id: 2, dim: 1, x: 0, y: 70, z: 0, load: true }); f.c.s.pump();
  assert.equal(f.mob(), null);
  f.at(200, 200 * MS, [{ x: 0 }]); f.frame(204 * MS);
  assert.ok(f.mob());
  deliver(f.c, welcome(1, 500)); f.c.s.pump();
  assert.equal(f.mob(), null);
  assert.ok(f.c.ents.serverTick() >= 500);
  void BOSS_KINDS;
});

test('fx playback on a connection: every code but the entity store\'s is played once, in the order sent, and the entity codes are not', () => {
  const c = client('loopback', null);
  deliver(c, welcome(1, 0)); c.s.pump();
  const did: string[] = [];
  const g = {
    audio: { play: (name: string) => { did.push(`s:${name}`); } },
    particles: { spawn: () => { did.push('p'); } },
    hud: { floater: (_x: number, _y: number, _z: number, text: string) => { did.push(`f:${text}`); }, toast: (text: string) => { did.push(`t:${text}`); },
      showBanner: (title: string) => { did.push(`n:${title}`); }, hitMark: (crit: boolean) => { did.push(`h:${crit}`); },
      pickup: (key: string, n: number) => { did.push(`u:${key}:${n}`); } },
    player: { shake: (k: number) => { did.push(`k:${k}`); } },
    world: { getLight: () => 0xf0 },
  } as unknown as FxHost;
  const fx = new FxPlay(g);
  fx.connect(c.s);
  const entity: Fx[] = [['ps', 9, 0, 0, 70, 0, 1, 0, 0, 2, 0, 0], ['pe', 9, 0, 70, 0, 1], ['da', 4, 'stone', 1, '', 0, 70, 0, 0, 0, 0, 0], ['dn', 4, 2], ['dd', 4, 0],
    ['md', 3, 1], ['mk', 3, 10, 20, 1]];
  assert.deepEqual(entity.map((e) => e[0]).sort(), [...ENTITY_FX].sort(), 'one event of each entity code');
  const played: Fx[] = [['s', 'hit', 1, 1], ['p', 3, 0, 70, 0, 2, 0xffffff], ['f', 0, 70, 0, '12', '#fff', false], ['t', 'hello', ''], ['n', 'Title', 'sub', '#fff'],
    ['k', 0.5], ['h', true], ['u', 'stone', 3, 7]];
  deliver(c, { t: 'fx', l: [entity[0], played[0], entity[1], played[1], entity[2], entity[3], played[2], played[3], entity[4], played[4], entity[5], played[5], entity[6], played[6], played[7]] });
  c.s.pump();
  assert.deepEqual(did, ['s:hit', 'p', 'p', 'f:12', 't:hello', 'n:Title', 'k:0.5', 'h:true', 'u:stone:3', 's:pop']);
});

test('a boss\'s rain marks flicker on the client from the tick after they arrive until their strike falls, and its removal clears them', () => {
  const f = fed('loopback'), R = Math.random;
  Math.random = () => 0;
  try {
    const at = (x: number, z: number): number => f.c.spawns.filter((a) => Math.abs(a[0] - (x - 0.6)) < 1e-9 && Math.abs(a[2] - (z - 0.6)) < 1e-9).length;
    deliver(f.c, { t: 'fx', l: [['mk', 7, 10, 20, 0.1, 30, 40, 1], ['mk', 8, -50, -60, 1]] }); f.c.s.pump();
    f.c.spawns.length = 0;
    f.frame(0);
    assert.equal(f.c.spawns.length, 0, 'nothing on the tick they arrive');
    for (let i = 0; i < 4; i++) f.frame(0);
    assert.equal(at(10, 20), 4); assert.equal(at(30, 40), 4); assert.equal(at(-50, -60), 4);
    for (let i = 0; i < 10; i++) f.frame(0);
    assert.ok(at(10, 20) < 9, 'the mark with a tenth of a second left is gone');
    assert.equal(at(30, 40), 14); assert.equal(at(-50, -60), 14);
    deliver(f.c, { t: 'fx', l: [['md', 7, 1]] }); f.c.s.pump();
    f.c.spawns.length = 0;
    f.frame(0);
    assert.equal(at(30, 40), 0, 'its boss removed, its marks go with it');
    assert.equal(at(-50, -60), 1, 'another boss\'s marks stay');
  } finally { Math.random = R; }
});
