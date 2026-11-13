// Smoke scenario `tpfar` (ARCHITECTURE.md risk R10): how long the solo worker's steps take while it generates the
// 121 chunks round a far teleport inline. A world made in the title menu (the worker, on its own clock) is jumped
// 4,000 blocks three times; for each jump the host's own step times are read from the moment of the `tp` until two
// seconds after the view is meshed again. It also checks that the world stands still behind the loading screen of
// a crossing to the Hollows and back, and while the game is paused.
//
//   npm run smoke -- tpfar             passes when every jump's p99 is at most 10 ms (R10's line)
export const query = '';
const JUMPS = 3, FAR = 4000, P99_MAX = 10;

export async function run({ page, log }) {
  await page.click('button:has-text("Begin"), button:has-text("New world")');
  await page.fill('input[placeholder^="Seed"]', 'tpfar');
  await page.click('button:has-text("Create world")');
  await page.waitForFunction(() => window.T, null, { timeout: 60000 });
  const { res: jumps, crossings, pause } = await page.evaluate(async ([n, far]) => {
    if (!(await T.loaded())) throw new Error('the world did not load');
    T.grab(true);
    // flying, since a fall from the height of a jump hurts in god mode as well
    await T.cmd('god on'); await T.cmd('caps 0 0'); await T.cmd('creative');
    await T.run(2000);
    const steps = () => T.ask((sim, a, host) => host.steps), res = [];
    for (let i = 1; i <= n; i++) {
      const p = T.game.player, from = await steps(), t0 = performance.now();
      await T.cmd(`tp ${Math.floor(p.x) + far + 0.5} 120 ${Math.floor(p.z) + 0.5}`);
      if (!(await T.until(() => T.game.ready && T.game.world.counts().waiting === 0, 30000))) throw new Error('jump ' + i + ' did not load');
      const loadMs = performance.now() - t0;
      await T.run(2000);
      const ms = await T.ask((sim, from, host) => { const t = host.stats.tickMs, out = []; for (let s = from + 1; s <= host.steps; s++) out.push(t[s % 3600]); return out; }, from);
      res.push({ loadMs, ms });
    }
    // the pause menu: the world stands still until it closes
    const a = await T.ask((sim) => sim.tick);
    T.game.paused = true; await T.run(1500);
    const b = await T.ask((sim) => sim.tick);
    T.grab(true); await T.run(500);
    const c = await T.ask((sim) => sim.tick);
    // a crossing puts up the loading screen: the world stands still behind it
    const crossings = [];
    const tick = () => T.ask((sim) => sim.tick);
    for (const dim of [1, 0]) {
      const t0 = performance.now();
      void T.game.cmd('dim ' + dim);
      while (T.game.ready && performance.now() - t0 < 5000) await T.run(16);
      // two looks 200 ms apart while the loading screen is still up
      const a = await tick(); await T.run(200); const b = await tick(), still = !T.game.ready;
      if (!(await T.until(() => T.game.dim === dim && T.game.ready, 30000))) throw new Error('the crossing to ' + dim + ' did not land');
      if (T.game.menu.dead) throw new Error('died after the crossing to ' + dim);
      crossings.push({ dim, ms: Math.round(performance.now() - t0), ticks: still ? b - a : null });
      await T.run(1000);
    }
    return { res, crossings, pause: { during: b - a, after: c - b } };
  }, [JUMPS, FAR]);
  const q = (a, f) => a[Math.min(a.length - 1, Math.floor(f * a.length))];
  let worst = 0;
  jumps.forEach((j, i) => {
    const a = [...j.ms].sort((x, y) => x - y), p99 = q(a, 0.99);
    worst = Math.max(worst, p99);
    const r = { steps: a.length, loadMs: Math.round(j.loadMs), p50: +q(a, 0.5).toFixed(2), p95: +q(a, 0.95).toFixed(2), p99: +p99.toFixed(2), max: +a[a.length - 1].toFixed(2), over10: a.filter((v) => v > 10).length };
    log(`  jump ${i + 1}: ${JSON.stringify(r)}`);
  });
  log(`  worst p99 ${worst.toFixed(2)} ms (R10 allows ${P99_MAX})`);
  for (const c of crossings) log(`  crossing to dimension ${c.dim}: in play after ${c.ms} ms; ${c.ticks ?? 'no look'} ticks counted in 200 ms behind its loading screen`);
  log(`  paused 1.5 s: ${pause.during} ticks; resumed 0.5 s: ${pause.after} ticks`);
  // a step or two can pass between the command and the loading flag, and between a pause and the message that says so
  return { p99Within: worst <= P99_MAX, standsStillLoading: crossings.every((c) => c.ticks === 0), standsStillPaused: pause.during <= 3, runsAfterPause: pause.after >= 15 };
}

export const expect = { p99Within: true, standsStillLoading: true, standsStillPaused: true, runsAfterPause: true };
