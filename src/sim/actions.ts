// What a player does to the world: break, place, use, eat, strike, shoot, throw away.
// Effects the acting client has already played for itself (the break burst and sound, a placement
// sound, its bow) go to everyone else: they are emitted with `not` set to the actor's slot.
import { BUILD_MAX } from '../core/constants';
import { B, BLOCKS, T_LIQUID, T_OPAQUE, T_REPLACE, T_SOLID } from '../data/blocks';
import { hashInt, mulberry32 } from '../core/noise';
import type { Slot } from './inventory';
import { ITEMS, type Item, article, item } from '../data/items';
import { BOSSES } from '../data/mobs';
import { chestWire, forgeWire, invWire, shopWire } from '../net/invsync';
import { type BoxWire, type C2SOf, DIG_R, type S2COf } from '../net/protocol';
import { BURST } from './fx';
import { bossSummoned } from './boss';
import { collapseGate, placeGate } from './gates';
import { type InvOp, type OpResult, type OpState, applyOp } from './invops';
import { mobDist } from './mobhit';
import { defIndex } from './mobs';
import { npcOf } from './npcs';
import { type SimPlayer, active, recall, useBed } from './player';
import type { Realm } from './realm';
import * as rules from './rules';
import type { Sim } from './sim';

export const DIG_SURPLUS = 1.0, ACT_SURPLUS = 0.5;
/** Use kinds that open a crafting station, and which. */
export const STATIONS: Record<string, string> = { workbench: 'workbench', anvil: 'anvil', runeloom: 'runeloom', tinker: 'tinker' };
/** A block and the face of it that was touched. */
export interface BlockHit { x: number; y: number; z: number; nx: number; ny: number; nz: number; id: number }

const dirOf = (p: SimPlayer): [number, number, number] => { const b = p.body, cp = Math.cos(b.pitch); return [-Math.sin(b.yaw) * cp, Math.sin(b.pitch), -Math.cos(b.yaw) * cp]; };
const tell = (sim: Sim, p: SimPlayer, text: string, color: string): void => sim.sink.emit({ p: p.slot }, ['t', text, color]);

/** Throw a stack out in front of the player, from the eye. */
export function dropItem(sim: Sim, p: SimPlayer, it: Item): void {
  const b = p.body, [dx, dy, dz] = dirOf(p);
  sim.realms[p.dim].drops.spawn(b.x + dx * 0.4, b.y + b.eye - 0.3, b.z + dz * 0.4, it, dx * 5, dy * 5 + 1.5, dz * 5, 1.2);
}
/** One inventory or container op of this player, carried out on the state the simulation holds.
 *  `seq` is the op's place in the player's stream; it seeds the op's own random draws. An op that reaches into the open
 *  window finds that window again first (5.2): if it is gone the window ends as op `close` ends it and the op is refused. */
export function invOp(sim: Sim, p: SimPlayer, seq: number, op: InvOp): OpResult {
  const w = p.window, realm = sim.realms[p.dim], wire = op !== null && typeof op === 'object' && typeof op.o === 'string' && op.o[0] !== '_';
  if (wire && w && !w.covered && touches(op, w) && !resolve(sim, p)) {
    endWindow(sim, p);
    p.ackSeq = seq; p.invDirty = true;
    return { ok: false };
  }
  // a container is named by its cell and looked up again for every op
  let ent = w && !w.covered && (w.mode === 'chest' || w.mode === 'forge') ? realm.getEnt(w.x!, w.y!, w.z!) : null;
  if (ent && (ent.kind !== w!.mode || !ent.data.s)) ent = null;
  let rnd: (() => number) | null = null;
  const st: OpState = { inv: p.inv, stats: p.stats, window: w, box: ent ? { kind: ent.kind as 'chest' | 'forge', s: ent.data.s, level: ent.data.level } : null };
  const r = wire ? applyOp(st, op, {
    seq, flags: sim.flags, creative: p.modes.creative,
    rnd: () => (rnd ??= mulberry32(hashInt(p.rngSeed, seq, 40503, 0)))(),
    drop: (it) => dropItem(sim, p, it), flag: (f) => sim.addFlag(f),
  }) : { ok: false as const };
  p.ackSeq = seq; p.invDirty = true;
  if (w && !st.window) { leaveViewers(sim, p, w); p.window = null; }
  if (r.ok) {
    // anything done with a container open may have moved items into it: its chunk is saved, a forge window redraws,
    // and every other player looking into it is sent the new contents
    if (ent) {
      if (ent.kind === 'forge') ent.data.rev++;
      realm.touchEnt(ent);
      const v = realm.viewers.get(`${ent.x},${ent.y},${ent.z}`);
      if (v) for (const q of v) q.invDirty = true;
    }
    // the dig is held to the fastest break the hand has had since it started
    const d = p.dig;
    if (d) d.bt = Math.min(d.bt, rules.breakTimeMin(d.id, p.inv, p.stats, p.modes));
  }
  return r;
}
/** Does the op reach into the open window: its container, its grid at a station, its recipes, its shelf? */
function touches(op: InvOp, w: NonNullable<SimPlayer['window']>): boolean {
  switch (op.o) {
    case 'click': case 'place': case 'quick': case 'hotkey': case 'dropSlot': {
      const c = Array.isArray(op.v) ? op.v[0] : -1;
      // from the pack, a shift-click loads the container or sells to the shop
      return c === 4 || (c === 3 && w.mode === 'station') || (op.o === 'quick' && c === 0 && w.mode !== 'station');
    }
    case 'gather': return w.mode === 'chest';
    case 'out': case 'lay': case 'book': return w.mode === 'station';
    case 'sort': return op.w === 1;
    case 'takeAll': case 'stash': return true;
    case 'buy': case 'buyBack': return w.mode === 'shop';
    default: return false;
  }
}
const eyeOf = (p: SimPlayer): [number, number, number] => { const b = p.body; return [b.x, b.y + b.eye, b.z]; };
/** From a point to the nearest point of a block cell. */
function cellDist(x: number, y: number, z: number, px: number, py: number, pz: number): number {
  const dx = Math.max(x - px, 0, px - x - 1), dy = Math.max(y - py, 0, py - y - 1), dz = Math.max(z - pz, 0, pz - z - 1);
  return Math.hypot(dx, dy, dz);
}
const inReach = (p: SimPlayer, x: number, y: number, z: number, extra: number): boolean => { const [ex, ey, ez] = eyeOf(p); return cellDist(x, y, z, ex, ey, ez) <= rules.reach(p.stats, p.modes) + extra; };
/** A shop stays open while its townsperson is alive and this near. */
const SHOP_R = 7, TALK_R = 5;
/** Seconds a townsperson stands still and faces the player after a `talk`, renewed while its shop is open. */
const TALK_HOLD = 6;
/** Is the open window still there (5.2)? A ready chunk, the block with its use, the entity of its kind, the player within
 *  reach + 2; for a shop the townsperson alive and within 7 blocks. */
