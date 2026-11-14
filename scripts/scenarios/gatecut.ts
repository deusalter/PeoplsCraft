// Scenario gatecut (9, "A gate that is no longer what the records say"; 11: the arrival gate is mined out: the next
// traveller stands on solid ground). Ada crosses into the Hollows through a gate on a pad, steps off the arrival gate
// `land()` raised for her, and mines out its frame and the sill in front of it; in its own realm the sheet stays, as it
// does today. The first frame block she breaks takes the gate out of the registry. Then Bram crosses from the same
// Overworld gate: his `land()` must not send him to where that gate stood, and he stands on solid ground at a new gate.
import { B, T_SOLID } from '../../src/data/blocks';
import { item } from '../../src/data/items';
import { gateStand } from '../../src/sim/gates';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';
import { sleep } from './arena';
import { calm, countNear, pad, sameWorld, setGate, walkInto } from './site';

export default async function gatecut(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  ctx.check((await a.cmd('gear 5')).endsWith('kit'), 'Ada has a pickaxe that cuts gate frame');
  const { px, pz, g } = await pad(ctx, a, 8, 9);
  const gz = pz + 4;
  await setGate(ctx, a, 'hollow_gate_kit', px, g + 1, gz, true);
  await a.until(() => a.vox.getBlock(px, g + 2, gz) === B.hollow_portal, 5000, 'the gate');
  await Promise.all([a.goto(px + 0.5, gz - 1.5), b.goto(px + 1.5, gz - 2.5)]);

  // ---- Ada crosses, and steps off the arrival gate onto a floor laid in front of it ----
  walkInto(a, px + 0.5, gz + 0.5);
  await a.until(() => a.dim === 1 && a.ready, 40000, 'the crossing');
  await sleep(800);
  const reg = (await ctx.shared()).gates.filter((q) => q.dim === 1);
  ctx.check(reg.length === 1, `her arrival gate is in the registry (${reg.length})`);
  if (reg.length !== 1) throw new Error('no arrival gate');
  const gate = reg[0], st = gateStand(gate), y0 = gate.y;
  ctx.log(`arrival gate at ${gate.x} ${gate.y} ${gate.z}; Ada at ${a.body.x.toFixed(2)} ${a.body.y.toFixed(2)} ${a.body.z.toFixed(2)}`);
  ctx.check(Math.hypot(a.body.x - (st[0] + 0.5), a.body.z - (st[2] + 0.5)) < 0.5, 'Ada stands at it');
  // a floor at the sill's height from 2 to 5 blocks in front of the gate, with room over it, clear of the gate's cells
  for (const [y1, y2, k] of [[y0 - 2, y0, 'gloomstone'], [y0 + 1, y0 + 5, 'air']] as const) {
    ctx.check((await a.cmd(`fill ${gate.x - 3} ${y1} ${gate.z + 2} ${gate.x + 4} ${y2} ${gate.z + 5} ${k}`)) === 'filled', `a floor of ${k} in front of the gate`);
    await a.wait(300);
  }
  await a.until(() => a.vox.getBlock(gate.x + 4, y0, gate.z + 5) === B.gloomstone, 5000, 'the floor');
  await a.goto(gate.x + 0.5, gate.z + 3.5);
  ctx.check((await ctx.shared()).gates.filter((q) => q.dim === 1).length === 1, 'the floor changed none of the gate\'s cells: still registered');

  // ---- she mines out the frame (14 blocks) and the sill (4) ----
  const frame: [number, number, number][] = [], sill: [number, number, number][] = [];
  for (let i = -1; i <= 2; i++) for (let h = 0; h <= 4; h++) if (i === -1 || i === 2 || h === 0 || h === 4) frame.push([gate.x + i, y0 + h, gate.z]);
  for (let i = -1; i <= 2; i++) sill.push([gate.x + i, y0, gate.z + 1]);
  // the pickaxe in hand: auto-tool keeps whatever is held when it is not a tool, and a flower picked up on the pad may be
  const pick = a.invc.inv.slots.slice(0, 9).findIndex((q) => !!q && item(q.k).tool?.kind === 'pick');
  if (pick < 0) throw new Error('no pickaxe in the hotbar');
  a.invc.setSel(pick);
  await a.settle();
  let firstGone = -1, mined = 0;
  for (const c of [...frame, ...sill]) {
    if (a.vox.getBlock(...c) === 0) continue;
    await a.mine(...c);
    if (a.vox.getBlock(...c) === 0) mined++;
    if (firstGone < 0) firstGone = (await ctx.shared()).gates.filter((q) => q.dim === 1).length;
  }
  await a.settle();
  ctx.check(mined === frame.length + sill.length, `Ada mined out the ${frame.length} frame and ${sill.length} sill blocks (${mined} of ${frame.length + sill.length})`);
  ctx.check(firstGone === 0, `the first frame block she broke took the gate out of the registry (${firstGone} left)`);
  ctx.check(countNear(a, B.hollow_frame, gate.x, y0 + 2, gate.z, 3, 3) === 0 && countNear(a, B.hollow_portal, gate.x, y0 + 2, gate.z, 3, 3) === 6, 'no frame is left; the sheet hangs where it was, as an arrival gate\'s does');
  ctx.check(!T_SOLID[a.vox.getBlock(st[0], st[1] - 1, st[2])], 'where an arrival there would stand there is nothing underfoot');

  // ---- Bram crosses from the same Overworld gate ----
  walkInto(b, px + 1.5, gz + 0.5);
  await b.until(() => b.dim === 1 && b.ready, 40000, 'Bram\'s crossing');
  const arrived = { x: b.body.x, y: b.body.y, z: b.body.z };
  await sleep(2000);
  ctx.log(`Bram arrives at ${arrived.x.toFixed(2)} ${arrived.y.toFixed(2)} ${arrived.z.toFixed(2)}; 2 s later at ${b.body.x.toFixed(2)} ${b.body.y.toFixed(2)} ${b.body.z.toFixed(2)}`);
  const under = b.vox.getBlock(Math.floor(b.body.x), Math.round(b.body.y) - 1, Math.floor(b.body.z));
  ctx.check(b.body.onGround && T_SOLID[under] === 1 && Math.abs(b.body.y - Math.round(b.body.y)) < 0.01, `Bram stands on solid ground (${under ? 'block ' + under : 'air'} under his feet)`);
  ctx.check(Math.abs(b.body.y - arrived.y) < 0.1, `he did not fall (${(arrived.y - b.body.y).toFixed(2)} blocks down since he arrived)`);
  const now = (await ctx.shared()).gates.filter((q) => q.dim === 1);
  ctx.check(now.length === 1 && (now[0].x !== gate.x || now[0].y !== gate.y || now[0].z !== gate.z), `a new arrival gate was raised for him and registered (${now.map((q) => `${q.x} ${q.y} ${q.z}`).join(', ')})`);
  if (now.length === 1) {
    const s2 = gateStand(now[0]);
    ctx.check(Math.hypot(b.body.x - (s2[0] + 0.5), b.body.z - (s2[2] + 0.5)) < 0.5, 'he stands at it');
    ctx.check(countNear(b, B.hollow_frame, now[0].x, now[0].y + 2, now[0].z, 3, 3) === 14, 'its frame is whole');
  }
  const hb = (await ctx.players()).find((p) => p.name === 'Bram')!;
  ctx.check(hb.dim === 1 && hb.state === 'active' && Math.abs(hb.y - b.body.y) < 0.05, `the host has him in play where he stands (y ${hb.y.toFixed(2)})`);
  ctx.check((await sameWorld(ctx, [a, b], 1, b.body.x, b.body.z)) === 9, 'both bots and the host hold the same 9 chunks round him');
  for (const q of [a, b]) ctx.check(q.counts.corrections === 0 && q.counts.rej === 0 && q.counts.deaths === 0 && q.counts.hurt === 0, `${q.name}: ${q.counts.corrections} corrections, ${q.counts.rej} rej, ${q.counts.hurt} blows, ${q.counts.deaths} deaths`);
}
