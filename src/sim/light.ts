// Light as the simulation reads it. The sim has no light arrays: from stage 2 a realm answers with two
// approximations over its sim chunks (7.8), which ignore occlusion and err toward light.
import { T_EMIT_B, T_EMIT_G, T_EMIT_R } from '../data/blocks';

/** Light as the spawn and sun-burn rules need it, 0..15 each. Sim code reads light only through this. */
export interface LightSource {
  sky(x: number, y: number, z: number): number;
  block(x: number, y: number, z: number): number;
}

/** What the approximations read of a block store. */
export interface LightField {
  /** The highest opaque y of the column, -1 when its chunk is not ready. */
  skyHeight(x: number, z: number): number;
  /** Cell indices of the emitting blocks of a ready chunk, null when it has none. */
  emitters(cx: number, cz: number): Iterable<number> | null;
  blockAtCell(cx: number, cz: number, i: number): number;
}

/** Reach of both approximations, in blocks. */
export const LIGHT_R = 8;

/** Over columns within Manhattan distance 8 of (x, z), the best of 15 - distance among columns whose highest opaque
 *  block is below y; 0 if none. Rings are searched outward, so the first column found is the best. */
export function skyApprox(f: LightField, x: number, y: number, z: number): number {
  for (let d = 0; d <= LIGHT_R; d++) {
    for (let dx = -d; dx <= d; dx++) {
      const dz = d - Math.abs(dx);
      let h = f.skyHeight(x + dx, z + dz);
      if (h >= 0 && h < y) return 15 - d;
      if (dz) { h = f.skyHeight(x + dx, z - dz); if (h >= 0 && h < y) return 15 - d; }
    }
  }
  return 0;
}

/** Over cells within a cube of radius 8, the best of max(light r, g, b) - Manhattan distance among emitting blocks; 0 if none. */
export function blockLightApprox(f: LightField, x: number, y: number, z: number): number {
  let best = 0;
  const cx0 = (x - LIGHT_R) >> 4, cx1 = (x + LIGHT_R) >> 4, cz0 = (z - LIGHT_R) >> 4, cz1 = (z + LIGHT_R) >> 4;
  for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
    const l = f.emitters(cx, cz);
    if (!l) continue;
    for (const i of l) {
      const ex = (cx << 4) | ((i >> 8) & 15), ez = (cz << 4) | (i >> 12), ey = i & 255;
      const ax = Math.abs(ex - x), ay = Math.abs(ey - y), az = Math.abs(ez - z);
      if (ax > LIGHT_R || ay > LIGHT_R || az > LIGHT_R) continue;
      const id = f.blockAtCell(cx, cz, i), v = Math.max(T_EMIT_R[id], T_EMIT_G[id], T_EMIT_B[id]) - (ax + ay + az);
      if (v > best) best = v;
    }
  }
  return best;
}

/** The stage 2 LightSource of a realm. A realm without a sky has no sky light, as its lighting pass gives none. */
export class ApproxLight implements LightSource {
  constructor(private f: LightField, private hasSky: boolean) {}
  sky(x: number, y: number, z: number): number { return this.hasSky ? skyApprox(this.f, x, y, z) : 0; }
  block(x: number, y: number, z: number): number { return blockLightApprox(this.f, x, y, z); }
}
