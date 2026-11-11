// applyOp, op by op: a case that applies it and checks what it did, a case it must refuse without
// touching anything, and a long seeded run of valid and invalid ops which checks that items and coins
// appear or vanish only where an op makes or uses them by definition.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mulberry32 } from '../../src/core/noise';
import { B, BLOCKS } from '../../src/data/blocks';
import { ITEMS, type Item, MOD_BY_KEY, item } from '../../src/data/items';
import { NPCS } from '../../src/data/npcs';
import { RECIPES, type Recipe } from '../../src/data/recipes';
import { Inventory, type Slot, canAfford, matchRecipe, needs, recipeFits } from '../../src/sim/inventory';
import { type InvOp, type OpResult, type OpState, type SlotRef, applyOp } from '../../src/sim/invops';
import { accepts, goods, sellPrice, smeltable, sortCompare } from '../../src/sim/rules';
import { PlayerStats } from '../../src/sim/stats';

type Win = NonNullable<OpState['window']>;
interface Rig {
  s: OpState; dropped: Item[]; flags: Set<string>; creative: boolean; seq: number;
  /** Both containers exist all along; which one is the open box follows the window. */
  chest: Slot[]; forge: Slot[];
  open(w: Win | null): void;
  do(op: InvOp): OpResult;
}
function rig(win: Win | null = null): Rig {
  const s: OpState = { inv: new Inventory(), stats: new PlayerStats(), box: null, window: null };
  s.stats.recompute(s.inv);
  const r: Rig = {
    s, dropped: [], flags: new Set(), creative: false, seq: 0, chest: new Array<Slot>(27).fill(null), forge: [null, null, null],
    open(w) { s.window = w; s.box = w?.mode === 'chest' ? { kind: 'chest', s: r.chest } : w?.mode === 'forge' ? { kind: 'forge', s: r.forge, level: 1 } : null; },
    do(op) {
      const seq = ++r.seq;
      return applyOp(s, op, { seq, rnd: mulberry32(seq * 7919), flags: r.flags, creative: r.creative, drop: (it) => { r.dropped.push({ ...it }); }, flag: (f) => { r.flags.add(f); } });
    },
  };
  r.open(win);
  return r;
}
const station = (name: string): Win => ({ mode: 'station', station: name, sold: [] });
const chestWin = (): Win => ({ mode: 'chest', sold: [] });
const forgeWin = (): Win => ({ mode: 'forge', sold: [] });
const shopWin = (npc = 'wayfinder'): Win => ({ mode: 'shop', npc, sold: [] });
const bad = (o: unknown): InvOp => o as InvOp;

/** Everything an op may change, as one string. */
function snap(r: Rig): string {
  const { inv, stats, window: w } = r.s;
  return JSON.stringify([inv.slots, inv.armor, inv.acc, inv.craft, inv.cursor, inv.sel, inv.coins, r.chest, r.forge,
    w && [w.mode, !!w.covered, w.sold], stats.attr, stats.points, stats.hp, r.dropped, [...r.flags]]);
}
/** The op must be refused and leave everything as it was. */
function refused(r: Rig, op: InvOp): OpResult {
  const before = snap(r), res = r.do(op);
  assert.equal(res.ok, false, 'refused: ' + JSON.stringify(op));
  assert.equal(snap(r), before, 'a refused op changed something: ' + JSON.stringify(op));
  return res;
}
function ok(r: Rig, op: InvOp): OpResult {
  const res = r.do(op);
  assert.equal(res.ok, true, 'accepted: ' + JSON.stringify(op));
  return res;
}
const stack = (k: string, n: number, m?: string): Item => (m ? { k, n, m } : { k, n });
/** Deep equality that reads an absent modifier and `m: undefined` as the same stack. */
const plain = (x: unknown): unknown => (x === null || typeof x !== 'object' ? x : Array.isArray(x) ? x.map(plain)
  : Object.fromEntries(Object.entries(x).filter((e) => e[1] !== undefined).map(([k, v]) => [k, plain(v)])));
const eq = (got: unknown, want: unknown, msg?: string): void => assert.deepEqual(plain(got), plain(want), msg);
const gear = [...ITEMS.values()];
const HELM = gear.find((d) => d.armor?.slot === 0)!.key, HELM2 = gear.filter((d) => d.armor?.slot === 0)[1].key, BODY = gear.find((d) => d.armor?.slot === 1)!.key;
const CHARM = gear.find((d) => d.acc)!.key, CHARM2 = gear.filter((d) => d.acc)[1].key;
const SWORD = gear.find((d) => d.weapon && !d.tool && d.stack === 1)!.key;
const MOD = [...MOD_BY_KEY.values()].find((m) => m.rar > 0)!.key;
const recipe = (out: string): number => { const i = RECIPES.findIndex((q) => q.out === out); assert.ok(i >= 0, 'recipe for ' + out); return i; };
const count = (r: Rig, k: string): number => r.s.inv.count(k);

test('sel', () => {
  const r = rig();
  ok(r, { o: 'sel', i: 4 });
  assert.equal(r.s.inv.sel, 4);
  for (const i of [9, -1, 1.5, '3', null, NaN]) refused(r, bad({ o: 'sel', i }));
});

