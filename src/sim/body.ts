// The player's body: walking, sprinting, sneaking, swimming, jumping and flight against a voxel store.
// No camera and no DOM, so the client, the simulation and bots all move the same way.
import { clamp } from '../core/noise';
import { T_LIQH, T_LIQUID } from '../data/blocks';
import { Body, boxFree, liquidAt, moveBody } from './physics';
import type { VoxelRead } from './voxels';

export const WALK = 4.32, SPRINT = 5.75, SNEAK = 1.35, JUMP_V = 8.7, GRAVITY = 32;

/** Held keys and press edges by KeyboardEvent.code. A press edge lasts until a tick has read it. */
export interface InputState { down(code: string): boolean; hit(code: string): boolean }

export class PlayerBody implements Body {
  x = 0; y = 120; z = 0; vx = 0; vy = 0; vz = 0;
  px = 0; py = 0; pz = 0;                 // previous tick position, for interpolation
  hw = 0.3; h = 1.8;
  onGround = false; hitH = false; hitUp = false;
  yaw = 0; pitch = 0;
  sprinting = false; sneaking = false; flying = false; noclip = false;
  inWater = false; headInWater = false; inLava = false;
  moveMult = 1; jumpMult = 1; extraJumps = 0; private jumpsLeft = 0;
  frozen = false;
  autoJump = false; canFly = false;       // options pushed in by the game each tick
  walkDist = 0; protected lastMoved = 0;  // ground distance walked, and the share of it added by the last tick
  hspeed = 0;                             // horizontal speed actually achieved last tick (0 against a wall, unlike vx/vz)
  fallPeak = 0; landed = 0;               // landed = fall distance reported on the tick of landing
  eye = 1.62;
  ex = 0; ey = 0; ez = 0;                 // rendered eye position (interpolated, with bob, without shake)
  private lastW = -1; private lastSpace = -1; private jumpCd = 0;
  protected stall = 0;                    // seconds spent pushing into something without getting anywhere
  private coyote = 0; private jumpBuf = 0;
  private hop = 0; private wasFluid = false;
  protected landDip = 0; protected dipV = 0;   // landing dip of the view: kicked on the tick of landing, sprung back by the camera
  kbx = 0; kbz = 0;                       // decaying knockback velocity

  teleport(x: number, y: number, z: number): void {
    this.x = this.px = this.ex = x; this.y = this.py = y; this.z = this.pz = this.ez = z; this.ey = y + this.eye;
    this.vx = this.vy = this.vz = 0; this.fallPeak = y;
    this.hspeed = this.lastMoved = this.stall = this.coyote = this.jumpBuf = this.hop = this.landDip = this.dipV = 0;
  }

  look(dx: number, dy: number, sens: number): void {
    this.yaw -= dx * sens; this.pitch = clamp(this.pitch - dy * sens, -1.5533, 1.5533);
  }

  tick(dt: number, input: InputState, w: VoxelRead, time: number): void {
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.landed = 0; this.lastMoved = 0;
    if (this.frozen) { this.vx = this.vz = this.kbx = this.kbz = this.hspeed = 0; this.sprinting = false; return; }
    if (!w.ready(Math.floor(this.x), Math.floor(this.z))) { this.hspeed = 0; return; }

    const f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0), s = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    const ctrl = input.down('ControlLeft') || input.down('ControlRight'), shift = input.down('ShiftLeft') || input.down('ShiftRight');
    // `tap` is the press edge: it survives until a tick reads it, so a tap shorter than a tick still jumps
    const jump = input.down('Space'), tap = input.hit('Space');
    if (tap) this.jumpBuf = 0.12; else if (this.jumpBuf > 0) this.jumpBuf -= dt;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
    const wl = Math.hypot(wx, wz);
    if (wl > 0) { wx /= wl; wz /= wl; }

    this.inWater = liquidAt(w, this.x, this.y + 0.4, this.z) === 1;
    // the head is under only below the drawn surface, which sits 2/16 short of the top of an open water cell
    const hy = this.y + this.eye, hid = w.getBlock(Math.floor(this.x), Math.floor(hy), Math.floor(this.z));
    this.headInWater = T_LIQUID[hid] === 1 && (hy - Math.floor(hy) < T_LIQH[hid] / 16 || liquidAt(w, this.x, hy + 1, this.z) === 1);
    this.inLava = liquidAt(w, this.x, this.y + 0.3, this.z) === 2;
    const fluid = this.inWater || this.inLava;

