// Photographs the kit's screens through headless Chrome, the only way the interface is photographed.
//
//   node scripts/uishot.mjs --out <dir> [--screen <name>]
//
// For each screen it writes <name>@2.png (960 by 540 at scale 2), <name>@4.png (1920 by 1080 at scale 4) and
// <name>.zoom-<k>.png: the scale-1 drawing (480 by 270) enlarged eight times, in tiles no larger than 1600 by 1200.
// One line per screen says what was written and what the pixel-grid check found in the two shots.
//
// To see a state that needs the pointer or keys:  --press u,v  presses the unit u, v first; --type <text> types;
// --hover u,v  leaves the pointer over a unit. Such shots carry the drawn pointer, which the grid check does not
// model, so they are written but not checked.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { capture, check, open, parseArgs, screens, start } from './uilib.mjs';
import { crop, encode, enlarge } from './uipng.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.out) { console.error('uishot: --out <dir> is required'); process.exit(2); }
const out = resolve(args.out);
mkdirSync(out, { recursive: true });

/** Moves the pointer and types as the arguments ask; true when anything was done. */
async function act(page) {
  if (!args.press && !args.hover && !args.type) return false;
  const L = await page.evaluate(() => window.__uikit.frame());
  const to = (uv) => { const [u, v] = uv.split(',').map(Number); return [L.ox + u * L.s + Math.floor(L.s / 2), L.oy + v * L.s + Math.floor(L.s / 2)]; };
  if (args.press) { const [x, y] = to(args.press); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); }
  if (args.type) await page.keyboard.type(args.type, { delay: 10 });
  if (args.hover) { const [x, y] = to(args.hover); await page.mouse.move(x - 1, y - 1); await page.mouse.move(x, y); }
  await page.waitForTimeout(600);
  return true;
}

const ZOOM = 8, TILE_W = 1600, TILE_H = 1200;
const env = await start();
let code = 0;
try {
  const list = args.screen ? [args.screen] : await screens(env);
  for (const name of list) {
    const parts = [], notes = [];
    for (const [scale, width, height] of [[2, 960, 540], [4, 1920, 1080]]) {
      const { page, errors } = await open(env, { screen: name, scale, width, height });
      const acted = await act(page);
      const { png, img, model } = await capture(page);
      writeFileSync(join(out, `${name}@${scale}.png`), png);
      const r = acted ? { ok: true, faults: [] } : check(img, model);
      parts.push(`@${scale} ${model.w}x${model.h} ${acted ? 'acted' : r.ok ? 'clean' : `${r.mixed} mixed, ${r.foreign} foreign, ${r.wrong} wrong`}`);
      if (!r.ok) { code = 1; notes.push(...r.faults.slice(0, 3)); }
      if (errors.length) { code = 1; notes.push(...errors.slice(0, 3)); }
      await page.close();
    }
    const { page } = await open(env, { screen: name, scale: 1, width: 480, height: 270 });
    await act(page);
    const { img } = await capture(page);
    await page.close();
    const big = enlarge(img, ZOOM);
    const cols = Math.ceil(big.width / TILE_W), rows = Math.ceil(big.height / TILE_H);
    const tw = Math.ceil(big.width / cols), th = Math.ceil(big.height / rows);
    let k = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * tw, y = j * th, w = Math.min(tw, big.width - x), h = Math.min(th, big.height - y);
      const t = crop(big, x, y, w, h);
      writeFileSync(join(out, `${name}.zoom-${++k}.png`), encode(t.width, t.height, t.data));
    }
    parts.push(`zoom x${ZOOM} in ${k} tiles of ${tw}x${th}`);
    console.log(`${name.padEnd(8)} ${parts.join('  ')}${notes.length ? '\n  ' + notes.join('\n  ') : ''}`);
  }
} catch (e) { console.error(e); code = 1; }
await env.close();
process.exit(code);
