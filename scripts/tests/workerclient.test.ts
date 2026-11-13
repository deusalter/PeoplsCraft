// The page's end of the worker transport against a real SimHost on a manual clock, with the worker's
// postMessage played by microtasks: what the page awaits settles even when the host closes the connection.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CVOL } from '../../src/core/constants';
import { B } from '../../src/data/blocks';
import { SimHost } from '../../src/net/host';
import type { S2C } from '../../src/net/protocol';
import type { Conn } from '../../src/net/transport';
import { WorkerTransport } from '../../src/net/worker-client';
import type { ChunkSource, GenResult } from '../../src/sim/chunksource';
import { hashBlocks } from '../../src/sim/genjob';
import { MemStorage } from '../../src/sim/storage';

class FlatSource implements ChunkSource {
  jobs: [number, number, number][] = [];
  get pending(): number { return this.jobs.length; }
  request(dim: number, cx: number, cz: number): void { this.jobs.push([dim, cx, cz]); }
  cancel(): void {}
  poll(max: number): GenResult[] {
    return this.jobs.splice(0, max).map(([dim, cx, cz]) => {
      const blocks = new Uint8Array(CVOL);
      for (let col = 0; col < 256; col++) for (let y = 0; y < 64; y++) blocks[(col << 8) | y] = y === 0 ? B.bedrock : B.stone;
      return { dim, cx, cz, blocks, biomes: new Uint8Array(256), ents: [], hash: hashBlocks(blocks) };
    });
  }
  dispose(): void { this.jobs = []; }
}

/** A worker in name: the host runs here, and every message in either direction waits a microtask, cloned. */
async function rig(): Promise<{ t: WorkerTransport; got: S2C[]; closed: string[] }> {
  const host = new SimHost({ now: () => performance.now(), setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as NodeJS.Timeout), log: () => {} },
    new MemStorage(), new FlatSource(), { id: 'w', name: 'Test', seed: 7, seedText: '7', cheats: true, password: null, maxPlayers: 1, viewMax: 8, clock: 'manual', saveEvery: 0, solo: true });
  await host.start();
  const w = {
    onmessage: null as ((e: { data: unknown }) => void) | null, onerror: null,
    postMessage(m: unknown): void {
      const c = structuredClone(m) as { ctl?: string };
      queueMicrotask(() => {
        if (c && c.ctl === 'init') { host.connect(conn); deliver({ ctl: 'started', seed: host.sim.seed }); } else conn.onMessage?.(c as never);
      });
    },
    terminate(): void {},
  };
  const deliver = (m: unknown): void => { const c = structuredClone(m); queueMicrotask(() => w.onmessage?.({ data: c })); };
  const conn: Conn = {
    id: 1, local: true, addr: 'worker', buffered: 0, onMessage: null, onBinary: null, onClose: null,
    send: (m) => deliver(m), sendBin: (b) => deliver(b), close: (code) => deliver({ ctl: 'closed', code }),
  };
  const t = new WorkerTransport(w as unknown as Worker), got: S2C[] = [], closed: string[] = [];
  t.onMessage = (m) => { got.push(m); };
  t.onClose = (code) => { closed.push(code); };
  await t.start({ id: 'w', name: 'Test', seed: 7, seedText: '7', clock: 'manual', viewMax: 8, save: false, dev: false });
  return { t, got, closed };
}
const within = <T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> => Promise.race([p, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms))]);

test('a step settles on `stepped`', async () => {
  const { t, got } = await rig();
  assert.equal(await within(t.step(1), 2000), undefined);
  assert.ok(got.some((m) => m.t === 'stepped'));
});

test('a step in which the host closes the connection settles, and so does one asked for after', async () => {
  const { t, got, closed } = await rig();
  t.send({ t: 'edit', seq: 1, k: 9, x: 0, y: 0, z: 0, id: 0 } as never);
  assert.equal(await within(t.step(1), 2000), undefined, 'the step the host closed in');
  assert.equal(got.find((m) => m.t === 'error')?.t, 'error');
  assert.deepEqual(closed, ['proto']);
  assert.equal(t.state, 'closed');
  assert.equal(await within(t.step(1), 2000), undefined, 'a step after the close');
});
