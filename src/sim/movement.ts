// The movement stream: a client owns its body and says where it is 20 times a second; the host keeps
// the last position it believes and corrects the client when a move could not have happened. The
// stream is also how the host knows a client is alive (stall), and the check lets a body that a
// block has come to overlap walk out of it instead of pulling it back in for ever.
import { BODY_Y_MAX, BODY_Y_MIN, MV_FLY, MV_JUMPED, MV_SNEAK, MV_SPRINT, MV_UI, MV_USING, XZ_MAX } from '../net/protocol';
import { decodeMove } from '../net/snapshot';
import { T_LIQH, T_LIQUID } from '../data/blocks';
import { JUMP_V } from './body';
import { STEP } from './clock';
import { boxFree, liquidAt, newRayHit, raycast } from './physics';
import { flightAllowed, onDeath, STALL_AFTER, type SimPlayer } from './player';
import { bodyFree, freeSpot, maxSpeed } from './rules';
import type { Sim } from './sim';
import { sendTp } from './travel';

/** Ticks a base of the rise rule lasts, and the ticks after a blow in which a rise or a knock is allowed for. */
const RISE_TICKS = 60, HURT_TICKS = 60;
/** How long a body may stay inside a block before the sim moves it (ticks), and how far it may wander inside meanwhile. */
const EMBED_TICKS = 180, EMBED_R = 3;

/** What became of one movement message. `dropped`: not judged (another teleport, loading, dead, arriving, not a move). */
export type MoveResult = 'ok' | 'dropped' | 'bad' | 'speed' | 'rise' | 'space';

const ray = newRayHit();

/** One movement message from the client bound to `p` (4.5). The body is moved, or the client is sent back with a `tp`. */
export function handleMove(sim: Sim, p: SimPlayer, buf: DataView | ArrayBuffer): MoveResult {
  const m = decodeMove(buf), tick = sim.tick;
  // 1. any message is a sign of life, whatever becomes of it
  p.lastMoveTick = tick; p.stalled = false;
  if (!m || m.tp !== p.tp || p.loading || p.stats.dead || p.arriving >= 0) return 'dropped';
  p.moveSeq = m.seq;
  const b = p.body, realm = sim.realms[p.dim], st = p.stats;
  const fail = (why: Exclude<MoveResult, 'ok' | 'dropped'>): MoveResult => {
    // the body has not moved: the note that it stands inside a block still holds after the teleport
    const e = p.embedded;
    sendTp(sim, p, false);
    p.embedded = e;
    sim.deps.log('info', `move ${p.name}: ${why} at ${m.x.toFixed(2)} ${m.y.toFixed(2)} ${m.z.toFixed(2)}`);
    return why;
  };
  // 2.
  const { x, y, z } = m;
  if (![x, y, z, m.vx, m.vy, m.vz, m.yaw, m.pitch].every(Number.isFinite) || y < BODY_Y_MIN || y > BODY_Y_MAX || Math.abs(x) > XZ_MAX || Math.abs(z) > XZ_MAX) return fail('bad');
  // 3. speed: the budget earned since the stored position, capped, never cutting what a knock put above the cap
  const canFly = flightAllowed(p), flying = canFly && (m.flags & MV_FLY) !== 0, ms = maxSpeed(st, canFly), cap = ms * 1.875;
  if (p.speedBudget < cap) p.speedBudget = Math.min(cap, p.speedBudget + ms * 1.25 * (tick - p.moveOkTick) * STEP);
  p.moveOkTick = tick;
  const dist = Math.hypot(x - b.x, z - b.z);
  if (dist > p.speedBudget) return fail('speed');
  const inWater = liquidAt(realm, x, y + 0.4, z) === 1, inLava = liquidAt(realm, x, y + 0.3, z) === 2, liquid = inWater || inLava;
  const hurt = tick - p.hurtTick <= HURT_TICKS;
  const newBase = y <= p.riseY || tick - p.riseTick > RISE_TICKS || flying || liquid || hurt;
  if (!newBase && y - p.riseY > JUMP_V * Math.sqrt(1 + st.d.jump) + 2) return fail('rise');
  // 4. space, where the host holds the blocks; a move into a chunk it does not hold is taken as it comes
  let freeThere = false;
  if (realm.ready(Math.floor(x), Math.floor(z))) {
    freeThere = bodyFree(realm, x, y, z, b.hw, b.h);
    let ok = freeThere && clearPath(sim, p, x, y, z);
    if (!ok && !p.embedded && !bodyFree(realm, b.x, b.y, b.z, b.hw, b.h)) p.embedded = { x: b.x, y: b.y, z: b.z, t: tick };
    const e = p.embedded;
    // inside a block the client walks out as its own collision lets it: anywhere near where the body was caught
    if (e) ok = Math.hypot(x - e.x, y - e.y, z - e.z) <= EMBED_R;
    if (!ok) return fail('space');
  }
  // 6.
  const wasGrounded = p.grounded;
  b.px = b.x; b.py = b.y; b.pz = b.z;
  b.x = x; b.y = y; b.z = z; b.vx = m.vx; b.vy = m.vy; b.vz = m.vz; b.yaw = m.yaw; b.pitch = m.pitch;
  b.sprinting = (m.flags & MV_SPRINT) !== 0; b.sneaking = (m.flags & MV_SNEAK) !== 0; b.flying = flying;
  p.usingItem = (m.flags & MV_USING) !== 0; p.uiOpen = (m.flags & MV_UI) !== 0;
  if (p.embedded && freeThere) p.embedded = null;
  const grounded = !boxFree(realm, x - b.hw, y - 0.08, z - b.hw, x + b.hw, y + b.h - 0.08, z + b.hw);
  p.grounded = b.onGround = grounded;
  b.inWater = inWater; b.inLava = inLava;
  const hy = y + b.eye, hid = realm.getBlock(Math.floor(x), Math.floor(hy), Math.floor(z));
  b.headInWater = T_LIQUID[hid] === 1 && (hy - Math.floor(hy) < T_LIQH[hid] / 16 || liquidAt(realm, x, hy + 1, z) === 1);
  p.speedBudget -= dist;
  if (newBase) { p.riseY = y; p.riseTick = tick; }
  // 7. the fall, judged as the body judges it: from the highest point since it last stood, a jump in the air starting it again
  if ((m.flags & MV_JUMPED) !== 0 && !wasGrounded && p.airJumps < st.d.extraJump) { p.fallPeak = y; p.airJumps++; }
  if (liquid || flying || p.embedded) { p.fallPeak = y; if (liquid || flying) p.airJumps = 0; }
  else if (grounded) {
    const landed = p.fallPeak - y;
    p.fallPeak = y; p.airJumps = 0;
    if (!wasGrounded && landed > 3.6 && !st.d.noFall && !p.modes.creative) {
      st.hurtT = 0;
      const took = st.damage((landed - 3) * 5.5, sim.rnd, true);
      if (took > 0) {
        p.hurtTick = tick;
        sim.sink.send(p.slot, { t: 'hurt', dmg: took, fx: x, fz: z, knock: 0, cause: 'fall' });
        if (st.dead) onDeath(sim, p, 'fall');
      }
    }
  } else if (y > p.fallPeak) p.fallPeak = y;
  // 8.
  if (grounded && !p.embedded) { p.safe[0] = x; p.safe[1] = y; p.safe[2] = z; }
  return 'ok';
}

