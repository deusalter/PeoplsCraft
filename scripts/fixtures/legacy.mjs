// Saves made by the pre-multiplayer build, and the smoke scenarios that make and open them.
//
//   npm run smoke -- legacy-make   play two worlds and dump their IndexedDB records to legacy-v1.json. Only a build from
//                                  before the save format changed can make them: this one refuses.
//   npm run smoke -- legacy        load legacy-v1.json into a fresh profile at IndexedDB version 1, open both worlds, probe:
//                                  what the maker saw is still there, and the old world record is kept as a backup
//
// legacy-v1.json holds every `worlds` record and every `chunks` record (with its key) of database
// "cairnlight" version 1, byte arrays as {"$u8": base64}, plus `expect`: what the maker saw at the
// moment it saved, which `legacy` checks the current build against.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { driver, installHelpers } from '../golden/golden.mjs';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), 'legacy-v1.json');
const MAIN = 'legacyfix', DEAD = 'legacydead';

// ---- IndexedDB dump and loader (both run inside the page) ----

/** Every record of both stores, byte arrays as base64. */
async function dumpDb() {
  const enc = (v) => {
    if (v instanceof Uint8Array) { let s = ''; for (let i = 0; i < v.length; i += 0x8000) s += String.fromCharCode(...v.subarray(i, i + 0x8000)); return { $u8: btoa(s) }; }
    if (Array.isArray(v)) return v.map(enc);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]));
    return v;
  };
  const db = await new Promise((res, rej) => { const r = indexedDB.open('cairnlight', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const all = (store) => new Promise((res, rej) => {
    const out = [], r = db.transaction(store, 'readonly').objectStore(store).openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) { res(out); return; } out.push([c.key, enc(c.value)]); c.continue(); };
    r.onerror = () => rej(r.error);
  });
  const worlds = (await all('worlds')).map(([, v]) => v), chunks = await all('chunks');
  db.close();
  return { worlds, chunks };
}

/** Write a dump into database "cairnlight" at version 1, creating it as SaveDB.open does. */
async function loadDb(dump) {
  const dec = (v) => {
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === 'object') {
      if (typeof v.$u8 === 'string') { const s = atob(v.$u8), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]));
    }
    return v;
  };
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairnlight', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('worlds')) d.createObjectStore('worlds', { keyPath: 'id' }); if (!d.objectStoreNames.contains('chunks')) d.createObjectStore('chunks'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const t = db.transaction(['worlds', 'chunks'], 'readwrite');
    for (const w of dump.worlds) t.objectStore('worlds').put(dec(w));
    for (const [k, v] of dump.chunks) t.objectStore('chunks').put(dec(v), k);
    t.oncomplete = () => res(); t.onerror = () => rej(t.error);
  });
  const n = await new Promise((res) => { const r = db.transaction('chunks', 'readonly').objectStore('chunks').count(); r.onsuccess = () => res(r.result); });
  db.version !== 1 && (() => { throw new Error('database version ' + db.version); })();
  db.close();
  return n;
}

/** Load the fixture file into the page's origin. The page must not have the game's database open. */
export async function loadFixture(page, origin) {
  const fx = JSON.parse(readFileSync(FILE, 'utf8'));
  // a static file of the same origin: same IndexedDB, and no game script running
  await page.goto(origin + '/package.json', { waitUntil: 'load' });
  const n = await page.evaluate(loadDb, { worlds: fx.worlds, chunks: fx.chunks });
  if (n !== fx.chunks.length) throw new Error(`loaded ${n} chunks of ${fx.chunks.length}`);
  return fx;
}

// ---- legacy-make ----

export const makeQuery = `quick=${DEAD}&fresh`;

