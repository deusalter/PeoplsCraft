// Minimal water behaviour: when a gap opens beside or beneath water, the water moves in.
// Spread is budgeted per disturbance so a lake fills a trench but never floods a whole cave system.
import { B, T_LIQUID, T_OPAQUE, T_REPLACE, T_SOLID } from '../data/blocks';
import type { World } from '../world/world';

export class Fluids {
  private q: number[] = [];   // x, y, z, budget
  private t = 0;
  constructor(private w: World) {}
  clear(): void { this.q.length = 0; }
  /** Call when a block changed; queues the cell if water could now enter it. */
  poke(x: number, y: number, z: number): void { if (this.q.length < 4000) this.q.push(x, y, z, 7); }

  tick(dt: number): void {
    this.t -= dt;
    if (this.t > 0 || !this.q.length) return;
    this.t = 0.12;
    const w = this.w, q = this.q, n = Math.min(q.length / 4, 10);
    for (let i = 0; i < n; i++) {
      const x = q.shift()!, y = q.shift()!, z = q.shift()!, budget = q.shift()!;
      const id = w.getBlock(x, y, z);
      if (T_LIQUID[id] || !T_REPLACE[id] || y < 1) continue;
      const above = T_LIQUID[w.getBlock(x, y + 1, z)] === 1;
      const below = w.getBlock(x, y - 1, z), floor = (T_SOLID[below] && T_OPAQUE[below]) || T_LIQUID[below] === 1;
      let side = 0;
      if (T_LIQUID[w.getBlock(x + 1, y, z)] === 1) side++;
      if (T_LIQUID[w.getBlock(x - 1, y, z)] === 1) side++;
      if (T_LIQUID[w.getBlock(x, y, z + 1)] === 1) side++;
      if (T_LIQUID[w.getBlock(x, y, z - 1)] === 1) side++;
      if (!above && !(side > 0 && (floor || side >= 2))) continue;
      w.setBlock(x, y, z, B.water, true);
      if (budget <= 0) continue;
      // falling water keeps its budget; sideways creep spends it
      if (!floor) q.push(x, y - 1, z, budget);
      else { q.push(x + 1, y, z, budget - 1, x - 1, y, z, budget - 1, x, y, z + 1, budget - 1, x, y, z - 1, budget - 1); }
    }
  }
}
