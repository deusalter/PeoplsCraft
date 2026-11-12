// Fixed pool of chunk workers. One job per worker at a time so the main thread keeps
// control of ordering: it only hands out work when someone is idle. Jobs given to `urgent` wait in
// the pool itself and take the next worker to come free, ahead of whoever is watching for an idle one.
export class WorkerPool {
  private workers: Worker[] = [];
  private idle: number[] = [];
  private cbs = new Map<number, (m: any) => void>();
  private jobOf: number[] = [];   // id of the job each worker is running, 0 when it has none
  private nextId = 1;
  private waiting: { msg: Record<string, unknown>; transfer: Transferable[]; cb: (m: any) => void }[] = [];
  readonly size: number;

  constructor(size: number) {
    this.size = size;
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent) => {
        this.jobOf[i] = 0; this.idle.push(i);
        const cb = this.cbs.get(e.data.id);
        this.cbs.delete(e.data.id);
        this.next();
        if (cb) cb(e.data);
      };
      // A job that throws still has to answer, or its chunk would wait for ever: the callback gets null.
      w.onerror = (e) => {
        console.error('chunk worker error', e.message, e.filename, e.lineno);
        const id = this.jobOf[i];
        if (!id) return;            // nothing was running, so the worker is already listed as idle
        this.jobOf[i] = 0; this.idle.push(i);
        const cb = this.cbs.get(id);
        this.cbs.delete(id);
        this.next();
        if (cb) cb(null);
      };
      this.workers.push(w); this.idle.push(i); this.jobOf.push(0);
    }
  }
  /** Workers for chunk jobs beside the solo simulation's own worker, which takes one core more than a host's client. */
  static soloSize(cores = navigator.hardwareConcurrency || 4): number { return Math.max(2, Math.min(6, cores - 3)); }
  get idleCount(): number { return this.idle.length; }
  get busy(): number { return this.size - this.idle.length; }
  /** `cb` receives the worker's reply, or null if the job threw. */
  run(msg: Record<string, unknown>, transfer: Transferable[], cb: (m: any) => void): void {
    const i = this.idle.pop();
    if (i === undefined) throw new Error('no idle worker');
    const id = this.nextId++;
    msg.id = id;
    this.cbs.set(id, cb); this.jobOf[i] = id;
    this.workers[i].postMessage(msg, transfer);
  }
  /** Run a job on the first worker to come free, before any `run` its finishing would otherwise let in. */
  urgent(msg: Record<string, unknown>, transfer: Transferable[], cb: (m: any) => void): void {
    if (this.idle.length) this.run(msg, transfer, cb); else this.waiting.push({ msg, transfer, cb });
  }
  private next(): void { const q = this.waiting.shift(); if (q) this.run(q.msg, q.transfer, q.cb); }
  dispose(): void { for (const w of this.workers) w.terminate(); this.workers.length = 0; this.idle.length = 0; this.cbs.clear(); this.waiting.length = 0; }
}
