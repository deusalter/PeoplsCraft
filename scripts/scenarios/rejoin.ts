// Scenario rejoin (9, "Dropping and rejoining mid boss fight"). Three bots summon Vanahar together; Bram, who never
// hits it, has his socket cut and stays away 18 s. At once he is out of the fight, untargetable and unhurt; after 10 s
// the boss rescales to the two left and fights on. Back inside the 30 s grace he is the same player in the same slot at
// the same place, still a participant: he goes 76 blocks off, out of every distance rule, and still gets his heartroot.
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { LOOT, bossGone, flatDist, hitLog, hostBoss, maxHpFor, quiet, seenBoss, shooting, sleep, summon, toFar, walledWithCorridor, xpOf } from './arena';

const BOW = 'umbrite_bow', TIER = 5;
const AWAY_MS = 18000;
/** 7.9: the rescale waits 10 s after the count falls. */
const FALL_S = 10;

export default async function rejoin(ctx: Ctx): Promise<void> {
  const bots = ['Ada', 'Bram', 'Cyd'].map((n) => ctx.bot(new Bot(n)));
  const [a, b, c] = bots;
  const bramId = playerIdOf(b.token)!;
  await Promise.all(bots.map((q) => q.connect(ctx.url)));
  await Promise.all(bots.map((q) => q.loaded()));
  const hits = hitLog(bots);
  await quiet(ctx, [a, c], TIER);
  // Bram is not protected, so that "unhurt" means something: level 40 has 256 health
  await quiet(ctx, [b], TIER, false);
  ctx.check((await b.cmd('level 40')) === 'level set' && (await b.cmd('heal')) === 'healed', 'Bram is at level 40 and full health');
  await Promise.all(bots.map((q) => q.until(() => q.count(BOW) > 0 && q.count('arrow') > 0, 5000, 'the bow and arrows')));
  await a.goto(a.body.x, a.body.z);
  const px = Math.floor(a.body.x), pz = Math.floor(a.body.z);
  const ar = await walledWithCorridor(ctx, a);
  await Promise.all([a.goto(px + 0.5, pz + 0.5), b.goto(px - 1.5, pz + 0.5), c.goto(px + 2.5, pz + 0.5)]);
  ctx.check(bots.every((q) => flatDist(q.body.x, q.body.z, a.body.x, a.body.z) < 4), 'the three stand together by the altar');
  const host = async (): Promise<HostPlayer> => { const p = (await ctx.players()).find((q) => q.id === bramId); if (!p) throw new Error('Bram is not on the host'); return p; };

  await summon(ctx, a, ar);
  await a.until(() => seenBoss(a)?.boss?.maxHp === maxHpFor(3), 5000, 'maxHp 924').catch(() => {});
  ctx.check(seenBoss(a)?.boss?.maxHp === maxHpFor(3), `maxHp ${seenBoss(a)?.boss?.maxHp} with three near`);
  const stop = shooting([a, c], BOW, () => true, 1250);
  try {
    await a.wait(4000);
    ctx.check(hits.get(b)!.length === 0, 'Bram has not hit it: he is in the fight only as a participant');

    // ---- the drop ----
    const before = await host(), welcomes = b.counts.welcomes;
    b.silence(AWAY_MS); b.drop();
    const t0 = performance.now(), at = (): number => (performance.now() - t0) / 1000;
    ctx.log(`Bram's socket is cut; he stays away ${AWAY_MS / 1000} s`);
    await sleep(1500);
    const p1 = await host();
    ctx.check(p1.state === 'lingering' || p1.state === 'stalled', `${at().toFixed(1)} s in he is out of play on the host (${p1.state})`);
    let hpMin = p1.hp, fellAt = -1, early = false;
    const boss0 = await hostBoss(ctx);
    let moved = 0, hpBoss = boss0?.hp ?? 0;
    while (at() < AWAY_MS / 1000 - 1.5) {
      const p = await host(), m = await hostBoss(ctx), mh = seenBoss(a)?.boss?.maxHp;
      hpMin = Math.min(hpMin, p.hp);
      if (m && boss0) { moved = Math.max(moved, flatDist(m.x, m.z, boss0.x, boss0.z)); hpBoss = m.hp; }
      if (mh === maxHpFor(2) && fellAt < 0) fellAt = at();
      if (mh !== maxHpFor(3) && at() < FALL_S - 0.5) early = true;
      await sleep(250);
    }
    ctx.check(hpMin === p1.hp, `he took no damage while away (health ${p1.hp}, lowest ${hpMin})`);
    ctx.check(!early && fellAt >= FALL_S - 0.5 && fellAt <= FALL_S + 3, `the boss rescaled to two after ${fellAt.toFixed(1)} s (maxHp ${maxHpFor(2)})`);
    ctx.check(!!boss0 && moved > 1 && hpBoss < boss0.hp, `and fought on against the others (moved ${moved.toFixed(1)}, health ${boss0?.hp} to ${hpBoss})`);

    // ---- back inside the grace ----
    await b.until(() => b.counts.welcomes > welcomes, 15000, 'the reconnect');
    await b.loaded();
    ctx.check(at() < 30, `Bram is back ${at().toFixed(1)} s after the drop, inside the grace`);
    ctx.check(b.counts.welcomes === welcomes + 1, 'he reconnected by himself');
    const after = await host(), st = await ctx.stats();
    ctx.check(st.simPlayers === 3, `the host holds ${st.simPlayers} players: he was resumed, not made again`);
    ctx.check(after.slot === before.slot && b.slot === before.slot, `in the same slot (${before.slot}, now ${after.slot})`);
    ctx.check(flatDist(b.body.x, b.body.z, before.x, before.z) < 0.1 && Math.abs(b.body.y - before.y) < 0.1, `at the same place (${b.body.x.toFixed(2)} ${b.body.y.toFixed(2)} ${b.body.z.toFixed(2)})`);
    await a.until(() => seenBoss(a)?.boss?.maxHp === maxHpFor(3), 3000, 'the rise').catch(() => {});
    ctx.check(seenBoss(a)?.boss?.maxHp === maxHpFor(3), `the boss counts him again at once (maxHp ${seenBoss(a)?.boss?.maxHp})`);
    ctx.check((await b.cmd('god on')) === 'god true', 'Bram is protected for the rest of the fight');
  } finally { stop(); }

  // ---- far off, he is in the loot only as a participant ----
  await toFar(ctx, b, ar, 0);
  const loot = new Map(bots.map((q) => [q, q.count(LOOT)])), xp = new Map(bots.map((q) => [q, xpOf(q)]));
  const stopAll = shooting([a, c], BOW, () => true, 1250);
  let dead: boolean;
  try { dead = await bossGone(ctx, 150000); } finally { stopAll(); }
  ctx.check(dead, 'the boss is dead');
  const m = seenBoss(b);
  ctx.check(hits.get(b)!.length === 0, 'Bram never hit it');
  await Promise.all(bots.map((q) => q.until(() => q.count(LOOT) > loot.get(q)!, 15000, 'the heartroot').catch(() => {})));
  const hp = await ctx.players();
  for (const q of bots) {
    const got = q.count(LOOT) - loot.get(q)!, h = hp.find((p) => p.name === q.name);
    ctx.check(got > 0 && xpOf(q) > xp.get(q)!, `${q.name} picked up ${got} heartroot of its own and gained experience`);
    ctx.check(!!h && (h.items[LOOT] ?? 0) === q.count(LOOT), `the host holds ${h?.items[LOOT] ?? 0} heartroot for ${q.name} (pack ${q.count(LOOT)})`);
  }
  ctx.check(!m, 'and no boss is left in his view');
  const end = await ctx.stats();
  for (const q of bots) ctx.check(q.counts.deaths === 0, `${q.name}: ${q.counts.deaths} deaths`);
  ctx.check(end.refused.fire === 0, `no shot refused (${end.refused.fire})`);
}
