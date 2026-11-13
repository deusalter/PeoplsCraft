// The sim's side of a player's messages: the dig budget and the action credits, which fill in sim time so that the
// spacing of two arrivals never decides anything; placement against every body of the realm; what a refused edit or
// use answers; the viewers of a container; and the `st` that follows.
import assert from 'node:assert/strict';
import test from 'node:test';
import { B } from '../../src/data/blocks';
import { ITEMS, item } from '../../src/data/items';
import { DIG_R, type S2C, type S2COf } from '../../src/net/protocol';
import {
  ACT_SURPLUS, DIG_SURPLUS, USE_COST, actCost, breakBlock, digNeed, invOp, onAtk, onDig, onEdit, onFire, onItem, onOp, onTalk, onUse, stOf, tickCredits,
} from '../../src/sim/actions';
import type { Fx, Scope, Sink } from '../../src/sim/fx';
import { mobDist } from '../../src/sim/mobhit';
import type { SimPlayer } from '../../src/sim/player';
import type { RealmStore } from '../../src/sim/realm';
import { attackRate, breakTime, breakTimeMin } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';
import { arrive } from '../../src/sim/travel';
import type { ChunkSource } from '../../src/sim/chunksource';
import { MemStorage, type WorldRecord } from '../../src/sim/storage';
import { type BlockEnt, EditMaps } from '../../src/sim/voxels';

const GROUND = 64, STEP = 1 / 60;
/** The rules under test run on the flat store below: the sim's own chunks are given nothing to generate. */
const NO_SOURCE: ChunkSource = { request() {}, cancel() {}, poll: () => [], pending: 0, dispose() {} };
class Flat implements RealmStore {
  onChange: RealmStore['onChange'] = null;
  cells = new Map<string, number>(); ents = new Map<string, BlockEnt>();
  notReady = new Set<string>();
  getBlock(x: number, y: number, z: number): number { return this.cells.get(`${x},${y},${z}`) ?? (y >= 0 && y < GROUND ? B.stone : 0); }
  ready(x: number, z: number): boolean { return !this.notReady.has(`${x >> 4},${z >> 4}`); }
  topY(): number { return GROUND - 1; }
  biomeAt(): number { return 0; }
  setBlock(x: number, y: number, z: number, id: number): boolean { this.cells.set(`${x},${y},${z}`, id); return true; }
  getEnt(x: number, y: number, z: number): BlockEnt | null { return this.ents.get(`${x},${y},${z}`) ?? null; }
  setEnt(x: number, y: number, z: number, kind: string, data: unknown): BlockEnt { const e = { x, y, z, kind, data }; this.ents.set(`${x},${y},${z}`, e); return e; }
  removeEnt(x: number, y: number, z: number): void { this.ents.delete(`${x},${y},${z}`); }
  sky(): number { return 15; }
  block(): number { return 0; }
  chunkEnts(): null { return null; }
  areaReady(): boolean { return true; }
  touch(): void {}
}
const worldRecord = (): WorldRecord => ({
  format: 2, id: 'w', name: 'Test', seed: 7, seedText: '7', created: 0, played: 0, owner: 'local', palettes: [], names: {},
  state: { clock: 0.2, tick: 0, rnd: 12345, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [], worldSpawn: [0, 0], gates: [], summons: [], owed: {} },
});
interface Rig { sim: Sim; store: Flat; p: SimPlayer; q: SimPlayer; ev: [Scope, Fx][]; sent: [number, S2C][]; of(t: string): S2C[]; seq(): number; run(s: number, ...pl: SimPlayer[]): void }
function rig(): Rig {
  const store = new Flat(), ev: [Scope, Fx][] = [], sent: [number, S2C][] = [];
  const sink: Sink = { emit: (to, e) => { ev.push([to, e]); }, send: (slot, m) => { sent.push([slot, m]); }, broadcast: () => {} };
  const sim = new Sim(worldRecord(), { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, chunks: NO_SOURCE, edits: new EditMaps(new MemStorage(), []), store: () => store, log: () => {}, requestSave: () => {} });
  const live = (id: string, x: number): SimPlayer => {
    const pl = sim.join(id, id, null, false);
    pl.loading = false; pl.arriving = -1; pl.body.teleport(x, GROUND, 0.5); pl.stats.recompute(pl.inv);
    return pl;
  };
  const p = live('a', 0.5), q = live('b', 6.5);
  const r: Rig = {
    sim, store, p, q, ev, sent,
    of: (t) => sent.filter((s) => s[1].t === t).map((s) => s[1]),
    seq: () => p.ackSeq + 1,
    // sim time for the credits only: the world itself does not move in these tests
    run(s, ...pl) { const l = pl.length ? pl : [p]; for (let t = 0; t < s - 1e-9; t += STEP) { sim.tick++; for (const x of l) tickCredits(x, STEP); } },
  };
  return r;
}
const keyOf = (f: (d: ReturnType<typeof item>) => boolean): string => [...ITEMS.values()].find(f)!.key;
const PICK = keyOf((d) => d.tool?.kind === 'pick' && d.tool.power >= 1), SWORD = keyOf((d) => !!d.weapon && d.weapon.style === 'melee' && !d.tool);
const BOW = keyOf((d) => d.weapon?.style === 'ranged'), STAFF = keyOf((d) => d.weapon?.style === 'magic'), TOTEM = keyOf((d) => d.weapon?.style === 'summon');
const hold = (p: SimPlayer, k: string, n = 1, at = 0): void => { p.inv.slots[at] = { k, n }; p.inv.sel = at; p.inv.touch(); p.stats.recompute(p.inv); };

