// Chunk worker: stateless generation and lighting + meshing jobs.
import { CVOL } from '../core/constants';
import { genChunk } from '../sim/genjob';
import { assembleRegion, computeLight, packCenterLight } from './light';
import { meshCenter } from './mesher';

const ctx = self as unknown as { postMessage(m: unknown, t?: Transferable[]): void; onmessage: ((e: MessageEvent) => void) | null };

ctx.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.t === 'gen') {
    const out = genChunk(m.seed, m.dim, m.cx, m.cz);
    ctx.postMessage({ t: 'gen', id: m.id, cx: m.cx, cz: m.cz, blocks: out.blocks, biomes: out.biomes, hasEmit: out.hasEmit, ents: out.ents, hash: out.hash },
      [out.blocks.buffer, out.biomes.buffer]);
  } else if (m.t === 'mesh') {
    const t0 = performance.now();
    const region: ArrayBuffer = m.region, blocks: Uint8Array[] = [], biomes: Uint8Array[] = [];
    for (let n = 0; n < 9; n++) { blocks.push(new Uint8Array(region, n * CVOL, CVOL)); biomes.push(new Uint8Array(region, 9 * CVOL + n * 256, 256)); }
    assembleRegion(blocks);
    computeLight(m.sky, m.emit);
    const parts = meshCenter(biomes, m.cx * 16, m.cz * 16);
    const light = packCenterLight();
    const tr: Transferable[] = [light.buffer, region];
    for (const p of parts) if (p) tr.push(p.pos.buffer, p.uv.buffer, p.light.buffer, p.tint.buffer, p.idx.buffer);
    ctx.postMessage({ t: 'mesh', id: m.id, cx: m.cx, cz: m.cz, parts, light, region, ms: performance.now() - t0 }, tr);
  }
};
