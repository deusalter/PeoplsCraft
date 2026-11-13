// Smoke scenario `sameworld` (ARCHITECTURE.md 8.2, D38): one world is played in one tab at a time. Two tabs
// saving one world each from its own memory would leave storage holding a mix of both, and a world deleted from
// one tab's menu while another plays it would come back with only that tab's latest changes.
//
//   npm run smoke -- sameworld
//
// 1. Tab A makes a world from the title menu and plays it. Tab B's menu lists it, but neither deletes it nor
//    opens it, and says why.
// 2. A is closed: B opens the world. B reloads (as "Save and quit to title" does) and opens it again at once.
export const query = '';
const NAME = 'Sameworld';

export async function run({ page, ctx, origin, log, extra, errors }) {
  const p = {};
  const q = extra ? '?' + extra.slice(1) : '';
  const watch = (pg) => { pg.on('pageerror', (e) => errors.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); return pg; };
  const open = async () => { const pg = watch(await ctx.newPage()); await pg.goto(`${origin}/${q}`, { waitUntil: 'load' }); return pg; };
  const t0 = Date.now(), lap = (what) => log(`  ${what} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const row = `.world:has-text("${NAME}")`;
  /** Click the world in the menu; true when it comes into play, else what the page says instead. */
  const play = async (pg) => {
    if (!(await pg.waitForSelector(row, { timeout: 20000 }).catch(() => null))) return 'not listed';
    await pg.click(row);
    const r = await pg.waitForFunction(() => (window.T ? 'T' : document.querySelector('#loading .msg')?.textContent || ''), null, { timeout: 60000, polling: 100 })
      .then((h) => h.jsonValue());
    if (r !== 'T') {
      // a world that is opening shows its progress here as well: wait a moment for what it settles on
      await pg.waitForTimeout(3000);
      if (!(await pg.evaluate(() => !!window.T))) return pg.evaluate(() => document.querySelector('#loading .msg')?.textContent ?? '');
    }
    return pg.evaluate(() => T.loaded());
  };

  const a = page;
  await a.click('button:has-text("Begin"), button:has-text("New world")');
  await a.fill('#menu input[type=text] >> nth=0', NAME);
  await a.click('button:has-text("Create world")');
  await a.waitForFunction(() => window.T, null, { timeout: 60000 });
  p['a.plays'] = await a.evaluate(() => T.loaded());
  await a.evaluate(async () => { T.grab(true); await T.cmd('give stick 3'); await T.game.save(); });
  lap('tab A plays the world');

  const b = await open();
  await b.waitForSelector(row, { timeout: 20000 });
  await b.click(`${row} button:has-text("Delete")`);
  await b.click(`${row} button:has-text("Sure?")`);
  // a refusal is looked at again for 2 s, in case the tab that holds the world is only reloading
  await b.waitForTimeout(3000);
  p['b.deleteKept'] = await b.evaluate((n) => [...document.querySelectorAll('.world .nm')].some((e) => e.textContent === n), NAME);
  p['b.deleteSays'] = await b.evaluate((n) => [...document.querySelectorAll('.world')].find((e) => e.querySelector('.nm')?.textContent === n)?.querySelector('button')?.textContent ?? null, NAME);
  lap('tab B could not delete it');
  p['b.opens'] = await play(b);
  p['a.stillPlays'] = await a.evaluate(async () => !!(await T.cmd('seed')));
  lap('tab B could not open it');

  await a.close();
  await b.reload({ waitUntil: 'load' });
  p['free.opens'] = await play(b);
  p['free.kept'] = await b.evaluate(() => T.game.inv.count('stick'));
  lap('tab A closed: tab B opens it');
  await b.evaluate(async () => { await T.game.save(); });
  await b.reload({ waitUntil: 'load' });
  p['reload.opens'] = await play(b);
  lap('tab B reloaded and opened it again');
  return p;
}

export const expect = {
  'a.plays': true,
  'b.deleteKept': true, 'b.deleteSays': 'Open in another tab',
  'b.opens': 'This world is open in another tab. Close it there to play it here.',
  'a.stillPlays': true,
  'free.opens': true, 'free.kept': 3,
  'reload.opens': true,
};
