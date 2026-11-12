// What the entity sims say about themselves for replication (wire ids, and the events a projectile, a
// drop and a creature begin and end with), and the small pieces the contracts step added beside
// them: the inline chunk source, the in-memory store, breakTimeMin, maxSpeed, the flight grant and freeSpot.
import assert from 'node:assert/strict';
import test from 'node:test';
import { B } from '../../src/data/blocks';
import { item } from '../../src/data/items';
import { MOB_LIST, PROJECTILES } from '../../src/data/mobs';
import { ID_MAX, PS_PLAYER } from '../../src/net/protocol';
import { cheat } from '../../src/sim/cheats';
import { InlineSource } from '../../src/sim/chunksource';
import { daOf } from '../../src/sim/drops';
import type { Fx, Scope, Sink } from '../../src/sim/fx';
import { genChunk, hashBlocks } from '../../src/sim/genjob';
import { Inventory } from '../../src/sim/inventory';
import { flightAllowed, toRecord } from '../../src/sim/player';
import { PROJ_KEYS, psOf } from '../../src/sim/projectiles';
import type { RealmStore } from '../../src/sim/realm';
import { bodyFree, breakTime, breakTimeMin, freeSpot, maxSpeed } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';
import { PlayerStats } from '../../src/sim/stats';
import { type Batch, type ChunkRecord, MemStorage, type PlayerRecord, StorageError, type WorldRecord } from '../../src/sim/storage';
import type { BlockEnt } from '../../src/sim/voxels';

const GROUND = 64;
/** Flat stone up to y = 63, air above, and whatever a test writes on top of that. */
class Flat implements RealmStore {
  onChange: RealmStore['onChange'] = null;
  cells = new Map<string, number>();
  ents = new Map<string, BlockEnt>();
  getBlock(x: number, y: number, z: number): number { return this.cells.get(`${x},${y},${z}`) ?? (y >= 0 && y < GROUND ? B.stone : 0); }
  ready(): boolean { return true; }
  topY(): number { return GROUND - 1; }
  biomeAt(): number { return 0; }
  setBlock(x: number, y: number, z: number, id: number): boolean { this.cells.set(`${x},${y},${z}`, id); return true; }
  getEnt(x: number, y: number, z: number): BlockEnt | null { return this.ents.get(`${x},${y},${z}`) ?? null; }
  setEnt(x: number, y: number, z: number, kind: string, data: unknown): BlockEnt { const e = { x, y, z, kind, data }; this.ents.set(`${x},${y},${z}`, e); return e; }
  removeEnt(x: number, y: number, z: number): void { this.ents.delete(`${x},${y},${z}`); }
  sky(): number { return 15; }
  block(): number { return 0; }
  chunkEnts(): null { return null; }
  areaReady(): boolean { return true; }
  touch(): void {}
}
const worldRecord = (): WorldRecord => ({
  format: 2, id: 'w', name: 'Test', seed: 7, seedText: '7', created: 0, played: 0, owner: 'local', palettes: [], names: {},
  state: { clock: 0.2, tick: 0, rnd: 12345, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [0, 0], gates: [], summons: [], owed: {} },
});
interface Rig { sim: Sim; store: Flat; ev: [Scope, Fx][]; of(code: string): [Scope, Fx][]; reset(): void }
function rig(): Rig {
  const store = new Flat(), ev: [Scope, Fx][] = [];
  const sink: Sink = { emit: (to, e) => { ev.push([to, e]); }, send: () => {}, broadcast: () => {} };
  const sim = new Sim(worldRecord(), { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, store: () => store, log: () => {}, requestSave: () => {} });
  return { sim, store, ev, of: (code) => ev.filter((e) => e[1][0] === code), reset: () => { ev.length = 0; } };
}
const STEP = 1 / 60;

