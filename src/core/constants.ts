// World dimensions and index helpers shared by the main thread and workers.
export const CS = 16;            // chunk width / depth
export const CH = 256;           // chunk height
export const CAREA = CS * CS;
export const CVOL = CAREA * CH;
export const SEA = 96;           // overworld sea level
export const BUILD_MAX = 250;    // highest y a block may occupy

// A mesh job works on the 3x3 chunk neighbourhood ("region") around its chunk.
export const RS = CS * 3;
export const RAREA = RS * RS;
export const RVOL = RAREA * CH;

/** Chunk-local index. Column-major so a whole column is one contiguous run. */
export const ci = (x: number, y: number, z: number): number => (((z << 4) | x) << 8) | y;
/** Region-local index (x,z in 0..47). */
export const ri = (x: number, y: number, z: number): number => ((z * RS + x) << 8) | y;
export const chunkKey = (cx: number, cz: number): number => (cx + 32768) * 65536 + (cz + 32768);

export const DIM = { Overworld: 0, Hollows: 1, Rift: 2 } as const;
export type DimId = 0 | 1 | 2;
export const DIM_NAMES = ['Overworld', 'Gloomroot Hollows', 'The Skyrift'];

export const GAME_TITLE = 'Peopls Craft';
export const DAY_LENGTH = 1200;  // seconds per full day
