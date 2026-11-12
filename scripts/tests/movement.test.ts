// The movement check of the host (4.5): which moves it believes, how it corrects the others, what it
// keeps of a body between two moves, how it lets a body walk out of a block, and the stream as the
// sign that a client is alive.
import assert from 'node:assert/strict';
import test from 'node:test';
import { B } from '../../src/data/blocks';
import { MV_FLY, MV_GROUND, MV_JUMPED, MV_SPRINT, MV_UI, MV_USING, type S2C } from '../../src/net/protocol';
import { encodeMove } from '../../src/net/snapshot';
import { JUMP_V } from '../../src/sim/body';
import type { Fx, Sink } from '../../src/sim/fx';
import { checkPosition, checkStall, handleMove, type MoveResult, tickEmbedded } from '../../src/sim/movement';
import { hurtPlayer, type SimPlayer, STALL_AFTER } from '../../src/sim/player';
import type { RealmStore } from '../../src/sim/realm';
import { bodyFree, maxSpeed } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';
import type { ChunkSource } from '../../src/sim/chunksource';
import { MemStorage, type WorldRecord } from '../../src/sim/storage';
import { sendTp } from '../../src/sim/travel';
import { type BlockEnt, EditMaps } from '../../src/sim/voxels';

const GROUND = 64;
/** The rules under test run on the flat store below: the sim's own chunks are given nothing to generate. */
const NO_SOURCE: ChunkSource = { request() {}, cancel() {}, poll: () => [], pending: 0, dispose() {} };
/** Stone up to y = 63, air above, and whatever a test writes; columns with |x| > 1000 are not loaded. */
class Flat implements RealmStore {
  onChange: RealmStore['onChange'] = null;
  cells = new Map<string, number>();
  getBlock(x: number, y: number, z: number): number { return this.cells.get(`${x},${y},${z}`) ?? (y >= 0 && y < GROUND ? B.stone : 0); }
  ready(x: number): boolean { return Math.abs(x) <= 1000; }
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
  format: 2, id: 'w', name: 'Test', seed: 7, seedText: '7', created: 0, played: 0, owner: 'local', palettes: [], names: {},
  state: { clock: 0.2, tick: 1000, rnd: 12345, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [0, 0], gates: [], summons: [], owed: {} },
});

interface Rig {
  sim: Sim; store: Flat; p: SimPlayer; sent: S2C[]; seq: number;
  /** A move from the client, at the current tick, with the teleport id it has applied (the current one unless given). */
  move(x: number, y: number, z: number, flags?: number, tp?: number): MoveResult;
  /** Let `n` ticks pass. */
  wait(n: number): void;
  tps(): Extract<S2C, { t: 'tp' }>[];
  hurts(): Extract<S2C, { t: 'hurt' }>[];
}
/** An active player standing at (0.5, 64, 0.5), as the activation `tp` leaves it. */
function rig(local = false): Rig {
  const store = new Flat(), sent: S2C[] = [];
  const sink: Sink = { emit: (_to, _e: Fx) => {}, send: (_s, m) => { sent.push(m); }, broadcast: () => {} };
  const sim = new Sim(worldRecord(), { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, chunks: NO_SOURCE, edits: new EditMaps(new MemStorage(), []), store: () => store, log: () => {}, requestSave: () => {} });
  const p = sim.join('a', 'A', null, local);
  p.loading = false; p.arriving = -1; p.grounded = true;
  p.body.teleport(0.5, GROUND, 0.5);
  sendTp(sim, p, false);
  p.lastMoveTick = sim.tick;
  sent.length = 0;
  const r: Rig = {
    sim, store, p, sent, seq: 0,
    move: (x, y, z, flags = MV_GROUND, tp = p.tp) => handleMove(sim, p, encodeMove({ seq: ++r.seq, tp, x, y, z, vx: 0, vy: 0, vz: 0, yaw: 0.5, pitch: -0.2, flags })),
    wait: (n) => { sim.tick += n; },
    tps: () => sent.filter((m): m is Extract<S2C, { t: 'tp' }> => m.t === 'tp'),
    hurts: () => sent.filter((m): m is Extract<S2C, { t: 'hurt' }> => m.t === 'hurt'),
  };
  return r;
}
const wall = (s: Flat, x: number, y0: number, y1: number, z0: number, z1: number, id = B.stone): void => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) s.setBlock(x, y, z, id); };
const LIMIT = JUMP_V + 2;

