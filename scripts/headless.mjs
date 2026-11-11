// Headless browser harness for automated checks. Starts a Vite dev server on a free port,
// opens the game in the installed Chrome (no browser download), runs a script against the
// page and saves screenshots.
//
//   node scripts/headless.mjs --query "quick=test&fresh" --run path/to/script.mjs --out out/dir
//   node scripts/headless.mjs --query "gallery=tiles&scale=6" --shot gallery.png --out out/dir
//
// The script module default-exports async ({ page, shot, log, url }) => any. `shot(name)` writes
// <out>/<name>.png. Inside page.evaluate the game's own hooks are available as window.T.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith('--') ? [...a, [v.slice(2), l[i + 1] && !l[i + 1].startsWith('--') ? l[i + 1] : '1']] : a), []));
const out = resolve(args.out ?? 'out/headless');
mkdirSync(out, { recursive: true });
const [w, h] = (args.size ?? '1280x720').split('x').map(Number);

export async function launch({ query = '', base, width = w, height = h, headed = false } = {}) {
  let server = null, origin = base;
  if (!origin) {
    server = await createServer({ server: { port: 0, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
    await server.listen();
    origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  const browser = await chromium.launch({
    channel: 'chrome', headless: !headed,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const url = `${origin}/${query ? '?' + query : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  return {
    page, ctx, browser, url, origin, errors,
    shot: async (name, opts = {}) => { const p = resolve(out, name.endsWith('.png') ? name : name + '.png'); await page.screenshot({ path: p, ...opts }); return p; },
    newPage: async (q = query) => { const p = await ctx.newPage(); await p.goto(`${origin}/${q ? '?' + q : ''}`, { waitUntil: 'load' }); return p; },
    close: async () => { await browser.close(); if (server) await server.close(); },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = await launch({ query: args.query ?? '', base: args.base, headed: !!args.headed });
  let code = 0;
  try {
    if (args.run) {
      const mod = await import(pathToFileURL(resolve(args.run)).href);
      const r = await mod.default({ ...s, log: (...a) => console.log(...a), args });
      if (r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
    } else {
      await s.page.waitForTimeout(+(args.wait ?? 1500));
      console.log(await s.shot(args.shot ?? 'page'));
    }
  } catch (e) { console.error(e); code = 1; }
  if (s.errors.length) console.log('PAGE ERRORS\n' + [...new Set(s.errors)].slice(0, 20).join('\n'));
  await s.close();
  process.exit(code);
}
