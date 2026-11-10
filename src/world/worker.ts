// Chunk worker: stateless generation and lighting + meshing jobs.
import type { Generator } from './gen/types';
import { OverworldGen } from './gen/overworld';
import { makeDimGen } from './gen/dims';
import { assembleRegion, computeLight, packCenterLight } from './light';
import { meshCenter } from './mesher';

const ctx = self as unknown as { postMessage(m: unknown, t?: Transferable[]): void; onmessage: ((e: MessageEvent) => void) | null };
const gens = new Map<string, Generator>();
function gen(seed: number, dim: number): Generator {
  const k = seed + ':' + dim;
  let g = gens.get(k);
  if (!g) { g = dim === 0 ? new OverworldGen(seed) : makeDimGen(seed, dim); gens.set(k, g); }
  return g;
}

ctx.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.t === 'gen') {
    const out = gen(m.seed, m.dim).generate(m.cx, m.cz);
    ctx.postMessage({ t: 'gen', id: m.id, cx: m.cx, cz: m.cz, blocks: out.blocks, biomes: out.biomes, hasEmit: out.hasEmit, ents: out.ents },
      [out.blocks.buffer, out.biomes.buffer]);
  } else if (m.t === 'mesh') {
    const t0 = performance.now();
    assembleRegion(m.blocks);
    computeLight(m.sky, m.emit);
    const parts = meshCenter(m.biomes, m.cx * 16, m.cz * 16);
    const light = packCenterLight();
    const tr: Transferable[] = [light.buffer];
    for (const p of parts) if (p) tr.push(p.pos.buffer, p.uv.buffer, p.light.buffer, p.tint.buffer, p.idx.buffer);
    ctx.postMessage({ t: 'mesh', id: m.id, cx: m.cx, cz: m.cz, rev: m.rev, parts, light, ms: performance.now() - t0 }, tr);
  }
};
