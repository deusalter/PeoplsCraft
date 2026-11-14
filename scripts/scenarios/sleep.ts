// Scenario sleep (7.10, sleep and the night skip; 11). Ada, Bram and Cyd have a bedroll each on a pad at the world spawn;
// Dov is in the Hollows. By day a bed only sets the spawn point; at night it is refused with a hostile within 14 blocks
// or an event running. The night passes only when every active, living player of the Overworld sleeps: while some do,
// the Overworld is told who rests and the count; a sleeper who moves 0.3 blocks wakes; a stalled player (Cyd's link
// silent) and a lingering one (Cyd's socket closed) neither hold the night up nor are needed, and Dov in another realm
// is never counted. Each morning: the clock goes to floor(clock) + 1.02, every sleeper gets `dawn` for 180 s, and the
// Overworld sees the banner "Morning".
import type { S2COf } from '../../src/net/protocol';
import { isNight } from '../../src/sim/clock';
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { sleep } from './arena';
import { calm, pad } from './site';

const SET = 'Spawn point set.', ENEMIES = 'You cannot rest with enemies near.';
const DAWN_S = 180;

interface Heard { toasts: string[]; banners: string[]; clock: number }
function hear(q: Bot): Heard {
  const h: Heard = { toasts: [], banners: [], clock: NaN };
  q.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) { if (e[0] === 't') h.toasts.push(String(e[1])); if (e[0] === 'n') h.banners.push(String(e[1])); } });
  q.on('time', (m: S2COf<'time'>) => { h.clock = m.clock; });
  q.on('welcome', (m: S2COf<'welcome'>) => { h.clock = m.clock; });
  return h;
}

