// Scenario restart (9, "The server restarting mid session"; 11). First a clean stop: Ada has called Vanahar up and Bram
// has just thrown five planks when the server gets SIGTERM. Both bots are told `shutdown`, retry on the backoff of 4.2
// (0.5, 1, 2, 4 s) and come back by themselves to a server whose `welcome.boot` differs. The summons entry was moved into
// `shared.owed` at boot and is paid at Ada's join, so the offering is back in her pack; both stand exactly where they
// were; the boss and the thrown planks are gone; every other item is where it was. Then two crashes: Ada lays a new
// offering on the altar and the server is killed with SIGKILL 0.2 s and, the next time, 5 s after it. The world after
// each is the last full commit, whole: the offering is either still in her pack or refunded, never both and never
// neither.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { S2COf } from '../../src/net/protocol';
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { OFFERING, arena, hostBoss, quiet, seenBoss, sleep, summon } from './arena';
import { diff, text } from './site';

const DOWN_MS = 3500;
/** 4.2: the waits between failed dials after the first. */
const BACKOFF = [1000, 2000, 4000, 8000];

/** Files named `name` anywhere under `dir`. */
function find(dir: string, name: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...find(p, name)); else if (e.name === name) out.push(p);
  }
  return out;
}
const without = (t: Record<string, number>, k: string): Record<string, number> => { const o = { ...t }; delete o[k]; return o; };