test('click', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[10] = stack('cobble', 5);
  ok(r, { o: 'click', v: [0, 10], r: true, e: 'cobble' });
  eq([inv.cursor, inv.slots[10]], [stack('cobble', 3), stack('cobble', 2)], 'right-click takes the larger half');
  ok(r, { o: 'click', v: [0, 11], r: true, e: '' });
  eq([inv.cursor?.n, inv.slots[11]?.n], [2, 1], 'right-click with a loaded cursor puts one down');
  ok(r, { o: 'click', v: [0, 10], r: false, e: 'cobble' });
  eq([inv.cursor, inv.slots[10]], [null, stack('cobble', 4)], 'left-click merges the cursor into a matching stack');
  ok(r, { o: 'click', v: [0, 10], r: false, e: 'cobble' });
  eq([inv.cursor, inv.slots[10]], [stack('cobble', 4), null], 'left-click takes the whole stack');
  inv.slots[12] = stack(SWORD, 1);
  ok(r, { o: 'click', v: [0, 12], r: false, e: SWORD });
  eq([inv.cursor, inv.slots[12]], [stack(SWORD, 1), stack('cobble', 4)], 'unlike stacks trade places');
  const res = r.do({ o: 'click', v: [1, 0], r: false, e: '' });
  eq([res.ok, res.snd], [false, 'error'], 'a sword does not go in the head slot');
  inv.cursor = stack(HELM, 1);
  assert.equal(ok(r, { o: 'click', v: [1, 0], r: false, e: '' }).snd, 'dig_cloth');
  eq(inv.armor[0], stack(HELM, 1));

  refused(r, { o: 'click', v: [0, 12], r: false, e: 'stick' });                 // not what the sender saw there
  refused(r, { o: 'click', v: [0, 30], r: false, e: '' });                       // nothing to take, nothing carried
  refused(r, { o: 'click', v: [0, 36], r: false, e: '' });
  refused(r, { o: 'click', v: [4, 0], r: false, e: '' });                        // no container is open
  refused(r, { o: 'click', v: [3, 4], r: false, e: '' });                        // the grid by hand has four cells
  refused(r, bad({ o: 'click', v: [0, 12], r: 1, e: 'cobble' }));
  refused(r, bad({ o: 'click', v: 12, r: false, e: 'cobble' }));
  refused(r, bad({ o: 'click', v: [0, 12], r: false }));

  const f = rig(forgeWin());
  f.forge[2] = stack('iron_bar', 6);
  ok(f, { o: 'click', v: [4, 2], r: true, e: 'iron_bar' });
  eq([f.s.inv.cursor, f.forge[2]], [stack('iron_bar', 6), null], 'the forge output is never split');
  const back = f.do({ o: 'click', v: [4, 2], r: false, e: '' });
  eq([back.ok, f.forge[2]], [false, null], 'nothing is put into the forge output');
});

test('place', () => {
  const r = rig(), inv = r.s.inv;
  inv.cursor = stack('cobble', 3);
  ok(r, { o: 'place', v: [0, 20], one: true });
  ok(r, { o: 'place', v: [0, 21], one: true });
  ok(r, { o: 'place', v: [0, 20], one: true });
  eq([inv.cursor, inv.slots[20], inv.slots[21]], [null, stack('cobble', 2), stack('cobble', 1)]);
  inv.cursor = stack('stick', 7);
  ok(r, { o: 'place', v: [0, 20], one: false });
  eq([inv.cursor, inv.slots[20]], [stack('cobble', 2), stack('stick', 7)], 'a drag released on another stack swaps');
  refused(r, { o: 'place', v: [1, 1], one: false });                             // cobble is not armour
  refused(r, { o: 'place', v: [0, 20], one: true });                             // one item cannot go onto a different stack
  refused(r, bad({ o: 'place', v: [0, 99], one: false }));
  refused(r, bad({ o: 'place', v: [0, 22] }));
  inv.cursor = null;
  refused(r, { o: 'place', v: [0, 22], one: false });                            // nothing carried
  inv.cursor = stack('cobble', 99); inv.slots[23] = stack('cobble', 99);
  refused(r, { o: 'place', v: [0, 23], one: false });                            // the stack is full
  refused(r, { o: 'place', v: [3, 4], one: true });                              // by hand the grid has four cells
  ok(r, { o: 'place', v: [3, 3], one: true });
  const w = rig(station('anvil'));
  w.s.inv.cursor = stack('cobble', 2);
  ok(w, { o: 'place', v: [3, 8], one: true });                                   // nine at a station
  w.open(chestWin());
  refused(w, { o: 'place', v: [3, 0], one: true });                              // none beside a chest
});

test('gather', () => {
  const r = rig(chestWin()), inv = r.s.inv;
  inv.cursor = stack('torch', 3); inv.slots[0] = stack('torch', 99); inv.slots[5] = stack('torch', 10); inv.slots[6] = stack('torch', 4, undefined);
  r.chest[2] = stack('torch', 20);
  ok(r, { o: 'gather' });
  eq([inv.cursor?.n, inv.slots[0]?.n, inv.slots[5], inv.slots[6], r.chest[2]], [99, 37, null, null, null], 'partial stacks first, the chest after the pack, then full stacks');
  refused(r, { o: 'gather' });                                                   // the cursor stack is full
  inv.cursor = stack(SWORD, 1);
  refused(r, { o: 'gather' });
  inv.cursor = stack('stick', 2);
  refused(r, { o: 'gather' });                                                   // no sticks anywhere
  inv.cursor = null;
  refused(r, { o: 'gather' });
});

