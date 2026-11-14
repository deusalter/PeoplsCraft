// Scenario boss (11, stage 5): three bots summon Vanahar together: its maxHp is 924 with three near. Two of them then
// shoot it from 70 blocks, where only their damage keeps them in the count (7.9: within 64 blocks, or a hit in the last
// 20 s), and it stays 924. All three kill it, and each ends with its own heartroot.
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { LOOT, Tracker, bossGone, flatDist, hitLog, hostBoss, maxHpFor, quiet, seenBoss, shooting, sleep, summon, toFar, walledWithCorridor, xpOf } from './arena';

const BOW = 'umbrite_bow', TIER = 5;
/** Longer than the 10 s a fall of the count waits (7.9), so a count that fell would show. */
const FAR_MS = 16000;

export default async function boss(ctx: Ctx): Promise<void> {
  const bots = ['Ada', 'Bram', 'Cyd'].map((n) => ctx.bot(new Bot(n)));
  const [a, b, c] = bots;
  await Promise.all(bots.map((q) => q.connect(ctx.url)));
  await Promise.all(bots.map((q) => q.loaded()));
  const hits = hitLog(bots);
  await quiet(ctx, bots, TIER);
  await Promise.all(bots.map((q) => q.until(() => q.count(BOW) > 0 && q.count('arrow') > 0, 5000, 'the bow and arrows')));
  await a.goto(a.body.x, a.body.z);

  // the arena, walled, and a corridor east of it to where the archers will stand
  const px = Math.floor(a.body.x), pz = Math.floor(a.body.z);
  const ar = await walledWithCorridor(ctx, a);
  await Promise.all([a.goto(px + 0.5, pz + 0.5), b.goto(px - 1.5, pz + 0.5), c.goto(px + 2.5, pz + 0.5)]);
  ctx.check(bots.every((q) => flatDist(q.body.x, q.body.z, a.body.x, a.body.z) < 4), 'the three stand together by the altar');

  // ---- three near ----
  await summon(ctx, a, ar);
  const want = maxHpFor(3);
  await a.until(() => seenBoss(a)?.boss?.maxHp === want, 5000, `maxHp ${want}`).catch(() => {});
  for (const q of bots) ctx.check(seenBoss(q)?.boss?.maxHp === want, `${q.name} sees maxHp ${seenBoss(q)?.boss?.maxHp} with three near (${want})`);

  // ---- two shoot from 70 blocks ----
  const spots: [Bot, number][] = [[b, -1.5], [c, 1.5]];
  for (const [q, dz] of spots) await toFar(ctx, q, ar, dz);
  const tr = new Tracker(b);
  const far = new Map<Bot, { hits: number; minD: number; sumD: number; n: number }>(spots.map(([q]) => [q, { hits: 0, minD: Infinity, sumD: 0, n: 0 }]));
  const seen = new Set<number>();
  const h0 = new Map(spots.map(([q]) => [q, hits.get(q)!.length]));
  const stop = shooting([b, c], BOW, () => true, 800, tr);
  const t0 = performance.now();
  try {
    while (performance.now() - t0 < FAR_MS) {
      const m = await hostBoss(ctx);
      if (!m) break;
      for (const q of bots) { const s = seenBoss(q)?.boss; if (s) seen.add(s.maxHp); }
      for (const [q] of spots) {
        const f = far.get(q)!, d = flatDist(q.body.x, q.body.z, m.x, m.z);
        f.minD = Math.min(f.minD, d); f.sumD += d; f.n++;
      }
      await sleep(250);
    }
  } finally { stop(); }
  const farMs = performance.now() - t0;
  ctx.check(farMs >= FAR_MS - 300, `the boss lived through the ${(FAR_MS / 1000).toFixed(0)} s of shooting from afar (${(farMs / 1000).toFixed(1)} s)`);
  for (const [q] of spots) {
    const f = far.get(q)!;
    f.hits = hits.get(q)!.length - h0.get(q)!;
    ctx.check(f.minD > 64, `${q.name} shot from ${(f.sumD / f.n).toFixed(1)} blocks on average, never nearer than ${f.minD.toFixed(1)} (over 64)`);
    ctx.check(f.hits >= 2, `${q.name} hit it ${f.hits} times from there`);
  }
  ctx.check(seen.size === 1 && seen.has(want), `maxHp stayed ${want} while two shot from afar (seen: ${[...seen].join(', ')})`);

  // ---- the kill: all three shoot, the archers from where they are ----
  const loot = new Map(bots.map((q) => [q, q.count(LOOT)])), xp = new Map(bots.map((q) => [q, xpOf(q)]));
  const hk = new Map(bots.map((q) => [q, hits.get(q)!.length]));
  const stopAll = shooting(bots, BOW, () => true, 1250, tr);
  let dead: boolean;
  try { dead = await bossGone(ctx, 150000); } finally { stopAll(); tr.stop(); }
  ctx.check(dead, 'the boss is dead');
  for (const q of bots) ctx.check(hits.get(q)!.length > hk.get(q)!, `${q.name} hit it ${hits.get(q)!.length - hk.get(q)!} more times in the kill`);
  await Promise.all(bots.map((q) => q.until(() => q.count(LOOT) > loot.get(q)!, 15000, 'the heartroot').catch(() => {})));
  await Promise.all(bots.map((q) => q.settle().catch(() => {})));
  const host = await ctx.players();
  for (const q of bots) {
    const got = q.count(LOOT) - loot.get(q)!, hp = host.find((p) => p.name === q.name);
    ctx.check(got > 0, `${q.name} picked up ${got} heartroot of its own`);
    ctx.check(!!hp && (hp.items[LOOT] ?? 0) === q.count(LOOT), `the host holds ${hp?.items[LOOT] ?? 0} heartroot for ${q.name}, as its pack shows (${q.count(LOOT)})`);
    ctx.check(xpOf(q) > xp.get(q)!, `${q.name} gained experience (level ${q.invc.stats.level}, ${q.invc.stats.xp} xp)`);
  }
  const sh = await ctx.shared();
  ctx.check(sh.summons.length === 0 && Object.keys(sh.owed).length === 0, `no summons and no shares left on the host (${sh.summons.length}, ${Object.keys(sh.owed).length})`);

  const end = await ctx.stats();
  for (const q of bots) ctx.check(q.counts.deaths === 0, `${q.name}: ${q.counts.deaths} deaths`);
  ctx.log(`host steps ${end.steps}, p99 ${end.p99.toFixed(2)} ms, max ${end.max.toFixed(2)} ms, refused ${JSON.stringify(end.refused)}`);
  ctx.check(end.refused.fire === 0, `no shot refused (${end.refused.fire})`);
}
