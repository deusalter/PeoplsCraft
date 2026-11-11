// Smoke scenarios against the real game in headless Chrome (see headless.mjs for the browser).
//
//   npm run smoke -- golden              scripted play-through, compared with scripts/golden/baseline.json
//   npm run smoke -- golden --record     write that baseline from this run instead
//   npm run smoke -- legacy              open the saves in scripts/fixtures/legacy-v1.json in this build
//   npm run smoke -- legacy-make         rebuild that fixture from this build
//   npm run smoke -- perf                the scripted 20 s flight at view 12 (docs/multiplayer/MEASUREMENTS.md)
//   --repeat N                           run N times, stop at the first failure
//
// Exit code 0 only when every probe matches.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './headless.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith('--'));
const flag = (f) => argv.includes('--' + f);
const opt = (f, d) => { const i = argv.indexOf('--' + f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const log = (...a) => console.log(...a);

const SCENARIOS = {
  golden: () => import('./golden/golden.mjs'),
  legacy: async () => { const m = await import('./fixtures/legacy.mjs'); return { query: m.checkQuery, run: m.check, expect: m.expect }; },
  'legacy-make': async () => { const m = await import('./fixtures/legacy.mjs'); return { query: m.makeQuery, run: m.make }; },
  perf: () => import('./perf.mjs'),
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

async function once(sc, run) {
  const s = await launch({ query: sc.query });
  const t0 = Date.now();
  try {
    const probes = await sc.run({ ...s, log, args: { flag, opt } });
    const errs = [...new Set(s.errors)].filter((e) => !/Failed to load resource/.test(e));
    if (errs.length) throw new Error('page errors:\n' + errs.slice(0, 10).join('\n'));
    log(`${name} run ${run}: finished in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    return probes;
  } finally { await s.close(); }
}

async function main() {
  if (!name || !SCENARIOS[name]) { log(`usage: npm run smoke -- <${Object.keys(SCENARIOS).join('|')}> [--repeat N] [--record]`); return 2; }
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
