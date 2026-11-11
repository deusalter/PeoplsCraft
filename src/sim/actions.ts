// What a player does to the world.
import type { Item } from '../data/items';
import type { SimPlayer } from './player';
import type { Sim } from './sim';

/** Throw a stack out in front of the player, from the eye. */
export function dropItem(sim: Sim, p: SimPlayer, it: Item): void {
  const b = p.body, cp = Math.cos(b.pitch), dx = -Math.sin(b.yaw) * cp, dy = Math.sin(b.pitch), dz = -Math.cos(b.yaw) * cp;
  sim.realms[p.dim].drops.spawn(b.x + dx * 0.4, b.y + b.eye - 0.3, b.z + dz * 0.4, it, dx * 5, dy * 5 + 1.5, dz * 5, 1.2);
}
