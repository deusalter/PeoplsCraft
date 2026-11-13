// Smoke scenario `frames` (ARCHITECTURE.md 10.1, D37 (e)): what a script's frames do beside the display's own.
//
//   npm run smoke -- frames    1. Under a manual clock without &det, in the page and in the worker, with the display
//                                 drawing frames that step as well: every `T.frame()` runs one client tick of its own,
//                                 so `T.step(n)` runs n of them, however its frames fall among the display's.
//                              2. A world from the title menu (the worker's own clock) in a tab that is hidden: while
//                                 nothing drives it the world and the client both stand still with W held; while the
//                                 harness drives it (`T.run`, `T.cmd`) both move, and the host keeps the client's body
//                                 where the client has it.
import { driver } from './golden/golden.mjs';

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

const hide = (on) => {
  if (on) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  } else { delete document.hidden; delete document.visibilityState; }
  document.dispatchEvent(new Event('visibilitychange'));
};

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

  await page.goto(`${origin}/${extra ? '?' + extra.slice(1) : ''}`, { waitUntil: 'load' });
  await page.click('button:has-text("Begin"), button:has-text("New world")');
  await page.fill('input[placeholder="World name"]', 'Frames');
  await page.fill('input[placeholder^="Seed"]', 'frames');
  await page.click('button:has-text("Create world")');
  const d = driver(page, log);
  await d.boot(); await d.grab();
  if ((await d.ev(() => T.game.session.transport.kind)) !== 'worker') throw new Error('a world from the title menu is not on the worker transport');
  await d.cmd('god on'); await d.cmd('time day'); await d.cmd('fly');
  await d.ev(async () => { await D.caps(0, 0); await D.clearMobs(); });
  const look = () => d.ev(async () => {
    const p = T.game.player, h = await T.ask((sim) => { const q = [...sim.players.values()][0]; return { tick: sim.tick, x: q.body.x, z: q.body.z }; });
    return { tick: h.tick, x: p.x, z: p.z, gap: Math.hypot(p.x - h.x, p.z - h.z) };
  });
  await d.ev(`(${hide.toString()})(true)`);
  await d.ev(() => { T.grab(true); T.key('KeyW', true); });
  const a = await look();
  await page.waitForTimeout(1500);
  const b = await look();
  res.stillWhileUndriven = b.tick === a.tick && Math.hypot(b.x - a.x, b.z - a.z) < 0.01;
  log(`  hidden, nothing driving: ${b.tick - a.tick} steps, client moved ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)}`);
  await d.ev(() => T.run(3000));
  const c = await look();
  res.runsWhileDriven = c.tick - b.tick > 120 && Math.hypot(c.x - b.x, c.z - b.z) > 5;
  log(`  hidden, T.run(3000): ${c.tick - b.tick} steps, client moved ${Math.hypot(c.x - b.x, c.z - b.z).toFixed(2)}, host ${c.gap.toFixed(2)} from it`);
  res.cmdAnswered = await d.ev(() => Promise.race([T.cmd('simhash').then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 15000))]));
  await d.ev(() => T.key('KeyW', false));
  await d.ev(`(${hide.toString()})(false)`);
  await d.ev(() => T.run(1000));
  const e = await look();
  res.hostAgrees = e.gap < 1;
  log(`  shown again: host ${e.gap.toFixed(2)} from the client, client ${Math.hypot(e.x - c.x, e.z - c.z).toFixed(2)} from where T.run left it`);
  return res;
}

export const expect = { 'thread.own': [N, N], 'worker.own': [N, N], stillWhileUndriven: true, runsWhileDriven: true, cmdAnswered: true, hostAgrees: true };
