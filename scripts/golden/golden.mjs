// Smoke scenario `golden`: a scripted play-through of a fresh ?quick world whose results no random
// draw and no wall-clock jitter can change. `npm run smoke -- golden` compares them with
// scripts/golden/baseline.json; `npm run smoke -- golden --record` rewrites that file.
//
// The script acts the way a player does (held keys and buttons through window.T, real key presses
// and clicks on the window DOM, cheats through T.cmd). Everything it reads or pokes in the game
// goes through installHelpers() below, so a refactor that moves those fields re-points them there.
// What the client mirrors (blocks, inventory, flags, the player) is read from the client; block
// entities, creatures and homes are the simulation's alone and are read where it runs, through T.ask
// (this page, or the simulation's worker with &worker), so those reads and the few pokes return promises.

/** Runs inside the page. R reads state; D does the few things a player has no input for. */
export async function installHelpers() {
  const g = () => T.game;
  // the dev server hands back the module instance the game itself loaded
  const KEYS = (await import('/src/data/blocks.ts')).BLOCKS.map((b) => b.key);
  const { raycast, newRayHit } = await import('/src/sim/physics.ts');
  const hit = newRayHit();
  const P = () => g().player;
  /** `fn(realm, arg)` on the player's realm, where the simulation runs. */
  const inRealm = (fn, arg) => T.ask(new Function('return (sim, [d, a]) => (' + fn.toString() + ')(sim.realms[d], a)')(), [g().dim, arg]);
  window.R = {
    id: (key) => T.B[key],
    key: (x, y, z) => KEYS[g().world.getBlock(x, y, z)] ?? String(g().world.getBlock(x, y, z)),
    flags: () => [...g().flags].sort(),
    count: (k) => g().inv.count(k),
    /** Index of the first slot (0-8 hotbar, 9-35 pack) holding `k`, or -1. */
    slotOf: (k, from = 0) => g().inv.slots.findIndex((s, i) => i >= from && s && s.k === k),
    slots: () => g().inv.slots.map((s) => (s ? { k: s.k, n: s.n } : null)),
    held: () => g().inv.held()?.k ?? null,
    cursor: () => g().inv.cursor,
    me: () => { const p = P(); return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, eye: p.eye, onGround: p.onGround, flying: p.flying }; },
    hp: () => g().stats.hp,
    dead: () => g().stats.dead,
    dim: () => g().dim,
    ready: () => g().ready && g().world.counts().waiting === 0,
    quest: () => g().quests.index,
    /** A block entity's slots as plain {k, n} (null where empty), or null when there is no entity. */
    container: (x, y, z) => inRealm((r, [x, y, z]) => { const e = r.getEnt(x, y, z); return e && e.data.s ? e.data.s.map((s) => (s ? { k: s.k, n: s.n } : null)) : null; }, [x, y, z]),
    ent: (x, y, z) => inRealm((r, [x, y, z]) => { const e = r.getEnt(x, y, z); return e ? { kind: e.kind, loot: e.data.loot ?? null, opened: !!e.data.s } : null; }, [x, y, z]),
    forge: (x, y, z) => inRealm((r, [x, y, z]) => { const e = r.getEnt(x, y, z); if (!e || e.kind !== 'forge') return null; const d = e.data; return { s: d.s.map((s) => (s ? { k: s.k, n: s.n } : null)), burn: d.burn, prog: d.prog }; }, [x, y, z]),
    mobs: () => inRealm((r) => r.mobs.list.filter((m) => m.active).map((m) => ({ id: m.id, key: m.def.key, x: m.x, y: m.y, z: m.z, h: m.h, hp: m.hp, boss: !!m.boss }))),
    spawnPoint: () => g().spawn,
    homes: () => T.ask((sim) => sim.npcs.homes.map((h) => ({ x: h.x, y: h.y, z: h.z, npc: h.npc }))),
    winOpen: () => !document.querySelector('#win')?.classList.contains('hidden'),
    deathScreen: () => g().menu.dead,
    /** Highest block in a column and its key. */
    top: (x, z) => { const w = g().world; let y = 250; while (y > 0 && !w.getBlock(x, y, z)) y--; return { y, key: KEYS[w.getBlock(x, y, z)] }; },
  };
  window.D = {
    look: (yaw, pitch) => { const p = P(); p.yaw = yaw; p.pitch = Math.max(-1.5533, Math.min(1.5533, pitch)); },
    /** Turn the view to a world point, from the eye. */
    aimAt: (x, y, z) => { const p = P(), dx = x - p.x, dy = y - (p.y + p.eye), dz = z - p.z; D.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); },
    /** Look at a point of block (x, y, z) that the crosshair ray really reaches first, on a face with normal
     *  (0, ny, 0) when `ny` is given. Returns false when no such point is in reach. */
    aimBlock: (x, y, z, ny) => {
      const p = P(), ex = p.ex, ey = p.ey, ez = p.ez;
      for (const [nx, nny, nz] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) {
        if (ny !== undefined && (nny !== ny || nx || nz)) continue;
        for (const [a, b] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3]]) {
          const px = x + 0.5 + nx * 0.5 + (nx ? 0 : a), py = y + 0.5 + nny * 0.5 + (nny ? 0 : nx ? a : b), pz = z + 0.5 + nz * 0.5 + (nz ? 0 : b);
          const dx = px - ex, dy = py - ey, dz = pz - ez, l = Math.hypot(dx, dy, dz);
          if (dx * nx + dy * nny + dz * nz >= 0) continue;
          raycast(g().world, ex, ey, ez, dx / l, dy / l, dz / l, 4.8, hit);
          if (hit.hit && hit.x === x && hit.y === y && hit.z === z && (ny === undefined || (hit.ny === ny && !hit.nx && !hit.nz))) {
            D.look(Math.atan2(-dx, -dz), Math.asin(dy / l));
            return true;
          }
        }
      }
      return false;
    },
    caps: (h, p) => T.ask((sim, [h, p]) => { for (const r of sim.realms) { r.mobs.hostileCap = h; r.mobs.passiveCap = p; } }, [h, p]),
    clearMobs: () => inRealm((r) => r.mobs.clear()),
    save: () => g().save(),
    /** Set every cell of a box to one block, as the `fill` command of section 10.1 will. */
    fill: (x0, y0, z0, x1, y1, z1, key) => inRealm((w, [x0, y0, z0, x1, y1, z1, id]) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) w.setBlock(x, y, z, id); },
      [x0, y0, z0, x1, y1, z1, T.B[key]]),
  };
}

