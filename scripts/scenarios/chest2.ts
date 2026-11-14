// Scenario chest2 (9, "Two players in one chest"; 11: two bots, 200 racing ops each, item totals conserved). Ada and Bram
// open one chest and each sends 200 ops into it as fast as a hand clicks, without waiting for an answer: shift-clicks
// both ways, stacks taken onto the cursor and put down, sorting, take-all and stash, each named by the stack the bot saw
// in that slot. Many land on a slot the other has just changed. Then every item that was there is still there, once, and
// both bots and the host agree on every slot.
import { mulberry32 } from '../../src/core/noise';
import type { InvOp } from '../../src/sim/invops';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { sleep } from './arena';
import { calm, diff, packOf, pad, text, totals } from './site';

const OPS = 200, EVERY_MS = 30;
/** What goes into the chest at the start, given to Ada: a few kinds, several stacks of some. */
const STOCK: [string, number][] = [['cobble', 64], ['cobble', 40], ['oak_planks', 64], ['torch', 30], ['arrow', 50], ['coal', 21], ['oak_log', 17]];

type Slots = ({ k: string; n: number } | null)[];
const keyOf = (s: { k: string } | null | undefined): string => s?.k ?? '';
const slotText = (s: Slots): string => s.map((q, i) => (q ? `${i}:${q.k}x${q.n}` : '')).filter(Boolean).join(' ');

/** The next op of a hand working the chest as `q` sees it: never an op its own view would call impossible. */
function nextOp(q: Bot, rnd: () => number): InvOp {
  const inv = q.invc.inv, box = q.invc.box, chest: Slots = box && box.kind === 'chest' ? box.s : [];
  const full = (s: Slots): number[] => s.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
  const pick = <T>(l: T[]): T => l[Math.floor(rnd() * l.length)];
  const inChest = full(chest), inPack = full(inv.slots);
  if (inv.cursor) {
    // put the stack down somewhere: a chest slot or a pack slot, empty or not
    const v: [0 | 4, number] = rnd() < 0.7 ? [4, Math.floor(rnd() * 27)] : [0, Math.floor(rnd() * 36)];
    return { o: 'click', v, r: rnd() < 0.2, e: keyOf(v[0] === 4 ? chest[v[1]] : inv.slots[v[1]]) };
  }
  const r = rnd();
  if (r < 0.4 && inChest.length) { const i = pick(inChest); return { o: 'quick', v: [4, i], e: keyOf(chest[i]) }; }
  if (r < 0.65 && inPack.length) { const i = pick(inPack); return { o: 'quick', v: [0, i], e: keyOf(inv.slots[i]) }; }
  if (r < 0.88 && inChest.length) { const i = pick(inChest); return { o: 'click', v: [4, i], r: rnd() < 0.3, e: keyOf(chest[i]) }; }
  if (r < 0.92) return { o: 'sort', w: 1 };
  if (r < 0.95) return { o: 'stash' };
  if (r < 0.97) return { o: 'takeAll' };
  if (inPack.length) { const i = pick(inPack); return { o: 'click', v: [0, i], r: false, e: keyOf(inv.slots[i]) }; }
  return { o: 'gather' };
}