export async function make({ page, origin, log }) {
  const d = driver(page, log), { ev, step, until, runMs, cmd, boot, grab, tp, placeOn, useAt } = d;
  await page.waitForFunction(() => window.T, null, { timeout: 60000 });
  if (await ev(() => !T.game.markChestDirty)) throw new Error('this build saves in the new format: make the fixture from a checkout of the build before it (56e7a42 or earlier)');
  const expect = {};
  const at = (x, y, z) => ev(([x, y, z]) => R.key(x, y, z), [x, y, z]);
  const fill = (a, key) => ev(([a, k]) => D.fill(...a, k), [a, key]);
  const set = (x, y, z, key) => fill([x, y, z, x, y, z], key);

  await step('dead world: die and save on the death screen', async () => {
    await boot(); await grab();
    await ev(() => { D.caps(0, 0); D.clearMobs(); });
    const me = await ev(() => R.me());
    await cmd(`tp ${me.x} 250 ${me.z}`);
    await until(() => R.dead() && R.deathScreen(), null, 30000, 'dying');
    await ev(() => D.save());
    await runMs(500);
    expect.dead = { id: 'quick-' + DEAD, hp: await ev(() => R.hp()) };
  });

  await page.goto(`${origin}/?quick=${MAIN}&fresh`, { waitUntil: 'load' });
  let sx, gy, sz;
  const blocks = { 0: [], 1: [], 2: [] };
  const mark = async (dim, x, y, z, key) => { await set(x, y, z, key); blocks[dim].push([x, y, z, await at(x, y, z)]); };

  await step('main world: pad, edits in the Overworld', async () => {
    await boot(); await grab();
    if ((await cmd('god')) !== 'god true') throw new Error('god mode did not turn on');
    await cmd('time day');
    await ev(() => { D.caps(0, 0); D.clearMobs(); });
    const me = await ev(() => R.me());
    sx = Math.floor(me.x); sz = Math.floor(me.z); gy = Math.floor(me.y) - 1;
    await fill([sx - 7, gy - 3, sz - 7, sx + 7, gy - 1, sz + 7], 'stone');
    await fill([sx - 7, gy, sz - 7, sx + 7, gy, sz + 7], 'dirt');
    await fill([sx - 7, gy + 1, sz - 7, sx + 7, gy + 14, sz + 7], 'air');
    await tp(sx + 0.5, gy + 1, sz + 0.5);
    // edits up, down and to the side of the pad, in two chunks
    await mark(0, sx - 6, gy + 1, sz - 6, 'stone_bricks');
    await mark(0, sx - 6, gy + 2, sz - 6, 'glass');
    await mark(0, sx + 6, gy, sz - 6, 'air');
    await mark(0, sx + 6, gy - 1, sz - 6, 'gold_block');
    await mark(0, sx - 6, gy + 1, sz + 6, 'oak_planks');
  });

  await step('main world: chest, bed, forge', async () => {
    for (const c of ['give chest 1', 'give bedroll 1', 'give furnace 1', 'give hollow_gate_kit 1', 'give iron_ore 10', 'give coal 2']) await cmd(c);
    const chest = [sx + 1, gy + 1, sz + 1], bed = [sx - 1, gy + 1, sz + 1], forge = [sx + 2, gy + 1, sz + 1];
    await placeOn('chest', chest[0], gy, chest[2]);
    await useAt(...chest);
    await until(() => R.winOpen(), null, 5000, 'the chest to open');
    // three stacks, put straight into the open chest's slot array
    await ev(([c]) => { const s = T.game.world.getEnt(...c).data.s; s[0] = { k: 'iron_bar', n: 7 }; s[4] = { k: 'arrow', n: 33 }; s[26] = { k: 'salve', n: 2 }; T.game.markChestDirty(); }, [chest]);
    await d.closeWin();
    expect.chest = { at: chest, s: await ev((c) => R.container(...c), chest) };
    await placeOn('bedroll', bed[0], gy, bed[2]);
    await useAt(...bed);
    expect.bed = { at: bed, spawn: await ev(() => R.spawnPoint()) };
    if (JSON.stringify(expect.bed.spawn) !== JSON.stringify(bed)) throw new Error('the bed did not set the spawn');
    await placeOn('furnace', forge[0], gy, forge[2]);
    expect.forge = { at: forge };
  });

  await step('main world: a housed townsperson', async () => {
    // a 3x3x3 room of planks with a door and a torch, the guest bed placed by hand
    const x0 = sx + 2, z0 = sz + 3;
    await fill([x0, gy + 1, z0, x0 + 4, gy + 5, z0 + 4], 'oak_planks');
    await fill([x0 + 1, gy + 1, z0 + 1, x0 + 3, gy + 3, z0 + 3], 'air');
    await set(x0 + 4, gy + 1, z0 + 2, 'door_z'); await set(x0 + 4, gy + 2, z0 + 2, 'door_z');
    await set(x0 + 3, gy + 1, z0 + 3, 'torch');
    await cmd('give guest_bed 1');
    await tp(x0 + 2.5, gy + 1, z0 + 1.5);
    await placeOn('guest_bed', x0 + 2, gy, z0 + 2);
    await until(() => R.homes().some((h) => h.npc === 'wayfinder'), null, 30000, 'the Wayfinder to move in');
    expect.home = { at: [x0 + 2, gy + 1, z0 + 2], npc: 'wayfinder' };
    await tp(sx + 0.5, gy + 1, sz + 0.5);
  });

  await step('main world: an unopened generator chest in an edited chunk', async () => {
    const r = await cmd('locate ruin');
    const m = /at (-?\d+) (-?\d+) (-?\d+)/.exec(r);
    if (!m) throw new Error('no ruin: ' + r);
    const [x, y, z] = [+m[1], +m[2], +m[3]];
    await tp(x + 0.5, y + 8, z + 0.5);
    const c = [x - 2, y + 1, z - 2];
    const e = await ev((c) => R.ent(...c), c);
    if (!e || e.kind !== 'chest' || e.opened || e.loot !== 'ruin') throw new Error(`no unopened ruin chest at ${c}: ${JSON.stringify(e)}`);
    // the edit that makes this chunk worth saving, one cell above the chest
    await mark(0, c[0], c[1] + 2, c[2], 'cobble');
    expect.ruinChest = { at: c, loot: 'ruin' };
    await tp(sx + 0.5, gy + 1, sz + 0.5);
  });

  await step('main world: a gate pair, edits in the Hollows and the Skyrift', async () => {
    const g = [sx, gy + 1, sz - 6];
    await tp(sx + 0.5, gy + 1, sz - 3.5);
    await placeOn('hollow_gate_kit', g[0], gy, g[2], 'hollow_frame');
    expect.gate = { frame: [g[0] - 1, g[1], g[2]], sheet: [g[0], g[1] + 1, g[2]] };
    await d.enterGate(1);
    const h = await ev(() => R.me());
    expect.gate.hollows = await ev(([x, y, z]) => { for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = -1; dy <= 3; dy++) if (R.key(x + dx, y + dy, z + dz) === 'hollow_portal') return [x + dx, y + dy, z + dz]; return null; }, [Math.floor(h.x), Math.floor(h.y), Math.floor(h.z)]);
    if (!expect.gate.hollows) throw new Error('no return gate in the Hollows');
    await ev(() => { D.caps(0, 0); D.clearMobs(); });
    await mark(1, Math.floor(h.x) + 3, Math.floor(h.y), Math.floor(h.z) + 2, 'stone_bricks');
    await mark(1, Math.floor(h.x) + 3, Math.floor(h.y) - 1, Math.floor(h.z) + 3, 'air');
    await d.enterGate(0);
    await cmd('dim 2');
    await until(() => R.dim() === 2 && R.ready() && R.me().onGround, null, 40000, 'landing in the Skyrift');
    await ev(() => { D.caps(0, 0); D.clearMobs(); });
    const k = await ev(() => R.me());
    await mark(2, Math.floor(k.x) + 2, Math.floor(k.y), Math.floor(k.z) + 2, 'gold_block');
    await mark(2, Math.floor(k.x) - 2, Math.floor(k.y) - 1, Math.floor(k.z) + 2, 'air');
    await cmd('dim 0');
    await until(() => R.dim() === 0 && R.ready() && R.me().onGround, null, 40000, 'returning to the Overworld');
    expect.gate.overworldFrame = await at(...expect.gate.frame);
    expect.gate.overworldSheet = await at(...expect.gate.sheet);
  });

  await step('main world: save mid-smelt', async () => {
    await tp(sx + 0.5, gy + 1, sz + 0.5);
    // filled last, so it is still working when the save happens
    await useAt(...expect.forge.at);
    await until(() => R.winOpen(), null, 5000, 'the furnace to open');
    await d.clickSlot(d.invView(11, await ev(() => R.slotOf('iron_ore'))), { modifiers: ['Shift'] });
    await d.clickSlot(d.invView(11, await ev(() => R.slotOf('coal'))), { modifiers: ['Shift'] });
    await d.closeWin();
    await until((c) => { const f = R.forge(...c); return f && f.s[2] && f.s[2].n >= 2 && f.s[0] && f.burn > 0; }, expect.forge.at, 40000, 'two bars smelted');
    await ev(() => D.save());
    const f = await ev((c) => R.forge(...c), expect.forge.at);
    expect.forge.saved = f;
    expect.forge.total = 10;
    if (!f.s[0] || !(f.burn > 0)) throw new Error('the forge was not mid-smelt when saved');
    await runMs(500);
    expect.blocks = blocks;
    expect.flags = await ev(() => R.flags());
    // nothing built later may have covered an earlier probe cell
    for (const [k, c, want] of [['chest', expect.chest.at, 'chest'], ['bed', expect.bed.at, 'bedroll'], ['home', expect.home.at, 'guest_bed']]) if ((await at(...c)) !== want) throw new Error(`the ${k} at ${c} is now ${await at(...c)}`);
    for (const [x, y, z, k] of blocks[0]) if ((await at(x, y, z)) !== k) throw new Error(`block ${x} ${y} ${z} is now ${await at(x, y, z)}, not ${k}`);
    expect.main = { id: 'quick-' + MAIN, dim: await ev(() => R.dim()) };
  });

  const dump = await page.evaluate(dumpDb);
  const fx = {
    about: 'IndexedDB "cairnlight" version 1 as saved by the pre-multiplayer build. Made by `npm run smoke -- legacy-make`; read by `npm run smoke -- legacy`.',
    made: { build: process.env.FIXTURE_BUILD ?? 'working tree', date: new Date().toISOString().slice(0, 10) },
    expect, worlds: dump.worlds, chunks: dump.chunks,
  };
  writeFileSync(FILE, JSON.stringify(fx) + '\n');
  log(`wrote ${FILE}: ${dump.worlds.length} worlds, ${dump.chunks.length} chunks, ${(JSON.stringify(fx).length / 1024).toFixed(0)} KB`);
  return undefined;
}

