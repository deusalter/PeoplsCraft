// NodePoolSource: the same terrain as genChunk in this thread, a worker that dies is replaced and its job answered,
// a job that fails is asked for again and then given up, and the pool stops without leaving a thread behind.
// The worker entry is built here from source, as the server build emits it beside main.mjs.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { CVOL } from '../../src/core/constants';
import { T_EMITS } from '../../src/data/blocks';
import type { GenResult } from '../../src/sim/chunksource';
import { genChunk } from '../../src/sim/genjob';
import { NodePoolSource, poolSize } from '../../server/nodepool';

const SEED = 1234567;
const here = dirname(fileURLToPath(import.meta.url));
const logs: string[] = [];
const log = (level: string, msg: string): void => { logs.push(`${level}: ${msg}`); };
const pools: NodePoolSource[] = [];
const pool = (o: ConstructorParameters<typeof NodePoolSource>[1] = {}): NodePoolSource => { const p = new NodePoolSource(SEED, { log, ...o }); pools.push(p); return p; };

before(async () => {
  // out/run, where scripts/run.mjs put this test's own bundle; the root is two levels up
  const root = resolve(here, '..', '..');
  await build({
    logLevel: 'warn', configFile: false, root,
    build: {
      ssr: resolve(root, 'server/genworker.ts'), outDir: here, emptyOutDir: false, minify: false, target: 'node22',
      rollupOptions: { output: { format: 'es', entryFileNames: 'genworker.mjs' } },
    },
  });
});
after(async () => { for (const p of pools) await p.close(); });

/** Polls until `n` results have arrived or `ms` have passed. */
async function collect(p: NodePoolSource, n: number, ms = 30000): Promise<GenResult[]> {
  const out: GenResult[] = [], end = Date.now() + ms;
  while (out.length < n && Date.now() < end) {
    out.push(...p.poll(Infinity));
    if (out.length < n) await new Promise((r) => setTimeout(r, 2));
  }
  return out;
}

test('pool size is min(4, cores - 2), at least 1', () => {
  assert.equal(poolSize(1), 1); assert.equal(poolSize(3), 1); assert.equal(poolSize(5), 3); assert.equal(poolSize(6), 4); assert.equal(poolSize(64), 4);
});

test('same blocks, biomes, entities, hash and emitters as genChunk inline, 64 chunks in each realm', async () => {
  const p = pool();
  const want = new Map<string, ReturnType<typeof genChunk>>();
  let k = 0;
  for (let dim = 0; dim < 3; dim++) for (let i = 0; i < 64; i++) {
    const cx = ((i * 37) % 23) - 11 + (i >> 3) * 40, cz = ((i * 53) % 19) - 9 - (i & 7) * 25;
    want.set(`${dim},${cx},${cz}`, genChunk(SEED, dim, cx, cz));
    p.request(dim, cx, cz, k++);
  }
  assert.equal(p.pending, 192);
  const got = await collect(p, 192);
  assert.equal(got.length, 192);
  assert.equal(p.pending, 0);
  for (const g of got) {
    const w = want.get(`${g.dim},${g.cx},${g.cz}`);
    assert.ok(w, `unexpected chunk ${g.dim},${g.cx},${g.cz}`);
    want.delete(`${g.dim},${g.cx},${g.cz}`);
    assert.equal(g.hash, w.hash);
    assert.ok(Buffer.from(g.blocks).equals(Buffer.from(w.blocks)), `blocks of ${g.dim},${g.cx},${g.cz}`);
    assert.ok(Buffer.from(g.biomes).equals(Buffer.from(w.biomes)), `biomes of ${g.dim},${g.cx},${g.cz}`);
    assert.deepEqual(g.ents, w.ents);
    const emit: number[] = [];
    for (let i = 0; i < CVOL; i++) if (T_EMITS[w.blocks[i]]) emit.push(i);
    assert.deepEqual(Array.from(g.emit ?? []), emit);
  }
  assert.equal(want.size, 0);
});

