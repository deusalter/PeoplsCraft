// Scenario crew (stage 5, by hand before the scenarios of stage 5 lane D): three bots stand together, one lays the
// offering on Vanahar's altar, all three shoot it, it dies, and each ends with its own heartroot and its own experience.
// Then a second fight: the two others step out of its reach, the summoner's link goes silent, and the boss holds where
// it is until she is back inside the grace; then the fight goes on and ends the same way.
import { MOB_LIST } from '../../src/data/mobs';
import type { S2COf } from '../../src/net/protocol';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';

const OFFERING = 'verdant_idol', BOW = 'iron_bow', LOOT = 'heartroot';
/** Seconds between two shots of a bot: more than the cost of a shot of the iron bow, so the credit of 7.3 never runs dry. */
const SHOT_MS = 1250;
interface HostMob { id: number; key: string; x: number; y: number; z: number; hp: number; boss: boolean }

export default async function crew(ctx: Ctx): Promise<void> {
  const bots = ['Ada', 'Bram', 'Cyd'].map((n) => ctx.bot(new Bot(n)));
  const [a, b, c] = bots;
  await Promise.all(bots.map((q) => q.connect(ctx.url)));
  await Promise.all(bots.map((q) => q.loaded()));
  const hits = new Map<Bot, number>(bots.map((q) => [q, 0]));
  for (const q of bots) q.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 'h') hits.set(q, hits.get(q)! + 1); });
  const boss = async (): Promise<HostMob | null> => {
    const r = await fetch(`${ctx.direct}/mobs?dim=0`);
    return ((await r.json()) as HostMob[]).find((m) => m.boss) ?? null;
  };

  // a pad levelled where Ada stands, the altar at its north end, everyone on the south end together
  const px = Math.floor(a.body.x), pz = Math.floor(a.body.z), g = Math.round(a.body.y) - 1;
  for (const [y0, y1, key] of [[g - 2, g, 'stone'], [g + 1, g + 10, 'air']] as const) {
    ctx.check((await a.cmd(`fill ${px - 7} ${y0} ${pz - 26} ${px + 7} ${y1} ${pz + 4} ${key}`)) === 'filled', `the pad's ${key} is filled in`);
    await a.wait(300);
  }
  const ax = px, ay = g + 1, az = pz - 18;
  ctx.check((await a.cmd(`fill ${ax} ${ay} ${az} ${ax} ${ay} ${az} altar1`)) === 'filled', 'Vanahar\'s altar stands at the north end');
  await a.wait(300);
  for (const q of bots) {
    ctx.check((await q.cmd('caps 0 0')) === 'caps set', `${q.name}: no creatures`);
    await q.cmd('god on'); await q.cmd('time day'); await q.cmd('gear 2');
    await q.wait(250);
  }
  await a.cmd('clearmobs');
  await Promise.all(bots.map((q) => q.until(() => q.count(BOW) > 0 && q.count('arrow') > 0, 5000, 'the bow and arrows')));
  await Promise.all([a.goto(px + 0.5, pz + 0.5), b.goto(px - 1.5, pz + 0.5), c.goto(px + 2.5, pz + 0.5)]);
  ctx.check(bots.every((q) => Math.hypot(q.body.x - a.body.x, q.body.z - a.body.z) < 4), 'the three stand together');

  /** Each bot in `who` shoots at the boss from where it stands, one shot per SHOT_MS, while `on()` holds. */
  const shooting = (who: Bot[], on: () => boolean): (() => void) => {
    const t = setInterval(() => {
      if (!on()) return;
      for (const q of who) {
        const m = q.mobs.find((x) => x.boss);
        if (!q.ready || !m) continue;
        if (q.invc.inv.sel !== q.hotbar(BOW)) { q.invc.setSel(q.hotbar(BOW)); continue; }
        const h = MOB_LIST[m.def]?.h ?? 2, d = Math.hypot(m.x - q.body.x, m.z - q.body.z), lift = d * d / 900;
        const ex = q.body.x, ey = q.body.y + 1.62, ez = q.body.z;
        q.lookAt(m.x, m.y + h * 0.5 + lift, m.z);
        q.fire([m.x - ex, m.y + h * 0.5 + lift - ey, m.z - ez]);
      }
    }, SHOT_MS);
    return () => clearInterval(t);
  };
  const summon = async (q: Bot): Promise<HostMob> => {
    ctx.check((await q.cmd(`give ${OFFERING} 1`)).startsWith('gave'), `${q.name} is given the offering`);
    await q.until(() => q.count(OFFERING) > 0, 5000, 'the offering');
    // the kit of `gear` fills the hotbar, so the offering lands in the pack: onto the last hotbar slot with it
    if (q.hotbar(OFFERING) < 0) ctx.check(await q.op({ o: 'hotkey', v: [0, q.invc.inv.slots.findIndex((s) => s?.k === OFFERING)], i: 8, e: OFFERING }), `${q.name} puts the offering in the hotbar`);
    q.invc.setSel(q.hotbar(OFFERING));
    await q.settle();
    const back: [number, number] = [q.body.x, q.body.z];
    await q.goto(ax + 0.5, az + 2.5);
    await q.use(ax, ay, az);
    await q.until(() => q.mobs.some((m) => m.boss), 10000, 'the boss in a snapshot');
    await q.goto(back[0], back[1]);
    ctx.check(q.count(OFFERING) === 0, `${q.name} laid the offering on the altar`);
    const m = await boss();
    if (!m) throw new Error('no boss on the host');
    return m;
  };
  const xpOf = (q: Bot): number => q.invc.stats.level * 1e6 + q.invc.stats.xp;
  const fight = async (label: string, who: Bot[]): Promise<void> => {
    const loot = new Map(who.map((q) => [q, q.count(LOOT)])), xp = new Map(who.map((q) => [q, xpOf(q)]));
    const h0 = new Map(who.map((q) => [q, hits.get(q)!]));
    const stop = shooting(who, () => true);
    try {
      for (let i = 0; i < 240; i++) { if (!(await boss())) break; await a.wait(500); }
    } finally { stop(); }
    ctx.check(!(await boss()), `${label}: the boss is dead`);
    for (const q of who) ctx.check(hits.get(q)! > h0.get(q)!, `${label}: ${q.name} hit it ${hits.get(q)! - h0.get(q)!} times`);
    await Promise.all(who.map((q) => q.until(() => q.count(LOOT) > loot.get(q)!, 15000, 'the heartroot').catch(() => {})));
    for (const q of who) {
      ctx.check(q.count(LOOT) > loot.get(q)!, `${label}: ${q.name} picked up ${q.count(LOOT) - loot.get(q)!} heartroot of its own`);
      ctx.check(xpOf(q) > xp.get(q)!, `${label}: ${q.name} gained experience (level ${q.invc.stats.level}, ${q.invc.stats.xp} xp)`);
    }
  };

  // ---- the first fight: three near, boss 1 at 924 ----
  await summon(a);
  await a.until(() => { const m = a.mobs.find((x) => x.boss); return !!m && !!m.boss && m.boss.maxHp === 924; }, 5000, 'maxHp 924').catch(() => {});
  const mh = a.mobs.find((x) => x.boss)?.boss?.maxHp;
  ctx.check(mh === 924, `maxHp is ${mh} with three near`);
  await fight('first fight', bots);

  // ---- the second fight: the summoner's link goes silent with nobody else in reach, and she comes back ----
  await Promise.all(bots.map((q) => q.goto(q.body.x, pz + 0.5)));
  await summon(a);
  const stop = shooting(bots, () => true);
  await a.wait(4000);
  stop();
  for (const q of [b, c]) ctx.check((await q.cmd(`tp ${px + 100.5} ${g + 1.01} ${pz + 0.5}`)) === 'teleported', `${q.name} steps 100 blocks off, out of the boss's reach`);
  await Promise.all([b, c].map((q) => q.until(() => q.ready && Math.abs(q.body.x - (px + 100.5)) < 1, 5000, 'the step away')));
  const welcomes = a.counts.welcomes;
  a.silence(9000);
  ctx.log('Ada\'s link goes silent for 9 s');
  await a.wait(2500);
  const held = await boss();
  if (!held) throw new Error('the boss went when her link did');
  await a.wait(3500);
  const later = await boss();
  ctx.check(!!later && later.id === held.id, 'the boss is still there with its fighter away');
  ctx.check(!!later && Math.hypot(later.x - held.x, later.z - held.z) < 0.2 && later.hp === held.hp, `it holds where it is (moved ${later ? Math.hypot(later.x - held.x, later.z - held.z).toFixed(2) : '-'}, hp ${held.hp} then ${later?.hp})`);
  await a.until(() => a.counts.welcomes > welcomes, 20000, 'the reconnect');
  await a.loaded();
  ctx.check(a.counts.welcomes === welcomes + 1, 'Ada reconnected by herself');
  const st = await ctx.stats();
  ctx.check(st.simPlayers === 3, `the host holds ${st.simPlayers} players: Ada was resumed, not made again`);
  const back = await boss();
  ctx.check(!!back && back.id === held.id, 'the boss she left is the boss she finds');
  const h1 = hits.get(a)!, stop2 = shooting([a], () => true);
  await a.until(() => hits.get(a)! > h1 + 1, 15000, 'her hits').catch(() => {});
  stop2();
  const going = await boss();
  ctx.check(hits.get(a)! > h1 && !!going && going.hp < held.hp, `the fight goes on: ${hits.get(a)! - h1} more hits, hp ${held.hp} to ${going?.hp}`);
  for (const q of [b, c]) await q.cmd(`tp ${px + 0.5 + (q === b ? -2 : 2)} ${g + 1.01} ${pz + 0.5}`);
  await Promise.all([b, c].map((q) => q.until(() => q.ready && Math.abs(q.body.z - (pz + 0.5)) < 1 && Math.abs(q.body.x - px) < 4, 5000, 'the way back')));
  await fight('second fight', bots);

  const end = await ctx.stats();
  for (const q of bots) ctx.check(q.counts.deaths === 0, `${q.name}: ${q.counts.deaths} deaths`);
  ctx.log(`host steps ${end.steps}, p99 ${end.p99.toFixed(2)} ms, max ${end.max.toFixed(2)} ms, refused ${JSON.stringify(end.refused)}`);
  ctx.check(end.refused.fire === 0, `no shot refused (${end.refused.fire})`);
}