test('quick', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[2] = stack('cobble', 30); inv.slots[9] = stack('cobble', 90);
  ok(r, { o: 'quick', v: [0, 2], e: 'cobble' });
  eq([inv.slots[2], inv.slots[9], inv.slots[10]], [null, stack('cobble', 99), stack('cobble', 21)], 'hotbar to backpack, topping up first');
  ok(r, { o: 'quick', v: [0, 10], e: 'cobble' });
  eq([inv.slots[0], inv.slots[10]], [stack('cobble', 21), null], 'backpack to hotbar');
  inv.armor[0] = stack(HELM2, 1); inv.slots[20] = stack(HELM, 1);
  assert.equal(ok(r, { o: 'quick', v: [0, 20], e: HELM }).snd, 'dig_cloth');
  eq([inv.armor[0], inv.slots[20]], [stack(HELM, 1), stack(HELM2, 1)], 'armour trades places with what is worn');
  inv.slots[21] = stack(CHARM, 1);
  ok(r, { o: 'quick', v: [0, 21], e: CHARM });
  eq([inv.acc[0], inv.slots[21]], [stack(CHARM, 1), null]);
  inv.slots[21] = stack(CHARM, 1);
  assert.equal(refused(r, { o: 'quick', v: [0, 21], e: CHARM }).msg, 'Already wearing one: a second adds nothing');
  ok(r, { o: 'quick', v: [1, 0], e: HELM });
  assert.equal(inv.armor[0], null, 'shift-click on worn armour takes it off');
  refused(r, { o: 'quick', v: [0, 30], e: '' });
  refused(r, { o: 'quick', v: [0, 0], e: 'stick' });
  refused(r, bad({ o: 'quick', v: [7, 0], e: 'cobble' }));
  refused(r, bad({ o: 'quick', v: [0, 0] }));

  const c = rig(chestWin());
  c.s.inv.slots[0] = stack('flint', 12); c.chest[4] = stack('flint', 95);
  ok(c, { o: 'quick', v: [0, 0], e: 'flint' });
  eq([c.s.inv.slots[0], c.chest[4], c.chest[0]], [null, stack('flint', 99), stack('flint', 8)]);
  ok(c, { o: 'quick', v: [4, 4], e: 'flint' });
  eq([c.chest[4], count(c, 'flint')], [null, 99]);

  const f = rig(forgeWin()), fi = f.s.inv;
  fi.slots[0] = stack('iron_ore', 5); fi.slots[1] = stack('coal', 3); fi.slots[2] = stack('flint', 1);
  ok(f, { o: 'quick', v: [0, 0], e: 'iron_ore' }); ok(f, { o: 'quick', v: [0, 1], e: 'coal' });
  eq(f.forge, [stack('iron_ore', 5), stack('coal', 3), null]);
  eq([refused(f, { o: 'quick', v: [0, 2], e: 'flint' }).snd, fi.slots[2]], ['error', stack('flint', 1)]);

  const s = rig(shopWin()), si = s.s.inv;
  si.slots[3] = stack('cobble', 10);
  const sale = ok(s, { o: 'quick', v: [0, 3], e: 'cobble' });
  eq([sale.snd, si.slots[3], si.coins], ['coin', null, sellPrice('cobble') * 10]);
  eq(s.s.window!.sold, [{ id: s.seq, it: stack('cobble', 10), price: sellPrice('cobble') * 10 }], 'a sale is named by the seq of its op');
});

test('out', () => {
  const r = rig(), inv = r.s.inv;
  inv.craft[0] = stack('oak_log', 3);
  const one = ok(r, { o: 'out', all: false });
  eq([one.snd, one.ok && one.n, inv.cursor, inv.craft[0]], ['craft', 4, stack('oak_planks', 4), stack('oak_log', 2)]);
  assert.ok(r.flags.has('craft:oak_planks'));
  ok(r, { o: 'out', all: false });
  assert.equal(inv.cursor?.n, 8, 'the output stacks onto a matching cursor');
  const all = ok(r, { o: 'out', all: true });
  eq([all.ok && all.n, count(r, 'oak_planks'), inv.craft[0]], [4, 4, null]);
  refused(r, { o: 'out', all: false });                                          // the grid spells nothing
  refused(r, bad({ o: 'out' }));
  inv.craft[0] = stack('oak_log', 1); inv.cursor = stack('stick', 1);
  refused(r, { o: 'out', all: false });                                          // the cursor holds something else
  r.open(chestWin());
  refused(r, { o: 'out', all: true });                                           // no grid beside a chest

  const full = rig(), fi = full.s.inv;
  for (let i = 0; i < 36; i++) fi.slots[i] = stack(SWORD, 1);
  fi.craft[0] = stack('oak_log', 1);
  assert.equal(refused(full, { o: 'out', all: true }).msg, 'No room in your pack');
});

test('lay', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[0] = stack('oak_planks', 10);
  assert.equal(ok(r, { o: 'lay', r: recipe('workbench') }).snd, 'click');
  eq([inv.craft.slice(0, 4).map((s) => s?.k), inv.slots[0]?.n], [['oak_planks', 'oak_planks', 'oak_planks', 'oak_planks'], 6]);
  assert.equal(matchRecipe(inv.craft.slice(0, 4), 2, 'hand')?.out, 'workbench');
  ok(r, { o: 'lay', r: recipe('stick') });
  eq([inv.craft.filter((s) => s).length, count(r, 'oak_planks')], [2, 8], 'the grid goes back to the pack before the next recipe is laid');
  assert.equal(refused(r, { o: 'lay', r: recipe('torch') }).snd, 'error');      // no coal
  refused(r, { o: 'lay', r: recipe('chest') });                                  // a workbench recipe, by hand
  for (const q of [-1, RECIPES.length, 0.5, 'stick']) refused(r, bad({ o: 'lay', r: q }));
  const w = rig(station('workbench'));
  w.s.inv.slots[0] = stack('cobble', 8);
  ok(w, { o: 'lay', r: recipe('furnace') });
  assert.equal(w.s.inv.craft.filter((s) => s).length, 8);
});

