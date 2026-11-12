// The client's block store against the rules of 4.7: readiness in either order, nonces, the one write path,
// live changes and their gaps, predictions and their answers, the generation check and the two timers.
import assert from 'node:assert/strict';
import test from 'node:test';
import { CVOL, ci } from '../../src/core/constants';
import { B } from '../../src/data/blocks';
import { ClientVoxels, VoxChunk } from '../../src/net/clientvoxels';
import { encodeEdits } from '../../src/net/codec';
import { FULL_RETRY_MS, RESUB_MS, SUB_MAX, type C2S, type C2SOf, type CeEntry, type S2C, type S2COf } from '../../src/net/protocol';
import { hashBlocks } from '../../src/sim/genjob';

type Chunks = C2SOf<'chunks'>;

/** Stone below y = 10, air above: no emitter anywhere. */
function terrain(): Uint8Array { const a = new Uint8Array(CVOL); for (let i = 0; i < CVOL; i++) if ((i & 255) < 10) a[i] = B.stone; return a; }

function setup() {
  const cv = new ClientVoxels((cx, cz, key) => new VoxChunk(cx, cz, key)), sent: Chunks[] = [], changes: number[][] = [], ready: string[] = [], regen: string[] = [];
  cv.sendTo((m) => sent.push(m as Chunks));
  cv.onCellChange = (_c, x, y, z, old, id) => changes.push([x, y, z, old, id]);
  cv.onReady = (c) => ready.push(`${c.cx},${c.cz}`);
  cv.onRegen = (c) => regen.push(`${c.cx},${c.cz}`);
  let now = 1000;
  const flush = (): Chunks | null => { now += 200; return cv.flush(now) ? sent[sent.length - 1] : null; };
  const gen = (c: VoxChunk, a = terrain()): boolean => cv.generated(c, a, new Uint8Array(256), false, hashBlocks(a));
  const ce = (...l: CeEntry[]): void => cv.onCe({ t: 'ce', dim: 0, l });
  const b = (...l: number[]): void => cv.onB({ t: 'b', dim: 0, l });
  return { cv, sent, changes, ready, regen, flush, gen, ce, b, at: () => now, advance: (ms: number) => { now += ms; } };
}
const sparse = (cells: [number, number][]): { enc: 0 | 1; data: string } => encodeEdits({ cells: new Map(cells), full: null });

test('generation first, then the edit set: ready only when both are in, with the edits applied', () => {
  const { cv, gen, ce, ready, changes } = setup();
  const c = cv.create(2, 3);
  gen(c);
  assert.equal(c.state, 1); assert.equal(cv.ready(32, 48), false); assert.equal(cv.topY(32, 48), -1);
  const e = sparse([[ci(1, 12, 2), B.dirt], [ci(0, 5, 0), 0]]);
  ce([2, 3, c.subN, 2, 0, e.enc, e.data]);
  assert.equal(c.state, 2); assert.equal(c.editRev, 2); assert.deepEqual(ready, ['2,3']);
  assert.equal(cv.getBlock(33, 12, 50), B.dirt); assert.equal(cv.getBlock(32, 5, 48), 0); assert.equal(cv.topY(33, 50), 12);
  assert.deepEqual(changes, [[33, 12, 50, 0, B.dirt], [32, 5, 48, B.stone, 0]]);
});

test('the edit set first, then generation (section 9): live changes wait in arrival order and apply after the set', () => {
  const { cv, gen, ce, b, ready } = setup();
  const c = cv.create(-1, 0);
  const e = sparse([[ci(4, 20, 4), B.dirt]]);
  ce([-1, 0, c.subN, 5, 0, e.enc, e.data]);
  b(-12, 20, 4, B.stone, 5);   // already inside the set
  b(-12, 21, 4, B.dirt, 6);
  b(-12, 21, 4, 0, 7);
  b(-12, 22, 4, B.dirt, 8);
  assert.equal(c.state, 0); assert.equal(cv.getBlock(-12, 20, 4), 0); assert.deepEqual(ready, []);
  gen(c);
  assert.equal(c.state, 2); assert.deepEqual(ready, ['-1,0']); assert.equal(c.editRev, 8);
  assert.equal(cv.getBlock(-12, 20, 4), B.dirt);
  assert.equal(cv.getBlock(-12, 21, 4), 0);
  assert.equal(cv.getBlock(-12, 22, 4), B.dirt);
  // a second generation result for a record that has its generation changes nothing
  assert.equal(gen(c), false); assert.equal(cv.getBlock(-12, 22, 4), B.dirt);
});

