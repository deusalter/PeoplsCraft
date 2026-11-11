// Terrain generation as one stateless call. Generators are built and cached here and nowhere else,
// so every thread and every process that asks for a chunk runs the same code on the same inputs.
import { makeDimGen } from '../world/gen/dims';
import { OverworldGen } from '../world/gen/overworld';
import type { GenOut, Generator } from '../world/gen/types';

const gens = new Map<string, Generator>();
function gen(seed: number, dim: number): Generator {
  const k = seed + ':' + dim;
  let g = gens.get(k);
  if (!g) { g = dim === 0 ? new OverworldGen(seed) : makeDimGen(seed, dim); gens.set(k, g); }
  return g;
}

/** FNV-1a, 32 bit, unsigned. */
export function hashBlocks(a: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Generate one chunk. `hash` is of the generated blocks, so two sides can tell whether they generated the same terrain. */
export function genChunk(seed: number, dim: number, cx: number, cz: number): GenOut & { hash: number } {
  const out = gen(seed, dim).generate(cx, cz);
  return { blocks: out.blocks, biomes: out.biomes, hasEmit: out.hasEmit, ents: out.ents, hash: hashBlocks(out.blocks) };
}