export function resolve(sim: Sim, p: SimPlayer): boolean {
  const w = p.window;
  if (!w) return true;
  const realm = sim.realms[p.dim], [ex, ey, ez] = eyeOf(p);
  if (w.mode === 'shop') {
    const m = w.mob !== undefined ? realm.mobs.byId(w.mob) : null;
    return !!m && npcOf(m.def.key)?.key === w.npc && mobDist(m, ex, ey, ez) <= SHOP_R;
  }
  const { x, y, z } = w;
  if (x === undefined || y === undefined || z === undefined || !realm.ready(x, z)) return false;
  const use = BLOCKS[realm.getBlock(x, y, z)]?.use ?? '';
  if (w.mode === 'station' ? STATIONS[use] !== w.station : w.mode === 'chest' ? use !== 'chest' : !use.startsWith('forge')) return false;
  if (w.mode !== 'station') { const e = realm.getEnt(x, y, z); if (!e || e.kind !== w.mode || !e.data.s) return false; }
  return cellDist(x, y, z, ex, ey, ez) <= rules.reach(p.stats, p.modes) + 2;
}
/** The once-a-second check of an open window: one that is gone ends as op `close` ends it, and an `st` with `box: null` is due. */
export function revalidate(sim: Sim, p: SimPlayer): boolean {
  const w = p.window;
  if (!w) return true;
  if (resolve(sim, p)) {
    // a townsperson stands to trade for as long as a shop of theirs is open, so that it is the player who ends it
    if (w.mode === 'shop') sim.realms[p.dim].mobs.byId(w.mob!)!.talk = TALK_HOLD;
    return true;
  }
  endWindow(sim, p);
  return false;
}
/** End the player's window as op `close` does (grid and cursor back to the pack, out of the viewers), under the sequence
 *  number the player is at. The next `st` says `box: null`. */
export function endWindow(sim: Sim, p: SimPlayer): void { invOp(sim, p, p.ackSeq, { o: 'close' }); }
function leaveViewers(sim: Sim, p: SimPlayer, w: NonNullable<SimPlayer['window']>): void {
  if (w.x === undefined || w.mode === 'shop') return;
  const realm = sim.realms[p.dim], k = `${w.x},${w.y},${w.z}`, v = realm.viewers.get(k);
  if (v && v.delete(p) && !v.size) realm.viewers.delete(k);
}
/** Open a window on the sim. A station, chest or forge makes the player one of its cell's viewers. */
function setWindow(sim: Sim, p: SimPlayer, w: NonNullable<SimPlayer['window']>): void {
  if (p.window) leaveViewers(sim, p, p.window);
  p.window = w;
  if (w.x === undefined || w.mode === 'shop') return;
  const realm = sim.realms[p.dim], k = `${w.x},${w.y},${w.z}`, v = realm.viewers.get(k);
  if (v) v.add(p); else realm.viewers.set(k, new Set([p]));
}

// ---- the inventory snapshot ----------------------------------------------------------------------

/** What the client was last sent: the inventory and the box as JSON ('' nothing open, 'station' a station, 'closed' let go by
 *  a `close` op), and the ack. */
