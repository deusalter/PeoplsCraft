// One player as the simulation holds it.
import { BLOCKS, T_DAMAGE, T_LIQUID } from '../data/blocks';
import type { Item } from '../data/items';
import { endWindow } from './actions';
import { PlayerBody } from './body';
import { Inventory } from './inventory';
import type { Mob } from './mobs';
import { PlayerStats } from './stats';
import type { Sim } from './sim';
import { goHome, sendTp } from './travel';
import type { PlayerRecord } from './storage';

export const STALL_AFTER = 90, LINGER = 30;

export interface SimPlayer {
  /** Record id: the storage key, and the only key the sim uses to refer to a player from other state
   *  (`Mob.hitBy`, `Drop.owner`, `Proj.by`, minion `owner`, `shared.summons`, `shared.owed`). */
  readonly id: string;
  /** 1..250. A handle for this session only (fx scopes, messages). Never stored in state that can outlive the player's presence. */
  slot: number;
  name: string; local: boolean;
  online: boolean; epoch: number; stalled: boolean; lingerT: number; parked: boolean; unsaved: boolean;
  dim: 0 | 1 | 2;
  body: PlayerBody;
  inv: Inventory; stats: PlayerStats;
  /** `fly`: flight granted by the `fly` command; creative needs no grant. */
  modes: { creative: boolean; hidden: boolean; god: boolean; fly: boolean };
  bed: [number, number, number] | null;
  /** Last death as [dimension, x, y, z], until the player walks back to it. */
  deathAt: [number, number, number, number] | null;
  portalReturn: Record<number, [number, number, number]>;
  /** The last place the player stood on the ground. */
  safe: [number, number, number];
  mail: Item[];
  /** True from join or a loading teleport until the arrival is complete: the client has said its area is ready (`clientReady`),
   *  the footing is found and the last position has been sent. */
  loading: boolean; clientReady: boolean;
  /** Footing still to be found by land(): -1 none, else the kind of arrival (0 plain, 1 and 2 raise a return gate). */
  arriving: -1 | 0 | 1 | 2;
  /** Sent to a bed whose chunk was not loaded; the bed is checked on arrival. */
  pendingBed: boolean;
  retCheck: boolean;
  tp: number;
  sleeping: boolean;
  embedded: { x: number; y: number; z: number; t: number } | null;
  recallT: number; hazardT: number; fullT: number; portalT: number; portalArmed: boolean;
  actCredit: number; useCredit: number; digCredit: number;
  dig: { x: number; y: number; z: number; id: number; bt: number; t0: number } | null;
  fallPeak: number; grounded: boolean; speedBudget: number; moveSeq: number; lastMoveTick: number;
  /** Tick the stored position dates from: the last accepted move, or the last sendTp. `speedBudget` refills from it. */
  moveOkTick: number;
  /** The base a rise is measured from: a height, and the tick it was taken at (far in the past when there is none). */
  riseY: number; riseTick: number;
  /** Jumps made in the air since the body last stood; each resets `fallPeak`, as the body's own does, up to the extra jumps the player has. */
  airJumps: number;
  /** The client has a window of any kind open. */
  uiOpen: boolean;
  /** The client says it is eating, drinking or drawing a bow (move flag bit 8); other players see the pose. */
  usingItem: boolean;
  /** Counts swings and attacks; its low two bits travel in the snapshot so other players see each one. */
  swingSeq: number;
  /** Tick of the last damage taken, far in the past when there was none: the `hurt` flash other players see,
   *  and the second in which the movement checks allow for a knock. */
  hurtTick: number;
  rtt: number;
  ackSeq: number; rngSeed: number; invDirty: boolean; statsDirty: boolean;
  /** Open window. Containers are named by cell only. */
  window: null | { mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string; x?: number; y?: number; z?: number; npc?: string; mob?: number;
                   /** The Guide lies over it: it is kept, and ops act as with no window. */
                   covered?: boolean;
                   sold: { id: number; it: Item; price: number }[] };
  /** Joined without a record: this is the player's first visit. */
  fresh: boolean;
  /** The record was loaded with no health left; the death is announced when the player turns active. */
  deadOnJoin: boolean;
  /** Shown as a toast when the player next turns active. */
  arriveMsg: string;
}

