// The Node server: one world, one port. `node dist/server/main.js --data <dir> [flags]` (8.1).
//
// Boot order: read the flags, make the storage and the chunk source, start the host (which opens the world
// or makes it), then listen. Shutdown (SIGINT, SIGTERM, or a fault): every client is told `shutdown`, the
// world is saved, the storage is closed, then the process exits.
import { mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strSeed } from '../src/core/noise';
import { SimHost } from '../src/net/host';
import { VIEW_MAX, VIEW_MIN } from '../src/net/protocol';
import type { HostEnv } from '../src/net/transport';
import { type ChunkSource, type GenResult, InlineSource } from '../src/sim/chunksource';
import { MemStorage, type Storage } from '../src/sim/storage';
import { createHttp } from './http';
import { attachWs } from './wsserver';

const USAGE = `usage: node dist/server/main.js --data <dir> [--port 8080] [--host 0.0.0.0] [--name <text>] [--seed <text>]
  [--password <text>] [--cheats] [--max-players 8] [--view-max 12] [--save-interval 60]
  [--backup-interval 1800] [--backup-keep 12] [--restore <stamp>]`;

export interface ServerFlags {
  data: string; port: number; host: string; name: string; seed: string | null; password: string | null; cheats: boolean;
  maxPlayers: number; viewMax: number; saveInterval: number; backupInterval: number; backupKeep: number; restore: string | null;
}

/** The flags of 8.1; throws with what is wrong. */
export function parseFlags(argv: string[]): ServerFlags {
  const f: ServerFlags = { data: '', port: 8080, host: '0.0.0.0', name: 'Peopls Craft', seed: null, password: null, cheats: false,
    maxPlayers: 8, viewMax: 12, saveInterval: 60, backupInterval: 1800, backupKeep: 12, restore: null };
  const int = (k: string, v: string, lo: number, hi: number): number => {
    const n = Number(v);
    if (!/^\d+$/.test(v) || n < lo || n > hi) throw new Error(`--${k} takes a whole number from ${lo} to ${hi}`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cheats') { f.cheats = true; continue; }
    if (a === '--help' || a === '-h') throw new Error('');
    if (!a.startsWith('--')) throw new Error(`unexpected "${a}"`);
    const k = a.slice(2), v = argv[++i];
    if (v === undefined) throw new Error(`--${k} needs a value`);
    switch (k) {
      case 'data': f.data = v; break;
      case 'port': f.port = int(k, v, 0, 65535); break;
      case 'host': f.host = v; break;
      case 'name': f.name = v.slice(0, 64); break;
      case 'seed': f.seed = v; break;
      case 'password': f.password = v; break;
      case 'max-players': f.maxPlayers = int(k, v, 1, 250); break;
      case 'view-max': f.viewMax = int(k, v, VIEW_MIN, VIEW_MAX); break;
      case 'save-interval': f.saveInterval = int(k, v, 1, 86400); break;
      case 'backup-interval': f.backupInterval = int(k, v, 60, 7 * 86400); break;
      case 'backup-keep': f.backupKeep = int(k, v, 1, 1000); break;
      case 'restore': f.restore = v; break;
      default: throw new Error(`unknown flag --${k}`);
    }
  }
  if (!f.data) throw new Error('--data <dir> is required: the folder the world is kept in');
  return f;
}

/** The world's seed is known only once the storage is open, inside `host.start()`: the generator is made for it on the
 *  first request, which comes from a step. */
class WorldSource implements ChunkSource {
  private src: ChunkSource | null = null;
  constructor(private make: (seed: number) => ChunkSource, private seed: () => number) {}
  private get s(): ChunkSource { return (this.src ??= this.make(this.seed())); }
  get pending(): number { return this.src ? this.src.pending : 0; }
  request(dim: number, cx: number, cz: number, prio: number): void { this.s.request(dim, cx, cz, prio); }
  cancel(dim: number, cx: number, cz: number): void { this.src?.cancel(dim, cx, cz); }
  poll(maxJobs: number, budgetMs: number): GenResult[] { return this.src ? this.src.poll(maxJobs, budgetMs) : []; }
  dispose(): void { this.src?.dispose(); }
}

/** Where the world is kept and where its terrain comes from: the one place either is chosen. Until the folder storage
 *  (server/diskstorage.ts) and the worker-thread pool (server/nodepool.ts) are wired in, the world lives in memory and is
 *  generated in the step. */
function backends(_f: ServerFlags, env: HostEnv, seed: () => number): { storage: Storage; source: ChunkSource } {
  const storage: Storage = new MemStorage();
  const source: ChunkSource = new WorldSource((s) => new InlineSource(s, env.now), seed);
  return { storage, source };
}

/** 4.1: true once `limit` steps have failed inside `windowMs`. `total` is the host's running count of failed steps. */
export function stepFaults(limit = 20, windowMs = 60000): (total: number, now: number) => boolean {
  const at: number[] = [];
  let seen = 0;
  return (total, now) => {
    for (; seen < total; seen++) at.push(now);
    while (at.length && now - at[0] >= windowMs) at.shift();
    return at.length >= limit;
  };
}

const stamp = (): string => new Date().toISOString().replace('T', ' ').slice(0, 19);
const env: HostEnv = {
  now: () => performance.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as NodeJS.Timeout),
  log: (level, msg) => (level === 'info' ? console.log : level === 'warn' ? console.warn : console.error)(`${stamp()} ${level} ${msg}`),
};

