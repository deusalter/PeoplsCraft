// What a player does to the world: break, place, use, eat, strike, shoot, throw away.
// Effects the acting client has already played for itself (the break burst and sound, a placement
// sound, its bow) go to everyone else: they are emitted with `not` set to the actor's slot.
import { BUILD_MAX } from '../core/constants';
import { B, BLOCKS, T_OPAQUE, T_REPLACE, T_SOLID } from '../data/blocks';
import { hashInt, mulberry32 } from '../core/noise';
import type { Slot } from './inventory';
import { ITEMS, type Item, item } from '../data/items';
import { BOSSES } from '../data/mobs';
import { BURST } from './fx';
import { collapseGate } from './gates';
import { type InvOp, type OpResult, type OpState, applyOp } from './invops';
import { defIndex } from './mobs';
import { npcOf } from './npcs';
import type { SimPlayer } from './player';
import type { Realm } from './realm';
import * as rules from './rules';
import type { Sim } from './sim';

export const DIG_SURPLUS = 1.0, ACT_SURPLUS = 0.5;
/** Use kinds that open a crafting station, and which. */
export const STATIONS: Record<string, string> = { workbench: 'workbench', anvil: 'anvil', runeloom: 'runeloom', tinker: 'tinker' };
/** A targeted block face, as the client's ray reports it. */
export interface BlockHit { x: number; y: number; z: number; nx: number; ny: number; nz: number; id: number }

const dirOf = (p: SimPlayer): [number, number, number] => { const b = p.body, cp = Math.cos(b.pitch); return [-Math.sin(b.yaw) * cp, Math.sin(b.pitch), -Math.cos(b.yaw) * cp]; };
const tell = (sim: Sim, p: SimPlayer, text: string, color: string): void => sim.sink.emit({ p: p.slot }, ['t', text, color]);

/** Throw a stack out in front of the player, from the eye. */
export function dropItem(sim: Sim, p: SimPlayer, it: Item): void {
  const b = p.body, [dx, dy, dz] = dirOf(p);
  sim.realms[p.dim].drops.spawn(b.x + dx * 0.4, b.y + b.eye - 0.3, b.z + dz * 0.4, it, dx * 5, dy * 5 + 1.5, dz * 5, 1.2);
}
/** One inventory or container op of this player, carried out on the state the simulation holds.
 *  `seq` is the op's place in the player's stream; it seeds the op's own random draws. */
