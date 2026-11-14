// Scenario embed (9, "A body inside a block"; 11: a wall is built through a logged-off bot and a door is shut on a
// standing one: each walks out with at most one `tp`). First, with Ada's link just gone, Bram cannot put a block where
// she stands: a lingering body still counts. Then she says goodbye, Bram builds a wall through the spot, and when she
// joins again the host puts her beside it before she is in play. Last, Bram stands in a doorway and Ada shuts the door
// on him; he walks out through it.
import type { S2COf } from '../../src/net/protocol';
import { playerIdOf } from '../../src/sim/identity';
import { bodyFree } from '../../src/sim/rules';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { sleep } from './arena';
import { blockId, calm, pad } from './site';

const BUILD = 'oak_planks';

export default async function embed(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  const ida = playerIdOf(a.token)!;
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  const { px, pz, g } = await pad(ctx, a, 9, 8);
  const P = blockId(BUILD), DOOR = blockId('door_x'), OPEN = blockId('door_x_open');
  const me = async (id: string): Promise<HostPlayer | undefined> => (await ctx.players()).find((p) => p.id === id);
  // a wall of stone 7 wide across z = pz + 5 with a doorway in the middle, its door open
  const dz = pz + 5;
  ctx.check((await a.cmd(`fill ${px - 3} ${g + 1} ${dz} ${px + 3} ${g + 3} ${dz} stone`)) === 'filled', 'a wall with a doorway');
  await a.wait(300);
  ctx.check((await a.cmd(`fill ${px} ${g + 1} ${dz} ${px} ${g + 2} ${dz} door_x_open`)) === 'filled', 'an open door in it');
  await a.wait(300);
  ctx.check((await b.cmd(`give ${BUILD} 16`)).startsWith('gave'), 'Bram is given planks');
  await Promise.all([a.goto(px + 0.5, pz + 0.5), b.goto(px + 0.5, pz + 2.5)]);
  await Promise.all([a.settle(), b.settle()]);
  const spot = { x: a.body.x, y: a.body.y, z: a.body.z };
  ctx.log(`Ada stands at ${spot.x.toFixed(2)} ${spot.y.toFixed(2)} ${spot.z.toFixed(2)}`);

  // ---- her link goes: she lingers, and her body still keeps a block out ----
  const feet: [number, number, number] = [px, g + 1, pz];
  a.close();
  await b.until(() => !b.players.has(a.slot), 5000, 'Ada gone from the snapshots');
  ctx.check((await me(ida))?.state === 'lingering', `the host holds Ada as lingering (${(await me(ida))?.state})`);
  const rej0 = b.counts.rejCells;
  // his own client does not see her any more, so it lets him try
  await b.place(...feet, BUILD);
  ctx.check(b.counts.rejCells === rej0 + 1 && b.vox.getBlock(...feet) === 0, `the host refused it, and it is air for him again (${b.counts.rejCells - rej0} rej)`);

  // ---- she comes back for a moment and says goodbye: parked, and out of the realm's bodies ----
  const a2 = ctx.bot(new Bot('Ada', a.token));
  await a2.connect(ctx.url);
  await a2.loaded();
  ctx.check(Math.hypot(a2.body.x - spot.x, a2.body.z - spot.z) < 0.1, 'back inside the grace, she stands where she was');
  a2.send({ t: 'bye' });
  await sleep(500);
  a2.close();
  const parked = await me(ida);
  ctx.check(!parked || parked.state === 'parked', `after her goodbye the host has her ${parked ? parked.state : 'saved and gone from memory'}`);

  // ---- Bram builds a wall 3 wide and 3 high through where she stood ----
  let placed = 0;
  for (let y = g + 1; y <= g + 3; y++) for (const x of [px - 1, px, px + 1]) {
    await b.place(x, y, pz, BUILD);
    await b.until(() => b.vox.predicted() === 0, 3000, 'the answer');
    if (b.vox.getBlock(x, y, pz) === P) placed++;
  }
  await b.settle();
  ctx.check(placed === 9 && b.counts.rejCells === rej0 + 1, `Bram built all 9 blocks of the wall (${placed}), none refused`);
  ctx.check(!bodyFree(b.vox, spot.x, spot.y, spot.z), 'the wall stands through the spot where she logged off');

  // ---- she joins again: the host moves her beside the wall before she is in play ----
  const a3 = ctx.bot(new Bot('Ada', a.token));
  const tps: S2COf<'tp'>[] = [];
  await a3.connect(ctx.url);
  // the welcome is not a tp; what moves her after it is
  a3.on('tp', (m) => tps.push(m));
  const welcomedAt = { x: a3.body.x, y: a3.body.y, z: a3.body.z };
  await a3.loaded();
  await sleep(600);
  ctx.log(`welcomed at ${welcomedAt.x.toFixed(2)} ${welcomedAt.y.toFixed(2)} ${welcomedAt.z.toFixed(2)}, in play at ${a3.body.x.toFixed(2)} ${a3.body.y.toFixed(2)} ${a3.body.z.toFixed(2)}`);
  ctx.check(tps.length <= 1, `she was sent ${tps.length} tp (${tps.map((t) => `${t.x.toFixed(2)} ${t.y.toFixed(2)} ${t.z.toFixed(2)}${t.load ? ' load' : ''}`).join(', ')})`);
  ctx.check(bodyFree(a3.vox, a3.body.x, a3.body.y, a3.body.z) && Math.hypot(a3.body.x - spot.x, a3.body.z - spot.z) < 2.5, `she stands free beside the wall (${Math.hypot(a3.body.x - spot.x, a3.body.z - spot.z).toFixed(2)} blocks from her spot)`);
  const h3 = await me(ida);
  ctx.check(!!h3 && h3.state === 'active' && Math.hypot(h3.x - a3.body.x, h3.y - a3.body.y, h3.z - a3.body.z) < 0.05, `the host has her active where she stands (${h3?.state})`);
  await a3.goto(px - 2.5, pz + 2.5);
  await a3.settle();
  ctx.check(a3.counts.corrections === 0 && Math.hypot(a3.body.x - (px - 2.5), a3.body.z - (pz + 2.5)) < 0.5, `she walks off (${a3.counts.corrections} corrections)`);

  // ---- a door shut on Bram as he stands in the doorway ----
  await b.goto(px + 0.7, dz + 0.5);
  await b.settle();
  const inDoor = Math.floor(b.body.x) === px && Math.floor(b.body.z) === dz;
  ctx.check(inDoor, `Bram stands in the doorway (${b.body.x.toFixed(2)} ${b.body.z.toFixed(2)})`);
  const btps: S2COf<'tp'>[] = [];
  b.on('tp', (m) => btps.push(m));
  const corr0 = b.counts.corrections;
  await a3.use(px, g + 1, dz);
  await b.until(() => b.vox.getBlock(px, g + 1, dz) === DOOR && b.vox.getBlock(px, g + 2, dz) === DOOR, 3000, 'the shut door');
  ctx.check(a3.vox.getBlock(px, g + 1, dz) === DOOR && b.vox.getBlock(px, g + 2, dz) === DOOR && OPEN !== DOOR, 'Ada shut the door; both see it shut');
  ctx.check(!bodyFree(b.vox, b.body.x, b.body.y, b.body.z), 'the door closes through Bram');
  // he stands a moment, as someone does who has just been shut in, then walks out the way he came
  await sleep(1000);
  await b.goto(px + 0.5, dz - 2.5);
  await b.settle();
  await sleep(1000);
  ctx.check(btps.length <= 1, `Bram was sent ${btps.length} tp on his way out (${b.counts.corrections - corr0} corrections)`);
  ctx.check(bodyFree(b.vox, b.body.x, b.body.y, b.body.z) && b.body.z < dz - 1, `he is out of the doorway (${b.body.x.toFixed(2)} ${b.body.y.toFixed(2)} ${b.body.z.toFixed(2)})`);
  const hb = (await ctx.players()).find((p) => p.name === 'Bram')!;
  ctx.check(hb.state === 'active' && Math.hypot(hb.x - b.body.x, hb.z - b.body.z) < 0.05, `the host has him where he stands (${hb.x.toFixed(2)} ${hb.z.toFixed(2)})`);
  await b.goto(px + 2.5, dz - 2.5);
  ctx.check(b.counts.corrections === corr0, `he walks on freely (${b.counts.corrections - corr0} corrections)`);

  const cx = px >> 4, cz = pz >> 4, host = await ctx.hash(0, cx - 1, cz - 1, cx + 1, cz + 1);
  let same = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = `${cx + i},${cz + j}`, ha = a3.chunkHash(cx + i, cz + j), hbh = b.chunkHash(cx + i, cz + j);
    if (ha !== null && ha === hbh && ha === host[k]) same++; else ctx.log(`chunk ${k}: Ada ${ha}, Bram ${hbh}, host ${host[k]}`);
  }
  ctx.check(same === 9, `chunkHash equal on both bots and the host for ${same} of 9 chunks`);
}
