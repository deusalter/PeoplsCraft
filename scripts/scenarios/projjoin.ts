// Scenario projjoin (11: a bot walks into a spiral from 120 blocks out and has every projectile that hits it). Ada
// fights Kankāl, whose middle phase throws spirals, and Bram walks in along a cleared corridor from 120 blocks east,
// beyond PROJ_R of anything it fires. Every projectile that hurts him must be one the host told him of (`ps`) and then
// ended on him (`pe`, how 2): a player walking into a fight has every projectile that can hit them (4.6, 6.4).
import { BOSSES, PROJECTILES } from '../../src/data/mobs';
import { BOSS_KINDS, PROJ_R, type S2COf } from '../../src/net/protocol';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { type Arena, arena, fills, flatDist, held, hostBoss, quiet, seenBoss, shooting, sleep } from './arena';

const BOW = 'eclipse_bow', TIER = 9, START = 120;
const KANKAL = BOSSES[2], SPIRAL = BOSS_KINDS.indexOf('spiral');
/** Hits wanted before the walk is called done; and the longest it may take once in the arena. */
const HITS = 5, STAY_MS = 90000;

interface Known { at: number; life: number; kind: number; d: number }
interface End { id: number; at: number; x: number; y: number; z: number; known: boolean }

/** Along the corridor in legs of 12 blocks, each begun only once the bot holds every chunk round it: a body that walks
 *  into a chunk it has not generated yet falls through it. */
async function walk(q: Bot, x: number, z: number): Promise<void> {
  while (Math.abs(q.body.x - x) > 12) {
    await q.loaded(20000);
    await q.goto(q.body.x + Math.sign(x - q.body.x) * 12, z, 15000);
  }
  await q.loaded(20000);
  await q.goto(x, z, 15000);
}

