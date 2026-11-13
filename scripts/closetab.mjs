// Smoke scenario `closetab` (ARCHITECTURE.md 8.2, risk R12): what closing the tab keeps of a solo world.
// The world is made and reopened through the title menu, so it runs as a player's does: in the
// simulation's worker, on its own clock. Each trial places a block, moves a stack into a chest, and
// closes the page a while after that last change without answering any prompt (the browser is not
// asked to run `beforeunload`). Then a new page opens the world from the menu and looks.
//
//   npm run smoke -- closetab          4 s: both changes are there, and again with the page's own `save` and `pause`
//                                      not sent (Chrome hides a page it closes, and that alone would keep them).
//                                      1 s: the world opens and is consistent (no item lost or doubled, the block there
//                                      exactly when its cobble is gone). Also: a change is saved by itself 3 s later,
//                                      hiding the tab saves at once, and "Save and quit to title" right after a change
//                                      keeps it.
//   npm run smoke -- closetab --r12    the table of risk R12: closed 1, 4 and 10 s after the change, with and
//                                      without the tab hidden first, and with the page asked to run `beforeunload`
//                                      (its prompt accepted) as well as closed outright. Prints what survived.
import { driver } from './golden/golden.mjs';

export const query = '';
const NAME = 'Closetab', SEED = 'closetab';
const STACKS = ['flint', 'feather', 'coal', 'iron_ore', 'oak_log', 'stick', 'torch', 'arrow', 'salve', 'oak_planks', 'iron_bar', 'workbench', 'furnace', 'bedroll'];
const COBBLE = 64;