test('a walk at sprinting speed is believed move after move, and the body takes the client\'s position, look and flags', () => {
  const r = rig(), p = r.p, b = p.body;
  let x = 0.5;
  for (let i = 0; i < 100; i++) {
    r.wait(3); x += 5.75 * 3 / 60;
    assert.equal(r.move(x, GROUND, 0.5, MV_GROUND | MV_SPRINT | (i === 99 ? MV_USING | MV_UI : 0)), 'ok', `move ${i}`);
  }
  assert.equal(r.tps().length, 0);
  assert.ok(Math.abs(b.x - x) < 1e-9); assert.equal(b.y, GROUND);
  assert.ok(Math.abs(b.yaw - 0.5) < 1e-3); assert.ok(Math.abs(b.pitch + 0.2) < 1e-3);
  assert.equal(b.sprinting, true); assert.equal(p.usingItem, true); assert.equal(p.uiOpen, true);
  assert.equal(p.grounded, true, 'the host works out the ground for itself');
  assert.equal(p.moveSeq, r.seq, 'the snapshot answers the last move');
  assert.deepEqual(p.safe, [x, GROUND, 0.5]);
});

test('a jump and a fall are believed; landing from a fall deals the fall damage of today\'s rule', () => {
  const r = rig(), p = r.p;
  // a jump: up 1.25 and down again
  for (const y of [64.6, 65.1, 65.25, 64.9, 64.3, 64]) { r.wait(3); assert.equal(r.move(0.5, y, 0.5, y === 64 ? MV_GROUND : y === 64.6 ? MV_JUMPED : 0), 'ok'); }
  assert.equal(r.hurts().length, 0, 'a jump hurts nobody');
  // a fall of 7 blocks from a ledge: the body walks off at y = 71
  p.body.teleport(0.5, 71, 0.5); sendTp(r.sim, p, false); p.grounded = true;
  for (const y of [70.8, 70, 68.5, 66.5, 64.2]) { r.wait(3); assert.equal(r.move(0.5, y, 0.5, 0), 'ok'); }
  assert.equal(r.hurts().length, 0, 'nothing before the ground');
  r.wait(3); assert.equal(r.move(0.5, 64, 0.5), 'ok');
  const h = r.hurts();
  assert.equal(h.length, 1); assert.equal(h[0].cause, 'fall');
  assert.ok(Math.abs(h[0].dmg - (7 - 3) * 5.5) < 1, `dealt ${h[0].dmg}`);
  assert.equal(p.hurtTick, r.sim.tick);
  // the ground again: no second landing
  r.wait(3); r.move(0.5, 64, 0.5); assert.equal(r.hurts().length, 1);
});

test('a teleport is refused: the body stays, and the client is sent back there under a new teleport id', () => {
  const r = rig(), p = r.p, tp0 = p.tp;
  r.wait(60);
  assert.equal(r.move(40.5, GROUND, 0.5), 'speed');
  assert.equal(p.body.x, 0.5);
  const t = r.tps();
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].id, t[0].x, t[0].y, t[0].z, t[0].load], [(tp0 + 1) & 255, 0.5, GROUND, 0.5, false]);
  // moves still under the old id are the client's before it heard: dropped, not fought
  r.wait(3);
  assert.equal(r.move(40.5, GROUND, 0.5, MV_GROUND, tp0), 'dropped');
  assert.equal(r.tps().length, 1);
  r.wait(3);
  assert.equal(r.move(0.7, GROUND, 0.5), 'ok');
});

test('a walk through a wall is refused, and so is a step into it', () => {
  const r = rig(), s = r.store;
  wall(s, 2, 64, 66, -3, 3);
  r.wait(60);
  assert.equal(r.move(3.5, GROUND, 0.5), 'space', 'through: the room behind is free, the line to it is not');
  r.wait(3);
  assert.equal(r.move(1.9, GROUND, 0.5), 'space', 'into: the body would overlap the wall');
  r.wait(3);
  assert.equal(r.move(1.69, GROUND, 0.5), 'ok', 'up against it');
  assert.equal(r.tps().length, 2);
  // a doorway: two cells open in the wall
  s.setBlock(2, 64, 0, 0); s.setBlock(2, 65, 0, 0);
  for (const x of [2.2, 2.7, 3.2]) { r.wait(3); assert.equal(r.move(x, GROUND, 0.5), 'ok'); }
});

