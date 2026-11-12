// Rules both sides of the game apply: the simulation to decide, the client to predict and to prompt.
// Pure functions of their arguments.
import { CH, SEA } from '../core/constants';
import { BIOME } from '../data/biomes';
import { BLOCKS, T_DAMAGE, T_LIQUID, T_SOLID } from '../data/blocks';
import { Item, ITEMS, item, matches, rollModifier } from '../data/items';
import { LOOT } from '../data/loot';
import type { NpcDef } from '../data/npcs';
import { SMELTS } from '../data/recipes';
import { Climate, newCol } from '../world/gen/climate';
import { SPRINT } from './body';
import type { Inventory, Slot } from './inventory';
import { boxFree } from './physics';
import type { PlayerStats } from './stats';
import type { VoxelRead } from './voxels';

// ---- digging and reach -----------------------------------------------------------------------
export function reach(stats: PlayerStats, modes: { creative: boolean }): number { return (modes.creative ? 7 : 5) + stats.d.reach * 0.5; }
export function canHarvest(id: number, inv: Inventory): boolean {
  const b = BLOCKS[id], h = inv.held(), t = h ? item(h.k).tool : undefined;
  return b.power === 0 || (!!t && t.kind === b.tool && t.power >= b.power);
}
/** Seconds to break the block with the held item; Infinity if it cannot be broken. */
export function breakTime(id: number, inv: Inventory, stats: PlayerStats, modes: { creative: boolean }, body: { headInWater: boolean; onGround: boolean; inWater: boolean }): number {
  const b = BLOCKS[id];
  if (modes.creative) return 0;
  if (b.hard < 0) return Infinity;
  const h = inv.held(), t = h ? item(h.k).tool : undefined;
  let speed = t && t.kind === b.tool ? t.speed : 1;
  speed *= 1 + stats.d.mining;
  if (body.headInWater) speed /= 4;
  if (!body.onGround && !body.inWater) speed /= 2.5;
  return (b.hard * (canHarvest(id, inv) ? 1.5 : 5)) / speed;
}
const AT_REST = { headInWater: false, onGround: true, inWater: false };
/** The shortest `breakTime` the body's state allows: on the ground, out of water. A host holds a dig to this,
 *  because the flags it knows of the body are older than the ones the client mined with. */
export function breakTimeMin(id: number, inv: Inventory, stats: PlayerStats, modes: { creative: boolean }): number { return breakTime(id, inv, stats, modes, AT_REST); }
/** Swings, shots or casts per second with the held item. */
export function attackRate(inv: Inventory, stats: PlayerStats): number {
  const h = inv.held(), wpn = h ? item(h.k).weapon : undefined;
  return (wpn?.rate ?? 2.2) * (1 + stats.d.atkSpeed);
}
/** Blocks per second a body can honestly cover on the level; `canFly`: flight is open to this player. */
export function maxSpeed(stats: PlayerStats, canFly: boolean): number { return canFly ? 24 : SPRINT * (1 + stats.d.speed) * Math.max(1, 1 + stats.d.swim) + 1.2; }

// ---- slots -----------------------------------------------------------------------------------
export type SlotKind = 'inv' | 'armor' | 'acc' | 'craft' | 'out' | 'chest' | 'fin' | 'ffuel' | 'fout';
/** Can a forge of this level smelt the item? Pass 99 where no forge is open. */
export function smeltable(k: string, level: number): boolean {
  for (const q of SMELTS) if (q.forge <= level && matches(q.in, k)) return true;
  return false;
}
/** May `it` be put into slot `i` of a `kind` view? `acc` is the player's trinket row, `level` as for smeltable(). */
export function accepts(kind: SlotKind, i: number, it: Item, acc: Slot[], level: number): boolean {
  const d = item(it.k);
  switch (kind) {
    case 'armor': return !!d.armor && d.armor.slot === i;
    case 'acc': if (!d.acc) return false; for (let j = 0; j < 5; j++) { const a = acc[j]; if (a && j !== i && a.k === it.k) return false; } return true;
    case 'fin': return smeltable(it.k, level);
    case 'ffuel': return !!d.fuel;
    case 'out': case 'fout': return false;
    default: return true;
  }
}
/** Why accepts() said no, for a toast; '' when there is nothing useful to say. */
export function refusal(kind: SlotKind, it: Item): string {
  if (kind === 'acc' && item(it.k).acc) return 'Already wearing one: a second adds nothing';
  if (kind === 'ffuel') return 'That does not burn';
  if (kind === 'fin') {
    const q = SMELTS.find((q) => matches(q.in, it.k));
    if (!q) return 'That cannot be smelted';
    return 'Needs a ' + (BLOCKS.find((b) => b.use === 'forge' + q.forge)?.name ?? 'hotter forge');
  }
  return '';
}

