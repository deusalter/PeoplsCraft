// Smoke scenario `twotab` (ARCHITECTURE.md 8.2, risk R8): the database's upgrade to version 2 while another tab
// holds version 1 open, two handles on it at once (a page and the simulation's worker), and a database a newer
// build has written.
//
//   npm run smoke -- twotab
//
// 1. A tab of the old build (a page of the same origin that opens "cairnlight" at version 1 and never lets go)
//    holds the database. The game in a second tab says why it waits, and opens its menu, with the old world,
//    once that tab is closed. The database is then at version 2.
// 2. That world is played in the worker while a third tab lists the worlds and a save goes through.
// 3. A tab upgrades the database past this build. The worker's handle lets it go, and a new tab of this build says
//    that a newer version saved these worlds, in its menu and in the banner of a world begun there.
export const query = 'gallery=icons';

/** Runs in a page with no game script: the database as the build before stage 2 made it, with one world never saved. */
async function holdV1() {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairnlight', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('worlds', { keyPath: 'id' }); r.result.createObjectStore('chunks'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const t = db.transaction('worlds', 'readwrite');
    t.objectStore('worlds').put({ id: 'w-old', name: 'Old world', seed: 7, seedText: '7', created: Date.now(), played: Date.now(), data: null });
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });
  // the old build closed its handle on nothing: this one is kept, as a tab of that build left open would keep it
  window.held = db;
  return db.version;
}
async function upgradeTo(v) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('cairnlight', v);
    r.onupgradeneeded = () => {};
    r.onsuccess = () => { const n = r.result.version; r.result.close(); res(n); };
    r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
  });
}
const version = () => new Promise((res) => { const r = indexedDB.open('cairnlight'); r.onsuccess = () => { const n = r.result.version; r.result.close(); res(n); }; });

export async function run({ page, ctx, origin, log, extra, errors }) {
  const p = {};
  const watch = (pg) => { pg.on('pageerror', (e) => errors.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error' && !/Save failed|save failed|could not be saved|InvalidStateError|closing/i.test(m.text())) errors.push(m.text()); }); return pg; };
  const open = async (q = '') => { const pg = watch(await ctx.newPage()); await pg.goto(`${origin}/${q || extra ? '?' + (q + extra).replace(/^&/, '') : ''}`, { waitUntil: 'load' }); return pg; };
  const t0 = Date.now(), lap = (what) => log(`  ${what} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  p['old.version'] = await page.evaluate(holdV1);
  const b = await open();
  await b.waitForFunction(() => /close it to continue/.test(document.querySelector('#loading .msg')?.textContent ?? ''), null, { timeout: 15000 });
  p['blocked.says'] = await b.evaluate(() => document.querySelector('#loading .msg').textContent);
  await b.waitForTimeout(1500);
  p['blocked.stillWaiting'] = await b.evaluate(() => !document.querySelector('#menu') && !!document.querySelector('#loading'));
  lap('the game waits for the old tab');
  await page.close();
  await b.waitForSelector('.world:has-text("Old world")', { timeout: 15000 });
  p['upgraded.menuLists'] = true;
  p['upgraded.version'] = await b.evaluate(version);
  lap('the old tab closed: the menu lists the old world');

  await b.click('.world:has-text("Old world")');
  await b.waitForFunction(() => window.T, null, { timeout: 60000 });
  p['play.loaded'] = await b.evaluate(() => T.loaded());
  p['play.worker'] = await b.evaluate(() => T.game.session.transport.kind);
  const c = await open();
  await c.waitForSelector('.world:has-text("Old world")', { timeout: 15000 });
  p['second.lists'] = true;
  p['play.saved'] = await b.evaluate(async () => { T.grab(true); await T.cmd('give stick 3'); const was = T.game.lastSave; await T.game.save(); return T.game.lastSave > was; });
  await c.close();
  lap('played in the worker while another tab listed the worlds');

  const d = watch(await ctx.newPage());
  await d.goto(`${origin}/?gallery=icons`, { waitUntil: 'load' });
  p['newer.version'] = await d.evaluate(upgradeTo, 3);
  await d.close();
  lap('a newer build upgraded the database while the world was open');
  const e = await open();
  await e.waitForSelector('#menu .warn', { timeout: 15000 });
  p['newer.menu'] = await e.evaluate(() => document.querySelector('#menu .warn').textContent);
  await e.click('button:has-text("Begin"), button:has-text("New world")');
  await e.click('button:has-text("Create world")');
  await e.waitForFunction(() => window.T, null, { timeout: 60000 });
  // the banner is shown as the world comes into play and then gives way to the world's name: every one shown is kept
  await e.evaluate(() => { const h = T.game.hud, show = h.showBanner.bind(h); window.banners = []; h.showBanner = (t, sub, c) => { window.banners.push([t, sub]); show(t, sub, c); }; });
  await e.evaluate(() => T.loaded());
  p['newer.banner'] = await e.evaluate(() => (window.banners.find(([t]) => t === 'Saving is unavailable') ?? [null, null])[1]);
  p['newer.agree'] = /newer version/.test(p['newer.menu']) && /newer version/.test(p['newer.banner']);
  lap('a tab of this build says a newer version saved these worlds, in the menu and in the game');
  return p;
}

export const expect = {
  'old.version': 1,
  'blocked.says': 'Another tab holds this game open: close it to continue.',
  'blocked.stillWaiting': true,
  'upgraded.menuLists': true, 'upgraded.version': 2,
  'play.loaded': true, 'play.worker': 'worker', 'second.lists': true, 'play.saved': true,
  'newer.version': 3,
  'newer.menu': 'These worlds were saved by a newer version of the game. Nothing will be saved here.',
  'newer.banner': 'These worlds were saved by a newer version of the game. Progress is lost when the tab closes.',
  'newer.agree': true,
};
