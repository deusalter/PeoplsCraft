// The ray test against creatures, shared by the simulation (projectiles) and the client (the melee ray
// against its views): body box, a boss's carried head, a serpent's segments.
import type { MobDef } from '../data/mobs';
import { rayBox } from './physics';

export interface RayMob {
  active: boolean; x: number; y: number; z: number; hw: number; h: number; def: MobDef;
  /** Drawn yaw: a boss's head is placed with it. */
  ry: number;
  boss: { segs: Float32Array | null } | null;
}

/** Size of body segment i of n relative to the first (the renderer and the hit test taper the same way). */
export function segK(i: number, n: number): number { const f = n > 1 ? i / (n - 1) : 0; return 1 - 0.62 * f * f; }

/** Serpent body: each segment trails the link ahead of it at a fixed gap. A segment still at the origin is placed on that link first. */
export function followSegs(s: Float32Array, x: number, y: number, z: number): void {
  const n = s.length / 3;
  let lx = x, ly = y, lz = z;
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    if (s[o] === 0 && s[o + 1] === 0 && s[o + 2] === 0) { s[o] = lx; s[o + 1] = ly; s[o + 2] = lz; }
    const ex = s[o] - lx, ey = s[o + 1] - ly, ez = s[o + 2] - lz, el = Math.hypot(ex, ey, ez) || 1, gap = (i === 0 ? 1.45 : 1.1) * segK(i, n);
    if (el > gap) { s[o] = lx + (ex / el) * gap; s[o + 1] = ly + (ey / el) * gap; s[o + 2] = lz + (ez / el) * gap; }
    lx = s[o]; ly = s[o + 1]; lz = s[o + 2];
  }
}

const boxDist = (px: number, py: number, pz: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number =>
  Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1), Math.max(z0 - pz, 0, pz - z1));
/** Distance from a point to the nearest of a creature's hit volumes: the boxes rayHitMobs tests, with no padding.
 *  0 inside one. A host asks it whether a blow could have reached. */
export function mobDist(m: RayMob, px: number, py: number, pz: number): number {
  let d = boxDist(px, py, pz, m.x - m.hw, m.y, m.z - m.hw, m.x + m.hw, m.y + m.h, m.z + m.hw);
  const hb = m.def.boss ? m.def.boss.head : undefined;
  if (hb) {
    const hx = m.x + Math.sin(m.ry) * hb[0], hz = m.z + Math.cos(m.ry) * hb[0], hr = hb[3];
    d = Math.min(d, boxDist(px, py, pz, hx - hr, m.y + hb[1], hz - hr, hx + hr, m.y + hb[2], hz + hr));
  }
  const sg = m.boss ? m.boss.segs : null;
  if (sg) for (let i = 0, n = sg.length / 3; i < n; i++) {
    const o = i * 3;
    if (sg[o] === 0 && sg[o + 1] === 0 && sg[o + 2] === 0) continue;
    const r = m.hw * 0.75 * segK(i, n), cy = sg[o + 1] + m.h * 0.5;
    d = Math.min(d, boxDist(px, py, pz, sg[o] - r, cy - r, sg[o + 2] - r, sg[o] + r, cy + r, sg[o + 2] + r));
  }
  return d;
}

const out: { m: RayMob; t: number } = { m: null as unknown as RayMob, t: 0 };
/** First creature whose box a ray hits within `max`. The result object is reused by the next call. */
export function rayHitMobs<T extends RayMob>(list: readonly T[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number, pad = 0.1, filter?: (m: T) => boolean): { m: T; t: number } | null {
  let best: T | null = null, bt = max;
  for (const m of list) {
    if (!m.active || (filter && !filter(m))) continue;
    const t = rayBox(ox, oy, oz, dx, dy, dz, m.x - m.hw - pad, m.y - pad, m.z - m.hw - pad, m.x + m.hw + pad, m.y + m.h + pad, m.z + m.hw + pad, bt);
    if (t >= 0 && t < bt) { bt = t; best = m; }
    // a head carried out in front of the box, where it is drawn (the model faces +z turned by the drawn yaw)
    const hb = m.def.boss ? m.def.boss.head : undefined;
    if (hb) {
      const hx = m.x + Math.sin(m.ry) * hb[0], hz = m.z + Math.cos(m.ry) * hb[0], hr = hb[3] + pad;
      const th = rayBox(ox, oy, oz, dx, dy, dz, hx - hr, m.y + hb[1] - pad, hz - hr, hx + hr, m.y + hb[2] + pad, hz + hr, bt);
      if (th >= 0 && th < bt) { bt = th; best = m; }
    }
    // a serpent's body can be hit as well as its head
    const sg = m.boss ? m.boss.segs : null;
    if (sg) for (let i = 0, n = sg.length / 3; i < n; i++) {
      const o = i * 3;
      if (sg[o] === 0 && sg[o + 1] === 0 && sg[o + 2] === 0) continue;
      const r = m.hw * 0.75 * segK(i, n) + pad, cy = sg[o + 1] + m.h * 0.5;
      const ts = rayBox(ox, oy, oz, dx, dy, dz, sg[o] - r, cy - r, sg[o + 2] - r, sg[o] + r, cy + r, sg[o + 2] + r, bt);
      if (ts >= 0 && ts < bt) { bt = ts; best = m; }
    }
  }
  if (!best) return null;
  out.m = best; out.t = bt;
  return out as { m: T; t: number };
}