/** Orders two item names by code unit, so a sort comes out the same on every machine. */
export const sortCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// ---- trade and loot --------------------------------------------------------------------------
/** Coins an item is worth to a trader. */
export function itemValue(k: string): number {
  const d = item(k);
  if (d.block !== undefined) { const b = BLOCKS[d.block]; return b.power >= 3 ? 6 + b.power * 4 : b.light ? 3 : 1; }
  const base = [2, 8, 25, 70, 160, 380, 900][d.rarity];
  return Math.round(base * (d.weapon || d.armor || d.acc ? 3 : 1));
}
export const sellPrice = (k: string): number => Math.max(1, Math.floor(itemValue(k) * 0.3));
/** What a townsperson sells right now, as [item, price, currency]. */
export function goods(n: NpcDef, flags: ReadonlySet<string>): [string, number, string][] {
  return n.goods.filter((x) => !x[3] || flags.has(x[3])).map((x) => [x[0], x[1], x[2] ?? 'coins']);
}
/** Roll a loot table. The coins are for the caller to credit. */
export function rollLoot(table: string, rnd: () => number): { items: Item[]; coins: number } {
  const t = LOOT[table];
  if (!t) return { items: [], coins: 0 };
  const items: Item[] = [], total = t.entries.reduce((s, e) => s + e[1], 0), rolls = t.rolls[0] + Math.floor(rnd() * (t.rolls[1] - t.rolls[0] + 1));
  for (let i = 0; i < rolls; i++) {
    let r = rnd() * total;
    for (const e of t.entries) { r -= e[1]; if (r <= 0) { if (ITEMS.has(e[0])) items.push({ k: e[0], n: e[2] + Math.floor(rnd() * (e[3] - e[2] + 1)), m: rollModifier(e[0], rnd, t.mod) }); break; } }
  }
  return { items, coins: t.coins[0] + Math.floor(rnd() * (t.coins[1] - t.coins[0] + 1)) };
}

// ---- places ----------------------------------------------------------------------------------
/** Somewhere to stand next to a bed: on it, a 1.8-tall body can wedge under a two-high ceiling. */
export function standSpot(w: VoxelRead, x: number, y: number, z: number): [number, number, number] {
  for (let i = 0; i < 8; i++) {
    const cx = x + (i < 4 ? (i === 0 ? 1 : i === 1 ? -1 : 0) : i & 1 ? 1 : -1), cz = z + (i < 4 ? (i === 2 ? 1 : i === 3 ? -1 : 0) : i & 2 ? 1 : -1);
    const below = w.getBlock(cx, y - 1, cz), a = w.getBlock(cx, y, cz), b = w.getBlock(cx, y + 1, cz);
    if (T_SOLID[below] && !T_DAMAGE[below] && !T_SOLID[a] && !T_LIQUID[a] && !T_DAMAGE[a] && !T_SOLID[b] && !T_LIQUID[b]) return [cx + 0.5, y + 0.05, cz + 0.5];
  }
  return [x + 0.5, y + 0.6, z + 0.5];
}
/** How far a body is drawn in on every side when a host asks whether it has room. */
export const BODY_SHRINK = 0.05;
/** True when a body of half-width `hw` and height `h`, drawn in by BODY_SHRINK, overlaps no solid block with its feet at (x, y, z). */
export function bodyFree(w: VoxelRead, x: number, y: number, z: number, hw = 0.3, h = 1.8): boolean {
  const s = BODY_SHRINK;
  return boxFree(w, x - hw + s, y + s, z - hw + s, x + hw - s, y + h - s, z + hw - s);
}
const SPOTS: Int8Array = (() => {
  const l: [number, number, number, number][] = [];
  for (let dy = -4; dy <= 4; dy++) for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const d = dx * dx + dy * dy + dz * dz; if (d <= 16) l.push([d, dx, dy, dz]); }
  l.sort((a, b) => a[0] - b[0]);
  return Int8Array.from(l.flatMap((q) => [q[1], q[2], q[3]]));
})();
/** Where to put a body that has no room at (x, y, z): the nearest cell centre within 4 blocks where it has room and stands
 *  on something solid; failing that the nearest where it has room at all; failing that straight up to the first free space.
 *  The position itself when the body has room there already. */
export function freeSpot(w: VoxelRead, x: number, y: number, z: number, hw = 0.3, h = 1.8): [number, number, number] {
  if (bodyFree(w, x, y, z, hw, h)) return [x, y, z];
  const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < SPOTS.length; i += 3) {
    const cx = bx + SPOTS[i], cy = by + SPOTS[i + 1], cz = bz + SPOTS[i + 2];
    if (cy < 1 || cy > CH || !w.ready(cx, cz)) continue;
    if (pass === 0 && !T_SOLID[w.getBlock(cx, cy - 1, cz)]) continue;
    if (bodyFree(w, cx + 0.5, cy, cz + 0.5, hw, h)) return [cx + 0.5, cy, cz + 0.5];
  }
  let cy = by + 1;
  while (cy < CH && !bodyFree(w, x, cy, z, hw, h)) cy++;
  return [x, cy, z];
}
/** Where a new world starts, as x and z: the first gentle dry land on a spiral out from the origin. */
export function findSpawn(climate: Climate): [number, number] {
  const c = newCol();
  for (let r = 0; r < 3000; r += 12) for (let a = 0; a < 8; a++) {
    const x = Math.round(Math.cos(a * 0.785 + r) * r), z = Math.round(Math.sin(a * 0.785 + r) * r);
    climate.sample(x, z, c);
    if (c.biome !== BIOME.ocean && c.biome !== BIOME.beach && c.h > SEA + 2 && c.h < SEA + 40 && c.mount < 0.25) return [x, z];
  }
  return [0, 0];
}
