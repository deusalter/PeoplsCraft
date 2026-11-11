// One dimension of the world: its blocks, block entities, light, and everything that lives in it.
import { Fluids } from './fluids';
import type { LightSource } from './light';
import { active, type SimPlayer } from './player';
import type { Sim } from './sim';
import type { BlockEnt, BlockEnts, VoxelWrite } from './voxels';

/** The block data a realm runs on, owned by whoever holds the chunks. */
export interface RealmStore extends VoxelWrite, BlockEnts, LightSource {
  /** Every block entity in the chunks within `r` chunks of chunk (cx, cz), row by row. */
  entsNear(cx: number, cz: number, r: number, fn: (e: BlockEnt) => void): void;
  /** The contents of this entity changed and must be saved. Timers do not count. */
  touch(e: BlockEnt): void;
  /** Called after every block change that was not silent. */
  onChange: ((x: number, y: number, z: number, old: number, now: number) => void) | null;
}

export class Realm implements VoxelWrite, BlockEnts {
  /** Every in-memory player of this realm that is not parked, in join order. */
  readonly players: SimPlayer[] = [];
  readonly fluids: Fluids;
  readonly light: LightSource;
  blockT = 0;
  /** Players with a station, chest or forge window open, by cell key `x,y,z`. Not saved. */
  readonly viewers = new Map<string, Set<SimPlayer>>();
  private live: SimPlayer[] = [];

  constructor(readonly sim: Sim, readonly dim: 0 | 1 | 2, readonly store: RealmStore) {
    this.light = store;
    this.fluids = new Fluids(this);
  }

  getBlock(x: number, y: number, z: number): number { return this.store.getBlock(x, y, z); }
  ready(x: number, z: number): boolean { return this.store.ready(x, z); }
  topY(x: number, z: number): number { return this.store.topY(x, z); }
  biomeAt(x: number, z: number): number { return this.store.biomeAt(x, z); }
  setBlock(x: number, y: number, z: number, id: number, silent = false): boolean { return this.store.setBlock(x, y, z, id, silent); }
  getEnt(x: number, y: number, z: number): BlockEnt | null { return this.store.getEnt(x, y, z); }
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null { return this.store.setEnt(x, y, z, kind, data); }
  removeEnt(x: number, y: number, z: number): void { this.store.removeEnt(x, y, z); }
  touchEnt(e: BlockEnt): void { this.store.touch(e); }

  /** Active, alive, not hidden. */
  targets(): readonly SimPlayer[] {
    const l = this.live; l.length = 0;
    for (const p of this.players) if (active(p) && !p.stats.dead && !p.modes.hidden) l.push(p);
    return l;
  }
  /** The target nearest a point, within `maxR`. */
  nearest(x: number, y: number, z: number, maxR: number): SimPlayer | null {
    let best: SimPlayer | null = null, bd = maxR * maxR;
    for (const p of this.targets()) { const b = p.body, d = (b.x - x) ** 2 + (b.y - y) ** 2 + (b.z - z) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  /** Active players within `r` of a column. */
  countNear(x: number, z: number, r: number): number {
    let n = 0;
    for (const p of this.players) if (active(p) && Math.hypot(p.body.x - x, p.body.z - z) < r) n++;
    return n;
  }
  /** The player of this realm closest to a point, whatever its state. Null only in an empty realm. */
  closest(x: number, y: number, z: number): SimPlayer | null {
    const l = this.players;
    if (l.length < 2) return l[0] ?? null;
    let best = l[0], bd = Infinity;
    for (const p of l) { const b = p.body, d = (b.x - x) ** 2 + (b.y - y) ** 2 + (b.z - z) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  /** Forget every viewer of this cell before the block or its entity goes away. */
  closeViewers(x: number, y: number, z: number): void {
    const k = `${x},${y},${z}`, v = this.viewers.get(k);
    if (!v) return;
    for (const p of v) p.window = null;
    this.viewers.delete(k);
  }
}
