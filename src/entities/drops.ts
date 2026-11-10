// Dropped items: bob, spin, merge with neighbours, and fly to the player when close.
import * as THREE from 'three';
import { Item, item } from '../data/items';
import type { Game } from '../game';
import { Body, moveBody } from '../player/physics';
import { makeItemMaterial } from '../render/batches';

class Drop implements Body {
  active = false; it: Item = { k: 'stick', n: 1 }; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; hw = 0.12; h = 0.24;
  onGround = false; hitH = false; hitUp = false; age = 0; delay = 0; px = 0; py = 0; pz = 0; mesh: THREE.Mesh | null = null; light = new THREE.Vector4(1, 0, 0, 0);
}

export class DropSystem {
  private list: Drop[] = [];
  private mat = makeItemMaterial(false);
  readonly group = new THREE.Group();
  constructor(private g: Game, cap = 160) {
    this.mat.side = THREE.DoubleSide;
    for (let i = 0; i < cap; i++) this.list.push(new Drop());
  }
  get alive(): number { let n = 0; for (const d of this.list) if (d.active) n++; return n; }
  clear(): void { for (const d of this.list) this.free(d); }
  private free(d: Drop): void { d.active = false; if (d.mesh) { this.group.remove(d.mesh); d.mesh = null; } }

  spawn(x: number, y: number, z: number, it: Item, vx = (Math.random() - 0.5) * 2.4, vy = 3 + Math.random() * 1.5, vz = (Math.random() - 0.5) * 2.4, delay = 0.35): void {
    if (it.n <= 0) return;
    // fold into an identical stack lying nearby
    if (!it.m) for (const o of this.list) {
      if (o.active && o.it.k === it.k && !o.it.m && Math.abs(o.x - x) < 1.2 && Math.abs(o.y - y) < 1.2 && Math.abs(o.z - z) < 1.2 && o.it.n + it.n <= item(it.k).stack) { o.it.n += it.n; o.age = Math.min(o.age, 2); return; }
    }
    let d = this.list.find((o) => !o.active);
    if (!d) { d = this.list.reduce((a, b) => (a.age > b.age ? a : b)); this.free(d); }
    d.active = true; d.it = { ...it }; d.x = d.px = x; d.y = d.py = y; d.z = d.pz = z; d.vx = vx; d.vy = vy; d.vz = vz; d.age = 0; d.delay = delay;
    const cube = this.g.models.isCube(it.k), mesh = new THREE.Mesh(this.g.models.get(it.k), this.mat), light = d.light;
    mesh.scale.setScalar(cube ? 0.26 : 0.42);
    mesh.onBeforeRender = (_r, _s, _c, _g, material) => { (material as THREE.ShaderMaterial).uniforms.uObj.value.copy(light); (material as THREE.ShaderMaterial).uniformsNeedUpdate = true; };
    d.mesh = mesh; this.group.add(mesh);
  }

  tick(dt: number): void {
    const g = this.g, p = g.player, w = g.world, reach = 1.7 + g.stats.d.pickup;
    for (const d of this.list) {
      if (!d.active) continue;
      d.px = d.x; d.py = d.y; d.pz = d.z;
      d.age += dt;
      if (d.age > 300 || d.y < -20) { this.free(d); continue; }
      if (d.delay > 0) d.delay -= dt;
      const dx = p.x - d.x, dy = p.y + 0.8 - d.y, dz = p.z - d.z, dist = Math.hypot(dx, dy, dz);
      if (d.delay <= 0 && !g.stats.dead && dist < reach) {
        // magnet: accelerate straight at the player, ignoring terrain so it never hangs on a ledge
        const sp = 9 + (reach - dist) * 6;
        d.x += (dx / dist) * sp * dt; d.y += (dy / dist) * sp * dt; d.z += (dz / dist) * sp * dt; d.vy = 0;
        if (dist < 0.75) {
          const before = d.it.n, left = g.inv.add(d.it);
          if (left < before) { g.onPickup(d.it.k, before - left); d.it.n = left; }
          if (left === 0) { this.free(d); continue; }
          d.delay = 1;
        }
      } else if (w.ready(Math.floor(d.x), Math.floor(d.z))) {
        d.vy = Math.max(d.vy - 26 * dt, -40);
        moveBody(w, d, d.vx * dt, d.vy * dt, d.vz * dt);
        if (d.onGround) { d.vx *= Math.max(0, 1 - 10 * dt); d.vz *= Math.max(0, 1 - 10 * dt); }
      }
      const l = w.getLight(Math.floor(d.x), Math.floor(d.y + 0.3), Math.floor(d.z));
      d.light.set((l >> 4) / 15, (l & 15) / 15, 0, 0);
    }
  }

  /** Place the meshes between the last two ticks so drops move as smoothly as the camera. */
  render(alpha: number): void {
    for (const d of this.list) {
      if (!d.active) continue;
      const m = d.mesh!, age = d.age + alpha / 60;
      m.position.set(d.px + (d.x - d.px) * alpha, d.py + (d.y - d.py) * alpha + 0.22 + Math.sin(age * 2.6) * 0.07, d.pz + (d.z - d.pz) * alpha);
      m.rotation.y = age * 1.6;
    }
  }
}
