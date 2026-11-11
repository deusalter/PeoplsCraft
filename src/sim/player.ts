// One player as the simulation holds it.
import type { Item } from '../data/items';
import { PlayerBody } from './body';
import { Inventory } from './inventory';
import { PlayerStats } from './stats';
import type { Sim } from './sim';
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
  modes: { creative: boolean; hidden: boolean; god: boolean };
  bed: [number, number, number] | null;
  /** Last death as [dimension, x, y, z], until the player walks back to it. */
  deathAt: [number, number, number, number] | null;
  portalReturn: Record<number, [number, number, number]>;
  /** The last place the player stood on the ground. */
  safe: [number, number, number];
  mail: Item[];
  /** True from join or a loading teleport until the client says its area is ready. */
  loading: boolean;
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
  /** The client has a window of any kind open. */
  uiOpen: boolean;
  rtt: number;
  ackSeq: number; rngSeed: number; invDirty: boolean; statsDirty: boolean;
  /** Open window. Containers are named by cell only. */
  window: null | { mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string; x?: number; y?: number; z?: number; npc?: string; mob?: number;
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

export function newPlayer(id: string, slot: number, name: string, local: boolean, body: PlayerBody): SimPlayer {
  return {
    id, slot, name, local, online: true, epoch: 1, stalled: false, lingerT: 0, parked: false, unsaved: false,
    dim: 0, body, inv: new Inventory(), stats: new PlayerStats(), modes: { creative: false, hidden: false, god: false },
    bed: null, deathAt: null, portalReturn: {}, safe: [0, 0, 0], mail: [],
    loading: true, arriving: -1, pendingBed: false, retCheck: false, tp: 0, sleeping: false, embedded: null,
    recallT: 0, hazardT: 0, fullT: 0, portalT: 0, portalArmed: true, actCredit: 0, useCredit: 0, digCredit: 0, dig: null,
    fallPeak: 0, grounded: false, speedBudget: 0, moveSeq: 0, lastMoveTick: 0, uiOpen: false, rtt: 0,
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
