// Scenario latejoin (9, "Joining late"; 11). Ada and Bram make a world worth joining: a quest three steps on, two flags
// that unlock tiers, a raid under way at night, and a base of stone laid under the 81 chunks round the world spawn.
// Three Kantak wait at the spot where every newcomer lands, and the two of them stand 60 blocks off. Cyd joins: his
// welcome carries the clock, flags, quest index, event and roster the host holds; the host makes him at the world spawn,
// level 1, with nothing in his pack. He holds his `ready` back for 6 s: loading, he is no target, and nothing hurts him.
// Meanwhile the base reaches him as `ce`, nearest chunks first and in messages of at most 32 KB. Once he says `ready`
// he lands, is in play, and the Kantak find him. His copy of the base hashes as the host's.
import { BLOCKS, T_SOLID } from '../../src/data/blocks';
import { CE_BYTES, type CeEntry, type S2COf } from '../../src/net/protocol';
import { playerIdOf } from '../../src/sim/identity';
import { Bot } from '../bot/bot';
import type { Ctx, HostPlayer } from '../bot/runner';
import { fills, held, sleep } from './arena';
import { calm } from './site';

/** The base covers the chunks within BASE of the world spawn's chunk; Cyd keeps those within VIEW. */
const BASE = 4, VIEW = 7;
const HOLD_MS = 6000;
const cheb = (ax: number, az: number, bx: number, bz: number): number => Math.max(Math.abs(ax - bx), Math.abs(az - bz));