const SENT = new WeakMap<SimPlayer, { inv: string; box: string; ack: number }>();
/** The open container as it travels; null for a station, for no window, and for a container that is gone. */
export function boxOf(sim: Sim, p: SimPlayer): BoxWire | null {
  const w = p.window;
  if (!w) return null;
  if (w.mode === 'shop') return shopWire(w.npc ?? '', w.sold);
  if (w.mode === 'station' || w.x === undefined) return null;
  const e = sim.realms[p.dim].getEnt(w.x, w.y!, w.z!);
  if (!e || e.kind !== w.mode || !e.data.s) return null;
  return e.kind === 'chest' ? chestWire(e.x, e.y, e.z, e.data.s) : forgeWire(e.x, e.y, e.z, e.data);
}
/** The `st` due for this player (`invDirty`, which it clears): the ack, and the inventory and the box where they changed
 *  since the last one built. Null when there is nothing the client has not been told. `all`: the first after a bind. */
export function stOf(sim: Sim, p: SimPlayer, all = false): S2COf<'st'> | null {
  p.invDirty = false;
  let s = SENT.get(p);
  if (!s || all) SENT.set(p, (s = { inv: '', box: '', ack: -1 }));
  const m: S2COf<'st'> = { t: 'st', ack: p.ackSeq };
  const iw = invWire(p.inv, p.stats, p.rngSeed), ij = JSON.stringify(iw);
  if (ij !== s.inv) { m.inv = iw; s.inv = ij; }
  const bw = boxOf(sim, p), bj = bw ? JSON.stringify(bw) : p.window ? 'station' : '';
  if (bj !== s.box) {
    if (bw) m.box = bw;
    // a station has no box: the client opened it itself, and a null would close it
    else if (!p.window) m.box = null;
    s.box = bj;
  }
  if (!all && !m.inv && m.box === undefined && m.ack === s.ack) return null;
  s.ack = m.ack;
  return m;
}
/** The window opened: the client is told what is in it, then that it is open. */
function announce(sim: Sim, p: SimPlayer, m: S2COf<'open'>): void {
  const st = stOf(sim, p);
  if (st) sim.sink.send(p.slot, st);
  sim.sink.send(p.slot, m);
}

/** Roll a loot table for the player who opened or broke its container; the coins are theirs. */
function rollLoot(sim: Sim, p: SimPlayer, table: string): Item[] {
  const { items, coins } = rules.rollLoot(table, sim.rnd);
  if (coins) { p.inv.coins += coins; p.inv.touch(); tell(sim, p, `+${coins} coins`, '#f2c14e'); }
  return items;
}

/** Break a block as the world would (no tool check): pops plants, torches and the like. */
export function breakNatural(realm: Realm, x: number, y: number, z: number): void {
  const id = realm.getBlock(x, y, z), rnd = realm.sim.rnd;
  if (!id) return;
  realm.setBlock(x, y, z, 0);
  for (const [k, c, a, b] of BLOCKS[id].drops) if (rnd() < c) realm.drops.spawn(x + 0.5, y + 0.3, z + 0.5, { k, n: a + Math.floor(rnd() * (b - a + 1)) });
}
/** The player finished mining the block `id` at this cell. */
export function breakBlock(sim: Sim, p: SimPlayer, x: number, y: number, z: number, id: number): boolean {
  const w = sim.realms[p.dim], rnd = sim.rnd, b = BLOCKS[id], harvest = rules.canHarvest(id, p.inv) && !p.modes.creative;
  const e = w.getEnt(x, y, z);
  // nobody may still be looking into a container whose stacks are about to lie on the ground
  if (e) w.closeViewers(x, y, z);
  if (e) {
    const s: Slot[] = e.kind === 'crate' ? rollLoot(sim, p, e.data.loot) : e.data.s || (e.data.loot ? rollLoot(sim, p, e.data.loot) : []);
    for (const it of s) if (it) w.drops.spawn(x + 0.5, y + 0.5, z + 0.5, it);
    w.removeEnt(x, y, z);
  }
  if (b.use === 'guestbed' && p.dim === 0) sim.npcs.removeBed(x, y, z);
  if (b.door) { for (const dy of [-1, 1]) if (w.getBlock(x, y + dy, z) === id) w.setBlock(x, y + dy, z, 0); }
  w.setBlock(x, y, z, 0);
  if ((id === B.hollow_frame && p.dim !== 1) || (id === B.rift_frame && p.dim !== 2)) collapseGate(w, p, x, y, z, id === B.hollow_frame ? 1 : 2);
  sim.sink.emit({ dim: p.dim, x, y, z, r: 64, not: p.slot }, ['p', BURST.block, x, y, z, id, 0]);
  sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', 'break_' + b.sound, 0.9, 1, x + 0.5, y + 0.5, z + 0.5]);
  p.stats.exhaustion += 0.02;
  sim.addFlag('mine:' + b.key);
  if (harvest) for (const [k, c, lo, hi] of b.drops) if (rnd() < c) w.drops.spawn(x + 0.5, y + 0.4, z + 0.5, { k, n: lo + Math.floor(rnd() * (hi - lo + 1)) }, undefined, undefined, undefined, 0.25);
  return true;
}