test('lower prio first, a pending request is not doubled, a cancelled job gives nothing', async () => {
  const p = pool({ workers: 1 });
  p.request(0, 5, 5, 9);
  await collect(p, 1);              // the worker is up and idle
  for (let i = 0; i < 6; i++) p.request(0, i, 0, 10 - i);
  p.request(0, 3, 0, -100);         // already pending: changes nothing
  p.cancel(0, 1, 0);
  assert.equal(p.pending, 5);
  const got = await collect(p, 5);
  // the first went to the worker at once; the rest in order of prio
  assert.deepEqual(got.map((g) => g.cx), [0, 5, 4, 3, 2]);
  assert.equal(p.pending, 0);
});

test('a worker that dies is replaced and its request answered', async () => {
  const faults = new Int32Array(new SharedArrayBuffer(8));
  const p = pool({ workers: 2, faults });
  p.request(1, 0, 0, 0);
  await collect(p, 1);
  Atomics.store(faults, 1, 1);
  const before = logs.length;
  p.request(1, 7, -3, 0);
  const [g] = await collect(p, 1);
  assert.ok(g, 'answered');
  assert.deepEqual([g.dim, g.cx, g.cz, g.hash], [1, 7, -3, genChunk(SEED, 1, 7, -3).hash]);
  assert.equal(Atomics.load(faults, 1), 0);
  assert.ok(logs.slice(before).some((l) => l.includes('fault injected: worker dies')), 'the death is logged');
  // wait for the replacement to come up, then it works like the others
  for (let i = 0; i < 4; i++) p.request(2, i, i, 0);
  assert.equal((await collect(p, 4)).length, 4);
  assert.equal(p.alive, 2);
});

test('a job that keeps failing is asked for twice more, then logged and left', async () => {
  const faults = new Int32Array(new SharedArrayBuffer(8));
  const p = pool({ workers: 1, faults });
  Atomics.store(faults, 0, 2);
  p.request(0, 1, 1, 0);
  const [g] = await collect(p, 1);
  assert.ok(g && g.cx === 1 && g.cz === 1, 'third try answers');
  Atomics.store(faults, 0, 3);
  const before = logs.length;
  p.request(0, 2, 2, 0);
  const end = Date.now() + 10000;
  while (p.pending && Date.now() < end) { assert.equal(p.poll(Infinity).length, 0); await new Promise((r) => setTimeout(r, 2)); }
  assert.equal(p.pending, 0);
  assert.equal(Atomics.load(faults, 0), 0);
  assert.ok(logs.slice(before).some((l) => l.startsWith('warn: chunk 2,2 of dimension 0 could not be generated')));
  assert.equal(p.alive, 1);
});

test('the seed may be given as a function, read at the first request', async () => {
  let asked = 0;
  const p = new NodePoolSource(() => { asked++; return SEED + 1; }, { workers: 1, log });
  pools.push(p);
  assert.equal(asked, 0);
  p.request(0, 3, 4, 0); p.request(0, 4, 4, 0);
  const got = await collect(p, 2);
  assert.equal(asked, 1);
  assert.equal(got[0].hash, genChunk(SEED + 1, 0, 3, 4).hash);
});

test('the pool shuts down cleanly', async () => {
  const p = pool({ workers: 3 });
  for (let i = 0; i < 30; i++) p.request(0, i, -i, i);
  await collect(p, 2);
  assert.equal(p.alive, 3);
  await p.close();
  assert.equal(p.alive, 0);
  assert.equal(p.pending, 0);
  p.request(0, 99, 99, 0);
  assert.equal(p.pending, 0);
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(p.poll(Infinity), []);
  await p.close();
});

test('a missing worker entry is reported at construction', () => {
  assert.throws(() => new NodePoolSource(1, { entry: new URL('./no-such-worker.mjs', import.meta.url) }), /chunk worker entry not found/);
});
