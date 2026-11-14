// Scenario basic (11, stage 4): two bots join, see each other in snapshots, mine, place, pillar-jump 6 blocks,
// back-fill, use one chest; then every bot's copy of the 9 chunks round them hashes the same as the host's, and
// neither bot was sent a `rej` or a correction.
import { BLOCKS, T_LIQUID, T_REPLACE, T_SOLID } from '../../src/data/blocks';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';

const BUILD = 'oak_planks';
/** The cells at g + 1, from the site (x, z), that the scenario places into: the pillar, Ada's block, Bram's, the chest. */
const PLACED: [number, number][] = [[0, 0], [-1, 0], [3, -2], [0, 2]];

/** A flat patch the bot can walk to: ground at one height under every cell the scenario uses (x - 1 to x + 3, z - 2
 *  to z + 2), soft enough to dig by hand and dropping something when it is (sandstone wants a pick), open sky over (x, z) for the pillar, and nothing but air or a replaceable
 *  plant in the cells at g + 1 that get a block (a flower is neither, and placing into it is refused). Nearest by
 *  walking first. */
function findSite(bot: Bot): { x: number; z: number; g: number } | null {
  const v = bot.vox, reach = bot.flood(NaN, NaN, 8000), feet = new Map<string, number>();
  for (const c of reach) feet.set(`${c.x},${c.z}`, c.y);
  for (const c of reach) {
    const { x, z } = c, g = c.y - 1;
    let flat = true;
    for (let i = -1; i <= 3 && flat; i++) for (let j = -2; j <= 2 && flat; j++) {
      const id = v.getBlock(x + i, g, z + j);
      flat = feet.get(`${x + i},${z + j}`) === g + 1 && BLOCKS[id].hard >= 0 && BLOCKS[id].hard <= 1 && BLOCKS[id].power === 0 && !T_REPLACE[v.getBlock(x + i, g - 1, z + j)];
    }
    if (!flat) continue;
    if (!PLACED.every(([i, j]) => { const id = v.getBlock(x + i, g + 1, z + j); return id === 0 || T_REPLACE[id]; })) continue;
    let open = true;
    for (let y = g + 1; y <= g + 9 && open; y++) open = !T_SOLID[v.getBlock(x, y, z)] && !T_LIQUID[v.getBlock(x, y, z)];
    if (open) return { x, z, g };
  }
  return null;
}

/** What the pack holds, slot by slot. */
const packText = (bot: Bot): string => bot.invc.inv.slots.map((q, i) => (q ? `${i}:${q.k}x${q.n}` : '')).filter(Boolean).join(' ');