export const placeSound = (id: number): string => { const s = BLOCKS[id].sound; return s === 'stone' || s === 'metal' ? 'place' : 'dig_' + s; };

/** Right-click on a block that does something. False when this block does nothing. A door has been toggled by the
 *  client that asks, which played its sound, so only the others hear it. */
export function useBlock(sim: Sim, p: SimPlayer, hit: BlockHit, use: string): boolean {
  const w = sim.realms[p.dim], { x, y, z } = hit, b = p.body, own = { p: p.slot };
  if (STATIONS[use]) { setWindow(sim, p, { mode: 'station', station: STATIONS[use], x, y, z, sold: [] }); return true; }
  if (use.startsWith('forge')) {
    let e = w.getEnt(x, y, z);
    if (!e) e = w.setEnt(x, y, z, 'forge', { s: [null, null, null], burn: 0, burnMax: 0, prog: 0, need: 0, level: +use.slice(5), rev: 0 });
    if (e) { setWindow(sim, p, { mode: 'forge', x, y, z, sold: [] }); announce(sim, p, { t: 'open', mode: 'forge' }); }
    return true;
  }
  if (use === 'chest') {
    let e = w.getEnt(x, y, z);
    if (!e) e = w.setEnt(x, y, z, 'chest', { s: null, loot: null });
    if (!e) return true;
    if (!e.data.s) { e.data.s = new Array(27).fill(null); if (e.data.loot) rollLoot(sim, p, e.data.loot).forEach((it, i) => (e!.data.s[(i * 5 + 3) % 27] = it)); e.data.loot = null; }
    w.touchEnt(e);
    setWindow(sim, p, { mode: 'chest', x, y, z, sold: [] }); announce(sim, p, { t: 'open', mode: 'chest' });
    return true;
  }
  if (use === 'crate') { breakBlock(sim, p, x, y, z, hit.id); return true; }
  if (use === 'bed') { useBed(sim, p, x, y, z); return true; }
  if (use === 'guestbed') { tell(sim, p, sim.npcs.status(x, y, z, p.dim), '#8fd0ff'); return true; }
  if (use === 'door') {
    const swap: Record<string, string> = { door_x: 'door_x_open', door_x_open: 'door_x', door_z: 'door_z_open', door_z_open: 'door_z' }, to = B[swap[BLOCKS[hit.id].key]];
    for (const dy of [-1, 1]) if (w.getBlock(x, y + dy, z) === hit.id) w.setBlock(x, y + dy, z, to, true);
    w.setBlock(x, y, z, to, true);
    sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', 'door', 1, 1, x + 0.5, y + 0.5, z + 0.5]);
    return true;
  }
  if (use === 'berries') {
    w.setBlock(x, y, z, B.berry_bush_empty); w.drops.spawn(x + 0.5, y + 0.6, z + 0.5, { k: 'berries', n: 1 + Math.floor(sim.rnd() * 3) }); sim.sink.emit(own, ['s', 'dig_leaf', 1, 1]);
    return true;
  }
  if (use.startsWith('altar')) { trySummon(sim, p, +use.slice(5), x, y, z); return true; }
  return false;
}
/** Offer the held summoning item at altar `n`. */
export function trySummon(sim: Sim, p: SimPlayer, n: number, x: number, y: number, z: number): void {
  const w = sim.realms[p.dim], boss = BOSSES[n - 1], it = p.inv.held(), all = { dim: p.dim };
  if (w.mobs.boss()) return;
  if (!it || item(it.k).use !== 'summon' + n) { const need = [...ITEMS.values()].find((q) => q.use === 'summon' + n); const name = need?.name ?? 'summoning item'; tell(sim, p, `The altar waits for ${article(name)} ${name}.`, '#ffd9a0'); return; }
  if (n === 7 && !sim.isNight()) { tell(sim, p, 'Kuranga comes up only at night.', '#ffd9a0'); return; }
  if (sim.events.active) sim.events.end(false);
  const offering = it.k;
  p.inv.consumeHeld();
  const m = w.mobs.spawn(boss.key, x + 0.5, y + (boss.boss!.move === 'walk' ? 1.2 : 5), z + 6.5);
  if (!m) return;
  m.boss!.altar = [x, y, z];
  bossSummoned(w, m, p, offering);
  sim.sink.emit(all, ['n', boss.name, boss.boss!.intro, '#ffb86a']);
  sim.sink.emit(all, ['s', 'roar', 1, boss.voice ?? 0.3]); sim.sink.emit(all, ['s', 'bell', 0.7, 1]); sim.sink.emit(all, ['k', 0.5]);
  w.burst(BURST.bossSummon, x + 0.5, y + 1.2, z + 0.5, defIndex(boss));
}
/** Right-click on a townsperson: open their shop. */
export function talk(sim: Sim, p: SimPlayer, mobId: number): boolean {
  const m = sim.realms[p.dim].mobs.byId(mobId), n = m ? npcOf(m.def.key) : undefined;
  if (!m || !n) return false;
  m.talk = TALK_HOLD;
  setWindow(sim, p, { mode: 'shop', npc: n.key, mob: m.id, sold: [] }); announce(sim, p, { t: 'open', mode: 'shop', npc: n.key });
  return true;
}