test('book', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[0] = stack('oak_log', 5);
  const res = ok(r, { o: 'book', r: recipe('oak_planks'), max: 64 });
  eq([res.snd, res.ok && res.n, count(r, 'oak_planks'), count(r, 'oak_log')], ['craft', 20, 20, 0]);
  const one = ok(r, { o: 'book', r: recipe('stick'), max: 1 });
  eq([one.ok && one.n, count(r, 'stick'), count(r, 'oak_planks')], [4, 4, 18]);
  eq([...r.flags].sort(), ['craft:oak_planks', 'craft:stick']);
  assert.equal(refused(r, { o: 'book', r: recipe('torch'), max: 1 }).snd, 'error');
  refused(r, { o: 'book', r: recipe('stick'), max: 2 });
  refused(r, { o: 'book', r: recipe('chest'), max: 1 });
  refused(r, bad({ o: 'book', r: -1, max: 1 }));
  refused(r, bad({ o: 'book', r: recipe('stick') }));

  // made nothing, yet the op was carried out: no room for the result
  const full = rig(), fi = full.s.inv;
  for (let i = 1; i < 36; i++) fi.slots[i] = stack(SWORD, 1);
  fi.slots[0] = stack('oak_planks', 3);
  const none = ok(full, { o: 'book', r: recipe('stick'), max: 1 });
  eq([none.snd, none.msg, none.ok && none.n], ['error', 'No room in your pack', 0]);
  assert.equal(count(full, 'oak_planks') + full.dropped.reduce((n, d) => n + (d.k === 'oak_planks' ? d.n : 0), 0), 3);
});

test('hotkey', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[20] = stack('torch', 7); inv.slots[3] = stack('stick', 2);
  assert.equal(ok(r, { o: 'hotkey', v: [0, 20], i: 3, e: 'torch' }).snd, 'click');
  eq([inv.slots[20], inv.slots[3]], [stack('stick', 2), stack('torch', 7)]);
  inv.slots[4] = stack(HELM, 1);
  assert.equal(ok(r, { o: 'hotkey', v: [1, 0], i: 4, e: '' }).snd, 'dig_cloth');
  eq([inv.armor[0], inv.slots[4]], [stack(HELM, 1), null]);
  assert.equal(r.do({ o: 'hotkey', v: [1, 1], i: 3, e: '' }).snd, 'error');     // a torch in the body slot
  inv.slots[6] = stack(SWORD, 1);
  refused(r, { o: 'hotkey', v: [1, 1], i: 6, e: '' });                           // nor one sword
  refused(r, { o: 'hotkey', v: [1, 1], i: 3, e: '' });
  refused(r, { o: 'hotkey', v: [0, 3], i: 3, e: 'torch' });                      // the slot itself
  refused(r, { o: 'hotkey', v: [0, 30], i: 8, e: '' });                          // both empty
  refused(r, { o: 'hotkey', v: [0, 20], i: 3, e: 'torch' });                     // stale: it holds sticks now
  refused(r, { o: 'hotkey', v: [0, 20], i: 9, e: 'stick' });
  refused(r, bad({ o: 'hotkey', v: [0, 20], i: '3', e: 'stick' }));
});

test('dropSlot, dropCur, dropHeld', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[12] = stack('arrow', 9);
  ok(r, { o: 'dropSlot', v: [0, 12], all: false, e: 'arrow' });
  eq([inv.slots[12], r.dropped], [stack('arrow', 8), [stack('arrow', 1)]]);
  ok(r, { o: 'dropSlot', v: [0, 12], all: true, e: 'arrow' });
  eq([inv.slots[12], r.dropped[1]], [null, stack('arrow', 8)]);
  refused(r, { o: 'dropSlot', v: [0, 12], all: true, e: '' });
  refused(r, { o: 'dropSlot', v: [0, 12], all: true, e: 'arrow' });
  refused(r, bad({ o: 'dropSlot', v: [0, -1], all: true, e: '' }));
  inv.slots[12] = stack('arrow', 2);
  refused(r, bad({ o: 'dropSlot', v: [0, 12], all: 'yes', e: 'arrow' }));

  refused(r, { o: 'dropCur' });
  inv.cursor = stack(SWORD, 1, MOD);
  ok(r, { o: 'dropCur' });
  eq([inv.cursor, r.dropped[2]], [null, stack(SWORD, 1, MOD)]);

  refused(r, { o: 'dropHeld', all: false });                                     // nothing in hand
  inv.sel = 2; inv.slots[2] = stack('coal', 5);
  ok(r, { o: 'dropHeld', all: false });
  eq([inv.slots[2], r.dropped[3]], [stack('coal', 4), stack('coal', 1)]);
  refused(r, bad({ o: 'dropHeld' }));
  ok(r, { o: 'dropHeld', all: true });
  eq([inv.slots[2], r.dropped[4]], [null, stack('coal', 4)]);
});

test('sort', () => {
  const r = rig(chestWin()), inv = r.s.inv;
  inv.slots[0] = stack('cobble', 1);
  inv.slots[35] = stack('cobble', 60); inv.slots[20] = stack('cobble', 50); inv.slots[12] = stack('torch', 3); inv.slots[30] = stack(SWORD, 1); inv.slots[31] = stack(SWORD, 1, MOD);
  ok(r, { o: 'sort', w: 0 });
  const pack = inv.slots.slice(9).filter((s) => s);
  eq(inv.slots[0], stack('cobble', 1), 'the hotbar stays as it is');
  eq(pack.map((s) => s!.k + ':' + s!.n), [SWORD + ':1', SWORD + ':1', 'cobble:99', 'cobble:11', 'torch:3'], 'weapons, then blocks by name, full stacks first');
  assert.equal(pack[0]!.m, MOD, 'the rarer of two swords leads');
  assert.equal(inv.slots.slice(9, 9 + pack.length).every((s) => s), true, 'packed to the front');
  r.chest[26] = stack('stick', 2); r.chest[3] = stack('stick', 3);
  ok(r, { o: 'sort', w: 1 });
  eq([r.chest[0], r.chest.filter((s) => s).length], [stack('stick', 5), 1]);
  refused(r, bad({ o: 'sort', w: 2 }));
  refused(r, bad({ o: 'sort' }));
  r.open(null);
  refused(r, { o: 'sort', w: 1 });
  // names are ordered by code unit, the same on every machine: a capital sorts before any small letter
  eq([sortCompare('Zinc', 'apple'), sortCompare('b', 'a'), sortCompare('a', 'a')], [-1, 1, 0]);
});

