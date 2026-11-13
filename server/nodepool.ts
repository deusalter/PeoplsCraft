// Terrain for the server's simulation, generated on worker threads so that no step waits for a chunk (6.6).
import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { ChunkSource, GenResult } from '../src/sim/chunksource';
import type { EntInit } from '../src/world/gen/types';
import type { GenJobMsg, GenReplyMsg, GenWorkerData } from './genworker';

export interface NodePoolOptions {
  /** Default `min(4, cores - 2)`, at least 1. */
  workers?: number;
  /** The worker's built entry. Default: `genworker.mjs` in the folder of the file this code was bundled into. */
  entry?: URL;
  log?: (level: 'info' | 'warn' | 'error', msg: string) => void;
  /** Tests: shared counters. While cell 0 is above 0 a job takes one from it and fails inside the worker; while
   *  cell 1 is above 0 a job takes one from it and kills its worker with an uncaught throw. */
  faults?: Int32Array;
}

interface Job { dim: number; cx: number; cz: number; prio: number; n: number; sent: boolean; fails: number }
interface Slot { w: Worker; ready: boolean; job: Job | null; key: string; id: number }

/** Generation time of one dimension, as the workers measured it (6.6, measurement 4). */
export interface GenStat { n: number; ms: number; max: number }

export const poolSize = (cores = availableParallelism()): number => Math.max(1, Math.min(4, cores - 2));

/** Jobs go to the workers lowest `prio` first, oldest first among equals, one per worker at a time, so that a job
 *  still waiting can be cancelled or overtaken. Finished jobs wait for `poll`. A job that fails, or whose worker
 *  dies, is asked for twice more behind the others, then logged and left without terrain (3.5). */
export class NodePoolSource implements ChunkSource {
  readonly size: number;
  /** By dimension: chunks generated, their total and their largest time in milliseconds. */
  readonly stats: GenStat[] = [];
  private jobs = new Map<string, Job>();
  private done: GenResult[] = [];
  private slots: (Slot | null)[] = [];
  private n = 0; private ids = 0;
  private seedOf: () => number;
  private seed: number | null = null;
  private entry: URL;
  private log: NonNullable<NodePoolOptions['log']>;
  private disposed = false;
  private exits: Promise<unknown>[] = [];

  /** `seed`: the world's. A function is read once, at the first request, for a host that learns the seed only when it
   *  has opened its storage; the seed is fixed from then on. */
  constructor(seed: number | (() => number), private opt: NodePoolOptions = {}) {
    this.seedOf = typeof seed === 'number' ? () => seed : seed;
    this.size = Math.max(1, Math.floor(opt.workers ?? poolSize()));
    const here = import.meta.url;
    this.entry = opt.entry ?? new URL('./genworker.mjs', here);
    this.log = opt.log ?? ((level, msg) => console[level](msg));
    if (this.entry.protocol === 'file:' && !existsSync(fileURLToPath(this.entry))) throw new Error(`chunk worker entry not found: ${fileURLToPath(this.entry)}`);
  }

  get pending(): number { return this.jobs.size + this.done.length; }
  /** Workers alive now. */
  get alive(): number { let k = 0; for (const s of this.slots) if (s) k++; return k; }

  request(dim: number, cx: number, cz: number, prio: number): void {
    if (this.disposed) return;
    const k = `${dim},${cx},${cz}`;
    if (this.jobs.has(k)) return;
    this.jobs.set(k, { dim, cx, cz, prio, n: this.n++, sent: false, fails: 0 });
    if (this.seed === null) this.startAll();
    this.feed();
  }
  cancel(dim: number, cx: number, cz: number): void { this.jobs.delete(`${dim},${cx},${cz}`); }
  /** Generation happens between steps; a poll only takes what has finished. */
  poll(maxJobs: number): GenResult[] {
    return this.done.splice(0, Math.min(maxJobs, this.done.length));
  }
  dispose(): void { void this.close(); }
  /** Stops every worker; resolves when all have exited. */
  close(): Promise<void> {
    if (!this.disposed) {
      this.disposed = true;
      this.jobs.clear(); this.done.length = 0;
      for (const s of this.slots) if (s) void s.w.terminate();
      this.slots.length = 0;
    }
    return Promise.all(this.exits).then(() => undefined);
  }

  private startAll(): void {
    this.seed = this.seedOf();
    for (let i = 0; i < this.size; i++) this.start(i);
  }
  private start(i: number): void {
    const data: GenWorkerData = { seed: this.seed!, faults: this.opt.faults ?? null };
    const w = new Worker(this.entry, { workerData: data });
    const s: Slot = { w, ready: false, job: null, key: '', id: 0 };
    this.slots[i] = s;
    this.exits.push(new Promise((res) => w.once('exit', res)));
    w.on('message', (m: GenReplyMsg) => this.reply(s, m));
    w.on('error', (e) => this.log('error', `chunk worker ${i} failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`));
    w.on('exit', (code) => this.exited(i, s, code));
  }

  private reply(s: Slot, m: GenReplyMsg): void {
    if (this.disposed) return;
    if (m.t === 'ready') { s.ready = true; this.feed(); return; }
    if (m.id !== s.id || !s.job) return;
    const j = s.job, key = s.key;
    s.job = null;
    if (m.t === 'gen') {
      const st = (this.stats[j.dim] ??= { n: 0, ms: 0, max: 0 });
      st.n++; st.ms += m.ms; if (m.ms > st.max) st.max = m.ms;
      // cancelled, or cancelled and asked for again, while it ran
      if (this.jobs.get(key) === j) {
        this.jobs.delete(key);
        this.done.push({ dim: j.dim, cx: j.cx, cz: j.cz, blocks: m.blocks, biomes: m.biomes, ents: m.ents as EntInit[], hash: m.hash, emit: m.emit });
      }
    } else this.failed(j, key, m.msg);
    this.feed();
  }
  private failed(j: Job, key: string, why: string): void {
    if (this.jobs.get(key) !== j) return;
    if (j.fails < 2) { this.jobs.set(key, { ...j, n: this.n++, sent: false, fails: j.fails + 1 }); return; }
    this.jobs.delete(key);
    this.log('warn', `chunk ${j.cx},${j.cz} of dimension ${j.dim} could not be generated: ${why}`);
  }
  private exited(i: number, s: Slot, code: number): void {
    if (this.disposed || this.slots[i] !== s) return;
    this.slots[i] = null;
    if (s.job) { const j = s.job; s.job = null; this.failed(j, s.key, `worker exited with code ${code}`); }
    // A worker that never came up will not come up next time either.
    if (s.ready) this.start(i);
    else this.log('error', `chunk worker ${i} exited with code ${code} before it was ready; ${this.alive} of ${this.size} left`);
    if (!this.alive) {
      if (this.jobs.size) this.log('error', `no chunk workers left; ${this.jobs.size} chunk(s) stay without terrain`);
      this.jobs.clear();
    }
    this.feed();
  }

  private feed(): void {
    for (const s of this.slots) {
      if (!s || !s.ready || s.job) continue;
      let best: Job | null = null, key = '';
      for (const [k, j] of this.jobs) if (!j.sent && (!best || j.prio < best.prio || (j.prio === best.prio && j.n < best.n))) { best = j; key = k; }
      if (!best) return;
      best.sent = true;
      s.job = best; s.key = key; s.id = ++this.ids;
      const m: GenJobMsg = { id: s.id, dim: best.dim, cx: best.cx, cz: best.cz };
      s.w.postMessage(m);
    }
  }
}
