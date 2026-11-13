// Builds the kit's mock screens under Node, with no browser, at the virtual screens section 3 names, and paints each
// on a grid surface. It fails on a node off the whole-unit grid, on a part that leaves the screen, on two stops for
// Tab (slots, buttons, fields) that overlap, and on any screen that throws while it is built or painted.
//
//   node scripts/uilayout.mjs [--screen <name>] [--png <dir>]      prints one line to a screen; exits 1 on any fault
//
// With --png it also writes each frame the grid holds, at three pixels to the unit, as <name>@<w>x<h>.png: a picture
// drawn under Node from palette indices, for the sizes the shot script does not take (the narrow 320 by 240).
import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from './uilib.mjs';
import { encode, enlarge } from './uipng.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const SIZES = [[320, 240], [400, 240], [427, 240], [480, 270], [573, 240]];

const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(ROOT + '/src/ui/kit/' + p);
let bad = 0;
try {
  const { layout } = await load('scale.ts');
  const { GridSurface } = await load('surface.ts');
  const { HEX } = await load('palette.ts');
  const { SCREEN_FILES, SAMPLE_ICONS } = await load('screens/index.ts');
  const { ITEMS } = await load('mock/icons.ts');
  const { TAB_MARKS } = await load('art/icons.ts');
  const icons = (k) => ITEMS[k] ?? TAB_MARKS[k] ?? SAMPLE_ICONS[k] ?? null;
  const names = args.screen ? Object.keys(SCREEN_FILES).filter((n) => n === args.screen || n.startsWith(`${args.screen}-`)) : Object.keys(SCREEN_FILES);
  for (const name of names) {
    const faults = [];
    for (const [w, h] of SIZES) {
      const scrolls = new Map();
      const ui = {
        layout: layout(w, h, 1), w, h, t: 10, held: null,
        scroll: (id) => scrolls.get(id) ?? 0, setScroll: (id, v) => scrolls.set(id, v),
        field: () => undefined, focused: () => null, focusOn() {}, refuse() {}, cue() {}, invalidate() {}, wake() {},
      };
      let tree;
      try { tree = SCREEN_FILES[name].build(ui); } catch (e) { faults.push(`${w}x${h}: build threw ${e.message}`); continue; }
      const stops = [];
      const walk = (n, ax, ay) => {
        for (const v of [n.x, n.y, n.w, n.h]) if (!Number.isInteger(v)) faults.push(`${w}x${h}: ${n.id ?? 'a node'} at ${v}, not a whole unit`);
        const x = ax + n.x, y = ay + n.y;
        if ((n.paint || n.focus) && !n._clip && (x < 0 || y < 0 || x + n.w > w || y + n.h > h)) faults.push(`${w}x${h}: ${n.id ?? 'a part'} at ${x}, ${y}, ${n.w} by ${n.h} leaves the screen`);
        if (n.focus && n.id) stops.push({ id: n.id, x, y, w: n.w, h: n.h, clip: n._clip });
        for (const k of n.kids ?? []) { if (n.clip || n._clip) k._clip = true; walk(k, x, y); }
      };
      walk(tree, 0, 0);
      for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) {
        const a = stops[i], b = stops[j];
        if (a.clip || b.clip) continue;
        // Tabs along one edge share an outline column, so an overlap one unit wide is the construction, not a fault.
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 1 && oy > 1) faults.push(`${w}x${h}: ${a.id} and ${b.id} overlap`);
      }
      const g = new GridSurface(w, h);
      g.setIcons(icons);
      const live = { hover: false, down: false, focus: false, t: 10 };
      const paint = (n) => {
        g.translate(n.x, n.y);
        n.paint?.(g, live);
        if (n.kids?.length) { if (n.clip) g.clip(0, 0, n.w, n.h); for (const k of n.kids) paint(k); if (n.clip) g.unclip(); }
        g.translate(-n.x, -n.y);
      };
      try { paint(tree); } catch (e) { faults.push(`${w}x${h}: paint threw ${e.message}`); }
      if (args.png) {
        const data = Buffer.alloc(w * h * 4);
        for (let i = 0; i < w * h; i++) {
          const c = g.cells[i];
          // The world is sky; a wash over a colour is drawn as its colour's stand-in would be, the world under it darker.
          const hex = c >= 0 ? HEX[c] : c === -4 ? '#191b26' : c === -2 ? '#ff00ff' : '#5a7da8';
          data.writeUInt32BE(((parseInt(hex.slice(1), 16) << 8) | 0xff) >>> 0, i * 4);
        }
        const big = enlarge({ width: w, height: h, data }, 3);
        mkdirSync(args.png, { recursive: true });
        writeFileSync(join(args.png, `${name}@${w}x${h}.png`), encode(big.width, big.height, big.data));
      }
    }
    const uniq = [...new Set(faults)];
    if (uniq.length) bad++;
    console.log(`${name.padEnd(16)} ${uniq.length ? `${uniq.length} faults\n  ${uniq.slice(0, 8).join('\n  ')}` : 'ok'}`);
  }
} finally {
  await server.close();
}
process.exit(bad ? 1 : 0);