test('a speed over the limit is refused once the slack of the budget is spent', () => {
  const r = rig(), p = r.p, ms = maxSpeed(p.stats, false);
  let x = 0.5, out: MoveResult = 'ok', n = 0;
  r.wait(120);
  // 1.4 times what the body can do: the 1.25 refill and the 1.5 s cap carry it for a while, not for ever
  while (out === 'ok' && n < 400) { r.wait(3); x += ms * 1.4 * 3 / 60; out = r.move(x, GROUND, 0.5); n++; }
  assert.equal(out, 'speed');
  assert.ok(n > 5, `refused after ${n} moves`);
  // at its own pace the body goes on from where it was put back
  x = p.body.x;
  for (let i = 0; i < 40; i++) { r.wait(3); x += ms * 3 / 60; assert.equal(r.move(x, GROUND, 0.5), 'ok'); }
});

test('the budget earns each stretch of time once: kept by a move that fails, never counted again', () => {
  const r = rig(), p = r.p, ms = maxSpeed(p.stats, false), rate = ms * 1.25;
  // spend what there is
  p.speedBudget = 0;
  r.wait(40);
  const earned = rate * 40 / 60;
  assert.equal(r.move(0.5 + earned - 0.01, GROUND, 0.5), 'ok');
  // the same tick again: nothing new to earn
  assert.equal(r.move(0.5 + earned + 0.05, GROUND, 0.5), 'speed');
  // a move that fails still banks its stretch: 30 ticks pass, a move too far is refused, then the stretch pays for a move in the same tick
  const x0 = p.body.x;
  r.wait(30);
  assert.equal(r.move(x0 + 50, GROUND, 0.5), 'speed');
  const banked = 0.01 + rate * 30 / 60;
  assert.equal(r.move(x0 + banked - 0.02, GROUND, 0.5), 'ok');
  assert.equal(r.move(x0 + banked + 0.05, GROUND, 0.5), 'speed', 'and only once');
});

test('the 2 blocks of a knock survive the cap', () => {
  const r = rig(), p = r.p, ms = maxSpeed(p.stats, false), cap = ms * 1.875;
  r.wait(600);
  assert.equal(r.move(0.5, GROUND, 0.5), 'ok');
  assert.ok(Math.abs(p.speedBudget - cap) < 1e-9, 'a long rest fills it to the cap');
  hurtPlayer(r.sim, p, 4, -3, 0.5, 'test');
  assert.ok(Math.abs(p.speedBudget - (cap + 2)) < 1e-9);
  r.wait(120);
  assert.equal(r.move(0.5 + cap + 1.9, GROUND, 0.5), 'ok', 'the refill did not clip the knock back to the cap');
});

test('a rise is judged from its base, and the base moves on a lower y, after 60 ticks, in liquid, in flight and after a hurt', () => {
  // from its base: two rises within a second add up
  {
    const r = rig();
    r.wait(3); assert.equal(r.move(0.5, GROUND + 5, 0.5, 0), 'ok');
    r.wait(3); assert.equal(r.move(0.5, GROUND + 10, 0.5, 0), 'ok');
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 0.3, 0.5, 0), 'rise');
    assert.equal(r.p.body.y, GROUND + 10);
  }
  // a lower y takes a new base
  {
    const r = rig(), p = r.p;
    p.body.teleport(0.5, 80, 0.5); sendTp(r.sim, p, false);
    r.wait(3); assert.equal(r.move(0.5, 74, 0.5, 0), 'ok');
    r.wait(3); assert.equal(r.move(0.5, 74 + LIMIT - 0.2, 0.5, 0), 'ok');
    r.wait(3); assert.equal(r.move(0.5, 74 + LIMIT + 0.3, 0.5, 0), 'rise', 'judged from 74, though it is only ' + (LIMIT + 0.3 - 6) + ' above 80');
  }
  // after 60 ticks the next accepted move is a new base
  {
    const r = rig();
    r.wait(3); assert.equal(r.move(0.5, GROUND + 6, 0.5, 0), 'ok');
    r.wait(58); assert.equal(r.move(0.5, GROUND + LIMIT + 1, 0.5, 0), 'ok');
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 1 + LIMIT - 0.2, 0.5, 0), 'ok', 'measured from the new base');
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 1 + LIMIT + 0.3, 0.5, 0), 'rise');
  }
  // in liquid: a water column
  {
    const r = rig();
    for (let y = 64; y < 90; y++) r.store.setBlock(0, y, 0, B.water);
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 2, 0.5, 0), 'ok');
  }
  // in flight, only when flight is allowed
  {
    const r = rig();
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 2, 0.5, MV_FLY), 'rise', 'a flying flag from a player who may not fly counts for nothing');
    r.p.modes.fly = true;
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 2, 0.5, MV_FLY), 'ok');
    assert.equal(r.p.body.flying, true);
  }
  // after a hurt
  {
    const r = rig(), p = r.p;
    r.wait(20);
    hurtPlayer(r.sim, p, 4, -3, 0.5, 'test');
    r.wait(3); assert.equal(r.move(0.5, GROUND + LIMIT + 2, 0.5, 0), 'ok');
    // once the second is over, the base taken then holds again
    r.wait(61); assert.equal(r.move(0.5, GROUND + LIMIT + 2.5, 0.5, 0), 'ok');
    r.wait(3); assert.equal(r.move(0.5, GROUND + 2 * LIMIT + 3, 0.5, 0), 'rise');
  }
});

