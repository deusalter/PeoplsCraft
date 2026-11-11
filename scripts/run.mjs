// Run a TypeScript entry point under Node: bundle it with Vite in SSR mode (the same resolver and
// transforms the game uses, so `src/` imports work unchanged), then execute the bundle.
//
//   node scripts/run.mjs <entry.ts> [args for the entry...]
//
// The bundle goes to out/run/<entry name>.mjs. Packages under node_modules stay external.
// The exit code is the entry's own.
import { build } from 'vite';
import { spawn } from 'node:child_process';
import { basename, extname, resolve } from 'node:path';

const [entry, ...rest] = process.argv.slice(2);
if (!entry) { console.error('usage: node scripts/run.mjs <entry.ts> [args...]'); process.exit(2); }
const name = basename(entry, extname(entry));
const outDir = resolve('out/run');

await build({
  logLevel: 'warn',
  configFile: false,
  build: {
    ssr: resolve(entry), outDir, emptyOutDir: false, minify: false, sourcemap: 'inline', target: 'node22',
    rollupOptions: { output: { format: 'es', entryFileNames: name + '.mjs' } },
  },
});

const child = spawn(process.execPath, ['--enable-source-maps', resolve(outDir, name + '.mjs'), ...rest], { stdio: 'inherit' });
child.on('exit', (code, sig) => process.exit(sig ? 1 : code ?? 1));
