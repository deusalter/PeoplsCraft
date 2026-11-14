// What the block, chest and gate scenarios share: a quiet place, a levelled pad, and the host's count of every item.
import { BLOCKS, T_SOLID } from '../../src/data/blocks';
import type { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { fills, held } from './arena';

/** No creatures, day, and nothing hurts the bots: only what they do changes the place. */
export async function calm(ctx: Ctx, bots: Bot[], god = true): Promise<void> {
  for (const q of bots) {
    ctx.check((await q.cmd('caps 0 0')) === 'caps set', `${q.name}: no creatures`);
    if (god) await q.cmd('god on');
    await q.cmd('time day');
    await q.wait(250);
  }
  await bots[0].cmd('clearmobs');
}

export interface Pad { px: number; pz: number; g: number }
/** A floor of stone 3 deep round where `a` stands, `r` blocks each way, with `h` blocks of air over it; resolves once the
 *  bot holds it. Feet stand at g + 1. */
export async function pad(ctx: Ctx, a: Bot, r = 8, h = 10, at?: Pad): Promise<Pad> {
  const { px, pz, g } = at ?? { px: Math.floor(a.body.x), pz: Math.floor(a.body.z), g: Math.round(a.body.y) - 1 };
  await held(ctx, px - r, pz - r, px + r, pz + r);
  await fills(ctx, a, [[px - r, g - 2, pz - r, px + r, g, pz + r, 'stone'], [px - r, g + 1, pz - r, px + r, g + h, pz + r, 'air']]);
  const S = BLOCKS.findIndex((b) => b.key === 'stone');
  await a.until(() => a.vox.getBlock(px + r, g, pz + r) === S && a.vox.getBlock(px - r, g + h, pz - r) === 0, 10000, 'the pad');
  await a.until(() => a.body.onGround && T_SOLID[a.vox.getBlock(Math.floor(a.body.x), Math.round(a.body.y) - 1, Math.floor(a.body.z))] === 1, 5000, 'standing on the pad');
  return { px, pz, g };
}

/** Items of each key: in every pack and armour on the host, on the ground of a realm, and in the slot lists given. */
export async function totals(ctx: Ctx, dim = 0, boxes: ({ k: string; n: number } | null)[][] = []): Promise<Record<string, number>> {
  const t: Record<string, number> = {};
  const add = (k: string, n: number): void => { t[k] = (t[k] ?? 0) + n; };
  for (const p of await ctx.players()) { for (const [k, n] of Object.entries(p.items)) add(k, n); for (const m of p.mail) add(m.k, m.n); }
  for (const d of await ctx.drops(dim)) add(d.k, d.n);
  for (const s of boxes) for (const q of s) if (q) add(q.k, q.n);
  return t;
}
/** The keys where two counts differ, as text; '' when they agree. */
export function diff(a: Record<string, number>, b: Record<string, number>): string {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if ((a[k] ?? 0) !== (b[k] ?? 0)) out.push(`${k} ${a[k] ?? 0} -> ${b[k] ?? 0}`);
  return out.join(', ');
}
export const text = (t: Record<string, number>): string => Object.entries(t).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ');
export const blockId = (key: string): number => { const i = BLOCKS.findIndex((b) => b.key === key); if (i < 0) throw new Error('no block ' + key); return i; };
/** What the bot's pack, cursor and grid hold, by key. */
export function packOf(q: Bot): Record<string, number> {
  const t: Record<string, number> = {}, inv = q.invc.inv;
  for (const s of [...inv.slots, ...inv.armor, ...inv.craft, inv.cursor]) if (s) t[s.k] = (t[s.k] ?? 0) + s.n;
  return t;
}

/** `q` sets the gate kit `kit` with its foot in the cell, as the right button on the face under it does: the frame runs
 *  along x when `alongX`. Resolves once the host has answered. */
export async function setGate(ctx: Ctx, q: Bot, kit: string, x: number, y: number, z: number, alongX: boolean): Promise<void> {
  ctx.check((await q.cmd(`give ${kit} 1`)).startsWith('gave'), `${q.name} is given a ${kit}`);
  await q.until(() => q.count(kit) > 0, 5000, 'the kit');
  if (q.hotbar(kit) < 0) await q.op({ o: 'hotkey', v: [0, q.invc.inv.slots.findIndex((s) => s?.k === kit)], i: 8, e: kit });
  q.invc.setSel(q.hotbar(kit));
  await q.settle();
  q.lookAt(x + 0.5, y - 0.5, z + 0.5);
  const seq = q.invc.nextSeq();
  q.invc.internal(seq, { o: '_held', n: 1 });
  q.session.act({ t: 'item', seq, slot: q.invc.inv.sel, at: [x, y, z], ax: alongX });
  await q.settle();
}

/** `q` walks, with W held, to (x, z) and stays there; the walk ends of itself when the bot is sent somewhere to load
 *  (a crossing), so it never walks on in the realm it arrives in. */
export function walkInto(q: Bot, x: number, z: number, ms = 15000): void {
  const end = performance.now() + ms, tp = q.tpId;
  const t = setInterval(() => {
    const b = q.body, dx = x - b.x, dz = z - b.z;
    if (q.tpId !== tp || !q.ready || performance.now() > end) { q.keys.release('KeyW'); clearInterval(t); return; }
    if (Math.hypot(dx, dz) < 0.2) { q.keys.release('KeyW'); return; }
    b.yaw = Math.atan2(-dx, -dz);
    q.keys.press('KeyW');
  }, 4);
}

/** Cells of block `id` in the bot's copy of the world within `r` blocks (horizontally) and `h` vertically of a point. */
export function countNear(q: Bot, id: number, x: number, y: number, z: number, r: number, h: number): number {
  let n = 0;
  for (let i = Math.floor(x) - r; i <= Math.floor(x) + r; i++) for (let k = Math.floor(z) - r; k <= Math.floor(z) + r; k++) {
    if (!q.vox.ready(i, k)) continue;
    for (let j = Math.floor(y) - h; j <= Math.floor(y) + h; j++) if (q.vox.getBlock(i, j, k) === id) n++;
  }
  return n;
}

/** The 9 chunks round a column hash the same on every bot given and on the host; returns how many do. */
export async function sameWorld(ctx: Ctx, bots: Bot[], dim: number, x: number, z: number): Promise<number> {
  const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4, host = await ctx.hash(dim, cx - 1, cz - 1, cx + 1, cz + 1);
  let same = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = `${cx + i},${cz + j}`, hs = bots.map((q) => q.chunkHash(cx + i, cz + j));
    if (hs[0] !== null && hs.every((v) => v === hs[0]) && hs[0] === host[k]) same++;
    else ctx.log(`chunk ${k} of realm ${dim}: ${bots.map((q, n) => `${q.name} ${hs[n]}`).join(', ')}, host ${host[k]}`);
  }
  return same;
}