/** Online, loaded, landed and heard from: the only state in which a player is hurt, targeted or ticked. */
export const active = (p: SimPlayer): boolean => p.online && !p.loading && p.arriving < 0 && !p.stalled;
/** Flying is allowed: the `canFly` of rules.maxSpeed, and the only state in which a move's `flying` flag is believed. */
export const flightAllowed = (p: SimPlayer): boolean => p.modes.creative || p.modes.fly;

export function newPlayer(id: string, slot: number, name: string, local: boolean, body: PlayerBody): SimPlayer {
  return {
    id, slot, name, local, online: true, epoch: 1, stalled: false, lingerT: 0, parked: false, unsaved: false,
    dim: 0, body, inv: new Inventory(), stats: new PlayerStats(), modes: { creative: false, hidden: false, god: false, fly: false },
    bed: null, deathAt: null, portalReturn: {}, safe: [0, 0, 0], mail: [],
    loading: true, clientReady: false, arriving: -1, pendingBed: false, retCheck: false, tp: 0, sleeping: false, embedded: null,
    recallT: 0, hazardT: 0, fullT: 0, portalT: 0, portalArmed: true, actCredit: 0, useCredit: 0, digCredit: 0, dig: null,
    fallPeak: 0, grounded: false, speedBudget: 0, moveSeq: 0, lastMoveTick: 0, moveOkTick: 0, riseY: 0, riseTick: -1e9, airJumps: 0, uiOpen: false, usingItem: false, swingSeq: 0, hurtTick: -1e9, rtt: 0,
    ackSeq: 0, rngSeed: 0, invDirty: false, statsDirty: false, window: null, fresh: true, deadOnJoin: false, arriveMsg: '',
  };
}

/** The persistent part of a player, detached from the live object. */
export function toRecord(p: SimPlayer, seen: number): PlayerRecord {
  const b = p.body;
  return {
    v: 1, id: p.id, name: p.name, seen, dim: p.dim, pos: { x: b.x, y: b.y, z: b.z, yaw: b.yaw, pitch: b.pitch },
    inv: p.inv.serialize(), stats: p.stats.serialize(), bed: p.bed, deathAt: p.deathAt, portalReturn: p.portalReturn,
    safe: [p.safe[0], p.safe[1], p.safe[2]], arriving: p.arriving, pendingBed: p.pendingBed, recallT: p.recallT,
    modes: { ...p.modes }, mail: p.mail.map((it) => ({ ...it })),
  };
}

/** A drop is under the player but the pack has no room for it. Throttled on its own timer so it never nags. */
export function warnFull(sim: Sim, p: SimPlayer): void {
  if (p.fullT > 0) return;
  p.fullT = 8;
  sim.sink.emit({ p: p.slot }, ['t', 'Inventory full', '#ff9a8a']); sim.sink.emit({ p: p.slot }, ['s', 'error', 0.4, 1]);
}

export function gainXp(sim: Sim, p: SimPlayer, n: number): void {
  const st = p.stats, ups = st.addXp(Math.round(n));
  if (!ups) return;
  st.recompute(p.inv); st.hp = st.maxHp;
  sim.sink.emit({ p: p.slot }, ['n', `Level ${st.level}`, '+2 attribute points · press E to spend', '#c8f58a']);
  sim.sink.emit({ p: p.slot }, ['s', 'levelup', 1, 1]);
}

/** Damage from something at (fx, fz). `from` is the creature that dealt it, when thorns should answer. */
export function hurtPlayer(sim: Sim, p: SimPlayer, dmg: number, fx: number, fz: number, cause: string, from: Mob | null = null, knock = 6): void {
  const b = p.body, st = p.stats;
  if (p.modes.god || p.modes.creative || st.dead || !active(p)) return;
  const took = st.damage(dmg, sim.rnd);
  if (took === 0) return;
  if (took < 0) { sim.realms[p.dim].floater(b.x, b.y + 2, b.z, 'Dodged', '#9ad0ff', false); return; }
  p.hurtTick = sim.tick;
  // the knock carries the body farther than its own legs would: the movement check allows for it
  if (knock > 0) p.speedBudget += 2;
  sim.sink.send(p.slot, { t: 'hurt', dmg: took, fx, fz, knock, cause });
  if (from && st.d.thorns > 0) sim.realms[p.dim].mobs.hurt(from, took * st.d.thorns + 1, fx - b.x, fz - b.z, 2, false, p);
  if (st.dead) onDeath(sim, p, cause);
}

