// Smoke scenario `frames` (ARCHITECTURE.md 10.1): what a script's frames do beside the display's own.
//
//   npm run smoke -- frames    1. Under a manual clock without &det, in the page and in the worker, with the display
//                                 drawing frames that step as well: every `T.frame()` runs one client tick of its own,
//                                 so `T.step(n)` runs n of them, however its frames fall among the display's.
export const query = '';
const N = 300;

/** In the page: `T.step(N)` twice, counting the client ticks each script frame ran itself. */
async function ownTicks(N) {
  const g = T.game, tick = g.tick, run = g.runFrame, frame = g.frame;
  let ticks = 0, display = false, own = 0;
  g.tick = function (dt) { ticks++; return tick.call(this, dt); };
  g.frame = (now) => { display = true; try { frame(now); } finally { display = false; } };
  g.runFrame = function (dt) { const t0 = ticks, r = run.call(this, dt); if (!display) own += ticks - t0; return r; };
  // the display frame already asked for calls the unwrapped one, which asks for the wrapped one
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = [];
  try {
    for (let k = 0; k < 2; k++) { own = 0; const t0 = ticks; await T.step(N); out.push({ own, all: ticks - t0 }); }
  } finally { g.tick = tick; g.runFrame = run; g.frame = frame; }
  return out;
}

export async function run({ page, origin, log, extra }) {
  const res = {};
  for (const [name, q] of [['thread', ''], ['worker', '&worker']]) {
    await page.goto(`${origin}/?quick=frames&fresh${q}${extra}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.T, null, { timeout: 60000 });
    const r = await page.evaluate(async ([src, n]) => {
      if (!(await T.loaded())) throw new Error('the world did not load');
      T.grab(true);
      return new Function('return ' + src)()(n);
    }, [ownTicks.toString(), N]);
    log(`  ${name}: ${JSON.stringify(r)}`);
    res[`${name}.own`] = r.map((x) => x.own);
  }

  return res;
}

export const expect = { 'thread.own': [N, N], 'worker.own': [N, N] };