test('a rev 0 entry readies the chunk with nothing to apply; changes for chunks with no record are ignored', () => {
  const { cv, gen, ce, b, changes } = setup();
  const c = cv.create(0, 0);
  gen(c); ce([0, 0, c.subN, 0, 0]);
  assert.equal(c.state, 2); assert.equal(c.editRev, 0); assert.deepEqual(changes, []);
  b(100, 20, 100, B.dirt, 1);
  ce([6, 6, 1, 3, 0]);
  assert.deepEqual(changes, []);
  b(1, 20, 1, B.dirt, 1);
  assert.equal(cv.getBlock(1, 20, 1), B.dirt); assert.equal(c.editRev, 1);
  b(1, 20, 1, 0, 1);   // rev <= editRev: ignored
  assert.equal(cv.getBlock(1, 20, 1), B.dirt);
});

test('an edit set answering an earlier subscription of the same chunk is dropped', () => {
  const { cv, gen, ce, flush } = setup();
  let c = cv.create(1, 1);
  const n1 = c.subN;
  flush();
  cv.drop(c);
  c = cv.create(1, 1);
  const n2 = c.subN;
  assert.notEqual(n1, n2);
  gen(c);
  const e = sparse([[ci(0, 30, 0), B.dirt]]);
  ce([1, 1, n1, 4, 0, e.enc, e.data]);
  assert.equal(c.state, 1); assert.equal(cv.getBlock(16, 30, 16), 0);
  ce([1, 1, n2, 0, 0]);
  assert.equal(c.state, 2); assert.equal(cv.getBlock(16, 30, 16), 0);
});

test('unsub then sub of one chunk go out in one message; a sub dropped before it went out is not sent', () => {
  const { cv, flush } = setup();
  const a = cv.create(3, 4);
  const m1 = flush()!;
  assert.deepEqual(m1, { t: 'chunks', dim: 0, sub: [3, 4, a.subN], unsub: [] });
  cv.drop(a);
  const a2 = cv.create(3, 4);
  const q = cv.create(9, 9);
  cv.drop(q);
  const m2 = flush()!;
  assert.deepEqual(m2.unsub, [3, 4, 9, 9]);
  assert.deepEqual(m2.sub, [3, 4, a2.subN]);
  assert.equal(m2.full, undefined);
  assert.equal(flush(), null);   // nothing queued, nothing sent
});

test('chunks messages: at most one per 100 ms, at most SUB_MAX subs each, the rest in the next', () => {
  const { cv, sent, at, advance } = setup();
  for (let i = 0; i < SUB_MAX + 10; i++) cv.create(i % 64, Math.floor(i / 64));
  assert.equal(cv.flush(at()), true);
  assert.equal(sent[0].sub.length, SUB_MAX * 3);
  cv.create(-5, -5);
  assert.equal(cv.flush(at() + 99), false);
  advance(100);
  assert.equal(cv.flush(at()), true);
  assert.equal(sent[1].sub.length, 11 * 3);
  // nonces are u16 and every subscription has its own
  const ns = new Set<number>(); for (let o = 2; o < sent[0].sub.length; o += 3) ns.add(sent[0].sub[o]);
  assert.equal(ns.size, SUB_MAX);
});

test('a live change with a gap resyncs the chunk: new nonce, not ready, generated again, subscribed with no unsub', () => {
  const { cv, gen, ce, b, flush, regen } = setup();
  const c = cv.create(5, 5);
  flush(); gen(c); ce([5, 5, c.subN, 3, 0]);
  const n = c.subN;
  b(80, 20, 80, B.dirt, 5);
  assert.equal(cv.resyncs, 1); assert.deepEqual(regen, ['5,5']);
  assert.equal(c.state, 0); assert.equal(c.blocks, null); assert.notEqual(c.subN, n);
  assert.equal(cv.ready(80, 80), false); assert.equal(cv.getBlock(80, 5, 80), 0);
  const m = flush()!;
  assert.deepEqual(m.sub, [5, 5, c.subN]); assert.deepEqual(m.unsub, []);
  gen(c);
  const e = sparse([[ci(0, 20, 0), B.dirt]]);
  ce([5, 5, c.subN, 5, 0, e.enc, e.data]);
  assert.equal(c.state, 2); assert.equal(c.editRev, 5); assert.equal(cv.getBlock(80, 20, 80), B.dirt);
});

test('a gap among the changes queued before readiness resyncs instead of readying', () => {
  const { cv, gen, ce, b, ready } = setup();
  const c = cv.create(0, 2);
  gen(c);
  b(1, 20, 33, B.dirt, 3);
  b(1, 21, 33, B.dirt, 5);
  ce([0, 2, c.subN, 2, 0]);
  assert.equal(cv.resyncs, 1); assert.deepEqual(ready, []); assert.equal(c.state, 0);
});