export default async function restart(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  const ida = playerIdOf(a.token)!, idb = playerIdOf(b.token)!;
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  const pickups: string[] = [];
  a.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 'u') pickups.push(String(e[1])); });
  const me = async (id: string): Promise<HostPlayer | undefined> => (await ctx.players()).find((p) => p.id === id);
  await quiet(ctx, [a, b], 2);
  await a.goto(a.body.x, a.body.z);
  const ar = await arena(ctx, a);
  ctx.check((await b.cmd('give oak_planks 12')).startsWith('gave'), 'Bram is given 12 planks');
  await b.until(() => b.count('oak_planks') === 12, 5000, 'the planks');
  await b.goto(ar.px + 3.5, ar.pz + 0.5);

  // ---- a clean stop in the middle of things ----
  await summon(ctx, a, ar);
  await Promise.all([a.settle(), b.settle()]);
  const s1 = await ctx.shared();
  ctx.check(s1.summons.length === 1 && s1.summons[0].by === ida && s1.summons[0].item === OFFERING, `the host holds the summons entry (${s1.summons.map((s) => `${s.item} by ${s.by === ida ? 'Ada' : s.by}`).join(', ')})`);
  const slot = b.invc.inv.slots.findIndex((s) => s?.k === 'oak_planks');
  b.look(b.body.yaw, 0);
  ctx.check(await b.op({ o: 'dropSlot', v: [0, slot], all: false, e: 'oak_planks' }), 'Bram throws a plank');
  for (let i = 0; i < 4; i++) await b.op({ o: 'dropSlot', v: [0, slot], all: false, e: 'oak_planks' });
  const ground = (await ctx.drops(0)).filter((d) => d.k === 'oak_planks').reduce((n, d) => n + d.n, 0);
  ctx.check(ground === 5, `five planks are in the air or on the floor (${ground})`);
  const [pa, pb] = [await me(ida), await me(idb)];
  const was = [a, b].map((q) => ({ x: q.body.x, y: q.body.y, z: q.body.z }));
  ctx.check(!!(await hostBoss(ctx)) && !!seenBoss(a), 'Vanahar is up');
  const boot0 = a.boots.at(-1)!, w0 = [a.counts.welcomes, b.counts.welcomes], d0 = [a.dials.length, b.dials.length];
  let stoppedAt = 0;
  const rc = await ctx.restart({ samePort: true, downMs: DOWN_MS, onStopped: () => { stoppedAt = performance.now(); } });
  ctx.check(rc === 0, `the server stopped on SIGTERM with exit 0 (${rc}) and is started again on the same port`);
  ctx.check(a.counts.errors.includes('shutdown') && b.counts.errors.includes('shutdown'), `both were told "shutdown" (${a.counts.errors.join(' ')}; ${b.counts.errors.join(' ')})`);
  // the bots are still dialling: what the host made of the summons at boot, before anyone joined
  const s2 = await ctx.shared(), owed = (s2.owed[ida]?.items ?? []).filter((s) => s.k === OFFERING).reduce((n, s) => n + s.n, 0);
  const early = (await ctx.players()).length;
  ctx.check(s2.summons.length === 0 && owed === 1, `at boot the summons entry was moved to shared.owed for Ada (${s2.summons.length} summons, ${owed} owed)`);
  ctx.check(early === 0 && !(await hostBoss(ctx)), `the new host holds no players yet (${early}) and no boss`);
  await Promise.all([a.until(() => a.counts.welcomes > w0[0], 20000, 'Ada back'), b.until(() => b.counts.welcomes > w0[1], 20000, 'Bram back')]);
  await Promise.all([a.loaded(), b.loaded()]);
  for (const [k, q] of [a, b].entries()) {
    const ds = q.dials.slice(d0[k]), gaps = ds.slice(1).map((t, i) => t - ds[i]);
    const fits = gaps.every((g, i) => g >= BACKOFF[i] - 50 && g <= BACKOFF[i] + 400);
    ctx.check(ds.length >= 2 && fits, `${q.name} came back by herself after ${ds.length} dials, ${gaps.map((g) => (g / 1000).toFixed(2)).join(', ')} s apart (the first ${((ds[0] - stoppedAt) / 1000).toFixed(2)} s after the old server was gone)`.replace('herself', q === a ? 'herself' : 'himself'));
  }
  ctx.check(a.boots.at(-1) !== boot0 && b.boots.at(-1) === a.boots.at(-1), `the welcome's boot differs (${boot0} then ${a.boots.at(-1)})`);
  await a.until(() => a.count(OFFERING) === 1, 10000, 'the offering').catch(() => {});
  await Promise.all([a.settle(), b.settle()]);
  ctx.check(a.count(OFFERING) === 1 && pickups.includes(OFFERING), `the offering is paid back into Ada's pack at her join, with the pickup line (${a.count(OFFERING)})`);
  const s3 = await ctx.shared();
  ctx.check(!s3.owed[ida] && s3.summons.length === 0, 'and nothing is owed any more');
  for (const [k, q] of [a, b].entries()) {
    const d = Math.hypot(q.body.x - was[k].x, q.body.y - was[k].y, q.body.z - was[k].z);
    ctx.check(d < 0.01, `${q.name} stands where the stop found ${q === a ? 'her' : 'him'} (${d.toFixed(3)} blocks off)`);
  }
  ctx.check(!(await hostBoss(ctx)) && !seenBoss(a) && (await ctx.mobs(0)).length === 0, 'the boss and every creature are gone');
  ctx.check((await ctx.drops(0)).length === 0, 'and so are the thrown planks');
  const [qa, qb] = [await me(ida), await me(idb)];
  const wantA = { ...pa!.items, [OFFERING]: 1 }, wantB = pb!.items;
  ctx.check(!diff(wantA, qa!.items) && qa!.mail.length === 0, `Ada holds what she held, and the offering (${diff(wantA, qa!.items) || text(qa!.items)})`);
  ctx.check(!diff(wantB, qb!.items) && qb!.items.oak_planks === 7, `Bram holds what he held but the five thrown planks (${diff(wantB, qb!.items) || text(qb!.items)})`);

  // ---- crashes: SIGKILL 0.2 s and 5 s after a summon ----
  ctx.check((await a.cmd('give oak_planks 3')).startsWith('gave'), 'Ada is given 3 planks: a change only a save keeps');
  await a.until(() => a.count('oak_planks') === 3, 5000, 'the planks');
  const hal = new Bot('Hal').token, toasts: string[] = [];
  a.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 't') toasts.push(String(e[1])); });
  for (const after of [200, 5000]) {
    await a.goto(ar.ax + 0.5, ar.az + 2.5);
    if (a.count(OFFERING) === 0) {
      ctx.check((await a.cmd(`give ${OFFERING} 1`)).startsWith('gave'), 'Ada is given an offering');
      await a.until(() => a.count(OFFERING) === 1, 5000, 'the offering');
    }
    if (a.hotbar(OFFERING) < 0) await a.op({ o: 'hotkey', v: [0, a.invc.inv.slots.findIndex((s) => s?.k === OFFERING)], i: 8, e: OFFERING });
    a.invc.setSel(a.hotbar(OFFERING));
    await a.settle();
    // a full commit of all this: a third player comes and says goodbye, and is let go from memory once it is written
    const h = ctx.bot(new Bot('Hal', hal)), idh = playerIdOf(h.token)!;
    await h.connect(ctx.url); await h.loaded();
    h.bye();
    const by = performance.now() + 15000;
    while ((await me(idh)) && performance.now() < by) await sleep(200);
    ctx.check(!(await me(idh)), `a commit holds Ada with the offering in her pack, at the altar (Hal was saved and let go)`);
    await sleep(1200);
    const base = await me(ida), spot = { x: a.body.x, y: a.body.y, z: a.body.z }, wa = a.counts.welcomes;
    ctx.check((base?.items[OFFERING] ?? 0) === 1, `the host has the offering in her pack (${base?.items[OFFERING] ?? 0})`);
    const nt = toasts.length;
    await a.use(ar.ax, ar.g + 1, ar.az);
    // the summon is the moment the host holds its entry
    let s4 = await ctx.shared();
    for (let i = 0; i < 100 && !s4.summons.length; i++) { await sleep(10); s4 = await ctx.shared(); }
    const t0 = performance.now();
    await a.until(() => a.count(OFFERING) === 0, 2000, 'the offering gone').catch(() => {});
    ctx.check(s4.summons.length === 1 && a.count(OFFERING) === 0, `Ada lays it on the altar (${s4.summons.length} summons${toasts.length > nt ? '; ' + toasts.slice(nt).join(' | ') : ''})`);
    await sleep(Math.max(0, after - (performance.now() - t0)));
    let journal: string[] = [], killedAt = 0;
    const rk = await ctx.restart({ kill: true, samePort: true, downMs: DOWN_MS, onStopped: () => { killedAt = performance.now(); journal = find(ctx.data, 'commit.json'); } });
    ctx.log(`killed by ${((killedAt - t0) / 1000).toFixed(2)} s after the summon (exit ${rk}); ${journal.length ? 'a commit.json was left, to be replayed' : 'no commit.json was left'}`);
    const s5 = await ctx.shared(), refund = (s5.owed[ida]?.items ?? []).filter((s) => s.k === OFFERING).reduce((n, s) => n + s.n, 0);
    ctx.check(s5.summons.length === 0 && refund <= 1, `after the crash: no summons, ${refund} offering owed to Ada (${refund ? 'the summon was in the last commit' : 'the summon was not'})`);
    if (after >= 5000) ctx.check(refund === 1, '5 s is long after the summon\'s own commit: it is in the world, and refunded');
    pickups.length = 0;
    await a.until(() => a.counts.welcomes > wa, 20000, 'Ada back');
    await a.loaded();
    await a.until(() => a.count(OFFERING) === 1, 8000, 'one offering').catch(() => {});
    await sleep(1000);
    await a.settle();
    const back = await me(ida), s6 = await ctx.shared();
    const n = (back?.items[OFFERING] ?? 0) + (back?.mail.filter((m) => m.k === OFFERING).reduce((k, m) => k + m.n, 0) ?? 0) + ((s6.owed[ida]?.items ?? []).filter((m) => m.k === OFFERING).reduce((k, m) => k + m.n, 0));
    ctx.check(n === 1 && a.count(OFFERING) === 1, `exactly one offering exists, in her pack (pack ${back?.items[OFFERING] ?? 0}, ${a.count(OFFERING)} in her view; in all ${n})`);
    ctx.check(refund ? pickups.includes(OFFERING) : !pickups.includes(OFFERING), refund ? 'paid back with the pickup line' : 'never taken: no refund came');
    ctx.check(!diff(without(base!.items, OFFERING), without(back!.items, OFFERING)), `everything else she holds is as the commit had it (${diff(without(base!.items, OFFERING), without(back!.items, OFFERING)) || text(back!.items)})`);
    const d = Math.hypot(a.body.x - spot.x, a.body.z - spot.z);
    ctx.check(d < 0.3, `she stands where the commit put her, at the altar (${d.toFixed(2)} blocks off)`);
    ctx.check(!(await hostBoss(ctx)), 'no boss');
    ctx.check(b.counts.welcomes >= 2, `Bram came back too (${b.counts.welcomes} welcomes)`);
  }
  for (const q of [a, b]) ctx.check(q.counts.rej === 0, `${q.name}: ${q.counts.rej} rej`);
}
