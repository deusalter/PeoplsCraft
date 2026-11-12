// Dropped items: they fall, merge with identical stacks nearby, and fly to a player who has room.
// A client is told when one appears (`da`), when its count changes (`dn`) and when it goes (`dd`);
// the fall and the rest it works out for itself.
import { Item, item } from '../data/items';
import { ID_MAX } from '../net/protocol';
import type { Fx } from './fx';
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

/** The `da` event of a drop as it is now. */
export function daOf(d: Drop): Fx { return ['da', d.id, d.it.k, d.it.n, d.it.m ?? '', d.x, d.y, d.z, d.vx, d.vy, d.vz, Math.max(0, d.delay)]; }

export class DropSim {
  readonly list: Drop[] = [];
  /** Every slot from here up is free. Raised by `spawn`, lowered only at the end of `tick`. */
  hi = 0;
  private nextId = 1; private wrapped = false;
  constructor(private realm: Realm, cap = 160) { for (let i = 0; i < cap; i++) this.list.push(new Drop()); }
  get alive(): number { let n = 0; for (const d of this.list) if (d.active) n++; return n; }
  clear(): void { for (const d of this.list) if (d.active) this.gone(d, 0); }
  byId(id: number): Drop | null { for (let i = 0; i < this.hi; i++) { const d = this.list[i]; if (d.active && d.id === id) return d; } return null; }

  /** `slot`: the player who picked it up, 0 when nobody did. */
  private gone(d: Drop, slot: number): void { d.active = false; this.realm.sim.sink.emit({ dim: this.realm.dim }, ['dd', d.id, slot]); }

  spawn(x: number, y: number, z: number, it: Item, vx = (this.realm.sim.rnd() - 0.5) * 2.4, vy = 3 + this.realm.sim.rnd() * 1.5, vz = (this.realm.sim.rnd() - 0.5) * 2.4, delay = 0.35, owner: string | null = null): void {
    if (it.n <= 0) return;
    const realm = this.realm, sim = realm.sim;
    // fold into an identical stack lying nearby
    const list = this.list;
    if (!it.m) for (let i = 0; i < this.hi; i++) {
      const o = list[i];
      if (o.active && o.owner === owner && o.it.k === it.k && !o.it.m && Math.abs(o.x - x) < 1.2 && Math.abs(o.y - y) < 1.2 && Math.abs(o.z - z) < 1.2 && o.it.n + it.n <= item(it.k).stack) {
        o.it.n += it.n; o.age = Math.min(o.age, 2);
        sim.sink.emit({ dim: realm.dim }, ['dn', o.id, o.it.n]);
        return;
      }
    }
    let i = 0;
    while (i < this.hi && list[i].active) i++;
    // a full pool gives up its oldest drop
    if (i >= list.length) { i = 0; for (let j = 1; j < list.length; j++) if (list[j].age >= list[i].age) i = j; this.gone(list[i], 0); }
    const d = list[i];
    if (i >= this.hi) this.hi = i + 1;
    let id = this.nextId;
    // only a counter that has been round once can meet an id still lying about
    if (this.wrapped) while (this.byId(id)) id = id >= ID_MAX ? 1 : id + 1;
    if (id >= ID_MAX) { this.nextId = 1; this.wrapped = true; } else this.nextId = id + 1;
    d.active = true; d.id = id; d.owner = owner; d.it = { ...it }; d.x = x; d.y = y; d.z = z; d.vx = vx; d.vy = vy; d.vz = vz; d.age = 0; d.delay = delay;
    // an owned drop is its owner's alone; an owner who is elsewhere learns of it by interest on coming near
    if (!owner) sim.sink.emit({ dim: realm.dim }, daOf(d));
    else { const o = sim.players.get(owner); if (o && o.dim === realm.dim && !o.parked) sim.sink.emit({ p: o.slot }, daOf(d)); }
  }

  tick(dt: number): void {
    const realm = this.realm, sim = realm.sim, list = this.list;
    for (let i = 0; i < this.hi; i++) {
      const d = list[i];
      if (!d.active) continue;
      d.age += dt;
      if (d.age > 300 || d.y < -20) { this.gone(d, 0); continue; }
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
            if (left === 0) { this.gone(d, pl.slot); continue; }
            if (left < before) sim.sink.emit({ dim: realm.dim }, ['dn', d.id, left]);
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
    while (this.hi > 0 && !list[this.hi - 1].active) this.hi--;
  }
}
