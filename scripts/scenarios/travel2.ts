// Scenario travel2 (9, "Two players travelling between realms at once"; 11: one gate at the destination). Ada sets a
// Hollow Gate on a pad; she and Bram walk into its sheet side by side in the same moment and cross together. Each
// crossing is the player's own, and the second `land()` finds the gate the first one raised: in the Hollows there is one
// gate, both stand at it, and the registry holds one entry. Then both walk back through it and come out where they went
// in, at the gate they left by.
import { B } from '../../src/data/blocks';
import { gateStand } from '../../src/sim/gates';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { sleep } from './arena';
import { calm, countNear, pad, sameWorld, setGate, walkInto } from './site';

/** A gate's cells: 6 of sheet and 14 of frame. */
const SHEET = 6, FRAME = 14;

export default async function travel2(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  const { px, pz, g } = await pad(ctx, a, 8, 9);

  // the gate along x, 4 blocks south: its sheet is x = px and px + 1, from g + 2 to g + 4, at z = gz
  const gz = pz + 4;
  await setGate(ctx, a, 'hollow_gate_kit', px, g + 1, gz, true);
  await a.until(() => a.vox.getBlock(px, g + 2, gz) === B.hollow_portal, 5000, 'the gate').catch(() => {});
  ctx.check(countNear(a, B.hollow_portal, px, g + 3, gz, 4, 4) === SHEET && countNear(a, B.hollow_frame, px, g + 3, gz, 4, 4) === FRAME, 'Ada raised a Hollow Gate on the pad');
  await Promise.all([a.goto(px + 0.5, gz - 1.5), b.goto(px + 1.5, gz - 1.5)]);
  await Promise.all([a.settle(), b.settle()]);
  const before = (await ctx.shared()).gates.length;

  // side by side into the sheet, in the same moment
  const inA = { x: px + 0.5, z: gz + 0.5 }, inB = { x: px + 1.5, z: gz + 0.5 };
  walkInto(a, inA.x, inA.z); walkInto(b, inB.x, inB.z);
  await Promise.all([a, b].map((q) => q.until(() => q.dim === 1 && q.ready, 40000, 'the crossing')));
  await sleep(1000);
  ctx.log(`in the Hollows: Ada at ${a.body.x.toFixed(2)} ${a.body.y.toFixed(2)} ${a.body.z.toFixed(2)}, Bram at ${b.body.x.toFixed(2)} ${b.body.y.toFixed(2)} ${b.body.z.toFixed(2)}`);
  const hp = await ctx.players();
  ctx.check(hp.every((p) => p.dim === 1 && p.state === 'active'), `the host has both in the Hollows and in play (${hp.map((p) => `${p.name} ${p.dim} ${p.state}`).join(', ')})`);

  const gates = (await ctx.shared()).gates.filter((q) => q.dim === 1 && q.kind === 1);
  ctx.check(gates.length === 1 && (await ctx.shared()).gates.length === before + 1, `the registry holds one gate in the Hollows (${gates.length}; ${before} anywhere before the crossing)`);
  if (gates.length !== 1) throw new Error('no single arrival gate');
  const gate = gates[0], st = gateStand(gate);
  for (const q of [a, b]) {
    const sheet = countNear(q, B.hollow_portal, q.body.x, q.body.y, q.body.z, 24, 24), frame = countNear(q, B.hollow_frame, q.body.x, q.body.y, q.body.z, 24, 24);
    ctx.check(sheet === SHEET && frame === FRAME, `${q.name} sees one gate within 24 blocks: ${sheet} sheet and ${frame} frame blocks`);
    ctx.check(Math.hypot(q.body.x - (st[0] + 0.5), q.body.z - (st[2] + 0.5)) < 0.5 && Math.abs(q.body.y - st[1]) < 0.1 && q.body.onGround, `${q.name} stands at that gate, on its sill (${q.body.x.toFixed(2)} ${q.body.y.toFixed(2)} ${q.body.z.toFixed(2)})`);
  }
  ctx.check((await sameWorld(ctx, [a, b], 1, st[0], st[2])) === 9, 'both bots and the host hold the same 9 chunks round the gate');

  // and back: each walks into its column of the sheet and comes out of the Overworld gate where it went in
  await b.goto(st[0] + 1.5, st[2] + 0.5);
  await Promise.all([a.settle(), b.settle()]);
  await sleep(500);
  walkInto(a, st[0] + 0.5, gate.z + 0.5); walkInto(b, st[0] + 1.5, gate.z + 0.5);
  await Promise.all([a, b].map((q) => q.until(() => q.dim === 0 && q.ready, 40000, 'the way back')));
  await sleep(1000);
  for (const [q, at] of [[a, inA], [b, inB]] as const) {
    const d = Math.hypot(q.body.x - at.x, q.body.z - at.z);
    ctx.check(d < 1 && Math.abs(q.body.y - (g + 2)) < 0.2, `${q.name} is back in the Overworld gate where ${q === a ? 'she' : 'he'} went in (${d.toFixed(2)} off, y ${q.body.y.toFixed(2)})`);
  }
  ctx.check(countNear(a, B.hollow_portal, px, g + 3, gz, 24, 12) === SHEET, 'the Overworld still has its one gate there');
  ctx.check((await ctx.shared()).gates.filter((q) => q.dim === 1).length === 1, 'and the Hollows still one in the registry');
  const hp2 = await ctx.players();
  ctx.check(hp2.every((p) => p.dim === 0 && p.state === 'active'), `the host has both back in the Overworld (${hp2.map((p) => `${p.name} ${p.dim} ${p.state}`).join(', ')})`);
  ctx.check((await sameWorld(ctx, [a, b], 0, px, gz)) === 9, 'both bots and the host hold the same 9 chunks round the Overworld gate');
  for (const q of [a, b]) ctx.check(q.counts.corrections === 0 && q.counts.rej === 0 && q.counts.deaths === 0, `${q.name}: ${q.counts.corrections} corrections, ${q.counts.rej} rej, ${q.counts.deaths} deaths`);
}
