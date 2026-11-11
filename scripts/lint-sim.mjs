// Keeps src/sim headless and deterministic. The pure tsconfig already rejects DOM types; this catches
// what a type check cannot: wall-clock time, unseeded randomness, timers, direct logging, and imports
// that leave the pure program (three, any package, any client folder).
//
//   node scripts/lint-sim.mjs      exit code 1 and a file:line list when something is found
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const simDir = join(root, 'src', 'sim');

const BANNED = [
  [/\bMath\s*\.\s*random\b/, 'Math.random: draw from the seeded stream (sim.rnd) or take a rnd argument'],
  [/\bDate\s*\.\s*now\b|\bnew\s+Date\b/, 'wall-clock time: use sim.tick'],
  [/\bperformance\.\w/, 'performance.*: time comes from the host'],
  [/\b(?:set|clear)(?:Timeout|Interval)\b|\brequestAnimationFrame\b/, 'timers belong to the host'],
  [/\bconsole\.\w/, 'console.*: log through deps.log'],
];
const IMPORT = /\bfrom\s*(['"])([^'"]+)\1|\bimport\s*\(\s*(['"])([^'"]+)\3|\bimport\s*(['"])([^'"]+)\5/g;

// A sim file may import only what the pure program compiles: the include list of tsconfig.sim.json.
const pure = JSON.parse(readFileSync(join(root, 'tsconfig.sim.json'), 'utf8')).include.map((p) => resolve(root, p).replace(/\.ts$/, ''));
const inPure = (file) => pure.some((p) => file === p || file.startsWith(p + sep));

function walk(dir, out = []) {
  let list;
  try { list = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of list) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(ts|mts|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of walk(simDir)) {
  const lines = readFileSync(file, 'utf8').split('\n'), name = relative(root, file);
  lines.forEach((line, i) => {
    for (const [re, why] of BANNED) if (re.test(line)) problems.push(`${name}:${i + 1}: ${why}`);
    for (const m of line.matchAll(IMPORT)) {
      const spec = m[2] ?? m[4] ?? m[6];
      if (!spec.startsWith('.')) { problems.push(`${name}:${i + 1}: import of '${spec}': the sim has no packages`); continue; }
      const target = resolve(dirname(file), spec).replace(/\.ts$/, '');
      if (!inPure(target)) problems.push(`${name}:${i + 1}: import of '${spec}' leaves the pure program (${relative(root, target)})`);
    }
  });
}

if (problems.length) { console.error(`lint-sim: ${problems.length} problem(s)\n` + problems.join('\n')); process.exit(1); }
console.log('lint-sim: src/sim is clean');
