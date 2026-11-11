// The world record as SaveDB stores it (one object holding the world and its one player), to and from
// the records the simulation is built on.
import { toRecord, type SimPlayer } from '../sim/player';
import { findSpawn } from '../sim/rules';
import type { Sim } from '../sim/sim';
import type { PlayerRecord, WorldRecord } from '../sim/storage';
import type { WorldMeta } from '../systems/save';
import type { Climate } from '../world/gen/climate';

export const LOCAL_ID = 'local';

export function fromLegacy(meta: WorldMeta, climate: Climate): { world: WorldRecord; player: PlayerRecord | null } {
  const d = meta.data, ev = d?.events;
  const world: WorldRecord = {
    format: 2, id: meta.id, name: meta.name, seed: meta.seed, seedText: meta.seedText, created: meta.created, played: meta.played,
    owner: LOCAL_ID, palettes: d?.palettes ?? [], names: { [LOCAL_ID]: { name: 'Player', seen: meta.played } },
    state: {
      clock: d?.clock ?? 0.06, tick: d?.tick ?? 0, rnd: d?.rnd ?? ((meta.seed ^ 0x5bd1e995) | 0), flags: [...(d?.flags || [])], quest: d?.quests ?? 0,
      events: { a: ev?.a ?? null, k: ev?.k ?? 0, g: ev?.g ?? 0, l: ev?.l ?? -10 }, homes: Array.isArray(d?.npcs) ? d.npcs : [],
      worldSpawn: d?.worldSpawn ?? findSpawn(climate), gates: [], summons: [], owed: {},
    },
  };
  if (!d) return { world, player: null };
  const player: PlayerRecord = {
    v: 1, id: LOCAL_ID, name: 'Player', seen: meta.played, dim: d.dim ?? 0, pos: { x: d.player.x, y: d.player.y, z: d.player.z, yaw: d.player.yaw, pitch: d.player.pitch },
    inv: d.inv, stats: d.stats, bed: d.spawn ?? null, deathAt: d.deathAt ?? null, portalReturn: d.portalReturn || {},
    safe: Array.isArray(d.safe) ? [d.safe[0], d.safe[1], d.safe[2]] : [d.player.x, d.player.y, d.player.z],
    arriving: d.arriving ?? -1, pendingBed: !!d.pendingBed, recallT: 0, modes: { creative: false, hidden: false, god: false }, mail: [],
  };
  return { world, player };
}

/** `meta.data` of a save taken now. */
export function toLegacy(sim: Sim, p: SimPlayer, palettes: string[][]): unknown {
  const s = sim.exportShared(), r = toRecord(p, 0);
  return { player: r.pos, dim: r.dim, clock: s.clock, inv: r.inv, stats: r.stats, flags: s.flags, spawn: r.bed, deathAt: r.deathAt, quests: s.quest, events: s.events,
    npcs: s.homes, portalReturn: r.portalReturn, worldSpawn: s.worldSpawn, palettes, arriving: r.arriving, pendingBed: r.pendingBed, safe: r.safe, rnd: s.rnd, tick: s.tick };
}
