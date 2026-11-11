// The block store as the simulation, the client and bots see it. Interfaces only: the stores
// themselves live with whoever owns the data.

export interface VoxelRead {
  /** 0 outside 0..CH-1 and where no data is loaded. */
  getBlock(x: number, y: number, z: number): number;
  /** True when the column's chunk has its generation and its edit set. Bodies freeze where this is false. */
  ready(x: number, z: number): boolean;
  /** Highest non-air y in the column, -1 when not ready. */
  topY(x: number, z: number): number;
  biomeAt(x: number, z: number): number;
}
export interface VoxelWrite extends VoxelRead {
  /** False when y is outside 1..BUILD_MAX, the chunk is not ready, or the id is unchanged.
   *  `silent` keeps the block entity in the cell and skips onBlockChange (doors, furnace lit state, water seep). */
  setBlock(x: number, y: number, z: number, id: number, silent?: boolean): boolean;
}
export interface BlockEnt { x: number; y: number; z: number; kind: string; data: any }
export interface BlockEnts {
  getEnt(x: number, y: number, z: number): BlockEnt | null;
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null;
  removeEnt(x: number, y: number, z: number): void;
}

/** Cell index inside a chunk: ((z & 15) << 4 | (x & 15)) << 8 | y  (same as core/constants.ts `ci`). */
export interface ChunkEdits {
  dim: number; cx: number; cz: number;
  /** +1 for every cell change. 0 = never edited. */
  rev: number;
  /** Sparse form: cell index -> block id. Null when `full` is set. */
  cells: Map<number, number> | null;
  /** Dense form (migration of rewritten chunks, or more than 16,384 edited cells): the whole block array. */
  full: Uint8Array | null;
  /** Stored block entities (opened chests, forges, player containers). */
  ents: Map<number, BlockEnt>;
  /** FNV-1a hash of the generated (pre-edit) blocks, 0 until this process has generated the chunk. */
  genHash: number;
  /** Changed since the last takeDirty. */
  dirty: boolean;
  /** Changed since the last resolved commit that held it (dirty, or taken by a commit still in flight). */
  unsaved: boolean;
  /** The `ce` payload for the current `rev`, encoded once and shared by every subscriber. */
  wire: { rev: number; enc: 0 | 1; data: string } | null;
}
export interface EditStore {
  /** Returns the in-memory ChunkEdits if there is one, else loads from Storage; one promise per chunk. */
  load(dim: number, cx: number, cz: number): Promise<ChunkEdits>;
  peek(dim: number, cx: number, cz: number): ChunkEdits | null;
  /** Mark dirty and unsaved. The ONLY thing that does; mutating `ent.data` without it saves nothing. */
  touch(e: ChunkEdits): void;
  /** Drop from memory. Refused (kept, retried later) while the chunk is subscribed, a sim chunk, or `unsaved`:
   *  nothing is ever reloaded from Storage while a newer version of it is still on its way there. */
  release(dim: number, cx: number, cz: number): void;
}
export interface SimChunk {
  cx: number; cz: number; key: number;
  state: 0 | 1 | 2;                 // 0 wanted, 1 generating or loading edits, 2 ready
  blocks: Uint8Array | null; biomes: Uint8Array | null;
  top: Uint8Array;                  // highest non-air y per column
  sky: Uint8Array;                  // highest T_OPAQUE y per column
  edits: ChunkEdits | null;
  idleT: number;                    // seconds outside SIM_KEEP of every player
}