    // sprint: hold R or Ctrl, or double-tap W (R is the browser-safe one: Ctrl+W closes the tab)
    if (input.hit('KeyW')) { if (time - this.lastW < 0.28) this.sprinting = true; this.lastW = time; }
    if ((ctrl || input.down('KeyR')) && f > 0) this.sprinting = true;
    this.sneaking = shift && !this.flying;
    if (f <= 0 || this.sneaking) this.sprinting = false;

    // double-tap Space takes off and lands when flight is allowed
    if (this.canFly && tap) {
      if (time - this.lastSpace < 0.3) { this.flying = !this.flying; this.vy = 0; this.jumpBuf = 0; this.lastSpace = -1; } else this.lastSpace = time;
    }

    if (this.flying) {
      const sp = this.sprinting ? 24 : 11, k = Math.min(1, 10 * dt);
      this.vx += (wx * sp - this.vx) * k; this.vz += (wz * sp - this.vz) * k;
      this.vy += (((jump ? 1 : 0) - (shift ? 1 : 0)) * sp * 0.8 - this.vy) * k;
      if (this.noclip) { this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt; }
      else moveBody(w, this, this.vx * dt, this.vy * dt, this.vz * dt);
      this.hspeed = Math.hypot(this.vx, this.vz);
      if (this.canFly && this.onGround && shift && !this.noclip) this.flying = false;   // descending onto the ground lands
      this.fallPeak = this.y; this.coyote = this.stall = this.hop = 0; this.wasFluid = false;
      return;
    }

    const speed = (fluid ? (this.sprinting ? 3.1 : 2.3) : this.sneaking ? SNEAK : this.sprinting ? SPRINT : WALK) * this.moveMult;
    // air control is strong from a standstill (so a hop onto a ledge you are pressed against carries you over it)
    // and falls back to the old gentle rate at full speed, which leaves running jumps on their arc
    const air = 3.2 + 7 * Math.max(0, 1 - Math.hypot(this.vx, this.vz) / Math.max(0.1, speed));
    const accel = fluid ? 5 : this.onGround ? (wl > 0 ? 15 : 13) : wl > 0 ? air : 0.6;
    const k = Math.min(1, accel * dt);
    this.vx += (wx * speed - this.vx) * k; this.vz += (wz * speed - this.vz) * k;

    if (this.jumpCd > 0) this.jumpCd -= dt;
    if (this.onGround) this.jumpsLeft = this.extraJumps;
    if (fluid) {
      this.coyote = 0;
      if (!this.wasFluid && this.vy < -6) this.vy *= 0.35;            // breaking the surface sheds most of a fall
      if (this.hop > 0) { this.hop -= dt; this.vy -= GRAVITY * dt; }  // committed hop out of the water: plain ballistics
      else {
        this.vy -= 9 * dt; this.vy *= 1 - Math.min(1, 2.6 * dt);
        const climb = wl > 0 && this.hitH && (jump || this.autoJump);
        if (!this.inWater) { if (jump) this.vy = this.hitH ? 7.2 : Math.min(this.vy + 26 * dt, 4.4); }
        else if (jump || climb) {
          // find the surface of the water column we are in, then swim, float or climb out depending on depth
          const bx = Math.floor(this.x), bz = Math.floor(this.z);
          let c = Math.floor(this.y + 0.4), n = 0, top = -1;
          while (n < 2 && T_LIQUID[w.getBlock(bx, c + 1, bz)] === 1) { c++; n++; }
          const depth = c + T_LIQH[w.getBlock(bx, c, bz)] / 16 - this.y;
          if (climb && depth < 1.3) {
            // lowest level ahead with room to stand: the lip of a shelf under the surface, or the bank beside it
            const ax = this.x + wx * 0.5, az = this.z + wz * 0.5, hw = this.hw;
            if (boxFree(w, ax - hw, c + 0.005, az - hw, ax + hw, c + 0.005 + this.h, az + hw)) top = c;
            else if (boxFree(w, ax - hw, c + 1.005, az - hw, ax + hw, c + 1.005 + this.h, az + hw)) top = c + 1;
          }
          if (top >= 0 && top + 0.28 > this.y) { this.vy = Math.sqrt(2 * GRAVITY * (top + 0.28 - this.y)); this.hop = 0.35; }
          else if (jump) {
            if (depth > 1.3) this.vy = Math.min(this.vy + 26 * dt, 4.4);
            else if (this.onGround && depth < 1) { this.vy = 7; this.hop = 0.3; }    // wading: a short hop off the bottom
            else {
              // at the surface: float with the head clear of the water instead of leaping out and falling back
              const want = clamp((depth - 1 + Math.sin(time * 2.6) * 0.035) * 8, -1.5, 3);
              this.vy += (want - this.vy) * Math.min(1, 14 * dt);
            }
          }
        }
      }
      this.fallPeak = this.y;
    } else {
      this.hop = 0;
      this.vy = Math.max(this.vy - GRAVITY * dt, -62);
      // coyote time: the ground still counts for a moment after walking off an edge
      this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
      let auto = false;
      if (this.autoJump && !jump && this.onGround && this.hitH && wl > 0 && !this.sneaking && this.jumpCd <= 0) {
        // something at foot level ahead, room to stand one block up on it, and headroom above us
        const ax = this.x + wx * 0.45, az = this.z + wz * 0.45, hw = this.hw;
        auto = !boxFree(w, ax - hw, this.y + 0.05, az - hw, ax + hw, this.y + 1, az + hw)
          && boxFree(w, ax - hw, this.y + 1.001, az - hw, ax + hw, this.y + 1.001 + this.h, az + hw)
          && boxFree(w, this.x - hw, this.y + this.h, this.z - hw, this.x + hw, this.y + this.h + 1.2, this.z + hw);
      }
      if ((jump || auto || this.jumpBuf > 0) && this.coyote > 0 && this.jumpCd <= 0) {
        this.vy = JUMP_V * this.jumpMult; this.jumpCd = 0.12; this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
        if (this.sprinting && !auto) { this.vx += wx * 1.2; this.vz += wz * 1.2; }
      } else if (tap && !this.onGround && this.jumpsLeft > 0 && this.vy < 6) {
        this.vy = JUMP_V * 0.92 * this.jumpMult; this.jumpsLeft--; this.fallPeak = this.y; this.jumpBuf = 0;
      }
    }
    this.wasFluid = fluid;

