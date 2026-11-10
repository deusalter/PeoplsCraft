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
    grab(on = true): void { game.input.locked = on; game.input.uiMode = false; },
    click(button: number, on: boolean): void { game.input.buttons[button] = on; if (on) game.input.clicks[button] = true; },
    cmd(c: string): string { return game.cheat(c); },
  };
  (window as any).T = T;
  (window as any).game = game;
}