async function main(): Promise<number> {
  let f: ServerFlags;
  try { f = parseFlags(process.argv.slice(2)); } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error((msg ? msg + '\n' : '') + USAGE);
    return msg ? 2 : 0;
  }
  mkdirSync(f.data, { recursive: true });
  const seedText = f.seed ?? String(Math.floor(Math.random() * 1e9));
  const seed = /^-?\d+$/.test(seedText) ? Number(seedText) | 0 : strSeed(seedText);
  let host: SimHost | null = null;
  const { storage, source } = backends(f, env, () => host!.sim.seed);
  host = new SimHost(env, storage, source, {
    id: 'world', name: f.name, seed, seedText, cheats: f.cheats, password: f.password, maxPlayers: f.maxPlayers, viewMax: f.viewMax,
    clock: 'real', saveEvery: f.saveInterval, solo: false,
  });
  const h = host;
  await h.start();

  const clientDir = fileURLToPath(new URL('../client/', import.meta.url));
  const http = createHttp(clientDir, () => ({ server: true, name: h.sim.world.name, players: h.sim.online(), max: f.maxPlayers, password: f.password !== null }));
  const ws = attachWs(http, '/ws', env, (c) => h.connect(c));
  await new Promise<void>((ok, no) => { http.once('error', no); http.listen(f.port, f.host, () => { http.off('error', no); ok(); }); });
  const addr = http.address(), port = typeof addr === 'object' && addr ? addr.port : f.port;
  env.log('info', `world "${h.sim.world.name}" (seed ${h.sim.world.seedText}), up to ${f.maxPlayers} players, view ${f.viewMax}${f.password !== null ? ', password set' : ''}${f.cheats ? ', cheats on' : ''}`);
  env.log('info', `listening on http://${f.host}:${port}/`);

  let ending: Promise<number> | null = null;
  const shutdown = (why: string, code: number): Promise<number> => {
    if (ending) return ending;
    env.log(code ? 'error' : 'info', `stopping: ${why}`);
    ending = (async () => {
      let rc = code;
      try { await h.stop(); } catch (e) { env.log('error', 'the last save failed: ' + (e instanceof Error ? e.message : String(e))); rc = rc || 1; }
      ws.close();
      await new Promise<void>((ok) => { http.close(() => ok()); http.closeAllConnections(); });
      return rc;
    })();
    return ending;
  };
  const faults = stepFaults();
  const watch = setInterval(() => {
    if (faults(h.stats.stepErrors, Date.now())) void shutdown('20 steps failed inside a minute', 2).then(exit);
  }, 1000);
  watch.unref();
  const exit = (rc: number): void => { clearInterval(watch); process.exit(rc); };
  process.on('SIGINT', () => void shutdown('SIGINT', 0).then(exit));
  process.on('SIGTERM', () => void shutdown('SIGTERM', 0).then(exit));
  process.on('uncaughtException', (e) => { env.log('error', 'uncaught: ' + (e.stack ?? e.message)); void shutdown('an uncaught exception', 2).then(exit); });
  process.on('unhandledRejection', (e) => { env.log('error', 'unhandled rejection: ' + (e instanceof Error ? e.stack ?? e.message : String(e))); void shutdown('an unhandled rejection', 2).then(exit); });
  return -1;
}

// Bundled into a test, this file only lends its parts; it runs as dist/server/main.js.
if (basename(fileURLToPath(import.meta.url)).replace(/\.m?js$/, '') === 'main') void main().then((rc) => { if (rc >= 0) process.exit(rc); }, (e) => { console.error(e instanceof Error ? e.stack ?? e.message : e); process.exit(1); });