    let dx = (this.vx + this.kbx) * dt, dz = (this.vz + this.kbz) * dt;
    const kd = Math.max(0, 1 - 6 * dt); this.kbx *= kd; this.kbz *= kd;
    if (this.sneaking && this.onGround) {
      // refuse to walk off ledges
      const st = 0.05, b = this, gx = dx, gz = dz;
      while (dx !== 0 && boxFree(w, b.x - b.hw + dx, b.y - 0.6, b.z - b.hw, b.x + b.hw + dx, b.y, b.z + b.hw)) dx = Math.abs(dx) <= st ? 0 : dx - Math.sign(dx) * st;
      while (dz !== 0 && boxFree(w, b.x - b.hw, b.y - 0.6, b.z - b.hw + dz, b.x + b.hw, b.y, b.z + b.hw + dz)) dz = Math.abs(dz) <= st ? 0 : dz - Math.sign(dz) * st;
      while (dx !== 0 && dz !== 0 && boxFree(w, b.x - b.hw + dx, b.y - 0.6, b.z - b.hw + dz, b.x + b.hw + dx, b.y, b.z + b.hw + dz)) {
        dx = Math.abs(dx) <= st ? 0 : dx - Math.sign(dx) * st; dz = Math.abs(dz) <= st ? 0 : dz - Math.sign(dz) * st;
      }
      // held at the edge: drop the velocity too, so it does not build up behind the guard
      if (dx === 0 && gx !== 0) this.vx = 0;
      if (dz === 0 && gz !== 0) this.vz = 0;
    }
    const wasGround = this.onGround, ox = this.x, oz = this.z;
    moveBody(w, this, dx, this.vy * dt, dz);
    const moved = Math.hypot(this.x - ox, this.z - oz);
    this.hspeed = moved / dt;
    // only a sustained head-on stall ends a sprint; brushing a wall or hopping up a ledge does not
    if (this.hitH && !fluid && this.hspeed < speed * 0.35) { this.stall += dt; if (this.stall > 0.35) this.sprinting = false; } else this.stall = 0;
    if (this.y > this.fallPeak || fluid) this.fallPeak = this.y;
    if (this.onGround) {
      if (!wasGround) { this.landed = Math.max(0.01, this.fallPeak - this.y); this.dipV = Math.min(6, this.landed * 1.6); }
      this.fallPeak = this.y;
      this.walkDist += moved; this.lastMoved = moved;
    }
  }
}
