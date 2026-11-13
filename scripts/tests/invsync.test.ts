// The inventory channel end to end: a client's InvSync sends ops as `op` messages, the sim's handlers carry them out on
// the state it holds and answer with `st`, and the messages each way are held back, bunched and let through at random.
// Whatever the timing, the client's view ends as the host's state, the arrays the windows hold are never replaced, a
// refused op is undone, and a container that ends on the host ends on the client.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mulberry32 } from '../../src/core/noise';
import { B } from '../../src/data/blocks';
import { ITEMS, type Item, MOD_BY_KEY, item } from '../../src/data/items';
import { NPCS } from '../../src/data/npcs';
import { RECIPES } from '../../src/data/recipes';
import { type InvSync as Sync, InvSync, type ViewBox, chestWire, forgeWire, invWire, shopWire } from '../../src/net/invsync';
import type { BoxWire, C2S, S2C, S2COf, WireOp } from '../../src/net/protocol';
import { boxOf, endWindow, invOp, onOp, onTalk, onUse, revalidate, stOf } from '../../src/sim/actions';
import type { Fx, Scope, Sink } from '../../src/sim/fx';
import { Inventory, type Slot, canAfford, recipeFits } from '../../src/sim/inventory';
import type { InvOp, SlotRef } from '../../src/sim/invops';
import { type SimPlayer, toRecord } from '../../src/sim/player';
import type { RealmStore } from '../../src/sim/realm';
import { goods } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';
import { PlayerStats } from '../../src/sim/stats';
import type { ChunkSource } from '../../src/sim/chunksource';
import { MemStorage, type WorldRecord } from '../../src/sim/storage';
import type { EditHost, Ghosts } from '../../src/client/api';
import { Combat, type CombatView, type HandMob } from '../../src/client/combat';
import { InvClient } from '../../src/client/invclient';
import { Session } from '../../src/client/session';
import type { Transport } from '../../src/net/transport';
import { encodeSnapshot } from '../../src/net/snapshot';
import { type EventWire, SELF_DEAD } from '../../src/net/protocol';
import { eventLabel, eventProgress, moonTint } from '../../src/client/invclient';
import { Player } from '../../src/player/player';
import { newRayHit } from '../../src/sim/physics';
import { type BlockEnt, EditMaps } from '../../src/sim/voxels';

