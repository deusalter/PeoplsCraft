// What the hands do to blocks, on the client of a host: a dig is reported, a break, a placement, a door and a door's
// toggle are written into the block store at once under the `seq` of the message that asks the host for them, and the
// host's answer (the `b` of the change, or a `rej`) settles each (4.7). No DOM here: effects go through BlockView.
import { BUILD_MAX } from '../core/constants';
import { B, BLOCKS, T_OPAQUE, T_REPLACE, T_SOLID } from '../data/blocks';
import { item } from '../data/items';
import type { ClientVoxels, VoxChunk, VoxSession } from '../net/clientvoxels';
import type { ActMsg } from '../net/protocol';
import type { Inventory } from '../sim/inventory';
import type { RayHit } from '../sim/physics';
import * as rules from '../sim/rules';
import type { PlayerStats } from '../sim/stats';
import type { Bodies, DigHost, EditHost, InvChannel } from './api';

/** The effects of the player's own block work, which the host does not send back to the one who did it. */
export interface BlockView {
  /** Burst kind 1 (BURST.block) of block `id` at the cell. */
  burst(x: number, y: number, z: number, id: number): void;
  play(name: string, vol: number, rate?: number): void;
  /** One tick of mining: the swing, the dig sound, three chips off the face. */
  digTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void;
}
/** The local player as the client mirrors it. */
export interface BlockMe { readonly inv: Inventory; readonly stats: PlayerStats; readonly modes: { creative: boolean } }
/** The local body: where it stands and how it looks. */
export interface BlockBody {
  x: number; y: number; z: number; hw: number; h: number; yaw: number; pitch: number;
  onGround: boolean; inWater: boolean; headInWater: boolean;
}
export interface BlockDeps {
  vox: ClientVoxels<VoxChunk>;
  session: { act(m: ActMsg): void };
  inv: InvChannel;
  bodies: Bodies;
  me: BlockMe;
  body: BlockBody;
  view: BlockView;
  /** The setting: switch to the best hotbar tool when mining starts. */
  autoTool(): boolean;
}

const DOOR_SWAP: Record<string, string> = { door_x: 'door_x_open', door_x_open: 'door_x', door_z: 'door_z_open', door_z_open: 'door_z' };
/** Sound of a placed block, as `actions.placeSound`. */
export const placeSound = (id: number): string => { const s = BLOCKS[id].sound; return s === 'stone' || s === 'metal' ? 'place' : 'dig_' + s; };

export class BlockClient implements DigHost, EditHost {
  constructor(private d: BlockDeps) {}

  /** Take `rej` from the session: with cells the truth is written, without the chunks holding the prediction resync. */
  attach(s: Pick<VoxSession, 'on'>): void { s.on('rej', (m) => this.d.vox.reject(m.seq, m.cells)); }

  // ---- DigHost --------------------------------------------------------------------------------------

  reach(): number { return rules.reach(this.d.me.stats, this.d.me.modes); }
  breakTime(id: number): number { const m = this.d.me; return rules.breakTime(id, m.inv, m.stats, m.modes, this.d.body); }
  onDigTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void { this.d.view.digTick(x, y, z, id, nx, ny, nz); }
  onDig(on: boolean, x: number, y: number, z: number): void { this.d.session.act({ t: 'dig', on, x, y, z }); }
  /** Auto-tool: when mining starts with a tool (or nothing) in hand, select the best hotbar tool for the block. */
  onDigStart(id: number): void {
    const b = BLOCKS[id], inv = this.d.me.inv, h = inv.held(), cur = h ? item(h.k).tool : undefined;
    if (!this.d.autoTool() || this.d.me.modes.creative || b.tool === 'none' || b.hard < 0 || (h && !cur)) return;
    let best = -1, bestV = cur && cur.kind === b.tool ? (cur.power >= b.power ? 1000 : 0) + cur.speed : -1;
    for (let i = 0; i < 9; i++) {
      const s = inv.slots[i], t = s ? item(s.k).tool : undefined;
      if (!t || t.kind !== b.tool) continue;
      const v = (t.power >= b.power ? 1000 : 0) + t.speed;   // able to harvest first, then fastest
      if (v > bestV) { bestV = v; best = i; }
    }
    if (best >= 0) this.d.inv.setSel(best);
  }
  /** The block broke under the player's hands: air at once (both halves of a door), the burst and the sound, then `edit`. */
  onBroken(x: number, y: number, z: number, id: number): void {
    const v = this.d.vox;
    if (!v.ready(x, z) || v.getBlock(x, y, z) !== id) return;
    const seq = this.d.inv.nextSeq();
    if (BLOCKS[id].door) for (const dy of [-1, 1]) if (v.getBlock(x, y + dy, z) === id) v.predict(seq, x, y + dy, z, 0);
    v.predict(seq, x, y, z, 0);
    this.d.view.burst(x, y, z, id); this.d.view.play('break_' + BLOCKS[id].sound, 0.9);
    this.d.session.act({ t: 'edit', seq, k: 0, x, y, z, id });
  }

