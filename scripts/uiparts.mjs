// Draws the parts of the kit on a grid surface under Node and compares them, unit for unit, with the pixel maps of
// section 5 of docs/ui/DIRECTION.md, for every diagram that carries no text. A diagram is found by the line of the
// document its row 0 stands on, so a change to the document above a diagram moves these numbers.
//
//   node scripts/uiparts.mjs        prints `same` or the differing units of each part; exits 1 on any difference
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let faults = 0;
const L = readFileSync(ROOT + '/docs/ui/DIRECTION.md', 'utf8').split('\n');
const grab = (line, r0, n, x0, w) => Array.from({ length: n }, (_, i) => L[line - 1 + r0 + i].slice(5).slice(x0, x0 + w));
const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(ROOT + '/src/ui/kit/' + p);
const { GridSurface } = await load('surface.ts');
const pal = await load('palette.ts');
const ROLE = { 1: 'hi', 2: 'lt', 3: 'face', 4: 'sh', 5: 'dk', 6: 'pit' };
function render(w, h, fn, icons) { const g = new GridSurface(w, h); if (icons) g.setIcons(icons); fn(g); return g; }
function compare(name, g, rows, ramp = 'timber', ox = 0, oy = 0) {
  let bad = 0; const out = [];
  for (let y = 0; y < rows.length; y++) {
    let line = '';
    for (let x = 0; x < rows[y].length; x++) {
      let ch = rows[y][x];
      if (ROLE[ch]) ch = pal.CODE[pal.ci(pal.tone(ramp, ROLE[ch]))];
      const c = g.at(x + ox, y + oy);
      const got = c < 0 ? '.' : pal.CODE[c];
      if (got !== ch) { bad++; line += got; } else line += '·';
    }
    out.push(line);
  }
  if (bad) faults++;
  console.log(`${bad ? 'DIFF' : 'same'} ${name}${bad ? ` (${bad})` : ''}`);
  if (bad) console.log(out.map((l, i) => `${String(i).padStart(3)} ${l}   ${rows[i]}`).join('\n'));
}
const mods = {};
for (const m of ['parts/slab.ts', 'parts/slot.ts', 'parts/tabs.ts', 'parts/controls.ts', 'parts/gauges.ts', 'parts/hud.ts', 'parts/notices.ts', 'parts/book.ts', 'parts/plates.ts', 'parts/keycap.ts', 'parts/well.ts']) Object.assign(mods, await load(m));
const live = { hover: false, down: false, focus: false, t: 0 };
const paint = (g, n, l = live) => { g.translate(n.x, n.y); n.paint?.(g, l); for (const k of n.kids ?? []) paint(g, k, l); g.translate(-n.x, -n.y); };
const fakeUi = { scroll: () => 0, setScroll() {}, invalidate() {}, field: () => undefined, focused: () => null, t: 0, wake() {} };

