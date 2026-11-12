// What the client's modules ask of each other. Each interface is implemented by one module and
// called by another; neither needs to know more of the other than this.
import type { InvOp, OpResult } from '../sim/invops';
import type { RayHit } from '../sim/physics';

/** The mining half of what the hands do, called by `Interact` while the left button is held on a block. */
export interface DigHost {
  reach(): number;
  /** Seconds to break the block with the held item; Infinity if it cannot be broken. */
  breakTime(id: number): number;
  onBroken(x: number, y: number, z: number, id: number): void;
  /** Called once when mining turns to a new block, before its break time is read.
   *  Not called while the press began as an attack, or within a second of the last attack. */
  onDigStart(id: number): void;
  onDigTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void;
  /** Progress began to build on the block at this cell (`on`), or stopped building on it: the button was let go, the
   *  aim left it, or it broke. A change of block is reported as the new block coming on, with no stop in between.
   *  Called before the tick's `onDigTick` and `onBroken`. */
  onDig(on: boolean, x: number, y: number, z: number): void;
}

/** The other half: what a click does before it is a dig or a placement. */
export interface ActHost {
  /** Left click. Return true if something other than mining consumed it (an attack). */
  primary(pressed: boolean, held: boolean): boolean;
  /** Right click. `hit` is the targeted block if any. Return true if consumed. */
  secondary(hit: RayHit | null, pressed: boolean): boolean;
}

/** Block edits the client makes ahead of the host: each checks what the client can check, writes the cells, and sends
 *  the message that asks for it (4.7). False when the edit was refused here and nothing was sent; on true the caller
 *  plays the sound and the swing, as it does today. */
export interface EditHost {
  /** Put block `id`, the held item's, against the targeted face (into the target itself when that can be replaced). */
  place(hit: RayHit, id: number): boolean;
  /** Stand the held door on the targeted face, turned across the view. */
  placeDoor(hit: RayHit): boolean;
  /** Open or shut the door that is the targeted block. */
  toggleDoor(hit: RayHit): boolean;
}

/** The client's end of the inventory channel: ops are applied to the local copy at once, sent, and
 *  replayed over every state the host sends until it has acknowledged them. */
export interface InvChannel {
  /** The `seq` for the next sequenced message (`op`, `edit`, `use`, `item`, `fire`; one counter for all, from 1 after each
   *  hello). A hotbar selection still waiting to be sent goes out first, under the number before. */
  nextSeq(): number;
  /** Apply an op locally and send it under the next `seq`. The result says what to play and toast. */
  send(op: InvOp): OpResult;
  /** Apply a prediction-only op (`_held`, `_slot`) locally and queue it under the `seq` of the action that causes it,
   *  so it is replayed until that action is acknowledged. Nothing is sent. */
  internal(seq: number, op: Extract<InvOp, { o: '_held' | '_slot' }>): void;
  /** Hotbar digits and wheel: select at once on the local copy; the `sel` op waits for the next movement send or action. */
  setSel(i: number): void;
  /** Send the waiting selection now, if there is one. */
  flushSel(): void;
}

/** What the client can see standing in a cell. Placement is refused locally where this says so. */
export interface Bodies {
  /** True when a creature (not a minion) or another player, as this client sees them now, overlaps the block cell. */
  blocked(x: number, y: number, z: number): boolean;
}

/** A shot the client shows before the host has confirmed it. */
export interface Ghosts {
  /** Fly a stand-in for the shot of the `fire` message `seq`: projectile kind (key of PROJECTILES), origin, unit direction,
   *  and the speed when the weapon sets one. It gives way to the real projectile when the `ps` naming `seq` arrives,
   *  and is dropped after GHOST_SECONDS without one. */
  ghost(seq: number, kind: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, speed?: number): void;
}
