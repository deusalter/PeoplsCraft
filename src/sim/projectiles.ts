// Pooled projectiles: arrows, spell bolts and everything bosses throw.
// A client is not sent their flight. It is told when one starts (`ps`) and when one ends (`pe`), and
// flies it by itself in between with the same gravity.
import type { Style } from '../data/items';
import { PROJECTILES, ProjDef } from '../data/mobs';
import { ID_MAX } from '../net/protocol';
import { STEP } from './clock';
import type { Fx } from './fx';
import { rayHitMobs } from './mobhit';
import type { Mob } from './mobs';
import { newRayHit, rayBox, raycast } from './physics';
import { hurtPlayer, type SimPlayer } from './player';
import type { Realm } from './realm';

/** Projectile kinds in table order: the number a kind travels as. */
export const PROJ_KEYS: readonly string[] = Object.keys(PROJECTILES);
const KIND = new Map<ProjDef, number>(PROJ_KEYS.map((k, i) => [PROJECTILES[k], i]));

export class Proj {
  active = false; id = 0; def!: ProjDef; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; life = 0; dmg = 0; player = false; style: Style = 'ranged';
  /** Record id of the shooter, null for a creature's shot. */
  by: string | null = null;
  /** The `seq` of the `fire` message that caused it, 0 when none did. */
  cseq = 0;
  /** Id of the boss that fired it, 0 for any other shot: a player it hits joins that boss's fight (7.9). */
  src = 0;
  knock = 3; crit = false; hit = new Set<number>();
}
const hit = newRayHit();

/** The `ps` event of a projectile as it is now. `own`: for its shooter, who is told which of their shots it is. */
export function psOf(p: Proj, own: boolean): Fx {
  return ['ps', p.id, KIND.get(p.def) ?? 0, p.x, p.y, p.z, p.vx, p.vy, p.vz, Math.max(0, p.life), p.player ? 1 : 0, own ? p.cseq : 0];
}

export class ProjSim {
  readonly list: Proj[] = [];
  /** Every slot from here up is free. Raised by `fire`, lowered only at the end of `tick`. */
  hi = 0;
  private nextId = 1; private wrapped = false;
  private cur: Proj | null = null;
  private canHit = (m: Mob): boolean => m.def.ai !== 'npc' && m.def.ai !== 'minion' && !this.cur!.hit.has(m.id);
  constructor(private realm: Realm, cap = 600) { for (let i = 0; i < cap; i++) this.list.push(new Proj()); }
  /** Withdraw every projectile. */
  clear(): void { for (const p of this.list) if (p.active) this.end(p, 0); }
  get alive(): number { let n = 0; for (const p of this.list) if (p.active) n++; return n; }
  byId(id: number): Proj | null { for (let i = 0; i < this.hi; i++) { const p = this.list[i]; if (p.active && p.id === id) return p; } return null; }

  private end(p: Proj, how: number): void { p.active = false; this.realm.sim.sink.emit({ dim: this.realm.dim }, ['pe', p.id, p.x, p.y, p.z, how]); }