test('a creature\'s shot: one ps to the realm, then pe where the ground stops it', () => {
  const r = rig(), realm = r.sim.realms[0];
  const p = realm.proj.fire('arrow', 0.5, 70, 0.5, 1, 0, 0, 5, null)!;
  assert.ok(p && p.active);
  assert.equal(p.id, 1); assert.equal(p.by, null); assert.equal(p.cseq, 0);
  assert.deepEqual(r.ev, [[{ dim: 0 }, ['ps', 1, PROJ_KEYS.indexOf('arrow'), 0.5, 70, 0.5, PROJECTILES.arrow.speed, 0, 0, PROJECTILES.arrow.life, 0, 0]]]);
  r.reset();
  for (let i = 0; i < 240 && p.active; i++) realm.proj.tick(STEP);
  assert.equal(p.active, false);
  const pe = r.of('pe');
  assert.equal(pe.length, 1);
  assert.deepEqual(pe[0][0], { dim: 0 });
  assert.equal(pe[0][1][1], 1); assert.equal(pe[0][1][5], 1, 'stopped by terrain');
  assert.ok(Math.abs((pe[0][1][3] as number) - GROUND) < 0.01, 'at the ground');
  assert.deepEqual([pe[0][1][2], pe[0][1][3], pe[0][1][4]], [p.x, p.y, p.z]);
});

test('a player\'s shot: the shooter is told which fire it answers, everyone else is not', () => {
  const r = rig(), realm = r.sim.realms[0], a = r.sim.join('a', 'A', null, false);
  const p = realm.proj.fire('arrow', 0.5, 70, 0.5, 0, 0, 1, 5, a, 9, 20, 'ranged', 3, true)!;
  assert.equal(p.by, 'a'); assert.equal(p.cseq, 9); assert.equal(p.player, true); assert.equal(p.crit, true);
  assert.deepEqual(r.ev, [
    [{ p: a.slot }, ['ps', p.id, 0, 0.5, 70, 0.5, 0, 0, 20, PROJECTILES.arrow.life, PS_PLAYER, 9]],
    [{ dim: 0, not: a.slot }, ['ps', p.id, 0, 0.5, 70, 0.5, 0, 0, 20, PROJECTILES.arrow.life, PS_PLAYER, 0]],
  ]);
  assert.deepEqual(psOf(p, true), r.ev[0][1]); assert.deepEqual(psOf(p, false), r.ev[1][1]);
});

test('lead: the shot is flown before anyone is told, and a shot that ends inside its lead still says ps before pe', () => {
  const r = rig(), realm = r.sim.realms[0], a = r.sim.join('a', 'A', null, false);
  const p = realm.proj.fire('ember', 0.5, 70, 0.5, 1, 0, 0, 5, a, 3, undefined, 'magic', 3, false, 0.1)!;
  const ps = r.ev[0][1] as number[] & Fx;
  assert.ok(Math.abs((ps[3] as number) - (0.5 + PROJECTILES.ember.speed * 0.1)) < 1e-6, `flown to x = ${ps[3]}`);
  assert.ok(Math.abs((ps[9] as number) - (PROJECTILES.ember.life - 0.1)) < 1e-6, `life left ${ps[9]}`);
  assert.equal(p.active, true);
  // a wall two blocks ahead: the shot is over before its lead is
  r.reset();
  for (let y = 64; y < 80; y++) r.store.setBlock(3, y, 20, B.stone);
  const q = realm.proj.fire('arrow', 0.5, 70, 20.5, 1, 0, 0, 5, a, 4, undefined, 'ranged', 3, false, 0.15)!;
  assert.equal(q.active, false);
  assert.deepEqual(r.ev.map((e) => e[1][0]), ['ps', 'ps', 'pe']);
  assert.deepEqual(r.ev[0][0], { p: a.slot }); assert.equal(r.ev[0][1][11], 4);
  assert.deepEqual(r.ev[2], [{ dim: 0 }, ['pe', q.id, q.x, q.y, q.z, 1]]);
  assert.ok(Math.abs(q.x - 3) < 1e-6);
});

test('a shot that runs out of life, and shots withdrawn, end with pe 0', () => {
  const r = rig(), realm = r.sim.realms[0];
  const p = realm.proj.fire('ember', 0.5, 70, 0.5, 0, 1, 0, 5, null)!;
  r.reset();
  for (let i = 0; i < 239; i++) realm.proj.tick(STEP);
  assert.equal(p.active, true); assert.equal(r.ev.length, 0);
  for (let i = 0; i < 3; i++) realm.proj.tick(STEP);
  assert.equal(p.active, false);
  assert.deepEqual(r.ev.map((e) => [e[0], e[1][0], e[1][1], e[1][5]]), [[{ dim: 0 }, 'pe', p.id, 0]]);
  const a = realm.proj.fire('ember', 0.5, 70, 0.5, 0, 1, 0, 5, null)!, b = realm.proj.fire('ember', 5.5, 70, 0.5, 0, 1, 0, 5, null)!;
  r.reset();
  realm.proj.clear();
  assert.deepEqual(r.ev.map((e) => [e[1][0], e[1][1], e[1][5]]), [['pe', a.id, 0], ['pe', b.id, 0]]);
  assert.equal(realm.proj.alive, 0);
});

