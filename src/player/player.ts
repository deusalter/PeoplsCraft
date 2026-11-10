// First-person controller: movement, swimming, sneaking, view bob, FOV kick and camera shake.
import * as THREE from 'three';
import { clamp, hash01, lerp } from '../core/noise';
import type { World } from '../world/world';
import type { Input } from './input';
import { Body, boxFree, liquidAt, moveBody } from './physics';

export const WALK = 4.32, SPRINT = 5.75, SNEAK = 1.35, JUMP_V = 9.0, GRAVITY = 32;

export class Player implements Body {
  x = 0; y = 120; z = 0; vx = 0; vy = 0; vz = 0;
  px = 0; py = 0; pz = 0;                 // previous tick position, for interpolation
  hw = 0.3; h = 1.8;
  onGround = false; hitH = false; hitUp = false;
  yaw = 0; pitch = 0;
  sprinting = false; sneaking = false; flying = false; noclip = false;
  inWater = false; headInWater = false; inLava = false;
  moveMult = 1; jumpMult = 1; extraJumps = 0; private jumpsLeft = 0;
  frozen = false;
  walkDist = 0; stepAccum = 0;
  fallPeak = 0; landed = 0;               // landed = fall distance reported on the tick of landing
  eye = 1.62;
  private bob = 0; private bobAmt = 0; private fov = 75; private lastW = -1; private jumpCd = 0; private wasJump = false;
  trauma = 0;
  private landDip = 0;
  kbx = 0; kbz = 0;                       // decaying knockback velocity

  teleport(x: number, y: number, z: number): void {
    this.x = this.px = x; this.y = this.py = y; this.z = this.pz = z;
    this.vx = this.vy = this.vz = 0; this.fallPeak = y;
  }

  look(dx: number, dy: number, sens: number): void {
    this.yaw -= dx * sens; this.pitch = clamp(this.pitch - dy * sens, -1.5533, 1.5533);
  }

  tick(dt: number, input: Input, w: World, time: number): void {
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.landed = 0;
    if (this.frozen || !w.ready(Math.floor(this.x), Math.floor(this.z))) return;

    const f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0), s = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    const jump = input.down('Space');
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
    const wl = Math.hypot(wx, wz);
    if (wl > 0) { wx /= wl; wz /= wl; }

    this.inWater = liquidAt(w, this.x, this.y + 0.4, this.z) === 1;
    this.headInWater = liquidAt(w, this.x, this.y + this.eye, this.z) === 1;
    this.inLava = liquidAt(w, this.x, this.y + 0.3, this.z) === 2;
    const fluid = this.inWater || this.inLava;

    // sprint: hold Ctrl, or double-tap W
    if (input.hit('KeyW')) { if (time - this.lastW < 0.28) this.sprinting = true; this.lastW = time; }
    if (input.down('ControlLeft') && f > 0) this.sprinting = true;
    this.sneaking = input.down('ShiftLeft') && !this.flying;
    if (f <= 0 || this.sneaking || (this.hitH && !fluid)) this.sprinting = false;

    if (this.flying) {
      const sp = this.sprinting ? 24 : 11, k = Math.min(1, 10 * dt);
      this.vx += (wx * sp - this.vx) * k; this.vz += (wz * sp - this.vz) * k;
      this.vy += (((jump ? 1 : 0) - (input.down('ShiftLeft') ? 1 : 0)) * sp * 0.8 - this.vy) * k;
      if (this.noclip) { this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt; }
      else moveBody(w, this, this.vx * dt, this.vy * dt, this.vz * dt);
      this.fallPeak = this.y;
      return;
    }

    const speed = (fluid ? (this.sprinting ? 3.1 : 2.3) : this.sneaking ? SNEAK : this.sprinting ? SPRINT : WALK) * this.moveMult;
    const accel = fluid ? 5 : this.onGround ? (wl > 0 ? 15 : 13) : wl > 0 ? 3.2 : 0.6;
    const k = Math.min(1, accel * dt);
    this.vx += (wx * speed - this.vx) * k; this.vz += (wz * speed - this.vz) * k;