  /** `by`: the player who shot it, or null for a creature's shot (which only players can be hit by). `cseq`: the `seq`
   *  of the player's `fire` message. `lead`: seconds the shot is flown at once, with full hit testing, before anyone is
   *  told of it: the time the shooter's message spent on its way. Null when the pool is full. */
  fire(kind: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, dmg: number, by: SimPlayer | null, cseq = 0, speed?: number, style: Style = 'ranged', knock = 3, crit = false, lead = 0): Proj | null {
    const list = this.list, realm = this.realm, sink = realm.sim.sink;
    let i = 0;
    while (i < this.hi && list[i].active) i++;
    if (i >= list.length) return null;
    const p = list[i];
    if (i >= this.hi) this.hi = i + 1;
    const d = PROJECTILES[kind] ?? PROJECTILES.arrow, sp = speed ?? d.speed, l = Math.hypot(dx, dy, dz) || 1;
    let id = this.nextId;
    // only a counter that has been round once can meet an id still in flight
    if (this.wrapped) while (this.byId(id)) id = id >= ID_MAX ? 1 : id + 1;
    if (id >= ID_MAX) { this.nextId = 1; this.wrapped = true; } else this.nextId = id + 1;
    p.active = true; p.id = id; p.def = d; p.x = x; p.y = y; p.z = z; p.vx = (dx / l) * sp; p.vy = (dy / l) * sp; p.vz = (dz / l) * sp;
    p.life = d.life; p.dmg = dmg; p.player = !!by; p.by = by ? by.id : null; p.cseq = cseq; p.style = style; p.knock = knock; p.crit = crit; p.hit.clear(); p.src = 0;
    let how = -1;
    for (let t = lead; t > 1e-6 && how < 0; t -= STEP) how = this.step(p, Math.min(STEP, t));
    // the shooter is told which of their shots this is; everyone else learns of it by interest
    if (by) { sink.emit({ p: by.slot }, psOf(p, true)); sink.emit({ dim: realm.dim, not: by.slot }, psOf(p, false)); }
    else sink.emit({ dim: realm.dim }, psOf(p, false));
    if (how >= 0) this.end(p, how);
    return p;
  }

  /** Fly one projectile for `dt`. -1 while it goes on, else how it ended (0 expired, 1 terrain, 2 hit), stopped where it did. */
  private step(p: Proj, dt: number): number {
    const realm = this.realm, sim = realm.sim;
    p.life -= dt;
    if (p.life <= 0) return 0;
    p.vy -= p.def.gravity * dt;
    const sx = p.vx * dt, sy = p.vy * dt, sz = p.vz * dt, len = Math.hypot(sx, sy, sz) || 1e-6, dx = sx / len, dy = sy / len, dz = sz / len;
    // terrain
    raycast(realm, p.x, p.y, p.z, dx, dy, dz, len, hit, false, true);
    let stop = hit.hit ? hit.dist : len, dead = hit.hit, how = 1;
    if (p.player) {
      this.cur = p;
      const r = rayHitMobs(realm.mobs.list, p.x, p.y, p.z, dx, dy, dz, stop, p.def.size * 0.5 + 0.1, this.canHit);
      if (r) {
        const by = p.by ? sim.players.get(p.by) ?? null : null;
        realm.mobs.hurt(r.m, p.dmg, p.vx, p.vz, p.knock, p.crit, by);
        if (by) sim.sink.emit({ p: by.slot }, ['h', p.crit]);
        if (p.def.pierce && p.hit.size < 3) p.hit.add(r.m.id); else { stop = r.t; dead = true; how = 2; }
      }
    } else {
      // every target of the realm; a player who is away, loading or dead is not in the way of a shot
      let who: SimPlayer | null = null;
      for (const q of realm.targets()) {
        const pl = q.body, t = rayBox(p.x, p.y, p.z, dx, dy, dz, pl.x - pl.hw - 0.12, pl.y - 0.05, pl.z - pl.hw - 0.12, pl.x + pl.hw + 0.12, pl.y + pl.h + 0.05, pl.z + pl.hw + 0.12, stop);
        if (t >= 0) { who = q; stop = t; }
      }
      if (who) {
        hurtPlayer(sim, who, p.dmg, p.x - dx, p.z - dz, 'a projectile', null, 4); dead = true; how = 2;
        if (p.src && who.hurtTick === sim.tick) { const b = realm.mobs.byId(p.src); if (b && b.boss) b.boss.parts.add(who.id); }
      }
    }
    p.x += dx * stop; p.y += dy * stop; p.z += dz * stop;
    return dead ? how : -1;
  }

  tick(dt: number): void {
    const list = this.list;
    for (let i = 0; i < this.hi; i++) {
      const p = list[i];
      if (!p.active) continue;
      const how = this.step(p, dt);
      if (how >= 0) this.end(p, how);
    }
    while (this.hi > 0 && !list[this.hi - 1].active) this.hi--;
  }
}