test('takeAll and stash', () => {
  const r = rig(chestWin()), inv = r.s.inv;
  r.chest[0] = stack('flint', 30); r.chest[9] = stack(SWORD, 1);
  inv.slots[5] = stack('flint', 80);
  ok(r, { o: 'takeAll' });
  eq([r.chest.filter((s) => s).length, count(r, 'flint'), count(r, SWORD)], [0, 110, 1]);
  refused(r, { o: 'takeAll' });                                                  // the chest is empty
  for (let i = 0; i < 36; i++) inv.slots[i] = stack(SWORD, 1);
  r.chest[1] = stack('flint', 2);
  assert.equal(refused(r, { o: 'takeAll' }).msg, 'No room in your pack');

  const q = rig(chestWin()), qi = q.s.inv;
  q.chest[0] = stack('feather', 4);
  qi.slots[3] = stack('feather', 5); qi.slots[15] = stack('feather', 6); qi.slots[16] = stack('coal', 6);
  ok(q, { o: 'stash' });
  eq([q.chest[0], qi.slots[3], qi.slots[15], qi.slots[16]], [stack('feather', 10), stack('feather', 5), null, stack('coal', 6)], 'only the backpack, only what the chest already holds');
  refused(q, { o: 'stash' });
  q.open(null);
  refused(q, { o: 'stash' }); refused(q, { o: 'takeAll' });
});

test('buy and buyBack', () => {
  const r = rig(shopWin()), inv = r.s.inv;
  const [k, price] = goods(NPCS.find((n) => n.key === 'wayfinder')!, r.flags)[0];
  inv.coins = price * 25;
  assert.equal(ok(r, { o: 'buy', k, bulk: false }).snd, 'coin');
  eq([count(r, k), inv.coins], [1, price * 24]);
  ok(r, { o: 'buy', k, bulk: true });
  eq([count(r, k), inv.coins], [1 + Math.min(10, item(k).stack), price * (24 - Math.min(10, item(k).stack))], 'shift buys up to ten');
  refused(r, { o: 'buy', k: 'cobble', bulk: false });                            // not on this shelf
  refused(r, bad({ o: 'buy', k, bulk: 1 }));
  refused(r, bad({ o: 'buy', k: 7, bulk: false }));
  inv.coins = price - 1;
  eq([refused(r, { o: 'buy', k, bulk: false }).msg, inv.coins], ['Not enough coins', price - 1]);

  inv.slots[30] = stack('cobble', 12);
  ok(r, { o: 'quick', v: [0, 30], e: 'cobble' });
  const sale = r.s.window!.sold[0], had = inv.coins;
  refused(r, { o: 'buyBack', id: sale.id + 1 });
  assert.equal(ok(r, { o: 'buyBack', id: sale.id }).snd, 'coin');
  eq([count(r, 'cobble'), inv.coins, r.s.window!.sold], [12, had - sale.price, []]);
  refused(r, { o: 'buyBack', id: sale.id });
  inv.slots[31] = stack(SWORD, 1);
  ok(r, { o: 'quick', v: [0, 31], e: SWORD });
  inv.coins = 0;
  refused(r, { o: 'buyBack', id: r.s.window!.sold[0].id });                      // cannot pay for it
  for (let i = 0; i < 9; i++) { inv.slots[i] = stack('cobble', i + 1); ok(r, { o: 'quick', v: [0, i], e: 'cobble' }); }
  assert.equal(r.s.window!.sold.length, 8, 'the list keeps the newest eight');
  r.open(null);
  refused(r, { o: 'buy', k, bulk: false });
});

test('spend', () => {
  const r = rig(), st = r.s.stats;
  refused(r, { o: 'spend', a: 'vit' });                                          // no points
  st.points = 2;
  assert.equal(ok(r, { o: 'spend', a: 'vit' }).snd, 'click');
  eq([st.attr.vit, st.points, st.maxHp], [1, 1, 106]);
  for (const a of ['hp', '', 'toString', '__proto__', 3]) refused(r, bad({ o: 'spend', a }));
});

test('pick', () => {
  const r = rig(), inv = r.s.inv;
  inv.slots[0] = stack('stick', 1); inv.slots[20] = stack('cobble', 40);
  ok(r, { o: 'pick', id: B.cobble });
  eq([inv.sel, inv.slots[1], inv.slots[20]], [1, stack('cobble', 40), null], 'from the pack to the first free hotbar slot');
  ok(r, { o: 'sel', i: 0 }); ok(r, { o: 'pick', id: B.cobble });
  assert.equal(inv.sel, 1);
  refused(r, { o: 'pick', id: B.oak_planks });                                   // none carried
  for (const id of [-1, BLOCKS.length, 1.5, 'cobble', 0]) refused(r, bad({ o: 'pick', id }));
  r.creative = true;
  ok(r, { o: 'pick', id: B.oak_planks });
  eq(inv.held(), stack('oak_planks', item('oak_planks').stack), 'creative makes a stack');
});

