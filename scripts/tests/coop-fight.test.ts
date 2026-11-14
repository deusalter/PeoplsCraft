// The co-op rules of fighting (ARCHITECTURE.md 7.1 to 7.4, the boss rules of 7.9, the sun-burn stagger of 7.8), driven on one
// Sim with several players and no network: each test names the rule and uses the document's own numbers.
import assert from 'node:assert/strict';
import test from 'node:test';
import { B } from '../../src/data/blocks';
import { BOSSES } from '../../src/data/mobs';
import { onAtk } from '../../src/sim/actions';
import { bossSummoned, partLeft, refundSummons } from '../../src/sim/boss';
import type { ChunkSource } from '../../src/sim/chunksource';
import type { Fx, Scope, Sink } from '../../src/sim/fx';
import { mobDist } from '../../src/sim/mobhit';
import type { Mob } from '../../src/sim/mobs';
import type { SimPlayer } from '../../src/sim/player';
import type { Realm, RealmStore } from '../../src/sim/realm';
import { Sim } from '../../src/sim/sim';
import { trySpawn } from '../../src/sim/spawn';
import { MemStorage, type WorldRecord } from '../../src/sim/storage';
import { type BlockEnt, EditMaps } from '../../src/sim/voxels';

const GROUND = 64, STEP = 1 / 60;
const NO_SOURCE: ChunkSource = { request() {}, cancel() {}, poll: () => [], pending: 0, dispose() {} };
/** Flat stone up to y = 63 under a full sky, nothing giving light. */
class Flat implements RealmStore {
  onChange: RealmStore['onChange'] = null;
  cells = new Map<string, number>();
  getBlock(x: number, y: number, z: number): number { return this.cells.get(`${x},${y},${z}`) ?? (y >= 0 && y < GROUND ? B.stone : 0); }
  ready(): boolean { return true; }
  topY(): number { return GROUND - 1; }
  biomeAt(): number { return 0; }
  setBlock(x: number, y: number, z: number, id: number): boolean { this.cells.set(`${x},${y},${z}`, id); return true; }
  getEnt(): BlockEnt | null { return null; }
  setEnt(x: number, y: number, z: number, kind: string, data: unknown): BlockEnt { return { x, y, z, kind, data }; }
  removeEnt(): void {}
  sky(): number { return 15; }
  block(): number { return 0; }
  chunkEnts(): null { return null; }
  areaReady(): boolean { return true; }
  touch(): void {}
}
interface Rig { sim: Sim; realm: Realm; ev: [Scope, Fx][]; saves: number }
function rig(clock = 0.2): Rig {
  const store = new Flat(), ev: [Scope, Fx][] = [];
  const world: WorldRecord = {
    format: 2, id: 'w', name: 'Test', seed: 7, seedText: '7', created: 0, played: 0, owner: null, palettes: [], names: {},
    state: { clock, tick: 0, rnd: 12345, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [0, 0], gates: [], summons: [], owed: {} },
  };
  const r = { ev, saves: 0 } as Rig;
  const sink: Sink = { emit: (to, e) => { ev.push([to, e]); }, send: () => {}, broadcast: () => {} };
  r.sim = new Sim(world, { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, chunks: NO_SOURCE, edits: new EditMaps(new MemStorage(), []), store: () => store, log: () => {}, requestSave: () => { r.saves++; } });
  r.realm = r.sim.realms[0];
  return r;
}
/** A player in play: joined, loaded, landed, at (x, z) on the ground. */
function play(r: Rig, id: string, x: number, z: number): SimPlayer {
  const p = r.sim.join(id, id.toUpperCase(), null, false);
  p.loading = false; p.arriving = -1; p.clientReady = true;
  put(p, x, z);
  return p;
}
function put(p: SimPlayer, x: number, z: number): void { p.body.teleport(x, GROUND, z); p.body.onGround = true; p.safe = [x, GROUND, z]; }
/** Steps of the realm alone, with the tick counted as the sim counts it. */
function run(r: Rig, n: number, each?: () => void): void {
  for (let i = 0; i < n; i++) { r.sim.tick++; r.realm.mobs.tick(STEP); r.realm.proj.tick(STEP); r.realm.drops.tick(STEP); each?.(); }
}
const pin = (m: Mob, x: number, z: number): (() => void) => () => { m.x = x; m.z = z; m.y = GROUND; m.vx = m.vz = 0; };