export function onDeath(sim: Sim, p: SimPlayer, cause: string): void {
  const lost = Math.floor(p.inv.coins * 0.15), b = p.body, mobs = sim.realms[p.dim].mobs;
  p.deathAt = [p.dim, Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)];
  p.inv.coins -= lost; p.inv.touch(); endWindow(sim, p);
  for (const m of mobs.list) if (m.active && m.def.ai === 'minion' && m.owner === p.id) mobs.remove(m);
  sim.sink.send(p.slot, { t: 'dead', cause, lost, at: p.deathAt });
}

export function respawn(sim: Sim, p: SimPlayer): void {
  if (!p.stats.dead) return;
  p.stats.respawn(); goHome(sim, p);
}
/** The Recall Stone: home, then 30 s before it works again. False while it is still warm. */
export function recall(sim: Sim, p: SimPlayer): boolean {
  if (p.recallT > 0 || p.stats.dead) return false;
  p.recallT = 30; sim.sink.emit({ p: p.slot }, ['s', 'teleport', 1, 1]);
  goHome(sim, p);
  return true;
}

const AROUND: readonly (readonly [number, number])[] = [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36], [0, 0]];
/** One step of what the world does to an active player: fall damage, hazards underfoot, the void, hunger and regeneration. */
export function tickPlayer(sim: Sim, p: SimPlayer, dt: number): void {
  const b = p.body, st = p.stats, inv = p.inv, w = sim.realms[p.dim], rnd = sim.rnd;
  const hit = (took: number, cause: string): void => { p.hurtTick = sim.tick; sim.sink.send(p.slot, { t: 'hurt', dmg: took, fx: b.x, fz: b.z, knock: 0, cause }); };
  st.sync(inv);
  if (p.fullT > 0) p.fullT -= dt; if (p.recallT > 0) p.recallT -= dt;
  if (b.landed > 3.6 && !st.d.noFall && !p.modes.creative) { st.hurtT = 0; const took = st.damage((b.landed - 3) * 5.5, rnd, true); if (took > 0) { hit(took, 'fall'); if (st.dead) onDeath(sim, p, 'fall'); } }
  if (b.onGround) { p.safe[0] = b.x; p.safe[1] = b.y; p.safe[2] = b.z; }
  p.hazardT -= dt;
  if (p.hazardT <= 0) {
    p.hazardT = 0.5;
    if (b.inLava && !p.modes.creative && !p.modes.god) { st.hurtT = 0; const took = st.damage(8, rnd, true); if (took > 0) { hit(took, 'lava'); if (st.dead) onDeath(sim, p, 'lava'); } }
    else for (let dy = 0; dy < 2; dy++) for (const [dx, dz] of AROUND) {
      const id = w.getBlock(Math.floor(b.x + dx), Math.floor(b.y + dy * 0.9 - (dx || dz ? 0 : 0.1)), Math.floor(b.z + dz));
      if (T_DAMAGE[id] && !T_LIQUID[id]) { hurtPlayer(sim, p, T_DAMAGE[id] * 3, Math.floor(b.x + dx) + 0.5, Math.floor(b.z + dz) + 0.5, BLOCKS[id].name, null, 3); dy = 2; break; }
    }
    const da = p.deathAt;
    if (da && da[0] === p.dim && !st.dead && Math.abs(b.x - da[1]) < 6 && Math.abs(b.z - da[3]) < 6 && Math.abs(b.y - da[2]) < 8) p.deathAt = null;
    if (st.hunger <= 0 && st.hp <= 5 && !st.dead && rnd() < 0.1) { st.hurtT = 0; st.damage(6, rnd, true); if (st.dead) onDeath(sim, p, 'hunger'); }
  }
  if (b.y < (p.dim === 2 ? 20 : -16) && !st.dead) {
    if (p.dim === 2 && !p.modes.creative) {
      st.hurtT = 0; hit(st.damage(st.maxHp * 0.35, rnd, true), 'void');
      if (st.dead) onDeath(sim, p, 'void'); else { b.teleport(p.safe[0], p.safe[1] + 0.2, p.safe[2]); sendTp(sim, p, false); sim.sink.emit({ p: p.slot }, ['t', 'You are back on the last footing.', '#c8d0ff']); }
    } else { b.teleport(b.x, 220, b.z); sendTp(sim, p, false); }
  }
  st.tick(dt, inv, b.sprinting);
}