test('tidy and close', () => {
  const r = rig(shopWin()), inv = r.s.inv;
  inv.craft[0] = stack('oak_log', 2); inv.craft[7] = stack('stick', 1); inv.cursor = stack('coal', 4); inv.slots[8] = stack('cobble', 3);
  r.s.window!.sold.push({ id: 99, it: stack('flint', 1), price: 1 });
  ok(r, { o: 'tidy', cover: true });
  eq([inv.craft.filter((s) => s).length, inv.cursor, count(r, 'oak_log'), count(r, 'stick'), count(r, 'coal')], [0, null, 2, 1, 4]);
  eq([r.s.window?.mode, r.s.window?.covered, r.s.window?.sold.length], ['shop', true, 1], 'the window and its list stay under the Guide');
  ok(r, { o: 'quick', v: [0, 8], e: 'cobble' });
  eq([inv.coins, inv.slots[8], count(r, 'cobble')], [0, null, 3], 'under the Guide a shift-click moves the stack; it is not sold');
  refused(r, { o: 'buyBack', id: 99 });
  ok(r, { o: 'tidy', cover: false });
  assert.equal(r.s.window?.covered, false);
  inv.coins = 5;
  ok(r, { o: 'buyBack', id: 99 });
  refused(r, bad({ o: 'tidy' }));
  refused(r, bad({ o: 'tidy', cover: 1 }));

  inv.craft[1] = stack(BODY, 1); inv.cursor = stack(SWORD, 1, MOD);
  for (let i = 0; i < 36; i++) if (!inv.slots[i]) inv.slots[i] = stack(HELM, 1);
  ok(r, { o: 'close' });
  eq([r.s.window, inv.cursor, inv.craft[1]], [null, null, null]);
  eq(r.dropped, [stack(BODY, 1), stack(SWORD, 1, MOD)], 'what the pack cannot take is thrown out, not lost');
  ok(r, { o: 'close' });                                                          // closing nothing is harmless
});

test('_held and _slot', () => {
  const r = rig(), inv = r.s.inv;
  refused(r, { o: '_held', n: 1 });
  inv.slots[0] = stack('cobble', 3); inv.slots[20] = stack('arrow', 2);
  ok(r, { o: '_held', n: 1 });
  eq(inv.slots[0], stack('cobble', 2));
  ok(r, { o: '_slot', i: 20, n: 2 });
  assert.equal(inv.slots[20], null);
  refused(r, { o: '_slot', i: 20, n: 1 });
  for (const n of [0, -1, 0.5, '1']) { refused(r, bad({ o: '_held', n })); refused(r, bad({ o: '_slot', i: 0, n })); }
  refused(r, bad({ o: '_slot', i: 36, n: 1 }));
});

test('what is not an op', () => {
  const r = rig();
  r.s.inv.slots[0] = stack('cobble', 3);
  for (const o of [null, undefined, 0, 'close', [], {}, { o: 'closed' }, { o: 7 }, { o: 'toString' }, { o: '__proto__' }, { v: [0, 0] }]) refused(r, bad(o));
});

// ---- the long run -------------------------------------------------------------------------------

const OPS = ['sel', 'click', 'place', 'gather', 'quick', 'out', 'lay', 'book', 'hotkey', 'dropSlot', 'dropCur', 'dropHeld', 'sort', 'takeAll', 'stash',
  'buy', 'buyBack', 'spend', 'pick', 'tidy', 'close', '_held', '_slot'] as const;
const WEIGHT: Partial<Record<(typeof OPS)[number], number>> = { click: 22, place: 8, quick: 12, hotkey: 6, book: 6, lay: 4, out: 6, gather: 3, buy: 3, tidy: 0.4, close: 0.3 };