// ---- 7.1 targeting ----

test('7.1: the nearest candidate in 3D, kept until another is closer than 0.75 of its distance', () => {
  const r = rig(), m = r.realm.mobs.spawn('bog_lurker', 0.5, GROUND, 0.5)!;
  const a = play(r, 'a', 10.5, 0.5), b = play(r, 'b', -12.5, 0.5);
  run(r, 16, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a);
  put(b, -8.5, 0.5);                                  // 9 against 10: not closer than 7.5
  run(r, 30, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a, 'kept');
  put(b, -7, 0.5);                                    // 7.5 against 10: still not closer than 0.75 of it
  run(r, 30, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a);
  put(b, -6.5, 0.5);                                  // 7 against 10
  run(r, 16, pin(m, 0.5, 0.5));
  assert.equal(m.tp, b, 'switched');
});

test('7.1: a target stays one out to 1.5 x aggro, and a stalled, lingering, hidden or dead player is none', () => {
  const r = rig(), m = r.realm.mobs.spawn('bog_lurker', 0.5, GROUND, 0.5)!, aggro = m.def.aggro!;
  const a = play(r, 'a', 10.5, 0.5);
  run(r, 16, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a);
  put(a, 0.5 + aggro * 1.4, 0.5);
  run(r, 30, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a, 'inside 1.5 x aggro');
  put(a, 0.5 + aggro * 1.6, 0.5);
  run(r, 16, pin(m, 0.5, 0.5));
  assert.equal(m.tp, null, 'beyond it');
  put(a, 5.5, 0.5);
  for (const [why, on, off] of [
    ['stalled', () => { a.stalled = true; }, () => { a.stalled = false; }],
    ['lingering', () => { a.online = false; }, () => { a.online = true; }],
    ['hidden', () => { a.modes.hidden = true; }, () => { a.modes.hidden = false; }],
    ['dead', () => { a.stats.dead = true; }, () => { a.stats.dead = false; }],
  ] as const) {
    run(r, 16, pin(m, 0.5, 0.5));
    assert.equal(m.tp, a, `a target before being ${why}`);
    on(); run(r, 1, pin(m, 0.5, 0.5));
    assert.equal(m.tp, null, why);
    run(r, 30, pin(m, 0.5, 0.5));
    assert.equal(m.tp, null, `${why}: never chosen`);
    off();
  }
});

test('7.1: a creature hurt by a player targets that player for 4 s, then the keep rule again', () => {
  const r = rig(), m = r.realm.mobs.spawn('bog_lurker', 0.5, GROUND, 0.5)!;
  const a = play(r, 'a', 4.5, 0.5), b = play(r, 'b', -12.5, 0.5);
  run(r, 16, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a);
  r.realm.mobs.hurt(m, 3, 1, 0, 0, false, b);
  assert.equal(m.tp, b, 'at once');
  run(r, 230, pin(m, 0.5, 0.5));
  assert.equal(m.tp, b, 'for 4 s, though a is much nearer');
  run(r, 30, pin(m, 0.5, 0.5));
  assert.equal(m.tp, a, 'then a, nearer than 0.75 of the distance to b');
  // a passive creature flees from the one who hurt it
  const s = r.realm.mobs.spawn('woolback', 0.5, GROUND, 20.5)!;
  put(a, 0.5, 26.5); put(b, 0.5, 16.5);
  r.realm.mobs.hurt(s, 1, 0, 1, 0, false, a);
  run(r, 30);
  assert.equal(s.tp, a);
  assert.ok(s.z < 20.5, `ran from a, toward b: z = ${s.z}`);
});

