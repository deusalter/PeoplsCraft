// The scenario runner: builds the server, starts it on a free port with a fresh data folder and the harness on, runs
// one scenario against it with bots, stops it, and prints what happened. Exit code 1 when a check failed.
//
//   npm run scenario -- <name> [--runs N] [--lag] [--keep] [--seed <text>]
//
// --lag puts every bot behind scripts/lagproxy.ts at its defaults (the Stage 6 numbers). --keep leaves the data folder.
// The world's seed is random unless --seed is given; the server's first line names it.
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type LagProxy, startLagProxy } from '../lagproxy';
import abuse from '../scenarios/abuse';
import basic from '../scenarios/basic';
import type { Bot } from './bot';

export interface Stats {
  steps: number; n: number; p50: number; p99: number; max: number; stepErrors: number;
  simPlayers: number; online: number; names: string[]; refused: { atk: number; fire: number; edit: number };
}
/** What a scenario is given. */
export interface Ctx {
  /** Where bots connect (the lag proxy when there is one). */
  url: string;
  /** The server itself, for the harness and for sockets that must not go through the proxy. */
  direct: string;
  lag: boolean;
  /** Bots made here are closed by the runner at the end. */
  bot(b: Bot): Bot;
  stats(last?: number): Promise<Stats>;
  hash(dim: number, cx0: number, cz0: number, cx1: number, cz1: number): Promise<Record<string, string>>;
  /** A check: recorded, and the run fails when one does not hold. */
  check(ok: boolean, what: string): void;
  log(line: string): void;
  /** Stop the server with SIGTERM, as an operator does, and start it again on the same folder; `url` and `direct`
   *  then name the new one. Resolves with the exit code of the stop. */
  restart(): Promise<number | null>;
  /** The server's output so far. */
  serverLog(): string;
  alive(): boolean;
}
type Scenario = (ctx: Ctx) => Promise<void>;
const SCENARIOS: Record<string, Scenario> = { basic, abuse };

const root = resolve('.'), out = resolve('out/scenario'), pad = resolve('.claude/mp-work/pad/scenarios');

function buildServer(): void {
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const r = spawnSync(process.execPath, [vite, 'build', '-c', 'vite.server.config.ts', '--outDir', join(out, 'server'), '--logLevel', 'warn'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('the server did not build');
}

interface Server { proc: ChildProcess; base: string; logs: string[] }
function startServer(data: string, extra: string[]): Promise<Server> {
  const logs: string[] = [];
  const proc = spawn(process.execPath, [join(out, 'server', 'main.js'), '--data', data, '--port', '0', '--host', '127.0.0.1', '--harness', '--cheats', '--max-players', '32', ...extra],
    { cwd: out, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error('the server did not say where it listens:\n' + logs.join(''))), 30000);
    const read = (b: Buffer): void => {
      logs.push(b.toString());
      const m = /listening on (http:\/\/[^/\s]+)\//.exec(logs.join(''));
      if (m) { clearTimeout(t); ok({ proc, base: m[1], logs }); }
    };
    proc.stdout!.on('data', read); proc.stderr!.on('data', read);
    proc.once('exit', (c) => { clearTimeout(t); no(new Error(`the server exited (${c}):\n` + logs.join(''))); });
  });
}
async function stopServer(s: Server): Promise<number | null> {
  if (s.proc.exitCode !== null) return s.proc.exitCode;
  const gone = new Promise<number | null>((ok) => s.proc.once('exit', (c) => ok(c)));
  s.proc.kill('SIGTERM');
  const code = await Promise.race([gone, new Promise<'late'>((ok) => setTimeout(() => ok('late'), 15000))]);
  if (code === 'late') { s.proc.kill('SIGKILL'); await gone; return null; }
  return code;
}