/** No solid block between the centre of the stored body and the centre of the body at (x, y, z). */
function clearPath(sim: Sim, p: SimPlayer, x: number, y: number, z: number): boolean {
  const b = p.body, c = b.h / 2, dx = x - b.x, dy = y - b.y, dz = z - b.z, len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return true;
  raycast(sim.realms[p.dim], b.x, b.y + c, b.z, dx / len, dy / len, dz / len, len, ray, false, true);
  return !ray.hit;
}

/** The stall rule (7.9), for the step to run on every player: online, loaded, not local, and silent for STALL_AFTER ticks. */
export function checkStall(sim: Sim, p: SimPlayer): boolean {
  p.stalled = p.online && !p.loading && !p.local && sim.tick - p.lastMoveTick >= STALL_AFTER;
  return p.stalled;
}

/** The embedded timeout (4.5 step 4), for the step to run on every active player: a body still inside a block 3 s after it
 *  was found there is moved to the nearest free spot. A block that has gone in the meantime just ends the note. */
export function tickEmbedded(sim: Sim, p: SimPlayer): void {
  const e = p.embedded;
  if (!e || sim.tick - e.t < EMBED_TICKS) return;
  const b = p.body, realm = sim.realms[p.dim];
  if (bodyFree(realm, b.x, b.y, b.z, b.hw, b.h)) { p.embedded = null; return; }
  const q = freeSpot(realm, b.x, b.y, b.z, b.hw, b.h);
  b.teleport(q[0], q[1], q[2]);
  sendTp(sim, p, false);
}

/** The position check before a player turns active (4.5, "putting a body somewhere"): with its chunk ready, a body without
 *  room is moved to `freeSpot`. True when it was moved; the caller's activation `tp` then carries the new place. */
export function checkPosition(sim: Sim, p: SimPlayer): boolean {
  const b = p.body, realm = sim.realms[p.dim];
  if (!realm.ready(Math.floor(b.x), Math.floor(b.z)) || bodyFree(realm, b.x, b.y, b.z, b.hw, b.h)) return false;
  const q = freeSpot(realm, b.x, b.y, b.z, b.hw, b.h);
  b.teleport(q[0], q[1], q[2]);
  return true;
}
