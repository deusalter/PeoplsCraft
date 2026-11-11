// Unit tests of the code that runs without a browser. Every scripts/tests/*.test.ts is bundled and
// run under plain Node (scripts/run.mjs), one after the other; a test file uses node:test.
//
//   npm test                 all of them
//   npm test -- invops       only the files whose name contains "invops"
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2);
const files = readdirSync(join(root, 'scripts', 'tests')).filter((f) => f.endsWith('.test.ts') && (!only.length || only.some((o) => f.includes(o)))).sort();
if (!files.length) { console.error('no test files match'); process.exit(2); }
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'run.mjs'), join('scripts', 'tests', f)], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `${failed} of ${files.length} test file(s) failed` : `${files.length} test file(s) passed`);
process.exit(failed ? 1 : 0);