// ---- digging -----------------------------------------------------------------------------------------

test('a break is paid for from a budget that fills in sim time: an honest dig passes however its messages arrive', () => {
  const r = rig(), { sim, p } = r, x = 1, y = GROUND - 1, z = 0;
  hold(p, PICK);
  const bt = breakTimeMin(B.stone, p.inv, p.stats, p.modes), need = digNeed(bt);
  assert.ok(bt > 0.2 && need > 0);
  // the dig and the edit arrive together, before any time has passed: refused, and the client is told the truth
  onDig(sim, p, { t: 'dig', on: true, x, y, z });
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 0, x, y, z, id: B.stone }), false);
  assert.deepEqual((r.of('rej')[0] as S2COf<'rej'>).cells, [x, y, z, B.stone]);
  assert.equal(sim.refused.edit, 1);
  // the same pair a whole break time later, both in one segment: accepted
  onDig(sim, p, { t: 'dig', on: true, x, y, z });
  r.run(bt);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 0, x, y, z, id: B.stone }), true);
  assert.equal(r.store.getBlock(x, y, z), 0); assert.equal(p.dig, null);
  // a dig whose start was held back: the budget does not look at when the `dig` arrived
  r.run(bt);
  onDig(sim, p, { t: 'dig', on: true, x: 2, y, z });
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 0, x: 2, y, z, id: B.stone }), true, 'a dig held back by a whole break');
  // over any stretch, the time that passed plus DIG_SURPLUS: an idle minute does not buy a minute of breaks
  r.run(60);
  onDig(sim, p, { t: 'dig', on: true, x: 3, y, z });
  let n = 0;
  for (let i = 0; i < 20; i++) if (onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 0, x: 3 + i, y, z, id: B.stone })) n++;
  // with no dig set the budget stopped at the surplus itself
  assert.equal(n, Math.floor(DIG_SURPLUS / need + 1e-9), 'the surplus');
  assert.ok(n >= 1);
});

test('what a break needs is 0.8 of its break time less 0.1 s, never below nothing, over a surplus of 1 s', () => {
  const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
  assert.equal(DIG_SURPLUS, 1.0);
  assert.ok(near(digNeed(1), 0.7), `digNeed(1) = ${digNeed(1)}`);
  assert.ok(near(digNeed(2), 1.5), `digNeed(2) = ${digNeed(2)}`);
  assert.ok(near(digNeed(0.5), 0.3), `digNeed(0.5) = ${digNeed(0.5)}`);
  assert.equal(digNeed(0.125), 0); assert.equal(digNeed(0.05), 0); assert.equal(digNeed(0), 0);
  // the same numbers at the edit: with the credit set by hand, 0.8 * bt - 0.1 passes and a hair under it does not
  const r = rig(), { p } = r, y = GROUND - 1, z = 0;
  hold(p, PICK);
  const bt = breakTimeMin(B.stone, p.inv, p.stats, p.modes), exact = 0.8 * bt - 0.1;
  assert.ok(exact > 0.05, `the pick's break time ${bt} leaves room to test below it`);
  for (const [credit, ok] of [[0.6 * bt - 0.1, false], [exact - 0.01, false], [exact, true]] as const) {
    p.digCredit = credit;
    onDig(r.sim, p, { t: 'dig', on: true, x: 1, y, z });
    assert.equal(onEdit(r.sim, p, { t: 'edit', seq: r.seq(), k: 0, x: 1, y, z, id: B.stone }), ok, `credit ${credit} of a ${bt} s break`);
  }
  assert.ok(near(p.digCredit, 0), 'the accepted break spent exactly what it needed');
});