export default async function latejoin(ctx: Ctx): Promise<void> {
  const a = ctx.bot(new Bot('Ada')), b = ctx.bot(new Bot('Bram'));
  await Promise.all([a.connect(ctx.url), b.connect(ctx.url)]);
  await Promise.all([a.loaded(), b.loaded()]);
  await calm(ctx, [a, b]);
  const sh0 = await ctx.shared(), ws = sh0.spawn;
  const land = { x: a.body.x, y: a.body.y, z: a.body.z };
  ctx.log(`world spawn ${ws[0]} ${ws[1]}; Ada landed at ${land.x.toFixed(1)} ${land.y.toFixed(1)} ${land.z.toFixed(1)}`);

  // ---- what the group has done: three quest steps, two tier flags, a raid at night ----
  ctx.check((await a.cmd('give oak_log 4')).startsWith('gave'), 'Ada holds 4 logs (the first step)');
  await a.wait(1200);
  ctx.check((await a.cmd('flag craft:workbench')) === 'flag set' && (await a.cmd('flag craft:wood_pickaxe')) === 'flag set', 'the workbench and the wooden pick are made (the next two)');
  ctx.check((await b.cmd('flag craft:anvil')) === 'flag set' && (await b.cmd('flag dim:1')) === 'flag set', 'the anvil is made and the Hollows seen (tiers the group unlocked)');
  await a.wait(1500);
  ctx.check((await ctx.shared()).quest >= 3, `the shared quest stands at ${(await ctx.shared()).quest}`);
  ctx.check((await a.cmd('time night')) === 'time set', 'night');
  await a.wait(300);
  ctx.check((await a.cmd('event raid')) === 'event started', 'a raid gathers');

  // ---- the base: stone under the 81 chunks round the spawn, so that each has an edit set worth sending ----
  const scx = Math.floor(ws[0]) >> 4, scz = Math.floor(ws[1]) >> 4, g = Math.round(land.y) - 1;
  const x0 = (scx - BASE) * 16, x1 = (scx + BASE) * 16 + 15, z0 = (scz - BASE) * 16, z1 = (scz + BASE) * 16 + 15;
  await held(ctx, x0, z0, x1, z1);
  const rows: [number, number, number, number, number, number, string][] = [];
  for (let i = -BASE; i <= BASE; i++) rows.push([(scx + i) * 16, g - 30, z0, (scx + i) * 16 + 15, g - 8, z1, 'stone']);
  await fills(ctx, a, rows);
  await a.wait(500);
  const baseHash = await ctx.hash(0, scx - BASE, scz - BASE, scx + BASE, scz + BASE);
  ctx.check(Object.values(baseHash).every((h) => h !== '-'), `the host holds all ${Object.keys(baseHash).length} chunks of the base`);

  // ---- three Kantak where newcomers land; Ada and Bram go 60 blocks east ----
  await a.cmd('clearmobs');
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3]]) {
    await a.wait(250);
    ctx.check((await a.cmd(`spawnat thornling ${(land.x + dx).toFixed(1)} ${land.y.toFixed(1)} ${(land.z + dz).toFixed(1)}`)) === 'spawned', `a Kantak ${Math.hypot(dx, dz)} blocks from the landing`);
  }
  for (const q of [a, b]) {
    await q.wait(250);
    // creative: the fall onto unknown ground does not hurt
    ctx.check((await q.cmd('creative')) === 'creative true', `${q.name} is creative`);
    ctx.check((await q.cmd(`tp ${land.x + 60} ${land.y + 40} ${land.z + (q === a ? 0 : 2)}`)) === 'teleported', `${q.name} goes 60 blocks east`);
  }
  await sleep(1500);
  const sh = await ctx.shared(), before = await ctx.players();

  // ---- Cyd joins ----
  const c = ctx.bot(new Bot('Cyd')), idc = playerIdOf(c.token)!;
  c.radius = VIEW; c.holdReady = true;
  let welcome: S2COf<'welcome'> | null = null;
  const ces: { t: number; l: CeEntry[] }[] = [];
  const t0 = performance.now();
  const joining = c.connect(ctx.url, undefined, 8);
  c.on('welcome', (m) => { welcome = m; });
  c.on('ce', (m) => { ces.push({ t: performance.now() - t0, l: m.l }); });
  await joining;
  const w = welcome as S2COf<'welcome'> | null;
  if (!w) throw new Error('no welcome');
  ctx.check(w.pos[0] === ws[0] + 0.5 && w.pos[2] === ws[1] + 0.5, `Cyd is made at the world spawn (${w.pos[0]} ${w.pos[2]}, spawn ${ws[0]} ${ws[1]})`);
  ctx.check(Math.abs(w.clock - sh.clock) < 0.003, `his welcome carries the clock (${w.clock.toFixed(4)}, host ${sh.clock.toFixed(4)})`);
  ctx.check(sh.flags.every((f) => w.flags.includes(f)) && ['craft:anvil', 'dim:1', 'craft:workbench'].every((f) => w.flags.includes(f)), `the group's flags (${w.flags.length}: ${w.flags.join(' ')})`);
  ctx.check(w.quest === sh.quest, `the quest index (${w.quest}, host ${sh.quest})`);
  ctx.check(w.event.a === 'raid' && w.event.a === sh.event.a && w.event.g === sh.event.g, `the event (${w.event.a} ${w.event.k}/${w.event.g})`);
  ctx.check(['Ada', 'Bram'].every((n) => w.players.some((p) => p.name === n)), `the roster (${w.players.map((p) => p.name).join(', ')})`);
  const me = async (): Promise<HostPlayer | undefined> => (await ctx.players()).find((p) => p.id === idc);
  const p0 = await me();
  ctx.check(!!p0 && p0.level === 1 && Object.keys(p0.items).length === 0 && p0.coins === 0, `the host made him at level ${p0?.level} with an empty pack (${JSON.stringify(p0?.items)})`);
  ctx.check(before.every((q) => q.name !== 'Cyd'), 'he was never in the host\'s memory before');

  // ---- loading, held for 6 s: no target, unhurt ----
  const states = new Set<string>();
  let hpMin = p0?.hp ?? -1, near = 0;
  while (performance.now() - t0 < HOLD_MS) {
    const p = await me(), mobs = (await ctx.mobs(0)).filter((m) => m.key === 'thornling');
    if (p) { states.add(p.state); hpMin = Math.min(hpMin, p.hp); }
    near = Math.max(near, mobs.filter((m) => Math.hypot(m.x - land.x, m.z - land.z) < 10).length);
    await sleep(250);
  }
  ctx.check(states.size === 1 && states.has('loading'), `for ${HOLD_MS / 1000} s the host has him loading (${[...states].join(', ')})`);
  ctx.check(near === 3, `the Kantak are at the landing meanwhile (${near} within 10 blocks)`);
  ctx.check(c.counts.hurt === 0 && hpMin === p0?.hp, `nothing hurt him while he loaded (${c.counts.hurt} blows, health ${p0?.hp} and lowest ${hpMin})`);

  // ---- the base came nearest first, paced ----
  const pcx = Math.floor(w.pos[0]) >> 4, pcz = Math.floor(w.pos[2]) >> 4;
  const first = new Map<string, { d: number; i: number; rev: number }>();
  let i = 0;
  for (const m of ces) for (const e of m.l) { const k = `${e[0]},${e[1]}`; if (!first.has(k)) first.set(k, { d: cheb(e[0], e[1], pcx, pcz), i: i++, rev: e[3] }); }
  const lastNear = Math.max(...[...first.values()].filter((v) => v.d <= 2).map((v) => v.i)), firstFar = Math.min(...[...first.values()].filter((v) => v.d >= 5).map((v) => v.i));
  ctx.check([...first.values()].filter((v) => v.d <= 2).length === 25 && lastNear < firstFar, `the 25 chunks round him came before any chunk 5 or more away (last near entry ${lastNear}, first far ${firstFar}, of ${first.size})`);
  let inversions = 0, maxD = 0;
  for (const v of [...first.values()].sort((x, y) => x.i - y.i)) { if (v.d < maxD - 1) inversions++; maxD = Math.max(maxD, v.d); }
  ctx.check(inversions === 0, `no chunk came after one more than a ring farther (${inversions})`);
  const based = [...first.entries()].filter(([k]) => { const [x, z] = k.split(',').map(Number); return cheb(x, z, scx, scz) <= BASE; });
  ctx.check(based.length === (2 * BASE + 1) ** 2 && based.every(([, v]) => v.rev > 0), `every chunk of the base came with its edits (${based.filter(([, v]) => v.rev > 0).length} of ${(2 * BASE + 1) ** 2})`);
  const sizes = ces.map((m) => m.l.reduce((s, e) => s + (e.length > 6 ? (e[6] as string).length : 0), 0));
  const over = ces.filter((m, k) => sizes[k] > CE_BYTES && m.l.length > 1).length;
  ctx.check(ces.length > 2 && over === 0, `paced: ${ces.length} ce messages, none over ${CE_BYTES / 1024} KB of data unless it held one chunk (largest ${(Math.max(...sizes) / 1024).toFixed(1)} KB, ${(sizes.reduce((s, n) => s + n, 0) / 1024).toFixed(0)} KB in all, the last ${ces.at(-1)!.t.toFixed(0)} ms after the dial)`);

  // ---- he says ready: lands, is in play, and is fair game ----
  const hurt0 = c.counts.hurt;
  c.holdReady = false;
  await c.loaded();
  const tIn = performance.now();
  ctx.check(Math.hypot(c.body.x - (ws[0] + 0.5), c.body.z - (ws[1] + 0.5)) < 6 && T_SOLID[c.vox.getBlock(Math.floor(c.body.x), Math.round(c.body.y) - 1, Math.floor(c.body.z))] === 1,
    `he lands at the world spawn (${c.body.x.toFixed(1)} ${c.body.y.toFixed(1)} ${c.body.z.toFixed(1)})`);
  for (let k = 0; k < 10 && (await me())?.state !== 'active'; k++) await sleep(200);
  ctx.check((await me())?.state === 'active', `the host has him in play (${(await me())?.state})`);
  await c.until(() => c.counts.hurt > hurt0, 20000, 'a Kantak\'s blow').catch(() => {});
  ctx.check(c.counts.hurt > hurt0, `in play, the Kantak find him: hurt ${((performance.now() - tIn) / 1000).toFixed(1)} s after he landed`);
  await c.cmd('god on');
  await c.cmd('clearmobs');

  // ---- his world is the host's ----
  const look: [number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) look.push([pcx + dx, pcz + dz]);
  look.push([scx - BASE, scz - BASE], [scx + BASE, scz + BASE], [scx - BASE, scz + BASE], [scx + BASE, scz - BASE]);
  await c.until(() => look.every(([x, z]) => c.chunkHash(x, z) !== null), 60000, 'his chunks').catch(() => {});
  const hh = await ctx.hash(0, scx - BASE, scz - BASE, scx + BASE, scz + BASE);
  const same = look.filter(([x, z]) => c.chunkHash(x, z) === hh[`${x},${z}`]);
  for (const [x, z] of look) if (c.chunkHash(x, z) !== hh[`${x},${z}`]) ctx.log(`chunk ${x},${z}: Cyd ${c.chunkHash(x, z)}, host ${hh[`${x},${z}`]}`);
  ctx.check(same.length === look.length, `his copy of the base hashes as the host's: ${same.length} of ${look.length} chunks (the 9 round him and the 4 corners)`);
  const S = BLOCKS.findIndex((q) => q.key === 'stone');
  ctx.check(c.vox.getBlock((scx + BASE) * 16 + 8, g - 20, (scz + BASE) * 16 + 8) === S, 'and he has the base\'s stone 4 chunks off');
  for (const q of [a, b, c]) ctx.check(q.counts.rej === 0, `${q.name}: ${q.counts.rej} rej`);
}