test('an embedded player walks out: through the block it was caught in, within 3 blocks of where it was caught', () => {
  const r = rig(), p = r.p, s = r.store;
  // a wall built through the spot where the body stands
  wall(s, 0, 64, 65, 0, 0);
  r.wait(3);
  assert.equal(r.move(0.6, GROUND, 0.5), 'ok', 'a step inside the block');
  assert.deepEqual(p.embedded, { x: 0.5, y: GROUND, z: 0.5, t: r.sim.tick });
  r.wait(3);
  assert.equal(r.move(0.9, GROUND, 0.5), 'ok', 'still inside');
  assert.ok(p.embedded);
  r.wait(3);
  assert.equal(r.move(1.4, GROUND, 0.5), 'ok', 'out into the open');
  assert.equal(p.embedded, null, 'the first free destination ends it');
  assert.equal(r.tps().length, 0, 'not one correction');
  // a move away inside the block is still bound to the place: more than 3 blocks from it fails
  const r2 = rig();
  wall(r2.store, 0, 64, 65, 0, 0);
  for (let x = 1; x <= 40; x++) r2.store.setBlock(x, 64, 0, B.stone);
  r2.wait(60);
  assert.equal(r2.move(0.5, GROUND + 0.5, 3.8, 0), 'space');
});

test('a correction leaves embedded set: the body has not moved', () => {
  const r = rig(), p = r.p;
  wall(r.store, 0, 64, 65, 0, 0);
  r.wait(3); assert.equal(r.move(0.6, GROUND, 0.5), 'ok');
  const e = p.embedded;
  assert.ok(e);
  r.wait(3);
  assert.equal(r.move(30, GROUND, 0.5), 'speed');
  assert.equal(r.tps().length, 1);
  assert.deepEqual(p.embedded, e);
  // and the walk out goes on from there
  r.wait(3); assert.equal(r.move(1.4, GROUND, 0.5), 'ok');
  assert.equal(p.embedded, null);
});

test('a body still inside a block 3 s after it was caught is moved to a free spot', () => {
  const r = rig(), p = r.p;
  wall(r.store, 0, 64, 65, 0, 0);
  r.wait(3); assert.equal(r.move(0.5, GROUND, 0.5), 'ok');
  assert.ok(p.embedded);
  r.wait(170); tickEmbedded(r.sim, p);
  assert.equal(r.tps().length, 0, 'not yet');
  r.wait(10); tickEmbedded(r.sim, p);
  const t = r.tps();
  assert.equal(t.length, 1);
  assert.ok(bodyFree(r.sim.realms[0], t[0].x, t[0].y, t[0].z), 'sent to room');
  assert.equal(p.embedded, null);
  // once the block is gone by itself the note just ends
  const r2 = rig();
  wall(r2.store, 0, 64, 65, 0, 0);
  r2.wait(3); r2.move(0.5, GROUND, 0.5);
  wall(r2.store, 0, 64, 65, 0, 0, 0);
  r2.wait(200); tickEmbedded(r2.sim, r2.p);
  assert.equal(r2.tps().length, 0); assert.equal(r2.p.embedded, null);
});

test('a fall broken by a jump in the air costs only what comes after the jump, when the body has one to make', () => {
  const fall = (extra: boolean, jumps: number): number => {
    const r = rig(), p = r.p;
    if (extra) { p.inv.acc[0] = { k: 'cloud_bottle', n: 1 }; p.stats.recompute(p.inv); }
    assert.equal(p.stats.d.extraJump, extra ? 1 : 0);
    p.body.teleport(0.5, 90, 0.5); sendTp(r.sim, p, false);
    for (const y of [89, 86, 81, 75, 72]) { r.wait(3); assert.equal(r.move(0.5, y, 0.5, 0), 'ok'); }
    for (let i = 0; i < jumps; i++) { r.wait(3); assert.equal(r.move(0.5, 72.4 - i * 2, 0.5, MV_JUMPED), 'ok'); }
    for (const y of [70, 67, 64.5]) { r.wait(3); r.move(0.5, y, 0.5, 0); }
    r.wait(3); r.move(0.5, GROUND, 0.5);
    const h = r.hurts();
    return h.length ? h[0].dmg : 0;
  };
  const soft = fall(true, 1), hard = fall(false, 1), twice = fall(true, 2);
  assert.ok(Math.abs(soft - (72.4 - 64 - 3) * 5.5) < 1, `with a second jump: ${soft}`);
  assert.ok(hard > 100, `without one the whole fall counts: ${hard}`);
  assert.ok(Math.abs(twice - soft) < 1, 'one extra jump resets the fall once, however many the client claims');
});