test('7.1: despawning goes by the nearest player of the realm, whatever its state', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5);
  const m = r.realm.mobs.spawn('bog_lurker', 100.5, GROUND, 0.5)!;
  a.stalled = true; put(a, 0.5, 0.5);
  run(r, 5);
  assert.ok(m.active, 'within 110 of a stalled player');
  put(a, -20.5, 0.5);
  run(r, 1);
  assert.equal(m.active, false, 'beyond 110 of the nearest');
});

test('7.1: touch damage on every target in reach, not only the one it is after', () => {
  const r = rig(), m = r.realm.mobs.spawn('bog_lurker', 0.5, GROUND, 0.5)!;
  const a = play(r, 'a', 0.6, 0.5), b = play(r, 'b', 0.4, 0.6), c = play(r, 'c', 0.5, 0.4);
  c.stalled = true;
  run(r, 1, pin(m, 0.5, 0.5));
  assert.equal(a.hurtTick, r.sim.tick); assert.equal(b.hurtTick, r.sim.tick);
  assert.equal(c.hurtTick, -1e9, 'a stalled player cannot be hurt');
});

test('7.1: a creature\'s shot passes a stalled body and hits the target behind it; a player\'s shot never hits a player', () => {
  const r = rig(), a = play(r, 'a', 5.5, 0.5), b = play(r, 'b', 10.5, 0.5);
  a.stalled = true;
  r.realm.proj.fire('arrow', 0.5, GROUND + 1, 0.5, 1, 0, 0, 5, null, 0, 30);
  run(r, 30);
  assert.equal(a.hurtTick, -1e9); assert.equal(b.hurtTick > 0, true);
  const c = play(r, 'c', 0.5, 20.5), hp = b.stats.hp;
  r.realm.proj.fire('arrow', 0.5, GROUND + 1, 20.5, 1, 0, 0, 5, c, 1, 30);
  put(b, 5.5, 20.5);
  run(r, 30);
  assert.equal(b.stats.hp, hp);
});

test('7.1: minions follow their owner, wait while it is away, vanish when it is parked, dies or leaves the realm', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5);
  const mk = (): Mob => { const m = r.realm.mobs.spawn('m_wisp', 3.5, GROUND + 2, 0.5)!; m.owner = a.id; return m; };
  let w = mk();
  a.stalled = true;
  const x = w.x; run(r, 20);
  assert.equal(w.x, x, 'idle in place while the owner is stalled');
  a.stalled = false; run(r, 20);
  assert.notEqual(w.x, x, 'following again');
  a.stats.dead = true; run(r, 1); assert.equal(w.active, false, 'owner dead'); a.stats.dead = false;
  w = mk(); a.dim = 1; run(r, 1); assert.equal(w.active, false, 'owner in another realm'); a.dim = 0;
  w = mk(); const b = play(r, 'b', 9.5, 0.5); void b;
  r.sim.leave(a, 'bye'); run(r, 1); assert.equal(w.active, false, 'owner parked');
});

// ---- 7.8 ----

test('7.8: the sun-burn test is made every 15 ticks per shade, staggered by id, and its result kept in between', () => {
  const r = rig(0.25); play(r, 'a', 0.5, 0.5);
  const s = r.realm.mobs.spawn('gloomshade', 30.5, GROUND, 0.5)!, hp = s.hp;
  let asked = 0;
  const light = r.realm.light, sky = light.sky.bind(light);
  light.sky = (x, y, z) => { asked++; return sky(x, y, z); };
  r.sim.tick = 100 - ((100 + s.id) % 15) + 14;        // the next tick is the shade's
  r.realm.mobs.frozen = false;
  run(r, 1);
  assert.equal(asked, 1); assert.ok(s.hp < hp, 'burning from its test tick');
  run(r, 14);
  assert.equal(asked, 1, 'not asked again for 14 ticks'); assert.ok(s.burn);
  run(r, 1);
  assert.equal(asked, 2);
});