test('a shot that strikes a creature: pe 2, the hit mark to the shooter, the damage counted for them', () => {
  const r = rig(), realm = r.sim.realms[0], a = r.sim.join('a', 'A', null, false);
  const m = realm.mobs.spawn('bog_lurker', 5.5, GROUND, 0.5)!;
  const p = realm.proj.fire('arrow', 0.5, GROUND + 1, 0.5, 1, 0, 0, 4, a, 1)!;
  r.reset();
  for (let i = 0; i < 30 && p.active; i++) realm.proj.tick(STEP);
  assert.equal(p.active, false);
  assert.deepEqual(r.of('pe').map((e) => [e[1][1], e[1][5]]), [[p.id, 2]]);
  assert.deepEqual(r.of('h'), [[{ p: a.slot }, ['h', false]]]);
  assert.ok(m.hp < m.maxHp);
  assert.equal(m.hitBy.get('a'), m.maxHp - m.hp);
  assert.equal(realm.proj.byId(p.id), null);
});

test('projectile ids run 1..65535 and pass over one still in flight', () => {
  const r = rig(), proj = r.sim.realms[0].proj, up = (): number => proj.fire('ember', 0.5, 70, 0.5, 0, 1, 0, 1, null)!.id;
  assert.equal(up(), 1); assert.equal(up(), 2);
  (proj as unknown as { nextId: number }).nextId = ID_MAX;
  assert.equal(up(), ID_MAX);
  assert.equal(up(), 3, '1 and 2 are still flying');
  assert.equal(proj.byId(2)!.id, 2); assert.equal(proj.byId(4), null);
});

test('a drop: da when it appears, dn when a stack folds into it, dd when it is picked up or lapses', () => {
  const r = rig(), realm = r.sim.realms[0], a = r.sim.join('a', 'A', null, false);
  a.body.teleport(40.5, GROUND, 40.5);
  realm.drops.spawn(0.5, GROUND + 1, 0.5, { k: 'stick', n: 2 }, 0, 0, 0, 0);
  const d = realm.drops.list[0];
  assert.equal(d.id, 1);
  assert.deepEqual(r.ev, [[{ dim: 0 }, ['da', 1, 'stick', 2, '', 0.5, GROUND + 1, 0.5, 0, 0, 0, 0]]]);
  assert.deepEqual(daOf(d), r.ev[0][1]);
  r.reset();
  realm.drops.spawn(0.9, GROUND + 1, 0.5, { k: 'stick', n: 3 }, 0, 0, 0, 0);
  assert.deepEqual(r.ev, [[{ dim: 0 }, ['dn', 1, 5]]]);
  assert.equal(realm.drops.alive, 1);
  // a modified item never folds, and carries its modifier
  r.reset();
  realm.drops.spawn(0.5, GROUND + 1, 0.5, { k: 'iron_sword', n: 1, m: 'keen' }, 1, 2, 3, 0.5);
  assert.deepEqual(r.ev, [[{ dim: 0 }, ['da', 2, 'iron_sword', 1, 'keen', 0.5, GROUND + 1, 0.5, 1, 2, 3, 0.5]]]);
  // the player walks up: both are picked up, each dd naming the picker
  r.reset();
  a.body.teleport(0.5, GROUND, 0.5);
  for (let i = 0; i < 120 && realm.drops.alive; i++) realm.drops.tick(STEP);
  assert.equal(realm.drops.alive, 0);
  assert.deepEqual(r.of('dd').map((e) => [e[0], e[1][1], e[1][2]]).sort((x, y) => (x[1] as number) - (y[1] as number)), [[{ dim: 0 }, 1, a.slot], [{ dim: 0 }, 2, a.slot]]);
  assert.equal(r.of('u').length, 2);
  assert.equal(a.inv.count('stick'), 5);
  // one that lies too long
  a.body.teleport(40.5, GROUND, 40.5);
  r.reset();
  realm.drops.spawn(0.5, GROUND + 1, 0.5, { k: 'stick', n: 1 }, 0, 0, 0, 0);
  const old = realm.drops.byId(3)!;
  old.age = 300.5;
  realm.drops.tick(STEP);
  assert.deepEqual(r.of('dd'), [[{ dim: 0 }, ['dd', 3, 0]]]);
  assert.equal(realm.drops.byId(3), null);
});

