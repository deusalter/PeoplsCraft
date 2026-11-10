// Swept AABB collision against block boxes. Each axis is clipped to the nearest block
// face before moving, so bodies slide along walls and never snag on seams between blocks.
import { T_BOX, T_LIQUID, T_SOLID } from '../data/blocks';
import type { World } from '../world/world';

export interface Body {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  hw: number; h: number;
  onGround: boolean; hitH: boolean; hitUp: boolean;
}
const E = 1e-5;

function clip(w: World, b: Body, axis: number, d: number): number {
  if (d === 0) return 0;
  let x0 = b.x - b.hw, x1 = b.x + b.hw, y0 = b.y, y1 = b.y + b.h, z0 = b.z - b.hw, z1 = b.z + b.hw;
  // region swept by the move
  let sx0 = x0, sx1 = x1, sy0 = y0, sy1 = y1, sz0 = z0, sz1 = z1;
  if (axis === 0) { if (d > 0) sx1 += d; else sx0 += d; } else if (axis === 1) { if (d > 0) sy1 += d; else sy0 += d; } else if (d > 0) sz1 += d; else sz0 += d;
  const bx0 = Math.floor(sx0 + E), bx1 = Math.floor(sx1 - E), by0 = Math.floor(sy0 + E), by1 = Math.floor(sy1 - E), bz0 = Math.floor(sz0 + E), bz1 = Math.floor(sz1 - E);
  for (let by = by0; by <= by1; by++) for (let bz = bz0; bz <= bz1; bz++) for (let bx = bx0; bx <= bx1; bx++) {
    const id = w.getBlock(bx, by, bz);
    if (!T_SOLID[id]) continue;
    const o = id * 6;
    const mx0 = bx + T_BOX[o] / 16, my0 = by + T_BOX[o + 1] / 16, mz0 = bz + T_BOX[o + 2] / 16;
    const mx1 = bx + T_BOX[o + 3] / 16, my1 = by + T_BOX[o + 4] / 16, mz1 = bz + T_BOX[o + 5] / 16;
    if (axis === 0) {
      if (y1 <= my0 + E || y0 >= my1 - E || z1 <= mz0 + E || z0 >= mz1 - E) continue;
      if (d > 0 && x1 <= mx0 + E) d = Math.min(d, mx0 - x1); else if (d < 0 && x0 >= mx1 - E) d = Math.max(d, mx1 - x0);
    } else if (axis === 1) {
      if (x1 <= mx0 + E || x0 >= mx1 - E || z1 <= mz0 + E || z0 >= mz1 - E) continue;
      if (d > 0 && y1 <= my0 + E) d = Math.min(d, my0 - y1); else if (d < 0 && y0 >= my1 - E) d = Math.max(d, my1 - y0);
    } else {
      if (x1 <= mx0 + E || x0 >= mx1 - E || y1 <= my0 + E || y0 >= my1 - E) continue;
      if (d > 0 && z1 <= mz0 + E) d = Math.min(d, mz0 - z1); else if (d < 0 && z0 >= mz1 - E) d = Math.max(d, mz1 - z0);
    }
  }
  return Math.abs(d) < 1e-9 ? 0 : d;
}

/** Move a body by (dx,dy,dz), resolving collisions. Zeroes velocity on the blocked axes. */
export function moveBody(w: World, b: Body, dx: number, dy: number, dz: number): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.45));
  dx /= n; dy /= n; dz /= n;
  b.onGround = false; b.hitH = false; b.hitUp = false;
  for (let i = 0; i < n; i++) {
    const ay = clip(w, b, 1, dy); b.y += ay;
    if (ay !== dy) { if (dy < 0) b.onGround = true; else b.hitUp = true; b.vy = 0; dy = 0; }
    const ax = clip(w, b, 0, dx); b.x += ax;
    if (ax !== dx) { b.vx = 0; b.hitH = true; dx = 0; }
    const az = clip(w, b, 2, dz); b.z += az;
    if (az !== dz) { b.vz = 0; b.hitH = true; dz = 0; }
  }
}