test('the dig is held to the fastest time the hand had during it, and to the ground and dry air', () => {
  const r = rig(), { sim, p } = r, x = 1, y = GROUND - 1, z = 0;
  hold(p, PICK, 1, 0); p.inv.slots[1] = { k: 'stick', n: 1 }; p.inv.touch();
  const fast = breakTimeMin(B.stone, p.inv, p.stats, p.modes);
  onDig(sim, p, { t: 'dig', on: true, x, y, z });
  // the pick is swapped out mid-dig: the slow hand does not raise what the dig needs
  onOp(sim, p, { t: 'op', seq: r.seq(), o: 'sel', i: 1 });
  assert.equal(p.dig!.bt, fast);
  r.run(fast);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 0, x, y, z, id: B.stone }), true);
  // the host's flags of the body are older than the client's: a dig finished in the air or under water costs what it would on dry ground
  p.body.onGround = false; p.body.headInWater = true;
  hold(p, PICK);
  assert.ok(breakTime(B.stone, p.inv, p.stats, p.modes, p.body) > 4 * fast);
  onDig(sim, p, { t: 'dig', on: true, x: 2, y, z });
  r.run(fast);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 0, x: 2, y, z, id: B.stone }), true);
});

test('others hear of a dig within DIG_R, the digger does not', () => {
  const r = rig(), { sim, p } = r;
  onDig(sim, p, { t: 'dig', on: true, x: 1, y: 63, z: 0 });
  onDig(sim, p, { t: 'dig', on: false, x: 1, y: 63, z: 0 });
  const dg = r.ev.filter((e) => e[1][0] === 'dg');
  assert.deepEqual(dg.map((e) => e[1]), [['dg', p.slot, true, 1, 63, 0], ['dg', p.slot, false, 1, 63, 0]]);
  for (const [to] of dg) assert.deepEqual(to, { dim: 0, x: 1.5, y: 63.5, z: 0.5, r: DIG_R, not: p.slot });
});

test('two players break the same block: one set of drops, and the second is told it is air', () => {
  const r = rig(), { sim, p, q } = r, x = 3, y = GROUND - 1, z = 0;
  for (const pl of [p, q]) { hold(pl, PICK); onDig(sim, pl, { t: 'dig', on: true, x, y, z }); }
  r.run(2, p, q);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: p.ackSeq + 1, k: 0, x, y, z, id: B.stone }), true);
  const drops = sim.realms[0].drops.alive;
  assert.equal(onEdit(sim, q, { t: 'edit', seq: q.ackSeq + 1, k: 0, x, y, z, id: B.stone }), false);
  assert.equal(sim.realms[0].drops.alive, drops, 'no second set of drops');
  const rej = r.sent.find((s) => s[0] === q.slot && s[1].t === 'rej')![1] as S2COf<'rej'>;
  assert.deepEqual(rej, { t: 'rej', seq: q.ackSeq, cells: [x, y, z, 0] });
});

test('an edit the host cannot judge is refused with no cells: not active, outside the build height, or in a chunk it does not hold', () => {
  const r = rig(), { sim, p, store } = r;
  hold(p, 'cobble', 10);
  store.notReady.add('0,0');
  onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 1, y: GROUND, z: 0, id: B.cobble });
  store.notReady.clear();
  onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 1, y: 0, z: 0, id: B.cobble });
  p.stalled = true;
  onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 1, y: GROUND, z: 0, id: B.cobble });
  assert.deepEqual(r.of('rej'), [{ t: 'rej', seq: 1, cells: [] }, { t: 'rej', seq: 2, cells: [] }, { t: 'rej', seq: 3, cells: [] }]);
  assert.equal(p.ackSeq, 3, 'each still moves the sequence'); assert.equal(p.inv.count('cobble'), 10);
  // and one out of reach is refused with the truth
  p.stalled = false;
  onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 12, y: GROUND, z: 0, id: B.cobble });
  assert.deepEqual((r.of('rej')[3] as S2COf<'rej'>).cells, [12, GROUND, 0, 0]);
});

// ---- placing -----------------------------------------------------------------------------------------