test('a drop the pack can only partly take: dn with what is left', () => {
  const r = rig(), realm = r.sim.realms[0], a = r.sim.join('a', 'A', null, false), stack = item('stick').stack;
  for (let i = 0; i < 36; i++) a.inv.slots[i] = { k: 'stone', n: item('stone').stack };
  a.inv.slots[5] = { k: 'stick', n: stack - 2 };
  a.body.teleport(0.5, GROUND, 0.5);
  realm.drops.spawn(0.5, GROUND + 0.8, 0.5, { k: 'stick', n: 5 }, 0, 0, 0, 0);
  r.reset();
  realm.drops.tick(STEP);
  assert.deepEqual(r.of('dn'), [[{ dim: 0 }, ['dn', 1, 3]]]);
  assert.deepEqual(r.of('u'), [[{ p: a.slot }, ['u', 'stick', 2, stack]]]);
  assert.equal(r.of('dd').length, 0);
  assert.equal(realm.drops.byId(1)!.it.n, 3);
});

test('an owned drop is told to its owner alone, and to nobody while the owner is elsewhere', () => {
  const r = rig(), realm = r.sim.realms[0], a = r.sim.join('a', 'A', null, false);
  r.sim.join('b', 'B', null, false);
  realm.drops.spawn(0.5, GROUND + 1, 0.5, { k: 'stick', n: 1 }, 0, 0, 0, 0, 'a');
  assert.deepEqual(r.ev.map((e) => [e[0], e[1][0], e[1][1]]), [[{ p: a.slot }, 'da', 1]]);
  r.reset();
  realm.drops.spawn(8.5, GROUND + 1, 0.5, { k: 'stick', n: 1 }, 0, 0, 0, 0, 'nobody');
  assert.equal(r.ev.length, 0);
  assert.equal(realm.drops.byId(2)!.owner, 'nobody');
  // drops of different owners do not fold together
  realm.drops.spawn(0.6, GROUND + 1, 0.5, { k: 'stick', n: 1 }, 0, 0, 0, 0, null);
  assert.equal(realm.drops.alive, 3);
});

test('a full drop pool gives up its oldest: dd for it, then da; clear says dd for each', () => {
  const r = rig(), realm = r.sim.realms[0], n = realm.drops.list.length;
  for (let i = 0; i < n; i++) realm.drops.spawn(i * 3 + 0.5, GROUND + 1, 200.5, { k: 'stick', n: 1 }, 0, 0, 0, 0);
  assert.equal(realm.drops.alive, n);
  realm.drops.list[7].age = 50;
  const gone = realm.drops.list[7].id;
  r.reset();
  realm.drops.spawn(0.5, GROUND + 1, 400.5, { k: 'stone', n: 1 }, 0, 0, 0, 0);
  assert.deepEqual(r.ev.map((e) => [e[1][0], e[1][1]]), [['dd', gone], ['da', n + 1]]);
  assert.equal(realm.drops.list[7].it.k, 'stone');
  r.reset();
  realm.drops.clear();
  assert.equal(r.of('dd').length, n); assert.ok(r.of('dd').every((e) => e[1][2] === 0));
  assert.equal(realm.drops.alive, 0);
});

test('creature ids run 1..65535 from one counter and pass over one still alive in the realm', () => {
  const r = rig(), sim = r.sim, mobs = sim.realms[0].mobs;
  const a = mobs.spawn('woolback', 0.5, GROUND, 0.5)!, b = mobs.spawn('woolback', 3.5, GROUND, 0.5)!;
  assert.deepEqual([a.id, b.id], [1, 2]);
  assert.equal(sim.realms[1].mobs.spawn('woolback', 0.5, GROUND, 0.5)!.id, 3, 'one counter for all realms');
  sim.mobId = ID_MAX;
  assert.equal(mobs.spawn('woolback', 6.5, GROUND, 0.5)!.id, ID_MAX);
  assert.equal(mobs.spawn('woolback', 9.5, GROUND, 0.5)!.id, 3, '1 and 2 are alive here; 3 lives in another realm');
  mobs.remove(a);
  sim.mobId = 1;
  assert.equal(mobs.spawn('woolback', 12.5, GROUND, 0.5)!.id, 1);
});