// 5.1 slab 24 by 14
compare('slab', render(24, 14, (g) => paint(g, mods.slab({ x: 0, y: 0, w: 24, h: 14, ramp: 'timber' }))), grab(488, 0, 14, 0, 24));
// 5.1 a stone slab carries its tooling
compare('stone slab', render(60, 30, (g) => paint(g, mods.slab({ x: 0, y: 0, w: 60, h: 30, ramp: 'stone' }))), grab(510, 0, 30, 0, 60), 'stone');
// 5.4 slot states
const st = [{}, { mark: 'accepts' }, { mark: 'refused' }, { mark: 'chosen' }, { mark: 'locked' }];
st.forEach((o, i) => compare(`slot ${i}`, render(18, 18, (g) => mods.paintSlot(g, { ramp: 'timber', ...o }, { ...live, hover: i === 0 })), grab(643, 0, 18, i * 20, 18)));
compare('large slot', render(26, 26, (g) => mods.paintSlot(g, { ramp: 'timber', large: true }, live)), grab(699, 0, 26, 0, 26));
compare('dark slot', render(18, 18, (g) => mods.paintSlot(g, { ramp: 'dark' }, live)), grab(733, 0, 18, 0, 18), 'clay');
compare('dark slot hover', render(18, 18, (g) => mods.paintSlot(g, { ramp: 'dark' }, { ...live, hover: true })), grab(733, 0, 18, 20, 18), 'clay');
// 5.7 top tab: slab 60 wide from row 21, tabs chosen 0
{
  const g = render(60, 34, (g) => paint(g, mods.tabbedSlab({ x: 0, y: 21, w: 60, h: 40, ramp: 'timber', edge: 'top', tabs: [{ id: 'a', icon: 'x', name: 'a' }, { id: 'b', icon: 'x', name: 'b' }], chosen: 0 })));
  compare('top tabs', g, grab(931, 0, 34, 0, 60));
}
{
  const g = render(40, 56, (g) => paint(g, mods.tabbedSlab({ x: 21, y: -17, w: 40, h: 80, ramp: 'timber', edge: 'left', tabs: [{ id: 'a', icon: 'x', name: 'a' }, { id: 'b', icon: 'x', name: 'b' }, { id: 'c', icon: 'x', name: 'c' }], chosen: 1 })));
  compare('side tabs', g, grab(973, 6, 50, 0, 40), 'timber', 0, 6);
}
// 5.10 checkbox
compare('checkbox on', render(12, 12, (g) => paint(g, mods.checkbox({ id: 'c', x: 0, y: 0, on: true, host: 'clay' }))), grab(1119, 0, 12, 0, 12), 'clay');
// 5.11 slider: handle at 21 of a 60-wide groove
compare('slider', render(60, 14, (g) => paint(g, mods.slider({ id: 's', x: 0, y: 0, w: 60, value: 21 / 53, host: 'timber', ui: fakeUi }))), grab(1141, 0, 14, 0, 60));
// 5.13 arrow 60%, 5.14 flame 55%, upright 40%, channel
compare('arrow 0.6', render(22, 15, (g) => paint(g, mods.progressArrow({ x: 0, y: 0, f: 0.6, ramp: 'timber' }))), grab(1255, 0, 15, 24, 22));
compare('flame 0.55', render(13, 15, (g) => paint(g, mods.burnGauge({ x: 0, y: 0, f: 0.55, ramp: 'timber' }))), grab(1280, 0, 15, 15, 13));
compare('upright 0.4', render(6, 22, (g) => paint(g, mods.channel({ x: 0, y: 0, len: 22, f: 0.4, ramp: 'timber', upright: true }))), grab(1280, 0, 22, 30, 6));
compare('channel', render(42, 7, (g) => paint(g, mods.channel({ x: 0, y: 0, len: 42, f: 22 / 40, ramp: 'timber' }))), grab(1310, 0, 7, 0, 42));
// 5.15 strips
compare('thin strip', render(42, 5, (g) => paint(g, mods.strip({ x: 0, y: 0, w: 42, f: 24 / 40, tones: ['growth.lt', 'growth', 'growth.dk'], segments: 4, thin: true }))), grab(1368, 0, 5, 0, 42));
compare('strip', render(56, 7, (g) => paint(g, mods.strip({ x: 0, y: 0, w: 56, f: 27 / 54, was: 33 / 54, tones: ['blood.lt', 'blood', 'blood.dk'], segments: 3 }))), grab(1381, 0, 7, 0, 56));
// pips row: full, half, empty
for (const [k, r0] of [['life', 0], ['hunger', 9], ['arm', 20]]) {
  const g = render(29, 9, (g) => { mods.paintPip(g, k, 'full', 0, 0); mods.paintPip(g, k, 'half', 10, 0); mods.paintPip(g, k, 'empty', 20, 0); });
  compare(`pips ${k}`, g, grab(1327, r0, 9, 0, 29));
}
// 5.16 hotbar: first three cells, the first chosen (no icons, no count)
{
  const g = render(66, 24, (g) => paint(g, mods.hotbar({ x: 1, y: 1, chosen: 0, cells: [null, { icon: 'none', n: 64 }] })));
  compare('hotbar', g, grab(1398, 0, 24, 0, 66));
}
// 5.18 status frame
compare('status', render(18, 18, (g) => paint(g, mods.statusFrame({ x: 0, y: 0, icon: 'x', good: true, seconds: 999 }))), grab(1508, 0, 18, 0, 18));
// 5.19 book: the top left corner with its open tab and one not (its marks left out), and the bottom right corner with
// its arrow. These two diagrams are found by the sentence that leads into each, not by a line number.
{
  const row0 = (lead) => { const at = L.findIndex((l) => l.includes(lead)); return L.findIndex((l, k) => k > at && l.startsWith('  0  ')) + 1; };
  const sec = [{ id: 'a', name: 'a', icon: 'none' }, { id: 'c', name: 'c', icon: 'none' }, { id: 'd', name: 'd', icon: 'none' }];
  const g = render(298, 207, (g) => paint(g, mods.book({ id: 'b', x: 0, y: 21, sections: sec, chosen: 0, next: () => {} })), () => null);
  compare('book top left', g, grab(row0('The top left corner of the book'), 0, 34, 0, 52));
  compare('book bottom right', g, grab(row0('The bottom right corner with its arrow'), 0, 22, 0, 32), 'timber', 266, 185);
}
// 5.25 ping, 5.28 crosshair
compare('crosshair', render(9, 9, (g) => paint(g, mods.crosshair({ x: 0, y: 0 }))), grab(2098, 0, 9, 0, 9));
await server.close();
process.exit(faults ? 1 : 0);
