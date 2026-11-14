// Scenario chestbreak (9, "A chest broken, replaced or walked away from while open"; 11: one bot breaks a chest another
// has open: the window closes, totals conserved). Ada has the chest open with a stack on her cursor and is shift-clicking
// stacks out of it when Bram breaks it; her link lags 150 ms just then, so the ops she sends before she hears of it reach
// the host after the chest is gone. The host closes her window before it spills anything: her cursor goes back to her
// pack, her late ops change nothing, and every item that was in the chest is on the ground once, then in a pack.
import { BLOCKS } from '../../src/data/blocks';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { sleep } from './arena';
import { blockId, calm, diff, packOf, pad, text, totals } from './site';

const STOCK: [string, number][] = [['cobble', 64], ['oak_planks', 64], ['torch', 30], ['arrow', 50], ['coal', 21], ['oak_log', 17], ['iron_ore', 9]];
/** Ada's shift-clicks after Bram's break has left, one every 10 ms until she hears of it, and how long her link lags then. */
const LATE = 40, LATE_MS = 10, LAG_MS = 150;

type Slots = ({ k: string; n: number } | null)[];
const slotText = (s: Slots): string => s.map((q, i) => (q ? `${i}:${q.k}x${q.n}` : '')).filter(Boolean).join(' ');