// ---- 7.2 spawning ----

test('7.2: the hostile cap is counted within 110 blocks and grows by half for each other active player within 48', () => {
  const r = rig(0.6), mobs = r.realm.mobs;
  mobs.passiveCap = 0;
  const a = play(r, 'a', 0.5, 0.5);
  for (let i = 0; i < 14; i++) { const m = mobs.spawn('gloomshade', 60.5 + i, GROUND, 60.5)!; m.def; }
  for (let i = 0; i < 6; i++) mobs.spawn('gloomshade', 400.5 + i, GROUND, 0.5);
  const hostiles = (): number => mobs.count((m) => m.def.hostile);
  for (let i = 0; i < 300; i++) trySpawn(r.realm, a);
  assert.equal(hostiles(), 20, 'alone: 14 within 110 is the cap; the 6 far away do not count');
  const b = play(r, 'b', 30.5, 0.5);
  b.stalled = true;
  for (let i = 0; i < 300; i++) trySpawn(r.realm, a);
  assert.equal(hostiles(), 20, 'a stalled player does not raise it');
  b.stalled = false;
  for (let i = 0; i < 400; i++) trySpawn(r.realm, a);
  const n = mobs.count((m) => m.def.hostile && Math.hypot(m.x - a.body.x, m.y - a.body.y, m.z - a.body.z) < 110);
  assert.ok(n >= 21 && n <= 23, `with one other near the cap is 21 (a group may pass it by 2): ${n}`);
});

test('7.2: no creature appears within 20 blocks of any player, and the realm caps hold', () => {
  const r = rig(0.6), mobs = r.realm.mobs;
  mobs.hostileCap = 1000; mobs.passiveCap = 0;
  const a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 36.5, 0.5);
  for (let i = 0; i < 2000; i++) { trySpawn(r.realm, a); for (const m of mobs.list) if (m.active && m.age === 0) m.age = 1e-9; }
  let near = 0;
  for (const m of mobs.list) if (m.active && Math.hypot(m.x - b.body.x, m.y - b.body.y, m.z - b.body.z) < 20 - 2.2) near++;
  assert.equal(near, 0);
  assert.ok(mobs.count((m) => m.def.hostile) <= 160 + 2, 'realm hostile cap 160');
  assert.ok(mobs.count((m) => m.def.hostile) >= 150, 'and it was reached');
});

// ---- 7.3 ----

test('7.3: the reach of a blow widens with the creature\'s speed times half the round trip plus 0.15', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), m = r.realm.mobs.spawn('woolback', 0.5, GROUND, 0.5)!;
  r.realm.mobs.frozen = true;
  const ey = GROUND + a.body.eye, over = ey - (m.y + m.h), want = 4.7;
  m.x = 0.5 + m.hw + Math.sqrt(want * want - over * over);
  assert.ok(Math.abs(mobDist(m, a.body.x, ey, a.body.z) - want) < 1e-9);
  // 3.3 + 1.0 + 1.6 x (0 + 0.15) = 4.54 < 4.7
  a.actCredit = 5; a.rtt = 0;
  assert.equal(onAtk(r.sim, a, { t: 'atk', id: m.id, d: [1, 0, 0] }), false);
  // 3.3 + 1.0 + 1.6 x (0.2 + 0.15) = 4.86 >= 4.7
  a.rtt = 0.4;
  assert.equal(onAtk(r.sim, a, { t: 'atk', id: m.id, d: [1, 0, 0] }), true);
});

// ---- 7.4 loot ----