/** Eat, drink or apply the consumable in `slot`. 0: nothing happened, 1: a salve is still on cooldown, 2: used. */
export function consume(sim: Sim, p: SimPlayer, slot: number): number {
  const inv = p.inv, st = p.stats, b = p.body, it = inv.slots[slot], d = it ? item(it.k) : null;
  if (!it || !d) return 0;
  const [dx, , dz] = dirOf(p);
  if (d.heal && !d.food) { if (st.salveCd > 0) return 1; st.salveCd = 9; }
  else if (d.food && st.hunger >= 20 && !d.heal && !d.restoreMana) return 0;
  if (d.food) { st.hunger = Math.min(20, st.hunger + d.food); if (d.food >= 8) st.buffs.set('fed', 120); }
  if (d.heal) { st.heal(d.heal); sim.sink.emit({ p: p.slot }, ['f', b.x + dx, b.y + 1.6, b.z + dz, '+' + d.heal, '#7fd66b', false]); }
  if (d.restoreMana) st.mana = Math.min(st.maxMana, st.mana + d.restoreMana);
  if (d.buff) st.buffs.set(d.buff[0], d.buff[1]);
  if (--it.n <= 0) inv.slots[slot] = null;
  inv.touch(); st.recompute(inv);
  sim.sink.emit({ dim: p.dim, x: b.x, y: b.y, z: b.z, r: 40, not: p.slot }, ['s', d.food ? 'eat' : 'drink', 1, 1, b.x, b.y + b.eye, b.z]);
  return 2;
}

/** A melee blow on creature `mobId`, struck along (dx, dz). */
export function attack(sim: Sim, p: SimPlayer, mobId: number, dx: number, dz: number): boolean {
  const mobs = sim.realms[p.dim].mobs, m = mobs.byId(mobId), st = p.stats, it = p.inv.held(), wpn = it ? item(it.k).weapon : undefined;
  if (!m || st.dead) { sim.refused.atk++; return false; }
  p.swingSeq++;
  const crit = sim.rnd() < st.d.crit;
  const dmg = (wpn?.dmg ?? 2) * st.dmgMult('melee') * (crit ? 2 : 1) * (0.92 + sim.rnd() * 0.16);
  mobs.hurt(m, dmg, dx, dz, wpn?.knock ?? 3, crit, p);
  sim.sink.emit({ p: p.slot }, ['h', crit]); sim.sink.emit({ p: p.slot }, ['k', crit ? 0.22 : 0.12]);
  st.exhaustion += 0.03;
  return true;
}

/** Use the held bow, staff or totem from the eye at (ox, oy, oz) along (dx, dy, dz).
 *  0: not a weapon that fires, 1: done, 2: no arrows, 3: not enough mana. */
export function fire(sim: Sim, p: SimPlayer, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, cseq = 0, lead = 0): number {
  const w = sim.realms[p.dim], inv = p.inv, st = p.stats, b = p.body, it = inv.held(), wpn = it ? item(it.k).weapon : undefined, style = wpn?.style ?? 'melee';
  if (!wpn || style === 'melee' || st.dead) { sim.refused.fire++; return 0; }
  const crit = sim.rnd() < st.d.crit, others = { dim: p.dim, x: b.x, y: b.y, z: b.z, r: 40, not: p.slot };
  if (style === 'ranged') {
    const slot = inv.findTagged('arrow');
    if (slot < 0) return 2;
    const a = inv.slots[slot]!, extra = item(a.k).ammoDmg ?? 0;
    if (--a.n <= 0) inv.slots[slot] = null;
    inv.touch();
    w.proj.fire('arrow', ox + dx * 0.4, oy - 0.12 + dy * 0.4, oz + dz * 0.4, dx, dy + 0.02, dz, (wpn.dmg + extra) * st.dmgMult('ranged') * (crit ? 2 : 1), p, cseq, wpn.projSpeed, 'ranged', wpn.knock, crit, lead);
    sim.sink.emit(others, ['s', 'bow', 1, 1, ox, oy, oz]);
    p.swingSeq++;
    return 1;
  }
  const cost = wpn.mana ?? 0;
  if (st.mana < cost) return 3;
  st.mana -= cost;
  if (style === 'magic') {
    w.proj.fire(wpn.proj!, ox + dx * 0.5, oy - 0.15 + dy * 0.5, oz + dz * 0.5, dx, dy, dz, wpn.dmg * st.dmgMult('magic') * (crit ? 2 : 1), p, cseq, wpn.projSpeed, 'magic', wpn.knock, crit, lead);
    sim.sink.emit(others, ['s', 'magic', 1, 1, ox, oy, oz]);
  } else {
    const mine = w.mobs.list.filter((m) => m.active && m.def.ai === 'minion' && m.owner === p.id);
    if (mine.length >= st.d.minions) w.mobs.remove(mine.sort((q, r) => q.id - r.id)[0]);
    const m = w.mobs.spawn(wpn.minion!, b.x + dx, b.y + 1.5, b.z + dz);
    if (m) { m.minionDmg = wpn.dmg; m.owner = p.id; sim.sink.emit({ p: p.slot }, ['s', 'summon', 1, 1]); w.burst(BURST.puff, m.x, m.y + 0.3, m.z, 14, m.def.parts[0].c); }
  }
  p.swingSeq++;
  return 1;
}

