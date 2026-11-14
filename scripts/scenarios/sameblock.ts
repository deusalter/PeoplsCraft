// Scenario sameblock (9, "Two players breaking the same block"). Ada and Bram stand either side of a row of dirt and dig
// each block together, both letting go in the same moment, so that both edits are on the wire before either hears of the
// other. Both show air at once. The host breaks the block for the edit that came first and refuses the other with a
// `rej` that carries air, which is what that client already shows; one set of drops each time; every copy of the world
// hashes the same.
import { BLOCKS } from '../../src/data/blocks';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { sleep } from './arena';
import { blockId, calm, diff, pad, text, totals } from './site';

const N = 8, KEY = 'dirt';

export default async function sameblock(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  const { px, pz, g } = await pad(ctx, a, 8, 8);
  const id = blockId(KEY), drops = BLOCKS[id].drops;
  if (drops.length !== 1 || drops[0][1] !== 1 || drops[0][2] !== drops[0][3]) throw new Error(`${KEY} does not drop one fixed stack`);
  const [dropKey, , per] = drops[0];
  // the row: x from px - 3 to px + 4, three blocks south of where they stand, on the floor
  const xs = Array.from({ length: N }, (_, i) => px - 3 + i), y = g + 1, z = pz + 3;
  ctx.check((await a.cmd(`fill ${xs[0]} ${y} ${z} ${xs[N - 1]} ${y} ${z} ${KEY}`)) === 'filled', `a row of ${N} ${KEY} on the pad`);
  await Promise.all([a, b].map((q) => q.until(() => xs.every((x) => q.vox.getBlock(x, y, z) === id), 5000, 'the row')));

  const rejs = new Map<Bot, { seq: number; cells: number[] }[]>([[a, []], [b, []]]);
  for (const q of [a, b]) q.on('rej', (m) => rejs.get(q)!.push({ seq: m.seq, cells: [...m.cells] }));
  const t0 = await totals(ctx);
  const refused0 = (await ctx.stats()).refused.edit;
  ctx.log(`before: ${text(t0) || 'nothing'}; edits refused so far ${refused0}`);

  let flicker = 0, races = 0, oneRej = 0, rejAir = 0, airAtOnce = 0, oneSet = 0;
  for (let i = 0; i < N; i++) {
    const x = xs[i], first = i % 2 ? b : a, second = first === a ? b : a;
    await Promise.all([a.goto(x + 0.5, z - 0.5), b.goto(x + 0.5, z + 1.5)]);
    await Promise.all([a.settle(), b.settle()]);
    const r0 = [rejs.get(a)!.length, rejs.get(b)!.length], before = await totals(ctx);
    for (const q of [a, b]) { q.lookAt(x + 0.5, y + 0.5, z + 0.5); q.blocks.onDigStart(id); q.blocks.onDig(true, x, y, z); }
    await sleep(Math.max(a.blocks.breakTime(id), b.blocks.breakTime(id)) * 1000 + 150);
    // one turn of the event loop for both: neither client can have heard of the other's break
    first.blocks.onBroken(x, y, z, id); second.blocks.onBroken(x, y, z, id);
    for (const q of [a, b]) q.blocks.onDig(false, x, y, z);
    races++;
    if (a.vox.getBlock(x, y, z) === 0 && b.vox.getBlock(x, y, z) === 0) airAtOnce++;
    // from here on neither may show the block again, not even for a frame
    const watch = setInterval(() => { for (const q of [a, b]) if (q.vox.getBlock(x, y, z) !== 0) flicker++; }, 4);
    await Promise.all([a.settle(), b.settle()]);
    await sleep(1500);
    clearInterval(watch);
    const got = [rejs.get(a)!.slice(r0[0]), rejs.get(b)!.slice(r0[1])], all = [...got[0], ...got[1]];
    if (all.length === 1) oneRej++;
    if (all.length === 1 && all[0].cells.length === 4 && all[0].cells[0] === x && all[0].cells[1] === y && all[0].cells[2] === z && all[0].cells[3] === 0) rejAir++;
    const after = await totals(ctx), d = (after[dropKey] ?? 0) - (before[dropKey] ?? 0);
    if (d === per && diff({ ...before, [dropKey]: (before[dropKey] ?? 0) + per }, after) === '') oneSet++;
    const loser = got[0].length ? a : got[1].length ? b : null;
    // both edits reach the host in one step, and 6.1 drains connections in join order: Ada's is the first it processes
    ctx.log(`block ${i + 1} at ${x} ${y} ${z}: ${first.name} let go first; refused for ${loser?.name ?? 'nobody'} ${all.map((r) => `[${r.cells.join(' ')}]`).join(' ')}; ${dropKey} +${d}`);
  }
  ctx.check(airAtOnce === races, `both showed air at once, in ${airAtOnce} of ${races} breaks`);
  ctx.check(oneRej === races, `exactly one of the two edits was refused, in ${oneRej} of ${races} breaks`);
  ctx.check(rejAir === races, `the refusal carried the cell as air, in ${rejAir} of ${races}`);
  ctx.check(flicker === 0, `neither showed the block again after breaking it (${flicker} frames did)`);
  ctx.check(oneSet === races, `one set of drops (${per} ${dropKey}) and nothing else changed, in ${oneSet} of ${races} breaks`);

  const t1 = await totals(ctx), lie = (await ctx.drops(0)).filter((d) => d.k === dropKey);
  ctx.check(lie.length === 0, `no ${dropKey} is left on the ground (${lie.length} drops)`);
  ctx.check((t1[dropKey] ?? 0) - (t0[dropKey] ?? 0) === N * per && a.count(dropKey) + b.count(dropKey) === N * per, `${N * per} ${dropKey} in all, in the bots' packs: Ada ${a.count(dropKey)}, Bram ${b.count(dropKey)}; the host ${(t1[dropKey] ?? 0) - (t0[dropKey] ?? 0)}`);
  const refused = (await ctx.stats()).refused.edit - refused0;
  ctx.check(refused === races, `the host refused ${refused} edits, one per break`);

  const cx = px >> 4, cz = pz >> 4, host = await ctx.hash(0, cx - 1, cz - 1, cx + 1, cz + 1);
  let same = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = `${cx + i},${cz + j}`, ha = a.chunkHash(cx + i, cz + j), hb = b.chunkHash(cx + i, cz + j);
    if (ha !== null && ha === hb && ha === host[k]) same++; else ctx.log(`chunk ${k}: Ada ${ha}, Bram ${hb}, host ${host[k]}`);
  }
  ctx.check(same === 9, `chunkHash equal on both bots and the host for ${same} of 9 chunks`);
  for (const q of [a, b]) {
    ctx.check(q.counts.corrections === 0, `${q.name}: ${q.counts.corrections} corrections`);
    ctx.check(q.counts.rejEmpty === 0, `${q.name}: ${q.counts.rejEmpty} rej without cells`);
  }
}