test('a creature leaving says md: despawned, killed, withdrawn; a blow is counted for its player', () => {
  const r = rig(), sim = r.sim, mobs = sim.realms[0].mobs, a = sim.join('a', 'A', null, false);
  const m = mobs.spawn('woolback', 0.5, GROUND, 0.5)!, k = mobs.spawn('woolback', 3.5, GROUND, 0.5)!, w = mobs.spawn('woolback', 6.5, GROUND, 0.5)!;
  r.reset();
  mobs.remove(m);
  mobs.remove(m);
  assert.deepEqual(r.of('md'), [[{ dim: 0 }, ['md', m.id, 0]]]);
  mobs.hurt(k, 3, 1, 0, 0, false, a);
  assert.equal(k.hitBy.get('a'), k.maxHp - k.hp);
  mobs.hurt(k, 1e6, 1, 0, 0, false, a);
  mobs.remove(w, 2);
  assert.deepEqual(r.of('md').map((e) => e[1]), [['md', m.id, 0], ['md', k.id, 1], ['md', w.id, 2]]);
  assert.ok(MOB_LIST.length <= 255, 'a creature kind fits the byte it travels in');
});

test('InlineSource: lowest prio first, in asking order among equals, a bounded number per poll', () => {
  let t = 0;
  const src = new InlineSource(7, () => (t += 5));
  src.request(1, 0, 0, 5); src.request(1, 1, 0, 2); src.request(1, 2, 0, 2); src.request(1, 3, 0, 9);
  src.request(1, 0, 0, 0);   // already pending: nothing changes
  assert.equal(src.pending, 4);
  src.cancel(1, 3, 0); src.cancel(1, 99, 99);
  assert.equal(src.pending, 3);
  const two = src.poll(2, Infinity);
  assert.deepEqual(two.map((g) => [g.dim, g.cx, g.cz]), [[1, 1, 0], [1, 2, 0]]);
  assert.equal(src.pending, 1);
  const want = genChunk(7, 1, 1, 0);
  assert.equal(two[0].hash, want.hash); assert.equal(two[0].hash, hashBlocks(two[0].blocks)); assert.deepEqual(two[0].blocks, want.blocks); assert.deepEqual(two[0].ents, want.ents);
  assert.equal(two[0].biomes.length > 0, true);
  // a spent budget still finishes one job, and only one
  src.request(1, 5, 5, 1); src.request(1, 6, 5, 1);
  assert.deepEqual(src.poll(Infinity, 1).map((g) => [g.cx, g.cz]), [[5, 5]]);
  assert.deepEqual(src.poll(Infinity, 1).map((g) => [g.cx, g.cz]), [[6, 5]]);
  assert.deepEqual(src.poll(Infinity, 1e9).map((g) => [g.cx, g.cz]), [[0, 0]]);
  assert.deepEqual(src.poll(Infinity, 1e9), []);
  assert.deepEqual(src.poll(0, 1e9), []);
  src.request(1, 0, 0, 0); src.dispose();
  assert.equal(src.pending, 0);
});