export default async function sleepScenario(ctx: Ctx): Promise<void> {
  const names = ['Ada', 'Bram', 'Cyd', 'Dov'], bots = names.map((n) => ctx.bot(new Bot(n)));
  const [a, b, c, d] = bots;
  const joining = bots.map((q) => q.connect(ctx.url)), heard = bots.map(hear);
  await Promise.all(joining);
  await Promise.all(bots.map((q) => q.loaded()));
  const [ha, hb, hc, hd] = heard;
  const ids = bots.map((q) => playerIdOf(q.token)!);
  const host = async (q: Bot): Promise<HostPlayer> => {
    const p = (await ctx.players()).find((x) => x.id === ids[bots.indexOf(q)]);
    if (!p) throw new Error(`${q.name} is not on the host`);
    return p;
  };
  await calm(ctx, bots);

  // Dov goes to the Hollows and stays there
  ctx.check((await d.cmd('dim 1')) === 'travelling', 'Dov crosses to the Hollows');
  await d.until(() => d.dim === 1 && d.ready, 60000, 'Dov in the Hollows');
  await d.loaded();
  ctx.check((await host(d)).dim === 1, 'the host has Dov in the Hollows');

  // three bedrolls in a row on a pad at the spawn, each bot standing two blocks south of its own
  const { px, pz, g } = await pad(ctx, a, 6, 8);
  const beds: [number, number, number][] = [[px - 3, g + 1, pz - 2], [px, g + 1, pz - 2], [px + 3, g + 1, pz - 2]];
  const sleepers = [a, b, c];
  for (let i = 0; i < 3; i++) {
    const q = sleepers[i];
    ctx.check((await q.cmd('give bedroll 1')).startsWith('gave'), `${q.name} is given a bedroll`);
    await q.until(() => q.count('bedroll') > 0, 5000, 'the bedroll');
    await q.goto(beds[i][0] + 0.5, pz + 0.5);
    await q.place(...beds[i], 'bedroll');
  }
  await Promise.all(sleepers.map((q) => q.settle()));
  const clock = async (): Promise<number> => (await ctx.shared()).clock;
  /** `q` uses its bed and waits for the host to answer. */
  const lie = async (q: Bot): Promise<void> => { await q.use(...beds[sleepers.indexOf(q)]); await sleep(150); };
  const asleep = async (): Promise<string> => (await ctx.players()).filter((p) => p.sleeping).map((p) => p.name).sort().join(',');

  // ---- by day a bed is a spawn point, not a sleep ----
  ctx.check(!isNight(await clock()), `it is day (${(await clock()).toFixed(3)})`);
  let n0 = ha.toasts.length;
  await lie(a);
  ctx.check(ha.toasts.slice(n0).includes(SET) && !(await host(a)).sleeping && (await host(a)).bed?.join() === beds[0].join(), `by day Ada is told "${SET}" and does not sleep`);

  // ---- at night, refused with a hostile within 14 blocks ----
  ctx.check((await a.cmd('time night')) === 'time set', 'night falls');
  await a.wait(300);
  ctx.check((await a.cmd('freeze on')) === 'freeze true' && (await a.cmd('spawn thornling')) === 'spawned', 'a frozen Kantak stands 3 blocks from Ada');
  await a.wait(300);
  n0 = ha.toasts.length;
  await lie(a);
  ctx.check(ha.toasts.slice(n0).includes(ENEMIES) && !(await host(a)).sleeping && !a.invc.sleeping, `Ada is told "${ENEMIES}" and stays awake`);
  await a.cmd('clearmobs'); await a.cmd('freeze off');
  await a.wait(300);

  /** Waits for the Morning banner on `who` after their counts in `from`; true when it came. */
  const morning = async (who: Bot[], from: number[], ms: number): Promise<boolean> => {
    const ok = (): boolean => who.every((q, i) => heard[bots.indexOf(q)].banners.slice(from[i]).includes('Morning'));
    const end = performance.now() + ms;
    while (!ok() && performance.now() < end) await sleep(100);
    return ok();
  };
  const bannerCounts = (): number[] => heard.map((h) => h.banners.length);
  /** The morning as the host and the bots have it: clock, dawn on the sleepers, nobody asleep. */
  const checkMorning = async (c0: number, got: Bot[], not: Bot[], what: string): Promise<void> => {
    const c1 = await clock();
    ctx.check(Math.abs(c1 - (Math.floor(c0) + 1.02)) < 0.002 && !isNight(c1), `${what}: the clock went from ${c0.toFixed(3)} to ${c1.toFixed(3)} (floor + 1.02 is ${(Math.floor(c0) + 1.02).toFixed(3)})`);
    await sleep(300);
    for (const q of got) ctx.check(Math.abs(heard[bots.indexOf(q)].clock - c1) < 0.002, `${what}: ${q.name}'s clock says ${heard[bots.indexOf(q)].clock.toFixed(3)}`);
    const ps = await ctx.players();
    for (const q of got) {
      const p = ps.find((x) => x.id === ids[bots.indexOf(q)])!, dawn = p.buffs.dawn ?? 0;
      ctx.check(dawn > DAWN_S - 5 && dawn <= DAWN_S, `${what}: ${q.name} woke rested (dawn ${dawn.toFixed(1)} s)`);
    }
    for (const q of not) {
      const p = ps.find((x) => x.id === ids[bots.indexOf(q)]);
      ctx.check(!p || (p.buffs.dawn ?? 0) < DAWN_S - 5, `${what}: ${q.name} did not (dawn ${(p?.buffs.dawn ?? 0).toFixed(1)})`);
    }
    ctx.check((await asleep()) === '', `${what}: nobody sleeps on (${await asleep() || 'none'})`);
  };

  // ---- night 1: Cyd's link goes silent; Ada and Bram need not wait for him ----
  let c0 = await clock();
  ctx.check(isNight(c0), `it is night (${c0.toFixed(3)})`);
  await lie(a);
  await Promise.all([b, c, a].map((q) => q.until(() => heard[bots.indexOf(q)].toasts.includes('Ada is resting (1/3)'), 3000, 'the count').catch(() => {})));
  ctx.check([a, b, c].every((q) => heard[bots.indexOf(q)].toasts.includes('Ada is resting (1/3)')), 'the Overworld is told "Ada is resting (1/3)"');
  ctx.check((await host(a)).sleeping && a.invc.sleeping, 'Ada sleeps, on the host and in her own view');
  await lie(b);
  await a.until(() => ha.toasts.includes('Ada and Bram are resting (2/3)'), 3000, 'the count').catch(() => {});
  ctx.check(ha.toasts.includes('Ada and Bram are resting (2/3)'), 'then "Ada and Bram are resting (2/3)"');
  await sleep(2500);
  ctx.check(isNight(await clock()) && (await clock()) - c0 < 0.01, `with Cyd awake the night goes on (${(await clock()).toFixed(3)})`);
  let bn = bannerCounts();
  c.silence(4500);
  const silent = performance.now();
  const came = await morning([a, b], bn, 6000);
  const after = (performance.now() - silent) / 1000;
  ctx.check(came, `Cyd's link went silent: Morning came for Ada and Bram ${after.toFixed(1)} s later`);
  ctx.check(after >= 1.4 && after <= 3.5, `that is once he was stalled (1.5 s) and the next check ran (${after.toFixed(1)} s)`);
  ctx.check(!hd.banners.slice(bn[3]).includes('Morning'), 'Dov in the Hollows is not shown the banner');
  await checkMorning(c0, [a, b], [c, d], 'night 1');
  await c.until(() => c.ready && hc.banners.slice(bn[2]).includes('Morning'), 8000, 'Cyd back').catch(() => {});
  for (let i = 0; i < 20 && (await host(c)).state !== 'active'; i++) await sleep(150);
  ctx.check(hc.banners.slice(bn[2]).includes('Morning') && (await host(c)).state === 'active', `Cyd's link comes back: he is in play, and sees the Morning that came while he was away (${(await host(c)).state})`);

  // ---- night 2: all three, Dov in another realm not counted; a sleeper who moves wakes ----
  ctx.check((await a.cmd('time night')) === 'time set', 'night falls again');
  await sleep(1200);
  c0 = await clock();
  n0 = ha.toasts.length;
  await lie(a); await lie(b);
  await a.until(() => ha.toasts.slice(n0).includes('Ada and Bram are resting (2/3)'), 3000, 'the count').catch(() => {});
  ctx.check(ha.toasts.slice(n0).includes('Ada and Bram are resting (2/3)'), 'Ada and Bram lie down: "Ada and Bram are resting (2/3)"');
  n0 = ha.toasts.length;
  // Bram steps half a block off
  await b.goto(b.body.x + 0.5, b.body.z);
  await sleep(1300);
  ctx.check(!(await host(b)).sleeping && !b.invc.sleeping, `Bram stepped half a block off and woke (asleep: ${await asleep()})`);
  ctx.check(ha.toasts.slice(n0).includes('Ada is resting (1/3)'), 'the Overworld is told "Ada is resting (1/3)" again');
  ctx.check(isNight(await clock()), 'the night goes on');
  await b.goto(beds[1][0] + 0.5, pz + 0.5);
  await lie(b);
  await sleep(1300);
  ctx.check(isNight(await clock()) && (await asleep()) === 'Ada,Bram', `Ada and Bram sleep again; the night waits for Cyd (${await asleep()})`);
  bn = bannerCounts();
  await lie(c);
  ctx.check(await morning([a, b, c], bn, 3000), 'Cyd lies down last: Morning, for all three at once');
  ctx.check(!hd.banners.slice(bn[3]).includes('Morning') && !hd.toasts.some((t) => t.includes('resting')), 'Dov, in the Hollows, neither held the night up nor was told of it');
  await checkMorning(c0, [a, b, c], [d], 'night 2');

  // ---- night 3: Cyd's socket closes for good; a lingering player is not waited for ----
  ctx.check((await a.cmd('time night')) === 'time set', 'a third night');
  await sleep(1200);
  c0 = await clock();
  c.close();
  await sleep(800);
  ctx.check((await host(c)).state === 'lingering', `Cyd's socket closed: the host holds him lingering (${(await host(c)).state})`);
  bn = bannerCounts();
  n0 = ha.toasts.length;
  await lie(a);
  await a.until(() => ha.toasts.slice(n0).includes('Ada is resting (1/2)'), 3000, 'the count').catch(() => {});
  ctx.check(ha.toasts.slice(n0).includes('Ada is resting (1/2)'), 'the count leaves Cyd out: "Ada is resting (1/2)"');
  await lie(b);
  ctx.check(await morning([a, b], bn, 3000), 'Bram lies down: Morning');
  await checkMorning(c0, [a, b], [d], 'night 3');

  // ---- an event keeps everyone up ----
  ctx.check((await a.cmd('time night')) === 'time set', 'a fourth night');
  await sleep(600);
  ctx.check((await a.cmd('event raid')) === 'event started' && (await ctx.shared()).event.a === 'raid', 'a raid gathers');
  await sleep(300);
  n0 = ha.toasts.length;
  await lie(a);
  ctx.check(ha.toasts.slice(n0).includes(ENEMIES) && !(await host(a)).sleeping, `with the raid on Ada is told "${ENEMIES}"`);
  await a.cmd('time day');
  await a.wait(1200);
  ctx.check((await ctx.shared()).event.a === null, 'dawn ends the raid');
  for (const q of bots) ctx.check(q.counts.rej === 0 && q.counts.deaths === 0, `${q.name}: ${q.counts.rej} rej, ${q.counts.deaths} deaths`);
}