test('building under your own feet: a block goes in as soon as the body has cleared the cell, as the client sees it', () => {
  const r = rig(), { sim, p } = r, b = p.body;
  hold(p, 'cobble', 10);
  // pillar jump: the cell under the feet, the body rising through it
  for (const [y, want] of [[GROUND + 0.5, false], [GROUND + 0.94, false], [GROUND + 0.96, true]] as const) {
    b.teleport(0.5, y, 0.5);
    assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 0, y: GROUND, z: 0, id: B.cobble }), want, `feet at ${y}`);
  }
  assert.equal(r.store.getBlock(0, GROUND, 0), B.cobble); assert.equal(p.inv.count('cobble'), 9);
  // back-fill: the body walks out of a cell and the cell is filled behind it
  b.teleport(2.5, GROUND, 0.5); r.store.setBlock(1, GROUND - 1, 0, 0);
  b.teleport(0.77, GROUND - 1, 0.5);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 1, y: GROUND - 1, z: 0, id: B.cobble }), false, 'still inside by 0.07');
  b.teleport(0.74, GROUND - 1, 0.5);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 1, y: GROUND - 1, z: 0, id: B.cobble }), true, 'inside by 0.04, which the shrink allows');
});

test('a solid block is refused where any body of the realm stands, whatever that player is doing', () => {
  const r = rig(), { sim, p, q } = r;
  hold(p, 'cobble', 10);
  q.body.teleport(3.5, GROUND, 0.5);
  for (const state of ['active', 'loading', 'stalled', 'lingering', 'dead'] as const) {
    q.loading = state === 'loading'; q.stalled = state === 'stalled'; q.stats.dead = state === 'dead';
    q.online = state !== 'lingering'; q.lingerT = state === 'lingering' ? 20 : 0;
    assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 3, y: GROUND + 1, z: 0, id: B.cobble }), false, state);
  }
  // another body is drawn in by 0.1: a block that touches it by less goes in
  q.body.teleport(3.99, GROUND, 0.5);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 3, y: GROUND, z: 0, id: B.cobble }), false, 'by 0.31');
  q.body.teleport(4.22, GROUND, 0.5);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 3, y: GROUND, z: 0, id: B.cobble }), true, 'by 0.08');
  // a torch is not solid: bodies do not stop it
  q.body.teleport(2.5, GROUND, 0.5); hold(p, 'torch', 4);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x: 2, y: GROUND, z: 0, id: B.torch }), true);
});

test('a placement needs the held block, a cell that takes it and something to hold it up', () => {
  const r = rig(), { sim, p, store } = r;
  hold(p, 'cobble', 10);
  const place = (x: number, y: number, id = B.cobble): boolean => onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 1, x, y, z: 0, id });
  assert.equal(place(1, GROUND + 3), false, 'in the air with nothing round it');
  store.setBlock(1, GROUND + 2, 0, B.cobble);
  assert.equal(place(1, GROUND + 3), true, 'on top of a block');
  assert.equal(place(1, GROUND + 3), false, 'the cell is taken');
  assert.equal(place(2, GROUND, B.oak_planks), false, 'not what is held');
  store.setBlock(-1, GROUND + 4, 0, B.tall_grass);
  assert.equal(place(-1, GROUND + 4), true, 'into tall grass, which holds itself');
  store.setBlock(2, GROUND + 4, 0, B.water);
  assert.equal(place(2, GROUND + 4), false, 'into water with nothing round it');
  assert.equal(p.inv.count('cobble'), 8);
  assert.ok(sim.flags.has('place:cobble'));
  // the rej carries what the cell holds
  const rej = r.of('rej').at(-1) as S2COf<'rej'>;
  assert.deepEqual(rej.cells, [2, GROUND + 4, 0, B.water]);
  // creative keeps the stack
  p.modes.creative = true;
  assert.equal(place(3, GROUND), true); assert.equal(p.inv.count('cobble'), 8);
});

test('a door stands on solid ground with room for both halves, and a refusal sends both cells back', () => {
  const r = rig(), { sim, p, store } = r;
  hold(p, 'door', 2);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 2, x: 1, y: GROUND, z: 0, id: B.door_x }), true);
  assert.deepEqual([store.getBlock(1, GROUND, 0), store.getBlock(1, GROUND + 1, 0)], [B.door_x, B.door_x]);
  store.setBlock(2, GROUND + 1, 0, B.cobble);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 2, x: 2, y: GROUND, z: 0, id: B.door_z }), false);
  assert.deepEqual((r.of('rej')[0] as S2COf<'rej'>).cells, [2, GROUND, 0, 0, 2, GROUND + 1, 0, B.cobble]);
  assert.equal(onEdit(sim, p, { t: 'edit', seq: r.seq(), k: 2, x: 3, y: GROUND, z: 0, id: B.door_x_open }), false, 'only a shut door is placed');
  assert.equal(p.inv.count('door'), 1);
});

// ---- use, talk, item ----------------------------------------------------------------------------------