test('MemStorage: a commit is all there or not at all, and nothing handed out is shared with what is kept', async () => {
  const st = new MemStorage();
  assert.equal(await st.open(), null); assert.equal(await st.loadPlayer('a'), null); assert.equal(await st.loadChunk(0, 1, 2), null);
  const player = (id: string): PlayerRecord => ({ v: 1, id, name: id, seen: 0, dim: 0, pos: { x: 1, y: 2, z: 3, yaw: 0, pitch: 0 }, inv: new Inventory().serialize(), stats: new PlayerStats().serialize(),
    bed: null, deathAt: null, portalReturn: {}, safe: [1, 2, 3], arriving: -1, pendingBed: false, recallT: 0, modes: { creative: false, hidden: false, god: false, fly: false }, mail: [{ k: 'stick', n: 2 }] });
  const chunk: ChunkRecord = { dim: 0, cx: 1, cz: 2, rev: 3, pal: 0, enc: 0, data: Uint8Array.from([1, 0, 5, 2, 0, 6]), ents: [{ x: 16, y: 70, z: 32, kind: 'chest', data: { s: [{ k: 'stick', n: 1 }, null], loot: null } }] };
  const batch: Batch = { world: worldRecord(), players: [player('a'), player('b')], chunks: [chunk] };
  st.failNext = new StorageError('full', 'no room');
  await assert.rejects(st.commit(batch), (e: unknown) => e instanceof StorageError && e.code === 'full' && e.message === 'no room' && e instanceof Error);
  assert.equal(await st.open(), null); assert.equal(await st.loadPlayer('a'), null); assert.equal(st.commits, 0);
  await st.commit(batch);
  assert.equal(st.commits, 1);
  // changing what was committed, or what was loaded, changes nothing in the store
  batch.players[0].pos.x = 99; chunk.data[2] = 77; chunk.ents[0].data.s[0].n = 50; batch.world!.state.flags.push('x');
  const a = (await st.loadPlayer('a'))!, c = (await st.loadChunk(0, 1, 2))!, w = (await st.open())!;
  assert.equal(a.pos.x, 1); assert.deepEqual([...c.data], [1, 0, 5, 2, 0, 6]); assert.equal(c.ents[0].data.s[0].n, 1); assert.deepEqual(w.state.flags, []);
  assert.deepEqual(a.mail, [{ k: 'stick', n: 2 }]); assert.equal(c.rev, 3); assert.equal(w.seed, 7);
  a.pos.x = 5; c.data[0] = 9;
  assert.equal((await st.loadPlayer('a'))!.pos.x, 1); assert.equal((await st.loadChunk(0, 1, 2))!.data[0], 1);
  assert.equal(await st.loadChunk(1, 1, 2), null);
  // a later commit replaces only what it holds
  await st.commit({ players: [{ ...player('a'), dim: 2 }], chunks: [] });
  assert.equal((await st.loadPlayer('a'))!.dim, 2); assert.equal((await st.loadPlayer('b'))!.dim, 0); assert.ok(await st.open());
  await st.close();
});

test('breakTimeMin is breakTime on the ground and out of water, and never more than breakTime', () => {
  const inv = new Inventory(), stats = new PlayerStats(), modes = { creative: false };
  stats.recompute(inv);
  const ground = { headInWater: false, onGround: true, inWater: false };
  for (const held of [null, { k: 'wood_pickaxe', n: 1 }, { k: 'iron_pickaxe', n: 1 }, { k: 'iron_axe', n: 1 }]) {
    inv.slots[0] = held; inv.sel = 0;
    for (const id of [B.stone, B.dirt, B.oak_log, B.bedrock]) {
      const min = breakTimeMin(id, inv, stats, modes);
      assert.equal(min, breakTime(id, inv, stats, modes, ground));
      for (const body of [{ headInWater: true, onGround: true, inWater: true }, { headInWater: false, onGround: false, inWater: false }, { headInWater: true, onGround: false, inWater: true }, { headInWater: false, onGround: false, inWater: true }])
        assert.ok(min <= breakTime(id, inv, stats, modes, body));
    }
  }
  assert.equal(breakTimeMin(B.bedrock, inv, stats, modes), Infinity);
  assert.equal(breakTimeMin(B.stone, inv, stats, { creative: true }), 0);
});

test('maxSpeed: flight, or a sprint with its bonuses and a margin', () => {
  const inv = new Inventory(), stats = new PlayerStats();
  stats.recompute(inv);
  assert.equal(maxSpeed(stats, true), 24);
  assert.ok(Math.abs(maxSpeed(stats, false) - (5.75 * (1 + stats.d.speed) * Math.max(1, 1 + stats.d.swim) + 1.2)) < 1e-12);
  assert.ok(maxSpeed(stats, false) > 5.75 && maxSpeed(stats, false) < 24);
});