export async function run({ page, ctx, origin, log, extra, errors, args }) {
  const watch = (p) => { p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); };
  const q = extra ? '?' + extra.slice(1) : '';
  let d = driver(page, log), cur = page, chest, gy, sx, sz;
  const cell = (dx, dy, dz) => [sx + dx, gy + dy, sz + dz];
  let changeSaved = false, hiddenSaved = false, asked = false;

  /** From the title menu of a fresh page, open the world and wait until it is in play. */
  const reopen = async (same = false) => {
    if (!same) { cur = await ctx.newPage(); watch(cur); await cur.goto(`${origin}/${q}`, { waitUntil: 'load' }); }
    await cur.click(`.world:has-text("${NAME}")`, { timeout: 20000 });
    d = driver(cur, log);
    await d.boot(); await d.grab();
    await d.ev(async () => { await D.caps(0, 0); await D.clearMobs(); });
  };
  /** What the world holds now of trial `i`'s two changes, and whether the items add up. */
  const look = async (i) => {
    const k = STACKS[i], block = await d.ev(([x, y, z]) => R.key(x, y, z), cell(i - 6, 1, -3));
    const box = (await d.ev((c) => R.container(...c), chest)) ?? [];
    const inChest = box.filter((s) => s && s.k === k).reduce((n, s) => n + s.n, 0), inPack = await d.ev((k) => R.count(k), k);
    const cobble = await d.ev(() => R.count('cobble'));
    return { block: block === 'cobble', stack: inChest > 0 && inPack === 0, inChest, inPack, cobble };
  };

  await d.step('make the world from the title menu', async () => {
    await page.click('button:has-text("Begin"), button:has-text("New world")');
    await page.fill('input[placeholder="World name"]', NAME);
    await page.fill('input[placeholder^="Seed"]', SEED);
    await page.click('button:has-text("Create world")');
    await d.boot(); await d.grab();
    if ((await d.ev(() => T.game.session.transport.kind)) !== 'worker') throw new Error('a world from the title menu is not on the worker transport');
    await d.cmd('god'); await d.cmd('time day');
    await d.ev(async () => { await D.caps(0, 0); await D.clearMobs(); });
    const me = await d.ev(() => R.me());
    sx = Math.floor(me.x); sz = Math.floor(me.z); gy = Math.floor(me.y) - 1;
    const r = 8;
    await d.ev(async ([x, y, z, r]) => { await D.fill(x - r, y - 3, z - r, x + r, y - 1, z + r, 'stone'); await D.fill(x - r, y, z - r, x + r, y, z + r, 'dirt'); await D.fill(x - r, y + 1, z - r, x + r, y + 14, z + r, 'air'); }, [sx, gy, sz, r]);
    await d.tp(sx + 0.5, gy + 1, sz + 0.5);
    for (const c of ['give chest 1', `give cobble ${COBBLE}`, ...STACKS.map((k) => `give ${k} 5`)]) {
      const rep = await d.cmd(c);
      if (!/^gave/.test(rep)) throw new Error(`${c}: ${rep}`);
    }
    chest = cell(2, 1, 0);
    await d.tp(sx + 2.5, gy + 1, sz + 2.5);
    await d.placeOn('chest', chest[0], gy, chest[2]);
    // what the trials start from is on disk before the first one
    await d.ev(() => D.save());
  });

  await d.step('a change is saved by itself 3 s later', async () => {
    const r = await d.ev(async () => {
      // A timer that an earlier change started saves within 3 s, and a change made while it ran starts one more. After
      // 3.2 s without a save the changes above have had theirs, and the time printed is this change's own.
      let was;
      do { was = T.game.lastSave; await T.run(3200); } while (T.game.lastSave !== was);
      const t0 = Date.now();
      await T.cmd('give dirt 1');
      const saved = await T.until(() => T.game.lastSave > was, 4500);
      return { saved, ms: T.game.lastSave - t0 };
    });
    if (!r.saved) throw new Error('nothing saved the change within 4.5 s of it');
    log(`  saved ${(r.ms / 1000).toFixed(2)} s after the change`);
    changeSaved = r.saved;
  });

  await d.step('hiding the tab saves at once', async () => {
    const r = await d.ev(async () => {
      // With a save a moment ago, the `pause` a hidden tab also sends is good for a save a second after that one, and the
      // change's own timer for one in 3 s: only the `save` the page sends at hiding is answered inside half a second.
      await D.save();
      await T.cmd('give dirt 1');
      const was = T.game.lastSave, t0 = Date.now();
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      const saved = await T.until(() => T.game.lastSave > was, 500), ms = T.game.lastSave - t0;
      delete document.hidden; delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
      return { saved, ms };
    });
    if (!r.saved) throw new Error('hiding the tab did not save within half a second');
    log(`  saved ${(r.ms / 1000).toFixed(2)} s after the tab was hidden`);
    hiddenSaved = r.saved;
  });

  /** Trial `i`: the two changes, then the page goes `after` ms after the second. */
  const trial = async (i, after, { hidden = false, unload = false, mute = false, quit = false } = {}) => {
    const k = STACKS[i], before = await look(i);
    await d.tp(sx + i - 6 + 0.5, gy + 1, sz - 1 + 0.5);
    await d.placeOn('cobble', ...cell(i - 6, 0, -3));
    const placed = Date.now();
    await d.tp(sx + 2.5, gy + 1, sz + 2.5);
    await d.useAt(...chest); await d.winOpen();
    const slot = await d.ev((k) => R.slotOf(k), k);
    await d.clickSlot(d.invView(35, slot), { modifiers: ['Shift'] });
    const t = Date.now();
    await d.closeWin();
    // `mute`: the page's own `save` and `pause` (which saves) at hiding and at closing are not sent, so only the host's timers can have kept anything
    if (mute) await d.ev(() => { const s = T.game.session, send = s.send.bind(s); s.send = (m) => { if (m.t !== 'save' && m.t !== 'pause') send(m); }; });
    const shown = await look(i);
    if (!shown.block || !shown.stack) throw new Error(`trial ${i}: the changes did not take (${JSON.stringify(shown)})`);
    if (hidden) {
      await cur.waitForTimeout(Math.max(0, after - 300 - (Date.now() - t)));
      // the tab goes to the background a moment before it is closed, as when a player switches away first
      await cur.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    await cur.waitForTimeout(Math.max(0, after - (Date.now() - t)));
    const waited = Date.now() - t;
    if (quit) {
      // the pause menu's "Save and quit to title" reloads the page into the title menu once the host says it saved
      cur.on('dialog', (dl) => { asked = true; void dl.accept(); });
      await cur.evaluate(() => T.game.menu.pause());
      await cur.click('button:has-text("Save and quit to title")');
      await cur.waitForSelector(`.world:has-text("${NAME}")`, { timeout: 20000 });
    } else if (unload) {
      cur.on('dialog', (dl) => void dl.accept());
      const gone = new Promise((res) => cur.once('close', res));
      await cur.close({ runBeforeUnload: true });
      await gone;
    } else await cur.close();
    await reopen(quit);
    const got = await look(i);
    const total = before.inChest + before.inPack;
    const consistent = got.inChest + got.inPack === total && got.cobble + (got.block ? 1 : 0) === before.cobble;
    return { i, item: k, after, waited, placedBefore: t - placed, hidden, unload, mute, block: got.block, stack: got.stack, consistent };
  };

  const results = [];
  if (args.flag('r12')) {
    let i = 0;
    if (args.flag('muted')) i = 12;
    if (i === 0) for (const unload of [false, true]) for (const hidden of [false, true]) for (const after of [1000, 4000, 10000]) {
      const r = await trial(i++, after, { hidden, unload });
      log(`  closed ${r.after / 1000} s after${r.hidden ? ', hidden first' : ''}${r.unload ? ', beforeunload run and its prompt accepted' : ', no beforeunload'}: block ${r.block ? 'kept' : 'lost'}, stack ${r.stack ? 'kept' : 'lost'}${r.consistent ? '' : ', INCONSISTENT'} (block placed ${(r.placedBefore / 1000).toFixed(1)} s before the stack moved)`);
      results.push(r);
    }
    for (const after of [1000, 4000]) {
      const r = await trial(i++, after, { mute: true });
      log(`  closed ${r.after / 1000} s after, no beforeunload, the page's own save and pause not sent: block ${r.block ? 'kept' : 'lost'}, stack ${r.stack ? 'kept' : 'lost'}${r.consistent ? '' : ', INCONSISTENT'} (block placed ${(r.placedBefore / 1000).toFixed(1)} s before the stack moved)`);
      results.push(r);
    }
    if (results.some((r) => !r.consistent)) throw new Error('a world opened inconsistent');
    return undefined;
  }
  const res = {};
  await d.step('close 4 s after the change', async () => {
    const r = res.after4 = await trial(0, 4000);
    if (!r.block || !r.stack || !r.consistent) throw new Error(`after 4 s: ${JSON.stringify(r)}`);
  });
  await d.step('close 4 s after the change, nothing sent at the close', async () => {
    const r = res.muted4 = await trial(3, 4000, { mute: true });
    if (!r.block || !r.stack || !r.consistent) throw new Error(`after 4 s with the page's own save and pause not sent: ${JSON.stringify(r)}`);
  });
  await d.step('close 1 s after the change', async () => {
    const r = res.after1 = await trial(1, 1000);
    if (!r.consistent) throw new Error(`after 1 s the world is not consistent: ${JSON.stringify(r)}`);
    log(`  after 1 s: block ${r.block ? 'kept' : 'lost'}, stack ${r.stack ? 'kept' : 'lost'} (block placed ${(r.placedBefore / 1000).toFixed(1)} s before the stack moved)`);
  });
  await d.step('quit to the title at once after the change', async () => {
    const r = res.quit = await trial(2, 0, { quit: true });
    if (!r.block || !r.stack || !r.consistent) throw new Error(`after quitting to the title: ${JSON.stringify(r)}`);
  });
  const { after4, muted4, after1, quit } = res;
  return { changeSaves: changeSaved, hiddenSaves: hiddenSaved, 'quit.noPrompt': !asked, 'quit.block': quit.block, 'quit.stack': quit.stack, 'after4.block': after4.block, 'after4.stack': after4.stack, 'after4.consistent': after4.consistent, 'muted4.block': muted4.block, 'muted4.stack': muted4.stack, 'muted4.consistent': muted4.consistent, 'after1.consistent': after1.consistent };
}

export const expect = { changeSaves: true, hiddenSaves: true, 'quit.noPrompt': true, 'quit.block': true, 'quit.stack': true, 'after4.block': true, 'after4.stack': true, 'after4.consistent': true, 'muted4.block': true, 'muted4.stack': true, 'muted4.consistent': true, 'after1.consistent': true };