/** Boss 1 with an altar at the origin, summoned by `by` with the idol. */
function boss1(r: Rig, by: SimPlayer | null): Mob {
  const m = r.realm.mobs.spawn(BOSSES[0].key, 0.5, GROUND, 6.5)!;
  m.boss!.altar = [0, GROUND - 1, 0];
  if (by) bossSummoned(r.realm, m, by, 'verdant_idol');
  return m;
}
const owned = (r: Rig, id: string, k: string): number => { let n = 0; for (const d of r.realm.drops.list) if (d.active && d.owner === id && d.it.k === k) n += d.it.n; return n; };

test('7.4: each player who hurt a creature gets its experience, a coin roll and a drop roll of its own', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 3.5, 0.5), c = play(r, 'c', 1.5, 2.5);
  const m = r.realm.mobs.spawn('bog_lurker', 0.5, GROUND, 4.5)!;
  r.realm.mobs.hurt(m, 5, 0, 1, 0, false, a);
  r.realm.mobs.hurt(m, 1e6, 0, 1, 0, false, b);
  assert.equal(a.stats.xp, m.def.xp); assert.equal(b.stats.xp, m.def.xp);
  assert.equal(c.stats.xp, 0, 'standing by is not enough for a creature');
  for (const d of r.realm.drops.list) if (d.active) assert.ok(d.owner === 'a' || d.owner === 'b');
  // a creature nobody hurt pays nobody
  const n = r.realm.mobs.spawn('bog_lurker', 0.5, GROUND, 4.5)!, drops = r.realm.drops.alive;
  r.realm.mobs.hurt(n, 1e6, 0, 1, 0, false, null);
  assert.equal(r.realm.drops.alive, drops); assert.equal(a.stats.xp, m.def.xp);
});

test('7.4: boss loot: every participant and every player near gets a separate roll and an owned drop; a share for an evicted id lands in shared.owed and the newcomer in its slot gets nothing', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 10.5, 0.5), c = play(r, 'c', 20.5, 0.5);
  for (const p of [a, b, c]) p.modes.god = true;
  const m = boss1(r, a);
  assert.deepEqual([...m.boss!.parts], ['a', 'b', 'c']);
  // c is parked and its record made durable: it leaves memory; d joins and takes its slot
  const slot = c.slot;
  r.sim.leave(c, 'bye'); r.sim.players.delete('c');
  const d = play(r, 'd', 100.5, 100.5);
  assert.equal(d.slot, slot);
  // b's link is down: it lingers
  b.online = false;
  r.realm.mobs.hurt(m, 1e7, 0, 1, 0, false, a);
  assert.equal(m.active, false);
  assert.ok(owned(r, 'a', 'heartroot') >= 6, 'a: owned heartroot at its feet');
  assert.equal(owned(r, 'b', 'heartroot'), 0);
  assert.ok(b.mail.some((it) => it.k === 'heartroot'), 'b: in its mail');
  assert.equal(b.stats.xp > 0 || b.stats.level > 1, true);
  const o = r.sim.shared.owed.c;
  assert.ok(o && o.items.some((it) => it.k === 'heartroot') && o.coins > 0 && o.xp === m.def.xp, 'c: held in shared.owed');
  assert.equal(r.sim.shared.owed.d, undefined); assert.equal(d.stats.xp, 0); assert.equal(d.inv.coins, 0); assert.equal(d.mail.length, 0);
  assert.equal(owned(r, 'd', 'heartroot'), 0);
  assert.deepEqual(r.sim.shared.summons, [], 'a kill ends the summons entry without a refund');
  // c comes back: join pays what it was owed
  const c2 = r.sim.join('c', 'C', null, false);
  assert.ok(c2.mail.some((it) => it.k === 'heartroot')); assert.equal(r.sim.shared.owed.c, undefined);
});