test('flight is allowed in creative or on a grant of the fly command, and the grant is kept with the record', () => {
  const r = rig(), a = r.sim.join('a', 'A', null, false), b = a.body;
  const state = (): boolean[] => [a.modes.creative, a.modes.fly, b.flying, flightAllowed(a)];
  assert.deepEqual(state(), [false, false, false, false]);
  assert.ok(maxSpeed(a.stats, flightAllowed(a)) < 24);
  assert.equal(cheat(r.sim, a, 'fly'), 'fly true');
  assert.deepEqual(state(), [false, true, true, true]);
  assert.equal(maxSpeed(a.stats, flightAllowed(a)), 24);
  // the host's `flying` is whatever the last move said; the grant is what a record and a rejoin keep
  const rec = toRecord(a, 0);
  assert.deepEqual(rec.modes, { creative: false, hidden: false, god: false, fly: true });
  const back = rig().sim.join('a', 'A', JSON.parse(JSON.stringify(rec)), false);
  assert.equal(back.modes.fly, true); assert.equal(flightAllowed(back), true); assert.equal(back.body.flying, false);
  assert.equal(cheat(r.sim, a, 'fly'), 'fly false');
  assert.deepEqual(state(), [false, false, false, false]);
  // creative allows it without a grant, and takes a grant with it when it ends
  cheat(r.sim, a, 'fly');
  assert.equal(cheat(r.sim, a, 'creative'), 'creative true');
  assert.deepEqual(state(), [true, false, true, true]);
  assert.equal(cheat(r.sim, a, 'creative'), 'creative false');
  assert.deepEqual(state(), [false, false, false, false]);
  // in creative the command still flips the body it is run on
  cheat(r.sim, a, 'creative');
  assert.equal(cheat(r.sim, a, 'fly'), 'fly false');
  assert.deepEqual(state(), [true, false, false, true]);
  assert.equal(cheat(r.sim, a, 'fly'), 'fly true');
  assert.deepEqual(state(), [true, true, true, true]);
  assert.equal(cheat(r.sim, a, 'creative'), 'creative false');
  assert.deepEqual(state(), [false, false, false, false]);
});

test('freeSpot: where a body already has room, beside a block it is stuck in, and up out of solid rock', () => {
  const w = new Flat();
  // standing on the ground in the open
  assert.equal(bodyFree(w, 0.5, GROUND, 0.5), true);
  assert.deepEqual(freeSpot(w, 0.5, GROUND, 0.5), [0.5, GROUND, 0.5]);
  assert.deepEqual(freeSpot(w, 0.31, GROUND + 0.4, 0.77), [0.31, GROUND + 0.4, 0.77]);
  // a block set where the body stands: the nearest cell with footing and room is a neighbour on the ground
  w.setBlock(0, GROUND, 0, B.stone); w.setBlock(0, GROUND + 1, 0, B.stone);
  assert.equal(bodyFree(w, 0.5, GROUND, 0.5), false);
  const q = freeSpot(w, 0.5, GROUND, 0.5);
  assert.equal(q[1], GROUND);
  assert.equal(Math.abs(q[0] - 0.5) + Math.abs(q[2] - 0.5), 1, `one cell aside, got ${q}`);
  assert.equal(bodyFree(w, q[0], q[1], q[2]), true);
  // walled in on the level: two cells away, over the wall or on top of it, whichever comes first, never farther
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let y = GROUND; y < GROUND + 2; y++) w.setBlock(dx, y, dz, B.stone);
  const out = freeSpot(w, 0.5, GROUND, 0.5);
  assert.equal(Math.hypot(out[0] - 0.5, out[1] - GROUND, out[2] - 0.5), 2, `two cells away, got ${out}`);
  assert.equal(bodyFree(w, out[0], out[1], out[2]), true);
  assert.equal(bodyFree(w, out[0], out[1] - 0.2, out[2]), false, 'with something to stand on');
  assert.deepEqual(freeSpot(w, 0.5, GROUND, 0.5), out, 'the same spot every time');
  // deep in rock, with no room within four blocks: straight up to the surface
  const deep = freeSpot(w, 100.5, GROUND - 20, 100.5);
  assert.deepEqual(deep, [100.5, GROUND, 100.5]);
  // four blocks under the surface the open air is within reach, and the spot found has ground under it
  const near = freeSpot(w, 100.5, GROUND - 3, 100.5);
  assert.deepEqual(near, [100.5, GROUND, 100.5]);
  // room without footing is taken when nothing nearby has both
  const air = new Flat();
  for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) for (let y = 100; y <= 112; y++) air.setBlock(x, y, z, B.stone);
  for (const [x, y, z] of [[0, 106, 0], [0, 107, 0]]) air.setBlock(x, y, z, 0);
  air.setBlock(0, 105, 0, 0); air.setBlock(0, 104, 0, 0); air.setBlock(0, 103, 0, 0);
  const shaft = freeSpot(air, 2.5, 106, 0.5);
  assert.equal(bodyFree(air, shaft[0], shaft[1], shaft[2]), true);
  assert.deepEqual([shaft[0], shaft[2]], [0.5, 0.5]);
});
