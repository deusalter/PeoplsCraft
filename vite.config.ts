import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  // Scratch worktrees live under .claude/; an .html written there would reload every open page.
  server: { port: 5173, strictPort: false, watch: { ignored: ['**/.claude/**'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