test('7.4: owned drops answer to their owner; a parked owner\'s go to its mail, delivered with the pickup line; shared ones to the first in reach with room', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 0.6, 0.5);
  r.realm.drops.spawn(0.5, GROUND + 0.5, 0.5, { k: 'stick', n: 2 }, 0, 0, 0, 0, 'b');
  r.realm.drops.spawn(0.5, GROUND + 0.5, 0.5, { k: 'flint', n: 1 }, 0, 0, 0, 0);
  run(r, 60);
  assert.equal(b.inv.count('stick'), 2); assert.equal(a.inv.count('stick'), 0);
  assert.equal(a.inv.count('flint'), 1, 'the first player in reach with room');
  r.realm.drops.spawn(30.5, GROUND + 0.5, 0.5, { k: 'stick', n: 3 }, 0, 0, 0, 0, 'b');
  r.sim.leave(b, 'bye');
  run(r, 1);
  assert.equal(r.realm.drops.alive, 0);
  assert.deepEqual(b.mail, [{ k: 'stick', n: 3 }]);
  // b comes back and is in play: the mail goes into the pack
  r.sim.resume(b); b.loading = false; b.arriving = -1;
  r.ev.length = 0;
  run(r, 1);
  assert.equal(b.inv.count('stick'), 5); assert.equal(b.mail.length, 0);
  assert.deepEqual(r.ev.filter((e) => e[1][0] === 'u').map((e) => e[1]), [['u', 'stick', 3, 5]]);
});

// ---- 7.9 bosses ----

test('7.9: boss 1 has maxHp 924 with three players near, and keeps it while two of them shoot from 70 blocks', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 3.5, 0.5), c = play(r, 'c', -3.5, 0.5);
  for (const p of [a, b, c]) p.modes.god = true;
  const m = boss1(r, a);
  run(r, 1);
  assert.equal(m.maxHp, 924); assert.equal(m.hp, 924);
  assert.ok(Math.abs(m.dmgMul - 1.4 * 1.2) < 1e-9);
  put(b, 70.5, 0.5); put(c, -69.5, 0.5);
  for (let s = 0; s < 40; s++) {
    if (s % 5 === 0) { r.realm.mobs.hurt(m, 2, 0, 1, 0, false, b); r.realm.mobs.hurt(m, 2, 0, 1, 0, false, c); }
    run(r, 60, pin(m, 0.5, 6.5));
    assert.equal(m.maxHp, 924, `second ${s}`);
  }
  assert.ok(Math.hypot(b.body.x - m.x, b.body.z - m.z) > 64 && Math.hypot(c.body.x - m.x, c.body.z - m.z) > 64);
});

test('7.9: a rise of n applies at once, a fall only after n has been lower for 10 s; health keeps its fraction', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 3.5, 0.5);
  for (const p of [a, b]) p.modes.god = true;
  const m = boss1(r, a);
  run(r, 1);
  assert.equal(m.maxHp, Math.round(420 * 1.6));
  m.hp = m.maxHp / 2;
  put(b, 200.5, 0.5);
  run(r, 60 * 9.5);
  assert.equal(m.maxHp, 672, 'still raised 9.5 s after');
  run(r, 60 * 1.5);
  assert.equal(m.maxHp, 420, 'lowered after 10 s');
  assert.ok(Math.abs(m.hp - 210) < 1e-9);
  assert.ok(Math.abs(m.dmgMul - 1.4) < 1e-9);
  put(b, 3.5, 0.5);
  run(r, 61);
  assert.equal(m.maxHp, 672, 'raised within the second');
});

