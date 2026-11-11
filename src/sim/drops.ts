// Dropped items: they fall, merge with identical stacks nearby, and fly to a player who has room.
import { Item, item } from '../data/items';
import { Body, moveBody } from './physics';
import { warnFull, type SimPlayer } from './player';
import type { Realm } from './realm';

export class Drop implements Body {
  active = false; id = 0;
  /** Record id of the only player who may take it, or null when anyone may. */
  owner: string | null = null;
  it: Item = { k: 'stick', n: 1 }; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; hw = 0.12; h = 0.24;
  onGround = false; hitH = false; hitUp = false; age = 0; delay = 0;
}

export class DropSim {
  readonly list: Drop[] = [];
  private nextId = 1;
  constructor(private realm: Realm, cap = 160) { for (let i = 0; i < cap; i++) this.list.push(new Drop()); }
  get alive(): number { let n = 0; for (const d of this.list) if (d.active) n++; return n; }
  clear(): void { for (const d of this.list) d.active = false; }

  spawn(x: number, y: number, z: number, it: Item, vx = (this.realm.sim.rnd() - 0.5) * 2.4, vy = 3 + this.realm.sim.rnd() * 1.5, vz = (this.realm.sim.rnd() - 0.5) * 2.4, delay = 0.35, owner: string | null = null): void {
    if (it.n <= 0) return;
    // fold into an identical stack lying nearby
    if (!it.m) for (const o of this.list) {
      if (o.active && o.owner === owner && o.it.k === it.k && !o.it.m && Math.abs(o.x - x) < 1.2 && Math.abs(o.y - y) < 1.2 && Math.abs(o.z - z) < 1.2 && o.it.n + it.n <= item(it.k).stack) { o.it.n += it.n; o.age = Math.min(o.age, 2); return; }
    }
    let d = this.list.find((o) => !o.active);
    if (!d) d = this.list.reduce((a, b) => (a.age > b.age ? a : b));
    d.active = true; d.id = this.nextId++; d.owner = owner; d.it = { ...it }; d.x = x; d.y = y; d.z = z; d.vx = vx; d.vy = vy; d.vz = vz; d.age = 0; d.delay = delay;
  }

  tick(dt: number): void {
    const realm = this.realm, sim = realm.sim;
    for (const d of this.list) {
      if (!d.active) continue;
      d.age += dt;
      if (d.age > 300 || d.y < -20) { d.active = false; continue; }
      if (d.delay > 0) d.delay -= dt;
      // an owned drop answers to its owner alone, however many others stand closer
      let pl: SimPlayer | null = null;
      if (!d.owner) pl = realm.closest(d.x, d.y, d.z);
      else for (const q of realm.players) if (q.id === d.owner) { pl = q; break; }
      let fits = false;
      if (pl) {
        const p = pl.body, reach = 1.7 + pl.stats.d.pickup;
        const dx = p.x - d.x, dy = p.y + 0.8 - d.y, dz = p.z - d.z, dist = Math.hypot(dx, dy, dz);
        // drops that cannot fit stay on the ground instead of twitching round the player forever
        fits = d.delay <= 0 && !pl.stats.dead && dist < reach && pl.inv.room(d.it) > 0;
        if (!fits && d.delay <= 0 && dist < 0.9 && !pl.stats.dead) warnFull(sim, pl);
        if (fits) {
          // magnet: accelerate straight at the player, ignoring terrain so it never hangs on a ledge
          const sp = 9 + (reach - dist) * 6;
          d.x += (dx / dist) * sp * dt; d.y += (dy / dist) * sp * dt; d.z += (dz / dist) * sp * dt; d.vy = 0;
          if (dist < 0.75) {
            const before = d.it.n, left = pl.inv.add(d.it);
            if (left < before) { sim.sink.emit({ p: pl.slot }, ['u', d.it.k, before - left, pl.inv.count(d.it.k)]); d.it.n = left; }
            if (left === 0) { d.active = false; continue; }
            d.delay = 1;
          }
        }
      }
      if (!fits && realm.ready(Math.floor(d.x), Math.floor(d.z))) {
        d.vy = Math.max(d.vy - 26 * dt, -40);
        moveBody(realm, d, d.vx * dt, d.vy * dt, d.vz * dt);
        if (d.onGround) { d.vx *= Math.max(0, 1 - 10 * dt); d.vz *= Math.max(0, 1 - 10 * dt); }
      }
    }
  }
}
