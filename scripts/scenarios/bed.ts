// Scenario bed (9, "A player whose bed was destroyed by someone else"; 7.10). Ada and Bram lie on one bedroll 40 blocks
// east of the world spawn. Ada falls to her death and wakes beside it. Bram breaks it while both are online: each is told
// and loses it, and Ada's next death takes her to the world spawn. Then Ada sets a new one, goes 240 blocks off and
// says goodbye; Bram breaks the bed while her record is on disk only, and leaves too. Ada comes back with the bed still in
// her record, as a hint; when she dies, goHome loads the place, finds no bed, and sends her to the world spawn with the
// message used today.
import { BLOCKS } from '../../src/data/blocks';
import type { S2COf } from '../../src/net/protocol';
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { fills, held, sleep } from './arena';
import { blockId } from './site';

const GONE = 'Your bedroll is gone.', RETURNED = 'Your bedroll is gone. Returned to the world spawn.', SET = 'Spawn point set.';

/** Every toast a bot was shown, with when. */
function toasts(q: Bot): { text: string; t: number }[] {
  const l: { text: string; t: number }[] = [];
  q.on('fx', (m: S2COf<'fx'>) => { for (const e of m.l) if (e[0] === 't') l.push({ text: String(e[1]), t: performance.now() }); });
  return l;
}