    if (this.jumpCd > 0) this.jumpCd -= dt;
    if (this.onGround) this.jumpsLeft = this.extraJumps;
    if (fluid) {
      this.vy -= 9 * dt; this.vy *= 1 - Math.min(1, 2.6 * dt);
      if (jump) this.vy = Math.min(this.vy + 26 * dt, 4.4);
      if (jump && this.hitH && !this.headInWater) this.vy = 7.2;
      this.fallPeak = this.y;
    } else {
      this.vy = Math.max(this.vy - GRAVITY * dt, -62);
      if (jump && this.onGround && this.jumpCd <= 0) {
        this.vy = JUMP_V * this.jumpMult; this.jumpCd = 0.12; this.onGround = false;
        if (this.sprinting) { this.vx += wx * 1.2; this.vz += wz * 1.2; }
      } else if (jump && !this.wasJump && !this.onGround && this.jumpsLeft > 0 && this.vy < 6) {
        this.vy = JUMP_V * 0.92 * this.jumpMult; this.jumpsLeft--; this.fallPeak = this.y;
      }
    }
    this.wasJump = jump;

    let dx = (this.vx + this.kbx) * dt, dz = (this.vz + this.kbz) * dt;
    const kd = Math.max(0, 1 - 6 * dt); this.kbx *= kd; this.kbz *= kd;
    if (this.sneaking && this.onGround) {
      // refuse to walk off ledges
      const st = 0.05, b = this;
      while (dx !== 0 && boxFree(w, b.x - b.hw + dx, b.y - 0.6, b.z - b.hw, b.x + b.hw + dx, b.y, b.z + b.hw)) dx = Math.abs(dx) <= st ? 0 : dx - Math.sign(dx) * st;
      while (dz !== 0 && boxFree(w, b.x - b.hw, b.y - 0.6, b.z - b.hw + dz, b.x + b.hw, b.y, b.z + b.hw + dz)) dz = Math.abs(dz) <= st ? 0 : dz - Math.sign(dz) * st;
      while (dx !== 0 && dz !== 0 && boxFree(w, b.x - b.hw + dx, b.y - 0.6, b.z - b.hw + dz, b.x + b.hw + dx, b.y, b.z + b.hw + dz)) {
        dx = Math.abs(dx) <= st ? 0 : dx - Math.sign(dx) * st; dz = Math.abs(dz) <= st ? 0 : dz - Math.sign(dz) * st;
      }
    }
    const wasGround = this.onGround, ox = this.x, oz = this.z;
    moveBody(w, this, dx, this.vy * dt, dz);
    if (this.y > this.fallPeak || fluid) this.fallPeak = this.y;
    if (this.onGround) {
      if (!wasGround) { this.landed = Math.max(0.01, this.fallPeak - this.y); this.landDip = Math.min(0.22, this.landed * 0.045); }
      this.fallPeak = this.y;
      const moved = Math.hypot(this.x - ox, this.z - oz);
      this.walkDist += moved; this.stepAccum += moved;
    }
  }

  /** Place the camera for rendering. `a` is the interpolation factor between ticks. */
  applyCamera(cam: THREE.PerspectiveCamera, a: number, dt: number, baseFov: number, time: number, bobOn: boolean): void {
    const x = lerp(this.px, this.x, a), y = lerp(this.py, this.y, a), z = lerp(this.pz, this.z, a);
    const hs = Math.hypot(this.vx, this.vz);
    const moving = this.onGround && hs > 0.5 && !this.flying;
    this.bobAmt += ((moving && bobOn ? Math.min(1, hs / WALK) : 0) - this.bobAmt) * Math.min(1, dt * 9);
    if (moving) this.bob += hs * dt * 1.9;
    this.eye += ((this.sneaking ? 1.42 : 1.62) - this.eye) * Math.min(1, dt * 14);
    this.landDip *= Math.max(0, 1 - dt * 9);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma;
    const bx = Math.cos(this.bob) * 0.035 * this.bobAmt, by = -Math.abs(Math.sin(this.bob)) * 0.06 * this.bobAmt;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    cam.position.set(x + cy * bx, y + this.eye + by - this.landDip, z - sy * bx);
    const n = (k: number): number => (hash01((time * 40) | 0, k, 0, 7) - 0.5) * 2;
    cam.rotation.set(this.pitch + sh * n(1) * 0.04, this.yaw + sh * n(2) * 0.04, Math.cos(this.bob) * 0.006 * this.bobAmt + sh * n(3) * 0.05, 'YXZ');
    const target = baseFov * (this.sprinting && hs > WALK ? 1.11 : 1) * (this.flying && this.sprinting ? 1.08 : 1) * (this.headInWater ? 0.94 : 1);
    this.fov += (target - this.fov) * Math.min(1, dt * 8);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }

  /** Unit view direction. */
  dir(out: THREE.Vector3): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
  shake(amount: number): void { this.trauma = Math.min(1, this.trauma + amount); }
}
