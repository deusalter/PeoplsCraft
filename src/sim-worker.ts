// The solo simulation's thread: the same SimHost a server runs, on IndexedDB storage, generating its
// terrain inline. One connection, the page's, whose messages arrive here by postMessage.
import { SimHost } from './net/host';
import type { C2S, S2C } from './net/protocol';
import type { Conn, HostEnv } from './net/transport';
import type { FromWorker, ToWorker, WorkerInit } from './net/worker-client';
import { type ChunkSource, InlineSource } from './sim/chunksource';
import { MemStorage } from './sim/storage';
import { IdbStorage } from './storage/idb';

const scope = self as unknown as { postMessage(m: unknown, t?: Transferable[]): void; onmessage: ((e: MessageEvent) => void) | null };
const post = (m: FromWorker | S2C): void => scope.postMessage(m);

const env: HostEnv = {
  now: () => performance.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as number),
  log: (level, msg) => console[level](msg),
};

let host: SimHost | null = null, dev = false;
const conn: Conn = {
  id: 1, local: true, addr: 'worker', buffered: 0,
  onMessage: null, onBinary: null, onClose: null,
  send(m: S2C): void { post(m); },
  sendBin(b: ArrayBuffer): void { scope.postMessage(b, [b]); },
  close(code: string): void { post({ ctl: 'closed', code }); },
};

/** The generator takes the seed of the world as storage holds it, which is known only once the host has opened it. */
function source(fallback: number): ChunkSource {
  let inner: InlineSource | null = null;
  const get = (): InlineSource => (inner ??= new InlineSource(host?.sim?.seed ?? fallback, env.now));
  return {
    request: (dim, cx, cz, prio) => get().request(dim, cx, cz, prio),
    cancel: (dim, cx, cz) => get().cancel(dim, cx, cz),
    poll: (maxJobs, budgetMs) => get().poll(maxJobs, budgetMs),
    get pending() { return inner ? inner.pending : 0; },
    dispose: () => inner?.dispose(),
  };
}

async function open(o: WorkerInit): Promise<void> {
  dev = o.dev;
  const h = new SimHost(env, o.save ? new IdbStorage(o.id) : new MemStorage(), source(o.seed), {
    id: o.id, name: o.name, seed: o.seed, seedText: o.seedText, cheats: true, password: null, maxPlayers: 1,
    viewMax: o.viewMax, clock: o.clock, saveEvery: 30, solo: true,
  });
  try { await h.start(); } catch (e) { post({ ctl: 'failed', msg: e instanceof Error ? e.message : String(e) }); return; }
  host = h;
  h.connect(conn);
  post({ ctl: 'started', seed: h.sim.seed });
}

async function answer(id: number, src: string, arg: unknown): Promise<void> {
  if (!dev || !host) { post({ ctl: 'answer', id, ok: false, err: 'no questions here' }); return; }
  try {
    const f = new Function('return (' + src + ')')() as (sim: unknown, arg: unknown, host: SimHost) => unknown;
    post({ ctl: 'answer', id, ok: true, value: await f(host.sim, arg, host) });
  } catch (e) { post({ ctl: 'answer', id, ok: false, err: e instanceof Error ? e.message : String(e) }); }
}

scope.onmessage = (e) => {
  const m = e.data as ToWorker | C2S | ArrayBuffer;
  if (m instanceof ArrayBuffer) { if (conn.onBinary) conn.onBinary(m); return; }
  if (m && typeof m === 'object' && 'ctl' in m) {
    if (m.ctl === 'init') void open(m.init);
    else if (m.ctl === 'ask') void answer(m.id, m.src, m.arg);
    return;
  }
  if (conn.onMessage) conn.onMessage(m);
};
