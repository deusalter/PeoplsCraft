// Scenario stall (9, "A link that goes silent without closing"; 11: a bot's link goes silent mid-fight: it takes no
// damage, the boss waits, and the offering comes back when the grace ends). Ada fights Vanahar alone, unprotected, and
// her link goes dead for 40 s without closing. Within 1.5 s she is `away`; the boss holds where it stands and waits for
// her through the 30 s grace, then goes, and the offering is hers again when she is back.
import type { S2COf } from '../../src/net/protocol';
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { OFFERING, arena, hitLog, hostBoss, quiet, seenBoss, shooting, sleep, summon } from './arena';

const BOW = 'umbrite_bow', TIER = 5;
const SILENT_MS = 40000;
/** 7.9: STALL_AFTER and LINGER. */
const STALL_S = 1.5, GRACE_S = 30;

export default async function stall(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada'));
  const id = playerIdOf(a.token)!;
  await a.connect(ctx.url);
  await a.loaded();
  const hits = hitLog([a]);
  const pickups: string[] = [];
  a.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 'u') pickups.push(String(e[1])); });
  await quiet(ctx, [a], TIER, false);
  await a.until(() => a.count(BOW) > 0 && a.count('arrow') > 0, 5000, 'the bow and arrows');
  await a.goto(a.body.x, a.body.z);
  const ar = await arena(ctx, a);
  const me = async (): Promise<HostPlayer | undefined> => (await ctx.players()).find((p) => p.id === id);

  await summon(ctx, a, ar);
  // level 40 has 256 health: enough to stand a few of Vanahar's blows without armour
  ctx.check((await a.cmd('level 40')) === 'level set' && (await a.cmd('heal')) === 'healed', 'Ada is at level 40 and full health for the fight');
  const h0 = hits.get(a)!.length, hurt0 = a.counts.hurt;
  const stop = shooting([a], BOW, () => true, 1250);
  await a.until(() => hits.get(a)!.length >= h0 + 3 && (!!seenBoss(a) && Math.hypot(seenBoss(a)!.x - a.body.x, seenBoss(a)!.z - a.body.z) < 8), 30000, 'the fight at close quarters').catch(() => {});
  stop();
  const close = seenBoss(a);
  ctx.check(hits.get(a)!.length >= h0 + 3, `Ada hit it ${hits.get(a)!.length - h0} times`);
  ctx.check(!!close && Math.hypot(close.x - a.body.x, close.z - a.body.z) < 8, `the boss is upon her (${close ? Math.hypot(close.x - a.body.x, close.z - a.body.z).toFixed(1) : '-'} blocks)`);
  ctx.log(`Ada was hurt ${a.counts.hurt - hurt0} times before her link went`);

  // ---- the link goes silent ----
  const welcomes = a.counts.welcomes;
  a.silence(SILENT_MS);
  const t0 = performance.now(), at = (): number => (performance.now() - t0) / 1000;
  ctx.log(`Ada's link goes silent for ${SILENT_MS / 1000} s`);
  await sleep(STALL_S * 1000 + 400);
  const p1 = await me(), b1 = await hostBoss(ctx);
  ctx.check(p1?.state === 'stalled', `${at().toFixed(1)} s in, the host has her stalled (${p1?.state})`);
  if (!p1 || !b1) throw new Error('no player or no boss on the host');
  const states = new Set<string>();
  let hpMin = p1.hp, moved = 0, hpBoss = b1.hp, lastSeen = 0, goneAt = -1, lingerAt = -1;
  while (at() < SILENT_MS / 1000 - 2) {
    const p = await me(), m = await hostBoss(ctx);
    states.add(p ? p.state : 'absent');
    if (p?.state === 'lingering' && lingerAt < 0) lingerAt = at();
    if (p && p.state !== 'parked') hpMin = Math.min(hpMin, p.hp);
    if (m) { moved = Math.max(moved, Math.hypot(m.x - b1.x, m.z - b1.z)); hpBoss = m.hp; lastSeen = at(); }
    else if (goneAt < 0) goneAt = at();
    await sleep(400);
  }
  ctx.check(hpMin === p1.hp, `she took no damage while away (health ${p1.hp}, lowest ${hpMin})`);
  ctx.check(moved < 0.25 && hpBoss === b1.hp, `the boss held where it stood (moved ${moved.toFixed(2)}, health ${b1.hp} then ${hpBoss})`);
  ctx.check(lastSeen >= GRACE_S - 3, `the boss waited for her: still there ${lastSeen.toFixed(1)} s in`);
  ctx.check(goneAt > 0 && goneAt <= GRACE_S + 3, `it went when the grace ended (${goneAt.toFixed(1)} s in)`);
  // 9: the client gives up on a silent socket after 6 s, the server's keepalive after 10 s; either closes it
  ctx.check(lingerAt >= 5.5 && lingerAt <= 11.5, `her socket was closed ${lingerAt.toFixed(1)} s in, and she lingered`);
  ctx.check(states.has('parked') || states.has('absent'), `the host let her go after the grace (states seen: ${[...states].join(', ')})`);
  const sh = await ctx.shared(), held = await me();
  const inMail = held ? held.mail.filter((s) => s.k === OFFERING).reduce((n, s) => n + s.n, 0) : 0;
  const owed = (sh.owed[id]?.items ?? []).filter((s) => s.k === OFFERING).reduce((n, s) => n + s.n, 0);
  ctx.check(sh.summons.length === 0, `the summons entry is gone (${sh.summons.length})`);
  // she was in memory when the boss went, so it went to her mail (7.9); once her record is durable she may be evicted,
  // and then her mail is in that record, not on the host
  ctx.check(owed === 0 && (held ? inMail === 1 : true), `the offering went to her mail: ${held ? `${inMail} there` : 'evicted, so in her saved record'}, ${owed} in shared.owed`);

  // ---- she is back ----
  await a.until(() => a.counts.welcomes > welcomes, 30000, 'the reconnect');
  await a.loaded();
  ctx.check(a.counts.welcomes === welcomes + 1, 'Ada reconnected by herself');
  await a.until(() => a.count(OFFERING) === 1, 10000, 'the offering back').catch(() => {});
  ctx.check(a.count(OFFERING) === 1, `the offering is back in her pack (${a.count(OFFERING)})`);
  ctx.check(pickups.includes(OFFERING), 'she is told it came back (the pickup line)');
  await a.settle().catch(() => {});
  const back = await me(), sh2 = await ctx.shared();
  ctx.check(!!back && back.state === 'active' && (back.items[OFFERING] ?? 0) === 1 && back.mail.length === 0, `the host holds it in her pack, with nothing left in her mail (${back?.items[OFFERING] ?? 0}, mail ${back?.mail.length})`);
  ctx.check(!sh2.owed[id], 'and nothing owed to her');
  ctx.check(!(await hostBoss(ctx)), 'no boss is left');
  ctx.check(a.counts.deaths === 0, `Ada: ${a.counts.deaths} deaths`);
}
