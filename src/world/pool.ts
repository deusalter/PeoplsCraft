// Fixed pool of chunk workers. One job per worker at a time so the main thread keeps
// control of ordering: it only hands out work when someone is idle.
export class WorkerPool {
  private workers: Worker[] = [];
  private idle: number[] = [];
  private cbs = new Map<number, (m: any) => void>();
  private nextId = 1;
  readonly size: number;

  constructor(size: number) {
    this.size = size;
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent) => {
        this.idle.push(i);
        const cb = this.cbs.get(e.data.id);
        this.cbs.delete(e.data.id);
        if (cb) cb(e.data);
      };
      w.onerror = (e) => { console.error('chunk worker error', e.message, e.filename, e.lineno); this.idle.push(i); };
      this.workers.push(w); this.idle.push(i);
    }
  }
  get idleCount(): number { return this.idle.length; }
  get busy(): number { return this.size - this.idle.length; }
  run(msg: Record<string, unknown>, transfer: Transferable[], cb: (m: any) => void): void {
    const i = this.idle.pop();
    if (i === undefined) throw new Error('no idle worker');
    const id = this.nextId++;
    msg.id = id;
    this.cbs.set(id, cb);
    this.workers[i].postMessage(msg, transfer);
  }
  dispose(): void { for (const w of this.workers) w.terminate(); this.workers.length = 0; this.idle.length = 0; this.cbs.clear(); }
}
