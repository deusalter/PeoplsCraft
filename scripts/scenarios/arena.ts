// What the fighting scenarios share: a levelled arena with Vanahar's altar, bots that shoot a boss with a ballistic aim,
// the summons, and the host's view of the boss.
import { item } from '../../src/data/items';
import { MOB_LIST, PROJECTILES } from '../../src/data/mobs';
import type { S2COf } from '../../src/net/protocol';
import type { SnapMob } from '../../src/net/snapshot';
import type { Bot } from '../bot/bot';
import type { Ctx, HostMob } from '../bot/runner';

export const OFFERING = 'verdant_idol', LOOT = 'heartroot';
/** Vanahar's health: 924 with three near is round(420 x 2.2). */
export const VANAHAR_HP = 420;
export const maxHpFor = (n: number, hp = VANAHAR_HP): number => Math.round(hp * (1 + 0.6 * (n - 1)));
const EYE = 1.62;

/** Where the arena is: the floor's top block is `g`, feet stand at g + 1; the altar is at (ax, g + 1, az). */
export interface Arena { px: number; pz: number; g: number; ax: number; az: number }

/** Every `h` the host sent each bot (its own hits), with the time it arrived. */
export function hitLog(bots: Bot[]): Map<Bot, number[]> {
  const log = new Map<Bot, number[]>(bots.map((q) => [q, []]));
  for (const q of bots) q.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 'h') log.get(q)!.push(performance.now()); });
  return log;
}

/** Nothing else acts on the place: no creatures, day, the bots unhurt by anything when `god`, each with the kit of `tier`. */
export async function quiet(ctx: Ctx, bots: Bot[], tier: number, god = true): Promise<void> {
  for (const q of bots) {
    ctx.check((await q.cmd('caps 0 0')) === 'caps set', `${q.name}: no creatures`);
    if (god) await q.cmd('god on');
    await q.cmd('time day'); await q.cmd(`gear ${tier}`);
    await q.wait(250);
  }
  await bots[0].cmd('clearmobs');
}

/** Fills spaced so that the `cmd` bucket of 4.1 (5 a second) never drops one. */
export async function fills(ctx: Ctx, q: Bot, boxes: [number, number, number, number, number, number, string][]): Promise<void> {
  for (const [x0, y0, z0, x1, y1, z1, key] of boxes) {
    ctx.check((await q.cmd(`fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} ${key}`)) === 'filled', `${q.name} fills ${x1 - x0 + 1} x ${y1 - y0 + 1} x ${z1 - z0 + 1} of ${key}`);
    await q.wait(300);
  }
}