// ---- what a player's messages ask for (4.3, 4.7, 7.3) ------------------------------------------
// Each handler is given a message `checkC2S` has passed and whose `seq` the host has found in order. A sequenced
// message moves `ackSeq` whatever comes of it, and an `st` follows in the same tick; `edit` and `use` are answered
// with `rej` when they did not take effect.

/** Seconds of cooldown a consumable costs, and a summon (today's `useCd` and the `atkCd` after a summon). */
export const USE_COST = 0.35, SUMMON_COST = 0.6;
/** The cooldown the next swing, shot, cast or summon with the held item sets. */
export function actCost(p: SimPlayer): number {
  const h = p.inv.held(), wpn = h ? item(h.k).weapon : undefined;
  return wpn?.style === 'summon' ? SUMMON_COST : 1 / rules.attackRate(p.inv, p.stats);
}
/** Seconds of digging a break of `bt` must have banked: a little under the break time, for a dig held back on the way. */
export const digNeed = (bt: number): number => Math.max(0, 0.8 * bt - 0.1);
/** One step of an active player's credits: each fills with sim time, up to its surplus over what the next use costs. */
export function tickCredits(p: SimPlayer, dt: number): void {
  p.actCredit = Math.min(p.actCredit + dt, ACT_SURPLUS + actCost(p));
  p.useCredit = Math.min(p.useCredit + dt, ACT_SURPLUS + USE_COST);
  p.digCredit = Math.min(p.digCredit + dt, DIG_SURPLUS + (p.dig ? digNeed(p.dig.bt) : 0));
}
/** A player coming into play holds what one who stood idle would: its client starts with no cooldown, and the time
 *  spent loading is time it could not act in. */