test('7.9: participants: the summoner, those within 32 at the summon, anyone hurting it or hurt by it; leaving the realm or saying bye ends it', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 30.5, 0.5), c = play(r, 'c', 0.5, 50.5);
  for (const p of [a, b, c]) p.modes.god = true;
  const m = boss1(r, a), parts = m.boss!.parts;
  assert.deepEqual([...parts].sort(), ['a', 'b']);
  assert.equal(r.saves, 1); assert.deepEqual(r.sim.shared.summons, [{ n: 1, item: 'verdant_idol', by: 'a', dim: 0, altar: [0, GROUND - 1, 0] }]);
  r.realm.mobs.hurt(m, 1, 0, 1, 0, false, c);
  assert.ok(parts.has('c'));
  const d = play(r, 'd', 60.5, 0.5);
  d.modes.god = true;
  r.realm.proj.fire('arrow', 59.5, GROUND + 1, 0.5, 1, 0, 0, 5, null, 0, 30)!.src = m.id;
  run(r, 10);
  assert.ok(d.hurtTick < 0, 'god mode is not hurt');
  d.modes.god = false;
  r.realm.proj.fire('arrow', 59.5, GROUND + 1, 0.5, 1, 0, 0, 5, null, 0, 30)!.src = m.id;
  run(r, 10);
  assert.ok(parts.has('d'), 'hurt by its shot');
  b.dim = 1; r.sim.realms[0].players.splice(r.sim.realms[0].players.indexOf(b), 1); r.sim.realms[1].players.push(b);
  run(r, 61);
  assert.ok(!parts.has('b'), 'left the realm');
  partLeft(r.sim, c);
  assert.ok(!parts.has('c'), 'said bye');
});

test('7.9: the target is chosen among valid targets when an attack is selected: the nearest with probability 0.6', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 12.5, 0.5), c = play(r, 'c', 0.5, 90.5);
  for (const p of [a, b, c]) p.modes.god = true;
  const m = boss1(r, a);
  r.realm.mobs.hurt(m, 1, 0, 1, 0, false, c);
  const seen = new Map<string, number>();
  let last: SimPlayer | null = null, picks = 0;
  run(r, 60 * 120, () => {
    if (m.boss!.atk && !last) { picks++; seen.set(m.tp!.id, (seen.get(m.tp!.id) ?? 0) + 1); }
    last = m.boss!.atk ? m.tp : null;
    m.hp = m.maxHp;
  });
  assert.ok(picks > 20, `${picks} attacks`);
  assert.equal(seen.get('c'), undefined, 'c is a participant but 90 blocks from the altar');
  assert.ok((seen.get('a') ?? 0) > 0 && (seen.get('b') ?? 0) > 0, JSON.stringify([...seen]));
});

test('7.9: with every participant away the boss holds and waits; one parked sets b.lost; it then withdraws and the offering goes back', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5), b = play(r, 'b', 3.5, 0.5);
  for (const p of [a, b]) p.modes.god = true;
  const m = boss1(r, a);
  play(r, 'w', 300.5, 0.5);                           // someone far off keeps the realm from being suspended
  run(r, 30);
  a.stalled = true; b.online = false;
  run(r, 2);
  const x = m.x, z = m.z;
  run(r, 60 * 20);
  assert.ok(m.active, 'waiting past 10 s for participants who are away');
  assert.ok(Math.abs(m.x - x) < 1e-6 && Math.abs(m.z - z) < 1e-6, 'standing still');
  assert.equal(m.boss!.atk, null);
  assert.equal(m.boss!.lost, false);
  // the grace of b runs out: parked
  r.sim.leave(b, 'bye');
  run(r, 1);
  assert.equal(m.boss!.lost, true);
  assert.ok(m.active, 'a is still stalled: waited for');
  // a comes back: a valid target again clears b.lost
  a.stalled = false;
  run(r, 1);
  assert.equal(m.boss!.lost, false);
  a.stalled = true; run(r, 60);
  r.sim.leave(a, 'bye');
  run(r, 2);
  assert.equal(m.boss!.lost, true);
  run(r, 60 * 10);
  assert.equal(m.active, false, 'withdrew: nobody valid for 10 s and nobody to wait for');
  assert.deepEqual(r.sim.shared.summons, []);
  assert.deepEqual(a.mail, [{ k: 'verdant_idol', n: 1 }], 'the summoner is parked: the offering is in its mail');
});

test('7.9: the boss waits 90 s at most for a participant who is loading', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5);
  a.modes.god = true;
  const m = boss1(r, a);
  run(r, 10);
  a.loading = true;
  run(r, 60 * 89);
  assert.ok(m.active);
  run(r, 60 * 2);
  assert.equal(m.active, false);
  assert.deepEqual(a.inv.count('verdant_idol') + a.mail.length, 0, 'loading is no lost connection: no refund');
});