async function runOnce(name: string, scenario: Scenario, lag: boolean, keep: boolean, i: number, seed: string | null): Promise<boolean> {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14), data = join(pad, `${name}-${stamp}-${i}${lag ? '-lag' : ''}`);
  mkdirSync(data, { recursive: true });
  const checks: [boolean, string][] = [], bots: Bot[] = [];
  const t0 = performance.now();
  const say = (l: string): void => console.log(`  ${((performance.now() - t0) / 1000).toFixed(1).padStart(6)}s  ${l}`);
  const world = join(data, 'world'), extra = seed !== null ? ['--seed', seed] : [];
  let server = await startServer(world, extra);
  let proxy: LagProxy | null = null;
  const lagOn = async (): Promise<void> => { const u = new URL(server.base); proxy = await startLagProxy({ host: u.hostname, port: Number(u.port) }); };
  if (lag) await lagOn();
  const get = async <T>(path: string): Promise<T> => { const r = await fetch(server.base + path); if (!r.ok) throw new Error(`${path}: ${r.status}`); return (await r.json()) as T; };
  const earlier: string[] = [];
  const ctx: Ctx = {
    get url() { return proxy ? `127.0.0.1:${proxy.port}` : server.base; },
    get direct() { return server.base; },
    lag,
    bot: (b) => { bots.push(b); return b; },
    stats: (last) => get<Stats>('/stats' + (last ? `?last=${last}` : '')),
    hash: (dim, cx0, cz0, cx1, cz1) => get<Record<string, string>>(`/hash?dim=${dim}&cx0=${cx0}&cz0=${cz0}&cx1=${cx1}&cz1=${cz1}`),
    check: (ok, what) => { checks.push([ok, what]); say(`${ok ? 'ok  ' : 'FAIL'} ${what}`); },
    log: say,
    restart: async () => {
      if (proxy) { await proxy.close(); proxy = null; }
      const rc = await stopServer(server);
      earlier.push(...server.logs);
      server = await startServer(world, extra);
      if (lag) await lagOn();
      say(`server restarted: ${server.base}`);
      return rc;
    },
    serverLog: () => earlier.join('') + server.logs.join(''),
    alive: () => server.proc.exitCode === null,
  };
  console.log(`scenario ${name}${lag ? ' through the lag proxy' : ''}, run ${i + 1}: server ${server.base}, data ${data}`);
  let error: unknown = null;
  try { await scenario(ctx); } catch (e) { error = e; }
  if (error) ctx.check(false, 'the scenario ran to its end: ' + (error instanceof Error ? error.stack ?? error.message : String(error)));
  for (const b of bots) {
    const c = b.counts, w = b.wire;
    say(`bot ${b.name.padEnd(10)} corrections ${c.corrections}  rej ${c.rej} (${c.rejCells} with cells, ${c.rejEmpty} without)  snapshots ${c.snapshots}  ` +
      `in ${Object.entries(w.bytesIn).map(([k, v]) => `${k} ${v}`).join(' ')}  out ${w.bytesOut}`);
    b.close();
  }
  if (proxy) { const p: LagProxy = proxy; say(`lag proxy: ${p.stats.segments} segments, ${p.stats.stalls} stalled`); await p.close(); }
  const errs = ctx.serverLog().split('\n').filter((l) => / error /.test(l));
  const rc = await stopServer(server);
  ctx.check(rc === 0, `the server stopped cleanly on SIGTERM (exit ${rc})`);
  if (errs.length) say('server errors:\n' + errs.slice(0, 20).join('\n'));
  if (!keep) rmSync(data, { recursive: true, force: true });
  const failed = checks.filter((c) => !c[0]);
  console.log(`scenario ${name} run ${i + 1}: ${failed.length ? `FAILED (${failed.length} of ${checks.length} checks)` : `passed (${checks.length} checks)`} in ${((performance.now() - t0) / 1000).toFixed(1)} s\n`);
  if (failed.length) console.log(ctx.serverLog().split('\n').slice(-40).join('\n'));
  return !failed.length;
}

async function main(): Promise<number> {
  const a = process.argv.slice(2), name = a[0], runs = Number(a[a.indexOf('--runs') + 1]) || 1;
  const scenario = SCENARIOS[name];
  if (!scenario) { console.error(`usage: npm run scenario -- <${Object.keys(SCENARIOS).join('|')}> [--runs N] [--lag] [--keep] [--seed <text>]`); return 2; }
  buildServer();
  let pass = 0;
  const seed = a.includes('--seed') ? a[a.indexOf('--seed') + 1] : null;
  for (let i = 0; i < runs; i++) if (await runOnce(name, scenario, a.includes('--lag'), a.includes('--keep'), i, seed)) pass++;
  console.log(`${name}: ${pass} of ${runs} run(s) passed`);
  return pass === runs ? 0 : 1;
}

void main().then((rc) => process.exit(rc), (e) => { console.error(e); process.exit(1); });