/** True if no solid block box intersects the given world-space box. */
export function boxFree(w: World, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean {
  const bx0 = Math.floor(x0 + E), bx1 = Math.floor(x1 - E), by0 = Math.floor(y0 + E), by1 = Math.floor(y1 - E), bz0 = Math.floor(z0 + E), bz1 = Math.floor(z1 - E);
  for (let by = by0; by <= by1; by++) for (let bz = bz0; bz <= bz1; bz++) for (let bx = bx0; bx <= bx1; bx++) {
    const id = w.getBlock(bx, by, bz);
    if (!T_SOLID[id]) continue;
    const o = id * 6;
    if (x1 > bx + T_BOX[o] / 16 + E && x0 < bx + T_BOX[o + 3] / 16 - E && y1 > by + T_BOX[o + 1] / 16 + E && y0 < by + T_BOX[o + 4] / 16 - E
      && z1 > bz + T_BOX[o + 2] / 16 + E && z0 < bz + T_BOX[o + 5] / 16 - E) return false;
  }
  return true;
}

/** Liquid family (0 none, 1 water, 2 lava) at a point. */
export const liquidAt = (w: World, x: number, y: number, z: number): number => T_LIQUID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))];

export interface RayHit { hit: boolean; x: number; y: number; z: number; nx: number; ny: number; nz: number; id: number; dist: number }
export const newRayHit = (): RayHit => ({ hit: false, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, id: 0, dist: 0 });

/** Voxel DDA. Non-cube shapes are tested against their own box so tall grass edges do not block clicks. */
export function raycast(w: World, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number, out: RayHit, hitLiquid = false): RayHit {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : 1e30, tdy = dy !== 0 ? Math.abs(1 / dy) : 1e30, tdz = dz !== 0 ? Math.abs(1 / dz) : 1e30;
  let tx = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : 1e30, ty = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : 1e30, tz = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : 1e30;
  let nx = 0, ny = 0, nz = 0, t = 0;
  out.hit = false;
  for (let i = 0; i < 200 && t <= max; i++) {
    const id = w.getBlock(x, y, z);
    if (id !== 0 && (hitLiquid || !T_LIQUID[id])) {
      const o = id * 6;
      if (T_BOX[o] === 0 && T_BOX[o + 1] === 0 && T_BOX[o + 2] === 0 && T_BOX[o + 3] === 16 && T_BOX[o + 4] === 16 && T_BOX[o + 5] === 16) {
        out.hit = true; out.x = x; out.y = y; out.z = z; out.nx = nx; out.ny = ny; out.nz = nz; out.id = id; out.dist = t; return out;
      }
      // slab test against the sub-box
      const b0x = x + T_BOX[o] / 16, b0y = y + T_BOX[o + 1] / 16, b0z = z + T_BOX[o + 2] / 16, b1x = x + T_BOX[o + 3] / 16, b1y = y + T_BOX[o + 4] / 16, b1z = z + T_BOX[o + 5] / 16;
      let tn = -1e30, tf = 1e30, hx = 0, hy = 0, hz = 0;
      const ax = [ox, oy, oz], ad = [dx, dy, dz], lo = [b0x, b0y, b0z], hi = [b1x, b1y, b1z];
      let miss = false;
      for (let a = 0; a < 3 && !miss; a++) {
        if (ad[a] === 0) { if (ax[a] < lo[a] || ax[a] > hi[a]) miss = true; continue; }
        let t0 = (lo[a] - ax[a]) / ad[a], t1 = (hi[a] - ax[a]) / ad[a], s = -1;
        if (t0 > t1) { const q = t0; t0 = t1; t1 = q; s = 1; }
        if (t0 > tn) { tn = t0; hx = a === 0 ? s : 0; hy = a === 1 ? s : 0; hz = a === 2 ? s : 0; }
        if (t1 < tf) tf = t1;
        if (tn > tf) miss = true;
      }
      if (!miss && tf >= 0 && tn <= max) {
        out.hit = true; out.x = x; out.y = y; out.z = z; out.nx = hx; out.ny = hy; out.nz = hz; out.id = id; out.dist = Math.max(0, tn); return out;
      }
    }
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return out;
}