test('20,000 random ops conserve items and coins', (t) => {
  const rnd = mulberry32(20261111), ri = (n: number): number => Math.floor(rnd() * n), chance = (p: number): boolean => rnd() < p;
  const pick = <T>(l: readonly T[]): T => l[ri(l.length)];
  const r = rig(), s = r.s, inv = s.inv;
  const keys = [...ITEMS.keys()], mats = ['oak_log', 'oak_planks', 'stick', 'cobble', 'coal', 'iron_ore', 'iron_bar', 'fiber', 'flint', 'feather', 'torch', 'arrow', 'hide', 'stone'], mods = [...MOD_BY_KEY.keys()];
  const wear = keys.filter((k) => item(k).armor || item(k).acc || (item(k).weapon && !item(k).tool)), blocks = BLOCKS.map((_, i) => i);
  const bag: [string, number][] = OPS.map((o) => [o, WEIGHT[o] ?? 2]), total = bag.reduce((n, b) => n + b[1], 0);
  const wins: (() => Win | null)[] = [() => null, () => null, () => station('workbench'), () => station('anvil'), chestWin, chestWin, forgeWin, () => shopWin(pick(NPCS).key), () => shopWin(pick(NPCS).key)];

  const totals = (): Map<string, number> => {
    const m = new Map<string, number>(), add = (x: Slot | Item): void => { if (x) m.set(x.k, (m.get(x.k) ?? 0) + x.n); };
    for (const arr of [inv.slots, inv.armor, inv.acc, inv.craft, r.chest, r.forge, r.dropped]) for (const x of arr) add(x);
    add(inv.cursor);
    return m;
  };
  /** Net change of every key as [key, delta] pairs, zeroes left out. */
  const delta = (a: Map<string, number>, b: Map<string, number>): [string, number][] => {
    const out: [string, number][] = [];
    for (const k of new Set([...a.keys(), ...b.keys()])) { const d = (b.get(k) ?? 0) - (a.get(k) ?? 0); if (d) out.push([k, d]); }
    return out;
  };
  const supply = (): void => {
    for (let i = 0; i < 8; i++) { const k = chance(0.7) ? pick(mats) : pick(keys); inv.add({ k, n: 1 + ri(item(k).stack) }); }
    for (let i = 0; i < 3; i++) { const at = ri(36); if (!inv.slots[at]) inv.slots[at] = stack(pick(wear), 1, chance(0.4) ? pick(mods) : undefined); }
    for (let i = 0; i < 5; i++) if (chance(0.5)) inv.slots[ri(36)] = null;
    if (chance(0.25)) for (let i = 0; i < 36; i++) if (!inv.slots[i]) { const k = chance(0.5) ? pick(wear) : pick(mats); inv.slots[i] = stack(k, item(k).stack); }
    if (chance(0.3)) r.chest[ri(27)] = stack(pick(mats), 1 + ri(60));
    inv.coins += ri(400); s.stats.points += ri(2); r.creative = chance(0.2);
    if (chance(0.5)) r.flags.add(pick(['boss:2', 'boss:3', 'boss:4', 'dim:1', 'dim:2']));
    r.dropped.length = 0;
  };
  const ref = (): SlotRef => {
    const c = chance(0.03) ? ri(8) - 1 : pick([0, 0, 0, 0, 1, 2, 3, 3, 4, 4, 4]);
    const size = [36, 3, 5, 9, s.box?.kind === 'forge' ? 3 : 27][c] ?? 4;
    return [c as SlotRef[0], chance(0.03) ? pick([-1, size, size + 3, 0.5, NaN]) : ri(size)];
  };
  const at = (v: SlotRef): Slot => ([inv.slots, inv.armor, inv.acc, inv.craft, s.box?.s ?? []][v[0]] ?? [])[v[1]] ?? null;
  const seen = (v: SlotRef): string => (chance(0.06) ? pick(['', 'cobble', 'stick', 'no_such_item']) : at(v)?.k ?? '');
  const junk: unknown[] = [null, undefined, 3, 'click', {}, { o: 'nope' }, { o: 'click' }, { o: 'click', v: 'x', r: false, e: '' }, { o: 'quick', v: [0], e: '' }, { o: 'buy' }, { o: 'book', r: 1e9, max: 64 },
    { o: 'spend', a: 'constructor' }, { o: 'sort', w: -1 }, { o: 'hotkey', v: [0, 0], i: 99, e: '' }, { o: 'pick', id: 1e9 }, { o: 'lay', r: NaN }, { o: 'dropSlot', v: [4, 1e9], all: true, e: '' }];
  const make = (): InvOp => {
    if (chance(0.04)) return bad(pick(junk));
    let t = rnd() * total, o: string = OPS[0];
    for (const [k, w] of bag) { t -= w; if (t <= 0) { o = k; break; } }
    const v = ref(), w = s.window && !s.window.covered ? s.window : null;
    switch (o) {
      case 'sel': return { o, i: chance(0.1) ? 9 : ri(9) };
      case 'click': return { o, v, r: chance(0.35), e: seen(v) };
      case 'place': return { o, v, one: chance(0.5) };
      case 'quick': return { o, v, e: seen(v) };
      case 'out': return { o, all: chance(0.5) };
      case 'lay': case 'book': {
        const gridW = w?.mode === 'station' ? 3 : 2, can = RECIPES.map((_, i) => i).filter((i) => recipeFits(RECIPES[i], w?.station ?? 'hand', gridW) && canAfford(inv, RECIPES[i], inv.craft));
        const q = can.length && chance(0.8) ? pick(can) : chance(0.1) ? -1 : ri(RECIPES.length);
        return o === 'lay' ? { o, r: q } : { o, r: q, max: chance(0.05) ? 5 : chance(0.5) ? 1 : 64 };
      }
      case 'hotkey': return { o, v, i: chance(0.05) ? 9 : ri(9), e: seen(v) };
      case 'dropSlot': return { o, v, all: chance(0.5), e: seen(v) };
      case 'dropHeld': return { o, all: chance(0.5) };
      case 'sort': return bad({ o, w: chance(0.05) ? 2 : ri(2) });
      case 'buy': { const n = NPCS.find((q) => q.key === w?.npc), g = n ? goods(n, r.flags) : []; return { o, k: g.length && chance(0.9) ? pick(g)[0] : pick(keys), bulk: chance(0.4) }; }
      case 'buyBack': return { o, id: w?.sold.length && chance(0.9) ? pick(w.sold).id : ri(50) };
      case 'spend': return bad({ o, a: chance(0.9) ? pick(['str', 'agi', 'vit', 'arc']) : 'luck' });
      case 'pick': { const h = inv.slots.filter((x) => x && item(x.k).block !== undefined); return { o, id: h.length && chance(0.6) ? item(pick(h)!.k).block! : chance(0.05) ? -3 : pick(blocks) }; }
      case 'tidy': return bad({ o, cover: chance(0.1) ? 'x' : chance(0.5) });
      case '_held': return { o, n: chance(0.1) ? 0 : 1 + ri(3) };
      case '_slot': return { o, i: chance(0.05) ? 36 : ri(36), n: chance(0.1) ? -1 : 1 + ri(3) };
      default: return bad({ o });
    }
  };

  const tally = new Map<string, [ok: number, no: number]>();
  let made = 0, sold = 0, bought = 0;
  for (let step = 0; step < 20000; step++) {
    if (step % 40 === 0) supply();
    if (step % 150 === 0) r.open(pick(wins)());
    const op = make(), name = op && typeof op === 'object' && typeof op.o === 'string' ? op.o : 'junk', say = `step ${step}: ${JSON.stringify(op)}`;
    const before = totals(), coins = inv.coins, state = snap(r), w = s.window && !s.window.covered ? s.window : null, held = inv.held() && { ...inv.held()! };
    // what the op is about, read before it runs
    const cell = (name === 'quick' || name === '_slot') ? ('v' in op ? at(op.v) : inv.slots[(op as { i: number }).i] ?? null) : null, target = cell ? { ...cell } : null;
    const gridW = w?.mode === 'station' ? 3 : 2, grid = gridW === 2 ? inv.craft.slice(0, 4) : inv.craft;
    const spells = name === 'out' && (!w || w.mode === 'station') ? matchRecipe(grid, gridW, w?.station ?? 'hand') : null;
    const offer = name === 'buyBack' ? w?.sold.find((x) => x.id === (op as { id: number }).id) ?? null : null;
    const had = name === 'pick' && Number.isInteger((op as { id: number }).id) ? BLOCKS[(op as { id: number }).id] : undefined;

    let res: OpResult;
    try { res = r.do(op); } catch (e) { assert.fail(`${say} threw ${e}`); }
    const t = tally.get(name) ?? [0, 0]; t[res.ok ? 0 : 1]++; tally.set(name, t);
    const d = delta(before, totals()), net = d.reduce((n, x) => n + x[1], 0), dc = inv.coins - coins;
    if (!res.ok) { assert.equal(snap(r), state, `${say}: refused, yet something changed`); continue; }

    const units = (q: Recipe): number => needs(q).reduce((n, x) => n + x[1], 0);
    if (name === 'book') {
      const q = RECIPES[(op as { r: number }).r], n = res.n ?? 0;
      assert.equal(n % q.n, 0, say);
      assert.equal(net, n - (n / q.n) * units(q), `${say}: a craft makes n and uses one unit per cell per batch`);
      assert.equal(dc, 0, say); made += n;
    } else if (name === 'out') {
      const n = res.n ?? 0;
      assert.ok(n > 0 && spells, say);
      if (!(op as { all: boolean }).all) assert.deepEqual([n, net], [spells!.n, spells!.n - units(spells!)], say);
      else assert.ok(net <= n && d.every(([k, x]) => x < 0 || RECIPES.some((q) => q.out === k)), `${say}: only a recipe's output may appear`);
      assert.equal(dc, 0, say); made += n;
    } else if (name === 'quick' && w?.mode === 'shop' && (op as { v: SlotRef }).v[0] === 0) {
      assert.deepEqual(d, [[target!.k, -target!.n]], `${say}: a sale takes exactly the stack`);
      assert.equal(dc, sellPrice(target!.k) * target!.n, say);
      assert.deepEqual(w.sold[w.sold.length - 1], { id: r.seq, it: target, price: dc }, say);
      assert.ok(w.sold.length <= 8, say); sold++;
    } else if (name === 'buy') {
      const g = goods(NPCS.find((q) => q.key === w!.npc)!, r.flags).find((x) => x[0] === (op as { k: string }).k)!, [k, price, cur] = g;
      const n = d.find((x) => x[0] === k)?.[1] ?? 0;
      assert.ok(n >= 1 && n <= 10, say);
      if (cur === 'coins') assert.deepEqual([d, dc], [[[k, n]], -price * n], `${say}: paid for at the shelf price`);
      else assert.deepEqual([new Map(d), dc], [new Map([[k, n], [cur, -price * n]]), 0], say);
      bought++;
    } else if (name === 'buyBack') {
      assert.deepEqual([d, dc], [[[offer!.it.k, offer!.it.n]], -offer!.price], `${say}: bought back at the price it sold for`);
    } else if (name === 'pick' && d.length) {
      const key = ITEMS.has(had!.key) ? had!.key : had!.drops[0][0];
      assert.ok(r.creative, `${say}: only creative makes items`);
      assert.deepEqual([d, dc], [[[key, item(key).stack]], 0], say);
    } else if (name === '_held') {
      assert.deepEqual([d, dc], [[[held!.k, -Math.min(held!.n, (op as { n: number }).n)]], 0], say);
    } else if (name === '_slot') {
      assert.deepEqual([d, dc], [[[target!.k, -Math.min(target!.n, (op as { n: number }).n)]], 0], say);
    } else assert.deepEqual([d, dc], [[], 0], `${say}: nothing may be made or lost`);

    // what holds after any op
    const every: [Slot[], string][] = [[inv.slots, 'pack'], [inv.armor, 'armour'], [inv.acc, 'trinkets'], [inv.craft, 'grid'], [r.chest, 'chest'], [r.forge, 'forge'], [[inv.cursor], 'cursor']];
    for (const [arr, what] of every) for (const x of arr) if (x) assert.ok(Number.isInteger(x.n) && x.n >= 1 && x.n <= item(x.k).stack, `${say}: ${what} holds ${x.k} x ${x.n}`);
    inv.armor.forEach((x, i) => { if (x) assert.equal(item(x.k).armor?.slot, i, `${say}: ${x.k} worn in armour slot ${i}`); });
    for (const x of inv.acc) if (x) assert.ok(item(x.k).acc && x.n === 1 && inv.acc.filter((y) => y && y.k === x.k).length === 1, `${say}: trinket row holds ${x.k}`);
    if (r.forge[0]) assert.ok(smeltable(r.forge[0].k, 1), `${say}: forge ore slot holds ${r.forge[0].k}`);
    if (r.forge[1]) assert.ok(accepts('ffuel', 1, r.forge[1], inv.acc, 1), `${say}: forge fuel slot holds ${r.forge[1].k}`);
    assert.ok(inv.sel >= 0 && inv.sel <= 8 && inv.coins >= 0 && s.stats.points >= 0, say);
  }
  for (const o of OPS) {
    const [yes, no] = tally.get(o) ?? [0, 0];
    assert.ok(yes > 0, `no ${o} was accepted in the run`);
    if (o !== 'close') assert.ok(no > 0, `no ${o} was refused in the run`);
  }
  t.diagnostic('accepted / refused: ' + OPS.map((o) => `${o} ${tally.get(o)![0]}/${tally.get(o)![1]}`).join(', ') + `, not an op 0/${tally.get('junk')?.[1] ?? 0}; crafted ${made}, sold ${sold}, bought ${bought}`);
  assert.ok(made > 200 && sold > 50 && bought > 20, `the run crafted ${made}, sold ${sold} stacks and bought ${bought} times`);
});