test('liveness: every message counts, a silent player stalls after STALL_AFTER ticks and the next move ends it; local players never stall', () => {
  const r = rig(), p = r.p;
  r.wait(STALL_AFTER - 1);
  assert.equal(checkStall(r.sim, p), false);
  r.wait(1);
  assert.equal(checkStall(r.sim, p), true);
  assert.ok(!r.sim.realms[0].targets().includes(p), 'a stalled player is no target');
  // a move under an old teleport id is dropped, and still says the client is there
  assert.equal(r.move(0.5, GROUND, 0.5, MV_GROUND, (p.tp + 7) & 255), 'dropped');
  assert.equal(p.stalled, false); assert.equal(p.lastMoveTick, r.sim.tick);
  assert.equal(checkStall(r.sim, p), false);
  // loading, dead or arriving: dropped
  p.loading = true; assert.equal(r.move(0.5, GROUND, 0.5), 'dropped'); p.loading = false;
  p.arriving = 0; assert.equal(r.move(0.5, GROUND, 0.5), 'dropped'); p.arriving = -1;
  p.stats.dead = true; assert.equal(r.move(0.5, GROUND, 0.5), 'dropped'); p.stats.dead = false;
  // a message that is not a move at all
  assert.equal(handleMove(r.sim, p, new ArrayBuffer(12)), 'dropped');
  const l = rig(true);
  l.wait(10 * STALL_AFTER);
  assert.equal(checkStall(l.sim, l.p), false);
});

test('building under your own feet: a pillar jump of 6 blocks is believed move after move', () => {
  const r = rig(), p = r.p;
  let base = GROUND;
  for (let n = 0; n < 6; n++) {
    // the jump; once the body has cleared the cell the client places into it, and the move in front of that edit says so
    for (const [dy, f] of [[0.55, MV_JUMPED], [1.0, 0], [1.2, 0]] as const) { r.wait(3); assert.equal(r.move(0.5, base + dy, 0.5, f), 'ok'); }
    r.store.setBlock(0, base, 0, B.stone);
    for (const dy of [1.15, 1.02]) { r.wait(3); assert.equal(r.move(0.5, base + dy, 0.5, 0), 'ok'); }
    base++;
    r.wait(3); assert.equal(r.move(0.5, base, 0.5), 'ok');
    assert.equal(p.grounded, true);
  }
  assert.equal(p.body.y, GROUND + 6);
  assert.equal(r.tps().length, 0); assert.equal(r.hurts().length, 0);
});

test('numbers out of range are corrected', () => {
  const r = rig();
  r.wait(3); assert.equal(r.move(0.5, NaN, 0.5), 'bad');
  r.wait(3); assert.equal(r.move(0.5, 401, 0.5), 'bad');
  r.wait(3); assert.equal(r.move(500001, GROUND, 0.5), 'bad');
  assert.equal(r.tps().length, 3);
  assert.equal(r.p.body.x, 0.5);
});

test('a move into a chunk the host does not hold is believed unchecked', () => {
  const r = rig(), p = r.p;
  p.body.teleport(999.5, GROUND, 0.5); sendTp(r.sim, p, false);
  wall(r.store, 1000, 60, 70, -2, 2);
  r.wait(30);
  assert.equal(r.move(1001.2, 60, 0.5, 0), 'ok', 'the room there is unknown');
});

test('the position check before activation puts a body without room into the nearest free spot', () => {
  const r = rig(), p = r.p;
  assert.equal(checkPosition(r.sim, p), false, 'room already');
  wall(r.store, 0, 64, 65, 0, 0);
  assert.equal(checkPosition(r.sim, p), true);
  assert.ok(bodyFree(r.sim.realms[0], p.body.x, p.body.y, p.body.z));
  assert.ok(Math.hypot(p.body.x - 0.5, p.body.z - 0.5) <= 1.5, 'beside where it was');
});