export function invOp(sim: Sim, p: SimPlayer, seq: number, op: InvOp): OpResult {
  const w = p.window, realm = sim.realms[p.dim], wire = op !== null && typeof op === 'object' && typeof op.o === 'string' && op.o[0] !== '_';
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
  if (w && !st.window) {
    p.window = null;
    if (w.x !== undefined) { const k = `${w.x},${w.y},${w.z}`, v = realm.viewers.get(k); if (v && v.delete(p) && !v.size) realm.viewers.delete(k); }
  }
  // anything done with a container open may have moved items into it: its chunk is saved, and a forge window redraws
  if (r.ok && ent) { if (ent.kind === 'forge') ent.data.rev++; realm.touchEnt(ent); }
  return r;
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

/** Put the held block against the targeted face. */
export function place(sim: Sim, p: SimPlayer, hit: BlockHit, id: number): boolean {
  const w = sim.realms[p.dim], b = BLOCKS[id];
  let x = hit.x, y = hit.y, z = hit.z;
  if (!T_REPLACE[hit.id]) { x += hit.nx; y += hit.ny; z += hit.nz; }
  if (y < 1 || y > BUILD_MAX || !T_REPLACE[w.getBlock(x, y, z)]) return false;
  if (b.solid) for (const q of w.players) { const o = q.body; if (x + 1 > o.x - o.hw && x < o.x + o.hw && y + 1 > o.y && y < o.y + o.h && z + 1 > o.z - o.hw && z < o.z + o.hw) return false; }
  if (b.support && !(T_SOLID[w.getBlock(x, y - 1, z)] && T_OPAQUE[w.getBlock(x, y - 1, z)])) return false;
  if (b.solid && w.mobs.list.some((m) => m.active && m.def.ai !== 'minion' && x + 1 > m.x - m.hw && x < m.x + m.hw && y + 1 > m.y && y < m.y + m.h && z + 1 > m.z - m.hw && z < m.z + m.hw)) return false;
  if (!w.setBlock(x, y, z, id)) return false;
  if (!p.modes.creative) p.inv.consumeHeld();
  if (b.use === 'guestbed') { if (p.dim === 0) sim.npcs.addBed(x, y, z); else tell(sim, p, 'Townsfolk only settle in the Overworld.', '#ff9a8a'); }
  sim.addFlag('place:' + b.key);
  sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', placeSound(id), 0.8, 0.9, x + 0.5, y + 0.5, z + 0.5]);
  return true;
}
export const placeSound = (id: number): string => { const s = BLOCKS[id].sound; return s === 'stone' || s === 'metal' ? 'place' : 'dig_' + s; };

/** Stand a door (two cells) on the targeted face, turned across the way the player looks. */
export function placeDoor(sim: Sim, p: SimPlayer, hit: BlockHit): boolean {
  const w = sim.realms[p.dim], [dx, , dz] = dirOf(p), x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (!T_REPLACE[w.getBlock(x, y, z)] || !T_REPLACE[w.getBlock(x, y + 1, z)] || !T_SOLID[w.getBlock(x, y - 1, z)]) return false;
  const id = Math.abs(dz) > Math.abs(dx) ? B.door_x : B.door_z;
  w.setBlock(x, y, z, id); w.setBlock(x, y + 1, z, id);
  p.inv.consumeHeld(); sim.addFlag('place:door');
  sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', 'door', 1, 1, x + 0.5, y + 0.5, z + 0.5]);
  return true;
}

/** Right-click on a block that does something. False when this block does nothing. */
export function useBlock(sim: Sim, p: SimPlayer, hit: BlockHit, use: string): boolean {
  const w = sim.realms[p.dim], { x, y, z } = hit, b = p.body, own = { p: p.slot };
  if (STATIONS[use]) { p.window = { mode: 'station', station: STATIONS[use], x, y, z, sold: [] }; return true; }
  if (use.startsWith('forge')) {
    let e = w.getEnt(x, y, z);
    if (!e) e = w.setEnt(x, y, z, 'forge', { s: [null, null, null], burn: 0, burnMax: 0, prog: 0, need: 0, level: +use.slice(5), rev: 0 });
    if (e) { p.window = { mode: 'forge', x, y, z, sold: [] }; sim.sink.send(p.slot, { t: 'open', mode: 'forge', x, y, z }); }
    return true;
  }
  if (use === 'chest') {
    let e = w.getEnt(x, y, z);
    if (!e) e = w.setEnt(x, y, z, 'chest', { s: null, loot: null });
    if (!e) return true;
    if (!e.data.s) { e.data.s = new Array(27).fill(null); if (e.data.loot) rollLoot(sim, p, e.data.loot).forEach((it, i) => (e!.data.s[(i * 5 + 3) % 27] = it)); e.data.loot = null; }
    w.touchEnt(e);
    p.window = { mode: 'chest', x, y, z, sold: [] }; sim.sink.send(p.slot, { t: 'open', mode: 'chest', x, y, z });
    return true;
  }
  if (use === 'crate') { breakBlock(sim, p, x, y, z, hit.id); return true; }
  if (use === 'bed') {
    if (p.dim !== 0) { tell(sim, p, 'A bedroll only holds your spawn in the Overworld.', '#ff9a8a'); return true; }
    p.bed = [x, y, z];
    if (sim.isNight() && p.dim === 0) {
      if (w.mobs.nearestHostile(b.x, b.y, b.z, 14) || sim.events.active) tell(sim, p, 'You cannot rest with enemies near.', '#ff9a8a');
      else { sim.shared.clock = Math.floor(sim.shared.clock) + 1.02; p.stats.buffs.set('dawn', 180); p.stats.recompute(p.inv); sim.sink.emit(own, ['n', 'Morning', 'You wake rested', '#ffe9a8']); }
    } else tell(sim, p, 'Spawn point set.', '#b8f070');
    return true;
  }
  if (use === 'guestbed') { tell(sim, p, sim.npcs.status(x, y, z, p.dim), '#8fd0ff'); return true; }
  if (use === 'door') {
    const swap: Record<string, string> = { door_x: 'door_x_open', door_x_open: 'door_x', door_z: 'door_z_open', door_z_open: 'door_z' }, to = B[swap[BLOCKS[hit.id].key]];
    for (const dy of [-1, 1]) if (w.getBlock(x, y + dy, z) === hit.id) w.setBlock(x, y + dy, z, to, true);
    w.setBlock(x, y, z, to, true); sim.sink.emit(own, ['s', 'door', 1, 1]);
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
  if (!it || item(it.k).use !== 'summon' + n) { const need = [...ITEMS.values()].find((q) => q.use === 'summon' + n); tell(sim, p, `The altar waits for a ${need?.name ?? 'summoning item'}.`, '#ffd9a0'); return; }
  if (n === 7 && !sim.isNight()) { tell(sim, p, 'The Hart only answers at night.', '#ffd9a0'); return; }
  if (sim.events.active) sim.events.end(false);
  p.inv.consumeHeld();
  const m = w.mobs.spawn(boss.key, x + 0.5, y + (boss.boss!.move === 'walk' ? 1.2 : 5), z + 6.5);
  if (!m) return;
  m.boss!.altar = [x, y, z];
  sim.sink.emit(all, ['n', boss.name, boss.boss!.intro, '#ffb86a']);
  sim.sink.emit(all, ['s', 'roar', 1, boss.voice ?? 0.3]); sim.sink.emit(all, ['s', 'bell', 0.7, 1]); sim.sink.emit(all, ['k', 0.5]);
  w.burst(BURST.bossSummon, x + 0.5, y + 1.2, z + 0.5, defIndex(boss));
}
/** Right-click on a townsperson: open their shop. */
export function talk(sim: Sim, p: SimPlayer, mobId: number): boolean {
  const m = sim.realms[p.dim].mobs.byId(mobId), n = m ? npcOf(m.def.key) : undefined, b = p.body;
  if (!m || !n || Math.hypot(m.x - b.x, m.y - b.y, m.z - b.z) > 5 + m.hw) return false;
  m.talk = 6;
  p.window = { mode: 'shop', npc: n.key, mob: m.id, sold: [] }; sim.sink.send(p.slot, { t: 'open', mode: 'shop', npc: n.key });
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
  const crit = sim.rnd() < st.d.crit;
  const dmg = (wpn?.dmg ?? 2) * st.dmgMult('melee') * (crit ? 2 : 1) * (0.92 + sim.rnd() * 0.16);
  mobs.hurt(m, dmg, dx, dz, wpn?.knock ?? 3, crit, p);
  sim.sink.emit({ p: p.slot }, ['h', crit]); sim.sink.emit({ p: p.slot }, ['k', crit ? 0.22 : 0.12]);
  st.exhaustion += 0.03;
  return true;
}

/** Use the held bow, staff or totem from the eye at (ox, oy, oz) along (dx, dy, dz).
 *  0: not a weapon that fires, 1: done, 2: no arrows, 3: not enough mana. */
export function fire(sim: Sim, p: SimPlayer, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): number {
  const w = sim.realms[p.dim], inv = p.inv, st = p.stats, b = p.body, it = inv.held(), wpn = it ? item(it.k).weapon : undefined, style = wpn?.style ?? 'melee';
  if (!wpn || style === 'melee' || st.dead) { sim.refused.fire++; return 0; }
  const crit = sim.rnd() < st.d.crit, others = { dim: p.dim, x: b.x, y: b.y, z: b.z, r: 40, not: p.slot };
  if (style === 'ranged') {
    const slot = inv.findTagged('arrow');
    if (slot < 0) return 2;
    const a = inv.slots[slot]!, extra = item(a.k).ammoDmg ?? 0;
    if (--a.n <= 0) inv.slots[slot] = null;
    inv.touch();
    w.proj.fire('arrow', ox + dx * 0.4, oy - 0.12 + dy * 0.4, oz + dz * 0.4, dx, dy + 0.02, dz, (wpn.dmg + extra) * st.dmgMult('ranged') * (crit ? 2 : 1), p, wpn.projSpeed, 'ranged', wpn.knock, crit);
    sim.sink.emit(others, ['s', 'bow', 1, 1, ox, oy, oz]);
    return 1;
  }
  const cost = wpn.mana ?? 0;
  if (st.mana < cost) return 3;
  st.mana -= cost;
  if (style === 'magic') {
    w.proj.fire(wpn.proj!, ox + dx * 0.5, oy - 0.15 + dy * 0.5, oz + dz * 0.5, dx, dy, dz, wpn.dmg * st.dmgMult('magic') * (crit ? 2 : 1), p, wpn.projSpeed, 'magic', wpn.knock, crit);
    sim.sink.emit(others, ['s', 'magic', 1, 1, ox, oy, oz]);
  } else {
    const mine = w.mobs.list.filter((m) => m.active && m.def.ai === 'minion' && m.owner === p.id);
    if (mine.length >= st.d.minions) w.mobs.remove(mine.sort((q, r) => q.id - r.id)[0]);
    const m = w.mobs.spawn(wpn.minion!, b.x + dx, b.y + 1.5, b.z + dz);
    if (m) { m.minionDmg = wpn.dmg; m.owner = p.id; sim.sink.emit({ p: p.slot }, ['s', 'summon', 1, 1]); w.burst(BURST.puff, m.x, m.y + 0.3, m.z, 14, m.def.parts[0].c); }
  }
  return 1;
}