const GROUND = 64;
/** The rules under test run on the flat store below: the sim's own chunks are given nothing to generate. */
const NO_SOURCE: ChunkSource = { request() {}, cancel() {}, poll: () => [], pending: 0, dispose() {} };
class Flat implements RealmStore {
  onChange: RealmStore['onChange'] = null;
  cells = new Map<string, number>(); ents = new Map<string, BlockEnt>();
  getBlock(x: number, y: number, z: number): number { return this.cells.get(`${x},${y},${z}`) ?? (y >= 0 && y < GROUND ? B.stone : 0); }
  ready(): boolean { return true; }
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
const CHEST: [number, number, number] = [2, 64, 0], FORGE: [number, number, number] = [-2, 64, 0], BENCH: [number, number, number] = [0, 64, 2], ANVIL: [number, number, number] = [0, 64, -2];

/** One host with player `p` (the one with a client) and `q` (a second player at the same chest), and the two queues. */
interface Rig {
  sim: Sim; store: Flat; p: SimPlayer; q: SimPlayer; sync: Sync; npc: number;
  /** A client of the second player as well, for the tests that race two of them. */
  qsync: Sync; qup: C2S[]; qdown: S2C[];
  up: C2S[]; down: S2C[]; thrown: Map<string, number>; ended: number;
  /** Ops the host carried out and refused, by name. */
  tally: Map<string, [number, number]>;
  /** Host: take `n` messages off the client's queue, then send what the tick owes. */
  serve(n?: number): void;
  /** Client: take `n` messages off the host's queue. */
  deliver(n?: number): void;
  flush(): void;
  /** Host: everything the client has sent, and nothing delivered back. */
  flushUp(): void;
  /** Gather what was thrown on the ground into the tally, so that the drop pool never gives a stack up. */
  harvest(): void;
}
function rig(seed = 1): Rig {
  const store = new Flat(), up: C2S[] = [], down: S2C[] = [];
  let pSlot = -1, qSlot = -1;
  const qup: C2S[] = [], qdown: S2C[] = [];
  const sink: Sink = { emit: (_to: Scope, _e: Fx) => {}, send: (slot, m) => { if (slot === pSlot) down.push(m); else if (slot === qSlot) qdown.push(m); }, broadcast: () => {} };
  const sim = new Sim({ ...worldRecord(), seed }, { cheats: true, maxPlayers: 8, solo: false, manual: true }, { sink, chunks: NO_SOURCE, edits: new EditMaps(new MemStorage(), []), store: () => store, log: () => {}, requestSave: () => {} });
  store.setBlock(...CHEST, B.chest); store.setEnt(...CHEST, 'chest', { s: new Array(27).fill(null), loot: null });
  store.setBlock(...FORGE, B.furnace); store.setBlock(...BENCH, B.workbench); store.setBlock(...ANVIL, B.anvil);
  const live = (id: string): SimPlayer => {
    const pl = sim.join(id, id, null, false);
    pl.loading = false; pl.arriving = -1; pl.body.teleport(0.5, GROUND, 0.5); pl.stats.recompute(pl.inv);
    return pl;
  };
  const p = live('a'), q = live('b'); pSlot = p.slot; qSlot = q.slot;
  const npc = sim.realms[0].mobs.spawn('n_wayfinder', 0.5, GROUND, -3.5)!;
  const thrown = new Map<string, number>();
  const vinv = new Inventory(), vstats = new PlayerStats();
  const sync = new InvSync(vinv, vstats, { send: (seq, op) => { up.push({ t: 'op', seq, ...op } as C2S); }, flags: () => sim.flags, creative: () => p.modes.creative });
  const qsync = new InvSync(new Inventory(), new PlayerStats(), { send: (seq, op) => { qup.push({ t: 'op', seq, ...op } as C2S); }, flags: () => sim.flags, creative: () => false });
  const handle = (pl: SimPlayer, m: C2S): void => {
    if (m.t === 'op') { const t = r.tally.get(m.o) ?? [0, 0]; t[onOp(sim, pl, m).ok ? 0 : 1]++; r.tally.set(m.o, t); } else if (m.t === 'use') onUse(sim, pl, m); else if (m.t === 'talk') onTalk(sim, pl, m);
    r.harvest();
  };
  const hear = (sy: Sync, l: S2C[], n: number): void => { while (n-- > 0 && l.length) { const m = l.shift()!; if (m.t === 'st') sy.onSt(m); else if (m.t === 'rej') sy.onRej(m.seq); } };
  const r: Rig = {
    sim, store, p, q, sync, npc: npc.id, up, down, thrown, ended: 0, tally: new Map(), qsync, qup, qdown,
    serve(n = Infinity) {
      while (n-- > 0 && up.length) handle(p, up.shift()!);
      while (qup.length) handle(q, qup.shift()!);
      for (const pl of [p, q]) if (pl.invDirty) { const st = stOf(sim, pl); if (st) (pl === p ? down : qdown).push(st); }
    },
    deliver(n = Infinity) { hear(sync, down, n); hear(qsync, qdown, Infinity); },
    flushUp() { r.serve(); },
    flush() { for (let i = 0; i < 50 && (up.length || down.length || qup.length || qdown.length); i++) { r.serve(); r.deliver(); } },
    harvest() {
      const d = sim.realms[0].drops;
      for (const x of d.list) if (x.active) thrown.set(x.it.k, (thrown.get(x.it.k) ?? 0) + x.it.n);
      d.clear();
    },
  };
  sync.onEnded = () => { r.ended++; };
  // the welcome's first state
  sync.onSt(stOf(sim, p, true)!); qsync.onSt(stOf(sim, q, true)!);
  return r;
}
const viewBoxWire = (v: ViewBox | null): BoxWire | null => !v ? null : v.kind === 'chest' ? chestWire(v.x, v.y, v.z, v.s) : v.kind === 'forge' ? forgeWire(v.x, v.y, v.z, v.data) : shopWire(v.npc, v.sold);
/** The view as the host would put it on the wire, beside the host's own state. */
function views(r: Rig): [unknown, unknown] {
  const v = r.sync.view, p = r.p, w = v.window, pw = p.window;
  return [
    [invWire(v.inv, v.stats, 0), viewBoxWire(v.box), w && [w.mode, w.station ?? '', w.npc ?? '', !!w.covered]],
    [invWire(p.inv, p.stats, 0), boxOf(r.sim, p), pw && [pw.mode, pw.station ?? '', pw.npc ?? '', !!pw.covered]],
  ];
}
function same(r: Rig, msg: string): void { const [a, b] = views(r); assert.deepEqual(a, b, msg); }

// ---- the long run -----------------------------------------------------------------------------------

/** Every op that may travel. */
const WIRE_OPS = ['sel', 'click', 'place', 'gather', 'quick', 'out', 'lay', 'book', 'hotkey', 'dropSlot', 'dropCur', 'dropHeld', 'sort', 'takeAll', 'stash',
  'buy', 'buyBack', 'spend', 'pick', 'tidy', 'close'] as const;
const WEIGHT: Partial<Record<(typeof WIRE_OPS)[number], number>> = { click: 22, place: 8, quick: 12, hotkey: 6, book: 6, lay: 4, out: 6, gather: 3, buy: 3, sel: 4, tidy: 0.6, close: 0.4 };
/** Ops whose totals change by definition: crafting, trade, and a creative pick (each checked op by op in invops.test.ts). */
const MAKES = new Set(['out', 'book', 'buy', 'buyBack', 'pick']);

test('a client and the host driven by one stream of 20,000 ops, with acknowledgements held back and bunched, end alike, and nothing is made or lost', (t) => {
  const r = rig(31), { sim, p, q, sync } = r, view = sync.view, realm = sim.realms[0];
  const rnd = mulberry32(20261112), ri = (n: number): number => Math.floor(rnd() * n), chance = (x: number): boolean => rnd() < x;
  const pick = <T>(l: readonly T[]): T => l[ri(l.length)];
  const keys = [...ITEMS.keys()], mats = ['oak_log', 'oak_planks', 'stick', 'cobble', 'coal', 'iron_ore', 'iron_bar', 'fiber', 'flint', 'feather', 'torch', 'arrow', 'hide', 'stone'];
  const mods = [...MOD_BY_KEY.keys()], wear = keys.filter((k) => item(k).armor || item(k).acc || (item(k).weapon && !item(k).tool));
  const bag: [string, number][] = WIRE_OPS.map((o) => [o, WEIGHT[o] ?? 2]), total = bag.reduce((n, b) => n + b[1], 0);
  const chest = (): Slot[] => r.store.getEnt(...CHEST)!.data.s, forge = (): Slot[] | null => r.store.getEnt(...FORGE)?.data.s ?? null;

  // ---- the ledger: everything both players hold, both containers, and what lies on the ground
  const totals = (): Map<string, number> => {
    const m = new Map<string, number>(), add = (x: Slot): void => { if (x) m.set(x.k, (m.get(x.k) ?? 0) + x.n); };
    for (const pl of [p, q]) { const i = pl.inv; for (const a of [i.slots, i.armor, i.acc, i.craft]) a.forEach(add); add(i.cursor); m.set('$coins', (m.get('$coins') ?? 0) + i.coins); }
    chest().forEach(add); forge()?.forEach(add);
    for (const [k, n] of r.thrown) m.set(k, (m.get(k) ?? 0) + n);
    return m;
  };
  const delta = (a: Map<string, number>, b: Map<string, number>): [string, number][] => {
    const out: [string, number][] = [];
    for (const k of new Set([...a.keys(), ...b.keys()])) { const d = (b.get(k) ?? 0) - (a.get(k) ?? 0); if (d) out.push([k, d]); }
    return out;
  };
  // the host carries out each message under the ledger's eye
  const serve = r.serve;
  r.serve = (n = Infinity) => {
    while (n-- > 0 && r.up.length) {
      const m = r.up[0], before = totals(), shop = p.window?.mode === 'shop' && !p.window.covered;
      serve(1);
      const free = m.t === 'op' && (MAKES.has(m.o) || (shop && m.o === 'quick'));
      if (!free) assert.deepEqual(delta(before, totals()), [], `host: ${JSON.stringify(m)} made or lost something`);
    }
    serve(0);
  };

  // ---- the client's ops, made from what it sees, as a window would make them
  const vat = (v: SlotRef): Slot => ([view.inv.slots, view.inv.armor, view.inv.acc, view.inv.craft, view.box?.kind === 'chest' ? view.box.s : view.box?.kind === 'forge' ? view.box.data.s : []][v[0]] ?? [])[v[1]] ?? null;
  const ref = (): SlotRef => { const c = pick([0, 0, 0, 0, 1, 2, 3, 3, 4, 4, 4]); return [c as SlotRef[0], ri([36, 3, 5, 9, view.box?.kind === 'forge' ? 3 : 27][c])]; };
  const seen = (v: SlotRef): string => (chance(0.04) ? pick(['', 'cobble', 'stick']) : vat(v)?.k ?? '');
  const make = (): InvOp => {
    let x = rnd() * total, o: string = WIRE_OPS[0];
    for (const [k, w] of bag) { x -= w; if (x <= 0) { o = k; break; } }
    const v = ref(), w = view.window && !view.window.covered ? view.window : null, inv = view.inv;
    switch (o) {
      case 'sel': return { o, i: ri(9) };
      case 'click': return { o, v, r: chance(0.35), e: seen(v) };
      case 'place': return { o, v, one: chance(0.5) };
      case 'quick': return { o, v, e: seen(v) };
      case 'out': return { o, all: chance(0.5) };
      case 'lay': case 'book': {
        const gw = w?.mode === 'station' ? 3 : 2, can = RECIPES.map((_, i) => i).filter((i) => recipeFits(RECIPES[i], w?.station ?? 'hand', gw) && canAfford(inv, RECIPES[i], inv.craft));
        const rr = can.length && chance(0.8) ? pick(can) : ri(RECIPES.length);
        return o === 'lay' ? { o, r: rr } : { o, r: rr, max: chance(0.5) ? 1 : 64 };
      }
      case 'hotkey': return { o, v, i: ri(9), e: seen(v) };
      case 'dropSlot': return { o, v, all: chance(0.5), e: seen(v) };
      case 'dropHeld': return { o, all: chance(0.5) };
      case 'sort': return { o, w: ri(2) as 0 | 1 };
      case 'buy': { const n = NPCS.find((z) => z.key === w?.npc), g = n ? goods(n, sim.flags) : []; return { o, k: g.length && chance(0.9) ? pick(g)[0] : pick(keys), bulk: chance(0.4) }; }
      case 'buyBack': return { o, id: w?.sold.length && chance(0.9) ? pick(w.sold).id : 1 + ri(50) };
      case 'spend': return { o, a: pick(['str', 'agi', 'vit', 'arc'] as const) };
      case 'pick': { const h = inv.slots.filter((s) => s && item(s.k).block !== undefined); return { o, id: h.length && chance(0.7) ? item(pick(h)!.k).block! : ri(40) }; }
      case 'tidy': return { o, cover: chance(0.5) };
      default: return { o } as InvOp;
    }
  };
  /** Change of window, as the windows and the right click do it: close what is open, then ask for the next. */
  const reopen = (): void => {
    if (view.window) sync.send({ o: 'close' });
    const k = ri(6);
    if (k === 0) return;
    if (k === 5) { r.up.push({ t: 'talk', id: r.npc }); opening = true; return; }
    const [cell, station] = k === 1 ? [CHEST, ''] : k === 2 ? [FORGE, ''] : k === 3 ? [BENCH, 'workbench'] : [ANVIL, 'anvil'];
    const seq = sync.nextSeq();
    if (station) sync.openStation(seq, station); else opening = true;
    r.up.push({ t: 'use', seq, x: cell[0], y: cell[1], z: cell[2], id: r.store.getBlock(...cell) });
  };
  // ---- what happens on the host that the client hears of only through `st`
  const pickup = (pl: SimPlayer): void => {
    const k = chance(0.7) ? pick(mats) : pick(keys), it: Item = { k, n: 1 + ri(item(k).stack) }, left = pl.inv.add(it);
    if (left) r.thrown.set(k, (r.thrown.get(k) ?? 0) + left);
    if (chance(0.1)) { const at = ri(36); if (!pl.inv.slots[at]) pl.inv.slots[at] = { k: pick(wear), n: 1, m: chance(0.4) ? pick(mods) : undefined }; }
    pl.inv.coins += ri(300); pl.stats.points += chance(0.1) ? 1 : 0; pl.inv.touch(); pl.invDirty = true;
  };
  let qSeq = 0;
  const other = (): void => {
    // the second player works the same chest: the race of section 9, which the expect guard settles
    if (!q.window) { qSeq++; onUse(sim, q, { t: 'use', seq: q.ackSeq + 1, x: CHEST[0], y: CHEST[1], z: CHEST[2], id: B.chest }); return; }
    const c = chest(), v: SlotRef = chance(0.5) ? [4, ri(27)] : [0, ri(36)], at = v[0] === 4 ? c[v[1]] : q.inv.slots[v[1]];
    const op: WireOp = pick<WireOp>([{ o: 'click', v, r: chance(0.3), e: at?.k ?? '' }, { o: 'quick', v, e: at?.k ?? '' }, { o: 'takeAll' }, { o: 'stash' }, { o: 'dropCur' }]);
    const before = totals();
    invOp(sim, q, q.ackSeq + 1, op); r.harvest();
    assert.deepEqual(delta(before, totals()), [], `second player: ${JSON.stringify(op)} made or lost something`);
  };
  const forgeTick = (): void => {
    const e = r.store.getEnt(...FORGE);
    if (!e) return;
    e.data.burn = ri(20); e.data.prog = rnd(); e.data.need = 4;
    for (const pl of realm.viewers.get(FORGE.join(',')) ?? []) pl.invDirty = true;
  };

  for (let i = 0; i < 4; i++) pickup(p), pickup(q);
  r.serve(); r.flush();
  let ops = 0, checks = 0, predicted = 0, stale = 0, endedSeen = 0, opening = false, wasQuiet = false;
  const kinds = new Map<string, number>();
  const heard: S2COf<'st'>[] = [], windows = new Map<string, number>();
  while (ops < 20000) {
    // quiet stretches let nothing but this client's ops reach the host; then its prediction must be the host's result
    const quiet = Math.floor(ops / 400) % 2 === 0;
    if (quiet && !wasQuiet) r.flush();
    wasQuiet = quiet;
    if (ops % 150 === 0) reopen();
    const n = 1 + ri(4);
    for (let j = 0; j < n; j++) {
      if (chance(0.15)) sync.setSel(ri(9));
      const op = make();
      sync.send(op); ops++;
      kinds.set(op.o, (kinds.get(op.o) ?? 0) + 1);
    }
    if (!quiet) {
      if (chance(0.15)) pickup(chance(0.6) ? p : q);
      if (chance(0.3)) other();
      if (chance(0.1)) forgeTick();
      if (chance(0.05)) pickup(q);
    }
    if (ops % 40 < 4) { for (let j = 0; j < 4; j++) pickup(chance(0.5) ? p : q); if (quiet) r.flush(); }
    // the host gets round to some of what was sent, the client hears of some of what it said
    if (chance(0.6)) r.serve(ri(6));
    if (chance(0.5)) { for (const m of r.down.slice(0, 4)) if (m.t === 'st') heard.push(m); r.deliver(4); }
    // an acknowledgement older than one already applied, as a reordering link would hand it over, changes nothing
    if (chance(0.05) && heard.length > 1) {
      const old = heard[ri(heard.length - 1)];
      if (old.ack < sync.ack) { const a = JSON.stringify(views(r)[0]); sync.onSt(old); assert.equal(JSON.stringify(views(r)[0]), a, 'a stale st changed the view'); stale++; }
    }
    if (heard.length > 64) heard.splice(0, 32);
    if (ops % 97 < 4) {
      // the selection waits for the next movement message, which sends it
      sync.flushSel();
      // a chest, forge or shop asked for shows when its state arrives: until then the two sides act on different windows
      if (quiet && !opening) {
        // the host has every op; the client has heard of none of the answers yet
        r.flushUp();
        const a = views(r);
        assert.deepEqual(a[0], a[1], `ops ${ops}: the prediction is not what the host did`);
        predicted++;
      }
      r.flush(); opening = false;
      same(r, `ops ${ops}: after every message was delivered`);
      const wm = view.window ? view.window.mode + (view.window.covered ? ' covered' : '') : 'none';
      windows.set(wm, (windows.get(wm) ?? 0) + 1);
      assert.equal(sync.unacked, 0);
      checks++;
    }
    endedSeen = r.ended;
  }
  r.flush();
  same(r, 'at the end');
  for (const k of WIRE_OPS) {
    const [yes, no] = r.tally.get(k) ?? [0, 0];
    assert.ok(yes > 0, `the host accepted no ${k}`);
    if (k !== 'close' && k !== 'tidy' && k !== 'sel') assert.ok(no > 0, `the host refused no ${k}`);
  }
  for (const w of ['none', 'station', 'chest', 'forge', 'shop']) assert.ok(windows.get(w), `never checked with ${w} open`);
  t.diagnostic('host accepted / refused: ' + WIRE_OPS.map((k) => `${k} ${r.tally.get(k)!.join('/')}`).join(', '));
  t.diagnostic('windows at the checks: ' + [...windows].map(([k, n]) => `${k} ${n}`).join(', '));
  t.diagnostic(`ops ${ops}, full checks ${checks}, prediction checks ${predicted}, stale st ${stale}, windows ended by the host ${endedSeen}, second player seq ${qSeq}`);
  assert.ok(checks > 150 && predicted > 50 && stale > 5, `${checks} checks, ${predicted} prediction checks, ${stale} stale`);
});


// ---- single cases ----------------------------------------------------------------------------------

/** Open the chest (or forge) for player p through its client, and let everything through. */
function openBox(r: Rig, cell: [number, number, number], sy = r.sync, up = r.up): void {
  up.push({ t: 'use', seq: sy.nextSeq(), x: cell[0], y: cell[1], z: cell[2], id: r.store.getBlock(...cell) });
  r.flush();
}
const give = (r: Rig, pl: SimPlayer, it: Item, at?: number): void => { if (at === undefined) pl.inv.add(it); else pl.inv.slots[at] = it; pl.inv.touch(); pl.invDirty = true; };

test('a refused op is shown until the answer comes, then undone', () => {
  const r = rig(), { sync, p } = r, v = sync.view;
  give(r, p, { k: 'stick', n: 3 }, 5); r.serve(); r.flush();
  assert.deepEqual(v.inv.slots[5], { k: 'stick', n: 3 });
  // the host uses the stack up before it hears of the click
  p.inv.slots[5] = null; p.inv.touch();
  const res = sync.send({ o: 'click', v: [0, 5], r: false, e: 'stick' });
  assert.equal(res.ok, true, 'accepted here');
  assert.equal(v.inv.cursor?.k, 'stick'); assert.equal(v.inv.slots[5], null);
  r.serve();
  assert.equal(p.inv.cursor, null, 'refused on the host: the client saw a stack that was gone');
  const rev = v.inv.rev;
  r.deliver();
  assert.equal(v.inv.cursor, null); assert.equal(v.inv.slots[5], null);
  assert.ok(v.inv.rev > rev, 'the view says it changed');
  same(r, 'after the answer');
  assert.equal(sync.unacked, 0);
});

test('two clients race for one stack in one chest: the second is refused and the stack exists once', () => {
  const r = rig(), { sync, qsync, p, q, store } = r;
  openBox(r, CHEST); openBox(r, CHEST, qsync, r.qup);
  assert.equal(sync.view.box?.kind, 'chest'); assert.equal(qsync.view.box?.kind, 'chest');
  assert.deepEqual([...r.sim.realms[0].viewers.get(CHEST.join(','))!], [p, q]);
  store.getEnt(...CHEST)!.data.s[0] = { k: 'cobble', n: 10 };
  p.invDirty = q.invDirty = true; r.serve(); r.flush();
  // both take the stack before either hears of the other
  assert.equal(sync.send({ o: 'click', v: [4, 0], r: false, e: 'cobble' }).ok, true);
  assert.equal(qsync.send({ o: 'click', v: [4, 0], r: false, e: 'cobble' }).ok, true);
  assert.equal(sync.view.inv.cursor?.n, 10); assert.equal(qsync.view.inv.cursor?.n, 10);
  r.flush();
  assert.equal(p.inv.cursor?.n, 10); assert.equal(q.inv.cursor, null);
  assert.equal(sync.view.inv.cursor?.n, 10); assert.equal(qsync.view.inv.cursor, null, 'the loser\'s prediction is undone');
  assert.equal(qsync.view.box?.kind === 'chest' && qsync.view.box.s[0], null, 'and it sees the chest the winner left');
  // both put back at once: each into its own slot, both kept
  sync.send({ o: 'click', v: [4, 3], r: false, e: '' }); qsync.send({ o: 'click', v: [4, 3], r: false, e: '' });
  r.flush();
  assert.deepEqual(store.getEnt(...CHEST)!.data.s[3], { k: 'cobble', n: 10 }); assert.equal(p.inv.cursor, null);
  let n = 0;
  for (const s of [...p.inv.slots, ...q.inv.slots, ...store.getEnt(...CHEST)!.data.s, p.inv.cursor, q.inv.cursor]) if (s?.k === 'cobble') n += s.n;
  assert.equal(n, 10);
  same(r, 'player a');
  assert.deepEqual(invWire(qsync.view.inv, qsync.view.stats, 0), invWire(q.inv, q.stats, 0));
});

test('a container that is gone when an op reaches into it: the window ends on the host and then here', () => {
  const r = rig(), { sync, p, store } = r, v = sync.view;
  give(r, p, { k: 'cobble', n: 5 }, 4); r.serve(); openBox(r, CHEST);
  assert.equal(v.window?.mode, 'chest');
  // a forge where the chest was: an op must never land in it
  store.setBlock(...CHEST, B.furnace); store.setEnt(...CHEST, 'forge', { s: [null, null, null], burn: 0, burnMax: 0, prog: 0, need: 0, level: 1, rev: 0 });
  sync.send({ o: 'click', v: [0, 4], r: false, e: 'cobble' });
  sync.send({ o: 'click', v: [4, 2], r: false, e: '' });
  assert.equal(v.box?.kind === 'chest' && v.box.s[2]?.k, 'cobble', 'shown in the chest here');
  r.serve();
  assert.equal(p.window, null, 'the host ended the window');
  assert.equal(p.inv.cursor, null); assert.equal(p.inv.slots[0]?.k, 'cobble', 'the stack in hand went back to the pack');
  assert.equal(store.getEnt(...CHEST)!.data.s[0], null, 'nothing reached the forge');
  assert.equal(r.sim.realms[0].viewers.has(CHEST.join(',')), false);
  const st = r.down.find((m) => m.t === 'st') as S2COf<'st'>;
  assert.equal(st.box, null);
  r.deliver();
  assert.equal(r.ended, 1, 'the client is told its window ended');
  assert.equal(v.window, null); assert.equal(v.box, null);
  same(r, 'after the window ended');
});

test('walking away from an open window ends it at the once-a-second check, under the Guide as well', () => {
  for (const covered of [false, true]) {
    const r = rig(), { sync, p } = r, v = sync.view;
    openBox(r, FORGE);
    assert.equal(v.window?.mode, 'forge');
    if (covered) { sync.send({ o: 'tidy', cover: true }); r.flush(); assert.equal(p.window?.covered, true); }
    assert.equal(revalidate(r.sim, p), true, 'still there');
    p.body.teleport(20.5, GROUND, 0.5);
    assert.equal(revalidate(r.sim, p), false);
    assert.equal(p.window, null);
    r.serve(); r.deliver();
    assert.equal(r.ended, 1); assert.equal(v.window, null);
    same(r, 'after the check');
  }
});

test('a station refused by the host is taken down here', () => {
  const r = rig(), { sync } = r, v = sync.view;
  const seq = sync.nextSeq();
  sync.openStation(seq, 'workbench');
  assert.equal(v.window?.mode, 'station');
  // the client named the wrong block: the host answers rej
  r.up.push({ t: 'use', seq, x: BENCH[0], y: BENCH[1], z: BENCH[2], id: B.anvil });
  r.serve();
  assert.equal(r.down[0].t, 'rej');
  r.deliver();
  assert.equal(r.ended, 1); assert.equal(v.window, null);
  same(r, 'after the refusal');
  // the same with the right block: the station stays, and the host holds it
  const s2 = sync.nextSeq();
  sync.openStation(s2, 'workbench');
  r.up.push({ t: 'use', seq: s2, x: BENCH[0], y: BENCH[1], z: BENCH[2], id: B.workbench });
  r.flush();
  assert.equal(sync.view.window?.mode, 'station'); assert.equal(r.p.window?.station, 'workbench');
  assert.ok(r.sim.realms[0].viewers.get(BENCH.join(','))?.has(r.p));
  assert.equal(r.ended, 1);
  same(r, 'at the station');
});

test('reconcile writes into the arrays the windows hold: pack, equipment, grid, chest, forge and the shop\'s list', () => {
  const r = rig(), { sync, p, q, store } = r, v = sync.view, inv = v.inv;
  const arrays = [inv.slots, inv.armor, inv.acc, inv.craft];
  openBox(r, CHEST);
  const box = v.box as Extract<ViewBox, { kind: 'chest' }>, cs = box.s;
  openBox(r, CHEST, r.qsync, r.qup);
  for (let i = 0; i < 30; i++) {
    give(r, p, { k: 'stick', n: 1 + (i % 7) });
    store.getEnt(...CHEST)!.data.s[i % 27] = { k: 'cobble', n: 1 + i };
    invOp(r.sim, q, q.ackSeq + 1, { o: 'quick', v: [4, (i * 5) % 27], e: store.getEnt(...CHEST)!.data.s[(i * 5) % 27]?.k ?? '' });
    p.invDirty = true;
    sync.send({ o: 'click', v: [0, i % 36], r: true, e: inv.slots[i % 36]?.k ?? '' });
    r.flush();
    assert.ok(arrays.every((a, j) => a === [inv.slots, inv.armor, inv.acc, inv.craft][j]), 'a pack array was replaced');
    assert.equal(v.box, box, 'the chest view was replaced'); assert.equal(box.s, cs);
    same(r, `round ${i}`);
  }
  sync.send({ o: 'close' }); r.flush();
  assert.equal(v.box, null);
  // a forge: the same data object, its slots in place, and `rev` moves so the window redraws
  openBox(r, FORGE);
  const f = sync.view.box as Extract<ViewBox, { kind: 'forge' }>, fd = f.data, fs = fd.s, rev = fd.rev;
  const e = store.getEnt(...FORGE)!;
  e.data.s[1] = { k: 'coal', n: 4 }; e.data.burn = 7; p.invDirty = true; r.serve(); r.flush();
  assert.equal(v.box, f); assert.equal(f.data, fd); assert.equal(fd.s, fs);
  assert.deepEqual([fd.s[1]?.k, fd.burn], ['coal', 7]); assert.ok(fd.rev > rev);
  sync.send({ o: 'close' }); r.flush();
  // a shop: what was sold is listed in one array, which the window reads, through sales and a buy-back
  r.up.push({ t: 'talk', id: r.npc }); r.flush();
  const shop = sync.view.box as Extract<ViewBox, { kind: 'shop' }>, sold = shop.sold;
  assert.equal(v.window?.mode, 'shop'); assert.equal(v.window!.sold, sold);
  for (let i = 0; i < 3; i++) { give(r, p, { k: 'iron_bar', n: 2 }, 20 + i); r.serve(); r.flush(); sync.send({ o: 'quick', v: [0, 20 + i], e: 'iron_bar' }); }
  assert.equal(sold.length, 3, 'shown as sold at once');
  r.flush();
  assert.equal(v.box, shop); assert.equal(shop.sold, sold); assert.equal(v.window!.sold, sold); assert.equal(sold.length, 3);
  sync.send({ o: 'buyBack', id: sold[1].id }); r.flush();
  assert.equal(shop.sold, sold); assert.equal(sold.length, 2);
  same(r, 'at the shop');
});

test('the hotbar selection waits, and goes out once in front of the next op or action', () => {
  const r = rig(), { sync, p } = r, v = sync.view;
  for (const i of [3, 5, 7]) sync.setSel(i);
  assert.equal(r.up.length, 0, 'nothing sent while the wheel spins'); assert.equal(v.inv.sel, 7);
  const seq = sync.nextSeq();
  assert.equal(seq, 2);
  assert.deepEqual(r.up, [{ t: 'op', seq: 1, o: 'sel', i: 7 }], 'one sel, under the number before the action\'s');
  r.serve(); assert.equal(p.inv.sel, 7);
  // a selection made after it survives the state that answers it
  sync.setSel(2);
  r.deliver();
  assert.equal(v.inv.sel, 2, 'still the local choice');
  sync.send({ o: 'sort', w: 0 });
  assert.deepEqual(r.up.map((m) => (m as { o: string }).o), ['sel', 'sort']);
  r.flush();
  assert.equal(p.inv.sel, 2); same(r, 'after both');
  // a new connection starts the numbering again
  sync.reset();
  assert.equal(sync.nextSeq(), 1);
});

test('a prediction-only op never travels, and what an action uses up stays used up until the action is answered', () => {
  const r = rig(), { sync, p } = r, v = sync.view;
  give(r, p, { k: 'cobble', n: 10 }, 0); r.serve(); r.flush();
  assert.equal(sync.send({ o: '_held', n: 1 }).ok, false); assert.equal(r.up.length, 0);
  // a placement: the block leaves the hand at once, under the seq of its edit
  const seq = sync.nextSeq();
  sync.internal(seq, { o: '_held', n: 1 });
  assert.equal(v.inv.slots[0]?.n, 9);
  // an unrelated answer comes first: the block is still gone
  p.inv.coins += 5; p.invDirty = true; r.serve(); r.deliver();
  assert.equal(v.inv.slots[0]?.n, 9); assert.equal(v.inv.coins, 5);
  // the host refused the edit (nothing was placed): its st restores the block
  p.ackSeq = seq; p.invDirty = true; r.serve(); r.deliver();
  assert.equal(v.inv.slots[0]?.n, 10);
  same(r, 'after the refusal');
});

// ---- the client over a session ---------------------------------------------------------------------

function fakeLink(): { tr: Transport; out: C2S[]; push(m: S2C | ArrayBuffer): void } {
  const out: C2S[] = [];
  const tr: Transport = { kind: 'loopback', state: 'open', send: (m) => { out.push(m); }, sendBin: () => {}, onOpen: null, onMessage: null, onBinary: null, onClose: null, close: () => {} };
  return { tr, out, push: (m) => { if (m instanceof ArrayBuffer) tr.onBinary!(m); else tr.onMessage!(m); } };
}
const welcome = (): S2C => ({ t: 'welcome', proto: 1, boot: 1, you: { slot: 1, id: 'a' }, world: { name: 'w', seed: 1, seedText: '1' }, dim: 0, pos: [0, 64, 0, 0, 0], tp: 0, tick: 0, clock: 0.2,
  flags: [], quest: 0, event: { a: null, k: 0, g: 0 }, spawn: [0, 0], cfg: { cheats: true, simRadius: 5, viewMax: 16, maxPlayers: 8 }, players: [] });

test('the inventory client keeps the mirrors: st reconciles, stats and the snapshot header fill the stats, open and an ended window reach their hooks', () => {
  const r = rig(), link = fakeLink(), session = new Session(link.tr), c = new InvClient(session, () => r.sim.flags);
  assert.equal(session.inv, c);
  let flight: boolean[] = [], opened: string[] = [], ended = 0;
  c.onFlight = (on) => flight.push(on); c.onOpen = (m, box) => opened.push(m.mode + ':' + (box?.kind ?? '')); c.onEnded = () => { ended++; };
  link.push(welcome()); link.push(stOf(r.sim, r.p, true)!);
  r.p.inv.slots[0] = { k: 'stick', n: 5 }; r.p.inv.coins = 12;
  link.push(stOf(r.sim, r.p)!);
  session.pump();
  assert.deepEqual([c.inv.slots[0], c.inv.coins], [{ k: 'stick', n: 5 }, 12]);
  // ops leave as `op` under one counter, a waiting selection first
  c.setSel(4);
  c.send({ o: 'click', v: [0, 0], r: false, e: 'stick' });
  assert.deepEqual(link.out, [{ t: 'op', seq: 1, o: 'sel', i: 4 }, { t: 'op', seq: 2, o: 'click', v: [0, 0], r: false, e: 'stick' }]);
  assert.equal(c.inv.cursor?.k, 'stick');
  // stats: level, buffs, modes; a grant of flight is passed on once
  const stats = (creative: boolean): S2C => ({ t: 'stats', level: 3, xp: 7, buffs: [['fed', 60]], salveCd: 2, recallT: 12, modes: { creative, hidden: false, god: false, fly: false }, bed: [1, 2, 3], deathAt: null, sleeping: false });
  link.push(stats(true)); link.push(stats(true)); link.push(stats(false));
  session.pump();
  assert.deepEqual(flight, [true, false]);
  assert.deepEqual([c.stats.level, c.stats.xp, c.stats.buffs.get('fed'), c.recallT, c.bed], [3, 7, 60, 12, [1, 2, 3]]);
  c.tick(5); assert.equal(c.recallT, 7);
  // the snapshot header: health, mana, hunger, death
  link.push(encodeSnapshot({ flags: SELF_DEAD, tick: 9, ackMove: 0, tp: 0, hunger: 11, ox: 0, oz: 0, hp: 42.5, mana: 17.2, players: [], mobs: [] }));
  session.pump();
  assert.deepEqual([c.stats.hp, Math.round(c.stats.mana * 10), c.stats.hunger, c.dead, c.stats.dead], [42.5, 172, 11, true, true]);
  // a chest the host opened: its state, then `open`; then the host ends it
  r.down.length = 0; r.up.length = 0;
  onUse(r.sim, r.p, { t: 'use', seq: 3, x: CHEST[0], y: CHEST[1], z: CHEST[2], id: B.chest });
  for (const m of r.down) link.push(m);
  session.pump();
  assert.deepEqual(opened, ['chest:chest']); assert.equal(c.window?.mode, 'chest');
  endWindow(r.sim, r.p);
  link.push(stOf(r.sim, r.p)!); session.pump();
  assert.equal(ended, 1); assert.equal(c.window, null);
  // a new connection starts everything again
  link.push(welcome()); session.pump();
  assert.equal(c.nextSeq(), 1); assert.equal(c.recallT, 0);
});

test('a reload keeps the modes and the recall cooldown, and a creative player comes back in flight (D36 (o))', () => {
  const r = rig();
  r.p.modes = { creative: true, hidden: true, god: true, fly: false }; r.p.recallT = 40; r.p.body.flying = false;
  const rec = JSON.parse(JSON.stringify(toRecord(r.p, 0)));
  const back = rig().sim.join('c', 'C', rec, true);
  assert.deepEqual([back.modes, back.recallT], [{ creative: true, hidden: true, god: true, fly: false }, 40]);
  const link = fakeLink(), session = new Session(link.tr), c = new InvClient(session, () => r.sim.flags), flight: boolean[] = [];
  c.onFlight = (on) => flight.push(on);
  link.push(welcome()); link.push(r.sim.statsNow(back));
  session.pump();
  assert.deepEqual(flight, [true], 'the first stats after the welcome puts the body in flight');
  assert.equal(c.recallT, 40);
});

test('the hands: a shot, a swing, a station, a meal and a gate kit each leave as their message, with what they use up taken at once', () => {
  const link = fakeLink(), session = new Session(link.tr), flags = new Set<string>(), c = new InvClient(session, () => flags);
  const player = new Player(); player.teleport(0.5, 64, 0.5); player.yaw = Math.PI; player.pitch = 0;   // looking along +z
  const hit = newRayHit();
  const shown: string[] = [], ghosts: unknown[][] = [], edits: string[] = [];
  const mobs: HandMob[] = [];
  const view: CombatView = {
    player, interact: { hit }, ents: { mobs }, audio: { play: () => {} }, win: { show: (_m, o) => shown.push(o.station) },
    toast: () => {}, swing: () => {}, burst: () => {},
  };
  const edit: EditHost = { place: () => { edits.push('place'); return true; }, placeDoor: () => { edits.push('door'); return true; }, toggleDoor: () => { edits.push('toggle'); return true; } };
  const ghost: Ghosts = { ghost: (...a) => { ghosts.push(a); } };
  const hands = new Combat(view, session, c, edit, ghost);
  const inv = c.inv, bow = [...ITEMS.values()].find((d) => d.weapon?.style === 'ranged')!.key;
  inv.slots[0] = { k: bow, n: 1 }; inv.slots[9] = { k: 'arrow', n: 4 }; inv.slots[1] = { k: 'apple', n: 3 }; inv.slots[2] = { k: 'hollow_gate_kit', n: 1 };
  c.stats.recompute(inv); c.stats.hunger = 5;
  const sent = (): string[] => link.out.map((m) => m.t + (m.t === 'op' ? ':' + m.o : '') + ('seq' in m ? '#' + (m as { seq: number }).seq : ''));
  // a shot: the arrow leaves the pack now, a ghost flies under the shot's seq
  c.setSel(0);
  assert.equal(hands.primary(true, true), true);
  assert.deepEqual(sent(), ['op:sel#1', 'fire#2']);
  assert.equal(inv.slots[9]?.n, 3); assert.equal(ghosts.length, 1); assert.equal(ghosts[0][0], 2); assert.equal(ghosts[0][1], 'arrow');
  const f = link.out[1] as Extract<C2S, { t: 'fire' }>;
  assert.ok(Math.abs(f.d[2] - 1) < 1e-9 && Math.abs(f.o[1] - (64 + player.eye)) < 1e-9);
  // the client's own cadence: a held button does not fire again before the cooldown
  assert.equal(hands.primary(false, true), true); assert.equal(link.out.length, 2);
  hands.tick(1); hands.primary(false, true); assert.equal(link.out.length, 3);
  // a swing at a creature the ray meets
  inv.slots[0] = null; inv.touch(); hands.tick(1);
  mobs.push({ x: 0.5, y: 64, z: 2.5, hw: 0.3, h: 1.8, yaw: 0, ry: 0, def: { ai: 'melee', boss: undefined }, segs: null, active: true, id: 77 } as unknown as HandMob);
  assert.equal(hands.primary(true, true), true);
  const atk = link.out.at(-1) as Extract<C2S, { t: 'atk' }>;
  assert.deepEqual([atk.t, atk.id], ['atk', 77]); assert.ok(Math.abs(atk.d[2] - 1) < 1e-9);
  mobs.length = 0;
  // a station: shown at once, its use under the next seq
  Object.assign(hit, { hit: true, x: 0, y: 64, z: 2, nx: 0, ny: 0, nz: -1, id: B.workbench, dist: 1.5 });
  assert.equal(hands.secondary(hit, true), true);
  assert.equal(link.out.at(-1)!.t, 'use'); assert.deepEqual(shown, ['workbench']); assert.equal(c.window?.mode, 'station');
  // a block in hand against stone: lane B's placement is asked
  Object.assign(hit, { id: B.stone });
  inv.slots[0] = { k: 'cobble', n: 9 }; inv.touch();
  assert.equal(hands.secondary(hit, true), true); assert.deepEqual(edits, ['place']);
  // a meal: one apple leaves the hand at once
  c.setSel(1);
  assert.equal(hands.secondary(null, true), true);
  const meal = link.out.at(-1) as Extract<C2S, { t: 'item' }>;
  assert.deepEqual([meal.t, meal.slot], ['item', 1]); assert.equal(inv.slots[1]?.n, 2);
  assert.equal(hands.secondary(null, true), false, 'the use cooldown');
  // a gate kit on the ground it points at
  c.setSel(2);
  Object.assign(hit, { ny: 1, nz: 0, y: 63, id: B.stone });
  assert.equal(hands.secondary(hit, true), true);
  const kit = link.out.at(-1) as Extract<C2S, { t: 'item' }>;
  assert.deepEqual([kit.slot, kit.at], [2, [0, 64, 2]]); assert.equal(inv.slots[2], null);
});

test('the Guide over a chest: tidy keeps the window on both sides, ops act as with none, and Back finds the chest as it now is', () => {
  const r = rig(), { sync, p, q, store } = r, v = sync.view;
  give(r, p, { k: 'stick', n: 6 }, 9); r.serve(); openBox(r, CHEST);
  // a stack in hand when the Guide opens goes back to the pack
  sync.send({ o: 'click', v: [0, 9], r: false, e: 'stick' });
  sync.send({ o: 'tidy', cover: true });
  assert.equal(v.inv.cursor, null); assert.equal(v.window?.covered, true);
  r.flush();
  assert.equal(p.window?.covered, true); assert.equal(p.window?.mode, 'chest', 'the host keeps the window under the Guide');
  // a shift-click in the Guide acts on the plain inventory: hotbar to backpack, not into the hidden chest
  give(r, p, { k: 'cobble', n: 3 }, 0); r.serve(); r.flush();
  sync.send({ o: 'quick', v: [0, 0], e: 'cobble' });
  r.flush();
  assert.equal(store.getEnt(...CHEST)!.data.s.some((s: Slot) => s?.k === 'cobble'), false);
  // the other player changes the chest meanwhile: the covered window still hears of it
  openBox(r, CHEST, r.qsync, r.qup);
  give(r, q, { k: 'flint', n: 2 }, 0); r.serve(); r.flush();
  r.qsync.send({ o: 'quick', v: [0, 0], e: 'flint' }); r.flush();
  assert.equal(v.box?.kind === 'chest' && v.box.s.some((s) => s?.k === 'flint'), true);
  assert.equal(v.window?.covered, true, 'still covered after the state that told it');
  // Back: uncovered again, and the chest takes ops
  sync.send({ o: 'tidy', cover: false });
  sync.send({ o: 'quick', v: [0, v.inv.slots.findIndex((s) => s?.k === 'cobble')], e: 'cobble' });
  r.flush();
  assert.equal(store.getEnt(...CHEST)!.data.s.some((s: Slot) => s?.k === 'cobble'), true);
  same(r, 'after Back');
});

test('a close and a new open of the same container in one host step: the st carries the box, and the window stands', () => {
  const r = rig(), { sync, p, up } = r, v = sync.view;
  openBox(r, CHEST);
  assert.equal(v.box?.kind, 'chest');
  // the chest has not changed since the last st; the close and the use behind it reach the host together
  sync.send({ o: 'close' });
  up.push({ t: 'use', seq: sync.nextSeq(), x: CHEST[0], y: CHEST[1], z: CHEST[2], id: r.store.getBlock(...CHEST) });
  r.serve();
  assert.equal(p.window?.mode, 'chest');
  r.deliver();
  assert.equal(v.box?.kind, 'chest', 'the open that follows finds the box');
  assert.equal(v.window?.mode, 'chest');
  same(r, 'after the reopen');
  // the same for a shop with nothing sold: close, then talk to the same townsperson
  sync.send({ o: 'close' }); r.flush();
  up.push({ t: 'talk', id: r.npc }); r.flush();
  assert.equal(v.window?.mode, 'shop');
  sync.send({ o: 'close' });
  up.push({ t: 'talk', id: r.npc });
  r.serve(); r.deliver();
  assert.equal(p.window?.mode, 'shop');
  assert.equal(v.window?.mode, 'shop', 'the shop stands here as well');
  assert.equal(v.box?.kind, 'shop');
  same(r, 'after the shop reopened');
});

test('the HUD reads the world event as the wire carries it: the label, the bar and the moon\'s tint, with no field of the host\'s own', () => {
  const r = rig(), ev = r.sim.shared.events;
  // what the `event` message carries: a, k and g, without the day of the last march the host keeps beside them
  const wire = (): EventWire => { const m: S2C = { t: 'event', a: ev.a, k: ev.k, g: ev.g }; const { t: _t, ...w } = m; return w as EventWire; };
  const none = (welcome() as S2COf<'welcome'>).event;
  assert.deepEqual([eventLabel(none), eventProgress(none, 0.7), moonTint(none)], ['', 0, null], 'no event, and a goal of 0 is no bar rather than NaN');
  r.sim.events.start('raid');
  const g = ev.g;
  assert.ok(g > 0);
  assert.deepEqual([eventLabel(wire()), eventProgress(wire(), 0.7), moonTint(wire())], [`Night raid  0 / ${g}`, 0, null]);
  ev.k = 3;
  assert.deepEqual([eventLabel(wire()), eventProgress(wire(), 0.7)], [`Night raid  3 / ${g}`, 3 / g]);
  r.sim.events.end(false);
  assert.equal(eventLabel(wire()), '');
  r.sim.events.start('ashen');
  assert.deepEqual([eventLabel(wire()), eventProgress(wire(), 0.3)], [`Sand March  0 / ${ev.g}`, 0]);
  r.sim.events.end(false);
  // the moon: its bar is the night that is left, whatever its count says
  r.sim.events.start('moon');
  const m = wire();
  assert.equal(eventLabel(m), 'Amāvassa');
  assert.deepEqual(moonTint(m), [1.0, 0.42, 0.78]);
  for (const [clock, left] of [[12.3, 1], [12.5, 1], [12.75, 0.5], [12.95, 0.1]] as const) assert.ok(Math.abs(eventProgress(m, clock) - left) < 1e-9, `at ${clock}: ${eventProgress(m, clock)}`);
  r.sim.events.end(false);
  assert.equal(moonTint(wire()), null);
});