/** Node-side actions, each built from window.T calls, real key presses and clicks, and R / D. */
export function driver(page, log) {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const step = async (name, fn) => {
    const t0 = Date.now();
    try { await fn(); } catch (e) { e.message = `step "${name}": ${e.message}`; throw e; }
    log(`  ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  };
  const until = async (pred, arg, timeout = 20000, what = 'condition') => {
    const ok = await ev(async ([src, a, t]) => { const f = new Function('return ' + src)(); return T.until(() => f(a), t); }, [pred.toString(), arg, timeout]);
    if (!ok) throw new Error(`timed out waiting for ${what}`);
  };
  const runMs = (ms) => ev((m) => T.run(m), ms);
  const cmd = (c) => ev((x) => T.cmd(x), c);
  const boot = async () => {
    await page.waitForFunction(() => window.T, null, { timeout: 60000 });
    await ev(installHelpers);
    await until(() => R.ready(), null, 40000, 'the world to load');
  };
  const grab = () => ev(() => T.grab(true));
  /** Select the hotbar slot holding `k` by pressing its number key; from the pack, swap it onto slot 9 first. */
  const hold = async (k) => {
    let i = await ev((key) => R.slotOf(key), k);
    if (i < 0) throw new Error(`no ${k} in the inventory`);
    if (i > 8) {
      await keyPress('KeyE'); await winOpen();
      await page.hover(slotSel(invView(13, i)));
      await keyPress('Digit9');
      await closeWin();
      i = await ev((key) => R.slotOf(key), k);
      if (i !== 8) throw new Error(`${k} did not move to the hotbar`);
    }
    await ev(async (n) => { T.key('Digit' + (n + 1), true); await T.run(50); T.key('Digit' + (n + 1), false); await T.run(30); }, i);
    const h = await ev(() => R.held());
    if (h !== k) throw new Error(`holding ${h}, wanted ${k}`);
  };
  /** Teleport, then wait (a few frames at least, so onGround is fresh) until the area is meshed and the player stands. */
  const tp = async (x, y, z) => {
    await cmd(`tp ${x} ${y} ${z}`); await runMs(100);
    await until(() => R.ready(), null, 30000, 'the area to load'); await until(() => R.me().onGround, null, 5000, 'landing');
  };
  /** Hold the left button on a block until it is gone. */
  const breakAt = async (x, y, z) => {
    await hold('iron_pickaxe');
    if (!(await ev(([x, y, z]) => D.aimBlock(x, y, z), [x, y, z]))) throw new Error(`cannot see block ${x} ${y} ${z}`);
    await ev(() => T.click(0, true));
    try { await until(([x, y, z]) => R.key(x, y, z) === 'air' || !D.aimBlock(x, y, z), [x, y, z], 15000, `block ${x} ${y} ${z} to break`); }
    finally { await ev(() => T.click(0, false)); }
    if ((await ev(([x, y, z]) => R.key(x, y, z), [x, y, z])) !== 'air') throw new Error(`lost sight of block ${x} ${y} ${z} while breaking it`);
  };
  /** Right-click the top face of (x, y, z) with `k` in hand: places it at y + 1. */
  const placeOn = async (k, x, y, z, makes = k) => {
    await hold(k);
    if (!(await ev(([x, y, z]) => D.aimBlock(x, y, z, 1), [x, y, z]))) throw new Error(`cannot see the top of block ${x} ${y} ${z}`);
    await runMs(40);
    await ev(async () => { T.click(2, true); await T.run(60); T.click(2, false); await T.run(60); });
    const got = await ev(([x, y, z]) => R.key(x, y + 1, z), [x, y, z]);
    if (got !== makes) throw new Error(`placing ${k} on ${x} ${y} ${z} left ${got}`);
  };
  const useAt = async (x, y, z) => {
    if (!(await ev(([x, y, z]) => D.aimBlock(x, y, z), [x, y, z]))) throw new Error(`cannot see block ${x} ${y} ${z}`);
    await runMs(40); await ev(async () => { T.click(2, true); await T.run(60); T.click(2, false); await T.run(60); }); };
  const keyPress = async (key) => { await page.keyboard.press(key); await runMs(60); };
  /** Index of a window slot in document order; see Windows.build (equipment 3, trinkets 5, then the middle, then pack 9-35, hotbar 0-8). */
  const invView = (base, i) => (i >= 9 ? base + i - 9 : base + 27 + i);
  const slotSel = (v) => `#win [data-v="${v}"]`;
  const clickSlot = async (v, opts = {}) => { await page.click(slotSel(v), opts); await runMs(40); };
  const winOpen = () => until(() => R.winOpen(), null, 5000, 'the window to open');
  const closeWin = async () => { await keyPress('Escape'); await until(() => !R.winOpen(), null, 5000, 'the window to close'); await grab(); };
  const bookCraft = async (query, button) => {
    await page.fill('#win input.search', query);
    await runMs(40);
    const vis = page.locator('#book [data-r]:not(.hidden)');
    const n = await vis.count();
    if (n !== 1) throw new Error(`recipe search "${query}" shows ${n} recipes`);
    await vis.first().click(button);
    await runMs(60);
  };
  /** Walk into the middle of the nearest gate sheet, hop onto its sill if needed, stand still until it
   *  carries the player to dimension `to`, and wait there for the landing. */
  const enterGate = async (to) => {
    const target = await ev(() => {
      const p = R.me(), x0 = Math.floor(p.x), y0 = Math.floor(p.y), z0 = Math.floor(p.z);
      let best = null;
      for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) for (let dy = -1; dy <= 3; dy++) {
        const k = R.key(x0 + dx, y0 + dy, z0 + dz);
        if (k !== 'hollow_portal' || R.key(x0 + dx, y0 + dy - 1, z0 + dz) === 'hollow_portal') continue;
        const d = Math.hypot(dx, dz);
        if (!best || d < best.d) best = { x: x0 + dx + 0.5, y: y0 + dy, z: z0 + dz + 0.5, d };
      }
      return best;
    });
    if (!target) throw new Error('no gate sheet within 6 blocks');
    await until(([t, to]) => {
      if (R.dim() === to) { T.key('KeyW', false); T.key('Space', false); return true; }
      const p = R.me(), dx = t.x - p.x, dz = t.z - p.z, inside = R.key(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z)) === 'hollow_portal';
      if (inside && Math.hypot(dx, dz) < 0.3) { T.key('KeyW', false); T.key('Space', false); return false; }
      D.look(Math.atan2(-dx, -dz), 0);
      T.key('KeyW', true); T.key('Space', p.y < t.y - 0.5);
      return false;
    }, [target, to], 15000, `the gate to dimension ${to}`).finally(() => ev(() => { T.key('KeyW', false); T.key('Space', false); }));
    await until((to) => R.dim() === to && R.ready() && R.me().onGround, to, 40000, `landing in dimension ${to}`);
  };
  /** Chase a creature and hit it with the held weapon until it is gone. */
  const kill = async (id, timeout = 30000) => {
    await until(async ([id]) => {
      const m = (await R.mobs()).find((q) => q.id === id);
      if (!m) { T.click(0, false); T.key('KeyW', false); return true; }
      const p = R.me(), d = Math.hypot(m.x - p.x, m.z - p.z);
      D.aimAt(m.x, m.y + m.h * 0.5, m.z);
      T.key('KeyW', d > 2.2);
      T.click(0, true);
      return false;
    }, [id], timeout, `creature ${id} to die`).finally(() => ev(() => { T.click(0, false); T.key('KeyW', false); }));
  };

  return { ev, step, until, runMs, cmd, boot, grab, hold, tp, breakAt, placeOn, useAt, keyPress, invView, slotSel, clickSlot, winOpen, closeWin, bookCraft, enterGate, kill };
}