test('7.9: no refund for a party that walks away while connected; a summoner in play gets it into the pack; an absent one into shared.owed', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5);
  a.modes.god = true;
  let m = boss1(r, a);
  run(r, 10);
  put(a, 200.5, 0.5);
  run(r, 60 * 10 + 5);
  assert.equal(m.active, false);
  assert.equal(a.inv.count('verdant_idol'), 0); assert.deepEqual(r.sim.shared.summons, []);
  // stalled helper, summoner in play but out of the leash: interrupted, into the pack
  const b = play(r, 'b', 3.5, 0.5);
  put(a, 0.5, 0.5);
  m = boss1(r, a);
  run(r, 10);
  b.stalled = true; put(a, 200.5, 0.5);
  run(r, 60 * 11);
  assert.ok(m.active, 'waiting for b');
  r.sim.leave(b, 'bye');
  run(r, 60 * 10 + 5);
  assert.equal(m.active, false);
  assert.equal(a.inv.count('verdant_idol'), 1, 'b was lost: the offering back into a\'s pack');
  // the realm is suspended while a participant is away: removed by the refund rule, the summoner absent
  const c = play(r, 'c', 0.5, 0.5);
  m = boss1(r, c);
  run(r, 5);
  c.stalled = true;
  run(r, 60);
  r.sim.players.delete('c'); r.realm.players.splice(r.realm.players.indexOf(c), 1);
  r.realm.mobs.clear();
  assert.deepEqual(r.sim.shared.owed.c?.items, [{ k: 'verdant_idol', n: 1 }]);
  assert.deepEqual(r.sim.shared.summons, []);
});

test('7.9: at host start every summons entry is refunded into shared.owed and the list is cleared', () => {
  const r = rig(), s = r.sim.shared;
  s.summons.push({ n: 1, item: 'verdant_idol', by: 'x', dim: 0, altar: [0, 0, 0] }, { n: 2, item: 'scorched_idol', by: 'x', dim: 0, altar: [0, 0, 0] });
  s.owed.x = { xp: 5, coins: 2, items: [{ k: 'stick', n: 1 }] };
  refundSummons(s);
  assert.deepEqual(s.summons, []);
  assert.deepEqual(s.owed.x, { xp: 5, coins: 2, items: [{ k: 'stick', n: 1 }, { k: 'verdant_idol', n: 1 }, { k: 'scorched_idol', n: 1 }] });
});

test('7.9: alone, the rules are today\'s: maxHp 420, damage x1.4, the summoner its target', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5);
  a.modes.god = true;
  const m = boss1(r, null);
  run(r, 120);
  assert.equal(m.maxHp, 420); assert.equal(m.dmgMul, 1.4);
  assert.deepEqual([...m.boss!.parts], ['a'], 'a boss no altar reported takes the players by it at its first tick');
  assert.equal(m.tp, a);
});

test('7.9: the last participant parked while the boss waits for it: the realm is suspended and the offering comes back', () => {
  const r = rig(), a = play(r, 'a', 0.5, 0.5);
  a.modes.god = true;
  const m = boss1(r, a);
  run(r, 10);
  a.stalled = true;
  run(r, 60 * 5);
  r.sim.leave(a, 'bye');
  assert.equal(m.active, false);
  assert.deepEqual(a.mail, [{ k: 'verdant_idol', n: 1 }]);
  assert.deepEqual(r.sim.shared.summons, []);
  // the same while connected: a bye ends a fight without a refund
  const b = play(r, 'b', 0.5, 0.5);
  b.modes.god = true;
  const n = boss1(r, b);
  run(r, 10);
  r.sim.leave(b, 'bye');
  assert.equal(n.active, false);
  assert.deepEqual(b.mail, []);
  assert.deepEqual(r.sim.shared.summons, []);
});