export function fillCredits(p: SimPlayer): void {
  p.actCredit = Math.max(p.actCredit, ACT_SURPLUS + actCost(p));
  p.useCredit = Math.max(p.useCredit, ACT_SURPLUS + USE_COST);
  p.digCredit = Math.max(p.digCredit, DIG_SURPLUS);
}
// what the action did to `stats` (a bed, a buff, a cooldown) goes out right after the `st` that acknowledges it
const acked = (p: SimPlayer, seq: number): void => { p.ackSeq = seq; p.invDirty = true; p.statsDirty = true; };
const live = (p: SimPlayer): boolean => active(p) && !p.stats.dead;
/** The cells as they are, flat (x, y, z, id): what a refused edit sends back. */
function truth(realm: Realm, cells: readonly (readonly [number, number, number])[]): number[] {
  const out: number[] = [];
  for (const [x, y, z] of cells) out.push(x, y, z, realm.getBlock(x, y, z));
  return out;
}
const SIDES: readonly (readonly [number, number, number])[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
/** Does a body's box, drawn in by `s` on every side, overlap the block cell? */
const overlaps = (o: SimPlayer['body'], s: number, x: number, y: number, z: number): boolean =>
  x + 1 > o.x - o.hw + s && x < o.x + o.hw - s && y + 1 > o.y + s && y < o.y + o.h - s && z + 1 > o.z - o.hw + s && z < o.z + o.hw - s;

/** Put the held block into the cell a client named (4.7): the held item makes it; the cell takes it and touches something
 *  that holds it up; no body of the realm is in the way, whatever that player's state (the placer's own box drawn in by
 *  BODY_SHRINK, every other by 0.1); and today's rules for support and for creatures. */
export function placeCell(sim: Sim, p: SimPlayer, x: number, y: number, z: number, id: number): boolean {
  const w = sim.realms[p.dim], b = BLOCKS[id], h = p.inv.held();
  if (!b || !h || item(h.k).block !== id || y < 1 || y > BUILD_MAX) return false;
  const cur = w.getBlock(x, y, z);
  if (!T_REPLACE[cur]) return false;
  // without this a refused placement and an accepted one on top of it would leave a block hanging in the air
  if (cur === 0 || T_LIQUID[cur]) { let held = false; for (const [dx, dy, dz] of SIDES) if (!T_REPLACE[w.getBlock(x + dx, y + dy, z + dz)]) { held = true; break; } if (!held) return false; }
  if (b.solid) for (const q of w.players) if (overlaps(q.body, q === p ? rules.BODY_SHRINK : 0.1, x, y, z)) return false;
  if (b.support && !(T_SOLID[w.getBlock(x, y - 1, z)] && T_OPAQUE[w.getBlock(x, y - 1, z)])) return false;
  if (b.solid) for (let i = 0; i < w.mobs.hi; i++) {
    const m = w.mobs.list[i];
    if (m.active && m.def.ai !== 'minion' && x + 1 > m.x - m.hw && x < m.x + m.hw && y + 1 > m.y && y < m.y + m.h && z + 1 > m.z - m.hw && z < m.z + m.hw) return false;
  }
  if (!w.setBlock(x, y, z, id)) return false;
  if (!p.modes.creative) p.inv.consumeHeld();
  if (b.use === 'guestbed') { if (p.dim === 0) sim.npcs.addBed(x, y, z); else tell(sim, p, 'Townsfolk settle only on the living ground.', '#ff9a8a'); }
  sim.addFlag('place:' + b.key);
  sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', placeSound(id), 0.8, 0.9, x + 0.5, y + 0.5, z + 0.5]);
  return true;
}
/** Stand the held door with its foot in the cell, as the block `id` the client chose from where it looked. */
export function placeDoorCell(sim: Sim, p: SimPlayer, x: number, y: number, z: number, id: number): boolean {
  const w = sim.realms[p.dim], h = p.inv.held();
  if (!h || item(h.k).use !== 'door' || (id !== B.door_x && id !== B.door_z) || y < 1 || y + 1 > BUILD_MAX) return false;
  if (!T_REPLACE[w.getBlock(x, y, z)] || !T_REPLACE[w.getBlock(x, y + 1, z)] || !T_SOLID[w.getBlock(x, y - 1, z)]) return false;
  w.setBlock(x, y, z, id); w.setBlock(x, y + 1, z, id);
  p.inv.consumeHeld(); sim.addFlag('place:door');
  sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', 'door', 1, 1, x + 0.5, y + 0.5, z + 0.5]);
  return true;
}

/** `dig`: mining starts on a block, moves to another, or stops. Others within DIG_R hear of it. */
export function onDig(sim: Sim, p: SimPlayer, m: C2SOf<'dig'>): void {
  if (!live(p)) return;
  const { x, y, z } = m;
  if (m.on) { const id = sim.realms[p.dim].getBlock(x, y, z); p.dig = { x, y, z, id, bt: rules.breakTimeMin(id, p.inv, p.stats, p.modes), t0: sim.tick }; }
  else p.dig = null;
  sim.sink.emit({ dim: p.dim, x: x + 0.5, y: y + 0.5, z: z + 0.5, r: DIG_R, not: p.slot }, ['dg', p.slot, m.on, x, y, z]);
}
/** `edit`: a break, placement or door the client has already shown. True when it took effect; else `rej` has been sent. */
export function onEdit(sim: Sim, p: SimPlayer, m: C2SOf<'edit'>): boolean {
  acked(p, m.seq);
  const realm = sim.realms[p.dim], { x, y, z, k, id } = m;
  const refuse = (cells: number[]): boolean => { sim.refused.edit++; sim.sink.send(p.slot, { t: 'rej', seq: m.seq, cells }); return false; };
  // the host has no array to read the truth from, or may not act for this player now
  if (!live(p) || y < 1 || y > BUILD_MAX || !realm.ready(x, z)) return refuse([]);
  const door = k === 2 || (k === 0 && !!BLOCKS[id]?.door);
  const cells: [number, number, number][] = k === 2 ? [[x, y, z], [x, y + 1, z]] : door ? [[x, y - 1, z], [x, y, z], [x, y + 1, z]] : [[x, y, z]];
  if (!inReach(p, x, y, z, 1.5)) return refuse(truth(realm, cells));
  let done = false;
  if (k === 0) {
    const cur = realm.getBlock(x, y, z), b = BLOCKS[cur];
    if (cur && cur === id && (b.hard >= 0 || p.modes.creative)) {
      let bt = rules.breakTimeMin(id, p.inv, p.stats, p.modes);
      const d = p.dig;
      if (d && d.x === x && d.y === y && d.z === z) bt = Math.min(bt, d.bt);
      const need = digNeed(bt);
      if (p.digCredit >= need) { p.digCredit -= need; p.dig = null; done = breakBlock(sim, p, x, y, z, id); }
    }
  } else done = k === 1 ? placeCell(sim, p, x, y, z, id) : placeDoorCell(sim, p, x, y, z, id);
  return done || refuse(truth(realm, cells));
}
/** `use`: a right-click on a block that does something. True when it did; else `rej` has been sent. */
export function onUse(sim: Sim, p: SimPlayer, m: C2SOf<'use'>): boolean {
  acked(p, m.seq);
  const realm = sim.realms[p.dim], { x, y, z } = m;
  const refuse = (cells: number[]): boolean => { sim.sink.send(p.slot, { t: 'rej', seq: m.seq, cells }); return false; };
  if (!live(p) || !realm.ready(x, z)) return refuse([]);
  const cur = realm.getBlock(x, y, z), use = BLOCKS[cur]?.use;
  const cells: [number, number, number][] = BLOCKS[m.id]?.door ? [[x, y - 1, z], [x, y, z], [x, y + 1, z]] : [[x, y, z]];
  if (cur !== m.id || !use || !inReach(p, x, y, z, 1.5) || !useBlock(sim, p, { x, y, z, nx: 0, ny: 0, nz: 0, id: cur }, use)) return refuse(truth(realm, cells));
  return true;
}
/** `talk`: open the shop of a townsperson within reach of the eye. */
export function onTalk(sim: Sim, p: SimPlayer, m: C2SOf<'talk'>): boolean {
  if (!live(p)) return false;
  const mob = sim.realms[p.dim].mobs.byId(m.id), [ex, ey, ez] = eyeOf(p);
  if (!mob || !npcOf(mob.def.key) || mobDist(mob, ex, ey, ez) > TALK_R) return false;
  return talk(sim, p, m.id);
}
/** `item`: a consumable, the recall stone, or a gate kit set on the cell `at`. 0 nothing happened, 1 refused with a reason
 *  the client already knows (a salve still cooling), 2 used. */
export function onItem(sim: Sim, p: SimPlayer, m: C2SOf<'item'>): number {
  acked(p, m.seq);
  if (!live(p)) return 0;
  const it = p.inv.slots[m.slot], d = it ? item(it.k) : null;
  if (!d) return 0;
  if (d.use === 'gate1' || d.use === 'gate2') {
    const at = m.at;
    if (!at || m.slot !== p.inv.sel || !inReach(p, at[0], at[1], at[2], 1.5)) return 0;
    return placeGate(sim, p, at[0], at[1], at[2], !!m.ax) ? 2 : 0;
  }
  if (d.use === 'recall') return recall(sim, p) ? 2 : 0;
  if (!(d.food || d.heal || d.restoreMana || d.buff) || p.useCredit < USE_COST) return 0;
  const r = consume(sim, p, m.slot);
  if (r === 2) p.useCredit -= USE_COST;
  return r;
}
/** `atk`: a melee blow the client's ray landed (7.3). Within the action credit and the reach of the blow, judged from the
 *  eye the client just sent; a refusal sends nothing. */
export function onAtk(sim: Sim, p: SimPlayer, m: C2SOf<'atk'>): boolean {
  const refuse = (): boolean => { sim.refused.atk++; return false; };
  if (!live(p)) return refuse();
  const h = p.inv.held(), wpn = h ? item(h.k).weapon : undefined, mob = sim.realms[p.dim].mobs.byId(m.id);
  if ((wpn && wpn.style !== 'melee') || !mob || mob.def.ai === 'npc' || mob.def.ai === 'minion') return refuse();
  const cost = actCost(p), [ex, ey, ez] = eyeOf(p);
  if (p.actCredit < cost) return refuse();
  const v = Math.min(20, Math.max(Math.hypot(mob.vx, mob.vy, mob.vz), mob.def.speed));
  if (mobDist(mob, ex, ey, ez) > (wpn?.reach ?? 3.3) + p.stats.d.reach * 0.5 + 1.0 + v * (p.rtt / 2 + 0.15)) return refuse();
  p.actCredit -= cost;
  return attack(sim, p, m.id, m.d[0], m.d[2]);
}
/** `fire`: a shot, cast or summon with the held weapon (7.3). From the client's eye when that is within 2 blocks of the
 *  stored one, flown ahead by half the round trip. Returns as `fire` does; 0 also for a refusal. */
export function onFire(sim: Sim, p: SimPlayer, m: C2SOf<'fire'>): number {
  acked(p, m.seq);
  const refuse = (): number => { sim.refused.fire++; return 0; };
  if (!live(p)) return refuse();
  const h = p.inv.held(), wpn = h ? item(h.k).weapon : undefined;
  if (!wpn || wpn.style === 'melee') return refuse();
  const cost = actCost(p), [dx, dy, dz] = m.d, l = Math.hypot(dx, dy, dz), e = eyeOf(p), o = m.o;
  if (p.actCredit < cost || l < 0.5) return refuse();
  const at = Math.hypot(o[0] - e[0], o[1] - e[1], o[2] - e[2]) <= 2 ? o : e;
  const r = fire(sim, p, at[0], at[1], at[2], dx / l, dy / l, dz / l, m.seq, Math.min(p.rtt / 2, 0.15));
  if (r === 1) p.actCredit -= cost; else sim.refused.fire++;
  return r;
}
/** `op`: its fields beside `t` and `seq` are the op. */
export function onOp(sim: Sim, p: SimPlayer, m: C2SOf<'op'>): OpResult {
  const { t: _t, seq, ...op } = m;
  // the client lets its box go when this close is acknowledged, so a window opened again after it is news, whatever it holds
  if (op.o === 'close') { const s = SENT.get(p); if (s) s.box = 'closed'; }
  return invOp(sim, p, seq, op as InvOp);
}
