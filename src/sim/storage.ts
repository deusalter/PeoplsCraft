// What a save holds. The record types only: the stores that read and write them belong to the host.
import type { Item } from '../data/items';
import type { SharedState } from './sim';

export interface WorldRecord {
  format: 2;
  id: string; name: string; seed: number; seedText: string; created: number; played: number;
  /** Record id that a local transport always maps to (solo), null on a server. */
  owner: string | null;
  /** Block-key tables; a chunk record's `pal` indexes this. */
  palettes: string[][];
  /** Known players: unique names. */
  names: Record<string, { name: string; seen: number }>;
  state: SharedState;
}
export interface PlayerRecord {
  v: 1; id: string; name: string; seen: number;
  dim: number; pos: { x: number; y: number; z: number; yaw: number; pitch: number };
  inv: unknown;      // Inventory.serialize()
  stats: unknown;    // PlayerStats.serialize()
  bed: [number, number, number] | null;
  deathAt: [number, number, number, number] | null;
  portalReturn: Record<number, [number, number, number]>;
  safe: [number, number, number];
  arriving: number; pendingBed: boolean; recallT: number;
  modes: { creative: boolean; hidden: boolean; god: boolean };
  mail: Item[];
}
