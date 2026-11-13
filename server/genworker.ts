// One generating thread of NodePoolSource. Built as its own entry (genworker.mjs) beside the bundle that holds the
// pool, because a worker thread starts from a file, not from a function.
import { parentPort, workerData } from 'node:worker_threads';
import { CVOL } from '../src/core/constants';
import { T_EMITS } from '../src/data/blocks';
import { genChunk } from '../src/sim/genjob';

export interface GenJobMsg { id: number; dim: number; cx: number; cz: number }
export type GenReplyMsg =
  | { t: 'ready' }
  | { t: 'gen'; id: number; blocks: Uint8Array; biomes: Uint8Array; ents: unknown[]; hash: number; emit: Uint16Array }
  | { t: 'err'; id: number; msg: string };
export interface GenWorkerData { seed: number; faults: Int32Array | null }

const port = parentPort;
if (!port) throw new Error('genworker runs only as a worker thread');
const { seed, faults } = workerData as GenWorkerData;

/** Takes one from cell `i` of the shared fault counters when it is above 0. */
function fault(i: number): boolean {
  if (!faults) return false;
  for (let n = Atomics.load(faults, i); n > 0; n = Atomics.load(faults, i)) if (Atomics.compareExchange(faults, i, n, n - 1) === n) return true;
  return false;
}

port.on('message', (m: GenJobMsg) => {
  if (fault(1)) throw new Error('fault injected: worker dies');
  try {
    if (fault(0)) throw new Error('fault injected: job fails');
    const g = genChunk(seed, m.dim, m.cx, m.cz), b = g.blocks, l: number[] = [];
    if (g.hasEmit) for (let i = 0; i < CVOL; i++) if (T_EMITS[b[i]]) l.push(i);
    const emit = Uint16Array.from(l);
    const r: GenReplyMsg = { t: 'gen', id: m.id, blocks: b, biomes: g.biomes, ents: g.ents, hash: g.hash, emit };
    port.postMessage(r, [b.buffer, g.biomes.buffer, emit.buffer] as ArrayBuffer[]);
  } catch (e) {
    const r: GenReplyMsg = { t: 'err', id: m.id, msg: e instanceof Error ? e.message : String(e) };
    port.postMessage(r);
  }
});
port.postMessage({ t: 'ready' } satisfies GenReplyMsg);
