// Smoke scenario `solofar` (ARCHITECTURE.md D36 (m) and (n)): a solo world culls nothing by distance, in the
// page's own thread and in the simulation's worker alike. A creature 90 blocks off, a drop 55 blocks off and a
// damage number 40 blocks off (past MOB_R 88, DROP_R 48 and FLOAT_R 32) must each reach the client.
//
//   npm run smoke -- solofar
export const query = '';

async function probe() {
  const g = T.game, p = g.player;
  T.grab(true);
  for (const c of ['god on', 'caps 0 0', 'clearmobs', 'freeze on']) await T.cmd(c);
  const floats = [];
  g.session.on('fx', (m) => { for (const e of m.l) if (e[0] === 'f') floats.push(e[4]); });
  const x = Math.floor(p.x), y = Math.floor(p.y) + 6, z = Math.floor(p.z);
  await T.cmd(`spawnat thornling ${x + 90.5} ${y} ${z + 0.5}`);
  await T.ask((sim, [d, x, y, z]) => {
    sim.realms[d].drops.spawn(x, y, z, { k: 'flint', n: 1 }, 0, 0, 0);
    sim.realms[d].floater(x - 15, y, z, 'far number', '#fff', false);
  }, [g.dim, x + 55.5, y, z + 0.5]);
  await T.step(30);
  const far = (o, d) => Math.hypot(o.x - p.x, o.z - p.z) > d;
  return {
    creature90: g.ents.mobs.some((m) => m.active && m.def.key === 'thornling' && far(m, 85)),
    drop55: g.ents.drops.some((d) => d.active && far(d, 50)),
    float40: floats.includes('far number'),
    soloInSim: await T.ask((sim) => sim.opt.solo),
  };
}

export async function run({ page, origin, log, extra }) {
  const out = {};
  for (const [name, q] of [['thread', ''], ['worker', '&worker']]) {
    await page.goto(`${origin}/?quick=solofar&fresh${q}${extra}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.T, null, { timeout: 60000 });
    const r = await page.evaluate(async (src) => {
      if (!(await T.loaded())) throw new Error('the world did not load');
      if (T.game.session.transport.kind !== (location.search.includes('worker') ? 'worker' : 'loopback')) throw new Error('wrong transport');
      return new Function('return ' + src)()();
    }, probe.toString());
    log(`  ${name}: ${JSON.stringify(r)}`);
    for (const [k, v] of Object.entries(r)) out[`${name}.${k}`] = v;
  }
  return out;
}

export const expect = {
  'thread.creature90': true, 'thread.drop55': true, 'thread.float40': true, 'thread.soloInSim': true,
  'worker.creature90': true, 'worker.drop55': true, 'worker.float40': true, 'worker.soloInSim': true,
};