test('use opens a station on the host and makes the player its viewer; a wrong block, a far one or nothing to do is refused', () => {
  const r = rig(), { sim, p, store } = r;
  store.setBlock(2, GROUND, 0, B.workbench); store.setBlock(1, GROUND, 0, B.cobble);
  assert.equal(onUse(sim, p, { t: 'use', seq: r.seq(), x: 2, y: GROUND, z: 0, id: B.anvil }), false);
  assert.equal(onUse(sim, p, { t: 'use', seq: r.seq(), x: 1, y: GROUND, z: 0, id: B.cobble }), false, 'a block with no use');
  store.setBlock(14, GROUND, 0, B.workbench);
  assert.equal(onUse(sim, p, { t: 'use', seq: r.seq(), x: 14, y: GROUND, z: 0, id: B.workbench }), false, 'out of reach');
  assert.deepEqual(r.of('rej').map((m) => (m as S2COf<'rej'>).cells), [[2, GROUND, 0, B.workbench], [1, GROUND, 0, B.cobble], [14, GROUND, 0, B.workbench]]);
  assert.equal(p.window, null);
  assert.equal(onUse(sim, p, { t: 'use', seq: r.seq(), x: 2, y: GROUND, z: 0, id: B.workbench }), true);
  assert.deepEqual([r.p.window?.mode, r.p.window?.station], ['station', 'workbench']);
  assert.deepEqual([...sim.realms[0].viewers.get(`2,${GROUND},0`)!], [p]);
  // a chest: the contents first, then the window
  store.setBlock(-2, GROUND, 0, B.chest);
  r.sent.length = 0;
  assert.equal(onUse(sim, p, { t: 'use', seq: r.seq(), x: -2, y: GROUND, z: 0, id: B.chest }), true);
  assert.deepEqual(r.sent.map((s) => s[1].t), ['st', 'open']);
  assert.equal((r.sent[0][1] as S2COf<'st'>).box?.kind, 'chest');
  assert.equal(sim.realms[0].viewers.has(`2,${GROUND},0`), false, 'the station is left'); assert.ok(sim.realms[0].viewers.get(`-2,${GROUND},0`)!.has(p));
});

test('every viewer of a container is sent its new contents when one of them changes it', () => {
  const r = rig(), { sim, p, q, store } = r;
  store.setBlock(3, GROUND, 0, B.chest);
  q.body.teleport(4.5, GROUND, 0.5);
  onUse(sim, p, { t: 'use', seq: r.seq(), x: 3, y: GROUND, z: 0, id: B.chest });
  onUse(sim, q, { t: 'use', seq: q.ackSeq + 1, x: 3, y: GROUND, z: 0, id: B.chest });
  p.inv.slots[2] = { k: 'stick', n: 4 }; stOf(sim, p); stOf(sim, q);
  assert.equal(q.invDirty, false);
  assert.equal(onOp(sim, p, { t: 'op', seq: r.seq(), o: 'quick', v: [0, 2], e: 'stick' }).ok, true);
  assert.equal(q.invDirty, true);
  const st = stOf(sim, q)!;
  assert.deepEqual(st.box, { kind: 'chest', x: 3, y: GROUND, z: 0, s: [['stick', 4], ...new Array(26).fill(0)] });
  assert.equal(st.inv, undefined, 'its own pack did not change');
  // breaking the chest ends both windows before the stacks are spilled
  hold(p, keyOf((d) => d.tool?.kind === 'axe'));
  breakBlock(sim, p, 3, GROUND, 0, B.chest);
  assert.equal(p.window, null); assert.equal(q.window, null);
  assert.equal(sim.realms[0].viewers.size, 0);
});

test('talk opens the shop of a townsperson within reach of the eye, and nobody else\'s', () => {
  const r = rig(), { sim, p } = r, realm = sim.realms[0];
  const npc = realm.mobs.spawn('n_wayfinder', 0.5, GROUND + 4.4, 3.2)!, foe = realm.mobs.spawn('gloomshade', 0.5, GROUND, 2)!;
  assert.ok(mobDist(npc, 0.5, GROUND + p.body.eye, 0.5) < 5, 'above the player, as a ray from the eye reaches it');
  assert.equal(onTalk(sim, p, { t: 'talk', id: foe.id }), false);
  assert.equal(onTalk(sim, p, { t: 'talk', id: npc.id }), true);
  assert.deepEqual([p.window?.mode, p.window?.npc, p.window?.mob], ['shop', 'wayfinder', npc.id]);
  assert.deepEqual(r.sent.map((s) => s[1].t), ['st', 'open']);
  p.window = null;
  npc.z = 9;
  assert.equal(onTalk(sim, p, { t: 'talk', id: npc.id }), false, 'too far');
});