// ---- legacy ----

export const checkQuery = 'gallery=icons';
export let expect;
try { expect = JSON.parse(readFileSync(FILE, 'utf8')).expect && buildExpect(JSON.parse(readFileSync(FILE, 'utf8')).expect); } catch { expect = undefined; }

/** What `check` must report, derived from what the maker saw. */
function buildExpect(x) {
  const e = { chunksLoaded: true };
  for (const dim of [0, 1, 2]) e['blocks.dim' + dim] = x.blocks[dim].map(([a, b, c, k]) => `${a} ${b} ${c} ${k}`);
  Object.assign(e, {
    'main.dim': x.main.dim, 'main.flagsKept': true,
    chest: x.chest.s,
    'forge.present': true, 'forge.itemsKept': x.forge.total, 'forge.notBehind': true, 'forge.fuelNotGained': true,
    'bed.block': 'bedroll', 'bed.spawn': x.bed.spawn,
    'home.npc': x.home.npc, 'home.flag': true, 'home.bodyAppears': true,
    'ruinChest.unopened': true, 'ruinChest.rollsWhenOpened': true,
    'gate.frame': x.gate.overworldFrame, 'gate.sheet': x.gate.overworldSheet, 'gate.leadsToSavedReturn': true,
    'dead.deathScreen': true, 'dead.hp': 0,
    'db.version': 2, 'backup.main': true, 'backup.dead': true, 'backup.count': 2, 'legacyChunksKept': true,
  });
  return e;
}