export default async function bed(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  const ida = playerIdOf(a.token)!, idb = playerIdOf(b.token)!;
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  const ta = toasts(a), tb = toasts(b);
  const me = async (id: string): Promise<HostPlayer | undefined> => (await ctx.players()).find((p) => p.id === id);
  const said = (l: { text: string }[], text: string, from = 0): boolean => l.slice(from).some((x) => x.text === text);
  for (const q of [a, b]) { ctx.check((await q.cmd('caps 0 0')) === 'caps set', `${q.name}: no creatures`); await q.cmd('time day'); await q.wait(250); }
  await a.cmd('clearmobs');
  const ws = (await ctx.shared()).spawn;
  ctx.log(`world spawn ${ws[0]} ${ws[1]}`);

  // a stone pad 40 blocks east of the world spawn, at the height of the spawn's ground
  const px = ws[0] + 40, pz = ws[1], g = Math.round(a.body.y) - 1;
  await held(ctx, px - 5, pz - 5, px + 5, pz + 5);
  await fills(ctx, a, [[px - 4, g - 2, pz - 4, px + 4, g, pz + 4, 'stone'], [px - 4, g + 1, pz - 4, px + 4, g + 8, pz + 4, 'air']]);
  const onPad = async (q: Bot, dx: number): Promise<void> => {
    ctx.check((await q.cmd(`tp ${px + dx + 0.5} ${g + 1.01} ${pz + 0.5}`)) === 'teleported', `${q.name} goes to the pad`);
    await q.until(() => q.ready && q.body.onGround && Math.abs(q.body.x - (px + dx + 0.5)) < 0.3, 10000, 'the pad');
  };
  await onPad(a, -2); await onPad(b, 2);
  const BED: [number, number, number] = [px, g + 1, pz], BID = blockId('bedroll');
  const setBed = async (n: number): Promise<void> => {
    ctx.check((await a.cmd('give bedroll 1')).startsWith('gave'), `Ada is given bedroll ${n}`);
    await a.until(() => a.count('bedroll') > 0, 5000, 'the bedroll');
    await a.place(...BED, 'bedroll');
    await b.until(() => b.vox.getBlock(...BED) === BID, 5000, 'the bedroll in Bram\'s world').catch(() => {});
    ctx.check(a.vox.getBlock(...BED) === BID && b.vox.getBlock(...BED) === BID, `bedroll ${n} lies at ${BED.join(' ')}, and both see it`);
  };
  const lieDown = async (q: Bot, t: { text: string }[]): Promise<void> => {
    const n = t.length;
    await q.use(...BED);
    await q.until(() => said(t, SET, n), 5000, 'the toast').catch(() => {});
    const p = await me(playerIdOf(q.token)!);
    ctx.check(said(t, SET, n) && !!p?.bed && p.bed.join() === BED.join(), `${q.name} uses it by day: "${SET}", and the host holds it as her bed (${p?.bed?.join(' ')})`.replace('her', q === a ? 'her' : 'his'));
  };
  await setBed(1);
  await lieDown(a, ta); await lieDown(b, tb);

  // ---- a death with the bed in place: back beside it ----
  /** Ada falls 30 blocks from over where she stands, dies, and asks to go home; resolves when she is in play again. */
  const die = async (q: Bot, what: string): Promise<void> => {
    const d0 = q.counts.deaths, x = q.body.x, z = q.body.z, y = q.body.y, fx = Math.floor(x), fy = Math.round(y), fz = Math.floor(z);
    // nothing over her to land on short of the ground: a tree or an overhang would break the fall
    await q.wait(300);
    ctx.check((await q.cmd(`fill ${fx - 1} ${fy + 2} ${fz - 1} ${fx + 1} ${fy + 34} ${fz + 1} air`)) === 'filled', `${q.name} has open sky over her`);
    await q.wait(300);
    ctx.check((await q.cmd(`tp ${x.toFixed(2)} ${(y + 30).toFixed(2)} ${z.toFixed(2)}`)) === 'teleported', `${q.name} is put 30 blocks up (${what})`);
    await q.until(() => q.counts.deaths > d0, 15000, 'the death');
    ctx.check(q.counts.deaths === d0 + 1, `${q.name} fell to her death`);
    await sleep(500);
    q.respawn();
    await q.until(() => q.ready && !q.invc.stats.dead, 30000, 'the respawn');
    await q.loaded();
    await q.until(() => q.body.onGround, 10000, 'the ground').catch(() => {});
  };
  await die(a, 'the bed is there');
  ctx.check(Math.hypot(a.body.x - (BED[0] + 0.5), a.body.z - (BED[2] + 0.5)) < 2.5, `she wakes beside the bedroll (${Math.hypot(a.body.x - (BED[0] + 0.5), a.body.z - (BED[2] + 0.5)).toFixed(2)} blocks)`);

  // ---- Bram breaks it while both are online ----
  const na = ta.length, nb = tb.length;
  await b.mine(...BED);
  const t0 = performance.now();
  await Promise.all([a.until(() => said(ta, GONE, na), 5000, 'Ada told'), b.until(() => said(tb, GONE, nb), 5000, 'Bram told')]).catch(() => {});
  ctx.check(said(ta, GONE, na) && said(tb, GONE, nb), `both are told "${GONE}" (${((performance.now() - t0) / 1000).toFixed(1)} s after the break)`);
  const [pa, pb] = [await me(ida), await me(idb)];
  ctx.check(pa?.bed === null && pb?.bed === null, `the host forgot the bed of both (${pa?.bed}, ${pb?.bed})`);
  ctx.check(a.invc.bed === null, 'Ada\'s own stats say she has no bed');
  await die(a, 'no bed');
  const fromSpawn = (): number => Math.hypot(a.body.x - (ws[0] + 0.5), a.body.z - (ws[1] + 0.5));
  ctx.check(fromSpawn() < 8, `she wakes at the world spawn (${fromSpawn().toFixed(1)} blocks from it)`);

  // ---- a bed broken while its owner's record is on disk only ----
  await onPad(a, -2);
  await setBed(2);
  await lieDown(a, ta);
  // 240 blocks west of the bed, far out of every chunk the host holds round it; creative keeps the fall from hurting
  ctx.check((await a.cmd('creative')) === 'creative true', 'Ada is made creative for the long fall');
  const fx = BED[0] - 240, fy = 120;
  ctx.check((await a.cmd(`tp ${fx + 0.5} 200 ${pz + 0.5}`)) === 'teleported', 'Ada goes 240 blocks west of the bed');
  // a stone floor there at a known height, whatever the ground (a sea, a peak)
  await held(ctx, fx - 3, pz - 3, fx + 3, pz + 3, 60000);
  await fills(ctx, a, [[fx - 2, fy - 2, pz - 2, fx + 2, fy, pz + 2, 'stone'], [fx - 2, fy + 1, pz - 2, fx + 2, 210, pz + 2, 'air']]);
  await a.until(() => a.ready && Math.abs(a.body.x - (fx + 0.5)) < 0.5 && Math.abs(a.body.y - (fy + 1)) < 0.01 && a.body.onGround, 40000, 'the floor far west');
  ctx.check((await a.cmd('creative')) === 'creative false', 'and is herself again');
  await a.settle();
  const far = { x: a.body.x, y: a.body.y, z: a.body.z };
  ctx.log(`Ada stands at ${far.x.toFixed(1)} ${far.y.toFixed(1)} ${far.z.toFixed(1)}`);
  a.bye();
  await sleep(400);
  const evictedBy = performance.now() + 20000;
  while ((await me(ida)) && performance.now() < evictedBy) await sleep(300);
  ctx.check(!(await me(ida)), 'after her goodbye the host saved her and let her go from memory');
  const nb2 = tb.length;
  await b.mine(...BED);
  await sleep(1500);
  ctx.check(b.vox.getBlock(...BED) === 0 && !said(tb, GONE, nb2), 'Bram breaks the bed (no longer his, so he is told nothing)');
  b.bye();
  const cx = BED[0] >> 4, cz = BED[2] >> 4, emptyBy = performance.now() + 20000;
  let hostHas = '';
  while (performance.now() < emptyBy) {
    hostHas = (await ctx.hash(0, cx, cz, cx, cz))[`${cx},${cz}`];
    if ((await ctx.players()).length === 0 && hostHas === '-') break;
    await sleep(300);
  }
  ctx.check((await ctx.players()).length === 0 && hostHas === '-', `nobody is left, and the host no longer holds the bed's chunk (${hostHas})`);

  // ---- Ada comes back: the record still names the bed, and only her death finds it gone ----
  const a2 = ctx.bot(new Bot('Ada', a.token)), joining = a2.connect(ctx.url), ta2 = toasts(a2);
  await joining;
  await a2.loaded();
  await a2.settle();
  ctx.check(Math.hypot(a2.body.x - far.x, a2.body.z - far.z) < 0.5, `she is back where she left, far west (${Math.hypot(a2.body.x - far.x, a2.body.z - far.z).toFixed(2)} blocks off)`);
  await sleep(2000);
  const back = await me(ida), held2 = (await ctx.hash(0, cx, cz, cx, cz))[`${cx},${cz}`];
  ctx.check(!!back?.bed && back.bed.join() === BED.join() && a2.invc.bed?.join() === BED.join(), `her record still names the bed at ${back?.bed?.join(' ')}: a hint`);
  ctx.check(held2 === '-' && !said(ta2, GONE) && !said(ta2, RETURNED), `nothing has looked at it yet (the host holds its chunk: ${held2 !== '-'}, toasts: ${ta2.map((x) => x.text).join(' | ') || 'none'})`);
  ctx.check(BLOCKS[a2.vox.getBlock(...BED)]?.use !== 'bed', 'her own world has no bed there either (not loaded, or air)');
  await die(a2, 'the bed is gone, unknown to her record');
  const n = ta2.length;
  await a2.until(() => said(ta2, RETURNED), 5000, 'the message').catch(() => {});
  ctx.check(said(ta2, RETURNED), `she is told "${RETURNED}" (${ta2.slice(Math.max(0, n - 3)).map((x) => x.text).join(' | ')})`);
  const d2 = Math.hypot(a2.body.x - (ws[0] + 0.5), a2.body.z - (ws[1] + 0.5));
  ctx.check(d2 < 8, `she wakes at the world spawn (${d2.toFixed(1)} blocks from it), not at the broken bed's place`);
  const after = await me(ida);
  ctx.check(after?.bed === null && a2.invc.bed === null && after.state === 'active' && !after.dead, `the host forgot the bed and has her in play (${after?.bed}, ${after?.state})`);
  for (const q of [a, b, a2]) ctx.check(q.counts.rej === 0, `${q.name}: ${q.counts.rej} rej`);
}
