// Lets the simulation run on the client's own World while both live in one thread: block reads and
// writes, block entities (created from what the generator placed, as chunks arrive), and light as the
// mesher computed it.
import { BLOCKS } from '../data/blocks';
import type { RealmStore } from '../sim/realm';
import type { BlockEnt } from '../sim/voxels';
import type { World } from '../world/world';

/** The World shows one dimension at a time; the store of any other dimension reads as unloaded. */
class DimStore implements RealmStore {
  onChange: ((x: number, y: number, z: number, old: number, now: number) => void) | null = null;
  constructor(private w: World, private dim: number) {}
  getBlock(x: number, y: number, z: number): number { return this.w.dim === this.dim ? this.w.getBlock(x, y, z) : 0; }
  ready(x: number, z: number): boolean { return this.w.dim === this.dim && this.w.ready(x, z); }
  topY(x: number, z: number): number { return this.w.dim === this.dim ? this.w.topY(x, z) : -1; }
  biomeAt(x: number, z: number): number { return this.w.dim === this.dim ? this.w.biomeAt(x, z) : 0; }
  setBlock(x: number, y: number, z: number, id: number, silent = false): boolean { return this.w.dim === this.dim && this.w.setBlock(x, y, z, id, silent); }
  getEnt(x: number, y: number, z: number): BlockEnt | null { return this.w.dim === this.dim ? this.w.getEnt(x, y, z) : null; }
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null { return this.w.dim === this.dim ? this.w.setEnt(x, y, z, kind, data) : null; }
  removeEnt(x: number, y: number, z: number): void { if (this.w.dim === this.dim) this.w.removeEnt(x, y, z); }
  sky(x: number, y: number, z: number): number { return this.w.getLight(x, y, z) >> 4; }
  block(x: number, y: number, z: number): number { return this.w.getLight(x, y, z) & 15; }
  chunkEnts(cx: number, cz: number): Iterable<BlockEnt> | null {
    const c = this.w.dim === this.dim ? this.w.chunkAt(cx, cz) : null;
    return c && c.ents.size ? c.ents.values() : null;
  }
  areaReady(x: number, z: number, r: number): boolean { return this.w.dim === this.dim && this.w.areaMeshed(x, z, r); }
  touch(e: BlockEnt): void { const c = this.w.dim === this.dim ? this.w.chunkAt(e.x >> 4, e.z >> 4) : null; if (c) c.modified = true; }
}

export class WorldStore {
  private stores: [DimStore, DimStore, DimStore];
  constructor(w: World) {
    this.stores = [new DimStore(w, 0), new DimStore(w, 1), new DimStore(w, 2)];
    w.onBlockChange = (x, y, z, old, now) => { const f = this.stores[w.dim].onChange; if (f) f(x, y, z, old, now); };
    w.onChunkReady = (_c, fresh, ents) => {
      if (!fresh) return;
      for (const e of ents) {
        // a structure stamped later can overwrite the block (overlapping dungeon rooms): do not keep its entity
        if (BLOCKS[w.getBlock(e.x, e.y, e.z)].use !== e.kind) continue;
        w.setEnt(e.x, e.y, e.z, e.kind, e.kind === 'nest' ? { mob: e.data, t: 0 } : { loot: e.data, s: null });
      }
    };
  }
  of(dim: 0 | 1 | 2): RealmStore { return this.stores[dim]; }
}
