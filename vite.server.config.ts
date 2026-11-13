// The Node server as one folder that runs with no node_modules: dist/server/main.js (and the generation
// worker beside it once it exists), every package inlined, next to the client build in dist/client.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const input: Record<string, string> = { main: resolve('server/main.ts') };
if (existsSync('server/genworker.ts')) input.genworker = resolve('server/genworker.ts');

export default defineConfig({
  // `ws` reads these when it loads; set, it never asks for its optional native add-ons, which are not in the bundle
  define: { 'process.env.WS_NO_BUFFER_UTIL': '"1"', 'process.env.WS_NO_UTF_8_VALIDATE': '"1"' },
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: true, outDir: 'dist/server', emptyOutDir: true, target: 'node22', minify: false, sourcemap: false,
    rollupOptions: { input, output: { format: 'es', entryFileNames: '[name].js', chunkFileNames: '[name]-[hash].js' } },
  },
});