export default async function chestbreak(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  const { px, pz, g } = await pad(ctx, a, 6, 6);
  const C: [number, number, number] = [px, g + 1, pz + 2], CH = blockId('chest');
  ctx.check((await a.cmd(`fill ${C[0]} ${C[1]} ${C[2]} ${C[0]} ${C[1]} ${C[2]} chest`)) === 'filled', `a chest at ${C.join(' ')}`);
  for (const [k, n] of STOCK) { await a.wait(220); ctx.check((await a.cmd(`give ${k} ${n}`)).startsWith('gave'), `Ada is given ${n} ${k}`); }
  ctx.check((await b.cmd('give iron_axe 1')).startsWith('gave'), 'Bram is given an axe');
  await Promise.all([a.goto(px - 0.5, pz + 1.5), b.goto(px + 1.5, pz + 1.5)]);

  await a.use(...C);
  await a.until(() => a.invc.box?.kind === 'chest', 5000, 'the chest window');
  for (let i = 0; i < 36; i++) { const s = a.invc.inv.slots[i]; if (s && STOCK.some(([k]) => k === s.k)) await a.op({ o: 'quick', v: [0, i], e: s.k }); }
  const boxOf = (): Slots => (a.invc.box && a.invc.box.kind === 'chest' ? a.invc.box.s.map((s) => (s ? { k: s.k, n: s.n } : null)) : []);
  const hostChest = async (): Promise<Slots> => ((await ctx.ent(0, ...C))?.data.s ?? []).map((s: { k: string; n: number } | null) => (s ? { k: s.k, n: s.n } : null));
  // a stack onto her cursor, as a hand that has picked one up and not put it down
  const first = boxOf().findIndex(Boolean), onCursor = boxOf()[first]!;
  ctx.check(await a.op({ o: 'click', v: [4, first], r: false, e: onCursor.k }), `Ada takes ${onCursor.n} ${onCursor.k} onto her cursor`);
  await sleep(400);
  const inChest = await hostChest();
  ctx.check(slotText(boxOf()) === slotText(inChest) && a.invc.inv.cursor?.k === onCursor.k, `Ada sees what the host holds in the chest: ${slotText(inChest)}`);
  const drops = BLOCKS[CH].drops, chestDrop: Record<string, number> = {};
  for (const [k, c, lo, hi] of drops) { if (c !== 1 || lo !== hi) throw new Error('the chest does not drop one fixed stack'); chestDrop[k] = (chestDrop[k] ?? 0) + lo; }
  const t0 = await totals(ctx, 0, [inChest, [a.invc.inv.cursor]]);
  ctx.log(`before: ${text(t0)}`);

  let ended = 0, endedAt = 0;
  a.invc.onEnded = () => { ended++; endedAt = performance.now(); };
  let stNull = 0, nullAck = -1;
  a.on('st', (m) => { if (m.box === null && stNull++ === 0) nullAck = m.ack; });
  // every op of Ada's from here on is one of the late ones, numbered from what the host has acknowledged
  await a.settle();
  const base = a.invc.sync.ack;
  // Bram digs it for its break time and lets go; from that moment Ada shift-clicks a stack out every 10 ms
  b.lookAt(C[0] + 0.5, C[1] + 0.5, C[2] + 0.5); b.blocks.onDigStart(CH); b.blocks.onDig(true, ...C);
  await sleep(b.blocks.breakTime(CH) * 1000 + 150);
  b.blocks.onBroken(...C, CH); b.blocks.onDig(false, ...C);
  a.silence(LAG_MS);
  const broke = performance.now();
  let late = 0;
  for (let i = 0; i < LATE; i++) {
    const s = a.invc.box && a.invc.box.kind === 'chest' ? a.invc.box.s : null;
    if (!s) break;
    const j = s.findIndex(Boolean);
    if (j < 0) break;
    a.invc.send({ o: 'quick', v: [4, j], e: s[j]!.k }); late++;
    await sleep(LATE_MS);
  }
  await Promise.all([a.settle(), b.settle()]);
  await sleep(800);
  ctx.log(`Ada shift-clicked ${late} stacks after Bram's break left; her window closed ${endedAt ? ((endedAt - broke)).toFixed(0) : '-'} ms after it`);
  // the host's close carries the last op it had applied: every later one reached it with the chest gone
  const after = base + late - nullAck;
  ctx.check(nullAck >= base && after >= 3, `${after} of Ada's ${late} late ops reached the host after the chest was gone (it had applied up to ${nullAck - base} of them)`);
  ctx.check(ended === 1 && a.invc.box === null && stNull >= 1, `the host closed Ada's window (st box null ${stNull}, window gone ${a.invc.box === null})`);
  ctx.check(a.invc.inv.cursor === null, 'her cursor is empty');
  ctx.check(a.vox.getBlock(...C) === 0 && b.vox.getBlock(...C) === 0 && (await ctx.ent(0, ...C)) === null, 'the chest is gone on the host and for both');

  // the contents are on the ground as the only copies, and the chest itself as its block drops it
  const t1 = await totals(ctx);
  const want = { ...t0 };
  for (const [k, n] of Object.entries(chestDrop)) want[k] = (want[k] ?? 0) + n;
  ctx.check(diff(want, t1) === '', `every item is there once, with the chest's own drop: ${diff(want, t1) || text(t1)}`);
  const hp = (await ctx.players()).find((p) => p.name === 'Ada')!;
  ctx.check(diff(hp.items, packOf(a)) === '', `Ada's pack is what the host holds${diff(hp.items, packOf(a)) ? ` (${diff(hp.items, packOf(a))})` : ''}`);
  ctx.check((hp.items[onCursor.k] ?? 0) >= onCursor.n, `the ${onCursor.n} ${onCursor.k} from her cursor are in her pack (${hp.items[onCursor.k] ?? 0})`);

  // both walk over where it stood and pick everything up
  const keys = new Set([...STOCK.map(([k]) => k), ...Object.keys(chestDrop)]);
  const left = async (): Promise<number> => (await ctx.drops(0)).filter((d) => keys.has(d.k)).length;
  ctx.log(`${await left()} stacks lie on the ground`);
  await b.goto(C[0] + 0.5, C[2] + 0.5);
  await a.goto(C[0] + 0.5, C[2] + 1.5);
  for (let i = 0; i < 20 && (await left()) > 0; i++) await sleep(250);
  ctx.check((await left()) === 0, `nothing of it is left on the ground (${await left()})`);
  const t2 = await totals(ctx);
  ctx.check(diff(want, t2) === '', `and all of it is in the packs now: ${diff(want, t2) || 'the same totals'}`);
  for (const q of [a, b]) {
    const h = (await ctx.players()).find((p) => p.name === q.name)!;
    ctx.check(diff(h.items, packOf(q)) === '', `${q.name}'s pack is what the host holds`);
    ctx.check(q.counts.corrections === 0 && q.counts.rej === 0, `${q.name}: ${q.counts.corrections} corrections, ${q.counts.rej} rej`);
  }
}
