// Developer / automated-test helpers, exposed as window.T. They drive the game in real time
// even when the tab is in the background and requestAnimationFrame is throttled.
import { B, BLOCKS } from './data/blocks';
import type { Game } from './game';
import { STEP } from './sim/clock';
import { newRayHit, raycast } from './sim/physics';
import type { Sim } from './sim/sim';

/** `sim`: the simulation when it runs in this page. `ask(src, arg)`: run the function whose source is `src` as
 *  `(sim, arg, host) => value` where the simulation is, this page or its worker, and settle with what it returned. A script
 *  acts through the game and `cmd`; these two are for white-box checks. */
export function installDevTools(game: Game, where: { sim?: Sim; ask: (src: string, arg: unknown) => Promise<unknown> }): void {
  const sim = where.sim;
  const ch = new MessageChannel();
  const tick = (): Promise<void> => new Promise((r) => { ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  const T = {
    game, B, sim,
    /** What a script needs of the game's own modules, where no development server hands them out. */
    lib: { BLOCKS, raycast, newRayHit },
    /** Find the y of the first solid block at or below `y`. */
    floor(x: number, y: number, z: number): number { while (y > 1 && game.world.getBlock(x, y, z) === 0) y--; return y; },
    /** Exactly one frame of one step, whatever the wall clock says. */
    async frame(): Promise<void> { await game.scriptFrame(STEP); await tick(); },
    /** `n` frames with no pacing: what a script that must not depend on the wall clock uses instead of `run`. */
    async step(n: number): Promise<void> { for (let i = 0; i < n; i++) await T.frame(); },
    /** Run the game in real time for `ms` milliseconds. */
    async run(ms: number): Promise<void> {
      const end = performance.now() + ms;
      let last = performance.now();
      while (performance.now() < end) {
        const now = performance.now();
        if (now - last >= 1000 / 60) { await game.scriptFrame(Math.min(0.05, (now - last) / 1000)); last = now; }
        await tick();
      }
    },
    /** Run until `pred()` is true (or settles true) or `timeout` ms pass. */
    async until(pred: () => boolean | Promise<boolean>, timeout = 20000): Promise<boolean> {
      const end = performance.now() + timeout;
      while (performance.now() < end) { if (await pred()) return true; await T.run(100); }
      return pred();
    },
    /** `fn(sim, arg, host)` run where the simulation is. `fn` must not reach anything outside itself: in the worker only its
     *  source arrives. What it returns comes back as a copy there. */
    ask<A, R>(fn: (sim: Sim, arg: A, host: unknown) => R, arg?: A): Promise<Awaited<R>> { return where.ask(fn.toString(), arg) as Promise<Awaited<R>>; },
    /** True on the first frame in which the player is in play and the view is meshed. */
    async loaded(): Promise<boolean> {
      const end = performance.now() + 40000, ok = (): boolean => game.ready && game.world.counts().waiting === 0;
      // &det: one step a frame, so the run comes back in the tick it came into play whatever the wall clock did meanwhile
      if (game.cfg.det) { while (performance.now() < end) { await T.frame(); if (ok()) return true; } return ok(); }
      let last = performance.now() - 1000 / 60;
      while (performance.now() < end) {
        const now = performance.now();
        if (now - last >= 1000 / 60) { await game.scriptFrame(Math.min(0.05, (now - last) / 1000)); last = now; if (ok()) return true; }
        await tick();
      }
      return ok();
    },
    key(code: string, on: boolean): void { game.input.setKey(code, on); },
    /** Pretend the pointer is locked so the game accepts simulated input. */
    grab(on = true): void { game.input.locked = on; game.input.uiMode = false; if (on && !game.menu.open) game.paused = false; },
    click(button: number, on: boolean): void { game.input.buttons[button] = on; if (on) game.input.clicks[button] = true; },
    /** Send a command to the host and run frames until its reply is in. */
    async cmd(c: string): Promise<string> {
      let reply: string | null = null;
      void game.cmd(c).then((r) => { reply = r; });
      // a host on its own clock answers in its time, not in this page's frames
      if (!game.cfg.step) await T.until(() => reply !== null, 10000);
      for (let i = 0; i < 600 && reply === null; i++) await T.frame();
      if (reply === null) throw new Error(`no reply to "${c}": is the game paused?`);
      return reply;
    },
    /** Line creatures up, frozen, on a stone platform in the sky so their models can be screenshotted.
     *  `dist` is how far in front of the camera they stand, `gap` the spacing between them. */
    async showcase(keys: string[], dist = 12, gap = 9, clock = 0.2): Promise<string> {
      const g = game, p = g.player, w = g.world, X = 8, Z = -8, Y = 160;
      g.paused = false; await T.cmd('god on'); await T.cmd('caps 0 0'); await T.cmd('time ' + clock); g.hud.setVisible(false); T.grab(true);
      if (p.flying) await T.cmd('fly');
      if (w.getBlock(X, Y, Z) !== B.stone_bricks) {
        await T.cmd(`tp ${X + 0.5} ${Y + 1.01} ${Z + 0.5}`); await T.loaded();
        await T.cmd(`fill ${X - 20} ${Y} ${Z - 40} ${X + 20} ${Y} ${Z + 8} stone_bricks`);
      }
      await T.cmd(`tp ${X + 0.5} ${Y + 1.01} ${Z + 0.5}`); p.yaw = 0; p.pitch = 0.1;
      await T.run(900);
      await T.cmd('clearmobs');
      for (let i = 0; i < keys.length; i++) await T.cmd(`spawnat ${keys[i]} ${X + 0.5 + (i - (keys.length - 1) / 2) * gap} ${Y + 1.05} ${Z + 0.5 - dist} ${Math.PI}`);
      await T.cmd('freeze on');
      await T.run(400);
      g.paused = true;       // the simulation stops, rendering and idle animation continue
      return `showing ${keys.join(', ')}; call T.run(300) again before a screenshot, and T.orbit(angle) to walk the camera around`;
    },
    /** Move the camera on a circle around the showcase line-up (angle in radians, 0 = front). */
    async orbit(angle: number, dist = 12, height = 2): Promise<void> {
      const p = game.player, cx = 8.5, cz = -7.5 - dist, was = game.paused;
      game.paused = false;
      if (!p.flying) await T.cmd('fly');
      await T.cmd(`tp ${cx + Math.sin(angle) * dist} ${161 + height} ${cz + Math.cos(angle) * dist}`);
      p.yaw = angle; p.pitch = -Math.atan2(height - 1.5, dist) * 0.6;
      await T.run(60); game.paused = was; await T.run(300);
    },
  };
  (window as any).T = T;
  (window as any).game = game;
}