export default async function chest2(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  const { px, pz, g } = await pad(ctx, a, 6, 6);
  const C: [number, number, number] = [px, g + 1, pz + 2];
  ctx.check((await a.cmd(`fill ${C[0]} ${C[1]} ${C[2]} ${C[0]} ${C[1]} ${C[2]} chest`)) === 'filled', `a chest at ${C.join(' ')}`);
  for (const [k, n] of STOCK) { await a.wait(220); ctx.check((await a.cmd(`give ${k} ${n}`)).startsWith('gave'), `Ada is given ${n} ${k}`); }
  await Promise.all([a.goto(px - 0.5, pz + 1.5), b.goto(px + 1.5, pz + 1.5)]);

  // Ada fills the chest from her pack, then both have it open
  await a.use(...C);
  await a.until(() => a.invc.box?.kind === 'chest', 5000, 'the chest window');
  for (let i = 0; i < 36; i++) { const s = a.invc.inv.slots[i]; if (s && STOCK.some(([k]) => k === s.k)) await a.op({ o: 'quick', v: [0, i], e: s.k }); }
  await b.use(...C);
  await b.until(() => b.invc.box?.kind === 'chest', 5000, 'the chest window');
  await Promise.all([a.settle(), b.settle()]);
  await sleep(500);
  const boxOf = (q: Bot): Slots => (q.invc.box && q.invc.box.kind === 'chest' ? q.invc.box.s.map((s) => (s ? { k: s.k, n: s.n } : null)) : []);
  const hostChest = async (): Promise<Slots> => ((await ctx.ent(0, ...C))?.data.s ?? []).map((s: { k: string; n: number } | null) => (s ? { k: s.k, n: s.n } : null));
  const t0 = await totals(ctx, 0, [await hostChest()]);
  ctx.log(`the chest holds ${slotText(await hostChest())}`);
  ctx.check(slotText(boxOf(a)) === slotText(boxOf(b)) && slotText(boxOf(a)) === slotText(await hostChest()) && boxOf(a).some(Boolean), 'both see what the host holds in it');
  ctx.log(`before: ${text(t0)}`);

  // the race: each sends its 200 ops on its own clock, never waiting for an answer; an `st.box` that arrives while a bot
  // still has ops in flight is the other's change landing under them
  const contested = new Map<Bot, number>([[a, 0], [b, 0]]);
  for (const q of [a, b]) q.on('st', (m) => { if (m.box && q.invc.sync.unacked > 0) contested.set(q, contested.get(q)! + 1); });
  const sent = new Map<Bot, number>([[a, 0], [b, 0]]), kinds = new Map<string, number>();
  const work = async (q: Bot, seed: number): Promise<void> => {
    const rnd = mulberry32(seed);
    for (let i = 0; i < OPS; i++) {
      if (q.invc.box?.kind !== 'chest') throw new Error(`${q.name}: the chest window closed during the race`);
      const op = nextOp(q, rnd);
      kinds.set(op.o, (kinds.get(op.o) ?? 0) + 1);
      q.invc.send(op); sent.set(q, sent.get(q)! + 1);
      await sleep(EVERY_MS);
    }
  };
  const t = performance.now();
  await Promise.all([work(a, 0x51ed), work(b, 0xb0a7)]);
  ctx.log(`${OPS * 2} ops sent in ${((performance.now() - t) / 1000).toFixed(1)} s: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ')}`);
  await Promise.all([a.settle(), b.settle()]);
  await sleep(800);
  ctx.check(sent.get(a) === OPS && sent.get(b) === OPS, `each sent ${OPS} ops (Ada ${sent.get(a)}, Bram ${sent.get(b)})`);
  ctx.check(contested.get(a)! + contested.get(b)! >= 20, `the other's change landed under ops still in flight ${contested.get(a)} times for Ada and ${contested.get(b)} for Bram`);
  ctx.check(a.invc.box?.kind === 'chest' && b.invc.box?.kind === 'chest', 'the chest is still open for both');

  // what the host holds: in the chest, slot by slot, as both see it; in each pack as that bot sees it
  const hc = await hostChest(), hp = await ctx.players();
  ctx.log(`the chest after: ${slotText(hc)}`);
  ctx.check(slotText(boxOf(a)) === slotText(hc), `Ada sees the chest as the host holds it${slotText(boxOf(a)) === slotText(hc) ? '' : `: ${slotText(boxOf(a))}`}`);
  ctx.check(slotText(boxOf(b)) === slotText(hc), `Bram sees the chest as the host holds it${slotText(boxOf(b)) === slotText(hc) ? '' : `: ${slotText(boxOf(b))}`}`);
  for (const q of [a, b]) {
    // the host's count of a pack leaves the cursor out, and the bot's own count has it
    const host = hp.find((p) => p.name === q.name)!, cur = q.invc.inv.cursor, items = { ...host.items };
    if (cur) items[cur.k] = (items[cur.k] ?? 0) + cur.n;
    const d = diff(items, packOf(q));
    ctx.check(d === '', `${q.name}'s pack is what the host holds${cur ? `, with ${cur.n} ${cur.k} on the cursor` : ''}${d ? ` (${d})` : ''}`);
  }
  const mid = await totals(ctx, 0, [hc, ...[a, b].map((q) => (q.invc.inv.cursor ? [q.invc.inv.cursor] : []))]);
  ctx.check(diff(t0, mid) === '', `every item is still there, once: ${diff(t0, mid) || text(mid)}`);

  // both close; what was on a cursor goes back to its pack
  await Promise.all([a.op({ o: 'close' }), b.op({ o: 'close' })]);
  await sleep(500);
  const t1 = await totals(ctx, 0, [await hostChest()]);
  ctx.check(diff(t0, t1) === '', `and after both closed it: ${diff(t0, t1) || 'the same totals'}`);
  ctx.check((await ctx.drops(0)).filter((d) => STOCK.some(([k]) => k === d.k)).length === 0, 'nothing of it fell to the ground');
  for (const q of [a, b]) ctx.check(q.counts.corrections === 0 && q.counts.rej === 0, `${q.name}: ${q.counts.corrections} corrections, ${q.counts.rej} rej`);
}