export default async function projjoin(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a, b].map((q) => q.connect(ctx.url)));
  await Promise.all([a, b].map((q) => q.loaded()));
  await quiet(ctx, [a, b], TIER);
  await a.until(() => a.count(BOW) > 0 && a.count('arrow') > 0, 5000, 'the bow and arrows');
  await a.goto(a.body.x, a.body.z);
  const px = Math.floor(a.body.x), pz = Math.floor(a.body.z), g = Math.round(a.body.y) - 1;
  const ar: Arena = await arena(ctx, a);
  // Bram goes out first, so that the host holds the far end of the corridor
  ctx.check((await b.cmd(`tp ${px + START + 0.5} ${g + 40} ${pz + 0.5}`)) === 'teleported', `Bram goes ${START} blocks east`);
  await b.until(() => b.ready && b.body.onGround, 20000, 'the landing');
  await held(ctx, px - 12, pz - 4, px + START + 6, pz + 4);
  await fills(ctx, a, [[px + 12, g - 2, pz - 3, px + START + 6, g, pz + 3, 'stone'], [px + 12, g + 1, pz - 3, px + START + 6, g + 12, pz + 3, 'air']]);
  ctx.check((await b.cmd(`tp ${px + START + 0.5} ${g + 1.01} ${pz + 0.5}`)) === 'teleported', 'Bram stands at the corridor\'s far end');
  await b.until(() => b.ready && b.body.onGround && Math.abs(b.body.y - (g + 1)) < 0.05, 8000, 'the corridor floor');
  // Bram is not protected: a hit must be a hit. Level 40 has 256 health, and he is healed when low.
  ctx.check((await b.cmd('god off')) === 'god false' && (await b.cmd('level 40')) === 'level set' && (await b.cmd('heal')) === 'healed', 'Bram is unprotected, at level 40 and full health');

  // what Bram is told of projectiles, and what hurts him
  const known = new Map<number, Known>(), ends: End[] = [], hurts: { at: number; x: number; y: number; z: number }[] = [];
  const kinds = Object.keys(PROJECTILES);
  b.on('fx', (m: S2COf<'fx'>) => {
    for (const e of m.l) {
      if (e[0] === 'ps') known.set(e[1], { at: performance.now(), life: e[9], kind: e[2], d: flatDist(e[3], e[5], b.body.x, b.body.z) });
      else if (e[0] === 'pe' && e[5] === 2) ends.push({ id: e[1], at: performance.now(), x: e[2], y: e[3], z: e[4], known: known.has(e[1]) });
    }
  });
  let healing = false;
  b.on('hurt', (m: S2COf<'hurt'>) => {
    if (m.cause === 'a projectile') hurts.push({ at: performance.now(), x: b.body.x, y: b.body.y, z: b.body.z });
    const hp = b.snap?.hp ?? b.invc.stats.hp;
    if (!healing && hp < b.invc.stats.maxHp * 0.5) { healing = true; void b.cmd('heal').finally(() => { healing = false; }); }
  });

  // ---- Ada brings Kankāl into the phase that throws spirals ----
  ctx.check((await a.cmd('boss 3')) === KANKAL.name, `${KANKAL.name} is called up beside Ada`);
  await a.until(() => !!seenBoss(a), 10000, 'the boss in a snapshot');
  const spiralPhase = KANKAL.boss!.phases.findIndex((p) => p.attacks.some((x) => x.t === 'spiral'));
  const stop = shooting([a], BOW, () => true, 700);
  try { await a.until(() => (seenBoss(a)?.boss?.phase ?? 0) >= spiralPhase, 90000, 'the spiral phase'); } finally { stop(); }
  const bs = seenBoss(a)!;
  ctx.check(bs.boss!.phase >= spiralPhase, `it is in its phase ${bs.boss!.phase + 1} (${Math.round((bs.boss!.hp / bs.boss!.maxHp) * 100)} % health), which throws spirals`);
  const m0 = await hostBoss(ctx);
  if (!m0) throw new Error('no boss on the host');
  const d0 = flatDist(b.body.x, b.body.z, m0.x, m0.z);
  ctx.check(d0 > PROJ_R + 10, `Bram starts ${d0.toFixed(0)} blocks from it, beyond PROJ_R (${PROJ_R})`);

  // ---- the walk in: from just outside PROJ_R, as a spiral starts ----
  const edge = PROJ_R + 6;
  if (b.body.x > m0.x + edge + 1) await walk(b, m0.x + edge, pz + 0.5);
  // a spiral that starts while every shot of it is fired beyond PROJ_R of him: the first he hears of them is the sweep's
  const spiralAt = performance.now();
  let was = true, startD = 0;
  await b.until(() => {
    const m = seenBoss(b), s = m?.boss;
    if (!m || !s) return false;
    const on = s.kind === SPIRAL && s.running, d = flatDist(b.body.x, b.body.z, m.x, m.z), start = on && !was;
    was = on;
    if (start) startD = d;
    return start && d > PROJ_R + 1;
  }, 90000, 'a spiral').catch(() => {});
  ctx.check(startD > PROJ_R + 1, `Bram waits out there until a spiral starts ${startD.toFixed(0)} blocks from him (${((performance.now() - spiralAt) / 1000).toFixed(1)} s)`);
  const k0 = known.size;
  // beside Ada: a spiral is thrown flat at the height of the one it is aimed at, and comes down to them at their distance
  await walk(b, a.body.x + 1.5, a.body.z);
  ctx.log(`Bram is beside Ada after the walk: ${hurts.length} projectile hits on the way, ${known.size - k0} projectiles told`);
  const t1 = performance.now();
  while (hurts.length < HITS && performance.now() - t1 < STAY_MS && (await hostBoss(ctx))) {
    if (flatDist(a.body.x, a.body.z, b.body.x, b.body.z) > 3) await b.goto(a.body.x + 1.5, a.body.z, 8000).catch(() => {});
    await sleep(500);
  }
  await sleep(500);

  // ---- every hit was a projectile he had ----
  ctx.check(hurts.length >= HITS, `Bram was hit by ${hurts.length} projectiles (${HITS} wanted)`);
  const used = new Set<End>();
  let matched = 0;
  for (const h of hurts) {
    const e = ends.find((x) => !used.has(x) && Math.abs(x.at - h.at) < 500 && Math.hypot(x.x - h.x, x.y - (h.y + 0.9), x.z - h.z) < 3);
    if (e) { used.add(e); if (e.known) matched++; }
  }
  ctx.check(matched === hurts.length, `each of them was told to him before it hit (${matched} of ${hurts.length} with a ps, then a pe on him)`);
  const late = [...known.values()].filter((k) => kinds[k.kind] !== 'arrow' && k.life < PROJECTILES[kinds[k.kind]].life - 0.3).length;
  ctx.log(`${known.size} projectiles told to Bram in all, ${late} of them by the sweep after they were fired`);
  const far = Math.max(...[...known.values()].map((k) => k.d));
  // the sweep runs 10 times a second, and the fastest of Kankal's shots flies 1.1 blocks in a tenth
  ctx.check(far <= PROJ_R + 2, `none was told to him from beyond PROJ_R (farthest ${far.toFixed(1)} blocks)`);
  ctx.check(late > 0, `the sweep told him of projectiles already in flight as he came in (${late})`);
  ctx.check(b.counts.deaths === 0, `Bram: ${b.counts.deaths} deaths`);
  ctx.check(!!(await hostBoss(ctx)), 'the fight is still on');
}
