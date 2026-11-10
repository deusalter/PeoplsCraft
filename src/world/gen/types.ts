import { CH, CS } from '../../core/constants';
import { T_REPLACE } from '../../data/blocks';

/** A block entity the generator wants created (chest loot, nests, ...). Coordinates are world-space. */
export interface EntInit { x: number; y: number; z: number; kind: string; data: string }
export interface GenOut { blocks: Uint8Array; biomes: Uint8Array; hasEmit: boolean; ents: EntInit[] }
export interface Generator { generate(cx: number, cz: number): GenOut }

/** Writes blocks using world coordinates, silently clipping to one chunk. Lets trees and
 *  structures be stamped identically from every chunk they overlap. */
export class ChunkWriter {
  ents: EntInit[] = [];
  constructor(readonly blocks: Uint8Array, readonly ox: number, readonly oz: number) {}
  inside(x: number, y: number, z: number): boolean {
    const lx = x - this.ox, lz = z - this.oz;
    return lx >= 0 && lx < CS && lz >= 0 && lz < CS && y >= 0 && y < CH;
  }
  get(x: number, y: number, z: number): number {
    const lx = x - this.ox, lz = z - this.oz;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 0 || y >= CH) return -1;
    return this.blocks[(((lz << 4) | lx) << 8) | y];
  }
  set(x: number, y: number, z: number, id: number): void {
    const lx = x - this.ox, lz = z - this.oz;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 1 || y >= CH - 4) return;
    this.blocks[(((lz << 4) | lx) << 8) | y] = id;
  }
  /** Set only where the cell is air or another replaceable block. */
  soft(x: number, y: number, z: number, id: number): void {
    const lx = x - this.ox, lz = z - this.oz;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 1 || y >= CH - 4) return;
    const i = (((lz << 4) | lx) << 8) | y;
    if (T_REPLACE[this.blocks[i]]) this.blocks[i] = id;
  }
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
    const ax = Math.max(x0, this.ox), bx = Math.min(x1, this.ox + CS - 1);
    const az = Math.max(z0, this.oz), bz = Math.min(z1, this.oz + CS - 1);
    for (let z = az; z <= bz; z++) for (let x = ax; x <= bx; x++) for (let y = y0; y <= y1; y++) this.set(x, y, z, id);
  }
  ent(x: number, y: number, z: number, kind: string, data = ''): void {
    if (this.inside(x, y, z)) this.ents.push({ x, y, z, kind, data });
  }
}
