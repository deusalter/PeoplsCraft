// The page's end of the transport to the solo simulation in its Web Worker (src/sim-worker.ts).
// JSON-shaped messages cross by structured clone, binary ones are transferred. A few words that are not
// the protocol's (open the world, a harness question, its answer) travel as objects with `ctl` instead
// of `t`, so neither end can take one for the other.
import type { C2S, S2C } from './protocol';
import type { Transport } from './transport';

/** What the worker needs to open a world. `clock` 'manual': it steps only when told to (`step`, answered by `stepped`). */
export interface WorkerInit {
  id: string; name: string; seed: number; seedText: string;
  clock: 'real' | 'manual'; viewMax: number;
  /** false: the page cannot save (storage refused), and the world is kept in memory only. */
  save: boolean;
  /** Answer `ask` (a development build: the harness's white-box questions). */
  dev: boolean;
}
export type ToWorker =
  | { ctl: 'init'; init: WorkerInit }
  | { ctl: 'ask'; id: number; src: string; arg: unknown };
export type FromWorker =
  | { ctl: 'started'; seed: number }
  | { ctl: 'failed'; msg: string }
  | { ctl: 'answer'; id: number; ok: boolean; value?: unknown; err?: string }
  | { ctl: 'closed'; code: string };

export class WorkerTransport implements Transport {
  readonly kind = 'worker' as const;
  state: Transport['state'] = 'connecting';
  onOpen: (() => void) | null = null;
  onMessage: ((m: S2C) => void) | null = null;
  onBinary: ((b: ArrayBuffer) => void) | null = null;
  onClose: ((code: string) => void) | null = null;
  private started: { ok: (seed: number) => void; no: (e: Error) => void } | null = null;
  private steps: (() => void)[] = [];
  private asks = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void }>();
  private askId = 0;

  constructor(private w: Worker) {
    w.onmessage = (e: MessageEvent) => this.recv(e.data);
    w.onerror = (e: ErrorEvent) => {
      const msg = e.message || 'the simulation stopped';
      if (this.started) { this.started.no(new Error(msg)); this.started = null; }
      else console.error('simulation worker: ' + msg);
    };
  }

  /** Open the world in the worker. Resolves with its seed once the host has started, so the hello can follow. */
  start(init: WorkerInit): Promise<number> {
    return new Promise((ok, no) => { this.started = { ok, no }; this.post({ ctl: 'init', init }); });
  }
  send(m: C2S): void { if (this.state === 'open') this.w.postMessage(m); }
  sendBin(b: ArrayBuffer): void { if (this.state === 'open') this.w.postMessage(b, [b]); }
  /** Manual clock: `n` steps. Settles when the worker says they are done; by then every message they sent is queued here. */
  step(n: number): Promise<void> {
    if (this.state !== 'open') return Promise.resolve();
    return new Promise((ok) => { this.steps.push(ok); this.send({ t: 'step', n }); });
  }
  /** Run `src`, the source of a function `(sim, arg, host) => value`, in the worker between two steps (development builds). */
  ask(src: string, arg: unknown): Promise<unknown> {
    const id = ++this.askId;
    return new Promise((ok, no) => { this.asks.set(id, { ok, no }); this.post({ ctl: 'ask', id, src, arg }); });
  }
  close(): void {
    if (this.state === 'closed') return;
    this.state = 'closed';
    this.w.terminate();
    for (const f of this.steps) f();
    this.steps = [];
  }

  private post(m: ToWorker): void { this.w.postMessage(m); }
  private recv(m: unknown): void {
    if (m instanceof ArrayBuffer) { if (this.onBinary) this.onBinary(m); return; }
    const c = m as FromWorker | S2C;
    if ('ctl' in c) {
      if (c.ctl === 'started') { this.state = 'open'; this.started?.ok(c.seed); this.started = null; if (this.onOpen) this.onOpen(); }
      else if (c.ctl === 'failed') { this.started?.no(new Error(c.msg)); this.started = null; this.w.terminate(); this.state = 'closed'; }
      else if (c.ctl === 'answer') {
        const a = this.asks.get(c.id);
        if (a) { this.asks.delete(c.id); if (c.ok) a.ok(c.value); else a.no(new Error(c.err ?? 'failed')); }
      } else if (c.ctl === 'closed') { this.state = 'closed'; if (this.onClose) this.onClose(c.code); }
      return;
    }
    // the step's own messages came first, in order: they are all queued by the time the step is said to be done
    if (c.t === 'stepped') { const f = this.steps.shift(); if (f) f(); }
    if (this.onMessage) this.onMessage(c);
  }
}