test('a townsperson whose shop is open stands to trade: the shop stays open however long the player browses', () => {
  const r = rig(), { sim, p, q } = r, realm = sim.realms[0];
  p.local = true; q.local = true;
  // at the edge of talking reach, home a little further out: its walks would take it past the shop's 7 blocks
  const npc = realm.mobs.spawn('n_wayfinder', 0.5, GROUND, 4.5)!;
  npc.home = [0, GROUND, 6];
  assert.equal(onTalk(sim, p, { t: 'talk', id: npc.id }), true);
  let far = 0;
  for (let i = 0; i < 60 * 60; i++) {
    sim.step();
    if (Math.hypot(npc.x - 0.5, npc.z - 4.5) > 0.5) far++;
    if (!p.window) break;
  }
  assert.equal(p.window?.mode, 'shop', 'still open after a minute');
  assert.equal(far, 0, 'and its townsperson did not wander off');
  // the shop ended, the townsperson goes about its day again
  invOp(sim, p, p.ackSeq, { o: 'close' });
  for (let i = 0; i < 60 * 60; i++) sim.step();
  assert.ok(Math.hypot(npc.x - 0.5, npc.z - 4.5) > 0.5, 'walks once nobody is trading');
});

test('a bed set by a use reaches its player in the stats that follows the acknowledgement, in the same step', () => {
  const r = rig(), { sim, p, store } = r;
  for (const x of [1, 2, -1, -2]) store.setBlock(x, GROUND, 0, B.bedroll);
  for (let i = 0; i < 20; i++) sim.step();
  // every phase of the four-a-second look: none of them may hold the bed back
  for (let k = 0; k < 15; k++) {
    for (let i = 0; i < k; i++) sim.step();
    // a body that sent no move for a second is stalled; this one is taken to keep sending them
    p.lastMoveTick = sim.tick; p.stalled = false;
    const x = [1, 2, -1, -2][k % 4];
    r.sent.length = 0;
    assert.equal(onUse(sim, p, { t: 'use', seq: r.seq(), x, y: GROUND, z: 0, id: B.bedroll }), true, `use at phase ${k}`);
    sim.step();
    const mine = r.sent.filter((s) => s[0] === p.slot).map((s) => s[1]);
    const st = mine.findIndex((m) => m.t === 'st'), stats = mine.findIndex((m) => m.t === 'stats');
    assert.ok(st >= 0 && (mine[st] as S2COf<'st'>).ack === p.ackSeq, `the acknowledgement at phase ${k}`);
    assert.ok(stats > st, `a stats after it at phase ${k}`);
    assert.deepEqual((mine[stats] as S2COf<'stats'>).bed, [x, GROUND, 0]);
  }
});

test('a consumable draws on the use credit: one per 0.35 s, bunched by up to ACT_SURPLUS', () => {
  const r = rig(), { sim, p } = r;
  hold(p, 'apple', 20, 3); p.stats.hunger = 2;
  r.run(10);
  let n = 0;
  for (let i = 0; i < 6; i++) if (onItem(sim, p, { t: 'item', seq: r.seq(), slot: 3 }) === 2) n++;
  assert.equal(n, Math.floor((ACT_SURPLUS + USE_COST) / USE_COST + 1e-9), 'the surplus, bunched');
  r.run(USE_COST);
  assert.equal(onItem(sim, p, { t: 'item', seq: r.seq(), slot: 3 }), 2, 'and one more after its cooldown');
  assert.equal(p.inv.count('apple'), 20 - n - 1);
  assert.equal(onItem(sim, p, { t: 'item', seq: r.seq(), slot: 9 }), 0, 'an empty slot');
});

// ---- fighting ------------------------------------------------------------------------------------------