test('a torch in an edit set, in a full array and in a live change each set hasEmit', () => {
  {
    const { cv, gen, ce } = setup();
    const c = cv.create(0, 0);
    gen(c); assert.equal(c.hasEmit, false);
    const e = sparse([[ci(3, 12, 3), B.torch]]);
    ce([0, 0, c.subN, 1, 0, e.enc, e.data]);
    assert.equal(c.hasEmit, true);
  }
  {
    const { cv, gen, ce } = setup();
    const c = cv.create(0, 0), a = terrain();
    a[ci(8, 11, 8)] = B.torch;
    const e = encodeEdits({ cells: null, full: a });
    gen(c);
    ce([0, 0, c.subN, 20000, 0, e.enc, e.data]);
    assert.equal(c.hasEmit, true); assert.equal(cv.getBlock(8, 11, 8), B.torch); assert.equal(c.editRev, 20000);
    // a full array without one clears it: the flag is found again by scanning
    const plain = encodeEdits({ cells: null, full: terrain() });
    ce([0, 0, c.subN, 20001, 0, plain.enc, plain.data]);
    assert.equal(c.hasEmit, false); assert.equal(cv.getBlock(8, 11, 8), 0);
  }
  {
    const { cv, gen, ce, b, changes } = setup();
    const c = cv.create(0, 0);
    gen(c); ce([0, 0, c.subN, 0, 0]);
    b(4, 10, 4, B.torch, 1);
    assert.equal(c.hasEmit, true); assert.deepEqual(changes, [[4, 10, 4, 0, B.torch]]);
  }
});

test('a prediction is written at once and cleared by the b of the accepted change', () => {
  const { cv, gen, ce, b, changes } = setup();
  const c = cv.create(0, 0);
  gen(c); ce([0, 0, c.subN, 0, 0]);
  assert.equal(cv.predict(1, 2, 9, 2, 0), true);
  assert.equal(cv.getBlock(2, 9, 2), 0); assert.equal(cv.predicted(), 1); assert.equal(c.editRev, 0);
  assert.deepEqual(changes, [[2, 9, 2, B.stone, 0]]);
  b(2, 9, 2, 0, 1);
  assert.equal(cv.predicted(), 0); assert.equal(c.editRev, 1);
  assert.equal(changes.length, 1);   // the same id again changes nothing
  // nothing is predicted where the chunk is not ready or y is out of range
  assert.equal(cv.predict(2, 40, 9, 2, 0), false);
  assert.equal(cv.predict(3, 2, 0, 2, B.dirt), false);
  assert.equal(cv.predict(3, 2, 251, 2, B.dirt), false);
});

test('rej with cells writes the truth and drops the predictions of that seq', () => {
  const { cv, gen, ce } = setup();
  const c = cv.create(0, 0);
  gen(c); ce([0, 0, c.subN, 0, 0]);
  cv.predict(7, 3, 12, 3, B.dirt); cv.predict(7, 3, 13, 3, B.dirt); cv.predict(8, 5, 12, 5, B.dirt);
  cv.reject(7, [3, 12, 3, 0, 3, 13, 3, 0]);
  assert.equal(cv.getBlock(3, 12, 3), 0); assert.equal(cv.getBlock(3, 13, 3), 0); assert.equal(cv.getBlock(5, 12, 5), B.dirt);
  assert.equal(cv.predicted(), 1); assert.equal(cv.resyncs, 0); assert.equal(c.state, 2);
});

test('rej with no cells resyncs every chunk holding a prediction of that seq, and only those', () => {
  const { cv, gen, ce, flush } = setup();
  const a = cv.create(0, 0), b2 = cv.create(1, 0), d = cv.create(2, 0);
  flush();
  for (const c of [a, b2, d]) { gen(c); ce([c.cx, 0, c.subN, 0, 0]); }
  cv.predict(4, 15, 12, 0, B.dirt); cv.predict(4, 16, 12, 0, B.dirt); cv.predict(5, 40, 12, 0, B.dirt);
  cv.reject(4, []);
  assert.equal(a.state, 0); assert.equal(b2.state, 0); assert.equal(d.state, 2);
  assert.equal(cv.resyncs, 2); assert.equal(cv.predicted(), 1);
  const m = flush()!;
  assert.deepEqual(m.sub, [0, 0, a.subN, 1, 0, b2.subN]); assert.deepEqual(m.unsub, []);
  // an answer for a seq that predicted nothing does nothing
  cv.reject(99, []);
  assert.equal(cv.resyncs, 2);
});

