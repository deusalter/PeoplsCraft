// What uishot and uigrid share: a Vite server and a headless Chrome of their own, opening uikit.html, and the
// pixel-grid check of a screenshot against the frame the kit says it drew.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from './uipng.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAD = resolve(ROOT, '../../pad/ui');

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2), v = argv[i + 1];
    out[k] = v && !v.startsWith('--') ? (i++, v) : '1';
  }
  return out;
}

/** Starts the server and Chrome. Chrome gets the real GPU, its energy saver off and an sRGB output so that the colours a canvas holds are the colours a screenshot holds. */
export async function start() {
  const server = await createServer({ root: ROOT, server: { port: 0, strictPort: false, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  mkdirSync(PAD, { recursive: true });
  const profile = mkdtempSync(join(PAD, 'chrome-'));
  writeFileSync(join(profile, 'Local State'), JSON.stringify({ performance_tuning: { battery_saver_mode: { state: 0 } } }));
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: true, viewport: { width: 960, height: 540 }, deviceScaleFactor: 1,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--force-color-profile=srgb', '--mute-audio'],
  });
  return {
    origin, ctx,
    async close() { await ctx.close(); rmSync(profile, { recursive: true, force: true }); await server.close(); },
  };
}

/** Opens one screen at a viewport and scale and waits until the kit has painted it. */
export async function open(env, { screen, scale, width, height, extra = '' }) {
  const page = await env.ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width, height });
  await page.goto(`${env.origin}/uikit.html?screen=${encodeURIComponent(screen)}&scale=${scale}${extra}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__uikit && window.__uikit.ready, null, { timeout: 15000 });
  const hookErrors = await page.evaluate(() => window.__uikit.errors);
  errors.push(...hookErrors);
  return { page, errors };
}

/** A screenshot of the viewport, decoded, and the frame the kit drew. */
export async function capture(page) {
  const model = await page.evaluate(() => window.__uikit.frame());
  const png = await page.screenshot({ type: 'png' });
  return { png, img: decode(png), model };
}

export async function screens(env) {
  const { page } = await open(env, { screen: 'index', scale: 1, width: 480, height: 270 });
  const list = await page.evaluate(() => window.__uikit.screens);
  await page.close();
  return list;
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/**
 * The pixel-grid check. Every unit of the grid must be one flat colour; a unit the kit drew in a palette colour
 * must be exactly that colour; elsewhere only the world under a wash and the game's pictures may be off the palette.
 */
export function check(img, model, { limit = 12 } = {}) {
  const { s, ox, oy, w, h, cells, exempt } = model;
  const pal = model.palette ?? null;
  const faults = [];
  let mixed = 0, foreign = 0, wrong = 0;
  if (img.width !== model.W || img.height !== model.H) faults.push(`the shot is ${img.width} by ${img.height}, the canvas ${model.W} by ${model.H}`);
  const at = (x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
  for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
    const x0 = ox + u * s, y0 = oy + v * s;
    if (x0 + s > img.width || y0 + s > img.height) continue;
    const k = v * w + u;
    // The world behind the interface is whatever the game renders; only what the kit draws is held to the grid.
    if (exempt[k] === 'w') continue;
    const [r, g, b] = at(x0, y0);
    let flat = true, other = null;
    for (let j = 0; j < s && flat; j++) for (let i = 0; i < s; i++) {
      const [r2, g2, b2] = at(x0 + i, y0 + j);
      if (r2 !== r || g2 !== g || b2 !== b) { flat = false; other = hex(r2, g2, b2); break; }
    }
    if (!flat) {
      mixed++;
      if (faults.length < limit) faults.push(`unit ${u}, ${v} is not flat: ${hex(r, g, b)} and ${other}`);
      continue;
    }
    if (exempt[k] !== '.') continue;
    const c = hex(r, g, b);
    if (!pal.includes(c)) {
      foreign++;
      if (faults.length < limit) faults.push(`unit ${u}, ${v} is ${c}, which is not in the palette`);
    } else if (c !== pal[cells[k]]) {
      wrong++;
      if (faults.length < limit) faults.push(`unit ${u}, ${v} is ${c} where the kit drew ${pal[cells[k]]}`);
    }
  }
  return { ok: faults.length === 0, mixed, foreign, wrong, faults };
}