/** Runs in the page: the database as the game left it. Legacy records are compared as JSON with byte arrays as base64. */
async function readBackups(ids) {
  const enc = (v) => {
    if (v instanceof Uint8Array) { let s = ''; for (let i = 0; i < v.length; i += 0x8000) s += String.fromCharCode(...v.subarray(i, i + 0x8000)); return { $u8: btoa(s) }; }
    if (Array.isArray(v)) return v.map(enc);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]));
    return v;
  };
  const db = await new Promise((res, rej) => { const r = indexedDB.open('cairnlight'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = (store, key) => new Promise((res, rej) => { const r = db.transaction(store, 'readonly').objectStore(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const all = (store) => new Promise((res, rej) => {
    const out = [], r = db.transaction(store, 'readonly').objectStore(store).openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) { res(out); return; } out.push([c.key, enc(c.value)]); c.continue(); };
    r.onerror = () => rej(r.error);
  });
  const out = { version: db.version, backups: {}, count: (await all('backup')).length, chunks: await all('chunks') };
  for (const id of ids) out.backups[id] = enc(await get('backup', id + '|v1')) ?? null;
  db.close();
  return out;
}

export async function check({ page, origin, log, extra = '' }) {
  const fx = await loadFixture(page, origin), x = fx.expect;
  const d = driver(page, log), { ev, step, until, cmd, boot, grab, tp, useAt } = d;
  const p = { chunksLoaded: true };
  const at = (c) => ev(([x, y, z]) => R.key(x, y, z), c);
  const blocksOf = async (dim) => { const out = []; for (const [a, b, c] of x.blocks[dim]) out.push(`${a} ${b} ${c} ${await at([a, b, c])}`); return out; };

  await page.goto(`${origin}/?quick=${MAIN}${extra}`, { waitUntil: 'load' });
  await step('open the main world', async () => {
    await boot(); await grab();
    p['main.dim'] = await ev(() => R.dim());
    const flags = await ev(() => R.flags());
    p['main.flagsKept'] = x.flags.every((f) => flags.includes(f));
    // the forge as it is on the first frames after the load, before much more smelting
    const f = await ev((c) => R.forge(...c), x.forge.at), s = x.forge.saved.s;
    p['forge.present'] = !!f;
    p['forge.itemsKept'] = f ? (f.s[0]?.n ?? 0) + (f.s[2]?.n ?? 0) : null;
    p['forge.notBehind'] = !!f && (f.s[2]?.n ?? 0) >= s[2].n;
    p['forge.fuelNotGained'] = !!f && (f.s[1]?.n ?? 0) <= (s[1]?.n ?? 0);
    p['blocks.dim0'] = await blocksOf(0);
    p.chest = await ev((c) => R.container(...c), x.chest.at);
    p['bed.block'] = await at(x.bed.at);
    p['bed.spawn'] = await ev(() => R.spawnPoint());
    const home = (await ev(() => R.homes())).find((h) => h.x === x.home.at[0] && h.y === x.home.at[1] && h.z === x.home.at[2]);
    p['home.npc'] = home?.npc ?? null;
    p['home.flag'] = (await ev(() => R.flags())).includes('npc:' + x.home.npc);
    p['gate.frame'] = await at(x.gate.frame);
    p['gate.sheet'] = await at(x.gate.sheet);
  });

  await step('the townsperson shows up', async () => {
    await until(() => R.mobs().some((m) => m.key === 'n_wayfinder'), null, 30000, 'the Wayfinder').then(() => { p['home.bodyAppears'] = true; }, () => { p['home.bodyAppears'] = false; });
  });

  await step('the unopened generator chest', async () => {
    const c = x.ruinChest.at;
    await tp(c[0] + 0.5, c[1], c[2] + 1.5);
    const e = await ev((c) => R.ent(...c), c);
    p['ruinChest.unopened'] = !!e && e.kind === 'chest' && !e.opened && e.loot === x.ruinChest.loot;
    await tp(c[0] + 0.5, c[1], c[2] + 1.5);
    await useAt(...c);
    await until(() => R.winOpen(), null, 5000, 'the chest to open').catch(() => {});
    const s = await ev((c) => R.container(...c), c), e2 = await ev((c) => R.ent(...c), c);
    p['ruinChest.rollsWhenOpened'] = !!s && s.some((q) => q) && !!e2 && e2.loot === null;
    if (await ev(() => R.winOpen())) await d.closeWin();
  });

  await step('the gate and the other two dimensions', async () => {
    await tp(x.gate.sheet[0] + 0.5, x.gate.sheet[1] - 1, x.gate.sheet[2] + 2.5);
    await d.enterGate(1);
    // the saved return point puts the player back at the gate the maker landed beside
    const me = await ev(() => R.me()), h = x.gate.hollows;
    p['gate.leadsToSavedReturn'] = Math.abs(me.x - (h[0] + 0.5)) < 3 && Math.abs(me.z - (h[2] + 0.5)) < 3 && (await at(h)) === 'hollow_portal';
    p['blocks.dim1'] = await blocksOf(1);
    await cmd('dim 2');
    await until(() => R.dim() === 2 && R.ready(), null, 40000, 'the Skyrift');
    p['blocks.dim2'] = await blocksOf(2);
    await cmd('dim 0');
    await until(() => R.dim() === 0 && R.ready(), null, 40000, 'the Overworld');
  });

  await page.goto(`${origin}/?quick=${DEAD}${extra}`, { waitUntil: 'load' });
  await step('open the world saved on the death screen', async () => {
    await boot();
    await until(() => R.deathScreen(), null, 5000, 'the death screen').catch(() => {});
    p['dead.deathScreen'] = await ev(() => R.deathScreen());
    p['dead.hp'] = await ev(() => R.hp());
  });

  await step('the backup of each old world record, and the old chunk records', async () => {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const ids = ['quick-' + MAIN, 'quick-' + DEAD], got = await ev(readBackups, ids);
    p['db.version'] = got.version;
    p['backup.main'] = same(got.backups[ids[0]], fx.worlds.find((w) => w.id === ids[0]));
    p['backup.dead'] = same(got.backups[ids[1]], fx.worlds.find((w) => w.id === ids[1]));
    p['backup.count'] = got.count;
    // read, never written or deleted: every legacy chunk record is still what the fixture loaded
    const by = new Map(got.chunks);
    p['legacyChunksKept'] = got.chunks.length === fx.chunks.length && fx.chunks.every(([k, v]) => same(by.get(k), v));
  });
  return p;
}