/** Probe cells and steps are laid out on an 11x11 pad levelled at the world spawn. */
const R5 = 5;

export async function run({ page, url, log }) {
  const probes = {};
  const { ev, step, until, runMs, cmd, boot, grab, hold, tp, breakAt, placeOn, useAt, keyPress, invView, clickSlot, winOpen, closeWin, bookCraft, enterGate, kill } = driver(page, log);

  let sx, sz, gy;
  const cell = (dx, dy, dz) => [sx + dx, gy + dy, sz + dz];
  const probeBlock = async (name, c) => { probes['block.' + name] = await ev(([x, y, z]) => R.key(x, y, z), c); };

  await step('load', async () => {
    await boot(); await grab();
    if ((await cmd('god')) !== 'god true') throw new Error('god mode did not turn on');
    await cmd('time day');
    await ev(async () => { await D.caps(0, 0); await D.clearMobs(); });
  });

  await step('level the site', async () => {
    const me = await ev(() => R.me());
    sx = Math.floor(me.x); sz = Math.floor(me.z); gy = Math.floor(me.y) - 1;
    probes['site'] = [sx, gy, sz];
    const r = R5 + 1;
    await ev(async ([x, y, z, r]) => { await D.fill(x - r, y - 3, z - r, x + r, y - 1, z + r, 'stone'); await D.fill(x - r, y, z - r, x + r, y, z + r, 'dirt'); await D.fill(x - r, y + 1, z - r, x + r, y + 14, z + r, 'air'); }, [sx, gy, sz, r]);
    await tp(sx + 0.5, gy + 1, sz + 0.5);
  });

  await step('give and gear', async () => {
    for (const c of ['give cobble 64', 'give oak_log 4', 'give chest 1', 'give furnace 1', 'give bedroll 1', 'give altar1 1', 'give verdant_idol 1', 'give hollow_gate_kit 1',
      'give eclipse_sword 1', 'give iron_ore 3', 'give coal 3', 'give flint 5', 'give feather 7', 'gear 2']) {
      const r = await cmd(c);
      if (/unknown|full/.test(r)) throw new Error(`${c}: ${r}`);
    }
    await runMs(1200);   // the guide notices the logs on its next half-second check
  });

  await step('break and place by clicks', async () => {
    await tp(sx + 3.5, gy + 1, sz - 4.5);
    await breakAt(...cell(4, 0, -4));
    await breakAt(...cell(2, 0, -4));
    await breakAt(...cell(2, -1, -4));
    await placeOn('cobble', ...cell(4, -1, -4));
    await placeOn('cobble', ...cell(3, 0, -3));
    await probeBlock('brokenRefilled', cell(4, 0, -4));
    await probeBlock('brokenTop', cell(2, 0, -4));
    await probeBlock('brokenBelow', cell(2, -1, -4));
    await probeBlock('placedOnGround', cell(3, 1, -3));
  });

  await step('pillar jump', async () => {
    await tp(sx + 4.5, gy + 1, sz + 4.5);
    await hold('cobble');
    await ev(() => D.look(0, -Math.PI / 2));
    const y0 = (await ev(() => R.me())).y;
    await ev(() => { T.key('Space', true); T.click(2, true); });
    try { await until((y0) => (D.look(0, -Math.PI / 2), R.me().y >= y0 + 4.5), y0, 15000, 'the pillar to reach 4 blocks'); }
    finally { await ev(() => { T.key('Space', false); T.click(2, false); }); }
    await until(() => R.me().onGround, null, 5000, 'landing on the pillar');
    const y1 = (await ev(() => R.me())).y;
    probes['pillar.rose4'] = y1 - y0 >= 4;
    for (let k = 1; k <= 4; k++) await probeBlock('pillar' + k, cell(4, k, 4));
  });

  await step('back-fill', async () => {
    await tp(sx - 4 + 0.5, gy + 1, sz + 4 + 0.5);
    await ev(() => { D.look(0, 0); T.key('KeyW', true); });
    try { await until((z) => R.me().z < z, sz + 2.4, 8000, 'walking out of the cell'); }
    finally { await ev(() => T.key('KeyW', false)); }
    await runMs(300);
    await placeOn('cobble', ...cell(-4, 0, 4));
    await probeBlock('backfill', cell(-4, 1, 4));
  });

  await step('craft through the window', async () => {
    await tp(sx + 0.5, gy + 1, sz + 0.5);
    await keyPress('KeyE');
    await winOpen();
    const base = 13;   // inventory window: 3 armour + 5 trinkets + 4 grid + 1 output
    const logAt = await ev(() => R.slotOf('oak_log'));
    // by hand: carry the logs, drop one into the grid, put the rest back, take the planks
    await clickSlot(invView(base, logAt));
    await clickSlot(8, { button: 'right' });
    await clickSlot(invView(base, logAt));
    await clickSlot(12);
    const free = await ev(() => R.slots().findIndex((s, i) => i >= 9 && !s));
    await clickSlot(invView(base, free));
    if (await ev(() => R.cursor())) throw new Error('the cursor still holds something after crafting by hand');
    // from the recipe book: all remaining logs, then one batch of sticks, one workbench, one batch of torches
    await bookCraft('oak planks', { modifiers: ['Shift'] });
    await bookCraft('stick', { button: 'right' });
    await bookCraft('workbench', { button: 'right' });
    await bookCraft('torch', { button: 'right' });
    await closeWin();
    for (const k of ['oak_log', 'oak_planks', 'stick', 'workbench', 'torch', 'coal']) probes['count.' + k] = await ev((k) => R.count(k), k);
  });

  const chestC = cell(1, 1, 1), forgeC = cell(2, 1, 1), bedC = cell(-1, 1, 1);
  await step('chest', async () => {
    await placeOn('chest', chestC[0], gy, chestC[2]);
    await useAt(...chestC);
    await winOpen();
    const base = 35;   // chest window: 3 + 5 + 27 chest slots
    await clickSlot(invView(base, await ev(() => R.slotOf('flint'))), { modifiers: ['Shift'] });
    await clickSlot(invView(base, await ev(() => R.slotOf('feather'))));
    await clickSlot(8 + 10);
    await closeWin();
    probes['chest'] = await ev((c) => R.container(...c), chestC);
    probes['count.flint'] = await ev(() => R.count('flint'));
    probes['count.feather'] = await ev(() => R.count('feather'));
  });

  await step('smelt', async () => {
    await placeOn('furnace', forgeC[0], gy, forgeC[2]);
    await useAt(...forgeC);
    await winOpen();
    const base = 11;   // forge window: 3 + 5 + ore, fuel, output
    await clickSlot(invView(base, await ev(() => R.slotOf('iron_ore'))), { modifiers: ['Shift'] });
    await clickSlot(invView(base, await ev(() => R.slotOf('coal'))), { modifiers: ['Shift'] });
    await closeWin();
    await until(async (c) => (await R.forge(...c))?.s[2]?.n === 3, forgeC, 40000, 'three iron bars');
    probes['forge.out'] = (await ev((c) => R.forge(...c), forgeC)).s[2];
    await useAt(...forgeC);
    await winOpen();
    await clickSlot(10, { modifiers: ['Shift'] });
    await closeWin();
    probes['count.iron_bar'] = await ev(() => R.count('iron_bar'));
    probes['count.iron_ore'] = await ev(() => R.count('iron_ore'));
  });

  await step('bed', async () => {
    await placeOn('bedroll', bedC[0], gy, bedC[2]);
    await useAt(...bedC);
    probes['bed.spawn'] = await ev(() => R.spawnPoint());
    await probeBlock('bed', bedC);
  });

  await step('spawn and kill creatures', async () => {
    await tp(sx - 2 + 0.5, gy + 1, sz - 1 + 0.5);
    await hold('iron_sword');
    const killed = [];
    for (const k of ['thornling', 'burrowhog']) {
      const before = new Set((await ev(() => R.mobs())).map((m) => m.id));
      if ((await cmd('spawn ' + k)) !== 'spawned') throw new Error('could not spawn ' + k);
      const m = (await ev(() => R.mobs())).find((q) => !before.has(q.id));
      await kill(m.id);
      killed.push(k);
    }
    probes['killed'] = killed;
  });

  await step('summon and kill boss 1', async () => {
    const altar = cell(-4, 1, -4);
    await tp(sx - 2 + 0.5, gy + 1, sz - 2 + 0.5);
    await placeOn('altar1', altar[0], gy, altar[2]);
    await hold('verdant_idol');
    await useAt(...altar);
    const boss = (await ev(() => R.mobs())).find((m) => m.boss);
    if (!boss) throw new Error('the altar summoned nothing');
    probes['boss.key'] = boss.key;
    await hold('eclipse_sword');
    await kill(boss.id, 40000);
    probes['count.verdant_idol'] = await ev(() => R.count('verdant_idol'));
    await cmd('time day');
  });

  const gateC = cell(0, 1, -2);
  await step('cross a gate and return', async () => {
    await tp(sx + 0.5, gy + 1, sz + 0.5);
    await hold('hollow_gate_kit');
    await ev(() => D.look(0, 0));
    await placeOn('hollow_gate_kit', gateC[0], gy, gateC[2], 'hollow_frame');
    for (const [n, dx, dy] of [['frameL', -1, 0], ['frameR', 2, 4], ['portalLow', 0, 1], ['portalHigh', 1, 3]]) await probeBlock('gate.' + n, [gateC[0] + dx, gateC[1] + dy, gateC[2]]);
    await tp(sx + 0.5, gy + 1, sz + 0.5);
    await enterGate(1);
    probes['gate.arrivedDim'] = await ev(() => R.dim());
    await ev(async () => { await D.caps(0, 0); await D.clearMobs(); });
    await enterGate(0);
    await ev(async () => { await D.caps(0, 0); await D.clearMobs(); D.look(Math.PI, 0); T.key('KeyW', true); });
    try { await until((z) => R.me().z > z, gateC[2] + 2.3, 8000, 'stepping out of the gate'); }
    finally { await ev(() => T.key('KeyW', false)); }
    probes['gate.returnedDim'] = await ev(() => R.dim());
  });

  await step('die and respawn', async () => {
    if ((await cmd('god')) !== 'god false') throw new Error('god mode did not turn off');
    await cmd(`tp ${sx + 0.5} 250 ${sz - 3 + 0.5}`);
    await until(() => R.dead(), null, 30000, 'dying from the fall');
    await until(() => R.deathScreen(), null, 5000, 'the death screen');
    probes['death.screen'] = true;
    await page.click('button:has-text("Rise again")', { timeout: 5000 });
    await until(() => !R.dead() && R.ready(), null, 30000, 'respawning');
    await grab();
    await until(() => R.me().onGround, null, 5000, 'standing after respawn');
    const me = await ev(() => R.me());
    probes['respawn.alive'] = (await ev(() => R.hp())) > 0 && !(await ev(() => R.dead()));
    probes['respawn.atBed'] = Math.abs(me.x - (bedC[0] + 0.5)) <= 1.6 && Math.abs(me.z - (bedC[2] + 0.5)) <= 1.6 && Math.abs(me.y - bedC[1]) <= 1.5;
    if ((await cmd('god')) !== 'god true') throw new Error('god mode did not turn back on');
  });

  // A lit furnace goes out when its coal does, which depends on how long the rest of the run takes.
  const unlit = (k) => (k === 'furnace_lit' ? 'furnace' : k);
  /** Everything that must survive the save, read again after the reload. */
  const snapshot = async () => {
    const s = {};
    for (const [n, c] of Object.entries(cells)) s['block.' + n] = unlit(await ev(([x, y, z]) => R.key(x, y, z), c));
    s.flags = await ev(() => R.flags());
    s.quest = await ev(() => R.quest());
    for (const k of COUNTED) s['count.' + k] = await ev((k) => R.count(k), k);
    s.chest = await ev((c) => R.container(...c), chestC);
    s.forge = (await ev((c) => R.forge(...c), forgeC))?.s ?? null;
    s.spawnPoint = await ev(() => R.spawnPoint());
    s.alive = !(await ev(() => R.dead()));
    s.dim = await ev(() => R.dim());
    return s;
  };
  // Given or crafted, never spent, and nothing the run kills or mines can drop more of them
  // (the Colossus drops iron bars and salves, mined stone drops cobble).
  const COUNTED = ['oak_log', 'oak_planks', 'stick', 'workbench', 'torch', 'coal', 'iron_ore', 'flint', 'feather', 'verdant_idol', 'hollow_gate_kit', 'altar1', 'chest', 'furnace', 'bedroll', 'arrow',
    'iron_sword', 'iron_pickaxe', 'iron_axe', 'iron_bow', 'iron_staff', 'iron_totem', 'eclipse_sword'];
  // every probed cell, by name, for the before/after comparison
  const cells = ({
    brokenRefilled: cell(4, 0, -4), brokenTop: cell(2, 0, -4), brokenBelow: cell(2, -1, -4), placedOnGround: cell(3, 1, -3),
    pillar1: cell(4, 1, 4), pillar2: cell(4, 2, 4), pillar3: cell(4, 3, 4), pillar4: cell(4, 4, 4), backfill: cell(-4, 1, 4), bed: bedC, chest: chestC, forge: forgeC, altar: cell(-4, 1, -4),
    'gate.frameL': [gateC[0] - 1, gateC[1], gateC[2]], 'gate.frameR': [gateC[0] + 2, gateC[1] + 4, gateC[2]], 'gate.portalLow': [gateC[0], gateC[1] + 1, gateC[2]], 'gate.portalHigh': [gateC[0] + 1, gateC[1] + 3, gateC[2]],
  });

  await step('save, reload, compare', async () => {
    await until(() => R.me().onGround, null, 5000, 'standing still');
    await runMs(300);
    const before = await snapshot(), posA = await ev(() => R.me());
    await ev(() => D.save());
    await page.goto(url.replace(/&fresh\b/, ''), { waitUntil: 'load' });
    await boot();
    const after = await snapshot(), posB = await ev(() => R.me());
    for (const [k, v] of Object.entries(after)) probes['saved.' + k] = v;
    probes['reload.samePosition'] = Math.hypot(posA.x - posB.x, posA.y - posB.y, posA.z - posB.z) < 0.01;
    const diff = Object.keys(before).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    probes['reload.changed'] = diff.map((k) => `${k}: ${JSON.stringify(before[k])} -> ${JSON.stringify(after[k])}`);
  });

  return probes;
}

export const query = 'quick=golden&fresh';
