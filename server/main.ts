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
import type { ChunkSource } from '../src/sim/chunksource';
import { hashBlocks } from '../src/sim/genjob';
import { DiskStorage } from './diskstorage';
import { createHttp } from './http';
import { NodePoolSource } from './nodepool';
import { attachWs } from './wsserver';

const USAGE = `usage: node dist/server/main.js --data <dir> [--port 8080] [--host 0.0.0.0] [--name <text>] [--seed <text>]
  [--password <text>] [--cheats] [--harness] [--max-players 8] [--view-max 12] [--save-interval 60]
  [--backup-interval 1800] [--backup-keep 12] [--restore <stamp>]`;

export interface ServerFlags {
  data: string; port: number; host: string; name: string; seed: string | null; password: string | null; cheats: boolean;
  /** Test runs only: `/hash` and `/stats` answer (10.2). */
  harness: boolean;
  maxPlayers: number; viewMax: number; saveInterval: number; backupInterval: number; backupKeep: number; restore: string | null;
}

/** The flags of 8.1; throws with what is wrong. */
export function parseFlags(argv: string[]): ServerFlags {
  const f: ServerFlags = { data: '', port: 8080, host: '0.0.0.0', name: 'Peopls Craft', seed: null, password: null, cheats: false, harness: false,
    maxPlayers: 8, viewMax: 12, saveInterval: 60, backupInterval: 1800, backupKeep: 12, restore: null };
  const int = (k: string, v: string, lo: number, hi: number): number => {
    const n = Number(v);
    if (!/^\d+$/.test(v) || n < lo || n > hi) throw new Error(`--${k} takes a whole number from ${lo} to ${hi}`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cheats') { f.cheats = true; continue; }
    if (a === '--harness') { f.harness = true; continue; }
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

/** Where the world is kept and where its terrain comes from: the one place either is chosen. The pool reads the seed
 *  at its first request, which comes from a step, after `host.start()` has opened the world. */
function backends(f: ServerFlags, env: HostEnv, seed: () => number): { storage: DiskStorage; source: ChunkSource } {
  const storage = new DiskStorage(f.data, {
    backupInterval: f.backupInterval, backupKeep: f.backupKeep, ...(f.restore !== null ? { restore: f.restore } : {}),
    log: (level, msg) => env.log(level, msg),
  });
  const source = new NodePoolSource(seed, { entry: new URL('./genworker.js', import.meta.url), log: (level, msg) => env.log(level, msg) });
  return { storage, source };
}

/** The harness's questions (10.2), answered only under `--harness`: what the host holds, and how long its steps took. */
function harness(h: SimHost, path: string, q: URLSearchParams): unknown {
  if (path === '/hash') {
    const n = ['dim', 'cx0', 'cz0', 'cx1', 'cz1'].map((k) => Number(q.get(k)));
    if (n.some((v) => !Number.isInteger(v)) || !h.sim.realms[n[0]] || (n[3] - n[1] + 1) * (n[4] - n[2] + 1) > 1024) return { error: 'hash?dim&cx0&cz0&cx1&cz1' };
    const realm = h.sim.realms[n[0]], out: Record<string, string> = {};
    for (let cx = n[1]; cx <= n[3]; cx++) for (let cz = n[2]; cz <= n[4]; cz++) {
      const c = realm.chunks.chunk(cx, cz);
      out[`${cx},${cz}`] = c && c.state === 2 && c.blocks ? hashBlocks(c.blocks).toString(16) : '-';
    }
    return out;
  }
  // what golden reads where the simulation runs (10.1's T.ask questions), as fixed read-only questions
  if (path === '/ent' || path === '/mobs') {
    const n = ['dim', 'x', 'y', 'z'].map((k) => Number(q.get(k))), realm = h.sim.realms[n[0]];
    if (!Number.isInteger(n[0]) || !realm) return { error: `${path}?dim${path === '/ent' ? '&x&y&z' : ''}` };
    if (path === '/mobs') return realm.mobs.list.filter((m) => m.active).map((m) => ({ id: m.id, key: m.def.key, x: m.x, y: m.y, z: m.z, h: m.h, hp: m.hp, boss: !!m.boss }));
    if (n.some((v) => !Number.isInteger(v))) return { error: '/ent?dim&x&y&z' };
    const e = realm.getEnt(n[1], n[2], n[3]);
    return { ent: e ? { kind: e.kind, data: e.data } : null };
  }
  if (path === '/homes') return h.sim.shared.homes.map((o) => ({ x: o.x, y: o.y, z: o.z, npc: o.npc }));
  if (path === '/stats') {
    const t = h.stats.tickMs, steps = h.stepCount, last = Math.min(steps, t.length, Math.max(1, Number(q.get('last')) || t.length));
    const a: number[] = [];
    for (let i = 0; i < last; i++) a.push(t[(steps - i) % t.length]);
    a.sort((x, y) => x - y);
    const at = (f: number): number => (a.length ? a[Math.min(a.length - 1, Math.floor(f * a.length))] : 0);
    const players = [...h.sim.players.values()];
    return {
      steps, n: a.length, p50: at(0.5), p99: at(0.99), max: a.length ? a[a.length - 1] : 0, stepErrors: h.stats.stepErrors,
      simPlayers: players.length, online: h.sim.online(), names: players.map((p) => p.name), refused: h.sim.refused,
    };
  }
  return undefined;
}

/** 4.1: true once `limit` steps have failed inside `windowMs`. `total` is the host's running count of failed steps. */
/** The stop of a server (8.1): the players are told and the clock stops first, so that nothing changes after the last
 *  save, which is tried three times. Resolves whether it was written. */
export async function lastSave(h: SimHost, failing: () => boolean, env: Pick<HostEnv, 'log'>): Promise<boolean> {
  try { return (await h.stop(3)) && !failing(); } catch (e) {
    env.log('error', 'the stop failed: ' + (e instanceof Error ? e.message : String(e)));
    return false;
  }
}
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
  try { await h.start(); } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    source.dispose();
    return 1;
  }
  // without this, a kill -9 before the first timed save would start a different world on the same folder
  if (h.madeWorld) {
    await h.save();
    if (storage.saveFailing) { console.error(`the new world could not be written to ${f.data}`); await h.stop().catch(() => {}); return 1; }
  }

  const clientDir = fileURLToPath(new URL('../client/', import.meta.url));
  const http = createHttp(clientDir, () => ({ server: true, name: h.sim.world.name, players: h.sim.online(), max: f.maxPlayers, password: f.password !== null, ...(f.harness ? { harness: true } : {}) }),
    f.harness ? (path, q) => harness(h, path, q) : undefined);
  const ws = attachWs(http, '/ws', env, (c) => h.connect(c));
  await new Promise<void>((ok, no) => { http.once('error', no); http.listen(f.port, f.host, () => { http.off('error', no); ok(); }); });
  const addr = http.address(), port = typeof addr === 'object' && addr ? addr.port : f.port;
  env.log('info', `world "${h.sim.world.name}" (seed ${h.sim.world.seedText}), up to ${f.maxPlayers} players, view ${f.viewMax}${f.password !== null ? ', password set' : ''}${f.cheats ? ', cheats on' : ''}${f.harness ? ', harness on' : ''}`);
  env.log('info', `listening on http://${f.host}:${port}/`);

  let ending: Promise<number> | null = null;
  const shutdown = (why: string, code: number): Promise<number> => {
    if (ending) return ending;
    env.log(code ? 'error' : 'info', `stopping: ${why}`);
    ending = (async () => {
      let rc = code;
      if (!(await lastSave(h, () => storage.saveFailing, env))) rc = rc || 1;
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
