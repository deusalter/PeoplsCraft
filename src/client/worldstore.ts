// Lets the simulation run on the client's own World while both live in one thread: block reads and
// writes, block entities, and light as the mesher computed it.
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
  entsNear(cx: number, cz: number, r: number, fn: (e: BlockEnt) => void): void {
    if (this.w.dim !== this.dim) return;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const c = this.w.chunkAt(cx + dx, cz + dz);
      if (!c || !c.ents.size) continue;
      for (const e of c.ents.values()) fn(e);
    }
  }
  touch(e: BlockEnt): void { const c = this.w.dim === this.dim ? this.w.chunkAt(e.x >> 4, e.z >> 4) : null; if (c) c.modified = true; }
}

export class WorldStore {
  private stores: [DimStore, DimStore, DimStore];
  constructor(w: World) {
    this.stores = [new DimStore(w, 0), new DimStore(w, 1), new DimStore(w, 2)];
    w.onBlockChange = (x, y, z, old, now) => { const f = this.stores[w.dim].onChange; if (f) f(x, y, z, old, now); };
  }
  of(dim: 0 | 1 | 2): RealmStore { return this.stores[dim]; }
}
