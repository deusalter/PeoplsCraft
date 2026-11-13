// Smoke scenarios against the real game in headless Chrome (see headless.mjs for the browser).
//
//   npm run smoke -- golden              scripted play-through, compared with scripts/golden/baseline.json
//   npm run smoke -- golden --record     write that baseline from this run instead
//   npm run smoke -- legacy              open the saves in scripts/fixtures/legacy-v1.json in this build
//   npm run smoke -- legacy-make         rebuild that fixture (only on a build from before the save format changed)
//   npm run smoke -- perf                the scripted 20 s flight at view 12 (docs/multiplayer/MEASUREMENTS.md)
//   npm run smoke -- det                 two runs of one script on a &det world agree after each of 20 calls (?loopback: in the page)
//   npm run smoke -- solofar             a solo world culls nothing by distance, in the page and in the worker
//   npm run smoke -- twotab              the database upgraded while an old tab holds it, two handles at once, a newer build's database
//   npm run smoke -- tpfar               step times of the solo worker during far teleports (risk R10)
//   npm run smoke -- closetab            a solo world closed 4 s and 1 s after a change, then opened again (--r12: the risk's table)
//   npm run smoke -- sameworld           a world played in one tab is neither opened nor deleted in another
//   npm run smoke -- frames              a script's frames each step once beside the display's; a hidden tab's world is still until driven
//   --repeat N                           run N times, stop at the first failure
//   --server                             golden on the Node server instead of the page: builds it, starts it on every
//                                        interface with --harness --cheats --seed golden and a fresh folder, and opens it
//                                        from this machine's LAN address over plain http (`--server http://h:p`: one already up)
//   ?clone                               (or any ?a&b=c) added to the page's query: `npm run smoke -- golden ?clone` runs the
//                                        scenario with every message between client and host taken through JSON
//
// Exit code 0 only when every probe matches.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './headless.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith('--') && !a.startsWith('?'));
/** Query parameters for every page the scenario opens, as `&a&b=c` ('' for none). */
const extra = argv.filter((a) => a.startsWith('?') && a.length > 1).map((a) => '&' + a.slice(1)).join('');
const flag = (f) => argv.includes('--' + f);
const opt = (f, d) => { const i = argv.indexOf('--' + f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const log = (...a) => console.log(...a);

const SCENARIOS = {
  golden: () => import('./golden/golden.mjs'),
  legacy: async () => { const m = await import('./fixtures/legacy.mjs'); return { query: m.checkQuery, run: m.check, expect: m.expect }; },
  'legacy-make': async () => { const m = await import('./fixtures/legacy.mjs'); return { query: m.makeQuery, run: m.make }; },
  perf: () => import('./perf.mjs'),
  closetab: () => import('./closetab.mjs'),
  det: () => import('./det.mjs'),
  solofar: () => import('./solofar.mjs'),
  twotab: () => import('./twotab.mjs'),
  tpfar: () => import('./tpfar.mjs'),
  sameworld: () => import('./sameworld.mjs'),
  frames: () => import('./frames.mjs'),
};

/** Flatten nested probes to dotted paths so a diff names the exact field. */
function flatten(o, pre = '', out = {}) {
  if (o === null || typeof o !== 'object') { out[pre] = o; return out; }
  const keys = Object.keys(o);
  if (!keys.length) out[pre] = Array.isArray(o) ? [] : {};
  for (const k of keys) flatten(o[k], pre ? `${pre}.${k}` : k, out);
  return out;
}
export function diff(expected, got) {
  const e = flatten(expected), g = flatten(got), lines = [];
  for (const k of new Set([...Object.keys(e), ...Object.keys(g)])) {
    const a = JSON.stringify(e[k]), b = JSON.stringify(g[k]);
    if (a !== b) lines.push(`  ${k}\n    expected ${a ?? '(absent)'}\n    got      ${b ?? '(absent)'}`);
  }
  return lines;
}

/** This machine's first non-internal IPv4 address: what another machine on the LAN would type. */
function lanAddress() {
  for (const list of Object.values(networkInterfaces())) for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) return a.address;
  throw new Error('no LAN address: this machine has no IPv4 interface but loopback');
}
/** Build the client and the server into out/smoke and start the server on every interface; resolves with its LAN origin. */
async function startServer() {
  const root = resolve(here, '..'), out = join(root, 'out', 'smoke'), vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  for (const a of [['build', '--outDir', join(out, 'client'), '--emptyOutDir'], ['build', '-c', 'vite.server.config.ts', '--outDir', join(out, 'server')]]) {
    const r = spawnSync(process.execPath, [vite, ...a, '--logLevel', 'warn'], { cwd: root, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('the build failed');
  }
  const data = join(root, '.claude', 'mp-work', 'pad', 'smoke', `server-${Date.now()}`);
  mkdirSync(data, { recursive: true });
  const proc = spawn(process.execPath, [join(out, 'server', 'main.js'), '--data', data, '--port', '0', '--host', '0.0.0.0', '--seed', 'golden', '--harness', '--cheats'],
    { cwd: out, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  const port = await new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error('the server did not say where it listens:\n' + logs)), 30000);
    const read = (b) => { logs += b; const m = /listening on http:\/\/[^:]+:(\d+)\//.exec(logs); if (m) { clearTimeout(t); ok(Number(m[1])); } };
    proc.stdout.on('data', read); proc.stderr.on('data', read);
    proc.once('exit', (c) => { clearTimeout(t); no(new Error(`the server exited (${c}):\n${logs}`)); });
  });
  return {
    origin: `http://${lanAddress()}:${port}`, logs: () => logs,
    stop: async () => {
      if (proc.exitCode === null) { const gone = new Promise((ok) => proc.once('exit', ok)); proc.kill('SIGTERM'); await gone; }
      rmSync(data, { recursive: true, force: true });
    },
  };
}

async function once(sc, run) {
  const given = opt('server', ''), target = flag('server') ? (/^https?:\/\//.test(given) ? given : '') : null;
  const own = target === '' ? await startServer() : null;
  const origin = own ? own.origin : target, host = origin ? new URL(origin).host : null;
  if (origin) log(`${name} against the server at ${origin}`);
  let s;
  try { s = await launch(origin ? { base: origin, query: `server=${host}&name=Golden` + extra } : { query: sc.query + extra }); }
  catch (e) { await own?.stop(); throw e; }
  const t0 = Date.now();
  try {
    const probes = await sc.run({ ...s, log, extra, args: { flag, opt } });
    const errs = [...new Set(s.errors)].filter((e) => !/Failed to load resource/.test(e));
    if (errs.length) throw new Error('page errors:\n' + errs.slice(0, 10).join('\n'));
    log(`${name} run ${run}: finished in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    return probes;
  } finally { await s.close(); if (own) await own.stop(); }
}

async function main() {
  if (!name || !SCENARIOS[name]) { log(`usage: npm run smoke -- <${Object.keys(SCENARIOS).join('|')}> [?clone] [--repeat N] [--record]`); return 2; }
  const sc = await SCENARIOS[name]();
  const repeat = +opt('repeat', 1);
  for (let r = 1; r <= repeat; r++) {
    let probes;
    try { probes = await once(sc, r); } catch (e) { log(`${name} run ${r}: FAILED\n${e.stack || e}`); return 1; }
    if (probes === undefined) continue;
    let expected = sc.expect;
    if (name === 'golden') {
      const file = resolve(here, 'golden/baseline.json');
      if (flag('record')) { writeFileSync(file, JSON.stringify(probes, null, 1) + '\n'); log(`recorded ${file}`); continue; }
      expected = JSON.parse(readFileSync(file, 'utf8'));
    }
    if (!expected) { log(JSON.stringify(probes, null, 1)); continue; }
    const d = diff(expected, probes);
    if (d.length) { log(`${name} run ${r}: ${d.length} probe(s) differ\n${d.join('\n')}`); return 1; }
    log(`${name} run ${r}: all ${Object.keys(flatten(expected)).length} probes match`);
  }
  return 0;
}
process.exit(await main());