test('melee: swings at the weapon\'s rate pass however they bunch, a burst beyond the surplus does not, and switching weapons gains nothing', () => {
  const r = rig(), { sim, p } = r, realm = sim.realms[0];
  hold(p, SWORD);
  const m = realm.mobs.spawn('gloomshade', 2.5, GROUND, 0.5)!;
  m.hp = m.maxHp = 1e9;
  const cost = 1 / attackRate(p.inv, p.stats), swing = (): boolean => onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] });
  assert.equal(actCost(p), cost);
  // steady at the weapon's rate for 5 s: every one accepted
  r.run(cost);
  let ok = 0;
  for (let i = 0; i < Math.round(5 / cost); i++) { if (swing()) ok++; r.run(cost); }
  assert.equal(ok, Math.round(5 / cost));
  // a stalled segment delivers three at once: all accepted when they fit the surplus
  r.run(3 * cost);
  ok = 0; for (let i = 0; i < 3; i++) if (swing()) ok++;
  assert.equal(ok, Math.min(3, Math.floor((ACT_SURPLUS + cost) / cost + 1e-9)));
  // ten at once after a long wait: the credit holds only the surplus and one swing
  r.run(30);
  ok = 0; for (let i = 0; i < 10; i++) if (swing()) ok++;
  assert.equal(ok, Math.floor((ACT_SURPLUS + cost) / cost + 1e-9));
  const refused = sim.refused.atk;
  assert.ok(refused > 0);
  // a faster weapon costs its own cooldown: swapping to it after slow swings buys no extra ones
  r.run(30);
  const fist = (): void => { p.inv.slots[0] = null; p.inv.touch(); p.stats.recompute(p.inv); };
  fist();
  ok = 0; for (let i = 0; i < 10; i++) if (swing()) ok++;
  assert.equal(ok, Math.floor((ACT_SURPLUS + actCost(p)) / actCost(p) + 1e-9));
});

test('melee reach: the nearest hit volume from the eye, widened by the creature\'s speed over half the round trip', () => {
  const r = rig(), { sim, p } = r, realm = sim.realms[0];
  hold(p, SWORD); r.run(100);
  const m = realm.mobs.spawn('gloomshade', 0.5, GROUND, 0.5)!;
  m.hp = m.maxHp = 1e9;
  const eye = (): number => mobDist(m, p.body.x, p.body.y + p.body.eye, p.body.z);
  const lim = (): number => 3.3 + p.stats.d.reach * 0.5 + 1.0 + Math.min(20, Math.max(Math.hypot(m.vx, m.vy, m.vz), m.def.speed)) * (p.rtt / 2 + 0.15);
  m.x = 0.5 + lim() + m.hw - 0.05; assert.ok(eye() < lim());
  assert.equal(onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] }), true);
  r.run(1);
  m.x += 0.2; assert.ok(eye() > lim());
  assert.equal(onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] }), false, 'beyond');
  p.rtt = 0.3;
  assert.equal(onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] }), true, 'with a round trip of 300 ms it is in reach');
  // townsfolk and minions are not struck, nor anything with a bow in hand
  r.run(1);
  const npc = realm.mobs.spawn('n_wayfinder', 1.5, GROUND, 0.5)!;
  assert.equal(onAtk(sim, p, { t: 'atk', id: npc.id, d: [1, 0, 0] }), false);
  hold(p, BOW);
  assert.equal(onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] }), false);
});

test('a shot: on the same credit, an arrow used, from the client\'s eye when it is near the stored one, with its seq and the lead', () => {
  const r = rig(), { sim, p } = r, realm = sim.realms[0];
  hold(p, BOW); p.inv.slots[5] = { k: 'arrow', n: 3 }; p.inv.touch(); p.rtt = 0.1;
  const fire = (o: [number, number, number]): number => onFire(sim, p, { t: 'fire', seq: r.seq(), o, d: [0, 0, 1] });
  const eye: [number, number, number] = [p.body.x, p.body.y + p.body.eye, p.body.z];
  assert.equal(fire(eye), 0, 'no credit yet'); assert.equal(sim.refused.fire, 1);
  assert.equal(p.inv.count('arrow'), 3, 'a refused shot spends no arrow');
  r.run(5);
  const seq = r.seq();
  assert.equal(fire([eye[0] + 1, eye[1], eye[2]]), 1);
  const shot = realm.proj.list.find((x) => x.active)!;
  assert.equal(shot.cseq, seq); assert.equal(shot.by, p.id);
  assert.ok(Math.abs(shot.x - (eye[0] + 1)) < 1e-6, 'from the client\'s eye, 1 block off');
  // flown ahead by min(rtt / 2, 0.15) before anyone hears of it
  const sp = item(BOW).weapon!.projSpeed!;
  assert.ok(shot.z - eye[2] > 0.4 + sp * 0.05 * 0.9, `led by half the round trip (${shot.z - eye[2]})`);
  assert.equal(p.inv.count('arrow'), 2); assert.equal(p.ackSeq, seq);
  shot.active = false;
  r.run(5);
  assert.equal(fire([eye[0] + 5, eye[1], eye[2]]), 1);
  const s2 = realm.proj.list.find((x) => x.active)!;
  assert.ok(Math.abs(s2.x - eye[0]) < 1e-6, 'from the stored eye when the claimed one is 5 blocks off');
  // out of arrows: refused; a staff without mana: refused; a totem costs 0.6
  p.inv.slots[5] = null; p.inv.touch(); r.run(5);
  assert.equal(fire(eye), 2);
  hold(p, STAFF); p.stats.mana = 0; r.run(5);
  assert.equal(fire(eye), 3);
  hold(p, TOTEM);
  assert.equal(actCost(p), 0.6);
  // a melee weapon does not fire
  hold(p, SWORD);
  assert.equal(fire(eye), 0);
});

