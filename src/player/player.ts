// First-person view of the local body: view bob, landing dip, FOV kick and camera shake.
import * as THREE from 'three';
import { hash01, lerp } from '../core/noise';
import { PlayerBody, WALK } from '../sim/body';

/** Blocks walked per footfall. View bob, hand bob and step sounds all read the same stride phase. */
export const STRIDE = 2.0;

export class Player extends PlayerBody {
  private bob = 0; private moveAmt = 0; private hsVis = 0; private fov = 75;
  trauma = 0;

  /** Smooth 1D value noise in -1..1, so shake looks the same at any frame rate. */
  private shakeN(t: number, k: number): number {
    const i = Math.floor(t), f = t - i;
    return (lerp(hash01(i, k, 0, 7), hash01(i + 1, k, 0, 7), f * f * (3 - 2 * f)) - 0.5) * 2;
  }

  /** Place the camera for rendering. `a` is the interpolation factor between ticks. */
  applyCamera(cam: THREE.PerspectiveCamera, a: number, dt: number, baseFov: number, time: number, bobOn: boolean, shakeMul = 1): void {
    const x = lerp(this.px, this.x, a), y = lerp(this.py, this.y, a), z = lerp(this.pz, this.z, a);
    this.hsVis += (this.hspeed - this.hsVis) * Math.min(1, dt * 12);
    const moving = this.onGround && this.hsVis > 0.5 && !this.flying;
    this.moveAmt += ((moving ? Math.min(1, this.hsVis / WALK) : 0) - this.moveAmt) * Math.min(1, dt * 9);
    // stride phase follows distance actually walked, interpolated like the position, so footfalls land on the dip
    this.bob = (this.walkDist - (1 - a) * this.lastMoved) * Math.PI / STRIDE;
    this.eye += ((this.sneaking ? 1.42 : 1.62) - this.eye) * Math.min(1, dt * 14);
    // landing dip: a damped spring kicked by the impact, so the view sinks and recovers instead of popping down
    const h = Math.min(dt, 1 / 30);
    this.dipV += (-220 * this.landDip - 22 * this.dipV) * h; this.landDip += this.dipV * h;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const amt = bobOn ? this.moveAmt : 0, sb = Math.sin(this.bob), cb = Math.cos(this.bob);
    const bx = cb * 0.035 * amt, by = -sb * sb * 0.06 * amt;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    this.ex = x + cy * bx; this.ey = y + this.eye + by - this.landDip; this.ez = z - sy * bx;
    cam.position.set(this.ex, this.ey, this.ez);
    let rp = 0, ry = 0, rr = 0;
    const sh = this.trauma * this.trauma * shakeMul;
    if (sh > 0) {
      // two octaves per axis at unrelated rates: a jolt with some grit, never a stepped rattle
      const t1 = time * 22, t2 = time * 19, t3 = time * 17;
      rp = sh * 0.04 * (this.shakeN(t1, 1) + 0.5 * this.shakeN(t1 * 2.1, 11));
      ry = sh * 0.04 * (this.shakeN(t2, 2) + 0.5 * this.shakeN(t2 * 2.1, 12));
      rr = sh * 0.05 * (this.shakeN(t3, 3) + 0.5 * this.shakeN(t3 * 2.1, 13));
    }
    cam.rotation.set(this.pitch + rp, this.yaw + ry, cb * 0.006 * amt + rr, 'YXZ');
    const target = baseFov * (this.sprinting && this.stall < 0.25 && !this.inWater ? 1.11 : 1) * (this.flying && this.sprinting ? 1.08 : 1) * (this.headInWater ? 0.94 : 1);
    this.fov += (target - this.fov) * Math.min(1, dt * 8);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }

  /** Stride phase in radians (pi per footfall), advanced per rendered frame. */
  get bobPhase(): number { return this.bob; }
  /** 0..1 how much the player is striding along the ground, smoothed per frame. */
  get stride(): number { return this.moveAmt; }
  /** Current landing dip of the view, in blocks. */
  get dip(): number { return this.landDip; }

  /** Unit view direction. */
  dir(out: THREE.Vector3): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
  shake(amount: number): void { this.trauma = Math.min(1, this.trauma + amount); }
}
