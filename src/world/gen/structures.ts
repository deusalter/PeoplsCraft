// Structure placement. Each structure type owns a coarse grid; a cell hashes to at most one
// structure origin, so any chunk can decide which structures overlap it without neighbours.
import type { Climate } from './climate';
import type { ChunkWriter } from './types';

export function stampStructures(_w: ChunkWriter, _dim: number, _cx: number, _cz: number, _seed: number, _cl: Climate | null): void {
  // filled in by the structures milestone
}