  // ---- EditHost -------------------------------------------------------------------------------------

  place(hit: RayHit, id: number): boolean {
    const v = this.d.vox, b = BLOCKS[id];
    let x = hit.x, y = hit.y, z = hit.z;
    if (!T_REPLACE[hit.id]) { x += hit.nx; y += hit.ny; z += hit.nz; }
    if (y < 1 || y > BUILD_MAX || !v.ready(x, z) || !T_REPLACE[v.getBlock(x, y, z)]) return false;
    if (b.solid && (this.overlapsMe(x, y, z) || this.d.bodies.blocked(x, y, z))) return false;
    if (b.support && !(T_SOLID[v.getBlock(x, y - 1, z)] && T_OPAQUE[v.getBlock(x, y - 1, z)])) return false;
    const seq = this.d.inv.nextSeq();
    v.predict(seq, x, y, z, id);
    if (!this.d.me.modes.creative) this.d.inv.internal(seq, { o: '_held', n: 1 });
    this.d.session.act({ t: 'edit', seq, k: 1, x, y, z, id });
    return true;
  }
  placeDoor(hit: RayHit): boolean {
    const v = this.d.vox, x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    if (y < 1 || y + 1 > BUILD_MAX || !v.ready(x, z)) return false;
    if (!T_REPLACE[v.getBlock(x, y, z)] || !T_REPLACE[v.getBlock(x, y + 1, z)] || !T_SOLID[v.getBlock(x, y - 1, z)]) return false;
    const bd = this.d.body, cp = Math.cos(bd.pitch), dx = -Math.sin(bd.yaw) * cp, dz = -Math.cos(bd.yaw) * cp;
    const id = Math.abs(dz) > Math.abs(dx) ? B.door_x : B.door_z;
    const seq = this.d.inv.nextSeq();
    v.predict(seq, x, y, z, id); v.predict(seq, x, y + 1, z, id);
    this.d.inv.internal(seq, { o: '_held', n: 1 });
    this.d.session.act({ t: 'edit', seq, k: 2, x, y, z, id });
    return true;
  }
  toggleDoor(hit: RayHit): boolean {
    const v = this.d.vox, { x, y, z } = hit, key = DOOR_SWAP[BLOCKS[hit.id].key];
    if (!key || !v.ready(x, z) || v.getBlock(x, y, z) !== hit.id) return false;
    const to = B[key], seq = this.d.inv.nextSeq();
    for (const dy of [-1, 1]) if (v.getBlock(x, y + dy, z) === hit.id) v.predict(seq, x, y + dy, z, to);
    v.predict(seq, x, y, z, to);
    this.d.session.act({ t: 'use', seq, x, y, z, id: hit.id });
    return true;
  }

  /** The local body, drawn in by BODY_SHRINK as the host draws in the placer's own box, overlaps the cell. */
  private overlapsMe(x: number, y: number, z: number): boolean {
    const o = this.d.body, s = rules.BODY_SHRINK, hw = o.hw - s;
    return x + 1 > o.x - hw && x < o.x + hw && y + 1 > o.y + s && y < o.y + o.h - s && z + 1 > o.z - hw && z < o.z + hw;
  }
}