/** Waits until the host holds every chunk over the blocks x0..x1, z0..z1 of the Overworld. */
export async function held(ctx: Ctx, x0: number, z0: number, x1: number, z1: number, ms = 30000): Promise<void> {
  const end = performance.now() + ms, c = [x0 >> 4, z0 >> 4, x1 >> 4, z1 >> 4];
  for (;;) {
    const h = await ctx.hash(0, c[0], c[1], c[2], c[3]);
    if (Object.values(h).every((v) => v !== '-')) return;
    if (performance.now() > end) throw new Error(`the host does not hold the chunks of ${x0} ${z0} to ${x1} ${z1}: ${JSON.stringify(h)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** A floor of stone round where `a` stands (or round `at`, given as x, z and the floor's height), cleared 14 high, with the altar `north` blocks north of it. With `walled`,
 *  a wall 3 high at 9 blocks round the altar keeps a walking boss (it jumps 1.8) within reach of the altar. */
export async function arena(ctx: Ctx, a: Bot, opts: { north?: number; walled?: boolean; extra?: [number, number, number, number, number, number, string][]; at?: [number, number, number] } = {}): Promise<Arena> {
  const [px, pz, g] = opts.at ?? [Math.floor(a.body.x), Math.floor(a.body.z), Math.round(a.body.y) - 1];
  const ax = px, az = pz - (opts.north ?? 4);
  await held(ctx, ax - 12, az - 12, ax + 12, az + 12);
  const boxes: [number, number, number, number, number, number, string][] = [
    [ax - 11, g - 2, az - 11, ax + 11, g, az + 11, 'stone'], [ax - 11, g + 1, az - 11, ax + 11, g + 14, az + 11, 'air'],
  ];
  if (opts.walled) boxes.push([ax - 9, g + 1, az - 9, ax + 9, g + 3, az + 9, 'stone'], [ax - 8, g + 1, az - 8, ax + 8, g + 3, az + 8, 'air']);
  boxes.push(...(opts.extra ?? []), [ax, g + 1, az, ax, g + 1, az, 'altar1']);
  await fills(ctx, a, boxes);
  return { px, pz, g, ax, az };
}

/** How far east of the altar a bot stands to be out of every 64 of 7.9 and 7.4 and inside the 80 of a valid target, when
 *  the wall keeps a walking boss within 9 blocks of the altar. */
export const FAR = 76;
/** The walled arena of `arena` with a corridor east of it, floored and cleared, out to FAR + 3 blocks from the altar. */
export async function walledWithCorridor(ctx: Ctx, a: Bot): Promise<Arena> {
  const px = Math.floor(a.body.x), pz = Math.floor(a.body.z), g = Math.round(a.body.y) - 1, az = pz - 4;
  await held(ctx, px - 12, az - 4, px + FAR + 3, az + 4);
  return arena(ctx, a, {
    walled: true,
    extra: [[px + 12, g - 2, az - 3, px + FAR + 3, g, az + 3, 'stone'], [px + 12, g + 1, az - 3, px + FAR + 3, g + 12, az + 3, 'air']],
  });
}
/** Sends `q` to the corridor's far end, `dz` blocks off its middle line, and waits until it stands there. */
export async function toFar(ctx: Ctx, q: Bot, ar: Arena, dz: number): Promise<void> {
  const x = ar.ax + FAR + 0.5, z = ar.az + dz;
  ctx.check((await q.cmd(`tp ${x} ${ar.g + 1.01} ${z}`)) === 'teleported', `${q.name} goes ${FAR} blocks east of the altar`);
  await q.until(() => q.ready && Math.abs(q.body.x - x) < 0.5 && Math.abs(q.body.z - z) < 0.5 && q.body.onGround, 8000, 'the far spot');
  ctx.check(Math.abs(q.body.y - (ar.g + 1)) < 0.05, `${q.name} stands on the corridor's floor (y ${q.body.y.toFixed(2)})`);
}

/** The boss as the host holds it, or null. */
export async function hostBoss(ctx: Ctx): Promise<HostMob | null> {
  return (await ctx.mobs(0)).find((m) => m.boss) ?? null;
}
/** The boss as bot `q` sees it in its latest snapshot. */
export const seenBoss = (q: Bot): SnapMob | undefined => q.mobs.find((x) => x.boss);

/** Watches the boss through `q`'s snapshots and keeps its velocity, for leading a shot. */
export class Tracker {
  vx = 0; vy = 0; vz = 0;
  private last: { x: number; y: number; z: number; t: number } | null = null;
  private timer: ReturnType<typeof setInterval>;
  constructor(q: Bot) {
    this.timer = setInterval(() => {
      const m = seenBoss(q), t = performance.now();
      if (!m) { this.last = null; return; }
      const l = this.last;
      if (l && t - l.t > 150) {
        const dt = (t - l.t) / 1000, k = 0.5;
        this.vx += ((m.x - l.x) / dt - this.vx) * k; this.vy += ((m.y - l.y) / dt - this.vy) * k; this.vz += ((m.z - l.z) / dt - this.vz) * k;
        this.last = { x: m.x, y: m.y, z: m.z, t };
      } else if (!l) this.last = { x: m.x, y: m.y, z: m.z, t };
    }, 50);
  }
  stop(): void { clearInterval(this.timer); }
}

/** The direction that puts an arrow of speed `v` (gravity `g`) from the eye of `q` onto (x, y, z), led by the boss's
 *  velocity over the flight; the lower of the two arcs. */
export function aim(q: Bot, m: SnapMob, v: number, g: number, tr: Tracker | null): [number, number, number] {
  const h = MOB_LIST[m.def]?.h ?? 2, ex = q.body.x, ey = q.body.y + EYE, ez = q.body.z;
  let tx = m.x, ty = m.y + h * 0.45, tz = m.z, dir: [number, number, number] = [tx - ex, ty - ey, tz - ez];
  for (let i = 0; i < 3; i++) {
    const dx = tx - ex, dz = tz - ez, d = Math.hypot(dx, dz) || 1e-6, dy = ty - ey;
    const disc = v ** 4 - g * (g * d * d + 2 * dy * v * v);
    const th = disc < 0 ? Math.PI / 4 : Math.atan((v * v - Math.sqrt(disc)) / (g * d));
    dir = [Math.cos(th) * dx / d, Math.sin(th), Math.cos(th) * dz / d];
    if (!tr) break;
    const t = d / (v * Math.cos(th));
    tx = m.x + tr.vx * t; tz = m.z + tr.vz * t; ty = m.y + h * 0.45 + Math.max(0, tr.vy) * t;
  }
  return dir;
}

/** Each bot in `who` shoots at the boss with `bow`, one shot per `every` ms, while `on()` holds; returns the stop. */
export function shooting(who: Bot[], bow: string, on: () => boolean, every = 1250, tr: Tracker | null = null): () => void {
  const v = item(bow).weapon?.projSpeed ?? 34, g = PROJECTILES.arrow.gravity;
  const t = setInterval(() => {
    if (!on()) return;
    for (const q of who) {
      const m = seenBoss(q);
      if (!q.ready || !m || q.count('arrow') === 0) continue;
      if (q.invc.inv.sel !== q.hotbar(bow)) { q.invc.setSel(q.hotbar(bow)); continue; }
      const d = aim(q, m, v, g, tr);
      q.look(Math.atan2(-d[0], -d[2]), Math.atan2(d[1], Math.hypot(d[0], d[2])));
      q.fire(d);
    }
  }, every);
  return () => clearInterval(t);
}

/** `q` is given the offering, lays it on the altar from a step in front of it, and walks back. */
export async function summon(ctx: Ctx, q: Bot, ar: Arena): Promise<HostMob> {
  ctx.check((await q.cmd(`give ${OFFERING} 1`)).startsWith('gave'), `${q.name} is given the offering`);
  await q.until(() => q.count(OFFERING) > 0, 5000, 'the offering');
  // the kit of `gear` fills the hotbar, so the offering lands in the pack: onto the last hotbar slot with it
  if (q.hotbar(OFFERING) < 0) ctx.check(await q.op({ o: 'hotkey', v: [0, q.invc.inv.slots.findIndex((s) => s?.k === OFFERING)], i: 8, e: OFFERING }), `${q.name} puts the offering in the hotbar`);
  q.invc.setSel(q.hotbar(OFFERING));
  await q.settle();
  const back: [number, number] = [q.body.x, q.body.z];
  await q.goto(ar.ax + 0.5, ar.az + 2.5);
  await q.use(ar.ax, ar.g + 1, ar.az);
  await q.until(() => !!seenBoss(q), 10000, 'the boss in a snapshot');
  await q.goto(back[0], back[1]);
  ctx.check(q.count(OFFERING) === 0, `${q.name} laid the offering on the altar`);
  const m = await hostBoss(ctx);
  if (!m) throw new Error('no boss on the host');
  return m;
}

/** Polls the host every 500 ms until the boss is gone or `ms` pass; true when it is gone. */
export async function bossGone(ctx: Ctx, ms: number): Promise<boolean> {
  const end = performance.now() + ms;
  while (performance.now() < end) { if (!(await hostBoss(ctx))) return true; await new Promise((r) => setTimeout(r, 500)); }
  return !(await hostBoss(ctx));
}

export const flatDist = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** level x 1e6 + xp: grows with every experience gained. */
export const xpOf = (q: Bot): number => q.invc.stats.level * 1e6 + q.invc.stats.xp;
