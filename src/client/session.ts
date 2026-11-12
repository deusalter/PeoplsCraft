// The client's end of a connection: what arrives is held until the game asks for it, and what the
// player does leaves in the order the host must judge it in.
//
// Inbound. Nothing is delivered from inside a transport callback. Messages wait in arrival order and
// pump() hands them to the handlers registered with on() and onSnapshot(); the game pumps at the start
// of a frame and again right after a simulation step, so a reply never waits for a frame that a
// throttled tab may not run, and a handler never runs in the middle of a tick.
//
// Outbound. An action is judged from where the client acted, with the item it held. act() therefore
// sends a fresh `move` in front of the action when the body has changed since the last one, and the
// hotbar selection that was still waiting. No DOM here: a bot uses this file as the browser does.
import type { ActMsg, C2S, S2C, S2COf } from '../net/protocol';
import { MSG_SNAPSHOT, MV_FLY, MV_GROUND, MV_HEAD_WATER, MV_JUMPED, MV_LAVA, MV_SNEAK, MV_SPRINT, MV_UI, MV_USING, MV_WATER } from '../net/protocol';
import { type Move, encodeMove } from '../net/snapshot';
import type { Transport } from '../net/transport';
import type { InvChannel } from './api';

/** The body as a movement message reports it: everything but the sequence number. */
export type MoveState = Omit<Move, 'seq'>;

/** The MV_ bits of a body. `jumped`: it left the ground by a jump since the last movement message. */
export function moveFlags(b: { onGround: boolean; sprinting: boolean; sneaking: boolean; flying: boolean; inWater: boolean; headInWater: boolean; inLava: boolean },
  jumped: boolean, usingItem: boolean, uiOpen: boolean): number {
  return (b.onGround ? MV_GROUND : 0) | (b.sprinting ? MV_SPRINT : 0) | (b.sneaking ? MV_SNEAK : 0) | (b.flying ? MV_FLY : 0) | (b.inWater ? MV_WATER : 0)
    | (b.headInWater ? MV_HEAD_WATER : 0) | (b.inLava ? MV_LAVA : 0) | (jumped ? MV_JUMPED : 0) | (usingItem ? MV_USING : 0) | (uiOpen ? MV_UI : 0);
}

export class Session {
  /** Where the body is now. Set by whoever owns the body; without it no movement is sent. */
  mover: (() => MoveState) | null = null;
  /** The inventory channel, once there is one: act() and move() send its waiting hotbar selection. */
  inv: InvChannel | null = null;
  /** Messages received and sent, and movement messages among the sent. */
  readonly counts = { in: 0, out: 0, moves: 0 };
  private inbox: (S2C | ArrayBuffer)[] = [];
  private at = 0; private pumping = false;
  private handlers = new Map<string, ((m: never) => void)[]>();
  private snapHandlers: ((b: ArrayBuffer) => void)[] = [];
  private moveSeq = 0;
  private last: MoveState | null = null;

  constructor(readonly transport: Transport) {
    transport.onMessage = (m) => { this.inbox.push(m); };
    transport.onBinary = (b) => { this.inbox.push(b); };
  }

  /** True on the worker and in-thread transports: one player, no latency to hide. */
  get local(): boolean { return this.transport.kind !== 'ws'; }

  /** Call `fn` for every message of this type, in the order of registration among several handlers. */
  on<T extends S2C['t']>(type: T, fn: (m: S2COf<T>) => void): void {
    const l = this.handlers.get(type);
    if (l) l.push(fn as (m: never) => void); else this.handlers.set(type, [fn as (m: never) => void]);
  }
  /** Call `fn` with every snapshot, undecoded. */
  onSnapshot(fn: (b: ArrayBuffer) => void): void { this.snapHandlers.push(fn); }

  /** Deliver everything received so far, in arrival order. What a handler throws reaches the caller; the messages
   *  behind the one that threw stay queued. A pump from inside a handler does nothing. */
  pump(): void {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.at < this.inbox.length) {
        const m = this.inbox[this.at++];
        this.counts.in++;
        if (m instanceof ArrayBuffer) {
          if (m.byteLength && new Uint8Array(m, 0, 1)[0] === MSG_SNAPSHOT) for (const fn of this.snapHandlers) fn(m);
          continue;
        }
        // a welcome starts the connection's counters again before anyone acts on it
        if (m.t === 'welcome') this.reset();
        const l = this.handlers.get(m.t);
        if (l) for (const fn of l) fn(m as never);
      }
    } finally {
      this.inbox.splice(0, this.at); this.at = 0; this.pumping = false;
    }
  }
  /** Messages waiting for the next pump. */
  get queued(): number { return this.inbox.length - this.at; }

  /** A message that is not an action: it goes out as it is. */
  send(m: C2S): void { this.counts.out++; this.transport.send(m); }

  /** An action. In front of it go a `move`, when position, look or flags differ from the last one sent, and the waiting
   *  hotbar selection. A sequenced action took its `seq` from `InvChannel.nextSeq`, which has sent that selection already. */
  act(m: ActMsg): void {
    const s = this.mover ? this.mover() : null;
    if (s && this.changed(s)) this.sendMove(s);
    if (this.inv) this.inv.flushSel();
    this.send(m);
  }
  /** The scheduled movement message (every MOVE_EVERY ticks, and at once on landing and on entering or leaving a liquid),
   *  with the waiting hotbar selection in front of it. */
  move(): void {
    if (this.inv) this.inv.flushSel();
    if (this.mover) this.sendMove(this.mover());
  }

  /** `seq` of the last movement message sent on this connection, 0 before the first: what a snapshot's `ackMove` answers. */
  get lastMove(): number { return this.moveSeq; }
  /** A new connection, or the same one bound again: movement numbering starts over and the next action sends a `move`. */
  reset(): void { this.moveSeq = 0; this.last = null; }

  private changed(s: MoveState): boolean {
    const l = this.last;
    return !l || l.x !== s.x || l.y !== s.y || l.z !== s.z || l.yaw !== s.yaw || l.pitch !== s.pitch || l.flags !== s.flags || l.tp !== s.tp;
  }
  private sendMove(s: MoveState): void {
    this.moveSeq = (this.moveSeq + 1) & 0xffff;
    this.last = { tp: s.tp, x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, yaw: s.yaw, pitch: s.pitch, flags: s.flags };
    this.counts.out++; this.counts.moves++;
    this.transport.sendBin(encodeMove({ seq: this.moveSeq, ...s }));
  }
}