export default async function basic(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  ctx.log(`both in play: Ada slot ${a.slot} at ${a.body.x.toFixed(1)} ${a.body.y.toFixed(1)} ${a.body.z.toFixed(1)}, Bram slot ${b.slot}`);

  await Promise.all([a.until(() => a.players.has(b.slot), 10000, 'Bram in a snapshot'), b.until(() => b.players.has(a.slot), 10000, 'Ada in a snapshot')]);
  ctx.check(a.players.has(b.slot) && b.players.has(a.slot), 'each bot sees the other in its snapshots');

  // the test commands of 10.1: no creature is about, by day, so that nothing but the players changes the place
  ctx.check((await a.cmd('caps 0 0')) === 'caps set' && (await a.cmd('clearmobs')) === 'cleared' && (await a.cmd('time day')) === 'time set', 'no creatures, daytime');
  ctx.check((await a.cmd(`give ${BUILD} 32`)).startsWith('gave'), 'Ada is given 32 planks');
  ctx.check((await a.cmd('give chest 1')).startsWith('gave'), 'Ada is given a chest');
  ctx.check((await b.cmd(`give ${BUILD} 8`)).startsWith('gave'), 'Bram is given 8 planks');
  await Promise.all([a.until(() => a.count(BUILD) === 32 && a.count('chest') === 1, 5000, 'gifts'), b.until(() => b.count(BUILD) === 8, 5000, 'gifts')]);

  // the nearest site; on ground with none in reach (a steep slope, a strip of shore), a pad levelled where Ada stands
  // with the `fill` of 10.1, as golden and closetab level theirs
  let site = findSite(a);
  if (!site) {
    const px = Math.floor(a.body.x), pz = Math.floor(a.body.z), pg = Math.round(a.body.y) - 1;
    ctx.log(`no flat open ground in reach of ${px} ${pz}: levelling a pad at ground ${pg}`);
    for (const [y0, y1, key] of [[pg - 3, pg - 1, 'stone'], [pg, pg, 'dirt'], [pg + 1, pg + 14, 'air']] as const) {
      // the five commands above emptied the `cmd` bucket of 4.1, which refills at 5 a second and drops what is over
      await a.wait(400);
      ctx.check((await a.cmd(`fill ${px - 3} ${y0} ${pz - 4} ${px + 5} ${y1} ${pz + 4} ${key}`)) === 'filled', `the pad's ${key} is filled in`);
    }
    await a.until(() => (site = findSite(a)) !== null, 10000, 'the levelled pad').catch(() => {});
  }
  if (!site) throw new Error('no flat open ground found');
  const { x, z, g } = site;
  ctx.log(`site ${x} ${g} ${z} (${BLOCKS[a.vox.getBlock(x, g, z)].key})`);
  await Promise.all([a.goto(x + 0.5, z + 0.5), b.goto(x + 2.5, z - 1.5)]);

  // mine: a hole beside each of them; the other sees it go, and the one who dug picks up what it dropped
  const holeA: [number, number, number] = [x + 1, g, z], holeB: [number, number, number] = [x + 3, g, z - 1];
  const dropA = BLOCKS[a.vox.getBlock(...holeA)].drops[0]?.[0] ?? BLOCKS[a.vox.getBlock(...holeA)].key, hadA = a.count(dropA);
  await Promise.all([a.mine(...holeA), b.mine(...holeB)]);
  await Promise.all([b.until(() => b.vox.getBlock(...holeA) === 0, 5000, 'Ada\'s hole'), a.until(() => a.vox.getBlock(...holeB) === 0, 5000, 'Bram\'s hole')]);
  ctx.check(b.vox.getBlock(...holeA) === 0 && a.vox.getBlock(...holeB) === 0, 'each mined a block, and the other sees it gone');
  // what fell to the floor of the hole is out of reach from its rim: she steps down into it, and back up
  await a.goto(x + 1.5, z + 0.5);
  await a.until(() => a.count(dropA) > hadA, 5000, 'the drop').catch(() => {});
  ctx.check(a.count(dropA) > hadA, `Ada picked up the ${dropA} her block dropped`);
  await a.goto(x + 0.5, z + 0.5);
  ctx.check(Math.round(a.body.y) === g + 1, `Ada is out of the hole (feet at ${a.body.y.toFixed(2)})`);

  // place: a block on the ground beside each
  await Promise.all([a.place(x - 1, g + 1, z, BUILD), b.place(x + 3, g + 1, z - 2, BUILD)]);
  const P = BLOCKS.findIndex((q) => q.key === BUILD);
  await Promise.all([b.until(() => b.vox.getBlock(x - 1, g + 1, z) === P, 5000, 'Ada\'s block'), a.until(() => a.vox.getBlock(x + 3, g + 1, z - 2) === P, 5000, 'Bram\'s block')]);
  ctx.check(true, 'each placed a block, and the other sees it');

  // pillar-jump 6 blocks
  await a.pillar(6, BUILD);
  const top = Math.round(a.body.y);
  ctx.check(top === g + 7, `Ada stands 6 blocks up on her pillar (feet at ${a.body.y.toFixed(2)}, ground ${g})`);
  await b.until(() => { for (let y = g + 1; y <= g + 6; y++) if (b.vox.getBlock(x, y, z) !== P) return false; return true; }, 5000, 'the pillar').catch(() => {});
  let pillarSeen = true;
  for (let y = g + 1; y <= g + 6; y++) if (b.vox.getBlock(x, y, z) !== P) pillarSeen = false;
  ctx.check(pillarSeen, 'Bram sees the whole pillar');

  // down again, mining the pillar under her feet, then back-fill both holes
  for (let i = 0; i < 6; i++) {
    const fy = Math.round(a.body.y);
    await a.mine(x, fy - 1, z);
    await a.until(() => a.body.onGround && Math.round(a.body.y) === fy - 1, 5000, 'landing');
  }
  ctx.check(Math.round(a.body.y) === g + 1, `Ada is back on the ground (feet at ${a.body.y.toFixed(2)})`);
  await Promise.all([a.place(...holeA, BUILD), b.place(...holeB, BUILD)]);
  await Promise.all([b.until(() => b.vox.getBlock(...holeA) === P, 5000, 'fill'), a.until(() => a.vox.getBlock(...holeB) === P, 5000, 'fill')]);
  ctx.check(true, 'both holes are back-filled, and each sees the other\'s');

  // one chest: Ada sets it down and puts her planks in; Bram opens it and takes them
  const C: [number, number, number] = [x, g + 1, z + 2];
  await a.place(...C, 'chest');
  await a.use(...C);
  await a.until(() => a.invc.box?.kind === 'chest', 5000, 'the chest window');
  const slot = a.invc.inv.slots.findIndex((s) => s?.k === BUILD), n = a.count(BUILD);
  ctx.check(slot >= 0 && (await a.op({ o: 'quick', v: [0, slot], e: BUILD })), `Ada puts ${a.invc.inv.slots[slot] ? 'some' : 'all'} of her ${n} planks in the chest`);
  const inChest = (bot: Bot): number => { const bx = bot.invc.box; return bx && bx.kind === 'chest' ? bx.s.reduce((t, s) => t + (s && s.k === BUILD ? s.n : 0), 0) : -1; };
  const put = inChest(a);
  await a.op({ o: 'close' });
  ctx.check(put > 0 && a.count(BUILD) === n - put, `the chest holds ${put} planks and Ada ${a.count(BUILD)}`);
  await b.goto(x + 1.5, z + 2.5);
  const bHad = b.count(BUILD);
  await b.use(...C);
  await b.until(() => b.invc.box?.kind === 'chest', 5000, 'the chest window');
  ctx.check(inChest(b) === put, `Bram finds the ${put} planks in the chest (${inChest(b)})`);
  ctx.check(await b.op({ o: 'takeAll' }), 'Bram takes everything');
  await b.op({ o: 'close' });
  ctx.check(b.count(BUILD) === bHad + put, `Bram holds ${b.count(BUILD)} planks (${bHad} + ${put})`);

  // the same world everywhere: 9 chunks round the site, from each bot's own store and from the host
  await Promise.all([a.goto(x + 0.5, z + 1.5), a.settle(), b.settle()]);
  await a.wait(1500);
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16), host = await ctx.hash(0, cx - 1, cz - 1, cx + 1, cz + 1);
  let same = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = `${cx + i},${cz + j}`, ha = a.chunkHash(cx + i, cz + j), hb = b.chunkHash(cx + i, cz + j);
    if (ha !== null && ha === hb && ha === host[k]) same++;
    else ctx.log(`chunk ${k}: Ada ${ha}, Bram ${hb}, host ${host[k]}`);
  }
  ctx.check(same === 9, `chunkHash equal on both bots and the host for ${same} of 9 chunks`);

  const st = await ctx.stats();
  ctx.check(st.simPlayers === 2, `the host holds ${st.simPlayers} players (${st.names.join(', ')})`);
  for (const bot of [a, b]) {
    ctx.check(bot.counts.rej === 0, `${bot.name}: ${bot.counts.rej} rej`);
    ctx.check(bot.counts.corrections === 0, `${bot.name}: ${bot.counts.corrections} corrections`);
    ctx.check(bot.counts.deaths === 0, `${bot.name}: ${bot.counts.deaths} deaths, ${bot.counts.hurt} blows`);
  }
  ctx.log(`host steps ${st.steps}, p99 ${st.p99.toFixed(2)} ms, max ${st.max.toFixed(2)} ms, refused ${JSON.stringify(st.refused)}`);

  // the same world after a restart. Bram sets one more block down and the server is stopped with SIGTERM at once,
  // with both still connected: only the save on SIGTERM (8.1) can have kept that block and where they stand. Both
  // come back where they were, with what they held, to the blocks they left.
  await b.place(x + 2, g + 1, z + 1, BUILD);
  const host2 = await ctx.hash(0, cx - 1, cz - 1, cx + 1, cz + 1);
  const before = [a, b].map((bot) => ({ name: bot.name, token: bot.token, x: bot.body.x, y: bot.body.y, z: bot.body.z, pack: packText(bot) }));
  const stopped = ctx.restart();
  for (const bot of [a, b]) bot.close();
  ctx.check((await stopped) === 0, 'the server stopped cleanly on SIGTERM for the restart');
  const again = before.map((r) => ctx.bot(new Bot(r.name, r.token)));
  await Promise.all(again.map((bot) => bot.connect(ctx.url)));
  await Promise.all(again.map((bot) => bot.loaded()));
  await Promise.all(again.map((bot) => bot.settle()));
  await again[0].until(() => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (again[0].chunkHash(cx + i, cz + j) === null) return false; return true; }, 10000, 'the chunks round the site').catch(() => {});
  const after = await ctx.hash(0, cx - 1, cz - 1, cx + 1, cz + 1);
  ctx.check(again[0].vox.getBlock(x + 2, g + 1, z + 1) === P, 'the block Bram set down just before the stop is there after it');
  let kept = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = `${cx + i},${cz + j}`, h = again[0].chunkHash(cx + i, cz + j);
    if (after[k] === host2[k] && h === host2[k]) kept++;
    else ctx.log(`chunk ${k} after the restart: host ${after[k]}, Ada ${h}, before ${host2[k]}`);
  }
  ctx.check(kept === 9, `after the restart, ${kept} of 9 chunks hash as they did before it, on the host and on Ada`);
  for (let i = 0; i < before.length; i++) {
    const r = before[i], bot = again[i], d = Math.hypot(bot.body.x - r.x, bot.body.y - r.y, bot.body.z - r.z);
    ctx.check(d < 0.5, `${r.name} is back where she left (${d.toFixed(2)} blocks off)`.replace('she', r.name === 'Ada' ? 'she' : 'he'));
    ctx.check(packText(bot) === r.pack, `${r.name}'s pack after the restart is as it was: ${packText(bot) || 'empty'}`);
    ctx.check(bot.counts.rej === 0 && bot.counts.corrections === 0, `${r.name} after the restart: ${bot.counts.rej} rej, ${bot.counts.corrections} corrections`);
  }
}
