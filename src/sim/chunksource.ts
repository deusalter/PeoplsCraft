// Generated terrain, as the simulation asks for it: a queue of chunk jobs and the finished chunks
// of each tick. A server answers from worker threads; InlineSource generates inside the tick.
import type { EntInit } from '../world/gen/types';
import { genChunk } from './genjob';

export interface GenResult { dim: number; cx: number; cz: number; blocks: Uint8Array; biomes: Uint8Array; ents: EntInit[]; hash: number }

export interface ChunkSource {
  /** Queue a job; lower `prio` first. Idempotent while the job is pending. */
  request(dim: number, cx: number, cz: number, prio: number): void;
  cancel(dim: number, cx: number, cz: number): void;
  /** Called once per tick. Returns at most `maxJobs` finished jobs. InlineSource generates here: until
   *  `maxJobs` are done or `budgetMs` is spent, whichever comes first (always at least one job when any is
   *  queued). Real clock: `poll(Infinity, budget)`. Manual clock: `poll(2, Infinity)`, so the number of
   *  chunks finished in a step never depends on how fast the machine is. */
  poll(maxJobs: number, budgetMs: number): GenResult[];
  readonly pending: number;
  dispose(): void;
}

interface Job { dim: number; cx: number; cz: number; prio: number; n: number }

/** Generates in the caller's thread. Jobs leave in order of `prio`, and in the order they were asked for among equals,
 *  so the same requests give the same results in the same polls whatever the machine. */
export class InlineSource implements ChunkSource {
  private jobs = new Map<string, Job>();
  private n = 0;
  /** `now`: milliseconds, monotonic; read only to keep a poll within its budget. */
  constructor(private seed: number, private now: () => number) {}

  get pending(): number { return this.jobs.size; }
  request(dim: number, cx: number, cz: number, prio: number): void {
    const k = `${dim},${cx},${cz}`;
    if (!this.jobs.has(k)) this.jobs.set(k, { dim, cx, cz, prio, n: this.n++ });
  }
  cancel(dim: number, cx: number, cz: number): void { this.jobs.delete(`${dim},${cx},${cz}`); }
  poll(maxJobs: number, budgetMs: number): GenResult[] {
    const out: GenResult[] = [];
    if (!this.jobs.size || maxJobs < 1) return out;
    const t0 = this.now();
    while (this.jobs.size && out.length < maxJobs) {
      let best: Job | null = null, key = '';
      for (const [k, j] of this.jobs) if (!best || j.prio < best.prio || (j.prio === best.prio && j.n < best.n)) { best = j; key = k; }
      this.jobs.delete(key);
      const j = best!, g = genChunk(this.seed, j.dim, j.cx, j.cz);
      out.push({ dim: j.dim, cx: j.cx, cz: j.cz, blocks: g.blocks, biomes: g.biomes, ents: g.ents, hash: g.hash });
      if (this.now() - t0 >= budgetMs) break;
    }
    return out;
  }
  dispose(): void { this.jobs.clear(); }
}
