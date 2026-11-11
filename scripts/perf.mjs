// Smoke scenario `perf`: the scripted 20 s flight of docs/multiplayer/ARCHITECTURE.md 6.6 item 1.
// A fresh ?quick=perf world at a 12-chunk view; after the first view is meshed the player flies
// east at walking speed (11 blocks/s, creative flight, no sprint) for 20 s while
// requestAnimationFrame drives the game on its own, as it does for a player.
//
// Reported: game.prof worst values over the flight (world = chunk scheduling and uploads,
// tick = the fixed-step simulation, render = everything after it), and per frame the CPU time of
// Game.runFrame, its sim portion, the frame-to-frame interval, how many frames took over 16.7 ms of
// CPU and how many display refreshes were missed. The worst values are single frames, so anything
// else that wants the CPU during the flight raises them: each run also reports the machine's 1-minute
// load average before and after, and with --repeat the median of the sums so far.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { resolve } from 'node:path';

export const query = 'quick=perf&fresh';
const FLIGHT_MS = 20000, VIEW = 12;
const sums = [];

export async function run({ page, url, log }) {
  // settings live in localStorage: set the view, then load the world again so it starts with it
  await page.evaluate((v) => localStorage.setItem('cairnlight.settings', JSON.stringify({ gfx: { renderDist: v } })), VIEW);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.T, null, { timeout: 60000 });
  const load0 = loadavg()[0];
  const r = await page.evaluate(async ([ms, view]) => {
    const g = T.game;
    if (!(await T.loaded())) throw new Error('the world did not load');
    if (g.world.renderDist !== view) throw new Error(`view is ${g.world.renderDist}, wanted ${view}`);
    T.grab(true); T.cmd('god');
    if (T.cmd('creative') !== 'creative true') throw new Error('creative did not turn on');
    const p = g.player;
    T.cmd(`tp ${p.x} ${Math.floor(p.y) + 20} ${p.z}`);
    p.yaw = -Math.PI / 2; p.pitch = 0;
    await T.until(() => g.ready && g.world.counts().waiting === 0, 20000);
    await new Promise((res) => setTimeout(res, 1000));
    const cpu = [], sim = [], gap = [], orig = g.runFrame;
    let last = 0;
    g.runFrame = function (dt) {
      const pr = g.prof, keep = { ...pr };
      pr.world = pr.tick = pr.render = 0;
      const t0 = performance.now();
      orig.call(g, dt);
      const t1 = performance.now();
      cpu.push(t1 - t0); sim.push(pr.tick);
      if (last) gap.push(t0 - last);
      last = t0;
      pr.world = Math.max(keep.world, pr.world); pr.tick = Math.max(keep.tick, pr.tick); pr.render = Math.max(keep.render, pr.render);
    };
    g.prof.world = g.prof.tick = g.prof.render = 0;
    const x0 = p.x;
    T.key('KeyW', true);
    await new Promise((res) => setTimeout(res, ms));
    T.key('KeyW', false);
    g.runFrame = orig;
    return { prof: { ...g.prof }, cpu, sim, gap, flown: p.x - x0, scale: g.gfx.renderScale, preset: g.cfg.settings.preset, view: g.world.renderDist };
  }, [FLIGHT_MS, VIEW]);
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const sum = (a) => ({ mean: +mean(a).toFixed(2), p50: +q(a, 0.5).toFixed(2), p95: +q(a, 0.95).toFixed(2), p99: +q(a, 0.99).toFixed(2), max: +Math.max(...a).toFixed(2) });
  const out = {
    when: new Date().toISOString(), view: r.view, preset: r.preset, frames: r.cpu.length, flownBlocks: +r.flown.toFixed(1), renderScaleAtEnd: r.scale,
    profWorst: { world: +r.prof.world.toFixed(2), tick: +r.prof.tick.toFixed(2), render: +r.prof.render.toFixed(2), sum: +(r.prof.world + r.prof.tick + r.prof.render).toFixed(2) },
    frameCpuMs: sum(r.cpu), simMs: sum(r.sim), intervalMs: sum(r.gap),
    cpuOver16_7: +(r.cpu.filter((v) => v > 1000 / 60).length / r.cpu.length).toFixed(4),
    // a frame interval past 25 ms is a missed display refresh at 60 Hz
    intervalOver25: +(r.gap.filter((v) => v > 25).length / r.gap.length).toFixed(4),
    loadAverage: [+load0.toFixed(1), +loadavg()[0].toFixed(1)],
  };
  const dir = resolve('out/perf');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, out.when.replace(/[:.]/g, '-') + '.json'), JSON.stringify(out, null, 1));
  log(JSON.stringify(out, null, 1));
  sums.push(out.profWorst.sum);
  if (sums.length > 1) log(`prof sum, median of ${sums.length} runs: ${q(sums, 0.5)} ms (${sums.join(', ')})`);
  return undefined;
}
