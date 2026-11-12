// Saves of the build before multiplayer, turned into the records of this one (8.4). Pure: the store that
// reads the old records hands them in and writes what comes out.
import { CVOL } from '../core/constants';
import { BLOCKS } from '../data/blocks';
import { packFull, packSparse } from '../net/codec';
import { Climate } from '../world/gen/climate';
import type { EntInit } from '../world/gen/types';
import { findSpawn } from './rules';
import type { ChunkRecord, PlayerRecord, WorldRecord } from './storage';

/** The record id a local transport maps to: the one player of a solo world. */
export const LOCAL_ID = 'local';
/** An edit set with more cells than this is stored as the whole array. */
export const LEGACY_DENSE_AT = 16384;

/** A `worlds` record of the old build: no `format`, everything of the world and its one player in `data`. */
export interface LegacyWorld { id: string; name: string; seed: number; seedText: string; created: number; played: number; data: any }
/** A `chunks` record of the old build: RLE blocks, biomes, the emitter flag, the entity list, the palette index. */
export interface LegacyChunk { d: Uint8Array; b?: Uint8Array; h?: boolean; e?: { x: number; y: number; z: number; kind: string; data: any }[]; p?: number }

/** The current block table as a palette. */
export const blockKeys = (): string[] => BLOCKS.map((b) => b.key);

/** Index of the current block table in `palettes`, added at the end when the last one differs (8.3). */
export function currentPalette(palettes: string[][]): number {
  const keys = blockKeys(), last = palettes[palettes.length - 1];
  if (!last || last.length !== keys.length || last.some((k, i) => k !== keys[i])) palettes.push(keys);
  return palettes.length - 1;
}
/** Old id -> current id for a block table; unknown keys become air. Null when it is the current table. */
export function paletteMap(table: string[] | null): Uint8Array | null {
  const keys = blockKeys(), map = new Uint8Array(256);
  if (!table) return null;
  let same = table.length === keys.length;
  table.forEach((k, i) => { const id = keys.indexOf(k); map[i] = id < 0 ? 0 : id; if (id !== i) same = false; });
  return same ? null : map;
}

/** The world and player records of a legacy world record (8.4 step 2). `player` is null for a world never saved. */
export function splitLegacyWorld(rec: LegacyWorld): { world: WorldRecord; player: PlayerRecord | null } {
  const d = rec.data, ev = d?.events, palettes: string[][] = Array.isArray(d?.palettes) ? d.palettes.map((t: string[]) => [...t]) : [];
  currentPalette(palettes);
  const world: WorldRecord = {
    format: 2, id: rec.id, name: rec.name, seed: rec.seed, seedText: rec.seedText, created: rec.created, played: rec.played,
    owner: LOCAL_ID, palettes, names: { [LOCAL_ID]: { name: 'Player', seen: rec.played } },
    state: {
      clock: d?.clock ?? 0.06, tick: d?.tick ?? 0, rnd: d?.rnd ?? ((rec.seed ^ 0x5bd1e995) | 0), flags: [...(d?.flags || [])], quest: d?.quests ?? 0,
      events: { a: ev?.a ?? null, k: ev?.k ?? 0, g: ev?.g ?? 0, l: ev?.l ?? -10 }, homes: Array.isArray(d?.npcs) ? d.npcs.map((h: object) => ({ ...h })) : [],
      worldSpawn: Array.isArray(d?.worldSpawn) ? [d.worldSpawn[0], d.worldSpawn[1]] : findSpawn(new Climate(rec.seed)), gates: [], summons: [], owed: {},
    },
  };
  if (!d) return { world, player: null };
  const pos = d.player ?? { x: world.state.worldSpawn[0] + 0.5, y: 160, z: world.state.worldSpawn[1] + 0.5, yaw: 0, pitch: 0 };
  const player: PlayerRecord = {
    v: 1, id: LOCAL_ID, name: 'Player', seen: rec.played, dim: d.dim ?? 0, pos: { x: pos.x, y: pos.y, z: pos.z, yaw: pos.yaw ?? 0, pitch: pos.pitch ?? 0 },
    inv: d.inv, stats: d.stats, bed: Array.isArray(d.spawn) ? [d.spawn[0], d.spawn[1], d.spawn[2]] : null, deathAt: d.deathAt ?? null, portalReturn: { ...(d.portalReturn || {}) },
    safe: Array.isArray(d.safe) ? [d.safe[0], d.safe[1], d.safe[2]] : [pos.x, pos.y, pos.z],
    arriving: d.arriving ?? -1, pendingBed: !!d.pendingBed, recallT: 0, modes: { creative: false, hidden: false, god: false, fly: false }, mail: [],
  };
  return { world, player };
}

/** What a legacy chunk becomes, with what the conversion counted. */
export interface LegacyDiff { rec: ChunkRecord; edits: number; dense: boolean }

/** A legacy chunk as an edit record (8.4 step 5). `saved` is its whole block array in current ids, `gen` today's
 *  generation of the same chunk, `ents` the legacy entity list. `pal` is the index of the current table. */
export function diffLegacyChunk(dim: number, cx: number, cz: number, saved: Uint8Array, gen: { blocks: Uint8Array; ents: readonly EntInit[] },
  ents: readonly { x: number; y: number; z: number; kind: string; data: any }[], pal: number): LegacyDiff {
  const cells = new Map<number, number>(), g = gen.blocks, n = Math.min(CVOL, saved.length);
  for (let i = 0; i < n; i++) if (saved[i] !== g[i]) cells.set(i, saved[i]);
  const has = new Set<number>();
  for (const e of ents) has.add(((((e.z & 15) << 4) | (e.x & 15)) << 8) | e.y);
  // a container the player removed must not come back by the generator-entity rule
  for (const e of gen.ents) {
    const i = ((((e.z & 15) << 4) | (e.x & 15)) << 8) | e.y;
    if (!has.has(i) && !cells.has(i)) cells.set(i, saved[i]);
  }
  const stored = ents.map((e) => ({ x: e.x, y: e.y, z: e.z, kind: e.kind, data: e.data }));
  const dense = cells.size > LEGACY_DENSE_AT;
  const rec: ChunkRecord = dense
    ? { dim, cx, cz, rev: 1, pal, enc: 1, data: packFull(saved), ents: stored }
    : { dim, cx, cz, rev: 1, pal, enc: 0, data: packSparse(cells), ents: stored };
  return { rec, edits: cells.size, dense };
}