test('a generation hash that differs from the host asks for the full array, which then replaces the blocks', () => {
  const { cv, gen, ce, flush, advance, at } = setup();
  cv.cfg = { simRadius: 5, viewMax: 12 };
  const c = cv.create(0, 0), far = cv.create(20, 0);
  flush();
  gen(c); gen(far);
  const mine = c.genHash;
  ce([0, 0, c.subN, 0, mine], [20, 0, far.subN, 0, (mine ^ 1) >>> 0]);
  assert.equal(c.state, 2); assert.equal(far.state, 2);
  const m = flush()!;
  assert.deepEqual(m.full, [20, 0]); assert.deepEqual(m.sub, []);
  // repeated every FULL_RETRY_MS, but only within simRadius + 1 of the player
  cv.tick(at() + FULL_RETRY_MS - 300, 0, 0);
  assert.equal(flush(), null);
  advance(FULL_RETRY_MS);
  cv.tick(at(), 0, 0);
  assert.equal(flush(), null);
  cv.tick(at(), 20 * 16, 0);
  assert.deepEqual(flush()!.full, [20, 0]);
  // a gh message for it asks again at once
  cv.onGh({ t: 'gh', dim: 0, l: [20, 0, (mine ^ 1) >>> 0] });
  assert.deepEqual(flush()!.full, [20, 0]);
  // the answer: a full array under the current nonce for a ready chunk
  const a = terrain(); a[ci(1, 50, 1)] = B.dirt;
  const e = encodeEdits({ cells: null, full: a });
  let replaced = 0; cv.onReplace = () => replaced++;
  ce([20, 0, far.subN, 9, 0, e.enc, e.data]);
  assert.equal(replaced, 1); assert.equal(cv.getBlock(321, 50, 1), B.dirt); assert.equal(far.editRev, 9);
  advance(FULL_RETRY_MS); cv.tick(at(), 20 * 16, 0);
  assert.equal(flush(), null);
});

test('a gh that arrives before generation is checked when generation comes in', () => {
  const { cv, gen, flush } = setup();
  const c = cv.create(0, 0);
  flush();
  cv.onGh({ t: 'gh', dim: 0, l: [0, 0, 12345] });
  assert.equal(flush(), null);
  gen(c);
  assert.deepEqual(flush()!.full, [0, 0]);
});

test('a subscription unanswered for RESUB_MS is made again with a new nonce; generation is kept', () => {
  const { cv, gen, ce, flush, at } = setup();
  const c = cv.create(0, 0), d = cv.create(1, 0);
  flush();
  gen(c); gen(d);
  const sentAt = at(), n = c.subN, blocks = c.blocks;
  ce([1, 0, d.subN, 0, 0]);
  cv.tick(sentAt + RESUB_MS - 1, 0, 0);
  assert.equal(c.subN, n);
  cv.tick(sentAt + RESUB_MS, 0, 0);
  assert.notEqual(c.subN, n); assert.equal(c.blocks, blocks); assert.equal(c.state, 1);
  assert.equal(d.state, 2);
  const m = flush()!;
  assert.deepEqual(m.sub, [0, 0, c.subN]); assert.deepEqual(m.unsub, []);
  ce([0, 0, n, 0, 0]);
  assert.equal(c.state, 1);
  ce([0, 0, c.subN, 0, 0]);
  assert.equal(c.state, 2);
});

test('welcome over a session: config taken, every record and queue cleared, nothing sent; other realms ignored', () => {
  const cv = new ClientVoxels((cx, cz, key) => new VoxChunk(cx, cz, key)), handlers = new Map<string, ((m: never) => void)[]>(), out: C2S[] = [];
  cv.attach({
    on<T extends S2C['t']>(t: T, fn: (m: S2COf<T>) => void) { const l = handlers.get(t) ?? []; l.push(fn as (m: never) => void); handlers.set(t, l); },
    send(m: C2S) { out.push(m); },
  });
  const deliver = (m: S2C): void => { for (const fn of handlers.get(m.t) ?? []) fn(m as never); };
  const dropped: VoxChunk[] = []; cv.onDrop = (c) => dropped.push(c);
  const c = cv.create(0, 0);
  const a = terrain(); cv.generated(c, a, new Uint8Array(256), false, hashBlocks(a));
  deliver({ t: 'ce', dim: 1, l: [[0, 0, c.subN, 0, 0]] });
  assert.equal(c.state, 1);
  deliver({ t: 'ce', dim: 0, l: [[0, 0, c.subN, 0, 0]] });
  assert.equal(c.state, 2);
  cv.create(1, 1);
  deliver({ t: 'welcome', proto: 1, boot: 1, you: { slot: 1, id: 'a' }, world: { name: 'w', seed: 1, seedText: '1' }, dim: 2, pos: [0, 64, 0, 0, 0], tp: 0, tick: 0, clock: 0,
    flags: [], quest: 0, event: { a: null, k: 0, g: 0 }, spawn: [0, 0], cfg: { cheats: true, simRadius: 4, viewMax: 10, maxPlayers: 8 }, players: [] });
  assert.equal(cv.chunks.size, 0); assert.equal(dropped.length, 2); assert.equal(cv.dim, 2);
  assert.deepEqual(cv.cfg, { simRadius: 4, viewMax: 10 });
  assert.equal(cv.flush(1e6), false); assert.deepEqual(out, []);
});
