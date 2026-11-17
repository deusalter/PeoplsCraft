// The pixel-grid check on real screenshots of the kit's screens.
//
//   node scripts/uigrid.mjs [--screen <name>] [--strict]     every screen at scales 2, 3 and 4
//   node scripts/uigrid.mjs --selftest                       proves the check catches faults planted in a shot
//
// At scale s every block of s by s device pixels on the grid must be one flat colour (a mixed block is something
// drawn off the grid, on a half unit, or smoothed), and a unit the kit drew must be exactly the palette colour it
// drew. The world behind a window and the game's sample pictures are exempt by region, as the kit reports them.
import { capture, check, open, parseArgs, screens, start } from './uilib.mjs';

const args = parseArgs(process.argv.slice(2));
const SIZES = { 2: [960, 540], 3: [1440, 810], 4: [1920, 1080] };

async function run(env) {
  const list = args.screen ? [args.screen] : await screens(env);
  let bad = 0;
  for (const name of list) {
    const parts = [], notes = [];
    for (const s of [2, 3, 4]) {
      const [width, height] = SIZES[s];
      const { page, errors } = await open(env, { screen: name, scale: s, width, height, extra: args.strict ? '&strict=1' : '' });
      const { img, model } = await capture(page);
      await page.close();
      const r = check(img, model);
      if (model.s !== s) { r.ok = false; r.faults.unshift(`drawn at scale ${model.s}, not ${s}`); }
      if (errors.length) { r.ok = false; r.faults.unshift(...errors.map((e) => `page error: ${e}`)); }
      parts.push(`s${s} ${r.ok ? 'ok' : 'FAIL'}`);
      if (!r.ok) { bad++; notes.push(...r.faults.slice(0, 6).map((f) => `s${s}: ${f}`)); }
    }
    console.log(`${name.padEnd(8)} ${parts.join('  ')}${notes.length ? '\n  ' + notes.join('\n  ') : ''}`);
  }
  return bad;
}

/** Copies an image so that a fault can be planted in it. */
function clone(img) { return { width: img.width, height: img.height, data: Buffer.from(img.data) }; }

/** The first unit at or after (u0, v0) that the kit drew in a palette colour and whose right neighbour differs. */
function edgeUnit(model, u0, v0) {
  const { w, h, cells, exempt } = model;
  for (let v = v0; v < h; v++) for (let u = v === v0 ? u0 : 0; u < w - 1; u++) {
    const k = v * w + u;
    if (exempt[k] === '.' && exempt[k + 1] === '.' && cells[k] !== cells[k + 1]) return [u, v];
  }
  throw new Error('selftest: no edge to plant a fault on');
}

async function selftest(env) {
  const { page } = await open(env, { screen: 'type', scale: 2, width: 960, height: 540 });
  const { img, model } = await capture(page);
  await page.close();
  const { s, ox, oy } = model;
  const results = [];
  const expect = (what, r, wantFail) => {
    const caught = wantFail ? !r.ok : r.ok;
    results.push(caught);
    console.log(`${caught ? 'ok  ' : 'MISS'} ${what}: ${r.ok ? 'passes' : r.faults[0]}`);
  };

  expect('the clean shot', check(img, model), false);

  // Part of a line of text moved right by one device pixel: half a unit at scale 2.
  {
    const f = clone(img), [u, v] = edgeUnit(model, 40, 20);
    const x0 = ox + u * s, y0 = oy + v * s, w = 24 * s, hgt = 10 * s;
    for (let y = y0; y < y0 + hgt; y++) f.data.copyWithin((y * f.width + x0 + 1) * 4, (y * f.width + x0) * 4, (y * f.width + x0 + w) * 4);
    expect('a run of text set half a unit to the right', check(f, model), true);
  }
  // One unit in a colour that is not the palette's.
  {
    const f = clone(img), [u, v] = edgeUnit(model, 100, 60);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) f.data.set([0x12, 0x88, 0xff, 255], (((oy + v * s + y) * f.width) + ox + u * s + x) * 4);
    expect('one unit outside the palette', check(f, model), true);
  }
  // A smoothed edge: the pixels across one edge averaged with their neighbours.
  {
    const f = clone(img), [u, v] = edgeUnit(model, 20, 100);
    const x = ox + (u + 1) * s - 1, y = oy + v * s;
    for (let c = 0; c < 3; c++) {
      const a = img.data[(y * f.width + x) * 4 + c], b = img.data[(y * f.width + x + 1) * 4 + c];
      f.data[(y * f.width + x) * 4 + c] = (a + b) >> 1;
    }
    expect('one smoothed pixel on an edge', check(f, model), true);
  }
  // A palette colour where the kit drew another.
  {
    const f = clone(img), [u, v] = edgeUnit(model, 60, 140);
    const k = v * model.w + u + 1, c = model.palette[model.cells[k]];
    const rgb = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) f.data.set([...rgb, 255], (((oy + v * s + y) * f.width) + ox + u * s + x) * 4);
    expect('a unit painted the colour of its neighbour', check(f, model), true);
  }
  // A part placed on a half unit in the page itself: the kit must refuse to draw it.
  {
    const { page: p, errors } = await open(env, { screen: 'parts', scale: 2, width: 960, height: 540, extra: '&fault=half' });
    await p.close();
    const r = errors.length ? { ok: false, faults: [errors[0]] } : { ok: true, faults: [] };
    expect('a node at x 10.5 in the parts screen', r, true);
  }
  const missed = results.filter((c) => !c).length;
  console.log(missed ? `selftest: ${missed} not caught` : 'selftest: every planted fault was caught');
  return missed;
}

const env = await start();
let code = 0;
try {
  code = (args.selftest ? await selftest(env) : await run(env)) ? 1 : 0;
} catch (e) { console.error(e); code = 1; }
await env.close();
process.exit(code);
