// Scenario lateloot (11: a bot is parked and evicted before the boss dies; its share is in `shared.owed` and is paid at
// its next join; a newcomer who took its slot gets nothing). Ada, Bram and Cyd summon Vanahar 50 blocks east of the
// world spawn; Cyd, a participant by standing there, never hits it and quits. When the grace is over and his record is
// durable, the host lets go of him; Dot joins in his slot. Ada and Bram kill the boss with Dot far off. Cyd's share
// waits in `shared.owed` under his record id and is paid when he comes back; Dot has nothing from the fight.
import type { S2COf } from '../../src/net/protocol';
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { LOOT, arena, bossGone, flatDist, hitLog, quiet, seenBoss, shooting, sleep, summon, xpOf } from './arena';

const BOW = 'umbrite_bow', TIER = 5;
/** East of the spawn, so that the arena is not where a newcomer lands. */
const EAST = 50;

export default async function lateloot(ctx: Ctx): Promise<void> {
  const bots = ['Ada', 'Bram', 'Cyd'].map((n) => ctx.bot(new Bot(n)));
  const [a, b, c] = bots;
  const cydId = playerIdOf(c.token)!;
  await Promise.all(bots.map((q) => q.connect(ctx.url)));
  await Promise.all(bots.map((q) => q.loaded()));
  const hits = hitLog(bots);
  await quiet(ctx, bots, TIER);
  await Promise.all(bots.map((q) => q.until(() => q.count(BOW) > 0 && q.count('arrow') > 0, 5000, 'the bow and arrows')));
  await a.goto(a.body.x, a.body.z);
  const sx = a.body.x, sz = a.body.z, px = Math.floor(sx) + EAST, pz = Math.floor(sz), g = Math.round(a.body.y) - 1;
  const ar = await arena(ctx, a, { walled: true, at: [px, pz, g] });
  for (const [q, dx] of [[a, 0.5], [b, -1.5], [c, 2.5]] as const) await q.cmd(`tp ${px + dx} ${g + 1.01} ${pz + 0.5}`);
  await Promise.all(bots.map((q) => q.until(() => q.ready && q.body.onGround && flatDist(q.body.x, q.body.z, px, pz) < 4, 8000, 'the arena')));
  ctx.check(bots.every((q) => Math.abs(q.body.y - (g + 1)) < 0.05), `the three stand on the arena's floor, ${EAST} blocks east of the spawn`);

  await summon(ctx, a, ar);
  const cydSlot = c.slot, cydXp = xpOf(c), cydCoins = c.invc.inv.coins;
  ctx.check(hits.get(c)!.length === 0, 'Cyd never hit it: he is in the fight only as a participant');
  // the fight goes on at close quarters, nobody shooting, until the host has let Cyd go
  c.close();
  const t0 = performance.now(), at = (): number => (performance.now() - t0) / 1000;
  ctx.log('Cyd quits (his socket closes)');
  const states: string[] = [];
  let gone = -1;
  while (at() < 60) {
    const p = (await ctx.players()).find((q) => q.id === cydId);
    const s = p ? p.state : 'evicted';
    if (states[states.length - 1] !== s) { states.push(s); ctx.log(`${at().toFixed(1)} s: Cyd ${s} on the host`); }
    if (!p) { gone = at(); break; }
    await sleep(250);
  }
  ctx.check(states.includes('lingering') && gone > 28, `the host kept him through the grace, then parked and evicted him (${states.join(', ')}, ${gone.toFixed(1)} s)`);
  ctx.check(!!seenBoss(a), 'the boss is still alive');

  // ---- the newcomer, in his slot ----
  const d = ctx.bot(new Bot('Dot'));
  const dotLoot: string[] = [];
  await d.connect(ctx.url);
  d.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 'u') dotLoot.push(String(e[1])); });
  ctx.check(d.slot === cydSlot, `Dot was given Cyd's slot (${cydSlot}, Dot ${d.slot})`);
  await d.loaded();
  ctx.check((await d.cmd('god on')) === 'god true', 'Dot is protected');
  ctx.check((await d.cmd(`tp ${sx - 100} ${g + 60} ${sz}`)) === 'teleported', 'Dot goes 150 blocks from the altar, out of every distance of the fight');
  await d.until(() => d.ready && d.body.onGround && d.body.x < sx - 99, 20000, 'the landing');
  const dot0 = { xp: xpOf(d), coins: d.invc.inv.coins, loot: d.count(LOOT) };

  // ---- the kill ----
  const loot = new Map([a, b].map((q) => [q, q.count(LOOT)]));
  const stop = shooting([a, b], BOW, () => true, 1250);
  let dead: boolean;
  try { dead = await bossGone(ctx, 150000); } finally { stop(); }
  ctx.check(dead, 'Ada and Bram killed it');
  ctx.check(flatDist(d.body.x, d.body.z, ar.ax, ar.az) > 64, `Dot was ${flatDist(d.body.x, d.body.z, ar.ax, ar.az).toFixed(0)} blocks from the altar`);
  await Promise.all([a, b].map((q) => q.until(() => q.count(LOOT) > loot.get(q)!, 15000, 'the heartroot').catch(() => {})));
  for (const q of [a, b]) ctx.check(q.count(LOOT) > loot.get(q)!, `${q.name} picked up ${q.count(LOOT) - loot.get(q)!} heartroot`);
  await sleep(2000);
  const sh = await ctx.shared(), share = sh.owed[cydId];
  const shareLoot = (share?.items ?? []).filter((s) => s.k === LOOT).reduce((n, s) => n + s.n, 0);
  ctx.check(!!share && share.xp > 0 && shareLoot > 0, `Cyd's share waits in shared.owed under his record id: ${share ? `${share.xp} xp, ${share.coins} coins, ${share.items.map((s) => `${s.n} ${s.k}`).join(', ')}` : 'none'}`);
  ctx.check(Object.keys(sh.owed).length === 1, `nobody else is owed anything (${Object.keys(sh.owed).length} shares)`);
  const dh = (await ctx.players()).find((p) => p.name === 'Dot');
  ctx.check(xpOf(d) === dot0.xp && d.invc.inv.coins === dot0.coins && d.count(LOOT) === dot0.loot && !dotLoot.includes(LOOT), `Dot has nothing from the fight (xp ${dot0.xp} to ${xpOf(d)}, coins ${dot0.coins} to ${d.invc.inv.coins}, heartroot ${d.count(LOOT)})`);
  ctx.check(!!dh && !dh.items[LOOT] && dh.mail.length === 0, `the host holds nothing of it for Dot (heartroot ${dh?.items[LOOT] ?? 0}, mail ${dh?.mail.length})`);

  // ---- Cyd comes back ----
  const c2 = ctx.bot(new Bot('Cyd', c.token));
  await c2.connect(ctx.url);
  await c2.loaded();
  await c2.until(() => c2.count(LOOT) >= shareLoot, 10000, 'the share').catch(() => {});
  await c2.settle().catch(() => {});
  ctx.check(c2.count(LOOT) === shareLoot, `Cyd is paid his ${shareLoot} heartroot at his join (pack ${c2.count(LOOT)})`);
  ctx.check(xpOf(c2) > cydXp, `and his experience (level ${c2.invc.stats.level}, ${c2.invc.stats.xp} xp)`);
  ctx.check(c2.invc.inv.coins === cydCoins + share!.coins, `and his ${share?.coins} coins (${cydCoins} to ${c2.invc.inv.coins})`);
  const sh2 = await ctx.shared(), ch: HostPlayer | undefined = (await ctx.players()).find((p) => p.id === cydId);
  ctx.check(!sh2.owed[cydId], 'the share is gone from shared.owed');
  ctx.check(!!ch && (ch.items[LOOT] ?? 0) === shareLoot && ch.coins === c2.invc.inv.coins && ch.mail.length === 0, `the host holds it in his pack (${ch?.items[LOOT] ?? 0} heartroot, ${ch?.coins} coins, mail ${ch?.mail.length})`);
  const end = await ctx.stats();
  ctx.check(end.refused.fire === 0, `no shot refused (${end.refused.fire})`);
}
