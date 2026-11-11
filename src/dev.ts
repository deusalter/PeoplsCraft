// Developer / automated-test helpers, exposed as window.T. They drive the game in real time
// even when the tab is in the background and requestAnimationFrame is throttled.
import { B } from './data/blocks';
import type { Game } from './game';

export function installDevTools(game: Game): void {
  const ch = new MessageChannel();
  const tick = (): Promise<void> => new Promise((r) => { ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  const T = {
    game, B,
    /** Find the y of the first solid block at or below `y`. */
    floor(x: number, y: number, z: number): number { while (y > 1 && game.world.getBlock(x, y, z) === 0) y--; return y; },
    /** Run the game in real time for `ms` milliseconds. */
    async run(ms: number): Promise<void> {
      const end = performance.now() + ms;
      let last = performance.now();
      while (performance.now() < end) {
        const now = performance.now();
        if (now - last >= 1000 / 60) { game.runFrame(Math.min(0.05, (now - last) / 1000)); last = now; }
        await tick();
      }
    },
    /** Run until `pred()` is true or `timeout` ms pass. */
    async until(pred: () => boolean, timeout = 20000): Promise<boolean> {
      const end = performance.now() + timeout;
      while (performance.now() < end) { if (pred()) return true; await T.run(100); }
      return pred();
    },
    async loaded(): Promise<boolean> { return T.until(() => game.ready && game.world.counts().waiting === 0, 40000); },
    key(code: string, on: boolean): void { game.input.setKey(code, on); },
    /** Pretend the pointer is locked so the game accepts simulated input. */
    grab(on = true): void { game.input.locked = on; game.input.uiMode = false; if (on && !game.menu.open) game.paused = false; },
    click(button: number, on: boolean): void { game.input.buttons[button] = on; if (on) game.input.clicks[button] = true; },
    cmd(c: string): string { return game.cheat(c); },
    /** Line creatures up, frozen, on a stone platform in the sky so their models can be screenshotted.
     *  `dist` is how far in front of the camera they stand, `gap` the spacing between them. */
    async showcase(keys: string[], dist = 12, gap = 9, clock = 0.2): Promise<string> {
      const g = game, p = g.player, w = g.world, X = 8, Z = -8, Y = 160;
      g.paused = false; g.god = true; g.mobs.hostileCap = 0; g.mobs.passiveCap = 0; g.clock = Math.floor(g.clock) + clock; g.hud.setVisible(false); T.grab(true);
      if (w.getBlock(X, Y, Z) !== B.stone_bricks) {
        p.teleport(X + 0.5, Y + 1.01, Z + 0.5); await T.loaded();
        for (let dx = -20; dx <= 20; dx++) for (let dz = -40; dz <= 8; dz++) w.setBlock(X + dx, Y, Z + dz, B.stone_bricks);
      }
      p.teleport(X + 0.5, Y + 1.01, Z + 0.5); p.yaw = 0; p.pitch = 0.1; p.flying = false;
      await T.run(900);
      for (const m of g.mobs.list) m.active = false;
      keys.forEach((k, i) => { const m = g.mobs.spawn(k, X + 0.5 + (i - (keys.length - 1) / 2) * gap, Y + 1.05, Z + 0.5 - dist); if (m) m.yaw = Math.PI; });
      g.paused = true;       // simulation stops, rendering and idle animation continue
      await T.run(400);
      return `showing ${keys.join(', ')}; call T.run(300) again before a screenshot, and T.orbit(angle) to walk the camera around`;
    },
    /** Move the camera on a circle around the showcase line-up (angle in radians, 0 = front). */
    async orbit(angle: number, dist = 12, height = 2): Promise<void> {
      const p = game.player, cx = 8.5, cz = -7.5 - dist;
      p.flying = true; p.teleport(cx + Math.sin(angle) * dist, 161 + height, cz + Math.cos(angle) * dist);
      p.yaw = angle; p.pitch = -Math.atan2(height - 1.5, dist) * 0.6;
      const was = game.paused; game.paused = false; p.frozen = false; await T.run(60); game.paused = was; await T.run(300);
    },
  };
  (window as any).T = T;
  (window as any).game = game;
}