test('credits fill only while the step gives them time, each to its own cap', () => {
  const r = rig(), { p } = r;
  hold(p, SWORD);
  r.run(100);
  assert.ok(Math.abs(p.actCredit - (ACT_SURPLUS + actCost(p))) < 1e-9);
  assert.ok(Math.abs(p.useCredit - (ACT_SURPLUS + USE_COST)) < 1e-9);
  assert.ok(Math.abs(p.digCredit - DIG_SURPLUS) < 1e-9, 'no dig: the surplus alone');
  p.dig = { x: 0, y: 0, z: 0, id: B.stone, bt: 2, t0: 0 };
  r.run(100);
  assert.ok(Math.abs(p.digCredit - (DIG_SURPLUS + digNeed(2))) < 1e-9);
});

test('a player comes into play with the credits of one who stood idle: the first swing and the first meal pass', () => {
  const r = rig(), { sim } = r, realm = sim.realms[0];
  const take = (pl: SimPlayer): void => { pl.clientReady = true; arrive(sim, pl); assert.equal(pl.loading, false, 'in play'); };
  const p = sim.join('c', 'c', null, false);
  hold(p, SWORD); hold(p, 'apple', 5, 3); p.inv.sel = 0; p.stats.hunger = 2;
  take(p);
  const m = realm.mobs.spawn('gloomshade', p.body.x + 2, p.body.y, p.body.z)!;
  m.hp = m.maxHp = 1e9;
  assert.equal(onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] }), true, 'a swing on arrival');
  assert.equal(onItem(sim, p, { t: 'item', seq: p.ackSeq + 1, slot: 3 }), 2, 'a meal on arrival');
  // taken over by a new connection whose client starts with no cooldown: the same again
  p.actCredit = p.useCredit = 0;
  sim.resume(p);
  take(p);
  assert.equal(onAtk(sim, p, { t: 'atk', id: m.id, d: [1, 0, 0] }), true, 'a swing after a takeover');
  assert.equal(onItem(sim, p, { t: 'item', seq: p.ackSeq + 1, slot: 3 }), 2, 'a meal after a takeover');
});

// ---- the state that follows ------------------------------------------------------------------------------

test('st: the ack always, the inventory and the box only where they changed, null when nothing is new', () => {
  const r = rig(), { sim, p, store } = r;
  const first = stOf(sim, p, true)!;
  assert.ok(first.inv); assert.equal(first.box, undefined);
  assert.equal(stOf(sim, p), null, 'nothing new');
  // a refused op moves only the ack
  onOp(sim, p, { t: 'op', seq: r.seq(), o: 'click', v: [0, 0], r: false, e: 'stick' });
  assert.deepEqual(stOf(sim, p), { t: 'st', ack: 1 });
  p.inv.coins = 9;
  assert.equal(stOf(sim, p)!.inv!.coins, 9);
  // a station sends no box (a null would close the one the client opened itself); its end says null like any other
  store.setBlock(1, GROUND, 0, B.workbench);
  onUse(sim, p, { t: 'use', seq: r.seq(), x: 1, y: GROUND, z: 0, id: B.workbench });
  assert.deepEqual(stOf(sim, p), { t: 'st', ack: 2 });
  onOp(sim, p, { t: 'op', seq: r.seq(), o: 'close' });
  assert.deepEqual(stOf(sim, p), { t: 'st', ack: 3, box: null });
  // a forge: its box, then null when it closes
  store.setBlock(-1, GROUND, 0, B.furnace);
  onUse(sim, p, { t: 'use', seq: r.seq(), x: -1, y: GROUND, z: 0, id: B.furnace });
  const opened = r.sent.filter((s) => s[1].t === 'st').at(-1)![1] as S2COf<'st'>;
  assert.equal(opened.box?.kind, 'forge');
  assert.equal(stOf(sim, p), null, 'already told');
  invOp(sim, p, r.seq(), { o: 'close' });
  assert.deepEqual(stOf(sim, p), { t: 'st', ack: 5, box: null });
});
