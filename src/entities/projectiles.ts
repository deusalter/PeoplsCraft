// Pooled projectiles: arrows, spell bolts and everything bosses throw.
import * as THREE from 'three';
import { T_SOLID } from '../data/blocks';
import type { Style } from '../data/items';
import { PROJECTILES, ProjDef } from '../data/mobs';
import type { Game } from '../game';
import { newRayHit, rayBox, raycast } from '../player/physics';
import type { BoxBatch } from '../render/batches';

class Proj {
  active = false; def!: ProjDef; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; life = 0; dmg = 0; player = false; style: Style = 'ranged';
  knock = 3; crit = false; hit = new Set<number>(); px = 0; py = 0; pz = 0;
}
const hit = newRayHit(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);

export class ProjectileSystem {
  private list: Proj[] = [];
  private cur: Proj | null = null;
  private canHit = (m: { def: { hostile: boolean }; id: number }): boolean => m.def.hostile && !this.cur!.hit.has(m.id);
  constructor(private g: Game, cap = 600) { for (let i = 0; i < cap; i++) this.list.push(new Proj()); }
  clear(): void { for (const p of this.list) p.active = false; }
  get alive(): number { let n = 0; for (const p of this.list) if (p.active) n++; return n; }

  fire(kind: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, dmg: number, player: boolean, speed?: number, style: Style = 'ranged', knock = 3, crit = false): void {
    const p = this.list.find((o) => !o.active);
    if (!p) return;
    const d = PROJECTILES[kind] ?? PROJECTILES.arrow, sp = speed ?? d.speed, l = Math.hypot(dx, dy, dz) || 1;
    p.active = true; p.def = d; p.x = p.px = x; p.y = p.py = y; p.z = p.pz = z; p.vx = (dx / l) * sp; p.vy = (dy / l) * sp; p.vz = (dz / l) * sp;
    p.life = d.life; p.dmg = dmg; p.player = player; p.style = style; p.knock = knock; p.crit = crit; p.hit.clear();
  }

  tick(dt: number): void {
    const g = this.g, w = g.world, pl = g.player;
    for (const p of this.list) {
      if (!p.active) continue;
      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy -= p.def.gravity * dt;
      const sx = p.vx * dt, sy = p.vy * dt, sz = p.vz * dt, len = Math.hypot(sx, sy, sz) || 1e-6, dx = sx / len, dy = sy / len, dz = sz / len;
      // terrain
      raycast(w, p.x, p.y, p.z, dx, dy, dz, len, hit);
      let stop = hit.hit && T_SOLID[hit.id] ? hit.dist : len, dead = hit.hit && !!T_SOLID[hit.id];
      if (p.player) {
        this.cur = p;
        const r = g.mobs.rayHit(p.x, p.y, p.z, dx, dy, dz, stop, p.def.size * 0.5 + 0.1, this.canHit);
        if (r) {
          g.mobs.hurt(r.m, p.dmg, p.vx, p.vz, p.knock, p.crit);
          if (p.def.pierce && p.hit.size < 3) p.hit.add(r.m.id); else { stop = r.t; dead = true; }
        }
      } else {
        const t = rayBox(p.x, p.y, p.z, dx, dy, dz, pl.x - pl.hw - 0.12, pl.y - 0.05, pl.z - pl.hw - 0.12, pl.x + pl.hw + 0.12, pl.y + pl.h + 0.05, pl.z + pl.hw + 0.12, stop);
        if (t >= 0) { g.hurtPlayer(p.dmg, p.x - dx, p.z - dz, 'a projectile', null, 4); dead = true; stop = t; }
      }
      p.x += dx * stop; p.y += dy * stop; p.z += dz * stop;
      if (p.def.trail !== undefined && Math.random() < dt * 30) g.particles.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0.35, p.def.size * 0.5, p.def.trail, p.def.glow, 0);
      if (dead) {
        p.active = false;
        for (let i = 0; i < 5; i++) g.particles.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4, 0.35, p.def.size * 0.45, p.def.color, p.def.glow, 9);
      }
    }
  }

  render(batch: BoxBatch, alpha: number): void {
    for (const p of this.list) {
      if (!p.active) continue;
      const d = p.def, s = d.size;
      v1.set(p.px + (p.x - p.px) * alpha, p.py + (p.y - p.py) * alpha, p.pz + (p.z - p.pz) * alpha);
      v2.set(p.vx, p.vy, p.vz).normalize();
      q.setFromUnitVectors(up, v2);
      const long = d.gravity > 5 ? 5 : 1.6;
      m4.compose(v1, q, v2.set(s * (long > 2 ? 0.4 : 1), s * (long > 2 ? 0.4 : 1), s * long));
      batch.add(m4, d.color, 1, 0, 0, d.glow);
    }
  }
}
